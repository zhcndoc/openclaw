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

你还会在代码中看到 **harness** 这个词。Harness 是提供代理运行时的实现。
例如，内置的 Codex harness 实现了 `codex` 运行时。公开配置在 provider 或
model 条目上使用 `agentRuntime.id`；整代理 runtime 键是旧式写法，会被忽略。
`openclaw doctor --fix` 会移除旧的整代理 runtime 绑定，并在需要时将旧式 runtime
model 引用重写为规范的 provider/model 引用以及按模型范围的 runtime 策略。

运行时有两个家族：

- **嵌入式 harness** 运行在 OpenClaw 预备好的代理循环内。当前包括内置的
  `pi` 运行时，以及已注册的插件 harness，例如 `codex`。
- **CLI 后端** 在本地运行 CLI 进程，同时保持模型引用的规范性。例如，
  `anthropic/claude-opus-4-7` 配合按模型范围的
  `agentRuntime.id: "claude-cli"`，表示“选择 Anthropic 模型，并通过 Claude CLI 执行”。
  `claude-cli` 不是嵌入式 harness id，不能传给 AgentHarness 选择。

## Codex 表面

大部分困惑都来自多个不同的表面共享了 Codex 这个名字：

| 表面                                          | OpenClaw 名称/配置                 | 作用                                                                                                           |
| ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 原生 Codex app-server 运行时                  | `openai/*` model refs                | 通过 Codex app-server 运行 OpenAI 嵌入式代理轮次。这通常是 ChatGPT/Codex 订阅设置。 |
| Codex OAuth 认证配置                         | `openai-codex` auth provider         | 存储由 Codex app-server harness 消费的 ChatGPT/Codex 订阅认证信息。                             |
| Codex ACP 适配器                                | `runtime: "acp"`, `agentId: "codex"` | 通过外部 ACP/acpx 控制平面运行 Codex。仅在明确要求 ACP/acpx 时使用。            |
| 原生 Codex 聊天控制命令集            | `/codex ...`                         | 从聊天中绑定、恢复、引导、停止并检查 Codex app-server 线程。                                |
| 面向非代理表面的 OpenAI Platform API 路由 | `openai/*` plus API-key auth         | 用于直接的 OpenAI API，例如图像、嵌入、语音和实时能力。                                  |

这些表面被刻意设计为彼此独立。启用 `codex` 插件会让原生 app-server 功能可用；
`openclaw doctor --fix` 负责处理旧的 `openai-codex/*` 路由修复和过期会话绑定清理。
为代理模型选择 `openai/*` 现在意味着“通过 Codex 运行”，除非使用的是非代理
OpenAI API 表面。

常见的 ChatGPT/Codex 订阅设置使用 Codex OAuth 进行身份验证，但仍将模型引用保持为 `openai/*`，并选择 `codex` 运行时：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

这意味着 OpenClaw 先选择一个 OpenAI 模型引用，然后让 Codex app-server 运行时执行嵌入式代理轮次。它并不意味着“使用 API 计费”，也不意味着通道、模型提供方目录或 OpenClaw 会话存储会变成 Codex。

当启用了捆绑的 `codex` 插件时，自然语言的 Codex 控制应使用原生的 `/codex` 命令表面（`/codex bind`、`/codex threads`、`/codex resume`、`/codex steer`、`/codex stop`），而不是 ACP。只有当用户明确要求 ACP/acpx，或者正在测试 ACP 适配器路径时，才为 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor 以及类似的外部 harness 仍然使用 ACP。

这是面向代理的决策树：

1. 如果用户要求 **Codex 绑定/控制/线程/恢复/引导/停止**，并且启用了捆绑的 `codex` 插件，请使用原生 `/codex` 命令表面。
2. 如果用户要求 **将 Codex 作为嵌入式运行时**，或者想要常规的基于订阅的 Codex 代理体验，请使用 `openai/<model>`。
3. 如果用户明确为 OpenAI 模型选择 **PI**，请保持模型引用为 `openai/<model>`，并将 provider/model 运行时策略设置为 `agentRuntime.id: "pi"`。选定的 `openai-codex` 认证配置会在内部通过 PI 的旧版 Codex 认证传输路由。
4. 如果旧配置仍包含 **`openai-codex/*` 模型引用**，请使用 `openclaw doctor --fix` 将其修复为 `openai/<model>`；doctor 会通过在旧模型引用所暗示的位置添加 provider/model 作用域的 `agentRuntime.id: "codex"` 来保留 Codex 认证路由。
   旧的 **`codex-cli/*` 模型引用** 也会修复为相同的 `openai/<model>` Codex app-server 路由；OpenClaw 不再保留捆绑的 Codex CLI 后端。
5. 如果用户明确说 **ACP**、**acpx** 或 **Codex ACP 适配器**，请使用带有 `runtime: "acp"` 和 `agentId: "codex"` 的 ACP。
6. 如果请求是 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid** 或其他外部 harness，请使用 ACP/acpx，而不是原生子代理运行时。

| 你指的是...                             | 使用...                                       |
| --------------------------------------- | -------------------------------------------- |
| Codex app-server 聊天/线程控制          | 来自捆绑 `codex` 插件的 `/codex ...`         |
| Codex app-server 嵌入式代理运行时       | `openai/*` 代理模型引用                      |
| OpenAI Codex OAuth                      | `openai-codex` 认证配置                      |
| Claude Code 或其他外部 harness           | ACP/acpx                                     |

关于 OpenAI 系列前缀拆分，请参见 [OpenAI](/providers/openai) 和
[模型提供方](/concepts/model-providers)。关于 Codex 运行时支持
契约，请参见 [Codex harness runtime](/plugins/codex-harness-runtime#v1-support-contract)。

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

1. 按模型范围的运行时策略优先。这可以位于已配置的 provider
   model 条目中，或位于 `agents.defaults.models["provider/model"].agentRuntime` /
   `agents.list[].models["provider/model"].agentRuntime` 中。诸如
   `agents.defaults.models["vllm/*"].agentRuntime` 之类的 provider 通配符会在精确
   模型策略之后生效，因此动态发现的 provider 模型可以共享一个运行时，而不会覆盖
   精确的逐模型例外。
2. 接下来是 provider 范围的运行时策略，位于
   `models.providers.<provider>.agentRuntime`。
3. 在 `auto` 模式下，已注册的插件运行时可以声明支持的 provider/model
   组合。
4. 如果在 `auto` 模式下没有运行时声明某个轮次，OpenClaw 会使用 PI 作为
   兼容运行时。若运行必须严格，请使用显式的运行时 id。

整会话和整代理 runtime 绑定会被忽略。这包括
`OPENCLAW_AGENT_RUNTIME`、会话 `agentHarnessId`/`agentRuntimeOverride` 状态、
`agents.defaults.agentRuntime` 以及 `agents.list[].agentRuntime`。运行
`openclaw doctor --fix` 可移除过期的整代理 runtime 配置，并在 OpenClaw 能够保留意图时，
将旧式 runtime 模型引用转换过来。

显式的 provider/model 插件运行时是 fail closed 的。例如，
在 provider 或 model 上设置 `agentRuntime.id: "codex"` 表示要么使用 Codex，要么给出明确的
选择/运行时错误；它绝不会静默回退到 PI。

CLI 后端别名与嵌入式 harness id 不同。推荐的 Claude CLI 形式是：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      models: {
        "anthropic/claude-opus-4-7": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

诸如 `claude-cli/claude-opus-4-7` 这样的旧式引用仍为兼容性保留支持，但新的配置应保持 provider/model 规范化，并将执行后端放在 provider/model runtime 策略中。

旧的 `codex-cli/*` 引用有所不同：doctor 会将它们迁移为 `openai/*`，这样它们会通过 Codex app-server harness 运行，而不是保留一个 Codex CLI 后端。

`auto` 模式对大多数提供方有意保持保守。OpenAI 代理模型是例外：未设置的运行时和 `auto` 都会解析为 Codex harness。显式的 PI 运行时配置仍然是 `openai/*` 代理轮次的一种可选兼容路径；当与选定的 `openai-codex` 认证配置配合时，OpenClaw 会在内部通过旧版 Codex 认证传输路由 PI，同时将公开的模型引用保持为 `openai/*`。过期的 OpenAI PI 会话固定项会被运行时选择忽略，并可用 `openclaw doctor --fix` 清理。

如果 `openclaw doctor` 提示已启用 `codex` 插件但配置中仍保留 `openai-codex/*`，请将其视为旧路由状态。运行 `openclaw doctor --fix` 将其重写为带 Codex 运行时的 `openai/*`。

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
[Codex harness runtime](/plugins/codex-harness-runtime#v1-support-contract)。

## 状态标签

状态输出可能同时显示 `Execution` 和 `Runtime` 标签。请将它们视为诊断信息，而不是提供商名称。

- 例如，像 `openai/gpt-5.5` 这样的模型引用表示所选的提供商/模型。
- 像 `codex` 这样的运行时 ID 表示当前轮次由哪个循环执行。
- 像 Telegram 或 Discord 这样的通道标签表示对话发生的位置。

如果运行时仍然意外显示，首先检查所选提供商/模型的运行时策略。
旧版会话运行时是固定的，不再决定路由。

## 相关链接

- [Codex harness](/plugins/codex-harness)
- [Codex harness 运行时](/plugins/codex-harness-runtime)
- [OpenAI](/providers/openai)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [Agent 循环](/concepts/agent-loop)
- [模型](/concepts/models)
- [状态](/cli/status)
