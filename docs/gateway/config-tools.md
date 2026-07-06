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

| Profile     | Includes                                                                                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | `session_status` only                                                                                                                                                                                                        |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `get_goal`, `create_goal`, `update_goal`, `update_plan`, `skill_workshop`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                                                                                                    |
| `full`      | No restriction (same as unset)                                                                                                                                                                                               |

`coding` and `messaging` also implicitly allow `bundle-mcp` (configured MCP servers).

### 工具组

| 组                 | 工具                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`、`process`、`code_execution`（`bash` 可作为 `exec` 的别名）                                                      |
| `group:fs`         | `read`、`write`、`edit`、`apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status` |
| `group:memory`     | `memory_search`、`memory_get`                                                                                           |
| `group:web`        | `web_search`、`x_search`、`web_fetch`                                                                                   |
| `group:ui`         | `browser`、`canvas`                                                                                                     |
| `group:automation` | `heartbeat_respond`、`cron`、`gateway`                                                                                  |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`, `get_goal`, `create_goal`, `update_goal`, `update_plan`, `skill_workshop`                                |
| `group:media`      | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                    |
| `group:openclaw`   | All built-in tools above except `read`/`write`/`edit`/`apply_patch`/`exec`/`process`/`canvas` (excludes plugin tools)   |
| `group:plugins`    | Tools owned by loaded plugins, including configured MCP servers exposed through `bundle-mcp`                            |

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

`tools.codeMode` 启用通用的 OpenClaw 代码模式界面。启用后，对于带工具的运行，模型只会看到 `exec` 和 `wait`；普通 OpenClaw 工具会转移到沙箱内的 `tools.*` 目录桥接下，MCP 工具可通过生成的 `MCP` 命名空间访问。

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

也支持简写形式：

```json5
{
  tools: { codeMode: true },
}
```

在代码模式下，MCP 声明会通过只读虚拟 API 文件表面暴露。访客代码可以调用 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")` 在调用 `MCP.<server>.<tool>()` 之前检查 TypeScript 风格的签名。有关运行时契约、限制和调试步骤，请参见 [代码模式](/reference/code-mode)。

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
`allow` and `alsoAllow` cannot both be set in the same scope (`tools`, `tools.byProvider.<id>`, `agents.list[].tools`) — config validation rejects it. Merge `alsoAllow` entries into `allow`, or drop `allow` and use `profile` + `alsoAllow` instead.
</Note>

### `tools.byProvider`

进一步限制特定提供方或模型可用的工具。顺序：基础配置档案 → 提供方配置档案 → allow/deny。

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

按特定请求者身份限制工具。这是在通道访问控制之上的纵深防御；sender 值必须来自通道适配器，而不是消息文本。

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

每个代理的 `agents.list[].tools.toolsBySender` 在匹配时会覆盖全局 sender 匹配，即使是空的 `{}` 策略也是如此。

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

- 每个代理的覆盖项（`agents.list[].tools.elevated`）只能进一步收紧。
- `/elevated on|off|ask|full` 会按会话存储状态；行内指令仅作用于单条消息。
- 提升级 `exec` 会绕过沙箱，并使用配置的逃逸路径（默认 `gateway`，如果 exec 目标是 `node` 则使用 `node`）。

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
        allowModels: ["gpt-5.5"],
      },
    },
  },
}
```

Values shown are defaults except `applyPatch.allowModels` (empty/unset by default, meaning any compatible model may use `apply_patch`). `approvalRunningNoticeMs` emits a running notice when approval-backed exec runs long; `0` disables it.

### `tools.loopDetection`

工具循环安全检查默认**禁用**。设置 `enabled: true` 以启用检测。配置可以在全局 `tools.loopDetection` 中定义，并在 `agents.list[].tools.loopDetection` 中按代理覆盖。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      unknownToolThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
      postCompactionGuard: {
        windowSize: 3,
      },
    },
  },
}
```

<ParamField path="historySize" type="number">
  循环分析保留的工具调用历史最大长度。
</ParamField>
<ParamField path="warningThreshold" type="number">
  用于警告的无进展重复模式阈值。
</ParamField>
<ParamField path="unknownToolThreshold" type="number">
  Blocks repeated calls to the same unavailable/unknown tool name after this many misses.
</ParamField>
<ParamField path="criticalThreshold" type="number">
  用于阻止严重循环的更高重复阈值。
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  任何无进展运行的硬停止阈值。
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  对重复的同工具/同参数调用发出警告。
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  对已知轮询工具（`process.poll`、`command_status` 等）发出警告/阻止。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  对交替出现的无进展成对模式发出警告/阻止。
</ParamField>
<ParamField path="postCompactionGuard.windowSize" type="number">
  Number of attempts after auto-compaction the guard stays armed for; aborts if the agent repeats the same (tool, args, result) inside that window.
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
        apiKey: "brave_api_key", // or BRAVE_API_KEY env (Brave provider)
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // optional; omit for auto-detect
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

Values shown are defaults except `provider` and `userAgent`. `maxResponseBytes` clamps to 32000–10000000; `maxChars` clamps to `maxCharsCap` (raise `maxCharsCap` to allow larger responses).

### `tools.media`

配置入站媒体理解（图像/音频/视频）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // 已弃用：完成仍由代理中介
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

`concurrency` (default `2`), `audio.maxBytes` (default 20 MB), and `video.maxBytes` (default 50 MB) are shown at their defaults; `image.maxBytes` defaults to 10 MB. Per-capability request timeout defaults: image/audio `60`s, video `120`s.

<AccordionGroup>
  <Accordion title="媒体模型条目字段">
    **提供方条目**（`type: "provider"` 或省略）：

    - `provider`：API 提供方 id（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）
    - `model`：模型 id 覆盖
    - `profile` / `preferredProfile`：`auth-profiles.json` 配置档案选择

    **CLI 条目**（`type: "cli"`）：

    - `command`：要运行的可执行文件
    - `args`：模板参数（支持 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 会把已弃用的 `{input}` 占位符迁移为 `{{MediaPath}}`）

    **通用字段：**

    - `capabilities`: optional list (`image`, `audio`, `video`). Each provider plugin declares its own default capability set; for example the bundled `openai` provider defaults to image+audio, `anthropic`/`minimax` to image, `google` to image+audio+video, and `groq` to audio.
    - `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: per-entry overrides.
    - `tools.media.image.timeoutSeconds` and matching image model `timeoutSeconds` entries also apply when the agent calls the explicit `image` tool. For image understanding, this timeout applies to the request itself and is not reduced by earlier preparation work.
    - Failures fall back to the next entry.

    提供方认证遵循标准顺序：`auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`。

    **异步完成字段：**

    - `asyncCompletion.directSend`：已弃用的兼容标志。完成的异步媒体任务仍然由请求者会话中介，因此代理会收到结果、决定如何告知用户，并在源交付需要时使用 message 工具。

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

默认值：`tree`（当前会话 + 由其派生的会话，例如子代理）。

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
  <Accordion title="Visibility scopes">
    - `self`: only the current session key.
    - `tree`: current session + sessions spawned by the current session (subagents).
    - `agent`: any session belonging to the current agent id (can include other users if you run per-sender sessions under the same agent id).
    - `all`: any session. Cross-agent targeting still requires `tools.agentToAgent`.
    - Sandbox clamp: when the current session is sandboxed and `agents.defaults.sandbox.sessionToolsVisibility="spawned"` (the default), visibility is forced to `tree` even if `tools.sessions.visibility="all"`.
    - When not `all`, `sessions_list` includes a compact `visibility` field
      describing the effective mode and a warning that some sessions may be
      omitted outside the current scope.

  </Accordion>
</AccordionGroup>

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

<a id="toolsexperimental"></a>

### `tools.experimental`

实验性内置工具标志。除非严格代理式 GPT-5 自动启用规则适用，否则默认关闭。

```json5
{
  tools: {
    experimental: {
      planTool: true, // 启用实验性的 update_plan
    },
  },
}
```

- `planTool`: enables the structured `update_plan` tool for non-trivial multi-step work tracking.
- Default: `false` unless `agents.defaults.embeddedAgent.executionContract` (or a per-agent override) is set to `"strict-agentic"` for an `openai` provider run against a GPT-5-family model id (this covers OpenAI Codex CLI runs too, since Codex auth/model routing lives under the `openai` provider). Set `true` to force the tool on outside that scope, or `false` to keep it off even for strict-agentic GPT-5 runs.
- When enabled, the system prompt also adds usage guidance so the model only uses it for substantial work and keeps at most one step `in_progress`.

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

- `model`: default model for spawned sub-agents. If omitted, sub-agents inherit the caller's model.
- `allowAgents`: default allowlist of configured target agent ids for `sessions_spawn` when the requester agent does not set its own `subagents.allowAgents` (`["*"]` = any configured target; default: same agent only). Stale entries whose agent config was deleted are rejected by `sessions_spawn` and omitted from `agents_list`; run `openclaw doctor --fix` to clean them up.
- `maxConcurrent`: max concurrent sub-agent runs. Default: `8`.
- `runTimeoutSeconds`: timeout (seconds) for `sessions_spawn` when the caller does not pass its own override. Default: `0` (no timeout); the `900` shown above is a common opt-in value, not the built-in default.
- `announceTimeoutMs`: per-call timeout (milliseconds) for gateway `agent` announce delivery attempts. Default: `120000`. Transient retries can make the total announce wait longer than one configured timeout.
- `archiveAfterMinutes`: minutes after a sub-agent session completes before it is auto-archived. Default: `60`; `0` disables auto-archive.
- Per-subagent tool policy: `tools.subagents.tools.allow` / `tools.subagents.tools.deny`.

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
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai | etc.
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
  <Accordion title="Auth and merge precedence">
    - Use `authHeader: true` + `headers` for custom auth needs.
    - Override agent config root with `OPENCLAW_AGENT_DIR`.
    - Merge precedence for matching provider IDs:
      - Non-empty agent `models.json` `baseUrl` values win.
      - Non-empty agent `apiKey` values win only when that provider is not SecretRef-managed in current config/auth-profile context.
      - SecretRef-managed provider `apiKey` values are refreshed from source markers (`ENV_VAR_NAME` for env refs, `secretref-managed` for file/exec refs) instead of persisting resolved secrets.
      - SecretRef-managed provider header values are refreshed from source markers (`secretref-env:ENV_VAR_NAME` for env refs, `secretref-managed` for file/exec refs).
      - Empty or missing agent `apiKey`/`baseUrl` fall back to `models.providers` in config.
      - Matching model `contextWindow`/`maxTokens`: the explicit config value wins when present and valid (a positive finite number); otherwise the implicit/generated catalog value is used.
      - Matching model `contextTokens` follows the same explicit-wins-else-implicit rule; use it to limit effective context without changing native model metadata.
      - Provider-plugin catalogs are stored as generated plugin-owned catalog shards under the agent's plugin state.
      - Use `models.mode: "replace"` when you want config to fully rewrite `models.json` and skip merging in plugin-owned catalog shards.
      - Marker persistence is source-authoritative: markers are written from the active source config snapshot (pre-resolution), not from resolved runtime secret values.

  </Accordion>
</AccordionGroup>

### 提供商字段详情

<AccordionGroup>
  <Accordion title="顶层目录">
    - `models.mode`：提供商目录行为（`merge` 或 `replace`）。
    - `models.providers`：按 provider id 键入的自定义 provider 映射。
      - 安全编辑：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 进行增量更新。`config set` 会拒绝破坏性替换，除非你传入 `--replace`。

  </Accordion>
  <Accordion title="Provider connection and auth">
    - `models.providers.*.api`: request adapter (`openai-completions`, `openai-responses`, `openai-chatgpt-responses`, `anthropic-messages`, `google-generative-ai`, `google-vertex`, `github-copilot`, `bedrock-converse-stream`, `ollama`, `azure-openai-responses`). For self-hosted `/v1/chat/completions` backends such as MLX, vLLM, SGLang, and most OpenAI-compatible local servers, use `openai-completions`. A custom provider with `baseUrl` but no `api` defaults to `openai-completions`; set `openai-responses` only when the backend supports `/v1/responses`.
    - `models.providers.*.apiKey`: provider credential (prefer SecretRef/env substitution).
    - `models.providers.*.auth`: auth strategy (`api-key`, `token`, `oauth`, `aws-sdk`).
    - `models.providers.*.contextWindow`: default native context window for models under this provider when the model entry does not set `contextWindow`.
    - `models.providers.*.contextTokens`: default effective runtime context cap for models under this provider when the model entry does not set `contextTokens`.
    - `models.providers.*.maxTokens`: default output-token cap for models under this provider when the model entry does not set `maxTokens`.
    - `models.providers.*.timeoutSeconds`: optional per-provider model HTTP request timeout in seconds, including connect, headers, body, and total request abort handling.
    - `models.providers.*.injectNumCtxForOpenAICompat`: for Ollama + `openai-completions`, inject `options.num_ctx` into requests (default: `true`).
    - `models.providers.*.authHeader`: force credential transport in the `Authorization` header when required.
    - `models.providers.*.baseUrl`: upstream API base URL.
    - `models.providers.*.headers`: extra static headers for proxy/tenant routing.

  </Accordion>
  <Accordion title="请求传输覆盖">
    `models.providers.*.request`：用于模型提供商 HTTP 请求的传输覆盖。

    - `request.headers`：额外头（与 provider 默认值合并）。值支持 SecretRef。
    - `request.auth`：认证策略覆盖。模式：`"provider-default"`（使用 provider 内建认证）、`"authorization-bearer"`（配合 `token`）、`"header"`（配合 `headerName`、`value`、可选 `prefix"`）。
    - `request.proxy`：HTTP 代理覆盖。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量）、`"explicit-proxy"`（配合 `url`）。两种模式都支持可选的 `tls` 子对象。
    - `request.tls`：直接连接的 TLS 覆盖。字段：`ca`、`cert`、`key`、`passphrase`（均支持 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`：当为 `true` 时，允许模型提供商 HTTP 请求通过 provider HTTP fetch 保护器访问私有、CGNAT 或类似网段。自定义/本地 provider 的 base URL 已经信任精确配置的来源，但元数据/链路本地来源仍会在没有显式允许的情况下被阻止。将其设为 `false` 可退出精确来源信任。WebSocket 会使用同一个 `request` 处理头/TLS，但不会使用该 fetch SSRF 门禁。默认值：`false`。

  </Accordion>
  <Accordion title="模型目录条目">
    - `models.providers.*.models`：显式的 provider 模型目录条目。
    - `models.providers.*.models.*.input`：模型输入模态。纯文本模型使用 `["text"]`，原生图像/视觉模型使用 `["text", "image"]`。只有当所选模型被标记为支持图像时，图像附件才会注入到 agent 回合中。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文窗口元数据。它会覆盖该模型的 provider 级 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可选的运行时上下文上限。它会覆盖 provider 级 `contextTokens`；当你希望有效上下文预算小于模型原生 `contextWindow` 时可使用它；`openclaw models list` 会在两者不同时时显示两个值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可选兼容性提示。对于 `api: "openai-completions"` 且 `baseUrl` 非空且非原生（host 不是 `api.openai.com`）的情况，OpenClaw 会在运行时强制将其设为 `false`。空的/省略的 `baseUrl` 会保留默认 OpenAI 行为。
    - `models.providers.*.models.*.compat.requiresStringContent`：面向仅支持字符串的 OpenAI 兼容聊天端点的可选兼容性提示。当为 `true` 时，OpenClaw 会在发送请求前将纯文本 `messages[].content` 数组压平成普通字符串。
    - `models.providers.*.models.*.compat.strictMessageKeys`：面向严格 OpenAI 兼容聊天端点的可选兼容性提示。当为 `true` 时，OpenClaw 会在发送请求前将输出的 Chat Completions 消息对象裁剪为仅保留 `role` 和 `content`。
    - `models.providers.*.models.*.compat.thinkingFormat`：可选的 thinking 负载提示。Together 风格的 `reasoning.enabled` 使用 `"together"`，顶层 `enable_thinking` 使用 `"qwen"`，而 `chat_template_kwargs.enable_thinking` 使用 `"qwen-chat-template"`，适用于支持请求级 chat-template kwargs 的 Qwen 系列 OpenAI 兼容服务器，例如 vLLM。已配置的 vLLM Qwen 模型会为这些格式暴露二值 `/think` 选项（`off`、`on`）。
    - `models.providers.*.models.*.compat.requiresReasoningContentOnAssistantMessages`：面向 DeepSeek 风格 Chat Completions 后端的可选兼容性提示，这类后端要求先前的 assistant 消息在重放时保留 `reasoning_content`。当为 `true` 时，OpenClaw 会在输出的 assistant 消息中保留该字段。把它用于连接会在移除推理内容后拒绝请求的自定义 DeepSeek 兼容代理。默认值：`false`。

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

Interactive custom-provider onboarding infers image input for known vision-model-id patterns, including GPT-4o/GPT-4.1/GPT-5+, the `o1`/`o3`/`o4` reasoning families, Claude, Gemini, any `-vl`-suffixed id (Qwen-VL and similar), and named families such as LLaVA, Pixtral, InternVL, Mllama, MiniCPM-V, and GLM-4V; it skips the extra question for known text-only families (Llama, DeepSeek, Mistral/Mixtral, Kimi/Moonshot, Codestral, Devstral, Phi, QwQ, CodeLlama, and bare Qwen ids without a vl/vision suffix). Unknown model IDs still prompt for image support. Non-interactive onboarding uses the same inference; pass `--custom-image-input` to force image-capable metadata or `--custom-text-input` to force text-only metadata.

### 提供商示例

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    官方外部 `cerebras` 提供商插件可以通过 `openclaw onboard --auth-choice cerebras-api-key` 进行配置。只有在覆盖默认值时才使用显式 provider 配置。

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

    兼容 Anthropic，内置 provider。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="本地模型（LM Studio）">
    参见 [本地模型](/gateway/local-models)。简而言之：在高性能硬件上通过 LM Studio Responses API 运行大型本地模型；保留托管模型的合并以作为回退。
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

    设置 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目录默认包含 M3，也包含 M2.7 变体。在 Anthropic 兼容的流式路径上，OpenClaw 默认会禁用 MiniMax M2.x thinking，除非你显式设置了 `thinking`；MiniMax-M3（以及 M3.x）默认保持 provider 的省略/自适应 thinking 路径。`/fast on` 或 `params.fastMode: true` 会把 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

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

    原生 Moonshot 端点在共享的 `openai-completions` 传输上支持流式 usage 兼容性，OpenClaw 会根据端点能力而不是仅根据内置 provider id 来判断。

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

    设置 `ZAI_API_KEY`。模型引用使用规范的 `zai/*` provider ID。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

    - General endpoint: `https://api.z.ai/api/paas/v4`
    - Coding endpoint: `https://api.z.ai/api/coding/paas/v4`
    - The default `zai-api-key` auth choice probes your key and auto-detects which endpoint it belongs to (falling back to a prompt, defaulting to Global, if detection is inconclusive). Dedicated CN and Coding-Plan auth choices are also available for explicit selection.
    - For the general endpoint, define a custom provider with the base URL override.

  </Accordion>
</AccordionGroup>

---

## 相关内容

- [配置 — agents](/gateway/config-agents)
- [配置 — channels](/gateway/config-channels)
- [配置参考](/gateway/configuration-reference) — 其他顶层键
- [工具与插件](/tools)