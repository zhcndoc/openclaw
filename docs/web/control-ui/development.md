---
summary: "构建 Control UI，运行开发服务器，并将其指向远程网关"
read_when:
  - "自行构建或服务 Control UI"
  - "针对远程网关运行 Vite 开发服务器"
title: "构建和开发"
sidebarTitle: "构建和开发"
---

有关构建 Control UI 并针对您选择的网关运行它的贡献者注释。

此页面上的每个命令都从 `openclaw/openclaw` 存储库的签出运行，其中 `pnpm install` 已完成。打包的 CLI 安装没有 `pnpm` 脚本。

## <a id="build-and-develop-the-ui"></a> 构建和开发UI

网关提供来自 `dist/control-ui` 的静态文件：

```bash
pnpm ui:build
```

完整的软件包构建包括匹配的捆绑本机插件资源，包括 UI 发行版中的 Workboard。当网关使用其他源或经过身份验证的 HTTP 时，这些资产可以从 UI 源加载。运行的插件必须与打包版本和浏览器版本相匹配；自定义插件和源覆盖保留网关资产路由。没有打包插件工件的独立 UI 构建也保留了该路线。

构建的性能报告将初始条目 JavaScript 预算与完整聊天和新会话启动总计分开。这些路线总数包括入口资产和路线测量的即时动态导入，即使两个预加载列表都引用每个资产，也会对每个资产进行一次计数。因此，将现有引导导入移动到第一个请求波中在字节计数中仍然可见。首次进入上限和基线不变；报告路由字节总数，而不引入更高的限制。当两个构建都包含路由预加载模板时，`scripts/check-control-ui-performance.mts` 上的 `--base-dist` 会比较路由字节和请求。较旧的版本报告该比较不可用，因此请使用冷负载网络捕获来比较其完整的启动成本。

路由引导 JavaScript 每个路由限制为 35 个请求，以捕获由顶级等待禁用块优化引起的外观回归。 `pnpm ui:check-performance` 在本地和 CI 中强制执行此限制； `pnpm ui:build` 报告它而不拒绝构建。工作脚本和其他 URL 资源在离线缓存中仍然可用，而无需将模块预加载到文档中。

网关更新后，已打开的选项卡在遇到丢失的旧资产时会重新加载当前版本。当没有未保存的工作防护阻止时，重新加载是自动的；否则，保存或放弃受保护的作品并使用 **Reload** 横幅。网关和服务工作人员仅保留当前构建的资产。

捆绑的公共资产（主题、字体、图标和插图）使用 `?v=<build-id>` URL 和一年不可变的 HTTP 缓存。 ID 包含公共文件的摘要，因此在同一提交中重建更改的文件也会更改其 URL。网关在启动时拍摄此身份的快照；重建就地安装后重新启动它。无版本控制的请求、过时的 ID、文档、`sw.js` 和自定义 `gateway.controlUi.root` 安装保留 `Cache-Control: no-cache`。 Service Worker 缓存匹配的当前构建的公共 URL 以供离线重用。

网关在浏览器之间共享准备好的捆绑资产字节，包括 Brotli 和 gzip 变体。冷文件准入和读取在工作线程中运行，因此同时页面加载不会阻止聊天传递。自定义根继续根据每个请求读取当前文件。

非索引静态资产使用 `Last-Modified` 进行条件 `GET` 和 `HEAD` 请求。 `If-None-Match` 优先于 `If-Modified-Since`：`*` 与现有资源匹配，而其他值则接收正常的 `200` 响应，因为静态资源不会发出 ETag。对于未更改的资产，仅日期重新验证仍返回 `304`。如果没有可接受的可用内容编码，则网关在评估任一条件之前返回 `406`。

所有三种 HTTP-date 格式均解释为 UTC。无效或重复的 `If-Modified-Since` 字段将被忽略，因此它们无法抑制当前资产字节。闰秒验证器保持早于下一秒。

静态资源 URL 支持百分比编码的文件名。包含的符号链接保留所请求资产的 MIME 类型，并且符号链接的 `index.html` 接收与其他入口路由相同的基本路径和文档准备。

可选的绝对基址（固定资产 URL）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

本地开发（独立开发服务器）：

```bash
pnpm ui:dev
```

然后将 UI 指向您的网关 WS URL （e.g. `ws://127.0.0.1:18789`）。

要在开发时使用真实网关的功能、媒体和原生插件 UI，请在启动 Vite 时选择其 URL：

```bash
OPENCLAW_UI_DEV_GATEWAY_URL=http://127.0.0.1:18789 pnpm ui:dev --host 127.0.0.1 --port 5173
```

配置的开发默认绑定到环回。打开`http://127.0.0.1:5173`，使用网关的正常认证和设备配对。目标接受 `http://`、`https://`、`ws://` 或 `wss://`，包括配置的网关基本路径。将凭据保留在该设置之外。需要时将确切的浏览器来源添加到 `gateway.controlUi.allowedOrigins` 中；开发代理保留浏览器的起源并且不提供身份验证凭据。

Vite 为 UI 及其热重载连接提供服务，并代理网关请求。 UI 保留实际网关范围内的凭据和保存的设置。所有者配对切换可以在开发页面上传递，同时保留其原始网关目标和片段。如需使用其他网关，请使用新目标重新启动Vite；已打开的页面无法通过替换目标转发请求。重启Vite后重新加载页面。

UI 编辑使用 Vite 的正常热重载或页面重载。在开发其实现时单独启动网关的源监视。停止 Vite 会停止其代理，但不会停止网关或删除任一应用程序的状态。如果没有 `OPENCLAW_UI_DEV_GATEWAY_URL`，`pnpm ui:dev` 将保留其现有的独立连接行为。此设置不影响 `pnpm ui:build`。

对于具有合成数据的独立预览，请使用：

```bash
pnpm dev:ui:mock -- --port 19321
```

在新的 Chromium 配置文件或隔离的浏览器上下文中打开打印的 URL，无需现有服务人员或操作员凭据。聊天、状态和个人资料数据是合成的。添加 `--fixture attachments` 作为媒体示例；还提供印制板夹具 URL。

模拟预览在应用程序启动之前为网关资源（包括头像）选择自己的来源。它提供合成的 WebSocket 响应，并将本机资源请求限制到服务源和本地 data/blob 固定装置（包括帧），同时保留同源 Vite HMR 和终端 WebAssembly。未实现的 HTTP API 路由返回本地 JSON 404；独立模拟诊断会拒绝外部获取。新工作人员、Talk WebRTC、弹出窗口和外部 link/navigation 操作在模拟应用程序中被禁用。在 Chromium 可以推测连接之前，外部 iframe URL 分配被拒绝。当演示需要另一个响应时添加本地装置。每次调用都拥有一个单独的 Vite 缓存，并在正常关闭时将其删除，因此并发预览和附件固定装置不会相互失效。

这是一个可信的设备开发边界，而不是敌对的 HTML、浏览器扩展或已经控制的服务工作者的沙箱。应用程序外部的浏览器级导航不在其控制范围内。生产连接设置和 `pnpm ui:dev` 行为保持不变；当您有意需要真正的网关或外部集成时，请使用该命令。

## <a id="chat-input-ownership"></a> 聊天输入所有权

`ChatOutboxGatewayOwner` 拥有排队输入准入、更新、删除和匹配窗格投影。单行更改和重新排序共享一个持久的比较和设置操作；队列调用者不会发布单独的存储和显示更新。命令完成使用 Composer 恢复所有者来保留或释放草稿附件。交货等待完整的设置更新链，然后继续同步准入，以便另一个拣选器更新无法在结算和运输之间进入。

## <a id="chat-render-scheduling"></a> Chat渲染调度

流式增量和会话名册通知不得触发不相关的渲染。 shell 直接处理会话删除和文档标题更新，无需渲染名册出版物。聊天流拥有其帧队列；聊天页面会话订阅通过 `SubscriptionsController` 合并演示文稿更新。状态同步保持即时状态，而 Lit 提交在计划帧内运行，因此子属性绑定不会逃逸到以后的微任务中。断开或替换订阅会废弃其排队帧。隐藏文档会立即失效，因为动画帧可能会暂停。

`chat-stream-runtime-budgets.e2e.test.ts` 套件通过结构更新计数保护流媒体；聊天页面单元测试涵盖干预名册出版物。

Shell 回调在渲染过程中保留其标识，因此后台会话更新不会重绘导航两次。当草稿和关注徽章的基本事实发生变化时，发件箱订阅仍然会使它们失效。会话链接装饰保留未更改的属性，而不是在每次名册更新时重写它们。

转录增强检查插入或更改的 Markdown 块；当相邻的散文流时，已确定的代码块和表不需要再次扫描。调整观察者自己的几何变化的大小。命令选项板同样在导航结果时保留其测量的输入布局，并重新测量编辑、宽度变化和重新连接的字段。状态时钟在隐藏选项卡中暂停，仅当其显示值或属性发生变化时才呈现。

第一个连接的、呈现的副本提交渲染每个视口边缘之外的两个相邻行。下一个动画帧恢复六行滚动缓冲区；挂起的导航、焦点或锚点协调会立即使用该完整缓冲区，包括相邻控件（例如折叠工作标题）。聚焦行和锚定行保持独立保留。链接预览发现等待浏览器空闲时间，然后跟踪转录突变，而不是在每个窗格更新上重新扫描未更改的内容。隐藏或退出该窗格会取消挂起的发现。

流式传输 Markdown 在一个有界缓存中保留标准化输入、分割进度和渲染前缀。完成的独立块渲染一次；替换、区域设置或显示选项更改以及文档范围的 Markdown 依赖性会使重用无效。列表、引用定义、容器、原始 HTML 和冲突文件标签保留其整个块或整个前缀语义以及现有的解析限制。

仅当视口高度或校正的滚动偏移发生变化时，Composer 才会编辑发布脚本调整大小通知。拔模增长、收缩和末端锚定仍然立即同步。位置导轨观察列宽和对话区域高度，而不是测量每个流式渲染上的装订线；虚拟器和侧边栏几何形状更改保留其显式同步路径。轨道标签在已安装的标记之间共享，因此屏幕外历史记录不会在每次流更新时添加翻译工作。

侧边栏旁白在隐藏时会释放其会话兴趣。获取和释放共享有界指数重试退避，并具有完整的抖动和服务器延迟提示。失败的版本保留其原始控制权，包括后期隐藏的收购；返回兴趣会取消排队的释放并在退出这些句柄之前重新获取。共享连接协调器在不确定的取消订阅超时后更新观察者，并保留其他观察者的租约和批准交付。 DOM 分离暂停计时器而不丢弃保留的句柄；连接关闭会使它们退役并取消重试。

## <a id="talk-live-smoke-test"></a> Talk现场烟雾测试

维护者可以使用浏览器从存储库根到端到端的对话路径。将每个占位符替换为真正的密钥：

```bash
OPENAI_API_KEY=<openai-key> GEMINI_API_KEY=<gemini-key> \
  node --import tsx scripts/dev/realtime-talk-live-smoke.ts
```

该运行验证了 OpenAI 后端 WebSocket 桥、合成的 PCM24 语音到响应音频往返、OpenAI 浏览器 WebRTC SDP 交换、Google Live 约束令牌浏览器设置JPEG 帧和 `describe_view` 函数往返，以及带有假麦克风媒体的网关中继浏览器适配器。通过 `--openai-audio-cycles 3` 进行短暂重复的 OpenAI 连接、对讲和关闭浸泡。该命令仅打印提供程序状态，不记录机密。

## <a id="debugging%2Ftesting%3A-dev-server-%2B-remote-gateway"></a><a id="debugging/testing-dev-server-+-remote-gateway"></a> Debugging/testing：开发服务器+远程网关

Control UI 是静态文件；WebSocket 目标可配置，并且可以不同于 HTTP origin。当你希望本地使用 Vite 开发服务器，而 Gateway 运行在其他地方时，这很方便。

<Steps>
  <Step id="start-the-ui-dev-server" title="启动UI开发服务器">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step id="connect-the-remote-gateway" title="连接远程网关">
    按照 [远程 Gateway URL 交接](/web/urls#remote-gateway-handoff) 参考文档获取编码后的 Gateway URL 和可选的一次性凭据。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion id="origin-security-notes" title="来源安全说明">
    - 公共非环回 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整来源）。接受来自环回、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主机的私有同源 LAN/Tailnet 加载，而不启用主机标头回退。
    - Gateway 启动时可能会根据实际运行时绑定地址和端口，注入本地 origin，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但远程浏览器 origin 仍然需要显式配置。
    - 除非用于严格受控的本地测试，否则不要使用 `gateway.controlUi.allowedOrigins: ["*"]`；这表示允许任何浏览器 origin，而不是“匹配我正在使用的任意主机”。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用 Host-header origin 回退模式，但这是一个危险的安全模式。

  </Accordion>
</AccordionGroup>

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

远程访问设置详情：[远程访问](/gateway/remote)。
