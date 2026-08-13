---
summary: "`openclaw node` 的 CLI 参考（无头节点主机）"
read_when:
  - 运行无头节点主机
  - 为 `system.run` 配对非 macOS 节点
title: "节点"
---

# `openclaw node`

运行一个连接到 Gateway WebSocket 并在此机器上公开
`system.run` / `system.which` 的**无头节点主机**。

在 macOS 上，菜单栏应用已经将此节点主机运行时嵌入到其自身的
节点连接中，并添加了原生 Mac 能力。仅当你有意想要一个不带应用的无头节点时，
才在 Mac 上使用 `openclaw node run`。同时运行两者会为同一台机器创建两个节点身份。

## 为什么使用节点主机？

当你希望代理在**其他机器上运行命令**，而无需在那里安装完整的 macOS 配套应用时，
就可以使用节点主机。

常见用例：

- 在远程 Linux/Windows 机器上运行命令（构建服务器、实验室机器、NAS）。
- 将 exec **限制在 Gateway 的沙箱中**，但把已批准的运行委派给其他主机。
- 为自动化或 CI 节点提供轻量级、无头的执行目标。

执行仍受 **exec 批准** 和节点主机上每个代理的允许列表保护，
因此你可以保持命令访问范围明确且受控。

`openclaw node run` 连接后可以发布插件或基于 MCP 的工具。Gateway 默认信任
来自已配对节点的描述符，同时要求每个描述符的命令仍然保持在节点已批准的
命令范围内。代理会将每个已接受的描述符视为普通插件工具，但执行仍然通过
`node.invoke` 进行，因此断开节点会将该工具从新的代理运行中移除。
Gateway 运维人员可以通过以下配置禁用发布功能：
`gateway.nodes.pluginTools.enabled: false`。

对于声明式 MCP 工具，请在节点机器上的 `openclaw.json` 中，将常规的 MCP
服务器结构添加到 `nodeHost.mcp.servers` 下，然后重启节点主机。节点会声明
受批准流程保护的 `mcp.tools.call.v1` 命令族，并在连接后发布列出的工具；
之后更改服务器列表不需要重新配对。参见
[节点托管的 MCP 服务器](/nodes#node-hosted-mcp-servers)。

## 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，节点主机会自动声明一个浏览器代理。这使代理可以在该节点上使用浏览器自动化，而无需额外配置。

默认情况下，代理会暴露节点的普通浏览器配置文件表面。如果你设置
`nodeHost.browserProxy.allowProfiles`，代理将变得受限：
非允许列表中的配置文件目标会被拒绝，并且持久化配置文件的
创建/删除路由会通过代理被阻止。

如有需要，可在节点上将其禁用：

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## 运行（前台）

如需一键完成引导，请使用 [`openclaw connect`](/cli/connect)。它接受一次性加入 URL
或与 `--pair` 相同的设置代码形式，然后运行此节点主机运行时。

```bash
openclaw node run --host <gateway-host> --port 18789
```

或者，从控制界面的设备页面粘贴一个短期有效的节点设置链接：

```bash
openclaw node run --pair "oc-pair://<setup-code>"
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--pair <code-or-url>`：从设置代码或 `oc-pair://` URL 读取 Gateway 端点、引导令牌、TLS 模式以及可选的证书固定值。显式的 Gateway 标志会覆盖 `--pair` 中的值。
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--context-path <path>`：Gateway WebSocket 上下文路径（例如 `/openclaw-gw`）。会附加到 WebSocket URL。
- `--tls`：为 Gateway 连接使用 TLS
- `--no-tls`：即使本地 Gateway 配置启用了 TLS，也强制使用明文 Gateway 连接
- `--tls-fingerprint <sha256>`：期望的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖存储在共享 SQLite 状态中的客户端实例 ID（不会重置配对）
- `--display-name <name>`：覆盖节点显示名称

## 节点主机的 Gateway 认证

`--pair` 使用一个有效期为 10 分钟且只能使用一次的引导令牌进行首次连接。
配对后，重新连接会使用持久设备凭据。设置链接不会预先批准 `system.run`；
正常的节点批准和 SSH 验证仍然有效。`node install --pair` 特意不可用，因为短期有效的
Bearer 设置链接不得持久化到服务参数中。

`openclaw node run` 和 `openclaw node install` 从配置／环境中解析 Gateway 认证（节点命令没有 `--token`／`--password` 标志）：

- 首先检查 `OPENCLAW_GATEWAY_TOKEN`／`OPENCLAW_GATEWAY_PASSWORD`。
- 然后回退到本地配置：`gateway.auth.token`／`gateway.auth.password`。
- 在本地模式下，节点主机不会故意继承 `gateway.remote.token`／`gateway.remote.password`。
- 如果 `gateway.auth.token`／`gateway.auth.password` 通过 SecretRef 显式配置但未解析，节点认证解析将失败并关闭（不会用远程回退掩盖）。
- 在 `gateway.mode=remote` 中，远程客户端字段（`gateway.remote.token`／`gateway.remote.password`）也会根据远程优先级规则具备资格。
- 节点主机认证解析仅接受 `OPENCLAW_GATEWAY_*` 环境变量。

对于连接到明文 `ws://` Gateway 的节点，允许使用回环地址、私有 IP
字面量、`.local` 以及 Tailnet 的 `*.ts.net` 主机。对于其他
受信任的私有 DNS 名称，请设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`；如果
不设置，节点启动将以失败关闭的方式退出，并提示你使用 `wss://`、SSH 隧道或
Tailscale。这是一个进程环境的显式启用选项，不是 `openclaw.json` 配置
键。
当 `openclaw node install` 命令环境中存在该变量时，
它会将其持久化到受监督的节点服务中。

## 服务（后台）

将无头节点主机作为用户服务安装（macOS 上使用 launchd，Linux 上使用 systemd，Windows 上使用 Windows 任务计划程序）。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--context-path <path>`：Gateway WebSocket 上下文路径（例如 `/openclaw-gw`）。会附加到 WebSocket URL。
- `--tls`：为 gateway 连接使用 TLS
- `--tls-fingerprint <sha256>`：期望的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖存储在共享 SQLite 状态中的客户端实例 ID（不会重置配对）
- `--display-name <name>`：覆盖节点显示名称
- `--runtime <runtime>`：服务运行时（`node`）
- `--force`：如果已安装，则重新安装／覆盖

> **Linux（systemd 用户服务）：** 安装后运行
> `sudo loginctl enable-linger <user>`。如果不启用 linger，
> `systemd --user` 会在最后一个 SSH 会话结束时拆除节点服务，因此节点
> 会在注销后无提示地离线。
> 当检测到 linger 已禁用时，`openclaw node install` 会打印此警告。

管理服务：

```bash
openclaw node status
openclaw node start
openclaw node stop
openclaw node restart
openclaw node uninstall
```

前台节点主机请使用 `openclaw node run`（不使用服务）。

服务命令接受 `--json` 以输出机器可读格式。

节点主机会在进程内重试 Gateway 重启和网络关闭。如果 Gateway 报告终止性的 token/password/bootstrap auth 暂停，节点主机会记录关闭详情并以非零状态退出，以便 launchd/systemd/Windows 任务计划程序使用新的配置和凭据重新启动它。需要配对的暂停会保留在前台流程中，以便可以批准待处理的请求。

## 配对

第一次连接会在 Gateway 上创建一个待处理的设备配对请求（`role: node`）。

当 Gateway 主机能够以非交互方式通过 SSH 连接到节点主机时（同一用户、受信任的主机密钥），该待处理请求会自动批准：Gateway 会通过 SSH 在节点主机上运行 `openclaw node identity --json`，并在设备密钥完全匹配时批准。这一功能默认开启；有关要求以及如何禁用它（`gateway.nodes.pairing.sshVerify: false`），请参阅
[SSH 验证的设备自动批准](/gateway/pairing#ssh-verified-device-auto-approval-default)。

否则，请通过以下方式手动批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

查看 Gateway 用于验证的本地节点身份：

```bash
openclaw node identity --json
```

它会打印来自 `state/openclaw.sqlite` 中 `primary` 行的设备 ID 和公钥，并且不会创建数据库或新身份。

在严格受控的节点网络中，Gateway 操作员可以显式选择自动批准来自受信任 CIDR 的首次节点配对：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

默认情况下这是禁用的（未设置 `autoApproveCidrs`）。它仅适用于来自 Gateway 信任的客户端 IP、且没有请求任何 scope 的全新 `role: node` 配对。Operator/browser 客户端、Control UI、WebChat，以及 role、scope、metadata 或 public-key 升级仍然需要手动批准。

如果节点在重试配对时认证细节发生变化（role/scopes/public key），先前的待处理请求会被取代，并创建新的 `requestId`。
在批准之前请再次运行 `openclaw devices list`。

### 身份和配对状态

无头节点将其客户端实例 ID 与 Gateway 用于配对和路由的已签名设备身份分开管理。这些状态保存在 OpenClaw 状态目录中（默认是 `~/.openclaw`，或者在设置了 `$OPENCLAW_STATE_DIR` 时使用该目录）：

| 状态                                                     | 用途                                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `state/openclaw.sqlite`（`node_host_config`）             | 客户端实例 ID、显示名称以及 Gateway 连接元数据。客户端将此 ID 作为 `instanceId` 发送。                                             |
| `state/openclaw.sqlite`（`device_identities`，`primary`） | 已签名的 Ed25519 密钥对和派生的设备 ID。对于已签名连接，此设备 ID 即为路由中的节点 ID 和配对身份。                                     |
| `state/openclaw.sqlite`（`device_auth_tokens`）           | 已配对的设备令牌，按加密设备 ID 和角色键入。                                                                                         |

`--node-id` 只会更改共享 SQLite 状态中的客户端实例 ID。它不会更改加密设备 ID，也不会清除配对认证。使用 `openclaw doctor --fix` 迁移已退役的 `node.json` 同样不会重置配对。要撤销并重新配对某个节点：

1. 在 Gateway 上运行 `openclaw nodes remove --node <id|name|ip>`。
2. 在节点上，使用 `openclaw node restart` 重启已安装的服务，或者停止后重新运行前台的 `openclaw node run` 命令。这会启动设备配对流程。如果 `openclaw devices list` 没有显示请求，且节点报告 `AUTH_DEVICE_TOKEN_MISMATCH`，请再重启或重新运行一次。被拒绝的尝试会清除已被撤销的本地令牌；下一次尝试可以请求配对。
3. 在 Gateway 上运行 `openclaw devices list`，然后运行 `openclaw devices approve <deviceRequestId>`。
4. 再次重启或重新运行节点。处于配对暂停状态的客户端在批准后不会自动恢复；这次重新连接会创建单独的命令面请求。
5. 在 Gateway 上运行 `openclaw nodes pending`，然后运行 `openclaw nodes approve <nodeRequestId>`。

这两个请求 ID 是不同的。适用的受信任 CIDR 策略可以自动批准首次设备配对步骤；命令面批准仍然是单独的检查。

较早版本的 OpenClaw 将节点主机状态存储在 `node.json` 中，将已签名身份存储在 `identity/device.json` 中，将已配对认证存储在 `identity/device-auth.json` 中。停止节点主机后运行一次 `openclaw doctor --fix`；Doctor 会接管每个已退役来源，验证它，导入并验证规范的 SQLite 行，然后删除旧文件。当任何已退役文件仍然存在，或者 Doctor 的接管被中断时，正常的节点命令都会按失败关闭，并给出此修复说明。请将 `state/openclaw.sqlite` 保持私密；它包含设备密钥对和认证令牌。

## Exec 批准

`system.run` 受本地 exec 批准控制：

- `$OPENCLAW_STATE_DIR/state/openclaw.sqlite#exec_approvals_config`, 或
  未设置该变量时使用 `~/.openclaw/state/openclaw.sqlite#exec_approvals_config`
- [Exec 批准](/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway 编辑）

对于已批准的异步节点 exec，OpenClaw 会在提示前准备一个规范化的 `systemRunPlan`。
后续已批准的 `system.run` 转发会复用该存储的计划，因此在批准请求创建后，
如果编辑 command/cwd/session 字段，将会被拒绝，而不是改变节点实际执行的内容。

## 相关

- [CLI 参考](/cli)
- [连接机器](/cli/connect)
- [节点](/nodes)
