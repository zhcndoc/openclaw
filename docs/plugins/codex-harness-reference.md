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

| 字段                                         | 默认值                                                | 含义                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                              | `"stdio"` 会启动 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                                                                                                                                                              |
| `command`                                     | 托管的 Codex 二进制文件                                   | stdio 传输使用的可执行文件。保持未设置以使用托管二进制文件。                                                                                                                                                                                                                                                                                |
| `args`                                        | `["app-server", "--listen", "stdio://"]`               | stdio 传输使用的参数。                                                                                                                                                                                                                                                                                                                        |
| `url`                                         | 未设置                                                  | WebSocket app-server URL。                                                                                                                                                                                                                                                                                                                             |
| `authToken`                                   | 未设置                                                  | WebSocket 传输的 Bearer 令牌。                                                                                                                                                                                                                                                                                                                 |
| `headers`                                     | `{}`                                                   | 额外的 WebSocket 标头。                                                                                                                                                                                                                                                                                                                              |
| `clearEnv`                                    | `[]`                                                   | 在 OpenClaw 构建继承环境后，从启动的 stdio app-server 进程中移除的额外环境变量名。                                                                                                                                                                                                                   |
| `requestTimeoutMs`                            | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                                                                                                                                           |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                | 在 Codex 接受一个 turn 之后，或在一个 turn 作用域内的 app-server 请求之后，OpenClaw 等待 `turn/completed` 时的静默窗口。                                                                                                                                                                                                                          |
| `postToolRawAssistantCompletionIdleTimeoutMs` | 未设置                                                  | 在工具交接后使用的完成空闲保护：当 Codex 输出原始 assistant completion 或进度，但没有发送 `turn/completed` 时使用。若未设置，则默认使用 assistant completion idle timeout。对于可信或高负载工作负载，可使用此项，因为工具后的综合处理在合理情况下可能比最终 assistant 释放预算保持更久的静默。 |
| `mode`                                        | 除非本地 Codex 要求禁止 YOLO，否则为 `"yolo"` | YOLO 或 guardian 审核执行的预设。                                                                                                                                                                                                                                                                                                       |
| `approvalPolicy`                              | `"never"` 或允许的 guardian 审批策略       | 发送到 thread start、resume 和 turn 的原生 Codex 审批策略。                                                                                                                                                                                                                                                                                  |
| `sandbox`                                     | `"danger-full-access"` 或允许的 guardian 沙箱  | 发送到 thread start 和 resume 的原生 Codex 沙箱模式。启用中的 OpenClaw 沙箱会将 `danger-full-access` turn 限制为 Codex 的 `workspace-write`；turn 网络标志遵循 OpenClaw 沙箱的 egress。                                                                                                                                             |
| `approvalsReviewer`                           | `"user"` 或允许的 guardian 审核者               | 在允许时使用 `"auto_review"` 让 Codex 审核原生审批提示。                                                                                                                                                                                                                                                                         |
| `defaultWorkspaceDir`                         | 当前进程目录                              | 当省略 `--cwd` 时，`/codex bind` 使用的工作区。                                                                                                                                                                                                                                                                                              |
| `serviceTier`                                 | 未设置                                                  | 可选的 Codex app-server 服务层级。`"priority"` 启用 fast-mode 路由，`"flex"` 请求 flex 处理，而 `null` 清除覆盖。旧的 `"fast"` 会按 `"priority"` 接受。                                                                                                                                                       |
| `experimental.sandboxExecServer`              | `false`                                                | 预览版可选项：当 Codex app-server 0.132.0 或更新版本时，注册一个由 OpenClaw 沙箱支持的 Codex 环境，使原生 Codex 执行可以在当前激活的 OpenClaw 沙箱内运行。                                                                                                                                                               |

该插件会阻止较旧或未版本化的 app-server 握手。Codex app-server 必须报告稳定版本 `0.125.0` 或更高版本。

## 审批和沙箱模式

本地 stdio app-server 会话默认使用 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"`，以及
`sandbox: "danger-full-access"`。这种受信任的本地操作员姿态使得无人值守的 OpenClaw turn 和心跳能够继续推进，而不会出现没人可回应的原生审批提示。

如果 Codex 的本地系统需求文件不允许隐式 YOLO 审批、reviewer 或 sandbox 值，OpenClaw 会将隐式默认值视为 guardian，并选择允许的 guardian 权限。会在同一需求文件中匹配主机名的 `[[remote_sandbox_config]]` 条目会在沙箱默认决策中被遵守。

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

- 一个正的逐次调用 `timeoutMs` 参数。
- 对于 `image_generate`，使用 `agents.defaults.imageGenerationModel.timeoutMs`。
- 对于未配置超时的 `image_generate`，使用 120 秒的图像生成默认值。
- 对于媒体理解的 `image` 工具，使用 `tools.media.image.timeoutSeconds` 转换为毫秒，或 60 秒媒体默认值。
- 30 秒的动态工具默认值。

动态工具预算上限为 600000 ms。超时时，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便该轮次可以继续，而不是让会话停留在 `processing` 状态。

Codex 接受一个轮次后，以及 OpenClaw 对一次轮次作用域的 app-server 请求作出响应后，宿主会预期 Codex 推进当前轮次，并最终使用 `turn/completed` 完成原生轮次。如果 app-server 在 `appServer.turnCompletionIdleTimeoutMs` 时间内保持静默，OpenClaw 会尽最大努力中断 Codex 轮次，记录一条诊断超时信息，并释放 OpenClaw 会话车道，从而使后续聊天消息不会排在一个陈旧的原生轮次后面。

同一轮次中的大多数非终止通知都会解除该短看门狗，因为 Codex 已证明该轮次仍然存活。原始 `custom_tool_call_output` 完成会保持短的工具后看门狗处于武装状态，因为它们是轮次范围内的工具结果交接。已完成的 `agentMessage` 项和工具前的原始助手 `rawResponseItem/completed` 项会武装助手输出释放：如果随后 Codex 在没有 `turn/completed` 的情况下保持沉默，OpenClaw 会尽力中断原生轮次并释放会话车道。工具后的原始助手进度会继续等待 `turn/completed`，同时完成空闲守卫保持武装；该守卫在配置时使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否则回退到助手完成空闲超时。超时诊断包含最后一个 app-server 通知方法，以及对于原始助手响应项，还会包含项类型、角色、id 和受限长度的助手文本预览。

## 模型发现

默认情况下，Codex 插件会向 app-server 请求可用模型。模型可用性由 Codex app-server 管理，因此当 OpenClaw 升级内置的 `@openai/codex` 版本，或某次部署将 `appServer.command` 指向不同的 Codex 二进制文件时，列表可能会变化。可用性也可能按账号范围进行区分。请在正在运行的网关上使用 `/codex models` 查看该主机和账号的实时目录。

如果发现失败或超时，OpenClaw 会使用以下内容的内置回退目录：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

当前捆绑的 harness 为 `@openai/codex` `0.133.0`。对此捆绑 app-server 的 `model/list` 探测返回了：

| 模型 ID              | 默认 | 隐藏 | 输入模态         | 推理强度                |
| ------------------- | ---- | ---- | ---------------- | ------------------------ |
| `gpt-5.5`             | 是   | 否   | 文本、图像       | 低、中、高、超高         |
| `gpt-5.4`             | 否   | 否   | 文本、图像       | 低、中、高、超高         |
| `gpt-5.4-mini`        | 否   | 否   | 文本、图像       | 低、中、高、超高         |
| `gpt-5.3-codex`       | 否   | 否   | 文本、图像       | 低、中、高、超高         |
| `gpt-5.3-codex-spark` | 否   | 否   | 文本             | 低、中、高、超高         |
| `gpt-5.2`             | 否   | 否   | 文本、图像       | 低、中、高、超高         |

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

对于 OpenClaw 工作区一致性，Codex harness 会解析其他引导文件。`SOUL.md`、`IDENTITY.md`、`TOOLS.md` 和 `USER.md` 会作为 OpenClaw Codex 开发者指令转发，因为它们定义了活动 agent、可用的工作区指导以及用户档案。`HEARTBEAT.md` 内容不会被注入；当 heartbeat turn 存在且非空时，会获得一个协作模式指针去读取该文件。`BOOTSTRAP.md` 和 `MEMORY.md` 在存在时会作为 OpenClaw turn 输入参考上下文转发。

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
