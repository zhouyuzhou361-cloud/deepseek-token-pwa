# 🛠 开发与维护说明

[返回中文首页](../README.md) · [English overview](../README.en.md)

## 1. 源码位置

实际应用位于 [`Token Query/deepseek-token-pwa/`](../Token%20Query/deepseek-token-pwa/)。根目录 README 提供统一入口，应用目录内 README 只保留导航，避免多份部署说明相互冲突。

| 文件 | 作用 |
|------|------|
| [index.html](../Token%20Query/deepseek-token-pwa/index.html) | Key 设置页与余额仪表盘 |
| [js/app.js](../Token%20Query/deepseek-token-pwa/js/app.js) | 本地配置、余额解析、Token 估算、刷新与 UI |
| [sw.js](../Token%20Query/deepseek-token-pwa/sw.js) | 同源请求拦截、余额转发尝试、静态和 API 缓存 |
| [manifest.json](../Token%20Query/deepseek-token-pwa/manifest.json) | PWA 名称、启动路径、显示方式、图标 |
| [css/style.css](../Token%20Query/deepseek-token-pwa/css/style.css) | 页面样式、响应式和系统深色模式 |
| [scriptable-widget.js](../Token%20Query/deepseek-token-pwa/scriptable-widget.js) | 独立 iOS 小组件脚本 |
| [icons/generate-icons.html](../Token%20Query/deepseek-token-pwa/icons/generate-icons.html) | 图标生成辅助页面 |

## 2. 数据流程

### PWA

```text
页面读取 localStorage 中的 Key
              ↓
同源 GET /api/balance，携带 X-Api-Key
              ↓
已控制页面的 Service Worker 拦截
              ↓
GET https://api.deepseek.com/user/balance
使用 Authorization: Bearer 认证
              ↓
解析余额、保存缓存、渲染余额和估算 Token
```

若 Service Worker 尚未控制页面，`/api/balance` 可能抵达静态站点服务器。Service Worker 中的跨域 fetch 仍受浏览器 CORS 规则影响，代码注释中的“绕过 CORS”不能作为功能保证。仓库没有配套服务端代理。

### Scriptable

```text
本地脚本中的 DEEPSEEK_API_KEY
              ↓
Scriptable Request → DeepSeek /user/balance
              ↓
余额解析与参考费率估算 → iOS 小组件
```

浏览器与 Scriptable 是两个独立运行环境，配置和刷新机制不共享。

## 3. 估算口径

两个入口都使用各自文件里的 `MODEL_PRICING`，现有代码按其中 `deepseek-v4-pro` 的参考输入/输出价格分别计算：

```text
估算输入 Token = 余额 ÷ 参考输入单价 × 1,000,000
估算输出 Token = 余额 ÷ 参考输出单价 × 1,000,000
```

这不是历史统计，两项不能相加当作同一笔余额可同时购买的数量。网页主数字采用输入估算，进度条表示充值余额占比。价格是维护在代码里的参考值；更新时同步网页与小组件，不将内置值称为最新官方定价。

余额解析目前只读取 `balance_infos[0]`，固定 `¥` 的 UI 与人民币费率没有完整适配 USD 或多币种。账户结构参见 [DeepSeek 余额接口](https://api-docs.deepseek.com/api/get-user-balance/)。

## 4. 本地数据与缓存

| 存储 | 当前内容 |
|------|----------|
| localStorage.deepseek_api_key | 未作应用层加密的 Key |
| localStorage.deepseek_cached_data | 最近存储的余额对象 |
| localStorage.deepseek_last_updated | 页面保存数据时记录的时间 |
| CacheStorage.deepseek-pwa-v1 | 静态资源与成功的 API 响应 |
| Scriptable 本地脚本常量 | 小组件使用的 Key，没有 Keychain 接入 |

当前没有账号隔离缓存。Service Worker 用请求 URL 匹配缓存，切换 Key 后可能读到旧账户数据；维护时应明确账户切换与缓存清除行为。缓存时间不能保证上游余额的新鲜度。

Service Worker 激活时清理同一 origin 下所有名称不同于本项目缓存名的缓存，这是共享域名的兼容风险。使用独立 origin，或在将来的代码修改中将清理范围限制为本项目。

## 5. 当前限制与后续改进位置

| 项目 | 当前状态 | 修改入口 |
|------|----------|----------|
| 历史 Token 用量/账单 | 未实现，仅余额和估算 | 数据接口与 app.js / widget |
| 子目录部署 | 存在站点根绝对路径 | app.js 的 API_PROXY、sw.js 的 STATIC_ASSETS 与回退路径 |
| 浏览器跨域 | SW 不提供跨域豁免，无服务端代理 | API 架构与可信服务端转发 |
| 首次接管 | 注册完成后未等待当前页面确认受控 | app.js 的 registerServiceWorker / init |
| Key 与余额隐私 | localStorage/脚本明文配置，缓存不按账号区分 | 配置管理、缓存键与清理入口 |
| 多语言/多币种 | 中文 UI、固定人民币符号 | HTML、manifest、app.js、widget |
| 小组件定时/离线 | 无固定间隔设置或离线回退 | Scriptable 脚本 |

本轮文档整理记录上述现状，应用逻辑的修复需单独实现与验证。

## 6. 验证与反馈

修改代码后，至少检查：首次打开与 SW 控制、有效/无效 Key、账号切换、网络失败与缓存、子目录路径，以及小组件三种尺寸。使用自己的测试环境，反馈中只保留脱敏日志，不上传认证头或真实 Key。

本次文档核对基于仓库源码和官方技术资料，没有使用真实 Key 发起余额请求，也不构成部署验收。

## 7. 参考资料

- [DeepSeek 余额 API](https://api-docs.deepseek.com/api/get-user-balance/)
- [MDN Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Scriptable API](https://docs.scriptable.app/)
