---
summary: "GLM 模型家族概览 + 如何在 OpenClaw 中使用它"
read_when:
  - 你想在 OpenClaw 中使用 GLM 模型
  - 你需要了解模型命名规范和设置方式
title: "GLM（智谱）"
---

# GLM 模型

GLM 是一个通过 Z.AI 平台提供的**模型家族**（不是一家公司）。在 OpenClaw 中，GLM
模型通过 `zai` 提供方访问，模型 ID 例如 `zai/glm-5`。

## 开始使用

<Steps>
  <Step title="选择一种认证方式并运行 onboarding">
    请选择与你的 Z.AI 方案和地区相匹配的 onboarding 选项：

    | Auth choice | Best for |
    | ----------- | -------- |
    | `zai-api-key` | 通用 API key 设置，自动检测端点 |
    | `zai-coding-global` | Coding Plan 用户（全球） |
    | `zai-coding-cn` | Coding Plan 用户（中国区） |
    | `zai-global` | 通用 API（全球） |
    | `zai-cn` | 通用 API（中国区） |

    ```bash
    # 示例：通用自动检测
    openclaw onboard --auth-choice zai-api-key

    # 示例：Coding Plan 全球
    openclaw onboard --auth-choice zai-coding-global
    ```

  </Step>
  <Step title="将 GLM 设置为默认模型">
    ```bash
    openclaw config set agents.defaults.model.primary "zai/glm-5.1"
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider zai
    ```
  </Step>
</Steps>

## 配置示例

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

<Tip>
`zai-api-key` 会让 OpenClaw 根据密钥自动检测匹配的 Z.AI 端点，并
自动应用正确的 base URL。 当你想强制使用特定的 Coding Plan 或通用
API 服务时，请使用明确的地区选项。
</Tip>

## 内置目录

OpenClaw 当前为打包的 `zai` 提供方预置了以下 GLM 引用：

| Model           | Model            |
| --------------- | ---------------- |
| `glm-5.1`       | `glm-4.7`        |
| `glm-5`         | `glm-4.7-flash`  |
| `glm-5-turbo`   | `glm-4.7-flashx` |
| `glm-5v-turbo`  | `glm-4.6`        |
| `glm-4.5`       | `glm-4.6v`       |
| `glm-4.5-air`   |                  |
| `glm-4.5-flash` |                  |
| `glm-4.5v`      |                  |

<Note>
默认内置的模型引用是 `zai/glm-5.1`。GLM 的版本和可用性
可能会变化；请查看 Z.AI 的文档获取最新信息。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="端点自动检测">
    当你使用 `zai-api-key` 认证选项时，OpenClaw 会检查密钥格式
    以确定正确的 Z.AI base URL。明确的地区选项
    （`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）会覆盖
    自动检测，并直接固定端点。
  </Accordion>

  <Accordion title="提供方详情">
    GLM 模型由 `zai` 运行时提供方提供服务。有关完整的提供方
    配置、地区端点和其他功能，请参阅
    [Z.AI provider docs](/providers/zai)。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Z.AI provider" href="/providers/zai" icon="server">
    完整的 Z.AI 提供方配置和地区端点。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障切换行为。
  </Card>
</CardGroup>
