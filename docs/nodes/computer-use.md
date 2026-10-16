---
summary: "通过计算机工具对网关和配对节点桌面进行基于功能的控制"
read_when:
  - "让网关代理查看并控制其自己的桌面或配对的桌面"
  - "启用、权限或 computer 使用的安全性"
  - "扩展 computer.act 节点命令或其实现器"
title: "计算机使用"
doc-schema-version: 1
---

计算机的使用使代理可以通过一个内置的 `computer` 工具查看和控制网关自己的桌面或配对节点的桌面。两台主机使用相同的`computer.act`和`screen.snapshot`合约； CUA 在任一主机上重用相同的提供程序实现。提供者的描述符标识了支持的 v2 操作、目标、观察和交付系列，因此该工具仅公开该提供者可以忠实执行的内容。协调动作绑定到提供者发布的参考框架；有能力的提供商还可以处理窗口和元素、请求后台交付以及返回结构化效果或拒绝证据。具有视觉能力的模型驱动表面。

对于 [ 云会话 ](/gateway/cloud-sessions#desktop-and-computer-control)，该工具绑定到会话自己的桌面，而不是搜索配对节点。支持桌面的 Crabbox 工作人员在 Web 桌面面板显示的同一桌面会话中配置 CUA。他们的私有计算机端点不会作为普通的配对计算机公开，并且工具参数无法更改其节点或网关。

会话还可以附加临时 Crabbox，同时其代理保留在网关上。选择第一次 `computer` 调用时环境工具返回的 `environmentId`；以后的调用保留该桌面。客服人员可以看到并控制聊天侧栏中显示的同一桌面。该环境必须属于当前会话，并且其租用、连接和允许的代理运行必须保持最新。丢失或停止的附件永远不会将输入重定向到网关或另一台计算机。请参阅 [Cloud Worker Desktop](/gateway/cloud-workers/desktop)，了解完整的“在 Crabbox 中打开并向我展示”工作流程。

在桌面面板中控制云环境会暂停代理输入并取消待处理的输入。特工仍然可以观察屏幕。当要求恢复时，它可以使用 `action: "take_control"` 调用 `computer` 将控制查看器切换为仅查看并捕获新的屏幕截图。这种明确的切换使用了已承认的运行的现有计算机控制权限；它不需要单独的观看者颁发的切换令牌。您可以随时重新控制，或自行释放控制。普通输入永远不会自动接管，并且不会重播中断的操作。接管使之前的坐标和 window/browser 观测值无效；使用返回的屏幕截图或在输入之前进行新的有针对性的观察。此仲裁适用于云环境桌面，包括会话附件和云会话，而不是普通网关或配对节点桌面。

代理发出一个统一命令，`computer.act`；它无法选择节点如何实现它。在 macOS 上，**Dashboard → 设置 → 本机 → Capability** 选择节点本地提供程序：Peekaboo 是默认设置，并保留现有的进程内协调操作路径，而 CUA 使用 `OpenClaw.app` 中嵌入的驱动程序守护程序。该应用程序直接生成该守护进程，因此它继承了 OpenClaw 的辅助功能和屏幕录制授权，并且应用程序拥有的节点工作程序通过专用套接字进行连接。 Windows和Linux可以使用可选的实验性`cua-computer`插件，该插件直接调用打包的CUA驱动程序SDK。

提供者的选择永远不会因为每次操作而退缩。切换提供程序会关闭活动执行面、轮换提供程序生成并重新通告节点命令。因此，CUA 故障将成为不可用的结果，而不是通过 Peekaboo 静默运行相同的操作。

## <a id="requirements"></a> 要求

- 网关上的可用计算机提供商，或配对的连接节点通告 `computer.act` 和 `screen.snapshot`，其中 `screen.snapshot` 返回 `displayFrameId`。
- **macOS 履行者：** 应用程序设置 **允许计算机 Control** 启用。默认开启；明确的关闭选择将保持关闭状态。
- **macOS 履行者：** 选择 **Peekaboo**（默认）或 **CUA**。仅当已签名的应用程序包中存在固定驱动程序时，才可以选择 CUA；没有该工件的开发版本显示 **驱动程序未捆绑**。
- **macOS 履行者：** **Accessibility** 和 **Screen Recording** 已授予 OpenClaw。本机 Peekaboo 路径还需要对其 CoreGraphics 输入原语进行事件发布访问。
- **Windows/Linux 实现者：** 捆绑 `cua-computer` 插件，在 Windows x64/ARM64 或基于 glibc 的 Linux x64/ARM64. 上启用，其软件包包括固定 CUA 驱动程序 SDK 运行时；未配置 `cua-driver` 可执行文件、守护程序或 MCP 服务器。
- 对于节点，包括在网关上批准的 `computer.act` 的配对更新。网关自己的计算机不需要配对节点。
- 具备视觉能力的智能体模型。
- 公开 `computer` 的工具策略。当未配置配置文件时，本地加入选择“完整”，但会保留显式 `coding` 配置文件，从而将其排除在外。对于编码，将 `computer` 添加到 `tools.alsoAllow`；普通沙盒代理在`tools.sandbox.tools.alsoAllow`中也需要它。云会话的绑定桌面包含在其默认沙箱策略中，而显式允许列表和拒绝仍然适用。完整的工具选择不会授予计算机控制权限。参见 [ 工具配置文件 ](/gateway/config-tools/tool-policy#tool-profiles)。

## <a id="gateway-desktop"></a> 网关桌面

在网关主机上启用 `cua-computer` 并运行重点工件检查：

```bash
openclaw plugins enable cua-computer
openclaw doctor --lint --only cua-computer/driver-artifacts
```

网关控制需要此显式插件启用。单独加载插件的默认节点策略会关闭网关控制并保留配对节点选择。

禁用或重新加载选定的提供程序会暂停计算机准入，并通过网关的插件重新加载生命周期关闭其本机执行。不相关的插件重新加载会使计算机保持运行。后来的执行获得了新的供应商一代。

在无头 Linux 网关上，启用 [ 托管桌面 ](/gateway/config-browser-ui-desktop#desktop)。然后，计算机控制使用与 Control UI 桌面面板相同的 X11 显示和专用 D-Bus 会话。网关为现有提供者启动一个私人助手；无需节点处理或配对。关闭面板可以使活动的计算机执行保持活动状态。桌面关闭或重新启动会关闭该执行，并在更换显示器之前使其框架和引用无效。

对于现有的本机桌面，提供程序使用网关进程的桌面环境和平台权限。可用性取决于运行时会话；单独运行的网关或可见的 VNC 流并不能证明计算机控制可用。 macOS CUA 提供商仍然需要其应用程序拥有的端点。外部 VNC 服务器无法识别 CUA 的本地显示：如果它优先于托管模式，则托管计算机路由会报告不匹配情况，而不是控制另一个桌面。

内置工具使用由该网关托管的代理运行的网关桌面。配对节点目标仍然支持远程网关 URL/token 覆盖。

工具发现可读取声明的功能和记录的运行时运行状况，而无需启动桌面或等待其帮助程序。第一个计算机操作探测选定的网关并绑定到生成的实时提供程序生成。单独声明的操作列表并不意味着桌面已准备就绪。

托管代理转而重用网关准备好的节点目录和计算机提供商声明。配对和连接更改、命令策略更新和 provider/configuration 更改会在下一轮组装其工具表面之前更新这些所有者持有的事实。发现仍然绑定到代理的网关；已停用的网关绑定无法借用另一个网关的库存。

对于 RPC 客户端，`computer.status` 和 `probe: false` 执行此被动读取。 `probe: true` 准备计算机并等待就绪；省略 `probe` 将为现有客户端保留该行为。并发探针共享准备工作，并且帮助程序启动仍然受到一分钟超时的限制。被动读取永远不会延长桌面的空闲寿命或重试失败的启动。

### <a id="linux-gateway-live-proof"></a> Linux 网关现场证明

从 Linux 上构建的源签出中，安装托管桌面必备组件以及 `mousepad`，然后运行：

```bash
node --import ./scripts/tsx.mjs scripts/dev/computer-use-gateway-live-proof.ts \
  --artifacts /tmp/openclaw-gateway-computer-proof
```

使用空的输出目录。该证明启动一个没有配对节点的隔离网关和托管桌面，捕获屏幕截图，在鼠标垫中输入并读回文本，然后验证生成围栏和联合进程清理。它不需要模型凭据，并在输出目录中留下屏幕截图、经过编辑的日志和 `result.json`。

添加`--runtime <executable>`以在另一个运行时（例如Bun）上启动构建的网关，并在`PATH`上运行没有`node`的证明。如果网关或其计算机帮助程序在另一个可执行文件上运行，或者任何自有进程运行 Node，并将每个自有进程的可执行文件记录在 `result.json` 中，则证明失败。

## <a id="the-computer-agent-tool"></a> `computer` 代理工具

内置 `computer` 工具每次调用执行一个操作。选择 `target: "gateway"` 作为网关桌面，或选择 `target: "node"` 作为配对节点。提供 `node` 也会选择节点路由。如果没有选择器，则第一个调用将使用配置的网关计算机，否则是唯一连接的具有计算机功能的节点。已配置但不可用的网关计算机报告其错误；它永远不会默默地将输入重定向到节点。除非明确更改，否则后续调用将保留所选主机。云会话保留其固定桌面并拒绝主机覆盖。

在 MCP 工具路径上，计算机控制属于已许可的代理运行，并在该运行结束时释放。稍后的运行可以使用同一台计算机。在此路径上，录制和文件传输操作仍然不可用。

坐标是最近截图中的非负整数像素；提供者将它们映射到显示点。坐标动作必须与屏幕截图结果的 `frameId` 相呼应，并且显式的 `screenIndex` 必须与该帧匹配。 OpenClaw 还将提供商发布的显示标识从屏幕截图携带到操作中，因此显示重新连接或几何形状更改会阻止操作，而不是默默地重新定位相同的索引。这些检查拒绝猜测的令牌和来自另一个交付的帧或显示的令牌。令牌并不能保证新鲜度：应用程序可以在捕获后更改同一显示器上的像素，因此只要场景可能发生变化，就拍摄新的屏幕截图。

- 读取：`screenshot`捕获桌面屏幕并返回`frameId`。它不接受窗口、浏览器、元素或观察引用。
- 指针：`left_click`、`right_click`、`middle_click`、`double_click`、`triple_click`、`mouse_move`、`left_click_drag`（带 `startCoordinate`）、`left_mouse_down`、`left_mouse_up`。
- 滚动：`scroll`，带 `scrollDirection`（`up|down|left|right`）和 `scrollAmount`（鼠标滚轮刻度）。
- 键盘：`type`（文本）、`key`（组合，如 `cmd+shift+t` 或 `Return`）、`hold_key`（`text` 组合保持 `duration` 秒）。
- Pacing：`wait`（`duration` 秒），后面是屏幕截图。此操作在本地运行，并且只要所选提供商支持屏幕截图即可使用；它不需要本机等待命令。

具有 v2 window/element 系列的提供商还可以公开 `list_apps`、`list_windows`、`get_accessibility_tree`、`get_cursor_position`、`get_window_state`、`launch_app`、`kill_app`、 `bring_to_front`、`set_value`、`zoom`、`escalate_scope` 和 `invoke_menu`。提供者描述符具有权威性；不可用的操作将被忽略，而不是通过另一个提供者进行模拟。

窗口输入坐标遵循观测值的 `details.coordinateSpace`。 CUA 报告 `image-pixels`：在提供的图像中使用像素，包括当 OpenClaw 调整其大小时。 Peekaboo 报告 `global-logical-points`：使用桌面逻辑点。辅助功能元素边界保留其本机屏幕坐标；当针对这些元素时更喜欢 `elementRef`。浏览器坐标输入使用视口 CSS 像素。

对于窗口图像，将 `get_window_state` 与 `windowRef` 和 `includeScreenshot: true` 一起使用，然后将返回的 `observationId` 与窗口输入一起传递。使用 CUA，`includeScreenshot: false` 会跳过捕获并刷新辅助功能元素及其引用。此选择退出需要更新节点；默认和 `true` 观测值仍然与旧节点兼容。将这些引用用于元素操作；窗口像素输入仍然需要对交付的图像进行观察。本机 macOS Peekaboo 提供程序拒绝 `includeScreenshot: false`，因为其窗口观察需要捕获。桌面 `frameId` 无法替代窗口观察：图像可以使用不同的坐标空间。与 `screenshot` 一样，`wait` 返回桌面捕获并拒绝目标和观察引用。

CUA 提供程序还公开了 v2 浏览器系列：`get_browser_state`、`browser_prepare`、`browser_navigate`、`browser_click`、`browser_type`、`browser_dialog`、`browser_set_input_files`、 `browser_download` 和 `browser_pointer`。使用 `list_windows` 发现本机浏览器的 `windowRef`，然后将其传递给 `get_browser_state` 以获取不透明的 `browserRef` 和页面引用。后续的 `get_browser_state` 页面快照和浏览器操作都需要 `browserRef` 和 `pageRef`；快照返回输入所需的观察结果和元素引用。 `browser_prepare` 还需要发现的 `windowRef`，即使对于隔离配置文件也是如此。这些参考文献属于计算机使用执行和驱动程序生成；导航会使页面元素观察无效，驱动程序重新启动会使整个浏览器参考集无效。

CUA 还公开了 `get_recording_state`、`start_recording`、`stop_recording` 和 `replay_trajectory`。录制和浏览器文件操作使用不透明的 `openclaw:computer-resource` 句柄。选定的计算机主机创建并验证底层文件和目录；代理操作从不接受本机路径、输出根或帮助程序可执行路径。句柄属于一个计算机使用执行，不能被另一执行重复使用。

在 macOS Peekaboo 提供程序上，屏幕坐标滚动在请求的坐标或当前指针处使用前景轮输入。背景滚动需要一个窗口和当前观察到的一个元素；它永远不会退回到全局轮输入。

单击和滚动操作时，修饰键位于 `text` 字段（`shift`、`ctrl`、`alt`、`cmd`）。窗口输入后，广告 `get_window_state` 的提供商返回操作结果，然后进行新的窗口观察。使用该观察结果的 `observationId` 和元素引用进行下一步操作；不需要单独的观察电话。如果后续失败，原始操作结果仍然可见：在另一个突变之前再次观察，而不重复输入。浏览器操作仍然需要单独的浏览器观察。

其他输入操作会返回新的桌面屏幕截图，以便模型可以观察结果。当屏幕与模型上下文中的前一帧像素相同时，该工具仅返回元数据 - “屏幕自前一帧以来未发生变化” - 并且先前的 `frameId` 保持有效，因此重复的屏幕截图永远不会重新进入模型上下文。如果连接了多个具有计算机功能的节点，请显式传递 `node`。

截图仅供**模型内部使用**：它们绝不会自动传送到聊天频道。请将所有屏幕内容视为不受信任的输入；工具会警告模型不要遵循与用户请求相冲突的屏幕上的指令。

## <a id="cua-driver-provider"></a> CUA 驱动程序提供商

### <a id="macos-app-owned-daemon"></a> macOS 应用程序拥有的守护进程

签名的 macOS 应用程序捆绑了固定的通用 `cua-driver` 可执行文件，并在计算机 Control 提供商选择器中提供 **CUA**。 OpenClaw 在应用程序支持下创建一个私有的、仅限所有者的套接字目录，并将 `cua-driver serve --embedded` 作为直接应用程序子项启动。它不通过网关、TypeScript工作线程、`open(1)`或`NSWorkspace`启动；这些路径将破坏 macOS 的 TCC 责任链并创建第二个权限身份。

应用程序会等到专用套接字接受连接，然后再通告 CUA 准备就绪。其 TypeScript 节点工作线程仅针对该套接字启动非特权 MCP 代理，并映射其他平台上使用的相同类型的 `computer.act` v2 操作。权限更改会重新启动守护程序，并且提供程序会更改、禁用计算机 Control、应用程序关闭或意外的子退出会删除所通告的 CUA 命令，直到新一代准备就绪。

#### <a id="trust-model"></a> 信任模型

网关是授权的瓶颈；驱动器是一个愚蠢的效应器。 OpenClaw 故意让守护进程不受限制，并通过工具暴露、危险命令白名单、设备和命令配对批准、节点本地提供程序启用和 OS 权限来授权其之上的计算机使用。这与已发货的 Peekaboo 履行者使用的授权边界相同。

固定的 CUA 驱动程序在运行时启动时修复其权限模式和有界清单。确切的 PID/window 授权以及任何应用程序范围的窗口授权必须在该启动批准的清单中声明； `ask` 条目是对无人值守调度的硬拒绝。 OpenClaw 相反会驱动代理运行时发现的应用程序、窗口和元素。因此，如果不复制网关策略或预先授权广泛的应用程序类，有界模式就无法表达此提供程序模型，因此应用程序以不受限制的模式启动其托管守护程序，并绕过批准。

`computer.act` 节点调用策略在传输调度之前对精确参数进行分类。强制应用程序终止、浏览器导航、浏览器下载、浏览器文件输入、记录启动、轨迹重播和桌面范围升级是单独的高风险系列；普通的观察和输入仍然是不同的。分类不会添加每个操作提示或削弱命令级门：每个操作仍然需要相同的公开工具、武装命令、批准的配对、启用的节点提供商和 OS 权限。

托管端点不是模型合同的一部分。 CUA 插件不注册任何模型工具、CLI 命令、服务或原始节点 MCP 描述符，并且其操作模式既不接受帮助程序二进制文件、套接字、本机会话、驱动程序参数，也不接受提供程序工具名称。在 macOS 上，只有应用程序拥有的工作线程接收端点，而节点 shell 执行通过应用程序主机路由，没有该仅工作线程值。这些边界阻止 OpenClaw 模型操作选择到托管守护程序的备用路由。

CUA 创建模式为 `0600` 的 Unix 套接字，OpenClaw 将其放置在随机的所有者专用的 `0700` 目录中。这不包括远程客户端和其他本地用户。它不会对以同一登录用户身份运行的进程进行身份验证或沙箱进程：这些进程在此边界内，并且可能能够发现和使用相同用户的资源。不受限制的 CUA 模式不包含受损的用户帐户。更强的同一用户隔离需要继承连接的 IPC 或 OS-enforced 进程边界。

环回也是可达性，而不是身份：机器上的任何进程都可以连接到 `127.0.0.1`。因此，网关客户端不会仅仅因为 `operator.write` 通过环回到达而接收它。必须认证并通过网关的[设备配对和范围审批](/gateway/pairing)；如果没有单独受信任的本地或共享凭证，则另一个已授权的设备必须批准所请求的操作员范围。驱动程序及其套接字永远不会做出这样的决定。

CUA 描述符通告窗口、元素和浏览器目标；后台和前台交付；图像、可访问性和浏览器观察；和录音。 Peekaboo 仍然是默认提供商，并且不会宣传录音。

CUA 桌面输入采用前台桌面路由。 `deliveryMode` 仅针对窗口输入选择路径；将其切换到桌面操作不会改变该操作的交付方式。桌面结果保留本机效果和升级证据，识别其桌面范围，并指示请求的交付模式何时不适用。已确认的输入并不能证明应用程序已做出响应：在重复之前验证预期的可见更改。

固定的 CUA 驱动程序支持按键，而不是持续的键盘保持。 Linux X11 按键包括较短的按下间隔，因此轮询按键状态的应用程序可以观察它们。其 Linux `left_mouse_down` 和 `left_mouse_up` 操作需要具有 `windowRef` 的背景窗口像素目标和当前承载图像的 `observationId`；桌面和元素目标不支持这些保留。仅使用所选节点公开的操作。对于交互式应用程序，在尝试较长的任务之前，首先验证移动、激活或其他预期控制是否改变了观察到的状态。

#### <a id="browser-profiles"></a> 浏览器配置文件

`browser_prepare` 可以使用新的临时配置文件或命名的隔离配置文件启动单独的驱动程序拥有的 Chromium 进程。它永远不会修改、复制、终止或附加到所选浏览器的现有配置文件。该适配器不会暴露现有的-profile/CDP 附件；浏览器准备仅限于隔离的配置文件。

浏览器目标、页面、页面元素和对话框是不透明的功能。导航、重新连接或拒绝陈旧引用后重新获取浏览器状态。适配器永远不会将提供者本机 CDP 目标 ID、选项卡 ID 或页面引用返回到模型。

### <a id="maintainer-live-proof-rig"></a> Maintainer防电钻机

该存储库包括一个保留真实垂直路径的开发装备：面向代理的 `computer` 工具、网关 `node.invoke`、配对节点和选定的节点本地提供商。它被故意与运营商应用程序和网关隔离。 macOS路径使用签名的app节点； Linux 路径在真实的 X11 会话中使用选择加入的 `cua-computer` 插件。

两条路径都会在私有配置文件中生成一个新的仅证明令牌：用于隔离网关的 `gateway.auth.token` 和用于应用程序或节点的 `gateway.remote.token`。该网关随 `--auth token --bind loopback` 一起发布。该装备清除继承的网关凭据、URL/port 覆盖和 config/state/profile 覆盖，因此操作员设置无法替换证明设置。令牌绝不会出现在发出的命令或 `rig.json` 中；不要发布生成的配置或整个临时目录作为证据。

#### macOS

从干净、提交的签出构建签名应用程序，选择新的配置文件和非默认环回端口，并准备两个配置视图：

```bash
scratch="$(mktemp -d /tmp/openclaw-cu-live.XXXXXX)"
scripts/dev/computer-use-macos-live-rig.sh prepare \
  cu-live-proof 29431 "$PWD/dist/OpenClaw.app" "$scratch" peekaboo
```

在不同的终端中运行发出的 `gateway` 和 `app` 命令。分割配置是有意为之的：外部启动的守护进程读取带有 `gateway.mode: "local"` 的暂存配置，而应用程序配置文件读取 `gateway.mode: "remote"`、直接传输和守护进程的环回 URL。如果应用程序读取本地模式，则其 Port Guardian 拥有该路由，而不是加入外部守护进程。该钻机将其经过验证的发射场保留在不可执行的 `rig.json` 中；后面的命令拒绝与 scratch/profile 布局不匹配的未知字段或路径。它还播种专用的 `node` 身份、已完成的登录、未暂停状态、计算机 Control 以及用于启动调试节点工作程序的签出路径。没有单独的节点模式切换。

在第三个终端中，重新运行发出的 `nodes` 命令，直到配对条目已连接并通告 `computer.act` 以及 `computerUse` 描述符。不涉及操作员设备批准步骤：只读 CLI 不会在新的 `cli-state` 中创建身份，并且证明令牌对其环回操作员调用进行身份验证。证明运行器在单独的 `agent-state` 中使用与本地后端客户端相同的令牌，保留 `operator.write`。 Node 设备身份和配对检查保持启用状态；不要复制身份或禁用设备身份验证来引导装备。

如果节点的命令表面仍待批准，请从 `nodes` 输出中获取 `.pending[0].requestId` 并运行 `scripts/dev/computer-use-macos-live-rig.sh approve "$scratch" <request-id>`。

将一个无害的可编辑固定窗口放在另一个最前面的应用程序后面，然后垂直运行：

```bash
scripts/dev/computer-use-macos-live-rig.sh proof \
  "$scratch" peekaboo "Computer Use Fixture" "background proof" "Editor"
```

证明运行器首先要求唯一连接的计算机节点通告所请求的提供者，然后执行`screenshot`、`list_windows`、`get_window_state`，背景元素单击并键入，并重新观察窗口。它将结构化结果和目标窗口 before/after 图像保存在暂存目录下，并且除非提供者匹配、目标从非最前端启动、最前端应用程序和光标保持不变、目标内容发生更改、最终效果被确认或结构化拒绝，否则将失败。与其他提供商一起重新启动隔离的应用程序并重新运行相同的证明。请勿为此设备使用端口 `18789`（默认配置文件）或 `/Applications/OpenClaw.app`。

#### <a id="linux-x11-through-crabbox"></a> Linux X11 通过 Crabbox

在 Crabbox Linux 主机上运行 Linux 证明，而不是在 macOS 容器上。直接向 Xvfb 租用 AWS Crabbox 就足够了，因为 Xvfb 是真正的 X11 服务器； macOS 上的本地容器不是远程 Linux 桌面证明。在一次性主机上安装 X11 固定装置必备组件，然后启动隔离会话：

```bash
sudo apt-get update
sudo apt-get install -y at-spi2-core dbus-x11 gir1.2-gtk-3.0 jq openbox python3-gi x11-utils xdotool xvfb

dbus-run-session -- bash
```

`dbus-run-session -- bash` 打开一个嵌套 shell，因此上面的块停在那里。在新 shell 中运行以下所有内容：

```bash
export DISPLAY=:99 XDG_SESSION_TYPE=x11 NO_AT_BRIDGE=0
Xvfb "$DISPLAY" -screen 0 1280x800x24 -nolisten tcp &
openbox >/tmp/openclaw-cu-openbox.log 2>&1 &

scratch="$(mktemp -d /tmp/openclaw-cu-live.XXXXXX)"
scripts/dev/computer-use-macos-live-rig.sh prepare-linux \
  cu-linux-live-proof 29431 "$scratch"
```

在继承相同 `DISPLAY` 和 `DBUS_SESSION_BUS_ADDRESS` 的单独窗格中运行发出的 `gateway`、`node` 和 `fixture` 命令。隔离的配置共享一个仅刮擦的随机网关令牌，并且网关默默地批准环回节点设备配对。节点命令表面仍然是显式批准：在节点完成重新连接后运行发出的 `nodes` 命令，读取 `.pending[0].requestId`，并将其传递给 `scripts/dev/computer-use-macos-live-rig.sh approve "$scratch" <request-id>`。重新运行 `nodes`，直到恰好有一个连接的节点通告 `provider.id: "cua-computer"`。

对非最前面的 GTK 夹具执行相同的验证运行程序：

```bash
scripts/dev/computer-use-macos-live-rig.sh proof \
  "$scratch" cua "OpenClaw CUA X11 Target" "W3-LINUX CONFIRMED"
```

结果和 `window-before.png` / `window-after.png` 保留在临时目录下。已确认的突变必须将哨兵保留为活动 X11 窗口并保持指针不变。仅当上游 `background_unavailable` 或 `background_occluded` 结果保持结构化且未尝试前台重试时，它才是有效的拒绝证据。即使 XWayland 也存在 `DISPLAY`，该设备仍会拒绝原生 Wayland；切换到 X11，而不是声明 Wayland 覆盖范围。

在任一证明之后，仅停止为装备启动的网关、app/node 和夹具进程。仅保留检查的证明结果和合成捕获，然后删除任务拥有的临时目录。在 macOS 上，还删除新的证明配置文件目录 （`~/.openclaw-<profile>`） 及其 `ai.openclaw.mac.profile.<profile>` 默认域。切勿清理操作员配置文件或网关。

### <a id="windows-and-linux-(experimental%2C-direct-sdk)"></a><a id="windows-and-linux-experimental-direct-sdk"></a> Windows 和 Linux（实验性，直接 SDK）

捆绑的 `cua-computer` 插件默认在每个平台上加载其网关策略。 Windows 和 Linux 上仍可选择本地计算机控制；单独加载策略不会启动本机驱动程序、注册本地计算机命令或检查本地驱动程序工件。 macOS 保留其与应用程序拥有的守护进程的默认 CUA 集成。明确禁用该插件也会禁用其云计算机策略。

要启用实验性 Windows 或 Linux 节点履行器，它直接使用固定的 CUA 驱动程序 SDK 合约：

1. 启用插件：

   ```bash
   openclaw plugins enable cua-computer
   ```

2. 在启动节点之前验证节点本地 SDK 包：

   ```bash
   openclaw doctor --lint --only cua-computer/driver-artifacts
   ```

   OpenClaw 检查 SDK 软件包版本、选定的 OS/CPU 软件包版本、常规文件标识以及本机库和 Node 运行时的固定 SHA-256 摘要。一张干净的支票印有 `no findings`。如果报`COMPUTER_DRIVER_*`错误，请在此节点主机上重新安装或更新OpenClaw并再次运行检查。请勿下载独立的 `cua-driver` 可执行文件或将其添加到 `PATH`； Windows 和 Linux 使用进程内安装的 npm- SDK。

3. 从交互式桌面会话启动 `openclaw node run`。该插件会在节点首次功能声明之前重复工件验证并确定 SDK 可用性。它为每个提供程序执行延迟创建一个配置的 SDK 运行时和可信生命周期会话。每个操作都会提供窗口和桌面目标； `escalate_scope` 读取现有会话状态而不扩大其权限。完成、取消、网关断开、提供者切换、本地停止和命令主机关闭都会关闭确切的执行、完成或丢弃其记录资源、关闭其会话并关闭其运行时。

4. 批准包括 `computer.act` 的配对更新。桌面 `computer.act` 是内置平台默认值，因此插件启用加上批准就是全部授权；不需要 `gateway.nodes.commands.allow` 条目。想要关闭命令的操作员可以拒绝它：

   ```json5
   {
     gateway: {
       nodes: { commands: { deny: ["computer.act"] } },
     },
   }
   ```

   被拒绝的命令与其 `computer` 功能一起从节点的通告表面中保留，并且网关记录其保留的命令。

此执行器目前仅控制主显示器。由于 CUA Driver SDK 没有桌面范围的按住输入契约，因此 `hold_key`、`left_mouse_down` 和 `left_mouse_up` 不可用。由于类型化的桌面方法不接受修饰键，带修饰键的点击、滚动和拖动会被拒绝。`key` 操作接受命名键、字母和修饰键组合（例如 `cmd+c` 或 `Return`）；数字和标点键会被拒绝，因为驱动会丢弃其依赖布局的 Shift 状态，因此请改用 `type` 操作发送这类文本。取消操作会针对每次节点调用传递给 SDK。

该插件调用 `CuaDriver.createConfigured`，而不是裸露的 `create()`。其授权上限、可信会话身份、TTL 和操作目标归 OpenClaw 所有；面向模型的 `screen.snapshot` 和 `computer.act` 输入无法选择本机会话或扩大其权限。由于驱动程序报告没有稳定的显示身份，因此帧授权绑定到受信任的会话生成以及实时主显示几何图形。延迟 SDK 加载不会更改该生成，因此 `list_windows` 可以是新执行中的第一个操作。新会话会使未完成的帧无效，但无法检测到一个会话内的相同几何主显示器替换；为此履行者更喜欢稳定的单显示会话。

在 Windows 和 Linux 上，这取代了以前的 0.10 daemon/MCP 集成：节点主机直接调用 SDK，网关在其私有桌面助手中加载相同的提供程序。既不启动独立的 `cua-driver` 守护程序，也不代理 MCP 客户端。 macOS 故意使用上述应用程序拥有的嵌入式守护程序，因此驱动程序保留在 `OpenClaw.app` 的 TCC 责任链中。这两条路径都不会回退到另一个提供商来执行单独的操作。

接受的驱动程序记录与 `cua-computer` 包一起存在，并提供 npm 本机文件摘要和 macOS 存档摘要。更新 OpenClaw 会将该记录和 SDK 包一起更新。没有独立的 Windows/Linux 驱动程序更新程序或回滚目录，因为这些主机上没有单独的驱动程序安装；通过安装之前已知良好的 OpenClaw 软件包进行回滚，然后在重新启动节点之前重新运行重点医生检查。

更新保留现有的桌面配置、显式插件启用或禁用以及节点配对。网关计算机支持不会更改现有节点命令契约或自动启用本地 CUA 控制。

## <a id="the-computer.act-node-command"></a><a id="the-computer-act-node-command"></a> `computer.act` 节点命令

`computer.act` 是工具路由输入的单节点命令（`node.invoke` 和 `command: "computer.act"`）。这是：

- **本地启用**：节点仅在计算机Control启用时通告它。网关可以在配对时批准所公布的表面。
- **基于能力**：该工具要求已连接节点同时宣告 `computer.act` 和 `screen.snapshot`。内置的 macOS 应用和可选择启用的实验性 `cua-computer` 插件提供相同的命令对。

提供者描述符声明 `contractVersion: 2`。无效的功能描述符或 `computer.act` 结果包络将被拒绝，并显示为 `COMPUTER_CONTRACT_MISMATCH`。

对提供程序支持的 `computer.act` 命令的直接 `node.invoke` 调用必须在操作参数中包含 `executionId` UUID。内置`computer`工具自动提供它。

对于 CUA，请对前面的 `screen.snapshot` 调用使用相同的 `executionId`。将其 `displayFrameId` 复制到操作中，并将其返回的 `width` 复制到 `refWidth` 中；坐标是指返回的位图中的像素。 CUA 将两个图像尺寸限制为 `maxWidth`，而不放大较小的显示器，因此直接快照和内置工具共享一个坐标空间。

没有 `executionId` 的 CUA 快照是独立捕获：其临时执行在捕获后关闭，并且无法授权以后的输入。

读取会复用 `screen.snapshot`；没有第二种捕获路径。有关共享捕获命令，请参见 [摄像头和屏幕节点](/nodes/camera)。

## <a id="authorization"></a> 授权

1. 启用平台履行者：在macOS、**上仪表板→设置→本机→功能→允许计算机Control**开始启用，然后选择Peekaboo或CUA并授予**辅助功能**和****此Mac下的屏幕录制**→权限**；在 Windows/Linux 上，遵循上面的实验性 `cua-computer` 设置。
2. 对于节点目标，批准网关上的配对更新（新命令强制重新配对）。网关目标使用其本地启用的提供程序，无需节点配对。
3. 将工具暴露给具有视觉能力的代理。对于显式 `coding` 配置文件：

   ```json5
   {
     tools: {
       alsoAllow: ["computer"],
       // Sandboxed agents need this second gate too:
       sandbox: { tools: { alsoAllow: ["computer"] } },
     },
   }
   ```

一旦启用节点本地控制并批准配对更新，`computer.act` 将持续可用，同时节点继续通告它。没有租约、到期或 arm/disarm 命令。在本地禁用计算机 Control 会删除通告的命令，并且节点会在调用时重新检查切换。

在 macOS 上，默认开启意味着，一旦所需的 macOS 授权存在，已配对的网关就可以立即驱动指针和键盘输入。没有逐次操作确认。请在配对之前，或之后的任何时候，关闭 **Allow Computer Control**，以停止声明并接受 `computer.act`。

`gateway.nodes.commands.deny` 仍然是显式全局撤销并且始终获胜；被拒绝的 `computer.act` 与其 `computer` 功能一起从节点的通告表面中扣除，并且网关记录其扣除的内容。没有履行者需要 `gateway.nodes.commands.allow` 条目：`computer.act` 是内置桌面平台默认值，因此节点本地支持加上配对批准是每个平台和任一履行者的全部授权。通过 `operator.write` 进行身份验证的操作员可以通过 `node.invoke` 调用启用的配对命令；没有针对每个操作的管理检查。

## <a id="safety"></a> 安全性

- Tool 策略、本地提供商启用和平台权限必须一致。 Node 目标还需要网关命令策略、配对和节点应用程序设置。在 macOS 上，包括 **允许计算机 Control**、辅助功能和屏幕录制；原生 Peekaboo 路径也需要事件发布。在这些持久控件保持启用状态时执行操作；没有每个操作的确认。
- macOS 执行器一次发送一个字素，因此取消、断开连接、暂停、禁用或端点替换都会在发送下一个字素之前停止执行。实验性的 CUA Driver 执行器会在每次调用时将节点取消操作传递给 SDK。
- 在 macOS 上，捕获和输入需要经过验证的解锁桌面。临时保持唤醒涵盖活动的计算机执行，包括后台操作，最多一小时。手动锁定、注销或未知状态释放断言并退出执行；稍后解锁需要重新执行。可选 [ 保持计算机唤醒 ](/platforms/mac/permissions#desktop-availability-and-keeping-awake) 使连接的主机在作业之间保持唤醒状态，而无需更改持久的 macOS 电源或锁定设置。
- CUA 录音、回放、浏览器上传、浏览器下载路径属于所选计算机主机。该模型仅接收不透明的执行范围资源句柄；在驱动程序调度之前，遍历、绝对路径、符号链接转义和帮助程序选择都会被拒绝。
- 截图仅供模型使用，不会自动发送到聊天中（问题 [#44759](https://github.com/openclaw/openclaw/issues/44759)）。
- 将屏幕内容视为不受信任内容；其中可能包含提示注入。

## <a id="troubleshooting"></a> 故障排查

### <a id="gateway-computer-unavailable"></a> 网关计算机不可用

在网关主机上启用 `cua-computer`，验证重点工件检查，并检查网关日志中是否有提供程序的启动错误。对于托管 Linux 桌面，安装所需的 TigerVNC、XFCE 和 D-Bus 二进制文件，并确认外部 VNC 侦听器未选择连接模式。对于现有桌面，检查网关是否在预期的图形会话中启动及其显示环境和权限。单独启用桌面面板不会启用 CUA。

如果您打算控制配对桌面，请明确选择 `target: "node"` 及其 `node`。不可用的网关目标绝不会将可能已完成的操作重定向到其他计算机。

### <a id="cua-driver-error-codes"></a> CUA 驱动程序错误代码

`cua-computer` 履行者在工具结果和所选主机的日志中显示了键入的错误代码。常见的：

| 代码                                                 | 原因                                                                                                                                                         | 修复                                                                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPUTER_DRIVER_UNAVAILABLE`                        | CUA 运行时无法初始化，macOS 应用程序拥有的端点不存在，或者桌面 permissions/session 不可用。                                | 在 macOS 上，验证已选择 CUA 并且捆绑的驱动程序已准备就绪；在 Windows/Linux 上，在交互式桌面会话中运行 `openclaw node run`。如果固定的运行时丢失，请重新安装 OpenClaw。 |
| `COMPUTER_DRIVER_PACKAGE_MISSING`                    | 固定的 SDK 包、OS/CPU 本机包、本机库或 Node 运行时不存在或不可读。                                                       | 在节点主机上重新安装 OpenClaw，重新运行 `openclaw doctor --lint --only cua-computer/driver-artifacts`，然后重新启动节点。                                                                         |
| `COMPUTER_DRIVER_VERSION_MISMATCH`                   | SDK 软件包或选定的本机软件包与固定版本不匹配。                                                                                 | 更新或重新安装 OpenClaw，以便两个软件包来自同一版本；重新运行重点医生检查。                                                                                                |
| `COMPUTER_DRIVER_DIGEST_MISMATCH`                    | 本机 SDK 库或 Node 运行时不是常规包文件，或者与其固定的 SHA-256 摘要不匹配。                                               | 不要手动运行或替换该文件。重新安装 OpenClaw，重新运行聚焦医生检查，然后重新启动节点。                                                                                      |
| `COMPUTER_DRIVER_PLATFORM_UNSUPPORTED`               | 节点主机没有适用于固定版本的本机 SDK 软件包，例如 musl Linux 或不受支持的 CPU 架构。                                        | 为此提供程序使用 Windows x64/ARM64 或基于 glibc 的 Linux x64/ARM64。                                                                                                                                  |
| `COMPUTER_REFUSED_<code>`                            | 驱动使用结构化代码拒绝了操作，例如 `background_unavailable`、`background_occluded` 或 `foreground_unavailable`（KDE/KWin Wayland）。 | 将目标窗口置于前台，切换到 X11，或使用受支持的合成器。请参阅上面的兼容性说明。                                                                                        |
| `COMPUTER_STALE_FRAME`                               | 坐标引用的截图已不再是当前截图（上下文压缩、显示器几何信息发生变化或引用宽度发生变化）。               | 在执行坐标操作前获取一张新的 `screenshot`。                                                                                                                                                  |
| `COMPUTER_STALE_OBSERVATION`                         | 窗口或浏览器引用属于较旧的观察、导航、执行或驱动程序生成。                                                   | 再次运行 `get_window_state` 或 `get_browser_state` 并使用新的不透明引用重试。                                                                                                            |
| `COMPUTER_UNSUPPORTED_ACTION`                        | 此履行者无法如实交付的操作：`hold_key`、`left_mouse_down`、`left_mouse_up` 或修饰符持有的 click/drag/scroll.                       | 使用受支持的操作。输入的 CUA 驱动程序桌面合约没有这些调用的保留输入或修饰符参数。                                                                                    |
| `COMPUTER_UNSUPPORTED_DISPLAY`                       | 非主 `screenIndex`、capture/screen 几何不匹配或光标位于主显示器之外。                                                     | 仅驱动主显示器。                                                                                                                                                                          |
| `COMPUTER_UNSUPPORTED_KEY`                           | 驱动无法可靠复现的 `key` 值：Shift 状态依赖键盘布局的数字或标点键，或未知键。                      | 改用 `type` 操作发送这类文本。                                                                                                                                                        |
| `COMPUTER_DRIVER_ERROR` / `COMPUTER_INVALID_REQUEST` | 驱动未提供结构化代码便执行失败，或操作参数格式错误。                                                                          | 检查驱动状态并重新获取截图；修正操作参数。                                                                                                                            |

<a id="desktop-stream-troubleshooting" />

### <a id="desktop-stream"></a> 桌面流

对于断开连接的 Web 桌面面板，请检查 [ 网关日志 `desktop observer closed` 和 `node stream closed` 的 ](/gateway/logging)，以及 `node stream closed` 的节点日志。记录将第一次本地清理 `trigger` 与观察到的 WebSocket `closeCode` 分开；观察员记录还包括请求的 `cleanupCode`。

`closeCode` 或 `1006` 本身并不能识别网络或代理故障：故意的所有者拆卸也会产生这种故障。比较网关和节点上的触发器和可用的 source/connection 身份。这些记录省略了对等关闭原因文本、观察者令牌、附加票证、凭据和桌面有效负载。

### <a id="macos-desktop-availability"></a> macOS 桌面可用性

如果桌面面板报告 **此 Mac 已锁定** 或显示其锁定状态未知，请检查 **仪表板 → 设置 → 此 Mac → 桌面可用性**。 OpenClaw 独立于可选活动共享报告本机会话状态；连接的节点和捕获的壁纸都不能证明桌面已解锁。

屏幕共享保持连接以进行正常登录。通过正常登录屏幕或本地解锁Mac，然后启动新计算机执行；旧的执行不会恢复。如果 macOS 在查看器中省略其安全登录控制，请使用受支持的本地或远程登录路径。 OpenClaw 的可用性报告不会改变 macOS 捕获安全屏幕的方式。

对于应在作业之间保持唤醒状态的专用 Mac，请在 **仪表板 → 设置 → 此 Mac** 中显式启用 **保持计算机唤醒**。它仍然受当前连接、托管和解锁会话要求的约束。当最后一个查看者断开连接时，屏幕共享可能会请求立即锁定；即使启用了 **Keep computer awake**，OpenClaw 也会遵守该锁定。 Web 桌面查看器不会创建 OpenClaw 保持唤醒执行。查看 [ 桌面可用性并保持唤醒状态 ](/platforms/mac/permissions#desktop-availability-and-keeping-awake)。

<a id="macos-permission-troubleshooting" />

### <a id="macos-permissions"></a> macOS 权限

**仪表板→设置→本机→功能**中的计算机Control状态分别检查辅助功能、事件发布和屏幕录制。当输入仍然被拒绝时，屏幕捕获可以工作，因为 macOS 将这些授权存储在单独的 TCC 存储桶中。

如果状态显示 **Accessibility grant may be stale**，则 OpenClaw 可能已在 **System Settings → Privacy & Security → Accessibility** 下显示为启用，即使 macOS 拒绝它。当辅助功能条目固定到较旧的应用程序版本时，就会发生这种情况。在该列表中选择 OpenClaw，使用 **−** 将其删除，然后重新添加 `/Applications/OpenClaw.app`。更改授权后退出并重新打开 OpenClaw，因为 macOS 可以在进程的生命周期内缓存可访问性信任。

## <a id="relationship-to-other-desktop-control-paths"></a> 与其他桌面控制路径的关系

这是代理驱动的路径。请参阅 [Peekaboo 桥 ](/platforms/mac/peekaboo)，了解它与 PeekabooBridge 主机、[Codex 计算机 Use](/plugins/codex-computer-use) 和直接 `cua-driver` MCP 的关系。
