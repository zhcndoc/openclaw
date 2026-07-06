---
summary: "使用情况跟踪界面和凭据要求"
read_when:
  - 当你正在接入提供方使用量/配额界面时
  - 你需要解释使用情况跟踪行为或认证要求时
title: "使用情况跟踪"
---

## 它是什么

- 直接从每个提供方的使用情况端点拉取提供方使用量/配额。没有估算成本；只显示提供方报告的配额窗口、余额或账户状态摘要。
- 可读的配额窗口输出会规范化为 `X% left`，即使提供方报告的是已消耗配额、剩余配额或原始计数。对于没有可重置配额窗口的提供方，则改为显示提供方摘要文本（例如余额）。
- 会话级 `/status` 和 `session_status` 工具在实时会话快照缺少 token/模型数据时，会回退到会话的转录日志。该回退会补全缺失的 token/cache 计数，可恢复当前运行时模型标签，并在会话元数据缺失或更小时优先采用更大的、面向提示词的总量（`totalTokensFresh !== true`、为 0，或低于转录派生值）。非零的实时值始终优先于回退值。

## 显示位置

- 在聊天中使用 `/status`：显示包含会话令牌和估算费用的状态卡片（仅限 API key 模型）。当可用时，提供商使用情况会针对**当前模型提供商**显示为归一化的 `X% left` 窗口或提供商摘要文本。
- 在聊天中使用 `/usage off|tokens|full`：每次响应的使用情况页脚。
- 在聊天中使用 `/usage cost`：基于 OpenClaw 会话日志汇总的本地费用摘要。
- CLI：`openclaw status --usage` 会打印完整的按提供商使用情况/配额明细。
- CLI：`openclaw models status` 会列出 OAuth/令牌认证配置，并在每个具有使用窗口的提供商旁显示该摘要。
- macOS 菜单栏：当可用提供商使用情况快照时，Context 下方会出现一个根级 “Usage” 部分。参见 [菜单栏](/platforms/mac/menu-bar)。

`openclaw channels list` 不再打印提供商使用情况；它会改为引导用户使用 `openclaw status` 或 `openclaw models list`。

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
    "default": [
      /* 片段 */
    ], // 任何 surface 的回退
    "surfaces": {
      "discord": [
        /* 片段 */
      ],
      "telegram": [
        /* 片段 */
      ],
    },
  },
}
```

每个 surface 都是按顺序排列的 **片段** 列表；引擎会渲染每个片段，丢弃
空值，并使用 `sep` 连接保留下来的结果。若某个 surface 没有条目，则使用
`output.default`。

### 合约路径

一个片段通过点路径从每轮合约中读取值。缺失值会被视为空（因此 `when` 守卫或 `|fallback` 可以让片段保持干净）。

| Path                                                                                | Meaning                                                                                              |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `surface`                                                                           | channel id (`discord`/`telegram`/etc.)                                                               |
| `agentId` / `chat_type`                                                             | owning agent id / chat surface kind                                                                  |
| `model.id` / `model.display_name` / `model.provider`                                | model id / display name / provider id                                                                |
| `model.actual`, `model.resolved_ref`                                                | provider/model ref actually used for the turn                                                        |
| `model.requested`                                                                   | provider/model ref requested (before fallback)                                                       |
| `model.reasoning`                                                                   | effort (`off` through `xhigh`)                                                                       |
| `model.is_fallback` / `model.is_override`                                           | bool: fallback used / model pinned                                                                   |
| `model.override_source` / `model.auth_mode`                                         | override source label / credential mode (`oauth`, `api-key`, `token`, `mixed`, `aws-sdk`, `unknown`) |
| `state.fast_mode`                                                                   | bool: fast vs slow                                                                                   |
| `state.compactions`                                                                 | compaction count for the session                                                                     |
| `context.max_tokens` / `context.used_tokens` / `context.pct_used`                   | window budget / occupied tokens / 0-100 used                                                         |
| `usage.input_tokens` / `usage.output_tokens` / `usage.total_tokens`                 | turn aggregate                                                                                       |
| `usage.cache_read_tokens` / `usage.cache_write_tokens`                              | cache-read and cache-write tokens for the turn                                                       |
| `usage.has_tokens` / `usage.has_split_tokens` / `usage.has_total_only_tokens`       | token display guards                                                                                 |
| `usage.cache_hit_pct`                                                               | cache-read share of total prompt tokens                                                              |
| `usage.last.input_tokens` / `usage.last.output_tokens` / `usage.last.cache_hit_pct` | final model call only (also has `cache_read_tokens`, `cache_write_tokens`, `total_tokens`)           |
| `cost.turn_usd` / `cost.available`                                                  | estimated turn cost / whether a cost table resolved                                                  |
| `timing.duration_ms`                                                                | wall-clock turn duration                                                                             |
| `identity.name` / `identity.emoji` / `identity.avatar`                              | agent identity name / emoji / avatar                                                                 |
| `session.id`                                                                        | session id                                                                                           |

(Provider rate-limit windows are **not** in this contract; there is no array-valued path today, so an `each` piece has nothing to iterate.)

### 动词

将一个值通过多个动词从左到右处理；非动词片段作为回退值。

| 动词            | 效果                                | 示例                           |
| --------------- | ------------------------------------- | --------------------------------- |
| `num`           | 紧凑计数                         | `272000 -> 272k`                  |
| `fixed:N`       | N 位小数（默认 2）                | `0.0377`                          |
| `dur`           | 秒数转时长                   | `14820 -> 4h07m`                  |
| `pct`           | 追加 `%`                            | `96 -> 96%`                       |
| `inv`           | `100 - x`                             | 用于从已用转换为剩余             |
| `alias:TABLE`   | 在 `aliases` 中查找，未列出则原样输出 | `medium -> 🌗`                    |
| `meter:W:SCALE` | 基于 0-100 值的 W 格字形条   | `[⣿⣿⠐⠐⠐]`（`meter:1` = 一个字形） |

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

当无法解析出可用的提供方使用权限凭据时，使用情况会被隐藏。各提供方
会提供各自的使用量获取逻辑；当该逻辑不可用时，OpenClaw 会回退到
从认证配置文件、环境变量或配置中匹配 OAuth/API 密钥凭据。

- **Anthropic (Claude)**：认证配置文件中的 OAuth 令牌。如果 OAuth 令牌缺少
  `user:profile` 作用域，则在设置了相应值时回退到 `claude.ai` 网页会话（`CLAUDE_AI_SESSION_KEY`、
  `CLAUDE_WEB_SESSION_KEY`，或 `CLAUDE_WEB_COOKIE` 中的 `sessionKey=` cookie）。
- **ClawRouter**：API 密钥（`CLAWROUTER_API_KEY`）。在配置了预算时显示
  月度预算窗口，否则显示请求/令牌/成本摘要。
- **DeepSeek**：通过 env/config/auth store 提供的 API 密钥（`DEEPSEEK_API_KEY`）。
  显示提供方报告的账户余额文本，而不是剩余百分比
  配额窗口。
- **GitHub Copilot**：认证配置文件中的 OAuth 令牌。
- **Gemini CLI**：认证配置文件中的 OAuth 令牌。
- **MiniMax**：API 密钥或 MiniMax OAuth 认证配置文件。OpenClaw 将
  `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额
  面，当存在已保存的 MiniMax OAuth 时优先使用，否则回退到
  `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  使用轮询会在已配置时从 `models.providers.minimax-portal.baseUrl`
  或 `models.providers.minimax.baseUrl` 推导 Coding Plan 主机，否则使用
  MiniMax CN 主机。
  MiniMax 原始的 `usage_percent` / `usagePercent` 字段表示的是**剩余**
  配额，因此 OpenClaw 会在显示前将其取反；如果存在基于数量的字段则优先使用。
  - 窗口标签优先来自提供方的小时/分钟字段，其次
    回退到 `start_time` / `end_time` 区间。
  - 如果 coding-plan 端点返回 `model_remains`，OpenClaw 会优先选择
    聊天模型条目；当显式的 `window_hours` / `window_minutes` 字段缺失时，会从时间戳推导
    窗口标签，并在计划标签中包含模型
    名称。
- **OpenAI (Codex/ChatGPT plan)**：认证配置文件中的 OAuth 令牌（在存在账号 id 时发送 `ChatGPT-Account-Id`
  请求头）。仅使用 API 密钥的 OpenAI 使用情况不跟踪。
- **Xiaomi MiMo**：两个独立的使用量面。按量付费使用 API 密钥
  （`XIAOMI_API_KEY`）；Token Plan 使用单独的密钥
  （`XIAOMI_TOKEN_PLAN_API_KEY`）。目前两者都不报告配额窗口。
- **z.ai**：通过 env/config/auth store 提供的 API 密钥（`ZAI_API_KEY` 或 `Z_AI_API_KEY`）。

## 相关内容

- [Token 使用和成本](/reference/token-use)
- [API 使用和成本](/reference/api-usage-costs)
- [提示缓存](/reference/prompt-caching)
- [菜单栏](/platforms/mac/menu-bar)
