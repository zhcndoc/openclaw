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

当 IDE（或其他客户端）使用 Agent Client Protocol 通信，且你希望它驱动 OpenClaw Gateway 会话时，请使用 ACP。

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
- Gateway 认证解析遵循与其他 Gateway 客户端共享的约定：  
  - 本地模式：环境变量（`OPENCLAW_GATEWAY_*`）-> `gateway.auth.*` -> 仅当 `gateway.auth.*` 未设置时回退到 `gateway.remote.*`（配置但未解析的本地 SecretRefs 将导致安全关闭）  
  - 远程模式：`gateway.remote.*` 及其根据远程优先级规则的环境变量/配置回退  
  - `--url` 是覆盖安全的，不复用隐式的配置/环境凭据；请显式传入 `--token`/`--password`（或文件变体）  
- ACP 运行时后端子进程会收到环境变量 `OPENCLAW_SHELL=acp`，可用于上下文相关的 shell/profile 规则。  
- `openclaw acp client` 命令会在启动的桥接进程中设置 `OPENCLAW_SHELL=acp-client`。  

### `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。  
- `--server <command>`：ACP 服务器命令（默认：`openclaw`）。  
- `--server-args <args...>`：额外传给 ACP 服务器的参数。  
- `--server-verbose`：启用 ACP 服务器详细日志。  
- `--verbose, -v`：详细的客户端日志。

## 兼容性矩阵

| ACP 功能区                                                        | 状态       | 备注                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`，`newSession`，`prompt`，`cancel`                    | 已实现     | 通过 stdio 向 Gateway 转发聊天、发送和取消的核心桥接流程。                                                                                                                                                  |
| `listSessions`，斜杠命令                                          | 已实现     | 会话列表基于 Gateway 会话状态工作；命令通过 `available_commands_update` 广播。                                                                                                                              |
| `loadSession`                                                    | 部分实现   | 将 ACP 会话重新绑定到 Gateway 会话密钥，并重放用户和助手的文本历史。尚未重建工具/系统历史。                                                                                                                 |
| 提示内容（`text`、嵌入的 `resource`、图片）                      | 部分实现   | 文本/资源被展平为聊天输入；图片被转换为 Gateway 附件。                                                                                                                                                       |
| 会话模式                                                        | 部分实现   | 支持 `session/set_mode`，且桥接暴露基于 Gateway 的初始会话控制，包括思考等级、工具详细度、推理、使用细节及提升操作。更全面的 ACP 原生模式/配置尚未覆盖。                                                      |
| 会话信息和使用情况更新                                           | 部分实现   | 桥接基于缓存的 Gateway 会话快照发送 `session_info_update` 和尽力而为的 `usage_update` 通知。使用情况是估算的，仅在 Gateway 标记令牌总数为新鲜时发送。                                                       |
| 工具流式                                                         | 部分实现   | `tool_call` / `tool_call_update` 事件包含原始输入输出、文本内容以及在 Gateway 工具参数/结果暴露时的文件位置。嵌入式终端和更丰富的原生差异输出尚未暴露。                                                      |
| 每会话 MCP 服务器（`mcpServers`）                               | 不支持     | 桥接模式拒绝按会话的 MCP 服务器请求。请在 OpenClaw Gateway 或代理上配置 MCP。                                                                                                                                |
| 客户端文件系统方法（`fs/read_text_file`，`fs/write_text_file`）  | 不支持     | 桥接不调用 ACP 客户端文件系统方法。                                                                                                                                                                         |
| 客户端终端方法 (`terminal/*`)                                   | 不支持     | 桥接不创建 ACP 客户端终端，也不通过工具调用流式传输终端 ID。                                                                                                                                                |
| 会话计划 / 思考流                                               | 不支持     | 桥接当前仅发送输出文本和工具状态，不发送 ACP 计划或思考更新。                                                                                                                                               |

## 已知限制

- `loadSession` 只重放存储的用户和助手文本历史，尚未重建历史工具调用、系统通知或更丰富的 ACP 原生事件类型。  
- 如果多个 ACP 客户端共享相同 Gateway 会话密钥，事件和取消的路由是尽力而为而非严格隔离的。需要干净的编辑器本地轮次时，优先使用默认的隔离 `acp:<uuid>` 会话。  
- Gateway 的停止状态被映射为 ACP 停止原因，但这种映射不如完整 ACP 原生运行时那样丰富。  
- 初始会话控制仅暴露 Gateway 的一部分按钮：思考等级、工具详细度、推理、使用细节和提升操作。模型选择和执行主机控制尚未作为 ACP 配置选项暴露。  
- `session_info_update` 和 `usage_update` 来源于 Gateway 会话快照，而非实时 ACP 原生运行时计费。使用情况是估算，没有成本数据，且仅在 Gateway 标记令牌数据为新鲜时才发送。  
- 工具的跟踪数据是尽力而为。桥接可以显示在已知工具参数/结果中出现的文件路径，但尚未发送 ACP 终端或结构化文件差异。

## 使用 `acpx`（Codex，Claude 等其他 ACP 客户端）

如果你想让编程代理（如 Codex 或 Claude Code）通过 ACP 与你的 OpenClaw 机器人通信，请使用带内置 `openclaw` 目标的 `acpx`。

典型流程：

1. 运行 Gateway，确保 ACP 桥接能连接。  
2. 使用 `acpx openclaw` 指向 `openclaw acp`。  
3. 指定你希望编码代理使用的 OpenClaw 会话密钥。

示例：

```bash
# 向默认 OpenClaw ACP 会话发送一次性请求
acpx openclaw exec "Summarize the active OpenClaw session state."

# 持久化命名会话以便后续交互
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果你希望 `acpx openclaw` 每次都目标特定 Gateway 和会话密钥，修改 `~/.acpx/config.json` 中的 `openclaw` 代理命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

对于 repo 本地的 OpenClaw 代码库，使用直接 CLI 入口而非开发运行器，以保持 ACP 流清晰。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

这是让 Codex、Claude Code 或其他 ACP 兼容客户端无须抓取终端即可从 OpenClaw 代理获取上下文信息的最简方式。

## 每会话 MCP 服务器（`mcpServers`）

桥接模式不支持每会话 `mcpServers`。如果 ACP 客户端在 `newSession` 或 `loadSession` 中发送它们，桥接会返回明确错误，而不是静默忽略。
