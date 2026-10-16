---
title: "v2026.8.1：插件和集成"
description: "管理员可以浏览、搜索、安装、启用、禁用和删除 Control UI 中的插件，以及精选的 ClawHub 技能和经过审查的 MCP 连接器。"
---

管理员现在可以浏览、搜索、安装、启用、禁用和删除[插件](/plugins/manage-plugins)从Control UI，而同一个集线器可以安装策划的ClawHub技能并添加经过审查的[MCP连接器](/cli/mcp)。托管安装会在需要时暂停以进行源代码审查，将失败的更改回滚到可重试状态，并修复过时或不完整的记录，而不会丢弃正常的配置。插件更新还会保留其开始版本上已进行的工作，然后仅在成功加载后将后续工作移至替换版本。

ClawHub 安装在桌面和移动设备上携带选定的发布者、版本、扫描状态和源，MCP 服务器在连接或目录更改时独立恢复，插件作者获得类型网关和 SDK 合同，用于针对 OpenClaw 进行构建。供应商中立的代理插件可以将技能和支持的 MCP 服务器与范围存储结合在一起，为集成提供从包到运行系统的更清晰的路径。

<AccordionGroup>

<Accordion id="installing-and-managing-plugins" title="安装和管理插件">

管理员现在可以浏览和搜索[安装的插件](/plugins/manage-plugins)在Control UI，查看每个插件提供的内容，启用或禁用它，删除外部插件，安装精选的ClawHub结果，并添加经过审查的MCP连接器。只读操作员可以检查相同的库存，而 Web 表单无法安全表示的高级源、更新和配置仍然可以通过命令行使用。

从任意包、存储库、存档、本地路径或市场源进行的首次安装将停止进行明确审查。仍然需要安装的插件可以保持禁用状态，失败的托管安装会回滚部分更改，以便可以正常重试。 修复可以恢复陈旧或不完整的安装版本，同时保留健康的配置， 完整性或版本漂移仍需要审查。

插件列表和诊断现在可以区分禁用的插件、发现或验证失败、活动运行时故障和后台服务故障。使用`plugins doctor`用于本地发现和配置检查，以及`openclaw health`用于运行系统的插件和服务状态。某些安装和删除仍然需要重新启动才能使更改生效。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 需要确认任意插件源 [#102197](https://github.com/openclaw/openclaw/pull/102197)
- 管理 Control UI [#103176](https://github.com/openclaw/openclaw/pull/103176) 中的插件和 MCP 连接器
- 让 Codex 转而使用批准的工作区目录插件 [#104188](https://github.com/openclaw/openclaw/pull/104188)
- 将插件控件直接放在卡片和行上 [#106040](https://github.com/openclaw/openclaw/pull/106040)
- 在 Control UI [#109510](https://github.com/openclaw/openclaw/pull/109510) 中显示插件目录图稿
- 添加安装策略警告的已审核确认 [#116489](https://github.com/openclaw/openclaw/pull/116489)
- 加速每个`openclaw plugins list`表格[#117900](https://github.com/openclaw/openclaw/pull/117900)
- 使配置的 CLI 帮助和状态加载速度更快 [#124562](https://github.com/openclaw/openclaw/pull/124562)
- 稳定插件中心导航和控制 [#126061](https://github.com/openclaw/openclaw/pull/126061)
- 在插件列表中使用可信托管元数据 [#109629](https://github.com/openclaw/openclaw/pull/109629)
- 按近期顺序订购特色插件 [#110273](https://github.com/openclaw/openclaw/pull/110273)
- Clarify 插件导航和对齐设置控件 [#110482](https://github.com/openclaw/openclaw/pull/110482)
- 使用当前元数据快照加快插件列表 [#115353](https://github.com/openclaw/openclaw/pull/115353)
- 通过网关加速挂接状态命令 [#118288](https://github.com/openclaw/openclaw/pull/118288)
- 加速Doctor插件合约检查[#120811](https://github.com/openclaw/openclaw/pull/120811)
- 加速冷Telegram通道设置[#122955](https://github.com/openclaw/openclaw/pull/122955)
- refactor（插件）：从库存中分离同意突变 [#131146](https://github.com/openclaw/openclaw/pull/131146)
- perf（插件）：使状态数据库写入机制远离元数据读取路径 [#131417](https://github.com/openclaw/openclaw/pull/131417)
- 对齐插件过滤器样式 [#106168](https://github.com/openclaw/openclaw/pull/106168)
- 澄清 MXC 沙箱设置并对出站网络访问发出警告 [#110256](https://github.com/openclaw/openclaw/pull/110256)
- 添加规范插件探索 URL [#115587](https://github.com/openclaw/openclaw/pull/115587)
- Speed插件医生和设置加载[#120876](https://github.com/openclaw/openclaw/pull/120876)
- 删除已停用的 ACPX 配置密钥 [#120937](https://github.com/openclaw/openclaw/pull/120937)
- 推迟屏幕外插件行的渲染 [#125585](https://github.com/openclaw/openclaw/pull/125585)
- 向插件兼容性警告添加故障排除步骤 [#94019](https://github.com/openclaw/openclaw/pull/94019)

**错误修复**

- 阻止插件和技能安装中的 Git 选项注入 [#102398](https://github.com/openclaw/openclaw/pull/102398)
- Reduce插件列出启动内存 [#103132](https://github.com/openclaw/openclaw/pull/103132)
- 当 npm 元数据检查失败时保留健康的插件 [#107063](https://github.com/openclaw/openclaw/pull/107063)
- 从不完整的锁元数据恢复托管npm插件[#107294](https://github.com/openclaw/openclaw/pull/107294)
- 从过时的托管安装中恢复插件生命周期命令 [#107691](https://github.com/openclaw/openclaw/pull/107691)
- 升级后加载主动托管插件生成 [#111141](https://github.com/openclaw/openclaw/pull/111141)
- 序列化插件生命周期更改并保留需要安装的安装 [#112763](https://github.com/openclaw/openclaw/pull/112763)
- 报告插件安全扫描中的所有可执行调用 [#116222](https://github.com/openclaw/openclaw/pull/116222)
- 在管理视图中保留选定的代理工作区插件 [#117265](https://github.com/openclaw/openclaw/pull/117265)
- 在恢复期间保留插件安装记录 [#121045](https://github.com/openclaw/openclaw/pull/121045)
- 保持多条目插件包在其生命周期中保持一致 [#121174](https://github.com/openclaw/openclaw/pull/121174)
- 授权来自已发现的 Codex 市场的插件 [#122389](https://github.com/openclaw/openclaw/pull/122389)
- 拒绝空白技能凭证值 [#108848](https://github.com/openclaw/openclaw/pull/108848)
- 保持 Control 的特色插件与值得信赖的 ClawHub 管理 [#109418](https://github.com/openclaw/openclaw/pull/109418) 保持一致
- 报告不可读插件表现为权限失败 [#110200](https://github.com/openclaw/openclaw/pull/110200)
- 制作root和插件 CLI 帮助干净退出 [#111322](https://github.com/openclaw/openclaw/pull/111322)
- HDoctor修复期间配置的插件加载路径 [#113200](https://github.com/openclaw/openclaw/pull/113200)
- 跨兼容性 ID 保留插件设置 [#114521](https://github.com/openclaw/openclaw/pull/114521)
- 在选择插槽之前强制支持的插件类型 [#114537](https://github.com/openclaw/openclaw/pull/114537)
- 重新安装后加载替换npm插件[#114713](https://github.com/openclaw/openclaw/pull/114713)
- 保持有效插件不被过时的 npm 元数据隔离 [#115610](https://github.com/openclaw/openclaw/pull/115610)
- 在 Codex 迁移期间报告腐败的策划市场 [#115865](https://github.com/openclaw/openclaw/pull/115865)
- 从 pnpm- 恢复插件安装仅覆盖语法 [#116245](https://github.com/openclaw/openclaw/pull/116245)
- 保留技能凭据和订单配置更新 [#116749](https://github.com/openclaw/openclaw/pull/116749)
- 在插件医生中显示可操作警告 [#117357](https://github.com/openclaw/openclaw/pull/117357)
- 市场更新后刷新正在运行的网关 [#117724](https://github.com/openclaw/openclaw/pull/117724)
- 删除禁用的插件拥有的通道配置 [#118127](https://github.com/openclaw/openclaw/pull/118127)
- 插件更新保留索引策略并安全回滚 [#119228](https://github.com/openclaw/openclaw/pull/119228)
- 向管理员返回安全插件安装警告 [#120783](https://github.com/openclaw/openclaw/pull/120783)
- 从清单中恢复插件配置标签 [#121329](https://github.com/openclaw/openclaw/pull/121329)
- 修复捆绑插件清单和Talk语音配置[#121354](https://github.com/openclaw/openclaw/pull/121354)
- fix（插件）：当传出通道架构不同意时允许安装 [#122984](https://github.com/openclaw/openclaw/pull/122984)
- 保留重复数据删除捆绑插件的托管所有权 [#123063](https://github.com/openclaw/openclaw/pull/123063)
- 在没有系统所有者的情况下保持插件库存可用 [#123378](https://github.com/openclaw/openclaw/pull/123378)
- 在插件检查期间保留较新的数据库错误 [#125493](https://github.com/openclaw/openclaw/pull/125493)
- fix（插件）：在线下市场列出MXC [#126211](https://github.com/openclaw/openclaw/pull/126211)
- 瞬时启动失败后恢复插件目录 [#126815](https://github.com/openclaw/openclaw/pull/126815)
- fix（ui）：废弃过时的插件生命周期反馈 [#127273](https://github.com/openclaw/openclaw/pull/127273)
- fix（插件）：在安装 [#128527](https://github.com/openclaw/openclaw/pull/128527) 时报告缺少清单而不是误导性的 id 不匹配
- fix（cli）：渲染钩子报告 JSON 失败 [#128641](https://github.com/openclaw/openclaw/pull/128641)
- fix（cli）：在插件安装提示中保留活动目标 [#129283](https://github.com/openclaw/openclaw/pull/129283)
- fix（插件）：在抛出故障时回滚托管 npm 安装状态 [#130884](https://github.com/openclaw/openclaw/pull/130884)
- fix（插件）：拒绝 git 安装到现有的托管结帐 [#131175](https://github.com/openclaw/openclaw/pull/131175)
- fix（插件）：避免在状态 [#131334](https://github.com/openclaw/openclaw/pull/131334) 期间重复读取清单
- fix（cli）：避免在启动时重复准备插件 [#131503](https://github.com/openclaw/openclaw/pull/131503)
- fix（插件）：在注册表恢复之前保留读取错误 [#131521](https://github.com/openclaw/openclaw/pull/131521)
- 刷新陈旧的插件注册表以添加新的扩展 [#96080](https://github.com/openclaw/openclaw/pull/96080)
- 更新插件记录而不重写用户配置 [#98422](https://github.com/openclaw/openclaw/pull/98422)
- Bound 插件清单在深度安全审核期间读取 [#101773](https://github.com/openclaw/openclaw/pull/101773)
- 当主变量为空时正确查找全局插件 [#102413](https://github.com/openclaw/openclaw/pull/102413)
- 防止插件更新和卸载误读原型命名记录 [#102872](https://github.com/openclaw/openclaw/pull/102872)
- 荣誉医生在插件修复期间的当前安装策略 [#103808](https://github.com/openclaw/openclaw/pull/103808)
- 让 Control UI 管理员启用具有限制性白名单的已安装插件 [#106318](https://github.com/openclaw/openclaw/pull/106318)
- 恢复审批前的插件源验证 [#107768](https://github.com/openclaw/openclaw/pull/107768)
- 拒绝空白所需的挂钩环境值 [#108928](https://github.com/openclaw/openclaw/pull/108928)
- 允许CLI插件卸载以缩小配置 [#110991](https://github.com/openclaw/openclaw/pull/110991)
- 正确的可选插件CLI启用指导[#112019](https://github.com/openclaw/openclaw/pull/112019)
- 从插件列表中省略未观察到的harness ID JSON [#112235](https://github.com/openclaw/openclaw/pull/112235)
- 通过npm包名[#113933](https://github.com/openclaw/openclaw/pull/113933)查找Control UI插件
- 解释无提示 npm 插件安装失败 [#114215](https://github.com/openclaw/openclaw/pull/114215)
- 报告丢失的插件文件，没有错误边界警告 [#115053](https://github.com/openclaw/openclaw/pull/115053)
- 停止重复捆绑发现测试版迁移通知 [#115208](https://github.com/openclaw/openclaw/pull/115208)
- 将无事件挂钩报告为未就绪 [#116083](https://github.com/openclaw/openclaw/pull/116083)
- 一致显示无事件挂钩状态 [#116127](https://github.com/openclaw/openclaw/pull/116127)
- 报告缺少插件依赖项并出现可操作错误 [#117029](https://github.com/openclaw/openclaw/pull/117029)
- 保留经过身份验证的 HEAD 请求的图标元数据 [#117079](https://github.com/openclaw/openclaw/pull/117079)
- 澄清插件医生实际检查的内容 [#117160](https://github.com/openclaw/openclaw/pull/117160)
- 保留市场 JSON 输出可解析 [#117307](https://github.com/openclaw/openclaw/pull/117307)
- 在安装包之前拒绝重复的钩子名称 [#117439](https://github.com/openclaw/openclaw/pull/117439)
- 报告冷插件清单中清单声明的工具 [#117461](https://github.com/openclaw/openclaw/pull/117461)
- fix（插件）：报告注册检查功能[#117518](https://github.com/openclaw/openclaw/pull/117518)
- 当插件策略阻止启用时返回错误 [#117536](https://github.com/openclaw/openclaw/pull/117536)
- 解释 CLI 输出中过滤的已安装插件 [#117556](https://github.com/openclaw/openclaw/pull/117556)
- Surface 验证插件医生中的插件警告 [#118526](https://github.com/openclaw/openclaw/pull/118526)
- 在卸载过程中删除陈旧的插件加载路径 [#118930](https://github.com/openclaw/openclaw/pull/118930)
- 加快缺失通道插件的状态检查 [#119203](https://github.com/openclaw/openclaw/pull/119203)
- 对于格式错误的插件图标路由返回 404 [#119559](https://github.com/openclaw/openclaw/pull/119559)
- 在 HEAD 请求上保留丢失图标元数据 [#120133](https://github.com/openclaw/openclaw/pull/120133)
- 阻止 Doctor 将频道元数据视为插件 [#120891](https://github.com/openclaw/openclaw/pull/120891)
- 防止重复的技能页面预加载请求 [#123705](https://github.com/openclaw/openclaw/pull/123705)
- 聊天安装后显示所需的插件设置 [#123727](https://github.com/openclaw/openclaw/pull/123727)
- 技能信息缺失时返回失败状态 [#123997](https://github.com/openclaw/openclaw/pull/123997)
- Surface 插件清理、设置和 CLI 加载失败 [#124570](https://github.com/openclaw/openclaw/pull/124570)
- 让挂钩切换选择代理工作区 [#124761](https://github.com/openclaw/openclaw/pull/124761)
- 一致报告过时的插件注册表 [#125048](https://github.com/openclaw/openclaw/pull/125048)
- 无法读取安装的插件元数据时发出警告 [#125117](https://github.com/openclaw/openclaw/pull/125117)
- 在没有崩溃框架的情况下显示插件策略拒绝 [#125304](https://github.com/openclaw/openclaw/pull/125304)
- 停止全新安装显示错误的插件注册表修复警告 [#126799](https://github.com/openclaw/openclaw/pull/126799)
- 拒绝技能命令中的未知座席 ID [#126954](https://github.com/openclaw/openclaw/pull/126954)
- 从失败的技能命令返回 JSON 错误 [#127016](https://github.com/openclaw/openclaw/pull/127016)
- fix（cli）：为钩子 enable/disable 失败提供下一步 [#127370](https://github.com/openclaw/openclaw/pull/127370)
- fix（cli）：渲染插件搜索 JSON 失败 [#127679](https://github.com/openclaw/openclaw/pull/127679)
- fix（插件）：标准化漂移修复命令中的校正版本[#127800](https://github.com/openclaw/openclaw/pull/127800)
- fix（插件）：默认插件列表[#128849](https://github.com/openclaw/openclaw/pull/128849)中的表面负载错误
- fix（插件）：检查在名称冲突时加载错误的插件 [#129079](https://github.com/openclaw/openclaw/pull/129079)
- fix（插件）：医生报告支持的仅钩子插件不健康 [#129083](https://github.com/openclaw/openclaw/pull/129083)
- fix（插件）：列表静默隐藏发现和注册表故障 [#129091](https://github.com/openclaw/openclaw/pull/129091)
- fix（插件）：正常禁用报错[#129158](https://github.com/openclaw/openclaw/pull/129158)
- fix（健康）：激活的插件故障被默默忽略[#129161](https://github.com/openclaw/openclaw/pull/129161)
- fix（cli）：将插件更新恢复提示保留在活动容器内 [#129231](https://github.com/openclaw/openclaw/pull/129231)
- fix（插件）：当另一个插件失败时保持健康的 CLI 命令 [#129248](https://github.com/openclaw/openclaw/pull/129248)
- 修复：当市场列表失败时返回JSON [#129263](https://github.com/openclaw/openclaw/pull/129263)
- fix（插件）：在插件中心 [#129480](https://github.com/openclaw/openclaw/pull/129480) 中将缺少的依赖项显示为错误
- fix（插件）：避免插件检查中重复的命令名称[#130339](https://github.com/openclaw/openclaw/pull/130339)
- fix（插件）：报告注册运行时检查中的完整路径[#130904](https://github.com/openclaw/openclaw/pull/130904)
- fix：在匹配关键别名 [#131081](https://github.com/openclaw/openclaw/pull/131081) 之前检查确切的钩子名称
- fix（ui）：将插件中心标题和选项卡与内容对齐 [#131239](https://github.com/openclaw/openclaw/pull/131239)
- fix（ui）： 缩小过大的插件垃圾图标 [#131280](https://github.com/openclaw/openclaw/pull/131280)
- fix（插件）：隐藏库存中已卸载的 TGZ 插件 [#131880](https://github.com/openclaw/openclaw/pull/131880)
- fix（插件）：每次调用解析一次 CLI 插件元数据 [#131884](https://github.com/openclaw/openclaw/pull/131884)
- fix（插件）：在CLI中显示包来源和聊天检查[#133140](https://github.com/openclaw/openclaw/pull/133140)

**文档**

- 正确的扩展安装命令 [#112057](https://github.com/openclaw/openclaw/pull/112057)
- docs（插件）：在生成的插件清单中注册imap [#130363](https://github.com/openclaw/openclaw/pull/130363)
- docs：正确的 Copilot 代理默认启用 [#131164](https://github.com/openclaw/openclaw/pull/131164)
- docs（插件）：正确的捆绑覆盖优先级 [#132181](https://github.com/openclaw/openclaw/pull/132181)

</details>

</Accordion>

<Accordion id="clawhub-claws-and-sharing-skills" title="ClawHub，利爪，分享技能">

[爪轮](/tools/skills)现在通过审查和安装携带选定的发布者、版本、扫描结果和确切来源，包括当两个技能共享名称时。在安装技能或插件之前，其ClawHub安全审核显示确切的发布、安全、审查或阻止结果，ClawHub的概述和审核链接。审核结果为您提供该上下文，并继续进行普通确认，而不是第二个风险门，而仍无法安装被阻止的版本。 Mac、iPhone、iPad 和Android用户使用相同的发布者、版本和审计合约，而外部skills.sh结果保留其固定源身份并明确标记为外部ClawHub扫描。

技能更新可以保护本地和并发编辑，除非操作员明确强制覆盖。 Direct downloads verify a 声明摘要并检查支持的大小限制内的完整存档， 没有指纹的较旧的跟踪安装需要一次强制更新才能建立该基线。

[实验性的Claws](/cli/claws)可以将代理与托管工作区文件、技能、插件打包在一起，MCP服务器和预定的工作。您可以在应用之前预览确切的计划，更新和删除会对 Claw 拥有的资源进行操作，并且共享资源将保留在适当的位置，除非您故意选择冲突感知清理。用同样的东西重新制作一个爪子ID现在会等到旧 Claw 的清理完成，因此中断的删除仍会受到隔离并可重试，而不是删除替换状态。爪子留在后面`OPENCLAW_EXPERIMENTAL_CLAWS=1`，不确定的外部操作可能会留下需要新计划的可见部分状态，并且包不携带凭据、提供程序、绑定、任意本地路径、可执行配置、会话或它不拥有的主机状态。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 安全预览实验爪剂包[#101328](https://github.com/openclaw/openclaw/pull/101328)
- 添加同意的Claw代理安装[#101755](https://github.com/openclaw/openclaw/pull/101755)
- 管理技能并从 Android 上的 ClawHub 安装 [#101864](https://github.com/openclaw/openclaw/pull/101864)
- 创建 Claw 管理的工作区文件 [#101973](https://github.com/openclaw/openclaw/pull/101973)
- 绑定并过期签名 ClawHub 目录信任 [#101981](https://github.com/openclaw/openclaw/pull/101981)
- 为实验爪[#102228](https://github.com/openclaw/openclaw/pull/102228)安装精确的ClawHub包
- 检查并安全去除实验性爪剂[#102296](https://github.com/openclaw/openclaw/pull/102296)
- 将安装的代理导出为便携式爪包 [#102306](https://github.com/openclaw/openclaw/pull/102306)
- 让实验性的爪子安全地管理MCP服务器所有权[#102406](https://github.com/openclaw/openclaw/pull/102406)
- 向 Doctor [#102427](https://github.com/openclaw/openclaw/pull/102427) 添加实验性只读 Claw 生命周期诊断
- 预览分组 Claw 代理安全更新 [#102959](https://github.com/openclaw/openclaw/pull/102959)
- 将同意约束的更新应用于已安装的爪子 [#102982](https://github.com/openclaw/openclaw/pull/102982)
- 使Android技能管理更容易扫描和审查[#105592](https://github.com/openclaw/openclaw/pull/105592)
- 跨 iOS 和 macOS 添加本机技能管理 [#105814](https://github.com/openclaw/openclaw/pull/105814)
- 添加人工编写的 CLAW.md 清单 [#111391](https://github.com/openclaw/openclaw/pull/111391)
- 安装外部skills.sh目录参考[#112751](https://github.com/openclaw/openclaw/pull/112751)
- 与 OpenClaw 政策分开的便携式爪标识 [#112773](https://github.com/openclaw/openclaw/pull/112773)
- 让CLAW.md携带便携式座席提示[#113454](https://github.com/openclaw/openclaw/pull/113454)
- 添加便携式 OpenClaw 配置文件和本机爪引导程序 [#115237](https://github.com/openclaw/openclaw/pull/115237)
- Export 使用 Claw 包审查了首次运行指令 [#115371](https://github.com/openclaw/openclaw/pull/115371)
- 将插件要求添加到 schema-v1 Claw 配置文件 [#115962](https://github.com/openclaw/openclaw/pull/115962)
- 添加实验性本地 Claw 创作生命周期 [#117037](https://github.com/openclaw/openclaw/pull/117037)
- 加载存储库技能以及代理工作区技能 [#125786](https://github.com/openclaw/openclaw/pull/125786)
- feat（clawhub）：安装前显示安全审核 [#131233](https://github.com/openclaw/openclaw/pull/131233)
- 在刷新和快照重用期间验证签名的市场源 [#98338](https://github.com/openclaw/openclaw/pull/98338)
- 将技能上传分段移至 SQLite [#108346](https://github.com/openclaw/openclaw/pull/108346)
- 在Control UI [#114152](https://github.com/openclaw/openclaw/pull/114152)中显示ClawHub技能图标
- 为签名的市场源配置信任密钥 [#98316](https://github.com/openclaw/openclaw/pull/98316)
- 在 CLI 输出中公开签名的市场提要信任 [#98350](https://github.com/openclaw/openclaw/pull/98350)
- 通过灰熊添加熊笔记技能 CLI [#120](https://github.com/openclaw/openclaw/pull/120)

**错误修复**

- 重试瞬态 ClawHub 包读取 [#105388](https://github.com/openclaw/openclaw/pull/105388)
- fix（技能）：阻止技能更新破坏本地技能更改[#118190](https://github.com/openclaw/openclaw/pull/118190)
- 通过安装 [#124250](https://github.com/openclaw/openclaw/pull/124250) 保留外部 ClawHub 技能身份
- fix（技能）：在提取[#129486](https://github.com/openclaw/openclaw/pull/129486)之前拒绝更改的下载档案
- 荣誉标准ClawHub插件API比较器[#106889](https://github.com/openclaw/openclaw/pull/106889)
- 标准化代理 git 软件包安装身份 [#107637](https://github.com/openclaw/openclaw/pull/107637)
- 在密钥旋转期间保留签名馈送回滚保护 [#108342](https://github.com/openclaw/openclaw/pull/108342)
- 拒绝签名插件目录中格式错误的时间戳 [#109742](https://github.com/openclaw/openclaw/pull/109742)
- 接受标准 DSSE 插件目录源 [#110037](https://github.com/openclaw/openclaw/pull/110037)
- 显示ClawHub对第一个技能负载的安全判决[#110166](https://github.com/openclaw/openclaw/pull/110166)
- 安装正确的推荐技能并保持故障可重试 [#111518](https://github.com/openclaw/openclaw/pull/111518)
- 显示和安装替代技能 CLI 要求 [#113767](https://github.com/openclaw/openclaw/pull/113767)
- 哈登实验爪添加和删除生命周期 [#114670](https://github.com/openclaw/openclaw/pull/114670)
- 报告 Claw 就绪检查中缺少插件凭据 [#114899](https://github.com/openclaw/openclaw/pull/114899)
- 恢复技能依赖性安装同意 [#116644](https://github.com/openclaw/openclaw/pull/116644)
- 通过审核保留选定的ClawHub发布者并安装[#121697](https://github.com/openclaw/openclaw/pull/121697)
- 安全恢复Claw生命周期所有权[#123254](https://github.com/openclaw/openclaw/pull/123254)
- 在技能提取之前拒绝不完整的 tar 列表 [#125406](https://github.com/openclaw/openclaw/pull/125406)
- 修复（爪子）：未更改的拥有技能不再阻止更新[#126479](https://github.com/openclaw/openclaw/pull/126479)
- fix（cli）：拒绝 ClawHub-only 源技能标志 [#128162](https://github.com/openclaw/openclaw/pull/128162)
- fix（爪子）：通过清理保留删除栅栏[#128500](https://github.com/openclaw/openclaw/pull/128500)
- fix（技能）：绑定安装程序下载[#129630](https://github.com/openclaw/openclaw/pull/129630)
- fix（本机）：取消不支持的 ClawHub 确认重试 [#131979](https://github.com/openclaw/openclaw/pull/131979)
- fix（android）：停止提供过时的 ClawHub 确认重试 [#132016](https://github.com/openclaw/openclaw/pull/132016)
- 通过 ClawHub [05e3ce1](https://github.com/openclaw/openclaw/commit/05e3ce1) 恢复 Fish Audio 发布
- 迁移时保留 Unicode Claude 命令描述 [#102616](https://github.com/openclaw/openclaw/pull/102616)
- 在超时时间内保持ClawHub促销刷新[#105411](https://github.com/openclaw/openclaw/pull/105411)
- 忽略格式错误 ClawHub 计时后重试 [#105479](https://github.com/openclaw/openclaw/pull/105479)
- Link 通过托管锁文件 [#106479](https://github.com/openclaw/openclaw/pull/106479) 全局安装 ClawHub 技能
- 拒绝 ClawHub 促销源中不可能的日期 [#106942](https://github.com/openclaw/openclaw/pull/106942)
- ClawHub技能验证失败时发出警告 [#107143](https://github.com/openclaw/openclaw/pull/107143)
- 在ClawHub发布错误中保持表情符号完整[#108172](https://github.com/openclaw/openclaw/pull/108172)
- 忽略格式错误的 ClawHub 速率限制重置提示 [#108815](https://github.com/openclaw/openclaw/pull/108815)
- 向发布者显示重复的 ClawHub 技能结果 [#110903](https://github.com/openclaw/openclaw/pull/110903)
- 拒绝 ClawHub 响应中格式错误的 UTF-8 [#111164](https://github.com/openclaw/openclaw/pull/111164)
- 将ClawHub技能搜索结果保留在一根终端线上 [#111441](https://github.com/openclaw/openclaw/pull/111441)
- 拒绝托管插件目录中格式错误的 UTF-8 [#111768](https://github.com/openclaw/openclaw/pull/111768)
- 阻止医生将当前 OCM 技能路径标记为过时 [#112236](https://github.com/openclaw/openclaw/pull/112236)
- 澄清未经验证的插件信任指南 [#112249](https://github.com/openclaw/openclaw/pull/112249)
- Count 成功安装 ClawHub 插件 [#113133](https://github.com/openclaw/openclaw/pull/113133)
- 通过托管代理路由技能验证 [#113683](https://github.com/openclaw/openclaw/pull/113683)
- 保留版本固定技能的启动保护 [#114924](https://github.com/openclaw/openclaw/pull/114924)
- 在所选实例上保留技能命令提示 [#117555](https://github.com/openclaw/openclaw/pull/117555)
- 安全移除拥有者资格 ClawHub 技能 [#119606](https://github.com/openclaw/openclaw/pull/119606)
- 将 Fish Audio 插件迁移到其规范身份 [#119900](https://github.com/openclaw/openclaw/pull/119900)
- Keep 技能验证错误机器可读 [#123761](https://github.com/openclaw/openclaw/pull/123761)
- Keep Claws更新JSON输出可解析[#124130](https://github.com/openclaw/openclaw/pull/124130)
- 给出缺少的ClawHub技能可操作错误[#124764](https://github.com/openclaw/openclaw/pull/124764)
- 使缺失技能验证错误可操作 [#125317](https://github.com/openclaw/openclaw/pull/125317)
- Keep Claw 项目工件在运行时具有确定性 [#125801](https://github.com/openclaw/openclaw/pull/125801)
- Fix ClawHub 预发布兼容性检查 [#126020](https://github.com/openclaw/openclaw/pull/126020)
- 点缺ClawHub技能搜索[#126987](https://github.com/openclaw/openclaw/pull/126987)
- 清理失败 ClawHub 存档暂存 [#127065](https://github.com/openclaw/openclaw/pull/127065)
- fix（插件）：包括所需的 ClawHub 脚手架元数据 [#129712](https://github.com/openclaw/openclaw/pull/129712)
- fix（插件）：将 ClawHub 标签报告为浮动安装源 [#130917](https://github.com/openclaw/openclaw/pull/130917)

**文档**

- 将 Buzz 添加到生成的插件清单中 [#114875](https://github.com/openclaw/openclaw/pull/114875)

</details>

</Accordion>

<Accordion id="loading-and-updating-plugins" title="加载和更新插件">

[插件更新](/plugins/architecture)现在为已经正在进行的工作保留一代运行时。接受的消息、完成和工作人员以他们开始时使用的插件版本结束，并且只有在成功加载后，后续工作才会转移到替换版本。如果实时重新加载失败，OpenClaw 将恢复最后的活动命令、提供程序、挂钩、内存和其他注册。

OpenClaw 还可以轮流重复使用准备好的插件元数据和运行时，而不是每次都重建相同的设置，而运行状况则直接显示失败的激活、清理或后台服务。可以隔离已知的插件拥有的故障，而无需使健康的插件或所有 OpenClaw 离线，而无效的配置、失败的迁移、不明确的所有权和无法验证的状态仍然会停止激活。

上下文引擎插件在新的回合中保持选中状态，并且可以通过对接受的回合而不是所有累积的历史应用限制来在长时间会话中推进持久状态。现有的 v1 引擎会保留其完整历史合约，直到采用更新的界面，并且超过 8 MiB 或 20,000 个事件的单个已接受回合仍会停止。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 通过捆绑的 Ollama 插件 [#119745](https://github.com/openclaw/openclaw/pull/119745) 减少非活动启动成本
- 跨温暖网关重用插件准备 [#105646](https://github.com/openclaw/openclaw/pull/105646)
- 为插件入口副作用添加持久重放防护 [#110846](https://github.com/openclaw/openclaw/pull/110846)
- 跨重复目录读取重用插件通道发现 [#114324](https://github.com/openclaw/openclaw/pull/114324)
- 在加载期间重用准备好的插件元数据 [#114807](https://github.com/openclaw/openclaw/pull/114807)
- 减少插件密集型网关启动时间和内存 [#115020](https://github.com/openclaw/openclaw/pull/115020)
- 从网关轮次中删除重复的插件指纹工作 [#118334](https://github.com/openclaw/openclaw/pull/118334)
- 在代理工具构建期间重用准备好的插件上下文 [#118398](https://github.com/openclaw/openclaw/pull/118398)
- 推迟可选的 xAI 功能运行时间，直到首次使用 [#119374](https://github.com/openclaw/openclaw/pull/119374)
- 延迟加载 Anthropic 会话目录 [#119619](https://github.com/openclaw/openclaw/pull/119619)
- 重复使用未更改的沙盒技能快照[#121379](https://github.com/openclaw/openclaw/pull/121379)
- perf（插件）：在秘密热路径上重用生命周期元数据 [#126629](https://github.com/openclaw/openclaw/pull/126629)
- 在技能观察器刷新期间重用插件元数据 [#127088](https://github.com/openclaw/openclaw/pull/127088)
- perf（插件）：统一渐进式插件缓存所有权[#131442](https://github.com/openclaw/openclaw/pull/131442)
- perf（插件）：避免在提供程序发现期间记录导入 [#132744](https://github.com/openclaw/openclaw/pull/132744)
- 避免在路由和状态路径中加载冷插件 [#109348](https://github.com/openclaw/openclaw/pull/109348)
- 停止从轮询磁盘查找插件元数据 [#114289](https://github.com/openclaw/openclaw/pull/114289)
- 避免重复查找丢失的插件外观 [#124664](https://github.com/openclaw/openclaw/pull/124664)
- perf（插件）：每个 CLI 进程重用一个插件元数据快照 [#129181](https://github.com/openclaw/openclaw/pull/129181)
- perf（agents）：在流式传输 [#130158](https://github.com/openclaw/openclaw/pull/130158) 期间避免未使用的扩展上下文

**错误修复**

- 防止 Codex 插件发现停止代理变成 [#108311](https://github.com/openclaw/openclaw/pull/108311)
- 当一个秘密失败时保持健康的技能 [#109791](https://github.com/openclaw/openclaw/pull/109791)
- 当一个配置的插件损坏时保持网关运行 [#110239](https://github.com/openclaw/openclaw/pull/110239)
- 保留捆绑插件发现和范围激活 [#114547](https://github.com/openclaw/openclaw/pull/114547)
- 减少重复的插件注册表路径扫描 [#115783](https://github.com/openclaw/openclaw/pull/115783)
- 在一次性代理运行期间保持已安装的插件可用 [#116336](https://github.com/openclaw/openclaw/pull/116336)
- 恢复配置的代理轮次的准备运行时重用 [#117768](https://github.com/openclaw/openclaw/pull/117768)
- 统一插件webhook路由所有权和启动失败处理 [#118203](https://github.com/openclaw/openclaw/pull/118203)
- fix（插件）：将格式错误的清单模式与插件加载和配置验证隔离 [#119825](https://github.com/openclaw/openclaw/pull/119825)
- 保留多条目插件和链接的安装源 [#120026](https://github.com/openclaw/openclaw/pull/120026)
- 停止重复插件扫描冻结网关 [#120344](https://github.com/openclaw/openclaw/pull/120344)
- 在新轮次中保持配置的上下文引擎处于活动状态 [#121461](https://github.com/openclaw/openclaw/pull/121461)
- Reduce 网关因重复的插件元数据发现而停止 [#124844](https://github.com/openclaw/openclaw/pull/124844)
- 保持配置文件插件工具在代理运行时路径中可用 [#124947](https://github.com/openclaw/openclaw/pull/124947)
- Stop 插件元数据从停止网关重新扫描 [#125596](https://github.com/openclaw/openclaw/pull/125596)
- 跨网关实例隔离插件运行时所有权 [#125821](https://github.com/openclaw/openclaw/pull/125821)
- 停止终端上下文引擎行随后降级 [#126593](https://github.com/openclaw/openclaw/pull/126593)
- 修复：对于不透明目标，插件对话绑定失败 [#132733](https://github.com/openclaw/openclaw/pull/132733)
- 修复：启动时缺少受信任运行时插件的恢复会话 [#132804](https://github.com/openclaw/openclaw/pull/132804)
- fix（通道）：遵守可信插件激活合同（#114492）[9b77c06](https://github.com/openclaw/openclaw/commit/9b77c06)
- 在准备好的网关运行时中保留构建的插件 [ef91c81](https://github.com/openclaw/openclaw/commit/ef91c81)
- 停止重复扫描不可用的通道插件 [#100377](https://github.com/openclaw/openclaw/pull/100377)
- 防止递归提示-build hook调度[#102554](https://github.com/openclaw/openclaw/pull/102554)
- 当热重载失败时保持活动插件工作 [#103812](https://github.com/openclaw/openclaw/pull/103812)
- 插件注册失败后清理调度程序作业 [#106890](https://github.com/openclaw/openclaw/pull/106890)
- 注册失败后完全恢复插件状态 [#108084](https://github.com/openclaw/openclaw/pull/108084)
- 将有状态插件挂钩和工具保留在同一注册中 [#108110](https://github.com/openclaw/openclaw/pull/108110)
- 在慢速 Telegram 发送 [#108164](https://github.com/openclaw/openclaw/pull/108164) 期间保留设备对通知
- 防止源安装上重复的捆绑插件实例 [#108508](https://github.com/openclaw/openclaw/pull/108508)
- 防止 ACPX 进程清理挂起 [#109146](https://github.com/openclaw/openclaw/pull/109146)
- 突发期间的绑定回复挂钩使用元数据 [#109610](https://github.com/openclaw/openclaw/pull/109610)
- 释放通道运行时上下文时中止侦听器 [#109708](https://github.com/openclaw/openclaw/pull/109708)
- 防止无响应的插件中间件冻结代理运行 [#110731](https://github.com/openclaw/openclaw/pull/110731)
- 加载配置的独立插件文件，无需清单 [#111515](https://github.com/openclaw/openclaw/pull/111515)
- 插件重新加载时刷新提供程序元数据 [#112699](https://github.com/openclaw/openclaw/pull/112699)
- CLI 进程退出时释放共享状态租约 [#113839](https://github.com/openclaw/openclaw/pull/113839)
- 跨生命周期和代理运行隔离网关插件状态 [#114476](https://github.com/openclaw/openclaw/pull/114476)
- 在重新连接时保留 ACPX 进程所有权 [#115247](https://github.com/openclaw/openclaw/pull/115247)
- 避免插件元数据在代理轮流期间停止 [#115426](https://github.com/openclaw/openclaw/pull/115426)
- Bound 插件挂钩等待并撤销过时的注册 [#115695](https://github.com/openclaw/openclaw/pull/115695)
- 在模型所有者之前发布插件激活的网关配置 [#115747](https://github.com/openclaw/openclaw/pull/115747)
- 使 Codex 应用程序库存在共享运行时保持最新 [#115866](https://github.com/openclaw/openclaw/pull/115866)
- 将插件注册表状态保留在正确的数据库上 [#116427](https://github.com/openclaw/openclaw/pull/116427)
- 清理失败的插件服务仅启动一次 [#116804](https://github.com/openclaw/openclaw/pull/116804)
- 插件生命周期更改后刷新通道元数据 [#117005](https://github.com/openclaw/openclaw/pull/117005)
- 正确的插件诊断并稳定发现顺序 [#117025](https://github.com/openclaw/openclaw/pull/117025)
- 将延迟插件转换保留在持久缓存中 [#117355](https://github.com/openclaw/openclaw/pull/117355)
- 保持持久插件注册表快照一致 [#117561](https://github.com/openclaw/openclaw/pull/117561)
- 返回可重试的503，直到插件路由准备好 [#117852](https://github.com/openclaw/openclaw/pull/117852)
- 包含拒绝的同步插件挂钩 [#117988](https://github.com/openclaw/openclaw/pull/117988)
- 插件停止时释放 llama.cpp 模型内存 [#119238](https://github.com/openclaw/openclaw/pull/119238)
- 为本地代理执行加载已安装的代理harness [#119855](https://github.com/openclaw/openclaw/pull/119855)
- 防止停止的 ACPX 运行时返回 [#120029](https://github.com/openclaw/openclaw/pull/120029)
- 停止错误的遗留上下文引擎降级警告 [#120722](https://github.com/openclaw/openclaw/pull/120722)
- 运行时可用性更改时刷新 ACPX 技能 [#121181](https://github.com/openclaw/openclaw/pull/121181)
- fix（beam）：重试终端镜像上传失败 [#121186](https://github.com/openclaw/openclaw/pull/121186)
- 保持持久的上下文引擎在长时间会话中前进 [#121647](https://github.com/openclaw/openclaw/pull/121647)
- 在长会话中保持上下文引擎状态前进 [#122149](https://github.com/openclaw/openclaw/pull/122149)
- 使插件安装注册原子化 [#123506](https://github.com/openclaw/openclaw/pull/123506)
- 保留故障插件诊断而不激活功能 [#125046](https://github.com/openclaw/openclaw/pull/125046)
- Surface 插件服务运行状况失败 [#125366](https://github.com/openclaw/openclaw/pull/125366)
- 在一个准备好的插件生成上保持压缩 [#125688](https://github.com/openclaw/openclaw/pull/125688)
- 将完成情况和工作人员保留在一代插件上 [#125761](https://github.com/openclaw/openclaw/pull/125761)
- 通过网关轮流保留一个插件生成 [#125990](https://github.com/openclaw/openclaw/pull/125990)
- Keep代理打开他们承认的插件生成[#126626](https://github.com/openclaw/openclaw/pull/126626)
- 防止网关重新加载后过时的插件状态 [#126627](https://github.com/openclaw/openclaw/pull/126627)
- 限制网关启动运行时加载到活动插件 [#126703](https://github.com/openclaw/openclaw/pull/126703)
- 在生命周期更改时退出可执行插件缓存 [#126719](https://github.com/openclaw/openclaw/pull/126719)
- 加载执行工作区技能时重复使用准备好的插件元数据 [#126720](https://github.com/openclaw/openclaw/pull/126720)
- 在陈旧加载失败后保留刷新的插件提取器 [#126829](https://github.com/openclaw/openclaw/pull/126829)
- fix（插件）：绑定失败启动服务清理与替换停止超时[#126907](https://github.com/openclaw/openclaw/pull/126907)
- fix（插件）：生命周期重置后重新加载替换的安装模块 [#128110](https://github.com/openclaw/openclaw/pull/128110)
- fix（代理）：防止重新加载丢失排队回复或恢复过时的凭据 [#128138](https://github.com/openclaw/openclaw/pull/128138)
- fix（插件）：防止重复的后台服务和发现广告商[#128179](https://github.com/openclaw/openclaw/pull/128179)
- fix（钩子）：恢复mtime编辑后重新加载可变处理程序[#128477](https://github.com/openclaw/openclaw/pull/128477)
- fix（代理）：保留插件工具终止[#128505](https://github.com/openclaw/openclaw/pull/128505)
- perf（插件）：强制加载一次 - 默认凭证源门和遏制注册表重用 [#128639](https://github.com/openclaw/openclaw/pull/128639)
- fix（插件）：激活回滚后保持频道权威 [#129232](https://github.com/openclaw/openclaw/pull/129232)
- fix（插件）：阻止已退出的回调更改运行上下文 [#129250](https://github.com/openclaw/openclaw/pull/129250)
- fix（sessions）：将维护与通道插件解析器隔离 [#129490](https://github.com/openclaw/openclaw/pull/129490)
- fix（插件）：表面无效的后台和发现服务[#129651](https://github.com/openclaw/openclaw/pull/129651)
- fix（代理）：范围失败插件注册表加载到活动运行时注册表[#130167](https://github.com/openclaw/openclaw/pull/130167)
- fix（插件）：注册期间插件运行时不可用时关闭失败 [#130597](https://github.com/openclaw/openclaw/pull/130597)
- fix（沙箱）：通过注册表生命周期淘汰插件后端 [#130662](https://github.com/openclaw/openclaw/pull/130662)
- fix（插件）：报告失败的插件斜线命令，而不是默默地忽略它们 [#130743](https://github.com/openclaw/openclaw/pull/130743)
- fix（插件）：保持SecretRef配置可加载[#131310](https://github.com/openclaw/openclaw/pull/131310)
- 修复：网关启动无法跨工作区刷新插件 [#131936](https://github.com/openclaw/openclaw/pull/131936)
- fix（插件）：通过运行时注册取消加载器缓存 [#132093](https://github.com/openclaw/openclaw/pull/132093)
- fix（插件）：加载源工件而不丢失凭证目标 [#132166](https://github.com/openclaw/openclaw/pull/132166)
- fix（plugin-sdk）：保留环境代理分辨率[#132541](https://github.com/openclaw/openclaw/pull/132541)
- fix（网关）：在进程内重新启动时停止堆增长 [#132933](https://github.com/openclaw/openclaw/pull/132933)
- fix（通道）：在代理工作区之前解析注册的插件（#124709）[4f59053](https://github.com/openclaw/openclaw/commit/4f59053)
- Finish 插件 HTTP 路由失败后响应 [#102125](https://github.com/openclaw/openclaw/pull/102125)
- 在 ACPX Codex 错误诊断中保留 Unicode [#103738](https://github.com/openclaw/openclaw/pull/103738)
- 当代理停止时取消挂起的捆绑包 LSP 工具 [#104110](https://github.com/openclaw/openclaw/pull/104110)
- 注册后保持插件运行上下文可用 [#107028](https://github.com/openclaw/openclaw/pull/107028)
- 在插件发现期间忽略TypeScript声明文件[#107994](https://github.com/openclaw/openclaw/pull/107994)
- 通过清单识别配置的插件依赖项 ID [#113691](https://github.com/openclaw/openclaw/pull/113691)
- 防止仅路径引导文件导致代理崩溃 [#115395](https://github.com/openclaw/openclaw/pull/115395)
- 元数据更新后刷新捆绑的插件工件位置 [#117041](https://github.com/openclaw/openclaw/pull/117041)
- Make插件验证重启指导安装中性[#119508](https://github.com/openclaw/openclaw/pull/119508)
- Keep ACPX 在一个会话快照上处理操作 [#120924](https://github.com/openclaw/openclaw/pull/120924)
- 加载为直接代理入口配置的插件运行时 [#121787](https://github.com/openclaw/openclaw/pull/121787)
- 插件路由调度失败时返回HTTP 500 [#124033](https://github.com/openclaw/openclaw/pull/124033)
- Stop 取消了返回过时 JSON [#124673](https://github.com/openclaw/openclaw/pull/124673) 的 llm 任务调用
- 激活前拒绝缓存插件加载失败 [#126737](https://github.com/openclaw/openclaw/pull/126737)
- fix（插件）：绑定白名单警告历史记录 [#127126](https://github.com/openclaw/openclaw/pull/127126)
- fix（代理）：保留通道转动的承认的运行时生成 [#127217](https://github.com/openclaw/openclaw/pull/127217)
- perf（代理）：重用活动网关插件生成[#127278](https://github.com/openclaw/openclaw/pull/127278)
- fix（diffs）：当runtime.state不可用时，阻止轻量级CLI注册崩溃 [#128360](https://github.com/openclaw/openclaw/pull/128360)
- fix（插件）：在检查期间显示注册的网关发现服务[#130267](https://github.com/openclaw/openclaw/pull/130267)
- fix（插件）：整合设置错误并回滚失败的通道[#131983](https://github.com/openclaw/openclaw/pull/131983)
- fix（插件）：保持并发目录采用范围仅限于每个代理 [#132734](https://github.com/openclaw/openclaw/pull/132734)

</details>

</Accordion>

<Accordion id="mcp-servers-and-apps" title="MCP 服务器和应用程序">

[MCP 服务器](/cli/mcp) 现在可以在启动延迟、传输丢失、服务器重新启动或更改工具列表后恢复其连接和目录，而无需重新启动 OpenClaw 或关闭运行状况良好的服务器。工具结果保留结构化数据、屏幕截图、音频、资源、恢复指南和真实错误状态。首先发现过期有状态会话的调用仍然会失败一次而不会重播，因为它可能已经更改了某些内容。

本地MCP登录可以在浏览器中完成，保存并验证凭证，并在进程重启后恢复新开始的授权。共享操作员登录仍然是默认设置，而受支持的 HTTP MCP 服务器可以选择单人 OAuth，从而将每个凭据附加到可信通道、机器人帐户和发件人。远程和无头操作员保留手动代码路径，并且这种第一个单人模式不添加私人登录交付、自动轮流恢复或 Control UI 帐户管理。

MCP 应用程序保持选择加入状态，并可以在所需的配置和重新启动后显示支持的交互式服务器界面。它们将信任扩展到服务器提供的 UI 代码，重建的对话视图保持只读状态，应用程序上下文作为不受信任的输入进入下一轮。无头节点可以将请求响应 MCP 工具发布到代码模式中，而 OAuth、流式传输、通知、采样和移动发布仍然位于第一个节点托管版本之外。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加请求者范围的 MCP 连接 [#106359](https://github.com/openclaw/openclaw/pull/106359)
- 添加同意门控 MCP 应用程序消息传递桥和实时主机上下文 [#109807](https://github.com/openclaw/openclaw/pull/109807)
- 添加票证只读独立 MCP 应用程序主机 [#109861](https://github.com/openclaw/openclaw/pull/109861)
- 启用独立 MCP 应用程序中的工具和资源 [#110515](https://github.com/openclaw/openclaw/pull/110515)
- 让交互式MCP Apps提供一回合模型上下文[#111212](https://github.com/openclaw/openclaw/pull/111212)
- 让原生插件声明 MCP Apps [#113224](https://github.com/openclaw/openclaw/pull/113224)
- 与嵌入式 MCP 应用程序共享 Control UI 样式 [#113464](https://github.com/openclaw/openclaw/pull/113464)
- 给节点MCP服务器一个类型化的代码模式命名空间[#114876](https://github.com/openclaw/openclaw/pull/114876)
- 为 MCP 服务器添加每个请求者 OAuth [#122166](https://github.com/openclaw/openclaw/pull/122166)
- 将选择加入沙盒 MCP 应用程序添加到 Control UI [#69039](https://github.com/openclaw/openclaw/pull/69039)
- Node-托管工具、MCP服务器和技能 [#90431](https://github.com/openclaw/openclaw/pull/90431)
- 延迟加载 MCP 应用程序聊天桥 [#106288](https://github.com/openclaw/openclaw/pull/106288)
- 集中 MCP OAuth 身份和可恢复登录状态 [#122115](https://github.com/openclaw/openclaw/pull/122115)
- Cache 不可变捆绑 MCP 配置发现 [#79882](https://github.com/openclaw/openclaw/pull/79882)

**错误修复**

- 来自共享聊天的 Redact MCP 凭据显示输出 [#103396](https://github.com/openclaw/openclaw/pull/103396)
- 将 MCP 服务器配置保留在组回复之外 [#103502](https://github.com/openclaw/openclaw/pull/103502)
- 将MCP刷新令牌与其发行者[#112032](https://github.com/openclaw/openclaw/pull/112032)
- 将非文本 MCP 内容与结构化结果一起保留 [#115521](https://github.com/openclaw/openclaw/pull/115521)
- fix（网关）：自己的独立MCP应用程序请求生命周期[#119388](https://github.com/openclaw/openclaw/pull/119388)
- 浏览器批准后完成MCP OAuth登录[#120431](https://github.com/openclaw/openclaw/pull/120431)
- 实时恢复节点托管的 MCP 目录和会话 [#125092](https://github.com/openclaw/openclaw/pull/125092)
- 防止过时的 MCP 目录和静默工具故障 [#125564](https://github.com/openclaw/openclaw/pull/125564)
- Mark 将 OpenClaw 工具故障解决为 MCP 错误 [#126472](https://github.com/openclaw/openclaw/pull/126472)
- 会话重置或删除后清理陈旧的 MCP 进程 [#93559](https://github.com/openclaw/openclaw/pull/93559)
- 使 MCP OAuth 凭证在 CLI 和本地 Codex 运行时中工作 [#96120](https://github.com/openclaw/openclaw/pull/96120)
- 抑制 MCP 通知的响应 [#101730](https://github.com/openclaw/openclaw/pull/101730)
- Bound 已配置超时的 MCP OAuth 请求停止 [#103704](https://github.com/openclaw/openclaw/pull/103704)
- 保留节点 MCP 配对和断开连接恢复 [#104745](https://github.com/openclaw/openclaw/pull/104745)
- Preserve MCP 应用程序在静音转弯和重新加载时预览 [#105728](https://github.com/openclaw/openclaw/pull/105728)
- 保留每个 MCP 文字联合操作 [#108054](https://github.com/openclaw/openclaw/pull/108054)
- 因格式错误的 MCP 应用程序 CSP 元数据 [#108883](https://github.com/openclaw/openclaw/pull/108883) 而失败
- CLI 运行清理后保持共享 MCP 传输活动 [#110251](https://github.com/openclaw/openclaw/pull/110251)
- 让嵌入式 MCP 应用程序在视图关闭之前完成清理 [#111124](https://github.com/openclaw/openclaw/pull/111124)
- 拒绝 MCP 应用程序沙箱策略中格式错误的 UTF-8 [#111282](https://github.com/openclaw/openclaw/pull/111282)
- 服务器恢复后重试 MCP 工具目录 [#111962](https://github.com/openclaw/openclaw/pull/111962)
- 跨注册表更改保留请求者范围的 MCP 解析器 [#112579](https://github.com/openclaw/openclaw/pull/112579)
- 在断开连接和重复超时后恢复捆绑的 MCP 服务器 [#113916](https://github.com/openclaw/openclaw/pull/113916)
- 拒绝保留 `__proto__` MCP 服务器名称 [#116112](https://github.com/openclaw/openclaw/pull/116112)
- Bound MCP 目录分页和加载时间 [#116845](https://github.com/openclaw/openclaw/pull/116845)
- 显示超时而不是挂起独立的 MCP 应用程序 [#119276](https://github.com/openclaw/openclaw/pull/119276)
- 隔离超大的 MCP 标准输出帧，而不是使主机崩溃 [#119379](https://github.com/openclaw/openclaw/pull/119379)
- 完成MCP OAuth通过浏览器登录回调[#120433](https://github.com/openclaw/openclaw/pull/120433)
- fix（mcp）：保留客户端和请求者生命周期所有权 [#120894](https://github.com/openclaw/openclaw/pull/120894)
- 登录期间重复使用有效的 MCP OAuth 会话 [#122129](https://github.com/openclaw/openclaw/pull/122129)
- 使 Codex MCP 审批设置和死角可操作 [#124766](https://github.com/openclaw/openclaw/pull/124766)
- 解释超时 Codex MCP 批准 [#125860](https://github.com/openclaw/openclaw/pull/125860)
- 在结构化 MCP 工具结果中保留恢复指导 [#125914](https://github.com/openclaw/openclaw/pull/125914)
- 淘汰过时的 MCP 传输和处理树 [#126101](https://github.com/openclaw/openclaw/pull/126101)
- 修复 MCP 通道媒体、事件传递和清理 [#126592](https://github.com/openclaw/openclaw/pull/126592)
- fix（节点主机）：防止 MCP 断电后重新连接风暴 [#128196](https://github.com/openclaw/openclaw/pull/128196)
- fix（ai）：在展平根级anyOf工具架构时保留根属性[#128799](https://github.com/openclaw/openclaw/pull/128799)
- fix（codex）：使用点状MCP工具名称结束静音，没有回复[#128900](https://github.com/openclaw/openclaw/pull/128900)
- 修复：更换网关后呈现陈旧的仪表板应用程序视图 [#130172](https://github.com/openclaw/openclaw/pull/130172)
- fix（mcp）：防止元数据和清理急切加载运行时 [#133028](https://github.com/openclaw/openclaw/pull/133028)
- fix（网关）：保留独立的 MCP 应用程序 HEAD 响应元数据 （#120905） [6f4b9a2](https://github.com/openclaw/openclaw/commit/6f4b9a2)
- 在 MCP 工具模式中保留原型命名的字段 [#102856](https://github.com/openclaw/openclaw/pull/102856)
- 修复存储在直接包含的配置中的MCP标志[#103970](https://github.com/openclaw/openclaw/pull/103970)
- 拒绝并修复不支持的 MCP 禁用设置 [#104495](https://github.com/openclaw/openclaw/pull/104495)
- 拒绝十六进制 MCP 超时选项 [#104633](https://github.com/openclaw/openclaw/pull/104633)
- 防止因计时器设置过大而导致 MCP 立即超时 [#105769](https://github.com/openclaw/openclaw/pull/105769)
- Clamp 超大 MCP 超时至 Node- 安全限制 [#105784](https://github.com/openclaw/openclaw/pull/105784)
- Bound并发MCP医生探针[#109870](https://github.com/openclaw/openclaw/pull/109870)
- Reject 格式错误的解码 MCP 沙箱策略元数据 [#110275](https://github.com/openclaw/openclaw/pull/110275)
- fix（mcp）：防止分块 stdio 诊断损坏 [#110652](https://github.com/openclaw/openclaw/pull/110652)
- 初始化超时时失败 MCP 设置 [#111318](https://github.com/openclaw/openclaw/pull/111318)
- 保持仅资源 MCP 服务器可用 [#115169](https://github.com/openclaw/openclaw/pull/115169)
- fix（代理）：为服务器名称工具具体化 MCP 允许 glob [#115277](https://github.com/openclaw/openclaw/pull/115277)
- 服务器重新启动后重新连接有状态 MCP 工具 [#115614](https://github.com/openclaw/openclaw/pull/115614)
- 在 MCP 应用程序沙箱 HEAD 响应上保留内容长度 [#118553](https://github.com/openclaw/openclaw/pull/118553)
- Make MCP 博士荣誉 Windows PATH 套管 [#121595](https://github.com/openclaw/openclaw/pull/121595)
- fix（cli）：合并嵌套的 MCP 配置和工具补丁 [#124551](https://github.com/openclaw/openclaw/pull/124551)
- fix（mcp）：重复数据删除阻止了 stdio env 警告 [#128102](https://github.com/openclaw/openclaw/pull/128102)
- fix（mcp）：阻止添加替换现有服务器 [#128129](https://github.com/openclaw/openclaw/pull/128129)
- fix（cli）：识别 OAuth 授权标头，无论大小写 [#129279](https://github.com/openclaw/openclaw/pull/129279)
- fix（codex）：保留禁用的MCP传输[#130872](https://github.com/openclaw/openclaw/pull/130872)
- fix（doctor）：忽略警告中禁用的 MCP 服务器 [#131352](https://github.com/openclaw/openclaw/pull/131352)
- fix（代理）：配置更改时通告的 MCP 目录无效 [#131793](https://github.com/openclaw/openclaw/pull/131793)
- fix（macos）：MCP 应用程序保留在仪表板内 [#132096](https://github.com/openclaw/openclaw/pull/132096)

</details>

</Accordion>

<Accordion id="building-plugins-and-integrations" title="构建插件和集成">

开发人员 [ 构建网关客户端 ](/gateway/protocol) 或嵌入 OpenClaw 现在具有类型化协议模式、运行时验证、身份验证、重新连接、就绪、超时和浏览器或 Node 入口点指南。网关协议和参考客户端准备为日历版本的 npm 包，并在发布系列发布时即可安装。

[插件作者](/plugins/building-plugins)还获得了针对请求者感知挂钩、通道设置、CLI后端、有界提供者流、只读秘密引用和浏览器会议适配器的集中合约。挂钩策略仍然位于通道准入、沙箱、批准、仅限所有者工具和其他主机策略之下，并且 Codex 挂钩中继的超时清理适用于 POSIX 主机而不是 Windows。

合同清理删除了已停用的 7 月和 8 月 SDK 路径，并将 `deactivate` 别名替换为 `gateway_stop`，而 beta.5 会话存储桥在 2026 年 10 月 12 日之前仍然可用。使用 v2026.7.2 测试问题、工作人员或会话目录形状的客户端需要移至重命名和扁平化的合同。自定义 `agents.defaults.cliBackends` 命令、参数、环境、别名和解析器现在属于后端插件，其可执行文件可供 OpenClaw 服务使用。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将嵌入式运行启动阶段发布到诊断 [#107984](https://github.com/openclaw/openclaw/pull/107984)
- 向插件工具挂钩暴露请求者身份 [#111190](https://github.com/openclaw/openclaw/pull/111190)
- 通过插件提供商[#111337](https://github.com/openclaw/openclaw/pull/111337)将会话讨论添加到Control UI
- 添加通道拥有的设置合约 [#112176](https://github.com/openclaw/openclaw/pull/112176)
- 将 CLI 后端适配器从配置移动到插件 [#112539](https://github.com/openclaw/openclaw/pull/112539)
- 添加事实优先的媒体 API，同时保留传统兼容性 [#113355](https://github.com/openclaw/openclaw/pull/113355)
- 添加新的免工具模型完成 [#114343](https://github.com/openclaw/openclaw/pull/114343)
- Retire Slack 用于键入演示的内联回复指令 [#114738](https://github.com/openclaw/openclaw/pull/114738)
- 加速Codex原生hook启动 [#115078](https://github.com/openclaw/openclaw/pull/115078)
- Retire 8 月插件 SDK 兼容性路径 [#124416](https://github.com/openclaw/openclaw/pull/124416)
- 为 CLI 后端添加插件拥有的 JSONL 解析 [#95386](https://github.com/openclaw/openclaw/pull/95386)
- 保持附加Swift协议字段源兼容[#103493](https://github.com/openclaw/openclaw/pull/103493)
- 添加共享插件 SDK HTML 转义助手 [#105975](https://github.com/openclaw/openclaw/pull/105975)
- 添加一个规范插件配置合并助手[#106919](https://github.com/openclaw/openclaw/pull/106919)
- 提取共享会议机器人运行时和适配器 SDK [#109755](https://github.com/openclaw/openclaw/pull/109755)
- 为扩展添加可靠的会话空闲事件 [#110174](https://github.com/openclaw/openclaw/pull/110174)
- 在替换中添加有界转录光标 [#110374](https://github.com/openclaw/openclaw/pull/110374)
- 整合通道功能和附件提示 [#110985](https://github.com/openclaw/openclaw/pull/110985)
- 在公共包发布之前清理网关协议合约 [#111041](https://github.com/openclaw/openclaw/pull/111041)
- 退出全局插件 SDK 提供商出版物 [#111426](https://github.com/openclaw/openclaw/pull/111426)
- 删除过期插件 SDK 兼容表面 [#111451](https://github.com/openclaw/openclaw/pull/111451)
- 发布网关协议包为npm [#111664](https://github.com/openclaw/openclaw/pull/111664)
- 为 npm 发布准备网关客户端 [#111707](https://github.com/openclaw/openclaw/pull/111707)
- 将规范入站消息身份公开给调度前挂钩 [#112359](https://github.com/openclaw/openclaw/pull/112359)
- 共享归因于 Markdown 跨本机文本通道的渲染 [#112907](https://github.com/openclaw/openclaw/pull/112907)
- 为每个消费者标准化一次入站回复文本 [#113179](https://github.com/openclaw/openclaw/pull/113179)
- 为通道 DM 策略设置添加共享插件 SDK 合约 [#113537](https://github.com/openclaw/openclaw/pull/113537)
- 将工具取消转发到插件挂钩 [#115817](https://github.com/openclaw/openclaw/pull/115817)
- 将 GitHub Copilot OAuth 所有权移至其提供商插件 [#118063](https://github.com/openclaw/openclaw/pull/118063)
- 在网关终端中启动新的 CLI-agent 会话 [#121020](https://github.com/openclaw/openclaw/pull/121020)
- Retire 已弃用的插件 SDK 导入并停用钩子别名 [#121845](https://github.com/openclaw/openclaw/pull/121845)
- 添加仅提供商的视频输入合同 [#121887](https://github.com/openclaw/openclaw/pull/121887)
- 添加规范计算机使用提供程序 SDK [#123509](https://github.com/openclaw/openclaw/pull/123509)
- 添加共享插件SDK流和SecretRef实用程序[#124835](https://github.com/openclaw/openclaw/pull/124835)
- 重复使用共享缓存 WhatsApp 重复数据删除 [#104962](https://github.com/openclaw/openclaw/pull/104962)
- 弃用 Discord 中止信号助手而不破坏导入 [#109166](https://github.com/openclaw/openclaw/pull/109166)
- 统一键入步骤的计划更新回调 [#109660](https://github.com/openclaw/openclaw/pull/109660)
- 删除旧媒体占位符解析 [#111891](https://github.com/openclaw/openclaw/pull/111891)
- 共享通道探测时序和错误处理 [#113540](https://github.com/openclaw/openclaw/pull/113540)
- 添加用于消息审批目标的共享插件 SDK 解析器 [#113568](https://github.com/openclaw/openclaw/pull/113568)
- 删除被取代的sessions.observer.ask网关方法[#113791](https://github.com/openclaw/openclaw/pull/113791)
- 统一实时提供商模型投影 [#113903](https://github.com/openclaw/openclaw/pull/113903)
- 添加标准原始事件入口配置文件 [#117859](https://github.com/openclaw/openclaw/pull/117859)
- 共享插件迁移和秘密合约助手 [#120346](https://github.com/openclaw/openclaw/pull/120346)
- Move Chutes OAuth 刷新到提供商插件 [#120840](https://github.com/openclaw/openclaw/pull/120840)
- 删除未使用的网关 RPC 和客户端表面 [#121387](https://github.com/openclaw/openclaw/pull/121387)
- 停用旧版上下文引擎主机参数默认值 [#122434](https://github.com/openclaw/openclaw/pull/122434)
- Export 管理的 URL 从聚焦媒体 SDK [#125278](https://github.com/openclaw/openclaw/pull/125278) 的摄取

**错误修复**

- 恢复官方测试版插件升级和Repo E2E [#105287](https://github.com/openclaw/openclaw/pull/105287)
- 停止超时 Codex 挂钩继电器耗尽 Linux 内存 [#109446](https://github.com/openclaw/openclaw/pull/109446)
- Limit Codex 钩子中继到工具插件目标 [#109603](https://github.com/openclaw/openclaw/pull/109603)
- 注册后可调用插件下一轮注入 [#111131](https://github.com/openclaw/openclaw/pull/111131)
- 恢复已发布频道插件兼容性并保留并发安装记录 [#113101](https://github.com/openclaw/openclaw/pull/113101)
- fix（网关）：隔离SDK事件流并保留重新连接所有权（#116904）[b611914](https://github.com/openclaw/openclaw/commit/b611914)
- fix（plugin-sdk）：保留已发送的调用者合约 [e1199b1](https://github.com/openclaw/openclaw/commit/e1199b1)
- 让插件工具使用支持的提供者凭据 [#103852](https://github.com/openclaw/openclaw/pull/103852)
- fix（cron）：中止取代的协调挂钩 [#104368](https://github.com/openclaw/openclaw/pull/104368)
- 拒绝本地工具模式引用中的非规范数组索引 [#105922](https://github.com/openclaw/openclaw/pull/105922)
- Prune 已弃用 SDK 导出并现代化 Zalo 交付 [#106010](https://github.com/openclaw/openclaw/pull/106010)
- 终止完成本机Codex挂钩继电器[#106899](https://github.com/openclaw/openclaw/pull/106899)
- Keepclaiming-hook超时注册拥有[#107996](https://github.com/openclaw/openclaw/pull/107996)
- 让回复挂钩声称普通用户转[#108353](https://github.com/openclaw/openclaw/pull/108353)
- 清理插件 SDK SSRF 帮助程序中格式错误的 URL 错误 [#109729](https://github.com/openclaw/openclaw/pull/109729)
- 防止准备好的通道转向生命周期泄漏 [#110981](https://github.com/openclaw/openclaw/pull/110981)
- 使 ACP 帮助和标准输入 EOF 干净地退出 [#111091](https://github.com/openclaw/openclaw/pull/111091)
- fix（会话）：拒绝更改的可见消息游标[#111264](https://github.com/openclaw/openclaw/pull/111264)
- 将通道设置标志移至插件清单中 [#112239](https://github.com/openclaw/openclaw/pull/112239)
- 保留插件拥有的通道配置升级 [#112293](https://github.com/openclaw/openclaw/pull/112293)
- 更安全的清单驱动提供者注册 [#114381](https://github.com/openclaw/openclaw/pull/114381)
- 将 DeepInfra 嵌入迁移到支持的插件合约 [#114727](https://github.com/openclaw/openclaw/pull/114727)
- 恢复提供程序流兼容性导出 [#115757](https://github.com/openclaw/openclaw/pull/115757)
- 显式声明上下文引擎主机参数 [#115872](https://github.com/openclaw/openclaw/pull/115872)
- 恢复 OpenAI 聊天响应挂钩生命周期 [#117056](https://github.com/openclaw/openclaw/pull/117056)
- 保留仅合同通道的设置和代理绑定 [#117106](https://github.com/openclaw/openclaw/pull/117106)
- 防止小数块限制导致文本传输停滞 [#117727](https://github.com/openclaw/openclaw/pull/117727)
- 当客户端握手失败时停止 ACP 服务器 [#117901](https://github.com/openclaw/openclaw/pull/117901)
- 整合插件帮助程序并修复语音通话和保管库行为 [#118509](https://github.com/openclaw/openclaw/pull/118509)
- 当旧版挂钩注册无法接收类型化事件时发出警告 [#118601](https://github.com/openclaw/openclaw/pull/118601)
- 报告格式错误的插件架构引用而不导致崩溃 [#120254](https://github.com/openclaw/openclaw/pull/120254)
- Keep OpenAI 请求超时内的响应挂钩 [#121163](https://github.com/openclaw/openclaw/pull/121163)
- 使外部插件SDK入口点类型兼容[#121512](https://github.com/openclaw/openclaw/pull/121512)
- fix：防止提示模板中的 $ 模式注入和批准替换 [#123015](https://github.com/openclaw/openclaw/pull/123015)
- fix（插件）：恢复出厂渠道兼容性 [#126003](https://github.com/openclaw/openclaw/pull/126003)
- fix（sessions）：在禁用探针保留时保留模型运行会话 [#128023](https://github.com/openclaw/openclaw/pull/128023)
- fix（代理）：将具有死 pid 的本机钩子中继记录视为不存在 [#128112](https://github.com/openclaw/openclaw/pull/128112)
- fix（plugin-sdk）： 读取 readBooleanParam [#131350](https://github.com/openclaw/openclaw/pull/131350) 中的 snake_case 键
- fix（http）：在关闭上传之前提供正文拒绝响应 [#131724](https://github.com/openclaw/openclaw/pull/131724)
- 为工具密集型运行添加 Codex 循环继电器选择退出 [#97224](https://github.com/openclaw/openclaw/pull/97224)
- 完整插件会话目录合约 [dfa580e](https://github.com/openclaw/openclaw/commit/dfa580e)
- keep 插件 SDK 期望声明独立 [feff4c7](https://github.com/openclaw/openclaw/commit/feff4c7)
- 解析大型架构数组中的有效本地引用 [#102195](https://github.com/openclaw/openclaw/pull/102195)
- Honor 显式空文档提取器范围 [#103731](https://github.com/openclaw/openclaw/pull/103731)
- fix（频道）：遵守空目录文档前缀[#103794](https://github.com/openclaw/openclaw/pull/103794)
- fix（ai）：拒绝非有限工具模式编号 [#104470](https://github.com/openclaw/openclaw/pull/104470)
- Preserve 已弃用的插件 SDK 错误分类导出 [#104546](https://github.com/openclaw/openclaw/pull/104546)
- 启动目录消失后让插件创作完成 [#106425](https://github.com/openclaw/openclaw/pull/106425)
- 在扩展命令输出中保留 Unicode 文本 [#108365](https://github.com/openclaw/openclaw/pull/108365)
- Let 插件运行时完成请求推理 [#108759](https://github.com/openclaw/openclaw/pull/108759)
- 共享通道重试助手并删除冗余状态探针 [#108903](https://github.com/openclaw/openclaw/pull/108903)
- 验证受约束的插件配置架构 [#109569](https://github.com/openclaw/openclaw/pull/109569)
- 在插件构建错误中显示格式错误的包路径 [#109916](https://github.com/openclaw/openclaw/pull/109916)
- Harden通道转弯生命周期边界 [#110406](https://github.com/openclaw/openclaw/pull/110406)
- 防止本机挂钩接力截止时间竞赛失败 CLI [#111413](https://github.com/openclaw/openclaw/pull/111413)
- 在标准化 SDK 事件 ID [#113349](https://github.com/openclaw/openclaw/pull/113349) 中保留零值
- 每个挂钩对解析入站声明会话身份一次 [#115491](https://github.com/openclaw/openclaw/pull/115491)
- Ship TypeScript 记录插件 SDK 导入的声明 [#116345](https://github.com/openclaw/openclaw/pull/116345)
- 跨核心和 Control UI 统一 JSON 架构验证 [#116622](https://github.com/openclaw/openclaw/pull/116622)
- 在 Discord 和 Slack 之间共享本机命令合并 [#120972](https://github.com/openclaw/openclaw/pull/120972)
- 保留入站回复垫片直到下一个 SDK 主要 [#121922](https://github.com/openclaw/openclaw/pull/121922)
- 在合并强制助手时忽略格式错误的新会话草稿 [#122020](https://github.com/openclaw/openclaw/pull/122020)
- 报告 ClickClack 媒体准确支持 [#126168](https://github.com/openclaw/openclaw/pull/126168)
- 整合媒体和流程运行时助手 [#126490](https://github.com/openclaw/openclaw/pull/126490)
- fix（自动回复）：将 chunkByNewline 中的尾随空白行限制为块限制 [#127253](https://github.com/openclaw/openclaw/pull/127253)
- fix（协议）：使聊天历史记录光标类型可消耗[#128018](https://github.com/openclaw/openclaw/pull/128018)
- fix（mcp）：从旧邮件中检索附件 [#131702](https://github.com/openclaw/openclaw/pull/131702)
- fix（网关）：接受可为空的插件审批元数据 [#133112](https://github.com/openclaw/openclaw/pull/133112)

**文档**

- 更正 beta 插件 SDK 会话存储兼容性合约 [#105341](https://github.com/openclaw/openclaw/pull/105341)
- 添加网关客户端和嵌入式应用程序的指南 [#111726](https://github.com/openclaw/openclaw/pull/111726)
- 在翻译文档中保留文字名称 [6beb726](https://github.com/openclaw/openclaw/commit/6beb726)
- 在参考文档中保留准确的插件表面标识符 [ce07836](https://github.com/openclaw/openclaw/commit/ce07836)
- 私有化 Mattermost 和 Microsoft Teams 仅测试导出 [#107924](https://github.com/openclaw/openclaw/pull/107924)
- 发布已弃用插件 SDK 路径的删除窗口 [#108035](https://github.com/openclaw/openclaw/pull/108035)
- 公告插件 SDK 子路径删除和降级窗口 [#108415](https://github.com/openclaw/openclaw/pull/108415)
- 更新保留插件SDK外观的迁移指南[#111535](https://github.com/openclaw/openclaw/pull/111535)
- Link 插件设置弃用至迁移指南 [#112692](https://github.com/openclaw/openclaw/pull/112692)
- 修复 ACPX 设置指南中的 Copilot CLI 链接 [#114057](https://github.com/openclaw/openclaw/pull/114057)
- 澄清配对请求挂钩仅用于观察 [#116055](https://github.com/openclaw/openclaw/pull/116055)
- 澄清哪个插件拥有入站消息声明 [#116082](https://github.com/openclaw/openclaw/pull/116082)
- 记录插件关闭耗尽截止时间 [#118099](https://github.com/openclaw/openclaw/pull/118099)
- docs（插件）：注意工厂工具执行签名[#120097](https://github.com/openclaw/openclaw/pull/120097)
- 澄清何时安装Codex回路检测继电器[#124918](https://github.com/openclaw/openclaw/pull/124918)
- [AI- Assist] docs（copilot）：描述转录日志，而不是删除的双写镜像 [#125599](https://github.com/openclaw/openclaw/pull/125599)
- 文档插件根 CLI 命令与聊天命令分开 [#126621](https://github.com/openclaw/openclaw/pull/126621)
- docs（hooks）：澄清命令记录器存储[#128478](https://github.com/openclaw/openclaw/pull/128478)
- docs（插件）：CLI后端示例安装后无法编译[#129646](https://github.com/openclaw/openclaw/pull/129646)
- docs（hooks）：阐明合约的设置和执行 [#130734](https://github.com/openclaw/openclaw/pull/130734)
- docs（插件）：阐明已安装的入口点源回退 [#131640](https://github.com/openclaw/openclaw/pull/131640)
- docs（协议）：重建七月和八月的线路历史；添加延迟更改部分 [#133063](https://github.com/openclaw/openclaw/pull/133063)
- Clarify 仅钩子插件启动和运行时检查 [#77629](https://github.com/openclaw/openclaw/pull/77629)

**维护**

- Consolidate 同级提供商适配器 [#117822](https://github.com/openclaw/openclaw/pull/117822)

</details>

</Accordion>

<Accordion id="plugin-packages-and-host-compatibility" title="插件包和主机兼容性">

OpenClaw 现在可以从目录、档案或 Git 源安装供应商中立的 [Agent Plugins](/plugins/bundles)，加载其直接子技能和有效的 stdio、HTTP 或 SSE MCP 服务器，并为它们提供作用域捆绑和持久数据路径。 OpenClaw 扩展可以添加激活提示，而提供程序、通道、配置模式和运行时入口点则位于此可移植捆绑合同之外。无效的 MCP 条目将被跳过，而不会阻止有效的同级条目。

Cohere、Meta、BytePlus、ComfyUI、OpenCode、航行、Vydra、Volcengine、Mistral、NovitaAI、 Teams 会议和 Zoom 会议现在作为单独安装的 [ 官方软件包 ](/plugins/plugin-inventory) 提供。新设置会安装相关包并重新启动 OpenClaw，并且当外部工件可用时，现有启用的设置会重新定位。 OpenCode Go 仍处于捆绑状态，因为其外部占位符不可用。

插件加载现在可以处理特定的 npm 10 到 12 元数据和锁定行为、直接和对等 OpenClaw 依赖项、打包的主机运行时导入以及阻止成功安装激活的并发 Node ESM 情况。 Canvas 现在专注于 macOS 演示者和会话板 A2UI 路径，其独立工作区、评估和快照表面、本机推送和重置命令以及 iOS、Android 和 Linux 客户端已删除。仪表板和 A2UI 操作仍显式授予和沙箱化。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 向 Linux 桌面应用程序添加 Canvas 和 A2UI 支持 [#107633](https://github.com/openclaw/openclaw/pull/107633)
- 从键入的演示按钮启动托管小部件 [#108927](https://github.com/openclaw/openclaw/pull/108927)
- 在 Control UI 和 Discord 之间统一 show_widget [#108983](https://github.com/openclaw/openclaw/pull/108983)
- Give 仪表板小部件批准的网络和主机工具 [#111687](https://github.com/openclaw/openclaw/pull/111687)
- 将 Mistral 移动到官方外部提供商插件 [#116919](https://github.com/openclaw/openclaw/pull/116919)
- 将NovitaAI外部化为官方提供商插件[#117007](https://github.com/openclaw/openclaw/pull/117007)
- 将 OpenCode 移动到官方外部提供商插件 [#117035](https://github.com/openclaw/openclaw/pull/117035)
- 将OpenCode Go移动到官方外部插件目录[#117064](https://github.com/openclaw/openclaw/pull/117064)
- 重新设计浏览器扩展弹出窗口 [#118095](https://github.com/openclaw/openclaw/pull/118095)
- 支持代理插件捆绑包 [#120115](https://github.com/openclaw/openclaw/pull/120115)
- 将 OpenClaw 激活元数据添加到便携式代理插件 [#120214](https://github.com/openclaw/openclaw/pull/120214)
- 添加自动本地Chrome分机设置[#121586](https://github.com/openclaw/openclaw/pull/121586)
- 为托管 Codex 应用程序服务器 [#124137](https://github.com/openclaw/openclaw/pull/124137) 添加预检检查
- 将 A2UI 应用程序作为会话板小部件运行 [#125803](https://github.com/openclaw/openclaw/pull/125803)
- Refocus Canvas 作为 macOS 小部件演示者 [#126030](https://github.com/openclaw/openclaw/pull/126030)
- 添加托管人范围操作技能库 [#126186](https://github.com/openclaw/openclaw/pull/126186)
- feat（仪表板）：让小部件运行授予的操作并打开链接 [#127315](https://github.com/openclaw/openclaw/pull/127315)
- 添加官方Windows MXC沙箱插件[#97086](https://github.com/openclaw/openclaw/pull/97086)
- 替换 npm 收缩包装，以实现 npm 12 兼容性 [#114006](https://github.com/openclaw/openclaw/pull/114006)
- 将 Cohere 和 Meta 提供程序移出核心包 [#116662](https://github.com/openclaw/openclaw/pull/116662)
- 将Teams和Zoom会议移动到官方外部插件[#116682](https://github.com/openclaw/openclaw/pull/116682)
- 将DuckDuckGo搜索移至点播官方插件[#116740](https://github.com/openclaw/openclaw/pull/116740)
- 将 Voyage 嵌入移动到外部插件 [#116785](https://github.com/openclaw/openclaw/pull/116785)
- 将Vydra从核心包移动到官方外部插件[#116813](https://github.com/openclaw/openclaw/pull/116813)
- 将 Volcengine 移至官方外部提供程序包 [#116854](https://github.com/openclaw/openclaw/pull/116854)
- 将 BytePlus 移动到官方外部提供商插件 [#116866](https://github.com/openclaw/openclaw/pull/116866)
- refactor（插件）！：删除 OpenProse [#128494](https://github.com/openclaw/openclaw/pull/128494)
- 停用实验性工作区插件 [#110416](https://github.com/openclaw/openclaw/pull/110416)
- 将内联小部件托管移至核心 [#110475](https://github.com/openclaw/openclaw/pull/110475)
- 将ComfyUI外部化为官方提供商插件[#116888](https://github.com/openclaw/openclaw/pull/116888)
- 从应用程序页面链接 Chrome Web Store 列表 [#118327](https://github.com/openclaw/openclaw/pull/118327)

**错误修复**

- Restore 插件元数据在 npm 12 [#109699](https://github.com/openclaw/openclaw/pull/109699) 上读取
- 恢复画布控件并强化已停用的工作区清理 [#110927](https://github.com/openclaw/openclaw/pull/110927)
- 恢复官方外部插件的主机运行时导入 [#112021](https://github.com/openclaw/openclaw/pull/112021)
- 恢复经过令牌验证的连接应用程序 Codex 运行 [#115075](https://github.com/openclaw/openclaw/pull/115075)
- fix（脚本）：构建堆忽略其 systemd 内存预算并采用完全默认的 [#123979](https://github.com/openclaw/openclaw/pull/123979)
- fix（openshell）：沙箱清理、工作区同步和网关设置失败 [#129641](https://github.com/openclaw/openclaw/pull/129641)
- Prevent Node 24 插件后备启动竞赛 [5839c2e](https://github.com/openclaw/openclaw/commit/5839c2e)
- E在启动工作之前评估 Codex 应用程序服务器启动截止日期 [6625ea9](https://github.com/openclaw/openclaw/commit/6625ea9)
- 恢复打包的Codex会话命令[#102803](https://github.com/openclaw/openclaw/pull/102803)
- 在源构建的映像中打包选定的外部插件 [#103629](https://github.com/openclaw/openclaw/pull/103629)
- 停止安静 Codex ACP 租赁创建空 stderr 日志 [#106799](https://github.com/openclaw/openclaw/pull/106799)
- 允许 OCM 具有工作区依赖项的本地构建 [#110426](https://github.com/openclaw/openclaw/pull/110426)
- 当环境值为空时保留 MXC Windows 路径回退 [#111077](https://github.com/openclaw/openclaw/pull/111077)
- 防止打包的 macOS 设置崩溃 [#111300](https://github.com/openclaw/openclaw/pull/111300)
- 给予 Codex 连接应用程序发现更多启动时间 [#112418](https://github.com/openclaw/openclaw/pull/112418)
- 在本机身份验证上保持用户主目录 Codex 应用程序服务器 [#114397](https://github.com/openclaw/openclaw/pull/114397)
- 荣誉用户主页 Codex 设置不启用监管 [#114413](https://github.com/openclaw/openclaw/pull/114413)
- 从 Node ESM 恢复插件加载需要比赛 [#114618](https://github.com/openclaw/openclaw/pull/114618)
- 停止打包 macOS 设置崩溃 [#114648](https://github.com/openclaw/openclaw/pull/114648)
- 在服务会话中启用已配置的 Codex 应用程序 [#115433](https://github.com/openclaw/openclaw/pull/115433)
- Stop 与命名不可用工具的指导不同 [#115919](https://github.com/openclaw/openclaw/pull/115919)
- 识别 Codex 的 API 策划的插件市场名称 [#115955](https://github.com/openclaw/openclaw/pull/115955)
- 接受具体化技能目录作为沙箱工作目录 [#116414](https://github.com/openclaw/openclaw/pull/116414)
- 防止画布刷新风暴和陈旧更新计时器[#117173](https://github.com/openclaw/openclaw/pull/117173)
- fix（ui）：绑定停滞的小部件内容在沙箱主机 [#117363](https://github.com/openclaw/openclaw/pull/117363) 中获取
- 恢复托管插件的主机运行时链接 [#117408](https://github.com/openclaw/openclaw/pull/117408)
- 根据拥有清单生成官方渠道目录 [#118097](https://github.com/openclaw/openclaw/pull/118097)
- 修复了预发行版本 [#118103](https://github.com/openclaw/openclaw/pull/118103) 的 CUA 包装和 Slack 回退限制
- 刷新当前工具的捆绑渠道技能和更安全的工作流程 [#119020](https://github.com/openclaw/openclaw/pull/119020)
- 对齐Fish Audio语音插件目录[#120084](https://github.com/openclaw/openclaw/pull/120084)
- 保留 OpenCode Go 作为捆绑提供商提供 [#120985](https://github.com/openclaw/openclaw/pull/120985)
- 执行打包的`.mjs` CLI回退[#121963](https://github.com/openclaw/openclaw/pull/121963)
- 恢复 npm-可安装源工作程序包 [#122430](https://github.com/openclaw/openclaw/pull/122430)
- 解决捆绑插件新导出的媒体核心路径[#122523](https://github.com/openclaw/openclaw/pull/122523)
- 首次连接时唤醒本地 Chrome 扩展继电器 [#122537](https://github.com/openclaw/openclaw/pull/122537)
- 恢复失败的捆绑插件视图 [#122823](https://github.com/openclaw/openclaw/pull/122823)
- 避免无会话运行的 Codex 转录警告 [#122831](https://github.com/openclaw/openclaw/pull/122831)
- 保持打包的 Zalo 设置向导可加载 [#122902](https://github.com/openclaw/openclaw/pull/122902)
- fix（仪表板）：通过主机打开小部件链接而不是沙箱弹出窗口 [#128125](https://github.com/openclaw/openclaw/pull/128125)
- fix（启动）：保留预加载的解析器挂钩[#128663](https://github.com/openclaw/openclaw/pull/128663)
- fix（sessions）：规范包资源加载 [#129098](https://github.com/openclaw/openclaw/pull/129098)
- fix（技能）：安全加载受信任的Bun和Nix包硬链接[#129662](https://github.com/openclaw/openclaw/pull/129662)
- chore（deps）：刷新 7 天冷却的提供程序和本机工具 [#130653](https://github.com/openclaw/openclaw/pull/130653)
- fix（codex）：将托管运行时更新为 0.150.1 [#130685](https://github.com/openclaw/openclaw/pull/130685)
- 捆绑打包插件的私有SSRF运行时[#96994](https://github.com/openclaw/openclaw/pull/96994)
- 以 npm 包裹运送 Crabbox 租赁助手 [28954c8](https://github.com/openclaw/openclaw/commit/28954c8)
- Stop Codex 截止时间后的启动阶段 [c953d8e](https://github.com/openclaw/openclaw/commit/c953d8e)
- 将 Microsoft Teams 运行时入口点构建为本机 CommonJS [#102366](https://github.com/openclaw/openclaw/pull/102366)
- 保持 Codex 应用库存诊断 UTF-16 安全 [#102414](https://github.com/openclaw/openclaw/pull/102414)
- 保留AI包环境-密钥加载浏览器-捆绑包安全[#102947](https://github.com/openclaw/openclaw/pull/102947)
- 在 Codex 诊断边界中保留 Unicode [#103740](https://github.com/openclaw/openclaw/pull/103740)
- 恢复在 Podman [#103814](https://github.com/openclaw/openclaw/pull/103814) 上构建的选定插件映像
- 防止过时插件因 Slack 启动崩溃而构建 [#104831](https://github.com/openclaw/openclaw/pull/104831)
- H荣誉捆绑命令调用策略 [#105013](https://github.com/openclaw/openclaw/pull/105013)
- fix（插件）：转发端口捆绑 SDK 回退强化 [#107131](https://github.com/openclaw/openclaw/pull/107131)
- 强制执行多字节 URI 的 OC 路径限制 [#108576](https://github.com/openclaw/openclaw/pull/108576)
- Bound Docker 镜像构建期间签名密钥下载 [#108894](https://github.com/openclaw/openclaw/pull/108894)
- Fix Codex 命令会话解析和预发布检查 [#113820](https://github.com/openclaw/openclaw/pull/113820)
- 通过JSON结构比较插件元数据[#117486](https://github.com/openclaw/openclaw/pull/117486)
- 忽略格式错误的插件构建版本元数据 [#117639](https://github.com/openclaw/openclaw/pull/117639)
- Link 插件，将 OpenClaw 声明为直接依赖项 [#117738](https://github.com/openclaw/openclaw/pull/117738)
- fix（diffs）：恢复查看者路由上的 GET/HEAD 内容长度奇偶校验 [#120280](https://github.com/openclaw/openclaw/pull/120280)
- fix（diffs-language-pack）：在资产 HEAD 请求 [#120282](https://github.com/openclaw/openclaw/pull/120282) 上提供字节精确的内容长度
- 报告 OS- 不兼容的始终在线技能不可用 [#123731](https://github.com/openclaw/openclaw/pull/123731)
- 将打包的外部插件条目保留在其运行时根目录中 [#125173](https://github.com/openclaw/openclaw/pull/125173)
- fix：打包的 Crabbox 命令在没有开发依赖的情况下运行 [#125419](https://github.com/openclaw/openclaw/pull/125419)
- Protect 插件覆盖在不可变部署中 [#125902](https://github.com/openclaw/openclaw/pull/125902)
- fix（oc-path）：引用位置 JSONC 键 [#130499](https://github.com/openclaw/openclaw/pull/130499)
- fix（插件）：源依赖修剪后本机导入失败 [#131615](https://github.com/openclaw/openclaw/pull/131615)
- fix（插件）：保持开发在签出插件[#132201](https://github.com/openclaw/openclaw/pull/132201)上运行
- fix（插件）：在构建的运行时上保留已编译的插件别名[#132545](https://github.com/openclaw/openclaw/pull/132545)
- 在 Linux 上启用模型使用与 CodexBar [#87986](https://github.com/openclaw/openclaw/pull/87986)

**文档**

- 将 Codex 应用程序发现文档更新为 app/installed [#115867](https://github.com/openclaw/openclaw/pull/115867)
- docs（mxc）：隔离测试设置和清理 [#118945](https://github.com/openclaw/openclaw/pull/118945)
- 将代理插件添加到插件页面发现提示 [#120323](https://github.com/openclaw/openclaw/pull/120323)

</details>

</Accordion>

</AccordionGroup>
