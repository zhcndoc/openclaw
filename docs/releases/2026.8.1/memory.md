---
title: "v2026.8.1：内存"
description: "符合条件的个人爪可以从该特工的其他私人对话中回忆起相关上下文，并通过可见的工作流程来搜索、检查、导入和删除内存。"
---

[Memory](/concepts/memory) 现在允许符合条件的个人 Claw 从该代理的其他私人对话中回忆相关上下文，包括重置之前的重要内容，而可见的工作流程可让您搜索索引源、检查内存的工作方式、导入支持的历史记录以及删除可归因的派生内存。召回保留在同一代理的私人对话中，并遵守明确的隔离和访问策略。

内置内存拥有核心搜索和调用路径，并支持从 QMD 进行的 Doctor 迁移。 LanceDB、Memory Wiki、外部嵌入服务、`MEMORY.md` 和 `USER.md` 仍然具有不同的作用，并且忘记派生内存不会删除 OpenClaw 之外的原始对话或副本。

<AccordionGroup>

<Accordion id="upgrading-to-built-in-memory" title="升级到内置内存">

[内置Memory](/concepts/memory-builtin)现在拥有核心搜索和召回路径。如果您使用 [QMD](/concepts/memory-builtin#migrating-from-qmd)，请运行 `openclaw doctor --fix` 以删除已停用的 QMD 设置，继续支持的额外路径和您显式启用的任何会话索引，保留代理数据库中已有的兼容行，并从规范的 Markdown 重建索引。

迁移将支持的数据传送到不同的核心，因此 QMD-only 重新排序、查询扩展和跨代理转录本搜索已停用。格式错误的结构、不兼容的向量维度以及没有安全所有者的数据仍会停止修复。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 停用QMD并专门使用内置内存[#120936](https://github.com/openclaw/openclaw/pull/120936)
- 添加针对缺少本地嵌入设置的预切换检查 [#123575](https://github.com/openclaw/openclaw/pull/123575)

**错误修复**

- 从旧内存核心索引冲突中恢复网关启动 [#108652](https://github.com/openclaw/openclaw/pull/108652)
- 防止二次内存核心迁移 [#109355](https://github.com/openclaw/openclaw/pull/109355)
- 协调 QMD 作家与 SQLite 租赁 [#109636](https://github.com/openclaw/openclaw/pull/109636)
- 从同一文件遗留索引冲突中恢复内存核心 [#110216](https://github.com/openclaw/openclaw/pull/110216)
- 恢复预出处代理数据库的升级 [#115144](https://github.com/openclaw/openclaw/pull/115144)
- 防止格式错误的活动内存时间戳阻止迁移 [#103116](https://github.com/openclaw/openclaw/pull/103116)
- 让内存核心升级保留兼容的规范缓存行 [#107243](https://github.com/openclaw/openclaw/pull/107243)
- 让 Doctor 修复遗留内存索引架构 [#115154](https://github.com/openclaw/openclaw/pull/115154)
- 使用不同的旧日志恢复内存核心升级 [#115855](https://github.com/openclaw/openclaw/pull/115855)
- 保持内存数据库与回滚兼容 [#116003](https://github.com/openclaw/openclaw/pull/116003)
- 在降级升级期间保持内存诊断可用 [#116074](https://github.com/openclaw/openclaw/pull/116074)
- fix（内存）：从 QMD [#130016](https://github.com/openclaw/openclaw/pull/130016) 升级时保留会话调用
- 修复旧版内存搜索设置而不丢失调整 [#68685](https://github.com/openclaw/openclaw/pull/68685)
- 防止过大的工作区文件导致医生修复崩溃 [#101448](https://github.com/openclaw/openclaw/pull/101448)
- 删除空 sidecar 的错误旧内存警告 [#114661](https://github.com/openclaw/openclaw/pull/114661)
- fix（内存）：显示规范会话迁移恢复而不是提供程序错误 [#119061](https://github.com/openclaw/openclaw/pull/119061)

**文档**

- 文档从QMD内存自动迁移[#121911](https://github.com/openclaw/openclaw/pull/121911)

</details>

</Accordion>

<Accordion id="finding-and-recalling-past-context" title="寻找并回忆过去的背景">

在符合条件的个人设置中，默认情况下，您的 Claw 可以从同一座席的其他私人对话中调出相关上下文，包括您重置会话之前的重要内容。回忆仍然仅限于该特工的私人谈话；组、通道、共享别名、其他代理、已删除的历史记录和策略阻止的源都不会被排除在外，并且显式的直接消息隔离设置仍然会获胜。

[内置搜索](/concepts/memory-search)现在可以理解文件名、完整和部分Unicode路径以及配置的额外路径，扩大精简严格匹配，并在可选嵌入提供程序无法启动时保持关键字结果可用。在重建内存或会话内容时，每次搜索都会保留在一个稳定的已发布索引上，后续搜索仅在发布后才使用其替换索引，而不是等待日常维护或混合生成。搜索保留在配置的根和代理边界内，而所需的嵌入提供程序则无法关闭。

没有配置重置策略的会话现在保持开放状态，并且持久的重置或压缩标记会解释可见的历史记录更改。 SQLite- 支持网络聊天，macOS、iOS 和 Android 可以倒回用户消息，[ 分叉对话 ](/concepts/session)，并在保留的分支之间切换。倒回会更改记录分支，但不会撤消文件、发送的消息或其他工具副作用。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 让私人代理记住私人对话 [#100140](https://github.com/openclaw/openclaw/pull/100140)
- 添加每个代理内存 Wiki 库隔离 [#103349](https://github.com/openclaw/openclaw/pull/103349)
- 启动按需配置的本地嵌入服务 [#104306](https://github.com/openclaw/openclaw/pull/104306)
- 通过文件名和路径查找内存 [#104449](https://github.com/openclaw/openclaw/pull/104449)
- 保留中断的转弯上下文并重新打开搜索命中历史记录 [#105831](https://github.com/openclaw/openclaw/pull/105831)
- 个人安装的默认交叉对话召回 [#110597](https://github.com/openclaw/openclaw/pull/110597)
- 从任何用户消息中倒回或分叉聊天 [#110660](https://github.com/openclaw/openclaw/pull/110660)
- 在聊天中保留的转录本分支之间切换 [#110857](https://github.com/openclaw/openclaw/pull/110857)
- 向本机聊天气泡添加倒回和分叉操作 [#110886](https://github.com/openclaw/openclaw/pull/110886)
- 默认保持会话连续 [#111140](https://github.com/openclaw/openclaw/pull/111140)
- 添加具有安全离线队列的本机会话分支切换 [#112056](https://github.com/openclaw/openclaw/pull/112056)
- 添加 Android 聊天快退、分叉和分支切换 [#112284](https://github.com/openclaw/openclaw/pull/112284)
- 提高会话记忆回忆 [#121196](https://github.com/openclaw/openclaw/pull/121196)
- 将全局模式添加到额外的内存路径 [#121209](https://github.com/openclaw/openclaw/pull/121209)
- 默认启用多种内置内存结果 [#121224](https://github.com/openclaw/openclaw/pull/121224)
- 在聊天记录中显示持久重置和压缩边界 [#122222](https://github.com/openclaw/openclaw/pull/122222)
- 支持仅嵌入托管的 llama.cpp 服务器 [#125383](https://github.com/openclaw/openclaw/pull/125383)
- fix（llama）：支持仅嵌入托管设置 [#130883](https://github.com/openclaw/openclaw/pull/130883)
- 为 Webhook 挂钩添加选择加入持久会话 [#75918](https://github.com/openclaw/openclaw/pull/75918)
- 显示 llama.cpp 加速和运行时诊断 [#104310](https://github.com/openclaw/openclaw/pull/104310)
- 为Active Memory添加召回特定快速模式[#108043](https://github.com/openclaw/openclaw/pull/108043)
- 在过滤内存调用期间避免重复嵌入 [#125735](https://github.com/openclaw/openclaw/pull/125735)
- 跳过不变 QMD 会话导出重建 [#77158](https://github.com/openclaw/openclaw/pull/77158)
- 在启动前准备一次主动内存调用上下文 [061ccb1](https://github.com/openclaw/openclaw/commit/061ccb1)

**错误修复**

- Harden嵌入批量输出和错误处理[#103472](https://github.com/openclaw/openclaw/pull/103472)
- 通过代理隔离LanceDB内存[#103799](https://github.com/openclaw/openclaw/pull/103799)
- 使用 SQLite 会话恢复主动内存调用 [#105255](https://github.com/openclaw/openclaw/pull/105255)
- 通过订阅验证的路由主动内存调用 Claude CLI [#106840](https://github.com/openclaw/openclaw/pull/106840)
- Block 跨代理 Memory Wiki 从沙盒子代理中读取 [#111463](https://github.com/openclaw/openclaw/pull/111463)
- fix（内存核心）：在脏同步期间保持内存搜索可用 [#112214](https://github.com/openclaw/openclaw/pull/112214)
- 防止广泛内存搜索冻结网关 [#113359](https://github.com/openclaw/openclaw/pull/113359)
- 防止重叠内存嵌入提供程序 [#113471](https://github.com/openclaw/openclaw/pull/113471)
- 恢复或分叉聊天时的提示图像 [#113945](https://github.com/openclaw/openclaw/pull/113945)
- 随着历史的增长，保持 Codex 转录镜像响应 [#115070](https://github.com/openclaw/openclaw/pull/115070)
- 当嵌入无法启动时回退到关键字内存搜索 [#115397](https://github.com/openclaw/openclaw/pull/115397)
- 每次运行重复使用一次活动内存调用 [#115627](https://github.com/openclaw/openclaw/pull/115627)
- 从 SQLite 索引活动内存，同时保留可搜索档案 [#117334](https://github.com/openclaw/openclaw/pull/117334)
- 在活动内存中恢复 CJK 调用意图 [#117419](https://github.com/openclaw/openclaw/pull/117419)
- 内存搜索结果可能过时时发出警告 [#117706](https://github.com/openclaw/openclaw/pull/117706)
- Keep Ollama 在其选定的主机上嵌入凭据 [#118753](https://github.com/openclaw/openclaw/pull/118753)
- 隔离内存回退提供程序凭据 [#118759](https://github.com/openclaw/openclaw/pull/118759)
- 隔离 LanceDB 每个代理嵌入凭据 [#118767](https://github.com/openclaw/openclaw/pull/118767)
- 将私有根内存排除在共享聊天之外 [#119198](https://github.com/openclaw/openclaw/pull/119198)
- 会话重置后调用私人对话上下文 [#122051](https://github.com/openclaw/openclaw/pull/122051)
- 防止重置和内存搜索期间无提示上下文丢失 [#125534](https://github.com/openclaw/openclaw/pull/125534)
- Bound LanceDB 内存提示并重新加载嵌入凭据 [#125567](https://github.com/openclaw/openclaw/pull/125567)
- fix（内存）：将sqlite-vec KNN与事件循环[#128078](https://github.com/openclaw/openclaw/pull/128078)隔离
- fix：内存刷新耗尽后保留对话 [#132010](https://github.com/openclaw/openclaw/pull/132010)
- 恢复对话历史记录到Codex提示挂钩[#101752](https://github.com/openclaw/openclaw/pull/101752)
- Stream Gemini 嵌入批量输出以减少内存使用 [#102974](https://github.com/openclaw/openclaw/pull/102974)
- 保持内存批次故障核算准确 [#103117](https://github.com/openclaw/openclaw/pull/103117)
- 在 QMD 内存片段限制中保留 Unicode [#103996](https://github.com/openclaw/openclaw/pull/103996)
- 在隔离的 cron 运行中保留内存搜索设置 [#104196](https://github.com/openclaw/openclaw/pull/104196)
- 按运行时隔离本地嵌入服务 [#104741](https://github.com/openclaw/openclaw/pull/104741)
- 版本升级后保留Gemini内存搜索可用[#104759](https://github.com/openclaw/openclaw/pull/104759)
- fix（活动内存）：绑定超时断路器[#105316](https://github.com/openclaw/openclaw/pull/105316)
- 使LanceDB内存初始化跨进程安全 [#105896](https://github.com/openclaw/openclaw/pull/105896)
- 在较长的本机聊天历史记录中保留不同的运行 [#107965](https://github.com/openclaw/openclaw/pull/107965)
- 保持 Windows QMD 清理不会阻塞网关 [#109265](https://github.com/openclaw/openclaw/pull/109265)
- 通过代理隔离内存 SecretRef 故障 [#109977](https://github.com/openclaw/openclaw/pull/109977)
- Move Memory Wiki 将状态编译为插件拥有的 SQLite 存储 [#110167](https://github.com/openclaw/openclaw/pull/110167)
- 拒绝畸形嵌入批次 UTF-8 [#110502](https://github.com/openclaw/openclaw/pull/110502)
- 拒绝内存主机 JSON 响应中格式错误的 UTF-8 [#111279](https://github.com/openclaw/openclaw/pull/111279)
- Keep Gemini 在配置的超时内嵌入批量等待 [#111674](https://github.com/openclaw/openclaw/pull/111674)
- 在超时时间内保持OpenAI嵌入批量轮询[#111675](https://github.com/openclaw/openclaw/pull/111675)
- Stop 嵌入中断期间重复的内存自动调用停止 [#112927](https://github.com/openclaw/openclaw/pull/112927)
- 当文档 ID 过时时保留 QMD 内存命中 [#113515](https://github.com/openclaw/openclaw/pull/113515)
- 避免在空内存搜索后重建完整索引 [#114183](https://github.com/openclaw/openclaw/pull/114183)
- Stop 内存核心取消后立即重试 [#114300](https://github.com/openclaw/openclaw/pull/114300)
- 当命令输出有噪声时保留 QMD 内存命中 [#115023](https://github.com/openclaw/openclaw/pull/115023)
- 保持内存注释不被调用并搜索文本 [#115719](https://github.com/openclaw/openclaw/pull/115719)
- 安全地协调过时的内存全文索引 [#115775](https://github.com/openclaw/openclaw/pull/115775)
- fix（活动内存）：拒绝召回摘要中的助手闲聊（#84034）[#115803](https://github.com/openclaw/openclaw/pull/115803)
- 跨路径套管保留 Windows 内存会话所有权 [#115851](https://github.com/openclaw/openclaw/pull/115851)
- SQLite 失败后恢复排队内存核心同步工作 [#115923](https://github.com/openclaw/openclaw/pull/115923)
- 第一个通道开启前的温暖活动内存 [#115936](https://github.com/openclaw/openclaw/pull/115936)
- 拒绝格式错误和空的嵌入向量 [#117200](https://github.com/openclaw/openclaw/pull/117200)
- 在一个会话快照上保留目标内存索引 [#117247](https://github.com/openclaw/openclaw/pull/117247)
- 在旋转转录本上保持 CLI 压缩 [#117250](https://github.com/openclaw/openclaw/pull/117250)
- H荣誉LM Studio嵌入JIT和规范模型标识[#117320](https://github.com/openclaw/openclaw/pull/117320)
- 避免复位边界后冗余压缩 [#117400](https://github.com/openclaw/openclaw/pull/117400)
- 转录恢复后恢复记忆新鲜度 [#117548](https://github.com/openclaw/openclaw/pull/117548)
- 在升级过程中保持 OpenAI 内存嵌入缓存稳定 [#117557](https://github.com/openclaw/openclaw/pull/117557)
- 接受 Memory Wiki 的命令本地代理选择 [#117943](https://github.com/openclaw/openclaw/pull/117943)
- 在文件系统观察程序错误后保持 QMD 运行 [#118171](https://github.com/openclaw/openclaw/pull/118171)
- 荣誉内存核心中的特工名册 [#118310](https://github.com/openclaw/openclaw/pull/118310)
- Surface内存-wiki后端读取失败 [#118449](https://github.com/openclaw/openclaw/pull/118449)
- 将不相关的会话记录保留在语音呼叫快速上下文之外 [#118498](https://github.com/openclaw/openclaw/pull/118498)
- 在 CLI 搜索中荣誉配置的内存提供程序 [#119186](https://github.com/openclaw/openclaw/pull/119186)
- 恢复委托上下文引擎压缩会话身份 [#120047](https://github.com/openclaw/openclaw/pull/120047)
- 报告内存状态中持久化的向量索引状态 [#120048](https://github.com/openclaw/openclaw/pull/120048)
- fix（活动内存）：将召回错误保留在提示上下文之外 [#120658](https://github.com/openclaw/openclaw/pull/120658)
- 使会话协调远离内存搜索路径 [#120837](https://github.com/openclaw/openclaw/pull/120837)
- fix（内存）：将时间衰减应用于内存子目录中的日期文件 [#121103](https://github.com/openclaw/openclaw/pull/121103)
- 保留与项目相关的内存多样性 [#121608](https://github.com/openclaw/openclaw/pull/121608)
- 将多模式内存索引限制为额外路径 [#121627](https://github.com/openclaw/openclaw/pull/121627)
- 在启动时安全删除过时的内存核心会话行 [#121665](https://github.com/openclaw/openclaw/pull/121665)
- 恢复为计划轮次配置的上下文引擎 [#122457](https://github.com/openclaw/openclaw/pull/122457)
- fix（内存维基）：将默认保管库保留在配置的状态目录[#122591](https://github.com/openclaw/openclaw/pull/122591)中
- 在活动内存同步期间保留转录本更新 [#124024](https://github.com/openclaw/openclaw/pull/124024)
- 取消搜索后保持本地内存正常 [#124051](https://github.com/openclaw/openclaw/pull/124051)
- 返回结果之前停止取消的内存搜索 [#124118](https://github.com/openclaw/openclaw/pull/124118)
- 返回结果之前停止超时 LanceDB 调用 [#124143](https://github.com/openclaw/openclaw/pull/124143)
- 短文件读取后保留完整的启动内存 [#124597](https://github.com/openclaw/openclaw/pull/124597)
- 当源扫描失败时保留内存索引 [#125319](https://github.com/openclaw/openclaw/pull/125319)
- 组合记忆搜索忽略记忆语料库时发出警告 [#125500](https://github.com/openclaw/openclaw/pull/125500)
- 当上下文组装失败时保留对话历史记录 [#125714](https://github.com/openclaw/openclaw/pull/125714)
- 区分丢失的内存文件和空读取 [#125979](https://github.com/openclaw/openclaw/pull/125979)
- Codex 转录镜像在匹配的编辑规则中幸存下来 [#126245](https://github.com/openclaw/openclaw/pull/126245)
- 在记忆工具中保留部分结果和语料库结果 [#126530](https://github.com/openclaw/openclaw/pull/126530)
- 检测脱机内存源漂移状态 [#126535](https://github.com/openclaw/openclaw/pull/126535)
- 保持内存指导与配置的源一致 [#126552](https://github.com/openclaw/openclaw/pull/126552)
- 事件循环停止后强制内存嵌入截止时间 [#126667](https://github.com/openclaw/openclaw/pull/126667)
- Bound Memory Wiki 模型上下文 [#126779](https://github.com/openclaw/openclaw/pull/126779)
- fix：防止发布过时的转录本投影 [#126947](https://github.com/openclaw/openclaw/pull/126947)
- fix（tui）：重新连接到替换运行后恢复助手响应 [#128221](https://github.com/openclaw/openclaw/pull/128221)
- fix（嵌入）：拒绝来自兼容提供者的空向量 [#128480](https://github.com/openclaw/openclaw/pull/128480)
- fix（google）：支持稳定的Gemini嵌入2个请求合约[#128716](https://github.com/openclaw/openclaw/pull/128716)
- fix（llama-cpp）：保留托管本地嵌入批量容量 [#128721](https://github.com/openclaw/openclaw/pull/128721)
- fix（tui）：防止外部会话重置以清除活动聊天 [#128723](https://github.com/openclaw/openclaw/pull/128723)
- fix（google）：支持所有记录的 Gemini 嵌入尺寸 [#129038](https://github.com/openclaw/openclaw/pull/129038)
- 保留索引嵌入响应的文档顺序 [#129227](https://github.com/openclaw/openclaw/pull/129227)
- fix（tui）：防止过时的会话操作改变替换对话 [#129681](https://github.com/openclaw/openclaw/pull/129681)
- fix（内存）：当嵌入提供程序拒绝超大批次时恢复索引 [#129927](https://github.com/openclaw/openclaw/pull/129927)
- fix（android）：恢复仅附件消息的倒带和分叉 [#129951](https://github.com/openclaw/openclaw/pull/129951)
- fix（tui）：保留跨异步事件的运行和会话所有权 [#130147](https://github.com/openclaw/openclaw/pull/130147)
- fix（嵌入）：保留提供者端点查询参数 [#130211](https://github.com/openclaw/openclaw/pull/130211)
- fix（tui）：将替换会话与过时的异步结果隔离 [#130227](https://github.com/openclaw/openclaw/pull/130227)
- fix（内存）：停止错误Copilot索引不匹配警告[#130603](https://github.com/openclaw/openclaw/pull/130603)
- fix（内存）：内存文件夹替换后保持索引 [#130698](https://github.com/openclaw/openclaw/pull/130698)
- fix（google）：在嵌入批次中保留网关查询[#130768](https://github.com/openclaw/openclaw/pull/130768)
- fix（内存）：尊重混合大小写嵌入标头覆盖 [#130774](https://github.com/openclaw/openclaw/pull/130774)
- fix（doctor）：保留本地内存诊断[#130984](https://github.com/openclaw/openclaw/pull/130984)
- fix（内存）：将嵌入缓存与内置默认[#131121](https://github.com/openclaw/openclaw/pull/131121)绑定
- fix（活动内存）：恢复交互式调用并保留完成的结果 [#131302](https://github.com/openclaw/openclaw/pull/131302)
- fix（内存）：忽略FTS-仅索引[#131469](https://github.com/openclaw/openclaw/pull/131469)的向量债务
- fix（tui）： 历史刷新后保留重置确认 [#131557](https://github.com/openclaw/openclaw/pull/131557)
- fix（llama）：在设置过程中遵循配置的嵌入模型 [#132557](https://github.com/openclaw/openclaw/pull/132557)
- fix（内存）：将wiki语料库保留在直接代理范围[#133234](https://github.com/openclaw/openclaw/pull/133234)中
- fix（内存）：仅报告失败的索引刷新 [#133239](https://github.com/openclaw/openclaw/pull/133239)
- fix（内存）：遵守配置的主要搜索结果限制 [#133254](https://github.com/openclaw/openclaw/pull/133254)
- 当提供者拒绝维度时重试内存嵌入 [#69707](https://github.com/openclaw/openclaw/pull/69707)
- 保留仅向量多模态内存结果的相关性 [#92196](https://github.com/openclaw/openclaw/pull/92196)
- 恢复对未映射的实时转录本的同一代理访问 [#92261](https://github.com/openclaw/openclaw/pull/92261)
- 保留有用的仅关键字记忆结果，而不替换更强的匹配项 [#92524](https://github.com/openclaw/openclaw/pull/92524)
- 让缓慢的 QMD 内存搜索使用其配置的超时 [#95757](https://github.com/openclaw/openclaw/pull/95757)
- 保持重置和删除的会话可搜索，无需重新启动 [#96132](https://github.com/openclaw/openclaw/pull/96132)
- 将自定义 Ollama 内存索引绑定到正确的端点 [#97059](https://github.com/openclaw/openclaw/pull/97059)
- Homebrew Node 升级后保持本地语义内存工作 [#99318](https://github.com/openclaw/openclaw/pull/99318)
- 在允许的额外路径中正确处理丢失的文件 [2d06d46](https://github.com/openclaw/openclaw/commit/2d06d46)
- fix（github-copilot）：为嵌入模型发现添加超时（#102886）[ff15856](https://github.com/openclaw/openclaw/commit/ff15856)
- 在工作进程关闭期间拒绝排队的本地嵌入请求 [#102451](https://github.com/openclaw/openclaw/pull/102451)
- Keep 截断 QMD 错误有效 Unicode [#102547](https://github.com/openclaw/openclaw/pull/102547)
- Keep Active Memory 日志截断 Unicode 安全 [#102551](https://github.com/openclaw/openclaw/pull/102551)
- 保持活动内存搜索查询 UTF-16 安全 [#102621](https://github.com/openclaw/openclaw/pull/102621)
- 保持活动内存表情符号截断UTF-16安全[#102877](https://github.com/openclaw/openclaw/pull/102877)
- 在活动内存配置中接受最大思考 [#103614](https://github.com/openclaw/openclaw/pull/103614)
- 跳过空白内存搜索的提供程序设置 [#103728](https://github.com/openclaw/openclaw/pull/103728)
- Keep 内存主机编辑令牌提示 Unicode 安全 [#103813](https://github.com/openclaw/openclaw/pull/103813)
- 接受内存主机 JSON 响应中的前导零长度 [#105916](https://github.com/openclaw/openclaw/pull/105916)
- 在分段 QMD 输出中保留 Unicode 文本 [#107263](https://github.com/openclaw/openclaw/pull/107263)
- 将内存提供者 none 视为有意 FTS-only 模式 [#107778](https://github.com/openclaw/openclaw/pull/107778)
- Stop 在 10 秒后停止 Obsidian 帮助程序 [#109232](https://github.com/openclaw/openclaw/pull/109232)
- 在会话翻转期间保留思考和详细首选项 [#109788](https://github.com/openclaw/openclaw/pull/109788)
- Keep Voyage 嵌入批处理等待在超时内 [#111673](https://github.com/openclaw/openclaw/pull/111673)
- Stop Memory Wiki doctor 错误为键控代理 [#112541](https://github.com/openclaw/openclaw/pull/112541)
- 恢复非默认代理的全局会话搜索 [#113919](https://github.com/openclaw/openclaw/pull/113919)
- 完全禁用派生内存全文索引 [#115685](https://github.com/openclaw/openclaw/pull/115685)
- 拒绝格式错误的QMD内存搜索结果[#115705](https://github.com/openclaw/openclaw/pull/115705)
- Stop 内存从提供的幻像连续页面读取 [#115722](https://github.com/openclaw/openclaw/pull/115722)
- 干净地返回以进行空白内存搜索 [#116034](https://github.com/openclaw/openclaw/pull/116034)
- 客户端断开连接后停止嵌入工作 [#116146](https://github.com/openclaw/openclaw/pull/116146)
- 建议为缺失的 QMD 索引重新建立索引 [#116958](https://github.com/openclaw/openclaw/pull/116958)
- 在提供程序设置之前拒绝空嵌入请求 [#117615](https://github.com/openclaw/openclaw/pull/117615)
- 在受保护的召回可见性内保留内存 Wiki 搜索 [#118265](https://github.com/openclaw/openclaw/pull/118265)
- fix（内存）：将 LIKE- 后备关键字点击得分为 0 而不是 1 [#120603](https://github.com/openclaw/openclaw/pull/120603)
- fix（内存）：到达截止日期的 memory_search 报告损坏的嵌入提供程序 [#121073](https://github.com/openclaw/openclaw/pull/121073)
- 拒绝无效的额外内存路径并修剪测试外观 [#121696](https://github.com/openclaw/openclaw/pull/121696)
- 接受显式内存文件的 Windows 大小写 [#121976](https://github.com/openclaw/openclaw/pull/121976)
- 针对格式错误的查找输入返回明确的 wiki_get 错误 [#122549](https://github.com/openclaw/openclaw/pull/122549)
- 报告清除内存索引结果 [#123863](https://github.com/openclaw/openclaw/pull/123863)
- 报告如实索引SQLite会话[#124834](https://github.com/openclaw/openclaw/pull/124834)
- 通过可运行指导拒绝未知内存代理选择 [#126570](https://github.com/openclaw/openclaw/pull/126570)
- fix（sessions）：排除存档的轨迹工件 [#126912](https://github.com/openclaw/openclaw/pull/126912)
- fix（内存）：强制执行规范的 SecretRef 分辨率 [#127699](https://github.com/openclaw/openclaw/pull/127699)
- fix（内存维基）：忽略查询文本中的结构标记[#128105](https://github.com/openclaw/openclaw/pull/128105)
- fix（doctor）：抑制所有代理的跳过内存警告 [#128209](https://github.com/openclaw/openclaw/pull/128209)
- fix（内存）：搜索在会话追赶期间警告过时索引 [#128894](https://github.com/openclaw/openclaw/pull/128894)
- fix（lmstudio）：在 API 密钥轮换 [#129076](https://github.com/openclaw/openclaw/pull/129076) 中保留嵌入索引
- fix（openai）：在代理密钥轮换中保留嵌入索引 [#129177](https://github.com/openclaw/openclaw/pull/129177)
- fix（openai）：跨密钥轮换保留 Azure 嵌入索引 [#129516](https://github.com/openclaw/openclaw/pull/129516)
- fix（内存）：分区Mistral和DeepInfra嵌入缓存[#129669](https://github.com/openclaw/openclaw/pull/129669)
- fix（ollama）：保留命名空间嵌入查询指令 [#129706](https://github.com/openclaw/openclaw/pull/129706)
- fix（内存）：抑制 corpus=all 的 wiki 未注册警告（#129866）[#130088](https://github.com/openclaw/openclaw/pull/130088)
- fix（医生）：对齐内存提供商指导[#130756](https://github.com/openclaw/openclaw/pull/130756)
- fix（内存）：当提供程序 API 密钥使用 SecretRef [#131351](https://github.com/openclaw/openclaw/pull/131351) 时索引失败
- 修复有序 LanceDB 查询，并缩小输出列 [#133120](https://github.com/openclaw/openclaw/pull/133120)
- fix：禁用内存搜索时尊重嵌入维度 [#133158](https://github.com/openclaw/openclaw/pull/133158)

**文档**

- 解释重叠内存调用源 [#118299](https://github.com/openclaw/openclaw/pull/118299)

</details>

</Accordion>

<Accordion id="importing-memories-and-conversation-history" title="导入记忆和对话历史记录">

导入与 QMD-to 内置升级分开。您可以通过 Control UI、首次运行设置或询问 OpenClaw 将 [ 从 Codex、Claude Code 或 Hermes 中支持的内存 ](/install/migrating) 引入代理工作区，同时保留源，而不是清除凭证、设置、技能或任意提供程序文件。如果目标已包含冲突内容，则必须明确审查替换内容。

旧的对话遵循自己的预览优先路径。 CLI 显示在写入之前将暂存的内容，Control UI 报告有界批次进度，并且该导入所拥有的材料可以回滚并再次应用。大型历史记录使用有界或索引处理，Memory Wiki 通过支持的导入保留人类注释，而没有完整所有权跟踪的旧历史记录可能需要重新扫描。舞台材料仍然不会成为持久的记忆，直到梦想或明确的晋升选择它。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 从Control UI导入Codex和Claude Code内存[#106406](https://github.com/openclaw/openclaw/pull/106406)
- 在载入期间提供内存导入 [#108977](https://github.com/openclaw/openclaw/pull/108977)
- 将保留的会话记录回填到内存暂存 [#115162](https://github.com/openclaw/openclaw/pull/115162)
- 从 Control UI 中的过去会话回填内存 [#115266](https://github.com/openclaw/openclaw/pull/115266)
- 从 Ask OpenClaw [#115376](https://github.com/openclaw/openclaw/pull/115376) 导入本地代理记忆
- Lower Memory 核心启动内存使用 [#119372](https://github.com/openclaw/openclaw/pull/119372)

**错误修复**

- 修剪导入页面时保留内存 Wiki 注释 [#102294](https://github.com/openclaw/openclaw/pull/102294)
- Bound 大 SQLite 会话历史记录读取 [#108851](https://github.com/openclaw/openclaw/pull/108851)
- Harden内存迁移路径解析和文件复制 [#109314](https://github.com/openclaw/openclaw/pull/109314)
- 在临时源中断期间保留内存 Wiki 页面 [#111034](https://github.com/openclaw/openclaw/pull/111034)
- ChatGPT 导入回滚期间保留内存 Wiki 编辑 [#116517](https://github.com/openclaw/openclaw/pull/116517)
- 标记损坏时保留内存 Wiki 注释 [#117104](https://github.com/openclaw/openclaw/pull/117104)
- Protect Memory Wiki 注释和私人召回边界 [#118375](https://github.com/openclaw/openclaw/pull/118375)
- 启动后保持网关 RPC 响应 [#119710](https://github.com/openclaw/openclaw/pull/119710)
- 保持大量聊天历史记录不阻止启动 [#124994](https://github.com/openclaw/openclaw/pull/124994)
- 保持大量CLI-bound聊天历史响应[#126201](https://github.com/openclaw/openclaw/pull/126201)
- fix（代理）：重新打开会话之前等待延迟的转录本投影 [#130930](https://github.com/openclaw/openclaw/pull/130930)
- 防止内存 Wiki 源摄取在并发写入期间丢失内容 [#104209](https://github.com/openclaw/openclaw/pull/104209)
- Harden内存迁移计划选择和应用安全 [#109323](https://github.com/openclaw/openclaw/pull/109323)
- Redact Claude CLI Control UI 合并之前的历史记录 [#115597](https://github.com/openclaw/openclaw/pull/115597)
- 使内存会话回填完整且可逆 [#115926](https://github.com/openclaw/openclaw/pull/115926)
- 保留内存核心转录摄取检查点 [#117293](https://github.com/openclaw/openclaw/pull/117293)
- 防止重复 Claude CLI 重新加载后回复 [#125030](https://github.com/openclaw/openclaw/pull/125030)
- fix（内存维基）：在编译Vault [#126487](https://github.com/openclaw/openclaw/pull/126487)之前保留ChatGPT导入运行记录
- 在轮询期间停止重复的内存Wiki导入 [#91828](https://github.com/openclaw/openclaw/pull/91828)
- 使旧会话回填回滚重新适用 [#116004](https://github.com/openclaw/openclaw/pull/116004)
- fix（网关）：聊天记录显示claude-cli会话中注入的技能说明[#130269](https://github.com/openclaw/openclaw/pull/130269)
- fix（网关）：发送到 Claude CLI 会话的图像在聊天历史记录中显示为原始缓存路径链接 [#130463](https://github.com/openclaw/openclaw/pull/130463)

</details>

</Accordion>

<Accordion id="reviewing-creating-and-forgetting-memories" title="回顾、创造和遗忘记忆">

设置现在有一个 [ 内存目标 ](/concepts/memory) 用于实时状态、梦想、配置、索引源搜索和浏览、附加控件以及嵌入准备情况，因此您可以查看 Claw 可用的内容并打开安全工作区内存文件。 Memory Wiki 概述和 Imported Insights 仪表板现在读取已发布的快照，而不是针对每个请求重新解析整个库，保持大视图响应并显示何时运行重建或需要手动编译。除非连接具有管理员授权，否则会话和旧源保持仅限片段，并且附加更改保持只读。

符合条件的观察结果可以合并到 `MEMORY.md` 中，持久指令可以存在于 `USER.md` 中，长期意图可以等待正确的事件，项目内存的范围仅限于生成它们的项目。自动内存仍然是有限的和出处门控的，因此从网络或受限会话派生的内容保持不受信任的来源，并且远离自动上下文，即使显式搜索仍然可以显示它。这种来源保护适用于新跟踪的材料，而较旧的未跟踪文件保留其现有分类。

[`openclaw memory forget`](/cli/memory) 允许您预览按会话、挂钩源或参与者进行的清除，然后删除可归因的派生内存并阻止所选会话因回填、索引或梦想而拉回。可以重试中断的清除，并且新归属的合并或回填日记索赔将随所选会话一起删除。清除遵循记录的来源，因此原始记录、较早的无沿袭笔记、其他代理的存储、直接或外部写入、导出和备份可能会保留。在应用之前查看预览。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加专用内存设置页面[#114037](https://github.com/openclaw/openclaw/pull/114037)
- 添加出处门控内存和默认开启梦想 [#114819](https://github.com/openclaw/openclaw/pull/114819)
- 给记忆一个实时概述、梦想和设置 [#115383](https://github.com/openclaw/openclaw/pull/115383)
- 设置中添加内存搜索和浏览 [#115419](https://github.com/openclaw/openclaw/pull/115419)
- 按项目隔离精选内存 [#115438](https://github.com/openclaw/openclaw/pull/115438)
- 向内存设置添加内联控件和就绪检查 [#115557](https://github.com/openclaw/openclaw/pull/115557)
- 在会话中保留最近的项目内存范围 [#115731](https://github.com/openclaw/openclaw/pull/115731)
- feat（内存）：会话来源、准入策略和 openclaw 内存忘记 [#130151](https://github.com/openclaw/openclaw/pull/130151)
- 向网关添加操作员范围内存搜索 [#115346](https://github.com/openclaw/openclaw/pull/115346)
- 将Memory Palace重命名为Memory Wiki并记录它[#115954](https://github.com/openclaw/openclaw/pull/115954)
- 对齐内存页面并简化代理选择 [#115884](https://github.com/openclaw/openclaw/pull/115884)

**错误修复**

- 在自动升级失败期间保护长期内存 [#108397](https://github.com/openclaw/openclaw/pull/108397)
- 恢复每代理内存核心梦想日记[#115069](https://github.com/openclaw/openclaw/pull/115069)
- 在项目边界内保持梦想整合 [#115721](https://github.com/openclaw/openclaw/pull/115721)
- 隔离内存从受网络污染的代理写入 [#115818](https://github.com/openclaw/openclaw/pull/115818)
- 在 MEMORY.md 压缩期间保留用户编写的标题 [#116057](https://github.com/openclaw/openclaw/pull/116057)
- 在 MEMORY.md 预算压缩期间保留用户注释 [#116180](https://github.com/openclaw/openclaw/pull/116180)
- 将网络后提供商内存写入不可信 [#118760](https://github.com/openclaw/openclaw/pull/118760)
- 将合成切换保留在可信所有者内存之外 [#118987](https://github.com/openclaw/openclaw/pull/118987)
- 纠正错误的记忆保存和忘记声明 [#120989](https://github.com/openclaw/openclaw/pull/120989)
- 以原子方式发布内存核心梦想报告 [#122343](https://github.com/openclaw/openclaw/pull/122343)
- 内存禁用后撤销保留的内存工具 [#125393](https://github.com/openclaw/openclaw/pull/125393)
- 在自动内存调用期间强制执行车刀策略 [#126482](https://github.com/openclaw/openclaw/pull/126482)
- 跨会话捕获和做梦保留内存信任 [#126489](https://github.com/openclaw/openclaw/pull/126489)
- fix（内存）：在自动上下文中尊重出处 [#127469](https://github.com/openclaw/openclaw/pull/127469)
- fix（内存）：防止忘记的会话内容返回[#130451](https://github.com/openclaw/openclaw/pull/130451)
- fix（内存）：忘记的内容在重试和合并中仍然存在 [#131179](https://github.com/openclaw/openclaw/pull/131179)
- fix（memory-wiki）：发布仪表板快照 [#132296](https://github.com/openclaw/openclaw/pull/132296)
- 在启动内存和心跳提示中保持表情符号完整 [#102483](https://github.com/openclaw/openclaw/pull/102483)
- 保留压缩和内存片段Unicode安全[#102542](https://github.com/openclaw/openclaw/pull/102542)
- 防止并发写入期间部分内存 Wiki 失败 [#103408](https://github.com/openclaw/openclaw/pull/103408)
- fix（内存核心）：梦想叙事子代理收到完整的通用提示，而不是最小的[#106404](https://github.com/openclaw/openclaw/pull/106404)
- 防止原始输出破坏 Tokenjuice 压实 [#107705](https://github.com/openclaw/openclaw/pull/107705)
- 在自动升级期间保留链接的 MEMORY.md 文件 [#108921](https://github.com/openclaw/openclaw/pull/108921)
- 保留心跳回复新的梦境记忆[#109403](https://github.com/openclaw/openclaw/pull/109403)
- 将无效的回忆时间戳排除在梦想排名之外 [#110537](https://github.com/openclaw/openclaw/pull/110537)
- 在保护压缩期间保留提供商路由 [#112416](https://github.com/openclaw/openclaw/pull/112416)
- Bound压实计划工人有效负载[#112593](https://github.com/openclaw/openclaw/pull/112593)
- 保持内存维护结果退出聊天 [#112942](https://github.com/openclaw/openclaw/pull/112942)
- 将媒体演示标记保留在 LanceDB 存储器之外 [#113145](https://github.com/openclaw/openclaw/pull/113145)
- 更正梦想切换确认[#113960](https://github.com/openclaw/openclaw/pull/113960)
- 修复期间删除悬空内存核心召回记录 [#114419](https://github.com/openclaw/openclaw/pull/114419)
- 启动失败后恢复内存梦想Cron [#115174](https://github.com/openclaw/openclaw/pull/115174)
- Give 内存设置稳定的基于路径的选项卡 URL [#115515](https://github.com/openclaw/openclaw/pull/115515)
- 在校准默认值下提升耐用内存 [#115715](https://github.com/openclaw/openclaw/pull/115715)
- 使内存引擎切换清晰可靠 [#115750](https://github.com/openclaw/openclaw/pull/115750)
- 跨转录运行时保留网络内容污染 [#115850](https://github.com/openclaw/openclaw/pull/115850)
- 稳定内存核心梦想时间表和清理[#115925](https://github.com/openclaw/openclaw/pull/115925)
- 复制安装后删除重复的 Memory Dreaming 作业 [#115986](https://github.com/openclaw/openclaw/pull/115986)
- 在会话内存文件中尊重用户时区 [#116136](https://github.com/openclaw/openclaw/pull/116136)
- 防止内存刷新结束父会话 [#116198](https://github.com/openclaw/openclaw/pull/116198)
- fix（内存核心）：从REM相提取中过滤垃圾主题（#111923）[#117248](https://github.com/openclaw/openclaw/pull/117248)
- 防止挂起代理运行导致 Git 查找停滞 [#117346](https://github.com/openclaw/openclaw/pull/117346)
- 使用所选代理保留 Dreams 数据 [#117538](https://github.com/openclaw/openclaw/pull/117538)
- 重新启动后清理中断的 Dreaming 会话 [#117885](https://github.com/openclaw/openclaw/pull/117885)
- 在格式错误的时间戳之前保持有效的内存诊断 [#118749](https://github.com/openclaw/openclaw/pull/118749)
- 保持内存刷新追加不会以桥接错误结束 [#120404](https://github.com/openclaw/openclaw/pull/120404)
- 内存刷新准备失败时保持回复运行 [#121157](https://github.com/openclaw/openclaw/pull/121157)
- 保留之前的 Memory Wiki lint 写入失败报告 [#122568](https://github.com/openclaw/openclaw/pull/122568)
- CLI 和网关代理现在转刷新内存 [#124964](https://github.com/openclaw/openclaw/pull/124964)
- 保持会话内存文件名生成工具免费 [#125394](https://github.com/openclaw/openclaw/pull/125394)
- 保留梦想日记数据范围为活动代理[#125936](https://github.com/openclaw/openclaw/pull/125936)
- fix（内存核心）：当就地回退写入中途失败时恢复MEMORY.md [#126486](https://github.com/openclaw/openclaw/pull/126486)
- fix（内存核心）：从终端回复中读取梦想叙述，而不是竞速会话存储（#123360）[#127184](https://github.com/openclaw/openclaw/pull/127184)
- fix（代理）：在模型请求[#128215](https://github.com/openclaw/openclaw/pull/128215)之前停止取消的压缩
- fix（代理）：取消上下文处理后阻止模型请求 [#128607](https://github.com/openclaw/openclaw/pull/128607)
- fix（compaction）：共享模型感知内存维护预算 [#130072](https://github.com/openclaw/openclaw/pull/130072)
- fix（内存）：停止提示不可用的调度工具[#130128](https://github.com/openclaw/openclaw/pull/130128)
- fix（内存）：忘记条目时保留行结尾 [#130943](https://github.com/openclaw/openclaw/pull/130943)
- fix（内存）：被遗忘的事实在整合历史中幸存 [#131248](https://github.com/openclaw/openclaw/pull/131248)
- fix（内存）：会话回填后忘记日记声明 [#131626](https://github.com/openclaw/openclaw/pull/131626)
- fix（内存）：在重置时保留会话摘录 [#132757](https://github.com/openclaw/openclaw/pull/132757)
- 自动翻转时保存会话内存 [#61675](https://github.com/openclaw/openclaw/pull/61675)
- 防止嵌套压缩锁定自己的转录本 [#88919](https://github.com/openclaw/openclaw/pull/88919)
- 尊重会话内存段的配置模型 [#97007](https://github.com/openclaw/openclaw/pull/97007)
- 在会话内存记录中包含伪造的角色行 [#98574](https://github.com/openclaw/openclaw/pull/98574)
- 在内存核心梦想片段中保留有效的Unicode [#101946](https://github.com/openclaw/openclaw/pull/101946)
- Keep Talk 记忆片段在表情符号边界处有效 [#102477](https://github.com/openclaw/openclaw/pull/102477)
- 使截断的内存片段在表情符号 [#102478](https://github.com/openclaw/openclaw/pull/102478) 周围保持有效
- 截断梦想日记上下文时保留表情符号 [#102524](https://github.com/openclaw/openclaw/pull/102524)
- 保留内存-wiki终端截断Unicode安全[#103178](https://github.com/openclaw/openclaw/pull/103178)
- 严格解析Dreaming整数设置[#107619](https://github.com/openclaw/openclaw/pull/107619)
- 拒绝内存中无效的代理目标医生调用[#115365](https://github.com/openclaw/openclaw/pull/115365)
- 在内存提升期间保留完整的Unicode字符 [#115591](https://github.com/openclaw/openclaw/pull/115591)
- 手动重置后保留描述性会话内存文件名 [#116094](https://github.com/openclaw/openclaw/pull/116094)
- 滚动时保持梦想日记导航可见 [#118054](https://github.com/openclaw/openclaw/pull/118054)
- 让内存支持的CLI命令自然退出 [#118500](https://github.com/openclaw/openclaw/pull/118500)
- 针对格式错误的 wiki_apply 输入返回验证错误 [#123050](https://github.com/openclaw/openclaw/pull/123050)
- 准确报告内存核心修复失败并跳过升级 [#124770](https://github.com/openclaw/openclaw/pull/124770)
- 保持内存集线器接头在选项卡之间稳定 [#125568](https://github.com/openclaw/openclaw/pull/125568)
- 针对预期的非所有者内存工具门控停止警告 [#126679](https://github.com/openclaw/openclaw/pull/126679)
- test（agents）：将进程注册表清理绑定到其模块实例 [#129456](https://github.com/openclaw/openclaw/pull/129456)
- 显示内存升级审核输出中的总信号 [#87590](https://github.com/openclaw/openclaw/pull/87590)

**文档**

- docs（内存）：添加内存来源和删除概念页面 [#130278](https://github.com/openclaw/openclaw/pull/130278)
- 将主动性和内存文档与出厂行为对齐 [#112295](https://github.com/openclaw/openclaw/pull/112295)
- docs（内存）：网络工具输出 [#129837](https://github.com/openclaw/openclaw/pull/129837) 的文档传送的污点传播

</details>

</Accordion>

</AccordionGroup>
