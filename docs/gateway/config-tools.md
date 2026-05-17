---
summary: "工具配置（策略、实验性开关、提供方支持的工具）以及自定义提供方/基础 URL 设置"
read_when:
  - 配置 `tools.*` 策略、允许列表或实验性功能
  - 注册自定义提供方或覆盖基础 URL
  - 设置与 OpenAI 兼容的自托管端点
title: "配置 — 工具和自定义提供方"
sidebarTitle: "工具和自定义提供方"
---

`tools.*` 配置键以及自定义提供方 / 基础 URL 设置。关于代理、通道和其他顶层配置键，请参见 [配置参考](/gateway/configuration-reference)。

## 工具

### 工具配置文件

`tools.profile` 会在 `tools.allow`/`tools.deny` 之前设置一个基础允许列表：

<Note>
本地入门流程在未设置时，会将新建的本地配置默认设为 `tools.profile: "coding"`（已显式设置的现有配置会被保留）。
</Note>

| 配置文件   | 包含内容                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 仅 `session_status`                                                                                                           |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | 无限制（与未设置相同）                                                                                                  |

### 工具组

| 组              | 工具                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution`（`bash` 作为 `exec` 的别名被接受）                                         |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                           |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                   |
| `group:ui`         | `browser`, `canvas`                                                                                                     |
| `group:automation` | `heartbeat_respond`, `cron`, `gateway`                                                                                  |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`, `update_plan`                                                                                            |
| `group:media`      | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                    |
| `group:openclaw`   | 所有内置工具（不包括提供方插件）                                                                          |

### `tools.allow` / `tools.deny`

全局工具允许/拒绝策略（拒绝优先）。大小写不敏感，支持 `*` 通配符。即使 Docker sandbox 关闭也会生效。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` 和 `apply_patch` 是两个独立的工具 id。`allow: ["write"]` 也会为兼容模型启用 `apply_patch`，但 `deny: ["write"]` 不会拒绝 `apply_patch`。要阻止所有文件修改，请拒绝 `group:fs` 或显式列出每个会修改文件的工具：

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

进一步限制特定提供方或模型可用的工具。顺序：基础配置文件 → 提供方配置文件 → allow/deny。

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.toolsBySender`

限制特定请求者身份可用的工具。这是在 channel 访问控制之上的纵深防御；sender 值必须来自 channel 适配器，而不是消息文本。

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

键使用显式前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>`，或 `"*"`. Channel id 是规范的 OpenClaw id；像 `teams` 这样的别名会规范化为 `msteams`。兼容旧版本的不带前缀键仅作为 `id:` 接受。匹配顺序为 channel+id、id、e164、username、name，然后是通配符。

当 `agents.list[].tools.toolsBySender` 匹配时，它会覆盖全局 sender 匹配，即使是空的 `{}` 策略也一样。

### `tools.elevated`

控制 sandbox 之外的提升权限 `exec` 访问：

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

- 按 agent 的覆盖配置（`agents.list[].tools.elevated`）只能进一步收紧。
- `/elevated on|off|ask|full` 会按会话保存状态；行内指令只对单条消息生效。
- 提升权限的 `exec` 会绕过 sandbox，并使用已配置的逃逸路径（默认是 `gateway`，如果 exec 目标为 `node`，则使用 `node`）。

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      commandHighlighting: false,
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.5"],
      },
    },
  },
}
```

### `tools.loopDetection`

工具循环安全检查默认是**禁用**的。将 `enabled: true` 以启用检测。设置可以在全局的 `tools.loopDetection` 中定义，并在 `agents.list[].tools.loopDetection` 中按 agent 覆盖。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

<ParamField path="historySize" type="number">
  保留用于循环分析的最大工具调用历史记录数。
</ParamField>
<ParamField path="warningThreshold" type="number">
  用于告警的无进展重复模式阈值。
</ParamField>
<ParamField path="criticalThreshold" type="number">
  用于阻止严重循环的更高重复阈值。
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  对任何无进展运行的硬停止阈值。
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  对重复的相同工具/相同参数调用发出警告。
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  对已知轮询工具（`process.poll`、`command_status` 等）发出警告/阻止。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  对交替出现的无进展成对模式发出警告/阻止。
</ParamField>

<Warning>
如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，验证将失败。
</Warning>

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // 或 BRAVE_API_KEY 环境变量
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // 可选；省略则自动检测
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
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

### `tools.media`

配置传入媒体的理解能力（图像/音频/视频）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // 已弃用：完成结果仍由 agent 中介传递
      },
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }],
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] },
        ],
      },
      image: {
        enabled: true,
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "gemma4:26b", timeoutSeconds: 300 }],
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="媒体模型条目字段">
    **提供方条目**（`type: "provider"` 或省略）：

    - `provider`: API 提供方 id（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）
    - `model`: 模型 id 覆盖值
    - `profile` / `preferredProfile`: `auth-profiles.json` 配置文件选择

    **CLI 条目**（`type: "cli"`）：

    - `command`: 要运行的可执行文件
    - `args`: 模板化参数（支持 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 会将已弃用的 `{input}` 占位符迁移为 `{{MediaPath}}`）

    **通用字段：**

    - `capabilities`: 可选列表（`image`、`audio`、`video`）。默认值：`openai`/`anthropic`/`minimax` → image，`google` → image+audio+video，`groq` → audio。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：按条目覆盖。
    - 当 agent 调用显式的 `image` 工具时，`tools.media.image.timeoutSeconds` 和匹配的 image model `timeoutSeconds` 条目也同样适用。
    - 失败时会回退到下一个条目。

    提供方认证遵循标准顺序：`auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`。

    **异步完成字段：**

    - `asyncCompletion.directSend`: 已弃用的兼容标志。完成的异步媒体任务仍会保持 requester-session 中介，以便 agent 接收结果、决定如何告知用户，并在源传递需要时使用 message 工具。

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

控制哪些会话可以作为 session 工具（`sessions_list`、`sessions_history`、`sessions_send`）的目标。

默认值：`tree`（当前会话 + 由其派生的会话，例如 subagents）。

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
    - `self`：仅当前会话 key。
    - `tree`：当前会话 + 由当前会话派生的会话（subagents）。
    - `agent`：属于当前 agent id 的任何会话（如果你在同一 agent id 下按发送者运行会话，可能包括其他用户）。
    - `all`：任何会话。跨 agent 定位仍需要 `tools.agentToAgent`。
    - Sandbox clamp：当当前会话处于 sandbox 中且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 时，即使 `tools.sessions.visibility="all"`，可见性也会被强制为 `tree`。

  </Accordion>
</AccordionGroup>

### `tools.sessions_spawn`

控制 `sessions_spawn` 的内联附件支持。

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // 可选：设为 true 以允许内联文件附件
        maxTotalBytes: 5242880, // 所有文件合计 5 MB
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
    - 仅 `runtime: "subagent"` 支持附件。ACP runtime 会拒绝它们。
    - 文件会被物化到子工作区中的 `.openclaw/attachments/<uuid>/`，并带有 `.manifest.json`。
    - 附件内容会在转录持久化时自动脱敏。
    - Base64 输入会通过严格的字母表/填充检查以及解码前大小保护进行验证。
    - 文件权限为目录 `0700`、文件 `0600`。
    - 清理遵循 `cleanup` 策略：`delete` 总是移除附件；`keep` 仅在 `retainOnSessionKeep: true` 时保留它们。

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

实验性内置工具标志。默认关闭，除非应用了 strict-agentic 的 GPT-5 自动启用规则。

```json5
{
  tools: {
    experimental: {
      planTool: true, // 启用实验性的 update_plan
    },
  },
}
```

- `planTool`：为非平凡的多步骤工作跟踪启用结构化的 `update_plan` 工具。
- 默认值：`false`，除非 `agents.defaults.embeddedPi.executionContract`（或按 agent 的覆盖）对 OpenAI 或 OpenAI Codex GPT-5 系列运行设置为 `"strict-agentic"`。将其设为 `true` 可在该范围之外强制启用该工具，或设为 `false` 以在 strict-agentic GPT-5 运行中也保持关闭。
- 启用后，system prompt 也会添加使用指导，因此模型只在进行实质性工作时使用它，并且最多保留一个 `in_progress` 步骤。

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

- `model`：派生子代理的默认模型。若省略，子代理将继承调用者的模型。
- `allowAgents`：当请求方 agent 未设置自己的 `subagents.allowAgents` 时，`sessions_spawn` 的目标 agent id 默认允许列表（`["*"]` = 任意；默认：仅同一 agent）。
- `runTimeoutSeconds`：当工具调用省略 `runTimeoutSeconds` 时，`sessions_spawn` 的默认超时时间（秒）。`0` 表示无超时。
- `announceTimeoutMs`：gateway `agent` 通知投递尝试的单次调用超时（毫秒）。默认：`120000`。重试可能使总等待时间超过单次配置超时。
- 每个子代理的工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自定义 provider 和 base URL

OpenClaw 使用内置的模型目录。可以通过配置中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 添加自定义 provider。

为自定义/本地 provider 配置 `baseUrl`，同时也是模型 HTTP 请求的窄范围网络信任决策：OpenClaw 会通过受保护的 fetch 路径放行该精确的 `scheme://host:port` 源，而不会额外添加单独的配置项，也不会信任其他私有源。

```json5
{
  models: {
    mode: "merge", // 合并（默认） | 替换
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai
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
    - 对于自定义认证需求，使用 `authHeader: true` + `headers`。
    - 通过 `OPENCLAW_AGENT_DIR`（或旧版环境变量别名 `PI_CODING_AGENT_DIR`）覆盖 agent 配置根目录。
    - 匹配 provider ID 时的合并优先级：
      - 非空的 agent `models.json` 中的 `baseUrl` 优先。
      - 仅当该 provider 在当前配置/认证配置文件上下文中不是由 SecretRef 管理时，非空的 agent `apiKey` 才优先。
      - 由 SecretRef 管理的 provider `apiKey` 会从源标记刷新（环境变量引用使用 `ENV_VAR_NAME`，文件/exec 引用使用 `secretref-managed`），而不是持久化解析后的密钥。
      - 由 SecretRef 管理的 provider 头部值会从源标记刷新（环境变量引用使用 `secretref-env:ENV_VAR_NAME`，文件/exec 引用使用 `secretref-managed`）。
      - agent 中空或缺失的 `apiKey`/`baseUrl` 会回退到配置中的 `models.providers`。
      - 匹配的模型 `contextWindow`/`maxTokens` 使用显式配置与隐式目录值中的较大者。
      - 匹配的模型 `contextTokens` 在存在显式运行时上限时会保留该上限；可用它限制有效上下文，而不改变原生模型元数据。
      - 当你希望配置完全重写 `models.json` 时，使用 `models.mode: "replace"`。
      - 标记持久化遵循源权威：标记会从当前活动的源配置快照（解析前）写入，而不是从已解析的运行时密钥值写入。

  </Accordion>
</AccordionGroup>

### 提供商字段详情

<AccordionGroup>
  <Accordion title="顶层目录">
    - `models.mode`：提供商目录行为（`merge` 或 `replace`）。
    - `models.providers`：按 provider id 键控的自定义 provider 映射。
      - 安全编辑：对于增量更新，使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge`。`config set` 会拒绝破坏性替换，除非你传入 `--replace`。

  </Accordion>
  <Accordion title="提供商连接和认证">
    - `models.providers.*.api`：请求适配器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。对于自托管的 `/v1/chat/completions` 后端，例如 MLX、vLLM、SGLang 以及大多数兼容 OpenAI 的本地服务器，请使用 `openai-completions`。如果自定义 provider 只有 `baseUrl` 而没有 `api`，默认使用 `openai-completions`；仅当后端支持 `/v1/responses` 时才设置 `openai-responses`。
    - `models.providers.*.apiKey`：provider 凭据（优先使用 SecretRef/环境变量替换）。
    - `models.providers.*.auth`：认证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
    - `models.providers.*.contextWindow`：当模型条目未设置 `contextWindow` 时，该 provider 下模型的默认原生上下文窗口。
    - `models.providers.*.contextTokens`：当模型条目未设置 `contextTokens` 时，该 provider 下模型的默认有效运行时上下文上限。
    - `models.providers.*.maxTokens`：当模型条目未设置 `maxTokens` 时，该 provider 下模型的默认输出 token 上限。
    - `models.providers.*.timeoutSeconds`：可选的按 provider 设定的模型 HTTP 请求超时时间（秒），包括连接、响应头、正文以及总请求中止处理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：对于 Ollama + `openai-completions`，将 `options.num_ctx` 注入请求（默认：`true`）。
    - `models.providers.*.authHeader`：当需要时，强制将凭据通过 `Authorization` 头传输。
    - `models.providers.*.baseUrl`：上游 API 基础 URL。
    - `models.providers.*.headers`：用于代理/租户路由的额外静态头。

  </Accordion>
  <Accordion title="请求传输覆盖">
    `models.providers.*.request`：模型提供商 HTTP 请求的传输覆盖。

    - `request.headers`：额外头部（与 provider 默认值合并）。值支持 SecretRef。
    - `request.auth`：认证策略覆盖。模式：`"provider-default"`（使用 provider 内置认证）、`"authorization-bearer"`（配合 `token`）、`"header"`（配合 `headerName`、`value`、可选 `prefix`）。
    - `request.proxy`：HTTP 代理覆盖。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量）、`"explicit-proxy"`（配合 `url`）。两种模式都支持可选的 `tls` 子对象。
    - `request.tls`：直连的 TLS 覆盖。字段：`ca`、`cert`、`key`、`passphrase`（全部支持 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`：当为 `true` 时，允许模型 provider 的 HTTP 请求通过 provider HTTP fetch 保护机制访问私有、CGNAT 或类似网段。自定义/本地 provider 的 base URL 已经会信任精确配置的源，除元数据/链路本地（link-local）源外；这些源在未显式启用时仍会被阻止。将其设为 `false` 可放弃精确源信任。WebSocket 会对头部/TLS 使用同一个 `request`，但不会经过该 fetch SSRF 门禁。默认 `false`。

  </Accordion>
  <Accordion title="模型目录条目">
    - `models.providers.*.models`：显式 provider 模型目录条目。
    - `models.providers.*.models.*.input`：模型输入模态。仅文本模型使用 `["text"]`，原生图像/视觉模型使用 `["text", "image"]`。只有当所选模型标记为支持图像时，才会将图像附件注入 agent 回合。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文窗口元数据。它会覆盖该模型的 provider 级 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可选的运行时上下文上限。它会覆盖 provider 级 `contextTokens`；当你希望有效上下文预算小于模型原生 `contextWindow` 时使用它；当二者不同，`openclaw models list` 会显示两个值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可选兼容性提示。对于 `api: "openai-completions"` 且 `baseUrl` 非空且非原生（主机不是 `api.openai.com`）的情况，OpenClaw 会在运行时强制将其设为 `false`。空的/省略的 `baseUrl` 会保留默认 OpenAI 行为。
    - `models.providers.*.models.*.compat.requiresStringContent`：针对仅支持字符串内容的 OpenAI 兼容聊天端点的可选兼容性提示。当为 `true` 时，OpenClaw 会在发送请求前把纯文本 `messages[].content` 数组压平成普通字符串。
    - `models.providers.*.models.*.compat.strictMessageKeys`：针对严格的 OpenAI 兼容聊天端点的可选兼容性提示。当为 `true` 时，OpenClaw 会在发送请求前将输出的 Chat Completions 消息对象裁剪为仅保留 `role` 和 `content`。
    - `models.providers.*.models.*.compat.thinkingFormat`：可选的 thinking 载荷提示。对于顶层 `enable_thinking` 使用 `"qwen"`，对于支持请求级 chat-template kwargs 的 Qwen 系列 OpenAI 兼容服务器（如 vLLM），则使用 `chat_template_kwargs.enable_thinking` 对应的 `"qwen-chat-template"`。

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

交互式自定义 provider 引导会为 GPT-4o、Claude、Gemini、Qwen-VL、LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V 等常见视觉模型 ID 推断图像输入，并跳过已知纯文本家族的额外提问。未知模型 ID 仍会提示是否支持图像。非交互式引导使用相同的推断；传入 `--custom-image-input` 可强制使用支持图像的元数据，或传入 `--custom-text-input` 可强制使用纯文本元数据。

### 提供商示例

<AccordionGroup>
  <Accordion title="Cerebras（GLM 4.7 / GPT OSS）">
    捆绑的 `cerebras` provider 插件可通过 `openclaw onboard --auth-choice cerebras-api-key` 进行配置。仅当需要覆盖默认值时才使用显式 provider 配置。

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
            "cerebras/zai-glm-4.7": { alias: "GLM 4.7（Cerebras）" },
            "cerebras/gpt-oss-120b": { alias: "GPT OSS 120B（Cerebras）" },
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
              { id: "zai-glm-4.7", name: "GLM 4.7（Cerebras）" },
              { id: "gpt-oss-120b", name: "GPT OSS 120B（Cerebras）" },
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

    与 Anthropic 兼容的内置 provider。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="本地模型（LM Studio）">
    参见 [本地模型](/gateway/local-models)。简而言之：在性能足够的硬件上通过 LM Studio Responses API 运行大型本地模型；保留托管模型的合并作为回退。
  </Accordion>
  <Accordion title="MiniMax M2.7（直连）">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "Minimax" },
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
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    设置 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目录默认仅包含 M2.7。在 Anthropic 兼容的流式路径上，OpenClaw 默认会禁用 MiniMax thinking，除非你显式自行设置 `thinking`。`/fast on` 或 `params.fastMode: true` 会把 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

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

    中国区端点：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

    原生 Moonshot 端点在共享的 `openai-completions` 传输上支持流式使用兼容性，OpenClaw 依赖端点能力而不仅仅是内置 provider id。

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

    设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。使用 `opencode/...` 引用 Zen 目录，或使用 `opencode-go/...` 引用 Go 目录。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

  </Accordion>
  <Accordion title="Synthetic（与 Anthropic 兼容）">
    ```json5
    {
      env: { SYNTHETIC_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
          models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
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
                id: "hf:MiniMaxAI/MiniMax-M2.5",
                name: "MiniMax M2.5",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 192000,
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

    设置 `ZAI_API_KEY`。`z.ai/*` 和 `z-ai/*` 都是可接受的别名。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

    - 通用端点：`https://api.z.ai/api/paas/v4`
    - 编程端点（默认）：`https://api.z.ai/api/coding/paas/v4`
    - 对于通用端点，请定义一个带基础 URL 覆盖的自定义 provider。

  </Accordion>
</AccordionGroup>

---

## 相关内容

- [配置 — agents](/gateway/config-agents)
- [配置 — channels](/gateway/config-channels)
- [配置参考](/gateway/configuration-reference) — 其他顶层键
- [工具和插件](/tools)
