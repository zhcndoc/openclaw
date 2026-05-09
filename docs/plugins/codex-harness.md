---
summary: "通过捆绑的 Codex app-server 验证器运行 OpenClaw 嵌入式代理轮次"
title: "Codex 验证器"
read_when:
  - 你想使用捆绑的 Codex app-server 验证器
  - 你需要 Codex 验证器配置示例
  - 你希望仅 Codex 部署在失败时不要回退到 PI
---

捆绑的 `codex` 插件让 OpenClaw 能通过
Codex app-server 而不是内置的 PI 验证器来运行嵌入式代理轮次。

当你希望由 Codex 接管底层代理会话时使用它：模型
发现、原生线程恢复、原生压缩以及 app-server 执行。
OpenClaw 仍然负责聊天频道、会话文件、模型选择、工具、
批准、媒体传递，以及可见的转录镜像。

当源聊天轮次通过 Codex harness 运行时，如果部署未显式配置
`messages.visibleReplies`，可见回复默认会走 OpenClaw 的 `message`
工具。代理仍然可以私下完成其 Codex 轮次；只有当它调用
`message(action="send")` 时才会发布到频道。设置
`messages.visibleReplies: "automatic"` 可让直接聊天的最终回复继续走
旧的自动投递路径。

Codex 心跳轮次默认也会在可搜索的 OpenClaw
工具目录中获得 `heartbeat_respond`，因此代理可以记录唤醒应保持
静默还是通知，而无需在最终文本中编码该控制流。

针对心跳的 initiative 指导会作为 Codex collaboration-mode
开发者指令发送到心跳轮次本身。普通聊天轮次会恢复
Codex Default 模式，而不是在其常规运行时提示中携带心跳理念。

如果你想先了解整体情况，请从
[Agent runtimes](/concepts/agent-runtimes) 开始。简而言之：
`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、
Discord、Slack 或其他频道仍然是通信界面。

## 快速配置

大多数想要“在 OpenClaw 中使用 Codex”的用户都想走这条路：使用
ChatGPT/Codex 订阅登录，然后通过原生
Codex app-server 运行嵌入式代理轮次。模型引用仍应保持规范为
`openai/gpt-*`；订阅认证来自 Codex 账户/配置文件，而不是
`openai-codex/*` 模型前缀。

如果你还没有登录，请先使用 Codex OAuth 登录：

```bash
openclaw models auth login --provider openai-codex
```

然后启用捆绑的 `codex` 插件，并使用规范的 OpenAI 模型引用。
OpenAI 代理轮次默认选择 Codex 运行时：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

如果你的配置使用了 `plugins.allow`，也要把 `codex` 加进去：

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

不要在配置中使用 `openai-codex/gpt-*`。该前缀是一个旧路由，
`openclaw doctor --fix` 会将主模型、回退、心跳/子代理/压缩覆盖、
钩子、频道覆盖以及已过期的持久化会话路由固定项全部重写为
`openai/gpt-*`。

## 该插件会改变什么

捆绑的 `codex` 插件提供了几项独立能力：

| 能力                                  | 你如何使用它                                         | 它做什么                                                                       |
| ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| 原生嵌入式运行时                      | `openai/gpt-*` 代理模型引用                           | 通过 Codex app-server 运行 OpenClaw 嵌入式代理轮次。                           |
| 原生聊天控制命令                      | `/codex bind`, `/codex resume`, `/codex steer`, ... | 从消息对话中绑定并控制 Codex app-server 线程。                                  |
| Codex app-server 提供方/目录          | `codex` 内部机制，通过 harness 暴露                   | 让运行时发现并验证 app-server 模型。                                            |
| Codex 媒体理解路径                   | `codex/*` 图像模型兼容路径                             | 为受支持的图像理解模型运行受限的 Codex app-server 轮次。                        |
| 原生钩子转发                          | 围绕 Codex 原生事件的插件钩子                         | 让 OpenClaw 观察/阻止受支持的 Codex 原生工具/终结事件。                         |

启用该插件会让这些能力可用。它并不会：

- 替换直接的 OpenAI API key 接口，例如图像、嵌入、语音或
  实时
- 在不运行 `openclaw doctor --fix` 的情况下将 `openai-codex/*` 模型引用转换掉
- 让 ACP/acpx 成为默认的 Codex 路径
- 使用过期的整代理或会话运行时固定值进行路由
- 替换 OpenClaw 频道投递、会话文件、认证配置文件存储或
  消息路由

同一个插件还负责原生 `/codex` 聊天控制命令表面。如果
插件已启用，并且用户希望在聊天中绑定、恢复、操控、停止或检查
Codex 线程，代理应优先使用 `/codex ...` 而不是 ACP。当用户明确要求 ACP/acpx
或正在测试 ACP Codex 适配器时，ACP 仍然是明确的回退方案。

原生 Codex 轮次会保留 OpenClaw 插件 hooks 作为公共兼容层。
这些是进程内的 OpenClaw hooks，不是 Codex `hooks.json` 命令 hooks：

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `before_tool_call`, `after_tool_call`
- 用于镜像转录记录的 `before_message_write`
- 通过 Codex `Stop` 转发的 `before_agent_finalize`
- `agent_end`

插件还可以注册与运行时无关的工具结果中间件，在 OpenClaw 执行工具后、
结果返回给 Codex 前，重写 OpenClaw 的动态工具结果。这与公开的
`tool_result_persist` 插件 hook 不同，后者会转换 OpenClaw 所拥有的转录
工具结果写入。

关于插件 hooks 的语义本身，请参见 [Plugin hooks](/plugins/hooks)
和 [Plugin guard behavior](/tools/plugin)。

OpenAI 代理模型引用默认使用 harness。新配置应保持
OpenAI 模型引用规范为 `openai/gpt-*`；提供方/模型
`agentRuntime.id: "codex"` 仍然有效，但对 OpenAI
代理轮次已不再必需。旧的 `codex/*` 模型引用仍会为兼容性自动选择 harness，但
运行时支持的旧提供方前缀不会作为普通模型/提供方
选项显示。

如果任何已配置的模型路由仍是 `openai-codex/*`，`openclaw doctor --fix`
会将其重写为 `openai/*`，并保留现有的 `openai-codex` 认证配置文件
覆盖项。它不会将整个代理固定到 `agentRuntime.id: "codex"`，因为
规范的 OpenAI 引用已经会自动选择 Codex harness。

## 路由映射

在更改配置之前，请先使用此表：

| 期望行为                                             | 模型引用                   | 运行时配置                                             | 认证/配置文件路由                | 预期状态标签                 |
| ---------------------------------------------------- | -------------------------- | ------------------------------------------------------ | ------------------------------- | --------------------------- |
| 使用 ChatGPT/Codex 订阅和原生 Codex 运行时           | `openai/gpt-*`             | 省略，或提供方/模型 `agentRuntime.id: "codex"`         | Codex OAuth 或 Codex 账户       | `Runtime: OpenAI Codex`      |
| 代理模型的 OpenAI API key 认证                       | `openai/gpt-*`             | 省略，或提供方/模型 `agentRuntime.id: "codex"`         | `openai-codex` API key 配置文件 | `Runtime: OpenAI Codex`      |
| 需要 doctor 修复的旧配置                             | `openai-codex/gpt-*`       | 保留或自动                                            | 现有已配置认证                   | 运行 `doctor --fix` 后重新检查 |
| 具有保守自动模式的混合提供方                         | 提供方特定引用             | 省略，除非某个提供方/模型需要运行时覆盖               | 按所选提供方分别配置             | 取决于所选运行时               |
| 显式 Codex ACP 适配器会话                           | 取决于 ACP 提示/模型       | `sessions_spawn`，并设置 `runtime: "acp"`             | ACP 后端认证                     | ACP 任务/会话状态             |

关键区别在于提供方与运行时：

- `openai-codex/*` 是一个会被 doctor 重写的旧路由。
- 提供方/模型 `agentRuntime.id: "codex"` 需要 Codex harness；如果不可用，
  会以关闭式失败。
- 提供方/模型 `agentRuntime.id: "auto"` 允许已注册的 harness 声明匹配的
  提供方路由；OpenAI 代理引用会解析为 Codex 而不是 PI。
- `/codex ...` 回答的是“这个聊天应该绑定或控制哪一个原生 Codex 对话？”
- ACP 回答的是“acpx 应该启动哪个外部 harness 进程？”

## 选择正确的模型前缀

OpenAI 系列路由是按前缀区分的。对于常见的订阅加
原生 Codex 运行时设置，请使用 `openai/*`。
将 `openai-codex/*` 视为应由 doctor 重写的旧配置：

| 模型引用                                          | 运行时路径                             | 适用场景                                                           |
| ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `openai/gpt-5.4`                                  | 用于代理轮次的 Codex app-server harness | 你希望通过 Codex 使用 OpenAI 代理模型。                           |
| `openai-codex/gpt-5.5`                            | 由 doctor 修复的旧路由                 | 你在使用旧配置；运行 `openclaw doctor --fix` 进行重写。           |
| `openai/gpt-5.5` + `openai-codex` API key 配置文件 | Codex app-server harness               | 你希望对 OpenAI 代理模型使用 API key 认证。                       |

当你的账户提供这些能力时，GPT-5.5 可能同时出现在直接 OpenAI API key 路由和
Codex 订阅路由中。要使用原生 Codex 运行时，请在 Codex app-server
harness 中使用 `openai/gpt-5.5`。若要通过 PI 进行直接 API key 流量，请使用
提供方/模型 `agentRuntime.id: "pi"` 以及正常的 `openai` 认证配置文件。

旧的 `codex/gpt-*` 引用仍被接受为兼容别名。doctor 的兼容性迁移会将旧
运行时引用重写为规范模型引用，并单独记录运行时策略。新的原生 app-server harness 配置
应使用 `openai/gpt-*`；只有当你需要记录该策略时，才需要显式的提供方/模型
`agentRuntime.id: "codex"`。

`agents.defaults.imageModel` 遵循相同的前缀拆分。正常的 OpenAI 路由请使用
`openai/gpt-*`；当图像理解应该通过受限的 Codex app-server 轮次运行时，请使用
`codex/gpt-*`。不要使用 `openai-codex/gpt-*`；doctor 会将该旧前缀重写为
`openai/gpt-*`。Codex app-server 模型必须声明支持图像输入；纯文本 Codex
模型会在媒体轮次开始前失败。

使用 `/status` 来确认当前会话的实际验证器。如果
选择结果出乎意料，请为 `agents/harness` 子系统启用调试日志，并检查网关的结构化
`agent harness selected` 记录。它包含所选验证器 id、选择原因、运行时/回退策略，以及在
`auto` 模式下每个插件候选项的支持结果。

### doctor 警告意味着什么

`openclaw doctor` 会在配置的模型引用或持久化会话路由状态仍然使用
`openai-codex/*` 时发出警告。`openclaw doctor --fix` 会将这些路由重写为
`openai/<model>`。规范的 OpenAI 代理引用已经会自动选择原生 Codex harness，因此
doctor 不会将整个代理固定到 Codex。

整会话和整代理运行时固定值属于旧状态。运行时选择
现在来自提供方/模型策略；`openclaw doctor --fix` 会移除过期的
会话固定值和旧的整代理运行时配置，以免它们掩盖已选的
提供方/模型路由。

`/status` 会显示实际生效的模型运行时。默认的 PI 验证器会显示为
`Runtime: OpenClaw Pi Default`，而 Codex app-server 验证器会显示为
`Runtime: OpenAI Codex`。

## 要求

- 安装了捆绑 `codex` 插件的 OpenClaw。
- Codex app-server `0.125.0` 或更新版本。捆绑插件默认会管理一个兼容的
  Codex app-server 二进制文件，因此 `PATH` 上的本地 `codex` 命令
  不会影响正常的 harness 启动。
- Codex 认证可用于 app-server 进程或 OpenClaw 的 Codex 认证
  桥接。本地 app-server 启动会为每个 agent 使用 OpenClaw 管理的 Codex home，
  并使用隔离的子级 `HOME`，因此默认不会读取你的个人
  `~/.codex` 账户、skills、plugins、config、线程状态，或原生的
  `$HOME/.agents/skills`。

该插件会阻止较旧或未指定版本的 app-server 握手。这使 OpenClaw 保持在其已测试过的协议范围内。

对于 live 和 Docker smoke tests，认证通常来自 Codex CLI 账户或 OpenClaw 的 `openai-codex` 认证配置文件。没有账户时，本地 stdio app-server 启动也可以回退到 `CODEX_API_KEY` / `OPENAI_API_KEY`。

## 工作区引导文件

Codex 会通过原生项目文档发现自行处理 `AGENTS.md`。OpenClaw
不会写入合成的 Codex 项目文档文件，也不会为了 persona 文件依赖
Codex fallback 文件名，因为只有在缺少 `AGENTS.md` 时 Codex fallback 才会生效。

对于 OpenClaw 工作区的同等行为，Codex harness 会解析其他引导
文件（`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、
`BOOTSTRAP.md` 和 `MEMORY.md`，如果存在），并在 `thread/start` 和 `thread/resume` 时通过 Codex
开发者指令转发它们。这使得 `SOUL.md` 及相关的工作区 persona/profile 上下文
在原生 Codex 行为塑造通道中可见，而不会重复 `AGENTS.md`。

## 将 Codex 与其他模型一起添加

不要设置整个 agent 运行时。整个 agent 运行时固定是旧式做法并且
会被忽略，而且在升级后它们曾是混合提供方陷阱的来源。请将
运行时策略保留在需要它的提供方或模型上。

请改用以下任一结构：

- 对 OpenAI agent 回合使用 `openai/gpt-*`；默认会选择 Codex。
- 将运行时覆盖放在 `models.providers.<provider>.agentRuntime` 上，或放在像
  `agents.defaults.models["anthropic/claude-opus-4-7"].agentRuntime` 这样的
  模型条目上。
- 仅为兼容性使用旧式 `codex/*` 引用。新配置应优先使用 `openai/*`；
  只有在你需要强制提供方/模型规则时，才添加显式的 Codex 运行时策略。

例如，这样可以在默认通过 Codex 使用 OpenAI、通过 PI 使用 Claude 的同时，
保持混合提供方路由的易用性：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-6",
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "openai/gpt-5.5",
      },
    ],
  },
}
```

采用这种结构时：

- 默认的 `main` agent 使用正常的提供方路径和 PI 兼容回退。
- `codex` agent 使用 Codex app-server harness。
- 如果 `codex` agent 缺少 Codex，或 Codex 不受支持，则该 turn 会失败，而不是悄悄改用 PI。

## Agent 命令路由

Agents 应根据意图来路由用户请求，而不是仅凭“Codex”这个词：

| User asks for...                                       | Agent should use...                              |
| ------------------------------------------------------ | ------------------------------------------------ |
| "Bind this chat to Codex"                              | `/codex bind`                                    |
| "Resume Codex thread `<id>` here"                      | `/codex resume <id>`                             |
| "Show Codex threads"                                   | `/codex threads`                                 |
| "File a support report for a bad Codex run"            | `/diagnostics [note]`                            |
| "Only send Codex feedback for this attached thread"    | `/codex diagnostics [note]`                      |
| "Use my ChatGPT/Codex subscription with Codex runtime" | `openai/*`                                       |
| "Repair old `openai-codex/*` config/session pins"      | `openclaw doctor --fix`                          |
| "Run Codex through ACP/acpx"                           | ACP `sessions_spawn({ runtime: "acp", ... })`    |
| "Start Claude Code/Gemini/OpenCode/Cursor in a thread" | ACP/acpx, not `/codex` and not native sub-agents |

只有在 ACP 已启用、可调度，并且有已加载的运行时后端支持时，OpenClaw 才会向 agent 公开 ACP spawn 指引。如果 ACP 不可用，系统提示词和插件技能就不应教 agent 关于 ACP 路由的内容。

## 仅限 Codex 的部署

对于 OpenAI agent 回合，`openai/gpt-*` 已经会解析为 Codex。如果你需要严格的书面策略，请将其放在 OpenAI 提供方或模型上。显式插件运行时会失败关闭，并且绝不会悄悄通过 PI 重试：

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: { defaults: { model: "openai/gpt-5.5" } },
}
```

在强制使用 Codex 时，如果 Codex 插件被禁用、app-server 版本太旧，或 app-server 无法启动，OpenClaw 会尽早失败。

## 按 agent 使用 Codex

你可以通过按 agent 的模型运行时覆盖，让一个 agent 严格使用 Codex，而默认 agent 保持正常选择：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "openai/gpt-5.5",
        models: {
          "openai/gpt-5.5": {
            agentRuntime: {
              id: "codex",
            },
          },
        },
      },
    ],
  },
}
```

使用常规的会话命令来切换 agents 和模型。`/new` 会创建一个新的 OpenClaw 会话，而 Codex harness 会在需要时创建或恢复其 sidecar app-server 线程。`/reset` 会清除该线程的 OpenClaw 会话绑定，并允许下一次 turn 再次从当前配置解析 harness。

## 模型发现

默认情况下，Codex 插件会向 app-server 请求可用模型。如果发现失败或超时，则会使用内置的回退目录，包含：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

你可以在 `plugins.entries.codex.config.discovery` 下调整发现行为：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

当你希望启动时避免探测 Codex，而直接使用回退目录时，可以禁用发现：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## App-server 连接与策略

默认情况下，插件会使用以下方式在本地启动 OpenClaw 托管的 Codex 二进制文件：

```bash
codex app-server --listen stdio://
```

托管二进制文件随 `codex` 插件包一起发布。这会让 app-server 版本固定为捆绑的插件版本，而不是本地恰好安装的某个独立 Codex CLI。只有在你有意运行不同可执行文件时，才设置 `appServer.command`。

默认情况下，OpenClaw 以 YOLO 模式启动本地 Codex harness 会话：
`approvalPolicy: "never"`、`approvalsReviewer: "user"`，以及
`sandbox: "danger-full-access"`。这是用于自主心跳的可信本地操作者姿态：
Codex 可以使用 shell 和网络工具，而不会停下来等待无人回应的原生审批提示。在本地 stdio Codex app-server 安装中，如果 Codex 的系统要求文件
不允许隐式的 YOLO approval、reviewer 或 sandbox 值，OpenClaw 会将隐式默认值视为 guardian，并选择允许的 guardian 权限，这样它就不会发送 Codex app-server 会拒绝的覆盖值。同一要求文件中与主机名匹配的 `[[remote_sandbox_config]]` 条目会在确定 sandbox 默认值时被遵守。

若要启用由 Codex guardian 审查的审批，请设置 `appServer.mode: "guardian"`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

Guardian 模式使用 Codex 的原生自动审查审批路径。当 Codex 请求离开 sandbox、在工作区外写入，或添加网络访问等权限时，Codex 会将该审批请求路由到原生审查者，而不是人工提示。审查者会应用 Codex 的风险框架，并批准或拒绝该特定请求。当你希望比 YOLO 模式有更多护栏，但仍需要无人值守的 agent 推进任务时，请使用 Guardian。

`guardian` 预设会展开为 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。单独的策略字段仍会覆盖 `mode`，因此高级部署可以将该预设与显式选择混用。较旧的 `guardian_subagent` 审查者值仍被接受为兼容别名，但新配置应使用 `auto_review`。

对于已在运行的 app-server，请使用 WebSocket 传输：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://127.0.0.1:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

stdio app-server 启动默认会继承 OpenClaw 的进程环境，但 OpenClaw 负责 Codex app-server 的账户桥接，并将 `CODEX_HOME` 和 `HOME` 都设置为该 agent 的 OpenClaw 状态下的按 agent 目录。Codex 自身的技能加载器会读取 `$CODEX_HOME/skills` 和 `$HOME/.agents/skills`，因此这两个值在本地 app-server 启动时都是隔离的。这样可以将 Codex 原生技能、插件、配置、账户和线程状态限定在 OpenClaw agent 范围内，而不会从操作者个人的 Codex CLI home 中泄漏进来。

OpenClaw 插件和 OpenClaw 技能快照仍通过 OpenClaw 自己的插件注册表和技能加载器流转。个人 Codex CLI 资产不会。若你有希望成为 OpenClaw agent 一部分的有用 Codex CLI 技能或插件，请显式清点它们：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

Codex 迁移提供方会将技能复制到当前 OpenClaw agent 工作区。对于源安装的 `openai-curated` Codex 插件，迁移还会调用 Codex app-server 的 `plugin/install`，并在 `plugins.entries.codex.config.codexPlugins` 下记录显式的原生插件配置。不是源安装的精选插件的 Codex 配置文件、hooks 和缓存的插件包仍然属于仅报告、需人工审查的项目。

认证按以下顺序选择：

1. 该 agent 的显式 OpenClaw Codex 认证配置文件。
2. 该 agent 的 Codex home 中 app-server 现有的账户。
3. 仅对于本地 stdio app-server 启动，在没有 app-server 账户且仍需要 OpenAI 认证时，依次使用 `CODEX_API_KEY`，然后是 `OPENAI_API_KEY`。

当 OpenClaw 检测到 ChatGPT 订阅型 Codex 认证配置文件时，它会从启动的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这可以让 Gateway 级别的 API key 继续可用于 embeddings 或直接的 OpenAI 模型，而不会让原生 Codex app-server turn 意外地按 API 计费。显式的 Codex API key 配置文件以及本地 stdio 环境 key 回退会使用 app-server 登录，而不是继承的子进程环境。WebSocket app-server 连接不会获得 Gateway 环境 API key 回退；请使用显式认证配置文件或远程 app-server 自己的账户。

如果部署需要额外的环境隔离，请将这些变量添加到 `appServer.clearEnv`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` 仅影响启动的 Codex app-server 子进程。

Codex 动态工具默认使用 `native-first` 配置文件和 `searchable`
加载。在该模式下，OpenClaw 不会暴露与 Codex 原生工作区操作重复的动态工具：`read`、`write`、`edit`、`apply_patch`、
`exec`、`process` 和 `update_plan`。其余的 OpenClaw 集成工具，例如消息、会话、媒体、cron、浏览器、节点、网关、
`heartbeat_respond` 和 `web_search`，可通过 Codex 工具搜索在 `openclaw` 命名空间下使用，从而保持初始模型上下文更小。
`sessions_yield` 和仅限消息工具的源回复仍保持直接，因为它们是 turn 控制契约。心跳协作说明会告诉 Codex，在工具尚未加载时，
在结束一个心跳 turn 之前先搜索 `heartbeat_respond`。

仅当连接到一个无法搜索延迟动态工具的自定义 Codex app-server，或在调试完整工具负载时，才将 `codexDynamicToolsLoading: "direct"` 设为直连。

支持的顶层 Codex 插件字段：

| Field                      | Default          | Meaning                                                                                   |
| -------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `codexDynamicToolsProfile` | `"native-first"` | 使用 `"openclaw-compat"` 将完整的 OpenClaw 动态工具集暴露给 Codex app-server。 |
| `codexDynamicToolsLoading` | `"searchable"`   | 使用 `"direct"` 将 OpenClaw 动态工具直接放入初始 Codex 工具上下文。  |
| `codexDynamicToolsExclude` | `[]`             | 从 Codex app-server turns 中额外省略的 OpenClaw 动态工具名称。               |
| `codexPlugins`             | disabled         | 对迁移后的源安装精选插件提供原生 Codex 插件/app 支持。            |

支持的 `appServer` 字段：

| Field                         | Default                                                | Meaning                                                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`                   | `"stdio"`                                              | `"stdio"` 启动 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                                             |
| `command`                     | managed Codex binary                                   | stdio 传输的可执行文件。留空以使用托管二进制文件；仅在需要显式覆盖时设置。                                                                                                                         |
| `args`                        | `["app-server", "--listen", "stdio://"]`               | stdio 传输的参数。                                                                                                                                                                                                       |
| `url`                         | unset                                                  | WebSocket app-server URL。                                                                                                                                                                                                            |
| `authToken`                   | unset                                                  | WebSocket 传输的 Bearer token。                                                                                                                                                                                                |
| `headers`                     | `{}`                                                   | 额外的 WebSocket 标头。                                                                                                                                                                                                             |
| `clearEnv`                    | `[]`                                                   | OpenClaw 构建继承环境后，从启动的 stdio app-server 进程中移除的额外环境变量名。`CODEX_HOME` 和 `HOME` 为 OpenClaw 在本地启动时的按 agent Codex 隔离保留。 |
| `requestTimeoutMs`            | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                          |
| `turnCompletionIdleTimeoutMs` | `60000`                                                | OpenClaw 等待 `turn/completed` 时，在 turn 范围的 Codex app-server 请求之后的静默窗口。对于较慢的工具后处理或仅状态合成阶段，请提高此值。                                                                  |
| `mode`                        | `"yolo"` unless local Codex requirements disallow YOLO | YOLO 或 guardian 审查执行的预设。本地 stdio 要求如果省略 `danger-full-access`、`never` approval 或 `user` reviewer，则隐式默认值为 guardian。                                                |
| `approvalPolicy`              | `"never"` or an allowed guardian approval policy       | 发送到 thread start/resume/turn 的原生 Codex 审批策略。Guardian 默认在允许时偏好 `"on-request"`。                                                                                                                 |
| `sandbox`                     | `"danger-full-access"` or an allowed guardian sandbox  | 发送到 thread start/resume 的原生 Codex sandbox 模式。Guardian 默认在允许时偏好 `"workspace-write"`，否则为 `"read-only"`。                                                                                           |
| `approvalsReviewer`           | `"user"` or an allowed guardian reviewer               | 在允许时使用 `"auto_review"` 让 Codex 审查原生审批提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍是旧式别名。                                                                   |
| `serviceTier`                 | unset                                                  | 可选的 Codex app-server 服务等级。`"priority"` 启用快速模式路由，`"flex"` 请求 flex 处理，`null` 清除覆盖值，旧式 `"fast"` 会被接受为 `"priority"`。                                      |

OpenClaw 拥有的动态工具调用与 `appServer.requestTimeoutMs` 独立限制：每个 Codex `item/tool/call` 请求都必须在 30 秒内收到 OpenClaw 响应。超时后，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便 turn 继续进行，而不是让会话停留在 `processing` 状态。

在 OpenClaw 对 Codex turn 范围内的 app-server 请求作出响应后，harness
还会期望 Codex 以 `turn/completed` 完成原生 turn。如果 app-server 在该响应后对 `appServer.turnCompletionIdleTimeoutMs` 保持静默，OpenClaw 会尽力中断 Codex turn，记录诊断超时，并释放 OpenClaw 会话通道，以免后续聊天消息排在一个陈旧的原生 turn 后面。针对同一 turn 的任何非终态通知，包括 `rawResponseItem/completed`，都会解除这个短看门狗，因为 Codex 已证明该 turn 仍然存活；更长的终态看门狗继续保护真正卡住的 turn。超时诊断包括最后一个 app-server 通知方法，以及对于原始助手响应项，还包括项类型、角色、id 和受限的助手文本预览。

本地测试仍可使用环境变量覆盖：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或在一次性本地测试中使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，更推荐使用配置，因为它将插件行为与 Codex harness 设置的其余部分放在同一个经过审查的文件中。

## 原生 Codex 插件

原生 Codex 插件支持使用 Codex app-server 自身的应用和插件能力，并在与 OpenClaw harness 轮次相同的 Codex 线程中运行。OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。这样可以将插件调用保留在原生 Codex 转录中，并避免为每次插件调用启动第二个临时 Codex 线程。

只有当所选的 OpenClaw 代理运行时是原生 Codex harness 时，Codex 插件才会生效。`codexPlugins` 配置对 Pi 运行、普通 OpenAI 提供方运行、ACP 会话绑定或其他 harness 都没有影响，因为这些路径不会使用原生 `apps` 配置创建 Codex app-server 线程。

V1 支持的范围有意保持得很窄：

- 只有源 Codex app-server 清单中已安装的 `openai-curated` 插件才有资格迁移。
- 迁移会写入带有 `marketplaceName` 和 `pluginName` 的显式插件身份；不会写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是全局启用开关。不存在 `plugins["*"]` 通配符，也没有授予任意安装权限的配置键。
- 不支持的 marketplace、缓存的插件包、hooks 和 Codex 配置文件会保留在迁移报告中供人工审查。

迁移后的配置示例：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: false,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

当 OpenClaw 建立 Codex harness 会话，或替换过期的 Codex 线程绑定时，会计算线程 app 配置。它不会在每一轮都重新计算。修改 `codexPlugins` 后，请使用 `/new`、`/reset` 或重启网关，以便后续 Codex harness 会话使用更新后的应用集合启动。

OpenClaw 通过 app-server `app/list` 读取 Codex app 清单，缓存一小时，并异步刷新过期或缺失的条目。只有当 OpenClaw 能通过稳定归属关系将某个插件 app 映射回已迁移的插件时，才会暴露该 app：例如来自插件详情中的精确 app id、已知的 MCP 服务器名称，或唯一稳定元数据。仅有显示名称或归属不明确的情况会被排除，直到下一次清单刷新证明其归属为止。

插件所属的 app 工具使用 Codex 的原生应用配置。OpenClaw 会为 Codex 线程注入一个限制性的 `config.apps` 补丁：禁用 `_default`，并且仅启用由已启用且已迁移插件拥有的应用。OpenClaw 根据生效的全局/每插件 `allow_destructive_actions` 策略设置应用级 `destructive_enabled`，并让 Codex 从其原生应用工具注解中强制执行破坏性工具元数据。插件 app 会以 `open_world_enabled: true` 形式发出；OpenClaw 不会提供单独的插件 open-world 策略开关。OpenClaw 不维护每个插件的破坏性工具名拒绝列表。由于 OpenClaw 在这种同线程路径中没有交互式应用确认 UI，工具批准模式对插件 app 默认采用提示确认。

破坏性插件确认默认会失败关闭：

- 全局 `allow_destructive_actions` 默认值为 `false`。
- 每插件的 `allow_destructive_actions` 会覆盖该插件的全局策略。
- 当策略为 `false` 时，OpenClaw 会返回确定性的拒绝。
- 当策略为 `true` 时，OpenClaw 只会自动接受它能映射为批准响应的安全 schema，例如布尔型批准字段。
- 缺少插件身份、归属不明确、缺少 turn id、错误的 turn id，或不安全的确认 schema，都会直接拒绝，而不是提示确认。

常见诊断信息：

- `auth_required`：迁移已安装该插件，但其某个 app 仍需要身份验证。在你重新授权并启用之前，显式插件条目会被写为禁用。
- `marketplace_missing` 或 `plugin_missing`：目标 Codex app-server 看不到预期的 `openai-curated` marketplace 或插件。
- `app_inventory_missing` 或 `app_inventory_stale`：应用就绪状态来自空缓存或过期缓存；OpenClaw 会安排异步刷新，并在确认归属/就绪状态之前排除插件 app。
- `app_ownership_ambiguous`：app 清单仅通过显示名称匹配，因此该 app 不会暴露给 Codex 线程。

## Computer use

Computer Use 在其单独的设置指南中有说明：
[Codex Computer Use](/plugins/codex-computer-use)。

简而言之：OpenClaw 不会捆绑桌面控制应用，也不会自行执行桌面操作。它会准备 Codex app-server，验证 `computer-use` MCP 服务器可用，然后在 Codex 模式轮次中让 Codex 处理原生 MCP 工具调用。

对于在 Codex marketplace 流程之外直接访问 TryCua 驱动，请使用 `openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'` 注册 `cua-driver mcp`。有关 Codex 所拥有的 Computer Use 与直接 MCP 注册之间的区别，请参见 [Codex Computer Use](/plugins/codex-computer-use)。

最小配置：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

可以通过命令界面检查或安装该设置：

- `/codex computer-use status`
- `/codex computer-use install`
- `/codex computer-use install --source <marketplace-source>`
- `/codex computer-use install --marketplace-path <path>`

Computer Use 仅适用于 macOS，并且在 Codex MCP 服务器能够控制应用之前，可能需要本地操作系统权限。如果 `computerUse.enabled` 为 true 且 MCP 服务器不可用，则 Codex 模式轮次会在线程开始前失败，而不会静默地在没有原生 Computer Use 工具的情况下运行。有关 marketplace 选择、远程目录限制、状态原因和故障排除，请参见 [Codex Computer Use](/plugins/codex-computer-use)。

当 `computerUse.autoInstall` 为 true 时，如果 Codex 还没有发现本地 marketplace，OpenClaw 可以从 `/Applications/Codex.app/Contents/Resources/plugins/openai-bundled` 注册标准的捆绑 Codex Desktop marketplace。更改运行时或 Computer Use 配置后，请使用 `/new` 或 `/reset`，以免现有会话继续绑定旧的 PI 或 Codex 线程。

## 常见配方

使用默认 stdio 传输的本地 Codex：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

仅用于 Codex 的 harness 验证：

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

由 Guardian 审核的 Codex 批准：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            approvalPolicy: "on-request",
            approvalsReviewer: "auto_review",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

带显式标头的远程 app-server：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            headers: {
              "X-OpenClaw-Agent": "main",
            },
          },
        },
      },
    },
  },
}
```

模型切换仍由 OpenClaw 控制。当 OpenClaw 会话附加到现有 Codex 线程时，下一轮会再次向 app-server 发送当前选择的 OpenAI 模型、提供商、审批策略、沙箱和服务层级。将 `openai/gpt-5.5` 切换为 `openai/gpt-5.2` 会保留线程绑定，但会要求 Codex 使用新选择的模型继续。

## Codex 命令

捆绑插件会将 `/codex` 注册为已授权的斜杠命令。它是通用的，可在任何支持 OpenClaw 文本命令的频道中使用。

常见形式：

- `/codex status` 显示实时 app-server 连通性、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时 Codex app-server 模型。
- `/codex threads [filter]` 列出最近的 Codex 线程。
- `/codex resume <thread-id>` 将当前 OpenClaw 会话附加到现有 Codex 线程。
- `/codex compact` 请求 Codex app-server 压缩已附加的线程。
- `/codex review` 为已附加的线程启动 Codex 原生审查。
- `/codex diagnostics [note]` 在发送已附加线程的 Codex 诊断反馈前进行确认。
- `/codex computer-use status` 检查已配置的 Computer Use 插件和 MCP 服务器。
- `/codex computer-use install` 安装已配置的 Computer Use 插件并重新加载 MCP 服务器。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex app-server 的 MCP 服务器状态。
- `/codex skills` 列出 Codex app-server 技能。

当 Codex 报告使用量限制失败时，如果 Codex 提供了下一个 app-server 重置时间，OpenClaw 会一并包含。请在同一会话中使用 `/codex account` 查看当前账户和速率限制窗口。

### 常见调试工作流

当一个由 Codex 支持的代理在 Telegram、Discord、Slack 或其他频道中做出令人惊讶的事情时，先从问题发生的那个会话开始：

1. 运行 `/diagnostics bad tool choice after image upload`，或其他描述你所见情况的简短说明。
2. 只批准一次诊断请求。批准后会创建本地 Gateway 诊断 zip，而且由于该会话正在使用 Codex harness，还会向 OpenAI 服务器发送相关的 Codex 反馈包。
3. 将完成后的诊断回复复制到 bug 报告或支持线程中。它包含本地 bundle 路径、隐私摘要、OpenClaw 会话 id、Codex 线程 id，以及每个 Codex 线程的 `Inspect locally` 行。
4. 如果你想自己调试运行过程，在终端中执行打印出的 `Inspect locally` 命令。它看起来像 `codex resume <thread-id>`，并会打开原生 Codex 线程，这样你就可以检查对话、在本地继续它，或者询问 Codex 为什么选择了某个工具或计划。

仅当你明确希望针对当前附加线程上传 Codex 反馈，而不是完整的 OpenClaw Gateway 诊断 bundle 时，才使用 `/codex diagnostics [note]`。对于大多数支持请求，`/diagnostics [note]` 是更好的起点，因为它会在一条回复中将本地 Gateway 状态和 Codex 线程 id 联系起来。完整隐私模型和群聊行为请参见 [Diagnostics export](/gateway/diagnostics)。

Core OpenClaw 也提供仅所有者可用的 `/diagnostics [note]` 作为通用的 Gateway 诊断命令。它的审批提示会显示敏感数据前言，链接到 [Diagnostics Export](/gateway/diagnostics)，并且每次都通过显式 exec 批准请求 `openclaw gateway diagnostics export --json`。不要使用允许全部的规则批准诊断。批准后，OpenClaw 会发送一份可直接粘贴的报告，其中包含本地 bundle 路径和清单摘要。当活动的 OpenClaw 会话使用 Codex harness 时，同样的批准也会授权将相关的 Codex 反馈 bundle 发送到 OpenAI 服务器。审批提示会说明将发送 Codex 反馈，但在批准前不会列出 Codex 会话或线程 id。

如果所有者在群聊中调用 `/diagnostics`，OpenClaw 会保持共享频道整洁：群组只会收到简短通知，而诊断前言、审批提示以及 Codex 会话/线程 id 会通过私有审批路径发送给所有者。如果没有私有所有者路径，OpenClaw 会拒绝群组请求，并要求所有者在私聊中运行它。

已批准的 Codex 上传会调用 Codex app-server `feedback/upload`，并要求 app-server 在可用时包含所列每个线程及其生成的 Codex 子线程的日志。上传会通过 Codex 的标准反馈路径发送到 OpenAI 服务器；如果该 app-server 中禁用了 Codex 反馈，命令会返回 app-server 错误。完成后的诊断回复会列出已发送线程的频道、OpenClaw 会话 id、Codex 线程 id，以及本地 `codex resume <thread-id>` 命令。如果你拒绝或忽略审批，OpenClaw 不会打印这些 Codex id。此上传不会取代本地 Gateway 诊断导出。

`/codex resume` 会写入与 harness 在正常轮次中使用的相同 sidecar 绑定文件。下一条消息时，OpenClaw 会恢复该 Codex 线程，将当前选择的 OpenClaw 模型传入 app-server，并保持扩展历史记录启用。

### 从 CLI 检查 Codex 线程

理解一次不正常的 Codex 运行，最快的方法通常是直接打开原生 Codex 线程：

```sh
codex resume <thread-id>
```

当你在频道对话中发现 bug，并想检查有问题的 Codex 会话、在本地继续它，或者询问 Codex 为什么做出了某个工具或推理选择时，就使用这个方法。最简单的路径通常是先运行 `/diagnostics [note]`：在你批准之后，完成后的报告会列出每个 Codex 线程并打印一个 `Inspect locally` 命令，例如 `codex resume <thread-id>`。你可以直接将该命令复制到终端中。

你也可以从当前聊天的 `/codex binding` 或最近 Codex app-server 线程的 `/codex threads [filter]` 获取线程 id，然后在 shell 中运行同样的 `codex resume` 命令。

该命令界面要求 Codex app-server 版本为 `0.125.0` 或更新版本。如果未来或自定义 app-server 未公开该 JSON-RPC 方法，则各个控制方法会报告为 `unsupported by this Codex app-server`。

## Hook 边界

Codex harness 有三个 hook 层：

| 层                                    | 所有者                   | 目的                                                                |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| OpenClaw 插件 hooks                  | OpenClaw                 | 在 PI 和 Codex harness 之间保持产品/插件兼容性。                    |
| Codex app-server 扩展中间件           | OpenClaw bundled plugins | 围绕 OpenClaw 动态工具的逐轮适配器行为。                              |
| Codex 原生 hooks                     | Codex                    | 来自 Codex 配置的底层 Codex 生命周期和原生工具策略。                |

OpenClaw 不使用项目级或全局 Codex `hooks.json` 文件来路由 OpenClaw 插件行为。对于受支持的原生工具和权限桥接，OpenClaw 会为 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入按线程划分的 Codex 配置。当启用 Codex app-server 审批时（`approvalPolicy` 不是 `"never"`），默认注入的原生 hook 配置会省略 `PermissionRequest`，这样 Codex 的 app-server 审核者和 OpenClaw 的审批桥接会在审查后处理真实的升级请求。运营者在需要兼容性转发时，仍然可以显式将 `permission_request` 添加到 `nativeHookRelay.events` 中。其他 Codex hooks，例如 `SessionStart` 和 `UserPromptSubmit`，仍然是 Codex 级别的控制；在 v1 契约中，它们不会作为 OpenClaw 插件 hooks 暴露出来。

对于 OpenClaw 动态工具，Codex 请求调用之后由 OpenClaw 执行该工具，因此 OpenClaw 会触发它在 harness 适配器中所拥有的插件和中间件行为。对于 Codex 原生工具，规范的工具记录由 Codex 拥有。OpenClaw 可以镜像部分事件，但除非 Codex 通过 app-server 或原生 hook 回调公开该操作，否则它不能重写原生 Codex 线程。

压缩和 LLM 生命周期投影来自 Codex app-server 通知和 OpenClaw 适配器状态，而不是原生 Codex hook 命令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是适配器级别的观察，不是对 Codex 内部请求或压缩负载的逐字节捕获。

Codex 原生的 `hook/started` 和 `hook/completed` app-server 通知会作为 `codex_app_server.hook` 代理事件进行投影，用于轨迹记录和调试。它们不会调用 OpenClaw 插件 hooks。

## V1 支持契约

Codex 模式并不是带有不同底层模型调用的 PI。Codex 拥有更多原生模型循环的控制权，而 OpenClaw 围绕该边界调整其插件和会话表面。

在 Codex runtime v1 中受支持：

| Surface                                       | Support                                                                              | Why                                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI model loop through Codex               | Supported                                                                            | Codex app-server 拥有 OpenAI 轮次、原生线程恢复以及原生工具续接。                                                                                                                 |
| OpenClaw channel routing and delivery         | Supported                                                                            | Telegram、Discord、Slack、WhatsApp、iMessage 以及其他渠道都保持在模型运行时之外。                                                                                                           |
| OpenClaw dynamic tools                        | Supported                                                                            | Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。                                                                                                                       |
| Prompt and context plugins                    | Supported                                                                            | OpenClaw 在启动或恢复线程之前构建提示词覆盖层，并将上下文投射到 Codex 轮次中。                                                                                           |
| Context engine lifecycle                      | Supported                                                                            | 为 Codex 轮次运行组装、摄取或轮后维护，以及上下文引擎压缩协调。                                                                                                |
| Dynamic tool hooks                            | Supported                                                                            | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                                                                 |
| Lifecycle hooks                               | Supported as adapter observations                                                    | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会携带真实的 Codex 模式载荷触发。                                                                                  |
| Final-answer revision gate                    | Supported through the native hook relay                                              | Codex `Stop` 会转发到 `before_agent_finalize`；`revise` 会在最终定稿前要求 Codex 再进行一次模型推理。                                                                                       |
| Native shell, patch, and MCP block or observe | Supported through the native hook relay                                              | Codex `PreToolUse` 和 `PostToolUse` 会针对已提交的原生工具表面进行转发，包括 Codex app-server `0.125.0` 或更高版本上的 MCP 载荷。支持阻断；不支持参数重写。      |
| Native permission policy                      | Supported through Codex app-server approvals and the compatibility native hook relay | Codex app-server 审批请求在 Codex 审查后通过 OpenClaw 路由。`PermissionRequest` 原生 hook 转发对原生审批模式是可选的，因为 Codex 会在守护者审查之前发出它。 |
| App-server trajectory capture                 | Supported                                                                            | OpenClaw 会记录它发送给 app-server 的请求以及它接收到的 app-server 通知。                                                                                                           |

在 Codex runtime v1 中不受支持：

| Surface                                             | V1 boundary                                                                                                                                     | Future path                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 原生工具参数变更                                     | Codex 原生 pre-tool 钩子可以阻断，但 OpenClaw 不会重写 Codex 原生工具参数。                                                                       | 需要 Codex 钩子/模式支持以替换工具输入。                                                    |
| 可编辑的 Codex 原生转录历史                           | Codex 拥有规范性的原生线程历史。OpenClaw 拥有镜像并可以投射未来上下文，但不应修改不受支持的内部结构。                                             | 如果需要原生线程手术，则添加明确的 Codex app-server API。                                   |
| 面向 Codex 原生工具记录的 `tool_result_persist`      | 该钩子转换的是 OpenClaw 拥有的转录写入，而不是 Codex 原生工具记录。                                                                              | 可以镜像转换后的记录，但规范性重写需要 Codex 支持。                                         |
| 丰富的原生压缩元数据                                 | OpenClaw 观察压缩开始和完成，但不会收到稳定的保留/丢弃列表、token 变化量或摘要负载。                                                            | 需要更丰富的 Codex 压缩事件。                                                               |
| 压缩干预                                             | 当前 OpenClaw 的压缩钩子在 Codex 模式下只是通知级别。                                                                                           | 如果插件需要否决或重写原生压缩，则添加 Codex 压缩前/后钩子。                                 |
| 字节级一致的模型 API 请求捕获                         | OpenClaw 可以捕获 app-server 请求和通知，但 Codex 核心会在内部构建最终的 OpenAI API 请求。                                                       | 需要 Codex 模型请求追踪事件或调试 API。                                                     |

## 工具、媒体与压缩

Codex harness 只会改变底层嵌入式 agent 执行器。

OpenClaw 仍然构建工具列表，并从 harness 接收动态工具结果。文本、图像、视频、音乐、TTS、审批以及消息工具输出会继续通过正常的 OpenClaw 投递路径。

原生钩子转发故意保持通用，但 v1 支持契约仅限于 OpenClaw 测试的 Codex 原生工具和权限路径。在 Codex runtime 中，这包括 shell、patch 和 MCP 的 `PreToolUse`、`PostToolUse` 以及 `PermissionRequest` 载荷。不要假设未来所有 Codex 钩子事件在运行时契约明确命名前都属于 OpenClaw 插件表面。

对于 `PermissionRequest`，只有在策略决定时，OpenClaw 才会返回明确的允许或拒绝决定。没有决定的结果不等于允许。Codex 会将其视为没有 hook 决定，并继续走其自身的守护者或用户审批路径。Codex app-server 审批模式默认省略此原生 hook；当 `permission_request` 被显式包含在 `nativeHookRelay.events` 中，或者兼容性运行时安装了它时，本段内容适用。
当运营者为 Codex 原生权限请求选择 `allow-always` 时，OpenClaw 会在有限的会话窗口内记住该 provider/session/tool 输入/cwd 指纹的精确值。被记住的决定是有意仅限于精确匹配：命令、参数、工具载荷或 cwd 发生变化都会创建新的审批。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准请求会通过 OpenClaw 的插件批准流程进行路由。Codex 的 `request_user_input` 提示会发送回原始聊天，下一条排队的后续消息会回答该原生服务器请求，而不是被当作额外上下文进行引导。其他 MCP 触发请求仍会关闭失败。

Active-run 队列 steering 映射到 Codex app-server `turn/steer`。使用默认 `messages.queue.mode: "steer"` 时，OpenClaw 会在配置的静默窗口内批量处理排队的聊天消息，并按到达顺序将它们作为一个 `turn/steer` 请求发送。旧版 `queue` 模式会发送单独的 `turn/steer` 请求。Codex review 和手动压缩轮次可以拒绝同轮 steering，在这种情况下，如果所选模式允许回退，OpenClaw 会使用后续队列。参见
[Steering queue](/concepts/queue-steering)。

当所选模型使用 Codex harness 时，原生线程压缩由 Codex app-server 托管。OpenClaw 保留一份转录镜像，用于渠道历史、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换。该镜像包括用户提示、最终助手文本，以及当 app-server 发出时的轻量级 Codex 推理或计划记录。如今，OpenClaw 只记录原生压缩开始和完成信号。它尚未提供可读的人类压缩摘要，也未提供一份可审计的列表来说明 Codex 在压缩后保留了哪些条目。

由于 Codex 拥有规范性的原生线程，`tool_result_persist` 当前不会重写 Codex 原生工具结果记录。它只在 OpenClaw 正在写入由 OpenClaw 拥有的会话转录工具结果时生效。

媒体生成不需要 PI。图像、视频、音乐、PDF、TTS 和媒体理解继续使用匹配的提供方/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 故障排查

**Codex does not appear as a normal `/model` provider:** 这是新配置中的预期行为。请选择一个 `openai/gpt-*` 模型，启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。旧版 `codex/*` 引用仍然是兼容别名，而不是普通的模型提供商选项。

**OpenClaw uses PI instead of Codex:** 请确保模型引用是官方 OpenAI 提供商上的 `openai/gpt-*`，并且 Codex 插件已安装/启用。如果你在测试时需要严格策略，请设置 provider/model `agentRuntime.id: "codex"`。强制使用 Codex 运行时会失败，而不会回退到 PI。一旦选择了 Codex app-server，其失败会直接显现。

**app-server 被拒绝：** 将 Codex 升级到 app-server 握手报告版本 `0.125.0` 或更高。相同版本的预发布版或带构建后缀的版本，例如 `0.125.0-alpha.2` 或 `0.125.0+custom`，会被拒绝，因为 OpenClaw 测试的是稳定的 `0.125.0` 协议下限。

**模型发现很慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`，以及远程 app-server 是否支持相同的 Codex app-server 协议版本。

**A non-Codex model uses PI:** 这在预期之内，除非 provider/model 运行时策略将其路由到另一个 harness。普通的非 OpenAI provider 引用在 `auto` 模式下会保持在其正常的 provider 路径上。如果你在 provider 或 model 上强制设置 `agentRuntime.id: "codex"`，那么匹配的嵌入式 turns 必须是受 Codex 支持的 OpenAI 模型。

**Computer Use 已安装但工具不运行：** 在一个新的会话中检查 `/codex computer-use status`。如果某个工具报告 `Native hook relay unavailable`，请使用 `/new` 或 `/reset`；如果仍然存在，请重启 gateway 以清除过期的原生钩子注册。如果 `computer-use.list_apps` 超时，请重启 Codex Computer Use 或 Codex Desktop 后重试。

## 相关内容

- [代理运行时插件](/plugins/sdk-agent-harness)
- [代理运行时](/concepts/agent-runtimes)
- [模型提供商](/concepts/model-providers)
- [OpenAI 提供商](/providers/openai)
- [状态](/cli/status)
- [插件钩子](/plugins/hooks)
- [配置参考](/gateway/configuration-reference)
- [测试](/help/testing-live#live-codex-app-server-harness-smoke)
