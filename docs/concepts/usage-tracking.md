---
summary: "使用情况跟踪界面和凭据要求"
read_when:
  - 当你正在接入提供方使用量/配额界面时
  - 你需要解释使用情况跟踪行为或认证要求时
title: "使用情况跟踪"
---

## 它是什么

- 直接从每个提供商的使用量端点拉取提供商的使用量/配额。没有估算的提供商计费；仅包含提供商报告的计划名称、配额窗口、余额、支出、预算、每日成本历史、token/模型归因或账户状态摘要。
- 人类可读的配额窗口输出会规范化为 `X% left`，即使提供商报告的是已使用配额、剩余配额或仅原始计数。没有可重置配额窗口的提供商则改为显示提供商摘要文本（例如余额）。
- 会话级 `/status` 和 `session_status` 工具在实时会话快照缺少 token/模型数据时，会回退到该会话的转录日志。该回退会补全缺失的 token/cache 计数，可以恢复当前运行时模型标签，并且在会话元数据缺失或更小时优先采用更大的、以 prompt 为导向的总数（`totalTokensFresh !== true`、为 0，或低于转录派生值）。任何非零的实时值都会优先于回退值。

## 显示位置

- `/status` 在聊天中：状态卡片，显示会话 token 和预估成本（仅适用于 API key 模型）。在可用时，提供商使用情况会显示为**当前模型提供商**的规范化 `X% left` 窗口或提供商摘要文本。
- `/usage off|tokens|full` 在聊天中：每条回复的使用情况页脚。
- `/usage cost` 在聊天中：从 OpenClaw 会话日志汇总的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的按提供商使用量/配额明细。
- CLI：`openclaw models status` 列出 OAuth/token 认证配置文件，并在每个有使用窗口的提供商旁显示其摘要。
- Control UI：**Usage** 在 OpenClaw 基于会话的 token 和预估成本分析上方显示提供商套餐和账单卡片。Anthropic 和 OpenAI Admin API 凭据会额外添加提供商报告的今日、7 天和 30 天支出、每日趋势、token 总数、热门模型和成本分类。
- Control UI：聊天撰写器的 context ring 弹出层会为订阅型提供商显示**套餐使用情况**——按窗口的进度条（5 小时、每周、按模型范围）及其重置时间、已知时的提供商套餐（例如 `Max (20x)`），以及额外使用积分。通过套餐计费的会话会隐藏按 token 计算的美元预估；按 API 计费的会话会保留 `Est. cost` 和按费用类型划分的明细。Claude Code CLI（`claude-cli`）设置会复用相同的 Anthropic 订阅使用情况。
- macOS 菜单栏：当可用提供商使用快照时，Context 下方会显示一个根级 "Usage" 区域。参见 [Menu bar](/platforms/mac/menu-bar)。

`openclaw channels list` 不再打印提供商使用情况；它会改为引导用户使用 `openclaw status` 或 `openclaw models list`。

## Anthropic 和 OpenAI 成本历史

订阅配额和 API 计费是不同的提供方界面：

- Anthropic 订阅/设置凭据会继续显示 Claude 配额窗口和可选的额外使用预算。设置 `ANTHROPIC_ADMIN_KEY` 或 `ANTHROPIC_ADMIN_API_KEY` 可改为显示组织的 Usage 和 Cost API 历史。以 `sk-ant-admin` 开头的 Anthropic 提供方凭据会被自动检测到。
- OpenAI ChatGPT/Codex OAuth 会继续显示套餐、配额窗口和信用余额。设置 `OPENAI_ADMIN_KEY` 可改为显示组织的成本和 completions 使用历史；也可以选择设置 `OPENAI_PROJECT_ID` 将其限定到某个项目。OpenClaw 绝不会将来自 `OPENAI_API_KEY`、提供方配置或认证配置文件的推理凭据发送到组织 API，因为这些密钥可能属于自定义端点。

管理员凭据优先，因为它们提供了真实的组织计费数据。OpenClaw 不会将这些由提供方报告的总计与其本地会话估算合并；这两个部分是有意回答不同问题的。

## 默认使用量页脚模式

`/usage off|tokens|full` 为某个会话设置页脚，并会在该会话期间记住。`messages.responseUsage` 会为尚未选择该模式的会话设定初始值，因此页脚可以默认开启，而无需每次都输入 `/usage`。

为每个频道设置一种模式，或者使用带有 `default` 回退值的按频道映射：

```jsonc
{
  "messages": {
    "responseUsage": "tokens",
    // 或：{ "default": "off", "discord": "full" }
  },
}
```

可接受的值：`"off"`、`"tokens"`、`"full"`，以及旧版别名 `"on"`（按 `"tokens"` 处理）。

### 三种不同的会话状态

会话的 `responseUsage` 字段有三种可表示的状态，每种状态的语义不同：

| 状态                | 存储值                           | 实际模式                                                              |
| ------------------- | -------------------------------- | --------------------------------------------------------------------- |
| **未设置 / 继承**    | `undefined`（不存在）            | 先回退到 `messages.responseUsage` 配置默认值，再回退到 `off`。         |
| **显式关闭**         | `"off"`（已存储）                | 始终关闭；非 off 的配置默认值不能重新启用页脚。                         |
| **显式开启**         | `"tokens"` 或 `"full"`（已存储） | 该模式，不受配置默认值影响。                                           |

### 优先级

实际模式 = 会话覆盖 → 频道配置项 → `default` → `off`。

显式的 `/usage off` 会作为字面值 `"off"` **持久化** 到会话中，这与“未设置”不同。即使 `messages.responseUsage`
默认值不是 off，在用户明确禁用后，也不能把页脚重新打开。

### 重置 vs. 关闭

- `/usage off` 会强制关闭页脚并持久化该选择。已配置的非 off 默认值无法覆盖它。
- `/usage reset`（别名：`default`、`inherit`、`inherited`、`clear`、`unpin`）会清除会话覆盖。随后会话会**继承**配置默认值（`messages.responseUsage`）对应的实际模式。如果没有配置默认值，页脚仍保持关闭。
- 完整会话重置（`/reset` 或 `/new`）或会话轮换会**保留**显式的使用量模式偏好，这样用户的显示选择就能在会话轮换后继续保留。只有 `/usage reset`（及其别名）会清除该覆盖。

### 切换行为

不带参数的 `/usage` 会循环切换：off → tokens → full → off。循环的起点是**当前实际**模式（当未设置时，会从会话覆盖回退到配置默认值），因此循环始终与用户当前在页脚中看到的内容一致。

### 配置

在没有配置时，行为保持不变（在 `/usage` 之前页脚为 off）。使用 `/usage reset` 可清除会话覆盖，并重新继承已配置的默认值。

## 自定义 `/usage full` 页脚

`/usage tokens` 始终渲染为纯粹的 `Usage: X in / Y out` 行（如果可用，还会附加 cache 和
estimated-cost 后缀）。只有 `/usage full` 会渲染下面描述的更丰富的
页脚。

`/usage full` 会显示一个内置的紧凑页脚，在这些字段可用时包含模型、reasoning、fast/slow、
context window 和 cost。内置页脚不需要模板文件。

`messages.usageTemplate` 仅用于高级自定义布局。其值可以是一个
JSON 文件路径（支持 `~`）或一个内联对象；当其有效时，会替换内置
页脚。文件路径会被监视，并在变更时实时重新加载。

```json
{
  "messages": {
    "usageTemplate": "~/.openclaw/usage-footer.json"
  }
}
```

缺失或空模板会静默回退到内置页脚。不可读或无效的已配置模板（错误的 JSON，或结构中没有可渲染输出
片段）也会回退到内置页脚，并发出运维警告。

请先从内置结构开始自定义模板，再编辑你想要
修改的部分：

```jsonc
{
  "schema": "openclaw.usageBar.v1",
  "scales": {
    "braille": "⠐⡀⡄⡆⡇⣇⣧⣷⣿",
    "block": "░▏▎▍▌▋▊▉█",
    "shade": "░▒▓█",
    "moon": "🌑🌘🌗🌖🌕",
    "level": "▁▂▃▄▅▆▇█",
    "weather": ["🥶", "☁️", "🌥", "⛅️", "🌤", "☀️"],
    "plants": ["🪾", "🍂", "🌱", "☘️", "🍀", "🌿"],
    "moons6": ["🌑", "🌚", "🌘", "🌗", "🌖", "🌝"],
  },
  "aliases": {
    "models": {
      "claude-opus-4-6": "opus46",
      "claude-opus-4-8": "opus48",
      "claude-sonnet-4-6": "sonnet46",
      "claude-haiku-4-5": "haiku45",
      "gpt-5.5": "gpt5.5",
    },
    "reasoning": {
      "off": "🌑",
      "minimal": "🌚",
      "low": "🌘",
      "medium": "🌗",
      "high": "🌕",
      "xhigh": "🌝",
    },
  },
  "output": {
    "sep": "",
    "default": [
      { "text": "{model.provider}{identity.emoji|🤖}{model.display_name|alias:models}" },
      { "map": "model.is_fallback", "cases": { "true": "🔄" } },
      { "map": "model.is_override", "cases": { "true": "📌" } },
      { "when": "model.reasoning", "text": "{model.reasoning|alias:reasoning}" },
      { "map": "state.fast_mode", "cases": { "true": "⚡️", "false": "🐌" } },
      {
        "when": "context.max_tokens",
        "text": " | 📚[{context.pct_used|meter:5:braille}]{context.max_tokens|num}",
      },
      { "when": "cost.turn_usd", "text": " 💰{cost.turn_usd|fixed:4}" },
    ],
    "surfaces": {
      "discord": [
        { "text": "-# -\n" },
        { "text": "-# {model.provider}{identity.emoji|🤖}{model.display_name|alias:models}" },
        { "map": "model.is_fallback", "cases": { "true": "🔄" } },
        { "map": "model.is_override", "cases": { "true": "📌" } },
        { "when": "model.reasoning", "text": "{model.reasoning|alias:reasoning}" },
        { "map": "state.fast_mode", "cases": { "true": "⚡️", "false": "🐌" } },
        {
          "when": "context.max_tokens",
          "text": " | 📚[{context.pct_used|meter:5:braille}]{context.max_tokens|num}",
        },
        { "when": "cost.turn_usd", "text": " 💰{cost.turn_usd|fixed:4}" },
      ],
    },
  },
}
```

### 结构

```jsonc
{
  "schema": "openclaw.usageBar.v1",
  "scales": { "<name>": "从低到高的字形" }, // 字符串（1 个字形/字符）或数组
  "aliases": { "<table>": { "<value>": "<标签>" } },
  "output": {
    "sep": "", // 连接保留下来的片段
    "default": [/* 片段 */], // 任意 surface 的回退
    "surfaces": {
      "discord": [/* 片段 */],
      "telegram": [/* 片段 */],
    },
  },
}
```

每个 surface 都是按顺序排列的 **片段** 列表；引擎会渲染每个片段，丢弃
空值，并使用 `sep` 连接保留下来的结果。若某个 surface 没有条目，则使用
`output.default`。

### 合约路径

一个片段通过点路径从每轮合约中读取值。缺失值会被视为空（因此 `when` 守卫或 `|fallback` 可以让片段保持干净）。

| Path                                                                                | 含义                                                                                               |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `surface`                                                                           | channel id (`discord`/`telegram`/etc.)                                                              |
| `agentId` / `chat_type`                                                             | owning agent id / chat surface kind                                                                 |
| `model.id` / `model.display_name` / `model.provider`                                | model id / display name / provider id                                                               |
| `model.actual`, `model.resolved_ref`                                                | 此轮实际使用的 provider/model ref                                                                  |
| `model.requested`                                                                   | 请求的 provider/model ref（回退前）                                                                |
| `model.reasoning`                                                                   | effort (`off` through `xhigh`)                                                                      |
| `model.is_fallback` / `model.is_override`                                           | bool: 是否使用了回退 / 是否锁定了模型                                                               |
| `model.override_source` / `model.auth_mode`                                         | override source label / credential mode (`oauth`, `api-key`, `token`, `mixed`, `aws-sdk`, `unknown`) |
| `state.fast_mode`                                                                   | bool: fast vs slow                                                                                  |
| `state.compactions`                                                                 | 本次会话的压缩次数                                                                                  |
| `context.max_tokens` / `context.used_tokens` / `context.pct_used`                   | 窗口预算 / 已占用 token / 已用 0-100                                                                |
| `usage.input_tokens` / `usage.output_tokens` / `usage.total_tokens`                 | 本轮汇总                                                                                            |
| `usage.cache_read_tokens` / `usage.cache_write_tokens`                              | 本轮的 cache-read 和 cache-write tokens                                                            |
| `usage.has_tokens` / `usage.has_split_tokens` / `usage.has_total_only_tokens`       | token 显示守卫                                                                                      |
| `usage.cache_hit_pct`                                                               | cache-read 占总 prompt tokens 的比例                                                                |
| `usage.last.input_tokens` / `usage.last.output_tokens` / `usage.last.cache_hit_pct` | 仅最终模型调用（也包含 `cache_read_tokens`, `cache_write_tokens`, `total_tokens`）                  |
| `cost.turn_usd` / `cost.available`                                                  | 估算的本轮成本 / 是否解析到了成本表                                                                 |
| `timing.duration_ms`                                                                | 墙钟时间轮次持续时长                                                                                |
| `identity.name` / `identity.emoji` / `identity.avatar`                              | agent 身份名称 / emoji / 头像                                                                       |
| `session.id`                                                                        | 会话 id                                                                                             |

(Provider rate-limit windows are **not** in this contract; there is no array-valued path today, so an `each` piece has nothing to iterate.)

### 动词

将一个值通过多个动词从左到右处理；非动词片段作为回退值。

| 动词            | 效果                                | 示例                           |
| --------------- | ------------------------------------- | --------------------------------- |
| `num`           | 紧凑计数                         | `272000 -> 272k`                  |
| `fixed:N`       | N 位小数 (`0..100`，默认 2)      | `0.0377`                          |
| `dur`           | 秒数转持续时间                   | `14820 -> 4h07m`                  |
| `pct`           | 追加 `%`                            | `96 -> 96%`                       |
| `inv`           | `100 - x`                             | 用于从已使用量得到剩余量             |
| `alias:TABLE`   | 在 `aliases` 中查找，未列出则原样输出 | `medium -> 🌗`                    |
| `meter:W:SCALE` | 基于 0-100 值的 W 单元字形条   | `[⣿⣿⠐⠐⠐]`（`meter:1` = 一个字形） |

`fixed:N` 仅接受 0 到 100 之间的完整十进制整数。无效的
精度参数会使该插值结果为空。

`meter:W:SCALE` 仅接受 1 到 100 之间的完整十进制整数宽度。留空宽度可使用默认值 5（`meter::braille`）；无效
宽度会使该插值结果为空。

### 片段形式

- `{ "text": "📚 {context.max_tokens|num}" }`: 字面量 + 插值。
- `{ "when": "<path>", "text": "..." }`: 仅当路径为真值时渲染。
- `{ "map": "<path>", "cases": { "true": "⚡", "false": "🐌" } }`: 值到字形的映射（`_default` 分支覆盖未匹配的值）。
- `{ "each": "<array-path>", "item": "{label}" }`: 迭代数组值路径（当前合约路径中没有数组）。

### 示例

```jsonc
{
  "schema": "openclaw.usageBar.v1",
  "scales": { "braille": "⠐⡀⡄⡆⡇⣇⣧⣷⣿" },
  "aliases": { "reasoning": { "medium": "🌗", "high": "🌕" } },
  "output": {
    "surfaces": {
      "discord": [
        { "text": "{model.display_name}" },
        { "when": "model.reasoning", "text": " {model.reasoning|alias:reasoning}" },
        { "map": "state.fast_mode", "cases": { "true": " ⚡", "false": " 🐌" } },
        {
          "when": "context.max_tokens",
          "text": " | 📚 [{context.pct_used|meter:5:braille}]{context.max_tokens|num}",
        },
      ],
    },
  },
}
```

例如渲染为 `claude-sonnet-4-6 🌗 🐌 | 📚 [⣿⣿⣿⣿⣧]272k`。

## 提供方 + 凭据

当没有可用的提供方使用情况认证可解析时，Usage 会被隐藏。OpenClaw 会自动发现声明了 `contracts.usageProviders` 并实现了 `resolveUsageAuth` 和 `fetchUsageSnapshot` 的已启用提供方插件；不存在单独的核心提供方允许列表。静态契约通过作用域化发现来避免导入每个提供方插件。每个插件都负责自己的上游端点和响应映射。共享快照将计划名称、配额窗口、余额、支出和预算保持为与提供方无关的形式，供 CLI、应用和 Control UI 消费者使用。

- **Anthropic（Claude）**：认证配置文件中的 OAuth token。如果 OAuth token 缺少 `user:profile` scope，则在已设置时回退到 `claude.ai` 网页会话（`CLAUDE_AI_SESSION_KEY`、`CLAUDE_WEB_SESSION_KEY`，或 `CLAUDE_WEB_COOKIE` 中的 `sessionKey=` cookie）。当 Anthropic 报告模型范围限制以及已启用的额外使用月度支出/预算时，也会包含这些信息。显式的 Anthropic Admin API key，或自动检测到的 `sk-ant-admin...` 提供方配置文件，则会改为显示 30 天组织成本和 Messages API 历史。
- **ClawRouter**：API key（`CLAWROUTER_API_KEY`）。配置后显示月度预算窗口和类型化的 USD 预算；否则显示汇总支出以及请求/令牌/成本摘要。
- **DeepSeek**：通过 env/config/auth store 的 API key（`DEEPSEEK_API_KEY`）。显示每个提供方报告的货币余额。
- **GitHub Copilot**：认证配置文件中的 OAuth token。
- **Gemini CLI**：认证配置文件中的 OAuth token。
- **MiniMax**：API key 或 MiniMax OAuth 认证配置文件。OpenClaw 将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额表面，优先使用已存储的 MiniMax OAuth（如果存在），否则回退到 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。使用情况轮询会在已配置时从 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 推导 Coding Plan 主机，否则使用 MiniMax CN 主机。  
  MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示**剩余**配额，因此 OpenClaw 会在显示前将其取反；如果存在按数量计的字段，则以这些字段为准。  
  - 窗口标签优先来自提供方的小时/分钟字段，其次回退到 `start_time` / `end_time` 区间。  
  - 如果 coding-plan 端点返回 `model_remains`，OpenClaw 会优先使用聊天模型条目，在缺少显式 `window_hours` / `window_minutes` 字段时从时间戳推导窗口标签，并在计划标签中包含模型名称。
- **OpenAI（Codex/ChatGPT 计划）**：认证配置文件中的 OAuth token（当存在 account id 时会发送 `ChatGPT-Account-Id` 标头）。显示 ChatGPT 计划、可重置的 Codex 窗口，以及在有报告时的信用余额。信用仍然是提供方信用；OpenClaw 不会将其标为美元。`OPENAI_ADMIN_KEY` 在该密钥具有 Usage Dashboard 访问权限时，会增加 30 天组织成本和 completions 使用历史。推理凭据绝不会转发到组织 API。
- **OpenRouter**：API key 或基于 OAuth 的 API key（`OPENROUTER_API_KEY` 或认证配置文件）。结合账户 credits 端点与 key 配额端点，因此当凭据可访问时，会显示账户余额/支出、key 预算以及每日/每周/月度使用情况。任一端点都可以独立丰富快照。
- **Venice**：通过 env/config/auth store 的 API key（`VENICE_API_KEY`）。显示 USD 和 DIEM 余额，以及在有报告时的 DIEM epoch 分配使用情况。
- **Xiaomi MiMo**：两个独立的使用情况表面。按量付费使用 API key（`XIAOMI_API_KEY`）；Token Plan 使用单独的 key（`XIAOMI_TOKEN_PLAN_API_KEY`）。目前两者都不报告配额窗口。
- **z.ai**：通过 env/config/auth store 的 API key（`ZAI_API_KEY` 或 `Z_AI_API_KEY`）。

## 相关内容

- [Token 使用和成本](/reference/token-use)
- [API 使用和成本](/reference/api-usage-costs)
- [提示缓存](/reference/prompt-caching)
- [菜单栏](/platforms/mac/menu-bar)
