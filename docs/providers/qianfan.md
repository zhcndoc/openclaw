---
summary: "使用千帆的统一 API 访问 OpenClaw 中的多个模型"
read_when:
  - 你想用一个 API key 访问多个大语言模型
  - 你需要百度千帆的设置指导
title: "千帆"
---

Qianfan 是百度的 MaaS 平台，提供一个 **统一 API**，通过单一端点和 API key 将请求路由到多个模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换 base URL 即可使用。

| 属性 | 值 |
| -------- | --------------------------------- |
| 提供商 | `qianfan` |
| 认证 | `QIANFAN_API_KEY` |
| API | OpenAI 兼容 |
| 基础 URL | `https://qianfan.baidubce.com/v2` |

## 快速开始

<Steps>
  <Step title="创建百度云账户">
    在 [Qianfan Console](https://console.bce.baidu.com/qianfan/ais/console/apiKey) 注册或登录，并确保已启用千帆 API 访问权限。
  </Step>
  <Step title="生成 API 密钥">
    创建新应用或选择现有应用，然后生成 API 密钥。密钥格式为 `bce-v3/ALTAK-...`。
  </Step>
  <Step title="运行接入引导">
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

| 模型引用 | 输入 | 上下文 | 最大输出 | 推理 | 备注 |
| ------------------------------------ | ----------- | ------- | ---------- | --------- | ------------- |
| `qianfan/deepseek-v3.2` | 文本 | 98,304 | 32,768 | 是 | 默认模型 |
| `qianfan/ernie-5.0-thinking-preview` | 文本，图像 | 119,000 | 64,000 | 是 | 多模态 |

<Tip>
默认捆绑的模型引用是 `qianfan/deepseek-v3.2`。仅当你需要自定义 base URL 或模型元数据时，才需要覆盖 `models.providers.qianfan`。
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
  <Accordion title="传输与兼容性">
    千帆通过 OpenAI 兼容的传输路径运行，而非原生 OpenAI 请求塑造。这意味着标准 OpenAI SDK 功能可用，但特定于提供商的参数可能无法转发。
  </Accordion>

  <Accordion title="目录与覆盖">
    捆绑的目录目前包括 `deepseek-v3.2` 和 `ernie-5.0-thinking-preview`。仅当你需要自定义 base URL 或模型元数据时，才添加或覆盖 `models.providers.qianfan`。

    <Note>
    模型引用使用 `qianfan/` 前缀（例如 `qianfan/deepseek-v3.2`）。
    </Note>

  </Accordion>

  <Accordion title="故障排除">
    - 确保你的 API 密钥以 `bce-v3/ALTAK-` 开头，并在百度云控制台中启用了千帆 API 访问权限。
    - 如果未列出模型，请确认你的账户已激活千帆服务。
    - 默认基础 URL 是 `https://qianfan.baidubce.com/v2`。仅当你使用自定义端点或代理时才更改它。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/gateway/configuration-reference" icon="gear">
    Full OpenClaw configuration reference.
  </Card>
  <Card title="Agent 设置" href="/concepts/agent" icon="robot">
    配置 Agent 默认值和模型分配。
  </Card>
  <Card title="千帆 API 文档" href="https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb" icon="arrow-up-right-from-square">
    官方千帆 API 文档。
  </Card>
</CardGroup>
