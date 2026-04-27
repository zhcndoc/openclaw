---
summary: "通过捆绑的 Codex 应用服务器测试套件运行 OpenClaw 嵌入式代理轮次"
title: "Codex 测试套件"
read_when:
  - 您想使用捆绑的 Codex 应用服务器测试套件
  - 您需要 Codex 测试套件配置示例
  - 您希望仅使用 Codex 的部署在失败时不回退到 PI
---

捆绑的 `codex` 插件使 OpenClaw 能够通过
Codex 应用服务器而不是内置的 PI 测试套件运行嵌入式代理轮次。

当您希望 Codex 拥有底层代理会话时使用：模型发现、原生线程恢复、原生压缩和应用服务器执行。
OpenClaw 仍然拥有聊天频道、会话文件、模型选择、工具、审批、媒体交付和可见的转录镜像。

如果您想先建立整体认识，请从
[代理运行时](/concepts/agent-runtimes) 开始。简而言之：
`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、
Discord、Slack 或其他频道仍然是通信界面。

原生 Codex 轮次会保留 OpenClaw 插件挂钩作为公共兼容层。
这些是进程内的 OpenClaw 挂钩，不是 Codex `hooks.json` 命令挂钩：

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `after_tool_call`
- `before_message_write` 用于镜像的转录记录
- `agent_end`

插件还可以注册与运行时无关的工具结果中间件，以在 OpenClaw 执行工具之后、结果返回给 Codex 之前重写
OpenClaw 的动态工具结果。这与公共的
`tool_result_persist` 插件挂钩是分开的，后者会转换 OpenClaw 所拥有的转录工具结果写入。

该测试套件默认关闭。新配置应保持 OpenAI 模型引用
规范为 `openai/gpt-*`，并在
希望进行原生应用服务器执行时显式强制
`embeddedHarness.runtime: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。
旧版 `codex/*` 模型引用仍会自动选择
测试套件以保持兼容性，但基于运行时的旧版提供方前缀
不会像正常的模型/提供方选项那样显示。

## 选择正确的模型前缀

OpenAI 系列路由是按前缀区分的。使用 `openai-codex/*` 当您希望
通过 PI 使用 Codex OAuth；使用 `openai/*` 当您希望直接访问 OpenAI API，
或当您正在强制使用原生 Codex 应用服务器测试套件时：

| 模型引用                                           | 运行时路径                                | 适用场景                                                              |
| -------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `openai/gpt-5.4`                                   | 通过 OpenClaw/PI 逻辑的 OpenAI 提供方     | 您希望使用当前的 OpenAI Platform API 直接访问，并提供 `OPENAI_API_KEY`。 |
| `openai-codex/gpt-5.5`                             | 通过 OpenClaw/PI 的 OpenAI Codex OAuth    | 您希望使用 ChatGPT/Codex 订阅认证并使用默认的 PI 运行器。               |
| `openai/gpt-5.5` + `embeddedHarness.runtime: "codex"` | Codex 应用服务器测试套件                | 您希望为嵌入式代理轮次进行原生 Codex 应用服务器执行。                  |

GPT-5.5 目前在 OpenClaw 中仅支持订阅/OAuth。使用
`openai-codex/gpt-5.5` 进行 PI OAuth，或使用
`openai/gpt-5.5` 配合 Codex
应用服务器测试套件。对于 `openai/gpt-5.5` 的直接 API 密钥访问将在
OpenAI 在公共 API 上启用 GPT-5.5 后得到支持。

旧版 `codex/gpt-*` 引用仍然被接受为兼容别名。Doctor
兼容性迁移会将旧的主运行时引用重写为规范模型
引用，并单独记录运行时策略，而仅用于回退的旧版引用
会保持不变，因为运行时是为整个代理容器配置的。
新的 PI Codex OAuth 配置应使用 `openai-codex/gpt-*`；新的原生
应用服务器测试套件配置应使用 `openai/gpt-*` 加上
`embeddedHarness.runtime: "codex"`。

`agents.defaults.imageModel` 遵循相同的前缀拆分。使用
`openai-codex/gpt-*` 当图像理解应通过 OpenAI
Codex OAuth 提供方路径运行时。使用 `codex/gpt-*` 当图像理解应通过
受限的 Codex 应用服务器轮次运行时。Codex 应用服务器模型必须
声明图像输入支持；仅文本的 Codex 模型会在媒体轮次
开始前失败。

使用 `/status` 来确认当前会话的实际测试套件。如果
选择结果令人意外，请为 `agents/harness` 子系统启用调试日志
并检查网关结构化的 `agent harness selected` 记录。它
包含所选测试套件 id、选择原因、运行时/回退策略，以及在
`auto` 模式下每个插件候选项的支持结果。

测试套件选择不是实时会话控制。当嵌入式轮次运行时，
OpenClaw 会在该会话上记录所选测试套件 id，并在
同一会话 id 的后续轮次中继续使用它。要让未来的会话使用其他测试套件，请更改
`embeddedHarness` 配置或 `OPENCLAW_AGENT_RUNTIME`；
在在现有对话在 PI 与 Codex 之间切换之前，使用 `/new` 或 `/reset` 开始新会话。
这可避免将一份转录通过两个不兼容的原生会话系统重放。

在测试套件固定之前创建的旧会话，在拥有转录历史后会被视为
PI 固定。更改配置后，使用 `/new` 或 `/reset` 将该对话切换到
Codex。

`/status` 显示实际的模型运行时。默认 PI 测试套件显示为
`Runtime: OpenClaw Pi Default`，而 Codex 应用服务器测试套件显示为
`Runtime: OpenAI Codex`。

## 要求

- 可用捆绑 `codex` 插件的 OpenClaw。
- Codex 应用服务器 `0.118.0` 或更新版本。
- 应用服务器进程可用的 Codex 认证。

该插件阻止较旧或未版本化的应用服务器握手。这使得
OpenClaw 保持在经过测试的协议表面。

对于实时和 Docker 冒烟测试，认证通常来自 `OPENAI_API_KEY`，以及
可选的 Codex CLI 文件，例如 `~/.codex/auth.json` 和
`~/.codex/config.toml`。使用与您本地 Codex 应用服务器
相同的认证材料。

## 最小化配置

使用 `openai/gpt-5.5`，启用捆绑插件，并强制使用 `codex` 测试套件：

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
      embeddedHarness: {
        runtime: "codex",
      },
    },
  },
}
```

如果您的配置使用 `plugins.allow`，也请在那里包含 `codex`：

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

将 `agents.defaults.model` 或某个代理模型设置为
`codex/<model>` 的旧配置仍会自动启用捆绑的 `codex` 插件。新配置应
优先使用 `openai/<model>` 并配合上面的显式 `embeddedHarness` 条目。

## 在其他模型旁添加 Codex

如果同一个代理应自由地在 Codex 与非 Codex 提供方模型之间切换，
不要全局设置 `runtime: "codex"`。强制运行时会应用于该代理或会话的每个
嵌入式轮次。如果您在强制该运行时时选择 Anthropic 模型，OpenClaw 仍会尝试使用 Codex 测试套件，
并以失败关闭而不是悄悄通过 PI 路由该轮次。

请改用以下结构之一：

- 将 Codex 放在单独的代理上，并设置 `embeddedHarness.runtime: "codex"`。
- 保持默认代理为 `runtime: "auto"` 并启用 PI 回退，以进行正常的多提供方使用。
- 仅将旧版 `codex/*` 引用用于兼容性。新配置应优先使用
  `openai/*` 并明确指定 Codex 运行时策略。

例如，这会让默认代理保持正常自动选择，
并添加一个单独的 Codex 代理：

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
      embeddedHarness: {
        runtime: "auto",
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
        embeddedHarness: {
          runtime: "codex",
        },
      },
    ],
  },
}
```

使用此结构：

- 默认的 `main` 代理使用正常提供方路径和 PI 兼容性回退。
- `codex` 代理使用 Codex 应用服务器测试套件。
- 如果 `codex` 代理缺少 Codex 或不受支持，则该轮次失败，
  而不是悄悄使用 PI。

## 仅 Codex 部署

当您需要证明每个嵌入式代理轮次都使用 Codex 时，请强制使用 Codex 测试套件。
显式插件运行时默认没有 PI 回退，因此
`fallback: "none"` 是可选的，但通常作为文档说明很有用：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      embeddedHarness: {
        runtime: "codex",
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

在强制使用 Codex 时，如果 Codex 插件被禁用、应用服务器过旧，或者应用服务器无法启动，
OpenClaw 会尽早失败。仅当您有意希望 PI 处理
缺失的测试套件选择时，才设置 `OPENCLAW_AGENT_HARNESS_FALLBACK=pi`。

## 每代理 Codex

您可以使一个代理仅限 Codex，而默认代理保持正常
自动选择：

```json5
{
  agents: {
    defaults: {
      embeddedHarness: {
        runtime: "auto",
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
        embeddedHarness: {
          runtime: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

使用正常的会话命令来切换代理和模型。`/new` 会创建一个新的
OpenClaw 会话，Codex 测试套件会根据需要创建或恢复其旁路应用服务器
线程。`/reset` 会清除该线程的 OpenClaw 会话绑定，
并让下一轮再次从当前配置中解析测试套件。

## 模型发现

默认情况下，Codex 插件会向应用服务器请求可用模型。如果
发现失败或超时，它会对以下模型使用内置回退目录：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

您可以在 `plugins.entries.codex.config.discovery` 下调整发现：

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

当您希望启动时避免探测 Codex 并坚持使用
回退目录时，禁用发现：

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

## 应用服务器连接和策略

默认情况下，插件使用以下命令在本地启动 Codex：

```bash
codex app-server --listen stdio://
```

默认情况下，OpenClaw 以 YOLO 模式启动本地 Codex 运行框架会话：
`approvalPolicy: "never"`、`approvalsReviewer: "user"`，以及
`sandbox: "danger-full-access"`。这是用于自主心跳的受信任本地操作员姿态：Codex 可以使用 shell 和网络工具，而不会因原生审批提示而停下来等待无人响应。

要启用 Codex 守护审核审批，请将 `appServer.mode:
"guardian"`：

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

Guardian 是原生 Codex 审批审查器。当 Codex 需要离开沙箱、在工作区外写入，或添加网络访问之类的权限时，Codex 会将该审批请求路由到一个审查子代理，而不是向人类发出提示。审查器会应用 Codex 的风险框架，并批准或拒绝该具体请求。当你希望比 YOLO 模式有更多护栏，但仍需要无人值守的代理继续推进时，请使用 Guardian。

`guardian` 预设会扩展为 `approvalPolicy: "on-request"`、`approvalsReviewer: "guardian_subagent"`，以及 `sandbox: "workspace-write"`。单独的策略字段仍会覆盖 `mode`，因此高级部署可以将预设与显式选择混用。

对于已经运行的应用服务器，请使用 WebSocket 传输：

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

支持的 `appServer` 字段：

| Field               | Default                                  | 含义                                                                                                   |
| ------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` 会启动 Codex；`"websocket"` 连接到 `url`。                                                  |
| `command`           | `"codex"`                                | stdio 传输的可执行文件。                                                                           |
| `args`              | `["app-server", "--listen", "stdio://"]` | stdio 传输的参数。                                                                            |
| `url`               | 未设置                                   | WebSocket 应用服务器 URL。                                                                                 |
| `authToken`         | 未设置                                   | WebSocket 传输的 Bearer 令牌。                                                                     |
| `headers`           | `{}`                                     | 额外的 WebSocket 标头。                                                                                  |
| `requestTimeoutMs`  | `60000`                                  | 应用服务器控制平面调用的超时时间。                                                               |
| `mode`              | `"yolo"`                                 | YOLO 或 Guardian 审核执行的预设。                                                           |
| `approvalPolicy`    | `"never"`                                | 发送到线程启动/恢复/轮次的原生 Codex 审批策略。                                            |
| `sandbox`           | `"danger-full-access"`                   | 发送到线程启动/恢复的原生 Codex 沙箱模式。                                                    |
| `approvalsReviewer` | `"user"`                                 | 使用 `"guardian_subagent"` 让 Codex Guardian 审查提示。                                           |
| `serviceTier`       | 未设置                                   | 可选的 Codex 应用服务器服务等级：`"fast"`、`"flex"` 或 `null`。无效的旧值会被忽略。 |

较旧的环境变量仍然作为本地测试的回退工作，当
匹配的配置字段未设置时：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或者
在一次性本地测试中使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复的部署，更推荐使用配置，因为它将插件行为与 Codex 运行框架设置的其余部分放在同一个经过审查的文件中。

## 常见配方

## Computer Use

Computer Use 是一个原生于 Codex 的 MCP 插件。OpenClaw 不会捆绑桌面控制应用，也不会自行执行桌面操作；它启用 Codex app-server 插件，在请求时安装已配置的 Codex 市场插件，检查 `computer-use` MCP server 是否可用，然后让 Codex 在 Codex 模式轮次中处理原生 MCP 工具调用。

当你希望 Codex 模式轮次要求使用 Computer Use 时，请设置 `plugins.entries.codex.config.computerUse`：

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
      embeddedHarness: {
        runtime: "codex",
      },
    },
  },
}
```

在没有 marketplace 字段时，OpenClaw 会请求 Codex app-server 使用其已发现的 marketplaces。在全新的 Codex home 中，app-server 会预置官方精选 marketplace，而 OpenClaw 采用与 Codex 相同的加载方式：在安装期间轮询 `plugin/list`，然后再将 Computer Use 视为不可用。默认的发现等待时间是 60 秒，可通过 `marketplaceDiscoveryTimeoutMs` 进行调整。如果多个已知的 Codex marketplaces 都包含 Computer Use，OpenClaw 会先使用 Codex marketplace 的优先级顺序，然后再对未知的歧义匹配采取关闭式失败。

如果需要一个非默认的 Codex marketplace 来源供 app-server 添加，请使用 `marketplaceSource`；如果本地机器上已经存在一个 marketplace 文件，请使用 `marketplacePath`。如果该 marketplace 已经在 Codex app-server 中注册，请改用 `marketplaceName`。默认值为 `pluginName: "computer-use"` 和 `mcpServerName: "computer-use"`。
出于安全考虑，turn-start 自动安装只会使用 app-server 已经发现的 marketplaces。若要从已配置的 `marketplaceSource` 或 `marketplacePath` 进行显式安装，请使用 `/codex computer-use install`。

也可以通过命令界面检查或安装相同的设置：

- `/codex computer-use status`
- `/codex computer-use install`
- `/codex computer-use install --source <marketplace-source>`
- `/codex computer-use install --marketplace-path <path>`

Computer Use 仅适用于 macOS，并且在 Codex MCP server 可以控制应用之前，可能需要本地操作系统权限。如果 `computerUse.enabled` 为 true 且 MCP server 不可用，Codex 模式轮次会在线程开始前失败，而不是在没有原生 Computer Use 工具的情况下静默运行。

## 常见配方

本地 Codex，使用默认的 stdio 传输：

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

仅 Codex 验证 harness：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      embeddedHarness: {
        runtime: "codex",
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

Guardian 审核的 Codex 审批：

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
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

带有显式头部的远程应用服务器：

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

模型切换仍由 OpenClaw 控制。当 OpenClaw 会话附加到一个现有的 Codex 线程时，下一轮会将当前选定的 OpenAI 模型、提供方、审批策略、沙箱和服务等级再次发送到 app-server。从 `openai/gpt-5.5` 切换到 `openai/gpt-5.2` 会保持线程绑定，但会要求 Codex 使用新选择的模型继续。

## Codex 命令

捆绑插件将 `/codex` 注册为授权斜杠命令。它是通用的，适用于任何支持 OpenClaw 文本命令的频道。

常见形式：

- `/codex status` 显示实时 app-server 连接性、模型、账户、速率限制、MCP servers 和 skills。
- `/codex models` 列出实时的 Codex app-server models。
- `/codex threads [filter]` 列出最近的 Codex threads。
- `/codex resume <thread-id>` 将当前 OpenClaw 会话附加到一个现有的 Codex thread。
- `/codex compact` 请求 Codex app-server 压缩已附加的 thread。
- `/codex review` 为已附加的 thread 启动 Codex 原生 review。
- `/codex computer-use status` 检查已配置的 Computer Use 插件和 MCP server。
- `/codex computer-use install` 安装已配置的 Computer Use 插件并重新加载 MCP servers。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex app-server MCP server 状态。
- `/codex skills` 列出 Codex app-server skills。

`/codex resume` 会写入与 harness 在普通轮次中使用的相同 sidecar 绑定文件。在下一条消息中，OpenClaw 会恢复该 Codex 线程，将当前选定的 OpenClaw 模型传入 app-server，并保持启用扩展历史记录。

命令界面需要 Codex app-server `0.118.0` 或更高版本。如果未来或自定义的 app-server 未暴露该 JSON-RPC 方法，各个控制方法将被报告为 `unsupported by this Codex app-server`。

## Hook 边界

Codex harness 有三个 hook 层：

| Layer                                 | Owner                    | Purpose                                                             |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| OpenClaw 插件 hooks                  | OpenClaw                 | PI 和 Codex harness 之间的产品/插件兼容性。         |
| Codex app-server 扩展中间件          | OpenClaw bundled plugins | 围绕 OpenClaw 动态工具的每轮适配器行为。            |
| Codex 原生 hooks                    | Codex                    | 来自 Codex 配置的底层 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目或全局 Codex `hooks.json` 文件来路由 OpenClaw 插件行为。Codex 原生 hooks 适用于 Codex 拥有的操作，例如 shell 策略、原生工具结果审查、停止处理以及原生压缩/模型生命周期，但它们不是 OpenClaw 插件 API。

对于 OpenClaw 动态工具，OpenClaw 会在 Codex 请求调用之后执行该工具，因此 OpenClaw 会触发它在 harness 适配器中拥有的插件和中间件行为。对于 Codex 原生工具，Codex 拥有规范的工具记录。OpenClaw 可以镜像选定事件，但除非 Codex 通过 app-server 或原生 hook 回调公开该操作，否则它不能重写原生 Codex 线程。

当更新的 Codex app-server 构建公开原生压缩和模型生命周期 hook 事件时，OpenClaw 应当对该协议支持进行版本门控，并在语义真实的地方将这些事件映射到现有的 OpenClaw hook 合约中。在那之前，OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是适配器级别的观察，而不是对 Codex 内部请求或压缩载荷的逐字节捕获。

Codex 原生 `hook/started` 和 `hook/completed` app-server 通知会作为 `codex_app_server.hook` 代理事件进行投射，用于轨迹和调试。它们不会触发 OpenClaw 插件 hooks。

## V1 支持契约

Codex 模式并不是在不同模型调用之下的 PI。Codex 拥有更多原生模型循环，而 OpenClaw 围绕该边界调整其插件和会话表面。

Codex 运行时 v1 中支持的内容：

| Surface                                 | Support                                 | Why                                                                                                                                  |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 通过 Codex 的 OpenAI 模型循环         | 支持                               | Codex app-server 拥有 OpenAI 轮次、原生线程恢复和原生工具继续。                                           |
| OpenClaw 频道路由和投递   | 支持                               | Telegram、Discord、Slack、WhatsApp、iMessage 和其他频道都保持在模型运行时之外。                                     |
| OpenClaw 动态工具                  | 支持                               | Codex 会请求 OpenClaw 执行这些工具，因此 OpenClaw 仍在执行路径中。                                                 |
| 提示词和上下文插件              | 支持                               | OpenClaw 会构建提示词覆盖，并在启动或恢复线程之前将上下文投射到 Codex 轮次中。                     |
| 上下文引擎生命周期                | 支持                               | 针对 Codex 轮次运行装配、摄取或轮次后维护，以及上下文引擎压缩协调。                          |
| 动态工具 hooks                      | 支持                               | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                           |
| 生命周期 hooks                         | 作为适配器观察而受支持       | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会以真实的 Codex 模式载荷触发。            |
| 原生 shell 和 patch 阻止或观察 | 通过原生 hook relay 支持 | 对受支持的 Codex 原生工具会转发 Codex `PreToolUse` 和 `PostToolUse`。支持阻止；不支持参数重写。 |
| 原生权限策略                | 通过原生 hook relay 支持 | 如果运行时暴露了它，Codex `PermissionRequest` 可以通过 OpenClaw 策略进行路由。                                        |
| 应用服务器轨迹捕获           | 支持                               | OpenClaw 会记录它发送到 app-server 的请求，以及它接收到的 app-server 通知。                                     |

Codex 运行时 v1 中不支持的内容：

| Surface                                             | V1 Boundary                                                                                                                                     | Future Path                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 原生工具参数变更                       | Codex 原生 pre-tool hooks 可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                               | 需要 Codex hook/schema 支持替换工具输入。                            |
| 可编辑的 Codex 原生转录历史            | Codex 拥有规范的原生线程历史。OpenClaw 拥有镜像并可以投射未来上下文，但不应修改不受支持的内部内容。 | 如果需要原生线程外科手术式修改，请添加显式的 Codex app-server API。                    |
| `tool_result_persist` 用于 Codex 原生工具记录 | 该 hook 会转换 OpenClaw 拥有的转录写入，而不是 Codex 原生工具记录。                                                           | 可以镜像转换后的记录，但规范重写需要 Codex 支持。              |
| 丰富的原生压缩元数据                     | OpenClaw 会观察压缩开始和完成，但不会接收稳定的保留/丢弃列表、token 变化或摘要载荷。            | 需要更丰富的 Codex 压缩事件。                                                     |
| 压缩干预                             | 当前 OpenClaw 压缩 hooks 在 Codex 模式下仅限通知级别。                                                                         | 如果插件需要否决或重写原生压缩，请添加 Codex pre/post compaction hooks。 |
| 停止或最终答案门控                         | Codex 有原生停止 hooks，但 OpenClaw 没有将最终答案门控作为 v1 插件契约暴露出来。                                          | 面向未来的可选原语，带有循环和超时保护。                                 |
| 原生 MCP hook 对等性                              | Codex 拥有 MCP 执行，完整的 pre/post hook 载荷对等性取决于 Codex MCP 处理器支持。                                           | 添加 Codex MCP hook 载荷，然后通过相同的原生 hook 路径转发它们。           |
| 按字节捕获模型 API 请求             | OpenClaw 可以捕获 app-server 请求和通知，但 Codex 核心会在内部构建最终的 OpenAI API 请求。                      | 需要 Codex 模型请求跟踪事件或调试 API。                                   |

## 工具、媒体和压缩

Codex harness 仅更改底层嵌入式 agent 执行器。

OpenClaw 仍然负责构建工具列表，并从 harness 接收动态工具结果。文本、图像、视频、音乐、TTS、审批和消息工具输出将继续通过正常的 OpenClaw 交付路径传递。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具审批请求会通过 OpenClaw 的插件审批流程进行路由。Codex `request_user_input` 提示会发送回发起该请求的聊天，会话中后续排队的跟进消息会回答该原生服务器请求，而不是作为额外上下文来引导。其他 MCP 询问请求仍会失败并关闭。

当所选模型使用 Codex harness 时，原生线程压缩会委托给 Codex app-server。OpenClaw 会保留一份转录镜像，用于频道历史、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换。该镜像包含用户提示、最终助手文本，以及当 app-server 输出时生成的轻量级 Codex 推理或计划记录。目前，OpenClaw 只记录原生压缩的开始和完成信号。它尚未公开人类可读的压缩摘要，也尚未公开 Codex 在压缩后保留了哪些条目的可审计列表。

由于 Codex 拥有规范的原生线程，`tool_result_persist` 当前不会重写 Codex 原生工具结果记录。它只会在 OpenClaw 正在写入由 OpenClaw 拥有的会话转录工具结果时生效。

媒体生成不需要 PI。图像、视频、音乐、PDF、TTS 和媒体理解继续使用匹配的提供商/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 故障排除

**Codex 未出现在 `/model` 中：** 启用 `plugins.entries.codex.enabled`，选择一个带有 `embeddedHarness.runtime: "codex"` 的 `openai/gpt-*` 模型（或旧版 `codex/*` 引用），并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而不是 Codex：** 当没有 Codex harness 声明该运行时，`runtime: "auto"` 仍可能将 PI 作为兼容后端使用。测试时请将 `embeddedHarness.runtime: "codex"` 设为强制选择 Codex。除非你显式设置 `embeddedHarness.fallback: "pi"`，否则强制的 Codex 运行时现在会失败，而不会回退到 PI。一旦选择了 Codex app-server，其故障会直接显现，而不会有额外的回退配置。

**app-server 被拒绝：** 升级 Codex，以便 app-server 握手报告版本 `0.118.0` 或更高版本。

**模型发现缓慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`，以及远程 app-server 是否使用相同的 Codex app-server 协议版本。

**非 Codex 模型使用 PI：** 这是预期行为，除非你为该 agent 强制设置了 `embeddedHarness.runtime: "codex"`，或者选择了旧版 `codex/*` 引用。在 `auto` 模式下，普通的 `openai/gpt-*` 和其他提供商引用会保持其正常的提供商路径。如果你强制使用 `runtime: "codex"`，那么该 agent 的每个嵌入式回合都必须是受 Codex 支持的 OpenAI 模型。

## 相关内容

- [Agent Harness Plugins](/plugins/sdk-agent-harness)
- [Agent runtimes](/concepts/agent-runtimes)
- [Model Providers](/concepts/model-providers)
- [Configuration Reference](/gateway/configuration-reference)
- [Testing](/help/testing-live#live-codex-app-server-harness-smoke)
