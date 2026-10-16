---
summary: "在OpenClaw中使用Synthetic的Anthropic-兼容API"
read_when:
  - "你想将 Synthetic 用作模型提供方"
  - "你需要设置 Synthetic API 密钥或基础 URL"
title: "Synthetic"
---

[Synthetic](https://synthetic.new) 公开 Anthropic- 兼容端点。 OpenClaw 通过官方 `@openclaw/synthetic-provider` 插件提供并使用 Anthropic 消息 API。

| 属性 | 值                                 |
| -------- | ------------------------------------- |
| 提供者 | `synthetic`                           |
| 认证     | `SYNTHETIC_API_KEY`                   |
| API      | Anthropic 消息                    |
| 基础 URL | `https://api.synthetic.new/anthropic` |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/synthetic-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="get-an-api-key" title="获取 API 密钥">
    从您的 Synthetic 账户获取 `SYNTHETIC_API_KEY`，或者让引导流程提示您输入一个。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --auth-choice synthetic-api-key
    ```
  </Step>
  <Step id="verify-the-default-model" title="验证默认模型">
    Onboarding 将默认模型设置为 `synthetic/hf:MiniMaxAI/MiniMax-M3`。确认已注册：

    ```bash
    openclaw models list --provider synthetic
    ```

  </Step>
</Steps>

<Warning>
OpenClaw 的 Anthropic 客户端会自动在基础 URL 后追加 `/v1`，因此请使用 `https://api.synthetic.new/anthropic`（而不是 `/anthropic/v1`）。如果 Synthetic 更改了其基础 URL，请覆盖 `models.providers.synthetic.baseUrl`。
</Warning>

## <a id="config-example"></a> 配置示例

```json5
{
  env: { vars: { SYNTHETIC_API_KEY: "sk-..." } },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M3" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M3": { alias: "MiniMax M3" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M3",
            name: "MiniMax M3",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## <a id="model-discovery"></a> 模型发现

使用 Synthetic 凭证，OpenClaw 从 Synthetic 的 [`/openai/v1/models` API](https://dev.synthetic.new/docs/openai/models) 中发现当前文本模型。推理仍然使用 Anthropic 消息 API。新广告的模型（包括小型模型和 `syn:` 别名）不需要更新 OpenClaw 目录。

实时目录提供上下文和输出限制、图像输入、推理、工具支持和基于使用的代币价格。这些价格是估计价格，而不是订阅账单。请参阅 Synthetic 的 [ 当前模型列表 ](https://dev.synthetic.new/docs/api/models) 了解可用性及其推荐的别名。

离线目录生成和不可用或不可用的发现响应使用捆绑种子模型。您选择的模型不会自动更改。当您覆盖推理基础 URL 时，OpenClaw 会跳过 Synthetic 的固定发现 URL，因此代理凭证不会发送到 Synthetic。

<Tip>
模型参考采用 `synthetic/<modelId>` 形式。使用 `openclaw models list --provider synthetic` 检查您配置的模型。
</Tip>

<AccordionGroup>
  <Accordion id="model-allowlist" title="模型许可名单">
    如果启用了模型允许列表（`agents.defaults.modelPolicy.allow`），请添加所有计划使用的 Synthetic 模型。不在允许列表中的模型将对代理隐藏。
  </Accordion>

  <Accordion id="base-url-override" title="基本 URL 覆盖">
    如果 Synthetic 更改了其 API 端点，请覆盖基础 URL：

    ```json5
    {
      models: {
        providers: {
          synthetic: {
            baseUrl: "https://new-api.synthetic.new/anthropic",
          },
        },
      },
    }
    ```

    OpenClaw 仍会自动附加 `/v1`。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    提供者规则、模型参考和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供方设置在内的完整配置模式。
  </Card>
  <Card title="Synthetic" href="https://synthetic.new" icon="arrow-up-right-from-square">
    Synthetic 仪表盘和 API 文档。
  </Card>
</CardGroup>
