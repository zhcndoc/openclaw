---
summary: "OpenClaw 如何构建提示上下文并报告 token 使用量和成本"
read_when:
  - "解释 token 使用量、成本或上下文窗口"
  - "调试上下文增长或压缩行为"
title: "Token 使用量和成本"
---

OpenClaw 跟踪 **令牌**，而不是字符。标记是特定于模型的，但大多数 OpenAI-style 模型对于英语文本来说每个标记平均约为 4 个字符。

## <a id="how-the-system-prompt-is-built"></a> 系统提示是如何构建的

OpenClaw 会在每次运行时组装自己的系统提示。它包括：

- 工具列表 + 简短描述
- 技能列表（仅限元数据；使用 `read` 按需加载指令）。本机 Codex 打开托管捆绑应用程序服务器，获取父本地模型请求指令中的紧凑技能块。没有该中继的连接使用线程开发人员指令；其他harness将其置于正常的提示界面中。以 `skills.limits.maxSkillsPromptChars` 为界，在 `agents.entries.*.skillsLimits.maxSkillsPromptChars` 处具有可选的每个代理覆盖。
- 自更新指令
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、 `IDENTITY.md`、`USER.md`、新建时的 `BOOTSTRAP.md`，以及存在时的 `MEMORY.md`）。较大的注入文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认：`20000`）；引导注入总量上限为 `agents.defaults.bootstrapTotalMaxChars`（默认： `60000`）。
  - 当内存工具可用于该工作区时，Native Codex 不会粘贴原始 `MEMORY.md`；相反，它们在父本地请求指令中获取一个小内存指针，并根据需要使用内存工具。如果工具被禁用，内存搜索不可用，或者活动工作空间与代理内存工作空间不同，`MEMORY.md` 将回退到正常的有界回合上下文路径。
  - 小写根目录 `memory.md` 永远不会被注入。它是给 `openclaw doctor --fix` 使用的遗留修复输入，该命令会将其迁移到 `MEMORY.md`。
  - `memory/*.md` 日常文件不是正常引导提示的一部分；他们在普通轮流中通过记忆工具保持按需状态。 Reset/startup 模型运行可以在第一轮的近期每日内存中添加一次性启动上下文块，由 `agents.defaults.startupContext` 控制。无需调用模型即可确认裸聊天 `/new` 和 `/reset`。
  - 进行压缩后，`AGENTS.md` 摘录需要显式启用 `agents.defaults.compaction.postCompactionSections`；插件可以通过 `before_prompt_build` 添加其他上下文。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据 （host/OS/model/thinking）

请参阅 [System Prompt](/concepts/system-prompt) 中的完整细分。

记录凭据或身份验证片段时，请使用 [Secret 占位符 Conventions](/reference/secret-placeholder-conventions) 以避免仅文档更改中的秘密扫描器误报。

## <a id="what-counts-in-the-context-window"></a> 什么计入上下文窗口

模型接收到的所有内容都会计入上下文限制：

- 系统提示词（上面的所有部分）
- 对话历史（用户消息 + 助手消息）
- 工具调用和工具结果
- Attachments/transcripts（图像、音频、文件）
- 压缩摘要和裁剪产物
- 提供方包装器或安全标头（不可见，但仍会计入）

运行时开销较大的部分有其独立的明确上限，配置位于 `agents.defaults.contextLimits`（每个代理的覆盖配置位于 `agents.entries.*.contextLimits`）：

| 键                      | 用途                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `memoryGetMaxChars`      | `memory_get` 返回结果在截断前的最大字符数。                   |
| `postCompactionMaxChars` | 压缩后刷新期间，从 `AGENTS.md` 中保留的最大字符数。 |

这些都是有界的运行时摘录和注入的运行时内容， 它们与启动引导限制、启动上下文限制以及技能提示词限制是分开的。

OpenClaw 会根据有效模型上下文窗口推导实时工具结果上限： 在 100K tokens 以下为 `16000` 字符，在 100K+ tokens 时为 `32000` 字符，在 200K+ tokens 时为 `64000` 字符。运行时上下文共享保护也会将单个工具结果限制为上下文窗口的 30%。

当大型提供商窗口显着改变成本或延迟时，不会自动启用。例如，直接 OpenAI GPT-5.5 和 GPT-5.6 模型发布 `1050000` 代币总窗口，但 OpenClaw 将其活动运行时预算默认为 `272000` 代币。选择加入的 `922000` 输入预算保留全部 `128000` 输出限额，一旦输入超过 `272000` 代币，OpenAI 就会对整个请求应用更高的长上下文定价。请参阅 [OpenAI 上下文窗口默认值 ](/providers/openai/setup#context-window-defaults-and-long-context-opt-in)。

对于图像，OpenClaw 在提供程序调用之前缩小 transcript/tool 图像有效负载。使用 `agents.defaults.imageMaxDimensionPx` 进行调谐（默认：`1200`）：

- 更低的值会减少视觉 token 的使用和载荷大小。
- 较高的值可以为 OCR/UI-heavy 屏幕截图保留更多视觉细节。

如需按注入文件、工具、技能和系统提示词大小进行实际拆解，请使用 `/context list` 或 `/context detail`。另请参阅 [上下文](/concepts/context)。

## <a id="how-to-see-current-token-usage"></a> 如何查看当前 token 使用量

在聊天中：

- `/status` -> 富含表情符号的状态卡，其中包含会话模型、上下文使用、上次响应 input/output 令牌以及活动模型的记录账单或本地定价的成本。
- `/usage off|tokens|full` -> 为每次回复附加使用量页脚。 按会话持久化（存储为 `responseUsage`）。
  - `/usage reset`（别名：`inherit`、`clear`、`default`）会清除会话覆盖值，使其重新继承已配置的默认值。
  - `/usage tokens` 显示轮次 token/cache 详情。
  - `/usage full` 显示紧凑的 model/context/cost 细节。成本来自记录的金额或使用情况元数据以及活动模型的本地定价。自定义 `messages.usageTemplate` 布局可以包含 token/cache 字段。
- `/usage cost` -> 来自 OpenClaw 会话日志的本地成本摘要。

其他界面：

- **Control UI：** 工作指示器和完成的运行回顾显示该运行的累积 **输出标记**，包括跨工具使用和重试的模型调用。当运行时报告已完成的响应使用情况时计算更新，而不是在每个流式传输的文本片段上计算更新。重新加载活动运行会恢复其最新计数。该计数器不包括输入令牌，并且与编写器上下文窗口计量器和持久计费摘要分开。
- **TUI/Web TUI：**支持 `/status` 和 `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 显示规范化的提供商配额窗口（`X% left`，不是每次响应成本）。使用窗口提供程序，根据 2026.9.3 检查：Claude （Anthropic）、ClawRouter、Copilot （GitHub）、DeepSeek、MiniMax、 OpenAI、OpenRouter、Venice、xAI、小米、小米代币计划和 z.ai. Provider 插件提供这些快照，因此已安装的插件可以添加一个。

使用表面在显示之前标准化常见的提供者本机字段别名。对于 OpenAI-family 响应流量，包括 `input_tokens`/`output_tokens` 和 `prompt_tokens`/`completion_tokens`，因此传输特定的字段名称不会更改 `/status`、`/usage` 或会话摘要。 Gemini CLI 的使用也被标准化：默认的 `stream-json` 解析器读取辅助 `message` 事件，并且 `stats.cached` 映射到 `cacheRead`，当 CLI 省略显式时使用 `stats.input_tokens - stats.cached` `stats.input` 字段。旧版 JSON 会覆盖仍从 `response` 读取的回复文本。

对于本机 OpenAI-family 响应流量，WebSocket/SSE 使用别名以相同的方式标准化，并且当 `total_tokens` 缺失或 `0` 时，总数回落到标准化输入 + 输出。

当当前会话快照较为稀疏时，`/status` 和 `session_status` 可以从最近的转录使用日志中恢复 token/cache 计数器以及活动运行时模型标签。 现有的非零实时值仍然优先于转录回退值，而当存储的总数缺失或更小时，更大的、以 prompt 为导向的转录总数可以胜出。

提供者配额窗口的使用验证首先来自提供者特定的挂钩；如果提供程序没有挂钩（或者挂钩无法解析令牌），则 OpenClaw 会回退到匹配来自身份验证配置文件、env 或 config 的 OAuth/API-key 凭据。

当运行时计算估计值或提供商报告计费金额时，助理记录条目保留相同的标准化使用形状，包括 `usage.cost`。即使实时运行时状态消失后，这也为 `/usage cost` 和转录支持的会话状态提供了稳定的来源。

如果流在其最终使用报告之前被中断，则令牌和成本核算将不可用。中间令牌快照不计为完整使用，并且 `/status` 会清除先前响应的计数器，而不是显示中断响应的计数器。使用成本摘要保留已完成响应中的已知金额，并将聚合标记为不完整。提供商报告的终端零仍然是测量的零；初始化的零不是测量值。

OpenClaw 将提供方使用量统计与当前上下文快照分开维护。提供方 `usage.total` 可能包含缓存输入、输出以及多次工具循环中的模型调用，因此它有助于成本和遥测统计，但可能会高估实时上下文窗口。上下文显示和诊断会使用最新的 prompt 快照（`promptTokens`，或者在没有 prompt 快照时使用最后一次模型调用）来计算 `context.used`。

本机 Codex 轮次使用情况对每个唯一已完成模型响应的报告计数进行求和，包括重试或取消之前的响应。缺失回复计数仍然未知；它们不会删除已经观察到的用法。缺少最终响应快照会导致上下文无法使用。

## <a id="cost-estimation-(when-shown)"></a><a id="cost-estimation-when-shown"></a> 成本估算（显示时）

成本根据你的模型定价配置进行估算：

```text
models.providers.<provider>.models[].cost
```

这些都是**USD每 100 万个代币**为了`input`， `output`， `cacheRead`， 和`cacheWrite`。如果定价和记录金额均缺失，`/usage full`省略成本；使用`/usage tokens`或自定义`messages.usageTemplate`当你需要的时候token/cache每个回复中都有详细信息。成本显示不限于API-密钥授权：非API-关键提供商，例如`aws-sdk`当其配置的模型条目包含本地定价并且提供商返回使用元数据时，可以显示估计成本。

当模型发布 `tieredPricing` 时，每个请求使用其总提示输入选择一层：未缓存的输入加上缓存读取和缓存写入。输出令牌不选择层。所选速率适用于该请求中的每个令牌桶，而不是仅适用于高于阈值的令牌。范围为半开 `[start, end)`；开放式最终范围使用 `[start]`。

为每个模型请求计算的周转总数总和成本，跨工具循环和重试保留层和模型边界。如果较旧的或外部运行时仅提供聚合令牌，则统一费率估算仍然可用。没有完整的每个请求成本的分层聚合会忽略成本，而不是将求和的令牌视为一个大请求。提供商计费的总计（包括零）优先于目录估计，并且即使在令牌计数不可用时也保持可见。未知的令牌计数无法从计费金额中推断出来。

成绩单报告保留有效记录的每次调用总计和分配，包括 priority/flex 调整，并仅针对缺失的成本或未知价格的零占位符使用当前目录定价。 Anthropic 快速模式估计乘以基本速率和层速率，保留层阈值和混合 5-minute/1-hour 缓存写入定价。

省略 `cost` 或将其设置为 `{}` 将继承目录定价表。明确的固定价格或全零模型价格不会继承目录层计划。省略的统一费率字段仍然可以继承目录默认值。显式 `tieredPricing` 计划优先于目录计划。

定价更新与模型元数据一起发布在托管模型目录中。当提供商声明本机来源时，其发布者会读取公开定价来源，包括 OpenCode 的官方目录和 Venice 的公开模型 API。基本费率和上下文等级来自同一来源；使用呈现不会发出网络请求。托管更新将随着网关下一个准备好的目录生成而激活，而无需重新启动。每个估算操作都会捕获一个定价环境，因此出版物不能中途更改其费率。设置 `models.catalogRefresh.enabled: false` 以禁用离线或受限网络上的托管目录流量；捆绑定价仍然有效。代理本地 `models.json` 价格优先于明确的 `models.providers.*.models[].cost` 条目，并且两者都会覆盖目录估计，包括明确的统一费率和零费率。

当网关写入更新的代理本地 `models.json` 价格时，后续本地估算将使用这些费率而无需重新启动。记录的每次通话费用保留其原始金额。

当确切的快捷方式没有价格时，OpenRouter `:nitro` 和 `:floor` 布线快捷方式使用基本模型的目录估计。记录的成本和明确的价格保持优先地位。专用端点和其他模型变体不使用此后备。优先计费和灵活计费可能与基本估算不同。

## <a id="cache-ttl-and-pruning-impact"></a> Cache TTL 和剪枝影响

提供方提示词缓存仅在缓存 TTL 窗口内生效。OpenClaw 可以选择性地运行 **cache-ttl 剪枝**：当会话的 cache TTL 过期后，它会剪枝该会话，然后重置缓存窗口，从而使后续请求复用新缓存的上下文，而不是重新缓存完整历史记录。 这样可以在会话在 TTL 过期后进入空闲状态时，降低缓存写入成本。

在 [Gateway configuration](/gateway/configuration) 中进行配置，并在 [Session pruning](/concepts/session-pruning) 中查看行为细节。

Heartbeat 可以在空闲间隙保持缓存 **warm**。如果您的模型缓存 TTL 为 `1h`，则将心跳间隔设置为略低于该值（e.g.、`55m`）可以避免重新缓存完整提示，从而降低缓存写入成本。

在多代理配置中，你可以使用一份共享的模型配置，并通过 `agents.entries.*.params.cacheRetention` 为每个代理单独调整缓存行为。

关于逐项旋钮指南，请参见 [Prompt Caching](/reference/prompt-caching)。

对于 Anthropic API 定价，缓存读取的费用显著低于输入 token，而缓存写入则按更高的倍数计费。有关最新费率和 TTL 倍数，请参阅 Anthropic 的提示词缓存定价： [https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

### <a id="example%3A-keep-1h-cache-warm-with-heartbeat"></a><a id="example-keep-1h-cache-warm-with-heartbeat"></a> 示例：使用心跳保持 1h 缓存温热

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

### <a id="example%3A-mixed-traffic-with-per-agent-cache-strategy"></a><a id="example-mixed-traffic-with-per-agent-cache-strategy"></a> 示例：按代理使用不同的缓存策略处理混合流量

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # default baseline for most agents
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # keep long cache warm for deep sessions
    - id: "alerts"
      params:
        cacheRetention: "none" # avoid cache writes for bursty notifications
```

`agents.entries.*.params` 会合并到所选模型的 `params` 之上，因此你可以只覆盖 `cacheRetention`，并保持其他模型默认值不变。

### <a id="anthropic-1m-context"></a> Anthropic 1M 上下文

OpenClaw 尺寸 GA- 支持 Claude 4.x 模型，例如 Opus 4.8、Opus 4.7、Opus 4.6 和Sonnet 4.6 与 Anthropic 的 1M 上下文窗口。这些模型不需要 `params.context1m: true`。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

较旧的配置可以继续保留 `context1m: true`，但 OpenClaw 不再为此设置发送 Anthropic 已弃用的 `context-1m-2025-08-07` beta 头部，并且不会将不受支持的旧 Claude 模型扩展到 1M。

要求：凭证必须具备长上下文使用资格。否则， Anthropic 会针对该请求返回提供方侧的速率限制错误。

如果您使用 OAuth/subscription 令牌 （`sk-ant-oat-*`） 对 Anthropic 进行身份验证，则 OpenClaw 会保留 OAuth- 所需的 Anthropic beta 标头，同时剥离已停用的 `context-1m-*` beta（如果它保留在旧配置中）。

## <a id="tips-for-reducing-token-pressure"></a> 降低 token 压力的建议

- 使用 `/compact` 来概括长会话。
- 在你的工作流中裁剪大型工具输出。
- 为截图密集型会话降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表会被注入到提示中）。
- 对于冗长、探索性工作，优先使用更小的模型。

准确的技能列表开销公式请参见 [技能](/tools/skills)。

## <a id="related"></a> 相关内容

- [API 用途和费用](/reference/api-usage-costs)
- [提示缓存](/reference/prompt-caching)
- [使用情况跟踪](/concepts/usage-tracking)
