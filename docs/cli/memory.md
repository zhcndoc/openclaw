---
summary: "openclaw memory 的 CLI 参考（status/index/search/promote/promote-explain/rem-harness）"
read_when:
  - 你想索引或搜索语义记忆
  - 你在排查记忆可用性或索引问题
  - 你想把回忆到的短期记忆提升到 `MEMORY.md`
title: "记忆"
---

# `openclaw memory`

管理语义记忆的索引与搜索。  
由随附的 `memory-core` 插件提供。当 `plugins.slots.memory` 选择 `memory-core`（默认值）时，该命令可用；其他记忆插件会公开它们自己的 CLI 命名空间。

相关内容：

- 记忆概念：[Memory](/concepts/memory)
- 记忆 Wiki：[Memory Wiki](/plugins/memory-wiki)
- Wiki CLI：[wiki](/cli/wiki)
- 插件：[Plugins](/tools/plugin)

## 示例

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory status --fix
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory promote --limit 10 --min-score 0.75
openclaw memory promote --apply
openclaw memory promote --json --min-recall-count 0 --min-unique-queries 0
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
openclaw memory rem-harness
openclaw memory rem-harness --json
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 选项

`memory status` 和 `memory index`：

- `--agent <id>`：限定到单个 agent。若不指定，这些命令会针对每个已配置的 agent 运行；如果未配置 agent 列表，则回退到默认 agent。
- `--verbose`：在探测和索引过程中输出详细日志。

`memory status`：

- `--deep`: 探测本地向量存储就绪状态、embedding 提供者就绪状态，以及语义向量搜索就绪状态。普通的 `memory status` 保持快速，不会执行实时 embedding 或提供者发现工作；未知的向量存储或语义向量状态表示该命令中未对其进行探测。QMD 词法 `searchMode: "search"` 会跳过语义向量探测和 embedding 维护，即使使用 `--deep` 也是如此。
- `--index`：如果存储是脏的，则执行重新索引（隐含 `--deep`）。
- `--fix`：修复过期的回忆锁并规范化提升元数据。
- `--json`：打印 JSON 输出。

如果 `memory status` 显示 `Dreaming status: blocked`，说明受管的 dreaming 定时任务已启用，但驱动它的 heartbeat 没有为默认 agent 触发。有关两种常见原因，请参见 [Dreaming never runs](/concepts/dreaming#dreaming-never-runs-status-shows-blocked)。

`memory index`：

- `--force`：强制完整重新索引。

`memory search`：

- 查询输入：可传入位置参数 `[query]` 或 `--query <text>`。
- 如果两者都提供，则以 `--query` 为准。
- 如果两者都未提供，命令会以错误退出。
- `--agent <id>`：限定到单个 agent（默认：默认 agent）。
- `--max-results <n>`：限制返回结果数量。
- `--min-score <n>`：过滤掉低分匹配。
- `--json`：输出 JSON 结果。

`memory promote`：

预览并应用短期记忆提升。

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- 将提升结果写入 `MEMORY.md`（默认：仅预览）。
- `--limit <n>` -- 限制显示的候选项数量。
- `--include-promoted` -- 包含此前周期中已提升的条目。

完整选项：

- 使用加权提升信号（`frequency`、`relevance`、`query diversity`、`recency`、`consolidation`、`conceptual richness`）对来自 `memory/YYYY-MM-DD.md` 的短期候选项进行排序。
- 使用来自记忆回忆与每日摄取流程的短期信号，以及 light/REM 阶段的强化信号。
- 启用 dreaming 时，`memory-core` 会自动管理一个定时任务，在后台执行完整扫描（`light -> REM -> deep`）（无需手动执行 `openclaw cron add`）。
- `--agent <id>`：限定到单个 agent（默认：默认 agent）。
- `--limit <n>`：返回/应用的最大候选数量。
- `--min-score <n>`：最小加权提升分数。
- `--min-recall-count <n>`：候选项所需的最小回忆次数。
- `--min-unique-queries <n>`：候选项所需的最小不同查询数。
- `--apply`：将选中的候选项追加到 `MEMORY.md` 并标记为已提升。
- `--include-promoted`：在输出中包含已提升的候选项。
- `--json`：输出 JSON。

`memory promote-explain`：

解释一个特定的提升候选项及其分数拆解。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`：要查找的候选键、路径片段或摘录片段。
- `--agent <id>`：限定到单个 agent（默认：默认 agent）。
- `--include-promoted`：包含已提升的候选项。
- `--json`：输出 JSON。

`memory rem-harness`：

预览 REM 反思、候选真值以及深度提升输出，但不写入任何内容。

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`：限定到单个 agent。
- `--include-promoted`：包含已提升的深度候选项。
- `--json`：输出 JSON。

## Dreaming

Dreaming 是后台记忆巩固系统，包含三个协同  
阶段：**light**（对短期材料进行排序/分层）、**deep**（将持久  
事实提升到 `MEMORY.md`）、以及 **REM**（反思并呈现主题）。

- 通过 `plugins.entries.memory-core.config.dreaming.enabled: true` 启用。
- 可通过聊天使用 `/dreaming on|off` 切换（或使用 `/dreaming status` 查看）。
- Dreaming 运行在一个受管的扫描计划（`dreaming.frequency`）上，并按顺序执行各阶段：light、REM、deep。
- 只有 deep 阶段会将持久记忆写入 `MEMORY.md`。
- 可读的人类可见阶段输出和日记条目会写入 `DREAMS.md`（或现有的 `dreams.md`），可选地还会在 `memory/dreaming/<phase>/YYYY-MM-DD.md` 中写入每阶段报告。
- 排名使用加权信号：回忆频率、检索相关性、查询多样性、时间新近性、跨日巩固，以及派生的概念丰富度。
- 提升会在写入 `MEMORY.md` 之前重新读取实时的每日笔记，因此已编辑或已删除的短期片段不会因过时的回忆存储快照而被提升。
- 计划任务和手动 `memory promote` 运行共享相同的 deep 阶段默认值，除非你传入 CLI 阈值覆盖。
- 自动运行会分散到已配置的记忆工作区。

默认调度：

- **扫描频率**：`dreaming.frequency = 0 3 * * *`
- **深度阈值**：`minScore=0.8`, `minRecallCount=3`, `minUniqueQueries=3`, `recencyHalfLifeDays=14`, `maxAgeDays=30`

示例：

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

注意：

- `memory index --verbose` 会输出各阶段详细信息（provider、model、sources、批处理活动）。
- `memory status` 会包含通过 `memorySearch.extraPaths` 配置的任何额外路径。
- 如果有效启用的 memory 远程 API key 字段被配置为 SecretRefs，则该命令会从当前 gateway 快照中解析这些值。如果 gateway 不可用，命令会快速失败。
- gateway 版本偏差说明：此命令路径要求 gateway 支持 `secrets.resolve`；较旧的 gateway 会返回 unknown-method 错误。
- 可通过 `dreaming.frequency` 调整计划扫描频率。deep 提升策略本身由内部控制；当你需要一次性的手动覆盖时，请在 `memory promote` 上使用 CLI 标志。
- `memory rem-harness --path <file-or-dir> --grounded` 会在不写入任何内容的情况下，预览基于历史每日笔记的 grounded `What Happened`、`Reflections` 和 `Possible Lasting Updates`。
- `memory rem-backfill --path <file-or-dir>` 会将可回滚的 grounded 日记条目写入 `DREAMS.md` 供 UI 审阅。
- `memory rem-backfill --path <file-or-dir> --stage-short-term` 还会将 grounded 的持久候选项注入实时短期提升存储，以便正常的 deep 阶段对其排序。
- `memory rem-backfill --rollback` 会移除之前写入的 grounded 日记条目，`memory rem-backfill --rollback-short-term` 会移除之前暂存的 grounded 短期候选项。
- 有关完整的阶段说明和配置参考，请参见 [Dreaming](/concepts/dreaming)。

## 相关

- [CLI reference](/cli)
- [Memory overview](/concepts/memory)
