---
summary: "openclaw attach 的 CLI 参考（使用受限的 Gateway MCP 授权启动 Claude Code）"
read_when:
  - 你希望 Claude Code 使用 OpenClaw Gateway MCP 工具
  - 你需要一个面向外部 harness 的临时、会话绑定的 MCP 授权
title: "Attach CLI"
---

`openclaw attach` 会启动 Claude Code，并附带一个严格的临时 MCP 配置，该配置仅绑定到一个 Gateway 会话。

```sh
openclaw attach
openclaw attach --session agent:main:telegram:123 --ttl 600000
openclaw attach --print-config
```

选项：

- `--session <key>` 将授权绑定到一个 Gateway 会话。默认是主会话。
- `--ttl <ms>` 以毫秒为单位请求一个正的授权 TTL。Gateway 会应用自己的上限。
- `--bin <path>` 选择 Claude Code 二进制文件。默认值：`claude`。
- `--print-config` 会写入临时的 `.mcp.json`，打印启动命令和环境变量，并让授权保持有效直到 TTL 到期（它不会启动 Claude Code，也不会撤销授权）。

Bearer token 通过环境变量传递，而不是通过 argv。OpenClaw 启动 Claude Code 时使用 `--strict-mcp-config --mcp-config <path>`，因此环境中的 Claude MCP 服务器不会加入已附加的会话。正常启动（不使用 `--print-config`）会在 Claude Code 进程退出时撤销授权。

另请参阅：[Gateway CLI](/cli/gateway)、[MCP CLI](/cli/mcp) 和 [ACP CLI](/cli/acp)。
