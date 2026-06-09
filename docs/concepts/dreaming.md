---
summary: "带有轻度、深度和 REM 阶段以及梦境日记的后台记忆巩固"
title: "做梦"
sidebarTitle: "做梦"
read_when:
  - 你希望记忆提升自动运行
  - 你想了解每个做梦阶段的作用
  - 你想在不污染 MEMORY.md 的情况下调整巩固流程
---

做梦是 `memory-core` 中的后台记忆巩固系统。它帮助 OpenClaw 将强烈的短期信号转化为持久记忆，同时保持过程可解释、可审查。

<Note>
做梦默认是**可选开启**的，并且默认禁用。
</Note>

## 做梦会写入什么

做梦保留两类输出：

- `memory/.dreams/` 中的**机器状态**（回忆存储、阶段信号、摄取检查点、锁）。
- `DREAMS.md`（或现有的 `dreams.md`）中的**人类可读输出**，以及位于 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下的可选阶段报告文件。

长期提升仍然只写入 `MEMORY.md`。

## 阶段模型

做梦使用三个协作阶段：

| 阶段 | 目的                                   | 持久写入           |
| ----- | -------------------------------------- | ------------------ |
| Light | 对最近的短期材料进行排序和暂存         | 否                 |
| Deep  | 评分并提升可长期保留的候选项           | 是（`MEMORY.md`）  |
| REM   | 反思主题和重复出现的想法               | 否                 |

这些阶段是内部实现细节，不是独立的、由用户配置的“模式”。

<AccordionGroup>
  <Accordion title="Light phase">
    轻度阶段会摄取最近的日常记忆信号和回忆轨迹，对它们去重，并暂存候选行。

    - 在可用时，从短期回忆状态、最近的日常记忆文件以及已脱敏的会话转录中读取。
    - 当存储包含内联输出时，会写入一个受管理的 `## Light Sleep` 区块。
    - 为后续深度排序记录强化信号。
    - 从不写入 `MEMORY.md`。

  </Accordion>
  <Accordion title="Deep phase">
    深度阶段决定哪些内容会成为长期记忆。

    - 使用加权评分和阈值门槛对候选项进行排序。
    - 需要通过 `minScore`、`minRecallCount` 和 `minUniqueQueries`。
    - 在写入前，会从实时日常文件中重新加载片段，因此过期/已删除的片段会被跳过。
    - 将提升后的条目追加到 `MEMORY.md`。
    - 将 `## Deep Sleep` 摘要写入 `DREAMS.md`，并可选地写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
  <Accordion title="REM phase">
    REM 阶段会提取模式和反思信号。

    - 基于最近的短期轨迹生成主题和反思摘要。
    - 当存储包含内联输出时，会写入一个受管理的 `## REM Sleep` 区块。
    - 记录供深度排序使用的 REM 强化信号。
    - 从不写入 `MEMORY.md`。

  </Accordion>
</AccordionGroup>

## 会话转录摄取

做梦可以将已脱敏的会话转录摄取到做梦语料中。当转录可用时，它们会与日常记忆信号和回忆轨迹一起输入轻度阶段。摄取前会先脱敏个人和敏感内容。

## 梦境日记

做梦还会在 `DREAMS.md` 中保留一份叙事性的 **Dream Diary**。每个阶段积累到足够材料后，`memory-core` 会运行一次尽力而为的后台子代理回合，并追加一条简短的日记条目。默认会使用运行时模型，除非配置了 `dreaming.model`。如果配置的模型不可用，Dream Diary 会使用会话默认模型重试一次。

<Note>
这份日记供 Dreams UI 中的人类阅读，不是提升来源。做梦生成的日记/报告工件会被排除在短期提升之外。只有有依据的记忆片段才有资格提升到 `MEMORY.md`。
</Note>

此外还有一条用于审查和恢复工作的有依据历史回填通道：

<AccordionGroup>
  <Accordion title="Backfill commands">
    - `memory rem-harness --path ... --grounded` 会预览来自历史 `YYYY-MM-DD.md` 笔记的有依据日记输出。
    - `memory rem-backfill --path ...` 会将可逆的有依据日记条目写入 `DREAMS.md`。
    - `memory rem-backfill --path ... --stage-short-term` 会将有依据的、可持久化的候选项暂存到正常深度阶段已经使用的同一短期证据存储中。
    - `memory rem-backfill --rollback` 和 `--rollback-short-term` 会移除这些已暂存的回填工件，而不会影响普通日记条目或实时短期回忆。

  </Accordion>
</AccordionGroup>

控制 UI 也提供相同的日记回填/重置流程，因此你可以先在 Dreams 场景中检查结果，再决定这些有依据的候选项是否值得提升。该场景还展示了一个独立的有依据通道，这样你就能看到哪些已暂存的短期条目来自历史重放、哪些已提升项目是由有依据内容驱动的，并且可以只清除仅有依据的暂存条目，而不影响普通的实时短期状态。

## 深度排序信号

深度排序使用六个加权基础信号以及阶段强化：

| 信号                | 权重  | 描述                                       |
| ------------------- | ----- | ------------------------------------------ |
| Frequency          | 0.24  | 该条目累积了多少短期信号                   |
| Relevance          | 0.30  | 该条目的平均检索质量                     |
| Query diversity    | 0.15  | 使其浮现的不同查询/日期上下文数量         |
| Recency            | 0.15  | 随时间衰减的新鲜度得分                   |
| Consolidation      | 0.10  | 多日重复出现的强度                       |
| Conceptual richness | 0.06  | 来自片段/路径的概念标签密度              |

Light 和 REM 阶段命中会从 `memory/.dreams/phase-signals.json` 中增加一个小幅、随时间衰减的提升。

Shadow-trial results can be layered on top of that base score as a review
signal before any durable write. A helpful trial gives the candidate a small
bounded boost, a neutral trial keeps it deferred, and a harmful trial marks it
as rejected for that scoring pass. This signal is still report-only: it can
change candidate ordering or review metadata, but it does not write to
`MEMORY.md` or promote the candidate by itself.

## QA shadow trial report coverage

QA 实验室包含一个仅报告的场景，用于探索未来的做梦 shadow trial 如何在提升前审查候选记忆。该场景会要求一个代理比较基线答案与一个可以使用候选记忆的答案，然后写出一份本地报告，包含结论、原因和风险标记。

这部分覆盖范围有意限定在 QA 中。它验证报告工件会与 `MEMORY.md` 分离，并且代理不会声称候选项已被提升。它不会添加生产环境的 shadow-trial 行为，也不会更改深度阶段的提升引擎。

The `memory-core` shadow-trial runner keeps that same report-only contract for
code paths that need a stable artifact. It accepts the candidate, trial prompt,
baseline outcome, candidate outcome, verdict, reason, risk flags, and evidence
references, then writes a report with `promotion action: report-only`. Helpful
verdicts map to a `promote` recommendation, neutral verdicts map to `defer`, and
harmful verdicts map to `reject`; none of those recommendations writes to
`MEMORY.md` or applies deep-phase promotion.

## Scheduling

启用后，`memory-core` 会自动管理一个用于完整做梦扫描的 cron 任务。每次扫描按顺序运行各阶段：light → REM → deep。

扫描会包含主运行时工作区以及任何已配置的代理工作区，并按路径去重，因此子代理工作区的扩散不会排除主代理的 `DREAMS.md` 和记忆状态。

默认频率行为：

| 设置                 | 默认值        |
| -------------------- | ------------- |
| `dreaming.frequency` | `0 3 * * *`   |
| `dreaming.model`     | 默认模型      |

## 快速开始

<Tabs>
  <Tab title="启用做梦">
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
  </Tab>
  <Tab title="自定义扫描频率">
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
  </Tab>
</Tabs>

## Slash 命令

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI 工作流

<Tabs>
  <Tab title="提升预览 / 应用">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    默认情况下，手动 `memory promote` 会使用深度阶段阈值，除非通过 CLI 标志进行覆盖。

  </Tab>
  <Tab title="解释提升">
    解释为什么某个特定候选项会或不会被提升：

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab title="REM harness 预览">
    预览 REM 反思、候选事实和深度提升输出，而不写入任何内容：

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## 关键默认值

所有设置都位于 `plugins.entries.memory-core.config.dreaming` 下。

<ParamField path="enabled" type="boolean" default="false">
  启用或禁用做梦扫描。
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  完整做梦扫描的 cron 频率。
</ParamField>
<ParamField path="model" type="string">
  可选的 Dream Diary 子代理模型覆盖。若同时设置了子代理 `allowedModels` 允许列表，请使用规范的 `provider/model` 值。
</ParamField>
<ParamField path="phases.deep.maxPromotedSnippetTokens" type="number" default="160">
  Maximum estimated token count kept from each short-term recall snippet promoted into `MEMORY.md`. Ranking provenance remains visible.
</ParamField>

<Warning>
`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。若要限制它，还要设置 `plugins.entries.memory-core.subagent.allowedModels`。信任或允许列表失败会保持可见，而不会静默回退；重试只覆盖模型不可用错误。
</Warning>

<Note>
Most phase policy, thresholds, and storage behavior are internal implementation details. See [Memory configuration reference](/reference/memory-config#dreaming) for the full key list.
</Note>

## Dreams UI

启用后，Gateway 的 **Dreams** 标签页会显示：

- 当前做梦是否启用
- 阶段级状态和受管理扫描是否存在
- 短期、有依据、信号以及今日已提升数量
- 下次计划运行时间
- 一个独立的有依据 Scene 通道，用于暂存历史重放条目
- 一个由 `doctor.memory.dreamDiary` 支持的可展开 Dream Diary 阅读器

## 做梦从不运行：状态显示被阻止

如果 `openclaw memory status` 报告 `Dreaming status: blocked`，说明受管理的 cron 已存在，但默认代理的心跳未触发。请检查默认代理是否已启用心跳，以及其目标是否不是 `none`，然后在下一个心跳间隔后再次运行 `openclaw memory status --deep`。

## 相关内容

- [记忆](/concepts/memory)
- [Memory CLI](/cli/memory)
- [记忆配置参考](/reference/memory-config)
- [记忆搜索](/concepts/memory-search)
