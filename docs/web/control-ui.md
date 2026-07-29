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

当你查看一个正在运行的会话时，Gateway 会立即将模型最新的安全前导语作为会话标题显示出来。如果有可用的实用模型，在积累了足够的活动后，它可以用更丰富的紧凑状态摘要来替换该标题。聊天在一个 **会话侧栏** 中呈现结果：其紧凑胶囊显示实时摘要，而展开后的侧栏显示评估、计划进度、拉取请求、已用时间，以及一个只读的伴随线程。当运行变得卡住或需要输入时，侧栏可以展开一次；而已完成或失败的运行则会保留一个冻结的“finished”时间，该时间基于最终摘要。在宽聊天面板中，展开后的侧栏会停靠为右侧 400 px 的列；在较窄和移动端布局中，它则保持为覆盖层。

伴随线程会在不进入或不中断主代理运行的情况下，回答关于所选会话及其项目的问题。它使用实用模型，并对目标会话的历史/搜索以及代理工作区具有只读访问权限。这个有边界的线程保存在 Gateway 内存中，当你在控制 UI 中切换会话时会被恢复，并且会在侧栏的垃圾桶按钮、会话重置、Gateway 重启或空闲过期后被清除。它永远不会进入 `chat.history`。在主控制 UI 的编辑器中输入 `/btw <question>` 或 `/side <question>` 即可打开侧栏并在其中提问；其他客户端会保持其现有的 BTW 行为。

在聊天消息中高亮文本会提供 **More details**，它会立即询问伴随线程，以及 **Ask in side chat**，它会打开侧栏并附上一份可编辑的引用草稿。

该标题拥有该运行的侧边栏副标题，而不是依赖启发式的实时活动。它会与官方 iOS 和 Android 会话列表共享。最终完成或失败的摘要在会话未读期间仍会可见，之后该行会恢复为其正常的工作副标题。

会话观察默认已启用。安全前导语标题不需要实用模型；实用模型只负责更丰富的评估和终态摘要。在 **Settings > Appearance > Sidebar** 中，你可以在整个 gateway 范围内关闭观察，检查已解析的小模型及其来源，或者选择自动路由、禁用实用任务，或显式选择 `agents.defaults.utilityModel`。等效的配置控制项是 `gateway.controlUi.sessionObserver: false` 和 `agents.defaults.utilityModel: ""`。

## 快速打开（本地）

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

Gateway 身份验证在设备配对之前执行。直接的回环连接不会绕过令牌或密码认证。仪表盘设置面板会为当前浏览器标签页会话和所选 Gateway URL 保留一个令牌；密码不会持久化。配对后，浏览器在后续连接中可以使用其为每个设备存储的令牌。

初始化通常会为共享密钥认证配置一个 Gateway 令牌。如果 Gateway 以令牌模式启动但未配置令牌，它会为该进程生成一个临时运行时令牌。运行时令牌不会写入配置，因此 `openclaw config get gateway.auth.token` 无法检索到它，并且没有该令牌的回环浏览器会被拒绝。请运行 `openclaw doctor --generate-gateway-token`，重启 Gateway，然后将配置好的令牌粘贴到 Control UI 设置中。当 `gateway.auth.mode` 为 `"password"` 时，则改用密码认证。

## 设备配对（首次连接）

在网关认证成功后，从新的浏览器或设备连接通常需要一次性的**配对批准**，此时会显示 `disconnected (1008): pairing required`。

<Warning>
当你从一个使用已弃用的
`gateway.controlUi.dangerouslyDisableDeviceAuth=true` 破窗设置的版本直接升级时，
OpenClaw 会保留基于令牌/密码或受信任代理认证的 Control UI 访问，
仅用于配对修复。如果浏览器处于普通 HTTP 且无法创建设备身份，
请先通过 HTTPS 或 localhost 重新打开它。然后在警告横幅中点击 **Secure this browser**。
网关只有在已签名的浏览器明确完成配对后，才会恢复正常的设备认证强制；它绝不会为无设备身份的浏览器创建或批准身份。
当另一位操作员设备已经配对时，此迁移不可用。
Gateway 启动和 `openclaw doctor --fix` 都会明确报告此次迁移，而不是静默丢弃旧密钥。
</Warning>

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

将一个已经配对的远程浏览器从只读访问切换到写入/管理员访问，会被视为一次批准升级，而不是静默重连：OpenClaw 会保持旧批准处于激活状态，阻止更宽权限的重连，并要求你显式批准新的作用域集合。符合条件的直接回环 Control UI 连接在完成认证后可以静默批准该升级。

一旦批准，设备就会被记住，除非你使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不会再次要求重新批准。有关令牌轮换、撤销，以及 Paperclip / `openclaw_gateway` 首次运行批准流程，请参阅 [Devices CLI](/cli/devices)。

<Note>
- 来自回环 TCP 对端（`127.0.0.1` 或 `::1`，通常通过 `localhost` 访问）的直接本地 Control UI 连接，在没有转发/代理头的情况下，只有在网关认证成功且浏览器出示设备身份后，才可以自动批准设备配对。在令牌/密码模式下，首次连接仍然需要配置的共享密钥；这种自动批准不是绕过令牌。
- 只有在显式配置 `gateway.auth.mode: "none"` 时，直接回环才不需要共享密钥。这会禁用网关认证，不是推荐的 Control UI 配置。Tailscale Serve 和受信任代理模式只有在各自的身份检查通过时，才可以避免粘贴共享密钥。
- 当 `gateway.auth.allowTailscale: true`、Tailscale 身份验证通过且浏览器出示其设备身份时，Tailscale Serve 可以跳过 Control UI 操作员会话的配对往返。无设备身份的浏览器和节点角色连接仍然遵循正常的设备检查。
- 直接 Tailnet 绑定和 LAN 浏览器连接仍需要显式批准。没有设备身份的浏览器配置文件不能使用回环自动批准。
- 每个浏览器配置文件都会生成唯一的设备 ID，因此切换浏览器或清除浏览器数据都需要重新配对。

</Note>

## 配对移动设备

已配对的管理员无需打开终端即可创建 iOS/Android 连接二维码：

<Steps>
  <Step title="打开移动设备配对">
    选择 **Devices**，然后在 **Devices** 卡片中点击 **Pair mobile device**。
  </Step>
  <Step title="连接手机">
    在 OpenClaw 移动应用中，打开 **Settings** → **Gateway** 并扫描二维码。你也可以改为复制并粘贴设置代码。
  </Step>
  <Step title="确认连接">
    官方 iOS/Android 应用会自动连接。如果 **Pending approval** 显示有请求，请在批准前检查其角色和权限范围。
  </Step>
</Steps>

创建设置代码需要 `operator.admin`；对于不具备该权限的会话，该按钮会被禁用。设置代码包含一个短期有效的引导凭据，因此在其有效期间，请将二维码和复制的代码视为密码。对于远程配对，Gateway 必须解析为 `wss://`（例如，通过 Tailscale Serve/Funnel）；普通的 `ws://` 仅限于回环和私有局域网地址。有关完整的安全性和回退细节，请参见 [配对](/channels/pairing#pair-from-the-control-ui-recommended)。

## 个人身份（浏览器本地）

控制 UI 支持为每个浏览器提供一个个人身份（显示名称和头像），并附加到发出的消息中，用于在共享会话中的归属标识。它存储在浏览器存储中，作用范围限定于当前浏览器配置文件，不会同步到其他设备，也不会在服务器端持久保存，超出你发送消息上的正常会话记录作者元数据范围。清除站点数据或切换浏览器会将其重置为空。

助手头像覆盖遵循相同的浏览器本地模式：上传的覆盖内容会在本地叠加到网关解析出的身份上，并且不会通过 `config.patch` 往返传输。共享的 `ui.assistant.avatar` 配置字段对于直接写入该字段的非 UI 客户端仍然可用。

## 运行时配置端点

Control UI 会从 `/control-ui-config.json` 获取其运行时设置，该路径是相对于网关的 Control UI 基路径解析的（例如，在基路径 `/__openclaw__/` 下，对应 `/__openclaw__/control-ui-config.json`）。该端点与其余 HTTP 接口一样受相同的网关认证保护：未认证的浏览器无法获取它，只有在提供有效的网关令牌/密码、Tailscale Serve 身份或受信任代理身份时，才能成功获取。

## 网关主机状态

打开 **设置 → 常规**，即可查看 **网关主机** 卡片，其中包含网关机器、LAN 地址、操作系统、运行时、运行时间、CPU 负载、内存和状态卷磁盘空间。该卡片在可见时会每 10 秒通过需要 `operator.read` 作用域的 `system.info` 网关 RPC 刷新一次。不支持该作用域的旧版网关和连接会省略该卡片。

## 语言支持

Control UI 会在首次加载时根据你的浏览器区域设置进行本地化。若要之后覆盖它，请打开 **Settings -> General -> Language**（选择器位于 General 页面，而不是 Appearance 下）。

- 支持的区域设置：`en`、`ar`、`de`、`es`、`fa`、`fr`、`hi`、`id`、`it`、`ja-JP`、`ko`、`nl`、`pl`、`pt-BR`、`ru`、`th`、`tr`、`uk`、`vi`、`zh-CN`、`zh-TW`
- 非英语翻译会在浏览器中按需加载。
- 所选区域设置会保存在浏览器存储中，并在以后访问时复用。
- 缺失的翻译键会回退为英语。

文档翻译也会为同一组非英语区域设置生成，但文档站点内置的 Mintlify 语言选择器只会列出 Mintlify 接受的区域设置代码。泰语（`th`）和波斯语（`fa`）文档仍会在发布仓库中生成；在 Mintlify 支持这些代码之前，它们可能不会出现在该选择器中。

## Appearance 主题

Appearance 面板内置了 Claw、Knot 和 Dash 主题（Claw 为默认主题），另外还有一个仅限当前浏览器的 tweakcn 导入槽位。要导入主题，请打开 [tweakcn 编辑器](https://tweakcn.com/editor/theme)，选择或创建一个主题，点击 **Share**，然后将复制的链接粘贴到 Appearance 中。导入器也接受 `https://tweakcn.com/r/themes/<id>` 注册表 URL、类似 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 的编辑器 URL、相对路径 `/themes/<id>`、原始主题 ID，以及默认主题名称（例如 `amethyst-haze`）。

导入的主题仅存储在当前浏览器配置中；它们不会写入 gateway 配置，也不会在设备之间同步。替换已导入的主题会更新这个本地槽位；如果清除此项且该导入主题正处于启用状态，则会切回 Claw。

Appearance 还提供了文本大小设置。它适用于聊天文本、composer 文本、工具卡片和聊天侧边栏，并会将文本输入框至少保持为 16px，以免移动端 Safari 在聚焦时自动缩放。

主题、主题模式、文本大小、语言和聊天显示偏好会通过 gateway 配置（`ui.prefs`）同步，因此会随你在不同设备间切换，并且代理可以通过审批门控更改它们——已连接的客户端会通过 gateway 的 `config.changed` 通知实时应用更改。每个浏览器都会保留一个本地镜像以便即时启动；无法写入配置的客户端（viewer 范围、离线）会将更改保留在设备本地。请参见 [Configuration reference](/gateway/configuration-reference#ui)。

## OpenClaw 系统维护

打开 **Settings → Ask OpenClaw**，即可与系统设置和修复代理对话。页面会渲染一个居中的聊天界面，带有动画版的 OpenClaw 吉祥物；当有轮次正在进行时，它会切换为思考姿势。对话不会被困在 Settings 中：线程工作区栏中的龙虾按钮会将同一个实时会话切换为可停靠面板（位于右侧或底部，位置和大小会保存在浏览器配置文件中），而在完整页面对话进行到一半时离开页面会自动将聊天最小化到该停靠区，因此会话会跟随你。完整的 Ask OpenClaw 页面打开时，停靠区会自动隐藏。

每条聊天消息都会携带你当前正在查看的 Control UI 页面，作为不受信任的环境提示，因此像“配置这个频道”或“为什么这个页面是空的？”之类的请求，会根据你正在查看的页面来解析。

引导式频道设置、工作区技能设置以及网页搜索提供方设置，都作为聊天中的托管向导运行：向导步骤会以结构化问题卡片的形式渲染，秘密步骤会在浏览器中遮蔽输入，并且每一次应用的写入都会经过审批、审计和重新验证。如果所选的网页搜索提供方需要安装插件而该安装失败，设置会停止并报告失败，而不会假装提供方已配置完成。有关操作和审批约定，请参见 [`openclaw setup`](/cli/openclaw)。

在入门流程之外，此页面每次访问最多只会显示一个可关闭的事件标签。它对常规 Gateway 流量保持静默，只对报告以下情况的健康快照作出反应：配置重新加载器已禁用、已配置的频道断开连接/降级、频道探测失败，或频道凭据不可用。只有当更新后的事件更严重时，才会替换待处理标签；关闭标签或使用标签后，该次访问的事件提示将被静音。点击标签会将其诊断问题作为真实的 `openclaw.chat` 消息发送，因此对话记录会保留该请求，而 OpenClaw 会执行诊断。入门流程从不显示这些事件标签。

## 管理插件

在侧边栏中打开 **Plugins**，或者使用相对于已配置 Control UI 基础路径的 `/settings/plugins`，即可在不离开 Control UI 的情况下浏览和管理插件。例如，基础路径为 `/openclaw` 时，会使用 `/openclaw/settings/plugins`。即使所有可选插件都被禁用，该页面也始终可用。

Plugins 是一个包含四个选项卡的中心：**Installed** 和 **Discover** 用于在 `/settings/plugins` 管理插件代码，**Skills** 承载位于 `/skills` 的每个代理技能管理器，**Workshop** 承载位于 `/skills/workshop` 的 Skill Workshop 提案审核。每个选项卡都有自己独立的 URL，侧边栏则对所有选项卡仅显示一个 Plugins 入口。

**Installed** 选项卡按类别分组显示完整的本地清单，并附带概览计数。每一行都会打开详情视图；其溢出菜单（`…`）可用于启用或禁用插件，并为外部安装的插件提供 **Remove**。它还会列出已配置的 [MCP servers](/cli/mcp)，并支持在行内添加、禁用和移除它们。相同的服务器控制也位于 **Settings → MCP**。**Discover** 选项卡是商店：包含随 OpenClaw 一起提供的精选插件、官方外部插件，以及针对常用服务的一键式 MCP 连接器。在搜索框中输入会就地查询 [ClawHub](https://clawhub.ai/plugins)，并附加一个 **From ClawHub** 区块，其中包含下载次数和来源验证徽章。深度链接可以通过 `/settings/plugins?tab=discover` 直接指向商店。

**Skills** 选项卡保留技能状态报告、启用/禁用切换、API 密钥输入，以及就地 ClawHub 技能搜索，范围限定于所选代理。**Workshop** 选项卡保留 Skill Workshop 看板和面向 [skill proposals](/tools/skill-workshop) 的 Today 审核流程。**Find skill ideas** 会回顾从最新到最旧的一段有限范围内的重要会话，并将任何结果作为待处理提案保留。该面板显示累计覆盖范围；**Scan earlier work** 会从持久化的游标继续扫描，直到更早的历史耗尽后，按钮会变为 **Scan new work**。当自动自学习被禁用时，手动历史审查仍可工作，并使用所选代理已配置的模型。

内置插件已经存在于 Gateway 上，并显示 **Enable** 或 **Disable**，而不是 **Install**。例如，Workboard 已随 OpenClaw 包含但默认禁用，因此其操作是 **Enable**。捆绑插件不能被移除，只能被禁用。

读取目录和搜索 ClawHub 需要 `operator.read`。安装、启用、禁用或移除插件，以及更改 MCP 服务器，需要 `operator.admin`；对于只读操作者，这些操作会保持禁用状态。

ClawHub 安装通过 Gateway 运行，并与其他由 Gateway 中介的安装保持相同的信任、完整性和插件安装策略检查。安装或移除插件代码需要重启 Gateway。启用或禁用已安装的插件，在插件和当前 Gateway 运行时都支持的情况下可以无需重启；否则 UI 会提示需要重启。基于 OAuth 的 MCP 连接器在添加后，需要通过 CLI 执行一次 `openclaw mcp login <name>`。

该页面有意聚焦于清单、发现、安装、启用和移除。对于任意 npm、git 或本地路径来源、更新以及高级插件配置，请使用 [`openclaw plugins`](/cli/plugins)。

## 应用和扩展

从侧边栏 **更多** 菜单、命令面板或侧边栏代理菜单（**获取应用**）中打开 **应用**，或者使用相对于已配置 Control UI 基础路径的 `/apps`。该页面汇集了 OpenClaw 各个配套界面的安装链接： [iOS](/platforms/ios) 和 [Android](/platforms/android) 应用，以及随附其中的 Apple Watch 和 Wear OS 配套应用，[macOS](/platforms/macos)、[Windows](/platforms/windows) 和 [Linux](/platforms/linux) 桌面应用，[Chrome 扩展](/tools/chrome-extension)，应用内插件中心 [ClawHub](https://clawhub.ai)，以及 Discord 社区和文档。

## 侧边栏导航

侧边栏围绕代理组织所有内容。顶部的身份行是当前活动代理；其下方，**Pages** 部分以 **Home** 开头——这是代理的滚动主会话，带有未读或运行中状态标记——随后是固定的目的地（默认是 **Automations** 和 **Plugins**）。Pages 标题上的自定义控件会打开一个菜单，包含其他所有目的地，包括 **Usage** 和由插件提供的选项卡，以及 **Edit pinned items**；在导航区域上右键会直接打开固定项编辑器。下方的会话列表分为几个区域：**Threads** 用于代理的聊天会话（主会话保留在 Home 之后；它创建的会话会作为顶级线程出现在这里，命名线程则不带类型前缀）、**Groups** 用于群组和房间对话，以及 **Coding** 用于绑定到受管理 worktree 或 exec 节点的会话（行内显示 `repo ⎇ branch` 以及节点主机），还包括基于 ACP 的 harness 会话，以及 Codex/Claude CLI 目录。Coding 在首次运行时默认折叠，并会记住你的选择；其折叠后的标题会保留真实数量，并在其中包含的会话工作时显示运行中指示器。自定义分组（会话的 `category`）和 **Pinned** 行位于 Threads 之上，将会话分配到自定义分组始终优先于自动区域分类。Threads 标题包含排序控件（Created 或 Last updated、Group by，以及持久化的 **Status** 过滤器：Active、Archived 或 All）和打开 New session 页面 的 **+**。Archived 行保持内联显示，带有归档图标并呈灰暗状态；它们不计入未读或关注状态，也不会参与血缘晋升。打开会话只会移动选中高亮，不会重新排序行。具有近期子运行的父会话会显示展开箭头和子项数量；展开后可在不离开侧边栏的情况下查看嵌套子会话、实时或终止状态以及运行时间。选择某个子会话会打开其聊天并自动显示其祖先路径。子行不参与根级分组、固定、拖拽、多选和分页；折叠的区域不会消耗可见页面预算。自上次阅读后有新活动的会话会显示未读圆点，打开后会将其标记为已读。代理还可以发布一条简短的、会过期的状态行，并可选地使用精心设计的琥珀色图标请求关注；当你打开会话、发送下一条消息、显式清除它或其 TTL 到期时，该声明会消失。云工作器生命周期状态使用地球徽标；本地和已回收会话不显示位置徽标，因为本地执行是默认行为。每个根会话行都有一个上下文菜单（kebab 按钮或右键），包含 Pin/Unpin、Mark as unread/read、Rename、Fork、Move to group（包括 New group 和 Remove from group）、Archive 或 Unarchive，以及 Delete；触控布局会保持直接固定和菜单控件可见。Cmd/Ctrl 单击可将根行切换为多选，Shift 单击会沿可见顺序扩展选择；在已选行上打开菜单时，会提供批量操作（Mark N as unread/read、Move N to group、Archive N、Delete N），这些操作会应用于所有已选会话，批量删除只需一次确认。将根会话拖到 **Pinned** 上即可固定它，或拖到自定义分组上将其移动过去。自定义分组标题可以折叠、展开或拖动以重新排序；分组名称及其顺序保存在网关（`sessions.groups.*`）中，因此会在不同浏览器间同步，而折叠状态则保留在浏览器配置文件中。分组标题也有菜单（kebab 按钮或右键），包含 Rename group、New group 和 Delete group；重命名或删除分组会在服务器端更新所有成员会话，包括已归档的会话，而删除分组会保留其会话并将它们移回 Threads。

## 新会话页面

侧边栏会话列表标题中的 **+** 会在 `/new` 打开一个整页草稿：在发送第一条消息之前不会创建任何内容。统一的 **Place** 选择器用于选择工作文件夹；对于管理员操作员，还可选择执行目标：**Gateway · local**、公开 `system.run` 的配对节点，或可用的云配置文件。文件夹默认指向代理工作区；若要使用另一条 Gateway 绝对路径，则需要 `operator.admin`，但它可以直接运行，无需是 Git 检出目录。当所选的 Gateway 文件夹是 Git 检出目录时，同一个选择器会提供可选的 **Worktree** 隔离，并带有一个由 `worktrees.branches` 支持的基础分支选择器（不执行 fetch）以及可选的 worktree 名称（分支将变为 `openclaw/<name>`）。云工作节点需要该受管 worktree 路径；配对节点则从不显示它。撰写区底部栏用于选择新会话的模型和推理级别。其 **Incognito** 开关会创建一个仅限网页的线程，其会话条目、转录和压缩状态都会保留在内存中，直到 Gateway 重启；OpenClaw 也会跳过其自动内存刷新。代理仍然保留其正常工具，因此显式保存请求或工具驱动的文件写入仍可能持久化数据。模型提供方仍会处理消息，且无内容的审计元数据仍会被记录。云端启动会在把会话派发到其工作节点之前，先持久化其模型和推理选择。

在多用户 gateway 上，只有管理员范围的连接才能创建或查看 incognito 线程，其他会话也无法通过代理会话工具或转录搜索访问它们。Incognito 保护的是存储以及其他经由 gateway 中介的用户，而不是 gateway 所有者或进程操作员；后者始终可以观察实时会话。

**浏览文件夹** 会打开 Place 选择器内联的目录浏览器，它由仅管理员可用的 `fs.listDir` 方法支持，并限定在所选的 Gateway 或节点范围内。Gateway 和支持浏览的节点会列出其文件系统；一个具备执行能力但没有 `fs.listDir` 的节点仍然接受输入的绝对路径。最近位置可以将文件夹及其所属节点一并恢复，而不会跨主机携带路径。提交时会调用 `sessions.create` 并附带第一条消息，因此运行会在同一次往返中开始，UI 也会跳转到新会话的聊天界面。如果 Gateway 创建了会话但拒绝了那次首发消息，聊天在重新加载后会保留提示词和错误；**Retry** 会通过已创建的会话重新发送，而不是再创建一个新的。

在 **Settings** 中，专用侧边栏包含 **Ask OpenClaw**，并以一个 **Search settings** 字段开头，用于快速查找设置分区。

在桌面网页端，内容区域左上角有一个固定的控制组——它是 macOS 标题栏条带的网页对应物——其中包含侧边栏折叠切换（⌘B）和命令面板搜索按钮（⌘K）。点击侧边栏顶部的代理身份行会打开代理菜单；**Home** 会打开主会话。当需要处理某些事项时——如失败或逾期的 cron 作业、即将过期或已过期的模型授权——会在侧边栏底部栏上方显示紧凑的提醒徽标，并可点击跳转到对应页面。身份行显示代理的头像（身份图片或表情符号）、名称、连接状态点以及实时副标题。其按代理范围的菜单包含内联代理切换器（多代理设置）、**New agent**、"What can this agent do?" 和 **Agent settings**。超过十个代理的名单会显示过滤字段，并优先列出已固定的代理；可在 Agents 设置页面固定或取消固定代理，固定集合保存在浏览器配置文件中。选择某个代理会将 Chat、Usage、Automations、Tasks、Workboard 和 Sessions 限定到该代理。每个受限页面都提供一个 **Agent** 控件，其中 **All agents** 作为退出选项；这会扩大共享页面范围，但不会改变具体的聊天代理，而直接会话链接仍会打开其目标会话。Agents 设置页面保持其自己的 [URL 选择](/web/urls#route-table)，不会跟随共享页面范围。底部栏是一张通栏身份卡，即使离线也可用，并在上次已知的账户名称下方显示 **Reconnecting…**。它会打开应用/账户菜单，其中的个人资料身份头部之后依次是 **Settings**、**Usage**、移动设备配对、**Get the apps**、**Help**（帮助、Discord、Docs 和更新日志）、在需要时提供离线重试操作、版本/构建徽标以及颜色模式切换。构建徽标会打开 About 页面。当 gateway 从源码检出目录运行且所在分支不是 `main` 时，底部栏还会用红色显示该分支名称，以便一眼看出这是非发布版 gateway（发布版安装从不显示它）。在 Apple 平台上按 Shift-Command-Comma，或在其他平台上按 Ctrl-Shift-Comma，会打开 **Settings**，且不会覆盖浏览器原生的 Command-Comma 快捷键。折叠侧边栏（⌘B 或该控制组的切换按钮）会将其完全隐藏，以获得全宽工作区；在折叠状态下，左上角控制组会保留展开切换和搜索，并新增一个新线程按钮——这与 macOS 应用在标题栏中原生承载的内容相呼应。桌面端仅侧边栏是导航外壳，没有顶部栏。窄视口会将侧边栏替换为一个抽屉式侧滑面板，面板后方有一条紧凑的头部行，包含抽屉切换、品牌和命令面板搜索；在手机上，Chat 会把那条导航行吸收到自己的标题栏中，菜单和搜索控件位于会话标题旁。在 macOS 应用中，单独的头部行会将标题栏留白折叠为控制按钮旁的一条紧凑条带。导航使用普通浏览器历史记录，因此浏览器的后退/前进按钮可以在其中切换；macOS 应用在窗口控制按钮旁增加了原生侧边栏切换，以及触控板滑动手势，并在侧边栏展开时于其右边缘提供后退/前进按钮，在折叠时提供原生搜索（命令面板）和新会话按钮。

待批准事项也会在侧边栏底部栏上方贡献一个提醒徽标；
选择它即可打开所属的 Approvals 页面。

## 它目前能做什么

<AccordionGroup>
  <Accordion title="聊天和对话">
    - 通过 Gateway WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）。已归档会话会禁用输入框，并在继续对话前显示带有 **取消归档** 操作的横幅。
    - 聊天历史刷新会请求一个受限的最近窗口，并对每条消息设置文本上限，因此大型会话不会迫使浏览器在聊天可用前渲染完整转录载荷。
    - 悬停或用键盘聚焦公开的 GitHub issue 或 pull request 链接时，会显示其状态、标题、作者、最近活动、评论和变更统计。已连接的 Gateway 会在不改变链接目标的情况下获取并缓存公开元数据，即使 UI 使用远程 Gateway 也是如此。Gateway 在确认仓库为公开后，会在可用时使用 `GH_TOKEN` 或 `GITHUB_TOKEN`；否则会使用 GitHub 的匿名 API，并采用更长的缓存。
    - 通过浏览器实时会话进行对话。OpenAI 使用直接 WebRTC，Google Live 使用通过 WebSocket 的受限一次性浏览器令牌，而仅后端的实时语音插件使用 Gateway 中继传输。支持视频的浏览器会话可以在设置中选择设备本地摄像头，或在实时预览中切换摄像头；浏览器会为实时提供方捕获 JPEG 帧，而不会通过 Gateway 流式传输摄像视频。由客户端拥有的提供方会话以 `talk.client.create` 开始；Gateway 中继会话以 `talk.session.create` 开始。中继会将提供方凭据保留在 Gateway 上，而浏览器通过 `talk.session.appendAudio` 传输麦克风 PCM，转发 `openclaw_agent_consult` 提供方工具调用供 Gateway 策略和更大的已配置 OpenClaw 模型处理，并通过 `talk.client.steer` 或 `talk.session.steer` 路由活跃运行中的语音引导。GPT-Live 会话不同：其委派工作运行在 Gateway 拥有的 sideband 上，因此不适用 steering——新的口头任务会取代正在运行的委派。可在 **设置 → 对话** 中配置实时提供方、模型和说话人声音，其选择项来自 `talk.catalog`，并显示所选项是否已准备就绪。
    - 在聊天中流式显示工具调用和实时工具输出卡片（agent events）。工具活动会以具备类型感知的行呈现：shell 命令显示带语法高亮的命令和类终端输出；受支持的 edit 和 write 调用会显示受限的行内 diff、行号（如有）以及 `+added -removed` 统计；连续调用会折叠为摘要，例如“运行了 13 个命令，读取了 6 个文件，编辑了 9 个文件”。运行过程中，最新正在执行的调用会命名组标题。展开某一行可查看其剩余参数和原始输出。
    - 为复杂工具调用提供可选的 AI 目的标题（长 shell 命令、参数很多的插件工具），通过 `gateway.controlUi.toolTitles: true` 启用（默认关闭）。标题来自通过标准 utility-model 路由的批处理 `chat.toolTitles` 方法——优先使用显式 `utilityModel`（由操作员选择的提供方，类似其他 utility 任务），否则使用会话提供方声明的小模型默认值——并按 agent 在 Gateway 侧缓存。关闭该可选项或没有可用的便宜模型时，行将保持确定性标签，并且不会发生模型调用。
    - 启动或关闭临时的模型建议后续任务；接受建议会打开一个新的受管工作树会话，并带有建议的提示词。
    - 活动选项卡提供浏览器本地、优先脱敏的实时工具活动摘要，来自现有的 `session.tool` / 工具事件传递。

  </Accordion>
  <Accordion title="通道、会话、记忆">
    - 通道：内置以及捆绑/外部插件通道状态、二维码登录，以及每个通道的配置（`channels.status`、`web.login.*`、`config.patch`）。
    - 通道探测刷新会在慢速提供方检查完成期间保持上一份快照可见，并在探测或审计超出其 UI 预算时为部分快照加标签。
    - 线程（位于 `/sessions` 的工作区页面，旁边有一个 **Worktrees** 选项卡）：默认列出已配置 agent 的会话，可固定常用会话、重命名、归档或恢复非活跃会话、从过时的未配置 agent 会话键回退，并应用每个会话的模型/思考/快速/详细/追踪/推理覆盖项（`sessions.list`、`sessions.patch`）。一个三态 **Active / Archived / All** 过滤器同时控制此页面和侧边栏；All 会将归档行置灰并显式标记。归档会话保留其转录，绝不会被自动清理，并会一直保留，直到被明确取消归档或删除。对于自上次读取以来有活动的活跃会话，行上会显示未读点，支持标记未读/标记已读操作（`sessions.patch { unread }`），以及 Fork 操作，可将转录分支成一个新会话（`sessions.create { parentSessionKey, fork: true }`）。表格上方的概览卡片汇总已加载名册（会话数、运行中的任务、未读会话、总 token 数，以及可用时的归档数），每一行都有带实时运行点的种类图标，状态以普通圆点加标签呈现，Tokens 列在会话报告 token 和上下文大小时显示上下文窗口使用计量条。行管理操作位于每行菜单中（kebab 按钮或右键菜单），与侧边栏的会话菜单一致，行抽屉会在其他会话详情旁显示 agent 运行时和运行时长。
    - 原生 Claude 和 Codex 侧边栏目录一次只流式处理一个主机，然后会在节点连接变化、页面聚焦时以及可见期间最多每 30 秒进行一次协调。目录变化会触发更快的后续扫描，因此在原生工具中创建的会话无需重新加载 Control UI 就会出现。Claude Desktop 的行在存在本地自定义组标签时也会保留该标签；OpenClaw 从 Desktop 的本地存储读取该映射，并且从不写回。
    - 会话分组：通过 Group by 控件可将会话表按自定义组、通道、种类、agent 或日期分区。自定义组通过 `sessions.patch`（`category`）按会话持久化，因此从消息通道（Discord、Telegram、WhatsApp，……）启动的会话也可以被分类；可通过将行拖到某个分区、使用每行组选择器，或通过 New group 操作来创建分组。
    - 记忆（Agents 页面上的一个选项卡，范围限定为所选 agent）：做梦状态、启用/禁用切换，以及 Dream Diary 读取器（`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`）。
    - 导入记忆（`/memory-import`，从 Agents 页面中的 Memory 选项卡进入）：预览并将本地 Claude Code 自动记忆、Codex 汇总记忆或 Hermes 记忆文件复制到所选 agent 工作区（`migrations.memory.plan`、`migrations.memory.apply`）。
    - 入门记忆提示：当 Control UI 以 [入门模式](/web/urls#special-documents-and-startup-modes) 打开时，会弹出一个单页对话框，提供以相同的计划/应用流程导入检测到的记忆；跳过后，设置页面会作为稍后入口。

  </Accordion>
  <Accordion title="Cron、任务、插件、技能、设备、执行审批">
    - 自动化（cron 作业）：在 Automations/Run history 选项卡切换上方显示统计卡片（自动化数量、失败数量、调度器状态、下次唤醒）；Automations 选项卡以可过滤表格列出作业（All/Active/Paused、搜索、计划和最近运行过滤器、每行操作菜单），下方有起始建议，而 Run history 选项卡显示所有自动化的最近运行（`cron.*`）。
    - 任务：实时活跃与最近后台任务账本，带关联会话和取消功能（`tasks.*`）。聊天的后台任务侧栏会将运行中和已完成工作分组；选择某一行会在侧栏中打开一个紧凑的详情视图，包含返回按钮、受限提示词、实时活动以及输出或错误摘要。
    - 插件：浏览已安装清单和精选商店，搜索 ClawHub，安装和移除插件代码，以及启用或禁用已安装插件（`plugins.*`）；MCP 服务器行通过配置方法编辑 `mcp.servers`。
    - 技能：状态、启用/禁用、安装、API 密钥更新（`skills.*`）。
    - 设备：一个清单整合了已配对设备记录、节点目录和在线存在状态（`device.pair.list`、`node.list`、`system-presence`）。Gateway 主机固定在最前；已配对客户端显示连接状态、角色、令牌、能力和命令。重复配对会折叠为可展开分组，而 **Clean up N stale** 会批量移除经管理员确认的离线重复项，这些重复项要么是自动批准的（静默本地、受信任 CIDR 或 SSH 验证），要么早于批准来源记录。可移除条目（`node.pair.remove`、`device.pair.remove`），设备配对和节点重新批准可在行内处理（`device.pair.*`、`node.pair.approve`/`reject`），移动设备设置代码也可从同一张卡片创建。
    - 执行审批：编辑 gateway 或 node 允许列表，并为 `exec host=gateway/node` 询问策略（`exec.approvals.*`）。

  </Accordion>
  <Accordion title="配置">
    - 查看/编辑 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）。
    - 设置导航从 Ask OpenClaw 开始，然后按关注点分组页面：顶部是 General、Appearance 和 Notifications；Connections（Connection、Channels、Communications、Talk、Devices）；Agents & Tools（Agents、AI & Agents、Model Providers、MCP、Automation、Labs）；Privacy & Security（Security、Approvals）；以及 System（Infrastructure、Advanced、Debug、Logs、About）。General 是一个精简中心，包含模型默认值、语言和 gateway 主机统计；其他每个设置都只位于一个页面上。
    - 隐私与安全：在基于 schema 的 `security`/`approvals` 区段上方，提供 gateway 认证、执行策略、浏览器启用、工具配置文件、设备认证和移动配对的精选行。
    - Approvals 包含按最新优先排序、覆盖 30 天的已解决 exec、插件和系统 agent 请求历史。可按种类过滤或翻页查看更早的行，以审查 Gateway 记录的决策、原因、来源会话和解析者归属。
    - Labs 公开已发布的实验性开关。Code Mode 和 Swarm 是当前条目，会立即保存 `tools.codeMode.enabled` 和 `tools.swarm.enabled`；未发布实验不会显示，也不会写入推测性的配置键。
    - Notifications：浏览器 web-push 状态、订阅/取消订阅，以及测试发送。
    - Advanced：除精选入口之外的所有配置区段，以及原始 JSON5 编辑器（此前是 General 页面中的 Advanced 模式）。
    - Model Setup（`/settings/model-setup`）是 Model Providers 的子页面，可从其标题启动。
    - Agents：一个设置页面（**设置 → Agents**，`/settings/agents`），带每个 agent 的选项卡（Overview、Files、Tools、Skills、Channels、Automations、Memory）。Overview 选项卡可编辑 agent 身份——显示名称、emoji，以及一个会在浏览器中先进行缩放并限制尺寸后再 `agents.update` 的头像图片。保存时会存储已配置的身份字段，并将其镜像到工作区的 `IDENTITY.md`；已配置值优先于对同一文件字段的手动编辑。
    - Profile：一个设置页面，显示默认 agent 的身份以及全时段使用统计——累计 token、峰值日、最长会话、活跃连续天数、一年期 token 热力图、热门工具和通道亮点（`usage.cost`、`sessions.usage`）。
    - MCP 有专门的设置页面，包含服务器行（传输、启用状态、OAuth/过滤/并行摘要）、直接添加/启用/禁用/移除控件、常用操作员命令，以及作用域限定的 `mcp` 配置编辑器。Plugins 页面仍然是一次性连接器和发现功能的入口。
    - Model Providers：一个设置页面，列出每个已配置的模型提供方，带其品牌图标、认证状态（`models.authStatus`）、模型可用性（`models.list`）、提供方上报的实时计划/配额/计费数据（`usage.status`），以及最近 30 天的本地会话支出（`sessions.usage`）。Refresh 操作会重新读取凭据状态和提供方使用情况。
    - Connection：一个设置页面（位于 **Connections** 下），负责 dashboard 自身的 gateway 链接——WebSocket URL、gateway token、密码和默认会话键——以及最新握手快照（状态、运行时间、tick 间隔、最近一次通道刷新）。离线登录门会处理断开连接的情况；此页面在连接状态下编辑连接。
    - 使用验证应用并重启（`config.apply`），然后唤醒最后一个活跃会话。
    - 写入包含 base-hash 保护，以防止覆盖并发编辑。
    - 写入（`config.set`/`config.apply`/`config.patch`）会预检已提交配置载荷中引用的活动 SecretRef 解析；未解析的活动提交引用会在写入前被拒绝。
    - 表单保存会丢弃无法从已保存配置中恢复的过期脱敏占位符，同时保留仍能映射到已保存密钥的脱敏值。
    - Schema 和表单渲染来自 `config.schema` / `config.schema.lookup`，包括字段 `title`/`description`、匹配的 UI 提示、即时子摘要、嵌套对象/通配符/数组/组合节点上的文档元数据，以及在可用时的插件和通道 schema。只有当快照具备安全的原始往返能力时，才可使用原始 JSON 编辑器；否则 Control UI 会强制使用表单模式。
    - 原始 JSON 编辑器中的“Reset to saved”会保留原始编写的形状（格式、注释、`$include` 布局），而不是重新渲染为扁平化快照，因此当快照可以安全往返时，外部编辑在重置后仍可保留。
    - 结构化 SecretRef 对象值会在表单文本输入中以只读方式渲染，以防止意外的对象转字符串损坏。

  </Accordion>
  <Accordion title="使用情况">
    - 基于会话的 token 和预估成本分析与提供方计费分开。
    - 提供方卡片会调用 `usage.status`，并显示已配置提供方插件上报的实时计划名称、配额窗口、余额、支出和预算。
    - 提供方使用情况失败不会阻塞会话/成本仪表板；不可用的提供方卡片会显示其自身错误状态。

  </Accordion>
  <Accordion title="调试、日志、更新">
    - Debug：状态/健康状况/模型快照、事件日志，以及手动 RPC 调用（`status`、`health`、`models.list`）。
    - 事件日志包含 Control UI 刷新/RPC 耗时、缓慢的聊天/配置渲染耗时，以及当浏览器暴露这些 PerformanceObserver 条目类型时，针对长动画帧或长任务的浏览器响应性条目。
    - Logs：带过滤/导出的 gateway 文件日志实时尾随（`logs.tail`）。
    - Update：执行包/git 更新加重启（`update.run`），附带重启报告，然后在重新连接后轮询 `update.status` 以验证正在运行的 gateway 版本。

  </Accordion>
  <Accordion title="自动化面板说明">
    - 选择一行会打开全页详情视图，标题栏包含 Active/Paused 切换和 Run now（其菜单中还有 run-if-due、clone 和 remove）；Settings 选项卡可行内编辑自动化（提示词、详情、频率、advanced 覆盖项），Run history 选项卡显示该自动化的运行记录。
    - 表格下方的 starter automations 会使用可编辑的提示词和计划预填创建表单。
    - 对于隔离任务，交付方式默认是 announce summary；切换为 none 则仅用于内部运行。
    - 选择 announce 时会出现 Channel/target 字段。
    - webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设为有效的 HTTP(S) webhook URL。
    - 对于主会话任务，可使用 webhook 和 none 两种交付方式。
    - 高级编辑控件包括 delete-after-run、clear agent override、cron exact/stagger 选项、agent model/thinking 覆盖项，以及 best-effort 交付切换。
    - 表单验证为行内字段级错误；无效值会禁用保存按钮，直到修正为止。
    - 将 `cron.webhookToken` 设为专用 bearer token；若省略，则 webhook 发送时不带认证头。
    - `cron.webhook` 是已退役的旧回退项，会被当前配置验证拒绝。运行 `openclaw doctor --fix` 可迁移仍使用 `notify: true` 的已存储作业，使其改为显式的按作业 webhook 或完成交付，并移除旧键。

  </Accordion>
</AccordionGroup>

## 导入助手记忆

打开 **设置** → **导入记忆**，将本地 Codex 或 Claude Code 记忆导入到 OpenClaw 代理中。Gateway 会自动在其自身主机上发现受支持的本地记忆，因此远程 Control UI 是从 Gateway 计算机而不是浏览器计算机导入的。

1. 选择目标代理。
2. 审阅检测到的源集合和 Markdown 文件名。文件内容不会在计划响应中发送，也不会显示在页面上。
3. 选择要导入的集合并确认。应用会在写入前重新构建计划，因此过时的选择会安全失败。
4. 如果文件已存在，启用 **替换现有导入**，刷新预览，然后确认替换。

Codex 仅导入其汇总后的 `MEMORY.md` 和 `memory_summary.md`。Claude Code 会从项目自动记忆目录以及已配置的 `autoMemoryDirectory` 导入 Markdown；它不会通过此页面导入会话、设置、指令或凭据。文件会被复制到所选工作区下的 `memory/imports/` 中，活动记忆插件可在此对其进行索引。源文件不会被更改。

规划和应用需要 `operator.admin`。每次应用都会在状态存在时创建经过验证的 OpenClaw 备份，写入一份已脱敏的迁移报告，并在替换现有目标文件之前保留逐项备份。有关路径和回忆行为，请参阅 [记忆概览](/concepts/memory#import-from-coding-assistants)。

## MCP 页面

专用的 MCP 页面是面向 OpenClaw 管理的 `mcp.servers` 下 MCP 服务器的操作员视图。它不会自行启动 MCP 传输；请用它来检查和编辑已保存配置，然后在需要实时服务器证明时使用 `openclaw mcp doctor --probe`。

典型工作流：

1. 从侧边栏打开 **MCP**。
2. 检查汇总卡片，了解总数、已启用、OAuth 和已过滤服务器数量。
3. 查看每一行服务器的传输方式、启用状态、认证、过滤器、超时和命令提示。
4. 直接在 MCP 页面上添加、启用、禁用或移除服务器。明确选择 Streamable HTTP、SSE 或 stdio；stdio 命令行接受带引号的参数，例如包含空格的路径。单击式连接器和发现请使用 **Plugins** 页面。
5. 编辑作用域内的 `mcp` 配置部分，以配置高级服务器字段，例如环境变量、工作目录、请求头、TLS/mTLS 路径、OAuth 元数据、工具过滤器和 Codex 投影元数据。
6. 使用 **Save** 进行配置写入，或使用 **Save & Publish** 让正在运行的 Gateway 应用更改后的配置。
7. 在终端中运行 `openclaw mcp status --verbose`、`openclaw mcp doctor --probe` 或 `openclaw mcp reload`，用于静态诊断、实时验证或清除缓存运行时。

在渲染之前，此页面会对包含凭据的类 URL 值进行脱敏，并在命令片段中为服务器名称加引号，这样复制后的命令在包含空格或 shell 元字符时仍可正常工作。完整的 CLI 和配置参考： [MCP](/cli/mcp)。

## Activity 标签页

Activity 标签页位于 **Settings › System** 中，紧挨着 Logs 和 Debug。它是一个临时的、浏览器本地的观察器，用于查看实时工具活动，来源于与 Chat 工具卡片相同的 Gateway `session.tool` / 工具事件流。它不会添加另一种 Gateway 事件类别、端点、持久化活动存储、指标馈送或外部观察器流。

Activity 条目只保留已脱敏摘要和经过脱敏、截断的输出预览。工具参数值不会存储在 Activity 状态中；UI 会显示这些参数已被隐藏，并且只记录参数字段数量。内存中的列表会随当前浏览器标签页变化，在 Control UI 内导航时会保留，并在页面重新加载、会话切换或点击 **Clear** 时重置。

## 操作终端

停靠式操作终端默认已启用；如需关闭，请设置 `gateway.terminal.enabled: false` 并重启 Gateway。终端需要 `operator.admin` 连接，并会在当前活跃的 agent 工作区中打开一个主机 PTY。新标签页会跟随当前选中的聊天 agent。

<Warning>
该终端是一个不受限制的主机 shell，并会继承 Gateway 进程环境。如果在不应让管理员操作员获得主机 shell 的部署中，请使用 `gateway.terminal.enabled: false` 将其禁用。对于 `sandbox.mode: "all"` 的 agent，OpenClaw 会拒绝终端会话；将某个活跃 agent 更改为该模式会关闭其现有的以及进行中的终端会话。
</Warning>

使用 **Ctrl + backtick** 切换停靠面板。布局支持底部和右侧停靠，会随浏览器视口调整大小，并可保留多个 shell 标签页。有关 `gateway.terminal.enabled` 以及可选的 `gateway.terminal.shell` 覆盖项，请参阅 [Gateway 配置](/gateway/configuration-reference#gateway)。

经所有者授权且未受沙箱限制的 agent 可使用 `terminal` 工具进行耗时或交互式工作，供操作员监看。每次工具调用都可打开、读取、写入、调整大小、关闭或列出该 agent 自己的 Gateway PTY。新会话默认会打开一个并排的 Control UI 标签页，因此 agent 和操作员共享输出，任一方都可以输入或调整大小。Agent 的访问权限严格限定在会话级别：某个 agent 不能读取或控制由操作员创建的终端，也不能读取或控制由其他 agent 会话打开的终端。

将一个或多个文件拖到活动终端上，或使用回形针按钮选择文件。OpenClaw 会把每个文件暂存到拥有该 PTY 的机器上，并在光标处粘贴带 Shell 引号的绝对路径；它绝不会按 Enter 或执行输入内容。紧凑的批次指示器会显示当前文件和已完成计数。取消会停止剩余批次而不会粘贴路径；失败的传输会保持可见，因此你可以从该文件继续重试，而无需重新上传已完成的文件。支持图片、PDF、压缩包及其他文件类型，每个文件最大 16 MiB。暂存文件会使用 POSIX 主机上的私有系统临时目录（目录模式 `0700`，文件模式 `0600`），或 Windows 上用户配置文件 ACL 边界下的目录，并附带 24 小时清理计时器，因此请将任何需要保留的内容移动或复制出来。

路径插入支持 PowerShell、`cmd.exe` 和已识别的 POSIX shells（`sh`、Bash、Dash、Ash、Ksh、Zsh 和 Fish），包括 Windows 上的 Git Bash。其他 shell 覆盖项会被拒绝，因为无法安全推断其引用规则；如需原生 WSL 终端和 Linux 上传路径，请在 WSL 内运行 Gateway。`cmd.exe` 中包含 `%` 或 `!` 的路径也会被拒绝，因为该 shell 即使在双引号内也会展开这些字符。

在 sessions 侧边栏中发现的 Codex 和 Claude Code 会话可以在同一终端面板内以其原生 CLI 打开。在 **Settings › Chat** 中，将 **Open Codex/Claude threads in** 设置为 **Terminal**，即可让普通行点击打开 `codex resume` 或 `claude --resume`；默认仍为只读的 OpenClaw 查看器。对某一行的右键菜单或三点菜单始终提供这两种选择，并且当该会话符合条件时，查看器标题栏会包含 **Open in terminal**。

资格判定按会话和主机分别进行。Gateway 本地会话会在 Gateway 主机上启动由提供方拥有的 resume 命令。成对节点会话会在所属节点上启动允许列表中的提供方命令，并且只转发该 PTY 的输出、输入和调整大小事件；这不会暴露通用节点 shell，也不会接受浏览器提供的命令。文件上传使用单独的、大小受限的 `terminal.upload` 节点命令，并且仍绑定到已打开的终端会话。请在该命令首次出现时批准节点配对升级。不提供匹配的 terminal-resume 命令的节点，包括没有双向流式传输的嵌入式 worker bridge，会继续保留查看器并将打开终端显示为不可用；较旧的节点仍然可以运行终端，但不能接收拖拽文件。

由连接拥有的会话在断开连接后会继续存在：页面刷新、笔记本睡眠或网络抖动不会终止会话，而是会在 Gateway 上解除绑定，之后同一浏览器标签页会在重新连接时重新附加，并回放最近的输出。已分离的连接拥有会话会在 `gateway.terminal.detachedSessionTimeoutSeconds` 之后被终止（默认 300 秒；设为 `0` 可恢复为断开即终止）。附加这类会话时仍采用 tmux 风格的接管方式。

由 agent 拥有的会话不绑定浏览器连接。`terminal.attach` 会将每个浏览器添加为查看者而不转移所有权，关闭查看器标签页只会分离该浏览器。PTY 会一直保留，直到拥有它的 agent 关闭它、其进程退出、策略将其禁用，或 Gateway 关闭。`terminal.list` 会将每个条目标记为由连接拥有或由 agent 拥有，`terminal.text` 则允许管理员连接在不附加的情况下读取最近的纯文本输出。

终端也可作为 [全屏终端文档](/web/urls#special-documents-and-startup-modes) 使用。iOS 和 Android 应用会在其 Terminal 界面中嵌入此页面，并复用已保存的 Gateway 凭据；可用性遵循相同的 `gateway.terminal.enabled` 和 `operator.admin` 门禁条件，并且当连接的 Gateway 不提供终端时，页面会显示提示。

## 浏览器面板

Control UI 自带一个可停靠的浏览器面板，它会在任何普通网页浏览器中渲染由 Gateway 控制的浏览器（也就是代理通过 [browser tool](/tools/browser-control) 操作的那个浏览器）——无需原生 webview。当前连接的 Gateway 向 `operator.admin` 连接通告 `browser.request` 时，该面板会显示；线程工作区侧边栏中的地球按钮可切换它。该面板会显示带标签页的实时页面快照、可编辑的 URL 栏、后退/前进/刷新、以及在浏览器中打开，并可停靠在右侧或底部，同时将点击、滚轮滚动和基础输入转发到远程页面。

有两种捕获模式可为代理打包页面上下文：

- **标注（铅笔）**：在页面上自由绘制标记。**发送到聊天** 会将这些笔画合成为截图，把图片附加到当前聊天编辑器，并预填一段提示，说明页面 URL、标题以及每个标记区域，这样代理就能准确知道你圈出了什么。
- **检查（指针）**：悬停可查看光标下的元素（选择器、可访问名称、角色、大小）；点击则会通过同样的编辑器流程发送该元素的详细信息以及一张高亮截图。检查、滚轮滚动和前进/后退需要 `browser.evaluateEnabled`（默认开启）。

macOS 应用会为在仪表盘中点击的链接保留其原生链接浏览器侧边栏；浏览器面板在该平台同样可用，并且是在其他所有平台上为页面添加标注的方式。

## 聊天行为

<AccordionGroup>
  <Accordion title="发送和历史语义">
    - `chat.send` 是**非阻塞**的：它会立即确认并返回 `{ runId, status: "started" }`，响应则通过 `chat` 事件流式返回。受信任的 Control UI 客户端还可能收到可选的 ACK 时序元数据，用于本地诊断。
    - 聊天上传接受图片和非视频文件。图片保留原生图片路径；其他文件存储为受管媒体，并在历史中显示为附件链接。
    - 使用相同的 `idempotencyKey` 重新发送时，在运行中返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
    - `chat.history` 响应在大小上有边界，以保证 UI 安全。当转录条目过大时，Gateway 可能会截断较长文本字段、略去较重的元数据块，并用占位符（`[chat.history omitted: message too large]`）替换超大消息。
    - 当一个可见的助手消息在 `chat.history` 中被截断时，侧边阅读器可以按需通过 `chat.message.get` 获取完整的、显示归一化后的转录条目；需要时可按 `sessionKey`、活动的 `agentId` 以及转录 `messageId` 查询。如果 Gateway 仍然无法返回更多内容，阅读器会显示明确的不可用状态，而不是静默重复截断后的预览。
    - 助手/生成的图片会作为受管媒体引用持久化。新客户端通过经过认证的 `artifacts.download` 解析其稳定的工件 id，并接收短期有效、精确资源的媒体 URL，因此重新加载不依赖原始 base64 负载或图片 URL 中可复用的凭据。
    - 渲染 `chat.history` 时，Control UI 会从可见的助手文本中剥离仅用于显示的行内指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块），以及泄露的 ASCII/全角模型控制 token。它会省略那些整条可见文本仅为精确静默 token `NO_REPLY` / `no_reply` 或心跳确认 token `HEARTBEAT_OK` 的助手条目。
    - 在一次活跃发送和最终历史刷新期间，如果 `chat.history` 短暂返回较旧快照，聊天视图会保留本地乐观的用户/助手消息可见；当 Gateway 历史追上后，规范转录会替换这些本地消息。
    - 实时 `chat` 事件表示投递状态，而 `chat.history` 则从持久化会话转录重建。工具最终事件之后，Control UI 会重新加载历史并只合并一小段乐观尾部；转录边界记录在 [WebChat](/web/webchat) 中。
    - `chat.inject` 会向会话转录追加一条助手备注，并广播一个 `chat` 事件用于仅 UI 更新（不触发 agent 运行，也不进行通道投递）。
    - 侧边栏按 agent 分区以及 pinned/channel/work/custom/Chats 桶列出所有已加载的活动会话，只有一个 New Session 操作会打开草稿对话。打开可见行只会移动高亮。会话可以拖到 Pinned 上进行固定，或拖到自定义分组/Chats 上进行移动；自定义分组可折叠且可拖拽重排，分组名称和顺序通过 gateway 同步，折叠状态保留在浏览器中。新的 dashboard 会话会在异步过程中根据第一条非命令消息生成一个简短标题；显式命名和经过身份验证的发送者身份是分开的，因此账户名绝不会被用作生成标题。当 New Session 创建 worktree 且未显式提供 worktree 名称时，OpenClaw 还会使用会话标签或生成标题作为分支名，否则回退到一个可读的、以甲壳类为主题的名称。设置 `agents.defaults.utilityModel`（或 `agents.entries.*.utilityModel`）可以把这次独立的模型调用路由到更低成本的模型；如果该独立模型失败，标题生成会用主模型重试一次。展开另一个 agent 分区时，会在不离开当前打开聊天的情况下浏览该 agent 的会话。
    - 线程搜索位于命令面板（⌘K，或左上角控制组中的搜索按钮）：输入查询后，会跨 agent 追踪有限数量的匹配页面，过滤内部子任务/cron 行，并在导航命令旁列出可见匹配项。Threads 页面保留完整的可搜索列表和过滤器。
    - 每个侧边栏行都保留直接置顶访问以及完整上下文菜单，用于未读状态、重命名、fork、分组、归档和删除。多选行（Cmd/Ctrl 单击、Shift 选择范围）会获得一个批量菜单，涵盖未读状态、分组、归档和删除；仅当所选会话全部可归档时，批量归档/删除才可用。活动运行和某个 agent 的主会话不能归档。归档或删除当前选中的会话会将 Chat 切回该 agent 的主会话。
    - 在 macOS 应用中，OpenClaw 标志会使用靠近窗口控制按钮、原本为空的原生标题栏区域，而不是占用侧边栏行。
    - 在桌面宽度下，聊天控件保持在一行紧凑排列，并会在向下滚动转录时折叠；向上滚动、回到顶部或到达底部时会恢复控件。
    - 当其他人正在查看同一会话时，会话标题栏会在工作区芯片旁显示一个小的头像堆叠；它最多列出四个查看者头像并带有溢出计数，独自一人时则消失。
    - 连续的重复纯文本消息会渲染为一个带计数徽标的气泡。包含图片、附件、工具输出或画布预览的消息不会折叠。
    - 用户消息气泡带有转录操作：悬停回退按钮（带确认弹出框和“不要再询问”选项）以及右键 **Rewind to here** 和 **Fork from here**。Rewind 会将会话指回该消息之前的状态，并把其文本返回给编写器以便编辑后重新发送（`sessions.rewind`，`operator.admin`）；fork 会基于该消息之前的活动路径前缀创建一个新会话，打开它，并用同样的文本预填其编写器（`sessions.fork`，`operator.write`）。当 agent 正在工作时，这两种操作都会禁用并显示说明性工具提示，仅适用于已持久化的用户消息，并且对于对话由外部 agent harness 拥有的会话会被拒绝。Rewind 只会移动聊天上下文——文件和其他工具副作用不会被回滚——并且回退前的转录会保留在仅追加的会话存储中。当该存储包含多个转录分支时，聊天标题栏会显示一个分支菜单，其中列出每个分支的最新消息、消息数量和最近程度；选择一个非活动分支会将当前会话切回该保留路径（`sessions.branches.list`，`operator.read`；`sessions.branches.switch`，`operator.admin`）。在 agent 工作时分支切换同样不可用，而选择已经处于活动状态的分支在 RPC 边界上会被视为有类型的 no-op 错误。用户气泡上的单独隐藏操作只会在当前浏览器中隐藏一条消息；该消息仍保留在转录中，agent 也仍然能看到它。
    - 当某个会话的 checkout 位于 GitHub 仓库的非默认分支上时，聊天视图会在编写器上方固定显示 pull request 芯片：PR 编号、仓库、分支、差异统计、CI pill，以及 draft/merged/closed 状态，每个都链接到对应 PR。该行最多显示两个芯片——先显示实时（open/draft）PR——并且一个“Show more”按钮会展开折叠的 merged/closed 历史。CI pill 会打开一个小型 CI 监控弹出层，其中包含 passed/failed/running/skipped 检查计数以及 PR checks 页面链接。检测通过 `controlUi.sessionPullRequests` 在服务端运行，该方法在可用时复用 Gateway 的 `GH_TOKEN`/`GITHUB_TOKEN`。当触及 GitHub API 速率限制时，芯片会保留上次已知状态，并显示状态可能过期的警告；关闭某个芯片会在当前浏览器配置中将其对该会话隐藏。在任何 PR 存在之前，该行会显示分支本身——仓库、分支名，以及相对于默认分支合并基线的 diff 大小（已提交和未提交工作）。一旦推送的分支已有可比较提交，该行会增加一个 Create PR 按钮，打开 GitHub 的新 pull request 页面；在此之前，只要会话有变更文件（已提交、未提交或未跟踪），仍会显示该行但不会有按钮。当存在 open 或 draft PR 时，该行会自行隐藏；一旦分支的 PR 被合并且推送的 tip 仍与合并的 head 匹配，该行也会消失（仅当出现新的本地工作时才会在没有 Create PR 按钮的情况下重新出现，而当有新提交推送到合并 head 之后时则会带着按钮重新出现）。分支行仅来自本地 git，因此在 GitHub 受到速率限制时它仍可用，并且会携带相同的过期状态警告，因为在限制重置之前，“未找到 PR”并不可靠。
    - 会话 diff 面板显示某个会话的 checkout 实际改动了什么：工作区轨道或聊天标题栏中的分支按钮会打开详细面板，展示相对于 checkout 默认分支合并基线的分支、未提交和未跟踪工作按文件划分的 diff——状态点、重命名箭头、每个文件的 +/− 计数、可折叠文件，以及 hunks 之间的 “N unmodified lines” 标记。diff 通过 `sessions.diff` Gateway 方法在服务端计算（`operator.read` 范围）；二进制和过大的文件会降级为仅统计条目，并且只有在已连接的 Gateway 声明支持 `sessions.diff` 时按钮才会出现。
    - 每个 Chat 面板都有一个标题栏。点击会话标题可以重命名；工作区芯片会复制 checkout 路径或分支，并且可以在宿主文件管理器中显示本地 Gateway 工作区。远程和 exec-node 会话保留复制操作，但隐藏显示。
    - 每个 Chat 面板中的线程工作区轨道会列出线程文件、项目文件和工件。默认情况下它停靠在面板右侧；拖动其标题栏（或使用停靠按钮）可将其移动到底部，该选择保存在当前浏览器配置中。折叠后的轨道不占任何空间：可通过 ⇧⌘B 或标题栏中的文件切换按钮重新打开，它带有变更文件数量徽标。独立的文件、工具和 Canvas 详情面板不受影响。
    - 在聊天中点击文件引用、在展开的读/写工具卡片中点击文件路径，或在工作区轨道中点击文件行，会打开文件详情面板：一个基于 CodeMirror 的代码视图，支持语法高亮、行号、跳转到行、文件内搜索、复制操作以及在外部编辑器中打开的菜单。当 Gateway 向 `operator.admin` 连接声明 `sessions.files.set` 时，面板会增加编辑模式，具备脏状态跟踪和 Cmd/Ctrl-S 保存；未保存草稿会在当前浏览器标签页中的文件、面板和会话导航之间保留，直到显式保存或放弃。保存采用 `sessions.files.get` 返回的内容哈希进行 compare-and-swap：如果文件自加载后在磁盘上发生变化（例如 agent 继续工作），面板会显示冲突提示，并提供 Reload（采用最新内容）和 Overwrite（保留本地编辑）操作。写入通过与读取相同的 fs 安全工作区防护——路径包含、拒绝符号链接/硬链接以及 256 KB UTF-8 上限——并且只覆盖现有文件；编辑器不会创建或删除文件。
    - 每个 Chat 面板中的后台任务轨道会列出当前 agent 的后台任务和子 agent（按 agent 范围的 `tasks.list`，通过 `task` 事件保持实时）：运行中的工作会显示实时经过时间计时器、工具使用次数、当前正在使用的工具以及停止控件，而可折叠的已完成部分会增加运行时长。选择某一行会将列表替换为同一轨道中的紧凑详情视图；其返回按钮会回到列表，而对子 agent 的检查绝不会把主对话替换成子转录。通过标题栏活动切换按钮打开该轨道；任务快照会急切加载，因此在不先打开轨道的情况下也会带有运行中计数徽标。Tasks 页面仍然保留跨 agent 的完整台账。
    - 工作区轨道、后台任务轨道和详情面板会根据各自面板的宽度而不是窗口自适应：在较窄的面板或紧凑窗口中，两条轨道都会呈现为底部条带（侧边停靠控件会隐藏，直到面板变宽；当只有一列可容纳时，工作区轨道会优先占据侧边槽位），而详情面板则堆叠在 thread 下方并带有水平调整手柄，而不是与其共享同一行。手机尺寸视口仍然会以全屏方式打开详情面板。
    - 聊天标题栏中的模型和 thinking 选择器会通过 `sessions.patch` 立即修补活动会话；它们是持久的会话覆盖项，而不是只对单次发送生效的选项。
    - **Split view：** 从聊天标题栏打开它（位于线程 diff、后台任务和线程文件切换按钮旁边），然后将活动面板向右或向下拆分，直到容纳不下为止。每个面板都有自己的线程、转录、编写器和工具流。
    - 具有 `screen` 工具的 agent 在连接了具备能力的 Control UI 时，可以请求同样的面板、侧边栏、终端、浏览器、焦点和导航更改。协议 v1 会将命令应用到所有已连接且具备能力的 Control UI；参见 [Screen](/tools/screen)。
    - 将会话从侧边栏拖到聊天中即可在一个面板中打开它。动画化的拖放预览会在各区域之间滑动，并标注结果——在新面板将占据的精确半屏上显示 “Split”，在完整面板上显示 “Open here”——并且单面板模式下也支持拖放。
    - 活动的 split 面板会驱动侧边栏选择和 URL。其标题栏增加拆分和关闭控件；分隔条可调整列和堆叠面板的大小，浏览器会在本地保存布局并在重新加载后保持。
    - 在窄屏上，split view 会保留布局但只渲染活动面板，包括带关闭控件的标题栏。
    - 如果你在同一会话的模型选择器更改仍在保存时发送消息，编写器会等待该会话修补完成后再调用 `chat.send`，以便发送使用所选模型。
    - 输入 `/new` 会创建并切换到与 New Chat 相同的全新 dashboard 会话，除非配置了 `session.dmScope: "main"` 且当前父级是 agent 的主会话；此时它会就地重置主会话。输入 `/reset` 会保留 Gateway 对当前会话显式提供的就地重置。
    - 聊天模型选择器请求 Gateway 配置的模型视图。如果 `agents.defaults.modelPolicy.allow` 非空，则该策略会驱动选择器，包括保持 provider 范围目录动态的 `provider/*` 条目。否则选择器会显示已配置条目以及带有可用认证的 providers；`agents.defaults.models` 下的别名和设置不会对其形成限制。完整目录仍可通过调试用 `models.list` RPC，以 `view: "all"` 访问。
    - 当新的 Gateway 会话使用情况报告包含当前上下文 token 时，聊天编写器工具栏会显示一个小型上下文使用环，并展示已用百分比。打开该环可以查看当前上下文窗口、最新运行的 token 计数和估算总成本、provider/model 身份，以及在有报告时最新 provider 响应的输入/输出/cache 成本拆分。该环在上下文压力较高时会切换为警告样式，并在建议的压缩级别下显示一个紧凑按钮，执行正常的会话压缩流程。过时的 token 快照会隐藏，直到 Gateway 再次报告新的使用情况。

  </Accordion>
  <Accordion title="Talk mode（浏览器实时）">
    Talk mode 使用已注册的实时语音 provider。通过 `talk.realtime.provider: "openai"` 配置 OpenAI。GA `gpt-realtime-*` 浏览器 WebRTC 按以下顺序使用 Platform 认证：`talk.realtime.providers.openai.apiKey`、`openai` API-key 配置文件，然后是 `OPENAI_API_KEY`。原生 GPT-Live 通过 Gateway offer broker 使用 `api.openai.com/v1/live`，并优先使用 ChatGPT OAuth 订阅配置文件而非 Platform 认证；Platform API-key 访问仍处于等待名单门控。GPT-Live 仅支持浏览器，不支持 Gateway relay 或后端语音桥接。通过 `talk.realtime.provider: "google"` 以及 `talk.realtime.providers.google.apiKey` 配置 Google。浏览器永远不会接收标准 provider API key 或 ChatGPT OAuth token：Platform GA OpenAI 接收临时 Realtime client secret，原生 GPT-Live 接收一次性的 Gateway reservation，而 Google Live 接收一次性的受限 Live API 认证 token，用于浏览器 WebSocket 会话。仅暴露后端实时桥接的 provider 会通过 Gateway relay transport 运行，因此凭据和厂商 socket 保持在服务端，而浏览器音频通过经过认证的 Gateway RPC 传输。Platform GA 会话使用 Gateway 的 direct-tool 提示词，而 GPT-Live 则通过其由 Gateway 拥有的 sideband 进行委派。`talk.client.create` 不接受调用方提供的指令覆盖。

    持久化的 provider、模型、语音、transport、reasoning effort、精确 VAD 阈值、静音持续时间以及 prefix padding 默认值位于 **Settings → Communications → Talk**；更改它们需要 `operator.admin` 访问权限。配置 Gateway relay 会强制使用后端 relay 路径；配置 WebRTC 则保持会话由客户端拥有，并且如果 provider 无法创建浏览器会话，会直接失败，而不是静默回退到 relay。

    Talk 控件本身是编写器工具栏中的麦克风按钮。其下拉箭头会列出 **System default** 以及浏览器暴露的每一个麦克风，包括 USB、蓝牙和虚拟输入。所选设备 ID 仅保留在浏览器本地，绝不会发送给 Gateway；如果该精确设备消失，Talk 会要求你选择另一个输入，而不是静默改用其他麦克风录音。Talk 运行时，麦克风按钮会变成一个显示实时输入电平计的胶囊；点击它会停止语音输入，悬停则会显示停止图标。当实时工具调用正在通过 `talk.client.toolCall` 向配置的大模型咨询时，屏幕阅读器会播报 `Connecting voice input...`、`Listening...` 或 `Asking OpenClaw...`。停止正在运行的 agent 响应仍然是该胶囊旁边独立的方形 **Stop** 控件。

    **Video Talk** 适用于 OpenAI Platform Realtime WebRTC 和 Google Live 浏览器会话；GPT-Live 仅支持音频。点击摄像头按钮，允许摄像头和麦克风访问，并确认本地预览。OpenAI 会在 `describe_view` 请求视觉上下文时，通过其浏览器数据通道发送一帧有界的 JPEG。Google Live 会以浏览器直接向 provider 发送有界 JPEG 帧的方式运行，支持的最大速率为每秒一帧，并以摄像流状态来回答 `describe_view` 函数调用。摄像头帧永远不会经过 Gateway。停止 Talk 会关闭预览并释放两个媒体轨道。有关 provider 的线协议，请参见 Google 的 [Live API capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities#video) 和 [function-calling guide](https://ai.google.dev/gemini-api/docs/live-api/tools)。

    维护者实时冒烟测试：`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 会验证 OpenAI 后端 WebSocket 桥接、OpenAI 浏览器 WebRTC SDP 交换、Google Live 受限 token 的浏览器设置（带 JPEG 帧和 `describe_view` 函数往返），以及使用假麦克风媒体的 Gateway relay 浏览器适配器。该命令仅输出 provider 状态，不会记录密钥。

  </Accordion>
  <Accordion title="停止和中止">
    - 点击 **Stop**。当运行具有精确的本地 run ID 时会调用 `chat.abort`；当所选会话状态报告有活动工作但 Control UI 没有本地 run ID 时，则改为调用 `sessions.abort`。对于非全局会话，该所选会话路径还会丢弃排队的后续消息，以免它们在停止后重新启动工作。
    - 当运行活跃时，普通后续消息会使用 Gateway 的有效 `messages.queue` 模式。`steer` 会注入到正在运行的轮次中；其他模式会保留浏览器的持久排队投递。Steering 拒绝也会回退到该队列。点击排队消息上的 **Steer** 可手动注入它。
    - **Settings → Appearance → Chat → Follow-ups while the agent is working** 可以覆盖当前浏览器的服务器默认值。页面会显式标记覆盖，并提供 **Reset to server default**。`Steer into the active run` 会立即发送后续消息，而 `Queue until the run ends` 会将它们保留到运行结束。
    - 输入 `/stop`（或像 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop` 这样的独立中止短语）即可在带外中止。
    - `chat.abort` 支持 `{ sessionKey }`（不带 `runId`）来中止该会话的所有活动运行。当 Control UI 没有本地 run ID 时会使用 `sessions.abort`。

  </Accordion>
  <Accordion title="中止后的部分保留">
    - 当一个运行被中止时，部分助手文本仍然可以在 UI 中显示。
    - 如果存在缓冲输出，Gateway 会将被中止的部分助手文本持久化到转录历史中。
    - 持久化条目包含中止元数据，因此转录消费者可以区分中止的部分输出和正常完成输出。

  </Accordion>
</AccordionGroup>

## 连接丢失与重新连接

一旦会话建立，Gateway 连接断开不会让你登出。仪表板仍会保持可见，顶栏下方会显示一个悬浮的琥珀色“Gateway connection lost — Reconnecting…”提示条；与此同时，客户端会以退避策略自动重试（800 ms 到 15 s）。在连接恢复之前，实时更新和 realtime/session 操作会暂停；提示条中的 **Retry now** 会强制立即尝试。聊天仍可编辑：普通文本和附件发送内容会保存在当前标签页的 gateway/session 作用域浏览器存储中，显示为等待重新连接，并在 Gateway 恢复后自动发送。离线期间，实时控制和斜杠命令仍不可用，不过 **Stop** 可以排队一个精确的本地运行 ID 以供回放。仅限会话的停止不会被回放，因为在连接恢复前，该会话中可能已经开始了更新的工作。

当此浏览器已经持有凭据（已配置的 token/password 或已批准的设备 token）时，首次打开和重新加载会在连接建立期间显示一个小型动画 OpenClaw 标记，而不是闪现登录门。只有在尚未存储凭据，或 Gateway 主动拒绝它们（无效 token/password、已撤销的配对）时，才会显示登录门——这些状态需要你的输入，而不是等待。

## PWA 安装和 Web Push

Control UI 附带 `manifest.webmanifest` 和 service worker，因此现代浏览器可以将其安装为独立的 PWA。Web Push 允许 Gateway 在标签页或浏览器窗口未打开时也能通过通知唤醒已安装的 PWA。

在 macOS 应用中，Notifications 设置页面显示的是应用的原生通知权限，而不是浏览器推送，因为该应用是以原生方式投递通知的。

如果在 OpenClaw 更新后页面立即显示 **协议不匹配**，请先使用 `openclaw dashboard` 重新打开仪表板并强制刷新。如果仍然失败，请清除该仪表板源站点的数据，或在隐私浏览窗口中测试；旧标签页或浏览器 service worker 缓存可能仍在使用更新前的 Control UI bundle 与更新后的 Gateway 通信。

| Surface                                            | 它的作用                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                   | PWA 清单。浏览器在可以访问到它后会提供“安装应用”。                          |
| `ui/public/sw.js`                                  | 处理 `push` 事件和通知点击的 service worker。                               |
| `state/openclaw.sqlite` → `web_push_vapid_keys`    | 自动生成的 VAPID 密钥对，用于对 Web Push 载荷进行签名。                    |
| `state/openclaw.sqlite` → `web_push_subscriptions` | 持久化的浏览器订阅端点、密钥和注册时间戳。                                   |

从已废弃的 `push/vapid-keys.json` 和 `push/web-push-subscriptions.json` 存储迁移的内容，会由 `openclaw doctor --fix` 导入。运行该修复前请先停止 Gateway，以免旧进程在导入期间重新创建已废弃的状态。升级后在使用 Web Push 之前先运行修复；在仍存在任一废弃来源或未完成的 Doctor 声明时，注册、投递、删除和密钥解析都会拒绝继续执行。Gateway 运行时只读写 SQLite。

如果你想固定密钥（多主机场景、密钥轮换或测试），可通过 Gateway 进程上的环境变量覆盖 VAPID 密钥对：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT`（默认为 `https://openclaw.ai`）

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

核心的 [`show_widget`](/tools/show-widget) 工具会直接根据工具调用渲染自包含的 SVG 或 HTML。浏览器和受支持的原生聊天客户端会声明 `inline-widgets` Gateway 能力，并且在聊天历史重新加载时，生成的 Canvas 文档仍然可用。Discord Activities 在 Discord 上提供相同的工具名称；其他由频道发起的运行不会获得它。

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

## 聊天记录布局

聊天记录使用一个居中的可读框架，并与输入区对齐。助手和工具输出保持左对齐，而你自己的消息在该框架内保持右对齐。在多用户会话中（例如从频道插件转发的群聊），来自其他已标注参与者的消息会左对齐显示，并带有作者头像、名称以及稳定的按身份着色，因此只有已登录查看者的消息会被视为“我的”。当存在两个或更多已标注参与者时，助手回复会带有一个小的“回复给 name”标记，用于标明触发该轮回复的参与者。系统条目（例如本地斜杠命令输出）会作为居中的通知行显示，不带头像。

## 聊天消息宽度

宽屏显示器用户可以在 **Settings → Chat →
Message width** 下覆盖对话记录的宽度。该偏好会保存在该浏览器的本地存储中。支持的
形式包括普通长度值和百分比，例如 `960px` 或 `82%`，以及受约束的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和
`fit-content(...)` 宽度表达式。

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

支持的无设备例外是通过 `gateway.auth.mode: "trusted-proxy"` 成功进行 operator Control UI 认证。没有一个可持久化的配置开关可以禁用设备身份。

**推荐修复：**使用 HTTPS（Tailscale Serve）或在本地打开 UI：`https://<magicdns>/`（Serve）或 `http://127.0.0.1:18789/`（在 gateway 主机上）。

<AccordionGroup>
  <Accordion title="Trusted-proxy note">
    - 成功的 trusted-proxy 认证可以在没有设备身份的情况下允许 **operator** Control UI 会话。
    - 这**不**适用于 node-role Control UI 会话。
    - 同主机 loopback 反向代理仍然不满足 trusted-proxy 认证；请参见 [Trusted proxy auth](/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

有关 HTTPS 设置指南，请参见 [Tailscale](/gateway/tailscale)。

## Content Security Policy

Control UI provides a strict `img-src` policy: it only allows **same-origin** resources, `data:` URLs, and locally generated `blob:` URLs. Remote `http(s)` and protocol-relative image URLs will be rejected by the browser, and no network request will be made.

In actual use:

- 通过相对路径提供的头像和图片（例如 `/avatars/<id>`）仍然可以正常渲染，包括 UI 获取并转换为本地 `blob:` URL 的需要身份验证的头像路由。
- 内联的 `data:image/...` URL 仍然可以正常渲染。
- Control UI 创建的本地 `blob:` URL 仍然可以正常渲染。
- GitHub 链接预览头像由 Gateway 从 GitHub 的固定头像主机抓取，并以受限的 `data:` URL 返回；操作员浏览器不会连接远程头像主机。
- 通道元数据发出的远程头像 URL 会在 Control UI 的头像辅助逻辑中被移除，并替换为内置的 logo/badge，因此即使通道被攻破或恶意，也无法强制操作员浏览器发起任意远程图片请求。

此功能始终启用，且不可配置。

## 头像路由认证

当配置了网关认证时，Control UI 的头像端点需要与 API 其余部分使用相同的网关令牌：

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

位于 `/api/chat/media/outgoing/...` 下的生成图像通过 `artifacts.download` 使用相同的能力原则。经过身份验证的 WebSocket 请求会授权 transcript artifact，并返回一个短期有效的 URL。HTTP 媒体路由在提供字节前会重新检查该 artifact 是否仍然属于该 transcript。在兼容性窗口期间，之前的共享所有者 bearer 路径仍可供较旧的 Control UI 客户端使用。

## 审批链接

Operator 审批通知可以深度链接到一个[独立的审批文档](/web/urls#special-documents-and-startup-modes)。该 URL 在审批的整个生命周期内保持稳定，并且可以安全地在你自己的设备之间转发：它标识的是审批本身，绝不会对其进行授权。

- 审批命名空间由 Gateway 预先保留，优先于所有 HTTP 方法的插件 HTTP 路由，因此插件路由永远不可能遮蔽或拦截审批文档。
- 打开审批文档需要与 Control UI 其余部分相同的网关认证（token/password、Tailscale Serve 身份或受信任代理身份）；凭据绝不会出现在审批 URL 中。
- 当 Control UI 服务被禁用时，对该命名空间的请求会返回 `404`，而不是继续交给插件处理程序。
- 在审批文档上登录是该页面的临时状态：它不会覆盖同一浏览器中由完整 Control UI 保存的网关选择或设置。

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
  <Step title="连接远程 Gateway">
    按照 [远程 Gateway URL handoff](/web/urls#remote-gateway-handoff)
    参考文档获取编码后的 Gateway URL 和可选的一次性凭据。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Origin security notes">
    - 公共的、非回环的 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整 origin）。来自回环地址、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主机的私有同源 LAN/Tailnet 加载，无需启用 Host-header 回退即可接受。
    - Gateway 启动时可能会根据实际运行时绑定地址和端口，注入本地 origin，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但远程浏览器 origin 仍然需要显式配置。
    - 除非用于严格受控的本地测试，否则不要使用 `gateway.controlUi.allowedOrigins: ["*"]`；这表示允许任何浏览器 origin，而不是“匹配我正在使用的任意主机”。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用 Host-header origin 回退模式，但这是一个危险的安全模式。

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

- [仪表盘](/web/dashboard) — 网关仪表盘
- [健康检查](/gateway/health) — 网关健康监控
- [TUI](/web/tui) — 终端用户界面
- [WebChat](/web/webchat) — 基于浏览器的聊天界面
