---
title: "v2026.8.1：自动化和调度"
description: "预定的工作在代理、Control UI、命令行、文档和支持的本机应用程序中集中在一个名称下。"
---

[Automations](/automation) 现在将代理、Control UI、命令行、文档和支持的本机应用程序中的计划工作集中在一个名称下，而现有的 Cron 命令、设置、作业和计划语法继续工作。

历史记录区分自动化是否运行、其结果是否已交付以及整个请求是否完成。在重新启动或时钟更改期间真正错过的工作可以在不恢复已完成或退休的工作的情况下返回，并且连接的工具仅保留创建或重新授权自动化时捕获的权限，并在每次运行时根据当前策略和可用性进行检查。

<AccordionGroup>

<Accordion id="creating-and-managing-automations" title="创建和管理自动化">

[Automations](/automation/cron-jobs) 现在是代理工具、Control UI、命令行和文档中面向用户的名称，而 `openclaw automations` 提供与 `openclaw cron` 相同的命令系列。旧命令、`/cron` 路由、`cron.*` 设置和 RPC 名称、计划表达式、标识符和存储的作业继续有效。

Control UI 是搜索、过滤、创建、克隆、检查、编辑、运行、暂停和删除自动化的最全面的地方，包括高级交付和故障路由。新的快速创建和入门自动化保留在内部，除非您明确选择公告摘要及其目标。 iOS 和 Android 公开每个客户端支持的字段和操作，Android 更改需要管理员范围，而读取范围的连接保持仅供检查，并且脚本自动化在无法替换其有效负载的客户端上保持可见但只读。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- Android [#102997](https://github.com/openclaw/openclaw/pull/102997) 上的安全 cron 作业管理
- 将计划任务重新设计为自动化工作区 [#104251](https://github.com/openclaw/openclaw/pull/104251)
- 添加 cron 启动想法并立即首次运行 [#104761](https://github.com/openclaw/openclaw/pull/104761)
- 将自动化页面重新设计为全宽仪表板 [#105174](https://github.com/openclaw/openclaw/pull/105174)
- 重新设计Control UI自动化编辑器[#105254](https://github.com/openclaw/openclaw/pull/105254)
- 简化日常使用的自动化页面 [#106044](https://github.com/openclaw/openclaw/pull/106044)
- 添加本机移动自动化管理 [#106355](https://github.com/openclaw/openclaw/pull/106355)
- 添加 `openclaw automations` CLI 别名 [#114854](https://github.com/openclaw/openclaw/pull/114854)
- 分组自动化并在活动中显示实时状态 [#125981](https://github.com/openclaw/openclaw/pull/125981)
- 使自动化列表更容易在桌面和移动设备上扫描 [#127198](https://github.com/openclaw/openclaw/pull/127198)
- feat：将重复的工作变成预定的自动化 [#130120](https://github.com/openclaw/openclaw/pull/130120)
- 更清晰的 Cron 作业和任务导航和状态摘要 [#103122](https://github.com/openclaw/openclaw/pull/103122)
- 将调度程序代理工具重命名为自动化 [#114841](https://github.com/openclaw/openclaw/pull/114841)
- 将代理和用户调度程序措辞重命名为自动化 [#114852](https://github.com/openclaw/openclaw/pull/114852)
- 在整个 Control UI [#114853](https://github.com/openclaw/openclaw/pull/114853) 中一致使用自动化
- 从浏览器导出 cron 时区建议 [#115973](https://github.com/openclaw/openclaw/pull/115973)
- Consolidate Automations 添加和更新架构 [#121645](https://github.com/openclaw/openclaw/pull/121645)
- 从 CLI [#122702](https://github.com/openclaw/openclaw/pull/122702) 编辑和清除自动化显示名称
- 将 Asia/Shanghai 添加到 Cron 时区建议 [#65936](https://github.com/openclaw/openclaw/pull/65936)
- 突出显示 Control UI 中的只读自动化脚本 [#113632](https://github.com/openclaw/openclaw/pull/113632)
- 在 Cron 仪表板中显示保存的自动化描述 [#118593](https://github.com/openclaw/openclaw/pull/118593)
- Make cron JSON 帮助匹配实际命令输出 [#124903](https://github.com/openclaw/openclaw/pull/124903)
- 仅针对空库存显示启动自动化 [#125631](https://github.com/openclaw/openclaw/pull/125631)
- 暴露所有自动化计划过滤器 [#126962](https://github.com/openclaw/openclaw/pull/126962)
- perf（cron）：批量列表输出[#128191](https://github.com/openclaw/openclaw/pull/128191)
- 解释如何查找禁用的 cron 作业 [#78139](https://github.com/openclaw/openclaw/pull/78139)

**错误修复**

- 跨用户客户端显示脚本自动化 [#112195](https://github.com/openclaw/openclaw/pull/112195)
- 克隆自动化时保留先进的传送路线 [#117909](https://github.com/openclaw/openclaw/pull/117909)
- 保持 cron 列表列与 Unicode 对齐 [#103889](https://github.com/openclaw/openclaw/pull/103889)
- 防止 Cron 编辑在保存过程中消失 [#105421](https://github.com/openclaw/openclaw/pull/105421)
- 修复 Control UI cron 交付中的空白帐户 ID [#105762](https://github.com/openclaw/openclaw/pull/105762)
- 解释为什么自动化运行无法启动 [#105858](https://github.com/openclaw/openclaw/pull/105858)
- 编辑时保留基于秒的自动化间隔 [#110034](https://github.com/openclaw/openclaw/pull/110034)
- 在精确网关查找之前修剪 cron 作业 ID [#110849](https://github.com/openclaw/openclaw/pull/110849)
- 列出来自一个一致网关快照的每个 cron 作业 [#113805](https://github.com/openclaw/openclaw/pull/113805)
- fix（任务）：更喜欢所有者密钥TaskFlow查找的最新实时流程（#119129）[#119130](https://github.com/openclaw/openclaw/pull/119130)
- 在一个快照上保留分页计划作业 [#121084](https://github.com/openclaw/openclaw/pull/121084)
- 在自动化中显示实际选择的值 [#121811](https://github.com/openclaw/openclaw/pull/121811)
- 查看所有代理时保留自动化所有权 [#123381](https://github.com/openclaw/openclaw/pull/123381)
- 接受跨自动化的本地端口选项 [#125474](https://github.com/openclaw/openclaw/pull/125474)
- 保留自动化编辑、运行反馈和本地状态 [#125698](https://github.com/openclaw/openclaw/pull/125698)
- 将自动化冲突恢复附加在活动过滤器下 [#125782](https://github.com/openclaw/openclaw/pull/125782)
- fix（工作板）：让proofId单独解决已经终端的证明[AI-辅助] [#127074](https://github.com/openclaw/openclaw/pull/127074)
- Accessible Automations 任务行 [#127252](https://github.com/openclaw/openclaw/pull/127252)
- 修复：自动化运行出现在创建者活动中 [#128951](https://github.com/openclaw/openclaw/pull/128951)
- fix（cli）：渲染 cron 编辑 JSON 失败 [#129022](https://github.com/openclaw/openclaw/pull/129022)
- fix（cli）：隐藏隐式 JSON 输出的横幅 [#129204](https://github.com/openclaw/openclaw/pull/129204)
- 修复：代理创建的自动化显示在会话创建者下 [#129371](https://github.com/openclaw/openclaw/pull/129371)
- fix（ui）：自动化操作失败并意外安排更改 [#129469](https://github.com/openclaw/openclaw/pull/129469)
- fix（代理）：停止建议不可用的自动化工具[#129953](https://github.com/openclaw/openclaw/pull/129953)
- fix（龙虾）：保留取消的拒绝批准并强制执行输出限制 [#130259](https://github.com/openclaw/openclaw/pull/130259)
- refactor（macos）：自动化摘要作为具有可点击作业行的托管卡 [#130502](https://github.com/openclaw/openclaw/pull/130502)
- fix（ui）：默认情况下将新的自动化保留在内部 [#131504](https://github.com/openclaw/openclaw/pull/131504)
- 从命令 cron 作业中删除缺少代理警告 [#112043](https://github.com/openclaw/openclaw/pull/112043)
- 在计划作业后保持暂停的自动化 [#113745](https://github.com/openclaw/openclaw/pull/113745)
- SQLite 中存储的自动化作业的正确 Doctor 警告 [#116769](https://github.com/openclaw/openclaw/pull/116769)
- 对齐 cron 列表排序和显示名称搜索 [#116834](https://github.com/openclaw/openclaw/pull/116834)
- 修复四舍五入的 cron 计划持续时间 [#118280](https://github.com/openclaw/openclaw/pull/118280)
- 需要十进制 cron 临时修订 [#119518](https://github.com/openclaw/openclaw/pull/119518)
- 编辑期间拒绝空白 cron 路由值 [#119879](https://github.com/openclaw/openclaw/pull/119879)
- 拒绝空白 cron 模型或思考标志与清除标志相结合 [#119894](https://github.com/openclaw/openclaw/pull/119894)
- fix（自动化）：停止提供被拒绝的代理重定向 [#121100](https://github.com/openclaw/openclaw/pull/121100)
- 清除 Control UI 中保存的自动化目标 [#123171](https://github.com/openclaw/openclaw/pull/123171)
- 提供缺失的自动化清晰的恢复指导 [#124663](https://github.com/openclaw/openclaw/pull/124663)
- fix（cli）：使用父连接选项 [#128343](https://github.com/openclaw/openclaw/pull/128343) 保持自动化 JSON 干净
- fix（ui）：Cron 在初始加载期间显示错误的空状态 [#130430](https://github.com/openclaw/openclaw/pull/130430)

**文档**

- 将调度程序文档重命名为自动化 [#114855](https://github.com/openclaw/openclaw/pull/114855)

</details>

</Accordion>

<Accordion id="schedules-and-runs" title="时间表和运行">

所有者可以将当前对话转换为 [`/loop`](/automation/cron-jobs) 或符合条件的提醒，在运行时检查少量最近的上下文，并返回同一聊天的最终答案。它以全新的运行方式开始，而不是继续原始的记录，并且在没有对话的情况下创建的工作保持孤立。

重复性计划、一次性作业、手动启动、排队工作、重新启动追赶、退出时工作、命令和有界脚本现在共享一个配置的容量限制。当房间可用时，等待工作开始，而成功的脚本可以保留少量状态，通知目标，唤醒主要对话，或要求稍后再次检查。脚本仍然有时间、工具调用、节奏和状态限制，并且可以完全禁用。

强制运行和编辑不再使重复工作脱离其自然时间表。时区感知计划会跳过从未发生过的本地时间，在本地时间重复时选择第一个实际发生的时间，并在重新启动后继续遵循显式偏移量。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 让 cron 作业在操作符范围内选择下一个检查 [#110978](https://github.com/openclaw/openclaw/pull/110978)
- 将无头脚本负载添加到 cron 作业 [#111112](https://github.com/openclaw/openclaw/pull/111112)
- 添加会话绑定调度和 `/loop` [#114328](https://github.com/openclaw/openclaw/pull/114328)
- Cron 作业在计时器周期内使用可用容量 [#119195](https://github.com/openclaw/openclaw/pull/119195)
- perf（cron）：一次性总结计时器计划 [#127495](https://github.com/openclaw/openclaw/pull/127495)
- improve（cron）：重用已解析的计划时区 [AI] [#127311](https://github.com/openclaw/openclaw/pull/127311)
- perf（cron）：跳过未来作业的历史记录检查 [#128048](https://github.com/openclaw/openclaw/pull/128048)

**错误修复**

- 在每个触发器上强制执行一个 cron 并发限制 [#103323](https://github.com/openclaw/openclaw/pull/103323)
- 在强制运行和编辑过程中保持循环 cron 节奏稳定 [#111331](https://github.com/openclaw/openclaw/pull/111331)
- 在保存之前拒绝格式错误的代码模式 cron 脚本 [#118100](https://github.com/openclaw/openclaw/pull/118100)
- 跨时区转换的正确 cron 调度 [#118712](https://github.com/openclaw/openclaw/pull/118712)
- 当作业被删除或禁用时停止活动 cron 运行 [#123437](https://github.com/openclaw/openclaw/pull/123437)
- 隔离代理提取承诺[#104426](https://github.com/openclaw/openclaw/pull/104426)
- 在 RPC 返回 [#104595](https://github.com/openclaw/openclaw/pull/104595) 后保持手动 cron 运行
- 重试一次性 cron 会话声明竞赛 [#107236](https://github.com/openclaw/openclaw/pull/107236)
- 准确验证重复计划间隔 [#107480](https://github.com/openclaw/openclaw/pull/107480)
- 防止已完成的 cron 工作在声明冲突后重播 [#108682](https://github.com/openclaw/openclaw/pull/108682)
- Honor cron 脚本限制和永久故障 [#112415](https://github.com/openclaw/openclaw/pull/112415)
- Harden cron 节奏、退出作业和关闭 [#112766](https://github.com/openclaw/openclaw/pull/112766)
- 永久计费失败后停止重试计划作业 [#114113](https://github.com/openclaw/openclaw/pull/114113)
- 将DM-创建的cron作业绑定到真实对话[#114421](https://github.com/openclaw/openclaw/pull/114421)
- Give 当前绑定的 cron 运行最近的对话上下文 [#114455](https://github.com/openclaw/openclaw/pull/114455)
- 防止执行通道繁忙时出现错误的 cron 故障 [#114512](https://github.com/openclaw/openclaw/pull/114512)
- 防止 cron 和 Workboard 生命周期竞争 [#114674](https://github.com/openclaw/openclaw/pull/114674)
- 停止所有执行阶段的停滞计划任务回退 [#114815](https://github.com/openclaw/openclaw/pull/114815)
- 允许 Control UI 中的无超时 cron 作业 [#115090](https://github.com/openclaw/openclaw/pull/115090)
- 在模型设置期间保护计划运行的会话 [#115804](https://github.com/openclaw/openclaw/pull/115804)
- H一次性 cron 计划中的时区和日终值 [#117969](https://github.com/openclaw/openclaw/pull/117969)
- 在一次性 cron 计划中尊重时区和第一个 DST 出现 [#118297](https://github.com/openclaw/openclaw/pull/118297)
- 保持冷调度轮流不阻塞网关 [#123368](https://github.com/openclaw/openclaw/pull/123368)
- 在没有默认代理的情况下保持显式代理 cron 作业运行 [#123516](https://github.com/openclaw/openclaw/pull/123516)
- 添加代理后保持无代理计划运行 [#123914](https://github.com/openclaw/openclaw/pull/123914)
- 停止重试永久性 cron 命令失败 [#126763](https://github.com/openclaw/openclaw/pull/126763)
- 将当前会话 cron 结果返回到原始聊天 [#126860](https://github.com/openclaw/openclaw/pull/126860)
- fix（cron）：重置后防止过时的当前会话结果 [#127854](https://github.com/openclaw/openclaw/pull/127854)
- refactor（cron）：集中自动化突变选项[#128373](https://github.com/openclaw/openclaw/pull/128373)
- fix（cron）：防止系统时钟更改时脚本超时 [#130238](https://github.com/openclaw/openclaw/pull/130238)
- 在时钟更改时保留脚本工作线程超时 [#130408](https://github.com/openclaw/openclaw/pull/130408)
- fix（任务）：保留CLI在独立维护中运行[#132602](https://github.com/openclaw/openclaw/pull/132602)
- 将隔离的 cron 子模型优先级与本机生成对齐 [#58823](https://github.com/openclaw/openclaw/pull/58823)
- 让隔离的 cron 设置使用配置的超时 [#93914](https://github.com/openclaw/openclaw/pull/93914)
- 在隔离的 cron 运行中稳定提示缓存 [#96686](https://github.com/openclaw/openclaw/pull/96686)
- 拒绝格式错误的 cron 命令环境映射而不是删除它们 [#106100](https://github.com/openclaw/openclaw/pull/106100)
- 在 cron 预检期间关闭停滞的本地提供商套接字 [#114540](https://github.com/openclaw/openclaw/pull/114540)
- QQBot 提醒遵循网关时区 [#116294](https://github.com/openclaw/openclaw/pull/116294)
- 中断模型流后重试 Cron 作业 [#118130](https://github.com/openclaw/openclaw/pull/118130)
- 拒绝不支持的通用 cron 超时编辑 [#119899](https://github.com/openclaw/openclaw/pull/119899)
- 在瞬时管理程序故障后重试退出 Cron 观察程序 [#120023](https://github.com/openclaw/openclaw/pull/120023)
- 本地拒绝空白 cron 命令工作目录 [#121535](https://github.com/openclaw/openclaw/pull/121535)
- fix（代理）：防止压缩后出现错误提醒警告[#128581](https://github.com/openclaw/openclaw/pull/128581)
- fix（cron）：定期自动化在间隔编辑后运行得太早 [#128893](https://github.com/openclaw/openclaw/pull/128893)
- fix（cron）：拒绝脚本有效负载的通用超时 [#129407](https://github.com/openclaw/openclaw/pull/129407)
- fix（cron）：防止时钟更改后运行等待失败 [#129805](https://github.com/openclaw/openclaw/pull/129805)
- fix（cron）：在插件准备期间避免冷脚本超时 [#131321](https://github.com/openclaw/openclaw/pull/131321)

**文档**

- 推荐用于日常 cron 作业的较轻模型 [#125000](https://github.com/openclaw/openclaw/pull/125000)

</details>

</Accordion>

<Accordion id="triggers-and-connected-tools" title="触发器和连接的工具">

自动化现在可以等待 [ 条件或受监视的事件流 ](/automation/cron-jobs) 并在发生变化时运行。可以在 Control UI 中创建、过滤、编辑和检查条件，在保存之前进行检查，并记录检查和匹配，而无需为每个不匹配创建运行。流调度是通过命令行或代理创建的，并在 Control UI 中保持只读状态，具有有限的缓冲、批处理和重新启动退避功能。触发器仍然可以完全禁用，并且条件间隔必须至少为 30 秒。

新的或重新授权的 Codex 作业可以在重新启动后保留它们创建时使用的应用程序权限和合格的连接工具访问权限。所获取的权限是每次运行时根据当前帐户、配置、策略、批准和可用性进行检查的上限。需要有人在场批准的工具仍被排除在外，现有限制不会自动扩展，并且一些较旧的作业需要一次性编辑或重新授权才能保留此访问权限。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- Let Claw 打包自己的预定作业 [#102383](https://github.com/openclaw/openclaw/pull/102383)
- 将受监督的流源添加到 cron 计划 [#112387](https://github.com/openclaw/openclaw/pull/112387)
- 保留 Codex 应用程序访问以进行计划的自动化 [#121859](https://github.com/openclaw/openclaw/pull/121859)
- 默认启用自动化触发器 [#125025](https://github.com/openclaw/openclaw/pull/125025)
- 管理 Control UI 中的自动化条件触发器 [#126534](https://github.com/openclaw/openclaw/pull/126534)
- 为插件添加 cron 协调生命周期挂钩 [#104191](https://github.com/openclaw/openclaw/pull/104191)
- 改进无人值守的 cron 结果和观察者指导 [#110949](https://github.com/openclaw/openclaw/pull/110949)
- 对新计划作业保留显式工具权限 [#112483](https://github.com/openclaw/openclaw/pull/112483)

**错误修复**

- 保留用于无发送器计划运行的授权工具 [#112661](https://github.com/openclaw/openclaw/pull/112661)
- 在计划的 Codex 轮次中恢复配置的 MCP 工具 [#120366](https://github.com/openclaw/openclaw/pull/120366)
- 计划代理运行中的恢复网关工具 [#126640](https://github.com/openclaw/openclaw/pull/126640)
- fix（cron）：使用仅限限制的执行引脚 [#130579](https://github.com/openclaw/openclaw/pull/130579) 在规范工具身份下捕获 Codex shell 别名
- 当 cron 唤醒时间更改时通知插件 [#103647](https://github.com/openclaw/openclaw/pull/103647)
- 保持接受的挂钩代理在响应后运行活动 [#104686](https://github.com/openclaw/openclaw/pull/104686)
- 绑定代理-钩转轮入场 [#104712](https://github.com/openclaw/openclaw/pull/104712)
- 使代理编写的 cron 条件观察者可靠 [#104787](https://github.com/openclaw/openclaw/pull/104787)
- 通过注册表改动保留重复的插件计划作业 [#107752](https://github.com/openclaw/openclaw/pull/107752)
- 识别隔离 cron 预检中自动检测的 Brave 搜索 [#108636](https://github.com/openclaw/openclaw/pull/108636)
- 保留同一会话代理挂钩的突发 [#110575](https://github.com/openclaw/openclaw/pull/110575)
- 在扁平化 cron 请求中保留条件触发器 [#110912](https://github.com/openclaw/openclaw/pull/110912)
- fix（cron）：忽略继承的规范化字段 [#111728](https://github.com/openclaw/openclaw/pull/111728)
- 初始化分离挂钩运行的会话 [#115765](https://github.com/openclaw/openclaw/pull/115765)
- 防止饥饿钩调度导致 cron 饱和 [#116666](https://github.com/openclaw/openclaw/pull/116666)
- 将 cron 交付指南与可用工具对齐 [#116908](https://github.com/openclaw/openclaw/pull/116908)
- 将自动化选项与 cron 触发器设置 [#122052](https://github.com/openclaw/openclaw/pull/122052)
- 防止挂钩流量耗尽较旧的计划工作 [#122764](https://github.com/openclaw/openclaw/pull/122764)
- 提交前验证自动化条件触发器 [#126718](https://github.com/openclaw/openclaw/pull/126718)
- 保持自动化触发控制与活动调度程序一致 [#126945](https://github.com/openclaw/openclaw/pull/126945)
- 保存前拒绝无效的自动化条件 [#127004](https://github.com/openclaw/openclaw/pull/127004)
- fix（挂钩）：避免运行时重新加载期间错误准入超时 [#128975](https://github.com/openclaw/openclaw/pull/128975)
- perf（cron）：将已发布的插件生成到 hook/cron 隔离运行中 [#130581](https://github.com/openclaw/openclaw/pull/130581)
- fix（cron）：表面命令提示符功能失败 [#131123](https://github.com/openclaw/openclaw/pull/131123)
- fix（hooks）： 报告实际唤醒入队结果 [#131952](https://github.com/openclaw/openclaw/pull/131952)
- fix：允许子代理从系统事件中生成 [#132890](https://github.com/openclaw/openclaw/pull/132890)
- refactor：将内部唤醒排除在消息通道之外 [#132986](https://github.com/openclaw/openclaw/pull/132986)
- 在隔离的公告 cron 作业中保留工具调用 [#106596](https://github.com/openclaw/openclaw/pull/106596)
- 重新加载已编辑的 webhook 转换模块而不重新启动 [#107875](https://github.com/openclaw/openclaw/pull/107875)
- 在摄取期间拒绝过大的 cron 触发器脚本 [#108130](https://github.com/openclaw/openclaw/pull/108130)
- 尽管调度程序默认，但删除未更改的 Claw cron 作业 [#113045](https://github.com/openclaw/openclaw/pull/113045)
- 允许自动化无需工具即可显式运行 [#113403](https://github.com/openclaw/openclaw/pull/113403)
- 将配置的自动化触发状态与高级标题 [#126784](https://github.com/openclaw/openclaw/pull/126784) 对齐
- fix：停止 cron exec 批准垃圾邮件 [#128031](https://github.com/openclaw/openclaw/pull/128031)
- 修复：创建自动化时拒绝空白触发器脚本 [#129533](https://github.com/openclaw/openclaw/pull/129533)
- fix（cron）：停止在计划运行中建议不可用的工具 [#130228](https://github.com/openclaw/openclaw/pull/130228)

**文档**

- 文档安全外部 cron 投影 [#104227](https://github.com/openclaw/openclaw/pull/104227)
- 文档 Lobster 工作流环境变量和步骤输出 [#108622](https://github.com/openclaw/openclaw/pull/108622)

</details>

</Accordion>

<Accordion id="heartbeats-and-email-watchers" title="心跳和电子邮件观察者">

[Heartbeat 计划](/automation) 现在作为自动化进行管理，失败的工作和警报仍然可见且可重试，并且排队唤醒可以在繁忙时期、处理程序替换和时钟更改中幸存。禁用 Cron 会停止计划的心跳，同时手动和事件驱动的唤醒仍然可用。使用 `HEARTBEAT.md` 的现有安装必须运行 `openclaw doctor --fix` 才能迁移有效工作，因为 OpenClaw 不再在运行时读取该文件。

当其映射选择加入时，[Gmail](/automation/cron-jobs) 可以将已接受的批次拆分为每条消息的一个独立运行，过滤已发送和草稿邮件，并通过观察程序重新启动继续转发，而无需重叠续订或重复重新启动循环。普通自定义映射保持其现有行为，过期的 OAuth 续订运行状况不变。

捆绑的 IMAP 观察程序允许来自现有邮箱的经过身份验证的新邮件启动受限读者代理，而无需暴露 HTTP 挂钩。它默认处于禁用状态并且仅限入站，需要发件人白名单和身份验证，并且无法发送或修改邮件。 3 次临时准入失败后，该消息将记录为已跳过。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将心跳检查列表移至数据库支持的 cron 临时 [#112967](https://github.com/openclaw/openclaw/pull/112967)
- 将心跳任务转换为独立的cron作业 [#113165](https://github.com/openclaw/openclaw/pull/113165)
- feat（插件）：入站 IMAP 电子邮件触发器 [#130230](https://github.com/openclaw/openclaw/pull/130230)
- 将心跳节奏移至系统拥有的 cron 监视器中 [#112585](https://github.com/openclaw/openclaw/pull/112585)
- 需要医生迁移旧版 HEARTBEAT.md 文件 [#113131](https://github.com/openclaw/openclaw/pull/113131)
- 使 cron 监视器行对心跳节奏具有权威性 [#113135](https://github.com/openclaw/openclaw/pull/113135)
- refactor（cron）：在 cron 所有权下统一心跳自动化 [#129862](https://github.com/openclaw/openclaw/pull/129862)
- 将静默心跳结果携带到下一个用户轮中 [#95838](https://github.com/openclaw/openclaw/pull/95838)
- 解释禁用传送时心跳跳过 [#119689](https://github.com/openclaw/openclaw/pull/119689)
- refactor（agents）：去掉多余的心跳系统提示[#129642](https://github.com/openclaw/openclaw/pull/129642)

**错误修复**

- 工具操作失败后保留心跳失败 [#107735](https://github.com/openclaw/openclaw/pull/107735)
- 使模型 [#110193](https://github.com/openclaw/openclaw/pull/110193) 的计划心跳任务保持活动状态
- 防止重复的 cron 唤醒和过时的心跳竞赛 [#114801](https://github.com/openclaw/openclaw/pull/114801)
- 防止计划停滞、重复的 cron 运行和丢失心跳 [#115979](https://github.com/openclaw/openclaw/pull/115979)
- 保留冷自动化唤醒和绑定通知清理 [#117018](https://github.com/openclaw/openclaw/pull/117018)
- 在所属主会话中传递主要目标 cron 提醒 [#125198](https://github.com/openclaw/openclaw/pull/125198)
- 防止心跳所有权导致网关启动崩溃 [#126232](https://github.com/openclaw/openclaw/pull/126232)
- fix（anthropic）：在订阅使用情况下保持自动心跳 [#129513](https://github.com/openclaw/openclaw/pull/129513)
- fix（网关）：扇出批量gmail钩子推送并绑定gmail钩子主体[#130002](https://github.com/openclaw/openclaw/pull/130002)
- 与所选代理保持全局范围的心跳 [#102307](https://github.com/openclaw/openclaw/pull/102307)
- 在没有明确节奏的情况下验证心跳时间 [#102319](https://github.com/openclaw/openclaw/pull/102319)
- 保持承诺心跳响应大队列 [#105780](https://github.com/openclaw/openclaw/pull/105780)
- 在心跳活动时间之外运行主会话 cron 作业 [#105830](https://github.com/openclaw/openclaw/pull/105830)
- 绑定失败后停止 Gmail 观察程序重生循环 [#106314](https://github.com/openclaw/openclaw/pull/106314)
- 防止重复的 Gmail 监视续订 [#108974](https://github.com/openclaw/openclaw/pull/108974)
- 停止 cron 作业阻止其自身立即唤醒 [#109440](https://github.com/openclaw/openclaw/pull/109440)
- 通知发送失败后重试身份验证警报 [#110760](https://github.com/openclaw/openclaw/pull/110760)
- 让 Gmail 设置跳过不受支持的 Python 版本 [#112983](https://github.com/openclaw/openclaw/pull/112983)
- 从代理文件表面删除已停用的 HEARTBEAT.md [#113621](https://github.com/openclaw/openclaw/pull/113621)
- 抑制仅推理心跳确认 [#114454](https://github.com/openclaw/openclaw/pull/114454)
- 从未来上下文中删除静默心跳推理 [#115522](https://github.com/openclaw/openclaw/pull/115522)
- 计划任务首次运行时发送心跳跟进 [#115581](https://github.com/openclaw/openclaw/pull/115581)
- 将映射的唤醒挂钩路由到配置的会话 [#116109](https://github.com/openclaw/openclaw/pull/116109)
- 序列化心跳唤醒并取消关闭时的活动工作 [#116351](https://github.com/openclaw/openclaw/pull/116351)
- 在警报后保持失败的心跳工作挂起 [#118488](https://github.com/openclaw/openclaw/pull/118488)
- 交付结构化心跳回复并清除自有恢复 [#119655](https://github.com/openclaw/openclaw/pull/119655)
- 会话存档后恢复隔离的心跳 [#120314](https://github.com/openclaw/openclaw/pull/120314)
- 防止心跳路由元数据显示为用户输入 [#122075](https://github.com/openclaw/openclaw/pull/122075)
- fix（心跳）：保留取消的代理轮流[#122345](https://github.com/openclaw/openclaw/pull/122345)
- 在显式多代理队列中交付完整的心跳 [#123303](https://github.com/openclaw/openclaw/pull/123303)
- 在热重载时应用心跳节奏更改 [#124410](https://github.com/openclaw/openclaw/pull/124410)
- 荣誉显式 HTTP 挂钩代理和会话目标 [#125351](https://github.com/openclaw/openclaw/pull/125351)
- HHeartbeat 监视器唤醒遵循配置的会话 [#127153](https://github.com/openclaw/openclaw/pull/127153)
- fix（心跳）：在时钟跳转和处理程序替换中保留 cron 唤醒 [#129214](https://github.com/openclaw/openclaw/pull/129214)
- fix（cron）：禁用心跳时发出自动禁用警告 [#129560](https://github.com/openclaw/openclaw/pull/129560)
- fix（cron）：禁用心跳节奏时立即脚本提醒消失 [#129936](https://github.com/openclaw/openclaw/pull/129936)
- fix（心跳）：保留唤醒结果并发出繁忙跳过[#130806](https://github.com/openclaw/openclaw/pull/130806)
- fix（gmail）：在观察者重新启动时保持转发活动 [#130853](https://github.com/openclaw/openclaw/pull/130853)
- fix：在目标会话上下文中表面传递心跳警报[#130871](https://github.com/openclaw/openclaw/pull/130871)
- fix（挂钩）：在禁用 HTTP 挂钩的情况下运行插件触发器 [#131059](https://github.com/openclaw/openclaw/pull/131059)
- fix（imap）：拒绝缺少 DMARC 对齐方式的邮件 [#131060](https://github.com/openclaw/openclaw/pull/131060)
- fix（imap）：在IDLE期间重试读者准入并重新连接[#131072](https://github.com/openclaw/openclaw/pull/131072)
- refactor（imap）：消耗核心标识符-认证尺度[#131178](https://github.com/openclaw/openclaw/pull/131178)
- 抑制异步命令完成时的静默确认 [#73785](https://github.com/openclaw/openclaw/pull/73785)
- Bound HEARTBEAT.md 读取超大文件并发出警告 [#101775](https://github.com/openclaw/openclaw/pull/101775)
- Stop ntfy 悬挂显示器的身份验证通知 [#108650](https://github.com/openclaw/openclaw/pull/108650)
- 在关闭时清理 Gmail 观察程序帮助程序进程 [#112452](https://github.com/openclaw/openclaw/pull/112452)
- 荣誉心跳运行无限超时 [#119297](https://github.com/openclaw/openclaw/pull/119297)
- 保留迁移后的心跳任务命名空间 [#123729](https://github.com/openclaw/openclaw/pull/123729)
- 在状态下显示安静时间心跳跳跃 [#124542](https://github.com/openclaw/openclaw/pull/124542)
- 在轮后处理之前报告已接受的心跳响应 [#125207](https://github.com/openclaw/openclaw/pull/125207)
- 报告实际活跃的心跳节奏 [#126869](https://github.com/openclaw/openclaw/pull/126869)
- fix（心跳）：禁用重复节奏时提供手动唤醒 [#129836](https://github.com/openclaw/openclaw/pull/129836)
- fix（imap）： 邮件验证前停止报告强度 [#131304](https://github.com/openclaw/openclaw/pull/131304)
- fix（gmail）：保持设置命令失败可读 [#131502](https://github.com/openclaw/openclaw/pull/131502)
- 筛选从 Gmail 挂钩发送的邮件和草稿 [#56720](https://github.com/openclaw/openclaw/pull/56720)
- 在活动时间内保持亚分钟心跳 [#96684](https://github.com/openclaw/openclaw/pull/96684)

**文档**

- 从文档中删除已停用的心跳选项 [#113455](https://github.com/openclaw/openclaw/pull/113455)
- 删除过时的心跳跳过路径和指导 [#124385](https://github.com/openclaw/openclaw/pull/124385)

</details>

</Accordion>

<Accordion id="history-alerts-and-delivery" title="历史记录、警报和交付">

[自动化历史记录](/automation/cron-jobs) 现在将运行工作、交付结果和完成整个请求视为单独的事实。作业可以成功执行，但请求仍然失败，因为请求的交付未解决，并且除非显式选择尽力而为，否则需要交付。当没有外部路由时，仅 Web 网关上的当前会话工作将持久会话结果计为完成，而不可用的命名路由仍然是传递错误，而不重新运行已完成的工作。成功的传递重试会清除之前的暂时性错误，并且会在命令行和 Control UI 中显示有意的抑制及其记录的原因，而不是看起来像失败的传递。主要 Webhooks 记录最终确定之前接受或失败的结果，而辅助完成 Webhooks 保持分离的扇出。

历史记录可以显示持续时间、令牌总数、缓存计数器、条件检查和火灾、交付跟踪、取消或失败原因以及来自合格可见通知的直接检查链接。检查链接需要 `gateway.publicOrigin`，历史行可能没有每个可选计数器，并且条件活动属于作业的历史记录而不是全局源。

故障警报使用可配置的路由、阈值和冷却时间，路由支持的警报默认为两次连续故障和一小时的冷却时间。重复的 `cron` 或 `every` 作业在连续十次执行失败后会自行禁用，并解释如何重新启用它们，而仅交付失败不会推进该连续性，成功运行或手动重新启用会重置它。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 自动禁用重复失败的重复自动化 [#118113](https://github.com/openclaw/openclaw/pull/118113)
- feat（cron）：将聊天通知链接到Control UI运行检查[#130049](https://github.com/openclaw/openclaw/pull/130049)
- 在运行历史记录中显示条件自动化活动 [#127200](https://github.com/openclaw/openclaw/pull/127200)
- 在延迟的 cron 故障警报中显示原始运行时间 [#80246](https://github.com/openclaw/openclaw/pull/80246)

**错误修复**

- 防止 cron 和工作板执行竞争 [#114808](https://github.com/openclaw/openclaw/pull/114808)
- 当父母不发出文本时传递计划的子结果 [#117308](https://github.com/openclaw/openclaw/pull/117308)
- 交付 cron webhooks 并记录其结果 [#117783](https://github.com/openclaw/openclaw/pull/117783)
- 将所需的 cron 传送失败报告为失败完成 [#126164](https://github.com/openclaw/openclaw/pull/126164)
- Honor cron 故障警报阈值和冷却时间 [#126483](https://github.com/openclaw/openclaw/pull/126483)
- fix（cron）：记录真实的交付结果并停止错误的成功完成 [#131228](https://github.com/openclaw/openclaw/pull/131228)
- 计划代理运行时出现表面故障完成为空 [#100229](https://github.com/openclaw/openclaw/pull/100229)
- 在保存之前拒绝无效的 cron 故障警报通道 [#103866](https://github.com/openclaw/openclaw/pull/103866)
- 让恢复的 cron 运行使用其最终报告 [#104908](https://github.com/openclaw/openclaw/pull/104908)
- 将 cron 执行状态与交付失败分开 [#105215](https://github.com/openclaw/openclaw/pull/105215)
- 避免直接 cron 传递的重复重试 [#105941](https://github.com/openclaw/openclaw/pull/105941)
- 让 Cron 故障警报覆盖被清除 [#108578](https://github.com/openclaw/openclaw/pull/108578)
- 当 webhook 机密不可用时保持 cron 运行 [#109739](https://github.com/openclaw/openclaw/pull/109739)
- 未读响应后释放 cron webhook 套接字 [#111236](https://github.com/openclaw/openclaw/pull/111236)
- 在交付失败时保持成功的 cron 命令按计划进行 [#111345](https://github.com/openclaw/openclaw/pull/111345)
- 将全局 cron 故障警报传递到正确的目标 [#113737](https://github.com/openclaw/openclaw/pull/113737)
- 保持与当前请求匹配的自动化运行历史记录 [#113765](https://github.com/openclaw/openclaw/pull/113765)
- 在心跳确认后交付计划结果 [#113924](https://github.com/openclaw/openclaw/pull/113924)
- Finalize 完成的 cron 作业，无需等待较慢的同级 [#114441](https://github.com/openclaw/openclaw/pull/114441)
- 修复 cron 交付帐户选择和计划一致性 [#114918](https://github.com/openclaw/openclaw/pull/114918)
- Bound cron 警报并在失败后继续进行心跳清理 [#114920](https://github.com/openclaw/openclaw/pull/114920)
- 为尽力而为的作业提供显式 cron 失败警报 [#115762](https://github.com/openclaw/openclaw/pull/115762)
- 保留cron超时和取消原因 [#116566](https://github.com/openclaw/openclaw/pull/116566)
- 在其配置的线程中保留 cron 失败警报 [#116830](https://github.com/openclaw/openclaw/pull/116830)
- 保留自删除 cron 作业的最终结果 [#116881](https://github.com/openclaw/openclaw/pull/116881)
- 安排自动化时拒绝禁用的通道帐户 [#116899](https://github.com/openclaw/openclaw/pull/116899)
- 修复 cron 故障警报路由和帐户所有权 [#117765](https://github.com/openclaw/openclaw/pull/117765)
- 提高自动化过滤器的可访问性和焦点 [#118133](https://github.com/openclaw/openclaw/pull/118133)
- 仅在结果持久后发送 cron 失败警报 [#118200](https://github.com/openclaw/openclaw/pull/118200)
- 仅在持久化后发布cron自动禁用状态 [#118384](https://github.com/openclaw/openclaw/pull/118384)
- 仅心跳父级回复后交付 cron 子级结果 [#118743](https://github.com/openclaw/openclaw/pull/118743)
- fix（cron）：在静默回复后保留工具故障 [#120056](https://github.com/openclaw/openclaw/pull/120056)
- 添加一键Codex重新登录过期自动化警报[#121067](https://github.com/openclaw/openclaw/pull/121067)
- 在 cron 历史记录中显示可操作的代码模式 MCP 故障 [#121796](https://github.com/openclaw/openclaw/pull/121796)
- 在发送警报之前记录耗尽的流故障 [#122187](https://github.com/openclaw/openclaw/pull/122187)
- cron 输出传送失败时发出警报 [#123237](https://github.com/openclaw/openclaw/pull/123237)
- 与自有代理保持多代理自动化交付 [#123283](https://github.com/openclaw/openclaw/pull/123283)
- 区分自动禁用的自动化与暂停的作业 [#123769](https://github.com/openclaw/openclaw/pull/123769)
- 将跳过的自动化运行显示为失败任务 [#123787](https://github.com/openclaw/openclaw/pull/123787)
- 显示更干净、准确自动化故障原因 [#124511](https://github.com/openclaw/openclaw/pull/124511)
- 在故障交付期间荣誉 cron 作业所有权 [#124631](https://github.com/openclaw/openclaw/pull/124631)
- 7 天后修剪终端 cron 任务历史记录 [#126095](https://github.com/openclaw/openclaw/pull/126095)
- 返回已完成的 cron 和 CLI 任务的最终结果 [#127045](https://github.com/openclaw/openclaw/pull/127045)
- fix（cron）：停止报告已发送的抑制的计划消息 [#128519](https://github.com/openclaw/openclaw/pull/128519)
- fix（cron）：故障警报默默地切换到错误的会话[#129645](https://github.com/openclaw/openclaw/pull/129645)
- fix（cron）：防止丢失和重复的故障警报 [#129908](https://github.com/openclaw/openclaw/pull/129908)
- fix（cron）：当代理稍后运行失败时，保留经过验证的消息传递 [#129974](https://github.com/openclaw/openclaw/pull/129974)
- fix（cron）：持久传递抑制原因并记录严格失败 [#130811](https://github.com/openclaw/openclaw/pull/130811)
- fix（hooks）：成功运行后报告传送失败 [#130926](https://github.com/openclaw/openclaw/pull/130926)
- fix（cron）：区分故意抑制的交付 [#131774](https://github.com/openclaw/openclaw/pull/131774)
- fix：显示自动化历史记录中记录的交货抑制[#131830](https://github.com/openclaw/openclaw/pull/131830)
- fix（cron）：当前会话自动化失败，并在仅限网络聊天的网关上显示“需要通道”[#131975](https://github.com/openclaw/openclaw/pull/131975)
- 让有意静默的计划运行成功 [#95725](https://github.com/openclaw/openclaw/pull/95725)
- 恢复基于通道的 cron 故障警报 [#102445](https://github.com/openclaw/openclaw/pull/102445)
- 在 cron 诊断中保留完整的 Unicode 字符 [#102624](https://github.com/openclaw/openclaw/pull/102624)
- 在 cron exec 失败尾部中保留有效的 Unicode [#104385](https://github.com/openclaw/openclaw/pull/104385)
- 拒绝不支持的 cron 传递标志，并显示明显错误 [#105910](https://github.com/openclaw/openclaw/pull/105910)
- 在安排之前拒绝格式错误的 cron 交付目标 [#106952](https://github.com/openclaw/openclaw/pull/106952)
- 在 cron 运行历史记录中显示可读令牌计数和持续时间 [#108014](https://github.com/openclaw/openclaw/pull/108014)
- 停止报告成功的静默 cron 变成错误 [#114528](https://github.com/openclaw/openclaw/pull/114528)
- 保留 cron 故障警报帐户和线程路由 [#116933](https://github.com/openclaw/openclaw/pull/116933)
- 将活动的 cron 任务链接到其实际执行记录 [#117679](https://github.com/openclaw/openclaw/pull/117679)
- 在 macOS 编辑器中保留额外的 cron 传递字段 [#118047](https://github.com/openclaw/openclaw/pull/118047)
- fix（cron）：报告已验证的代理发送而不是“未请求”[#118260](https://github.com/openclaw/openclaw/pull/118260)
- 在突变时拒绝不明确的多通道 cron 传递 [#118272](https://github.com/openclaw/openclaw/pull/118272)
- 仅在持久化后发布cron自动禁用通知 [#118778](https://github.com/openclaw/openclaw/pull/118778)
- fix（cron）：拒绝主会话聊天传递而不是静默丢弃 [#119923](https://github.com/openclaw/openclaw/pull/119923)
- 在网关调用之前拒绝无效的 cron webhook URL [#121533](https://github.com/openclaw/openclaw/pull/121533)
- 删除作业后保留代理过滤的 Cron 历史记录 [#122791](https://github.com/openclaw/openclaw/pull/122791)
- 停止重试永久 cron 交付拒绝 [#122821](https://github.com/openclaw/openclaw/pull/122821)
- 停止将正在运行的自动化标记为过期 [#123745](https://github.com/openclaw/openclaw/pull/123745)
- Finalize 直接 cron 运行在执行期间被删除 [#124457](https://github.com/openclaw/openclaw/pull/124457)
- fix（cron）：运行历史记录忽略缓存令牌计数器，使令牌总数无法解释 [#124657](https://github.com/openclaw/openclaw/pull/124657)
- 将 cron 传递跟踪添加到公共运行历史记录类型 [#124856](https://github.com/openclaw/openclaw/pull/124856)
- 报告缺少的自动化而不是空的 cron 历史记录 [#125343](https://github.com/openclaw/openclaw/pull/125343)
- 当 cron 通知引用已删除的代理时发出警告 [#126361](https://github.com/openclaw/openclaw/pull/126361)
- 在聊天警报中显示安全自动化故障详细信息 [#126384](https://github.com/openclaw/openclaw/pull/126384)
- fix（macos）：保持 Cron 运行历史记录与所选作业 [#127266](https://github.com/openclaw/openclaw/pull/127266) 匹配
- fix（ui）：保持运行历史下拉文本在设备之间保持一致 [#127443](https://github.com/openclaw/openclaw/pull/127443)
- fix（cron）：保留跨通道别名的故障警报路由 [#128280](https://github.com/openclaw/openclaw/pull/128280)
- fix（cron）：计划投递失败显示为成功 [#129160](https://github.com/openclaw/openclaw/pull/129160)
- fix（cron）：发送失败的自动化运行的完成 Webhook [#129247](https://github.com/openclaw/openclaw/pull/129247)
- fix（cron）：取消原因在延迟交付完成后仍然存在 [#129331](https://github.com/openclaw/openclaw/pull/129331)
- fix（cron）：显示活动暂停作业的运行状态 [#129339](https://github.com/openclaw/openclaw/pull/129339)
- fix（cron）：保留过时的交付抑制诊断 [#129408](https://github.com/openclaw/openclaw/pull/129408)
- fix（cron）：拒绝空白显式 Telegram 线程 ID [#129841](https://github.com/openclaw/openclaw/pull/129841)
- fix（cron）：成功的尽力重试仍报告传送失败 [#131419](https://github.com/openclaw/openclaw/pull/131419)
- fix（ui）：禁用调度程序时抑制过期作业 [#131498](https://github.com/openclaw/openclaw/pull/131498)
- 将 cron 公告集中在收件人 [#90836](https://github.com/openclaw/openclaw/pull/90836)
- 调整当前会话和指定会话的计划结果交付 [#99115](https://github.com/openclaw/openclaw/pull/99115)

**文档**

- 从文档中删除已停用的 cron 运行日志设置 [#106640](https://github.com/openclaw/openclaw/pull/106640)
- 在帮助和文档中澄清 cron 通道插件 ID [#124655](https://github.com/openclaw/openclaw/pull/124655)

</details>

</Accordion>

<Accordion id="automations-after-a-restart" title="重启后的自动化">

[重新启动恢复](/gateway/restart-recovery) 现在可以区分真正错过的工作和已经完成或不再属于当前自动化的工作。排队和推迟的运行、重新安排的一次性提醒、重新启动或时钟更改期间错过的计划时间以及没有最终结果的中断的一次性作业都可以在正常的追赶节奏下返回。具有持久终端结果的尝试不会重播，并且已完成的槽、已删除或退休的作业、旧计划以及替换调度程序中的工作将保持退休状态。

当前的编辑、自我删除和重新安排在启动过程中都会保留，并发调度程序工作不再覆盖同级作业，并且损坏的旧行仍然可供 Doctor 使用。失败或跳过的一次性恢复仍处于禁用状态以供检查，而配置为 `deleteAfterRun` 的成功作业通常会被删除。当传统运行标记无法确定是否发生外部副作用时，它们仍然会保持中断状态，因此外部系统中的一次性执行仍处于调度程序的恢复边界之外。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- feat（cron）：重新启动时恢复中断的一次性作业 [#131473](https://github.com/openclaw/openclaw/pull/131473)
- 解释 Doctor [#98620](https://github.com/openclaw/openclaw/pull/98620) 中陈旧的飞行中 cron 作业

**错误修复**

- 跨网关重新启动时保留排队的 cron 作业 [#110159](https://github.com/openclaw/openclaw/pull/110159)
- 在启动追赶期间保留 cron 作业更改 [#110977](https://github.com/openclaw/openclaw/pull/110977)
- 保留 cron 脚本状态并抑制过时的重启影响 [#111292](https://github.com/openclaw/openclaw/pull/111292)
- 网关重启后保留重新安排的提醒 [#114677](https://github.com/openclaw/openclaw/pull/114677)
- 防止 cron 和 Workboard 生命周期竞争 [#114744](https://github.com/openclaw/openclaw/pull/114744)
- 保留调度程序状态和真实的交付结果 [#116923](https://github.com/openclaw/openclaw/pull/116923)
- 在 SQLite [#117071](https://github.com/openclaw/openclaw/pull/117071) 中保持 cron 作业和格式错误作业恢复原子性
- 防止搁浅作业产生无效的 cron 时间戳 [#121394](https://github.com/openclaw/openclaw/pull/121394)
- fix（cron）：关闭重启恢复身份差距并停止静默心跳警报下降[#131219](https://github.com/openclaw/openclaw/pull/131219)
- 防止已完成的 cron 槽在重新启动后重播 [#101998](https://github.com/openclaw/openclaw/pull/101998)
- 重新启用后防止重复的 cron 运行 [#102255](https://github.com/openclaw/openclaw/pull/102255)
- 仅在持久删除后发布 cron 删除 [#104130](https://github.com/openclaw/openclaw/pull/104130)
- 在挂起准备期间保持 cron 连续恢复处于活动状态 [#104397](https://github.com/openclaw/openclaw/pull/104397)
- 保留 cron 快速模式会话状态 [#105094](https://github.com/openclaw/openclaw/pull/105094)
- 存储故障后关闭 cron 会话清理 [#105386](https://github.com/openclaw/openclaw/pull/105386)
- 修剪过时的 cron 运行后代会话 [#105633](https://github.com/openclaw/openclaw/pull/105633)
- 防止已完成的 cron 工作在声明冲突后重试 [#108778](https://github.com/openclaw/openclaw/pull/108778)
- Preserve 延迟 cron 追赶在重新启动时运行 [#110351](https://github.com/openclaw/openclaw/pull/110351)
- 保留持久 cron 会话的浏览器选项卡 [#113984](https://github.com/openclaw/openclaw/pull/113984)
- 防止重复和丢失计划交货 [#114479](https://github.com/openclaw/openclaw/pull/114479)
- 在手动运行期间保留未来的一次性 cron 作业 [#114491](https://github.com/openclaw/openclaw/pull/114491)
- 保留活动运行期间编辑的一次性计划 [#114569](https://github.com/openclaw/openclaw/pull/114569)
- 保护重新创建的提醒免受陈旧活动运行的影响 [#114756](https://github.com/openclaw/openclaw/pull/114756)
- 防止已完成的 cron 作业在重新启动后重新运行 [#114820](https://github.com/openclaw/openclaw/pull/114820)
- fix（cron）：在网关重新加载时保留活动的监视命令 [#115761](https://github.com/openclaw/openclaw/pull/115761)
- 停止编辑的 cron 计划重播旧插槽 [#115779](https://github.com/openclaw/openclaw/pull/115779)
- fix：网关重启后清除过时的维护任务[#116344](https://github.com/openclaw/openclaw/pull/116344)
- 在亚秒级网关重新启动期间错过重播 cron 作业 [#117797](https://github.com/openclaw/openclaw/pull/117797)
- 将 Cron 关闭跟踪范围限制到每次运行 [#118393](https://github.com/openclaw/openclaw/pull/118393)
- 删除 cron 作业时删除 Ghost 会话 [#119520](https://github.com/openclaw/openclaw/pull/119520)
- 当会话保留为零时保留 cron 运行历史记录 [#120213](https://github.com/openclaw/openclaw/pull/120213)
- 替换触发器脚本时保留一次性 cron 行为 [#120226](https://github.com/openclaw/openclaw/pull/120226)
- 通知失败时保持 cron 运行 [#120266](https://github.com/openclaw/openclaw/pull/120266)
- fix（cron）：避免无操作写入和无界页面复制 [#120910](https://github.com/openclaw/openclaw/pull/120910)
- 删除持久作业后删除 cron 划痕 [#121024](https://github.com/openclaw/openclaw/pull/121024)
- 在禁用排队运行后保持自动化可运行 [#123725](https://github.com/openclaw/openclaw/pull/123725)
- 停止已删除代理的 cron 收割机警告循环 [#124566](https://github.com/openclaw/openclaw/pull/124566)
- 使用旧版 cron 作业完成升级 [#124809](https://github.com/openclaw/openclaw/pull/124809)
- 当可执行文件更改时清除已停用的 cron 触发器状态 [#126940](https://github.com/openclaw/openclaw/pull/126940)
- 在网关重新启动之前等待 cron 退出观察者 [#126963](https://github.com/openclaw/openclaw/pull/126963)
- fix（cron）：防止同一毫秒重新启动后出现过时结果 [#127003](https://github.com/openclaw/openclaw/pull/127003)
- fix（cron）：系统时钟更改时网关关闭挂起 [#128374](https://github.com/openclaw/openclaw/pull/128374)
- fix（cron）：一旦改变[#128495](https://github.com/openclaw/openclaw/pull/128495)，重置触发状态
- fix（cron）：栅栏过时执行代 [#128573](https://github.com/openclaw/openclaw/pull/128573)
- fix（cron）：防止已退出的计划作业在网关重新启动后运行 [#128678](https://github.com/openclaw/openclaw/pull/128678)
- fix（cron）：恢复在弹簧向前间隙中错过的提醒 [#129478](https://github.com/openclaw/openclaw/pull/129478)
- fix：保留尽力而为的 cron 上下文以进行后续回复 [#130551](https://github.com/openclaw/openclaw/pull/130551)
- 删除成功的退出一次性 cron 作业 [#104550](https://github.com/openclaw/openclaw/pull/104550)
- 清理转换为一次性计划的重复作业 [#110431](https://github.com/openclaw/openclaw/pull/110431)
- 向后时钟更改后恢复 cron 作业 [#111743](https://github.com/openclaw/openclaw/pull/111743)
- 在活动运行期间保留 cron 计划编辑 [#114919](https://github.com/openclaw/openclaw/pull/114919)
- 在关闭失败后删除停止的调度程序自动化 [#115316](https://github.com/openclaw/openclaw/pull/115316)
- 清理失败后释放 cron 会话准入 [#126413](https://github.com/openclaw/openclaw/pull/126413)
- fix（医生）：暴露禁用的飞行自动化[#128664](https://github.com/openclaw/openclaw/pull/128664)

**文档**

- Document Doctor 的飞行中 cron 作业警告 [#99086](https://github.com/openclaw/openclaw/pull/99086)

</details>

</Accordion>

</AccordionGroup>
