---
summary: "Gateway 基于浏览器的控制 UI（聊天、活动、节点、配置）"
read_when:
  - 你想通过浏览器操作 Gateway
  - 你想在不使用 SSH 隧道的情况下访问 Tailnet
title: "控制 UI"
sidebarTitle: "控制 UI"
---

控制 UI 是一个由 Gateway 提供的、基于 **Vite + Lit** 的单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口上**直接**连接到 Gateway WebSocket。

## 本地快速打开

如果 Gateway 正在同一台电脑上运行，请打开 [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）。

如果页面无法加载，请先启动 Gateway：`openclaw gateway`。

<Note>
在原生 Windows LAN 绑定中，即使 `127.0.0.1` 在 Gateway 主机上可用，Windows 防火墙或组织管理的组策略仍可能阻止所显示的 LAN URL。请在 Windows 主机上运行 `openclaw gateway status --deep`；它会报告可能被阻止的端口、配置文件不匹配以及本地防火墙规则，而这些规则可能会被策略忽略。
</Note>

认证会在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时使用 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时使用受信任代理身份头

仪表盘设置面板会为当前浏览器标签页会话和所选 gateway URL 保留一个 token；密码不会持久化。首次连接时，引导流程通常会为共享密钥认证生成一个 gateway token，但当 `gateway.auth.mode` 为 `"password"` 时，密码认证也可正常工作。

## 设备配对（首次连接）

从新浏览器或设备连接通常需要一次性的**配对批准**，会显示为 `disconnected (1008): pairing required`。

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

如果浏览器使用变更后的认证信息（角色/作用域/公钥）重试配对，之前的待处理请求会被新的请求覆盖，并创建新的 `requestId`；在批准前请重新运行 `openclaw devices list`。

将已配对的浏览器从只读访问切换为写入/管理员访问，会被视为一次批准升级，而不是静默重连：OpenClaw 会保留旧批准有效，阻止更宽权限的重连，并要求你显式批准新的作用域集合。

一旦批准，设备就会被记住，除非你使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不会再次要求重新批准。有关令牌轮换、撤销，以及 Paperclip / `openclaw_gateway` 首次运行批准流程，请参阅 [Devices CLI](/cli/devices)。

<Note>
- 直接的本地回环浏览器连接（`127.0.0.1` / `localhost`）会自动批准。
- 当 `gateway.auth.allowTailscale: true`、Tailscale 身份验证通过，并且浏览器提供其设备身份时，Tailscale Serve 可以跳过 Control UI 操作会话的配对往返流程。无设备浏览器和节点角色连接仍然遵循常规设备检查。
- 直接 Tailnet 绑定、LAN 浏览器连接，以及没有设备身份的浏览器配置文件仍然需要显式批准。
- 每个浏览器配置文件都会生成一个唯一的设备 ID，因此切换浏览器或清除浏览器数据都需要重新配对。

</Note>

## 配对移动设备

已配对的管理员无需打开终端即可创建 iOS/Android 连接二维码：

<Steps>
  <Step title="打开移动配对">
    选择 **Nodes**，然后在 **Devices** 卡片中点击 **Pair mobile device**。
  </Step>
  <Step title="连接手机">
    在 OpenClaw 移动应用中，打开 **Settings** → **Gateway** 并扫描二维码。你也可以改为复制并粘贴设置代码。
  </Step>
  <Step title="确认连接">
    官方 iOS/Android 应用会自动连接。如果 **Devices** 显示待处理请求，请在批准前检查其角色和作用域。
  </Step>
</Steps>

创建设置代码需要 `operator.admin`；对于不具备该权限的会话，该按钮会被禁用。设置代码包含一个短期有效的引导凭据，因此在其有效期间，请将二维码和复制的代码视为密码。对于远程配对，Gateway 必须解析为 `wss://`（例如，通过 Tailscale Serve/Funnel）；普通的 `ws://` 仅限于回环和私有局域网地址。有关完整的安全性和回退细节，请参见 [配对](/channels/pairing#pair-from-the-control-ui-recommended)。

## 个人身份（浏览器本地）

控制 UI 支持为每个浏览器提供一个个人身份（显示名称和头像），并附加到发出的消息中，用于在共享会话中的归属标识。它存储在浏览器存储中，作用范围限定于当前浏览器配置文件，不会同步到其他设备，也不会在服务器端持久保存，超出你发送消息上的正常会话记录作者元数据范围。清除站点数据或切换浏览器会将其重置为空。

助手头像覆盖遵循相同的浏览器本地模式：上传的覆盖内容会在本地叠加到网关解析出的身份上，并且不会通过 `config.patch` 往返传输。共享的 `ui.assistant.avatar` 配置字段对于直接写入该字段的非 UI 客户端仍然可用。

## 运行时配置端点

Control UI 会从 `/control-ui-config.json` 获取其运行时设置，该路径是相对于网关的 Control UI 基路径解析的（例如，在基路径 `/__openclaw__/` 下，对应 `/__openclaw__/control-ui-config.json`）。该端点与其余 HTTP 接口一样受相同的网关认证保护：未认证的浏览器无法获取它，只有在提供有效的网关令牌/密码、Tailscale Serve 身份或受信任代理身份时，才能成功获取。

## 语言支持

Control UI 会在首次加载时根据你的浏览器区域设置自动本地化。若要稍后覆盖它，请打开 **Overview -> Gateway Access -> Language**（选择器位于 Gateway Access 卡片中，而不是在 Appearance 下）。

- 支持的区域设置：`en`、`ar`、`de`、`es`、`fa`、`fr`、`hi`、`id`、`it`、`ja-JP`、`ko`、`nl`、`pl`、`pt-BR`、`ru`、`th`、`tr`、`uk`、`vi`、`zh-CN`、`zh-TW`
- 非英语翻译会在浏览器中按需加载。
- 所选区域设置会保存在浏览器存储中，并在以后访问时复用。
- 缺失的翻译键会回退为英语。

文档翻译也会为同一组非英语区域设置生成，但文档站点内置的 Mintlify 语言选择器只会列出 Mintlify 接受的区域设置代码。泰语（`th`）和波斯语（`fa`）文档仍会在发布仓库中生成；在 Mintlify 支持这些代码之前，它们可能不会出现在该选择器中。

## Appearance 主题

Appearance 面板内置了 Claw、Knot 和 Dash 主题（Claw 为默认主题），另外还有一个仅限当前浏览器的 tweakcn 导入槽位。要导入主题，请打开 [tweakcn 编辑器](https://tweakcn.com/editor/theme)，选择或创建一个主题，点击 **Share**，然后将复制的链接粘贴到 Appearance 中。导入器也接受 `https://tweakcn.com/r/themes/<id>` 注册表 URL、类似 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 的编辑器 URL、相对路径 `/themes/<id>`、原始主题 ID，以及默认主题名称（例如 `amethyst-haze`）。

导入的主题仅存储在当前浏览器配置中；它们不会写入 gateway 配置，也不会在设备之间同步。替换已导入的主题会更新这个本地槽位；如果清除此项且该导入主题正处于启用状态，则会切回 Claw。

Appearance 还提供一个仅限浏览器本地的 Text size 设置，和其余 Control UI 偏好设置一起存储。它会应用于聊天文本、编辑器文本、工具卡片以及聊天侧边栏，并将文本输入框保持在至少 16px，以避免 mobile Safari 在聚焦时自动缩放。

## 侧边栏导航

侧边栏会首先显示会话，其后是少量固定的目的地集合。**概览**、**工作板**和**代理**默认已固定；展开 **更多** 可访问其他所有目的地。选择 **更多** 下的 **自定义侧边栏**，或右键单击导航区域，即可固定或取消固定目的地并恢复默认设置。固定集合和“更多”的展开状态会保存在当前浏览器配置文件中，并会在重新加载后保留。

**设置** 会继续显示在侧边栏底部，位于 **文档** 旁边。在桌面端，使用终端控制旁边的顶部栏按钮可折叠或展开侧边栏。在抽屉断点处，该控制会被汉堡菜单按钮替代。

## 它目前能做什么

<AccordionGroup>
  <Accordion title="聊天和对话">
    - 通过 Gateway WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）。
    - 聊天历史刷新会请求一个有上限的最近窗口，并对每条消息设置文本长度上限，因此在聊天可用之前，大型会话不会迫使浏览器先渲染完整转录载荷。
    - 通过浏览器实时会话进行对话。OpenAI 使用直接 WebRTC，Google Live 使用通过 WebSocket 的受限一次性浏览器令牌，而仅后端的实时语音插件使用 Gateway 中继传输。由客户端拥有的提供方会话从 `talk.client.create` 开始；Gateway 中继会话从 `talk.session.create` 开始。中继会将提供方凭据保留在 Gateway 上，同时浏览器通过 `talk.session.appendAudio` 传输麦克风 PCM，将 `openclaw_agent_consult` 提供方工具调用通过 `talk.client.toolCall` 转发以供 Gateway 策略和更大的已配置 OpenClaw 模型处理，并通过 `talk.client.steer` 或 `talk.session.steer` 路由活动运行中的语音引导。
    - 在 Chat 中流式展示工具调用和实时工具输出卡片（代理事件）。
    - 活动选项卡：基于浏览器本地、优先脱敏的实时工具活动摘要，来源于现有的 `session.tool` / 工具事件投递。

  </Accordion>
  <Accordion title="通道、实例、会话、梦境">
    - 通道：内置以及捆绑/外部插件通道状态、二维码登录，以及按通道配置（`channels.status`、`web.login.*`、`config.patch`）。
    - 通道探测刷新会在缓慢的提供方检查完成期间保持先前快照可见，并在探测或审计超出 UI 预算时标记部分快照。
    - 实例：存在列表与刷新（`system-presence`）。
    - 会话：默认列出已配置代理会话，固定常用会话，重命名它们，归档或恢复不活跃会话，从过期的未配置代理会话键回退，并应用每个会话的模型/思考/快速/详细/追踪/推理覆盖项（`sessions.list`、`sessions.patch`）。固定会话会排在最近未固定会话之上；已归档会话保留在 Sessions 页面归档视图中，并保留其转录内容。
    - 会话分组：通过“按以下方式分组”控件，可将会话表按自定义分组、通道、种类、代理或日期组织成各个区段。自定义分组通过 `sessions.patch`（`category`）按会话持久化，因此从消息通道（Discord、Telegram、WhatsApp、……）启动的会话也可以被分类；可通过将行拖到某个区段上、使用每行的分组选择器来分配分组，并通过“新建分组”操作创建分组。
    - 梦境：做梦状态、启用/禁用切换，以及 Dream Diary 读取器（`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`）。

  </Accordion>
  <Accordion title="Cron、技能、节点、执行审批">
    - Cron 任务：列出/添加/编辑/运行/启用/禁用，以及运行历史（`cron.*`）。
    - 技能：状态、启用/禁用、安装、API 密钥更新（`skills.*`）。
    - 节点：列表及容量（`node.list`）、创建移动端设置代码，以及批准设备配对（`device.pair.*`）。
    - 执行审批：编辑 gateway 或节点允许列表，并针对 `exec host=gateway/node` 请求策略（`exec.approvals.*`）。

  </Accordion>
  <Accordion title="配置">
    - 查看/编辑 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）。
    - MCP 有一个专用设置页面，用于配置服务器、启用状态、OAuth/过滤/并行摘要、常用操作员命令，以及作用域限定的 `mcp` 配置编辑器。
    - 通过验证后应用并重启（`config.apply`），然后唤醒最后一个活动会话。
    - 写入包含基础哈希保护，以防覆盖并发编辑。
    - 写入（`config.set`/`config.apply`/`config.patch`）会对提交的配置载荷中的引用预先进行活动 SecretRef 解析；未解析且处于活动状态的已提交引用会在写入前被拒绝。
    - 表单保存会丢弃无法从已保存配置中恢复的过期脱敏占位符，同时保留仍能映射到已保存密钥的脱敏值。
    - 模式与表单渲染来源于 `config.schema` / `config.schema.lookup`，包括字段 `title`/`description`、匹配到的 UI 提示、立即子项摘要、嵌套对象/通配符/数组/组合节点上的文档元数据，以及可用时的插件和通道模式。仅当快照具有安全的原始往返能力时才提供原始 JSON 编辑器；否则 Control UI 会强制使用表单模式。
    - 原始 JSON 编辑器中的“重置为已保存”会保留原始编写的形态（格式、注释、`$include` 布局），而不是重新渲染为扁平化快照，因此当快照能够安全往返时，外部编辑在重置后仍可保留。
    - 结构化 SecretRef 对象值在表单文本输入框中以只读方式渲染，以防止意外的对象到字符串损坏。

  </Accordion>
  <Accordion title="调试、日志、更新">
    - 调试：状态/健康状况/模型快照、事件日志，以及手动 RPC 调用（`status`、`health`、`models.list`）。
    - 事件日志包括 Control UI 刷新/RPC 耗时、缓慢的聊天/配置渲染耗时，以及当浏览器暴露这些 PerformanceObserver 条目类型时，对长动画帧或长任务的浏览器响应性条目。
    - 日志：gateway 文件日志的实时尾随查看，支持过滤/导出（`logs.tail`）。
    - 更新：执行包/git 更新并重启（`update.run`），附带重启报告，然后在重新连接后轮询 `update.status` 以验证正在运行的 gateway 版本。

  </Accordion>
  <Accordion title="Cron 任务面板说明">
    - 对于隔离任务，投递默认使用 announce 摘要；若仅供内部运行，则切换为 none。
    - 当选择 announce 时，会显示通道/目标字段。
    - Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
    - 对于主会话任务，可使用 webhook 和 none 投递模式。
    - 高级编辑控件包括删除后运行、清除代理覆盖、cron 精确/错峰选项、代理模型/思考覆盖，以及尽力投递切换。
    - 表单验证为内联方式，并带有字段级错误；无效值会禁用保存按钮，直到修正为止。
    - 设置 `cron.webhookToken` 以发送专用 bearer token；如果省略，则 webhook 发送时不带 auth 头。
    - `cron.webhook` 是一个已弃用的旧版回退方案：运行 `openclaw doctor --fix` 可迁移那些仍使用 `notify: true` 的已存储任务，使其改为显式的按任务 webhook 或完成投递。

  </Accordion>
</AccordionGroup>

## MCP 页面

专用的 MCP 页面是面向 OpenClaw 管理的 `mcp.servers` 下 MCP 服务器的操作员视图。它不会自行启动 MCP 传输；请用它来检查和编辑已保存配置，然后在需要实时服务器证明时使用 `openclaw mcp doctor --probe`。

典型工作流：

1. 从侧边栏打开 **MCP**。
2. 检查摘要卡片，查看总数、已启用、OAuth 和已过滤服务器数量。
3. 查看每个服务器行中的传输方式、启用状态、认证、过滤器、超时和命令提示。
4. 当服务器应保持已配置但不参与运行时发现时，切换其启用状态。
5. 编辑作用域为 `mcp` 的配置部分，用于服务器定义、请求头、TLS/mTLS 路径、OAuth 元数据、工具过滤器和 Codex 投影元数据。
6. 对于配置写入使用 **Save**，如果运行中的 Gateway 应应用更改后的配置，则使用 **Save & Publish**。
7. 在终端中运行 `openclaw mcp status --verbose`、`openclaw mcp doctor --probe` 或 `openclaw mcp reload`，以进行静态诊断、实时证明或清除缓存运行时。

在渲染之前，此页面会对包含凭据的类 URL 值进行脱敏，并在命令片段中为服务器名称加引号，这样复制后的命令在包含空格或 shell 元字符时仍可正常工作。完整的 CLI 和配置参考： [MCP](/cli/mcp)。

## Activity 标签页

Activity 标签页是一个短暂的、浏览器本地的实时工具活动观察器，源自与驱动 Chat 工具卡片的同一 Gateway `session.tool` / 工具事件流。它不会新增另一类 Gateway 事件、端点、持久化活动存储、指标流或外部观察器流。

Activity 条目只保留已脱敏摘要和经过脱敏、截断的输出预览。工具参数值不会存储在 Activity 状态中；UI 会显示这些参数被隐藏，并且只记录参数字段数量。内存中的列表跟随当前浏览器标签页，在 Control UI 内导航时会保留，并在页面重新加载、会话切换或点击 **Clear** 时重置。

## 操作终端

可停靠的操作终端默认是禁用的。要启用它，请设置 `gateway.terminal.enabled: true` 并重启 Gateway。该终端需要一个 `operator.admin` 连接，并会在活动 agent 工作区中打开一个主机 PTY。新标签页会跟随当前选中的聊天 agent。

<Warning>
该终端是一个不受限制的主机 shell，并继承 Gateway 进程环境。仅应为受信任的 operator 部署启用它。对于 `sandbox.mode: "all"` 的 agent，OpenClaw 会拒绝终端会话；将一个活动 agent 更改为该模式会关闭其现有和进行中的终端会话。
</Warning>

使用 **Ctrl + backtick** 切换停靠面板。布局支持底部和右侧停靠，会随浏览器视口调整大小，并可保留多个 shell 标签页。有关 `gateway.terminal.enabled` 以及可选的 `gateway.terminal.shell` 覆盖项，请参阅 [Gateway 配置](/gateway/configuration-reference#gateway)。

会话可在断开连接后继续保留：页面重新加载、笔记本电脑休眠或网络短暂中断时，Gateway 上的会话会被分离而不是终止，并且同一个浏览器标签页会在重新连接时重新附着，同时回放最近的输出。分离的会话会在 `gateway.terminal.detachedSessionTimeoutSeconds` 之后被终止（默认 300 秒；`0` 可恢复为断开即终止）。`terminal.list` 会显示可附着的会话，`terminal.attach` 会接管其中一个（tmux 风格的接管），而 `terminal.text` 可在不附着的情况下以纯文本读取会话的最近输出——这是面向 agent/工具链的能力。

该终端还可作为全屏、仅终端的文档，通过 `/?view=terminal` 访问。iOS 和 Android 应用会在其 Terminal 界面中嵌入此页面，并复用已存储的 gateway 凭据；可用性同样受 `gateway.terminal.enabled` 和 `operator.admin` 门控限制，当所连接的 Gateway 不提供终端时，页面会显示通知。

## 聊天行为

<AccordionGroup>
  <Accordion title="发送与历史语义">
    - `chat.send` 是**非阻塞**的：它会立即确认并返回 `{ runId, status: "started" }`，响应通过 `chat` 事件流式返回。受信任的 Control UI 客户端还可能接收到可选的 ACK 时序元数据，用于本地诊断。
    - 聊天上传接受图片以及非视频文件。图片保留原生图片路径；其他文件作为受管媒体存储，并在历史中显示为附件链接。
    - 使用相同的 `idempotencyKey` 重新发送时，在运行期间返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
    - `chat.history` 响应受大小限制，以保障 UI 安全。当转录条目过大时，Gateway 可能截断较长的文本字段，省略较重的元数据块，并用占位符替换超大消息（`[chat.history omitted: message too large]`）。
    - 当可见的助手消息在 `chat.history` 中被截断时，侧边阅读器可以按需通过 `chat.message.get` 获取完整的显示规范化转录条目；如需要可通过 `sessionKey`、当前活动的 `agentId`，以及转录 `messageId`。如果 Gateway 仍然无法返回更多内容，阅读器会显示明确的不可用状态，而不是静默重复截断后的预览。
    - 助手/生成的图片会作为受管媒体引用持久化，并通过已认证的 Gateway 媒体 URL 提供，因此重新加载不依赖于原始 base64 图片载荷继续留在聊天历史响应中。
    - 渲染 `chat.history` 时，Control UI 会从可见的助手文本中剥离仅用于显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块），以及泄露的 ASCII/全角模型控制 token。它会省略那些整个可见文本仅为精确静默 token `NO_REPLY` / `no_reply` 或心跳确认 token `HEARTBEAT_OK` 的助手条目。
    - 在活动发送期间和最终历史刷新时，如果 `chat.history` 短暂返回较旧快照，聊天视图会保留本地乐观的用户/助手消息可见；当 Gateway 历史赶上后，规范化转录会替换这些本地消息。
    - 实时 `chat` 事件表示传递状态，而 `chat.history` 则从持久化的会话转录重建。工具最终事件之后，Control UI 会重新加载历史，并且只合并一个很小的乐观尾部；转录边界记录在 [WebChat](/web/webchat) 中。
    - `chat.inject` 会向会话转录附加一条助手注释，并广播一个 `chat` 事件用于仅 UI 更新（不发生 agent 运行，也不进行通道传递）。
    - 侧边栏列出最近会话，包含 New Session 操作、All Sessions 链接，以及一个会话搜索按钮，它会打开完整的会话选择器（按所选 agent 作用域划分，支持搜索和分页）。新的仪表板会话会在异步过程中根据其第一条非命令消息获得一个简短的生成标题；显式名称绝不会被替换。设置 `agents.defaults.utilityModel`（或 `agents.list[].utilityModel`）可将这个独立模型调用路由到更低成本的模型。切换 agent 时只显示属于该 agent 的会话；如果该 agent 还没有保存的仪表板会话，则回退到该 agent 的主会话。
    - 每个会话选择器行都可以重命名、置顶或归档会话。活动运行和 agent 的主会话不能被归档。归档当前选中的会话会将 Chat 切回该 agent 的主会话。
    - 在桌面宽度下，聊天控件保持在一行紧凑布局中，并会在向下滚动转录时折叠；向上滚动、返回顶部或到达底部时会恢复控件。
    - 连续重复的纯文本消息会渲染为一个气泡，并带有数量徽标。包含图片、附件、工具输出或画布预览的消息不会被折叠。
    - 聊天头部的模型和思考选择器会通过 `sessions.patch` 立即修补活动会话；它们是持久性的会话覆盖，而不是仅限单次发送的选项。
    - 如果你在同一会话的模型选择器变更仍在保存时发送消息，composer 会先等待该会话修补完成，再调用 `chat.send`，以便这次发送使用所选模型。
    - 输入 `/new` 会创建并切换到与 New Chat 相同的新仪表板会话，除非配置了 `session.dmScope: "main"` 且当前父会话是该 agent 的主会话；此时会在原地重置主会话。输入 `/reset` 会保留 Gateway 对当前会话的显式原地重置。
    - 聊天模型选择器请求的是 Gateway 配置的模型视图。如果存在 `agents.defaults.models`，则该允许列表会驱动选择器，包括保持 provider 作用域目录动态的 `provider/*` 条目。否则，选择器会显示明确的 `models.providers.*.models` 条目以及具有可用认证的 providers。完整目录仍可通过调试用 `models.list` RPC，并设置 `view: "all"` 来访问。
    - 当新的 Gateway 会话使用情况报告包含当前上下文 token 时，聊天 composer 工具栏会显示一个小型上下文使用环，展示已用百分比。点开后可查看当前上下文窗口、最近一次运行的 token 计数和估算总成本、provider/model 标识，以及最新 provider 响应的输入/输出/缓存成本拆分（如果有报告）。在上下文压力较高时，该环会切换为警告样式；在建议压缩级别时，会显示一个紧凑按钮，用于执行正常的会话压缩路径。过时的 token 快照会被隐藏，直到 Gateway 再次报告新的使用情况。

  </Accordion>
  <Accordion title="对话模式（浏览器实时）">
    对话模式使用已注册的实时语音提供方。使用 OpenAI 时，配置 `talk.realtime.provider: "openai"`，并提供 `openai` API 密钥认证配置文件、`talk.realtime.providers.openai.apiKey` 或 `OPENAI_API_KEY`；OpenAI OAuth 配置文件不会配置 Realtime 语音。使用 Google 时，配置 `talk.realtime.provider: "google"`，并提供 `talk.realtime.providers.google.apiKey`。浏览器永远不会接收到标准 provider API key：OpenAI 会接收用于 WebRTC 的一次性 Realtime 客户端密钥，Google Live 会接收一个仅可使用一次、受限制的 Live API 认证令牌用于浏览器 WebSocket 会话，而指令和工具声明会被 Gateway 锁定进令牌中。仅暴露后端 realtime 桥接的 providers 会通过 Gateway relay 传输运行，因此凭据和厂商 socket 保持在服务器端，而浏览器音频通过已认证的 Gateway RPC 流动。Realtime 会话提示由 Gateway 组装；`talk.client.create` 不接受调用方提供的指令覆盖。

    Chat composer 在 Talk 开始/停止按钮旁边包含一个 Talk 选项下拉箭头。其紧凑面板仅保留下一次 Talk 会话所需的 Voice、Model 和 Sensitivity。**更多设置** 会打开 **Settings → Communications → Talk**，其中存放持久性的 provider、transport、reasoning effort、精确 VAD 阈值、静音时长和前缀填充默认值；更改这些默认值需要 `operator.admin` 访问权限。composer 中的空白值会回退到这些已配置默认值或 provider 默认值。配置 Gateway relay 会强制使用后端 relay 路径；配置 WebRTC 会保持会话由客户端拥有，并在 provider 无法创建浏览器会话时直接失败，而不是静默回退到 relay。

    Talk 控件本身就是 composer 工具栏中的麦克风按钮，旁边有一个小下拉箭头可打开 Talk 选项。Talk 开始时，composer 状态行会显示 `Connecting Talk...`，然后在音频连接后显示 `Talk live`，或者在实时工具调用通过 `talk.client.toolCall` 咨询所配置的更大模型时显示 `Asking OpenClaw...`。

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

如果页面在 OpenClaw 更新后立即显示 **Protocol mismatch**，请先使用 `openclaw dashboard` 重新打开仪表板并强制刷新。如果仍然失败，请清除该仪表板来源的站点数据，或在隐私浏览窗口中测试；旧标签页或浏览器的 service worker 缓存可能会继续使用更新前的 Control UI bundle 与较新的 Gateway 通信。

| 表面                                               | 功能                                                       |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                   | PWA 清单。浏览器在可访问后会提供“安装应用”。               |
| `ui/public/sw.js`                                  | 处理 `push` 事件和通知点击的 service worker。              |
| `push/vapid-keys.json`（位于 OpenClaw 状态目录下） | 自动生成的 VAPID 密钥对，用于签名 Web Push 载荷。          |
| `push/web-push-subscriptions.json`                 | 持久化的浏览器订阅端点。                                   |

如果你想固定密钥（多主机场景、密钥轮换或测试），可通过 Gateway 进程上的环境变量覆盖 VAPID 密钥对：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (默认为 `https://openclaw.ai`)

Control UI 使用这些作用域受限的 Gateway 方法来注册和测试浏览器订阅：

- `push.web.vapidPublicKey` 获取当前生效的 VAPID 公钥。
- `push.web.subscribe` 注册 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` 移除已注册的端点。
- `push.web.test` 向调用者的订阅发送测试通知。

<Note>
Web Push 独立于 iOS APNS 中继路径（有关中继支持的推送，请参见 [Configuration](/gateway/configuration)）以及 `push.test` 方法，后者面向原生移动端配对。
</Note>

## 托管嵌入

助手消息可以通过 `[embed ...]` 短代码以内联方式渲染托管的网页内容。iframe 沙箱策略由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">
    禁用托管嵌入中的脚本执行。
  </Tab>
  <Tab title="scripts (default)">
    允许交互式嵌入，同时保持源隔离；通常足以满足自包含的浏览器游戏/小部件。
  </Tab>
  <Tab title="trusted">
    在 `allow-scripts` 基础上添加 `allow-same-origin`，适用于那些有意需要更强权限的同站文档。
  </Tab>
</Tabs>

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

绝对外部 `http(s)` 嵌入 URL 默认仍会被阻止。若要让 `[embed url="https://..."]` 加载第三方页面，请设置 `gateway.controlUi.allowExternalEmbedUrls: true`。

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

该值在到达浏览器之前会先进行验证。支持的形式包括普通长度值和百分比，例如 `960px` 或 `82%`，以及受限的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和 `fit-content(...)` 宽度表达式。

## Tailnet 访问（推荐）

<Tabs>
  <Tab title="集成的 Tailscale Serve（首选）">
    保持 Gateway 只监听回环地址，并让 Tailscale Serve 通过 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    打开 `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）。

    默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket Serve 请求可以通过 Tailscale 身份头（`tailscale-user-login`）进行认证。OpenClaw 会通过 `tailscale whois` 解析 `x-forwarded-for` 地址，并将其与该头信息匹配来验证身份，并且只在请求命中回环地址且带有 Tailscale 的 `x-forwarded-*` 头时接受这些请求。对于带有浏览器设备身份的 Control UI operator 会话，这条已验证的 Serve 路径还会跳过设备配对往返；无设备的浏览器和 node-role 连接仍然遵循正常的设备检查。如果你希望即使对 Serve 流量也强制使用显式共享密钥凭据，请将 `gateway.auth.allowTailscale` 设为 `false`，然后使用 `gateway.auth.mode: "token"` 或 `"password"`。

    对于该异步 Serve 身份路径，同一客户端 IP 和认证作用域的失败认证尝试会在速率限制写入之前被串行化。因此，同一浏览器发出的并发错误重试，第二个请求可能会显示 `retry later`，而不是两个普通的不匹配请求并行竞争。

    <Warning>
    无令牌的 Serve 认证假定 gateway 主机是可信的。如果不可信的本地代码可能在该主机上运行，请要求使用 token/password 认证。
    </Warning>

  </Tab>
  <Tab title="绑定到 tailnet + 令牌">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    打开 `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）。

    将匹配的共享密钥粘贴到 UI 设置中（作为 `connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

  </Tab>
</Tabs>

## 不安全 HTTP

如果你通过普通 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表盘，浏览器会以**不安全上下文**运行并阻止 WebCrypto。默认情况下，OpenClaw 会**阻止**没有设备身份的 Control UI 连接。

已记录的例外：

- 仅限 localhost 的不安全 HTTP 兼容性，使用 `gateway.controlUi.allowInsecureAuth=true`
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功进行 operator Control UI 认证
- 紧急开关 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**推荐修复：**使用 HTTPS（Tailscale Serve）或在本地打开 UI：`https://<magicdns>/`（Serve）或 `http://127.0.0.1:18789/`（在 gateway 主机上）。

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

    - 它允许 localhost 的 Control UI 会话在不安全的 HTTP 环境中 बिना 设备身份继续进行。
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

Control UI 提供了严格的 `img-src` 策略：仅允许**同源**资源、`data:` URL，以及本地生成的 `blob:` URL。远程 `http(s)` 和协议相对的图片 URL 会被浏览器拒绝，并且不会发起网络请求。

在实际使用中：

- 通过相对路径提供的头像和图片（例如 `/avatars/<id>`）仍然可以正常显示，包括 UI 获取并转换为本地 `blob:` URL 的已认证头像路由。
- 内联的 `data:image/...` URL 仍然可以正常显示。
- 由 Control UI 创建的本地 `blob:` URL 仍然可以正常显示。
- 通道元数据输出的远程头像 URL 会在 Control UI 的头像辅助函数中被移除，并替换为内置的 logo/badge，因此被入侵或恶意的通道无法强制操作员浏览器发起任意远程图片请求。

此功能始终启用，且不可配置。

## Avatar Route Authentication

When gateway authentication is configured, the Control UI's avatar endpoint needs the same gateway token as the rest of the API:

- `GET /avatar/<agentId>` 仅向已认证的调用方返回头像图像。`GET /avatar/<agentId>?meta=1` 在相同规则下返回头像元数据。
- 对这两个路由的未认证请求都会被拒绝（与同级的 assistant-media 路由一致），因此在其他受保护的主机上，头像路由不会泄露 agent 身份。
- Control UI 在获取头像时会将网关令牌作为 bearer 头转发，并使用已认证的 blob URL，这样图像仍然可以在仪表板中正常渲染。

如果你禁用网关认证（不建议在共享主机上这样做），头像路由也会变为未认证，与网关其余部分保持一致。

## Assistant 媒体路由认证

当配置了网关认证时，assistant 本地媒体预览使用一个两步路由：

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` 需要正常的 Control UI operator 认证；浏览器在检查可用性时会将网关令牌作为 bearer 头发送。
- 成功的元数据响应会包含一个短期有效的 `mediaTicket`，并且仅限于该精确的源路径。
- 浏览器渲染的图像、音频、视频和文档 URL 使用 `mediaTicket=<ticket>`，而不是当前的网关令牌或密码。该票据会很快过期，且不能用于授权其他源。

这使媒体渲染能够兼容浏览器原生媒体元素，同时不会把可复用的网关凭据暴露在可见的媒体 URL 中。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件：

```bash
pnpm ui:build
```

可选的绝对基础路径（固定资源 URL）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

本地开发（独立开发服务器）：

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

Control UI 是静态文件；WebSocket 目标可配置，并且可以不同于 HTTP origin。当你希望本地使用 Vite 开发服务器，而 Gateway 运行在其他地方时，这很方便。

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
  <Accordion title="Notes">
    - `gatewayUrl` 会在加载后存储到 localStorage 中，并从 URL 中移除。
    - 如果你通过 `gatewayUrl` 传入完整的 `ws://` 或 `wss://` 端点，请对该值进行 URL 编码，以便浏览器正确解析查询字符串。
    - `token` 应尽可能通过 URL fragment（`#token=...`）传递。fragment 不会发送到服务器，因此可以避免请求日志和 Referer 泄漏。出于兼容性，旧的 `?token=` 查询参数仍会被一次性导入，但仅作为后备，并会在启动后立即移除。
    - `password` 仅保存在内存中。
    - 当设置了 `gatewayUrl` 时，UI 不会回退使用配置或环境中的凭据。请显式提供 `token`（或 `password`）；缺少显式凭据将报错。
    - 当 Gateway 位于 TLS 后面时，请使用 `wss://`（例如 Tailscale Serve、HTTPS 代理等）。
    - `gatewayUrl` 仅在顶层窗口中接受（不能嵌入），以防止点击劫持。
    - 面向公网、非回环的 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整 origin）。来自 loopback、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主机的私有同源 LAN/Tailnet 加载无需启用 Host-header 回退。
    - Gateway 启动时可能会根据实际运行时绑定地址和端口注入本地 origin，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`；但远程浏览器 origin 仍然需要显式条目。
    - 除非是严格受控的本地测试，否则不要使用 `gateway.controlUi.allowedOrigins: ["*"]`；它表示允许任意浏览器 origin，而不是“匹配我正在使用的任何主机”。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用 Host-header origin 回退模式，但这是一种危险的安全模式。

  </Accordion>
</AccordionGroup>

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
