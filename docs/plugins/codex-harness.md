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

When a source chat turn runs through the Codex harness, visible replies default
to the OpenClaw `message` tool if the deployment has not explicitly configured
`messages.visibleReplies`. The agent can still finish its Codex turn privately;
it only posts to the channel when it calls `message(action="send")`. Set
`messages.visibleReplies: "automatic"` to keep direct-chat final replies on the
legacy automatic delivery path.

Codex 心跳轮次默认也会获得 `heartbeat_respond` 工具，因此
代理可以记录唤醒应保持静默还是通知，而无需将该控制流编码到最终文本中。

如果你想先了解整体情况，从
[Agent runtimes](/concepts/agent-runtimes) 开始。简而言之：
`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、
Discord、Slack 或其他频道仍然是通信界面。

## 快速配置

要让 GPT 代理轮次使用 Codex harness，请将模型引用保持为规范的
`openai/gpt-*`，启用捆绑的 `codex` 插件，并设置
`agentRuntime.id: "codex"`：

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
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
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

不要为此路径使用 `openai-codex/gpt-*`。那会通过
正常的 PI 运行器选择 Codex OAuth，除非你另外强制指定运行时。配置更改适用于
新的或已重置的会话；现有会话会保留其记录的运行时。

## 该插件会改变什么

捆绑的 `codex` 插件提供了几项独立能力：

| 能力                              | 你的使用方式                                      | 它的作用                                                                       |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| 原生嵌入式运行时                  | `agentRuntime.id: "codex"`                          | 通过 Codex app-server 运行 OpenClaw 嵌入式代理轮次。                           |
| 原生聊天控制命令                  | `/codex bind`, `/codex resume`, `/codex steer`, ... | 从消息对话中绑定并控制 Codex app-server 线程。                                 |
| Codex app-server 提供方/目录       | `codex` 内部实现，通过验证器暴露                    | 让运行时发现并验证 app-server 模型。                                           |
| Codex 媒体理解路径               | `codex/*` 图像模型兼容路径                          | 为受支持的图像理解模型运行受限的 Codex app-server 轮次。                      |
| 原生 hook 转发                    | 围绕 Codex 原生事件的插件 hooks                    | 让 OpenClaw 观察/阻止受支持的 Codex 原生工具/终结事件。                       |

启用该插件会让这些能力可用。它并不会：

- 让所有 OpenAI 模型都开始使用 Codex
- 把 `openai-codex/*` 模型引用转换为原生运行时
- 让 ACP/acpx 成为默认 Codex 路径
- 热切换已经记录了 PI 运行时的现有会话
- 替代 OpenClaw 的频道传递、会话文件、认证配置文件存储，或
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

该验证器默认关闭。新的配置应保持 OpenAI 模型引用
规范化为 `openai/gpt-*`，并在需要原生 app-server 执行时显式强制
`agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。
旧的 `codex/*` 模型引用出于兼容性仍会自动选择该验证器，但
由运行时支持的旧提供方前缀不会作为普通模型/提供方选项显示。

如果启用了 `codex` 插件但主模型仍然是
`openai-codex/*`，`openclaw doctor` 会发出警告而不是更改路由。
这是有意为之：`openai-codex/*` 仍然是 PI Codex OAuth/订阅路径，而
原生 app-server 执行仍然是一个显式的运行时选择。

## 路由映射

在更改配置之前，请先使用此表：

| 期望行为                                | 模型引用                   | 运行时配置                              | 插件要求                      | 预期状态标签                   |
| -------------------------------------- | -------------------------- | -------------------------------------- | ---------------------------- | ------------------------------ |
| 通过普通 OpenClaw 运行器使用 OpenAI API | `openai/gpt-*`             | 省略或 `runtime: "pi"`                 | OpenAI 提供方                | `Runtime: OpenClaw Pi Default` |
| 通过 PI 使用 Codex OAuth/订阅            | `openai-codex/gpt-*`       | 省略或 `runtime: "pi"`                 | OpenAI Codex OAuth 提供方    | `Runtime: OpenClaw Pi Default` |
| 原生 Codex app-server 嵌入式轮次         | `openai/gpt-*`             | `agentRuntime.id: "codex"`             | `codex` 插件                 | `Runtime: OpenAI Codex`        |
| 使用保守自动模式的混合提供方             | 特定于提供方的引用          | `agentRuntime.id: "auto"`              | 可选插件运行时               | 取决于所选运行时               |
| 显式 Codex ACP 适配器会话               | 取决于 ACP 提示/模型        | 带有 `runtime: "acp"` 的 `sessions_spawn` | 健康的 `acpx` 后端            | ACP 任务/会话状态              |

关键区别在于提供方与运行时：

- `openai-codex/*` 回答的是“PI 应该使用哪个提供方/认证路径？”
- `agentRuntime.id: "codex"` 回答的是“哪个循环应该执行这个
  嵌入式轮次？”
- `/codex ...` 回答的是“这个聊天应该绑定或控制哪个原生 Codex 对话？”
- ACP 回答的是“acpx 应该启动哪个外部验证器进程？”

## 选择正确的模型前缀

OpenAI 系列路由对前缀是区分的。当你希望
通过 PI 使用 Codex OAuth 时，用 `openai-codex/*`；当你想要直接访问 OpenAI API 或
强制使用原生 Codex app-server 验证器时，用 `openai/*`：

| 模型引用                                      | 运行时路径                                  | 适用场景                                                               |
| --------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `openai/gpt-5.4`                              | 通过 OpenClaw/PI 管道的 OpenAI 提供方        | 你想使用当前的直接 OpenAI Platform API 访问，并使用 `OPENAI_API_KEY`。 |
| `openai-codex/gpt-5.5`                        | 通过 OpenClaw/PI 的 OpenAI Codex OAuth      | 你想使用 ChatGPT/Codex 订阅认证，并使用默认的 PI 运行器。             |
| `openai/gpt-5.5` + `agentRuntime.id: "codex"` | Codex app-server 验证器                     | 你想为嵌入式代理轮次使用原生 Codex app-server 执行。                  |

GPT-5.5 目前在 OpenClaw 中仅支持订阅/OAuth。对于 PI OAuth，请使用
`openai-codex/gpt-5.5`，或使用带有 Codex
app-server 验证器的 `openai/gpt-5.5`。当 OpenAI 在公共 API 上启用 GPT-5.5 后，
`openai/gpt-5.5` 的直接 API 密钥访问就会受到支持。

旧的 `codex/gpt-*` 引用仍被接受为兼容别名。doctor
兼容迁移会将旧的主运行时引用重写为规范化的模型
引用，并单独记录运行时策略；而仅用于回退的旧引用会保持不变，
因为运行时是为整个代理容器配置的。新的 PI Codex OAuth 配置
应使用 `openai-codex/gpt-*`；新的原生
app-server 验证器配置应使用 `openai/gpt-*` 加上
`agentRuntime.id: "codex"`。

`agents.defaults.imageModel` 遵循相同的前缀划分。当图像理解应通过 OpenAI
Codex OAuth 提供方路径运行时，使用 `openai-codex/gpt-*`。当图像理解应通过受限的 Codex
app-server 轮次运行时，使用 `codex/gpt-*`。Codex app-server 模型必须
声明支持图像输入；仅文本的 Codex 模型会在媒体轮次开始前失败。

使用 `/status` 来确认当前会话的实际验证器。如果
选择结果出乎意料，请为 `agents/harness` 子系统启用调试日志，并检查网关的结构化
`agent harness selected` 记录。它包含所选验证器 id、选择原因、运行时/回退策略，以及在
`auto` 模式下每个插件候选项的支持结果。

### doctor 警告意味着什么

当以下所有条件都满足时，`openclaw doctor` 会发出警告：

- 捆绑的 `codex` 插件已启用或被允许
- 某个代理的主模型是 `openai-codex/*`
- 该代理的实际运行时不是 `codex`

出现该警告是因为用户通常会认为“启用了 Codex 插件”就意味着
“原生 Codex app-server 运行时”。OpenClaw 不会自动做出这种推断。该警告的含义是：

- 如果你本来就打算通过 PI 使用 ChatGPT/Codex OAuth，则**无需更改**。
- 如果你本来想要原生 app-server
  执行，请将模型改为 `openai/<model>` 并设置
  `agentRuntime.id: "codex"`。
- 运行时变更后，现有会话仍然需要使用 `/new` 或 `/reset`，
  因为会话运行时绑定是粘性的。

验证器选择不是实时会话控制。当一个嵌入式轮次运行时，
OpenClaw 会把所选验证器 id 记录到该会话上，并在同一会话 id 的后续轮次中继续使用它。
当你希望未来的会话使用另一个验证器时，请更改 `agentRuntime` 配置或
`OPENCLAW_AGENT_RUNTIME`；当你想在现有对话中在 PI 和 Codex 之间切换前，
使用 `/new` 或 `/reset` 开启一个新会话。这样可以避免把一份转录通过两个不兼容的原生会话系统重放。

在验证器绑定之前创建的旧会话，如果已经有转录历史，会被视为已绑定到 PI。
在更改配置后，使用 `/new` 或 `/reset` 将该对话切换到 Codex。

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

## 将 Codex 与其他模型一起添加

不要在全局设置 `agentRuntime.id: "codex"`，如果同一个 agent 需要在 Codex 和非 Codex 提供方模型之间自由切换。强制运行时会应用于该 agent 或会话的每个嵌入式 turn。如果你在强制该运行时的同时选择 Anthropic 模型，OpenClaw 仍会尝试使用 Codex harness，并直接失败，而不是静默地通过 PI 路由该 turn。

请改用以下任一结构：

- 将 Codex 放到一个专用 agent 上，并设置 `agentRuntime.id: "codex"`。
- 让默认 agent 保持 `agentRuntime.id: "auto"`，并为正常的混合提供方使用保留 PI 回退。
- 仅将旧式 `codex/*` 引用用于兼容性。新配置应优先使用 `openai/*`，并显式指定 Codex 运行时策略。

例如，下面的配置会让默认 agent 保持正常自动选择，并新增一个单独的 Codex agent：

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
      agentRuntime: {
        id: "auto",
        fallback: "pi",
      },
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
        agentRuntime: {
          id: "codex",
        },
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

| 用户请求...                                             | Agent 应使用...                                |
| ------------------------------------------------------ | ---------------------------------------------- |
| “将此聊天绑定到 Codex”                                   | `/codex bind`                                  |
| “在这里恢复 Codex 线程 `<id>`”                            | `/codex resume <id>`                           |
| “显示 Codex 线程”                                        | `/codex threads`                               |
| “为一次有问题的 Codex 运行提交支持报告”                   | `/diagnostics [note]`                          |
| “仅为这个附加的线程发送 Codex 反馈”                       | `/codex diagnostics [note]`                    |
| “将 Codex 作为这个 agent 的运行时”                        | 配置更改为 `agentRuntime.id`                   |
| “使用我的 ChatGPT/Codex 订阅配合正常的 OpenClaw”         | `openai-codex/*` 模型引用                      |
| “通过 ACP/acpx 运行 Codex”                               | ACP `sessions_spawn({ runtime: "acp", ... })`  |
| “在线程中启动 Claude Code/Gemini/OpenCode/Cursor”        | ACP/acpx，而不是 `/codex`，也不是原生子 agent |

只有在 ACP 已启用、可调度，并且有已加载的运行时后端支持时，OpenClaw 才会向 agent 公开 ACP spawn 指引。如果 ACP 不可用，系统提示词和插件技能就不应教 agent 关于 ACP 路由的内容。

## 仅限 Codex 的部署

当你需要证明每个嵌入式 agent turn 都使用 Codex 时，强制使用 Codex harness。显式插件运行时默认没有 PI 回退，因此 `fallback: "none"` 是可选的，但通常作为文档说明很有用：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
    },
  },
}
```

环境变量覆盖：

```bash
OPENCLAW_AGENT_RUNTIME=codex openclaw gateway run
```

在强制使用 Codex 时，如果 Codex 插件被禁用、app-server 版本过旧，或者 app-server 无法启动，OpenClaw 会提前失败。只有当你有意让 PI 处理缺失的 harness 选择时，才设置 `OPENCLAW_AGENT_HARNESS_FALLBACK=pi`。

## 按 agent 使用 Codex

你可以让某个 agent 仅使用 Codex，而默认 agent 保持正常的自动选择：

```json5
{
  agents: {
    defaults: {
      agentRuntime: {
        id: "auto",
        fallback: "pi",
      },
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
        agentRuntime: {
          id: "codex",
          fallback: "none",
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

默认情况下，OpenClaw 以 YOLO 模式启动本地 Codex harness 会话：`approvalPolicy: "never"`、`approvalsReviewer: "user"`，以及 `sandbox: "danger-full-access"`。这是用于自治心跳的受信任本地操作员姿态：Codex 可以使用 shell 和网络工具，而不会停在原生审批提示上等待无人响应。

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
            serviceTier: "fast",
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

Codex 迁移提供程序会将技能复制到当前 OpenClaw agent 工作区。Codex 原生插件、hooks 和配置文件会被报告或归档以供人工审查，而不会自动激活，因为它们可能执行命令、暴露 MCP 服务器或携带凭据。

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

Codex 动态工具默认使用 `native-first` 配置文件。在该模式下，OpenClaw 不会公开那些与 Codex 原生工作区操作重复的动态工具：`read`、`write`、`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。OpenClaw 集成工具，如 messaging、sessions、media、cron、browser、nodes、gateway、`heartbeat_respond` 和 `web_search` 仍然可用。

支持的顶层 Codex 插件字段：

| 字段                      | 默认值           | 含义                                                                                   |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `codexDynamicToolsProfile` | `"native-first"` | 使用 `"openclaw-compat"` 可向 Codex app-server 公开完整的 OpenClaw 动态工具集。 |
| `codexDynamicToolsExclude` | `[]`             | 要从 Codex app-server turn 中额外省略的 OpenClaw 动态工具名称。               |

支持的 `appServer` 字段：

| 字段               | 默认值                                   | 含义                                                                                                                                                                                                                              |
| ------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` 启动 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                                             |
| `command`          | 托管的 Codex 二进制文件                    | 用于 stdio 传输的可执行文件。保持未设置以使用托管二进制文件；仅在显式覆盖时才设置。                                                                                                                                                |
| `args`              | `["app-server", "--listen", "stdio://"]` | 用于 stdio 传输的参数。                                                                                                                                                                                                          |
| `url`               | 未设置                                   | WebSocket app-server URL。                                                                                                                                                                                                       |
| `authToken`         | 未设置                                   | WebSocket 传输的 Bearer token。                                                                                                                                                                                                  |
| `headers`           | `{}`                                     | 额外的 WebSocket 标头。                                                                                                                                                                                                          |
| `clearEnv`          | `[]`                                     | 在 OpenClaw 构建其继承环境后，从启动的 stdio app-server 进程中移除的额外环境变量名。`CODEX_HOME` 和 `HOME` 保留用于 OpenClaw 在本地启动时对每个 agent 的 Codex 隔离。 |
| `requestTimeoutMs`  | `60000`                                  | app-server 控制平面调用的超时。                                                                                                                                                                                                  |
| `mode`              | `"yolo"`                                 | 用于 YOLO 或经 guardian 审查执行的预设。                                                                                                                                                                                         |
| `approvalPolicy`    | `"never"`                                | 发送到 thread start/resume/turn 的原生 Codex 审批策略。                                                                                                                                                                          |
| `sandbox`           | `"danger-full-access"`                   | 发送到 thread start/resume 的原生 Codex sandbox 模式。                                                                                                                                                                          |
| `approvalsReviewer` | `"user"`                                 | 使用 `"auto_review"` 可让 Codex 审查原生审批提示。`guardian_subagent` 仍是旧别名。                                                                                                                                               |
| `serviceTier`       | 未设置                                   | 可选的 Codex app-server 服务层级：`"fast"`、`"flex"` 或 `null`。无效的旧值会被忽略。                                                                                                                                             |

OpenClaw 拥有的动态工具调用与 `appServer.requestTimeoutMs` 独立限制：每个 Codex `item/tool/call` 请求都必须在 30 秒内收到 OpenClaw 响应。超时后，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便 turn 继续进行，而不是让会话停留在 `processing` 状态。

在 OpenClaw 对 Codex 的 turn 范围 app-server 请求作出响应后，harness 还会期望 Codex 通过 `turn/completed` 完成原生 turn。如果 app-server 在该响应后 60 秒内保持静默，OpenClaw 会尽力中断 Codex turn，记录诊断超时，并释放 OpenClaw 会话通道，从而避免后续聊天消息排在一个过时的原生 turn 后面。

本地测试仍可使用环境变量覆盖：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或在一次性本地测试中使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，更推荐使用配置，因为它将插件行为与 Codex harness 设置的其余部分放在同一个经过审查的文件中。

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
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
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
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
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

### 常见调试流程

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

OpenClaw 不使用项目或全局 Codex `hooks.json` 文件来路由 OpenClaw 插件行为。对于受支持的原生工具和权限桥接，OpenClaw 会注入每线程 Codex 配置，用于 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop`。其他 Codex hooks，例如 `SessionStart` 和 `UserPromptSubmit`，仍然是 Codex 级别的控制；在 v1 协议中，它们不会作为 OpenClaw 插件 hooks 暴露。

对于 OpenClaw 动态工具，Codex 请求调用之后由 OpenClaw 执行该工具，因此 OpenClaw 会触发它在 harness 适配器中所拥有的插件和中间件行为。对于 Codex 原生工具，规范的工具记录由 Codex 拥有。OpenClaw 可以镜像部分事件，但除非 Codex 通过 app-server 或原生 hook 回调公开该操作，否则它不能重写原生 Codex 线程。

压缩和 LLM 生命周期投影来自 Codex app-server 通知和 OpenClaw 适配器状态，而不是原生 Codex hook 命令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是适配器级别的观察，不是对 Codex 内部请求或压缩负载的逐字节捕获。

Codex 原生的 `hook/started` 和 `hook/completed` app-server 通知会作为 `codex_app_server.hook` 代理事件进行投影，用于轨迹记录和调试。它们不会调用 OpenClaw 插件 hooks。

## V1 支持契约

Codex 模式并不是带有不同底层模型调用的 PI。Codex 拥有更多原生模型循环的控制权，而 OpenClaw 围绕该边界调整其插件和会话表面。

在 Codex runtime v1 中受支持：

| Surface                                       | Support                                 | Why                                                                                                                                                                                                   |
| --------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 的 OpenAI 模型循环                | Supported                               | Codex app-server 拥有 OpenAI 轮次、原生线程恢复以及原生工具续接。                                                                                                                                    |
| OpenClaw 通道路由与投递                       | Supported                               | Telegram、Discord、Slack、WhatsApp、iMessage 以及其他通道都保持在模型运行时之外。                                                                                                                   |
| OpenClaw 动态工具                            | Supported                               | Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。                                                                                                                                   |
| 提示词与上下文插件                           | Supported                               | OpenClaw 会构建提示词覆盖层，并在开始或恢复线程之前将上下文投射到 Codex 轮次中。                                                                                                                      |
| 上下文引擎生命周期                           | Supported                               | 组装、摄取或轮次后维护，以及上下文引擎压缩协调都会在 Codex 轮次中运行。                                                                                                                               |
| 动态工具钩子                                 | Supported                               | `before_tool_call`、`after_tool_call` 和工具结果中间件会围绕 OpenClaw 拥有的动态工具运行。                                                                                                           |
| 生命周期钩子                                 | Supported as adapter observations       | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会以真实的 Codex 模式负载触发。                                                                                      |
| 最终答案修订门控                             | Supported through the native hook relay | Codex `Stop` 会转发到 `before_agent_finalize`；`revise` 会在最终定稿前要求 Codex 再进行一次模型推理。                                                                                                 |
| 原生 shell、patch 和 MCP 阻断或观察           | Supported through the native hook relay | Codex `PreToolUse` 和 `PostToolUse` 会针对已提交的原生工具表面进行转发，包括 Codex app-server `0.125.0` 或更高版本上的 MCP 载荷。支持阻断；不支持参数重写。                                             |
| 原生权限策略                                 | Supported through the native hook relay | 当运行时暴露出 Codex `PermissionRequest` 时，可以通过 OpenClaw 策略进行路由。如果 OpenClaw 不返回决策，Codex 会通过其正常的 guardian 或用户批准路径继续执行。                                              |
| App-server 轨迹捕获                           | Supported                               | OpenClaw 会记录其发送给 app-server 的请求，以及 app-server 接收到的通知。                                                                                                                             |

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

原生钩子转发故意保持通用，但 v1 支持契约仅限于 OpenClaw 测试的 Codex 原生工具和权限路径。在 Codex runtime 中，这包括 shell、patch 和 MCP 的 `PreToolUse`、`PostToolUse` 以及 `PermissionRequest` 载荷。不要假设未来所有 Codex 钩子事件在运行时契约明确命名之前都属于 OpenClaw 插件表面。

对于 `PermissionRequest`，OpenClaw 仅在策略决定时返回明确的允许或拒绝决策。无决策结果不等于允许。Codex 会将其视为没有钩子决策，并继续走自己的 guardian 或用户批准路径。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准请求会通过 OpenClaw 的插件批准流程进行路由。Codex 的 `request_user_input` 提示会发送回原始聊天，下一条排队的后续消息会回答该原生服务器请求，而不是被当作额外上下文进行引导。其他 MCP 触发请求仍会关闭失败。

Active-run queue steering maps onto Codex app-server `turn/steer`. With the
默认 `messages.queue.mode: "steer"`，OpenClaw 将在配置的静默窗口内批量处理排队的聊天消息，并按到达顺序将它们作为一个 `turn/steer` 请求发送。旧版 `queue` 模式会发送单独的 `turn/steer` 请求。Codex review 和手动压缩轮次可以拒绝同轮 steering，在这种情况下，如果所选模式允许回退，OpenClaw 会使用后续队列。参见
[Steering queue](/concepts/queue-steering)。

When the selected model uses the Codex harness, native thread compaction is
delegated to Codex app-server. OpenClaw keeps a transcript mirror for channel
history, search, `/new`, `/reset`, and future model or harness switching. The
mirror includes the user prompt, final assistant text, and lightweight Codex
reasoning or plan records when the app-server emits them. Today, OpenClaw only
records native compaction start and completion signals. It does not yet expose a
human-readable compaction summary or an auditable list of which entries Codex
kept after compaction.

由于 Codex 拥有规范性的原生线程，`tool_result_persist` 当前不会重写 Codex 原生工具结果记录。它只在 OpenClaw 正在写入由 OpenClaw 拥有的会话转录工具结果时生效。

媒体生成不需要 PI。图像、视频、音乐、PDF、TTS 和媒体理解继续使用匹配的提供方/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 故障排查

**Codex 没有作为普通的 `/model` 提供方出现：** 对于新配置来说这是预期行为。选择一个 `openai/gpt-*` 模型，并设置 `agentRuntime.id: "codex"`（或旧的 `codex/*` 引用），启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用了 PI 而不是 Codex：** 当没有 Codex harness 声明该运行时，`agentRuntime.id: "auto"` 仍可能使用 PI 作为兼容后端。测试时将 `agentRuntime.id: "codex"` 设为强制选择 Codex。现在，强制 Codex runtime 会直接失败，而不会回退到 PI，除非你显式设置 `agentRuntime.fallback: "pi"`。一旦选择了 Codex app-server，其失败会直接暴露出来，不会再有额外的回退配置。

**app-server 被拒绝：** 将 Codex 升级到 app-server 握手报告版本 `0.125.0` 或更高。相同版本的预发布版或带构建后缀的版本，例如 `0.125.0-alpha.2` 或 `0.125.0+custom`，会被拒绝，因为 OpenClaw 测试的是稳定的 `0.125.0` 协议下限。

**模型发现很慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`，以及远程 app-server 是否支持相同的 Codex app-server 协议版本。

**非 Codex 模型使用了 PI：** 除非你为该 agent 强制设置了 `agentRuntime.id: "codex"` 或选择了旧的 `codex/*` 引用，否则这是预期行为。普通的 `openai/gpt-*` 和其他提供方引用在 `auto` 模式下会保持各自正常的提供方路径。如果你强制设置 `agentRuntime.id: "codex"`，那么该 agent 的每个嵌入式轮次都必须是 Codex 支持的 OpenAI 模型。

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
