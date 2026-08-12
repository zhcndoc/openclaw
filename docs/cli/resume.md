---
summary: "用于将 TUI 连接到最近 Gateway 会话的 CLI 参考"
read_when:
  - 想要在终端中继续现有的 Gateway 会话
  - 想要通过键、显示名称或标签查找最近的会话
  - 将 TUI 连接到远程 Gateway
title: "恢复"
---

# `openclaw resume`

将终端 UI 连接到现有的 Gateway 会话。会话会保留在 Gateway 上；`resume` 会选择该会话并打开现有的 [TUI](/cli/tui)。

```bash
openclaw resume
openclaw resume <query>
```

不提供查询时，OpenClaw 会显示最近七天内活跃的最多 50 个会话。提供查询时，精确匹配的会话键优先；否则，OpenClaw 会要求在会话键、显示名称和标签中找到唯一的子字符串匹配或模糊匹配。

选择器会省略单独的 `global` 行，因为它们无法标识所属的代理。要连接到此类会话，请传入完全限定的键，例如
`openclaw resume agent:main:global`。

如果查询结果不明确，OpenClaw 会打印匹配的候选项并以状态码 1 退出。如果没有匹配的最近会话，它会提示使用选择器和
[`openclaw sessions`](/cli/sessions)，然后以状态码 1 退出。

## 选项

| 标志                         | 默认值                           | 描述                                                               |
| ---------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `--url <url>`                | 配置中的 `gateway.remote.url`     | Gateway WebSocket URL。                                            |
| `--token <token>`            | （无）                           | 如果需要，使用 Gateway 令牌。                                      |
| `--password <pass>`          | （无）                           | 如果需要，使用 Gateway 密码。                                      |
| `--tls-fingerprint <sha256>` | `gateway.remote.tlsFingerprint`  | 已固定 `wss://` Gateway 的预期 TLS 证书指纹。                      |

`resume` 使用与 [`openclaw tui`](/cli/tui) 相同的 Gateway URL、身份验证和 TLS
解析方式。它绝不会自动启动 Gateway。如果配置的 Gateway 不可用，请启动或修复它，然后重新运行命令。

`resume` 会在可能的情况下解析配置的 Gateway 身份验证 SecretRefs，以用于令牌／密码身份验证
（`env`／`file`／`exec`／`store` 提供程序）。

Gateway 目标的优先级依次为显式指定的 `--url`、`OPENCLAW_GATEWAY_URL`、
当 `gateway.mode` 为 `remote` 时的 `gateway.remote.url`，以及本地
loopback Gateway。对于本地 Gateway，`OPENCLAW_GATEWAY_PORT` 的优先级高于
正在运行的 Gateway 所记录的活动端口，而活动端口的优先级又高于配置的或默认的 `gateway.port`。

## 示例

```bash
# 从最近的会话中选择
openclaw resume

# 精确键
openclaw resume agent:main:bugfix

# 唯一的显示名称或标签片段
openclaw resume bugfix

# 覆盖远程网关
openclaw resume bugfix --url wss://gateway.example.com --token <token>
```

## 相关

- [TUI](/cli/tui)
- [会话](/cli/sessions)
- [TUI 指南](/web/tui)
