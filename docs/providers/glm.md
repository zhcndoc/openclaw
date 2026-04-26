---
summary: "GLM 模型家族概览 + 如何在 OpenClaw 中使用"
read_when:
  - 您想在 OpenClaw 中使用 GLM 模型
  - 您需要模型命名约定和设置
title: "GLM (智谱)"
---

# GLM 模型

GLM 是通过 Z.AI 平台提供的一个**模型家族**（不是公司）。在 OpenClaw 中，GLM 模型通过 `zai` 提供者和类似 `zai/glm-5` 的模型 ID 访问。

## 快速开始

<Steps>
  <Step title="选择认证方式并运行初始化">
    选择与您的 Z.AI 计划和区域匹配的初始化选项：

    | 认证选项 | 适用场景 |
    | ----------- | -------- |
    | `zai-api-key` | 带有端点自动检测的通用 API-key 设置 |
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
`zai-api-key` 允许 OpenClaw 从密钥中检测匹配的 Z.AI 端点并自动应用正确的基础 URL。当您想强制使用特定的 Coding Plan 或通用 API 表面时，请使用明确的区域选项。
</Tip>

## 内置目录

OpenClaw 目前为内置的 `zai` 提供者预设了以下 GLM 引用：

| 模型           | 模型            |
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
默认内置模型引用是 `zai/glm-5.1`。GLM 版本和可用性可能会发生变化；请查阅 Z.AI 文档获取最新信息。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="端点自动检测">
    当您使用 `zai-api-key` 认证选项时，OpenClaw 会检查密钥格式以确定正确的 Z.AI 基础 URL。明确的区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）会覆盖自动检测并直接固定端点。
  </Accordion>

  <Accordion title="提供者详情">
    GLM 模型由 `zai` 运行时提供者提供服务。有关完整的提供者配置、区域端点和其他功能，请参阅 [Z.AI 提供者文档](/providers/zai)。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Z.AI 提供者" href="/providers/zai" icon="server">
    完整的 Z.AI 提供者配置和区域端点。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供者、模型引用和故障转移行为。
  </Card>
</CardGroup>
