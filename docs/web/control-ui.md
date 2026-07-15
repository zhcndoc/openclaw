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
  <Step title="Open mobile pairing">
    Select **Devices**, then click **Pair mobile device** in the **Devices** card.
  </Step>
  <Step title="连接手机">
    在 OpenClaw 移动应用中，打开 **Settings** → **Gateway** 并扫描二维码。你也可以改为复制并粘贴设置代码。
  </Step>
  <Step title="Confirm the connection">
    The official iOS/Android app connects automatically. If **Pending approval** shows a request, review its role and scopes before approving it.
  </Step>
</Steps>

创建设置代码需要 `operator.admin`；对于不具备该权限的会话，该按钮会被禁用。设置代码包含一个短期有效的引导凭据，因此在其有效期间，请将二维码和复制的代码视为密码。对于远程配对，Gateway 必须解析为 `wss://`（例如，通过 Tailscale Serve/Funnel）；普通的 `ws://` 仅限于回环和私有局域网地址。有关完整的安全性和回退细节，请参见 [配对](/channels/pairing#pair-from-the-control-ui-recommended)。

## 个人身份（浏览器本地）

控制 UI 支持为每个浏览器提供一个个人身份（显示名称和头像），并附加到发出的消息中，用于在共享会话中的归属标识。它存储在浏览器存储中，作用范围限定于当前浏览器配置文件，不会同步到其他设备，也不会在服务器端持久保存，超出你发送消息上的正常会话记录作者元数据范围。清除站点数据或切换浏览器会将其重置为空。

助手头像覆盖遵循相同的浏览器本地模式：上传的覆盖内容会在本地叠加到网关解析出的身份上，并且不会通过 `config.patch` 往返传输。共享的 `ui.assistant.avatar` 配置字段对于直接写入该字段的非 UI 客户端仍然可用。

## 运行时配置端点

Control UI 会从 `/control-ui-config.json` 获取其运行时设置，该路径是相对于网关的 Control UI 基路径解析的（例如，在基路径 `/__openclaw__/` 下，对应 `/__openclaw__/control-ui-config.json`）。该端点与其余 HTTP 接口一样受相同的网关认证保护：未认证的浏览器无法获取它，只有在提供有效的网关令牌/密码、Tailscale Serve 身份或受信任代理身份时，才能成功获取。

## Gateway host status

Open **Settings** in Simple view to see the **Gateway Host** card with the Gateway machine, LAN address, operating system, runtime, uptime, CPU load, memory, and state-volume disk space. The card refreshes every 10 seconds while visible through the `system.info` Gateway RPC, which requires the `operator.read` scope. Older Gateways and connections without that scope omit the card.

## Language support

The Control UI localizes itself on first load based on your browser locale. To override it later, open **Settings -> General -> Language** (the picker lives in the General quick-settings card, not under Appearance).

- 支持的区域设置：`en`、`ar`、`de`、`es`、`fa`、`fr`、`hi`、`id`、`it`、`ja-JP`、`ko`、`nl`、`pl`、`pt-BR`、`ru`、`th`、`tr`、`uk`、`vi`、`zh-CN`、`zh-TW`
- 非英语翻译会在浏览器中按需加载。
- 所选区域设置会保存在浏览器存储中，并在以后访问时复用。
- 缺失的翻译键会回退为英语。

文档翻译也会为同一组非英语区域设置生成，但文档站点内置的 Mintlify 语言选择器只会列出 Mintlify 接受的区域设置代码。泰语（`th`）和波斯语（`fa`）文档仍会在发布仓库中生成；在 Mintlify 支持这些代码之前，它们可能不会出现在该选择器中。

## Appearance 主题

Appearance 面板内置了 Claw、Knot 和 Dash 主题（Claw 为默认主题），另外还有一个仅限当前浏览器的 tweakcn 导入槽位。要导入主题，请打开 [tweakcn 编辑器](https://tweakcn.com/editor/theme)，选择或创建一个主题，点击 **Share**，然后将复制的链接粘贴到 Appearance 中。导入器也接受 `https://tweakcn.com/r/themes/<id>` 注册表 URL、类似 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 的编辑器 URL、相对路径 `/themes/<id>`、原始主题 ID，以及默认主题名称（例如 `amethyst-haze`）。

导入的主题仅存储在当前浏览器配置中；它们不会写入 gateway 配置，也不会在设备之间同步。替换已导入的主题会更新这个本地槽位；如果清除此项且该导入主题正处于启用状态，则会切回 Claw。

Appearance 还提供一个仅限浏览器本地的 Text size 设置，和其余 Control UI 偏好设置一起存储。它会应用于聊天文本、编辑器文本、工具卡片以及聊天侧边栏，并将文本输入框保持在至少 16px，以避免 mobile Safari 在聚焦时自动缩放。

## Manage plugins

Open **Plugins** in the sidebar, or use `/settings/plugins` relative to the
configured Control UI base path, to browse and manage plugins without leaving
the Control UI. For example, a base path of `/openclaw` uses
`/openclaw/settings/plugins`. The page is always available, even when every
optional plugin is disabled.

Plugins is a hub with four tabs: **Installed** and **Discover** manage plugin
code at `/settings/plugins`, **Skills** hosts the per-agent skill manager at
`/skills`, and **Workshop** hosts Skill Workshop proposal review at
`/skills/workshop`. Each tab keeps its own URL, and the sidebar shows the
single Plugins entry for all of them.

The **Installed** tab shows the full local inventory grouped by category, with
overview counts. Each row opens a detail view; its overflow (`…`) menu enables
or disables the plugin and offers **Remove** for externally installed plugins.
It also lists configured [MCP servers](/cli/mcp) and supports adding, disabling,
and removing them inline. The **Discover** tab is the store: featured plugins
included with OpenClaw, official external plugins, and one-click MCP connectors
for popular services. Typing in the search box queries
[ClawHub](https://clawhub.ai/plugins) inline and appends a **From ClawHub**
section with download counts and source-verification badges. Deep links can
target the store directly with `/settings/plugins?tab=discover`.

The **Skills** tab keeps the skill status report, enable/disable toggles, API
key entry, and inline ClawHub skill search, scoped to the selected agent. The
**Workshop** tab keeps the Skill Workshop board and Today review flow for
[skill proposals](/tools/skill-workshop).

Included plugins are already present on the Gateway and show **Enable** or
**Disable** instead of **Install**. For example, Workboard is included with
OpenClaw but disabled by default, so its action is **Enable**. Bundled plugins
cannot be removed, only disabled.

Reading the catalog and searching ClawHub require `operator.read`. Installing,
enabling, disabling, or removing a plugin and changing MCP servers require
`operator.admin`; those actions stay disabled for read-only operators.

ClawHub installs run through the Gateway and keep the same trust, integrity,
and plugin-install policy checks as other Gateway-mediated installs. Installing
or removing plugin code requires a Gateway restart. Enabling or disabling an
installed plugin can apply without a restart when the plugin and current
Gateway runtime support it; otherwise the UI reports that a restart is
required. OAuth-backed MCP connectors need a one-time
`openclaw mcp login <name>` from the CLI after they are added.

The page intentionally focuses on inventory, discovery, install, enablement,
and removal. Use [`openclaw plugins`](/cli/plugins) for arbitrary npm, git, or
local-path sources, updates, and advanced plugin configuration.

## Sidebar navigation

The sidebar pins navigation above a scrollable session list. In multi-agent setups every agent appears as a collapsible top-level section; expanding an agent browses its sessions without navigating away from the open chat, and collapsed agents show an unread indicator. Within an agent the list splits into **Pinned**, one built-in section per connected channel (Telegram, Slack, WhatsApp, ...), a built-in **Work** section for sessions bound to a managed worktree or exec node (rows show a `repo ⎇ branch` line plus the node host), custom groups (the session `category`), and **Chats** for the rest. Channel and Work sections classify rows automatically; assigning a session to a custom group always wins. Opening a session moves the selection highlight without reordering the rows. Sessions with new activity since they were last read show an unread dot, and opening one marks it read. Each session row has a context menu (kebab button or right-click) with Pin/Unpin, Mark as unread/read, Rename, Fork, Move to group (including New group and Remove from group), Archive, and Delete; touch layouts keep the direct pin and menu controls visible. Cmd/Ctrl-click toggles rows into a multi-select and Shift-click extends it across the visible order; opening the menu on a selected row then offers batch actions (Mark N as unread/read, Move N to group, Archive N, Delete N) that apply to every selected session, with a single confirmation for batch delete. Drag a session onto a custom group or **Chats** to move it. Custom group headers can be collapsed, expanded, or dragged to reorder them; group names and their order live in the gateway (`sessions.groups.*`), so they follow you across browsers, while the collapsed state stays in the browser profile. Group headers also have a menu (kebab button or right-click) with Rename group, New group, and Delete group; renaming or deleting a group updates every member session server-side, including archived ones, and deleting a group keeps its sessions and moves them back to Chats. The single **+** in the session-list header opens the New session page (see below). The sort control also has a Group by toggle: Grouped (default) or None for one flat list (Pinned stays separate); the choice is stored in the current browser profile. **Usage**, **Automations**, and **Plugins** are pinned by default; the **More** row opens a menu with every other destination, including plugin-provided tabs. Select **Edit pinned items** in that menu, or right-click the navigation area, to pin or unpin destinations and restore the defaults. The pinned set is stored in the current browser profile and survives reloads.

## New session page

The **+** in the sidebar session-list header opens a full-page draft at `/new`: nothing is created until you send the first message. A target row above the message box picks where the session works: the agent (multi-agent setups), where exec runs (**Gateway · local** or a paired node that exposes `system.run`; requires `operator.admin`), the folder (defaults to the agent workspace; other absolute Gateway paths require `operator.admin` and a worktree), and an optional **Worktree** toggle with a base-branch picker (backed by `worktrees.branches`, so no fetch happens) and an optional worktree name (the branch becomes `openclaw/<name>`). The folder chip's browse button opens an inline directory picker backed by the admin-only `fs.listDir` method. Its top level shows the Gateway and every known node; offline nodes and nodes without directory-browsing support stay visible but disabled. Selecting the Gateway starts from the current folder or Gateway home. Selecting a capable node browses that node's host filesystem, binds exec to it, and uses the selected absolute node path directly (managed worktrees remain Gateway-only). Submitting calls `sessions.create` with the first message, so the run starts in the same round-trip and the UI jumps to the new session's chat. If the Gateway creates the session but rejects that first send, the chat preserves the prompt and error across reloads; **Retry** sends it through the already-created session instead of creating another one.

Inside **Settings**, the dedicated sidebar starts with a **Search settings** field for quickly finding settings sections.

A **Search** field at the top of the sidebar opens the command palette (⌘K). Clicking the OpenClaw brand in the sidebar header opens the clean New session start screen. When something needs action — failed or overdue cron jobs, expiring or expired model auth — compact attention chips appear above the sidebar footer and click through to the owning page. The footer shows the active agent as a chip — avatar (identity image or emoji), name, connection dot, and a live subtitle — with a **+** for a new session. Clicking the chip opens the agent menu: an agent switcher (multi-agent setups), "What can this agent do?", **Agent settings**, **Settings**, mobile pairing, **Docs**, the build chip, and the color-mode toggle. Rosters above ten agents get a filter field and list pinned agents first; pin or unpin agents from the Agents settings page, with the pinned set stored in the browser profile. Choosing an agent scopes Chat plus Usage, Automations, Tasks, Workboard, and Sessions to that agent. Each scoped page exposes an **Agent** control with **All agents** as an escape; this widens the shared page scope without changing the concrete chat agent, while direct session links still open their target. The Agents settings page keeps its own `?agent=` selection and does not follow the shared page scope. When the gateway runs from a source checkout on a branch other than `main`, the footer also shows that branch name in red so a non-release gateway is obvious at a glance (release installs never show it). Shift-Command-Comma opens **Settings** without overriding the browser's Command-Comma shortcut. The sidebar header also holds the collapse toggle (⌘B); collapsing hides the sidebar entirely for a full-width workspace, and a floating expand control (or ⌘B) brings it back; the macOS app hosts that toggle natively in the titlebar instead. The sidebar is the only navigation chrome on desktop, with no top bar. Narrow viewports swap the sidebar for a slide-over drawer behind a compact header row holding the drawer toggle, brand, and command-palette search; in the macOS app that header row folds the titlebar clearance into a single compact strip beside the window controls. Navigation uses regular browser history, so the browser's back/forward buttons traverse it; the macOS app adds a native sidebar toggle next to the window controls plus trackpad swipe gestures, with back/forward buttons at the sidebar's right edge while it is expanded and native search (command palette) and new-session buttons while it is collapsed.

## 它目前能做什么

<AccordionGroup>
  <Accordion title="Chat and Talk">
    - Chat with the model via Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`).
    - Chat history refreshes request a bounded recent window with per-message text caps, so large sessions do not force the browser to render a full transcript payload before chat becomes usable.
    - Hovering or keyboard-focusing a public GitHub issue or pull request link shows its state, title, author, recent activity, comments, and change statistics. The connected Gateway fetches and caches public metadata without changing the link target, including when the UI uses a remote Gateway. The Gateway uses `GH_TOKEN` or `GITHUB_TOKEN` when available, after confirming the repository is public; otherwise it uses GitHub's anonymous API with a longer cache.
    - Talk through browser realtime sessions. OpenAI uses direct WebRTC, Google Live uses a constrained one-use browser token over WebSocket, and backend-only realtime voice plugins use the Gateway relay transport. Client-owned provider sessions start with `talk.client.create`; Gateway relay sessions start with `talk.session.create`. The relay keeps provider credentials on the Gateway while the browser streams microphone PCM through `talk.session.appendAudio`, forwards `openclaw_agent_consult` provider tool calls through `talk.client.toolCall` for Gateway policy and the larger configured OpenClaw model, and routes active-run voice steering through `talk.client.steer` or `talk.session.steer`.
    - Stream tool calls and live tool output cards in Chat (agent events). Tool activity renders as kind-aware rows: shell commands show the syntax-highlighted command with terminal-style output; supported edit and write calls show bounded inline diffs, line numbers when available, and `+added -removed` stats; and consecutive calls collapse into a summary such as "Ran 13 commands, read 6 files, edited 9 files". While a run is live, the newest running call names the group header. Expand a row to inspect its remaining arguments and raw output.
    - Optional AI purpose titles for complex tool calls (long shell commands, argument-heavy plugin tools), enabled with `gateway.controlUi.toolTitles: true` (default off). Titles come from the batched `chat.toolTitles` method through standard utility-model routing — an explicit `utilityModel` (operator-chosen provider, like other utility tasks), else the session provider's declared small-model default — and cache gateway-side per agent. When the opt-in is off or no cheap model is usable, rows keep their deterministic labels and no model call happens.
    - Start or dismiss ephemeral model-suggested follow-up tasks; accepted suggestions open a fresh managed-worktree session with the proposed prompt.
    - Activity tab with browser-local, redaction-first summaries of live tool activity from existing `session.tool` / tool event delivery.

  </Accordion>
  <Accordion title="Channels, sessions, memory">
    - Channels: built-in plus bundled/external plugin channels status, QR login, and per-channel config (`channels.status`, `web.login.*`, `config.patch`).
    - Channel probe refreshes keep the previous snapshot visible while slow provider checks finish, and label partial snapshots when a probe or audit exceeds its UI budget.
    - Sessions (a settings page under **Agents & Tools**, `/settings/sessions`): list configured-agent sessions by default, pin frequent sessions, rename them, archive or restore inactive sessions, fall back from stale unconfigured agent session keys, and apply per-session model/thinking/fast/verbose/trace/reasoning overrides (`sessions.list`, `sessions.patch`). Pinned sessions sort above recent unpinned sessions; archived sessions live in the Sessions page's archived view and keep their transcripts. Rows show an unread dot for sessions with activity since their last read, with mark-unread/mark-read actions (`sessions.patch { unread }`), and a Fork action that branches the transcript into a new session (`sessions.create { parentSessionKey, fork: true }`). Overview tiles above the table summarize the loaded roster (session count, live runs, unread sessions, total tokens), each row carries a kind glyph with a live-run dot, status renders as a plain dot plus label, and the Tokens column shows a context-window usage meter when the session reports token and context sizes. Row management actions live in a per-row menu (kebab button or right-click) mirroring the sidebar's session menu, and the row drawer carries the agent runtime and run duration alongside the other session details.
    - Session grouping: a Group by control organizes the sessions table into sections by custom groups, channel, kind, agent, or date. Custom groups persist per session via `sessions.patch` (`category`), so sessions started from message channels (Discord, Telegram, WhatsApp, ...) can be categorized too; assign groups by dragging rows onto a section, or with the per-row group selector, and create groups with the New group action.
    - Memory (a tab on the Agents page, scoped to the selected agent): dreaming status, enable/disable toggle, and Dream Diary reader (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`).
    - Import Memory (a settings page under **Agents & Tools**, `/settings/memory-import`): preview and copy local Codex consolidated memory or Claude Code auto-memory into the selected agent workspace (`migrations.memory.plan`, `migrations.memory.apply`).

  </Accordion>
  <Accordion title="Cron, tasks, plugins, skills, devices, exec approvals">
    - Automations (cron jobs): stat cards (automation count, failing count, scheduler state, next wake) above an Automations/Run history tab switch; the Automations tab lists jobs in a filterable table (All/Active/Paused, search, schedule and last-run filters, per-row action menu) with starter suggestions below, and the Run history tab shows recent runs across all automations (`cron.*`).
    - Tasks: live active and recent background task ledger with linked sessions and cancellation (`tasks.*`).
    - Plugins: browse the installed inventory and curated store, search ClawHub, install and remove plugin code, and enable or disable installed plugins (`plugins.*`); MCP server rows edit `mcp.servers` through the config methods.
    - Skills: status, enable/disable, install, API key updates (`skills.*`).
    - Devices: one inventory joins paired device records, the node catalog, and live presence (`device.pair.list`, `node.list`, `system-presence`). The Gateway host is pinned first; paired clients show connection status, roles, tokens, capabilities, and commands. Duplicate pairings collapse into an expandable group, and **Clean up N stale** bulk-removes admin-confirmed offline duplicates that were auto-approved (silent local, trusted-CIDR, or SSH-verified) or predate approval provenance. Entries can be removed (`node.pair.remove`, `device.pair.remove`), device pairing and node re-approvals handled inline (`device.pair.*`, `node.pair.approve`/`reject`), and mobile setup codes created from the same card.
    - Exec approvals: edit gateway or node allowlists and ask policy for `exec host=gateway/node` (`exec.approvals.*`).

  </Accordion>
  <Accordion title="Config">
    - View/edit `~/.openclaw/openclaw.json` (`config.get`, `config.set`).
    - Agents: a settings page (**Settings → Agents**, `/settings/agents`) with per-agent tabs (Overview, Files, Tools, Skills, Channels, Automations, Memory). The Overview tab edits the agent's identity — display name, emoji, and an avatar image that is downscaled and size-bounded in the browser before `agents.update`. Saving stores configured identity fields and mirrors them to the workspace `IDENTITY.md`; configured values take precedence over manual edits to the same file fields.
    - Profile: a settings page showing the default agent's identity with all-time usage stats — lifetime tokens, peak day, longest session, activity streaks, a year-long token heatmap, top tools, and channel highlights (`usage.cost`, `sessions.usage`).
    - MCP has a dedicated settings page with read-only server rows (transport, enablement, OAuth/filter/parallel summaries), common operator commands, and the scoped `mcp` config editor; adding, enabling/disabling, and removing servers happens on the Plugins page.
    - Model Providers: a settings page listing every configured model provider with its brand icon, auth state (`models.authStatus`), model availability (`models.list`), live plan/quota/billing data where the provider reports it (`usage.status`), and local session spend for the last 30 days (`sessions.usage`). A Refresh action re-reads credential state and provider usage.
    - Connection: a settings page (under **Connections**) owning the dashboard's own gateway link — WebSocket URL, gateway token, password, and default session key — plus the latest handshake snapshot (status, uptime, tick interval, last channels refresh). The offline login gate handles the disconnected case; this page edits the connection while connected.
    - Apply and restart with validation (`config.apply`), then wake the last active session.
    - Writes include a base-hash guard to prevent clobbering concurrent edits.
    - Writes (`config.set`/`config.apply`/`config.patch`) preflight active SecretRef resolution for refs in the submitted config payload; unresolved active submitted refs are rejected before write.
    - Form saves discard stale redacted placeholders that cannot be restored from the saved config, while preserving redacted values that still map to saved secrets.
    - Schema and form rendering come from `config.schema` / `config.schema.lookup`, including field `title`/`description`, matched UI hints, immediate child summaries, docs metadata on nested object/wildcard/array/composition nodes, plus plugin and channel schemas when available. Raw JSON editor is available only when the snapshot has a safe raw round-trip; otherwise Control UI forces Form mode.
    - Raw JSON editor "Reset to saved" preserves the raw-authored shape (formatting, comments, `$include` layout) instead of re-rendering a flattened snapshot, so external edits survive a reset when the snapshot can safely round-trip.
    - Structured SecretRef object values render read-only in form text inputs, to prevent accidental object-to-string corruption.

  </Accordion>
  <Accordion title="Usage">
    - Session-derived token and estimated-cost analysis stays separate from provider billing.
    - Provider cards call `usage.status` and show live plan names, quota windows, balances, spend, and budgets reported by configured provider plugins.
    - A provider usage failure does not block the session/cost dashboard; unavailable provider cards show their own error state.

  </Accordion>
  <Accordion title="Debug, logs, update">
    - Debug: status/health/models snapshots, event log, and manual RPC calls (`status`, `health`, `models.list`).
    - The event log includes Control UI refresh/RPC timings, slow chat/config render timings, and browser responsiveness entries for long animation frames or long tasks when the browser exposes those PerformanceObserver entry types.
    - Logs: live tail of gateway file logs with filter/export (`logs.tail`).
    - Update: run a package/git update plus restart (`update.run`) with a restart report, then poll `update.status` after reconnect to verify the running gateway version.

  </Accordion>
  <Accordion title="Automations panel notes">
    - Selecting a row opens a full-page detail view with an Active/Paused switch and Run now in the header (run-if-due, clone, and remove in its menu); the Settings tab edits the automation inline (prompt, details, frequency, advanced overrides) and the Run history tab shows that automation's runs.
    - Starter automations under the table prefill the create form with an editable prompt and schedule.
    - For isolated tasks, delivery defaults to announce summary; switch to none for internal-only runs.
    - Channel/target fields appear when announce is selected.
    - Webhook mode uses `delivery.mode = "webhook"` with `delivery.to` set to a valid HTTP(S) webhook URL.
    - For main-session tasks, webhook and none delivery modes are available.
    - Advanced edit controls include delete-after-run, clear agent override, cron exact/stagger options, agent model/thinking overrides, and best-effort delivery toggles.
    - Form validation is inline with field-level errors; invalid values disable the save button until fixed.
    - Set `cron.webhookToken` to send a dedicated bearer token; if omitted, the webhook is sent without an auth header.
    - `cron.webhook` is a deprecated legacy fallback: run `openclaw doctor --fix` to migrate stored jobs that still use `notify: true` to explicit per-job webhook or completion delivery.

  </Accordion>
</AccordionGroup>

## Import assistant memory

Open **Settings** → **Import Memory** to bring local Codex or Claude Code memory
into an OpenClaw agent. The Gateway discovers supported local memory on its own
host, so a remote Control UI imports from the Gateway computer rather than the
browser computer.

1. Choose the destination agent.
2. Review the detected source collections and Markdown filenames. File contents
   are not sent in the plan response or displayed in the page.
3. Select the collections to import and confirm. Apply rebuilds the plan before
   writing so stale selections fail safely.
4. If files already exist, enable **Replace existing imports**, refresh the
   preview, and confirm the replacement.

Codex imports only its consolidated `MEMORY.md` and `memory_summary.md`. Claude
Code imports Markdown from project auto-memory directories and a configured
`autoMemoryDirectory`; it does not import sessions, settings, instructions, or
credentials through this page. Files are copied below `memory/imports/` in the
selected workspace, where the active memory plugin can index them. Sources are
never changed.

Planning and applying require `operator.admin`. Every apply creates a verified
OpenClaw backup when state exists, writes a redacted migration report, and keeps
item-level backups before replacing existing destination files. See
[Memory overview](/concepts/memory#import-from-coding-assistants) for paths and
recall behavior.

## MCP page

专用的 MCP 页面是面向 OpenClaw 管理的 `mcp.servers` 下 MCP 服务器的操作员视图。它不会自行启动 MCP 传输；请用它来检查和编辑已保存配置，然后在需要实时服务器证明时使用 `openclaw mcp doctor --probe`。

典型工作流：

1. Open **MCP** from the sidebar.
2. Check the summary cards for total, enabled, OAuth, and filtered server counts.
3. Review each server row for transport, enablement, auth, filters, timeouts, and command hints.
4. Manage servers (add, enable/disable, remove) on the **Plugins** page, which is the single interactive writer of `mcp.servers`; the row list here links to it.
5. Edit the scoped `mcp` config section for server definitions, headers, TLS/mTLS paths, OAuth metadata, tool filters, and Codex projection metadata.
6. Use **Save** for a config write, or **Save & Publish** when the running Gateway should apply the changed config.
7. Run `openclaw mcp status --verbose`, `openclaw mcp doctor --probe`, or `openclaw mcp reload` from a terminal for static diagnostics, live proof, or cached-runtime disposal.

在渲染之前，此页面会对包含凭据的类 URL 值进行脱敏，并在命令片段中为服务器名称加引号，这样复制后的命令在包含空格或 shell 元字符时仍可正常工作。完整的 CLI 和配置参考： [MCP](/cli/mcp)。

## Activity 标签页

The Activity tab lives in **Settings › System**, next to Logs and Debug. It is an ephemeral browser-local observer for live tool activity, derived from the same Gateway `session.tool` / tool event stream that powers Chat tool cards. It does not add another Gateway event family, endpoint, durable activity store, metrics feed, or external observer stream.

Activity 条目只保留已脱敏摘要和经过脱敏、截断的输出预览。工具参数值不会存储在 Activity 状态中；UI 会显示这些参数被隐藏，并且只记录参数字段数量。内存中的列表跟随当前浏览器标签页，在 Control UI 内导航时会保留，并在页面重新加载、会话切换或点击 **Clear** 时重置。

## 操作终端

可停靠的操作终端默认是禁用的。要启用它，请设置 `gateway.terminal.enabled: true` 并重启 Gateway。该终端需要一个 `operator.admin` 连接，并会在活动 agent 工作区中打开一个主机 PTY。新标签页会跟随当前选中的聊天 agent。

<Warning>
该终端是一个不受限制的主机 shell，并继承 Gateway 进程环境。仅应为受信任的 operator 部署启用它。对于 `sandbox.mode: "all"` 的 agent，OpenClaw 会拒绝终端会话；将一个活动 agent 更改为该模式会关闭其现有和进行中的终端会话。
</Warning>

使用 **Ctrl + backtick** 切换停靠面板。布局支持底部和右侧停靠，会随浏览器视口调整大小，并可保留多个 shell 标签页。有关 `gateway.terminal.enabled` 以及可选的 `gateway.terminal.shell` 覆盖项，请参阅 [Gateway 配置](/gateway/configuration-reference#gateway)。

会话可在断开连接后继续保留：页面重新加载、笔记本电脑休眠或网络短暂中断时，Gateway 上的会话会被分离而不是终止，并且同一个浏览器标签页会在重新连接时重新附着，同时回放最近的输出。分离的会话会在 `gateway.terminal.detachedSessionTimeoutSeconds` 之后被终止（默认 300 秒；`0` 可恢复为断开即终止）。`terminal.list` 会显示可附着的会话，`terminal.attach` 会接管其中一个（tmux 风格的接管），而 `terminal.text` 可在不附着的情况下以纯文本读取会话的最近输出——这是面向 agent/工具链的能力。

该终端还可作为全屏、仅终端的文档，通过 `/?view=terminal` 访问。iOS 和 Android 应用会在其 Terminal 界面中嵌入此页面，并复用已存储的 gateway 凭据；可用性同样受 `gateway.terminal.enabled` 和 `operator.admin` 门控限制，当所连接的 Gateway 不提供终端时，页面会显示通知。

## Browser panel

The Control UI ships a dockable browser panel that renders the Gateway-controlled browser (the same one agents drive through the [browser tool](/tools/browser-control)) in any regular web browser - no native webview required. It appears when the connected Gateway advertises `browser.request` to an `operator.admin` connection; the globe button in the session workspace rail toggles it. The panel shows a live page snapshot with tabs, an editable URL bar, back/forward/reload, and open-in-your-browser, docks right or bottom, and forwards clicks, wheel scrolling, and basic typing to the remote page.

Two capture modes package page context for the agent:

- **Annotate (pencil)**: draw freehand markup over the page. **Send to chat** composites the strokes into the screenshot, attaches the image to the active chat composer, and prefills a prompt describing the page URL, title, and each marked region so the agent knows exactly what you circled.
- **Inspect (pointer)**: hover to see the element under the cursor (selector, accessible name, role, size); click to send that element's details plus a highlighted screenshot through the same composer flow. Inspect, wheel scrolling, and back/forward need `browser.evaluateEnabled` (on by default).

The macOS app keeps its native link-browser sidebar for links clicked in the dashboard; the browser panel works there too, and is the way to annotate pages on every other platform.

## Chat behavior

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` is **non-blocking**: it acks immediately with `{ runId, status: "started" }` and the response streams via `chat` events. Trusted Control UI clients may also receive optional ACK timing metadata for local diagnostics.
    - Chat uploads accept images plus non-video files. Images keep the native image path; other files are stored as managed media and shown in history as attachment links.
    - Re-sending with the same `idempotencyKey` returns `{ status: "in_flight" }` while running, and `{ status: "ok" }` after completion.
    - `chat.history` responses are size-bounded for UI safety. When transcript entries are too large, Gateway may truncate long text fields, omit heavy metadata blocks, and replace oversized messages with a placeholder (`[chat.history omitted: message too large]`).
    - When a visible assistant message was truncated in `chat.history`, the side reader can fetch the full display-normalized transcript entry on demand through `chat.message.get` by `sessionKey`, active `agentId` when needed, and transcript `messageId`. If the Gateway still cannot return more, the reader shows an explicit unavailable state instead of silently repeating the truncated preview.
    - Assistant/generated images are persisted as managed media references and served back through authenticated Gateway media URLs, so reloads do not depend on raw base64 image payloads staying in the chat history response.
    - When rendering `chat.history`, the Control UI strips display-only inline directive tags from visible assistant text (for example `[[reply_to_*]]` and `[[audio_as_voice]]`), plain-text tool-call XML payloads (including `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, and truncated tool-call blocks), and leaked ASCII/full-width model control tokens. It omits assistant entries whose whole visible text is only the exact silent token `NO_REPLY` / `no_reply` or the heartbeat acknowledgement token `HEARTBEAT_OK`.
    - During an active send and the final history refresh, the chat view keeps local optimistic user/assistant messages visible if `chat.history` briefly returns an older snapshot; the canonical transcript replaces those local messages once the Gateway history catches up.
    - Live `chat` events are delivery state, while `chat.history` is rebuilt from the durable session transcript. After tool-final events the Control UI reloads history and merges only a small optimistic tail; the transcript boundary is documented in [WebChat](/web/webchat).
    - `chat.inject` appends an assistant note to the session transcript and broadcasts a `chat` event for UI-only updates (no agent run, no channel delivery).
    - The sidebar lists every loaded active session by agent section and pinned/channel/work/custom/Chats buckets with a single New Session action that opens the draft dialog. Opening a visible row moves only the highlight. Custom groups are collapsible and drag-reorderable, and sessions can be dropped onto a group or Chats; group names and order sync through the gateway while the collapsed state stays in the browser. A new dashboard session asynchronously gets a concise generated title from its first non-command message; explicit names are never replaced. Set `agents.defaults.utilityModel` (or `agents.list[].utilityModel`) to route this separate model call to a lower-cost model. Expanding another agent section browses that agent's sessions without leaving the open chat.
    - Session search lives in the command palette (⌘K, or the Search field at the top of the sidebar): typing a query follows a bounded number of matching pages across agents, filters internal child/cron rows, and lists visible matches next to navigation commands. The Sessions page keeps the exhaustive searchable list with filters.
    - Each sidebar row keeps direct pin access plus a full context menu for unread state, rename, fork, grouping, archive, and delete. Multi-selected rows (Cmd/Ctrl-click, Shift-click for ranges) get a batch menu covering unread state, grouping, archive, and delete; batch archive/delete stays disabled unless every selected session is archivable. An active run and an agent's main session cannot be archived. Archiving or deleting the currently selected session switches Chat back to that agent's main session.
    - In the macOS app, the OpenClaw mark uses the otherwise-empty native titlebar strip next to the window controls instead of consuming a sidebar row.
    - On desktop widths, chat controls stay on one compact row and collapse while scrolling down the transcript; scrolling up, returning to the top, or reaching the bottom restores the controls.
    - Consecutive duplicate text-only messages render as one bubble with a count badge. Messages that carry images, attachments, tool output, or canvas previews are left uncollapsed.
    - When a session's checkout sits on a non-default branch of a GitHub repository, the chat view pins pull request chips above the composer: PR number, repo, branch, diff counts, a CI pill, and draft/merged/closed state, each linking to the PR. The row shows at most two chips — live (open/draft) PRs first — and a "Show more" button reveals collapsed merged/closed history. The CI pill opens a small CI monitoring popover with passed/failed/running/skipped check counts and a link to the PR's checks page. Detection runs server-side through `controlUi.sessionPullRequests`, which reuses the Gateway's `GH_TOKEN`/`GITHUB_TOKEN` when set. When the GitHub API rate limit is hit, chips keep the last known status and show a warning that the status may be out of date; dismissing a chip hides it for that session in the current browser profile. Before any PR exists, the row shows the branch itself — repo, branch name, and the +/− size of the diff against the default-branch merge base (committed and uncommitted work). Once the pushed branch has commits to compare, the row adds a Create PR button that opens GitHub's new-pull-request page; before that, a session with changed files (committed, uncommitted, or untracked) still gets the row without the button. The row hides itself while an open or draft PR exists. The branch row comes from local git only, so it stays available while GitHub is rate limited and carries the same stale-status warning, since "no PR found" cannot be trusted until the limit resets.
    - The session diff panel shows what a session's checkout actually changed: the branch button (in the workspace rail header, the split-pane header, or the floating button in single-pane chat) opens the detail panel with a per-file diff of branch, uncommitted, and untracked work against the checkout's default-branch merge base — status dot, rename arrow, per-file +/− counts, collapsible files, and "N unmodified lines" markers between hunks. Diffs are computed server-side through the `sessions.diff` Gateway method (`operator.read` scope); binary and oversized files degrade to stats-only entries, and the button only appears when the connected Gateway advertises `sessions.diff`.
    - The session workspace rail in each Chat pane lists session files, project files, and artifacts. It docks to the pane's right edge by default; drag its header (or use the dock button) to move it to the bottom, and the choice is stored in the current browser profile. A collapsed rail takes no space at all: reopen it with ⇧⌘B, the files toggle in the split-pane header, or the floating files button in single-pane chat (both carry a changed-file count badge). The separate file, tool, and Canvas detail panel is unaffected.
    - Clicking a file reference in chat, a file path in an expanded read/edit/write tool card, or a file row in the workspace rail opens the file detail panel: a CodeMirror-based code view with syntax highlighting, line numbers, jump-to-line, in-file search, copy actions, and an open-in-external-editor menu. When the Gateway advertises `sessions.files.set` to an `operator.admin` connection, the panel adds an Edit mode with dirty tracking and Cmd/Ctrl-S save; unsaved drafts survive file, panel, and session navigation in the current browser tab until explicitly saved or discarded. Saves are compare-and-swap on a content hash returned by `sessions.files.get`: if the file changed on disk since it was loaded (for example because the agent kept working), the panel shows a conflict notice with Reload (take the latest content) and Overwrite (keep the local edit) actions. Writes go through the same fs-safe workspace guards as reads — path containment, symlink/hardlink rejection, and a 256 KB UTF-8 cap — and only overwrite existing files; the editor never creates or deletes them.
    - The background tasks rail in each Chat pane lists the current agent's background tasks and subagents (`tasks.list` scoped by agent, kept live by `task` events): running work shows a live elapsed timer, tool-use count, the tool currently in use, and a stop control; the collapsible finished section adds run durations; and a View transcript link opens the task's child session in the pane. Open it with the activity toggle in the split-pane header or the floating activity button in single-pane chat — the task snapshot loads eagerly, so both carry a running-count badge without opening the rail first. The Tasks page remains the full cross-agent ledger.
    - The workspace rail, background tasks rail, and detail panel adapt to each pane's own width rather than the window: in a narrow pane or compact window both rails present as bottom strips (side-dock controls hide until the pane widens; the workspace rail keeps first claim on the side slot when only one column fits), and the detail panel stacks below the thread with a horizontal resize handle instead of sharing the row with it. Phone-sized viewports still open the detail panel full-screen.
    - The chat header model and thinking pickers patch the active session immediately through `sessions.patch`; they are persistent session overrides, not one-turn-only send options.
    - **Split view:** open it from the top-right floating toggle row (beside the session diff, background tasks, and session files toggles), then split the active pane right or down for as many panes as fit. Each pane has its own session, transcript, composer, and tool stream.
    - Drag a session from the sidebar into chat to open it in a pane. An animated drop preview glides between zones and labels the outcome — "Split" over the exact half a new pane will occupy, "Open here" over a whole pane — and drops also work from single-pane mode.
    - The active split pane drives the sidebar selection and URL. Each pane carries its own header row with the session title plus workspace-rail, split, and close controls; dividers resize columns and stacked panes, and the browser stores the layout locally across reloads.
    - On narrow screens, split view keeps the layout but renders only the active pane, including its header with the close control.
    - If you send a message while a model picker change for the same session is still saving, the composer waits for that session patch before calling `chat.send` so the send uses the selected model.
    - Typing `/new` creates and switches to the same fresh dashboard session as New Chat, except when `session.dmScope: "main"` is configured and the current parent is the agent's main session; then it resets the main session in place. Typing `/reset` keeps the Gateway's explicit in-place reset for the current session.
    - The chat model picker requests the Gateway's configured model view. If `agents.defaults.models` is present, that allowlist drives the picker, including `provider/*` entries that keep provider-scoped catalogs dynamic. Otherwise the picker shows explicit `models.providers.*.models` entries plus providers with usable auth. The full catalog stays available through the debug `models.list` RPC with `view: "all"`.
    - When fresh Gateway session usage reports include current context tokens, the chat composer toolbar shows a small context usage ring with the used percentage. Open the ring for the current context window, latest-run token counts and estimated total cost, provider/model identity, and the latest provider response's input/output/cache cost breakdown when reported. The ring switches to warning styling at high context pressure and, at recommended compaction levels, shows a compact button that runs the normal session compaction path. Stale token snapshots are hidden until the Gateway reports fresh usage again.

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Talk mode uses a registered realtime voice provider. Configure OpenAI with `talk.realtime.provider: "openai"` plus an `openai` API-key profile, `talk.realtime.providers.openai.apiKey`, or `OPENAI_API_KEY`. OpenAI Realtime uses the public Platform API and requires a Platform API key; a Codex OAuth login does not satisfy this surface. Configure Google with `talk.realtime.provider: "google"` plus `talk.realtime.providers.google.apiKey`. The browser never receives a standard provider API key: OpenAI receives an ephemeral Realtime client secret for WebRTC, and Google Live receives a one-use constrained Live API auth token for a browser WebSocket session, with instructions and tool declarations locked into the token by the Gateway. Providers that only expose a backend realtime bridge run through the Gateway relay transport, so credentials and vendor sockets stay server-side while browser audio moves through authenticated Gateway RPCs. The Realtime session prompt is assembled by the Gateway; `talk.client.create` does not accept caller-provided instruction overrides.

    Persistent provider, model, voice, transport, reasoning effort, exact VAD threshold, silence duration, and prefix padding defaults live in **Settings → Communications → Talk**; changing them requires `operator.admin` access. Configuring Gateway relay forces the backend relay path; configuring WebRTC keeps the session client-owned and fails instead of silently falling back to relay if the provider cannot create a browser session.

    The Talk control itself is the microphone button in the composer toolbar. Its caret lists **System default** and every microphone exposed by the browser, including USB, Bluetooth, and virtual inputs. The selected device ID stays browser-local and is never sent to the Gateway; if that exact device disappears, Talk asks you to choose another input instead of silently recording from a different microphone. While Talk is live, the microphone button becomes a pill showing the live input-level meter; clicking it stops voice input, and hovering it reveals the stop glyph. Screen readers announce `Connecting voice input...`, `Listening...`, or `Asking OpenClaw...` while a realtime tool call is consulting the configured larger model through `talk.client.toolCall`. Stopping a running agent response stays a separate square **Stop** control next to the pill.

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

## Connection loss and reconnect

Once a session is established, a dropped Gateway connection does not log you out. The dashboard
stays visible with a floating amber "Gateway connection lost — Reconnecting…" pill under the top
bar while the client retries automatically with backoff (800 ms up to 15 s). Live updates and
realtime/session actions pause until the connection returns; **Retry now** in the pill forces an
immediate attempt. Chat remains editable: ordinary text and attachment sends are kept in the
current tab's gateway/session-scoped browser storage, shown as waiting for reconnect, and sent
automatically when the Gateway returns. Live controls and slash commands remain unavailable while
offline.

When this browser already holds credentials (a configured token/password or an approved device
token), first opens and reloads show a small animated OpenClaw mark while the connection is
established instead of flashing the login gate. The login gate only appears when no credentials
are stored yet or when the Gateway actively rejects them (bad token/password, revoked pairing) —
states that need your input rather than waiting.

## PWA install and web push

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

The bundled Canvas plugin also provides [`show_widget`](/tools/show-widget) to render self-contained SVG or HTML directly from a tool call. The browser advertises the `inline-widgets` Gateway capability, and the resulting Canvas document remains available when chat history reloads. Channel-originated runs do not receive this tool.

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

The chat transcript uses a centered readable frame aligned with the composer. Assistant and tool output stay left-aligned while user bubbles stay right-aligned inside that frame. Wide-monitor deployments can override the transcript width without patching bundled CSS by setting `gateway.controlUi.chatMessageMaxWidth`:

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

- Avatars and images served under relative paths (for example `/avatars/<id>`) still render, including authenticated avatar routes the UI fetches and converts into local `blob:` URLs.
- Inline `data:image/...` URLs still render.
- Local `blob:` URLs created by the Control UI still render.
- GitHub link preview avatars are fetched by the Gateway from GitHub's fixed avatar host and returned as bounded `data:` URLs; the operator browser never contacts the remote avatar host.
- Remote avatar URLs emitted by channel metadata are stripped at the Control UI's avatar helpers and replaced with the built-in logo/badge, so a compromised or malicious channel cannot force arbitrary remote image fetches from an operator browser.

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

## Approval links

Operator approval notifications can deep-link to a standalone approval document served under the reserved `${controlUiBasePath}/approve/{approvalId}` namespace (for example `/approve/<approvalId>`, or `/openclaw/approve/<approvalId>` with a configured base path). The URL is stable for the lifetime of the approval and safe to forward between your own devices: it identifies the approval, never authorizes it.

- The one-segment `/approve/<approvalId>` namespace is reserved by the Gateway ahead of plugin HTTP routes for **all** HTTP methods, so a plugin route can never shadow or intercept an approval document.
- Opening an approval document requires the same gateway auth as the rest of the Control UI (token/password, Tailscale Serve identity, or trusted-proxy identity); credentials are never part of the approval URL.
- When Control UI serving is disabled, requests to the namespace return `404` instead of falling through to plugin handlers.
- Signing in on an approval document is ephemeral for that page: it does not overwrite the gateway selection or settings saved by the full Control UI in the same browser.

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
