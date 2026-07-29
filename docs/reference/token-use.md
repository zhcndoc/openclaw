---
summary: "OpenClaw 如何构建提示上下文并报告 token 使用量和成本"
read_when:
  - 解释 token 使用量、成本或上下文窗口
  - 调试上下文增长或压缩行为
title: "Token 使用量和成本"
---

OpenClaw 跟踪的是 **token**，而不是字符。Token 取决于模型，但大多数
OpenAI 风格的模型在英文文本中平均每个 token 约 4 个字符。

## 系统提示是如何构建的

OpenClaw 会在每次运行时组装自己的系统提示。它包括：

- 工具列表 + 简短描述
- 技能列表（仅元数据；指令会在需要时通过 `read` 加载）。原生
  Codex 运行会将紧凑的技能块作为作用域限定于轮次的协作开发者指令；其他运行环境会在正常提示表面中获得它。
  受 `skills.limits.maxSkillsPromptChars` 限制，并可通过
  `agents.entries.*.skillsLimits.maxSkillsPromptChars` 为单个 agent 进行可选覆盖。
- 自更新指令
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、
  `IDENTITY.md`、`USER.md`、新建时的 `BOOTSTRAP.md`，以及存在时的
  `MEMORY.md`）。较大的注入文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认：`20000`）；引导注入总量上限为 `agents.defaults.bootstrapTotalMaxChars`（默认：
  `60000`）。
  - 当该工作区可用记忆工具时，原生 Codex 轮次不会粘贴原始 `MEMORY.md`；它们会在作用域限定于轮次的协作开发者指令中改为获得一个简短的记忆指针，并按需使用记忆工具。如果工具被禁用、记忆搜索不可用，或当前工作区与 agent 记忆工作区不同，则 `MEMORY.md` 会回退到普通的有界轮次上下文路径。
  - 小写根目录 `memory.md` 永远不会被注入。它是给 `openclaw doctor --fix` 使用的遗留修复输入，该命令会将其迁移到 `MEMORY.md`。
  - `memory/*.md` 日常文件不属于正常的引导提示；它们在普通轮次中保持为可通过记忆工具按需访问。重置/启动模型运行可以为第一次轮次预先附加一个一次性的启动上下文块，其中包含最近的日常记忆，该行为由
    `agents.defaults.startupContext` 控制。裸聊天 `/new` 和 `/reset` 会被确认，但不会调用模型。
  - 进行压缩后，`AGENTS.md` 摘录需要显式启用
    `agents.defaults.compaction.postCompactionSections`；插件可以通过 `before_prompt_build` 添加其他上下文。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据（主机/操作系统/模型/思考）

完整拆解请参见 [System Prompt](/concepts/system-prompt)。

在记录凭证或认证片段时，请使用
[Secret Placeholder Conventions](/reference/secret-placeholder-conventions) 以
避免仅文档更改时触发 secret-scanner 的误报。

## 什么计入上下文窗口

模型接收到的所有内容都会计入上下文限制：

- System prompt (all sections above)
- Conversation history (user + assistant messages)
- Tool calls and tool results
- Attachments/transcripts (images, audio, files)
- Compaction summaries and pruning artifacts
- Provider wrappers or safety headers (not visible, but still counted)

Runtime-heavy surfaces have their own explicit caps under
`agents.defaults.contextLimits` (per-agent overrides under
`agents.entries.*.contextLimits`):

| Key                      | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `memoryGetMaxChars`      | `memory_get` 返回结果在截断前的最大字符数。                   |
| `postCompactionMaxChars` | 在压缩后刷新期间，从 `AGENTS.md` 保留的最大字符数。 |

这些都是有界的运行时摘录和注入的运行时所有块，
它们与启动引导限制、启动上下文限制以及技能提示词
限制是分开的。

OpenClaw 会根据有效模型上下文窗口推导实时工具结果上限：
在 100K tokens 以下为 `16000` 字符，在 100K+ tokens 时为 `32000` 字符，在 200K+ tokens 时为 `64000` 字符。运行时上下文共享保护也会将单个工具结果限制为上下文窗口的 30%。

大型提供方窗口不会在显著增加成本或延迟时自动启用。例如，直接使用 OpenAI GPT-5.5 和 GPT-5.6 模型时，会公布 `1050000` token 的总窗口，但 OpenClaw 默认将其活动运行时预算设为 `272000` tokens。可选启用的 `922000` 输入预算会保留完整的 `128000` 输出额度，而一旦输入超过 `272000` tokens，OpenAI 会对整个请求应用更高的长上下文定价。另请参阅
[OpenAI 上下文窗口默认值](/providers/openai#context-window-defaults-and-long-context-opt-in)。

对于图片，OpenClaw 会在调用提供方之前对转录/工具图片载荷进行降采样。可通过
`agents.defaults.imageMaxDimensionPx` 调整（默认：
`1200`）：

- 更低的值会减少视觉 token 的使用和载荷大小。
- 更高的值会为 OCR/UI 密集型截图保留更多视觉细节。

如需按注入文件、工具、技能和系统提示词大小进行实际拆解，请使用 `/context list` 或 `/context detail`。另请参阅
[上下文](/concepts/context)。

## 如何查看当前 token 使用量

在聊天中：

- `/status` -> 带表情符号的状态卡，显示会话模型、上下文使用量、
  上一次响应的输入/输出 token，以及在为当前活动模型配置了本地定价时的估算成本。
- `/usage off|tokens|full` -> 为每次回复附加使用量页脚。
  按会话持久化（存储为 `responseUsage`）。
  - `/usage reset`（别名：`inherit`、`clear`、`default`）会清除
    会话覆盖值，使其重新继承已配置的默认值。
  - `/usage tokens` 显示轮次 token/cache 详情。
  - `/usage full` 显示精简的模型/上下文/成本详情；仅当 OpenClaw 具有使用元数据且为活动模型配置了本地定价时才会显示估算成本。自定义 `messages.usageTemplate` 布局可以包含 token/cache 字段。
- `/usage cost` -> 来自 OpenClaw 会话日志的本地成本摘要。

其他表面：

- **TUI/Web TUI:** 支持 `/status` 和 `/usage`。
- **CLI:** `openclaw status --usage` 和 `openclaw channels list` 会显示
  规范化后的提供方配额窗口（`X% left`，而不是按响应计费）。
  当前支持 usage-window 的提供方：Claude（Anthropic）、ClawRouter、Copilot
 （GitHub）、DeepSeek、Gemini（Google Gemini CLI）、MiniMax、OpenAI、小米、
  小米 Token Plan，以及 z.ai。

使用界面在显示前会先规范化常见的提供方原生字段别名。对于 OpenAI 系列 Responses 流量，这包括 `input_tokens`/`output_tokens` 和 `prompt_tokens`/`completion_tokens`，因此传输层特定的字段名不会改变 `/status`、`/usage` 或会话摘要。Gemini CLI 的使用量也会被规范化：默认的 `stream-json`
解析器会读取助手的 `message` 事件，而 `stats.cached` 会映射为
`cacheRead`，当 CLI 省略显式的 `stats.input` 字段时，会使用 `stats.input_tokens - stats.cached`。
旧版 JSON 覆盖仍然会从 `response` 中读取回复文本。

对于原生 OpenAI 系列 Responses 流量，WebSocket/SSE 使用别名会以相同方式规范化，并且当 `total_tokens` 缺失或为 `0` 时，总数会回退为规范化后的输入 + 输出。

当当前会话快照较为稀疏时，`/status` 和 `session_status`
可以从最近的转录使用日志中恢复 token/cache 计数器以及活动运行时模型标签。
现有的非零实时值仍然优先于转录回退值，而当存储的总数缺失或更小时，更大的、以 prompt 为导向的转录总数可以胜出。

提供方配额窗口的使用认证优先来自提供方特定的钩子；如果某个提供方没有钩子（或钩子未解析出 token），OpenClaw 会回退到从 auth
配置文件、环境变量或配置中匹配 OAuth/API key 凭据。

助手转录条目会持久化相同的规范化使用量结构，
包括当活动模型已配置定价且提供方返回使用元数据时的 `usage.cost`。这使得 `/usage cost` 和基于转录的会话状态即使在实时运行时状态消失后仍能有稳定的数据来源。

OpenClaw 将提供方使用量统计与当前上下文快照分开维护。提供方 `usage.total` 可能包含缓存输入、输出以及多次工具循环中的模型调用，因此它有助于成本和遥测统计，但可能会高估实时上下文窗口。上下文显示和诊断会使用最新的 prompt 快照（`promptTokens`，或者在没有 prompt 快照时使用最后一次模型调用）来计算 `context.used`。

## 成本估算（显示时）

成本根据你的模型定价配置进行估算：

```text
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和 `cacheWrite` 的 **每 100 万 token 的 USD 价格**。如果缺少定价，`/usage full` 会省略成本；当你需要在每次回复中都包含 token/cache 详情时，请使用 `/usage tokens` 或自定义 `messages.usageTemplate`。成本显示不局限于 API key 认证：像 `aws-sdk` 这样的非 API key 提供方，如果其配置的模型条目包含本地定价且提供方返回了使用情况元数据，也可以显示估算成本。

定价更新会与模型元数据一起随托管模型目录发布。OpenClaw 不会直接从 OpenRouter 或 LiteLLM 拉取数据。将 `models.catalogRefresh.enabled: false` 设置为 false 可在离线或受限网络中禁用托管目录流量；捆绑的定价和显式的 `models.providers.*.models[].cost` 条目仍然会驱动本地成本估算。

## Cache TTL 和剪枝影响

Provider prompt caching only applies within the cache TTL window. OpenClaw
可以选择性地运行 **cache-ttl 剪枝**：当会话的 cache TTL 过期后，它会剪枝该会话，然后重置缓存窗口，从而使后续请求复用新缓存的上下文，而不是重新缓存完整历史记录。
这样可以在会话在 TTL 过期后进入空闲状态时，降低缓存写入成本。

在 [Gateway configuration](/gateway/configuration) 中进行配置，并在 [Session pruning](/concepts/session-pruning) 中查看
行为细节。

Heartbeat 可以在空闲间隔期间保持缓存 **温热**。如果你的模型缓存 TTL 是 `1h`，将 heartbeat 间隔设置得略低于该值（例如 `55m`）可以
避免重新缓存完整提示词，从而降低缓存写入成本。

In multi-agent setups, you can keep one shared model config and tune cache
behavior per agent with `agents.entries.*.params.cacheRetention`.

关于逐项旋钮指南，请参见 [Prompt Caching](/reference/prompt-caching)。

For Anthropic API pricing, cache reads are significantly cheaper than input
tokens, while cache writes are billed at a higher multiplier. See Anthropic's
prompt caching pricing for the latest rates and TTL multipliers:
[https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

### 示例：使用 heartbeat 保持 1h 缓存温热

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### 示例：按代理使用不同的缓存策略处理混合流量

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # 大多数代理的默认基线
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # 为深度会话保持长缓存温热
    - id: "alerts"
      params:
        cacheRetention: "none" # 避免为突发通知写入缓存
```

`agents.entries.*.params` merges on top of the selected model's `params`, so you
can override only `cacheRetention` and inherit other model defaults
unchanged.

### Anthropic 1M context

OpenClaw 为 Anthropic 的 1M 上下文窗口配置了可 GA 的 Claude 4.x 模型，例如 Opus 4.8、Opus 4.7、Opus
4.6 和 Sonnet 4.6。对于这些模型，你不需要
`params.context1m: true`。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

较旧的配置可以继续保留 `context1m: true`，但 OpenClaw 不再为此设置发送
Anthropic 已弃用的 `context-1m-2025-08-07` beta 头部，并且
不会将不受支持的旧 Claude 模型扩展到 1M。

要求：凭证必须具备长上下文使用资格。否则，
Anthropic 会针对该请求返回提供方侧的速率限制错误。

If you authenticate Anthropic with OAuth/subscription tokens
(`sk-ant-oat-*`), OpenClaw preserves the OAuth-required Anthropic beta
headers while stripping the retired `context-1m-*` beta if it remains in
older config.

## 降低 token 压力的建议

- 使用 `/compact` 来概括长会话。
- 在你的工作流中裁剪大型工具输出。
- 为截图密集型会话降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表会被注入到提示中）。
- 对于冗长、探索性工作，优先使用更小的模型。

准确的技能列表开销公式请参见 [技能](/tools/skills)。

## 相关

- [API 使用情况和费用](/reference/api-usage-costs)
- [提示缓存](/reference/prompt-caching)
- [使用情况跟踪](/concepts/usage-tracking)
