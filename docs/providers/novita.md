---
summary: "使用 NovitaAI 的 OpenAI 兼容 API 配合 OpenClaw"
read_when:
  - 你想使用 NovitaAI 模型运行 OpenClaw
  - 你需要 Novita 提供商的 id、密钥或端点
title: "NovitaAI"
---

NovitaAI 是一家托管式 AI 基础设施提供商，提供与 OpenAI 兼容的模型 API。在 OpenClaw 中，它是一个内置模型提供商，因此提供商 id 为 `novita`，凭据通过常规的模型认证流程传递，模型引用格式类似 `novita/deepseek/deepseek-v3-0324`。

当你希望通过托管方式访问开源权重和第三方模型路由，而不运行自己的推理服务器时，可以使用 Novita。这个内置目录主要覆盖适合代理轮次的聊天模型，包括由 Novita 提供的 DeepSeek、Moonshot、MiniMax、GLM 和 Qwen 路由。

此提供商使用 Novita 的 OpenAI 兼容端点。OpenClaw 负责提供商注册、认证、别名、模型引用规范化以及基础 URL 选择；Novita 负责实时模型可用性、账户权限、定价和速率限制。

## 设置

在 [novita.ai/settings/key-management](https://novita.ai/settings/key-management) 创建 API 密钥，然后运行：

```bash
openclaw onboard --auth-choice novita-api-key
```

或者设置：

```bash
export NOVITA_API_KEY="<your-novita-api-key>" # pragma: allowlist secret
```

## 默认值

- 提供商：`novita`
- 别名：`novita-ai`、`novitaai`
- 基础 URL：`https://api.novita.ai/openai/v1`
- 环境变量：`NOVITA_API_KEY`
- 默认模型：`novita/deepseek/deepseek-v3-0324`

## 何时选择 Novita

- 你希望通过 OpenAI 兼容 API 访问托管的开源权重模型。
- 你希望通过单一提供商账户访问 DeepSeek、Kimi、MiniMax、GLM 或 Qwen 系列路由。
- 你希望在 OpenRouter、GMI、DeepInfra 或直接厂商 API 之外，再增加一个托管备用路径。
- 你更倾向于由提供商侧托管模型，而不是维护 vLLM、SGLang、LM Studio 或 Ollama 基础设施。

当你需要厂商原生请求参数或支持合同时，请选择直接厂商提供商。当模型必须运行在你自己的硬件上或位于你自己的网络边界内时，请选择本地提供商。

## 模型

内置目录会预置常见可用的 NovitaAI 路由 id，包括：

- `novita/moonshotai/kimi-k2.5`
- `novita/minimax/minimax-m2.7`
- `novita/zai-org/glm-5`
- `novita/deepseek/deepseek-v3-0324`
- `novita/deepseek/deepseek-r1-0528`
- `novita/qwen/qwen3-235b-a22b-fp8`

该目录是 OpenClaw 模型选择的起点。你的账户、地区或 Novita 当前目录可能会增加、移除或限制某些路由。在设置长期默认值之前，请先通过 CLI 检查提供商：

```bash
openclaw models list --provider novita
```

## 故障排查

- `401` 或 `403`：请验证 Novita 密钥管理页面中的密钥，并在已保存配置过期时重新运行 `openclaw onboard --auth-choice novita-api-key`。
- 未知模型错误：使用 `openclaw models list --provider novita` 返回的精确 `novita/<route-id>`。
- 路由缓慢或失败：尝试其他 Novita 模型路由，或将 Novita 设置为可容忍提供商差异的工作负载的备用提供商。

## 相关

- [模型提供商](/concepts/model-providers)
- [所有提供商](/providers/index)
