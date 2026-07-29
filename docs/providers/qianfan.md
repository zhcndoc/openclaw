---
summary: "使用 Qianfan 的统一 API 在 OpenClaw 中访问许多模型"
read_when:
  - 你希望为许多 LLM 使用一个 API 密钥
  - 你需要百度 Qianfan 的设置指南
title: "Qianfan"
---

Qianfan 是百度的 MaaS 平台：一个统一的、兼容 OpenAI 的 API，通过单一端点和 API 密钥将请求路由到许多模型。OpenClaw 将其作为官方外部插件 `@openclaw/qianfan-provider` 提供。

| Property      | Value                                    |
| ------------- | ---------------------------------------- |
| Provider      | `qianfan`                                |
| Auth          | `QIANFAN_API_KEY`                        |
| API           | 兼容 OpenAI (`openai-completions`) |
| Base URL      | `https://qianfan.baidubce.com/v2`        |
| Default model | `qianfan/deepseek-v4-pro`                |

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/qianfan-provider
openclaw gateway restart
```

## 快速开始

<Steps>
  <Step title="创建百度云账号">
    在 [Qianfan 控制台](https://console.bce.baidu.com/qianfan/ais/console/apiKey) 注册或登录，并确保你已启用 Qianfan API 访问权限。
  </Step>
  <Step title="生成 API 密钥">
    创建一个新应用或选择一个已有应用，然后生成一个 API 密钥。百度云密钥使用 `bce-v3/ALTAK-...` 格式。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice qianfan-api-key
    ```

    Non-interactive runs read the key from `--qianfan-api-key <key>` or
    `QIANFAN_API_KEY`. Onboarding writes the provider config, adds the
    `QIANFAN` alias for the default model, and sets `qianfan/deepseek-v4-pro`
    as the default model when none is configured.

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider qianfan
    ```
  </Step>
</Steps>

## 内置目录

| Model ref                            | Input       | Context   | Max output | Reasoning | Notes                                                                      |
| ------------------------------------ | ----------- | --------- | ---------- | --------- | -------------------------------------------------------------------------- |
| `qianfan/deepseek-v4-pro`            | text        | 1,000,000 | 393,216    | Yes       | Current DeepSeek flagship                                                  |
| `qianfan/ernie-5.1`                  | text        | 128,000   | 65,536     | No        | Latest ERNIE text flagship                                                 |
| `qianfan/ernie-5.0`                  | text, image | 128,000   | 65,536     | Yes       | Current multimodal and thinking model                                      |
| `qianfan/deepseek-v3.2`              | text        | 128,000   | 32,768     | No        | Deprecated onboarding compatibility default; replaced by `deepseek-v4-pro` |
| `qianfan/ernie-5.0-thinking-preview` | text, image | 128,000   | 65,536     | Yes       | Deprecated alias; replaced by `ernie-5.0`                                  |

目录是静态的；没有实时模型发现。

<Tip>
只有在需要自定义基础 URL 或模型元数据时，才需要覆盖 `models.providers.qianfan`。
</Tip>

## 配置示例

This example explicitly selects the current DeepSeek flagship instead of the onboarding compatibility default.

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v4-pro" },
      models: {
        "qianfan/deepseek-v4-pro": { alias: "QIANFAN" },
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
            id: "deepseek-v4-pro",
            name: "DeepSeek V4 Pro",
            reasoning: true,
            input: ["text"],
            cost: {
              input: 1.771957,
              output: 3.543915,
              cacheRead: 0.147663,
              cacheWrite: 0,
            },
            contextWindow: 1000000,
            maxTokens: 393216,
          },
        ],
      },
    },
  },
}
```

<Note>
Model refs use the `qianfan/` prefix (for example `qianfan/deepseek-v4-pro`).
</Note>

<AccordionGroup>
  <Accordion title="传输和兼容性">
    Qianfan 通过与 OpenAI 兼容的传输路径运行，而不是原生的 OpenAI 请求格式。标准 OpenAI SDK 功能可以正常工作，但特定于提供商的参数可能不会被传递。
  </Accordion>

  <Accordion title="故障排查">
    - 确保你的 API 密钥以 `bce-v3/ALTAK-` 开头，并且已在百度智能云控制台中启用 Qianfan API 访问权限。
    - 如果未列出模型，请确认你的账户已激活 Qianfan 服务。
    - 只有在使用自定义端点或代理时才更改基础 URL。

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
