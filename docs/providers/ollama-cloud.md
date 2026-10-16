---
summary: "直接使用 Ollama Cloud 与 OpenClaw"
read_when:
  - "你想在没有本地 Ollama 服务器的情况下使用托管的 Ollama 模型"
  - "您需要 ollama-cloud 提供商 ID、密钥或端点"
title: "Ollama Cloud"
---

Ollama Cloud 是 Ollama 的托管模型 API。 `ollama-cloud` 提供商通过 Ollama 的本机 `/api/chat` API 直接在 `https://ollama.com` 调用它，没有本地 Ollama 服务器，也没有本地 Ollama 应用程序登录到云模式。使用 `ollama-cloud/kimi-k2.6` 等模型参考。

OpenClaw 将 `ollama-cloud` 注册为其自己的提供商 ID，因此纯云凭据、实时目录发现和模型选择不会与本地 `ollama` 主机混合。有关本地 Ollama、混合云加本地路由、嵌入和自定义主机的详细信息，请参阅 [Ollama](/providers/ollama)。

## <a id="setup"></a> 设置

按照[Ollama的API关键说明](https://docs.ollama.com/api/authentication#api-keys)，然后运行：

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

Onboarding 将默认模型设置为 `ollama-cloud/minimax-m2.7`。

设置流程会拒绝 `ollama-local`，包括来自 `OLLAMA_API_KEY` 或已保存配置文件的情况。该占位符仅启用本地 Ollama；它不是托管的 API 密钥。

## <a id="defaults"></a> 默认值

- 提供者：`ollama-cloud`
- 基本URL：`https://ollama.com`
- Env 变量：`OLLAMA_API_KEY`
- API 款式：Ollama 原生 `/api/chat`
- 上线默认模型：`ollama-cloud/minimax-m2.7`

## <a id="when-to-choose-ollama-cloud"></a> 何时选择 Ollama Cloud

- 你想在不本地运行 `ollama serve` 的情况下使用托管的 Ollama 模型。
- 您想要相同的本机 Ollama 聊天 API 形状 OpenClaw 用于本地 Ollama，但指向 `https://ollama.com`。
- 你需要一个简单的云端路径来使用已经位于 Ollama 托管目录中的模型。
- 您不需要本地模型拉动、本地 GPU 控制或 LAN- 仅推理。

当您希望通过登录的 Ollama 主机进行纯本地或云加本地路由时，请使用 [Ollama](/providers/ollama)。当您需要 `/v1/chat/completions` 语义或提供程序特定的 OpenAI-style 功能时，请改用 OpenAI- 兼容提供程序。

## <a id="models"></a> 模型

该提供程序需要 API 密钥；没有密钥时它将保持非活跃状态。使用密钥后， OpenClaw 会从托管目录中实时发现 Ollama Cloud 模型：

```bash
openclaw models list --provider ollama-cloud
openclaw models set ollama-cloud/kimi-k2.6
```

实时目录中的托管 ID 包括 `deepseek-v4-pro`、`glm-5.2`、`gpt-oss:20b`、`kimi-k3` 和 `minimax-m3`。失败的发现会保留相同凭据的最后一次成功清单。如果没有事先清单，OpenClaw 会提供捆绑建议并记录发现失败。成功的空响应会清除已发现的模型；后来的失败保留了空结果。已退役的模型已从捆绑建议中删除；现有配置不会自动重写。

模型 id 是云目录 id，而不是本地拉取名称。如果某个模型名称在本地 Ollama 主机上可用，但在托管目录中不存在，请改用 `ollama` 提供程序并指定该本地主机。

## <a id="live-test"></a> 实时测试

对于 Ollama Cloud API-key 冒烟测试，请将 Ollama 实时测试指向托管端点并从当前目录中选择一个模型：

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=kimi-k2.6 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

云端冒烟测试会运行文本、原生流式和网页搜索；设置 `OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0` 可跳过网页搜索。默认情况下， 对于 `https://ollama.com` 它会跳过嵌入，因为 Ollama Cloud API 密钥可能不会授权 `/api/embed`；可通过 `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1` 强制启用。

## <a id="troubleshooting"></a> 故障排查

- `Ollama Cloud requires an API key` / `Set OLLAMA_API_KEY` 错误：提供真实的云 API 密钥。本地 `ollama-local` 标记仅适用于本地或私有 Ollama 主机。
- 未知模型错误：运行 `openclaw models list --provider ollama-cloud` 并准确复制托管模型 ID。
- 自定义 Ollama 主机上的工具调用或原始 JSON 问题：检查您是否意外使用了 OpenAI- 兼容的 `/v1` URL。 Ollama 路由应使用本机基础 URL，不带 `/v1` 后缀。

## <a id="related"></a> 相关内容

- [Ollama](/providers/ollama)
- [模型提供商](/concepts/model-providers)
- [所有提供方](/providers/index)
