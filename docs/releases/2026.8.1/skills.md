---
title: "v2026.8.1：技能"
description: "创建、验证、查找、安装和调用技能现在遵循一条相互关联的路径，技能研讨会保存建议、检查、决策和应用历史记录。"
---

[Skills](/tools/skills) 将您的工作方式转变为可重复使用的指令，您的爪子可以再次遵循，并且此版本连接了整个路径。您可以创建和验证技能、查找或安装它、直接从对话中调用它、查看建议的更改，并在下一轮持久会话中准备好支持的编辑。无效技能会单独报告，因此目录的其余部分仍然可用。

技能研讨会将提案、检查、决策和应用历史记录整合到一个工作流程中。自学习可以将大量的工作和持久的纠正转化为建议的改进，或者在启用自动学习时保留通过 Workshop 创建的技能，而您或其他人拥有的技能仍处于其所有者的控制之下。

<AccordionGroup>

<Accordion id="creating-and-checking-skills" title="创建和检查技能">

[创建技能](/tools/creating-skills) 现在遵循一条引导路径，从选择如何调用它到添加支持文件、保存并验证结果。检查器了解支持的调用元数据，并在编写任何内容之前捕获诸如描述过长之类的问题。

OpenClaw 现在针对导致这些问题的技能报告格式错误的元数据、不可读的文件、过大的指令和影子副本，同时继续加载围绕这些问题的有效技能。在持久网关会话中，可以在下一轮编辑规范和托管工作树技能，并且完整阅读所需的技能说明。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 改进技能创作工作流程和调用验证 [#121955](https://github.com/openclaw/openclaw/pull/121955)

**错误修复**

- 加载 JSON5-style 技能元数据并报告解析器错误 [#108926](https://github.com/openclaw/openclaw/pull/108926)
- Surface 技能和工作区引导加载失败 [#125348](https://github.com/openclaw/openclaw/pull/125348)
- 执行目录技能被隐藏时发出警告 [#125865](https://github.com/openclaw/openclaw/pull/125865)
- 刷新持久网关会话中已编辑的技能 [#125962](https://github.com/openclaw/openclaw/pull/125962)
- fix（代理）：提供完整的技能指令而不是拒绝读取窗口[#130286](https://github.com/openclaw/openclaw/pull/130286)
- fix：报告缺少代理排除技能的要求 [#132110](https://github.com/openclaw/openclaw/pull/132110)
- fix（技能）：在观看[ce32e00](https://github.com/openclaw/openclaw/commit/ce32e00)之前扩展Windows短路径
- 当技能前题缺少结束分隔符时发出警告 [#110479](https://github.com/openclaw/openclaw/pull/110479)
- fix（技能）：显示长描述的字节感知错误 [#128594](https://github.com/openclaw/openclaw/pull/128594)
- fix（技能）：恢复有证据支持的创作指导[#129425](https://github.com/openclaw/openclaw/pull/129425)

</details>

</Accordion>

<Accordion id="finding-installing-and-using-skills" title="查找、安装和使用技巧">

[已安装技能](/tools/skills)、ClawHub发现、技能设置和技能工坊现在共享一个插件中心，让您可以在一个地方查找技能、安装技能、配置技能并确认其当前状态。技能和插件保持各自独立的生命周期，而重新连接或切换活动代理、模型或连接器会刷新当前网关的列表。

当您和活跃客服人员可以使用某项技能时，您可以在聊天中选择该技能，或在受支持的聊天和客服人员入口点使用 `$skill-name` 命名最多八项技能，包括自动模型选择中隐藏的符合条件的技能。聊天选择器会在不发送草稿的情况下添加对草稿的引用，并且代码模式可以列出并读取其现有沙箱和白名单中的合格技能。大型模型可见目录仍然可以被压缩，因此 `openclaw skills check` 仍然是完整的库存。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加一级技能访问代码模式[#114894](https://github.com/openclaw/openclaw/pull/114894)
- 在Control UI提示中引用多个技能[#116330](https://github.com/openclaw/openclaw/pull/116330)
- 在每个通道上调用显式技能参考 [#123387](https://github.com/openclaw/openclaw/pull/123387)
- 将插件、技能和研讨会合并在一个中心 [#104834](https://github.com/openclaw/openclaw/pull/104834)
- 在聊天参考选择器中显示可读的技能标题 [#124017](https://github.com/openclaw/openclaw/pull/124017)
- 从技能目录中删除内容哈希值 [#126951](https://github.com/openclaw/openclaw/pull/126951)

**错误修复**

- 防止引用 Codex 上下文来调用技能 [#123345](https://github.com/openclaw/openclaw/pull/123345)
- 将显式技能选择传递给 Codex 作为结构化输入 [#123441](https://github.com/openclaw/openclaw/pull/123441)
- 使明确的技能参考在代理轮流中工作 [#124784](https://github.com/openclaw/openclaw/pull/124784)
- 在突变和刷新期间保持技能状态准确 [#105671](https://github.com/openclaw/openclaw/pull/105671)
- 网关更改后刷新 macOS 技能可用性 [#107660](https://github.com/openclaw/openclaw/pull/107660)
- 对齐技能覆盖、提示限制和工具访问权限 [#116817](https://github.com/openclaw/openclaw/pull/116817)
- 准确显示继承的代理技能白名单 [#124429](https://github.com/openclaw/openclaw/pull/124429)
- 保持模型可见技能目录有界且可用 [#125346](https://github.com/openclaw/openclaw/pull/125346)
- fix（技能）：从通道斜线命令加载隐藏技能[#126335](https://github.com/openclaw/openclaw/pull/126335)
- 重连后防止过时的工具和技能 [#126826](https://github.com/openclaw/openclaw/pull/126826)
- fix：识别新安装的技能和 Gmail 依赖项 [#131617](https://github.com/openclaw/openclaw/pull/131617)
- 在紧凑技能目录中保留描述 [#88426](https://github.com/openclaw/openclaw/pull/88426)
- fix（ui）：过滤 [#127663](https://github.com/openclaw/openclaw/pull/127663) 时显示代理技能匹配

</details>

</Accordion>

<Accordion id="reviewing-changes-in-skill-workshop" title="回顾技能工坊的变化">

[Skill Workshop](/tools/skill-workshop) 为您提供了一个地方，可以将过去大量工作中的想法或可重复使用的课程转化为可审查的技能变更。您可以检查建议的说明和支持文件，查看插件提供的扫描仪、基准测试和评分器的结果，修改建议，然后应用、拒绝或隔离它。过去的工作扫描会生成待处理的建议，而不是编辑实时技能，并且 Android 用户可以在经过身份验证的管理员进行更改之前搜索和检查它们。

每个决定都与您审阅的确切提案修订版相关，因此稍后的修订版会返回以供审核。关键的提示注入结果会阻止应用程序，中断的应用程序可以在不覆盖其他地方更改的目标的情况下恢复，并且明确选择的远程网关仍然是更改的权限。应用的修订按最新优先的历史记录和比较进行分组，表明可见差异何时不完整。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 审查 Android 的技能研讨会提案 [#101911](https://github.com/openclaw/openclaw/pull/101911)
- 扫描过去的技能研讨会想法 [#106766](https://github.com/openclaw/openclaw/pull/106766)
- 添加技能研讨会评估和生命周期挂钩 [#115606](https://github.com/openclaw/openclaw/pull/115606)
- 默认删除多余的技能工坊审批提示 [#107690](https://github.com/openclaw/openclaw/pull/107690)
- 显示已应用的技能工坊修订版之间的更改 [#125854](https://github.com/openclaw/openclaw/pull/125854)

**错误修复**

- 将技能工坊建议保留为完整技能 [#108339](https://github.com/openclaw/openclaw/pull/108339)
- 跨技能线检测提示注入 [#117254](https://github.com/openclaw/openclaw/pull/117254)
- 跨工作树会话保留技能研讨会更新 [#125737](https://github.com/openclaw/openclaw/pull/125737)
- 荣誉技能研讨会在代理呼叫中自动批准 [#102530](https://github.com/openclaw/openclaw/pull/102530)
- Keep Skill Workshop 批准目标名称 Unicode 安全 [#102963](https://github.com/openclaw/openclaw/pull/102963)
- 恢复技能工坊板模式下的滚动 [#108197](https://github.com/openclaw/openclaw/pull/108197)
- 无需重启网关即可刷新创意工坊技能 [#114456](https://github.com/openclaw/openclaw/pull/114456)
- 保留技能工坊申请原因并更正其文档 [#114471](https://github.com/openclaw/openclaw/pull/114471)
- 针对崩溃和工作空间移动保留技能研讨会建议 [#114535](https://github.com/openclaw/openclaw/pull/114535)
- 恢复中断的技能研讨会安全适用[#115885](https://github.com/openclaw/openclaw/pull/115885)
- 无配置升级后恢复离线技能工坊应用 [#115982](https://github.com/openclaw/openclaw/pull/115982)
- 修复（技能）：无法关闭远程网关[#117567](https://github.com/openclaw/openclaw/pull/117567)
- Mark 手动安装技能工坊建议陈旧 [#118676](https://github.com/openclaw/openclaw/pull/118676)
- 防止技能研讨会提案列表超时 [#123553](https://github.com/openclaw/openclaw/pull/123553)
- 立即显示技能研讨会评估员结果 [#123994](https://github.com/openclaw/openclaw/pull/123994)
- 团体应用技能研讨会按技能修订[#125794](https://github.com/openclaw/openclaw/pull/125794)
- 将不完整的技能工坊差异标记为截断的[#125922](https://github.com/openclaw/openclaw/pull/125922)
- 技能工坊提案变更时需要重新审核 [#126156](https://github.com/openclaw/openclaw/pull/126156)
- 防止技能研讨会在小上下文模型上溢出 [#126158](https://github.com/openclaw/openclaw/pull/126158)
- 保留技能工坊修订草案直至网关入场 [#126166](https://github.com/openclaw/openclaw/pull/126166)
- 保留技能研讨会提案修订原子 [#126485](https://github.com/openclaw/openclaw/pull/126485)
- 拒绝无效的技能研讨会提案列表限制 [#103496](https://github.com/openclaw/openclaw/pull/103496)
- 在技能工坊中保留表情符号预览 [#104047](https://github.com/openclaw/openclaw/pull/104047)
- 显示 Android 技能工坊过滤器，无截断 [#107574](https://github.com/openclaw/openclaw/pull/107574)
- 在技能工坊历史扫描中保持表情符号完整 [#107720](https://github.com/openclaw/openclaw/pull/107720)
- Keep技能工坊简历批次可重构[#109741](https://github.com/openclaw/openclaw/pull/109741)
- 恢复技能工坊批准卡上的提案详细信息 [#117549](https://github.com/openclaw/openclaw/pull/117549)
- 在技能工坊评估中保留完整的 Unicode 字符 [#117673](https://github.com/openclaw/openclaw/pull/117673)
- 将相关元数据转发给技能评估者 [#123425](https://github.com/openclaw/openclaw/pull/123425)
- fix（cli）：插件检查技能研讨会在多代理名册上失败 [#124283](https://github.com/openclaw/openclaw/pull/124283)
- fix（cli）： 返回 JSON 策展人和工作室故障 [#128601](https://github.com/openclaw/openclaw/pull/128601)

</details>

</Accordion>

<Accordion id="how-skills-improve-over-time" title="技能如何随着时间的推移而提高">

OpenClaw 可以将大量的工作和持久的修正转化为可重复使用的技能，然后改进研讨会创建的实际塑造跑步的技能。新的和未配置的安装从 `auto` 开始，而升级则保留现有的选择。 `off` 禁用自动修复，`propose` 将更改排队以供审核，`auto` 可以通过有针对性的补丁或同回合修复来创建或更新创意工坊拥有的技能。已经进行的对话将保留其加载的版本，直到下一轮。

您在其他地方编写的技能和共享的技能仍然属于您。 [自动学习](/tools/self-learning)可以对它们提出改进建议，但它不能自行重写或删除它们，并且显式的`/learn`或过去的工作扫描也会产生供审查的建议。

在支持的代理运行时，可选的后台审核单独运行，而不会中断或发布到聊天中。当学习模式和计划作业设置允许时，可见的每周作业会审查集合、记录使用情况和结果、保留专业技能并创建可恢复的备份。恢复备份仍然是一个明确的选择。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 在实质性成功工作后提出可重用技能 [#105674](https://github.com/openclaw/openclaw/pull/105674)
- 使学习的技能建议更容易发现和重用 [#115103](https://github.com/openclaw/openclaw/pull/115103)
- 默认自学习自动 [#115576](https://github.com/openclaw/openclaw/pull/115576)
- 让技能工坊应用针对性的学习补丁 [#119891](https://github.com/openclaw/openclaw/pull/119891)
- 通过自主审核提高运行技能 [#121493](https://github.com/openclaw/openclaw/pull/121493)
- 让特工在同一回合内修复已使用的技能 [#121522](https://github.com/openclaw/openclaw/pull/121522)
- 新增每日全集技能对账[#121653](https://github.com/openclaw/openclaw/pull/121653)
- feat（cron）：将技能收集审核安排为系统拥有的作业 [#130030](https://github.com/openclaw/openclaw/pull/130030)
- 从深度中断转弯中学习[#115887](https://github.com/openclaw/openclaw/pull/115887)

**错误修复**

- 仅限自学审阅者并防止逐字聊天捕获 [#119818](https://github.com/openclaw/openclaw/pull/119818)
- 保护用户拥有的技能免受自主创意工坊清理的影响 [#125666](https://github.com/openclaw/openclaw/pull/125666)
- fix（技能）：分叉前台会话以进行精益体验审查 [#129282](https://github.com/openclaw/openclaw/pull/129282)
- 启用 Codex 课程的延迟自学复习 [#114501](https://github.com/openclaw/openclaw/pull/114501)
- 在冷启动和身份验证失败时保持技能审查运行 [#115950](https://github.com/openclaw/openclaw/pull/115950)
- 在实时网关上运行自动体验审核 [#116040](https://github.com/openclaw/openclaw/pull/116040)
- 在收集清理过程中保留专业技能 [#121829](https://github.com/openclaw/openclaw/pull/121829)
- 在自动模式下恢复预定的技能研讨会评论 [#123340](https://github.com/openclaw/openclaw/pull/123340)
- 在收藏审核期间保护共享技能根源 [#123374](https://github.com/openclaw/openclaw/pull/123374)
- 从技能工坊捕获中排除低信号提案 [#125716](https://github.com/openclaw/openclaw/pull/125716)
- 取消失败的技能收藏评论[#125899](https://github.com/openclaw/openclaw/pull/125899)
- 通过网关重新启动保留预定的技能审查 [#126948](https://github.com/openclaw/openclaw/pull/126948)
- fix（技能）：超出阅读预算的补丁技能[#128871](https://github.com/openclaw/openclaw/pull/128871)
- 修复：运行时配置更改后技能评论恢复 [#129218](https://github.com/openclaw/openclaw/pull/129218)
- fix（技能）：再次记录技能使用情况并退出死亡策展人表[#129769](https://github.com/openclaw/openclaw/pull/129769)
- fix（技能）：将体验审核保留在前台提示-缓存前缀[#130013](https://github.com/openclaw/openclaw/pull/130013)
- fix（技能）：隐藏聊天中的独立体验评论[#130217](https://github.com/openclaw/openclaw/pull/130217)
- fix（技能）：阻止体验评论阻止聊天[#131077](https://github.com/openclaw/openclaw/pull/131077)
- 并发配置更改后重试自学习切换 [#106764](https://github.com/openclaw/openclaw/pull/106764)
- Keep技能工坊收藏恢复可重试[#126014](https://github.com/openclaw/openclaw/pull/126014)

</details>

</Accordion>

</AccordionGroup>
