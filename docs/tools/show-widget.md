---
summary: "在网页聊天中内联渲染独立的 SVG 或 HTML 小部件"
title: "显示小部件"
sidebarTitle: "显示小部件"
read_when:
  - 你希望代理在网页聊天中渲染交互式结果
  - 你需要了解 show_widget 输入、安全性或保留协议
---

`show_widget` 会在 Control UI 聊天记录中以内联方式渲染一个独立的 SVG 或 HTML 片段。捆绑的 Canvas 插件拥有该工具，并将每个结果作为同源的 Canvas 文档进行托管。

只有在发起的 Gateway 客户端声明了 `inline-widgets` 能力时，该工具才可用。Control UI 会自动声明此能力。诸如 Telegram 和 WhatsApp 之类的通道不会接收 `show_widget`。

能力传输覆盖嵌入式、Codex 应用服务器以及基于 CLI 的模型后端。经过授权的 MCP 调用方和直接的 HTTP 工具调用方仍然默认关闭，因为它们不会声明客户端能力。

## 使用该工具

代理需要提供两个必填字符串：

<ParamField path="title" type="string" required>
  随内联预览一起显示的简短标题，以及托管文档标题中的标题。
</ParamField>

<ParamField path="widget_code" type="string" required>
  自包含的 SVG 或 HTML 片段。去除首尾空白后，以 `<svg` 开头的输入会以 SVG 模式渲染；其他所有输入都将作为 HTML 片段处理。最大长度：262,144 个字符。
</ParamField>

工具结果包含一个 Canvas 预览句柄，因此网页聊天会直接从工具调用渲染该小部件，并在历史记录重新加载后恢复它。不显示预览的转录内容仍会显示托管的 Canvas 路径。

## 安全与存储

Widget 文档使用严格的 Content Security Policy：允许内联样式和脚本，图片可以使用 `data:` URL，并且会阻止外部 fetch 和资源加载。请将所有标记、样式、脚本和图片数据都放在 `widget_code` 中。

即使 Control UI 的全局嵌入模式是 `trusted`，iframe 也始终不会包含 `allow-same-origin`，因此 widget 脚本无法读取父应用的 origin。Canvas 主机还会使用 `Content-Security-Policy: sandbox allow-scripts` 响应头来提供 widget 文档，所以直接打开托管 URL 时，widget 仍然会在一个不透明 origin 中运行，而不是在 Control UI 的 origin 中运行。浏览器沙箱不能阻止脚本导航其自身的 iframe；只渲染你愿意在该隔离框架中执行的 widget 代码。

该 iframe 还遵循 [`gateway.controlUi.embedSandbox`](/web/control-ui#hosted-embeds)。默认的 `scripts` 层级支持交互式 widget，同时保持 origin 隔离。

Canvas 每个会话最多保留 32 个 widget（如果没有会话，则按每个 agent 计算）。创建另一个 widget 会移除该作用域中最旧的文档。

## 相关内容

- [控制 UI 托管嵌入](/web/control-ui#hosted-embeds)
- [Canvas 插件](/plugins/reference/canvas)
- [网关协议客户端能力](/gateway/protocol#client-capabilities)
