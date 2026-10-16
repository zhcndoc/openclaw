---
summary: "使用 Qianfan 的统一 API 在 OpenClaw 中访问许多模型"
read_when:
  - "您需要一个 API 密钥来支持多个 LLM"
  - "您需要 Baidu Qianfan 设置指南"
title: "Qianfan"
---

Qianfan 是 Baidu 的 MaaS 平台：一个统一的、与 OpenAI- 兼容的 API，可将请求路由到单个端点和 API 密钥后面的多个模型。 OpenClaw 将其作为官方外部插件 `@openclaw/qianfan-provider` 提供。

| 属性      | 值                                    |
| ------------- | ---------------------------------------- |
| 提供者      | `qianfan`                                |
| 认证          | `QIANFAN_API_KEY`                        |
| API           | OpenAI-兼容（`openai-completions`） |
| 基础 URL      | `https://qianfan.baidubce.com/v2`        |
| 默认模型 | `qianfan/deepseek-v4-pro`                |

## <a id="install-plugin"></a> 安装插件

安装官方插件：

```bash
openclaw plugins install @openclaw/qianfan-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="create-a-baidu-cloud-account" title="创建Baidu云账号">
    在[千帆Console](https://console.bce.baidu.com/qianfan/ais/console/apiKey)上注册或登录并启用Qianfan API访问。
  </Step>
  <Step id="generate-an-api-key" title="生成 API 密钥">
    创建一个新应用程序或选择现有应用程序，然后生成 API 密钥。 Baidu 云密钥使用 `bce-v3/ALTAK-...` 格式。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --auth-choice qianfan-api-key
    ```

    非交互式运行会从 `--qianfan-api-key <key>` 或 `QIANFAN_API_KEY` 读取密钥。引导流程会写入提供商配置，为默认模型添加 `QIANFAN` 别名，并在未配置默认模型时将 `qianfan/deepseek-v4-pro` 设置为默认模型。

  </Step>
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider qianfan
    ```
  </Step>
</Steps>

## <a id="built-in-catalog"></a> 内置目录

| 模型引用                            | 输入       | 上下文   | 最大输出 | 推理 | 笔记                                                                      |
| ------------------------------------ | ----------- | --------- | ---------- | --------- | -------------------------------------------------------------------------- |
| `qianfan/deepseek-v4-pro`            | 文本        | 1,000,000 | 393,216    | 是       | 当前 DeepSeek 旗舰模型                                                  |
| `qianfan/ernie-5.1`                  | 文本        | 128,000   | 65,536     | No        | 最新 ERNIE 文本旗舰模型                                                 |
| `qianfan/ernie-5.0`                  | 文本、图像 | 128,000   | 65,536     | 是       | 当前多模态和思考模型                                      |
| `qianfan/deepseek-v3.2`              | 文本        | 128,000   | 32,768     | No        | 已弃用的接入兼容性默认模型；由 `deepseek-v4-pro` 替代 |
| `qianfan/ernie-5.0-thinking-preview` | 文本、图像 | 128,000   | 65,536     | 是       | 已弃用的别名；由 `ernie-5.0` 替代                                  |

目录是静态的；没有实时模型发现。

安装程序会保存连接设置和别名，而无需将生成的目录行复制到您的配置中。显式 `models.mode: "replace"` 保持目录播种启用；自定义模型行保持不变。

<Tip>
只有在需要自定义基础 URL 或模型元数据时，才需要覆盖 `models.providers.qianfan`。
</Tip>

## <a id="config-example"></a> 配置示例

此示例明确选择当前的 DeepSeek 旗舰产品，这也是默认设置的模型。

```json5
{
  env: { vars: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." } },
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
模型引用使用 `qianfan/` 前缀（例如 `qianfan/deepseek-v4-pro`）。
</Note>

<AccordionGroup>
  <Accordion id="transport-and-compatibility" title="运输和兼容性">
    Qianfan 通过 OpenAI- 兼容传输路径运行，而不是本机 OpenAI 请求整形。标准 OpenAI SDK 功能有效，但可能无法转发提供商特定的参数。
  </Accordion>

  <Accordion id="troubleshooting" title="故障排查">
    - 检查您的 API 密钥是否以 `bce-v3/ALTAK-` 开头，并且在 Baidu 云控制台中启用了 Qianfan API 访问权限。
    - 如果未列出模型，请确认你的账户已激活 Qianfan 服务。
    - 只有在使用自定义端点或代理时才更改基础 URL。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="代理设置" href="/concepts/agent" icon="robot">
    配置 Agent 默认值和模型分配。
  </Card>
  <Card title="Qianfan API 文档" href="https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb" icon="arrow-up-right-from-square">
    官方 Qianfan API 文档。
  </Card>
</CardGroup>
