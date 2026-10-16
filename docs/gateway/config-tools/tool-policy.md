---
summary: "工具配置文件、组、沙箱工具门、代码模式和 allow/deny 策略层"
read_when:
  - "选择工具配置文件或使用 `tools.allow` 扩展它"
  - "决定提供者、发送者或沙盒会话可以调用哪些工具"
  - "启用代码模式或提升执行权限"
title: "配置——工具策略"
---

决定运行可以调用哪些工具的策略层：`tools.profile`、工具组、沙箱工具门、`tools.codeMode` 以及在它们之上评估的 `allow`/`deny` 表面。

## <a id="tool-profiles"></a> 工具配置文件

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置基础允许列表：

<Note>
当未配置配置文件时，包括当在现有未配置文件的配置上再次运行载入时，本地载入设置为 `tools.profile: "full"`。显式 `minimal`、`coding`、`messaging` 和 `full` 配置文件和其他工具策略保持不变。现有配置不会自动迁移。
</Note>

全选工具；它不授予 **Full Access** 执行权限。聊天 **执行权限** 菜单控制可用工具在该会话中可以执行的操作。全局、代理、提供商、allow/deny、所有者、文件系统、沙箱和执行限制仍然适用。目录条目并不意味着在当前会话中配置、连接或授权工具或插件。

代理的 **Tools** 设置包括依赖于运行的工具，例如 `github_identity_status`、`github_publish` 和 `transcripts`，因此 **Disable All** 还为它们添加显式拒绝。它们的目录行不会绕过 GitHub 工作区和身份检查或会议记录呼叫者检查。

| 配置文件     | 包含内容                                                                                                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | `session_status`、`gateway`（仅更新）                                                                                                                                                                                                                                        |
| `coding`    | `group:fs`、`group:runtime`、`group:web`、`group:sessions`、`group:memory`、`cron`、`gateway`（仅更新）、`get_goal`、`create_goal`、 `update_goal`、`progress_card`、`ask_user`、`skill_workshop`、`view_image`、`image_generate`、`music_generate`、`video_generate`         |
| `messaging` | `group:messaging`、`sessions`、`sessions_list`、`sessions_history`、`sessions_search`、`conversations_list`、`conversations_send`、`conversations_turn`、`sessions_send`、 `sessions_spawn`、`sessions_yield`、`subagents`、`session_status`、`gateway`（仅更新）、`ask_user` |
| `full`      | 无核心剖面过滤；也选择可选的插件工具                                                                                                                                                                                                                     |

`coding` 和 `messaging` 还包括 [ 主题工具](/tools/theme) 并隐式允许 `bundle-mcp`（配置的 MCP 服务器）。

[`tts` 工具](/tools/tts/api#tool-profiles) 不属于任何受限配置文件。如需让`minimal`、`coding`或`messaging`上的座席呼叫它，请将`tts`添加到`tools.alsoAllow`。 [Automatic TTS](/tools/tts/output#auto-tts-behavior) 不是工具，因此配置文件不会影响它。

未设置的配置文件也不会过滤核心工具，但本身不会选择可选的插件工具。显式 `full` 为插件工具选择提供通配符，包括已启用插件中的可选工具。插件配置、可用性和独立策略限制仍然适用。

`minimal`、`coding` 和 `messaging` 配置文件包括仅具有 `update.run` 操作的 `gateway`。这使得所有者可以通过现有工具请求 OpenClaw 更新，而无需授予配置读取权限。更新使用与 `/update` 和 Control UI 相同的网关处理程序。外部聊天更新需要当前所有者授权和 `commands.restart`； Control UI 更新保留其操作员授权。

`full` 配置文件和未设置的配置文件保留该工具的配置读取操作。在受限配置文件中，显式将 `gateway` 添加到 `tools.alsoAllow` 以启用 `config.get` 和 `config.schema.lookup`。如果特定于提供商的配置文件也受到限制，则其 `alsoAllow` 也必须授予 `gateway`。现有的全局、代理、提供者、对话、沙箱和运行时 allow/deny 限制仍然决定该工具是否可用。分代理和非所有者限制仍然适用。

## <a id="tool-groups"></a> 工具组

| 团体              | 工具                                                                                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`、`process`、`code_execution`（`bash` 可作为 `exec` 的别名）                                                                                                                                                                          |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                                                                                                                                                   |
| `group:sessions`   | `sessions`, `sessions_list`, `sessions_history`, `sessions_search`, `conversations_list`, `conversations_send`, `conversations_turn`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`, `suggest_task`, `dismiss_task` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                                                                                                                                                            |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                                                                                                                                                    |
| `group:ui`         | `browser`, `screen`, `theme`, `dashboard`, `terminal`, `portal`, `canvas`, `show_widget`                                                                                                                                                                 |
| `group:automation` | `heartbeat_respond`、`automations`（`cron` 别名）、`gateway`、`plugins`、`openclaw`                                                                                                                                                                      |
| `group:messaging`  | `message`                                                                                                                                                                                                                                                |
| `group:nodes`      | `nodes`, `computer`                                                                                                                                                                                                                                      |
| `group:agents`     | `agents_list`, `get_goal`, `create_goal`, `update_goal`, `progress_card`, `ask_user`, `skill_workshop`                                                                                                                                                   |
| `group:media`      | `view_image`, `image_generate`, `music_generate`, `video_generate`, `tts`, `pdf`                                                                                                                                                                         |
| `group:openclaw`   | 除 `read`/`write`/`edit`/`apply_patch`/`exec`/`process`/`canvas` 之外的所有内置工具（不包括插件工具）                                                                                                                                    |
| `group:plugins`    | 已加载插件所拥有的工具，包括通过 `bundle-mcp` 暴露的已配置 MCP 服务器                                                                                                                                                             |

`suggest_task` 允许代理在不启动的情况下提出已确认的后续工作。工作目录必须是绝对目录，但不需要是 Git 签出目录。支持本地调试和非代码任务。 Control UI 将标题和摘要显示为可操作的芯片；网关支持的 TUI 显示等效的交互式提示。 **在新会话中启动** 在该目录中打开正常会话并发送完整的任务提示。新会话被指示在创建或切换到工作树之前询问用户是否需要隔离。没有预先的工作树或执行目标选择。 `dismiss_task` 撤回了由 `suggest_task` 返回的临时 `task_id` 提出的仍悬而未决的建议。

仅当发起操作员界面可以接收网关任务建议事件并采取行动时，才会提供这些工具。通道会话和 local/embedded TUI 会话不接收；通道传输需要可移植的类型化任务操作才能安全地公开此流。建议是进程本地的，并在网关重新启动时消失。这两个工具都保留在 `coding` 配置文件和 `group:sessions` 中，因此正常的 `tools.allow` 和 `tools.deny` 策略会在表面支持它们时自动配置它们。

`openclaw` 委托OpenClaw 设置和维修。它同时属于 `group:automation` 和 `group:openclaw`，因此现有组现在允许和拒绝包含此帮助程序。组拒绝覆盖显式 `openclaw` 允许。 `minimal`、`coding`、`messaging`中未添加助手；使用 `tools.alsoAllow` 选择具有受限配置文件的它。目录发现不会绕过其所有者、沙箱、直接调用或执行权限检查。

`pdf` 属于 `group:media` 和 `group:openclaw`。组拒绝还涵盖 PDF 并覆盖显式 `pdf` 允许条目。如果现有配置应保留 PDF 访问权限，请删除或缩小冲突组拒绝范围。组授予不会绕过 [PDF 模型和身份验证要求](/tools/pdf)。

`transcripts` 显示在目录的“媒体”部分中，但不是 `group:media` 或 `group:openclaw` 的成员，保留现有组授予和拒绝。按名称或通过完整配置文件明确选择；受限配置文件可以使用 `tools.alsoAllow`。当前调用者和捕获访问检查仍然适用。

## <a id="mcp-and-plugin-tools-inside-sandbox-tool-policy"></a> MCP 和沙箱工具策略内的插件工具

配置的 MCP 服务器在 `bundle-mcp` 插件 ID 下公开为插件拥有的工具。普通工具配置文件可以允许它们，但 `tools.sandbox.tools` 是沙盒会话的附加入口。如果沙箱模式为 `"all"` 或 `"non-main"`，则当 MCP/plugin 工具应可见时，请在沙箱工具白名单中包含以下条目之一：

- `bundle-mcp`，用于 OpenClaw- 管理的 MCP 服务器（来自 `mcp.servers`）
- 某个特定原生插件的插件 id
- `group:plugins`，用于所有已加载的插件拥有工具
- 精确的 MCP 服务器工具名或服务器通配符，例如 `outlook__send_mail` 或 `outlook__*`，当你只想要一个服务器时

服务器通配符使用提供方安全的 MCP 服务器前缀，不一定是原始的 `mcp.servers` 键。非 `[A-Za-z0-9_-]` 字符会变成 `-`，不以字母开头的名称会加上 `mcp-` 前缀，较长或重复的前缀可能会被截断或追加后缀；例如，`mcp.servers["Outlook Graph"]` 使用的通配符类似 `outlook-graph__*`。

每次运行的 `toolsAllow` 上限还接受用于配置的 MCP 服务器的 `outlook*` 或 `out*graph*` 等 glob。这些 glob 可以在所有已启用的静态 MCP 服务器上触发目录发现，就像 `outlook__*` 一样；它们不限制连接哪些服务器。 Discovery 是保守的，即使没有工具最终匹配也可以运行。最终工具 allow/deny 和沙箱策略仍然适用，禁用的服务器仍然被排除在外，除非通过会话覆盖明确启用，并且请求者范围的服务器仍然需要其经过验证的请求者上下文。

```json5
{
  agents: { defaults: { sandbox: { mode: "all" } } },
  mcp: {
    servers: {
      outlook: { command: "node", args: ["./outlook-mcp.js"] },
    },
  },
  tools: {
    sandbox: {
      tools: {
        alsoAllow: ["web_search", "web_fetch", "memory_search", "memory_get", "bundle-mcp"],
      },
    },
  },
}
```

如果没有该沙箱层条目，MCP 服务器仍然可以成功加载，同时其工具在提供程序请求之前被过滤。使用 `openclaw doctor` 捕获 `mcp.servers` 中 OpenClaw- 托管服务器的此形状。从捆绑插件清单加载的 MCP 服务器或 Claude `.mcp.json` 使用相同的沙箱门，但此诊断尚未枚举这些源；如果他们的工具在沙盒中消失，则使用相同的白名单条目。

## `tools.codeMode`

`tools.codeMode` 对通用 OpenClaw 代码模式表面进行门控。当使用工具运行时，普通的 OpenClaw 工具会移动到来宾目录桥后面，并且 MCP 工具可通过生成的 `MCP` 命名空间使用。模型通常为`exec`和`wait`；诸如 `computer` 之类的工具，其结构化结果无法跨越 JSON-，只有桥保持直接。

`enabled` 默认为 `false`，包括当对象设置其他代码模式选项时。要仅对目录条目标记为 `compat.codeMode: "preferred"` 的模型启用代码模式，请显式启用 `"auto"`。请参阅 [ 代码模式 - 自动按模型激活](/tools/code-mode/configuration#automatic-per-model-activation)。

`executor` 默认为 `"node"`，它使用 `node:vm` 进行可信主机执行，而不是安全隔离。为捆绑的强化来宾执行器设置 `"quickjs"`。代理级别设置覆盖全局选择。有关信任边界和延续行为，请参阅 [ 代码模式执行器](/tools/code-mode/executors)。

```json5
{
  tools: {
    codeMode: {
      enabled: "auto",
      executor: "node",
    },
  },
}
```

也支持简写形式：

```json5
{
  tools: { codeMode: "auto" },
}
```

无论模型为何，`enabled: true` 都会在每次支持工具的运行中强制启用代码模式。

MCP 声明通过只读虚拟 API 文件表面以代码模式公开。访客代码可以在调用 `MCP.<server>.<tool>()` 之前调用 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")` 来检查 TypeScript-style 签名。有关运行时契约、限制和调试步骤，请参阅 [Code Mode](/tools/code-mode)。

## `tools.allow` / `tools.deny`

全局工具 allow/deny 策略（拒绝获胜）。不区分大小写，支持`*`通配符。即使 Docker 沙箱关闭也适用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` 和 `apply_patch` 是独立的工具 id。`allow: ["write"]` 也会为兼容模型启用 `apply_patch`，但 `deny: ["write"]` 不会拒绝 `apply_patch`。要阻止所有文件修改，请拒绝 `group:fs`，或显式列出每个会修改的工具：

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

<Note>
`allow` 和 `alsoAllow` 不能在同一作用域（`tools`、`tools.byProvider.<id>`、`agents.entries.*.tools`）中同时设置——配置验证会拒绝这种配置。请将 `alsoAllow` 条目合并到 `allow` 中，或者移除 `allow`，改用 `profile` + `alsoAllow`。
</Note>

图像检查工具为`view_image`。如果较旧的配置仍然在允许、`alsoAllow` 或拒绝列表中命名 `image`，请运行 `openclaw doctor --fix` 来重写受支持的全局、每代理、提供程序、沙箱、发件人、通道和网关策略表面。 Doctor 会保留 `image*` 等可能仍与其他工具匹配的模式，并在该模式不再涵盖检查时添加 `view_image`。已经涵盖这两个名称的模式（例如 `*` 或 `*image*`）保持不变。

## `tools.byProvider`

进一步限制特定提供商或模型的工具。顺序：基础配置文件 → 提供商配置文件 → allow/deny.

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      anthropic: { profile: "minimal" },
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

## `tools.toolsBySender`

限制当前回合发起请求者的工具。这是通道访问控制之上的深度防御；发送方值必须来自通道适配器，而不是消息文本。它不验证模型提示中的其他内容；请参阅 [ 请求者范围的控件和提示上下文](/gateway/security/hardened-baseline#requester-scoped-controls-and-prompt-context)。

```json5
{
  tools: {
    toolsBySender: {
      "channel:discord:1234567890123": { alsoAllow: ["group:fs"] },
      "id:guest-user-id": { deny: ["group:runtime", "group:fs"] },
      "*": { deny: ["exec", "process", "write", "edit", "apply_patch"] },
    },
  },
}
```

键使用显式前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 或 `"*"`。通道 id 是标准 OpenClaw id；诸如 `teams` 之类的别名标准化为 `msteams`。运行 `openclaw doctor --fix` 将已停用的无前缀密钥迁移到 `id:` 条目。匹配顺序为频道+id、id、e164、用户名、名称、通配符。授予额外工具时首选 `id:` 或 `channel:` 密钥，因为 `username:` 和 `name:` 匹配可变的发件人属性。

当匹配成功时，代理专属的 `agents.entries.*.tools.toolsBySender` 会覆盖全局 sender 匹配，即使策略为空对象 `{}` 也一样。

## `tools.elevated`

控制沙箱外提升的执行访问权限：

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["1234567890123", "987654321098765432"],
      },
    },
  },
}
```

- 每个代理的覆盖配置（`agents.entries.*.tools.elevated`）只能进一步限制权限。
- `/elevated on|off|ask|full` 按会话存储状态；内联指令仅适用于单条消息。
- Elevated `exec` 绕过沙箱并使用配置的转义路径（默认情况下为 `gateway`，或当执行目标为 `node` 时为 `node`）。
