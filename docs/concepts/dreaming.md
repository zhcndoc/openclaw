---
summary: "带有浅睡、深睡和 REM 阶段以及梦境日记的后台记忆巩固"
title: "做梦"
read_when:
  - 你希望记忆提升自动运行
  - 你想了解每个梦境阶段的作用
  - 你想调整巩固过程而不污染 MEMORY.md
---

Dreaming 是 `memory-core` 中的后台记忆巩固系统。  
它帮助 OpenClaw 将强烈的短期信号迁移到持久记忆中，同时保持整个过程可解释、可审查。

Dreaming 是**可选启用**的，默认情况下处于禁用状态。

## Dreaming 写入的内容

Dreaming 保留两种输出：

- **机器状态**位于 `memory/.dreams/`（回忆存储、阶段信号、摄入检查点、锁）。
- **人类可读输出**位于 `DREAMS.md`（或现有的 `dreams.md`）以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下的可选阶段报告文件。

长期提升仍然只写入 `MEMORY.md`。

## 阶段模型

Dreaming 使用三个协作阶段：

| 阶段 | 目的 | 持久写入 |
| ----- | ----------------------------------------- | ----------------- |
| 浅睡 | 排序和暂存近期短期材料 | 否 |
| 深睡 | 评分并提升持久候选项 | 是（`MEMORY.md`） |
| REM | 反思主题和重复想法 | 否 |

这些阶段是内部实现细节，不是单独的用户配置
“模式”。

### 浅睡阶段

浅睡阶段摄入近期的每日记忆信号和回忆轨迹，对其进行去重，  
并暂存候选行。

- 从短期回忆状态、最近的每日记忆文件以及可用的脱敏会话记录中读取。
- 当存储包含内联输出时，写入一个受管理的 `## Light Sleep` 块。
- 记录用于后续深度排名的强化信号。
- 永不写入 `MEMORY.md`。

### 深睡阶段

深睡阶段决定什么成为长期记忆。

- 使用加权评分和阈值门限对候选项进行排名。
- 需要通过 `minScore`、`minRecallCount` 和 `minUniqueQueries`。
- 在写入之前从实时每日文件重新加载片段，因此跳过过时/已删除的片段。
- 将提升的条目追加到 `MEMORY.md`。
- 将 `## Deep Sleep` 摘要写入 `DREAMS.md`，并可选地写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

### REM 阶段

REM 阶段提取模式和反思信号。

- 从近期短期轨迹构建主题和反思摘要。
- 当存储包含内联输出时，写入一个受管理的 `## REM Sleep` 块。
- 记录深睡排名使用的 REM 强化信号。
- 从不写入 `MEMORY.md`。

## 会话记录摄取

Dreaming 还在 `DREAMS.md` 中保留一个叙事性的 **梦境日记**。在每个阶段拥有足够材料后，`memory-core` 运行一个尽最大努力的后台子代理回合，并追加一个简短的日记条目。它使用默认运行时模型，除非配置了 `dreaming.model`。

## 梦境日记

Dreaming 还在 `DREAMS.md` 中保留一个叙事性的**梦境日记**。  
在每个阶段拥有足够材料后，`memory-core` 运行一个尽最大努力的后台  
子代理回合（使用默认运行时模型），并追加一个简短的日记条目。

本日记供人类在 Dreams UI 中阅读，**不是**推广来源。  
Dreaming 生成的日记/报告工件不会被纳入短期推广。  
只有有依据的记忆片段才有资格被推广到 `MEMORY.md`。

还有一个用于审查和恢复工作的有依据的历史回填通道：

- `memory rem-harness --path ... --grounded` 预览来自历史 `YYYY-MM-DD.md` 笔记的有依据的日记输出。
- `memory rem-backfill --path ...` 将可逆转的有依据日记条目写入 `DREAMS.md`。
- `memory rem-backfill --path ... --stage-short-term` 将有依据的持久候选项暂存到与正常深度阶段相同的短期证据存储中。
- `memory rem-backfill --rollback` 和 `--rollback-short-term` 移除那些暂存的回填工件，而不影响普通的日记条目或实时的短期回忆。

控制界面提供了相同的日记回填/重置流程，以便你可以在 Dreams 场景中检查结果，再决定是否将有依据的候选条目提升。场景还展示了一个独立的有依据通道，让你看到哪些暂存的短期条目来自历史回放，哪些提升项是由有依据引导的，并可以清除仅由有依据引导的暂存条目，而不影响正常的实时短期状态。

## 深度排名信号

深度排名使用六个加权基础信号加上阶段强化：

| 信号 | 权重 | 描述 |
| ------------------- | ------ | ------------------------------------------------- |
| 频率 | 0.24 | 条目积累多少短期信号 |
| 相关性 | 0.30 | 条目的平均检索质量 |
| 查询多样性 | 0.15 | 浮现该条目的不同查询/日期上下文 |
| 近期性 | 0.15 | 时间衰减的新鲜度评分 |
| 巩固性 | 0.10 | 多日重复强度 |
| 概念丰富度 | 0.06 | 来自片段/路径的概念标签密度 |

浅睡和 REM 阶段命中会从  
`memory/.dreams/phase-signals.json` 添加一个小的近期性衰减提升。

## 调度

启用后，`memory-core` 自动管理一个用于完整梦境  
扫描的 cron 作业。每次扫描按顺序运行阶段：light -> REM -> deep。

默认节奏行为：

| Setting              | Default       |
| -------------------- | ------------- |
| `dreaming.frequency` | `0 3 * * *`   |
| `dreaming.model`     | default model |

## 快速开始

启用 dreaming：

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

使用自定义扫描节奏启用 dreaming：

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "timezone": "America/Los_Angeles",
            "frequency": "0 */6 * * *"
          }
        }
      }
    }
  }
}
```

## 斜杠命令

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI 工作流

使用 CLI 提升进行预览或手动应用：

```bash
openclaw memory promote
openclaw memory promote --apply
openclaw memory promote --limit 5
openclaw memory status --deep
```

手动 `memory promote` 默认使用深睡阶段阈值，除非被  
CLI 标志覆盖。

解释特定候选项为何会被提升或不会被提升：

```bash
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
```

预览 REM 反思、候选真理和深度提升输出，而不写入任何内容：

```bash
openclaw memory rem-harness
openclaw memory rem-harness --json
```

## 关键默认值

所有设置都位于 `plugins.entries.memory-core.config.dreaming` 下。

<ParamField path="enabled" type="boolean" default="false">
  启用或禁用 dreaming 扫描。
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  完整 dreaming 扫描的 cron 频率。
</ParamField>
<ParamField path="model" type="string">
  可选的 Dream Diary 子代理模型覆盖。若同时设置子代理的 `allowedModels` 白名单，请使用规范的 `provider/model` 值。
</ParamField>

<Warning>
`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。若要限制它，还需设置 `plugins.entries.memory-core.subagent.allowedModels`。
</Warning>

阶段策略、阈值和存储行为是内部实现  
细节（非用户面向配置）。

完整键列表请参见 [记忆配置参考](/reference/memory-config#dreaming)。

## Dreams 界面

启用后，网关 **Dreams** 标签页显示：

- 当前 dreaming 是否启用
- 各阶段状态以及是否存在受管理的 sweep
- short-term、grounded、signal 和今日 promoted 的计数
- 下一次计划运行时间
- 一个单独的 grounded Scene lane，用于暂存的历史重放条目
- 一个可展开的 Dream Diary 阅读器，由 `doctor.memory.dreamDiary` 提供数据

## Related

- [Memory](/concepts/memory)
- [Memory Search](/concepts/memory-search)
- [memory CLI](/cli/memory)
- [记忆配置参考](/reference/memory-config)
