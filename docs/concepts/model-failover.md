---
summary: "OpenClaw 如何轮换认证配置文件并在不同模型之间回退"
read_when:
  - 诊断认证配置文件轮换、冷却或模型回退行为
  - 更新认证配置文件或模型的故障转移规则
  - 了解会话模型覆盖如何与回退重试交互
title: "模型故障转移"
sidebarTitle: "模型故障转移"
---

OpenClaw 分两个阶段处理失败：

1. **当前提供方内的认证配置文件轮换**。
2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

## 运行流程

<Steps>
  <Step title="解析会话状态">
    解析当前会话模型和认证配置文件偏好。
  </Step>
  <Step title="构建候选链">
    根据当前模型选择以及该选择来源的回退策略构建模型候选链。已配置的默认值、cron 任务主模型以及自动选择的回退模型可以使用已配置的回退；显式的用户会话选择是严格的。
  </Step>
  <Step title="尝试当前提供方">
    使用认证配置文件轮换/冷却规则尝试当前提供方。
  </Step>
  <Step title="在可故障转移错误时推进">
    如果该提供方因可故障转移错误而用尽，移动到下一个模型候选项。
  </Step>
  <Step title="当前轮次使用回退">
    在不更改会话中所选提供方/模型的情况下，使用获胜的回退候选项运行。
  </Step>
  <Step title="重试安全的纯超载耗尽">
    如果每个候选都仅因提供方过载而失败，则在尚未开始任何工具执行或助手输出时，以指数退避方式对整个轮次本地链重试最多 10 次。30 秒后，发送一条状态通知，这样用户就不会一直无声等待。
  </Step>
  <Step title="在用尽时抛出 FallbackSummaryError">
    如果每个候选都失败，则抛出带有每次尝试细节以及已知情况下最早冷却到期时间的 `FallbackSummaryError`。
  </Step>
</Steps>

回退执行仅限于当前轮次。本回复运行器只持久化回退通知状态，因此 `/status` 和过渡通知可以区分所选模型与实际回答的模型；它不会将该回退持久化为下一轮的模型选择。

## 选择来源策略

选择来源决定是否允许回退链：

- **已配置默认值**: `agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent 主模型**: `agents.entries.*.model` 默认是严格模式，除非该 agent 的 model 对象包含自己的 `fallbacks`。使用 `fallbacks: []` 可显式启用严格行为，或提供一个非空列表让该 agent 使用模型回退。
- **运行时回退**: 回退候选项仅适用于当前轮次。下一轮会再次从所选主模型开始。OpenClaw 仍会识别之前保存的 `modelOverrideSource: "auto"` 条目，每 5 分钟探测其配置来源一次，并在来源恢复后将其清除。`/new`、`/reset` 和 `sessions.reset` 也会清除这些条目。
- **用户会话覆盖**: `/model`、模型选择器、`session_status(model=...)` 和 `sessions.patch` 会写入 `modelOverrideSource: "user"`。这是一个精确的会话选择。如果所选 provider/model 在生成回复前失败，OpenClaw 会报告该失败，而不是从无关的已配置回退项中回答。
- **旧版会话覆盖**: 较旧的会话条目可能只有 `modelOverride` 而没有 `modelOverrideSource`。OpenClaw 会将这些条目视为用户覆盖，因此显式的旧选择不会被悄然转换为回退行为。
- **Cron 负载模型**: cron 作业的 `payload.model` / `--model` 是作业主模型，不是用户会话覆盖。除非作业提供 `payload.fallbacks`，否则它会使用已配置的回退；`payload.fallbacks: []` 会使 cron 运行保持严格模式。

当某一轮切换到回退模型时，OpenClaw 会发送一条可见通知；当后续某一轮在所选主模型上成功时，也会发送另一条通知。持久化的通知状态可防止在连续轮次使用相同的 selected/active 对时重复通知，而模型选择本身保持不变。

## 认证失败跳过缓存

默认情况下，每个新的轮次都会保持现有的回退重试行为：OpenClaw 会再次重试每个已配置的回退候选项，包括最近因 `auth` 或 `auth_permanent` 失败的非主候选项。

可通过以下方式启用跳过重复认证失败：

```bash
OPENCLAW_FALLBACK_SKIP_TTL_MS=60000
```

启用后，OpenClaw 会在一次认证类失败后，为非主回退候选项记录一个内存中的、会话范围内的跳过标记，键由会话 ID、提供方和模型组成。主候选项永远不会被跳过，因此显式选择用户模型时仍会直接显示真实的认证错误。该缓存仅在进程内生效，并会在 Gateway 重启时清除。

该值是以毫秒为单位的 TTL。`0` 或未设置会禁用该缓存。正值会被限制在 1 秒到 10 分钟之间。

## 面向用户的回退通知

当会话切换到自动选择的回退时，OpenClaw 会在同一回复界面发送状态通知：

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

当后续探测成功、会话回到所选主项时，OpenClaw 会发送：

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

这些通知属于运维消息，不是助手内容。它们会在每次状态变更时发送一次，包括在可行时仅有副作用的轮次，但不会对重复的、仅限于单轮内的回退切换重复发送。发送过程会绕过常规的来源回复抑制，不会在线程频道中占用首条助手回复槽位，并且会从文本转语音和承诺提取中排除。

## 认证存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth 令牌都使用**认证配置文件**。

- 密钥和运行时认证路由状态存储在 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` 中。
- 配置中的 `auth.profiles` / `auth.order` 仅用于**元数据和路由**（不包含密钥）。
- 旧版的 `credentials/oauth.json`、`auth-profiles.json`、`auth-state.json` 以及每个代理的 `auth.json` 文件，仅会由 `openclaw doctor --fix` 导入。
  在包含凭据的旧版文件完成迁移之前，受影响的代理将无法通过运行时认证；系统绝不会静默导入或回退到这些文件。

更多详情：[OAuth](/concepts/oauth)

凭据类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（某些提供商还适用 `projectId`/`enterpriseUrl`）
- `type: "token"` → 静态 bearer 风格令牌，可选择设置过期时间；OpenClaw 不会刷新它（用于 `aws-sdk` 和其他凭据链认证模式）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个账户可以共存。

- 默认：`provider:default`（无可用电子邮件地址时）。
- 带电子邮件地址的 OAuth：`provider:<email>`（例如 `openai:user@example.com`）。

配置文件保存在每个 agent 的 `openclaw-agent.sqlite` 身份验证配置文件存储中。

## 轮换顺序

当一个提供方有多个配置文件时，OpenClaw 会按如下顺序选择：

<Steps>
  <Step title="显式配置">
    `auth.order[provider]`（如果已设置）。
  </Step>
  <Step title="已配置的配置文件">
    按 provider 过滤后的 `auth.profiles`。
  </Step>
  <Step title="已存储的配置文件">
    每个 agent 的 SQLite 认证配置文件条目。
  </Step>
</Steps>

如果没有配置显式顺序，OpenClaw 会使用轮询顺序：

- **主键：** 配置文件类型（**OAuth，然后是静态 token，最后是 API key**）。
- **OAuth 的次键：** 当前可用访问令牌的配置文件优先于
  访问令牌已过期的配置文件。已过期的 OAuth 配置文件仍保留资格，
  这样当没有可用的同类配置文件时，运行时可以刷新它们。
- **下一个键：** `usageStats.lastUsed`（在每个类型/状态层级内按最久未使用优先）。
- **冷却/已禁用配置文件** 会被移动到末尾，并按最早过期时间排序。

### 会话粘性（缓存友好）

OpenClaw 会**按会话锁定所选认证配置文件**，以保持提供方缓存处于热状态。它**不会**在每次请求时轮换。锁定的配置文件会被重复使用，直到：

- 会话被重置（`/new` / `reset`）
- 完成一次压缩（压缩计数递增）
- 该配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行的手动选择会为该会话设置一个**用户覆盖**，并且在新会话开始之前不会自动轮换。

<Note>
自动固定的配置文件（由会话路由器选中）被视为一种**偏好**：它们会先被尝试，但在速率限制/超时时，OpenClaw 可能会轮换到另一个配置文件。当原始配置文件再次可用时，新运行可以再次优先使用它，而无需更改所选模型或运行时。用户固定的配置文件会保持锁定到该配置文件；如果它失败且配置了模型回退，OpenClaw 会移动到下一个模型，而不是切换配置文件。
</Note>

### OpenAI Codex 订阅加 API 密钥备用

对于 OpenAI agent 模型，认证和运行时是分开的。`openai/gpt-*` 会继续使用 Codex harness，而认证可以在 Codex 订阅配置文件和 OpenAI API key 备用配置文件之间轮换。

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

对 ChatGPT/Codex OAuth 配置文件和 OpenAI API key 配置文件都使用 `openai:*`。当订阅达到 Codex 使用上限时，OpenClaw 会记录 Codex 提供的确切重置时间，尝试下一个按顺序排列的认证配置文件，并保持运行在 Codex harness 中。一旦重置时间过去，订阅配置文件就会再次具备资格，下一次自动选择可以重新返回它。

仅当你想在该会话中强制使用某个账号/密钥时，才使用用户固定的配置文件。用户固定的配置文件设计上是严格锁定的，不会悄悄切换到另一个配置文件。

## 冷却

当一个配置文件由于认证/速率限制错误（或看起来像速率限制的超时）而失败时，OpenClaw 会将其标记为冷却并移动到下一个配置文件。

<AccordionGroup>
  <Accordion title="什么会进入速率限制 / 超时桶">
    这个速率限制桶比普通的 `429` 更宽泛：它还包括提供方消息，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及周期性使用窗口限制，例如 `weekly limit reached` 或 `monthly limit exhausted`。

    格式/无效请求错误通常是终止性的，因为重试相同的负载会以相同方式失败，因此 OpenClaw 会直接报告这些错误，而不是轮换认证配置文件。已知的重试修复路径可以显式选择加入：例如，Cloud Code Assist 工具调用 ID 验证失败会经过清理，并通过 `allowFormatRetry` 策略重试一次。

    OpenAI 兼容的**由提供方完成的**停止/完成原因，例如 `Unhandled stop reason: error`、`stop reason: error`、`reason: error` 和 `Provider finish_reason: error`，会被分类为 **`server_error`**（类似 HTTP 的状态码 500），而不是超时。它们仍符合故障转移条件，可用于模型/配置文件轮换，但诊断信息会保留提供方的完成原因文本，而不会将面向用户的文案改写为“LLM 请求超时”。传输层形式的完成原因，例如 `Provider finish_reason: abort`、`network_error` 和 `malformed_response`，仍会归入超时/故障转移桶（状态码 408）。

    当来源匹配已知的暂时性模式时，通用服务器文本也可能进入那个超时桶。例如，裸的模型运行时流包装器消息 `An unknown error occurred` 会被视为每个提供方都值得故障转移，因为共享模型运行时在提供方流以 `stopReason: "aborted"` 或 `stopReason: "error"` 结束且没有具体细节时会发出该消息。带有暂时性服务器文本的 JSON `api_error` 负载，例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`，也会被视为值得故障转移的超时。

    仅在提供方上下文确实是 OpenRouter 时，像裸的 `Provider returned error` 这样的 OpenRouter 特定通用上游文本才会被视为超时。像 `LLM request failed with an unknown error.` 这样的通用内部回退文本会保持保守，不会自行触发故障转移。

  </Accordion>
  <Accordion title="SDK 重试后等待上限">
    某些提供方 SDK 可能会在把控制权交还给 OpenClaw 之前，先长时间休眠一个 `Retry-After` 窗口。对于基于 Stainless 的 SDK，例如 Anthropic 和 OpenAI，OpenClaw 默认会将 SDK 内部的 `retry-after-ms` / `retry-after` 等待上限设为 60 秒，并立即呈现更长的可重试响应，以便该故障转移路径可以运行。可使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用该上限；参见[重试行为](/concepts/retry)。
  </Accordion>
  <Accordion title="按模型范围的冷却">
    速率限制冷却也可以按模型范围生效：

    - 当已知失败的模型 ID 时，OpenClaw 会为速率限制失败记录 `cooldownModel`。
    - 当冷却范围限定在不同模型上时，同一提供方上的兄弟模型仍可尝试。
    - 计费/禁用窗口仍会阻止整个配置文件在所有模型上的使用。

  </Accordion>
</AccordionGroup>

常规（非计费、非永久认证）冷却会根据配置文件最近的错误次数进行递增：

- 第 1 次失败：30 秒
- 第 2 次失败：1 分钟
- 第 3 次及以后失败：5 分钟（上限）

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

## 计费禁用

计费/信用失败（例如“积分不足”/“信用余额过低”）会被视为值得故障转移的情况，但它们通常不是瞬时性的。OpenClaw 不会使用短暂冷却，而是将该配置文件标记为 **disabled**（采用更长的退避时间），然后轮换到下一个配置文件/提供商。

<Note>
并非所有看起来像计费问题的响应都是 `402`，也并非所有 HTTP `402` 都会进入这里。即使提供商返回的是 `401` 或 `403`，OpenClaw 也会将明确的计费文本保留在计费通道中，但提供商特定的匹配器仍然只作用于其所属的提供商（例如 OpenRouter `403 Key limit exceeded`）。

与此同时，临时性的 `402` 使用窗口和组织/工作区支出上限错误，如果消息看起来可重试，则会被归类为 `rate_limit`（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow`，或 `organization spending limit exceeded`）。这些情况会走短冷却/故障转移路径，而不是长计费禁用路径。
</Note>

高置信度的永久性认证失败（密钥被撤销/停用、工作区被停用）也会进入类似的禁用通道，但恢复会快得多，因为某些提供商在故障期间会短暂返回看起来像认证错误的载荷。

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

过载和速率限制错误的处理比计费冷却更激进：默认情况下，OpenClaw 允许同一提供商的 auth-profile 重试一次，然后在不等待的情况下切换到下一个已配置的模型回退。

## 模型回退

如果某个提供方的所有配置文件都失败了，OpenClaw 会切换到 `agents.defaults.model.fallbacks` 中的下一个模型。这适用于认证失败、速率限制以及耗尽配置文件轮换后的超时（其他错误不会推进回退）。没有暴露足够细节的提供商错误在回退状态中仍会被精确标记：`empty_response` 表示提供商没有返回可用消息或状态，`no_error_details` 表示提供商明确返回了 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始预览，但当前还没有分类器匹配到它。

提供商繁忙信号，例如 `ModelNotReadyException`，会落入过载桶，并遵循与速率限制相同的“轮换一次后再回退”策略（参见上面的默认表）。

如果整个候选链只因过载失败而耗尽，回复运行器会在同一轮次中最多重试该链 10 次。只有在工具执行或助手输出开始之前才允许整轮重试，以避免在过载出现在可观察工作之后时产生重复的修改或消息。退避从 2.5 秒开始，并指数翻倍，最高封顶 30 秒。一旦该轮次已经等待了 30 秒，OpenClaw 会发送一条一次性的临时状态通知：`AI 服务暂时过载。我仍在重试；这可能需要几分钟。` 重试以及任何回退胜出项都只对当前轮次生效；普通的瞬时服务器错误仍保留其单次重试策略。

当一次运行从已配置的默认主项、cron 作业主项、带有显式回退的代理主项，或自动选择的回退覆盖开始时，OpenClaw 可以沿着匹配的已配置回退链向下遍历。没有显式回退的代理主项以及显式的用户选择（例如 `/model ollama/qwen3.5:27b`、模型选择器、`sessions.patch`，或一次性的 CLI 提供方/模型覆盖）是严格的：如果该提供方/模型不可达，或者在生成回复之前失败，OpenClaw 会报告失败，而不是从无关的回退中回答。

### 候选链规则

OpenClaw 会根据当前请求的 `provider/model` 以及已配置的回退构建候选列表。

<AccordionGroup>
  <Accordion title="规则">
    - 请求的模型始终排在第一位。
    - 显式配置的回退会去重，但不会按模型允许列表过滤。它们被视为明确的操作员意图。
    - 如果当前运行已经在同一提供商家族中的某个已配置回退上，OpenClaw 会继续使用完整的已配置链。
    - 当未提供显式回退覆盖时，即使请求的模型使用的是不同提供商，已配置的回退也会在已配置主项之前尝试。
    - 当回退运行器未收到显式回退覆盖时，已配置主项会被追加到末尾，这样在更早的候选项耗尽后，链可以回到正常默认项。
    - 当调用方提供 `fallbacksOverride` 时，运行器会精确使用请求的模型加上该覆盖列表。空列表会禁用模型回退，并阻止将已配置主项作为隐藏重试目标追加。

  </Accordion>
</AccordionGroup>

### 哪些错误会推进回退

<Tabs>
  <Tab title="继续执行">
    - 认证失败
    - 速率限制和冷却耗尽
    - 过载/提供商繁忙错误
    - 超时形态的故障转移错误
    - 计费禁用
    - `LiveSessionModelSwitchError`，它会被规范化为故障转移路径，这样过时的持久化模型就不会创建外层重试循环
    - 当仍有剩余候选项时，其他无法识别的错误

  </Tab>
  <Tab title="不继续执行">
    - 非超时/非故障转移形态的显式中止
    - 应留在压缩/重试逻辑内部的上下文溢出错误（例如 `request_too_large`、`input token count exceeds the maximum number of input tokens`、`input exceeds the maximum number of tokens`、`input too long for the model` 或 `ollama error: context length exceeded`）
    - 当没有剩余候选项时出现的最终未知错误
    - Claude Fable 5 的安全拒绝；直接 API 密钥请求会在提供商层面通过 Anthropic 的服务端回退到 `claude-opus-4-8` 来处理这些情况（参见 [Anthropic](/providers/anthropic#safety-refusal-fallback-claude-fable-5)）

  </Tab>
</Tabs>

### 冷却跳过 vs 探测行为

当某个提供方的所有认证配置文件都已经处于冷却中时，OpenClaw 不会自动永远跳过该提供方。它会按每个候选项做决策：

<AccordionGroup>
  <Accordion title="逐候选项决策">
    - 持久性认证失败会立即跳过整个提供商。
    - 计费禁用通常会跳过，但主候选项仍可能在节流条件下被探测，以便无需重启也能恢复。
    - 主候选项可能会在接近冷却到期时被探测，并带有按提供商节流。
    - 即使处于冷却中，只要失败看起来是瞬时性的（`rate_limit`、`overloaded` 或未知），仍可尝试同提供商的回退兄弟项。这在速率限制是模型范围、而兄弟模型可能仍可立即恢复时尤其相关。
    - 瞬时冷却探测在每次回退运行中每个提供商最多一次，以免单个提供商拖慢跨提供商回退。

  </Accordion>
</AccordionGroup>

## 会话覆盖与实时模型切换

会话模型变更属于共享状态。活动运行器、`/model` 命令、压缩/会话更新，以及实时会话协调都会读取或写入同一会话条目的部分内容。回退执行不会写入模型选择字段，因此在重试时无法替换更新的手动选择。

实时模型切换遵循以下规则：

- 只有用户显式驱动的模型变更才会标记待处理的实时切换。其中包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 由系统驱动的模型变更，例如回退轮换、心跳覆盖或压缩，绝不会自行标记待处理的实时切换。
- 用户驱动的模型覆盖会被视为回退策略的精确选择，因此不可达的已选提供方会直接表现为失败，而不会被 `agents.defaults.model.fallbacks` 掩盖。
- 运行时回退候选仍然局限于当前轮次。下一轮会从当前所选模型开始，包括上一轮运行期间到达的手动选择。
- 先前存储的自动回退覆盖仍受支持：OpenClaw 会定期探测其配置的来源，并在恢复后清除该覆盖；`/new`、`/reset` 和 `sessions.reset` 会立即清除自动来源的覆盖。
- 用户回复会在每次状态变更时通报回退转换和回退清除后的恢复。同一已选/活动配对的重复轮次不会重复该通知。
- `/status` 会显示所选模型，以及在回退状态不同时，显示活动的回退模型和原因。
- 实时会话协调优先使用持久化的会话覆盖，而不是过时的运行时模型字段。
- 如果实时切换错误指向当前回退链中的更后一个候选，OpenClaw 会直接跳转到该所选模型，而不是先遍历无关候选。

活动运行会直接携带其选定的候选。实时协调仅在存在显式待处理的用户切换时才改变该候选，因此不需要临时回退覆盖或回滚。

## 可观测性与失败摘要

`runWithModelFallback(...)` 会记录每次尝试的详细信息，这些信息会显示在日志和面向用户的冷却提示中：

- 正在尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及类似的回退原因）
- 可选的状态码/代码
- 人类可读的错误摘要

结构化的 `model_fallback_decision` 日志还会在候选项失败、被跳过或后续回退成功时包含扁平化的 `fallbackStep*` 字段。这些字段会明确记录尝试过的转换（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），因此即使最终回退也失败，日志和诊断导出器仍然可以重建主要失败信息。

当所有候选项都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外层回复运行器可以利用它构建更具体的消息，例如“所有模型当前都受到速率限制”，并在已知的情况下包含最早的冷却到期时间。

此冷却摘要会感知模型：

- 与尝试中的提供商/模型链无关的模型范围速率限制会被忽略
- 如果剩余阻止因素是匹配的模型范围速率限制，OpenClaw 会报告仍在阻止该模型的最后一个匹配到期时间

## 相关配置

有关以下内容，请参见[网关配置](/gateway/configuration)：

- `auth.profiles` / `auth.order`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

有关更广泛的模型选择和回退概览，请参见[模型](/concepts/models)。
