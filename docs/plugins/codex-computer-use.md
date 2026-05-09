---
summary: "为 Codex 模式的 OpenClaw 代理设置 Codex Computer Use"
title: "Codex Computer Use"
read_when:
  - 你希望 Codex 模式的 OpenClaw 代理使用 Codex Computer Use
  - 你正在在 Codex Computer Use、PeekabooBridge 和直接的 cua-driver MCP 之间做选择
  - 你正在在 Codex Computer Use 和直接的 cua-driver MCP 方案之间做选择
  - 你正在为捆绑的 Codex 插件配置 computerUse
  - 你正在排查 /codex computer-use status 或 install
---

Computer Use 是一个原生于 Codex 的 MCP 插件，用于本地桌面控制。OpenClaw
不会捆绑桌面应用、不会自行执行桌面操作，也不会绕过
Codex 权限。捆绑的 `codex` 插件只负责准备 Codex app-server：
它启用 Codex 插件支持，查找或安装已配置的 Codex
Computer Use 插件，检查 `computer-use` MCP 服务器是否可用，然后
在 Codex 模式轮次期间让 Codex 自主管理原生 MCP 工具调用。

如果 OpenClaw 已经在使用原生 Codex harness，就使用本页。关于
运行时本身的设置，请参见 [Codex harness](/plugins/codex-harness)。

## OpenClaw.app 和 Peekaboo

OpenClaw.app 的 Peekaboo 集成与 Codex Computer Use 是分开的。该
macOS 应用可以托管一个 PeekabooBridge 套接字，这样 `peekaboo` CLI 就可以重用
应用的本地辅助功能和屏幕录制授权，用于 Peekaboo 自身的
自动化工具。该桥接不会安装或代理 Codex Computer Use，而且
Codex Computer Use 也不会通过 PeekabooBridge 套接字调用。

当你希望 OpenClaw.app 作为一个具备权限感知的主机来支持 Peekaboo CLI 自动化时，
请使用 [Peekaboo bridge](/platforms/mac/peekaboo)。当一个
Codex 模式的 OpenClaw 代理应在回合开始前就具备 Codex 原生的 `computer-use`
MCP 插件时，请使用本页。

## iOS app

iOS app 与 Codex Computer Use 是分开的。它不会安装或代理
Codex `computer-use` MCP 服务器，也不是桌面控制后端。
相反，iOS app 会作为一个 OpenClaw 节点连接，并通过节点命令暴露移动
能力，例如 `canvas.*`、`camera.*`、`screen.*`、
`location.*` 和 `talk.*`。

当你希望代理通过网关驱动一台 iPhone 节点时，请使用 [iOS](/platforms/ios)。
当一个 Codex 模式的代理应通过 Codex 原生的 Computer Use 插件控制本地
macOS 桌面时，请使用本页。

## 直接的 cua-driver MCP

Codex Computer Use 并不是暴露桌面控制的唯一方式。如果你希望
OpenClaw 管理的运行时直接调用 TryCua 的驱动程序，请使用上游的
`cua-driver mcp` 服务器，通过 OpenClaw 的 MCP 注册表来使用，而不是
Codex 专用的 marketplace 流程。

安装 `cua-driver` 后，可以让它输出 OpenClaw 命令：

```bash
cua-driver mcp-config --client openclaw
```

或者你也可以自行注册 stdio 服务器：

```bash
openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
```

该路径会保留上游 MCP 工具表面的完整性，包括驱动程序
schema 和结构化的 MCP 响应。当你希望将 CUA 驱动作为普通的 OpenClaw MCP 服务器可用时，
请使用它。当 Codex app-server 应在
Codex 模式轮次中负责插件安装、MCP 重新加载以及原生工具调用时，请使用本页的
Codex Computer Use 设置。

CUA 的驱动程序是 macOS 专用的，并且仍然需要其应用提示时请求的本地 macOS 权限，
例如辅助功能和屏幕录制。OpenClaw
不会安装 `cua-driver`、授予这些权限，也不会绕过上游
驱动程序的安全模型。

## 快速设置

当 Codex 模式轮次在线程开始前必须可用 Computer Use 时，请设置
`plugins.entries.codex.config.computerUse`：

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
      model: "openai/gpt-5.5",
    },
  },
}
```

使用此配置时，OpenClaw 会在每次 Codex 模式轮次前检查 Codex app-server。
如果 Computer Use 缺失，但 Codex app-server 已经发现了一个可安装的
marketplace，OpenClaw 会请求 Codex app-server 安装或重新启用
该插件并重新加载 MCP 服务器。在 macOS 上，当没有注册匹配的 marketplace
且标准 Codex 应用包存在时，OpenClaw 还会尝试在
失败前注册捆绑的 Codex marketplace：
`/Applications/Codex.app/Contents/Resources/plugins/openai-bundled`。如果设置
仍然无法让 MCP 服务器可用，则会在线程开始前使该轮次失败。

更改 Computer Use 配置后，请在受影响的聊天中使用 `/new` 或 `/reset`
，然后再测试，因为现有的 Codex 线程可能已经开始。

## 命令

在任何可用 `codex`
插件命令面的聊天界面中使用 `/codex computer-use` 命令。这些是 OpenClaw 的聊天/运行时命令，
不是 `openclaw codex ...` CLI 子命令：

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` 只读。它不会添加 marketplace 源、安装插件，或
启用 Codex 插件支持。

`install` 会启用 Codex app-server 插件支持，可选地添加一个配置的
marketplace 源，通过 Codex app-server 安装或重新启用配置的插件，重新加载 MCP 服务器，并
验证 MCP 服务器是否暴露工具。

## Marketplace 选择

OpenClaw 使用与 Codex 本身暴露的相同 app-server API。marketplace 字段
用于选择 Codex 应该在哪里查找 `computer-use`。

| 字段                  | 适用场景                                                      | 安装支持                                               |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| 无 marketplace 字段    | 你希望 Codex app-server 使用它已经知道的 marketplaces。      | 是的，当 app-server 返回本地 marketplace 时。          |
| `marketplaceSource`   | 你有一个 Codex marketplace 源，app-server 可以添加。         | 是的，适用于显式 `/codex computer-use install`。       |
| `marketplacePath`     | 你已经知道主机上的本地 marketplace 文件路径。                | 是的，适用于显式安装和回合开始自动安装。                |
| `marketplaceName`     | 你想按名称选择一个已注册的 marketplace。                     | 仅当所选 marketplace 具有本地路径时。                   |

新创建的 Codex home 可能需要一点时间来初始化其官方 marketplaces。
在安装期间，OpenClaw 会轮询 `plugin/list`，最长可达
`marketplaceDiscoveryTimeoutMs` 毫秒。默认值是 60 秒。

如果多个已知 marketplace 都包含 Computer Use，OpenClaw 会优先选择
`openai-bundled`，然后是 `openai-curated`，再然后是 `local`。未知的歧义匹配
会安全失败，并要求你设置 `marketplaceName` 或 `marketplacePath`。

## 捆绑的 macOS marketplace

较新的 Codex 桌面构建会在此捆绑 Computer Use：

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
```

当 `computerUse.autoInstall` 为 true 且尚未注册任何包含
`computer-use` 的 marketplace 时，OpenClaw 会尝试自动添加标准的捆绑
marketplace 根目录：

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

你也可以从 shell 中通过 Codex 显式注册它：

```bash
codex plugin marketplace add /Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

如果你使用的是非标准的 Codex 应用路径，请将 `computerUse.marketplacePath` 设置为
本地 marketplace 文件路径，或者先运行一次 `/codex computer-use install --source
<marketplace-source>`。

## 远程目录限制

Codex app-server 可以列出并读取仅远程的目录条目，但目前
不支持远程 `plugin/install`。这意味着 `marketplaceName` 可以
选择一个仅远程的 marketplace 用于状态检查，但安装和重新启用
仍然需要通过 `marketplaceSource` 或 `marketplacePath` 提供本地 marketplace。

如果状态显示该插件在远程 Codex marketplace 中可用，但不支持远程
安装，请使用本地源或路径执行安装：

```text
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
```

## 配置参考

| 字段                           | 默认值         | 含义                                                                           |
| ------------------------------ | -------------- | ------------------------------------------------------------------------------ |
| `enabled`                      | 推断得出       | 要求使用 Computer Use。当设置了其他 Computer Use 字段时，默认值为 true。        |
| `autoInstall`                  | false          | 在回合开始时从已发现的 marketplaces 安装或重新启用。                           |
| `marketplaceDiscoveryTimeoutMs` | 60000          | 安装在等待 Codex app-server 发现 marketplace 时的最长时间。                    |
| `marketplaceSource`            | 未设置         | 传递给 Codex app-server `marketplace/add` 的源字符串。                         |
| `marketplacePath`              | 未设置         | 包含该插件的本地 Codex marketplace 文件路径。                                  |
| `marketplaceName`              | 未设置         | 要选择的已注册 Codex marketplace 名称。                                        |
| `pluginName`                   | `computer-use` | Codex marketplace 插件名称。                                                    |
| `mcpServerName`                | `computer-use` | 已安装插件暴露的 MCP 服务器名称。                                              |

回合开始自动安装会刻意拒绝已配置的 `marketplaceSource`
值。添加新的源是一个显式的设置操作，因此请先使用
`/codex computer-use install --source <marketplace-source>` 一次，然后让
`autoInstall` 处理未来从已发现的本地 marketplaces 重新启用。
回合开始自动安装可以使用已配置的 `marketplacePath`，因为那已经是
主机上的本地路径。

## OpenClaw 检查内容

OpenClaw 内部会报告一个稳定的设置原因，并为聊天格式化面向用户的
状态：

| 原因                         | 含义                                                   | 下一步                                       |
| ---------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `disabled`                   | `computerUse.enabled` 解析为 false。                  | 设置 `enabled` 或其他 Computer Use 字段。     |
| `marketplace_missing`        | 没有可用的匹配 marketplace。                            | 配置 source、path 或 marketplace 名称。      |
| `plugin_not_installed`       | marketplace 存在，但插件未安装。                       | 运行 install 或启用 `autoInstall`。          |
| `plugin_disabled`            | 插件已安装，但在 Codex 配置中被禁用。                  | 运行 install 以重新启用它。                  |
| `remote_install_unsupported` | 所选 marketplace 仅支持远程。                           | 使用 `marketplaceSource` 或 `marketplacePath`。 |
| `mcp_missing`                | 插件已启用，但 MCP 服务器不可用。                       | 检查 Codex Computer Use 和 OS 权限。         |
| `ready`                      | 插件和 MCP 工具均可用。                                 | 开始 Codex 模式轮次。                        |
| `check_failed`               | 状态检查期间 Codex app-server 请求失败。               | 检查 app-server 连通性和日志。               |
| `auto_install_blocked`       | 轮次开始时的设置需要添加一个新 source。                | 先运行显式安装。                              |

聊天输出会包含插件状态、MCP 服务器状态、marketplace、可用工具，
以及导致失败的设置步骤的具体消息。

## macOS 权限

Computer Use 是 macOS 特有的。Codex 拥有的 MCP 服务器在检查或控制应用之前，
可能需要本地 OS 权限。如果 OpenClaw 提示 Computer Use 已安装但 MCP 服务器
不可用，请先验证 Codex 侧的 Computer Use 设置：

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

**状态显示已安装但已禁用。** 再次运行 `/codex computer-use install`。
Codex app-server 安装会将插件配置写回为启用状态。

**状态显示不支持远程安装。** 使用本地 marketplace source 或 path。远程专用的
目录条目可以被检查，但不能通过当前 app-server API 安装。

**状态显示 MCP 服务器不可用。** 重新运行一次安装以便重新加载 MCP 服务器。
如果仍然不可用，请修复 Codex Computer Use 应用、Codex app-server 的 MCP 状态，
或 macOS 权限。

**状态或探测在 `computer-use.list_apps` 上超时。** 插件和 MCP 服务器都存在，
但本地 Computer Use 桥没有响应。退出或重启 Codex Computer Use，必要时重新启动
Codex Desktop，然后在一个新的 OpenClaw 会话中重试。

**A Computer Use tool says `Native hook relay unavailable`.** Codex 原生的
工具钩子无法通过本地桥接或
Gateway 回退连接到一个活动的 OpenClaw 中继。请使用 `/new` 或 `/reset` 开始一个新的 OpenClaw 会话。如果它
仍然反复出现，请重启网关，以便旧的 app-server 线程和钩子
注册被清除，然后重试。

**回合开始自动安装拒绝某个 source。** 这是预期行为。先使用显式的
`/codex computer-use install --source <marketplace-source>`
添加 source，然后未来的回合开始自动安装就可以使用已发现的本地
marketplace。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [Peekaboo bridge](/platforms/mac/peekaboo)
- [iOS 应用](/platforms/ios)
