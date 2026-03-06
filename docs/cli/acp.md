---
summary: "运行 ACP 桥接以实现 IDE 集成"
read_when:
  - 设置基于 ACP 的 IDE 集成
  - 调试 ACP 会话路由至 Gateway
title: "acp"
---

# acp

运行与 OpenClaw Gateway 通信的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 桥接。

该命令通过 stdio 与 IDE 交互 ACP，并通过 WebSocket 将提示转发到 Gateway。
它保持 ACP 会话与 Gateway 会话密钥的映射。

## 用法

```bash
openclaw acp

# 远程 Gateway
openclaw acp --url wss://gateway-host:18789 --token <token>

# 远程 Gateway（从文件读取 token）
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# 附加到已有的会话密钥
openclaw acp --session agent:main:main

# 通过标签附加（标签必须已存在）
openclaw acp --session-label "support inbox"

# 在首次提示前重置会话密钥
openclaw acp --session agent:main:main --reset-session
```

## ACP 客户端（调试）

使用内置 ACP 客户端在无 IDE 环境下对桥接进行健全性检查。
它会启动 ACP 桥接并允许你交互式输入提示。

```bash
openclaw acp client

# 指定启动的桥接连接远程 Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# 覆盖服务器命令（默认：openclaw）
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

权限模型（客户端调试模式）：

- 自动批准基于白名单，仅适用于受信任的核心工具 ID。
- `read` 自动批准限制在当前工作目录（设置了 `--cwd` 时）。
- 未知/非核心工具名称、超出作用域的读取和危险工具始终需要显式提示批准。
- 服务器提供的 `toolCall.kind` 视为不可信的元数据（不是授权来源）。

## 如何使用

当 IDE（或其他客户端）使用 Agent Client Protocol 通信，
且你希望它驱动一个 OpenClaw Gateway 会话时，请使用 ACP。

1. 确保 Gateway 正在运行（本地或远程）。
2. 配置 Gateway 目标（配置或命令行参数）。
3. 在 IDE 中配置以 stdio 方式运行 `openclaw acp`。

示例配置信息（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

示例直接运行（不写入配置）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# 推荐用于本地进程安全
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 选择代理

ACP 不直接选择代理。它通过 Gateway 会话密钥进行路由。

使用特定代理作用域的会话密钥以定位某个代理：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话映射到单一 Gateway 会话密钥。一个代理可以拥有多个
会话；ACP 默认生成隔离的 `acp:<uuid>` 会话，除非你覆盖密钥或标签。

## Zed 编辑器配置

在 `~/.config/zed/settings.json` 中添加自定义 ACP 代理（或者用 Zed 的设置界面）：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

若要定位特定 Gateway 或代理：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": [
        "acp",
        "--url",
        "wss://gateway-host:18789",
        "--token",
        "<token>",
        "--session",
        "agent:design:main"
      ],
      "env": {}
    }
  }
}
```

在 Zed 中打开代理面板，选择 “OpenClaw ACP” 启动线程。

## 会话映射

默认情况下，ACP 会话获得带有 `acp:` 前缀的隔离 Gateway 会话密钥。
要重用已知会话，请传入会话密钥或标签：

- `--session <key>`：使用指定的 Gateway 会话密钥。
- `--session-label <label>`：通过标签解析已有会话。
- `--reset-session`：为该密钥生成新的 Session ID（相同密钥，新的对话纪录）。

如果你的 ACP 客户端支持元数据，可以针对某个会话覆盖参数：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

关于会话密钥的更多信息，请参阅 [/concepts/session](/concepts/session)。

## 选项

- `--url <url>`：Gateway WebSocket URL（配置时默认为 gateway.remote.url）。
- `--token <token>`：Gateway 认证令牌。
- `--token-file <path>`：从文件读取 Gateway 认证令牌。
- `--password <password>`：Gateway 认证密码。
- `--password-file <path>`：从文件读取 Gateway 认证密码。
- `--session <key>`：默认会话密钥。
- `--session-label <label>`：默认会话标签以解析。
- `--require-existing`：若会话密钥/标签不存在则失败。
- `--reset-session`：首次使用前重置会话密钥。
- `--no-prefix-cwd`：不在提示中添加工作目录前缀。
- `--verbose, -v`：向 stderr 输出详细日志。

安全提示：

- 某些系统下，`--token` 和 `--password` 可能会在本地进程列表中可见。
- 优先使用 `--token-file`/`--password-file` 或环境变量（`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`）。
- ACP 运行时后端子进程会收到环境变量 `OPENCLAW_SHELL=acp`，可用于上下文相关的 shell/profile 规则。
- `openclaw acp client` 命令会在启动的桥接进程中设置 `OPENCLAW_SHELL=acp-client`。

### `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。
- `--server <command>`：ACP 服务器命令（默认：`openclaw`）。
- `--server-args <args...>`：额外传给 ACP 服务器的参数。
- `--server-verbose`：启用 ACP 服务器详细日志。
- `--verbose, -v`：详细的客户端日志。
