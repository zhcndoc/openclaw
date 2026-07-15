---
summary: "Featherless AI 设置、模型选择和工具调用"
title: "Featherless AI"
read_when:
  - 你想将 Featherless AI 与 OpenClaw 一起使用
  - 你需要 Featherless API 密钥环境变量或模型引用格式
---

[Featherless AI](https://featherless.ai) 通过一个
与 OpenAI 兼容的 API 提供开放模型。OpenClaw 将 Featherless 作为官方外部
提供方插件安装，并在运行时接受来自 Featherless 的精确
模型 ID，同时保持内置目录较小。

| Property        | Value                                    |
| --------------- | ---------------------------------------- |
| Provider id     | `featherless`                            |
| Package         | `@openclaw/featherless-provider`         |
| Auth env var    | `FEATHERLESS_API_KEY`                    |
| Onboarding flag | `--auth-choice featherless-api-key`      |
| Direct CLI flag | `--featherless-api-key <key>`            |
| API             | 与 OpenAI 兼容（`openai-completions`）    |
| Base URL        | `https://api.featherless.ai/v1`          |
| Default model   | `featherless/Qwen/Qwen3-32B`             |

## 设置

安装插件并重启 Gateway：

```bash
openclaw plugins install @openclaw/featherless-provider
openclaw gateway restart
```

运行引导：

```bash
openclaw onboard --auth-choice featherless-api-key
```

对于非交互式设置：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice featherless-api-key \
  --featherless-api-key "$FEATHERLESS_API_KEY"
```

或者将密钥暴露给 Gateway 进程：

```bash
export FEATHERLESS_API_KEY="<your-featherless-api-key>" # pragma: allowlist secret
```

验证提供程序：

```bash
openclaw models list --provider featherless
```

## 默认模型

该插件使用 `Qwen/Qwen3-32B` 作为默认设置，因为 Featherless 为 Qwen 3 系列提供原生工具调用支持。OpenClaw 配置了其 32,768-token 的上下文窗口、保守的 4,096-token 输出上限，以及 Qwen 聊天模板的思考控制。

目录中的成本字段为零，因为 Featherless 支持多种计费模式，而 OpenClaw 不会嵌入特定账户的套餐或请求定价费率。

## 其他 Featherless 模型

在 `featherless/` 提供商前缀后使用完整且准确的 Featherless 模型 id：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "featherless/moonshotai/Kimi-K2-Instruct",
      },
    },
  },
}
```

OpenClaw 有意不会将 Featherless 的完整公开模型索引复制到选择器中。该索引非常庞大，而且没有暴露足够结构化的能力元数据，无法安全地对每个文本、视觉、嵌入和推理模型进行分类。因此，未知的 id 会使用保守的仅文本、非推理默认值：4,096 个 token 的上下文窗口和 1,024 个 token 的输出上限。

当某个模型需要不同的元数据时，请添加显式的提供商模型条目：

```json5
{
  models: {
    mode: "merge",
    providers: {
      featherless: {
        baseUrl: "https://api.featherless.ai/v1",
        apiKey: "${FEATHERLESS_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "google/gemma-3-27b-it",
            name: "Gemma 3 27B",
            input: ["text", "image"],
            reasoning: false,
            contextWindow: 32768,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
}
```

在添加自定义元数据之前，请查看 Featherless 的模型目录，确认当前模型可用性和能力标签。

## 故障排查

- `401` 或 `403`：确认 `FEATHERLESS_API_KEY` 对 Gateway 进程可见，或者重新运行引导流程。
- 未知模型：使用 Featherless 在 `featherless/` 前缀后提供的、严格区分大小写的 id。
- 工具调用被作为文本返回：选择 Featherless 文档中支持原生函数调用的模型系列，例如 Qwen 3。
- 托管 Gateway 无法看到密钥：将其放入 `~/.openclaw/.env` 或服务加载的其他环境来源中，然后重启 Gateway。

## 相关内容

- [模型提供商](/concepts/model-providers)
- [所有提供商](/providers/index)
- [思考模式](/tools/thinking)
