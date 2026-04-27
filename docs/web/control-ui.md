---
summary: "基于浏览器的网关控制界面（聊天、节点、配置）"
read_when:
  - 你想从浏览器操作网关
  - 你想在无 SSH 隧道情况下访问 Tailnet
title: "控制界面"
---

控制界面是由网关提供的一个小型 **Vite + Lit** 单页应用：

- 默认地址：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它**直接通过同一端口连接网关的 WebSocket**。

## 快速打开（本地）

如果网关运行在同一台电脑上，打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）

如果页面加载失败，请先启动网关：`openclaw gateway`。

认证信息在 WebSocket 握手阶段通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时的 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时的 trusted-proxy 身份头

仪表板设置面板为当前浏览器标签会话保留一个令牌和选定的网关 URL；密码不会持久化。入职流程通常会在首次连接时生成一个网关令牌用于共享密钥认证，但当 `gateway.auth.mode` 为 `"password"` 时密码认证也有效。

## 设备配对（首次连接）

当你从新的浏览器或设备连接控制界面时，网关需要进行**一次性配对批准**——即使你在同一个 Tailnet 且设置了 `gateway.auth.allowTailscale: true`。这是为了防止未授权访问的安全措施。

**你将看到的提示：**"disconnected (1008): pairing required"（断开连接（1008）：需要配对）

**批准设备的方法：**

```bash
# 列出待处理请求
openclaw devices list

# 通过请求 ID 批准设备
openclaw devices approve <requestId>
```

如果浏览器使用更改后的认证详细信息（角色/ 作用域/ 公钥）重试配对，之前的待处理请求将被取代，并创建一个新的 `requestId`。批准前请重新运行 `openclaw devices list`。

如果浏览器已经配对，而你将其从只读访问更改为写入/管理员访问，这将被视为一次批准升级，而不是静默重新连接。OpenClaw 会保持旧的批准有效，阻止更宽权限的重新连接，并要求你显式批准新的作用域集合。

一旦批准，该设备将被记住，除非你使用 `openclaw devices revoke --device <id> --role <role>` 将其撤销，否则无需重新批准。有关令牌轮换和撤销，请参阅 [Devices CLI](/cli/devices)。

**注意事项：**

- 直接本地环回浏览器连接（`127.0.0.1` / `localhost`）会自动批准。
- Tailnet 和 LAN 浏览器连接仍然需要明确批准，即使它们源自同一台机器。
- 每个浏览器配置文件都会生成唯一的设备 ID，因此切换浏览器或清除浏览器数据将需要重新配对。

## 个人身份（浏览器本地）

控制界面支持为每个浏览器保存一个个人身份（显示名称和头像），并将其附加到外发消息中用于共享会话中的归属。它存储在浏览器本地，作用域仅限当前浏览器配置文件，不会同步到其他设备，也不会在服务端持久化，超出你实际发送消息的常规转录作者元数据范围。清除网站数据或切换浏览器会将其重置为空。

## 运行时配置端点

控制界面从 `/__openclaw/control-ui-config.json` 获取运行时设置。该端点与 HTTP 其余部分使用相同的网关认证：未认证的浏览器无法获取它，而成功获取需要已有效的网关令牌/密码、Tailscale Serve 身份或 trusted-proxy 身份之一。

## 语言支持

控制界面可以在首次加载时根据浏览器区域设置进行本地化。若要稍后覆盖，打开 **概览 -> 网关访问 -> 语言**。区域选择器位于网关访问卡片中，不在外观下。

- 支持的区域设置：`en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`, `th`
- 非英语翻译会在浏览器中按需加载。
- 所选区域设置会保存在浏览器存储中，并在未来访问时复用。
- 缺失的翻译键会回退到英语。

## 当前功能

<AccordionGroup>
  <Accordion title="发送与历史语义">
    - `chat.send` 是**非阻塞**的：它会立即以 `{ runId, status: "started" }` 确认，响应则通过 `chat` 事件流式返回。
    - 聊天上传接受图片以及非视频文件。图片保留原生图片路径；其他文件会作为受管媒体存储，并在历史中显示为附件链接。
    - 使用相同的 `idempotencyKey` 重新发送时，在运行期间返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
    - `chat.history` 响应的大小受到限制，以保证 UI 安全。当转录条目过大时，网关可能会截断较长的文本字段，省略较重的元数据块，并将超大消息替换为占位符（`[chat.history omitted: message too large]`）。
    - 助手/生成的图片会作为受管媒体引用持久化，并通过经过认证的网关媒体 URL 重新提供，因此重新加载不依赖于原始 base64 图片负载继续保留在聊天历史响应中。
    - `chat.history` 还会从可见的助手文本中剥离仅用于显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块），以及泄漏的 ASCII/全角模型控制令牌，并省略其整个可见文本仅为精确静默令牌 `NO_REPLY` / `no_reply` 的助手条目。
    - 在活动发送和最终历史刷新期间，如果 `chat.history` 短暂返回较旧的快照，聊天视图会保留本地乐观的用户/助手消息可见；一旦网关历史追上，这些本地消息就会被规范化转录替换。
    - `chat.inject` 会向会话转录追加一条助手备注，并广播一个 `chat` 事件用于仅 UI 更新（不触发代理运行，也不进行频道投递）。
    - 聊天标题中的模型和思考选择器会通过 `sessions.patch` 立即修补活动会话；它们是持久的会话覆盖，而不是仅限一次回复的发送选项。
    - 当新的网关会话使用情况报告显示上下文压力较高时，聊天编写区域会显示上下文提示，并在建议的压缩级别下显示一个压缩按钮，用于执行正常的会话压缩路径。过时的令牌快照会被隐藏，直到网关再次报告新的使用情况。
  </Accordion>
  <Accordion title="Talk 模式（浏览器 WebRTC）">
    Talk 模式使用一个已注册的实时语音提供商，支持浏览器 WebRTC 会话。使用 `talk.provider: "openai"` 以及 `talk.providers.openai.apiKey` 配置 OpenAI，或复用 Voice Call 实时提供商配置。浏览器永远不会收到标准的 OpenAI API 密钥；它只会收到临时的 Realtime 客户端密钥。Google Live 实时语音支持后端 Voice Call 和 Google Meet 桥接，但尚不支持此浏览器 WebRTC 路径。Realtime 会话提示由网关组装；`talk.realtime.session` 不接受调用方提供的指令覆盖。

定时任务面板说明：

- 对于独立任务，默认采用公告摘要的交付方式。如果你只想进行内部执行，可以切换为无公告。
- 选择公告时，会显示频道/目标字段。
- Webhook 模式使用 `delivery.mode = "webhook"`，且 `delivery.to` 设为有效 HTTP(S) Webhook URL。
- 主会话任务允许使用 webhook 和无公告两种交付模式。
- 高级编辑功能包含执行后删除、清除代理覆盖、cron 精确/错峰选项，代理模型/思考覆盖，以及尽力而为交付开关。
- 表单验证为内联，带字段级错误；无效值时保存按钮将被禁用直到纠正。
- 设置 `cron.webhookToken` 可发送专用的 Bearer 令牌，若省略则无认证头发送 webhook。
- 过时回退：存储的遗留任务 `notify: true` 仍可使用 `cron.webhook`，直到迁移完成。

## 聊天行为

- `chat.send` 是**非阻塞**的：它会立即以 `{ runId, status: "started" }` 确认，响应则通过 `chat` 事件流式返回。
- 使用相同的 `idempotencyKey` 重新发送时，在运行期间返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
- `chat.history` 响应的大小受到限制，以保证 UI 安全。当转录条目过大时，网关可能会截断较长的文本字段，省略较重的元数据块，并将超大消息替换为占位符（`[chat.history omitted: message too large]`）。
- 助手/生成的图片会作为受管媒体引用持久化，并通过经过认证的网关媒体 URL 重新提供，因此重新加载不依赖于原始 base64 图片负载继续保留在聊天历史响应中。
- `chat.history` 还会从可见的助手文本中剥离仅用于显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块），以及泄漏的 ASCII/全角模型控制令牌，并省略其整个可见文本仅为精确静默令牌 `NO_REPLY` / `no_reply` 的助手条目。
- `chat.inject` 会向会话转录追加一条助手备注，并广播一个 `chat` 事件用于仅 UI 更新（不触发代理运行，也不进行频道投递）。
- 聊天标题中的模型和思考选择器会通过 `sessions.patch` 立即修补活动会话；它们是持久的会话覆盖，而不是仅限一次回复的发送选项。
- 当新的网关会话使用情况报告显示上下文压力较高时，聊天编写区域会显示上下文提示，并在建议的压缩级别下显示一个压缩按钮，用于执行正常的会话压缩路径。过时的令牌快照会被隐藏，直到网关再次报告新的使用情况。
- Talk 模式使用一个已注册的实时语音提供商，支持浏览器 WebRTC 会话。使用 `talk.provider: "openai"` 以及 `talk.providers.openai.apiKey` 配置 OpenAI，或复用 Voice Call 实时提供商配置。浏览器永远不会收到标准的 OpenAI API 密钥；它只会收到临时的 Realtime 客户端密钥。Google Live 实时语音支持后端 Voice Call 和 Google Meet 桥接，但尚不支持此浏览器 WebRTC 路径。Realtime 会话提示由网关组装；`talk.realtime.session` 不接受调用方提供的指令覆盖。
- 在聊天编写器中，Talk 控件是麦克风听写按钮旁边的波形按钮。当 Talk 开始时，编写器状态行会显示 `Connecting Talk...`，然后在音频连接时显示 `Talk live`，或者在实时工具调用通过 `chat.send` 咨询已配置的更大模型时显示 `Asking OpenClaw...`。
- 停止：
  - 点击 **Stop**（调用 `chat.abort`）
  - 当运行处于活动状态时，正常的后续消息会排队。对排队消息点击 **Steer** 可将该后续消息注入正在运行的轮次。
  - 输入 `/stop`（或单独的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）可进行带外中止
  - `chat.abort` 支持使用 `{ sessionKey }`（不含 `runId`）来中止该会话的所有活动运行
- 中止后的部分保留：
  - 当运行被中止时，部分助手文本仍可能显示在 UI 中
  - 如果存在缓冲输出，网关会将已中止的部分助手文本持久化到转录历史中
  - 持久化条目包含中止元数据，因此转录消费者可以将中止部分与正常完成输出区分开来

## 托管嵌入

助手消息可以使用 `[embed ...]` 短代码内联渲染托管的 Web 内容。iframe 沙箱策略由 `gateway.controlUi.embedSandbox` 控制：

- `strict`：禁用托管嵌入内的脚本执行
- `scripts`：允许交互式嵌入同时保持源隔离；这是默认值，通常足以用于自包含的浏览器游戏/小部件
- `trusted`：在 `allow-scripts` 之上添加 `allow-same-origin`，用于故意需要更强权限的同一站点文档

示例：

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

仅当嵌入文档真正需要同源行为时才使用 `trusted`。对于大多数代理生成的游戏和交互式画布，`scripts` 是更安全的选择。

绝对外部 `http(s)` 嵌入 URL 默认保持阻止。如果你故意想让 `[embed url="https://..."]` 加载第三方页面，设置 `gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 访问（推荐）

### 集成 Tailscale Serve（首选）

保持网关监听 loopback，由 Tailscale Serve 代理并提供 HTTPS：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，控制界面/WebSocket Serve 请求可以通过 Tailscale 身份头（`tailscale-user-login`）进行认证。OpenClaw 通过 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与头匹配来验证身份，仅当请求带有 Tailscale 的 `x-forwarded-*` 头击中环回时才接受这些。如果你希望即使对于 Serve 流量也需要明确的共享密钥凭证，设置 `gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或 `"password"`。
对于该异步 Serve 身份路径，同一客户端 IP 和认证范围的失败认证尝试在速率限制写入之前会被串行化。因此，来自同一浏览器的并发不良重试可能在第二个请求上显示 `retry later`，而不是两个简单的不匹配并行竞争。
无令牌 Serve 认证假设网关主机是受信任的。如果不可信的本地代码可能在该主机上运行，则需要令牌/密码认证。

### 绑定 Tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/`（或配置的 `gateway.controlUi.basePath`）

将匹配的共享密钥粘贴到 UI 设置中（作为 `connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

## HTTP 非安全访问

如果你通过明文 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表盘，浏览器将处于**非安全上下文**并阻止 WebCrypto。默认情况下，
OpenClaw **阻止无设备身份的控制界面连接**。

记录的例外：

- 带有 `gateway.controlUi.allowInsecureAuth=true` 的仅本地主机不安全 HTTP 兼容性
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功的操作员控制界面认证
- 紧急 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**推荐修复：** 使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（在网关主机上）

**非安全认证切换示例行为：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` 是一个本地兼容性开关：

- 它允许本地 localhost 控制界面会话在非安全 HTTP 环境下无设备身份继续运行。
- 它不会绕过配对检查。
- 它不会放宽远程（非 localhost）设备身份要求。

**仅紧急用：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 会禁用控制界面设备身份检查，是极严重的安全降级，紧急使用后应尽快恢复。

Trusted-proxy 注意：

- 成功的 trusted-proxy 认证可以接纳**操作员**控制界面会话而无需设备身份
- 这**不**扩展到节点角色控制界面会话
- 同一主机环回反向代理仍然不满足 trusted-proxy 认证；参见 [受信任代理认证](/gateway/trusted-proxy-auth)

参见 [Tailscale](/gateway/tailscale) 获取 HTTPS 设置指南。

## 内容安全策略

控制界面采用严格的 `img-src` 策略：只允许**同源**资源和 `data:` URL。远程 `http(s)` 和协议相对的图像 URL 会被浏览器拒绝，并且不会发起网络请求。

这在实践中的含义是：

- 通过相对路径提供的头像和图片（例如 `/avatars/<id>`）仍然可以正常渲染。
- 内联 `data:image/...` URL 仍然可以正常渲染（对协议内负载很有用）。
- 通道元数据发出的远程头像 URL 会在控制界面的头像辅助函数中被剥离，并替换为内置徽标/徽章，因此受损或恶意通道无法强制操作员浏览器发起任意远程图片请求。

你无需为此行为做任何更改——它始终启用且不可配置。

## 头像路由认证

当配置了网关认证时，控制界面的头像端点要求与 API 其余部分相同的网关令牌：

- `GET /avatar/<agentId>` 仅向已认证调用者返回头像图像。`GET /avatar/<agentId>?meta=1` 也在相同规则下返回头像元数据。
- 对任一路由的未认证请求都会被拒绝（与同级的 assistant-media 路由一致）。这可以防止头像路由在其他受保护的主机上泄露代理身份。
- 控制界面在获取头像时会将网关令牌作为 bearer 头转发，并使用已认证的 blob URL，因此图像仍可在仪表板中正常渲染。

如果你禁用了网关认证（不建议在共享主机上这样做），头像路由也会变为未认证，与网关其余部分保持一致。

## 构建 UI

网关静态托管 `dist/control-ui` 下的文件。构建方式：

```bash
pnpm ui:build
```

可选绝对基路径（用于固定资源 URL）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

本地开发（使用独立开发服务器）：

```bash
pnpm ui:dev
```

然后将 UI 指向你的网关 WS 地址（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程网关

控制界面是静态文件，WebSocket 目标可配置，可与 HTTP 源不同。方便你在本地运行 Vite 开发服务器但网关部署在别处。

1. 启动 UI 开发服务器：`pnpm ui:dev`
2. 访问如下 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选一次性认证（如需）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

注意：

- `gatewayUrl` 在加载后存储在 localStorage 中，并从 URL 中移除。
- `token` 应尽可能通过 URL 片段（`#token=...`）传递。片段不会发送到服务器，这避免了请求日志和 Referer 泄露。遗留的 `?token=` 查询参数为了兼容性仍会导入一次，但仅作为后备，并且在引导后立即被剥离。
- `password` 仅保存在内存中。
- 设置 `gatewayUrl` 后，UI 不会回退到配置或环境凭据。必须显式提供 `token`（或 `password`）。缺少显式凭据将导致错误。
- 当网关位于 TLS 后面（Tailscale Serve、HTTPS 代理等）时使用 `wss://`。
- `gatewayUrl` 仅在顶层窗口中接受（不嵌入），以防止点击劫持。
- 非环回控制界面部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整来源）。这包括远程开发设置。
- 除非用于严格控制的本地测试，否则不要使用 `gateway.controlUi.allowedOrigins: ["*"]`。这意味着允许任何浏览器来源，而不是“匹配我正在使用的任何主机”。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host-header 来源回退模式，但这是一种危险的安全模式。

示例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

远程访问设置详情：[远程访问](/gateway/remote)。

## 相关内容

- [仪表盘](/web/dashboard) — 网关仪表盘
- [网页聊天](/web/webchat) — 基于浏览器的聊天界面
- [终端界面](/web/tui) — 终端用户界面
- [健康检查](/gateway/health) — 网关健康监控
