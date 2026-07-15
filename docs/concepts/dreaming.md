---
summary: "带有轻度、深度和 REM 阶段以及梦境日记的后台记忆巩固"
title: "做梦"
sidebarTitle: "做梦"
read_when:
  - 你希望记忆提升自动运行
  - 你想了解每个做梦阶段的作用
  - 你想在不污染 MEMORY.md 的情况下调整巩固流程
---

做梦是 `memory-core` 中的后台记忆巩固系统。它会将强烈的短期信号转化为持久记忆，同时保持这一过程的可解释性和可审阅性。

<Note>
做梦默认是**可选开启**的，并且默认禁用。
</Note>

## 做梦会写入什么

- **Machine state** in `memory/.dreams/` (回忆存储、阶段信号、摄取检查点、锁)。
- **Human-readable output** in `DREAMS.md`（或已有的 `dreams.md`）以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下可选的阶段报告文件。

长期提升仍然只写入 `MEMORY.md`。

## 阶段模型

Dreaming 每次扫描会按顺序执行三个协作阶段：light -> REM -> deep。这些是内部实现阶段，不是用户可单独配置的模式。

| 阶段  | 目的                                      | 持久写入          |
| ----- | ----------------------------------------- | ----------------- |
| Light | 对近期短期材料进行排序和整理                | 否                |
| REM   | 反思主题和重复出现的想法                    | 否                |
| Deep  | 对持久候选项进行评分并提升                   | 是（`MEMORY.md`） |

<AccordionGroup>
  <Accordion title="Light 阶段">
    - 读取近期短期回忆状态、每日记忆文件，以及可用时的脱敏会话转录。
    - 去重信号并整理候选行。
    - 当存储包含行内输出时，写入受管理的 `## Light Sleep` 块。
    - 记录强化信号，供后续 deep 排名使用。
    - 从不写入 `MEMORY.md`。

  </Accordion>
  <Accordion title="REM 阶段">
    - 基于近期短期轨迹构建主题和反思摘要。
    - 当存储包含行内输出时，写入受管理的 `## REM Sleep` 块。
    - 记录供 deep 排名使用的 REM 强化信号。
    - 从不写入 `MEMORY.md`。

  </Accordion>
  <Accordion title="Deep 阶段">
    - 使用加权评分和阈值门槛对候选项进行排序（`minScore`、`minRecallCount`、`minUniqueQueries` 必须全部通过）。
    - 在写入前从实时每日文件中重新加载片段，因此会跳过过时/已删除的片段。
    - 将晋升的条目追加到 `MEMORY.md`。
    - 将 `## Deep Sleep` 摘要写入 `DREAMS.md`，并可选写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
</AccordionGroup>

## 会话转录摄取

Dreaming 可以将已脱敏的会话转录摄取到 dreaming 语料库中。若可用，转录内容会与每日记忆信号和回忆痕迹一起输入到 light phase。个人和敏感内容会在摄取前被脱敏处理。

## 梦境日记

Dreaming 会在 `DREAMS.md` 中保留一份叙事性的 **Dream Diary**。在每个阶段积累了足够素材后，`memory-core` 会运行一次尽力而为的后台子代理轮次，并追加一条简短的日记条目，使用默认运行时模型，除非配置了 `dreaming.model`。如果配置的模型不可用，日记运行会使用会话默认模型重试一次；信任或允许列表失败不会重试，并会继续在日志中可见，而不是静默回退为通用的日记条目。

<Note>
这份日记供人类在 Dreams UI 中阅读，不是晋升来源。日记/报告产物会被排除在短期晋升之外；只有有依据的记忆片段才有资格晋升到 `MEMORY.md`。
</Note>

此外还有一条用于审查和恢复工作的有依据历史回填通道：

<AccordionGroup>
  <Accordion title="回填命令">
    - `memory rem-harness --path ... --grounded` 会预览来自历史 `YYYY-MM-DD.md` 笔记的有依据日记输出。
    - `memory rem-backfill --path ...` 会将可逆的有依据日记条目写入 `DREAMS.md`。
    - `memory rem-backfill --path ... --stage-short-term` 会把有依据的持久候选项暂存到正常深度阶段使用的同一短期证据存储中。
    - `memory rem-backfill --rollback` 和 `--rollback-short-term` 会移除这些已暂存的回填产物，而不会影响普通日记条目或实时短期回忆。

  </Accordion>
</AccordionGroup>

控制 UI 在代理的 Memory 选项卡（Agents 页面）中提供相同的日记回填/重置流程，因此你可以在梦境场景中检查结果，再决定有依据的候选项是否值得晋升。一个独立的、有依据的 Scene 轨道会显示哪些已暂存的短期条目来自历史回放，哪些已晋升项目是由有依据内容引导的，并且允许你只清除仅限有依据的已暂存条目，而不会影响实时短期状态。

## 深度排序信号

深度排序使用六个加权基础信号以及阶段强化：

| 信号              | 权重   | 描述                                       |
| ------------------- | ------ | ------------------------------------------ |
| 相关性             | 0.30   | 该条目的平均检索质量                         |
| 频率               | 0.24   | 该条目累积了多少短期信号                     |
| 查询多样性         | 0.15   | 触发它的不同 query/day 上下文                |
| 新近性             | 0.15   | 随时间衰减的新鲜度得分                       |
| 聚合度             | 0.10   | 多日重复出现的强度                           |
| 概念丰富度         | 0.06   | 来自 snippet/path 的概念标签密度              |

Light 和 REM 阶段命中会从 `memory/.dreams/phase-signals.json` 中增加一个小幅、随时间衰减的提升。

Shadow-trial 结果可以在任何持久写入之前，作为审查信号叠加到基础分数之上：有帮助的试验会给候选项一个小幅、受限的提升，中性的试验会使其保持延后，而有害的试验会在该次评分中将其标记为拒绝。这个信号仅用于报告——它可以改变候选项排序或审查元数据，但绝不会写入 `MEMORY.md`，也不会自行提升任何候选项。

### QA shadow trial 报告覆盖

QA Lab 包含一个仅报告的场景，用于探索未来的 dreaming shadow trial 在晋升前如何审查某个候选记忆：某个 agent 将基线答案与一个可以使用该候选记忆的答案进行比较，然后写入一份本地报告，其中包含裁决、原因和风险标记。此覆盖范围仅限于 QA——它验证报告产物与 `MEMORY.md` 保持分离，并且该 agent 从不声称候选项已被晋升。它不会添加生产环境的 shadow-trial 行为，也不会更改深度阶段的晋升引擎。

`memory-core` 的 shadow-trial 运行器对需要稳定产物的代码路径保持相同的仅报告契约。它接受候选项、试验提示、基线结果、候选结果、裁决、原因、风险标记和证据引用，然后写入一份带有 `promotion action: report-only` 的报告。有帮助的裁决映射为 `promote` 建议，中性的裁决映射为 `defer`，有害的裁决映射为 `reject`——这些都不会写入 `MEMORY.md`，也不会应用深度阶段晋升。

## 调度

启用后，`memory-core` 会自动管理一个用于完整 dreaming 扫描的 cron 任务，并在主运行时工作区以及任何已配置的代理工作区之间去重，因此子代理工作区的扩展不会排除主代理的 `DREAMS.md` 和记忆状态。

| 设置                 | 默认值        |
| -------------------- | ------------- |
| `dreaming.frequency` | `0 3 * * *`   |
| `dreaming.model`     | 默认模型      |

## Quick Start

<Tabs>
  <Tab title="Enable Dreaming">
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
  <Tab title="Custom Scan Frequency">
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

```text
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

`/dreaming on` 和 `/dreaming off` 对于频道调用者需要所有者状态，或者对于 Gateway 客户端需要 `operator.admin`。`/dreaming status` 和 `/dreaming help` 是只读的。

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
  Dream Diary 子代理模型的可选覆盖。若同时设置了子代理 `allowedModels` 允许列表，请使用规范的 `provider/model` 值。
</ParamField>
<ParamField path="phases.deep.maxPromotedSnippetTokens" type="number" default="160">
  从提升到 `MEMORY.md` 的每个短期回忆片段中保留的最大估算 token 数。排名来源仍然可见。
</ParamField>

<Warning>
`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。若要限制它，还需设置 `plugins.entries.memory-core.subagent.allowedModels`。自动重试仅覆盖模型不可用错误；信任或白名单失败会保留在日志中可见，而不会静默回退。
</Warning>

<Note>
大多数阶段策略、阈值和存储行为都是内部实现细节。有关完整键列表，请参见 [Memory 配置参考](/reference/memory-config#dreaming)。
</Note>

## Dreams UI

启用后，Gateway 的 **Dreams** 标签页会显示：

- 当前做梦是否启用
- 阶段级状态和受管理扫描是否存在
- 短期、有依据、信号以及今日已提升数量
- 下次计划运行时间
- 一个独立的有依据 Scene 通道，用于暂存历史重放条目
- 一个由 `doctor.memory.dreamDiary` 支持的可展开 Dream Diary 阅读器

## 相关

- [记忆](/concepts/memory)
- [Memory CLI](/cli/memory)
- [记忆配置参考](/reference/memory-config)
- [记忆搜索](/concepts/memory-search)
