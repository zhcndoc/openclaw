---
doc-schema-version: 1
summary: "Gateway 基于浏览器的控制 UI（聊天、活动、节点、配置）"
read_when:
  - "你想通过浏览器操作 Gateway"
  - "你想在不使用 SSH 隧道的情况下访问 Tailnet"
title: "Control UI"
sidebarTitle: "Control UI"
---

Control UI 是一个由网关提供服务的小型 **Vite + Lit** 单页应用程序：

- 默认：`http://<host>:18789/`
- 可选前缀：设置`gateway.controlUi.basePath` （e.g. `/openclaw`）

`gateway.controlUi.enabled` 热门应用。禁用它以停止提供仪表板页面和资产，同时机器人和现有网关连接继续运行。重新启用以恢复服务；缺失的资产是在后台准备的。更改服务基本路径或资产根仍然需要重新启动网关。

对于不匹配的 HTTP 路径，app-shell 回退将遵循请求的 `Accept` 标头。显式 HTML 拒绝（例如 `text/html;q=0, */*`）会覆盖更广泛的通配符，因此请求到达启动 `503` 或最终 `404` 响应。无标头和仅通配符请求保留浏览器导航回退。

它通过同一端口上**直接**连接到 Gateway WebSocket。

## <a id="browser-requirements"></a> 浏览器要求

在 Safari 26.2 或更高版本上使用 macOS 26.2、iOS 26.2 或 iPadOS 26.2 或更高版本，或者最近发布的 Chrome 或 Firefox六个月（截至 2026 年 10 月，Chrome 147+ 和 Firefox 150+）。嵌入式 Web 视图需要相同的浏览器功能。

缺少所需覆盖功能的浏览器会在仪表板启动之前显示更新屏幕。在本机应用程序中，**在浏览器中打开** 在默认浏览器中打开当前页面。如果浏览器或操作系统也显示更新屏幕，请更新该浏览器或操作系统。

在**设置→外观→浏览器选项卡图标**中，选择**代理头像**以使用所选代理的图像。 **Shape** 行提供 **Square**、**圆角** 和 **Circle**。 Square 保留完整图像；圆形和圆形图标使用居中裁剪。该选择将与您的选项卡图标首选项一起保存，并且活动徽章在每个形状上仍然可见。

网关重新启动后，代理可能需要几分钟来准备其数据库。聊天视图显示“正在启动”，并且侧边栏在准备等待期间保持安静。当代理准备好时，两者都会自动重新加载；实际准备失败仍显示其诊断和修复说明。

重新加载以前访问过的聊天会在网关重新连接时恢复上次设置的侧边栏。固定会话、插件行、花名册顺序、过滤器和您的显示身份将保留其位置，直到实时数据准备就绪。页脚仍然报告当前的连接状态。此浏览器缓存的范围仅限于网关和配置文件，30 天后过期，并且不包括隐身会话。同一快照提供了第一个聊天标题的已保存会话行和路由默认值。缓存的行从不授权会话更改。

当对话位于已保存的侧边栏页面之外时，缓存的记录还会保留其对话标题。实时会话元数据会在显示投影到达时替换它。

经过身份验证的同源重新加载包括文档中的共享显示设置以及您的个人资料的外观和侧边栏首选项。聊天在连接时使用此显示投影，而不加载完整的可编辑配置。其他选项卡的首选项更改会通过网关的现有通知进行刷新；设置页面和配置写入仍会加载完整快照。

保存的图钉标签在其详细信息刷新时仍然可见，即使这些会话位于第一个列表页面之外也是如此。不可用的引脚会默默消失，而不会删除其保存的快捷方式。到达一个显示框架内的侧边栏会话更新一起绘制。侧边栏刷新重用未更改的会话行，同时仍然接收当前计数、默认值和过滤器。当同一客户端保留其修订版本时，重新连接可以重用这些行；对可见成员资格或行事实的更改会返回一个新页面。

当缓存的对话重新加载时，内联小部件和 MCP 应用程序会保留其最后呈现的高度，因此加载其内容不会移动周围的消息。新的小部件使用其声明的大小，直到内容报告其高度。更改内容或不同的窗口宽度仍然可以调整小部件的大小。

脚本历史记录与浏览器缓存并行加载。未更改的历史响应将缓存的消息行和小部件大小保留在适当的位置。在显示其初始测量行之前，转录本会恢复其保存的阅读位置，或在末尾打开。一旦提交了所选的几何图形，测量的行就会变得可见，而无需额外的布局框架。

在连接恢复期间，Send 显示其繁忙状态，并解释为什么发送不可用，而无需在编辑器上方插入临时通知。

当网关报告重新启动或暂停时，自动读取确认和身份刷新暂停。待读确认在重复的会话更新之间共享。如果确认被拒绝，稍后的更新将尊重服务器的重试延迟并使用随​​机退避，而不是立即发送另一个补丁。

重新连接引导读取也会一起暂停：代理身份、会话订阅、会话组、待处理问题和会话列表。宣布的重新启动或暂停会保留这些读取，直到准备就绪或新连接恢复加载。如果在没有通知的情况下拒绝重新启动，则一次延迟探测会在至少一分钟后检查恢复情况，以防重新启动被取消。此机制永远不会重播写入操作。

代理身份在同一连接上的视图之间共享，并在配置或代理更改后刷新，包括通过网关保存的 `IDENTITY.md`，而不是在选项卡空闲时过期。重新加载选项卡以获取对工作区 `IDENTITY.md` 或头像图像文件的直接文件系统编辑。

如果网关的请求队列已满，自动侧边栏会话发现将保留当前行并重试最多 3 次，同时考虑服务器的重试延迟。持续失败显示“服务器正忙。请稍后再试。”其他操作可以立即显示此消息；稍等片刻，然后重试该操作。

当初始连接或路线加载时，微光占位符会保留聊天布局。主页和系统繁忙度直接在目标面板中打开，在内容加载时带有工作标题和关闭控件。短暂加载不会闪烁占位符；较慢的加载会在面板内显示占位符，加载错误会在同一位置提供重试。页面的其余部分仍然可用。拖动系统繁忙度标题栏可移动面板；该浏览器会记住它的位置。您还可以聚焦标题栏并使用箭头键（Shift 移动得更远）。 Compact/expanded 过渡动画短暂，尊重减少的运动，并将面板保留在窗口内。加载指示器尊重您的主题和简化动作偏好；网关启动进度在可用时仍然可见。

在自动侧边栏会话列表刷新之前加载选定的聊天。启动期间实时事件仍保持订阅状态，并且显式侧边栏操作仍然可用。后台列出了转录加载或报告错误后的恢复。接受的新会话立即刷新可见侧边栏，包括 **Involving me** 和所有者筛选器，无需等待聊天完成加载或客服人员完成工作。

使用 **Snooze → 在会话菜单中选择另一个时间** 以选择浏览器本地时区中的未来日期和时间。成功暂停后，**Custom** 在其他会话菜单中显示确切的日期和时间一小时。选择另一个自定义时间来替换它；预设和撤消使记住的选择保持不变。浏览器为每个网关和登录帐户单独存储此选择，并在其过期或唤醒时间过去时将其删除。如果浏览器存储不可用，则该选择仅在当前页面中可重复使用。

聊天标题的 **Details** 面板将会话信息分组为由微妙分隔符分隔的可折叠部分。 **Environment** 显示工作空间名称、分支、工作树、执行设备和模型。绝对工作空间路径远离面板文本和工具提示；当您需要完整路径、复制分支或打开 **显示会话文件** 来浏览工作区时，请使用 **复制路径** 。 **Context** 显示当前上下文使用情况和最新的 input/output 令牌计数（如果可用）。大致用途保留其 `~` 标记。 **Changes** 将拉取请求、更改总计、检查和可用的发布操作放在一起。后台任务、自动化、参与者和任务进度保留其现有的会话范围操作。在广泛的对话中，详细信息会停靠在文字记录旁边；范围较小的对话在标题下方使用可关闭的弹出窗口。在桌面上，使用 **Details** 切换按钮打开或关闭面板；手机在面板内保留了一个关闭按钮。

会话详细信息在侧边栏、聊天和资源面板上共享并发读取。返回到未更改的会话会在同一连接上重用其详细信息。会话更改、显式刷新和重新连接获取当前详细信息；失败的读取仍然可以重试。

侧边栏拉取请求指示器重用最后一个已知的快照。打开会话、其进度卡或其 Git 活动会请求当前结帐事实；仅侧边栏行不会轮询 Git。活动面板检测 Git 元数据的分支和暂存更改。工具完成会刷新工作树统计信息，并为 OpenClaw 之外进行的编辑提供五分钟的回退。

在聊天的 **Changes** 面板中，装订线 V 形折叠了文件中的完整函数、类和其他语言支持的多行块。一切都开始扩展，包括编辑。折叠的占位符显示隐藏行数和 additions/deletions；单击它以展开。分割视图和统一视图共享相同的折叠。文件菜单提供**折叠代码**、**折叠函数和类**和**展开代码**，与折叠整个文件分开。不完整的源代码、遗漏的空白、不支持的语言和过大的预览仍然处于扩展状态。更改补丁会重置代码折叠。

后台拉取请求比较使用本地 Git 对象，并且从不获取丢失的历史记录或 blob。如果部分克隆缺少比较所需的对象，则统计信息可能会保持不可用，直到获取这些对象为止。超时比较会跳过其相关检查，在没有统计信息或创建 PR 链接的情况下保持分支可见，并记录警告以获取存储库历史记录并重试。

侧边栏的 **Online** 列表显示带有头像存在指示器的紧凑人员行：纯绿色表示活动，琥珀色表示空闲，空心绿色环表示与活动不可用。名称保留在一行上，当空间紧张时，名称会在边缘消失。指示器、悬停卡和可访问的描述保留了活动的区别。每行末尾的一个紧凑组显示一个主题强调旋转器和运行计数，然后是一个小消息圈图标和静音打开计数。每个图标数字对都使用表格数字并保持其自然宽度，运行组和开放组之间的间隙更大。该小组位于右侧边缘；名称和计数共享文本基线，没有固定的数字列。静止时计数没有药丸背景，并带有解释性工具提示；悬停或键盘聚焦该行会显示出微妙的分组药丸，而不会改变内容。减少运动使旋转器保持静止。已知的零计数被省略。开放计数每个人拥有的、未存档的对话，您可以跨配置的代理访问这些对话，不包括隐藏的子代理、自动化、系统和 global/unknown 会话。当其自己的代理轮次执行或其委托的子代理保持活动状态（包括当父代理等待其结果时）时，运行会对每个对话进行一次计数。没有活动委派工作的排队直接轮次不计算在内。计数涵盖分页之前的匹配会话，并且不会随会话列表过滤器而改变。默认情况下，所有已连接的人员均保持可见，顺序依次为“活动”、“空闲”、“在线但活动不可用”。将鼠标悬停在 **Online** 块上或使用键盘将其聚焦以显示 **Filter & sort**；该操作在触摸设备上仍然可用。其紧凑的菜单使用现有的下拉控件：选择 **All** 或 **Running**，并按 **活跃人士优先**、**跑步会话** 进行排序， **会话总数**，或**名称**。鼠标悬停打开选择子菜单；选择一个选项会关闭菜单。计数排序将较大的值放在前面，将不可用的计数放在最后； **总会话数** 使用上面的打开计数，而不是生命周期历史记录。 **重置为默认值**仅在设置更改后出现在单个分隔符下方，并恢复默认视图。这些控制只能过滤或排序人员；它们不会更改会话列表查询或隐藏任一计数器。不可用计数显示没有占位符；行工具提示和可访问的描述将它们标识为不可用而不是零。刷新失败会保留最后的计数并发出重试通知。

人员悬停卡在打开时保持其 **最近会话** 选择和顺序稳定，因此后台活动不会移动指针或键盘焦点下的链接。重新打开该卡会选择最新的会话。时间戳保持有效，留下可见的、符合条件的名册的会话会消失，而不会用其他会话替换它们。 **正在查看**继续关注存在。

当浏览器选项卡隐藏时，侧边栏实时旁白会暂停，并在您返回时从当前活动恢复。选定的聊天和待处理的发件箱保留其单独拥有的订阅。

**我的会话** 和特定所有者选择列出了已配置代理之间的所有者会话，与您正在查看的聊天或工作区无关。当您切换代理时，即使所选聊天仍在加载，其他代理范围的侧边栏列表也会立即刷新。自动启动和重新连接刷新将继续等待该聊天准备就绪。

所有者过滤的侧边栏将实时更新应用于加载的会话，而所有权和列表成员身份保持不变。所有权变更、新会话和广泛失效仍然刷新着权威列表。完成的刷新会吸收任何较旧的计划回退读取。

在 **我的会话** 中，从切换器中选择一个座席会从列表中恢复该座席最新加载的活动对话，或者在未加载任何座席时打开其主页。代理未读指示器和主页活动使用相同的当前列表；家庭控件保持其单独的主会话行为。

侧边栏的 **未发送草稿** 铅笔覆盖已保存的文本、附件、回复和目标，包括在另一个选项卡中或重新加载之前保存的草稿，而无需重新打开对话。较新的编辑或清除始终会替换较旧的已保存草稿。隐身对话永远不会显示保存的铅笔草稿。发件箱注意标志还会对排队的邮件进行计数，其中包含连接完成恢复后需要查看的附件。

如果此浏览器已保存无法恢复到聊天的草稿或消息，则 **已保存草稿** 或 **已保存消息以审阅** 通知会显示其内容和附件名称。空记录不计算在内。仅当可以从可用对话中识别原始聊天时，才会命名原始聊天。选择 **在此聊天中查看** 在非隐身聊天中，消息框为空且没有待处理消息；确认将恢复保存的副本而不发送它。未经确认发送的消息将保持暂停状态 - 请在重试之前检查原始聊天。 **删除已保存的副本** 要求确认并仅删除已保存的草稿、消息和一起显示的附件，而不是已发送到聊天的消息。

启用侧边栏预览后，正在运行的会话会在会话名称下方第二行的进度文本旁边显示一个小的静态工具图标。标题行保持不变，工具名称仅在图标的工具提示和可访问标签中可用，而不是作为可见文本重复。紧凑的单行侧边栏和团队名册不添加工具图标或工具文本，因此工具更改不会移动列表。工具进度仅使用来自网关的显式公共进度文本，从不使用参数派生的元数据或原始命令输出。如果呼叫的进度被隐藏，则其显示的进度将被撤回。待决问题和其他关键状态保持现有优先级。现有会话指示器仍然是唯一的活动动画，并且当其实时订阅结束时，工具状态将清除。

实时旁白最多保留六个可见的正在运行的后台会话，加上打开的会话。最近的变化使该窗口保持稳定；当会话完成或离开可见行时，最近的合格会话将填充其槽位。重新连接会选择一个新窗口。

如果旁白订阅遇到可重试的失败或超时，它会使用随机指数退避自动重试，尊重服务器的重试延迟。侧边栏更新共享挂起的重试，而不是发送更多请求。当会话离开旁白窗口、选项卡隐藏或连接关闭时，重试停止；不可重试的错误等待新的订阅意图或连接。

失败的旁白版本使用相同的退避，包括隐藏选项卡时。如果再次需要会话，则会取消其排队的释放并安全地续订其订阅。关闭网关连接会取消释放重试。

关闭的终端、浏览器和桌面面板会在您打开它们时初始化，而不是在初始导航期间初始化。 Home/Ask OpenClaw 和系统繁忙使轻量级框架保持就绪状态，并推迟其对话或诊断内容直到打开。在整个加载过程中，Home 会保留其保存的停靠位置和大小。保存为打开状态的面板在重新加载后仍会恢复。设置不自动重新打开询问OpenClaw；它的控制和诊断操作仍然可以显式地打开它。

最小化并重新打开仪表板侧面板会保留已加载的 MCP 应用程序及其未保存的应用程序内输入，同时应用程序租用仍然有效。

隐藏保留的聊天会推迟命令和模型元数据刷新，直到您返回它们为止。返回到最近打开的聊天会在同一连接上重用其已完成的元数据，直到网关更改使其失效。同时阅读的读者也有同样的要求。模型选择修订版未更改的会话事件保留模型目录，仅会话更改保留代理命令。没有模型选择修订版的本机会话在普通补丁之后等待 2.5-second 安静期，然后再刷新目录和会话事实。显式模型、帐户和运行时选择会立即刷新。配置和命令更改刷新命令；目录和会话生命周期更改会刷新受影响的模型选择。特定于代理的目录更改会保留其他代理的缓存选择和待处理的目录请求。请求期间的重复更改共享一次尾随刷新，而不是发出重叠请求。

元数据刷新等待正在进行的模型运行时替换发布。模型运行时不可用的代理不会中断健康代理的命令或模型选择；当其所有者发布时，其元数据就可用。

新会话使先前获取的模型选择保持可选状态，同时其目录在后台刷新。在第一个目录到达之前，它不会将配置的默认值转换为模型选项。命令选项板模型结果使用相同的目录缓存，并且独立于较慢的搜索类别而显示。

提供商身份验证状态在视图之间共享，并在帐户更改后以及接近凭证警告或到期期限后刷新。没有过期的凭证不需要定期刷新。隐藏的选项卡推迟截止日期刷新，直到再次可见。

侧边栏每次连接都会加载一次自动化状态，并在自动化或配置更改后刷新。当选项卡可见时，失败的读取每分钟重试一次，并在成功后停止重试。侧边栏运行状况和自动化页面在宣布的重新启动或暂停期间刷新暂停，并在网关再次可用时进行更新。逾期警告会在当地截止日期之前提前发出，而无需轮询网关。隐藏的选项卡在可见时会赶上；返回到未更改的选项卡不会轮询自动化。命令选项板搜索在同一连接上重复使用其自动化清单，直到这些更改之一或重新连接为止。

在会话的菜单中，打开 **View → Speech bubbles** 将该对话（包括主会话）切换到两侧气泡。您的消息保留在右侧，客服人员的回复则流入左侧的气泡中。该选择将按会话保存在该浏览器中；其他会话保持自己的模式。将其关闭以恢复平面回复布局。在气泡模式下，活动显示为紧凑的 **…** 预览。单击它可查看完整的工具或状态详细信息。代理反应会出现在他们确认的提示下方，与所选布局无关。

自动化输入显示为紧凑、折叠的活动行，而不是消息气泡。展开一行以阅读完整提示并访问其消息操作。即使多个作业在同一个对话中运行，每个自动化输入也保持独立。展开的 **From** 链接会打开该自动化的“历史记录”选项卡并突出显示原始运行；需要时从历史记录中打开运行记录。

思维、速度和上下文窗口变化在显示同一会话的窗格之间保持同步。当更改待定时，最新的选择仍然可见。被拒绝的更改将恢复最新确认的值。替换会话中的延迟事件会使当前记录和未发送的草稿保持不变。

当代理工作时，当模型和运行时提供完整的注释或序言时，它们会内嵌在对话中。旁白与工具活动保持其格式和位置；工作指示器保持执行、启动或批准的单独状态。聊天视图菜单中的 **保留评论** 控制评论在运行后是否保持可见，而不是活动运行的旁白是否在历史记录刷新后继续存在。完成的仪表板轮流将其旁白和工具活动折叠在答案上方的 **Worked for …** 下，持续时间为 **Worked for 2 分钟 3 秒**。展开它会恢复现有工具调用组的顺序，并显示工具调用总数。当没有可用的运行持续时间时，标题将显示为 **Worked**，而不是根据消息时间戳进行估计。即使折叠起来，失败和其他不成功的结果仍然可见，例如 **工作了 2 分钟 3 秒 · 2 次失败**。

仍在流式传输的助理文本保留在其运行的底部、保存的输出下方，并在保存后占据其转录位置。

接受的转向消息保留其保存的转录位置。较早保存的输出保留在消息上方；稍后的答案和实时输出出现在其下方，包括转向后继续进行相同的运行时。重新加载或重新连接不会将消息移至该运行的末尾。未保存的辅助文本仍然是一个活尾，直到保存的行替换它； UI 不会拆分或重写存储的助理消息。

连续的工具活动共享一个可扩展日志，包括在新的运行中恢复后台工作时。可见的消息、媒体和对话标记保留其位置并单独记录；实时响应文本和工作指示器保留在日志之外。分组仅更改演示文稿，而不更改文字记录。

会话间消息显示为来自 **活动行的紧凑** 更新，而不是聊天气泡。来自同一源的连续更新共享一行；其他消息和对话标记将它们分开。选择行以一步显示原始消息和时间戳，或选择源名称以打开该会话。搜索结果和回复导航会显示匹配的消息。这仅更改表示方式，而不更改存储的消息或运行所有权。

当传入消息导致跳过未启动的工具调用时，其卡片和工作摘要显示 **Skipped**，包括重新加载对话后。批准阻止和工具失败保留其单独的结果。

失败的回复在标题右侧显示 **重试**。标题旁边的紧凑型 **复制错误** 图标出现在悬停或键盘焦点上，并且在触摸设备上保持可见。 **Details** 仅当诊断包含的内容多于可见摘要时才会出现。要更改模型，请使用 Composer 中的模型选择器；重试将从现有对话继续，而不重播原始请求。

聊天标题将 **Share**、**Layout** 和会话菜单放在一起。 **Layout** 包含焦点、分割、交换、面板选择和停靠位置操作及其键盘快捷键。打开 **Subagents** 或从侧面板 **+** 菜单检查子运行，包括 swarm 工作线程。面板关闭后，一场空洞的对话开始了。第一个运行批次会自动添加它，并保留您选择的另一个面板；关闭它会使其对该批次保持关闭状态。完成的结果将保持打开状态，直到您将其关闭。当家长等待子代理时，对话将每个孩子的爪子、姓名和当前活动放在一个可点击的行中。最右侧的单个静音计时器显示自您的消息以来的总时间，包括子代理等待（当该请求已知时）。作曲家上方没有第二个状态行。当对话使用后备等待指示器而不是命名子活动时，其时钟会测量从父活动最新记录的运行结束开始的当前空闲间隔，而与加载的切换历史记录无关。活跃的孩子本身并不会发明等待从未跑过的父母的方法。该面板自动加载所有子页面并对正在运行和已完成的工作进行分组，让子页面在 **Running** 下等待自己的后代。它显示经过的时间和可用的工具活动，并在父项旁边打开每个子项现有的仅供查看的记录。运行行显示公共工具进度（如果可用），否则显示当前工具步骤的用途（例如 exec 调用的标题）或运行的最新状态摘要以及调用计数。当仅加载长历史记录的一部分时，计数是下限，例如 **40+ 调用**。无头像子转录本不保留空头像列，窄窗格使用紧凑的水平插图，而宽转录本保留阅读宽度限制。它不会向左侧边栏添加行。并行任务视图还显示总体集群进度。直接打开的子页面提供**打开父会话**。 `/subagents list`、`/subagents info <id|#>` 和 `/subagents log <id|#>` 命令仍然可用。

从聊天标题的 **Layout** 菜单或侧面板 **+** 菜单打开 **Processes** 以检查对话的后台执行命令。它与 **Subagents** 是分开的。正在运行和保留的已完成进程显示状态和经过的时间。 **Finished**开始崩溃；单击其标题可展开或折叠列表。选择一个进程将打开其最近的输出。 **Stop** 的目标是该确切进程，而不是父对话或其他同名命令。隐藏面板停止刷新。输出遵循流程所有者的临时保留限制；查看它不会耗尽等待代理的输出。

在聊天标题中选择会话的标题以对其进行重命名。输入保存名称； Escape 取消编辑。当输入法正在撰写文本时，Enter 和 Escape 会继续撰写。在保存或取消之前完成创作。一旦网关确认重命名，即使较旧的快照迟到，保存的名称在会话列表刷新时仍然可见。

打开组重命名和 **新会话默认值当网关重新连接或切换连接时，** 对话框将关闭。重新打开组的菜单以使用当前连接进行更改。

在侧边栏组之间拖动会话会立即更新其位置。即使后续列表刷新失败，成功的保存也会保留该位置； UI单独报告刷新错误。如果连接失败导致保存未确认，请在重试之前刷新并检查会话组。其他客户端的新组更改仍通过会话事件进行协调。

侧边栏使未读的子失败在其祖先上可见。这些警告会指出失败的子会话，即使其父会话已完成或继续工作也是如此。选择警告以打开子会话并确认其失败；子代理聊天打开时不添加侧边栏行。

在侧边栏或代理主页中选择 **新代理** 以打开托管人聊天。它推荐一名幕僚长、研究员、作家、审稿人，或一个由四者兼备的小团队。回复一个选择，或描述定制工作和名称。角色选择使用与 CLI 相同的 [ 角色模板](/cli/agents#role-templates)；创建等待操作员批准。对于自定义工作，批准的用途保存在新工作区的`AGENTS.md`中；正常的身份仪式仍在进行。启用 `skipBootstrap` 后，仅对这些请求的指令进行播种，而无需通用标识或引导程序文件。现有的工作区指令永远不会被覆盖。如果 `AGENTS.md` 已包含不同的指令，请为自定义代理选择新工作区。创建的代理将显示在代理主页和代理切换器中。

侧边栏代理菜单使用带有有界、可滚动列表的水平行。拥有六个以上智能体，**查找智能体…** 按显示名称或智能体 ID 进行筛选；匹配的名称保留其现有的固定顺序。重复的姓名会在下方显示其 ID。新代理、目录、功能和设置操作位于滚动列表之外。重新打开菜单将清除过滤器并显示所选代理。打开 **新代理** 会保留您现有的询问 OpenClaw 对话。在打开创建选项之前完成所有待处理的向导或批准。如果团队创建中途停止，托管人会报告保留的代理，以便您可以在创建缺少的成员之前检查它们。

## <a id="download-files"></a> 下载文件

在 **Files** 面板中，将鼠标悬停在文件上或将焦点放在其行上，以显示预览和复制路径旁边的 **下载文件**。文件预览工具栏中也提供相同的操作。它通过浏览器保存原始文件，无需打开其他页面；不包括未保存的编辑器更改。文件直接流式传输到浏览器的下载管理器，没有单独的下载大小上限。内联预览限制仍然适用，但文件太大而无法预览，但仍会保留其下载操作。文件夹不可下载。下载需要 Control UI 及其网关连接共享源（包括同源网关代理）。

下载使用会话的现有文件读取访问权限，包括托管存储库工作区。提供程序支持的节点工作区的桥仅支持整个文件读取，尚不支持下载。 UI出现授权错误；传输进度和失败会显示在浏览器的下载管理器中。

## <a id="take-a-photo-in-chat"></a> 聊天中拍照

选择 **添加附件 → 在聊天或新会话中拍照** 打开相机预览。当浏览器询问时允许相机访问，然后选择 **Capture**、**Retake** 或 **使用照片**。所选照片成为草稿附件；它不发送消息。预览保留在您的浏览器中，并且不请求麦克风访问权限。

实时预览需要 HTTPS 或 localhost 以及支持相机访问的浏览器。在普通 HTTP LAN 地址或没有相机 API 的浏览器上，选择 **使用设备相机** 打开本机捕获选择器。这保留了移动相机的捕捉功能，而无需默默地用选择器代替预览；您的浏览器决定是否显示相机或文件选择器。如果访问被拒绝，请在浏览器和操作系统相机设置中允许该站点，然后重试。显式的 **使用设备相机** 选项在预览请求失败（包括权限拒绝）后仍然可用；它永远不会自动打开。如果没有可用的相机，请选择“**上传照片”**。

当您拍摄照片、关闭对话框或留下草稿时，相机会停止。文件和照片上传仍然可以通过现有的选择器进行，包括 iOS Safari 上的组合 **Attach…** 选择器。

## <a id="watch-a-desktop-in-picture-in-picture"></a> 以画中画方式观看桌面

连接桌面查看器，然后在其工具栏中的画中画 **中选择** 打开桌面。浏览器会打开一个仅供查看、始终位于顶部的窗口，以便您可以在使用其他选项卡或应用程序时观看远程计算机。在停靠面板、聊天侧面板和焦点桌面窗口中也可以执行相同的操作。

这需要安全上下文（HTTPS 或本地主机）和公开文档画中画 API 的桌面浏览器，包括受支持的 Chrome 和 Firefox 版本。当 API 不可用或桌面未连接时，该控件被禁用。浏览器权限仍然可以拒绝请求；检查这些权限并再次单击该控件以重试。 OpenClaw 不会用普通弹出窗口替换不受支持的 PiP。

PiP 镜像现有的实时连接，无需控制或打开第二个桌面连接。关闭 PiP 会使原始查看器和远程任务继续运行。断开连接、更改查看器的源或会话或关闭原始查看器将关闭 PiP；它不会停止远程任务。保持开启标签打开。休眠的计算机或暂停整个页面的浏览器无法继续流式传输。

## <a id="quick-open-(local)"></a><a id="quick-open-local"></a> 快速打开（本地）

如果网关在同一台计算机上运行，​​请打开 [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）。

如果页面无法加载，请先启动 Gateway：`openclaw gateway`。

<Note>
在原生 Windows LAN 绑定中，即使 `127.0.0.1` 在 Gateway 主机上可用，Windows 防火墙或组织管理的组策略仍可能阻止所显示的 LAN URL。请在 Windows 主机上运行 `openclaw gateway status --deep`；它会报告可能被阻止的端口、配置文件不匹配以及本地防火墙规则，而这些规则可能会被策略忽略。
</Note>

认证会在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token` 或 `connect.params.auth.password` 中配置的共享密钥； `gateway.auth.mode` 选择配置的值（`gateway.auth.token` 或 `gateway.auth.password`）
- 当 `gateway.auth.allowTailscale: true` 时使用 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时使用受信任代理身份头

网关身份验证在设备配对之前运行。直接环回连接不会绕过令牌或密码身份验证。登录屏幕和 **Settings → Gateway** 使用一个 **Gateway Secret** 字段：粘贴令牌或输入密码。成功连接后，仅当网关报告令牌身份验证时，UI 才会在当前浏览器选项卡和网关源的会话存储中保留机密。密码保留在内存中并且永远不会保留。配对后，浏览器可以在以后的连接中使用其存储的每设备令牌。

当 [MCP Relay](/plugins/mcp-relay) 等插件通过 [ 远程入口 ](/plugins/sdk-gateway-ingress) 嵌入 Control UI 时，其实时授权会承认浏览器的签名设备身份，而无需共享凭据。访问权限受赠款主体的约束，并受其访问限制的限制。浏览器不存储设备令牌；每次重新连接都会再次被实时授权所承认。嵌入页面保持与服务网关的连接，隐藏网关 URL 和共享秘密控件，并且不注册服务工作人员。在没有 token/password 登录屏幕的情况下，连接失败在应用程序中仍然可见。

提供链接网关的嵌入器将它们添加到身份菜单的 **Gateway** 部分。选择一个网关来切换嵌入页面，选择 **设置为主**（如果可用），或者在主机中打开 **网关设置…**。主机拥有列表、主要选择和导航。本机窗口操作、本机网关键盘快捷键和本机重新连接操作在嵌入模式下不可用。

如果您将设置代码从 **Devices → 配对设备 → 将设置代码** 复制到 **Gateway Secret**，则 UI 在连接前会显示内联提示。将该代码粘贴到 OpenClaw 移动应用程序中的 **Settings → Gateway** 中。对于 Control UI，请在网关主机上的交互式终端中运行 `openclaw gateway auth-token --show` 并粘贴共享令牌。如果由于令牌或密码不匹配而拒绝使用设置代码的连接，则登录屏幕会重复此指导。

本地加入默认以令牌模式生成网关密钥，无需 token/password 选择器，并保留现有密码模式。使用 `--gateway-auth password` 或 `--gateway-password <value>` 进行显式密码设置； Tailscale 漏斗需要密码模式。如果网关在没有配置令牌的情况下以令牌模式启动，它将为该进程生成一个临时运行时令牌。运行时令牌未写入配置，因此无法恢复，并且没有该令牌的环回浏览器将被拒绝。运行 `openclaw doctor --generate-gateway-token`，重新启动网关，然后在交互式终端中运行 `openclaw gateway auth-token --show` 并将输出粘贴到 **Gateway Secret** 中。

## <a id="agents-home"></a> 智能体首页

在边栏中打开 **Agents**，在代理菜单中选择 **查看所有代理**，或访问 `/agents` 以名册形式查看您配置的代理。每张卡片都会显示客服人员的身份、模型、当前工作状态、上次活动以及主聊天的预览。 **打开聊天** 打开该代理的主会话。工作代理首先出现，然后是最近活跃的代理。

**管理代理**开通`/settings/agents`。 **新代理**需要网关的`openclaw.chat`方法和`operator.admin`范围。如果没有该访问权限，代理主页和设置控件将保持可见但被禁用；他们的工具提示解释了如何与所需的范围配对并重新连接。直接打开保管人也解释了错过访问的情况，而不是默默等待。 `/agents` 开启名册；代理配置仍为 `/settings/agents`。

要跨代理浏览会话，请在代理切换器中选择 **显示全部** 磁贴。它与两个或多个代理一起出现，并将他们自己的化身分组：两个对角重叠，三个或四个形成两列网格，五个或更多显示三个化身加上剩余代理计数。这将启用 **团队模式**，这是默认情况下关闭的浏览器首选项。顶行成为工作区标题，其中包含配置的网关显示名称或 **OpenClaw** 以及一个小的静态 OpenClaw 标记。两种模式使用相同的菜单：代理图块，**新代理**，**查看所有代理**，然后**之前的分隔线Harbor可以做什么？**和**Harbor设置**，以活动代理命名。 **查看所有智能体**开通`/agents`；命名设置操作将打开该代理的配置。所选图块有一个头像环。帮助及其链接保留在帐户菜单中。固定会话保留在 **Pages** 中，使用其代理的头像作为图标。其他会话按配置的名册顺序显示在可折叠代理标题下，随着活动的变化，该顺序保持稳定。 **Home** 从页面中消失：单击客服人员标题的头像或姓名以打开该客服人员的主聊天。单独的折叠控件仅折叠其会话。工作区标记下方的重音轨 **+**，标记为 **新对话**，打开一个代理菜单，其中的头像和姓名与组的顺序相同；选择一个代理会打开该代理的新会话。每个组的 **+** 直接执行此操作，出现在悬停或键盘焦点上，并在触摸设备上保持可见。选择会话会切换活动的聊天代理。在工作区菜单中选择一个已命名的代理图块，以离开团队模式并选择该代理，恢复代理芯片、主行和直接“新建会话”按钮。

选择 **显示全部** 默认共享页面范围为 **所有代理**。该范围（包括显式 **所有代理** 选择）保存在每个网关的此浏览器中。即使您在团队模式下打开不同代理的聊天，它也能在重新加载和切换到另一个网关并返回后继续存在。选择指定的代理磁贴会离开团队模式并将页面范围分配给该代理。在团队模式下，您仍然可以选择更窄的页面范围；在页面之间导航不会重置该选择。自动化、仪表板、会话和使用情况支持所有座席视图，座席身份显示在混合座席行上。在“设置”中，在侧边栏标题下方选择一个代理，以在代理、模型、内存和技能中保持相同的目标。全局设置仍然是全局的。技能工坊使用通过聊天选择的代理；从组标题中打开客服人员的主聊天以选择它。聊天操作始终属于对话的代理。

从座席组的选项菜单中选择 **所有会话** 以打开筛选到该座席的会话页面。在侧边栏打开 **Agents** 返回名册页面。有关组控制和过滤，请参阅 [ 侧边栏导航](/web/control-ui/sessions-and-sidebar#sidebar-navigation)。

代理名称和头像遵循代理和身份更新。加载配置的头像图像时，头像将保持其有色背景，没有脸部或文本。准备好后，图像就会出现；仅当未配置图像或图像加载失败时，才会出现表情符号或生成的面孔。重复查看重复使用准备好的头像缩略图；更新头像会刷新其缩略图。具有上传照片或链接电子邮件（对于网关代理的 Gravatar）的个人资料请求版本化的个人资料图像；两者都不使用缩写而不探测图像路径的配置文件。当前配置文件修订、代理头像和已解决的工作区图标的经过身份验证的未命中可以在浏览器缓存中保留最多一分钟。新的配置文件和代理图像修订版使用新的 URL。此行为由名册、代理切换器、身份芯片、设置和聊天共享。

页面上的活动和预览以及侧边栏名册会刷新会话事件和网关重新连接。重新使用所选会话的缓存祖先不会触发另一个列表读取。事件在随机的四到五秒窗口中收集，以后的事件无法推迟，从而在浏览器之间传播自动读取。自动读取后，下一次等待的时间是其持续时间的三倍，范围在 5 到 15 秒之间。导航、重新连接和显式刷新可以绕过该延迟。当两者都可见时，它们共享一个活动窗口和一个刷新，因此在团队模式可见时打开 **Agents** 不会重复请求。当两个名册都不可见时，活动加载就会停止。每次刷新最多跨代理读取 300 个会话，首先加载固定会话，然后加载最近的会话。固定会话会计入该限制；窗口外的会话不会出现在分组侧边栏中，也不会参与活动摘要，但打开的对话仍然可见，因此直接链接会保留选定的行。当窗口中不存在主会话时，其代理的最新会话将提供预览。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [连接并配对](/web/control-ui/connect-and-pair) — 配对浏览器或手机，通过 Tailscale 到达 UI，并修复空白页面。
- [ 会话和侧边栏](/web/control-ui/sessions-and-sidebar) — 侧边栏区域、会话菜单和新会话页面。
- [系统工作区](/web/control-ui/sessions-and-sidebar#systems-workspace) — 上下文机器导航和桌面优先的工作区。
- [Chat](/web/control-ui/chat) — 作曲家控件、会话轨道、脚本渲染和托管嵌入。
- [面板和扩展坞](/web/control-ui/panels) — 询问 OpenClaw、Home Dock、操作员终端和浏览器面板。
- [Settings](/web/control-ui/settings) — 身份、外观、插件、更新、MCP、活动和会议。
- [ 功能和 RPC 参考 ](/web/control-ui/feature-reference) — 背后有网关 RPC 的所有功能。
- [ 离线并重新连接](/web/control-ui/offline-and-reconnect) — 连接断开后仍然存在的内容。
- [安全模型](/web/control-ui/security-model) — 内容安全策略、媒体路由身份验证和审批链接。
- [构建和开发](/web/control-ui/development) — 构建 UI 并针对网关运行开发服务器。

在 Docker 中运行网关？请参阅 [ 使用 Control UI 浏览器 ](/install/docker#using-the-control-ui-browser) 了解浏览器配备的图像和设置要求。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/web/control-ui#chat-behavior`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="session-rail-and-side-chat" />[会话导轨和侧聊](/web/control-ui/chat#session-rail-and-side-chat)
- <a id="session-links-in-messages" />[ 消息中的会话链接](/web/control-ui/chat#session-links-in-messages)
- <a id="composer-capability-menu" />[作曲家能力菜单](/web/control-ui/chat#composer-capability-menu)
- <a id="chat-behavior" />[聊天行为](/web/control-ui/chat#chat-behavior)
- <a id="source-previews-and-copying-code" />[源码预览和复制代码](/web/control-ui/chat#source-previews-and-copying-code)
- <a id="markdown-tables" />[降价表](/web/control-ui/chat#markdown-tables)
- <a id="mermaid-diagrams" />[美人鱼图](/web/control-ui/chat#mermaid-diagrams)
- <a id="hosted-embeds" />[托管嵌入](/web/control-ui/chat#hosted-embeds)
- <a id="chat-transcript-layout" />[聊天记录布局](/web/control-ui/chat#chat-transcript-layout)
- <a id="chat-message-width" />[聊天消息宽度](/web/control-ui/chat#chat-message-width)
- <a id="send-and-history-semantics" />[发送和历史语义](/web/control-ui/chat#send-and-history-semantics)
- <a id="talk-mode-browser-realtime" />[talk模式浏览器实时](/web/control-ui/chat#talk-mode-browser-realtime)
- <a id="stop-and-abort" />[停止并中止](/web/control-ui/chat#stop-and-abort)
- <a id="abort-partial-retention" />[abort部分保留](/web/control-ui/chat#abort-partial-retention)
- <a id="strict" />[strict](/web/control-ui/chat#strict)
- <a id="scripts-default" />[脚本默认](/web/control-ui/chat#scripts-default)
- <a id="trusted" />[可信](/web/control-ui/chat#trusted)
- <a id="device-pairing-(first-connection)" />[设备配对（首次连接）](</web/control-ui/connect-and-pair#device-pairing-(first-connection)>）
- <a id="pair-a-mobile-device" />[配对移动设备](/web/control-ui/connect-and-pair#pair-a-mobile-device)
- <a id="runtime-config-endpoint" />[运行时配置端点](/web/control-ui/connect-and-pair#runtime-config-endpoint)
- <a id="pwa-install-and-web-push" />[PWA 安装和网络推送](/web/control-ui/connect-and-pair#pwa-install-and-web-push)
- <a id="tailnet-access-(recommended)" />[尾网接入（推荐）](</web/control-ui/connect-and-pair#tailnet-access-(recommended)>）
- <a id="insecure-http" />[不安全 HTTP](/web/control-ui/connect-and-pair#insecure-http)
- <a id="blank-control-ui-page" />[空白 Control UI 页](/web/control-ui/connect-and-pair#blank-control-ui-page)
- <a id="device-pairing-first-connection" />[设备配对（首次连接）](/web/control-ui/connect-and-pair#device-pairing-first-connection)
- <a id="tailnet-access-recommended" />[尾网接入（推荐）](/web/control-ui/connect-and-pair#tailnet-access-recommended)
- <a id="list-pending-requests" />[列出待处理请求](/web/control-ui/connect-and-pair#list-pending-requests)
- <a id="approve-by-request-id" />[按请求id批准](/web/control-ui/connect-and-pair#approve-by-request-id)
- <a id="open-mobile-pairing" />[开启手机配对](/web/control-ui/connect-and-pair#open-mobile-pairing)
- <a id="connect-the-phone" />[连接手机](/web/control-ui/connect-and-pair#connect-the-phone)
- <a id="confirm-the-connection" />[确认连接](/web/control-ui/connect-and-pair#confirm-the-connection)
- <a id="trusted-proxy-note" />[可信代理票据](/web/control-ui/connect-and-pair#trusted-proxy-note)
- <a id="build-and-develop-the-ui" />[构建和开发UI](/web/control-ui/development#build-and-develop-the-ui)
- <a id="debugging%2Ftesting%3A-dev-server-%2B-remote-gateway" />[调试%2F测试%3A开发服务器%2B远程网关](/web/control-ui/development#debugging%2Ftesting%3A-dev-server-%2B-remote-gateway)
- <a id="debugging/testing-dev-server-+-remote-gateway" />[debugging/testing 开发服务器+远程网关](/web/control-ui/development#debugging/testing-dev-server-+-remote-gateway)
- <a id="start-the-ui-dev-server" />[启动ui开发服务器](/web/control-ui/development#start-the-ui-dev-server)
- <a id="connect-the-remote-gateway" />[连接远程网关](/web/control-ui/development#connect-the-remote-gateway)
- <a id="origin-security-notes" />[origin安全说明](/web/control-ui/development#origin-security-notes)
- <a id="feature-and-rpc-reference" />[功能和RPC参考](/web/control-ui/feature-reference#feature-and-rpc-reference)
- <a id="chat-and-talk" />[聊天和交谈](/web/control-ui/feature-reference#chat-and-talk)
- <a id="channels-sessions-memory" />[通道会话内存](/web/control-ui/feature-reference#channels-sessions-memory)
- <a id="cron-tasks-plugins-skills-devices-exec-approvals" />[cron 插件技能设备执行批准](/web/control-ui/feature-reference#cron-tasks-plugins-skills-devices-exec-approvals)
- <a id="config" />[config](/web/control-ui/feature-reference#config)
- <a id="usage" />[usage](/web/control-ui/feature-reference#usage)
- <a id="debug-logs-update" />[调试日志更新](/web/control-ui/feature-reference#debug-logs-update)
- <a id="automations-panel-notes" />[自动化面板注释](/web/control-ui/feature-reference#automations-panel-notes)
- <a id="connection-loss-and-reconnect" />[连接丢失并重新连接](/web/control-ui/offline-and-reconnect#connection-loss-and-reconnect)
- <a id="openclaw-system-care" />[OpenClaw系统护理](/web/control-ui/panels#openclaw-system-care)
- <a id="home-dock" />[家庭扩展坞](/web/control-ui/panels#home-dock)
- <a id="operator-terminal" />[操作员终端](/web/control-ui/panels#operator-terminal)
- <a id="browser-panel" />[浏览器面板](/web/control-ui/panels#browser-panel)
- <a id="content-security-policy" />[内容安全政策](/web/control-ui/security-model#content-security-policy)
- <a id="avatar-route-auth" />[头像路线授权](/web/control-ui/security-model#avatar-route-auth)
- <a id="assistant-media-route-auth" />[助理媒体路由认证](/web/control-ui/security-model#assistant-media-route-auth)
- <a id="approval-links" />[审批链接](/web/control-ui/security-model#approval-links)
- <a id="new-session-names" />[新会话名称](/web/control-ui/sessions-and-sidebar#new-session-names)
- <a id="new-session-preferences-and-recents" />[新会话首选项和最近](/web/control-ui/sessions-and-sidebar#new-session-preferences-and-recents)
- <a id="sidebar-navigation" />[侧边栏导航](/web/control-ui/sessions-and-sidebar#sidebar-navigation)
- <a id="session-menu" />[会话菜单](/web/control-ui/sessions-and-sidebar#session-menu)
- <a id="session-placement" />[会话安排](/web/control-ui/sessions-and-sidebar#session-placement)
- <a id="session-icons" />[会话图标](/web/control-ui/sessions-and-sidebar#session-icons)
- <a id="session-colors" />[会话颜色](/web/control-ui/sessions-and-sidebar#session-colors)
- <a id="new-session-page" />[新会话页面](/web/control-ui/sessions-and-sidebar#new-session-page)
- <a id="start-a-native-coding-cli" />[开始本机编码 CLI](/web/control-ui/sessions-and-sidebar#start-a-native-coding-cli)
- <a id="openclaw-chat-workspace-startup" />[OpenClaw 聊天工作区启动](/web/control-ui/sessions-and-sidebar#openclaw-chat-workspace-startup)
- <a id="environment-identity" />[环境标识](/web/control-ui/settings#environment-identity)
- <a id="community-invitation" />[社区邀请](/web/control-ui/settings#community-invitation)
- <a id="personal-identity" />[个人身份](/web/control-ui/settings#personal-identity)
- <a id="gateway-host-status" />[网关主机状态](/web/control-ui/settings#gateway-host-status)
- <a id="language-support" />[语言支持](/web/control-ui/settings#language-support)
- <a id="appearance-themes" />[外观主题](/web/control-ui/settings#appearance-themes)
- <a id="manage-plugins" />[管理插件](/web/control-ui/settings#manage-plugins)
- <a id="updates" />[更新](/web/control-ui/settings#updates)
- <a id="apps-and-extensions" />[应用程序和扩展](/web/control-ui/settings#apps-and-extensions)
- <a id="side-panel-keyboard-shortcuts" />[侧面板键盘快捷键](/web/control-ui/settings#side-panel-keyboard-shortcuts)
- <a id="this-mac-(macos-app)" />[此设备（macOS 和 iOS 应用程序）](/web/control-ui/settings#this-mac-macos-app)
- <a id="custom-plugin-ui" />[自定义插件 UI](/web/control-ui/settings#custom-plugin-ui)
- <a id="import-assistant-memory" />[导入辅助内存](/web/control-ui/settings#import-assistant-memory)
- <a id="mcp-page" />[MCP 页](/web/control-ui/settings#mcp-page)
- <a id="activity-tab" />[活动选项卡](/web/control-ui/settings#activity-tab)
- <a id="meetings-page" />[会议页面](/web/control-ui/settings#meetings-page)
- <a id="this-mac-macos-app" />[这台Mac（macOS应用程序）](/web/control-ui/settings#this-mac-macos-app)

## <a id="related"></a> 相关内容

- [仪表盘](/web/dashboard) — 网关仪表盘
- [Health Checks](/gateway/health) — 网关健康状况监控
- [TUI](/web/tui) — 终端用户界面
- [WebChat](/web/webchat) — 基于浏览器的聊天界面。
- [Codex 会话目录和监督](/plugins/codex-supervision) — 本机会话发现设置界面
