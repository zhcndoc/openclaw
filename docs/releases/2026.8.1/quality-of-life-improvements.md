---
title: "v2026.8.1：生活质量改善"
description: "日常工作可以轻松查找、跟踪、移动和保护，包括过去的对话、长期工作的明显进展以及云或配对计算机会话。"
---

OpenClaw 的日常工作现在可以更轻松地查找、跟踪、移动和保护。 [过去的对话](/concepts/session-search)更容易返回，长时间作业保持有用的进度可见，可以在需要之前检查便携式快照，并且符合条件的工作可以在[云工作人员](/gateway/cloud-workers)或[配对计算机](/gateway/cloud-sessions)上运行，云会话稍后回收到主机。语音、视频、会议捕获、代理工具、键盘访问、维护翻译、界面优化和文档也进行了更改，使产品在日常工作中更易于使用。

<AccordionGroup>

<Accordion id="past-conversations-and-long-running-work" title="过去的对话和长期运行的工作">

[过去的谈话](/concepts/session-search)并且长时间运行的工作更容易找到和遵循。会话目录分组并打开Codex， Claude Code， OpenCode， 和Pi从主要工作OpenClaw计算机或符合条件的配对计算机，每个会话可以在整个计算机上携带八种颜色中的一种Control UI， macOS， iOS， 和Android。符合资格的Claude Code延续还将其选择的颜色和重命名的标题带入OpenClaw而不替换以后的编辑。耐用的[进度卡](/tools/progress-card)能够承受重新加载和重新连接，并且可以在网络上查看后台任务历史记录，iOS， 和Android。可选的观察者可以总结对话，回答有关对话的问题，显示其时间表，并在需要注意时提醒操作员。

恢复支持取决于拥有会话的运行时。 OpenCode 和 Pi 目录仅供查看，配对计算机操作需要选择加入的主机和合格的会话，并且外部成绩单保留其原始运行时。观察者可以被禁用，并且需要可用的实用新型。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 向工作板添加可共享板过滤 [#102068](https://github.com/openclaw/openclaw/pull/102068)
- 跨网关和节点浏览 Codex 会话 [#102586](https://github.com/openclaw/openclaw/pull/102586)
- 添加本机Codex会话监管[#104045](https://github.com/openclaw/openclaw/pull/104045)
- 在侧边栏中显示 Codex 会话和成绩单 [#104437](https://github.com/openclaw/openclaw/pull/104437)
- 跨配对计算机浏览 Claude 会话 [#104528](https://github.com/openclaw/openclaw/pull/104528)
- 持久子会话状态通知和协调 [#104636](https://github.com/openclaw/openclaw/pull/104636)
- 将 Claude Code 和 Codex 历史记录引入本机会话 [#104717](https://github.com/openclaw/openclaw/pull/104717)
- 让会话协调员监视对等状态更改 [#104815](https://github.com/openclaw/openclaw/pull/104815)
- 添加过去会话的全文回忆 [#105057](https://github.com/openclaw/openclaw/pull/105057)
- 从侧边栏创建提供商本机会话 [#105810](https://github.com/openclaw/openclaw/pull/105810)
- 在配对节点上继续 Claude Code 会话 [#105833](https://github.com/openclaw/openclaw/pull/105833)
- 加强对承诺的代理工作的跟进 [#105958](https://github.com/openclaw/openclaw/pull/105958)
- 向客户端公开安全会话分类事实 [#106832](https://github.com/openclaw/openclaw/pull/106832)
- 在 Control UI [#106921](https://github.com/openclaw/openclaw/pull/106921) 中显示压缩节省和活动运行时间
- 从 Control UI [#106927](https://github.com/openclaw/openclaw/pull/106927) 继续配对节点 Codex 会话
- 在本地和配对节点上发现 OpenCode 和 Pi 会话 [#106941](https://github.com/openclaw/openclaw/pull/106941)
- feat（sessions）：采用的目录会话的上游活跃度 [#107009](https://github.com/openclaw/openclaw/pull/107009)
- 在其本机终端中打开 Codex 和 Claude 会话 [#107086](https://github.com/openclaw/openclaw/pull/107086)
- 在终端中恢复 OpenCode 和 Pi 会话 [#107200](https://github.com/openclaw/openclaw/pull/107200)
- 在聊天频道中显示实时代理计划清单 [#108597](https://github.com/openclaw/openclaw/pull/108597)
- 在第一方聊天客户端中显示实时计划清单 [#108675](https://github.com/openclaw/openclaw/pull/108675)
- 在目录 [#109142](https://github.com/openclaw/openclaw/pull/109142) 中显示 Atlas 和 ChatGPT Codex 会话
- 跨 Web、iOS 和 Android 检查后台任务 [#109150](https://github.com/openclaw/openclaw/pull/109150)
- 在聊天线程内显示实时计划清单 [#109343](https://github.com/openclaw/openclaw/pull/109343)
- Group Codex 和 Claude 按项目列出的会话目录 [#109575](https://github.com/openclaw/openclaw/pull/109575)
- 加速从配对 Mac 加载本机会话 [#110030](https://github.com/openclaw/openclaw/pull/110030)
- 让主要代理了解同一代理组的活动 [#110332](https://github.com/openclaw/openclaw/pull/110332)
- Flow仪表板线程活动返回主代理[#110913](https://github.com/openclaw/openclaw/pull/110913)
- 保持重置会话历史记录可搜索 [#111194](https://github.com/openclaw/openclaw/pull/111194)
- Connect 会话仪表板端到端 [#111218](https://github.com/openclaw/openclaw/pull/111218)
- 在共享网关上显示在线用户和会话查看者 [#111225](https://github.com/openclaw/openclaw/pull/111225)
- Connect Workboard 卡与实时会话仪表板 [#111989](https://github.com/openclaw/openclaw/pull/111989)
- 对齐聊天小部件，添加仪表板深层链接并显示信任状态 [#112076](https://github.com/openclaw/openclaw/pull/112076)
- 添加网关会话观察者摘要[#112216](https://github.com/openclaw/openclaw/pull/112216)
- 添加会话观察者HUD和状态摘要[#112260](https://github.com/openclaw/openclaw/pull/112260)
- 添加直接 WorkBoard 路线、侧边栏图钉、图标和颜色 [#112302](https://github.com/openclaw/openclaw/pull/112302)
- Add Beam 只读编码会话共享 [#112323](https://github.com/openclaw/openclaw/pull/112323)
- 简化编码会话标头并添加Codex线程创建[#112354](https://github.com/openclaw/openclaw/pull/112354)
- 将本机 WorkBoard 小部件添加到会话仪表板 [#112434](https://github.com/openclaw/openclaw/pull/112434)
- 向 Control UI 询问会话观察员 [#112448](https://github.com/openclaw/openclaw/pull/112448)
- 将观察者时间线卡添加到会话板 [#112565](https://github.com/openclaw/openclaw/pull/112565)
- 将安全模型序言显示为实时会话字幕 [#112958](https://github.com/openclaw/openclaw/pull/112958)
- 在后台任务栏内显示子代理详细信息 [#113671](https://github.com/openclaw/openclaw/pull/113671)
- 继续目录 [#113718](https://github.com/openclaw/openclaw/pull/113718) 中的 Pi 和 OpenCode 会话
- 当后台会话需要注意时通知操作员 [#113819](https://github.com/openclaw/openclaw/pull/113819)
- 围绕内置会话部分重新排序自定义侧边栏组 [#113948](https://github.com/openclaw/openclaw/pull/113948)
- 检测采用的 Pi 和 OpenCode 会话中的外部活动 [#113957](https://github.com/openclaw/openclaw/pull/113957)
- 将本地编码会话镜像到团队光束接收器 [#114735](https://github.com/openclaw/openclaw/pull/114735)
- 安全地重用实时Codex应用程序服务器线程[#115089](https://github.com/openclaw/openclaw/pull/115089)
- 使用准备好的插件元数据加快会话列表 [#117707](https://github.com/openclaw/openclaw/pull/117707)
- 从流扇出中删除二次功 [#118192](https://github.com/openclaw/openclaw/pull/118192)
- 在并发流传输期间保持会话仪表板响应 [#118207](https://github.com/openclaw/openclaw/pull/118207)
- 添加 CLI 命令以存档和删除会话 [#118791](https://github.com/openclaw/openclaw/pull/118791)
- 批量会话归档完成 [#120493](https://github.com/openclaw/openclaw/pull/120493)
- 直接从 CLI [#120664](https://github.com/openclaw/openclaw/pull/120664) 恢复最近的会话
- 在全尺寸终端中可靠地恢复 Codex 目录会话 [#120708](https://github.com/openclaw/openclaw/pull/120708)
- 直接从 CLI [#120893](https://github.com/openclaw/openclaw/pull/120893) 继续仪表板会话
- 防止繁忙的会话延迟其他网关更新 [#121104](https://github.com/openclaw/openclaw/pull/121104)
- 撤销推断的后续承诺 [#121479](https://github.com/openclaw/openclaw/pull/121479)
- 在 Control UI 聊天中显示实时子代理活动和编辑计数 [#121840](https://github.com/openclaw/openclaw/pull/121840)
- 恢复因网关重启而中断的会话 [#122644](https://github.com/openclaw/openclaw/pull/122644)
- 在终端中继续 Control UI 会话 [#122870](https://github.com/openclaw/openclaw/pull/122870)
- 在聊天侧边栏打开实时子代理详细信息 [#122941](https://github.com/openclaw/openclaw/pull/122941)
- 在一个共享详细信息面板中打开每一项任务 [#123003](https://github.com/openclaw/openclaw/pull/123003)
- 添加选择加入 Anthropic 服务器端压缩 [#123402](https://github.com/openclaw/openclaw/pull/123402)
- 为 xAI 会话添加服务器端上下文压缩 [#123622](https://github.com/openclaw/openclaw/pull/123622)
- 将额外的 Codex 家庭添加到会话目录 [#124660](https://github.com/openclaw/openclaw/pull/124660)
- 保持持久代理工作可见并存档不活动会话 [#124925](https://github.com/openclaw/openclaw/pull/124925)
- 添加主会话可见性和可信房间路由 [#124965](https://github.com/openclaw/openclaw/pull/124965)
- 在 Control UI 中显示代理创建层次结构 [#124967](https://github.com/openclaw/openclaw/pull/124967)
- 在会话仪表板上显示完整的工作板板 [#125094](https://github.com/openclaw/openclaw/pull/125094)
- 为座席会话添加持久进度卡 [#125125](https://github.com/openclaw/openclaw/pull/125125)
- 将实时会话进度卡固定到仪表板 [#125438](https://github.com/openclaw/openclaw/pull/125438)
- 在主要会话中首选代表团并合并观察者唤醒 [#125691](https://github.com/openclaw/openclaw/pull/125691)
- 提示符合条件的代理保持进度卡最新 [#125701](https://github.com/openclaw/openclaw/pull/125701)
- 添加独立和浏览器全屏仪表板 [#125806](https://github.com/openclaw/openclaw/pull/125806)
- 使活动会话过滤器紧凑且更易于使用 [#125917](https://github.com/openclaw/openclaw/pull/125917)
- Link 代理创建的公共工作会话拉取请求 [#126057](https://github.com/openclaw/openclaw/pull/126057)
- refactor（anthropic）：用 Agent SDK [#128131](https://github.com/openclaw/openclaw/pull/128131) 替换手写 Claude 会话
- feat（github）：表面团队会话归因 [#129012](https://github.com/openclaw/openclaw/pull/129012)
- feat：跨网络的每个会话颜色，macOS、iOS、Android，带有 Claude Code 导入 [#132570](https://github.com/openclaw/openclaw/pull/132570)
- 根据实时更改刷新工作板 [#99051](https://github.com/openclaw/openclaw/pull/99051)
- 使用简单的工作标签表示代理进度 [#107260](https://github.com/openclaw/openclaw/pull/107260)
- Cache 未更改 Claude 会话目录元数据 [#109309](https://github.com/openclaw/openclaw/pull/109309)
- 列出会话时重用 SQLite 连接 [#113862](https://github.com/openclaw/openclaw/pull/113862)
- 将子代理标签引导至清晰的任务标题 [#113950](https://github.com/openclaw/openclaw/pull/113950)
- 通过请求本地存储重用加速大型会话列表 [#114003](https://github.com/openclaw/openclaw/pull/114003)
- 加快具有多个会话的网关上的会话列表 [#114237](https://github.com/openclaw/openclaw/pull/114237)
- 仅克隆请求的任务列表页面 [#114277](https://github.com/openclaw/openclaw/pull/114277)
- 缓存会话的本地 Git 事实 PR 摘要 [#114311](https://github.com/openclaw/openclaw/pull/114311)
- 在每个请求中重用会话目录条目 [#114358](https://github.com/openclaw/openclaw/pull/114358)
- 通过增量转录读取加速会话文件面板加载 [#114401](https://github.com/openclaw/openclaw/pull/114401)
- Cache 转录水印后面的会话分支摘要 [#114412](https://github.com/openclaw/openclaw/pull/114412)
- 缓存本地Claude会话发现[#114833](https://github.com/openclaw/openclaw/pull/114833)
- 增量重新验证 SQLite 会话快照 [#115359](https://github.com/openclaw/openclaw/pull/115359)
- Stream 大型 Codex 会话 JSONL 扫描 [#115997](https://github.com/openclaw/openclaw/pull/115997)
- 跨分页页面重用Claude转录本发现[#116324](https://github.com/openclaw/openclaw/pull/116324)
- 重新使用 Codex 应用服务器进行 macOS 目录读取 [#116325](https://github.com/openclaw/openclaw/pull/116325)
- 加快会话的批量读取、存档和类别更改 [#120629](https://github.com/openclaw/openclaw/pull/120629)
- 使批量会话归档速度大幅加快 [#120873](https://github.com/openclaw/openclaw/pull/120873)
- 向任务事件添加实时子代理活动和文件更改统计信息 [#121549](https://github.com/openclaw/openclaw/pull/121549)
- 在任务行中显示实时 Codex 子代理活动 [#121899](https://github.com/openclaw/openclaw/pull/121899)
- 从嵌入式会话存储器中释放压缩的工具结果数据 [#122646](https://github.com/openclaw/openclaw/pull/122646)
- 名称附加 Codex 会话目录主页 [#124807](https://github.com/openclaw/openclaw/pull/124807)
- 记录代理创建起源并添加花名册树输出[#124828](https://github.com/openclaw/openclaw/pull/124828)
- 加快聊天记录和启动加载 [#125123](https://github.com/openclaw/openclaw/pull/125123)
- 使工作板在 Control UI 侧边栏中可见 [#125473](https://github.com/openclaw/openclaw/pull/125473)
- 让客服人员按侧边栏类别组织可见会话 [#126074](https://github.com/openclaw/openclaw/pull/126074)
- improve（ui）：紧凑型现场活动过滤器 [#128972](https://github.com/openclaw/openclaw/pull/128972)
- improve（网关）：更快地加载会话历史记录，无需重复读取器 [#129114](https://github.com/openclaw/openclaw/pull/129114)
- 在活动 [#90610](https://github.com/openclaw/openclaw/pull/90610) 中显示 Codex 答案候选者生命周期
- 从任务列表刷新中删除冗余排序 [#102202](https://github.com/openclaw/openclaw/pull/102202)
- 集中会话目录搜索规范化 [#108240](https://github.com/openclaw/openclaw/pull/108240)
- 分割 Control UI 聊天记录所有权并停用旧引脚 [#122420](https://github.com/openclaw/openclaw/pull/122420)
- 使进度卡选择最清晰的表示 [#125613](https://github.com/openclaw/openclaw/pull/125613)
- Link 已知 PR 和正在进行的问题卡 [#125887](https://github.com/openclaw/openclaw/pull/125887)
- 延迟扫描记录以获取最新事件检查 [#127162](https://github.com/openclaw/openclaw/pull/127162)

**错误修复**

- fix：网关终止使 Codex 工具进程运行 [#107721](https://github.com/openclaw/openclaw/pull/107721)
- 在大型活动历史记录中快速使用会话 [#108834](https://github.com/openclaw/openclaw/pull/108834)
- 在每个主机完成时流式传输本机会话 [#110211](https://github.com/openclaw/openclaw/pull/110211)
- fix（特工）：切勿在转弯结束时掉落或停止接受的转向 [#127836](https://github.com/openclaw/openclaw/pull/127836)
- fix（sessions）：防止活动中的参与者错误归因 [#130986](https://github.com/openclaw/openclaw/pull/130986)
- fix（网关）：减少大量会话历史记录的内存压力 [#131653](https://github.com/openclaw/openclaw/pull/131653)
- fix（代理）：恢复收集器输出并准备好harness执行 [#131739](https://github.com/openclaw/openclaw/pull/131739)
- fix（cli）：从规范存储中读取会话历史记录，而不是退役文件 [#132185](https://github.com/openclaw/openclaw/pull/132185)
- fix（工作树）：回收归档签出和绑定磁盘分配 [#132706](https://github.com/openclaw/openclaw/pull/132706)
- 修复：恢复压缩忽略停止并丢失已提交计数 [#133260](https://github.com/openclaw/openclaw/pull/133260)
- fix（代理）：接受可见的仅会话子代理完成 [9516211](https://github.com/openclaw/openclaw/commit/9516211)
- fix（切换）：跳过没有子代理的单独代理的协调器框架 [#102636](https://github.com/openclaw/openclaw/pull/102636)
- fix（会话）：在活动重写分支上保留重试身份[#126503](https://github.com/openclaw/openclaw/pull/126503)
- fix（代理）：表面失败子代理完成通知[#128512](https://github.com/openclaw/openclaw/pull/128512)
- fix（代理核心）：在中止 [#128695](https://github.com/openclaw/openclaw/pull/128695) 时将耗尽的 steer/follow-up 恢复到其源队列
- perf：每个增量成本随着并发代理数量的增加而增加，因为每个增量都会遍历每个运行的事件侦听器 [#129174](https://github.com/openclaw/openclaw/pull/129174)
- fix（代理）：公开排队会话状态 [#131444](https://github.com/openclaw/openclaw/pull/131444)
- fix（压缩）：记录省略的图像而不是默默地丢弃它们[#131977](https://github.com/openclaw/openclaw/pull/131977)
- fix（子代理）：重试结算唤醒传递时识别请求者回复 [#132032](https://github.com/openclaw/openclaw/pull/132032)
- fix（自动回复）：在终端故障中保留成功压缩[#132084](https://github.com/openclaw/openclaw/pull/132084)
- fix（子代理）：通过精确的运行标识解决完成恢复 [#132111](https://github.com/openclaw/openclaw/pull/132111)
- fix（sessions）：在可见生成中保留默认值和托管父存储库 [#132364](https://github.com/openclaw/openclaw/pull/132364)
- fix（网关）：本机子代理交付在完成后保持待定状态 [#132430](https://github.com/openclaw/openclaw/pull/132430)
- fix（sessions）：压缩后保持重置历史关闭 [#132606](https://github.com/openclaw/openclaw/pull/132606)
- fix：防止有界转录事件 ID 重用 [#132620](https://github.com/openclaw/openclaw/pull/132620)
- fix（sessions）：采用标题重复的本机线程 [#132678](https://github.com/openclaw/openclaw/pull/132678)
- fix（代理）：在压缩过程中保留键控转弯 [#133094](https://github.com/openclaw/openclaw/pull/133094)
- fix（codex）：避免不相关的不可读进程导致启动失败 [#133111](https://github.com/openclaw/openclaw/pull/133111)
- fix（代理）：解决拥有的孤儿成绩单修复[#133243](https://github.com/openclaw/openclaw/pull/133243)
- 清除顶级会话上的过时子代理沿袭 [#67946](https://github.com/openclaw/openclaw/pull/67946)
- fix（acp）：保留超时进度摘要 [#91479](https://github.com/openclaw/openclaw/pull/91479)
- fix（会话）：识别拒绝的成绩单安全附加[#130997](https://github.com/openclaw/openclaw/pull/130997)
- 修复：sessions.create拒绝文件工作目录[#131955](https://github.com/openclaw/openclaw/pull/131955)

**文档**

- docs：澄清配对节点 Codex 连续限制 [#132637](https://github.com/openclaw/openclaw/pull/132637)

</details>

</Accordion>

<Accordion id="stored-data-and-backups" title="存储的数据和备份">

会话和记录、选定的设备和身份验证记录、会议捕获和运行时日志现在使用 SQLite- 支持的存储，并且可以通过同一工具集创建、验证和恢复 [ 便携式快照](/cli/backup)。这为备份和恢复在事件发生前提供了一条可检查的路径。

某些旧存储需要先停止拥有进程，然后 `openclaw doctor --fix` 才能迁移它们。未导入挂起的配对请求和引导代码，macOS 隧道迁移无法由较旧的 JSON-only 版本读取，并且恢复拒绝覆盖现有目标。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- Harden SQLite 状态生命周期和快照 [#104859](https://github.com/openclaw/openclaw/pull/104859)
- 创建并验证便携式 SQLite 快照 [#105718](https://github.com/openclaw/openclaw/pull/105718)
- 集中 Reef 对等信任 SQLite [#108375](https://github.com/openclaw/openclaw/pull/108375)
- 将节点主机身份和网关设置移动到 SQLite [#108457](https://github.com/openclaw/openclaw/pull/108457)
- 将 APNs 注册移动到共享 SQLite [#108543](https://github.com/openclaw/openclaw/pull/108543)
- 将工作区设置状态存储在 SQLite [#109147](https://github.com/openclaw/openclaw/pull/109147) 中
- 为可信插件添加有限的 SQLite BLOB 存储 [#109328](https://github.com/openclaw/openclaw/pull/109328)
- 将通道运行时状态移动到共享 SQLite 存储中 [#109380](https://github.com/openclaw/openclaw/pull/109380)
- 将剩余的非会话运行时日志移至 SQLite [#109427](https://github.com/openclaw/openclaw/pull/109427)
- 将 MCP OAuth 凭证和刷新状态移动到 SQLite [#109844](https://github.com/openclaw/openclaw/pull/109844)
- 将默认会话存档磁盘预算提高到 10 GiB [#110221](https://github.com/openclaw/openclaw/pull/110221)
- 在重新启动时保留询问 OpenClaw 对话 [#111440](https://github.com/openclaw/openclaw/pull/111440)
- 统一 iPhone 和 Mac 的离线存储 [#111598](https://github.com/openclaw/openclaw/pull/111598)
- 将保存的媒体历史记录迁移到规范事实 [#113695](https://github.com/openclaw/openclaw/pull/113695)
- 将本地工具注释移至AGENTS.md [#113966](https://github.com/openclaw/openclaw/pull/113966)
- 当副本索引为当前时加速网关启动 [#117342](https://github.com/openclaw/openclaw/pull/117342)
- 将共享代理凭据移至共享状态 SQLite [#123349](https://github.com/openclaw/openclaw/pull/123349)
- 在维护期间保留最近活动的会话历史记录 [#123987](https://github.com/openclaw/openclaw/pull/123987)
- 将会话和记录移动到每个代理 SQLite 存储 [#98236](https://github.com/openclaw/openclaw/pull/98236)
- 将设备配对状态移动到共享SQLite数据库[#103160](https://github.com/openclaw/openclaw/pull/103160)
- Harden SQLite 用于备份的快照发布 [#105412](https://github.com/openclaw/openclaw/pull/105412)
- 将托管映像元数据移至 SQLite [#108290](https://github.com/openclaw/openclaw/pull/108290)
- 将设备标识移至共享 SQLite 状态 [#110392](https://github.com/openclaw/openclaw/pull/110392)
- 将 macOS SSH 隧道所有权记录移动到 SQLite [#110527](https://github.com/openclaw/openclaw/pull/110527)
- 将设备身份验证令牌移至共享 SQLite 状态 [#112663](https://github.com/openclaw/openclaw/pull/112663)
- 将会议捕获记录移动到 SQLite [#112910](https://github.com/openclaw/openclaw/pull/112910)
- 统一索赔隔离跨渠道交付 [#114689](https://github.com/openclaw/openclaw/pull/114689)
- 重用同步SQLite准备好的语句[#114777](https://github.com/openclaw/openclaw/pull/114777)
- 避免在本地 CLI 轮转期间重复迁移扫描 [#119051](https://github.com/openclaw/openclaw/pull/119051)
- 撤销过时的承诺数据库架构 [#122176](https://github.com/openclaw/openclaw/pull/122176)
- fix（日志）：索引帧和批量查询[#129570](https://github.com/openclaw/openclaw/pull/129570)
- 为嵌入式压缩添加单独的思考级别 [#98074](https://github.com/openclaw/openclaw/pull/98074)
- 解释从较新的状态模式的安全恢复 [#104751](https://github.com/openclaw/openclaw/pull/104751)
- 将使用成本缓存状态移至每个代理 SQLite [#106051](https://github.com/openclaw/openclaw/pull/106051)
- 仅使用 SQLite 进行网关会话查找 [#112676](https://github.com/openclaw/openclaw/pull/112676)
- 简化 TOOLS.md 迁移恢复 [#115857](https://github.com/openclaw/openclaw/pull/115857)

**错误修复**

- fix（会话）：在启动和修复过程中保留共享历史记录 [#127241](https://github.com/openclaw/openclaw/pull/127241)
- fix（sqlite）：防止 WAL 裂脑清理损坏 [#132844](https://github.com/openclaw/openclaw/pull/132844)
- 从ACP重放写入中删除重复的全表扫描[#104739](https://github.com/openclaw/openclaw/pull/104739)
- Batch Doctor规范会话修复[#117068](https://github.com/openclaw/openclaw/pull/117068)
- fix（会话）：保留多存储清理部分失败的完整摘要（#127583）[#128905](https://github.com/openclaw/openclaw/pull/128905)
- fix：代理数据库在关闭或逐出后重新打开接受更新的架构 [#131331](https://github.com/openclaw/openclaw/pull/131331)

**文档**

- refactor（state）：在架构 v10 [#129626](https://github.com/openclaw/openclaw/pull/129626) 处淘汰 6 个死共享状态表

</details>

</Accordion>

<Accordion id="remote-computers-and-devices" title="远程计算机和设备">

工作不再需要停留在运行 OpenClaw 的主机上。配置的 [cloud 工作线程 ](/gateway/cloud-workers) 可以在选定的存储库中启动会话，然后将其返回到主机，并且当可以安全解析该身份时，Control UI 现在可以识别放置后面的服务和配置文件。 Crabbox 配置文件可以将机器大小留给服务或为一个会话选择它。明确选择加入的 [ 配对计算机 ](/gateway/cloud-sessions)（包括合格的本机 Mac）可以使用由 OpenClaw 验证和提供的工作包运行完整的回合，而不是安装在那里的任何代码。

这是两条不同的路径，具有不同的要求。云工作人员需要配置的配置文件和 OpenClaw 运行时，而配对计算机需要兼容的版本、同意、可用容量以及对所请求命令的支持。可移植工作包不包括目标计算机的本机终端模块，因此依赖于真正交互式终端的工作仍然具有真正的边界。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- Direct Apple 通过 Wi-Fi 或蜂窝网络的手表网关节点 [#102893](https://github.com/openclaw/openclaw/pull/102893)
- 添加持久的云工作人员环境基础 [#104401](https://github.com/openclaw/openclaw/pull/104401)
- feat（cloud-workers）：添加crabbox工作提供商插件和配置文件感知的租赁生命周期[#104465](https://github.com/openclaw/openclaw/pull/104465)
- 使用固定的、经过验证的捆绑包引导云工作人员 [#104532](https://github.com/openclaw/openclaw/pull/104532)
- 在设备页面上统一机器状态 [#104561](https://github.com/openclaw/openclaw/pull/104561)
- 将节点警报路由到活动 Mac [#105083](https://github.com/openclaw/openclaw/pull/105083)
- 为云工作人员会话添加可重播的实时事件 [#105275](https://github.com/openclaw/openclaw/pull/105275)
- 将 CLI 和本机功能组合在一个 Mac 节点中 [#105642](https://github.com/openclaw/openclaw/pull/105642)
- 添加受限云工作线程运行时 [#105865](https://github.com/openclaw/openclaw/pull/105865)
- 将设备移至设置并重新设计库存 [#106055](https://github.com/openclaw/openclaw/pull/106055)
- 添加持久云工作线程会话放置和调度 [#106332](https://github.com/openclaw/openclaw/pull/106332)
- 向 Linux 节点添加摄像头、位置和通知 [#107193](https://github.com/openclaw/openclaw/pull/107193)
- 从 Control UI 创建云工作人员会话 [#107670](https://github.com/openclaw/openclaw/pull/107670)
- 让云工作人员使用选定的存储库 [#107976](https://github.com/openclaw/openclaw/pull/107976)
- 从 Linux 桌面应用程序发现附近的网关 [#108115](https://github.com/openclaw/openclaw/pull/108115)
- 运行并安全回收云工作线程会话 [#108398](https://github.com/openclaw/openclaw/pull/108398)
- 在 Control UI [#111329](https://github.com/openclaw/openclaw/pull/111329) 中显示云工作区冲突和恢复步骤
- 跨官方应用同时连接多个网关 [#111932](https://github.com/openclaw/openclaw/pull/111932)
- 管理可重复使用的 macOS 网关配置文件和窗口 [#111986](https://github.com/openclaw/openclaw/pull/111986)
- 添加配对网关节点作为一级代码模式 API [#114877](https://github.com/openclaw/openclaw/pull/114877)
- 从 Control UI [#120727](https://github.com/openclaw/openclaw/pull/120727) 监视和控制云工作人员桌面
- 添加与`oc-pair://`链接的一贴式设备配对[#120768](https://github.com/openclaw/openclaw/pull/120768)
- Cloud Worker 桌面应用程序和浏览器自治 [#121475](https://github.com/openclaw/openclaw/pull/121475)
- 让云会话生成并消息嵌套云会话 [#121846](https://github.com/openclaw/openclaw/pull/121846)
- 为新节点机器添加一粘贴式登录 [#122499](https://github.com/openclaw/openclaw/pull/122499)
- 为工作人员暴露公共网关入口 [#122578](https://github.com/openclaw/openclaw/pull/122578)
- 允许工作人员通过公共网关连接 [#122643](https://github.com/openclaw/openclaw/pull/122643)
- Run 完整代理打开配对设备 [#123157](https://github.com/openclaw/openclaw/pull/123157)
- 云会话磁盘空间不足时发出警告 [#123177](https://github.com/openclaw/openclaw/pull/123177)
- 在会话选择器中记住离线设备 [#123198](https://github.com/openclaw/openclaw/pull/123198)
- 将工作人员工作空间传输到配对节点并协调结果 [#123280](https://github.com/openclaw/openclaw/pull/123280)
- Run Codex 云工作线程上的会话工作 [#123743](https://github.com/openclaw/openclaw/pull/123743)
- 从网关工作捆绑包运行配对设备会话 [#124037](https://github.com/openclaw/openclaw/pull/124037)
- 显示已连接设备的已验证工作程序包状态 [#124640](https://github.com/openclaw/openclaw/pull/124640)
- 管理云工作人员配置文件并选择每个会话的机器大小 [#124864](https://github.com/openclaw/openclaw/pull/124864)
- 通过节点传输运行一次性云工作人员 [#125288](https://github.com/openclaw/openclaw/pull/125288)
- 在拣选器[#125696](https://github.com/openclaw/openclaw/pull/125696)中显示云机CPU和RAM
- 显示连接设备的确切工作插槽 [#125708](https://github.com/openclaw/openclaw/pull/125708)
- 添加显式会话主机注册到 openclaw 连接 [#125879](https://github.com/openclaw/openclaw/pull/125879)
- 添加每个存储库云工作人员配置文件默认值 [#126238](https://github.com/openclaw/openclaw/pull/126238)
- 当配对设备离线时恢复会话 [#126284](https://github.com/openclaw/openclaw/pull/126284)
- 为插件节点命令添加生命周期安全的双工通道 [#126961](https://github.com/openclaw/openclaw/pull/126961)
- feat：在批准的配对设备上运行 Codex 会话 [#127202](https://github.com/openclaw/openclaw/pull/127202)
- feat（workers）：在同一云配置文件 [#127752](https://github.com/openclaw/openclaw/pull/127752) 上运行 OpenClaw 和 Codex
- feat（节点）：从 CPU 核心获取工作线程容量并使其可配置 [#128352](https://github.com/openclaw/openclaw/pull/128352)
- feat（节点）：sessions.dispatch [#128421](https://github.com/openclaw/openclaw/pull/128421) 的自动器件放置
- feat（crabbox）：为云工作人员选择加入配置文件温暖图像 [#130087](https://github.com/openclaw/openclaw/pull/130087)
- feat（portals）：向节点支持的云工作人员上的会话公开门户 [#130105](https://github.com/openclaw/openclaw/pull/130105)
- feat（网关）：使用 suspendAfter [#130242](https://github.com/openclaw/openclaw/pull/130242) 自动暂停空闲的云工作人员
- feat（crabbox）：允许没有默认机器类别的配置文件 [#131009](https://github.com/openclaw/openclaw/pull/131009)
- feat（macos）：启用本机节点会话托管 [#131717](https://github.com/openclaw/openclaw/pull/131717)
- feat（cloud-workers）：温暖的项目种子和自动图像刷新 [#131744](https://github.com/openclaw/openclaw/pull/131744)
- 添加 Crabbox 租赁设置命令 [5a37cdb](https://github.com/openclaw/openclaw/commit/5a37cdb)
- 为云工作人员环境添加固定的 SSH 隧道 [#104553](https://github.com/openclaw/openclaw/pull/104553)
- 为云工作人员添加经过身份验证的封闭网关连接 [#104688](https://github.com/openclaw/openclaw/pull/104688)
- 显示节点版本漂移和Windows尾流引导[#104735](https://github.com/openclaw/openclaw/pull/104735)
- 为云工作人员添加持久的成绩单提交 [#104809](https://github.com/openclaw/openclaw/pull/104809)
- 减少重复的云工作人员工作区哈希 [#121365](https://github.com/openclaw/openclaw/pull/121365)
- 在云会话启动期间重复使用一个 SSH 隧道 [#122077](https://github.com/openclaw/openclaw/pull/122077)
- 将配对节点配置为本地会话主机 [#122966](https://github.com/openclaw/openclaw/pull/122966)
- 发布原子设备运行器库存[#123094](https://github.com/openclaw/openclaw/pull/123094)
- 在配对节点上强制执行两个工作线程容量 [#123612](https://github.com/openclaw/openclaw/pull/123612)
- 将节点运行者同意与启动容量分开 [#124356](https://github.com/openclaw/openclaw/pull/124356)
- Prewarm 委派 Node 工作程序包 [#124427](https://github.com/openclaw/openclaw/pull/124427)
- 退反SSH工转隧道[#125465](https://github.com/openclaw/openclaw/pull/125465)
- 显示 Crabbox 报告的机器类别 [#126184](https://github.com/openclaw/openclaw/pull/126184)
- 简化退役选手恢复和安置措辞 [#126773](https://github.com/openclaw/openclaw/pull/126773)
- improve：每次转动后跳过重新散列未更改的工作人员工作区 [#131254](https://github.com/openclaw/openclaw/pull/131254)
- feat（cloud-workers）：默认在秘密承载设置之外启用暖图像 [#131874](https://github.com/openclaw/openclaw/pull/131874)
- feat（control-ui）：在会话放置上显示云工作线程服务和配置文件 [#132405](https://github.com/openclaw/openclaw/pull/132405)
- perf：减少远程执行附件传输往返 [#132657](https://github.com/openclaw/openclaw/pull/132657)
- 对 Control UI 中的配对硬件一致使用设备 [#120689](https://github.com/openclaw/openclaw/pull/120689)

**错误修复**

- 修复：云会话拒绝图像输入 [#132114](https://github.com/openclaw/openclaw/pull/132114)
- fix（工作人员）：避免在失败分派清理期间进行配置 [#132224](https://github.com/openclaw/openclaw/pull/132224)
- fix：将图像和 PDF 传送到远程云会话 [#132358](https://github.com/openclaw/openclaw/pull/132358)
- fix（云）：保留工人轮流的规范所有权 [#132507](https://github.com/openclaw/openclaw/pull/132507)
- 修复：当后续输入到达时保留云转向[#132887](https://github.com/openclaw/openclaw/pull/132887)
- 修复：当源构建和工作程序包不同时，云会话失败 [#133037](https://github.com/openclaw/openclaw/pull/133037)
- fix（网关）：保留配对工作人员截止日期结果 [85ae2bc](https://github.com/openclaw/openclaw/commit/85ae2bc)
- fix（工作人员）：驱逐静态实时事件窗口而不是拒绝新会话[#131365](https://github.com/openclaw/openclaw/pull/131365)
- fix：工作人员回复更正重复陈旧的实时文本[#131869](https://github.com/openclaw/openclaw/pull/131869)
- fix（crabbox）： 显示映射的云机器选择 [#132299](https://github.com/openclaw/openclaw/pull/132299)
- fix（crabbox）：解释无法访问的worker CLI安装[#132327](https://github.com/openclaw/openclaw/pull/132327)
- fix（流程）：解决管道关闭后断开的工人[#132447](https://github.com/openclaw/openclaw/pull/132447)
- 修复：将接近限制的工人发射保持在运输范围内 [#132732](https://github.com/openclaw/openclaw/pull/132732)
- 修复：工作会话无法向网关父母或兄弟姐妹发送消息 [#132818](https://github.com/openclaw/openclaw/pull/132818)
- fix（crabbox）：在热映像刷新后保留检查点清理 [#132959](https://github.com/openclaw/openclaw/pull/132959)
- 修复：并发 WebVNC 查看器可能无法连接 [#133226](https://github.com/openclaw/openclaw/pull/133226)
- fix（工作人员）：在桌面准备过程中保留脱机错误[#133212](https://github.com/openclaw/openclaw/pull/133212)

</details>

</Accordion>

<Accordion id="voice-meetings-and-media" title="语音、会议和媒体">

[Talk](/nodes/talk) 可以通过支持的直接浏览器和网关中继路径（包括符合条件的 ChatGPT 或 Codex 登录）使用 GPT-Live 和 GA 实时语音。不过，这些路由不可互换，因为凭据和传输因客户端而异，Android 中继仍处于门控状态，并且 Azure 配置被排除在 ChatGPT OAuth 中继路径之外。

支持OpenAI和Gemini 直播通话可以添加视频，记住是否使用摄像头，切换摄像头无需重启语音。这些控件仅出现在支持的浏览器和提供商传输上，许可和捕获保留在设备上，不受支持或后备中继可以忽略或拒绝视频。

启用的 [Google Meet、Microsoft Teams 和 Zoom 机器人 ](/plugins/meeting-plugins) 还可以在 SQLite 中保留发言者归属的文字记录和摘要。 Google Meet 的有界实时字幕缓冲区是与持久存档分开的路径，并且会议保留仍然可以全局禁用。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加 Qwen 3.6 刷机并更新 Gemini 真人语音 [#102791](https://github.com/openclaw/openclaw/pull/102791)
- 添加 xAI Grok 想象视频 1.5 支持 [#103316](https://github.com/openclaw/openclaw/pull/103316)
- 动态发现当前xAI TTS语音 [#103446](https://github.com/openclaw/openclaw/pull/103446)
- 保留有界 Google Meet 字幕文字记录 [#103811](https://github.com/openclaw/openclaw/pull/103811)
- 添加本机 xAI 流式文本转语音 [#103993](https://github.com/openclaw/openclaw/pull/103993)
- 添加原生xAI实时语音通话[#106267](https://github.com/openclaw/openclaw/pull/106267)
- 添加相机感知 OpenAI 视频通话 [#109579](https://github.com/openclaw/openclaw/pull/109579)
- 添加 Gemini 现场视频通话 [#109719](https://github.com/openclaw/openclaw/pull/109719)
- 添加 Microsoft Teams 会议参与 [#109964](https://github.com/openclaw/openclaw/pull/109964)
- 将视频通话移动到通话中摄像头切换 [#110576](https://github.com/openclaw/openclaw/pull/110576)
- 在 Realtime Talk 中添加摄像机选择和实时切换 [#111042](https://github.com/openclaw/openclaw/pull/111042)
- 添加 Zoom 浏览器-访客会议插件 [#111048](https://github.com/openclaw/openclaw/pull/111048)
- 添加持久的通话语音会话和语音确认 [#111216](https://github.com/openclaw/openclaw/pull/111216)
- 默认启用Teams和Zoom会议插件[#113022](https://github.com/openclaw/openclaw/pull/113022)
- 安装后默认启用Google Meet插件 [#113053](https://github.com/openclaw/openclaw/pull/113053)
- 自动保留持久的会议笔录和摘要 [#113122](https://github.com/openclaw/openclaw/pull/113122)
- 启用 GPT 与 Codex 进行实时对话 OAuth [#113354](https://github.com/openclaw/openclaw/pull/113354)
- 添加 GPT-Live 全双工语音到浏览器通话 [#115226](https://github.com/openclaw/openclaw/pull/115226)
- 从“设置”→“通话”配置实时语音 [#115409](https://github.com/openclaw/openclaw/pull/115409)
- 添加 GPT- 现场语音后端 WebSocket [#115622](https://github.com/openclaw/openclaw/pull/115622)
- 使用ChatGPT OAuth用于GA 实时浏览器对话[#115623](https://github.com/openclaw/openclaw/pull/115623)
- 为网关媒体添加字节范围流 [#115667](https://github.com/openclaw/openclaw/pull/115667)
- 为嵌入式语音节点添加最低权限配对 [#115712](https://github.com/openclaw/openclaw/pull/115712)
- 添加Fish Audio S2.1和渐进式本地鱼语音[#115790](https://github.com/openclaw/openclaw/pull/115790)
- 支持GPT-通过网关通话中继进行直播[#115831](https://github.com/openclaw/openclaw/pull/115831)
- 为外来媒体添加延迟播放转码 [#115987](https://github.com/openclaw/openclaw/pull/115987)
- 启用 Linux Chrome 会议中对讲 [#118451](https://github.com/openclaw/openclaw/pull/118451)
- 添加网关控制 WebRTC 通话边带 [#121054](https://github.com/openclaw/openclaw/pull/121054)
- 发送当前转弯视频到兼容的Google Gemini模型[#122074](https://github.com/openclaw/openclaw/pull/122074)
- 会话重新启动后重播持续视频 [#122257](https://github.com/openclaw/openclaw/pull/122257)
- 为Moonshot Kimi K3 [#122337](https://github.com/openclaw/openclaw/pull/122337)添加原生MP4视频输入
- 在 Control UI [#77017](https://github.com/openclaw/openclaw/pull/77017) 中添加生成图像操作和有界预览
- 现代化 DeepInfra 视频生成和清理 DeepSeek 回复 [#95824](https://github.com/openclaw/openclaw/pull/95824)
- 向最近的图像添加时间和位置上下文 [#100866](https://github.com/openclaw/openclaw/pull/100866)
- 跨语音表面共享音频能量和语音起始助手 [#109466](https://github.com/openclaw/openclaw/pull/109466)
- 记住谈论相机使用并阐明相机切换[#110817](https://github.com/openclaw/openclaw/pull/110817)
- 音频和视频元数据从摄入到历史记录中一直存在 [#115728](https://github.com/openclaw/openclaw/pull/115728)
- 向网关客户端通告聊天附件大小限制 [#116188](https://github.com/openclaw/openclaw/pull/116188)
- ClickClack 媒体上传期间减少内存副本 [#127152](https://github.com/openclaw/openclaw/pull/127152)
- 在运行时需要规范的语音呼叫配置 [#105476](https://github.com/openclaw/openclaw/pull/105476)
- 统一会议手动操作结果 [#114247](https://github.com/openclaw/openclaw/pull/114247)
- improve（zalo）：避免重复的培养基准备 [#128377](https://github.com/openclaw/openclaw/pull/128377)

**错误修复**

- 恢复GPT-直播订阅通话和特定模型语音[#133079](https://github.com/openclaw/openclaw/pull/133079)
- fix：结束失败的语音通话并保留 Gemini 实时记录 [#133157](https://github.com/openclaw/openclaw/pull/133157)
- 共享实时语音会话生命周期处理 [#117865](https://github.com/openclaw/openclaw/pull/117865)
- fix（转录本）：保留具有超大导出名称的捕获 [#131508](https://github.com/openclaw/openclaw/pull/131508)
- fix（会议）：在提供商恢复期间保持实时音频活动 [#131524](https://github.com/openclaw/openclaw/pull/131524)
- fix（转录本）：保持日期形状的 ID 可读且停止句柄明确 [#131723](https://github.com/openclaw/openclaw/pull/131723)
- fix：关闭的浏览器对话会话允许新代理工作 [#133019](https://github.com/openclaw/openclaw/pull/133019)
- 通过消息处理保留语音笔记记录 [#133261](https://github.com/openclaw/openclaw/pull/133261)
- 支持灵活的GPT图像2尺寸[#118476](https://github.com/openclaw/openclaw/pull/118476)
- improve（msteams）：避免重试时重复活动准备 [#128329](https://github.com/openclaw/openclaw/pull/128329)
- fix（ui）：停止 Talk 相机预览在重新渲染时闪烁 [#131241](https://github.com/openclaw/openclaw/pull/131241)
- fix（成绩单）：报告自动启动关闭警告[#131381](https://github.com/openclaw/openclaw/pull/131381)
- fix（cli）：拒绝冲突的 TTS 角色选择器 [#133191](https://github.com/openclaw/openclaw/pull/133191)

**文档**

- 修复：语音烟雾通过但未接收语音[#133020](https://github.com/openclaw/openclaw/pull/133020)

</details>

</Accordion>

<Accordion id="code-mode-and-agent-tools" title="代码模式和代理工具">

[代码 Mode](/tools/code-mode) 仍处于实验阶段，默认情况下处于关闭状态。其实验室开关选择自动使用首选模型，而代理默认值可以继承或覆盖某个确切模型的选择。当处于活动状态时，代码模式可以像普通异步函数一样对待授权工具，让代理将对话、文件和会话的可信结果组合到一个程序中，或者一起运行独立的调用。这是最终的接口，而不是旧接口旁边的另一层，因此之前的 `tools` 对象、`ALL_TOOLS`、exact-ID 调用和原始调用信封都消失了。程序可以编写的内容仍然仅限于它被授权使用的工具以及这些工具声明的结构化结果。

[Tool Search](/tools) 在将自然请求转变为可发现的功能方面也做得更好，可以在一个结构化请求中搜索多个功能组，并且现在公开现有的会话存档和 pin 操作。策略仍然可以隐藏工具，并且没有有效答案的请求不会返回任何内容，而现有的单查询请求和响应形状继续工作。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 向工作区添加安全实时预览小部件 [#101354](https://github.com/openclaw/openclaw/pull/101354)
- 添加Podman作为内置代理沙箱后端[#101358](https://github.com/openclaw/openclaw/pull/101358)
- 将受信任的图表小部件添加到工作区 [#101792](https://github.com/openclaw/openclaw/pull/101792)
- 将实时代理状态和自定义小部件决策添加到工作区 [#101826](https://github.com/openclaw/openclaw/pull/101826)
- Render 网络聊天中内嵌的交互式小部件 [#101840](https://github.com/openclaw/openclaw/pull/101840)
- 添加操作员批准的后续任务建议 [#102422](https://github.com/openclaw/openclaw/pull/102422)
- 向网关添加可操作的任务建议 TUI [#102743](https://github.com/openclaw/openclaw/pull/102743)
- 向 Control UI 添加工作树所有权、创建和更安全的清理 [#103526](https://github.com/openclaw/openclaw/pull/103526)
- 添加代理可组合工作区 [#104139](https://github.com/openclaw/openclaw/pull/104139)
- 通过有针对性的父查找加快工作板依赖性检查 [#104668](https://github.com/openclaw/openclaw/pull/104668)
- 需要新鲜的隔离工作树进行委托编码 [#105993](https://github.com/openclaw/openclaw/pull/105993)
- 添加可配置的托管工作树清理限制 [#106224](https://github.com/openclaw/openclaw/pull/106224)
- 添加座席会话自助服务工具 [#107471](https://github.com/openclaw/openclaw/pull/107471)
- 让网络聊天小部件发送后续提示 [#108889](https://github.com/openclaw/openclaw/pull/108889)
- 让座席与运营商共享直播终端 [#109005](https://github.com/openclaw/openclaw/pull/109005)
- 一次执行即可完成多工具代码模式块 [#109290](https://github.com/openclaw/openclaw/pull/109290)
- Reduce Code Mode工具编排转向[#109596](https://github.com/openclaw/openclaw/pull/109596)
- 将声明的工具结果形状添加到代码模式 [#109813](https://github.com/openclaw/openclaw/pull/109813)
- 添加更多代码模式工具输出提示 [#110215](https://github.com/openclaw/openclaw/pull/110215)
- 将结构化文件系统结果公开到代码模式 [#110395](https://github.com/openclaw/openclaw/pull/110395)
- 会话工具的完整代码模式合约 [#110424](https://github.com/openclaw/openclaw/pull/110424)
- 为每个应用程序带来问题提示 [#110681](https://github.com/openclaw/openclaw/pull/110681)
- 为 Canvas 小部件添加主题感知设计系统 [#110832](https://github.com/openclaw/openclaw/pull/110832)
- 添加门控 Swarm 编排核心 [#110932](https://github.com/openclaw/openclaw/pull/110932)
- 将模型、工作区和分叉选项添加到可见会话生成中 [#110943](https://github.com/openclaw/openclaw/pull/110943)
- 将重启安全的Swarm编排添加到QuickJS代码模式[#111298](https://github.com/openclaw/openclaw/pull/111298)
- 跨聊天客户端显示权威写入差异 [#111456](https://github.com/openclaw/openclaw/pull/111456)
- 完整的 Swarm 等待、进度和工作人员指导 [#111605](https://github.com/openclaw/openclaw/pull/111605)
- 让插件添加授予的仪表板提要和操作 [#112083](https://github.com/openclaw/openclaw/pull/112083)
- 环境多代理工作的显式所有者 [#113637](https://github.com/openclaw/openclaw/pull/113637)
- 默认启用操作员终端 [#113888](https://github.com/openclaw/openclaw/pull/113888)
- 添加隔离的无头代理运行器 [#113988](https://github.com/openclaw/openclaw/pull/113988)
- 改进工具自然请求的搜索排名 [#114285](https://github.com/openclaw/openclaw/pull/114285)
- 自动广告可搜索工具功能 [#114508](https://github.com/openclaw/openclaw/pull/114508)
- 将每次运行代理统计信息添加到 JSON 输出 [#114688](https://github.com/openclaw/openclaw/pull/114688)
- 添加自动按模型代码模式选择 [#114695](https://github.com/openclaw/openclaw/pull/114695)
- 为首选模型自动启用代码模式 [#114906](https://github.com/openclaw/openclaw/pull/114906)
- 添加有界代码模式修复重试 [#115729](https://github.com/openclaw/openclaw/pull/115729)
- 将配置的提供程序和工具应用于代理执行 [#116038](https://github.com/openclaw/openclaw/pull/116038)
- 将插件子代理完成交付给当前请求者 [#116091](https://github.com/openclaw/openclaw/pull/116091)
- 添加批量结构化工具搜索查询 [#118623](https://github.com/openclaw/openclaw/pull/118623)
- 加快大型子代理集的重新启动恢复 [#119793](https://github.com/openclaw/openclaw/pull/119793)
- 选择建议的后续任务运行位置 [#121173](https://github.com/openclaw/openclaw/pull/121173)
- feat（sandbox）：添加Daytona云沙箱后端插件[#121554](https://github.com/openclaw/openclaw/pull/121554)
- 将任务卡工具重命名为`suggest_task` [#121694](https://github.com/openclaw/openclaw/pull/121694)
- 让主机代理检查不受支持的本地文档 [#122408](https://github.com/openclaw/openclaw/pull/122408)
- 通过门户预览代理运行的 Web 应用程序 [#122536](https://github.com/openclaw/openclaw/pull/122536)
- 将托管浏览器操作添加到计算机使用 v2 [#123960](https://github.com/openclaw/openclaw/pull/123960)
- 添加管理录制和重播到CUA计算机使用[#124035](https://github.com/openclaw/openclaw/pull/124035)
- 将图像检测标准化为`view_image` [#125024](https://github.com/openclaw/openclaw/pull/125024)
- 将工作板链接到其拥有的自动化 [#125076](https://github.com/openclaw/openclaw/pull/125076)
- 链接工作完成时运行附加工作板自动化 [#125170](https://github.com/openclaw/openclaw/pull/125170)
- 通过身份感知网关代理连接 CLI 工具 [#125700](https://github.com/openclaw/openclaw/pull/125700)
- 作为普通异步函数调用代码模式工具 [#126262](https://github.com/openclaw/openclaw/pull/126262)
- 来自网关的代理 GitHub 发布 [#126306](https://github.com/openclaw/openclaw/pull/126306)
- feat（ui）：添加可折叠工作板列 [#128115](https://github.com/openclaw/openclaw/pull/128115)
- feat：使用继承的默认值 [#132332](https://github.com/openclaw/openclaw/pull/132332) 配置每个模型的代码模式
- 从 CLI、聊天或代理工具移动工作板卡 [#96554](https://github.com/openclaw/openclaw/pull/96554)
- 让操作员提高工作板单次启动上限 [#100174](https://github.com/openclaw/openclaw/pull/100174)
- 减少代码模式工具-发现轮[#109651](https://github.com/openclaw/openclaw/pull/109651)
- 让代码模式根据声明的结果编写对话工具 [#110098](https://github.com/openclaw/openclaw/pull/110098)
- 给`web_fetch`一个紧凑、精确的输出合约[#110223](https://github.com/openclaw/openclaw/pull/110223)
- 紧凑型 `show_widget` 带小部件模式的指南 [#110999](https://github.com/openclaw/openclaw/pull/110999)
- 预先解释可见会话生成约束 [#111502](https://github.com/openclaw/openclaw/pull/111502)
- 将规划工具切换为`tools.updatePlan` [#113958](https://github.com/openclaw/openclaw/pull/113958)
- 使用声明的通道特征进行线程传递 [#114245](https://github.com/openclaw/openclaw/pull/114245)
- 使会话存档和固定操作可供代理发现 [#114463](https://github.com/openclaw/openclaw/pull/114463)
- 为托管工作树提供可读的默认名称 [#114488](https://github.com/openclaw/openclaw/pull/114488)
- 避免重复的子代理注册表写入 [#114705](https://github.com/openclaw/openclaw/pull/114705)
- 减少看板工作和票轮询 [#114748](https://github.com/openclaw/openclaw/pull/114748)
- 选择 OpenShell 控制平面工作区 [#114952](https://github.com/openclaw/openclaw/pull/114952)
- 添加代码模式模型接受矩阵和代理执行控制 [#115305](https://github.com/openclaw/openclaw/pull/115305)
- 添加操作员定义的标头以进行直接 Web 获取 [#115545](https://github.com/openclaw/openclaw/pull/115545)
- 为 Gemini Web 搜索添加自定义标头 [#115549](https://github.com/openclaw/openclaw/pull/115549)
- 大型子代理组的规模请求者结算 [#116619](https://github.com/openclaw/openclaw/pull/116619)
- 减少大型多组群的调度程序开销 [#116623](https://github.com/openclaw/openclaw/pull/116623)
- 加速高扇出子代理生命周期清理 [#116661](https://github.com/openclaw/openclaw/pull/116661)
- 解释为什么跳过存档的工作板卡 [#117290](https://github.com/openclaw/openclaw/pull/117290)
- 减少受限制工人启动进口 [#119644](https://github.com/openclaw/openclaw/pull/119644)
- 记录删除或保留托管工作树的原因 [#120434](https://github.com/openclaw/openclaw/pull/120434)
- Stream 文件编辑的实时行计数进度 [#121528](https://github.com/openclaw/openclaw/pull/121528)
- 添加针对计算机使用的功能过滤指南 [#123949](https://github.com/openclaw/openclaw/pull/123949)
- 鼓励在支持的表面上使用主动小部件 [#124810](https://github.com/openclaw/openclaw/pull/124810)
- 在调试日志中显示代码模式的最终工具界面 [#124934](https://github.com/openclaw/openclaw/pull/124934)
- perf（工具）：仅针对图像结果加载图像消毒剂[#132663](https://github.com/openclaw/openclaw/pull/132663)
- perf（代理）：推迟未使用的代码模式运行时 [#132802](https://github.com/openclaw/openclaw/pull/132802)
- refactor（代理）：统一组 [#132942](https://github.com/openclaw/openclaw/pull/132942) 上的会话工具侧边栏词汇
- 加速大型子代理注册表查找 [#107935](https://github.com/openclaw/openclaw/pull/107935)
- 减少Control UI轮询期间重复的板读取 [#114363](https://github.com/openclaw/openclaw/pull/114363)
- [AI] 文档（工具）：澄清网关和流程工具模式中每个操作所需的参数 [#114879](https://github.com/openclaw/openclaw/pull/114879)
- 使暂停代码模式关闭清理线性 [#115456](https://github.com/openclaw/openclaw/pull/115456)
- 澄清 Codex 家长如何接收原生子结果 [#115466](https://github.com/openclaw/openclaw/pull/115466)
- 报告工作板限制中提交的长度错误 [#118888](https://github.com/openclaw/openclaw/pull/118888)
- 避免重复工具搜索目录指纹 [#127188](https://github.com/openclaw/openclaw/pull/127188)
- 添加Codex助手-完成超时配置[#97233](https://github.com/openclaw/openclaw/pull/97233)

**错误修复**

- fix（代码模式）：当目录关闭时取消恢复的单元 [#132182](https://github.com/openclaw/openclaw/pull/132182)
- fix（代码模式）：只读协调后恢复 [#132583](https://github.com/openclaw/openclaw/pull/132583)
- fix（代理）：停止漂移执行失败循环（#118402）[a7a2dac](https://github.com/openclaw/openclaw/commit/a7a2dac)
- fix（代理）：前载执行保留损失披露过去的会话上限 [#128997](https://github.com/openclaw/openclaw/pull/128997)
- fix（代理）：保留代码模式源参数 [#129816](https://github.com/openclaw/openclaw/pull/129816)
- fix（代理）：公开64个KiB代码模式stderr尾部截断​​[#130182](https://github.com/openclaw/openclaw/pull/130182)
- fix（进程）：通过聚合读取偏移量自我修复丢弃的轮询传递 [#130420](https://github.com/openclaw/openclaw/pull/130420)
- fix（代码模式）：主机策略拒绝不再触发只读恢复 [#131007](https://github.com/openclaw/openclaw/pull/131007)
- fix（web-fetch）：绑定页面元数据并在经过清理的截断中保留散文 [#131126](https://github.com/openclaw/openclaw/pull/131126)
- fix（代码模式）：取消计时器失速自动化和封闭单元排气槽[#131186](https://github.com/openclaw/openclaw/pull/131186)
- fix（代理）：将转录本编辑排除在实时工具参数之外 [#131214](https://github.com/openclaw/openclaw/pull/131214)
- fix（代理）：默认情况下保持代码模式关闭 [#131242](https://github.com/openclaw/openclaw/pull/131242)
- fix（代码模式）：经过证明安全的等待失败后继续执行任务 [#131282](https://github.com/openclaw/openclaw/pull/131282)
- fix（代理）：就地覆盖 apply_patch 主机文件，而不是截断第一个 [#131418](https://github.com/openclaw/openclaw/pull/131418)
- fix（代码模式）：停止超大搜索报告没有匹配项 [#131574](https://github.com/openclaw/openclaw/pull/131574)
- fix（web-fetch）：在缓存或返回提供者结果之前接受取消 [#131585](https://github.com/openclaw/openclaw/pull/131585)
- fix（web-fetch）：在跨获取和搜索的读取中遵循零和缩短的缓存 TTL [#131648](https://github.com/openclaw/openclaw/pull/131648)
- fix（代理）：在有界工具结果中保留可操作文本 [#131827](https://github.com/openclaw/openclaw/pull/131827)
- fix（代理）：解析远程补丁[#131991](https://github.com/openclaw/openclaw/pull/131991)中的@简写
- fix（代码模式）：经过验证的只读工具失败后继续 [#132146](https://github.com/openclaw/openclaw/pull/132146)
- fix：报告代码模式失败，但没有错误成功 [#132248](https://github.com/openclaw/openclaw/pull/132248)
- fix：保留 grep 与分数上下文 [#132482](https://github.com/openclaw/openclaw/pull/132482) 的匹配
- fix（代码模式）：保持截断计数与原始输出 [#132850](https://github.com/openclaw/openclaw/pull/132850) 相关
- fix（自动回复）：在推理之前保留代码缩进[#132900](https://github.com/openclaw/openclaw/pull/132900)
- fix（代理）：报告早期 Bash 输出溢出故障而不导致崩溃 [#132906](https://github.com/openclaw/openclaw/pull/132906)
- fix：在模型限制下保持代码模式结果和读取游标完整 [#132945](https://github.com/openclaw/openclaw/pull/132945)
- 修复：正确读取Windows PowerShell UTF-16文本文件[#133130](https://github.com/openclaw/openclaw/pull/133130)
- fix（process）：通过 Windows 批处理包装器 [#133185](https://github.com/openclaw/openclaw/pull/133185) 保留参数
- fix（代理）：保留过大的 Bash 最终行输出 [#133216](https://github.com/openclaw/openclaw/pull/133216)
- fix（代理）：保留查找结果路径[#133302](https://github.com/openclaw/openclaw/pull/133302)
- fix（exec）：拒绝 Python 脚本中的单字符 shell 变量 [#103535](https://github.com/openclaw/openclaw/pull/103535)
- fix（代理）：重新绑定工具搜索快照执行器[#125518](https://github.com/openclaw/openclaw/pull/125518)
- fix（代码模式）：目录拆卸后保留取消诊断 [#131311](https://github.com/openclaw/openclaw/pull/131311)
- fix（代理）：禁用仅选项代码模式配置 [#131407](https://github.com/openclaw/openclaw/pull/131407)
- fix（代码模式）：正确的 MCP 数组联合声明 [#131528](https://github.com/openclaw/openclaw/pull/131528)
- fix（代理）：允许空写入内容[#131696](https://github.com/openclaw/openclaw/pull/131696)
- 修复：写入工具在有损UTF-8解码[#133282](https://github.com/openclaw/openclaw/pull/133282)后跳过覆盖

**文档**

- docs：澄清代码模式默认情况下处于关闭状态 [#132191](https://github.com/openclaw/openclaw/pull/132191)

</details>

</Accordion>

<Accordion id="accessibility-and-language-support" title="辅助功能和语言支持">

键盘用户可以打开插件详细信息并再次选择使用会话。 20 个维护的非英语 [Control UI](/web/control-ui) 目录还包括提示、设备、活动、目录和其他扩展表面的刷新文本。这些目录更新使现有语言集与当前界面保持一致；它们不会添加语言或更改应用程序逻辑。

Android 还具有实验性 `mobile_ui` 路径，允许授权代理观察受支持的配对设备上的应用程序并与之交互。它仅供所有者使用，默认情况下处于关闭状态，仅限于第三方版本，无法通过 Gateway HTTP 和 Play 版本使用，并且需要显式武装两个危险命令。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 刷新所有 Control UI 区域设置并修复 cron 测试装置 [#105100](https://github.com/openclaw/openclaw/pull/105100)
- 为Android应用程序添加mobile_ui代理工具[#112255](https://github.com/openclaw/openclaw/pull/112255)
- 暴露受保护的Android屏幕观察和控制命令[#112241](https://github.com/openclaw/openclaw/pull/112241)
- 刷新生成的 Control UI 翻译 [#112673](https://github.com/openclaw/openclaw/pull/112673)
- 澄清保管人设置控制和取消操作 [#119611](https://github.com/openclaw/openclaw/pull/119611)
- 刷新生成的 Control UI 翻译 [#125213](https://github.com/openclaw/openclaw/pull/125213)
- chore（ui）：刷新控制 ui 区域设置 [#130265](https://github.com/openclaw/openclaw/pull/130265)
- chore（ui）：刷新控制 ui 区域设置 [#131098](https://github.com/openclaw/openclaw/pull/131098)
- chore（ui）：刷新控制 ui 区域设置 [#131291](https://github.com/openclaw/openclaw/pull/131291)
- 翻译终端上传状态消息[#107806](https://github.com/openclaw/openclaw/pull/107806)
- 刷新生成的 Control UI 翻译 [#109633](https://github.com/openclaw/openclaw/pull/109633)
- 刷新 Control UI 新提示的翻译 [#109751](https://github.com/openclaw/openclaw/pull/109751)
- 刷新 Control UI 跨 20 个语言环境的翻译 [#113184](https://github.com/openclaw/openclaw/pull/113184)
- 刷新 Control UI 扩展目录的翻译 [#121555](https://github.com/openclaw/openclaw/pull/121555)
- 刷新所有 Control UI 语言环境的翻译 [#125774](https://github.com/openclaw/openclaw/pull/125774)
- 刷新 Control UI 跨 20 个语言环境的翻译 [#126614](https://github.com/openclaw/openclaw/pull/126614)
- chore（ui）：刷新控制 ui 区域设置 [#127207](https://github.com/openclaw/openclaw/pull/127207)
- chore（ui）：刷新控制 ui 区域设置 [#130851](https://github.com/openclaw/openclaw/pull/130851)
- chore（ui）：刷新控制 ui 区域设置 [#131506](https://github.com/openclaw/openclaw/pull/131506)
- chore（ui）：刷新控制 ui 区域设置 [#131755](https://github.com/openclaw/openclaw/pull/131755)
- chore（ui）：刷新控制 ui 区域设置 [#131848](https://github.com/openclaw/openclaw/pull/131848)
- chore（ui）：刷新控制 ui 区域设置 [#131898](https://github.com/openclaw/openclaw/pull/131898)
- chore（ui）：刷新控制 ui 区域设置 [#132072](https://github.com/openclaw/openclaw/pull/132072)
- chore（ui）：刷新控制 ui 区域设置 [#132120](https://github.com/openclaw/openclaw/pull/132120)
- chore（ui）：刷新控制 ui 区域设置 [#132198](https://github.com/openclaw/openclaw/pull/132198)
- chore（ui）：刷新控制 ui 区域设置 [#132380](https://github.com/openclaw/openclaw/pull/132380)
- chore（ui）：刷新控制 ui 区域设置 [#132910](https://github.com/openclaw/openclaw/pull/132910)
- chore（ui）：刷新控制 ui 区域设置 [#133026](https://github.com/openclaw/openclaw/pull/133026)

**错误修复**

- 恢复对插件详细信息和使用会话的键盘访问 [#116820](https://github.com/openclaw/openclaw/pull/116820)
- chore（ui）：刷新控制 ui 区域设置 [#131638](https://github.com/openclaw/openclaw/pull/131638)
- chore（ui）：刷新控制 ui 区域设置 [#131969](https://github.com/openclaw/openclaw/pull/131969)
- chore（ui）：刷新控制 ui 区域设置 [#132870](https://github.com/openclaw/openclaw/pull/132870)
- chore（ui）：刷新控制 ui 区域设置 [#133233](https://github.com/openclaw/openclaw/pull/133233)

</details>

</Accordion>

<Accordion id="interface-polish-and-compatibility" title="界面打磨和兼容性">

启动和多个消息传递路径现在会跳过不必要的工作，而跨入门引导、任务、工作树、活动、仪表板、生成的标题、持续时间、电话号码和主题的较小修复使[熟悉的屏幕](/web/control-ui)更易于阅读和使用。

可选的 [Control UI lobster](/web/lobster) 现在可以对状态变化做出反应，并添加季节性或稀有变体、访客、收藏奖励以及用于拒绝一次访问或禁用访问的控件。这些添加是装饰性的，许多外观仍然罕见或会话种子，保留了减少运动的偏好，并且相关的 CLI 繁荣保留在交互使用中，因此自动输出保持不变。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将会话种子龙虾状态宠物添加到 Control UI 侧边栏 [#102766](https://github.com/openclaw/openclaw/pull/102766)
- 使 Control UI 龙虾对您做出反应并运行结果 [#103344](https://github.com/openclaw/openclaw/pull/103344)
- 为CLI和Control UI [#103412](https://github.com/openclaw/openclaw/pull/103412)添加龙虾惊喜
- 平静工作爪并添加转弯回顾[#112060](https://github.com/openclaw/openclaw/pull/112060)
- 扩大龙虾宠物，稀有访客和收集奖励 [#112073](https://github.com/openclaw/openclaw/pull/112073)
- 使用新的调色板、知识和集合页面扩展 Lobsterdex [#114959](https://github.com/openclaw/openclaw/pull/114959)
- 使用九个调色板、深层链接和闪亮日期扩展 Lobsterdex [#115179](https://github.com/openclaw/openclaw/pull/115179)
- 用 42 个不同的精灵完成 Lobsterdex [#115264](https://github.com/openclaw/openclaw/pull/115264)
- 添加气球、ASCII 和门户 Lobsterdex 变体 [#115308](https://github.com/openclaw/openclaw/pull/115308)
- feat（ui）：Control UI [#128432](https://github.com/openclaw/openclaw/pull/128432) 的用户可选强调色
- feat（ui）：保存每个用户配置文件的外观首选项 [#130340](https://github.com/openclaw/openclaw/pull/130340)
- 添加稀有侧栏龙虾宠物变种[#102829](https://github.com/openclaw/openclaw/pull/102829)
- 为龙虾宠物添加种子体型变体[#103091](https://github.com/openclaw/openclaw/pull/103091)
- 让侧边栏龙虾成为偶尔的、可控的访客 [#103111](https://github.com/openclaw/openclaw/pull/103111)
- 为Control UI龙虾宠物[#103149](https://github.com/openclaw/openclaw/pull/103149)添加个性和反应
- 为龙虾宠物添加罕见的换毛和双胞胎 [#103154](https://github.com/openclaw/openclaw/pull/103154)
- 为Control UI龙虾[#103158](https://github.com/openclaw/openclaw/pull/103158)添加季节性服装
- 在梦想中显示所选代理的籽龙虾 [#103167](https://github.com/openclaw/openclaw/pull/103167)
- 添加浏览器本地 Lobsterdex 集合 [#103172](https://github.com/openclaw/openclaw/pull/103172)
- 为龙虾宠物添加稀有过路访客[#103352](https://github.com/openclaw/openclaw/pull/103352)
- 给予Control UI龙虾记忆和熟悉感[#103359](https://github.com/openclaw/openclaw/pull/103359)
- 赠送 Control UI 龙虾周年纪念帽并赢得头衔 [#103563](https://github.com/openclaw/openclaw/pull/103563)
- 添加响应式龙虾吉祥物互动 [#103573](https://github.com/openclaw/openclaw/pull/103573)
- 让侧边栏龙虾偶尔代替logo [#104748](https://github.com/openclaw/openclaw/pull/104748)
- 跨核心和Control UI强制安全索引访问 [#104981](https://github.com/openclaw/openclaw/pull/104981)
- 用夹爪更换工作火花[#105020](https://github.com/openclaw/openclaw/pull/105020)
- 向 CLI 向导横幅添加像素龙虾 [#105119](https://github.com/openclaw/openclaw/pull/105119)
- 在交互式启动时动画爪形横幅 [#105540](https://github.com/openclaw/openclaw/pull/105540)
- 赋予工作爪更清晰的打孔动画 [#105597](https://github.com/openclaw/openclaw/pull/105597)
- 标准化 OpenClaw [#105988](https://github.com/openclaw/openclaw/pull/105988) 的持续时间解析和显示
- 完成托管工作树列表重新设计 [#106514](https://github.com/openclaw/openclaw/pull/106514)
- 向向导等待步骤添加爪式旋转器 [#108833](https://github.com/openclaw/openclaw/pull/108833)
- 减少 TTS 导入 [#109344](https://github.com/openclaw/openclaw/pull/109344) 的代理启动开销
- 减少身份验证到期噪音并添加龙虾徽标恐慌 [#110466](https://github.com/openclaw/openclaw/pull/110466)
- Control UI 启动后延迟加载龙虾宠物 [#110628](https://github.com/openclaw/openclaw/pull/110628)
- 无需滚动即可拟合完整的代币活动年份 [#112006](https://github.com/openclaw/openclaw/pull/112006)
- 在 Control UI 和 CLI 中格式化国际电话号码，显示 [#112400](https://github.com/openclaw/openclaw/pull/112400)
- 添加三个罕见的工作爪动画[#112552](https://github.com/openclaw/openclaw/pull/112552)
- 制作工作爪技巧罕见的一击惊喜[#114025](https://github.com/openclaw/openclaw/pull/114025)
- 减少网关热路径上的Telegram流式工作[#118349](https://github.com/openclaw/openclaw/pull/118349)
- 添加临时和永久龙虾解雇选择 [#123789](https://github.com/openclaw/openclaw/pull/123789)
- 将观察到的离开持续时间添加到 Slack 存在事件 [#123805](https://github.com/openclaw/openclaw/pull/123805)
- 配置 Slack 存在事件指导 [#123875](https://github.com/openclaw/openclaw/pull/123875)
- fix（diffs）：按需加载Playwright渲染器[#127040](https://github.com/openclaw/openclaw/pull/127040)
- 加速密集 Google Chat 项目符号列表格式化 [#127274](https://github.com/openclaw/openclaw/pull/127274)
- chore：7天冷却后刷新依赖项[#128414](https://github.com/openclaw/openclaw/pull/128414)
- improve（discord）：避免在发送 [#128462](https://github.com/openclaw/openclaw/pull/128462) 时重复进行帐户解析
- improve（feishu）：避免重复出站后期渲染 [#128471](https://github.com/openclaw/openclaw/pull/128471)
- improve（irc）：重用分块发送的瞬态连接 [#128487](https://github.com/openclaw/openclaw/pull/128487)
- improve（ui）：使任务更容易扫描 [#128853](https://github.com/openclaw/openclaw/pull/128853)
- perf（ui）：推迟自定义主题导入到设置 [#130710](https://github.com/openclaw/openclaw/pull/130710)
- chore（deps）：刷新 7 天冷却的运行时和工具 [#131719](https://github.com/openclaw/openclaw/pull/131719)
- 刷新 CLI 启动标语 [#102750](https://github.com/openclaw/openclaw/pull/102750)
- 添加烘焙风格 CLI 启动标语 [#102789](https://github.com/openclaw/openclaw/pull/102789)
- 将 OpenClaw 属性赋予 OpenClaw Foundation [#112536](https://github.com/openclaw/openclaw/pull/112536)
- 将提供商图标添加到编码目录标题 [#115956](https://github.com/openclaw/openclaw/pull/115956)
- 在外部会话目录中显示 Pi 徽标 [#119998](https://github.com/openclaw/openclaw/pull/119998)
- 给折叠的会话栏一个独特的标题图标 [#121420](https://github.com/openclaw/openclaw/pull/121420)
- 在句子大小写中生成会话和线程标题 [#123389](https://github.com/openclaw/openclaw/pull/123389)
- 减少Control UI启动CSS [#125539](https://github.com/openclaw/openclaw/pull/125539)
- improve（电报）：减少丰富消息规划工作 [#127719](https://github.com/openclaw/openclaw/pull/127719)
- improve（nextcloud-talk）：避免发送时读取房间凭证 [#128344](https://github.com/openclaw/openclaw/pull/128344)
- improve（googlechat）：避免重复的 DM 路由读取 [#128359](https://github.com/openclaw/openclaw/pull/128359)
- improve（矩阵）：避免重复的出站身体投影[#128392](https://github.com/openclaw/openclaw/pull/128392)
- perf（ui）：修复失败的启动样式表和 JavaScript 预算 [#130037](https://github.com/openclaw/openclaw/pull/130037)
- fix（ui）： 减少龙虾来访的频率 [#132065](https://github.com/openclaw/openclaw/pull/132065)
- 澄清工作板卡拖动反馈 [#89821](https://github.com/openclaw/openclaw/pull/89821)

**错误修复**

- 保留龙虾守夜反应并取消中断的宠物手势 [#103483](https://github.com/openclaw/openclaw/pull/103483)
- 将入门仪表板居中并修复卡片布局 [#121416](https://github.com/openclaw/openclaw/pull/121416)
- 保持龙虾关闭菜单完全可见 [#124261](https://github.com/openclaw/openclaw/pull/124261)
- improve（mattermost）：加快入站直接消息回复速度 [#128431](https://github.com/openclaw/openclaw/pull/128431)
- 将龙虾宠物保持在侧边栏页脚上方 [#106457](https://github.com/openclaw/openclaw/pull/106457)
- 恢复ClawHub判决面板背景[#113776](https://github.com/openclaw/openclaw/pull/113776)
- 恢复捆绑的Teams插件图标[#117170](https://github.com/openclaw/openclaw/pull/117170)
- 使应用卡标题在徽章旁边保持完整 [#123375](https://github.com/openclaw/openclaw/pull/123375)
- 从仪表板会话卡中删除下划线 [#124939](https://github.com/openclaw/openclaw/pull/124939)

</details>

</Accordion>

<Accordion id="documentation" title="文档">

设置、迁移、恢复和功能指南现已涵盖 [ 云工作人员](/gateway/cloud-workers)、[ 会议和媒体](/plugins/meeting-plugins)、[Code Mode](/tools/code-mode)、Swarm、门户、沙箱、本地语音、[SQLite迁移](/reference/database-schemas)、[备份](/install/backups)，以及降级恢复更加清晰。移动阅读器可以获得更好的顶级链接，并且 Release 和 CI 页面失去了冗余的导航层。这些是文档和 QA 更新；运行时行为继续遵循引用的产品和平台合同。

两个云工作人员的详细信息仍然不同步。 Cloud Workers 设置指南夸大了为 Crabbox 以外的提供商显示的配置文件信息，而 Daytona 指南表示，即使配置文件验证仍然需要 `settings.class`，也可以省略它，因此 Daytona 配置文件应保持类明确，直到指南和产品合同达成一致。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**文档**

- 添加会议插件比较和设置指南 [09dd616](https://github.com/openclaw/openclaw/commit/09dd616)
- 解释单向数据库迁移和降级恢复 [#110487](https://github.com/openclaw/openclaw/pull/110487)
- 记录个人代理主会话 [#110905](https://github.com/openclaw/openclaw/pull/110905)
- 文档会话自助服务、可见生成、任务取消和 cron 合约 [#111095](https://github.com/openclaw/openclaw/pull/111095)
- 添加公共 Swarm 用户指南 [#111384](https://github.com/openclaw/openclaw/pull/111384)
- 添加跨客户端媒体播放指南 [#116005](https://github.com/openclaw/openclaw/pull/116005)
- 添加会话同步和附件指南[#121091](https://github.com/openclaw/openclaw/pull/121091)
- 记录三层会话所有权 [#125334](https://github.com/openclaw/openclaw/pull/125334)
- Document Cloud Workers 设置和机器选择 [#126049](https://github.com/openclaw/openclaw/pull/126049)
- 整合设置和插件文档 [#126132](https://github.com/openclaw/openclaw/pull/126132)
- docs：为团队重新构建文档并软化群聊指导 [#132012](https://github.com/openclaw/openclaw/pull/132012)
- 解释侧边栏未发送草稿铅笔[4f046b5](https://github.com/openclaw/openclaw/commit/4f046b5)
- 添加 Cloud Workers 网关指南 [6029bf1](https://github.com/openclaw/openclaw/commit/6029bf1)
- 澄清托管会话状态和图像附件调试 [8f23e68](https://github.com/openclaw/openclaw/commit/8f23e68)
- 文档 Discord 语音聊天以及会议插件 [b51e3d0](https://github.com/openclaw/openclaw/commit/b51e3d0)
- 将适合移动设备的链接添加到顶级文档 [#100908](https://github.com/openclaw/openclaw/pull/100908)
- 删除 Android 已停用的语音唤醒代码 [#104914](https://github.com/openclaw/openclaw/pull/104914)
- 跨 macOS、Linux 和 Windows 记录本地 TTS 设置 [#110230](https://github.com/openclaw/openclaw/pull/110230)
- 更正 Chrome 扩展会话磁盘预算文档 [#110624](https://github.com/openclaw/openclaw/pull/110624)
- Align 交互式客户端和 Screen 工具文档 [#111047](https://github.com/openclaw/openclaw/pull/111047)
- 解释 Codex 内存限制和扇出控制 [#111234](https://github.com/openclaw/openclaw/pull/111234)
- 将询问用户 QA 和文档与当前答案格式 [#111429](https://github.com/openclaw/openclaw/pull/111429) 对齐
- 修复 SenseAudio 文档链接 [#114021](https://github.com/openclaw/openclaw/pull/114021)
- 来自自动化和策略文档的交叉链接 `agent exec` [#114034](https://github.com/openclaw/openclaw/pull/114034)
- 解释工具调用边界处的转向 [#114249](https://github.com/openclaw/openclaw/pull/114249)
- 更正记录的 `system.run` 请求字段 [#116930](https://github.com/openclaw/openclaw/pull/116930)
- 文档 `nodes push` 退出状态 [#117848](https://github.com/openclaw/openclaw/pull/117848)
- 将代理配置示例更新为规范名册形状 [#118722](https://github.com/openclaw/openclaw/pull/118722)
- 添加顶级版本和 CI 文档选项卡 [#119802](https://github.com/openclaw/openclaw/pull/119802)
- 简化发布和CI文档导航[#120684](https://github.com/openclaw/openclaw/pull/120684)
- 文档门户可用性和工具策略控制 [#123091](https://github.com/openclaw/openclaw/pull/123091)
- 正确的压缩模式有助于并稳定 QA 超时测试 [#124656](https://github.com/openclaw/openclaw/pull/124656)
- 正确的代码模式激活和恢复文档 [#124792](https://github.com/openclaw/openclaw/pull/124792)
- docs（技能）：教导当前 TaskFlow ManagedFlows 运行时 [#125647](https://github.com/openclaw/openclaw/pull/125647)
- 澄清系统代理所有权适用的情况 [#126431](https://github.com/openclaw/openclaw/pull/126431)
- docs（nodes）：阐明Mac节点系统命令[#128497](https://github.com/openclaw/openclaw/pull/128497)
- fix（文档）：用于音频理解的文档 OpenAI API 身份验证以及用于推理的 OAuth [#128885](https://github.com/openclaw/openclaw/pull/128885)
- docs（sqlite）：对齐数据库优先指南 [#129571](https://github.com/openclaw/openclaw/pull/129571)
- docs：备份指南 [#129820](https://github.com/openclaw/openclaw/pull/129820) 中涵盖 sqlite3_rsync 拉取复制
- docs（网关）：记录 Daytona 云工作人员提供商 [#130282](https://github.com/openclaw/openclaw/pull/130282)
- docs（网关）：添加云会话概述页面 [#130301](https://github.com/openclaw/openclaw/pull/130301)
- docs：正确验证和强化设置声明 [#131188](https://github.com/openclaw/openclaw/pull/131188)
- docs：将网关批准、Web 工具限制和搜索提供商文档与已发布的行为对齐 [#131252](https://github.com/openclaw/openclaw/pull/131252)
- docs：限定架构保证并刷新 Hermes 内核详细信息 [#131928](https://github.com/openclaw/openclaw/pull/131928)
- docs：更友好的安全性和首次触摸页面 [#132067](https://github.com/openclaw/openclaw/pull/132067)
- docs：将测试指南与更改检查所有者测试[#132354](https://github.com/openclaw/openclaw/pull/132354)对齐
- docs：协调会话历史记录清理保证 [#132404](https://github.com/openclaw/openclaw/pull/132404)
- docs（mac）：正确的构建提交元数据描述 [#132568](https://github.com/openclaw/openclaw/pull/132568)
- docs：澄清会话监控中的代理所有权 [#132812](https://github.com/openclaw/openclaw/pull/132812)
- 解释有效的旧版 MEDIA 行格式 [#96275](https://github.com/openclaw/openclaw/pull/96275)

</details>

</Accordion>

</AccordionGroup>
