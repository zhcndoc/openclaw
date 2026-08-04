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

对于未设置
`agents.entries.*.skills` 的代理，可选的默认技能允许列表。

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    entries: {
      writer: { default: true }, // 继承 github、weather
      docs: { skills: ["docs-search"] }, // 替换默认值
      "locked-down": { skills: [] }, // 无技能
    },
  },
}
```

- 默认情况下，省略 `agents.defaults.skills` 表示不限制技能。
- 省略 `agents.entries.*.skills` 表示继承默认值。
- 将 `agents.entries.*.skills` 设置为 `[]` 表示无技能。
- 非空的 `agents.entries.*.skills` 列表是该代理的最终技能集合；它不会与默认值合并。

### `agents.defaults.skipBootstrap`

禁用自动创建工作区引导文件（`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`BOOTSTRAP.md`）。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

跳过创建选定的可选工作区文件，同时仍写入必需的引导文件（`AGENTS.md`、`BOOTSTRAP.md`）。有效值：`SOUL.md`、`USER.md` 和 `IDENTITY.md`（接受 `HEARTBEAT.md`，但不执行任何操作，因为心跳上下文已移至 cron 监控临时文件）。

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

每个代理的覆盖设置：`agents.entries.*.contextInjection`。省略的值继承
`agents.defaults.contextInjection`。

### `agents.defaults.bootstrapMaxChars`

每个工作区引导文件在截断前的最大字符数。默认值：`20000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

每个代理的覆盖设置：`agents.entries.*.bootstrapMaxChars`。省略的值继承
`agents.defaults.bootstrapMaxChars`。

### `agents.defaults.bootstrapTotalMaxChars`

跨所有工作区引导文件注入的最大总字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

按代理覆盖：`agents.entries.*.bootstrapTotalMaxChars`。省略的值将继承
`agents.defaults.bootstrapTotalMaxChars`。

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
    entries: {
      "strict-worker": {
        default: true,
        contextInjection: "always",
        bootstrapMaxChars: 50000,
        bootstrapTotalMaxChars: 300000,
      },
    },
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
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| `agents.defaults.bootstrapMaxChars` / `bootstrapTotalMaxChars` | 常规工作区引导注入                                                                                |
| `agents.defaults.startupContext.*`                             | 一次性重置/启动模型运行前奏，包括最近的每日 `memory/*.md` 文件。裸聊天 `/new` 和 `/reset` 会在不调用模型的情况下被确认 |
| `skills.limits.*`                                              | 注入系统提示词中的紧凑技能列表                                                                    |
| `agents.defaults.contextLimits.*`                              | 有边界的运行时摘录以及注入的运行时所有块                                                          |
| `memory.qmd.limits.*`                                          | 索引化的记忆搜索片段和注入大小                                                                    |

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

- `memoryGetMaxChars`：截断前的默认 `memory_get` 摘录上限。
  添加元数据和续接提示后，内容可能会进一步增加。
- 当 `memory_get` 未指定 `lines` 时，OpenClaw 使用内置的 120 行窗口，
  然后应用 `memoryGetMaxChars`。
- 实时工具结果使用模型上下文自动上限：低于 100K 个 token 时为 `16000` 个字符，
  达到 100K+ 个 token 时为 `32000` 个字符，达到 200K+ 个 token 时为 `64000` 个字符。
- `postCompactionMaxChars`：压缩后刷新注入期间所使用的 AGENTS.md 摘录上限。

#### `agents.entries.*.contextLimits`

针对共享 `contextLimits` 开关的逐代理覆盖。省略的字段会继承自 `agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: { memoryGetMaxChars: 12000 },
    },
    entries: {
      "tiny-local": {
        default: true,
        contextLimits: {
          memoryGetMaxChars: 6000,
        },
      },
    },
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
    entries: {
      "tiny-local": { default: true, skillsLimits: { maxSkillsPromptChars: 6000 } },
    },
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

消息信封、排队的系统事件以及系统提示词本地日期上下文所使用的时区。默认使用主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
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
      params: { cacheRetention: "long" }, // 全局默认提供商参数
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

- `model`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式仅设置主模型。
  - 对象形式设置主模型以及按顺序排列的故障转移模型。
- `utilityModel`：用于短内部任务的可选 `provider/model` 引用或别名。目前用于生成 Control UI 会话标题、Telegram 私聊主题标题、Discord 自动线程标题，以及[进度草稿旁白](/concepts/progress-drafts#narrated-status)。未设置时，如果主提供商声明了小模型默认值，OpenClaw 会使用该默认值（OpenAI → `gpt-5.6-luna`，Anthropic → `claude-haiku-4-5`）；否则标题任务使用代理的主模型，旁白保持关闭。如果独立的 utility 模型无法准备或完成生成的标题，OpenClaw 会使用主模型重试该标题一次。对于控制面板标题，自动 utility 推导和常规故障转移会使用有效会话提供商和认证配置；显式设置的 utility 模型则使用其配置的提供商和认证。设置 `utilityModel: ""` 可跳过备用 utility 路由；控制面板标题生成仍会直接使用常规会话模型。`agents.entries.*.utilityModel` 会覆盖默认值，针对特定操作的模型覆盖则优先于两者。Utility 任务会单独调用模型，并将特定于任务的内容发送给所选模型提供商。控制面板标题生成最多发送第一条非命令消息的前 1,000 个字符；旁白会发送入站请求以及经过精简和脱敏的工具摘要。请选择符合成本和数据处理要求的提供商。
- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 当活动模型无法接受图像时，`image` 工具路径会将其用作视觉模型配置。原生视觉模型则直接接收已加载的图像字节。
  - 当所选或默认模型无法接受图像输入时，也会将其用作故障转移路由。
  - 优先使用显式的 `provider/model` 引用。为兼容性支持不带提供商的 ID；如果该 ID 在 `models.providers.*.models` 中唯一匹配已配置的图像能力条目，OpenClaw 会将其限定为对应提供商。对于多个匹配的已配置条目，必须显式添加提供商前缀。
- `mediaModels.image`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享图像生成能力以及未来任何生成图像的工具/插件界面使用。
  - 典型值：原生 Gemini 图像生成使用 `google/gemini-3.1-flash-image`，fal 使用 `fal/fal-ai/flux/dev`，OpenAI Images 使用 `openai/gpt-image-2`，透明背景 OpenAI PNG/WebP 输出使用 `openai/gpt-image-1.5`。
  - 如果直接选择提供商/模型，还需配置匹配的提供商认证（例如，`google/*` 使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/gpt-image-2` / `openai/gpt-image-1.5` 使用 `OPENAI_API_KEY` 或 OpenAI Codex OAuth，`fal/*` 使用 `FAL_KEY`）。
  - 如果省略，`image_generate` 仍可推断出基于认证的提供商默认值。它会先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余已注册的图像生成提供商。
- `mediaModels.music`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享音乐生成能力和内置的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍可推断出基于认证的提供商默认值。它会先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余已注册的音乐生成提供商。
  - 如果直接选择提供商/模型，还需配置匹配的提供商认证/API 密钥。
- `mediaModels.video`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享视频生成能力和内置的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍可推断出基于认证的提供商默认值。它会先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余已注册的视频生成提供商。
  - 如果直接选择提供商/模型，还需配置匹配的提供商认证/API 密钥。
  - 官方 Qwen 视频生成插件最多支持 1 个输出视频、1 张输入图像、4 个输入视频、10 秒时长，以及提供商级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `pdf` 工具用于模型路由。
  - 如果省略，PDF 工具会回退到 `imageModel`，然后回退到解析后的会话/默认模型。
- `pdfMaxMb`：当调用时未传入 `maxBytesMb`，`pdf` 工具使用的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具在提取回退模式下默认考虑的最大页数。
- `verboseDefault`：代理的默认详细程度。取值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `toolProgressDetail`：`/verbose` 工具摘要和进度草稿工具行的详细程度模式。取值：`"explain"`（默认，简洁的用户可读标签）或 `"raw"`（可用时附加原始命令/详细信息）。每个代理的 `agents.entries.*.toolProgressDetail` 会覆盖此默认值。
- `reasoningDefault`：代理默认的推理可见性。取值：`"off"`、`"on"`、`"stream"`。每个代理的 `agents.entries.*.reasoningDefault` 会覆盖此默认值。只有在未设置每条消息或会话的推理覆盖项时，配置的推理默认值才会应用于所有者、已授权发送者或操作员管理员网关上下文。
- `elevatedDefault`：代理默认的提升输出级别。取值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式为 `provider/model`（例如，使用 Codex OAuth 访问时的 `openai/gpt-5.6-sol`）。如果省略提供商，OpenClaw 会依次尝试别名、对该确切模型 ID 的唯一已配置提供商匹配，最后才回退到已配置的默认提供商（这是已弃用的兼容行为，因此优先使用显式的 `provider/model`）。如果该提供商不再提供已配置的默认模型，OpenClaw 会回退到第一个已配置的提供商/模型，而不是显示已失效的已删除提供商默认值。
- `contextTokens`：可选的代理级上限。它可以降低更大模型的有效预算，但不能将模型上限提高到其已配置或发现的 `contextTokens` 之上。若要让某个直接使用的 OpenAI 模型启用更大的原生上下文窗口，请为该模型设置 `models.providers.openai.models[].contextWindow` 和 `contextTokens`；详见 [OpenAI 上下文窗口默认值](/providers/openai#context-window-defaults-and-long-context-opt-in)。
- `models`：已配置的别名和每个模型的设置。每个条目可以包含 `alias`（快捷方式）和 `params`（提供商特定参数，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、OpenRouter 的 `provider` 路由、`chat_template_kwargs`、`extra_body`/`extraBody`）。添加条目不会限制模型覆盖。
  - 使用 `"openai/*": {}` 或 `"vllm/*": {}` 等 `provider/*` 条目，可显示所选提供商发现的所有模型，而无需手动列出每个模型 ID。
  - 如果某个提供商动态发现的所有模型都应使用相同的运行时，请将 `agentRuntime` 添加到 `provider/*` 条目中。精确的 `provider/model` 运行时策略仍优先于通配符。
  - 安全的元数据编辑：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 添加条目。如果不传入 `--replace`，`config set` 会拒绝删除现有条目的替换操作。
- `modelPolicy.allow`：显式覆盖允许列表。接受别名、精确的 `provider/model` 引用，以及末尾带前缀的通配符，例如 `openai/*` 或 `clawrouter/anthropic/*`。省略它或使用 `[]` 可允许任意模型。`agents.entries.*.modelPolicy.allow` 会替换该代理的默认策略；显式的空列表会让该代理允许使用任意模型。
  - 按提供商范围执行的配置/引导流程会将所选提供商的模型合并到此映射中，并保留此前已配置的不相关提供商。
  - 对于直接使用的 OpenAI Responses 模型，服务端压缩会自动启用。使用 `params.responsesServerCompaction: false` 可停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆盖阈值。详见 [OpenAI 服务端压缩](/providers/openai#advanced-configuration)。
- `params`：应用于所有模型的全局默认提供商参数。在 `agents.defaults.params` 中设置（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础值）会被 `agents.defaults.models["provider/model"].params`（每个模型）覆盖，然后 `agents.entries.*.params`（匹配的代理 ID）按键覆盖前者。详见[提示词缓存](/reference/prompt-caching)。
- `models.providers.openrouter.params.provider`：OpenRouter 范围的默认提供商路由策略。OpenClaw 会将其转发到 OpenRouter 请求的 `provider` 对象；每个模型的 `agents.defaults.models["openrouter/<model>"].params.provider` 和代理参数会按键覆盖它。详见 [OpenRouter 提供商路由](/providers/openrouter#advanced-configuration)。
- `params.extra_body`/`params.extraBody`：高级透传 JSON，会合并到 `api: "openai-completions"` 的请求体中，用于兼容 OpenAI 的代理。如果它与生成的请求键发生冲突，则额外请求体优先；非原生 completions 路由仍会在之后移除仅限 OpenAI 的 `store`。
- `params.chat_template_kwargs`：vLLM/OpenAI 兼容聊天模板参数，会合并到顶层 `api: "openai-completions"` 请求体中。对于关闭思考的 `vllm/nemotron-3-*`，内置 vLLM 插件会自动发送 `enable_thinking: false` 和 `force_nonempty_content: true`；显式的 `chat_template_kwargs` 会覆盖生成的默认值，而 `extra_body.chat_template_kwargs` 仍拥有最终优先级。已配置的 vLLM Qwen 和 Nemotron 思考模型会公开二进制 `/think` 选项（`off`、`on`），而不是多级努力程度阶梯。
- `compat.thinkingFormat`：OpenAI 兼容的思考负载样式。Together 风格的 `reasoning.enabled` 使用 `"together"`，Qwen 风格顶层 `enable_thinking` 使用 `"qwen"`，对于支持请求级聊天模板参数的 Qwen 系列后端（例如 vLLM），使用 `chat_template_kwargs.enable_thinking` 对应的 `"qwen-chat-template"`。OpenClaw 会将禁用思考映射为 `false`，将启用思考映射为 `true`；已配置的 vLLM Qwen 模型会针对这些格式公开二进制 `/think` 选项。
- `compat.supportedReasoningEfforts`：每个模型的 OpenAI 兼容推理努力程度列表。对于确实接受 `"xhigh"` 的自定义端点，可将其加入列表；随后 OpenClaw 会在命令菜单、Gateway 会话行、会话补丁验证、代理 CLI 验证以及该配置提供商/模型的 `llm-task` 验证中公开 `/think xhigh`。当后端需要提供商特定的规范级别值时，使用 `compat.reasoningEffortMap`。
- `params.preserveThinking`：Z.AI 专用的保留思考选择加入项。启用且思考开启时，OpenClaw 会发送 `thinking.clear_thinking: false` 并重放之前的 `reasoning_content`；详见 [Z.AI 思考与保留思考](/providers/zai#advanced-configuration)。
- `localService`：用于本地/自托管模型服务器的可选提供商级进程管理器。当所选模型属于该提供商时，OpenClaw 会探测 `healthUrl`（或 `baseUrl + "/models"`）；如果端点关闭，则使用 `args` 启动 `command`，等待最长 `readyTimeoutMs`，然后发送模型请求。`command` 必须是绝对路径。`idleStopMs: 0` 会使进程保持运行，直到 OpenClaw 退出；正值则会在指定的空闲毫秒数后停止由 OpenClaw 启动的进程。详见[本地模型服务](/gateway/local-model-services)。
- 运行时策略应配置在提供商或模型上，而不是 `agents.defaults` 上。提供商范围的规则使用 `models.providers.<provider>.agentRuntime`，模型特定规则使用 `agents.defaults.models["provider/model"].agentRuntime` / `agents.entries.*.models["provider/model"].agentRuntime`。仅提供提供商/模型前缀绝不会选择某个运行框架。当运行时未设置或为 `auto` 时，只有在精确匹配官方 HTTPS Platform Responses 或 ChatGPT Responses 路由且没有自定义请求覆盖的情况下，OpenAI 才可能隐式选择 Codex。详见 [OpenAI 隐式代理运行时](/providers/openai#implicit-agent-runtime)。
- 修改这些字段的配置写入器（例如 `/models set`、`/models set-image` 以及添加/删除故障转移模型的命令）会保存规范对象形式，并在可能时保留现有的故障转移列表。
- `maxConcurrent`：跨会话的最大并行代理运行数（每个会话仍然串行执行）。默认情况下，OpenClaw 使用 `min(16, max(8, available CPU parallelism))`，其依据是 `os.availableParallelism()`，并在不可用时回退到 `os.cpus().length`。

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

- `id`：`"auto"`、`"openclaw"`、已注册的插件 harness id，或受支持的 CLI 后端别名。内置的 Codex 插件注册了 `codex`；内置的 Anthropic 插件提供了 `claude-cli` CLI 后端。
- `id: "auto"` 会让已注册的插件 harness 认领声明了其支持契约或以其他方式满足该契约的有效路由；如果没有 harness 匹配，则使用 OpenClaw。显式指定插件运行时（例如 `id: "codex"`）时，必须使用该 harness 和兼容的有效路由；如果任一项不可用或执行失败，则直接失败。
- `id: "pi"` 仅作为 `openclaw` 的弃用别名接受，用于保留 v2026.5.22 及更早版本中已发布的配置。新配置应使用 `openclaw`。
- 运行时优先级依次为：精确模型策略（`agents.entries.*.models["provider/model"]`、`agents.defaults.models["provider/model"]` 或 `models.providers.<provider>.models[]`），然后是 `agents.entries.*` / `agents.defaults.models["provider/*"]`，最后是 provider 范围的策略 `models.providers.<provider>.agentRuntime`。
- 整个 agent 级别的运行时键已弃用。运行时选择会忽略 `agents.defaults.agentRuntime`、`agents.entries.*.agentRuntime`、会话运行时固定值以及 `OPENCLAW_AGENT_RUNTIME`。运行 `openclaw doctor --fix` 可移除过时值。
- 符合条件的精确官方 HTTPS OpenAI Responses/ChatGPT 路由，在没有人为设置请求覆盖的情况下，可以隐式使用 Codex harness。将 `provider/model` 的 `agentRuntime.id` 设为 `"codex"` 会使 Codex 成为失败即终止的要求，但不会使不兼容的路由变得兼容。
- 对于 Claude CLI 部署，建议使用 `model: "anthropic/claude-opus-5"`，并配合模型范围的 `agentRuntime.id: "claude-cli"`。为兼容性起见，旧版的 `claude-cli/<model>` 引用仍可使用，但新配置应保持规范的 provider/model 选择，并将执行后端放入 provider/model 运行时策略中。
- 这只控制文本 agent 回合的执行。媒体生成、视觉、PDF、音乐、视频和 TTS 仍使用各自的 provider/model 设置。

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
Anthropic Claude Opus 4.8 在 OpenClaw 中默认关闭 thinking；当显式启用自适应 thinking 时，Anthropic 的 provider 自有 effort 默认值为 `high`。Claude 4.6 模型在未设置明确 thinking 级别时默认使用 `adaptive`】【。

### CLI 后端选择

CLI 适配器机制由插件注册，而不是在代理默认设置下配置。使用模型范围的 `agentRuntime.id` 选择已注册的 CLI 后端，如上所示。有关操作，请参阅 [CLI 后端](/gateway/cli-backends)；有关命令、会话、图像和解析器注册，请参阅 [构建 CLI 后端插件](/plugins/cli-backend-plugins)。

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

定期运行心跳。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        agentId: "ops", // 未配置单个代理心跳时的环境所有者
        every: "30m", // 0m 表示禁用
        activeHours: { start: "08:00", end: "24:00" },
        model: "openai/gpt-5.4-mini",
        session: "main",
        target: "none", // 默认值：none | 选项：last | whatsapp | telegram | discord | ...
        directPolicy: "allow", // allow（默认）| block
        to: "+15555550123",
        accountId: "ops-bot",
        prompt: "Follow the heartbeat monitor scratch context...",
        timeoutSeconds: 45,
        lightContext: false, // 默认值：false；为 true 时跳过心跳运行的工作区引导文件
        isolatedSession: false, // 默认值：false；为 true 时每次心跳都在全新会话中运行（无对话历史）
      },
    },
  },
}
```

- `every`：持续时间字符串（ms/s/m/h）。默认值：`30m`（API 密钥认证）或 `1h`（OAuth 认证）。设置为 `0m` 可禁用。
- `agentId`：当不存在 `agents.entries.*.heartbeat` 配置块时，为环境心跳运行指定的所有者。不含 `agentId` 的共享心跳配置块会保留现有的全代理加入行为。
- 运行频率会写入系统管理的 cron 监控记录。运行 `openclaw doctor --fix` 可生成缺失或过期的记录。如果 cron 被禁用，计划心跳不会运行，网关会在启动时记录警告。
- 心跳对象是严格的。支持的字段包括 `every`、`activeHours`、`model`、`session`、`target`、`directPolicy`、`to`、`accountId`、`prompt`、`timeoutSeconds`、`lightContext` 和 `isolatedSession`。
- `timeoutSeconds`：心跳代理单次运行在被中止前允许的最长时间（秒）。未设置时，如果 `agents.defaults.timeoutSeconds` 已设置则使用该值，否则使用上限为 600 秒的心跳运行频率。
- `directPolicy`：直接消息/私信发送策略。`allow`（默认）允许发送到直接目标。`block` 禁止发送到直接目标，并产生 `reason=dm-blocked`。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文，并跳过工作区引导文件。无论该值如何，监控临时上下文都会由心跳运行器注入。
- `isolatedSession`：为 true 时，每次心跳都在没有既往对话历史的全新会话中运行。隔离模式与 cron 的 `sessionTarget: "isolated"` 相同。每次心跳的令牌成本会从约 100K 降至约 2-5K。
- 忙碌延期会自动进行：计划心跳会等待主任务/cron 活动、同一代理的活动运行以及目标会话中的工作完成；立即唤醒和手动唤醒只会绕过范围更广的同一代理活动运行预检查。
- 默认代理的心跳系统提示词部分会在其运行频率启用时自动包含。确认抑制使用固定的 300 字符剩余预算，推理内容保持内部状态，工具错误警告仍会启用。
- 针对单个代理：设置 `agents.entries.*.heartbeat`。当任一代理定义了 `heartbeat` 时，**只有这些代理**会运行心跳。
- 心跳会运行完整的代理回合——间隔越短，消耗的令牌越多。

### `agents.defaults.systemAgent`

选择其模型和凭据用于处理 OpenClaw 系统代理及 Custodian 咨询的代理：

```json5
{
  agents: {
    defaults: {
      systemAgent: { agentId: "ops" },
    },
  },
}
```

由请求代理发起的委托咨询仍将该请求代理作为其所有者。当未提供 `agentId` 时，OpenClaw 会保留已配置的默认路由。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        enabled: false, // 禁用嵌入式主动自动压缩（默认：true）
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // 已注册的压缩提供程序插件的 ID（可选）
        thinkingLevel: "low", // 仅用于压缩的可选思考级别覆盖
        timeoutSeconds: 180,
        keepRecentTokens: 50000,
        recentTurnsPreserve: 3,
        identifierPolicy: "strict", // strict | off
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // 可选的工具循环压力检查
        postIndexSync: "async", // off | async | await
        postCompactionSections: ["Session Startup", "Red Lines"],
        model: "openrouter/anthropic/claude-sonnet-4-6", // 可选的仅用于压缩的模型覆盖
        maxActiveTranscriptBytes: "20mb", // opt in to preflight local compaction
        notifyUser: true, // 压缩开始/完成以及 memory-flush 降级时发送通知（默认：false）
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // 可选的仅用于 memory-flush 的模型覆盖
          softThresholdTokens: 6000,
          forceFlushTranscriptBytes: "2mb",
        },
      },
    },
  },
}
```

- `enabled`：当为 `false` 时，禁用嵌入式代理运行时中由阈值驱动的自动压缩。OpenClaw 的预检和溢出恢复压缩路径，以及手动执行的 `/compact` 仍然可用。默认值：`true`。
- `mode`：`default` 或 `safeguard`（针对长历史记录的分块摘要）。参见 [压缩](/concepts/compaction)。
- `provider`：已注册的压缩提供程序插件的 ID。设置后，将调用该提供程序的 `summarize()`，而不是使用内置的 LLM 摘要功能。失败时回退到内置实现。设置提供程序会强制使用 `mode: "safeguard"`。参见 [压缩](/concepts/compaction)。
- `thinkingLevel`：仅用于嵌入式 OpenClaw 压缩摘要的可选思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive`、`max` 或 `ultra`）。它会覆盖会话当前的思考级别，并根据所选压缩模型/运行时进行限制。未设置时继承会话级别。原生 Codex app-server 压缩会忽略此设置，因为原生压缩请求不支持按操作设置思考级别；配置此项时，OpenClaw 会记录警告。
- `timeoutSeconds`：单次压缩操作允许的最大秒数，超过后 OpenClaw 将中止该操作。默认值：`180`。
- `keepRecentTokens`：代理截断点预算，用于逐字保留最近的 transcript 尾部。默认值：`20000`。
- `recentTurnsPreserve`：在 safeguard 摘要之外逐字保留的最近用户/助手轮数。默认值：`3`。
- `identifierPolicy`：`strict`（默认）或 `off`。`strict` 会在压缩摘要过程中加入内置的不透明标识符保留指导。
- `qualityGuard`：针对 safeguard 摘要的格式错误输出进行重试检查。默认在 safeguard 模式下启用；设置 `enabled: false` 可跳过审核。
- `midTurnPrecheck`：可选的工具循环压力检查。当 `enabled: true` 时，OpenClaw 会在追加工具结果后、下一次模型调用前检查上下文压力。如果上下文不再适配，它会在提交提示词前中止当前尝试，并复用现有的预检恢复路径来截断工具结果或执行压缩后重试。`default` 和 `safeguard` 两种压缩模式均支持。默认：禁用。
- `postIndexSync`：压缩后的会话记忆重新索引模式。默认值：`"async"`。使用 `"await"` 可获得最强的新鲜度，使用 `"async"` 可降低压缩延迟；仅当会话记忆同步由其他方式处理时才使用 `"off"`。
- `postCompactionSections`：可选的 AGENTS.md H2/H3 节名称，用于在压缩后重新注入。未设置或使用 `[]` 可禁用。
- `model`：可选的 `provider/model-id` 或来自 `agents.defaults.models` 的裸别名，仅用于压缩摘要。裸别名会在调度前解析；发生冲突时，已配置的字面模型 ID 优先。当主会话应继续使用一个模型、而压缩摘要应使用另一个模型时，可以使用此项；未设置时，压缩使用会话的主模型。
- `maxActiveTranscriptBytes`：字节阈值（可以是 `number`，或类似 `"20mb"` 的字符串），用于选择在运行前执行常规本地压缩，当 transcript 历史记录达到该阈值时生效。对于 Codex app-server 会话，相同阈值会限制原生 rollout transcript，过大的原生线程将重新开始。未设置或为 `0` 时禁用。当上下文引擎返回明确的压缩后继身份时，OpenClaw 会采用该身份；内置 SQLite 压缩器则保留当前身份。
- `notifyUser`：当为 `true` 时，会向用户发送简短的上下文维护通知：压缩开始和完成时（例如“正在压缩上下文……”和“压缩完成”），以及压缩前的 memory flush 耗尽、回复将在降级状态下继续时（例如“内存维护暂时失败；继续回复。”）。默认禁用，以保持这些通知静默。
- `memoryFlush`：自动压缩前执行的静默代理操作轮次，用于存储持久记忆。当该维护轮次应保持使用本地模型时，将 `model` 设置为确切的提供程序/模型，例如 `ollama/qwen3:8b`；该覆盖不会继承活动会话的回退链。即使 token 计数器已过时，当 transcript 大小达到阈值时，`forceFlushTranscriptBytes` 也会强制执行 flush。工作区为只读时会跳过。

自定义压缩指令由代码负责。实现带有 `summarize()` 的压缩提供程序
插件，以构建自定义摘要；当压缩后的上下文必须注入后续
模型提示词时，使用 `before_prompt_build`。Doctor 会移除已废弃的指令字段，并指向这些
扩展接口。

### `agents.defaults.contextPruning`

在将内容发送给 LLM 之前，会从内存上下文中清理**旧的工具结果**。不会修改磁盘上的会话历史。默认禁用；设置 `mode: "cache-ttl"` 即可启用。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // 关闭（默认） | cache-ttl
      },
    },
  },
}
```

<Accordion title="cache-ttl 模式行为">

- `mode: "cache-ttl"` 会启用清理过程。
- 清理会先对过大的工具结果进行软裁剪，然后在需要时硬清除较早的工具结果。

**软裁剪**会保留开头 + 结尾，并在中间插入 `...`。

**硬清除**会用占位符替换整个工具结果。

注意：

- 图片块永远不会被裁剪或清除。
- 比例按字符数计算（近似值），并非精确的令牌数量。
- 最近的助手消息会被保留。

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

- 非 Telegram 渠道需要显式设置 `*.streaming.block.enabled: true` 才能启用分块回复。QQ Bot 是例外：它没有 `streaming.block` 相关键，并且只要 `channels.qqbot.streaming.mode` 不为 `"off"`，就会进行分块回复。
- 渠道覆盖项：`channels.<channel>.streaming.block.coalesce`（以及各账户对应的配置）。Discord、Google Chat、Mattermost、MS Teams、Signal 和 Slack 默认使用 `minChars: 1500` / `idleMs: 1000`。
- `blockStreamingChunk.breakPreference`：首选的分块边界（`"paragraph" | "newline" | "sentence"`）。
- `humanDelay`：分块回复之间的随机暂停时间。默认值：`off`。`natural` = 800-2500 毫秒。`custom` 使用 `minMs`/`maxMs`（任一边界未设置时，将回退到自然范围）。代理级别的覆盖项：`agents.entries.*.humanDelay`。

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

- 默认值：直接聊天/提及时为 `instant`，未提及的群聊中为 `message`。
- `typingIntervalSeconds` 默认值：`6`。
- 按代理覆盖：`agents.entries.*.typingMode`。

参见 [输入指示器](/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可选沙箱。完整指南请参见 [沙箱](/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off (default) | non-main | all
        backend: "docker", // docker (default) | podman | openshell | ssh
        scope: "agent", // session | agent (default) | shared
        workspaceAccess: "none", // none (default) | ro | rw
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

**沙箱浏览器**（`sandbox.browser.enabled`，默认 `false`）：容器中的 Chromium + CDP。不需要在 `openclaw.json` 中启用 `browser.enabled`。
noVNC 观察者访问受密码保护，并通过一次性、经过身份验证的引导 URL 进行代理。观察者 URL 会有意从模型可见的系统提示上下文中省略。

- `allowHostControl: false`（默认）会阻止沙箱会话定位宿主机浏览器。
- `network` 默认为 `openclaw-sandbox-browser`（专用 bridge 网络）。仅当你明确需要全局 bridge 连接时才设置为 `bridge`。由于 CDP 端口必须发布到宿主机，因此不支持 `"none"`；`"host"` 同样被阻止。升级时，`openclaw doctor --fix` 会禁用受持久化 `"none"` 值影响的 sidecar，并恢复专用网络，而不会在不知情的情况下启用出站访问。
- `cdpSourceRange` 可选地将容器边缘的 CDP 入站连接限制为某个 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将额外的宿主目录挂载到沙箱浏览器容器中。设置后（包括 `[]`），它会替换浏览器容器的 `docker.binds`。
- 沙箱浏览器容器中的 Chromium 始终以 `--no-sandbox --disable-setuid-sandbox` 启动（容器不具备 Chrome 自有沙箱所需的内核原语）；没有用于此设置的配置开关。
- 启动默认值在 `scripts/sandbox-browser-entrypoint.sh` 中定义，并针对容器主机进行了调整：
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

沙箱浏览器需要 Docker 引擎。`sandbox.docker.binds` 同时适用于 Docker 和 Podman 后端。

构建镜像（从源码检出构建）：

```bash
scripts/sandbox-setup.sh           # 主沙箱镜像
scripts/sandbox-browser-setup.sh   # 可选的浏览器镜像
```

关于无源码检出的 npm 安装，请参见 [沙箱 § 镜像和设置](/gateway/sandboxing#images-and-setup) 中的内联 `docker build` 命令。

### `agents.entries`（每个代理的覆盖设置）

使用 `agents.entries.*.tts` 为代理指定其自己的 TTS 提供商、语音、模型、
风格或自动 TTS 模式。代理配置块会与全局
`tts` 进行深度合并，因此共享凭据可以集中放置，而各个代理只需覆盖所需的语音或提供商字段。当前代理的覆盖设置会应用于自动语音回复、`/tts audio`、`/tts status` 以及 `tts` 代理工具。有关提供商示例和优先级，请参阅[文本转语音](/tools/tts#per-agent-voice-overrides)。

```json5
{
  agents: {
    entries: {
      main: {
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
            mode: "persistent", // 持久模式 | 单次模式
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
    },
  },
}
```

- `agents.entries` 中的每个键都是稳定的代理 ID。
- `default`：必须且只能有一个代理条目设置 `default: true`。
- `model`：字符串形式会为代理设置严格的专用主模型，且不使用模型回退；对象形式 `{ primary }` 同样是严格模式，除非添加 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 可为该代理启用回退，或使用 `{ primary, fallbacks: [] }` 明确指定严格行为。仅覆盖 `primary` 的 Cron 作业仍会继承默认回退设置，除非将 `fallbacks` 设置为 `[]`。
- `utilityModel`：可选的每个代理覆盖设置，用于生成会话标题和线程标题等简短的内部任务。若未设置，则回退到 `agents.defaults.utilityModel`，再回退到当前生效会话提供商声明的小模型默认值。控制面板标题会使用当前生效的常规会话模型重试一次。空字符串会为该代理跳过备用的实用模型路径，但不会禁用控制面板标题生成。
- `params`：每个代理的流参数，会与 `agents.defaults.models` 中所选模型条目合并。可用于设置代理专用的覆盖项，例如 `cacheRetention`、`temperature` 或 `maxTokens`，而无需重复整个模型目录。
- `tts`：可选的每个代理文本转语音覆盖设置。该配置块会与 `tts` 进行深度合并，因此共享的提供商凭据和回退策略应保留在 `tts` 中，此处只需设置提供商、语音、模型、风格或自动模式等角色专用值。
- `skills`：可选的每个代理技能允许列表。省略时，如果设置了 `agents.defaults.skills`，代理会继承该设置；显式列表会替换默认值，而不是进行合并，`[]` 表示不使用任何技能。
- `thinkingDefault`：可选的每个代理默认思考级别（`off | minimal | low | medium | high | xhigh | adaptive | max`）。当未设置每条消息或会话级覆盖时，会覆盖该代理的 `agents.defaults.thinkingDefault`。所选提供商/模型配置决定哪些值有效；对于 Google Gemini，`adaptive` 会保留提供商控制的动态思考（Gemini 3/3.1 不设置 `thinkingLevel`，Gemini 2.5 使用 `thinkingBudget: -1`）。
- `reasoningDefault`：可选的每个代理默认推理可见性（`on | off | stream`）。当未设置每条消息或会话级推理覆盖时，会覆盖该代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可选的每个代理快速模式默认值（`"auto" | true | false`）。当未设置每条消息或会话级快速模式覆盖时生效。
- `models`：可选的每个代理模型目录/运行时覆盖设置，以完整的 `provider/model` ID 为键。使用 `models["provider/model"].agentRuntime` 可设置每个代理的运行时例外。
- `runtime`：可选的每个代理运行时描述符。当代理应默认使用 ACP 宿主会话时，使用 `type: "acp"`，并通过 `runtime.acp` 设置默认值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：相对于工作区的路径、`http(s)` URL 或 `data:` URI。
- 本地工作区相对路径的 `identity.avatar` 图片大小限制为 2 MB。`http(s)` URL 和 `data:` URI 不受本地文件大小限制检查。
- `identity` 会派生默认值：根据 `emoji` 派生 `ackReaction`，根据 `name`/`emoji` 派生 `mentionPatterns`。
- `subagents.allowAgents`：为显式的 `sessions_spawn.agentId` 目标设置已配置代理 ID 的允许列表（`["*"]` = 任意已配置目标；默认值：仅允许同一代理）。如果应允许以自身为目标的 `agentId` 调用，请包含请求者 ID。配置已被删除的代理所对应的过时条目会被 `sessions_spawn` 拒绝，并从 `agents_list` 中省略；运行 `openclaw doctor --fix` 清理这些条目，或者添加一个最小的 `agents.entries.*` 条目，以便该目标在继承默认设置的同时仍可被生成。
- 沙箱继承保护：如果请求者会话处于沙箱中，`sessions_spawn` 会拒绝运行在非沙箱环境中的目标。
- `subagents.requireAgentId`：为 `true` 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置；默认值：`false`）。
- `subagents.maxConcurrent`：子代理执行期间允许的最大并发子代理运行数。默认值：`8`。
- `subagents.maxChildrenPerAgent`：单个代理会话可生成的最大活动子代理数。默认值：`5`。
- `subagents.maxSpawnDepth`：子代理生成的最大嵌套深度（`1`-`5`）。默认值：`1`（不允许嵌套）。
- `subagents.archiveAfterMinutes`：已完成子代理状态被归档前的存留时间。默认值：`60`。

## 多代理路由

在一个 Gateway 中运行多个彼此隔离的代理。参见 [Multi-Agent](/concepts/multi-agent)。

```json5
{
  agents: {
    entries: {
      home: { default: true, workspace: "~/.openclaw/workspace-home" },
      work: { workspace: "~/.openclaw/workspace-work" },
    },
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
    entries: {
      personal: {
        default: true,
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    },
  },
}
```

</Accordion>

<Accordion title="只读工具 + 工作区">

```json5
{
  agents: {
    entries: {
      family: {
        default: true,
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
    },
  },
}
```

</Accordion>

<Accordion title="无文件系统访问（仅消息功能）">

```json5
{
  agents: {
    entries: {
      public: {
        default: true,
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
    },
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

- **`scope`**：群聊上下文的基础会话分组策略。
  - `per-sender`（默认）：在一个频道上下文中，每个发送者都拥有隔离的会话。
  - `global`：频道上下文中的所有参与者共享单个会话（仅在确实需要共享上下文时使用）。
- **`dmScope`**：私信的分组方式。
  - `main`：所有私信共享主会话。
  - `per-peer`：跨频道按发送者 ID 隔离。
  - `per-channel-peer`：按频道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`：按账户 + 频道 + 发送者隔离（推荐用于多账户）。
- **`identityLinks`**：将规范 ID 映射到带提供商前缀的对端，以实现跨频道会话共享。`/dock_discord` 等停靠命令使用同一映射，将当前会话的回复路由切换到另一个已关联的频道对端；参见[频道停靠](/concepts/channel-docking)。
- **`reset`**：主要重置策略。`none` 禁用自动重置，也是默认值；系统会改为通过压缩限制活跃上下文。`daily` 在本地时间的 `atHour` 时重置；`idle` 在 `idleMinutes` 后重置。如果两者都已配置，则以先到期者为准。在所有模式下，`/new` 和 `/reset` 仍然可用。每日重置的新鲜度使用会话行的 `sessionStartedAt`；空闲重置的新鲜度使用 `lastInteractionAt`。心跳、cron 唤醒、执行通知和网关记账等后台/系统事件写入可能会更新 `updatedAt`，但不会使每日/空闲会话保持新鲜。
  - **`resetByType`**：按类型覆盖（`direct`、`group`、`thread`）。Doctor 会将旧版 `dm` 条目迁移为 `direct`；架构会拒绝 `dm`。
- **`resetByChannel`**：按提供商/频道 ID 设置的频道级重置覆盖。当会话所在频道存在匹配条目时，该条目将完全优先于该会话的 `resetByType`/`reset`。仅当某个频道需要与类型级策略不同的重置行为时使用。
- **`mainKey`**：旧版字段。运行时始终使用 `"main"` 作为主直接聊天存储桶。
- **`sendPolicy`**：按 `channel`、`chatType`（`direct|group|channel`，以及旧版 `dm` 别名）、`keyPrefix` 或 `rawKeyPrefix` 进行匹配。第一个拒绝规则优先。
- **`maintenance`**：会话存储清理和保留控制。
  - `mode`：`enforce` 会应用清理策略，也是默认值；`warn` 仅发出警告。
  - `pruneAfter`：过期条目的时间阈值（默认 `30d`）。
  - `maxEntries`：SQLite 会话条目的最大数量（默认 `500`）。运行时写入会使用较小的高水位缓冲区批量执行清理，以适应生产规模的上限；`openclaw sessions cleanup --enforce` 会立即应用该上限。
  - 短生命周期的网关模型运行探测会话使用固定的 `24h` 保留期，但清理操作受压力条件控制：只有在会话条目维护/上限压力达到时，才会删除过期的严格模型运行探测行。只有匹配 `agent:*:explicit:model-run-<uuid>` 的严格显式探测键符合条件；普通直接会话、群组会话、线程会话、cron、hook、心跳、ACP 和子代理会话不会继承这一 `24h` 保留期。模型运行清理执行时，会先于更宽泛的 `pruneAfter` 过期条目清理和 `maxEntries` 上限处理。
  - 当前架构会拒绝旧版 `rotateBytes`；`openclaw doctor --fix` 会从旧配置中移除该字段。
  - `resetArchiveRetention`：重置/删除的转录存档的基于时间的保留策略。默认情况下，存档会一直保留，直到磁盘预算驱逐；设置持续时间可选择按墙上时钟删除，设置为 `false` 则显式禁用该功能。
  - `maxDiskBytes`：可选的会话目录磁盘预算。在 `warn` 模式下记录警告；在 `enforce` 模式下优先删除最旧的工件/会话。
  - `highWaterBytes`：预算清理后的可选目标值。默认为 `maxDiskBytes` 的 `80%`。
- **`threadBindings`**：线程绑定会话功能的全局默认值。
  - `enabled`：受支持的频道线程绑定的总开关。
  - `idleHours`：默认的非活动自动取消聚焦时间（小时）（`0` 禁用；提供商可以覆盖）。
  - `maxAgeHours`：默认的最大时长（小时）（`0` 禁用；提供商可以覆盖）。
  - `spawnSessions`：通过 `sessions_spawn` 和 ACP 线程生成创建线程绑定工作会话的默认开关。启用线程绑定时默认为 `true`；提供商/账户可以覆盖。
  - `defaultSpawnContext`：线程绑定生成任务的默认原生子代理上下文（`"fork"` 或 `"isolated"`）。默认为 `"fork"`。
- **`sharing`**：控制所有者和 `operator.admin` 连接可以选择的每会话协作模式。每个标志默认均为 `true`；将某个标志设置为 `false` 会从控制界面中移除对应选项，并使创建时的可见性设置或 `session.visibility.set` 拒绝该选项。除非控制界面以草稿形式启动会话，否则新会话以 `shared` 模式启动。
  - `readOnly`：允许使用 `read-only` 模式，非成员可以观看，但不能发送消息、操控、终止、审批或修改会话状态。
  - `suggest`：允许使用 `suggest` 模式。在此阶段，它执行与 `read-only` 相同的准入行为；建议队列将在后续功能中提供。
  - `drafts`：允许使用 `draft` 模式，该模式会将会话从非管理员、非所有者的会话列表和事件广播中隐藏。

成员资格和可见性变更会以系统备注的形式写入会话转录。这些控制用于协调共享同一代理的操作员；它们不是租户之间的安全边界。当工作需要隔离时，请使用独立的网关或代理。

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
      mode: "steer", // steer（默认） | followup | collect | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize（默认）
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

- 默认使用活动代理的 `identity.emoji`，否则使用 `"👀"`。设置为 `""` 可禁用。
- 按频道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：账户 → 频道 → `messages.ackReaction` → 身份回退值。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`，或 `off`/`none`（完全禁用确认反应）。
- `group-mentions` 会确认提及代理的群组消息，包括设置了 `requireMention: false` 的群组。使用 `group-all` 可确认每条群组消息。
- `messages.statusReactions.enabled`：启用 Slack、Discord、Signal、Telegram 和 WhatsApp 上的生命周期状态反应。
  在 Discord 上，未设置时，只要确认反应处于启用状态，状态反应就会保持启用。
  在 Slack、Signal、Telegram 和 WhatsApp 上，必须明确设置为 `true` 才能启用生命周期状态反应。
  默认情况下，Slack 使用其原生助手线程状态和轮换显示的加载消息来报告进度，同时保持配置的确认反应不变。

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

- `channels.whatsapp.responsePrefix`：出站 WhatsApp 回复前缀。仅当规范值未设置时，Doctor 才会将已弃用的入站 `messagePrefix` 值移至此处。
- `messages.visibleReplies`：控制直接、群组和频道会话中可见的源回复（`"message_tool"` 要求使用 `message(action=send)` 才能产生可见输出；`"automatic"` 则像以前一样发布普通回复）。
- `messages.usageTemplate` / `messages.responseUsage`：自定义 `/usage` 页脚模板和每次回复的默认用量模式（`off | tokens | full`，以及作为 `tokens` 别名的旧版 `on`）。
- `messages.groupChat.mentionPatterns` / `historyLimit`：群组消息提及触发模式和历史记录窗口大小。
- `messages.suppressToolErrors`：为 `true` 时，隐藏向用户显示的 `⚠️` 工具错误警告（代理仍会在上下文中看到错误并可以重试）。默认：`false`。

### TTS（文本转语音）

```json5
{
  tts: {
    auto: "off", // off（默认） | always | inbound | tagged
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

全局偏好路径属于机器状态（默认为
`~/.openclaw/settings/tts.json`；可使用 `OPENCLAW_TTS_PREFS` 覆盖）。高级的多代理设置可以通过 `agents.entries.<id>.tts.prefsPath` 为每个代理设置不同的偏好存储。

- `auto` 控制默认的自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆盖本地偏好，`/tts status` 会显示生效状态。
- `summaryModel` 会覆盖用于自动摘要的 `agents.defaults.model.primary`。
- `modelOverrides` 默认启用（`enabled !== false`）；`modelOverrides.allowProvider` 需要选择启用。
- API 密钥会回退使用 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 捆绑的语音提供方由插件负责。如果设置了 `plugins.allow`，请包含想要使用的每个 TTS 提供方插件，例如用于 Edge TTS 的 `microsoft`。旧版 `edge` 提供方 ID 可作为 `microsoft` 的别名使用。
- `providers.openai.baseUrl` 会覆盖 OpenAI TTS 端点。解析顺序为：配置项，然后是 `OPENAI_TTS_BASE_URL`，最后是 `https://api.openai.com/v1`。
- 当 `providers.openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 会将其视为兼容 OpenAI 的 TTS 服务器，并放宽模型/语音验证。

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
      mode: "realtime", // 实时 | 语音转文本-文本转语音 | 转录
      transport: "webrtc", // webrtc | 提供商 WebSocket | 网关中继 | 托管房间
      vadThreshold: 0.5,
      silenceDurationMs: 500,
      prefixPaddingMs: 300,
      reasoningEffort: "medium",
      brain: "agent-consult", // agent-consult | 直接工具 | 无
    },
  },
}
```

- 当配置了多个 Talk 提供商时，`talk.provider` 必须与 `talk.providers` 中的某个键匹配。
- 对于未指定代理作用域会话密钥而创建的 Talk 会话，`talk.agentId` 负责管理这些会话。会话作用域的 Talk 调用仍会使用该密钥中编码的代理。对于现有的多代理配置，Doctor 可能会创建一个仅包含此所有者的最小 `talk` 块。
- 旧版扁平 Talk 键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容。运行 `openclaw doctor --fix`，将持久化配置重写为 `talk.providers.<provider>`。
- Voice ID 会回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`（macOS Talk 客户端行为）。
- `providers.*.apiKey` 接受纯文本字符串或 SecretRef 对象。
- 仅当未配置 Talk API 密钥时，才会应用 `ELEVENLABS_API_KEY` 回退值。
- `providers.*.voiceAliases` 允许 Talk 指令使用易记名称。
- `providers.mlx.modelId` 选择 macOS 本地 MLX 辅助程序所使用的 Hugging Face 仓库。如果省略，macOS 将使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放会在可用时通过捆绑的 `openclaw-mlx-tts` 辅助程序运行，否则使用 `PATH` 上的可执行文件；`OPENCLAW_MLX_TTS_BIN` 可在开发过程中覆盖辅助程序路径。
- `consultThinkingLevel` 控制 Control UI Talk 实时 `openclaw_agent_consult` 调用背后完整 OpenClaw 代理运行时的思考级别。不设置则保持正常的会话/模型行为。
- `consultFastMode` 为 Control UI Talk 实时咨询设置一次性的快速模式覆盖，不会更改会话的正常快速模式设置。
- `speechLocale` 设置由 Android、iOS 和 macOS Talk 语音识别以及 iOS 系统语音回退所使用的 BCP 47 区域设置 ID。Android 还会使用其中的语言组件来辅助实时输入转录。不设置则使用设备默认值。
- `silenceTimeoutMs` 控制 Talk 模式在用户静音后等待多长时间再发送转录文本。不设置则保留平台默认的暂停时间窗口（`macOS 和 Android 为 700 ms，iOS 为 900 ms`）。
- `realtime.instructions` 会将面向提供商的系统指令附加到 OpenClaw 的内置实时提示词中，因此无需丢失默认的 `openclaw_agent_consult` 指导即可配置语音风格。
- `realtime.vadThreshold` 将提供商的语音活动阈值设置为从 `0`（最敏感）到 `1`（最不敏感）。不设置则保留提供商默认值。
- `realtime.silenceDurationMs` 设置提供商提交实时用户回合之前的正整数静音时间窗口。不设置则保留提供商默认值。
- `realtime.prefixPaddingMs` 设置检测到语音开始之前所保留的非负整数音频时长。不设置则保留提供商默认值。
- `realtime.reasoningEffort` 设置实时会话所使用的提供商特定推理级别。不设置则保留提供商默认值。
- `realtime.consultRouting`：`"provider-direct"`（默认值）在实时提供商生成最终用户转录文本但未调用 `openclaw_agent_consult` 时，保留提供商的直接回复；`"force-agent-consult"` 则会将最终请求改由 OpenClaw 处理。

## 相关

- [配置参考](/gateway/configuration-reference) — 其他所有配置键
- [配置](/gateway/configuration) — 常见任务和快速设置
- [配置示例](/gateway/configuration-examples)
