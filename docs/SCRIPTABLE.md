# 🧩 iOS Scriptable 桌面小组件

[返回中文首页](../README.md) · [English overview](../README.en.md)

使用 [`scriptable-widget.js`](../Token%20Query/deepseek-token-pwa/scriptable-widget.js) 在 iPhone 主屏幕显示余额与估算 Token。该脚本直接运行在 Scriptable，不依赖网页部署或网页的 Service Worker。

## 1. 准备

- iPhone 上安装 [Scriptable](https://scriptable.app/)。
- 自己的 [DeepSeek API Key](https://platform.deepseek.com/api_keys)。
- 可访问 DeepSeek 余额接口的网络。

## 2. 导入并配置

1. 打开仓库中的 scriptable-widget.js，复制完整脚本。
2. 在 Scriptable 新建脚本，粘贴后命名，例如“DeepSeek 余额”。
3. 在自己的本地脚本副本中，将 `DEEPSEEK_API_KEY` 的占位内容替换为真实 Key。
4. 运行脚本并检查是否报错；脚本创建组件内容，最终效果在主屏幕组件中查看。
5. 进入 iPhone 主屏幕编辑，添加 Scriptable 小组件，选需要的尺寸。
6. 编辑该组件的设置，在 Script 项选择刚才保存的脚本。

系统与应用版本不同，菜单名称可能有差别。Scriptable 使用自己的 iOS JavaScript 环境，不能直接把脚本当网页脚本运行；相关对象见 [Scriptable 官方文档](https://docs.scriptable.app/)。

## 3. 尺寸与内容

| 尺寸 | 脚本当前布局 |
|------|--------------|
| 小型 | 余额、账户状态和生成时间 |
| 中型 | 余额、估算可用 Token、充值与赠送金额 |
| 大型 | 更完整的余额、Token 估算与内置参考费率 |

点按组件会打开 DeepSeek 开放平台。界面目前为中文；代码选取第一条余额并按 `¥` 显示，多币种账户未完整适配。

## 4. 可修改配置

| 位置 | 用途 |
|------|------|
| DEEPSEEK_API_KEY | 你本地使用的认证 Key |
| CONFIG.primaryColor / accentColor | 组件配色 |
| CONFIG.balanceUrl | 余额请求地址 |
| MODEL_PRICING | Token 估算参考价格，不是实时官方价格 |

Key 当前直接保存在脚本常量里，没有使用 Keychain。保护脚本、同步副本与备份；需要分享脚本时先恢复占位内容，不上传含真实 Key 的版本。

## 5. 刷新与排错

小组件刷新受 iOS 调度影响。现有脚本没有固定 5 分钟计时器、refreshAfterDate 配置或离线缓存，不能承诺后台刷新间隔。

| 现象 | 处理方向 |
|------|----------|
| 余额数据异常或错误组件 | 检查本地 Key 和网络，在 Scriptable 中查看实际报错 |
| 组件不显示所选脚本 | 检查组件的 Script 选择和尺寸 |
| 数值没有立即变化 | 系统调度可能延迟，先在应用中重新运行检查 |
| Token 与实际账单不同 | 这是按余额和参考费率的估算，没有读取历史消费 |
| 显示或颜色相关脚本错误 | 保留脱敏报错与 Scriptable/iOS 版本反馈，现有模板需按设备验证 |

本次文档未声称已在所有 iPhone、iOS 或 Scriptable 版本上验证运行。
