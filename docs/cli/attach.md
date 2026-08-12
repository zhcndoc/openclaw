---
summary: "openclaw attach 的 CLI 参考（使用受限的 Gateway MCP 授权启动 Claude Code）"
read_when:
  - 你希望 Claude Code 使用 OpenClaw Gateway MCP 工具
  - 你需要一个面向外部 harness 的临时、会话绑定的 MCP 授权
title: "Attach CLI"
---

`openclaw attach` 会启动 Claude Code，并附带一个严格的临时 MCP 配置，该配置仅绑定到一个 Gateway 会话。

```sh
openclaw attach [target]
```

`target` 接受 Control UI 会话 URL、简写的 `host/agent/ref`、裸短引用或字面量 `agent:...` 会话键。URL 或主机目标会权威地选择该 Gateway；裸引用使用已配置的或默认的 Gateway。

```sh
openclaw attach
openclaw attach https://gateway.example/dashboard/main/movies-a1166b81
openclaw attach movies-a1166b81
openclaw attach --session agent:main:telegram:123 --ttl 600000
openclaw attach --print-config
```

选项：

- `--session <key>` 将授权绑定到 Gateway 会话。默认为主会话。
- `--url <url>` 为裸引用或 `--session` 键选择 Gateway。不要将其与 URL 目标结合使用。
- `--token <token>` 和 `--password <password>` 提供显式的 Gateway 身份验证。
- `--tls-fingerprint <sha256>` 固定 Gateway TLS 证书。
- `--ttl <ms>` 请求以毫秒为单位的正授权 TTL。Gateway 会应用其自身的上限。
- `--bin <path>` 选择 Claude Code 二进制文件。默认值：`claude`。
- `--print-config` 写入临时 `.mcp.json`，打印启动命令和环境变量，并使授权保持有效直到 TTL 到期（不会启动 Claude Code，也不会撤销授权）。

请传递位置目标或 `--session`，但不能同时传递两者。短引用会在生成受限 attach 授权之前解析；缺失的会话不会被隐式创建。

URL 或主机目标绝不会复用已配置的凭据或
`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。它会使用该确切 Gateway 来源所存储的设备令牌，或显式提供的 `--token`/`--password` 凭据。首次连接时，请传递其中一种凭据，在该 Gateway 的 Control UI 中批准配对请求，然后重试；请参阅
[Devices](/cli/devices)。会话 URL 必须不包含凭据：userinfo 以及诸如 `token` 和
`password` 之类的敏感查询或片段参数会被拒绝。

目标解析使用与 `openclaw tui` 相同的[会话目标错误矩阵](/cli/tui#session-target-errors)。

承载令牌通过环境变量传递，而不是通过 argv。OpenClaw 会使用
`--strict-mcp-config --mcp-config <path>` 启动 Claude Code，因此环境中的 Claude MCP 服务器不会加入所附加的会话。普通启动（不使用 `--print-config`）会在 Claude Code 进程退出时撤销授权。

另请参阅：[Control UI URLs](/web/urls)、[Devices](/cli/devices)、[Gateway CLI](/cli/gateway)、[MCP CLI](/cli/mcp) 和 [ACP CLI](/cli/acp)。
