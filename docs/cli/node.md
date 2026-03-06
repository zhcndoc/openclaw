---
summary: "`openclaw node` 的 CLI 参考（无头节点主机）"
read_when:
  - 运行无头节点主机时
  - 配对非 macOS 节点以使用 system.run 时
title: "node"
---

# `openclaw node`

运行一个**无头节点主机**，该主机连接到 Gateway WebSocket，并在此机器上暴露 `system.run` / `system.which`。

## 为什么使用节点主机？

当你希望代理在网络中的其他机器上**运行命令**，但不想在那些机器上安装完整的 macOS 伴随应用时，可以使用节点主机。

常见用例：

- 在远程 Linux/Windows 机器上运行命令（构建服务器、实验室机器、网络附加存储 NAS）。
- 将 exec **沙箱化** 保持在网关上，但将获批的执行委托给其他主机。
- 为自动化或 CI 节点提供轻量级、无头的执行目标。

执行仍然受**执行批准**和节点主机上的每代理允许列表保护，确保命令访问范围清晰明确。

## 浏览器代理（零配置）

如果节点上的 `browser.enabled` 未被禁用，节点主机会自动发布浏览器代理。这样代理可以在该节点上使用浏览器自动化，无需额外配置。

如需要可在节点关闭它：

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
- `--tls`：使用 TLS 连接网关
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 id（会清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称

## 服务（后台）

将无头节点主机安装为用户服务。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：使用 TLS 连接网关
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 id（会清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称
- `--runtime <runtime>`：服务运行时（`node` 或 `bun`）
- `--force`：已安装时重新安装/覆盖

管理服务：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

使用 `openclaw node run` 启动前台节点主机（非服务）。

服务命令支持 `--json` 参数以输出机器可读格式。

## 配对

首次连接会在 Gateway 上创建一个待处理的设备配对请求（`role: node`）。
通过以下命令批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

节点主机会将其节点 id、令牌、显示名称和 Gateway 连接信息存储在
`~/.openclaw/node.json`。

## 执行批准

`system.run` 受本地执行批准限制：

- `~/.openclaw/exec-approvals.json`
- [执行批准](/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（在 Gateway 上编辑）
