/**
 * DeepSeek Token & Balance PWA — Service Worker
 *
 * 功能：
 * 1. 代理 API 请求到 DeepSeek（绕过 CORS）
 * 2. 缓存静态资源（离线访问）
 * 3. 缓存 API 响应（离线显示余额）
 */

// ==================== 配置 ====================

const CACHE_NAME = 'deepseek-pwa-v1';

// 需要预缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
];

// API 代理映射：/api/* → DeepSeek API
const API_PROXY_MAP = {
  '/api/balance': 'https://api.deepseek.com/user/balance',
};

// ==================== 安装：预缓存静态资源 ====================

self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 预缓存静态资源');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] 部分资源缓存失败:', err);
      });
    })
  );
  // 立即激活（不等待旧 SW 释放）
  self.skipWaiting();
});

// ==================== 激活：清理旧缓存 ====================

self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // 立即接管所有页面
  self.clients.claim();
});

// ==================== 请求拦截 ====================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== self.location.origin) {
    return;
  }

  // ----- API 代理请求 -----
  if (url.pathname.startsWith('/api/')) {
    const targetUrl = API_PROXY_MAP[url.pathname];
    if (targetUrl) {
      event.respondWith(handleApiProxy(request, targetUrl));
      return;
    }
  }

  // ----- 静态资源：缓存优先（Cache First）-----
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleCacheFirst(request));
    return;
  }

  // ----- 其他请求：网络优先（Network First）-----
  event.respondWith(handleNetworkFirst(request));
});

// ==================== API 代理处理 ====================

async function handleApiProxy(request, targetUrl) {
  // 从请求头中取出 API Key
  const apiKey = request.headers.get('X-Api-Key');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: '未提供 API Key' } }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 透传原始请求的查询参数（如 start_time, end_time 等）
  const proxyUrl = new URL(targetUrl);
  const originalUrl = new URL(request.url);
  originalUrl.searchParams.forEach((value, key) => {
    proxyUrl.searchParams.set(key, value);
  });

  // 构建转发请求（Service Worker 内请求不受 CORS 限制）
  const proxyRequest = new Request(proxyUrl.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  try {
    const response = await fetch(proxyRequest);

    // 克隆响应（原始响应 body 只能读取一次）
    const clonedResponse = response.clone();

    // 成功时缓存 API 响应（用于离线）
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      // 创建一个新的 Response，包含 URL 信息用于缓存匹配
      const cacheableResponse = new Response(clonedResponse.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      cache.put(request.url, cacheableResponse);
    }

    // 返回响应给页面
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error('[SW] API 代理失败:', error);

    // 网络错误时尝试返回缓存数据
    const cachedResponse = await caches.match(request.url);
    if (cachedResponse) {
      console.log('[SW] 返回缓存的 API 数据');
      // 添加自定义头标记这是缓存数据
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cached-Response', 'true');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers,
      });
    }

    // 无缓存时返回错误
    return new Response(
      JSON.stringify({
        error: { message: '网络连接失败，且无缓存数据可用' },
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ==================== 缓存策略 ====================

/** 缓存优先：优先从缓存读取，缓存未命中时才请求网络 */
async function handleCacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 对于 HTML 页面，返回缓存的 index.html（SPA 回退）
    if (request.headers.get('Accept')?.includes('text/html')) {
      const cachedHtml = await caches.match('/index.html');
      if (cachedHtml) return cachedHtml;
    }
    // 返回离线页面
    return new Response('离线状态，请连接网络后重试', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/** 网络优先：优先请求网络，失败时回退到缓存 */
async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('离线状态，请连接网络后重试', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/** 判断是否为静态资源 */
function isStaticAsset(pathname) {
  return (
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff2') ||
    pathname === '/manifest.json'
  );
}
