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

- 工具列表 + 简短说明
- 技能列表（仅元数据；指令会按需通过 `read` 加载）。
  原生 Codex 回合会将紧凑的技能块作为回合作用域的协作开发者指令；
  其他 harness 会在正常提示表面接收它。其长度受 `skills.limits.maxSkillsPromptChars` 约束，
  并可通过 `agents.list[].skillsLimits.maxSkillsPromptChars` 按代理覆盖。
- 自更新指令
- 工作区 + 启动文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、新建时的 `BOOTSTRAP.md`，以及存在时的 `MEMORY.md`）。当该工作区可用记忆工具时，原生 Codex 回合不会从已配置的代理工作区直接粘贴原始 `MEMORY.md`；它们会在回合作用域的协作开发者指令中包含一个简短的记忆指针，并按需使用记忆工具。如果工具被禁用、记忆搜索不可用，或者活动工作区与代理记忆工作区不同，则 `MEMORY.md` 会走正常的有界回合上下文路径。小写的根目录 `memory.md` 不会被注入；它是 `openclaw doctor --fix` 在与 `MEMORY.md` 配对时使用的旧版修复输入。较大的注入文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认：20000），总启动注入受 `agents.defaults.bootstrapTotalMaxChars` 限制（默认：60000）。`memory/*.md` 日常文件不属于正常的启动提示；它们在普通回合中仍可通过记忆工具按需获取，但重置/启动模型运行可以在第一个回合前附加一个一次性的启动上下文块，包含最近的日常记忆。裸聊天 `/new` 和 `/reset` 命令会被确认，但不会调用模型。启动前导由 `agents.defaults.startupContext` 控制。压缩后的 AGENTS.md 摘录是独立的，并需要显式启用 `agents.defaults.compaction.postCompactionSections`。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据（主机/操作系统/模型/思考）

完整拆解请参见 [System Prompt](/concepts/system-prompt)。

在记录凭证或认证片段时，请使用
[Secret Placeholder Conventions](/reference/secret-placeholder-conventions) 以
避免仅文档更改时触发 secret-scanner 的误报。

## 什么计入上下文窗口

模型接收到的所有内容都会计入上下文限制：

- 系统提示（上面列出的所有部分）
- 对话历史（用户 + 助手消息）
- 工具调用和工具结果
- 附件/转录（图像、音频、文件）
- 压缩摘要和剪枝产物
- 提供方包装或安全头部（不可见，但仍会计入）

某些运行时开销较大的表面有各自明确的上限：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

按代理的覆盖项位于 `agents.list[].contextLimits` 下。这些旋钮用于
有界的运行时摘录和注入的运行时拥有块。它们与引导限制、启动上下文限制以及技能提示
限制是分开的。

`toolResultMaxChars` 是一个高级上限（最高可达 `1000000`` 字符）。当它未设置时，OpenClaw 会根据有效模型上下文窗口选择实时工具结果上限：低于 100K token 时为 `16000` 个字符，100K+ token 时为 `32000` 个字符，200K+ token 时为 `64000` 个字符，同时仍受运行时上下文共享保护限制。

对于图像，OpenClaw 会在调用提供方之前对转录/工具图像载荷进行缩放。
使用 `agents.defaults.imageMaxDimensionPx`（默认：`1200`）来调整此项：

- 更低的值通常会降低视觉 token 使用量和载荷大小。
- 更高的值可为 OCR/UI 密集型截图保留更多视觉细节。

关于按注入文件、工具、技能和系统提示大小的实际拆解，请使用 `/context list` 或 `/context detail`。参见 [Context](/concepts/context)。

## 如何查看当前 token 使用量

在聊天中使用这些命令：

- `/status` → **带有丰富表情的状态卡**，显示会话模型、上下文使用量、
  上一次响应的输入/输出 token，以及在为当前模型配置了本地定价时的
  **估算成本**。
- `/usage off|tokens|full` → 为每个回复追加一个 **每响应使用量页脚**。
  - 以会话为单位持久化（存储为 `responseUsage`）。
  - `/usage full` 仅在 OpenClaw 拥有使用量元数据且当前模型有本地定价时显示估算成本。否则只显示 token。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他表面：

- **TUI/Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 会显示
  规范化后的提供方配额窗口（`X% left`，不是按响应成本）。  
  当前使用窗口提供方：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、小米和 z.ai。

Usage surfaces normalize common provider-native field aliases before display.
For OpenAI-family Responses traffic, that includes both `input_tokens` /
`output_tokens` and `prompt_tokens` / `completion_tokens`, so transport-specific
field names do not change `/status`, `/usage`, or session summaries.
Gemini CLI usage is normalized too: the default `stream-json` parser reads
assistant `message` events, and `stats.cached` maps to `cacheRead` with
`stats.input_tokens - stats.cached` used when the CLI omits an explicit
`stats.input` field. Legacy JSON overrides still read reply text from
`response`.
For native OpenAI-family Responses traffic, WebSocket/SSE usage aliases are
normalized the same way, and totals fall back to normalized input + output when
`total_tokens` is missing or `0`.
When the current session snapshot is sparse, `/status` and `session_status` can
also recover token/cache counters and the active runtime model label from the
most recent transcript usage log. Existing nonzero live values still take
precedence over transcript fallback values, and larger prompt-oriented
transcript totals can win when stored totals are missing or smaller.
Usage auth for provider quota windows comes from provider-specific hooks when
available; otherwise OpenClaw falls back to matching OAuth/API-key credentials
from auth profiles, env, or config.
Assistant transcript entries persist the same normalized usage shape, including
`usage.cost` when the active model has pricing configured and the provider
returns usage metadata. This gives `/usage cost` and transcript-backed session
status a stable source even after the live runtime state is gone.

OpenClaw 将提供方使用量核算与当前上下文
快照分开。提供方 `usage.total` 可能包含缓存输入、输出以及多次
工具循环模型调用，因此它适合用于成本和遥测，但可能会高估
实时上下文窗口。上下文显示和诊断会使用最新的提示
快照（`promptTokens`，或者在没有提示快照时使用最后一次模型调用）作为 `context.used`。

## 成本估算（显示时）

成本根据你的模型定价配置进行估算：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和 `cacheWrite` 的 **每 100 万 token 的美元成本**。如果缺少定价，OpenClaw 只显示 token。成本显示并不局限于 API key 认证：像 `aws-sdk` 这样的非 API key 提供方，只要其配置的模型条目包含本地定价且提供方返回使用量元数据，也可以显示估算成本。

在 sidecars 和 channels 进入 Gateway ready 路径后，OpenClaw 会为尚未拥有本地定价的已配置模型引用启动一个可选的后台定价引导流程。该引导会获取远程 OpenRouter 和 LiteLLM 定价目录。将 `models.pricing.enabled: false` 设为 false 可在离线或受限网络中跳过这些目录获取；显式的 `models.providers.*.models[].cost` 条目仍会继续驱动本地成本估算。

## Cache TTL 和剪枝影响

提供方提示缓存只在 cache TTL 窗口内生效。OpenClaw 可以选择运行 **cache-ttl 剪枝**：当 cache TTL
过期后，它会剪枝会话，然后重置缓存窗口，这样后续请求就可以重用
新缓存的上下文，而不是重新缓存完整历史。这会在会话闲置超过 TTL 后保持更低的 cache write 成本。

在 [Gateway configuration](/gateway/configuration) 中进行配置，并在 [Session pruning](/concepts/session-pruning) 中查看
行为细节。

Heartbeat 可以在空闲间隔期间保持缓存 **温热**。如果你的模型 cache TTL
是 `1h`，将 heartbeat 间隔设置得略低一些（例如 `55m`）可以避免
重新缓存完整提示，从而降低 cache write 成本。

在多代理设置中，你可以保留一个共享的模型配置，并通过 `agents.list[].params.cacheRetention` 针对每个代理调整缓存行为。

关于逐项旋钮指南，请参见 [Prompt Caching](/reference/prompt-caching)。

对于 Anthropic API 定价，cache read 的费用显著低于 input
token，而 cache write 的计费倍率更高。请参阅 Anthropic 的
prompt caching 定价以了解最新费率和 TTL 倍率：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

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

`agents.list[].params` 会在所选模型的 `params` 之上进行合并，因此你可以
只覆盖 `cacheRetention`，并保持其他模型默认值不变。

### Anthropic 1M context

OpenClaw 将 Claude 4.x 的 GA 级模型（如 Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6）按 Anthropic 的 1M 上下文窗口进行配置。对于这些模型，你不需要
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

如果你使用 OAuth/订阅令牌（`sk-ant-oat-*`）对 Anthropic 进行认证，
OpenClaw 会在保留 OAuth 所需的 Anthropic beta 头部的同时，移除
旧配置中仍保留的已弃用 `context-1m-*` beta 头部。

## 降低 token 压力的建议

- 使用 `/compact` 来概括长会话。
- 在你的工作流中裁剪大型工具输出。
- 为截图密集型会话降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表会被注入到提示中）。
- 对于冗长、探索性工作，优先使用更小的模型。

准确的技能列表开销公式请参见 [Skills](/tools/skills)。

## 相关

- [API 使用情况和费用](/reference/api-usage-costs)
- [提示缓存](/reference/prompt-caching)
- [使用情况跟踪](/concepts/usage-tracking)
