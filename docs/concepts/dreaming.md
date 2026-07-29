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
做梦默认已启用。设置
`plugins.entries.memory-core.config.dreaming.enabled: false` 可将其禁用。
</Note>

## 做梦会写入什么

- **Machine state** in `memory/.dreams/`（recall store、phase signals、ingestion checkpoints、locks）。
- 在接受 `MEMORY.md` 重写之前，SQLite 支持的插件状态中的 **Rewrite preimages**。
- `DREAMS.md`（或现有的 `dreams.md`）中的 **Human-readable output**，以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下可选的 phase report 文件。

长期提升仍然只写入 `MEMORY.md`。
每个新提升的条目都会带有从候选项派生的尾随回忆元数据：在 `<!-- trigger: phrase one, phrase two -->` 中最多三个概念标签，以及一个范围为 1 到 10 的受限 `<!-- importance: N -->` 值。整合会保持现有带注释的条目逐字节不变，除非它明确地合并或取代它们。

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
  <Accordion title="Deep phase">
    - 使用加权评分和阈值门控对候选项进行排序（`minScore`、`minRecallCount`、`minUniqueQueries` 必须全部通过）。
    - 在写入前从实时每日文件中重新获取片段，因此会跳过过时/已删除的片段。
    - 将通过门控的所有者和代理派生候选项连同当前的 `MEMORY.md` 一起传递给一个整合子代理。
    - 只有在结果保留了足够多的先前条目、包含候选来源引用并且符合引导预算时，才会重写 `MEMORY.md`。
    - 当模型不可用或重写未通过验证时，回退到之前的仅追加式提升路径。
    - 将 `## Deep Sleep` 摘要写入 `DREAMS.md`，并可选写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
</AccordionGroup>

## 会话转录摄取

Dreaming 可以将已编辑的会话转录内容摄取到 dreaming 语料库中。只有交互式会话才有资格被摄取。Cron、heartbeat、subagent 和 unknown 会话不会进入持久候选摄取。个人和敏感内容会在摄取前被编辑，而运行时标记为已召回的上下文会被移除，因此已召回的片段不会再次作为新记忆被学习。

## 整合安全性

确定性分数、召回计数和查询多样性阈值仍然是候选门槛。整合仅在这些门槛通过后运行。

在构建整合提示词之前，`memory-core` 会移除其索引来源为 `untrusted` 或 `system` 的候选项。这是一个结构性污点门槛，而不是分数惩罚。符合条件的候选项包括其来源、会话类型、观察时间、可选的后继替换键，以及日记来源引用。

被接受的重写必须：

- 保留 `phases.deep.maxPriorEntryLossFraction` 范围内的先前条目
- 包含每个被提升候选项的 `Source: path#Lx-Ly` 引用
- 保持在 `MEMORY.md` 的引导安全文件预算内
- 解析为预期的结构化响应

在文件更改之前，先前的 `MEMORY.md` 会存储在基于 SQLite 的插件状态中。`DREAMS.md` 会接收新增、合并和被替换的计数，以及简短的差异式高亮。这使得每次重写都可审查，而不会将《梦境日记》变成提升来源。

后台整合受睡眠期间计算启发（arXiv:2504.13171）。来源与反思边界遵循《Generative Agents》研究中的持久记忆框架。

## 梦境日记

Dreaming 会在 `DREAMS.md` 中保留一份叙事性的 **Dream Diary**。在每个阶段积累了足够素材后，`memory-core` 会运行一次尽力而为的后台子代理轮次，并追加一条简短的日记条目，使用默认运行时模型，除非配置了 `dreaming.model`。如果配置的模型不可用，日记运行会使用会话默认模型重试一次；信任或允许列表失败不会重试，并会继续在日志中可见，而不是静默回退为通用的日记条目。

<Note>
这份日记供人类在 Dreams UI 中阅读，不是晋升来源。日记/报告产物会被排除在短期晋升之外；只有有依据的记忆片段才有资格晋升到 `MEMORY.md`。
</Note>

此外还有一条用于审查和恢复工作的有依据历史回填通道：

<AccordionGroup>
  <Accordion title="Backfill commands">
    - `memory rem-harness --path ... --grounded` 预览来自历史 `YYYY-MM-DD.md` 笔记的有依据日记输出。
    - `memory rem-backfill --path ...` 将可逆的有依据日记条目写入 `DREAMS.md`。
    - `memory rem-backfill --path ... --stage-short-term` 将有依据的持久候选条目暂存到与正常深度阶段使用的相同短期证据存储中。
    - `memory rem-backfill --rollback` 和 `--rollback-short-term` 会移除这些已暂存的回填产物，而不会触碰普通日记条目或实时短期回忆。
    - `memory session-backfill --agent <id>` 预览来自该代理保留会话历史中的可信候选条目，按未处理的最早日期优先。
    - `memory session-backfill --agent <id> --apply` 通过正常短期存储暂存这些候选条目，并写入可逆的日记块，而不会更改 `MEMORY.md` 或 `USER.md`。
    - `memory session-backfill --agent <id> --rem` 为 `DREAMS.md` 中的每一天写入一个确定性的、有依据的预览，而不暂存候选条目或调用模型。
    - `memory session-backfill --agent <id> --rollback` 清除共享的有依据回填候选条目和日记块，包括由 `rem-backfill` 创建的产物。

  </Accordion>
</AccordionGroup>

Session backfill 使用规范化保留的转录身份，包括
跨轮换保留的会话。消息会按配置的
dreaming 时区分桶，并与实时摄取的已跟踪消息哈希和信号
上限共享，因此受限重试可以继续向前进行，而不会重新摄取先前消息。
Rollback 会移除生成的产物，但保留那些摄取检查点。
通过 `--archive-files` 提供的外来文件会被保守处理。它们
嵌入的所有权字段由调用方控制，因此仍然不受信任；
如果没有经过认证的来源契约，它们不能进入短期
暂存。工具输出、网页内容以及非所有者回合也会被排除在
规范的会话路径之外。

Control UI 在代理的 Memory 选项卡（Agents 页面）中提供相同的日记回填/重置流程，因此你可以在决定这些有依据候选条目是否值得晋升之前，先在梦境场景中检查结果。一个独立的有依据 Scene 分区会显示哪些已暂存的短期条目来自历史回放、哪些已晋升项目是 grounded-led，并允许你只清除仅有依据的已暂存条目，而不影响实时短期状态。

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

## 调度

启用后，`memory-core` 会自动管理一个用于完整 dreaming 扫描的 cron 任务，并在主运行时工作区以及任何已配置的代理工作区之间去重，因此子代理工作区的扩展不会排除主代理的 `DREAMS.md` 和记忆状态。

| 设置                 | 默认值        |
| -------------------- | ------------- |
| `dreaming.frequency` | `0 3 * * *`   |
| `dreaming.model`     | 默认模型      |

## 快速开始

<Tabs>
  <Tab title="启用 Dreaming">
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

<ParamField path="enabled" type="boolean" default="true">
  启用或禁用做梦扫描。
</ParamField>
<ParamField path="phases.deep.maxPriorEntryLossFraction" type="number" default="0.25">
  当一次整合重写删除的先前条目超过此比例时，拒绝该重写。
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
