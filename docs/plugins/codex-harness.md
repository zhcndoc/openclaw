---
summary: "通过官方 Codex app-server harness 运行 OpenClaw 嵌入式代理轮次"
title: "Codex harness"
read_when:
  - 你想使用官方 Codex app-server harness
  - 你需要 Codex harness 配置示例
  - 你希望仅限 Codex 的部署在失败时不回退到 OpenClaw
---

官方的 `codex` 插件通过 Codex app-server 运行嵌入式 OpenAI 代理轮次，而不是使用内置的 OpenClaw harness。Codex 负责底层代理会话：原生线程恢复、原生工具续接、原生压缩以及 app-server 执行。OpenClaw 仍然负责聊天频道、会话文件、模型选择、OpenClaw 动态工具、审批、媒体传递以及可见的转录镜像。

使用规范的 OpenAI 模型引用，例如 `openai/gpt-5.6-sol`。不要配置旧版 Codex GPT 引用；将 OpenAI 代理认证顺序放在 `auth.order.openai` 下。旧版 Codex 认证配置文件 id 和旧版 Codex 认证顺序条目会通过 `openclaw doctor --fix` 修复。

当 provider/model 运行时策略未设置或为 `auto` 时，仅有 `openai/*` 前缀绝不会选择此 harness。只有在没有作者指定请求覆盖的情况下，OpenAI 才可能在精确的官方 HTTPS Platform Responses 或 ChatGPT Responses 路由上隐式选择 Codex。参见
[OpenAI 隐式代理运行时](/providers/openai#implicit-agent-runtime)。如果 Codex 在 Platform 与 ChatGPT 路由已知之前就拥有认证，OpenClaw 仍然要求每个候选路由声明 Codex 兼容性。仅凭原生认证所有权永远不会绕过该路由检查。

当没有 OpenClaw 沙箱处于活动状态时，OpenClaw 会在启用 Codex 原生代码模式的情况下启动 Codex app-server 线程（code-mode-only 默认保持关闭），因此原生工作区/代码能力仍可与通过 app-server `item/tool/call` 桥接路由的 OpenClaw 动态工具一起使用。活动中的 OpenClaw 沙箱或受限工具策略会完全禁用原生代码模式，除非你启用实验性的 sandbox exec-server 路径。

在默认的 `tools.exec.host: "auto"` 且没有活动 OpenClaw 沙箱时，Codex 还会为成对节点上的命令接收 `node_exec` 和 `node_process` 工具。原生 shell 仍然运行在 Codex app-server 主机和工作区上（默认 stdio 部署下为 Gateway 本地）；`node_exec` 通过名称或 id 选择节点，并保持 OpenClaw 的节点审批策略生效。

这个 Codex 原生特性不同于
[OpenClaw 代码模式](/reference/code-mode)，后者是一个可选加入的 QuickJS-WASI 运行时，适用于具有不同 `exec` 输入形状的通用 OpenClaw 运行。关于更广泛的模型/提供方/运行时拆分，请从
[代理运行时](/concepts/agent-runtimes) 开始：`openai/gpt-5.6-sol` 是模型引用，`codex` 是运行时，而 Telegram、Discord、Slack 或其他频道则是通信表面。

## 需求

- 已安装官方 `@openclaw/codex` 插件。如果你的配置使用允许列表，请在 `plugins.allow` 中包含 `codex`。
- Codex app-server `0.143.0` 或更新版本。插件默认会管理一个兼容的二进制文件，因此 `PATH` 中的 `codex` 命令不会影响正常启动。
- 通过 `openclaw models auth login --provider openai` 进行 Codex 认证，或者在代理的 Codex home 中已存在的 app-server 账户，或者显式的 Codex API 密钥认证配置文件。

有关认证优先级、环境隔离、自定义 app-server 命令、模型发现以及完整的配置字段列表，请参阅
[Codex 运行时参考](/plugins/codex-harness-reference)。

## 快速开始

安装官方插件，然后使用 Codex OAuth 登录：

```bash
openclaw plugins install @openclaw/codex
openclaw models auth login --provider openai
```

启用 `codex` 插件并选择一个 OpenAI agent 模型：

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
      model: "openai/gpt-5.6-sol",
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

修改插件配置后，请重启网关。如果某个聊天已经有一个
session，请先运行 `/new` 或 `/reset`，这样下一轮就会根据当前配置解析 harness。

## 与 Codex Desktop 和 CLI 共享线程

默认的 `appServer.homeScope: "agent"` 会将每个 OpenClaw 代理与操作员的原生 Codex 状态隔离开来。若想让所有者能够检查并管理与 Codex Desktop 和 Codex CLI 显示的相同原生线程，请启用用户 Codex 主目录：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            homeScope: "user",
          },
        },
      },
    },
  },
}
```

用户主目录模式支持本地受管的 stdio 进程或共享的 Unix socket 传输。它会在设置了 `$CODEX_HOME` 时使用该路径，否则使用 `~/.codex`，包括该主目录中的原生 Codex 身份验证、配置、插件和线程存储。OpenClaw 不会向这个 app-server 注入 OpenClaw 身份验证配置文件。

所有者回合将获得 `codex_threads` 工具：可用于列出、搜索、读取、分叉、重命名、归档和恢复原生线程。将线程分叉后可在 OpenClaw 中继续它；分叉后的线程会附加到当前 OpenClaw 会话，并继续对其他原生 Codex 客户端可见。归档需要明确确认该线程已在其他地方关闭。启用监督时，转录字段和修改还需要匹配的 `supervision.allowRawTranscripts` 或 `supervision.allowWriteControls` 显式启用。

不要通过彼此独立受管的 stdio App Server 并发恢复或写入同一个线程。Codex 只会在同一个 App Server 内协调活动写入者，而不会跨独立进程协调。对于普通的用户主目录 stdio 会话，分叉是安全的共存方式。

`appServer.homeScope: "user"` 本身并不会控制 fleet 目录。插件处于活动状态时，会启用原生会话发现；将 `sessionCatalog.enabled: false` 以在不禁用 Codex 的情况下将其从 OpenClaw 侧边栏移除。目录使用单独的监督连接；如果没有显式的 `appServer` 连接设置，该连接默认使用受管的用户主目录 stdio，而普通 harness 仍保持 agent 范围。显式的 `appServer` 设置会同时作用于两条路径。当普通 harness 也应共享原生状态时，如上所示显式设置 `homeScope: "user"`。

## 监督 Codex 会话

同一个 `codex` 插件可以列出来自 Gateway 计算机和已加入的配对节点的未归档 Codex 会话。已存储或空闲的 Gateway 本地会话可以创建一个受模型锁定的 Chat，它会镜像其有界的持久化用户与助手历史。其私有绑定使用监督连接来处理原生快照、规范分支以及后续轮次，而普通 Codex 会话仍然处于 agent 作用域内。第一次规范启动严格使用 Codex 为快照分支返回的模型和提供方。之后的恢复将选择权留给 Codex 的原生配置；外层的 OpenClaw 模型和回退链永远不会替代它。已存储和空闲的行在经过明确的“没有其他运行器”确认后可以归档。活跃来源不能创建分支或被归档；但现有的受监督 Chat 仍然可以打开。配对节点会话仍然仅限元数据。

有关设置、分支规则、配对节点限制、元数据暴露和故障排除，请参见 [监督 Codex 会话](/plugins/codex-supervision)。

## 配置

| 需要                                                | 设置                                                                                             | 位置                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 启用 harness                                       | `plugins.entries.codex.enabled: true`                                                            | OpenClaw config                    |
| 隐藏原生 Codex 会话发现                             | `plugins.entries.codex.config.sessionCatalog.enabled: false`                                     | Codex plugin config                |
| 保持允许列表中的插件安装                             | 在 `plugins.allow` 中包含 `codex`                                                                | OpenClaw config                    |
| 允许符合条件的 OpenAI turn 以隐式方式使用 Codex      | 精确的官方 HTTPS Responses/ChatGPT 路由、无作者请求覆盖、runtime 未设置/`auto`                  | OpenAI provider/model config       |
| 使用 ChatGPT/Codex OAuth 登录                       | `openclaw models auth login --provider openai`                                                   | CLI auth profile                   |
| 为 Codex 运行添加 API key 备用                       | `openai:*` API-key profile 列在 `auth.order.openai` 中订阅 auth 之后                         | CLI auth profile + OpenClaw config |
| 在 Codex 不可用时关闭失败                            | Provider 或 model `agentRuntime.id: "codex"`                                                     | OpenClaw model/provider config     |
| 使用直接的 OpenAI API 流量                           | Provider 或 model `agentRuntime.id: "openclaw"`，并使用正常的 OpenAI auth                      | OpenClaw model/provider config     |
| 调整 app-server 行为                                 | `plugins.entries.codex.config.appServer.*`                                                       | Codex plugin config                |
| 启用原生 Codex plugin apps                          | `plugins.entries.codex.config.codexPlugins.*`                                                    | Codex plugin config                |
| 启用 Codex Computer Use                             | `plugins.entries.codex.config.computerUse.*`                                                     | Codex plugin config                |

优先使用 `auth.order.openai` 来实现“订阅优先 / API key 备份”的排序。  
现有的旧版 Codex auth 配置文件 id 和旧版 Codex auth 顺序  
仅用于 doctor 的旧状态；不要写入新的旧版 Codex GPT 引用。

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

对于兼容 Codex 的有效路由，上面的两个配置文件在同一次 Codex 运行中都仍然是候选。  
配置文件顺序决定凭据，而不是运行时。  
更改 auth 顺序并不会让自定义、Completions、HTTP 或  
请求覆盖的路由变得兼容 Codex。

### 压缩

不要在由 Codex 支持的 agent 上设置 `compaction.model` 或 `compaction.provider`。Codex 通过其原生 app-server thread 状态进行压缩，因此 OpenClaw 在运行时会忽略这些本地 summarizer 覆盖项，并且当 agent 使用 Codex 时，`openclaw doctor --fix` 会将它们移除。

Lossless 仍然可以作为一个 context engine 用于 Codex turn 周围的组装、摄取和维护，通过  
`plugins.slots.contextEngine: "lossless-claw"` 和  
`plugins.entries.lossless-claw.config.summaryModel` 进行配置，而不是通过 `agents.defaults.compaction.provider`。当 Codex 是活动运行时，`openclaw doctor --fix` 会将旧的  
`compaction.provider: "lossless-claw"` 形式迁移到 Lossless  
context-engine 插槽，但原生 Codex 仍然负责压缩。原生 app-server harness 支持需要预提示组装的 context engine；  
通用 CLI 后端，包括 `codex-cli`，不提供这种宿主能力。

对于由 Codex 支持的 agent，`/compact` 会在绑定的 thread 上启动原生 Codex app-server 压缩。OpenClaw 不会等待完成、  
施加 OpenClaw 超时、重启共享 app-server，或回退到  
context-engine 或公共 OpenAI summarizer。如果原生 Codex thread  
绑定缺失或已过期，该命令会直接失败，而不是静默切换压缩后端。

本页其余内容涵盖部署形态、失败即关闭路由、guardian  
批准策略、原生 Codex 插件以及 Computer Use。有关完整的选项  
列表、默认值、枚举、发现、环境隔离、超时，以及  
app-server 传输字段，请参阅  
[Codex harness 参考](/plugins/codex-harness-reference)。

## 验证 Codex 运行时

在你期望使用 Codex 的聊天中使用 `/status`。由 Codex 支持的 OpenAI
代理轮次会显示：

```text
Runtime: OpenAI Codex
```

然后检查 Codex app-server 状态：

```text
/codex status
/codex models
```

`/codex status` 会报告 app-server 连接性、账户、速率限制、MCP
服务器和技能。`/codex models` 列出该 harness 和账户的实时 Codex app-server
目录。如果 `/status` 的结果出乎意料，请参见
[Troubleshooting](#troubleshooting)。

## 路由和模型选择

将提供方引用和运行时策略分开：

- 对于规范的 OpenAI 模型选择，请使用 `openai/gpt-*`。仅靠前缀
  绝不会选择 Codex。
- 在运行时未设置或为 `auto` 时，只有完全匹配的官方 HTTPS Platform Responses
  或 ChatGPT Responses 路由，且没有作者指定的请求覆盖时，才可能隐式选择 Codex。
- 不要在配置中使用旧版 Codex GPT 引用；运行 `openclaw doctor --fix` 来
  修复旧引用和过时的会话路由固定。
- `agentRuntime.id: "codex"` 会将 Codex 设为一个失败即关闭的要求，适用于
  兼容的路由。它不会让不兼容的有效路由变得兼容。
- `agentRuntime.id: "openclaw"` 会在有意为之时，将提供方或模型纳入嵌入式
  OpenClaw 运行时。
- `/codex ...` 控制来自聊天的原生 Codex 应用服务器对话。
- ACP/acpx 是一个单独的外部控制器路径。仅当用户
  请求 ACP/acpx 或外部控制器适配器时使用它。

| 用户意图                                                | 使用                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 绑定当前聊天                                    | `/codex bind [thread-id] [--cwd <path>] [--model <model>] [--provider <provider>]`                    |
| 恢复现有的 Codex 线程                            | `/codex resume <thread-id>`                                                                           |
| 列出或筛选 Codex 线程                               | `/codex threads [filter]`                                                                             |
| 列出原生 Codex 插件                                  | `/codex plugins list`                                                                                 |
| 启用或禁用已配置的原生 Codex 插件         | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                       |
| 将已存储的 Codex CLI 会话作为配对节点轮次恢复    | `/codex sessions --host <node> [filter]`, 然后 `/codex resume <session-id> --host <node> --bind here` |
| 查看跨计算机的未归档 Codex 会话          | 启用 Codex 监督并打开 **Codex Sessions**                                                  |
| 更改已绑定线程的模型、快速模式或权限 | `/codex model <model>`, `/codex fast [on\|off\|status]`, `/codex permissions [default\|yolo\|status]` |
| 停止或引导当前轮次                              | `/codex stop`, `/codex steer <text>`                                                                  |
| 解除当前绑定                                 | `/codex detach`（别名 `/codex unbind`）                                                               |
| 仅发送 Codex 反馈                                   | `/codex diagnostics [note]`                                                                           |
| 启动 ACP/acpx 任务                                     | ACP/acpx 会话命令，而不是 `/codex`                                                               |

| 使用场景                                        | 配置                                                                                                   | 验证                                  | 备注                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------ |
| 具备原生 Codex 运行时的合格 OpenAI 路由 | 精确的官方 HTTPS Responses/ChatGPT 路由，且没有作者指定的请求覆盖，再加上已启用的 `codex` 插件 | `/status` 显示 `Runtime: OpenAI Codex` | 当运行时未设置或为 `auto` 时的隐式路径 |
| 在 Codex 不可用时失败关闭             | 提供方或模型 `agentRuntime.id: "codex"`                                                                | 轮次失败而不是回退到嵌入式模式 | 适用于仅限 Codex 的部署             |
| 将 OpenAI API 密钥流量直接通过 OpenClaw 处理  | 提供方或模型 `agentRuntime.id: "openclaw"`，并使用正常的 OpenAI 身份验证                                      | `/status` 显示 OpenClaw 运行时        | 仅在有意使用 OpenClaw 时才用      |
| 旧版配置                                   | 旧版 Codex GPT 引用                                                                                       | `openclaw doctor --fix` 会重写它     | 不要再以这种方式编写新配置           |
| ACP/acpx Codex 适配器                          | ACP `sessions_spawn({ runtime: "acp" })`                                                                    | ACP 任务/会话状态                 | 与原生 Codex 控制器分离         |

`agents.defaults.imageModel` 遵循相同的前缀拆分规则。正常的 OpenAI 路由请使用 `openai/gpt-*`
；只有当图像理解应通过受限的 Codex 应用服务器轮次运行时，才使用 `codex/gpt-*`。Doctor 会将旧版
Codex GPT 引用重写为 `openai/gpt-*`。

## Deployment Modes

### Basic Codex Deployment

Use a quick start configuration for an OpenAI model whose effective official HTTPS
route qualifies for implicit Codex selection:

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
      model: "openai/gpt-5.6-sol",
    },
  },
}
```

### Mixed Provider Deployment

Keep Claude as the default agent and add a named Codex agent:

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
        model: "openai/gpt-5.6-sol",
      },
    ],
  },
}
```

The `main` agent uses its normal provider path. The `codex` agent uses the Codex
app-server when its effective OpenAI route remains compatible; when fail-closed
requirements are needed, add an explicit model scope `agentRuntime.id: "codex"`.

### Fail-Closed Codex Deployment

When the bundled plugin is available, a qualifying exact official HTTPS OpenAI route can resolve to Codex. Add an explicit runtime policy for the written
fail-closed rule:

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
      model: "openai/gpt-5.6-sol",
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

When Codex is enforced, OpenClaw will fail early if the effective route is not declared Codex-compatible, the plugin is disabled, the app-server version is too old, or the app-server fails to start.

## App-server 策略

默认情况下，该插件会在本地启动 OpenClaw 托管的 Codex 二进制文件，并使用
stdio 传输。只有在有意运行不同可执行文件时，才设置 `appServer.command`。
仅当 app-server 已经在其他地方运行时，才使用 WebSocket 传输：

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
`sandbox: "danger-full-access"`。如果本地 Codex 要求不允许这种隐式的 YOLO 姿态，
OpenClaw 会改为选择允许的 guardian 权限。当前会话如果启用了 OpenClaw sandbox，
OpenClaw 会在该轮中禁用 Codex 原生 Code Mode、用户 MCP 服务器，以及基于 app 的插件执行，
而不是依赖 Codex 主机侧的 sandboxing。Shell 访问则改为通过 OpenClaw 的 sandbox-backed 动态工具，
例如在常规 exec/process 工具可用时使用 `sandbox_exec` 和 `sandbox_process`。

在 Codex 原生自动审查、sandbox 逃逸或额外权限之前，请使用规范化的 OpenClaw exec 模式：

```json5
{
  tools: {
    exec: {
      mode: "auto",
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

对于 Codex app-server 会话，`tools.exec.mode: "auto"` 会映射为经过 Codex Guardian 审核的批准：
在本地要求允许这些值时，通常是 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"`，以及 `sandbox: "workspace-write"`。
在 `tools.exec.mode: "auto"` 下，OpenClaw 不会保留旧版不安全的 Codex
`approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆盖；如果有意采用无需批准的
Codex 姿态，请使用 `tools.exec.mode: "full"`。旧版
`plugins.entries.codex.config.appServer.mode: "guardian"` 预设仍然可用，
但 `tools.exec.mode: "auto"` 才是规范化的 OpenClaw 接口。

关于该模式与主机 exec 批准及 ACPX 权限的对比，请参见
[Permission modes](/tools/permission-modes)。关于所有 app-server 字段、认证顺序、环境隔离和超时行为，
请参见 [Codex harness reference](/plugins/codex-harness-reference)。

## 命令与诊断

`codex` 插件会在任何支持 OpenClaw 文本命令的频道中，将 `/codex` 注册为斜杠命令。

原生执行和控制需要 `owner` 或 `operator.admin` Gateway 客户端：绑定或恢复线程、发送或停止轮次、更改模型、快速模式或权限状态、压缩或审查，以及解除绑定。其他已授权的发送者仅保留只读状态、帮助、账户、模型、线程、MCP 服务器、技能和绑定检查命令。

常见形式：

- `/codex status` 检查应用服务器连接性、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 应用服务器线程。
- `/codex resume <thread-id>` 将当前 OpenClaw 会话附加到现有的 Codex 线程。
- `/codex bind [thread-id] [--cwd <path>] [--model <model>] [--provider <provider>]`
  附加当前聊天。
- `/codex detach`（或 `/codex unbind`）解除当前绑定。
- `/codex binding` 描述当前绑定。
- `/codex stop` 停止当前活动轮次；`/codex steer <text>` 引导它。
- `/codex model <model>`、`/codex fast [on|off|status]`，以及
  `/codex permissions [default|yolo|status]` 更改每次会话的状态。
- `/codex compact` 请求 Codex 应用服务器压缩已附加的线程。
- `/codex review` 为已附加线程启动 Codex 原生审查。
- `/codex diagnostics [note]` 在发送针对已附加线程的 Codex 反馈前请求确认。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器技能。
- `/codex plugins list`、`/codex plugins enable <name>`，以及
  `/codex plugins disable <name>` 管理已配置的原生 Codex 插件。
- `/codex computer-use [status|install]` 管理 Codex Computer Use。
- `/codex help` 列出完整命令树。

对于大多数支持请求，请在发生 bug 的对话中先使用 `/diagnostics [note]`。它会创建一份 Gateway 诊断报告，并且对于 Codex harness 会话，会请求批准发送相关的 Codex 反馈包。有关隐私模型和群聊行为，请参阅 [Diagnostics export](/gateway/diagnostics)。仅当你特别希望针对当前附加线程上传 Codex 反馈，而不包含完整的 Gateway 诊断包时，才使用 `/codex diagnostics [note]`。

### 在本地检查 Codex 线程

检查一次失败的 Codex 运行，最快的方法通常是直接打开原生
Codex 线程：

```bash
codex resume <thread-id>
```

可从已完成的 `/diagnostics` 回复、`/codex binding`，
或 `/codex threads [filter]` 中获取线程 id。

有关上传机制和运行时级诊断边界，请参见
[Codex harness 运行时](/plugins/codex-harness-runtime#codex-feedback-upload)。

### Auth 顺序

在默认的按 agent 的 home 中，auth 按以下顺序选择：

1. 为该 agent 排序好的 OpenAI auth 配置文件，优先使用
   `auth.order.openai`。运行 `openclaw doctor --fix` 以迁移较旧的
   传统 Codex auth 配置文件 id 和传统 Codex auth 顺序。
2. 该 agent 的 Codex home 中 app-server 现有的账户。
3. 仅对于本地 stdio app-server 启动，在没有 app-server 账户且仍然需要
   OpenAI auth 时，依次使用 `CODEX_API_KEY`，然后是
   `OPENAI_API_KEY`。

当 OpenClaw 看到 ChatGPT 订阅式的 Codex auth 配置文件时，它会从启动的
Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这样可以让
Gateway 级别的 API key 继续可用于 embeddings 或直接使用 OpenAI 模型，
同时避免原生 Codex app-server 的轮次误通过 API 计费。显式的 Codex API key
配置文件以及本地 stdio 环境变量 key 回退会使用 app-server 登录，而不是继承
的子进程环境变量。WebSocket app-server 连接不会接收 Gateway 环境变量
API key 回退；请使用显式 auth 配置文件或远程 app-server 自身的账户。

如果订阅配置文件遇到 Codex 使用限制，OpenClaw 会在 Codex 报告重置时间时
记录该时间，并为同一次 Codex 运行尝试下一个按顺序排列的 auth 配置文件。
当重置时间过去后，该订阅配置文件会再次具备资格，而无需更改所选的
`openai/gpt-*` 模型或 Codex 运行时。

当配置了原生 Codex 插件时，OpenClaw 会在向 Codex 线程公开由插件拥有的
应用之前，通过已连接的 app-server 安装或刷新这些插件。`app/list` 仍然是
应用 id、可访问性和元数据的事实来源，但 OpenClaw 负责按线程的启用决策：
如果策略允许某个已列出且可访问的应用，OpenClaw 会发送
`thread/start.config.apps[appId].enabled = true`，即使 `app/list` 当前报告该
应用已禁用。此路径不会为未知 id 虚构应用安装；OpenClaw 只会使用
`plugin/install` 激活 marketplace 插件，然后刷新清单。

### 环境隔离

对于本地 stdio 应用服务器启动，OpenClaw 会将 `CODEX_HOME` 设置为
每个代理专用的目录，因此 Codex 配置、认证/账户文件、插件缓存/数据，
以及本地线程状态默认都不会读写操作者个人的
`~/.codex`。OpenClaw 会保留正常的进程 `HOME`；Codex 运行的子进程仍然可以找到用户主目录中的配置和令牌，并且
Codex 可能会发现共享的 `$HOME/.agents/skills` 和
`$HOME/.agents/plugins/marketplace.json` 条目。使用
`appServer.homeScope: "user"` 时，OpenClaw 会改为使用原生用户的 Codex
home 及其现有账户，而不会注入 OpenClaw 认证配置文件。

如果某个部署需要额外的环境隔离，请将这些
变量添加到 `appServer.clearEnv` 中：

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

`appServer.clearEnv` 只影响所创建的 Codex 应用服务器子
进程。OpenClaw 在本地启动规范化期间会将 `CODEX_HOME` 和 `HOME` 从该列表中移除：
`CODEX_HOME` 仍会指向所选的代理或用户作用域，而 `HOME` 仍会保持继承状态，以便子进程可以使用
正常的用户主目录状态。

### Dynamic Tools and Web Search

Codex dynamic tools are loaded by default in `searchable` mode. OpenClaw does not provide dynamic tools that would duplicate Codex native workspace operations: `read`, `write`, `edit`, `apply_patch`, `exec`, `process`, `update_plan`, `tool_call`, `tool_describe`, `tool_search`, and `tool_search_code`. Most other OpenClaw integration tools, such as messages, media, cron, browser, nodes, gateway, and `heartbeat_respond`, are available through Codex tool search under the `openclaw` namespace, keeping the initial model context smaller.

Tools marked `catalogMode: "direct-only"`, including OpenClaw’s `computer` tool, should instead use the `openclaw_direct` namespace. Codex treats that namespace as `DirectModelOnly`, so these tools remain directly visible to the model in normal threads and code-only threads, rather than being routed through nested Code Mode `tools.*` calls.

When search is enabled and no hosted provider is selected, web search defaults to the Codex-hosted `web_search` tool. Native hosted search and OpenClaw’s hosted `web_search` dynamic tool are mutually exclusive, so hosted search cannot bypass native domain restrictions. OpenClaw uses the hosted tool when hosted search is unavailable, explicitly disabled, or replaced by the selected hosted provider. OpenClaw keeps Codex’s separate `web.run` extension disabled, because production application-server traffic rejects its user-defined `web` namespace. `tools.web.search.enabled: false` disables both paths, as does a tools-disabled-only LLM run. Codex treats `"cached"` as a preference and resolves it to live external access in unrestricted application-server rounds. Automatic hosted fallback fails and turns off when native `allowedDomains` are set, ensuring the allowlist cannot be bypassed. Persistent effective search policy changes rotate the bound Codex thread before the next round; per-round temporary restrictions use a temporary restricted thread and preserve the existing binding for later restoration.

`sessions_yield` and source replies from message-only tools remain direct because these belong to the round-control contract. `sessions_spawn` remains searchable, so Codex’s native `spawn_agent` remains the primary Codex sub-agent entry point, while explicit OpenClaw or ACP delegation is still available through the `openclaw` dynamic tool namespace. Heartbeat cooperation instructions tell Codex to search for `heartbeat_respond` before the heartbeat round ends, provided that the tool has not yet been loaded.

Only set `codexDynamicToolsLoading: "direct"` when connecting to a custom Codex application server that cannot search deferred dynamic tools, or when debugging full tool payloads.

### 配置字段

支持的顶层 Codex 插件字段：

| 字段                      | 默认值        | 含义                                                                                  |
| -------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 可将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 要从 Codex app-server 轮次中省略的额外 OpenClaw 动态工具名称。              |
| `codexPlugins`             | disabled       | 为已迁移的、从源码安装的精选插件提供原生 Codex 插件/app 支持。           |
| `sessionCatalog`           | enabled        | 用于在此 Gateway 和符合条件的配对节点上发现原生 Codex 会话的侧边栏功能。   |
| `supervision`              | disabled       | 面向代理的原生会话转录与写入控制策略。                         |

支持的 `appServer` 字段：

| 字段                                         | 默认值                                                | 含义                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                              | `"stdio"` 会启动 Codex；显式指定 `"unix"` 会连接到本地控制套接字；`"websocket"` 会连接到 `url`。                                                                                                                                                                                                                                                                                |
| `homeScope`                                   | `"agent"`                                              | `"agent"` 会按 OpenClaw agent 隔离普通 harness 状态。`"user"` 是显式启用选项，会共享原生 `$CODEX_HOME` 或 `~/.codex`，使用原生认证，并启用仅所有者可管理的线程管理。user 作用域支持本地 stdio 或 Unix 传输。对于单独的 supervision 连接，未设置的值在 stdio 或 Unix 下解析为 `"user"`，在 WebSocket 下解析为 `"agent"`。     |
| `command`                                     | managed Codex binary                                   | stdio 传输所用可执行文件。留空以使用托管二进制文件；仅在需要显式覆盖时设置。                                                                                                                                                                                                                                                                                    |
| `args`                                        | `["app-server", "--listen", "stdio://"]`               | stdio 传输的参数。                                                                                                                                                                                                                                                                                                                                                                  |
| `url`                                         | unset                                                  | WebSocket App Server URL 或 `unix://` URL。显式留空的 Unix 路径会选择规范的用户主目录控制套接字。                                                                                                                                                                                                                                                                          |
| `authToken`                                   | unset                                                  | WebSocket 传输的 Bearer token。接受字面字符串或 SecretInput，例如 `${CODEX_APP_SERVER_TOKEN}`。                                                                                                                                                                                                                                                                              |
| `headers`                                     | `{}`                                                   | 额外的 WebSocket 请求头。请求头值可接受字面字符串或 SecretInput 值，例如 `x-codex-client-session-token: "${CODEX_CLIENT_SESSION_TOKEN}"`。                                                                                                                                                                                                                               |
| `clearEnv`                                    | `[]`                                                   | OpenClaw 构建继承环境后，从生成的 stdio app-server 进程中移除的额外环境变量名。OpenClaw 会为本地启动保留选定的 `CODEX_HOME` 和继承的 `HOME`。                                                                                                                                                                           |
| `codeModeOnly`                                | `false`                                                | 启用 Codex 的仅 code-mode 工具面。普通 OpenClaw 动态工具仍可通过嵌套的 `tools.*` 调用使用；`openclaw_direct` 工具仍直接对模型可见。                                                                                                                                                                                                             |
| `remoteWorkspaceRoot`                         | unset                                                  | 远程 Codex app-server 工作区根目录。设置后，OpenClaw 会根据解析后的 OpenClaw 工作区推断本地工作区根目录，将当前 cwd 后缀保留在该远程根目录下，并仅把最终的 app-server cwd 发送给 Codex。如果 cwd 位于解析后的 OpenClaw 工作区根目录之外，OpenClaw 会关闭失败，而不会将 gateway 本地路径发送给远程 app-server。 |
| `requestTimeoutMs`                            | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                                                                                                                                                                                     |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                | Codex 接受一次轮次后，或 OpenClaw 等待 `turn/completed` 时在一次轮次范围内的 app-server 请求之后的静默窗口。                                                                                                                                                                                                                                                                    |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                               | 在工具交接、原生工具完成、工具后的原始 assistant 进度、原始推理完成，或 OpenClaw 等待 `turn/completed` 时的推理进度之后使用的完成静默与进度保护。适用于受信任或重负载场景，在这些场景下，工具后综合分析可以合理地比最终 assistant 释放预算保持更久的静默。                                |
| `mode`                                        | `"yolo"` unless local Codex requirements disallow YOLO | YOLO 或 guardian 审核执行的预设。若本地 stdio 要求省略 `danger-full-access`、`never` 审批或 `user` 审核者，则隐式默认值为 guardian。                                                                                                                                                                                                           |
| `approvalPolicy`                              | `"never"` or an allowed guardian approval policy       | 发送到线程启动/恢复/轮次的原生 Codex 审批策略。Guardian 默认在允许时偏好 `"on-request"`。                                                                                                                                                                                                                                                                            |
| `sandbox`                                     | `"danger-full-access"` or an allowed guardian sandbox  | 发送到线程启动/恢复的原生 Codex 沙箱模式。Guardian 默认在允许时偏好 `"workspace-write"`，否则偏好 `"read-only"`。当 OpenClaw 沙箱处于活动状态时，`danger-full-access` 轮次会使用 Codex `workspace-write`，网络访问则由 OpenClaw 沙箱出口设置决定。                                                                                     |
| `approvalsReviewer`                           | `"user"` or an allowed guardian reviewer               | 使用 `"auto_review"` 可让 Codex 在允许时审核原生审批提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍是一个旧别名。                                                                                                                                                                                                                              |
| `serviceTier`                                 | unset                                                  | 可选的 Codex app-server 服务层级。`"priority"` 启用快速模式路由，`"flex"` 请求 flex 处理，`null` 清除覆盖项，旧版 `"fast"` 会被接受为 `"priority"`。                                                                                                                                                                                                 |
| `networkProxy`                                | disabled                                               | 启用 Codex permissions-profile 网络功能以供 app-server 命令使用。OpenClaw 会定义所选的 `permissions.<profile>.network` 配置，并通过 `default_permissions` 选择它，而不是发送 `sandbox`。                                                                                                                                                                             |
| `experimental.sandboxExecServer`              | `false`                                                | 预览版启用项，会注册一个基于 OpenClaw 沙箱的 Codex 环境到受支持的 Codex app-server，从而使原生 Codex 执行可以运行在当前活动的 OpenClaw 沙箱内部。                                                                                                                                                                                                            |

`appServer.networkProxy` 是显式配置，因为它会改变 Codex 沙箱
契约。启用后，OpenClaw 还会在 Codex 线程配置中设置 `features.network_proxy.enabled`
和 `default_permissions`，以便生成的
权限配置文件可以启动 Codex 托管网络。默认情况下，OpenClaw 会根据配置文件主体
生成一个抗冲突的 `openclaw-network-<fingerprint>` 配置文件
名称；仅在需要稳定的本地名称时使用 `profileName`。

```json5
{
  plugins: {
    entries: {
      codex: {
        config: {
          appServer: {
            sandbox: "workspace-write",
            networkProxy: {
              enabled: true,
              domains: {
                "api.openai.com": "allow",
                "blocked.example.com": "deny",
              },
              unixSockets: {
                "/tmp/proxy.sock": "allow",
                "/tmp/blocked.sock": "none",
              },
              allowUpstreamProxy: true,
              proxyUrl: "http://127.0.0.1:3128",
            },
          },
        },
      },
    },
  },
}
```

如果常规 app-server 运行时本应是 `danger-full-access`，启用
`networkProxy` 会为生成的权限配置文件使用工作区风格的文件系统访问：Codex
托管网络强制是受沙箱保护的网络，因此完全访问配置文件不会
保护出站流量。域条目使用 `allow` 或 `deny`；Unix 套接字条目使用 Codex 的
`allow` 或 `none` 值。

### 动态工具调用超时

OpenClaw 拥有的动态工具调用与 `appServer.requestTimeoutMs` 独立受限：默认情况下，Codex 的 `item/tool/call` 请求使用 90 秒的 OpenClaw 看门狗。正的单次调用 `timeoutMs` 参数会延长或缩短该特定工具预算，但上限为 600000 ms。`image_generate` 工具在工具调用未提供自身超时时，使用 `agents.defaults.imageGenerationModel.timeoutMs`，否则使用 120 秒的图像生成默认值。媒体理解 `image` 工具使用 `tools.media.image.timeoutSeconds`，或其 60 秒媒体默认值；对于图像理解，该超时作用于请求本身，不会因前置准备工作而减少。发生超时时，在支持的情况下 OpenClaw 会中止工具信号，并向 Codex 返回失败的动态工具响应，以便该轮可以继续，而不是让会话停留在 `processing` 中。这个看门狗是外层动态 `item/tool/call` 预算；提供方特定的请求超时在该调用内部运行，并保持其自身的超时语义。

在 Codex 接受一个轮次之后，以及在 OpenClaw 响应一次轮次范围内的 app-server 请求之后，harness 期望 Codex 取得当前轮次的进展，并最终以 `turn/completed` 完成原生轮次。如果 app-server 在 `appServer.turnCompletionIdleTimeoutMs` 时间内保持静默，OpenClaw 会尽力中断 Codex 轮次，记录诊断超时，并释放 OpenClaw 会话通道，这样后续聊天消息就不会排在一个过时的原生轮次之后。对同一轮次的大多数非终态通知都会解除这个短看门狗，因为 Codex 已证明该轮次仍然存活。

工具交接使用更长的工具后空闲预算：在 OpenClaw 返回 `item/tool/call` 响应之后，在原生工具项（如 `commandExecution`）完成之后，在原始 `custom_tool_call_output` 完成之后，以及在工具后的原始 assistant 进度、原始 reasoning 完成或 reasoning 进度之后。若已配置，该保护使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否则默认为五分钟；同一预算还会扩展进度看门狗，用于 Codex 发出下一个当前轮次事件之前的静默合成窗口。全局 app-server 通知（例如限流更新）不会重置轮次空闲进度。Reasoning 完成、评论性 `agentMessage` 完成，以及工具前的原始 reasoning 或 assistant 进度之后，可能会跟随自动最终回复，因此它们使用的是工具后进度回复保护，而不是立即释放会话通道。

只有最终的/非评论性的已完成 `agentMessage` 项，以及工具前的原始 assistant 完成，才会武装 assistant 输出释放：如果随后 Codex 在没有 `turn/completed` 的情况下保持静默，OpenClaw 会尽力中断原生轮次并释放会话通道。如果另一个轮次看门狗赢得了该释放竞态，那么只要没有原生请求、项或动态工具完成仍处于活动状态，并且 assistant 输出释放仍属于最新完成的项且没有更晚的项完成，OpenClaw 仍会接受已完成的最终 assistant 项。这样可以在已完成的工具工作后保留最终答案，而无需重放该轮次。部分 assistant 增量、过时的较早回复，以及空的较晚完成都不符合条件。

可重放的 stdio app-server 失败，包括在没有 assistant、工具、活动项或副作用证据的情况下发生的轮次完成空闲超时，会在新的 app-server 尝试中重试一次。不安全的超时仍会终止卡住的 app-server 客户端并释放 OpenClaw 会话通道；它们还会清除过时的原生线程绑定，而不是自动重放。完成看门狗超时会显示 Codex 特定的超时文本：可重放的情况会说明响应可能不完整，而不安全的情况会提示用户在重试前验证当前状态。公开的超时诊断包含结构化字段，例如最后一条 app-server 通知方法、原始 assistant 响应项的 id/type/role、活动请求/项计数，以及已武装的看门狗状态；当最后一条通知是原始 assistant 响应项时，它们还会包含一个有界的 assistant 文本预览。它们不包含原始提示词或工具内容。

### 本地测试环境覆盖项

- `OPENCLAW_CODEX_APP_SERVER_BIN` 在 `appServer.command` 未设置时会绕过受管二进制文件。
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或者在一次性的本地测试中使用
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，更推荐使用配置，
因为它会将插件行为与 Codex harness 其余设置一起保存在同一个经过审查的文件中。

## 原生 Codex 插件

原生 Codex 插件支持使用 Codex app-server 自身的 app 和插件能力，并且与 OpenClaw harness turn 处于同一个 Codex 线程中。OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex harness 的会话。
它对内置 harness 运行、普通 OpenAI provider 运行、ACP
conversation bindings 或其他 harness 不产生任何影响。

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

当 OpenClaw 建立 Codex harness
会话或替换过期的 Codex 线程绑定时，会计算 Thread app 配置；它不会在
每个 turn 都重新计算。更改 `codexPlugins` 后，请使用 `/new`、`/reset`，或重启
gateway，以便未来的 Codex harness 会话使用更新后的 app
集合启动。

关于迁移资格、app 库存、破坏性操作策略、询问机制和原生插件诊断，请参见
[原生 Codex 插件](/plugins/codex-native-plugins)。

OpenAI 侧的 app 和插件访问受已登录的 Codex
账户控制；对于 Business 和 Enterprise/Edu workspace，还受 workspace app
controls 控制。有关 OpenAI 的账户和 workspace 控制概览，请参见
[使用 Codex 搭配你的 ChatGPT 方案](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。

## 计算机使用

计算机使用有其自己的设置指南：
[Codex 计算机使用](/plugins/codex-computer-use)。

简短版本：OpenClaw 不会内置桌面控制应用，也不会自行执行桌面操作。它会准备 Codex 应用服务器，验证 `computer-use` MCP 服务器可用，然后在 Codex 模式轮次中让 Codex 负责原生的 MCP 工具调用。

## 运行时边界

Codex harness 只会改变底层嵌入式 agent 执行器。

- 支持 OpenClaw 动态工具。Codex 会请求 OpenClaw 执行
  这些工具，因此 OpenClaw 仍然处于执行路径中。
- Codex 原生的 shell、patch、MCP 和原生应用工具由 Codex 负责。
  OpenClaw 可以通过
  支持的中继观察或阻止选定的原生事件，但不会重写原生工具参数。
- Codex 负责原生压缩。OpenClaw 会保留一份转录镜像，用于
  通道历史、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换，
  但不会用 OpenClaw 或 context-engine 摘要器替代 Codex 压缩。
- 媒体生成、媒体理解、TTS、审批以及消息工具
  输出继续通过匹配的 OpenClaw 提供方/模型设置进行。
- `tool_result_persist` 适用于 OpenClaw 负责的转录工具结果，
  不适用于 Codex 原生工具结果记录。

关于 hook 层、受支持的 V1 接口、原生权限处理、队列引导、Codex 反馈上传机制以及压缩细节，请参见
[Codex harness 运行时](/plugins/codex-harness-runtime)。

## 故障排查

**Codex 不会作为普通的 `/model` 提供方出现：** 对于新配置来说这是预期行为。请选择 `openai/gpt-*` 模型，启用
`plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了
`codex`。

**OpenClaw 使用内置 harness 而不是 Codex：** 确认实际生效的
route 是完全匹配的官方 HTTPS Platform Responses 或 ChatGPT Responses route，
没有自定义的 request override，并且 Codex 插件已安装且已启用。仅有
`openai/gpt-*` 前缀是不够的。为了在测试时严格证明这一点，将 provider 或 model 设置为
`agentRuntime.id: "codex"`；当 route 或 harness 不兼容时，强制使用 Codex 会失败，
而不会回退。

**OpenAI Codex runtime 回退到 API-key 路径：** 收集一段已脱敏的
gateway 摘录，展示 model、runtime、所选 provider 和
失败信息。请受影响的协作者在其 OpenClaw 主机上运行以下只读命令：

```bash
(
  pattern='openai/gpt-5\.[45]|openai[-]codex|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|legacy OpenAI Codex prefix|resolveSelectedOpenAIRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

  if ls /tmp/openclaw/openclaw-*.log >/dev/null 2>&1; then
    grep -E -i -n "$pattern" /tmp/openclaw/openclaw-*.log 2>/dev/null || true
  else
    journalctl --user -u openclaw-gateway --since today --no-pager 2>/dev/null \
      | grep -E -i "$pattern" || true
  fi
) | sed -E \
    -e 's/(Authorization: Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(api[_ -]?key[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/(OPENAI_API_KEY[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/sk-[A-Za-z0-9_-]{12,}/sk-[REDACTED]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[EMAIL-REDACTED]/g' \
  | tail -200
```

常见的有效摘录通常包括 `openai/gpt-5.6-sol` 或 `openai/gpt-5.6-luna`、
`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、
`candidateProvider: "openai"`，以及 `401`、`Incorrect API key` 或
`No API key` 结果。修正后的运行应显示 OpenAI OAuth 路径，
而不是普通的 OpenAI API-key 失败。

**旧版 Codex 模型引用配置仍然存在：** 运行 `openclaw doctor --fix`。Doctor 会将旧版模型引用重写为 `openai/*`，移除过期的会话和整 agent runtime 固定配置，并保留现有的 auth-profile 覆盖。

**The app-server is rejected:** 使用 Codex app-server `0.143.0` 或更高版本。
相同版本的预发布版本或带构建后缀的版本，例如
`0.143.0-alpha.2` 或 `0.143.0+custom` 会被拒绝，因为 OpenClaw 会测试稳定的 `0.143.0` 协议下限。

**`/codex status` 无法连接：** 检查 `codex` 插件是否
已启用；如果配置了 allowlist，检查 `plugins.allow` 是否包含它；并确认任何自定义的
`appServer.command`、`url`、`authToken` 或 headers 都有效。

**模型发现很慢：** 降低
`plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。
参见 [Codex harness 参考](/plugins/codex-harness-reference#model-discovery)。

**WebSocket 传输立即失败：** 检查 `appServer.url`、
`authToken`、headers，以及远程 app-server 是否使用相同的 Codex
app-server 协议版本。

**原生 shell 或 patch 工具被 `Native hook relay unavailable` 阻止：** Codex 线程仍在尝试使用 OpenClaw 已不再注册的原生 hook relay
id。这是原生 Codex hook 传输问题，不是 ACP 后端、provider、GitHub 或 shell 命令
失败。请在受影响的聊天中使用 `/new` 或 `/reset` 开启全新会话，
然后重试一个无害命令。如果这次能成功，但下一次原生工具调用又失败，
则将 `/new` 仅视为临时解决方案：在重启 Codex app-server 或
OpenClaw Gateway 之后，将提示复制到新会话中，以便旧线程被丢弃并重新创建
原生 hook 注册。

**非 Codex 模型使用内置 harness：** 除非 provider
或 model runtime 策略将其路由到其他 harness，否则这是预期行为。普通的非 OpenAI
provider 引用在 `auto` 模式下会保持其正常的 provider 路径。

**Computer Use 已安装但工具无法运行：** 在新的会话中检查
`/codex computer-use status`。如果某个工具报告 `Native hook relay unavailable`，
请使用上面的原生 hook relay 恢复方法。
参见 [Codex Computer Use](/plugins/codex-computer-use#troubleshooting)。

## 相关内容

- [Codex 运行时参考](/plugins/codex-harness-reference)
- [Codex 运行时](/plugins/codex-harness-runtime)
- [Codex 监督](/plugins/codex-supervision)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [Codex 计算机使用](/plugins/codex-computer-use)
- [Agent 运行时](/concepts/agent-runtimes)
- [模型提供商](/concepts/model-providers)
- [OpenAI 提供商](/providers/openai)
- [OpenAI Codex 帮助](https://help.openai.com/en/collections/14937394-codex)
- [Agent 运行时插件](/plugins/sdk-agent-harness)
- [插件钩子](/plugins/hooks)
- [诊断导出](/gateway/diagnostics)
- [状态](/cli/status)
- [测试](/help/testing-live#live-codex-app-server-harness-smoke)
