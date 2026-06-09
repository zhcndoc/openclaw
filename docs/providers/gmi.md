---
summary: "使用 GMI Cloud 的 OpenAI 兼容 API 搭配 OpenClaw"
read_when:
  - 你想使用 GMI Cloud 模型运行 OpenClaw
  - 你需要 GMI 提供方 id、密钥或端点
title: "GMI Cloud"
---

GMI Cloud 是一个托管推理平台，提供面向前沿模型和开源权重模型的
OpenAI 兼容 API。在 OpenClaw 中，它是一个捆绑的模型提供方，
这意味着你可以使用提供方 id `gmi` 来选择它，通过常规模型认证保存凭据，
并使用类似 `gmi/google/gemini-3.1-flash-lite` 的模型引用。

当你希望用一个 API 密钥访问多个托管模型系列时，可以使用 GMI，包括
Google、Anthropic、OpenAI、DeepSeek、Moonshot，以及 GMI 目录中公开的 Z.AI 路由。
当你需要一个备用提供方用于模型回退、比较不同供应商的托管路由，
或者当 GMI 比你的主提供方更早提供某个模型时，它会很有用。

此提供方使用与 OpenAI 兼容的聊天语义。OpenClaw 负责提供方
id、认证配置文件、别名、模型目录种子和基础 URL；GMI 负责实时
模型可用性、计费、速率限制以及任何提供方侧的路由策略。

## 设置

在 GMI Cloud 中创建一个 API 密钥，然后运行：

```bash
openclaw onboard --auth-choice gmi-api-key
```

或者设置：

```bash
export GMI_API_KEY="<your-gmi-api-key>" # pragma: allowlist secret
```

## 默认值

- 提供方：`gmi`
- 别名：`gmi-cloud`, `gmicloud`
- 基础 URL：`https://api.gmi-serving.com/v1`
- 环境变量：`GMI_API_KEY`
- 默认模型：`gmi/google/gemini-3.1-flash-lite`

## 何时选择 GMI

- 你想要一个托管的 OpenAI 兼容端点，而不是本地模型服务器。
- 你想通过一个提供方账户尝试多个商业和开源权重模型系列。
- 你想要一个备用提供方，其上游路由与 OpenRouter、
  DeepInfra、Together 或直接供应商 API 不同。
- 你需要 GMI 特定的模型 id、定价或账户控制。

如果你需要 GMI 没有通过其 OpenAI 兼容路由公开的供应商原生功能，
请改用直接的供应商提供方。当数据本地性或本地
GPU 控制比托管便利性更重要时，请使用本地提供方，例如 Ollama、LM Studio、vLLM 或 SGLang。

## 模型

捆绑目录种子包含 GMI Cloud 常见可用的路由 id，包括：

- `gmi/zai-org/GLM-5.1-FP8`
- `gmi/deepseek-ai/DeepSeek-V3.2`
- `gmi/moonshotai/Kimi-K2.5`
- `gmi/google/gemini-3.1-flash-lite`
- `gmi/anthropic/claude-sonnet-4.6`
- `gmi/openai/gpt-5.4`

该目录种子并不保证每个账户在任何时候都能调用每个模型。请使用 OpenClaw 的模型列表命令，
查看你环境中已配置提供方报告的内容：

```bash
openclaw models list --provider gmi
```

## 故障排查

- `401` 或 `403`：检查运行 OpenClaw 的进程是否设置了 `GMI_API_KEY`，或重新运行 onboarding 将密钥存入提供方认证配置文件。
- 未知模型错误：确认该模型存在于你的 GMI 账户中，并使用 `openclaw models list --provider gmi` 显示的完整 `gmi/<route-id>` 引用。
- 间歇性提供方错误：尝试不同的 GMI 路由，或将 GMI 配置为备用项，而不是唯一的主模型提供方。

## 相关内容

- [模型提供方](/concepts/model-providers)
- [所有提供方](/providers/index)
