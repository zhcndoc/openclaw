---
summary: "在受支持的聊天界面上显示自包含的 HTML 小部件"
title: "显示小部件"
sidebarTitle: "显示小部件"
read_when:
  - 你希望代理在网页聊天、原生应用或 Discord 中渲染交互式结果
  - 你希望小部件按钮将后续提示发送回聊天中
  - 你希望使用共享设计令牌为小部件设置主题
  - 你需要了解 show_widget 输入、安全性或保留约定
---

`show_widget` 是一个核心工具，可在用户当前界面上显示一个自包含的 HTML 小部件。OpenClaw 会在 Control UI 以及 iOS、Android、macOS 和 Linux 的 Quick Chat 转录中以内联方式渲染它；Linux 仪表板使用浏览器版 Control UI。在启用了 [Activities](/channels/discord-activities) 的 Discord 会话中，Discord 插件会发布一个 **Open widget** 按钮，将其作为 Activity 启动。

## 小部件如何工作

当代理调用 `show_widget` 时，OpenClaw core 会将 `widget_code` 包装在一个最小的 HTML 文档中，将其存储为 Canvas 文档，并返回一个预览句柄。Control UI 会在一个受沙箱保护的 iframe 中渲染该句柄，而 iOS、Android、macOS 和 Linux Quick Chat 则使用隔离的 web view。完整聊天客户端会在历史记录重新加载后恢复该小部件；Quick Chat 会为其当前回复保留该小部件。

在 Control UI 会话中，Canvas 小部件也可以固定到会话仪表板。可在工具调用中设置 `pin: true`，或者在现有的转录小部件上使用 **固定到仪表板**。固定的 HTML 会在与 MCP Apps 相同的专用源、双层 iframe 沙箱宿主后运行；浏览器永远不会在不受信任的框架内解析小部件数据绑定。

对于浏览器嵌入，包装文档会在小部件代码周围注入四个小型宿主桥接：

- 尺寸报告器会将渲染后的内容高度发送到嵌入的聊天中，后者会对其进行限制并调整 iframe 以适配（160 到 1200 像素）。
- 宿主桥接定义了旧版的 `sendPrompt(text)` 辅助函数，以及结构化的 `openclaw.prompt`、`openclaw.state`、`openclaw.data` 和 `openclaw.cron` API。内联聊天提示保留其私有消息通道；仪表板 API 使用与 view-ticket 绑定的请求通道。参见 [交互式小部件](#interactive-widgets) 和 [仪表板能力](#dashboard-capabilities)。
- 主题桥接会监听 Control UI 当前的设计令牌，并在加载时以及每次主题变更时将其应用为 CSS 变量。
- 快照桥接会在嵌入的聊天请求导出时，将当前小部件文档渲染为 PNG。

其余内容都留在框架内：文档在一个带有严格内容安全策略的 opaque origin 中运行，因此小部件脚本无法访问 Control UI、Gateway 或网络。

只有当原始 Gateway 客户端声明了 `inline-widgets` 能力时，核心实现才可用。Control UI 和受支持的原生应用会自动声明此能力。对于需要自定义 TLS leaf pin 的 Gateway 连接，Linux Quick Chat 仍仅支持文本，因为其平台 WebView 无法绑定该 pin。Discord 实现在已配置 Activities 的 Discord 会话中才可用。其他通道运行不会接收到 `show_widget`。

能力传输覆盖嵌入式、Codex 应用服务器以及基于 CLI 的模型后端。经过授权的 MCP 调用方和直接的 HTTP 工具调用方仍然默认关闭，因为它们不会声明客户端能力。

## 设计系统

每个 Canvas 小组件都包含一个无 class 的基础样式表和一小组令牌：

| 令牌                                                                                 | 用途                               |
| ------------------------------------------------------------------------------------- | ---------------------------------- |
| `--surface`                                                                           | 页面级表面颜色                     |
| `--card`                                                                              | 卡片、按钮和代码背景               |
| `--elevated`                                                                          | 提升层级的表单控件背景             |
| `--text`                                                                              | 默认正文和控件文本                 |
| `--text-strong`                                                                       | 标题和突出数值                     |
| `--muted`                                                                             | 次要文本和细微边框                 |
| `--border`                                                                            | 标准分隔线和卡片边框               |
| `--border-strong`                                                                     | 强调的控件边框                     |
| `--accent`                                                                            | 链接和焦点环                       |
| `--accent-fill`                                                                       | 主操作填充                         |
| `--accent-fg`                                                                         | 主操作上的文本                     |
| `--ok`                                                                                | 成功状态                           |
| `--warn`                                                                              | 警告状态                           |
| `--danger`                                                                            | 错误或破坏性状态                   |
| `--info`                                                                              | 信息状态                           |
| `--radius`                                                                            | 共享的控件和卡片圆角半径           |
| `--font-body`                                                                         | 主机正文字体栈                     |
| `--font-mono`                                                                         | 主机等宽字体栈                     |
| `--accent-subtle`, `--ok-subtle`, `--warn-subtle`, `--danger-subtle`, `--info-subtle` | 派生的半透明状态背景               |

裸标题、段落、链接、按钮、输入框、选择框、文本域、表格和代码块会获得基础样式。辅助类提供常见模式：

- `.card` 用于带边框的内容表面
- `.badge`，以及 `.ok`、`.warn`、`.danger` 或 `.info`，用于紧凑的状态标签
- `.metric` 用于醒目的数值
- `.muted` 用于次要文本
- `.row` 用于可换行的水平布局
- `button.primary` 用于主操作

控制 UI 会在小组件加载时以及主题变化时发送一条 `openclaw:widget-theme` 消息，其中包含当前主题值。因此，小组件会跟踪每一个主题家族，包括 Claw、Knot、Dash 和自定义主题，而无需重新加载。在控制 UI 之外，包括原生应用和直接打开时，小组件会使用由 `prefers-color-scheme` 选择的内置浅色或深色调色板。

编写小组件时遵循三条规则：

1. 为每一种颜色和背景都使用设计变量。不要硬编码颜色值。
2. 保持页面背景透明，使小组件属于其宿主表面。
3. 将 `--accent-fill` 仅保留给最多一个主操作。

**导出：** 在网页聊天中，打开小组件卡片菜单即可将渲染后的小组件复制到剪贴板，或将其下载为 PNG。没有快照桥接的旧版小组件文档会回退为 HTML 文件下载。

## 使用该工具

这两种实现都使用相同的必填字段：

<ParamField path="title" type="string" required>
  随内联预览一起显示的简短标题，以及托管文档标题中的标题。
</ParamField>

<ParamField path="widget_code" type="string" required>
  自包含的 HTML 或 SVG。对于内联小组件客户端，在去除首尾空白后，以 `<svg` 开头的输入将以 SVG 模式渲染；最大长度为 262,144 个字符。Discord 接受完整的 HTML 文档或最多 48 KiB 的 body 片段。
</ParamField>

Discord 还接受用于 Activity 启动按钮的可选 `button_label` 文本。Canvas schema 故意省略了这个仅 Discord 可用的字段。

核心 Canvas 工具接受以下可选的仪表板放置字段：

- `pin`：同时将小组件放到会话仪表板上。
- `name`：稳定的小组件名称；默认值为 `title` 的 slug。
- `tab`：目标标签页 slug。
- `size`：`sm`、`md`、`lg`、`xl` 或 `full` 之一。
- `after`：在其后放置该小组件的同级小组件名称。
- `capabilities`：固定小组件请求的访问权限。`netOrigins` 包含精确的 HTTPS origin；`tools` 包含 `prompt`、一个允许列表中的读绑定，或一个精确的 `cron.trigger:<jobId>` 操作。

核心结果包含一个 Canvas 预览句柄，因此 Control UI 和受支持的原生应用会直接根据工具调用渲染该小组件，并在历史记录重新加载后恢复它。已固定的结果还会保留面板小组件名称，因此 Control UI 在转录重新加载后不会提供重复固定。Discord 会返回已存储的小组件和已发布消息的标识符。

`discord_widget` 仍作为已弃用的别名注册一个发布周期。新的 agent 调用应使用 `show_widget`。

## 交互式小组件

在 Control UI 中，小组件脚本可以驱动对话。包装文档定义了一个全局的 `sendPrompt(text)` 函数；调用它会把 `text` 作为用户手动输入并发送的消息提交到聊天中。你可以将它绑定到按钮或其他控件，以构建交互式流程，例如选择器、测验或下钻式仪表板。原生应用会渲染交互式小组件代码，但不会暴露这个聊天提示桥接。

```html
<button onclick="sendPrompt('详细显示失败的测试')">失败的测试</button>
```

每个提示都会在框架边界的两侧进行验证：

- `sendPrompt` 需要小组件内部的 [临时用户激活](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation)：它只会在用户在小组件中点击或按键后的几秒内生效，因此请将它绑定到按钮和其他点击目标上——在加载时自动调用是无效的。该桥接会将发送端点仅对自身保密，并且在不暴露用户激活的浏览器中会安全失败，因此小组件代码无法绕过此检查。
- 提示权限仅属于原始的小组件文档。受信任的桥接会在小组件代码运行或导航该框架之前，将其通道端点提供给聊天；聊天只接受第一次提供的端点，而通道会在导航时随文档一起失效。外部允许的嵌入 URL 永远不会被接纳。
- 小组件框架必须在聊天记录中可见，并且保持焦点——这是主机观察到的额外信号，表明用户确实正在与此小组件交互。
- 文本在去除首尾空白后必须非空，且最多 4,000 个字符。
- 以 `/` 开头的提示会被拒绝，因此小组件代码无法触发诸如 `/approve` 或 `/stop` 之类的聊天命令。
- 每个小组件文档在滚动一分钟内最多可发送 10 条提示；超出的提示会被静默丢弃。

被接受的提示会作为普通用户消息出现在记录中，并在拥有该小组件的会话中开启正常的代理回合。小组件内部没有反馈通道：被丢弃的提示会静默失败，而小组件也无法读取代理的回复。

## 仪表板能力

固定小组件可以在操作员审阅待处理卡片上显示的声明后，使用一个绑定工单的主机 API：

- `openclaw.prompt.send(text)` 需要临时用户激活，并会发布一条可见的编写器消息。声明并接收 `prompt` 工具授权可免去额外的每次点击确认；但验证、焦点检查和速率限制仍然适用。
- `openclaw.state.emit(payload)` 会添加一条会话通知。负载上限为 8 KiB，并且五秒内相同的客户端发出会被合并。
- `openclaw.data.read(bindingId, params?)` 仅在 Gateway 处解析。可授予的绑定包括 `sessions.list`、`usage.status`、`usage.cost`、`cron.list`、`cron.status`、`agents.list` 和 `health`。
- `openclaw.cron.trigger(jobId)` 仅在授予了精确的 `cron.trigger:<jobId>` 能力时，才会立即运行一个现有任务。

网络访问与主机工具是分开的。请将精确的 HTTPS origin 放入 `capabilities.netOrigins`；在获得批准后，只有这些 origin 会进入小组件的 `connect-src`。通配符、凭据、路径、查询字符串以及未声明的 origin 仍会被阻止。字面端口仅在它是所声明 origin 的一部分时才允许。

## 安全与存储

Widget 文档使用限制性的内容安全策略（Content Security Policy）。允许内联样式和脚本，而外部资源加载仍会被阻止。内联转录 widget 无法发起网络请求。固定的仪表盘 widget 只能获取代理声明且操作员已授予的精确 HTTPS 源。

Control UI 的 iframe 始终省略 `allow-same-origin`，即使全局嵌入模式为 `trusted` 也是如此，因此 widget 脚本无法读取父应用的 origin。原生客户端使用隔离、非持久化的 web view，并阻止导航离开托管的 widget。核心文档宿主还通过 `Content-Security-Policy: sandbox allow-scripts` 响应头提供 widget，因此直接渲染仍会让 widget 运行在一个 opaque origin 中，而不是应用 origin 中。仅渲染你愿意在该隔离 frame 中执行的 widget 代码。

该 iframe 还遵循 [`gateway.controlUi.embedSandbox`](/web/control-ui#hosted-embeds)。默认的 `scripts` 层级支持交互式 widget，同时保持 origin 隔离。

可接受的 WebRTC data-channel 外发残留已在 [Dashboard Architecture](/web/dashboard-architecture#modeled-residual-webrtc-data-channels) 中记录。

Canvas 每个会话最多保留 32 个 widget（如果没有会话，则按每个 agent 计算）。创建另一个 widget 会移除该作用域内最旧的文档。

## 相关内容

- [Control UI 托管嵌入](/web/control-ui#hosted-embeds)
- [Discord 活动](/channels/discord-activities)
- [Canvas 节点控件](/plugins/reference/canvas)
- [Gateway 协议客户端功能](/gateway/protocol#client-capabilities)
