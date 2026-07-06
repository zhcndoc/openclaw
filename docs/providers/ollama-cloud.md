---
summary: "直接使用 Ollama Cloud 与 OpenClaw"
read_when:
  - 你想在没有本地 Ollama 服务器的情况下使用托管的 Ollama 模型
  - 你需要 `ollama-cloud` 提供方 ID、密钥或端点
title: "Ollama Cloud"
---

Ollama Cloud 是 Ollama 托管的模型 API。`ollama-cloud` 提供方直接通过 Ollama 原生的 `/api/chat` API 在 `https://ollama.com` 上调用它，不需要本地 Ollama 服务器，也不需要本地 Ollama 应用以云模式登录。请使用像 `ollama-cloud/kimi-k2.6` 这样的模型引用。

OpenClaw 将 `ollama-cloud` 注册为其自己的提供方 ID，因此仅云端凭据、实时目录发现和模型选择不会与本地 `ollama` 主机混淆。关于本地 Ollama、混合云端加本地路由、嵌入以及自定义主机详情，请参见 [Ollama](/providers/ollama)。

## 设置

在 [ollama.com/settings/keys](https://ollama.com/settings/keys) 创建一个 Ollama Cloud API 密钥，然后运行：

```bash
openclaw onboard --auth-choice ollama-cloud
```

或者设置：

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret
```

非交互式 onboarding 也可以直接接受密钥：

```bash
openclaw onboard --auth-choice ollama-cloud --ollama-cloud-api-key "<key>"
```

onboarding 会将默认模型设置为 `ollama-cloud/kimi-k2.5:cloud`。

## 默认值

- 提供商: `ollama-cloud`
- 基础 URL: `https://ollama.com`
- 环境变量: `OLLAMA_API_KEY`
- API 风格: Ollama 原生 `/api/chat`
- 引导默认模型: `ollama-cloud/kimi-k2.5:cloud`

## 何时选择 Ollama Cloud

- 你想在不本地运行 `ollama serve` 的情况下使用托管的 Ollama 模型。
- 你希望使用与 OpenClaw 在本地 Ollama 上相同的原生 Ollama 聊天 API 形状，但指向 `https://ollama.com`。
- 你需要一个简单的云端路径来使用已经位于 Ollama 托管目录中的模型。
- 你不需要本地模型拉取、本地 GPU 控制或仅限局域网的推理。

当你想要通过已登录的 Ollama 主机进行仅本地或云加本地路由时，请改用 [Ollama](/providers/ollama)。当你需要 `/v1/chat/completions`
语义或提供方特定的 OpenAI 风格功能时，请改用 OpenAI 兼容的提供方。

## 模型

该提供程序需要 API 密钥；没有密钥时它将保持非活跃状态。使用密钥后，
OpenClaw 会从托管目录中实时发现 Ollama Cloud 模型：

```bash
openclaw models list --provider ollama-cloud
openclaw models set ollama-cloud/kimi-k2.6
```

实时目录中的托管 id 包括 `deepseek-v4-flash`、`glm-5`、
`gpt-oss:20b`、`kimi-k2.6` 和 `minimax-m2.7`。当实时发现没有返回
任何内容时，OpenClaw 会回退到内置条目 `kimi-k2.5:cloud`、
`minimax-m2.7:cloud`、`glm-5.1:cloud` 和 `glm-5.2:cloud`。

模型 id 是云目录 id，而不是本地拉取名称。如果某个模型名称在
本地 Ollama 主机上可用，但在托管目录中不存在，请改用 `ollama`
提供程序并指定该本地主机。

## 实时测试

对于 Ollama Cloud API 密钥冒烟测试，请将 Ollama 实时测试指向托管
端点，并从你当前目录中选择一个模型：

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=kimi-k2.6 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

云端冒烟测试会运行文本、原生流式和网页搜索；设置
`OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0` 可跳过网页搜索。默认情况下，
对于 `https://ollama.com` 它会跳过嵌入，因为 Ollama Cloud API 密钥可能
不会授权 `/api/embed`；可通过 `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1` 强制启用。

## 故障排查

- `Ollama Cloud 需要 API 密钥` / `设置 OLLAMA_API_KEY` 错误：请提供一个
  真实的云端 API 密钥。`ollama-local` 标记仅用于本地或
  私有的 Ollama 主机。
- 未知模型错误：运行 `openclaw models list --provider ollama-cloud` 并
  准确复制托管模型 ID。
- 在自定义 Ollama 主机上出现工具调用或原始 JSON 问题：请检查你是否
  误用了兼容 OpenAI 的 `/v1` URL。Ollama 路由应使用不带 `/v1` 后缀的原生基础 URL。

## 相关内容

- [Ollama](/providers/ollama)
- [模型提供方](/concepts/model-providers)
- [所有提供方](/providers/index)
