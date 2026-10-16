---
summary: "会话仪表板架构：小部件托管、功能、板存储和协议"
read_when:
  - "维护或审查会话仪表板及其安全边界"
  - "更改小组件承载、组件桥接或面板存储"
title: "仪表盘架构"
doc-schema-version: 1
---

会话仪表板是附加到会话的持久小部件板。该参考涵盖了它们的所有权、沙箱和功能边界、存储和网关协议。有关操作员工作流程，请参阅 [Session Dashboards](/web/dashboards)。对于创作 API 的小部件，请参阅 [Show widget](/tools/show-widget)。

## <a id="vision"></a> 远景

仪表板将会话转变为工作台：代理呈现交互式小部件，用户将它们固定到持久板上，并且该板可以占据主区域或聊天旁边的侧面板。聚焦主视图即可获得完整的任务区域。董事会和对话仍然是同一会话的一部分。

原则：

- **A板属于一个会话。这不是一个新的工作区。** 没有固定小部件的会话是普通聊天。固定一个小部件，该板就存在于该会话的仪表板视图中。板继承会话的身份、代理所有权、命名、固定和生命周期。没有 `dashboard_create`，没有主板注册表，也没有单独的 ACL 模型。
- **代理奇偶校验。** 用户可以在板上执行的所有操作，代理可以使用工具执行：add/update/remove 小部件、排列它们、管理选项卡、切换可见选项卡以及请求拆分或扩展演示文稿。
- **Native shell.** 该板在 Control UI shell 中使用 Solid 组件（与应用程序的其余部分相同的设计系统）。数据报告直接呈现。自定义可执行小部件使用沙盒 iframe；浏览器仪表板重用浏览器面板及其导航控件。
- **小代理表面。** 小部件通过稳定名称寻址并就地更新。布局是一个流动的自动压缩网格。代理会说出尺寸和锚点，而不是像素或坐标。
- **以能力而非信任为基础。** 小部件代码是任意的、由智能体编写的 HTML/JS，运行在强沙箱中。访问范围（网关数据、动作、网络）仅通过声明式、由操作者授予的能力清单存在。

## <a id="concepts"></a> 概念

| 概念             | 定义                                                                                                                                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 会话（线程）    | 现有的网关会话，以稳定的 `sessionKey` 为键。由某个代理拥有。                                                                                                                                                                                                              |
| 木板               | 一个会话的小部件板。存在，当且仅当会话具有 widgets/tabs. 且 `/new`/`/reset` 仍然存在（附加到 `sessionKey`，而不是记录）。                                                                                                                                      |
| 选项卡                 | 板的演示页面：哪些小部件及其排列。面板以一个隐式选项卡开始。                                                                                                                                                                                |
| 部件              | 会话拥有的命名内容单元：本机报告、HTML/JS、MCP 应用程序或插件小部件。地址为 `sessionKey` + `name`。                                                                                                                                                       |
| 能力清单 | 每个部件对可访问范围的声明：`data`（读取绑定）、`actions`（允许列表中的动词）、`prompt`（发送到会话）、`net`（允许的来源）。                                                                                                                                            |
| 固定（部件）        | 将一个记录文本部件移动到会话的板上（用户可执行的操作或代理工具参数）。取消固定会将其从板上移除。                                                                                                                                                               |
| 固定（会话）       | 可以固定根会话和普通的主页链接仪表板会话；衍生会话、子代理会话和嵌套子会话拒绝 pin 请求。子代理运行显示在侧边栏导航之外的会话记录中。打开固定会话会恢复该浏览器保存的任务布局。 |

## <a id="ux-flows"></a> UX 流程

仪表板库请求 `sessions.list` 和 `rowMode: "dashboard"`。行保留卡片显示、导航和会员信息；模型、用途、权限和参与者详细信息仍然可以通过 `sessions.describe` 获得。该库使用共享会话事件协调器和定速回退刷新。省略的字段永远不会清除另一个视图已经持有的更丰富的会话事实。其他会话列表保留其现有的紧凑或完整投影。

- **毕业：** 代理从支持内联的聊天中调用 `show_widget` → 小部件在记录中呈现 → 悬停显示 **Pin 到仪表板** → 小部件出现在会话的板上。代理可以通过`pin: true`进行同样的操作。相反，频道演示者可以使相同的核心文档在当前传输上可见。
- 侧面板中的 **板视图：** **Dashboard** 打开当前任务的板，包括其空状态，无需编辑聊天草稿。第一个固定的小部件会在聊天旁边打开一个可调整大小的仪表板，除非已保存任务布局。任务工具栏的 **Swap** 按钮交换主视图和活动侧面板内容，包括聊天、仪表板、浏览器、终端、文件和审阅。它的工具提示命名了这两个视图。同一工具栏的 **Layout** 菜单将侧面板定位在左侧、右侧或下方。同一工具栏中的 **Focus** 为主视图提供了完整的任务区域。 **恢复拆分**恢复侧面板。稍后的主板更新​​会保留用户当前的布局。关闭仪表板选项卡只会删除其视图。关闭整个侧面板将其隐藏，而不改变主视图。
- **布局所有权：** 浏览器存储每个会话的排列，包括主视图、活动侧选项卡、停靠位置、尺寸和焦点状态。普通重访和图库打开在共享会话默认设置之前使用个人演示文稿覆盖。与 `?dashboard=expanded` 的显式链接使仪表板成为主要的，并将其集中用于该访问，而无需创建个人覆盖。放置更改会重用已安装的内容，因此小部件框架、浏览器视图、终端和聊天草稿可以在交换后继续存在。在 left/right 布局中，任务工具栏和侧面板选项卡标题在各自的窗格上方对齐。堆叠布局将每个标题保持在其自己的窗格上方。
- **导航保留：** 一位连接的会话页面所有者在任务导航和对其他路线的访问中每个窗格最多保留三个最近的会话。隐藏页面放弃了前台活动、查看者存在、焦点和命令。聊天和仪表板路由加载器与已安装的视图共享相同的 Gateway/authentication 范围。连接所有者的更改会取消这两者，而普通的重新连接会保留它们。缓存的成功路线在后台刷新期间呈现。
- **Drag：** 用户拖动小部件。网格自动压缩（小部件向上浮动，邻居回流）。通过手柄捕捉来调整大小步骤。无像素放置——适合任何人。
- **重置警告：**在拥有面板的会话中执行 `/new` / `/reset` 时，Web UI 会请求确认（“上下文将被重置，仪表板会保留”），并保留面板。
- **侧边栏：** 打开固定会话可恢复其保存的任务安排。主页会话的面板是默认的“代理仪表板”。
- **交互**（分为三个层级，见下文）：静默状态事件、可见的提示发送，以及自动化触发器。

## <a id="interaction-tiers"></a> 交互层级

1. **State 事件（默认）。** 小部件 UI 模型应该了解但不响应的交互。 `bridge.emitState({...})` 附加结构化会话通知（与组活动通知相同的机制）。没有启动代理轮次。该模型会在下一次运行时看到累积的通知。
2. **提示（显式对话）。** `bridge.sendPrompt(text)` — 需要用户激活，并将可见的用户消息发送到所属会话中。限速。每次发送都经过用户确认，除非小部件拥有 `prompt` 能力授权。
3. **自动化。** `bridge.runAction(name, args)` — 触发一个在清单中声明的动作。初始动词集合：`cron.trigger`（立即运行现有的 cron 作业）和 `binding.refresh`。Cron 作业已经在可见、隔离的运行会话中执行，并且可以使用更便宜的模型：这就是“小模型驱动小部件”的路径。任何地方都没有隐藏会话。

## <a id="widget-model-and-hosting"></a> Widget 模型与托管

HTML/JS 小部件内容由代理编写（通常通过 `show_widget`），包装在标准文档外壳（CSP 元、大小报告器、桥引导程序）中，并在不透明源内容 iframe 中呈现。在 Control UI 的默认 `scripts` 嵌入模式中，内联和板小部件都使用下面描述的专用源沙箱代理。

- **内联（转录）小部件**使用`<stateDir>/canvas/documents`下的托管Canvas文档工件，通读经过身份验证的`canvas.document.view` RPC并按范围进行修剪。这些工件与 SQLite 板存储分开，不需要功能批准（它们在构造上是无上限的 - 提示发送需要用户手势）。打开内联预览不会创建任何板状态，并且永远不会继承固定副本的授权。
- **板小部件**是会话状态：字节存在于拥有代理的SQLite DB （`board_widgets`），由核心网关路由（`/__openclaw__/board/<agentId>/<sessionKey>/<name>/`）读取的是DB。固定转录小部件会复制字节。上限：10 MiB of UTF-8 HTML每个文档，包括包装，256 KiB每个注册小部件的源，8 KiB每个本机小部件的JSON道具，以及48每个板的小部件。
- **更新到位：**重新发出具有相同`name`的小部件，内容所有者替换其内容，碰撞`revision`，并广播`board.changed`。实时视图会更新该单元格。文档小部件仅重新加载该 iframe。更改内容所有者需要在创建替换内容之前删除该小部件。
- **字节冻结：** HTML 和注册源授权绑定到已批准内容的 SHA-256 摘要。保留拨款需要相同的内容范围、匹配的批准摘要以及不扩大的声明。即使声明保持不变或缩小，更改的字节也需要根据会话的批准策略做出新的决定。

### <a id="widgets-host-content%3B-mcp-apps-are-one-content-kind"></a><a id="widgets-host-content-mcp-apps-are-one-content-kind"></a> Widget 承载内容；MCP 应用只是内容的一种

**Widget 是 OpenClaw 的原语**：带名称、已固定、已设大小、会话归属的 board 单元， 以及一条授权记录。其内部渲染的内容只是某一种内容类型：

- `session:report` — 核心拥有的本机数据报告，通过 `dashboard` 或 `show_widget` 的结构化 `report` 字段编写。板存储保存其有界的 JSON 道具。
- `html` — 由 agent 通过 `show_widget` 编写，字节存放在 board 存储中。
- `mcp-app` — 第三方 MCP 应用视图（来自已配置服务器的 `ui://` 资源），托管在 widget 单元内部。
- 注册的插件类型 - 通过相同的沙盒文档框架呈现的插件验证源。 Canvas插件注册`a2ui`。 Core 发现活动注册表并且从不硬编码插件种类名称。

MCP 应用程序未定义小部件模型。小部件获得了托管它们的能力。身份、放置、固定、资助和面向作者的 API 仍然是 OpenClaw 的 — 因此 `show_widget` 代码保持像现在一样短，并且永远不需要知道 MCP Apps 规范的存在。

注册类型使用小型运行时插件 SDK API。注册拥有面向代理的类型名称、源验证、功能范围渲染器资源和文档正文组合。网关在 `board.widget.put` 再次验证源，将其存储在现有的通用 `plugin` 描述符信封中，并仅在票务板读取后才编写框架文档。这使得存储的源不包含在板快照之外，并避免数据库 CHECK 或架构版本更改。注册表中不存在已禁用的插件，因此新放置会失败并出现启用并重试错误，并且现有单元格呈现为已禁用。

A2UI 实现组成了一个引用其渲染器包的小文档。票务板文档使用功能范围的网关资产路由。内联文档从沙箱源加载相同的公共静态渲染器。 Core 添加了与 HTML 小部件相同的 CSP、主题桥、大小报告器和专用端口主机桥。 v0.8 和 v0.9 使用单独的渲染器包，因为它们的 Lit 自定义元素共享标签名称，但它们的处理器和操作契约不同。

注册类型可以通过 `resources.readPublicResource(path)` 公开公共静态渲染器字节。隔离侦听器仅服务于精确注册的 `resources.paths`，仅适用于 `GET` 或 `HEAD`，并在读取后重新检查活动插件注册表。它不代理网关路由、凭证或数据。 Canvas 选择了两个 A2UI 捆绑包。这不授予小部件网络或主机工具功能。

共享托管基础设施：

- **一个沙箱主机。** `html`小部件通过MCP应用程序附带的相同硬化管道进行渲染（专用沙箱源上的双iframe，每个小部件的格式错误的CSP声明被拒绝）而不是第二个自定义iframe主机。代理按值接收 HTML，因此本地内容是自然的情况。
- **经过身份验证的加载。** 受信任的 Control UI 通过其现有网关连接读取内联 Canvas HTML，并通过其票证 HTTP 路由登上 HTML，然后将字节传递给代理。内容 iframe 永远不会导航到经过身份验证的文档路径。这可以避免单独的 iframe 登录重定向到拒绝嵌入的页面。
- **可执行内容的一个授权模型。** 小部件的范围是授予的允许列表。对于 `html` 小部件，允许列表包含主机工具。对于 `mcp-app` 小部件，它保存服务器的应用程序可见工具和同一服务器资源（通过现有的实时应用程序交互权限，使每个小部件都持久，而不是每次铸造运行）。
- **`html` widget 的主机工具**（通过 widget bridge 暴露，并按授权校验）：
  - `openclaw.prompt.send` — 第 2 层，通过可见作曲家路由，用户确认，除非授予
  - `openclaw.state.emit` — tier 1 会话通知（合并、限制大小）
  - `openclaw.data.read` — 参数化只读绑定（现有的允许列表 read RPC 集），在 gateway 侧解析
  - `openclaw.action.run` — 第 3 层插件拥有的自动化
  - `openclaw.cron.trigger` — tier 3 自动化
- **`net` = CSP。** 网络可达性使用已经发布的每个 widget 的 CSP 声明 （`connect-src` origins）——这个会自动更新的天气 widget 直接从沙箱中获取其 API， 不需要 gateway 介入。
- **静态资产.** 共享小部件 CDN 允许列表允许文档、代理和直接响应策略中的公共脚本、样式表和字体。这独立于 `connect-src` 和主机工具授权。第三方代码与小部件的内容和授予的功能一起运行；资产 URL 不得包含私有数据。请参阅 [ 库和字体](/tools/show-widget#libraries-and-fonts)。
- **Grants.** HTML 和注册的小部件声明没有立即渲染（沙盒，`default-src 'none'`，提示发送单独确认）。声明的功能和交互式 MCP 应用程序遵循显式 [ 会话权限模式 ](/gateway/permission-modes)。 **完全访问**补助金。 **Workspace** 使用 AI 审阅者并拒绝其不允许的任何内容。 **Guarded** 显示 **Allow**/**Reject**。 **只读** 拒绝。如果没有显式会话模式，则应用等效配置的执行批准策略。补助金是针对每个小部件名称和内容范围的。 HTML 和注册源更新仅在批准的摘要匹配且声明不扩大的情况下保留授权。包装器编写的板小部件将用户单击的 `http`/`https` 新选项卡链接转发到 Control UI 主机。这个普通的导航不需要授权，也不会授予 iframe 弹出权限。
- **Authoring shim.** 文档包装器注入`window.openclaw.prompt`、`window.openclaw.state`、`window.openclaw.data`、`window.openclaw.action`、`window.openclaw.cron`以及主机提供的`window.openclaw.host.controlUiBaseUrl` 作为稳定作者 API。仪表板调用和受信任的新选项卡链接点击共享一个视图票据绑定请求通道。主机打开与`noopener,noreferrer`的链接。大小报告和主题令牌仍然是单独的主机通知。

外部代理在与 Control UI 和网关不同的源上运行。它的 iframe 允许 `allow-same-origin`，因此主机可以针对该专用源验证代理消息。代理将小部件字节放入带有 `allow-scripts allow-forms` 的内部 `srcdoc` iframe 中，而不带有 `allow-same-origin`。因此，小组件代码既没有应用程序来源的访问权限，也没有代理的来源。内联视图仅采用包装器的私有提示通道。仪表板视图初始化其单独的票证绑定桥。

公共代理 shell 使用其 HTML 的 URL 指纹和安全标头。浏览器可以缓存重复的小部件安装的确切版本；更改 shell 或其策略会更改 URL。未版本化或不匹配的请求仍然不被缓存。此缓存不包含小部件文档、凭据或视图票证。网关通过其完整的规范化策略重用多达 64 个公共 shell URL，避免在板共享该策略时重复 shell 渲染和散列。当前的小部件授予仍然决定每次读取的策略；策略更改选择不同的 URL，网关进程替换会停用 URL 缓存。

共享加载程序在沙箱代理启动时获取主板 HTML，然后仅在确切的代理报告准备就绪后才交付它。仪表板小部件保留主题加载占位符，直到代理确认当前内部文档已加载。该渲染信号与 HTML 传递和桥初始化分开，因此空小部件可以完成加载而无需报告正内容高度。集中仪表板路由重用已解析的会话密钥和代理所有者，以避免第二次会话查找。

已安装的小部件在演示文稿更改和票证续订时保留其加载的文档。内联视图仅在一个客户端和连接生成内共享同一文档的并发读取。每个视图仍然拥有自己的沙箱和提示通道。只要托管 `[embed ref="..."]` 预览的有效沙箱策略允许脚本，包括没有显式沙箱字段的默认路径，就会使用该经过身份验证的路径。显式严格预览仍然无需脚本。没有已完成的文档缓存：Canvas 允许替换命名文档 ID，因此重新挂载会再次读取当前源。瞬时断开连接会保留已安装的内联 iframe 及其本地交互状态，但会从先前的连接中收回挂起的结果和服务器操作权限。重新连接会重新验证文档：未更改的字节保留框架，而更改的内容或身份会替换它。这是内存中的演示保留，而不是持久的文档缓存或重播小部件操作的权限。

### <a id="website-widgets"></a> 网站小部件

`session:website` 使用现有的本机小部件描述符和经过验证的 `props: { url }`。板库拥有持久化、修改、同名更新、删除；不需要模式、协议方法或配置更改。较旧的渲染器显示这种未知类型的普通不可用小部件状态。

Control UI 在自己的沙盒框架中渲染 HTTPS 网站，并启用脚本、同源网站存储、表单和弹出窗口。它拒绝包含用户信息的 URL，并拒绝 Control UI 和跨端口连接的网关主机名，因为浏览器 cookie 共享主机名边界。 OpenClaw 不注入网关令牌、功能票证、消息桥或父级导航权限。它自己的 HTTP 标头和浏览器 cookie 规则仍然适用。网关从不获取或转发其内容。被动画廊预览永远不会安装框架。

网站小部件不使用 HTML 文档沙箱或其功能授予。该所有者继续阻止后代帧。全宽网站可以填充现有的扩展仪表板；共享网格保留其普通大小。请参阅 [ 全屏显示网站 ](/web/dashboards#show-a-website-fullscreen)。

### <a id="browser-dashboards"></a> 浏览器仪表板

浏览器插件向具有浏览器访问权限的运营商通告 `browser:dashboard`。其保存的道具包含 HTTP（S） URL 和可选的本地托管配置文件。本机渲染器重用浏览器面板的流式视口和输入路径，固定到仪表板的确切浏览器目标。普通浏览器预览结果不会取代此仪表板演示。

董事会拥有定义和插入标识。本机插件小部件将内部生成的 `pluginInstanceId` 存储在现有清单元数据中，并将其公开为可选的 `instanceId` 字段。同属更新保留它； remove/recreate 旋转它。较旧的本机行在下一次放置时接收身份，没有读取时回填。文档小部件保留其现有的每次视图和授权生成；那是不同的一生。

浏览器在其现有的 `browser.session-tabs` SQLite 命名空间中拥有选项卡关联和停止状态，包括用于安全清理的 browser/profile 指纹。并发视图和代理调用共享一个板实例的具体化。在第一次打开将输入的意图保留在同一存储中之前停止，而无需浏览器目标或指纹；它在重新加载后仍然存在，并在成功恢复或定义删除后退出。调用解析当前定义并在执行操作之前通过现有浏览器 route/profile 准入重新验证关联。单独保存的目标 ID 并不具有权限。

现有的 `browser.request` 传输承载 Control UI 请求的仪表板标识。面向模型的 `browser` 工具接受小部件名称为 `dashboard`； `dashboard` 仍然是主板 authoring/layout 工具。停止和恢复更新浏览器的生命周期状态，无需重写板道具或覆盖并发定义编辑。 UI unmount 仅释放流。浏览器通过其现有的插件事件服务发布生命周期失效，因此代理 Stop/Resume 更新可见的仪表板。董事会变更和会话删除通知请求协调；当禁用普通空闲清理时，现有的清理周期还会协调 removed/replaced 定义。对话重置会保留面板及其有效的选项卡关联。

### <a id="native-data-reports"></a> 原生数据报告

`session:report` 是一种广告核心小部件类型。其经过验证的 `props` 包含文本、指标、表格、条形图或折线图以及 HTTP（S） 链接。 Control UI 直接从板快照渲染这些块，无需文档获取、iframe、功能票证或小部件桥。这个纯渲染器也可以出现在被动仪表板库预览中。该异常不会在预览中启用任意本机插件小部件。

两个创作路径在 `src/boards/board-report.ts` 中使用相同的验证器：

- `dashboard`: `action: "widget_put"`, `pluginKind: "session:report"`, `props: report`.
- `show_widget`：`report: { blocks: [...] }`、`pin: true`。省略 `kind` 和 `widget_code`。

该报告使用现有的通用 `plugin` 描述符和 JSON 道具存储。没有新的存储模式或协议方法。其完整的 JSON 上限为 8KB 和 24 个块。报告不接受任何功能、可执行操作、HTML、CSS、媒体、网络读取或 RPC。 `show_widget` 报告模式仅是仪表板，没有内联、设备面板或通道演示。其结构化 `report` 字段不能与 `kind`、`widget_code`、`capabilities` 或设备表示混合。现有的源类型枚举和插件注册保持不变。

同名报告更新保留 `session:report` 内容所有者。转换 HTML 小部件需要显式删除然后创建，而不需要自动迁移。更喜欢固定数据摘要的报告。保留 HTML 用于任意交互式或内联内容。请参阅 [ 报告架构和示例 ](/tools/show-widget#native-dashboard-reports)。

### <a id="plugin-capability-declarations"></a> 插件能力声明

启用的插件可以通过扩展小部件主机`dashboard.dataBindings`和`dashboard.actionVerbs` in `openclaw.plugin.json`。插件本地 ids 成为以插件 id 为前缀的授权名称，例如`workboard.cards.list`和`workboard.dispatch`. `%`和`.`在plugin-id段中被转义，所以不同plugin/local-idsplit 不能继承相同的持久授权。在插件注册期间，OpenClaw验证每个绑定的目标RPC由同一个插件注册`operator.read`每一项行动都针对一个`operator.write`。无效声明会使插件加载失败。仅当插件生命周期发生更改时才会重建经过验证的注册表，而小部件授权仍保留每个小部件以及字节和修订版本的限制。

`show_widget` 使用此经过验证的活动注册表进行有界作者发现，包括可用的完整描述和操作参数模式。它绝不会仅仅为了描述其仪表板功能而加载插件。

### <a id="authenticated-github-reads"></a> Authenticated GitHub 读取

Core 现有的 GitHub 身份和 HTTP 所有者通过 `board.data.read` 为 `github.actions.runs` 提供服务。封闭参数合约仅构造 `api.github.com` 处的存储库或工作流运行列表操作。即使项目发现使用已配置的 Enterprise 主机，凭证选择和传输仍与 `github.com` 绑定。企业凭据永远不会用于此公共主机功能。授权需要精确的标准化 `github.actions.runs:<owner>/<repo>` 工具授权。网络来源授予从不提供 GitHub 身份权限。批准披露，操作元数据（包括代理可访问的私有存储库数据）与 widget/session 受众共享。

作者指导以可用的连接代理身份为条件，而不是工具构建时检查。 `board.widget.put` 在保存 HTML（包括物化 Canvas 文档）或声明此主机功能的注册小部件之前验证并重新验证该身份。相同的准备所有者提供固定和读取服务，包括源配置预览凭据清理和 OAuth 刷新。在持久化之前会重新检查调用者取消和会话突变授权。失败会使现有内容和赠款完好无损。 MCP App工具名称使用自己的合约，不会触发此预检。

董事会能力所有者私下携带已解决的 agent/session 并重新检查实时网关、票证生成、小部件修订以及数据和操作路径的等待授权。 GitHub 使用现有凭证所有者和 OAuth 刷新服务选择代理覆盖、系统或本机身份。读取权限还会在获取之前和返回数据之前重新验证选择和凭证轮换。本机 `gh auth token` 读取可以重复使用成功的查找长达 60 秒，因此主机登录、注销和帐户切换可能需要很长时间才能出现。环境令牌、托管凭据和调用者权限仍处于实时检查状态。这不会更改个人发布代理或其承认的凭证快照语义。

经过身份验证的读取从不使用预览身份验证或匿名重试。重定向被拒绝。仅此操作读取允许上游主体最多为 1 MiB。其他 GitHub JSON 呼叫者保留其 256 KiB 默认值。所有者验证并预测最多 30 次运行会产生小型响应，无需原始存储库对象或机密。网关本地缓存最多保存 32 个成功结果。在 30 秒内，读取会重复使用结果。过期结果以 `stale: true` 返回，同时单个后台刷新在网关的执行所有者下运行。第一次读取仍在等待GitHub。最多 32 个并发调用者可以准备或等待读取，并且最多 32 个传输可以保持运行状态。共享传输仅在使用该身份的会话之间缓存其捕获的凭证范围和请求过滤器下经过验证的投影。此内部缓存写入不会传递到小部件。每个调用者，包括发起者、追随者和缓存命中者，都会在交付之前重新验证其自己的实时权限。删除一个呼叫者不会使另一授权呼叫者的结果无效。刷新日志清理失败并驱逐旧结果；下一次读取将通过正常错误边界重试。失败的传输读取不会作为成功进行缓存。请参阅 [ 创作合同和示例 ](/tools/show-widget#read-github-actions-runs)。

### <a id="modeled-residual%3A-webrtc-data-channels"></a><a id="modeled-residual-webrtc-data-channels"></a> 建模残留：WebRTC 数据通道

沙箱 CSP 发出建议的 `webrtc 'block'` 指令，但 [Chromium 当前的 CSP 指令 set](https://chromium.googlesource.com/chromium/src/+/main/services/network/public/mojom/content_security_policy.mojom#95) 并未实现它。因此，可编写脚本的小部件可以使用 WebRTC 数据通道进行出口，而无需 CSP 强制执行该指令。此残差也适用于内联聊天小部件和 MCP Apps 主机。

**接受的权衡：** OpenClaw 不会在此残差上门控可编写脚本的小部件。小部件内容只能通过策略授予的字节冻结数据绑定才能访问敏感的 OpenClaw 数据，并且沙箱权限策略会阻止摄像头和麦克风访问。

内联和板小部件在小部件代码运行之前启用 DOM API 防护。它删除了相同领域的 WebRTC 构造函数，并阻止使用新构造函数创建后代浏览上下文的常见方法。这减少了暴露，但仍然是尽最大努力的纵深防御，而不是隔离或授权边界。它不会消除可接受的残差。该防护在 `src/agents/sandbox-host.ts` 中实现，并由 Canvas 和板视图所有者启用。

### <a id="transcript-display%3A-one-widget-card"></a><a id="transcript-display-one-widget-card"></a> Transcript 展示：一个 widget 卡片

内联 HTML 和 MCP 应用程序预览共享一个按内容类型分派的小部件卡渲染器。符合条件的预览将相同的 **Pin 暴露给仪表板** 可供性。生成的小部件名称使卡能够识别现有的引脚并避免提供重复的引脚。渲染器和引脚路径位于 `ui/src/pages/chat/components/widget-card.ts` 中。

小部件通过网格邻接组合：代理编写的小部件和 MCP 应用程序可以占据一个选项卡上的相邻单元格。每个都保留自己的沙箱和桥标识。 MCP 应用程序不得在代理编写的 iframe 内呈现，其中嵌套会损害网桥身份并允许覆盖授予的应用程序 UI。

### <a id="server-sourced-widgets-(pinned-mcp-apps)"></a><a id="server-sourced-widgets-pinned-mcp-apps"></a> 服务端来源的 widget（固定的 MCP 应用）

使用统一主机，固定第三方 MCP 应用程序只是一个小部件，其内容从服务器获取而不是存储：`board_widgets` 保留描述符（`serverName`、`toolName`、`uiResourceUri`，源自 `toolCallId` + `sessionKey`）而不是 HTML 字节，并且董事会在聊天轮 10 分钟 TTL 之后重新生成视图租约（在过时时重新获取 `ui://` 资源）。内联聊天 MCP 应用程序视图具有与代理小部件相同的 **Pin 到仪表板** 的功能。今天重新打开的视图设计为只读。应保持交互性的固定应用程序通过服务器的应用程序可见工具获得持久授权（在 pin 上向操作员显示显式允许列表），与铸币运行分离。未授权的 pin 可以呈现其获取的应用程序 HTML，但无法调用工具或访问同一服务器资源桥。引脚属于原始会话的板。不支持跨会话固定。

### <a id="workboard-integration"></a> WorkBoard 集成

WorkBoard 集成程序使卡和板保持插件所有。它通过现有的 `sessionKey` 和 `runId` 将调度的卡缝合回其会话板。它通过插件声明的绑定和操作公开 WorkBoard 提要和调度。它将这些结果与现有的 `html` 和 `mcp-app` 小部件类型组合在一起，而不是引入 WorkBoard 特定的小部件类型。

## <a id="layout%3A-fluid-grid"></a><a id="layout-fluid-grid"></a> 布局：流式网格

12列，固定行高，**自动压缩**（重力向上，拖动时推向一边 — gridstack 语义，本地实现）。网格数学保持纯粹并且DOM-自由的。每个选项卡的小部件布局状态：`{ name, w (1-12), h (rows) }`加订单。代理词汇：

- `size`: `sm`（3×3）· `md`（6×4）· `lg`（8×6）· `xl`（12×8）· `full` （单组件标签页）
- `after: <widgetName>`可选订购锚。省略=追加
- 用户drags/resizes自由。同订单+尺码模型往返。

## <a id="data-model-(per-agent-db)"></a><a id="data-model-per-agent-db"></a> 数据模型（每个代理 DB）

董事会状态位于 `agents/<agentId>/agent/openclaw-agent.sqlite`：

- `board_tabs` 存储选项卡标识、排序、聊天底座和面板修订。
- `board_widgets` 存储小部件身份、位置、内容或描述符、功能声明、批准的摘要和授权状态。

源表定义、约束和索引位于 `src/state/openclaw-agent-schema.sql` 中。板架构设置和修复路径为`src/state/openclaw-agent-board-schema.ts`。运行时读取和写入归 `src/boards/sqlite-board-store.ts` 所有。有关架构版本、迁移和降级规则以及材料存储更改的审核检查点，请参阅 [ 数据库架构](/reference/database-schemas)。请勿使用复制的 SQL 草图作为架构契约。

普通磁盘快照和小部件文档读取使用现有的会话历史读取工作线程。突变借用共享的每个代理 SQLite 编写器连接，其中 Boards 后端在事务输入和提交时检查当前调用者权限。在突变返回之前，提交的更改会使主机的确切会话投影失效；清理失败不会将已完成的写入转变为可重试的失败。现有会话写入预检、源句柄获取、schema/bootstrap/migration 和董事会出席投影保留其现有所有者。读取在等待之前捕获其物理存储，并在写入时加入相同的每个代理 FIFO。读工作器保留其承认的只读连接并读取一个连贯的快照，而不会创建丢失的板表或打开写入器出版物。主机在开始消费和释放队列之前检查捕获的物理身份、本地突变见证和当前权限。外部消费者承诺在不保留该队列的情况下运行，因此排队的撤销不能被后来的受保护发布所取代。网关关闭拒绝新请求，并在工作进程拆卸之前加入已接受的读取和发布清理。隐身读取和写入继续在其进程保持的连接上进行。工作人员永远不会拥有第二个代理数据库参与者，并且这种削减不会改变板模式、保留、更新行为或协议有效负载。

面板的存在 = `sessionKey` 对应的任何行。删除一个会话会删除其面板行。`/new`/`/reset` 不会影响它们。

## <a id="protocol-surface"></a> 协议表面

RPC（核心方法表，`gateway-protocol` 中的 typebox 模式）：

- `canvas.document.preview { html }` → 未更改的调用者拥有的 HTML 以及与 `canvas.document.view` 相同的隔离沙箱连接元数据 - `operator.read`。它最多接受UTF-8数据中的2个MiB（包括空的HTML），拒绝额外的字段，并且从不读取或创建存储的文档。它支持 Canvas 主机禁用，并且不返回任何功能票证或 prompt/tool/host 访问权限。文件选项卡客户端使用默认的 SandboxHost 策略，并阻止后代框架，而不是应用程序源活动的 `srcdoc` 或 Canvas 小部件 prompt/API 桥。
- `canvas.document.view { docId }` → HTML 和沙箱连接元数据 — `operator.read`。它接受最多 2 个 MiB 的托管启用脚本的 Canvas 文档，不创建板状态，也不返回任何功能票证。
- `board.get { sessionKey }` → 选项卡 + 小部件元数据和本机道具（无文档字节） — `operator.read`
- `board.update { sessionKey, ops[] }` — 选项卡 CRUD/reorder、小部件 move/resize/ remove/unpin、停靠状态、焦点选项卡 — `operator.write`
- `board.widget.put { sessionKey, name, content, declared?, placement? }` — `operator.write`（代理刀具路径和销钉路径）
- `board.widget.grant { sessionKey, name, decision }` — `operator.approvals`
- `board.event { ticket, payload }` — 票证绑定的 1 级状态事件摄取。传统受信任主机 `{ sessionKey, widget, payload }` 形状仍然保留 — `operator.write`
- `board.prompt.authorize { ticket }` — 返回可见提示发送是否仍需要每次点击确认 — `operator.read`
- `board.data.read { ticket, bindingId, params? }` — 网关侧白名单化的核心或活动插件读取绑定解析 — `operator.read`
- `board.action { ticket, action, ... }` — 通过现有的 cron 立即运行路径或活动插件已验证的 action 动词进行精确授权自动化分发 — `operator.write`

事件（在 `EVENT_SCOPE_GUARDS` 中，读取作用域）：

- `board.changed { sessionKey, revision, widget? }` — 持久状态已更改。 UI 重新获取（并在 `widget` 存在时重新加载一个 iframe）。
- `board.command { sessionKey, command }` — 瞬态 UI 驱动器（代理切换可见选项卡或仪表板面板演示） — `ui.command` 模式。

板小部件字节使用经过验证的 HTTP 表面。内联画布小部件字节使用 `canvas.document.view`。本机客户端和直接文档打开保留现有的 Canvas HTTP 路由。

## <a id="agent-tools"></a> 代理工具

总共三个工具，核心。 `show_widget` 面向 `inline-widgets` 客户端、一个明确匹配的当前频道演示者或持久会话自动化（其服务器创作的工具策略明确允许仅固定创作）公开：

- `show_widget { title, widget_code?, report?, kind?, name?, pin?, size?, tab?, after?, presentation?, capabilities? }` — 按名称 create/update。 `kind` 默认为 `html`，其枚举包括活动的注册类型。 HTML 和注册源使用 `widget_code`。本机报告使用 `report`，无需 `kind` 或 `widget_code`，需要 `pin: true`，并且仅在板上渲染。对于 HTML 和注册类型，`pin` 还将小部件放置在板上。如果没有 `name`/`pin`，它的行为就像今天一样（内联，短暂）。无头计划创作需要 `pin: true`，无法选择演示目标，并且不可用于分离的 cron 运行会话。
- `dashboard { action, ... }` — 董事会管理动词：`read`、`tab_create`、`tab_update`、`tab_delete`、`tabs_reorder`、`widget_put`、`widget_move`、 `widget_resize`、`widget_remove`、`focus_tab`、`set_presentation`、`set_default_presentation`。共享的 `boardPresentation` 默认属于会话元数据 （`session_nodes.entry_json`），而不是板布局状态。 UI和代理写入使用`sessions.patch`；现有会话 read/change 投影、权限、重置保留和删除拥有其生命周期。浏览器布局将缓存呈现与显式个人覆盖分开。共享更改适用于下一次打开的仪表板，而不适用于活动查看者。演示文稿为 `split` 或 `expanded`。 `expanded` 使 Dashboard 成为主屏幕并对其进行聚焦，而 `split` 使用当前排列显示 Dashboard，并在 Dashboard 为主屏幕时同时显示聊天功能。 Control UI 拥有侧面板的底座位置。该工具将演示映射到现有的 `set_chat_dock` 有线命令，而无需更改网关协议。
- 现有的`automations`工具涵盖自动化层。不需要新工具。

工具描述教授 size/anchor 词汇和层模型。通过会话通知 e.g. `[dashboard] user clicked "Refresh" on widget weather (tab main)` 向代理告知用户第 1 层事件。

## <a id="what-this-replaces"></a> 这替代了什么

- **`extensions/workspaces` 已删除。** 实验版，`enabledByDefault: false`，从未出现在稳定版本中（首次出现在 2026.7.2 测试版中）。没有迁移。医生规则会删除陈旧的 `<stateDir>/workspaces/`（如果存在）。收获的想法：纯网格数学、桥接安全模型（端口引导、绑定门控、速率限制）、字节冻结批准。
- **Core 拥有小部件托管。** 画布文档存储、文档包装器、HTTP 服务和 `show_widget` 工具位于核心 （`src/canvas/`） 中。 Canvas 插件拥有 macOS 节点面板演示器和 A2UI 仪表板内容类型。 `pluginSurfaceUrls["canvas"]` 广告和 `/__openclaw__/canvas` 路径通过本机客户端合同提供并保持稳定。 Discord 活动在核心的共享 `show_widget` 工具后面注册一个上下文演示者。

## <a id="current-boundaries"></a> 当前边界

- Boards不引入单独的共享或ACL模型。会话可见性和成员资格使用现有的会话共享表面。小部件功能授予与会员资格保持独立。
- Native macOS/iOS 板渲染是通过嵌入式 Control UI 实现的。内联小部件路径未更改。
- Enabled 插件通过现有注册表扩展内容类型、数据绑定和动作动词。
