---
summary: "在 OpenClaw 中使用 Amazon Bedrock Mantle（OpenAI 兼容）模型"
read_when:
  - 您想在 OpenClaw 中使用 Bedrock Mantle 托管的开源模型
  - 您需要用于 GPT-OSS、Qwen、Kimi 或 GLM 的 Mantle OpenAI 兼容端点
title: "Amazon Bedrock Mantle"
---

OpenClaw 包含一个捆绑的 **Amazon Bedrock Mantle** 提供程序，用于连接
Mantle OpenAI 兼容端点。Mantle 通过由 Bedrock 基础设施支持的标准
`/v1/chat/completions` 接口托管开源和
第三方模型（GPT-OSS、Qwen、Kimi、GLM 等）。

| Property       | Value                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| Provider ID    | `amazon-bedrock-mantle`                                                                     |
| API            | `openai-completions` (OpenAI-compatible) or `anthropic-messages` (Anthropic Messages route) |
| Auth           | Explicit `AWS_BEARER_TOKEN_BEDROCK` or IAM credential-chain bearer-token generation         |
| Default region | `us-east-1` (override with `AWS_REGION` or `AWS_DEFAULT_REGION`)                            |

## 入门

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="显式 bearer token">
    **最适合：** 您已经拥有 Mantle bearer token 的环境。

    <Steps>
      <Step title="在网关主机上设置 bearer token">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        可选地设置区域（默认为 `us-east-1`）：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证是否发现了模型">
        ```bash
        openclaw models list
        ```

        发现的模型将显示在 `amazon-bedrock-mantle` 提供程序下。除非您想覆盖默认值，否则不需要额外配置。
      </Step>
    </Steps>

  </Tab>

  <Tab title="IAM 凭证">
    **最适合：** 使用 AWS SDK 兼容的凭证（共享配置、SSO、Web 身份、实例或任务角色）。

    <Steps>
      <Step title="在网关主机上配置 AWS 凭证">
        任何 AWS SDK 兼容的身份验证源均可使用：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证是否发现了模型">
        ```bash
        openclaw models list
        ```

        OpenClaw 会自动从凭证链生成 Mantle bearer token。
      </Step>
    </Steps>

    <Tip>
    当未设置 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会为您从 AWS 默认凭证链生成 bearer token，包括共享凭证/配置配置文件、SSO、Web 身份以及实例或任务角色。
    </Tip>

  </Tab>
</Tabs>

## 自动模型发现

当设置了 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 直接使用它。否则，
OpenClaw 会尝试从 AWS 默认凭证链生成 Mantle bearer token。然后，它通过查询区域的 `/v1/models` 端点来发现可用的 Mantle 模型。

| 行为            | 详情                      |
| --------------- | ------------------------- |
| 发现缓存        | 结果缓存 1 小时           |
| IAM token 刷新  | 每小时                    |

<Note>
bearer token 与标准 [Amazon Bedrock](/providers/bedrock) 提供程序使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。
</Note>

### 支持的区域

`us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`.

## 手动配置

如果您更喜欢显式配置而不是自动发现：

```json5
{
  models: {
    providers: {
      "amazon-bedrock-mantle": {
        baseUrl: "https://bedrock-mantle.us-east-1.api.aws/v1",
        api: "openai-completions",
        auth: "api-key",
        apiKey: "env:AWS_BEARER_TOKEN_BEDROCK",
        models: [
          {
            id: "gpt-oss-120b",
            name: "GPT-OSS 120B",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32000,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="推理支持">
    推理支持是根据包含 `thinking`、`reasoner` 或 `gpt-oss-120b` 等模式的模型 ID 推断出来的。在发现过程中，OpenClaw 会自动为匹配的模型设置 `reasoning: true`。
  </Accordion>

  <Accordion title="端点不可用">
    如果 Mantle 端点不可用或没有返回模型，该提供程序将被静默跳过。OpenClaw 不会报错；其他配置的提供程序将继续正常工作。
  </Accordion>

  <Accordion title="通过 Anthropic Messages 路由使用 Claude Opus 4.7">
    Mantle 还公开了一个 Anthropic Messages 路由，通过相同的 bearer 认证流式路径传递 Claude 模型。Claude Opus 4.7（`amazon-bedrock-mantle/claude-opus-4.7`）可通过此路由调用，并使用提供程序自有的流式传输，因此 AWS bearer token 不会被视为 Anthropic API 密钥。

    当您在 Mantle 提供程序上固定一个 Anthropic Messages 模型时，OpenClaw 会针对该模型使用 `anthropic-messages` API 接口而不是 `openai-completions`。身份验证仍来自 `AWS_BEARER_TOKEN_BEDROCK`（或生成的 IAM bearer token）。

    ```json5
    {
      models: {
        providers: {
          "amazon-bedrock-mantle": {
            models: [
              {
                id: "claude-opus-4.7",
                name: "Claude Opus 4.7",
                api: "anthropic-messages",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 1000000,
                maxTokens: 32000,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="与 Amazon Bedrock 提供程序的关系">
    Bedrock Mantle 是一个独立于标准
    [Amazon Bedrock](/providers/bedrock) 提供程序的提供程序。Mantle 使用
    兼容 OpenAI 的 `/v1` 接口，而标准 Bedrock 提供程序使用
    原生 Bedrock API。

    当存在时，两个提供程序共享相同的 `AWS_BEARER_TOKEN_BEDROCK` 凭证。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/providers/bedrock" icon="cloud">
    用于 Anthropic Claude、Titan 和其他模型的原生 Bedrock 提供程序。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth 和身份验证" href="/gateway/authentication" icon="key">
    身份验证详情和凭证重用规则。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
