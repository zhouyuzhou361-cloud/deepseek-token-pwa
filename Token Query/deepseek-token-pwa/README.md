# 🐋 DeepSeek Token 用量 & 余额查询 PWA

在手机上像小组件一样，实时查看你的 DeepSeek 账户余额和 Token 用量。

## ✨ 功能特点

- 📊 **实时余额** — 自动获取充值余额、赠送余额
- 📱 **PWA 小组件** — 添加到手机主屏幕，像原生 App 一样使用
- 🔒 **数据安全** — API Key 仅保存在你手机本地，不上传任何服务器
- 🌙 **深色模式** — 自动跟随系统主题
- 📴 **离线缓存** — 断网也能查看上次的余额数据
- 🔄 **自动刷新** — 每 5 分钟自动更新，下拉也能手动刷新

## 🚀 快速部署

### 方式一：Vercel 部署（推荐，免费）

1. 访问 [vercel.com](https://vercel.com) 注册账号
2. 点击「New Project」→ 导入这个文件夹
3. 一键部署，获得 `https://xxx.vercel.app` 地址
4. 用手机浏览器打开该地址，按提示添加到主屏幕

### 方式二：GitHub Pages（免费）

1. 将整个文件夹推送到 GitHub 仓库
2. Settings → Pages → 选择 `main` 分支 → Save
3. 等待几分钟，获得 `https://你的用户名.github.io/仓库名` 地址
4. 手机浏览器打开，添加到主屏幕

### 方式三：本地测试

```bash
# 需要先安装 Node.js，然后用 npx 运行一个本地服务器
npx serve deepseek-token-pwa
```

## 📱 添加到手机主屏幕

### iPhone (Safari)
1. 用 Safari 打开网址
2. 点击底部中间的「分享」按钮（⬆️）
3. 滑动找到「添加到主屏幕」
4. 点击「添加」

### Android (Chrome)
1. 用 Chrome 打开网址
2. 点击右上角「⋮」菜单
3. 选择「添加到主屏幕」
4. 点击「添加」

## 🔑 获取 DeepSeek API Key

1. 访问 [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
2. 注册/登录 DeepSeek 开放平台
3. 点击「创建 API Key」
4. 复制 Key，粘贴到应用设置页

## 📁 项目结构

```
deepseek-token-pwa/
├── index.html          # 主页面
├── sw.js               # Service Worker（API 代理）
├── manifest.json       # PWA 清单
├── css/style.css       # 样式
├── js/app.js           # 业务逻辑
├── icons/              # 图标文件
└── README.md
```

## ⚠️ 注意事项

- **必须使用 HTTPS**：PWA 要求 HTTPS 连接（本地测试除外），Vercel/GitHub Pages 都自带 HTTPS
- **API Key 安全**：Key 保存在浏览器 localStorage 中，不会上传到任何第三方服务器
- **CORS 解决**：通过 Service Worker 代理 API 请求，绕过浏览器跨域限制

## 🛠 技术原理

```
手机浏览器 ──→ Service Worker ──→ DeepSeek API
   ↑                ↓
   └── 加密存储 API Key（本地）
```

Service Worker 拦截页面发往 `/api/balance` 的请求，加上 API Key 后转发到 DeepSeek 官方 API。因为 SW 内部请求不受浏览器 CORS 策略限制，所以纯前端也能安全调用第三方 API。

## 📄 License

MIT — 随意使用和修改
