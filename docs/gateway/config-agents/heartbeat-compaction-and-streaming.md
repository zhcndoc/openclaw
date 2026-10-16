---
summary: "心跳运行、系统代理、压缩、上下文修剪、块流和类型指示器"
read_when:
  - "调度心跳运行或系统代理"
  - "调整自动压缩或上下文修剪"
  - "更改部分回复和打字指示符的发送方式"
title: "配置 — 代理心跳、压缩和流式传输"
---

`agents.defaults.*` 密钥控制代理何时独立运行、如何压缩和修剪其记录以及部分输出如何到达聊天。

## `agents.defaults.heartbeat`

定期运行心跳。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        agentId: "ops", // ambient owner when no per-agent heartbeat is configured
        every: "30m", // 0m disables recurring cadence
        activeHours: { start: "08:00", end: "24:00" },
        model: "openai/gpt-5.4-mini",
        session: "main",
        target: "owner", // default | options: last | none | whatsapp | telegram | discord | ...
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

- `every`：持续时间字符串（ms/s/m/h）。默认值：`30m`（API-key 身份验证）或 `1h`（OAuth 身份验证）。设置为 `0m` 以禁用重复节奏。有针对性的事件驱动唤醒（包括后台执行完成后续操作）仍然可以运行一个代理轮次。
- `agentId`：当不存在 `agents.entries.*.heartbeat` 块时，用于环境心跳运行的显式所有者。没有 `agentId` 的共享心跳块会保留现有的全代理注册行为。
- 调度周期会写入系统拥有的 cron 监控行。运行 `openclaw doctor --fix` 可具体化缺失或过时的行。如果 cron 被禁用，计划心跳不会运行，网关会记录启动警告。
- 心跳对象严格。其支持的字段有 `agentId`、`every`、`activeHours`、`model`、`session`、`target`、`directPolicy`、`to`、`accountId`、 `prompt`、`timeoutSeconds`、`lightContext` 和 `isolatedSession`。
- `timeoutSeconds`：心跳代理回合在中止前允许的最长秒数。留空时，如果已设置，则使用 `agents.defaults.timeoutSeconds`；否则使用上限为 600 秒的心跳周期。
- `directPolicy`：direct/DM 交货政策。 `allow`（默认）允许直接目标传递。 `block` 抑制直接目标传递并发射 `reason=dm-blocked`。
- `target`：`owner`（默认值）仅发送到来自 `commands.ownerAllowFrom` 或通道 `allowFrom` 的直接消息身份。`last` 显式跟随最新对话，包括群组。`none` 保持结果为内部结果。
- `to`：仅与显式通道目标一起使用。`owner` 和未设置的目标会忽略它。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文并跳过工作区引导文件。无论如何，监控临时文件都会由心跳运行器注入。
- `isolatedSession`：为 true 时，每次心跳都会在没有此前对话历史的新会话中运行。其隔离模式与 cron 的 `sessionTarget: "isolated"` 相同。每次心跳的 token 成本会从约 100K 降低至约 2-5K。
- Busy 延迟是自动的：计划的心跳等待 main/cron 活动、同一代理活动运行和目标会话工作。立即和手动唤醒仅绕过广泛的同一代理主动运行预检查。
- Heartbeat运行时使用普通代理系统提示。确认抑制使用固定的 300 个字符的剩余预算，推理有效负载保持在内部，并且工具错误警告保持启用状态。
- 按代理设置：设置 `agents.entries.*.heartbeat`。只要有任意代理定义了 `heartbeat`，就**只有这些代理**运行心跳。
- 心跳会运行完整的代理回合——更短的间隔会消耗更多 token。

## `agents.defaults.systemAgent`

选择其模型和凭证拥有环境 OpenClaw 系统工作的代理：系统代理和托管人协商，以及当环境路径省略 `agentId` 时后备所有者。其中包括 `models.list`、`models.authStatus`、`skills.status` 和 `doctor.memory.status`、身份验证背后的默认代理目录和工作区、模型目录和医生解析、出站通道引导和排队交付恢复、无范围主会话路由、Talk 中继所有权和首次运行载入：

```json5
{
  agents: {
    defaults: {
      systemAgent: { agentId: "ops" },
    },
  },
}
```

显式请求 `agentId` 总是获胜，其次是 `systemAgent.agentId`，所有权不明确时的旧默认所有者，最后是唯一配置的代理。仅保留的迁移来源永远不会指定显式队列的运行时默认值。与请求代理的委托咨询使该请求者成为其所有者。

对于 `agents.ownership: "explicit"`，此设置还为支持默认代理选择的操作提供记录的默认值，包括代理列表标记、未绑定通道路由、无范围网关读取、`openclaw sessions`、`openclaw hooks` 状态和 TUI 启动。 Doctor 在此记录迁移的默认值，以便这些操作在重新启动后保持相同的所有者。显式绑定、请求和会话存储所有者优先。使用 `--agent <id>` 选择不同的代理或 `openclaw sessions --all-agents` 检查整个车队。需要显式选择的操作（例如 `openclaw models`）保留该要求。

无主多代理车队没有默认徽章。使用 `openclaw config set agents.defaults.systemAgent.agentId <id>` 设置配置的 id。单独配置的代理仍然可以拥有不合格的网关会话请求，而无需保存默认指定。没有所有者的环境工作会失败并出现可操作的错误，但排队传递恢复除外，它会记录失败的传递并不断耗尽队列的其余部分。更改运行时默认值不会重新定位现有工作区或旧数据。仅升级所有权位于 `agents.defaults.authInheritance.agentId`（对于继承的凭证）和 `agents.defaults.sessionStore.agentId`（对于已停用的 `main` 会话行或固定 `session.store` 中的无作用域行）。

## `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        enabled: false, // disable embedded proactive auto-compaction (default: true)
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // id of a registered compaction provider plugin (optional)
        thinkingLevel: "low", // optional override; omit for the provider default
        timeoutSeconds: 180,
        keepRecentTokens: 50000,
        recentTurnsPreserve: 3,
        identifierPolicy: "strict", // strict | off
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // optional tool-loop pressure check
        postIndexSync: "async", // off | async | await
        postCompactionSections: ["Session Startup", "Red Lines"],
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        maxActiveTranscriptBytes: "20mb", // opt in to preflight local compaction
        notifyUser: true, // notices when compaction starts/completes and on memory-flush degradation (default: false)
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // optional memory-flush-only model override
          softThresholdTokens: 6000,
          forceFlushTranscriptBytes: "2mb",
        },
      },
    },
  },
}
```

- `enabled`：当为 `false` 时，禁用嵌入式代理运行时中由阈值驱动的自动压缩。OpenClaw 的预检和溢出恢复压缩路径，以及手动执行的 `/compact` 仍然可用。默认值：`true`。
- `mode`：`default` 或 `safeguard`（摘要质量审核和近期保存）。请参见 [Compaction](/concepts/compaction)。
- `provider`：已注册压缩提供程序插件的 ID。设置后，将调用提供程序的 `summarize()`，而不是内置的 LLM 摘要。失败时回退到内置。设置提供程序强制 `mode: "safeguard"`。请参见 [Compaction](/concepts/compaction)。
- `thinkingLevel`：仅用于嵌入式 OpenClaw 压缩摘要的思维级别（`off`、`minimal`、`low`、`medium`、`high`、 `xhigh`、`adaptive`、`max`、`ultra` 或 `inherit`）。当省略时，提供者可以提供压缩首选项；否则默认为 `low`。本地本地 Ollama 更喜欢 `off`，因此摘要不会将其请求预算花费在思考上。设置 `inherit` 以重用会话的当前思维级别，或选择显式级别来覆盖提供程序默认值。所选级别被限制为压缩 model/runtime. 本机 Codex 应用程序服务器压缩会忽略此设置，因为本机压缩请求没有每操作思考覆盖； OpenClaw 配置时会记录警告。
- `timeoutSeconds`：内置压缩模型请求可能会持续多长时间而没有进展。每个请求开始和每个流式输出令牌（文本、推理或工具调用增量；不是保活）都会刷新窗口，因此保持流式传输的缓慢请求会完成，而静默请求会在一个窗口后中止。即使它继续流式传输，完整的压缩也会在 10 个窗口（默认情况下为 30 分钟）后停止。当插件上下文引擎调用 `delegateCompactionToRuntime` 时，这也适用；该插件自己的压缩工作接收一个窗口来完成完整的操作。默认值：`180`。
- `keepRecentTokens`：代理截断点预算，用于逐字保留最近的 transcript 尾部。默认值：`20000`。
- `recentTurnsPreserve`：最近的user/assistant轮数逐字保存在维护汇总之外。默认值：`3`。
- `identifierPolicy`：`strict`（默认）或 `off`。`strict` 会在压缩摘要过程中加入内置的不透明标识符保留指导。
- `qualityGuard`：内置防护摘要的有限验证。在保护模式下默认启用。检查最终摘要的结构、待处理的询问和确切的标识符，最多进行 `maxRetries` 纠正尝试。如果审核已用尽或所需事实无法满足，OpenClaw 会存储标记为 `details.qualityDegraded` 的最佳可用摘要，以便会话可以继续。失败的纠正生成可以重用早期的摘要。在这条道路上，我们会尽最大努力留住人才； `/status` 显示性能下降，即使 `notifyUser` 是 `false`，用户也会收到警告。有关损失和单独的自动超时回退，请参阅 [Compaction](/concepts/compaction#how-it-works)。设置`enabled: false`跳过审核。配置的压缩提供程序输出保留其提供程序拥有的验证行为。
- `midTurnPrecheck`：可选工具回路压力检查。当 `enabled: true` 时，OpenClaw 在附加工具结果之后和下一次模型调用之前检查预计的提供程序提示。当前一个调用报告的上下文使用情况及其前缀、系统提示、工具和模型未更改时，检查会重用其测量的提示和完成占用率，包括不透明推理。匹配的辅助碎片计算一次；新工具结果和其他附加内容得到保守估计。保留的完成用法可以在上下文更改后覆盖不透明的推理。缺少使用或更改上下文使用保守的提示估计。如果上下文不再适合，它会在提交提示之前中止当前尝试，并重用现有的预检查恢复路径来截断工具结果或压缩并重试。适用于 `default` 和 `safeguard` 压缩模式。默认值：禁用。
- `postIndexSync`：压缩后会话内存重新索引模式。默认值：`"async"`。使用 `"await"` 可获得最强的新鲜度，使用 `"async"` 获得较低的压缩延迟，或仅当会话内存同步在其他地方处理时使用 `"off"`。异步模式在压缩返回之前开始索引，但不等待它完成；冷内存初始化仍然会增加延迟。
- `postCompactionSections`：可选的 AGENTS.md H2/H3 压缩后重新注入的节名称。 Safeguard 摘要从有效代理工作区读取这些部分，如果无法读取文件或配置的部分丢失，则会记录警告。保持未设置或使用 `[]` 禁用。
- `model`：可选的 `provider/model-id` 或 `agents.defaults.models` 的裸别名仅用于压缩汇总。裸别名在分派之前解析；配置的文字模型 ID 保留冲突的优先级。当主会话应保留一个模型但压缩摘要应在另一个模型上运行时使用此选项；未设置时，压缩使用会话的主要模型。
- `maxActiveTranscriptBytes`：字节阈值（`number` 或类似 `"20mb"` 的字符串），当模型看到的转录窗口（自最近一次压缩或重置以来的所有内容，加上其保留的尾部）达到阈值时，在运行之前选择正常的本地压缩。对于 Codex 应用程序服务器会话，相同的阈值限制本机转出脚本和超大本机线程重新启动。未设置或 `0` 时禁用。当上下文引擎返回显式压缩后继标识时，OpenClaw 采用它；内置 SQLite 压实机保持当前身份。
- `notifyUser`：当 `true` 时，向用户发送简短的上下文维护通知：压缩开始和完成时（例如，“压缩 context...”和“压缩完成”），以及当预压缩内存刷新耗尽时，回复将继续处于降级状态（例如，“暂时内存维护”）失败；继续您的回复。”）。默认禁用。无论此设置如何，始终显示降级摘要警告。
- `memoryFlush`：自动压缩前静音代理转动以存储持久记忆。主机使用活动上下文窗口解析这些设置，并填充所选内存提供程序在其计划中省略的计时字段。当此内务处理应保留在本地模型上时，将 `model` 设置为精确的 provider/model，例如 `ollama/qwen3:8b`；覆盖不会继承活动会话回退链。当模型可见的转录窗口达到阈值时，`forceFlushTranscriptBytes` 会强制刷新，即使令牌计数器已过时；压缩后，该窗口包括保留的尾部和后续转弯，而不是丢弃的历史记录。文件臂提供商需要可写的工作空间访问权限；工具臂提供商则不然。

自定义压缩指令是代码拥有的。使用 `summarize()` 实现压缩提供程序插件以进行自定义摘要构建，并在必须将压缩后上下文注入后续模型提示时使用 `before_prompt_build`。医生剥离了退休的指令字段并指向这些钩子。

## `agents.defaults.contextPruning`

在发送到 LLM 之前，从内存上下文中修剪 **old 工具结果**。 **not** 是否修改磁盘上的会话历史记录。默认禁用；设置 `mode: "cache-ttl"` 启用。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off (default) | cache-ttl
        ttl: "1h", // duration string; bare numbers are minutes (default 5m)
        tools: { allow: [], deny: [] }, // tool names eligible for / excluded from pruning
        hardClear: {
          enabled: true, // false skips the hard-clear step
          placeholder: "[Old tool result content cleared]",
        },
      },
    },
  },
}
```

<Accordion id="cache-ttl-mode-behavior" title="缓存 ttl 模式行为">

- `mode: "cache-ttl"` 会启用清理过程。
- `ttl` 设置在新一轮修剪开始之前缓存条目被视为新鲜的时间。它是一个持续时间字符串，其裸数字是分钟；内置默认值为 5 分钟，捆绑的 Anthropic 插件种子 `1h`。
- `tools.allow` 和 `tools.deny` 工具名称可修剪的范围。
- `hardClear.enabled: false` 跳过硬清除步骤，`hardClear.placeholder` 替换默认的 `[Old tool result content cleared]` 文本。
- 清理会先对过大的工具结果进行软裁剪，然后在需要时硬清除较早的工具结果。

**软裁剪**会保留开头 + 结尾，并在中间插入 `...`。

**硬清除**会用占位符替换整个工具结果。

注意：

- 图像块永远不是trimmed/cleared.
- 比例按字符数计算（近似值），并非精确的令牌数量。
- 最近的助手消息会被保留。

</Accordion>

有关行为详细信息，请参阅 [Session Pruning](/concepts/session-pruning)。

## <a id="block-streaming"></a> 块流

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200, breakPreference: "paragraph" },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off (default) | natural | custom (use minMs/maxMs)
    },
  },
}
```

- 非 Telegram 渠道需要显式设置 `*.streaming.block.enabled: true` 才能启用分块回复。QQ Bot 是例外：它没有 `streaming.block` 相关键，并且只要 `channels.qqbot.streaming.mode` 不为 `"off"`，就会进行分块回复。
- 渠道覆盖项：`channels.<channel>.streaming.block.coalesce`（以及各账户对应的配置）。Discord、Google Chat、Mattermost、MS Teams、Signal 和 Slack 默认使用 `minChars: 1500` / `idleMs: 1000`。
- `blockStreamingChunk.breakPreference`：首选的分块边界（`"paragraph" | "newline" | "sentence"`）。
- `humanDelay`：块回复之间的随机暂停。默认值：`off`。 `natural` = 800-2500ms。 `custom` 使用 `minMs`/`maxMs`（对于任何未设置的边界，回落到自然范围）。每个代理覆盖：`agents.entries.*.humanDelay`。

行为和分块细节请参见 [流式输出](/concepts/streaming)。

## <a id="typing-indicators"></a> 打字指标

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

- 默认：`instant`用于直接chats/mentions，`message`用于未提及的群聊。
- `typingIntervalSeconds` 默认值：`6`。
- 按代理覆盖：`agents.entries.*.typingMode`。

请参阅 [ 键入 Indicators](/concepts/typing-indicators)。
