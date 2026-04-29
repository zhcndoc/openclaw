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

默认值：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

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

### `agents.defaults.contextInjection`

控制工作区引导文件何时注入到系统提示词中。默认值：`"always"`。

- `"continuation-skip"`：安全的续接轮次（在完成一次助手回复之后）会跳过工作区引导的重新注入，从而减小提示词大小。心跳运行和压缩后重试仍会重建上下文。
- `"never"`：在每一轮都禁用工作区引导和上下文文件注入。仅适用于完全自行管理提示词生命周期的代理（自定义上下文引擎、自己构建上下文的原生运行时，或专门的无引导工作流）。心跳和压缩恢复轮次也会跳过注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

每个工作区引导文件的最大字符数，超过后截断。默认值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

跨所有工作区引导文件注入的最大总字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

控制当引导上下文被截断时，向代理可见的警告文本。默认值：`"once"`。

- `"off"`：从不将警告文本注入系统提示词。
- `"once"`：按每个唯一的截断签名注入一次警告（推荐）。
- `"always"`：只要存在截断，就在每次运行时注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
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
        toolResultMaxChars: 16000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`：`memory_get` 摘录在添加截断元数据和续接提示前的默认上限。
- `memoryGetDefaultLines`：省略 `lines` 时，`memory_get` 的默认行窗口。
- `toolResultMaxChars`：用于持久化结果和溢出恢复的实时工具结果上限。
- `postCompactionMaxChars`：压缩后刷新注入期间使用的 AGENTS.md 摘录上限。

#### `agents.list[].contextLimits`

针对共享 `contextLimits` 开关的逐代理覆盖。省略的字段会继承自 `agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        toolResultMaxChars: 16000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000,
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
      agentRuntime: {
        id: "pi", // pi | auto | 已注册的 harness id，例如 codex
        fallback: "pi", // pi | none
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
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

- `model`：可接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式只设置主模型。
  - 对象形式设置主模型及按顺序回退的模型。
- `imageModel`：可接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `image` 工具路径用作其视觉模型配置。
  - 当所选/默认模型无法接受图像输入时，也用于回退路由。
  - 优先使用显式的 `provider/model` 引用。为兼容性也接受裸 ID；如果某个裸 ID 能唯一匹配 `models.providers.*.models` 中配置的具备图像能力条目，OpenClaw 会将其限定到该提供方。若存在歧义匹配，则需要显式的提供方前缀。
- `imageGenerationModel`：可接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享图像生成能力以及任何未来生成图像的工具/插件界面使用。
  - 常见值：用于原生 Gemini 图像生成的 `google/gemini-3.1-flash-image-preview`，用于 fal 的 `fal/fal-ai/flux/dev`，用于 OpenAI Images 的 `openai/gpt-image-2`，或者用于 OpenAI PNG/WebP 透明背景输出的 `openai/gpt-image-1.5`。
  - 如果你直接选择某个提供方/模型，也要配置匹配的提供方认证，例如 `google/*` 使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/gpt-image-2` / `openai/gpt-image-1.5` 使用 `OPENAI_API_KEY` 或 OpenAI Codex OAuth，`fal/*` 使用 `FAL_KEY`。
  - 如果省略，`image_generate` 仍可推断出一个带认证的提供方默认值。它会先尝试当前默认提供方，然后按提供方 ID 顺序尝试其余已注册的图像生成提供方。
- `musicGenerationModel`：可接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享音乐生成能力和内置的 `music_generate` 工具使用。
  - 常见值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍可推断出一个带认证的提供方默认值。它会先尝试当前默认提供方，然后按提供方 ID 顺序尝试其余已注册的音乐生成提供方。
  - 如果你直接选择某个提供方/模型，也要配置匹配的提供方认证/API 密钥。
- `videoGenerationModel`：可接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享视频生成能力和内置的 `video_generate` 工具使用。
  - 常见值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍可推断出一个带认证的提供方默认值。它会先尝试当前默认提供方，然后按提供方 ID 顺序尝试其余已注册的视频生成提供方。
  - 如果你直接选择某个提供方/模型，也要配置匹配的提供方认证/API 密钥。
  - 捆绑的 Qwen 视频生成提供方支持最多 1 个输出视频、1 张输入图像、4 个输入视频、10 秒时长，以及提供方级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：可接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 供 `pdf` 工具进行模型路由。
  - 如果省略，PDF 工具会先回退到 `imageModel`，再回退到已解析的会话/默认模型。
- `pdfMaxBytesMb`：在调用时未传入 `maxBytesMb` 时，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具在提取回退模式下默认考虑的最大页数。
- `verboseDefault`：代理的默认详细级别。取值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `reasoningDefault`：代理的默认推理可见性。取值：`"off"`、`"on"`、`"stream"`。逐代理 `agents.list[].reasoningDefault` 会覆盖此默认值。只有在未设置逐消息或会话推理覆盖时，配置的推理默认值才会应用于所有者、授权发送者或 operator-admin 网关上下文。
- `elevatedDefault`：代理的默认提升输出级别。取值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式为 `provider/model`（例如 `openai/gpt-5.5` 用于 API-key 访问，或 `openai-codex/gpt-5.5` 用于 Codex OAuth）。如果省略提供方，OpenClaw 会先尝试别名，然后尝试该精确模型 ID 的唯一已配置提供方匹配，最后才回退到已配置的默认提供方（已弃用的兼容行为，因此建议显式使用 `provider/model`）。如果该提供方不再提供已配置的默认模型，OpenClaw 会回退到第一个已配置的提供方/模型，而不是暴露一个过时的、已移除提供方的默认值。
- `models`：为 `/model` 配置的模型目录和白名单。每个条目可包含 `alias`（快捷名）和 `params`（提供方特定，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 安全编辑：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 来添加条目。`config set` 会拒绝会移除现有白名单条目的替换，除非你传入 `--replace`。
  - 作用域在提供方内的配置/入职流程会将所选提供方模型合并到此映射中，并保留已经配置的无关提供方。
  - 对于直接的 OpenAI Responses 模型，会自动启用服务端压缩。使用 `params.responsesServerCompaction: false` 可停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆盖阈值。参见 [OpenAI 服务端压缩](/providers/openai#server-side-compaction-responses-api)。
- `params`：应用于所有模型的全局默认提供方参数。设置于 `agents.defaults.params`（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础）会被 `agents.defaults.models["provider/model"].params`（按模型）覆盖，然后 `agents.list[].params`（匹配的代理 id）按键覆盖。详情参见 [提示词缓存](/reference/prompt-caching)。
- `params.extra_body`/`params.extraBody`：高级透传 JSON，会并入 OpenAI 兼容代理的 `api: "openai-completions"` 请求体中。如果它与生成的请求键冲突，额外体将获胜；非原生 completions 路由之后仍会移除仅 OpenAI 专属的 `store`。
- `params.chat_template_kwargs`：vLLM/OpenAI 兼容的 chat-template 参数，会并入顶层 `api: "openai-completions"` 请求体中。对于 `vllm/nemotron-3-*` 且关闭思考时，捆绑的 vLLM 插件会自动发送 `enable_thinking: false` 和 `force_nonempty_content: true`；显式的 `chat_template_kwargs` 会覆盖生成的默认值，而 `extra_body.chat_template_kwargs` 仍然具有最终优先级。对于 vLLM Qwen 思考控制，请在该模型条目上将 `params.qwenThinkingFormat` 设为 `"chat-template"` 或 `"top-level"`。
- `compat.supportedReasoningEfforts`：每个模型的 OpenAI 兼容推理强度列表。对真正接受它的自定义端点加入 `"xhigh"`；OpenClaw 随后会在命令菜单、Gateway 会话行、会话补丁验证、代理 CLI 验证以及该已配置提供方/模型的 `llm-task` 验证中公开 `/think xhigh`。当后端希望某个规范级别对应提供方特定值时，使用 `compat.reasoningEffortMap`。
- `params.preserveThinking`：仅适用于 Z.AI 的保留思考开关。启用后并且思考开启时，OpenClaw 会发送 `thinking.clear_thinking: false` 并重放先前的 `reasoning_content`；参见 [Z.AI 思考与保留思考](/providers/zai#thinking-and-preserved-thinking)。
- `agentRuntime`：默认的底层代理运行时策略。省略 `id` 时默认为 OpenClaw Pi。对于受信任的插件提供原生 harness 时使用它，例如捆绑的 Codex app-server harness，或当你希望使用受支持的 CLI 后端（如 Claude CLI）时使用它。关于这一点的心智模型，请参见 [代理运行时](/concepts/agent-runtimes)。
- 修改这些字段的配置写入器（例如 `/models set`、`/models set-image` 以及 fallback 的添加/删除命令）会保存规范对象形式，并在可能时保留现有回退列表。
- `maxConcurrent`：跨会话的代理并行运行最大数量（每个会话仍然是串行的）。默认值：`4`。

### `agents.defaults.agentRuntime`

`agentRuntime` 控制哪个底层执行器运行代理轮次。大多数部署应保留默认的 OpenClaw Pi 运行时。当受信任的插件提供原生 harness 时使用它，例如捆绑的 Codex app-server harness，或者当你想使用受支持的 CLI 后端如 Claude CLI 时使用它。关于心智模型，请参见 [代理运行时](/concepts/agent-runtimes)。

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
    },
  },
}
```

- `id`：`"auto"`、`"pi"`、已注册的插件 harness id，或受支持的 CLI 后端别名。捆绑的 Codex 插件注册了 `codex`；捆绑的 Anthropic 插件提供了 `claude-cli` CLI 后端。
- `fallback`：`"pi"` 或 `"none"`。在 `id: "auto"` 时，省略的 fallback 默认是 `"pi"`，这样当没有插件 harness 认领某次运行时，旧配置仍可继续使用 PI。在显式插件运行时模式中，例如 `id: "codex"`，省略的 fallback 默认是 `"none"`，这样缺失的 harness 会直接失败，而不是悄悄使用 PI。运行时覆盖不会从更宽的作用域继承 fallback；当你有意希望使用这种兼容回退时，请在显式运行时旁边设置 `fallback: "pi"`。所选插件 harness 的失败会始终直接暴露。
- 环境变量覆盖：`OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` 覆盖 `id`；`OPENCLAW_AGENT_HARNESS_FALLBACK=pi|none` 覆盖该进程的 fallback。
- 对于仅 Codex 的部署，设置 `model: "openai/gpt-5.5"` 和 `agentRuntime.id: "codex"`。你也可以明确设置 `agentRuntime.fallback: "none"` 以增强可读性；这对显式插件运行时来说是默认值。
- 对于 Claude CLI 部署，优先使用 `model: "anthropic/claude-opus-4-7"` 并设置 `agentRuntime.id: "claude-cli"`。旧式的 `claude-cli/claude-opus-4-7` 模型引用仍可用于兼容性，但新配置应保持 provider/model 选择规范，并将执行后端放入 `agentRuntime.id`。
- 旧的运行时策略键会被 `openclaw doctor --fix` 重写为 `agentRuntime`。
- harness 的选择会在第一次嵌入式运行后按会话 id 固定。配置/环境变量的更改只会影响新的或重置的会话，不影响已有转录。没有记录固定信息但有转录历史的旧会话会被视为 PI 固定。`/status` 会报告实际运行时，例如 `Runtime: OpenClaw Pi Default` 或 `Runtime: OpenAI Codex`。
- 这只控制文本代理轮次执行。媒体生成、视觉、PDF、音乐、视频和 TTS 仍使用各自的提供方/模型设置。

**内置别名快捷方式**（仅在模型位于 `agents.defaults.models` 中时适用）：

| 别名               | 模型                                       |
| ------------------ | ------------------------------------------ |
| `opus`              | `anthropic/claude-opus-4-6`                |
| `sonnet`           | `anthropic/claude-sonnet-4-6`              |
| `gpt`              | `openai/gpt-5.5` 或 `openai-codex/gpt-5.5` |
| `gpt-mini`         | `openai/gpt-5.4-mini`                      |
| `gpt-nano`         | `openai/gpt-5.4-nano`                      |
| `gemini`           | `google/gemini-3.1-pro-preview`            |
| `gemini-flash`     | `google/gemini-3-flash-preview`            |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview`     |

你配置的别名始终优先于默认值。

Z.AI GLM-4.x 模型会自动启用思考模式，除非你设置 `--thinking off` 或自行定义 `agents.defaults.models["zai/<model>"].params.thinking`。
Z.AI 模型默认启用 `tool_stream` 用于工具调用流式输出。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设为 `false` 可禁用它。
如果未显式设置思考级别，Anthropic Claude 4.6 模型默认使用 `adaptive` 思考。

### `agents.defaults.cliBackends`

用于纯文本回退运行（无工具调用）的可选 CLI 后端。适合作为 API 提供方失败时的备用方案。

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
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

- CLI 后端以文本优先；工具始终被禁用。
- 当设置了 `sessionArg` 时支持会话。
- 当 `imageArg` 接受文件路径时支持图像透传。

### `agents.defaults.systemPromptOverride`

用固定字符串替换整段由 OpenClaw 组装的系统提示词。可在默认级别（`agents.defaults.systemPromptOverride`）或逐代理级别（`agents.list[].systemPromptOverride`）设置。逐代理值优先；空值或仅空白字符的值会被忽略。适用于受控的提示词实验。

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "你是一个乐于助人的助手。",
    },
  },
}
```

### `agents.defaults.promptOverlays`

按模型家族应用、且与提供方无关的提示词覆盖。GPT-5 家族模型 ID 会跨提供方获得共享行为契约；`personality` 只控制友好交互风格层。

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
        every: "30m", // 0m disables
        model: "openai/gpt-5.4-mini",
        includeReasoning: false,
        includeSystemPromptSection: true, // default: true; false omits the Heartbeat section from the system prompt
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        skipWhenBusy: false, // default: false; true also waits for subagent/nested lanes
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "如果存在则读取 HEARTBEAT.md...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every`：持续时间字符串（ms/s/m/h）。默认值：`30m`（API key 认证）或 `1h`（OAuth 认证）。设为 `0m` 可禁用。
- `includeSystemPromptSection`：为 `false` 时，会从系统提示词中省略 Heartbeat 部分，并跳过将 `HEARTBEAT.md` 注入到引导上下文。默认值：`true`。
- `suppressToolErrorWarnings`：为 `true` 时，在心跳运行期间抑制工具错误警告载荷。
- `timeoutSeconds`：心跳代理轮次在被中止前允许的最长秒数。留空则使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/DM 传递策略。`allow`（默认）允许直接目标传递。`block` 会抑制直接目标传递并发出 `reason=dm-blocked`。
- `lightContext`：为 `true` 时，心跳运行使用轻量级引导上下文，并且仅保留 `HEARTBEAT.md` 作为工作区引导文件。
- `isolatedSession`：为 `true` 时，每次心跳都在一个没有先前对话历史的新会话中运行。与 cron 的 `sessionTarget: "isolated"` 相同的隔离模式。可将每次心跳的 token 成本从约 100K 降到约 2-5K。
- `skipWhenBusy`：为 `true` 时，心跳会在额外繁忙通道上延后：子代理或嵌套命令工作。Cron 通道始终会延后心跳，即使没有此标志。
- 逐代理：设置 `agents.list[].heartbeat`。当任一代理定义了 `heartbeat` 时，**只有这些代理**会运行心跳。
- 心跳会运行完整的代理轮次——间隔越短，消耗的 token 越多。

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
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
        model: "openrouter/anthropic/claude-sonnet-4-6", // 可选的仅压缩模型覆盖
        truncateAfterCompaction: true, // 压缩后轮转到更小的后继 JSONL
        maxActiveTranscriptBytes: "20mb", // 可选的本地预检压缩触发条件
        notifyUser: true, // 当压缩开始和完成时发送简短通知（默认：false）
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

- `mode`：`default` 或 `safeguard`（用于长历史记录的分块摘要）。参见 [压缩](/concepts/compaction)。
- `provider`：已注册压缩提供方插件的 id。设置后，会调用该提供方的 `summarize()`，而不是内置的 LLM 摘要。失败时回退到内置实现。设置提供方会强制 `mode: "safeguard"`。参见 [压缩](/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 在中止一次压缩操作之前允许的最大秒数。默认值：`900`。
- `keepRecentTokens`：Pi 截断点预算，用于原样保留最新的转录尾部。手动 `/compact` 在显式设置时会遵守此项；否则手动压缩是一个硬检查点。
- `identifierPolicy`：`strict`（默认）、`off` 或 `custom`。`strict` 在压缩摘要期间预置内置的 opaque 标识符保留指导。
- `identifierInstructions`：当 `identifierPolicy=custom` 时使用的可选自定义标识符保留文本。
- `qualityGuard`：针对 safeguard 摘要的错误输出重试检查。safeguard 模式下默认启用；设为 `enabled: false` 可跳过审计。
- `postCompactionSections`：可选的 AGENTS.md 二级/三级标题名称，在压缩后重新注入。默认值为 `["Session Startup", "Red Lines"]`；设为 `[]` 可禁用重新注入。未设置或显式设为该默认对时，较旧的 `Every Session`/`Safety` 标题也会作为遗留回退被接受。
- `model`：仅用于压缩摘要的可选 `provider/model-id` 覆盖。当主会话应保持一个模型，但压缩摘要应在另一个模型上运行时使用；未设置时，压缩会使用会话的主模型。
- `maxActiveTranscriptBytes`：可选的字节阈值（数字或像 `"20mb"` 这样的字符串），当活动 JSONL 超过阈值时，会在运行前触发正常的本地压缩。需要 `truncateAfterCompaction`，这样成功压缩后可轮转到更小的后继转录。未设置或为 `0` 时禁用。
- `notifyUser`：为 `true` 时，在压缩开始和完成时向用户发送简短通知（例如“正在压缩上下文…”和“压缩完成”）。默认禁用，以保持压缩静默。
- `memoryFlush`：自动压缩前的静默代理轮次，用于存储持久化记忆。当此清理轮次应保持在本地模型上时，将 `model` 设为精确的 provider/model，例如 `ollama/qwen3:8b`；该覆盖不会继承活动会话的回退链。工作区只读时跳过。

### `agents.defaults.contextPruning`

在发送给 LLM 之前，从内存上下文中清理**旧的工具结果**。不会修改磁盘上的会话历史。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // duration (ms/s/m/h), default unit: minutes
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
- `ttl` 控制清理在上一次缓存触碰后多久可以再次运行。
- 清理会先对过大的工具结果进行软裁剪，然后在需要时对较旧的工具结果进行硬清除。

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
      humanDelay: { mode: "natural" }, // off | natural | custom (use minMs/maxMs)
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
          gateway: "lab", // optional
          gatewayEndpoint: "https://lab.example", // optional
          policy: "strict", // optional OpenShell policy id
          providers: ["openai"], // optional
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

**容器默认使用 `network: "none"`** —— 如果代理需要外部访问，请设置为 `"bridge"`（或自定义 bridge 网络）。
`"host"` 会被阻止。`"container:<id>"` 默认也会被阻止，除非你显式设置
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（紧急开关）。

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

构建镜像：

```bash
scripts/sandbox-setup.sh           # 主沙箱镜像
scripts/sandbox-browser-setup.sh   # 可选的浏览器镜像
```

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
        agentRuntime: { id: "auto", fallback: "pi" },
        params: { cacheRetention: "none" }, // 按键覆盖匹配的 defaults.models 参数
        tts: {
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
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

- `id`：稳定的代理 id（必需）。
- `default`：当设置多个时，第一个生效（会记录警告）。如果未设置，列表中的第一个条目为默认值。
- `model`：字符串形式会为该代理设置严格的主模型，不含模型回退；对象形式 `{ primary }` 也同样严格，除非你添加 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 可让该代理启用回退，或使用 `{ primary, fallbacks: [] }` 明确严格行为。仅覆盖 `primary` 的 cron 作业仍会继承默认回退，除非你设置 `fallbacks: []`。
- `params`：逐代理流式参数，会在 `agents.defaults.models` 中所选模型条目之上合并。用于代理特定覆盖，如 `cacheRetention`、`temperature` 或 `maxTokens`，而无需重复整个模型目录。
- `tts`：可选的逐代理文字转语音覆盖。该块会在 `messages.tts` 上进行深度合并，因此请将共享提供方凭据和回退策略保留在 `messages.tts` 中，只在这里设置特定角色值，例如提供方、语音、模型、风格或自动模式。
- `skills`：可选的逐代理技能白名单。如果省略，且已设置 `agents.defaults.skills`，则该代理会继承它；显式列表会替换默认值而不是合并，`[]` 表示无技能。
- `thinkingDefault`：可选的逐代理默认思考级别（`off | minimal | low | medium | high | xhigh | adaptive | max`）。当未设置逐消息或会话覆盖时，它会覆盖此代理的 `agents.defaults.thinkingDefault`。所选提供方/模型配置会控制哪些值有效；对于 Google Gemini，`adaptive` 会保留提供方自己的动态思考（Gemini 3/3.1 时省略 `thinkingLevel`，Gemini 2.5 时使用 `thinkingBudget: -1`）。
- `reasoningDefault`：可选的逐代理默认推理可见性（`on | off | stream`）。当未设置逐消息或会话推理覆盖时，它会覆盖此代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可选的逐代理快速模式默认值（`true | false`）。在未设置逐消息或会话快速模式覆盖时生效。
- `agentRuntime`：可选的逐代理底层运行时策略覆盖。使用 `{ id: "codex" }` 可让某个代理仅使用 Codex，而其他代理在 `auto` 模式下继续保留默认 PI 回退。
- `runtime`：可选的逐代理运行时描述符。当代理应默认使用 ACP harness 会话时，使用 `type: "acp"` 并设置 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：相对于工作区的路径、`http(s)` URL，或 `data:` URI。
- `identity` 会派生默认值：`ackReaction` 来自 `emoji`，`mentionPatterns` 来自 `name`/`emoji`。
- `subagents.allowAgents`：用于显式 `sessions_spawn.agentId` 目标的代理 id 白名单（`["*"]` = 任意；默认：仅同一代理）。当应允许自指向的 `agentId` 调用时，请包含请求者 id。
- 沙箱继承保护：如果请求者会话已在沙箱中，`sessions_spawn` 会拒绝那些会在未沙箱化状态下运行的目标。
- `subagents.requireAgentId`：为 `true` 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件；默认：`false`）。

---

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
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
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
    parentForkMaxTokens: 100000, // 超过此 token 数时跳过父线程分叉（0 表示禁用）
    maintenance: {
      mode: "warn", // warn | enforce
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

- **`scope`**：用于群聊上下文的基础会话分组策略。
  - `per-sender`（默认）：在一个频道上下文中，每个发送者拥有独立会话。
  - `global`：频道上下文中的所有参与者共享同一个会话（仅在需要共享上下文时使用）。
- **`dmScope`**：DM 的分组方式。
  - `main`：所有 DM 共享主会话。
  - `per-peer`：按跨频道的发送者 id 隔离。
  - `per-channel-peer`：按频道 + 发送者隔离（推荐用于多人收件箱）。
  - `per-account-channel-peer`：按账户 + 频道 + 发送者隔离（推荐用于多账户）。
- **`identityLinks`**：将规范 id 映射到带提供方前缀的 peer，用于跨频道会话共享。诸如 `/dock_discord` 之类的 Dock 命令也使用同一映射，将活动会话的回复路由切换到另一个已关联的频道 peer；参见 [Channel docking](/concepts/channel-docking)。
- **`reset`**：主要重置策略。`daily` 在本地时间 `atHour` 重置；`idle` 在 `idleMinutes` 后重置。当两者都配置时，先到期者生效。每日重置的新鲜度使用会话行的 `sessionStartedAt`；空闲重置的新鲜度使用 `lastInteractionAt`。诸如 heartbeat、cron 唤醒、exec 通知和 gateway 账本写入等后台/系统事件写入可能会更新 `updatedAt`，但不会让 daily/idle 会话保持“新鲜”。
- **`resetByType`**：按类型覆盖（`direct`、`group`、`thread`）。旧的 `dm` 也可作为 `direct` 的别名。
- **`parentForkMaxTokens`**：创建分叉线程会话时允许的父会话 `totalTokens` 上限（默认 `100000`）。
  - 如果父会话的 `totalTokens` 高于该值，OpenClaw 会启动一个全新的线程会话，而不是继承父会话的历史记录。
  - 设为 `0` 可禁用此保护并始终允许父级分叉。
- **`mainKey`**：旧字段。运行时始终对主私聊桶使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**：代理之间交互时允许的最大来回回复轮数（整数，范围：`0`–`5`）。`0` 会禁用 ping-pong 链式回复。
- **`sendPolicy`**：按 `channel`、`chatType`（`direct|group|channel`，旧的 `dm` 为别名）、`keyPrefix` 或 `rawKeyPrefix` 匹配。最先命中的 deny 生效。
- **`maintenance`**：会话存储清理 + 保留控制。
  - `mode`：`warn` 仅输出警告；`enforce` 执行清理。
  - `pruneAfter`：过期条目的时间阈值（默认 `30d`）。
  - `maxEntries`：`sessions.json` 中的最大条目数（默认 `500`）。运行时会批量写入清理，并为生产规模上限保留一个较小的高水位缓冲；`openclaw sessions cleanup --enforce` 会立即应用该上限。
  - `rotateBytes`：已弃用并被忽略；`openclaw doctor --fix` 会将其从旧配置中移除。
  - `resetArchiveRetention`：`*.reset.<timestamp>` 转录归档的保留期。默认与 `pruneAfter` 一致；设为 `false` 可禁用。
  - `maxDiskBytes`：可选的会话目录磁盘预算。在 `warn` 模式下仅记录警告；在 `enforce` 模式下会优先删除最旧的工件/会话。
  - `highWaterBytes`：预算清理后的可选目标值。默认是 `maxDiskBytes` 的 `80%`。
- **`threadBindings`**：线程绑定会话功能的全局默认值。
  - `enabled`：主开关（提供方可覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`：默认空闲自动取消聚焦时长（小时）（`0` 禁用；提供方可覆盖）
  - `maxAgeHours`：默认硬性最大时长（小时）（`0` 禁用；提供方可覆盖）

</Accordion>

---

## 消息

```json5
{
  messages: {
    responsePrefix: "🦞", // 或 "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all
    removeAckAfterReply: false,
    queue: {
      mode: "collect", // steer | followup | collect | steer-backlog | steer+backlog | queue | interrupt
      debounceMs: 1000,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 disables
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

- 默认使用活动代理的 `identity.emoji`，否则为 `"👀"`。设为 `""` 可禁用。
- 按频道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：账户 → 频道 → `messages.ackReaction` → identity 回退。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在 Slack、Discord、Telegram、WhatsApp 和 BlueBubbles 等支持反应的渠道上，在回复后移除确认反应。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上启用生命周期状态反应。
  在 Slack 和 Discord 上，如果未设置，则在确认反应处于活动状态时保持状态反应启用。
  在 Telegram 上，需要显式设置为 `true` 才能启用生命周期状态反应。

### 入站防抖

将来自同一发送者的快速纯文本消息批量合并为一次代理轮次。媒体/附件会立即刷新。控制命令会绕过防抖。

### TTS（文本转语音）

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      providers: {
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          voiceId: "voice_id",
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
          voice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
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
        voiceId: "elevenlabs_voice_id",
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
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- 当配置了多个 Talk 提供方时，`talk.provider` 必须与 `talk.providers` 中的某个键匹配。
- 旧版扁平化的 Talk 键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容，并会自动迁移到 `talk.providers.<provider>` 中。
- 语音 ID 会回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受明文字符串或 SecretRef 对象。
- `ELEVENLABS_API_KEY` 回退仅在未配置 Talk API key 时生效。
- `providers.*.voiceAliases` 允许 Talk 指令使用友好名称。
- `providers.mlx.modelId` 选择 macOS 本地 MLX 辅助程序使用的 Hugging Face 仓库。如果省略，macOS 将使用 `mlx-community/Soprano-80M-bf16`。
- macOS 的 MLX 播放会通过捆绑的 `openclaw-mlx-tts` 辅助程序运行（如果存在），否则通过 `PATH` 上的可执行文件运行；`OPENCLAW_MLX_TTS_BIN` 会覆盖开发环境中的辅助程序路径。
- `speechLocale` 设置 iOS/macOS Talk 语音识别使用的 BCP 47 区域标识符。留空则使用设备默认值。
- `silenceTimeoutMs` 控制 Talk 模式在用户沉默后等待多久再发送转录结果。未设置时将保留平台默认的暂停窗口（macOS 和 Android 为 `700 ms`，iOS 为 `900 ms`）。

---

## Related

- [Configuration reference](/gateway/configuration-reference) — 其他所有配置键
- [Configuration](/gateway/configuration) — 常见任务和快速设置
- [Configuration examples](/gateway/configuration-examples)
