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

The optional repository root directory, which will be shown in the Runtime line of the system prompt. If not set, OpenClaw will automatically detect it by traversing upward from the workspace.

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

Disable automatic creation of workspace bootstrap files (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`).

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

跳过创建所选的可选工作区文件，同时仍会写入必需的引导文件（`AGENTS.md`、`TOOLS.md`、`BOOTSTRAP.md`）。有效值：`SOUL.md`、`USER.md`、`HEARTBEAT.md` 和 `IDENTITY.md`。

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

每个工作区引导文件在截断前的最大字符数。默认值：`20000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

逐代理覆盖：`agents.list[].bootstrapMaxChars`。省略的值会继承
`agents.defaults.bootstrapMaxChars`。

### `agents.defaults.bootstrapTotalMaxChars`

The maximum total character count injected across all workspace bootstrap files. Default: `60000`.

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

Per-agent override: `agents.list[].bootstrapTotalMaxChars`. Omitted values
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

Controls the system prompt notification visible to the agent when the bootstrap context is truncated.
Default value: `"always"`.

- `"off"`: Never inject truncation notification text into the system prompt.
- `"once"`: Inject a concise notification once for each unique truncation signature.
- `"always"`: Inject a concise notification on every run as long as truncation exists (recommended).

More detailed original/injected counts and configuration tuning fields are preserved in diagnostic information, such as context/state reports and logs; regular WebChat users/runtime context will only receive a concise recovery notification.

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "always" } }, // off | once | always
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

- `memoryGetMaxChars`: 默认 `memory_get` 摘录上限，在添加元数据和续接提示之前进行截断。
- `memoryGetDefaultLines`: 当省略 `lines` 时，默认的 `memory_get` 行窗口。
- `toolResultMaxChars`: 用于持久化结果和溢出恢复的高级实时工具结果上限。若不设置，则使用模型上下文自动上限：低于 100K tokens 时为 `16000` 字符，100K+ tokens 时为 `32000` 字符，200K+ tokens 时为 `64000` 字符。对于长上下文模型，可显式设置最多 `1000000`，但有效上限仍受限于模型上下文窗口的约 30%。`openclaw doctor --deep` 会打印有效上限，而 doctor 只会在显式覆盖已过时或不起作用时发出警告。
- `postCompactionMaxChars`: 压缩后刷新注入期间使用的 AGENTS.md 摘录上限。

#### `agents.list[].contextLimits`

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
  skills: { limits: { maxSkillsPromptChars: 18000 } },
}
```

#### `agents.list[].skillsLimits.maxSkillsPromptChars`

针对技能提示词预算的逐代理覆盖。

```json5
{
  agents: {
    list: [{ id: "tiny-local", skillsLimits: { maxSkillsPromptChars: 6000 } }],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

Maximum pixel size for the longest edge in transcription/tool image blocks before being passed to the provider call. Default: `1200`.

Lower values usually reduce visual token usage and the request payload size for screenshot-heavy runs.
Higher values preserve more visual detail.

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

Time format in system prompts. Default value: `auto` (operating system preference).

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
      utilityModel: "openai/gpt-5.4-mini",
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
      maxConcurrent: 4,
    },
  },
}
```

- `model`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式只设置主模型。
  - 对象形式会设置主模型以及有序的故障转移模型。
- `utilityModel`：可选的 `provider/model` 引用或别名，用于简短的内部任务。它目前为生成的 Control UI 会话标题、Telegram 私信主题标题、Discord 自动线程标题，以及 [progress-draft narration](/concepts/progress-drafts#narrated-status) 提供支持。未设置时，OpenClaw 会在存在默认小模型时推导出主提供方声明的默认小模型（OpenAI → `gpt-5.6-luna`，Anthropic → `claude-haiku-4-5`）；标题任务否则回退到代理的主模型，而叙述保持关闭。设置 `utilityModel: ""` 可完全禁用 utility 路由。`agents.list[].utilityModel` 会覆盖默认值（单个代理中设置为空值会为该代理禁用它），而特定操作的模型覆盖会优先于两者。utility 任务会发起独立的模型调用，并向所选模型提供方发送任务特定内容。Dashboard 标题生成最多发送第一条非命令消息的前 1,000 个字符；叙述会发送入站请求以及紧凑的脱敏工具摘要。请选择符合你的成本和数据处理要求的提供方。
- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `image` 工具路径作为其视觉模型配置使用。
  - 当所选/默认模型无法接收图像输入时，也用于回退路由。
  - 优先使用显式的 `provider/model` 引用。为兼容性也接受裸 ID；如果裸 ID 能唯一匹配 `models.providers.*.models` 中某个已配置的支持图像条目，OpenClaw 会将其限定到该提供方。若存在歧义的已配置匹配，则需要显式提供 provider 前缀。
- `imageGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的图像生成能力以及任何未来生成图像的工具/插件表面使用。
  - 典型值：`google/gemini-3.1-flash-image-preview` 用于 Gemini 原生图像生成，`fal/fal-ai/flux/dev` 用于 fal，`openai/gpt-image-2` 用于 OpenAI Images，或 `openai/gpt-image-1.5` 用于透明背景 OpenAI PNG/WebP 输出。
  - 如果你直接选择了某个 provider/model，也要配置匹配的 provider 认证，例如 `google/*` 使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/gpt-image-2` / `openai/gpt-image-1.5` 使用 `OPENAI_API_KEY` 或 OpenAI Codex OAuth，`fal/*` 使用 `FAL_KEY`。
  - 如果省略，`image_generate` 仍可推断出一个带认证的 provider 默认值。它会先尝试当前默认提供方，然后按 provider-id 顺序尝试其余已注册的图像生成提供方。
- `musicGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的音乐生成能力以及内置的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍可推断出一个带认证的 provider 默认值。它会先尝试当前默认提供方，然后按 provider-id 顺序尝试其余已注册的音乐生成提供方。
  - 如果你直接选择了某个 provider/model，也要配置匹配的 provider 认证/API key。
- `videoGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的视频生成能力以及内置的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍可推断出一个带认证的 provider 默认值。它会先尝试当前默认提供方，然后按 provider-id 顺序尝试其余已注册的视频生成提供方。
  - 如果你直接选择了某个 provider/model，也要配置匹配的 provider 认证/API key。
  - 官方 Qwen 视频生成插件支持最多 1 个输出视频、1 张输入图像、4 个输入视频、10 秒时长，以及 provider 级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `pdf` 工具用于模型路由。
  - 如果省略，PDF 工具会先回退到 `imageModel`，再回退到解析后的会话/默认模型。
- `pdfMaxBytesMb`：当调用时未传入 `maxBytesMb` 时，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式所考虑的默认最大页数。
- `verboseDefault`：代理的默认 verbose 级别。取值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `toolProgressDetail`：`/verbose` 工具摘要和 progress-draft 工具行的详细模式。取值：`"explain"`（默认，简洁的人类标签）或 `"raw"`（在可用时附加原始命令/详情）。每个代理的 `agents.list[].toolProgressDetail` 会覆盖此默认值。
- `reasoningDefault`：代理的默认 reasoning 可见性。取值：`"off"`、`"on"`、`"stream"`。每个代理的 `agents.list[].reasoningDefault` 会覆盖此默认值。已配置的 reasoning 默认值仅在所有者、被授权发送者或 operator-admin gateway 上下文中生效，且在未设置逐消息或会话 reasoning 覆盖时才会应用。
- `elevatedDefault`：代理的默认 elevated 输出级别。取值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式为 `provider/model`（例如 `openai/gpt-5.6-sol`，用于 Codex OAuth 访问）。如果省略 provider，OpenClaw 会先尝试别名，然后尝试与该精确 model id 相匹配的唯一已配置提供方，最后才回退到已配置的默认提供方（已弃用的兼容行为，因此建议显式使用 `provider/model`）。如果该 provider 不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的 provider/model，而不是暴露一个过时的已移除提供方默认值。
- `models`：用于 `/model` 的已配置模型目录和允许列表。每个条目都可以包含 `alias`（快捷方式）和 `params`（provider 特定，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、OpenRouter `provider` 路由、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 使用 `provider/*` 条目，例如 `"openai/*": {}` 或 `"vllm/*": {}`，即可显示所选提供方发现的所有模型，而无需手动列出每个模型 id。
  - 当某个 provider 动态发现的所有模型都应使用相同运行时，可在 `provider/*` 条目中添加 `agentRuntime`。精确的 `provider/model` 运行时策略仍然优先于通配符。
  - 安全编辑：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 来添加条目。`config set` 会拒绝那些会移除现有允许列表条目的替换，除非你传入 `--replace`。
  - 以 provider 为范围的配置/入门流程会将所选 provider 的模型合并到此映射中，并保留已配置的其他无关 provider。
  - 对于直接的 OpenAI Responses 模型，会自动启用服务端压缩。使用 `params.responsesServerCompaction: false` 可停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆盖阈值。参见 [OpenAI server-side compaction](/providers/openai#advanced-configuration)。
- `params`：应用于所有模型的全局默认 provider 参数。设置在 `agents.defaults.params`（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础）会被 `agents.defaults.models["provider/model"].params`（按模型）覆盖，然后 `agents.list[].params`（匹配的代理 id）按键覆盖。详见 [Prompt Caching](/reference/prompt-caching)。
- `models.providers.openrouter.params.provider`：OpenRouter 级别的默认 provider 路由策略。OpenClaw 会将其转发给 OpenRouter 请求的 `provider` 对象；按模型的 `agents.defaults.models["openrouter/<model>"].params.provider` 和代理参数会按键覆盖。参见 [OpenRouter provider routing](/providers/openrouter#advanced-configuration)。
- `params.extra_body`/`params.extraBody`：高级透传 JSON，合并到 OpenAI 兼容代理的 `api: "openai-completions"` 请求体中。如果与生成的请求键冲突，则 extra body 胜出；非原生 completions 路由随后仍会剥离仅限 OpenAI 的 `store`。
- `params.chat_template_kwargs`：合并到顶层 `api: "openai-completions"` 请求体中的 vLLM/OpenAI 兼容 chat-template 参数。对于在关闭 thinking 时的 `vllm/nemotron-3-*`，捆绑的 vLLM 插件会自动发送 `enable_thinking: false` 和 `force_nonempty_content: true`；显式的 `chat_template_kwargs` 会覆盖生成的默认值，而 `extra_body.chat_template_kwargs` 仍具有最终优先级。已配置的 vLLM Qwen 和 Nemotron thinking 模型提供二元 `/think` 选项（`off`、`on`），而不是多级 effort 梯度。
- `compat.thinkingFormat`：OpenAI 兼容的 thinking 载荷样式。对 Together 风格的 `reasoning.enabled` 使用 `"together"`，对 Qwen 风格的顶层 `enable_thinking` 使用 `"qwen"`，或对支持请求级 chat-template kwargs 的 Qwen 系列后端（例如 vLLM）使用 `chat_template_kwargs.enable_thinking` 的 `"qwen-chat-template"`。OpenClaw 会将禁用 thinking 映射为 `false`，将启用 thinking 映射为 `true`，并且已配置的 vLLM Qwen 模型会为这些格式提供二元 `/think` 选项。
- `compat.supportedReasoningEfforts`：每个模型的 OpenAI 兼容 reasoning effort 列表。对于真正接受它的自定义端点，包含 `"xhigh"`；这样 OpenClaw 会在命令菜单、Gateway 会话行、会话补丁验证、代理 CLI 验证以及针对该已配置 provider/model 的 `llm-task` 验证中暴露 `/think xhigh`。当后端希望某个规范级别对应特定 provider 值时，请使用 `compat.reasoningEffortMap`。
- `params.preserveThinking`：仅限 Z.AI 的保留 thinking 选项。启用且 thinking 打开时，OpenClaw 会发送 `thinking.clear_thinking: false` 并重放之前的 `reasoning_content`；参见 [Z.AI thinking and preserved thinking](/providers/zai#advanced-configuration)。
- `localService`：用于本地/自托管模型服务器的可选 provider 级进程管理器。当前选择的模型属于该 provider 时，OpenClaw 会探测 `healthUrl`（或 `baseUrl + "/models"`），在端点宕机时用 `args` 启动 `command`，最多等待 `readyTimeoutMs`，然后发送模型请求。`command` 必须是绝对路径。`idleStopMs: 0` 会让进程保持运行直到 OpenClaw 退出；正值会在空闲指定毫秒后停止由 OpenClaw 启动的进程。参见 [Local model services](/gateway/local-model-services)。
- 运行时策略应放在 providers 或 models 上，而不是 `agents.defaults`。对 provider 级规则使用 `models.providers.<provider>.agentRuntime`，对模型级规则使用 `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime`。仅有 provider/model 前缀不会选择 harness。若运行时未设置或为 `auto`，OpenAI 仅会在精确的官方 HTTPS Platform Responses 或 ChatGPT Responses 路由且没有作者定义的请求覆盖时隐式选择 Codex。参见 [OpenAI implicit agent runtime](/providers/openai#implicit-agent-runtime)。
- 修改这些字段的配置写入器（例如 `/models set`、`/models set-image`，以及 fallback add/remove 命令）会保存规范对象形式，并在可能时保留现有的 fallback 列表。
- `maxConcurrent`：跨会话的最大并行代理运行数（每个会话仍然串行）。默认值：`4`。

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

- `id`: `"auto"`、`"openclaw"`、已注册的插件 harness id，或受支持的 CLI 后端别名。内置的 Codex 插件注册了 `codex`；内置的 Anthropic 插件提供 `claude-cli` CLI 后端。
- `id: "auto"` 会让已注册的插件 harness 认领那些声明了或以其他方式满足其支持契约的有效路由；当没有任何 harness 匹配时则使用 OpenClaw。显式指定插件运行时（例如 `id: "codex"`）要求该 harness 和兼容的有效路由同时可用；如果任一不可用或执行失败，则会以失败关闭的方式处理。
- `id: "pi"` 仅作为 `openclaw` 的弃用别名被接受，以兼容 v2026.5.22 及更早版本中已发布的配置。新配置应使用 `openclaw`。
- 运行时优先级先是精确模型策略（`agents.list[].models["provider/model"]`、`agents.defaults.models["provider/model"]`，或 `models.providers.<provider>.models[]`），然后是 `agents.list[]` / `agents.defaults.models["provider/*"]`，最后是 `models.providers.<provider>.agentRuntime` 的整个平台策略。
- 整个 agent 级别的 runtime 键属于旧版。`agents.defaults.agentRuntime`、`agents.list[].agentRuntime`、会话 runtime 固定值，以及 `OPENCLAW_AGENT_RUNTIME` 都会在运行时选择中被忽略。运行 `openclaw doctor --fix` 以移除过时值。
- 符合条件的精确官方 HTTPS OpenAI Responses/ChatGPT 路由，在没有作者自定义请求覆盖的情况下，可以隐式使用 Codex harness。为 provider/model 设置 `agentRuntime.id: "codex"` 会使 Codex 成为一个失败关闭的强制要求，但不会让不兼容的路由变得兼容。
- 对于 Claude CLI 部署，建议使用 `model: "anthropic/claude-opus-4-8"` 再配合模型级别的 `agentRuntime.id: "claude-cli"`。旧的 `claude-cli/<model>` 引用仍可用于兼容性，但新配置应保持 provider/model 选择为规范形式，并将执行后端放在 provider/model 的 runtime 策略中。
- 这只控制文本 agent turn 的执行。媒体生成、视觉、PDF、音乐、视频和 TTS 仍然使用各自的 provider/model 设置。

**内置别名快捷方式**（仅在模型位于 `agents.defaults.models` 中时适用）：

| 别名                | 模型                            |
| ------------------- | ------------------------------- |
| `opus`              | `anthropic/claude-opus-4-8`     |
| `sonnet`            | `anthropic/claude-sonnet-4-6`   |
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

按模型家族应用于 OpenClaw 组装的提示表面的、与提供方无关的提示覆盖层。GPT-5 系列模型 id 会通过 OpenClaw/提供方路由接收共享的行为契约；`personality` 只控制友好的交互风格层。原生 Codex 应用服务器路由会保留 Codex 拥有的基础/模型指令，而不是这个 OpenClaw GPT-5 覆盖层，并且 OpenClaw 会为原生线程禁用 Codex 内置的 personality。

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

- `every`：持续时间字符串（ms/s/m/h）。默认值：`30m`（API 密钥认证）或 `1h`（OAuth 认证）。设为 `0m` 可禁用。
- `includeSystemPromptSection`：为 false 时，会从系统提示词中省略 Heartbeat 章节，并跳过将 `HEARTBEAT.md` 注入到启动上下文中。默认值：`true`。
- `suppressToolErrorWarnings`：为 true 时，在心跳运行期间抑制工具错误警告载荷。
- `timeoutSeconds`：在心跳代理一次运行被中止前允许的最长秒数。留空则使用 `agents.defaults.timeoutSeconds`（如果已设置），否则使用心跳频率上限 600 秒。
- `directPolicy`：直接/私信投递策略。`allow`（默认）允许向直接目标投递。`block` 会抑制向直接目标投递，并发出 `reason=dm-blocked`。
- `lightContext`：为 true 时，心跳运行使用轻量级启动上下文，并且只保留来自工作区启动文件的 `HEARTBEAT.md`。
- `isolatedSession`：为 true 时，每次心跳都会在全新的会话中运行，不保留之前的对话历史。与 cron 的 `sessionTarget: "isolated"` 采用相同的隔离模式。可将每次心跳的 token 成本从约 100K 降低到约 2-5K。
- `skipWhenBusy`：为 true 时，心跳运行会在该代理的额外繁忙通道上延后：其自身按会话键区分的子代理工作或嵌套命令工作。cron 通道始终会延后心跳，即使没有该标志也是如此。
- 按代理配置：设置 `agents.list[].heartbeat`。当任意代理定义了 `heartbeat` 时，**只有这些代理** 会运行心跳。
- 心跳会完整执行代理轮次——间隔越短，消耗的 token 越多。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // 已注册的压缩提供程序插件的 id（可选）
        timeoutSeconds: 180,
        reserveTokensFloor: 24000,
        keepRecentTokens: 50000,
        recentTurnsPreserve: 3,
        maxHistoryShare: 0.7,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "精确保留部署 ID、工单 ID 和 host:port 对。", // 在 identifierPolicy=custom 时使用
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // 可选的工具循环压力检查
        postIndexSync: "async", // off | async | await
        postCompactionSections: ["Session Startup", "Red Lines"], // 选择性启用 AGENTS.md 章节重注入
        model: "openrouter/anthropic/claude-sonnet-4-6", // 仅用于压缩的可选模型覆盖
        truncateAfterCompaction: true, // 压缩后轮转到更小的后继 JSONL
        maxActiveTranscriptBytes: "20mb", // 可选的本地压缩预检触发阈值
        notifyUser: true, // 在压缩开始/完成以及 memory-flush 降级时通知用户（默认：false）
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // 可选的仅 memory-flush 模型覆盖
          softThresholdTokens: 6000,
          forceFlushTranscriptBytes: "2mb",
          systemPrompt: "会话接近压缩。现在存储持久化记忆。",
          prompt: "将任何持久性笔记写入 memory/YYYY-MM-DD.md；如果没有需要存储的内容，请以确切的静默标记 NO_REPLY 回复。",
        },
      },
    },
  },
}
```

- `mode`: `default` 或 `safeguard`（用于长历史的分块摘要）。参见 [压缩](/concepts/compaction)。
- `provider`: 已注册的压缩提供程序插件的 id。设置后，会调用该提供程序的 `summarize()`，而不是内置的 LLM 摘要。失败时回退到内置实现。设置 provider 会强制 `mode: "safeguard"`。参见 [压缩](/concepts/compaction)。
- `timeoutSeconds`: OpenClaw 在放弃单次压缩操作前允许的最长秒数。默认：`180`。
- `reserveTokens`: 压缩后为模型输出和未来工具结果保留的 token 余量。当模型上下文窗口已知时，OpenClaw 会限制有效预留，避免其占用提示预算。
- `reserveTokensFloor`: 嵌入式运行时强制执行的最小预留。设为 `0` 可禁用该下限。该下限仍受当前上下文窗口上限约束。
- `keepRecentTokens`: 代理切点预算，用于逐字保留最新的会话尾部。手动 `/compact` 在显式设置时会遵循此项；否则手动压缩是一个硬检查点。
- `recentTurnsPreserve`: 在 safeguard 摘要之外逐字保留的最近用户/助手轮次数。默认：`3`。
- `maxHistoryShare`: 压缩后保留历史允许占用总上下文预算的最大比例（范围 `0.1`-`0.9`）。
- `identifierPolicy`: `strict`（默认）、`off` 或 `custom`。`strict` 在压缩摘要期间前置内置的、不可见标识符保留指导。
- `identifierInstructions`: 当 `identifierPolicy=custom` 时使用的可选自定义标识符保留文本。
- `qualityGuard`: 针对有误输出的 safeguard 摘要重试检查。默认在 safeguard 模式下启用；将 `enabled: false` 设为跳过审计。
- `midTurnPrecheck`: 可选的工具循环压力检查。当 `enabled: true` 时，OpenClaw 会在附加工具结果后、下一次模型调用前检查上下文压力。如果上下文已无法容纳，它会在提交提示前中止当前尝试，并复用现有的预检恢复路径来截断工具结果或执行压缩后重试。适用于 `default` 和 `safeguard` 两种压缩模式。默认：禁用。
- `postIndexSync`: 压缩后会话记忆重建索引模式。默认：`"async"`。使用 `"await"` 可获得最强的新鲜度，使用 `"async"` 可降低压缩延迟，仅在会话记忆同步由其他地方处理时使用 `"off"`。
- `postCompactionSections`: 压缩后可选重注入的 AGENTS.md H2/H3 章节名称。未设置或设为 `[]` 时禁用重注入。显式设置 `["Session Startup", "Red Lines"]` 会启用这对章节，并保留旧版 `Every Session`/`Safety` 回退。仅在额外上下文值得冒重复项目指导（这些指导已包含在压缩摘要中）风险时启用此项。
- `model`: 仅用于压缩摘要的可选 `provider/model-id`，或来自 `agents.defaults.models` 的裸别名。裸别名会在分发前解析；冲突时，已配置的字面模型 ID 优先。当前会话若希望继续使用一个模型，而压缩摘要希望使用另一个模型时可用此项；未设置时，压缩将使用会话的主模型。
- `truncateAfterCompaction`: 压缩后轮转当前会话转录，使未来轮次仅加载摘要和未摘要的尾部，同时保留之前的完整转录归档。防止长时间运行会话中的活跃转录无限增长。默认：`false`。
- `maxActiveTranscriptBytes`: 可选字节阈值（`number` 或如 `"20mb"` 的字符串），当转录历史增长超过该阈值时，会在运行前触发常规本地压缩。需要 `truncateAfterCompaction`，以便成功压缩后轮转到更小的后继转录。未设置或为 `0` 时禁用。
- `notifyUser`: 当为 `true` 时，向用户发送简短的上下文维护通知：压缩开始和完成时（例如，“正在压缩上下文...”和“压缩完成”），以及预压缩 memory flush 耗尽、回复改为降级继续时（例如，“内存维护暂时失败；继续处理你的回复。”）。默认禁用，以保持这些通知静默。
- `memoryFlush`: 在自动压缩前进行的静默代理回合，用于存储持久化记忆。若此整理回合应保持在本地模型上，将 `model` 设置为精确的 provider/model，例如 `ollama/qwen3:8b`；该覆盖不会继承当前会话的回退链。`forceFlushTranscriptBytes` 会在转录大小达到阈值时强制刷新，即使 token 计数器已过时。工作区为只读时跳过。

### `agents.defaults.runRetries`

用于嵌入式代理运行时的外层运行循环重试迭代边界，以防在失败恢复期间出现无限执行循环。此设置仅适用于嵌入式代理运行时，不适用于 ACP 或 CLI 运行时。

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

在将内容发送给 LLM 之前，会从内存上下文中清理**旧的工具结果**。不会修改磁盘上的会话历史。默认禁用；设置 `mode: "cache-ttl"` 即可启用。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off (default) | cache-ttl
        ttl: "1h", // duration (ms/s/m/h), default unit: minutes; default: 5m
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

- `mode: "cache-ttl"` 会启用清理流程。
- `ttl` 控制清理多久可以再次运行一次（在上次缓存被触碰之后）。默认：`5m`。
- 清理会先对过大的工具结果进行软裁剪，然后在需要时对较旧的工具结果进行硬清除。
- `softTrimRatio` 和 `hardClearRatio` 接受 `0.0` 到 `1.0` 之间的值；配置校验会拒绝该范围之外的值。

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
      blockStreamingDefault: "off", // 开启 | 关闭
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200, breakPreference: "paragraph" },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // 关闭（默认） | 自然 | 自定义（使用 minMs/maxMs）
    },
  },
}
```

- 非 Telegram 频道需要显式设置 `*.streaming.block.enabled: true` 才能启用分块回复。QQ Bot 是个例外：它没有 `streaming.block` 相关键，且会默认流式发送分块回复，除非 `channels.qqbot.streaming.mode` 为 `"off"`。
- 频道覆盖：`channels.<channel>.streaming.block.coalesce`（以及按账号的变体）。Discord、Google Chat、Mattermost、MS Teams、Signal 和 Slack 的默认值为 `minChars: 1500` / `idleMs: 1000`。
- `blockStreamingChunk.breakPreference`：首选分块边界（`"paragraph" | "newline" | "sentence"`）。
- `humanDelay`：分块回复之间的随机暂停。默认值：`off`。`natural` = 800-2500ms。`custom` 使用 `minMs`/`maxMs`（若某个边界未设置，则回退到自然范围）。按代理覆盖：`agents.list[].humanDelay`。

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

- 默认值：直接聊天/提及时为 `instant`，未提及的群聊为 `message`。
- `typingIntervalSeconds` 默认值：`6`。
- 每个会话的覆盖项：`session.typingMode`、`session.typingIntervalSeconds`。

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

**沙箱浏览器** (`sandbox.browser.enabled`, 默认 `false`): 容器中的 Chromium + CDP。noVNC URL 会注入到系统提示词中。无需在 `openclaw.json` 中设置 `browser.enabled`。
noVNC 观察者访问默认使用 VNC 认证，OpenClaw 会发出一个短期有效的令牌 URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）会阻止沙箱会话把目标指向宿主机浏览器。
- `network` 默认是 `openclaw-sandbox-browser`（专用 bridge 网络）。仅当你明确希望使用全局 bridge 连通性时才设置为 `bridge`。这里的 `"host"` 也会被阻止。
- `cdpSourceRange` 可选地将容器边缘的 CDP 入站限制到一个 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将额外的宿主目录挂载到沙箱浏览器容器中。设置后（包括 `[]`），它会替换浏览器容器的 `docker.binds`。
- 沙箱浏览器容器中的 Chromium 始终以 `--no-sandbox --disable-setuid-sandbox` 启动（容器不具备 Chrome 自身沙箱所需的内核原语）；此项没有配置开关。
- 启动默认值定义在 `scripts/sandbox-browser-entrypoint.sh` 中，并针对容器主机进行了调优：
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

### `agents.list`（逐代理覆盖）

使用 `agents.list[].tts` 为某个代理提供其自己的 TTS 提供方、语音、模型、风格或自动 TTS 模式。代理块会在全局 `messages.tts` 之上进行深度合并，因此共享凭据可以保留在一个地方，而各个代理只覆盖它们需要的语音或提供方字段。当前活动代理的覆盖会应用于自动语音回复、`/tts audio`、`/tts status` 和 `tts` 代理工具。提供方示例和优先级请参见 [文字转语音](/tools/tts#per-agent-voice-overrides)。

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

- `id`：稳定的代理 ID（必需）。
- `default`：当设置多个时，最先出现的生效（会记录警告）。如果未设置，则列表中的第一项为默认。
- `model`：字符串形式会将该代理的主模型严格设置为单一模型，不包含模型回退；对象形式 `{ primary }` 也同样是严格模式，除非你添加 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 可为该代理启用回退，或使用 `{ primary, fallbacks: [] }` 明确指定严格行为。只覆盖 `primary` 的 Cron 任务仍会继承默认回退，除非你设置 `fallbacks: []`。
- `utilityModel`：可选的每代理覆盖，用于生成会话标题和线程标题等短内部任务。若未设置，则依次回退到 `agents.defaults.utilityModel`、主提供方声明的小模型默认值，然后回退到该代理的主模型。空字符串会为该代理禁用 utility 路由。
- `params`：每代理流参数，基于 `agents.defaults.models` 中所选模型条目进行合并。可用于像 `cacheRetention`、`temperature` 或 `maxTokens` 之类的代理特定覆盖，而无需重复整个模型目录。
- `tts`：可选的每代理文字转语音覆盖。该块会在 `messages.tts` 之上进行深度合并，因此请将共享的提供方凭据和回退策略保留在 `messages.tts` 中，并仅在此处设置角色专属值，如提供方、语音、模型、风格或自动模式。
- `skills`：可选的每代理技能白名单。如果省略，则在设置了 `agents.defaults.skills` 时继承该默认值；显式列表会替换默认值而不是合并，`[]` 表示没有技能。
- `thinkingDefault`：可选的每代理默认 thinking 级别（`off | minimal | low | medium | high | xhigh | adaptive | max`）。当未设置每条消息或会话覆盖时，它会覆盖该代理的 `agents.defaults.thinkingDefault`。所选提供方/模型配置决定哪些值有效；对于 Google Gemini，`adaptive` 会保持由提供方控制的动态 thinking（Gemini 3/3.1 上省略 `thinkingLevel`，Gemini 2.5 上使用 `thinkingBudget: -1`）。
- `reasoningDefault`：可选的每代理默认 reasoning 可见性（`on | off | stream`）。当未设置每条消息或会话 reasoning 覆盖时，它会覆盖该代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可选的每代理快速模式默认值（`"auto" | true | false`）。当未设置每条消息或会话快速模式覆盖时适用。
- `models`：可选的每代理模型目录/运行时覆盖，按完整的 `provider/model` ID 作为键。对每代理运行时例外情况使用 `models["provider/model"].agentRuntime`。
- `runtime`：可选的每代理运行时描述符。当代理应默认使用 ACP harness 会话时，使用 `type: "acp"` 并采用 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：相对于工作区的路径、`http(s)` URL 或 `data:` URI。
- 本地、相对于工作区的 `identity.avatar` 图片文件限制为 2 MB。`http(s)` URL 和 `data:` URI 不受本地文件大小限制检查。
- `identity` 会派生默认值：`ackReaction` 来自 `emoji`，`mentionPatterns` 来自 `name`/`emoji`。
- `subagents.allowAgents`：已配置代理 ID 的白名单，用于显式的 `sessions_spawn.agentId` 目标（`["*"]` = 任意已配置目标；默认：仅相同代理）。当自引用的 `agentId` 调用应被允许时，请包含请求者自身的 ID。已删除代理配置的过期条目会被 `sessions_spawn` 拒绝，并从 `agents_list` 中省略；运行 `openclaw doctor --fix` 可清理它们，或者如果该目标仍应可被 spawn 且继承默认值，则添加一个最小的 `agents.list[]` 条目。
- 沙盒继承保护：如果请求者会话处于沙盒中，`sessions_spawn` 会拒绝那些会在非沙盒环境中运行的目标。
- `subagents.requireAgentId`：为 `true` 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置；默认：`false`）。
- `subagents.maxConcurrent`：子代理执行过程中最大并发子代理运行数。默认：`8`。
- `subagents.maxChildrenPerAgent`：单个代理会话可生成的最大活动子级数量。默认：`5`。
- `subagents.maxSpawnDepth`：子代理生成的最大嵌套深度（`1`-`5`）。默认：`1`（不嵌套）。
- `subagents.archiveAfterMinutes`：完成的子代理状态在归档前的最长存活时间。默认：`60`。

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
    writeLock: {
      acquireTimeoutMs: 60000,
      staleMs: 1800000,
      maxHoldMs: 300000,
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

- **`scope`**: 群聊上下文的基础会话分组策略。
  - `per-sender`（默认）：在频道上下文中，每个发送者获得一个隔离的会话。
  - `global`：频道上下文中的所有参与者共享单个会话（仅在确实需要共享上下文时使用）。
- **`dmScope`**: DM 的分组方式。
  - `main`：所有 DM 共享主会话。
  - `per-peer`：按发送者 id 跨频道隔离。
  - `per-channel-peer`：按频道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`：按账号 + 频道 + 发送者隔离（推荐用于多账号场景）。
- **`identityLinks`**: 将规范化 id 映射到带提供方前缀的对端，以便跨频道共享会话。诸如 `/dock_discord` 之类的 Dock 命令会使用同一映射，将当前会话的回复路由切换到另一个已关联的频道对端；参见 [Channel docking](/concepts/channel-docking)。
- **`reset`**: 主要重置策略。`daily` 在本地时间 `atHour` 重置；`idle` 在 `idleMinutes` 之后重置。当两者都配置时，先到期者生效。每日重置的“新鲜度”使用会话行的 `sessionStartedAt`；空闲重置的“新鲜度”使用 `lastInteractionAt`。诸如心跳、cron 唤醒、exec 通知以及网关账务记录等后台/系统事件写入可能会更新 `updatedAt`，但不会让每日/空闲会话保持新鲜。
- **`resetByType`**: 按类型覆盖（`direct`、`group`、`thread`）。旧的 `dm` 也可作为 `direct` 的别名。
- **`resetByChannel`**: 以提供方/频道 id 为键的按频道重置覆盖。当会话所属频道有匹配项时，它会完全优先于该会话的 `resetByType`/`reset`。仅在某个频道需要与类型级策略不同的重置行为时使用。
- **`mainKey`**: 旧字段。运行时始终使用 `"main"` 作为主直接聊天桶。
- **`agentToAgent.maxPingPongTurns`**: 代理之间在 agent-to-agent 交互期间的最大来回回复轮数（整数，范围：`0`-`20`，默认：`5`）。`0` 会禁用乒乓链式回复。
- **`sendPolicy`**: 按 `channel`、`chatType`（`direct|group|channel`，旧的 `dm` 可作为别名）、`keyPrefix` 或 `rawKeyPrefix` 匹配。先匹配到的 deny 生效。
- **`maintenance`**: 会话存储清理 + 保留控制。
  - `mode`：`enforce` 会执行清理，是默认值；`warn` 仅发出警告。
  - `pruneAfter`：陈旧条目的年龄阈值（默认 `30d`）。
  - `maxEntries`：SQLite 会话条目的最大数量（默认 `500`）。运行时写入会通过小型高水位缓冲进行批量清理，以适配生产规模的上限；`openclaw sessions cleanup --enforce` 会立即应用该上限。
  - 短生命周期的网关模型运行探测会话使用固定的 `24h` 保留期，但清理受压力门控：仅当达到会话条目维护/容量压力时，才会移除陈旧的严格模型运行探测行。只有匹配 `agent:*:explicit:model-run-<uuid>` 的严格显式探测键才有资格；普通的 direct、group、thread、cron、hook、heartbeat、ACP 以及子代理会话不会继承这个 24h 保留期。模型运行清理触发时，会先于更广泛的 `pruneAfter` 陈旧条目清理和 `maxEntries` 上限执行。
  - 旧的 `rotateBytes` 会被当前 schema 拒绝；`openclaw doctor --fix` 会将其从旧配置中移除。
  - `resetArchiveRetention`：`*.reset.<timestamp>` 转录归档的保留期。默认值为 `pruneAfter`；设为 `false` 可禁用。
  - `maxDiskBytes`：可选的 sessions 目录磁盘预算。在 `warn` 模式下只记录警告；在 `enforce` 模式下会优先移除最旧的工件/会话。
  - `highWaterBytes`：预算清理后的可选目标值。默认是 `maxDiskBytes` 的 `80%`。
- **`writeLock`**: 会话转录写锁控制。仅在合法的转录准备、清理、压缩或镜像工作与默认策略的争用时间更长时才需要调整。
  - `acquireTimeoutMs`：获取锁时等待的毫秒数，超时后将会话报告为繁忙。默认：`60000`；环境变量覆盖：`OPENCLAW_SESSION_WRITE_LOCK_ACQUIRE_TIMEOUT_MS`。
  - `staleMs`：现有锁在被视为陈旧并回收之前的毫秒数。默认：`1800000`；环境变量覆盖：`OPENCLAW_SESSION_WRITE_LOCK_STALE_MS`。
  - `maxHoldMs`：持有中的进程内锁在被 watchdog 释放之前可持续持有的毫秒数。默认：`300000`；环境变量覆盖：`OPENCLAW_SESSION_WRITE_LOCK_MAX_HOLD_MS`。
- **`threadBindings`**: 线程绑定会话功能的全局默认值。
  - `enabled`：主默认开关（提供方可以覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`：默认空闲自动取消聚焦时长（小时）（`0` 禁用；提供方可以覆盖）
  - `maxAgeHours`：默认硬性最大时长（小时）（`0` 禁用；提供方可以覆盖）
  - `spawnSessions`：从 `sessions_spawn` 和 ACP 线程派生创建线程绑定工作会话的默认门控。在线程绑定启用时默认为 `true`；提供方/账号可以覆盖。
  - `defaultSpawnContext`：线程绑定派生的默认原生子代理上下文（`"fork"` 或 `"isolated"`）。默认值为 `"fork"`。

</Accordion>

---

## 消息

```json5
{
  messages: {
    responsePrefix: "🦞", // 或 "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all | off | none
    removeAckAfterReply: false,
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

- 默认使用活跃代理的 `identity.emoji`，否则为 `"👀"`。设置为 `""` 可禁用。
- 按频道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：账户 → 频道 → `messages.ackReaction` → 身份回退。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`，或 `off`/`none`（完全禁用确认反应）。
- `removeAckAfterReply`：在支持反应的频道（如 Slack、Discord、Signal、Telegram、WhatsApp 和 iMessage）中，在回复后移除确认反应。
- `messages.statusReactions.enabled`：在 Slack、Discord、Signal、Telegram 和 WhatsApp 上启用生命周期状态反应。
  在 Discord 上，若未设置，则在确认反应启用时仍保持状态反应启用。
  在 Slack、Signal、Telegram 和 WhatsApp 上，需显式设为 `true` 才会启用生命周期状态反应。
  Slack 默认使用其原生助手线程状态和轮换加载消息来显示进度，同时保持已配置的确认反应静态不变。
- `messages.statusReactions.emojis`：覆盖生命周期表情键：
  `queued`、`thinking`、`compacting`、`tool`、`coding`、`web`、`deploy`、`build`、
  `concierge`、`done`、`error`、`stallSoft` 和 `stallHard`。
  Telegram 仅允许固定的反应集合，因此不受支持的已配置表情会回退为该聊天中最接近支持的状态变体。

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

- `messages.messagePrefix`：在传入用户消息到达代理运行时之前，预先添加的前缀文本。请谨慎使用，用于频道上下文标记。
- `messages.visibleReplies`：控制直接、群组和频道会话中的可见源回复（`"message_tool"` 需要 `message(action=send)` 才能产生可见输出；`"automatic"` 则像以前一样发布正常回复）。
- `messages.usageTemplate` / `messages.responseUsage`：自定义 `/usage` 页脚模板，以及每次回复的默认使用量模式（`off | tokens | full`，另有旧版 `on` 别名表示 `tokens`）。
- `messages.groupChat.mentionPatterns` / `historyLimit`：群组消息的提及触发规则和历史窗口大小。
- `messages.suppressToolErrors`：设为 `true` 时，抑制向用户显示的 `⚠️` 工具错误警告（代理仍会在上下文中看到错误并可重试）。默认：`false`。

### TTS（文本转语音）

```json5
{
  messages: {
    tts: {
      auto: "off", // off (默认) | always | inbound | tagged
      mode: "final", // final | all
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
          speakerVoice: "en-US-MichelleNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          speakerVoice: "coral",
        },
      },
    },
  },
}
```

- `auto` 控制默认的自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可覆盖本地偏好，`/tts status` 会显示生效状态。
- `summaryModel` 会为自动摘要覆盖 `agents.defaults.model.primary`。
- `modelOverrides` 默认启用（`enabled !== false`）；`modelOverrides.allowProvider` 需要显式启用。
- API 密钥会回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 内置语音提供方由插件拥有。如果设置了 `plugins.allow`，请包含你想使用的每个 TTS 提供方插件，例如用于 Edge TTS 的 `microsoft`。旧版 `edge` 提供方 ID 可作为 `microsoft` 的别名接受。
- `providers.openai.baseUrl` 会覆盖 OpenAI TTS 端点。解析顺序为配置，其次是 `OPENAI_TTS_BASE_URL`，最后是 `https://api.openai.com/v1`。
- 当 `providers.openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 会将其视为兼容 OpenAI 的 TTS 服务器，并放宽模型/语音校验。

---

## Talk

Talk 模式的默认值（macOS/iOS/Android 和浏览器 Control UI）。

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

- 当配置了多个 Talk provider 时，`talk.provider` 必须与 `talk.providers` 中的一个键匹配。
- 旧的扁平化 Talk 键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容。运行 `openclaw doctor --fix` 可将持久化配置重写为 `talk.providers.<provider>`。
- Voice ID 会回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`（macOS Talk 客户端行为）。
- `providers.*.apiKey` 接受明文字符串或 SecretRef 对象。
- `ELEVENLABS_API_KEY` 回退仅在未配置 Talk API key 时生效。
- `providers.*.voiceAliases` 允许 Talk 指令使用友好的名称。
- `providers.mlx.modelId` 选择 macOS 本地 MLX helper 使用的 Hugging Face 仓库。如果省略，macOS 将使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放会通过内置的 `openclaw-mlx-tts` helper（如果存在）运行，或者通过 `PATH` 上的可执行文件运行；`OPENCLAW_MLX_TTS_BIN` 会覆盖开发环境中的 helper 路径。
- `consultThinkingLevel` 控制 Control UI Talk realtime `openclaw_agent_consult` 调用背后完整 OpenClaw agent 运行时的思考等级。留空可保留正常的 session/model 行为。
- `consultFastMode` 为 Control UI Talk realtime consult 设置一次性的 fast-mode 覆盖，而不更改 session 的正常 fast-mode 设置。
- `speechLocale` 设置 iOS/macOS Talk 语音识别使用的 BCP 47 locale id。留空则使用设备默认值。
- `silenceTimeoutMs` 控制 Talk 模式在用户静音后等待多长时间才发送转录。留空则保持平台默认的暂停窗口（`macOS 和 Android 上为 700 ms，iOS 上为 900 ms`）。
- `realtime.instructions` 将面向 provider 的系统指令追加到 OpenClaw 内置的 realtime 提示词中，这样可以在不丢失默认 `openclaw_agent_consult` 指导的情况下配置语音风格。
- `realtime.vadThreshold` 将 provider 的语音活动阈值设置为从 `0`（最敏感）到 `1`（最不敏感）。留空则保持 provider 默认值。
- `realtime.silenceDurationMs` 设置 provider 在提交实时用户轮次前的正整数静音窗口。留空则保持 provider 默认值。
- `realtime.prefixPaddingMs` 设置在检测到语音开始前保留的非负整数音频时长。留空则保持 provider 默认值。
- `realtime.reasoningEffort` 为 realtime 会话设置 provider 特定的推理等级。留空则保持 provider 默认值。
- `realtime.consultRouting`: `"provider-direct"`（默认）在 realtime provider 产生最终用户转录且未经过 `openclaw_agent_consult` 时，保留 provider 的直接回复。`"force-agent-consult"` 则将最终请求路由通过 OpenClaw。

## 相关

- [配置参考](/gateway/configuration-reference) — 其他所有配置键
- [配置](/gateway/configuration) — 常见任务和快速设置
- [配置示例](/gateway/configuration-examples)
