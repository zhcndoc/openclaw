---
summary: "使用情况跟踪界面和凭据要求"
read_when:
  - 当你正在接入提供方使用量/配额界面时
  - 你需要解释使用情况跟踪行为或认证要求时
title: "使用情况跟踪"
---

## 它是什么

- 直接从提供方的使用量端点拉取使用量/配额。
- 不估算成本；只显示提供方报告的配额窗口或账户状态摘要。
- 面向人类可读的配额窗口状态输出会标准化为 `X% left`，即使上游 API 报告的是已用配额、剩余配额或仅原始计数。没有可重置配额窗口的提供方可以改为显示提供方摘要文本，例如余额。
- 会话级 `/status` 和 `session_status` 在实时会话快照信息稀疏时，可以回退到最新的 transcript 使用量条目。该回退会补全缺失的 token/cache 计数，能够恢复当前运行时模型标签，并且在会话元数据缺失或更小时，优先采用更大的面向 prompt 的总数。现有的非零实时值仍然优先。

## 显示位置

- 聊天中的 `/status`：带表情的状态卡，显示会话 token + 估算成本（仅 API key）。当可用时，提供方使用量会显示为当前模型提供方的标准化 `X% left` 窗口或提供方摘要文本。
- 聊天中的 `/usage off|tokens|full`：每条响应的使用量页脚（OAuth 仅显示 token）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志汇总的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的按提供方细分信息。
- CLI：`openclaw channels list` 会在提供方配置旁打印相同的使用量快照（使用 `--no-usage` 可跳过）。
- macOS 菜单栏：Context 下的“Usage”部分（仅在可用时）。

## 自定义 `/usage full` 页脚

`/usage full` 会显示内置的紧凑页脚，在这些字段可用时包含模型、推理、快/慢模式、
上下文窗口、轮次 tokens、缓存和成本。无需模板文件。

`messages.usageTemplate` 仅用于高级自定义布局。其值可以是一个
JSON 文件路径（支持 `~`）或内联对象；在有效时，它会替换内置
页脚：

```json
{
  "messages": {
    "usageTemplate": "~/.openclaw/usage-footer.json"
  }
}
```

缺失或为空的模板会静默回退到内置页脚。不可读取或无效的已配置模板也会回退到内置页脚，并发出一条运维警告。

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
      { "text": "{model.provider}{identity.emoji|🤖} {model.display_name|alias:models}" },
      { "map": "model.is_fallback", "cases": { "true": " 🔄" } },
      { "map": "model.is_override", "cases": { "true": " 📌" } },
      { "when": "model.reasoning", "text": " {model.reasoning|alias:reasoning}" },
      { "map": "state.fast_mode", "cases": { "true": " ⚡", "false": " 🐌" } },
      {
        "when": "context.max_tokens",
        "text": " | 📚 [{context.pct_used|meter:5:braille}]{context.max_tokens|num}",
      },
      {
        "when": "usage.has_split_tokens",
        "text": " ↕️ {usage.input_tokens|num|?}/{usage.output_tokens|num|?}",
      },
      { "when": "usage.has_total_only_tokens", "text": " ↕️ {usage.total_tokens|num}" },
      { "when": "usage.cache_hit_pct", "text": " 🗄 {usage.cache_hit_pct|pct}" },
      { "when": "cost.turn_usd", "text": " 💰{cost.turn_usd|fixed:4}" },
    ],
    "surfaces": {
      "discord": [
        { "text": "-# -\n" },
        { "text": "-# {model.provider}{identity.emoji|🤖} {model.display_name|alias:models}" },
        { "map": "model.is_fallback", "cases": { "true": "🔄" } },
        { "map": "model.is_override", "cases": { "true": "📌" } },
        { "when": "model.reasoning", "text": " {model.reasoning|alias:reasoning}" },
        { "map": "state.fast_mode", "cases": { "true": " ⚡️", "false": " 🐌" } },
        {
          "when": "context.max_tokens",
          "text": " | 📚 [{context.pct_used|meter:5:braille}]{context.max_tokens|num}",
        },
        {
          "when": "usage.has_split_tokens",
          "text": " ↕️ {usage.input_tokens|num|?}/{usage.output_tokens|num|?}",
        },
        { "when": "usage.has_total_only_tokens", "text": " ↕️ {usage.total_tokens|num}" },
        { "when": "usage.cache_hit_pct", "text": " 🗄 {usage.cache_hit_pct|pct}" },
        { "when": "cost.turn_usd", "text": " 💰{cost.turn_usd|fixed:4}" },
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

| 路径                                                                                | 含义                                |
| ----------------------------------------------------------------------------------- | -------------------------------------- |
| `surface`                                                                           | 渠道 id（`discord`/`telegram`/等） |
| `model.provider` / `model.display_name`                                             | 提供方 id / 模型 id                 |
| `model.reasoning`                                                                   | 努力等级（`off` 到 `xhigh`）         |
| `model.is_fallback` / `model.is_override`                                           | bool：是否使用回退 / 是否固定模型     |
| `state.fast_mode`                                                                   | bool：快速 vs 慢速                     |
| `context.max_tokens` / `context.pct_used`                                           | 窗口预算 / 已用 0-100                |
| `usage.input_tokens` / `usage.output_tokens` / `usage.total_tokens`                 | 单轮汇总                         |
| `usage.has_split_tokens` / `usage.has_total_only_tokens` / `usage.cache_hit_pct`    | token 显示守卫与缓存百分比 |
| `usage.last.input_tokens` / `usage.last.output_tokens` / `usage.last.cache_hit_pct` | 仅最终模型调用                  |
| `cost.turn_usd`                                                                     | 估算的单轮成本                    |
| `identity.name` / `identity.emoji`                                                  | 代理名称 / 选定表情              |

（提供方速率限制窗口**不**在此合约中。）

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

- `{ "text": "📚 {context.max_tokens|num}" }`：字面量 + 插值。
- `{ "when": "<path>", "text": "..." }`：仅在路径值为真时渲染。
- `{ "map": "<path>", "cases": { "true": "⚡", "false": "🐌" } }`：将值映射为字形。
- `{ "each": "limits.windows", "item": "{label}" }`：迭代数组。

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

- **Anthropic（Claude）**：auth profiles 中的 OAuth tokens。
- **GitHub Copilot**：auth profiles 中的 OAuth tokens。
- **Gemini CLI**：auth profiles 中的 OAuth tokens。
  - JSON 使用量会回退到 `stats`；`stats.cached` 会标准化为
    `cacheRead`。
- **OpenAI Codex**：auth profiles 中的 OAuth tokens（存在时使用 accountId）。
- **MiniMax**：API key 或 MiniMax OAuth auth profile。OpenClaw 将
  `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额
  界面，优先使用已存储的 MiniMax OAuth（如果存在），否则回退到
  `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  使用量轮询会在配置了
  `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl`
  时从中推导 Coding Plan 主机，否则使用 MiniMax CN 主机。
  MiniMax 原始的 `usage_percent` / `usagePercent` 字段表示**剩余**
  配额，因此 OpenClaw 在显示前会对其取反；若存在基于计数的字段，则以其为准。
  - Coding-plan 窗口标签会优先取提供方的 hours/minutes 字段，
    然后再回退到 `start_time` / `end_time` 区间。
  - 如果 coding-plan 端点返回 `model_remains`，OpenClaw 会优先选择
    chat-model 条目；当显式 `window_hours` / `window_minutes` 字段不存在时，
    会根据时间戳推导窗口标签，并在 plan 标签中包含模型名称。
- **Xiaomi MiMo**：通过 env/config/auth store 的 API key（`XIAOMI_API_KEY`）。
- **z.ai**：通过 env/config/auth store 的 API key。
- **DeepSeek**：通过 env/config/auth store 的 API key（`DEEPSEEK_API_KEY`）。
  OpenClaw 会调用 DeepSeek 的余额端点，并将提供方报告的余额显示为文本，
  而不是百分比剩余配额窗口。

当无法解析出可用的提供方使用情况认证时，使用情况会被隐藏。提供方
可以提供插件特定的使用情况认证逻辑；否则 OpenClaw 会回退到通过 auth profiles、
环境变量或配置匹配 OAuth/API key 凭据。

## 相关内容

- [Token 使用量和成本](/reference/token-use)
- [API 使用量和成本](/reference/api-usage-costs)
- [Prompt 缓存](/reference/prompt-caching)
