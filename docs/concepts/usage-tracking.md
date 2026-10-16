---
summary: "使用情况跟踪界面和凭据要求"
read_when:
  - "您是接线提供商 usage/quota 表面"
  - "你需要解释使用情况跟踪行为或认证要求时"
title: "使用情况跟踪"
---

## <a id="what-it-is"></a> 它是什么

- 直接从每个提供商的使用端点拉取提供商 usage/quota。没有估计的提供商账单；仅提供商报告的计划名称、配额窗口、余额、支出、预算、每日成本历史记录、token/model 归属或帐户状态摘要。
- 人类可读的配额窗口输出会规范化为 `X% left`，即使提供商报告的是已使用配额、剩余配额或仅原始计数。没有可重置配额窗口的提供商则改为显示提供商摘要文本（例如余额）。
- 当实时会话快照丢失 token/model 数据时， 会话级 `/status` 和 `session_status` 工具将回退到会话的转录日志。该后备填充缺失的 token/cache 计数器，可以恢复活动运行时模型标签，并且在会话元数据丢失或较小（`totalTokensFresh !== true`、零或低于转录本派生值）时更喜欢较大的面向提示的总数。非零实时值总是胜过后备值。

## <a id="where-it-shows-up"></a> 显示位置

- `/status` 在聊天中：状态卡片，显示会话 token 和预估成本（仅适用于 API key 模型）。在可用时，提供商使用情况会显示为**当前模型提供商**的规范化 `X% left` 窗口或提供商摘要文本。
- `/usage off|tokens|full` 在聊天中：每条回复的使用情况页脚。
- `/usage cost` 在聊天中：从 OpenClaw 会话日志汇总的本地成本摘要。
- CLI：`openclaw status --usage` 打印每个提供商的完整 usage/quota 细分。
- CLI：`openclaw models status` 列出 OAuth/token 认证配置文件，并在每个有使用窗口的提供商旁显示其摘要。
- Control UI：**Usage** 在 OpenClaw 基于会话的 token 和预估成本分析上方显示提供商套餐和账单卡片。Anthropic 和 OpenAI Admin API 凭据会额外添加提供商报告的今日、7 天和 30 天支出、每日趋势、token 总数、热门模型和成本分类。
- Control UI：聊天编辑器的上下文环弹出窗口显示订阅提供商的 **计划使用情况** — 每个窗口条形图（5 小时、每周、模型范围）以及重置时间、已知的提供商计划（例如 `Max (20x)`）以及额外使用积分。通过计划计费的会话隐藏了每个代币的美元估算； API- 计费会话保留 `Est. cost` 和按类型划分的成本明细。 Claude Code CLI （`claude-cli`） 设置重复使用相同的 Anthropic 订阅用法。
- macOS 菜单栏：当可用提供商使用快照时，Context 下方会显示一个根级 "Usage" 区域。参见 [菜单栏](/platforms/mac/menu-bar)。

自 v2026.5.7 起，`openclaw channels list` 不再打印提供商使用情况；它会将用户指向 `openclaw status` 或 `openclaw models list`。

`/usage cost` 警告，如果 **Today** 和 **Last 30d** 的聚合缓存正在刷新、部分或陈旧，则它们的总计可能不完整，并建议稍后再次运行该命令。 **Session** 总计是单独加载的。 CLI `openclaw gateway usage-cost` 还在总计之前报告记录的缓存状态。

Control UI 在 5、10 和 20 秒后再次检查不完整的提供程序使用情况。会话使用情况随着其后台投影发布进度而刷新。在冷缓存有任何使用数据之前，页面会显示加载占位符而不是零总数。可用的部分总数保持可见；如果刷新失败，请选择“**Refresh**”重试。

会话报告有 15 秒的数据读取预算。如果过期，已完成的批次将作为部分报告保持可见，并提示缩小日期范围或选择会话。部分总计不是完整的帐单总计。断开连接仍然会取消请求而不发布响应。

当座席共享会话存储时，会话报告会保留座席归属。当会话存储未更改时，后台使用情况刷新不会使选定的报告失效。保留的 SQLite 转录本以及旧版包含冒号的 ID 仍包含在使用总量中，并且不会中断后台刷新。

使用情况将在选择的最后 30 个日历日开始。 **今天**、**7d**、**30d**、**90d**、 **1y**、**All** 或日期输入更改报告范围。历史沿袭包括保留的会话的早期实例；日期范围仍然控制图表中显示的活动。总计和每日图表来自同一会话报告，包括超出可见列表限制的会话。

记录的零美元成本是有效的成本数据。仅当所选报告包含未定价的使用情况时，平均成本提示才会警告价格缺失；过滤到已知零成本的会话会清除该警告。

**由**启动，对录制的会话创建者的使用进行分组。选择一个身份来过滤完整报告，包括其历史记录和总计。人员概况、代理和系统创建的会话仍然不同；没有记录的创建者的历史会话显示为 **Unattributed**。这将整个会话归因于其创建者，而不是将个人转向参与者或向提供商 API 帐户收费。当前帐户设置不用于猜测历史归因。

选择图表天数可以缩小整个报告中的创建者总数和会话计数。在选定的几个日期内处于活动状态的会话计数一次。文本、创建者和时间过滤器还涵盖每个匹配的会话，包括可见页面之外的会话。该表一次加载 50 行；排序和分页不会更改图表总计。选择会话会缩小图表范围，同时保留比较表。 JSON 导出加载完整的匹配报告。

概述使用在提交的转录本更改后维护的可重建使用预测。后台刷新等待 30 秒，没有新的使用或活动代理轮流。五分钟的挂起工作后，它可以在下一个空闲间隙开始，而无需另一个安静期。显式成本和概述读取刷新并等待挂起的更新，因此完成的回合不需要等待该计时器。此显示批处理不会延迟目标预算或提供商计费限制。重新启动或定价更改可能需要后台回填；该页面在前进时显示部分总计。没有缓存投影的会话保持挂起状态，无需等待成绩单统计信息。扫描 10 秒后完成的转录本或 50 个转录本（以先到者为准）之间的后台回填产量。一份大的成绩单或初始清单可能需要更长的时间。文字记录仍然是真相的来源。详细报告保留精确的时间戳边界和浮点成本添加的记录顺序。

## <a id="usage-date-ranges"></a> 使用日期范围

默认情况下，网关方法 `usage.cost` 和 `sessions.usage` 解释 UTC 中的日期范围。在 `mode: "specific"` 中，使用有效的 IANA `timeZone`（例如 `Europe/Vienna`）来遵循本地日历日和夏令时更改。它优先于旧版 `utcOffset` 字段。

如果没有 `timeZone`，固定的 `utcOffset` 必须介于 `UTC-12:00` 和 `UTC+14:00` 之间（含这两个值）（例如，`UTC+5:30`）。无效的非空偏移量返回 `INVALID_REQUEST`，而不是默默地使用 UTC。省略这两个字段使用 UTC。 `usage.cost` 还将空白偏移视为省略； `sessions.usage` 需要任何提供的偏移量来匹配 UTC 偏移量格式，因此省略该字段而不是发送空白值。

## <a id="anthropic-and-openai-cost-history"></a> Anthropic 和 OpenAI 成本历史

订阅配额和 API 计费是不同的提供方界面：

- Anthropic subscription/setup 凭证继续显示 Claude 配额窗口和可选的额外使用预算。设置 `ANTHROPIC_ADMIN_KEY` 或 `ANTHROPIC_ADMIN_API_KEY` 以显示组织使用情况和成本 API 历史记录。系统会自动检测以 `sk-ant-admin` 开头的 Anthropic 提供商凭证。
- OpenAI ChatGPT/Codex OAuth 继续显示计划、配额窗口和贷方余额。设置 `OPENAI_ADMIN_KEY` 以显示组织成本和完成使用历史记录； （可选）设置 `OPENAI_PROJECT_ID` 以将其范围限制为一个项目。 OpenClaw 从不将推理凭证从 `OPENAI_API_KEY`、提供者配置或身份验证配置文件发送到组织 API，因为这些密钥可能属于自定义端点。

管理员凭据优先，因为它们提供了真实的组织计费数据。OpenClaw 不会将这些由提供方报告的总计与其本地会话估算合并；这两个部分是有意回答不同问题的。

OpenAI 管理令牌总数包括文本、音频和图像。输入细分将未缓存的输入、缓存读取和缓存写入分开； 30 分钟和 12 小时缓存写入都出现在缓存写入类别中。音频和其他模式细分已包含在总数中，不会再次添加。请参阅 [OpenAI 完成用法 API](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions)。

## <a id="default-usage-footer-mode"></a> 默认使用量页脚模式

`/usage off|tokens|full` 为某个会话设置页脚，并会在该会话期间记住。`messages.responseUsage` 会为尚未选择该模式的会话设定初始值，因此页脚可以默认开启，而无需每次都输入 `/usage`。

为每个频道设置一种模式，或者使用带有 `default` 回退值的按频道映射：

```jsonc
{
  "messages": {
    "responseUsage": "tokens",
    // or: { "default": "off", "discord": "full" }
  },
}
```

可接受的值：`"off"`、`"tokens"`、`"full"`，以及旧版别名 `"on"`（按 `"tokens"` 处理）。

### <a id="three-distinct-session-states"></a> 三种不同的会话状态

会话的 `responseUsage` 字段有三种可表示的状态，每种状态的语义不同：

| 状态               | 存储值                    | 实际模式                                                        |
| ------------------- | ------------------------------- | --------------------------------------------------------------------- |
| **未设置 / 继承** | `undefined`（不存在）            | 先回退到 `messages.responseUsage` 配置默认值，再回退到 `off`。 |
| **显式关闭**    | `"off"`（已存储）                | 始终关闭；非 off 的配置默认值不能重新启用页脚。     |
| **显式开启**     | `"tokens"` 或 `"full"`（已存储） | 该模式，不受配置默认值影响。                              |

### <a id="precedence"></a> 优先级

实际模式 = 会话覆盖 → 频道配置项 → `default` → `off`。

显式的 `/usage off` 会作为字面值 `"off"` **持久化** 到会话中，这与“未设置”不同。即使 `messages.responseUsage` 默认值不是 off，在用户明确禁用后，也不能把页脚重新打开。

### <a id="resetting-vs.-turning-off"></a><a id="resetting-vs-turning-off"></a> 重置 vs. 关闭

- `/usage off` 会强制关闭页脚并持久化该选择。已配置的非 off 默认值无法覆盖它。
- `/usage reset`（别名：`default`、`inherit`、`inherited`、`clear`、`unpin`）会清除会话覆盖。随后会话会**继承**配置默认值（`messages.responseUsage`）对应的实际模式。如果没有配置默认值，页脚仍保持关闭。
- 完整会话重置（`/reset` 或 `/new`）或会话轮换会**保留**显式的使用量模式偏好，这样用户的显示选择就能在会话轮换后继续保留。只有 `/usage reset`（及其别名）会清除该覆盖。

### <a id="toggle-behavior"></a> 切换行为

不带参数的 `/usage` 会循环切换：off → tokens → full → off。循环的起点是**当前实际**模式（当未设置时，会从会话覆盖回退到配置默认值），因此循环始终与用户当前在页脚中看到的内容一致。

### <a id="config"></a> 配置

在没有配置时，行为保持不变（在 `/usage` 之前页脚为 off）。使用 `/usage reset` 可清除会话覆盖，并重新继承已配置的默认值。

## <a id="custom-%2Fusage-full-footer"></a><a id="custom-/usage-full-footer"></a> 自定义 `/usage full` 页脚

`/usage tokens` 呈现带有缓存计数器（如果可用）的普通 `Usage: X in / Y out` 行。缺少输入或输出计数保持 `?`； OpenClaw 不会从总数中推断出分割情况。当两个方向均未报告时，已知总数显示为 `Usage: 1.3k total`。即使输入、输出和总计数不可用，缓存计数器仍然可见。这种模式从不估算成本。只有 `/usage full` 才能呈现如下所述的更丰富的页脚。

`/usage full` 显示内置紧凑页脚，其中包含模型、推理、fast/slow、上下文窗口和成本（当这些字段可用时）。内置页脚不需要模板文件。一百万个或更多代币的上下文窗口使用`m`单位，例如`1.0m`或`2.0m`；较小的窗口保留 `k` 单位，例如 `200k`。

`messages.usageTemplate` 仅用于高级自定义布局。其值可以是一个 JSON 文件路径（支持 `~`）或一个内联对象；当其有效时，会替换内置页脚。文件路径会被监视，并在变更时实时重新加载。

```json
{
  "messages": {
    "usageTemplate": "~/.openclaw/usage-footer.json"
  }
}
```

缺失或空模板会静默回退到内置页脚。不可读或无效的已配置模板（错误的 JSON，或结构中没有可渲染输出片段）也会回退到内置页脚，并发出运维警告。

请先从内置结构开始自定义模板，再编辑你想要修改的部分：

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

### <a id="shape"></a> 结构

```jsonc
{
  "schema": "openclaw.usageBar.v1",
  "scales": { "<name>": "low-to-high glyphs" }, // string (1 glyph/char) or array
  "aliases": { "<table>": { "<value>": "<label>" } },
  "output": {
    "sep": "", // joins surviving pieces
    "default": [/* pieces */], // fallback for any surface
    "surfaces": {
      "discord": [/* pieces */],
      "telegram": [/* pieces */],
    },
  },
}
```

每个 surface 都是按顺序排列的 **片段** 列表；引擎会渲染每个片段，丢弃空值，并使用 `sep` 连接保留下来的结果。若某个 surface 没有条目，则使用 `output.default`。

### <a id="contract-paths"></a> 合约路径

一个片段通过点路径从每轮合约中读取值。缺失值会被视为空（因此 `when` 守卫或 `|fallback` 可以让片段保持干净）。

| 路径                                                                                | 含义                                                                                              |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `surface`                                                                           | 频道 ID （`discord`/`telegram`/etc.）                                                               |
| `agentId` / `chat_type`                                                             | 拥有代理 ID / 聊天界面类型                                                                  |
| `model.id` / `model.display_name` / `model.provider`                                | 模型 ID / 显示名称 / 提供商 ID                                                                |
| `model.actual`, `model.resolved_ref`                                                | 此轮实际使用的 provider/model ref                                                        |
| `model.requested`                                                                   | 请求的 provider/model ref（回退前）                                                       |
| `model.reasoning`                                                                   | 推理强度（从 `off` 到 `xhigh`）                                                                       |
| `model.is_fallback` / `model.is_override`                                           | 布尔值：是否使用了回退 / 是否锁定了模型                                                                   |
| `model.override_source` / `model.auth_mode`                                         | override 来源标签 / 凭据模式（`oauth`、`api-key`、`token`、`mixed`、`aws-sdk`、`unknown`） |
| `state.fast_mode`                                                                   | 布尔值：快速模式或慢速模式                                                                                   |
| `state.compactions`                                                                 | 本次会话的压缩次数                                                                     |
| `context.max_tokens` / `context.used_tokens` / `context.pct_used`                   | 窗口预算 / 已占用 token / 已使用 0-100                                                         |
| `usage.input_tokens` / `usage.output_tokens` / `usage.total_tokens`                 | 本轮汇总                                                                                       |
| `usage.cache_read_tokens` / `usage.cache_write_tokens`                              | 本轮的 cache-read 和 cache-write tokens                                                       |
| `usage.has_tokens` / `usage.has_split_tokens` / `usage.has_total_only_tokens`       | token 显示守卫                                                                                 |
| `usage.cache_hit_pct`                                                               | cache-read 占总 prompt tokens 的比例                                                              |
| `usage.last.input_tokens` / `usage.last.output_tokens` / `usage.last.cache_hit_pct` | 仅最终模型调用（也包含 `cache_read_tokens`、`cache_write_tokens`、`total_tokens`）           |
| `cost.turn_usd` / `cost.available`                                                  | 估算的本轮成本 / 是否解析到了成本表                                                  |
| `timing.duration_ms`                                                                | 墙钟时间轮次持续时长                                                                             |
| `identity.name` / `identity.emoji` / `identity.avatar`                              | agent 身份名称 / emoji / 头像                                                                 |
| `session.id`                                                                        | 会话ID                                                                                           |

（Provider 的速率限制窗口**不在**此合约中；目前没有数组类型的路径，因此 `each` 片段没有可迭代的内容。）

### <a id="verbs"></a> 动词

将一个值通过多个动词从左到右处理；非动词片段作为回退值。

| 动词            | 作用                                | 示例                           |
| --------------- | ------------------------------------- | --------------------------------- |
| `num`           | 紧凑计数                         | `272000 -> 272k`                  |
| `fixed:N`       | N 位小数（`0..100`，默认 2）      | `0.0377`                          |
| `dur`           | 秒数转持续时间                   | `14820 -> 4h07m`                  |
| `pct`           | 追加 `%`                            | `96 -> 96%`                       |
| `inv`           | `100 - x`                             | 用于从已使用量得到剩余量             |
| `alias:TABLE`   | 在 `aliases` 中查找，未列出则原样输出 | `medium -> 🌗`                    |
| `meter:W:SCALE` | W-cell 字形条超过 0-100 值   | `[⣿⣿⠐⠐⠐]`（`meter:1` = 一个字形） |

`fixed:N` 仅接受 0 到 100 之间的完整十进制整数。无效的精度参数会使该插值结果为空。

`meter:W:SCALE` 仅接受 1 到 100 之间的完整十进制整数宽度。留空宽度可使用默认值 5（`meter::braille`）；无效宽度会使该插值结果为空。

### <a id="piece-forms"></a> 片段形式

- `{ "text": "📚 {context.max_tokens|num}" }`: 字面量 + 插值。
- `{ "when": "<path>", "text": "..." }`: 仅当路径为真值时渲染。
- `{ "map": "<path>", "cases": { "true": "⚡", "false": "🐌" } }`: 值到字形的映射（`_default` 分支覆盖未匹配的值）。
- `{ "each": "<array-path>", "item": "{label}" }`: 迭代数组值路径（当前合约路径中没有数组）。

### <a id="example"></a> 示例

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

渲染 e.g. `claude-sonnet-4-6 🌗 🐌 | 📚 [⣿⣿⣿⣿⣧]272k`。

## <a id="providers-%2B-credentials"></a><a id="providers-+-credentials"></a> 提供方 + 凭据

当没有可用的提供方使用情况认证可解析时，Usage 会被隐藏。OpenClaw 会自动发现声明了 `contracts.usageProviders` 并实现了 `resolveUsageAuth` 和 `fetchUsageSnapshot` 的已启用提供方插件；不存在单独的核心提供方允许列表。静态契约通过作用域化发现来避免导入每个提供方插件。每个插件都负责自己的上游端点和响应映射。共享快照将计划名称、配额窗口、余额、支出和预算保持为与提供方无关的形式，供 CLI、应用和 Control UI 消费者使用。

- **Anthropic （Claude）**：身份验证配置文件中的 OAuth 令牌。如果 OAuth 令牌缺少 `user:profile` 范围，则在设置时回退到 `claude.ai` Web 会话（`CLAUDE_AI_SESSION_KEY`、`CLAUDE_WEB_SESSION_KEY` 或 `CLAUDE_WEB_COOKIE` 中的 `sessionKey=` cookie）。当 Anthropic 报告时，包括模型范围的限制和启用的每月额外使用量 spend/budgets。显式的 Anthropic 管理 API 密钥或自动检测的 `sk-ant-admin...` 提供商配置文件会显示 30 天的组织成本和消息 API 历史记录。
- **ClawRouter**：API 密钥 （`CLAWROUTER_API_KEY`）。配置时显示每月预算窗口并输入 USD 预算；否则显示总支出和 request/token/cost 摘要。
- **DeepSeek**：通过 env/config/auth 存储 （`DEEPSEEK_API_KEY`） 的 API 密钥。显示每个提供商报告的货币余额。
- **GitHub Copilot**：认证配置文件中的 OAuth 令牌。
- **MiniMax**：API 密钥或 MiniMax OAuth 认证配置文件。OpenClaw 将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额界面； 如果存在已存储的 MiniMax OAuth，则优先使用，否则回退到 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。 使用情况轮询会在已配置时从 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 推导 Coding Plan 主机，否则使用 MiniMax CN 主机。 MiniMax 原始的 `usage_percent` / `usagePercent` 字段表示**剩余** 配额，因此 OpenClaw 会在显示前将其反转；如果存在基于计数的字段，则优先使用。
  - Window 标签来自提供者 hours/minutes 字段（如果存在），然后回退到 `start_time` / `end_time` 范围。
  - 如果 coding-plan 端点返回 `model_remains`，OpenClaw 会优先选择聊天模型条目； 当不存在明确的 `window_hours` / `window_minutes` 字段时，根据时间戳推导窗口标签， 并将模型名称包含在计划标签中。
- **OpenAI（Codex/ChatGPT 计划）**：身份验证配置文件中的 OAuth 令牌（存在帐户 ID 时发送的 `ChatGPT-Account-Id` 标头）。显示 ChatGPT 计划、可重置的 Codex 窗口以及报告时的贷方余额。积分仍然是提供者积分； OpenClaw 不将它们标记为美元。当密钥具有使用情况仪表板访问权限时，`OPENAI_ADMIN_KEY` 添加 30 天的组织成本和完成使用历史记录。推理凭据永远不会转发到组织 API。
- **OpenRouter**：API 密钥或 OAuth- 支持的 API 密钥（`OPENROUTER_API_KEY` 或身份验证配置文件）。将帐户积分端点与关键配额端点相结合，因此当凭证可以访问帐户 balance/spend、密钥预算和 daily/weekly/monthly 使用情况时，就会显示它们。任一端点都可以独立地丰富快照。
- **Venice**：通过 env/config/auth 存储 （`VENICE_API_KEY`） 的 API 密钥。显示 USD 和 DIEM 余额以及报告时的 DIEM 纪元分配使用情况。
- **Xiaomi MiMo**：两个独立的使用情况界面。按量付费使用 API 密钥 （`XIAOMI_API_KEY`）；Token Plan 使用单独的密钥（`XIAOMI_TOKEN_PLAN_API_KEY`）。 两者目前都不会报告配额窗口。
- **z.ai**：通过 env/config/auth 存储的 API 密钥（`ZAI_API_KEY` 或 `Z_AI_API_KEY`）。显示提供商报告的令牌周期，包括每周窗口和每月工具配额。重置倒计时接受纪元毫秒或日期字符串；丢失或无效的重置会使配额可见而没有倒计时。

## <a id="related"></a> 相关内容

- [代币使用和费用](/reference/token-use)
- [API 用途和费用](/reference/api-usage-costs)
- [提示缓存](/reference/prompt-caching)
- [菜单栏](/platforms/mac/menu-bar)
