---
title: "v2026.8.1：本机应用程序"
description: "iPhone、iPad、Android、macOS 和 Wear OS 让语音、附件、模型选择和对话控制更贴近工作。"
---

此版本使 [native 应用程序 ](/platforms) 对于更多围绕对话的工作非常有用。 iPhone、iPad 和 Android 将语音、附件、模型选择和对话控制引入聊天中，macOS 从菜单栏或全局快捷方式添加快速聊天，而 Wear OS 将转录、回复、对话和会话控制引入配对手表。 Apple 手表通过重新启动和重试保留手腕动作，而 Linux 桌面伴侣工作现在涵盖托盘、嵌入式 Control UI 和快速聊天。

进度卡和助手创建的小部件还将 Claw 的更多主动工作带入支持的本机对话中，其中翻译、配置文件重音、波形和文件差异出现在下面介绍的特定客户端上。

<AccordionGroup>

<Accordion id="iphone-ipad-and-apple-watch" title="iPhone、iPad 和 Apple 手表">

在 [iPhone 和 iPad](/platforms/ios) 上，一个聊天界面现在可以处理打字、听写、语音注释、附件、实时对话以及围绕对话的会话、模型、推理和工具活动控制。侧边栏可以更轻松地切换代理、搜索和管理最近的对话、查看需要注意的内容以及固定最常使用的目标。

共享到 OpenClaw 现在可以预览支持的附件，并显示从准备到完成或失败的进度。此版本中的已完成共享支持文本、链接或一到三个图像，并且当不支持、多余或不可加载的附件被遗漏时，“发送”将保持不可用。

Apple Watch 通过重新启动、网关更改、导航和重试保留消息、批准、回复和命令，然后在手机和 Watch 之间协调结果，以便减少相同的手腕动作丢失或重复的可能性。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 重新设计iOS共享撰写表[#104187](https://github.com/openclaw/openclaw/pull/104187)
- 统一 iOS 聊天、听写、语音笔记和实时语音 [#107879](https://github.com/openclaw/openclaw/pull/107879)
- 为iOS带来更丰富的聊天控件和实时Talk反馈 [#110254](https://github.com/openclaw/openclaw/pull/110254)
- 将模型控制和会话管理引入iOS聊天中 [#110831](https://github.com/openclaw/openclaw/pull/110831)
- 添加 iOS 通话摄像头翻转和麦克风选择 [#111044](https://github.com/openclaw/openclaw/pull/111044)
- 将 iOS 标签栏替换为完整侧边栏 [#111339](https://github.com/openclaw/openclaw/pull/111339)
- 将持久语音会话添加到 iOS Talk [#111369](https://github.com/openclaw/openclaw/pull/111369)
- fix（ios）：优化聊天操作和标题控件 [#132045](https://github.com/openclaw/openclaw/pull/132045)
- 刷新iPhone Control选项卡布局 [#98582](https://github.com/openclaw/openclaw/pull/98582)
- 使用当前 OpenClaw 吉祥物 [#101411](https://github.com/openclaw/openclaw/pull/101411) 刷新 iOS 和手表图标
- 将状态感知吉祥物情绪添加到 iOS 设置 [#108900](https://github.com/openclaw/openclaw/pull/108900)
- 在手表收件箱中添加一个具有情绪感知能力的 Clawd 吉祥物 [#109365](https://github.com/openclaw/openclaw/pull/109365)
- 向 iOS 侧边栏添加代理头像和更多空间 [#112082](https://github.com/openclaw/openclaw/pull/112082)
- fix（ios）：简化侧边栏导航 [#132086](https://github.com/openclaw/openclaw/pull/132086)
- Harden iOS 发布并简化位置访问选择 [12515ad](https://github.com/openclaw/openclaw/commit/12515ad)
- 在 iOS Talk 菜单中使用品牌字体 [af62abe](https://github.com/openclaw/openclaw/commit/af62abe)
- 保持周期性 iOS 网关警报固定 [#110493](https://github.com/openclaw/openclaw/pull/110493)
- chore（i18n）：刷新本机语言环境 [#131438](https://github.com/openclaw/openclaw/pull/131438)
- chore（i18n）：刷新本机语言环境 [#132302](https://github.com/openclaw/openclaw/pull/132302)

**错误修复**

- Harden iOS 网关和 Apple 手表状态处理 [5e9bc09](https://github.com/openclaw/openclaw/commit/5e9bc09)
- 防止取消和会话更改后过时的语音工作 iOS [#103072](https://github.com/openclaw/openclaw/pull/103072)
- Localize iOS 和 Apple 手表应用程序表面 [#105372](https://github.com/openclaw/openclaw/pull/105372)
- Smooth iOS 侧边栏手势和控制 [#111831](https://github.com/openclaw/openclaw/pull/111831)
- Smooth iOS 侧边栏拖动并统一抽屉表面 [#112299](https://github.com/openclaw/openclaw/pull/112299)
- fix（讲）：共享和绑定Apple中继生命周期[#127232](https://github.com/openclaw/openclaw/pull/127232)
- 跨语言保留 iOS 应用程序和扩展名 [690ed56](https://github.com/openclaw/openclaw/commit/690ed56)
- 返回后保持 iOS 聊天明显处于活动状态 [#102309](https://github.com/openclaw/openclaw/pull/102309)
- Stop 干净地取消了 iOS 相机请求 [#103069](https://github.com/openclaw/openclaw/pull/103069)
- 保留与所选代理的 iOS 会话操作 [#103415](https://github.com/openclaw/openclaw/pull/103415)
- 保留iOS共享草稿中的合法文本[#103453](https://github.com/openclaw/openclaw/pull/103453)
- 调整从iOS共享的超大图像的大小[#103860](https://github.com/openclaw/openclaw/pull/103860)
- Localize iOS VoiceOver [#105859](https://github.com/openclaw/openclaw/pull/105859) 的设置标签
- 防止省略附件时 iOS 共享不完整 [#106513](https://github.com/openclaw/openclaw/pull/106513)
- 重新连接后保持选择活动的 iOS 聊天 [#108241](https://github.com/openclaw/openclaw/pull/108241)
- 恢复半透明 iOS 聊天边缘 [#110505](https://github.com/openclaw/openclaw/pull/110505)
- 保持统一 iOS 语音控制可恢复 [#110906](https://github.com/openclaw/openclaw/pull/110906)
- 保持 iOS 回复在打开的键盘上方可见 [#110944](https://github.com/openclaw/openclaw/pull/110944)
- Harden iOS Talk 语音会话恢复和确认反馈 [#111424](https://github.com/openclaw/openclaw/pull/111424)
- fix（ios）：页面会话名册和恢复审批指导 [#112004](https://github.com/openclaw/openclaw/pull/112004)
- Localize Agent Pro iOS 上的详细标签 [#112980](https://github.com/openclaw/openclaw/pull/112980)
- 在 iOS [#113039](https://github.com/openclaw/openclaw/pull/113039) 上添加深色主屏幕图标
- 防止 iOS 设置并发布停顿截图 [#113187](https://github.com/openclaw/openclaw/pull/113187)
- iOS 系统语音回退的语音区域设置 [#113372](https://github.com/openclaw/openclaw/pull/113372)
- Keep Stop 可用于分阶段 iOS 语音注释 [#115744](https://github.com/openclaw/openclaw/pull/115744)
- 在iPad聊天编辑器中恢复妙控键盘返回[#116042](https://github.com/openclaw/openclaw/pull/116042)
- 从 iOS 共享草稿中删除重复的 URL [#116430](https://github.com/openclaw/openclaw/pull/116430)
- iOS 通话路由中强制座席协商 [#117485](https://github.com/openclaw/openclaw/pull/117485)
- 恢复iOS聊天编辑器键盘焦点[#120723](https://github.com/openclaw/openclaw/pull/120723)
- fix（ios）： 网络观测超时时报告不可用 [#128724](https://github.com/openclaw/openclaw/pull/128724)
- fix（ios）：解决过期后台刷新一次[#129097](https://github.com/openclaw/openclaw/pull/129097)
- fix（ios）：过时的监视操作会覆盖当前提示和命令 [#129804](https://github.com/openclaw/openclaw/pull/129804)
- fix（ios）：防止 Apple 手表回调使应用程序崩溃 [#129921](https://github.com/openclaw/openclaw/pull/129921)
- fix（ios）：在多代理网关上显示侧边栏会话 [#131356](https://github.com/openclaw/openclaw/pull/131356)
- 防止重叠自动 iOS 概览刷新 [818eca2](https://github.com/openclaw/openclaw/commit/818eca2)
- 正确的韩语母语UI翻译[#107573](https://github.com/openclaw/openclaw/pull/107573)
- 防止 iOS 应用程序中的过时延迟覆盖 [#113062](https://github.com/openclaw/openclaw/pull/113062)
- 使iOS聊天代理身份可访问且可扩展[#113917](https://github.com/openclaw/openclaw/pull/113917)
- fix（ios）：在深色模式下保持工具详细信息可见 [#124021](https://github.com/openclaw/openclaw/pull/124021)
- fix（ios）：设备状态使电池监控启用 [#128174](https://github.com/openclaw/openclaw/pull/128174)
- fix（ios）：报告没有关于受限制的静默推送的数据 [#129026](https://github.com/openclaw/openclaw/pull/129026)
- fix（ios）：在语音捕获期间保留键盘反馈 [#129462](https://github.com/openclaw/openclaw/pull/129462)
- fix（ios）：当网关传送失败时，语音唤醒会默默地丢失命令 [#130139](https://github.com/openclaw/openclaw/pull/130139)

</details>

</Accordion>

<Accordion id="android-and-wear-os" title="Android 和磨损 OS">

[Android](/platforms/android) 将听写、语音笔记、实时 Talk、模型和思维选择、上下文使用、附件以及当前 Talk、发送或停止操作放入一个紧凑的编辑器中，照片、视频和文件位于一加菜单后面。从系统共享表接收的文本、链接、图像、支持的音频和常见文档将成为供审阅的草稿，并且在发送任何内容之前会显示不受支持的、超大的或多余的项目。

当 Android 连接时，搜索可以到达缓存的最近会话之外的网关支持的会话，并且线程可以扩展具有后代状态的相关父子工作。当应用程序离线时，搜索将使用其缓存中已有的活动会话。符合条件的上限助理回复现在可以内联打开，因此结尾、格式、附件和完整代码仍然可供阅读或复制，而不可用、失败或过大的结果仍然是明确的，而不是默默地结束答案。

Wear OS 伴侣使用其配对的 Android 手机进行连接，并且在手表上不存储网关凭据。它可以显示最近的记录、发送键入或听写的回复、停止运行、回复到达时发出通知、使用连续的实时通话，以及在手机公布这些控件时切换代理、会话和模型。支持的手机还添加 Agent Pulse 作为有限后台工作和待处理关注的只读视图，而在 Watch 上没有批准或突变操作。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 在 Android [#102876](https://github.com/openclaw/openclaw/pull/102876) 上添加每个应用程序语言选择
- 在整个 Android 应用程序中显示配置的代理头像 [#103248](https://github.com/openclaw/openclaw/pull/103248)
- 添加Android系统共享到聊天中[#104571](https://github.com/openclaw/openclaw/pull/104571)
- 在 Android 聊天中预览内嵌图像 [#104620](https://github.com/openclaw/openclaw/pull/104620)
- 将 Android 应用程序本地化为 21 种语言 [#105049](https://github.com/openclaw/openclaw/pull/105049)
- 添加前台语音唤醒 Android [#107081](https://github.com/openclaw/openclaw/pull/107081)
- 添加内联听写并与 Android 聊天 [#109329](https://github.com/openclaw/openclaw/pull/109329)
- 通过配对的 Android 手机 [#109433](https://github.com/openclaw/openclaw/pull/109433) 添加安全佩戴 OS 伴侣
- 向穿戴设备添加连续实时对话 OS 伴侣 [#109483](https://github.com/openclaw/openclaw/pull/109483)
- 恢复完整穿戴 OS 陪伴体验 [#110130](https://github.com/openclaw/openclaw/pull/110130)
- Improve Wear OS 语音控制和辅助功能 [#110425](https://github.com/openclaw/openclaw/pull/110425)
- 将 Wear OS 代理、会话和模型控件放在主页上 [#110661](https://github.com/openclaw/openclaw/pull/110661)
- 分享来自Android的音频和文档 [#110941](https://github.com/openclaw/openclaw/pull/110941)
- 将 Android 聊天小部件复制或保存为图像 [#111030](https://github.com/openclaw/openclaw/pull/111030)
- 通过助理音频对 Wear Talk 头像进行动画处理 [#111516](https://github.com/openclaw/openclaw/pull/111516)
- 将工作状态和回顾带到Android聊天中 [#112221](https://github.com/openclaw/openclaw/pull/112221)
- 向穿戴设备添加一键语音和聊天路线 OS 磁贴 [#112721](https://github.com/openclaw/openclaw/pull/112721)
- 向 Android 应用程序添加自适应材质导航 [#113908](https://github.com/openclaw/openclaw/pull/113908)
- 在 Android 聊天中显示实时子代理活动 [#121813](https://github.com/openclaw/openclaw/pull/121813)
- 将 Agent Pulse 添加到 Wear 伴侣 [#122123](https://github.com/openclaw/openclaw/pull/122123)
- 在 Android [#122268](https://github.com/openclaw/openclaw/pull/122268) 上显示清晰的系统通知和会话分隔符
- 简化Android聊天编辑器[#123077](https://github.com/openclaw/openclaw/pull/123077)
- 将固定网关支持的会话搜索添加到 Android [#124338](https://github.com/openclaw/openclaw/pull/124338)
- 在 Android 聊天中显示持久进度卡 [#125444](https://github.com/openclaw/openclaw/pull/125444)
- 向 Wear 添加直接可搜索上下文选择器 OS [#126863](https://github.com/openclaw/openclaw/pull/126863)
- feat（android）：在线程中显示会话层次结构 [#128862](https://github.com/openclaw/openclaw/pull/128862)
- 简化 Android 会话排序和行标记 [#103108](https://github.com/openclaw/openclaw/pull/103108)
- 将Android语音波形和思维状态与Apple平台对齐 [#103130](https://github.com/openclaw/openclaw/pull/103130)
- 改进 Android 工作区文件导航 [#104873](https://github.com/openclaw/openclaw/pull/104873)
- 在加载聊天历史记录之前准备 Android 每设备会话 [#105115](https://github.com/openclaw/openclaw/pull/105115)
- 将情绪感知吉祥物动画添加到 Android 入门 [#109311](https://github.com/openclaw/openclaw/pull/109311)
- 为 Wear OS 添加 Android 手机代理 [#109341](https://github.com/openclaw/openclaw/pull/109341)
- Align Wear OS 浅色和深色主题 [#110314](https://github.com/openclaw/openclaw/pull/110314)
- 添加 Android 通话摄像头和麦克风控制 [#111046](https://github.com/openclaw/openclaw/pull/111046)
- 在Android [#112571](https://github.com/openclaw/openclaw/pull/112571)上添加罕见的工作爪动画
- 折叠 Android 标题操作后面的侧边栏搜索 [#116956](https://github.com/openclaw/openclaw/pull/116956)
- 在 Android 聊天中显示计划状态和说明 [#124958](https://github.com/openclaw/openclaw/pull/124958)
- 让Android聊天气泡显示谁在说话[#124985](https://github.com/openclaw/openclaw/pull/124985)
- 统一ClawTheme下的Android聊天颜色[#125020](https://github.com/openclaw/openclaw/pull/125020)
- feat（android）：群组侧边栏会话 [#128092](https://github.com/openclaw/openclaw/pull/128092)
- feat（android）：统一代理和会话选择器 [#128309](https://github.com/openclaw/openclaw/pull/128309)
- 制作Android发布截图确定性[f163f32](https://github.com/openclaw/openclaw/commit/f163f32)
- 将 Android 启动器图标与 OpenClaw 图标 [#101423](https://github.com/openclaw/openclaw/pull/101423) 对齐
- 简化 Android Canvas 待机布局 [#104001](https://github.com/openclaw/openclaw/pull/104001)
- 刷新生成的本机应用程序翻译 [#112803](https://github.com/openclaw/openclaw/pull/112803)
- 保持已完成的 Android 计划步骤可读 [#124916](https://github.com/openclaw/openclaw/pull/124916)
- chore（i18n）：刷新本机语言环境 [#127681](https://github.com/openclaw/openclaw/pull/127681)

**错误修复**

- 通过聊天保持 Android 作曲家状态 [#109200](https://github.com/openclaw/openclaw/pull/109200)
- 稳定磨损 OS 实时音频和座席请求 [#111033](https://github.com/openclaw/openclaw/pull/111033)
- 尊重 Wear Talk 化身中的简化运动设置 [#112245](https://github.com/openclaw/openclaw/pull/112245)
- fix（android）： 恢复被截断的助手回复的结尾 [#131575](https://github.com/openclaw/openclaw/pull/131575)
- Stop 取消了 Android 工作，使其不再显示为故障 [#105047](https://github.com/openclaw/openclaw/pull/105047)
- 在重新连接期间保持 Android 应用程序会话稳定 [#105144](https://github.com/openclaw/openclaw/pull/105144)
- 保持长时间 Android 聊天运行活跃 [#106864](https://github.com/openclaw/openclaw/pull/106864)
- 恢复 Android 标题徽标 [#108199](https://github.com/openclaw/openclaw/pull/108199) 的品牌颜色
- 在 Android 诊断中保留表情符号 [#108823](https://github.com/openclaw/openclaw/pull/108823)
- 在Android缩写[#108830](https://github.com/openclaw/openclaw/pull/108830)中保留完整的Unicode字素
- 在 Android 徽章中保留完整的 Unicode 字素 [#109486](https://github.com/openclaw/openclaw/pull/109486)
- 在过时的音频错误后保持重新启动的 Wear Talk 会话处于活动状态 [#110292](https://github.com/openclaw/openclaw/pull/110292)
- 从过时的电话路由中恢复磨损请求 [#110423](https://github.com/openclaw/openclaw/pull/110423)
- 在视图中保留 Android 流式回复 [#110983](https://github.com/openclaw/openclaw/pull/110983)
- 使流式回复在 Wear OS 线程中可见 [#111459](https://github.com/openclaw/openclaw/pull/111459)
- Localize Wear OS 同伴状态和故障 [#112228](https://github.com/openclaw/openclaw/pull/112228)
- 响应 Android 删除动画更改 [#112687](https://github.com/openclaw/openclaw/pull/112687)
- 保持活跃磨损 OS 在较旧的回合完成时回复 [#113804](https://github.com/openclaw/openclaw/pull/113804)
- Format Android 和带有活动区域设置的 Wear 标签 [#115015](https://github.com/openclaw/openclaw/pull/115015)
- 本地化 Android“固定”辅助功能标签 [#117726](https://github.com/openclaw/openclaw/pull/117726)
- Keep Wear OS 聊天最新回复 [#120307](https://github.com/openclaw/openclaw/pull/120307)
- Start Android 本地完成的子代理保留 [#122089](https://github.com/openclaw/openclaw/pull/122089)
- 在整个保留期内保持 Android 子代理活动可见 [#122198](https://github.com/openclaw/openclaw/pull/122198)
- 恢复紧凑Android聊天元数据标签[#125053](https://github.com/openclaw/openclaw/pull/125053)
- fix（android）：规范空日历和联系人写入字段 [#125527](https://github.com/openclaw/openclaw/pull/125527)
- fix：当没有缓存位置足够新鲜时，location.get 可以返回过时的修复 [#128439](https://github.com/openclaw/openclaw/pull/128439)
- fix（android）：获取网关强调色但从未应用于应用程序主题 [#128702](https://github.com/openclaw/openclaw/pull/128702)
- fix（android）：围栏取消语音注释权限回调[#128733](https://github.com/openclaw/openclaw/pull/128733)
- fix（android）：为新事件选择可写日历 [#129055](https://github.com/openclaw/openclaw/pull/129055)
- fix（android）：保留聊天图像中的照片方向 [#129136](https://github.com/openclaw/openclaw/pull/129136)
- fix（android）：停止中断的助手音频并删除缓存文件 [#129574](https://github.com/openclaw/openclaw/pull/129574)
- fix（android）：恢复丢失的网关事件 [#129723](https://github.com/openclaw/openclaw/pull/129723)
- fix（android）：在代理路径后面加载聊天图像、音频和视频 [#129957](https://github.com/openclaw/openclaw/pull/129957)
- fix（android）：照片库返回旋转或镜像的相机图像 [#129965](https://github.com/openclaw/openclaw/pull/129965)
- fix（android）： 在离线聊天历史记录中保留文档附件 [#130163](https://github.com/openclaw/openclaw/pull/130163)
- fix（android）：报告禁用的通知类别而不是成功 [#130531](https://github.com/openclaw/openclaw/pull/130531)
- fix（android）：大声朗读长回复而不会出现无提示失败 [#130574](https://github.com/openclaw/openclaw/pull/130574)
- fix（android）：阅读早期消息时保留问题答案 [#130821](https://github.com/openclaw/openclaw/pull/130821)
- fix（android）：保持键盘打开时可访问设置控件 [#130995](https://github.com/openclaw/openclaw/pull/130995)
- fix（android）：重新连接后保持离线历史记录最新 [#132964](https://github.com/openclaw/openclaw/pull/132964)
- 保持转发 Android 通知文字 UTF-16 安全 [#102442](https://github.com/openclaw/openclaw/pull/102442)
- 保持 Android 链接预览元数据 UTF-16 安全 [#102988](https://github.com/openclaw/openclaw/pull/102988)
- 在 Android 工作区浏览器中换行长文件名 [#104075](https://github.com/openclaw/openclaw/pull/104075)
- fix（android）：恢复时刷新通知访问 [#104460](https://github.com/openclaw/openclaw/pull/104460)
- 在会话中保留 Android 会话搜索 [#104792](https://github.com/openclaw/openclaw/pull/104792)
- Bound Android 结构化历史图像解码 [#105065](https://github.com/openclaw/openclaw/pull/105065)
- 自动对焦 Android 命令调色板搜索 [#105471](https://github.com/openclaw/openclaw/pull/105471)
- 居中 Android 命令调色板标题 [#106264](https://github.com/openclaw/openclaw/pull/106264)
- 使Android附件拆卸更容易攻丝[#106737](https://github.com/openclaw/openclaw/pull/106737)
- 概述 Android 提供商和模型后退按钮 [#106803](https://github.com/openclaw/openclaw/pull/106803)
- Android 语音错误缩短时保留表情符号 [#108101](https://github.com/openclaw/openclaw/pull/108101)
- 在 Android 会话标签中保留表情符号边界 [#108102](https://github.com/openclaw/openclaw/pull/108102)
- 在 Android 存在拒绝日志中保留表情符号 [#108103](https://github.com/openclaw/openclaw/pull/108103)
- Enlarge Android 语音笔记录制控件 [#108307](https://github.com/openclaw/openclaw/pull/108307)
- Android 工具预览保留表情符号 [#108330](https://github.com/openclaw/openclaw/pull/108330)
- 跨暂停保留 Android 一键通语音 [#110995](https://github.com/openclaw/openclaw/pull/110995)
- 退出并重新打开后恢复 Wear Talk [#112383](https://github.com/openclaw/openclaw/pull/112383)
- Make Android 分支消息计数与区域设置无关的 [#112426](https://github.com/openclaw/openclaw/pull/112426)
- 正确的Android可访问性执行程序本地化[#113276](https://github.com/openclaw/openclaw/pull/113276)
- 在 Android 侧边栏会话中显示固定状态 [#117063](https://github.com/openclaw/openclaw/pull/117063)
- 在Android侧边栏搜索中显示所有匹配的会话[#117981](https://github.com/openclaw/openclaw/pull/117981)
- 在侧边栏中显示活动的 Android 会话状态 [#118624](https://github.com/openclaw/openclaw/pull/118624)
- 为新的 Android 聊天生成有用的标题 [#123670](https://github.com/openclaw/openclaw/pull/123670)
- 在紧凑型选取器 [#125264](https://github.com/openclaw/openclaw/pull/125264) 中保留固定的 Android 会话
- fix（android）：保留照片拍摄日期和请求的图像分辨率 [#125550](https://github.com/openclaw/openclaw/pull/125550)
- Localize Android 进度卡标签 [#125608](https://github.com/openclaw/openclaw/pull/125608)
- fix（android）：防止过期的子代理任务重新出现 [#128612](https://github.com/openclaw/openclaw/pull/128612)
- fix（android）：标准化可选运动日期范围[#128734](https://github.com/openclaw/openclaw/pull/128734)
- fix（android）：没有个人姓名的联系人显示为未命名 [#129549](https://github.com/openclaw/openclaw/pull/129549)
- fix（android）：保留仅文档聊天消息[#129557](https://github.com/openclaw/openclaw/pull/129557)
- fix（android）： 共享多个图像时字幕消失 [#129603](https://github.com/openclaw/openclaw/pull/129603)
- fix（android）：保留省略的仅图像聊天消息[#129711](https://github.com/openclaw/openclaw/pull/129711)
- fix（android）： 保留断开连接的节点网关状态 [#129839](https://github.com/openclaw/openclaw/pull/129839)
- fix（android）：共享图像丢失其原始文件名[#130156](https://github.com/openclaw/openclaw/pull/130156)
- fix（android）：荣誉低相机快照质量[#130160](https://github.com/openclaw/openclaw/pull/130160)
- fix（android）：在转发通知之前需要侦听器访问 [#130173](https://github.com/openclaw/openclaw/pull/130173)
- fix（android）：使用斜线建议保持作曲家可见 [#130555](https://github.com/openclaw/openclaw/pull/130555)
- fix（android）： 在回复替换期间保持 Talk 的说话指示器处于活动状态 [#130868](https://github.com/openclaw/openclaw/pull/130868)
- chore（i18n）：刷新本机语言环境 [#132101](https://github.com/openclaw/openclaw/pull/132101)
- fix（android）：延迟存档完成切换远离较新的聊天[#132873](https://github.com/openclaw/openclaw/pull/132873)

</details>

</Accordion>

<Accordion id="macos-app" title="macOS 应用">

[macOS 快速 Chat](/platforms/macos) 从菜单栏或已使用的应用程序上的全局快捷方式打开，并带有用于五个最近更新的对话的选择器。它就地传输回复、切换代理、接受听写并选择模型和推理级别。屏幕录制权限添加窗口或区域捕获，而辅助功能权限添加来自焦点应用程序的有界文本，并让最终答案粘贴回用户正在工作的位置。发送后或快速聊天隐藏时，捕获的上下文将被清除。

全窗口本机聊天现在以广泛的对话为中心，随着更长的草稿而增长，使用 Command-F 和 Command-G 搜索加载的用户和助理消息，并将复制、回复、收听和其他消息操作直接放在对话中。失败的排队发送可以立即重试，而结果不确定的发送仍处于用户控制之下。搜索停留在加载的可见消息文本内，不会获取较旧的历史记录或检查隐藏的推理和工具负载。

本机聊天可以重命名、分叉、固定、存档、标记已读或未读，并通过批量操作、检查和工作树支持的创建来组织父子树和组中的对话。当无法遵守所选代理、父级、工作树或基础引用时，工作树请求将停止。

仪表板通过重新连接返回到其记忆的框架、空间和符合条件的路线，状态菜单使实时会话卡、选择以及网关或设备诊断保持稳定和可读。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将 macOS 侧边栏切换到标题栏 [#104380](https://github.com/openclaw/openclaw/pull/104380)
- 重新设计macOS菜单栏生物[#104846](https://github.com/openclaw/openclaw/pull/104846)
- 将macOS标题栏控件调整为侧边栏状态[#105175](https://github.com/openclaw/openclaw/pull/105175)
- 将 macOS 仪表板工具栏控件移至 Web UI [#105902](https://github.com/openclaw/openclaw/pull/105902)
- 使 macOS 仪表板感觉原生 [#106997](https://github.com/openclaw/openclaw/pull/106997)
- 在 Mac 上添加睡帽、毕业帽和帽尖吉祥物时刻 [#108882](https://github.com/openclaw/openclaw/pull/108882)
- 添加 macOS 快速聊天 [#109720](https://github.com/openclaw/openclaw/pull/109720)
- 展开 macOS 快速聊天与代理切换和窗口截图 [#109952](https://github.com/openclaw/openclaw/pull/109952)
- 改进 macOS 通话模式下的麦克风控制和实时反馈 [#109995](https://github.com/openclaw/openclaw/pull/109995)
- Native macOS 聊天添加会话操作、未读处理和子代理树 [#110019](https://github.com/openclaw/openclaw/pull/110019)
- 添加本机会话组、批处理操作和工作树创建 [#110347](https://github.com/openclaw/openclaw/pull/110347)
- macOS 快速聊天流回复并继续最近的对话 [#110631](https://github.com/openclaw/openclaw/pull/110631)
- 添加快速聊天区域捕获和聚焦应用程序文本上下文 [#110635](https://github.com/openclaw/openclaw/pull/110635)
- 向 macOS 快速聊天添加听写、回贴和模型控件 [#110994](https://github.com/openclaw/openclaw/pull/110994)
- 在 macOS [#120511](https://github.com/openclaw/openclaw/pull/120511) 上添加经过批准的摄像机平移、倾斜和变焦
- 在连接的 Mac 设备面板上呈现小部件 [#125818](https://github.com/openclaw/openclaw/pull/125818)
- refactor（macos）：具有实时会话卡和执行批准的单所有者混合状态菜单 [#130041](https://github.com/openclaw/openclaw/pull/130041)
- refactor（macos）：状态菜单优化 — 拥有宽度、安静标题、结构化诊断、本机突出显示 [#130388](https://github.com/openclaw/openclaw/pull/130388)
- feat（macos）：使本机聊天布局和控件更接近网络 [#131849](https://github.com/openclaw/openclaw/pull/131849)
- 在多个话语中重复使用 macOS MLX 语音模型 [#104200](https://github.com/openclaw/openclaw/pull/104200)
- 在 macOS 聊天分割视图中回收垂直空间 [#104628](https://github.com/openclaw/openclaw/pull/104628)
- 刷新 macOS 安装程序图稿和布局 [#107142](https://github.com/openclaw/openclaw/pull/107142)
- 让 macOS 菜单栏小动物庆祝恢复并完成工作 [#108866](https://github.com/openclaw/openclaw/pull/108866)
- 合并 macOS WebChat 标题和工具栏行 [#109318](https://github.com/openclaw/openclaw/pull/109318)
- 为macOS应用程序[#112168](https://github.com/openclaw/openclaw/pull/112168)添加真正的仅后台启动模式
- 澄清 macOS 远程网关加入 [#114494](https://github.com/openclaw/openclaw/pull/114494)
- Move macOS 节点标识读出菜单渲染 [#116435](https://github.com/openclaw/openclaw/pull/116435)
- 刷新生成的 macOS 语言环境工件 [#117948](https://github.com/openclaw/openclaw/pull/117948)
- macOS：表面实时通话设置 [#118505](https://github.com/openclaw/openclaw/pull/118505)
- Make macOS Peekaboo主机升级事务型[#124564](https://github.com/openclaw/openclaw/pull/124564)
- 将命令括号历史快捷方式添加到 macOS 仪表板 [#104328](https://github.com/openclaw/openclaw/pull/104328)
- Give macOS 仪表板标题栏控制更多空间 [#104572](https://github.com/openclaw/openclaw/pull/104572)
- 为 macOS 设置添加工作吉祥物动画并更新 [#108735](https://github.com/openclaw/openclaw/pull/108735)
- 减少 macOS 位置权限轮询开销 [#116092](https://github.com/openclaw/openclaw/pull/116092)
- 删除重复的macOS菜单栏悬停卡[#118116](https://github.com/openclaw/openclaw/pull/118116)

**错误修复**

- 通过重新连接保持 macOS 仪表板稳定 [#117112](https://github.com/openclaw/openclaw/pull/117112)
- fix（macos）：在进程管道写入结束时抑制 SIGPIPE [#127666](https://github.com/openclaw/openclaw/pull/127666)
- fix（macos）：在应用程序重建后保持节点连接正常工作[#131466](https://github.com/openclaw/openclaw/pull/131466)
- 在 macOS 仪表板中恢复会话删除 [#102263](https://github.com/openclaw/openclaw/pull/102263)
- 从分割视图窗格标题中拖动 macOS 窗口 [#104048](https://github.com/openclaw/openclaw/pull/104048)
- 将 macOS 仪表板交通灯与托管标题栏控件对齐 [#106099](https://github.com/openclaw/openclaw/pull/106099)
- 使macOS菜单栏点击可靠 [#107786](https://github.com/openclaw/openclaw/pull/107786)
- Restore macOS 应用程序基于 Swift 6.2 [#107926](https://github.com/openclaw/openclaw/pull/107926) 构建
- 保持隐藏 macOS 画布面板不重新打开 [#110107](https://github.com/openclaw/openclaw/pull/110107)
- 打开接收代理的快速聊天对话 [#110118](https://github.com/openclaw/openclaw/pull/110118)
- 稳定 macOS 快速聊天捕获和文本上下文 [#110830](https://github.com/openclaw/openclaw/pull/110830)
- Reap 超时 macOS shell 进程组 [#115859](https://github.com/openclaw/openclaw/pull/115859)
- fix（摄像头）：保留外部 macOS 网络摄像头 [#116046](https://github.com/openclaw/openclaw/pull/116046) 上的横向输出
- 暂停非活动 macOS 画布轮询 [#116106](https://github.com/openclaw/openclaw/pull/116106)
- 恢复每个并发 macOS 位置权限请求 [#116183](https://github.com/openclaw/openclaw/pull/116183)
- Stop 取消语音唤醒计时器进行过时的工作 [#116189](https://github.com/openclaw/openclaw/pull/116189)
- 保持 macOS 语音唤醒指示器处于活动状态以进行当前捕获 [#116196](https://github.com/openclaw/openclaw/pull/116196)
- 保留最新的macOS语音唤醒触发器[#116202](https://github.com/openclaw/openclaw/pull/116202)
- Stop 取消了运行较晚的 macOS 刷新任务 [#116322](https://github.com/openclaw/openclaw/pull/116322)
- 恢复在 macOS 设置窗格之间滚动 [#118831](https://github.com/openclaw/openclaw/pull/118831)
- 在 macOS 仪表板中恢复双击缩放 [#118976](https://github.com/openclaw/openclaw/pull/118976)
- 传送临时 macOS 通知 [#122179](https://github.com/openclaw/openclaw/pull/122179)
- Reap macOS 关闭时的辅助进程 [#123538](https://github.com/openclaw/openclaw/pull/123538)
- 当前 macOS 原子画布小部件 [#126039](https://github.com/openclaw/openclaw/pull/126039)
- fix（macos）：读取当前通道健康状态[#128176](https://github.com/openclaw/openclaw/pull/128176)
- fix（ui）：将用户口音传播到通话模式和小部件框架 [#128577](https://github.com/openclaw/openclaw/pull/128577)
- fix（macos）：Control UI 的用户口音被配置快照破坏，并且从不实时更新聊天窗口 [#128703](https://github.com/openclaw/openclaw/pull/128703)
- fix（mac）：防止无地址接口上的网络发现崩溃 [#129265](https://github.com/openclaw/openclaw/pull/129265)
- fix（macos）：防止 SSH 隧道启动取消时崩溃 [#130332](https://github.com/openclaw/openclaw/pull/130332)
- fix（macos）：退出而不留下[#130421](https://github.com/openclaw/openclaw/pull/130421)后面的SSH隧道
- 修复：Claude 会话发现因过时的桌面元数据而停止 [#131237](https://github.com/openclaw/openclaw/pull/131237)
- fix（macos）：当调用者被取消时停止配套命令 [#131650](https://github.com/openclaw/openclaw/pull/131650)
- fix（macos）：保留无状态运行状况探测错误 [#132062](https://github.com/openclaw/openclaw/pull/132062)
- 删除重复的macOS标题栏品牌标记[#102497](https://github.com/openclaw/openclaw/pull/102497)
- 对 macOS MLX 语音输出 [#104233](https://github.com/openclaw/openclaw/pull/104233) 使用安全读取
- 使 macOS 分割视图标题远离窗口控件 [#104593](https://github.com/openclaw/openclaw/pull/104593)
- 从 macOS 仪表板中删除重复的侧边栏切换 [#104694](https://github.com/openclaw/openclaw/pull/104694)
- 保持紧凑型macOS品牌远离窗户控制[#107783](https://github.com/openclaw/openclaw/pull/107783)
- Stop 通过 macOS 仪表板打开设置 [#108074](https://github.com/openclaw/openclaw/pull/108074)
- 阻止代理提供的 Canvas 窗口窃取焦点 [#110245](https://github.com/openclaw/openclaw/pull/110245)
- 将 macOS 会话标头与本机标题栏控件 [#110462](https://github.com/openclaw/openclaw/pull/110462) 对齐
- 恢复macOS菜单栏中的小动物图标[#114223](https://github.com/openclaw/openclaw/pull/114223)
- 保持更换 macOS 通知可见 [#116226](https://github.com/openclaw/openclaw/pull/116226)
- 刷新生成的 macOS 语言环境目录 [#116640](https://github.com/openclaw/openclaw/pull/116640)
- 删除macOS自命名默认警告[#117690](https://github.com/openclaw/openclaw/pull/117690)
- 在 macOS [#118914](https://github.com/openclaw/openclaw/pull/118914) 上恢复本机 Codex 和 Claude 侧边栏处理
- 在 macOS 上使用位置权限时荣誉 [#122435](https://github.com/openclaw/openclaw/pull/122435)
- 恢复 macOS 上不透明会话密钥的组徽章 [#126807](https://github.com/openclaw/openclaw/pull/126807)
- fix（macos）：取消的 Talk 会话可以全速旋转 CPU [#129682](https://github.com/openclaw/openclaw/pull/129682)
- fix（macos）：在设置和语音控制中恢复被拒绝的语音权限恢复 [#129950](https://github.com/openclaw/openclaw/pull/129950)
- fix（macos）：授予权限后识别屏幕录制访问 [#130530](https://github.com/openclaw/openclaw/pull/130530)
- fix（macos）：允许拖动OpenClaw面板标题[#132288](https://github.com/openclaw/openclaw/pull/132288)
- fix（macos）：在配对的 Mac [#132713](https://github.com/openclaw/openclaw/pull/132713) 上恢复 Codex 目录

**文档**

- test（exec）：覆盖同伴响应丢失，无需本地重播 [#131961](https://github.com/openclaw/openclaw/pull/131961)

</details>

</Accordion>

<Accordion id="linux-app" title="Linux 应用">

[Linux 桌面伴侣 ](/platforms/linux) 现在包括首次运行设置、托盘和服务控件、嵌入式 Control UI、重新连接处理、深层链接、自动启动、窗口恢复、更新通知以及待处理请求的本机警报。快速聊天可切换代理，保持一个网关连接打开，在栏中流式传输回复，并显示发送是否被接受、失败或正在等待重新连接。

构建和发布路径支持 .deb 和 AppImage 包，尽管它们作为 v2026.8.1 下载的可用性尚未得到验证。召唤快捷方式适用于 X11，Wayland 保留托盘条目，批准决策保留在仪表板或命令行中。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加 Linux 桌面配套应用程序 [#106352](https://github.com/openclaw/openclaw/pull/106352)
- 添加 Linux 配套包、品牌图标和网关指南 [#106533](https://github.com/openclaw/openclaw/pull/106533)
- 添加 Linux 桌面伴侣 OS 集成 [#109236](https://github.com/openclaw/openclaw/pull/109236)
- 添加Linux批准警报和召唤快捷方式[#109322](https://github.com/openclaw/openclaw/pull/109322)
- 向 Linux 同伴添加快速聊天 [#109947](https://github.com/openclaw/openclaw/pull/109947)
- Linux快速聊天添加座席切换和快捷控制[#110285](https://github.com/openclaw/openclaw/pull/110285)
- 将 Linux 直接快速聊天连接到网关 [#110491](https://github.com/openclaw/openclaw/pull/110491)
- Stream Linux 酒吧快速聊天回复 [#110632](https://github.com/openclaw/openclaw/pull/110632)
- Render Linux 快速聊天中的交互式小部件 [#111933](https://github.com/openclaw/openclaw/pull/111933)
- 发布 Linux 附带稳定版本的配套软件包 [#106891](https://github.com/openclaw/openclaw/pull/106891)
- 使用 Clawd 吉祥物作为 Linux 桌面图标 [#108181](https://github.com/openclaw/openclaw/pull/108181)

**错误修复**

- 稳定 Linux 快速聊天小部件 [#112261](https://github.com/openclaw/openclaw/pull/112261)
- Package Linux 媒体播放编解码器 [#115616](https://github.com/openclaw/openclaw/pull/115616)
- Hide Linux 陈旧小部件清理之前的快速聊天 [#112308](https://github.com/openclaw/openclaw/pull/112308)
- 在 DPI 上保持 Linux 快速聊天在屏幕上，并且小部件调整大小 [#114271](https://github.com/openclaw/openclaw/pull/114271)
- fix（linux）：快速聊天忽略配置的网关口音 [#129451](https://github.com/openclaw/openclaw/pull/129451)

</details>

</Accordion>

<Accordion id="progress-and-presentation-by-native-app" title="本机应用程序的进展和演示">

在 iOS、macOS 和 Android 上，丰富的 [ 进度卡 ](/tools/progress-card) 可以在运行后保留在作曲家上方，并在连接的网关支持保存的卡时通过重新启动或重新连接返回。这些客户端还在回合运行时显示工作爪、经过的时间和长时间等待状态，然后在成功且明确地完成时添加持续时间和令牌回顾。较旧的网关仍然可以显示实时后备卡，但在重新启动后无法恢复这些卡，并且 Android 的后备有时会保留陈旧的已完成状态。

当客户端宣布支持时，[Assistant 创建的小部件 ](/web/dashboards) 可以在 iOS、Android、macOS 和 Linux 快速聊天上内联渲染，并且符合条件的已连接 Mac 也可以在其本机 Canvas 面板中呈现一个小部件。当 Linux 快速聊天使用自定义网关 TLS 叶针时，它仍保持纯文本状态。可扩展的文件编辑差异覆盖范围较小的客户端，并出现在 iPhone、iPad 和 Mac 上。

运行时翻译现已到达 Android 的主要工作流程，并命名为 iPhone、iPad、Live Activity、Apple Watch 和 Wear 状态界面，并在 Android 上提供每个应用程序的语言选择器。身份绑定的 iOS、macOS 和 Android 连接会随着用户的配置文件口音在不同设备上的变化而变化，iOS、watchOS、macOS 和 Android 上的语音表面共享相同的基于相位的波形，在无法进行实时计量的情况下使用合成运动。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 跨本机应用程序提供统一语音波形和实时音频反馈 [#102901](https://github.com/openclaw/openclaw/pull/102901)
- 向 Apple 应用吉祥物添加响应情绪和复活节彩蛋 [#104255](https://github.com/openclaw/openclaw/pull/104255)
- 将交互式内联小部件添加到本机聊天 [#109212](https://github.com/openclaw/openclaw/pull/109212)
- 使原生macOS聊天更接近网络聊天平价[#109712](https://github.com/openclaw/openclaw/pull/109712)
- 改进原生聊天复制、长消息读取和跟踪控制 [#110276](https://github.com/openclaw/openclaw/pull/110276)
- 将 Apple 聊天工具活动显示为可扩展行 [#110618](https://github.com/openclaw/openclaw/pull/110618)
- 在 Apple 平台上将聊天小部件复制或保存为图像 [#110987](https://github.com/openclaw/openclaw/pull/110987)
- 在 iOS 和 macOS 聊天中显示文件编辑差异 [#111039](https://github.com/openclaw/openclaw/pull/111039)
- Apple 聊天中完整的内联工具差异 [#111326](https://github.com/openclaw/openclaw/pull/111326)
- 将会话仪表板添加到 iOS 和 Android [#112163](https://github.com/openclaw/openclaw/pull/112163)
- 将工作爪带到iOS和macOS [#112188](https://github.com/openclaw/openclaw/pull/112188)
- 将实时会话观察者摘要带到本机应用程序 [#112597](https://github.com/openclaw/openclaw/pull/112597)
- 在本机聊天应用程序中显示实时 Swarm 工作进程 [#113850](https://github.com/openclaw/openclaw/pull/113850)
- 在 Apple 聊天中显示实时子代理活动 [#121815](https://github.com/openclaw/openclaw/pull/121815)
- 在 Apple 聊天中显示系统通知和历史记录边界 [#122255](https://github.com/openclaw/openclaw/pull/122255)
- 从iOS和Android查看机器桌面 [#123097](https://github.com/openclaw/openclaw/pull/123097)
- 为iOS和macOS带来耐用的进度卡[#125442](https://github.com/openclaw/openclaw/pull/125442)
- feat（apps）：实时解析 iOS、macOS 和 Android [#130598](https://github.com/openclaw/openclaw/pull/130598) 上的每个配置文件口音
- 在本机聊天应用程序中使用线程措辞 [#111038](https://github.com/openclaw/openclaw/pull/111038)
- 跨所有支持的区域设置刷新生成的本机目录 [#112441](https://github.com/openclaw/openclaw/pull/112441)
- 添加禅宗、鼓手和躲猫猫工作爪动画 [#112570](https://github.com/openclaw/openclaw/pull/112570)
- 刷新生成的本机应用程序翻译 [#112662](https://github.com/openclaw/openclaw/pull/112662)
- 刷新本机应用程序翻译 [#114915](https://github.com/openclaw/openclaw/pull/114915)
- 跨本机应用程序刷新翻译 [#115532](https://github.com/openclaw/openclaw/pull/115532)
- 添加四个罕见的工作爪动画[#120826](https://github.com/openclaw/openclaw/pull/120826)
- 刷新聊天恢复和历史消息的本机翻译 [#122355](https://github.com/openclaw/openclaw/pull/122355)
- chore（i18n）：刷新本机语言环境 [#128759](https://github.com/openclaw/openclaw/pull/128759)
- chore（i18n）：刷新本机语言环境 [#133074](https://github.com/openclaw/openclaw/pull/133074)
- Share Apple 聊天网关负载映射 [#106154](https://github.com/openclaw/openclaw/pull/106154)
- 用紧凑型按钮替换宽跳转到最新药丸[#110651](https://github.com/openclaw/openclaw/pull/110651)
- 跨应用程序锐化工作爪图标 [#114939](https://github.com/openclaw/openclaw/pull/114939)
- 刷新当前 Android 和 iOS 翻译 [#120352](https://github.com/openclaw/openclaw/pull/120352)
- 刷新生成的本机应用程序区域设置 [#121000](https://github.com/openclaw/openclaw/pull/121000)
- 刷新生成的本机应用程序区域设置 [#121561](https://github.com/openclaw/openclaw/pull/121561)
- 刷新生成的 Android 和 iOS 区域设置 [#123101](https://github.com/openclaw/openclaw/pull/123101)
- 刷新生成的本机应用程序区域设置 [#124089](https://github.com/openclaw/openclaw/pull/124089)
- chore（i18n）：刷新本机语言环境 [#131987](https://github.com/openclaw/openclaw/pull/131987)

**错误修复**

- Harden 移动网关会话和 Apple 观看回复状态 [2c316f5](https://github.com/openclaw/openclaw/commit/2c316f5)
- Fence stale 监视操作并保留重试的附件 [7838c6a](https://github.com/openclaw/openclaw/commit/7838c6a)
- 使 Apple 超时及时返回并保证重试安全 [#103066](https://github.com/openclaw/openclaw/pull/103066)
- 重新连接后恢复本机实时更新 [#113634](https://github.com/openclaw/openclaw/pull/113634)
- Render 助手在本机聊天中生成的图像 [#115042](https://github.com/openclaw/openclaw/pull/115042)
- 恢复 iOS、Android 和 macOS 的本机 Talk 行为 [#115577](https://github.com/openclaw/openclaw/pull/115577)
- 在 Apple 应用程序上恢复带有已发布网关的计划卡 [#125588](https://github.com/openclaw/openclaw/pull/125588)
- 在 Android 库存漂移后重新同步本机翻译 [bd03b4d](https://github.com/openclaw/openclaw/commit/bd03b4d)
- 恢复本机运行时、观看头像、浏览器图形和本地音频行为 [#107631](https://github.com/openclaw/openclaw/pull/107631)
- 使用本机桌面系统通知 [#109901](https://github.com/openclaw/openclaw/pull/109901)
- 继续跳转到实时边缘隐藏的最新内容 [#110811](https://github.com/openclaw/openclaw/pull/110811)
- 本地化 Android 风味和 Apple 设置表面 [#113214](https://github.com/openclaw/openclaw/pull/113214)
- 刷新本地语言环境并修复印尼倒计时单位 [#113289](https://github.com/openclaw/openclaw/pull/113289)
- 在本机聊天中保留图像和语音注释并导出 [#113764](https://github.com/openclaw/openclaw/pull/113764)
- 恢复Apple聊天侧边栏排序和搜索[#113886](https://github.com/openclaw/openclaw/pull/113886)
- 在本机聊天中保留文字 Markdown 图像示例 [#113904](https://github.com/openclaw/openclaw/pull/113904)
- Localize Apple 网关发现状态 [#115051](https://github.com/openclaw/openclaw/pull/115051)
- 在Apple平台上显示扩展披露内容 [#115863](https://github.com/openclaw/openclaw/pull/115863)
- 当路由未知时保持 iOS 附件可用 [#116787](https://github.com/openclaw/openclaw/pull/116787)
- 刷新子代理状态的本机翻译 [#121939](https://github.com/openclaw/openclaw/pull/121939)
- 将嵌入式 Control UI 与移动应用外观 [#123408](https://github.com/openclaw/openclaw/pull/123408) 相匹配
- fix（macos）：防止重复的新聊天会话和过时的导航 [#127693](https://github.com/openclaw/openclaw/pull/127693)
- fix（应用程序）：防止Unicode数字冻结代码突出显示[#128364](https://github.com/openclaw/openclaw/pull/128364)
- fix（位置）：拒绝将来的缓存修复 [#128591](https://github.com/openclaw/openclaw/pull/128591)
- fix（节点）：报告硬件实际到达的相机位置[#128595](https://github.com/openclaw/openclaw/pull/128595)
- feat（ios）： 在聊天中采用网关用户口音 [#128599](https://github.com/openclaw/openclaw/pull/128599)
- chore（i18n）：刷新本机语言环境 [#130270](https://github.com/openclaw/openclaw/pull/130270)
- fix（苹果）：避免重建未更改的工具差异预览[#130615](https://github.com/openclaw/openclaw/pull/130615)
- chore（i18n）：刷新本机语言环境 [#130667](https://github.com/openclaw/openclaw/pull/130667)
- fix（苹果）：在反向代理路径后面加载聊天媒体 [#130755](https://github.com/openclaw/openclaw/pull/130755)
- fix（ios）：在回复流 [#131513](https://github.com/openclaw/openclaw/pull/131513) 时避免重复 Markdown 工作
- 刷新本机应用程序翻译和区域设置目录 [#115608](https://github.com/openclaw/openclaw/pull/115608)
- fix（苹果）：将小部件快照绑定到其文档所有者[#129666](https://github.com/openclaw/openclaw/pull/129666)
- fix（talk）：当旧话语被取消时保留替换语音 [#130687](https://github.com/openclaw/openclaw/pull/130687)
- fix（i18n）：按参数顺序显示印地语搜索匹配计数 [#132176](https://github.com/openclaw/openclaw/pull/132176)
- 稳定 Apple 聊天中的流式回复 [#50483](https://github.com/openclaw/openclaw/pull/50483)

</details>

</Accordion>

</AccordionGroup>
