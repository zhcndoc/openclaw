---
summary: "使用 OpenRouter 的统一 API 访问 OpenClaw 中的多个模型"
read_when:
  - 你希望为许多 LLM 使用一个 API 密钥
  - 你希望在 OpenClaw 中通过 OpenRouter 运行模型
  - 你希望使用 OpenRouter 进行图像生成
title: "OpenRouter"
---

OpenRouter 提供了一个 **统一 API**，可通过单个端点和 API 密钥将请求路由到多个模型。它兼容 OpenAI，因此只需切换基础 URL，大多数 OpenAI SDK 都可以使用。

## 开始使用

<Steps>
  <Step title="获取您的 API 密钥">
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 创建一个 API 密钥。
  </Step>
  <Step title="运行初始化">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="（可选）切换到特定模型">
    初始化默认为 `openrouter/auto`。稍后选择一个具体模型：

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## 配置示例

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 模型引用

<Note>
模型引用遵循 `openrouter/<provider>/<model>` 模式。有关可用提供商和模型的完整列表，请参阅 [/concepts/model-providers](/concepts/model-providers)。
</Note>

捆绑的回退示例：

| 模型引用                          | 说明                         |
| --------------------------------- | ---------------------------- |
| `openrouter/auto`                 | OpenRouter 自动路由           |
| `openrouter/moonshotai/kimi-k2.6` | 通过 MoonshotAI 使用 Kimi K2.6 |

## 图像生成

OpenRouter 也可以支持 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下使用 OpenRouter 图像模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openrouter/google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

OpenClaw 会将图像请求发送到 OpenRouter 的 chat completions 图像 API，并使用 `modalities: ["image", "text"]`。Gemini 图像模型会通过 OpenRouter 的 `image_config` 接收受支持的 `aspectRatio` 和 `resolution` 提示。

## 身份验证和请求头

OpenRouter 在底层使用带有您的 API 密钥的 Bearer token。

在真实的 OpenRouter 请求（`https://openrouter.ai/api/v1`）中，OpenClaw 还会添加
OpenRouter 文档中记录的应用归属请求头：

| 请求头                    | 值                 |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>
如果您将 OpenRouter 提供商重定向到其他代理或基础 URL，OpenClaw
**不会**注入那些 OpenRouter 特定的请求头或 Anthropic 缓存标记。
</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="Anthropic 缓存标记">
    在已验证的 OpenRouter 路由上，Anthropic 模型引用会保留
    OpenRouter 特定的 Anthropic `cache_control` 标记，OpenClaw 利用这些标记在
    系统/开发者提示块上实现更好的提示缓存复用。
  </Accordion>

  <Accordion title="思考 / 推理注入">
    在受支持的非 `auto` 路由上，OpenClaw 会将所选思考级别映射到
    OpenRouter 代理推理负载。未受支持的模型提示以及
    `openrouter/auto` 会跳过该推理注入。Hunter Alpha 也会对已失效的已配置模型引用跳过
    代理推理，因为 OpenRouter 可能会为该已退役路由在推理字段中返回最终答案文本。
  </Accordion>

  <Accordion title="仅 OpenAI 的请求调整">
    OpenRouter 仍然通过代理风格的 OpenAI 兼容路径运行，因此
    原生仅 OpenAI 的请求调整（如 `serviceTier`、Responses `store`、
    OpenAI 推理兼容负载和提示缓存提示）不会被转发。
  </Accordion>

  <Accordion title="基于 Gemini 的路由">
    基于 Gemini 的 OpenRouter 引用保持在代理 -Gemini 路径上：OpenClaw 在那里保留
    Gemini 思考签名清理，但不启用原生 Gemini
    重放验证或引导重写。
  </Accordion>

  <Accordion title="提供商路由元数据">
    如果您在模型参数下传递 OpenRouter 提供商路由，OpenClaw 会转发
    它作为 OpenRouter 路由元数据，在共享流包装器运行之前处理。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
