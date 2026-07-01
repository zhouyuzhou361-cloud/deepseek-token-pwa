/**
 * DeepSeek Token & Balance PWA
 * 主业务逻辑 — 纯前端实现
 *
 * 架构说明：
 * 前端 fetch('/api/balance') → Service Worker 拦截
 * → SW 加上 API Key 请求头 → DeepSeek API → 返回数据给页面
 *
 * API 端点：
 * - /user/balance → 账户余额
 * - /v1/usage → Token 用量（按月查询）
 */

// ==================== 常量 ====================

const STORAGE_KEYS = {
  API_KEY: 'deepseek_api_key',
  CACHED_DATA: 'deepseek_cached_data',   // 缓存余额+用量合体
  LAST_UPDATED: 'deepseek_last_updated',
};

// Service Worker 代理路径
const API_PROXY = {
  BALANCE: '/api/balance',
};

// 自动刷新间隔（5 分钟）
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

// ==================== DOM 元素引用 ====================

const $ = (sel) => document.querySelector(sel);

// 页面
const setupPage = $('#setupPage');
const dashboardPage = $('#dashboardPage');

// 设置页
const apiKeyInput = $('#apiKeyInput');
const toggleVisibilityBtn = $('#toggleVisibilityBtn');
const testBtn = $('#testBtn');
const saveBtn = $('#saveBtn');
const testResult = $('#testResult');
const settingsBtn = $('#settingsBtn');

// 仪表盘 - 余额
const totalBalance = $('#totalBalance');
const toppedUpBalance = $('#toppedUpBalance');
const grantedBalance = $('#grantedBalance');

// 仪表盘 - Token 用量
const tokenTotal = $('#tokenTotal');
const tokenInput = $('#tokenInput');
const tokenOutput = $('#tokenOutput');
const tokenProgressBar = $('#tokenProgressBar');
const tokenProgressPct = $('#tokenProgressPct');
const tokenPeriod = $('#tokenPeriod');

// 仪表盘 - 公共
const lastUpdated = $('#lastUpdated');
const accountStatus = $('#accountStatus');
const refreshBtn = $('#refreshBtn');
const toast = $('#toast');

// ==================== Toast ====================

let toastTimer = null;

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.add('hidden'); }, 2500);
}

// ==================== 工具函数 ====================

function formatNumber(num) {
  if (num == null || isNaN(num)) return '--';
  const parts = Number(num).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function formatTokens(num) {
  if (num == null || isNaN(num)) return '--';
  num = Number(num);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000)         return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatTime(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000)       return '刚刚更新';
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)} 小时前`;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ==================== API Key 管理 ====================

function getApiKey()   { return localStorage.getItem(STORAGE_KEYS.API_KEY) || ''; }
function saveApiKey(k) { localStorage.setItem(STORAGE_KEYS.API_KEY, k.trim()); }
function hasApiKey()   { return getApiKey().length > 0; }

// ==================== 缓存 ====================

function getCachedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCachedData(data) {
  localStorage.setItem(STORAGE_KEYS.CACHED_DATA, JSON.stringify(data));
  localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString());
}

function getLastUpdated() {
  return localStorage.getItem(STORAGE_KEYS.LAST_UPDATED) || '';
}

// ==================== API 请求 ====================

/** 通用 API 请求（通过 SW 代理） */
async function apiFetch(proxyPath, apiKey, params = {}) {
  const url = new URL(proxyPath, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`请求失败 (${response.status})`);
    if (response.status === 401)      error.message = 'API Key 无效，请检查后重试';
    else if (response.status === 403) error.message = 'API Key 没有访问权限';
    else if (response.status === 429) error.message = '请求过于频繁，请稍后重试';
    else if (response.status >= 500)  error.message = 'DeepSeek 服务器繁忙，请稍后重试';
    else {
      try {
        const j = JSON.parse(errorBody);
        if (j.error?.message) error.message = j.error.message;
      } catch {}
    }
    error.status = response.status;
    throw error;
  }
  return response.json();
}

/** 获取余额 */
async function fetchBalance(apiKey) {
  return apiFetch(API_PROXY.BALANCE, apiKey);
}

/** 测试 API Key */
async function testApiKey(apiKey) {
  await fetchBalance(apiKey);
  return true;
}

// ==================== 数据解析 ====================

function parseBalanceData(data) {
  if (!data?.balance_infos?.length) throw new Error('余额数据格式异常');
  const info = data.balance_infos[0];
  return {
    isAvailable: data.is_available,
    totalBalance: parseFloat(info.total_balance) || 0,
    grantedBalance: parseFloat(info.granted_balance) || 0,
    toppedUpBalance: parseFloat(info.topped_up_balance) || 0,
    currency: info.currency || 'CNY',
  };
}

// ==================== UI 渲染 ====================

/**
 * 模型费率参考（¥/百万 tokens）
 * 用于根据余额估算可调用 Token 数量
 */
const MODEL_PRICING = {
  'deepseek-v4-flash': { input: 1.0, output: 2.0, label: 'V4 Flash' },
  'deepseek-v4-pro':   { input: 3.0, output: 6.0, label: 'V4 Pro' },
};

/** 渲染余额 */
function renderBalance(balance) {
  totalBalance.classList.add('updating');
  totalBalance.textContent = formatNumber(balance.totalBalance);
  setTimeout(() => totalBalance.classList.remove('updating'), 300);

  toppedUpBalance.textContent = `¥${formatNumber(balance.toppedUpBalance)}`;
  grantedBalance.textContent = `¥${formatNumber(balance.grantedBalance)}`;

  accountStatus.textContent = balance.isAvailable ? '✅ 账户正常' : '⚠️ 账户不可用';
  accountStatus.style.color = balance.isAvailable ? '' : '#f59e0b';
}

/** 渲染 Token 用量估算（基于余额计算可用 Token 量） */
function renderTokenEstimate(balance) {
  if (!balance || balance.totalBalance <= 0) {
    tokenTotal.textContent = '--';
    tokenInput.textContent = '--';
    tokenOutput.textContent = '--';
    tokenProgressBar.style.width = '0%';
    tokenProgressPct.textContent = '暂无余额数据';
    tokenPeriod.textContent = '可用 Token 估算';
    return;
  }

  // 用 V4 Pro 估算可用 tokens
  const price = MODEL_PRICING['deepseek-v4-pro'];
  const estimatedTokens = (balance.totalBalance / price.input) * 1_000_000;

  // 大字：估算可用 tokens
  tokenTotal.textContent = formatTokens(estimatedTokens);

  // 输入：用余额/输入价格估算
  const estInput = (balance.totalBalance / price.input) * 1_000_000;
  tokenInput.textContent = formatTokens(estInput);

  // 输出：用余额/输出价格估算
  const estOutput = (balance.totalBalance / price.output) * 1_000_000;
  tokenOutput.textContent = formatTokens(estOutput);

  // 进度条：充值余额占比
  const topUpRatio = balance.totalBalance > 0
    ? (balance.toppedUpBalance / balance.totalBalance) * 100
    : 0;
  tokenProgressBar.style.width = `${topUpRatio}%`;
  tokenProgressBar.style.background = 'linear-gradient(90deg, #06b6d4, #3b82f6)';
  tokenProgressPct.textContent = `充值占比 ${topUpRatio.toFixed(0)}%  ·  赠送占比 ${(100 - topUpRatio).toFixed(0)}%`;

  // 标签
  tokenPeriod.textContent = `基于余额 V4 PRO 估算`;
}

/** 渲染更新时间 */
function renderUpdateTime() {
  lastUpdated.textContent = formatTime(getLastUpdated());
}

/** 渲染完整仪表盘 */
function renderDashboard(balance) {
  renderBalance(balance);
  renderTokenEstimate(balance);
  renderUpdateTime();
}

// ==================== 页面切换 ====================

function showSetupPage() {
  setupPage.classList.remove('hidden');
  dashboardPage.classList.add('hidden');
}

function showDashboardPage() {
  setupPage.classList.add('hidden');
  dashboardPage.classList.remove('hidden');
}

// ==================== 核心操作 ====================

/** 执行数据刷新 */
async function refreshData(showLoading = true) {
  const apiKey = getApiKey();
  if (!apiKey) { showSetupPage(); return; }

  if (showLoading) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ 加载中...';
  }

  try {
    const balanceData = await fetchBalance(apiKey);
    const balance = parseBalanceData(balanceData);

    // 缓存
    setCachedData({ balance });

    // 渲染
    renderDashboard(balance);

    if (showLoading) showToast('✅ 数据已刷新', 'success');
  } catch (error) {
    console.error('刷新失败:', error);

    // 回退缓存
    const cached = getCachedData();
    if (cached?.balance) {
      renderDashboard(cached.balance);
      showToast(`⚠️ ${error.message}，显示缓存数据`, 'error');
    } else {
      showToast(`❌ ${error.message}`, 'error');
    }
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 刷新数据';
  }
}

/** 测试连接 */
async function handleTestConnection() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) { showToast('请先输入 API Key', 'error'); return; }

  testResult.classList.remove('hidden', 'success', 'error');
  testResult.className = 'test-result loading';
  testResult.textContent = '⏳ 正在测试连接...';
  testBtn.disabled = true;

  try {
    await testApiKey(apiKey);
    testResult.className = 'test-result success';
    testResult.textContent = '✅ 连接成功！API Key 有效';
  } catch (error) {
    testResult.className = 'test-result error';
    testResult.textContent = `❌ 连接失败：${error.message}`;
  } finally {
    testBtn.disabled = false;
  }
}

/** 保存 API Key 并跳转 */
async function handleSaveAndView() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) { showToast('请先输入 API Key', 'error'); return; }

  saveApiKey(apiKey);

  try {
    const balanceData = await fetchBalance(apiKey);
    const balance = parseBalanceData(balanceData);
    setCachedData({ balance });
    showDashboardPage();
    renderDashboard(balance);
    showToast('✅ 连接成功', 'success');
  } catch (error) {
    showDashboardPage();
    showToast(`⚠️ ${error.message}`, 'error');
    const cached = getCachedData();
    if (cached?.balance) renderDashboard(cached.balance);
  }
}

// ==================== SW 管理 ====================

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    console.log('SW 注册成功:', registration.scope);
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('🔔 有新版本可用，刷新页面即可更新', 'info');
          }
        });
      }
    });
  } catch (error) {
    console.error('SW 注册失败:', error);
  }
}

// ==================== 事件 ====================

function handleToggleVisibility() {
  const isPwd = apiKeyInput.type === 'password';
  apiKeyInput.type = isPwd ? 'text' : 'password';
  toggleVisibilityBtn.textContent = isPwd ? '🙈' : '👁️';
}

function handleSettingsClick() {
  showSetupPage();
  const key = getApiKey();
  if (key) apiKeyInput.value = key;
}

/** 下拉刷新 */
function setupPullToRefresh() {
  const container = document.querySelector('.dashboard-container');
  if (!container) return;
  let startY = 0, pulling = false;

  container.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) { startY = e.touches[0].clientY; pulling = true; }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    if (e.touches[0].clientY - startY > 60) { pulling = false; refreshData(true); }
  }, { passive: true });

  container.addEventListener('touchend', () => { pulling = false; });
}

// ==================== 初始化 ====================

async function init() {
  await registerServiceWorker();

  toggleVisibilityBtn.addEventListener('click', handleToggleVisibility);
  testBtn.addEventListener('click', handleTestConnection);
  saveBtn.addEventListener('click', handleSaveAndView);
  settingsBtn.addEventListener('click', handleSettingsClick);
  refreshBtn.addEventListener('click', () => refreshData(true));

  setupPullToRefresh();

  if (hasApiKey()) {
    showDashboardPage();
    const cached = getCachedData();
    if (cached?.balance) renderDashboard(cached.balance);
    refreshData(false);
  } else {
    showSetupPage();
  }

  // 自动刷新
  let timer = null;
  const startTimer = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (document.visibilityState === 'visible' && hasApiKey()) refreshData(false);
    }, AUTO_REFRESH_INTERVAL);
  };
  const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { startTimer(); if (hasApiKey()) refreshData(false); }
    else stopTimer();
  });
  startTimer();
}

document.addEventListener('DOMContentLoaded', init);
