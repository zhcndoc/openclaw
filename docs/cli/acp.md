---
summary: "运行 ACP 桥接以实现 IDE 集成"
read_when:
  - 设置基于 ACP 的 IDE 集成
  - 调试 ACP 会话路由到 Gateway
title: "ACP"
---

运行与 OpenClaw Gateway 通信的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 桥接。

该命令通过 stdio 与 IDE 交互 ACP，并通过 WebSocket 将提示转发到 Gateway。  
它保持 ACP 会话与 Gateway 会话密钥的映射。

`openclaw acp` 是一个由 Gateway 支持的 ACP 桥接，而非完整的 ACP 原生编辑器运行时。它专注于会话路由、提示交付和基本的流式更新。

如果你希望外部 MCP 客户端直接与 OpenClaw 频道对话而不是托管 ACP harness 会话，请改用 [`openclaw mcp serve`](/cli/mcp)。

## 这不是什么

此页面常与 ACP harness 会话混淆。

`openclaw acp` 表示：

- OpenClaw 充当 ACP 服务器
- IDE 或 ACP 客户端连接到 OpenClaw
- OpenClaw 将该工作转发到 Gateway 会话

这与 [ACP 代理](/tools/acp-agents) 不同，后者通过 `acpx` 运行外部 harness（如 Codex 或 Claude Code）。

快速规则：

- 编辑器/客户端希望与 OpenClaw 进行 ACP 通信：使用 `openclaw acp`
- OpenClaw 应将 Codex/Claude/Gemini 作为 ACP harness 启动：使用 `/acp spawn` 和 [ACP 代理](/tools/acp-agents)

## 兼容性矩阵

| ACP 区域                                                              | 状态      | 备注                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `initialize`, `newSession`, `prompt`, `cancel`                        | 已实现 | 通过 stdio 到 Gateway chat/send + abort 的核心桥接流程。                                                                                                                                                                                        |
| `listSessions`, slash commands                                        | 已实现 | 会话列表针对 Gateway 会话状态工作；命令通过 `available_commands_update` 通告。                                                                                                                                       |
| `loadSession`                                                         | 部分支持     | 将 ACP 会话重新绑定到 Gateway 会话密钥并重放存储的用户/助手文本历史。工具/系统历史尚未重建。                                                                                                   |
| 提示内容（`text`，嵌入式 `resource`，图片）                  | 部分支持     | 文本/资源被扁平化为聊天输入；图片变为 Gateway 附件。                                                                                                                                                                 |
| 会话模式                                                         | 部分支持     | 支持 `session/set_mode`，桥接公开初始的 Gateway 支持会话控制，包括思考级别、工具详细程度、推理、使用详情和提权操作。更广泛的 ACP 原生模式/配置表面仍超出范围。 |
| 会话信息和使用情况更新                                        | 部分支持     | 桥接从缓存的 Gateway 会话快照发出 `session_info_update` 和尽力而为的 `usage_update` 通知。使用情况是近似的，仅当 Gateway 标记 token 总数为新鲜时发送。                                        |
| 工具流式传输                                                        | 部分支持     | `tool_call` / `tool_call_update` 事件包括原始 I/O、文本内容，以及当 Gateway 工具参数/结果暴露时的尽力而为的文件位置。嵌入式终端和更丰富的 diff 原生输出尚未暴露。                        |
| 每会话 MCP 服务器（`mcpServers`）                                | 不支持 | 桥接模式拒绝每会话 MCP 服务器请求。请在 OpenClaw gateway 或 agent 上配置 MCP。                                                                                                                                     |
| 客户端文件系统方法（`fs/read_text_file`, `fs/write_text_file`） | 不支持 | 桥接不调用 ACP 客户端文件系统方法。                                                                                                                                                                                          |
| 客户端终端方法（`terminal/*`）                                | 不支持 | 桥接不创建 ACP 客户端终端或通过工具调用流式传输终端 id。                                                                                                                                                       |
| 会话计划 / 思考流式传输                                     | 不支持 | 桥接当前发出输出文本和工具状态，而非 ACP 计划或思考更新。                                                                                                                                                         |

## 已知限制

- `loadSession` 重放存储的用户和助手文本历史，但不重建历史工具调用、系统通知或更丰富的 ACP 原生事件类型。
- 如果多个 ACP 客户端共享相同的 Gateway 会话密钥，事件和取消路由是尽力而为的，而不是严格按客户端隔离。当需要干净的编辑器本地回合时，首选默认的隔离 `acp:<uuid>` 会话。
- Gateway 停止状态被转换为 ACP 停止原因，但该映射不如完全 ACP 原生运行时具有表现力。
- 初始会话控制当前公开 Gateway 旋钮的聚焦子集：思考级别、工具详细程度、推理、使用详情和提权操作。模型选择和 exec-host 控制尚未作为 ACP 配置选项公开。
- `session_info_update` 和 `usage_update` 源自 Gateway 会话快照，而非实时 ACP 原生运行时核算。使用情况是近似的，不包含成本数据，仅当 Gateway 标记总 token 数据为新鲜时发出。
- 工具跟随数据是尽力而为。桥接可以显示已知工具参数/结果中出现的文件路径，但尚未发出 ACP 终端或结构化文件差异。

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
- `read` 自动批准限定于当前工作目录（设置 `--cwd` 时）。
- ACP 仅自动批准有限的只读类别：活动工作目录下的作用域 `read` 调用以及只读搜索工具（`search`, `web_search`, `memory_search`）。未知/非核心工具、超出范围的读取、可执行工具、控制平面工具、变更工具以及交互流程始终需要明确的提示批准。
- 服务器提供的 `toolCall.kind` 被视为不可信元数据（而非授权来源）。
- 此 ACP 桥接策略独立于 ACPX harness 权限。如果你通过 `acpx` 后端运行 OpenClaw，`plugins.entries.acpx.config.permissionMode=approve-all` 是该 harness 会话的应急（"yolo"）开关。

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

如果你希望由 ACPX 支持的会话看到 OpenClaw 插件工具或选定的
内置工具（如 `cron`），请启用 gateway 端的 ACPX MCP 桥接，
而不要尝试传递每会话 `mcpServers`。参见
[ACP 代理](/tools/acp-agents-setup#plugin-tools-mcp-bridge) 和
[OpenClaw 工具 MCP 桥接](/tools/acp-agents-setup#openclaw-tools-mcp-bridge)。

## 从 acpx 使用（Codex, Claude, 其他 ACP 客户端）

如果你希望诸如 Codex 或 Claude Code 之类的编码代理通过 ACP 与你的 OpenClaw 机器人对话，请使用 `acpx` 及其内置的 `openclaw` 目标。

典型流程：

1. 运行 Gateway 并确保 ACP 桥接可以访问它。
2. 将 `acpx openclaw` 指向 `openclaw acp`。
3. 定位你希望编码代理使用的 OpenClaw 会话密钥。

示例：

```bash
# 向默认 OpenClaw ACP 会话发送一次性请求
acpx openclaw exec "总结当前 OpenClaw 会话状态。"

# 用于后续交互的持久化命名会话
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "向我的 OpenClaw 工作代理询问与此仓库相关的最近上下文。"
```

如果你希望 `acpx openclaw` 每次都定位特定的 Gateway 和会话密钥，请在 `~/.acpx/config.json` 中覆盖 `openclaw` 代理命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

对于 repo 本地的 OpenClaw checkout，使用直接 CLI 入口点而不是开发运行器，以保持 ACP 流干净。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

这是让 Codex、Claude Code 或其他支持 ACP 的客户端从 OpenClaw 代理获取上下文信息而不抓取终端的最简单方法。

## Zed 编辑器设置

在 `~/.config/zed/settings.json` 中添加自定义 ACP 代理（或使用 Zed 的设置 UI）：

```json
{
  "agent_servers": {
    "OpenClaw ACP 代理": {
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
    "OpenClaw ACP 代理": {
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

在 Zed 中打开代理面板，选择"OpenClaw ACP 代理”启动线程。

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

- `--url <url>`：Gateway WebSocket URL（配置后默认为 gateway.remote.url）。
- `--token <token>`：Gateway 认证令牌。
- `--token-file <path>`：从文件读取 Gateway 认证令牌。
- `--password <password>`：Gateway 认证密码。
- `--password-file <path>`：从文件读取 Gateway 认证密码。
- `--session <key>`：默认会话密钥。
- `--session-label <label>`：要解析的默认会话标签。
- `--require-existing`：如果会话密钥/标签不存在则失败。
- `--reset-session`：首次使用前重置会话密钥。
- `--no-prefix-cwd`：不在提示前添加工作目录前缀。
- `--provenance <off|meta|meta+receipt>`：包含 ACP 来源元数据或收据。
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
- `--server-args <args...>`：传递给 ACP 服务器的额外参数。
- `--server-verbose`：在 ACP 服务器上启用详细日志。
- `--verbose, -v`：详细的客户端日志。

## 相关内容

- [CLI 参考](/cli)
- [ACP 代理](/tools/acp-agents)
