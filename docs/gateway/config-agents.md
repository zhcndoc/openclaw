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

默认值：设置了 `OPENCLAW_WORKSPACE_DIR` 时使用该值，否则使用 `~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

显式设置的 `agents.defaults.workspace` 值优先于
`OPENCLAW_WORKSPACE_DIR`。当你不想把该路径写入配置时，可使用环境变量将默认代理指向已挂载的工作区。

### `agents.defaults.repoRoot`

可选的仓库根目录，会显示在系统提示词的 Runtime 行中。若未设置，OpenClaw 会从工作区向上遍历自动检测。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

可选的默认技能白名单，适用于未设置 `agents.list[].skills` 的代理。

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

- 默认情况下省略 `agents.defaults.skills`，则不限制技能。
- 省略 `agents.list[].skills` 可继承默认值。
- 将 `agents.list[].skills` 设为 `[]` 表示没有技能。
- 非空的 `agents.list[].skills` 列表就是该代理的最终技能集合；它不会与默认值合并。

### `agents.defaults.skipBootstrap`

禁用自动创建工作区引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

在仍会写入必需引导文件的同时，跳过创建选定的可选工作区文件。有效值：`SOUL.md`、`USER.md`、`HEARTBEAT.md` 和 `IDENTITY.md`。

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

逐代理覆盖：`agents.list[].contextInjection`。省略的值会继承
`agents.defaults.contextInjection`。

### `agents.defaults.bootstrapMaxChars`

Max characters per workspace bootstrap file before truncation. Default: `20000`.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

逐代理覆盖：`agents.list[].bootstrapMaxChars`。省略的值会继承
`agents.defaults.bootstrapMaxChars`。

### `agents.defaults.bootstrapTotalMaxChars`

跨所有工作区引导文件注入的最大总字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

逐代理覆盖：`agents.list[].bootstrapTotalMaxChars`。省略的值会
继承 `agents.defaults.bootstrapTotalMaxChars`。

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

控制当引导上下文被截断时，代理可见的系统提示词通知。
默认值：`"always"`。

- `"off"`：从不向系统提示词注入截断通知文本。
- `"once"`：针对每个唯一的截断特征注入一次简洁通知。
- `"always"`：只要存在截断，就在每次运行时注入简洁通知（推荐）。

更详细的原始/注入计数和配置调优字段会保留在诊断信息中，例如上下文/状态报告和日志；常规 WebChat 用户/运行时上下文只会获得简洁的恢复通知。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "always" } }, // off | once | always
}
```

### 上下文预算所有权映射

OpenClaw 具有多个高容量的提示词/上下文预算，它们被有意按子系统拆分，而不是全部通过一个通用开关流转。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`：
  正常的工作区引导注入。
- `agents.defaults.startupContext.*`：
  一次性的重置/启动模型运行前奏，包括最近的每日 `memory/*.md` 文件。裸聊天 `/new` 和 `/reset` 命令会被确认，但不会调用模型。
- `skills.limits.*`：
  注入系统提示词中的紧凑技能列表。
- `agents.defaults.contextLimits.*`：
  有边界的运行时摘录和注入的运行时拥有块。
- `memory.qmd.limits.*`：
  索引化的记忆搜索片段和注入大小。

仅当某个代理需要不同预算时，才使用对应的逐代理覆盖：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextInjection`
- `agents.list[].bootstrapMaxChars`
- `agents.list[].bootstrapTotalMaxChars`
- `agents.list[].contextLimits.*`

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
        memoryGetDefaultLines: 120,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`：`memory_get` 摘录截断前的默认上限，之后会添加元数据和续接通知。
- `memoryGetDefaultLines`：省略 `lines` 时 `memory_get` 的默认行窗口。
- `toolResultMaxChars`：用于持久化结果和溢出恢复的高级实时工具结果上限。若不设置，则使用模型上下文自动上限：低于 100K tokens 时为 `16000` 字符，100K+ tokens 时为 `32000` 字符，200K+ tokens 时为 `64000` 字符。有效上限仍限制在模型上下文窗口的大约 30% 以内。`openclaw doctor --deep` 会打印有效上限，而 doctor 只会在显式覆盖已过期或不生效时发出警告。
- `postCompactionMaxChars`：用于压缩后刷新注入的 AGENTS.md 摘录上限。

#### `agents.list[].contextLimits`

针对共享 `contextLimits` 开关的逐代理覆盖。省略的字段会继承自 `agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000, // 该代理的高级上限
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
  skills: {
    limits: {
      maxSkillsPromptChars: 18000,
    },
  },
}
```

#### `agents.list[].skillsLimits.maxSkillsPromptChars`

针对技能提示词预算的逐代理覆盖。

```json5
{
  agents: {
    list: [
      {
        id: "tiny-local",
        skillsLimits: {
          maxSkillsPromptChars: 6000,
        },
      },
    ],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

传递给提供方调用前，转录/工具图像块中最长边的最大像素尺寸。默认值：`1200`。

更低的值通常能减少视觉 token 用量，以及对截图密集型运行的请求载荷大小。
更高的值会保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.imageQuality`

从文件路径、URL 和媒体引用加载的图片的图像工具压缩/细节偏好。
默认值：`auto`。

OpenClaw adapts the resize ladder to the selected image model. For example, Claude Opus 4.8, OpenAI GPT-5.5, Qwen VL, and hosted Llama 4 vision models can use larger images than older/default high-detail vision paths, while multi-image turns are compressed more aggressively in `auto` mode to control token and latency cost.

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

系统提示词中的时间格式。默认值：`auto`（操作系统偏好）。

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
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
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-i2v"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // 全局默认提供方参数
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      toolProgressDetail: "explain",
      reasoningDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - String form sets only the primary model.
  - Object form sets primary plus ordered failover models.
- `imageModel`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the `image` tool path as its vision-model config.
  - Also used as fallback routing when the selected/default model cannot accept image input.
  - Prefer explicit `provider/model` refs. Bare IDs are accepted for compatibility; if a bare ID uniquely matches a configured image-capable entry in `models.providers.*.models`, OpenClaw qualifies it to that provider. Ambiguous configured matches require an explicit provider prefix.
- `imageGenerationModel`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the shared image-generation capability and any future tool/plugin surface that generates images.
  - Typical values: `google/gemini-3.1-flash-image-preview` for native Gemini image generation, `fal/fal-ai/flux/dev` for fal, `openai/gpt-image-2` for OpenAI Images, or `openai/gpt-image-1.5` for transparent-background OpenAI PNG/WebP output.
  - If you select a provider/model directly, configure matching provider auth too (for example `GEMINI_API_KEY` or `GOOGLE_API_KEY` for `google/*`, `OPENAI_API_KEY` or OpenAI Codex OAuth for `openai/gpt-image-2` / `openai/gpt-image-1.5`, `FAL_KEY` for `fal/*`).
  - If omitted, `image_generate` can still infer an auth-backed provider default. It tries the current default provider first, then the remaining registered image-generation providers in provider-id order.
- `musicGenerationModel`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the shared music-generation capability and the built-in `music_generate` tool.
  - Typical values: `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview`, or `minimax/music-2.6`.
  - If omitted, `music_generate` can still infer an auth-backed provider default. It tries the current default provider first, then the remaining registered music-generation providers in provider-id order.
  - If you select a provider/model directly, configure the matching provider auth/API key too.
- `videoGenerationModel`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the shared video-generation capability and the built-in `video_generate` tool.
  - Typical values: `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash`, or `qwen/wan2.7-r2v`.
  - If omitted, `video_generate` can still infer an auth-backed provider default. It tries the current default provider first, then the remaining registered video-generation providers in provider-id order.
  - If you select a provider/model directly, configure the matching provider auth/API key too.
  - The bundled Qwen video-generation provider supports up to 1 output video, 1 input image, 4 input videos, 10 seconds duration, and provider-level `size`, `aspectRatio`, `resolution`, `audio`, and `watermark` options.
- `pdfModel`: accepts either a string (`"provider/model"`) or an object (`{ primary, fallbacks }`).
  - Used by the `pdf` tool for model routing.
  - If omitted, the PDF tool falls back to `imageModel`, then to the resolved session/default model.
- `pdfMaxBytesMb`: default PDF size limit for the `pdf` tool when `maxBytesMb` is not passed at call time.
- `pdfMaxPages`: default maximum pages considered by extraction fallback mode in the `pdf` tool.
- `verboseDefault`: default verbose level for agents. Values: `"off"`, `"on"`, `"full"`. Default: `"off"`.
- `toolProgressDetail`: detail mode for `/verbose` tool summaries and progress-draft tool lines. Values: `"explain"` (default, compact human labels) or `"raw"` (append raw command/detail when available). Per-agent `agents.list[].toolProgressDetail` overrides this default.
- `reasoningDefault`: default reasoning visibility for agents. Values: `"off"`, `"on"`, `"stream"`. Per-agent `agents.list[].reasoningDefault` overrides this default. Configured reasoning defaults are only applied for owners, authorized senders, or operator-admin gateway contexts when no per-message or session reasoning override is set.
- `elevatedDefault`: default elevated-output level for agents. Values: `"off"`, `"on"`, `"ask"`, `"full"`. Default: `"on"`.
- `model.primary`: format `provider/model` (e.g. `openai/gpt-5.5` for OpenAI API-key or Codex OAuth access). If you omit the provider, OpenClaw tries an alias first, then a unique configured-provider match for that exact model id, and only then falls back to the configured default provider (deprecated compatibility behavior, so prefer explicit `provider/model`). If that provider no longer exposes the configured default model, OpenClaw falls back to the first configured provider/model instead of surfacing a stale removed-provider default.
- `models`: the configured model catalog and allowlist for `/model`. Each entry can include `alias` (shortcut) and `params` (provider-specific, for example `temperature`, `maxTokens`, `cacheRetention`, `context1m`, `responsesServerCompaction`, `responsesCompactThreshold`, OpenRouter `provider` routing, `chat_template_kwargs`, `extra_body`/`extraBody`).
  - Use `provider/*` entries such as `"openai/*": {}` or `"vllm/*": {}` to show all discovered models for selected providers without manually listing every model id.
  - Add `agentRuntime` to a `provider/*` entry when every dynamically discovered model for that provider should use the same runtime. Exact `provider/model` runtime policy still wins over the wildcard.
  - Safe edits: use `openclaw config set agents.defaults.models '<json>' --strict-json --merge` to add entries. `config set` refuses replacements that would remove existing allowlist entries unless you pass `--replace`.
  - Provider-scoped configure/onboarding flows merge selected provider models into this map and preserve unrelated providers already configured.
  - For direct OpenAI Responses models, server-side compaction is enabled automatically. Use `params.responsesServerCompaction: false` to stop injecting `context_management`, or `params.responsesCompactThreshold` to override the threshold. See [OpenAI server-side compaction](/providers/openai#server-side-compaction-responses-api).
- `params`: global default provider parameters applied to all models. Set at `agents.defaults.params` (e.g. `{ cacheRetention: "long" }`).
- `params` merge precedence (config): `agents.defaults.params` (global base) is overridden by `agents.defaults.models["provider/model"].params` (per-model), then `agents.list[].params` (matching agent id) overrides by key. See [Prompt Caching](/reference/prompt-caching) for details.
- `models.providers.openrouter.params.provider`: OpenRouter-wide default provider-routing policy. OpenClaw forwards this to OpenRouter's request `provider` object; per-model `agents.defaults.models["openrouter/<model>"].params.provider` and agent params override by key. See [OpenRouter provider routing](/providers/openrouter#advanced-configuration).
- `params.extra_body`/`params.extraBody`: advanced pass-through JSON merged into `api: "openai-completions"` request bodies for OpenAI-compatible proxies. If it collides with generated request keys, the extra body wins; non-native completions routes still strip OpenAI-only `store` afterward.
- `params.chat_template_kwargs`: vLLM/OpenAI-compatible chat-template arguments merged into top-level `api: "openai-completions"` request bodies. For `vllm/nemotron-3-*` with thinking off, the bundled vLLM plugin automatically sends `enable_thinking: false` and `force_nonempty_content: true`; explicit `chat_template_kwargs` override generated defaults, and `extra_body.chat_template_kwargs` still has final precedence. Configured vLLM Qwen and Nemotron thinking models expose binary `/think` choices (`off`, `on`) instead of the multi-level effort ladder.
- `compat.thinkingFormat`: OpenAI-compatible thinking payload style. Use `"together"` for Together-style `reasoning.enabled`, `"qwen"` for Qwen-style top-level `enable_thinking`, or `"qwen-chat-template"` for `chat_template_kwargs.enable_thinking` on Qwen-family backends that support request-level chat-template kwargs, such as vLLM. OpenClaw maps disabled thinking to `false` and enabled thinking to `true`, and configured vLLM Qwen models expose binary `/think` choices for these formats.
- `compat.supportedReasoningEfforts`: per-model OpenAI-compatible reasoning effort list. Include `"xhigh"` for custom endpoints that truly accept it; OpenClaw then exposes `/think xhigh` in command menus, Gateway session rows, session patch validation, agent CLI validation, and `llm-task` validation for that configured provider/model. Use `compat.reasoningEffortMap` when the backend wants a provider-specific value for a canonical level.
- `params.preserveThinking`: Z.AI-only opt-in for preserved thinking. When enabled and thinking is on, OpenClaw sends `thinking.clear_thinking: false` and replays prior `reasoning_content`; see [Z.AI thinking and preserved thinking](/providers/zai#thinking-and-preserved-thinking).
- `localService`: optional provider-level process manager for local/self-hosted model servers. When the selected model belongs to that provider, OpenClaw probes `healthUrl` (or `baseUrl + "/models"`), starts `command` with `args` if the endpoint is down, waits up to `readyTimeoutMs`, then sends the model request. `command` must be an absolute path. `idleStopMs: 0` keeps the process alive until OpenClaw exits; a positive value stops the OpenClaw-spawned process after that many idle milliseconds. See [Local model services](/gateway/local-model-services).
- Runtime policy belongs on providers or models, not on `agents.defaults`. Use `models.providers.<provider>.agentRuntime` for provider-wide rules or `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` for model-specific rules. OpenAI agent models on the official OpenAI provider select Codex by default.
- Config writers that mutate these fields (for example `/models set`, `/models set-image`, and fallback add/remove commands) save canonical object form and preserve existing fallback lists when possible.
- `maxConcurrent`: max parallel agent runs across sessions (each session still serialized). Default: 4.

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
      model: "openai/gpt-5.5",
      models: {
        "anthropic/claude-opus-4-8": {
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
- `id: "auto"` lets registered plugin harnesses claim supported turns and uses OpenClaw when no harness matches. An explicit plugin runtime such as `id: "codex"` requires that harness and fails closed if it is unavailable or fails.
- `id: "pi"` is accepted only as a deprecated alias for `openclaw` to preserve shipped configs from v2026.5.22 and earlier. New config should use `openclaw`.
- Runtime precedence is exact model policy first (`agents.list[].models["provider/model"]`, `agents.defaults.models["provider/model"]`, or `models.providers.<provider>.models[]`), then `agents.list[]` / `agents.defaults.models["provider/*"]`, then provider-wide policy at `models.providers.<provider>.agentRuntime`.
- Whole-agent runtime keys are legacy. `agents.defaults.agentRuntime`, `agents.list[].agentRuntime`, session runtime pins, and `OPENCLAW_AGENT_RUNTIME` are ignored by runtime selection. Run `openclaw doctor --fix` to remove stale values.
- OpenAI agent models use the Codex harness by default; provider/model `agentRuntime.id: "codex"` remains valid when you want to make that explicit.
- For Claude CLI deployments, prefer `model: "anthropic/claude-opus-4-8"` plus model-scoped `agentRuntime.id: "claude-cli"`. Legacy `claude-cli/claude-opus-4-7` model refs still work for compatibility, but new config should keep provider/model selection canonical and put the execution backend in provider/model runtime policy.
- This only controls text agent-turn execution. Media generation, vision, PDF, music, video, and TTS still use their provider/model settings.

**内置别名快捷方式**（仅在模型位于 `agents.defaults.models` 中时适用）：

| 别名                | 模型                            |
| ------------------- | ------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`     |
| `sonnet`            | `anthropic/claude-sonnet-4-6`   |
| `gpt`               | `openai/gpt-5.5`                |
| `gpt-mini`          | `openai/gpt-5.4-mini`           |
| `gpt-nano`          | `openai/gpt-5.4-nano`           |
| `gemini`            | `google/gemini-3.1-pro-preview` |
| `gemini-flash`      | `google/gemini-3-flash-preview` |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite`  |

你配置的别名始终优先于默认值。

Z.AI GLM-4.x models automatically enable thinking mode unless you set `--thinking off` or define `agents.defaults.models["zai/<model>"].params.thinking` yourself.
Z.AI models enable `tool_stream` by default for tool call streaming. Set `agents.defaults.models["zai/<model>"].params.tool_stream` to `false` to disable it.
Anthropic Claude Opus 4.8 keeps thinking off by default in OpenClaw; when adaptive thinking is explicitly enabled, Anthropic's provider-owned effort default is `high`. Claude 4.6 models default to `adaptive` when no explicit thinking level is set.

### `agents.defaults.cliBackends`

用于纯文本回退运行（无工具调用）的可选 CLI 后端。适合作为 API 提供方失败时的备用方案。

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          // 或者在 CLI 接受提示词文件标志时使用 systemPromptFileArg。
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
        },
      },
    },
  },
}
```

- CLI 后端是以文本优先的；工具始终禁用。
- 当设置了 `sessionArg` 时支持会话。
- 当 `imageArg` 接受文件路径时支持图像透传。
- `reseedFromRawTranscriptWhenUncompacted: true` 允许后端在第一个压缩摘要存在之前，从受限的原始 OpenClaw 转录尾部恢复被失效化的安全会话。认证配置文件或凭据 epoch 的变化仍然不会进行 raw reseed。

### `agents.defaults.promptOverlays`

Provider-independent prompt overlays applied by model family on OpenClaw-assembled prompt surfaces. GPT-5-family model ids receive the shared behavior contract across OpenClaw/provider routes; `personality` controls only the friendly interaction-style layer. Native Codex app-server routes keep Codex-owned base/model instructions instead of this OpenClaw GPT-5 overlay, and OpenClaw disables Codex's built-in personality for native threads.

```json5
{
  agents: {
    defaults: {
      promptOverlays: {
        gpt5: {
          personality: "friendly", // friendly | on | off
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
        every: "30m", // 0m 禁用
        model: "openai/gpt-5.4-mini",
        includeReasoning: false,
        includeSystemPromptSection: true, // 默认：true；false 会从系统提示词中省略 Heartbeat 章节
        lightContext: false, // 默认：false；true 仅保留工作区引导文件中的 HEARTBEAT.md
        isolatedSession: false, // 默认：false；true 在全新会话中运行每次心跳（无对话历史）
        skipWhenBusy: false, // 默认：false；true 也会等待该代理的子代理/嵌套通道
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow（默认）| block
        target: "none", // 默认：none | 可选：last | whatsapp | telegram | discord | ...
        prompt: "如果存在则读取 HEARTBEAT.md...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every`: duration string (ms/s/m/h). Default: `30m` (API-key auth) or `1h` (OAuth auth). Set to `0m` to disable.
- `includeSystemPromptSection`: when false, omits the Heartbeat section from the system prompt and skips `HEARTBEAT.md` injection into bootstrap context. Default: `true`.
- `suppressToolErrorWarnings`: when true, suppresses tool error warning payloads during heartbeat runs.
- `timeoutSeconds`: maximum time in seconds allowed for a heartbeat agent turn before it is aborted. Leave unset to use `agents.defaults.timeoutSeconds` when set, otherwise the heartbeat cadence capped at 600 seconds.
- `directPolicy`: direct/DM delivery policy. `allow` (default) permits direct-target delivery. `block` suppresses direct-target delivery and emits `reason=dm-blocked`.
- `lightContext`: when true, heartbeat runs use lightweight bootstrap context and keep only `HEARTBEAT.md` from workspace bootstrap files.
- `isolatedSession`: when true, each heartbeat runs in a fresh session with no prior conversation history. Same isolation pattern as cron `sessionTarget: "isolated"`. Reduces per-heartbeat token cost from ~100K to ~2-5K tokens.
- `skipWhenBusy`: when true, heartbeat runs defer on that agent's extra busy lanes: its own session-keyed subagent or nested command work. Cron lanes always defer heartbeats, even without this flag.
- Per-agent: set `agents.list[].heartbeat`. When any agent defines `heartbeat`, **only those agents** run heartbeats.
- Heartbeats run full agent turns — shorter intervals burn more tokens.

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // 已注册压缩提供方插件的 id（可选）
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        keepRecentTokens: 50000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "精确保留部署 ID、工单 ID 和 host:port 对。", // identifierPolicy=custom 时使用
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // optional tool-loop pressure check
        postCompactionSections: ["Session Startup", "Red Lines"], // opt in to AGENTS.md section reinjection
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        truncateAfterCompaction: true, // rotate to a smaller successor JSONL after compaction
        maxActiveTranscriptBytes: "20mb", // optional preflight local compaction trigger
        notifyUser: true, // send brief notices when compaction starts and completes (default: false)
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // 可选的仅 memory-flush 模型覆盖
          softThresholdTokens: 6000,
          systemPrompt: "会话即将压缩。请现在存储持久化记忆。",
          prompt: "将任何长期笔记写入 memory/YYYY-MM-DD.md；如果没有要存储的内容，请准确回复静默标记 NO_REPLY。",
        },
      },
    },
  },
}
```

- `mode`: `default` or `safeguard` (chunked summarization for long histories). See [Compaction](/concepts/compaction).
- `provider`: id of a registered compaction provider plugin. When set, the provider's `summarize()` is called instead of built-in LLM summarization. Falls back to built-in on failure. Setting a provider forces `mode: "safeguard"`. See [Compaction](/concepts/compaction).
- `timeoutSeconds`: maximum seconds allowed for a single compaction operation before OpenClaw aborts it. Default: `900`.
- `keepRecentTokens`: agent cut-point budget for keeping the most recent transcript tail verbatim. Manual `/compact` honors this when explicitly set; otherwise manual compaction is a hard checkpoint.
- `identifierPolicy`: `strict` (default), `off`, or `custom`. `strict` prepends built-in opaque identifier retention guidance during compaction summarization.
- `identifierInstructions`: optional custom identifier-preservation text used when `identifierPolicy=custom`.
- `qualityGuard`: retry-on-malformed-output checks for safeguard summaries. Enabled by default in safeguard mode; set `enabled: false` to skip the audit.
- `midTurnPrecheck`: optional tool-loop pressure check. When `enabled: true`, OpenClaw checks context pressure after tool results are appended and before the next model call. If the context no longer fits, it aborts the current attempt before submitting the prompt and reuses the existing precheck recovery path to truncate tool results or compact and retry. Works with both `default` and `safeguard` compaction modes. Default: disabled.
- `postCompactionSections`: optional AGENTS.md H2/H3 section names to re-inject after compaction. Reinjection is disabled when unset or set to `[]`. Explicitly setting `["Session Startup", "Red Lines"]` enables that pair and preserves the legacy `Every Session`/`Safety` fallback. Enable this only when the extra context is worth the risk of duplicating project guidance already captured in the compaction summary.
- `model`: optional `provider/model-id` override for compaction summarization only. Use this when the main session should keep one model but compaction summaries should run on another; when unset, compaction uses the session's primary model.
- `maxActiveTranscriptBytes`: optional byte threshold (`number` or strings like `"20mb"`) that triggers normal local compaction before a run when the active JSONL grows past the threshold. Requires `truncateAfterCompaction` so successful compaction can rotate to a smaller successor transcript. Disabled when unset or `0`.
- `notifyUser`: when `true`, sends brief notices to the user when compaction starts and when it completes (for example, "Compacting context..." and "Compaction complete"). Disabled by default to keep compaction silent.
- `memoryFlush`: silent agentic turn before auto-compaction to store durable memories. Set `model` to an exact provider/model such as `ollama/qwen3:8b` when this housekeeping turn should stay on a local model; the override does not inherit the active session fallback chain. Skipped when workspace is read-only.

### `agents.defaults.runRetries`

Outer run loop retry iteration boundaries for the embedded agent runtime to prevent infinite execution loops during failure recovery. Note that this setting currently only applies to the embedded agent runtime, not ACP or CLI runtimes.

```json5
{
  agents: {
    defaults: {
      runRetries: {
        base: 24,
        perProfile: 8,
        min: 32,
        max: 160,
      },
    },
    list: [
      {
        id: "main",
        runRetries: { max: 50 }, // 可选的逐代理覆盖
      },
    ],
  },
}
```

- `base`：外层运行循环的基础重试迭代次数。默认值：`24`。
- `perProfile`：每个回退配置候选额外获得的重试迭代次数。默认值：`8`。
- `min`：重试迭代次数的最小绝对限制。默认值：`32`。
- `max`：防止失控执行的重试迭代次数最大绝对限制。默认值：`160`。

### `agents.defaults.contextPruning`

在发送给 LLM 之前，从内存上下文中清理**旧的工具结果**。不会修改磁盘上的会话历史。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // 持续时间（ms/s/m/h），默认单位：分钟
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[已清除旧工具结果内容]" },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="cache-ttl 模式行为">

- `mode: "cache-ttl"` 启用清理轮次。
- `ttl` 控制清理在上次缓存触碰后多久可以再次运行。
- 清理会先对过大的工具结果进行软裁剪，然后在需要时对更旧的工具结果进行硬清除。
- `softTrimRatio` 和 `hardClearRatio` 接受从 `0.0` 到 `1.0` 的值；配置校验会拒绝超出该范围的值。

**软裁剪**会保留开头 + 结尾，并在中间插入 `...`。

**硬清除**会用占位符替换整个工具结果。

注意：

- 图像块绝不会被裁剪/清除。
- 比例按字符计算（近似值），不是精确的 token 数。
- 如果存在的助手消息少于 `keepLastAssistants`，则跳过清理。

</Accordion>

行为细节请参见 [会话清理](/concepts/session-pruning)。

### 块流式输出

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200 },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off | natural | custom (使用 minMs/maxMs)
    },
  },
}
```

- 非 Telegram 通道需要显式的 `*.blockStreaming: true` 才能启用块回复。
- 通道覆盖：`channels.<channel>.blockStreamingCoalesce`（以及按账号的变体）。Signal/Slack/Discord/Google Chat 默认 `minChars: 1500`。
- `humanDelay`：块回复之间的随机暂停。`natural` = 800–2500ms。逐代理覆盖：`agents.list[].humanDelay`。

行为和分块细节请参见 [流式输出](/concepts/streaming)。

### 输入指示器

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // never | instant | thinking | message
      typingIntervalSeconds: 6,
    },
  },
}
```

- 默认值：直接聊天/提及时为 `instant`，未被提及的群聊为 `message`。
- 按会话覆盖：`session.typingMode`、`session.typingIntervalSeconds`。

参见 [输入指示器](/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可选沙箱。完整指南请参见 [沙箱](/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        backend: "docker", // docker | ssh | openshell
        scope: "agent", // session | agent | shared
        workspaceAccess: "none", // none | ro | rw
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
          enableNoVnc: true,
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

<Accordion title="沙箱详情">

**后端：**

- `docker`：本地 Docker 运行时（默认）
- `ssh`：通用的基于 SSH 的远程运行时
- `openshell`：OpenShell 运行时

当选择 `backend: "openshell"` 时，运行时相关设置会移动到 `plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`：`user@host[:port]` 形式的 SSH 目标
- `command`：SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`：用于按作用域工作区的绝对远程根目录
- `identityFile` / `certificateFile` / `knownHostsFile`：传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 会在运行时将其物化为临时文件的内联内容或 SecretRef
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主机密钥策略开关

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

- `none`：位于 `~/.openclaw/sandboxes` 下的按作用域沙箱工作区
- `ro`：沙箱工作区位于 `/workspace`，代理工作区只读挂载到 `/agent`
- `rw`：代理工作区读写挂载到 `/workspace`

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
          mode: "mirror", // mirror | remote
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

**沙箱浏览器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 会注入系统提示词中。不需要在 `openclaw.json` 中启用 `browser.enabled`。
noVNC 观察者访问默认使用 VNC 认证，OpenClaw 会发出一个短期 token URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）会阻止沙箱会话目标指向宿主浏览器。
- `network` 默认是 `openclaw-sandbox-browser`（专用 bridge 网络）。仅当你明确希望全局 bridge 连接性时才设置为 `bridge`。
- `cdpSourceRange` 可选择将容器边缘的 CDP 入口限制到一个 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 只会将额外的宿主目录挂载到沙箱浏览器容器中。设置时（包括 `[]`），它会替换浏览器容器的 `docker.binds`。
- 启动默认值定义在 `scripts/sandbox-browser-entrypoint.sh` 中，并针对容器主机进行了调优：
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-gpu`
  - `--disable-software-rasterizer`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--metrics-recording-only`
  - `--disable-extensions`（默认启用）
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 默认启用；如果 WebGL/3D 使用需要它们，可通过 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用。
  - 如果你的工作流依赖扩展，可通过 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 重新启用扩展。
  - `--renderer-process-limit=2` 可通过 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 修改；设为 `0` 可使用 Chromium 的默认进程限制。
  - 启用 `noSandbox` 时再加上 `--no-sandbox`。
  - 默认值是容器镜像基线；如需更改容器默认值，请使用带自定义入口点的自定义浏览器镜像。

</Accordion>

浏览器沙箱和 `sandbox.docker.binds` 仅适用于 Docker。

构建镜像（从源码检出构建）：

```bash
scripts/sandbox-setup.sh           # 主沙箱镜像
scripts/sandbox-browser-setup.sh   # 可选的浏览器镜像
```

关于无源码检出的 npm 安装，请参见 [Sandboxing § Images and setup](/gateway/sandboxing#images-and-setup) 中的内联 `docker build` 命令。

### `agents.list`（逐代理覆盖）

使用 `agents.list[].tts` 为某个代理提供其自己的 TTS 提供方、语音、模型、风格或自动 TTS 模式。代理块会在全局 `messages.tts` 之上进行深度合并，因此共享凭据可以保留在一个地方，而各个代理只覆盖它们需要的语音或提供方字段。当前活动代理的覆盖会应用于自动语音回复、`/tts audio`、`/tts status` 和 `tts` 代理工具。提供方示例和优先级请参见 [文字转语音](/tools/tts#per-agent-voice-overrides)。

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // 或 { primary, fallbacks }
        thinkingDefault: "high", // 逐代理思考级别覆盖
        reasoningDefault: "on", // 逐代理推理可见性覆盖
        fastModeDefault: false, // 逐代理快速模式覆盖
        params: { cacheRetention: "none" }, // 按键覆盖 agents.defaults.models 中的匹配默认值
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
            mode: "persistent",
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

- `id`：稳定的代理 id（必填）。
- `default`：当设置了多个默认时，最先设置的生效（会记录警告）。如果都未设置，则列表中的第一个条目为默认。
- `model`：字符串形式会设置严格的逐代理主模型，不带模型回退；对象形式 `{ primary }` 也同样是严格的，除非你添加 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 可为该代理启用回退，或使用 `{ primary, fallbacks: [] }` 显式表示严格行为。仅覆盖 `primary` 的 cron 任务仍会继承默认回退，除非你设置 `fallbacks: []`。
- `params`：逐代理流参数，会覆盖 `agents.defaults.models` 中所选模型条目。可用于诸如 `cacheRetention`、`temperature` 或 `maxTokens` 之类的代理特定覆盖，而无需复制整个模型目录。
- `tts`：可选的逐代理文字转语音覆盖。该块会在 `messages.tts` 之上进行深度合并，因此请将共享的提供方凭据和回退策略保留在 `messages.tts` 中，并只在此处设置与角色相关的值，例如提供方、声音、模型、风格或自动模式。
- `skills`：可选的逐代理技能允许列表。若省略，则在设置了 `agents.defaults.skills` 时继承它；显式列表会替换默认值而不是合并，`[]` 表示没有技能。
- `thinkingDefault`：可选的逐代理默认思考级别（`off | minimal | low | medium | high | xhigh | adaptive | max`）。当没有逐消息或会话覆盖时，会覆盖该代理的 `agents.defaults.thinkingDefault`。所选提供方/模型配置文件决定哪些值有效；对于 Google Gemini，`adaptive` 会保留提供方拥有的动态思考（Gemini 3/3.1 上省略 `thinkingLevel`，Gemini 2.5 上 `thinkingBudget: -1`）。
- `reasoningDefault`：可选的逐代理默认推理可见性（`on | off | stream`）。当没有逐消息或会话推理覆盖时，会覆盖该代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可选的逐代理快速模式默认值（`true | false`）。在没有逐消息或会话快速模式覆盖时生效。
- `models`：可选的逐代理模型目录/运行时覆盖，按完整的 `provider/model` id 键入。使用 `models["provider/model"].agentRuntime` 表示逐代理运行时例外。
- `runtime`：可选的逐代理运行时描述符。若代理默认应使用 ACP 框架会话，可使用带有 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）的 `type: "acp"`。
- `identity.avatar`：工作区相对路径、`http(s)` URL 或 `data:` URI。
- `identity` 派生默认值：`ackReaction` 来自 `emoji`，`mentionPatterns` 来自 `name`/`emoji`。
- `subagents.allowAgents`：用于显式 `sessions_spawn.agentId` 目标的已配置代理 id 允许列表（`["*"]` = 任意已配置目标；默认：仅同一代理）。如果允许自我目标 `agentId` 调用，请包含请求者 id。已删除其代理配置的过期条目会被 `sessions_spawn` 拒绝，并从 `agents_list` 中省略；运行 `openclaw doctor --fix` 可清理它们，或者如果希望该目标仍可在继承默认值的同时保持可生成，可添加一个最小的 `agents.list[]` 条目。
- 沙箱继承保护：如果请求者会话已经处于沙箱中，`sessions_spawn` 会拒绝那些会在非沙箱中运行的目标。
- `subagents.requireAgentId`：为 `true` 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择；默认：`false`）。

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
    mainKey: "main", // 旧字段（运行时始终使用 "main"）
    agentToAgent: { maxPingPongTurns: 5 },
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
- **`reset`**: primary reset policy. `daily` resets at `atHour` local time; `idle` resets after `idleMinutes`. When both configured, whichever expires first wins. Daily reset freshness uses the session row's `sessionStartedAt`; idle reset freshness uses `lastInteractionAt`. Background/system-event writes such as heartbeat, cron wakeups, exec notifications, and gateway bookkeeping can update `updatedAt`, but they do not keep daily/idle sessions fresh.
- **`resetByType`**: per-type overrides (`direct`, `group`, `thread`). Legacy `dm` accepted as alias for `direct`.
- **`mainKey`**: legacy field. Runtime always uses `"main"` for the main direct-chat bucket.
- **`agentToAgent.maxPingPongTurns`**: maximum reply-back turns between agents during agent-to-agent exchanges (integer, range: `0`-`20`, default: `5`). `0` disables ping-pong chaining.
- **`sendPolicy`**: match by `channel`, `chatType` (`direct|group|channel`, with legacy `dm` alias), `keyPrefix`, or `rawKeyPrefix`. First deny wins.
- **`maintenance`**: session-store cleanup + retention controls.
  - `mode`: `enforce` applies cleanup and is the default; `warn` emits warnings only.
  - `pruneAfter`: age cutoff for stale entries (default `30d`).
  - `maxEntries`: maximum number of entries in `sessions.json` (default `500`). Runtime writes batch cleanup with a small high-water buffer for production-sized caps; `openclaw sessions cleanup --enforce` applies the cap immediately.
  - `rotateBytes`: deprecated and ignored; `openclaw doctor --fix` removes it from older configs.
  - `resetArchiveRetention`: retention for `*.reset.<timestamp>` transcript archives. Defaults to `pruneAfter`; set `false` to disable.
  - `maxDiskBytes`: optional sessions-directory disk budget. In `warn` mode it logs warnings; in `enforce` mode it removes oldest artifacts/sessions first.
  - `highWaterBytes`: optional target after budget cleanup. Defaults to `80%` of `maxDiskBytes`.
- **`threadBindings`**: global defaults for thread-bound session features.
  - `enabled`: master default switch (providers can override; Discord uses `channels.discord.threadBindings.enabled`)
  - `idleHours`: default inactivity auto-unfocus in hours (`0` disables; providers can override)
  - `maxAgeHours`: default hard max age in hours (`0` disables; providers can override)
  - `spawnSessions`: default gate for creating thread-bound work sessions from `sessions_spawn` and ACP thread spawns. Defaults to `true` when thread bindings are enabled; providers/accounts can override.
  - `defaultSpawnContext`: default native subagent context for thread-bound spawns (`"fork"` or `"isolated"`). Defaults to `"fork"`.

</Accordion>

---

## 消息

```json5
{
  messages: {
    responsePrefix: "🦞", // 或 "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // 群组提及 | 群组全部 | 私聊 | 全部
    removeAckAfterReply: false,
    queue: {
      mode: "followup", // 跟进 | 后续 | 收集 | 中断
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize
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

- 默认为活动代理的 `identity.emoji`，否则为 `"👀"`。设置 `""` 可禁用。
- 按频道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：账户 → 频道 → `messages.ackReaction` → identity 回退。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：会在支持 reaction 的频道（如 Slack、Discord、Telegram、WhatsApp 和 iMessage）中，在回复后移除确认反应。
- `messages.statusReactions.enabled`：在 Slack、Discord、Telegram 和 WhatsApp 上启用生命周期状态反应。
  在 Slack 和 Discord 上，如果不设置，当确认反应启用时状态反应仍保持启用。
  在 Telegram 和 WhatsApp 上，必须显式设为 `true` 才会启用生命周期状态反应。
- `messages.statusReactions.emojis`：覆盖生命周期 emoji 键：
  `queued`、`thinking`、`compacting`、`tool`、`coding`、`web`、`deploy`、`build`、
  `concierge`、`done`、`error`、`stallSoft` 和 `stallHard`。
  Telegram 只允许固定的 reaction 集合，因此不受支持的已配置 emoji 会回退到
  该聊天中最接近的受支持状态变体。

### 入站防抖

将来自同一发送者的快速纯文本消息批量合并为一次代理轮次。媒体/附件会立即刷新。控制命令会绕过防抖。

### TTS（文本转语音）

```json5
{
  messages: {
    tts: {
      auto: "always", // 关闭 | 始终 | 入站 | 被标记
      mode: "final", // 最终 | 全部
      provider: "elevenlabs",
      summaryModel: "openai/gpt-5.4-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      providers: {
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
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
          speakerVoice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          speakerVoice: "alloy",
        },
      },
    },
  },
}
```

- `auto` 控制默认自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可覆盖本地偏好，`/tts status` 会显示生效状态。
- `summaryModel` 会为自动摘要覆盖 `agents.defaults.model.primary`。
- `modelOverrides` 默认启用；`modelOverrides.allowProvider` 默认为 `false`（需显式启用）。
- API 密钥会回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 捆绑的语音提供方由插件拥有。如果设置了 `plugins.allow`，请包含你想使用的每个 TTS 提供方插件，例如用于 Edge TTS 的 `microsoft`。旧的 `edge` 提供方 id 也可作为 `microsoft` 的别名接受。
- `providers.openai.baseUrl` 会覆盖 OpenAI TTS 端点。解析顺序为配置，其次 `OPENAI_TTS_BASE_URL`，然后 `https://api.openai.com/v1`。
- 当 `providers.openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 会将其视为兼容 OpenAI 的 TTS 服务器，并放宽模型/语音验证。

---

## Talk

Talk 模式（macOS/iOS/Android）的默认设置。

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        speakerVoiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_v3",
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
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
      instructions: "以温暖的语气说话，并保持回答简短。",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

- `talk.provider` 在配置了多个 Talk 提供方时，必须与 `talk.providers` 中的某个键匹配。
- 旧版扁平化 Talk 键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容性。运行 `openclaw doctor --fix` 可将持久化配置重写为 `talk.providers.<provider>`。
- 语音 ID 会回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受明文字符串或 SecretRef 对象。
- 仅当未配置 Talk API 密钥时，才会应用 `ELEVENLABS_API_KEY` 回退。
- `providers.*.voiceAliases` 允许 Talk 指令使用友好名称。
- `providers.mlx.modelId` 选择 macOS 本地 MLX helper 使用的 Hugging Face 仓库。如果省略，macOS 将使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放会通过随附的 `openclaw-mlx-tts` helper（如果存在）或 `PATH` 上的可执行文件运行；`OPENCLAW_MLX_TTS_BIN` 会在开发时覆盖 helper 路径。
- `consultThinkingLevel` 控制 Control UI Talk realtime `openclaw_agent_consult` 调用背后完整 OpenClaw agent 运行的思考级别。保持未设置可保留正常的会话/模型行为。
- `consultFastMode` 为 Control UI Talk realtime consult 设置一次性 fast-mode 覆盖，而不会更改会话的正常 fast-mode 设置。
- `speechLocale` 设置 iOS/macOS Talk 语音识别使用的 BCP 47 区域设置 ID。保持未设置可使用设备默认值。
- `silenceTimeoutMs` 控制 Talk 模式在用户静默后等待多久再发送转录文本。未设置时保留平台默认的暂停窗口（macOS 和 Android 为 `700 ms`，iOS 为 `900 ms`）。
- `realtime.instructions` 会将面向提供方的系统指令追加到 OpenClaw 内置的 realtime 提示词中，因此可以在不丢失默认 `openclaw_agent_consult` 指南的情况下配置语音风格。
- `realtime.consultRouting` 控制当 realtime 提供方在没有 `openclaw_agent_consult` 的情况下生成最终用户转录时的 Gateway relay 回退：`provider-direct` 保留直接的提供方回复，而 `force-agent-consult` 会将最终请求路由通过 OpenClaw。

---

## 相关

- [配置参考](/gateway/configuration-reference) — 其他所有配置键
- [配置](/gateway/configuration) — 常见任务和快速设置
- [配置示例](/gateway/configuration-examples)
