---
title: "v2026.8.1：浏览器和计算机使用"
description: "通过隔离的托管配置文件或您共享的 Chrome 选项卡登录的浏览器会话，以及配对 Mac 和明确启用的 Windows 计算机上的计算机使用。"
---

OpenClaw 现在可以通过隔离的托管配置文件或您选择共享的确切 Chrome 选项卡来使用 [ 登录浏览器会话](/tools/browser-login)。在 macOS 上，支持的 cookie 可以在本地导入或同步到远程管理的浏览器，以获得您选择的站点白名单，而官方 Chrome 扩展则将实时访问范围保持在共享选项卡范围内。浏览器操作、下载和桌面输入也保持附加到其预期的选项卡、页面状态和计算机，取消和超时会影响到他们拥有的更多本地和远程工作。

[计算机 Use](/nodes/computer-use) 可以使用配对 Mac 和显式启用的 Windows 计算机上支持的应用程序和窗口，并且桌面面板可以打开拥有会话的计算机。 Control 仍然需要适用的配对、策略和操作系统权限，仅查看会话拒绝输入，并且 Linux 控制仍处于试验阶段。

<AccordionGroup>

<Accordion id="browser-setup" title="浏览器设置">

在 Mac 上，在批准钥匙串或触摸 ID 访问后，您可以将兼容 Cookie 从 Chrome、Brave、Edge 或 Chromium 显式复制到 [ 隔离托管浏览器](/tools/browser) 中。如果该浏览器在另一台 OpenClaw 计算机上运行，​​则单独的选择加入同步可以仅向您允许的站点发送一次或连续 cookie。这两个路径都不会复制本地存储或 IndexedDB，并且设备绑定会话仍会要求您再次登录。

对于已打开的浏览器，应用程序页面现在指向官方 [Chrome 扩展 ](/tools/chrome-extension)，并且命令行可以准备其本地连接。您可以决定要共享哪些选项卡，每个共享选项卡都可以有自己的副驾驶，并且将页面、支持的文档或线程或选定的文本发送到主对话是一次性切换，而不是继续访问浏览器的其余部分。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 在侧边栏浏览器中打开 macOS 仪表板链接 [#102899](https://github.com/openclaw/openclaw/pull/102899)
- 向 macOS 仪表板链接浏览器添加选项卡 [#103438](https://github.com/openclaw/openclaw/pull/103438)
- 将 Chrome-family cookie 导入托管浏览器配置文件 [#104057](https://github.com/openclaw/openclaw/pull/104057)
- 将浏览器登录导入添加到macOS应用程序[#104177](https://github.com/openclaw/openclaw/pull/104177)
- 将 macOS Cookie 导入警报替换为仪表板横幅 [#104591](https://github.com/openclaw/openclaw/pull/104591)
- 添加安全每个选项卡 Chrome 副驾驶面板 [#109817](https://github.com/openclaw/openclaw/pull/109817)
- 从 Chrome 分机发送页面到主会话 [#111158](https://github.com/openclaw/openclaw/pull/111158)
- 为Chrome扩展继电器[#117915](https://github.com/openclaw/openclaw/pull/117915)添加Puppeteer支持
- 将 Chrome Web Store 设为主要扩展操作 [#123377](https://github.com/openclaw/openclaw/pull/123377)
- 将 Mac 浏览器 cookie 同步到远程网关配置文件 [#123494](https://github.com/openclaw/openclaw/pull/123494)
- 在对接的 Control UI 浏览器中打开外部链接 [#123912](https://github.com/openclaw/openclaw/pull/123912)
- 在状态和医生中显示托管的 Chrome 图形详细信息 [#104291](https://github.com/openclaw/openclaw/pull/104291)
- 在直接诊断中保留浏览器身份 CDP 诊断 [#104678](https://github.com/openclaw/openclaw/pull/104678)
- fix（浏览器）：升级后 Chrome 扩展版本漂移时发出警告 [#119641](https://github.com/openclaw/openclaw/pull/119641)

**错误修复**

- 支持官方 Chrome Web Store 扩展 [#124775](https://github.com/openclaw/openclaw/pull/124775) 的本机引导
- 修复具有原型名称和自定义状态路径的浏览器配置文件 [#101694](https://github.com/openclaw/openclaw/pull/101694)
- 使浏览器配置文件指导尊重配置的默认值 [#102582](https://github.com/openclaw/openclaw/pull/102582)
- 保留可操作的浏览器无显示故障和无头恢复 [#102946](https://github.com/openclaw/openclaw/pull/102946)
- 修复 macOS 仪表板选项卡重用和重新排序 [#103464](https://github.com/openclaw/openclaw/pull/103464)
- 仅在浏览时显示 macOS cookie 导入优惠 [#106255](https://github.com/openclaw/openclaw/pull/106255)
- 以有用宽度打开macOS仪表板链接[#107798](https://github.com/openclaw/openclaw/pull/107798)
- 安装根目录为空时检测Windows浏览器[#111256](https://github.com/openclaw/openclaw/pull/111256)
- fix（浏览器）：一致地检测选定的配置文件可执行文件[#129394](https://github.com/openclaw/openclaw/pull/129394)
- fix（浏览器）：本机引导程序在回复 [#132212](https://github.com/openclaw/openclaw/pull/132212) 之前停止
- 删除 macOS 链接浏览器选项卡上方的间隙 [#103469](https://github.com/openclaw/openclaw/pull/103469)
- 恢复主机本地浏览器配置文件管理 [#104616](https://github.com/openclaw/openclaw/pull/104616)
- 在自动发现期间跳过不可用的浏览器 [#111951](https://github.com/openclaw/openclaw/pull/111951)
- 返回不健康浏览器医生报告的失败退出状态 [#116811](https://github.com/openclaw/openclaw/pull/116811)
- Resolve在浏览器医生中打包Chrome扩展资产[#126279](https://github.com/openclaw/openclaw/pull/126279)
- fix（浏览器）：在扩展安装 [#130626](https://github.com/openclaw/openclaw/pull/130626) 期间拒绝非十进制 --wait-ms
- fix（浏览器）：报告缺少运行时目标的本机主机 [#131907](https://github.com/openclaw/openclaw/pull/131907)
- fix（浏览器）：避免本机主机拒绝后丢失目录诊断 [#132891](https://github.com/openclaw/openclaw/pull/132891)

**文档**

- Document macOS cookie 同步到远程浏览器 [#123537](https://github.com/openclaw/openclaw/pull/123537)
- 正确的Docker沙盒浏览器设置文档[#115254](https://github.com/openclaw/openclaw/pull/115254)
- Document mcporter Chrome 继电器自动检测 [#118066](https://github.com/openclaw/openclaw/pull/118066)
- docs：声明的本地浏览器配置文件必须设置 cdpPort 或 cdpUrl [#129923](https://github.com/openclaw/openclaw/pull/129923)

</details>

</Accordion>

<Accordion id="browsing-and-page-actions" title="浏览和页面操作">

导航现在返回页面的紧凑的新视图以进行下一步操作，并且快照引用与最终有界快照中显示的内容保持一致。移动到新文档或关闭页面后，多操作批处理会暂停，以便下一步可以使用新状态，而新选项卡可以在后台打开，并且所选区域设置、时区和设备设置仍附加到受控页面。代理还可以读取有界的可见文本，检查最近的网络请求和未捕获的页面错误，并在快照中查找匹配的控件，而无需自定义页面评估。页面控制的文本和诊断仍然不受信任，现有会话配置文件无法收集页面错误日志。

命令行用户可以针对一个选项卡运行 [repeatable JSON plan](/cli/browser)，保留有序结果，并选择失败是否停止批次或允许完成剩余操作。对话可以显示活动选项卡的标题、URL 和最新缩略图，然后在浏览器面板中打开匹配的页面，同时保持其会话配置文件和计算机连接。取消或超时的下载会停止，但不会声明后续请求的文件或发布不需要的部分输出，尽管已处于最终保存状态的下载仍可以完成。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将批处理浏览器操作添加到CLI [#111457](https://github.com/openclaw/openclaw/pull/111457)
- 让浏览器批处理和快照更安全继续 [#113749](https://github.com/openclaw/openclaw/pull/113749)
- 添加一键浏览器页面问答 [#113861](https://github.com/openclaw/openclaw/pull/113861)
- 添加范围和结构化浏览器提取 [#113938](https://github.com/openclaw/openclaw/pull/113938)
- 浏览器导航后返回紧凑页面状态 [#114814](https://github.com/openclaw/openclaw/pull/114814)
- feat（浏览器）：代理 requests/text/emulate + 快照查询，以及内联浏览器选项卡缩略图卡 [#131592](https://github.com/openclaw/openclaw/pull/131592)
- feat（浏览器）：暴露页面错误操作[#131906](https://github.com/openclaw/openclaw/pull/131906)
- docs（浏览器）：在工具架构和文档 [#111381](https://github.com/openclaw/openclaw/pull/111381) 中公开 batch/doubleClick/scrollIntoView/labels
- 删除隐藏的模型支持的浏览器提取[#120101](https://github.com/openclaw/openclaw/pull/120101)
- improve（浏览器）：加速重复DOM快照完成[#128036](https://github.com/openclaw/openclaw/pull/128036)

**错误修复**

- 让顺序浏览器操作在预算内完成 [#104659](https://github.com/openclaw/openclaw/pull/104659)
- 强制执行浏览器角色快照的最终大小预算 [#104689](https://github.com/openclaw/openclaw/pull/104689)
- 打开代理浏览器选项卡而不窃取焦点 [#105356](https://github.com/openclaw/openclaw/pull/105356)
- 保留浏览器区域设置、时区和设备覆盖 [#119695](https://github.com/openclaw/openclaw/pull/119695)
- 停止托管浏览器上传触发重复事件 [#103777](https://github.com/openclaw/openclaw/pull/103777)
- 受保护操作后刷新浏览器目标 [#104094](https://github.com/openclaw/openclaw/pull/104094)
- 使浏览器文件选择器上传请求拥有的[#105151](https://github.com/openclaw/openclaw/pull/105151)
- fix（浏览器）：不要窃取头部屏幕截图捕获的焦点 [#105393](https://github.com/openclaw/openclaw/pull/105393)
- 识别 Web 获取中的混合大小写媒体类型 [#108230](https://github.com/openclaw/openclaw/pull/108230)
- 保持共享缓存内容的 Web 请求区分大小写 [#111281](https://github.com/openclaw/openclaw/pull/111281)
- 加快提取大型样式较多的网页 [#115584](https://github.com/openclaw/openclaw/pull/115584)
- fix（浏览器）：解析代理目录以获取屏幕截图描述[#121941](https://github.com/openclaw/openclaw/pull/121941)
- Stop 取消了浏览器下载以捕获后续文件 [#124382](https://github.com/openclaw/openclaw/pull/124382)
- fix（ui）：显示浏览器检查失败而不附加陈旧元素 [#128263](https://github.com/openclaw/openclaw/pull/128263)
- fix（浏览器）：停止下载超时后挂起 [#129899](https://github.com/openclaw/openclaw/pull/129899)
- fix（浏览器）：跨快照请求恢复新元素标记[#130220](https://github.com/openclaw/openclaw/pull/130220)
- fix（浏览器）：接受常见键盘别名[#130401](https://github.com/openclaw/openclaw/pull/130401)
- fix（浏览器）：保留精确的选择选项值[#130410](https://github.com/openclaw/openclaw/pull/130410)
- fix（浏览器）：隐藏选择器过早完成等待 [#130508](https://github.com/openclaw/openclaw/pull/130508)
- fix（浏览器）：保留文字名称和格式化程序拥有的快照引用 [#130599](https://github.com/openclaw/openclaw/pull/130599)
- fix（浏览器）：使快照引用与带引号的标签和框架一起使用 [#130623](https://github.com/openclaw/openclaw/pull/130623)
- fix（浏览器）：停止将失败的嵌套批次报告为成功 [#130809](https://github.com/openclaw/openclaw/pull/130809)
- fix（浏览器）：解析未命名的角色引用并初始化 AX 标记 [#130881](https://github.com/openclaw/openclaw/pull/130881)
- fix（浏览器）：单击第一个重复的原始可访问性参考 [#130929](https://github.com/openclaw/openclaw/pull/130929)
- 修复：保存输出失败时取消浏览器下载 [#131048](https://github.com/openclaw/openclaw/pull/131048)
- fix（浏览器）：立即返回选择器不匹配快照[#131441](https://github.com/openclaw/openclaw/pull/131441)
- fix（浏览器）：将面板保留在会话浏览器配置文件上 [#132159](https://github.com/openclaw/openclaw/pull/132159)
- 标准化本地浏览器请求路径 [#103727](https://github.com/openclaw/openclaw/pull/103727)
- 拒绝十六进制浏览器点击坐标[#104440](https://github.com/openclaw/openclaw/pull/104440)
- 标准化浏览器地理定位权限来源[#105092](https://github.com/openclaw/openclaw/pull/105092)
- 报告新打开的浏览器选项卡提交的 URL [#111374](https://github.com/openclaw/openclaw/pull/111374)
- 在 DuckDuckGo 结果中保持突出显示的单词完整 [#111460](https://github.com/openclaw/openclaw/pull/111460)
- 在用户代理更改后防止过时的 Web 获取 [#111806](https://github.com/openclaw/openclaw/pull/111806)
- 在延迟注册期间保留浏览器工具输出架构 [#113925](https://github.com/openclaw/openclaw/pull/113925)
- fix（浏览器）：绑定批处理操作文件[#115882](https://github.com/openclaw/openclaw/pull/115882)
- 允许在选项卡绑定浏览器中提取页面 Copilot 运行 [#116779](https://github.com/openclaw/openclaw/pull/116779)
- 使浏览器截图共享引导能力-中立 [#125597](https://github.com/openclaw/openclaw/pull/125597)
- fix（浏览器）：保持检查状态与错误措辞无关 [#128625](https://github.com/openclaw/openclaw/pull/128625)
- fix（浏览器）：停止从发布文件[#128651](https://github.com/openclaw/openclaw/pull/128651)取消下载
- fix（浏览器）：将操作 URL 保留在网关传输之外 [#128870](https://github.com/openclaw/openclaw/pull/128870)

**文档**

- 澄清浏览器 JSON 标志位置 [#103155](https://github.com/openclaw/openclaw/pull/103155)
- [AI- Assist] 文档（浏览器）：教授代码模式全局调用，而不是删除的 tools.call API [#128456](https://github.com/openclaw/openclaw/pull/128456)

</details>

</Accordion>

<Accordion id="computer-use" title="电脑使用">

在配对的 Mac 上，[电脑Use](/nodes/computer-use)可以捕获桌面并通过指针、键盘、滚动、拖动和等待操作使用支持的应用程序、窗口和元素。设置现在显示所选的提供商、辅助功能和屏幕录制状态，以及其支持服务是否准备就绪。使用这些控件仍然需要配对、适用的命令和工具策略、所需的武装以及macOS权限OpenClaw报告但不能批准。

显式启用的 Windows 计算机现在使用打包的计算机使用驱动程序，无需单独安装服务。 Linux 也使用打包的路线，并且仍处于实验阶段，完整的实时点击和键入行为在此版本中尚未得到验证。 Codex 计算机使用仍然是一个单独的 macOS 集成，具有自己的准备情况和恢复检查。

桌面面板可以显示主 OpenClaw 计算机、Labs 无头 Linux 桌面或显式启用的配对 Mac、Windows 或 Linux 计算机，并且会话按钮可以打开拥有该工作的计算机。默认情况下，配对流式传输处于关闭状态，并且仅查看会话会阻止键盘、指针和剪贴板输入。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- Control 将 Mac 桌面与电脑工具 [#102776](https://github.com/openclaw/openclaw/pull/102776) 配对
- 添加 Codex 计算机使用的实时准备和恢复 [#103331](https://github.com/openclaw/openclaw/pull/103331)
- 让智能体用筛选工具安排Control UI [#108737](https://github.com/openclaw/openclaw/pull/108737)
- 添加实验Windows和Linux电脑控制[#112267](https://github.com/openclaw/openclaw/pull/112267)
- 默认启用macOS计算机Control，具有更清晰的权限诊断[#115280](https://github.com/openclaw/openclaw/pull/115280)
- 将CUA守护程序替换为打包的驱动程序SDK [#117205](https://github.com/openclaw/openclaw/pull/117205)
- 在桌面面板中查看网关机器 [#122545](https://github.com/openclaw/openclaw/pull/122545)
- 管理无头Linux主机桌面[#122677](https://github.com/openclaw/openclaw/pull/122677)
- 查看 Control UI [#122724](https://github.com/openclaw/openclaw/pull/122724) 中的配对节点桌面
- 在桌面预览中添加全屏模式 [#123278](https://github.com/openclaw/openclaw/pull/123278)
- 采用Peekaboo的检查运行时macOS计算机Control [#123420](https://github.com/openclaw/openclaw/pull/123420)
- 向Windows和Linux计算机工具[#123604](https://github.com/openclaw/openclaw/pull/123604)添加背景窗口和元素控件
- 将嵌入式 CUA 计算机控制提供程序添加到 macOS [#123635](https://github.com/openclaw/openclaw/pull/123635)
- 添加对 computer.act v2 [#123801](https://github.com/openclaw/openclaw/pull/123801) 的原生 Peekaboo 支持
- 在设置中显示计算机Control准备情况 [#124093](https://github.com/openclaw/openclaw/pull/124093)
- 更新macOS Peekaboo至3.9.0 [#104398](https://github.com/openclaw/openclaw/pull/104398)
- Gate 电脑上的 Peekaboo 桥 Control [#106531](https://github.com/openclaw/openclaw/pull/106531)
- perf（计算机）：停止重新发送未更改的计算机使用屏幕截图 [#129924](https://github.com/openclaw/openclaw/pull/129924)
- 打包便携式macOS高程主机安装程序[#123675](https://github.com/openclaw/openclaw/pull/123675)

**错误修复**

- 恢复 Codex 计算机与当前 ChatGPT 桌面资源一起使用 [#103470](https://github.com/openclaw/openclaw/pull/103470)
- 停止重复计算机使用准备状态停顿 [#113393](https://github.com/openclaw/openclaw/pull/113393)
- 打开每个移动会话自己的桌面 [#123412](https://github.com/openclaw/openclaw/pull/123412)
- 验证 Windows 和 Linux 节点上的 CUA 驱动程序工件 [#123986](https://github.com/openclaw/openclaw/pull/123986)
- 修复macOS后台电脑使用并添加现场证明装备[#123991](https://github.com/openclaw/openclaw/pull/123991)
- 修复计算机使用驱动程序验证和批准后功能 [#124128](https://github.com/openclaw/openclaw/pull/124128)
- 跨提供商协调计算机使用参考生命周期 [#124374](https://github.com/openclaw/openclaw/pull/124374)
- CUA 处于活动状态时恢复桌面计算机控制 [#124863](https://github.com/openclaw/openclaw/pull/124863)
- 刷新陈旧的隔离计算机使用捆绑包 [#126080](https://github.com/openclaw/openclaw/pull/126080)
- 解锁 Codex 计算机安装后使用 [#126699](https://github.com/openclaw/openclaw/pull/126699)
- fix（网关）：恢复仅查看macOS桌面观察[#128306](https://github.com/openclaw/openclaw/pull/128306)
- fix（云）：将计算机控制绑定到会话桌面 [#132374](https://github.com/openclaw/openclaw/pull/132374)
- 让Codex在启用计算机控制的情况下启动[#102944](https://github.com/openclaw/openclaw/pull/102944)
- 防止停滞的过程检查阻塞 Codex 计算机使用 [#109091](https://github.com/openclaw/openclaw/pull/109091)
- 保持仅查看的云工作人员桌面连接 [#121256](https://github.com/openclaw/openclaw/pull/121256)
- 直接打开当前会话桌面 [#122992](https://github.com/openclaw/openclaw/pull/122992)
- 使 macOS CUA 驱动程序切换原子 [#123845](https://github.com/openclaw/openclaw/pull/123845)
- 首次使用时初始化CUA资源 [#124156](https://github.com/openclaw/openclaw/pull/124156)
- 允许测试较新的 Codex 桌面应用程序服务器 [#125883](https://github.com/openclaw/openclaw/pull/125883)
- 在工件检查期间仅解决 ESM- CUA 驱动程序 [#126120](https://github.com/openclaw/openclaw/pull/126120)
- fix（codex）：允许计算机在完成的运行中重复使用[#126399](https://github.com/openclaw/openclaw/pull/126399)
- fix（codex）：桌面更新后保持计算机使用正常 [#127778](https://github.com/openclaw/openclaw/pull/127778)
- fix（codex）：市场源升级后恢复计算机使用 [#129551](https://github.com/openclaw/openclaw/pull/129551)
- fix（ui）： 桌面不跟随聊天会话机器 [#132255](https://github.com/openclaw/openclaw/pull/132255)
- fix（计算机）：在恢复期间保持观察可用 [#133188](https://github.com/openclaw/openclaw/pull/133188)
- fix（cua-computer）：将缩放图像返回到模型[#133266](https://github.com/openclaw/openclaw/pull/133266)
- 在 Windows 和 Linux 节点上加载 CUA 计算机驱动程序 [#120169](https://github.com/openclaw/openclaw/pull/120169)
- 保留旧版 CUA 驱动程序路径兼容性 [#120502](https://github.com/openclaw/openclaw/pull/120502)
- 接受 noVNC 扩展剪贴板框架 [#121276](https://github.com/openclaw/openclaw/pull/121276)
- 将 macOS 伴侣固定到最终确定的 Peekaboo 4.2.1 [#125208](https://github.com/openclaw/openclaw/pull/125208)
- 保持更新 Codex 符合条件的桌面应用程序服务器 [#126450](https://github.com/openclaw/openclaw/pull/126450)
- 恢复精确工具允许列表的屏幕 [#126691](https://github.com/openclaw/openclaw/pull/126691)
- fix（macos）：避免发布已停用的 CUA 启动端点 [#131905](https://github.com/openclaw/openclaw/pull/131905)

**文档**

- 刷新 Peekaboo Bridge 指南的本地翻译 [#106543](https://github.com/openclaw/openclaw/pull/106543)
- 刷新cua驱动平台和MCP工具文档[78b49f3](https://github.com/openclaw/openclaw/commit/78b49f3)
- 添加cua计算机故障排除指导[#112502](https://github.com/openclaw/openclaw/pull/112502)
- 修复Windows和Linux计算机使用部分链接[#123892](https://github.com/openclaw/openclaw/pull/123892)
- 明确计算机使用授权边界 [#124355](https://github.com/openclaw/openclaw/pull/124355)
- 刷新发布基线和 CUA 计算机平台文档 [#125586](https://github.com/openclaw/openclaw/pull/125586)

</details>

</Accordion>

<Accordion id="remote-screens-and-devices" title="远程屏幕和设备">

OpenClaw 现在使浏览器和计算机在明确选择的合格 [ 配对计算机 ](/gateway/cloud-sessions) 上保持工作。断开连接、不明确或不合格的选择器会返回该设备的可操作错误，而未固定的自动浏览器路由在策略允许时仍可以使用主机。

浏览器上传和下载可以在主机和远程浏览器节点之间移动，无需共享文件系统，并且完成的下载作为可读本地文件返回。终端上传可以将安全引用的远程路径放入活动 shell 中，而无需按 Enter 键。传输大小和授权限制仍然有效，格式错误的屏幕截图和 Canvas 数据在发送前停止，Android 辅助功能控制仍然是网关或代理尚无法调用的第三方构建的选择加入本地基础。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 将文件直接上传到Control UI终端 [#107364](https://github.com/openclaw/openclaw/pull/107364)
- 添加终端上传进度、重试、取消控制 [#107789](https://github.com/openclaw/openclaw/pull/107789)
- 按能力选择计算机用节点 [#112107](https://github.com/openclaw/openclaw/pull/112107)
- 添加选择加入 Android 可访问性 UI 执行者 [#112232](https://github.com/openclaw/openclaw/pull/112232)

**错误修复**

- 恢复 Android 应用程序中的画布演示 [#103330](https://github.com/openclaw/openclaw/pull/103330)
- 在 macOS [#105336](https://github.com/openclaw/openclaw/pull/105336) 上恢复范围内网关托管的 Canvas
- 跨路由配置浏览器节点引脚 [#117087](https://github.com/openclaw/openclaw/pull/117087)
- 使浏览器节点主机下载可从网关使用 [#103328](https://github.com/openclaw/openclaw/pull/103328)
- 一致解析Unicode浏览器节点显示名称[#103548](https://github.com/openclaw/openclaw/pull/103548)
- 在设备调度之前拒绝无效画布A2UI JSONL [#103713](https://github.com/openclaw/openclaw/pull/103713)
- 为批准的本地节点命令保留身份 [#103886](https://github.com/openclaw/openclaw/pull/103886)
- 停止在无头节点上广告已禁用的浏览器代理 [#103894](https://github.com/openclaw/openclaw/pull/103894)
- 让批准的命令在 macOS 白名单节点上运行 [#104337](https://github.com/openclaw/openclaw/pull/104337)
- 在预检期间拒绝超大目录传输 [#106293](https://github.com/openclaw/openclaw/pull/106293)
- 定时 iOS 提醒在到期时间发出通知 [#106376](https://github.com/openclaw/openclaw/pull/106376)
- 保留启动击键并强化远程终端会话 [#107214](https://github.com/openclaw/openclaw/pull/107214)
- 在重输出时保持嵌入式端子连接 [#107348](https://github.com/openclaw/openclaw/pull/107348)
- 防止计算机控制瞄准错误的配对节点 [#112503](https://github.com/openclaw/openclaw/pull/112503)
- 使上传与远程浏览器节点一起工作 [#115291](https://github.com/openclaw/openclaw/pull/115291)
- 取消转弯时停止浏览器节点发现 [#124880](https://github.com/openclaw/openclaw/pull/124880)
- 在无头节点主机上恢复静态插件命令 [#127043](https://github.com/openclaw/openclaw/pull/127043)
- 澄清畸形节点调用参数错误 [#101838](https://github.com/openclaw/openclaw/pull/101838)
- 返回 Windows [#102813](https://github.com/openclaw/openclaw/pull/102813) 上仅基本名称的代理核心文件名
- 拒绝格式错误的 Canvas 快照数据 [#108987](https://github.com/openclaw/openclaw/pull/108987)
- 传送仅标题和仅正文节点通知 [#113747](https://github.com/openclaw/openclaw/pull/113747)
- 拒绝畸形电脑早期使用截图[#114392](https://github.com/openclaw/openclaw/pull/114392)

**文档**

- 添加 iPhone 完整指南 HealthKit 摘要 [8a375c4](https://github.com/openclaw/openclaw/commit/8a375c4)
- 正确的macOS节点命令文档[#103878](https://github.com/openclaw/openclaw/pull/103878)
- 更正 system.which 节点示例 [#103960](https://github.com/openclaw/openclaw/pull/103960)

</details>

</Accordion>

<Accordion id="browser-targeting-privacy-and-timeouts" title="浏览器定位、隐私和超时">

选项卡句柄、页面引用、屏幕截图和桌面操作现在仍然绑定到创建它们的选项卡、页面、显示、请求和提供程序。过时或不明确的状态会因错误而停止，取消和超时会影响到他们拥有的更多本地和远程工作，并且中继重新连接仅恢复仍共享的选项卡。

远程浏览器连接经过验证并保持固定到其配置的端点，连接凭据在支持的路径上进行编辑，页面控制的文本作为不受信任的输入进入模型上下文。 [Browser](/tools/browser) 和 Canvas 屏幕截图仍然可供检查代理使用，但不再自动附加到出站回复中。清理仍然仅限于 OpenClaw 拥有的浏览器和选项卡，较旧的扩展客户端可能需要升级或全新配对才能获得较新的继电保护。

<details class="release-source-toggle">
<summary>来源和完整变更列表</summary>

**改进**

- 添加浏览器中继身份验证 v2 [#120526](https://github.com/openclaw/openclaw/pull/120526)
- 允许在暂时性故障后重试一个浏览器工具 [#110607](https://github.com/openclaw/openclaw/pull/110607)
- 在网关启动时保持浏览器上传清理惰性 [#126136](https://github.com/openclaw/openclaw/pull/126136)
- fix（浏览器）：按需加载Playwright运行时[#127049](https://github.com/openclaw/openclaw/pull/127049)
- 诊断保持不活动状态的 Web 获取代理设置 [#109778](https://github.com/openclaw/openclaw/pull/109778)

**错误修复**

- 保护经过身份验证的远程浏览器连接的凭据 [#103139](https://github.com/openclaw/openclaw/pull/103139)
- 防止陈旧或重播的桌面操作 [#103422](https://github.com/openclaw/openclaw/pull/103422)
- 防止过时的浏览器配置文件在清理后开始复活 [#104601](https://github.com/openclaw/openclaw/pull/104601)
- 当一个共享选项卡挂起时保持浏览器工具可用 [#113921](https://github.com/openclaw/openclaw/pull/113921)
- Pin 受保护的浏览器 CDP 套接字到经过验证的端点 [#114506](https://github.com/openclaw/openclaw/pull/114506)
- 保护浏览器和Canvas观察隐私边界 [#118775](https://github.com/openclaw/openclaw/pull/118775)
- 显示浏览器配对和选项卡共享失败 [#119526](https://github.com/openclaw/openclaw/pull/119526)
- Harden Chrome 扩展继电器配对和选项卡同意 [#120390](https://github.com/openclaw/openclaw/pull/120390)
- 在节点调度前对计算机使用操作风险进行分类 [#124112](https://github.com/openclaw/openclaw/pull/124112)
- 取消本地浏览器操作并停止代理轮流 [#124795](https://github.com/openclaw/openclaw/pull/124795)
- fix（浏览器）：通过扩展中继恢复MCP页面创建[#132232](https://github.com/openclaw/openclaw/pull/132232)
- fix（浏览器）：在跟踪期间保留共享的 Chrome 选项卡并重新连接 [#132485](https://github.com/openclaw/openclaw/pull/132485)
- 保持严格的CDP发现绑定到配置的浏览器[7d0f9de](https://github.com/openclaw/openclaw/commit/7d0f9de)
- 通过请求处理保持Node 24个浏览器操作处于活动状态 [c0d99ed](https://github.com/openclaw/openclaw/commit/c0d99ed)
- Bound Chrome 启动诊断而不丢失恢复提示 [#101506](https://github.com/openclaw/openclaw/pull/101506)
- 将浏览器选项卡操作限制为真实页面目标 [#103115](https://github.com/openclaw/openclaw/pull/103115)
- 拒绝不明确的浏览器选项卡引用 [#103119](https://github.com/openclaw/openclaw/pull/103119)
- 防止浏览器操作瞄准错误的选项卡 [#103177](https://github.com/openclaw/openclaw/pull/103177)
- Honor 评估现有浏览器会话的超时 [#103181](https://github.com/openclaw/openclaw/pull/103181)
- 受管时保持网关活动 Chrome 无法启动 [#103243](https://github.com/openclaw/openclaw/pull/103243)
- 取消控制时停止macOS计算机打字[#103528](https://github.com/openclaw/openclaw/pull/103528)
- 重新连接后过期 Chrome MCP 选项卡和快照句柄 [#103576](https://github.com/openclaw/openclaw/pull/103576)
- 防止陈旧的浏览器句柄切换重复的 URL 选项卡 [#103816](https://github.com/openclaw/openclaw/pull/103816)
- 在解析 JSON 之前拒绝不安全的浏览器突变 [#104677](https://github.com/openclaw/openclaw/pull/104677)
- 将浏览器配置文件策略应用于选项卡 URL 密文 [#104715](https://github.com/openclaw/openclaw/pull/104715)
- 保持并行代理节点调用经过身份验证 [#105143](https://github.com/openclaw/openclaw/pull/105143)
- 仅在最终策略验证后才采用浏览器选项卡 [#105301](https://github.com/openclaw/openclaw/pull/105301)
- 恢复 Chrome 在 WebSocket 打开期间卡住的继电器连接 [#109114](https://github.com/openclaw/openclaw/pull/109114)
- 立即取消浏览器选项卡发现 [#109617](https://github.com/openclaw/openclaw/pull/109617)
- fix（浏览器）：停止代理启动的托管 Chrome [#109723](https://github.com/openclaw/openclaw/pull/109723)
- 网关重启后清理OpenClaw浏览器选项卡[#110797](https://github.com/openclaw/openclaw/pull/110797)
- 退出浏览器永远不会返回的跟踪选项卡 [#111307](https://github.com/openclaw/openclaw/pull/111307)
- 隔离代理运行后关闭浏览器选项卡 [#113566](https://github.com/openclaw/openclaw/pull/113566)
- 当选项卡关闭时防止浏览器副驾驶弹出窗口挂起 [#113744](https://github.com/openclaw/openclaw/pull/113744)
- 清理失败的浏览器导航防护 [#113753](https://github.com/openclaw/openclaw/pull/113753)
- 将 Chrome 页面共享保持在字段限制内 [#113768](https://github.com/openclaw/openclaw/pull/113768)
- 保持陈旧 Chrome 副驾驶事件不再活跃聊天 [#113781](https://github.com/openclaw/openclaw/pull/113781)
- 浏览器中继断开连接时显示页面共享失败 [#113803](https://github.com/openclaw/openclaw/pull/113803)
- 启动失败后恢复远程浏览器节点 [#113926](https://github.com/openclaw/openclaw/pull/113926)
- 修复远程浏览器节点超时和取消隔离 [#114131](https://github.com/openclaw/openclaw/pull/114131)
- 在代理后面恢复托管浏览器快照 [#114546](https://github.com/openclaw/openclaw/pull/114546)
- 避免 Chrome 扩展中继端口冲突 [#115592](https://github.com/openclaw/openclaw/pull/115592)
- 未读响应后关闭浏览器探测连接 [#115675](https://github.com/openclaw/openclaw/pull/115675)
- Keep Tab Copilot 在扩展重新加载后工作 [#116784](https://github.com/openclaw/openclaw/pull/116784)
- 禁用定期心跳时唤醒浏览器页面共享 [#116790](https://github.com/openclaw/openclaw/pull/116790)
- Bound 深度嵌套页面上的浏览器快照深度 [#119217](https://github.com/openclaw/openclaw/pull/119217)
- H两个驱动程序之间的浏览器导航超时 [#119654](https://github.com/openclaw/openclaw/pull/119654)
- 拒绝格式错误的浏览器扩展中继帧 [#120283](https://github.com/openclaw/openclaw/pull/120283)
- fix（浏览器）：立即取消等待配置文件操作 [#120796](https://github.com/openclaw/openclaw/pull/120796)
- 恢复停滞 Chrome Copilot 网关连接 [#120839](https://github.com/openclaw/openclaw/pull/120839)
- Attached 浏览器工作线程在 CDP 使用 [#122103](https://github.com/openclaw/openclaw/pull/122103) 后退出
- 保持嵌入式浏览器选项卡与显示页面对齐 [#122128](https://github.com/openclaw/openclaw/pull/122128)
- 分机重新连接后恢复共享 Chrome 选项卡 [#122177](https://github.com/openclaw/openclaw/pull/122177)
- fix（浏览器）：遵守显式快照超时 [#124575](https://github.com/openclaw/openclaw/pull/124575)
- Bound浏览器和Canvas工具结果 [#125126](https://github.com/openclaw/openclaw/pull/125126)
- 在网关关闭期间清理浏览器中继 [#125176](https://github.com/openclaw/openclaw/pull/125176)
- 报告浏览器打开导航失败 [#125743](https://github.com/openclaw/openclaw/pull/125743)
- 从 Linux 僵尸锁 [#125831](https://github.com/openclaw/openclaw/pull/125831) 恢复托管 Chromium 启动
- fix（浏览器）：在声明其离线之前给予配对分机连接时间 [#127761](https://github.com/openclaw/openclaw/pull/127761)
- perf（浏览器）：减少冷态进程扫描 [#128692](https://github.com/openclaw/openclaw/pull/128692)
- fix（浏览器）：遵守跨浏览器命令继承的超时 [#129176](https://github.com/openclaw/openclaw/pull/129176)
- fix（浏览器）：遵守规范操作执行期限 [#130055](https://github.com/openclaw/openclaw/pull/130055)
- fix（浏览器）：响应正文读取超时 [#130386](https://github.com/openclaw/openclaw/pull/130386)
- fix（浏览器）：避免选项卡访问更新期间导航超时 [#131841](https://github.com/openclaw/openclaw/pull/131841)
- fix（浏览器）：工作目标不再使网关崩溃 [#132419](https://github.com/openclaw/openclaw/pull/132419)
- fix（浏览器）：中继客户端共享时保留目标 Chrome [#132504](https://github.com/openclaw/openclaw/pull/132504)
- fix：隔离浏览器绑定和剪贴板拆卸 [#132878](https://github.com/openclaw/openclaw/pull/132878)
- fix（浏览器）：在采用选项卡之前证明操作后目标的连续性（#110884）[91888cf](https://github.com/openclaw/openclaw/commit/91888cf)
- 格式错误的浏览器中继帧的返回错误 [#102070](https://github.com/openclaw/openclaw/pull/102070)
- 在其配置的主机内保留远程 CDP 目标发现 [#102328](https://github.com/openclaw/openclaw/pull/102328)
- 保持 Chrome 错误消息尾部有效 UTF-8 [#102543](https://github.com/openclaw/openclaw/pull/102543)
- 在调度前拒绝带有凭据的浏览器页面 URL [#102952](https://github.com/openclaw/openclaw/pull/102952)
- 拒绝格式错误的计算机工具数字输入 [#103642](https://github.com/openclaw/openclaw/pull/103642)
- 在选择无效的原始 CDP 选项卡目标之前拒绝它们 [#104129](https://github.com/openclaw/openclaw/pull/104129)
- 在格式错误后停止重复的手表结果错误 JSON [#104293](https://github.com/openclaw/openclaw/pull/104293)
- Keep Chrome 启动错误提示 Unicode 安全 [#104603](https://github.com/openclaw/openclaw/pull/104603)
- Bound 浏览器控制请求与配置的超时 [#106497](https://github.com/openclaw/openclaw/pull/106497)
- 在配置的期限内保持沙箱浏览器启动探测 [#108670](https://github.com/openclaw/openclaw/pull/108670)
- 立即取消 Playwright 点击并按住延迟 [#109710](https://github.com/openclaw/openclaw/pull/109710)
- 拒绝畸形Firecrawl成功信封[#111210](https://github.com/openclaw/openclaw/pull/111210)
- 保持网络搜索提供程序错误在 Unicode 截断边界处有效 [#111327](https://github.com/openclaw/openclaw/pull/111327)
- 拒绝空白 Tavily 在本地提取 URL [#111333](https://github.com/openclaw/openclaw/pull/111333)
- 停止停滞 Google 文档股票无限期挂起 [#111633](https://github.com/openclaw/openclaw/pull/111633)
- 拒绝 Exa 搜索响应中损坏的 UTF-8 [#111736](https://github.com/openclaw/openclaw/pull/111736)
- 接受显式 SearXNG 搜索端点 URL [#113661](https://github.com/openclaw/openclaw/pull/113661)
- 防止重复的易失性浏览器选项卡关闭 [#114507](https://github.com/openclaw/openclaw/pull/114507)
- 请求停止时取消浏览器状态探测 [#115534](https://github.com/openclaw/openclaw/pull/115534)
- 取消停滞的浏览器 CDP 及时握手 [#115805](https://github.com/openclaw/openclaw/pull/115805)
- 返回实际提交的浏览器跟踪路径 [#116702](https://github.com/openclaw/openclaw/pull/116702)
- Chrome 写入 [#116882](https://github.com/openclaw/openclaw/pull/116882) 失败后恢复浏览器 Copilot 状态
- 回收停滞的浏览器扩展中继连接 [#120806](https://github.com/openclaw/openclaw/pull/120806)
- 将浏览器关闭结果绑定到关闭的选项卡 [#124064](https://github.com/openclaw/openclaw/pull/124064)
- 当最后一个选项卡关闭被拒绝时保留 Chrome 选项卡 [#124449](https://github.com/openclaw/openclaw/pull/124449)
- 让浏览器面板挂载不带 ResizeObserver [#125480](https://github.com/openclaw/openclaw/pull/125480)
- fix（浏览器）：取消挂起的 CDP 端点发现 [#129410](https://github.com/openclaw/openclaw/pull/129410)
- fix（浏览器）：模式对话框处理失败后停止挂起 [#129459](https://github.com/openclaw/openclaw/pull/129459)
- fix（浏览器）：保留响应主体超时诊断 [#129803](https://github.com/openclaw/openclaw/pull/129803)
- fix（浏览器）：处理并发首次使用扩展配对[#130832](https://github.com/openclaw/openclaw/pull/130832)
- 关闭取消打开后留下的浏览器选项卡 [#131125](https://github.com/openclaw/openclaw/pull/131125)
- fix（浏览器）：避免 CLI 命令 [#132486](https://github.com/openclaw/openclaw/pull/132486) 不必要的运行时加载

</details>

</Accordion>

</AccordionGroup>
