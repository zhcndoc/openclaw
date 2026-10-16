---
summary: "OpenClaw 如何轮换认证配置文件并在不同模型之间回退"
read_when:
  - "诊断身份验证配置文件轮换、冷却时间或模型回退行为"
  - "更新认证配置文件或模型的故障转移规则"
  - "了解会话模型覆盖如何与回退重试交互"
title: "模型故障转移"
sidebarTitle: "模型故障转移"
---

OpenClaw 分两个阶段处理失败：

1. **Auth-配置文件轮换** 在当前提供商内。
2. **模型回退**到`agents.defaults.model.fallbacks`中的下一个模型。

在轮换配置文件或更改模型之前，运行程序会尝试针对临时速率限制和提供程序故障进行有限的相同模型恢复。它延续现有的记录，保留部分输出和已完成的工作。指示代理在决定是否重复之前检查中断的操作。重试状态显示等待和尝试计数。仍然可以取消。无需额外配置。

当另一个配置的候选者仍然存在并且尝试可以安全地重播时，显式组织范围的每分钟令牌 （TPM） 耗尽会跳过相同模型的退避和身份验证配置文件轮换。 Auth-profile 支持的凭据使用现有模型冷却时间，从 30 秒开始，然后再进行一次主要检查。同一提供商的其他模型仍然符合资格。通用 429 限制、请求限制、服务器错误和连接故障保持有限的相同模型恢复。最后配置的候选保留相同模型的恢复。如果所有后来的候选者都被策略、身份验证或冷却检查跳过，则该回合会报告耗尽的链，而不是返回到 TPM-limited 模型。内联提供程序密钥仍会在稍后的轮次中重试主提供程序；他们现有的冷却政策涵盖了身份验证和计费失败，而不是模型速率限制。

输出令牌限制与暂时的提供商中断无关。嵌入式运行时最多允许对截断的响应工具调用进行一次延续或仍需要答案的空长度停止。它记录输出限制通知并继续保存的记录，保留已完成的操作。第二个输出限制显示了未完成的结果。原始模型运行，`promptMode: "none"` 无法承载该历史记录，因此它们会在不重放原始请求的情况下显示输出限制。可见的部分答案仍然可见。

对于响应，`max_output_tokens` 包括推理和可见输出。该请求使用配置的`maxTokens`覆盖或模型的输出上限；服务层不会独立更改该上限。正在进行的长生成可能会超过流的空闲超时。单独运行的截止日期仍然适用；请参阅 [ 代理循环超时](/concepts/agent-loop#timeouts)。

ChatGPT 响应 WebSocket 连接到期和终端事件之前的正常关闭即使在流开始后也遵循此恢复策略。失效的socket被退役；恢复会继续保存的记录，而不是在传输内重放请求。

Anthropic 流错误保留其结构化错误类型，因此即使提供者的消息是通用的，速率限制、过载和身份验证失败也遵循相同的恢复策略。

本地脚本写入冲突不会重试模型、轮换帐户或触发模型回退。成绩单所有者重新读取当前修订版本并重试符合条件的追加一次。重复冲突会报告为本地错误；较旧的回复无法覆盖或绕过较新的用户回合。

仅当提供者确定推理或思维参数时，思维水平恢复才适用。 Model/account 限制和不相关的不受支持的选项保留其原始故障分类并遵循配置的回退策略。 OpenClaw 不会在思维禁用的情况下重试它们。

## <a id="runtime-flow"></a> 运行流程

<Steps>
  <Step id="resolve-session-state" title="解析会话状态">
    解析当前会话模型和认证配置文件偏好。
  </Step>
  <Step id="build-candidate-chain" title="构建候选链">
    根据当前模型选择和该选择源的后备策略构建模型候选链。配置的默认值、cron 作业主要和自动选择的后备模型可以使用配置的后备。显式用户会话选择是严格的。
  </Step>
  <Step id="try-the-current-provider" title="尝试当前的提供商">
    尝试使用 auth-profile rotation/cooldown 规则的当前提供程序。在旋转配置文件或推进模型回退之前，运行将有限恢复应用于符合条件的瞬态故障。
  </Step>
  <Step id="advance-on-failover-worthy-errors" title="解决值得故障转移的错误">
    如果该提供方因可故障转移错误而用尽，移动到下一个模型候选项。
  </Step>
  <Step id="use-fallback-for-the-current-turn" title="对当前回合使用后备">
    运行获胜的后备候选者而不更改会话的选定 provider/model.
  </Step>
  <Step id="report-failure-if-exhausted" title="如果耗尽则报告失败">
    如果每个候选人都失败了，那么就要指出最终的失败。抛出的耗尽摘要包括结构化的每次尝试详细信息以及已知的最快冷却时间。
  </Step>
</Steps>

后备执行是本地化的。回复运行程序仅保留回退通知状态，因此 `/status` 和转换通知可以区分所选模型和应答模型。它不会将后备保留为下一回合的模型选择。

当自动模型选择前进到回退时，放置在 OpenClaw 云工作线程上的会话将保留 OpenClaw 运行时。配置的提供程序、模型和身份验证配置文件后备规则仍然适用。显式会话或配置的运行时选择仍然严格：不兼容的运行时报告放置错误，并在重试之前需要兼容的目标。

当配置的回退因代理运行达到最终超时或空闲超时成本失控断路器返回终端错误而停止时，`model-fallback/decision` 记录器会记录 `model_fallback_chain_stopped`，原因为 `agent_run_terminal_timeout` 或 `idle_timeout_circuit_breaker`。这些是终端停止，而不是提供商失败或尝试其他模型的请求。现有的运行截止日期和成本限制仍然适用。

## <a id="automatic-cyber-policy-escalation"></a> 自动网络策略升级

嵌入式 OpenClaw 运行时在 Daybreak Blue 上重试一次重放安全 OpenAI 网络策略拒绝。这包括使用 ChatGPT- 验证的 OpenAI 响应传输的正常嵌入式轮流，而不仅仅是 Codex 插件会话。该传输将 OpenAI 的结构化网络策略错误投射到该策略使用的拒绝元数据中，从它可以到达的每个终端路径：非 OK HTTP 正文、流式传输的 `error` 事件和 `response.failed` 事件。没有结构化网络类别的通用拒绝文本仍然是终端。

该策略路由是本地化的：它不会更改所选的会话模型，也不会向 Daybreak 发送普通的提供者故障。 Codex- 支持的会话保留 [Codex 利用运行时行为 ](/plugins/codex-harness/runtime-behavior#automatic-daybreak-escalation) 中描述的单独的插件拥有的策略。

默认目标是 `openai/gpt-daybreak-blue-latest`。仅当所有这些都为真时才会运行重试：

- 选定的嵌入尝试报告 `provider_refusal`，提供者为 `openai`，类别为 `cyber`；
- 尝试的重放元数据证明不会重复任何工具或交付副作用；
- 目标与被拒绝的模型不同；
- 选材不严格；和
- 该功能已启用。

严格的选择始终是严格的。锁定的模型选择作为显式的空回退列表到达运行者，并且此策略遵循与普通回退相同的方式：拒绝保持最终状态，直到操作员解锁选择。

如果 Daybreak 尝试在未提交工作的情况下失败，OpenClaw 会保留原始提供者拒绝，而不是尝试不相关的配置回退。如果重试在失败之前已经执行了工具或交付了输出，则会保留其自己的结果，因为其重播判决、交付证据和终端收据描述了实际运行的内容。如果重试抛出除普通故障转移类错误之外的任何内容，则该异常将不变地传播：记录的终端停止禁止重播，而未分类的抛出是后备运行程序报告已提交工作的尝试的方式。在另一个网络拒绝再次检查该目标之前，授权失败会冷却当前会话的目标。

```json5
{
  agents: {
    defaults: {
      embeddedAgent: {
        cyberFailover: {
          mode: "auto", // or "off"
          model: "openai/gpt-daybreak-blue-latest",
          cooloffMs: 600000,
        },
      },
    },
  },
}
```

通用模型后备排序不变。根据现有的拒绝政策，非网络拒绝、Codex/native-harness 结果或任何重放不安全的尝试仍然是最终的。

## <a id="selection-source-policy"></a> 选择来源策略

选择来源决定是否允许回退链：

- **已配置默认值**: `agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **本机代理primary**：`agents.entries.*.model` 是严格的，除非该代理的模型对象包含其自己的`fallbacks`。使用 `fallbacks: []` 使严格行为明确，或使用非空列表来选择该代理进入模型后备。
- **ACP 代理主**：对于 `runtime.type: "acp"`，代理主选择其外部harness模型。原生 OpenClaw 调用继承 `agents.defaults.model` 的主要和备用；显式代理 `model.fallbacks` 替换本机回退列表，包括 `[]` 以禁用它。显式的本机会话和子代理选择保留其正常的优先级和严格性。这不会为仅运行所选模型的命令（例如 `/btw`）添加后备。
- **运行时回退**：回退候选仅适用于当前回合。下一回合再次从选定的主要位置开始。 OpenClaw 仍可识别 v2026.4.26 至 v2026.6.0. 存储的 `modelOverrideSource: "auto"` 条目。它每 5 分钟检查其配置的源，并在源恢复后清除它们。 v2026.6.1.、`/new`、`/reset` 和 `sessions.reset` 中发货的自动清算也会清除这些条目。
- **用户会话覆盖**：使用`/model`选择特定模型，模型选择器`session_status(model=...)`或`sessions.patch`写入`modelOverrideSource: "user"`。这是精确的会话选择。如果选定的 provider/model 在生成回复之前失败，OpenClaw 会报告失败，而不是从不相关的已配置回退进行应答。
- **显式配置的默认值**：通过相同的表面选择**Default**写入`modelOverrideSource: "default"`而不存储provider/model覆盖。这可以防止子会话继承父模型引脚，同时保留配置的默认值的正常回退策略。
- **旧会话覆盖**：在v2026.4.26之前写入的会话条目可能具有`modelOverride`，而没有`modelOverrideSource`。 OpenClaw 将这些视为用户覆盖，因此显式旧选择不会默默地转换为后备行为。
- **Cron 负载模型**：cron 作业 `payload.model` / `--model` 是主要作业，而不是用户会话覆盖。除非作业提供 `payload.fallbacks`，否则它将使用配置的后备。 `payload.fallbacks: []` 使 cron 运行严格。

代理只能使用 `model: { fallbacks: [...] }` 覆盖其后备链，并继续继承共享主链。设置 `fallbacks: []` 显式禁用回退，而不固定该主节点。在 **设置 → 代理 → 概述** 中，编辑后备芯片保留主继承。移除每个芯片会保存一个空链，而不是恢复共享的后备。

## <a id="auth-storage-(keys-%2B-oauth)"></a><a id="auth-storage-keys-+-oauth"></a> 认证存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth 令牌都使用**认证配置文件**。

- 密钥和运行时认证路由状态存储在 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` 中。
- 配置中的 `auth.profiles` / `auth.order` 仅用于**元数据和路由**（不包含密钥）。
- 旧版 `credentials/oauth.json`、`auth-profiles.json`、`auth-state.json` 和每个代理 `auth.json` 文件仅由 `openclaw doctor --fix` 导入。受影响代理的运行时执行将被阻止，直到迁移带有凭据的旧文件为止。它永远不会默默地导入或回退到它们。

更多详情：[OAuth](/concepts/oauth)

凭据类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（某些提供商还适用 `projectId`/`enterpriseUrl`）
- `type: "token"` → 静态不记名式令牌，可选择过期。 OpenClaw 不刷新它（用于 `aws-sdk` 和其他凭证链身份验证模式）

## <a id="profile-ids"></a> 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个账户可以共存。

- 默认：`provider:default`（无可用电子邮件地址时）。
- 带电子邮件地址的 OAuth：`provider:<email>`（例如 `openai:user@example.com`）。

配置文件保存在每个 agent 的 `openclaw-agent.sqlite` 身份验证配置文件存储中。

## <a id="rotation-order"></a> 轮换顺序

当一个提供方有多个配置文件时，OpenClaw 会按如下顺序选择：

<Steps>
  <Step id="stored-order-override" title="存储订单覆盖">
    每个代理订单设置为 `openclaw models auth order set --provider <id> <profileIds...>`。
  </Step>
  <Step id="explicit-config" title="显式配置">
    `auth.order[provider]`（如果已设置）。
  </Step>
  <Step id="configured-profiles" title="配置的配置文件">
    按 provider 过滤后的 `auth.profiles`。
  </Step>
  <Step id="stored-profiles" title="存储的配置文件">
    每个 agent 的 SQLite 认证配置文件条目。
  </Step>
</Steps>

如果没有配置显式顺序，OpenClaw 会使用轮询顺序：

- **主键：** 配置文件类型（**OAuth，然后是静态 token，最后是 API key**）。
- **OAuth 的次键：** 当前可用访问令牌的配置文件优先于访问令牌已过期的配置文件。已过期的 OAuth 配置文件仍保留资格， 这样当没有可用的同类配置文件时，运行时可以刷新它们。
- **下一个键：** `usageStats.lastUsed`（最旧的第一个，在每个 type/state 层内）。
- **Cooldown/disabled型材**移至最后，按最快到期时间订购。

### <a id="session-stickiness-(cache-friendly)"></a><a id="session-stickiness-cache-friendly"></a> 会话粘性（缓存友好）

清除或轮换身份验证 pin 仅影响所选代理的会话，包括自定义会话存储以及保留的 `global` 和 `unknown` 会话密钥。

OpenClaw **会为每个会话固定自动选择的认证配置文件**，以保持提供方缓存处于预热状态。它**不会在每次请求时轮换**。自动固定的配置文件可能会在以下情况下轮换或清除：

- 会话已重置 （`/new` / `/reset`）
- 配置文件位于cooldown/disabled

上下文压缩不会更改所选的身份验证配置文件。在压实过程中保持健康的形象；身份验证失败和不可用的配置文件仍使用正常的后备顺序。

通过 `/model …@<profileId> -s` 手动选择设置 **用户覆盖**。有效的用户 pin 可以在 `/new`、`/reset`、会话翻转、压缩和冷却窗口中保留。当符合条件时，它仍然是第一选择。当该确切的配置文件处于冷却或禁用状态时，OpenClaw 会尝试下一个符合条件的同一提供商配置文件，而不替换存储的 pin。显式删除已保存的凭据会清除其受影响的代理模型和对话帐户选择，同时保留选定的模型。其他帐户（包括另一个代理拥有的独立凭证）保留其选择。暂时丢失或过期的凭证不会清除用户 PIN；刷新可以恢复访问。如果较旧的配置仍命名已删除的帐户，请在模型中选择一个可用帐户。当所选提供商更改时，OpenClaw 还会清除不兼容的 pin，或者当用户选择另一个帐户时替换它。 `/model default -s` 清除模型覆盖，同时保留兼容的验证引脚并清除不兼容的验证引脚。

<Note>
自动固定和用户固定的身份验证配置文件都是重试首选项。 OpenClaw 在符合条件时首先尝试所选配置文件。然后，它可能会在身份验证失败、速率限制、计费限制或超时时轮换到另一个同一提供商的配置文件。用户 pin 在临时轮换期间保持不变。新的运行在其冷却时间到期后再次喜欢它，而不改变所选的模型或运行时。此身份验证轮换不会放松模型选择：显式用户 provider/model 选择仍然严格，并在其同一提供商身份验证配置文件耗尽后报告失败。
</Note>

### <a id="openai-codex-subscription-plus-api-key-backup"></a> OpenAI Codex订阅加API-密钥备份

对于 OpenAI 代理模型，身份验证和运行时是分开的。 `openai/gpt-*` 保留在 Codex harness上，而身份验证可以在 Codex 订阅配置文件和 OpenAI API-key 备份之间轮换。

对于面向用户的顺序，使用 `auth.order.openai`：

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

将 `openai:*` 用于 ChatGPT/Codex OAuth 配置文件和 OpenAI API-key 配置文件。当订阅达到 Codex 使用限制时，OpenClaw 会记录 Codex 提供的确切重置时间。它尝试下一个有序的身份验证配置文件，并在 Codex harness内保持运行。一旦重置时间过去，订阅配置文件将再次符合资格，并且下一次自动选择可以返回到它。

使用用户固定的配置文件使 account/key 成为该会话的持久第一偏好。如果变得不可用，OpenClaw 会暂时轮换剩余的符合条件的 `auth.order.openai` 配置文件，并在恢复后返回到固定配置文件。

## <a id="cooldowns"></a> 冷却

当配置文件由于身份验证或速率限制错误而失败时，OpenClaw 会将其标记为冷却并移至下一个配置文件。看起来像速率限制的超时也算作此类失败。

当上游网关拥有容量恢复时，提供商插件可以在 `openclaw.plugin.json` 中声明 `managesOwnAvailability: true`。这适用于插件声明的提供程序，并且仅跳过速率限制和过载冷却时间（`rate_limit` 和 `overloaded`）。 OpenRouter 和 Kilo Gateway 使用此声明。计费、身份验证、永久凭证失败和提供商报告的订阅阻止仍然强制执行。路由和身份验证状态使用相同的策略，包括在提供程序运行时加载之前。没有用户配置设置。

CLI- 支持的运行时仅在恢复、分叉和新会话恢复尝试完成后才解决配置文件运行状况。终端凭证故障会在模型回退之前冷却确切选定的配置文件。成功的运行会清除陈旧的故障状态。没有选定配置文件的转录本、格式、上下文、预提供程序超时和环境 CLI 故障不会更改共享配置文件的运行状况。

<AccordionGroup>
  <Accordion id="what-lands-in-the-rate-limit-timeout-bucket" title="什么落在速率限制/超时桶中">
    这个速率限制桶比普通的 `429` 更宽泛：它还包括提供方消息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及周期性使用窗口限制，例如 `weekly limit reached` 或 `monthly limit exhausted`。

    Format/invalid-request 错误通常是终端错误，因为重试相同的有效负载会以同样的方式失败，因此 OpenClaw 会显示它们而不是旋转身份验证配置文件。已知的重试修复路径可以显式选择加入：例如，云代码辅助工具调用 ID 验证失败将通过 `allowFormatRetry` 策略进行清理并重试一次。

    OpenAI-兼容**提供商完成** stop/finish原因，例如`Unhandled stop reason: error`、`stop reason: error`、`reason: error`和`Provider finish_reason: error`被分类为**`server_error`**（HTTP-类似状态500），不超时。对于模型或身份验证配置文件轮换，它们仍然具有故障转移价值，但诊断会保留提供程序完成原因文本，而不是将用户副本重写为“LLM 请求超时”。运输型完成原因（例如 `Provider finish_reason: abort`、`network_error` 和 `malformed_response`）保留在 timeout/failover 存储桶中（状态 408）。

    HTTP 状态映射使用 **`server_error`** 来表示未分类的非定时 `5xx` 故障，包括 `502` 和 `503`。 HTTP `529` 保留 **`overloaded`**。计时状态保留**`timeout`**：请求超时`408`，网关超时`504`，`522`和`524`，以及nginx客户端中止`499`。更具体的提供者错误和上下文分类保持其现有的优先级。

    纯文本提供程序信封（例如 `Google Generative AI API error (503): ...`）使用相同的状态映射，因此配置的回退仍然会前进，而无需单独的数字状态。显式数字状态字段优先；包含数字的不相关文本不提供 HTTP 状态。

    当源与已知的瞬态模式匹配时，通用服务器文本也可以落在该超时桶中。例如，裸模型运行时流包装器消息 `An unknown error occurred` 被视为对于每个提供程序都具有故障转移价值。当提供者流以 `stopReason: "aborted"` 或 `stopReason: "error"` 结尾而没有具体细节时，共享模型运行时会发出它。具有瞬时服务器文本的 JSON `api_error` 有效负载（例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`）也被视为值得故障转移的超时。

    仅当提供者上下文实际上是 OpenRouter 时，OpenRouter- 特定通用上游文本（例如裸 `Provider returned error`）才会被视为超时。通用内部后备文本（例如 `LLM request failed with an unknown error.`）保持保守，不会自行触发故障转移。

  </Accordion>
  <Accordion id="sdk-retry-after-caps" title="SDK 上限后重试">
    否则，某些提供商 SDK 可能会在将控制权返回到 OpenClaw 之前休眠较长的 `Retry-After` 窗口。对于基于不锈钢的 SDK（例如 Anthropic 和 OpenAI），OpenClaw 默认情况下会限制 SDK-internal `retry-after-ms` 和 `retry-after` 等待 60 秒。它会立即显示更长的可重试响应，因此该故障转移路径可以运行。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用上限。请参阅 [ 重试行为 ](/concepts/retry)。
  </Accordion>
  <Accordion id="model-scoped-cooldowns" title="模型范围内的冷却时间">
    速率限制冷却也可以按模型范围生效：

    - 当失败模型 ID 已知时，OpenClaw 记录速率限制失败的 `cooldownModel`。
    - 当冷却范围限定在不同模型上时，同一提供方上的兄弟模型仍可尝试。
    - Billing/disabled 窗户仍然遮挡模型的整个轮廓。

  </Accordion>
</AccordionGroup>

常规（非计费、非永久认证）冷却会根据配置文件最近的错误次数进行递增：

- 第一次故障：30秒
- 第二次故障：1分钟
- 3rd+ 故障：5 分钟（上限）

一旦配置文件的内置失败窗口结束，计数器就会重置。

状态存储在每个代理的 SQLite 认证状态中的 `usageStats` 下：

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## <a id="auth-failure-skip-cache"></a> 认证失败跳过缓存

默认情况下，每个新回合都会保留现有的后备重试行为。 OpenClaw 再次重试每个配置的后备候选。这包括最近因 `auth` 或 `auth_permanent` 失败的非主要候选人。

可通过以下方式启用跳过重复认证失败：

```bash
OPENCLAW_FALLBACK_SKIP_TTL_MS=60000
```

启用后，OpenClaw 会在某个非主回退候选项发生认证类失败后，记录一个会话范围内、存储于内存中的跳过标记。该键包含会话、提供商、模型以及所选的自动或显式配置文件 ID。切换配置文件不会继承其他配置文件的失败标记。主候选项永远不会被跳过，因此显式选择模型时仍会显示实际的认证错误。缓存仅限当前进程，Gateway 重启后会清除。

该值是以毫秒为单位的 TTL。`0` 或未设置会禁用该缓存。正值会被限制在 1 秒到 10 分钟之间。

## <a id="billing-disables"></a> 计费禁用

Billing/credit 故障（例如“信用不足”/“信用余额太低”）被视为值得进行故障转移。 OpenClaw 最初将凭证标记为 **disabled** 十分钟，然后轮换到下一个符合条件的 profile/provider.

配置的内联 API 键无法在活动禁用窗口期间重试。窗口期满后，他们将再次获得资格。另一个计费失败会启动一个新的十分钟窗口。存储的身份验证配置文件还可以在禁用窗口期间通过有限的主要提供商检查来恢复。充电本身并不会清除持久状态，升级会在现有截止日期留下一个已经活动的窗口。

<Note>
并非每个帐单形状的响应都是 `402`，也不是每个 HTTP `402` 都会到达这里。即使提供商返回 `401` 或 `403`，OpenClaw 也会在计费存储桶中保留显式计费文本。特定于提供商的匹配器的范围仅限于拥有它们的提供商，例如 OpenRouter `403 Key limit exceeded`。

同时，当消息看起来可重试时，临时 `402` 使用窗口和 organization/workspace 支出限制错误将被分类为 `rate_limit`（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`）。它们停留在短 cooldown/failover 路径上，而不是长计费禁用路径上。
</Note>

高可信度永久身份验证失败（revoked/deactivated 密钥、停用的工作区）使用相同的十分钟初始禁用窗口，因为某些提供商在事件期间会短暂显示看似身份验证的有效负载。

状态存储在每个 agent 的 SQLite auth state 中：

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

默认情况下，重载和速率限制错误允许同一提供商的身份验证配置文件轮换，然后再前进到下一个配置的模型回退。活动运行时首先使用其合格的同模型恢复预算。身份验证配置文件轮换和模型回退仍然需要证据证明重播原始尝试是安全的。

## <a id="model-fallback"></a> 模型回退

如果某个提供程序的所有配置文件均失败，则当失败与下列故障转移原因之一匹配时，OpenClaw 会移至 `agents.defaults.model.fallbacks` 中的下一个模型。这包括 HTTP 404 响应的 `model_not_found`。它不包括 404，其响应正文标识更具体的条件，例如上下文溢出、会话到期、计费、身份验证或请求格式。未公开足够详细信息的提供程序错误仍会在后备状态下精确标记。 `empty_response` 表示提供者未返回可用的消息或状态。 `no_error_details` 表示提供者显式返回 `Unknown error (no error details in response)`。 `unclassified` 表示 OpenClaw 保留了原始预览，但还没有分类器与之匹配。

诸如 `ModelNotReadyException` 之类的提供商繁忙信号落在过载桶中，并遵循与速率限制相同的一轮转后回退策略。

`agents.defaults.timeoutSeconds` 和特定于运行的模型超时适用于每个模型候选尝试。当尝试超时时，下一个配置的回退将收到其自己的完整预算，因此总运行时间可能会超过设置。进展不会更新尝试的预算。用户取消会停止整个回退链，并且独立的外部截止日期（例如 cron 调度程序的截止日期）仍然适用。请参阅 [ 代理超时](/concepts/agent-loop#timeouts)。

故障转移控制器拥有 OpenClaw 的瞬时恢复预算。在身份验证配置文件轮换或模型回退之前，速率限制每次连续中断最多接收 **10 次总尝试**。抖动指数等待上限为 30 秒，而提供商 `retry-after` 和 `retry-after-ms` 提示即使超过该上限，仍保持最短等待。其他瞬时故障保留八次重试和连续中断的 90 秒窗口。成功完成的模型响应会重置该窗口、重试计数和退避；仅部分输出和工具活动则不然。现有的每次尝试超时和任何独立的外部截止日期仍然具有权威性。一旦预算或窗口耗尽，恢复将继续进行符合条件的身份验证配置文件轮换、配置的模型回退或可见错误。延续保留记录而不是重播原始用户请求。复苏和任何后备获胜者仍然是本地化的。

嵌入式运行时的现有会话设置 `retry.provider.maxRetries` 会覆盖其恢复重试预算。 `0` 禁用重试，并且速率限制仍限制为每次连续中断的总尝试次数为 10 次。它不是 `openclaw.json` 密钥，并且不会更改本机harness的内部请求重试。本机harness可能会在 OpenClaw 开始连续恢复之前完成自己的请求重试。回复运行器不会添加另一个整回合重播循环。请参阅 [ 重试策略 ](/concepts/retry) 了解节奏和排除。

等待期间，Control UI 显示一个瞬态 **Retrying… n/10** 速率限制指示器。重试的失败不会成为持久的助理消息。终端故障保留一个错误。历史记录隐藏恢复的空错误或仅推理错误，而无需重写存储的记录。

可见的失败消息保留提供者的 HTTP 状态，与重试分类无关。提供者 HTTP 500 在最终回复中仍然是服务器错误，恢复将其分类为 `server_error`，而不是将其与超时型故障分组。原始提供商响应详细信息不包含在该回复中。

网关转录验证失败是本地格式错误。它们不会轮换或冷却健康的凭据，并且助理错误和抛出的运行故障都会通过恢复指导来识别被拒绝的会话记录条目。真正的提供者会话到期会保留其现有的凭证运行状况行为。

提供程序过载和 HTTP 5xx 故障使用瞬态恢复指导。仅表明模型“不可用”的消息并不表明该模型已停用或您的配置需要更改。配置指南需要缺失模型响应或明确的 account/model 限制。即使在 Codex 停止重试转弯后，Codex 转弯错误仍会保留其过载和 HTTP- 状态信息。

当运行从配置的默认主数据库、cron 作业主数据库、具有显式回退的代理主数据库或自动选择的回退覆盖开始时，OpenClaw 可以遍历匹配的已配置回退链。没有明确回退的代理初选是严格的。显式用户选择也很严格：`/model ollama/qwen3.5:27b`、模型选择器、`sessions.patch` 和一次性 CLI provider/model 覆盖。如果该提供程序或模型无法访问，或者在生成回复之前失败，OpenClaw 会报告失败，而不是从不相关的回退进行应答。

### <a id="candidate-chain-rules"></a> 候选链规则

OpenClaw 会根据当前请求的 `provider/model` 以及已配置的回退构建候选列表。

<AccordionGroup>
  <Accordion id="rules" title="规则">
    - 请求的模型始终排在第一位。
    - 显式配置的回退会去重，但不会按模型允许列表过滤。它们被视为明确的操作员意图。
    - 如果当前运行已经在同一提供商家族中的某个已配置回退上，OpenClaw 会继续使用完整的已配置链。
    - 当未提供显式回退覆盖时，即使请求的模型使用的是不同提供商，已配置的回退也会在已配置主项之前尝试。
    - 当没有向回退运行器提供显式回退覆盖时，配置的主要会附加在末尾。一旦早期候选者耗尽，该链就可以恢复正常默认状态。
    - 当调用方提供 `fallbacksOverride` 时，运行器会精确使用请求的模型加上该覆盖列表。空列表会禁用模型回退，并阻止将已配置主项作为隐藏重试目标追加。
    - Plugins 可以从 `before_model_resolve` 返回 `fallbacksOverride` 以选择运行范围的链，包括 `[]` 在所选模型上失败，而不是尝试配置的后备。请参见 [ 本地模型路由 ](/plugins/hooks/prompt-and-session#restrict-a-run-to-local-models)。
    - 上下文溢出恢复耗尽后，优先考虑具有已知足够上下文的剩余候选者，保留每个组内的配置顺序。适用有效的 `contextTokens` 上限。如果提供商不提供令牌计数，则首选较大的已知窗口；元数据是一个提示，每个候选者仍然执行自己的上下文检查。未知或较小窗口的候选人之后仍然有资格。

  </Accordion>
</AccordionGroup>

### <a id="which-errors-advance-fallback"></a> 哪些错误会推进回退

<Tabs>
  <Tab id="continues-on" title="继续">
    - 认证失败
    - 速率限制和冷却耗尽
    - overloaded/provider-busy 错误
    - 超时形态的故障转移错误
    - 计费禁用
    - `model_not_found`，包括符合条件的 HTTP 404 响应
    - 在活动模型压缩和超大工具结果恢复后模型上下文溢出无法使请求适合，包括压缩无法收缩的单个消息。回合必须仍然安全才能重玩。现有模型锁、显式空回退覆盖和操作员限制继续适用
    - `LiveSessionModelSwitchError` 表示过时的当前或早期候选者。后来配置的目标直接重定向，而链外的目标返回到有界会话模型重试所有者
    - a 提供程序请求大小上限达到回退边界，当传输拥有的插件harness绕过嵌入式恢复时会发生这种情况。上限属于拒绝提供者的配额，而不是任何模型的上下文窗口，因此不同配置的候选者仍可能接受该请求
    - 当仍有剩余候选项时，其他无法识别的错误

  </Tab>
  <Tab id="does-not-continue-on" title="不再继续">
    - 不是 timeout/failover-shaped 的显式中止
    - an 在有界同模型恢复后以正常 `stop` 结尾的不完整嵌入回复，除非该工具明确将结果分类为回退故障。如果主机需要答案，则 OpenClaw 会显示未完成转弯错误；可选的内部转弯可以安静地完成。重放安全并不能确定不同的模型会回答
    - 提交工具效果或交付无法安全重播的回复后上下文溢出
    - a 嵌入式运行中的提供程序请求大小上限（例如 Groq 的 `413 ... on tokens per minute (TPM): Limit 8000, Requested 8098`），它仍然是终端而不是压缩
    - 非超时/非故障转移形态的显式中止
    - 最终提供商拒绝。符合条件的 Anthropic 直接 API-key 请求会在提供者请求中处理拒绝回退（请参阅 [Anthropic](/providers/anthropic#safety-refusal-fallback-claude-opus-5-and-fable-5)）

  </Tab>
</Tabs>

成功的上下文溢出回退会在回退诊断中记录应答模型和溢出原因，并发出可见警告。如果没有候选人成功，则保留原始溢出指导。

最终提供者拒绝会结束当前回合。 OpenClaw 将其浮出水面，无需自动恢复转弯、压实重试或切换到不相关的模型。除了错位预防措施外，排队的或稍后的用户消息仍然会开始自己的轮次。

### <a id="misalignment-precautions"></a> 不对中注意事项

OpenAI `misalignment_policy_violation` 停止受影响对话中的进一步工作。这意味着代理对任务的解释需要审查；它并不能确定用户违反了政策。 OpenClaw 保留可用的提供者发现并保留排队的消息，而不是重试对话。已经接受的结果仍然可以完成记录。

即使没有较新的拒绝诊断，保留策略代码的较早保存的错误也会显示安全预防措施。显示历史错误并不构成审查结果或授权继续。

在 Control UI 中，选择 **审核结果**。当受支持的 Codex 或 ChatGPT 响应运行时提供延续时，对话框会在提供 **确认结果和继续** 之前显示其确切消息。确认仅适用于显示的会话和结果。它保留运行时、模型、沙箱和审批设置；更改后的审核需要做出另一项决定。只有在提供者接受继续后，预防措施才会清除。先前排队的消息仍保留以供单独查看和重试。

当下一个用户轮流时，Continue 会恰好发送一次已确认的消息。运行时上下文保持独立，现有的转录消息保持不变。

普通 API-key 响应和隐身对话不提供延续。缺失或不完整的调查结果也不能授权一项。停止的对话不会撤消已经完成的操作。请参阅 [OpenAI 的不对中监控指南](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring)。

<a id="cooldown-skip-vs-probe-behavior" />

### <a id="cooldown-skip-vs-check-behavior"></a> 冷却跳过与检查行为

当某个提供方的所有认证配置文件都已经处于冷却中时，OpenClaw 不会自动永远跳过该提供方。它会按每个候选项做决策：

<AccordionGroup>
  <Accordion id="per-candidate-decisions" title="每个候选人的决定">
    - 持久性认证失败会立即跳过整个提供商。
    - Billing 通常会禁用跳过，但仍然可以在节流阀上检查主要候选者，因此无需重新启动即可恢复。
    - 主要候选者可以在冷却时间到期时通过每个提供商的限制进行检查。
    - 即使处于冷却中，只要失败看起来是瞬时性的（`rate_limit`、`overloaded` 或未知），仍可尝试同提供商的回退兄弟项。这在速率限制是模型范围、而兄弟模型可能仍可立即恢复时尤其相关。
    - 瞬态冷却时间检查仅限于每个提供程序每次回退运行一次，因此单个提供程序不会停止跨提供程序回退。

  </Accordion>
</AccordionGroup>

## <a id="session-overrides-and-live-model-switching"></a> 会话覆盖与实时模型切换

会话模型的更改是共享状态。活动运行程序、`/model` 命令、compaction/session 更新和实时会话协调同一会话条目的所有读取或写入部分。回退执行不会写入模型选择字段，因此在重试时无法替换较新的手动选择。

实时模型切换遵循以下规则：

- 只有用户显式驱动的模型变更才会标记待处理的实时切换。其中包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 由系统驱动的模型变更，例如回退轮换、心跳覆盖或压缩，绝不会自行标记待处理的实时切换。
- 用户驱动的模型覆盖被视为后备策略的精确选择。因此，无法访问的所选提供商会显示为故障，而不是被 `agents.defaults.model.fallbacks` 掩盖。
- 运行时回退候选仍然局限于当前轮次。下一轮会从当前所选模型开始，包括上一轮运行期间到达的手动选择。
- 仍然支持先前存储的自动回退覆盖：OpenClaw 定期检查其配置的来源，并在恢复时清除覆盖。 `/new`、`/reset` 和 `sessions.reset` 立即清除自动源覆盖。
- 在组和频道对话之外，用户回复会在每次状态更改时宣布回退转换和回退清除恢复。使用相同的 selected/active 对重复转动不会重复通知。组和频道对话保留相同的后备状态和生命周期事件，而不发布它。
- `/status` 会显示所选模型，以及在回退状态不同时，显示活动的回退模型和原因。
- 实时会话协调优先使用持久化的会话覆盖，而不是过时的运行时模型字段。
- 如果实时切换错误指向活动后备链中较晚的候选模型，则 OpenClaw 会直接跳转到该选定模型。它不会首先遍历不相关的候选者。
- A 实时开关可以选择主动回退链之外的模型。 OpenClaw 然后将原始切换返回给代理、回复或独立 cron 重试所有者。所选模型可以完成同一回合。

活动运行会直接携带其选定的候选。实时协调仅在存在显式待处理的用户切换时才改变该候选，因此不需要临时回退覆盖或回滚。

当记录的回退通知属于不同的选定模型时，状态和会话列表会跳过其可选的记录查找。该过时通知路径不再显示仅记录错误或启动投影协调。匹配通知使用只读转录本查找，既不创建存储也不启动投影协调。如果可选存储或投影不可用，则查找将忽略转录本派生的详细信息。意外的读取错误仍然会传播。

## <a id="user-visible-fallback-notices"></a> 面向用户的回退通知

在组和频道对话之外，当会话移至自动选择的回退时，OpenClaw 在同一回复表面中发送状态通知：

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

当稍后的检查成功并且会话返回到选定的主数据库时，OpenClaw 发送：

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

这些通知是操作消息，而不是辅助内容。它们在组和频道对话之外传递一次状态变化，包括可行时的仅副作用转向，但重复的转向本地回退转换不会重复它们。组和频道对话会抑制可见通知，同时保留相同的后备状态和生命周期事件。传递绕过正常的源回复抑制，不消耗线程通道的第一个辅助回复时隙，并且被排除在文本到语音转换之外。

当连续轮次使用相同的 selected/active 对时，持久通知状态可防止重复通知，而模型选择本身保持不变。

对于允许的会话运行，Control UI 使用与压缩事件相同的表示方式将尝试的回退切换记录为转录事件分隔符。它显示了以前的模型、正在尝试的后备方案以及在该候选者仍在工作时进行切换的原因。该事件在重新加载后保留在历史记录中，并且不会声明回退成功。当稍后的转弯成功返回到所选模型时，匹配的 **返回到所选模型** 分隔符记录回退和所选模型。开始新的尝试或在所选模型上失败不会记录成功返回。

在恢复过程中，Control UI 使用 **Retrying…**（运行时报告重试截止时间时的倒计时）或 **Trying 后备模型…** 更新工作爪。个别失败的尝试不会成为警告消息，包括在历史记录重新加载之后。当运行恢复时，状态恢复正常并显示成功答案，而不会出现失败通知。隐藏的内部继续提示不会启动新用户轮次进行恢复匹配。

如果在其可用的恢复尝试后运行最终失败，Control UI 将显示一个终端故障通知，而不是每次尝试一个警告。部分输出和媒体仍然可见，原始记录保留尝试诊断以进行故障排除。最近一次失败的运行提供了 **Try Again** 来发送继续操作，在重试操作之前检查已完成的工作，并且 **Change model** 打开现有模型选择器。这两个操作都不会默默地重播原始提示或清除未发送的草稿。

## <a id="observability-and-failure-summaries"></a> 可观测性与失败摘要

每个承认的重试或回退请求都会获得其自己的启动相关诊断恢复限额。早期失败的尝试仍保留在累积无进展证据中，但该证据无法在其记录的配额到期之前取消新的请求。用户取消、重试限制和总体运行预算仍然适用。

`runWithModelFallback(...)` 会记录每次尝试的详细信息，这些信息会显示在日志和面向用户的冷却提示中：

- provider/model 尝试
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及类似的回退原因）
- 可选status/code
- 人类可读的错误摘要

当候选者失败、被跳过或稍后回退成功时，结构化 `model_fallback_decision` 日志还包含平面 `fallbackStep*` 字段。这些字段使尝试的转换变得明确：`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail` 和 `fallbackStepFinalOutcome`。即使终端回退也失败，日志和诊断导出器也可以重建主要故障。

对于缺失模型后备，请查找 `reason` 或 `fallbackStepFromFailureReason` 为 `model_not_found` 的 `model_fallback_decision` 事件。

穷举摘要保留结构化尝试记录。后备运行程序可以返回分类的耗尽结果或抛出 `FailoverError`。外部回复运行器可以使用这些详细信息来构建更具体的消息，例如“所有模型都暂时受到速率限制”。它可以包括已知的最快冷却时间。

此冷却摘要会感知模型：

- 对于尝试的 provider/model 链，将忽略不相关的模型范围的速率限制
- 如果剩余阻止因素是匹配的模型范围速率限制，OpenClaw 会报告仍在阻止该模型的最后一个匹配到期时间。

## <a id="related-config"></a> 相关配置

有关以下内容，请参见[网关配置](/gateway/configuration)：

- `auth.profiles` / `auth.order`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由
- [`openclaw models`](/cli/models) — 检查已解决的默认值和回退

有关更广泛的模型选择和回退概览，请参见[模型](/concepts/models)。

请参阅 [ 模型提供商](/concepts/model-providers) 了解提供商设置、凭证和每个提供商的模型目录。
