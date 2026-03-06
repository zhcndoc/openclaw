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

| 区域          | ACP 会话                                | 子代理运行                           |
| ------------- | ------------------------------------- | ---------------------------------- |
| 运行时       | ACP 后端插件（例如 acpx）              | OpenClaw 原生子代理运行时           |
| 会话键       | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`  |
| 主要命令     | `/acp ...`                            | `/subagents ...`                   |
| 启动工具     | `sessions_spawn`，`runtime:"acp"`      | `sessions_spawn`（默认运行时）      |

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

- `runtime` 默认是 `subagent`，需要显式指定 `runtime: "acp"` 来使用 ACP 会话。
- 如果省略 `agentId`，OpenClaw 在配置了时会使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 以维持持久绑定对话。

接口详情：

- `task`（必需）：发送给 ACP 会话的初始提示。
- `runtime`（ACP 必需）：必须是 `"acp"`。
- `agentId`（可选）：ACP 目标 harness ID。若无则使用 `acp.defaultAgent`（若配置）。
- `thread`（可选，默认 `false`）：请求线程绑定流程（支持的情况下）。
- `mode`（可选）：`run`（一次性）或 `session`（持久）。
  - 默认是 `run`
  - 当 `thread: true` 且未指定 mode，OpenClaw 可能默认持久行为
  - `mode: "session"` 强制要求 `thread: true`
- `cwd`（可选）：请求的运行时工作目录（由后端/运行时策略校验）。
- `label`（可选）：面向操作者显示的会话标签。
- `streamTo`（可选）：`"parent"` 会以系统事件的形式将初始 ACP 运行进度摘要流回请求会话。
  - 若可用，接受的响应包括 `streamLogPath` 指向会话作用域 JSONL 日志（`<sessionId>.acp-stream.jsonl`），可用于跟踪全程转发历史。

## 沙盒兼容性

ACP 会话当前在主机运行时运行，而非在 OpenClaw 沙盒内。

当前限制：

- 如果请求会话是沙盒，会阻止 ACP 启动。
  - 错误：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 使用 `sessions_spawn` 并且 `runtime: "acp"` 不支持 `sandbox: "require"`。
  - 错误：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

需要沙盒执行时请使用 `runtime: "subagent"`。

### 通过 `/acp` 命令

当需要时，可通过聊天显式操作使用 `/acp spawn`。

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

大部分 `/acp` 操作支持可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

解析顺序：

1. 显式目标参数（或 `/acp steer` 的 `--session`）
   - 尝试键
   - 然后 UUID 形态的会话 ID
   - 再然后标签
2. 当前线程绑定（如果本对话/线程绑定了 ACP 会话）
3. 当前请求者的会话回退

若无法解析目标，OpenClaw 返回明确错误（`Unable to resolve session target: ...`）。

## 线程启动模式

`/acp spawn` 支持 `--thread auto|here|off`。

| 模式   | 行为说明                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------- |
| `auto` | 在线程内激活时：绑定该线程。在线程外：支持时创建/绑定子线程。                                       |
| `here` | 需要当前激活线程；若不在任何线程，则失败。                                                           |
| `off`  | 不绑定。会话启动时不绑定任何线程。                                                                   |

说明：

- 在不支持线程绑定的环境中，默认行为实际等同于 `off`。
- 线程绑定启动需频道策略支持：
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

## ACP 控制命令

可用命令群：

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

`/acp status` 展示生效的运行时选项，还会显示运行时和后端级别的会话标识（可用时）。

部分控制依赖后端能力。若后端不支持某控制，OpenClaw 会返回明确的“不支持控制”错误。

## ACP 命令速查表

| 命令                | 作用说明                                              | 示例                                                          |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选线程绑定。                         | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | 取消目标会话正在进行的回合。                          | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | 发送指导指令给正在运行的会话。                        | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | 关闭会话并解除线程绑定。                              | `/acp close`                                                   |
| `/acp status`        | 显示后端、模式、状态、运行时选项及能力。              | `/acp status`                                                  |
| `/acp set-mode`      | 设置目标会话的运行模式。                              | `/acp set-mode plan`                                           |
| `/acp set`           | 通用运行时配置选项写入。                              | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | 设置运行时工作目录覆盖。                              | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | 设置审批策略配置文件。                                | `/acp permissions strict`                                      |
| `/acp timeout`       | 设置运行时超时时间（秒）。                            | `/acp timeout 120`                                             |
| `/acp model`         | 设置运行时模型覆盖。                                   | `/acp model anthropic/claude-opus-4-5`                         |
| `/acp reset-options` | 移除会话运行时选项覆盖。                              | `/acp reset-options`                                           |
| `/acp sessions`      | 列出存储中的近期 ACP 会话。                           | `/acp sessions`                                                |
| `/acp doctor`        | 后端健康状况，能力，及可行修复方案。                   | `/acp doctor`                                                  |
| `/acp install`       | 打印确定性的安装和启用步骤。                          | `/acp install`                                                 |

## 运行时选项映射

`/acp` 既有便利命令也支持通用设置。

等价操作：

- `/acp model <id>` 映射到运行时配置键 `model`。
- `/acp permissions <profile>` 映射到运行时配置键 `approval_policy`。
- `/acp timeout <seconds>` 映射到运行时配置键 `timeout`。
- `/acp cwd <path>` 直接更新运行时 cwd 覆盖。
- `/acp set <key> <value>` 是通用路径。
  - 特殊情况：`key=cwd` 使用 cwd 覆盖路径。
- `/acp reset-options` 清除目标会话所有运行时覆盖。

## 当前 acpx harness 支持

当前 acpx 内置的 harness 别名：

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

当 OpenClaw 使用 acpx 后端时，除非你在 acpx 配置中定义了自定义代理别名，否则建议使用这些值作为 `agentId`。

直接使用 acpx CLI 也可以通过 `--agent <command>` 指向任意适配器，但那个是 acpx CLI 功能（非 OpenClaw 常规的 `agentId` 路径）。

## 必需配置

核心 ACP 基线示例：

```json5
{
  acp: {
    enabled: true,
    // 可选。默认 true；设置 false 可暂停 ACP 分派但保留 /acp 控制。
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

如线程绑定 ACP 启动失败，先检查适配器功能开关：

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

然后验证后端健康状况：

```text
/acp doctor
```

### acpx 命令和版本配置

默认情况下，acpx 插件（发布名为 `@openclaw/acpx`）使用插件本地固定二进制：

1. 命令默认是 `extensions/acpx/node_modules/.bin/acpx`。
2. 期望版本默认是扩展固定版本。
3. 启动时注册 ACP 后端为未就绪状态。
4. 后台保证任务验证 `acpx --version`。
5. 如果插件本地二进制缺失或版本不匹配，会执行：
   `npm install --omit=dev --no-save acpx@<pinned>` 并重新验证。

你可以在插件配置中覆盖命令和版本：

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

- `command` 支持绝对路径、相对路径或命令名（如 `acpx`）。
- 相对路径从 OpenClaw 工作区目录解析。
- `expectedVersion: "any"` 禁用严格的版本匹配。
- 若 `command` 指向自定义二进制/路径，插件本地自动安装被禁用。
- OpenClaw 启动时不会阻塞，后台会执行健康检查。

另见 [插件](/tools/plugin)。

## 权限配置

ACP 会话以非交互方式运行——没有 TTY 来审批文件写入和 shell 执行的权限提示。acpx 插件提供两个配置键控制权限行为：

### `permissionMode`

控制 harness 代理可在无提示下执行的操作。

| 值             | 行为说明                                                |
| -------------- | -------------------------------------------------------- |
| `approve-all`  | 自动批准所有文件写入和 shell 命令。                      |
| `approve-reads`| 仅自动批准读取；写入和执行需提示。                        |
| `deny-all`     | 拒绝所有权限提示。                                       |

### `nonInteractivePermissions`

控制当本应提示权限但无交互 TTY 可用时的处理（ACP 会话始终如此）。

| 值      | 行为说明                                                    |
| ------- | ------------------------------------------------------------ |
| `fail`  | 中止会话并报 `AcpRuntimeError`。**（默认）**                |
| `deny`  | 静默拒绝权限并继续（优雅降级）。                            |

### 配置示例

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

修改后需重启网关。

> **重要提示：** OpenClaw 当前默认是 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互的 ACP 会话中，任何触发写入或执行权限提示的操作都可能因无交互环境而报错 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`。
>
> 如果需要限制权限，请设置 `nonInteractivePermissions=deny`，以便会话优雅降级而非崩溃。

## 故障排查

| 症状                                                     | 可能原因                                               | 解决方案                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ACP runtime backend is not configured`                 | 后端插件缺失或未启用。                                 | 安装并启用后端插件，然后运行 `/acp doctor`。                                                                 |
| `ACP is disabled by policy (acp.enabled=false)`         | ACP 全局禁用。                                         | 设置 `acp.enabled=true`。                                                                                      |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)` | 正常线程消息分派禁用。                               | 设置 `acp.dispatch.enabled=true`。                                                                             |
| `ACP agent "<id>" is not allowed by policy`             | 代理不在允许列表中。                                   | 使用被允许的 `agentId` 或更新 `acp.allowedAgents`。                                                           |
| `Unable to resolve session target: ...`                 | 键/ID/标签令牌错误。                                   | 运行 `/acp sessions`，复制正确的键/标签，重试。                                                               |
| `--thread here requires running /acp spawn inside an active ... thread` | 在非线程环境使用了 `--thread here`。               | 移动到目标线程或使用 `--thread auto`/`off`。                                                                  |
| `Only <user-id> can rebind this thread.`                 | 另一个用户拥有该线程绑定权限。                         | 以拥有者身份重新绑定，或使用不同线程。                                                                         |
| `Thread bindings are unavailable for <channel>.`         | 适配器不支持线程绑定能力。                             | 使用 `--thread off` 或切换到支持的适配器/频道。                                                                |
| `Sandboxed sessions cannot spawn ACP sessions ...`       | ACP 运行时在主机端；请求会话在沙盒内。                 | 从沙盒会话使用 `runtime="subagent"`，或从非沙盒会话运行 ACP spawn。                                           |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...` | 选用了针对 ACP 运行时不支持的 `sandbox="require"`。 | 对于强制沙盒，应使用 `runtime="subagent"`，或从非沙盒会话使用 ACP 并设置 `sandbox="inherit"`。                 |
| 缺少绑定会话的 ACP 元数据                                 | 稀旧或已删除的 ACP 会话元数据。                         | 使用 `/acp spawn` 重新创建，然后绑定/聚焦线程。                                                               |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 阻止了非交互 ACP 会话中的写入/执行。 | 设置 `plugins.entries.acpx.config.permissionMode` 为 `approve-all` 并重启网关。详见[权限配置](#权限配置)。             |
| ACP 会话很早失败且输出少                                 | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻塞。 | 检查网关日志中是否有 `AcpRuntimeError`。完全权限设置为 `permissionMode=approve-all`；优雅降级设置为 `nonInteractivePermissions=deny`。 |
| ACP 会话完成后无限期停顿                                 | harness 进程已退出但 ACP 会话未报告完成。               | 使用 `ps aux | grep acpx` 监控并手动杀死僵死进程。                                                             |
