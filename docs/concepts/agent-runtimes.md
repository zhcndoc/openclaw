---
summary: "OpenClaw 如何区分模型提供方、模型、通道和代理运行时"
title: "代理运行时"
read_when:
  - 你正在 PI、Codex、ACP 或其他原生代理运行时之间做选择
  - 你对状态或配置中的 provider/model/runtime 标签感到困惑
  - 你正在为原生 harness 编写支持一致性文档
---

**代理运行时** 是拥有一个已准备好的模型循环的组件：它接收提示、驱动模型输出、处理原生工具调用，并将完成的轮次返回给 OpenClaw。

运行时很容易与提供方混淆，因为它们都会出现在模型配置附近。它们属于不同层：

| 层级         | 示例                                  | 含义                                                                |
| ------------- | ------------------------------------- | ------------------------------------------------------------------- |
| 提供方       | `openai`, `anthropic`, `openai-codex` | OpenClaw 如何进行身份验证、发现模型以及命名模型引用。               |
| 模型         | `gpt-5.5`, `claude-opus-4-6`          | 为代理轮次选择的模型。                                               |
| 代理运行时   | `pi`, `codex`, `claude-cli`           | 执行已准备轮次的底层循环或后端。                                      |
| 通道         | Telegram, Discord, Slack, WhatsApp    | 消息进入和离开 OpenClaw 的位置。                                      |

你还会在代码中看到 **harness** 这个词。harness 是提供代理运行时的实现。例如，内置的 Codex harness 实现了 `codex` 运行时。公共配置使用 `agentRuntime.id`；`openclaw doctor --fix` 会将旧的 runtime-policy 键重写为这种结构。

运行时有两个家族：

- **嵌入式 harness** 在 OpenClaw 的已准备代理循环中运行。当前包括内置的 `pi` 运行时以及已注册的插件 harness，例如 `codex`。
- **CLI 后端** 在本地 CLI 进程中运行，同时保持模型引用为规范形式。例如，使用 `anthropic/claude-opus-4-7` 并设置 `agentRuntime.id: "claude-cli"` 意味着“选择 Anthropic 模型，通过 Claude CLI 执行”。`claude-cli` 不是嵌入式 harness id，不能传给 AgentHarness 选择。

## Codex 表面

Most confusion comes from several different surfaces sharing the Codex name:

| Surface                                              | OpenClaw name/config                       | What it does                                                                                               |
| ---------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Native Codex app-server runtime                      | `openai/*` plus `agentRuntime.id: "codex"` | Runs the embedded agent turn through Codex app-server. This is the usual ChatGPT/Codex subscription setup. |
| Codex OAuth provider route                           | `openai-codex/*` model refs                | Uses ChatGPT/Codex subscription OAuth through the normal OpenClaw PI runner.                               |
| Codex ACP adapter                                    | `runtime: "acp"`, `agentId: "codex"`       | Runs Codex through the external ACP/acpx control plane. Use only when ACP/acpx is explicitly asked.        |
| Native Codex chat-control command set                | `/codex ...`                               | Binds, resumes, steers, stops, and inspects Codex app-server threads from chat.                            |
| OpenAI Platform API route for GPT/Codex-style models | `openai/*` model refs                      | Uses OpenAI API-key auth unless a runtime override, such as `agentRuntime.id: "codex"`, runs the turn.     |

这些表面是刻意独立的。启用 `codex` 插件会让原生 app-server 功能可用；它不会把 `openai-codex/*` 重写成 `openai/*`，不会更改现有会话，也不会让 ACP 成为 Codex 的默认方式。选择 `openai-codex/*` 的意思是“使用 Codex OAuth 提供方路由”，除非你另外强制指定运行时。

常见的 ChatGPT/Codex 订阅设置使用 Codex OAuth 进行身份验证，但仍将模型引用保持为 `openai/*`，并选择 `codex` 运行时：

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
}
```

这意味着 OpenClaw 先选择一个 OpenAI 模型引用，然后让 Codex app-server 运行时执行嵌入式代理轮次。它并不意味着“使用 API 计费”，也不意味着通道、模型提供方目录或 OpenClaw 会话存储会变成 Codex。

当启用了捆绑的 `codex` 插件时，自然语言的 Codex 控制应使用原生的 `/codex` 命令表面（`/codex bind`、`/codex threads`、`/codex resume`、`/codex steer`、`/codex stop`），而不是 ACP。只有当用户明确要求 ACP/acpx，或者正在测试 ACP 适配器路径时，才为 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor 以及类似的外部 harness 仍然使用 ACP。

这是面向代理的决策树：

1. If the user asks for **Codex bind/control/thread/resume/steer/stop**, use the
   native `/codex` command surface when the bundled `codex` plugin is enabled.
2. If the user asks for **Codex as the embedded runtime** or wants the normal
   subscription-backed Codex agent experience, use
   `openai/<model>` with `agentRuntime.id: "codex"`.
3. If the user asks for **Codex OAuth/subscription auth on the normal OpenClaw
   runner**, use `openai-codex/<model>` and leave the runtime as PI.
4. If the user explicitly says **ACP**, **acpx**, or **Codex ACP adapter**, use
   ACP with `runtime: "acp"` and `agentId: "codex"`.
5. If the request is for **Claude Code, Gemini CLI, OpenCode, Cursor, Droid, or
   another external harness**, use ACP/acpx, not the native sub-agent runtime.

| 你的意思是...                          | 使用...                                    |
| ------------------------------------- | ------------------------------------------ |
| Codex app-server 聊天/线程控制        | 使用捆绑的 `codex` 插件中的 `/codex ...`  |
| Codex app-server 嵌入式代理运行时     | `agentRuntime.id: "codex"`                |
| 在 PI 运行器上的 OpenAI Codex OAuth   | `openai-codex/*` model refs               |
| Claude Code 或其他外部 harness       | ACP/acpx                                   |

关于 OpenAI 家族前缀拆分，请参见 [OpenAI](/providers/openai) 和 [模型提供方](/concepts/model-providers)。关于 Codex 运行时支持契约，请参见 [Codex harness](/plugins/codex-harness#v1-support-contract)。

## 运行时所有权

不同运行时拥有循环的不同部分。

| 表面                     | OpenClaw PI 嵌入式                    | Codex app-server                                                            |
| ------------------------ | ------------------------------------- | --------------------------------------------------------------------------- |
| 模型循环所有者           | 通过 PI 嵌入式运行器的 OpenClaw      | Codex app-server                                                            |
| 规范线程状态             | OpenClaw transcript                     | Codex thread，以及 OpenClaw transcript 镜像                               |
| OpenClaw 动态工具        | 原生 OpenClaw 工具循环               | 通过 Codex 适配器桥接                                                       |
| 原生 shell 和文件工具    | PI/OpenClaw 路径                      | Codex 原生工具，在受支持时通过原生钩子桥接                                 |
| 上下文引擎               | 原生 OpenClaw 上下文组装            | OpenClaw 将项目上下文组装进 Codex 轮次                                     |
| 压缩                     | OpenClaw 或选定的上下文引擎         | Codex 原生压缩，并由 OpenClaw 负责通知和镜像维护                            |
| 通道投递                 | OpenClaw                               | OpenClaw                                                                    |

这种所有权划分是主要设计规则：

- 如果 OpenClaw 拥有该表面，OpenClaw 就可以提供正常的插件钩子行为。
- 如果原生运行时拥有该表面，OpenClaw 就需要运行时事件或原生钩子。
- 如果原生运行时拥有规范线程状态，OpenClaw 应该镜像和投射上下文，而不是重写不受支持的内部实现。

## 运行时选择

OpenClaw 在 provider 和 model 解析之后选择一个嵌入式运行时：

1. A session's recorded runtime wins. Config changes do not hot-switch an
   existing transcript to a different native thread system.
2. `OPENCLAW_AGENT_RUNTIME=<id>` forces that runtime for new or reset sessions.
3. `agents.defaults.agentRuntime.id` or `agents.list[].agentRuntime.id` can set
   `auto`, `pi`, a registered embedded harness id such as `codex`, or a
   supported CLI backend alias such as `claude-cli`.
4. In `auto` mode, registered plugin runtimes can claim supported provider/model
   pairs.
5. If no runtime claims a turn in `auto` mode, OpenClaw uses PI as the
   compatibility runtime. Use an explicit runtime id when the run must be
   strict.

Explicit plugin runtimes fail closed. For example, `agentRuntime.id: "codex"`
means Codex or a clear selection/runtime error; it is never silently routed back
to PI.

CLI 后端别名与嵌入式 harness id 不同。推荐的 Claude CLI 形式是：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      agentRuntime: { id: "claude-cli" },
    },
  },
}
```

像 `claude-cli/claude-opus-4-7` 这样的旧式引用仍然为了兼容性而受支持，但新的配置应保持 provider/model 为规范形式，并将执行后端放在 `agentRuntime.id` 中。

`auto` 模式是刻意保守的。插件运行时可以声明它们理解的 provider/model 组合，但 Codex 插件在 `auto` 模式下不会声明 `openai-codex` 提供方。这让 `openai-codex/*` 保持为显式的 PI Codex OAuth 路由，并避免将订阅认证配置悄悄迁移到原生 app-server harness 上。

如果 `openclaw doctor` 警告说 `codex` 插件已启用，而 `openai-codex/*` 仍然通过 PI 路由，请将其视为诊断，而不是迁移。在你需要 PI Codex OAuth 时，保持配置不变。只有当你想要原生 Codex app-server 执行时，才切换到 `openai/<model>` 加上 `agentRuntime.id: "codex"`。

## 兼容性契约

当运行时不是 PI 时，它应当记录其支持哪些 OpenClaw 暴露的功能。
运行时文档请使用以下格式：

| 问题                                   | 重要原因                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 谁拥有模型循环？                       | 决定重试、工具继续执行以及最终答案决策发生在哪里。                                                |
| 谁拥有规范化的线程历史？               | 决定 OpenClaw 是否可以编辑历史，还是只能镜像它。                                                   |
| OpenClaw 动态工具是否可用？            | 消息、会话、cron 以及 OpenClaw 拥有的工具都依赖这一点。                                            |
| 动态工具钩子是否可用？                 | 插件期望 `before_tool_call`、`after_tool_call` 以及围绕 OpenClaw 拥有工具的中间件。               |
| 原生工具钩子是否可用？                 | Shell、patch 以及运行时拥有的工具需要原生钩子支持以进行策略控制和观测。                           |
| 上下文引擎生命周期是否运行？           | 记忆和上下文插件依赖 assemble、ingest、after-turn 和 compaction 生命周期。                         |
| 暴露了哪些 compaction 数据？           | 有些插件只需要通知，而另一些则需要保留/丢弃的元数据。                                              |
| 哪些内容是有意不支持的？               | 用户不应假定与 PI 等价，因为原生运行时拥有更多状态。                                               |

Codex 运行时支持契约记录在
[Codex harness](/plugins/codex-harness#v1-support-contract) 中。

## 状态标签

状态输出可能同时显示 `Execution` 和 `Runtime` 标签。应将它们视为诊断信息，而不是提供者名称。

- 例如，模型引用如 `openai/gpt-5.5` 表示所选的提供者/模型。
- 运行时 id 如 `codex` 表示当前轮次由哪个循环执行。
- 渠道标签如 Telegram 或 Discord 表示对话发生的位置。

如果在更改运行时配置后会话仍显示 PI，请使用 `/new` 创建新会话，或使用 `/reset` 清除当前会话。现有会话会保留其记录的运行时，因此转录不会通过两个不兼容的原生会话系统再次播放。

## 相关链接

- [Codex harness](/plugins/codex-harness)
- [OpenAI](/providers/openai)
- [Agent harness plugins](/plugins/sdk-agent-harness)
- [Agent loop](/concepts/agent-loop)
- [Models](/concepts/models)
- [Status](/cli/status)
