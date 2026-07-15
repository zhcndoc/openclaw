---
summary: "OpenClaw 如何区分模型提供方、模型、通道和代理运行时"
title: "代理运行时"
read_when:
  - 你正在在 OpenClaw、Codex、ACP 或其他原生代理运行时之间做选择
  - 你对状态或配置中的 provider/model/runtime 标签感到困惑
  - 你正在为原生 harness 记录支持一致性
---

**代理运行时**负责一个已准备好的模型循环：它接收提示词，
驱动模型输出，处理原生工具调用，并将完成的轮次返回给 OpenClaw。

运行时很容易与提供方混淆，因为它们都会出现在模型配置附近。它们属于不同层：

| 层            | 示例                                         | 含义                                                                |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| Provider      | `anthropic`, `github-copilot`, `openai`      | OpenClaw 如何进行身份验证、发现模型以及命名模型引用。 |
| Model         | `claude-opus-4-6`, `gpt-5.6-sol`             | 为代理轮次选择的模型。                              |
| Agent runtime | `claude-cli`, `codex`, `copilot`, `openclaw` | 执行已准备轮次的底层循环或后端。      |
| Channel       | Discord, Slack, Telegram, WhatsApp           | 消息进入和离开 OpenClaw 的位置。                            |

**harness** 是提供代理运行时的实现（代码术语）。例如，内置的 Codex harness 实现了 `codex` 运行时。公开配置在 provider 或 model 条目上使用 `agentRuntime.id`；整代理运行时键属于旧式配置并会被忽略。`openclaw doctor --fix` 会移除旧的整代理运行时固定项，并在需要时将旧式运行时模型引用重写为规范的 provider/model 引用以及按模型作用域的运行时策略。

有两类运行时：

- **嵌入式 harness** 在 OpenClaw 的已准备代理循环中运行：内置的 `openclaw` 运行时，以及已注册的插件 harness，例如 `codex` 和 `copilot`。
- **CLI 后端** 在保留模型引用规范化的同时运行本地 CLI 进程。例如，`anthropic/claude-opus-4-8` 配合按模型作用域的 `agentRuntime.id: "claude-cli"` 表示“选择 Anthropic 模型，通过 Claude CLI 执行”。`claude-cli` 不是嵌入式 harness id，且不得传递给 AgentHarness 选择。

`copilot` harness 是一个独立的、可选的外部插件 harness，用于 GitHub Copilot CLI；有关 PI、Codex 和 GitHub Copilot 代理运行时之间面向用户的决策，请参见 [GitHub Copilot agent runtime](/plugins/copilot)。

## Codex 表面

Several surfaces share the Codex name:

| 表面                                          | OpenClaw 名称/配置                 | 作用                                                                                                           |
| ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 原生 Codex app-server 运行时                  | `openai/*` model refs                | 通过 Codex app-server 运行 OpenAI 嵌入式代理轮次。这是常见的 ChatGPT/Codex 订阅设置。 |
| Codex OAuth 认证配置文件                      | `openai` OAuth profiles              | 存储 Codex app-server harness 使用的 ChatGPT/Codex 订阅认证信息。                             |
| Codex ACP 适配器                                | `runtime: "acp"`, `agentId: "codex"` | 通过外部 ACP/acpx 控制平面运行 Codex。仅在明确要求 ACP/acpx 时使用。        |
| 原生 Codex 聊天控制命令集                      | `/codex ...`                         | 从聊天中绑定、恢复、引导、停止并检查 Codex app-server 线程。                                |
| OpenAI Platform API 路由（用于非代理表面） | `openai/*` plus API-key auth         | 直接 OpenAI API，例如图像、嵌入、语音和实时。                                           |

These surfaces are intentionally independent. Enabling the `codex` plugin
makes native app-server features available; `openclaw doctor --fix` owns
legacy Codex route repair and stale session pin cleanup. Selecting `openai/*`
for an agent model now means "run this through Codex" unless a non-agent
OpenAI API surface is being used.

常见的 ChatGPT/Codex 订阅设置使用 Codex OAuth 进行认证，但将模型 ref 保持为 `openai/*`，并选择 `codex` 运行时：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.6-sol",
    },
  },
}
```

这意味着 OpenClaw 先选择一个 OpenAI model ref，然后让 Codex app-server 运行时执行这个嵌入式代理轮次。它并不意味着“使用 API 计费”，也不意味着通道、模型提供方目录或 OpenClaw 会话存储会变成 Codex。

When the bundled `codex` plugin is enabled, use the native `/codex` command
surface (`/codex bind`, `/codex threads`, `/codex resume`, `/codex steer`,
`/codex stop`) for natural-language Codex control instead of ACP. Use ACP for
Codex only when the user explicitly asks for ACP/acpx or is testing the ACP
adapter path. Claude Code, Gemini CLI, OpenCode, Cursor, and similar external
harnesses still use ACP.

Decision tree:

1. **Codex bind/control/thread/resume/steer/stop** -> 在启用捆绑 `codex` 插件时，使用原生 `/codex` 命令表面。
2. **Codex as the embedded runtime** or the normal subscription-backed Codex agent experience -> `openai/<model>`.
3. **OpenClaw explicitly chosen for an OpenAI model** -> 保持 model ref 为 `openai/<model>`，并将 provider/model 运行时策略设置为 `agentRuntime.id: "openclaw"`。选中的 `openai` OAuth profile 会在内部通过 OpenClaw 的 Codex-auth 传输路由。
4. **Legacy Codex model refs in config** -> 使用 `openclaw doctor --fix` 修复为 `openai/<model>`；doctor 会通过在旧 model ref 隐含的位置添加 provider/model 作用域的 `agentRuntime.id: "codex"` 来保留 Codex 认证路由。旧的 **`codex-cli/*`** model refs 会修复为相同的 `openai/<model>` Codex app-server 路由；OpenClaw 不再保留捆绑的 Codex CLI 后端。
5. **ACP, acpx, or Codex ACP adapter explicitly requested** -> `runtime: "acp"` and `agentId: "codex"`.
6. **Claude Code, Gemini CLI, OpenCode, Cursor, Droid, or another external harness** -> ACP/acpx，而不是原生子代理运行时。

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

不同的运行时拥有循环的不同部分：

| 表面                     | OpenClaw 嵌入式                              | Codex 应用服务器                                                            |
| ------------------------ | ------------------------------------------- | --------------------------------------------------------------------------- |
| 模型循环所有者            | OpenClaw，通过 OpenClaw 嵌入式运行器          | Codex 应用服务器                                                            |
| 规范线程状态              | OpenClaw 对话记录                           | Codex 线程，以及 OpenClaw 对话记录镜像                                         |
| OpenClaw 动态工具         | 原生 OpenClaw 工具循环                       | 通过 Codex 适配器桥接                                                      |
| 原生 shell 和文件工具     | OpenClaw 路径                               | Codex 原生工具，在支持的情况下通过原生钩子桥接                               |
| 上下文引擎                | 原生 OpenClaw 上下文组装                     | OpenClaw 项目将上下文组装到 Codex 回合中                                     |
| 压缩                      | OpenClaw 或选定的上下文引擎                  | Codex 原生压缩，并带有 OpenClaw 通知和镜像维护                               |
| 通道传递                  | OpenClaw                                       | OpenClaw                                                                    |

设计规则：如果 OpenClaw 拥有该表面，它可以提供正常的插件钩子行为。如果原生运行时拥有该表面，OpenClaw 需要运行时事件或原生钩子。如果原生运行时拥有规范线程状态，OpenClaw 会镜像并投射上下文，而不是重写不受支持的内部机制。

## 运行时选择

OpenClaw 在提供者和模型解析之后按以下顺序解析嵌入式运行时：

1. **模型作用域的运行时策略** 优先。它位于已配置的提供者模型条目中，或位于 `agents.defaults.models["provider/model"].agentRuntime`
   / `agents.list[].models["provider/model"].agentRuntime` 中。像 `agents.defaults.models["vllm/*"].agentRuntime` 这样的提供者通配符会在精确模型策略之后应用，因此动态发现的提供者模型可以共享一个运行时，而不会覆盖精确的逐模型例外。
2. **提供者作用域的运行时策略**：`models.providers.<provider>.agentRuntime`。
3. **`auto` 模式**：已注册的插件运行时可以声明其支持的提供者/模型对。
4. 如果在 `auto` 模式下没有任何项接手该轮次，OpenClaw 会回退到 `openclaw` 作为兼容运行时。若运行必须严格执行，请使用显式运行时 id。

整个会话和整个代理的运行时固定配置会被忽略：`OPENCLAW_AGENT_RUNTIME`、会话 `agentHarnessId`/`agentRuntimeOverride` 状态、`agents.defaults.agentRuntime`，以及 `agents.list[].agentRuntime`。运行 `openclaw doctor --fix` 以移除过时的整代理运行时配置，并在意图可以保留时转换旧版运行时模型引用。

显式的提供者/模型插件运行时是“失败即关闭”的：在提供者或模型上设置 `agentRuntime.id: "codex"` 表示 Codex，或明确的选择/运行时错误——它绝不会静默路由回 OpenClaw。只有 `auto` 才可能将不匹配的轮次路由到 OpenClaw。

CLI 后端别名与嵌入式 harness ids 不同。首选的 Claude CLI 形式如下：

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

像 `claude-cli/claude-opus-4-7` 这样的旧引用仍受支持以保持兼容性，但新配置应保持 provider/model 的规范形式，并将执行后端放入 provider/model 运行时策略中。

旧的 `codex-cli/*` 引用有所不同：doctor 会将它们迁移到 `openai/*`，使其通过 Codex app-server harness 运行，而不是保留一个 Codex CLI 后端。

`auto` 模式对大多数提供者有意保持保守。OpenAI 代理模型是例外：未设置运行时和 `auto` 都会解析到 Codex harness。显式的 OpenClaw 运行时配置仍然是 `openai/*` 代理轮次的可选兼容路径；当与已选择的 `openai` OAuth 配置文件配对时，OpenClaw 会通过 Codex-auth 传输在内部路由该路径，同时将公开模型引用保持为 `openai/*`。过时的 OpenAI 运行时会话固定值会被运行时选择忽略，并可通过 `openclaw doctor --fix` 清理。

如果 `openclaw doctor` 提示在保留旧版 Codex 模型引用的同时已启用 `codex` 插件，请将其视为旧路由状态，并运行 `openclaw doctor --fix` 将其重写为带有 Codex 运行时的 `openai/*`。

## GitHub Copilot 代理运行时

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

该 harness 会在 `extensions/copilot/doctor-contract-api.ts` 中声明其提供商、运行时、CLI 会话键以及认证配置文件前缀，  
`openclaw doctor` 会自动加载该文件。有关配置、认证、转录镜像、压缩、声明式 doctor 合同，以及  
PI、Codex 与 Copilot SDK 之间更广泛的决策，请参见 [GitHub Copilot 代理运行时](/plugins/copilot)。

## 兼容性契约

当运行时不是 OpenClaw 时，其文档应说明它支持哪些 OpenClaw 表面：

| 问题                                   | 重要原因                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 谁拥有模型循环？               | 决定重试、工具续接以及最终答案决策发生在哪里。                   |
| 谁拥有规范线程历史？     | 决定 OpenClaw 是否可以编辑历史，还是只能镜像它。                                   |
| OpenClaw 动态工具是否可用？        | 消息、会话、cron 以及 OpenClaw 拥有的工具都依赖这一点。                                 |
| 动态工具钩子是否可用？        | 插件期望 `before_tool_call`、`after_tool_call` 以及围绕 OpenClaw 拥有工具的中间件。 |
| 原生工具钩子是否可用？             | Shell、patch 以及运行时拥有的工具需要原生钩子支持以进行策略和观察。        |
| 上下文引擎生命周期是否运行？ | 内存和上下文插件依赖 assemble、ingest、after-turn 和 compaction 生命周期。      |
| 暴露了哪些压缩数据？       | 一些插件只需要通知；另一些需要保留/丢弃元数据。                          |
| 哪些内容是有意不支持的？     | 用户不应假定在原生运行时拥有更多状态的情况下与 OpenClaw 等价。            |

Codex 运行时支持契约记录在
[Codex harness runtime](/plugins/codex-harness-runtime#v1-support-contract)。

## 状态标签

状态输出可以同时显示 `Execution` 和 `Runtime` 标签。请将它们视为诊断信息，而不是提供方名称：

- A model ref such as `openai/gpt-5.6-sol` is the selected provider/model.
- A runtime id such as `codex` is the loop executing the turn.
- A channel label such as Telegram or Discord is where the conversation is happening.

如果一次运行显示了意外的运行时，请先检查所选提供方/模型的运行时策略。旧版会话运行时固定值不再决定路由。

## 相关链接

- [Codex harness](/plugins/codex-harness)
- [Codex harness 运行时](/plugins/codex-harness-runtime)
- [GitHub Copilot 代理运行时](/plugins/copilot)
- [OpenAI](/providers/openai)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [Agent 循环](/concepts/agent-loop)
- [模型](/concepts/models)
- [状态](/cli/status)
