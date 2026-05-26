---
summary: "在 OpenClaw 中使用 Z.AI（GLM 模型）"
read_when:
  - 你希望在 OpenClaw 中使用 Z.AI / GLM 模型
  - 你需要一个简单的 ZAI_API_KEY 配置
title: "Z.AI"
---

Z.AI 是 **GLM** 模型的 API 平台。它为 GLM 提供 REST API，并使用 API 密钥进行身份验证。请在 Z.AI 控制台中创建你的 API 密钥。OpenClaw 使用带有 Z.AI API 密钥的 `zai` 提供方。

| Property | Value                                        |
| -------- | -------------------------------------------- |
| Provider | `zai`                                        |
| Auth     | `ZAI_API_KEY` (legacy alias: `Z_AI_API_KEY`) |
| API      | Z.AI Chat Completions (Bearer auth)          |

## GLM models

GLM 是一个模型家族，而不是一个单独的提供方。在 OpenClaw 中，GLM 模型使用诸如 `zai/glm-5.1` 这样的引用：提供方 `zai`，模型 ID `glm-5.1`。

## 入门

<Tabs>
  <Tab title="Auto-detect endpoint">
    **最适合：** 大多数用户。OpenClaw 会使用你的 API 密钥探测受支持的 Z.AI 端点，并自动应用正确的基础 URL。

    <Steps>
      <Step title="运行初始化">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="验证模型已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="显式区域端点">
    **最适合：** 希望强制使用特定 Coding Plan 或通用 API 接口的用户。

    <Steps>
      <Step title="选择正确的初始化选项">
        ```bash
        # Coding Plan Global（建议 Coding Plan 用户使用）
        openclaw onboard --auth-choice zai-coding-global

        # Coding Plan CN（中国区）
        openclaw onboard --auth-choice zai-coding-cn

        # 通用 API
        openclaw onboard --auth-choice zai-global

        # 通用 API CN（中国区）
        openclaw onboard --auth-choice zai-cn
        ```
      </Step>
      <Step title="验证模型已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 配置示例

<Tip>
`zai-api-key` 允许 OpenClaw 根据密钥检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。当你想强制使用特定的 Coding Plan 或通用 API 接口时，请使用显式的区域选项。
</Tip>

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  models: {
    providers: {
      zai: {
        // 示例值。初始化会为你的端点写入匹配的 baseUrl。
        baseUrl: "https://api.z.ai/api/paas/v4",
      },
    },
  },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

## 内置目录

OpenClaw 在插件清单中附带了内置的 `zai` 提供方目录，因此只读列表可以在不加载提供方运行时的情况下显示已知的 GLM 条目：

```bash
openclaw models list --all --provider zai
```

当前由清单支持的目录包括：

| 模型引用             | 说明           |
| -------------------- | -------------- |
| `zai/glm-5.1`        | 默认模型       |
| `zai/glm-5`          |                |
| `zai/glm-5-turbo`    |                |
| `zai/glm-5v-turbo`   |                |
| `zai/glm-4.7`        |                |
| `zai/glm-4.7-flash`  |                |
| `zai/glm-4.7-flashx` |                |
| `zai/glm-4.6`        |                |
| `zai/glm-4.6v`       |                |
| `zai/glm-4.5`        |                |
| `zai/glm-4.5-air`    |                |
| `zai/glm-4.5-flash`  |                |
| `zai/glm-4.5v`       |                |

<Tip>
GLM 模型可通过 `zai/<model>` 使用（例如：`zai/glm-5`）。
</Tip>

<Note>
默认捆绑的模型引用是 `zai/glm-5.1`。GLM 版本和可用性可能会变化；运行 `openclaw models list --all --provider zai` 可查看你已安装版本所知的目录。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="转发解析未知的 GLM-5 模型">
    未知的 `glm-5*` ID 仍会在内置提供方路径上进行转发解析：当该 ID
    匹配当前 GLM-5 系列的形态时，会基于 `glm-4.7` 模板合成由提供方拥有的元数据。
  </Accordion>

  <Accordion title="工具调用流式传输">
    `tool_stream` 默认已为 Z.AI 的工具调用流式传输启用。如需禁用：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/<model>": {
              params: { tool_stream: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="思考与保留思考">
    Z.AI 的思考机制遵循 OpenClaw 的 `/think` 控制。关闭思考时，
    OpenClaw 会发送 `thinking: { type: "disabled" }`，以避免响应在可见文本之前
    将输出预算消耗在 `reasoning_content` 上。

    保留思考是可选开启的，因为 Z.AI 需要回放完整的历史
    `reasoning_content`，这会增加提示词 token。按模型启用：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/glm-5.1": {
              params: { preserveThinking: true },
            },
          },
        },
      },
    }
    ```

    启用后并且思考开启时，OpenClaw 会发送
    `thinking: { type: "enabled", clear_thinking: false }`，并为同一条
    兼容 OpenAI 的会话轨迹回放先前的 `reasoning_content`。

    高级用户仍然可以通过 `params.extra_body.thinking` 覆盖精确的提供方负载。

  </Accordion>

  <Accordion title="图像理解">
    内置的 Z.AI 插件已注册图像理解功能。

    | 属性     | 值          |
    | -------- | ----------- |
    | 模型     | `glm-4.6v`  |

    图像理解会根据已配置的 Z.AI 身份验证自动解析，无需额外配置。

  </Accordion>

  <Accordion title="Auth details">
    - Z.AI 使用你的 API 密钥进行 Bearer 认证。
    - `zai-api-key` 初始化选项会通过使用你的密钥探测受支持的端点来自动检测匹配的 Z.AI 端点。
    - 当你想强制使用特定 API 接口时，请使用显式的区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）。
    - 仍然接受旧环境变量 `Z_AI_API_KEY`；如果 `ZAI_API_KEY` 未设置，OpenClaw 会在启动时将其复制到 `ZAI_API_KEY`。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Model selection" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置模式，包括提供方和模型设置。
  </Card>
</CardGroup>