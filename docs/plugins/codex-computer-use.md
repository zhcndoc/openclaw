---
summary: "设置 Codex 计算机用于 Codex-mode OpenClaw 代理"
title: "Codex 电脑使用"
read_when:
  - "您希望 Codex-mode OpenClaw 代理使用 Codex 计算机使用"
  - "你在 Codex Computer Use、PeekabooBridge 和直接使用 cua-driver MCP 之间做选择"
  - "你正在为捆绑的 Codex 插件配置 computerUse"
  - "你正在排查 /codex computer-use status 或 install"
---

Computer Use 是一个用于本地桌面控制的 Codex-native MCP 插件。 OpenClaw 不供应桌面应用程序、本身执行桌面操作或绕过 Codex 权限。捆绑的 `codex` 插件仅准备 Codex 应用程序服务器：它启用 Codex 插件支持，查找或安装配置的计算机使用插件，检查配置的 MCP 服务器是否可用，然后让 Codex 在调用期间拥有本机 MCP 工具调用。 Codex-模式转动。普通非严格轮换检查安装和工具可用性，无需运行实时检查。显式 status/install 命令、严格就绪启动和启用的定期运行状况检查会测试实时连接。当服务器公开旧的计算机使用表面时，它们使用 `list_apps`。相反，使用一个 `await cua.listApps();` 调用来检查公开 `js` 的较新服务器。这两项检查都会验证本机应用程序控制，而无需清点浏览器界面。带有 `isError: true` 的 MCP 响应未就绪，而不是计为成功响应。

如果 OpenClaw 已经在使用原生 Codex harness，就使用本页。关于运行时本身的设置，请参见 [Codex harness](/plugins/codex-harness)。

这与 OpenClaw 的内置 [ 节点支持的计算机工具 ](/nodes/computer-use) 不同。当同一个代理合约应控制配对的 Mac（无论代理在网关上还是在其他节点上运行）时，请使用内置工具。使用 Codex 计算机当 Codex 应用程序服务器应拥有本地 MCP 安装、权限和本机工具调用时使用。

## <a id="openclaw.app-and-peekaboo"></a><a id="openclaw-app-and-peekaboo"></a> OpenClaw.app 与 Peekaboo

OpenClaw.app 的 Peekaboo 集成与 Codex Computer Use 是分开的。该 macOS 应用可以托管一个 PeekabooBridge 套接字，这样 `peekaboo` CLI 就可以重用应用的本地辅助功能和屏幕录制授权，用于 Peekaboo 自身的自动化工具。该桥接不会安装或代理 Codex Computer Use，而且 Codex Computer Use 也不会通过 PeekabooBridge 套接字调用。

当您希望 OpenClaw.app 成为 Peekaboo CLI 自动化的权限感知主机时，请使用 [Peekaboo 桥 ](/platforms/mac/peekaboo)。当 Codex-mode OpenClaw 代理在回合开始前应具有 Codex 的本机 `computer-use` MCP 插件时，请使用此页面。

## <a id="ios-app"></a> iOS 应用

iOS 应用程序与 Codex 计算机使用是分开的。它不安装或代理 Codex `computer-use` MCP 服务器，并且它不是桌面控制后端。相反，iOS 应用程序作为 OpenClaw 节点进行连接，并通过 `camera.*`、`screen.*`、`location.*` 和 `talk.*` 等节点命令公开移动功能。

当您希望代理通过网关驱动 iPhone 节点时，请使用 [iOS](/platforms/ios)。当 Codex-mode 代理应通过 Codex 的本机计算机使用插件控制本地 macOS 桌面时，使用此页面。

## <a id="direct-cua-driver-mcp"></a> 直接的 cua-driver MCP

Codex 计算机使用并不是公开桌面控制的唯一方法。如果您希望 OpenClaw- 托管运行时直接调用 TryCua 的驱动程序，请通过 OpenClaw 的 MCP 注册表使用上游 `cua-driver mcp` 服务器，而不是 Codex- 特定的市场流。

安装 `cua-driver` 后，可以让它输出 OpenClaw 命令：

```bash
cua-driver mcp-config --client openclaw
```

或者直接注册 stdio 服务器：

```bash
openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
```

该路径使上游 MCP 工具表面保持完整，包括驱动程序架构和结构化 MCP 响应。当您希望 CUA 驱动程序可用作普通 OpenClaw MCP 服务器时，请使用它。当 Codex 应用程序服务器应该拥有插件安装、MCP 重新加载以及 Codex- 模式内的本机工具调用时，请使用此页面上的 Codex 计算机使用设置。

CUA 的驱动程序提供了 macOS、Windows（x64 和 ARM64）和 Linux（x64 和 ARM64，预览层）的预发布版本。它仍然需要其应用程序提示的本地 OS 权限，例如 macOS 上的辅助功能和屏幕录制。 OpenClaw 不会安装 `cua-driver`、授予这些权限或绕过上游驱动程序的安全模型。

## <a id="quick-setup"></a> 快速设置

当 Codex- 模式转变时设置 `plugins.entries.codex.config.computerUse` 必须在线程启动之前使计算机可用。 `autoInstall: true` 选择计算机使用并让 OpenClaw 在回合前安装或重新启用它：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-6-astra",
    },
  },
}
```

使用此配置，OpenClaw 在每次 Codex- 模式转动之前检查 Codex 应用程序服务器。如果缺少“计算机使用”，但 Codex 应用程序服务器已发现可安装的市场，则 OpenClaw 会要求 Codex 应用程序服务器安装或重新启用插件并重新加载 MCP 服务器。在 macOS 上启动隔离的 Codex 应用程序服务器之前，自动安装还会将选定的桌面应用程序包中的官方签名的计算机使用服务应用程序配置到该 Codex 主目录的 `computer-use` 目录中。 OpenClaw 验证外部服务和嵌套客户端签名、捆绑包身份、版本、构建和代码哈希。它会安装丢失或不完整的副本，或者在换出签名身份不再与所选桌面发行版匹配的完整副本之前暂存并验证替换版本。失败的交换会回滚，而不更改隔离的 Codex 主目录的其余部分。此本机应用程序同步仅针对 OpenClaw- 拥有的隔离代理家庭运行。用户范围的 home 和显式的 `CODEX_HOME` 覆盖保留其现有的本机捆绑包所有权。代理目录是可信所有权边界。在其中，本机服务配置拒绝符号链接的 Codex-home、`computer-use` 和服务应用程序路径，并在每个分阶段交换周围重新验证所拥有的父级。在 macOS 上，OpenClaw 通过 `$CODEX_HOME/.tmp/bundled-marketplaces/openai-bundled` 上真实的独立家庭拥有的包装器公开所选桌面应用程序的捆绑市场。 Codex 为 `openai-bundled` 市场保留该路径。旧版桌面捆绑包使用指向其清单和插件目录的链接。当较新的桌面捆绑包将旧版 MCP 插件替换为 `unified-computer-use` 时，包装器会使用同一选定桌面的 Node、Node、REPL 和 CUA 包来具体化该插件的启动描述符。其 `cua_repl` 服务器使用隔离家庭的签名计算机使用服务。本机安装和重新安装复制这个准备好的源；桌面捆绑包和桌面用户的插件缓存不会被修改或复制。其他插件（包括单独的浏览器集成）保留其源链接。 OpenClaw 然后要求 Codex 应用程序服务器注册包装器。如果安装程序仍然无法使 MCP 服务器可用，则在线程启动之前轮转失败。

旧版默认 plugin/server 对会自动遵循此替换，包括使用默认服务器名称显式配置的 `pluginName: "computer-use"`。自定义插件、服务器或市场选择保持不变。 `computer-use@openai-bundled` 的显式本机禁用会阻止功能启用之前的自动替换。在市场发现和插件检查之后，在发送本机安装请求之前立即禁用自动安装重新检查。禁用状态将安装报告为未选中，因为策略阻止了检查；这并不意味着该插件不存在。启动缓存准备会保留所请求的身份，直到本机有效策略可用。显式本机 `mcp_servers.computer-use` 条目或旧插件 MCP 工具策略保留旧身份，因此重命名的服务器无法绕过这些限制。在选择统一服务器之前显式更新该本机策略。本机 `cua_repl` 覆盖继续优先于插件。托管统一运行时启用其 **computer** 表面，保留桌面应用程序发现和控制。它不会将代理附加到桌面应用程序的浏览器会话或宣传统一的浏览器界面。本机 MCP 策略、工具限制和 macOS 权限仍然适用。桌面更新一起刷新准备好的源代码和客户端生成。使用默认值 `strictReadiness: false`，启动时不会创建临时检查线程或等待就绪工具调用。使用 `/codex computer-use status` 验证实时桌面访问，或启用 `healthCheckEnabled` 进行活动应用程序服务器客户端拥有的定期检查。当每个回合在其线程启动之前必须等待成功的实时检查时，设置 `strictReadiness: true`。严格的就绪失败是利用预检失败，因此模型回退不会为每个 Codex 候选者重复相同的本地就绪序列。解析为另一个工具的候选者仍然符合资格，并通过正常的策略检查进入该运行时。

在更改 Computer Use 配置后，如果现有 Codex 线程已经开始，请在受影响的聊天中使用 `/new` 或 `/reset`，然后再进行测试。

在 macOS 上，计算机使用的托管启动首选 `ChatGPT.app`，然后是独立安装的 `Codex.app`。在每个应用程序的 `Contents/Resources` 中，它会在较旧的 `codex` 布局之前检查 `codex-cli/CodexCLI.app/Contents/MacOS/codex`。对于任一可执行布局，计算机使用依赖项都根植于该应用程序的 `Contents/Resources` 中。这也适用于一次性计算机使用状态和启动其自己的客户端的安装命令。它将桌面控制保留在拥有本地 macOS 权限的应用程序包下。如果未安装桌面应用程序，OpenClaw 将回退到安装在插件旁边的托管 Codex 二进制文件。普通托管 Codex 使用默认的隔离代理主页，首先首选固定包，因此较旧的桌面应用程序无法隐藏当前模型支持。用户范围的家庭保持桌面优先，因为它们可以加载本机计算机使用状态。一个隔离的代理主页，其有效的 Codex 配置启用计算机使用也保持桌面优先。显式 `appServer.command` 配置或 `OPENCLAW_CODEX_APP_SERVER_BIN` 仍会覆盖此托管选择。

OpenClaw 会在一个正在运行的 Gateway 中串行化原生 Codex 配置读取和 Computer Use 安装。单独的 Codex 进程或另一个 Gateway 不在该保护范围内。在 Gateway 之外更改原生 Codex 插件配置后，请重启 Gateway 并启动新的聊天，再依赖新的选择。

网关监视可以提供应用程序服务器或计算机使用工件的所有标准 ChatGPT 和 Codex 桌面候选者。它不会轮询请求路径。检测到的更新解决后，现有的轮流将继续使用当前的应用程序服务器生成，并且新的收购将停止使用它。对于每个符合条件的隔离家庭，OpenClaw 等待最后一个老一代轮次释放其客户端，然后再刷新签名的计算机使用服务、共享缓存和托管市场包装器。排队的新回合然后开始替换；主动转向另一个家并不会阻止他们。如果捆绑包在启动期间再次发生更改，OpenClaw 在登录或 `thread/start` 之前隔离过时的客户端，并使用正常的有界启动重试。

显式 `appServer.command` 和 `OPENCLAW_CODEX_APP_SERVER_BIN` 客户端仍由运营商拥有，并且不会因标准桌面更新事件而停用。替换自定义可执行文件后重新启动网关。

这使得在正常更新程序行为下检测到、解决的标准桌面替换之后的第一个新请求变得透明。这不是对不相关的计算机使用传输失败的一般重试承诺。观察程序故障或不受支持的带外路径仍可能需要重新启动网关。 `autoInstall: false` 继续禁止自动本地服务和市场配置。 `autoRepair` 仅控制就绪性检查失败后的一次性过时 MCP 子修复；它不控制桌面一代的融合。

## <a id="commands"></a> 命令

从任何 `codex` 插件命令界面可用的聊天界面使用 `/codex computer-use` 命令。这些是 OpenClaw chat/runtime 命令，而不是 `openclaw codex ...` CLI 子命令：

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` 是默认操作，且为只读：它不会添加市场源、安装插件或启用 Codex 插件支持。若配置未将 Computer Use 纳入，即使执行过一次性安装命令，`status` 也可能报告为已禁用。

`install` 会启用 Codex app-server 插件支持，可选择性地添加已配置的市场源，通过 Codex app-server 安装或重新启用已配置的插件，重新加载 MCP 服务器，并验证 MCP 服务器是否暴露工具。由于安装会更改受信任的主机资源，只有所有者或 `operator.admin` Gateway 客户端才能运行 `install`。其他已授权的发送者仍可继续使用只读的 `status` 命令，包括带覆盖参数的情况。

即使旧版 `computer-use@openai-bundled` 插件被禁用，显式所有者授权的 `install` 命令也可以恢复托管统一替换。它会安装或重新启用选定的替换项，而不清除该旧设置。自动准备和安装继续遵循旧版禁用；要恢复自动替换，请在本机 Codex 配置中启用 `computer-use@openai-bundled`。显式安装仍然遵循本机服务器和工具策略。

较早版本支持一次性的 `--plugin`、`--server` 和 `--mcp-server` 标识覆盖。请改为持久化配置 `computerUse.pluginName` 和 `computerUse.mcpServerName`。当使用旧版标识标志时，命令会识别需要持久化的确切设置，并在迁移指导中重复所请求的操作以及任何受支持的市场参数。

## <a id="marketplace-choices"></a> Marketplace 选择

OpenClaw 使用 Codex 本身公开的相同应用程序服务器 API。市场字段选择 Codex 应在何处找到 `computer-use`。

| 字段                | 适用场景                                                        | 安装支持                                        |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| 未设置 marketplace 字段 | 希望 Codex app-server 使用其已知的 marketplace。 | 支持从发现的本地或远程 marketplace 安装。    |
| `marketplaceSource`  | 已有一个 Codex marketplace 源，app-server 可以添加该源。         | 支持显式执行 `/codex computer-use install`。       |
| `marketplacePath`    | 已知主机上本地 marketplace 文件的路径。   | 支持显式安装和回合开始时自动安装。 |
| `marketplaceName`    | 希望按名称选择一个已注册的 marketplace。  | 支持从选定的本地或远程 marketplace 安装。    |

新的 Codex 房屋可能需要很短的时间才能在其官方市场上播种。在安装过程中，OpenClaw 轮询 `plugin/list` 最多 `marketplaceDiscoveryTimeoutMs` 毫秒（默认 60 秒）。当 Codex 报告 `features.plugins` 已禁用时，OpenClaw 会跳过此发现等待。

如果多个已知市场包含计算机使用，则 OpenClaw 优先选择 `openai-bundled`，然后是 `openai-curated`，然后是 `local`。 OpenClaw 拒绝未知的模糊匹配，并要求您设置 `marketplaceName` 或 `marketplacePath`。

## <a id="bundled-macos-marketplace"></a> 捆绑的 macOS 市场

当前 ChatGPT 桌面版构建会在此处捆绑 Computer Use；旧版独立 Codex 桌面版构建在 `Codex.app` 下使用相同布局：

```text
/Applications/ChatGPT.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
```

当 `computerUse.autoInstall` 为 true 并且没有注册包含 `computer-use` 的市场时，OpenClaw 在同一 ChatGPT-then-Codex 订单中选择第一个有效的标准桌面捆绑包，并创建此保留的本地包装器：

```text
$CODEX_HOME/.tmp/bundled-marketplaces/openai-bundled
```

请勿将 `/Applications/.../openai-bundled` 根直接添加到保留的 `openai-bundled` 名称下。 Codex 仅从 `CODEX_HOME` 下的托管路径接受该保留市场； OpenClaw 拥有隔离住宅的包装生命周期。

如果你使用的是非标准的 Codex 应用路径，请运行 `/codex computer-use install --source <marketplace-root>` 一次，或者将 `computerUse.marketplacePath` 设置为本地市场文件路径。只有在你持有市场的 JSON 文件路径时才使用 `--marketplace-path`，不要使用捆绑的市场根目录。

### <a id="shared-plugin-cache"></a> 共享插件缓存

默认的 `pluginCacheMode: "independent"` 使每个 Codex 主目录及其插件缓存不受管理。设置 `pluginCacheMode: "shared"` 以在应用程序服务器启动之前将捆绑的计算机使用插件复制到活动 Codex 主目录的可发现插件缓存中。即使捆绑的源代码是符号链接的，缓存的版本也是一个真实的目录，并且在同一桌面生成中重复启动会留下最新的副本不变。共享模式保留旧的缓存版本，因为运行 Codex 的客户端仍然可以引用其版本化插件目录；失败的替换副本还会保留活动缓存。显式 `marketplaceName` 或 `marketplacePath` 配置会禁用此协调，因此 OpenClaw 不会覆盖该选择。

当桌面将旧版计算机使用替换为统一计算机使用时，只有在本机策略允许替换后，自动就绪才会刷新统一共享缓存。当统一插件已安装并在同一版本中启用时，这还会修复过时的生成的启动器路径，而无需重新安装。已经存在的副本没有变化；禁用的旧版插件或旧版 MCP/tool 限制会阻止自动替换和缓存刷新。

## <a id="remote-marketplaces"></a> 远程市场

远程市场支持在 Codex 0.146.1 中引入，并且在 OpenClaw 的固定 Codex 中仍然可用 0.160.1. OpenClaw 将 Codex 返回的不透明远程插件 ID 传递给`plugin/read` 和 `plugin/install`；人类可读的插件名称不是有效的替代品。

`/codex computer-use install` 可以显式安装或重新启用已发现的远程插件。回合开始时的 `autoInstall` 也可以使用已发现的本地或远程市场。不带 `autoInstall` 的状态检查和回合不会安装插件或修改 Codex 配置。

## <a id="configuration-reference"></a> 配置参考

| 字段                           | 默认值        | 含义                                                                        |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `enabled`                       | 推断       | 要求使用 Computer Use。当设置了其他 Computer Use 字段时，默认为 true。 |
| `autoInstall`                   | 错误的          | 在回合开始时配置原生客户端，并安装或重新启用插件。 |
| `marketplaceDiscoveryTimeoutMs` | 60000          | 安装等待 Codex app-server 发现市场所需的最长时间。             |
| `liveTestTimeoutMs`             | 60000          | 临时就绪线程及其清理请求的超时时间。           |
| `toolCallTimeoutMs`             | 60000          | 功能匹配的计算机使用准备工具调用超时。           |
| `healthCheckEnabled`            | 错误的          | 当拥有的应用程序服务器客户端处于活动状态时，定期运行准备情况检查。    |
| `healthCheckIntervalMinutes`    | 60             | 检查节奏；可接受的值为 30、60、120 或 240 分钟。                |
| `pluginCacheMode`               | `independent`  | 使用 `shared` 从捆绑的桌面插件刷新 Codex-home 缓存。  |
| `strictReadiness`               | 错误的          | 在启动时运行实时检查，如果失败则停止启动。                      |
| `autoRepair`                    | 错误的          | 重新加载 Codex- 拥有的 MCP 运行时并重试失败的检查一次。              |
| `marketplaceSource`             | 未设置          | 传递给 Codex app-server `marketplace/add` 的源字符串。                    |
| `marketplacePath`               | 未设置          | 包含该插件的本地 Codex 市场文件路径。                       |
| `marketplaceName`               | 未设置          | 要选择的已注册 Codex 市场名称。                                   |
| `pluginName`                    | `computer-use` | Codex 市场插件名称。                                                 |
| `mcpServerName`                 | `computer-use` | 已安装插件公开的 MCP 服务器名称。                               |

回合开始时的自动安装会有意拒绝已配置的 `marketplaceSource` 值。添加新源是一项显式设置操作，因此请使用 `/codex computer-use install --source <marketplace-source>` 执行一次，然后让 `autoInstall` 处理后续从已发现的本地或远程市场中重新启用插件的操作。 回合开始时的自动安装可以使用已配置的 `marketplacePath`，因为那已经是主机上的本地路径。

每个字段也都支持环境变量覆盖，在对应配置键未设置时会进行检查：

| 字段                           | 环境变量                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `enabled`                       | `OPENCLAW_CODEX_COMPUTER_USE`                                  |
| `autoInstall`                   | `OPENCLAW_CODEX_COMPUTER_USE_AUTO_INSTALL`                     |
| `marketplaceDiscoveryTimeoutMs` | `OPENCLAW_CODEX_COMPUTER_USE_MARKETPLACE_DISCOVERY_TIMEOUT_MS` |
| `liveTestTimeoutMs`             | `OPENCLAW_CODEX_COMPUTER_USE_LIVE_TEST_TIMEOUT_MS`             |
| `toolCallTimeoutMs`             | `OPENCLAW_CODEX_COMPUTER_USE_TOOL_CALL_TIMEOUT_MS`             |
| `healthCheckEnabled`            | `OPENCLAW_CODEX_COMPUTER_USE_HEALTH_CHECK_ENABLED`             |
| `healthCheckIntervalMinutes`    | `OPENCLAW_CODEX_COMPUTER_USE_HEALTH_CHECK_INTERVAL_MINUTES`    |
| `pluginCacheMode`               | `OPENCLAW_CODEX_COMPUTER_USE_PLUGIN_CACHE_MODE`                |
| `strictReadiness`               | `OPENCLAW_CODEX_COMPUTER_USE_STRICT_READINESS`                 |
| `autoRepair`                    | `OPENCLAW_CODEX_COMPUTER_USE_AUTO_REPAIR`                      |
| `marketplaceSource`             | `OPENCLAW_CODEX_COMPUTER_USE_MARKETPLACE_SOURCE`               |
| `marketplacePath`               | `OPENCLAW_CODEX_COMPUTER_USE_MARKETPLACE_PATH`                 |
| `marketplaceName`               | `OPENCLAW_CODEX_COMPUTER_USE_MARKETPLACE_NAME`                 |
| `pluginName`                    | `OPENCLAW_CODEX_COMPUTER_USE_PLUGIN_NAME`                      |
| `mcpServerName`                 | `OPENCLAW_CODEX_COMPUTER_USE_MCP_SERVER_NAME`                  |

## <a id="what-openclaw-checks"></a> OpenClaw 检查内容

OpenClaw 会在内部报告一个稳定的设置原因，并为聊天格式化面向用户的状态：

| 原因                 | 含义                                                                                        | 下一步                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `disabled`             | `computerUse.enabled` 解析为 false。                                                       | 设置 `enabled` 或其他 Computer Use 字段。                                                                   |
| `marketplace_missing`  | 没有可用的匹配市场。                                                         | 配置来源、路径或市场名称。                                                                   |
| `plugin_not_installed` | 市场存在，但插件未安装。                                           | 执行安装或启用 `autoInstall`。                                                                           |
| `plugin_disabled`      | 本机策略禁用插件或其自动替换；安装可能未被选中。 | 运行仅限所有者的安装以进行显式恢复。启用旧版本机插件以恢复自动替换。 |
| `mcp_missing`          | 插件已启用，但 MCP 服务器不可用。                                          | 检查 Codex 计算机使用和 OS 权限。                                                                   |
| `ready`                | 插件和 MCP 工具可用。                                                            | 启动Codex-模式转弯。                                                                                     |
| `check_failed`         | 状态检查期间，Codex 应用服务器请求失败。                                         | 检查应用服务器连接和日志。                                                                        |
| `auto_install_blocked` | 回合开始设置需要添加新的来源。                                               | 先执行显式安装。                                                                                    |

聊天输出包含插件状态、MCP 服务器状态、市场、 可用时的工具，以及失败设置步骤的具体消息。

## <a id="macos-permissions"></a> macOS 权限

此 Codex- 拥有的计算机使用路径在 macOS 上运行，其中 MCP 服务器可能需要本地 OS 权限才能检查或控制应用程序。 （有关 Windows 和 Linux 节点主机上的跨平台桌面控制，请参阅 [cua-computer filler](/nodes/computer-use#windows-and-linux-experimental-direct-sdk)。）如果 OpenClaw 表示已安装计算机使用，但 MCP 服务器不可用，请验证 Codex-side 计算机使用设置第一：

- Codex app-server 正在应当进行桌面控制的同一主机上运行。
- Computer Use 插件已在 Codex 配置中启用。
- `computer-use` MCP 服务器出现在 Codex app-server 的 MCP 状态中。
- macOS 已授予桌面控制应用所需的权限。
- 当前主机会话可以访问正在被控制的桌面。

当 `computerUse.enabled` 为 true 时，如果缺少插件或其 MCP 工具，OpenClaw 将停止并出现错误。仅当 `computerUse.strictReadiness` 为 true 时，实时桌面就绪门才会启动。非严格启动并不能保证桌面桥会应答；实际的工具调用仍然报告失败。

## <a id="troubleshooting"></a> 故障排查

**状态显示未安装。** 运行 `/codex computer-use install`。如果没有发现 marketplace， 请传入 `--source` 或 `--marketplace-path`。

**状态显示已安装但已禁用。** 再次运行 `/codex computer-use install` 。Codex app-server 安装会将插件配置重新写回为已启用。

**发现的远程插件无法安装。** 确认 Codex 报告了 marketplace 和插件的不透明远程 ID，然后运行 `/codex computer-use install`。只能通过显式安装添加新的 `marketplaceSource`；回合开始时的 `autoInstall` 会使用 Codex 已经发现的远程 marketplace。

**状态显示 MCP 服务器不可用。** 重新运行一次安装以便重新加载 MCP 服务器。 如果仍然不可用，请修复 Codex Computer Use 应用、Codex app-server 的 MCP 状态， 或 macOS 权限。

**`computer-use.list_apps` 或 `cua_repl.js` 上的状态或检查超时。** 插件和 MCP 服务器存在，但本地计算机使用桥没有应答。退出或重新启动 Codex 计算机使用，如果需要，重新启动 Codex 桌面，然后在新的 OpenClaw 会话中重试。如果主机之前通过较旧的托管 Codex 应用程序服务器运行计算机使用，请从桌面捆绑市场刷新已安装的插件（使用 `Codex.app` 路径进行独立 Codex 桌面安装）：

```text
/codex computer-use install --source /Applications/ChatGPT.app/Contents/Resources/plugins/openai-bundled
```

**A 计算机使用工具显示 `Native hook relay unavailable`.** Codex-native 工具挂钩无法通过本地网桥或网关回退到达活动的 OpenClaw 中继。使用 `/new` 或 `/reset` 开始新的 OpenClaw 会话。如果它工作一次，然后在以后的工具调用中再次失败，则 `/new` 仅清除当前尝试；重新启动 Codex 应用程序服务器或 OpenClaw 网关，以便删除旧线程和挂钩注册，然后在新会话中重试。

**回合开始时的自动安装拒绝某个源。** 这是有意为之。首先使用显式的 `/codex computer-use install --source <marketplace-source>` 添加该源，之后回合开始时的自动安装就可以使用已发现的本地或远程 marketplace。

## <a id="related"></a> 相关内容

- [Codex 运行环境](/plugins/codex-harness)
- [躲猫桥](/platforms/mac/peekaboo)
- [iOS 应用](/platforms/ios)
