---
summary: "为 Codex 模式的 OpenClaw 代理设置 Codex Computer Use"
title: "Codex Computer Use"
read_when:
  - 你希望 Codex 模式的 OpenClaw 代理使用 Codex Computer Use
  - 你在 Codex Computer Use、PeekabooBridge 和直接使用 cua-driver MCP 之间做选择
  - 你正在为捆绑的 Codex 插件配置 computerUse
  - 你正在排查 /codex computer-use status 或 install
---

Computer Use 是一个面向本地桌面控制的 Codex 原生 MCP 插件。OpenClaw
不会捆绑桌面应用本身，不会自行执行桌面操作，也不会绕过
Codex 权限。捆绑的 `codex` 插件只负责准备 Codex app-server：
它会启用 Codex 插件支持，查找或安装已配置的 Computer Use
插件，检查 `computer-use` MCP 服务器是否可用，然后在 Codex 模式回合期间
让 Codex 自主管理原生 MCP 工具调用。

如果 OpenClaw 已经在使用原生 Codex harness，就使用本页。关于
运行时本身的设置，请参见 [Codex harness](/plugins/codex-harness)。

这与 OpenClaw 内置的 [基于 node 的 computer tool](/nodes/computer-use) 不同。当同一个代理契约应控制一台配对的 Mac，而代理运行在 Gateway 或其他节点上时，请使用内置工具。当 Codex app-server 应当负责本地 MCP 安装、权限以及原生工具调用时，请使用 Codex Computer Use。

## OpenClaw.app and Peekaboo

OpenClaw.app 的 Peekaboo 集成与 Codex Computer Use 是分开的。该
macOS 应用可以托管一个 PeekabooBridge 套接字，这样 `peekaboo` CLI 就可以重用
应用的本地辅助功能和屏幕录制授权，用于 Peekaboo 自身的
自动化工具。该桥接不会安装或代理 Codex Computer Use，而且
Codex Computer Use 也不会通过 PeekabooBridge 套接字调用。

当你希望 OpenClaw.app 作为一个具备权限感知的主机来支持 Peekaboo CLI 自动化时，
请使用 [Peekaboo bridge](/platforms/mac/peekaboo)。当一个
Codex 模式的 OpenClaw 代理应在回合开始前就具备 Codex 原生的 `computer-use`
MCP 插件时，请使用本页。

## iOS 应用

iOS 应用与 Codex Computer Use 是分开的。它不会安装或代理
Codex `computer-use` MCP 服务器，也不是桌面控制后端。
相反，iOS 应用会作为一个 OpenClaw 节点连接，并通过节点命令暴露移动
能力，例如 `canvas.*`、`camera.*`、`screen.*`、
`location.*` 和 `talk.*`。

当你希望代理通过网关驱动 iPhone 节点时，请使用 [iOS](/platforms/ios)。当你希望 Codex 模式代理通过 Codex 的原生 Computer Use 插件控制本地 macOS 桌面时，请使用此页面。

## 直接的 cua-driver MCP

Codex Computer Use 并不是暴露桌面控制的唯一方式。如果你希望
OpenClaw 管理的运行时直接调用 TryCua 的驱动程序，请使用上游的
`cua-driver mcp` 服务器，通过 OpenClaw 的 MCP 注册表来使用，而不是
Codex 专用的 marketplace 流程。

安装 `cua-driver` 后，可以让它输出 OpenClaw 命令：

```bash
cua-driver mcp-config --client openclaw
```

或者直接注册 stdio 服务器：

```bash
openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
```

该路径会保留上游 MCP 工具表面的完整性，包括驱动程序
schema 和结构化的 MCP 响应。当你希望将 CUA 驱动作为普通的 OpenClaw MCP 服务器可用时，
请使用它。当 Codex app-server 应在
Codex 模式轮次中负责插件安装、MCP 重新加载以及原生工具调用时，请使用本页的
Codex Computer Use 设置。

CUA 的驱动程序是 macOS 专用的，并且仍然需要其应用提示的本地 macOS 权限，
例如辅助功能和屏幕录制权限。OpenClaw 不会安装 `cua-driver`，
不会授予这些权限，也不会绕过上游驱动程序的安全模型。

## 快速设置

在 Codex 模式轮次开始前必须可用 Computer Use 时，请设置 `plugins.entries.codex.config.computerUse`。`autoInstall: true` 会启用
Computer Use，并允许 OpenClaw 在回合开始前安装或重新启用它：

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
      model: "openai/gpt-5.6-sol",
    },
  },
}
```

使用此配置时，OpenClaw 会在每个 Codex 模式轮次前检查 Codex app-server。如果缺少 Computer Use，但 Codex app-server 已经发现了可安装的 marketplace，OpenClaw 会请求 Codex app-server 安装或重新启用该插件并重新加载 MCP servers。在 macOS 上，当没有注册匹配的 marketplace 且存在标准桌面应用包时，OpenClaw 还会尝试从 `/Applications/ChatGPT.app/Contents/Resources/plugins/openai-bundled` 注册捆绑的 Codex marketplace，同时保留 `/Applications/Codex.app/Contents/Resources/plugins/openai-bundled` 作为旧版独立安装的回退方案。如果设置仍然无法使 MCP server 可用，则会在 thread 开始前使该轮次失败。

在更改 Computer Use 配置后，如果现有 Codex 线程已经开始，请在受影响的聊天中使用 `/new` 或 `/reset`，然后再进行测试。

在 macOS 上，Computer Use 的受管理启动优先使用桌面应用二进制文件 `/Applications/ChatGPT.app/Contents/Resources/codex`，然后回退到 `/Applications/Codex.app/Contents/Resources/codex`，以兼容旧版独立安装。这也适用于启动自己客户端的一次性 Computer Use 状态和安装命令。这样可以将桌面控制保留在拥有本地 macOS 权限的应用包之下。如果未安装桌面应用，OpenClaw 会回退到安装在插件旁边的受管理 Codex 二进制文件。使用默认隔离 agent home 的普通受管理 Codex 轮次会优先使用该固定包，这样较旧的桌面应用就不会覆盖当前的模型支持。用户作用域的 homes 仍然优先使用桌面应用，因为它们可以加载原生 Computer Use 状态。其有效 Codex 配置启用了 Computer Use 的隔离 agent home 也仍然优先使用桌面应用。显式的 `appServer.command` 配置或 `OPENCLAW_CODEX_APP_SERVER_BIN` 仍然会覆盖此受管理选择。

OpenClaw 会在一个正在运行的 Gateway 中串行化原生 Codex 配置读取和 Computer Use 安装。单独的 Codex 进程或另一个 Gateway 不在该保护范围内。在 Gateway 之外更改原生 Codex 插件配置后，请重启 Gateway 并启动新的聊天，再依赖新的选择。

## 命令

在任何可用 `codex` 插件命令界面的聊天界面中使用 `/codex computer-use` 命令。  
这些是 OpenClaw 聊天/运行时命令，而不是 `openclaw codex ...` CLI 子命令：

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` 是默认操作，且为只读：它不会添加市场源、安装插件或启用 Codex 插件支持。若配置未将 Computer Use 纳入，即使执行过一次性安装命令，`status` 也可能报告为已禁用。

`install` 会启用 Codex app-server 插件支持，可选择性地添加已配置的市场源，通过 Codex app-server 安装或重新启用已配置的插件，重新加载 MCP 服务器，并验证 MCP 服务器是否暴露工具。由于安装会更改受信任的主机资源，只有所有者或 `operator.admin` Gateway 客户端才能运行 `install`。其他已授权的发送者仍可继续使用只读的 `status` 命令，包括带覆盖参数的情况。

较早版本支持一次性的 `--plugin`、`--server` 和 `--mcp-server`  
标识覆盖。请改为持久化配置 `computerUse.pluginName` 和  
`computerUse.mcpServerName`。当使用旧版标识标志时，命令会识别需要持久化的确切设置，并在迁移指导中重复所请求的操作以及任何受支持的市场参数。

## Marketplace 选择

OpenClaw 使用与 Codex 本身暴露的相同 app-server API。marketplace 字段
用于选择 Codex 应该在哪里查找 `computer-use`。

| 字段                  | 适用场景                                                      | 安装支持                                               |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| 无 marketplace 字段    | 你希望 Codex app-server 使用它已经知道的 marketplaces。      | 是的，当 app-server 返回本地 marketplace 时。          |
| `marketplaceSource`   | 你有一个 Codex marketplace 源，app-server 可以添加。         | 是的，适用于显式 `/codex computer-use install`。       |
| `marketplacePath`     | 你已经知道主机上的本地 marketplace 文件路径。                | 是的，适用于显式安装和回合开始自动安装。                |
| `marketplaceName`     | 你想按名称选择一个已注册的 marketplace。                     | 仅当所选 marketplace 具有本地路径时。                   |

新的 Codex home 可能需要片刻时间来填充其官方 marketplaces。在安装期间，OpenClaw 会轮询 `plugin/list`，最长可达
`marketplaceDiscoveryTimeoutMs` 毫秒（默认 60 秒）。

如果多个已知 marketplace 包含 Computer Use，OpenClaw 会优先选择
`openai-bundled`，然后是 `openai-curated`，然后是 `local`。未知且有歧义的
匹配会直接失败，并要求你设置 `marketplaceName` 或
`marketplacePath`。

## 捆绑的 macOS marketplace

当前 ChatGPT 桌面版构建会在此处捆绑 Computer Use；旧版独立  
Codex 桌面版构建在 `Codex.app` 下使用相同布局：

```text
/Applications/ChatGPT.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
```

当 `computerUse.autoInstall` 为 true 且未注册包含  
`computer-use` 的 marketplace 时，OpenClaw 会尝试添加存在的第一个标准  
捆绑 marketplace 根目录：

```text
/Applications/ChatGPT.app/Contents/Resources/plugins/openai-bundled
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

你也可以从 shell 中通过 Codex 显式注册它：

```bash
codex plugin marketplace add /Applications/ChatGPT.app/Contents/Resources/plugins/openai-bundled
```

如果你使用的是非标准的 Codex 应用路径，请运行 `/codex computer-use install
--source <marketplace-root>` 一次，或者将 `computerUse.marketplacePath` 设置为
本地 marketplace 文件路径。只有在你持有 marketplace 的 JSON 文件路径时才使用
`--marketplace-path`，不要使用捆绑的 marketplace 根目录。

### 共享插件缓存

默认的 `pluginCacheMode: "independent"` 会让每个 Codex home 及其  
插件缓存处于未管理状态。将 `pluginCacheMode` 设置为 `"shared"`，可在 app-server 启动前将捆绑的 Computer Use 插件复制到当前 Codex home 可发现的插件缓存中。共享模式会保留较旧的缓存版本，因为正在运行的 Codex 客户端仍可能引用其带版本号的插件目录；如果替换复制失败，也会保留当前缓存。显式的  
`marketplaceName` 或 `marketplacePath` 配置会禁用此  
协调过程，因此 OpenClaw 不会覆盖该选择。

## 远程目录限制

Codex app-server 可以列出并读取仅远程的目录条目，但它
目前不支持远程 `plugin/install`。这意味着 `marketplaceName`
可以为状态检查选择仅远程的市场，但安装和
重新启用仍然需要通过 `marketplaceSource` 或
`marketplacePath` 使用本地市场。

如果状态显示该插件在远程 Codex 市场中可用，但
不支持远程安装，请使用本地源或路径运行安装：

```text
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
```

## 配置参考

| 字段                          | 默认值         | 含义                                                                           |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `enabled`                     | 推断得出       | 需要 Computer Use。当设置了其他 Computer Use 字段时，默认值为 true。          |
| `autoInstall`                  | false          | 在回合开始时，从已发现的 marketplace 中安装或重新启用。                        |
| `marketplaceDiscoveryTimeoutMs` | 60000          | 安装等待 Codex app-server 发现 marketplace 的时长。                            |
| `liveTestTimeoutMs`            | 60000          | 临时就绪线程及其清理请求的超时时间。                                            |
| `toolCallTimeoutMs`            | 60000          | Computer Use `list_apps` 就绪工具调用的超时时间。                              |
| `healthCheckEnabled`           | false          | 当所属的 app-server 客户端处于活动状态时，定期运行就绪探测。                    |
| `healthCheckIntervalMinutes`   | 60             | 探测频率；接受的值为 30、60、120 或 240 分钟。                                  |
| `pluginCacheMode`              | `independent`  | 使用 `shared` 可从内置的桌面插件刷新 Codex-home 缓存。                          |
| `strictReadiness`              | false          | 如果实时探测失败则停止启动，而不是带着警告继续。                                 |
| `autoRepair`                   | false          | 杀死陈旧的、作用域内的 Computer Use MCP 子进程，并在失败探测后重试一次。       |
| `marketplaceSource`             | 未设置         | 传递给 Codex app-server `marketplace/add` 的源字符串。                         |
| `marketplacePath`              | 未设置         | 包含该插件的本地 Codex marketplace 文件路径。                                   |
| `marketplaceName`              | 未设置         | 要选择的已注册 Codex marketplace 名称。                                         |
| `pluginName`                   | `computer-use` | Codex marketplace 插件名称。                                                   |
| `mcpServerName`                | `computer-use` | 已安装插件暴露的 MCP server 名称。                                              |

回合开始时的自动安装会刻意拒绝已配置的 `marketplaceSource`
值。新增源是一个显式的设置操作，因此请先运行一次
`/codex computer-use install --source <marketplace-source>`，然后再让
`autoInstall` 负责将来从已发现的本地 marketplaces 中重新启用。
回合开始时的自动安装可以使用已配置的 `marketplacePath`，因为它
本身就是主机上的本地路径。

每个字段也都支持环境变量覆盖，在对应配置键未设置时会进行检查：

| 字段                          | 环境变量                                                       |
| ----------------------------- | -------------------------------------------------------------- |
| `enabled`                    | `OPENCLAW_CODEX_COMPUTER_USE`                                  |
| `autoInstall`                | `OPENCLAW_CODEX_COMPUTER_USE_AUTO_INSTALL`                     |
| `marketplaceDiscoveryTimeoutMs` | `OPENCLAW_CODEX_COMPUTER_USE_MARKETPLACE_DISCOVERY_TIMEOUT_MS` |
| `liveTestTimeoutMs`          | `OPENCLAW_CODEX_COMPUTER_USE_LIVE_TEST_TIMEOUT_MS`             |
| `toolCallTimeoutMs`          | `OPENCLAW_CODEX_COMPUTER_USE_TOOL_CALL_TIMEOUT_MS`             |
| `healthCheckEnabled`         | `OPENCLAW_CODEX_COMPUTER_USE_HEALTH_CHECK_ENABLED`             |
| `healthCheckIntervalMinutes` | `OPENCLAW_CODEX_COMPUTER_USE_HEALTH_CHECK_INTERVAL_MINUTES`    |
| `pluginCacheMode`            | `OPENCLAW_CODEX_COMPUTER_USE_PLUGIN_CACHE_MODE`                |
| `strictReadiness`            | `OPENCLAW_CODEX_COMPUTER_USE_STRICT_READINESS`                 |
| `autoRepair`                 | `OPENCLAW_CODEX_COMPUTER_USE_AUTO_REPAIR`                      |
| `marketplaceSource`          | `OPENCLAW_CODEX_COMPUTER_USE_MARKETPLACE_SOURCE`               |
| `marketplacePath`            | `OPENCLAW_CODEX_COMPUTER_USE_MARKETPLACE_PATH`                 |
| `marketplaceName`            | `OPENCLAW_CODEX_COMPUTER_USE_MARKETPLACE_NAME`                 |
| `pluginName`                 | `OPENCLAW_CODEX_COMPUTER_USE_PLUGIN_NAME`                      |
| `mcpServerName`              | `OPENCLAW_CODEX_COMPUTER_USE_MCP_SERVER_NAME`                  |

## OpenClaw 检查内容

OpenClaw 会在内部报告一个稳定的设置原因，并为聊天格式化
面向用户的状态：

| 原因                         | 含义                                                   | 下一步                                       |
| ---------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `disabled`                   | `computerUse.enabled` 解析为 false。                  | 设置 `enabled` 或其他 Computer Use 字段。     |
| `marketplace_missing`        | 没有可用的匹配 marketplace。                            | 配置 source、path 或 marketplace 名称。      |
| `plugin_not_installed`       | marketplace 存在，但插件未安装。                       | 运行 install 或启用 `autoInstall`。          |
| `plugin_disabled`           | 插件已安装，但在 Codex 配置中被禁用。                  | 运行 install 以重新启用它。                  |
| `remote_install_unsupported` | 所选 marketplace 仅支持远程。                           | 使用 `marketplaceSource` 或 `marketplacePath`。 |
| `mcp_missing`                | 插件已启用，但 MCP 服务器不可用。                       | 检查 Codex Computer Use 和 OS 权限。         |
| `ready`                      | 插件和 MCP 工具均可用。                                 | 开始 Codex 模式轮次。                        |
| `check_failed`               | 状态检查期间 Codex app-server 请求失败。               | 检查 app-server 连通性和日志。               |
| `auto_install_blocked`       | 轮次开始时的设置需要添加一个新 source。                | 先运行显式安装。                              |

聊天输出包含插件状态、MCP 服务器状态、marketplace、
可用时的工具，以及失败设置步骤的具体消息。

## macOS 权限

Computer Use 是 macOS 特有的。Codex 拥有的 MCP 服务器在检查或控制应用之前，可能需要本地操作系统权限。如果 OpenClaw 表示 Computer Use 已安装，但 MCP 服务器不可用，请先验证 Codex 侧的 Computer Use 设置：

- Codex app-server 正在应当进行桌面控制的同一主机上运行。
- Computer Use 插件已在 Codex 配置中启用。
- `computer-use` MCP 服务器出现在 Codex app-server 的 MCP 状态中。
- macOS 已授予桌面控制应用所需的权限。
- 当前主机会话可以访问正在被控制的桌面。

当 `computerUse.enabled` 为 true 时，OpenClaw 会刻意采用失败关闭策略。
Codex 模式轮次不应在缺少配置所要求的原生桌面工具时静默继续。

## 故障排查

**状态显示未安装。** 运行 `/codex computer-use install`。如果没有发现 marketplace，
请传入 `--source` 或 `--marketplace-path`。

**状态显示已安装但已禁用。** 再次运行 `/codex computer-use install`
。Codex app-server 安装会将插件配置重新写回为已启用。

**状态显示不支持远程安装。** 使用本地 marketplace
源或路径。仅远程目录中的条目可以被检查，但不能通过当前 app-server API 进行安装。

**状态显示 MCP 服务器不可用。** 重新运行一次安装以便重新加载 MCP 服务器。
如果仍然不可用，请修复 Codex Computer Use 应用、Codex app-server 的 MCP 状态，
或 macOS 权限。

**状态或探测在 `computer-use.list_apps` 上超时。** 插件和
MCP 服务器都已存在，但本地 Computer Use bridge 没有响应。
退出或重启 Codex Computer Use，必要时重新启动 Codex Desktop，然后
在一个新的 OpenClaw 会话中重试。如果主机之前通过较旧的受管理 Codex app-server 运行过 Computer Use，
请从桌面捆绑的 marketplace 刷新已安装的插件（对于独立的 Codex desktop 安装，请使用 `Codex.app` 路径）：

```text
/codex computer-use install --source /Applications/ChatGPT.app/Contents/Resources/plugins/openai-bundled
```

**Computer Use 工具提示 `Native hook relay unavailable`。**  
Codex 原生工具钩子无法通过本地桥或 Gateway 回退连接到活动的 OpenClaw relay。
使用 `/new` 或 `/reset` 开启新的 OpenClaw 会话。如果它第一次可用、随后在后续工具调用中再次失败，
则 `/new` 只是在清除当前尝试；请重启 Codex app-server 或
OpenClaw Gateway，以便清除旧线程和钩子注册，然后
在新的会话中重试。

**轮次开始时的自动安装拒绝某个 source。**这是预期行为。先使用明确的
`/codex computer-use install --source
<marketplace-source>` 添加该 source，然后未来轮次开始时的自动安装就可以使用
已发现的本地 marketplace。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [Peekaboo bridge](/platforms/mac/peekaboo)
- [iOS 应用](/platforms/ios)
