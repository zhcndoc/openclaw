我会严格保留 Markdown 结构，只翻译可见文本内容，并保持代码/标签不变。先快速核对有没有额外仓库说明，然后直接翻译整段内容。---
summary: "Gateway 的基于浏览器的控制 UI（聊天、活动、节点、配置）"
read_when:
  - 你想通过浏览器操作 Gateway
  - 你想在不使用 SSH 隧道的情况下访问 Tailnet
title: "控制 UI"
sidebarTitle: "控制 UI"
---

Control UI 是一个由 Gateway 提供的、基于 **Vite + Lit** 的单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口上**直接**连接到 Gateway WebSocket。

## 本地快速打开

如果 Gateway 运行在同一台电脑上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）

如果页面无法加载，请先启动 Gateway：`openclaw gateway`。

认证会在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时使用 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时使用受信任代理身份头

仪表盘设置面板会为当前浏览器标签页会话和所选 gateway URL 保留一个 token；密码不会持久化。首次连接时，引导流程通常会为共享密钥认证生成一个 gateway token，但当 `gateway.auth.mode` 为 `"password"` 时，密码认证也可正常工作。

## 设备配对（首次连接）

当你从新的浏览器或设备连接到 Control UI 时，Gateway 通常会要求进行一次**一次性配对审批**。这是为了防止未经授权的访问而采取的安全措施。

**你会看到：** "disconnected (1008): pairing required"

<Steps>
  <Step title="列出待处理请求">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="按请求 ID 批准">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

如果浏览器在重试配对时 auth 细节发生变化（角色/作用域/公钥），之前的待处理请求会被新请求取代，并创建一个新的 `requestId`。请在批准前重新运行 `openclaw devices list`。

如果浏览器已经配对，但你将其从只读访问改为写入/管理员访问，这会被视为一次审批升级，而不是静默重连。OpenClaw 会保持旧审批有效，阻止更宽权限的重连，并要求你明确批准新的作用域集合。

一旦批准，该设备就会被记住，除非你使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不会再次要求重新批准。有关令牌轮换和撤销，请参见 [Devices CLI](/cli/devices)。

通过 `openclaw_gateway` 适配器连接的 Paperclip agents 使用相同的首次运行审批流程。在初始连接尝试之后，运行 `openclaw devices approve --latest` 以预览待处理请求，然后重新运行打印出的 `openclaw devices approve <requestId>` 命令进行批准。对于远程 gateway，请传入显式的 `--url` 和 `--token` 值。为了让审批在重启之间保持稳定，请在 Paperclip 中配置持久的 `adapterConfig.devicePrivateKeyPem`，而不是让它每次运行时都生成一个新的临时设备身份。

<Note>
- 直接的本地回环浏览器连接（`127.0.0.1` / `localhost`）会被自动批准。
- 当 `gateway.auth.allowTailscale: true`、Tailscale 身份验证通过，并且浏览器展示其设备身份时，Tailscale Serve 可以跳过 Control UI 操作会话的配对往返流程。
- 直接的 Tailnet 绑定、LAN 浏览器连接，以及没有设备身份的浏览器配置文件仍然需要显式批准。
- 每个浏览器配置文件都会生成一个唯一的设备 ID，因此切换浏览器或清除浏览器数据都需要重新配对。

</Note>

## 个人身份（浏览器本地）

Control UI 支持按浏览器保存的个人身份（显示名称和头像），用于在共享会话中将其附加到发出的消息上以便归属。它存储在浏览器中，作用域仅限于当前浏览器配置文件，不会同步到其他设备，也不会在服务端持久化，除了你实际发送消息时的正常对话作者元数据之外。清除站点数据或切换浏览器会将其重置为空。

同样的浏览器本地模式也适用于助手头像覆盖。上传的助手头像仅在本地浏览器上覆盖 Gateway 解析出的身份，不会通过 `config.patch` 往返回。对于直接写入该字段的非 UI 客户端（例如脚本化 gateway 或自定义仪表盘），共享的 `ui.assistant.avatar` 配置字段仍然可用。

## 运行时配置端点

Control UI 会从 `/control-ui-config.json` 获取其运行时设置，该路径会根据 gateway 的 Control UI base path 进行相对解析（例如当 UI 通过 `/__openclaw__/` 提供时，对应为 `/__openclaw__/control-ui-config.json`）。该端点与 HTTP 表面的其他部分一样受 gateway 认证保护：未认证的浏览器无法获取它，而成功获取需要已经有效的 gateway token/password、Tailscale Serve 身份，或 trusted-proxy 身份。

## 语言支持

Control UI 在首次加载时可以根据你的浏览器区域设置自动本地化。要在之后覆盖它，请打开 **概览 -> Gateway Access -> 语言**。语言选择器位于 Gateway Access 卡片中，而不是 Appearance 下。

- 支持的区域设置：`en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `ar`, `it`, `tr`, `uk`, `id`, `pl`, `th`, `vi`, `nl`, `fa`
- 非英语翻译会在浏览器中按需加载。
- 选定的区域设置会保存在浏览器存储中，并在以后访问时复用。
- 缺失的翻译键会回退到英语。

Docs 翻译会为相同的非英语区域设置生成，但 docs 站点内置的 Mintlify 语言选择器仅限于 Mintlify 接受的区域设置代码。泰语（`th`）和波斯语（`fa`）文档仍会在发布仓库中生成；在 Mintlify 支持这些代码之前，它们可能不会出现在该选择器中。

## Appearance 主题

外观面板保留了内置的 Claw、Knot 和 Dash 主题，以及一个浏览器本地的 tweakcn 导入槽位。要导入主题，请打开 [tweakcn editor](https://tweakcn.com/editor/theme)，选择或创建一个主题，点击 **Share**，然后将复制的主题链接粘贴到 Appearance 中。导入器也接受 `https://tweakcn.com/r/themes/<id>` 注册表 URL、类似 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 的编辑器 URL、相对路径 `/themes/<id>`、原始主题 ID，以及默认主题名称，例如 `amethyst-haze`。

Appearance 还包括一个浏览器本地的文本大小设置。该设置会与其他 Control UI 偏好一起存储，适用于聊天文本、撰写器文本、工具卡片和聊天侧边栏，并会将文本输入保持在至少 16px，以避免移动端 Safari 在聚焦时自动缩放。

导入的主题仅存储在当前浏览器配置文件中。它们不会写入 gateway 配置，也不会在设备之间同步。替换导入的主题会更新这一个本地槽位；如果所选的是导入主题，清除它会将当前主题切回 Claw。

## 它目前能做什么

<AccordionGroup>
  <Accordion title="聊天和通话">
    - 通过 Gateway WS 与模型聊天（`chat.history`, `chat.send`, `chat.abort`, `chat.inject`）。
    - 聊天历史刷新会请求一个有界的最近窗口，并对每条消息设置文本上限，这样大型会话不会在聊天变得可用之前强迫浏览器渲染完整的转录负载。
    - 通过浏览器实时会话进行对话。OpenAI 使用直接 WebRTC，Google Live 使用在 WebSocket 上的受限一次性浏览器令牌，而仅后端实时语音插件使用 Gateway 中继传输。由客户端拥有的提供方会话从 `talk.client.create` 开始；Gateway 中继会话从 `talk.session.create` 开始。中继会将提供方凭据保留在 Gateway 上，同时浏览器通过 `talk.session.appendAudio` 传输麦克风 PCM，将 `openclaw_agent_consult` 提供方工具调用通过 `talk.client.toolCall` 转发给 Gateway 策略和更大的已配置 OpenClaw 模型，并通过 `talk.client.steer` 或 `talk.session.steer` 路由活动运行的语音引导。
    - 在 Chat 中流式显示工具调用 + 实时工具输出卡片（agent 事件）。
    - Activity 标签页会基于现有的 `session.tool` / 工具事件传递，显示带有浏览器本地、先脱敏摘要的实时工具活动。

  </Accordion>
  <Accordion title="通道、实例、会话、梦境">
    - 通道：内置通道以及捆绑/外部插件通道的状态、QR 登录和按通道配置（`channels.status`、`web.login.*`、`config.patch`）。
    - 通道探测刷新会在缓慢的提供方检查完成时保持前一个快照可见，并且当探测或审计超过其 UI 预算时会标记为部分快照。
    - 实例：在线列表 + 刷新（`system-presence`）。
    - 会话：默认列出已配置代理会话，从过期的未配置代理会话键回退，并应用每个会话的模型/思考/快速/详细/跟踪/推理覆盖（`sessions.list`、`sessions.patch`）。
    - 梦境：做梦状态、启用/禁用开关，以及 Dream Diary 读取器（`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`）。

  </Accordion>
  <Accordion title="Cron、技能、节点、exec 审批">
    - Cron 作业：列出/添加/编辑/运行/启用/禁用 + 运行历史（`cron.*`）。
    - 技能：状态、启用/禁用、安装、API 密钥更新（`skills.*`）。
    - 节点：列表 + 能力（`node.list`）。
    - Exec 审批：编辑 gateway 或节点允许列表 + `exec host=gateway/node` 的询问策略（`exec.approvals.*`）。

  </Accordion>
  <Accordion title="配置">
    - 查看/编辑 `~/.openclaw/openclaw.json`（`config.get`, `config.set`）。
    - MCP 为已配置服务器、启用状态、OAuth/过滤/并行摘要、常见操作员命令以及作用域受限的 `mcp` 配置编辑器提供了专用设置页。
    - 带验证的应用 + 重启（`config.apply`），并唤醒上一个活动会话。
    - 写入包含 base-hash 防护，以避免覆盖并发编辑。
    - 写入（`config.set`/`config.apply`/`config.patch`）会对提交配置负载中的引用进行预检的 Active SecretRef 解析；未解析的活动提交引用会在写入前被拒绝。
    - 表单保存会丢弃无法从已保存配置中恢复的过期脱敏占位符，同时保留仍能映射到已保存密钥的脱敏值。
    - Schema + 表单渲染（`config.schema` / `config.schema.lookup`，包括字段 `title` / `description`、匹配的 UI 提示、直接子摘要、嵌套对象/通配符/数组/组合节点上的文档元数据，以及可用时的插件 + 通道 schema）；只有当快照具备安全的原始往返能力时，Raw JSON 编辑器才可用。
    - 如果某个快照无法安全地进行原始文本往返，Control UI 会强制使用 Form 模式，并为该快照禁用 Raw 模式。
    - Raw JSON 编辑器中的“恢复为已保存”会保留原始编写的形状（格式、注释、`$include` 布局），而不是重新渲染成扁平化快照，因此当快照可以安全往返时，外部编辑在重置后仍能保留。
    - 结构化的 SecretRef 对象值会在表单文本输入中以只读方式呈现，以防止意外的对象到字符串损坏。

  </Accordion>
  <Accordion title="调试、日志、更新">
    - 调试：状态/健康状态/模型快照 + 事件日志 + 手动 RPC 调用（`status`、`health`、`models.list`）。
    - 事件日志包含 Control UI 刷新/RPC 耗时、缓慢的聊天/配置渲染耗时，以及当浏览器暴露这些 PerformanceObserver 条目类型时，针对长动画帧或长任务的浏览器响应性条目。
    - 日志：gateway 文件日志的实时尾随，支持过滤/导出（`logs.tail`）。
    - 更新：运行包/git 更新 + 重启（`update.run`），并附带重启报告，然后在重连后轮询 `update.status` 以验证正在运行的 gateway 版本。

  </Accordion>
  <Accordion title="Cron jobs panel notes">
    - 对于独立作业，交付方式默认是 announce summary。若你只想内部运行，可以切换为 none。
    - 选择 announce 时会显示通道/目标字段。
    - Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
    - 对于主会话作业，可使用 webhook 和 none 交付模式。
    - 高级编辑控件包括 delete-after-run、clear agent override、cron exact/stagger 选项、agent model/thinking 覆盖，以及 best-effort delivery 切换。
    - 表单验证是内联的，并带有字段级错误；无效值会禁用保存按钮，直到修正为止。
    - 设置 `cron.webhookToken` 可发送专用 bearer token；如果省略，则 webhook 将在没有 auth header 的情况下发送。
    - 已弃用的回退方式：运行 `openclaw doctor --fix`，将存储的旧版作业中 `notify: true` 的记录从 `cron.webhook` 迁移到显式的每作业 webhook 或完成交付。

  </Accordion>
</AccordionGroup>

## MCP 页面

专用的 MCP 页面是面向 OpenClaw 管理的 `mcp.servers` 下 MCP 服务器的操作员视图。它不会自行启动 MCP 传输；请用它来检查和编辑已保存配置，然后在需要实时服务器证明时使用 `openclaw mcp doctor --probe`。

典型工作流：

1. 从侧边栏打开 **MCP**。
2. 检查摘要卡片中的总数、已启用、OAuth 和已过滤服务器数量。
3. 查看每个服务器行的传输、启用、认证、过滤器、超时和命令提示。
4. 当某个服务器需要保持配置但不应参与运行时发现时，切换其启用状态。
5. 编辑作用域受限的 `mcp` 配置部分，以设置服务器定义、请求头、TLS/mTLS 路径、OAuth 元数据、工具过滤器和 Codex 投影元数据。
6. 保存配置写入时使用 **Save**，当运行中的 Gateway 应应用已更改配置时使用 **Save & Publish**。
7. 当编辑后的进程需要静态诊断、实时证明或缓存运行时清理时，在终端运行 `openclaw mcp status --verbose`、`openclaw mcp doctor --probe` 或 `openclaw mcp reload`。

页面会在渲染前对包含凭据的类 URL 值进行脱敏，并在命令片段中为服务器名称加引号，以确保复制后的命令在包含空格或 shell 元字符时仍可正常工作。完整的 CLI 和配置参考位于 [MCP](/cli/mcp)。

## Activity 标签页

Activity 标签页是一个临时的浏览器本地观察器，用于实时工具活动。它源自驱动 Chat 工具卡片的同一个 Gateway `session.tool` / 工具事件流；它不会额外引入新的 Gateway 事件族、端点、持久化活动存储、指标馈送或外部观察器流。

Activity 条目只保留已脱敏摘要和经过脱敏、截断的输出预览。工具参数值不会存储在 Activity 状态中；UI 会显示这些参数被隐藏，并且只记录参数字段数量。内存中的列表跟随当前浏览器标签页，在 Control UI 内导航时会保留，并在页面重新加载、会话切换或点击 **Clear** 时重置。

## 聊天行为

<AccordionGroup>
  <Accordion title="发送和历史语义">
    - `chat.send` 是**非阻塞**的：它会立即以 `{ runId, status: "started" }` 确认，响应则通过 `chat` 事件流返回。受信任的 Control UI 客户端还可能收到可选的 ACK 时序元数据，用于本地诊断。
    - 聊天上传支持图片以及非视频文件。图片保留原生图片路径；其他文件会作为受管媒体存储，并在历史记录中显示为附件链接。
    - 使用相同的 `idempotencyKey` 重新发送时，在运行中会返回 `{ status: "in_flight" }`，完成后则返回 `{ status: "ok" }`。
    - `chat.history` 响应在 UI 安全性上有大小限制。当转录条目过大时，Gateway 可能会截断较长的文本字段、省略较重的元数据块，并将超大消息替换为占位符（`[chat.history omitted: message too large]`）。
    - 当可见的助手消息在 `chat.history` 中被截断时，侧边读取器可以通过 `chat.message.get` 按需获取完整的显示规范化转录条目；必要时通过 `sessionKey`、活动的 `agentId` 和转录 `messageId`。如果 Gateway 仍无法返回更多内容，读取器会显示明确的不可用状态，而不是静默重复截断后的预览。
    - 助手/生成的图片会作为受管媒体引用持久化，并通过已认证的 Gateway 媒体 URL 返回，因此重新加载不依赖原始 base64 图片负载仍留在聊天历史响应中。
    - 在渲染 `chat.history` 时，Control UI 会从可见的助手文本中去除仅用于显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及截断的工具调用块），以及泄漏的 ASCII/全角模型控制 token，并省略其全部可见文本仅为精确静默 token `NO_REPLY` / `no_reply` 或心跳确认 token `HEARTBEAT_OK` 的助手条目。
    - 在活动发送和最终历史刷新期间，如果 `chat.history` 短暂返回较旧的快照，聊天视图会保留本地乐观的用户/助手消息可见；一旦 Gateway 历史追上，规范转录会替换这些本地消息。
    - 实时 `chat` 事件代表交付状态，而 `chat.history` 则从持久化的会话转录重建。在工具最终事件之后，Control UI 会重新加载历史，只合并一小段乐观尾部；转录边界记录在 [WebChat](/web/webchat) 中。
    - `chat.inject` 会向会话转录追加一条助手注释，并广播一个 `chat` 事件用于仅 UI 的更新（不触发 agent 运行，也不进行通道交付）。
    - 聊天头部会在会话选择器之前显示 agent 过滤器，会话选择器的范围由所选 agent 限定。切换 agent 时只显示绑定到该 agent 的会话；如果该 agent 尚无已保存的仪表盘会话，则回退到该 agent 的主会话。
    - 在桌面宽度下，聊天控件会保持在一行紧凑布局中，并在向下滚动转录时折叠；向上滚动、回到顶部或到达底部时会恢复控件。
    - 连续重复的纯文本消息会渲染为一个带计数徽标的气泡。包含图片、附件、工具输出或画布预览的消息不会折叠。
    - 聊天头部的模型和思考选择器会通过 `sessions.patch` 立即修补活动会话；它们是持久的会话覆盖项，而不是仅限一次发送的选项。
    - 如果你在同一会话的模型选择器变更仍在保存时发送消息，撰写器会先等待该会话补丁完成，再调用 `chat.send`，以确保发送使用所选模型。
    - 在 Control UI 中输入 `/new` 会创建并切换到与 New Chat 相同的新仪表盘会话，除非配置了 `session.dmScope: "main"` 且当前父会话是 agent 的主会话；在这种情况下，它会就地重置主会话。输入 `/reset` 则会保留 Gateway 对当前会话的显式就地重置。
    - 聊天模型选择器请求的是 Gateway 配置的模型视图。如果存在 `agents.defaults.models`，该允许列表会驱动选择器，包括使提供方作用域目录保持动态的 `provider/*` 条目。否则，选择器会显示明确的 `models.providers.*.models` 条目以及具有可用认证的提供方。完整目录仍可通过调试 `models.list` RPC 并使用 `view: "all"` 获取。
    - 当新的 Gateway 会话使用量报告包含当前上下文 token 时，聊天撰写器区域会显示一个紧凑的上下文用量指示器。在上下文压力较高时，它会切换为警告样式；在建议压缩级别时，会显示一个可运行常规会话压缩路径的紧凑按钮。过期的 token 快照会被隐藏，直到 Gateway 再次报告新的使用量。

  </Accordion>
  <Accordion title="通话模式（浏览器实时）">
    通话模式使用已注册的实时语音提供方。通过 `talk.realtime.provider: "openai"` 配合 `openai` API-key auth profile、`talk.realtime.providers.openai.apiKey` 或 `OPENAI_API_KEY` 来配置 OpenAI；OpenAI OAuth profiles 不会配置 Realtime 语音。通过 `talk.realtime.provider: "google"` 配合 `talk.realtime.providers.google.apiKey` 来配置 Google。浏览器永远不会收到标准的提供方 API key。OpenAI 会收到一个用于 WebRTC 的短暂 Realtime client secret。Google Live 会收到一个仅使用一次的受限 Live API auth token，用于浏览器 WebSocket 会话，指令和工具声明会由 Gateway 锁定到该 token 中。仅暴露后端 realtime bridge 的提供方会通过 Gateway relay transport 运行，因此凭据和厂商 socket 都保留在服务端，而浏览器音频通过已认证的 Gateway RPC 传输。Realtime 会话提示由 Gateway 组装；`talk.client.create` 不接受调用方提供的指令覆盖。

    Chat 撰写器在 Talk 开始/停止按钮旁边包含一个 Talk 选项按钮。这些选项适用于下一次 Talk 会话，并且可以覆盖提供方、传输、模型、语音、推理力度、VAD 阈值、静默时长和前缀填充。当某个选项为空时，Gateway 会尽可能使用已配置的默认值，或者使用提供方默认值。选择 Gateway relay 会强制使用后端中继路径；选择 WebRTC 会保持会话归客户端所有，如果提供方无法创建浏览器会话，则会失败，而不是静默回退到 relay。

    在 Chat 撰写器中，Talk 控件是麦克风听写按钮旁边的波浪按钮。当 Talk 开始时，撰写器状态行会显示 `Connecting Talk...`，然后在音频连接后显示 `Talk live`，或者在实时工具调用通过 `talk.client.toolCall` 询问已配置的更大模型时显示 `Asking OpenClaw...`。

    维护者实时烟雾测试：`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 会验证 OpenAI 后端 WebSocket 桥接、OpenAI 浏览器 WebRTC SDP 交换、Google Live 受限令牌浏览器 WebSocket 设置，以及带有伪麦克风媒体的 Gateway relay 浏览器适配器。该命令只打印提供方状态，不会记录密钥。

  </Accordion>
  <Accordion title="停止与中止">
    - 点击 **Stop**（调用 `chat.abort`）。
    - 当运行处于活动状态时，正常的后续消息会排队。点击排队消息上的 **Steer** 可将该后续消息注入正在运行的轮次。
    - 输入 `/stop`（或单独的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）可进行带外中止。
    - `chat.abort` 支持 `{ sessionKey }`（不需要 `runId`），用于中止该会话的所有活动运行。

  </Accordion>
  <Accordion title="中止后的部分保留">
    - 当一个运行被中止时，部分助手文本仍然可以在 UI 中显示。
    - 如果存在缓冲输出，Gateway 会将被中止的部分助手文本持久化到转录历史中。
    - 持久化条目包含中止元数据，因此转录消费者可以区分中止的部分输出和正常完成输出。

  </Accordion>
</AccordionGroup>

## PWA 安装与 Web Push

Control UI 附带 `manifest.webmanifest` 和 service worker，因此现代浏览器可以将其安装为独立的 PWA。Web Push 允许 Gateway 在标签页或浏览器窗口未打开时也能通过通知唤醒已安装的 PWA。

如果页面在 OpenClaw 更新后立刻显示 **Protocol mismatch**，请先通过 `openclaw dashboard` 重新打开仪表盘，然后对页面执行硬刷新。如果仍然失败，请清除该仪表盘来源的站点数据，或在无痕浏览窗口中测试；旧标签页或浏览器 service-worker 缓存可能仍在使用更新前的 Control UI bundle 与较新的 Gateway 交互。

| 表面                                               | 功能                                                       |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                   | PWA 清单。浏览器在可访问后会提供“安装应用”。               |
| `ui/public/sw.js`                                  | 处理 `push` 事件和通知点击的 service worker。              |
| `push/vapid-keys.json`（位于 OpenClaw 状态目录下） | 自动生成的 VAPID 密钥对，用于签名 Web Push 载荷。          |
| `push/web-push-subscriptions.json`                 | 持久化的浏览器订阅端点。                                   |

当你想固定密钥时，通过 Gateway 进程上的环境变量覆盖 VAPID 密钥对（适用于多主机部署、密钥轮换或测试）：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (默认为 `https://openclaw.ai`)

Control UI 使用这些作用域受限的 Gateway 方法来注册和测试浏览器订阅：

- `push.web.vapidPublicKey` — 获取当前活跃的 VAPID 公钥。
- `push.web.subscribe` — 注册一个 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已注册的端点。
- `push.web.test` — 向调用方的订阅发送测试通知。

<Note>
Web Push 独立于 iOS APNS 中继路径（有关中继支持的推送，请参见 [Configuration](/gateway/configuration)）以及现有的 `push.test` 方法，后者面向原生移动配对。
</Note>

## 托管嵌入

助手消息可以通过 `[embed ...]` 短代码以内联方式渲染托管的网页内容。iframe 沙箱策略由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">
    禁用托管嵌入中的脚本执行。
  </Tab>
  <Tab title="scripts (default)">
    允许交互式嵌入，同时保持源隔离；这是默认设置，通常足以满足自包含的浏览器游戏/小组件。
  </Tab>
  <Tab title="trusted">
    在 `allow-scripts` 基础上添加 `allow-same-origin`，适用于那些有意需要更强权限的同站文档。
  </Tab>
</Tabs>

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

<Warning>
仅当嵌入文档确实需要同源行为时才使用 `trusted`。对于大多数 agent 生成的游戏和交互式画布，`scripts` 是更安全的选择。
</Warning>

默认情况下，绝对的外部 `http(s)` 嵌入 URL 会被阻止。如果你有意让 `[embed url="https://..."]` 加载第三方页面，请设置 `gateway.controlUi.allowExternalEmbedUrls: true`。

## 聊天消息宽度

分组聊天消息使用可读性的默认最大宽度。宽屏部署可以通过设置 `gateway.controlUi.chatMessageMaxWidth` 来覆盖它，而无需修改打包后的 CSS：

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

该值会在送达浏览器之前经过校验。支持的值包括普通长度和百分比，例如 `960px` 或 `82%`，以及受限的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和 `fit-content(...)` 宽度表达式。

## Tailnet 访问（推荐）

<Tabs>
  <Tab title="集成的 Tailscale Serve（首选）">
    保持 Gateway 只监听回环地址，并让 Tailscale Serve 通过 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    打开：

    - `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

    默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket Serve 请求可以通过 Tailscale 身份头（`tailscale-user-login`）进行认证。OpenClaw 会通过 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与该头匹配来验证身份，并且只在请求命中回环且带有 Tailscale 的 `x-forwarded-*` 头时接受这些请求。对于具有浏览器设备身份的 Control UI 操作员会话，这条经过验证的 Serve 路径还会跳过设备配对往返；无设备的浏览器和 node-role 连接仍会遵循正常的设备检查。如果你希望即使是 Serve 流量也必须使用显式共享密钥凭据，请将 `gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或 `"password"`。

    对于该异步 Serve 身份路径，同一客户端 IP 和认证作用域的失败认证尝试会在速率限制写入之前被串行化。因此，同一浏览器发出的并发错误重试，第二个请求可能会显示 `retry later`，而不是两个普通的不匹配请求并行竞争。

    <Warning>
    无令牌的 Serve 认证假定 gateway 主机是可信的。如果不可信的本地代码可能在该主机上运行，请要求使用 token/password 认证。
    </Warning>

  </Tab>
  <Tab title="绑定到 tailnet + 令牌">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然后打开：

    - `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

    将匹配的共享密钥粘贴到 UI 设置中（作为 `connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

  </Tab>
</Tabs>

## 不安全 HTTP

如果你通过普通 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表盘，浏览器会以**不安全上下文**运行并阻止 WebCrypto。默认情况下，OpenClaw 会**阻止**没有设备身份的 Control UI 连接。

已记录的例外：

- 仅限 localhost 的不安全 HTTP 兼容性，使用 `gateway.controlUi.allowInsecureAuth=true`
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功进行 operator Control UI 认证
- 紧急开关 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**推荐修复：** 使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（在 gateway 主机上）

<AccordionGroup>
  <Accordion title="不安全认证开关行为">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` 只是一个本地兼容性开关：

    - 它允许 localhost 的 Control UI 会话在不安全 HTTP 上下文中在没有设备身份的情况下继续。
    - 它不会绕过配对检查。
    - 它不会放宽远程（非 localhost）设备身份要求。

  </Accordion>
  <Accordion title="仅用于紧急开关">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` 会禁用 Control UI 设备身份检查，是严重的安全降级。仅在紧急使用后尽快恢复。
    </Warning>

  </Accordion>
  <Accordion title="关于 trusted-proxy 的说明">
    - 成功的 trusted-proxy 认证可以在**不需要设备身份**的情况下允许 **operator** Control UI 会话。
    - 这**不**适用于 node-role Control UI 会话。
    - 同主机回环反向代理仍然不满足 trusted-proxy 认证；参见 [Trusted proxy auth](/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

有关 HTTPS 设置指南，请参见 [Tailscale](/gateway/tailscale)。

## 内容安全策略

Control UI 采用严格的 `img-src` 策略：仅允许**同源**资源、`data:` URL，以及本地生成的 `blob:` URL。远程 `http(s)` 和协议相对的图片 URL 会被浏览器拒绝，并且不会发起网络请求。

这在实际中的含义是：

- 通过相对路径提供的头像和图片（例如 `/avatars/<id>`）仍然可以正常渲染，包括 UI 获取并转换为本地 `blob:` URL 的已认证头像路由。
- 内联的 `data:image/...` URL 仍然可以渲染（适用于协议内载荷）。
- Control UI 创建的本地 `blob:` URL 仍然可以渲染。
- 通道元数据发出的远程头像 URL 会在 Control UI 的头像辅助逻辑中被移除，并替换为内置的 logo/badge，因此即使通道被入侵或恶意，也不能强迫操作者浏览器去获取任意远程图片。

你无需做任何修改即可获得这一行为——它始终开启，且不可配置。

## 头像路由认证

当配置了网关认证时，Control UI 的头像端点需要与 API 其余部分相同的网关令牌：

- `GET /avatar/<agentId>` 仅向已认证的调用者返回头像图片。`GET /avatar/<agentId>?meta=1` 也在相同规则下返回头像元数据。
- 对任一路由的未认证请求都会被拒绝（与同级的 assistant-media 路由一致）。这可以防止头像路由在其他受保护的主机上泄漏代理标识。
- Control UI 在获取头像时会将网关令牌作为 bearer 头转发，并使用已认证的 blob URL，这样图片仍可在仪表盘中渲染。

如果你禁用网关认证（不建议在共享主机上这样做），头像路由也会变为未认证，与网关其余部分保持一致。

## Assistant 媒体路由认证

当配置了网关认证时，assistant 本地媒体预览使用一个两步路由：

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` 需要普通的 Control UI operator 认证。浏览器在检查可用性时会将网关令牌作为 bearer 头发送。
- 成功的元数据响应会包含一个作用域限定到该确切源路径的短期 `mediaTicket`。
- 浏览器渲染的图片、音频、视频和文档 URL 使用 `mediaTicket=<ticket>`，而不是活动的网关令牌或密码。该票据很快过期，且不能为不同源授权。

这使得正常的媒体渲染可以兼容浏览器原生媒体元素，同时不会在可见的媒体 URL 中暴露可复用的网关凭据。

## 构建 UI

网关会从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build
```

可选的绝对基础路径（当你希望资产 URL 固定时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（独立开发服务器）：

```bash
pnpm ui:dev
```

然后将 UI 指向你的网关 WS URL（例如 `ws://127.0.0.1:18789`）。

## 空白 Control UI 页面

如果浏览器加载了空白仪表盘，并且 DevTools 没有显示有用的错误，某个扩展或早期内容脚本可能阻止了 JavaScript 模块应用的执行。静态页面包含一个纯 HTML 恢复面板，当 `<openclaw-app>` 在启动后未注册时会出现。

在更改浏览器环境后，使用面板中的 **Try again** 操作，或在完成以下检查后手动重新加载：

- 禁用会注入到所有页面的扩展，尤其是带有 `<all_urls>` 内容脚本的扩展。
- 尝试无痕窗口、干净的浏览器配置文件，或其他浏览器。
- 保持 Gateway 运行，并在更改浏览器后验证同一个仪表盘 URL。

## 调试/测试：开发服务器 + 远程 Gateway

Control UI 是静态文件；WebSocket 目标可配置，可以不同于 HTTP 源。当你希望本地运行 Vite 开发服务器、但网关运行在其他位置时，这会非常方便。

<Steps>
  <Step title="启动 UI 开发服务器">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="使用 gatewayUrl 打开">
    ```text
    http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
    ```

    可选的一次性认证（如有需要）：

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="说明">
    - `gatewayUrl` 会在加载后存储到 localStorage，并从 URL 中移除。
    - 如果你通过 `gatewayUrl` 传入完整的 `ws://` 或 `wss://` 端点，请对 `gatewayUrl` 值进行 URL 编码，以便浏览器正确解析查询字符串。
    - 尽可能通过 URL 片段（`#token=...`）传递 `token`。片段不会发送到服务器，可避免请求日志和 Referer 泄露。出于兼容性，旧的 `?token=` 查询参数仍会被导入一次，但仅作为回退，并会在启动后立即清除。
    - `password` 只保存在内存中。
    - 当设置了 `gatewayUrl` 时，UI 不会回退到配置或环境凭据。请显式提供 `token`（或 `password`）。缺少显式凭据会报错。
    - 当 Gateway 位于 TLS 之后时使用 `wss://`（Tailscale Serve、HTTPS 代理等）。
    - `gatewayUrl` 仅在顶层窗口中被接受（不能嵌入），以防止点击劫持。
    - 面向公网且非回环的 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整来源）。来自回环、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主机的私有同源 LAN/Tailnet 加载会被接受，而无需启用 Host 头回退。
    - Gateway 启动时可以根据实际运行时绑定地址和端口预先填充本地来源，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但远程浏览器来源仍需要显式条目。
    - 除了严格受控的本地测试外，不要使用 `gateway.controlUi.allowedOrigins: ["*"]`。这表示允许任意浏览器来源，而不是“匹配我正在使用的主机”。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用 Host 头来源回退模式，但这是危险的安全模式。

  </Accordion>
</AccordionGroup>

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

- [Dashboard](/web/dashboard) — 网关仪表盘
- [Health Checks](/gateway/health) — 网关健康监控
- [TUI](/web/tui) — 终端用户界面
- [WebChat](/web/webchat) — 基于浏览器的聊天界面
