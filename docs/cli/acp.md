---
summary: "为 IDE 集成运行 ACP 桥接"
read_when:
  - "设置基于 ACP- 的 IDE 集成"
  - "调试 ACP 会话路由到 Gateway"
title: "ACP"
---

运行与 OpenClaw 网关通信的 [Agent 客户端协议 （ACP）](https://agentclientprotocol.com/) 桥接器。

`openclaw acp` 通过 IDE 的 stdio 说出 ACP，并通过 WebSocket 将提示转发到网关，保持 ACP 会话映射到网关会话密钥。它是一个网关支持的 ACP 桥接器，而不是完整的 ACP-native 编辑器运行时：它专注于会话路由、提示交付和流式更新。

如果你希望外部 MCP 客户端直接与 OpenClaw channel 对话，而不是托管一个 ACP harness 会话，请改用 [`openclaw mcp serve`](/cli/mcp)。

## <a id="what-this-is-not"></a> 这不是做什么

`openclaw acp` 意味着 OpenClaw 作为一个 ACP 服务器运行：一个 IDE 或 ACP 客户端连接到 OpenClaw，然后 OpenClaw 将该工作转发到一个 Gateway 会话中。

这与 [ACP Agents](/tools/acp-agents) 不同，在后者中，OpenClaw 通过 `acpx` 运行诸如 Codex 或 Claude Code 之类的外部 harness。

快速规则：

- editor/client 想要与 ACP 对话 OpenClaw：使用 `openclaw acp`
- OpenClaw 应该启动 Codex/Claude/Gemini 作为 ACP harness：使用 `/acp spawn` 和 [ACP Agents](/tools/acp-agents)

## <a id="compatibility-matrix"></a> 兼容性矩阵

| ACP 区域                                                              | 状态      | 笔记                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                        | 已实现 | 通过 stdio 到 Gateway chat/send + abort 的核心桥接流程。                                                                                                                                                                             |
| `listSessions`，斜杠命令                                        | 已实现 | 会话列表可基于 Gateway 会话状态工作，支持有界游标分页和 `cwd` 过滤，其中 Gateway 会话行携带工作区元数据；命令通过 `available_commands_update` 进行通告。                     |
| 会话血缘元数据                                              | 已实现 | 会话列表和会话信息快照在 `_meta` 中包含 OpenClaw 的父子血缘关系，因此 ACP 客户端可以在不依赖私有 Gateway 侧通道的情况下渲染子代理图。                                                     |
| `resumeSession`, `closeSession`                                       | 已实现 | 恢复会将 ACP 会话重新绑定到现有的 Gateway 会话，而不会重放历史。关闭会取消活动的桥接工作，将待处理提示解析为已取消，并释放桥接会话状态。                                   |
| `loadSession`                                                         | 部分支持     | 将 ACP 会话重新绑定到网关会话密钥，并重播桥创建的会话的 ACP 事件分类帐历史记录。 Older/no-ledger 会话回退到存储的 user/assistant 文本。                                                  |
| 提示内容（`text`、嵌入`resource`、图片）                  | 部分支持     | Text/resources 扁平化为聊天输入；图像成为网关附件。                                                                                                                                                            |
| 会话模式                                                         | 部分支持     | 支持`session/set_mode`；该桥公开了网关支持的会话控制，用于思想水平、工具冗长、推理、使用细节和高级操作。更宽的 ACP-native mode/config 表面仍然超出范围。 |
| 思想流动                                                     | 已实现 | 模型思维内容随着 `agent_thought_chunk` 会话更新而流动。 ACP-native 会话计划未发出。                                                                                                                    |
| 会话信息和使用量更新                                        | 部分支持     | 桥接层会从缓存的 Gateway 会话快照发出 `session_info_update` 和尽力而为的 `usage_update` 通知。使用量为近似值，并且仅在 Gateway 令牌总数标记为最新时发送。                             |
| 工具流                                                        | 部分支持     | `tool_call`/`tool_call_update`事件包括原始事件I/O、文本内容和使用网关工具时的尽力而为文件位置args/results揭露他们。嵌入式终端和更丰富的 diff-native 输出不会暴露。                     |
| 执行批准                                                        | 部分支持     | 活动的 ACP 提示轮次期间，Gateway 执行审批提示会通过 `session/request_permission` 转发给 ACP 客户端。                                                                                                               |
| 每会话 MCP 服务器 （`mcpServers`）                                | 不支持 | 桥接模式拒绝每个会话 MCP 服务器请求。请改为在 OpenClaw 网关或代理上配置 MCP。                                                                                                                          |
| 客户端文件系统方法（`fs/read_text_file`, `fs/write_text_file`） | 不支持 | 桥接不会调用 ACP 客户端文件系统方法。                                                                                                                                                                               |
| 客户端终端方法（`terminal/*`）                                | 不支持 | 桥接不会创建 ACP 客户端终端，也不会通过工具调用流式传输终端 id。                                                                                                                                            |

可见的助手文本显示为仅附加的 `agent_message_chunk` 更新，包括工具调用之前的旁白和之后的答案。当工具或推理到达时，没有明确文本阶段的提供者不会追溯性地重新分类早期文本。显式的 OpenAI 响应和和声 commentary/final 阶段保持不同，因此叙述会被保留一次，最终答案会完全流动。推理可见性和私有标签过滤仍然适用。

## <a id="known-limitations"></a> 已知限制

- ACP v1 无法撤回或替换已显示的文本。同一项目的重复快照仅附加扩展显示文本的后缀；不兼容的重写将被忽略，而不是作为重复的旁白重播。
- `loadSession` 仅针对桥创建的会话重播完整的 ACP 事件分类帐历史记录。 Older/no-ledger 会话使用脚本回退，并且不重建历史工具调用或系统通知。重播历史记录受会话、事件和保留内容限制；默认字节预算是 UTF-8 文本的 16 MiB 加上行开销。截断的历史记录也使用转录后备。参见[ACP重播记账](/reference/database-schemas#acp-replay-accounting)。
- 如果多个 ACP 客户端共享同一个 Gateway 会话密钥，事件和取消路由只能尽力而为，无法严格做到按客户端隔离。需要干净的编辑器本地轮次时，优先使用默认隔离的 `acp-bridge:<uuid>` 会话。
- Gateway 停止状态转换为 ACP 停止原因，但该映射的表现力不如完整的 ACP-native 运行时。
- 会话控制只暴露 Gateway 参数中的一个聚焦子集：思考级别、工具详细程度、推理、使用详情和提升操作。模型选择和 exec-host 控制不会作为 ACP 配置选项暴露出来。
- `session_info_update` 和 `usage_update` 源自网关会话快照，而不是实时 ACP-native 运行时记帐。使用量是近似的，不携带成本数据，并且仅当网关将总令牌数据标记为新鲜时才发出。
- Tool 后续数据是尽力而为：桥接显示已知工具 args/results 中出现的文件路径，但不会发出 ACP 终端或结构化文件差异。
- exec 审批转发的作用范围仅限于当前活动的 ACP 提示轮次；来自其他 Gateway 会话的审批会被忽略。

## <a id="usage"></a> 用法

```bash
openclaw acp

# Remote Gateway
openclaw acp --url wss://gateway-host:18789 --token <token>

# Remote Gateway (token from file)
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Attach to an existing session key
openclaw acp --session agent:main:main

# Attach by label (must already exist)
openclaw acp --session-label "support inbox"

# Reset the session key before the first prompt
openclaw acp --session agent:main:main --reset-session
```

## <a id="acp-client-(debug)"></a><a id="acp-client-debug"></a> ACP 客户端（调试）

使用内置的 ACP 客户端在不依赖 IDE 的情况下对桥接进行快速检查。它会启动 ACP 桥接，并允许你以交互方式输入提示。

建立会话后，服务器信号意外退出导致客户端退出，状态为 `1`。当通过信号停止服务器时，显式 `exit` 或 `quit` 仍然保持成功。传播数字服务器退出代码，包括显式退出期间返回的非零代码。关闭交互式输入，包括在空提示符下按 Ctrl-D，使用相同的客户端拥有的关闭路径；它不会等待飞行中的响应完成。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

权限模型（客户端调试模式）：

- 自动批准基于白名单，仅适用于受信任的核心工具 ID。
- `read` 的自动批准仅限于当前工作目录范围内（设置了 `--cwd` 时则以该目录为准）。
- ACP 仅自动批准窄只读类：活动 cwd 下的作用域 `read` 调用，以及只读搜索工具（`search`、`web_search`、`memory_search`）。 Unknown/non-core 工具、超出范围的读取、可执行工具、控制平面工具、变异工具和交互流始终需要明确的提示批准。
- 服务器提供的 `toolCall.kind` 被视为不受信任的元数据，而不是授权来源。
- 该 ACP 桥接策略与 ACPX harness 权限是分开的。如果你通过 `acpx` 后端运行 OpenClaw，`plugins.entries.acpx.config.permissionMode=approve-all` 是该 harness 会话的紧急“yolo”开关。

## <a id="protocol-smoke-testing"></a> 协议冒烟测试

对于协议级调试，启动具有隔离状态的网关，并使用 ACP JSON-RPC 客户端通过 stdio 驱动 `openclaw acp`。覆盖 `initialize`、`session/new`、`session/list` 与绝对 `cwd`、`session/resume`、`session/close`、重复关闭和丢失简历。

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

## <a id="how-to-use-this"></a> 如何使用

当 IDE（或其他客户端）使用 Agent Client Protocol 并且您希望它驱动 OpenClaw 网关会话时，请使用 ACP。

1. 检查网关是否正在运行（本地或远程）。
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
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## <a id="selecting-agents"></a> 选择 agent

ACP 不会直接选择 agent。它通过 Gateway 会话密钥进行路由。使用按 agent 作用域划分的会话密钥来定位特定 agent：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话都会映射到一个单独的 Gateway 会话密钥。一个 agent 可以拥有多个会话；除非你覆盖该密钥或标签，否则 ACP 默认使用隔离的 `acp-bridge:<uuid>` 会话。

桥接模式不支持按会话设置的 `mcpServers`。如果 ACP 客户端在 `newSession` 或 `loadSession` 期间发送它们，桥接层会返回清晰的错误，而不是静默忽略它们。

如果您希望 ACPX- 支持的会话看到 OpenClaw 插件工具或选定的内置工具（例如 `cron`），请启用网关端 ACPX MCP 桥接，而不是尝试传递每个会话 `mcpServers`。请参见 [ACP Agents](/tools/acp-agents-setup#plugin-tools-mcp-bridge) 和 [OpenClaw 工具 MCP 桥 ](/tools/acp-agents-setup#openclaw-tools-mcp-bridge)。

## <a id="use-from-acpx-(codex%2C-claude%2C-other-acp-clients)"></a><a id="use-from-acpx-codex-claude-other-acp-clients"></a> 从 `acpx` 使用（Codex、Claude 及其他 ACP 客户端）

如果您希望 Codex 或 Claude Code 等编码代理通过 ACP 与 OpenClaw 机器人对话，请使用 `acpx` 及其内置 `openclaw` 目标。

这里的`acpx`是与npm分开的`acpx` CLI，安装在运行编码代理的机器上。它与 [ACP Agents](/tools/acp-agents-setup#plugin-setup-for-acpx-backend) 中描述的 `@openclaw/acpx` OpenClaw 插件不同，后者将 ACP 运行时嵌入网关中，并且不安装 `acpx` 二进制文件。

典型流程：

1. 在编码代理的机器上安装 `acpx` CLI 并运行网关，确保 ACP 桥可以到达它。
2. 将 `acpx openclaw` 指向 `openclaw acp`。
3. 指定你希望编码代理使用的 OpenClaw 会话键。

示例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都针对特定网关和会话密钥，请覆盖 `~/.acpx/config.json` 中的 `openclaw` 代理命令：

```json validate=false
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

这是让 Codex、Claude Code 或另一个 ACP-aware 客户端从 OpenClaw 代理提取上下文信息而无需抓取终端的最简单方法。

## <a id="zed-editor-setup"></a> Zed 编辑器设置

在`~/.config/zed/settings.json`中添加自定义ACP代理（或使用Zed的设置UI）：

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

## <a id="session-mapping"></a> 会话映射

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

了解有关会话密钥的更多信息，请访问 [/concepts/session](/concepts/session).

## <a id="options"></a> 选项

- `--url <url>`：Gateway WebSocket URL（未配置时默认为 `gateway.remote.url`）。
- `--token <token>`：Gateway 认证令牌。
- `--token-file <path>`：从文件中读取 Gateway 认证令牌。
- `--password <password>`：Gateway 认证密码。
- `--password-file <path>`：从文件中读取 Gateway 认证密码。
- `--session <key>`：默认会话键。
- `--session-label <label>`：要解析的默认会话标签。
- `--require-existing`：如果会话key/label不存在，则失败。
- `--reset-session`：在首次使用前重置会话键。
- `--no-prefix-cwd`：不要在提示中添加工作目录前缀。
- `--provenance <off|meta|meta+receipt>`：包含 ACP provenance 元数据或收据。
- `--verbose, -v`：将详细日志输出到 stderr。

安全提示：

- `--token` 和 `--password` 在某些系统上可能会在本地进程列表中可见。建议优先使用 `--token-file`/`--password-file` 或环境变量（`OPENCLAW_GATEWAY_TOKEN`、`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 认证解析遵循其他 Gateway 客户端使用的共享契约：
  - local 模式：`gateway.auth.*` 然后 env （`OPENCLAW_GATEWAY_*`），仅当 `gateway.auth.*` 未设置时回退到 `gateway.remote.*`（已配置但未解析的本地 SecretRef 停止身份验证而不是静默回退）
  - 远程模式：`gateway.remote.*`，根据远程优先规则进行 env/config 回退
  - `--url` 是覆盖安全的，不会重用隐式 config/env 凭证；传递显式 `--token`/`--password` （或文件变体）

### <a id="acp-client-options"></a> `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。
- `--server <command>`：ACP 服务器命令（默认：`openclaw`）。
- `--server-args <args...>`：传递给 ACP 服务器的额外参数。
- `--server-verbose`：启用 ACP 服务器上的详细日志。
- `--verbose, -v`：详细的客户端日志。
- `openclaw acp client` 会在启动的桥接进程上设置 `OPENCLAW_SHELL=acp-client`，可用于特定上下文的 shell/profile 规则。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [ACP 代理](/tools/acp-agents)
