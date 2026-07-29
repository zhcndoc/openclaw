---
summary: "代理默认值、多代理路由、会话、消息和对话配置"
read_when:
  - 调整代理默认值（模型、思考、工作区、心跳、多媒体、技能）
  - 配置多代理路由和绑定
  - 调整会话、消息传递和对话模式行为
title: "配置 — 代理"
---

位于 `agents.*`、`multiAgent.*`、`session.*`、`messages.*` 和 `talk.*` 下的代理作用域配置键。关于通道、工具、网关运行时以及其他顶级键，请参见 [配置参考](/gateway/configuration-reference)。

## 代理默认值

### `agents.defaults.workspace`

默认值：当设置了 `OPENCLAW_WORKSPACE_DIR` 时为该值，否则为 `~/.openclaw/workspace`（如果 `OPENCLAW_PROFILE` 设置为非默认配置，则为 `~/.openclaw/workspace-<profile>`）。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

显式设置的 `agents.defaults.workspace` 值优先于
`OPENCLAW_WORKSPACE_DIR`。当你不想把该路径写入配置时，可使用环境变量将默认代理指向已挂载的工作区。

### `agents.defaults.repoRoot`

可选的仓库根目录，将显示在系统提示词的 Runtime 行中。如果未设置，OpenClaw 将通过从工作区向上遍历自动检测它。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

Optional default skill allowlist for agents that do not set
`agents.entries.*.skills`.

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" }, // 继承 github, weather
      { id: "docs", skills: ["docs-search"] }, // 替换默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

- Omit `agents.defaults.skills` for unrestricted skills by default.
- Omit `agents.entries.*.skills` to inherit the defaults.
- Set `agents.entries.*.skills: []` for no skills.
- A non-empty `agents.entries.*.skills` list is the final set for that agent; it
  does not merge with defaults.

### `agents.defaults.skipBootstrap`

Disables automatic creation of workspace bootstrap files (`AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `BOOTSTRAP.md`).

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

Skips creation of selected optional workspace files while still writing required bootstrap files (`AGENTS.md`, `BOOTSTRAP.md`). Valid values: `SOUL.md`, `USER.md`, and `IDENTITY.md` (`HEARTBEAT.md` is accepted but a no-op since heartbeat context moved to cron monitor scratch).

```json5
{
  agents: {
    defaults: {
      skipOptionalBootstrapFiles: ["SOUL.md", "USER.md"],
    },
  },
}
```

### `agents.defaults.contextInjection`

控制工作区引导文件何时注入到系统提示词中。默认值：`"always"`。

- `"continuation-skip"`：安全的续接轮次（在完成一次助手回复之后）会跳过工作区引导的重新注入，从而减小提示词大小。心跳运行和压缩后重试仍会重建上下文。
- `"never"`：在每一轮都禁用工作区引导和上下文文件注入。仅适用于完全自行管理提示词生命周期的代理（自定义上下文引擎、自己构建上下文的原生运行时，或专门的无引导工作流）。心跳和压缩恢复轮次也会跳过注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

Per-agent override: `agents.entries.*.contextInjection`. Omitted values inherit
`agents.defaults.contextInjection`.

### `agents.defaults.bootstrapMaxChars`

每个工作区引导文件在截断前的最大字符数。默认值：`20000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

Per-agent override: `agents.entries.*.bootstrapMaxChars`. Omitted values inherit
`agents.defaults.bootstrapMaxChars`.

### `agents.defaults.bootstrapTotalMaxChars`

跨所有工作区引导文件注入的最大总字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

Per-agent override: `agents.entries.*.bootstrapTotalMaxChars`. Omitted values
inherit `agents.defaults.bootstrapTotalMaxChars`.

### 逐代理引导配置文件覆盖

当某个代理需要与共享默认值不同的提示词注入行为时，可使用逐代理引导配置文件覆盖。省略的字段会继承自
`agents.defaults`。

```json5
{
  agents: {
    defaults: {
      contextInjection: "continuation-skip",
      bootstrapMaxChars: 20000,
      bootstrapTotalMaxChars: 60000,
    },
    list: [
      {
        id: "strict-worker",
        contextInjection: "always",
        bootstrapMaxChars: 50000,
        bootstrapTotalMaxChars: 300000,
      },
    ],
  },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

控制在引导上下文被截断时，向代理显示的系统提示通知。
默认值：`"always"`。

- `"off"`：从不向系统提示中注入截断通知文本。
- `"once"`：针对每个唯一的截断签名，仅注入一次简明通知。
- `"always"`：只要存在截断，就在每次运行时注入简明通知（推荐）。

更详细的原始/注入计数以及配置调优字段会保留在诊断信息中，例如上下文/状态报告和日志；普通 WebChat 用户/运行时上下文只会收到简明的恢复通知。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "always" } }, // 关闭 | 一次 | 始终
}
```

### 上下文预算所有权映射

OpenClaw 具有多个高容量的提示词/上下文预算，它们被有意按子系统拆分，而不是全部通过一个通用开关流转。

| Budget                                                         | Covers                                                                                                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents.defaults.bootstrapMaxChars` / `bootstrapTotalMaxChars` | 常规工作区引导注入                                                                                                                                                |
| `agents.defaults.startupContext.*`                             | 一次性重置/启动模型运行前奏，包括最近的每日 `memory/*.md` 文件。裸聊天 `/new` 和 `/reset` 会在不调用模型的情况下被确认 |
| `skills.limits.*`                                              | 注入系统提示词中的紧凑技能列表                                                                                                                                    |
| `agents.defaults.contextLimits.*`                              | 有边界的运行时摘录以及注入的运行时所有块                                                                                                                          |
| `memory.qmd.limits.*`                                          | 索引化的记忆搜索片段和注入大小                                                                                                                                    |

匹配的按代理覆盖：

- `agents.entries.*.skillsLimits.maxSkillsPromptChars`
- `agents.entries.*.contextInjection`
- `agents.entries.*.bootstrapMaxChars`
- `agents.entries.*.bootstrapTotalMaxChars`
- `agents.entries.*.contextLimits.*`

#### `agents.defaults.startupContext`

控制在重置/启动模型运行时注入的首轮启动前奏。裸聊天 `/new` 和 `/reset` 命令会在不调用模型的情况下确认重置，因此不会加载这段前奏。

```json5
{
  agents: {
    defaults: {
      startupContext: {
        enabled: true,
        applyOn: ["new", "reset"],
        dailyMemoryDays: 2,
        maxFileBytes: 16384,
        maxFileChars: 1200,
        maxTotalChars: 2800,
      },
    },
  },
}
```

#### `agents.defaults.contextLimits`

有边界的运行时上下文表面的共享默认值。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`: default `memory_get` excerpt cap before truncation
  metadata and continuation notice are added.
- When `memory_get` omits `lines`, OpenClaw uses a built-in 120-line window and
  then applies `memoryGetMaxChars`.
- Live tool results use a model-context auto cap: `16000` chars below 100K
  tokens, `32000` chars at 100K+ tokens, and `64000` chars at 200K+ tokens.
- `postCompactionMaxChars`: AGENTS.md excerpt cap used during post-compaction
  refresh injection.

#### `agents.entries.*.contextLimits`

针对共享 `contextLimits` 开关的逐代理覆盖。省略的字段会继承自 `agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: { memoryGetMaxChars: 12000 },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

注入系统提示词中的紧凑技能列表的全局上限。这不会影响按需读取 `SKILL.md` 文件。

```json5
{
  skills: { limits: { maxSkillsPromptChars: 18000 } },
}
```

#### `agents.entries.*.skillsLimits.maxSkillsPromptChars`

针对技能提示词预算的逐代理覆盖。

```json5
{
  agents: {
    list: [{ id: "tiny-local", skillsLimits: { maxSkillsPromptChars: 6000 } }],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

在传递给提供方调用之前，转录/工具图像块中最长边的最大像素尺寸。默认值：`1200`。

较低的值通常会减少视觉 token 的使用量以及截图较多的运行中的请求负载大小。
较高的值会保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.imageQuality`

从文件路径、URL 和媒体引用加载的图片的图像工具压缩/细节偏好。
默认值：`auto`。

OpenClaw 会根据所选图像模型调整缩放梯度。例如，Claude Opus 4.8、OpenAI GPT-5.6 Sol、Qwen VL 和托管的 Llama 4 视觉模型可以使用比旧版/默认高细节视觉路径更大的图像，而在 `auto` 模式下，多图像轮次会被更积极地压缩，以控制 token 和延迟成本。

可选值：

- `auto`：根据模型限制和图像数量自适应。
- `efficient`：优先更小的图像，以降低 token 和字节使用量。
- `balanced`：使用标准的中间梯度。
- `high`：为截图、图表和文档图像保留更多细节。

```json5
{
  agents: { defaults: { imageQuality: "auto" } },
}
```

### `agents.defaults.userTimezone`

系统提示词上下文使用的时区（不是消息时间戳）。回退到宿主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示中的时间格式。默认值：`auto`（操作系统偏好）。

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // 自动 | 12 | 24
}
```

### `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      utilityModel: "openai/gpt-5.4-mini",
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      mediaModels: {
        image: {
          primary: "openai/gpt-image-2",
          fallbacks: ["google/gemini-3.1-flash-image"],
        },
        video: {
          primary: "qwen/wan2.6-t2v",
          fallbacks: ["qwen/wan2.6-i2v"],
        },
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // global default provider params
      pdfMaxMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      toolProgressDetail: "explain",
      reasoningDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 4,
    },
  },
}
```

- `model`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - String form sets only the primary model.
  - Object form sets primary plus ordered failover models.
- `utilityModel`: optional `provider/model` ref or alias for short internal tasks. It currently powers generated Control UI session titles, Telegram DM topic titles, Discord auto-thread titles, and [progress-draft narration](/concepts/progress-drafts#narrated-status). When unset, OpenClaw derives the primary provider's declared small-model default when one exists (OpenAI → `gpt-5.6-luna`, Anthropic → `claude-haiku-4-5`); title tasks otherwise use the agent's primary model, and narration stays off. If a distinct utility model cannot prepare or complete a generated title, OpenClaw retries that title once with the primary model. For dashboard titles, automatic utility derivation and the regular fallback use the effective session provider and auth profile; an explicit utility model keeps its configured provider/auth. Set `utilityModel: ""` to skip the alternate utility route; dashboard title generation still proceeds directly to the regular session model. `agents.entries.*.utilityModel` overrides the default, and an operation-specific model override wins over both. Utility tasks make separate model calls and send task-specific content to the selected model provider. Dashboard title generation sends at most the first 1,000 characters of the first non-command message; narration sends the inbound request plus compact redacted tool summaries. Choose a provider that matches your cost and data-handling requirements.
- `imageModel`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the `image` tool path as its vision-model config when the active model cannot accept images. Native-vision models receive loaded image bytes directly instead.
  - Also used as fallback routing when the selected/default model cannot accept image input.
  - Prefer explicit `provider/model` refs. Bare IDs are accepted for compatibility; if a bare ID uniquely matches a configured image-capable entry in `models.providers.*.models`, OpenClaw qualifies it to that provider. Ambiguous configured matches require an explicit provider prefix.
- `mediaModels.image`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the shared image-generation capability and any future tool/plugin surface that generates images.
  - Typical values: `google/gemini-3.1-flash-image` for native Gemini image generation, `fal/fal-ai/flux/dev` for fal, `openai/gpt-image-2` for OpenAI Images, or `openai/gpt-image-1.5` for transparent-background OpenAI PNG/WebP output.
  - If you select a provider/model directly, configure matching provider auth too (for example `GEMINI_API_KEY` or `GOOGLE_API_KEY` for `google/*`, `OPENAI_API_KEY` or OpenAI Codex OAuth for `openai/gpt-image-2` / `openai/gpt-image-1.5`, `FAL_KEY` for `fal/*`).
  - If omitted, `image_generate` can still infer an auth-backed provider default. It tries the current default provider first, then the remaining registered image-generation providers in provider-id order.
- `mediaModels.music`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the shared music-generation capability and the built-in `music_generate` tool.
  - Typical values: `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview`, or `minimax/music-2.6`.
  - If omitted, `music_generate` can still infer an auth-backed provider default. It tries the current default provider first, then the remaining registered music-generation providers in provider-id order.
  - If you select a provider/model directly, configure the matching provider auth/API key too.
- `mediaModels.video`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the shared video-generation capability and the built-in `video_generate` tool.
  - Typical values: `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash`, or `qwen/wan2.7-r2v`.
  - If omitted, `video_generate` can still infer an auth-backed provider default. It tries the current default provider first, then the remaining registered video-generation providers in provider-id order.
  - If you select a provider/model directly, configure the matching provider auth/API key too.
  - The official Qwen video-generation plugin supports up to 1 output video, 1 input image, 4 input videos, 10 seconds duration, and provider-level `size`, `aspectRatio`, `resolution`, `audio`, and `watermark` options.
- `pdfModel`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the `pdf` tool for model routing.
  - If omitted, the PDF tool falls back to `imageModel`, then to the resolved session/default model.
- `pdfMaxMb`: default PDF size limit for the `pdf` tool when `maxBytesMb` is not passed at call time.
- `pdfMaxPages`: default maximum pages considered by extraction fallback mode in the `pdf` tool.
- `verboseDefault`: default verbose level for agents. Values: `"off"`, `"on"`, `"full"`. Default: `"off"`.
- `toolProgressDetail`: detail mode for `/verbose` tool summaries and progress-draft tool lines. Values: `"explain"` (default, compact human labels) or `"raw"` (append raw command/detail when available). Per-agent `agents.entries.*.toolProgressDetail` overrides this default.
- `reasoningDefault`: default reasoning visibility for agents. Values: `"off"`, `"on"`, `"stream"`. Per-agent `agents.entries.*.reasoningDefault` overrides this default. Configured reasoning defaults are only applied for owners, authorized senders, or operator-admin gateway contexts when no per-message or session reasoning override is set.
- `elevatedDefault`: default elevated-output level for agents. Values: `"off"`, `"on"`, `"ask"`, `"full"`. Default: `"on"`.
- `model.primary`: format `provider/model` (e.g. `openai/gpt-5.6-sol` for Codex OAuth access). If you omit the provider, OpenClaw tries an alias first, then a unique configured-provider match for that exact model id, and only then falls back to the configured default provider (deprecated compatibility behavior, so prefer explicit `provider/model`). If that provider no longer exposes the configured default model, OpenClaw falls back to the first configured provider/model instead of surfacing a stale removed-provider default.
- `contextTokens`: optional agent-wide cap. It can lower the effective budget of a larger model but cannot raise a model above its configured or discovered `contextTokens`. To opt one direct OpenAI model into its larger native window, set `models.providers.openai.models[].contextWindow` and `contextTokens` for that model; see [OpenAI context window defaults](/providers/openai#context-window-defaults-and-long-context-opt-in).
- `models`: configured aliases and per-model settings. Each entry can include `alias` (shortcut) and `params` (provider-specific, for example `temperature`, `maxTokens`, `cacheRetention`, `context1m`, `responsesServerCompaction`, `responsesCompactThreshold`, OpenRouter `provider` routing, `chat_template_kwargs`, `extra_body`/`extraBody`). Adding entries does not restrict model overrides.
  - Use `provider/*` entries such as `"openai/*": {}` or `"vllm/*": {}` to show all discovered models for selected providers without manually listing every model id.
  - Add `agentRuntime` to a `provider/*` entry when every dynamically discovered model for that provider should use the same runtime. Exact `provider/model` runtime policy still wins over the wildcard.
  - Safe metadata edits: use `openclaw config set agents.defaults.models '<json>' --strict-json --merge` to add entries. `config set` refuses replacements that would remove existing entries unless you pass `--replace`.
- `modelPolicy.allow`: explicit override allowlist. Accepts aliases, exact `provider/model` refs, and trailing prefix wildcards such as `openai/*` or `clawrouter/anthropic/*`. Omit it or use `[]` to allow any model. `agents.entries.*.modelPolicy.allow` replaces the default policy for that agent; an explicit empty list opts that agent into allow-any.
  - Provider-scoped configure/onboarding flows merge selected provider models into this map and preserve unrelated providers already configured.
  - For direct OpenAI Responses models, server-side compaction is enabled automatically. Use `params.responsesServerCompaction: false` to stop injecting `context_management`, or `params.responsesCompactThreshold` to override the threshold. See [OpenAI server-side compaction](/providers/openai#advanced-configuration).
- `params`: global default provider parameters applied to all models. Set at `agents.defaults.params` (e.g. `{ cacheRetention: "long" }`).
- `params` merge precedence (config): `agents.defaults.params` (global base) is overridden by `agents.defaults.models["provider/model"].params` (per-model), then `agents.entries.*.params` (matching agent id) overrides by key. See [Prompt Caching](/reference/prompt-caching) for details.
- `models.providers.openrouter.params.provider`: OpenRouter-wide default provider-routing policy. OpenClaw forwards this to OpenRouter's request `provider` object; per-model `agents.defaults.models["openrouter/<model>"].params.provider` and agent params override by key. See [OpenRouter provider routing](/providers/openrouter#advanced-configuration).
- `params.extra_body`/`params.extraBody`: advanced pass-through JSON merged into `api: "openai-completions"` request bodies for OpenAI-compatible proxies. If it collides with generated request keys, the extra body wins; non-native completions routes still strip OpenAI-only `store` afterward.
- `params.chat_template_kwargs`: vLLM/OpenAI-compatible chat-template arguments merged into top-level `api: "openai-completions"` request bodies. For `vllm/nemotron-3-*` with thinking off, the bundled vLLM plugin automatically sends `enable_thinking: false` and `force_nonempty_content: true`; explicit `chat_template_kwargs` override generated defaults, and `extra_body.chat_template_kwargs` still has final precedence. Configured vLLM Qwen and Nemotron thinking models expose binary `/think` choices (`off`, `on`) instead of the multi-level effort ladder.
- `compat.thinkingFormat`: OpenAI-compatible thinking payload style. Use `"together"` for Together-style `reasoning.enabled`, `"qwen"` for Qwen-style top-level `enable_thinking`, or `"qwen-chat-template"` for `chat_template_kwargs.enable_thinking` on Qwen-family backends that support request-level chat-template kwargs, such as vLLM. OpenClaw maps disabled thinking to `false` and enabled thinking to `true`, and configured vLLM Qwen models expose binary `/think` choices for these formats.
- `compat.supportedReasoningEfforts`: per-model OpenAI-compatible reasoning effort list. Include `"xhigh"` for custom endpoints that truly accept it; OpenClaw then exposes `/think xhigh` in command menus, Gateway session rows, session patch validation, agent CLI validation, and `llm-task` validation for that configured provider/model. Use `compat.reasoningEffortMap` when the backend wants a provider-specific value for a canonical level.
- `params.preserveThinking`: Z.AI-only opt-in for preserved thinking. When enabled and thinking is on, OpenClaw sends `thinking.clear_thinking: false` and replays prior `reasoning_content`; see [Z.AI thinking and preserved thinking](/providers/zai#advanced-configuration).
- `localService`: optional provider-level process manager for local/self-hosted model servers. When the selected model belongs to that provider, OpenClaw probes `healthUrl` (or `baseUrl + "/models"`), starts `command` with `args` if the endpoint is down, waits up to `readyTimeoutMs`, then sends the model request. `command` must be an absolute path. `idleStopMs: 0` keeps the process alive until OpenClaw exits; a positive value stops the OpenClaw-spawned process after that many idle milliseconds. See [Local model services](/gateway/local-model-services).
- Runtime policy belongs on providers or models, not on `agents.defaults`. Use `models.providers.<provider>.agentRuntime` for provider-wide rules or `agents.defaults.models["provider/model"].agentRuntime` / `agents.entries.*.models["provider/model"].agentRuntime` for model-specific rules. A provider/model prefix alone never selects a harness. With runtime unset or `auto`, OpenAI may select Codex implicitly only for an exact official HTTPS Platform Responses or ChatGPT Responses route with no authored request override. See [OpenAI implicit agent runtime](/providers/openai#implicit-agent-runtime).
- Config writers that mutate these fields (for example `/models set`, `/models set-image`, and fallback add/remove commands) save canonical object form and preserve existing fallback lists when possible.
- `maxConcurrent`: max parallel agent runs across sessions (each session still serialized). By default, OpenClaw uses `min(16, max(8, available CPU parallelism))`, based on `os.availableParallelism()` with `os.cpus().length` as a fallback.

### 运行时策略

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: { id: "codex" },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.6-sol",
      models: {
        "anthropic/claude-opus-5": {
          agentRuntime: { id: "claude-cli" },
        },
        "vllm/*": {
          agentRuntime: { id: "openclaw" },
        },
      },
    },
  },
}
```

- `id`: `"auto"`, `"openclaw"`, a registered plugin harness id, or a supported CLI backend alias. The bundled Codex plugin registers `codex`; the bundled Anthropic plugin provides the `claude-cli` CLI backend.
- `id: "auto"` lets registered plugin harnesses claim effective routes that declare or otherwise satisfy their support contract, and uses OpenClaw when no harness matches. An explicit plugin runtime such as `id: "codex"` requires that harness and a compatible effective route; it fails closed if either is unavailable or if execution fails.
- `id: "pi"` is accepted only as a deprecated alias for `openclaw` to preserve shipped configs from v2026.5.22 and earlier. New config should use `openclaw`.
- Runtime precedence is exact model policy first (`agents.entries.*.models["provider/model"]`, `agents.defaults.models["provider/model"]`, or `models.providers.<provider>.models[]`), then `agents.entries.*` / `agents.defaults.models["provider/*"]`, then provider-wide policy at `models.providers.<provider>.agentRuntime`.
- Whole-agent runtime keys are legacy. `agents.defaults.agentRuntime`, `agents.entries.*.agentRuntime`, session runtime pins, and `OPENCLAW_AGENT_RUNTIME` are ignored by runtime selection. Run `openclaw doctor --fix` to remove stale values.
- Eligible exact official HTTPS OpenAI Responses/ChatGPT routes with no authored request override may use the Codex harness implicitly. Provider/model `agentRuntime.id: "codex"` makes Codex a fail-closed requirement but does not make an incompatible route compatible.
- For Claude CLI deployments, prefer `model: "anthropic/claude-opus-5"` plus model-scoped `agentRuntime.id: "claude-cli"`. Legacy `claude-cli/<model>` refs still work for compatibility, but new config should keep provider/model selection canonical and put the execution backend in provider/model runtime policy.
- This only controls text agent-turn execution. Media generation, vision, PDF, music, video, and TTS still use their provider/model settings.

**内置别名快捷方式**（仅在模型位于 `agents.defaults.models` 中时适用）：

| 别名                | 模型                            |
| ------------------- | ------------------------------- |
| `opus`              | `anthropic/claude-opus-5`       |
| `sonnet`            | `anthropic/claude-sonnet-5`     |
| `gpt`               | `openai/gpt-5.4`                |
| `gpt-mini`          | `openai/gpt-5.4-mini`           |
| `gpt-nano`          | `openai/gpt-5.4-nano`           |
| `gemini`            | `google/gemini-3.1-pro-preview` |
| `gemini-flash`      | `google/gemini-3-flash-preview` |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite`  |

你配置的别名始终优先于默认值。

Z.AI GLM-4.x 模型会自动启用 thinking 模式，除非你设置 `--thinking off`，或者自行定义 `agents.defaults.models["zai/<model>"].params.thinking`。
Z.AI 模型默认会为工具调用流式传输启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设为 `false` 可将其禁用。
Anthropic Claude Opus 4.8 在 OpenClaw 中默认关闭 thinking；当显式启用自适应 thinking 时，Anthropic 的 provider 自有 effort 默认值为 `high`。Claude 4.6 模型在未设置明确 thinking 级别时默认使用 `adaptive`。

### CLI backend selection

CLI adapter mechanics are registered by plugins, not configured under agent
defaults. Select a registered CLI backend with model-scoped `agentRuntime.id`,
as shown above. See [CLI backends](/gateway/cli-backends) for operations and
[building CLI backend plugins](/plugins/cli-backend-plugins) for command,
session, image, and parser registration.

### `agents.defaults.promptOverlays`

按模型家族应用于 OpenClaw 组装的提示表面的、与提供方无关的提示覆盖层。GPT-5 系列模型 id 会通过 OpenClaw/提供方路由接收共享的行为契约；`personality` 只控制友好的交互风格层。原生 Codex 应用服务器路由会保留 Codex 拥有的基础/模型指令，而不是这个 OpenClaw GPT-5 覆盖层，并且 OpenClaw 会为原生线程禁用 Codex 内置的 personality。

```json5
{
  agents: {
    defaults: {
      promptOverlays: {
        gpt5: {
          personality: "friendly", // 友好 | 开启 | 关闭
        },
      },
    },
  },
}
```

- `"friendly"`（默认）和 `"on"` 会启用友好交互风格层。
- `"off"` 只会禁用友好层；带标签的 GPT-5 行为契约仍保持启用。
- 当此共享设置未设置时，仍会读取旧的 `plugins.entries.openai.config.personality`。

### `agents.defaults.heartbeat`

定期心跳运行。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        agentId: "ops", // ambient owner when no per-agent heartbeat is configured
        every: "30m", // 0m disables
        activeHours: { start: "08:00", end: "24:00" },
        model: "openai/gpt-5.4-mini",
        session: "main",
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        directPolicy: "allow", // allow (default) | block
        to: "+15555550123",
        accountId: "ops-bot",
        prompt: "Follow the heartbeat monitor scratch context...",
        timeoutSeconds: 45,
        lightContext: false, // default: false; true skips workspace bootstrap files for heartbeat runs
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
      },
    },
  },
}
```

- `every`: duration string (ms/s/m/h). Default: `30m` (API-key auth) or `1h` (OAuth auth). Set to `0m` to disable.
- `agentId`: explicit owner for ambient heartbeat runs when no `agents.entries.*.heartbeat` block exists. A shared heartbeat block without `agentId` keeps the existing all-agent enrollment behavior.
- Cadence is written into a system-owned cron monitor row. Run `openclaw doctor --fix` to materialize a missing or stale row. If cron is disabled, scheduled heartbeats do not run and the gateway logs a startup warning.
- The heartbeat object is strict. Its supported fields are `every`, `activeHours`, `model`, `session`, `target`, `directPolicy`, `to`, `accountId`, `prompt`, `timeoutSeconds`, `lightContext`, and `isolatedSession`.
- `timeoutSeconds`: maximum time in seconds allowed for a heartbeat agent turn before it is aborted. Leave unset to use `agents.defaults.timeoutSeconds` when set, otherwise the heartbeat cadence capped at 600 seconds.
- `directPolicy`: direct/DM delivery policy. `allow` (default) permits direct-target delivery. `block` suppresses direct-target delivery and emits `reason=dm-blocked`.
- `lightContext`: when true, heartbeat runs use lightweight bootstrap context and skip workspace bootstrap files. Monitor scratch is injected by the heartbeat runner either way.
- `isolatedSession`: when true, each heartbeat runs in a fresh session with no prior conversation history. Same isolation pattern as cron `sessionTarget: "isolated"`. Reduces per-heartbeat token cost from ~100K to ~2-5K tokens.
- Busy deferral is automatic: scheduled heartbeats wait for main/cron activity, same-agent active runs, and target-session work. Immediate and manual wakes bypass only the broad same-agent active-run precheck.
- The default agent's Heartbeats system-prompt section is included automatically while its cadence is enabled. Ack suppression uses a fixed 300-character remainder budget, reasoning payloads remain internal, and tool error warnings remain enabled.
- Per-agent: set `agents.entries.*.heartbeat`. When any agent defines `heartbeat`, **only those agents** run heartbeats.
- Heartbeats run full agent turns — shorter intervals burn more tokens.

### `agents.defaults.systemAgent`

Selects the agent whose model and credentials own ambient OpenClaw system-agent and Custodian consults:

```json5
{
  agents: {
    defaults: {
      systemAgent: { agentId: "ops" },
    },
  },
}
```

Delegated consults with a requesting agent keep that requester as their owner. When `agentId` is absent, OpenClaw preserves configured-default routing.

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        enabled: false, // disable embedded proactive auto-compaction (default: true)
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // id of a registered compaction provider plugin (optional)
        thinkingLevel: "low", // optional compaction-only thinking override
        timeoutSeconds: 180,
        keepRecentTokens: 50000,
        recentTurnsPreserve: 3,
        identifierPolicy: "strict", // strict | off
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // 可选的工具循环压力检查
        postIndexSync: "async", // off | async | await
        postCompactionSections: ["Session Startup", "Red Lines"],
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        maxActiveTranscriptBytes: "20mb", // opt in to preflight local compaction
        notifyUser: true, // notices when compaction starts/completes and on memory-flush degradation (default: false)
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // 可选的仅 memory-flush 模型覆盖
          softThresholdTokens: 6000,
          forceFlushTranscriptBytes: "2mb",
        },
      },
    },
  },
}
```

- `enabled`: when `false`, disables threshold-driven auto-compaction inside the embedded agent runtime. OpenClaw's preflight and overflow-recovery compaction paths and manual `/compact` remain available. Default: `true`.
- `mode`: `default` or `safeguard` (chunked summarization for long histories). See [Compaction](/concepts/compaction).
- `provider`: id of a registered compaction provider plugin. When set, the provider's `summarize()` is called instead of built-in LLM summarization. Falls back to built-in on failure. Setting a provider forces `mode: "safeguard"`. See [Compaction](/concepts/compaction).
- `thinkingLevel`: optional thinking level used only for embedded OpenClaw compaction summaries (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive`, `max`, or `ultra`). It overrides the session's current thinking level and is clamped to the selected compaction model/runtime. Leave unset to inherit the session level. Native Codex app-server compaction ignores this setting because the native compact request has no per-operation thinking override; OpenClaw logs a warning when configured.
- `timeoutSeconds`: maximum seconds allowed for a single compaction operation before OpenClaw aborts it. Default: `180`.
- `keepRecentTokens`: agent cut-point budget for keeping the most recent transcript tail verbatim. Default: `20000`.
- `recentTurnsPreserve`: number of most recent user/assistant turns kept verbatim outside safeguard summarization. Default: `3`.
- `identifierPolicy`: `strict` (default) or `off`. `strict` prepends built-in opaque identifier retention guidance during compaction summarization.
- `qualityGuard`: retry-on-malformed-output checks for safeguard summaries. Enabled by default in safeguard mode; set `enabled: false` to skip the audit.
- `midTurnPrecheck`: optional tool-loop pressure check. When `enabled: true`, OpenClaw checks context pressure after tool results are appended and before the next model call. If the context no longer fits, it aborts the current attempt before submitting the prompt and reuses the existing precheck recovery path to truncate tool results or compact and retry. Works with both `default` and `safeguard` compaction modes. Default: disabled.
- `postIndexSync`: post-compaction session-memory reindex mode. Default: `"async"`. Use `"await"` for strongest freshness, `"async"` for lower compaction latency, or `"off"` only when session-memory sync is handled elsewhere.
- `postCompactionSections`: optional AGENTS.md H2/H3 section names to re-inject after compaction. Leave unset or use `[]` to disable.
- `model`: optional `provider/model-id` or bare alias from `agents.defaults.models` for compaction summarization only. Bare aliases resolve before dispatch; configured literal model IDs retain precedence on collisions. Use this when the main session should keep one model but compaction summaries should run on another; when unset, compaction uses the session's primary model.
- `maxActiveTranscriptBytes`: byte threshold (`number` or strings like `"20mb"`) that opts in to normal local compaction before a run when transcript history reaches the threshold. For Codex app-server sessions, the same threshold caps native rollout transcripts and oversized native threads restart fresh. Disabled when unset or `0`. When a context engine returns an explicit compacted successor identity, OpenClaw adopts it; the built-in SQLite compactor keeps the current identity.
- `notifyUser`: when `true`, sends brief context-maintenance notices to the user: when compaction starts and completes (for example, "Compacting context..." and "Compaction complete"), and when a pre-compaction memory flush is exhausted so the reply continues in a degraded state (for example, "Memory maintenance temporarily failed; continuing your reply."). Disabled by default to keep these notices silent.
- `memoryFlush`: silent agentic turn before auto-compaction to store durable memories. Set `model` to an exact provider/model such as `ollama/qwen3:8b` when this housekeeping turn should stay on a local model; the override does not inherit the active session fallback chain. `forceFlushTranscriptBytes` forces the flush when transcript size reaches the threshold even if token counters are stale. Skipped when workspace is read-only.

Custom compaction instructions are code-owned. Implement a compaction provider
plugin with `summarize()` for custom summary construction, and use
`before_prompt_build` when post-compaction context must be injected into later
model prompts. Doctor strips the retired instruction fields and points to these
seams.

### `agents.defaults.contextPruning`

在将内容发送给 LLM 之前，会从内存上下文中清理**旧的工具结果**。不会修改磁盘上的会话历史。默认禁用；设置 `mode: "cache-ttl"` 即可启用。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off (default) | cache-ttl
      },
    },
  },
}
```

<Accordion title="cache-ttl 模式行为">

- `mode: "cache-ttl"` enables pruning passes.
- Pruning soft-trims oversized tool results first, then hard-clears older tool results if needed.

**软裁剪**会保留开头 + 结尾，并在中间插入 `...`。

**硬清除**会用占位符替换整个工具结果。

注意：

- Image blocks are never trimmed/cleared.
- Ratios are character-based (approximate), not exact token counts.
- The most recent assistant messages are preserved.

</Accordion>

行为细节请参见 [会话清理](/concepts/session-pruning)。

### 块流式输出

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // 开启 | 关闭
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200, breakPreference: "paragraph" },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // 关闭（默认） | 自然 | 自定义（使用 minMs/maxMs）
    },
  },
}
```

- Non-Telegram channels require explicit `*.streaming.block.enabled: true` to enable block replies. QQ Bot is the exception: it has no `streaming.block` keys and streams block replies unless `channels.qqbot.streaming.mode` is `"off"`.
- Channel overrides: `channels.<channel>.streaming.block.coalesce` (and per-account variants). Discord, Google Chat, Mattermost, MS Teams, Signal, and Slack default `minChars: 1500` / `idleMs: 1000`.
- `blockStreamingChunk.breakPreference`: preferred chunk boundary (`"paragraph" | "newline" | "sentence"`).
- `humanDelay`: randomized pause between block replies. Default: `off`. `natural` = 800-2500ms. `custom` uses `minMs`/`maxMs` (falls back to the natural range for any unset bound). Per-agent override: `agents.entries.*.humanDelay`.

行为和分块细节请参见 [流式输出](/concepts/streaming)。

### 输入指示器

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // 从不 | 立即 | 思考 | 消息
      typingIntervalSeconds: 6,
    },
  },
}
```

- Defaults: `instant` for direct chats/mentions, `message` for unmentioned group chats.
- `typingIntervalSeconds` default: `6`.
- Per-agent override: `agents.entries.*.typingMode`.

参见 [输入指示器](/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可选沙箱。完整指南请参见 [沙箱](/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // 关闭（默认） | non-main | all
        backend: "docker", // docker（默认） | ssh | openshell
        scope: "agent", // session | agent（默认） | shared
        workspaceAccess: "none", // none（默认） | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          gpus: "all",
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // 也支持 SecretRef / 内联内容：
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          noVncEnabled: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "apply_patch",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

上面显示的默认值（`off`/`docker`/`agent`/`none`/`bookworm-slim` 镜像/`none` 网络等）是实际的 OpenClaw 默认值，而不仅仅是示意值。

<Accordion title="沙箱详情">

**后端：**

- `docker`：本地 Docker 运行时（默认）
- `ssh`：通用的基于 SSH 的远程运行时
- `openshell`：OpenShell 运行时

当选择 `backend: "openshell"` 时，运行时相关设置会移动到 `plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`: 形如 `user@host[:port]` 的 SSH 目标
- `command`: SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`: 用于每个作用域工作区的绝对远程根目录（默认：`/tmp/openclaw-sandboxes`）
- `identityFile` / `certificateFile` / `knownHostsFile`: 传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`: 内联内容或 SecretRef，OpenClaw 会在运行时将其物化为临时文件
- `strictHostKeyChecking` / `updateHostKeys`: OpenSSH 主机密钥策略选项（两者默认均为 `true`）

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- 基于 SecretRef 的 `*Data` 值会在沙箱会话开始前从活动 secrets 运行时快照中解析

**SSH 后端行为：**

- 在创建或重新创建后会先播种一次远程工作区
- 然后保持远程 SSH 工作区为规范来源
- 通过 SSH 路由 `exec`、文件工具和媒体路径
- 不会自动把远程更改同步回宿主机
- 不支持沙箱浏览器容器

**工作区访问：**

- `none`: 每个作用域的沙箱工作区位于 `~/.openclaw/sandboxes` 下（默认）
- `ro`: 沙箱工作区位于 `/workspace`，代理工作区以只读方式挂载到 `/agent`
- `rw`: 代理工作区以读写方式挂载到 `/workspace`

**作用域：**

- `session`：每会话一个容器 + 工作区
- `agent`：每个代理一个容器 + 工作区（默认）
- `shared`：共享容器和工作区（无跨会话隔离）

**OpenShell 插件配置：**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror（默认） | remote
          command: "openshell",
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // 可选
          gatewayEndpoint: "https://lab.example", // 可选
          policy: "strict", // 可选 OpenShell policy id
          providers: ["openai"], // 可选
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**OpenShell 模式：**

- `mirror`：执行前从本地播种到远程，执行后同步回本地；本地工作区保持为规范来源
- `remote`：在沙箱创建时只播种一次远程，然后保持远程工作区为规范来源

在 `remote` 模式下，在 OpenClaw 之外进行的宿主机本地编辑不会在播种步骤后自动同步进沙箱。
传输层是通过 SSH 连接 OpenShell 沙箱，但插件负责沙箱生命周期和可选的镜像同步。

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`）。需要网络外联、可写 root、root 用户。

**容器默认使用 `network: "none"`** — 如果代理需要出站访问，请将其设置为 `"bridge"`（或自定义 bridge 网络）。
`"host"` 被阻止。`"container:<id>"` 默认也被阻止，除非你显式设置
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（紧急破例）。
在启用了 OpenClaw 沙箱的 Codex app-server 回合中，它们的原生代码模式网络访问也会使用相同的出站设置。

**入站附件** 会被暂存到当前工作区中的 `media/inbound/*`。

**`docker.binds`** 会挂载额外的宿主目录；全局和逐代理的 binds 会合并。

**Sandboxed browser** (`sandbox.browser.enabled`, default `false`): Chromium + CDP in a container. Does not require `browser.enabled` in `openclaw.json`.
noVNC observer access is password-protected and brokered through a one-time, authenticated bootstrap URL. The observer URL is deliberately omitted from model-visible system prompt context.

- `allowHostControl: false` (default) blocks sandboxed sessions from targeting the host browser.
- `network` defaults to `openclaw-sandbox-browser` (dedicated bridge network). Set to `bridge` only when you explicitly want global bridge connectivity. `"none"` is unsupported because CDP ports must be published to the host; `"host"` is blocked too. On upgrade, `openclaw doctor --fix` disables sidecars affected by a persisted `"none"` value and restores the dedicated network without silently enabling egress.
- `cdpSourceRange` optionally restricts CDP ingress at the container edge to a CIDR range (for example `172.21.0.1/32`).
- `sandbox.browser.binds` mounts additional host directories into the sandbox browser container only. When set (including `[]`), it replaces `docker.binds` for the browser container.
- The sandbox browser container's Chromium always launches with `--no-sandbox --disable-setuid-sandbox` (containers do not have the kernel primitives Chrome's own sandbox needs); there is no config toggle for this.
- Launch defaults are defined in `scripts/sandbox-browser-entrypoint.sh` and tuned for container hosts:
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--no-zygote`
  - `--metrics-recording-only`
  - `--password-store=basic`
  - `--use-mock-keychain`
  - `--disable-3d-apis`、`--disable-gpu` 和 `--disable-software-rasterizer` 默认启用；如果 WebGL/3D 使用需要，可通过 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用它们。
  - `--disable-extensions`（默认启用）；如果你的工作流依赖扩展，可通过 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 重新启用扩展。
  - `--renderer-process-limit=2` 默认启用；可通过 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 更改，设为 `0` 可使用 Chromium 的默认进程限制。
  - 仅当启用 `headless` 时才使用 `--headless=new`。
  - 默认值为容器镜像基线；如需更改容器默认值，请使用带自定义入口点的自定义浏览器镜像。

</Accordion>

浏览器沙箱和 `sandbox.docker.binds` 仅适用于 Docker。

构建镜像（从源码检出构建）：

```bash
scripts/sandbox-setup.sh           # 主沙箱镜像
scripts/sandbox-browser-setup.sh   # 可选的浏览器镜像
```

关于无源码检出的 npm 安装，请参见 [Sandboxing § Images and setup](/gateway/sandboxing#images-and-setup) 中的内联 `docker build` 命令。

### `agents.entries` (per-agent overrides)

Use `agents.entries.*.tts` to give an agent its own TTS provider, voice, model,
style, or auto-TTS mode. The agent block deep-merges over global
`tts`, so shared credentials can stay in one place while individual
agents override only the voice or provider fields they need. The active agent's
override applies to automatic spoken replies, `/tts audio`, `/tts status`, and
the `tts` agent tool. See [Text-to-speech](/tools/tts#per-agent-voice-overrides)
for provider examples and precedence.

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "主代理",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // 或 { primary, fallbacks }
        utilityModel: "openai/gpt-5.4-mini",
        thinkingDefault: "high", // 每个代理的 thinking 级别覆盖
        reasoningDefault: "on", // 每个代理的 reasoning 可见性覆盖
        fastModeDefault: false, // 每个代理的快速模式覆盖
        params: { cacheRetention: "none" }, // 按键覆盖 agents.defaults.models 中匹配的默认项 params
        tts: {
          providers: {
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
        skills: ["docs-search"], // 设置后替换 agents.defaults.skills
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent", // persistent | oneshot
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    ],
  },
}
```

- `id`: stable agent id (required).
- `default`: when multiple are set, first wins (warning logged). If none set, first list entry is default.
- `model`: string form sets a strict per-agent primary with no model fallback; object form `{ primary }` is also strict unless you add `fallbacks`. Use `{ primary, fallbacks: [...] }` to opt that agent into fallback, or `{ primary, fallbacks: [] }` to make strict behavior explicit. Cron jobs that only override `primary` still inherit default fallbacks unless you set `fallbacks: []`.
- `utilityModel`: optional per-agent override for short internal tasks such as generated session and thread titles. Falls back to `agents.defaults.utilityModel`, then the effective session provider's declared small-model default. Dashboard titles retry once with the effective regular session model. An empty string skips the alternate utility route for this agent without disabling dashboard title generation.
- `params`: per-agent stream params merged over the selected model entry in `agents.defaults.models`. Use this for agent-specific overrides like `cacheRetention`, `temperature`, or `maxTokens` without duplicating the whole model catalog.
- `tts`: optional per-agent text-to-speech overrides. The block deep-merges over `tts`, so keep shared provider credentials and fallback policy in `tts` and set only persona-specific values such as provider, voice, model, style, or auto mode here.
- `skills`: optional per-agent skill allowlist. If omitted, the agent inherits `agents.defaults.skills` when set; an explicit list replaces defaults instead of merging, and `[]` means no skills.
- `thinkingDefault`: optional per-agent default thinking level (`off | minimal | low | medium | high | xhigh | adaptive | max`). Overrides `agents.defaults.thinkingDefault` for this agent when no per-message or session override is set. The selected provider/model profile controls which values are valid; for Google Gemini, `adaptive` keeps provider-owned dynamic thinking (`thinkingLevel` omitted on Gemini 3/3.1, `thinkingBudget: -1` on Gemini 2.5).
- `reasoningDefault`: optional per-agent default reasoning visibility (`on | off | stream`). Overrides `agents.defaults.reasoningDefault` for this agent when no per-message or session reasoning override is set.
- `fastModeDefault`: optional per-agent default for fast mode (`"auto" | true | false`). Applies when no per-message or session fast-mode override is set.
- `models`: optional per-agent model catalog/runtime overrides keyed by full `provider/model` ids. Use `models["provider/model"].agentRuntime` for per-agent runtime exceptions.
- `runtime`: optional per-agent runtime descriptor. Use `type: "acp"` with `runtime.acp` defaults (`agent`, `backend`, `mode`, `cwd`) when the agent should default to ACP harness sessions.
- `identity.avatar`: workspace-relative path, `http(s)` URL, or `data:` URI.
- Local workspace-relative `identity.avatar` image files are limited to 2 MB. `http(s)` URLs and `data:` URIs are not checked against the local file-size limit.
- `identity` derives defaults: `ackReaction` from `emoji`, `mentionPatterns` from `name`/`emoji`.
- `subagents.allowAgents`: allowlist of configured agent ids for explicit `sessions_spawn.agentId` targets (`["*"]` = any configured target; default: same agent only). Include the requester id when self-targeted `agentId` calls should be allowed. Stale entries whose agent config was deleted are rejected by `sessions_spawn` and omitted from `agents_list`; run `openclaw doctor --fix` to clean them up, or add a minimal `agents.entries.*` entry if that target should remain spawnable while inheriting defaults.
- Sandbox inheritance guard: if the requester session is sandboxed, `sessions_spawn` rejects targets that would run unsandboxed.
- `subagents.requireAgentId`: when true, block `sessions_spawn` calls that omit `agentId` (forces explicit profile selection; default: false).
- `subagents.maxConcurrent`: max concurrent child-agent runs across subagent execution. Default: `8`.
- `subagents.maxChildrenPerAgent`: max active children a single agent session can spawn. Default: `5`.
- `subagents.maxSpawnDepth`: max nesting depth for sub-agent spawning (`1`-`5`). Default: `1` (no nesting).
- `subagents.archiveAfterMinutes`: age before completed subagent state is archived. Default: `60`.

## 多代理路由

在一个 Gateway 中运行多个彼此隔离的代理。参见 [Multi-Agent](/concepts/multi-agent)。

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### 绑定匹配字段

- `type`（可选）：正常路由使用 `route`（缺省时默认为 route），持久化 ACP 会话绑定使用 `acp`。
- `match.channel`（必需）
- `match.accountId`（可选；`*` = 任意账户；省略 = 默认账户）
- `match.peer`（可选；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；按渠道不同）
- `acp`（可选；仅适用于 `type: "acp"`）：`{ mode, label, cwd, backend }`

**确定性的匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确匹配，不含 peer/guild/team）
5. `match.accountId: "*"`（覆盖整个渠道）
6. 默认代理

在每个层级内，最先匹配的 `bindings` 条目获胜。

对于 `type: "acp"` 的条目，OpenClaw 会按精确会话身份（`match.channel` + account + `match.peer.id`）解析，不使用上面的路由绑定层级顺序。

### 每个代理的访问配置

<Accordion title="完全访问（无沙箱）">

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="只读工具 + 工作区">

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: [
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="无文件系统访问（仅消息功能）">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
            "gateway",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

</Accordion>

有关优先级的详细信息，请参见 [Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools)。

---

## 会话

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // 主 | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // 每日 | 空闲
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 30 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    maintenance: {
      mode: "enforce", // enforce (default) | warn
      pruneAfter: "30d",
      maxEntries: 500,
      resetArchiveRetention: "30d", // 持续时间或 false
      maxDiskBytes: "500mb", // 可选的硬性预算
      highWaterBytes: "400mb", // 可选的清理目标
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // 默认空闲自动取消聚焦（小时）（`0` 禁用）
      maxAgeHours: 0, // 默认硬性最大时长（小时）（`0` 禁用）
    },
    sharing: {
      readOnly: true,
      suggest: true,
      drafts: true,
    },
    mainKey: "main", // legacy (runtime always uses "main")
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

<Accordion title="会话字段详情">

- **`scope`**: base session grouping strategy for group-chat contexts.
  - `per-sender` (default): each sender gets an isolated session within a channel context.
  - `global`: all participants in a channel context share a single session (use only when shared context is intended).
- **`dmScope`**: how DMs are grouped.
  - `main`: all DMs share the main session.
  - `per-peer`: isolate by sender id across channels.
  - `per-channel-peer`: isolate per channel + sender (recommended for multi-user inboxes).
  - `per-account-channel-peer`: isolate per account + channel + sender (recommended for multi-account).
- **`identityLinks`**: map canonical ids to provider-prefixed peers for cross-channel session sharing. Dock commands such as `/dock_discord` use the same map to switch the active session's reply route to another linked channel peer; see [Channel docking](/concepts/channel-docking).
- **`reset`**: primary reset policy. `none` disables automatic reset and is the default; compaction bounds active context instead. `daily` resets at `atHour` local time; `idle` resets after `idleMinutes`. When both configured, whichever expires first wins. `/new` and `/reset` remain available in every mode. Daily reset freshness uses the session row's `sessionStartedAt`; idle reset freshness uses `lastInteractionAt`. Background/system-event writes such as heartbeat, cron wakeups, exec notifications, and gateway bookkeeping can update `updatedAt`, but they do not keep daily/idle sessions fresh.
  - **`resetByType`**: per-type overrides (`direct`, `group`, `thread`). Doctor migrates legacy `dm` entries to `direct`; the schema rejects `dm`.
- **`resetByChannel`**: per-channel reset overrides keyed by provider/channel id. When the session's channel has a matching entry, it wins outright over `resetByType`/`reset` for that session. Use only when one channel needs reset behavior different from the type-level policy.
- **`mainKey`**: legacy field. Runtime always uses `"main"` for the main direct-chat bucket.
- **`sendPolicy`**: match by `channel`, `chatType` (`direct|group|channel`, with legacy `dm` alias), `keyPrefix`, or `rawKeyPrefix`. First deny wins.
- **`maintenance`**: session-store cleanup + retention controls.
  - `mode`: `enforce` applies cleanup and is the default; `warn` emits warnings only.
  - `pruneAfter`: age cutoff for stale entries (default `30d`).
  - `maxEntries`: maximum number of SQLite session entries (default `500`). Runtime writes batch cleanup with a small high-water buffer for production-sized caps; `openclaw sessions cleanup --enforce` applies the cap immediately.
  - Short-lived gateway model-run probe sessions use fixed `24h` retention, but cleanup is pressure-gated: it only removes stale strict model-run probe rows when session-entry maintenance/cap pressure is reached. Only strict explicit probe keys matching `agent:*:explicit:model-run-<uuid>` are eligible; normal direct, group, thread, cron, hook, heartbeat, ACP, and sub-agent sessions do not inherit this 24h retention. When model-run cleanup runs, it runs before the broader `pruneAfter` stale-entry cleanup and `maxEntries` cap.
  - Legacy `rotateBytes` is rejected by the current schema; `openclaw doctor --fix` removes it from older configs.
  - `resetArchiveRetention`: age-based retention for reset/deleted transcript archives. By default, archives remain until disk-budget eviction; set a duration to opt into wall-clock deletion, or `false` to disable it explicitly.
  - `maxDiskBytes`: optional sessions-directory disk budget. In `warn` mode it logs warnings; in `enforce` mode it removes oldest artifacts/sessions first.
  - `highWaterBytes`: optional target after budget cleanup. Defaults to `80%` of `maxDiskBytes`.
- **`threadBindings`**: global defaults for thread-bound session features.
  - `enabled`: master switch for supported channel thread bindings
  - `idleHours`: default inactivity auto-unfocus in hours (`0` disables; providers can override)
  - `maxAgeHours`: default hard max age in hours (`0` disables; providers can override)
  - `spawnSessions`: default gate for creating thread-bound work sessions from `sessions_spawn` and ACP thread spawns. Defaults to `true` when thread bindings are enabled; providers/accounts can override.
  - `defaultSpawnContext`: default native subagent context for thread-bound spawns (`"fork"` or `"isolated"`). Defaults to `"fork"`.
- **`sharing`**: controls which per-session collaboration modes owners and `operator.admin` connections may select. Every flag defaults to `true`; setting one to `false` removes that choice from the Control UI and makes create-time visibility or `session.visibility.set` reject it. New sessions start `shared` unless the Control UI starts one as a draft.
  - `readOnly`: allow `read-only`, where non-members can watch but cannot send, steer, abort, approve, or mutate session state.
  - `suggest`: allow `suggest`. In this phase it enforces the same admission behavior as `read-only`; the suggestion queue is a later feature.
  - `drafts`: allow `draft`, which hides the session from non-admin, non-owner session lists and event broadcasts.

Membership and visibility changes are written into the session transcript as system notes. These controls coordinate operators sharing one agent; they are not a security boundary between tenants. Use separate Gateways or agents when work requires isolation.

</Accordion>

---

## 消息

```json5
{
  messages: {
    responsePrefix: "🦞", // 或 "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all | off | none
    queue: {
      mode: "steer", // steer (默认) | followup | collect | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize (默认)
      byChannel: {
        whatsapp: "followup",
        telegram: "followup",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 禁用
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### 回复前缀

按频道/账户覆盖：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析顺序（越具体优先级越高）：账户 → 频道 → 全局。`""` 表示禁用并停止级联。`"auto"` 会派生为 `[{identity.name}]`。

**模板变量：**

| 变量              | 说明           | 示例                         |
| ----------------- | -------------- | ---------------------------- |
| `{model}`         | 简短模型名      | `claude-opus-4-6`            |
| `{modelFull}`     | 完整模型标识    | `anthropic/claude-opus-4-6`  |
| `{provider}`      | 提供方名称      | `anthropic`                  |
| `{thinkingLevel}` | 当前思考级别    | `high`、`low`、`off`         |
| `{identity.name}` | 代理身份名称    | （与 `"auto"` 相同）         |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- Defaults to active agent's `identity.emoji`, otherwise `"👀"`. Set `""` to disable.
- Per-channel overrides: `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Resolution order: account → channel → `messages.ackReaction` → identity fallback.
- Scope: `group-mentions` (default), `group-all`, `direct`, `all`, or `off`/`none` (disables ack reactions entirely).
- `messages.statusReactions.enabled`: enables lifecycle status reactions on Slack, Discord, Signal, Telegram, and WhatsApp.
  On Discord, unset keeps status reactions enabled when ack reactions are active.
  On Slack, Signal, Telegram, and WhatsApp, set it explicitly to `true` to enable lifecycle status reactions.
  Slack uses its native assistant thread status and rotating loading messages for progress by default, while keeping the configured ack reaction static.

### 队列

- `mode`：当会话运行处于活动状态时，对到达的传入消息采用的队列策略。默认：`"steer"`。
  - `steer`：将新提示注入到当前运行中。
  - `followup`：在当前运行结束后运行新提示。
  - `collect`：将兼容消息批量收集，稍后一起运行。
  - `interrupt`：在开始最新提示前中止当前运行。
- `debounceMs`：分发排队/导向消息前的延迟。默认：`500`。
- `cap`：应用丢弃策略前允许的最大排队消息数。默认：`20`。
- `drop`：超过上限时的策略。`"summarize"`（默认）会丢弃最旧条目但保留简要摘要；`"old"` 会直接丢弃最旧条目而不保留摘要；`"new"` 会拒绝最新条目。
- `byChannel`：按提供方 ID 键控的每频道 `mode` 覆盖。
- `debounceMsByChannel`：按提供方 ID 键控的每频道 `debounceMs` 覆盖。

### 传入去抖

将来自同一发送者的快速纯文本消息批量合并为一次代理轮次。媒体/附件会立即刷新发送。控制命令不受去抖影响。默认 `debounceMs`：`2000`。

### 其他消息键

- `channels.whatsapp.responsePrefix`: outbound WhatsApp reply prefix. Doctor moves the retired inbound `messagePrefix` value here only when this canonical value is unset.
- `messages.visibleReplies`: controls visible source replies across direct, group, and channel conversations (`"message_tool"` requires `message(action=send)` for visible output; `"automatic"` posts normal replies as before).
- `messages.usageTemplate` / `messages.responseUsage`: custom `/usage` footer template and default per-reply usage mode (`off | tokens | full`, plus legacy `on` alias for `tokens`).
- `messages.groupChat.mentionPatterns` / `historyLimit`: group-message mention triggers and history window sizing.
- `messages.suppressToolErrors`: when `true`, suppresses `⚠️` tool-error warnings shown to the user (the agent still sees errors in context and can retry). Default: `false`.

### TTS（文本转语音）

```json5
{
  tts: {
    auto: "off", // off (default) | always | inbound | tagged
    mode: "final", // final | all
    provider: "elevenlabs",
    summaryModel: "openai/gpt-5.4-mini",
    modelOverrides: { enabled: true },
    maxTextLength: 4000,
    timeoutMs: 30000,
    providers: {
      elevenlabs: {
        apiKey: "example-elevenlabs-api-key",
        baseUrl: "https://api.elevenlabs.io",
        speakerVoiceId: "voice_id",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "en",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0,
        },
      },
      microsoft: {
        speakerVoice: "en-US-MichelleNeural",
        lang: "en-US",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      },
      openai: {
        apiKey: "example-openai-api-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        speakerVoice: "coral",
      },
    },
  },
}
```

The global preferences path is machine state (default
`~/.openclaw/settings/tts.json`; override with `OPENCLAW_TTS_PREFS`). Advanced
multi-agent setups can set `agents.entries.<id>.tts.prefsPath` for distinct
per-agent preference stores.

- `auto` controls the default auto-TTS mode: `off`, `always`, `inbound`, or `tagged`. `/tts on|off` can override local prefs, and `/tts status` shows the effective state.
- `summaryModel` overrides `agents.defaults.model.primary` for auto-summary.
- `modelOverrides` is enabled by default (`enabled !== false`); `modelOverrides.allowProvider` is opt-in.
- API keys fall back to `ELEVENLABS_API_KEY`/`XI_API_KEY` and `OPENAI_API_KEY`.
- Bundled speech providers are plugin-owned. If `plugins.allow` is set, include each TTS provider plugin you want to use, for example `microsoft` for Edge TTS. The legacy `edge` provider id is accepted as an alias for `microsoft`.
- `providers.openai.baseUrl` overrides the OpenAI TTS endpoint. Resolution order is config, then `OPENAI_TTS_BASE_URL`, then `https://api.openai.com/v1`.
- When `providers.openai.baseUrl` points to a non-OpenAI endpoint, OpenClaw treats it as an OpenAI-compatible TTS server and relaxes model/voice validation.

---

## Talk

Talk 模式的默认值（macOS/iOS/Android 和浏览器 Control UI）。

```json5
{
  talk: {
    agentId: "ops",
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        speakerVoiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    consultThinkingLevel: "low",
    consultFastMode: true,
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
        },
      },
      instructions: "温和地说话，并保持回答简短。",
      mode: "realtime", // realtime | stt-tts | transcription
      transport: "webrtc", // webrtc | provider-websocket | gateway-relay | managed-room
      vadThreshold: 0.5,
      silenceDurationMs: 500,
      prefixPaddingMs: 300,
      reasoningEffort: "medium",
      brain: "agent-consult", // agent-consult | direct-tools | none
    },
  },
}
```

- `talk.provider` must match a key in `talk.providers` when multiple Talk providers are configured.
- `talk.agentId` owns Talk sessions created without an explicit agent-scoped session key. Session-scoped Talk calls continue to use the agent encoded in that key. Doctor may create a minimal `talk` block containing only this owner for an existing multi-agent config.
- Legacy flat Talk keys (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) are compatibility-only. Run `openclaw doctor --fix` to rewrite persisted config into `talk.providers.<provider>`.
- Voice IDs fall back to `ELEVENLABS_VOICE_ID` or `SAG_VOICE_ID` (macOS Talk client behavior).
- `providers.*.apiKey` accepts plaintext strings or SecretRef objects.
- `ELEVENLABS_API_KEY` fallback applies only when no Talk API key is configured.
- `providers.*.voiceAliases` lets Talk directives use friendly names.
- `providers.mlx.modelId` selects the Hugging Face repo used by the macOS local MLX helper. If omitted, macOS uses `mlx-community/Soprano-80M-bf16`.
- macOS MLX playback runs through the bundled `openclaw-mlx-tts` helper when present, or an executable on `PATH`; `OPENCLAW_MLX_TTS_BIN` overrides the helper path for development.
- `consultThinkingLevel` controls the thinking level for the full OpenClaw agent run behind Control UI Talk realtime `openclaw_agent_consult` calls. Leave unset to preserve normal session/model behavior.
- `consultFastMode` sets a one-shot fast-mode override for Control UI Talk realtime consults without changing the session's normal fast-mode setting.
- `speechLocale` sets the BCP 47 locale id used by Android, iOS, and macOS Talk speech recognition and by the iOS system-voice fallback. Android also uses its language component to guide realtime input transcription. Leave unset to use the device default.
- `silenceTimeoutMs` controls how long Talk mode waits after user silence before it sends the transcript. Unset keeps the platform default pause window (`700 ms on macOS and Android, 900 ms on iOS`).
- `realtime.instructions` appends provider-facing system instructions to OpenClaw's built-in realtime prompt, so voice style can be configured without losing default `openclaw_agent_consult` guidance.
- `realtime.vadThreshold` sets the provider voice-activity threshold from `0` (most sensitive) to `1` (least sensitive). Unset keeps the provider default.
- `realtime.silenceDurationMs` sets the positive whole-number silence window before the provider commits a realtime user turn. Unset keeps the provider default.
- `realtime.prefixPaddingMs` sets the non-negative whole-number amount of audio retained before detected speech begins. Unset keeps the provider default.
- `realtime.reasoningEffort` sets the provider-specific reasoning level for realtime sessions. Unset keeps the provider default.
- `realtime.consultRouting`: `"provider-direct"` (default) preserves direct provider replies when the realtime provider produces a final user transcript without `openclaw_agent_consult`. `"force-agent-consult"` routes the finalized request through OpenClaw instead.

## 相关

- [配置参考](/gateway/configuration-reference) — 其他所有配置键
- [配置](/gateway/configuration) — 常见任务和快速设置
- [配置示例](/gateway/configuration-examples)
