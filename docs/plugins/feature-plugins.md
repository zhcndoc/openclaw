---
summary: "使用类型化操作、本机页面和可替换的 Control UI 视图构建插件"
title: "功能插件"
read_when:
  - "您想要一个插件来添加本机 Control UI 页面或自定义工作区"
  - "您希望 UI 和代理工具具有相同的功能操作"
  - "您希望代理构建并提出本地插件工件"
---

功能插件可以拥有其后端操作及其 Control UI。它可以添加页面、导航、会话操作、面板、仪表板小部件和标题附件，或提供工作区、会话列表、编辑器、脚本和工具结果的替代品。

所有插件 API 均为 [experimental](/plugins/sdk-overview#api-stability)，包括此页面上的后端和浏览器合约。固定并测试您的 OpenClaw 主机版本。

本机 UI 在 Control UI 源中运行受信任的 JavaScript。仅从您信任的作者处安装它。本机模块共享登录操作员的网关权限：`host.request` 可以调用连接范围允许的任何方法，包括管理员的管理方法。当内容应与主机应用程序隔离时，请使用现有的沙盒仪表板小部件或 MCP 应用程序界面。

打开由连接的网关提供服务的 Control UI。原生插件资源需要相同的来源；连接到另一个网关的单独托管的 UI 无法加载它们，并解释要打开哪个 Control UI。

经过身份验证的本机 UI 还需要 HTTPS 或浏览器信任的环回 URL，例如 `http://127.0.0.1:18789/`。 LAN 地址上的普通 HTTP 可以配对和使用仪表板，但无法发送用于本机资产的安全 cookie。插件页面解释了如何切换到 HTTPS/Tailscale Serve 或 localhost；后端操作仍然可用。

## <a id="enable-custom-plugin-ui"></a> 启用自定义插件 UI

在Control UI中，打开**设置→实验室→自定义插件UI**。该设置默认为关闭，并控制来自用户安装的插件（包括本地开发插件）的本机浏览器代码。等效的配置是：

```json5
{
  gateway: {
    controlUi: {
      experimental: { customPlugins: true },
    },
  },
}
```

更改无需重新启动网关即可应用，并且连接的 Control UI 页面会自动刷新其插件视图。禁用它会阻止加载自定义本机 UI 并删除其视图。重新加载浏览器选项卡以清除已运行的插件 JavaScript。这不会卸载插件或禁用其后端操作、工具或服务。普通插件 API、沙盒仪表板小部件和 MCP 应用程序不受影响。

随 OpenClaw 一起提供的本机 UI 仍然可用于启用的捆绑插件，包括 Workboard。 OpenClaw 根据加载的插件的来源确定捆绑状态，而不是其名称或清单声明。单独安装的副本使用自定义插件设置。

## <a id="create-a-feature-plugin"></a> 创建功能插件

在打开生成的插件的浏览器视图之前，启用 [Custom 插件 UI lab](/plugins/feature-plugins#enable-custom-plugin-ui)。

```bash
openclaw plugins init draft-review --name "Draft Review" --type feature
cd draft-review
npm install
npm run build
npm run validate
openclaw plugins install .
```

入门插件包括草稿分析操作、代理工具、本机页面和作曲家替换。从 Control UI 侧边栏打开草稿审阅，或打开 **Plugins → 高级 → 自定义 UI** 并选择草稿编辑器。选择内置来恢复视图。替换选择属于当前浏览器运行时；它不是持久性配置设置。

自定义控件是 **Plugins → Advanced** 中的第一部分。如果工作区替换隐藏了导航，请打开 Control UI 底座 URL 下的 `/settings/plugins?tab=advanced` 选择内置；插件设置始终使用内置工作区。

该项目有3个公共SDK导入：

| 导入                                 | 用途                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `openclaw/plugin-sdk/feature-contract` | 共享操作模式、类型化客户端和事件订阅；浏览器安全。                  |
| `openclaw/plugin-sdk/feature-plugin`   | 将后端实现注册为会话操作、可选代理工具和命令适配器。 |
| `openclaw/plugin-sdk/control-ui`       | 本机浏览器激活、主机功能、贡献类型和组件安装。          |

浏览器代码拥有其 DOM 并捆绑其框架依赖项。它不导入 Control UI 内部结构或返回主机框架的模板。

## <a id="define-operations-once"></a> 定义操作一次

`defineFeatureContract` 使用 TypeBox 输入和输出模式声明命名查询和操作。 `defineFeaturePlugin` 通过 `setup(api, events)` 实现它们，并在现有插件会话操作传输上注册每个操作。查询需要`operator.read`；操作需要 `operator.write`。

具有 `tool` 声明的操作还会注册代理工具。可选的命令适配器解析实际的命令上下文并格式化结果。处理程序接收可区分的调用上下文：`source` 是 `session-action`、`tool` 或 `command`，以及该表面的原始上下文。工具策略、经过身份验证的命令处理和网关范围检查仍归其现有执行路径所有。

在浏览器视图中使用 `createFeatureClient(contract, context.host)`：

```typescript
const feature = createFeatureClient(contract, context.host);
const report = await feature.invoke("analyze", { text: "A draft to inspect" });
context.signal.throwIfAborted();
output.textContent = `${report.words} words`;
```

后端输入、输出和事件被验证为有界 JSON。也在模式中定义有意义的限制。使用插件现有的运行时和存储 API 来实现持久状态和服务。

对于更改数据，请在合约中声明事件，并在插件服务启动后通过 `events` 参数发出它们。客户端可以使用 `feature.on(...)` 订阅或使用 `feature.watch(query, input, options)` 最初、指定事件之后以及重新连接之后请求最新快照。 `watch` 需要 `onChange` 和 `onError`，返回处置器，并在较新的刷新或视图处置后拒绝过时的结果。它不进行轮询。

## <a id="contribute-and-replace-views"></a> 贡献和替换视图

从浏览器条目导出 `defineControlUiPlugin({ id, activate(host) })`。它的 id 必须与插件清单匹配。通过`host.ui`注册捐款；每个注册都会返回一个处理程序。

| 登记                            | 主机安置                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `registerPage` 和 `registerNavigation` | 插件拥有的路线和侧边栏目标。                                                                                           |
| `registerAction`                        | Composer、标题或会话菜单操作。可选的 `resolve` 函数提供当前标签、隐藏状态和禁用状态。 |
| `registerPanel`                         | 会话面板。                                                                                                                         |
| `registerAccessory`                     | 会话标头内容。                                                                                                                 |
| `registerWidget`                        | 本机仪表板小部件视图。                                                                                                          |
| `registerReplacement`                   | `workspace`, `session-list`, `composer`, `transcript`, or `tool-result`.                                                                |

将导航项的 `parent` 设置为同一插件中的另一个导航项 ID，以在父目标或子目标处于活动状态时显示其嵌套；子项仅在固定时显示为顶级条目。设置`defaultVisible: false`在**Customize**中提供一个项目，并在注册后调用`host.ui.pinNavigation(id)`以附加普通保存的侧边栏引脚。对于未知或已固定的 ID，固定是无操作的；为用户操作（例如创建）调用它，而不是在每次目录刷新时调用它，因此稍后的手动删除将保持删除状态。

导航项可以为 `actions` 提供 `id`、`label`、可选的 `icon` 和 `destructive` 标志以及 `run` 回调。侧边栏可通过右键单击、**Shift+F10** 或焦点链接上的上下文菜单键打开这些操作，包括嵌套和固定条目。选择一个操作会关闭菜单； **Escape** 或外部单击可将其关闭。使用 `host.ui.isNavigationPinned(id)` 读取已保存的引脚，使用 `host.ui.unpinNavigation(id)` 将其删除；重复调用没有额外效果。插件选择提供哪些操作并拥有对破坏性操作的确认。

对于仪表板小部件，还要使用 `surface: "widget"` 注册后端 `api.session.controls.registerControlUiDescriptor`、相同的小部件 `id` 及其 `requiredScopes`。网关为当前连接的范围通告小部件类型；仅当通告其匹配的后端描述符时，本机视图才会呈现。

使用 `host.ui.openPanel("editor", { sessionKey, agentId })` 在会话旁边打开您注册的面板之一。省略会话将使用当前选定的会话。主机拥有导航和侧边栏演示，包括在安装会话窗格之前从插件页面打开。只能打开同一个插件注册的面板；保留的句柄随着其视图或激活而过期。

对于文档链接，请使用 `host.navigation.pageHref(...)` 构建指向已注册插件页面的链接。该页面可以解析其文档并通过目标会话调用 `openPanel`。这不会拦截普通文件链接或更改文件插件的所有权。

当插件拥有的状态更改操作或其他贡献的表示时，请使用 `host.ui.invalidate()`。命名空间自定义元素和带有插件 ID 的 CSS，因此独立捆绑的插件可以共存。

视图安装到 `HTMLElement` 中并接收 `context.host`、`props`、`signal`、`presented` 和 `mountDefault`。根据需要返回 `update`、`focus` 和 `dispose` 的对象。表面道具和演示更改通过 `update` 到达；使用`context.host.subscribe(...)`观察主机快照变化。当 `presented` 为 false 时，保持挂载状态的视图将保留其主机生命周期；用它来暂停视觉工作，同时保留状态。删除或处置视图会中止其信号并收回其主机句柄。异步工作后检查信号并释放`dispose`中的插件资源。

会话绑定视图和操作接收 `sessionKey` 和 `agentId`。发出会话请求时同时携带两者：应用程序选择的代理可以与视图的代理不同。更改该标识的任何一部分都会停用旧视图的句柄，包括保留的作曲家操作。当标题和编辑器操作的窗格停止显示时，它们也会退出。稍后返回该窗格可以执行新操作；它不会恢复先前调用的句柄。

替换可以通过调用`context.mountDefault(container)`来组成内置视图。当工作区替换想要保留内置聊天状态和会话所有者时，应使用此选项。 SDK 不会为完全独立的工作区公开单独的无头聊天服务。

作曲家替换接收当前草稿、准入状态、禁用原因以及标准 `setDraft`、`send` 和可选 `abort` 操作。使用这些操作而不是发出原始聊天 RPC。 `send()` 被接纳时解析为 `true`，被拒绝时解析为 `false`，或者本地命令或不提交时解析为 `undefined`。显示被拒绝的提交而不是清除草稿。当视图停止呈现时，Composer 操作就会退出，即使其 DOM 和主机生命周期仍然存在。再次呈现视图时，使用 `update` 提供的新操作；先前捕获的行动仍然退役。

### <a id="host-capabilities"></a> 主机能力

使用主机来共享应用程序行为：

| 能力              | 用途                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `agents`                | 代理快照、选择、范围和刷新。                                                               |
| `components`            | 主持人拥有的对话框、选择器和会话仪表板。                                                          |
| `connection`            | 当前连接和操作员能力。                                                                 |
| `dock`（可选）       | 使用 `openSession` 在当前页面旁边打开对话，关闭扩展坞，然后观察 `openSessionKey`。 |
| `navigation`            | 打开插件页面并构建其 URL。                                                                       |
| `request` 和 `onEvent` | 经过身份验证的网关请求和事件订阅。                                                       |
| `sessions`              | 会话快照、独立查询、导航、创建和更新。                                    |
| `subscribe`             | 观察主机快照更改，包括停靠的会话密钥。                                              |
| `ui`                    | 注册、选择和使插件贡献失效。                                                        |

会话和代理 `refresh()` 操作获取新快照并在失败时拒绝，因此插件可以显示错误并提供重试。 `host.sessions.rows` 是当前已过滤、分页的会话列表。 `host.sessions.refresh()` 保留该列表的过滤器。使用`host.sessions.observe(query, onChange)`维护独立的会话查询，无需替换。查询接受 `agentId`、`search`、`archived`（`true`、`false` 或 `"all"`）、`limit`、`configuredAgentsOnly`、`includeGlobal`、 `includeUnknown`、`excludeDock`、`includeDerivedTitles` 和 `includeLastMessage`。回调接收`{ result, loading, error }`，从当前快照开始；在数据可用之前，`result` 为空。结果包含 `sessions` 以及网关的 `hasMore`、`nextOffset` 和 `totalCount` 分页元数据。

与 `host.sessions.create({ agentId, displayName?, label?, surface? })` 创建对话。 `displayName`是可重复使用的显示标题； `label` 是唯一的会话标签。对于插件页面 Dock 拥有的对话，请传递 `surface: "plugin-dock"`。这种不可变的创建表面标记将对话隐藏在普通会话列表中，而无需更改其人类创建者、访问、共享或沙箱规则。行公开 `isDock` 和 `createdSurface`； `createdVia` 保留了其普通运营商出处。独立主机列表查询默认排除dock对话；故意包含它们时通过 `excludeDock: false`。会话密钥仍然可用于 `host.dock.openSession` 和直接读取。

主机获取查询并通过会话事件、观察者恢复及其正常删除处理使其保持最新。 `observe` 返回 `{ refresh, dispose }`：调用 `refresh()` 进行显式重试，并在不再需要查询时调用 `dispose()`。快照中会出现错误，并且失败时显式刷新将被拒绝。查看处置也释放其查询；保留的句柄和未完成的刷新在生命周期结束后会被拒绝。

已过滤或不完整的列表中缺少行并不能证明会话已被删除。待删除还可以在分页元数据更改之前隐藏行。将 `{ sessionKey: row.key, agentId: row.agentId }` 传递到 `host.sessions.open`、`host.sessions.patch` 以及仪表板的 `session` 属性。携带返回行中的身份：原始 `global` 密钥属于其查询的代理，而不是当前选择或卡的指定代理。将未解决或不明确的搜索视为未知。当花名册更改时，会话操作演示会更新，并且操作在调用时会再次检查当前行。动作可以检查`session.hasActiveRun`；缺失值意味着活动尚不清楚。 `host.components` 从普通道具和 DOM 内容安装主机拥有的对话框、代理选择器、可搜索选择器和会话仪表板。每个组件返回`update`和`dispose`方法；主机保留权限检查、焦点处理和仪表板提供程序所有权。使用 `mountSelectPicker` 获取 `{ value, label, description? }` 选项、选定的 `value`、`accessibleLabel` 和 `onSelect` 回调的列表。对于 `searchable: true`，超过八个选项的列表会显示搜索字段。选择器匹配选项标签、值和描述。

### <a id="dock-a-conversation"></a> 对接对话

在提供停靠操作之前检查 `host.dock`。从安装视图中，使用 `context.host.dock.openSession({ sessionKey, agentId, label, context })` 打开插件页面旁边的命名对话。 `label` 提供停靠选项卡标题；可选的 `context` 是 `{ page, detail? }`，其中 `page` 可以是您的插件页面 ID，`detail` 包含字符串引用字段。

主持人重复使用主扩展坞的放置控件、聊天窗格、草稿和附件。页面导航使对话底座保持打开状态；结束插件激活会关闭激活仍然拥有的扩展坞。当 `host.dock.openSessionKey` 更改时，使用 `host.subscribe(...)` 刷新您的操作。有关替换、可见性、访问和上下文限制，请参阅 [dock 合约 ](/plugins/sdk-subpaths#control-ui-conversation-dock)。

## <a id="build-and-reload"></a> 构建并重新加载

`package.json` 将浏览器命名为 **source**：

```json
{
  "openclaw": {
    "extensions": ["./dist/index.js"],
    "controlUi": "./src/control-ui.ts"
  }
}
```

`openclaw plugins build` 将该源及其浏览器依赖项与插件的 `esbuild` 开发依赖项捆绑在一起。它在`dist/control-ui/<content-hash>/`下写入不可变的JavaScript和CSS，然后在`openclaw.plugin.json.controlUi`中发布它们的路径。失败的构建会使之前的清单和资产可用。 `plugins validate` 和 `plugins build --check` 检测过时的源、资产或生成的元数据。

主机运行时构建保持编写的根清单不变，并在 `dist/openclaw.plugin.json` 中发布其浏览器声明。生成的声明仅替换 `controlUi`；配置模式和激活仍然来自根清单。显式 `plugins build` 发布根声明并收回先前生成的指针。两种布局都保留相对于插件根目录的资源路径。

### <a id="solid-views"></a> 立体视图

本机插件视图支持 Solid 2。使用 `.tsx` 浏览器条目并将 `solid-js` 和 `@solidjs/web` 声明为插件的运行时依赖项，并具有匹配的版本。将 `@solidjs/compiler` 和 `esbuild` 添加到其开发依赖项中。将 `/** @jsxImportSource @solidjs/web */` 放在每个 Solid `.tsx` 文件中的导入之前。这个标准JSX pragma选择插件自己的Solid编译器；其他 JSX 文件保留 esbuild 现有的渲染器语义。构建器捆绑渲染器，主机不提供共享运行时。对于类型检查，设置 `jsx: "preserve"` 和 `jsxImportSource: "@solidjs/web"`。

框架中立视图合约保持不变：

```tsx
import { render } from "@solidjs/web";
import type { ControlUiView } from "openclaw/plugin-sdk/control-ui";
/** @jsxImportSource @solidjs/web */
import { createSignal } from "solid-js";

const mount: ControlUiView = (container, context) => {
  const [label, setLabel] = createSignal(context.props.label ?? "Ready");
  const dispose = render(() => <p>{label()}</p>, container);
  return {
    update(next) {
      setLabel(next.props.label ?? "Ready");
    },
    dispose,
  };
};
```

让一个渲染器负责每个容器的子级，并在视图结束时处理其根。 Solid 2 批次反应式写入；与现有所有者保持同步请求权限和突变防护。

### <a id="bundle-boundaries"></a> 束边界

该构建会发出 JavaScript 条目、可选的 CSS 和 JavaScript 块以用于延迟导入。内容哈希涵盖了整个生成过程，包括其块。 CSS 仍附在条目上；加载 JavaScript 块不会附加样式表。经过身份验证的引导程序会通告条目、样式表和静态 JavaScript 依赖项，以便浏览器可以在网关连接完成之前将它们一起预加载。激活仍然等待当前目录、资产授权和所有样式表；动态导入仍然是惰性的。在捆绑包中嵌入其他静态资源；任意文件都在此构建合同之外。导入必须可由 esbuild 分析：文字路径和支持的 glob 导入有效；未解析的动态导入、间接 `require` 调用和 `require.resolve` 被拒绝。导入验证检查树摇动后发出的块：可以删除未使用的依赖项加载器，但每个保留的浏览器导入必须解析为捆绑的块。每个资产限制为 4 MiB，整个插件浏览器版本的资产限制为 8 MiB 和 128 个资产。

具有预构建浏览器捆绑包的插件可以省略 `package.json.openclaw.controlUi` 并在 `openclaw.plugin.json.controlUi` 中声明构建的条目和样式。打包和服务包括该条目目录下的 JavaScript 和 CSS 依赖项，包括嵌套块和导入的样式表，具有相同的字节限制。 TypeScript 源、源映射和隐藏文件被排除。将所有浏览器依赖项保留在该目录中；遍历仅限于 8 个嵌套目录级别和 128 个条目（包括文件和目录）。

仅浏览器编辑后，重建已安装的插件并以管理员身份打开 **Plugins → 高级 → 自定义 UI → 重新加载插件 UI**。网关捕获新的资产修订并通知连接的浏览器。 UI 自定义控件中报告资产加载或激活失败；如果可能的话，会保留之前的工作激活。更正插件后重试，或选择内置以恢复替换的视图。

公布的资产修订在其后端插件的生命周期内仍然可用，包括旧选项卡或保留的工作视图所需的导入。共享缓存最多可容纳所有本机插件的 256 个修订版和 64 个 MiB。当它填满时，重新加载会拒绝新构建并保留广告资产。重新启动网关，然后重试重新加载。

首次激活时，插件页面和仪表板小部件显示加载状态，同时目录、资产授权和初始化程序完成。每个插件都可以独立于仍在加载的其他插件而可用。断开连接的视图在检查可用性之前等待网关连接。小部件通过重试操作显示初始化失败。

初始化成功后，激活过程中进行的注册和替换选择会一起发布。在该点之前处理注册也会取消其待处理的选择。无效的选择会拒绝新的激活，而不会使之前的工作 UI 失效。

当该表面的贡献仍然存在时，选定的替代品在成功修订后仍然存在。取消注册贡献、删除其插件或重新连接会清除选择；重复使用 ID 并不能恢复它。

自定义元素定义属于浏览器文档。如果插件更改了现有的自定义元素类，请重新加载浏览器选项卡，或使用新的版本化标签名称。

后端更改使用 [ 插件更新或 Reload](/cli/plugins/uninstall-and-update) 来替换正在运行的插件，而无需重新启动网关。浏览器重新加载不会替换后端服务或更改已运行代理的工具目录。

## <a id="approve-an-agent-built-artifact"></a> 批准代理构建的工件

构建并验证后，生成导入存档：

```bash
openclaw plugins pack --root . --out ./draft-review.tgz --json
```

收据包含绝对存档路径、SHA-256 摘要、插件 ID 和 `plugin_activate_artifact` 请求。打包捆绑后端依赖项，保持主机 `openclaw` 导入外部，并包含清单和编译后的 UI。该存档不包含安装脚本或运行时包依赖项。它必须有一个后端条目；需要单独运行时文件的功能需要正常审查的包安装流程。打包会拒绝对 `import.meta`、`__dirname`、`__filename` 和 `require.resolve` 的后端引用，包括捆绑依赖项中的引用，因为它们的原始文件和位置不会随工件一起移动。导入 JSON 或在后端构建中嵌入其他资源。

后端导入也必须可由 esbuild 分析。直接CommonJS导入工作，包括Node内置和主机SDK。未解析的动态导入、间接 `require` 调用以及具有不透明运行时加载器的预捆绑包将被拒绝。提供一个在没有这些加载器的情况下编译的条目，以便打包可以捆绑其依赖项，或使用正常的包安装流程。

系统代理可以建议使用该路径和摘要进行激活。在批准之前，OpenClaw 会验证并保留确切的存档，并检查其声明的功能和本机 UI 的存在，而无需执行插件。批准的应用程序通过托管插件安装程序使用这些保留的字节。在等待批准期间更改源文件无法更改已安装的内容。现有的安装策略和功能检查仍然适用。

工件批准不会启用自定义插件 UI 实验室。安装的后端可以在关闭该设置的情况下运行；其本机浏览器 UI 仍处于封闭状态。

待处理的导入在一小时后到期。 OpenClaw 最多保留 8 个待处理档案，每个档案最多 32 个 MiB，并在准备另一个提案时修剪过期或最旧的导入。过期或被逐出的审核需要新的提案。批准的存档将作为安装源单独保留，包括当安装程序错误导致最终安装结果不确定时。

工件激活当前需要在根配置文件中进行插件配置，而无需根级别 `$include`。对于仅包含 `$include: "plugins.json5"` 的 `plugins` 部分（config 目录下的单个文件，没有嵌套包含），请从受信任的 shell 使用 `openclaw plugins install <archive>`。常规安装程序还拒绝根级、嵌套和外部包含布局；安装前调整这些布局。

工件激活也拒绝替换支持 OpenClaw 主动推理路线的插件。停止 OpenClaw 并从受信任的 shell 安装该工件。

网关托管的工件激活等待后端运行时应用程序。没有实时网关生命周期回调的终端或其他主机保存安装并报告作者的后续情况；该结果不是运行时应用程序收据。网关应用插件后，检查 `plugins.controlUi.status` 以查看当前连接的 Control UI 客户端的激活报告。报告命名插件修订版以及 `activated` 或 `failed`；它是浏览器激活收据，并不能证明已执行每个功能操作。没有连接的浏览器意味着还没有浏览器激活收据。

有关底层清单字段，请参阅 [Plugin 清单](/plugins/manifest)。有关安装、更新和删除的信息，请参阅 [管理插件](/plugins/manage-plugins)。
