---
title: "v2026.8.1：消息传递"
description: "Telegram、Slack、Discord 和本机应用程序可以保持更多对话的完整性，并且接受的消息可以在托管重启后继续存在。"
---

现在，消息传递可以在人们已经与 Claw 交谈的地方保持更多对话的完整性。 [Telegram](/channels/telegram) 获得更丰富的消息和媒体，[Slack](/channels/slack) 将实时进度和最终答案放在一起，[Discord](/channels/discord) 添加了选择加入活动和语音室，以了解谁在场，本机应用程序将媒体和待处理发送保留在对话中他们属于哪里。

在支持的通道中，OpenClaw 现在通过托管重启保存已接受的消息，报告连接是否可用、正在恢复或被阻止，并保留不确定的发送而不是盲目地再次发送。一旦 OpenClaw 接受了消息，恢复就会开始，并且每个服务仍然控制在该点之后它可以确认的内容。

<AccordionGroup>

<Accordion id="message-delivery-and-recovery" title="消息传递和恢复">

在支持的通道上，[ 消息 OpenClaw 已接受 ](/concepts/messages) 现在通过托管重启保持待处理状态，通道状态显示连接是可用、正在恢复还是被阻止。当发送超时而没有确认结果时，OpenClaw 会保持该结果的不确定性，并可以警告下一次联系，而不是创建可能的重复。当地验收后开始恢复。

符合条件的单选题可以在 Telegram、Discord 和 Slack 上使用本机控件，而较长的 Telegram 和 Discord 轮流可以显示简短的状态标题和紧凑的工具活动。多选和自由文本问题通过受支持的客户端或文本路径继续进行，Telegram 部分答案流仍然是单独的选择加入模式。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将六通道流配置移动到嵌套格式[#105709](https://github.com/openclaw/openclaw/pull/105709)
- 为支持的频道添加统一的隐式提及策略 [#108829](https://github.com/openclaw/openclaw/pull/108829)
- 在聊天界面添加结构化 ask_user 问题 [#109922](https://github.com/openclaw/openclaw/pull/109922)
- 跨harness、渠道和本机应用程序的完整 ask_user [#110372](https://github.com/openclaw/openclaw/pull/110372)
- Open MCP 频道回复中的应用视图 [#111211](https://github.com/openclaw/openclaw/pull/111211)
- 使频道媒体远离主要消息文本 [#111665](https://github.com/openclaw/openclaw/pull/111665)
- Render 模型创作的可折叠部分 [#114556](https://github.com/openclaw/openclaw/pull/114556)
- 教导模型在受支持的表面上使用可折叠细节 [#114706](https://github.com/openclaw/openclaw/pull/114706)
- 管理网关聊天中的音频和视频附件 [#115842](https://github.com/openclaw/openclaw/pull/115842)
- 发布十个捆绑通道的权威生命周期状态 [#118110](https://github.com/openclaw/openclaw/pull/118110)
- 跨十五个渠道报告真实的生命周期状态 [#118298](https://github.com/openclaw/openclaw/pull/118298)
- 仅将默认检测信号警报路由到配置的所有者 [#121988](https://github.com/openclaw/openclaw/pull/121988)
- 主机休眠后及时恢复通道连接 [#122489](https://github.com/openclaw/openclaw/pull/122489)
- Linux 主机睡眠后立即恢复本地网关 [#122719](https://github.com/openclaw/openclaw/pull/122719)
- 向消息发送添加结构化语音控制 [#124913](https://github.com/openclaw/openclaw/pull/124913)
- feat（频道）：通过 Discord、Slack、Telegram [#128435](https://github.com/openclaw/openclaw/pull/128435) 的表情符号列表自定义表情符号发现
- feat（channels）：当机器人加入群组房间时发布接地介绍 [#130103](https://github.com/openclaw/openclaw/pull/130103)
- 将旧频道流媒体密钥移至仅限医生的迁移 [#104693](https://github.com/openclaw/openclaw/pull/104693)
- 统一Matrix、Feishu和QQBot流配置[#105808](https://github.com/openclaw/openclaw/pull/105808)
- 立即打开所选通道的设置 [#113197](https://github.com/openclaw/openclaw/pull/113197)
- 需要嵌套通道流配置 [#113533](https://github.com/openclaw/openclaw/pull/113533)
- 迁移已停用的通道配置别名并删除孤立的影子试验 [#114709](https://github.com/openclaw/openclaw/pull/114709)
- 从完成的频道回复中删除活动摘要 [#124972](https://github.com/openclaw/openclaw/pull/124972)

**错误修复**

- fix（channels）：捆绑通道拒绝记录的 mediaMaxMb 覆盖 （#118157） [0bb870a](https://github.com/openclaw/openclaw/commit/0bb870a)
- 预传递回调挂起时释放回复通道 [#104256](https://github.com/openclaw/openclaw/pull/104256)
- 协调超时消息发送，无需重复重试 [#104632](https://github.com/openclaw/openclaw/pull/104632)
- 通过配置迁移保留流设置 [#105054](https://github.com/openclaw/openclaw/pull/105054)
- 在轮后压缩失败时保留已完成的回复 [#105156](https://github.com/openclaw/openclaw/pull/105156)
- 保留 Codex 结束活动轮次的进度消息 [#105365](https://github.com/openclaw/openclaw/pull/105365)
- 仅显示带有模型编写标题的长任务的进度草稿 [#106026](https://github.com/openclaw/openclaw/pull/106026)
- 回复完成停止后恢复消息会话 [#106792](https://github.com/openclaw/openclaw/pull/106792)
- 保留确认后 Webhook 处理承认 [#107734](https://github.com/openclaw/openclaw/pull/107734)
- 后续到达时保留已完成的回复 [#107799](https://github.com/openclaw/openclaw/pull/107799)
- 网关重启后恢复通道安全转向 [#108283](https://github.com/openclaw/openclaw/pull/108283)
- 通过重试和重新启动使排队的语音回复保持活动状态 [#108502](https://github.com/openclaw/openclaw/pull/108502)
- 恢复一个跨渠道 DM 会话以进行全新安装 [#110225](https://github.com/openclaw/openclaw/pull/110225)
- 恢复网关聊天中的结构化 ask_user 问题 [#110961](https://github.com/openclaw/openclaw/pull/110961)
- 恢复失败的入站通道事件 [#111029](https://github.com/openclaw/openclaw/pull/111029)
- 防止通道回声并添加本机登录命令 [#111341](https://github.com/openclaw/openclaw/pull/111341)
- 从 iMessage、Signal 和 WhatsApp 中删除媒体占位符文本 [#111800](https://github.com/openclaw/openclaw/pull/111800)
- 重启后恢复消息通道上下文 [#112548](https://github.com/openclaw/openclaw/pull/112548)
- 拒绝无效的显式渠道帐户选择 [#113417](https://github.com/openclaw/openclaw/pull/113417)
- 防止繁忙的网关默默地丢弃排队的回复 [#114058](https://github.com/openclaw/openclaw/pull/114058)
- 停止无套接字通道重新启动循环 [#114970](https://github.com/openclaw/openclaw/pull/114970)
- 当持久入口不可用时通道启动失败 [#114998](https://github.com/openclaw/openclaw/pull/114998)
- 防止处理回合后出现错误的无回复回退 [#115016](https://github.com/openclaw/openclaw/pull/115016)
- 将无效入站交货的渠道报告为不正常 [#115229](https://github.com/openclaw/openclaw/pull/115229)
- 匹配修饰代理名称的类型组提及 [#115278](https://github.com/openclaw/openclaw/pull/115278)
- 转弯入场后释放入站去抖 [#115603](https://github.com/openclaw/openclaw/pull/115603)
- 用于重新启动恢复回复的运行通道回复挂钩 [#115711](https://github.com/openclaw/openclaw/pull/115711)
- 在队列拆卸后传送重试的消息 [#115891](https://github.com/openclaw/openclaw/pull/115891)
- 在明文通道回复中保留Markdown代码[#116123](https://github.com/openclaw/openclaw/pull/116123)
- 在频道状态标题下显示工具进度 [#116143](https://github.com/openclaw/openclaw/pull/116143)
- 网关重启后恢复解锁通道 [#116728](https://github.com/openclaw/openclaw/pull/116728)
- 通过 Matrix 和 Telegram 发送工作区附件 [#117711](https://github.com/openclaw/openclaw/pull/117711)
- 交付引用简短临时更新的最终答复 [#118178](https://github.com/openclaw/openclaw/pull/118178)
- 保留可操作的通道故障状态和 Discord 重试行为 [#118251](https://github.com/openclaw/openclaw/pull/118251)
- 在网关崩溃循环窗口清除后恢复通道自动启动 [#118311](https://github.com/openclaw/openclaw/pull/118311)
- 标准化通道生命周期恢复和清理 [#118795](https://github.com/openclaw/openclaw/pull/118795)
- 让代理在最后一条消息工具回复之前发送进度 [#119605](https://github.com/openclaw/openclaw/pull/119605)
- 通过一名每回合所有者 [#121009](https://github.com/openclaw/openclaw/pull/121009) 路由 Slack 和 Discord 评论
- 跨传递路径保留通道插件回复抑制 [#121159](https://github.com/openclaw/openclaw/pull/121159)
- 使不明确的最终交货损失可见，无需重新发送 [#121833](https://github.com/openclaw/openclaw/pull/121833)
- 默认向最后一个会话发送心跳警报 [#121892](https://github.com/openclaw/openclaw/pull/121892)
- 将失败的代理程序跨通道运行显示为错误 [#122009](https://github.com/openclaw/openclaw/pull/122009)
- 使无头通道设置快速失败 [#122530](https://github.com/openclaw/openclaw/pull/122530)
- 停止网关从继承的凭据自动启动通道 [#123174](https://github.com/openclaw/openclaw/pull/123174)
- 可见聊天回复取代同一会话心跳 [#123458](https://github.com/openclaw/openclaw/pull/123458)
- 保持失败的发送重新绑定主会话 [#124459](https://github.com/openclaw/openclaw/pull/124459)
- 当通道重叠时保留回复 [#124623](https://github.com/openclaw/openclaw/pull/124623)
- 已结算交付结果的基本回复可见性 [#124773](https://github.com/openclaw/openclaw/pull/124773)
- 保留不明确的消息传递结果 [#124825](https://github.com/openclaw/openclaw/pull/124825)
- 报告状态更新后失败的排队回复 [#125325](https://github.com/openclaw/openclaw/pull/125325)
- 在网关重新启动时保留接受的通道消息 [#125919](https://github.com/openclaw/openclaw/pull/125919)
- 防止大型 Base64 附件耗尽网关内存 [#126017](https://github.com/openclaw/openclaw/pull/126017)
- 恢复显式多代理队列中的排队交付 [#126377](https://github.com/openclaw/openclaw/pull/126377)
- 停止将路线标识符视为交货收据 [#126385](https://github.com/openclaw/openclaw/pull/126385)
- fix（网关）：将对话传递保持在代理绑定内 [#126424](https://github.com/openclaw/openclaw/pull/126424)
- 恢复所有者发布冲突后取消阻止回复 [#126507](https://github.com/openclaw/openclaw/pull/126507)
- 防止通道启动期间网关准备就绪 [#126555](https://github.com/openclaw/openclaw/pull/126555)
- 在泵释放后保留持久的入站消息 [#126590](https://github.com/openclaw/openclaw/pull/126590)
- fix（通道）：重试超时的入口消息 [#127090](https://github.com/openclaw/openclaw/pull/127090)
- fix（插件）：将工具交付绑定到当前回合[#127098](https://github.com/openclaw/openclaw/pull/127098)
- fix（通道）：使排队的消息在长时间循环中保持活动状态，而不是使其成为死信 [#127950](https://github.com/openclaw/openclaw/pull/127950)
- fix（channels）：保留入站轮流的网关上下文 [#127962](https://github.com/openclaw/openclaw/pull/127962)
- fix（cron）：临时网络故障后计划作业结果消失 [#128184](https://github.com/openclaw/openclaw/pull/128184)
- fix（出站）：防止远程网关重复发送[#128202](https://github.com/openclaw/openclaw/pull/128202)
- fix（媒体）：停止静默跳过具有不透明下载 URL [#128220](https://github.com/openclaw/openclaw/pull/128220) 的附件
- fix（通道）：保留长演示文本[#130368](https://github.com/openclaw/openclaw/pull/130368)
- fix（自动回复）：澄清未解决的环境房间事件[#130901](https://github.com/openclaw/openclaw/pull/130901)
- fix（config）：保留通道帐户策略继承[#131250](https://github.com/openclaw/openclaw/pull/131250)
- 修复：恢复中断的交货结算，无需重复通知[#131380](https://github.com/openclaw/openclaw/pull/131380)
- 通过一次受保护的重试恢复未送达的消息工具回复 [#99536](https://github.com/openclaw/openclaw/pull/99536)
- fix（通道）：捆绑通道拒绝记录的responsePrefix覆盖（#118148）[1f2e998](https://github.com/openclaw/openclaw/commit/1f2e998)
- fix（通道）：接受上下文可见性设置（#117287）[d8e08e7](https://github.com/openclaw/openclaw/commit/d8e08e7)
- 将活动消息排除在队列溢出丢弃之外 [#103284](https://github.com/openclaw/openclaw/pull/103284)
- 将 Unicode 段落分隔符拆分为消息块 [#103518](https://github.com/openclaw/openclaw/pull/103518)
- 恢复官方ClawHub插件的可信启动[#103836](https://github.com/openclaw/openclaw/pull/103836)
- 当Codex转向无法确认采用时保留消息[#103916](https://github.com/openclaw/openclaw/pull/103916)
- 保留出站消息中的属性格式 [#104118](https://github.com/openclaw/openclaw/pull/104118)
- 使通道 nack 回调幂等 [#104919](https://github.com/openclaw/openclaw/pull/104919)
- 隔离损坏的通道入口行 [#105259](https://github.com/openclaw/openclaw/pull/105259)
- 在Doctor迁移期间保留继承的Discord流设置 [#105636](https://github.com/openclaw/openclaw/pull/105636)
- 防止在同一路由上重复生成媒体传送 [#105717](https://github.com/openclaw/openclaw/pull/105717)
- Surface 空消息仅工具完成 [#105765](https://github.com/openclaw/openclaw/pull/105765)
- 保留群聊中谁说了什么变成[#107025](https://github.com/openclaw/openclaw/pull/107025)
- Hide 共享对话中的模型回退通知 [#107209](https://github.com/openclaw/openclaw/pull/107209)
- 减少通道消息工具中不相关的字段 [#107474](https://github.com/openclaw/openclaw/pull/107474)
- 重试时保留排队的 MEDIA 附件 [#108969](https://github.com/openclaw/openclaw/pull/108969)
- Honor 拒绝入站对话索赔 [#109857](https://github.com/openclaw/openclaw/pull/109857)
- 防止路由缓存冲突选择错误的代理 [#110001](https://github.com/openclaw/openclaw/pull/110001)
- 让通道设置在超时启动后恢复 [#110146](https://github.com/openclaw/openclaw/pull/110146)
- Lock Channel Wizard 在步骤运行时回答 [#110163](https://github.com/openclaw/openclaw/pull/110163)
- Scope 设置向导选定帐户的凭据 [#110969](https://github.com/openclaw/openclaw/pull/110969)
- 防止重复的代理对代理答复 [#111012](https://github.com/openclaw/openclaw/pull/111012)
- fix（通道）：当停止中止竞赛交付返回时保留终端入口结果[#111347](https://github.com/openclaw/openclaw/pull/111347)
- 用结构化事实替换频道媒体占位符主体 [#111447](https://github.com/openclaw/openclaw/pull/111447)
- 使配置和通道设置行为一致 [#111720](https://github.com/openclaw/openclaw/pull/111720)
- 通过有序附件事实路由入站媒体 [#112276](https://github.com/openclaw/openclaw/pull/112276)
- Draft 预览在瞬时发送失败后保持最新更新 [#112370](https://github.com/openclaw/openclaw/pull/112370)
- 保留包含空格的未加引号的媒体路径 [#112464](https://github.com/openclaw/openclaw/pull/112464)
- 使格式化回复在纯文本通道上可读 [#112926](https://github.com/openclaw/openclaw/pull/112926)
- 改进 Teams 和 QQ [#113100](https://github.com/openclaw/openclaw/pull/113100) 上的 Markdown 渲染
- 在正常路由通道回复上运行出站挂钩 [#113448](https://github.com/openclaw/openclaw/pull/113448)
- 通过一个生命周期路由捆绑的本机命令回复 [#113500](https://github.com/openclaw/openclaw/pull/113500)
- 恢复不透明插件对话绑定 [#113588](https://github.com/openclaw/openclaw/pull/113588)
- 保留流附件的 MIME 类型 [#113762](https://github.com/openclaw/openclaw/pull/113762)
- 启动宽限结束时运行通道恢复检查 [#114275](https://github.com/openclaw/openclaw/pull/114275)
- 在报告停止故障之前完成同级通道拆卸 [#114280](https://github.com/openclaw/openclaw/pull/114280)
- 防止重写命令后重复回复 [#114379](https://github.com/openclaw/openclaw/pull/114379)
- 对齐通道账户选择和凭证替换 [#114395](https://github.com/openclaw/openclaw/pull/114395)
- 防止 NO_REPLY 令牌泄漏到已发送的回复中 [#114500](https://github.com/openclaw/openclaw/pull/114500)
- 在显式组提及 [#114531](https://github.com/openclaw/openclaw/pull/114531) 后显示空回复回退
- 在交付主故障后停止重复回复 [#114628](https://github.com/openclaw/openclaw/pull/114628)
- 在重新链接和重启期间使通道状态内部一致 [#114775](https://github.com/openclaw/openclaw/pull/114775)
- 限制针对机器人的无回复通知 [#114799](https://github.com/openclaw/openclaw/pull/114799)
- 让用户轮流恢复过去的仅预定回复挂钩 [#114836](https://github.com/openclaw/openclaw/pull/114836)
- 修剪最终回复块中的尾随空格 [#114973](https://github.com/openclaw/openclaw/pull/114973)
- 让崩溃循环通道达到放弃状态 [#114976](https://github.com/openclaw/openclaw/pull/114976)
- 在当前频道账号上保留委托消息 [#115358](https://github.com/openclaw/openclaw/pull/115358)
- 在持久频道回复中保留 CLI 中转文本 [#115455](https://github.com/openclaw/openclaw/pull/115455)
- 在仅消息工具传递中恢复搁浅的 CJK 回复 [#115556](https://github.com/openclaw/openclaw/pull/115556)
- Mark 跨六个通道的持久 Webhook 接受度 [#115586](https://github.com/openclaw/openclaw/pull/115586)
- 防止重复 CLI 评论传递 [#115596](https://github.com/openclaw/openclaw/pull/115596)
- 使内部代理会话远离消息目标 [#115657](https://github.com/openclaw/openclaw/pull/115657)
- Honor 为经过身份验证的自动回复配置默认代理 [#115724](https://github.com/openclaw/openclaw/pull/115724)
- 返回对活动直接对话的委托回复 [#115756](https://github.com/openclaw/openclaw/pull/115756)
- 阻止不健康通道永久重启 [#116089](https://github.com/openclaw/openclaw/pull/116089)
- 保留代理挂钩传递的帐户选择 [#116095](https://github.com/openclaw/openclaw/pull/116095)
- 在运行前拒绝无效的挂钩交付帐户 [#116264](https://github.com/openclaw/openclaw/pull/116264)
- 对一条进展草案线保留流媒体评论 [#116272](https://github.com/openclaw/openclaw/pull/116272)
- 当提及是可选时确认明确的组提及 [#116303](https://github.com/openclaw/openclaw/pull/116303)
- 在通道进度中显示失败的 CLI 命令结果 [#116387](https://github.com/openclaw/openclaw/pull/116387)
- 保持有意的 NO_REPLY 跨渠道完成沉默 [#116548](https://github.com/openclaw/openclaw/pull/116548)
- 在重新启动恢复过程中保留出站策略结果 [#116632](https://github.com/openclaw/openclaw/pull/116632)
- 保留四个捆绑渠道的交付行为 [#116647](https://github.com/openclaw/openclaw/pull/116647)
- 在过时终端事件后保持恢复的通道变为活动状态 [#116777](https://github.com/openclaw/openclaw/pull/116777)
- 在媒体附件回复中保留 Markdown 格式 [#116786](https://github.com/openclaw/openclaw/pull/116786)
- 当一个插件失败时保持通道设置可用 [#116824](https://github.com/openclaw/openclaw/pull/116824)
- 跨渠道保留补充媒体和演示详细信息 [#116884](https://github.com/openclaw/openclaw/pull/116884)
- 在最终答复中保留格式错误的括号文本 [#116979](https://github.com/openclaw/openclaw/pull/116979)
- 在最终回复中保留不匹配的括号尾部 [#116983](https://github.com/openclaw/openclaw/pull/116983)
- 在通道后备菜单中保留可操作命令 [#116990](https://github.com/openclaw/openclaw/pull/116990)
- fix（消息）：线程回复传递未标记为当前源回复 [#117176](https://github.com/openclaw/openclaw/pull/117176)
- 使通道进度预览在排队轮次之间保持一致 [#117269](https://github.com/openclaw/openclaw/pull/117269)
- 在运行状况输出中显示新的通道探测故障 [#117410](https://github.com/openclaw/openclaw/pull/117410)
- 在配置的发送者帐户上保留心跳承诺 [#117521](https://github.com/openclaw/openclaw/pull/117521)
- 保留明确的空交货收据而不发明 ID [#118126](https://github.com/openclaw/openclaw/pull/118126)
- 保留创作的出站消息空白 [#118538](https://github.com/openclaw/openclaw/pull/118538)
- 在重新启动时保留 Slack 和 Mattermost 线程参与到期 [#118630](https://github.com/openclaw/openclaw/pull/118630)
- 让手动重启的通道从临时错误中恢复 [#118728](https://github.com/openclaw/openclaw/pull/118728)
- 接受指定外部通道账户的心跳设置 [#118828](https://github.com/openclaw/openclaw/pull/118828)
- 在 Windows 上接受大小写混合的本地文件 URL [#121226](https://github.com/openclaw/openclaw/pull/121226)
- Resolve Windows 自定义使用页脚的主路径 [#121303](https://github.com/openclaw/openclaw/pull/121303)
- 保留内圈上的外螺纹布线 [#121321](https://github.com/openclaw/openclaw/pull/121321)
- 通过执行保持本机插件命令选择绑定 [#121544](https://github.com/openclaw/openclaw/pull/121544)
- 防止重新启动后重放成功的精确发送 [#121587](https://github.com/openclaw/openclaw/pull/121587)
- 报告尽力代理传送失败 [#121824](https://github.com/openclaw/openclaw/pull/121824)
- 当医生保持配置不变时显示通道警告 [#121956](https://github.com/openclaw/openclaw/pull/121956)
- 表面部分通道状态故障 [#122349](https://github.com/openclaw/openclaw/pull/122349)
- 清除虚假交货-成功后的不确定性通知 [#122438](https://github.com/openclaw/openclaw/pull/122438)
- 配置终端反应保持定时[#122544](https://github.com/openclaw/openclaw/pull/122544)
- 真实报告每个目标的广播交付结果 [#122605](https://github.com/openclaw/openclaw/pull/122605)
- 标记时保留文本 TTS 合成失败 [#122608](https://github.com/openclaw/openclaw/pull/122608)
- 帐户删除后立即刷新网关运行状况 [#122620](https://github.com/openclaw/openclaw/pull/122620)
- 使用其路由代理 [#123316](https://github.com/openclaw/openclaw/pull/123316) 保留 Slack 和 Discord 系统事件
- 当策略和持久会话不同时传送终端回复 [#123422](https://github.com/openclaw/openclaw/pull/123422)
- 手动重启后保持通道消息工作 [#123885](https://github.com/openclaw/openclaw/pull/123885)
- 保持托管回复媒体可下载并正确拥有 [#124048](https://github.com/openclaw/openclaw/pull/124048)
- 停止未送达的 ask_user 捕获稍后回复的提示 [#124148](https://github.com/openclaw/openclaw/pull/124148)
- 当通道管理器停止时清理实时线程绑定 [#124221](https://github.com/openclaw/openclaw/pull/124221)
- 在纯文本回复中保留电子邮件地址 [#124249](https://github.com/openclaw/openclaw/pull/124249)
- fix（出站）：防止因已证明未发送的消息工具故障而重复发送 [#124310](https://github.com/openclaw/openclaw/pull/124310)
- 状态刷新失败后保留通道设置 [#124383](https://github.com/openclaw/openclaw/pull/124383)
- 拒绝无效的目标通道设置请求 [#124584](https://github.com/openclaw/openclaw/pull/124584)
- 表面不可用通道状态检查器 [#124600](https://github.com/openclaw/openclaw/pull/124600)
- 仅在保存配置后运行通道设置挂钩 [#124736](https://github.com/openclaw/openclaw/pull/124736)
- 保留整个交付过程中键入的 Signal 和 iMessage 批准 [#124742](https://github.com/openclaw/openclaw/pull/124742)
- 商店助理交付指令作为键入的抄本事实 [#124793](https://github.com/openclaw/openclaw/pull/124793)
- 将无目标直接消息回复路由回发件人 [#124837](https://github.com/openclaw/openclaw/pull/124837)
- 将图像获取余量绑定到图像大小上限 [#124838](https://github.com/openclaw/openclaw/pull/124838)
- 从历史会话中删除传递标记 [#124888](https://github.com/openclaw/openclaw/pull/124888)
- 在渠道中尊重明确的代理所有权解决[#125109](https://github.com/openclaw/openclaw/pull/125109)
- 保留降级的Discord和Telegram交付结果[#125152](https://github.com/openclaw/openclaw/pull/125152)
- 恢复已授权新消息的存档频道会话 [#125163](https://github.com/openclaw/openclaw/pull/125163)
- 保留无目标消息回复的相关性 [#125283](https://github.com/openclaw/openclaw/pull/125283)
- 验证结构化附件中的每个来源 [#125433](https://github.com/openclaw/openclaw/pull/125433)
- fix（自动回复）：在非所有者强制通道上恢复通道授权的/new和/reset [#125618](https://github.com/openclaw/openclaw/pull/125618)
- 让主座席了解隔离组对话 [#125667](https://github.com/openclaw/openclaw/pull/125667)
- fix（代理）：恢复插件信封信号中的交付状态检查[#125706](https://github.com/openclaw/openclaw/pull/125706)
- 返回完整的 webhook 错误并可靠地排出网关关闭 [#125893](https://github.com/openclaw/openclaw/pull/125893)
- 使广播失败对脚本和操作员可见 [#125915](https://github.com/openclaw/openclaw/pull/125915)
- 强制出站附件的发件人文件读取策略 [#125950](https://github.com/openclaw/openclaw/pull/125950)
- fix（cron）： 下发成功后保留出站路由 [#126145](https://github.com/openclaw/openclaw/pull/126145)
- 恢复格式错误的通道入口声明 [#126176](https://github.com/openclaw/openclaw/pull/126176)
- 在持久交付中保留一次性本机回复 [#126205](https://github.com/openclaw/openclaw/pull/126205)
- 工作开始后显示排队回复失败 [#126266](https://github.com/openclaw/openclaw/pull/126266)
- 立即解决预中止答复交付 [#126582](https://github.com/openclaw/openclaw/pull/126582)
- 在关闭期间停止 Nostr 和 Buzz 重用总线 [#126637](https://github.com/openclaw/openclaw/pull/126637)
- 恢复消息 CLI 为 npm- 已安装的频道发送 [#126700](https://github.com/openclaw/openclaw/pull/126700)
- 在临时通道适配器中断期间重试排队传送 [#126800](https://github.com/openclaw/openclaw/pull/126800)
- 修复（代理）：心跳运行不再阻塞可见转弯[#126853](https://github.com/openclaw/openclaw/pull/126853)
- fix（心跳）：以禁用的节奏交付执行完成 [#126895](https://github.com/openclaw/openclaw/pull/126895)
- fix（acp）：重新连接协调时恢复终端回复和表面运行错误 [#126909](https://github.com/openclaw/openclaw/pull/126909)
- 预览清理失败时保留传递的频道回复 [#126922](https://github.com/openclaw/openclaw/pull/126922)
- 保留所选帐户用于CLI-支持的cron公告[#126995](https://github.com/openclaw/openclaw/pull/126995)
- 恢复已修复的凭据文件帐户，无需重新启动同级 [#126999](https://github.com/openclaw/openclaw/pull/126999)
- 当后续进度永远不会成为最终回复时显示明显错误 [#127070](https://github.com/openclaw/openclaw/pull/127070)
- fix（代理）：保留不透明会话密钥大小写 [#127279](https://github.com/openclaw/openclaw/pull/127279)
- fix：在明确的通道拒绝后停止重试风暴 [#127353](https://github.com/openclaw/openclaw/pull/127353)
- fix（出站）：在不明确的网络故障后防止媒体重播 [#127841](https://github.com/openclaw/openclaw/pull/127841)
- fix（通道）：将入口通道保持在其头部，而不是任何重试行 [#127849](https://github.com/openclaw/openclaw/pull/127849)
- fix（网关）：时钟回滚后，不健康的通道显示为就绪 [#128222](https://github.com/openclaw/openclaw/pull/128222)
- 修复：保持手动停止的空闲频道帐户停止[#128237](https://github.com/openclaw/openclaw/pull/128237)
- fix（出站）：防止空分块器默默地丢弃回复 [#128288](https://github.com/openclaw/openclaw/pull/128288)
- fix（代理）：当传送失败时，流式回复和生成的媒体消失 [#128337](https://github.com/openclaw/openclaw/pull/128337)
- fix（代理）：从允许的网关解析终端 [#128348](https://github.com/openclaw/openclaw/pull/128348)
- fix（tts）：在语音运行时间冷时提供仅语音回复 [#128394](https://github.com/openclaw/openclaw/pull/128394)
- fix（代理）：当提供商流结束时关闭卡住的推理预览 [#128496](https://github.com/openclaw/openclaw/pull/128496)
- fix（plugin-sdk）：在空分块后保留文本 [#128499](https://github.com/openclaw/openclaw/pull/128499)
- fix（回复）：保留流式语音消息顺序[#128558](https://github.com/openclaw/openclaw/pull/128558)
- 修复：当数据 URL 包含 MIME 参数或包装的 base64 [#128823](https://github.com/openclaw/openclaw/pull/128823) 时附件失败
- fix（回复）：丰富的回复在无声回复标记旁边消失 [#129082](https://github.com/openclaw/openclaw/pull/129082)
- fix（代理）：保留通道拥有的消息线程标识 [#129095](https://github.com/openclaw/openclaw/pull/129095)
- fix（回复）：防止重复数据删除的后续操作丢失线程回复 [#129123](https://github.com/openclaw/openclaw/pull/129123)
- fix（通道）：附件文件名从模型上下文中消失 [#129140](https://github.com/openclaw/openclaw/pull/129140)
- fix（出站）：在对话历史记录中保留仅位置回复 [#129197](https://github.com/openclaw/openclaw/pull/129197)
- fix（cli）：消息发送失败报告成功[#129202](https://github.com/openclaw/openclaw/pull/129202)
- fix（回复）：回复文本已发送时保留附件和操作 [#129230](https://github.com/openclaw/openclaw/pull/129230)
- fix（回复）：在交付身份中保留位置和视频演示 [#129278](https://github.com/openclaw/openclaw/pull/129278)
- fix（代理）：将流式代码块保持在消息限制内 [#129487](https://github.com/openclaw/openclaw/pull/129487)
- fix（通道）：遵守支持的组历史记录限制 [#129710](https://github.com/openclaw/openclaw/pull/129710)
- fix（通道）：在不绑定每个待处理 ID 的情况下排出大量入口积压 [#129717](https://github.com/openclaw/openclaw/pull/129717)
- fix（回复）：在推理和评论更新后保留最终答案[#129893](https://github.com/openclaw/openclaw/pull/129893)
- fix（交付）：跨时钟跳跃重新配置队列计时器 [#129913](https://github.com/openclaw/openclaw/pull/129913)
- fix（通道）：重试放弃的交付而不惩罚 Telegram 重新启动 [#130077](https://github.com/openclaw/openclaw/pull/130077)
- fix（cli）：失败的消息操作报告成功 [#130281](https://github.com/openclaw/openclaw/pull/130281)
- fix：针对已解析的交付线程 [#130510](https://github.com/openclaw/openclaw/pull/130510) 进行重复数据删除回复
- 修复：中断模式无法停止活动的低电平通道回复 [#130621](https://github.com/openclaw/openclaw/pull/130621)
- 修复：在不可用的批准后保留频道答案[#130624](https://github.com/openclaw/openclaw/pull/130624)
- fix（回复）：卡住会话恢复后恢复后续工作[#130911](https://github.com/openclaw/openclaw/pull/130911)
- fix（自动回复）：在命令提示符中保留频道上下文 [#130958](https://github.com/openclaw/openclaw/pull/130958)
- refactor（channels）：合并账户注销清理[#130976](https://github.com/openclaw/openclaw/pull/130976)
- fix：在活动运行期间提供斜杠命令回复 [#131023](https://github.com/openclaw/openclaw/pull/131023)
- fix（自动回复）：绑定栅栏重新打开标头，以便块遵守限制 [#131086](https://github.com/openclaw/openclaw/pull/131086)
- fix（media）：附加文件的名称永远不会到达模型上下文 [#131216](https://github.com/openclaw/openclaw/pull/131216)
- fix（交付）：当生产者声明过期时保留重试预算 [#131614](https://github.com/openclaw/openclaw/pull/131614)
- fix（消息）：通过 fs 桥 [#131616](https://github.com/openclaw/openclaw/pull/131616) 水合仅限远程沙箱附件
- fix（通道）：关闭后保留入口重试事实 [#131962](https://github.com/openclaw/openclaw/pull/131962)
- fix（codex）：使工具生命周期远离通道进度 [#132321](https://github.com/openclaw/openclaw/pull/132321)
- fix（codex）：恢复配置的通道工具进度[#132664](https://github.com/openclaw/openclaw/pull/132664)
- fix（出站）：跳过空 HTML 格式化元素的标记 [#133103](https://github.com/openclaw/openclaw/pull/133103)
- fix（media）：在本机回复边界解码文件 URL [#133146](https://github.com/openclaw/openclaw/pull/133146)
- fix（出站）：通过仅 sendFormattedMedia 适配器传送媒体 [#133168](https://github.com/openclaw/openclaw/pull/133168)
- fix：在泄露的模型标记周围保留标点符号和粗体格式 [#133287](https://github.com/openclaw/openclaw/pull/133287)
- 解析中止回复中的响应前缀模板 [#45315](https://github.com/openclaw/openclaw/pull/45315)
- 按显示宽度对齐 CJK 和表情符号 Markdown 表格 [#55596](https://github.com/openclaw/openclaw/pull/55596)
- 将派生代理名称与 Unicode 感知边界匹配 [#89864](https://github.com/openclaw/openclaw/pull/89864)
- 频道登录发现有卸载插件时重启网关 [#90779](https://github.com/openclaw/openclaw/pull/90779)
- 荣誉显式 Telegram 和 Discord 预览流 [#97671](https://github.com/openclaw/openclaw/pull/97671)
- fix：在排队清理中保留重新启动交付声明 [8b3f7e7](https://github.com/openclaw/openclaw/commit/8b3f7e7)
- 延迟叙述进度草稿并删除隐式标题 [#105607](https://github.com/openclaw/openclaw/pull/105607)
- 关于旧标量流设置的警告外部插件 [#106796](https://github.com/openclaw/openclaw/pull/106796)
- 报告失败的旧通道发送为失败 [#109906](https://github.com/openclaw/openclaw/pull/109906)
- 在插件发送结果中保持配置的通道权威 [#110069](https://github.com/openclaw/openclaw/pull/110069)
- 审核日志记录失败时保留通道设置成功 [#111504](https://github.com/openclaw/openclaw/pull/111504)
- 忽略消息发送上的空白可选位置 [#112013](https://github.com/openclaw/openclaw/pull/112013)
- 配置重新加载后保持回复工作 [#112467](https://github.com/openclaw/openclaw/pull/112467)
- 按照正确的重试计划恢复排队的出站消息 [#113700](https://github.com/openclaw/openclaw/pull/113700)
- 荣誉渠道选择退出显式回复标签 [#114268](https://github.com/openclaw/openclaw/pull/114268)
- 在并行探测期间保持通道状态排序稳定 [#114362](https://github.com/openclaw/openclaw/pull/114362)
- 入口启动失败后清理Slack和Feishu [#115295](https://github.com/openclaw/openclaw/pull/115295)
- 保留仅消息工具心跳回复私有 [#115629](https://github.com/openclaw/openclaw/pull/115629)
- 将代理完成公告传送到直接消息会话 [#115811](https://github.com/openclaw/openclaw/pull/115811)
- Preserve TTS 在音频生成失败时应答 [#118690](https://github.com/openclaw/openclaw/pull/118690)
- 更正Doctor修复报告中的陈旧插件ID [#119202](https://github.com/openclaw/openclaw/pull/119202)
- 删除非活动进度渲染设置 [#122927](https://github.com/openclaw/openclaw/pull/122927)
- 解决旧通道生命周期的失败入口声明 [#124016](https://github.com/openclaw/openclaw/pull/124016)
- 避免消息重新传递时后续队列为空 [#124723](https://github.com/openclaw/openclaw/pull/124723)
- 暴露出站队列和批次准备失败 [#124756](https://github.com/openclaw/openclaw/pull/124756)
- 始终拒绝腐败审批反应目标 [#124942](https://github.com/openclaw/openclaw/pull/124942)
- 合并重叠通道输入开始 [#127006](https://github.com/openclaw/openclaw/pull/127006)
- 清理失败的媒体暂存工件 [#127092](https://github.com/openclaw/openclaw/pull/127092)
- fix（网关）：删除通道插件后清除过时凭证警告 [#127503](https://github.com/openclaw/openclaw/pull/127503)
- fix（cron）：时钟回滚后恢复自动化故障警报[#127731](https://github.com/openclaw/openclaw/pull/127731)
- fix（代理）：在排队的后续[#128272](https://github.com/openclaw/openclaw/pull/128272)中保留图像附件所有权
- fix（出站）：空白媒体列表静默删除有效频道附件 [#128372](https://github.com/openclaw/openclaw/pull/128372)
- fix（网关）：已删除的通道插件在重新加载后仍保持错误状态 [#128503](https://github.com/openclaw/openclaw/pull/128503)
- fix（回复）：保留不同的流式位置消息[#128846](https://github.com/openclaw/openclaw/pull/128846)
- fix（媒体）：保留透明图像附件的正确文件名[#128902](https://github.com/openclaw/openclaw/pull/128902)
- fix（cron）： 当系统时钟跳跃时保留 webhook 传递 [#129050](https://github.com/openclaw/openclaw/pull/129050)
- fix（回复）：保留每个混合显式和解析的附件[#129159](https://github.com/openclaw/openclaw/pull/129159)
- fix（频道）：保持仅标题卡可见且媒体计数准确 [#129193](https://github.com/openclaw/openclaw/pull/129193)
- fix（回复）：隐藏消息中格式错误的回复指令 [#129367](https://github.com/openclaw/openclaw/pull/129367)
- fix（channels）：遵守支持的帐户回复线程策略 [#129679](https://github.com/openclaw/openclaw/pull/129679)
- fix：保留数据 URL 附件文件扩展名 [#130625](https://github.com/openclaw/openclaw/pull/130625)
- fix：在附件操作 [#130714](https://github.com/openclaw/openclaw/pull/130714) 上保留显式 MIME 类型
- 允许零禁用群聊历史记录 [#65359](https://github.com/openclaw/openclaw/pull/65359)

**文档**

- 文档通道入口和提及保证 [#111069](https://github.com/openclaw/openclaw/pull/111069)
- 修复通道发现并防止文档漂移 [#118106](https://github.com/openclaw/openclaw/pull/118106)
- docs（channels）：范围implicitMentions覆盖读取它们的通道（#119320） [834fc44](https://github.com/openclaw/openclaw/commit/834fc44)
- 修复Discord、Slack和Google Chat配置示例[#106188](https://github.com/openclaw/openclaw/pull/106188)
- 文档持久入口重放防护分层 [#109799](https://github.com/openclaw/openclaw/pull/109799)
- 正确的心跳可见性配置示例 [#118827](https://github.com/openclaw/openclaw/pull/118827)
- 完成进度工作计数器清理 [#125011](https://github.com/openclaw/openclaw/pull/125011)

</details>

</Accordion>

<Accordion title="Telegram">

在功能丰富的 [Telegram](/channels/telegram) 帐户上，客服人员可以发送本地详细信息、表格、清单、数学、地图、文件参考、位置、地点和兼容的圆形视频笔记。大型嵌套回复会在 Telegram 的限制内分页，并且拒绝的丰富结构会退回到完整的纯文本答案，而不是删除有用的部分。

忙碌的谈话也能更好地结合在一起。后续工作在活跃工作期间保持有序，已接受的更新可以在重新启动后恢复，放弃的交付声明停止冻结聊天，并且经过验证的公共民意调查活动返回到其开始的聊天或论坛主题。匿名民意调查仍然仅显示，引用的文本作为归因引用而不是活动指令到达代理。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 发送Telegram地点、场地和回合视频笔记[#105142](https://github.com/openclaw/openclaw/pull/105142)
- Emit 本机 Telegram 机器人 API 丰富消息块 [#107986](https://github.com/openclaw/openclaw/pull/107986)
- 使 Telegram 消息处理在活动轮次和重新启动之间持久 [#108924](https://github.com/openclaw/openclaw/pull/108924)
- Mark 持久 Telegram webhook 接受 [#104407](https://github.com/openclaw/openclaw/pull/104407)
- Render Markdown 在 Telegram 丰富消息中本地列出 [#113158](https://github.com/openclaw/openclaw/pull/113158)
- 默认日志中的 Surface Telegram 草稿流失败 [#111065](https://github.com/openclaw/openclaw/pull/111065)

**错误修复**

- 防止对话上下文中出现重复的 Telegram 回复 [#102469](https://github.com/openclaw/openclaw/pull/102469)
- 通过热重载和回退保留 Telegram 模型选择 [#103510](https://github.com/openclaw/openclaw/pull/103510)
- 防止Telegram消息重启后丢失 [#107288](https://github.com/openclaw/openclaw/pull/107288)
- 为每个运行时提供 Telegram 丰富格式的指导 [#108264](https://github.com/openclaw/openclaw/pull/108264)
- 清理 Telegram 媒体字幕并保留可重试更新 [#111855](https://github.com/openclaw/openclaw/pull/111855)
- 当模型添加位置时发送 Telegram 回复 [#113347](https://github.com/openclaw/openclaw/pull/113347)
- 通过递归传输限制对 Telegram 丰富消息进行分页 [#117020](https://github.com/openclaw/openclaw/pull/117020)
- 在 Telegram 代理输入中保留引用消息属性 [#117021](https://github.com/openclaw/openclaw/pull/117021)
- 在正确的会话中保持并发 Telegram 更新 [#117861](https://github.com/openclaw/openclaw/pull/117861)
- 防止来自阻止组的停滞 Telegram 响应 [#118144](https://github.com/openclaw/openclaw/pull/118144)
- 恢复定向Telegram空模型回复后转向[#118305](https://github.com/openclaw/openclaw/pull/118305)
- 使配置的 Telegram 命令在菜单限制下可见 [#119717](https://github.com/openclaw/openclaw/pull/119717)
- 将 Telegram 的反应和投票答案保留在其原始主题中 [#121231](https://github.com/openclaw/openclaw/pull/121231)
- 在生产 Docker 映像中保留 Telegram 依赖项 [#125580](https://github.com/openclaw/openclaw/pull/125580)
- fix（电报）：使ask_user控制本机可靠的[#130262](https://github.com/openclaw/openclaw/pull/130262)
- 将 Telegram 公众投票投票发送到发起代理会话 [#95830](https://github.com/openclaw/openclaw/pull/95830)
- 关闭失败后继续 Telegram Webhook 清理 [#100998](https://github.com/openclaw/openclaw/pull/100998)
- 将机器人自己的 Telegram 重述消息标记为自己 [#102507](https://github.com/openclaw/openclaw/pull/102507)
- 恢复停止的 Telegram 媒体下载而不阻止后续消息 [#103020](https://github.com/openclaw/openclaw/pull/103020)
- 保留活动状态 Telegram 在新消息到达时转为 [#103664](https://github.com/openclaw/openclaw/pull/103664)
- 哈登耐用 Telegram 重播采用 [#103695](https://github.com/openclaw/openclaw/pull/103695)
- Protect采用Telegram从运输取代[#103952](https://github.com/openclaw/openclaw/pull/103952)
- 在过时的轮换之前保留更新的 Telegram 请求 [#103965](https://github.com/openclaw/openclaw/pull/103965)
- 防止空 Telegram 发送计划摘要 [#104111](https://github.com/openclaw/openclaw/pull/104111)
- Bound Telegram 用户名查找超时 [#104289](https://github.com/openclaw/openclaw/pull/104289)
- 防止未列出的 Telegram API 呼叫拖延交付 [#104526](https://github.com/openclaw/openclaw/pull/104526)
- 在字边界上保留流式传输的 Telegram 页面 [#104608](https://github.com/openclaw/openclaw/pull/104608)
- 在 Telegram 中保留创作的文件样式链接 [#105911](https://github.com/openclaw/openclaw/pull/105911)
- Bound 停止 Telegram 诊断响应读取 [#106035](https://github.com/openclaw/openclaw/pull/106035)
- 报告降级 Telegram 内联控件 [#107105](https://github.com/openclaw/openclaw/pull/107105)
- Stop Doctor重复过期Telegram缓存警告[#108259](https://github.com/openclaw/openclaw/pull/108259)
- 在前言 [#108394](https://github.com/openclaw/openclaw/pull/108394) 下方保持 Telegram 工具进度可见
- 在主动发送中保留 Telegram 字边界 [#108801](https://github.com/openclaw/openclaw/pull/108801)
- 在去抖批次中保留 Telegram 正向原点 [#108985](https://github.com/openclaw/openclaw/pull/108985)
- 重试 Telegram 安全地更新偏移持久性 [#110068](https://github.com/openclaw/openclaw/pull/110068)
- 在升级期间恢复混合大小写 Telegram 允许列表 [#110415](https://github.com/openclaw/openclaw/pull/110415)
- 防止Telegram空民意调查CPU纺纱[#111063](https://github.com/openclaw/openclaw/pull/111063)
- 回退到 DM 外部 Telegram Web 应用程序的链接 [#111116](https://github.com/openclaw/openclaw/pull/111116)
- 保留论坛主题中的Telegram消息突变[#112794](https://github.com/openclaw/openclaw/pull/112794)
- 规范化 Telegram 一般主题对话 [#113063](https://github.com/openclaw/openclaw/pull/113063)
- 线轴隔离 Telegram 在推进其偏移量之前更新 [#113368](https://github.com/openclaw/openclaw/pull/113368)
- 防止 Telegram 跨机器人身份的重复数据删除冲突 [#113667](https://github.com/openclaw/openclaw/pull/113667)
- Honor 在流媒体 Telegram 回复上禁用链接预览 [#114125](https://github.com/openclaw/openclaw/pull/114125)
- fix（电报）：保持长模型名称可选 [#114472](https://github.com/openclaw/openclaw/pull/114472)
- 恢复排队 Telegram 回复的进度 [#114590](https://github.com/openclaw/openclaw/pull/114590)
- 在规范提及处理中保留未提及的 Telegram 组文本 [#114591](https://github.com/openclaw/openclaw/pull/114591)
- 防止未修改的 Telegram 回复在出站挂钩之前闪烁 [#114822](https://github.com/openclaw/openclaw/pull/114822)
- 将 Telegram 相册集中保存在一个代理中 [#115401](https://github.com/openclaw/openclaw/pull/115401)
- 网关重启后保持Telegram DM回复工作 [#115434](https://github.com/openclaw/openclaw/pull/115434)
- 防止虚假 Telegram 空响应回退 [#115588](https://github.com/openclaw/openclaw/pull/115588)
- Keep Telegram 重试检查是否丢弃消息 [#115613](https://github.com/openclaw/openclaw/pull/115613)
- 停止重试无法访问的收件人的 Telegram 更新 [#115640](https://github.com/openclaw/openclaw/pull/115640)
- 在其原始论坛主题中保留 Telegram 反应 [#116380](https://github.com/openclaw/openclaw/pull/116380)
- 保留 Telegram 回调操作所有权 [#116383](https://github.com/openclaw/openclaw/pull/116383)
- 通过长时间和定向任务保持 Telegram 键入活动 [#116721](https://github.com/openclaw/openclaw/pull/116721)
- 验证本机设置命令并保留 Telegram 结果 [#116773](https://github.com/openclaw/openclaw/pull/116773)
- 保留 Telegram 编辑预览和对话上下文 [#116818](https://github.com/openclaw/openclaw/pull/116818)
- 保留 Telegram 专辑标题、重试和主题路由 [#116827](https://github.com/openclaw/openclaw/pull/116827)
- 恢复拒绝的 Telegram 照片并保留媒体文件名 [#116886](https://github.com/openclaw/openclaw/pull/116886)
- 保留附加到 Telegram 媒体的有效格式化标题 [#116892](https://github.com/openclaw/openclaw/pull/116892)
- 保留 Telegram 轮询和入站格式 [#116898](https://github.com/openclaw/openclaw/pull/116898)
- 长轮询前确认Telegram轮询[#116970](https://github.com/openclaw/openclaw/pull/116970)
- 让托管的Telegram网关及时退出 [#116978](https://github.com/openclaw/openclaw/pull/116978)
- 允许清除 Telegram 媒体字幕 [#116984](https://github.com/openclaw/openclaw/pull/116984)
- Honor Telegram DM 端到端历史限制 [#116985](https://github.com/openclaw/openclaw/pull/116985)
- 修复主题限定目标的 Telegram 突变 [#117001](https://github.com/openclaw/openclaw/pull/117001)
- 当 Telegram 阻止语音消息时回退到文本 [#117022](https://github.com/openclaw/openclaw/pull/117022)
- 随着保存的对话的增长，保持 Telegram 线程绑定回复的响应 [#117081](https://github.com/openclaw/openclaw/pull/117081)
- Honor Telegram 下载前群组媒体摄取跳过 [#117537](https://github.com/openclaw/openclaw/pull/117537)
- 运行失败时保留 Telegram 部分回复 [#117603](https://github.com/openclaw/openclaw/pull/117603)
- 停止重试永久性 Telegram 媒体查找失败 [#117798](https://github.com/openclaw/openclaw/pull/117798)
- 防止重复 Telegram 入库交货结算 [#117812](https://github.com/openclaw/openclaw/pull/117812)
- 在多部分送达收据中保留 Telegram 介质 [#117863](https://github.com/openclaw/openclaw/pull/117863)
- fix（电报）：保持Unicode表列对齐[#117890](https://github.com/openclaw/openclaw/pull/117890)
- 跨按钮布局保留规范的 Telegram 问题选择 [#118049](https://github.com/openclaw/openclaw/pull/118049)
- 拒绝退役的 Telegram 按钮输入，带恢复指导 [#118112](https://github.com/openclaw/openclaw/pull/118112)
- Preserve Telegram 预工具注释 [#118287](https://github.com/openclaw/openclaw/pull/118287)
- 防止 Telegram 持久入口重播循环 [#118357](https://github.com/openclaw/openclaw/pull/118357)
- 在[#118548](https://github.com/openclaw/openclaw/pull/118548)状态下显示有效的Telegram通道模型
- 在拒绝块后保留剩余的长 Telegram 回复 [#119080](https://github.com/openclaw/openclaw/pull/119080)
- 拒绝 Telegram Webhook 和运行状况路由冲突 [#119268](https://github.com/openclaw/openclaw/pull/119268)
- 当 Telegram 斜杠命令最终失败时显示回退 [#119530](https://github.com/openclaw/openclaw/pull/119530)
- 恢复每个帐户 Telegram 回复模式 [#120527](https://github.com/openclaw/openclaw/pull/120527)
- 提供程序故障后保留可见的 Telegram 草稿恢复 [#120626](https://github.com/openclaw/openclaw/pull/120626)
- 重复使用引用回复中保存的 Telegram 照片 [#120647](https://github.com/openclaw/openclaw/pull/120647)
- 在媒体超时后保持 Telegram 聊天响应 [#120706](https://github.com/openclaw/openclaw/pull/120706)
- 随着会话历史记录的增长，保持 Telegram 消息路由快速 [#120774](https://github.com/openclaw/openclaw/pull/120774)
- Honor Telegram 看门狗中的轮询冷却时间 [#120841](https://github.com/openclaw/openclaw/pull/120841)
- 跨账户应用根Telegram组规则[#120880](https://github.com/openclaw/openclaw/pull/120880)
- Clear 删除了 Telegram 命令菜单区域设置 [#120885](https://github.com/openclaw/openclaw/pull/120885)
- 保留 Telegram 频道 DM 在其主题 [#120916](https://github.com/openclaw/openclaw/pull/120916) 中回复
- 恢复 Telegram 源运行主机上的 Doctor 修复 [#120954](https://github.com/openclaw/openclaw/pull/120954)
- 当草图不可用时保持 Telegram 工具进度瞬时 [#121048](https://github.com/openclaw/openclaw/pull/121048)
- 验证 Telegram 命令菜单语言代码并修复区域设置状态 [#121098](https://github.com/openclaw/openclaw/pull/121098)
- 保留Telegram通道-DM主题身份[#121117](https://github.com/openclaw/openclaw/pull/121117)
- 以稳定的规范顺序保持 Telegram 命令菜单 [#121239](https://github.com/openclaw/openclaw/pull/121239)
- 保持禁用 Telegram 在详细模式下隐藏进度 [#121395](https://github.com/openclaw/openclaw/pull/121395)
- 忽略禁用论坛主题中的 Telegram 命令 [#121411](https://github.com/openclaw/openclaw/pull/121411)
- 在延迟媒体传送失败时保留最终确定的 Telegram 预览 [#121903](https://github.com/openclaw/openclaw/pull/121903)
- 跨批处理消息保留 Telegram 回复上下文 [#121907](https://github.com/openclaw/openclaw/pull/121907)
- 保持 Telegram 草稿和最终消息后备行为一致 [#121990](https://github.com/openclaw/openclaw/pull/121990)
- 防止在抑制批准后出现虚假 Telegram 回退 [#122091](https://github.com/openclaw/openclaw/pull/122091)
- 将 Telegram 实时位置更新暴露给插件挂钩 [#122185](https://github.com/openclaw/openclaw/pull/122185)
- 安全重试 Telegram 发送证明未启动的 [#122741](https://github.com/openclaw/openclaw/pull/122741)
- fix（电报）：重新排队中止的入口声明 [#122864](https://github.com/openclaw/openclaw/pull/122864)
- 防止多代理启动时出现错误的 Telegram 迁移阻止程序 [#122877](https://github.com/openclaw/openclaw/pull/122877)
- 使用显式多代理帐户绑定正确启动 Telegram [#123029](https://github.com/openclaw/openclaw/pull/123029)
- fix（channels/turn）：清除错误路径上的待处理历史记录[#123193](https://github.com/openclaw/openclaw/pull/123193)
- 保留Telegram裸-URL查询分隔符[#123230](https://github.com/openclaw/openclaw/pull/123230)
- 重试放弃的 Telegram 消息而不是丢弃它们 [#123528](https://github.com/openclaw/openclaw/pull/123528)
- 保留取消的 Telegram 传输健康状况之外的请求 [#124588](https://github.com/openclaw/openclaw/pull/124588)
- 将 Telegram 目标命令保留在正确的路由通道上 [#125195](https://github.com/openclaw/openclaw/pull/125195)
- 在正确的私信主题中保留 Telegram 回复 [#126207](https://github.com/openclaw/openclaw/pull/126207)
- 最终确定流式传输的 Telegram 问题，无需重复回退 [#126248](https://github.com/openclaw/openclaw/pull/126248)
- 保持环境 Telegram 房间事件静音 [#126527](https://github.com/openclaw/openclaw/pull/126527)
- 防止终端问题传递失败后重复回复 [#126603](https://github.com/openclaw/openclaw/pull/126603)
- 最终工具发送 [#126625](https://github.com/openclaw/openclaw/pull/126625) 后防止重复 Telegram 回复
- fix（电报）：通过论坛标志缓存解决常规主题会话初始化重试循环[#126656](https://github.com/openclaw/openclaw/pull/126656)
- 使常见的 Telegram 表情符号反应可靠 [#126739](https://github.com/openclaw/openclaw/pull/126739)
- 保持Telegram直接主题自历史隔离[#127050](https://github.com/openclaw/openclaw/pull/127050)
- fix（电报）：防止附件传送失败后重复回复[#128181](https://github.com/openclaw/openclaw/pull/128181)
- fix（电报）：保留入站链接目标和标签 [#128297](https://github.com/openclaw/openclaw/pull/128297)
- fix（电报）：显示媒体标题问题的回答状态 [#128526](https://github.com/openclaw/openclaw/pull/128526)
- fix（cron）：在失败消息线程之外传递失败警报 [#128610](https://github.com/openclaw/openclaw/pull/128610)
- fix（电报）：保留已交付的丰富后备回复块[#128622](https://github.com/openclaw/openclaw/pull/128622)
- fix（cron）：脚本通知到达错误的代理或主题 [#128856](https://github.com/openclaw/openclaw/pull/128856)
- fix（回复）：通过块合并保留显式路由 [#129271](https://github.com/openclaw/openclaw/pull/129271)
- fix（电报）：保留丰富的消息块限制[#129292](https://github.com/openclaw/openclaw/pull/129292)
- fix（电报）：仅消息代理运行失败时显示错误 [#129311](https://github.com/openclaw/openclaw/pull/129311)
- fix（电报）：预定反应针对错误消息[#129932](https://github.com/openclaw/openclaw/pull/129932)
- fix（telegram）：防止编辑富消息时被截断 [#130526](https://github.com/openclaw/openclaw/pull/130526)
- fix（电报）：防止交付观察者失败后重复发送[#130643](https://github.com/openclaw/openclaw/pull/130643)
- fix（电报）：面对代理的身体表面介质故障[#130849](https://github.com/openclaw/openclaw/pull/130849)
- fix（电报）：将 Markdown 列表保留在详细信息块 [#131078](https://github.com/openclaw/openclaw/pull/131078) 中
- 修复（错误）：在 beta.3 [#132309](https://github.com/openclaw/openclaw/pull/132309) 上成功进行终端传送后，电报会话仍保持运行约 15 分钟
- fix：当提供商转向失败时保留可见的部分回复 [#132538](https://github.com/openclaw/openclaw/pull/132538)
- fix（电报）：在sendMessage操作结果中保留持久收据[#133083](https://github.com/openclaw/openclaw/pull/133083)
- fix（电报）：遵循配置的模型运行时[#133125](https://github.com/openclaw/openclaw/pull/133125)
- fix（markdown）：在频道回复中保留重叠格式 [#133161](https://github.com/openclaw/openclaw/pull/133161)
- 发送 Telegram 最终模式 TTS 作为一个带标题的语音注释 [#83988](https://github.com/openclaw/openclaw/pull/83988)
- 防止错误 Telegram 时钟更改后轮询停止 [#86541](https://github.com/openclaw/openclaw/pull/86541)
- 当呈现的空文本被拒绝时保留 Telegram 传送 [#88810](https://github.com/openclaw/openclaw/pull/88810)
- 在发送消息账本中记录自动回复Telegram [#92420](https://github.com/openclaw/openclaw/pull/92420)
- 验证Telegram消息落在所请求的主题[#97361](https://github.com/openclaw/openclaw/pull/97361)中
- 清理拆分 Telegram 推理预览 [#97828](https://github.com/openclaw/openclaw/pull/97828)
- fix（电报）：尊重流式回复的人为延迟（#69022）[15826de](https://github.com/openclaw/openclaw/commit/15826de)
- Keep Telegram DM 在表情符号边界处有效的主题标签 [#101781](https://github.com/openclaw/openclaw/pull/101781)
- 缓存驱逐后释放陈旧的 Telegram 连接 [#101783](https://github.com/openclaw/openclaw/pull/101783)
- 保留 Telegram 原始更新日志在表情符号边界处有效 [#102567](https://github.com/openclaw/openclaw/pull/102567)
- 当 HTML 格式化开销填充一个块时保留 Telegram 传送 [#102999](https://github.com/openclaw/openclaw/pull/102999)
- 在长 Telegram 模型标签中保持表情符号完整 [#104037](https://github.com/openclaw/openclaw/pull/104037)
- 允许 Telegram 轮询最多 12 个选项 [#104303](https://github.com/openclaw/openclaw/pull/104303)
- fix（电报）：在字边界上打破长HTML块，而不是在字中间[#104473](https://github.com/openclaw/openclaw/pull/104473)
- 将 Telegram 批准按钮保持在回调限制内 [#104942](https://github.com/openclaw/openclaw/pull/104942)
- 防止 Telegram 遗留迁移无操作循环 [#108744](https://github.com/openclaw/openclaw/pull/108744)
- 释放停止的 Telegram 查找连接 [#109007](https://github.com/openclaw/openclaw/pull/109007)
- 取消时立即停止Telegram启动探测 [#109604](https://github.com/openclaw/openclaw/pull/109604)
- fix（电报）：绑定无效的allowFrom警告重复数据删除与共享重复数据删除缓存[#109646](https://github.com/openclaw/openclaw/pull/109646)
- 使容量受限的Telegram状态迁移安全进行[#109679](https://github.com/openclaw/openclaw/pull/109679)
- 拒绝格式错误的 Telegram 表跨度 [#109962](https://github.com/openclaw/openclaw/pull/109962)
- 在直接聊天操作中保留 Telegram Web 应用程序按钮 [#111416](https://github.com/openclaw/openclaw/pull/111416)
- 接受 Telegram 论坛主题名称中的有效表情符号 [#111443](https://github.com/openclaw/openclaw/pull/111443)
- 统一媒体种类并修复Telegram回复图像标签[#112063](https://github.com/openclaw/openclaw/pull/112063)
- 正确的Telegram 401恢复指导[#112492](https://github.com/openclaw/openclaw/pull/112492)
- Render 正确创作了 Telegram 日期和时间标签 [#112911](https://github.com/openclaw/openclaw/pull/112911)
- 报告最终确定 Telegram 预览发送到插件 [#116214](https://github.com/openclaw/openclaw/pull/116214)
- 重复数据删除 Claude CLI Telegram [#116350](https://github.com/openclaw/openclaw/pull/116350) 中的工具进度
- 在一条消息中保持排队 Telegram 工具进度 [#116685](https://github.com/openclaw/openclaw/pull/116685)
- 解释无效的 Telegram 队列参数，而不是报告模型失败 [#116726](https://github.com/openclaw/openclaw/pull/116726)
- 将 Telegram 交付与明确选择的主题 [#117229](https://github.com/openclaw/openclaw/pull/117229) 相关联
- Hide 已禁用 Telegram 从发现中发送操作 [#117241](https://github.com/openclaw/openclaw/pull/117241)
- 忽略发送给其他机器人的 Telegram 命令 [#118024](https://github.com/openclaw/openclaw/pull/118024)
- 在 Telegram 本机命令回复中保留 Markdown 表 [#118257](https://github.com/openclaw/openclaw/pull/118257)
- 正确分类 Telegram 介质大小故障 [#120757](https://github.com/openclaw/openclaw/pull/120757)
- 在启动失败后清理 Telegram Webhook 资源 [#120788](https://github.com/openclaw/openclaw/pull/120788)
- 在启动其工作程序之前获取Telegram轮询队列[#120800](https://github.com/openclaw/openclaw/pull/120800)
- 防止流式回复中出现重复的 Telegram 附件 [#121141](https://github.com/openclaw/openclaw/pull/121141)
- 在外向交货中保留结构化的 Telegram 控制 [#121428](https://github.com/openclaw/openclaw/pull/121428)
- 在写回期间保留 Telegram 直接消息主题 [#127010](https://github.com/openclaw/openclaw/pull/127010)
- fix（电报）：保留精确的内联回调操作值[#127735](https://github.com/openclaw/openclaw/pull/127735)
- fix（电报）：通过一位冻结进度所有者 [#128259](https://github.com/openclaw/openclaw/pull/128259) 发送评论
- fix（telegram）：通过所属账户删除业务回调消息[#128358](https://github.com/openclaw/openclaw/pull/128358)
- fix（电报）：描述反应表情符号语法[#129080](https://github.com/openclaw/openclaw/pull/129080)
- fix（电报）：去重状态迁移目标[#129096](https://github.com/openclaw/openclaw/pull/129096)
- fix（电报）：在选定的回复引号中保留精确的空格[#129254](https://github.com/openclaw/openclaw/pull/129254)
- fix（电报）：当所需引脚出现故障时保留发送的回复 [#129342](https://github.com/openclaw/openclaw/pull/129342)
- fix（电报）：允许民意调查持续长达 7 天 [#129461](https://github.com/openclaw/openclaw/pull/129461)
- fix（cli）：创建线程时遵循前缀通道目标 [#129671](https://github.com/openclaw/openclaw/pull/129671)
- fix（电报）：显示无按钮询问用户提示 [#130200](https://github.com/openclaw/openclaw/pull/130200)
- fix（电报）：历史声明已拒绝语音附件已发送 [#130399](https://github.com/openclaw/openclaw/pull/130399)
- fix（电报）：在入站代码中保留文字反引号[#130800](https://github.com/openclaw/openclaw/pull/130800)
- fix（电报）：在审核中保留论坛准入身份[#131293](https://github.com/openclaw/openclaw/pull/131293)
- 使用后清除Telegram通用回调按钮[#90169](https://github.com/openclaw/openclaw/pull/90169)
- fix（电报）：接受论坛主题操作的 threadName [#99505](https://github.com/openclaw/openclaw/pull/99505)

</details>

</Accordion>

<Accordion title="Discord">

[Discord](/channels/discord) 现在支持选择加入 [Activities](/channels/discord-activities)，直接在 Discord 内部打开配置的 OpenClaw 小部件。语音代理还可以查看房间里的人，对一对一和群组对话使用不同的唤醒名称规则，并且可以选择仅在有人在场时加入。活动需要显式通道配置、Discord 客户端密钥和公共 HTTPS 路由；占用房间自动加入是一个单独的选项，不会更改现有的始终开启默认设置。

消息重试现在重用其身份以减少重复，交互回复按顺序解决，过时的回复上下文被丢弃，并且重复的恢复失败可以恢复，而无需重新启动所有 OpenClaw。论坛线程发送仍不确定何时重试可能会产生重复。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 叙述进度草稿并附上Discord活动收据[#103463](https://github.com/openclaw/openclaw/pull/103463)
- 让 Discord 语音代理了解通道参与者 [#107004](https://github.com/openclaw/openclaw/pull/107004)
- 添加选择加入 Discord 活动小部件 [#107442](https://github.com/openclaw/openclaw/pull/107442)
- 将 Discord 在线到达代理发送至代理 [#107451](https://github.com/openclaw/openclaw/pull/107451)
- 使 Discord 语音唤醒名称适应房间大小 [#108696](https://github.com/openclaw/openclaw/pull/108696)
- 支持没有消息内容意图的 Discord 机器人 [#116962](https://github.com/openclaw/openclaw/pull/116962)
- 占用时自动加入 Discord 语音房间 [#125974](https://github.com/openclaw/openclaw/pull/125974)
- 通过 Discord 活动呈现规范小部件 [#126294](https://github.com/openclaw/openclaw/pull/126294)
- 在 Discord 中显示后台子代理进度 [#95604](https://github.com/openclaw/openclaw/pull/95604)

**错误修复**

- 在重复网关恢复失败后恢复 Discord [#103596](https://github.com/openclaw/openclaw/pull/103596)
- 在不明确的重试期间防止重复的 Discord 消息 [#103867](https://github.com/openclaw/openclaw/pull/103867)
- 防止 Discord 使用不相关的过时上下文进行回复 [#114716](https://github.com/openclaw/openclaw/pull/114716)
- 使 Discord 交互响应可重试且竞争安全 [#117417](https://github.com/openclaw/openclaw/pull/117417)
- 使 Discord 语音会话遵循最新的生命周期事件 [#122479](https://github.com/openclaw/openclaw/pull/122479)
- fix（discord）：传递仅嵌入和仅组件消息 [#128152](https://github.com/openclaw/openclaw/pull/128152)
- fix（discord）：防止语音回复在播放过程中中断 [#130346](https://github.com/openclaw/openclaw/pull/130346)
- 保持 Discord 网关重新启动免受后期错误 [#101617](https://github.com/openclaw/openclaw/pull/101617)
- 重置 Discord 排队轮次之间的进度草稿 [#102341](https://github.com/openclaw/openclaw/pull/102341)
- Stream Discord 分段上传，无需急切缓冲 [#102972](https://github.com/openclaw/openclaw/pull/102972)
- 跨推理块保留 Discord 代码格式 [#103166](https://github.com/openclaw/openclaw/pull/103166)
- Honor Discord 父通道线程存档设置 [#103413](https://github.com/openclaw/openclaw/pull/103413)
- 保留 Discord 在表情符号边界处有效的线程角色名称 [#103543](https://github.com/openclaw/openclaw/pull/103543)
- 防止会话冲突期间静默 Discord 消息丢失 [#103562](https://github.com/openclaw/openclaw/pull/103562)
- 停止无限期挂起的 Discord 目录查找 [#104290](https://github.com/openclaw/openclaw/pull/104290)
- 热重载后刷新Discord模型选择器状态[#104635](https://github.com/openclaw/openclaw/pull/104635)
- 在瞬时故障后重试 Discord 预览清理 [#104893](https://github.com/openclaw/openclaw/pull/104893)
- 省略无效的 Discord 组件强调色 [#105387](https://github.com/openclaw/openclaw/pull/105387)
- Bound 停滞 Discord 状态响应读取 [#106036](https://github.com/openclaw/openclaw/pull/106036)
- H荣誉 Discord 在语音对话中命令所有者 [#106155](https://github.com/openclaw/openclaw/pull/106155)
- 在省略引用消息时保留 Discord 回复上下文 [#106176](https://github.com/openclaw/openclaw/pull/106176)
- 保留 Discord 侦听器插槽，直到工作实际解决 [#106398](https://github.com/openclaw/openclaw/pull/106398)
- 默认情况下仅显示代理撰写状态 Discord 进度草稿 [#107338](https://github.com/openclaw/openclaw/pull/107338)
- 重新连接后防止 Discord 存在唤醒洪流 [#107969](https://github.com/openclaw/openclaw/pull/107969)
- 限制 Discord 对频道观众的存在问候语 [#108448](https://github.com/openclaw/openclaw/pull/108448)
- 将代理答复传送到指定的 Discord 频道 [#108584](https://github.com/openclaw/openclaw/pull/108584)
- 保留 CLI- 支持的插件工具 [#108628](https://github.com/openclaw/openclaw/pull/108628) 的 Discord 论坛目标
- Discord 活动从打包网关正确加载 [#108725](https://github.com/openclaw/openclaw/pull/108725)
- 当发布ID缺失时打开最新的Discord活动[#108817](https://github.com/openclaw/openclaw/pull/108817)
- Stop 停止 Discord Webhook 无限期挂起发送 [#109076](https://github.com/openclaw/openclaw/pull/109076)
- 防止 Discord 生命周期侦听器在重新启动时构建 [#109108](https://github.com/openclaw/openclaw/pull/109108)
- Resolve Discord 在多小部件渠道中启动活动 [#109194](https://github.com/openclaw/openclaw/pull/109194)
- 在消息限制内保持较长的 Discord 代码回复 [#110148](https://github.com/openclaw/openclaw/pull/110148)
- 在调度崩溃时保留 Discord 消息 [#110274](https://github.com/openclaw/openclaw/pull/110274)
- 按渠道受众授权 Discord 小部件 [#110522](https://github.com/openclaw/openclaw/pull/110522)
- Stop 停止 Discord 挂起的活动令牌上传 [#110667](https://github.com/openclaw/openclaw/pull/110667)
- fix（不和谐）：持续的网关突发停止增长内存 [#110954](https://github.com/openclaw/openclaw/pull/110954)
- 发送成功后关闭Discord语音上传套接字[#111269](https://github.com/openclaw/openclaw/pull/111269)
- 从停滞的网关响应中恢复 Discord 活动小部件 [#111380](https://github.com/openclaw/openclaw/pull/111380)
- 在详细进度期间保持 Discord 工具活动可见 [#111947](https://github.com/openclaw/openclaw/pull/111947)
- 保留 Discord 粗体和 Mattermost 本机表 [#113037](https://github.com/openclaw/openclaw/pull/113037)
- Migrate 在插件聚合之前发布了 Discord DM 配置 [#113280](https://github.com/openclaw/openclaw/pull/113280)
- 按发件人可见性筛选 Discord 待处理历史记录 [#113407](https://github.com/openclaw/openclaw/pull/113407)
- 当 Discord 白名单仍允许每个成员时发出警告 [#113414](https://github.com/openclaw/openclaw/pull/113414)
- 保留 Discord 附件内容类型 [#114460](https://github.com/openclaw/openclaw/pull/114460)
- 防止 Discord 预览暴露预挂接回复 [#114904](https://github.com/openclaw/openclaw/pull/114904)
- 将 Discord 推理回复保持在消息限制内 [#115092](https://github.com/openclaw/openclaw/pull/115092)
- 需要请求者身份才能执行特权 Discord 工具操作 [#115260](https://github.com/openclaw/openclaw/pull/115260)
- 拒绝 Discord API 响应中格式错误的 UTF-8 [#115918](https://github.com/openclaw/openclaw/pull/115918)
- 保留 Discord 活动收据以及采用的线程回复 [#116119](https://github.com/openclaw/openclaw/pull/116119)
- Preserve Discord webhook 超时错误 [#116155](https://github.com/openclaw/openclaw/pull/116155)
- 将 Discord 论坛媒体保留在一个线程中并保留送达收据 [#116750](https://github.com/openclaw/openclaw/pull/116750)
- 仅在安全时重试 Discord Webhooks 和反应 [#116821](https://github.com/openclaw/openclaw/pull/116821)
- 立即清理已删除的Discord线程 [#116823](https://github.com/openclaw/openclaw/pull/116823)
- 防止重复 Discord 语音消息回退 [#117127](https://github.com/openclaw/openclaw/pull/117127)
- 以安全块的形式交付长 Discord 线程启动器 [#117354](https://github.com/openclaw/openclaw/pull/117354)
- Discord 结算失败后继续进行排队消息清理 [#117524](https://github.com/openclaw/openclaw/pull/117524)
- 恢复 Discord 工作区语音和线程附件 [#117767](https://github.com/openclaw/openclaw/pull/117767)
- Preserve 部分交付失败后接受 Discord 回复 [#118354](https://github.com/openclaw/openclaw/pull/118354)
- 当 Discord 斜杠命令决赛失败时显示私人警告 [#118545](https://github.com/openclaw/openclaw/pull/118545)
- 报告变暖 Discord 消息索引而不是错误成功 [#118573](https://github.com/openclaw/openclaw/pull/118573)
- 交互确认后保留 Discord 回复隐私 [#118611](https://github.com/openclaw/openclaw/pull/118611)
- Bound 在 Discord 实时语音中保留语音 [#119250](https://github.com/openclaw/openclaw/pull/119250)
- 保留创作的Discord组件订单[#119506](https://github.com/openclaw/openclaw/pull/119506)
- fix（discord）：保留 MIME 组件上传扩展 [#119671](https://github.com/openclaw/openclaw/pull/119671)
- 重置所有路由代理之间的 Discord 线程会话 [#120259](https://github.com/openclaw/openclaw/pull/120259)
- Surface 失败 Discord 附件下载 [#120269](https://github.com/openclaw/openclaw/pull/120269)
- Make Discord 进度起草明确选择加入 [#120376](https://github.com/openclaw/openclaw/pull/120376)
- 跨服务器删除 Discord 目录用户的重复数据 [#120797](https://github.com/openclaw/openclaw/pull/120797)
- 将多部分 Discord 论坛回复保留在一个线程中 [#120857](https://github.com/openclaw/openclaw/pull/120857)
- 保留重复的Discord交互动作[#121155](https://github.com/openclaw/openclaw/pull/121155)
- 在一个线程中保留Discord论坛批量回复[#121165](https://github.com/openclaw/openclaw/pull/121165)
- 重试耗尽并取消后解锁 Discord 消息通道 [#122878](https://github.com/openclaw/openclaw/pull/122878)
- 与右扬声器保持重叠 Discord 语音转动 [#123243](https://github.com/openclaw/openclaw/pull/123243)
- fix（discord）：将 websocket 握手截止时间移至共享网关客户端选项 [#123414](https://github.com/openclaw/openclaw/pull/123414)
- 停止 Discord 离开会话后语音回复 [#124030](https://github.com/openclaw/openclaw/pull/124030)
- 保持稳定 Discord DM 配置可升级 [#125359](https://github.com/openclaw/openclaw/pull/125359)
- Clean 流式传输 Discord 语音并报告真实回退 [#125686](https://github.com/openclaw/openclaw/pull/125686)
- Route Discord 通过规范传递进行轮询 [#126250](https://github.com/openclaw/openclaw/pull/126250)
- 保留每个 Discord 消息嵌入的文本 [#126752](https://github.com/openclaw/openclaw/pull/126752)
- fix（不和谐）：解析配置的默认帐户的存在操作[#127748](https://github.com/openclaw/openclaw/pull/127748)
- fix（不和谐）：重新验证每次发送的传递权限 [#128357](https://github.com/openclaw/openclaw/pull/128357)
- fix（不和谐）：遵循显式组件附件文件名 [#128401](https://github.com/openclaw/openclaw/pull/128401)
- fix（discord）：解析字符串化消息组件[#128498](https://github.com/openclaw/openclaw/pull/128498)
- fix（不和谐）：失败的斜杠命令使用户观看永远无法解析的旋转器 [#128630](https://github.com/openclaw/openclaw/pull/128630)
- 修复（不和谐）：当普通反应已经存在时超级反应消失[#128649](https://github.com/openclaw/openclaw/pull/128649)
- fix（不和谐）：将论坛附件和收据保留在第一个线程中 [#128765](https://github.com/openclaw/openclaw/pull/128765)
- fix（不和谐）：保留每个按钮可重用设置 [#129068](https://github.com/openclaw/openclaw/pull/129068)
- fix（不和谐）：视频字幕从交货收据中消失 [#129134](https://github.com/openclaw/openclaw/pull/129134)
- refactor（discord）：集中语音资源生命周期 [#130415](https://github.com/openclaw/openclaw/pull/130415)
- fix（不和谐）：成功转向后避免空警告 [#131006](https://github.com/openclaw/openclaw/pull/131006)
- fix（转录本）：停止将替换的捕获报告为活动 [#131344](https://github.com/openclaw/openclaw/pull/131344)
- fix（discord）：实时提供商关闭后退出语音会话 [#131548](https://github.com/openclaw/openclaw/pull/131548)
- Hide 来自 Discord 草稿的失败工具进度 [#92517](https://github.com/openclaw/openclaw/pull/92517)
- fix（不和谐）：上传文件默默地删除标题（#124255）[60136ec](https://github.com/openclaw/openclaw/commit/60136ec)
- fix（不和谐）：带有base64缓冲区的上传文件失败，没有指向发送（#123748）[b9b6ca4](https://github.com/openclaw/openclaw/commit/b9b6ca4)
- 保留 Discord 编码文件名的视频字幕 [#101815](https://github.com/openclaw/openclaw/pull/101815)
- Bound Discord 具有特定于路由的超时的语音消息上传 [#102863](https://github.com/openclaw/openclaw/pull/102863)
- Honor Discord 隐式线程的论坛存档默认值 [#103033](https://github.com/openclaw/openclaw/pull/103033)
- Bound Discord PluralKit 查找延迟 [#104121](https://github.com/openclaw/openclaw/pull/104121)
- Keep Discord 语音故障诊断有界且可读 [#104230](https://github.com/openclaw/openclaw/pull/104230)
- fix（不和谐）：为受保护的网关元数据获取添加超时 [#104580](https://github.com/openclaw/openclaw/pull/104580)
- 在 Discord 语音记录中保留表情符号 [#104896](https://github.com/openclaw/openclaw/pull/104896)
- 保留 Discord 斜杠命令可在 100 个命令上限中部署 [#105280](https://github.com/openclaw/openclaw/pull/105280)
- 拒绝不支持的 Discord 线程存档持续时间过早 [#107610](https://github.com/openclaw/openclaw/pull/107610)
- 在 Discord 语音参与者标签中保留完整的表情符号 [#108278](https://github.com/openclaw/openclaw/pull/108278)
- 防止冗余 Discord 命令跨网关进程部署 [#108381](https://github.com/openclaw/openclaw/pull/108381)
- Stop Discord 打字闪烁，用于静音转弯 [#108449](https://github.com/openclaw/openclaw/pull/108449)
- Stop Discord READY 中止后立即重试等待 [#108561](https://github.com/openclaw/openclaw/pull/108561)
- Parse Discord 论坛线程小部件目标 [#108603](https://github.com/openclaw/openclaw/pull/108603)
- 保持 Unicode 模型选择器存储桶在 Discord [#109514](https://github.com/openclaw/openclaw/pull/109514) 中有效
- 发布失败 Discord 活动 OAuth 响应 [#109869](https://github.com/openclaw/openclaw/pull/109869)
- Stop Discord 工作取消时速率限制重试 [#109913](https://github.com/openclaw/openclaw/pull/109913)
- 跳过 PluralKit 普通 Discord 消息的查找 [#111617](https://github.com/openclaw/openclaw/pull/111617)
- 拒绝格式错误的 PluralKit 邮件信封 [#111712](https://github.com/openclaw/openclaw/pull/111712)
- 拒绝 Discord 状态探针中格式错误的 UTF-8 [#111734](https://github.com/openclaw/openclaw/pull/111734)
- Preserve Discord 机器人在水合作用失败时提及 [#111860](https://github.com/openclaw/openclaw/pull/111860)
- 保留Discord组件服务员消息所有权[#117492](https://github.com/openclaw/openclaw/pull/117492)
- 澄清空 Discord 消息搜索 [#118195](https://github.com/openclaw/openclaw/pull/118195)
- 使用专用恢复消息解释 Discord 表单打开失败 [#119657](https://github.com/openclaw/openclaw/pull/119657)
- fix（代理）：当CLI在启动块[#120737](https://github.com/openclaw/openclaw/pull/120737)上发送输入时保留工具参数
- 仅删除机器人自己的 Discord 反应 [#120785](https://github.com/openclaw/openclaw/pull/120785)
- fix（不和谐）：格式错误的网关 HELLO 框架杀死机器人的套接字侦听器 [#121468](https://github.com/openclaw/openclaw/pull/121468)
- Discord 角色交付回退时发出警告 [#124650](https://github.com/openclaw/openclaw/pull/124650)
- 错误回复后保留Discord进度草稿[#125140](https://github.com/openclaw/openclaw/pull/125140)
- 保留 Discord 仅媒体消息的回复上下文 [#126204](https://github.com/openclaw/openclaw/pull/126204)
- fix（不和谐）：文本回退后表面失败的语音注释[#127876](https://github.com/openclaw/openclaw/pull/127876)
- fix（不和谐）：拒绝确认后恢复问题收据[#128293](https://github.com/openclaw/openclaw/pull/128293)
- fix（不和谐）：刷新活动线程中过时的启动消息 [#128404](https://github.com/openclaw/openclaw/pull/128404)
- fix（discord）：一致地对公告线程进行分类 [#128568](https://github.com/openclaw/openclaw/pull/128568)
- fix（discord）：报告实际发送的消息[#128575](https://github.com/openclaw/openclaw/pull/128575)
- Cache 不可用 Discord 线程启动器 [#128653](https://github.com/openclaw/openclaw/pull/128653)
- fix（不和谐）：尊重新论坛帖子的明确名称 [#129294](https://github.com/openclaw/openclaw/pull/129294)
- fix（不和谐）：防止在未完成的代码中意外提及[#129338](https://github.com/openclaw/openclaw/pull/129338)
- fix（不和谐）：荣誉无声贴纸和线程回复交付[#129479](https://github.com/openclaw/openclaw/pull/129479)
- fix（不和谐）：通过经典降级保留组件附件名称[#129823](https://github.com/openclaw/openclaw/pull/129823)
- fix（不和谐）：保留贴纸交货收据[#129872](https://github.com/openclaw/openclaw/pull/129872)
- fix（不和谐）：重试草稿预览清理失败 [#130006](https://github.com/openclaw/openclaw/pull/130006)
- fix（不和谐）：删除暂时删除失败后的后期预览 [#130392](https://github.com/openclaw/openclaw/pull/130392)
- fix（不和谐）：在文本替换中保留提及标签文字[#130778](https://github.com/openclaw/openclaw/pull/130778)

**文档**

- 更正 Fly.io Discord 通道示例 [#102129](https://github.com/openclaw/openclaw/pull/102129)
- 纠正多代理示例中的 Discord 通道密钥 [#106201](https://github.com/openclaw/openclaw/pull/106201)
- 文档 Discord 许可名单和环境房间先决条件 [#113692](https://github.com/openclaw/openclaw/pull/113692)
- 删除已停用的 Discord 子代理进度运行时 [#117802](https://github.com/openclaw/openclaw/pull/117802)
- 从文档中删除已停用的 Discord 配置密钥 [#118216](https://github.com/openclaw/openclaw/pull/118216)

</details>

</Accordion>

<Accordion title="Slack">

[Slack](/channels/slack) 现在，从第一个状态到最终答案的进度都保留在一个对话中，将正在运行的评论、工作步骤和答案保留在一条流式消息中，除非操作员选择更紧凑的替代方案。图表和表格也可以本地呈现，当 Slack 无法使用本地形式时，可以保留可读文本。

一个组织安装的应用程序还可以为 Slack 授予的企业网格工作区提供服务，并将消息、操作、批准和主动交付绑定到正确的工作区。当前对话之外的目标需要显式工作区，未经验证的工作区身份的请求将被拒绝，并且中继模式和组织范围的表面仍然不受支持。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 支持 Slack Enterprise Grid 组织范围内的安装 [#102372](https://github.com/openclaw/openclaw/pull/102372)
- 使用本机 Slack 渲染添加便携式图表 [#102635](https://github.com/openclaw/openclaw/pull/102635)
- 添加便携式桌面演示块 [#103583](https://github.com/openclaw/openclaw/pull/103583)
- 添加 Slack 代理视图支持与助理视图兼容性 [#103895](https://github.com/openclaw/openclaw/pull/103895)
- Harden Slack 原生图​​表和表格交付 [#104539](https://github.com/openclaw/openclaw/pull/104539)
- 添加选择加入 Slack 存在问候语 [#108510](https://github.com/openclaw/openclaw/pull/108510)
- Slack 进度草案使用共享实时状态和最新的最终回复 [#109336](https://github.com/openclaw/openclaw/pull/109336)
- 添加选择加入 Slack 用户身份 [#109837](https://github.com/openclaw/openclaw/pull/109837)
- 将Slack进度更新转为最终回复[#119480](https://github.com/openclaw/openclaw/pull/119480)
- 添加工作区范围的 Slack 电网批准 [#120942](https://github.com/openclaw/openclaw/pull/120942)
- 添加工作区范围的 Slack 网格反应和引脚侦听器 [#120944](https://github.com/openclaw/openclaw/pull/120944)
- Route Slack 按工作区划分的企业网格操作和事件 [#121014](https://github.com/openclaw/openclaw/pull/121014)
- 添加自动工作区安全 Slack 企业网格支持 [#121373](https://github.com/openclaw/openclaw/pull/121373)
- 将实时 Slack 会话卡设为默认 [#122552](https://github.com/openclaw/openclaw/pull/122552)
- 将 Slack 进度统一为一条流式消息 [#122976](https://github.com/openclaw/openclaw/pull/122976)
- 仅添加紧凑注释 Slack 进度 [#126480](https://github.com/openclaw/openclaw/pull/126480)
- 接受 Slack 音频剪辑中的口头提及 [#103416](https://github.com/openclaw/openclaw/pull/103416)
- 将Slack进度草稿转为最终回复[#119376](https://github.com/openclaw/openclaw/pull/119376)
- fix（slack）：允许从消息工具[#132928](https://github.com/openclaw/openclaw/pull/132928)打开群组DM
- Log Slack 打字反应失败 [#103303](https://github.com/openclaw/openclaw/pull/103303)

**错误修复**

- 防止消息读取回退到错误的会话 [#108637](https://github.com/openclaw/openclaw/pull/108637)
- 保留重复的 Slack 事件并重试瞬时故障 [#116384](https://github.com/openclaw/openclaw/pull/116384)
- 保留 Slack 线程读取、编辑格式和完整回复 [#116915](https://github.com/openclaw/openclaw/pull/116915)
- 在瞬时启动失败后恢复 Slack 身份 [#117253](https://github.com/openclaw/openclaw/pull/117253)
- 隔离 Slack 交互式绑定到正确的对话 [#118662](https://github.com/openclaw/openclaw/pull/118662)
- Route Slack 按工作区划分的企业网格消息 [#120087](https://github.com/openclaw/openclaw/pull/120087)
- 接受组织范围内的 Slack 用户 ID [#122934](https://github.com/openclaw/openclaw/pull/122934)
- 将 Slack 多方 DM 保留在一个对话会话中 [#102811](https://github.com/openclaw/openclaw/pull/102811)
- 在 API 边界保留 Slack ID [#103214](https://github.com/openclaw/openclaw/pull/103214)
- 停止停止 Slack 文件安全上传 [#103442](https://github.com/openclaw/openclaw/pull/103442)
- 交互后保留不相关的 Slack 操作行 [#103445](https://github.com/openclaw/openclaw/pull/103445)
- 使用读取范围的 Slack 查找对话元数据 [#103468](https://github.com/openclaw/openclaw/pull/103468)
- 保留格式错误的 Slack 传送签名，以免中断协调 [#105492](https://github.com/openclaw/openclaw/pull/105492)
- 当机器人身份缺失时，报告 Slack 运行状况降级 [#105556](https://github.com/openclaw/openclaw/pull/105556)
- 禁用 Slack 通道的日志结构化警告 [#105790](https://github.com/openclaw/openclaw/pull/105790)
- Bound 停止 Slack 启动身份检查 [#105893](https://github.com/openclaw/openclaw/pull/105893)
- Bound Slack 用户名缓存增长 [#105978](https://github.com/openclaw/openclaw/pull/105978)
- Bound Slack 目录和白名单查找 [#106643](https://github.com/openclaw/openclaw/pull/106643)
- Bound Slack 当 API 停止时的读取操作 [#107103](https://github.com/openclaw/openclaw/pull/107103)
- 保留排队的 Slack 回复 [#107820](https://github.com/openclaw/openclaw/pull/107820)
- 在截止日期内进行 Slack 健康检查 [#107835](https://github.com/openclaw/openclaw/pull/107835)
- 使 Slack 事件准入在 Bolt 和继电器中持久 [#109910](https://github.com/openclaw/openclaw/pull/109910)
- 释放未读 Slack 所有权检查响应 [#111231](https://github.com/openclaw/openclaw/pull/111231)
- 防止Slack CJK文本中暴露Markdown强调标记[#111575](https://github.com/openclaw/openclaw/pull/111575)
- 通过出站切换保留本机 Slack 表 [#111955](https://github.com/openclaw/openclaw/pull/111955)
- 恢复旧会话密钥的 Slack 线程上下文 [#114009](https://github.com/openclaw/openclaw/pull/114009)
- 保留 Slack 代理的附件类型和尺寸 [#114502](https://github.com/openclaw/openclaw/pull/114502)
- fix（slack）：并发调度独立路由的线程 [#114552](https://github.com/openclaw/openclaw/pull/114552)
- Bound 停滞 Slack 只读 API 调用 [#115018](https://github.com/openclaw/openclaw/pull/115018)
- 防止长 Slack 编辑失败 [#115027](https://github.com/openclaw/openclaw/pull/115027)
- Bound Slack response_url 车身检查 [#115093](https://github.com/openclaw/openclaw/pull/115093)
- 使用自定义标识 [#115114](https://github.com/openclaw/openclaw/pull/115114) 保留 Slack 预览
- 保留入站消息中粘贴的 Slack 表 [#115163](https://github.com/openclaw/openclaw/pull/115163)
- 重复相同帖子 Slack 消息和提及事件 [#115302](https://github.com/openclaw/openclaw/pull/115302)
- 防止重复Slack群-DM提及[#115468](https://github.com/openclaw/openclaw/pull/115468)
- 防止重复Slack群-DM提及回复[#115528](https://github.com/openclaw/openclaw/pull/115528)
- 在网关启动重播期间恢复 Slack 回复 [#115991](https://github.com/openclaw/openclaw/pull/115991)
- 私下解释 Slack 通道允许名单拒绝 [#116618](https://github.com/openclaw/openclaw/pull/116618)
- 在Slack组中保留上下文-DM线程后续[#116660](https://github.com/openclaw/openclaw/pull/116660)
- 瞬时启动身份验证失败后恢复 Slack 身份 [#117060](https://github.com/openclaw/openclaw/pull/117060)
- 重试 Slack 线程查找，而不是静默删除消息 [#117135](https://github.com/openclaw/openclaw/pull/117135)
- 防止停滞的 Slack 存在检查阻止关闭 [#117478](https://github.com/openclaw/openclaw/pull/117478)
- 恢复 Slack 工作区相关附件 [#117728](https://github.com/openclaw/openclaw/pull/117728)
- 保留完整的 Slack 本机数据回退 [#117809](https://github.com/openclaw/openclaw/pull/117809)
- 将 Slack 模式提交和关闭交付给代理 [#118123](https://github.com/openclaw/openclaw/pull/118123)
- 最终确定实际交付的Slack问题卡[#118450](https://github.com/openclaw/openclaw/pull/118450)
- 回退后清理部分启动的 Slack 流 [#118617](https://github.com/openclaw/openclaw/pull/118617)
- 使用隔离信任边界恢复 GovSlack 媒体 [#118695](https://github.com/openclaw/openclaw/pull/118695)
- 在应用限制之前授权 Slack 读取 [#118736](https://github.com/openclaw/openclaw/pull/118736)
- Render Slack 进度 Markdown 无杂散反斜杠 [#119373](https://github.com/openclaw/openclaw/pull/119373)
- 将文件扩展名添加到未命名的Slack上传[#119399](https://github.com/openclaw/openclaw/pull/119399)
- 在较新的人类消息下方保留 Slack 回复 [#119832](https://github.com/openclaw/openclaw/pull/119832)
- 隔离 Slack 线程缓存并安全地保留通道重命名 [#120022](https://github.com/openclaw/openclaw/pull/120022)
- 在禁用 Codex 插件时保持 Slack 运行 [#120312](https://github.com/openclaw/openclaw/pull/120312)
- 防止 Slack 目录分页循环 [#120445](https://github.com/openclaw/openclaw/pull/120445)
- Stop Slack 授权挂在光标循环上 [#120686](https://github.com/openclaw/openclaw/pull/120686)
- 为企业网格启用团队范围的 Slack 执行批准 [#120874](https://github.com/openclaw/openclaw/pull/120874)
- 当 Slack 转发的图像不可用时告诉代理 [#122108](https://github.com/openclaw/openclaw/pull/122108)
- 在临时授权查找后重试 Slack 成员事件 [#122356](https://github.com/openclaw/openclaw/pull/122356)
- 将 Slack 反应事件传递到线程范围的轮次 [#122363](https://github.com/openclaw/openclaw/pull/122363)
- 防止重复 Slack 套接字模式连接 [#122624](https://github.com/openclaw/openclaw/pull/122624)
- 保留原始图像字节以进行强制Slack上传 [#122667](https://github.com/openclaw/openclaw/pull/122667)
- 停止活动对话中重复的 Slack 中断通知 [#122782](https://github.com/openclaw/openclaw/pull/122782)
- 防止 Slack 进度卡仍然卡在工作中 [#122816](https://github.com/openclaw/openclaw/pull/122816)
- 将更新的全局设置应用于新的 Slack 消息 [#123373](https://github.com/openclaw/openclaw/pull/123373)
- 保留 Slack 结构化消息的调度托管 [#123710](https://github.com/openclaw/openclaw/pull/123710)
- 从完成的 Slack 进度卡 [#123851](https://github.com/openclaw/openclaw/pull/123851) 中删除工具调用收据
- 在 Slack 企业网格 [#125009](https://github.com/openclaw/openclaw/pull/125009) 上恢复机器人消息传递
- 需要确认 Slack 消息身份才能投递成功 [#125762](https://github.com/openclaw/openclaw/pull/125762)
- fix（slack）：保留长遗留交互式文本 [#127994](https://github.com/openclaw/openclaw/pull/127994)
- fix（slack）：在原始线程中保留失败的消息重试 [#128182](https://github.com/openclaw/openclaw/pull/128182)
- fix（slack）：统一渠道帐户准备情况[#128322](https://github.com/openclaw/openclaw/pull/128322)
- fix（slack）：防止长消息编辑无提示地丢失文本 [#128613](https://github.com/openclaw/openclaw/pull/128613)
- fix（松弛）：在推理回合中保持部分预览稳定 [#128626](https://github.com/openclaw/openclaw/pull/128626)
- fix（slack）：将编辑和删除的消息保留在原始线程中 [#128768](https://github.com/openclaw/openclaw/pull/128768)
- fix（slack）：拒绝请求对话之外的文件下载 [#128903](https://github.com/openclaw/openclaw/pull/128903)
- fix（松弛）：子代理完成后唤醒产生的父母[#129023](https://github.com/openclaw/openclaw/pull/129023)
- fix（松弛）：防止直接和转发附件中的重复文件 [#129065](https://github.com/openclaw/openclaw/pull/129065)
- fix（slack）：显式回复落在请求的线程中 [#129069](https://github.com/openclaw/openclaw/pull/129069)
- fix（松弛）：防止重复的问题按钮和额外的消息[#129445](https://github.com/openclaw/openclaw/pull/129445)
- fix（松弛）：停止向 HTTP 提供无效的套接字清单 [#130234](https://github.com/openclaw/openclaw/pull/130234)
- fix（slack）：在富文本中保留用户名提及[#130816](https://github.com/openclaw/openclaw/pull/130816)
- fix（slack）：记录失败和遗漏附件的原因 [#130857](https://github.com/openclaw/openclaw/pull/130857)
- fix（slack）：在编辑和预览中保留表格格式 [#130979](https://github.com/openclaw/openclaw/pull/130979)
- fix（松弛）：停止将消耗的媒体泄漏到卡中并发送文本 [#131586](https://github.com/openclaw/openclaw/pull/131586)
- fix（slack）：标记部分不可用的线程文件[#131896](https://github.com/openclaw/openclaw/pull/131896)
- 防止重复 Slack 回复控件 [#101474](https://github.com/openclaw/openclaw/pull/101474)
- 在应用程序主页中显示活动的Slack命令[#102340](https://github.com/openclaw/openclaw/pull/102340)
- 纠正 Slack 回复元数据而不破坏独立消息线程 [#102905](https://github.com/openclaw/openclaw/pull/102905)
- 将 Slack 注释与工具进度分开 [#103995](https://github.com/openclaw/openclaw/pull/103995)
- 保留规范Slack块交货收据[#104563](https://github.com/openclaw/openclaw/pull/104563)
- 优先配置Slack斜杠命令[#104736](https://github.com/openclaw/openclaw/pull/104736)
- Hide 误导性 Slack 房间事件打字指示器 [#105813](https://github.com/openclaw/openclaw/pull/105813)
- 跨传输阶段强制执行 Slack 上传超时 [#106496](https://github.com/openclaw/openclaw/pull/106496)
- 当环境覆盖为空时使用默认的 Slack 转发器 [#110675](https://github.com/openclaw/openclaw/pull/110675)
- 防止 Slack 目录分页挂起 [#115056](https://github.com/openclaw/openclaw/pull/115056)
- 在预览之前保留 Slack 出站挂钩 [#115357](https://github.com/openclaw/openclaw/pull/115357)
- Stop false Slack 医生中的消息丢失警告 [#115563](https://github.com/openclaw/openclaw/pull/115563)
- 与App Home中配置的Slack斜杠命令保持一致[#118735](https://github.com/openclaw/openclaw/pull/118735)
- 在 Slack 文件上传上保留字幕 [#121047](https://github.com/openclaw/openclaw/pull/121047)
- 使已加入的 Slack 线程在 24 小时内保持活动状态 [#121708](https://github.com/openclaw/openclaw/pull/121708)
- fix（slack）：从流回复中剥离 Exec 失败的跟踪 [#122827](https://github.com/openclaw/openclaw/pull/122827)
- 在路由代理 [#123202](https://github.com/openclaw/openclaw/pull/123202) 上保留 Slack 线程回复
- 保留缓存的 Slack 身份和实时许可名单 [#123403](https://github.com/openclaw/openclaw/pull/123403)
- 删除Slack的传输级NO_REPLY特殊情况[#124561](https://github.com/openclaw/openclaw/pull/124561)
- 减少 Slack 本机任务卡中的重复文本 [#125168](https://github.com/openclaw/openclaw/pull/125168)
- 静默转动后删除陈旧的 Slack 进度 [#125494](https://github.com/openclaw/openclaw/pull/125494)
- 防止部分传送失败后出现重复的 Slack 内容 [#127130](https://github.com/openclaw/openclaw/pull/127130)
- fix（slack）：将私人菜单回复保留在原始线程中 [#128341](https://github.com/openclaw/openclaw/pull/128341)
- fix（slack）：尊重 HTTP 设置凭据 [#128659](https://github.com/openclaw/openclaw/pull/128659)
- fix（松弛）：多部分收据将溢出文本错误分类为媒体 [#129089](https://github.com/openclaw/openclaw/pull/129089)
- fix（slack）：在下载的同时保留不可用的附件 [#129708](https://github.com/openclaw/openclaw/pull/129708)
- fix（松弛）：重试陈旧草稿清理[#129819](https://github.com/openclaw/openclaw/pull/129819)
- fix（松弛）：保留所有多部分操作发送收据[#130606](https://github.com/openclaw/openclaw/pull/130606)

**文档**

- 解释 Slack 群组 DM 机器人成员资格要求 [#101944](https://github.com/openclaw/openclaw/pull/101944)
- 正确的Slack通道配置示例[#103491](https://github.com/openclaw/openclaw/pull/103491)
- 正确的Slack套接字模式调整和清理指导[#119328](https://github.com/openclaw/openclaw/pull/119328)
- docs（slack）：使用规范帖子作为密钥 [#128448](https://github.com/openclaw/openclaw/pull/128448)

</details>

</Accordion>

<Accordion title="WhatsApp">

[WhatsApp](/channels/whatsapp) 现在可以列出链接帐户中的群组，而无需让某人通过日志或邀请链接进行搜索，并且可以避免在 OpenClaw 已拥有该帐户时打开竞争连接。如果 OpenClaw 在接受传入消息后重新启动，则挂起的工作可以继续，而不会跳过后续事件，而多部分回复会保留实际成功的部分和收据，而不是在一部分失败后重放整个响应。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**错误修复**

- 从关联账户中发现 WhatsApp 群组 [#109886](https://github.com/openclaw/openclaw/pull/109886)
- 在重新启动时保留 WhatsApp 入站消息 [#110418](https://github.com/openclaw/openclaw/pull/110418)
- 保持WhatsApp交货结果和收货一致[#118114](https://github.com/openclaw/openclaw/pull/118114)
- 保持预连接 WhatsApp 消息可重播 [#104450](https://github.com/openclaw/openclaw/pull/104450)
- 保留底层WhatsApp断开错误[#105399](https://github.com/openclaw/openclaw/pull/105399)
- WhatsApp 有效负载中的复数媒体选择 [#105576](https://github.com/openclaw/openclaw/pull/105576)
- Harden WhatsApp 使用共享媒体助手 [#107017](https://github.com/openclaw/openclaw/pull/107017) 进行媒体发送
- 在没有通道配置的情况下迁移旧版默认通道允许列表 [#108453](https://github.com/openclaw/openclaw/pull/108453)
- 防止 WhatsApp 关闭在预中止停止时挂起 [#109903](https://github.com/openclaw/openclaw/pull/109903)
- Honor WhatsApp 文字在会员标签旁边提及 [#110412](https://github.com/openclaw/openclaw/pull/110412)
- 在运行时重新加载时保留活动的 WhatsApp 连接 [#110762](https://github.com/openclaw/openclaw/pull/110762)
- Render CommonMark 在 WhatsApp 消息中正确 [#113010](https://github.com/openclaw/openclaw/pull/113010)
- 保留可操作的 WhatsApp 远程注销状态 [#114445](https://github.com/openclaw/openclaw/pull/114445)
- 停止抑制其他聊天的相同 WhatsApp 回复 [#115574](https://github.com/openclaw/openclaw/pull/115574)
- 以其本机格式发送仅文件名的 WhatsApp 媒体 [#115725](https://github.com/openclaw/openclaw/pull/115725)
- 保留排队的 WhatsApp 消息直至传送 [#116179](https://github.com/openclaw/openclaw/pull/116179)
- 在输入状态失败时发送 WhatsApp 消息 [#116739](https://github.com/openclaw/openclaw/pull/116739)
- 保留 WhatsApp 选择和本机媒体类型 [#116816](https://github.com/openclaw/openclaw/pull/116816)
- 恢复 WhatsApp 互动提及、民意调查、视频笔记和引用媒体 [#116901](https://github.com/openclaw/openclaw/pull/116901)
- 保留 WhatsApp 消息信封行为 [#116989](https://github.com/openclaw/openclaw/pull/116989)
- 防止在接受交货后重复 WhatsApp 回复 [#117198](https://github.com/openclaw/openclaw/pull/117198)
- 防止WhatsApp自回波触发重复工作[#117228](https://github.com/openclaw/openclaw/pull/117228)
- 保留 WhatsApp 群组参与者元数据 [#117234](https://github.com/openclaw/openclaw/pull/117234)
- 安全编辑 WhatsApp 附件失败日志 [#117939](https://github.com/openclaw/openclaw/pull/117939)
- 停止 WhatsApp 重试耗尽后重新连接 [#118659](https://github.com/openclaw/openclaw/pull/118659)
- 在长时间活动期间保持打字可见 [#120337](https://github.com/openclaw/openclaw/pull/120337)
- 阻止 WhatsApp 丢弃具有重复文本的不同消息 [#122785](https://github.com/openclaw/openclaw/pull/122785)
- 插件更换后重新加载WhatsApp运行时代码[#126867](https://github.com/openclaw/openclaw/pull/126867)
- fix（whatsapp）：保留附件上传的文件名和媒体类型 [#128186](https://github.com/openclaw/openclaw/pull/128186)
- fix（whatsapp）：当 Markdown 格式化不返回任何块时保留文本 [#129275](https://github.com/openclaw/openclaw/pull/129275)
- fix（whatsapp）：在标题替换 [#131672](https://github.com/openclaw/openclaw/pull/131672) 中保留不匹配的附件
- 保持 WhatsApp 回显诊断在表情符号边界周围有效 [#102603](https://github.com/openclaw/openclaw/pull/102603)
- 准确报告WhatsApp注销无操作[#105929](https://github.com/openclaw/openclaw/pull/105929)
- 防止WhatsApp医生检查悬挂 [#109243](https://github.com/openclaw/openclaw/pull/109243)
- 仅恢复 LID- 发件人的 WhatsApp 群组反应 [#110053](https://github.com/openclaw/openclaw/pull/110053)
- 防止并发 WhatsApp 源账户启动失败 [#111094](https://github.com/openclaw/openclaw/pull/111094)
- 恢复 WhatsApp 当前对话中的反应 [#113178](https://github.com/openclaw/openclaw/pull/113178)
- 当引用文本不可用时保留 WhatsApp 回复引用 [#115517](https://github.com/openclaw/openclaw/pull/115517)
- 保留 WhatsApp QR 登录可用于语法约束模型 [#115656](https://github.com/openclaw/openclaw/pull/115656)
- Render 在 PN 和 LID 别名 [#116814](https://github.com/openclaw/openclaw/pull/116814) 上引用了 WhatsApp 自聊天回复
- 恢复 WhatsApp 自创作消息的反应 [#117697](https://github.com/openclaw/openclaw/pull/117697)
- 安全地清除并迁移每个 WhatsApp 凭证类别 [#118610](https://github.com/openclaw/openclaw/pull/118610)
- 荣誉禁用WhatsApp自聊，不影响群组 [#118711](https://github.com/openclaw/openclaw/pull/118711)
- 注销前确认 WhatsApp 账户 [#122437](https://github.com/openclaw/openclaw/pull/122437)
- fix（whatsapp）：防止成员资格更改后提及过时的组 [#128283](https://github.com/openclaw/openclaw/pull/128283)
- fix（whatsapp）：避免在未终止的内联代码 [#129281](https://github.com/openclaw/openclaw/pull/129281) 中提及
- 报告 WhatsApp 对发送消息挂钩的本机回复 [#97728](https://github.com/openclaw/openclaw/pull/97728)

**文档**

- Clarify WhatsApp 打字清理计时 [50cc620](https://github.com/openclaw/openclaw/commit/50cc620)
- 记录如何检查和验证 wacli 消息 [#116410](https://github.com/openclaw/openclaw/pull/116410)
- docs（whatsapp）：记录规范的确认反应密钥 [#118161](https://github.com/openclaw/openclaw/pull/118161)

</details>

</Accordion>

<Accordion title="Signal">

当启用引用时，[Signal](/channels/signal) 回复现在通过普通、分块、媒体和持久传递保留其本机引用块。崩溃之前收到的消息可以从本地存储恢复，并且会报告失败的收件人，而不是消失在错误的成功中。任何成员收到消息后，群组发送都会保持保守，因此一个失败的收件人不会导致整个回复重复给其他所有人。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**错误修复**

- 在 Signal 中保留本机引用的回复 [#105347](https://github.com/openclaw/openclaw/pull/105347)
- 在瞬时会话冲突后重试 Signal 消息 [#103218](https://github.com/openclaw/openclaw/pull/103218)
- 在监视器关闭期间保留接受的 Signal 消息 [#103967](https://github.com/openclaw/openclaw/pull/103967)
- Stop 停止 Signal 挂起操作的响应 [#104122](https://github.com/openclaw/openclaw/pull/104122)
- 跨输出块保留 Signal 守护进程诊断 [#104152](https://github.com/openclaw/openclaw/pull/104152)
- 在路由期间保留 Signal 用户名目标并发送 [#107365](https://github.com/openclaw/openclaw/pull/107365)
- 在停滞的容器握手后重新连接 Signal [#107386](https://github.com/openclaw/openclaw/pull/107386)
- 在活动运行期间保持 Signal 控件响应 [#107422](https://github.com/openclaw/openclaw/pull/107422)
- Bound 缓慢 Signal REST 响应请求超时 [#109047](https://github.com/openclaw/openclaw/pull/109047)
- 在接收到发送崩溃后恢复 Signal 消息 [#109907](https://github.com/openclaw/openclaw/pull/109907)
- 在去抖动的 Signal 消息中保留换行符 [#110090](https://github.com/openclaw/openclaw/pull/110090)
- 保留 Signal 反向代理路径前缀 [#110495](https://github.com/openclaw/openclaw/pull/110495)
- 保留 Signal 关闭期间重试拥有的 [#110629](https://github.com/openclaw/openclaw/pull/110629)
- 保留 Signal 入口切换和命名帐户通道设置 [#111449](https://github.com/openclaw/openclaw/pull/111449)
- Surface 失败 Signal 收件人投递 [#111960](https://github.com/openclaw/openclaw/pull/111960)
- 保存前拒绝格式错误的 Signal 附件 [#114883](https://github.com/openclaw/openclaw/pull/114883)
- 保留 Signal 附件的原始文件名 [#115107](https://github.com/openclaw/openclaw/pull/115107)
- 修复 Signal 帐户运行状况、反应所有权和跳过的消息历史记录 [#116914](https://github.com/openclaw/openclaw/pull/116914)
- 防止在不明确的故障后出现重复的 Signal 引用消息 [#117134](https://github.com/openclaw/openclaw/pull/117134)
- 通过 Signal 传送授权的工作区附件 [#117895](https://github.com/openclaw/openclaw/pull/117895)
- 防止跨发件人别名进行重复的 Signal 处理 [#118970](https://github.com/openclaw/openclaw/pull/118970)
- 在关闭期间保留已接受的 Signal 消息 [#118975](https://github.com/openclaw/openclaw/pull/118975)
- Preserve Signal 稍后回复块失败后提示 [#126160](https://github.com/openclaw/openclaw/pull/126160)
- fix（信号）：保留在繁忙车道后面重新传递的消息 [#128093](https://github.com/openclaw/openclaw/pull/128093)
- fix（信号）：短暂网关故障后重放批准反应 [#130134](https://github.com/openclaw/openclaw/pull/130134)
- Make Signal 小组提到可靠地唤醒机器人 [#96738](https://github.com/openclaw/openclaw/pull/96738)
- 清理并解锁 Signal CLI 发布安装 [#103339](https://github.com/openclaw/openclaw/pull/103339)
- 拒绝早期不支持的 Signal 消息操作 [#104788](https://github.com/openclaw/openclaw/pull/104788)
- 释放失败 Signal CLI 下载连接及时 [#109442](https://github.com/openclaw/openclaw/pull/109442)
- 处理格式错误 Signal CLI 干净地发布元数据 [#110824](https://github.com/openclaw/openclaw/pull/110824)
- 在路由目标 [#112607](https://github.com/openclaw/openclaw/pull/112607) 上保留 Signal 反应
- 在一根日志行上保留多行 Signal 预览 [#114881](https://github.com/openclaw/openclaw/pull/114881)
- 在非交互式设置期间验证和标准化 Signal 帐户 [#118932](https://github.com/openclaw/openclaw/pull/118932)
- fix（信号）：启动前报告托管守护进程端口冲突 [#124015](https://github.com/openclaw/openclaw/pull/124015)
- 在 UUID 和手机别名 [#78022](https://github.com/openclaw/openclaw/pull/78022) 之间保持 Signal 配对

**文档**

- 文档 Signal 非交互式设置标志 [#102114](https://github.com/openclaw/openclaw/pull/102114)

</details>

</Accordion>

<Accordion id="imessage-and-bluebubbles" title="iMessage 和 BlueBubbles">

[iMessage](/channels/imessage) 现在是一个官方可安装插件，通过移出核心来承载现有配置和状态。符合条件的批准请求可以使用本机消息轮询，而旧桥、SMS 和失败的轮询发送则保留现有文本、反应或命令回退。

远程 Mac 设置还可以保留正确的现有聊天附件，并且可以使用支持的远程路径和操作，而无需与运行 OpenClaw 的计算机共享文件系统，同时可以重播崩溃前已存储的传入消息。新设置仍然需要在登录的 Mac 上使用该插件和 `imsg`，并且这仍然与 iOS 和 macOS OpenClaw 聊天应用程序分开。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加本机 iMessage 批准民意调查 [#112714](https://github.com/openclaw/openclaw/pull/112714)
- 将 iMessage 从核心移动到官方插件 [#117101](https://github.com/openclaw/openclaw/pull/117101)
- 样式 iMessage 批准详细信息在投票模式下一致 [#116221](https://github.com/openclaw/openclaw/pull/116221)

**错误修复**

- Preserve iMessage 跨网关交付崩溃 [#110409](https://github.com/openclaw/openclaw/pull/110409)
- iMessage 附件到达正确的现有聊天 [#115006](https://github.com/openclaw/openclaw/pull/115006)
- 保留 iMessage 传输、故障和语音意图 [#116889](https://github.com/openclaw/openclaw/pull/116889)
- 在 iMessage 回复中保留受保护的角色密钥 [#117159](https://github.com/openclaw/openclaw/pull/117159)
- 聊天数据库替换后回滚 iMessage 光标 [#117788](https://github.com/openclaw/openclaw/pull/117788)
- 使SSH-支持的iMessage发送和动作可靠[#121038](https://github.com/openclaw/openclaw/pull/121038)
- 从权威历史记录中修复无锚iMessage路由[#104218](https://github.com/openclaw/openclaw/pull/104218)
- 保留拆分iMessage权限诊断[#107393](https://github.com/openclaw/openclaw/pull/107393)
- 在当前对话中保留 iMessage 操作 [#107773](https://github.com/openclaw/openclaw/pull/107773)
- 将快速模式进度保留在 iMessage 聊天记录之外 [#110052](https://github.com/openclaw/openclaw/pull/110052)
- 防止延迟回退发送后重复的 iMessage [#110853](https://github.com/openclaw/openclaw/pull/110853)
- 正确的iMessage出站Markdown格式[#113138](https://github.com/openclaw/openclaw/pull/113138)
- 向代理显示完整的 iMessage 民意调查选择 [#114714](https://github.com/openclaw/openclaw/pull/114714)
- 保留 iMessage 附件的原始文件名 [#117197](https://github.com/openclaw/openclaw/pull/117197)
- 保留 iMessage 附件名称和已接受的交货收据 [#117238](https://github.com/openclaw/openclaw/pull/117238)
- 保留 iMessage 交货收据和结果 [#117282](https://github.com/openclaw/openclaw/pull/117282)
- Start 显式启用 iMessage 帐户 [#118944](https://github.com/openclaw/openclaw/pull/118944)
- 仅对真正共享的 iMessage 观察者进行重复数据删除 [#118974](https://github.com/openclaw/openclaw/pull/118974)
- fix（imessage）：拒绝格式错误的base64附件缓冲区[#120216](https://github.com/openclaw/openclaw/pull/120216)
- Stop iMessage 回声防护可防止丢弃真实回复 [#120260](https://github.com/openclaw/openclaw/pull/120260)
- 保留 iMessage 附件和语音消息身份 [#120739](https://github.com/openclaw/openclaw/pull/120739)
- 保留重试安全 iMessage 无发送结果 [#122672](https://github.com/openclaw/openclaw/pull/122672)
- 在入站 SMS 路由上保持自动 iMessage 回复 [#125633](https://github.com/openclaw/openclaw/pull/125633)
- 拒绝不明确的 iMessage 收件人 [#126564](https://github.com/openclaw/openclaw/pull/126564)
- fix（imessage）：停止从跳闸环路限制器 [#126856](https://github.com/openclaw/openclaw/pull/126856) 进行自聊天重复数据删除
- fix（imessage）：防止普通引用消息消失 [#129450](https://github.com/openclaw/openclaw/pull/129450)
- fix（imessage）：在线程回复中保留原始消息上下文 [#129917](https://github.com/openclaw/openclaw/pull/129917)
- fix（imessage）：短暂网关故障后重播批准反应 [#130893](https://github.com/openclaw/openclaw/pull/130893)
- 从iMessage回复中删除内部工具痕迹[#101430](https://github.com/openclaw/openclaw/pull/101430)
- 保留 iMessage CLI 错误尾部有效 Unicode [#102626](https://github.com/openclaw/openclaw/pull/102626)
- 让iMessage的助手关闭后立即完成[#108909](https://github.com/openclaw/openclaw/pull/108909)
- 当 HOME 为空时检测 iMessage 远程包装器 [#111715](https://github.com/openclaw/openclaw/pull/111715)
- 解释不受支持的 iMessage 私有状态探测器 [#115526](https://github.com/openclaw/openclaw/pull/115526)
- 在 CAF 分段失败时保留 iMessage TTS 回退 [#126378](https://github.com/openclaw/openclaw/pull/126378)
- fix（imessage）：保留dunder参考链接[#130547](https://github.com/openclaw/openclaw/pull/130547)
- fix（imessage）：在设置过程中保留非 Homebrew imsg [#131429](https://github.com/openclaw/openclaw/pull/131429)

**文档**

- 删除已退役的 OpenClaw iMessage 拆分发送合并 [#108436](https://github.com/openclaw/openclaw/pull/108436)
- 将 iMessage 恢复文档与持久的 SQLite 入口 [#111002](https://github.com/openclaw/openclaw/pull/111002) 对齐

</details>

</Accordion>

<Accordion id="feishu-and-lark" title="Feishu 和 Lark">

在[Feishu](/channels/feishu)中，代理可以重新发送该机器人帐户之前收到的贴纸，并且当操作员添加标签时，可以通过关键字找到正确的贴纸。已接受的 Feishu 消息和评论也可以在重新启动后恢复，流媒体卡会保留最新接受的版本，并且不受支持的图像格式仍可作为文件附件使用，而不是被丢弃。贴纸操作和标签是可选择加入的，不会追溯组织现有的集合；贴纸和评论工作是专门针对 Feishu 而不是每个 Lark 路径进行验证的。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- feat（feishu）：让智能体重新发送收到的贴纸[#130374](https://github.com/openclaw/openclaw/pull/130374)
- feat（feishu）：通过配置的关键字查找收到的贴纸[#130498](https://github.com/openclaw/openclaw/pull/130498)
- 将 Feishu 重放保护移至核心重复数据删除 [#104384](https://github.com/openclaw/openclaw/pull/104384)
- 选择加入 Feishu 机器人对机器人对话 [#89783](https://github.com/openclaw/openclaw/pull/89783)
- 添加选择加入 Feishu VC 会议邀请自动加入 [#92340](https://github.com/openclaw/openclaw/pull/92340)

**错误修复**

- 防止重复 Feishu 流媒体卡快照 [#103915](https://github.com/openclaw/openclaw/pull/103915)
- 在重新启动时保留 Feishu 入站消息 [#110864](https://github.com/openclaw/openclaw/pull/110864)
- 使 Feishu 交付和媒体处理真实 [#117023](https://github.com/openclaw/openclaw/pull/117023)
- 将 Feishu 本机卡保留在主题线程中 [#102804](https://github.com/openclaw/openclaw/pull/102804)
- Honor为Feishu流卡[#102948](https://github.com/openclaw/openclaw/pull/102948)配置超时
- 绑定 Feishu 发件人姓名缓存 [#103513](https://github.com/openclaw/openclaw/pull/103513)
- 恢复 Feishu WebSocket 活体检测 [#103763](https://github.com/openclaw/openclaw/pull/103763)
- Harden Feishu 文档图像和 Markdown 处理 [#104663](https://github.com/openclaw/openclaw/pull/104663)
- Render Feishu 组策略在表单模式下安全 [#107336](https://github.com/openclaw/openclaw/pull/107336)
- 通过对话传递 Feishu 直接消息回复 [#109637](https://github.com/openclaw/openclaw/pull/109637)
- Keep Lark 驱动器评论提到解决身份中断问题 [#112807](https://github.com/openclaw/openclaw/pull/112807)
- 本机完成后结算 Feishu 交付挂钩 [#113152](https://github.com/openclaw/openclaw/pull/113152)
- 从转发的Feishu卡中恢复可读内容 [#115136](https://github.com/openclaw/openclaw/pull/115136)
- Feishu 群卡按钮通提门控 [#116105](https://github.com/openclaw/openclaw/pull/116105)
- 保留 Feishu 消息创建次数 [#116156](https://github.com/openclaw/openclaw/pull/116156)
- 保留完整的Feishu反应上下文[#116918](https://github.com/openclaw/openclaw/pull/116918)
- 防止多部分附件的重复 Feishu 回复 [#117196](https://github.com/openclaw/openclaw/pull/117196)
- 保留 Feishu 外向交货进度和回复目标 [#117223](https://github.com/openclaw/openclaw/pull/117223)
- 保留自定义 Feishu API 域的端口和路径 [#117278](https://github.com/openclaw/openclaw/pull/117278)
- fix（feishu）：通过正确的 SDK 方法 [#117414](https://github.com/openclaw/openclaw/pull/117414) 路由丰富的帖子编辑
- 通过 Feishu 交付批准的工作区附件 [#117778](https://github.com/openclaw/openclaw/pull/117778)
- fix（feishu）： 停止重复的doc子分页[#121124](https://github.com/openclaw/openclaw/pull/121124)
- fix（feishu）：促进发送附件别名而不是静默删除[#125664](https://github.com/openclaw/openclaw/pull/125664)
- fix（feishu）： 保留所有接受的语音后备内容 [#128130](https://github.com/openclaw/openclaw/pull/128130)
- fix（feishu）：消息回执丢失时报告已发送回复 [#128213](https://github.com/openclaw/openclaw/pull/128213)
- fix（feishu）：防止无卡收据时空白重复回复 [#128274](https://github.com/openclaw/openclaw/pull/128274)
- fix（feishu）：当明显的语音媒体是文件时保留字幕 [#128771](https://github.com/openclaw/openclaw/pull/128771)
- fix（feishu）：在文档注释中进行演示 [#129843](https://github.com/openclaw/openclaw/pull/129843)
- fix（feishu）：通过配置的渲染提供长消息工具回复 [#129902](https://github.com/openclaw/openclaw/pull/129902)
- fix（feishu）：保留消息卡中不可用的控件[#130641](https://github.com/openclaw/openclaw/pull/130641)
- fix（feishu）：标记服务器转录的音频，以便核心跳过重复的 ASR [#130953](https://github.com/openclaw/openclaw/pull/130953)
- fix（飞书）：拆分超大Markdown卡，不会丢失内容或收据[#131106](https://github.com/openclaw/openclaw/pull/131106)
- fix（feishu）：当 root_id 不存在时，在入站防抖密钥中包含 thread_id [#131183](https://github.com/openclaw/openclaw/pull/131183)
- 路线Feishu SDK通过配置的代理的流量[#86386](https://github.com/openclaw/openclaw/pull/86386)
- 恢复 Feishu 文件和图像附件传送 [#95514](https://github.com/openclaw/openclaw/pull/95514)
- 防止 Feishu 媒体回退引用泄漏 [#98251](https://github.com/openclaw/openclaw/pull/98251)
- 保留Feishu消失的媒体回复[#98320](https://github.com/openclaw/openclaw/pull/98320)
- 保留 Feishu Markdown 帖子中的预期换行符 [#99394](https://github.com/openclaw/openclaw/pull/99394)
- 报告意外 Feishu 身份恢复失败 [#102185](https://github.com/openclaw/openclaw/pull/102185)
- 使用 Feishu 自动 TTS 语音注释 [#103781](https://github.com/openclaw/openclaw/pull/103781) 保留一篇可读文本回复
- Bound 停止 Feishu 应用程序注册请求 [#105549](https://github.com/openclaw/openclaw/pull/105549)
- Stop 停止 Feishu 从挂起消息下载媒体 [#106541](https://github.com/openclaw/openclaw/pull/106541)
- 添加隐私安全 Feishu 消息解析诊断 [#107947](https://github.com/openclaw/openclaw/pull/107947)
- Stop Feishu 帐户停止时重试评论 [#108408](https://github.com/openclaw/openclaw/pull/108408)
- 缓存无法访问 Feishu 发件人姓名查找 [#111700](https://github.com/openclaw/openclaw/pull/111700)
- 检查规范Feishu医生成绩单[#115148](https://github.com/openclaw/openclaw/pull/115148)
- 保持故意 Feishu NO_REPLY 沉默 [#115530](https://github.com/openclaw/openclaw/pull/115530)
- 保留有效的空 Feishu 入站消息 [#115583](https://github.com/openclaw/openclaw/pull/115583)
- 立即关闭拒绝Feishu流卡连接 [#117312](https://github.com/openclaw/openclaw/pull/117312)
- 使用真实的Feishu消息ID进行反应主题水合[#117685](https://github.com/openclaw/openclaw/pull/117685)
- 在模型工具路由中保留禁用的 Feishu 帐户 [#126412](https://github.com/openclaw/openclaw/pull/126412)
- fix（feishu）：保留接受的文档评论传递身份[#128284](https://github.com/openclaw/openclaw/pull/128284)
- fix（feishu）： 保留文档评论回复中的附件 [#129259](https://github.com/openclaw/openclaw/pull/129259)
- fix（飞书）：按顺序发送丰富的帖子附件，无需重复下载 [#129472](https://github.com/openclaw/openclaw/pull/129472)
- fix（feishu）：在主题回复中传递附件别名 [#130023](https://github.com/openclaw/openclaw/pull/130023)
- fix（feishu）：保留选择后备卡中的命令[#130515](https://github.com/openclaw/openclaw/pull/130515)

</details>

</Accordion>

<Accordion title="Mattermost">

[Mattermost](/channels/mattermost) 现在可以从操作员启用该功能后机器人已经可以访问的通道读取有界的分页历史记录。重写或取消回复的集成现在可以在交付之前完成该工作，从而防止早期预览暴露挂钩删除或更改的内容。完成的发送还可以跨预览、操作、媒体和持久路径保留真实的 Mattermost 帖子身份。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加受保护的 Mattermost 通道历史记录读取 [#110875](https://github.com/openclaw/openclaw/pull/110875)
- 添加选择加入 Mattermost DM 按聊天类型进行线程 [#98111](https://github.com/openclaw/openclaw/pull/98111)
- 重新加载时仅重新启动已更改的 Mattermost 帐户 [#99312](https://github.com/openclaw/openclaw/pull/99312)

**错误修复**

- 防止 Mattermost 挂钩泄漏预重写预览 [#114968](https://github.com/openclaw/openclaw/pull/114968)
- 保留 Mattermost 外向交货结算 [#116142](https://github.com/openclaw/openclaw/pull/116142)
- 向 Mattermost REST 请求添加截止日期 [#102027](https://github.com/openclaw/openclaw/pull/102027)
- 发送 Mattermost 带有空白附件占位符的文本 [#108281](https://github.com/openclaw/openclaw/pull/108281)
- 在所选对话中保留 Mattermost 反应 [#108634](https://github.com/openclaw/openclaw/pull/108634)
- 保留工具警告后最终确定的 Mattermost 回复 [#109555](https://github.com/openclaw/openclaw/pull/109555)
- Preserve 在重新启动时收到了 Mattermost 帖子 [#110386](https://github.com/openclaw/openclaw/pull/110386)
- 保留策略安全 Mattermost 组历史记录 [#115773](https://github.com/openclaw/openclaw/pull/115773)
- Honor 在 Mattermost 消息信封中配置的时区 [#116145](https://github.com/openclaw/openclaw/pull/116145)
- 保持 Mattermost 消息由发送者隔离 [#124531](https://github.com/openclaw/openclaw/pull/124531)
- fix（mattermost）：锚机器人提及在用户名边界上匹配 [#129555](https://github.com/openclaw/openclaw/pull/129555)
- fix（mattermost）：下载失败时保留服务器文件名[#129556](https://github.com/openclaw/openclaw/pull/129556)
- fix（mattermost）：正常回复默默地删除按钮和演示 [#129579](https://github.com/openclaw/openclaw/pull/129579)
- 保留 Mattermost 块流文本和工具站 [#87449](https://github.com/openclaw/openclaw/pull/87449)
- 在一次对话中保留 Mattermost 专用通道线程 [#96645](https://github.com/openclaw/openclaw/pull/96645)
- 接受 Mattermost 命令文本模式并修复 CI [2c95bd2](https://github.com/openclaw/openclaw/commit/2c95bd2)
- 在 Mattermost 调试预览中保持表情符号完整 [#101630](https://github.com/openclaw/openclaw/pull/101630)
- Bound Mattermost 查找缓存 [#101740](https://github.com/openclaw/openclaw/pull/101740)
- Keep Mattermost 斜杠命令诊断 Unicode 安全 [#102607](https://github.com/openclaw/openclaw/pull/102607)
- Bound Mattermost 不透明目标缓存增长 [#103258](https://github.com/openclaw/openclaw/pull/103258)
- 停止阻止 Mattermost 附件阻止邮件 [#104575](https://github.com/openclaw/openclaw/pull/104575)
- Honor配置的Mattermost回调旁路路径[#104618](https://github.com/openclaw/openclaw/pull/104618)
- 保留 Mattermost 私人对话起源 [#115726](https://github.com/openclaw/openclaw/pull/115726)
- 防止 Mattermost 消息到达错误团队的频道 [#118622](https://github.com/openclaw/openclaw/pull/118622)
- 保留未命名 Mattermost 上传的文件扩展名 [#119535](https://github.com/openclaw/openclaw/pull/119535)
- fix（mattermost）：上传失败时代理媒体回复会默默地删除附件[#125338](https://github.com/openclaw/openclaw/pull/125338)
- fix（mattermost）：反应动作拒绝原始表情符号字形[#125370](https://github.com/openclaw/openclaw/pull/125370)
- fix（mattermost）： 表面 websocket 身份验证失败并退避 [#129501](https://github.com/openclaw/openclaw/pull/129501)
- 拒绝不安全 Mattermost API 路径段 [#98390](https://github.com/openclaw/openclaw/pull/98390)

</details>

</Accordion>

<Accordion title="Matrix">

[Matrix](/channels/matrix) 回复现在可以使用本机剧透、下划线、表格以及最多 100 个可发现的房间或个人自定义表情。更重要的是，当加密不可用时，加密房间现在会明显失败，而不是悄悄地退回到纯文本、附件、文件名或媒体元数据。大型表格仍然可以选择自己的可读格式后备，而不会削弱房间的机密边界。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加原生 Matrix 剧透、下划线和表格 [#113199](https://github.com/openclaw/openclaw/pull/113199)
- Matrix 自定义表情发现和缓存的 Discord 表情符号列表 [#128518](https://github.com/openclaw/openclaw/pull/128518)
- 将 Matrix 重放保护移至共享重复数据删除系统 [#104391](https://github.com/openclaw/openclaw/pull/104391)
- 添加更安全的Matrix恢复密钥输入并分割E2EE QA所有权[#107828](https://github.com/openclaw/openclaw/pull/107828)

**错误修复**

- 迁移 Matrix 重复数据删除状态，无需重新扫描旧数据库 [#113487](https://github.com/openclaw/openclaw/pull/113487)
- 区块明文Matrix发送到加密房间[#118609](https://github.com/openclaw/openclaw/pull/118609)
- Stop Matrix 关闭期间启动身份重试 [#110115](https://github.com/openclaw/openclaw/pull/110115)
- 保留 Matrix 线程分页标记 [#111243](https://github.com/openclaw/openclaw/pull/111243)
- 在旧版快照升级期间保留 Matrix 加密密钥 [#112919](https://github.com/openclaw/openclaw/pull/112919)
- 跳过历史 Matrix 根源于已解决的重启 [#113489](https://github.com/openclaw/openclaw/pull/113489)
- Render Matrix 历史记录和折叠流式编辑 [#115014](https://github.com/openclaw/openclaw/pull/115014)
- Hide Matrix 出站挂钩可以修改回复时的草稿 [#115240](https://github.com/openclaw/openclaw/pull/115240)
- 防止私人推理到达Matrix房间[#115553](https://github.com/openclaw/openclaw/pull/115553)
- 报告 Matrix 自动回复发货结算 [#116271](https://github.com/openclaw/openclaw/pull/116271)
- 保留 Matrix 线程和会话所有权 [#116802](https://github.com/openclaw/openclaw/pull/116802)
- 修复 Matrix 音频持续时间、反应寻呼和成员名称 [#116890](https://github.com/openclaw/openclaw/pull/116890)
- 在丢失成功响应后恢复Matrix持久发送[#117008](https://github.com/openclaw/openclaw/pull/117008)
- 回复有效的纯文本Matrix提及[#117764](https://github.com/openclaw/openclaw/pull/117764)
- 保留完整的Matrix多部分交货收据[#118128](https://github.com/openclaw/openclaw/pull/118128)
- 保留缩进的Matrix代码而不发送提及[#118497](https://github.com/openclaw/openclaw/pull/118497)
- 使Matrix加密-客户端关闭确定性[#119570](https://github.com/openclaw/openclaw/pull/119570)
- 跨账户隔离共享 Matrix 客户端 [#119667](https://github.com/openclaw/openclaw/pull/119667)
- 跨附件扇出保留 Matrix 传送身份 [#121006](https://github.com/openclaw/openclaw/pull/121006)
- 在替换失败时保持 Matrix 流式回复可见 [#122850](https://github.com/openclaw/openclaw/pull/122850)
- fix（矩阵）：保护格式错误的民意调查答案而不是抛出 TypeError [#123231](https://github.com/openclaw/openclaw/pull/123231)
- 接受无后缀 Matrix Room v12 ID [#123931](https://github.com/openclaw/openclaw/pull/123931)
- 在断开连接的同步重新启动后恢复 Matrix 提供程序 [#125362](https://github.com/openclaw/openclaw/pull/125362)
- 恢复 Matrix 后期操作完成后重试 [#126712](https://github.com/openclaw/openclaw/pull/126712)
- fix（矩阵）：防止轮询历史记录挂在重复的光标上 [#128214](https://github.com/openclaw/openclaw/pull/128214)
- fix（矩阵）：保留转义字符、链接和图像标签 [#128382](https://github.com/openclaw/openclaw/pull/128382)
- fix（矩阵）：当附件列表为空时发送后备媒体 [#128479](https://github.com/openclaw/openclaw/pull/128479)
- fix（矩阵）：在回复和线程上下文中显示编辑的消息 [#128763](https://github.com/openclaw/openclaw/pull/128763)
- fix（矩阵）：让后续转向主动转弯[#128907](https://github.com/openclaw/openclaw/pull/128907)
- fix（矩阵）：禁用线程时保留显式回复 [#129415](https://github.com/openclaw/openclaw/pull/129415)
- fix（矩阵）：保留网关故障后的批准反应 [#129879](https://github.com/openclaw/openclaw/pull/129879)
- fix（矩阵）：在房间历史记录中保留附件标记[#130123](https://github.com/openclaw/openclaw/pull/130123)
- fix（矩阵）：自动回复丢失本机表格式 [#130820](https://github.com/openclaw/openclaw/pull/130820)
- fix（会话）：在规范更新期间保留不同的房间[#132242](https://github.com/openclaw/openclaw/pull/132242)
- 保留 Matrix 反向代理家庭服务器路径 [#93516](https://github.com/openclaw/openclaw/pull/93516)
- 当解密密钥延迟到达时恢复 Matrix 消息 [#94416](https://github.com/openclaw/openclaw/pull/94416)
- 保留截断的 Matrix 文本 UTF-16 安全 [#102395](https://github.com/openclaw/openclaw/pull/102395)
- 正确解析混合大小写 Matrix JSON 响应类型 [#105470](https://github.com/openclaw/openclaw/pull/105470)
- 在 Matrix 引导程序诊断中保留有效的 UTF-8 [#105475](https://github.com/openclaw/openclaw/pull/105475)
- 恢复排队后续的 Matrix 草稿预览 [#108094](https://github.com/openclaw/openclaw/pull/108094)
- 拒绝超大管道 Matrix 恢复密钥 [#108120](https://github.com/openclaw/openclaw/pull/108120)
- Preserve Matrix 在响应清理失败时重定向 [#111105](https://github.com/openclaw/openclaw/pull/111105)
- 接受备案的自动Matrix审批模式[#115676](https://github.com/openclaw/openclaw/pull/115676)
- Surface Matrix 发货后打字刷新失败 [#117059](https://github.com/openclaw/openclaw/pull/117059)
- 忽略无效的Matrix环境帐户转义[#120428](https://github.com/openclaw/openclaw/pull/120428)
- 当mediaMaxMb为零或负数时让Matrix发送媒体 [#120466](https://github.com/openclaw/openclaw/pull/120466)
- 在报告成功之前验证 Matrix 通道探测 [#123766](https://github.com/openclaw/openclaw/pull/123766)
- 通过干净关闭保留 Matrix 线程活动 [#125039](https://github.com/openclaw/openclaw/pull/125039)
- fix（矩阵）：等待持久性关闭[#129605](https://github.com/openclaw/openclaw/pull/129605)
- fix（矩阵）：保留带有空白媒体 URL [#129739](https://github.com/openclaw/openclaw/pull/129739) 的加密附件
- fix（矩阵）：接受环境 SecretRefs 与共享默认别名​​ [#132352](https://github.com/openclaw/openclaw/pull/132352)

</details>

</Accordion>

<Accordion title="Microsoft Teams">

配置的 [Microsoft Teams](/channels/msteams) 审批者可以在请求开始的聊天或频道线程中批准或拒绝来自本机自适应卡的合格执行和插件请求，然后查看同一张卡上记录的结果。引用的回复、附件、流结果和重复处理也仍然与原始对话绑定。这些卡仅涵盖配置的执行和插件请求，并且需要有效的身份验证、权限、租户授权和路由。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- feat（msteams）：用于执行和插件批准的本机自适应卡 approve/deny [#129997](https://github.com/openclaw/openclaw/pull/129997)

**错误修复**

- fix（通道）：降级不可用的凭证文件[#127539](https://github.com/openclaw/openclaw/pull/127539)
- 恢复 Microsoft Teams 回复中引用的消息上下文 [#101856](https://github.com/openclaw/openclaw/pull/101856)
- 在空白崩溃后保留Teams流块[#102357](https://github.com/openclaw/openclaw/pull/102357)
- 识别混合大小写 Microsoft Teams 附件 [#102431](https://github.com/openclaw/openclaw/pull/102431)
- Bound 停止 Microsoft Teams 文件同意上传 [#104120](https://github.com/openclaw/openclaw/pull/104120)
- Bound MS Teams SharePoint 文件发送并因共享错误而关闭失败 [#104288](https://github.com/openclaw/openclaw/pull/104288)
- Bound Microsoft Teams 代币获取截止日期 [#106386](https://github.com/openclaw/openclaw/pull/106386)
- 忽略空白 Microsoft Teams 证书路径 [#109112](https://github.com/openclaw/openclaw/pull/109112)
- 在确认之前保留 Microsoft Teams 活动 [#110357](https://github.com/openclaw/openclaw/pull/110357)
- 保留同名Teams SharePoint上传[#113560](https://github.com/openclaw/openclaw/pull/113560)
- 防止 Microsoft Teams 预览绕过出站挂钩 [#115551](https://github.com/openclaw/openclaw/pull/115551)
- 防止 Teams 流式传输失败后出现重复的长回复 [#115669](https://github.com/openclaw/openclaw/pull/115669)
- 恢复 Microsoft Teams 对话允许列表 [#115746](https://github.com/openclaw/openclaw/pull/115746)
- 防止重复 Microsoft Teams 最终回复 [#116398](https://github.com/openclaw/openclaw/pull/116398)
- 保留确认Microsoft Teams流结算[#116515](https://github.com/openclaw/openclaw/pull/116515)
- 将Microsoft Teams卡和轮询保留在通道线程中[#117516](https://github.com/openclaw/openclaw/pull/117516)
- 在 Microsoft Teams 中交付批准的工作区附件 [#117776](https://github.com/openclaw/openclaw/pull/117776)
- 可靠释放渠道交付资源 [#117855](https://github.com/openclaw/openclaw/pull/117855)
- Honor Teams 入站附件的通道限制 [#122315](https://github.com/openclaw/openclaw/pull/122315)
- 在 Microsoft Teams 投票中保留不同的选择 [#123070](https://github.com/openclaw/openclaw/pull/123070)
- 避免在不确定的交付失败后重复 Teams 回复 [#125127](https://github.com/openclaw/openclaw/pull/125127)
- 在持久重播后保留 Microsoft Teams 回复上下文 [#126169](https://github.com/openclaw/openclaw/pull/126169)
- fix（msteams）：恢复丢失的通道线程上下文[#128901](https://github.com/openclaw/openclaw/pull/128901)
- fix（msteams）：保留遗留存储，直到迁移证明幸存者 [#131284](https://github.com/openclaw/openclaw/pull/131284)
- 安全恢复Microsoft Teams频道和群聊文件[#90738](https://github.com/openclaw/openclaw/pull/90738)
- 绑定Microsoft Teams组查找缓存[#102814](https://github.com/openclaw/openclaw/pull/102814)
- Share HTML 跨核心和插件的实体解码 [#107235](https://github.com/openclaw/openclaw/pull/107235)
- 显示 URL- 托管的 Microsoft Teams 附件的可读文件名 [#115127](https://github.com/openclaw/openclaw/pull/115127)
- 识别提供商前缀 Microsoft Teams 目标 ID [#115609](https://github.com/openclaw/openclaw/pull/115609)
- 接受联合凭据后启用 Microsoft Teams [#118931](https://github.com/openclaw/openclaw/pull/118931)
- 对于不兼容的 Teams 探头模式返回无效请求错误 [#121975](https://github.com/openclaw/openclaw/pull/121975)
- 交付结算后最终确定 Microsoft Teams 发送的事件 [#82354](https://github.com/openclaw/openclaw/pull/82354)
- 在通道线程中保留 Microsoft Teams 附件回复 [#94348](https://github.com/openclaw/openclaw/pull/94348)

</details>

</Accordion>

<Accordion title="Google Chat">

[谷歌Chat](/channels/googlechat)webhook 事件接受者OpenClaw现在通过重新启动保持排队状态，保持每个空间内的顺序，并识别Google在创建重复工作之前重试。当网关承认该事件时恢复开始；事件Google从未交付的产品仍处于恢复路径之外。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**错误修复**

- 在重新启动时保留 Google Chat Webhooks [#110833](https://github.com/openclaw/openclaw/pull/110833)
- 停止无限期挂起的 Google Chat 请求 [#102227](https://github.com/openclaw/openclaw/pull/102227)
- 将 Google Chat 关闭模式回复保留在线程之外 [#104402](https://github.com/openclaw/openclaw/pull/104402)
- 在医生迁移期间保留 Google Chat 流媒体 [#106018](https://github.com/openclaw/openclaw/pull/106018)
- Bound Google Chat 身份验证请求 [#106178](https://github.com/openclaw/openclaw/pull/106178)
- 当线程目标无效时传递 Google Chat 回复 [#108324](https://github.com/openclaw/openclaw/pull/108324)
- 在仅状态请求后释放 Google Chat 套接字 [#111290](https://github.com/openclaw/openclaw/pull/111290)
- Render 出站 Markdown 正确位于 Google Chat [#113024](https://github.com/openclaw/openclaw/pull/113024)
- 停止部分和重复 Google Chat 回复 [#115638](https://github.com/openclaw/openclaw/pull/115638)
- 将 Google Chat 回复块保留在一个回退线程中 [#117053](https://github.com/openclaw/openclaw/pull/117053)
- Keep Google Chat 医生在规范帐户设置中进行修复 [#118972](https://github.com/openclaw/openclaw/pull/118972)
- 在超大附件后保持 Google Chat 车道移动 [#118986](https://github.com/openclaw/openclaw/pull/118986)
- 拒绝 Google Chat 响应中格式错误的 UTF-8 [#120239](https://github.com/openclaw/openclaw/pull/120239)
- 保留部分Google Chat交货证据[#122760](https://github.com/openclaw/openclaw/pull/122760)
- fix（googlechat）：表面不受支持和未处理的附件[#130870](https://github.com/openclaw/openclaw/pull/130870)
- Cap Google Chat 默认媒体下载 [#98425](https://github.com/openclaw/openclaw/pull/98425)
- Bound Google Chat 批准登记 [#101744](https://github.com/openclaw/openclaw/pull/101744)
- Bound Google Chat Webhook 证书获取 [#102924](https://github.com/openclaw/openclaw/pull/102924)
- 关闭超大 Google Chat 身份验证响应及时 [#115873](https://github.com/openclaw/openclaw/pull/115873)
- 在交货收据中保留规范 Google Chat 线程 ID [#116717](https://github.com/openclaw/openclaw/pull/116717)
- 将无效的 Google Chat Webhook URL 报告为被阻止 [#117986](https://github.com/openclaw/openclaw/pull/117986)
- 停止重试过时的 Google Chat 审批卡 [#118225](https://github.com/openclaw/openclaw/pull/118225)
- 启动时阻止不可用的 Google Chat Webhook 配置 [#118968](https://github.com/openclaw/openclaw/pull/118968)

</details>

</Accordion>

<Accordion title="LINE">

[LINE](/channels/line) 将混合的丰富回复、快速操作和媒体保留在一起，在响应合适时使用回复路径最多五个消息，而不是不必要地消耗 Push API 配额。不适合 Flex 卡的长代码会退回到普通块，不受支持的媒体仍然作为链接可见，空白或拒绝的丰富结构不再保留整个回复。

在需要提及的组中，发送给机器人的斜线命令现在作为命令运行，并且引用其最近网关发送的消息之一可以解决它而无需再次提及。日期、时间和丰富的菜单选择到达代理，而受支持的操作和选择作为本机控件返回，其中包含 LINE 无法呈现的任何内容的可见文本。

当机器人实际加入允许的组时，它还可以发布一个特定于房间的介绍，同时尊重频道范围和每个帐户的选择退出。 Webhook 事件在确认之前存储，因此已确认的工作 OpenClaw 可以在重新启动后继续。通过短暂的预排空队列转换的受影响安装会在恢复交付之前迁移符合条件的已接受行，而真正不匹配的行仍处于隔离状态，并且已删除帐户的邮件会等待该帐户恢复。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- feat（频道）：添加Matrix和LINE加入介绍[#131128](https://github.com/openclaw/openclaw/pull/131128)
- 将 LINE 丰富消息移动到类型化结构化输出 [#124755](https://github.com/openclaw/openclaw/pull/124755)

**错误修复**

- 保持LINE丰富的回复和快速的行动完好无损[#109011](https://github.com/openclaw/openclaw/pull/109011)
- 防止 LINE webhook 事件默默丢失 [#109655](https://github.com/openclaw/openclaw/pull/109655)
- fix（行）：升级时将预排出线轴行迁移到规范队列合同 [#110058](https://github.com/openclaw/openclaw/pull/110058)
- 防止重复接受LINE和Mattermost消息[#117024](https://github.com/openclaw/openclaw/pull/117024)
- fix（line）：运行与机器人提及的 [#131838](https://github.com/openclaw/openclaw/pull/131838) 一起发送的组斜杠命令
- 将内部工具痕迹排除在 LINE 回复之外 [#101708](https://github.com/openclaw/openclaw/pull/101708)
- 防止畸形的LINE议程和设备卡被丢弃[#105381](https://github.com/openclaw/openclaw/pull/105381)
- Preserve LINE 在模板字段为空时回复 [#105520](https://github.com/openclaw/openclaw/pull/105520)
- 修复：将 LINE 组白名单范围保持在 [AI] [#106056](https://github.com/openclaw/openclaw/pull/106056)
- 发送可播放的LINE视频和音频回复[#106515](https://github.com/openclaw/openclaw/pull/106515)
- 防止内联斜杠文本绕过 LINE 组提及 [#107230](https://github.com/openclaw/openclaw/pull/107230)
- 在并发提及期间保留 LINE 组上下文 [#107367](https://github.com/openclaw/openclaw/pull/107367)
- 在内容仍在准备时重试 LINE 媒体 [#108351](https://github.com/openclaw/openclaw/pull/108351)
- Redact LINE 来自验证错误的媒体 URL [#108657](https://github.com/openclaw/openclaw/pull/108657)
- Bound LINE 发送方配置文件缓存增长 [#109750](https://github.com/openclaw/openclaw/pull/109750)
- 通过重新启动和调度失败保留 LINE Webhooks [#109819](https://github.com/openclaw/openclaw/pull/109819)
- 关闭期间等待延迟的 LINE 入口释放 [#110104](https://github.com/openclaw/openclaw/pull/110104)
- 重试瞬时 LINE 入站媒体下载 [#110921](https://github.com/openclaw/openclaw/pull/110921)
- 防止 LINE 重新加载挂在交付停滞的状态 [#110971](https://github.com/openclaw/openclaw/pull/110971)
- 防止过大的 LINE 操作丢弃回复 [#113081](https://github.com/openclaw/openclaw/pull/113081)
- Mark 持久接受 LINE webhook 交付 [#115796](https://github.com/openclaw/openclaw/pull/115796)
- 保留 LINE 提供商交付收据和部分发送进度 [#116879](https://github.com/openclaw/openclaw/pull/116879)
- 防止在不确定交货后重复 LINE 回复 [#117126](https://github.com/openclaw/openclaw/pull/117126)
- 保留更长的LINE卡片和模板描述[#117280](https://github.com/openclaw/openclaw/pull/117280)
- 保留超大号LINE表交货单[#117335](https://github.com/openclaw/openclaw/pull/117335)
- 保留LINE降价表中的所有行[#117481](https://github.com/openclaw/openclaw/pull/117481)
- Preserve LINE 在位置字段为空时回复 [#118064](https://github.com/openclaw/openclaw/pull/118064)
- fix（行）：防止无限提供者响应缓冲 [#119099](https://github.com/openclaw/openclaw/pull/119099)
- 保持非正 LINE 媒体限制，防止丢弃附件 [#121184](https://github.com/openclaw/openclaw/pull/121184)
- 重试 LINE 推送无重复消息 [#124464](https://github.com/openclaw/openclaw/pull/124464)
- 防止 LINE 入站媒体下载挂起 [#124606](https://github.com/openclaw/openclaw/pull/124606)
- fix（行）：保留完整的Flex动作标签直至LINE的限制[#128712](https://github.com/openclaw/openclaw/pull/128712)
- fix（line）： 保留丰富的消息源顺序 [#129916](https://github.com/openclaw/openclaw/pull/129916)
- fix（line）：在拒绝丰富消息后保留快速回复 [#130076](https://github.com/openclaw/openclaw/pull/130076)
- fix（line）： /card 在其数据内的逗号处拆分操作、列表项或收据条目 [#131195](https://github.com/openclaw/openclaw/pull/131195)
- fix（行）：重播永久拒绝的消息而不是解决[#131285](https://github.com/openclaw/openclaw/pull/131285)
- fix（line）：阻止空白卡字段丢失整个回复 [#131854](https://github.com/openclaw/openclaw/pull/131854)
- fix（line）：给代理选择一个回发端[#132014](https://github.com/openclaw/openclaw/pull/132014)
- fix（line）：让机器人的引用在一个组中解决它 [#132055](https://github.com/openclaw/openclaw/pull/132055)
- fix（line）：为代理提供 LINE 知道的名称，而不是原始 ID [#132108](https://github.com/openclaw/openclaw/pull/132108)
- fix（行）：撤销凭证轮流替换[#132150](https://github.com/openclaw/openclaw/pull/132150)
- fix（line）：提供代理回复提供的控制 [#132479](https://github.com/openclaw/openclaw/pull/132479)
- fix（line）：按照 URL 证明的类型发送出站媒体 [#132551](https://github.com/openclaw/openclaw/pull/132551)
- fix（line）： 传送 Flex 卡无法容纳的代码块 [#132558](https://github.com/openclaw/openclaw/pull/132558)
- 在 LINE 无效收件人错误中保持表情符号完整 [#104109](https://github.com/openclaw/openclaw/pull/104109)
- 启用聊天中 LINE 允许列表编辑 [#106638](https://github.com/openclaw/openclaw/pull/106638)
- 在批量和自动回复发送之前验证 LINE 媒体 [#108917](https://github.com/openclaw/openclaw/pull/108917)
- 保留 LINE 消息中的链接和样式 [#112921](https://github.com/openclaw/openclaw/pull/112921)
- 保留结构化 LINE webhook 错误详细信息 [#113606](https://github.com/openclaw/openclaw/pull/113606)
- 保留完整的LINE Flex替代文本[#117217](https://github.com/openclaw/openclaw/pull/117217)
- 在 LINE 围栏代码卡中保留缩进 [#117996](https://github.com/openclaw/openclaw/pull/117996)
- 完全删除默认LINE账户[#118055](https://github.com/openclaw/openclaw/pull/118055)
- 以文本形式提供不可渲染的 LINE 位置 [#126298](https://github.com/openclaw/openclaw/pull/126298)
- fix（line）：描述 LINE 实际发送的入站贴纸 [#131872](https://github.com/openclaw/openclaw/pull/131872)
- fix（line）：应用团体配置的技能范围[#132501](https://github.com/openclaw/openclaw/pull/132501)
- fix（line）：使用其实时配置处理每个事件 [#132592](https://github.com/openclaw/openclaw/pull/132592)

**文档**

- docs（行）：文档入站持久性、重试策略和死信恢复 [#115702](https://github.com/openclaw/openclaw/pull/115702)

</details>

</Accordion>

<Accordion id="sms-mms-and-rcs-with-twilio" title="SMS、MMS 和 RCS 与 Twilio">

[ Twilio 支持的通道 ](/channels/sms) 现在可以发送和接收 MMS 并显示最近的提供商或运营商状态，例如已发送、已送达、失败或冲突，而无需保留消息正文或电话号码地址。 SMS 和 RCS 已接受的消息 OpenClaw 可以在发送者顺序重新启动后继续存在，而重播保护失败关闭，而不是接受它不再能够防止重复的工作。

递送观察结果保留 30 天，反映 Twilio 或承运人报告的最新状态，这可能与收件人可见的递送不同。如果重播缓存已满，新事件将被拒绝而不是在没有重复保护的情况下接受，并且 Twilio 默认情况下不会重试该响应。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 向 SMS 通道添加 Twilio MMS 支持 [#118664](https://github.com/openclaw/openclaw/pull/118664)
- 跟踪 Twilio SMS [#118665](https://github.com/openclaw/openclaw/pull/118665) 的交付结果

**错误修复**

- 在确认 Webhook 之前对 Twilio 消息进行持久排队 [#109866](https://github.com/openclaw/openclaw/pull/109866)
- 在 SMS 流量较大时保留 Twilio 重放保护 [#101107](https://github.com/openclaw/openclaw/pull/101107)
- 将 Twilio RCS 发送器标准化为 SMS 路由 [#102373](https://github.com/openclaw/openclaw/pull/102373)
- 保护有效的 SMS 回调免受无效 Webhook 流量的影响 [#103620](https://github.com/openclaw/openclaw/pull/103620)
- 隔离 Twilio SMS 发件人的 Webhook 配额 [#104862](https://github.com/openclaw/openclaw/pull/104862)
- 防止零 SMS 块限制发送每个字符的文本 [#118158](https://github.com/openclaw/openclaw/pull/118158)
- 重试瞬时 Twilio MMS 附件下载 [#118994](https://github.com/openclaw/openclaw/pull/118994)
- 重试 Twilio MMS 在标头后停止的下载 [#119002](https://github.com/openclaw/openclaw/pull/119002)
- 授权通过 SMS 接收的文本斜线命令 [#90998](https://github.com/openclaw/openclaw/pull/90998)
- 忽略空白 Twilio SMS 帐户回退 [#109149](https://github.com/openclaw/openclaw/pull/109149)
- 在 SMS 电话前缀后接受空格 [#111111](https://github.com/openclaw/openclaw/pull/111111)

**文档**

- 添加 Twilio A2P 设置和交付故障排除指南 [#88743](https://github.com/openclaw/openclaw/pull/88743)

</details>

</Accordion>

<Accordion title="ClickClack">

[ClickClack](/channels/clickclack) 可以在 OpenClaw 会话旁边进行团队讨论，为人们提供协调工作的地方，而无需将代理的主要记录变成会议室。引导式命令行设置、可读的讨论名称、本机命令菜单、附件、可选的组提及规则和选择加入进度使该房间更易于使用，同时保持最终答案可见。

展开讨论仍然需要授权操作员和可到达的 ClickClack 部署。生成的名称仍会尽力而为，并且必须有意启用提及门控或机器人到机器人的对话。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 向 ClickClack 添加本机命令菜单 [#107907](https://github.com/openclaw/openclaw/pull/107907)
- 添加引导和命令行 ClickClack 设置 [#108271](https://github.com/openclaw/openclaw/pull/108271)
- 添加ClickClack会话讨论频道[#111503](https://github.com/openclaw/openclaw/pull/111503)
- Name ClickClack 来自会话标题的讨论 [#114711](https://github.com/openclaw/openclaw/pull/114711)
- 在打开 ClickClack 讨论之前生成标题 [#114740](https://github.com/openclaw/openclaw/pull/114740)
- 添加ClickClack群提门控[#115484](https://github.com/openclaw/openclaw/pull/115484)
- 在 ClickClack 中显示选择加入本机代理进度 [#116683](https://github.com/openclaw/openclaw/pull/116683)
- 为 ClickClack [#119278](https://github.com/openclaw/openclaw/pull/119278) 添加受保护的机器人到机器人工作流程
- 验证 ClickClack 设置并显示正确的下一步 [#108332](https://github.com/openclaw/openclaw/pull/108332)
- 使用一次性设置代码配置ClickClack [#109398](https://github.com/openclaw/openclaw/pull/109398)
- 支持私有HTTP服务器上的ClickClack设置代码[#109429](https://github.com/openclaw/openclaw/pull/109429)
- 分离ClickClack的公共和私有端点[#111724](https://github.com/openclaw/openclaw/pull/111724)
- 将会话更改传递到插件服务 [#114813](https://github.com/openclaw/openclaw/pull/114813)

**错误修复**

- 交付ClickClack附件并兑现模型输出预算[#105775](https://github.com/openclaw/openclaw/pull/105775)
- 使 ClickClack 会话讨论在实际部署中开放 [#111685](https://github.com/openclaw/openclaw/pull/111685)
- Bound ClickClack 入站 WebSocket 帧 [#102480](https://github.com/openclaw/openclaw/pull/102480)
- 防止 ClickClack 历史记录在重启后重播 [#102486](https://github.com/openclaw/openclaw/pull/102486)
- 发货前清理ClickClack助手文本[#103142](https://github.com/openclaw/openclaw/pull/103142)
- 在重新连接延迟期间立即停止ClickClack [#108145](https://github.com/openclaw/openclaw/pull/108145)
- 防止 ClickClack 重新连接跳过入站事件 [#108577](https://github.com/openclaw/openclaw/pull/108577)
- 支持 ClickClack v1 精确设置声明 URL [#111927](https://github.com/openclaw/openclaw/pull/111927)
- 保留 ClickClack 帖子回复消失 [#117225](https://github.com/openclaw/openclaw/pull/117225)
- 保留 ClickClack 托管讨论绑定 [#118851](https://github.com/openclaw/openclaw/pull/118851)
- 跨会话更改保留 ClickClack 讨论室 [#119358](https://github.com/openclaw/openclaw/pull/119358)
- 从停滞的 WebSocket 握手中恢复 ClickClack 监视器 [#106485](https://github.com/openclaw/openclaw/pull/106485)
- 在 macOS 仪表板中显示 ClickClack 讨论 [#111883](https://github.com/openclaw/openclaw/pull/111883)
- 使用配置的默认代理进行全局 ClickClack 讨论 [#113997](https://github.com/openclaw/openclaw/pull/113997)
- 保留未命名 ClickClack 上传的文件扩展名 [#119646](https://github.com/openclaw/openclaw/pull/119646)
- 澄清 ClickClack 命令菜单启动错误 [#126802](https://github.com/openclaw/openclaw/pull/126802)
- fix（clickclack）：帐户关闭后停止排队消息 [#128672](https://github.com/openclaw/openclaw/pull/128672)

</details>

</Accordion>

<Accordion id="reef" title="礁">

Trusted Claws 可以直接通过 [Reef](/channels/reef)（OpenClaw 的捆绑端到端加密代理通道）进行通信，使用朋友代码配对、终端注册和友谊控制以及保持外部对等点与本地线程不同的发现。运营商现在可以为自己的敏感主题和指定朋友添加简单语言的入站和出站共享规则，同时对秘密和凭据的确定性拒绝仍然有效，并且更改规则会使旧策略的待批准失效。

当入站消息需要所有者审核时，记录的决策现在拥有稍后的重新传递，而不是重新运行防护直到答案发生变化，并且稍后的收件箱消息可以在等待时继续移动。临时的入站警卫故障会使该项目停放以等待另一次尝试，而不是拒绝它，批准的投递会收到最后一次警卫检查，而出站发送仍然会快速失败。

当对等方拒绝一条消息时，发送代理会获得有限的反馈，并在停止接受所有者指导之前重新措辞的受控机会，而不是在循环中争论。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加无头礁石注册和友谊 CLI [d361b4c](https://github.com/openclaw/openclaw/commit/d361b4c)
- 捆绑 Reef 加密代理间通道 [#106232](https://github.com/openclaw/openclaw/pull/106232)
- 表面珊瑚礁拒绝并允许常规代理协作 [#109160](https://github.com/openclaw/openclaw/pull/109160)
- 将外部对话与本地代理会话分开 [#109411](https://github.com/openclaw/openclaw/pull/109411)
- feat（reef）：操作员可配置的守卫共享规则 [#131167](https://github.com/openclaw/openclaw/pull/131167)
- 当交货仍未确认时通知 Reef 发件人 [#110938](https://github.com/openclaw/openclaw/pull/110938)

**错误修复**

- 在首次联系之前发现可信的 Reef 同行 [#109905](https://github.com/openclaw/openclaw/pull/109905)
- 在通道崩溃后停止礁石重新连接循环 [#110870](https://github.com/openclaw/openclaw/pull/110870)
- fix（reef）：停放的业主检查自己的入库交货，而不是重新滚动防护装置 [#132420](https://github.com/openclaw/openclaw/pull/132420)
- Bound Reef 继电器 JSON 响应读取 [#106456](https://github.com/openclaw/openclaw/pull/106456)
- 通过连接的网关发送 Reef 消息 [#107373](https://github.com/openclaw/openclaw/pull/107373)
- 为 Reef 中继请求添加截止日期 [#108333](https://github.com/openclaw/openclaw/pull/108333)
- 启动时拒绝空白珊瑚礁防护凭据 [#109667](https://github.com/openclaw/openclaw/pull/109667)
- Bind 首先转向目录发现的 Reef 对等点 [#110029](https://github.com/openclaw/openclaw/pull/110029)
- 网关重启后恢复 Reef 收件箱 [#110100](https://github.com/openclaw/openclaw/pull/110100)
- 保留已接受的因收件箱交付停滞而收到的 Reef 收据 [#110177](https://github.com/openclaw/openclaw/pull/110177)
- 通过启动继电器节流保持Reef运行 [#110918](https://github.com/openclaw/openclaw/pull/110918)
- Hide Reef 和 Zalo 中的内部工具痕迹个人回复 [#112621](https://github.com/openclaw/openclaw/pull/112621)
- Bind 在线程对话后发现对等点 [#125514](https://github.com/openclaw/openclaw/pull/125514)
- 在短暂的珊瑚礁重新连接期间保持网关准备状态稳定 [#126151](https://github.com/openclaw/openclaw/pull/126151)
- fix（reef）：停止公开已停用帐户运行时 [#129131](https://github.com/openclaw/openclaw/pull/129131)
- 恢复Reef通道配置发现[2d5803a](https://github.com/openclaw/openclaw/commit/2d5803a)
- Bound Reef 收件箱 WebSocket 框架 [#108886](https://github.com/openclaw/openclaw/pull/108886)
- 停止停滞的礁石收件箱握手 [#109052](https://github.com/openclaw/openclaw/pull/109052)
- refactor（reef）：删除手动维护的清单架构副本 [#131292](https://github.com/openclaw/openclaw/pull/131292)

**文档**

- 添加 Reef 通道设置和插件文档 [4a7f8c5](https://github.com/openclaw/openclaw/commit/4a7f8c5)

</details>

</Accordion>

<Accordion id="agent-to-agent-messaging-with-a2a" title="使用 A2A 进行代理间消息传递">

OpenClaw 现在可以通过 [A2A v1.0 协议 ](/channels/a2a) 将选定的代理公开给明确信任的外部代理系统。配置的对等点可以发现这些代理，提交和轮询经过身份验证的任务，接收作为工件的回复，并交换文本或结构化数据，而未配置的插件根本不注册任何发现或任务路由。

第一个版本支持一个帐户，将任务保留在内存中，并且尚不提供流媒体、推送通知或取消。经过身份验证的对等点当前作为受信任的调用者运行，而不是通过正常的命令策略决策，因此这是已知对等点而不是公共代理端点的故意互操作路径。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- feat（a2a）：添加 A2A v1.0 代理互操作通道插件 [#130008](https://github.com/openclaw/openclaw/pull/130008)

**错误修复**

- fix（a2a）：绑定出站 JSON 响应正文 [#132273](https://github.com/openclaw/openclaw/pull/132273)
- fix（a2a）：出站发送 [#130873](https://github.com/openclaw/openclaw/pull/130873) 后关闭请求连接

</details>

</Accordion>

<Accordion id="buzz" title="嗡嗡声">

[Buzz](/channels/buzz) 现在是团队房间的官方 OpenClaw 频道，具有引导设置，可以将不同的房间路由到不同的座席和实时目录，为这些座席提供当前的房间和成员名称，而无需替换用于自动化的稳定 UUID。一个网关现在可以运行具有单独机器人身份、凭据、房间、路由和生命周期的命名 Buzz 帐户，同时保留旧的根帐户和环境回退，并且更新一个帐户不会不必要地断开健康的同级帐户。

回复可以使用本机提及和线程，操作员可以选择平面自动回复和键入，同时显式消息工具和 CLI 目标保持显式。提及门控房间可以将少量最近授权的上下文带入下一回合，而无需在每条背景消息上运行模型。

仅在验证机器人角色成员身份、房间名称必须唯一解析才能安全使用、本机提及上限为 50、被动上下文保持选择加入和严格限制后，安装程序才会完成。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加官方Buzz团队房间频道 [#113419](https://github.com/openclaw/openclaw/pull/113419)
- 添加实时 Buzz 目录以及可识别的发件人和房间名称 [#116799](https://github.com/openclaw/openclaw/pull/116799)
- 添加原生 Buzz 提及和房间名称定位 [#117927](https://github.com/openclaw/openclaw/pull/117927)
- feat（buzz）：为接受的回合保留有界被动上下文 [#130509](https://github.com/openclaw/openclaw/pull/130509)
- feat（buzz）：添加命名帐户时保留机器人身份 [#132226](https://github.com/openclaw/openclaw/pull/132226)
- 提高 Buzz 消息保真度 [#116096](https://github.com/openclaw/openclaw/pull/116096)
- 在 Buzz 回复期间显示键入指示器 [#116194](https://github.com/openclaw/openclaw/pull/116194)
- feat（buzz）：授权每个房间的不同发送者[#129655](https://github.com/openclaw/openclaw/pull/129655)
- feat（buzz）：绑定机器人到机器人房间对话 [#130488](https://github.com/openclaw/openclaw/pull/130488)
- feat（buzz）：支持平板自动回复和打字[#130511](https://github.com/openclaw/openclaw/pull/130511)

**错误修复**

- 重新连接后恢复完整的 Buzz 消息积压 [#116925](https://github.com/openclaw/openclaw/pull/116925)
- fix：Buzz 机器人恢复中继停顿并拒绝撤销的发件人 [#130467](https://github.com/openclaw/openclaw/pull/130467)
- fix（buzz）：网关停机期间发送的消息在重启后被丢弃 [#117259](https://github.com/openclaw/openclaw/pull/117259)
- fix（buzz）：绑定NIP-11中继信息响应[#119182](https://github.com/openclaw/openclaw/pull/119182)
- fix（buzz）：停止指定帐户设置替换现有机器人身份 [#129663](https://github.com/openclaw/openclaw/pull/129663)
- fix（buzz）：将代理回复保留在线程根 [#124884](https://github.com/openclaw/openclaw/pull/124884)
- fix（buzz）：在非交互式设置期间保留帐户名称 [#131997](https://github.com/openclaw/openclaw/pull/131997)

**文档**

- 简化 Buzz 插件设置指南 [#114156](https://github.com/openclaw/openclaw/pull/114156)

</details>

</Accordion>

<Accordion id="qq-bot" title="QQ 机器人">

[QQ Bot](/channels/qqbot) 已转移到腾讯的完整性固定外部插件，同时保留公共 `qqbot` 通道 ID 并在腾讯 2.0 可以安全地代表它们时携带现有凭据、帐户选择、白名单、批准限制、流行为和组工具策略。如果旧政策无法在不削弱的情况下进行翻译，Doctor 就会停下来进行明确的修复，而不是悄悄地改变规则。已接受到本地队列中的入站信封也可以在重新启动后恢复。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将QQBot移至腾讯外部插件[#107295](https://github.com/openclaw/openclaw/pull/107295)

**错误修复**

- 为 QQBot 添加持久入站重放 [#110844](https://github.com/openclaw/openclaw/pull/110844)
- 停止 QQBot 语音转录请求 [#102028](https://github.com/openclaw/openclaw/pull/102028)
- Wrap QQ 机器人安全批准命令 [#102119](https://github.com/openclaw/openclaw/pull/102119)
- 分类 QQ 机器人媒体类型（不区分大小写） [#102753](https://github.com/openclaw/openclaw/pull/102753)
- 保留 QQBot 图像的规范 MIME 类型 [#102795](https://github.com/openclaw/openclaw/pull/102795)
- 在QQBot中使用核心打字keepalive循环 [#104438](https://github.com/openclaw/openclaw/pull/104438)
- 在被动发送限制内保持 QQBot 长回复 [#104634](https://github.com/openclaw/openclaw/pull/104634)
- 停止QQBot令牌刷新侦听器构建 [#105886](https://github.com/openclaw/openclaw/pull/105886)
- 超时停滞 QQBot 通道 API 响应机构 [#108895](https://github.com/openclaw/openclaw/pull/108895)
- 忽略空白QQBot应用程序ID [#109460](https://github.com/openclaw/openclaw/pull/109460)
- 防止重放QQBot命令两次清除存储 [#110904](https://github.com/openclaw/openclaw/pull/110904)
- 将 QQBot 访问策略应用于引用的消息上下文 [#114136](https://github.com/openclaw/openclaw/pull/114136)
- 在实时运行时配置上保留 QQBot 路由 [#114227](https://github.com/openclaw/openclaw/pull/114227)
- 心跳ACK停止时重新连接QQBot [#114902](https://github.com/openclaw/openclaw/pull/114902)
- 恢复一次性和重复性QQBot提醒 [#115488](https://github.com/openclaw/openclaw/pull/115488)
- 保留QQBot通道 API 调用活跃账户 [#118575](https://github.com/openclaw/openclaw/pull/118575)
- 保留部分 QQBot 凭证编辑，避免恢复过时的备份 [#120028](https://github.com/openclaw/openclaw/pull/120028)
- 在畸形网关 HELLO 帧后保持 QQBot 连接 [#121031](https://github.com/openclaw/openclaw/pull/121031)
- Bound 停滞 QQBot 令牌请求 [#102897](https://github.com/openclaw/openclaw/pull/102897)
- 防止 QQBot 媒体下载在响应标头之前挂起 [#103018](https://github.com/openclaw/openclaw/pull/103018)
- 超时停滞QQBot响应机构[#103855](https://github.com/openclaw/openclaw/pull/103855)
- 发货结算后清除QQBot语音发送定时器 [#105885](https://github.com/openclaw/openclaw/pull/105885)
- 从停滞中恢复 QQBot WebSocket 握手 [#106484](https://github.com/openclaw/openclaw/pull/106484)
- 正确路由混合大小写的 QQBot 组和通道目标 [#109008](https://github.com/openclaw/openclaw/pull/109008)
- 拒绝空白 QQ 机器人客户端机密环境值 [#109815](https://github.com/openclaw/openclaw/pull/109815)
- Bound QQ Bot 客户端机密文件读取 [#110002](https://github.com/openclaw/openclaw/pull/110002)
- 返回 QQ Bot 媒体下载错误及时 [#119466](https://github.com/openclaw/openclaw/pull/119466)
- 删除误导性 QQBot 数据目录诊断 [#119849](https://github.com/openclaw/openclaw/pull/119849)
- 保留 QQ Bot 群组公告路线 [#98053](https://github.com/openclaw/openclaw/pull/98053)

**文档**

- 正确的QQBot安装包文档[#122417](https://github.com/openclaw/openclaw/pull/122417)

</details>

</Accordion>

<Accordion id="zalo-and-zalo-personal" title="Zalo 和 Zalo 个人">

[Zalo Bot](/channels/zalo) 和 [Zalo Personal](/channels/zalouser) 现在通过使用单独的恢复路径重新启动来保留已接受的消息。 Zalo Bot 在确认之前记录一个 Webhook，而 Zalo Personal 从其帐户队列恢复接受的套接字消息，而不会出现任何延迟的对话阻止不相关的聊天。轮询和 Webhook 模式仍然相互排斥，并且定位、反应、格式、传递错误和部分接收仍然特定于处理消息的路径。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 恢复已接受的 Zalo 本地崩溃后的个人消息 [#110916](https://github.com/openclaw/openclaw/pull/110916)

**错误修复**

- 防止 Zalo Webhook 确认后消息丢失 [#110630](https://github.com/openclaw/openclaw/pull/110630)
- Hide 来自 Zalo 回复的内部工具痕迹 [#103377](https://github.com/openclaw/openclaw/pull/103377)
- Zalouser 共享偏移保留文本块范围 [#105842](https://github.com/openclaw/openclaw/pull/105842)
- Bound 停止 Zalo 机器人 API 请求 [#111636](https://github.com/openclaw/openclaw/pull/111636)
- 使ZaloUser强调遵循CommonMark规则[#113134](https://github.com/openclaw/openclaw/pull/113134)
- 将 ZaloUser 块格式与 CommonMark [#113590](https://github.com/openclaw/openclaw/pull/113590) 对齐
- 当可选介质为空时发送 Zalo 文本 [#114450](https://github.com/openclaw/openclaw/pull/114450)
- Surface Zalo 传送失败并保留部分发送收据 [#117864](https://github.com/openclaw/openclaw/pull/117864)
- 路由 Zalouuser 对正确对话的反应 [#118536](https://github.com/openclaw/openclaw/pull/118536)
- fix（zalo）：绑定停滞的入站媒体标头等待 [#104578](https://github.com/openclaw/openclaw/pull/104578)
- Stop Zalo 中止时立即轮询退避 [#106498](https://github.com/openclaw/openclaw/pull/106498)
- 正确报告不支持的 Zalo 消息操作 [#108434](https://github.com/openclaw/openclaw/pull/108434)
- 区分 Zalouser 探测超时与缺少身份验证 [#111336](https://github.com/openclaw/openclaw/pull/111336)
- 当网关关闭时停止Zalo启动已赢得[#115763](https://github.com/openclaw/openclaw/pull/115763)
- 将 Zalo 消息传送到带前缀的直接目标和组目标 [#115814](https://github.com/openclaw/openclaw/pull/115814)
- 报告ZaloUser递送失败并保留部分收据[#117860](https://github.com/openclaw/openclaw/pull/117860)
- 当 Zalo 介质的大小限制为非正值时恢复 [#120988](https://github.com/openclaw/openclaw/pull/120988)
- 报告失败 Zalo HTTP 探测为不正常 [#124593](https://github.com/openclaw/openclaw/pull/124593)

</details>

</Accordion>

<Accordion id="tlon-and-urbit" title="特隆和乌尔比特">

[Tlon](/channels/tlon) 现在会在确认之前保存已接受的 Urbit 消息，因此已接受到 OpenClaw 的工作可以在重新启动后恢复，而无需立即放弃服务器光标。回复会获得本机 Markdown 列表，并且超大的 SSE 事件或 JSON 有效负载会在内存中无限制增长之前停止。

有一个硬恢复限制。如果 Eyre 明确删除了一个频道，OpenClaw 可以创建并订阅另一个频道，但旧光标及其服务器端历史记录都消失了。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 在重新启动时保留已接受的 Tlon 消息 [#110910](https://github.com/openclaw/openclaw/pull/110910)
- Render Markdown 在 Tlon 回复中本地列出 [#112968](https://github.com/openclaw/openclaw/pull/112968)

**错误修复**

- Bound Tlon SSE 事件以防止内存耗尽 [#101274](https://github.com/openclaw/openclaw/pull/101274)
- 将内部工具跟踪排除在 Tlon 消息之外 [#103450](https://github.com/openclaw/openclaw/pull/103450)
- Bound长时间运行的Tlon监控跟踪[#103658](https://github.com/openclaw/openclaw/pull/103658)
- 连接失败后清除 Tlon SSE 计时器 [#104585](https://github.com/openclaw/openclaw/pull/104585)
- 发送带有片段的 Tlon 图像 URL 作为媒体 [#104853](https://github.com/openclaw/openclaw/pull/104853)
- 监控结束后停止Tlon重新连接 [#108168](https://github.com/openclaw/openclaw/pull/108168)
- Bound Tlon登录响应内存使用 [#109697](https://github.com/openclaw/openclaw/pull/109697)
- 关闭失败的Tlon上传响应流 [#110442](https://github.com/openclaw/openclaw/pull/110442)
- 释放未读的 Tlon HTTP 和 SSE 机构 [#111275](https://github.com/openclaw/openclaw/pull/111275)
- 防止 Tlon 监视器关闭在启动期间挂起 [#114940](https://github.com/openclaw/openclaw/pull/114940)
- 尊重 Tlon 摘要中配置的时区 [#117429](https://github.com/openclaw/openclaw/pull/117429)
- 关闭失败的 Tlon 连接而不泄漏套接字 [#117475](https://github.com/openclaw/openclaw/pull/117475)
- fix（tlon）：当数据行省略空格 [#130048](https://github.com/openclaw/openclaw/pull/130048) 时，保持 Urbit SSE 流正常工作
- fix（tlon）：等待持久邀请副作用 [#130329](https://github.com/openclaw/openclaw/pull/130329)
- 清理 Tlon 身份验证重试侦听器 [#101661](https://github.com/openclaw/openclaw/pull/101661)
- Bound 停滞 Tlon 文件上传，并有明确的截止日期 [#102903](https://github.com/openclaw/openclaw/pull/102903)
- Bound 停滞 Tlon 媒体标头等待 [#104132](https://github.com/openclaw/openclaw/pull/104132)
- 修复Tlon自定义S3端点解析[#107567](https://github.com/openclaw/openclaw/pull/107567)
- 关闭未读的 Tlon 帐户探测响应流 [#111081](https://github.com/openclaw/openclaw/pull/111081)
- 防止 Tlon 停机清理时产生泄漏废品 [#111106](https://github.com/openclaw/openclaw/pull/111106)
- 使 Tlon 探针遵守适配器超时 [#113646](https://github.com/openclaw/openclaw/pull/113646)
- 实时应用 Tlon 通道发现设置 [#114949](https://github.com/openclaw/openclaw/pull/114949)
- 将长 Tlon 消息分割成有界块 [#117438](https://github.com/openclaw/openclaw/pull/117438)
- 当入站图像不可用时告诉 Tlon 代理 [#122783](https://github.com/openclaw/openclaw/pull/122783)
- fix（tlon）：在确认之前等待消息持久化 [#129090](https://github.com/openclaw/openclaw/pull/129090)

</details>

</Accordion>

<Accordion id="nextcloud-talk" title="Nextcloud 谈话">

[Nextcloud Talk](/channels/nextcloud-talk) 现在可以同时处理不同的房间，同时保留每个房间内的消息顺序。一次最多可以有 32 个交付处于活动状态，多余的工作会排队，并且对无响应的自托管或远程服务器的发送或响应现在会在有限的时间内失败，而不是无限期地挂起。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**错误修复**

- H在 Nextcloud 对话回复中隐藏内部工具痕迹 [#101712](https://github.com/openclaw/openclaw/pull/101712)
- 允许跨 Nextcloud 谈话室并行传送 [#118692](https://github.com/openclaw/openclaw/pull/118692)
- 绑定挂 Nextcloud 通话消息和反应发送 [#102025](https://github.com/openclaw/openclaw/pull/102025)
- Bound 停滞 Nextcloud 谈话室查找 [#102859](https://github.com/openclaw/openclaw/pull/102859)
- Keep Nextcloud Talk 错误片段 Unicode 安全 [#102949](https://github.com/openclaw/openclaw/pull/102949)
- Limit Nextcloud 对支持的反应进行对话操作 [#104906](https://github.com/openclaw/openclaw/pull/104906)
- 接受大小写混合 Nextcloud 通话目标前缀 [#105818](https://github.com/openclaw/openclaw/pull/105818)
- 发布失败 Nextcloud 对话响应主体 [#110441](https://github.com/openclaw/openclaw/pull/110441)
- 拒绝不支持的 Nextcloud 通话设置 URL [#111054](https://github.com/openclaw/openclaw/pull/111054)
- Stop 禁用 Nextcloud 对话帐户发送反应 [#112675](https://github.com/openclaw/openclaw/pull/112675)
- 保留 Nextcloud 跨插件升级谈论当前房间别名 [#113432](https://github.com/openclaw/openclaw/pull/113432)
- 防止共享代理 Nextcloud Talk webhook 锁定 [#126251](https://github.com/openclaw/openclaw/pull/126251)
- fix（nextcloud-talk）：在监视器停止上配置 webhook 身份验证速率限制器 [#126908](https://github.com/openclaw/openclaw/pull/126908)
- fix（nextcloud-talk）：记录丢弃的入站事件的非结果 [#130974](https://github.com/openclaw/openclaw/pull/130974)

</details>

</Accordion>

<Accordion title="Nostr">

当无法连接时，[Nostr](/channels/nostr) 直接消息可以移动到下一个配置的中继，在每个中继失败时返回真实的连接错误，并公开成功中继的真实事件 ID 而不是合成时间戳。命名帐户、受保护的密钥、配置文件导入、回复目标​​和有序加密块也会更一致地附加到所选帐户。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**错误修复**

- 故障转移 Nostr 在中继无法连接时发布 [#110007](https://github.com/openclaw/openclaw/pull/110007)
- 将 Nostr 回复附加到其直接消息中 [#110085](https://github.com/openclaw/openclaw/pull/110085)
- 拒绝格式错误的 Nostr 配置文件字段而不导致崩溃 [#110684](https://github.com/openclaw/openclaw/pull/110684)
- 当其队列无法打开时报告不可用 Nostr 入口 [#115313](https://github.com/openclaw/openclaw/pull/115313)
- 将私有工具跟踪排除在 Nostr 消息之外 [#115769](https://github.com/openclaw/openclaw/pull/115769)
- 将长加密 Nostr 回复作为有序块 [#115816](https://github.com/openclaw/openclaw/pull/115816)
- 保留使用 SecretRefs [#126934](https://github.com/openclaw/openclaw/pull/126934) 配置的 Nostr 帐户
- fix（nostr）：一致地验证私钥 [#130305](https://github.com/openclaw/openclaw/pull/130305)
- 在设置和直接消息中接受大写 Nostr 键 [#109878](https://github.com/openclaw/openclaw/pull/109878)
- 报告 Nostr 中的中继事件 ID 发送收据 [#110006](https://github.com/openclaw/openclaw/pull/110006)
- 安全拒绝非对象 Nostr 配置文件元数据 [#110330](https://github.com/openclaw/openclaw/pull/110330)
- 成功后才报告Nostr中继连接 [#110878](https://github.com/openclaw/openclaw/pull/110878)
- 接受前缀 Nostr 目标和白名单身份 [#110881](https://github.com/openclaw/openclaw/pull/110881)
- 在设置过程中保留名为 Nostr 的帐户 [#111134](https://github.com/openclaw/openclaw/pull/111134)
- Make Nostr 配置文件跨继电器导入确定性 [#111798](https://github.com/openclaw/openclaw/pull/111798)
- Stop 报告正常 Nostr 关闭为继电器错误 [#111905](https://github.com/openclaw/openclaw/pull/111905)

</details>

</Accordion>

<Accordion id="synology-chat" title="Synology 聊天">

[Synology Chat](/channels/synology-chat) 现在会在返回成功之前记录入站 webhook 工作，从而允许在重新启动后恢复接受的消息。如果本地写入失败，OpenClaw 返回错误，以便发送方可以重新传送，而上游重试仍由 Synology 控制。长 Unicode 回复保持其顺序，查找和响应受到限制，不确定的出站发送保持未解析状态，而不是重播为重复项。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 在重新启动时保留 Synology 聊天 Webhook [#110899](https://github.com/openclaw/openclaw/pull/110899)

**错误修复**

- 阻止 Synology Chat 发送内部工具痕迹 [#102925](https://github.com/openclaw/openclaw/pull/102925)
- Bound Synology 聊天用户列表响应 [#105089](https://github.com/openclaw/openclaw/pull/105089)
- 以有序块的形式发送长 Synology 聊天回复 [#116645](https://github.com/openclaw/openclaw/pull/116645)
- 报告拒绝 Synology webhook 交付 [#118558](https://github.com/openclaw/openclaw/pull/118558)
- 防止重复 Synology 不确定发送后的聊天消息 [#119539](https://github.com/openclaw/openclaw/pull/119539)
- 防止重复 Synology 托管丢失后聊天发送 [#123953](https://github.com/openclaw/openclaw/pull/123953)
- Isolate Synology Webhook 客户端限制 [#103619](https://github.com/openclaw/openclaw/pull/103619)
- 保留 Unicode Synology 回复收件人 [#108019](https://github.com/openclaw/openclaw/pull/108019)
- Bound Synology 用户查找时间为 15 秒 [#109111](https://github.com/openclaw/openclaw/pull/109111)
- Bound Synology 聊天传出回复截止日期 [#110520](https://github.com/openclaw/openclaw/pull/110520)
- 停止报告伪造的 Synology 聊天消息 ID [#110770](https://github.com/openclaw/openclaw/pull/110770)

</details>

</Accordion>

<Accordion title="Twitch">

已接受到 OpenClaw 本地队列的 [Twitch](/channels/twitch) 聊天可以在进程崩溃后继续。可以取消停滞的用户查找，即使较早的连接尝试完成较晚，已停止的帐户也可以保持停止状态，普通回复会保留标准化的附件链接，而内部工具跟踪和 XML 脚手架会在到达聊天之前被删除。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**错误修复**

- 本地崩溃后恢复接受的Twitch聊天[#110852](https://github.com/openclaw/openclaw/pull/110852)
- 防止内部工具痕迹出现在Twitch聊天中 [#103109](https://github.com/openclaw/openclaw/pull/103109)
- 保留长表情符号 Twitch 回复 [#104030](https://github.com/openclaw/openclaw/pull/104030)
- Bound 停止 Twitch 用户查找 [#105883](https://github.com/openclaw/openclaw/pull/105883)
- fix（twitch）：防止已停止的帐户在延迟启动后重新连接 [#128909](https://github.com/openclaw/openclaw/pull/128909)
- fix（抽搐）：正常代理回复默默丢弃附件[#129644](https://github.com/openclaw/openclaw/pull/129644)
- fix（twitch）：将空发送记录为非结果，而不是送达收据 [#131689](https://github.com/openclaw/openclaw/pull/131689)
- 中止停止 Twitch 用户查找 [#107360](https://github.com/openclaw/openclaw/pull/107360)
- 在 Twitch 标识符和 URL 中保留下划线 [#108548](https://github.com/openclaw/openclaw/pull/108548)
- 防止已退休的 Twitch 聊天管理员重新连接 [#127103](https://github.com/openclaw/openclaw/pull/127103)
- fix（twitch）：在执行审核中保留本机发件人身份 [#130730](https://github.com/openclaw/openclaw/pull/130730)

</details>

</Accordion>

<Accordion title="IRC">

已接纳到 OpenClaw 的 [IRC](/channels/irc) 通道消息可以在重新启动后按顺序恢复，而无需将机器人自己的回复回显到房间中。直接消息恢复与接受它的连接保持联系，并在身份发生变化时停止，同时提及遵循 IRC 昵称规则，Markdown 变为可读纯文本，并且内部工具跟踪不会出现在通道中。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 为 IRC 消息添加持久本地入口 [#110914](https://github.com/openclaw/openclaw/pull/110914)

**错误修复**

- Hide 来自 IRC 回复的内部工具痕迹 [#109012](https://github.com/openclaw/openclaw/pull/109012)
- 接受记录的 IRC configWrites 设置 [#112392](https://github.com/openclaw/openclaw/pull/112392)
- 将可读的纯文本发送到 IRC 而不是 Markdown 源 [#112961](https://github.com/openclaw/openclaw/pull/112961)
- 将 RFC 1459 昵称匹配到 IRC 机器人提及 [#116758](https://github.com/openclaw/openclaw/pull/116758)

</details>

</Accordion>

<Accordion id="android-chat" title="Android 聊天">

[Android](/platforms/android) 现在会在使用网络之前将文本、图像和语音注释写入其发件箱，让它们度过离线期并重新启动，直到对话历史记录确认发送为止。如果结果仍然不确定，则该项目通过显式重试和删除控件保持可见，并且不会自动再次发送。

支持音频和视频内联播放，视频使用本机上传流程，通知回复返回到确切保存的对话或失败。较旧的 2026.7.x OpenClaw 安装使用简化的兼容性路径。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 使Android聊天在离线使用中发送持久并重新启动[#104089](https://github.com/openclaw/openclaw/pull/104089)
- 在Android聊天中播放音频和视频[#115916](https://github.com/openclaw/openclaw/pull/115916)
- 在Android [#116037](https://github.com/openclaw/openclaw/pull/116037)上添加内嵌媒体播放和视频上传
- 添加 Android 对话通知以及内嵌回复 [#120389](https://github.com/openclaw/openclaw/pull/120389)

**错误修复**

- 停止Android默默重放不明确的发送[#103273](https://github.com/openclaw/openclaw/pull/103273)
- 恢复 Android 针对旧网关的聊天发送 [#126540](https://github.com/openclaw/openclaw/pull/126540)
- fix（android）：对等消息显示频道发件人名称而不是“您”[#119864](https://github.com/openclaw/openclaw/pull/119864)
- 取消 Android 链接预览网络通话 [#101853](https://github.com/openclaw/openclaw/pull/101853)
- 保持 Android 离线聊天操作可读 [#107404](https://github.com/openclaw/openclaw/pull/107404)
- fix（android）：重新连接后当前分支排队输入失败 [#132954](https://github.com/openclaw/openclaw/pull/132954)

</details>

</Accordion>

<Accordion id="ios-and-macos-chat" title="iOS 和 macOS 聊天">

[iOS](/platforms/ios) 和 [macOS](/platforms/macos) OpenClaw 应用程序可以在聊天内播放受支持的托管音频和视频、从本机作曲家上传视频，并将活动附件传递给系统“正在播放”控件。当实时状态和保存的历史记录协调时，缓慢接受的回复明显处于待处理状态，因此较晚的历史记录不能仅仅因为它是第二个到达的而清除新的回合。

真正不产生输出的运行最终会释放作曲家，而不会发明回复。本机视频上传保留 20 MB 限制，并且这些聊天应用程序与 iMessage 频道插件保持独立。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- Render 本机聊天中的可折叠详细信息 [#115641](https://github.com/openclaw/openclaw/pull/115641)
- Apple 聊天中添加内嵌音频和视频播放 [#115903](https://github.com/openclaw/openclaw/pull/115903)
- 完成Apple媒体播放和视频上传[#116051](https://github.com/openclaw/openclaw/pull/116051)

**错误修复**

- Render Markdown 在 iOS [#111223](https://github.com/openclaw/openclaw/pull/111223) 上正确列出和分隔符
- 保持缓慢 Apple 聊天回复待处理，直到它们协调 [#97722](https://github.com/openclaw/openclaw/pull/97722)
- Render 可在 Apple 聊天中访问 Markdown 标题层次结构 [#103404](https://github.com/openclaw/openclaw/pull/103404)
- 保持可见的推理标题视觉上柔和 [#103436](https://github.com/openclaw/openclaw/pull/103436)
- 在另一次运行完成时保留活动的本机聊天 [#113786](https://github.com/openclaw/openclaw/pull/113786)
- 防止工具运行后重复的本机聊天回复 [#115678](https://github.com/openclaw/openclaw/pull/115678)
- 防止 Apple 聊天发送在旧网关上停滞 [#126559](https://github.com/openclaw/openclaw/pull/126559)
- 在 iPhone 和 iPad 上显示完整的多行 Markdown 列表项目 [#112723](https://github.com/openclaw/openclaw/pull/112723)
- fix（应用程序）：防止所有权更改后现在播放过时 [#128381](https://github.com/openclaw/openclaw/pull/128381)

</details>

</Accordion>

<Accordion id="control-ui-webchat-and-tui" title="Control UI、WebChat 和 TUI">

[Control UI chat](/web/webchat) 现在为支持的生成文档和托管音频和视频提供自己的命名卡，而不是公开原始附件指令或将每个文件视为下载。就绪视频可以在对话中扩展，兼容的交付媒体可以内联播放，并且每个尝试的附件都会保留可见的命名结果以及可操作的失败指导。活动或未知的文件格式仍然不可用，而不是可下载，而浏览器无法准备的媒体则保持其下载操作。

在 Control UI、WebChat 和 TUI 中，当多个客户端共享对话或在不同时间重新连接时，提示、实时工作、附件和回复保持一致。延迟的提示不再跳到实时回复下方，终端用户在答案旁边和历史记录重新加载后会保留隐私安全附件警告。

这些是 OpenClaw 自己的聊天客户端，而不是外部消息服务，当实时更新和刷新的历史记录不一致时，保存的对话仍然是最终记录。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将引导通道设置添加到Control UI [#106469](https://github.com/openclaw/openclaw/pull/106469)
- 跨聊天客户端显示实时运行遥测 [#113084](https://github.com/openclaw/openclaw/pull/113084)
- Control UI聊天添加一流音视频卡[#115764](https://github.com/openclaw/openclaw/pull/115764)
- Control UI聊天添加内嵌音视频播放 [#116115](https://github.com/openclaw/openclaw/pull/116115)
- 在侧边栏中显示 Discord 和 Slack 对话头像 [#125668](https://github.com/openclaw/openclaw/pull/125668)
- feat（ui）：在媒体叠加层中展开视频附件 [#132131](https://github.com/openclaw/openclaw/pull/132131)

**错误修复**

- 防止过时的聊天窗格发送到切换的分支 [#113073](https://github.com/openclaw/openclaw/pull/113073)
- 保持WebChat消息和现场工作按正确顺序[#113266](https://github.com/openclaw/openclaw/pull/113266)
- 使 TUI 错误安全并按时间顺序流式回复 [#114869](https://github.com/openclaw/openclaw/pull/114869)
- 保持共享 Control UI 和 TUI 聊天同步 [#115066](https://github.com/openclaw/openclaw/pull/115066)
- 在负载下保持共享 Web 和 TUI 聊天同步 [#115191](https://github.com/openclaw/openclaw/pull/115191)
- 将延迟的共享聊天提示保留在右侧 TUI 顺序中 [#115219](https://github.com/openclaw/openclaw/pull/115219)
- fix（ui）：按类型构造聊天记录附件 [#127076](https://github.com/openclaw/openclaw/pull/127076)
- 在终端中保留Matrix和Signal会话身份[#113800](https://github.com/openclaw/openclaw/pull/113800)
- 在 Control UI 聊天回复中荣誉出站挂钩 [#114351](https://github.com/openclaw/openclaw/pull/114351)
- 保持区分大小写的通道对话隔离 [#114638](https://github.com/openclaw/openclaw/pull/114638)
- TUI 回滚已满时保留共享提示 [#115165](https://github.com/openclaw/openclaw/pull/115165)
- 显示 Slack、Buzz 和 Matrix 会话的人名 [#117680](https://github.com/openclaw/openclaw/pull/117680)
- 保持失败的聊天运行处于活动状态，直到保存最终状态 [#126183](https://github.com/openclaw/openclaw/pull/126183)
- 防止历史记录刷新后出现重复的助手气泡 [#126364](https://github.com/openclaw/openclaw/pull/126364)
- 修复：发送确认后当前聊天附件失败 [#127737](https://github.com/openclaw/openclaw/pull/127737)
- fix（网关）：保留排队的WebChat溢出回复传递[#129971](https://github.com/openclaw/openclaw/pull/129971)
- fix（网络聊天）：将生成的文档渲染为附件 [#130402](https://github.com/openclaw/openclaw/pull/130402)
- fix（tui）：重新连接后保持完成的运行空闲 [#131487](https://github.com/openclaw/openclaw/pull/131487)
- fix：在延迟提示后保留实时回复 [#131641](https://github.com/openclaw/openclaw/pull/131641)
- fix（网络聊天）：隐藏附件管道阶段[#131812](https://github.com/openclaw/openclaw/pull/131812)
- fix（网络聊天）：显示失败附件的命名卡片 [#131826](https://github.com/openclaw/openclaw/pull/131826)
- fix（webchat）：恢复下发音视频播放 [#131831](https://github.com/openclaw/openclaw/pull/131831)
- fix（网络聊天）：在长回复之前宣布附件失败 [#132102](https://github.com/openclaw/openclaw/pull/132102)
- fix（tui）：使失败的附件在回复旁边可见 [#132115](https://github.com/openclaw/openclaw/pull/132115)
- fix（网络聊天）：在初始转录事件中隐藏托管媒体 [#132508](https://github.com/openclaw/openclaw/pull/132508)
- fix（tui）：在阻止提交后保留大的粘贴草稿[#132528](https://github.com/openclaw/openclaw/pull/132528)
- fix（ui）：稳定就绪验证和媒体播放 [#132832](https://github.com/openclaw/openclaw/pull/132832)
- fix（网关）：在发布源回复之前提交媒体所有权 [#133237](https://github.com/openclaw/openclaw/pull/133237)
- 保留导入的 CLI 会话历史记录中的重复消息 [#113703](https://github.com/openclaw/openclaw/pull/113703)
- H在附件 [#125674](https://github.com/openclaw/openclaw/pull/125674) 旁边隐藏重复的原始图像 Markdown
- 重启期间保留WebChat故障状态耗尽[#125985](https://github.com/openclaw/openclaw/pull/125985)
- fix：在网关重新启动时保留消息工具映像 [#127729](https://github.com/openclaw/openclaw/pull/127729)
- fix：显示活动运行中的 WebChat 附件 [AI- 辅助] [#127879](https://github.com/openclaw/openclaw/pull/127879)
- fix：通过发送失败保持消息身份稳定[#129127](https://github.com/openclaw/openclaw/pull/129127)
- fix（网络聊天）：在媒体记录重写期间剥离回复指令 [#131859](https://github.com/openclaw/openclaw/pull/131859)

</details>

</Accordion>

<Accordion id="voice-calls" title="语音通话">

当操作员希望电话和桌面对话共享历史记录时，[Voice Call](/plugins/voice-call) 可以选择加入座席的主要记录，而默认情况下每部电话保留一个会话。实时客服人员可以说出最后一句话并请求挂断，启动失败、运营商挂断或媒体静默现在会关闭不可用的会话，而不是使其保持活动状态直到最长持续时间。

选择主要记录会将原始呼叫转入主要历史记录中。运营商仍然可以拒绝请求的挂断，并且运营商、提供商媒体、Discord、Talk 和 Meet 呼叫保留自己的凭据和生命周期，而不是被视为一个可互换的语音系统。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 让语音呼叫共享座席的主会话 [#124708](https://github.com/openclaw/openclaw/pull/124708)
- 让实时语音座席结束主动呼叫 [#125525](https://github.com/openclaw/openclaw/pull/125525)
- feat（讨论）：添加macOS实时网关继电器[#128204](https://github.com/openclaw/openclaw/pull/128204)

**错误修复**

- 实时启动失败后挂断运营商呼叫 [#118699](https://github.com/openclaw/openclaw/pull/118699)
- 保留实时语音的路由代理凭据 [#125111](https://github.com/openclaw/openclaw/pull/125111)
- 在网关重新启动时保持语音呼叫正常工作 [#125458](https://github.com/openclaw/openclaw/pull/125458)
- 挂断或媒体静音后结束实时语音通话 [#125463](https://github.com/openclaw/openclaw/pull/125463)
- 流畅的实时语音播放和电话流 [#125620](https://github.com/openclaw/openclaw/pull/125620)
- 当替换设置失败时保持活动语音呼叫活动 [#117960](https://github.com/openclaw/openclaw/pull/117960)
- 保持实时语音封闭和转录状态持久 [#118025](https://github.com/openclaw/openclaw/pull/118025)
- Stop 取代实时语音呼叫咨询 [#118301](https://github.com/openclaw/openclaw/pull/118301)
- 在网关重新启动时保持语音呼叫运行时所有权的安全 [#120289](https://github.com/openclaw/openclaw/pull/120289)
- 识别代理范围的 OpenAI 浏览器 Talk 凭据 [#125142](https://github.com/openclaw/openclaw/pull/125142)
- 使用每个路由座席的凭据进行实时电话呼叫 [#125144](https://github.com/openclaw/openclaw/pull/125144)
- Resolve Discord 实时语音 SecretRefs [#125443](https://github.com/openclaw/openclaw/pull/125443)
- 通过 Tailscale 暴露语音通话音频流 [#125468](https://github.com/openclaw/openclaw/pull/125468)
- 通过短暂的重新连接保持实时语音通话 [#125469](https://github.com/openclaw/openclaw/pull/125469)
- 保留运营商确认的语音呼叫终止 [#125717](https://github.com/openclaw/openclaw/pull/125717)
- 在 OAuth 浏览器中启用主动代理协商对话 [#126363](https://github.com/openclaw/openclaw/pull/126363)
- 修复：实时电话使用错误的音频格式并保持打开状态 [#133018](https://github.com/openclaw/openclaw/pull/133018)
- 重拨 Google 完成 Twilio 通话后见面 [#120807](https://github.com/openclaw/openclaw/pull/120807)
- 停止失败 Google 满足语音网关连接 [#120822](https://github.com/openclaw/openclaw/pull/120822)
- 保留 Discord 语音查找错误和代理范围内的实时身份验证 [#125069](https://github.com/openclaw/openclaw/pull/125069)
- 保持离线语音通话状态只读 [#125354](https://github.com/openclaw/openclaw/pull/125354)
- 在 Google Meet 中使用类型化网关回退错误 CLI [#125495](https://github.com/openclaw/openclaw/pull/125495)
- 允许语音呼叫使用备用 Tailscale HTTPS 端口 [#125552](https://github.com/openclaw/openclaw/pull/125552)
- fix（ui）：解释 WebKit [#132904](https://github.com/openclaw/openclaw/pull/132904) 上不可用的麦克风
- 修复：OpenAI登录后浏览器语音不可用[#133048](https://github.com/openclaw/openclaw/pull/133048)

</details>

</Accordion>

<Accordion title="Raft">

[Raft](/channels/raft) 设置现在可以清楚地说明运行 OpenClaw 的计算机何时无法找到 Raft 可执行文件，而不是将已配置的通道呈现为正常状态。通过探测意味着命令行工具当时可用，而不是以后的连接或消息已经成功。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**错误修复**

- 通道状态中报告缺失Raft CLI [#123140](https://github.com/openclaw/openclaw/pull/123140)

</details>

</Accordion>

</AccordionGroup>
