---
summary: "为 Codex-mode OpenClaw 代理设置 Codex Computer Use"
title: "Codex Computer Use"
read_when:
  - 你希望 Codex-mode OpenClaw 代理使用 Codex Computer Use
  - 你正在为捆绑的 Codex 插件配置 computerUse
  - 你正在排查 /codex computer-use status 或 install
---

Computer Use 是一个用于本地桌面控制的 Codex 原生 MCP 插件。OpenClaw
不会捆绑桌面应用，也不会自行执行桌面操作，或绕过
Codex 权限。捆绑的 `codex` 插件只会准备 Codex app-server：
它会启用 Codex 插件支持，查找或安装已配置的 Codex
Computer Use 插件，检查 `computer-use` MCP 服务器是否可用，然后
在 Codex-mode 回合期间让 Codex 自主处理原生 MCP 工具调用。

当 OpenClaw 已经在使用原生 Codex harness 时，请使用本页面。关于
运行时本身的设置，请参见 [Codex harness](/plugins/codex-harness)。

## 快速设置

当 Codex-mode 回合在线程开始前必须可用 Computer Use 时，请设置 `plugins.entries.codex.config.computerUse`：

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
      embeddedHarness: {
        runtime: "codex",
      },
    },
  },
}
```

使用此配置时，OpenClaw 会在每次 Codex-mode 回合前检查 Codex app-server。
如果 Computer Use 缺失，但 Codex app-server 已经发现了一个可安装的
marketplace，OpenClaw 会请求 Codex app-server 安装或重新启用
该插件并重新加载 MCP 服务器。如果设置仍然无法使 MCP 服务器可用，
则该回合会在线程开始前失败。

## 命令

请在任何可使用 `codex`
插件命令界面的聊天界面中使用 `/codex computer-use` 命令：

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` 仅用于读取。它不会添加 marketplace 源、安装插件，或
启用 Codex 插件支持。

`install` 会启用 Codex app-server 插件支持，可选地添加一个配置好的
marketplace 源，通过 Codex app-server 安装或重新启用已配置的插件，
重新加载 MCP 服务器，并验证 MCP 服务器是否暴露工具。

## Marketplace 选择

OpenClaw 使用与 Codex 本身公开的相同 app-server API。Marketplace 字段
用于选择 Codex 应该在哪里查找 `computer-use`。

| 字段                | 适用场景                                                      | 安装支持                                          |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| 无 marketplace 字段 | 你希望 Codex app-server 使用它已知的 marketplace。           | 可以，只要 app-server 返回本地 marketplace。      |
| `marketplaceSource` | 你有一个 Codex marketplace source，app-server 可以添加。      | 可以，用于显式 `/codex computer-use install`。    |
| `marketplacePath`   | 你已经知道主机上的本地 marketplace 文件路径。                | 可以，用于显式安装和回合开始自动安装。            |
| `marketplaceName`   | 你希望按名称选择一个已注册的 marketplace。                  | 只有当所选 marketplace 具有本地路径时才可以。      |

新的 Codex 主目录可能需要一点时间来初始化其官方 marketplaces。
在安装期间，OpenClaw 会轮询 `plugin/list`，最长等待
`marketplaceDiscoveryTimeoutMs` 毫秒。默认值为 60 秒。

如果多个已知 marketplace 包含 Computer Use，OpenClaw 会优先选择
`openai-bundled`，然后是 `openai-curated`，最后是 `local`。未知的歧义匹配
会失败并要求你设置 `marketplaceName` 或 `marketplacePath`。

## 远程目录限制

Codex app-server 可以列出并读取仅远程存在的目录项，但它目前不支持远程 `plugin/install`。这意味着 `marketplaceName` 可以
为状态检查选择一个仅远程的 marketplace，但安装和重新启用
仍然需要通过 `marketplaceSource` 或 `marketplacePath` 提供本地 marketplace。

如果状态显示该插件在远程 Codex marketplace 中可用，但不支持远程
安装，请使用本地 source 或 path 运行安装：

```text
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
```

## 配置参考

| 字段                           | 默认值         | 含义                                                                           |
| ------------------------------ | -------------- | ------------------------------------------------------------------------------ |
| `enabled`                      | 推断           | 要求启用 Computer Use。当设置了其他 Computer Use 字段时，默认值为 true。      |
| `autoInstall`                  | false          | 在回合开始时，从已发现的 marketplace 安装或重新启用。                          |
| `marketplaceDiscoveryTimeoutMs` | 60000          | 安装等待 Codex app-server 发现 marketplace 的时长。                             |
| `marketplaceSource`            | 未设置         | 传递给 Codex app-server `marketplace/add` 的 source 字符串。                   |
| `marketplacePath`              | 未设置         | 包含该插件的本地 Codex marketplace 文件路径。                                   |
| `marketplaceName`              | 未设置         | 要选择的已注册 Codex marketplace 名称。                                        |
| `pluginName`                   | `computer-use` | Codex marketplace 插件名称。                                                   |
| `mcpServerName`                | `computer-use` | 已安装插件暴露的 MCP 服务器名称。                                              |

回合开始时的自动安装会刻意拒绝已配置的 `marketplaceSource`
值。添加新 source 是一个显式的设置操作，因此请先使用
`/codex computer-use install --source <marketplace-source>` 一次，然后让
`autoInstall` 处理未来从已发现的本地 marketplace 重新启用。

## OpenClaw 会检查什么

OpenClaw 会在内部报告稳定的设置原因，并将面向用户的
状态格式化到聊天中：

| 原因                         | 含义                                                 | 下一步                                        |
| ---------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| `disabled`                   | `computerUse.enabled` 解析为 false。                 | 设置 `enabled` 或其他 Computer Use 字段。     |
| `marketplace_missing`        | 没有可用的匹配 marketplace。                         | 配置 source、path 或 marketplace 名称。       |
| `plugin_not_installed`       | marketplace 存在，但插件未安装。                     | 运行安装或启用 `autoInstall`。                |
| `plugin_disabled`            | 插件已安装，但在 Codex 配置中被禁用。               | 运行安装以重新启用它。                         |
| `remote_install_unsupported` | 所选 marketplace 仅为远程。                          | 使用 `marketplaceSource` 或 `marketplacePath`。 |
| `mcp_missing`                | 插件已启用，但 MCP 服务器不可用。                   | 检查 Codex Computer Use 和 OS 权限。          |
| `ready`                      | 插件和 MCP 工具可用。                                | 开始 Codex-mode 回合。                         |
| `check_failed`               | 状态检查期间 Codex app-server 请求失败。            | 检查 app-server 连通性和日志。                |
| `auto_install_blocked`       | 回合开始设置需要添加一个新的 source。               | 先运行显式安装。                               |

聊天输出会包含插件状态、MCP 服务器状态、marketplace、可用时的工具，
以及失败设置步骤的具体消息。

## macOS 权限

Computer Use 仅适用于 macOS。由 Codex 托管的 MCP 服务器在检查或控制应用之前，
可能需要本地 OS 权限。如果 OpenClaw 表示 Computer Use
已安装但 MCP 服务器不可用，请先验证 Codex 侧的 Computer Use 设置：

- Codex app-server 正在与桌面控制应发生在同一台主机上运行。
- Computer Use 插件已在 Codex 配置中启用。
- `computer-use` MCP 服务器出现在 Codex app-server MCP 状态中。
- macOS 已授予桌面控制应用所需的权限。
- 当前主机会话可以访问被控制的桌面。

当 `computerUse.enabled` 为 true 时，OpenClaw 会刻意失败关闭。Codex-mode 回合
不应在没有配置所需的原生桌面工具时静默继续。

## 故障排查

**状态显示未安装。** 运行 `/codex computer-use install`。如果
未发现 marketplace，请传入 `--source` 或 `--marketplace-path`。

**状态显示已安装但被禁用。** 再运行一次 `/codex computer-use install`。
Codex app-server 安装会将插件配置写回为启用状态。

**状态显示远程安装不受支持。** 使用本地 marketplace source 或
path。远程-only 目录项可以查看，但不能通过当前 app-server API 安装。

**状态显示 MCP 服务器不可用。** 重新运行一次安装，以便 MCP
服务器重新加载。如果仍然不可用，请修复 Codex Computer Use 应用、
Codex app-server MCP 状态或 macOS 权限。

**回合开始自动安装拒绝某个 source。** 这是预期行为。先通过显式
`/codex computer-use install --source <marketplace-source>`
添加 source，然后未来的回合开始自动安装就可以使用已发现的本地
marketplace。
