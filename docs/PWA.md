# 📱 PWA 网页使用与部署

[返回中文首页](../README.md) · [English overview](../README.en.md)

本指南针对 [`Token Query/deepseek-token-pwa/`](../Token%20Query/deepseek-token-pwa/) 中的网页。它提供浏览器界面、主屏幕入口与离线缓存；iPhone 桌面直接显示余额的小组件另见 [Scriptable 指南](SCRIPTABLE.md)。

## 1. 准备条件

- 自己的 DeepSeek API Key，从 [官方开放平台](https://platform.deepseek.com/api_keys) 创建；不要提交或发送给他人。
- 支持 Service Worker 的浏览器，正式部署使用 HTTPS；电脑本地调试可使用 localhost。手机访问普通局域网 HTTP 地址不等同于 localhost 安全上下文。
- 将实际应用目录作为站点根目录，并使用专用站点 origin：当前 Service Worker 会清理同一 origin 中其他名称的 CacheStorage 缓存，不宜直接与别的应用共用站点。
- API 跨域条件必须实际允许浏览器读取响应。仓库没有服务端代理实现，Service Worker 不能取消 CORS 检查。

安全上下文与跨域机制参见 [MDN Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) 和 [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)。

## 2. 在电脑本地预览

解压或克隆仓库后，从仓库根目录运行：

```sh
python -m http.server 8000 --directory "Token Query/deepseek-token-pwa"
```

使用环境中的 Python 3 命令；部分系统需要将 python 换成 python3 或 py。打开 `http://localhost:8000`，不要直接双击 index.html 作为 file:// 页面。

首次打开时，Service Worker 注册完成不一定代表当前页面已经被接管。可在开发者工具的 Application → Service Workers（或浏览器对应面板）检查控制状态；必要时刷新页面后再输入 Key。源码中的 API 请求路径是 `/api/balance`，没有被接管时它可能直接发到静态托管服务器。

本地预览可以检查界面和资源，余额链路还需要有效 Key、联网和允许的跨域响应。本说明不把静态页面成功打开当作 API 功能已验证。

## 3. 部署到独立 HTTPS 站点

以 Vercel 为例，将仓库导入项目后，确认部署设置如下：

| 设置 | 值或要求 |
|------|----------|
| Root Directory | `Token Query/deepseek-token-pwa` |
| Framework Preset | Other（静态项目） |
| Build Command | 无需构建；关闭或留空构建命令 |
| Output Directory | 应用根目录；界面要求填写时使用 `.` |
| API Key | 不写进仓库或部署配置，本地浏览器中按需填写 |

Vercel 的 Root Directory 决定实际部署的应用目录，设置方式见 [Vercel 构建配置](https://vercel.com/docs/builds/configure-a-build#root-directory)。部署后先核对 manifest、脚本、样式、Service Worker 控制状态，再测试余额请求。

当前项目没有服务端 API 转发函数。若跨域请求失败，需另行实现可信的同源服务端代理并调整调用链；换一个静态托管平台并不会自动解决。不要通过关闭浏览器安全功能来处理 CORS。

## 4. GitHub Pages 与子目录

GitHub Pages 的分支发布源可选择仓库根目录或 `/docs`，不能直接在该选择器里指定任意嵌套应用目录。见 [GitHub Pages 发布源文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

若从 main 的仓库根目录发布，应用的静态页面位于项目站点下的 `Token%20Query/deepseek-token-pwa/` 子路径。当前源码还使用 `/api/balance`、`/index.html`、`/css/...` 等站点根绝对路径，因此需要先适配资源、缓存与请求路径并验证。发布静态页面不代表 API、安装和离线缓存均能正常工作。

本仓库当前没有实现这套子路径适配或 Pages 自动部署工作流。先在独立 origin 的根目录验证功能，再决定是否维护子目录部署方案。

## 5. 添加到手机主屏幕

在可信的 HTTPS 部署上，先在浏览器中成功测试连接，再添加：

| 设备 | 操作 |
|------|------|
| iPhone | 用 Safari 打开页面，分享菜单 → 添加到主屏幕；菜单文字随系统版本可能变化 |
| Android | 用浏览器提供的安装应用/添加到主屏幕入口，按提示完成 |

此入口打开网页的独立窗口。若需要桌面上直接显示余额数字，使用 Scriptable 小组件。

## 6. 刷新与缓存

PWA 有刷新按钮与下拉刷新。页面可见、已保存 Key 时，定时器每 5 分钟尝试刷新；页面隐藏后停用该定时器，再次可见时触发更新。系统后台调度不由本项目保证。

余额和更新时间保存在 localStorage，Service Worker 也会缓存成功的 API 响应。网络失败可能回退到旧数据；看到数据并不证明是刚获取的新余额。

当前没有账号级缓存隔离。切换 Key 后先联网刷新核对账户；共享设备或移除配置时，可在浏览器站点设置中按需清理该站点的存储、缓存与 Service Worker。清理会移除本地数据，若站点与其他应用共用 origin，也可能影响它们。

## 7. 常见问题

| 现象 | 优先检查 |
|------|----------|
| 404、样式或脚本缺失 | 是否把实际应用目录设置成站点根；是否误用了嵌套路径 |
| `/api/balance` 返回静态服务器的 404 | 当前页面是否已被 Service Worker 控制 |
| CORS 或网络失败 | 浏览器跨域响应、网络连通性；SW 不是跨域豁免 |
| 401 / 403 | Key 是否有效、有权限；不要在日志或反馈中公开 Key |
| 429 | 等待后再试，避免连续重复请求 |
| 更新后仍是旧界面/旧数据 | 缓存状态；清理前确认会影响的站点数据 |
| Token 估算与后台记录不同 | 页面没有读取历史用量；参考价格与货币可能不匹配 |

当前行为与维护位置见 [开发与维护](DEVELOPMENT.md)。本文基于源码与平台文档整理，未使用真实账户对全部部署环境作端到端验证。
