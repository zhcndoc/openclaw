---
summary: "OpenClaw 的代理工具界面（浏览器、画布、节点、消息、定时任务），用于替代旧版的 `openclaw-*` 技能"
read_when:
  - 添加或修改代理工具时
  - 退役或修改 `openclaw-*` 技能时
title: "工具"
---

# 工具（OpenClaw）

OpenClaw 暴露了**一流的代理工具**，覆盖浏览器、画布、节点和定时任务等功能。  
这些工具取代了旧的 `openclaw-*` 技能：工具是类型安全的，无需执行 shell，代理应直接依赖它们。

## 禁用工具

你可以通过 `openclaw.json` 中的 `tools.allow` / `tools.deny` 全局允许/禁止工具（deny 优先）。这会阻止被禁止的工具发送给模型提供商。

```json5
{
  tools: { deny: ["browser"] },
}
```

注意事项：

- 匹配不区分大小写。
- 支持 `*` 通配符（`"*"` 代表所有工具）。
- 如果 `tools.allow` 只包含未知或未加载的插件工具名称，OpenClaw 会记录警告并忽略允许列表，从而确保核心工具可用。

## 工具配置文件（基础允许列表）

`tools.profile` 设置**基础工具允许列表**，优先于 `tools.allow` / `tools.deny`。  
单代理覆盖：`agents.list[].tools.profile`。

配置文件选项：

- `minimal`：仅 `session_status`
- `coding`：`group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`
- `messaging`：`group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`
- `full`：无限制（等同于未设置）

示例（默认仅消息，且允许 Slack + Discord 工具）：

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

示例（coding 配置文件，但全局禁止 exec/process）：

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

示例（全局 coding 配置文件，Support 代理仅支持消息）：

```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] },
      },
    ],
  },
}
```

## 按提供商限定工具策略

使用 `tools.byProvider` 可**进一步限制**针对特定提供商或单一 `provider/model` 的工具，且不改变全局默认设置。  
单代理覆盖：`agents.list[].tools.byProvider`。

此限制应用于基础工具配置文件之后、允许/禁止列表之前，因此只能缩小工具集合。  
提供商键支持 `provider`（如 `google-antigravity`）或 `provider/model`（如 `openai/gpt-5.2`）。

示例（保留全局 coding 配置文件，但 Google Antigravity 限制为 minimal）：

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```

示例（针对不稳定的端点，针对具体 provider/model 设置允许列表）：

```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

示例（为单一提供商设置代理特定覆盖）：

```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-antigravity": { allow: ["message", "sessions_list"] },
          },
        },
      },
    ],
  },
}
```

## 工具组（快捷方式）

工具策略（全局、代理、沙箱）支持 `group:*` 条目，可展开为多个工具。  
在 `tools.allow` / `tools.deny` 中使用。

可用的工具组：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：全部内置 OpenClaw 工具（不含提供商插件）

示例（仅允许文件工具 + 浏览器）：

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## 插件 + 工具

插件可注册**额外工具**（及 CLI 命令），超出核心工具集。  
参阅 [插件](/tools/plugin) 了解安装和配置，参阅 [技能](/tools/skills) 了解如何将工具使用指南注入提示。部分插件自带技能，用于辅助工具（例如，语音通话插件）。

可选插件工具：

- [Lobster](/tools/lobster)：带有可恢复审批的类型化工作流运行时（需网关主机上安装 Lobster CLI）。
- [LLM 任务](/tools/llm-task)：仅 JSON 格式的 LLM 步骤，用于结构化工作流输出（支持可选模式验证）。
- [差异](/tools/diffs)：只读差异查看器，可渲染前后文本或统一补丁为 PNG 或 PDF 文件。

## 工具清单

### `apply_patch`

对一个或多个文件应用结构化补丁，适合多段编辑。  
实验性功能：通过 `tools.exec.applyPatch.enabled` 启用（仅限 OpenAI 模型）。  
`tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限定在工作区内）。仅当你有意让 `apply_patch` 在工作区外写入或删除时，才设置为 `false`。

### `exec`

在工作区内运行 shell 命令。

核心参数：

- `command`（必填）
- `yieldMs`（超时自动后台，默认 10000）
- `background`（立即后台）
- `timeout`（秒；超时强制终止，默认 1800）
- `elevated`（布尔；启用/允许提升权限模式下在主机运行；仅当代理处于沙箱时生效）
- `host`（`sandbox` | `gateway` | `node`）
- `security`（`deny` | `allowlist` | `full`）
- `ask`（`off` | `on-miss` | `always`）
- `node`（`host=node` 时指定节点 id/名称）
- 需要真实终端？设置 `pty: true`。

注意事项：

- 后台执行时，返回 `status: "running"` 和 `sessionId`。
- 使用 `process` 查询/日志/写入/终止/清理后台进程。
- 如果禁止使用 `process`，`exec` 同步运行，忽略 `yieldMs` 和 `background`。
- `elevated` 受 `tools.elevated` 及 `agents.list[].tools.elevated` 覆盖限制（两者均需允许），相当于 `host=gateway` 且 `security=full`。
- `elevated` 仅在代理处于沙箱时改变运行行为（否则无效）。
- `host=node` 可针对 macOS 伴随程序或无头节点主机（`openclaw node run`）。
- 网关/节点审批及允许列表详见 [Exec approvals](/tools/exec-approvals)。

### `process`

管理后台 exec 会话。

核心操作：

- `list`、`poll`、`log`、`write`、`kill`、`clear`、`remove`

注意事项：

- `poll` 返回新输出和完成时的退出状态。
- `log` 支持基于行的 `offset`/`limit`（省略 `offset` 则获取最后 N 行）。
- `process` 按代理隔离；不可见其他代理的会话。

### `loop-detection`（工具调用循环守卫）

OpenClaw 跟踪近期工具调用历史，检测到重复无进展循环时阻止或警告。  
通过 `tools.loopDetection.enabled: true` 启用（默认 `false`）。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      historySize: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

- `genericRepeat`：重复同一工具及相同参数调用模式。
- `knownPollNoProgress`：多次轮询类工具输出无变化。
- `pingPong`：交替 `A/B/A/B` 无进展模式。
- 单代理覆盖：`agents.list[].tools.loopDetection`。

### `web_search`

使用 Brave Search API 搜索网络。

核心参数：

- `query`（必填）
- `count`（1–10；默认取 `tools.web.search.maxResults`）

注意事项：

- 需要 Brave API 密钥（推荐执行 `openclaw configure --section web`，或设置环境变量 `BRAVE_API_KEY`）。
- 通过 `tools.web.search.enabled` 启用。
- 响应缓存（默认 15 分钟）。
- 详见 [Web tools](/tools/web) 配置文档。

### `web_fetch`

抓取并提取网页内容（HTML → Markdown/文本）。

核心参数：

- `url`（必填）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断超长页面）

注意事项：

- 通过 `tools.web.fetch.enabled` 启用。
- `maxChars` 最大限制由 `tools.web.fetch.maxCharsCap` 控制（默认 50000）。
- 响应缓存（默认 15 分钟）。
- JS 交互重度页面优先使用浏览器工具。
- 详见 [Web tools](/tools/web)。
- 另可选用 [Firecrawl](/tools/firecrawl) 作为反爬虫备用方案。

### `browser`

控制专用的 OpenClaw 管理浏览器。

核心动作：

- `status`、`start`、`stop`、`tabs`、`open`、`focus`、`close`
- `snapshot`（aria/ai）
- `screenshot`（返回图片块 + `MEDIA:<path>`）
- `act`（UI 操作：点击/输入/按键/悬浮/拖拽/选择/填写/调整尺寸/等待/执行 JS）
- `navigate`、`console`、`pdf`、`upload`、`dialog`

配置管理：

- `profiles` — 列出所有浏览器配置文件及状态
- `create-profile` — 新建配置文件，自动分配端口（或指定 `cdpUrl`）
- `delete-profile` — 停止浏览器，删除用户数据，从配置中移除（本地限定）
- `reset-profile` — 重启端口孤儿进程（本地限定）

常用参数：

- `profile`（可选；默认取 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；指定节点 id/名称）

注意事项：

- 需启用 `browser.enabled=true`（默认启用；设置为 `false` 可禁用）。
- 所有操作支持可选 `profile`，支持多实例。
- 未指定 `profile` 时，使用 `browser.defaultProfile`（默认为 "chrome"）。
- 配置文件名只允许小写字母数字加连字符（最长 64 字符）。
- 端口范围：18800-18899（最多约 100 个配置文件）。
- 远程配置文件仅支持连接，不支持启动/停止/重置。
- 若已连接具浏览器功能节点，工具可能自动路由至该节点（除非锁定 `target`）。
- Playwright 安装时，`snapshot` 默认使用 `ai` 模式；使用 `aria` 可获取辅助功能树。
- `snapshot` 还支持 role-snapshot 选项（`interactive`、`compact`、`depth`、`selector`），返回类似 `e12` 的引用。
- `act` 需要 `snapshot` 产生的 `ref`（AI 快照为数字，如 `12`，辅助快照为 `e12`）；少数 CSS 选择器使用 `evaluate`。
- 默认避免 `act` 后紧跟 `wait`，仅在特殊场景使用（无可靠 UI 状态等待）。
- `upload` 可选传递 `ref`，自动点击以启动上传。
- `upload` 支持 `inputRef`（aria 引用）或 `element`（CSS 选择器），直接设置 `<input type="file">`。

### `canvas`

驱动节点画布（呈现、执行、快照、A2UI）。

核心动作：

- `present`、`hide`、`navigate`、`eval`
- `snapshot`（返回图片块 + `MEDIA:<path>`）
- `a2ui_push`、`a2ui_reset`

注意事项：

- 底层调用网关的 `node.invoke`。
- 未指定 `node` 时，自动选择默认（唯一连接节点或本地 mac 节点）。
- A2UI 仅支持 v0.8（无 `createSurface`），CLI 拒绝 v0.9 JSONL 并报错。
- 快速示例：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

发现和操作配对节点；发送通知；拍摄相机或屏幕内容。

核心动作：

- `status`、`describe`
- `pending`、`approve`、`reject`（配对流程）
- `notify`（macOS 系统通知）
- `run`（macOS 系统运行）
- `camera_list`、`camera_snap`、`camera_clip`、`screen_record`
- `location_get`、`notifications_list`、`notifications_action`
- `device_status`、`device_info`、`device_permissions`、`device_health`

注意事项：

- 相机/屏幕指令要求节点程序窗口处于前台。
- 图片返回图片块 + `MEDIA:<path>`。
- 视频返回 `FILE:<path>`（mp4 格式）。
- 位置返回 JSON 负载（经度/纬度/精度/时间戳）。
- `run` 参数：`command`（argv 数组）；可选 `cwd`、`env`（`KEY=VAL`）、`commandTimeoutMs`、`invokeTimeoutMs`、`needsScreenRecording`。

示例（`run`）：

```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`

使用配置的图像模型分析图像。

核心参数：

- `image`（必填，路径或 URL）
- `prompt`（可选，默认 "Describe the image."）
- `model`（可选覆盖）
- `maxBytesMb`（可选大小限制）

注意事项：

- 仅当配置了 `agents.defaults.imageModel`（主模型或备选）或可从默认模型+授权推断隐式图像模型时可用（最佳匹配）。
- 直接调用图像模型，与主聊天模型独立。

### `pdf`

分析一个或多个 PDF 文档。

完整行为、限制、配置和示例详见 [PDF 工具](/tools/pdf)。

### `message`

跨 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams 发送消息和频道操作。

核心动作：

- `send`（文本 + 可选媒体；MS Teams 还支持 Adaptive Cards 的 `card`）
- `poll`（WhatsApp/Discord/MS Teams 调查）
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

注意事项：

- WhatsApp 的 `send` 使用网关转发；其他频道直连。
- WhatsApp 和 MS Teams 的 `poll` 使用网关；Discord 直接发送。
- 当消息工具调用绑定至活跃聊天会话时，发送限制为该会话目标，避免跨上下文泄漏。

### `cron`

管理网关定时任务和唤醒。

核心动作：

- `status`、`list`
- `add`、`update`、`remove`、`run`、`runs`
- `wake`（入队系统事件 + 可选立即心跳）

注意事项：

- `add` 需完整定时任务对象（与 `cron.add` RPC 结构相同）。
- `update` 使用 `{ jobId, patch }` 格式（兼容接受 `id` 字段）。

### `gateway`

重启或应用网关进程的更新（在线升级）。

核心动作：

- `restart`（授权并发送 `SIGUSR1` 实现进程内重启；等同于 `openclaw gateway` 在线重启）
- `config.schema.lookup`（单独检查一个配置路径，无需加载整个 schema）
- `config.get`
- `config.apply`（校验 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并增量更新 + 重启 + 唤醒）
- `update.run`（执行更新 + 重启 + 唤醒）

注意事项：

- `config.schema.lookup` 期望具体点路径，如 `gateway.auth` 或 `agents.list.*.heartbeat`。
- 使用 `delayMs`（默认 2000）避免打断正常回复。
- `config.schema` 对内部 Control UI 流程开放，但不通过代理 `gateway` 工具暴露。
- `restart` 默认启用；设置 `commands.restart: false` 禁用。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出会话、查看历史记录，或向其他会话发送消息。

核心参数：

- `sessions_list`：`kinds?`、`limit?`、`activeMinutes?`、`messageLimit?`（0=无）
- `sessions_history`：`sessionKey`（或 `sessionId`）、`limit?`、`includeTools?`
- `sessions_send`：`sessionKey`（或 `sessionId`）、`message`、`timeoutSeconds?`（0=火并忘记）
- `sessions_spawn`：`task`、`label?`、`runtime?`、`agentId?`、`model?`、`thinking?`、`cwd?`、`runTimeoutSeconds?`、`thread?`、`mode?`、`cleanup?`、`sandbox?`、`streamTo?`、`attachments?`、`attachAs?`
- `session_status`：`sessionKey?`（默认当前；支持 `sessionId`）、`model?`（`default` 清除覆盖）

注意事项：

- `main` 是直接对话的规范 key；global/unknown 不显示。
- `messageLimit > 0` 时每会话取最近 N 条消息（过滤工具消息）。
- 会话目标受 `tools.sessions.visibility` 控制（默认 `tree`：当前会话加生成的子代理会话）。如运行多用户共享代理，建议设为 `tools.sessions.visibility: "self"` 防止跨会话查看。
- `sessions_send` 当 `timeoutSeconds > 0` 时等待最终完成。
- 发送/通知发生在完成后，且为尽力而为；`status: "ok"` 意味运行完毕，不保证通知送达。
- `sessions_spawn` 支持 `runtime: "subagent"` 或 `"acp"`（默认 `subagent`）。ACP 运行时行为见 [ACP Agents](/tools/acp-agents)。
- ACP 运行时，`streamTo: "parent"` 会将初步进度摘要作为系统事件传回请求会话，而非直接子会话传递。
- `sessions_spawn` 启动子代理任务，并向请求聊天发布通告回复。
  - 支持一次性模式（`mode: "run"`）和持久线程绑定模式（`mode: "session"` 且 `thread: true`）。
  - 若 `thread: true` 且省略 `mode`，默认为 `session`。
  - `mode: "session"` 必须 `thread: true`。
  - 若未指定 `runTimeoutSeconds`，OpenClaw 使用 `agents.defaults.subagents.runTimeoutSeconds`（若配置）；否则超时设为 0（无限制）。
  - Discord 线程绑定依赖于 `session.threadBindings.*` 和 `channels.discord.threadBindings.*`。
  - 回复格式包含 `Status`、`Result` 及简洁统计信息。
  - `Result` 是助手回复文本；缺失时采用最新的 `toolResult` 作为备用。
- 完成模式下，先同步发送，出现队列，遇暂时失败重试（`status: "ok"` 表示运行结束，不代表通告完成）。
- `sessions_spawn` 仅限子代理运行时支持内联文件附件（ACP 不支持）。每个附件包括 `name`、`content` 及可选 `encoding`（`utf8` 或 `base64`）和 `mimeType`。文件会被存放至子工作区 `.openclaw/attachments/<uuid>/` 内，含 `.manifest.json` 元数据文件。工具返回收据包含附件数、总字节数、每文件 `sha256` 和相对路径。附件内容自动从转录持久化中脱敏。
  - 通过 `tools.sessions_spawn.attachments` 配置限制（`enabled`、`maxTotalBytes`、`maxFiles`、`maxFileBytes`、`retainOnSessionKeep`）。
  - `attachAs.mountPath` 为未来挂载实现预留提示。
- `sessions_spawn` 非阻塞，立即返回 `status: "accepted"`。
- ACP 运行时，`streamTo: "parent"` 响应可能包含 `streamLogPath`（会话范围内 `*.acp-stream.jsonl`），用于尾部进度日志。
- `sessions_send` 运行回声问答（回复 `REPLY_SKIP` 停止；最大回合数 `session.agentToAgent.maxPingPongTurns`，0–5）。
- 回声结束后，目标代理执行**通告步骤**；回复 `ANNOUNCE_SKIP` 可跳过通知。
- 沙箱限制：当当前会话处于沙箱且 `agents.defaults.sandbox.sessionToolsVisibility: "spawned"` 时，OpenClaw 会将 `tools.sessions.visibility` 限制为 `tree`。

### `agents_list`

列出当前会话可用的代理 id（供 `sessions_spawn` 目标）。

注意事项：

- 结果受限于每代理允许列表（`agents.list[].subagents.allowAgents`）。
- 当配置为 `["*"]` 时，包含全部配置代理，并标记 `allowAny: true`。

## 参数（通用）

网关支持工具（`canvas`、`nodes`、`cron`）：

- `gatewayUrl`（默认 `ws://127.0.0.1:18789`）
- `gatewayToken`（启用身份验证时）
- `timeoutMs`

注意：配置了 `gatewayUrl` 时必须显式包含 `gatewayToken`。工具不会继承配置或环境凭据，缺失显式认证视为错误。

浏览器工具：

- `profile`（可选；默认取 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；锁定特定节点 id/名称）

## 推荐的代理流程

浏览器自动化：

1. `browser` → `status` / `start`
2. `snapshot`（ai 或 aria）
3. `act`（点击/输入/按键）
4. 需要视觉确认时，执行 `screenshot`

画布渲染：

1. `canvas` → `present`
2. （可选）`a2ui_push`
3. `snapshot`

节点定位：

1. `nodes` → `status`
2. 选定节点执行 `describe`
3. `notify` / `run` / `camera_snap` / `screen_record`

## 安全性

- 避免直接调用 `system.run`，仅在获得明确用户许可时使用 `nodes` → `run`。
- 尊重用户摄像头和屏幕采集许可。
- 先调用 `status`/`describe` 确认权限，再执行媒体相关命令。

## 工具如何呈现给代理

工具通过两种并行渠道暴露：

1. **系统提示文本**：人类可读的列表及使用指导。
2. **工具 schema**：以结构化函数定义形式发送给模型 API。

这意味着代理同时“知道有哪些工具”和“如何调用”。  
若工具未出现在系统提示或 schema 中，模型无法调用该工具。
