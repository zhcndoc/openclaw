---
summary: "macOS 应用程序如何报告 gateway/channel 健康状态"
read_when:
  - "调试 mac 应用健康指示器"
title: "健康检查（macOS）"
---

# <a id="health-checks-on-macos"></a> macOS 上的健康检查

macOS 应用程序从网关读取通道运行状况。配置的通道不需要链接会话字段来报告健康状态。明确禁用的帐户将保持不活动状态，无法提供健康的后备。

## <a id="menu-bar"></a> 菜单栏

菜单显示可操作的健康问题：橙色失败原因或红色登录要求。健康状态和待处理状态保持安静。打开菜单即可按需刷新生命值。

## <a id="settings"></a> 设置

- 在本机**连接…→连接**选项卡中，**本地网关**显示运行状况行：状态点、通道摘要和可选的故障详细信息行，其中**立即重试**和**打开日志**按钮。
- **仪表板→设置→通道**显示每个通道的状态和控制（登录QR、注销、检查、最后disconnect/error）。

健康行使用这些状态：

- 绿色：所选链接或配置的通道没有报告故障。
- Orange：通道或运行状况请求报告失败。当另一个配置的通道运行正常时，未链接的通道也会保持橙色。
- Red：需要链接，并且没有可用的健康配置通道。
- Gray：运行状况待定或所选通道已禁用或未配置。

摘要可以读取“Telegram 就绪”、“Telegram 运行”或“已链接·auth 12m”。该应用程序支持网关的启动和重新连接宽限窗口。单独的瞬态传输标志并不标志着通道降级。报告的故障（例如陈旧的套接字或不可用的入站处理）仍然优先于就绪的连接。

缺少 HTTP 状态本身并不意味着超时。该应用程序保留网关报告的检查错误。

## <a id="how-health-refresh-works"></a> 健康刷新的工作原理

该应用程序每约 60 秒按需通过其现有的 WebSocket 连接（不是 CLI shell-out）调用网关的 `health` RPC。这将读取网关的运行状况快照。它不请求活动通道检查或发送消息。该应用程序会分别缓存最后一个良好的快照和最后一个错误，因此 UI 会立即加载，并且在离线时不会闪烁。

本机运行状况行位于主网关之后。切换主网关会立即清除之前网关的缓存状态。来自该网关的延迟回复无法替代新结果。重新连接到同一网关会保留其最后一次良好的运行状况快照，同时运行新的检查。连接错误保留在报告它们的网关上。

## <a id="when-in-doubt"></a> 如有疑问

使用 [Gateway health](/gateway/health) 中的 CLI 流程（`openclaw status`、 `openclaw status --deep`、`openclaw health --json`），并运行 `openclaw logs --follow`，筛选 `web-heartbeat` / `web-reconnect`。

## <a id="related"></a> 相关内容

- [网关健康状态](/gateway/health)
- [macOS 应用](/platforms/macos)
