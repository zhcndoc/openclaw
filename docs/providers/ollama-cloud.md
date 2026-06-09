---
summary: "直接使用 Ollama Cloud 与 OpenClaw"
read_when:
  - 你想在没有本地 Ollama 服务器的情况下使用托管的 Ollama 模型
  - 你需要 `ollama-cloud` 提供方 ID、密钥或端点
title: "Ollama Cloud"
---

Ollama Cloud 是 Ollama 的托管模型 API。它让 OpenClaw 可以直接调用由 Ollama 托管的
模型，而无需安装本地 Ollama 服务器，或将本地的 Ollama 应用切换到云模式。使用提供方 ID `ollama-cloud` 和类似
`ollama-cloud/kimi-k2.6` 的模型引用。

本页适用于直接的纯云路由。该提供方使用 Ollama 原生的
`/api/chat` 风格，而不是与 OpenAI 兼容的 `/v1` 路由。OpenClaw 将其注册为一个独立的提供方 ID，因此纯云凭据、实时目录发现和
模型选择不会与本地 `ollama` 主机混在一起。

当你想要纯云路由时，请使用本页。对于本地 Ollama、混合
云加本地路由、嵌入以及自定义主机详情，请参见
[Ollama](/providers/ollama)。

## 设置

在 [ollama.com/settings/keys](https://ollama.com/settings/keys) 创建一个 Ollama Cloud API 密钥，然后运行：

```bash
openclaw onboard --auth-choice ollama-cloud
```

或者设置：

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret
```

## 默认值

- 提供方：`ollama-cloud`
- 基础 URL：`https://ollama.com`
- 环境变量：`OLLAMA_API_KEY`
- API 风格：Ollama 原生 `/api/chat`
- 示例模型：`ollama-cloud/kimi-k2.6`

## 何时选择 Ollama Cloud

- 你想在不本地运行 `ollama serve` 的情况下使用托管的 Ollama 模型。
- 你希望使用与 OpenClaw 在本地 Ollama 上相同的原生 Ollama 聊天 API 形状，但指向 `https://ollama.com`。
- 你需要一个简单的云端路径来使用已经位于 Ollama 托管目录中的模型。
- 你不需要本地模型拉取、本地 GPU 控制或仅限局域网的推理。

当你想要通过已登录的 Ollama 主机进行仅本地或云加本地路由时，请改用 [Ollama](/providers/ollama)。当你需要 `/v1/chat/completions`
语义或提供方特定的 OpenAI 风格功能时，请改用 OpenAI 兼容的提供方。

## 模型

OpenClaw 会从实时托管目录中发现 Ollama Cloud 模型。常见的
可用托管 ID 包括：

- `ollama-cloud/gpt-oss:20b`
- `ollama-cloud/kimi-k2.6`
- `ollama-cloud/deepseek-v4-flash`
- `ollama-cloud/minimax-m2.7`
- `ollama-cloud/glm-5`

使用你当前托管目录中的一个模型 ID：

```bash
openclaw models list --provider ollama-cloud
openclaw models set ollama-cloud/kimi-k2.6
```

模型 ID 是云目录 ID，而不是本地拉取名称。如果某个模型名称在
本地 Ollama 主机中可用，但在托管目录中不存在，请改用 `ollama`
提供方并连接到该本地主机。

## 实时测试

对于 Ollama Cloud API 密钥冒烟测试，请将 Ollama 实时测试指向托管
端点，并从你当前目录中选择一个模型：

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=kimi-k2.6 \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

云端冒烟测试会运行文本、原生流式和网页搜索。默认情况下，它会跳过
`https://ollama.com` 的嵌入，因为 Ollama Cloud API 密钥可能不授权
`/api/embed`。

## 故障排查

- `Set OLLAMA_API_KEY` 错误：请提供一个真实的云 API 密钥。`ollama-local` 标记仅适用于本地或私有 Ollama 主机。
- 未知模型错误：运行 `openclaw models list --provider ollama-cloud` 并
 准确复制托管模型 ID。
- 自定义 Ollama 主机上的工具调用或原始 JSON 问题：检查你是否
 误用了 OpenAI 兼容的 `/v1` URL。Ollama 路由应使用不带 `/v1` 后缀的原生基础 URL。

## 相关内容

- [Ollama](/providers/ollama)
- [模型提供方](/concepts/model-providers)
- [所有提供方](/providers/index)
