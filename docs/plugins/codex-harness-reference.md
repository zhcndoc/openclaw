---
summary: "Codex harness 的配置、认证、发现以及 app-server 参考"
title: "Codex harness 参考"
read_when:
  - 你需要 Codex harness 的每一个配置字段
  - 你正在更改 app-server 传输、认证、发现或超时行为
  - 你正在调试 Codex harness 启动、模型发现或环境隔离
---

本参考文档涵盖内置 `codex` 插件的详细配置。有关设置和路由决策，请先阅读
[Codex harness](/plugins/codex-harness)。

## 插件配置面

所有 Codex harness 设置都位于 `plugins.entries.codex.config` 下。

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
          appServer: {
            mode: "guardian",
          },
        },
      },
    },
  },
}
```

支持的顶层字段：

| 字段                       | 默认值                   | 含义                                                                                                                                   |
| -------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | 已启用                   | Codex app-server `model/list` 的模型发现设置。                                                                                         |
| `appServer`                | 托管的 stdio app-server  | 传输、命令、认证、审批、沙箱和超时设置。                                                                                                 |
| `codexDynamicToolsLoading` | `"searchable"`           | 使用 `"direct"` 将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。                                                                  |
| `codexDynamicToolsExclude` | `[]`                     | 要从 Codex app-server turn 中省略的额外 OpenClaw 动态工具名称。                                                                          |
| `codexPlugins`             | 已禁用                   | 为已迁移的、源安装的精选插件提供原生 Codex 插件/app 支持。参见 [Native Codex plugins](/plugins/codex-native-plugins)。                   |
| `computerUse`              | 已禁用                   | Codex Computer Use 设置。参见 [Codex Computer Use](/plugins/codex-computer-use)。                                                     |

## App-server 传输

默认情况下，OpenClaw 会启动随内置插件一起提供的托管 Codex 二进制文件：

```bash
codex app-server --listen stdio://
```

这会将 app-server 版本绑定到内置的 `codex` 插件，而不是本地恰好安装的某个独立 Codex CLI。仅当你有意想运行不同的可执行文件时，才设置 `appServer.command`。

对于已经在运行的 app-server，请使用 WebSocket 传输：

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
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

支持的 `appServer` 字段：

| Field                                         | Default                                                | Meaning                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                              | `"stdio"` spawns Codex; `"websocket"` connects to `url`.                                                                                                                                                                                                                                                                                                         |
| `command`                                     | managed Codex binary                                   | Executable for stdio transport. Leave unset to use the managed binary.                                                                                                                                                                                                                                                                                           |
| `args`                                        | `["app-server", "--listen", "stdio://"]`               | Arguments for stdio transport.                                                                                                                                                                                                                                                                                                                                   |
| `url`                                         | unset                                                  | WebSocket app-server URL.                                                                                                                                                                                                                                                                                                                                        |
| `authToken`                                   | unset                                                  | Bearer token for WebSocket transport.                                                                                                                                                                                                                                                                                                                            |
| `headers`                                     | `{}`                                                   | Extra WebSocket headers.                                                                                                                                                                                                                                                                                                                                         |
| `clearEnv`                                    | `[]`                                                   | Extra environment variable names removed from the spawned stdio app-server process after OpenClaw builds its inherited environment.                                                                                                                                                                                                                              |
| `requestTimeoutMs`                            | `60000`                                                | Timeout for app-server control-plane calls.                                                                                                                                                                                                                                                                                                                      |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                | Quiet window after Codex accepts a turn or after a turn-scoped app-server request while OpenClaw waits for `turn/completed`.                                                                                                                                                                                                                                     |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                               | Completion-idle and progress guard used after a tool handoff, native tool completion, post-tool raw assistant progress, raw reasoning completion, or reasoning progress while OpenClaw waits for `turn/completed`. Use this for trusted or heavy workloads where post-tool synthesis can legitimately stay quiet longer than the final assistant release budget. |
| `mode`                                        | `"yolo"` unless local Codex requirements disallow YOLO | Preset for YOLO or guardian-reviewed execution.                                                                                                                                                                                                                                                                                                                  |
| `approvalPolicy`                              | `"never"` or an allowed guardian approval policy       | Native Codex approval policy sent to thread start, resume, and turn.                                                                                                                                                                                                                                                                                             |
| `sandbox`                                     | `"danger-full-access"` or an allowed guardian sandbox  | Native Codex sandbox mode sent to thread start and resume. Active OpenClaw sandboxes narrow `danger-full-access` turns to Codex `workspace-write`; the turn network flag follows OpenClaw sandbox egress.                                                                                                                                                        |
| `approvalsReviewer`                           | `"user"` or an allowed guardian reviewer               | Use `"auto_review"` to let Codex review native approval prompts when allowed.                                                                                                                                                                                                                                                                                    |
| `defaultWorkspaceDir`                         | current process directory                              | Workspace used by `/codex bind` when `--cwd` is omitted.                                                                                                                                                                                                                                                                                                         |
| `serviceTier`                                 | unset                                                  | Optional Codex app-server service tier. `"priority"` enables fast-mode routing, `"flex"` requests flex processing, and `null` clears the override. Legacy `"fast"` is accepted as `"priority"`.                                                                                                                                                                  |
| `experimental.sandboxExecServer`              | `false`                                                | Preview opt-in that registers an OpenClaw sandbox-backed Codex environment with Codex app-server 0.132.0 or newer so native Codex execution can run inside the active OpenClaw sandbox.                                                                                                                                                                          |

该插件会阻止较旧或未版本化的 app-server 握手。Codex app-server 必须报告稳定版本 `0.125.0` 或更高版本。

## 审批和沙箱模式

本地 stdio app-server 会话默认使用 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"`，以及
`sandbox: "danger-full-access"`。这种受信任的本地操作员姿态使得无人值守的 OpenClaw turn 和心跳能够继续推进，而不会出现没人可回应的原生审批提示。

如果 Codex 的本地系统需求文件禁止隐式 YOLO 审批、
reviewer 或 sandbox 值，OpenClaw 会改为将隐式默认值视为 guardian，
并选择允许的 guardian 权限。`tools.exec.mode: "auto"`
也会强制使用由 guardian 审核的 Codex 审批，并且不会保留不安全的
旧式 `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆盖；
若要有意采用免审批姿态，请设置 `tools.exec.mode: "full"`。
同一需求文件中的主机名匹配
`[[remote_sandbox_config]]` 条目会被用于沙箱默认决策。

将 `appServer.mode: "guardian"` 设置为 Codex guardian 审核审批：

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

`guardian` 预设在这些值被允许时会展开为 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。单独的策略字段会覆盖 `mode`。较旧的 `guardian_subagent` reviewer 值仍然被接受作为兼容别名，但新配置应使用 `auto_review`。

当 OpenClaw 沙箱处于活动状态时，本地 Codex app-server 进程仍然运行在 Gateway 主机上。因此，OpenClaw 会为该轮次禁用 Codex 原生 Code Mode、用户 MCP 服务器以及由 app 支持的插件执行，而不是将 Codex 主机侧沙箱视为与 OpenClaw 沙箱后端等效。Shell 访问通过 OpenClaw 沙箱支持的动态工具暴露，例如在正常的 exec/process 工具可用时使用 `sandbox_exec` 和 `sandbox_process`。

在 Ubuntu/AppArmor 主机上，当你有意在没有激活 OpenClaw 沙箱的情况下运行原生 Codex `workspace-write` 时，Codex bwrap 可能会在 shell 命令开始前于 `workspace-write` 下失败。如果你看到 `bwrap: setting up uid map: Permission denied` 或 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`，请运行 `openclaw doctor` 并修复为 OpenClaw 服务用户报告的主机命名空间策略问题，而不是授予更宽泛的 Docker 容器权限。建议为服务进程使用范围受限的 AppArmor 配置文件；`kernel.apparmor_restrict_unprivileged_userns=0` 回退是主机范围的，并且存在安全权衡。

## 沙箱化原生执行

稳定默认值是失败即关闭：激活的 OpenClaw 沙箱会禁用本来会从 Codex app-server 主机运行的原生 Codex 执行面。只有当你想尝试 Codex 的远程环境支持与 OpenClaw 的沙箱后端配合使用时，才使用 `appServer.experimental.sandboxExecServer: true`。此预览路径要求 Codex app-server 0.132.0 或更新版本。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            experimental: {
              sandboxExecServer: true,
            },
          },
        },
      },
    },
  },
}
```

当该标志开启且当前 OpenClaw 会话处于沙箱中时，OpenClaw 会启动一个由活动沙箱支持的本地回环 exec-server，将其注册到 Codex app-server，并使用该 OpenClaw 拥有的环境启动 Codex thread 和 turn。如果 app-server 无法注册该环境，运行会失败关闭，而不是静默回退到主机执行。

此预览路径仅限本地。远程 WebSocket app-server 无法访问回环 exec-server，除非它运行在同一台主机上，因此 OpenClaw 会拒绝这种组合。

## 认证和环境隔离

认证按以下顺序选择：

1. 该 agent 的显式 OpenClaw Codex 认证配置文件。
2. 该 agent 的 Codex home 中 app-server 已有的账号。
3. 仅对于本地 stdio app-server 启动：当没有 app-server 账号且仍需要 OpenAI 认证时，依次使用 `CODEX_API_KEY`，然后是 `OPENAI_API_KEY`。

当 OpenClaw 看到 ChatGPT 订阅样式的 Codex 认证配置文件时，会从启动的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这可以让网关级 API key 继续可用于 embeddings 或直接 OpenAI 模型，而不会让原生 Codex app-server turn 误通过 API 计费。

显式的 Codex API key 配置文件和本地 stdio 环境变量 key 回退使用 app-server 登录，而不是继承的子进程环境变量。WebSocket app-server 连接不会获得网关环境 API key 回退；请使用显式认证配置文件或远程 app-server 自身的账号。

stdio app-server 启动默认继承 OpenClaw 的进程环境。OpenClaw 负责 Codex app-server 账号桥接，并将 `CODEX_HOME` 设为该 agent 的 OpenClaw 状态下的每个 agent 专属目录。这样可使 Codex 配置、账号、插件缓存/数据和线程状态仅限于 OpenClaw agent，而不会从操作员个人的 `~/.codex` home 中泄漏进来。

OpenClaw 在正常的本地 app-server 启动时不会重写 `HOME`。Codex 运行的子进程（如 `openclaw`、`gh`、`git`、云 CLI 和 shell 命令）会看到正常的进程 home，并能够找到用户 home 下的配置和 token。Codex 还可能发现 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；该 `.agents` 发现机制有意与操作员 home 共享，并且独立于隔离的 `~/.codex` 状态。

OpenClaw 插件和 OpenClaw skill 快照仍通过 OpenClaw 自己的插件注册表和 skill 加载器流转。个人 Codex `~/.codex` 资源不会。若你有来自某个 Codex home 的有用 Codex CLI skills 或插件，希望成为 OpenClaw agent 的一部分，请显式盘点它们：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

如果某个部署需要额外的环境隔离，请将这些变量添加到 `appServer.clearEnv`：

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

`appServer.clearEnv` 只影响启动的 Codex app-server 子进程。OpenClaw 在本地启动规范化期间会从此列表中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持为每个 agent 专属，而 `HOME` 保持继承状态，这样子进程就能使用正常的用户 home 状态。

## 动态工具

Codex 动态工具默认以 `searchable` 方式加载。OpenClaw 不提供会与 Codex 原生工作区操作重复的动态工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

其余大多数 OpenClaw 集成工具，例如消息、媒体、cron、浏览器、节点、网关、`heartbeat_respond` 和 `web_search`，都可通过 Codex 工具搜索在 `openclaw` 命名空间下使用。这使初始模型上下文更小。`sessions_yield` 和仅消息工具的源回复保持直接返回，因为它们属于轮次控制契约。`sessions_spawn` 保持可搜索，因此 Codex 原生的 `spawn_agent` 仍然是主要的 Codex 子代理入口，而显式的 OpenClaw 或 ACP 委派仍可通过 `openclaw` 动态工具命名空间使用。

仅当连接到无法搜索延迟动态工具的自定义 Codex app-server，或在调试完整工具负载时，才将 `codexDynamicToolsLoading` 设为 `"direct"`。

## 超时

OpenClaw 拥有的动态工具调用会独立于 `appServer.requestTimeoutMs` 进行限制。每个 Codex `item/tool/call` 请求都会按以下顺序使用第一个可用的超时值：

- 对每次调用的正值 `timeoutMs` 参数。
- 对于 `image_generate`，使用 `agents.defaults.imageGenerationModel.timeoutMs`。
- 对于未配置超时的 `image_generate`，使用 120 秒的
  图像生成默认值。
- 对于媒体理解的 `image` 工具，使用 `tools.media.image.timeoutSeconds`
  换算成毫秒；若未配置，则使用 60 秒的媒体默认值。
- 90 秒的动态工具默认值。

动态工具预算上限为 600000 ms。超时时，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便该轮次可以继续，而不是让会话停留在 `processing` 状态。

Codex 接受一个轮次后，以及 OpenClaw 对一次轮次作用域的 app-server 请求作出响应后，宿主会预期 Codex 推进当前轮次，并最终使用 `turn/completed` 完成原生轮次。如果 app-server 在 `appServer.turnCompletionIdleTimeoutMs` 时间内保持静默，OpenClaw 会尽最大努力中断 Codex 轮次，记录一条诊断超时信息，并释放 OpenClaw 会话车道，从而使后续聊天消息不会排在一个陈旧的原生轮次后面。

同一轮次的大多数非终局通知都会解除该短看门狗，因为 Codex 已证明该轮次仍然存活。工具交接使用更长的工具后空闲预算：在 OpenClaw 返回 `item/tool/call` 响应后，在 `commandExecution` 之类的原生工具项完成后，在原始 `custom_tool_call_output` 完成后，以及在工具后的原始助手进度、原始推理完成或推理进度之后。若已配置，该守卫使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否则默认五分钟。相同的工具后预算也会延长静默合成窗口的进度看门狗，直到 Codex 发出下一个当前轮次事件。推理完成、`agentMessage` 注释完成，以及工具前的原始推理或助手进度之后，可能会跟随自动最终回复，因此它们使用的是工具后回复守卫，而不是立即释放会话车道。只有最终/非注释的已完成 `agentMessage` 项以及工具前的原始助手完成才会武装助手输出释放：如果随后 Codex 在没有 `turn/completed` 的情况下保持静默，OpenClaw 会尽最大努力中断原生轮次并释放会话车道。可重放安全的 stdio app-server 失败，包括在没有助手、工具、活动项或副作用证据的情况下出现的轮次完成空闲超时，只会在新的 app-server 尝试上重试一次。不安全的超时仍会让卡住的 app-server 客户端退役并释放 OpenClaw 会话车道。它们还会清除陈旧的原生线程绑定，而不是自动重放。完成监视超时会显示 Codex 特定的超时文本：可重放安全的情况会说明响应可能不完整，而不安全的情况会提示用户在重试前验证当前状态。公开的超时诊断包括结构化字段，例如最后一次 app-server 通知的方法、原始助手响应项的 id/type/role、活动请求/项计数以及已武装的监视状态。当最后一条通知是原始助手响应项时，它们还会包含一个有界的助手文本预览。它们不包含原始提示词或工具内容。

## 模型发现

默认情况下，Codex 插件会向 app-server 请求可用模型。模型可用性由 Codex app-server 管理，因此当 OpenClaw 升级内置的 `@openai/codex` 版本，或某次部署将 `appServer.command` 指向不同的 Codex 二进制文件时，列表可能会变化。可用性也可能按账号范围进行区分。请在正在运行的网关上使用 `/codex models` 查看该主机和账号的实时目录。

如果发现失败或超时，OpenClaw 会使用以下内容的内置回退目录：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

当前捆绑的 harness 是 `@openai/codex` `0.137.0`。对该捆绑 app-server 的 `model/list` 探测返回：

| Model id        | Default | Hidden | Input modalities | Reasoning efforts        |
| --------------- | ------- | ------ | ---------------- | ------------------------ |
| `gpt-5.5`       | Yes     | No     | text, image      | low, medium, high, xhigh |
| `gpt-5.4`       | No      | No     | text, image      | low, medium, high, xhigh |
| `gpt-5.4-mini`  | No      | No     | text, image      | low, medium, high, xhigh |
| `gpt-5.3-codex` | No      | No     | text, image      | low, medium, high, xhigh |
| `gpt-5.2`       | No      | No     | text, image      | low, medium, high, xhigh |

隐藏模型可能会由 app-server 目录返回，用于内部或专门流程，但它们不是普通的模型选择项。

通过 `plugins.entries.codex.config.discovery` 调整发现行为：

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

当你希望启动时避免探测 Codex、只使用回退目录时，请禁用发现：

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

## 工作区引导文件

Codex 会通过原生项目文档发现机制自行处理 `AGENTS.md`。OpenClaw 不会编写合成的 Codex 项目文档文件，也不会依赖 Codex 的回退文件名来处理 persona 文件，因为 Codex 回退只在缺少 `AGENTS.md` 时才会生效。

为了与 OpenClaw 工作区保持一致，Codex harness 会解析其他引导文件。`SOUL.md`、`IDENTITY.md`、`TOOLS.md` 和 `USER.md` 会作为 OpenClaw Codex 开发者指令转发，因为它们定义了活动 agent、可用的工作区指南和用户资料。精简版 OpenClaw skills 列表会作为轮次作用域的协作开发者指令转发。`HEARTBEAT.md` 内容不会被注入；当该文件存在且非空时，心跳轮次会得到一个协作模式指针，用于在需要时读取该文件。来自已配置 agent 工作区的 `MEMORY.md` 内容在该工作区具备 memory tools 时不会被粘贴进原生 Codex 轮次输入；当其存在时，harness 会向轮次作用域的协作开发者指令添加一个简短的 workspace-memory 指针，而当持久记忆相关时，Codex 应使用 `memory_search` 或 `memory_get`。如果工具被禁用、memory search 不可用，或者当前工作区不同于 agent memory 工作区，则 `MEMORY.md` 会使用正常的有界轮次上下文路径。
存在 `BOOTSTRAP.md` 时，会作为 OpenClaw 轮次输入的参考上下文转发。

## 环境覆盖

本地测试仍可使用环境覆盖：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过受管理的二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或在一次性本地测试中使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，更推荐使用配置，因为它将插件行为与 Codex 宿主其余设置一起保存在同一个经过审阅的文件中。

## 相关内容

- [Codex 宿主](/plugins/codex-harness)
- [Codex 宿主运行时](/plugins/codex-harness-runtime)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [Codex 电脑使用](/plugins/codex-computer-use)
- [OpenAI 提供方](/providers/openai)
- [配置参考](/gateway/configuration-reference)
