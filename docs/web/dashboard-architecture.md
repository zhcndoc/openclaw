---
summary: "会话仪表盘：架构与实现计划（技术设计，正式发布前）"
read_when:
  - 实现或审查会话仪表盘（面板）功能
  - 更改小组件承载、组件桥接或面板存储
title: "仪表盘架构"
---

<Note>
会话仪表盘功能的技术设计文档，在实现之前和实现过程中编写。它是构建工作的权威依据。当该功能发布后，`/web/dashboard` 将成为面向用户的页面，而此页面将继续作为架构参考。
</Note>

## 远景

与智能体协作在今天本质上是一条文本流。仪表板把它变成了一个工作台：智能体渲染实时、可交互的小部件；用户将它们固定到一个持久化表面上；聊天停靠在侧边（或隐藏），主内容则是画板。你无需离开会话，就能从“与智能体对话”变成“操作智能体为你构建的控制面板”。

原则：

- **画板是会话的一种视图，而不是一个新对象。** 每个会话（线程）都有两个视图：对话记录和画板。没有固定小部件的会话就是普通聊天。固定一个小部件后，画板就存在了。画板继承会话的身份、智能体所有权、命名、固定状态和生命周期。没有 `dashboard_create`，没有画板注册表，也没有单独的 ACL 模型。
- **智能体对等。** 用户在画板上能做的一切，智能体都可以通过工具做到：添加/更新/移除小部件、排列它们、管理标签页、切换可见标签页、停靠或隐藏聊天。
- **原生，而非嵌入式。** 画板是 Control UI 外壳中的 Lit 组件（与应用其余部分使用相同的设计系统）。只有小部件的_内容_被隔离在 iframe 中。没有地址栏，没有浏览器外壳。
- **小型智能体表面。** 小部件通过稳定名称寻址并就地更新。布局是一个流式自动紧凑网格；智能体只描述尺寸和锚点，从不使用像素或坐标。
- **以能力而非信任为基础。** 小部件代码是任意的、由智能体编写的 HTML/JS，运行在强沙箱中。访问范围（网关数据、动作、网络）仅通过声明式、由操作者授予的能力清单存在。

## 概念

| 概念                | 定义                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 会话（线程）        | 现有的网关会话，以稳定的 `sessionKey` 为键。由某个代理拥有。                                                                                        |
| 板                  | 一个会话的部件界面。仅当会话具有部件/选项卡时存在。即使 `/new`/`/reset`，它也会持续存在（附着在 `sessionKey` 上，而不是记录文本上）。                 |
| 选项卡              | 一个板的展示页：包含哪些部件、它们的布局，以及聊天停靠状态（`left`/`right`/`bottom`/`hidden`）。板初始时只有一个隐式选项卡。 |
| 部件                | 由会话拥有的、带名称的、沙箱化的 HTML/JS 程序。通过 `sessionKey` + `name` 进行定位。按名称就地更新。                                              |
| 能力清单            | 每个部件对可访问范围的声明：`data`（读取绑定）、`actions`（允许列表中的动词）、`prompt`（发送到会话）、`net`（允许的来源）。                      |
| 固定（部件）        | 将一个记录文本部件移动到会话的板上（用户可执行的操作或代理工具参数）。取消固定会将其从板上移除。                                         |
| 固定（会话）        | 现有的侧边栏会话固定。带有板的已固定会话会在其板界面上打开。                                                                      |

## UX 流程

- **升级：** 代理在任意聊天中调用 `show_widget` → 小组件以内联方式渲染  
  在对话记录中，和现在一样 → 悬停显示 **固定到仪表盘** → 小组件  
  出现在该会话的面板上。代理也可以传入 `pin: true` 来实现同样效果。
- **面板视图：** 带有面板的会话会获得一个正反切换（聊天 / 仪表盘）。  
  面板视图 = 标签栏（仅当 >1 个标签时）+ 流式网格 + 固定聊天面板。  
  聊天停靠栏可调整大小、可移动（左 / 右 / 底部），并且像侧边栏一样可折叠。  
  每个标签的停靠状态都会被记住。
- **拖拽：** 用户拖动小组件；网格会自动紧凑排列（小组件向上浮动，相邻项重新流动）。  
  通过把手调整大小会吸附到尺寸步进。没有像素级定位——对任何人都没有。
- **重置警告：** 在带有面板的会话中执行 `/new` / `/reset` 时，会在网页界面中请求确认（“上下文会重置，仪表盘会保留”）并保留面板。
- **侧边栏：** 已固定的会话在拥有面板时会渲染它们的正面视图。  
  Home 会话的面板是默认的“代理仪表盘”。
- **交互**（三个层级，见下文）：静默状态事件、可见的提示发送，以及自动化触发器。

## 交互层级

1. **状态事件（默认）。** 模型应该知道但不需要回应的小部件 UI 交互。`bridge.emitState({...})` 会追加一条结构化的会话通知（与群组活动通知使用相同机制）。不会启动新的 agent 回合；模型会在下一次运行时看到累积的通知。
2. **提示（显式对话）。** `bridge.sendPrompt(text)` — 需要用户激活；向会话发送一条可见的用户消息（停靠的聊天窗口会显示它）。有速率限制；每次发送都需要用户确认，除非小部件持有 `prompt` 能力授权。
3. **自动化。** `bridge.runAction(name, args)` — 触发一个在清单中声明的动作。初始动词集合：`cron.trigger`（立即运行现有的 cron 作业）和 `binding.refresh`。Cron 作业已经在可见、隔离的运行会话中执行，并且可以使用更便宜的模型：这就是“小模型驱动小部件”的路径。任何地方都没有隐藏会话。

## Widget 模型与托管

Widget 的 HTML/JS 由 agent 编写（通常通过 `show_widget`），包裹在标准文档外壳中（CSP meta、尺寸上报器、桥接引导），并在 `<iframe sandbox="allow-scripts">` 中渲染（绝不使用 `allow-same-origin`）。

- **内联（transcript）widget** 保持当前的 canvas-document 管线：
  写入状态目录，由 gateway 提供服务，按作用域清理，无需审批（它们从构造上就是无能力的——prompt 发送由用户确认）。
- **Board widget** 是会话状态：字节内容保存在所属 agent 的 SQLite
  DB（`board_widgets`）中，由一个 core gateway 路由提供服务
  （`/__openclaw__/board/<agentId>/<sessionKey>/<name>/`），该路由读取 DB。
  将 transcript widget 固定会复制这些字节。容量上限：每个 widget 256 KB，
  每个 board 48 个 widget。
- **原地更新：** 以相同 `name` 重新发出一个 widget 会替换这些字节，
  提升 `revision`，广播 `board.changed`，并且只会让活动视图重新加载那个 iframe。
- **字节冻结：** 授予的能力绑定到 widget 字节的 sha256。变更字节后，只有在新
  revision 声明的 manifest 是已授予 manifest 的子集时，才保留 `data`/`net`/`actions`
  授权；一旦 manifest 扩大，则会重新提示操作者。

### Widget 承载内容；MCP app 只是内容的一种

**Widget 是 OpenClaw 的原语**：带名称、已固定、已设大小、会话归属的 board 单元，
以及一条授权记录。其内部渲染的内容只是某一种内容类型：

- `html` — 由 agent 通过 `show_widget` 编写，字节存放在 board 存储中。
- `mcp-app` — 第三方 MCP app 视图（来自已配置服务器的 `ui://` 资源），托管在 widget 单元内部。

MCP app 并没有定义 widget 模型；是 widget 获得了托管它们的能力。身份、位置、固定、授权，以及面向作者的 API 仍然属于 OpenClaw——因此 `show_widget` 代码可以像今天一样简短，也永远不需要知道 MCP Apps 规范的存在。

其下方共享的基础设施（简化就落在这里）：

- **一个沙箱主机。** `html` widget 通过 MCP app 已经发布的同一套加固管线渲染
  （在专用沙箱 origin 上的双 iframe、每个 widget 声明的 CSP、以及失败即关闭的解码），
  而不是再造一套专门的 iframe 主机。代理按值接收 HTML，因此本地内容是自然场景。
- **一个授权模型。** 无论 widget 类型如何，它的可达范围都是一份已授予的 allowlist：
  对于 `html` widget，是主机工具；对于 `mcp-app` widget，是服务器对 app 可见的工具
  （通过现有的 `allowedAppToolNames` 机制实现，并改为按 widget 持久化，而不是按一次 mint 运行持久化）。
- **`html` widget 的主机工具**（通过 widget bridge 暴露，并按授权校验）：
  - `openclaw.prompt.send` — tier 2；通过可见的 composer 转发，除非已授权否则需要用户确认
  - `openclaw.state.emit` — tier 1 会话通知（合并、限制大小）
  - `openclaw.data.read` — 参数化只读绑定（现有的允许列表 read RPC 集），在 gateway 侧解析
  - `openclaw.cron.trigger` — tier 3 自动化
- **`net` = CSP。** 网络可达性使用已经发布的每个 widget 的 CSP 声明
  （`connect-src` origins）——这个会自动更新的天气 widget 直接从沙箱中获取其 API，
  不需要 gateway 介入。
- **授权。** 未声明任何内容的 widget 会立即渲染（已沙箱化，
  `default-src 'none'`，逐条确认 prompt 发送）——与今天的内联聊天 widget 的信任等级相同。
  声明了工具/origin 的 widget 会在 board 上进入 `pending`：一个占位卡片会以人类可读的方式列出这些内容，并提供一键 **允许**/**拒绝**。
  授权按 widget 名称生效；对于 `html` widget，它们是字节冻结的（sha256），而变更后的字节只有在声明缩小的情况下才保留授权。
- **作者包装层。** 文档外壳注入 `window.openclaw.prompt`、`window.openclaw.state`、
  `window.openclaw.data` 和 `window.openclaw.cron`，作为稳定的作者 API。Dashboard 调用共享一条以 view-ticket 绑定的请求通道；尺寸上报和主题 token 仍然作为单独的主机通知存在。

### 插件能力声明

已启用的插件可以通过 `openclaw.plugin.json` 中的 `dashboard.dataBindings` 和 `dashboard.actionVerbs` 扩展 widget 主机能力。插件本地 id 会变成以插件 id 为前缀的授权名称，例如 `workboard.cards.list` 和 `workboard.dispatch`；插件 id 段中的 `%` 和 `.` 会被转义，因此不同插件/local-id 的拆分不能继承同一条已持久化授权。插件注册期间，OpenClaw 会验证每个 binding 都指向同一插件注册的、带 `operator.read` 的 RPC，并且每个 action 都指向一个带 `operator.write` 的 RPC；无效声明会导致插件加载失败。经过验证的 registry 只会在插件生命周期变化时重建，而 widget 授权仍然是按 widget 粒度、并与字节和版本绑定的。

### 建模残留：WebRTC data channel

沙箱 CSP 发出提议中的 `webrtc 'block'` 指令，但
[Chromium 当前的 CSP 指令集合](https://chromium.googlesource.com/chromium/src/+/main/services/network/public/mojom/content_security_policy.mojom#95)
并未实现它。因此，可脚本化的 widget 在当前 Chromium 中仍可使用 WebRTC data channel 进行外发。这个相同的残留也已经存在于内联聊天 widget 和 main 分支上的 MCP Apps 主机中。

**接受的权衡：** OpenClaw 不会因为这一残留而对可脚本化 widget 设门。Widget 内容只有通过操作者授予、字节冻结的 `data:read` 能力才能获得敏感 OpenClaw 数据，而沙箱 Permissions Policy 会阻止摄像头和麦克风访问。DOM API 防护只是尽力而为的纵深防御，不是安全边界，属于后续加固工作。

### Transcript 展示：一个 widget 卡片

内联展示统一到 widget 原语上。当某个工具结果携带 UI —— `show_widget` 输出或带 app resource 的 MCP 工具结果时，系统会生成一个**临时的、自动命名的 widget**（会话作用域、会被清理），并且 transcript 会渲染为一张单一的 widget 卡片，按内容类型分发处理。MCP app 的自动展示完全符合规范预期（零额外模型工作）；其底层本质上就是一个 widget。这样会删除聊天渲染中并行存在的 `mcpApp` 特殊分支（界面门控、单独去重），让所有内联 UI 都拥有相同的固定入口，并使 widget registry 成为主要的重新打开路径（transcript 扫描重建仍作为从未固定历史的备用方案）。只读的带票据独立主机与 boards 作为持久化重新打开表面存在重叠——这是一个可在 T6 评估的整合候选，而不是默认前提。

组合方式：v1 是网格相邻（agent chrome widget 与 app widget 在同一个 tab 中并排）。v2 增加**主机管理的 app 插槽**——agent widget 的 HTML 声明一个插槽区域，由主机将真实 app 视图作为相邻的沙箱进行合成。app 永远不会渲染在 agent 的 iframe 内：嵌套会破坏 bridge 身份，并可能对已授予的 app UI 进行覆盖/clickjacking，所以这个插槽是布局契约，而不是嵌入。

### 服务端来源的 widget（固定的 MCP app）

在统一主机下，固定一个第三方 MCP app 只是一个内容来自服务端而不是存储中的 widget：`board_widgets` 保存的是描述符（`serverName`、`toolName`、`uiResourceUri`、来源 `toolCallId` + `sessionKey`），而不是 HTML 字节；board 会在聊天回合 10 分钟 TTL 之后重新 mint 该视图租约（在过期时重新抓取 `ui://` 资源）。聊天内联 MCP app 视图获得与 agent widget 相同的 **固定到 dashboard** 入口。重新打开的视图按设计今天就是只读；希望保持交互性的已固定 app，会获得对服务器 app 可见工具的持久授权（固定时会把明确的 allowlist 展示给操作者），并与 mint 运行解耦。未授权的固定项仍然只读——但对展示型 dashboard 仍然有用。v1 只固定到来源会话的 board；跨会话固定需要 lease broker，并需等待。请与 open PR #109807（`ui/message` composer 路由、主题/尺寸传播）协同。

### WorkBoard 集成

WorkBoard 集成计划保持 cards 和 boards 由插件拥有，同时通过现有的 `sessionKey` 和 `runId` 将分发的 cards 重新接回它们的会话 boards，通过插件声明的 bindings 和 actions 暴露 WorkBoard feeds 和 dispatch，并将这些结果与现有的 `html` 和 `mcp-app` widget 类型进行组合，而不是引入一种 WorkBoard 专用的 widget 类型。

## 布局：流式网格

12 列，固定行高，**自动压缩**（向上重力、拖拽时侧向推挤 — gridstack 语义，原生实现；网格计算保持纯净且不依赖 DOM）。每个标签页的组件布局状态：`{ name, w (1-12), h (rows) }` 加上顺序。代理词汇表：

- `size`: `sm`（3×3）· `md`（6×4）· `lg`（8×6）· `xl`（12×8）· `full`
  （单组件标签页）
- `after: <widgetName>` 可选的排序锚点；省略 = 追加
- 用户可自由拖拽/调整大小；相同的顺序+尺寸模型可往返保持一致。

## 数据模型（每个代理的数据库）

`agents/<agentId>/agent/openclaw-agent.sqlite` 中的新表
（**需要提升代理数据库的架构版本——在此功能上线前需要运营方签字确认**）：

```sql
CREATE TABLE board_tabs (
  session_key TEXT NOT NULL,
  tab_id      TEXT NOT NULL,           -- slug
  title       TEXT NOT NULL,
  position    INTEGER NOT NULL,
  chat_dock   TEXT NOT NULL DEFAULT 'right',  -- 左侧|右侧|底部|隐藏
  created_by  TEXT NOT NULL,           -- '用户' | '代理'
  PRIMARY KEY (session_key, tab_id)
) STRICT;

CREATE TABLE board_widgets (
  session_key  TEXT NOT NULL,
  name         TEXT NOT NULL,          -- 稳定的组件名称
  tab_id       TEXT NOT NULL,
  title        TEXT,
  html         BLOB NOT NULL,          -- 包装后的文档源代码
  sha256       TEXT NOT NULL,
  revision     INTEGER NOT NULL,
  size_w       INTEGER NOT NULL,
  size_h       INTEGER NOT NULL,
  position     INTEGER NOT NULL,       -- 标签页内的顺序（自动压缩输入）
  manifest     TEXT NOT NULL DEFAULT '{}',  -- 能力清单 JSON
  grant_state  TEXT NOT NULL DEFAULT 'none', -- 无|待处理|已授予|已拒绝
  granted_sha  TEXT,                   -- 字节冻结的授权
  created_by   TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (session_key, name)
) STRICT;
```

面板的存在 = `sessionKey` 对应的任何行。删除一个会话会删除其面板行。`/new`/`/reset` 不会影响它们。

## 协议表面

RPC（核心方法表，`gateway-protocol` 中的 typebox schemas）：

- `board.get { sessionKey }` → 标签页 + 小部件元数据（不含字节）— `operator.read`
- `board.update { sessionKey, ops[] }` — 标签页 CRUD/重排、小部件移动/调整大小/
  移除/取消固定、停靠状态、聚焦标签页 — `operator.write`
- `board.widget.put { sessionKey, name, html, manifest, placement }` —
  `operator.write`（代理工具路径和固定路径）
- `board.widget.grant { sessionKey, name, decision }` — `operator.approvals`
- `board.event { ticket, payload }` — 绑定 ticket 的一级状态事件接收；
  旧的受信任主机 `{ sessionKey, widget, payload }` 形状仍然保留 —
  `operator.write`
- `board.prompt.authorize { ticket }` — 返回可见提示发送是否
  仍需要每次点击确认 — `operator.read`
- `board.data.read { ticket, bindingId, params? }` — 网关侧白名单化的
  核心或活动插件读取绑定解析 — `operator.read`
- `board.action { ticket, action, ... }` — 通过现有的 cron 立即运行路径或活动插件已验证的 action
  动词进行精确授权自动化分发 — `operator.write`

事件（在 `EVENT_SCOPE_GUARDS` 中，读取作用域）：

- `board.changed { sessionKey, revision, widget? }` — 持久化状态已更改；
  UI 重新拉取（当存在 `widget` 时也会重载一个 iframe）。
- `board.command { sessionKey, command }` — 临时 UI 驱动（代理切换
  可见标签页，切换聊天停靠栏）— `ui.command` 模式。

小部件字节通过经过身份验证的 HTTP 接口提供，而不是通过 socket。

## 代理工具

总共三个工具（核心工具，始终注册；渲染是否启用取决于当前的 `inline-widgets` 客户端能力）：

- `show_widget { title, widget_code, name?, pin?, size?, tab?, after?,
capabilities? }` — 按名称创建/更新；`pin` 将其放置到面板上。
  不使用 `name`/`pin` 时，其行为与当前完全一致（内嵌、临时）。
- `dashboard { action, ... }` — 面板管理操作：`read`、`tab_create`、
  `tab_update`、`tab_delete`、`tabs_reorder`、`widget_move`、`widget_remove`、
  `unpin`、`focus_tab`、`set_chat_dock`。
- 现有的 `automations` 工具负责自动化层；无需新增工具。

工具描述会教授 size/anchor 词汇和层级模型。系统会通过会话通知告知代理用户的一级事件，例如：
`[dashboard] 用户在小组件 weather（标签页 main）上点击了“刷新”。`

## 这替代了什么

- **`extensions/workspaces` 已删除。** 实验性，`enabledByDefault:
false`，从未进入稳定版本（最早出现在 2026.7.2 beta 版中）。无需迁移；如果存在，doctor 规则会移除过时的 `<stateDir>/workspaces/`。
  吸收的想法：纯网格数学、桥接安全模型（端口引导、绑定门控、速率限制）、字节冻结审批。
- **Widget 托管从 `extensions/canvas` 迁移到核心。** canvas 文档存储、文档包装器、HTTP 提供，以及 `show_widget` 工具都成为核心（`src/canvas/`）；插件保留 node-canvas 控制工具（`canvas`）和 A2UI。`pluginSurfaceUrls["canvas"]` 公告和
  `/__openclaw__/canvas` 路径是 native-client 合同的一部分并保持稳定。Discord 会话继续保留 Discord 自有的 `show_widget` 变体。

## 非目标（本项目）

- 多用户看板共享/ACL（未来；将通过会话共享实现）。
- 原生 macOS/iOS 看板渲染（它们在嵌入 Control UI 的任何地方都会获得该能力；内联组件路径保持不变）。
- 内置数据组件（会话/用量/cron 卡片）——能力桥接加上代理编写的组件已覆盖 v1；内置类型注册表可以后续再加入。

## 实施计划

独立工作树，由 Codex 构建，按顺序审查并合入。先合入，再修复。

| #   | 分支                                 | 范围                                                                                                                                                                              | 依赖于                           |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| T1  | `claude/dashboard-remove-workspaces` | 删除 workspaces 插件 + UI + 文档 + i18n 键；清理 doctor 规则                                                                                                                       | —                                |
| T2  | `claude/dashboard-canvas-core`       | 将 widget 托管 + `show_widget` 提升到 core；canvas 插件保留节点工具；行为不变                                                                                                      | —                                |
| T3  | `claude/dashboard-domain`            | Agent-DB 表（schema bump）、`board.*` RPC + 事件、`dashboard` 工具、`show_widget` 的 pin/name/manifest 参数、一级通知、重置时保留 board                                        | T2                               |
| T4  | `claude/dashboard-ui`                | Board 界面 + 标签页条 + 流式自动紧凑网格 + 聊天停靠栏（左/右/底部/隐藏）+ transcript pin 交互 + 侧边栏 Board 界面 + 重置确认                                 | T3（通过开发 fixture 先做模拟） |
| T5  | `claude/dashboard-capabilities`      | Grant 存储/UI + 字节冻结；将 `html` widgets 移到共享 sandbox 主机；主机工具（`openclaw.prompt.send/state.emit/data.read/cron.trigger`）；`net` CSP；创作 shim | T3, T4                           |
| T7  | `claude/dashboard-mcp-apps`          | `mcp-app` 内容类型：inline app views 上的 pin 交互、描述符存储、lease 重新签发/刷新、持久化 server-tool grants（复用已发布的 MCP Apps 主机）                            | T3, T4                           |
| T6  | polish                               | 在 scratch gateway 上使用真实密钥进行实时端到端测试、截图、修复、面向用户的 `/web/dashboard` 重写、默认启用审查                                                                      | all                              |

每个仓库的验证规则：本地运行聚焦的 vitest，在 Crabbox/Testbox 上运行完整门禁，每次合入前都要执行 `$autoreview`，T6 需要实时证明。
