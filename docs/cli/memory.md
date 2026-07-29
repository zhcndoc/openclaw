---
summary: "CLI reference for `openclaw memory` (status/index/search/promote/promote-explain/rem-harness/rem-backfill/session-backfill)"
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

相关内容：[Memory](/concepts/memory) 概念、[Dreaming](/concepts/dreaming)，
[Memory config reference](/reference/memory-config)、[Memory Wiki](/plugins/memory-wiki)，
[wiki](/cli/wiki)、[Plugins](/tools/plugin)。

## `memory status`

```bash
openclaw memory status [--agent <id>] [--deep] [--index] [--fix] [--json] [--verbose]
```

不带 `--agent` 时，将对 `agents.entries` 中的每个 agent 运行；如果没有配置 agent 列表，则回退到默认 agent。

| 标志        | 作用                                                                                                                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--deep`    | 探测向量存储、embedding 提供方以及语义搜索的就绪状态（会隐式触发额外的 provider 调用）。普通的 `memory status` 会保持快速并跳过此步骤；未知的向量/语义状态表示未曾探测。即使在 `--deep` 下，QMD 词法 `searchMode: "search"` 也总是跳过语义向量探测。 |
| `--index`   | 如果存储已变脏则重新索引。隐式包含 `--deep`。                                                                                                                                                                                                                                                          |
| `--fix`     | 修复过期的 recall 锁并规范化 promotion 元数据。                                                                                                                                                                                                                                               |
| `--json`    | 输出 JSON。                                                                                                                                                                                                                                                                                               |
| `--verbose` | 输出每个阶段的详细日志。                                                                                                                                                                                                                                                                             |

如果即使 `dreaming.enabled: true`，`Dreaming` 这一行仍然保持 `off`，或者
计划中的 sweep 似乎从未运行，那么托管 dreaming 的 cron 依赖于
默认 agent 的 heartbeat 触发来启动协调。有关调度细节，请参见
[Dreaming](/concepts/dreaming)。

状态还会列出 `memory.search.extraPaths` 中的任何额外搜索路径。

## `memory index`

```bash
openclaw memory index [--agent <id>] [--force] [--verbose]
```

与 `status` 相同的按 agent 作用域。`--force` 会运行完整重建索引，而不是
增量索引。`--verbose` 会在显示索引进度之前打印每个 agent 的提供商、模型、来源以及
额外路径详情。

## `Memory Search`

```bash
openclaw memory search [query] [--query <text>] [--agent <id>] [--max-results <n>] [--min-score <n>] [--json]
```

- Query: positional argument `[query]` or `--query <text>`. If both are set, `--query`
  takes precedence. If neither is set, the command will error.
- `--agent <id>`: defaults to the default agent (not the full agent list).
- `--max-results <n>`: limits the number of results (positive integer).
- `--min-score <n>`: filters out matches below this score.

## `memory promote`

从 `memory/YYYY-MM-DD.md` 中对短期候选项进行排序，并可选择性地将
排名靠前的条目附加到 `MEMORY.md`。

```bash
openclaw memory promote [--agent <id>] [--limit <n>] [--min-score <n>] \
  [--min-recall-count <n>] [--min-unique-queries <n>] [--apply] [--include-promoted] [--json]
```

| 标志                       | 默认值       | 作用                                                              |
| -------------------------- | ------------ | ----------------------------------------------------------------- |
| `--limit <n>`              |              | 返回/应用的候选项上限。                                             |
| `--min-score <n>`         | `0.75`       | 最低加权晋升分数。                                                 |
| `--min-recall-count <n>`   | `3`          | 所需的最小召回次数。                                               |
| `--min-unique-queries <n>` | `2`          | 所需的最小不同查询数量。                                           |
| `--apply`                  | 仅预览       | 将选定候选项附加到 `MEMORY.md` 并将其标记为已晋升。                  |
| `--include-promoted`       |              | 包含之前周期中已晋升的候选项。                                      |
| `--json`                   |              | 输出 JSON。                                                        |

这些 CLI 默认值与计划中的 dreaming 扫描的 deep-phase
阈值不同（见下方的 [Dreaming](#dreaming)）；如需一次性手动运行并匹配
扫描行为，请传入显式标志。

排序信号包括：召回频率、检索相关性、查询多样性、
时间上的新近性、跨日整合，以及衍生概念丰富度，来源于
内存召回和每日摄取流程，并且还包含针对重复 dreaming 回访的轻量/REM 阶段
强化提升。在写入之前，晋升会重新读取实时的日记，因此自排序以来对短期片段所做的编辑或删除
都会被尊重，不会基于过时的快照进行晋升。

## `memory promote-explain`

解释一个晋升候选项的分数构成。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

`<selector>` 匹配候选项的键（精确匹配或子串匹配）、路径或片段文本。

## `memory rem-harness`

预览 REM 反思、候选真相和深度阶段晋升输出
而不写入任何内容。

```bash
openclaw memory rem-harness [--agent <id>] [--path <file-or-dir>] [--grounded] [--include-promoted] [--json]
```

- `--path <file-or-dir>`: 从历史 `YYYY-MM-DD.md`
  日常文件而不是实时工作区来为 harness 提供种子。
- `--grounded`: 还从历史笔记中渲染一个有依据的 `What Happened` / `Reflections` /
  `Possible Lasting Updates` 预览。

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
| `--from YYYY-MM-DD`         |              | 包含在 dreaming 时区中该日期当日及之后的消息。                                                               |
| `--to YYYY-MM-DD`           |              | 包含在 dreaming 时区中该日期当日及之前的消息。                                                               |
| `--limit-days <n>`          | `92`         | 最多处理这么多未跟踪哈希的日期，优先最早的日期。                                                              |
| `--archive-files <path...>` |              | 额外检查外部转录文件作为不受信任的输入；其中嵌入的所有者元数据不被接受。                                      |
| `--rem`                     |              | 仅将确定性的、落地的按日预览写入 `DREAMS.md`。                                                                 |
| `--apply`                   | 仅预览       | 暂存受信任的候选项，并写入可回滚的 `DREAMS.md` 日记块。                                                      |
| `--rollback`                |              | 移除所有落地的回填候选项和共享的回填日记块，包括 `rem-backfill` 产物。                                       |
| `--json`                    |              | 输出可供机器读取的按日计数和顶部候选项。                                                                     |

该命令会读取所选 agent 的规范会话存储，包括来自会话轮换中保留的 SQLite 转录身份。它使用与实时会话摄取相同的已跟踪消息哈希和每次运行上限，因此重复执行 `--apply` 时会跳过已经摄取过的消息。来自规范存储的所有者行和 agent 行都符合条件；工具输出、web 或非所有者输入，以及缺少可信所有者来源证明的轮次都会被排除。外部归档文件没有经过认证的所有者来源证明契约，因此其中嵌入的所有权字段仍然不可信，且不能被暂存。

`--apply` 只会写入 `memory/.dreams/` 下的会话语料、短期暂存状态，以及 `DREAMS.md` 中可回滚的日记条目。它绝不会写入 `MEMORY.md` 或 `USER.md`；持久化提升仍然是单独的 `memory promote` 或 dreaming 决策。`--rem` 和 `--apply` 互斥。

回填回滚与 `memory rem-backfill` 故意共享：两个命令都使用相同的仅落地暂存类别和日记标记。只有在你打算清除该工作区中这两个命令的所有落地回填产物时，才运行 `session-backfill --rollback`。回滚会保留转录摄取游标和已跟踪消息哈希，因此被移除的消息不会自动重新摄取。

## Dreaming

做梦是后台记忆巩固系统，包含三个协作阶段，按顺序在一个计划上运行：**light**（整理/分层短期材料）、**REM**（反思并浮现主题）、**deep**（将持久事实提升到 `MEMORY.md`）。只有 deep 会写入 `MEMORY.md`。

- 通过 `plugins.entries.memory-core.config.dreaming.enabled: true` 启用（默认 `false`）；`memory-core` 会自动管理清扫 cron 任务，无需手动 `openclaw cron add`。
- 可在聊天中使用 `/dreaming on|off` 切换；使用 `/dreaming status` 查看状态（或 `/dreaming`/`/dreaming help`）。`on`/`off` 需要频道拥有者状态或网关 `operator.admin` 权限；`status` 和帮助对任何能调用该命令的人都可用。
- 人类可读的阶段输出写入 `DREAMS.md`（或已存在的 `dreams.md`）。默认情况下（`dreaming.storage.mode: "separate"`）每个阶段还会写入一份独立报告到 `memory/dreaming/<phase>/YYYY-MM-DD.md`；将 `mode:
"inline"`` 设为将报告合并到每日记忆文件中，或者设为 `"both"` 则两者都写。
- 计划运行和手动 `memory promote` 运行共享相同的 deep 阶段排名信号；只有默认阈值不同（见上表与下方计划默认值）。
- 计划运行会分发到每个已配置代理的记忆工作区。

计划默认值（`plugins.entries.memory-core.config.dreaming`）：

| 键                                     | 默认值      |
| -------------------------------------- | ----------- |
| `frequency`                            | `0 3 * * *` |
| `phases.deep.minScore`                 | `0.8`       |
| `phases.deep.minRecallCount`         | `3`         |
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

完整键列表和阶段详情：[Dreaming](/concepts/dreaming)，
[Memory config reference](/reference/memory-config#dreaming)。

## SecretRef 网关依赖

如果活动内存远程 API key 字段配置为 SecretRefs，`memory`
命令会从活动网关快照中解析它们；如果网关不可用，该命令会快速失败。这要求网关支持
`secrets.resolve` 方法；较旧的网关会返回 unknown-method 错误。

## 相关

- [CLI 参考](/cli)
- [内存概览](/concepts/memory)
