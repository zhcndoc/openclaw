---
title: "v2026.8.1：安装和入门"
description: "从下载到在 Mac、Linux、Windows、iPhone、iPad 和 Android 上进行第一次有用对话的更清晰路径，以及将会话和记录移动到 SQLite 中。"
---

<Warning>
**存储和降级警告**

此版本通过将会话和记录移至 SQLite 来更改会话和记录的存储方式。在降级到较旧的文件支持版本之前，请使用当前的 CLI 恢复存档的旧转录工件；迁移后创建的会话不会出现在旧版本中。

在升级之前创建 [ 已验证的备份 ](/install/updating#before-updating%3A-create-a-verified-backup) 以保护更广泛的 OpenClaw 状态，并在回滚之前查看 [ 跨会话降级 SQLite 迁移 ](/install/updating#downgrading-across-the-session-sqlite-migration)。
</Warning>

OpenClaw 现在为新的 [Mac、Linux 和 Windows installs](/install) 提供了从下载到第一次有用对话的更清晰路径，而 iPhone、iPad 和 Android 将配对和权限放在人们需要的地方。引导式设置可以重复使用受支持的订阅、API 密钥和已可用的 [ 本地模型 ](/gateway/local-models)，在保存之前验证所选模型，并在连接准备就绪时将其移交给 Web 应用程序或终端。

<AccordionGroup>

<Accordion id="installing-openclaw" title="安装OpenClaw">

[ 支持的安装路径](/install) 现在使应用程序或命令在安装后可用。从下载或磁盘映像打开的 Mac 应用程序可以将自身移动到应用程序中，在其中更新和登录时启动可以正常工作。在 Linux 和其他 Unix 系统上，安装程序使 `openclaw` 在新的终端会话中可用，而不要求您手动编辑 shell 启动文件。

在任何更改之前，将停止未经身份验证而暴露 OpenClaw 的网络安装。当准备取消或失败时，重新安装还可以保护现有的工作设置，并在报告是否可达之前为 OpenClaw 提供启动时间。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 安装临时 macOS 在应用程序中启动 [#104661](https://github.com/openclaw/openclaw/pull/104661)
- feat（docker）：在运行时镜像中安装openssh-client [#131710](https://github.com/openclaw/openclaw/pull/131710)
- 以简单语言阐明入门引导安全指南 [#120172](https://github.com/openclaw/openclaw/pull/120172)

**错误修复**

- 防止新鲜状态网关启动超时 [#111701](https://github.com/openclaw/openclaw/pull/111701)
- 在模型运行时准备期间保持网关启动响应 [#112262](https://github.com/openclaw/openclaw/pull/112262)
- 添加用于载入的安全网关令牌恢复 [#118051](https://github.com/openclaw/openclaw/pull/118051)
- 安装后保持 OpenClaw 在新的 Unix shell 中可用 [#124779](https://github.com/openclaw/openclaw/pull/124779)
- 在交互式登录中尊重远程标志 [#111517](https://github.com/openclaw/openclaw/pull/111517)
- 切换到令牌身份验证时删除过时的远程密码 [#112544](https://github.com/openclaw/openclaw/pull/112544)
- 在网关准备就绪后让首次启动环回 CLI 调用连接 [#114380](https://github.com/openclaw/openclaw/pull/114380)
- 避免规范内部挂钩的首次启动延迟 [#117493](https://github.com/openclaw/openclaw/pull/117493)
- 在加入期间进行外部网关监督 [#119846](https://github.com/openclaw/openclaw/pull/119846)
- H非交互式设置期间的网关密码 [#126690](https://github.com/openclaw/openclaw/pull/126690)
- 加入远程网关密码验证 [#126768](https://github.com/openclaw/openclaw/pull/126768)
- 修复：取消安装重新安装时保留网关[#130617](https://github.com/openclaw/openclaw/pull/130617)
- fix：跨设置共享托管网关启动准备情况 [#130682](https://github.com/openclaw/openclaw/pull/130682)
- fix（安装）：防止低内存安装后 OOM [#132555](https://github.com/openclaw/openclaw/pull/132555)
- fix（cli）：网关重启后完成远程登录 [#133257](https://github.com/openclaw/openclaw/pull/133257)
- 防止管道安装程序子进程消耗安装脚本 [#87799](https://github.com/openclaw/openclaw/pull/87799)
- 阻止未经身份验证的网络网关服务安装[#98022](https://github.com/openclaw/openclaw/pull/98022)
- 更新新的CLI安装到Node 22.22.2 [#104073](https://github.com/openclaw/openclaw/pull/104073)
- 在安装服务之前等待网关警告 [#104173](https://github.com/openclaw/openclaw/pull/104173)
- 验证所选运行时映像中的 Docker 时区 [#116153](https://github.com/openclaw/openclaw/pull/116153)
- 避免登录失败导致 shell 完成权限错误 [#125263](https://github.com/openclaw/openclaw/pull/125263)
- 在网关副作用之前保留配置更改 [#125751](https://github.com/openclaw/openclaw/pull/125751)
- fix（安装程序）：避免从 Linux 软件包存储库 [#130369](https://github.com/openclaw/openclaw/pull/130369) 预发布 Node
- fix（安装程序）：避免在源安装 [#130900](https://github.com/openclaw/openclaw/pull/130900) 后重新启动网关两次
- fix：避免守护程序安装 [#132206](https://github.com/openclaw/openclaw/pull/132206) 中的冷 SecretRef 验证停止

**文档**

- 正确的README设置指南和贡献者头像尺寸[#113547](https://github.com/openclaw/openclaw/pull/113547)
- 简化 README 的首次设置 [#118376](https://github.com/openclaw/openclaw/pull/118376)
- 添加 ChromeOS 和 Crostini 安装指南 [#107663](https://github.com/openclaw/openclaw/pull/107663)
- 停止告诉托管安装程序用户登录两次 [#125246](https://github.com/openclaw/openclaw/pull/125246)

</details>

</Accordion>

<Accordion id="connecting-a-subscription-api-key-or-local-model" title="连接订阅、API 密钥或本地模型">

[引导式设置](/start/wizard) 现在开始查找您可能已经拥有的 AI 访问权限。它可以重复使用经过验证的 Codex、ChatGPT 或 Claude CLI 登录，接受 API 密钥，运行支持的提供商自己的登录，或查找合格的 Ollama 和 LM Studio 模型，然后证明确切的选择可以在保留该模型和凭证之前回答。已在计算机上运行的访问可以成为设置的一部分，而不是其他需要配置的内容。

对于 OpenAI 帐户，设置使用登录帐户实际可以访问的模型，同时保留您自己配置的路由，管理员可以准备受支持的 [ 本地模型](/gateway/local-models) 以及实时进度。查找或下载本地模型只是开始，因此受支持的本地模型屏幕不会显示开始聊天，直到该确切选择通过激活。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 默认全新 OpenAI 设置为 GPT-5.6 [#103581](https://github.com/openclaw/openclaw/pull/103581)
- 将提供商登录添加到入门引导 [#104502](https://github.com/openclaw/openclaw/pull/104502)
- 从 Control UI 配置模型提供程序 [#106490](https://github.com/openclaw/openclaw/pull/106490)
- 在入门引导期间发现已安装的本地模型 [#108605](https://github.com/openclaw/openclaw/pull/108605)
- 将引导模型设置添加到 Control UI [#108868](https://github.com/openclaw/openclaw/pull/108868)
- 验证来自Control UI的当前模型连接 [#109183](https://github.com/openclaw/openclaw/pull/109183)
- 在引导引导期间更喜欢更强的本地模型 [#109250](https://github.com/openclaw/openclaw/pull/109250)
- 添加进程内本地GGUF文本推理[#109444](https://github.com/openclaw/openclaw/pull/109444)
- 使用Gemma 4作为RAM-门控llama.cpp默认[#109585](https://github.com/openclaw/openclaw/pull/109585)
- 添加统一的AI设置建议[#109681](https://github.com/openclaw/openclaw/pull/109681)
- 跨设置表面的流提供程序准备进度 [#109764](https://github.com/openclaw/openclaw/pull/109764)
- 自动使用精益工具曲面来验证本地模型 [#110596](https://github.com/openclaw/openclaw/pull/110596)
- 在Web和macOS [#113476](https://github.com/openclaw/openclaw/pull/113476)上添加一键本地模型设置
- 添加已验证的 LM Studio 和本地模型载入 [#116606](https://github.com/openclaw/openclaw/pull/116606)
- 将 node-llama-cpp 替换为托管 llama-server [#123105](https://github.com/openclaw/openclaw/pull/123105)
- 改进 macOS 设备代码登录 [#104766](https://github.com/openclaw/openclaw/pull/104766)
- 将 macOS AI 连接选择与 CLI 载入 [#107642](https://github.com/openclaw/openclaw/pull/107642) 对齐
- 澄清提供商凭证设置和 CLI 登录恢复 [#108739](https://github.com/openclaw/openclaw/pull/108739)
- 报告在指导设置期间安装的 Pi 和 OpenCode 工具 [#109624](https://github.com/openclaw/openclaw/pull/109624)
- 刷新 DeepSeek、Together 和 Venice 设置默认值 [#113973](https://github.com/openclaw/openclaw/pull/113973)
- 默认全新 Cerebras 设置为 Gemma 4 31B [#114015](https://github.com/openclaw/openclaw/pull/114015)
- 跨设置和发现统一 Ollama 模型检查 [#115879](https://github.com/openclaw/openclaw/pull/115879)
- 打开聊天前验证 llama.cpp 设置 [#116308](https://github.com/openclaw/openclaw/pull/116308)
- 简化已配置本地模型的恢复 [#117165](https://github.com/openclaw/openclaw/pull/117165)
- Scope 入门引导模型浏览至所选提供商 [#125373](https://github.com/openclaw/openclaw/pull/125373)
- 在首次运行设置期间跳过放弃的工作区加载 [#126967](https://github.com/openclaw/openclaw/pull/126967)
- 更快的首次运行模型检测 [#127053](https://github.com/openclaw/openclaw/pull/127053)

**错误修复**

- 制作新鲜 AI 入门引导可靠且透明 [#103962](https://github.com/openclaw/openclaw/pull/103962)
- 在全新 Mac 设置期间重复使用 Codex CLI 登录 [#104150](https://github.com/openclaw/openclaw/pull/104150)
- 在引导引导期间恢复分组提供商登录 [#107038](https://github.com/openclaw/openclaw/pull/107038)
- Harden OpenAI 加入和 Crestodian 切换 [#107041](https://github.com/openclaw/openclaw/pull/107041)
- 在设置检测期间保持网关健康状况响应 [#110625](https://github.com/openclaw/openclaw/pull/110625)
- 无配置网关上的解锁模型设置 [#111841](https://github.com/openclaw/openclaw/pull/111841)
- 入门引导期间需要可行的导入和本地 AI 路由 [#112028](https://github.com/openclaw/openclaw/pull/112028)
- 防止登录崩溃并优先考虑订阅登录 [#112378](https://github.com/openclaw/openclaw/pull/112378)
- API-key 加入后显示帐户可用的 OpenAI 模型 [#114258](https://github.com/openclaw/openclaw/pull/114258)
- Fix OpenAI 模型发现和安装包载入 [#114288](https://github.com/openclaw/openclaw/pull/114288)
- 使 Ollama 和 LM Studio 上线可靠 [#114405](https://github.com/openclaw/openclaw/pull/114405)
- 保持本地模型发现、重试和云超时正确 [#114582](https://github.com/openclaw/openclaw/pull/114582)
- 指导Control UI用户通过不可用的AI设置[#115716](https://github.com/openclaw/openclaw/pull/115716)
- 当没有可用模型时，将模型设置作为主要恢复操作 [#116079](https://github.com/openclaw/openclaw/pull/116079)
- 选择可用的 GitHub Copilot 入门模型 [#116590](https://github.com/openclaw/openclaw/pull/116590)
- Route Google 通过支持的身份验证设置 [#116611](https://github.com/openclaw/openclaw/pull/116611)
- 荣誉Ollama模型和拉式完成合约[#117171](https://github.com/openclaw/openclaw/pull/117171)
- 激活设置期间准备的确切本地模型 [#119050](https://github.com/openclaw/openclaw/pull/119050)
- 在 macOS [#120782](https://github.com/openclaw/openclaw/pull/120782) 上完成 ChatGPT 订阅设置
- OpenCode 入门选择可用模型并保留编码工具 [#121414](https://github.com/openclaw/openclaw/pull/121414)
- Make Ollama 引导设置选择并验证工作模型 [#123190](https://github.com/openclaw/openclaw/pull/123190)
- 将llama.cpp默认上下文提高到64K [#123701](https://github.com/openclaw/openclaw/pull/123701)
- 完成 macOS Codex 设置和帐户模型发现 [#124829](https://github.com/openclaw/openclaw/pull/124829)
- 当设置扫描长时间运行时检测 CLI 模型登录 [#125114](https://github.com/openclaw/openclaw/pull/125114)
- 重启后保持Claude CLI OAuth可用 [#125471](https://github.com/openclaw/openclaw/pull/125471)
- Scope 入门引导模型与所选提供商 [#126427](https://github.com/openclaw/openclaw/pull/126427) 挂钩
- 修复：保留 Claude CLI 身份验证本机 [#129052](https://github.com/openclaw/openclaw/pull/129052)
- fix（人为）：本机 Claude 模型显示不正确的可用性 [#129346](https://github.com/openclaw/openclaw/pull/129346)
- fix（auth）：使 Codex 注销恢复可操作 [#130866](https://github.com/openclaw/openclaw/pull/130866)
- 修复：模型设置激活后恢复身份验证和聊天 [#133106](https://github.com/openclaw/openclaw/pull/133106)
- 保留 GitHub Copilot 设备登录退避 [#103434](https://github.com/openclaw/openclaw/pull/103434)
- 停止暂停 GitHub Copilot 代币兑换 [#104488](https://github.com/openclaw/openclaw/pull/104488)
- 查找存储在提供者别名 [#106736](https://github.com/openclaw/openclaw/pull/106736) 下的模型探测凭据
- 在入门引导期间完成 Codex OAuth 切换 [#107174](https://github.com/openclaw/openclaw/pull/107174)
- 删除重复的 Codex 提供商设置选项 [#107979](https://github.com/openclaw/openclaw/pull/107979)
- 保留全新安装 ChatGPT OAuth 凭据 [#108617](https://github.com/openclaw/openclaw/pull/108617)
- 防止 Codex 登录查找挂起 TUI [#109452](https://github.com/openclaw/openclaw/pull/109452)
- 在提供商身份验证期间忽略空白环境凭据 [#109691](https://github.com/openclaw/openclaw/pull/109691)
- 让Ollama设置继续过去损坏的本地模型[#109895](https://github.com/openclaw/openclaw/pull/109895)
- 停止声称工具支持损坏的 Ollama 模型 [#109921](https://github.com/openclaw/openclaw/pull/109921)
- fix（onboarding）：停止推荐工具安装程序无法激活[#109951](https://github.com/openclaw/openclaw/pull/109951)
- 模型检查失败时停止广告Ollama工具[#109971](https://github.com/openclaw/openclaw/pull/109971)
- 允许 OpenAI OAuth 代币交换在假 IP 代理 [#110096](https://github.com/openclaw/openclaw/pull/110096) 后面
- 保留失败的登录重试，以免覆盖工作设置 [#111558](https://github.com/openclaw/openclaw/pull/111558)
- 浏览器回调后让OpenAI模型登录退出 [#112211](https://github.com/openclaw/openclaw/pull/112211)
- 在停滞发现期间保持 Control UI 设置响应 [#112338](https://github.com/openclaw/openclaw/pull/112338)
- 停止停滞Microsoft通过挂起登录进行 Foundry 设备代码登录[#112369](https://github.com/openclaw/openclaw/pull/112369)
- 在加入期间重复使用主动Codex API-密钥身份验证[#112770](https://github.com/openclaw/openclaw/pull/112770)
- 保持网页模型下载进度更新 [#113613](https://github.com/openclaw/openclaw/pull/113613)
- 刷新提供商入门模型默认值 [#113870](https://github.com/openclaw/openclaw/pull/113870)
- 在帐户访问中保留 OpenAI 入门选择 [#114356](https://github.com/openclaw/openclaw/pull/114356)
- 防止 Doctor 中出现错误的提供者故障[#114533](https://github.com/openclaw/openclaw/pull/114533)
- 保留载入推理探针的内存中会话[#115452](https://github.com/openclaw/openclaw/pull/115452)
- 在载入期间保留选定的 Ollama 模型功能 [#115467](https://github.com/openclaw/openclaw/pull/115467)
- 通过激活 [#115704](https://github.com/openclaw/openclaw/pull/115704) 保持已验证的 Codex 设置处于活动状态
- 制作Gemini CLI设置恢复可操作[#115835](https://github.com/openclaw/openclaw/pull/115835)
- 重试Ollama无需重新启动向导即可进行设置[#116210](https://github.com/openclaw/openclaw/pull/116210)
- 坐标设置和模型设置写入[#116940](https://github.com/openclaw/openclaw/pull/116940)
- 停止刮擦Gemini CLI OAuth证书[#117167](https://github.com/openclaw/openclaw/pull/117167)
- 在设置过程中仅使用加载的 LM Studio 模型 [#117919](https://github.com/openclaw/openclaw/pull/117919)
- 检测可达Ollama入门引导期间的服务[#118020](https://github.com/openclaw/openclaw/pull/118020)
- 删除不受支持的 Google 身份验证和配额指导 [#118034](https://github.com/openclaw/openclaw/pull/118034)
- 避免负载闲置Ollama指导设置期间的模型[#118183](https://github.com/openclaw/openclaw/pull/118183)
- 在引导设置过程中检测运行 LM Studio 且未加载模型 [#119134](https://github.com/openclaw/openclaw/pull/119134)
- 在已安装的本地恢复提供程序身份验证TUI模式[#119283](https://github.com/openclaw/openclaw/pull/119283)
- 使固定macOS AI入门视觉效果和钥匙串后备[#120907](https://github.com/openclaw/openclaw/pull/120907)
- 修复无身份验证本地模型和提示模板错误处理[#121790](https://github.com/openclaw/openclaw/pull/121790)
- 制作macOS入门引导候选人行完全可点击[#121928](https://github.com/openclaw/openclaw/pull/121928)
- 显示可重试错误AI访问检测超时[#121940](https://github.com/openclaw/openclaw/pull/121940)
- 删除重复的 GPT-5.6 选择器条目 [#122178](https://github.com/openclaw/openclaw/pull/122178)
- 在模型设置对话框中保留长 OAuth 设置链接 [#122892](https://github.com/openclaw/openclaw/pull/122892)
- fix（openai）：返回格式错误的 OAuth 代币 JSON [#122962](https://github.com/openclaw/openclaw/pull/122962) 的结构化故障
- 无法登录时显示已配置的模型 [#123130](https://github.com/openclaw/openclaw/pull/123130)
- 从模型设置中完成 Codex 测试和使用 [#123141](https://github.com/openclaw/openclaw/pull/123141)
- 在 CLI 设置过程中选择最小的可用本地 Ollama 模型 [#123382](https://github.com/openclaw/openclaw/pull/123382)
- 在提供商授权后保持模型设置处于活动状态 [#123418](https://github.com/openclaw/openclaw/pull/123418)
- 在脚本化 macOS 载入过程中读取 Claude CLI 钥匙串身份验证 [#123839](https://github.com/openclaw/openclaw/pull/123839)
- fix（系统代理）：在本地模型设置探针中留出推理空间 [#124405](https://github.com/openclaw/openclaw/pull/124405)
- 无效回调后保持OpenRouter登录等待[#124922](https://github.com/openclaw/openclaw/pull/124922)
- 将加入提供商元数据范围保持在选定的提供商 [#125379](https://github.com/openclaw/openclaw/pull/125379)
- 显示准确的 OpenAI OAuth 恢复状态，无需屏蔽提供程序故障 [#125515](https://github.com/openclaw/openclaw/pull/125515)
- fix（tui）：当会话提供程序为 CLI-backed [#125677](https://github.com/openclaw/openclaw/pull/125677) 时，本地 /auth 退出 1，且不进行任何诊断
- 使 llama-server 身份验证更改可重现 [#126498](https://github.com/openclaw/openclaw/pull/126498)
- 在加入期间将 OpenRouter API 密钥与 OpenRouter 一起保留 [#126578](https://github.com/openclaw/openclaw/pull/126578)
- fix（ui）：对于新客户端，模型设置停留在“检查此网关”[#127695](https://github.com/openclaw/openclaw/pull/127695)
- fix（ollama）：推迟本地服务查找直到流创建 [#128399](https://github.com/openclaw/openclaw/pull/128399)
- fix（ui）：在检查 AI 访问 [#128636](https://github.com/openclaw/openclaw/pull/128636) 时保持模型设置可见
- fix（macos）：允许冷 ChatGPT Codex 探头 [#128819](https://github.com/openclaw/openclaw/pull/128819)
- fix（代理）：保留设置CLI模型分辨率[#129128](https://github.com/openclaw/openclaw/pull/129128)
- fix（入门）：OpenAI 安装程序安装不匹配的 Codex 插件 [#129195](https://github.com/openclaw/openclaw/pull/129195)
- fix：报告本机 Claude CLI 模型可用 [#129332](https://github.com/openclaw/openclaw/pull/129332)
- fix（ollama）：取消的云设置继续并返回凭据 [#129541](https://github.com/openclaw/openclaw/pull/129541)
- fix（板载）：保留清单等效别名验证 [#129590](https://github.com/openclaw/openclaw/pull/129590)
- fix（板载）：拒绝不可用的所需运行时间 [#129855](https://github.com/openclaw/openclaw/pull/129855)
- fix（ollama）：当模型检查不可用时保留广告上下文和工具 [#130000](https://github.com/openclaw/openclaw/pull/130000)
- fix（llama-cpp）：在设置过程中停止推荐失败模型 [#130136](https://github.com/openclaw/openclaw/pull/130136)
- fix（人为）：防止退役的 Claude CLI 配置文件破坏设置 [#130225](https://github.com/openclaw/openclaw/pull/130225)
- fix（ollama）：当检查没有返回任何结果时，云模型从发现中消失 [#130240](https://github.com/openclaw/openclaw/pull/130240)
- fix：荣誉新鲜供应商目录发现[#130412](https://github.com/openclaw/openclaw/pull/130412)
- fix（ollama）：保留本地设置并跳过嵌入聊天默认值 [#130459](https://github.com/openclaw/openclaw/pull/130459)
- 修复（设置）：将取代的目录刷新视为激活成功[#130795](https://github.com/openclaw/openclaw/pull/130795)
- 修复（设置）：在第一个代理创建期间保留经过验证的推理[#132472](https://github.com/openclaw/openclaw/pull/132472)
- 清理OpenAI Codex OAuth回调和过时的提示[#89491](https://github.com/openclaw/openclaw/pull/89491)
- 接受助手管理Claude CLI验证[#97492](https://github.com/openclaw/openclaw/pull/97492)
- 在入门引导期间省略空的提供商请求设置[aad9974](https://github.com/openclaw/openclaw/commit/aad9974)
- Bound MiniMax OAuth 具有 30 秒超时的请求 [#102862](https://github.com/openclaw/openclaw/pull/102862)
- 停止GitHub Copilot设备登录无限期挂起[#103255](https://github.com/openclaw/openclaw/pull/103255)
- 抑制显式启用插件的信任警告 [#104097](https://github.com/openclaw/openclaw/pull/104097)
- 展示OpenRouter OAuth准确否认错误[#105448](https://github.com/openclaw/openclaw/pull/105448)
- 清理 GitHub Copilot 登录轮询侦听器 [#106453](https://github.com/openclaw/openclaw/pull/106453)
- 从指导入门引导候选人中删除占位符文本 [#110084](https://github.com/openclaw/openclaw/pull/110084)
- 发布Ollama响应后建立连接[#111802](https://github.com/openclaw/openclaw/pull/111802)
- 解释如何从 GitHub Copilot 403 错误中恢复 [#112025](https://github.com/openclaw/openclaw/pull/112025)
- 遵循 Azure 设备代码登录窗口[#113741](https://github.com/openclaw/openclaw/pull/113741)
- 刷新 Qianfan 载入默认值并隔离 OpenAI 实时测试 [#113999](https://github.com/openclaw/openclaw/pull/113999)
- 干净地拒绝格式错误的 OpenAI OAuth 令牌响应 [#120685](https://github.com/openclaw/openclaw/pull/120685)
- 使用选择的 Codex 运行时修复提供程序密钥测试 [#121500](https://github.com/openclaw/openclaw/pull/121500)
- 让用户在 macOS 入门引导期间切换 AI 候选人 [#121613](https://github.com/openclaw/openclaw/pull/121613)
- 制作Codex入门引导容忍继承的加载程序路径[#122731](https://github.com/openclaw/openclaw/pull/122731)
- 之后停止错误的缺少身份验证警告API按键输入[#122756](https://github.com/openclaw/openclaw/pull/122756)
- 与 OpenAI 设置身份验证选择保持一致 [#124729](https://github.com/openclaw/openclaw/pull/124729)
- 重试瞬态首次运行模型检测 [#125212](https://github.com/openclaw/openclaw/pull/125212)
- 停止虚假提供商设置警告 [#125523](https://github.com/openclaw/openclaw/pull/125523)
- 识别环境CLI登录以查看配置的模型可用性[#125772](https://github.com/openclaw/openclaw/pull/125772)
- Fix Web UI 提供程序探测直接凭据 [#125816](https://github.com/openclaw/openclaw/pull/125816)
- 在非交互式入门期间停止错误的插件警告[#126734](https://github.com/openclaw/openclaw/pull/126734)
- 修复：报告本机Claude CLI授权状态[#129364](https://github.com/openclaw/openclaw/pull/129364)
- 修复：干净退役Claude在医生健康之前进行身份验证[#129375](https://github.com/openclaw/openclaw/pull/129375)
- fix（llama-cpp）：现有服务器设置首先选择现成的模型 [#129509](https://github.com/openclaw/openclaw/pull/129509)
- fix（ollama）：尽管有明确的非思考能力，但设置还是选择了一个巨大的模型 [#129611](https://github.com/openclaw/openclaw/pull/129611)
- 修复（ollama）：允许使用任何已安装的本地模型重置设置[#129934](https://github.com/openclaw/openclaw/pull/129934)

**文档**

- docs（入门）：在设置指南中保留所选模型 [#128547](https://github.com/openclaw/openclaw/pull/128547)

</details>

</Accordion>

<Accordion id="starting-your-first-conversation" title="开始你们的第一次对话">

成功的设置现在直接移交给 [ 第一次对话 ](/start/wizard)。图形 Mac、Linux 和 Windows 会话可以打开 Web 应用程序，而 SSH 和其他无头设置提供带有端口转发指令的经过身份验证的链接，并保持终端聊天可用。

从那里，设置对话可以完成支持的技能和网络搜索配置，然后提供外部渠道作为可选的下一步，而不是首次使用的另一个先决条件。经典向导在没有 AI 的情况下仍然可以继续，因为其实时模型检查仍然是可选的。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 引导式 CLI 设置在保存之前验证 AI 访问 [#101880](https://github.com/openclaw/openclaw/pull/101880)
- 推荐已安装应用程序的插件和技能 [#109668](https://github.com/openclaw/openclaw/pull/109668)
- 引导本地托管流程 [#109841](https://github.com/openclaw/openclaw/pull/109841)
- 引导 macOS 加入后添加浏览器优先切换 [#110054](https://github.com/openclaw/openclaw/pull/110054)
- 添加对话式托管人入门引导 [#110141](https://github.com/openclaw/openclaw/pull/110141)
- 坚持入门引导建议并缩短首次运行身份设置 [#110173](https://github.com/openclaw/openclaw/pull/110173)
- 使用实时选项卡添加键入的入门引导问题 [#110242](https://github.com/openclaw/openclaw/pull/110242)
- 代理的第一次聊天中的全新设置 [#110331](https://github.com/openclaw/openclaw/pull/110331)
- 扩展浏览器入门并刷新应用程序建议 [#110484](https://github.com/openclaw/openclaw/pull/110484)
- 向托管人聊天添加丰富的设置控件 [#114631](https://github.com/openclaw/openclaw/pull/114631)
- 配置技能和网页搜索里面问OpenClaw [#115130](https://github.com/openclaw/openclaw/pull/115130)
- 在询问中指导本地网关配置 OpenClaw [#115363](https://github.com/openclaw/openclaw/pull/115363)
- 首次运行模型设置后指导可选通道设置 [#116078](https://github.com/openclaw/openclaw/pull/116078)
- 在入门引导期间命名第一个客服人员 [#123521](https://github.com/openclaw/openclaw/pull/123521)
- 添加选择加入无钥匙 Firecrawl 搜索和更丰富的搜索控件 [#97078](https://github.com/openclaw/openclaw/pull/97078)
- 让用户命名新代理 [#112009](https://github.com/openclaw/openclaw/pull/112009)
- 澄清网络搜索设置选择 [#112199](https://github.com/openclaw/openclaw/pull/112199)
- 在入门应用程序扫描期间显示实时进度 [#112414](https://github.com/openclaw/openclaw/pull/112414)
- 生成时约束系统代理规划器 JSON [#113482](https://github.com/openclaw/openclaw/pull/113482)
- 提供可选工作区文件，没有错误的缺失警告 [#114559](https://github.com/openclaw/openclaw/pull/114559)

**错误修复**

- 使网关加入推理优先且路由安全 [#102883](https://github.com/openclaw/openclaw/pull/102883)
- 使对话设置在本地模型上实用 [#109445](https://github.com/openclaw/openclaw/pull/109445)
- 在 macOS 载入中显示可操作选项卡 [#110584](https://github.com/openclaw/openclaw/pull/110584)
- 让保管人健康状况远离托管向导答案 [#111430](https://github.com/openclaw/openclaw/pull/111430)
- 使首次运行的浏览器登录可靠 [#111465](https://github.com/openclaw/openclaw/pull/111465)
- 按工作区隔离入门引导建议 [#111560](https://github.com/openclaw/openclaw/pull/111560)
- 将新的代理舱口连接到正在运行的网关 [#122210](https://github.com/openclaw/openclaw/pull/122210)
- 使指导代理凭据与创建保持一致 [#126096](https://github.com/openclaw/openclaw/pull/126096)
- 终端频道设置内返回导航 [#108007](https://github.com/openclaw/openclaw/pull/108007)
- 在设置聊天中需要十进制菜单编号 [#108140](https://github.com/openclaw/openclaw/pull/108140)
- 返回设置推理修复聊天 [#109938](https://github.com/openclaw/openclaw/pull/109938)
- Make 设置向导复制按钮可在普通 HTTP [#110139](https://github.com/openclaw/openclaw/pull/110139)
- Align Ask OpenClaw 成帧和确认默认值 [#111263](https://github.com/openclaw/openclaw/pull/111263)
- 在已验证的路由上保留系统代理模型更改 [#111431](https://github.com/openclaw/openclaw/pull/111431)
- 跳过设置时立即退出登录 [#112165](https://github.com/openclaw/openclaw/pull/112165)
- Label 加入字段和掩码 Matrix 凭证 [#112233](https://github.com/openclaw/openclaw/pull/112233)
- 在验证的 TUI 启动期间避免目录准备 [#113136](https://github.com/openclaw/openclaw/pull/113136)
- 全新安装查找外部搜索插件并执行第一个任务 [#114327](https://github.com/openclaw/openclaw/pull/114327)
- 在载入过程中等待真正的新浏览器 [#117431](https://github.com/openclaw/openclaw/pull/117431)
- 在网关安装进度中保持通道设置移动 [#117877](https://github.com/openclaw/openclaw/pull/117877)
- 报告设置期间浏览器启动失败 [#117979](https://github.com/openclaw/openclaw/pull/117979)
- 入门引导切换之前构建 Control UI [#118038](https://github.com/openclaw/openclaw/pull/118038)
- 在载入和配对期间显示剪贴板故障 [#118651](https://github.com/openclaw/openclaw/pull/118651)
- fix（tui）：退出回退之前关闭设置网关 [#121183](https://github.com/openclaw/openclaw/pull/121183)
- 恢复开发网关名册上的设置聊天 [#121784](https://github.com/openclaw/openclaw/pull/121784)
- 分割系统代理聊天所有权并保留切换状态 [#121884](https://github.com/openclaw/openclaw/pull/121884)
- 在网关的 OpenClaw CLI [#122765](https://github.com/openclaw/openclaw/pull/122765) 上保持代理引导
- 托管人通道设置检查失败时添加恢复 [#124680](https://github.com/openclaw/openclaw/pull/124680)
- 在无显示中打开浏览器切换 WSL [#124704](https://github.com/openclaw/openclaw/pull/124704)
- 安全完成引导代理创建 [#125768](https://github.com/openclaw/openclaw/pull/125768)
- fix（板载）：浏览器启动失败后恢复手动切换 [#130272](https://github.com/openclaw/openclaw/pull/130272)
- 拒绝插件设置中的无效数值 [#107346](https://github.com/openclaw/openclaw/pull/107346)
- 在入门推荐说明中保留表情符号 [#110401](https://github.com/openclaw/openclaw/pull/110401)
- 在设置向导中跳过空白区域设置覆盖 [#111076](https://github.com/openclaw/openclaw/pull/111076)
- 为新指定特工保留首轮舱口 [#111553](https://github.com/openclaw/openclaw/pull/111553)
- 在设置下保留系统维护 [#111686](https://github.com/openclaw/openclaw/pull/111686)
- 停止从淹没狭窄终端的载入进度旋转器 [#112413](https://github.com/openclaw/openclaw/pull/112413)
- 应用时显示设置取消提示一次 [#113731](https://github.com/openclaw/openclaw/pull/113731)
- 继续跳过-UI 引导式入门设置 [#118737](https://github.com/openclaw/openclaw/pull/118737)
- 在设置过程中接受代理名称 [#124740](https://github.com/openclaw/openclaw/pull/124740)
- 在引导式入门引导中保留指定代理 [#126365](https://github.com/openclaw/openclaw/pull/126365)
- 在引导引导中保持令牌抑制 [#126580](https://github.com/openclaw/openclaw/pull/126580)
- fix（ollama）：启动本地聊天服务 [#128034](https://github.com/openclaw/openclaw/pull/128034)
- fix（机载）：范围舱口超时到初始转弯[#130010](https://github.com/openclaw/openclaw/pull/130010)
- fix（板载）：引导设置后连接终端舱口 [#130082](https://github.com/openclaw/openclaw/pull/130082)
- fix（入门）：--skip-bootstrap 仍创建身份文件 [#130153](https://github.com/openclaw/openclaw/pull/130153)
- 修复：为Web和终端用户提供正确的代理切换指导[#131646](https://github.com/openclaw/openclaw/pull/131646)
- fix（板载）：在指导设置中启用默认挂钩 [#131894](https://github.com/openclaw/openclaw/pull/131894)

**文档**

- 文档询问 OpenClaw 网关和内存向导 [#115487](https://github.com/openclaw/openclaw/pull/115487)
- 刷新文档英雄并完成快速启动网格[#102880](https://github.com/openclaw/openclaw/pull/102880)
- Align 经典入门文档 [#124712](https://github.com/openclaw/openclaw/pull/124712)
- 更正文档中的经典入门步骤顺序 [#125454](https://github.com/openclaw/openclaw/pull/125454)

</details>

</Accordion>

<Accordion id="setting-up-openclaw-on-mac-windows-and-linux" title="在 Mac、Windows 和 Linux 上设置 OpenClaw">

在 [Mac](/platforms/macos) 上，主指南直接指向应用程序，即使旧的启动或清理工作较晚完成，您选择的本地或远程网关仍保持选中状态。该应用程序等待本地网络提示和合法的首次运行数据升级，在继续之前验证确切的远程网关，并仅在连接准备就绪时打开仪表板。

在 [Windows](/platforms/windows) 上，指南指向最新签名的 x64 和 Arm64 Hub 安装程序。 PowerShell 安装程序现在可以正确识别受支持的 Node 运行时，并且可以在 Winget 安装 Node.js 后在同一会话中继续。 Windows Hub 独立更新，因此其独立稳定版本可以比 OpenClaw 版本中包含的镜像更新。

在 [Linux](/platforms/linux) 上，桌面设置可以修复或重新安装 OpenClaw、直接或通过 SSH 连接到本地或远程网关、验证计算机上已有的合格 AI 访问权限，并恢复中断的激活。直接证书固定连接在桌面应用程序内仍然不可用。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 缩短 macOS 入门引导并移交给托管人 [#117921](https://github.com/openclaw/openclaw/pull/117921)
- macOS AI 设置后立即打开仪表板 [#120950](https://github.com/openclaw/openclaw/pull/120950)
- feat：将 Linux 桌面登录引入 macOS 奇偶校验 [#129815](https://github.com/openclaw/openclaw/pull/129815)
- 让 macOS 入门使用更高的窗口 [#104004](https://github.com/openclaw/openclaw/pull/104004)
- improve（安装程序）：减少Windows Git克隆下载[#130908](https://github.com/openclaw/openclaw/pull/130908)

**错误修复**

- 使 macOS AI 加入跟随连接的网关 [#102637](https://github.com/openclaw/openclaw/pull/102637)
- 打开已配置网关的 macOS 仪表板 [#102677](https://github.com/openclaw/openclaw/pull/102677)
- 使新的macOS本地设置启动并可靠地激活[#108764](https://github.com/openclaw/openclaw/pull/108764)
- 使 macOS 入门权限在短屏幕上滚动 [#112507](https://github.com/openclaw/openclaw/pull/112507)
- Gate macOS 网关身份验证远程登录 [#117904](https://github.com/openclaw/openclaw/pull/117904)
- 解锁 macOS 首次启动网关设置 [#119831](https://github.com/openclaw/openclaw/pull/119831)
- 让首次运行的macOS网关迁移完成[#121012](https://github.com/openclaw/openclaw/pull/121012)
- 在共享状态迁移期间恢复 macOS 载入 [#121313](https://github.com/openclaw/openclaw/pull/121313)
- fix（linux）：真实安装失败、安装后修复以及可在桌面伴侣 [#128614](https://github.com/openclaw/openclaw/pull/128614) 中重新安装
- fix（linux）：首次运行桌面启动自动连接工作AI [#129211](https://github.com/openclaw/openclaw/pull/129211)
- fix（state）：在启动检查点表 [#129850](https://github.com/openclaw/openclaw/pull/129850) 之前规范地引导新状态
- fix（桌面）：保留跨模型激活的入门并重新启动 [#131757](https://github.com/openclaw/openclaw/pull/131757)
- 在 macOS 载入期间启动现有的 CLI 网关 [#104051](https://github.com/openclaw/openclaw/pull/104051)
- 让提前返回macOS入门引导并澄清丢失的CLI恢复[#104705](https://github.com/openclaw/openclaw/pull/104705)
- 防止 macOS 载入安装程序输出挂起 [#104827](https://github.com/openclaw/openclaw/pull/104827)
- 防止剪辑和停顿 macOS 载入 [#107598](https://github.com/openclaw/openclaw/pull/107598)
- 拒绝 macOS [#112161](https://github.com/openclaw/openclaw/pull/112161) 上的公共明文网关配置文件
- 通过网关进度步骤保持 macOS 设置轮询 [#114383](https://github.com/openclaw/openclaw/pull/114383)
- 减少macOS入门引导时闲置的CPU使用[#115896](https://github.com/openclaw/openclaw/pull/115896)
- 保持 macOS 登录等待本地网络权限 [#120859](https://github.com/openclaw/openclaw/pull/120859)
- 在网关启动期间等待并发首次运行迁移 [#120959](https://github.com/openclaw/openclaw/pull/120959)
- macOS 上线时显示网关启动失败原因 [#121306](https://github.com/openclaw/openclaw/pull/121306)
- 将 macOS 配置文件登录保留在其托管的 CLI [#121651](https://github.com/openclaw/openclaw/pull/121651) 内
- 在稳定网关端口上隔离命名配置文件 [#122751](https://github.com/openclaw/openclaw/pull/122751)
- 报告终端 macOS 网关启动失败及时 [#126697](https://github.com/openclaw/openclaw/pull/126697)
- 在远​​程 macOS 加入期间自动安装 CLI [#126723](https://github.com/openclaw/openclaw/pull/126723)
- 隔离 macOS 配置文件并报告直接网关端点 [#127007](https://github.com/openclaw/openclaw/pull/127007)
- 在本地网关故障后恢复 macOS 远程登录 [#127033](https://github.com/openclaw/openclaw/pull/127033)
- 在网关更改后保持首次运行的 macOS 登录可见 [#127038](https://github.com/openclaw/openclaw/pull/127038)
- fix（macos）：切换连接模式时保留远程隧道 [#127665](https://github.com/openclaw/openclaw/pull/127665)
- 修复：macOS载入等待网关重新启动[#127713](https://github.com/openclaw/openclaw/pull/127713)
- fix（mac）：在延迟本地故障后保持远程网关连接 [#127723](https://github.com/openclaw/openclaw/pull/127723)
- fix（macos）：使 OpenClaw 设置窗格响应 [#128177](https://github.com/openclaw/openclaw/pull/128177)
- fix（macos）：当网关启动失败时保持CLI安装完成[#128350](https://github.com/openclaw/openclaw/pull/128350)
- fix（macos）：显示正确的首次运行载入进度 [#129435](https://github.com/openclaw/openclaw/pull/129435)
- fix（macos）：在 API 密钥验证期间确认关闭登录 [#129447](https://github.com/openclaw/openclaw/pull/129447)
- fix（macos）：在载入时选择支持的 Node 版本 [#129564](https://github.com/openclaw/openclaw/pull/129564)
- fix（macos）：停止远程登录安装本地网关 [#129572](https://github.com/openclaw/openclaw/pull/129572)
- fix（macos）：显示保存失败而不是无休止的载入加载[#129959](https://github.com/openclaw/openclaw/pull/129959)
- fix（板载）：为未更改的端点保留远程网关 TLS 引脚 [#131042](https://github.com/openclaw/openclaw/pull/131042)
- fix（ui）：当托管CLI缺失[#131974](https://github.com/openclaw/openclaw/pull/131974)时恢复
- 保持 Swift 设备配对与旧网关兼容 [#80656](https://github.com/openclaw/openclaw/pull/80656)
- 防止 Windows 安装程序中的错误 Node 拒绝 [#106252](https://github.com/openclaw/openclaw/pull/106252)
- winget 安装后继续 Windows 设置 Node.js [#106862](https://github.com/openclaw/openclaw/pull/106862)
- macOS 加入期间正确的命名配置文件网关指导 [#121614](https://github.com/openclaw/openclaw/pull/121614)
- fix（macos）：防止陈旧模式开关停止新网关 [#127609](https://github.com/openclaw/openclaw/pull/127609)
- fix（mac）：保持节点服务与最新连接模式一致 [#127732](https://github.com/openclaw/openclaw/pull/127732)
- fix（macos）：解决网关已运行时的入门安装提示 [#128273](https://github.com/openclaw/openclaw/pull/128273)
- fix（macos）：停止将损坏的网关可执行文件报告为就绪 [#129453](https://github.com/openclaw/openclaw/pull/129453)
- fix（linux）：当网关重新启动时保持首次运行登录活动 [#129502](https://github.com/openclaw/openclaw/pull/129502)
- fix（macos）：CLI 安装后暂停的网关设置失去恢复 [#129566](https://github.com/openclaw/openclaw/pull/129566)
- 修复：在验证现有 AI 连接 [#129790](https://github.com/openclaw/openclaw/pull/129790) 时，macOS 安装程序关闭而不发出警告
- 修复：macOS登录重试以静默方式重新检查失败的AI连接[#129863](https://github.com/openclaw/openclaw/pull/129863)
- fix（macos）：入门设置行忽略空白区域中的点击 [#130273](https://github.com/openclaw/openclaw/pull/130273)
- fix（板载）：SSH隧道提示使用HTTPS用于TLS网关[#130313](https://github.com/openclaw/openclaw/pull/130313)
- fix（安装程序）：引脚 NodeSource RPM 存储库 [#132286](https://github.com/openclaw/openclaw/pull/132286)
- 正确macOS远程网关URL指导[#98548](https://github.com/openclaw/openclaw/pull/98548)
- macOS CLI [#98631](https://github.com/openclaw/openclaw/pull/98631) 中的自定义配置路径
- 当 macOS 应用程序在登录时启动时保留自定义 OpenClaw 配置文件 [#99752](https://github.com/openclaw/openclaw/pull/99752)

**文档**

- 将Windows用户指向最新的独立集线器安装程序[#104774](https://github.com/openclaw/openclaw/pull/104774)
- Link macOS 登录应用程序下载 [#111361](https://github.com/openclaw/openclaw/pull/111361)
- docs（安装）：正常应用程序安装的 Surface 桌面应用程序下载链接 [#127991](https://github.com/openclaw/openclaw/pull/127991)

</details>

</Accordion>

<Accordion id="setting-up-openclaw-on-iphone-ipad-and-android" title="在 iPhone、iPad 和 Android 上设置 OpenClaw">

移动设置现在将 QR 和设置代码配对放在首位，因为这是大多数人无论如何都试图找到的内容，而发现的网关以及手动主机和凭据输入仍然可用。安全的官方配对显示手机是否具有完全访问权限或受限访问权限，并且与另一台计算机的未加密连接会自动保持受限访问。

在 [iPhone 和 iPad](/platforms/ios) 上，当连接已受信任或与代码匹配时，有效设置 QR 现在可以在一次扫描中配对并打开主 UI，而不受信任的连接仍会停止等待批准。 OpenClaw 在请求本地网络访问之前解释了配对，让您一次决定一个可选权限，并为符合条件的管理员提供专门的设置对话以进行网关设置和修复，而无需在普通聊天中暴露该特权助手。

在 [Android](/platforms/android) 上，配对在横向、窄屏幕和较大的系统文本中仍然可用。公共网关可以使用正常的证书检查，而 LAN 和 IP 连接保持显式固定，并且再次配对会保留保存的位置和通知选择，而不是悄悄更改同意；撤销的权限仍然被撤销，Google Play 版本仍然仅使用前台位置。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 具有显式限制模式的完全访问移动配对 [#105928](https://github.com/openclaw/openclaw/pull/105928)
- 放置iOS网关QR配对前置和中心[#106111](https://github.com/openclaw/openclaw/pull/106111)
- Guide iOS 通过配对和权限首次启动 [#106129](https://github.com/openclaw/openclaw/pull/106129)
- 使 Android 网关配对在“设置”中突出显示 [#106211](https://github.com/openclaw/openclaw/pull/106211)
- 添加 Android 系统信任和手动网关固定 [#110976](https://github.com/openclaw/openclaw/pull/110976)
- 为iOS添加OpenClaw设置助手[#112420](https://github.com/openclaw/openclaw/pull/112420)
- 使iOS入门引导连接状态清除[#101921](https://github.com/openclaw/openclaw/pull/101921)
- 刷新访问状态屏幕的本机翻译 [#106260](https://github.com/openclaw/openclaw/pull/106260)

**错误修复**

- 替换死端 iOS 网关连接 [#103289](https://github.com/openclaw/openclaw/pull/103289)
- 在 TLS 检查期间保留 Android 网关主机名 [#105072](https://github.com/openclaw/openclaw/pull/105072)
- 使 Android 入门在横向和大文本中响应 [#108405](https://github.com/openclaw/openclaw/pull/108405)
- 配对后保持最新 iOS 设置连接 [#108779](https://github.com/openclaw/openclaw/pull/108779)
- 使用大文本保持 Android 入门操作可到达 [#111747](https://github.com/openclaw/openclaw/pull/111747)
- 将 Android 连接到粘贴的网关主机和端口 [#113722](https://github.com/openclaw/openclaw/pull/113722)
- fix（网关）：停止挂起安全链接创建 [#128545](https://github.com/openclaw/openclaw/pull/128545)
- fix（android）：防止不可用的SMS重新打开入门引导审批[#129077](https://github.com/openclaw/openclaw/pull/129077)
- fix（android）：在载入过程中保留后台位置 [#129543](https://github.com/openclaw/openclaw/pull/129543)
- fix（android）：保留通知转发同意[#129715](https://github.com/openclaw/openclaw/pull/129715)
- fix（android）：在登录过程中保留禁用的位置同意 [#129961](https://github.com/openclaw/openclaw/pull/129961)
- fix（android）：序列化旧网关发现[#131001](https://github.com/openclaw/openclaw/pull/131001)
- fix（ios）：一步完成QR配对 [#131267](https://github.com/openclaw/openclaw/pull/131267)
- 允许 Android 入门权限文本换行 [#103649](https://github.com/openclaw/openclaw/pull/103649)
- 在重新连接期间保持 iOS 网关错误可见 [#105875](https://github.com/openclaw/openclaw/pull/105875)
- fix（android）：跳过范围IPv6发现地址[#130165](https://github.com/openclaw/openclaw/pull/130165)
- fix（ios）：停止将不完整的网关设置归咎于设备存储 [#130407](https://github.com/openclaw/openclaw/pull/130407)
- 在 iOS 加入期间重点关注丢失的网关凭证 [#98189](https://github.com/openclaw/openclaw/pull/98189)

**文档**

- 从本机节点配对中分离手机浏览器恢复 [#123767](https://github.com/openclaw/openclaw/pull/123767)

</details>

</Accordion>

<Accordion id="moving-importing-or-resetting-an-existing-setup" title="移动、导入或重置现有设置">

[ 来自 Claude、Codex 和 Hermes](/install/migrating) 的导入现在发生在临时暂存区域中，其中 OpenClaw 在激活新设置之前会验证或修复模型路线。如果源、导入计划或目标在此过程中发生变化，升级就会停止，而不是根据不同的数据重播半完成的导入。

重新运行入门引导会保留您已经使用的工作区，除非您批准移动，并且指定代理通过支持的创建和仅配置重置来保留他们拥有的凭据。 OpenClaw 在重置之前验证提供程序、网关、迁移和工作区选择，可以将现有数据移动到垃圾箱，但有效确认的重置仍然具有破坏性。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 在发布迁移之前暂存 [#112798](https://github.com/openclaw/openclaw/pull/112798)
- 允许安全地重复使用 main 作为代理 ID [#123609](https://github.com/openclaw/openclaw/pull/123609)

**错误修复**

- Make 失败的 Hermes 导入导入可重试 [#103290](https://github.com/openclaw/openclaw/pull/103290)
- 导入当前 Hermes 状态和提供商合同 [#106758](https://github.com/openclaw/openclaw/pull/106758)
- 删除状态之前验证载入重置 [#111348](https://github.com/openclaw/openclaw/pull/111348)
- 在配置的默认代理上保留加入效果 [#112738](https://github.com/openclaw/openclaw/pull/112738)
- 状态初始化后允许首次运行导入 [#122967](https://github.com/openclaw/openclaw/pull/122967)
- 与自己的代理[#123871](https://github.com/openclaw/openclaw/pull/123871)保持多代理CLI操作
- fix（板载）：保留提供者凭据与指定的第一代理[#127572](https://github.com/openclaw/openclaw/pull/127572)
- 在 Codex 载入期间保留插件所有权 [#103372](https://github.com/openclaw/openclaw/pull/103372)
- 重新运行载入时保留网关设置 [#111569](https://github.com/openclaw/openclaw/pull/111569)
- 在重新运行载入期间保留现有代理工作区 [#111787](https://github.com/openclaw/openclaw/pull/111787)
- 在快速入门载入期间启用显式网关选项 [#112396](https://github.com/openclaw/openclaw/pull/112396)
- 隔离非默认网关工作区和技能 [#114487](https://github.com/openclaw/openclaw/pull/114487)
- 在迁移期间保留旧模型限制 [#114983](https://github.com/openclaw/openclaw/pull/114983)
- 无头复位期间保护 OpenClaw 状态 [#116491](https://github.com/openclaw/openclaw/pull/116491)
- 保留当前模型时尊重显式提供商身份验证 [#117883](https://github.com/openclaw/openclaw/pull/117883)
- 荣耀网关 CLI 手动上线时的设置 [#122961](https://github.com/openclaw/openclaw/pull/122961)
- 让载入导入在运行时状态初始化中幸存 [#123106](https://github.com/openclaw/openclaw/pull/123106)
- 迁移旧版 Ollama 配置文件以进行引导式设置 [#123341](https://github.com/openclaw/openclaw/pull/123341)
- Doctor 处理显式多代理配置文件，不会出现错误故障 [#124010](https://github.com/openclaw/openclaw/pull/124010)
- 全新安装时停止幻像身份验证迁移通知 [#124929](https://github.com/openclaw/openclaw/pull/124929)
- 集团代理进口经典入门引导[#126515](https://github.com/openclaw/openclaw/pull/126515)
- 载入内存导入失败时显示可重试错误 [#126738](https://github.com/openclaw/openclaw/pull/126738)
- 在载入期间尊重配置的系统代理 [#126861](https://github.com/openclaw/openclaw/pull/126861)
- fix（doctor）：迁移后保留 Claude CLI 覆盖可选择 [#126866](https://github.com/openclaw/openclaw/pull/126866)
- 荣誉提供商凭据，同时保留现有模型 [#126946](https://github.com/openclaw/openclaw/pull/126946)
- fix：在入门引导期间保留旧工作区 [#127059](https://github.com/openclaw/openclaw/pull/127059)
- fix（板载）：在配置重置期间保留命名代理配置文件 [#127716](https://github.com/openclaw/openclaw/pull/127716)
- fix（板载）：提供商设置更改了托管队列中的错误代理模型 [#128119](https://github.com/openclaw/openclaw/pull/128119)
- fix（migrate-claude）：重新运行 Claude 迁移会重复导入的指令 [#130429](https://github.com/openclaw/openclaw/pull/130429)
- fix：医生跳过每个代理旧模型参考 [#130725](https://github.com/openclaw/openclaw/pull/130725)
- fix（配置）：添加自定义提供程序时保留现有的主要模型 [#131034](https://github.com/openclaw/openclaw/pull/131034)
- fix（配置）：跨提供商身份验证覆盖保留主要模型 [#131119](https://github.com/openclaw/openclaw/pull/131119)
- 在 Claude CLI 迁移期间保留 Anthropic 模型设置 [#103622](https://github.com/openclaw/openclaw/pull/103622)
- 阻止迁移配置导入中的原型污染 [#106116](https://github.com/openclaw/openclaw/pull/106116)
- 在载入迁移期间处理非目录路径 [#109161](https://github.com/openclaw/openclaw/pull/109161)
- 在加入期间重置每个客服人员的会话历史记录 [#112610](https://github.com/openclaw/openclaw/pull/112610)
- 当载入配置不可读时保护默认工作区 [#114110](https://github.com/openclaw/openclaw/pull/114110)
- 复位丢失时拒绝复位范围 [#115554](https://github.com/openclaw/openclaw/pull/115554)
- Hide 空 Matrix 全新安装时的迁移噪音 [#122808](https://github.com/openclaw/openclaw/pull/122808)
- 在配置中保留系统代理工作区所有权 [#125377](https://github.com/openclaw/openclaw/pull/125377)
- 将遗留模型参考警告指向Doctor的迁移命令[#125660](https://github.com/openclaw/openclaw/pull/125660)
- 在创建的代理上保留命名载入状态 [#126463](https://github.com/openclaw/openclaw/pull/126463)
- fix（板载）：当 --import-from 未知时命名可用的提供商 [#127780](https://github.com/openclaw/openclaw/pull/127780)
- fix（stepfun）：重复载入时保留选定的模型 [#129045](https://github.com/openclaw/openclaw/pull/129045)
- fix（板载）：保留保存的技能包管理器[#130438](https://github.com/openclaw/openclaw/pull/130438)

</details>

</Accordion>

<Accordion id="automating-setup-and-recovering-from-interruptions" title="自动设置和从中断中恢复">

[非交互式加入](/start/wizard-cli-automation) 现在会在创建代理或写入配置之前拒绝无效的提供程序、身份验证、网关、工作区和冲突的流程选择。当请求 `--json` 时，失败会返回一个机器可读的结果，而不是空的或混合的输出，并且在已知当前持有者的情况下，同一配置文件的并发设置会很快失败，而不是坐在那里看起来冻结。

取消或中断的设置会撤销过时的工作，而失败的提供商登录或本地模型准备可以重试，而无需取消新的尝试。网关运行状况故障保留在带有原始诊断和恢复提示的设置内，但 `--json` 不会放弃风险确认，并且故意跳过服务启动仍然可以在没有可访问网关的情况下完成，因此自动化必须检查报告的运行状况，而不是仅信任退出状态。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 按照一项安全顺序进行设置和医生维修 [#114375](https://github.com/openclaw/openclaw/pull/114375)
- 在托管设置中添加一键取消 [#118953](https://github.com/openclaw/openclaw/pull/118953)

**错误修复**

- 恢复仪表板并中断的首次设置 [#118388](https://github.com/openclaw/openclaw/pull/118388)
- 使中断的登录安全地取消、重试和恢复 [#121415](https://github.com/openclaw/openclaw/pull/121415)
- 将运行状况检查失败保留在设置流程中 [#126758](https://github.com/openclaw/openclaw/pull/126758)
- fix（ui）：防止中断的模型设置阻止重试 [#127657](https://github.com/openclaw/openclaw/pull/127657)
- 在安装程序写入之前拒绝无效的入门选项 [#111680](https://github.com/openclaw/openclaw/pull/111680)
- 在基线设置期间保留无效配置 [#112010](https://github.com/openclaw/openclaw/pull/112010)
- 网关重新启动后恢复过期的设置向导 [#112286](https://github.com/openclaw/openclaw/pull/112286)
- 恢复新鲜的非交互式入门引导 [#113601](https://github.com/openclaw/openclaw/pull/113601)
- 在创建设置状态之前验证非交互式载入 [#114823](https://github.com/openclaw/openclaw/pull/114823)
- 保持托管设置退出以停止网关 [#115671](https://github.com/openclaw/openclaw/pull/115671)
- 取消后防止重复远程设置 [#115856](https://github.com/openclaw/openclaw/pull/115856)
- 在网关配置重新加载期间保持托管向导处于活动状态 [#120582](https://github.com/openclaw/openclaw/pull/120582)
- 序列化入门和插件安装 [#121482](https://github.com/openclaw/openclaw/pull/121482)
- 锁定释放失败后网关设置恢复 [#121915](https://github.com/openclaw/openclaw/pull/121915)
- 终端向导状态后允许替换设置 [#122054](https://github.com/openclaw/openclaw/pull/122054)
- 当另一个入门会话处于活动状态时快速失败 [#122968](https://github.com/openclaw/openclaw/pull/122968)
- 让故意未启动的网关完成上线 [#123857](https://github.com/openclaw/openclaw/pull/123857)
- 通过 Ctrl-D 彻底取消载入或关闭标准输入 [#124780](https://github.com/openclaw/openclaw/pull/124780)
- 在 JSON 摘要中报告登录运行状况故障 [#126801](https://github.com/openclaw/openclaw/pull/126801)
- 在远程加入中拒绝本地网关凭据 [#127015](https://github.com/openclaw/openclaw/pull/127015)
- fix（板载）：针对一个故障停止打印两条矛盾的修复行 [#127698](https://github.com/openclaw/openclaw/pull/127698)
- fix（板载）：在没有有效的customBindHost的情况下拒绝--gateway-bind自定义[#127779](https://github.com/openclaw/openclaw/pull/127779)
- fix（板载）：JSON命令在没有终端的情况下不返回输出[#129437](https://github.com/openclaw/openclaw/pull/129437)
- fix（cli）：当现有配置无效时发出 JSON 失败 [#129578](https://github.com/openclaw/openclaw/pull/129578)
- refactor（system-agent）：统一操作员切换和提案生命周期 [#131630](https://github.com/openclaw/openclaw/pull/131630)
- 完成后允许立即更换设置向导 [5c308e0](https://github.com/openclaw/openclaw/commit/5c308e0)
- 在完成向导会话之前释放设置许可 [f3e1efe](https://github.com/openclaw/openclaw/commit/f3e1efe)
- 拒绝未知的非交互式入门引导身份验证选择 [#111409](https://github.com/openclaw/openclaw/pull/111409)
- 在自动加入期间忽略空白工作区输入 [#115537](https://github.com/openclaw/openclaw/pull/115537)
- 拒绝矛盾的非交互式 TUI 入门引导 [#115573](https://github.com/openclaw/openclaw/pull/115573)
- 拒绝冲突的自定义模型输入标志 [#115595](https://github.com/openclaw/openclaw/pull/115595)
- 在本地加入期间拒绝仅远程标志 [#115636](https://github.com/openclaw/openclaw/pull/115636)
- 当请求的守护程序安装失败时加载失败 [#122845](https://github.com/openclaw/openclaw/pull/122845)
- 防止工作区设置失败发布入门引导配置 [#124092](https://github.com/openclaw/openclaw/pull/124092)
- 从环境载入中拒绝命令形状的 API 密钥 [#126776](https://github.com/openclaw/openclaw/pull/126776)
- 拒绝忽略的入门引导建议操作选项 [#126973](https://github.com/openclaw/openclaw/pull/126973)
- 使入门引导身份验证选择帮助匹配接受的值 [#127030](https://github.com/openclaw/openclaw/pull/127030)
- fix（板载）：在选项验证失败时发出 JSON [#127794](https://github.com/openclaw/openclaw/pull/127794)
- fix（板载）：针对剩余的非交互式选项拒绝发出 JSON [#127976](https://github.com/openclaw/openclaw/pull/127976)
- fix（入门）：保留 JSON 输出以拒绝设置选项 [#128542](https://github.com/openclaw/openclaw/pull/128542)
- fix（板载）：拒绝无效的提供商选择，而没有静默成功 [#128574](https://github.com/openclaw/openclaw/pull/128574)
- fix（cli）：使托管网关和 Node 恢复提示可操作 [#129243](https://github.com/openclaw/openclaw/pull/129243)
- fix（节点）：损坏的 Node 服务建议修复网关 [#129545](https://github.com/openclaw/openclaw/pull/129545)
- fix（入门）：恢复提示针对错误的网关[#129577](https://github.com/openclaw/openclaw/pull/129577)
- fix（设置）：因无效基线配置 [#129867](https://github.com/openclaw/openclaw/pull/129867) 发出 JSON 失败
- fix（onboarding）：缺少ESM包错误省略修复提示[#130159](https://github.com/openclaw/openclaw/pull/130159)
- fix（onboarding）：远程重试提示省略所需的风险确认 [#130174](https://github.com/openclaw/openclaw/pull/130174)
- fix（cli）：针对拒绝的入门引导推荐选项 [#130245](https://github.com/openclaw/openclaw/pull/130245) 返回 JSON 错误
- 修复（板载）：远程设置不再启用本地挂钩[#130292](https://github.com/openclaw/openclaw/pull/130292)
- fix（doctor）：停止将延迟创建的会话目录标记为缺失 [#130704](https://github.com/openclaw/openclaw/pull/130704)
- fix（向导）：需要文字 true 进行确认 [#131238](https://github.com/openclaw/openclaw/pull/131238)

**文档**

- 修复非交互式入门命令示例 [#121954](https://github.com/openclaw/openclaw/pull/121954)
- 正确的载入命令和 Google Chat 凭证 [#118936](https://github.com/openclaw/openclaw/pull/118936)
- 更正载入设置命令 [#126964](https://github.com/openclaw/openclaw/pull/126964)

</details>

</Accordion>

</AccordionGroup>
