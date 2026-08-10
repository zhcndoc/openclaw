---
summary: "工具配置（策略、实验性开关、基于提供方的工具）以及自定义提供方/基础 URL 设置"
read_when:
  - 配置 `tools.*` 策略、允许列表或实验性功能
  - 注册自定义提供方或覆盖基础 URL
  - 设置 OpenAI 兼容的自托管端点
title: "配置 — 工具与自定义提供方"
sidebarTitle: "工具与自定义提供方"
---

`tools.*` 配置键以及自定义提供方 / 基础 URL 设置。有关代理、通道和其他顶层配置键，请参见 [配置参考](/gateway/configuration-reference)。

## 工具

### 工具配置档案

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置基础允许列表：

<Note>
本地入门在新建本地配置且未设置时，默认使用 `tools.profile: "coding"`（已存在的显式配置档案会保留）。
</Note>

| Profile     | 包含内容                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 仅 `session_status`                                                                                                                                                                                                                                   |
| `coding`    | `group:fs`、`group:runtime`、`group:web`、`group:sessions`、`group:memory`、`cron`、`get_goal`、`create_goal`、`update_goal`、`update_plan`、`ask_user`、`skill_workshop`、`image`、`image_generate`、`music_generate`、`video_generate`                |
| `messaging` | `group:messaging`、`sessions`、`sessions_list`、`sessions_history`、`sessions_search`、`conversations_list`、`conversations_send`、`conversations_turn`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`、`ask_user` |
| `full`      | 不受限制（与未设置相同）                                                                                                                                                                                                                          |

`coding` 和 `messaging` 还会隐式允许 `bundle-mcp`（已配置的 MCP 服务器）。

### 工具组

| 分组               | 工具                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `group:runtime`    | `exec`、`process`、`code_execution`（`bash` 可作为 `exec` 的别名）                                                                                                                                                                                       |
| `group:fs`         | `read`、`write`、`edit`、`apply_patch`                                                                                                                                                                                                                 |
| `group:sessions`   | `sessions`、`sessions_list`、`sessions_history`、`sessions_search`、`conversations_list`、`conversations_send`、`conversations_turn`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`、`spawn_task`、`dismiss_task` |
| `group:memory`     | `memory_search`、`memory_get`                                                                                                                                                                                                                          |
| `group:web`        | `web_search`、`x_search`、`web_fetch`                                                                                                                                                                                                                  |
| `group:ui`         | `browser`、`screen`、`terminal`、`canvas`、`show_widget`                                                                                                                                                                                               |
| `group:automation` | `heartbeat_respond`、`cron`、`gateway`                                                                                                                                                                                                                 |
| `group:messaging`  | `message`                                                                                                                                                                                                                                              |
| `group:nodes`      | `nodes`、`computer`                                                                                                                                                                                                                                    |
| `group:agents`     | `agents_list`、`get_goal`、`create_goal`、`update_goal`、`update_plan`、`ask_user`、`skill_workshop`                                                                                                                                                   |
| `group:media`      | `image`、`image_generate`、`music_generate`、`video_generate`、`tts`                                                                                                                                                                                   |
| `group:openclaw`   | 除 `read`/`write`/`edit`/`apply_patch`/`exec`/`process`/`canvas` 之外的所有上述内置工具（不包括插件工具）                                                                                                                                             |
| `group:plugins`    | 已加载插件拥有的工具，包括通过 `bundle-mcp` 暴露的已配置 MCP 服务器                                                                                                                                                                                     |

`spawn_task` 允许编码代理提出已确认的后续工作，而无需立即启动。建议中的项目目录必须是一个 git 检出目录；无效的建议（包括非 git 目录或空白提示）会在工具记录它们时被拒绝。Control UI 会将标题和摘要显示为可执行的操作标签；基于 Gateway 的 TUI 则会显示等效的交互式提示。接受建议后，可以在新的受管工作树中启动任务（默认方式）、在建议的检出目录中通过新会话在本地启动任务、在配置了云端工作者配置文件时将任务发送给该配置文件，或将任务传递到源会话。OpenClaw 会将完整提示发送到选定的目标，同时当前回合继续进行。`dismiss_task` 会通过 `spawn_task` 返回的临时 `task_id` 撤回仍处于待处理状态的建议。

只有当发起方的操作界面能够接收并处理 Gateway 任务建议事件时，才会提供这些工具。Channel 会话和本地/嵌入式 TUI 会话不会接收它们；channel 传输在安全地公开此流程之前，需要一个可移植的、类型化的任务操作。建议是进程本地的，并会在 Gateway 重启时消失。这两个工具仍然保留在 `coding` 配置和 `group:sessions` 中，因此当界面支持它们时，正常的 `tools.allow` 和 `tools.deny` 策略会自动对其进行配置。

### 沙箱工具策略中的 MCP 与插件工具

已配置的 MCP 服务器会作为插件拥有的工具，通过 `bundle-mcp` 插件 id 暴露。普通工具配置档案可以允许它们，但 `tools.sandbox.tools` 是沙箱会话中的额外门控。如果沙箱模式是 `"all"` 或 `"non-main"`，并且希望 MCP/插件工具可见，请在沙箱工具允许列表中加入以下条目之一：

- `bundle-mcp`，用于来自 `mcp.servers` 的 OpenClaw 托管 MCP 服务器
- 某个特定原生插件的插件 id
- `group:plugins`，用于所有已加载的插件拥有工具
- 精确的 MCP 服务器工具名或服务器通配符，例如 `outlook__send_mail` 或 `outlook__*`，当你只想要一个服务器时

服务器通配符使用提供方安全的 MCP 服务器前缀，不一定是原始的 `mcp.servers` 键。非 `[A-Za-z0-9_-]` 字符会变成 `-`，不以字母开头的名称会加上 `mcp-` 前缀，较长或重复的前缀可能会被截断或追加后缀；例如，`mcp.servers["Outlook Graph"]` 使用的通配符类似 `outlook-graph__*`。

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

如果没有该沙箱层条目，MCP 服务器仍可成功加载，但在向提供方请求之前，其工具会被过滤掉。对 `mcp.servers` 中由 OpenClaw 托管的服务器，使用 `openclaw doctor` 可以捕获这种情况。来自捆绑插件清单或 Claude `.mcp.json` 的 MCP 服务器使用相同的沙箱门控，但此诊断尚不会枚举这些来源；如果它们的工具在沙箱会话中消失，请使用相同的允许列表条目。

### `tools.codeMode`

`tools.codeMode` 控制通用的 OpenClaw 代码模式界面。对于启用了工具的运行，代码模式启用后，普通的 OpenClaw 工具会转移到沙箱内的 `tools.*` 目录桥接中，MCP 工具则可通过生成的 `MCP` 命名空间使用。模型通常会看到 `exec` 和 `wait`；而像 `computer` 这样结构化结果无法通过仅支持 JSON 的桥接传递的工具，则会保持直接可用。

`enabled` 默认为 `"auto"`，仅对目录条目标记了 `compat.codeMode: "preferred"` 的模型启用代码模式。请参阅[代码模式 - 按模型自动激活](/tools/code-mode#automatic-per-model-activation)。

要在每次运行中退出代码模式：

```json5
{
  tools: {
    codeMode: {
      enabled: false,
    },
  },
}
```

也支持简写形式：

```json5
{
  tools: { codeMode: false },
}
```

无论模型为何，`enabled: true` 都会在每次支持工具的运行中强制启用代码模式。

在代码模式下，MCP 声明会通过只读的虚拟 API 文件界面提供。访客代码可以调用 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")`，在调用 `MCP.<server>.<tool>()` 之前查看 TypeScript 风格的签名。请参阅[代码模式](/tools/code-mode)，了解运行时契约、限制和调试步骤。

### `tools.allow` / `tools.deny`

全局工具允许/拒绝策略（拒绝优先）。大小写不敏感，支持 `*` 通配符。即使 Docker 沙箱关闭也会应用。

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

### `tools.byProvider`

进一步限制特定提供方或模型可用的工具。顺序：基础配置档案 → 提供方配置档案 → allow/deny。

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

### `tools.toolsBySender`

限制当前回合发起请求者可使用的工具。这是在通道访问控制之上的纵深防御；sender 值必须来自通道适配器，而不是消息文本。它不会对模型提示中的其他内容进行身份验证；请参阅[请求者范围控制和提示上下文](/gateway/security#requester-scoped-controls-and-prompt-context)。

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

键使用显式前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>`，或 `"*"`。通道 id 是规范化的 OpenClaw id；像 `teams` 这样的别名会规范化为 `msteams`。旧式无前缀键会按 `id:` 处理。匹配顺序为 channel+id、id、e164、username、name，然后是通配符。

当匹配成功时，代理专属的 `agents.entries.*.tools.toolsBySender` 会覆盖全局 sender 匹配，即使策略为空对象 `{}` 也一样。

### `tools.elevated`

控制沙箱外的提升级 `exec` 访问：

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
- 提升级 `exec` 会绕过沙箱，并使用配置的逃逸路径（默认为 `gateway`；当 `exec` 目标为 `node` 时使用 `node`）。

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      approvalRunningNoticeMs: 10000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      commandHighlighting: false,
      applyPatch: {
        enabled: true,
        allowModels: ["gpt-5.6-sol"],
      },
    },
  },
}
```

所示数值均为默认值，唯独 `applyPatch.allowModels` 例外（默认为空/未设置，表示任何兼容模型都可以使用 `apply_patch`）。`approvalRunningNoticeMs` 会在需要审批的 exec 运行时间过长时发出运行通知；`0` 表示禁用。

### `tools.loopDetection`

工具循环安全检查**默认禁用**。设置 `enabled: true` 以启用检测。可以在全局 `tools.loopDetection` 中定义设置，也可以在每个代理的 `agents.entries.*.tools.loopDetection` 中进行覆盖。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
    },
  },
}
```

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // 或 BRAVE_API_KEY 环境变量（Brave 提供商）
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // 可选；省略则自动检测
        maxChars: 20000,
        maxCharsCap: 20000,
        maxResponseBytes: 750000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true,
        userAgent: "custom-ua",
      },
    },
  },
}
```

所示值均为默认值，`provider` 和 `userAgent` 除外。`maxResponseBytes` 会被限制在 32000–10000000；`maxChars` 会被限制为不超过 `maxCharsCap`（提高 `maxCharsCap` 可允许更大的响应）。

### `tools.media`

配置入站媒体理解（图像/音频/视频）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
      models: [
        { provider: "openai", model: "gpt-4o-mini-transcribe", capabilities: ["audio"] },
        {
          type: "cli",
          command: "whisper",
          args: ["--model", "base", "{{AttachmentPath}}"],
          capabilities: ["audio"],
        },
        { provider: "ollama", model: "gemma4:26b", capabilities: ["image"] },
        { provider: "google", model: "gemini-3-flash-preview", capabilities: ["video"] },
      ],
      audio: { enabled: true, preferredModel: "openai/gpt-4o-mini-transcribe" },
      image: { enabled: true, preferredModel: "ollama/gemma4:26b" },
      video: { enabled: true },
    },
  },
}
```

`tools.media.models` 是唯一配置的模型列表。每个条目声明其处理的能力。可选的 `preferredModel` 选择器接受 `provider/model`、模型 id、用于提供方默认条目的 `provider:<id>`，或 `cli:command`；匹配的条目会移动到该能力回退顺序的前面。对于已配置和自动检测的模型，每种能力的提示词、限制、请求设置、作用域、附件策略和音频转录回显仍作为默认值；模型条目可以覆盖特定于模型的字段。

<AccordionGroup>
  <Accordion title="媒体模型条目字段">
    **提供方条目**（`type: "provider"` 或省略）：

    - `provider`：API 提供方 id（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）
    - `model`：模型 id 覆盖
    - `profile` / `preferredProfile`：`auth-profiles.json` 配置档案选择

    **CLI 条目**（`type: "cli"`）：

    - `command`: 要运行的可执行文件
    - `args`: 模板化参数（支持 `{{AttachmentPath}}`、`{{AttachmentUrl}}`、`{{AttachmentContentType}}`、`{{AttachmentDir}}`、`{{AttachmentIndex}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 会将已弃用的 `{input}` 占位符迁移为 `{{AttachmentPath}}`）。较旧的 `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}` 别名在兼容期内仍可用，但已弃用。

    **通用字段：**

    - `capabilities`：包含 `image`、`audio` 和 `video` 中一个或多个值的列表。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：每个条目的覆盖值。
    - 匹配的图像模型中的 `timeoutSeconds` 条目在代理调用显式 `image` 工具时同样适用。对于图像理解，此超时应用于请求本身，不会因之前的准备工作而缩短。
    - 失败时回退到下一个条目。

    提供方认证遵循标准顺序：`auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`。

  </Accordion>
</AccordionGroup>

### `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },
}
```

### `tools.sessions`

控制哪些会话可以被会话工具（`sessions_list`、`sessions_history`、`sessions_send`）作为目标。

默认值：`tree`（当前会话及其派生的会话，例如子代理，以及同一代理的环境感知监视群组会话）。

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "tree",
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可见性范围">
    - `self`：仅当前会话密钥。
    - `tree`：当前会话及由当前会话派生的会话（子代理）。对于读取操作，还包括当前会话通过环境感知群组机制监视的同一代理群组会话。
    - `agent`：属于当前代理 ID 的任何会话（如果在同一代理 ID 下为每个发送者运行独立会话，则可能包括其他用户）。
    - `all`：任何会话。跨代理目标仍需要 `tools.agentToAgent`。
    - 沙箱限制：当当前会话处于沙箱中，且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"`（默认值）时，即使 `tools.sessions.visibility="all"`，可见性也会被强制设为 `tree`。
    - 当不是 `all` 时，`sessions_list` 会包含一个简要的 `visibility` 字段，用于描述生效模式，并警告当前范围之外的某些会话可能会被省略。

  </Accordion>
</AccordionGroup>

在默认的 `session.dmScope: "main"` 设置下，群组中的人为活动会使同一代理的群组会话对该代理的主会话保持环境可见。在多用户设置中，`"main"` 还会让多个用户共享一个 DM 会话，因此被路由到该会话的每个用户都可以读取环境监视的群组内容，包括通过会话记忆的 `memory_search` 进行读取。若要隔离 DM，请为每个对话方使用独立的 `dmScope`；或者将 `tools.sessions.visibility: "self"` 设置为退出环境监视会话的读取范围。

### `tools.sessions_spawn`

控制 `sessions_spawn` 的内联附件支持。

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // 选择加入：设为 true 以允许内联文件附件
        maxTotalBytes: 5242880, // 总计所有文件 5 MB
        maxFiles: 50,
        maxFileBytes: 1048576, // 每个文件 1 MB
        retainOnSessionKeep: false, // 当 cleanup="keep" 时保留附件
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="附件说明">
    - 需要将 `enabled` 设为 `true` 才可使用附件。
    - 子代理附件会被物化到子工作区的 `.openclaw/attachments/<uuid>/`，并带有 `.manifest.json`。
    - ACP 附件仅限图像，并会在通过相同的文件数量、单文件字节数和总字节数限制后以内联方式转发到 ACP 运行时。
    - 附件内容会在转录持久化中自动脱敏。
    - Base64 输入会通过严格的字母表/填充检查以及解码前大小保护进行验证。
    - 子代理附件文件权限为目录 `0700`、文件 `0600`。
    - 子代理清理遵循 `cleanup` 策略：`delete` 始终移除附件；`keep` 仅在 `retainOnSessionKeep: true` 时保留它们。

  </Accordion>
</AccordionGroup>

<a id="toolsupdateplan"></a>

### `tools.updatePlan`

用于非简单多步骤工作跟踪的结构化 `update_plan` 清单工具的关闭开关。

```json5
{
  tools: {
    updatePlan: false, // 从每次运行中隐藏 update_plan
  },
}
```

- 默认值：对于每个提供商和模型均为 `true`。设置为 `false` 可关闭该工具；不存在针对特定模型的自动启用规则。
- 工具描述中添加了使用指导，因此模型只会在处理实质性工作时使用该工具，并且最多保持一个步骤处于 `in_progress` 状态。
- `tools.deny: ["update_plan"]` 同样会移除该工具，因此请使用已经承载工具策略的配置方式。

旧版配置使用 `tools.experimental.planTool`。运行 `openclaw doctor --fix` 可将该值迁移到 `tools.updatePlan`。

### `agents.defaults.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        allowAgents: ["research"],
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 8,
        runTimeoutSeconds: 900,
        announceTimeoutMs: 120000,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`：生成的子代理的默认模型。如果省略，子代理将继承调用者的模型。
- `allowAgents`：当请求方代理未设置自己的 `subagents.allowAgents` 时，`sessions_spawn` 使用的已配置目标代理 id 默认允许列表（`["*"]` = 任意已配置目标；默认值：仅当前代理）。对于已删除其代理配置的过期条目，`sessions_spawn` 会拒绝，并在 `agents_list` 中省略；运行 `openclaw doctor --fix` 可将其清理。
- `maxConcurrent`：子代理运行的最大并发数。默认值：`8`。
- `runTimeoutSeconds`：当调用方未传入自己的覆盖值时，`sessions_spawn` 的超时时间（秒）。默认值：`0`（无超时）；上面显示的 `900` 是常见的可选值，而不是内置默认值。
- `announceTimeoutMs`：网关 `agent` announce 投递尝试的单次调用超时时间（毫秒）。默认值：`120000`。临时重试可能会使总 announce 等待时间长于单个配置的超时时间。
- `archiveAfterMinutes`：子代理会话完成后，在自动归档前等待的分钟数。默认值：`60`；`0` 会禁用自动归档。
- 每个子代理的工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自定义提供商和基础 URL

提供商插件会发布自己的模型目录行。可通过配置中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 添加自定义提供商。

为自定义/本地提供商配置 `baseUrl`，同时也意味着对模型 HTTP 请求做了一次窄范围的网络信任决策：OpenClaw 会允许该精确的 `scheme://host:port` 源通过受保护的 fetch 路径，而不会额外添加单独的配置项，也不会信任其他私有源。

```json5
{
  models: {
    mode: "merge", // 合并（默认） | 替换
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai | 等
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            contextTokens: 96000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="认证和合并优先级">
    - 使用 `authHeader: true` + `headers` 以满足自定义认证需求。
    - 使用 `OPENCLAW_AGENT_DIR` 覆盖 agent 配置根目录。
    - 匹配到提供商 ID 时的合并优先级：
      - 非空的 agent `models.json` 中的 `baseUrl` 值优先。
      - 非空的 agent `apiKey` 值仅在当前 config/auth-profile 上下文中该提供商不是由 SecretRef 管理时才优先。
      - 由 SecretRef 管理的提供商 `apiKey` 值会从源标记刷新（环境变量引用使用 `ENV_VAR_NAME`，文件/exec 引用使用 `secretref-managed`），而不是持久化解析后的密钥。
      - 由 SecretRef 管理的提供商 header 值会从源标记刷新（环境变量引用使用 `secretref-env:ENV_VAR_NAME`，文件/exec 引用使用 `secretref-managed`）。
      - 空的或缺失的 agent `apiKey`/`baseUrl` 会回退到配置中的 `models.providers`。
      - 匹配的模型 `contextWindow`/`maxTokens`：当显式配置值存在且有效（正的有限数字）时，显式配置值优先；否则使用隐式/生成的目录值。
      - 匹配的模型 `contextTokens` 采用相同的“显式优先，否则隐式”规则；可用它来限制有效上下文，而不改变原生模型元数据。
      - 提供商插件目录作为由插件生成且归插件拥有的目录分片，存储在 agent 的插件状态中。
      - 当你希望配置完全重写 `models.json` 并跳过合并插件拥有的目录分片时，请使用 `models.mode: "replace"`。
      - 标记持久化以源为准：标记会从当前有效的源配置快照（解析前）写入，而不是从运行时解析后的密钥值写入。

  </Accordion>
</AccordionGroup>

### 提供商字段详情

<AccordionGroup>
  <Accordion title="顶层目录">
    - `models.mode`：提供商目录行为（`merge` 或 `replace`）。
    - `models.providers`：按 provider id 键入的自定义 provider 映射。
      - 安全编辑：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 进行增量更新。`config set` 会拒绝破坏性替换，除非你传入 `--replace`。

  </Accordion>
  <Accordion title="Provider 连接与认证">
    - `models.providers.*.api`: 请求适配器（`openai-completions`、`openai-responses`、`openai-chatgpt-responses`、`anthropic-messages`、`google-generative-ai`、`google-vertex`、`github-copilot`、`bedrock-converse-stream`、`ollama`、`azure-openai-responses`）。对于自托管的 `/v1/chat/completions` 后端，例如 MLX、vLLM、SGLang 以及大多数 OpenAI 兼容的本地服务器，请使用 `openai-completions`。带有 `baseUrl` 但没有 `api` 的自定义 provider 默认使用 `openai-completions`；仅当后端支持 `/v1/responses` 时才设置 `openai-responses`。
    - `models.providers.*.apiKey`：provider 凭证（优先使用 SecretRef/env 替换）。
    - `models.providers.*.auth`：认证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
    - `models.providers.*.contextWindow`：当模型条目未设置 `contextWindow` 时，该 provider 下模型的默认原生上下文窗口。
    - `models.providers.*.contextTokens`：当模型条目未设置 `contextTokens` 时，该 provider 下模型的默认有效运行时上下文上限。
    - `models.providers.*.maxTokens`：当模型条目未设置 `maxTokens` 时，该 provider 下模型的默认输出 token 上限。
    - `models.providers.*.timeoutSeconds`：可选的按 provider 配置的模型 HTTP 请求超时时间（秒），包括连接、头部、主体以及总请求中止处理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：用于 Ollama + `openai-completions`，将 `options.num_ctx` 注入请求中（默认：`true`）。
    - `models.providers.*.authHeader`：在需要时强制将凭证通过 `Authorization` 头传递。
    - `models.providers.*.baseUrl`：上游 API 基础 URL。
    - `models.providers.*.headers`：用于代理/租户路由的额外静态头。

  </Accordion>
  <Accordion title="请求传输覆盖">
    `models.providers.*.request`：用于模型 provider HTTP 请求的传输覆盖。

    - `request.headers`：额外头（与 provider 默认值合并）。值支持 SecretRef。
    - `request.auth`：认证策略覆盖。模式：`"provider-default"`（使用 provider 内建认证）、`"authorization-bearer"`（配合 `token`）、`"header"`（配合 `headerName`、`value`、可选 `prefix"`）。
    - `request.proxy`：HTTP 代理覆盖。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量）、`"explicit-proxy"`（配合 `url`）。两种模式都支持可选的 `tls` 子对象。
    - `request.tls`：直接连接的 TLS 覆盖。字段：`ca`、`cert`、`key`、`passphrase`（均支持 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`：当为 `true` 时，允许模型 provider HTTP 请求通过 provider HTTP fetch 保护器访问私有、CGNAT 或类似网段。自定义/本地 provider 的 base URL 已经信任精确配置的来源，但元数据/链路本地来源仍会在没有显式允许的情况下被阻止。将其设为 `false` 可退出精确来源信任。WebSocket 会使用同一个 `request` 处理头/TLS，但不会使用该 fetch SSRF 门禁。默认值：`false`。

  </Accordion>
  <Accordion title="模型目录条目">
    - `models.providers.*.models`：显式的 provider 模型目录条目。
    - `models.providers.*.models.*.input`：模型输入模态。纯文本模型使用 `["text"]`，原生图像/视觉模型使用 `["text", "image"]`。只有在所选模型被标记为支持图像时，图像附件才会注入 agent 回合。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文窗口元数据。此项会覆盖该模型的 provider 级别 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可选的运行时上下文上限。此项会覆盖 provider 级别的 `contextTokens`；当你希望有效上下文预算小于模型原生的 `contextWindow` 时使用此项；当两者不同时，`openclaw models list` 会显示这两个值。

    #### 自定义 provider 能力声明

    provider 目录负责维护内置模型路由和目录已知模型路由的 `compat`。不要将这些标志复制到配置中：当已配置的 `api` 和 `baseUrl` 仍能标识该路由时，OpenClaw 会使用目录行。`openclaw doctor --fix` 会移除匹配的旧版覆盖，并报告存在差异的值供审核。

    对于真正的自定义 provider、自定义模型，或路由到不同端点的目录模型，仍支持使用 `compat` 块。仅设置已针对该端点验证过的能力：

    | 自定义路由键 | 运行时契约 |
    | --- | --- |
    | `supportsStore` | 接受 OpenAI 的 `store` 请求字段。 |
    | `supportsPromptCacheKey` | 接受 OpenAI 提示词缓存/会话亲和性键。 |
    | `supportsDeveloperRole` | 接受 `developer` 消息，而不要求使用 `system`。 |
    | `supportsReasoningEffort` | 接受推理强度控制。 |
    | `supportsTemperature` | 接受此模型和适配器的 `temperature`。 |
    | `supportsUsageInStreaming` | 在流式响应中发出用量元数据。 |
    | `supportsTools` | 支持结构化工具/函数调用。设置为 `false` 可禁用工具。 |
    | `supportsStrictMode` | 接受严格工具 schema。 |
    | `requiresStringContent` | 要求 Chat Completions 消息内容为普通字符串。 |
    | `strictMessageKeys` | 要求传出的消息仅包含可接受的键。 |
    | `visibleReasoningDetailTypes` | 可安全显示在记录中的推理详细信息块类型名称。 |
    | `supportedReasoningEfforts` | 列出该端点接受的推理标签。 |
    | `reasoningEffortMap` | 将 OpenClaw 思考标签映射到端点特定的标签。 |
    | `maxTokensField` | 选择 `max_tokens` 或 `max_completion_tokens`。 |
    | `thinkingFormat` | 选择端点的推理负载方言。 |
    | `requiresToolResultName` | 要求工具结果消息包含工具名称。 |
    | `requiresAssistantAfterToolResult` | 要求工具结果之后有一条 assistant 消息。 |
    | `requiresThinkingAsText` | 将推理作为文本而非结构化内容重放。 |
    | `requiresReasoningContentOnAssistantMessages` | 在重放期间保留 DeepSeek 风格的 `reasoning_content`。 |
    | `toolSchemaProfile` | 选择工具 schema 规范化配置。自定义模型条目支持识别 `llamacpp` 和 `gemini`。`llamacpp` 配置会移除大于或等于 2000 的 `pattern` 和 `maxLength` 值；内置的 `llama-cpp`、`ollama` 和 `lmstudio` provider 会自动应用相同的清理。自定义 `llama-server` 模型必须显式选择该配置。请参阅下方的 llama.cpp 示例。 |
    | `unsupportedToolSchemaKeywords` | 在发送工具 schema 之前，移除端点拒绝的指定 JSON Schema 关键字。用于处理超出配置针对性转换范围的端点特定缺陷。 |
    | `toolCallArgumentsEncoding` | 选择端点的工具调用参数编码。 |
    | `requiresOpenAiAnthropicToolPayload` | 将 OpenAI 形状的工具调用转换为 Anthropic 系列负载。 |

  </Accordion>
  <Accordion title="Amazon Bedrock 发现">
    - `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自动发现设置根。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`：开启/关闭隐式发现。
    - `plugins.entries.amazon-bedrock.config.discovery.region`：用于发现的 AWS 区域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用于定向发现的可选 provider-id 过滤器。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：发现刷新的轮询间隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已发现模型的回退上下文窗口。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已发现模型的回退最大输出 token。

  </Accordion>
</AccordionGroup>

交互式自定义 provider 引导会根据已知的视觉模型 ID 模式推断图像输入，包括 GPT-4o/GPT-4.1/GPT-5+、`o1`/`o3`/`o4` 推理系列、Claude、Gemini、任何以 `-vl` 结尾的 id（Qwen-VL 及类似模型），以及诸如 LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V 等命名系列；对于已知的纯文本系列（Llama、DeepSeek、Mistral/Mixtral、Kimi/Moonshot、Codestral、Devstral、Phi、QwQ、CodeLlama，以及没有 vl/vision 后缀的裸 Qwen id），它会跳过额外问题。未知的模型 ID 仍会提示是否支持图像。非交互式引导使用相同的推断；传入 `--custom-image-input` 可强制使用支持图像的元数据，或传入 `--custom-text-input` 可强制使用仅文本元数据。

### 提供商示例

<AccordionGroup>
  <Accordion title="Cerebras（GLM 4.7 / GPT OSS）">
    官方外部 `cerebras` 提供商插件可以通过 `openclaw onboard --auth-choice cerebras-api-key` 进行配置。只有在覆盖默认值时才使用显式提供商配置。

    ```json5
    {
      env: { CEREBRAS_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: {
            primary: "cerebras/zai-glm-4.7",
            fallbacks: ["cerebras/gpt-oss-120b"],
          },
          models: {
            "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
            "cerebras/gpt-oss-120b": { alias: "GPT OSS 120B (Cerebras)" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          cerebras: {
            baseUrl: "https://api.cerebras.ai/v1",
            apiKey: "${CEREBRAS_API_KEY}",
            api: "openai-completions",
            models: [
              { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
              { id: "gpt-oss-120b", name: "GPT OSS 120B (Cerebras)" },
            ],
          },
        },
      },
    }
    ```

    Cerebras 使用 `cerebras/zai-glm-4.7`；Z.AI 直连使用 `zai/glm-4.7`。

  </Accordion>
  <Accordion title="Kimi Coding">
    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-for-coding" },
          models: { "kimi/kimi-for-coding": { alias: "Kimi Code" } },
        },
      },
    }
    ```

    兼容 Anthropic，内置提供商。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="本地模型（llama.cpp / llama-server）">
    将一个**自定义** `openai-completions` 提供商指向远程 `llama-server`（或其他兼容 OpenAI 的 llama.cpp 端点）。内置的 `llama-cpp`、`ollama` 和 `lmstudio` 提供商会自动应用 llama.cpp 模式清理器；自定义端点则不会。对于 llama-server 聊天模板会将工具参数编译为 GBNF 的模型，请在每个模型上设置 `compat.toolSchemaProfile: "llamacpp"`。该配置会移除大于或等于 2000 的 `pattern` 和 `maxLength` 值，从而涵盖 `cron` 工具中 `trigger.script` 的 65536 限制。这是一种有针对性的缓解措施，并不意味着完全兼容每一种 JSON Schema 约束，也不包含 `minLength`。

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "my-llamacpp/qwen35" },
        },
      },
      models: {
        mode: "merge",
        providers: {
          "my-llamacpp": {
            baseUrl: "http://127.0.0.1:8080/v1",
            apiKey: "llamacpp-no-key",
            api: "openai-completions",
            models: [
              {
                id: "qwen35",
                name: "Qwen3.5 (llama-server)",
                contextWindow: 8192,
                maxTokens: 2048,
                compat: {
                  supportsTools: true,
                  toolSchemaProfile: "llamacpp",
                },
              },
            ],
          },
        },
      },
    }
    ```

    在不支持 `toolSchemaProfile` 的较旧版本中，更宽泛的回退配置是 `compat.unsupportedToolSchemaKeywords: ["pattern", "patternProperties", "format", "propertyNames", "uniqueItems", "contains", "minContains", "maxContains", "minLength", "maxLength"]`。与该配置文件不同，它会无条件移除所列出的每个关键字。

  </Accordion>
  <Accordion title="本地模型（LM Studio）">
    请参阅[本地模型](/gateway/local-models)。简而言之：在性能强劲的硬件上通过 LM Studio Responses API 运行大型本地模型；保留托管模型合并配置，以便进行回退。
  </Accordion>
  <Accordion title="MiniMax M3（直连）">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "Minimax" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    设置 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目录默认包含 M3，也包含 M2.7 变体。在 Anthropic 兼容的流式路径上，OpenClaw 默认会禁用 MiniMax M2.x thinking，除非你显式设置了 `thinking`；MiniMax-M3（以及 M3.x）默认保持提供商的省略/自适应 thinking 路径。`/fast on` 或 `params.fastMode: true` 会把 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

  </Accordion>
  <Accordion title="Moonshot AI（Kimi）">
    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: { "moonshot/kimi-k2.6": { alias: "Kimi K2.6" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
            ],
          },
        },
      },
    }
    ```

    中国区端点使用：`baseUrl: "https://api.moonshot.cn/v1"`，或使用 `openclaw onboard --auth-choice moonshot-api-key-cn`。

    原生 Moonshot 端点在共享的 `openai-completions` 传输上支持流式 usage 兼容性，OpenClaw 会根据端点能力而不是仅根据内置提供商 ID 来判断。

  </Accordion>
  <Accordion title="OpenCode">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "opencode/claude-opus-4-6" },
          models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
        },
      },
    }
    ```

    设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。Zen 目录使用 `opencode/...` 引用，Go 目录使用 `opencode-go/...` 引用。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

  </Accordion>
  <Accordion title="Synthetic（Anthropic 兼容）">
    ```json5
    {
      env: { SYNTHETIC_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M3" },
          models: { "synthetic/hf:MiniMaxAI/MiniMax-M3": { alias: "MiniMax M3" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          synthetic: {
            baseUrl: "https://api.synthetic.new/anthropic",
            apiKey: "${SYNTHETIC_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "hf:MiniMaxAI/MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```

    基础 URL 应省略 `/v1`（Anthropic 客户端会自动追加）。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

  </Accordion>
  <Accordion title="Z.AI（GLM-4.7）">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-4.7" },
          models: { "zai/glm-4.7": {} },
        },
      },
    }
    ```

    设置 `ZAI_API_KEY`。模型引用使用规范的 `zai/*` 提供商 ID。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

    - 通用端点：`https://api.z.ai/api/paas/v4`
    - 编程端点：`https://api.z.ai/api/coding/paas/v4`
    - 默认的 `zai-api-key` 认证选项会探测你的密钥，并自动检测它属于哪个端点（如果检测结果不明确，则回退到提示，并默认使用全球端点）。也可使用专用的中国区和编程计划认证选项进行显式选择。
    - 对于通用端点，请定义一个带有基础 URL 覆盖的自定义提供商。

  </Accordion>
</AccordionGroup>

---

## 相关内容

- [配置 — agents](/gateway/config-agents)
- [配置 — channels](/gateway/config-channels)
- [配置参考](/gateway/configuration-reference) — 其他顶层键
- [工具与插件](/tools)