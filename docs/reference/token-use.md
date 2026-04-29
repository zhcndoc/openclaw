---
summary: "OpenClaw 如何构建提示上下文并报告 token 使用量和成本"
read_when:
  - 解释 token 使用量、成本或上下文窗口
  - 调试上下文增长或压缩行为
title: "Token 使用量和成本"
---

# Token 使用量和成本

OpenClaw 跟踪的是 **tokens**，不是字符。Token 与模型相关，但大多数
OpenAI 风格的模型对英文文本平均每个 token 约 4 个字符。

## 系统提示是如何构建的

OpenClaw 会在每次运行时组装自己的系统提示。它包括：

- 工具列表 + 简短描述
- 技能列表（仅元数据；说明会按需通过 `read` 加载）。
  紧凑的技能块受 `skills.limits.maxSkillsPromptChars` 限制，
  也可以在
  `agents.list[].skillsLimits.maxSkillsPromptChars` 中为单个代理覆盖。
- 自我更新说明
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、新的 `BOOTSTRAP.md`，以及存在时的 `MEMORY.md`）。根目录下小写的 `memory.md` 不会被注入；它是与 `MEMORY.md` 搭配时供 `openclaw doctor --fix` 使用的遗留修复输入。大文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认：12000），而引导注入总量上限为 `agents.defaults.bootstrapTotalMaxChars`（默认：60000）。`memory/*.md` 的每日文件不属于正常的引导提示；它们在普通轮次中仍可通过 memory 工具按需获取，但重置/启动模型运行可以在第一轮前附加一个一次性的启动上下文块，其中包含最近的每日记忆。纯聊天的 `/new` 和 `/reset` 命令会被确认，但不会调用模型。启动前导部分由 `agents.defaults.startupContext` 控制。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据（主机/操作系统/模型/思考）

完整拆解请参见 [System Prompt](/concepts/system-prompt)。

## 上下文窗口中计入什么

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

对于图像，OpenClaw 会在调用提供方之前对转录/工具图像载荷进行缩放。
使用 `agents.defaults.imageMaxDimensionPx`（默认：`1200`）来调整：

- 更低的值通常会降低视觉 token 使用量和载荷大小。
- 更高的值可为 OCR/UI 密集型截图保留更多视觉细节。

关于按注入文件、工具、技能和系统提示大小的实际拆解，请使用 `/context list` 或 `/context detail`。参见 [Context](/concepts/context)。

## 如何查看当前 token 使用量

在聊天中使用这些命令：

- `/status` → **带丰富表情的状态卡片**，显示会话模型、上下文使用量、
  上一条回复的输入/输出 token，以及 **估算成本**（仅限 API key）。
- `/usage off|tokens|full` → 为每次回复追加一个 **按响应统计的使用量页脚**。
  - 每个会话持久化（存储为 `responseUsage`）。
  - OAuth 认证 **隐藏成本**（仅显示 token）。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他表面：

- **TUI/Web TUI:** 支持 `/status` + `/usage`。
- **CLI:** `openclaw status --usage` 和 `openclaw channels list` 会显示
  规范化后的提供方配额窗口（`X% left`，不是按响应成本）。  
  当前使用窗口提供方：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、小米和 z.ai。

使用量表面在显示前会先规范化常见的提供方原生字段别名。
对于 OpenAI 家族 Responses 流量，这包括 `input_tokens` /
`output_tokens` 以及 `prompt_tokens` / `completion_tokens`，因此传输特定的
字段名不会改变 `/status`、`/usage` 或会话摘要。
Gemini CLI 的 JSON 使用量也会被规范化：回复文本来自 `response`，并且
`stats.cached` 映射到 `cacheRead`，当 CLI 省略显式的 `stats.input` 字段时，
使用 `stats.input_tokens - stats.cached`。
对于原生 OpenAI 家族 Responses 流量，WebSocket/SSE 使用量别名也会
以相同方式规范化，而在缺少 `total_tokens` 或其为 `0` 时，总数会回退到规范化后的输入 + 输出。
当当前会话快照较稀疏时，`/status` 和 `session_status` 还可以
从最近的转录使用日志中恢复 token/cache 计数器和活动运行时模型标签。
现有的非零实时值仍然优先于转录回退值，而当存储的总数缺失或更小时，
更大的、以提示为导向的转录总数可以获胜。
提供方配额窗口的使用权限认证在可用时来自提供方特定钩子；否则 OpenClaw 会回退到
从 auth profile、环境变量或配置中匹配 OAuth/API key 凭证。
助手转录条目会持久化相同的规范化使用量形状，包括 `usage.cost`，当活动模型配置了定价且提供方返回使用元数据时。这为 `/usage cost` 和基于转录的会话状态提供了稳定来源，即使实时运行时状态已经消失。

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

这些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每 100 万 token 的美元价格**。如果缺少定价，OpenClaw 只显示 token。OAuth token 从不显示美元成本。

网关启动时还会为已配置但本地尚未有定价的模型引用执行一个可选的后台定价引导。
该引导会拉取远程 OpenRouter 和 LiteLLM 的定价目录。将
`models.pricing.enabled: false` 设为跳过这些离线或受限网络上的启动目录获取；显式的 `models.providers.*.models[].cost` 条目
会继续驱动本地成本估算。

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

对于 Anthropic API 定价，cache reads 明显比 input tokens 便宜，而 cache writes
按更高的倍数计费。有关最新费率和 TTL 倍数，请参见 Anthropic 的
提示缓存定价：
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

### 示例：启用 Anthropic 1M 上下文 beta 头部

Anthropic 的 1M 上下文窗口目前处于 beta 门控状态。OpenClaw 可以在你对受支持的 Opus
或 Sonnet 模型启用 `context1m` 时注入所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

这会映射到 Anthropic 的 `context-1m-2025-08-07` beta 头部。

这只适用于在该模型条目上设置了 `context1m: true` 的情况。

要求：凭证必须具备长上下文使用资格。否则，
Anthropic 会针对该请求返回提供方侧的速率限制错误。

如果你使用 OAuth/订阅令牌（`sk-ant-oat-*`）对 Anthropic 进行认证，
OpenClaw 会跳过 `context-1m-*` beta 头部，因为 Anthropic 目前
会以 HTTP 401 拒绝该组合。

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
