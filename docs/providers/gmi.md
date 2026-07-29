---
summary: "使用 GMI Cloud 的 OpenAI 兼容 API 搭配 OpenClaw"
read_when:
  - 你想使用 GMI Cloud 模型运行 OpenClaw
  - 你需要 GMI 提供方 id、密钥或端点
title: "GMI Cloud"
---

GMI Cloud is a hosted inference platform for frontier and open-weight models
behind an OpenAI-compatible API. In OpenClaw it is an official external provider
plugin: install it once, store credentials through normal model auth, and use
model refs like `gmi/openai/gpt-5.6-sol`.

当你希望用一个 API 密钥访问多个托管模型系列时，可以使用 GMI，包括
Anthropic、DeepSeek、Google、Moonshot、OpenAI 和 Z.AI 等由 GMI 目录
暴露的路由。它可作为模型回退的次级提供方，用于比较
不同厂商之间的托管路由，或在 GMI 已提供某个模型而你的
主提供方尚未提供时使用。OpenClaw 负责提供方 id、认证配置文件、别名、
模型目录种子和基础 URL；GMI 负责实时模型可用性、计费、
速率限制以及任何提供方侧路由策略。

| Property      | Value                                    |
| ------------- | ---------------------------------------- |
| Provider id   | `gmi` (aliases: `gmi-cloud`, `gmicloud`) |
| Package       | `@openclaw/gmi-provider`                 |
| Auth env var  | `GMI_API_KEY`                            |
| API           | OpenAI-compatible (`openai-completions`) |
| Base URL      | `https://api.gmi-serving.com/v1`         |
| Default model | `gmi/openai/gpt-5.6-sol`                 |

## 设置

安装插件，重启网关，然后在 GMI Cloud
（`https://www.gmicloud.ai/`）中创建一个 API key：

```bash
openclaw plugins install @openclaw/gmi-provider
openclaw gateway restart
```

然后运行：

```bash
openclaw onboard --auth-choice gmi-api-key
```

非交互式设置可以传入 `--gmi-api-key <key>`，或设置：

```bash
export GMI_API_KEY="<your-gmi-api-key>" # pragma: allowlist secret
```

## 何时选择 GMI

- 你需要的是托管的 OpenAI 兼容端点，而不是本地模型服务器。
- 你希望通过一个提供商账号尝试多个商业和开源权重模型系列。
- 你需要一个备用提供商，其上游路由不同于 DeepInfra、OpenRouter、Together 或直接的供应商 API。
- 你需要 GMI 特定的模型 ID、定价或账户控制。

当你需要 GMI 通过其 OpenAI 兼容路径无法提供的供应商原生功能时，请改为选择直接的供应商提供商。当数据本地性或本地 GPU 控制比托管带来的便利更重要时，请选择本地提供商，例如 LM Studio、Ollama、SGLang 或 vLLM。

## 模型

插件目录种子通常可用的 GMI Cloud 路由 ID：

| Model ref                          | Input        | Context   | Max output |
| ---------------------------------- | ------------ | --------- | ---------- |
| `gmi/anthropic/claude-sonnet-5`    | text + image | 409,600   | 128,000    |
| `gmi/deepseek-ai/DeepSeek-V4-Pro`  | text         | 1,048,576 | 384,000    |
| `gmi/google/gemini-3.5-flash-lite` | text + image | 1,048,576 | 65,536     |
| `gmi/openai/gpt-5.6-sol`           | text + image | 1,050,000 | 128,000    |
| `gmi/zai-org/GLM-5.2-FP8`          | text         | 1,048,576 | 128,000    |

目录只是一个种子，并不保证每个账号在任何时候都能调用每个模型。请列出你环境中配置的提供方所报告的内容：

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
