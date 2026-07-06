---
summary: "为 IDE 集成运行 ACP 桥接"
read_when:
  - 配置基于 ACP 的 IDE 集成
  - 调试 ACP 会话路由到 Gateway
title: "ACP"
---

运行与 OpenClaw Gateway 通信的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 桥接。

`openclaw acp` 通过 stdio 讲 ACP 协议，供 IDE 使用，并通过 WebSocket 将提示转发到 Gateway，同时将 ACP 会话映射到 Gateway 会话键。它是一个由 Gateway 支持的 ACP 桥接，而不是完整的原生 ACP 编辑器运行时：它专注于会话路由、提示传递和流式更新。

如果你希望外部 MCP 客户端直接与 OpenClaw channel 对话，而不是托管一个 ACP harness 会话，请改用 [`openclaw mcp serve`](/cli/mcp)。

## 这不是做什么

`openclaw acp` 意味着 OpenClaw 作为一个 ACP 服务器运行：一个 IDE 或 ACP 客户端连接到 OpenClaw，然后 OpenClaw 将该工作转发到一个 Gateway 会话中。

这与 [ACP Agents](/tools/acp-agents) 不同，在后者中，OpenClaw 通过 `acpx` 运行诸如 Codex 或 Claude Code 之类的外部 harness。

快速规则：

- 编辑器/客户端想通过 ACP 与 OpenClaw 通信：使用 `openclaw acp`
- OpenClaw 应该启动 Codex/Claude/Gemini 作为 ACP harness：使用 `/acp spawn` 和 [ACP Agents](/tools/acp-agents)

## 兼容性矩阵

| ACP 区域                                                              | 状态        | 备注                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                        | 已实现      | 通过 stdio 到 Gateway chat/send + abort 的核心桥接流程。                                                                                                                                                                             |
| `listSessions`, slash commands                                        | 已实现      | 会话列表可基于 Gateway 会话状态工作，支持有界游标分页和 `cwd` 过滤，其中 Gateway 会话行携带工作区元数据；命令通过 `available_commands_update` 进行通告。                                                                             |
| 会话血缘元数据                                                      | 已实现      | 会话列表和会话信息快照在 `_meta` 中包含 OpenClaw 的父子血缘关系，因此 ACP 客户端可以在不依赖私有 Gateway 侧通道的情况下渲染子代理图。                                                                                               |
| `resumeSession`, `closeSession`                                       | 已实现      | 恢复会将 ACP 会话重新绑定到现有的 Gateway 会话，而不会重放历史。关闭会取消活动的桥接工作，将待处理提示解析为已取消，并释放桥接会话状态。                                                                                             |
| `loadSession`                                                         | 部分支持    | 将 ACP 会话重新绑定到 Gateway 会话键，并为桥接创建的会话重放 ACP 事件账本历史。较旧/无账本的会话会回退到存储的用户/助手文本。                                                                                                       |
| 提示内容（`text`、嵌入式 `resource`、图片）                         | 部分支持    | 文本/资源会展平为聊天输入；图片会变为 Gateway 附件。                                                                                                                                                                                   |
| 会话模式                                                           | 部分支持    | 支持 `session/set_mode`；桥接层暴露由 Gateway 支持的会话控制，用于思考级别、工具详细程度、推理、使用详情和提升权限的操作。更广泛的 ACP 原生模式/配置表面仍不在范围内。                                                                 |
| 思考流式输出                                                         | 已实现      | 将模型思考内容作为 `agent_thought_chunk` 会话更新进行流式传输。不会发出 ACP 原生会话计划。                                                                                                                                            |
| 会话信息和使用量更新                                                 | 部分支持    | 桥接层会从缓存的 Gateway 会话快照发出 `session_info_update` 和尽力而为的 `usage_update` 通知。使用量为近似值，并且仅在 Gateway 令牌总数标记为最新时发送。                                                                             |
| 工具流式输出                                                         | 部分支持    | 当 Gateway 工具参数/结果暴露原始 I/O、文本内容和尽力而为的文件位置时，`tool_call`/`tool_call_update` 事件会包含这些内容。嵌入式终端和更丰富的原生 diff 输出不予暴露。                                                               |
| 执行审批                                                         | 部分支持    | 活动的 ACP 提示轮次期间，Gateway 执行审批提示会通过 `session/request_permission` 转发给 ACP 客户端。                                                                                                                               |
| 每会话 MCP 服务器（`mcpServers`）                                | 不支持      | 桥接模式会拒绝每会话 MCP 服务器请求。请在 OpenClaw Gateway 或代理上配置 MCP。                                                                                                                        |
| 客户端文件系统方法（`fs/read_text_file`, `fs/write_text_file`） | 不支持      | 桥接不会调用 ACP 客户端文件系统方法。                                                                                                                                                                               |
| 客户端终端方法（`terminal/*`）                                    | 不支持      | 桥接不会创建 ACP 客户端终端，也不会通过工具调用流式传输终端 id。                                                                                                                                          |

## 已知限制

- `loadSession` 仅对由 bridge 创建的会话回放完整的 ACP 事件账本历史。较早的/无账本会话使用 transcript 回退方式，无法重建历史工具调用或系统通知。
- 如果多个 ACP 客户端共享同一个 Gateway 会话密钥，事件和取消路由只能尽力而为，无法严格做到按客户端隔离。需要干净的编辑器本地轮次时，优先使用默认隔离的 `acp-bridge:<uuid>` 会话。
- Gateway 的停止状态会转换为 ACP 停止原因，但这种映射不如完全原生的 ACP 运行时那样丰富。
- 会话控制只暴露 Gateway 参数中的一个聚焦子集：思考级别、工具详细程度、推理、使用详情和提升操作。模型选择和 exec-host 控制不会作为 ACP 配置选项暴露出来。
- `session_info_update` 和 `usage_update` 来源于 Gateway 会话快照，而不是实时的 ACP 原生运行时计量。用量是近似值，不包含成本数据，并且只有在 Gateway 标记总 token 数据为最新时才会发出。
- 工具跟随数据属于尽力而为：bridge 会暴露在已知工具参数/结果中出现的文件路径，但不会发出 ACP 终端或结构化文件差异。
- exec 审批转发的作用范围仅限于当前活动的 ACP 提示轮次；来自其他 Gateway 会话的审批会被忽略。

## 使用方法

```bash
openclaw acp

# 远程 Gateway
openclaw acp --url wss://gateway-host:18789 --token <token>

# 远程 Gateway（从文件获取 token）
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# 附加到一个现有会话键
openclaw acp --session agent:main:main

# 按标签附加（必须已存在）
openclaw acp --session-label "support inbox"

# 在第一条提示前重置会话键
openclaw acp --session agent:main:main --reset-session
```

## ACP 客户端（调试）

使用内置的 ACP 客户端在不依赖 IDE 的情况下对桥接进行快速检查。它会启动 ACP 桥接，并允许你以交互方式输入提示。

```bash
openclaw acp client

# 将启动的桥接指向远程 Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# 覆盖服务器命令（默认：openclaw）
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

权限模型（客户端调试模式）：

- 自动批准基于允许列表，并且仅适用于受信任的核心工具 ID。
- `read` 的自动批准仅限于当前工作目录范围内（设置了 `--cwd` 时则以该目录为准）。
- ACP 仅自动批准窄范围的只读类别：在当前 `cwd` 范围内的 `read` 调用，以及只读搜索工具（`search`、`web_search`、`memory_search`）。未知/非核心工具、超出范围的读取、具备执行能力的工具、控制平面工具、会修改状态的工具以及交互式流程，始终需要显式的提示批准。
- 服务器提供的 `toolCall.kind` 被视为不受信任的元数据，而不是授权来源。
- 此 ACP 桥接策略与 ACPX harness 权限是分开的。如果你通过 `acpx` 后端运行 OpenClaw，`plugins.entries.acpx.config.permissionMode=approve-all` 是该 harness 会话的紧急“yolo”开关。

## 协议冒烟测试

对于协议级调试，请使用隔离状态启动一个 Gateway，并通过 stdio 结合 ACP JSON-RPC 客户端驱动 `openclaw acp`。覆盖 `initialize`、`session/new`、带有绝对 `cwd` 的 `session/list`、`session/resume`、`session/close`、重复关闭以及缺失恢复。

证明材料应包含所宣告的生命周期能力、一个由 Gateway 支持的会话行、更新通知，以及 Gateway 的 `sessions.list` 日志：

```json
{
  "initialize": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "sessionCapabilities": {
        "list": {},
        "resume": {},
        "close": {}
      }
    }
  },
  "listSessions": {
    "sessions": [
      {
        "sessionId": "agent:main:acp-smoke",
        "cwd": "/path/to/workspace",
        "_meta": {
          "sessionKey": "agent:main:acp-smoke",
          "kind": "direct"
        }
      }
    ],
    "nextCursor": null
  },
  "notifications": ["session_info_update", "available_commands_update", "usage_update"],
  "gatewayLogTail": ["[gateway] ready", "[ws] ⇄ res ✓ sessions.list 305ms"]
}
```

不要将 `openclaw gateway call sessions.list` 作为唯一的 ACP 证明。该 CLI 路径可能会请求一次 fresh-token operator scope 升级；ACP bridge 的正确性应通过 ACP 的 stdio 帧以及 Gateway 的 `sessions.list` 日志来证明。

## 如何使用

当 IDE（或其他客户端）使用 Agent Client Protocol 进行通信，并且你希望它驱动一个 OpenClaw Gateway 会话时，请使用 ACP。

1. 确保 Gateway 正在运行（本地或远程）。
2. 配置 Gateway 目标（配置或标志）。
3. 让你的 IDE 通过 stdio 运行 `openclaw acp`。

示例配置（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

示例直接运行（不写入配置）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# 当本地进程安全时推荐
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 选择 agent

ACP 不会直接选择 agent。它通过 Gateway 会话密钥进行路由。使用按 agent 作用域划分的会话密钥来定位特定 agent：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话都会映射到一个单独的 Gateway 会话密钥。一个 agent 可以拥有多个会话；除非你覆盖该密钥或标签，否则 ACP 默认使用隔离的 `acp-bridge:<uuid>` 会话。

桥接模式不支持按会话设置的 `mcpServers`。如果 ACP 客户端在 `newSession` 或 `loadSession` 期间发送它们，桥接层会返回清晰的错误，而不是静默忽略它们。

如果你希望基于 ACPX 的会话能够看到 OpenClaw 插件工具或某些选定的内置工具（例如 `cron`），请在 gateway 侧启用 ACPX MCP 桥接，而不是尝试传递按会话设置的 `mcpServers`。参见 [ACP Agents](/tools/acp-agents-setup#plugin-tools-mcp-bridge) 和 [OpenClaw tools MCP bridge](/tools/acp-agents-setup#openclaw-tools-mcp-bridge)。

## 从 `acpx` 使用（Codex、Claude 及其他 ACP 客户端）

如果你希望 Codex 或 Claude Code 这样的编码代理通过 ACP 与你的 OpenClaw bot 交互，请使用带有内置 `openclaw` 目标的 `acpx`。

典型流程：

1. 运行 Gateway，并确保 ACP bridge 可以访问它。
2. 将 `acpx openclaw` 指向 `openclaw acp`。
3. 指定你希望编码代理使用的 OpenClaw 会话键。

示例：

```bash
# 向默认的 OpenClaw ACP 会话发起一次性请求
acpx openclaw exec "总结当前 OpenClaw 会话状态。"

# 用于后续轮次的持久命名会话
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "让我的 OpenClaw 工作代理提供与此仓库相关的最新上下文。"
```

如果你希望 `acpx openclaw` 每次都指向特定的 Gateway 和会话键，可以在 `~/.acpx/config.json` 中覆盖 `openclaw` 代理命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

对于仓库本地的 OpenClaw 检出版本，请直接使用 CLI 入口点，而不是 dev runner，这样 ACP 流会保持干净：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

这是让 Codex、Claude Code 或其他支持 ACP 的客户端无需抓取终端内容，就能从 OpenClaw 代理中获取上下文信息的最简单方式。

## Zed 编辑器设置

在 `~/.config/zed/settings.json` 中添加一个自定义 ACP agent（或使用 Zed 的设置界面）：

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

要指定特定的 Gateway 或代理：

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

在 Zed 中，打开 Agent 面板并选择 "OpenClaw ACP" 以启动线程。

## 会话映射

默认情况下，ACP bridge 会话会获得一个带有 `acp-bridge:` 前缀的隔离 Gateway 会话键。这些普通模型 bridge 会话是合成的且可丢弃：它们会受到过期条目清理的影响，并且不被视为受保护的人工对话界面。若要复用一个已知会话，请传入会话键或标签：

- `--session <key>`：使用特定的 Gateway 会话键。
- `--session-label <label>`：通过标签解析现有会话。
- `--reset-session`：为该键生成一个新的会话 id（相同的键，新的记录）。

如果你的 ACP 客户端支持元数据，可以按会话覆盖：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

在 [/concepts/session](/concepts/session) 了解更多关于会话键的信息。

## 选项

- `--url <url>`: Gateway WebSocket URL（未配置时默认为 `gateway.remote.url`）。
- `--token <token>`: Gateway 认证令牌。
- `--token-file <path>`: 从文件中读取 Gateway 认证令牌。
- `--password <password>`: Gateway 认证密码。
- `--password-file <path>`: 从文件中读取 Gateway 认证密码。
- `--session <key>`: 默认会话键。
- `--session-label <label>`: 要解析的默认会话标签。
- `--require-existing`: 如果会话键/标签不存在则失败。
- `--reset-session`: 在首次使用前重置会话键。
- `--no-prefix-cwd`: 不要在提示中添加工作目录前缀。
- `--provenance <off|meta|meta+receipt>`: 包含 ACP provenance 元数据或收据。
- `--verbose, -v`: 将详细日志输出到 stderr。

安全提示：

- `--token` 和 `--password` 在某些系统上可能会在本地进程列表中可见。建议优先使用 `--token-file`/`--password-file` 或环境变量（`OPENCLAW_GATEWAY_TOKEN`、`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 认证解析遵循其他 Gateway 客户端使用的共享契约：
  - 本地模式：先使用 env（`OPENCLAW_GATEWAY_*`），再使用 `gateway.auth.*`；仅当 `gateway.auth.*` 未设置时才回退到 `gateway.remote.*`（已配置但未解析的本地 SecretRef 会直接失败，而不会静默回退）
  - 远程模式：使用 `gateway.remote.*`，并根据远程优先级规则回退到 env/config
  - `--url` 可安全覆盖配置，不会复用隐式配置/env 凭据；请显式传入 `--token`/`--password`（或文件变体）

### `acp client` 选项

- `--cwd <dir>`: ACP 会话的工作目录。
- `--server <command>`: ACP 服务器命令（默认：`openclaw`）。
- `--server-args <args...>`: 传递给 ACP 服务器的额外参数。
- `--server-verbose`: 启用 ACP 服务器上的详细日志。
- `--verbose, -v`: 详细的客户端日志。
- `openclaw acp client` 会在启动的桥接进程上设置 `OPENCLAW_SHELL=acp-client`，可用于特定上下文的 shell/profile 规则。

## 相关内容

- [CLI 参考](/cli)
- [ACP 代理](/tools/acp-agents)
