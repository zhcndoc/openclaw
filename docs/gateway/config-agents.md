---
summary: "智能体默认值、多智能体路由、会话、消息和对话配置"
read_when:
  - 调整智能体默认值（模型、思考、工作区、心跳、媒体、技能）
  - 配置多智能体路由和绑定
  - 调整会话、消息投递和对话模式行为
title: "配置 — 智能体"
---

`agents.*`、`multiAgent.*`、`session.*`、
`messages.*` 和 `talk.*` 下的智能体作用域配置键。关于通道、工具、网关运行时和其他
顶层键，请参见 [配置参考](/gateway/configuration-reference)。

## 智能体默认值

### `agents.defaults.workspace`

默认值：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

可选的仓库根目录，会显示在系统提示的 Runtime 行中。若未设置，OpenClaw 会通过从工作区向上遍历自动检测。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

供未设置 `agents.list[].skills` 的智能体使用的可选默认技能允许列表。

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

- 若默认情况下不限制技能，请省略 `agents.defaults.skills`。
- 省略 `agents.list[].skills` 以继承默认值。
- 将 `agents.list[].skills: []` 设为无技能。
- 非空的 `agents.list[].skills` 列表是该智能体的最终集合；它不会与默认值合并。

### `agents.defaults.skipBootstrap`

禁用自动创建工作区 bootstrap 文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.contextInjection`

控制工作区 bootstrap 文件何时注入到系统提示中。默认值：`"always"`。

- `"continuation-skip"`：安全的续接轮次（在一次已完成的助手回复之后）会跳过工作区 bootstrap 的重新注入，从而减小提示大小。心跳运行和压缩后重试仍会重建上下文。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

每个工作区 bootstrap 文件在截断前允许的最大字符数。默认值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

所有工作区 bootstrap 文件注入的总最大字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

控制当 bootstrap 上下文被截断时，面向智能体的警告文本。默认值：`"once"`。

- `"off"`：从不将警告文本注入系统提示。
- `"once"`：对每个唯一的截断签名注入一次警告（推荐）。
- `"always"`：在每次存在截断时都注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### 上下文预算归属图

OpenClaw 有多个高吞吐量的提示/上下文预算，这些预算是按子系统刻意拆分的，而不是全部通过一个通用
开关来控制。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`：
  常规工作区 bootstrap 注入。
- `agents.defaults.startupContext.*`：
  一次性的 `/new` 和 `/reset` 启动前导，包括最近的每日
  `memory/*.md` 文件。
- `skills.limits.*`：
  注入到系统提示中的紧凑技能列表。
- `agents.defaults.contextLimits.*`：
  受限的运行时摘录和注入的运行时拥有块。
- `memory.qmd.limits.*`：
  索引记忆搜索片段和注入大小。

仅当某个智能体需要不同预算时，才使用匹配的按智能体覆盖项：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在裸 `/new` 和 `/reset` 运行时注入的首轮启动前导。

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

用于受限运行时上下文表面的共享默认值。

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

- `memoryGetMaxChars`：`memory_get` 摘录在添加截断
  元数据和续接通知之前的默认上限。
- `memoryGetDefaultLines`：在省略 `lines` 时，`memory_get` 的默认行窗口。
- `toolResultMaxChars`：用于持久化结果和溢出恢复的实时工具结果上限。
- `postCompactionMaxChars`：在压缩后刷新注入期间使用的 AGENTS.md 摘录上限。

#### `agents.list[].contextLimits`

针对共享 `contextLimits` 开关的按智能体覆盖。省略的字段将继承自
`agents.defaults.contextLimits`。

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

注入到系统提示中的紧凑技能列表的全局上限。这不会影响按需读取 `SKILL.md` 文件。

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

针对技能提示预算的按智能体覆盖。

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

在向提供方发起调用之前，转写/工具图片块中最长图片边的最大像素尺寸。
默认值：`1200`。

较低的值通常会降低视觉 token 用量和请求负载大小，适合截图较多的运行。
较高的值会保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系统提示上下文所使用的时区（不是消息时间戳）。回退到宿主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示中的时间格式。默认值：`auto`（操作系统偏好）。

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
      embeddedHarness: {
        runtime: "pi", // pi | auto | 已注册的 harness id，例如 codex
        fallback: "pi", // pi | none
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model`：可以接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式只设置主模型。
  - 对象形式设置主模型及有序故障切换模型。
- `imageModel`：可以接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `image` 工具路径作为其视觉模型配置使用。
  - 当所选/默认模型无法接受图片输入时，也会作为回退路由使用。
- `imageGenerationModel`：可以接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享图片生成功能以及未来任何生成图片的工具/插件表面使用。
  - 常见值：用于原生 Gemini 图片生成的 `google/gemini-3.1-flash-image-preview`、用于 fal 的 `fal/fal-ai/flux/dev`，或用于 OpenAI Images 的 `openai/gpt-image-2`。
  - 如果直接选择某个提供方/模型，也要配置对应的提供方认证，例如 `google/*` 需要 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/gpt-image-2` 需要 `OPENAI_API_KEY` 或 OpenAI Codex OAuth，`fal/*` 需要 `FAL_KEY`。
  - 若省略，`image_generate` 仍可推断带认证的提供方默认值。它会先尝试当前默认提供方，然后按提供方 id 顺序尝试其余已注册的图片生成提供方。
- `musicGenerationModel`：可以接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享音乐生成功能以及内置的 `music_generate` 工具使用。
  - 常见值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.5+`。
  - 若省略，`music_generate` 仍可推断带认证的提供方默认值。它会先尝试当前默认提供方，然后按提供方 id 顺序尝试其余已注册的音乐生成提供方。
  - 如果直接选择某个提供方/模型，也要配置匹配的提供方认证/API 密钥。
- `videoGenerationModel`：可以接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享视频生成功能以及内置的 `video_generate` 工具使用。
  - 常见值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 若省略，`video_generate` 仍可推断带认证的提供方默认值。它会先尝试当前默认提供方，然后按提供方 id 顺序尝试其余已注册的视频生成提供方。
  - 如果直接选择某个提供方/模型，也要配置匹配的提供方认证/API 密钥。
  - 捆绑的 Qwen 视频生成提供方最多支持 1 个输出视频、1 张输入图片、4 个输入视频、10 秒时长，以及提供方级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：可以接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `pdf` 工具用于模型路由。
  - 若省略，PDF 工具会先回退到 `imageModel`，然后回退到解析后的会话/默认模型。
- `pdfMaxBytesMb`：当调用时未传入 `maxBytesMb` 时，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中抽取回退模式默认考虑的最大页数。
- `verboseDefault`：智能体的默认详细输出级别。取值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `elevatedDefault`：智能体的默认提升输出级别。取值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式为 `provider/model`（例如 `openai/gpt-5.4` 用于 API Key 访问，或 `openai-codex/gpt-5.5` 用于 Codex OAuth）。如果省略提供方，OpenClaw 会先尝试别名，然后尝试与该精确模型 id 匹配的唯一已配置提供方，最后才回退到已配置的默认提供方（已废弃的兼容行为，因此请优先使用显式的 `provider/model`）。如果该提供方不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的提供方/模型，而不是暴露一个过时的已移除提供方默认值。
- `models`：为 `/model` 配置的模型目录和允许列表。每个条目都可以包含 `alias`（快捷名）和 `params`（提供方特定，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`）。
  - 安全编辑：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 来添加条目。`config set` 会拒绝那些会移除现有允许列表条目的替换，除非你传入 `--replace`。
  - 按提供方作用域的配置/引导流程会将所选提供方模型合并到此映射中，并保留已配置的无关提供方。
  - 对于直接的 OpenAI Responses 模型，会自动启用服务器端压缩。使用 `params.responsesServerCompaction: false` 可停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆盖阈值。参见 [OpenAI 服务器端压缩](/providers/openai#server-side-compaction-responses-api)。
- `params`：应用于所有模型的全局默认提供方参数。设置在 `agents.defaults.params`（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础）会被 `agents.defaults.models["provider/model"].params`（按模型）覆盖，然后 `agents.list[].params`（匹配的智能体 id）再按键覆盖。详见 [提示缓存](/reference/prompt-caching)。
- `embeddedHarness`：默认的低层嵌入式智能体运行时策略。省略运行时时默认为 OpenClaw Pi。使用 `runtime: "pi"` 强制使用内置 PI harness，使用 `runtime: "auto"` 允许已注册的插件 harness 接管受支持的模型，或使用已注册的 harness id，例如 `runtime: "codex"`。将 `fallback: "none"` 设为禁用自动 PI 回退。像 `codex` 这样的显式插件运行时默认会关闭失败，除非你在同一覆盖作用域中设置 `fallback: "pi"`。将模型引用保持为 `provider/model` 的规范形式；通过运行时配置选择 Codex、Claude CLI、Gemini CLI 以及其他执行后端，而不是使用旧式运行时提供方前缀。关于这与提供方/模型选择的区别，请参见 [智能体运行时](/concepts/agent-runtimes)。
- 修改这些字段的配置写入器（例如 `/models set`、`/models set-image` 以及添加/移除回退的命令）会保存规范的对象形式，并尽可能保留现有回退列表。
- `maxConcurrent`：跨会话的智能体最大并行运行数（每个会话仍然是串行的）。默认值：4。

### `agents.defaults.embeddedHarness`

`embeddedHarness` 控制哪个底层执行器运行嵌入式智能体轮次。
大多数部署应保持默认的 OpenClaw Pi 运行时。
当受信任的插件提供原生 harness 时使用它，例如捆绑的
Codex 应用服务器 harness。关于心智模型，请参见
[智能体运行时](/concepts/agent-runtimes)。

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

- `runtime`：`"auto"`、`"pi"`，或已注册的插件 harness id。捆绑的 Codex 插件注册为 `codex`。
- `fallback`：`"pi"` 或 `"none"`。在 `runtime: "auto"` 中，若省略 fallback，默认值为 `"pi"`，这样在没有插件 harness 声明运行时，旧配置仍可继续使用 PI。在显式插件运行时模式下，例如 `runtime: "codex"`，若省略 fallback，默认值为 `"none"`，这样缺失的 harness 会直接失败，而不是静默使用 PI。运行时覆盖不会从更宽的作用域继承 fallback；当你有意希望保留兼容回退时，请在显式运行时旁边同时设置 `fallback: "pi"`。所选插件 harness 的失败始终会直接暴露。
- 环境覆盖：`OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` 覆盖 `runtime`；`OPENCLAW_AGENT_HARNESS_FALLBACK=pi|none` 覆盖该进程的 fallback。
- 对于仅 Codex 部署，设置 `model: "openai/gpt-5.5"` 和 `embeddedHarness.runtime: "codex"`。你也可以为可读性显式设置 `embeddedHarness.fallback: "none"`；对于显式插件运行时，这也是默认值。
- harness 选择会在首次嵌入式运行后按会话 id 锁定。配置/环境变更会影响新的或重置的会话，而不会影响已有转写。没有记录锁定的旧会话但带有转写历史时，会被视为已锁定到 PI。`/status` 会在 `Fast` 旁边显示非 PI 的 harness id，例如 `codex`。
- 这只控制嵌入式聊天 harness。媒体生成、视觉、PDF、音乐、视频和 TTS 仍然使用各自的提供方/模型设置。

**内置别名快捷方式**（仅在模型位于 `agents.defaults.models` 中时适用）：

| 别名                 | 模型                                               |
| -------------------- | -------------------------------------------------- |
| `opus`               | `anthropic/claude-opus-4-6`                        |
| `sonnet`             | `anthropic/claude-sonnet-4-6`                      |
| `gpt`                | `openai/gpt-5.4` 或已配置的 Codex OAuth GPT-5.5     |
| `gpt-mini`           | `openai/gpt-5.4-mini`                              |
| `gpt-nano`           | `openai/gpt-5.4-nano`                              |
| `gemini`             | `google/gemini-3.1-pro-preview`                    |
| `gemini-flash`       | `google/gemini-3-flash-preview`                    |
| `gemini-flash-lite`  | `google/gemini-3.1-flash-lite-preview`              |

你配置的别名始终优先于默认值。

Z.AI GLM-4.x 模型会自动启用思考模式，除非你设置 `--thinking off` 或自行定义 `agents.defaults.models["zai/<model>"].params.thinking`。
Z.AI 模型默认启用 `tool_stream` 以进行工具调用流式传输。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设为 `false` 可禁用它。
当未设置显式思考级别时，Anthropic Claude 4.6 模型默认使用 `adaptive` 思考。

### `agents.defaults.cliBackends`

用于仅文本回退运行的可选 CLI 后端（不调用工具）。当 API 提供方失败时可作为备份。

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
- 当 `imageArg` 接受文件路径时支持图片透传。

### `agents.defaults.systemPromptOverride`

用固定字符串替换 OpenClaw 组装的整个系统提示。可在默认级别（`agents.defaults.systemPromptOverride`）或按智能体级别（`agents.list[].systemPromptOverride`）设置。按智能体的值优先；空值或仅包含空白字符的值会被忽略。适用于受控的提示实验。

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "You are a helpful assistant.",
    },
  },
}
```

### `agents.defaults.promptOverlays`

按模型系列应用、且与提供方无关的提示覆盖层。GPT-5 系列模型 id 会跨提供方接收共享行为契约；`personality` 只控制友好交互风格层。

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
- `"off"` 仅禁用友好层；带标签的 GPT-5 行为契约仍保持启用。
- 当此共享设置未配置时，仍会读取旧的 `plugins.entries.openai.config.personality`。

### `agents.defaults.heartbeat`

周期性心跳运行。

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
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every`：持续时间字符串（ms/s/m/h）。默认值：`30m`（API Key 认证）或 `1h`（OAuth 认证）。设为 `0m` 可禁用。
- `includeSystemPromptSection`：当为 false 时，会从系统提示中省略 Heartbeat 部分，并跳过将 `HEARTBEAT.md` 注入 bootstrap 上下文。默认值：`true`。
- `suppressToolErrorWarnings`：当为 true 时，在心跳运行期间抑制工具错误警告载荷。
- `timeoutSeconds`：在心跳智能体轮次被中止前允许的最大秒数。留空则使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/DM 投递策略。`allow`（默认）允许直接目标投递。`block` 会抑制直接目标投递并发出 `reason=dm-blocked`。
- `lightContext`：当为 true 时，心跳运行使用轻量级 bootstrap 上下文，并且在工作区 bootstrap 文件中仅保留 `HEARTBEAT.md`。
- `isolatedSession`：当为 true 时，每次心跳都会在一个没有先前对话历史的新会话中运行。与 cron 的 `sessionTarget: "isolated"` 具有相同的隔离模式。可将每次心跳的 token 成本从约 100K 降低到约 2–5K token。
- 按智能体：设置 `agents.list[].heartbeat`。当任意智能体定义了 `heartbeat` 时，**只有这些智能体**会运行心跳。
- 心跳运行完整的智能体轮次——间隔越短，消耗的 token 越多。

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
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "请精确保留部署 ID、工单 ID 和 host:port 对。", // 当 identifierPolicy=custom 时使用
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
        model: "openrouter/anthropic/claude-sonnet-4-6", // 仅用于压缩的可选模型覆盖
        notifyUser: true, // 压缩开始和完成时发送简短通知（默认：false）
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "将任何持久性笔记写入 memory/YYYY-MM-DD.md；如果没有要保存的内容，请准确回复静默令牌 NO_REPLY。",
        },
      },
    },
  },
}
```

- `mode`：`default` 或 `safeguard`（用于长历史的分块摘要）。参见 [压缩](/concepts/compaction)。
- `provider`：已注册压缩提供方插件的 id。设置后，会调用提供方的 `summarize()`，而不是内置 LLM 摘要。失败时回退到内置实现。设置提供方会强制使用 `mode: "safeguard"`。参见 [压缩](/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 在中止单次压缩操作前允许的最大秒数。默认值：`900`。
- `identifierPolicy`：`strict`（默认）、`off` 或 `custom`。`strict` 会在压缩摘要期间前置内置的、不可见标识符保留指导。
- `identifierInstructions`：当 `identifierPolicy=custom` 时使用的可选自定义标识符保留文本。
- `postCompactionSections`：压缩后可重新注入的可选 AGENTS.md H2/H3 节标题。默认值：`["Session Startup", "Red Lines"]`；设为 `[]` 可禁用重新注入。当未设置或显式设为该默认对时，较旧的 `Every Session`/`Safety` 标题也会作为旧版回退被接受。
- `model`：仅用于压缩摘要的可选 `provider/model-id` 覆盖。当主会话应保持一个模型，但压缩摘要应在另一个模型上运行时使用此项；若未设置，压缩将使用会话的主模型。
- `notifyUser`：当为 `true` 时，在压缩开始和完成时向用户发送简短通知（例如，“正在压缩上下文...” 和“压缩完成”）。默认禁用，以保持压缩静默。
- `memoryFlush`：在自动压缩前进行的静默智能体轮次，用于保存持久性记忆。若工作区为只读则跳过。

### `agents.defaults.contextPruning`

在将内容发送给 LLM 之前，从内存上下文中清除**旧工具结果**。不会修改磁盘上的会话历史。

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
        hardClear: { enabled: true, placeholder: "[旧工具结果内容已清除]" },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="cache-ttl 模式行为">

- `mode: "cache-ttl"` 会启用清除流程。
- `ttl` 控制清除可以再次运行的频率（基于最后一次缓存触碰之后）。
- 清除会先软裁剪过大的工具结果，然后在需要时对较旧的工具结果进行硬清除。

**软裁剪** 会保留开头 + 结尾，并在中间插入 `...`。

**硬清除** 会用占位符替换整个工具结果。

注意：

- 图片块永远不会被裁剪/清除。
- 比例以字符为基础（近似值），不是精确的 token 数。
- 如果少于 `keepLastAssistants` 条助手消息，则跳过清除。

</Accordion>

行为细节请参见 [会话清除](/concepts/session-pruning)。

### 块流式传输

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

- 非 Telegram 通道需要显式设置 `*.blockStreaming: true` 才能启用分块回复。
- 通道覆盖：`channels.<channel>.blockStreamingCoalesce`（以及按账户变体）。Signal/Slack/Discord/Google Chat 默认 `minChars: 1500`。
- `humanDelay`：分块回复之间的随机暂停。`natural` = 800–2500ms。按智能体覆盖：`agents.list[].humanDelay`。

行为与分块细节请参见 [流式传输](/concepts/streaming)。

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

- 默认值：直接聊天/提及为 `instant`，未提及的群聊为 `message`。
- 按会话覆盖：`session.typingMode`、`session.typingIntervalSeconds`。

参见 [输入指示器](/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式智能体的可选沙箱。完整指南请参见 [沙箱](/gateway/sandboxing)。

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
          // 也支持 SecretRefs / 内联内容：
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

当选择 `backend: "openshell"` 时，运行时特定设置会移到
`plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`：`user@host[:port]` 形式的 SSH 目标
- `command`：SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`：用于按作用域工作区的绝对远程根目录
- `identityFile` / `certificateFile` / `knownHostsFile`：传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在运行时会将其落盘为临时文件的内联内容或 SecretRef
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主机密钥策略开关

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- 基于 SecretRef 的 `*Data` 值会在沙箱会话开始前，从活动密钥运行时快照中解析

**SSH 后端行为：**

- 在创建或重新创建后先播种一次远程工作区
- 然后保持远程 SSH 工作区为规范状态
- 通过 SSH 路由 `exec`、文件工具和媒体路径
- 不会自动将远程更改同步回宿主机
- 不支持沙箱浏览器容器

**工作区访问：**

- `none`：`~/.openclaw/sandboxes` 下的按作用域沙箱工作区
- `ro`：`/workspace` 中的沙箱工作区，智能体工作区以只读方式挂载到 `/agent`
- `rw`：智能体工作区以读写方式挂载到 `/workspace`

**作用域：**

- `session`：每个会话一个容器 + 工作区
- `agent`：每个智能体一个容器 + 工作区（默认）
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

- `mirror`：在执行前从本地播种到远程，执行后同步回本地；本地工作区保持规范状态
- `remote`：在创建沙箱时只播种一次远程，然后保持远程工作区为规范状态

在 `remote` 模式下，在 OpenClaw 之外进行的宿主机本地编辑不会在播种步骤后自动同步到沙箱中。
传输方式是进入 OpenShell 沙箱的 SSH，但插件负责沙箱生命周期和可选的镜像同步。

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`）。需要网络出站、可写根目录和 root 用户。

**容器默认使用 `network: "none"`** —— 如果智能体需要出站访问，请将其设为 `"bridge"`（或自定义 bridge 网络）。
`"host"` 会被阻止。`"container:<id>"` 默认会被阻止，除非你显式设置
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（紧急开关）。

**入站附件** 会被暂存到活动工作区中的 `media/inbound/*`。

**`docker.binds`** 会挂载额外的宿主目录；全局和按智能体的 bind 会合并。

**沙箱浏览器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 会注入系统提示。无需在 `openclaw.json` 中启用 `browser.enabled`。
noVNC 观察者访问默认使用 VNC 认证，OpenClaw 会发出一个短期 token URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）会阻止沙箱化会话针对宿主浏览器进行操作。
- `network` 默认值为 `openclaw-sandbox-browser`（专用 bridge 网络）。仅在你明确希望全球 bridge 连通性时设置为 `bridge`。
- `cdpSourceRange` 可选择性地在容器边缘将 CDP 入口限制到一个 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 只会将额外的宿主目录挂载到沙箱浏览器容器中。设置后（包括 `[]`），它会替换浏览器容器的 `docker.binds`。
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
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 默认启用；如果 WebGL/3D 使用需要它们，可通过 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 将其禁用。
  - 如果你的工作流依赖扩展，可通过 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 重新启用扩展。
  - 可通过 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 更改 `--renderer-process-limit=2`；设为 `0` 可使用 Chromium 的默认进程限制。
  - 启用 `noSandbox` 时，还会增加 `--no-sandbox` 和 `--disable-setuid-sandbox`。
  - 默认值为容器镜像基线；使用带自定义 entrypoint 的自定义浏览器镜像来更改容器默认值。

</Accordion>

浏览器沙箱和 `sandbox.docker.binds` 仅适用于 Docker。

构建镜像：

```bash
scripts/sandbox-setup.sh           # 主沙箱镜像
scripts/sandbox-browser-setup.sh   # 可选浏览器镜像
```

### `agents.list`（按智能体覆盖）

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
        thinkingDefault: "high", // 按智能体思考级别覆盖
        reasoningDefault: "on", // 按智能体推理可见性覆盖
        fastModeDefault: false, // 按智能体快速模式覆盖
        embeddedHarness: { runtime: "auto", fallback: "pi" },
        params: { cacheRetention: "none" }, // 按键覆盖 agents.defaults.models 中对应默认值
        skills: ["docs-search"], // 设置时替换 agents.defaults.skills
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

- `id`：稳定的智能体 id（必填）。
- `default`：当设置多个时，最先设置的生效（会记录警告）。如果未设置，则列表中的第一个条目为默认值。
- `model`：字符串形式只覆盖 `primary`；对象形式 `{ primary, fallbacks }` 同时覆盖两者（`[]` 会禁用全局回退）。仅覆盖 `primary` 的 cron 任务仍会继承默认回退，除非你设置 `fallbacks: []`。
- `params`：按智能体的流式参数，会在选定的 `agents.defaults.models` 模型条目之上合并。可用于智能体特定覆盖，例如 `cacheRetention`、`temperature` 或 `maxTokens`，而无需复制整个模型目录。
- `skills`：可选的按智能体技能允许列表。如果省略，智能体会在设置后继承 `agents.defaults.skills`；显式列表会替换默认值而不是合并，`[]` 表示无技能。
- `thinkingDefault`：可选的按智能体默认思考级别（`off | minimal | low | medium | high | xhigh | adaptive | max`）。当未设置按消息或会话覆盖时，它会覆盖该智能体的 `agents.defaults.thinkingDefault`。所选提供方/模型配置文件决定哪些值有效；对于 Google Gemini，`adaptive` 会保留提供方拥有的动态思考（Gemini 3/3.1 上省略 `thinkingLevel`，Gemini 2.5 上为 `thinkingBudget: -1`）。
- `reasoningDefault`：可选的按智能体默认推理可见性（`on | off | stream`）。在未设置按消息或会话推理覆盖时生效。
- `fastModeDefault`：可选的按智能体快速模式默认值（`true | false`）。在未设置按消息或会话快速模式覆盖时生效。
- `embeddedHarness`：可选的按智能体低层 harness 策略覆盖。使用 `{ runtime: "codex" }` 可让一个智能体仅使用 Codex，而其他智能体在 `auto` 模式下保留默认 PI 回退。
- `runtime`：可选的按智能体运行时描述符。当智能体应默认使用 ACP harness 会话时，使用 `type: "acp"` 及 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：工作区相对路径、`http(s)` URL 或 `data:` URI。
- `identity` 派生默认值：`ackReaction` 来自 `emoji`，`mentionPatterns` 来自 `name`/`emoji`。
- `subagents.allowAgents`：`sessions_spawn` 的智能体 id 允许列表（`["*"]` = 任意；默认：仅同一智能体）。
- 沙箱继承保护：如果请求者会话处于沙箱中，`sessions_spawn` 会拒绝那些会在未沙箱化状态下运行的目标。
- `subagents.requireAgentId`：当为 true 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件；默认值：false）。

---

## 多代理路由

在一个 Gateway 中运行多个隔离的代理。参见 [Multi-Agent](/concepts/multi-agent)。

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

- `type`（可选）：正常路由使用 `route`（缺失时默认为 route），用于持久 ACP 会话绑定时使用 `acp`。
- `match.channel`（必需）
- `match.accountId`（可选；`*` = 任意账号；省略 = 默认账号）
- `match.peer`（可选；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；按渠道区分）
- `acp`（可选；仅适用于 `type: "acp"`）：`{ mode, label, cwd, backend }`

**确定性的匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确匹配，不带 peer/guild/team）
5. `match.accountId: "*"`（按整个渠道）
6. 默认代理

在每个层级内，第一个匹配到的 `bindings` 条目获胜。

对于 `type: "acp"` 条目，OpenClaw 会按精确会话身份（`match.channel` + account + `match.peer.id`）进行解析，不使用上面的路由绑定层级顺序。

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

<Accordion title="无文件系统访问（仅消息）">

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

有关优先级详情，请参见 [Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools)。

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
    parentForkMaxTokens: 100000, // 超过此 token 数则跳过父线程分叉（0 表示禁用）
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      rotateBytes: "10mb",
      resetArchiveRetention: "30d", // 持续时间或 false
      maxDiskBytes: "500mb", // 可选硬性预算
      highWaterBytes: "400mb", // 可选清理目标
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // 默认空闲后自动取消聚焦（小时，`0` 表示禁用）
      maxAgeHours: 0, // 默认硬性最大存活时长（小时，`0` 表示禁用）
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

- **`scope`**：群聊场景的基础会话分组策略。
  - `per-sender`（默认）：每个发送者在某个频道上下文内拥有独立会话。
  - `global`：频道上下文中的所有参与者共享单一会话（仅在需要共享上下文时使用）。
- **`dmScope`**：私信的分组方式。
  - `main`：所有私信共享主会话。
  - `per-peer`：按发送者 ID 跨频道隔离。
  - `per-channel-peer`：按频道 + 发送者隔离（推荐用于多人收件箱）。
  - `per-account-channel-peer`：按账号 + 频道 + 发送者隔离（推荐用于多账号）。
- **`identityLinks`**：将规范化 ID 映射到带提供方前缀的对等方，用于跨频道共享会话。
- **`reset`**：主要重置策略。`daily` 在本地时间 `atHour` 重置；`idle` 在 `idleMinutes` 后重置。两者都配置时，以先到期者为准。
- **`resetByType`**：按类型覆盖（`direct`、`group`、`thread`）。旧的 `dm` 也可作为 `direct` 的别名。
- **`parentForkMaxTokens`**：创建分叉线程会话时允许的最大父会话 `totalTokens`（默认 `100000`）。
  - 如果父级 `totalTokens` 高于该值，OpenClaw 会启动一个新的线程会话，而不是继承父会话的转录历史。
  - 设为 `0` 可禁用此保护并始终允许父级分叉。
- **`mainKey`**：旧字段。运行时始终使用 `"main"` 作为主私聊桶。
- **`agentToAgent.maxPingPongTurns`**：代理之间进行代理间交流时允许的最大来回回复轮数（整数，范围：`0`–`5`）。`0` 会禁用 ping-pong 链式回复。
- **`sendPolicy`**：可按 `channel`、`chatType`（`direct|group|channel`，旧的 `dm` 为别名）、`keyPrefix` 或 `rawKeyPrefix` 进行匹配。第一个拒绝项生效。
- **`maintenance`**：会话存储清理 + 保留控制。
  - `mode`：`warn` 仅输出警告；`enforce` 执行清理。
  - `pruneAfter`：陈旧条目的年龄阈值（默认 `30d`）。
  - `maxEntries`：`sessions.json` 中的最大条目数（默认 `500`）。
  - `rotateBytes`：当 `sessions.json` 超过此大小时进行轮转（默认 `10mb`）。
  - `resetArchiveRetention`：`*.reset.<timestamp>` 转录归档的保留期。默认继承 `pruneAfter`；设为 `false` 可禁用。
  - `maxDiskBytes`：可选的 sessions 目录磁盘预算。在 `warn` 模式下仅记录警告；在 `enforce` 模式下优先删除最旧的产物/会话。
  - `highWaterBytes`：预算清理后的可选目标值。默认是 `maxDiskBytes` 的 `80%`。
- **`threadBindings`**：线程绑定会话功能的全局默认值。
  - `enabled`：总开关默认值（提供方可覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`：默认空闲后自动取消聚焦的小时数（`0` 表示禁用；提供方可覆盖）
  - `maxAgeHours`：默认硬性最大存活时长（小时，`0` 表示禁用；提供方可覆盖）

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

按频道/账号覆盖：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析规则（越具体优先级越高）：账号 → 频道 → 全局。`""` 会禁用并停止级联。`"auto"` 会生成 `[{identity.name}]`。

**模板变量：**

| 变量              | 说明               | 示例                        |
| ----------------- | ------------------ | --------------------------- |
| `{model}`         | 简短模型名          | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型标识        | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供方名称          | `anthropic`                 |
| `{thinkingLevel}` | 当前思考级别        | `high`, `low`, `off`        |
| `{identity.name}` | 代理身份名称        | （与 `"auto"` 相同）         |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- 默认使用当前激活代理的 `identity.emoji`，否则使用 `"👀"`。设为 `""` 可禁用。
- 按频道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：账号 → 频道 → `messages.ackReaction` → 身份回退值。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在 Slack、Discord 和 Telegram 上在回复后移除确认反应。
- `messages.statusReactions.enabled`：启用 Slack、Discord 和 Telegram 上的生命周期状态反应。
  在 Slack 和 Discord 上，如果未设置，当确认反应处于启用状态时，状态反应也保持启用。
  在 Telegram 上，请显式设为 `true` 以启用生命周期状态反应。

### 入站去抖

将来自同一发送者的快速纯文本消息批量合并为一次代理轮次。媒体/附件会立即刷新。控制命令会绕过去抖。

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
      openai: {
        apiKey: "openai_api_key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        voice: "alloy",
      },
    },
  },
}
```

- `auto` 控制默认自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可覆盖本地偏好设置，`/tts status` 会显示实际生效状态。
- `summaryModel` 会为自动摘要覆盖 `agents.defaults.model.primary`。
- `modelOverrides` 默认启用；`modelOverrides.allowProvider` 默认为 `false`（需显式启用）。
- API 密钥会回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `openai.baseUrl` 会覆盖 OpenAI TTS 端点。解析顺序为配置项，其次是 `OPENAI_TTS_BASE_URL`，最后是 `https://api.openai.com/v1`。
- 当 `openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 会将其视为兼容 OpenAI 的 TTS 服务器，并放宽模型/语音校验。

---

## 语音

Talk 模式（macOS/iOS/Android）的默认值。

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
    },
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- 当配置了多个 Talk provider 时，`talk.provider` 必须与 `talk.providers` 中的某个键匹配。
- 旧版扁平的 Talk 键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容性，并会自动迁移到 `talk.providers.<provider>` 中。
- 语音 ID 会回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受明文字符串或 SecretRef 对象。
- 仅当未配置 Talk API key 时，才会应用 `ELEVENLABS_API_KEY` 回退值。
- `providers.*.voiceAliases` 允许 Talk 指令使用友好的名称。
- `silenceTimeoutMs` 控制 Talk 模式在用户沉默后等待多长时间才发送转录内容。未设置时将保持平台默认的暂停窗口（macOS 和 Android 上为 `700 ms`，iOS 上为 `900 ms`）。

---

## 相关

- [配置参考](/gateway/configuration-reference) — 其他所有配置键
- [配置](/gateway/configuration) — 常见任务和快速设置
- [配置示例](/gateway/configuration-examples)
