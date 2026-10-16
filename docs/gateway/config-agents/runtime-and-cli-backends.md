---
summary: "提供程序和模型的代理运行时策略、CLI 后端选择和 GPT-5 个性"
read_when:
  - "选择运行模型的harness"
  - "选择已注册的 CLI 后端"
  - "设置 OpenAI GPT-5 个性"
title: "配置 — 代理运行时和 CLI 后端"
---

运行时策略决定哪个工具执行模型运行。它依赖于提供者和模型，而不是 `agents.defaults`。

## <a id="runtime-policy"></a> 运行时策略

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: { id: "codex" },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-6-astra",
      models: {
        "anthropic/claude-opus-5": {
          agentRuntime: { id: "claude-cli" },
        },
        "vllm/*": {
          agentRuntime: { id: "openclaw" },
        },
      },
    },
  },
}
```

- `id`：`"auto"`、`"openclaw"`、已注册的插件 harness id，或受支持的 CLI 后端别名。内置的 Codex 插件注册了 `codex`；内置的 Anthropic 插件提供了 `claude-cli` CLI 后端。
- `id: "auto"` 允许注册的插件harness声明声明或以其他方式满足其支持合同的有效路由，并在没有harness匹配时使用 OpenClaw。诸如 `id: "codex"` 之类的显式插件运行时需要该工具和兼容的有效路径；如果其中一个不可用或执行失败，它将停止并出现错误。
- `id: "pi"` 仅作为 `openclaw` 的弃用别名接受，用于保留 v2026.5.22 及更早版本中已发布的配置。新配置应使用 `openclaw`。
- 运行时优先级依次为：精确模型策略（`agents.entries.*.models["provider/model"]`、`agents.defaults.models["provider/model"]` 或 `models.providers.<provider>.models[]`），然后是 `agents.entries.*` / `agents.defaults.models["provider/*"]`，最后是 provider 范围的策略 `models.providers.<provider>.agentRuntime`。
- 整个 agent 级别的运行时键已弃用。运行时选择会忽略 `agents.defaults.agentRuntime`、`agents.entries.*.agentRuntime`、会话运行时固定值以及 `OPENCLAW_AGENT_RUNTIME`。运行 `openclaw doctor --fix` 可移除过时值。
- E 没有编写请求覆盖的精确官方 HTTPS OpenAI Responses/ChatGPT 路由可以隐式使用 Codex harness。 Provider/model `agentRuntime.id: "codex"` 需要 Codex 并且拒绝在没有它的情况下运行，但不会使不兼容的路由兼容。
- 对于 Claude CLI 部署，首选 `model: "anthropic/claude-opus-5-5"` 加上模型范围的 `agentRuntime.id: "claude-cli"`。旧版 `claude-cli/<model>` 引用仍然适用于兼容性，但新配置应使用标准 provider/model ID 并将执行后端置于 provider/model 运行时策略中。
- 这控制文本代理轮流和免工具实用程序完成，包括会话摘要、进度叙述和工具调用标题。媒体生成、视觉、PDF、音乐、视频和 TTS 仍使用其 provider/model 设置。

**内置别名快捷方式**（仅在模型位于 `agents.defaults.models` 中时适用）：

| 别名               | 模型                          |
| ------------------- | ------------------------------ |
| `opus`              | `anthropic/claude-opus-5-5`    |
| `sonnet`            | `anthropic/claude-sonnet-5-5`  |
| `gpt`               | `openai/gpt-5.4`               |
| `gpt-mini`          | `openai/gpt-5.4-mini`          |
| `gpt-nano`          | `openai/gpt-5.4-nano`          |
| `gemini`            | `google/gemini-4-argon`        |
| `gemini-flash`      | `google/gemini-3.8-flash`      |
| `gemini-flash-lite` | `google/gemini-3.5-flash-lite` |

你配置的别名始终优先于默认值。

Z.AI GLM-4.x 模型会自动启用思考模式，除非你设置 `--thinking off`，或者自行定义 `agents.defaults.models["zai/<model>"].params.thinking`。 Z.AI 模型默认会为工具调用流式传输启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设为 `false` 可将其禁用。 Anthropic Claude Opus 4.8 在 OpenClaw 中默认关闭思考；当显式启用自适应思考时，Anthropic 的 provider 自有 effort 默认值为 `high`。Claude 4.6 模型在未设置明确思考级别时默认使用 `adaptive`

## <a id="cli-backend-selection"></a> CLI 后端选择

CLI 适配器机制由插件注册，而不是在代理默认设置下配置。使用模型范围的 `agentRuntime.id` 选择已注册的 CLI 后端，如上所示。有关操作，请参阅 [CLI 后端](/gateway/cli-backends)；有关命令、会话、图像和解析器注册，请参阅 [构建 CLI 后端插件](/plugins/cli-backend-plugins)。

## <a id="openai-gpt-5-personality"></a> OpenAI GPT-5 个性

捆绑的 OpenAI 插件拥有 GPT-5 友好的交互风格设置。匹配GPT-5-family提示接收共享行为合约； `personality` 仅控制友好样式层。本机 Codex 应用程序服务器路由保留 Codex- 拥有的 base/model 指令，而不是 OpenClaw GPT-5 贡献，并且 OpenClaw 禁用 Codex 的本机线程的内置特性。

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "friendly", // friendly | on | off
        },
      },
    },
  },
}
```

- `"friendly"`（默认）和`"on"`启用友好交互风格层。
- `"off"`仅禁用友好层；带标签的 GPT-5 行为契约仍保持启用状态。

有关提供程序和本机 Codex 行为，请参阅 [OpenAI GPT-5 提示贡献](/providers/openai/advanced#gpt-5-prompt-contribution)。
