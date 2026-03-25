---
summary: "为 Pi、Claude Code、Codex、OpenCode、Gemini CLI 以及其他 harness 代理使用 ACP 运行时会话"
read_when:
  - 通过 ACP 运行编码 harness
  - 在支持线程的频道上设置线程绑定的 ACP 会话
  - 将 Discord 频道或 Telegram 论坛话题绑定到持久的 ACP 会话
  - 排查 ACP 后端和插件连线问题
  - 操作聊天中的 /acp 命令
title: "ACP 代理"
---

# ACP 代理

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话允许 OpenClaw 通过 ACP 后端插件运行外部编码 harness（例如 Pi、Claude Code、Codex、OpenCode 和 Gemini CLI）。

如果你用自然语言请求 OpenClaw “在 Codex 中运行这个”或者“在线程中启动 Claude Code”，OpenClaw 应该将该请求路由到 ACP 运行时（而非本地子代理运行时）。

## 快速操作流程

需要实用的 `/acp` 使用步骤时，请按如下流程：

1. 创建会话：
   - `/acp spawn codex --mode persistent --thread auto`
2. 在绑定的线程内工作（或显式指定目标会话键）。
3. 查看运行时状态：
   - `/acp status`
4. 根据需要调整运行时选项：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 在不替换上下文的情况下推动活动会话：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel`（停止当前回合），或
   - `/acp close`（关闭会话并解除绑定）

## 人类快速入门

自然请求示例：

- “在这里的线程中启动一个持久的 Codex 会话并保持专注。”
- “作为一次性 Claude Code ACP 会话运行这段代码并总结结果。”
- “针对这项任务使用 Gemini CLI 在线程中运行，然后在同一线程保持后续交互。”

OpenClaw 应该执行的操作：

1. 选择 `runtime: "acp"`。
2. 解析请求的 harness 目标（`agentId`，例如 `codex`）。
3. 如果请求线程绑定且当前频道支持，则将 ACP 会话绑定到该线程。
4. 将后续的线程消息路由到同一 ACP 会话，直到取消专注、关闭或过期。

## ACP 与子代理的区别

当需要外部 harness 运行时使用 ACP；需要 OpenClaw 原生委托运行时使用子代理。

| 区域     | ACP 会话                          | 子代理运行                        |
| -------- | --------------------------------- | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）         | OpenClaw 原生子代理运行时         |
| 会话键   | `agent:<agentId>:acp:<uuid>`      | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                        | `/subagents ...`                  |
| 启动工具 | `sessions_spawn`，`runtime:"acp"` | `sessions_spawn`（默认运行时）    |

另见 [子代理](/tools/subagents)。

## 线程绑定会话（频道无关）

当某频道适配器启用线程绑定时，ACP 会话可以绑定到线程：

- OpenClaw 将线程绑定到目标 ACP 会话。
- 该线程中的后续消息路由到绑定的 ACP 会话。
- ACP 输出返回到同一线程。
- 失焦／关闭／归档／空闲超时或最大存活期后解除绑定。

线程绑定支持依赖适配器。如果当前频道适配器不支持线程绑定，OpenClaw 会返回明确的“不支持/不可用”消息。

线程绑定 ACP 所需的功能开关：

- `acp.enabled=true`
- `acp.dispatch.enabled` 默认为开启状态（设为 `false` 可暂停 ACP 分派）
- 频道适配器的 ACP 线程启动标志（适配器特定）
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### 支持线程的频道

- 任何暴露会话/线程绑定能力的频道适配器。
- 当前内置支持：
  - Discord 线程／频道
  - Telegram 话题（群组/超级群组的论坛话题和私聊话题）
- 插件频道可通过相同绑定接口添加支持。

## 频道特定设置

对于非临时工作流，在顶层 `bindings[]` 条目中配置持久的 ACP 绑定。

### 绑定模型

- `bindings[].type="acp"` 表示持久的 ACP 会话绑定。
- `bindings[].match` 标识目标会话：
  - Discord 频道或线程：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 论坛话题：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` 是所属 OpenClaw 代理 ID。
- 可选 ACP 覆盖配置位于 `bindings[].acp` 下：
  - `mode`（`persistent` 或 `oneshot`）
  - `label`
  - `cwd`
  - `backend`

### 每代理的运行时默认值

用 `agents.list[].runtime` 为每个代理定义 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent`（harness ID，如 `codex` 或 `claude`）
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

ACP 绑定会话的覆盖优先级：

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全局 ACP 默认值（例如 `acp.backend`）

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

行为：

- OpenClaw 在使用前确保配置的 ACP 会话存在。
- 该频道或话题中的消息路由到该配置的 ACP 会话。
- 在绑定的会话中，`/new` 和 `/reset` 会在原地重置该 ACP 会话键。
- 临时运行时绑定（例如由线程聚焦流程创建）仍然生效。

## 启动 ACP 会话（接口）

### 通过 `sessions_spawn`

用 `runtime: "acp"` 从代理回合或工具调用启动 ACP 会话。

```json
{
  "task": "打开仓库并总结失败的测试",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

说明：

- `runtime` 默认为 `subagent`，所以必须显式设置 `runtime: "acp"` 来启用 ACP 会话。
- 如果遗漏 `agentId`，OpenClaw 将使用配置中的 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 以保持持久绑定的对话。

接口详情：

- `task`（必需）：发送给 ACP 会话的初始提示。
- `runtime`（ACP 必填）：必须是 `"acp"`。
- `agentId`（可选）：ACP 目标 harness ID。若未指定，使用 `acp.defaultAgent`（若设定）。
- `thread`（可选，默认 `false`）：请求在线程绑定流程中运行（若支持）。
- `mode`（可选）：`run`（一次性）或 `session`（持久）。
  - 默认是 `run`
  - 若 `thread: true` 且未注明，OpenClaw 根据运行时路径可能默认持久化行为
  - `mode: "session"` 需要 `thread: true`
- `cwd`（可选）：请求运行时工作目录（由后端/运行时策略验证）。
- `label`（可选）：操作员界面展示的标签，显示于会话标题或横幅。
- `resumeSessionId`（可选）：恢复现有 ACP 会话而非创建新会话。代理会通过 `session/load` 回放对话历史。必须与 `runtime: "acp"` 一起使用。
- `streamTo`（可选）："parent" 会将初始 ACP 运行进度摘要作为系统事件流回请求者会话。
  - 可用时，响应包含 `streamLogPath` 指向会话范围内的 JSONL 日志（格式 `<sessionId>.acp-stream.jsonl`），你可以跟踪完全转发的历史。

### 恢复现有会话

使用 `resumeSessionId` 继续先前的 ACP 会话而不是启动新的。代理通过 `session/load` 回放历史，以完整上下文继续对话。

```json
{
  "task": "继续上次进度 —— 修复剩余测试失败",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常见用例：

- 从笔记本切换到手机继续 Codex 会话，指示代理接续之前的上下文
- 从交互式 CLI 续接一个编码会话，转为无头通过代理运行
- 恢复被网关重启或闲置超时中断的工作

说明：

- `resumeSessionId` 需要 `runtime: "acp"`，与子代理运行时不兼容，会返回错误。
- 恢复会话时，`thread` 和 `mode` 正常生效，且 `mode: "session"` 仍要求 `thread: true`。
- 目标代理须支持 `session/load`（Codex 和 Claude Code 已支持）。
- 找不到指定的会话 ID 会导致启动失败并返回明确错误，不会静默退回到新会话。

### 操作员冒烟测试

网关部署后，想快速测试 ACP `spawn` 端到端正常工作，而不仅是单元测试通过时，可执行此操作：

推荐流程：

1. 核实目标主机上部署的网关版本/提交。
2. 确认部署源码包含 ACP 相关代码（例如 `src/gateway/sessions-patch.ts` 中的 `subagent:* or acp:* sessions`）。
3. 打开一个临时 ACPX 桥接会话连接到活跃代理（例：`razor(main)` 在 `jpclawhq`）。
4. 请求该代理调用 `sessions_spawn`，参数：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - `task`: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 验证代理返回：
   - `accepted=yes`
   - 实际存在的 `childSessionKey`
   - 无校验错误
6. 清理临时 ACLX 桥接会话。

给活跃代理的示例提示：

```text
使用 sessions_spawn 工具，runtime: "acp"，agentId: "codex"，mode: "run"。
任务为：“Reply with exactly LIVE-ACP-SPAWN-OK”。
然后仅报告：accepted=<yes/no>; childSessionKey=<值或无>; error=<具体错误文本或无>。
```

说明：

- 冒烟测试保持 `mode: "run"`，除非特意测试线程绑定的持久 ACP 会话。
- 基础测试不必使用 `streamTo: "parent"`，该路径依赖请求者/会话能力，是独立集成检测。
- 线程绑定且 `mode: "session"` 的测试建议用真实 Discord 线程或 Telegram 话题进行更深入的集成。

## 沙盒兼容性

ACP 会话当前在主机运行时执行，不在 OpenClaw 沙盒内。

当前限制：

- 请求者会话如被沙盒限制，ACP spawn 调用被阻止（无论 `sessions_spawn({ runtime: "acp" })` 还是 `/acp spawn`）。
  - 错误信息：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 使用 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。
  - 错误信息：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

需要使用沙盒环境时，请改用 `runtime: "subagent"`。

### 通过 `/acp` 命令

亦可通过聊天命令显式启动 ACP 会话。

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

主要参数：

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <绝对路径>`
- `--label <名称>`

详见 [斜杠命令](/tools/slash-commands)。

## 会话目标解析

大多数 `/acp` 操作支持可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

解析顺序：

1. 显式目标参数（或 `/acp steer` 的 `--session`）
   - 尝试以键值匹配
   - 若非键，则尝试 UUID 格式的会话 ID
   - 再尝试标签匹配
2. 当前线程绑定的 ACP 会话（若本会话/线程绑定 ACP）
3. 当前请求者的会话回退集

无法解析时，OpenClaw 会返回明确错误（`Unable to resolve session target: ...`）。

## 线程启动模式

`/acp spawn` 支持参数 `--thread auto|here|off`。

| 模式   | 行为说明                                                         |
| ------ | ---------------------------------------------------------------- |
| `auto` | 在线程内激活时绑定该线程；在外部激活且支持时创建/绑定子线程。    |
| `here` | 只允许当前激活线程；非线程环境使用会失败。                      |
| `off`  | 不绑定线程；启动时不关联任何线程。                              |

说明：

- 不支持线程绑定的环境中，默认等同于 `off`。
- 线程绑定启动需频道适配器策略支持：
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

## ACP 控制命令

可用命令集包括：

- `/acp spawn`
- `/acp cancel`
- `/acp steer`
- `/acp close`
- `/acp status`
- `/acp set-mode`
- `/acp set`
- `/acp cwd`
- `/acp permissions`
- `/acp timeout`
- `/acp model`
- `/acp reset-options`
- `/acp sessions`
- `/acp doctor`
- `/acp install`

`/acp status` 可显示生效的运行时选项，还显示运行时及后端级别的会话标识（如可用）。

部分控制依赖后端能力，若后端不支持某项控制，OpenClaw 会返回明确的“不支持控制”错误。

## ACP 命令速查表

| Command              | What it does                                              | Example                                                        |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | Create ACP session; optional thread bind.                 | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | Cancel in-flight turn for target session.                 | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | Send steer instruction to running session.                | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | Close session and unbind thread targets.                  | `/acp close`                                                   |
| `/acp status`        | Show backend, mode, state, runtime options, capabilities. | `/acp status`                                                  |
| `/acp set-mode`      | Set runtime mode for target session.                      | `/acp set-mode plan`                                           |
| `/acp set`           | Generic runtime config option write.                      | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | Set runtime working directory override.                   | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | Set approval policy profile.                              | `/acp permissions strict`                                      |
| `/acp timeout`       | Set runtime timeout (seconds).                            | `/acp timeout 120`                                             |
| `/acp model`         | Set runtime model override.                               | `/acp model anthropic/claude-opus-4-6`                         |
| `/acp reset-options` | Remove session runtime option overrides.                  | `/acp reset-options`                                           |
| `/acp sessions`      | List recent ACP sessions from store.                      | `/acp sessions`                                                |
| `/acp doctor`        | Backend health, capabilities, actionable fixes.           | `/acp doctor`                                                  |
| `/acp install`       | Print deterministic install and enable steps.             | `/acp install`                                                 |

## 运行时选项映射

`/acp sessions` 读取当前绑定或请求者会话的存储。接受 `session-key`、`session-id` 或 `session-label` 令牌的命令通过网关会话发现解析目标，包括自定义每个代理的 `session.store` 根目录。


`/acp` 除了便捷命令，也支持通用设置写入。

等价关系：

- `/acp model <id>` 映射到运行时配置键 `model`。
- `/acp permissions <profile>` 映射到 `approval_policy`。
- `/acp timeout <seconds>` 映射到 `timeout`。
- `/acp cwd <路径>` 更新运行时的 cwd 覆盖。
- `/acp set <key> <value>` 通用路径。
  - 特殊情形：若 `key=cwd`，使用 cwd 覆盖更新。
- `/acp reset-options` 清除目标会话所有运行时覆盖。

## 当前 acpx harness 支持

当前 acpx 内置的 harness 别名：

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

当 OpenClaw 使用 acpx 后端时，除非你在 acpx 配置中定义了自定义代理别名，否则建议将这些用作 `agentId`。

直接使用 acpx CLI 也可通过 `--agent <command>` 指向任意适配器，但这是 acpx CLI 功能（非 OpenClaw 标准 `agentId` 路径）。

## 必需配置

核心 ACP 基线示例：

```json5
{
  acp: {
    enabled: true,
    // 可选。默认 true；设置 false 可暂停 ACP 分派但保持 /acp 控制功能。
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["pi", "claude", "codex", "opencode", "gemini", "kimi"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

线程绑定配置依赖频道适配器。Discord 示例：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnAcpSessions: true,
      },
    },
  },
}
```

若线程绑定 ACP 启动失败，请先检查适配器功能开关：

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

另见 [配置参考](/gateway/configuration-reference)。

## acpx 后端插件设置

安装并启用插件：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

开发期间本地工作区安装：

```bash
openclaw plugins install ./extensions/acpx
```

然后验证后端健康：

```text
/acp doctor
```

### acpx 命令和版本配置

By default, the bundled acpx backend plugin (`acpx`) uses the plugin-local pinned binary:

1. 命令默认为 `extensions/acpx/node_modules/.bin/acpx`。
2. 期望版本默认为扩展固定版本。
3. 启动时注册 ACP 后端为未就绪状态。
4. 后台异步执行 `acpx --version` 以验证。
5. 若插件本地二进制缺失或版本不符，会运行：
   `npm install --omit=dev --no-save acpx@<pinned>` 并重新验证。

你可通过插件配置覆盖命令与版本：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

说明：

- `command` 可填写绝对路径、相对路径或命令名（如 `acpx`）。
- 相对路径从 OpenClaw 工作区目录解析。
- 设置 `expectedVersion: "any"` 可禁用严格版本匹配。
- 若 `command` 指向自定义二进制或路径，插件本地自动安装功能将被禁用。
- OpenClaw 启动时不阻塞，后台进行健康检测。

另见 [插件](/tools/plugin)。

## 权限配置

ACP 会话是非交互运行——没有 TTY 来审批文件写入和 shell 执行的权限提示。acpx 插件提供两个配置键控制权限行为：

### `permissionMode`

控制 harness 代理可在无提示情况下执行的权限范围。

| 值              | 行为说明                             |
| --------------- | ----------------------------------- |
| `approve-all`   | 自动批准所有文件写入和 Shell 命令。 |
| `approve-reads` | 仅自动批准读取，写入和执行需提示。  |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制当应给出权限提示但无交互 TTY 可用时如何处理（ACP 会话始终如此）。

| 值     | 行为说明                                    |
| ------ | -------------------------------------------- |
| `fail` | 中止会话并抛出 `AcpRuntimeError`。（默认） |
| `deny` | 静默拒绝权限申请并继续（优雅降级）。        |

### 配置示例

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

修改后请重启网关。

> **重要提示：** OpenClaw 当前默认配置为 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互 ACP 会话中，任何触发写入或执行权限提示的操作都会因无交互环境导致错误：
> `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`。
>
> 若需限制权限，请设 `nonInteractivePermissions=deny` 让会话能优雅降级而非崩溃。

## 故障排查

| 症状                                                                     | 可能原因                                               | 解决方案                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | 后端插件缺失或未启用。                                 | 安装并启用后端插件，然后运行 `/acp doctor`。                                                                                        |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP 全局禁用。                                         | 设置 `acp.enabled=true`。                                                                                                             |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | 正常线程消息分派被禁用。                              | 设置 `acp.dispatch.enabled=true`。                                                                                                    |
| `ACP agent "<id>" is not allowed by policy`                              | 代理未在允许列表中。                                   | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                     |
| `Unable to resolve session target: ...`                                  | 键/ID/标签错误或不匹配。                              | 运行 `/acp sessions`，复制正确的键或标签，再重试。                                                                                     |
| `--thread here requires running /acp spawn inside an active ... thread`  | 在非线程环境使用了 `--thread here`。                   | 移动到目标线程或改用 `--thread auto` / `off`。                                                                                        |
| `Only <user-id> can rebind this thread.`                                 | 该线程绑定被其他用户拥有权限。                        | 以拥有者身份重新绑定，或切换线程。                                                                                                    |
| `Thread bindings are unavailable for <channel>.`                         | 频道适配器不支持线程绑定。                            | 使用 `--thread off` 或更换支持线程绑定的适配器/频道。                                                                                  |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | ACP 运行时在主机端；请求会话处于沙盒内。              | 沙盒会话请使用 `runtime="subagent"`，或从非沙盒会话运行 ACP spawn。                                                                   |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | 针对 ACP 运行时不支持 `sandbox="require"`。           | 使用 `runtime="subagent"` 配合强制沙盒，或非沙盒会话用 ACP 并设置 `sandbox="inherit"`。                                               |
| 缺少绑定会话的 ACP 元数据                                                | ACP 会话元数据过旧或已被删除。                        | 使用 `/acp spawn` 重新创建会话，再绑定或聚焦线程。                                                                                     |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 阻止了非交互 ACP 会话中的写入/执行。 | 设置插件配置 `plugins.entries.acpx.config.permissionMode` 为 `approve-all` 并重启网关。详见[权限配置](#权限配置)。                     |
| ACP 会话早期失败且输出有限                                              | 权限提示被 `permissionMode` 或 `nonInteractivePermissions` 阻塞。 | 查看网关日志中是否有 `AcpRuntimeError`。设完全权限为 `permissionMode=approve-all`，优雅降级为 `nonInteractivePermissions=deny`。    |
| ACP 会话完成后无限期停顿                                                 | harness 进程已退出，ACP 会话却未报告完成。            | 使用 `ps aux | grep acpx` 监控并手动杀死僵死的进程。                                                                                   |
