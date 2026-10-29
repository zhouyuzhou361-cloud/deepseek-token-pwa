# 🐋 DeepSeek 余额查询与 Token 估算

**简体中文** | [English](README.en.md)

查看 DeepSeek API 账户余额，并按代码中的参考费率估算可用 Token。提供 **PWA 网页**和 **iOS Scriptable 桌面小组件**两种使用方式。

> 当前实现查询账户余额；Token 数值由余额与参考价格计算，不能作为历史用量或账单。应用界面目前为中文。

## ✨ 功能特点

- 💰 **账户余额** — 显示总余额、充值余额、赠送余额和账户可用状态
- 📊 **Token 估算** — 按内置输入/输出参考价格估算可用量，便于快速查看余量
- 📱 **PWA 网页** — 支持添加到主屏幕、系统深色模式、按钮与下拉刷新
- 🧩 **iOS 小组件** — Scriptable 脚本提供小、中、大三种布局，独立于网页运行
- 📴 **网页缓存** — 网络异常时可回退到已保存数据；缓存不是当前实时余额
- 🔄 **前台刷新** — PWA 页面可见时每 5 分钟尝试刷新，重新回到页面时也会刷新

## 🧭 从哪里开始

| 你的目标 | 使用方式 | 指南 |
|----------|----------|------|
| 在手机或电脑浏览器查看余额 | PWA 网页 | [网页使用与部署](docs/PWA.md) |
| 在 iPhone 桌面直接显示余额 | Scriptable 小组件 | [iOS 小组件设置](docs/SCRIPTABLE.md) |
| 理解目录、数据流程和已知限制 | 源码维护 | [开发与维护说明](docs/DEVELOPMENT.md) |

PWA 添加到主屏幕后是独立窗口的网页入口；桌面直接显示数据的小组件由 Scriptable 脚本提供。两者的设置和刷新机制分别说明。

## 🚀 快速开始

### 方式一：PWA 网页

1. 下载仓库：`Code → Download ZIP`，然后解压。
2. 在仓库根目录打开终端，使用 Python 3 启动静态服务器：

```sh
python -m http.server 8000 --directory "Token Query/deepseek-token-pwa"
```

3. 在电脑浏览器打开 `http://localhost:8000`；这个命令将实际应用目录作为站点根目录。
4. 从 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 获取自己的 API Key，确认浏览器已被 Service Worker 接管后，在应用中测试连接并保存。
5. 手机使用时，将应用部署到可信 HTTPS 站点，再按浏览器提供的“添加到主屏幕”入口安装。

**部署前请了解**：当前代码使用根路径 `/api/balance` 与根路径静态资源；子目录部署需要适配。Service Worker 不能绕过 CORS，网页能打开不代表余额查询已可用。具体部署参数、接管检查和故障处理见 [PWA 指南](docs/PWA.md)。

### 方式二：iOS Scriptable 小组件

1. 在 iPhone 安装 [Scriptable](https://scriptable.app/)。
2. 打开仓库中的 [scriptable-widget.js](Token%20Query/deepseek-token-pwa/scriptable-widget.js)，将完整内容复制到 Scriptable 新脚本。
3. 在自己的本地副本中填写 `DEEPSEEK_API_KEY`，运行检查；不要把含真实 Key 的副本提交到仓库。
4. 在主屏幕添加 Scriptable 小组件，选择这个脚本和所需尺寸。

该脚本不需要部署网页，直接通过 Scriptable 请求余额。小组件刷新由 iOS 调度，本脚本没有固定 5 分钟刷新或离线缓存机制。详见 [小组件指南](docs/SCRIPTABLE.md)。

## 📊 数据与估算口径

| 页面内容 | 实际含义 |
|----------|----------|
| 总余额、充值、赠送 | 来自 DeepSeek `/user/balance` 响应 |
| 可用输入/输出 Token | 余额 ÷ 代码内参考单价 × 1,000,000；两项是分别估算，不能相加视为同时可用 |
| 进度条 | 充值与赠送余额占比 |
| 自动刷新 | PWA 前台页面的定时请求，不是后台保活 |

当前代码选取 `balance_infos[0]`，界面固定使用 `¥`，估算按人民币参考费率；多币种账户尚未完整适配。参考价格保存在网页和小组件各自的 `MODEL_PRICING` 中，可能过时；账单、实际用量与最新定价以官方平台为准。接口定义见 [DeepSeek 余额 API](https://api-docs.deepseek.com/api/get-user-balance/)。

## 🔒 API Key 与本地数据

- PWA 将 Key 保存在浏览器 `localStorage`，没有应用层加密。查询时页面携带 Key，Service Worker 接管后将其用于向 DeepSeek 认证；未接管的请求也可能抵达同源托管服务器。因此只在自己信任的部署上输入 Key。
- Scriptable 示例将 Key 写在脚本常量里，当前没有使用 Keychain；保护好本地副本和可能的同步/备份。
- 网页会保存余额缓存，当前没有按账号隔离的缓存或一键清除入口。切换 Key 或共享设备时，应检查并按需清理该站点数据。
- 不在 Issue、截图、公开脚本或提交记录中分享真实 Key。清理站点数据会移除本地设置与缓存，需要重新配置。

存储方式和网络路径见 [开发与维护说明](docs/DEVELOPMENT.md)。

## 📁 项目结构

```text
deepseek-token-pwa/
├── README.md
├── README.en.md
├── docs/
│   ├── PWA.md              # 网页使用、部署与排错
│   ├── SCRIPTABLE.md       # iOS 小组件设置
│   └── DEVELOPMENT.md      # 数据流程、维护入口与限制
└── Token Query/
    └── deepseek-token-pwa/
        ├── README.md       # 指向根目录文档的入口
        ├── README.en.md
        ├── index.html
        ├── manifest.json
        ├── sw.js
        ├── scriptable-widget.js
        ├── js/app.js
        ├── css/style.css
        └── icons/
```

应用源码位于 [`Token Query/deepseek-token-pwa/`](Token%20Query/deepseek-token-pwa/)，而非仓库根目录。部署工具应将该目录作为应用根目录；现有源码布局保持原路径。

## ❓ 常见问题

| 问题 | 说明 |
|------|------|
| 为什么显示的 Token 与后台历史用量不同？ | 这里展示按余额计算的估算值，没有读取历史用量。 |
| 为什么网页部署成功仍无法查询？ | 检查 Service Worker 接管、API Key、网络与 CORS；详见 PWA 排错。 |
| 是否可以放到 GitHub Pages？ | 可以发布静态文件，但当前根路径与浏览器跨域条件需要另行适配、验证。 |
| 离线还能看到新余额吗？ | 网页只能显示先前保存的缓存；小组件脚本没有离线缓存。 |
| 英文 README 是否代表界面已支持英文？ | 本次提供英文说明，现有网页和小组件界面仍为中文。 |

## 🤝 反馈与贡献

提交 Issue 时说明使用方式（PWA / Scriptable）、浏览器或 iOS 环境、部署根目录、错误现象及脱敏后的日志。修复路径、跨域或缓存逻辑后，分别验证首次加载、账号切换和离线回退。

## 📄 许可

原项目说明标注 MIT，仓库当前尚未包含独立的 LICENSE 文本；正式许可证文件有待维护者补充。
