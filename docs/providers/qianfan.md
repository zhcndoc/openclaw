---
summary: "使用 Qianfan 的统一 API 在 OpenClaw 中访问许多模型"
read_when:
  - 你希望为许多 LLM 使用一个 API 密钥
  - 你需要百度 Qianfan 的设置指南
title: "Qianfan"
---

Qianfan 是百度的 MaaS 平台，提供一个**统一 API**，通过单一端点和 API 密钥将请求路由到其后面的多个模型。它兼容 OpenAI，因此只需切换基础 URL，大多数 OpenAI SDK 都可以工作。

| 属性     | 值                                |
| -------- | --------------------------------- |
| 提供方   | `qianfan`                         |
| 认证     | `QIANFAN_API_KEY`                 |
| API      | 兼容 OpenAI                       |
| 基础 URL | `https://qianfan.baidubce.com/v2` |

## 开始使用

<Steps>
  <Step title="创建百度云账号">
    在 [Qianfan 控制台](https://console.bce.baidu.com/qianfan/ais/console/apiKey) 注册或登录，并确保你已启用 Qianfan API 访问权限。
  </Step>
  <Step title="生成 API 密钥">
    创建一个新应用或选择一个现有应用，然后生成 API 密钥。密钥格式为 `bce-v3/ALTAK-...`。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice qianfan-api-key
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider qianfan
    ```
  </Step>
</Steps>

## 内置目录

| 模型引用                            | 输入        | 上下文  | 最大输出 | 推理 | 备注         |
| ----------------------------------- | ----------- | ------- | -------- | ---- | ------------- |
| `qianfan/deepseek-v3.2`              | text        | 98,304  | 32,768   | Yes  | 默认模型      |
| `qianfan/ernie-5.0-thinking-preview` | text, image | 119,000 | 64,000   | Yes  | 多模态        |

<Tip>
默认捆绑的模型引用是 `qianfan/deepseek-v3.2`。只有在需要自定义基础 URL 或模型元数据时，才需要覆盖 `models.providers.qianfan`。
</Tip>

## 配置示例

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="传输和兼容性">
    Qianfan 走的是兼容 OpenAI 的传输路径，而不是原生 OpenAI 请求格式。这意味着标准 OpenAI SDK 功能可以使用，但可能不会转发提供方特定的参数。
  </Accordion>

  <Accordion title="目录和覆盖">
    当前捆绑的目录包括 `deepseek-v3.2` 和 `ernie-5.0-thinking-preview`。只有在需要自定义基础 URL 或模型元数据时，才添加或覆盖 `models.providers.qianfan`。

    <Note>
    模型引用使用 `qianfan/` 前缀（例如 `qianfan/deepseek-v3.2`）。
    </Note>

  </Accordion>

  <Accordion title="故障排查">
    - 确保你的 API 密钥以 `bce-v3/ALTAK-` 开头，并且已在百度云控制台启用 Qianfan API 访问权限。
    - 如果未列出模型，请确认你的账号已激活 Qianfan 服务。
    - 默认基础 URL 是 `https://qianfan.baidubce.com/v2`。只有在使用自定义端点或代理时才需要更改它。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障切换行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="Agent 设置" href="/concepts/agent" icon="robot">
    配置 Agent 默认值和模型分配。
  </Card>
  <Card title="Qianfan API 文档" href="https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb" icon="arrow-up-right-from-square">
    官方 Qianfan API 文档。
  </Card>
</CardGroup>
