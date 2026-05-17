---
summary: "通过捆绑的 Codex app-server 验证器运行 OpenClaw 嵌入式代理轮次"
title: "Codex 验证器"
read_when:
  - 你想使用捆绑的 Codex app-server 验证器
  - 你需要 Codex 验证器配置示例
  - 你希望仅 Codex 部署在失败时不要回退到 PI
---

捆绑的 `codex` 插件让 OpenClaw 通过 Codex app-server 而不是内置的 PI harness 运行嵌入式 OpenAI 代理轮次。

当你希望由 Codex 接管底层代理会话时，请使用 Codex harness：原生线程恢复、原生工具续接、原生压缩，以及 app-server 执行。OpenClaw 仍然负责聊天通道、会话文件、模型选择、OpenClaw 动态工具、审批、媒体传递，以及可见的转录镜像。

正常设置使用规范的 OpenAI 模型引用，例如 `openai/gpt-5.5`。不要配置 `openai-codex/gpt-*` 模型引用。将 OpenAI 代理认证顺序放在 `auth.order.openai` 下；较旧的 `openai-codex:*` 配置文件和 `auth.order.openai-codex` 条目仍对现有安装受支持。

OpenClaw 以 Codex 原生代码模式和仅代码模式启用来启动 Codex app-server 线程。这会将延迟/可搜索的 OpenClaw 动态工具保留在 Codex 自己的代码执行和工具搜索范围内，而不是在 Codex 之上再增加一层 PI 风格的工具搜索包装器。

关于更广泛的模型/提供方/运行时拆分，请先阅读
[代理运行时](/concepts/agent-runtimes)。简而言之：
`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、Discord、Slack 或其他通道仍然是通信界面。

## 需求

- 可使用捆绑 `codex` 插件的 OpenClaw。
- 如果你的配置使用 `plugins.allow`，请包含 `codex`。
- Codex app-server 0.125.0 或更新版本。捆绑插件默认会管理一个兼容的 Codex app-server 二进制文件，因此 `PATH` 上的本地 `codex` 命令不会影响正常的 harness 启动。
- 可通过 `openclaw models auth login --provider openai-codex`、代理的 Codex 主目录中的 app-server 账户，或显式的 Codex API 密钥认证配置文件获得 Codex 认证。

关于认证优先级、环境隔离、自定义 app-server 命令、模型发现以及所有配置字段，请参见
[Codex harness 参考](/plugins/codex-harness-reference)。

## 快速开始

大多数希望在 OpenClaw 中使用 Codex 的用户都希望走这条路径：使用 ChatGPT/Codex 订阅登录，启用捆绑的 `codex` 插件，并使用规范的 `openai/gpt-*` 模型引用。

使用 Codex OAuth 登录：

```bash
openclaw models auth login --provider openai-codex
```

启用捆绑的 `codex` 插件并选择一个 OpenAI 代理模型：

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

如果你的配置使用 `plugins.allow`，也请在其中添加 `codex`：

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

更改插件配置后重启网关。如果现有聊天已经有会话，在测试运行时变更之前请使用 `/new` 或 `/reset`，这样下一轮会从当前配置解析 harness。

## 配置

快速开始配置是最小可用的 Codex harness 配置。在 OpenClaw 配置中设置 Codex harness 选项，并且仅将 CLI 用于 Codex 认证：

| 需求                                   | 设置                                                                             | 位置                               |
| -------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 启用 harness                          | `plugins.entries.codex.enabled: true`                                            | OpenClaw 配置                    |
| 保留允许列表插件安装                  | 在 `plugins.allow` 中包含 `codex`                                                | OpenClaw 配置                    |
| 通过 Codex 路由 OpenAI 代理轮次      | `agents.defaults.model` 或 `agents.list[].model` 使用 `openai/gpt-*`            | OpenClaw 代理配置              |
| 使用 Codex OAuth 登录                 | `openclaw models auth login --provider openai-codex`                             | CLI 认证配置文件               |
| 为 Codex 运行添加 API 密钥备用       | 在 `auth.order.openai` 中将 `openai:*` API 密钥配置文件列在订阅认证之后       | CLI 认证配置文件 + OpenClaw 配置 |
| 当 Codex 不可用时关闭失败            | 提供方或模型 `agentRuntime.id: "codex"`                                           | OpenClaw 模型/提供方配置        |
| 使用直接 OpenAI API 流量             | 提供方或模型 `agentRuntime.id: "pi"` 并使用正常的 OpenAI 认证                  | OpenClaw 模型/提供方配置        |
| 调整 app-server 行为                  | `plugins.entries.codex.config.appServer.*`                                       | Codex 插件配置                 |
| 启用原生 Codex 插件应用              | `plugins.entries.codex.config.codexPlugins.*`                                    | Codex 插件配置                 |
| 启用 Codex Computer Use              | `plugins.entries.codex.config.computerUse.*`                                     | Codex 插件配置                 |

对由 Codex 支持的 OpenAI 代理轮次，请使用 `openai/gpt-*` 模型引用。优先使用 `auth.order.openai` 进行“订阅优先/API 密钥备用”的排序。现有的 `openai-codex:*` 认证配置文件和 `auth.order.openai-codex` 仍然有效，但不要编写新的 `openai-codex/gpt-*` 模型引用。

不要在由 Codex 支持的代理上设置 `compaction.model` 或 `compaction.provider`，除非所选上下文引擎拥有压缩能力。若没有拥有该能力的上下文引擎，Codex 会通过其原生 app-server 线程状态进行压缩，因此 OpenClaw 在运行时会忽略这些本地摘要器覆盖项，并且当代理使用 Codex 时，`openclaw doctor --fix` 会将其移除。

Lossless 仍然支持作为上下文引擎。请通过 `plugins.slots.contextEngine: "lossless-claw"` 和 `plugins.entries.lossless-claw.config.summaryModel` 进行配置，而不是通过 `agents.defaults.compaction.provider`。当 Codex 是活动运行时时，`openclaw doctor --fix` 会将旧的 `compaction.provider: "lossless-claw"` 形态迁移到 Lossless 上下文引擎槽位。

当活动上下文引擎报告 `ownsCompaction: true` 时，`/compact` 会运行该引擎的压缩生命周期，并使绑定的 Codex app-server 线程失效。下一次 Codex 轮次会启动一个新的后端线程，并从上下文引擎重新加载，而不是在引擎拥有的语义摘要之上再叠加 Codex 原生压缩。

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在这种结构下，这两个配置文件在 `openai/gpt-*` 代理轮次中仍然通过 Codex 运行。API 密钥只是认证备用，而不是要求切换到 PI 或纯 OpenAI Responses。

本页其余部分涵盖用户必须在其中做出选择的常见变体：部署形态、关闭失败路由、guardian 审批策略、原生 Codex 插件，以及 Computer Use。完整选项列表、默认值、枚举、发现、环境隔离、超时以及 app-server 传输字段，请参见
[Codex harness 参考](/plugins/codex-harness-reference)。

## 验证 Codex 运行时

在你预期使用 Codex 的聊天中使用 `/status`。一个由 Codex 支持的 OpenAI 代理轮次会显示：

```text
Runtime: OpenAI Codex
```

然后检查 Codex app-server 状态：

```text
/codex status
/codex models
```

`/codex status` 会报告 app-server 连通性、账户、速率限制、MCP 服务器和技能。`/codex models` 列出该 harness 和账户的实时 Codex app-server 目录。如果 `/status` 的结果出乎意料，请参见
[故障排除](#troubleshooting)。

## 路由和模型选择

将提供方引用和运行时策略分开：

- 对于通过 Codex 运行的 OpenAI 代理轮次，使用 `openai/gpt-*`。
- 不要在配置中使用 `openai-codex/gpt-*`。运行 `openclaw doctor --fix` 以修复旧引用和过时的会话路由固定。
- `agentRuntime.id: "codex"` 对正常的 OpenAI 自动模式是可选的，但当部署在 Codex 不可用时应关闭失败时很有用。
- `agentRuntime.id: "pi"` 会在该行为是有意的情况下，将提供方或模型切换为直接 PI 行为。
- `/codex ...` 控制来自聊天的原生 Codex app-server 会话。
- ACP/acpx 是一条单独的外部 harness 路径。仅当用户要求 ACP/acpx 或外部 harness 适配器时才使用它。

常见命令路由：

| 用户意图                                           | 使用                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 绑定当前聊天                                       | `/codex bind [--cwd <path>]`                                                                          |
| 恢复现有的 Codex 线程                              | `/codex resume <thread-id>`                                                                           |
| 列出或筛选 Codex 线程                               | `/codex threads [filter]`                                                                             |
| 在配对节点上附加现有的 Codex CLI 会话              | `/codex sessions --host <node> [filter]`，然后 `/codex resume <session-id> --host <node> --bind here` |
| 仅发送 Codex 反馈                                  | `/codex diagnostics [note]`                                                                           |
| 启动 ACP/acpx 任务                                  | ACP/acpx 会话命令，而不是 `/codex`                                                               |

| 使用场景                                             | 配置                                                        | 验证                                  | 备注                              |
| ------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| 使用 ChatGPT/Codex 订阅并采用原生 Codex 运行时 | `openai/gpt-*` 加上已启用的 `codex` 插件                       | `/status` 显示 `Runtime: OpenAI Codex` | 推荐路径                   |
| 如果 Codex 不可用则关闭失败                  | 提供方或模型 `agentRuntime.id: "codex"`                     | 轮次失败而不是回退到 PI       | 用于仅 Codex 部署     |
| 通过 PI 进行直接 OpenAI API 密钥流量             | 提供方或模型 `agentRuntime.id: "pi"` 并使用正常的 OpenAI 认证 | `/status` 显示 PI 运行时              | 仅在有意使用 PI 时采用    |
| 旧版配置                                        | `openai-codex/gpt-*`                                             | `openclaw doctor --fix` 会重写它     | 不要以这种方式编写新配置   |
| ACP/acpx Codex 适配器                               | ACP `sessions_spawn({ runtime: "acp" })`                         | ACP 任务/会话状态                 | 与原生 Codex harness 分离 |

`agents.defaults.imageModel` 遵循相同的前缀拆分。对于正常的 OpenAI 路由使用 `openai/gpt-*`，仅当图像理解应通过受限的 Codex app-server 轮次运行时才使用 `codex/gpt-*`。不要使用 `openai-codex/gpt-*`；doctor 会将该旧前缀重写为 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

当所有 OpenAI agent 回合都应默认使用 Codex 时，请使用快速开始配置。

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

### 混合提供商部署

这种结构将 Claude 保持为默认 agent，并添加一个命名的 Codex agent：

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

使用此配置时，`main` agent 使用其正常的提供商路径，而 `codex` agent 使用 Codex app-server。

### 失败即关闭的 Codex 部署

对于 OpenAI agent 回合，当捆绑插件可用时，`openai/gpt-*` 已经会解析为 Codex。若你想要写明一条失败即关闭的规则，请添加显式运行时策略：

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

在强制使用 Codex 时，如果 Codex 插件被禁用、app-server 版本太旧，或 app-server 无法启动，OpenClaw 会尽早失败。

## App-server 策略

默认情况下，插件会使用 stdio 传输在本地启动 OpenClaw 托管的 Codex 二进制文件。仅当你有意运行其他可执行文件时，才设置 `appServer.command`。只有在 app-server 已在其他地方运行时，才使用 WebSocket 传输：

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
            authToken: "${CODEX_APP_SERVER_TOKEN}",
          },
        },
      },
    },
  },
}
```

本地 stdio app-server 会话默认采用受信任的本地操作员姿态：
`approvalPolicy: "never"`、`approvalsReviewer: "user"`，以及
`sandbox: "danger-full-access"`。如果本地 Codex 要求不允许这种隐含的 YOLO 姿态，OpenClaw 会改为选择允许的 guardian 权限。当 OpenClaw 沙箱对该会话处于活动状态时，OpenClaw 会将 Codex 的 `danger-full-access` 收窄为 Codex 的 `workspace-write`，以便原生 Codex 代码模式回合仍留在沙箱化工作区内。

当你想要在沙箱逃逸前或额外权限前让 Codex 进行原生自动审查时，请使用 guardian 模式：

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

在本地要求允许这些值时，guardian 模式会扩展为 Codex app-server 的审批设置，通常为
`approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"`，以及
`sandbox: "workspace-write"`。

关于每个 app-server 字段、认证顺序、环境隔离、发现与超时行为，请参见 [Codex harness 参考](/plugins/codex-harness-reference)。

## 命令与诊断

捆绑插件会将 `/codex` 注册为任何支持 OpenClaw 文本命令的频道上的斜杠命令。

常见形式：

- `/codex status` 检查 app-server 连通性、模型、账户、速率限制、
  MCP 服务器和技能。
- `/codex models` 列出实时的 Codex app-server 模型。
- `/codex threads [filter]` 列出最近的 Codex app-server 线程。
- `/codex resume <thread-id>` 将当前 OpenClaw 会话附加到一个
  现有的 Codex 线程。
- `/codex compact` 请求 Codex app-server 压缩所附加的线程。
- `/codex review` 为所附加的线程启动 Codex 原生审查。
- `/codex diagnostics [note]` 在发送所附加线程的 Codex 反馈前先请求确认。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex app-server MCP 服务器状态。
- `/codex skills` 列出 Codex app-server 技能。

对于大多数支持报告，请先在 bug 发生的对话中运行 `/diagnostics [note]`。它会创建一份 Gateway 诊断报告，并且对于 Codex harness 会话，会请求批准发送相关的 Codex 反馈包。关于隐私模型和群聊行为，请参见 [Diagnostics export](/gateway/diagnostics)。

仅当你明确希望为当前附加线程上传 Codex 反馈，而不需要完整的 Gateway 诊断包时，才使用 `/codex diagnostics [note]`。

### 在本地检查 Codex 线程

检查一次有问题的 Codex 运行，最快的方法通常是直接打开原生 Codex 线程：

```bash
codex resume <thread-id>
```

可从已完成的 `/diagnostics` 回复、`/codex binding` 或
`/codex threads [filter]` 中获取线程 id。

有关上传机制和运行时级诊断边界，请参见
[Codex harness 运行时](/plugins/codex-harness-runtime#codex-feedback-upload)。

认证按以下顺序选择：

1. 为该 agent 排序好的 OpenAI 认证配置文件，最好位于
   `auth.order.openai` 下。现有 `openai-codex:*` 配置文件 id 仍然有效。
2. 该 agent 的 Codex home 中 app-server 现有的账户。
3. 仅对于本地 stdio app-server 启动：当不存在 app-server 账户且仍需要 OpenAI 认证时，先使用 `CODEX_API_KEY`，然后是 `OPENAI_API_KEY`。

当 OpenClaw 检测到 ChatGPT 订阅型 Codex 认证配置文件时，它会从启动的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这可以让 Gateway 级别的 API key 继续可用于 embeddings 或直接的 OpenAI 模型，而不会让原生 Codex app-server turn 意外地按 API 计费。显式的 Codex API key 配置文件以及本地 stdio 环境 key 回退会使用 app-server 登录，而不是继承的子进程环境。WebSocket app-server 连接不会获得 Gateway 环境 API key 回退；请使用显式认证配置文件或远程 app-server 自己的账户。

如果某个订阅配置文件遇到 Codex 使用限制，OpenClaw 会在 Codex 报告时记录重置时间，并为同一次 Codex 运行尝试下一个按顺序排列的认证配置文件。当重置时间过去后，无需更改所选的 `openai/gpt-*` 模型或 Codex 运行时，该订阅配置文件就会再次具备资格。

对于本地 stdio app-server 启动，OpenClaw 会将 `CODEX_HOME` 设置为每个 agent 各自的目录，这样 Codex 配置、认证/账户文件、插件缓存/数据以及原生线程状态默认不会读写操作员的个人 `~/.codex`。OpenClaw 会保留正常的进程 `HOME`；Codex 运行的子进程仍可找到用户主目录下的配置和令牌，并且 Codex 可能会发现共享的
`$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 条目。

如果部署需要额外的环境隔离，请将这些变量添加到
`appServer.clearEnv`：

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

`appServer.clearEnv` 只影响被启动的 Codex app-server 子进程。OpenClaw 会在本地启动规范化期间将 `CODEX_HOME` 和 `HOME` 从该列表中移除：`CODEX_HOME` 保持为每个 agent 独立，`HOME` 保持继承，以便子进程可以使用正常的用户主目录状态。

Codex 动态工具默认以 `searchable` 方式加载。OpenClaw 不会暴露那些与 Codex 原生工作区操作重复的动态工具：`read`、`write`、`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。其余 OpenClaw 集成工具，例如 messaging、sessions、media、cron、browser、nodes、gateway、`heartbeat_respond` 和 `web_search`，都可以通过 `openclaw` 命名空间下的 Codex 工具搜索获得，从而保持初始模型上下文更小。
`sessions_yield` 和仅消息工具的源回复仍然保持直接，因为它们属于回合控制契约。心跳协作说明会要求 Codex 在结束一个心跳回合前搜索 `heartbeat_respond`，前提是该工具尚未加载。

仅当连接到一个无法搜索延迟动态工具的自定义 Codex app-server，或在调试完整工具负载时，才将 `codexDynamicToolsLoading: "direct"` 设为直连。

支持的顶层 Codex 插件字段：

| 字段                      | 默认值        | 含义                                                                                  |
| -------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 可将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 额外要从 Codex app-server 回合中省略的 OpenClaw 动态工具名称。              |
| `codexPlugins`             | disabled       | 用于迁移后的源安装精选插件的原生 Codex 插件/app 支持。           |

支持的 `appServer` 字段：

| 字段                         | 默认值                                                | 含义                                                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                              | `"stdio"` 启动 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                                                |
| `command`                     | managed Codex binary                                   | 用于 stdio 传输的可执行文件。留空则使用托管二进制文件；仅在需要显式覆盖时设置。                                                                                                                            |
| `args`                        | `["app-server", "--listen", "stdio://"]`               | 用于 stdio 传输的参数。                                                                                                                                                                                                          |
| `url`                         | unset                                                  | WebSocket app-server URL。                                                                                                                                                                                                               |
| `authToken`                   | unset                                                  | WebSocket 传输的 Bearer token。                                                                                                                                                                                                   |
| `headers`                     | `{}`                                                   | 额外的 WebSocket 头。                                                                                                                                                                                                                |
| `clearEnv`                    | `[]`                                                   | 在 OpenClaw 构建继承环境后，从启动的 stdio app-server 进程中移除的额外环境变量名。对于本地启动，OpenClaw 会保留每个 agent 独立的 `CODEX_HOME` 和继承的 `HOME`。                      |
| `requestTimeoutMs`            | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                             |
| `turnCompletionIdleTimeoutMs` | `60000`                                                | Codex 接受一个回合后，或在一次回合作用域的 app-server 请求之后，OpenClaw 等待 `turn/completed` 时的静默窗口。对于工具调用后较慢或仅状态合成阶段，可适当提高该值。                                             |
| `mode`                        | `"yolo"` unless local Codex requirements disallow YOLO | YOLO 或 guardian 审查执行的预设。若本地 stdio 要求省略 `danger-full-access`、`never` 审批或 `user` 审核者，则隐式默认为 guardian。                                                   |
| `approvalPolicy`              | `"never"` or an allowed guardian approval policy       | 发送到线程启动/恢复/回合的原生 Codex 审批策略。guardian 默认在允许时更倾向于 `"on-request"`。                                                                                                                    |
| `sandbox`                     | `"danger-full-access"` or an allowed guardian sandbox  | 发送到线程启动/恢复的原生 Codex 沙箱模式。guardian 默认在允许时更倾向于 `"workspace-write"`，否则为 `"read-only"`。当 OpenClaw 沙箱处于活动状态时，`danger-full-access` 会被收窄为 `"workspace-write"`。 |
| `approvalsReviewer`           | `"user"` or an allowed guardian reviewer               | 在允许时使用 `"auto_review"` 让 Codex 审查原生审批提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍是一个旧别名。                                                                      |
| `serviceTier`                 | unset                                                  | 可选的 Codex app-server 服务层级。`"priority"` 启用 fast-mode 路由，`"flex"` 请求 flex 处理，`null` 清除覆盖项，且旧的 `"fast"` 会按 `"priority"` 接受。                                         |

OpenClaw 拥有的动态工具调用与 `appServer.requestTimeoutMs` 独立限时：Codex `item/tool/call` 请求默认使用 30 秒的 OpenClaw 看门狗。正的逐次调用 `timeoutMs` 参数会延长或缩短该特定工具的预算。`image_generate` 工具在工具调用未提供自身超时时，也会使用 `agents.defaults.imageGenerationModel.timeoutMs`，而媒体理解 `image` 工具则使用 `tools.media.image.timeoutSeconds` 或其 60 秒媒体默认值。动态工具预算上限为 600000 ms。超时时，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便回合可以继续，而不是让会话停留在 `processing` 中。

在 Codex 接受一个回合之后，以及在 OpenClaw 响应一次回合作用域的 app-server 请求之后，harness 预期 Codex 会推动当前回合向前，并最终以 `turn/completed` 结束原生回合。如果 app-server 在 `appServer.turnCompletionIdleTimeoutMs` 时间内保持静默，OpenClaw 会尽力中断 Codex 回合，记录一次诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会排在一个陈旧的原生回合后面。对同一回合的大多数非终态通知都会解除这个短看门狗，因为 Codex 已证明该回合仍然存活；原始 `custom_tool_call_output` 完成会保持短的工具后看门狗继续生效，因为它们是回合作用域工具结果交接。全局 app-server 通知，例如速率限制更新，不会重置回合空闲进度。已完成的 `agentMessage` 项和工具前原始助手 `rawResponseItem/completed` 项会触发助手输出释放：如果此后 Codex 在没有 `turn/completed` 的情况下保持静默，OpenClaw 会尽力中断原生回合并释放会话通道。工具后的原始助手进度会继续等待 `turn/completed` 或终态看门狗。超时诊断会包含最后一次 app-server 通知的方法，以及对于原始助手响应项的项类型、角色、id 和受限的助手文本预览。

本地测试仍可使用环境变量覆盖：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或在一次性本地测试中使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，更推荐使用配置，因为它将插件行为与 Codex harness 设置的其余部分放在同一个经过审查的文件中。

## 原生 Codex 插件

原生 Codex 插件支持使用 Codex app-server 自身的 app 和插件能力，并且与 OpenClaw harness turn 处于同一个 Codex 线程中。OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex harness 的会话。它对 PI 运行、普通 OpenAI provider 运行、ACP conversation 绑定或其他 harness 没有影响。

迁移后的最小配置：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
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

关于迁移资格、app 库存、破坏性操作策略、询问机制和原生插件诊断，请参见
[原生 Codex 插件](/plugins/codex-native-plugins)。

## 计算机使用

计算机使用在其单独的设置指南中有说明：
[Codex 计算机使用](/plugins/codex-computer-use)。

简而言之：OpenClaw 不会提供桌面控制 app，也不会自行执行桌面操作。它会准备 Codex app-server，验证 `computer-use` MCP server 是否可用，然后在 Codex 模式轮次中让 Codex 自主处理原生 MCP 工具调用。

## 运行时边界

Codex harness 只会改变底层嵌入式 agent 执行器。

- 支持 OpenClaw 动态工具。Codex 会请求 OpenClaw 执行这些
  工具，因此 OpenClaw 仍然处于执行路径中。
- Codex 原生的 shell、patch、MCP 和原生 app 工具由 Codex 负责。
  OpenClaw 可以通过受支持的 relay 观察或阻止选定的原生事件，
  但不会重写原生工具参数。
- 除非当前 OpenClaw context engine
  声明 `ownsCompaction: true`，否则原生压缩由 Codex 负责。OpenClaw 会为
  channel 历史、搜索、`/new`、`/reset` 以及未来的 model 或 harness
  切换保留一份 transcript 镜像。
- 媒体生成、媒体理解、TTS、审批以及 messaging-tool
  输出会继续通过匹配的 OpenClaw provider/model 设置处理。
- `tool_result_persist` 适用于 OpenClaw 所拥有的 transcript 工具结果，
  不适用于 Codex 原生工具结果记录。

关于 hook 层、受支持的 V1 接口、原生权限处理、队列引导、Codex 反馈上传机制以及压缩细节，请参见
[Codex harness 运行时](/plugins/codex-harness-runtime)。

## 故障排查

**Codex 没有作为普通的 `/model` provider 出现：** 对于新配置来说，这是预期行为。请选择 `openai/gpt-*` 模型，启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而不是 Codex：** 请确保模型 ref 在官方 OpenAI provider 上为 `openai/gpt-*`，并且 Codex 插件已安装并启用。如果测试时需要严格证明，请将 provider 或 model 的 `agentRuntime.id` 设为 `"codex"`。强制使用 Codex runtime 时会直接失败，而不会回退到 PI。

**仍存在旧版 `openai-codex/*` 配置：** 运行 `openclaw doctor --fix`。Doctor 会将旧版 model ref 重写为 `openai/*`，移除过期的 session 和整个 agent runtime 固定项，并保留现有的 auth-profile 覆盖设置。

**app-server 被拒绝：** 请使用 Codex app-server `0.125.0` 或更高版本。同版本的预发布版本或带构建后缀的版本，例如 `0.125.0-alpha.2` 或 `0.125.0+custom`，都会被拒绝，因为 OpenClaw 会测试稳定的 `0.125.0` 协议下限。

**`/codex status` 无法连接：** 检查内置的 `codex` 插件是否已启用；如果配置了 allowlist，请确认 `plugins.allow` 包含它；并检查任何自定义的 `appServer.command`、`url`、`authToken` 或 headers 是否有效。

**模型发现很慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs`，或禁用 discovery。请参见
[Codex harness 参考](/plugins/codex-harness-reference#model-discovery)。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`、headers，以及远程 app-server 是否支持相同的 Codex app-server 协议版本。

**非 Codex 模型使用 PI：** 这是预期行为，除非 provider 或 model runtime policy 将其路由到另一个 harness。普通的非 OpenAI provider refs 在 `auto` 模式下会保持其正常 provider 路径。

**Computer Use 已安装但工具不运行：** 在一个新的会话中检查 `/codex computer-use status`。如果某个工具报告 `Native hook relay unavailable`，请使用 `/new` 或 `/reset`；如果问题仍然存在，请重启网关以清除过期的原生 hook 注册。请参见
[Codex 计算机使用](/plugins/codex-computer-use#troubleshooting)。

## 相关内容

- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex harness 运行时](/plugins/codex-harness-runtime)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [Codex 计算机使用](/plugins/codex-computer-use)
- [Agent 运行时](/concepts/agent-runtimes)
- [模型提供方](/concepts/model-providers)
- [OpenAI 提供方](/providers/openai)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [插件 hooks](/plugins/hooks)
- [诊断导出](/gateway/diagnostics)
- [状态](/cli/status)
- [测试](/help/testing-live#live-codex-app-server-harness-smoke)
