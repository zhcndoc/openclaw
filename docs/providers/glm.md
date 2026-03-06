---
summary: "GLM 模型家族概览 + 如何在 OpenClaw 中使用"
read_when:
  - 你想在 OpenClaw 中使用 GLM 模型
  - 你需要模型命名规范和配置方法
title: "GLM 模型"
---

# GLM 模型

GLM 是通过 Z.AI 平台提供的一个**模型家族**（不是公司）。在 OpenClaw 中，GLM 模型通过 `zai` 提供者和类似 `zai/glm-5` 的模型 ID 访问。

## CLI 配置

```bash
openclaw onboard --auth-choice zai-api-key
```

## 配置片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

## 备注

- GLM 版本和可用性会变化；请查看 Z.AI 的文档以获取最新信息。
- 示例模型 ID 包括 `glm-5`、`glm-4.7` 和 `glm-4.6`。
- 有关提供者的详情，请参见 [/providers/zai](/providers/zai)。
