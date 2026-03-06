---
summary: "在 OpenClaw 中使用 Z.AI（GLM 模型）"
read_when:
  - 你想在 OpenClaw 中使用 Z.AI / GLM 模型
  - 你需要一个简单的 ZAI_API_KEY 配置
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它提供 GLM 的 REST API 并使用 API 密钥进行认证。在 Z.AI 控制台创建你的 API 密钥。OpenClaw 通过 `zai` 提供者和 Z.AI API 密钥进行使用。

## CLI 设置

```bash
openclaw onboard --auth-choice zai-api-key
# 或者非交互式
openclaw onboard --zai-api-key "$ZAI_API_KEY"
```

## 配置片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

## 注意事项

- GLM 模型以 `zai/<model>` 形式提供（例如：`zai/glm-5`）。
- Z.AI 工具调用流（tool_stream）默认启用。若要禁用，可将
  `agents.defaults.models["zai/<model>"].params.tool_stream` 设置为 `false`。
- 查看 [/providers/glm](/providers/glm) 了解模型系列概述。
- Z.AI 使用 Bearer 认证方式，携带你的 API 密钥。
