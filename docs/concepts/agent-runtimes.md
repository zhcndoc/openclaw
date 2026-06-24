---
summary: "OpenClaw 如何区分模型提供方、模型、通道和代理运行时"
title: "代理运行时"
read_when:
  - 你正在在 OpenClaw、Codex、ACP 或其他原生代理运行时之间做选择
  - 你对状态或配置中的 provider/model/runtime 标签感到困惑
  - 你正在为原生 harness 记录支持一致性
---

**代理运行时** 是拥有一个已准备好的模型循环的组件：它接收提示、驱动模型输出、处理原生工具调用，并将完成的轮次返回给 OpenClaw。

运行时很容易与提供方混淆，因为它们都会出现在模型配置附近。它们属于不同层：

| Layer         | Examples                                     | What it means                                                       |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| Provider      | `openai`, `anthropic`, `github-copilot`      | OpenClaw 如何进行身份验证、发现模型，以及命名模型引用。            |
| Model         | `gpt-5.5`, `claude-opus-4-6`                 | 为代理轮次选择的模型。                                              |
| Agent runtime | `openclaw`, `codex`, `copilot`, `claude-cli` | 执行已准备轮次的底层循环或后端。                                    |
| Channel       | Telegram, Discord, Slack, WhatsApp           | 消息进入和离开 OpenClaw 的位置。                                    |

你还会在代码中看到 **harness** 这个词。Harness 是提供代理运行时的实现。
例如，内置的 Codex harness 实现了 `codex` 运行时。公开配置在 provider 或
model 条目上使用 `agentRuntime.id`；整代理 runtime 键是旧式写法，会被忽略。
`openclaw doctor --fix` 会移除旧的整代理 runtime 绑定，并在需要时将旧式 runtime
model 引用重写为规范的 provider/model 引用以及按模型范围的 runtime 策略。

运行时有两个家族：

- **嵌入式 harness** 在 OpenClaw 的已准备代理循环中运行。如今这包括
  内置的 `openclaw` 运行时，以及已注册的插件 harness，例如 `codex` 和 `copilot`。
- **CLI 后端** 在保留模型引用规范化的同时运行本地 CLI 进程。例如，
  `anthropic/claude-opus-4-8` 搭配按模型范围的 `agentRuntime.id: "claude-cli"`
  表示“选择 Anthropic 模型，通过 Claude CLI 执行”。`claude-cli` 不是嵌入式 harness id，
  不能传给 AgentHarness 选择。

`copilot` harness 是一个单独的、可选的外部插件 harness，用于 GitHub Copilot CLI；
有关 PI、Codex 和 GitHub Copilot 代理运行时之间的用户侧选择，请参见
[GitHub Copilot agent runtime](/plugins/copilot)。

## Codex 表面

大部分困惑都来自多个不同的表面共享了 Codex 这个名字：

| 表面                                          | OpenClaw 名称/配置                 | 作用                                                                                                           |
| ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 原生 Codex app-server 运行时                      | `openai/*` model refs                | 通过 Codex app-server 运行 OpenAI 嵌入式代理轮次。这是常见的 ChatGPT/Codex 订阅设置。                         |
| Codex OAuth 身份验证配置                         | `openai` OAuth profiles              | 存储 Codex app-server harness 所消费的 ChatGPT/Codex 订阅身份验证。                                          |
| Codex ACP 适配器                                | `runtime: "acp"`, `agentId: "codex"` | 通过外部 ACP/acpx 控制平面运行 Codex。仅在明确要求 ACP/acpx 时使用。                                          |
| 原生 Codex 聊天控制命令集                        | `/codex ...`                         | 从聊天中绑定、恢复、引导、停止并检查 Codex app-server 线程。                                                  |
| 面向非代理表面的 OpenAI Platform API 路由       | `openai/*` plus API-key auth         | 用于图像、嵌入、语音和实时等直接 OpenAI API。                                                                  |

这些表面是刻意相互独立的。启用 `codex` 插件会使原生 app-server 功能可用；
`openclaw doctor --fix` 负责旧版 Codex 路由修复和过期会话 pin 清理。将
`openai/*` 选作代理模型现在意味着“通过 Codex 运行它”，除非正在使用非代理的 OpenAI API 表面。

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

1. 如果用户要求 **Codex 绑定/控制/线程/恢复/引导/停止**，在捆绑的 `codex` 插件启用时，使用原生 `/codex` 命令表面。
2. 如果用户要求 **将 Codex 作为嵌入式运行时**，或者希望获得常规的基于订阅的 Codex 代理体验，使用 `openai/<model>`。
3. 如果用户明确选择 **OpenClaw 用于 OpenAI 模型**，保留模型引用为 `openai/<model>`，并将 provider/model 运行时策略设置为 `agentRuntime.id: "openclaw"`。选定的 `openai` OAuth 配置会在内部通过 OpenClaw 的 Codex-auth 传输路由。
4. 如果旧配置中仍然包含 **旧版 Codex 模型引用**，使用 `openclaw doctor --fix` 将其修复为 `openai/<model>`；doctor 会通过在旧模型引用暗示该路径的地方添加 provider/model 范围的 `agentRuntime.id: "codex"` 来保留 Codex 身份验证路由。
   旧的 **`codex-cli/*` 模型引用** 会修复为同样的 `openai/<model>` Codex app-server 路由；OpenClaw 不再保留捆绑的 Codex CLI 后端。
5. 如果用户明确说 **ACP**、**acpx** 或 **Codex ACP 适配器**，则使用 ACP，并设置 `runtime: "acp"` 和 `agentId: "codex"`。
6. 如果请求的是 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid** 或其他外部 harness，则使用 ACP/acpx，而不是原生子代理运行时。

| 你指的是...                             | 使用...                                       |
| --------------------------------------- | -------------------------------------------- |
| Codex app-server 聊天/线程控制         | 来自捆绑 `codex` 插件的 `/codex ...`        |
| Codex app-server 嵌入式代理运行时      | `openai/*` agent model refs                  |
| OpenAI Codex OAuth                      | `openai` OAuth profiles                      |
| Claude Code 或其他外部 harness         | ACP/acpx                                     |

关于 OpenAI 系列前缀拆分，请参见 [OpenAI](/providers/openai) 和
[模型提供方](/concepts/model-providers)。关于 Codex 运行时支持
契约，请参见 [Codex harness runtime](/plugins/codex-harness-runtime#v1-support-contract)。

## 运行时所有权

不同运行时拥有循环的不同部分。

| Surface                     | OpenClaw embedded                             | Codex app-server                                                            |
| --------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| Model loop owner            | 通过 OpenClaw embedded runner 的 OpenClaw    | Codex app-server                                                            |
| Canonical thread state      | OpenClaw transcript                           | Codex thread，以及 OpenClaw transcript 镜像                                   |
| OpenClaw dynamic tools      | 原生 OpenClaw 工具循环                         | 通过 Codex adapter 桥接                                                     |
| Native shell and file tools | OpenClaw 路径                                 | Codex 原生工具，在支持的情况下通过原生钩子桥接                               |
| Context engine              | 原生 OpenClaw 上下文组装                       | OpenClaw 将已组装上下文注入 Codex 轮次                                       |
| Compaction                  | OpenClaw 或所选上下文引擎                      | Codex 原生压缩，并带有 OpenClaw 通知和镜像维护                                |
| Channel delivery            | OpenClaw                                      | OpenClaw                                                                    |

这种所有权划分是主要设计规则：

- 如果 OpenClaw 拥有该表面，OpenClaw 就可以提供正常的插件钩子行为。
- 如果原生运行时拥有该表面，OpenClaw 就需要运行时事件或原生钩子。
- 如果原生运行时拥有规范线程状态，OpenClaw 应该镜像和投射上下文，而不是重写不受支持的内部实现。

## 运行时选择

OpenClaw 在 provider 和 model 解析之后选择一个嵌入式运行时：

1. 按模型范围的运行时策略优先。它可以位于已配置的 provider model 条目中，或位于 `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` 中。像 `agents.defaults.models["vllm/*"].agentRuntime` 这样的 provider 通配符会在精确模型策略之后应用，因此动态发现的 provider 模型可以共享一个运行时，而不会覆盖精确的逐模型例外。
2. 接下来是 provider 范围的运行时策略，位于 `models.providers.<provider>.agentRuntime`。
3. 在 `auto` 模式下，已注册的插件运行时可以声明支持的 provider/model 组合。
4. 如果在 `auto` 模式下没有运行时认领某个轮次，OpenClaw 会使用 `openclaw` 作为兼容运行时。当运行必须严格时，请使用显式的 runtime id。

整会话和整代理 runtime 绑定会被忽略。这包括
`OPENCLAW_AGENT_RUNTIME`、会话 `agentHarnessId`/`agentRuntimeOverride` 状态、
`agents.defaults.agentRuntime` 以及 `agents.list[].agentRuntime`。运行
`openclaw doctor --fix` 可移除过期的整代理 runtime 配置，并在 OpenClaw 能够保留意图时，
将旧式 runtime 模型引用转换过来。

显式的 provider/model 插件运行时会失败闭合。例如，
在 provider 或 model 上设置 `agentRuntime.id: "codex"` 表示 Codex，或者返回清晰的
选择/运行时错误；它绝不会静默路由回 OpenClaw。

CLI 后端别名与嵌入式 harness id 不同。推荐的 Claude CLI 形式是：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-8",
      models: {
        "anthropic/claude-opus-4-8": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

诸如 `claude-cli/claude-opus-4-7` 这样的旧式引用仍为兼容性保留支持，但新的配置应保持 provider/model 规范化，并将执行后端放在 provider/model runtime 策略中。

旧的 `codex-cli/*` 引用有所不同：doctor 会将它们迁移为 `openai/*`，这样它们会通过 Codex app-server harness 运行，而不是保留一个 Codex CLI 后端。

`auto` 模式对大多数 provider 都是刻意保守的。OpenAI agent
models 是例外：未设置 runtime 和 `auto` 都会解析为 Codex
harness。显式的 OpenClaw runtime 配置仍然是 `openai/*` agent 轮次的可选兼容路径；
当与选定的 `openai` OAuth 配置配对时，OpenClaw 会在内部通过 Codex-auth 传输路由该路径，
同时将公开模型引用保持为 `openai/*`。过期的 OpenAI runtime 会话 pin 会被运行时选择忽略，
并可使用 `openclaw doctor --fix` 清理。

如果 `openclaw doctor` 提示在 `codex` 插件已启用的同时
配置中仍保留旧版 Codex 模型引用，则应将其视为旧路由状态。运行
`openclaw doctor --fix` 将其重写为带有 Codex 运行时的 `openai/*`。

## GitHub Copilot agent runtime

外部 `@openclaw/copilot` 插件注册了一个可选择加入的 `copilot` 运行时，
该运行时由 GitHub Copilot CLI（`@github/copilot-sdk`）提供支持。它声明了
规范的订阅 `github-copilot` 提供商，并且**绝不会**被 `auto` 选中。可通过
`agentRuntime.id` 按模型或按提供商选择加入：

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

该 harness 在 `extensions/copilot/doctor-contract-api.ts` 中声明其提供方、运行时、CLI 会话键和 auth profile
前缀，`openclaw doctor` 会自动加载该文件。关于配置、身份验证、转录镜像、
压缩、声明式 doctor 契约，以及更广泛的 PI vs Codex vs
Copilot SDK 决策，请参见 [GitHub Copilot agent runtime](/plugins/copilot)。

## 兼容性契约

当一个运行时不是 OpenClaw 时，它应当说明 OpenClaw 暴露了哪些它支持的能力。
运行时文档请使用以下格式：

| 问题                                   | 重要原因                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Who owns the model loop?               | 决定重试、工具续接以及最终答案决策发生在哪里。                                                     |
| Who owns canonical thread history?     | 决定 OpenClaw 是否可以编辑历史，还是只能镜像它。                                                   |
| Do OpenClaw dynamic tools work?        | 消息、会话、cron，以及 OpenClaw 拥有的工具都依赖这一点。                                           |
| Do dynamic tool hooks work?            | 插件期望围绕 OpenClaw 拥有的工具存在 `before_tool_call`、`after_tool_call` 和中间件。             |
| Do native tool hooks work?             | Shell、patch 以及运行时拥有的工具需要原生 hook 支持，以便进行策略控制和观察。                     |
| Does the context engine lifecycle run? | 内存和上下文插件依赖 assemble、ingest、after-turn 和 compaction 生命周期。                         |
| What compaction data is exposed?       | 某些插件只需要通知，而另一些则需要保留/丢弃元数据。                                                 |
| What is intentionally unsupported?     | 用户不应假设 OpenClaw 等价于那些原生运行时拥有更多状态的场景。                                       |

Codex 运行时支持契约记录在
[Codex harness runtime](/plugins/codex-harness-runtime#v1-support-contract)。

## Status Tags

状态输出可能同时显示 `Execution` 和 `Runtime` 标签。请将它们视为诊断信息，而不是提供商名称。

- 例如，像 `openai/gpt-5.5` 这样的模型引用表示所选的提供商/模型。
- 像 `codex` 这样的运行时 ID 表示当前轮次由哪个循环执行。
- 像 Telegram 或 Discord 这样的通道标签表示对话发生的位置。

如果运行时仍然意外显示，首先检查所选提供商/模型的运行时策略。
旧版会话运行时是固定的，不再决定路由。

## 相关链接

- [Codex harness](/plugins/codex-harness)
- [Codex harness runtime](/plugins/codex-harness-runtime)
- [GitHub Copilot agent runtime](/plugins/copilot)
- [OpenAI](/providers/openai)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [Agent 循环](/concepts/agent-loop)
- [模型](/concepts/models)
- [状态](/cli/status)
