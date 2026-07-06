---
summary: "使用 NovitaAI 的 OpenAI 兼容 API 配合 OpenClaw"
read_when:
  - 你想使用 NovitaAI 模型运行 OpenClaw
  - 你需要 Novita 提供商的 id、密钥或端点
title: "NovitaAI"
---

NovitaAI 是一个提供托管 AI 基础设施的服务商，提供 OpenAI 兼容的 API。
它作为内置的 OpenClaw 提供商随附提供（无需单独安装插件），因此
凭据会通过正常的模型认证流程传递，模型引用看起来像
`novita/deepseek/deepseek-v3-0324`。

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

| 设置          | 值                                 |
| ------------- | ---------------------------------- |
| 提供方 ID     | `novita`                           |
| 别名          | `novita-ai`, `novitaai`            |
| 基础 URL      | `https://api.novita.ai/openai/v1`  |
| 环境变量      | `NOVITA_API_KEY`                   |
| 默认模型      | `novita/deepseek/deepseek-v3-0324` |

## 捆绑模型目录

- `novita/moonshotai/kimi-k2.5`
- `novita/minimax/minimax-m2.7`
- `novita/zai-org/glm-5`
- `novita/deepseek/deepseek-v3-0324`
- `novita/deepseek/deepseek-r1-0528`
- `novita/qwen/qwen3-235b-a22b-fp8`

这只是一个起点，不是一个实时目录。你的账户、地区，或者
Novita 当前的服务内容可能会添加、移除或限制路由。请在设置
长期默认值之前先检查：

```bash
openclaw models list --provider novita
```

## 何时选择 Novita

- 通过与 OpenAI 兼容的 API 访问托管的开放权重模型。
- 通过单一提供商账户即可使用 DeepSeek、Kimi、MiniMax、GLM 或 Qwen 系列路由。
- 作为除 DeepInfra、GMI、OpenRouter 或直接厂商 API 之外的另一条托管备用路径。
- 由提供商侧托管模型，而不是自行维护 LM Studio、Ollama、SGLang 或 vLLM 基础设施。

当你需要厂商原生请求参数或支持合同时，选择直接厂商提供商。当模型必须在你自己的硬件或网络边界内运行时，选择本地提供商。

## 故障排查

- `401`/`403`：在 Novita 的密钥管理页面中验证密钥，如果已存储的配置文件已过期，则重新运行
  `openclaw onboard --auth-choice novita-api-key`。
- 未知模型错误：使用 `openclaw models list --provider novita` 返回的精确 `novita/<route-id>`。
- 路由缓慢或失败：尝试另一个 Novita 模型路由，或者将 Novita 设置为回退提供商，以处理能够容忍提供商特定差异的工作负载。

## 相关

- [模型提供商](/concepts/model-providers)
- [提供商目录](/providers/index)
