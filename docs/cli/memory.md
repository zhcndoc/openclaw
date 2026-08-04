---
summary: "`openclaw memory` 的 CLI 参考（status/index/search/promote/promote-explain/rem-harness/rem-backfill/session-backfill）"
read_when:
  - 你想索引或搜索语义记忆
  - 你在排查记忆可用性或索引问题
  - 你想把回忆到的短期记忆提升到 `MEMORY.md`
title: "记忆"
---

# `openclaw memory`

管理语义记忆的索引、搜索以及提升到 `MEMORY.md` 中。
由捆绑的 `memory-core` 插件提供，在
`plugins.slots.memory` 选择 `memory-core`（默认值）时可用。其他记忆
插件会暴露它们各自的 CLI 命名空间。

相关内容：[记忆](/concepts/memory) 概念、[梦境](/concepts/dreaming)，
[记忆配置参考](/reference/memory-config)、[记忆 Wiki](/plugins/memory-wiki)，
[wiki](/cli/wiki)、[插件](/tools/plugin)。

## `memory status`

```bash
openclaw memory status [--agent <id>] [--deep] [--index] [--fix] [--json] [--verbose]
```

不带 `--agent` 时，将对 `agents.entries` 中的每个 agent 运行；如果没有配置 agent 列表，则回退到默认 agent。

| 标志        | 作用                                                                                                                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--deep`    | 探测向量存储、嵌入提供方以及语义搜索的就绪状态（会隐式触发额外的提供方调用）。普通的 `memory status` 会保持快速并跳过此步骤；未知的向量/语义状态表示尚未探测。即使在 `--deep` 下，QMD 词法 `searchMode: "search"` 也总是跳过语义向量探测。 |
| `--index`   | 如果存储已变脏则重新索引。隐式包含 `--deep`。                                                                                                                                                                                                                                                          |
| `--fix`     | 修复过期的 recall 锁并规范化 promotion 元数据。                                                                                                                                                                                                                                               |
| `--json`    | 输出 JSON。                                                                                                                                                                                                                                                                                               |
| `--verbose` | 输出每个阶段的详细日志。                                                                                                                                                                                                                                                                             |

如果即使 `dreaming.enabled: true`，`Dreaming` 这一行仍然保持为“关闭”，或者
计划中的 sweep 似乎从未运行，那么托管 dreaming 的 cron 依赖于
默认 agent 的 heartbeat 触发来启动协调。有关调度细节，请参见
[Dreaming](/concepts/dreaming)。

状态还会列出 `memory.search.extraPaths` 中的任何额外搜索路径。

## `memory index`

```bash
openclaw memory index [--agent <id>] [--force] [--verbose]
```

与 `status` 相同的按代理作用域。`--force` 会运行完整重建索引，而不是
增量索引。`--verbose` 会在显示索引进度之前打印每个代理的提供商、模型、来源以及
额外路径详情。

## `记忆搜索`

```bash
openclaw memory search [query] [--query <text>] [--agent <id>] [--max-results <n>] [--min-score <n>] [--json]
```

- 查询：位置参数 `[query]` 或 `--query <text>`。如果两者同时设置，则以 `--query`
  为准。如果两者均未设置，命令将报错。
- `--agent <id>`：默认为默认代理（而非完整的代理列表）。
- `--max-results <n>`：限制结果数量（正整数）。
- `--min-score <n>`：过滤掉低于此分数的匹配项。

如果在有界搜索时刷新完成后索引仍处于脏状态，面向用户的输出会警告匹配结果可能不完整。使用 `--json` 时，响应会添加
`stale: true`，以及说明如何重建索引的 `warning` 和 `action` 字段。仅当不存在 `stale` 时，才可将空的 `results` 数组视为权威结果。

## `memory promote`

从 `memory/YYYY-MM-DD.md` 中对短期候选项进行排序，并可选择性地将
排名靠前的条目附加到 `MEMORY.md`。

```bash
openclaw memory promote [--agent <id>] [--limit <n>] [--min-score <n>] \
  [--min-recall-count <n>] [--min-unique-queries <n>] [--apply] [--include-promoted] [--json]
```

| 标志                       | 默认值       | 作用                                                              |
| -------------------------- | ------------ | ----------------------------------------------------------------- |
| `--limit <n>`              |              | 返回或应用的最大候选项数量。                                      |
| `--min-score <n>`          | `0.75`       | 晋升所需的最低加权分数。                                          |
| `--min-recall-count <n>`   | `3`          | 所需的最低召回次数。                                              |
| `--min-unique-queries <n>` | `3`          | 所需的最低不同查询数量。                                          |
| `--apply`                  | 仅预览       | 将选定的候选项追加到 `MEMORY.md`，并将其标记为已晋升。            |
| `--include-promoted`       |              | 包含之前周期中已经晋升的候选项。                                  |
| `--json`                   |              | 输出 JSON。                                                       |

CLI 和定期的梦境扫描共享以下深度阶段默认值。
显式指定的 CLI 标志会在一次性手动运行中覆盖这些默认值。

排序信号包括：召回频率、检索相关性、查询多样性、
时间上的新近性、跨日整合，以及衍生概念丰富度，来源于
内存召回和每日摄取流程，并且还包含针对重复梦境回访的轻量/REM 阶段
强化提升。在写入之前，晋升会重新读取实时的日记，因此自排序以来对短期片段所做的编辑或删除
都会被尊重，不会基于过时的快照进行晋升。

## `memory promote-explain`

解释一个晋升候选项的分数构成。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

`<selector>` 匹配候选项的键（精确匹配或子串匹配）、路径或片段文本。

## `memory rem-harness`

预览 REM 反思、候选真相和深度阶段晋升输出，
而不写入任何内容。

```bash
openclaw memory rem-harness [--agent <id>] [--path <file-or-dir>] [--grounded] [--include-promoted] [--json]
```

- `--path <file-or-dir>`：从历史 `YYYY-MM-DD.md`
  日常文件而不是实时工作区来为 harness 提供种子。
- `--grounded`：还从历史笔记中渲染一个有依据的“发生了什么” / “反思” /
  “可能的长期更新”预览。

## `memory rem-backfill`

将有依据的历史 REM 摘要写入 `DREAMS.md` 以供 UI 审核。  
可逆。

```bash
openclaw memory rem-backfill --path <file-or-dir> [--agent <id>] [--stage-short-term] [--json]
openclaw memory rem-backfill --rollback [--rollback-short-term] [--json]
```

- `--path <file-or-dir>`：除非设置了 `--rollback`/`--rollback-short-term`，否则为必需。用于回填的历史日记内存文件或目录。
- `--stage-short-term`：同时将有依据的持久候选项播种到实时短期晋升存储中，以便正常的深度阶段对其进行排序。
- `--rollback`：从 `DREAMS.md` 中移除先前写入的有依据的日记条目。
- `--rollback-short-term`：移除先前暂存的有依据的短期候选项。

## `memory session-backfill`

通过与 dreaming 使用的相同来源追溯和短期暂存流水线，提炼已保留的会话历史。默认情况下为只读预览，按从最早的未处理日期到最新日期排序。

```bash
openclaw memory session-backfill --agent <id> [--from YYYY-MM-DD] [--to YYYY-MM-DD] \
  [--limit-days <n>] [--archive-files <path...>] [--rem | --apply] [--json]
openclaw memory session-backfill --agent <id> --rollback [--json]
```

| 标志                        | 默认值       | 作用                                                                                                        |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `--from YYYY-MM-DD`         |              | 包含 dreaming 时区中当天及之后的消息。                                               |
| `--to YYYY-MM-DD`           |              | 包含 dreaming 时区中当天及之前的消息。                                              |
| `--limit-days <n>`          | `92`         | 最多处理这么多未进行哈希跟踪的日期，按从最早到最晚的顺序处理。                                                  |
| `--archive-files <path...>` |              | 同时检查外部转录文件，并将其作为不可信输入；不接受其中嵌入的所有者元数据。            |
| `--rem`                     |              | 仅将确定性的、基于依据的每日预览写入 `DREAMS.md`。                                            |
| `--apply`                   | 仅预览       | 排空所有有界批次，暂存可信候选项，并写入可逆的 `DREAMS.md` 日记区块。           |
| `--rollback`                |              | 移除所有基于依据的回填候选项和共享回填日记区块，包括 `rem-backfill` 产物。 |
| `--json`                    |              | 输出机器可读的每日计数和候选项排名。                                                     |

该命令会读取所选 agent 的规范会话存储，包括来自会话轮换中保留的 SQLite 转录身份。它使用与实时会话摄取相同的已跟踪消息哈希和每次运行上限，因此重复执行 `--apply` 时会跳过已经摄取过的消息。来自规范存储的所有者行和 agent 行都符合条件；工具输出、web 或非所有者输入，以及缺少可信所有者来源证明的轮次都会被排除。外部归档文件没有经过认证的所有者来源证明契约，因此其中嵌入的所有权字段仍然不可信，且不能被暂存。

`--apply` 会在一次调用中将所选历史处理至完成，同时将每个有界批次置于各自的事务中。人类可读输出和 JSON 输出都会报告每批次的进度，以及批次总数、候选项总数和已暂存条目总数。成功执行 apply 后立即进行预览时，报告的新候选项数量将为零。它只会写入 `memory/.dreams/` 下的会话语料库、短期暂存状态以及 `DREAMS.md` 中可逆的日记条目。它绝不会写入 `MEMORY.md` 或 `USER.md`；持久化提升仍由单独的 `memory promote` 或 dreaming 决策完成。`--rem` 和 `--apply` 互斥。

回填回滚有意与 `memory rem-backfill` 共享：两个命令使用相同的、仅基于依据的暂存类别和日记标记。只有在你确实打算清除该工作区中两个命令所产生的基于依据的回填产物时，才运行 `session-backfill --rollback`。回滚还会移除由 session backfill 添加的已跟踪哈希，并回退受影响的转录游标，因此可以再次预览和应用相同的候选项。

## 做梦

做梦是后台记忆巩固系统，包含三个协作阶段，按顺序在一个计划上运行：**light**（整理/分层短期材料）、**REM**（反思并浮现主题）、**deep**（将持久事实提升到 `MEMORY.md`）。只有 deep 会写入 `MEMORY.md`。

- 通过 `plugins.entries.memory-core.config.dreaming.enabled: true`
  启用（默认值为 `true`）；`memory-core` 会自动管理扫描 cron 任务，无需手动执行
  `openclaw cron add`。
- 在聊天中通过 `/dreaming on|off` 切换；通过 `/dreaming status`
  （或 `/dreaming`/`/dreaming help`）查看状态。`on`/`off` 要求频道所有者身份
  或网关 `operator.admin` 权限；任何可以调用该命令的用户都可以使用 `status` 和帮助功能。
- 人类可读的阶段输出会写入 `DREAMS.md`（或已有的 `dreams.md`）。
  默认情况下（`dreaming.storage.mode: "separate"`），每个阶段还会将独立报告写入
  `memory/dreaming/<phase>/YYYY-MM-DD.md`；将 `mode:
"inline"` 设置为将报告合并到每日记忆文件中，或设置为 `"both"` 以同时写入两者。
- 计划运行和手动执行的 `memory promote` 会共享相同的 deep 阶段排序信号和默认阈值；
  显式 CLI 标志仍仅对单次运行生效。
- 计划运行会分发到每个已配置代理的记忆工作区。

计划默认值（`plugins.entries.memory-core.config.dreaming`）：

| 键                                     | 默认值      |
| -------------------------------------- | ----------- |
| `frequency`                            | `0 3 * * *` |
| `phases.deep.minScore`                 | `0.75`      |
| `phases.deep.minRecallCount`           | `3`         |
| `phases.deep.minUniqueQueries`         | `3`         |
| `phases.deep.recencyHalfLifeDays`      | `14`        |
| `phases.deep.maxAgeDays`               | `30`        |
| `phases.deep.maxPromotedSnippetTokens` | `160`       |

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

完整键列表和阶段详情：[做梦](/concepts/dreaming)，
[记忆配置参考](/reference/memory-config#dreaming)。

## SecretRef 网关依赖

如果活动内存远程 API key 字段配置为 SecretRefs，`memory`
命令会从活动网关快照中解析它们；如果网关不可用，该命令会快速失败。这要求网关支持
`secrets.resolve` 方法；较旧的网关会返回 unknown-method 错误。

## 相关

- [CLI 参考](/cli)
- [内存概览](/concepts/memory)
