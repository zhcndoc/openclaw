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

## 为什么使用节点主机？

当你希望代理在**其他机器上运行命令**，而无需在那里安装完整的 macOS 配套应用时，
就可以使用节点主机。

常见用例：

- 在远程 Linux/Windows 机器上运行命令（构建服务器、实验室机器、NAS）。
- 将 exec **限制在 Gateway 的沙箱中**，但把已批准的运行委派给其他主机。
- 为自动化或 CI 节点提供轻量级、无头的执行目标。

执行仍然受到节点主机上的**exec 批准**和按代理设置的允许列表保护，
因此你可以保持命令访问的范围明确且可控。

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

```bash
openclaw node run --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：对 gateway 连接使用 TLS
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 id（清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称

## 节点主机的 Gateway 认证

`openclaw node run` 和 `openclaw node install` 会从配置/环境中解析 gateway 认证（节点命令上没有 `--token`/`--password` 标志）：

- 先检查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然后回退到本地配置：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机不会故意继承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，节点认证解析将失败并关闭（不会用远程回退掩盖）。
- 在 `gateway.mode=remote` 中，远程客户端字段（`gateway.remote.token` / `gateway.remote.password`）也会根据远程优先级规则具备资格。
- 节点主机认证解析仅接受 `OPENCLAW_GATEWAY_*` 环境变量。

对于连接到受信任私有网络上非回环 `ws://` Gateway 的节点，设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。没有它的话，节点启动会失败并要求你使用 `wss://`、SSH 隧道或 Tailscale。
这是一个进程环境级别的显式启用，不是 `openclaw.json` 配置键。
当 `openclaw node install` 的安装命令环境中存在它时，它会被持久化到受监督的节点服务中。

## 服务（后台）

将无头节点主机作为用户服务安装。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：对 gateway 连接使用 TLS
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 id（清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称
- `--runtime <runtime>`：服务运行时（`node` 或 `bun`）
- `--force`：如果已安装则重新安装/覆盖

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

节点主机会在进程内重试 Gateway 重启和网络关闭。如果 Gateway 报告终止性的令牌/密码/启动认证暂停，节点主机会记录关闭详情并以非零状态退出，以便 launchd/systemd 可以用新的配置和凭据重新启动它。需要配对的暂停会保留在前台流程中，以便可以批准待处理请求。

## 配对

首次连接会在 Gateway 上创建一个待处理的设备配对请求（`role: node`）。
可通过以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

在严格控制的节点网络中，Gateway 操作者可以明确选择对来自受信任 CIDR 的首次节点配对自动批准：

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

默认情况下禁用。它只适用于没有请求作用域的全新 `role: node` 配对。
操作员/浏览器客户端、Control UI、WebChat，以及 role、scope、metadata 或公钥升级仍然需要手动批准。

如果节点在重试配对时认证细节发生变化（role/scopes/public key），先前的待处理请求会被取代，并创建新的 `requestId`。
在批准之前请再次运行 `openclaw devices list`。

节点主机会将其节点 id、令牌、显示名称和 gateway 连接信息存储在
`~/.openclaw/node.json` 中。

## Exec 批准

`system.run` 受本地 exec 批准控制：

- `~/.openclaw/exec-approvals.json`
- [Exec approvals](/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway 编辑）

对于已批准的异步节点 exec，OpenClaw 会在提示前准备一个规范化的 `systemRunPlan`。
后续已批准的 `system.run` 转发会复用该存储的计划，因此在批准请求创建后，
如果编辑 command/cwd/session 字段，将会被拒绝，而不是改变节点实际执行的内容。

## 相关

- [CLI 参考](/cli)
- [节点](/nodes)
