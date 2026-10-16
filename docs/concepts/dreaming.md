---
summary: "带有轻度、深度和 REM 阶段以及梦境日记的后台记忆巩固"
title: "做梦"
sidebarTitle: "做梦"
read_when:
  - "你希望记忆提升自动运行"
  - "你想了解每个做梦阶段的作用"
  - "你想在不污染 MEMORY.md 的情况下调整巩固流程"
---

做梦是 `memory-core` 中的后台记忆巩固系统。它会将强烈的短期信号转化为持久记忆，同时保持这一过程的可解释性和可审阅性。

<Note>
默认情况下启用梦想。设置 `plugins.entries.memory-core.config.dreaming.enabled: false` 将其禁用。禁用梦想不会检查心跳系统事件队列。
</Note>

当 cron 调度程序被禁用（`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`）时，梦想会推迟自动作业创建和更新，同时保留现有作业。历史梦想工件的启动清理在运行之前等待每个代理的待处理数据库准备，包括重新启动或升级后的托管后台清理。报告数据库准备失败并附有修复指南。如果准备后代理数据库仍然不存在，则清理完成而不创建它；并发首次创建不是清理失败。现有数据库在清理期间仍然受到保护，不会被替换。明确禁用梦想会删除活动 cron 存储中携带其稳定声明密钥的作业。

## <a id="what-dreaming-writes"></a> 做梦会写入什么

- **SQLite-支持的插件状态中的机器状态**（召回存储、阶段信号、摄取检查点、锁）。
- 在接受的 `MEMORY.md` 重写之前，**在 SQLite- 支持的插件状态中重写原像**。
- `DREAMS.md`（或现有的 `dreams.md`）中的**人类可读输出**，以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下可选的阶段报告文件。

内置 SQLite 存储仅读取所选工作区的状态以进行查找和清理。另一个工作区中损坏的 JSON 不会阻止这些操作；所选工作区中实时记录中损坏的 JSON 仍报告存储错误。

成功移动后，梦想工件修复修剪会立即调用存档源路径的条目，从而在同一 SQLite 工作事务中删除其阶段信号。失败的行动使召回完好无损，并且仍然存在的来源仍然符合资格。文件移动和数据库清理是单独的操作：它们之间的崩溃或清理失败会留下悬空条目，供下一次夜间修复删除。修复结果报告清理失败，而不隐藏已完成的存档。

长期促销仍然只写入`MEMORY.md`。深度报告总结了排名候选人未被晋升的原因，使用拒绝类别的计数，而不复制被拒绝的片段或源标识符。这些计数涵盖了晋升的候选人；它们没有描述排名期间排除的条目。在最终应用检查期间发生更改的候选者会保留一般更改原因，而不是推断的原因。空扫描会记录插件状态下的完成情况，而不创建内存或梦想文件，因此它不会完成新工作区的首次运行设置。现有的每日笔记仍然可以接收托管的阶段块更新。每个新提升的条目都带有源自候选的跟踪召回元数据：`<!-- trigger: phrase one, phrase two -->` 中最多三个概念标签以及从 1 到 10 的有界 `<!-- importance: N -->` 值。合并会逐字节保留现有带注释的条目，除非明确合并或取代它们。

## <a id="phase-model"></a> 阶段模型

Dreaming 每次扫描会按顺序执行三个协作阶段：轻度 -> REM -> 深度。这些是内部实现阶段，不是用户可单独配置的模式。

| 阶段 | 用途                                   | 持久写入     |
| ----- | ----------------------------------------- | ----------------- |
| 轻度 | 对近期短期材料进行排序和整理 | No                |
| REM   | 反思主题和重复出现的想法     | No                |
| 深度  | 对持久候选项进行评分并提升      | 是（`MEMORY.md`） |

<AccordionGroup>
  <Accordion id="light-phase" title="光相">
    - 读取最近的短期回忆状态、每日记忆文件和会话记录（如果有）。
    - 去重信号并整理候选行。
    - 当存储包含行内输出时，写入受管理的 `## Light Sleep` 块。
    - 记录强化信号，供后续深度排名使用。
    - 从不写入 `MEMORY.md`。

  </Accordion>
  <Accordion id="rem-phase" title="REM相">
    - 基于近期短期轨迹构建主题和反思摘要。
    - 当存储包含行内输出时，写入受管理的 `## REM Sleep` 块。
    - 记录供深度排名使用的 REM 强化信号。
    - 从不写入 `MEMORY.md`。

  </Accordion>
  <Accordion id="deep-phase" title="深相">
    - 使用加权评分和阈值门控对候选项进行排序（`minScore`、`minRecallCount`、`minUniqueQueries` 必须全部通过）。
    - 在写入之前重新水合实时日常文件中的片段，因此会跳过 stale/deleted 片段。
    - 将门控所有者和代理衍生的候选者传递到无工具完成，该完成选择针对当前 `MEMORY.md` 的添加、合并和取代。
    - 根据经过验证的源证据组成 `MEMORY.md`，在先前条目损失限制和引导预算内保留不相关条目和候选源参考。
    - 当模型不可用或重写未通过验证时，回退到之前的仅追加式提升路径。
    - 将 `## Deep Sleep` 摘要写入 `DREAMS.md`，并可选写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
</AccordionGroup>

## <a id="session-transcript-ingestion"></a> 会话转录摄取

做梦可以将会话记录摄取到做梦语料库中。只有交互式会话才有资格。 Cron、心跳、子代理和未知会话不参与持久候选摄取。转录文本在摄取前不会被秘密屏蔽。运行时标记的回忆上下文被删除，因此回忆片段无法作为新记忆再次学习。

两个操作员控件将会话从自动摄取中排除，每个控件都有记录的原因：[ 内存准入策略](/concepts/memory-provenance#admission-keeping-sources-out-of-memory) 匹配保留的挂钩源、频道或聊天类型元数据，而 [`memory forget`](/cli/memory#memory-forget) 将选定的会话 ID 记录为 `forgotten` 以供将来扫描。策略更改不会删除现有候选者或阻止直接文件写入。手动会话回填在预览、REM 和应用模式下应用这两个控件，并在暂存候选者时保留源会话起源。

## <a id="consolidation-safety"></a> 整合安全性

固定分数、召回计数和查询多样性阈值仍然是候选门。只有在这些关卡通过之后才会进行整合。

在构建整合提示词之前，`memory-core` 会移除其索引来源为 `untrusted` 或 `system` 的候选项。这是一个结构性污点门槛，而不是分数惩罚。符合条件的候选项包括其来源、会话类型、观察时间、可选的后继替换键，以及日记来源引用。

该模型返回操作决策，而不是替换内存散文。内存编写器使用每个候选者的有界源条目将这些决策应用到现有文件。接受的重写或追加压缩必须：

- 保留 `phases.deep.maxPriorEntryLossFraction` 范围内的先前条目
- 包含每个被提升候选项的 `Source: path#Lx-Ly` 引用
- 保持在 `MEMORY.md` 的引导安全文件预算内
- 解析为预期的结构化响应

在文件更改之前，之前的 `MEMORY.md` 存储在 SQLite-backed 插件状态中。 `DREAMS.md` 接收添加、合并和取代的计数以及简短的 diff 样式突出显示。这使得每次重写都可以审阅，而不会将梦想日记变成促销来源。

后台整合受睡眠期间计算启发（arXiv:2504.13171）。来源与反思边界遵循《Generative Agents》研究中的持久记忆框架。

## <a id="dream-diary"></a> 梦境日记

梦在`DREAMS.md`中保留了一篇叙事**梦想日记**。每次扫描与有用的材料结合其轻，REM，并成功地将深度输入推广到一篇简短的日记条目中，包括当没有任何内容符合持久推广的条件时。除非配置了 `dreaming.model`，否则免工具后台完成将使用工作区代理的默认模型。如果配置的模型不可用，日志将使用该代理的默认模型重试一次。信任或白名单失败不会重试。

日记和整合完成使用新的上下文，而不保留对话会话或提供聊天回复。失败或空的日记生成会写入本地回退条目并报告降级结果，因此丢失的模型输出会留下可见的痕迹。

日记生成使用现有的代理运行预算 `agents.defaults.timeoutSeconds`，而不是单独的一分钟截止日期。它继承了代理运行时相同的 48 小时默认设置和计时器安全的无限制设置。所选提供商的 `models.providers.<provider>.timeoutSeconds` 仍会限制其模型请求，因此请保持两个预算足够长，以便缓慢的本地推理。

<Note>
该日记仅供梦境UI中人类阅读，并非推广来源。 Diary/report神器不参与短期促销；只有接地内存片段才有资格升级为 `MEMORY.md`。
</Note>

此外还有一条用于审查和恢复工作的有依据历史回填通道：

<AccordionGroup>
  <Accordion id="backfill-commands" title="回填命令">
    - `openclaw memory rem-harness --path <path> --grounded` 预览历史 `YYYY-MM-DD.md` 笔记中的接地日记输出。
    - `openclaw memory rem-backfill --path <path>` 将可逆接地日记条目写入 `DREAMS.md`。
    - `openclaw memory rem-backfill --path <path> --stage-short-term` 将持久候选者阶段化到与正常深度阶段使用相同的短期证据存储中。
    - `openclaw memory rem-backfill --rollback` 和 `--rollback-short-term` 删除了那些分阶段回填工件，而无需触及普通日记条目或实时短期回忆。
    - `openclaw memory session-backfill --agent <id>` 从代理保留的会话历史记录中预览受信任的候选者，首先是最早的未处理日期。
    - `openclaw memory session-backfill --agent <id> --apply` 通过正常的短期存储暂存这些候选者，并写入可逆日记块，而不更改 `MEMORY.md` 或 `USER.md`。
    - `openclaw memory session-backfill --agent <id> --rem` 每天向 `DREAMS.md` 写入基于规则的基础预览，而无需暂存候选者或调用模型。
    - `openclaw memory session-backfill --agent <id> --rollback` 清除共享接地回填候选者和日记块，包括 `rem-backfill` 创建的工件。

  </Accordion>
</AccordionGroup>

会话回填使用保留的转录本身份，包括跨轮换保留的会话。消息存储在配置的梦想时区中，并共享实时摄取的跟踪消息哈希值和信号上限。在一个命令中应用排水有界批次即可完成。回滚会删除生成的工件以及这些批次拥有的哈希值和游标进度，从而允许再次暂存相同的候选者。 `--archive-files` 提供的外部文件会被保守地处理。它们的嵌入式所有权字段由调用者控制，因此仍然不受信任；如果没有经过认证的出处合同，它们就无法进入短期演出。工具输出、Web 内容和非所有者轮流也从存储的会话路径中排除。

Control UI 在代理的内存选项卡（代理页面）上公开了相同的日记 backfill/reset 流程，因此您可以在决定接地候选人是否值得晋升之前检查梦想场景中的结果。独特的接地场景通道显示了哪些暂存的短期条目来自历史重播，这些条目促进了以接地为主导的项目，并且允许您仅清除仅接地的暂存条目，而无需触及实时短期状态。

## <a id="deep-ranking-signals"></a> 深度排序信号

深度排序使用六个加权基础信号以及阶段强化：

| Signal              | 重量 | 描述                                          |
| ------------------- | ------ | ---------------------------------------------------- |
| 相关性           | 0.30   | 该条目的平均检索质量              |
| 频率           | 0.24   | 该条目累积了多少短期信号    |
| 查询多样性     | 0.15   | 出现的独特的交互式召回查询 |
| 新近性             | 0.15   | 随时间衰减的新鲜度得分                         |
| 聚合度       | 0.10   | 多日重复出现的强度                        |
| 概念丰富度 | 0.06   | 来自 snippet/path 的概念标签密度                |

在 SQLite-backed 插件状态中记录的 Light 和 REM 阶段命中增加了一个小的新近度衰减提升。

## <a id="scheduling"></a> 调度

启用后，`memory-core` 会自动管理一个用于完整梦境扫描的 cron 任务，并在主运行时工作区以及任何已配置的代理工作区之间去重，因此子代理工作区的扩展不会排除主代理的 `DREAMS.md` 和记忆状态。

插件重新加载会保留托管计划。前一个实例会停止其后台回调，并在其替换接管之前解决挂起的日记发布问题，因此计划的扫描可以在不重新启动网关的情况下继续进行。

运行时协调仅拥有声明为 `memory-core:memory-dreaming-promotion` 的作业。它在已列出的活动作业上使用 Doctor 的只读分类器来报告历史行。在运行时创建或更新托管作业之前，已识别的旧版或阶段作业需要 Doctor 修复。声明的具有退役有效负载格式的作业也需要医生修复。具有历史标签和编写的有效负载的作业保持不变，并产生手动审核警告；它们不会阻止所声明的梦想工作的创建或更新。禁用梦想仍然只会删除明确声明的工作并报告任何剩余的历史工作。

运行 `openclaw doctor --fix` 以采用由所有权元数据和已知生成的有效负载识别的历史梦想作业。自定义提示上的历史标签会产生手动审核警告。 Doctor 首先保存经过验证的 SQLite 备份，然后在每个持久性 cron 存储分区中采用一项统一作业，而不更改其 ID、排序或运行时状态。如果仅存在旧版 light/REM 作业，则会将最旧的有效阶段作业提升到位。仅当该分区具有有效的幸存者后，它才会删除已识别的重复项。当梦想被禁用时，Doctor 会废弃已识别的托管行。具有不同声明键的作业和不相关的操作员作业保持不变；格式错误或不明确的行会产生修复警告并保留在原处。

梦想完成在后台优先级使用 [ 子代理队列 ](/concepts/queue#background-work) 并尊重 `agents.defaults.subagents.maxConcurrent`。将此现有限制设置为 `1` 可以跨工作区和插件序列化日记和合并完成情况。扫描协调器在等待阶段工作时不消耗完成槽。系统繁忙度在 `subagent` 行中显示这些完成情况。

显式多代理队列需要 [ambient 系统所有者 ](/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.systemagent) 来完成此作业。如果日志报告 `Agent-less cron job has no resolvable owner`，请选择现有代理来负责扫描。例如，如果该代理是 `ops`：

```bash
openclaw config set agents.defaults.systemAgent.agentId ops
```

这将选择执行所有者；它不会更改任何代理的工作空间或限制对该代理内存的扫描。独家代理安装会自动解析其所有者。

| 设置              | 默认值       |
| -------------------- | ------------- |
| `dreaming.frequency` | `0 3 * * *`   |
| `dreaming.model`     | 默认模型 |

## <a id="quick-start"></a> 快速开始

<Tabs>
  <Tab id="disable-dreaming" title="禁止做梦">
    ```json
    {
      "plugins": {
        "entries": {
          "memory-core": {
            "config": {
              "dreaming": {
                "enabled": false
              }
            }
          }
        }
      }
    }
    ```
  </Tab>
  <Tab id="custom-sweep-cadence" title="自定义扫描节奏">
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

## <a id="slash-command"></a> 斜杠命令

```text
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

`/dreaming on` 和 `/dreaming off` 要求频道调用者拥有所有者权限，或者 Gateway 客户端具备 `operator.admin` 权限。`/dreaming status` 和 `/dreaming help` 为只读命令。

## <a id="cli-workflow"></a> CLI 工作流

<Tabs>
  <Tab id="promotion-preview-%2F-apply" title="促销预览/申请">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    默认情况下，手动 `memory promote` 会使用深度阶段阈值，除非通过 CLI 标志进行覆盖。

  </Tab>
  <Tab id="explain-promotion" title="解释促销">
    解释为什么某个特定候选项会或不会被提升：

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab id="rem-harness-preview" title="REMharness预览">
    预览 REM 反思、候选事实和深度提升输出，而不写入任何内容：

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## <a id="key-defaults"></a> 关键默认值

所有设置都位于 `plugins.entries.memory-core.config.dreaming` 下。

<ParamField path="enabled" type="boolean" default="true">
  启用或禁用做梦扫描。
</ParamField>
<ParamField path="phases.deep.maxPriorEntryLossFraction" type="number" default="0.25">
  当合并重写或追加压缩删除的先前条目数量超过此比例时，拒绝合并重写或追加压缩。附加压缩仅删除整个机器生成的升级部分。
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  完整做梦扫描的 cron 频率。
</ParamField>
<ParamField path="model" type="string">
  可选的梦想日记完成模型覆盖。在设置子代理 `allowedModels` 允许列表时，请使用规范化的 `provider/model` 值。
</ParamField>
<ParamField path="phases.deep.maxPromotedSnippetTokens" type="number" default="160">
  从提升到 `MEMORY.md` 的每个短期回忆片段中保留的最大估算 token 数。排名来源仍然可见。
</ParamField>

<Warning>
`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。要限制它，还要设置 `plugins.entries.memory-core.subagent.allowedModels`。自动重试仅涵盖模型不可用的错误；信任或白名单失败会产生后备日记跟踪和降级结果，而不是默默地切换模型。
</Warning>

<Note>
大多数阶段策略、阈值和存储行为都是内部实现细节。有关完整键列表，请参见 [Memory 配置参考](/reference/memory-config#dreaming)。
</Note>

## <a id="dreams-ui"></a> 梦境 UI

启用后，Gateway 的 **Dreams** 标签页会显示：

- 当前做梦是否启用
- 阶段级状态和受管理扫描是否存在
- 短期、有依据、信号以及今日已提升数量
- 下次计划运行时间
- 一个独立的有依据 Scene 通道，用于暂存历史重放条目
- 一个由 `doctor.memory.dreamDiary` 支持的可展开梦境日记阅读器

当内置的 [`memory-wiki`](/plugins/memory-wiki) 插件启用后，日记视图会在 Dreams 旁新增两个子标签页：

- **导入的洞察**：由外部历史导入（例如 `openclaw wiki chatgpt import`）提供的聚类洞察，供审核后再将其中任何内容转化为持久记忆
- **记忆 Wiki**：记忆系统可以搜索并据此进行推理的已编译 Wiki——包括综合页面、实体页面和概念页面（以及承载声明、待解决问题或矛盾的来源和报告），并提供每页计数、完整资料库明细以及内联页面预览

当 `memory-wiki` 未启用时，这两个子标签页都会显示启用提示。

## <a id="related"></a> 相关内容

- [记忆](/concepts/memory)
- [内存架构](/concepts/memory-architecture)
- [记忆 CLI](/cli/memory)
- [内存配置参考](/reference/memory-config)
- [内存搜索](/concepts/memory-search)
