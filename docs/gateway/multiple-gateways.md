---
summary: "在一台主机上运行多个 OpenClaw Gateway（隔离、端口和配置文件）"
read_when:
  - "在同一台机器上运行多个 Gateway"
  - "每个网关需要隔离 config/state/ports"
title: "多个网关"
doc-schema-version: 1
---

大多数设置需要一个网关 - 一个网关处理多个消息连接和代理。仅当您需要更强的隔离或冗余时（e.g.，救援机器人），才运行具有隔离 profiles/ports 的单独网关。

## <a id="rescue-bot-quickstart"></a> 救援机器人快速入门

最简单的救援机器人设置：

- 将主机器人保持在默认配置文件上。
- 使用 `--profile rescue` 运行救援机器人，并使用它自己的 Telegram 机器人令牌。
- 将救援机器人放在不同的基本端口 e.g. `19789` 上。

这使得救援机器人能够在主机器人停机时调试或应用配置更改。在基本端口之间保留至少 120 个端口，以便派生的 sandbox/browser/CDP 端口永远不会发生冲突。每个实例都达到基数 + 110：其浏览器控制端口是基数 + 2，并且该端口的 CDP 范围运行到基数 + 110。

```bash
# Rescue bot (separate Telegram bot, separate profile, port 19789)
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

如果你的主机器人已经在运行，那么通常只需要这些步骤。如果 onboarding 已经安装了救援服务，就跳过最后的 `gateway install`。

在执行 `openclaw --profile rescue onboard` 期间：

- 使用单独的 Telegram 机器人令牌，专用于救援帐户。它很容易保持仅限运营商，它独立于主机器人的渠道和应用程序安装，并且它提供了一个简单的基于 DM- 的恢复路径。
- 保持 `rescue` 配置文件名称不变。
- 使用比主机器人至少高120的基础端口。
- 如果你自己已经管理了工作区，则接受默认的救援工作区。

### <a id="what---profile-rescue-onboard-changes"></a><a id="what-profile-rescue-onboard-changes"></a> `--profile rescue onboard` 会更改什么

`--profile rescue onboard` 会运行正常的 onboarding 流程，但将所有内容写入一个单独的配置文件，因此救援机器人将拥有自己的：

- Profile/config 文件
- 状态目录
- 工作区（默认：`~/.openclaw/workspace-rescue`）
- 托管服务名称
- 基础端口（以及派生端口）
- Telegram 机器人令牌

除此之外，提示内容与正常 onboarding 完全相同。

## <a id="general-multi-gateway-setup"></a> 通用多 gateway 配置

相同的隔离模式适用于一台主机上的任何一对或一组网关。为每个额外的网关提供其自己的命名配置文件和基本端口。

`openclaw setup` 在尚未配置的配置文件上运行载入。它执行与上述救援机器人使用的 `onboard` 命令相同的首次运行工作。当您希望在已配置的配置文件上使用入门引导流程时，请使用 `onboard`。

```bash
# main (default profile)
openclaw setup
openclaw gateway --port 18789

# extra gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

两侧都使用命名 profile 也同样可行：

```bash
openclaw --profile main setup
openclaw --profile main gateway --port 18789

openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

服务也遵循相同的模式：

```bash
openclaw gateway install
openclaw --profile ops gateway install --port 19789
```

使用救援机器人快速入门作为后备操作员通道。对跨不同渠道、租户、工作区或操作角色的多个长期网关使用通用配置文件模式。

## <a id="isolation-checklist"></a> 隔离检查清单

为每个 Gateway 实例保留以下内容唯一：

| 设置                           | 用途                              |
| --------------------------------- | ------------------------------------ |
| `OPENCLAW_CONFIG_PATH`            | 每个实例的配置文件             |
| `OPENCLAW_STATE_DIR`              | 每个实例的会话、凭据、缓存 |
| `agents.defaults.workspace`       | 每个实例的工作区根目录          |
| `gateway.port`（或 `--port`）      | 每个实例唯一                  |
| 派生的 sandbox/browser/CDP 端口 | 见下文                            |

共享其中任何一个都会导致配置、状态或端口冲突。网关启动强制执行唯一的状态目录所有权，包括设置 `OPENCLAW_ALLOW_MULTI_GATEWAY=1` 时。

<Warning>
`OPENCLAW_STATE_DIR` 本身并不能隔离托管网关服务。服务名称遵循配置文件，而不是状态目录。对于加入或服务安装测试，请使用专用的命名配置文件和唯一的端口，或隔离的计算机。不要针对临时状态目录安装或重新启动默认服务。
</Warning>

## <a id="port-mapping-(derived)"></a><a id="port-mapping-derived"></a> 端口映射（派生）

基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- 当隔离的 widget/MCP 应用程序主机处于活动状态时，Sandbox 主机侦听器端口 = 基址 + 1（除非 `mcp.apps.sandboxPort` 覆盖它）。
- 浏览器控制服务端口 = 基础端口 + 2（仅回环）。
- Hosted 小部件文档和 A2UI 渲染器资源在网关 HTTP 服务器本身上提供服务（与 `gateway.port` 相同的端口）。
- 浏览器配置文件 CDP 端口会自动分配为 `browser control port + 9` 到 `+ 108`。

如果在配置或环境变量中覆盖了这些值，则必须确保每个实例的端口保持唯一。

## <a id="browser%2Fcdp-notes-(common-footgun)"></a><a id="browser/cdp-notes-common-footgun"></a> Browser/CDP备注（普通脚枪）

- Do **not** 在多个实例上将 `browser.cdpUrl` 引脚设置为相同值。
- 每个实例都需要自己的浏览器控制端口和 CDP 范围（由其网关端口派生）。
- 对于显式指定的 CDP 端口，请为每个实例设置 `browser.profiles.<name>.cdpPort`。
- 对于远程 Chrome，请使用 `browser.profiles.<name>.cdpUrl`（按 profile、按实例）。

## <a id="manual-env-example"></a> 手动环境变量示例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19789
```

## <a id="quick-checks"></a> 快速检查

```bash
openclaw gateway status --deep
openclaw --profile rescue gateway status --deep
openclaw --profile rescue gateway probe
openclaw status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

- `gateway status --deep` 会捕获来自旧安装的过期 launchd/systemd/schtasks 服务。
- `doctor --deep` 还会报告何时无法检查可识别的服务定义或本机服务管理器。恢复检查访问并重新运行Doctor；不完整的扫描并不能证明不存在其他服务。检查警告绝不会授权清理服务。
- `gateway probe` 警告文本（例如 `multiple reachable gateway identities detected`）在两种情况下是预期的。您故意运行多个隔离网关，否则 OpenClaw 无法证明可到达的检查目标是同一网关。到同一网关的 SSH 隧道、代理 URL 或配置的远程 URL 是具有多种传输的一个网关，即使传输端口不同也是如此。

## <a id="related"></a> 相关内容

- [Gateway 运行手册](/gateway)
- [Gateway 锁](/gateway/gateway-lock)
- [配置](/gateway/configuration)
