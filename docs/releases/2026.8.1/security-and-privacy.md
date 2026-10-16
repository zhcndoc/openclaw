---
title: "v2026.8.1：安全和隐私"
description: "批准始终附加到确切的请求、命令、会话和接收者，并且受保护的凭据可以到达受支持的目标，而无需输入模型可见的文本。"
---

敏感的工作现在有了更多的权威。 [Approvals](/tools/exec-approvals) 保持附加到确切的请求、命令、会话和接收它们的人员，再次删除或配对设备会停用其旧访问权限，并且 [ 受保护的凭据](/gateway/secrets) 可以到达支持的目标，而无需输入模型可见的文本。沙箱、网络请求、浏览器操作和插件安装还会重新检查它们所依赖的工作区、目标、文档、发布者、版本或工件，因此陈旧或不匹配的权限会再次停止或询问，而不是被重用。

<AccordionGroup>

<Accordion id="approvals-and-permissions" title="批准和权限">

[ 批准请求 ](/tools/exec-approvals) 现在拥有由授权浏览器和支持的移动界面共享的持久记录。第一个有效答案解决了这个问题，重新连接无法恢复已完成的请求，放弃的请求将被取消，中止运行将清除其未决的批准。操作员还可以选择安装已安装的 Control UI PWA 批准警报，这些警报会打开经过身份验证的请求，并在交付之前再次检查订阅的设备、人员、当前角色和范围、首选项以及请求可见性。已解决或过期的请求将替换过时的可操作警报，而可选代理和任务警报默认保持关闭状态。

经常性自动化现在可以在批准页面和 CLI 中显示其常设授权，包括所属自动化、确切命令、使用计数和当前状态。撤销活动授权会在下一个生成边界生效，因此下一次发生时会再次询问，并且托管部署可以设置用于未来授权的默认生命周期。可重用命令 [permission](/gateway/permission-modes) 仍然可以绑定到确切的参数和工作目录，而脚本支持的命令会重新检查运行前检查的字节。绑定涵盖了已审查的命令和脚本字节，而解释器和更改依赖项可能会引入单独的行为；不透明的包装器和可以启动其他东西的命令可能会再次询问。

每个会话都可以选择只读、受保护、工作区或完全访问权限，并覆盖 MCP 服务器、技能或 Web 搜索（客户端公开这些控件），并为管理员保留完全访问权限。每轮执行限制可以收紧该会话策略，但不能放松它，Doctor 为旧的持久执行字段提供了迁移路径。计划和委派的工作保留其原始策略，而另一台机器的不确定结果将报告为未知，而不是根据猜测重试。

每个会话的控制是不可追溯的，因此没有权限模式的现有会话将保持以前的全局状态。选择加入角色限制了一个受信任的 OpenClaw 安装内部的协作，而不是在敌对租户之间创建隔离。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 坚持一种规范的操作员审批生命周期 [#103579](https://github.com/openclaw/openclaw/pull/103579)
- 从安全独立链接打开批准 [#103698](https://github.com/openclaw/openclaw/pull/103698)
- 添加仅元数据消息生命周期审核历史记录 [#103903](https://github.com/openclaw/openclaw/pull/103903)
- 使批准在会话和移动客户端之间持久 [#104837](https://github.com/openclaw/openclaw/pull/104837)
- 审查 Android、iPhone 和 Apple 的持久执行批准观看 [#104913](https://github.com/openclaw/openclaw/pull/104913)
- 将插件批准显示为本机 iPhone 通知 [#108709](https://github.com/openclaw/openclaw/pull/108709)
- 列出并解决 CLI [#111060](https://github.com/openclaw/openclaw/pull/111060) 的待批准事项
- 管理Control UI [#112401](https://github.com/openclaw/openclaw/pull/112401)中通道DM的访问请求
- 在 Control UI [#113027](https://github.com/openclaw/openclaw/pull/113027) 中显示完整的插件批准详细信息
- 让提示钩将工具表面缩小一圈 [#114151](https://github.com/openclaw/openclaw/pull/114151)
- 使节点控制使能持久 [#114892](https://github.com/openclaw/openclaw/pull/114892)
- 添加针对 MCP、技能和 Web 搜索的每会话控制 [#115785](https://github.com/openclaw/openclaw/pull/115785)
- 检查确切代理执行背后的身份 [#117034](https://github.com/openclaw/openclaw/pull/117034)
- 检查 Control UI [#119810](https://github.com/openclaw/openclaw/pull/119810) 中的持久运行身份
- 解释审核检查中操作员批准结果 [#119815](https://github.com/openclaw/openclaw/pull/119815)
- 将代理和工作人员权限绑定到每个承认的运行 [#120534](https://github.com/openclaw/openclaw/pull/120534)
- 解释审核检查中的出站消息传递 [#123709](https://github.com/openclaw/openclaw/pull/123709)
- 添加每会话权限模式和工作树包含 [#124909](https://github.com/openclaw/openclaw/pull/124909)
- 让团队操作员使用管理员配置的云运行器 [#125787](https://github.com/openclaw/openclaw/pull/125787)
- 审核精确绑定的所有者本机生命周期收据 [#126082](https://github.com/openclaw/openclaw/pull/126082)
- feat（网关）：非维护人员访问的通用操作员角色 [#128548](https://github.com/openclaw/openclaw/pull/128548)
- feat（audit）：记录会话操作决策 [#129093](https://github.com/openclaw/openclaw/pull/129093)
- feat：添加安全 PWA 批准通知和首选项 [#129348](https://github.com/openclaw/openclaw/pull/129348)
- feat（批准）：范围内的常设拨款使定期 cron 自动化一旦 [#129526](https://github.com/openclaw/openclaw/pull/129526) 即可批准
- feat（approvals）：通道卡上键入的批准范围摘要 [#130116](https://github.com/openclaw/openclaw/pull/130116)
- feat（安全）：对惰性可变的allowFrom条目发出警告[#131129](https://github.com/openclaw/openclaw/pull/131129)
- feat（批准）：常设拨款账本、撤销和可配置条款 [#131602](https://github.com/openclaw/openclaw/pull/131602)
- 向配对的 iOS 设备发送插件批准通知 [#108505](https://github.com/openclaw/openclaw/pull/108505)
- 将编写的路由检查添加到策略 [#111087](https://github.com/openclaw/openclaw/pull/111087)
- 在消息传递渠道的审批提示中添加粗体标签 [#113193](https://github.com/openclaw/openclaw/pull/113193)
- 在突变授权期间重用会话存储查找 [#114736](https://github.com/openclaw/openclaw/pull/114736)
- 允许以写入范围创建包含的工作树 [#125598](https://github.com/openclaw/openclaw/pull/125598)
- feat（审核）：解释插件和远程操作 [#126027](https://github.com/openclaw/openclaw/pull/126027)
- feat（audit）：记录承认的模型路由决策[#129092](https://github.com/openclaw/openclaw/pull/129092)
- feat（审计）：记录通用工具操作决策 [#130358](https://github.com/openclaw/openclaw/pull/130358)
- feat（ui）：在会话权限选择器 [#132989](https://github.com/openclaw/openclaw/pull/132989) 中标记配置的默认值
- 使批准请求所有权明确并向后兼容 [#125084](https://github.com/openclaw/openclaw/pull/125084)
- improve（ui）：将权限文档链接添加到选择器 [#131152](https://github.com/openclaw/openclaw/pull/131152)

**错误修复**

- 将工作人员权限绑定到确切的生命周期声明 [a0278af](https://github.com/openclaw/openclaw/commit/a0278af)
- 跨代理生命周期转换保留工具限制 [b5809f5](https://github.com/openclaw/openclaw/commit/b5809f5)
- 在跨目录导入状态之前需要医生批准 [#103247](https://github.com/openclaw/openclaw/pull/103247)
- 防止自动医生从移动审批状态运行 [#103353](https://github.com/openclaw/openclaw/pull/103353)
- 将执行自动审查绑定到确切的命令和批准 [#103430](https://github.com/openclaw/openclaw/pull/103430)
- 防止执行批准撤销竞争 [#103515](https://github.com/openclaw/openclaw/pull/103515)
- 添加类型化的跨表面审批操作 [#103679](https://github.com/openclaw/openclaw/pull/103679)
- 批准策略更改后拒绝延迟的 Mac 执行 [#103968](https://github.com/openclaw/openclaw/pull/103968)
- 将 cron 触发器脚本保留在创建者工具权限内 [#104430](https://github.com/openclaw/openclaw/pull/104430)
- fix：保持命令 cron 作业操作员范围 [AI] [#106057](https://github.com/openclaw/openclaw/pull/106057)
- 特权命令需要显式所有者权限 [#107403](https://github.com/openclaw/openclaw/pull/107403)
- 保持网关拥有的恢复和审批正在进行中 [#108423](https://github.com/openclaw/openclaw/pull/108423)
- 通过状态目录隔离审批策略 [#108742](https://github.com/openclaw/openclaw/pull/108742)
- 单独 Discord 业主权限语音准入 [#108813](https://github.com/openclaw/openclaw/pull/108813)
- 范围 ACP 当前发送者的会话列表 [#110745](https://github.com/openclaw/openclaw/pull/110745)
- 运行中止时取消待批准 [#110993](https://github.com/openclaw/openclaw/pull/110993)
- 使丢失权限错误在网关客户端之间保持一致 [#111013](https://github.com/openclaw/openclaw/pull/111013)
- 停止静默重新运行失败网关在本地转[#112074](https://github.com/openclaw/openclaw/pull/112074)
- 第一次成功通知后解锁批准 [#114022](https://github.com/openclaw/openclaw/pull/114022)
- 将执行批准从锁定文件移动到共享 SQLite [#114063](https://github.com/openclaw/openclaw/pull/114063)
- 需要批准可启动的外壳包装器 [#114519](https://github.com/openclaw/openclaw/pull/114519)
- 需要人工批准不透明的 shell 命令 [#114558](https://github.com/openclaw/openclaw/pull/114558)
- 需要确认不明确的自动命令审查 [#114681](https://github.com/openclaw/openclaw/pull/114681)
- 策略或挂钩重写后重新确认语音操作 [#114721](https://github.com/openclaw/openclaw/pull/114721)
- 将失败的命令自动审查推迟到人工批准 [#114802](https://github.com/openclaw/openclaw/pull/114802)
- 防止 Codex 批准升级阻止无人值守运行 [#116117](https://github.com/openclaw/openclaw/pull/116117)
- 防止在不明确的节点命令后自动重试 [#117276](https://github.com/openclaw/openclaw/pull/117276)
- 将 Control UI 会话操作与操作员权限对齐 [#117920](https://github.com/openclaw/openclaw/pull/117920)
- 在其原始网关上保留延迟的 Control UI 命令 [#118019](https://github.com/openclaw/openclaw/pull/118019)
- 绑定待批准并保留通知订单 [#118252](https://github.com/openclaw/openclaw/pull/118252)
- 需要明确的所有者进行珊瑚礁管理 [#118578](https://github.com/openclaw/openclaw/pull/118578)
- 强制配置Microsoft Teams批准所有者[#118967](https://github.com/openclaw/openclaw/pull/118967)
- 使子代理硬拒绝工具不可重写 [#120025](https://github.com/openclaw/openclaw/pull/120025)
- 强制 Telegram 私信工具限制 [#120992](https://github.com/openclaw/openclaw/pull/120992)
- 将审批请求保留在其所属渠道账户上 [#121673](https://github.com/openclaw/openclaw/pull/121673)
- 在 Claude 实时会话中强制执行限制 [#121678](https://github.com/openclaw/openclaw/pull/121678)
- Fence cron 执行，具有持久运行收据 [#122948](https://github.com/openclaw/openclaw/pull/122948)
- 让可信本地设备拓宽范围，无审批死角 [#124589](https://github.com/openclaw/openclaw/pull/124589)
- 将命令批准绑定到已审核的脚本字节 [#124858](https://github.com/openclaw/openclaw/pull/124858)
- 更新 cron 作业时保留调用者工具权限 [#125180](https://github.com/openclaw/openclaw/pull/125180)
- 保持语音通话只读 [#125392](https://github.com/openclaw/openclaw/pull/125392)
- 通过生命周期提交强制会话参与 [#125889](https://github.com/openclaw/openclaw/pull/125889)
- 限制入站语音呼叫的所有者专用工具 [#125953](https://github.com/openclaw/openclaw/pull/125953)
- feat（ui）：解释活动 [#126007](https://github.com/openclaw/openclaw/pull/126007) 中的决策收据
- 使完全访问会话在没有 OpenClaw 批准提示的情况下运行 [#126210](https://github.com/openclaw/openclaw/pull/126210)
- 将AGENTS.md保留在刀具限制的Codex转弯中[#126891](https://github.com/openclaw/openclaw/pull/126891)
- 在锁定突变之前重新验证作用域 cron 所有权 [#127042](https://github.com/openclaw/openclaw/pull/127042)
- fix（exec）：调整监护人对绑定复合计划的批准 [#128279](https://github.com/openclaw/openclaw/pull/128279)
- fix（codex）：统一会话权限策略[#128464](https://github.com/openclaw/openclaw/pull/128464)
- fix（代理）：强制共享终端输入的会话权限[#129604](https://github.com/openclaw/openclaw/pull/129604)
- fix（exec）：将可重用批准范围限制到其工作目录 [#129636](https://github.com/openclaw/openclaw/pull/129636)
- fix（文件传输）：准确记住批准 [#129762](https://github.com/openclaw/openclaw/pull/129762)
- fix（agents）：保留压缩提示工具策略[#130337](https://github.com/openclaw/openclaw/pull/130337)
- fix（代理）：释放凭证刷新期间取消的运行 [#130856](https://github.com/openclaw/openclaw/pull/130856)
- fix（ui）： 在控制聊天 [#131829](https://github.com/openclaw/openclaw/pull/131829) 中显示 Codex 节点批准
- fix（代理）：保留对调制会话的严格执行覆盖；统一权限反向映射 [#132675](https://github.com/openclaw/openclaw/pull/132675)
- fix（代理）：强制执行本机 MCP 工具策略 [#133089](https://github.com/openclaw/openclaw/pull/133089)
- 将委派的通道操作保留在允许的对话内 [#99905](https://github.com/openclaw/openclaw/pull/99905)
- Bind Copilot 主动运行到主机工具权限 [0fa3548](https://github.com/openclaw/openclaw/commit/0fa3548)
- 将转向权绑定到主动模型路线 [129c06d](https://github.com/openclaw/openclaw/commit/129c06d)
- 绑定主动Codex转向工具权限[1bb20fb](https://github.com/openclaw/openclaw/commit/1bb20fb)
- 在代理路由更改期间保持待处理答复的安全 [42b74b2](https://github.com/openclaw/openclaw/commit/42b74b2)
- 在权限变更后保留对未决代理问题的答复 [54cf346](https://github.com/openclaw/openclaw/commit/54cf346)
- 在隔离会话中禁用受限制的 Codex 功能 [d183d06](https://github.com/openclaw/openclaw/commit/d183d06)
- 将并发 ACP exec 批准路由到匹配的提示符 [#101037](https://github.com/openclaw/openclaw/pull/101037)
- 将配置的组范围应用于 QQBot 通道 API [#101765](https://github.com/openclaw/openclaw/pull/101765)
- 通过清理使批准的子代理执行后续活动保持活动状态 [#101830](https://github.com/openclaw/openclaw/pull/101830)
- 将失败的插件绑定批准保留在可信内存之外 [#101906](https://github.com/openclaw/openclaw/pull/101906)
- 恢复Mac App节点的执行批准 [#102688](https://github.com/openclaw/openclaw/pull/102688)
- 需要心跳消息来命名收件人 [#103711](https://github.com/openclaw/openclaw/pull/103711)
- 恢复本地 CLI 代理运行的所有者专用工具 [#103922](https://github.com/openclaw/openclaw/pull/103922)
- 报告实际Mac节点exec-approval默认值[#103945](https://github.com/openclaw/openclaw/pull/103945)
- 在持续的策略更改后拒绝延迟执行批准 [#103950](https://github.com/openclaw/openclaw/pull/103950)
- 在群组 DM 中强制执行 Slack 发件人策略 [#104007](https://github.com/openclaw/openclaw/pull/104007)
- 关闭已过期的macOS执行批准[#104302](https://github.com/openclaw/openclaw/pull/104302)
- 浏览器代理节点需要管理员批准 [#104491](https://github.com/openclaw/openclaw/pull/104491)
- fix（网关）：允许默认模型配置编辑并解释受保护路径拒绝 [#106071](https://github.com/openclaw/openclaw/pull/106071)
- 在原始网关连接上保留排队聊天设置 [#106901](https://github.com/openclaw/openclaw/pull/106901)
- 使用原生Clack提示并取消合约 [#107286](https://github.com/openclaw/openclaw/pull/107286)
- 根运行 Claude 实时会话使用支持的权限模式 [#107606](https://github.com/openclaw/openclaw/pull/107606)
- 防止过时的救援批准应用旧的更改 [#108147](https://github.com/openclaw/openclaw/pull/108147)
- 在迁移预览中显示配置更改 [#108556](https://github.com/openclaw/openclaw/pull/108556)
- 块外部 WebChat 检查点分支 [#108678](https://github.com/openclaw/openclaw/pull/108678)
- 拒绝无法交付的执行批准，无需长时间等待 [#108935](https://github.com/openclaw/openclaw/pull/108935)
- 短读取后保留本机二进制批准 [#109485](https://github.com/openclaw/openclaw/pull/109485)
- 标准化通道访问检查并保留媒体回退 [#109548](https://github.com/openclaw/openclaw/pull/109548)
- 防止不相关的管理操作共享一个速率限制 [#109557](https://github.com/openclaw/openclaw/pull/109557)
- 跨授权保留发件人范围的工具 [#110345](https://github.com/openclaw/openclaw/pull/110345)
- 澄清 CLI 超时并防止不安全的瞬态重试 [#110369](https://github.com/openclaw/openclaw/pull/110369)
- 加入或离开后刷新 Discord 成员角色 [#110414](https://github.com/openclaw/openclaw/pull/110414)
- 添加结构化缺失范围授权错误 [#110925](https://github.com/openclaw/openclaw/pull/110925)
- 按操作员范围授权 WebChat 会话更改 [#110931](https://github.com/openclaw/openclaw/pull/110931)
- 拒绝不安全的显式网关批准 ID [#111055](https://github.com/openclaw/openclaw/pull/111055)
- 保留显式批准 ID 进行验证 [#111388](https://github.com/openclaw/openclaw/pull/111388)
- 需要密钥会话模型更改的管理范围 [#111651](https://github.com/openclaw/openclaw/pull/111651)
- 将执行批准范围限制为携带的命令 [#111652](https://github.com/openclaw/openclaw/pull/111652)
- 对 Claude CLI [#112457](https://github.com/openclaw/openclaw/pull/112457) 强制执行受限 cron 工具
- 将可重用的执行批准绑定到确切的参数 [#112946](https://github.com/openclaw/openclaw/pull/112946)
- 需要批准不透明包装器背后的命令 [#112953](https://github.com/openclaw/openclaw/pull/112953)
- 需要批准其他 shell 包装器中的隐藏命令 [#112955](https://github.com/openclaw/openclaw/pull/112955)
- 一次性获得更多内联口译员批准 [#112956](https://github.com/openclaw/openclaw/pull/112956)
- 完成批准的 TUI 操作员范围升级 [#113644](https://github.com/openclaw/openclaw/pull/113644)
- Honor 拒绝 shell 扩展 exec 命令的回退 [#113892](https://github.com/openclaw/openclaw/pull/113892)
- fix（代理）：应用会话访问更改而不重新启动 [#114027](https://github.com/openclaw/openclaw/pull/114027)
- 阻止未建模的命令包装可执行文件 [#114132](https://github.com/openclaw/openclaw/pull/114132)
- 需要批准转义换行 shell 字 [#114134](https://github.com/openclaw/openclaw/pull/114134)
- 需要透明 Windows cmd 启动以进行自动审核 [#114652](https://github.com/openclaw/openclaw/pull/114652)
- 停止取消命令审查并强化 PR 自动化 [#114745](https://github.com/openclaw/openclaw/pull/114745)
- 使 Cron 只浏览只读操作符 [#115091](https://github.com/openclaw/openclaw/pull/115091)
- Stop 在调度之前或期间取消远程节点命令 [#115176](https://github.com/openclaw/openclaw/pull/115176)
- 使架构和批准恢复错误可操作 [#115232](https://github.com/openclaw/openclaw/pull/115232)
- Stop 在执行之前取消节点命令 [#115373](https://github.com/openclaw/openclaw/pull/115373)
- 对 OpenAI 请求强制使用一致的代码模式工具表面 [#115460](https://github.com/openclaw/openclaw/pull/115460)
- 停止重复 macOS exec-approval 迁移重试 [#115502](https://github.com/openclaw/openclaw/pull/115502)
- 需要语音确认并恢复 GPT-Live Talk [#115562](https://github.com/openclaw/openclaw/pull/115562) 的转向
- 删除创建者帐户后拒绝预定工具 [#115932](https://github.com/openclaw/openclaw/pull/115932)
- 需要批准缩写的内联评估标志 [#116529](https://github.com/openclaw/openclaw/pull/116529)
- 将所有者专用工具排除在非所有者技能命令之外 [#116532](https://github.com/openclaw/openclaw/pull/116532)
- 使日志遵循屏幕捕获拒绝控制[#117803](https://github.com/openclaw/openclaw/pull/117803)
- 下载前阻止未经授权的Telegram命令媒体[#117821](https://github.com/openclaw/openclaw/pull/117821)
- 强制会话重置的规范授权 [#118580](https://github.com/openclaw/openclaw/pull/118580)
- 保持对话压缩不受托管工具的影响 [#118618](https://github.com/openclaw/openclaw/pull/118618)
- 阻止未经授权的Discord和Telegram绑定访问[#118704](https://github.com/openclaw/openclaw/pull/118704)
- 将 Control UI 操作与网关权限匹配 [#119286](https://github.com/openclaw/openclaw/pull/119286)
- 应用准确批准的系统代理操作 [#119389](https://github.com/openclaw/openclaw/pull/119389)
- 在会话 ID 标准化后应用 Slack 通道策略 [#119408](https://github.com/openclaw/openclaw/pull/119408)
- 需要委托 Microsoft Teams 通道读取的范围路由 [#119632](https://github.com/openclaw/openclaw/pull/119632)
- 将网关 hello 范围与活动 RPC 访问对齐 [#120888](https://github.com/openclaw/openclaw/pull/120888)
- 因拒绝 Teams 组访问而关闭 [#121086](https://github.com/openclaw/openclaw/pull/121086)
- 持久交付执行批准-不可用通知 [#121179](https://github.com/openclaw/openclaw/pull/121179)
- 恢复旧配对的本地执行和插件批准提示 [#121529](https://github.com/openclaw/openclaw/pull/121529)
- 将 Matrix 验证操作限制为所有者 [#121532](https://github.com/openclaw/openclaw/pull/121532)
- 将 DM 安全诊断与有效路由对齐 [#121741](https://github.com/openclaw/openclaw/pull/121741)
- 在渠道拒绝的情况下保留不相关的 Codex 工具可用 [#122282](https://github.com/openclaw/openclaw/pull/122282)
- 从执行身份审核中排除继承的数据 [#122418](https://github.com/openclaw/openclaw/pull/122418)
- 永久删除自动化之前确认 [#122505](https://github.com/openclaw/openclaw/pull/122505)
- 在其源通道中保留执行批准提示 [#122517](https://github.com/openclaw/openclaw/pull/122517)
- 将计时器过期的批准发布到审阅者表面 [#123950](https://github.com/openclaw/openclaw/pull/123950)
- 保持例行程序 Codex YOLO 命令免批准 [#124069](https://github.com/openclaw/openclaw/pull/124069)
- 查找或重新连接重播后发布批准到期 [#124087](https://github.com/openclaw/openclaw/pull/124087)
- 防止重播取消的批准 [#124381](https://github.com/openclaw/openclaw/pull/124381)
- 当映像生成被拒绝时保留 Codex 委派 [#124598](https://github.com/openclaw/openclaw/pull/124598)
- 将工具事件限制为订阅会话 [#124732](https://github.com/openclaw/openclaw/pull/124732)
- 通过会话权限遏制恢复工人调度 [#125326](https://github.com/openclaw/openclaw/pull/125326)
- 保留特权macOS提升主机CUA-免费[#125408](https://github.com/openclaw/openclaw/pull/125408)
- 在策略过滤的表面上保留节点托管代理工具 [#125434](https://github.com/openclaw/openclaw/pull/125434)
- fix（system-agent）：拒绝第二阶段提案，而不是覆盖第一个 [#125672](https://github.com/openclaw/openclaw/pull/125672)
- 在设备中显示有效的执行批准策略 [#125756](https://github.com/openclaw/openclaw/pull/125756)
- 当小部件访问决策失败时向操作员发出警报 [#125934](https://github.com/openclaw/openclaw/pull/125934)
- fix（策略）：扫描沙箱、工具和工作区证据中的键控 agents.entries [#126935](https://github.com/openclaw/openclaw/pull/126935)
- fix（claws）：删除 Claw 代理时删除执行批准 [#127365](https://github.com/openclaw/openclaw/pull/127365)
- fix（网关）：在权限更改后保持无根会话可用 [#128149](https://github.com/openclaw/openclaw/pull/128149)
- fix（网关）：对 cron 突变实施控制平面限制 [#128287](https://github.com/openclaw/openclaw/pull/128287)
- fix（tui）：将操作提示保持在其会话所有者 [#129044](https://github.com/openclaw/openclaw/pull/129044) 范围内
- fix（whatsapp）：保持 QR 登录所有者范围 [#129381](https://github.com/openclaw/openclaw/pull/129381)
- fix（网关）：停止在可信代理重新连接时制作范围升级请求 [#129563](https://github.com/openclaw/openclaw/pull/129563)
- fix（网关）：tools.invoke必须携带调用者的主机铸造的角色权限[#129725](https://github.com/openclaw/openclaw/pull/129725)
- 修复：在防护模式之外停止小部件批准提示 [#129970](https://github.com/openclaw/openclaw/pull/129970)
- fix（网关）：权限模式通过工作区默认根 [#129994](https://github.com/openclaw/openclaw/pull/129994) 在无根会话上工作
- fix（代理）：为插件批准拒绝添加拒绝指导 [#130009](https://github.com/openclaw/openclaw/pull/130009)
- 修复：仪表板工具在准入后瞄准了错误的网关[#130112](https://github.com/openclaw/openclaw/pull/130112)
- 修复：网关权限停用后仪表板更改成功 [#130131](https://github.com/openclaw/openclaw/pull/130131)
- 修复：板票在网关更换后仍然有效 [#130171](https://github.com/openclaw/openclaw/pull/130171)
- fix（codex）：修复当插件处于只读或提示模式时 Codex 应用程序消失 [#130394](https://github.com/openclaw/openclaw/pull/130394)
- fix：按收件人可见性筛选观看会话状态 [#130764](https://github.com/openclaw/openclaw/pull/130764)
- fix（网关）：从单个 Control UI 窗口 [#130967](https://github.com/openclaw/openclaw/pull/130967) 启动的 Codex 节点执行永远不会出现批准卡
- fix（配置）：在重新配置中保留不相关的网关身份验证策略 [#131035](https://github.com/openclaw/openclaw/pull/131035)
- fix（网关）：仅限管理员角色拒绝有效范围升级 [#131410](https://github.com/openclaw/openclaw/pull/131410)
- 修复：过期的通话语音确认会累积并减慢每次确认检查 [#131474](https://github.com/openclaw/openclaw/pull/131474)
- fix（exec）：自动化执行批准拒绝不再指向 TUI [#132237](https://github.com/openclaw/openclaw/pull/132237)
- fix（acp）：重放网关断开连接期间做出的批准决策 [#132261](https://github.com/openclaw/openclaw/pull/132261)
- refactor（exec）：退出旧会话 execSecurity/execAsk；医生迁移到权限模式 [#132740](https://github.com/openclaw/openclaw/pull/132740)
- 因陈旧插件审批等待而关闭 [#88203](https://github.com/openclaw/openclaw/pull/88203)
- 自动批准默认安全箱的只读标志 [#88953](https://github.com/openclaw/openclaw/pull/88953)
- 在受限 Codex 轮次中恢复允许的 shell 工具 [#92294](https://github.com/openclaw/openclaw/pull/92294)
- 在将 xAI- 计费工具暴露给非 xAI 模型之前需要征得同意 [#97629](https://github.com/openclaw/openclaw/pull/97629)
- fix（系统代理）：告诉消息传递用户无法从聊天应用委托批准（#116519）（#117432）[23a681e](https://github.com/openclaw/openclaw/commit/23a681e)
- 保留 1跨执行切换的密码授权 [30738a3](https://github.com/openclaw/openclaw/commit/30738a3)
- 显示不可用 Apple 查看批准状态，无待处理计数 [ae3008c](https://github.com/openclaw/openclaw/commit/ae3008c)
- 关联前缀出站审核对话 [#104816](https://github.com/openclaw/openclaw/pull/104816)
- 拒绝格式错误的附加授权 TTL 值 [#105103](https://github.com/openclaw/openclaw/pull/105103)
- 保留待处理的1密码工具授权 [#107275](https://github.com/openclaw/openclaw/pull/107275)
- fix（网关）：拒绝更改批准历史游标[#111251](https://github.com/openclaw/openclaw/pull/111251)
- 保留目标代理工具以及仅允许策略 [#114530](https://github.com/openclaw/openclaw/pull/114530)
- 取消 macOS 批准套接字重试 [#116125](https://github.com/openclaw/openclaw/pull/116125)
- 防止切换连接后过时的共享更新 [#116837](https://github.com/openclaw/openclaw/pull/116837)
- 让写范围操作员删除存档会话 [#117468](https://github.com/openclaw/openclaw/pull/117468)
- 当侦听器失败时，保持嵌入式 TUI 插件批准正常工作 [#117479](https://github.com/openclaw/openclaw/pull/117479)
- E强制 Feishu 消息突变的跨上下文限制 [#119845](https://github.com/openclaw/openclaw/pull/119845)
- Hide Wear 模型控件，无需管理员访问权限 [#120016](https://github.com/openclaw/openclaw/pull/120016)
- 集中交互插件调度和绑定授权 [#120062](https://github.com/openclaw/openclaw/pull/120062)
- 让写作用域运算符更改当前会话模型 [#120875](https://github.com/openclaw/openclaw/pull/120875)
- Fence exec 批准代理删除日志 [#121273](https://github.com/openclaw/openclaw/pull/121273)
- Make Gateway 工具拒绝跨别名应用 [#123847](https://github.com/openclaw/openclaw/pull/123847)
- 保持批准 JSON 失败可解析 [#124585](https://github.com/openclaw/openclaw/pull/124585)
- fix（策略）：从模式 #124797 [#125457](https://github.com/openclaw/openclaw/pull/125457) 导出执行姿势
- 报告批准如实写入[#125960](https://github.com/openclaw/openclaw/pull/125960)
- 在策略恢复指南中保留配置文件和容器 [#126710](https://github.com/openclaw/openclaw/pull/126710)
- 修复：在不相关的失败等待后保持代码模式受限 [#128098](https://github.com/openclaw/openclaw/pull/128098)
- fix（网关）：在传输切换时重新验证节点命令策略 [#128576](https://github.com/openclaw/openclaw/pull/128576)
- fix（代理）：防止无效会话过滤器列出每个会话 [#129198](https://github.com/openclaw/openclaw/pull/129198)
- fix（网关）：在identityScopes中点管理员自动批准警告[#129538](https://github.com/openclaw/openclaw/pull/129538)
- fix（Windows）：当网关作为隐藏控制台服务 [#129637](https://github.com/openclaw/openclaw/pull/129637) 运行时，ACP 工作人员永远挂在权限提示上
- fix（ui）：发送 [#129674](https://github.com/openclaw/openclaw/pull/129674) 之前序列化远程会话权限
- fix（命令解释器）：绑定步行递归深度以防止堆栈溢出 [#129891](https://github.com/openclaw/openclaw/pull/129891)
- fix（审核）：报告仅拒绝一次执行批准 [#130560](https://github.com/openclaw/openclaw/pull/130560)
- fix（ios）：恢复审批设置导航并删除重复的 shell 状态 [#130651](https://github.com/openclaw/openclaw/pull/130651)
- 修复：工作树任务继承配置的权限默认值[#131547](https://github.com/openclaw/openclaw/pull/131547)
- fix（网关）：允许写入范围的插件对话操作[#131576](https://github.com/openclaw/openclaw/pull/131576)
- fix（网关）：尊重本机停止运行所有权[#132892](https://github.com/openclaw/openclaw/pull/132892)
- 澄清为什么“始终允许”不可用 [#97740](https://github.com/openclaw/openclaw/pull/97740)

**文档**

- docs：阐明 IMAP 恢复和读取器工具策略 [#131039](https://github.com/openclaw/openclaw/pull/131039)
- 文档1密码授权及失败代码[13c7cf4](https://github.com/openclaw/openclaw/commit/13c7cf4)
- 澄清computer.act授权和操作员范围[5b20013](https://github.com/openclaw/openclaw/commit/5b20013)
- 澄清动态网关操作员范围 [#122931](https://github.com/openclaw/openclaw/pull/122931)
- 执行策略报告忽略会话覆盖时发出警告 [#94999](https://github.com/openclaw/openclaw/pull/94999)

</details>

</Accordion>

<Accordion id="people-devices-and-pairing" title="人员、设备和配对">

[Pairing](/gateway/pairing) 权限现在位于设备记录中。再次删除或配对设备会停用其旧连接和工作人员访问权限，非管理设备令牌只能管理自己的配对，macOS 和 Android 可以查看配对状态，管理员可以创建用于加入计算机的短期一次性粘贴命令。

受信任代理后面的自动浏览器注册在启用之前保持关闭状态，并保持在配置的角色和访问限制范围内。已验证的代理或 Tailscale 身份仅适用于当前连接，而不是重写持久配对。默认情况下，专用网络计算机的单独 SSH 身份检查处于打开状态，并遵循正常的 OpenSSH HostName 规则，因此想要仅手动配对的操作员必须禁用它，并保留 CIDR 自动批准未设置。

参与者、会话、代理和请求者身份现在会随着更多的归因工作而变化，而无需扩大访问范围。托管 GitHub 身份适用于本地命令行和 API 工作和创作元数据，而 Git 传输、沙箱、远程计算机和云工作人员继续使用自己的身份路径。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 在一个审批面板中统一 macOS 配对请求 [#102601](https://github.com/openclaw/openclaw/pull/102601)
- 自动批准节点与SSH身份验证配对[#104180](https://github.com/openclaw/openclaw/pull/104180)
- 使 Mac 配对批准本地且即时 [#106091](https://github.com/openclaw/openclaw/pull/106091)
- 从 Android 应用程序管理设备配对 [#111014](https://github.com/openclaw/openclaw/pull/111014)
- 自动批准可信代理浏览器设备配对 [#111189](https://github.com/openclaw/openclaw/pull/111189)
- 使用持久配置文件来实现共享网关身份 [#111311](https://github.com/openclaw/openclaw/pull/111311)
- 管理每个代理的模型提供者凭据 [#111796](https://github.com/openclaw/openclaw/pull/111796)
- 添加本地配对和环回认证失败的控制 [#115959](https://github.com/openclaw/openclaw/pull/115959)
- 保留远程网关的每源设备凭据 [#120533](https://github.com/openclaw/openclaw/pull/120533)
- Isolate 名为 macOS 应用程序配置文件 [#121136](https://github.com/openclaw/openclaw/pull/121136)
- 通过验证身份授予操作员范围 [#121531](https://github.com/openclaw/openclaw/pull/121531)
- 从Where拣选器连接新机器[#122635](https://github.com/openclaw/openclaw/pull/122635)
- 将通道参与者身份绑定到已承认的执行 [#122863](https://github.com/openclaw/openclaw/pull/122863)
- feat（channels）：入口内核中的发送者标识符认证等级 [#123782](https://github.com/openclaw/openclaw/pull/123782)
- feat（plugin-sdk）：发布标识符认证合约[#123793](https://github.com/openclaw/openclaw/pull/123793)
- 通过Cloudflare连接节点主机访问[#125193](https://github.com/openclaw/openclaw/pull/125193)
- 配置系统和每个代理 GitHub CLI 身份 [#125199](https://github.com/openclaw/openclaw/pull/125199)
- Credit 链接的会话参与者作为 Git 共同作者 [#125827](https://github.com/openclaw/openclaw/pull/125827)
- 从设置中授权系统和每个代理 GitHub 身份 [#126474](https://github.com/openclaw/openclaw/pull/126474)
- 为配对设备添加持久的、人性化的名称 [#94517](https://github.com/openclaw/openclaw/pull/94517)
- 向 Mac 应用程序添加批量配对决策 [#104011](https://github.com/openclaw/openclaw/pull/104011)
- macOS 配对中的组会话提供程序提示 [#109320](https://github.com/openclaw/openclaw/pull/109320)
- 将经过身份验证的用户身份携带到网关中 [#111179](https://github.com/openclaw/openclaw/pull/111179)
- 为共享网关添加持久用户配置文件 [#111224](https://github.com/openclaw/openclaw/pull/111224)
- 允许对可信共享网关进行显式完全管理员自动批准 [#111509](https://github.com/openclaw/openclaw/pull/111509)
- 记录生成的子代理的持久父子谱系 [#122015](https://github.com/openclaw/openclaw/pull/122015)
- 网关中经过身份验证的用户运行审核 [#122484](https://github.com/openclaw/openclaw/pull/122484)
- 在不移动凭据的情况下明确共享身份验证存储所有权 [#123298](https://github.com/openclaw/openclaw/pull/123298)
- 停用旧版 Control UI 设备身份验证迁移窗口 [#124667](https://github.com/openclaw/openclaw/pull/124667)
- 保留委托代理创建的请求者身份 [#124963](https://github.com/openclaw/openclaw/pull/124963)
- 使每个代理GitHub身份面板更易于理解和使用 [#125472](https://github.com/openclaw/openclaw/pull/125472)
- feat（control-ui）：在活动身份证[#128438](https://github.com/openclaw/openclaw/pull/128438)上显示客户端IP和时区
- feat（profile）：默认启用 Git 共同作者信用 [#131964](https://github.com/openclaw/openclaw/pull/131964)

**错误修复**

- 将节点能力审批合并到设备配对记录中 [#103120](https://github.com/openclaw/openclaw/pull/103120)
- fix（代理）：拒绝伪造插件所有者权限[#104872](https://github.com/openclaw/openclaw/pull/104872)
- 将节点配对管理限制到呼叫者的设备 [#104989](https://github.com/openclaw/openclaw/pull/104989)
- 重新配对后退出陈旧节点权限 [#109647](https://github.com/openclaw/openclaw/pull/109647)
- 以事务方式撤销已删除的代理 [#111678](https://github.com/openclaw/openclaw/pull/111678)
- 自动批准同一浏览器密钥的可信代理范围升级 [#111916](https://github.com/openclaw/openclaw/pull/111916)
- 需要所有者签发的票据才能启动 Telegram 仪表板 [#112292](https://github.com/openclaw/openclaw/pull/112292)
- 在设备身份验证升级期间保留 Control UI 访问权限 [#112558](https://github.com/openclaw/openclaw/pull/112558)
- 防止在配置写入期间静默代理名册丢失 [#114054](https://github.com/openclaw/openclaw/pull/114054)
- 明确多代理所有权 [#114388](https://github.com/openclaw/openclaw/pull/114388)
- 恢复命名配置文件的网关服务命令 [#116314](https://github.com/openclaw/openclaw/pull/116314)
- 允许使用倾斜的客户端时钟进行设备身份验证 [#116679](https://github.com/openclaw/openclaw/pull/116679)
- 区分会话所有权查找失败和策略拒绝 [#117305](https://github.com/openclaw/openclaw/pull/117305)
- 在授权机器人帐户 [#118579](https://github.com/openclaw/openclaw/pull/118579) 上保留 Discord 转录捕获
- 完成移动配对码生命周期 [#120933](https://github.com/openclaw/openclaw/pull/120933)
- 保留 Codex 输入请求的操作员所有权 [#121171](https://github.com/openclaw/openclaw/pull/121171)
- 范围 Slack 按工作区划分的企业策略 [#122346](https://github.com/openclaw/openclaw/pull/122346)
- 保留后台工作的选定代理所有权 [#123257](https://github.com/openclaw/openclaw/pull/123257)
- 跨系统表面尊重显式代理所有权 [#123339](https://github.com/openclaw/openclaw/pull/123339)
- 保持 Codex 在显式多代理网关上可用 [#124172](https://github.com/openclaw/openclaw/pull/124172)
- 跨代理生命周期路径保留上下文引擎会话所有权 [#124376](https://github.com/openclaw/openclaw/pull/124376)
- 拒绝无效代理 ID，而不是定位主 [#124670](https://github.com/openclaw/openclaw/pull/124670)
- 替换配置文件交换机上过时的服务选择器 [#124790](https://github.com/openclaw/openclaw/pull/124790)
- 跨插件支持的运行恢复每个代理配置 [#124978](https://github.com/openclaw/openclaw/pull/124978)
- 通过身份验证登录自动验证 GitHub 身份 [#126114](https://github.com/openclaw/openclaw/pull/126114)
- 保留实时网关事件的代理所有权 [#126608](https://github.com/openclaw/openclaw/pull/126608)
- 删除期间清洁剂批准和参考 [#127037](https://github.com/openclaw/openclaw/pull/127037)
- 安全采纳已接受的礁石好友请求 [6315dd8](https://github.com/openclaw/openclaw/commit/6315dd8)
- 保持前台节点配对活动直至批准 [#105038](https://github.com/openclaw/openclaw/pull/105038)
- 网关重新启动后停止重播已知节点警报 [#110391](https://github.com/openclaw/openclaw/pull/110391)
- 对系统代理进行分类，以便客户不提供选择 [#111920](https://github.com/openclaw/openclaw/pull/111920)
- 正确识别在Mac上运行的iOS应用程序[#112744](https://github.com/openclaw/openclaw/pull/112744)
- 为 OpenAI- 兼容的 HTTP 调用保留经过验证的所有者访问权限 [#113638](https://github.com/openclaw/openclaw/pull/113638)
- 强制每个网关套接字有一个经过身份验证的客户端所有者 [#114196](https://github.com/openclaw/openclaw/pull/114196)
- 在工具结果中间件中保留代理和会话身份 [#115821](https://github.com/openclaw/openclaw/pull/115821)
- 将每个代理的 cron 和模型状态分开 [#116771](https://github.com/openclaw/openclaw/pull/116771)
- 跨节点运行保留会话属性 [#116792](https://github.com/openclaw/openclaw/pull/116792)
- 在生命周期各代中保持执行审计归因准确 [#116796](https://github.com/openclaw/openclaw/pull/116796)
- 通过经过验证的代理用户隔离 OpenResponses 历史记录 [#118607](https://github.com/openclaw/openclaw/pull/118607)
- 将 Tailscale 姓名和头像纳入用户个人资料 [#119479](https://github.com/openclaw/openclaw/pull/119479)
- 保持钩子触发的心跳与其目标代理[#119817](https://github.com/openclaw/openclaw/pull/119817)
- Scope 钩子触发的心跳到目标代理 [#119819](https://github.com/openclaw/openclaw/pull/119819)
- 在代理审核事件中需要显式身份 [#120325](https://github.com/openclaw/openclaw/pull/120325)
- Harden ACPX 生成包装器租赁并重新启动清理 [#121016](https://github.com/openclaw/openclaw/pull/121016)
- 显示跨设备代币轮换结果 [#121361](https://github.com/openclaw/openclaw/pull/121361)
- 保留经过身份验证的说话者身份Codex轮流[#121511](https://github.com/openclaw/openclaw/pull/121511)
- 拒绝不存在的显式会话目标 [#122564](https://github.com/openclaw/openclaw/pull/122564)
- 凭证更改后刷新 GitHub 结果 [#122613](https://github.com/openclaw/openclaw/pull/122613)
- 在网关后台工作中保留系统代理所有权 [#122987](https://github.com/openclaw/openclaw/pull/122987)
- 使用配置的系统代理保留无目标网关事件 [#123317](https://github.com/openclaw/openclaw/pull/123317)
- 在 Codex 迁移期间保留显式所有权 [#123331](https://github.com/openclaw/openclaw/pull/123331)
- 配对权限被删除时撤销设备工作人员 [#123696](https://github.com/openclaw/openclaw/pull/123696)
- 仅审核显式代理队列所拥有的工作区 [#123878](https://github.com/openclaw/openclaw/pull/123878)
- 当令牌被撤销时完全清理节点 [#124117](https://github.com/openclaw/openclaw/pull/124117)
- 配对后保持无身份验证本地网关客户端连接 [#124545](https://github.com/openclaw/openclaw/pull/124545)
- 使代理执行使用配置的系统代理所有者 [#124697](https://github.com/openclaw/openclaw/pull/124697)
- 在普通 HTTP [#124724](https://github.com/openclaw/openclaw/pull/124724) 上恢复 Control UI 设备配对
- 在 Control UI 中显示代理创建层次结构 [#125032](https://github.com/openclaw/openclaw/pull/125032)
- 在网关重复重启时保留审核身份 [#125052](https://github.com/openclaw/openclaw/pull/125052)
- 重用权威状态并保护轮换设备凭据 [#125145](https://github.com/openclaw/openclaw/pull/125145)
- 恢复无范围操作员读取的系统代理所有权 [#125318](https://github.com/openclaw/openclaw/pull/125318)
- 保留 Matrix 授权身份区分大小写 [#125432](https://github.com/openclaw/openclaw/pull/125432)
- 使用配对设备凭据加载仪表板图标 [#126200](https://github.com/openclaw/openclaw/pull/126200)
- 保留嵌套会话工具的调用者身份 [#126221](https://github.com/openclaw/openclaw/pull/126221)
- 荣誉配置的系统代理进行无范围工作 [#126504](https://github.com/openclaw/openclaw/pull/126504)
- 拒绝跨操作员的未知代理 ID CLI 选择器 [#126983](https://github.com/openclaw/openclaw/pull/126983)
- 在离线代理删除期间清理 cron 作业 [#127075](https://github.com/openclaw/openclaw/pull/127075)
- fix（仪表板）：由所有者刷新自定义 HTML 小部件 [#128489](https://github.com/openclaw/openclaw/pull/128489)
- fix（workers）：拒绝冲突的放置身份 [#128670](https://github.com/openclaw/openclaw/pull/128670)
- fix（网关）：保持补丁创建的会话对其创建者可见 [#128774](https://github.com/openclaw/openclaw/pull/128774)
- fix（codex）：恢复 Codex 会话中的 GitHub 工具 [#128807](https://github.com/openclaw/openclaw/pull/128807)
- fix（网关）：在中断期间保持经过验证的 GitHub 用户在线 [#128833](https://github.com/openclaw/openclaw/pull/128833)
- fix：在托管 Codex 会话中恢复 GitHub 工具 [#128937](https://github.com/openclaw/openclaw/pull/128937)
- fix（webhooks）：在所属会话中保留 TaskFlow 子操作 [#129633](https://github.com/openclaw/openclaw/pull/129633)
- 向受信任代理设置添加知情环回同意 [#131132](https://github.com/openclaw/openclaw/pull/131132)
- fix（网关）：保留跨调度拒绝解析器所有权 [#132090](https://github.com/openclaw/openclaw/pull/132090)
- fix（sessions）：将创建者权限与合格的配置文件关联起来 [#132300](https://github.com/openclaw/openclaw/pull/132300)
- fix（worker）：拒绝格式错误的协议记录 [#133123](https://github.com/openclaw/openclaw/pull/133123)
- OS 版本更新后保持 macOS 应用程序配对 [#89702](https://github.com/openclaw/openclaw/pull/89702)
- 接受本地节点的共享macOS平台引脚[#105311](https://github.com/openclaw/openclaw/pull/105311)
- 拒绝未知会话代理而不配置存储 [#111178](https://github.com/openclaw/openclaw/pull/111178)
- 保持混合角色可信代理配对待定 [#111394](https://github.com/openclaw/openclaw/pull/111394)
- 将系统代理聊天与其经过身份验证的呼叫者绑定 [#111565](https://github.com/openclaw/openclaw/pull/111565)
- 恢复显式授权的代理删除 [#114099](https://github.com/openclaw/openclaw/pull/114099)
- 在设备列表中显示可复制的设备ID [#114370](https://github.com/openclaw/openclaw/pull/114370)
- 显示用户配置文件 CLI 操作的结果 [#117466](https://github.com/openclaw/openclaw/pull/117466)
- 在重新审批期间保留重命名的节点标签 [#117608](https://github.com/openclaw/openclaw/pull/117608)
- 防止设备配对链接上出现随机 404 [#123182](https://github.com/openclaw/openclaw/pull/123182)
- 拒绝代理权限的未绑定旧会话密钥 [#123222](https://github.com/openclaw/openclaw/pull/123222)
- 在早期网关故障期间保留挂钩所有权 [#123323](https://github.com/openclaw/openclaw/pull/123323)
- 解释 Reef 配对版本不匹配 [#123498](https://github.com/openclaw/openclaw/pull/123498)
- 删除代理时删除陈旧的数据库注册表行 [#124347](https://github.com/openclaw/openclaw/pull/124347)
- fix（代理）：保留直接消息轮次的发件人身份 [#124548](https://github.com/openclaw/openclaw/pull/124548)
- 重命名后刷新设备标签 [#126432](https://github.com/openclaw/openclaw/pull/126432)
- 修复：使用情况仪表板在旧全局会话上失败 [#129011](https://github.com/openclaw/openclaw/pull/129011)
- fix（tui）：防止过时的选择器选择更改错误的代理 [#129032](https://github.com/openclaw/openclaw/pull/129032)
- fix（节点）：批准静默初始节点表面并将待批准表面命名为[#129795](https://github.com/openclaw/openclaw/pull/129795)
- fix（config）：拒绝 id 规范化后发生冲突的 agents.entries 密钥 [#131083](https://github.com/openclaw/openclaw/pull/131083)
- fix（安全）：识别环回可信代理身份验证[#131196](https://github.com/openclaw/openclaw/pull/131196)
- 修复：显示GitHub在线人的公共名称[#131579](https://github.com/openclaw/openclaw/pull/131579)
- fix（网关）：在入队之前拒绝过时的节点工作 [#132909](https://github.com/openclaw/openclaw/pull/132909)

**文档**

- 删除过时的节点配对令牌引用 [#103140](https://github.com/openclaw/openclaw/pull/103140)
- 更正配对设置代码到期合约[#103943](https://github.com/openclaw/openclaw/pull/103943)
- 正确的无头节点身份和配对指导 [#103964](https://github.com/openclaw/openclaw/pull/103964)
- 自动批准的设备上的文档代理范围上限 [#111228](https://github.com/openclaw/openclaw/pull/111228)
- 澄清环回 Control UI 身份验证和恢复 [#112746](https://github.com/openclaw/openclaw/pull/112746)
- 从策略 [#114014](https://github.com/openclaw/openclaw/pull/114014) 中删除已停用的 Control UI 身份验证引用
- 解释 Control UI 在私人浏览器配置文件中的配对 [#114111](https://github.com/openclaw/openclaw/pull/114111)
- 更正记录的节点配对存储模型[#124571](https://github.com/openclaw/openclaw/pull/124571)
- 推荐 Cloudflare 节点的访问服务令牌 [#126536](https://github.com/openclaw/openclaw/pull/126536)

</details>

</Accordion>

<Accordion id="secrets-and-private-data" title="秘密和私人数据">

新的团队范围本地 [Secret Store](/gateway/secrets) 将受保护值与代理可读环境值分开。支持的屏蔽请求、Vault 或 [1Password](/gateway/1password) 引用以及目标绑定替换可以使受保护的凭证远离纯文本配置和模型可见文本，同时将其放入已批准的网关托管的 HTTPS 请求中。 Web 上的屏蔽凭据请求 iOS 和 Android 现在保留准确输入的值和操作员编辑的目标，保存值后刷新受影响的提供程序，并关闭请求及其与拥有它们的运行的受保护连接。代理可读值是对网关托管命令的单独授权，并且仍然可以由接收它们的命令打印或传输。

现在，将 Control UI 网关 URL 更改为不同的凭证范围会在连接之前清除先前端点的密码和引导凭证，而为目标明确提供的凭证仍然优先。仅查询范围更改可以保留原始范围的令牌，但需要再次输入密码。

秘密存储值在静态时不加密，并且取决于 OpenClaw 状态目录的文件系统权限。目标绑定替换仅适用于网关托管的 HTTPS 命令，其子进程遵循其代理设置。原始套接字、容器、远程节点、提供者本地harness、普通 HTTP 和 WebSockets 位于该路径之外。

现在，常见的凭据和签名参数模式已在涵盖的日志、诊断、代理错误和 Control UI 故障中进行了编辑，而聊天历史记录则删除了涵盖路径上的内联媒体字节、本地路径、专用 shell 行、复制的提示上下文和失败传递有效负载。额外的功能统计、Android 安装的应用程序详细信息和 iOS 运行状况摘要需要明确的选择，运行状况位于两个默认禁用的门后面。除非禁用，否则更新检查将保持开启状态，而默认情况下会为可路由地址启用大致活动位置，并且可能会在首次使用时下载其本地城市数据库。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加托管 1Password SecretRef 设置和分辨率 [#102293](https://github.com/openclaw/openclaw/pull/102293)
- 添加选择加入、受隐私限制的 HealthKit 摘要 [#105616](https://github.com/openclaw/openclaw/pull/105616)
- 添加批准门控1Password机密经纪人[#106133](https://github.com/openclaw/openclaw/pull/106133)
- 在设置中显示本机macOS通知控件[#110646](https://github.com/openclaw/openclaw/pull/110646)
- 添加本地SQLite秘密存储[#121559](https://github.com/openclaw/openclaw/pull/121559)
- 管理 Control UI [#121724](https://github.com/openclaw/openclaw/pull/121724) 的团队机密
- 将存储的团队环境值公开给代理命令 [#121773](https://github.com/openclaw/openclaw/pull/121773)
- 为代理命令添加目标绑定的秘密出口 [#123216](https://github.com/openclaw/openclaw/pull/123216)
- 添加显式受保护且代理可读的秘密存储访问 [#126088](https://github.com/openclaw/openclaw/pull/126088)
- feat（遥测）：选择每日更新 ping 时的匿名使用统计数据 [#128476](https://github.com/openclaw/openclaw/pull/128476)
- feat（地理位置）：通过捆绑插件 [#128546](https://github.com/openclaw/openclaw/pull/128546) 将客户端地址解析为粗略城市
- feat（secrets）：模型从未看到的代理请求的凭据 [#129670](https://github.com/openclaw/openclaw/pull/129670)
- feat（secrets）：秘密出口代理 [#129880](https://github.com/openclaw/openclaw/pull/129880) 的选择加入流量白名单
- 添加捆绑的HashiCorp Vault SecretRef支持[#89255](https://github.com/openclaw/openclaw/pull/89255)
- 将 iOS 通知控件添加到隐私 [#102733](https://github.com/openclaw/openclaw/pull/102733)
- 在第一个符合条件的聊天发送中请求通知权限 [#122446](https://github.com/openclaw/openclaw/pull/122446)
- 添加专用网关凭证，用于Control UI GitHub访问[#125158](https://github.com/openclaw/openclaw/pull/125158)

**错误修复**

- 当可选机密丢失时保持网关启动活动 [#101265](https://github.com/openclaw/openclaw/pull/101265)
- 防止哨兵中的凭证保留和调试捕获 [#102420](https://github.com/openclaw/openclaw/pull/102420)
- 保护提供商身份验证交换返回的凭据 [#104547](https://github.com/openclaw/openclaw/pull/104547)
- 当通道机密不可用时让网关安全模式启动 [#106826](https://github.com/openclaw/openclaw/pull/106826)
- 防止通道 URL 凭证出现在状态输出中 [#107754](https://github.com/openclaw/openclaw/pull/107754)
- Redact 结构化身份验证标头 [#107999](https://github.com/openclaw/openclaw/pull/107999)
- 将损坏的 SSH 沙盒机密隔离到受影响的代理 [#110081](https://github.com/openclaw/openclaw/pull/110081)
- 在重新加载失败期间保持健康的秘密所有者存活 [#110779](https://github.com/openclaw/openclaw/pull/110779)
- 需要明确同意 macOS 隐私敏感访问 [#112321](https://github.com/openclaw/openclaw/pull/112321)
- 防止推理标签泄漏或隐藏回复 [#113205](https://github.com/openclaw/openclaw/pull/113205)
- Stop macOS 重新连接时钥匙串提示风暴 [#114956](https://github.com/openclaw/openclaw/pull/114956)
- fix（回复）：防止私人提示上下文泄漏到已发送的回复中 [#115745](https://github.com/openclaw/openclaw/pull/115745)
- Redact 来自错误的 Anthropic 流有效负载 [#116938](https://github.com/openclaw/openclaw/pull/116938)
- 一致地编辑签名和 x 前缀的身份验证参数 [#116957](https://github.com/openclaw/openclaw/pull/116957)
- 在 iMessage 交付过程中清理私有上下文 [#117501](https://github.com/openclaw/openclaw/pull/117501)
- 将Control UI编辑与核心安全规则[#117817](https://github.com/openclaw/openclaw/pull/117817)对齐
- 使用其所属行保留配置机密 [#118149](https://github.com/openclaw/openclaw/pull/118149)
- 将引用的提供者机密保留在明文中 [#118702](https://github.com/openclaw/openclaw/pull/118702)
- 内部升级后保持准确的NO_REPLY沉默 [#119463](https://github.com/openclaw/openclaw/pull/119463)
- Redact Discord 来自 API 错误的机器人凭据 [#119536](https://github.com/openclaw/openclaw/pull/119536)
- 从远程内存错误中编辑持有者凭证 [#119666](https://github.com/openclaw/openclaw/pull/119666)
- 简化 iOS 权限请求并保持操作可读 [#120338](https://github.com/openclaw/openclaw/pull/120338)
- 将凭据保留在助理成绩单中 [#120728](https://github.com/openclaw/openclaw/pull/120728)
- 将私有 shell 输出保留在模型上下文和压缩之外 [#121147](https://github.com/openclaw/openclaw/pull/121147)
- 在内存中一致地保护机密和 ACP 错误 [#121335](https://github.com/openclaw/openclaw/pull/121335)
- 统一聊天历史记录中的媒体隐私 [#121490](https://github.com/openclaw/openclaw/pull/121490)
- 集中并绑定提供商诊断编辑 [#121599](https://github.com/openclaw/openclaw/pull/121599)
- 将运行时详细信息与普通聊天通知分开 [#121600](https://github.com/openclaw/openclaw/pull/121600)
- Move iOS 将中继凭证共享到钥匙串存储 [#121900](https://github.com/openclaw/openclaw/pull/121900)
- 绑定敏感失败传递保留并添加安全恢复工具[#123410](https://github.com/openclaw/openclaw/pull/123410)
- 防止敏感字段中的可编辑秘密编辑占位符 [#123493](https://github.com/openclaw/openclaw/pull/123493)
- 防止秘密出口崩溃和无法使用的沙箱哨兵 [#123527](https://github.com/openclaw/openclaw/pull/123527)
- 保留失败的交付记录，无负载 [#123642](https://github.com/openclaw/openclaw/pull/123642)
- Redact CLI 错误并隐藏内部类名 [#123929](https://github.com/openclaw/openclaw/pull/123929)
- 从 Control UI 失败消息中编辑机密 [#124552](https://github.com/openclaw/openclaw/pull/124552)
- 停止在载入输出中公开可重用网关令牌 [#124687](https://github.com/openclaw/openclaw/pull/124687)
- Redact 提供者凭据反映在错误消息中 [#125499](https://github.com/openclaw/openclaw/pull/125499)
- 保护 CLI [#125753](https://github.com/openclaw/openclaw/pull/125753) 中的机密和配置编辑
- 编辑通道日志并验证过滤器 [#125939](https://github.com/openclaw/openclaw/pull/125939)
- 使网关配置修订不透明 [#126464](https://github.com/openclaw/openclaw/pull/126464)
- 在参考模式下将生成的网关令牌保留在配置之外 [#126877](https://github.com/openclaw/openclaw/pull/126877)
- 跨网关入口点保留隐身会话隐私 [#126897](https://github.com/openclaw/openclaw/pull/126897)
- 在参考模式下将网关凭证保留为明文 [#126928](https://github.com/openclaw/openclaw/pull/126928)
- 编辑来自非交互式入门引导运行状况故障的机密 [#127071](https://github.com/openclaw/openclaw/pull/127071)
- fix（cli）：停止批准 --json 打印 exec-approvals 套接字令牌 [#127610](https://github.com/openclaw/openclaw/pull/127610)
- fix（秘密）：配置参考[#127669](https://github.com/openclaw/openclaw/pull/127669)失败关闭
- fix：在工具结果中保留源代码[#127697](https://github.com/openclaw/openclaw/pull/127697)
- fix（网关）：跨生命周期隔离门户 cookie [#129503](https://github.com/openclaw/openclaw/pull/129503)
- fix（沙箱）：停止在进程列表中公开环境值[#129781](https://github.com/openclaw/openclaw/pull/129781)
- fix：防止流式传输的 ACP 回复中的私人提示泄漏 [#130125](https://github.com/openclaw/openclaw/pull/130125)
- fix（codex）：修复私有轮次、自定义命令和共享客户端之间的身份验证所有权 [#131187](https://github.com/openclaw/openclaw/pull/131187)
- fix（control-ui）：编辑网关 URL [#131788](https://github.com/openclaw/openclaw/pull/131788) 时重新调整凭据范围
- fix：秘密请求保留本机答案和实时请求者权限 [#132122](https://github.com/openclaw/openclaw/pull/132122)
- fix（anthropic）：将私人 CLI 上下文保留在聊天记录之外 [#132466](https://github.com/openclaw/openclaw/pull/132466)
- 在 Android 共享已安装的应用程序详细信息之前需要征得同意 [#97888](https://github.com/openclaw/openclaw/pull/97888)
- 使 Apple 健康摘要在 iOS 设置中清晰可辨 [1c16005](https://github.com/openclaw/openclaw/commit/1c16005)
- fix（代理）：编辑从提供商错误详细信息和原因短语反映的凭据（#120200）[213804d](https://github.com/openclaw/openclaw/commit/213804d)
- 添加所需的 iOS 健康更新目的声明 [cac32bb](https://github.com/openclaw/openclaw/commit/cac32bb)
- Redact 诊断导出中的架构敏感字段 [#102426](https://github.com/openclaw/openclaw/pull/102426)
- 关闭剩余 OpenAI OAuth 刷新比赛 [#102438](https://github.com/openclaw/openclaw/pull/102438)
- 超时后恢复Android权限提示[#103011](https://github.com/openclaw/openclaw/pull/103011)
- 巩固 iOS 位置隐私控制 [#103096](https://github.com/openclaw/openclaw/pull/103096)
- 忽略继承的QQBot账户凭据 [#103371](https://github.com/openclaw/openclaw/pull/103371)
- 编辑 Chutes OAuth 故障中的敏感详细信息 [#103569](https://github.com/openclaw/openclaw/pull/103569)
- 防止抄本编辑破坏签名推理 [#103628](https://github.com/openclaw/openclaw/pull/103628)
- Redact Telegram 跨大文本边界的标记 [#103861](https://github.com/openclaw/openclaw/pull/103861)
- 返回JSON配置错误并覆盖分割dotenv根[#104340](https://github.com/openclaw/openclaw/pull/104340)
- 恢复已安装的提供程序插件的 SecretRef 目标 [#104347](https://github.com/openclaw/openclaw/pull/104347)
- 安全解决Ollama网络搜索SecretRefs [#104829](https://github.com/openclaw/openclaw/pull/104829)
- 在恢复的转录本中保留分页光标 [#105039](https://github.com/openclaw/openclaw/pull/105039)
- 将执行机密提供程序诊断限制为安全代码 [#105082](https://github.com/openclaw/openclaw/pull/105082)
- 从 ClickClack REST 错误中编辑机密 [#106635](https://github.com/openclaw/openclaw/pull/106635)
- 阻止不活动的 Web 机密从阻止代理转向 [#108485](https://github.com/openclaw/openclaw/pull/108485)
- 跳过不可读的系统提示文件，而不是注入其路径 [#108546](https://github.com/openclaw/openclaw/pull/108546)
- 将内部控制元数据排除在聊天记录之外 [#109056](https://github.com/openclaw/openclaw/pull/109056)
- 防止 1打开桌面提示时密码代理呼叫 [#109157](https://github.com/openclaw/openclaw/pull/109157)
- 启动时隔离不可用的 webhook 路由机密 [#109715](https://github.com/openclaw/openclaw/pull/109715)
- 按账户隔离失败的通道凭证 [#109766](https://github.com/openclaw/openclaw/pull/109766)
- 在日志和医生中显示经过编辑的SecretRef降级[#109792](https://github.com/openclaw/openclaw/pull/109792)
- 当一个帐户秘密不可用时保持健康的通道操作 [#110329](https://github.com/openclaw/openclaw/pull/110329)
- 隔离凭证文件不可用的通道帐户 [#110360](https://github.com/openclaw/openclaw/pull/110360)
- 折叠重复Vault断电诊断[#110908](https://github.com/openclaw/openclaw/pull/110908)
- Encrypt Android 设备身份存储 [#110939](https://github.com/openclaw/openclaw/pull/110939)
- 在空白主要设置后面保留传统的 ClawHub 遥测选择退出 [#111078](https://github.com/openclaw/openclaw/pull/111078)
- fix（代理）：保留生成的会话标题 [#111829](https://github.com/openclaw/openclaw/pull/111829) 的推理
- 防止开发网关使用环境通道凭据 [#112011](https://github.com/openclaw/openclaw/pull/112011)
- 当可选 Web 凭据不可用时允许通用代理轮流 [#112522](https://github.com/openclaw/openclaw/pull/112522)
- 通过网关通道关闭保留SecretRefs [#112717](https://github.com/openclaw/openclaw/pull/112717)
- Redact AWS 来自日志和诊断的秘密访问密钥 [#112947](https://github.com/openclaw/openclaw/pull/112947)
- 编辑常见配置分配中的秘密 [#112952](https://github.com/openclaw/openclaw/pull/112952)
- 编辑更多 GitLab 凭证格式 [#112954](https://github.com/openclaw/openclaw/pull/112954)
- fix（vault）：防止不安全的秘密计划写入[#113707](https://github.com/openclaw/openclaw/pull/113707)
- 保持配置的本地网关凭据权威 [#114462](https://github.com/openclaw/openclaw/pull/114462)
- Localize macOS 隐私权限提示 [#115013](https://github.com/openclaw/openclaw/pull/115013)
- 允许第一个 iOS Motion & Fitness 权限提示 [#115523](https://github.com/openclaw/openclaw/pull/115523)
- 将内部运行时上下文排除在通道回复之外 [#115561](https://github.com/openclaw/openclaw/pull/115561)
- 从独立调试代理捕获 [#116133](https://github.com/openclaw/openclaw/pull/116133) 编辑凭据
- 完成 iOS 日历和提醒立即授予 [#116504](https://github.com/openclaw/openclaw/pull/116504)
- Hide 删除身份验证后缓存的可选插件工具 [#116625](https://github.com/openclaw/openclaw/pull/116625)
- 编辑 Discord REST 的凭据失败 [#116805](https://github.com/openclaw/openclaw/pull/116805)
- fix（秘密）：配置接受之前的预检执行提供程序命令路径 [#117128](https://github.com/openclaw/openclaw/pull/117128)
- 将插件配置排除在加载器诊断之外 [#117237](https://github.com/openclaw/openclaw/pull/117237)
- 巩固 Doctor 遗留迁移所有权并清理诊断 [#117796](https://github.com/openclaw/openclaw/pull/117796)
- 正确验证远程网关设置和运行状况探测 [#118134](https://github.com/openclaw/openclaw/pull/118134)
- 在模型提示中将大型所有者列入白名单 [#118206](https://github.com/openclaw/openclaw/pull/118206)
- 编辑无效的 OTEL 端点并抑制禁用的导出器 [#118635](https://github.com/openclaw/openclaw/pull/118635)
- Redact Reef 中继错误凭证 [#119603](https://github.com/openclaw/openclaw/pull/119603)
- Redact 反映了 Google Chat 凭据 [#119965](https://github.com/openclaw/openclaw/pull/119965)
- 根据状态和日志诊断编辑网关凭据 [#120024](https://github.com/openclaw/openclaw/pull/120024)
- 在远程网关探测期间隔离存储的设备凭据 [#120707](https://github.com/openclaw/openclaw/pull/120707)
- Fence OpenAI 响应重放元数据 [#120777](https://github.com/openclaw/openclaw/pull/120777)
- 从聊天记录中删除私人音频数据 [#121109](https://github.com/openclaw/openclaw/pull/121109)
- 在 WebViews 中保留轮换设备令牌 [#121315](https://github.com/openclaw/openclaw/pull/121315)
- Redact Windows 主路径，无论大小写 [#121455](https://github.com/openclaw/openclaw/pull/121455)
- 拒绝空秘密并对超大输入进行一致分类 [#121947](https://github.com/openclaw/openclaw/pull/121947)
- 准确报告复制的代理身份验证配置文件 [#122162](https://github.com/openclaw/openclaw/pull/122162)
- 使后台macOS主机脱离GUI钥匙串状态[#123500](https://github.com/openclaw/openclaw/pull/123500)
- fix（clawhub）：从 AppData [#124658](https://github.com/openclaw/openclaw/pull/124658) 读取 Windows 身份验证配置
- fix（审计）：继承审计工作数据库选项中的主管标记[#124776](https://github.com/openclaw/openclaw/pull/124776)
- Honor 阻止了 SearXNG SecretRefs 并绑定了扩展助手 [#126214](https://github.com/openclaw/openclaw/pull/126214)
- fix（feishu）：防止不允许的 env 凭据对请求进行身份验证 [#127682](https://github.com/openclaw/openclaw/pull/127682)
- fix（秘密）：保留创作的环境简写来源[#127685](https://github.com/openclaw/openclaw/pull/127685)
- fix（秘密）：保留规范配置路径身份[#128318](https://github.com/openclaw/openclaw/pull/128318)
- fix（lmstudio）：编辑反映的模型加载凭据 [#128561](https://github.com/openclaw/openclaw/pull/128561)
- fix（tui）：切换代理之前清除私有会话状态 [#129059](https://github.com/openclaw/openclaw/pull/129059)
- fix（ollama）：识别映射的 IPv6 环回端点 [#129522](https://github.com/openclaw/openclaw/pull/129522)
- fix（压缩）：从摘要中排除私人推理 [#129567](https://github.com/openclaw/openclaw/pull/129567)
- fix（插件）：由提供者 [#129624](https://github.com/openclaw/openclaw/pull/129624) 范围运行时目录发现
- fix（crabbox）：将云工作人员凭据保留在进程参数之外 [#129665](https://github.com/openclaw/openclaw/pull/129665)
- fix（tui）：防止陈旧会话泄露私人目标和历史记录 [#129810](https://github.com/openclaw/openclaw/pull/129810)
- fix（android）：取消录制后删除私人相机剪辑[#129948](https://github.com/openclaw/openclaw/pull/129948)
- fix（doctor）：使用凭据 [#130763](https://github.com/openclaw/openclaw/pull/130763) 规范化独立身份验证状态轮换 ID
- fix（secrets）：在写入 [#131055](https://github.com/openclaw/openclaw/pull/131055) 之前验证导入值
- fix（tavily）：解析来自任何秘密提供者 [#131082](https://github.com/openclaw/openclaw/pull/131082) 的 tavily_search 和 tavily_extract 密钥
- fix（auth）：通过激活和回滚保持显式根操作隔离 [#131519](https://github.com/openclaw/openclaw/pull/131519)
- fix（doctor）：在选定的安装中保留授权修复[#131589](https://github.com/openclaw/openclaw/pull/131589)
- fix（通道）：接受环境 SecretRefs 与共享默认别名​​ [#132578](https://github.com/openclaw/openclaw/pull/132578)
- Strip 在通道传送之前回显入站元数据 [#50520](https://github.com/openclaw/openclaw/pull/50520)
- 在模型配置合并期间标准化提供程序密钥 [#95722](https://github.com/openclaw/openclaw/pull/95722)
- fix（sms）：编辑反映的 Twilio 凭证 （#119963） [1bfcb71](https://github.com/openclaw/openclaw/commit/1bfcb71)
- Reject 继承的 exec 秘密响应 ID [#101739](https://github.com/openclaw/openclaw/pull/101739)
- Harden Workboard 声明令牌比较 [#104259](https://github.com/openclaw/openclaw/pull/104259)
- 停止记录原始 Feishu 回调令牌 [#104498](https://github.com/openclaw/openclaw/pull/104498)
- 保留部分网关 SecretRef 分配 [#105160](https://github.com/openclaw/openclaw/pull/105160)
- 从迁移终端输出中编辑凭证形状的文本 [#106806](https://github.com/openclaw/openclaw/pull/106806)
- Harden Zalo 托管媒体代币比较 [#108512](https://github.com/openclaw/openclaw/pull/108512)
- 拒绝超大 1Password 服务帐户令牌文件 [#108596](https://github.com/openclaw/openclaw/pull/108596)
- 在身份验证之前拒绝过大的 Vault 凭证文件 [#108761](https://github.com/openclaw/openclaw/pull/108761)
- 保留超大 1密码令牌诊断 [#108964](https://github.com/openclaw/openclaw/pull/108964)
- 忽略空白 Web 推送 VAPID 覆盖 [#109609](https://github.com/openclaw/openclaw/pull/109609)
- 清楚解释畸形秘密计划 JSON [#109721](https://github.com/openclaw/openclaw/pull/109721)
- 从回复中删除当前 exec 和 bash 失败跟踪 [#111877](https://github.com/openclaw/openclaw/pull/111877)
- 保持原始命令输出脱离进度旁白提示 [#112553](https://github.com/openclaw/openclaw/pull/112553)
- 恢复1Bun [#114346](https://github.com/openclaw/openclaw/pull/114346)下的密码秘密引用
- 需要网关探测的显式凭据 URL 覆盖 [#118614](https://github.com/openclaw/openclaw/pull/118614)
- Retire 无效的 SecretRef 构建器标志 [#118926](https://github.com/openclaw/openclaw/pull/118926)
- fix（nextcloud-talk）：编辑发送和机器人预检中的上游错误正文文本 [#119976](https://github.com/openclaw/openclaw/pull/119976)
- 保持公开 GitHub 预览在可选身份验证过时时工作 [#121454](https://github.com/openclaw/openclaw/pull/121454)
- 按源解析秘密默认别名 [#121630](https://github.com/openclaw/openclaw/pull/121630)
- 将内部模型反射排除在回复之外 [#123196](https://github.com/openclaw/openclaw/pull/123196)
- fix（doctor）：显示身份验证配置文件档案中断的恢复失败原因 [#123459](https://github.com/openclaw/openclaw/pull/123459)
- Redact 来自 CLI 错误和审核的提供程序环境值 [#124714](https://github.com/openclaw/openclaw/pull/124714)
- fix（ui）：在网关保存 [#127740](https://github.com/openclaw/openclaw/pull/127740) 之前停止空受保护的机密
- fix（矩阵）：当--include-recovery-key是文本模式死胡同[#128051](https://github.com/openclaw/openclaw/pull/128051)时提示--json
- fix（日志记录）：保留UUID令牌片段[#128258](https://github.com/openclaw/openclaw/pull/128258)
- fix（ui）： 网关客户端更换后拒绝秘密删除 [#129488](https://github.com/openclaw/openclaw/pull/129488)
- fix：保持商店支持的凭据和工具可发现 [#132696](https://github.com/openclaw/openclaw/pull/132696)
- Bound直接 OpenAI 实时启动认证错误 [#87273](https://github.com/openclaw/openclaw/pull/87273)

**文档**

- 记录组范围主会话信任边界 [#125006](https://github.com/openclaw/openclaw/pull/125006)
- docs：限定为什么 OpenClaw 安全和比较声明 [#130947](https://github.com/openclaw/openclaw/pull/130947)
- 添加专用1Password网关指南[#106109](https://github.com/openclaw/openclaw/pull/106109)
- 澄清SecretRef冷陈降解行为[#111021](https://github.com/openclaw/openclaw/pull/111021)
- 停止策略医生发布已停用的编辑修复程序的广告 [#113961](https://github.com/openclaw/openclaw/pull/113961)
- 删除已停用的日志记录编辑指南 [#113963](https://github.com/openclaw/openclaw/pull/113963)
- 取消无法访问的编辑策略检查 [#113993](https://github.com/openclaw/openclaw/pull/113993)
- 澄清秘密存储环境注入边界 [#122405](https://github.com/openclaw/openclaw/pull/122405)
- docs（遥测）：引导默认情况下的情况并感谢选择加入的用户 [#128491](https://github.com/openclaw/openclaw/pull/128491)
- docs（secrets）：使凭证请求工具可发现并警告空主机 [#130299](https://github.com/openclaw/openclaw/pull/130299)

</details>

</Accordion>

<Accordion id="sandbox-and-file-access" title="沙箱和文件访问">

现在，贡献者控制的代码是在指定的不受信任代码 [sandbox](/gateway/sandboxing) 内准备的，并且托管工作树会抑制存储库 Git 挂钩，除非管理员故意运行单独的安装脚本。依赖隐式挂钩的存储库需要将该设置移至显式路径中。

沙箱身份现在包括拥有运行的工作区。需要沙箱的新创建的访客会话会为每个经过身份验证的访客接收单独的身份，并且只能以只读方式共享工作区，而另一台计算机上的工作会话可以选择进入每个会话容器。直接执行仍然是默认设置，并且不会为它们创建的子会话建立相同的每个来宾边界。

[ 文件检查](/gateway/security/secure-file-operations) 捕获更多通过指定根、拒绝目录、超大读取和 POSIX 符号链接父级进行逃逸的尝试。符号链接包含在文件系统操作之前进行检查，而不是在批准的根目录下自动检查，从而为检查和使用之间的路径更改留下剩余的窗口。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- feat（nodes）：为节点托管的工作会话选择加入容器隔离 [#128447](https://github.com/openclaw/openclaw/pull/128447)
- feat（网关）：针对操作员角色的身份条件强制沙箱 [#129926](https://github.com/openclaw/openclaw/pull/129926)
- 澄清超大配置突变文件错误 [#110593](https://github.com/openclaw/openclaw/pull/110593)

**错误修复**

- 需要批准 ACP 在工作区之外进行搜索 [#102416](https://github.com/openclaw/openclaw/pull/102416)
- 强制网关环回工具的沙箱工具策略 [#103074](https://github.com/openclaw/openclaw/pull/103074)
- Bind CLI MCP 工具访问网关选择的沙箱上下文 [#103822](https://github.com/openclaw/openclaw/pull/103822)
- 将工作板调度保留在调用者工作区权限内 [#107087](https://github.com/openclaw/openclaw/pull/107087)
- 拒绝列出受保护的目录根 [#109233](https://github.com/openclaw/openclaw/pull/109233)
- 采用强化的fs安全0.5文件系统原语[#113705](https://github.com/openclaw/openclaw/pull/113705)
- 在拆卸期间保留共享的 Kubernetes 命名空间 [#114953](https://github.com/openclaw/openclaw/pull/114953)
- 按工作区隔离沙箱运行时 [#115766](https://github.com/openclaw/openclaw/pull/115766)
- 保留复制安装以防止修改主机网关服务 [#115922](https://github.com/openclaw/openclaw/pull/115922)
- fix（沙箱）：隔离每个来宾所需的角色沙箱，而不是每个代理 [#130229](https://github.com/openclaw/openclaw/pull/130229)
- fix（sessions）：图章创建者跨创建路径隔离 [#131156](https://github.com/openclaw/openclaw/pull/131156)
- fix（openshell）：防止工作空间争用并解锁远程命令 [#131315](https://github.com/openclaw/openclaw/pull/131315)
- fix（openshell）：通过工作区别名防止镜像数据丢失 [#131917](https://github.com/openclaw/openclaw/pull/131917)
- Bound 工作区忽略解析以防止扫描耗尽 [#101429](https://github.com/openclaw/openclaw/pull/101429)
- 绑定网关BOOT.md读取[#101776](https://github.com/openclaw/openclaw/pull/101776)
- 将包含文件权限修复限制到受信任的根 [#103267](https://github.com/openclaw/openclaw/pull/103267)
- Bind可信会话重写到已验证的快照[#103848](https://github.com/openclaw/openclaw/pull/103848)
- 以原子方式保护 macOS exec-approvals 状态目录 [#104028](https://github.com/openclaw/openclaw/pull/104028)
- 限制会话导出到所有者和工作区文件 [#104708](https://github.com/openclaw/openclaw/pull/104708)
- 加强节点文件系统授权 [#106004](https://github.com/openclaw/openclaw/pull/106004)
- 安全编码代理工作树准备并保留目标分支 [#106121](https://github.com/openclaw/openclaw/pull/106121)
- 防止 Docker 安装程序被以下符号链接 [#107847](https://github.com/openclaw/openclaw/pull/107847)
- Bound 外部插件目录读取到 16 MiB [#108200](https://github.com/openclaw/openclaw/pull/108200)
- 在本地化 shell 下拒绝远程硬链接 [#108879](https://github.com/openclaw/openclaw/pull/108879)
- Bound 凭证文件读取剩余集成 [#109260](https://github.com/openclaw/openclaw/pull/109260)
- Bound 配置输入和轨迹指针读取 [#110516](https://github.com/openclaw/openclaw/pull/110516)
- Bound 配置在诊断导出期间读取 [#110591](https://github.com/openclaw/openclaw/pull/110591)
- Bound插件捆绑命令文件读取[#110594](https://github.com/openclaw/openclaw/pull/110594)
- 拒绝损坏的会话状态通知上下文密钥 [#111152](https://github.com/openclaw/openclaw/pull/111152)
- 从受信任的主目录解析 shell 快照 [#113103](https://github.com/openclaw/openclaw/pull/113103)
- Reject POSIX 符号链接-父工作区转义 [#113405](https://github.com/openclaw/openclaw/pull/113405)
- 保留 Zalo QR 临时文件的私密性，同时巩固安全文件访问 [#113596](https://github.com/openclaw/openclaw/pull/113596)
- 将命名的 CLI 配置文件与继承的服务状态隔离 [#114446](https://github.com/openclaw/openclaw/pull/114446)
- 拒绝不安全的SSH沙箱设置[#115036](https://github.com/openclaw/openclaw/pull/115036)
- 停止沙箱设置因耗尽模型回退而失败 [#115481](https://github.com/openclaw/openclaw/pull/115481)
- 保持长沙箱容器前缀范围唯一 [#115571](https://github.com/openclaw/openclaw/pull/115571)
- 恢复安全 iMessage 工作区附件 [#117779](https://github.com/openclaw/openclaw/pull/117779)
- 使不受信任的文件名在 Windows 和 SharePoint 之间可移植 [#119363](https://github.com/openclaw/openclaw/pull/119363)
- Keep QQ 托管存储内的机器人语音暂存 [#120188](https://github.com/openclaw/openclaw/pull/120188)
- 保护本地代理状态免受并发网关写入的影响 [#120896](https://github.com/openclaw/openclaw/pull/120896)
- 发送失败后清理Discord语音文件[#120904](https://github.com/openclaw/openclaw/pull/120904)
- Guard嵌入式CLI状态写入器[#121282](https://github.com/openclaw/openclaw/pull/121282)
- 将命名配置文件工作空间保留在配置文件状态根内 [#122733](https://github.com/openclaw/openclaw/pull/122733)
- 预防 Windows Doctor 审核迁移 fsync 失败 [#123376](https://github.com/openclaw/openclaw/pull/123376)
- 在删除过程中删除重新创建的代理状态文件 [#124461](https://github.com/openclaw/openclaw/pull/124461)
- 在 cwd 范围批准之前规范化 ACP 文件 URL [#124530](https://github.com/openclaw/openclaw/pull/124530)
- 标准化安全文件系统路径包含 [#124870](https://github.com/openclaw/openclaw/pull/124870)
- 防止网关错误后重放的破坏性清理和删除 [#126743](https://github.com/openclaw/openclaw/pull/126743)
- fix（代理）：保留工作区中的 Unicode 文件名读取 [#128873](https://github.com/openclaw/openclaw/pull/128873)
- fix（代理）：脱机删除期间删除外部数据库[#129017](https://github.com/openclaw/openclaw/pull/129017)
- fix（代理）：离线保存幸存者拥有的数据库 [#129085](https://github.com/openclaw/openclaw/pull/129085)
- fix（沙箱）：将裸上传句柄解析为分阶段入站媒体 [#129269](https://github.com/openclaw/openclaw/pull/129269)
- fix：将会话目录镜像保留在隔离配置文件中 [#129638](https://github.com/openclaw/openclaw/pull/129638)
- fix（worktrees）：在配置 [#129968](https://github.com/openclaw/openclaw/pull/129968) 期间从不执行存储库 git 挂钩
- fix（网关）：固定会话差异和工作工作空间路径的 git 配置 [#130124](https://github.com/openclaw/openclaw/pull/130124)
- fix（代理）：跨路径别名保留工作区所有权 [#130372](https://github.com/openclaw/openclaw/pull/130372)
- fix（沙箱）：停止在模块重新加载时保留内置后端 [#130518](https://github.com/openclaw/openclaw/pull/130518)
- fix（sessions）：在存储中保留所需的创建标记 [#131147](https://github.com/openclaw/openclaw/pull/131147)
- fix（openshell）：在沙箱命令 [#131360](https://github.com/openclaw/openclaw/pull/131360) 后保留 FIFO 和套接字
- fix（沙箱）：暂存最多 50 个入站媒体 MiB [#131384](https://github.com/openclaw/openclaw/pull/131384)
- fix（代理）：受保护的 macOS 文件工具拒绝受信任的工作区别名 [#131434](https://github.com/openclaw/openclaw/pull/131434)
- fix（openshell）：在执行 [#131556](https://github.com/openclaw/openclaw/pull/131556) 期间保留重叠的镜像工作空间
- fix（沙箱）：在后端切换[#131828](https://github.com/openclaw/openclaw/pull/131828)后重新创建OpenShell运行时
- 修复：捆绑安装中本机 fs 安全选择失败 [#131939](https://github.com/openclaw/openclaw/pull/131939)
- fix（exec）：继承为每次调用自动配置的主机 [#132100](https://github.com/openclaw/openclaw/pull/132100)
- 防止在未更改的记录重写后错误接管中止 [#91797](https://github.com/openclaw/openclaw/pull/91797)
- 防止沙箱绑定与受保护的技能坐骑发生冲突 [#93985](https://github.com/openclaw/openclaw/pull/93985)
- fix（代理）：保持嵌入式提示与环境文件隔离（#110776）[e3c78c3](https://github.com/openclaw/openclaw/commit/e3c78c3)
- Cap 代理消息文件在调度前读取 [#101442](https://github.com/openclaw/openclaw/pull/101442)
- Bound 身份文件读取以防止内存耗尽 [#101447](https://github.com/openclaw/openclaw/pull/101447)
- Bound 挂钩元数据在安装期间读取 [#101469](https://github.com/openclaw/openclaw/pull/101469)
- Bound 工作区挂钩元数据读取 [#101472](https://github.com/openclaw/openclaw/pull/101472)
- 在文件传输审核中记录验证的目录归档大小 [#104536](https://github.com/openclaw/openclaw/pull/104536)
- 在调度前拒绝过大的内联文件写入 [#104556](https://github.com/openclaw/openclaw/pull/104556)
- Bound Nextcloud 通话 API 密码文件读取 [#108321](https://github.com/openclaw/openclaw/pull/108321)
- 绑定并恢复调试代理CA生成[#109106](https://github.com/openclaw/openclaw/pull/109106)
- 绑定状态和启动 `.env` 读取到 1 MiB [#109487](https://github.com/openclaw/openclaw/pull/109487)
- 绑定秘密计划文件到16 MiB [#109652](https://github.com/openclaw/openclaw/pull/109652)
- Bound 插件清单元数据读取 [#110036](https://github.com/openclaw/openclaw/pull/110036)
- fix（oc-path）：绑定配置文件读取大小上限[#110714](https://github.com/openclaw/openclaw/pull/110714)
- Bound 执行批准文件读取到 1 MiB [#110755](https://github.com/openclaw/openclaw/pull/110755)
- 表面沙箱探测失败而不是错误的空结果 [#124881](https://github.com/openclaw/openclaw/pull/124881)
- fix（沙箱）：读取工具拒绝仅启用工作区的声明绑定 [#130540](https://github.com/openclaw/openclaw/pull/130540)
- fix（pdf）：针对代理工作区 [#130609](https://github.com/openclaw/openclaw/pull/130609) 读取工作区相关的 PDF 引用
- fix：接受沙盒会话的规范工作区路径 [#132265](https://github.com/openclaw/openclaw/pull/132265)

**文档**

- 记录一个沙盒代理的多个主机文件夹 [#109530](https://github.com/openclaw/openclaw/pull/109530)
- 记录受限制的 Gmail 阅读器设置 [#116041](https://github.com/openclaw/openclaw/pull/116041)
- docs（exec）：正确的 host=auto 每次调用覆盖语义 [#120331](https://github.com/openclaw/openclaw/pull/120331)

</details>

</Accordion>

<Accordion id="network-access-and-untrusted-content" title="网络访问和不受信任的内容">

[网络策略](/gateway/security/index)现在默认阻止未指定和本地使用的NAT64目标，验证受保护的重定向和无身份验证浏览器来源，并在其配置的代理无效时停止遥测而不是绕过它。私有自动化 Webhook 目标需要精确的主机例外或更广泛的私有网络交换机，更广泛的设置会扩大每个配置的 cron Webhook 之间的信任。

搜索、获取、MCP、插件、浏览器和其他网络支持工具返回的文本在模型看到之前会被限制、规范化并标记为不受信任的外部内容。这使得来源和边界变得明确，而模型仍然可能受到它所读取的敌对材料的影响。

终端和 CSV 输出中和了覆盖的控制序列和公式注入表单，配置拒绝原型污染路径，并根据生成它们的文档和实时权限重新检查浏览器引用、可执行等待、导航和 MCP 应用程序授权。浏览器导航实施涵盖托管操作期间和有限宽限期内的选定页面文档流量，将弹出窗口、服务工作人员、后台请求、某些重定向和远程后端留在该边界之外。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 规范并保护 Web 搜索结果 [#110308](https://github.com/openclaw/openclaw/pull/110308)
- 允许自动化 Webhook 的可信私有目标 [#118286](https://github.com/openclaw/openclaw/pull/118286)
- 添加所有选项卡和选定选项卡 Chrome 访问模式 [#120995](https://github.com/openclaw/openclaw/pull/120995)
- 对入站上下文使用普通标记标签 [#112000](https://github.com/openclaw/openclaw/pull/112000)

**错误修复**

- Block原型污染配置路径[#102840](https://github.com/openclaw/openclaw/pull/102840)
- 在无身份验证 HTTP 模式下阻止不允许的浏览器来源 [#102881](https://github.com/openclaw/openclaw/pull/102881)
- Gmail 设置期间阻止工作区云 SDK 控制 [#103918](https://github.com/openclaw/openclaw/pull/103918)
- 在浏览器交互期间阻止策略拒绝的导航 [#104254](https://github.com/openclaw/openclaw/pull/104254)
- 保持 MCP 应用程序与运行时工具策略保持一致 [#105075](https://github.com/openclaw/openclaw/pull/105075)
- 在不暴露网关令牌的情况下验证外部插件选项卡 [#107323](https://github.com/openclaw/openclaw/pull/107323)
- JSON Schema 默认水合作用期间阻止原型污染密钥 [#107978](https://github.com/openclaw/openclaw/pull/107978)
- Harden 外部内容标记和 Web 搜索输出 [#110417](https://github.com/openclaw/openclaw/pull/110417)
- Block 小部件编写的主机命令 [#110808](https://github.com/openclaw/openclaw/pull/110808)
- 固定 MCP 应用程序的 Harden 权限 [#111679](https://github.com/openclaw/openclaw/pull/111679)
- 跨操作员流量强制执行 macOS 网关 TLS 引脚 [#112353](https://github.com/openclaw/openclaw/pull/112353)
- 块不完整 Mistral 流式工具调用 [#117137](https://github.com/openclaw/openclaw/pull/117137)
- Bound DeepSeek DSML 恢复内存 [#117175](https://github.com/openclaw/openclaw/pull/117175)
- 换行页面控制浏览器操作结果[#118691](https://github.com/openclaw/openclaw/pull/118691)
- JSON 编码后清理伪造内容边界 [#118698](https://github.com/openclaw/openclaw/pull/118698)
- 隔离网络支持的动态工具输出 [#118729](https://github.com/openclaw/openclaw/pull/118729)
- 保留私有基岩嵌入端点 [#118744](https://github.com/openclaw/openclaw/pull/118744)
- 强制执行精确的 Feishu Webhook 请求边界 [#118758](https://github.com/openclaw/openclaw/pull/118758)
- 针对恶意外部内容的Harden网络工具输出 [#118984](https://github.com/openclaw/openclaw/pull/118984)
- 通过 TUI 渲染 [#118998](https://github.com/openclaw/openclaw/pull/118998) 阻止终端控制注入
- 将经过身份验证的 Apple 网页绑定到可信网关 [#119906](https://github.com/openclaw/openclaw/pull/119906)
- 保护 Synology 附件和系统代理配置命令 [#119941](https://github.com/openclaw/openclaw/pull/119941)
- Harden 网关代理和托管 Tailscale 入口 [#119950](https://github.com/openclaw/openclaw/pull/119950)
- 创建时清理审批文本和显示路径 [#123742](https://github.com/openclaw/openclaw/pull/123742)
- 清理 CLI 输出中存储的文本 [#123797](https://github.com/openclaw/openclaw/pull/123797)
- 在执行前拒绝格式错误的本机 Codex 工具参数 [#124649](https://github.com/openclaw/openclaw/pull/124649)
- 在已发布的目录中保留节点 MCP 调用 [#124652](https://github.com/openclaw/openclaw/pull/124652)
- 将 Codex 搜索域策略应用于托管 Web 获取 [#125574](https://github.com/openclaw/openclaw/pull/125574)
- 修复浏览器会话生命周期所有权 [#125933](https://github.com/openclaw/openclaw/pull/125933)
- 保留 MCP 目录和结果完整性 [#126083](https://github.com/openclaw/openclaw/pull/126083)
- Stop 已撤销 MCP 延迟目录工作后的应用程序操作 [#126415](https://github.com/openclaw/openclaw/pull/126415)
- fix（mcp）：应用授予撤销后停止资源访问 [#129550](https://github.com/openclaw/openclaw/pull/129550)
- fix（网关客户端）：在 Websocket 升级 [#131435](https://github.com/openclaw/openclaw/pull/131435) 之前验证 TLS 引脚
- Render 助理创作的转录本标题为惰性文本 [#99404](https://github.com/openclaw/openclaw/pull/99404)
- 调度前绑定直接钩投 [#100486](https://github.com/openclaw/openclaw/pull/100486)
- 防止无限托管插件目录读取 [#101000](https://github.com/openclaw/openclaw/pull/101000)
- 将浏览器等待谓词保留在批准的文档中 [#101852](https://github.com/openclaw/openclaw/pull/101852)
- 将请求策略应用于Qwen和阿里巴巴视频生成[#102094](https://github.com/openclaw/openclaw/pull/102094)
- 将映射的 Webhook 来源范围保持在可信路由 [#102418](https://github.com/openclaw/openclaw/pull/102418)
- 限制入站实时转录 WebSocket 消息 [#102443](https://github.com/openclaw/openclaw/pull/102443)
- 拒绝格式错误的托管图像数据 URL，而不停止回复 [#102825](https://github.com/openclaw/openclaw/pull/102825)
- 阻止可信网络获取的未指定 DNS 目标 [#103075](https://github.com/openclaw/openclaw/pull/103075)
- Block 工作区 dotenv 端点覆盖 [#103914](https://github.com/openclaw/openclaw/pull/103914)
- 拒绝过时的浏览器导航后引用 [#104308](https://github.com/openclaw/openclaw/pull/104308)
- Guard ClawRouter 使用重定向到 SSRF [#104592](https://github.com/openclaw/openclaw/pull/104592)
- 在视频生成过程中应用 xAI 请求策略 [#104836](https://github.com/openclaw/openclaw/pull/104836)
- 防止耗尽网关内存而导致格式错误的语言服务器输出 [#105460](https://github.com/openclaw/openclaw/pull/105460)
- Harden Control UI 预览和媒体下载标头 [#106545](https://github.com/openclaw/openclaw/pull/106545)
- Stop Vault SecretRef 悬挂在失速物体上的分辨率 [#108970](https://github.com/openclaw/openclaw/pull/108970)
- 防止从存储的转录本中进行终端控制注入 [#110060](https://github.com/openclaw/openclaw/pull/110060)
- 将LiteLLM环回信任限制为真实IP地址[#110693](https://github.com/openclaw/openclaw/pull/110693)
- 过滤原型敏感的 Feishu Webhook 字段 [#111729](https://github.com/openclaw/openclaw/pull/111729)
- 隔离代理提示中的 Fence 外部挂钩作业名称 [#112501](https://github.com/openclaw/openclaw/pull/112501)
- 主机执行环境中的Block C预处理器选择 [#112560](https://github.com/openclaw/openclaw/pull/112560)
- 阻止不安全工作区 dotenv 运行时控件 [#114133](https://github.com/openclaw/openclaw/pull/114133)
- 跨插件对环回主机进行一致分类 [#114832](https://github.com/openclaw/openclaw/pull/114832)
- Harden Android 数学和生成报告边界 [#115055](https://github.com/openclaw/openclaw/pull/115055)
- 将浏览器 Copilot 锁定到共享选项卡 [#116778](https://github.com/openclaw/openclaw/pull/116778)
- 拒绝格式错误的工具调用和表面审批交付失败 [#116831](https://github.com/openclaw/openclaw/pull/116831)
- 显示任务失败原因并保护终端输出 [#117568](https://github.com/openclaw/openclaw/pull/117568)
- 当配置的代理无效时拒绝直接遥测导出 [#118612](https://github.com/openclaw/openclaw/pull/118612)
- 因无效 OpenTelemetry TLS 文件而关闭失败 [#118648](https://github.com/openclaw/openclaw/pull/118648)
- 缓存命中后保留插件结果来源 [#118874](https://github.com/openclaw/openclaw/pull/118874)
- Fence远程Feishu工具内容并保留其出处[#118877](https://github.com/openclaw/openclaw/pull/118877)
- 在 TUI 聊天中保留以空格为前缀的感叹号输入 [#119245](https://github.com/openclaw/openclaw/pull/119245)
- Bound 验证期间嵌套浏览器批处理操作 [#120274](https://github.com/openclaw/openclaw/pull/120274)
- 统一附件字节分类 [#122168](https://github.com/openclaw/openclaw/pull/122168)
- fix（msteams）：共享链接主机后缀匹配需要点边界 [#123046](https://github.com/openclaw/openclaw/pull/123046)
- fix（discord）：将音频转录标记为不受信任的 [#123098](https://github.com/openclaw/openclaw/pull/123098)
- Harden本地使用NAT64提供商和网关信任[#123241](https://github.com/openclaw/openclaw/pull/123241)
- 拒绝无效的CLI过滤器值[#124520](https://github.com/openclaw/openclaw/pull/124520)
- Bound 停滞 Telegram 迷你应用程序请求主体 [#124944](https://github.com/openclaw/openclaw/pull/124944)
- 跨网关和工作路径标准化 TLS 证书引脚 [#125276](https://github.com/openclaw/openclaw/pull/125276)
- 恢复受信任的外部Tailscale路由而不削弱网关身份验证[#125412](https://github.com/openclaw/openclaw/pull/125412)
- fix（板载）：使用保存的 TLS 引脚探测远程网关并验证可信代理 [#131475](https://github.com/openclaw/openclaw/pull/131475)
- 在网关白名单中接受确切的自定义浏览器来源 [#38290](https://github.com/openclaw/openclaw/pull/38290)
- 拒绝带有凭据的 cron webhook URL [#51822](https://github.com/openclaw/openclaw/pull/51822)
- 通过出站分段保留可信生成的 HTML [#90579](https://github.com/openclaw/openclaw/pull/90579)
- 安全地允许舒适的私有服务主机名 [#99065](https://github.com/openclaw/openclaw/pull/99065)
- Keep 调试代理响应捕获内存限制 [#101268](https://github.com/openclaw/openclaw/pull/101268)
- 拒绝继承的对象属性作为QR传递通道[#101652](https://github.com/openclaw/openclaw/pull/101652)
- 拒绝不安全的QQBot提及模式[#102976](https://github.com/openclaw/openclaw/pull/102976)
- 拒绝审核时间过滤器中不可能的日期 [#103433](https://github.com/openclaw/openclaw/pull/103433)
- 安全地清理超大插件命令参数 [#104015](https://github.com/openclaw/openclaw/pull/104015)
- 阻止浏览器挂钩不允许的当前页面 [#104095](https://github.com/openclaw/openclaw/pull/104095)
- Bound Ed25519 base64url 解码输入 [#104921](https://github.com/openclaw/openclaw/pull/104921)
- Bound 珊瑚礁防护提供商响应为 [#106439](https://github.com/openclaw/openclaw/pull/106439)
- Validate 1密码审核严格限制 [#106926](https://github.com/openclaw/openclaw/pull/106926)
- 在 OpenClaw 和 Telegram 之间对齐代理旁路匹配 [#107711](https://github.com/openclaw/openclaw/pull/107711)
- Cap 管道模型验证输入为 1 MiB [#109800](https://github.com/openclaw/openclaw/pull/109800)
- 接受填充的审核列表游标 [#110551](https://github.com/openclaw/openclaw/pull/110551)
- Trim 在网关审核过滤器中粘贴标识符 [#110847](https://github.com/openclaw/openclaw/pull/110847)
- 清理失败时保持受保护的重定向工作 [#111156](https://github.com/openclaw/openclaw/pull/111156)
- 拒绝格式错误的 Microsoft Teams OAuth 令牌信封 [#111638](https://github.com/openclaw/openclaw/pull/111638)
- 防止使用 CSV 标签中的电子表格公式 [#111653](https://github.com/openclaw/openclaw/pull/111653)
- 从浏览器控制端点拒绝格式错误的 UTF-8 [#111898](https://github.com/openclaw/openclaw/pull/111898)
- 解释代理小部件缺失的沙箱起源 [#111909](https://github.com/openclaw/openclaw/pull/111909)
- Block CXXCPP 主机环境覆盖 [#112684](https://github.com/openclaw/openclaw/pull/112684)
- 恢复发布验证并保留浏览器CDP权限[#112740](https://github.com/openclaw/openclaw/pull/112740)
- 在保存之前拒绝格式错误的浏览器代理文件数据 [#115045](https://github.com/openclaw/openclaw/pull/115045)
- 从代理包语言服务器中拒绝格式错误的 UTF-8 [#117271](https://github.com/openclaw/openclaw/pull/117271)
- 巩固渠道发现并拒绝不安全的目录默认值 [#117541](https://github.com/openclaw/openclaw/pull/117541)
- 清理并绑定未知的CLI命令[#120380](https://github.com/openclaw/openclaw/pull/120380)
- 恢复数字游标以进行审计决策检查 [#122619](https://github.com/openclaw/openclaw/pull/122619)
- 防止存储的批准值运行终端转义 [#123671](https://github.com/openclaw/openclaw/pull/123671)
- 显示被拒绝的审核过滤器的有效值 [#124336](https://github.com/openclaw/openclaw/pull/124336)
- 拒绝不可能的审核过滤器组合 [#124513](https://github.com/openclaw/openclaw/pull/124513)
- Preserve Diffs 负载下远程查看器锁定 [#126484](https://github.com/openclaw/openclaw/pull/126484)
- fix（cli）：防止节点命令控制终端输出 [#127856](https://github.com/openclaw/openclaw/pull/127856)
- Bound GitHub 发布代理工具的元数据读取 [#98480](https://github.com/openclaw/openclaw/pull/98480)
- 保持线程所有权冲突有界和权威 [#98941](https://github.com/openclaw/openclaw/pull/98941)

**文档**

- 展开网关限速文档 [3fee3cc](https://github.com/openclaw/openclaw/commit/3fee3cc)
- Harden Gmail 挂钩安全指南 [6551786](https://github.com/openclaw/openclaw/commit/6551786)
- 澄清请求者范围的工具控件和不受信任的提示上下文 [#113400](https://github.com/openclaw/openclaw/pull/113400)

</details>

</Accordion>

<Accordion id="plugin-permissions-and-installation-checks" title="插件权限和安装检查">

托管外部插件安装现在显示一个 [ 能力审查 ](/plugins/plugin-permission-requests) 绑定到正在安装的工件，并在更新请求更多权限时再次询问。技能安全判决保持与确切的发布者和版本相关联，ClawHub GitHub 安装需要完整提交 SHA 而不是可变分支或标签，并且托管 Homebrew 或 NodeSource 安装程序在响应失败、为空、重定向或缺少 shebang 时停止。

功能提示适用于托管外部安装。捆绑插件会跳过它，已启用的遗留插件会保留其现有访问权限，捆绑执行会保留命名的兼容性异常。审查显示了插件要求做什么，而真实性和代码安全性仍然取决于[工件完整性](/gateway/security/dependency-locking)、注册表身份和代码审查。完整提交SHA固定下载的存档字节，而源元数据仍然取决于解析器，并且安装程序响应检查仅确认下载看起来像脚本。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 审核并批准 Control UI [#120900](https://github.com/openclaw/openclaw/pull/120900) 中的插件安装警告
- feat（plugins）：插件功能的一个同意屏幕，绑定到经过审查的工件 [#130168](https://github.com/openclaw/openclaw/pull/130168)
- 将插件包名称限制移至运营商策略 [#101813](https://github.com/openclaw/openclaw/pull/101813)
- 显示恶意技能的安全删除命令 [#118969](https://github.com/openclaw/openclaw/pull/118969)

**错误修复**

- 无论 ID 的情况如何，都强制执行插件拒绝规则 [#109237](https://github.com/openclaw/openclaw/pull/109237)
- 强制插件挂钩的隔离和审批完整性 [#115701](https://github.com/openclaw/openclaw/pull/115701)
- 保留插件路由直至节点能力批准 [#115980](https://github.com/openclaw/openclaw/pull/115980)
- 防止作用域插件加载替换根注册表 [#117587](https://github.com/openclaw/openclaw/pull/117587)
- 强制捆绑插件执行策略 [#118701](https://github.com/openclaw/openclaw/pull/118701)
- 保留与发布者相关的已安装技能安全判决 [#119672](https://github.com/openclaw/openclaw/pull/119672)
- 冻结安装爪工具权限[#121327](https://github.com/openclaw/openclaw/pull/121327)
- Harden Docker 映像并减少可修复漏洞发现 [#123282](https://github.com/openclaw/openclaw/pull/123282)
- 更新失败后保留插件信任策略 [#108661](https://github.com/openclaw/openclaw/pull/108661)
- 停止 meme-maker 推荐不安全的软件包安装 [#109612](https://github.com/openclaw/openclaw/pull/109612)
- 升级 protobufjs 以修复原型解析器拒绝服务 [#112184](https://github.com/openclaw/openclaw/pull/112184)
- 更新易受攻击的依赖项和本机字符串清单 [#112406](https://github.com/openclaw/openclaw/pull/112406)
- 在执行之前验证下载的安装程序脚本 [#113307](https://github.com/openclaw/openclaw/pull/113307)
- 防止被阻止的插件启用更改配置 [#114490](https://github.com/openclaw/openclaw/pull/114490)
- 补丁存档和 MCP 服务器依赖项 [#115029](https://github.com/openclaw/openclaw/pull/115029)
- 在 Codex 设置期间接受安全 Node 选项 [#115541](https://github.com/openclaw/openclaw/pull/115541)
- 在源扫描中检测别名子进程执行 [#116304](https://github.com/openclaw/openclaw/pull/116304)
- 防止插件卸载选择错误的目标 [#117406](https://github.com/openclaw/openclaw/pull/117406)
- 拒绝外部插件公共工件硬链接 [#118689](https://github.com/openclaw/openclaw/pull/118689)
- 删除节点时撤销插件功能链接 [#119848](https://github.com/openclaw/openclaw/pull/119848)
- 更新 NanoID 过去的拒绝服务通报 [#120368](https://github.com/openclaw/openclaw/pull/120368)
- 停止加载退役的内联挂钩模块 [#120851](https://github.com/openclaw/openclaw/pull/120851)
- 更新 macOS 用于故障关闭后台键盘的 Peekaboo，目标为 [#125364](https://github.com/openclaw/openclaw/pull/125364)
- fix（插件）：记录启用插件的同意[#132805](https://github.com/openclaw/openclaw/pull/132805)
- 需要不可变的 GitHub 提交 ClawHub 技能安装 [#97157](https://github.com/openclaw/openclaw/pull/97157)
- 保留插件节点命令的批准路径 [#98561](https://github.com/openclaw/openclaw/pull/98561)
- 将市场清单读取限制为 16 MiB [#101774](https://github.com/openclaw/openclaw/pull/101774)
- 更新 Axios 过去的代理咨询 [#111984](https://github.com/openclaw/openclaw/pull/111984)
- Pin 支架扩展 5.0.8 用于修复高严重性建议 [#113428](https://github.com/openclaw/openclaw/pull/113428)
- 删除已停用的安装策略绕过指导 [#120011](https://github.com/openclaw/openclaw/pull/120011)

</details>

</Accordion>

</AccordionGroup>
