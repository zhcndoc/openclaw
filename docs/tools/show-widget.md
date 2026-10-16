---
summary: "在支持的聊天界面上显示 HTML 小部件或将本机数据报告固定到仪表板"
title: "显示小部件"
sidebarTitle: "显示小部件"
read_when:
  - "你希望代理在网页聊天、原生应用或 Discord 中渲染交互式结果"
  - "您想要将包含指标、表格、图表或链接的报告固定到仪表板"
  - "你希望小部件按钮将后续提示发送回聊天中"
  - "你希望使用共享设计令牌为小部件设置主题"
  - "你需要了解 show_widget 输入、安全性或保留约定"
---

`show_widget` 是一个核心工具，可在用户当前表面上显示独立的 HTML 小部件。 OpenClaw 将其内联呈现在 Control UI 以及 iOS、Android、macOS 和 Linux 快速聊天记录中。 Linux 仪表板使用浏览器 Control UI。在启用了 [Activities](/channels/discord-activities) 的 Discord 会话中，Discord 插件会发布一个 **Open widget** 按钮，将其作为活动启动。

对于固定数据报告，请提供结构化 `report` 和 `pin: true`。报告使用其本机排版和布局直接在 Control UI 仪表板中呈现，无需文档框架。使用 HTML 进行任意交互式内容或内联预览。请参阅 [ 本机仪表板报告 ](#native-dashboard-reports)。

捆绑的 `visualize` 技能教授内联代码解释（架构、执行跟踪、性能比较和 UI 模型）和持久仪表板内容。 `control-ui` 技能拥有会话和董事会组织。保持一次性视觉效果内嵌；固定显式仪表板请求或属于在一起的多个非代码可视化。

## <a id="how-widgets-work"></a> 小部件如何工作

对于 HTML 小部件，OpenClaw 核心通过解析每个内联 JavaScript `<script>`（经典和模块）来验证 `widget_code`，跳过带有 `src` 或非 JavaScript 的脚本`type`，然后将其包装在标准 HTML 文档中。 Core 会拒绝第一个语法错误的行和列的调用，因此永远不会托管脚本损坏的小部件。对于内联客户端，核心将该文档存储为 Canvas 文档并返回预览句柄。 Control UI 通过其经过身份验证的网关连接读取文档，并通过仪表板小部件和 MCP 应用程序使用的专用源双 iframe 沙箱进行呈现。小部件框架不需要自己的登录会话。 iOS、Android、macOS 和 Linux 快速聊天使用独立的 Web 视图。完整聊天客户端在历史记录重新加载后恢复小部件。快速聊天保留小部件以进行主动回复。

频道插件可以在同一核心工具后面注册上下文演示者。在配置的 Discord 会话中，核心将撰写的文档交给 Discord 演示者，后者存储该文档并将“活动”按钮发布到当前频道中。该模型仍会发出一次 `show_widget` 调用。没有特定于传输的小部件工具或内容类型。

在 Control UI 会话中，Canvas 小部件也可以固定到会话仪表板。在工具调用中设置 `pin: true`，或使用 **Pin 到现有记录小部件上的仪表板**。固定为仪表板副本提供了自己的身份和功能授予。内联预览永远不会继承这些授权。浏览器永远不会解析不受信任框架内的小部件数据绑定。

对于浏览器嵌入，包装器文档在小部件代码周围注入了六个小型主机桥：

- A 大小报告器将渲染的内容高度（包括子边距和浮动）发布到嵌入聊天。聊天会限制该高度并适合 iframe（48 到 8000 像素）。
- A 主桥定义了全局 `sendPrompt(text)` 帮助器以及结构化 `openclaw.prompt`、`openclaw.state`、`openclaw.data` 和 `openclaw.cron` API。 `sendPrompt(text)` 是 `openclaw.prompt.send` 的即发即忘形式。内嵌聊天提示保留其私人消息通道。仪表板 API 使用视图票据绑定请求通道。请参阅 [ 交互式小部件 ](#interactive-widgets) 和 [ 仪表板功能 ](#dashboard-capabilities)。
- 错误报告器捕获未捕获的脚本和事件处理程序异常以及未处理的承诺拒绝。每个文档加载最多发送三个不同的消息，消息上限为 500 UTF-16 单位，源基本名称为 200，以及可选的整数行号和列号。 Control UI 显示通知，并将每个文档和每个页面加载的聊天会话转发一份报告作为会话唤醒事件到网关，附加共享限制为每 60 秒每个键 10 个报告（最多 100 个跟踪键）。仅针对在消息发出后十分钟内呈现的小部件，将报告转发给代理。较旧的恢复历史记录会在不唤醒代理的情况下显示通知。如果会话已经有活动运行，则事件将保持排队状态并立即唤醒重试，直到会话通道空闲，以便模型在下一个可用回合中看到它。唤醒轮流在没有原始客户端功能的情况下运行，因此 `show_widget` 在那里可能不可用。该报告要求模型回复正确的代码并在下一轮显示。本机应用程序尚不报告运行时错误。
- A 主题桥监听 Control UI 的当前设计令牌并将其应用为 CSS 变量。它在加载时执行此操作，并在每次主题更改时再次执行此操作。
- 快照桥接会在嵌入的聊天请求导出时，将当前小部件文档渲染为 PNG。
- A 聊天主机桥会在小部件内联运行时隐藏嵌入的滚动条镶边，同时保留滚动行为。

其他一切都留在框架内。该文档在具有限制性内容安全策略的不透明源中运行。小部件脚本无法直接到达 Control UI 或网关。允许公开 CDN 资产，如下所述； API 连接与静态资源加载保持分离。

仅当原始网关客户端声明 `inline-widgets` 功能或恰好有一个注册的当前通道演示者同步匹配可信运行上下文时，OpenClaw 才会公开 `show_widget`。 Control UI 和支持的本机应用程序自动声明内联功能。对于需要自定义 TLS 叶引脚的网关连接，Linux 快速聊天保持纯文本状态，因为其平台 WebView 无法绑定该引脚。 Discord 仅当为当前账户配置了活动并且有具体渠道可用时才匹配。没有内联客户端或匹配演示者运行的其他通道不会收到该工具。

绑定到持久会话并携带服务器编写的调度工具策略的代理轮转自动化可能会明确允许 `show_widget` 而无需内联客户端。该计划表面仅固定：每个调用都需要 `pin: true`，写入绑定的会话仪表板，并且无法设置 `presentation.target`。分离的 cron 运行会话、普通的无上限通道运行以及没有明确工具上限的计划作业仍被排除在外。对于内联演示，始发客户端功能仍然是强制性的。

当网关在重新启动后自动恢复中断的 Control UI 转向时，恢复的转向还可以在没有连接的浏览器的情况下创建或更新固定的仪表板小部件。恢复使用相同的仅固定表面：设置 `pin: true` 并省略 `presentation.target`。内联预览仍然需要声明 `inline-widgets` 的客户端进行新一轮操作。恢复的轮次不会继承浏览器连接或设备呈现权限。

`status: "pinned"` 工具结果意味着该小部件位于会话仪表板上。在 Control UI 中打开该仪表板选项卡，或者在该工具可用时将 `dashboard` 与 `action: "focus_tab"` 以及保存的小部件的 `tabId` 一起使用。小部件托管 URL 是内部呈现资源，不应在浏览器面板中打开以替代小部件呈现。

能力传输涵盖嵌入式、Codex 应用程序服务器和 CLI- 支持的模型后端。没有 `inline-widgets` 的经过授权验证的 MCP 调用者将被拒绝，除非其可信运行上下文与演示者匹配。经过身份验证的直接 HTTP `tools/invoke` 请求无法请求内联渲染，但携带符合条件的当前通道上下文的请求可以使用匹配的演示器。身份验证永远不会绕过演示者或路由资格。

## <a id="design-system"></a> 设计系统

每个 Canvas 小组件都包含一个无 class 的基础样式表和一小组令牌：

| 令牌                                                                                 | 用途                               |
| ------------------------------------------------------------------------------------- | ------------------------------------- |
| `--surface`                                                                           | 页面级表面颜色              |
| `--card`                                                                              | 卡片、按钮和代码背景     |
| `--elevated`                                                                          | 提升层级的表单控件背景      |
| `--text`                                                                              | 默认正文和控件文本         |
| `--text-strong`                                                                       | 标题和突出数值         |
| `--muted`                                                                             | 次要文本和细微边框     |
| `--border`                                                                            | 标准分隔线和卡片边框  |
| `--border-strong`                                                                     | 强调的控件边框                |
| `--accent`                                                                            | 链接和焦点环                 |
| `--accent-fill`                                                                       | 主操作填充                   |
| `--accent-fg`                                                                         | 主操作上的文本              |
| `--ok`                                                                                | 成功状态                         |
| `--warn`                                                                              | 警告状态                         |
| `--danger`                                                                            | 错误或破坏性状态            |
| `--info`                                                                              | 信息状态                   |
| `--radius`                                                                            | 共享的控件和卡片圆角半径 |
| `--font-body`                                                                         | 主机正文字体栈                  |
| `--font-mono`                                                                         | 主机等宽字体栈             |
| `--accent-subtle`, `--ok-subtle`, `--warn-subtle`, `--danger-subtle`, `--info-subtle` | 派生的半透明状态背景 |

裸标题、段落、链接、按钮、输入框、选择框、文本域、表格和代码块会获得基础样式。辅助类提供常见模式：

- `.card` 用于带边框的内容表面
- `.badge`，以及 `.ok`、`.warn`、`.danger` 或 `.info`，用于紧凑的状态标签
- `.metric` 用于醒目的数值
- `.muted` 用于次要文本
- `.row` 用于可换行的水平布局
- `button.primary` 用于主操作

当小部件加载时，Control UI 会发布一条带有活动主题值的 `openclaw:widget-theme` 消息。每当主题改变时它就会再次发布。因此，小部件可以跟踪每个主题系列，包括 Claw、Knot、Dash 和自定义主题，而无需重新加载。在 Control UI 之外，包括本机应用程序和直接打开，小部件使用 `prefers-color-scheme` 选择的烘焙浅色或深色调色板。

使用四个规则创作小部件：

1. 为每一种颜色和背景都使用设计变量。不要硬编码颜色值。
2. 保持页面背景透明，使小组件属于其宿主表面。
3. 将 `--accent-fill` 仅保留给最多一个主操作。
4. 适合每个视口的 iframe 宽度。避免固定的页面或卡片宽度。当多列布局较窄时，使用流体调整大小并包裹或堆叠多列布局。仅当必须保留精确的几何形状时才使用水平滚动。

**Export：** 在网络聊天中，打开小部件卡菜单。从那里，将渲染的小部件复制到剪贴板或将其下载为 PNG。没有快照桥的旧版小部件文档会回退到 HTML 文件下载。 PNG 导出器不内联外部样式表或字体；使用时检查导出。

## <a id="libraries-and-fonts"></a> 库和字体

在 `widget_code` 中发送 HTML/SVG 片段，带有可选的 `<style>`、`<link>` 和 `<script>` 标签。 OpenClaw 提供文档外壳。默认小部件策略允许来自以下位置的脚本、ES 模块导入、样式表和字体：

- `https://cdnjs.cloudflare.com`
- `https://cdn.jsdelivr.net`
- `https://esm.sh`
- `https://unpkg.com`
- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`
- `https://fonts.bunny.net`

使用版本固定库并在使用它们的代码之前加载它们：

```html
<div id="chart">Loading chart…</div>
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js" crossorigin="anonymous"></script>
<script>
  const chart = document.getElementById("chart");
  if (typeof d3 === "undefined") {
    chart.textContent = "Chart library unavailable. Try again when the CDN is reachable.";
  } else {
    chart.textContent = "";
    d3.select(chart)
      .selectAll("p")
      .data([3, 5, 8])
      .join("p")
      .text((value) => `Value: ${value}`);
  }
</script>
```

传递导入、样式表 URL、字体文件和重定向也必须使用允许的来源。没有预加载库。内联 JavaScript 语法在托管之前经过验证；外部库加载和运行时行为需要渲染验证。严格嵌入模式继续禁用脚本。

此白名单允许公共资源请求，无需仪表板授权。它不启用 `fetch`、WebSocket、任意远程图像、嵌套帧或 `unsafe-eval`。从 CDN 获取数据仍然需要普通连接权限。将私有数据和凭证排除在资产 URL 之外。外部代码在小部件内部运行，可以查看其内容并使用其授予的功能；相应地选择库。 CDN 请求向 CDN 揭示客户的 IP 和请求的资产；小部件文档使用无引用策略。

现有存储的内联文档保留其原始文档策略。重新创建旧的小部件以使用外部库或 HTTPS 媒体；更改主机策略不会重写聊天记录。

## <a id="use-the-tool"></a> 使用该工具

核心工具需要 `title` 和一个内容输入：`widget_code`（用于 HTML 或注册源）或 `report`（用于本机仪表板报告）。

<ParamField path="title" type="string" required>
  目标表面显示的短小部件标题。 HTML文档也用它作为文档标题。 Discord 最多接受 80 个字符。
</ParamField>

<ParamField path="widget_code" type="string">
  对于 HTML、SVG 或注册源是必需的。提供 `report` 时省略。对于 HTML，核心解析每个内联 JavaScript `<script>`（经典和模块），跳过带有 `src` 或非 JavaScript `type` 的脚本。该调用因第一个语法错误的行和列而被拒绝，因此永远不会托管脚本损坏的小部件。对于内联小部件客户端，修剪后以 `<svg` 开头的输入将以 SVG 模式呈现。 HTML 和 SVG 最多接受 10 个 MiB 的 UTF-8 数据，包括最终文档中 OpenClaw 的包装器。注册源在固定时仍限制为 262,144 个字符和 256 KiB。 Discord 演示器可接受最多 48 个 KiB 的 HTML 源。 Discord-only 路由不会通告或接受已注册的非 HTML 内容类型。
</ParamField>

<ParamField path="report" type="object">
  具有 `blocks` 数组的结构化本机报告。需要 `pin: true`。省略 `widget_code`、`kind` 和 `capabilities`。设备演示不可用。 UTF-8 JSON 最大 8KB。请参阅 [ 本机仪表板报告 ](#native-dashboard-reports)。
</ParamField>

Discord 还接受活动启动按钮的可选 `button_label` 文本。 Canvas 架构有意省略此 Discord-only 字段。

核心 `show_widget` 工具还接受这些可选的仪表板放置字段，包括当 Discord 是演示目标时：

- `kind`：默认为 `html`，加上可用的活动注册源类型。适用于 `widget_code`。省略 `report`。
- `pin`：还在会话仪表板上放置 HTML 或注册的小部件。对于报告和仅固定的计划表面是必需的。
- `name`：稳定的小部件名称。默认为 `title` 的段。
- `tab`：目标标签页 slug。
- `size`：`sm`、`md`、`lg`、`xl` 或 `full` 之一。
- `presentation.frame`：固定仪表板框架：`card`、`full-bleed` 或 `frameless`。
- `after`：在其后放置该小组件的同级小组件名称。
- `capabilities`：固定小部件请求的访问。 `netOrigins` 包含确切的 HTTPS 起源。 `tools` 包含 `prompt`、允许列表的读取绑定或确切的 `cron.trigger:<jobId>` 操作。

内联结果包括 Canvas 预览句柄，因此 Control UI 和支持的本机应用程序直接从工具调用渲染小部件，并在历史记录重新加载后恢复它。成功的当前频道演示会返回一个通用消息收据，描述可见内容。固定结果会保留板小部件名称，因此 Control UI 在成绩单重新加载后不会提供重复的 pin。

固定结果还报告 `capabilityState`：`none`、`pending`、`rejected` 或 `granted`。保存的小部件不一定有权读取数据。对于 `pending`，请操作员查看仪表板权限卡。对于 `rejected`，请在重试之前与操作员一起检查请求的访问和会话权限策略。内联预览不会继承仪表板授权。

如果当前通道呈现失败，则仅当原始客户端实际上支持内联小​​部件时，核心才会退回内联。否则该工具会明显失败。当 `pin: true` 在演示失败之前成功时，结果是显式部分的，并命名持久板小部件。演示失败永远不会回滚不相关的板状态。

## <a id="native-dashboard-reports"></a> 本机仪表板报告

使用报告来固定摘要，该摘要由文本、指标、表格、简单图表和链接组成。直接在 `report` 中提供报表对象：

```json
{
  "title": "Weekly delivery report",
  "name": "weekly-delivery",
  "pin": true,
  "size": "lg",
  "report": {
    "blocks": [
      {
        "type": "metrics",
        "items": [{ "label": "Completed", "value": "24", "detail": "This week" }]
      },
      {
        "type": "table",
        "columns": ["Team", "Completed"],
        "rows": [
          ["Platform", "14"],
          ["Product", "10"]
        ]
      }
    ]
  }
}
```

结果命名固定板小部件。它不创建内联预览、本机设备面板或 Discord 活动。请勿将 `report` 与 `widget_code`、`kind`、`capabilities` 或设备演示结合使用。报告字段不会更改已注册的源类型命名空间。

每个块都有一个必需的 `type`：

| 类型      | 字段和限制                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`    | `text`（1–4,000 个字符），可选 `title`。文本是纯文本。                                                                                          |
| `metrics` | `items`：1–8 个带有 `label`、字符串 `value`（1–80 个字符）和可选 `detail` 的对象。                                                                 |
| `table`   | `columns`：1–8 个标签； `rows`：最多 40 个字符串单元格数组。每行必须与列数匹配；单元格最多有 500 个字符。可选`title`。 |
| `chart`   | `points`：1–40 个带有 `label` 和有限数值 `value` 的对象；可选 `style`（`bar`，默认值或 `line`）和 `title`。                               |
| `links`   | `items`：1–20 个带有 `label`、HTTP（S） `url` 和可选 `detail` 的对象。可选 `title`。                                                                 |

报告包含 1-24 个块和最多 8KB 的编码 JSON。标题有 1-120 个字符，标签有 1-160 个字符，详细信息最多 240 个字符，URL 最多 2,048 个字符。图表值保持在 `-Number.MAX_SAFE_INTEGER` 和 `Number.MAX_SAFE_INTEGER` 之间。未知字段将被拒绝。报告不接受 HTML、CSS、脚本、媒体、可执行操作、网络读取或网关 RPC。链接就是普通的导航。

将相同的 `name` 和 `pin: true` 与新的 `report` 对象重复使用以替换报表的数据。 `dashboard` 工具还可以使用 `action: "widget_put"`、`pluginKind: "session:report"` 和 `props: report` 创建或更新它。要转换现有的 HTML 小部件，请首先使用 `dashboard` 操作 `widget_remove` 将其删除，然后创建报告。同名更新无法更改小部件的内容所有者。

## <a id="show-on-a-device"></a> 在设备上显示

当小部件演示者插件处于活动状态时，`presentation.target` 还提供 `node_panel`。 OpenClaw 创建相同的托管小部件文档，选择连接的支持小部件面板的 Mac，并在该文档中打开其本机面板。工具结果会命名选定的 Mac。

如果没有连接符合条件的 Mac 或节点命令失败，小部件仍会内联显示在聊天中，并且结果会说明如何恢复。与运行 OpenClaw 的 Mac 配对或打开 macOS 应用程序，然后重试。本机面板中显示的小部件仅用于渲染。小部件操作在那里被禁用。

## <a id="audio-and-video"></a> 音视频

HTML 小部件可以直接播放 `<audio>` 或 `<video>` 元素中的 HTTPS 音频和视频 URL。这适用于内联预览、固定仪表板和本机面板。还支持小型嵌入式 `data:` 剪辑和生成的 `blob:` 媒体。包含播放控件，以便用户可以在浏览器阻止自动播放时开始播放。该格式必须受浏览器或本机 Web 视图支持。在 Control UI 聊天和固定仪表板中，本机视频控件支持全屏。

```html
<video controls playsinline preload="auto" src="https://example.com/video.mp4"></video>
```

在聊天中，滚动视频或其他小部件内容可以继续对话。小部件内的可滚动区域会消耗手势，直到到达其边缘，然后将剩余的移动传递给聊天。

该工具的创作默认值为 `preload="auto"`，它允许浏览器在播放前加载第一帧，而无需自动播放。这可以在用户按下“播放”之前下载媒体；当节省带宽比初始帧更重要时，明确选择 `metadata` 或 `none`。浏览器可能会限制预加载。现有保存的小部件保留其创作的预加载属性。

对于选定的封面图像，请提供包含嵌入的 `data:` 图像的 `poster`。小部件不会自动生成缩略图，并且 HTTPS 海报图像被图像策略阻止。如果使用 `preload="none"` 并且没有海报，浏览器可能会显示黑色播放器，直到播放开始。 YouTube 页面 URL 不是直接视频文件，并且 YouTube iframe 在小部件内仍然被阻止。在Control UI中，使用专用的[YouTube卡](/web/control-ui/chat#youtube-videos)代替：

```text
[embed url="https://www.youtube.com/watch?v=VIDEO_ID" title="Trailer" /]
```

将此短代码放在助理回复中，而不是放在 `widget_code` 中。它不需要 `show_widget` 调用。在其他表面上，使用常规 YouTube 链接。

媒体播放有其自己的内容策略。它不授予 `fetch`、WebSocket、远程图像、外部脚本或嵌套框架。 API 连接，包括获取媒体片段的脚本驱动流，仍然需要现有的固定小部件 `capabilities.netOrigins` 声明和授权。不允许使用普通的 HTTP 媒体 URL；使用 HTTPS，包括跨重定向。媒体主播接收客户端的请求；将私人数据和凭据保留在媒体 URL 之外。小部件文档使用无引用策略。

嵌入式媒体计入 10 MiB UTF-8 HTML 限制，包括 base64 编码、周围的 HTML 和 OpenClaw 的包装器。相同的文档限制适用于内联小部件和固定仪表板。对于较大的剪辑，请使用直接的 HTTPS URL 或普通媒体附件而不是 base64。

## <a id="interactive-widgets"></a> 交互式小组件

在 Control UI 中，小部件脚本可以驱动对话。包装器文档定义了全局 `sendPrompt(text)` 函数。调用它会将 `text` 提交到聊天，就像用户已键入并发送消息一样。将其连接到按钮或其他控件以构建交互式流程，例如选择器、测验或向下钻取仪表板。本机应用程序呈现交互式小部件代码，但不公开此聊天提示桥。

```html
<button onclick="sendPrompt('Show the failing tests in detail')">Failing tests</button>
```

每个提示都会在框架边界的两侧进行验证：

- `sendPrompt` 需要小部件内的 [ 瞬时用户激活 ](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation)：它仅在用户单击或按下小部件中的某个键后的几秒钟内起作用，因此将其连接到按钮和其他点击目标 - 在加载时自动调用它不会执行任何操作。该桥将发送端点保留为自身私有，并拒绝不公开用户激活的浏览器中的提示，因此小部件代码无法绕过检查。
- 提示权限仅属于原始widget文档。在小部件代码可以运行或导航框架之前，可信桥向聊天提供其通道端点，聊天仅采用第一个提议，并且通道随着文档的导航而终止。外部允许的嵌入 URL 永远不会被采用。
- 小部件框架必须在聊天记录中可见并保持焦点。这是一个额外的主机观察到的信号，表明用户实际上正在与该小部件交互。
- 文本在去除首尾空白后必须非空，且最多 4,000 个字符。
- 以 `/` 开头的提示会被拒绝，因此小组件代码无法触发诸如 `/approve` 或 `/stop` 之类的聊天命令。
- E 每个小部件文档每滚动分钟最多可以发送 10 个提示。多余的提示会被默默删除。

被接受的提示会作为普通用户消息出现在记录中，并在拥有该小组件的会话中开启正常的代理回合。小组件内部没有反馈通道：被丢弃的提示会静默失败，而小组件也无法读取代理的回复。

## <a id="dashboard-capabilities"></a> 仪表板能力

固定的 HTML 和注册源小部件公开了一台票证绑定主机 API。显式 [ 会话权限模式 ](/gateway/permission-modes) 确定如何批准声明的功能： **完全访问权限** 立即授予它们。 **Workspace** 使用 AI 审阅者并拒绝其不允许的任何内容。 **Guarded** 显示 **Allow** / **Reject** 卡。 **只读** 拒绝它们。如果没有显式会话模式，则应用等效配置的执行批准策略。

- `openclaw.host.controlUiBaseUrl` 在仪表板主机初始化后公开 Control UI 源及其配置的基本路径。它在初始化之前和仪表板外部为 `null`，因此请在链接的单击处理程序中读取它，而不是在小部件脚本首次运行时读取它。
- `openclaw.prompt.send(text)` 需要瞬时用户激活并发布可见的编写器消息。声明并接收 `prompt` 工具授权会跳过额外的每次点击确认。验证、焦点检查和速率限制仍然适用。
- `openclaw.state.emit(payload)` 会添加一条会话通知。负载上限为 8 KiB，并且五秒内相同的客户端发出会被合并。
- `openclaw.data.read(bindingId, params?)` 仅在网关处解析。核心绑定是 `sessions.list`、`usage.status`、`usage.cost`、`cron.list`、`cron.status`、`agents.list`、`health` 以及下面的存储库范围的 `github.actions.runs` 绑定。
- `openclaw.action.run(actionId, params?)` 通过其写入范围的网关方法调用操作员授予的插件仪表板操作动词。
- `openclaw.cron.trigger(jobId)` 仅在授予了精确的 `cron.trigger:<jobId>` 能力时，才会立即运行一个现有任务。

OpenClaw 将用户点击的指向 `http` 或 `https` 目标的链接转发到 Control UI 主机。主机打开一个带有 `noopener` 和 `noreferrer` 的新选项卡。转发包括对 `target="_blank"` 链接的主要单击和对任何链接的中键单击，与 Control UI 中其他地方的链接行为方式相匹配。小部件自己的 `preventDefault` 仍然会取消点击。小部件沙箱从不授予弹出权限，脚本启动的 `window.open` 不起作用。

弹出窗口阻止来自 iframe 沙箱权限。小部件可以定义自己的 `open` 函数，例如对话框助手，而不会与 OpenClaw 全局发生冲突。主机 API 仍保留在 `window.openclaw` 下，其中 `sendPrompt` 保留为旧帮助程序。

网络访问与主机工具是分开的。将准确的 HTTPS 原点放入 `capabilities.netOrigins` 中。一旦会话策略授予它们，只有那些来源进入小部件的 `connect-src`。通配符、凭据、路径、查询字符串和未声明的来源仍然被阻止。仅当文字端口是声明的来源的一部分时才允许使用文字端口。

工具架构描述当前活动的插件读取绑定和操作动词，包括提供的操作参数架构。此发现文本是有限制的：它包括完整的条目以及省略条目时的报告。禁用的插件不会被广告。

### <a id="read-github-actions-runs"></a> 读取 GitHub 操作运行

通过可用的连接代理 GitHub 身份，使用主机绑定而不是直接从小部件代码获取 GitHub。例如，给出 `show_widget` 此输入，并在两个位置替换 `owner/repo`：

```json
{
  "title": "Workflow runs",
  "name": "workflow-runs",
  "pin": true,
  "capabilities": { "tools": ["github.actions.runs:owner/repo"] },
  "widget_code": "<pre id='runs'>Loading…</pre><script>openclaw.data.read('github.actions.runs',{repository:'owner/repo',perPage:20}).then(data=>{document.getElementById('runs').textContent=data.workflow_runs.map(run=>run.display_title+': '+(run.conclusion||run.status)).join('\\n')}).catch(error=>{document.getElementById('runs').textContent=String(error)});</script>"
}
```

批准后，读取将在固定仪表板中运行，而不是内联预览。不需要 `netOrigins` 声明或令牌。存储库名称不区分大小写，并且授权使用小写拼写。对一个存储库的授权无法读取另一个存储库。仅授予 `https://api.github.com` 网络访问权限并不授权此绑定。

直接浏览器获取 `api.github.com` 不会继承代理的登录名并共享 GitHub 的匿名 IP 配额。使用 `fetch` 的现有小部件应将该调用替换为绑定，并将其 GitHub `netOrigins` 声明替换为存储库范围的工具授权。在**代理设置→工具→GitHub账户**中查看有效账户。管理员还可以从 **设置 → 配置文件 → GitHub 连接** 进行访问。

对于可刷新的小部件，请保留最后的成功数据和单独的错误元素。成功读取后清除错误，并将结果容器保留在文档中，以便以后刷新可以恢复。显示 **Refresh** 控件以立即重试。

**Approval 与小部件及其会话受众共享操作元数据，包括来自可供所选代理身份访问的私有存储库的元数据。** 主机选择代理覆盖，然后选择配置的系统身份，然后选择本机 GitHub 身份验证。它从不使用 Control UI 预览凭证或仅用于人类发布的 **My GitHub** 连接。已配置但不可用的身份会阻止请求并提供重新连接指导。它不会匿名重试或落入另一个帐户。

在保存声明此绑定的 HTML 或注册小部件之前，网关会验证所选身份。不可用的身份或已退休的调用者将失败，而无需替换现有小部件、创建挂起的授权或广播更改。在“设置”中重新连接代理的 GitHub 身份并重试。固定不会查询操作或验证存储库权限。这些检查发生在读取时。普通小部件和 MCP App 工具名称不会触发此身份检查。

| 参数             | 契约                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repository`          | 需要 `owner/repo`。                                                                                                                                                                 |
| `workflow`            | 可选正数字工作流程 ID 或工作流程文件名，例如 `ci.yml`。省略列出存储库运行。                                                                            |
| `perPage`             | 1 到 30 之间的整数；默认 20。无分页。                                                                                                                                       |
| `branch`              | 可选分支名称，最多 255 个字符。                                                                                                                                          |
| `status`              | 可选 `completed`、`action_required`、`cancelled`、`failure`、`neutral`、`skipped`、`stale`、`success`、`timed_out`、 `in_progress`、`queued`、`requested`、`waiting` 或 `pending`。 |
| `created`             | 可选 ISO 天 （`2026-09-01`）、比较 （`>=2026-09-01`） 或包含日期范围 （`2026-08-01..2026-09-01`）。                                                                       |
| `excludePullRequests` | 布尔值；默认`true`。 GitHub 省略嵌入的拉取请求对象，而不是拉取请求触发的运行。                                                                                  |

其他字段，包括身份覆盖、URL、标头和方法，都会被拒绝。结果保留 GitHub 的 `{ total_count, workflow_runs }` 字段。每次运行仅包含 `id`、`name`、`display_title`、`head_branch`、`status`、`conclusion`、`html_url`、`run_started_at`、`created_at`、 `updated_at`、`event`、`workflow_id` 和 `run_attempt`。不返回凭据或原始存储库对象。上游响应上限为 1 MiB，预计运行列表上限为 30 个条目。成功的读取会在当前网关、板身份、凭证、存储库和过滤器范围内缓存大约 30 秒。之后，一次读取会返回最后一个成功结果（`stale: true`），同时一个后台请求会刷新它。当此标志存在时，显示刷新指示器。一旦准备好，下一次读取将使用替换结果。首先读取和更改凭证或过滤器仍然等待 GitHub。

速率限制、拒绝访问、身份不可用和上游故障返回经过净化的指导。失败的后台刷新会记录引导并删除缓存的结果，因此下一次读取会重试 GitHub 而不是重用它。重定向被拒绝。对于重命名的存储库，验证其新名称并更新读取和授权。每个调用者在接收数据（包括共享读取和缓存命中）之前都会重新验证其小部件、网关和身份。删除一个小部件不会导致另一授权小部件的共享读取失败。

## <a id="security-and-storage"></a> 安全与存储

小部件文档使用限制性内容安全策略。允许内联样式和脚本以及列出的公共 CDN 脚本、样式表和字体；其他外部资源加载仍然被阻止。注册的内容类型可以从隔离的沙箱源加载其显式公共静态渲染器资产。内联转录小部件无法建立 API 连接。固定仪表板小部件只能获取代理声明和授予的会话策略的确切 HTTPS 来源。

Control UI 的小部件内容 iframe 始终忽略 `allow-same-origin`，即使全局嵌入模式为 `trusted` 也是如此，因此小部件脚本无法读取父应用程序源。启用脚本后，外部代理在专用源上运行并跨帧边界中继消息。在 `strict` 模式下，Control UI 仍通过其经过身份验证的网关连接读取文档，但在没有脚本或脚本交互的情况下呈现文档。本机客户端使用隔离的、非持久的 Web 视图，并阻止远离托管小部件的导航。核心文档主机还为沙箱标记的小部件提供资源策略和响应标头中的 `sandbox allow-scripts`，因此直接渲染仍然在不透明源而不是应用程序源中运行小部件。仅渲染您愿意在该隔离框架中执行的小部件代码。

iframe 也遵循 [`gateway.controlUi.embedSandbox`](/web/control-ui/chat#hosted-embeds)。默认的 `scripts` 层支持交互式小部件，同时保留源隔离。

可接受的 WebRTC data-channel 外发残留已在 [Dashboard Architecture](/web/dashboard-architecture#modeled-residual-webrtc-data-channels) 中记录。

Canvas 每个会话最多保留 32 个 widget（如果没有会话，则按每个 agent 计算）。创建另一个 widget 会移除该作用域内最旧的文档。

## <a id="related"></a> 相关内容

- [Control UI 托管嵌入](/web/control-ui/chat#hosted-embeds)
- [不和谐 Activities](/channels/discord-activities)
- [macOS 小部件面板](/platforms/mac/canvas)
- [网关协议客户端功能](/gateway/protocol/handshake#client-capabilities)
