---
summary: "使用 GMI Cloud 的 OpenAI- 兼容 API 和 OpenClaw"
read_when:
  - "您想要使用 GMI Cloud 模型运行 OpenClaw"
  - "你需要 GMI 提供方 id、密钥或端点"
title: "GMI Cloud"
---

GMI Cloud 是一个托管推理平台，适用于 OpenAI- 兼容的 API 背后的前沿和开放权重模型。在 OpenClaw 中，它是一个官方的外部提供程序插件：安装一次，通过普通模型身份验证存储凭据，并使用像 `gmi/openai/gpt-5.6-sol` 这样的模型引用。

当你希望用一个 API 密钥访问多个托管模型系列时，可以使用 GMI，包括 Anthropic、DeepSeek、Google、Moonshot、OpenAI 和 Z.AI 等由 GMI 目录暴露的路由。它可作为模型回退的次级提供方，用于比较不同厂商之间的托管路由，或在 GMI 已提供某个模型而你的主提供方尚未提供时使用。OpenClaw 负责提供方 id、认证配置文件、别名、 模型目录种子和基础 URL；GMI 负责实时模型可用性、计费、 速率限制以及任何提供方侧路由策略。

| 属性      | 值                                    |
| ------------- | ---------------------------------------- |
| 提供方 id   | `gmi`（别名：`gmi-cloud`、`gmicloud`） |
| 包裹       | `@openclaw/gmi-provider`                 |
| 认证环境变量  | `GMI_API_KEY`                            |
| API           | OpenAI-兼容（`openai-completions`） |
| 基础 URL      | `https://api.gmi-serving.com/v1`         |
| 默认模型 | `gmi/openai/gpt-5.6-sol`                 |

## <a id="setup"></a> 设置

安装插件，然后在 GMI Cloud （`https://www.gmicloud.ai/`） 中创建 API 密钥：

```bash
openclaw plugins install @openclaw/gmi-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

然后运行：

```bash
openclaw onboard --auth-choice gmi-api-key
```

对于脚本或 CI 安装，请在命令行中传入所有参数：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice gmi-api-key \
  --gmi-api-key "$GMI_API_KEY"
```

或者在环境中设置密钥：

```bash
export GMI_API_KEY="<your-gmi-api-key>" # pragma: allowlist secret
```

## <a id="when-to-choose-gmi"></a> 何时选择 GMI

- 您需要托管的 OpenAI- 兼容端点，而不是本地模型服务器。
- 你希望通过一个提供商账号尝试多个商业和开源权重模型系列。
- 您需要一个具有来自 DeepInfra、OpenRouter、Together 或直接供应商 API 的不同上游路由的后备提供程序。
- 您需要 GMI- 特定模型 ID、定价或帐户控制。

当您需要 GMI 未通过其 OpenAI- 兼容路由公开的供应商本机功能时，请选择直接供应商提供商。当数据本地化或本地 GPU 控制比托管便利性更重要时，请选择本地提供商，例如 LM Studio、Ollama、SGLang 或 vLLM。

## <a id="models"></a> 模型

插件目录种子常用 GMI Cloud 路由 ID：

| 模型引用                          | 输入        | 上下文   | 最大输出 |
| ---------------------------------- | ------------ | --------- | ---------- |
| `gmi/anthropic/claude-sonnet-5`    | 文本 + 图像 | 409,600   | 128,000    |
| `gmi/deepseek-ai/DeepSeek-V4-Pro`  | 文本         | 1,048,576 | 384,000    |
| `gmi/google/gemini-3.5-flash-lite` | 文本 + 图像 | 1,048,576 | 65,536     |
| `gmi/openai/gpt-5.6-sol`           | 文本 + 图像 | 1,050,000 | 128,000    |
| `gmi/zai-org/GLM-5.2-FP8`          | 文本         | 1,048,576 | 128,000    |

目录只是一个种子，并不保证每个账号在任何时候都能调用每个模型。请列出你环境中配置的提供方所报告的内容：

```bash
openclaw models list --provider gmi
```

## <a id="troubleshooting"></a> 故障排查

- `401` 或 `403`：检查运行 OpenClaw 的进程是否设置了 `GMI_API_KEY`，或重新运行 onboarding 将密钥存入提供方认证配置文件。
- 未知模型错误：确认您的 GMI 帐户中存在该模型，并使用 `openclaw models list --provider gmi` 显示的完整 `gmi/<route-id>` 参考。
- 间歇性提供方错误：尝试不同的 GMI 路由，或将 GMI 配置为备用项，而不是唯一的主模型提供方。

## <a id="related"></a> 相关内容

- [模型提供商](/concepts/model-providers)
- [所有提供方](/providers/index)
