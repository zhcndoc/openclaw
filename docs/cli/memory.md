---
summary: "`openclaw memory` 的命令行接口参考文档 (status/index/search/promote/promote-explain/rem-harness)"
read_when:
  - 你想要索引或搜索语义记忆
  - 你正在调试记忆可用性或索引
  - 你想将召回的短期记忆提升到 `MEMORY.md`
title: "记忆"
---

# `openclaw memory`

管理语义记忆的索引和搜索功能。  
由当前激活的记忆插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 可禁用）。

相关内容：

- Memory concept: [Memory](/concepts/memory)
- Memory wiki: [Memory Wiki](/plugins/memory-wiki)
- Wiki CLI: [wiki](/cli/wiki)
- Plugins: [Plugins](/tools/plugin)

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

- `--agent <id>`：限定操作范围为单个代理。若未指定，则命令对所有已配置代理执行；如果没有已配置的代理列表，则回退到默认代理。
- `--verbose`：在探测和索引过程中输出详细日志。

`memory status`：

- `--deep`: 探测向量 + 嵌入可用性。
- `--index`: 如果存储库不干净则运行重新索引（隐含 `--deep`）。
- `--fix`: 修复过期的召回锁并规范化提升元数据。
- `--json`: 打印 JSON 输出。

如果 `memory status` 显示 `Dreaming status: blocked`，则说明受管的 dreaming cron 已启用，但驱动它的 heartbeat 对默认代理未在触发。有关两个常见原因，请参见 [Dreaming never runs](/concepts/dreaming#dreaming-never-runs-status-shows-blocked)。

`memory index`:

- `--force`：强制进行完整重新索引。

`memory search`：

- 查询输入：可以传入位置参数 `[query]` 或 `--query <text>`。
- 如果两者都提供，以 `--query` 为准。
- 如果均未提供，命令会报错退出。
- `--agent <id>`：限定操作范围为单个代理（默认：默认代理）。
- `--max-results <n>`：限制返回结果数量。
- `--min-score <n>`：过滤低分匹配项。
- `--json`：打印 JSON 格式结果。

`memory promote`:

预览并应用短期记忆提升。

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- 将提升内容写入 `MEMORY.md`（默认：仅预览）。
- `--limit <n>` -- 限制显示的候选数量。
- `--include-promoted` -- 包含之前在周期中已提升的条目。

完整选项：

- 使用加权提升信号（`frequency`、`relevance`、`query diversity`、`recency`、`consolidation`、`conceptual richness`）对 `memory/YYYY-MM-DD.md` 中的短期候选项进行排名。
- 使用来自记忆召回和每日摄入过程的短期信号，以及 light/REM 阶段强化信号。
- 当启用梦境时，`memory-core` 自动管理一个后台运行的完整扫描 cron 任务（`light -> REM -> deep`）（无需手动 `openclaw cron add`）。
- `--agent <id>`: 限定范围为单个代理（默认：默认代理）。
- `--limit <n>`: 返回/应用的最大候选数。
- `--min-score <n>`: 最小加权提升分数。
- `--min-recall-count <n>`: 候选项所需的最小召回次数。
- `--min-unique-queries <n>`: 候选项所需的最小不同查询次数。
- `--apply`: 将选定的候选项追加到 `MEMORY.md` 并标记为已提升。
- `--include-promoted`: 在输出中包含已提升的候选项。
- `--json`: 打印 JSON 输出。

`memory promote-explain`:

解释特定的提升候选项及其得分明细。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`：要查找的候选项键、路径片段或内容片段。
- `--agent <id>`：限定范围为单个代理（默认：默认代理）。
- `--include-promoted`：包含已提升的候选项。
- `--json`：打印 JSON 输出。

`memory rem-harness`:

预览 REM 反思、候选真理和深度提升输出，而不写入任何内容。

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`：限定范围为单个代理（默认：默认代理）。
- `--include-promoted`：包含已提升的深度候选项。
- `--json`：打印 JSON 输出。

## Dreaming（梦境）

梦境是后台记忆巩固系统，具有三个协作阶段：**light**（排序/暂存短期材料）、**deep**（将持久事实提升为 `MEMORY.md`）和 **REM**（反思并呈现主题）。

- 通过 `plugins.entries.memory-core.config.dreaming.enabled: true` 启用。
- 在聊天中通过 `/dreaming on|off` 切换（或通过 `/dreaming status` 检查）。
- 梦境在一个管理的扫描计划（`dreaming.frequency`）上运行，并按顺序执行阶段：light、REM、deep。
- 只有 deep 阶段将持久记忆写入 `MEMORY.md`。
- 人类可读的阶段输出和日记条目写入 `DREAMS.md`（或现有的 `dreams.md`），可选的每阶段报告位于 `memory/dreaming/<phase>/YYYY-MM-DD.md`。
- 排名使用加权信号：召回频率、检索相关性、查询多样性、时间近期性、跨天巩固和衍生概念丰富度。
- 提升在写入 `MEMORY.md` 之前会重新读取实时每日笔记，因此编辑或删除的短期片段不会从过期的召回存储快照中提升。
- 计划和手动的 `memory promote` 运行共享相同的 deep 阶段默认值，除非你传递 CLI 阈值覆盖。
- 自动运行会在配置的记忆工作空间中展开。

默认调度：

- **扫描节奏**: `dreaming.frequency = 0 3 * * *`
- **Deep 阈值**: `minScore=0.8`, `minRecallCount=3`, `minUniqueQueries=3`, `recencyHalfLifeDays=14`, `maxAgeDays=30`

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

- `memory index --verbose` 打印每个阶段的详细信息（提供方、模型、来源、批处理活动）。
- `memory status` 包括通过 `memorySearch.extraPaths` 配置的任何额外路径。
- 如果当前有效的 memory 远程 API key 字段配置为 SecretRef，则命令会从当前活动的 gateway 快照中解析这些值。如果 gateway 不可用，命令会快速失败。
- gateway 版本偏差提示：此命令路径要求 gateway 支持 `secrets.resolve`；较旧的 gateway 会返回未知方法错误。
- 通过 `dreaming.frequency` 调整计划清扫频率。Deep 提升策略其余部分为内部实现；当你需要一次性的手动覆盖时，请在 `memory promote` 上使用 CLI 标志。
- `memory rem-harness --path <file-or-dir> --grounded` 会预览基于历史日记的接地 `What Happened`、`Reflections` 和 `Possible Lasting Updates`，而不写入任何内容。
- `memory rem-backfill --path <file-or-dir>` 会将可回滚的接地日记条目写入 `DREAMS.md` 供 UI 审阅。
- `memory rem-backfill --path <file-or-dir> --stage-short-term` 还会将接地的持久候选项播种到实时短期提升存储中，以便正常的 deep 阶段对它们进行排名。
- `memory rem-backfill --rollback` 会移除之前写入的接地日记条目，而 `memory rem-backfill --rollback-short-term` 会移除之前暂存的接地短期候选项。
- 有关完整阶段说明和配置参考，请参见 [Dreaming](/concepts/dreaming)。

## Related

- [CLI reference](/cli)
- [Memory overview](/concepts/memory)
