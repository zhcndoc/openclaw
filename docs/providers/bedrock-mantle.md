---
summary: "将 Amazon Bedrock Mantle（与 OpenAI 兼容）模型与 OpenClaw 一起使用"
read_when:
  - 你想将 Bedrock Mantle 托管的 OSS 模型与 OpenClaw 一起使用
  - 你需要用于 GPT-OSS、Qwen、Kimi 或 GLM 的 Mantle OpenAI 兼容端点
title: "Amazon Bedrock Mantle"
---

OpenClaw 包含一个内置的 **Amazon Bedrock Mantle** 提供方，可连接到
Mantle OpenAI 兼容端点。Mantle 通过由 Bedrock 基础设施支持的标准
`/v1/chat/completions` 接口提供开源和第三方模型（GPT-OSS、Qwen、Kimi、GLM 等）。
Mantle 还通过 Anthropic Messages 路由公开了两个 Anthropic Claude 模型。

| Property       | Value                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Provider ID    | `amazon-bedrock-mantle`                                                                        |
| API            | `openai-completions` for discovered OSS models, `anthropic-messages` for the two Claude models |
| Auth           | Explicit `AWS_BEARER_TOKEN_BEDROCK` or IAM credential-chain bearer-token generation            |
| Default region | `us-east-1` (override with `AWS_REGION` or `AWS_DEFAULT_REGION`)                               |

## 入门

选择你偏好的认证方式并按照设置步骤进行。

<Tabs>
  <Tab title="显式 bearer token">
    **最适合：** 你已经拥有 Mantle bearer token 的环境。

    <Steps>
      <Step title="在网关主机上设置 bearer token">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        可选地设置区域（默认值为 `us-east-1`）：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型已被发现">
        ```bash
        openclaw models list
        ```

        发现的模型会显示在 `amazon-bedrock-mantle` 提供程序下。除非你想覆盖默认值，否则不需要额外配置。
      </Step>
    </Steps>

  </Tab>

  <Tab title="IAM 凭证">
    **最适合：** 使用与 AWS SDK 兼容的凭证（共享配置、SSO、Web Identity、实例或任务角色）。

    <Steps>
      <Step title="在网关主机上配置 AWS 凭证">
        任何与 AWS SDK 兼容的认证源都可以：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型已被发现">
        ```bash
        openclaw models list
        ```

        OpenClaw 会自动从凭证链生成 Mantle bearer token。
      </Step>
    </Steps>

    <Tip>
    当未设置 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会从 AWS 默认凭证链为你生成 bearer token，包括共享凭证/配置文件、SSO、Web Identity，以及实例或任务角色。
    </Tip>

  </Tab>
</Tabs>

## 自动模型发现

当设置了 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会直接使用它。否则，
OpenClaw 会尝试从 AWS 默认凭证链生成 Mantle bearer token。然后它会通过查询
该区域的 `/v1/models` 端点来发现可用的 Mantle 模型。

| 行为              | 详情                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| 发现缓存          | 结果会按每个区域缓存 1 小时；获取失败时返回上次缓存的结果 |
| IAM token 刷新    | 每 2 小时一次，按每个区域缓存                                                     |

要保持 Mantle 插件启用，但禁止自动发现和 IAM
bearer token 生成，请禁用由插件拥有的发现开关：

```bash
openclaw config set plugins.entries.amazon-bedrock-mantle.config.discovery.enabled false
```

<Note>
bearer token 与标准 [Amazon Bedrock](/providers/bedrock) 提供程序使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。
</Note>

### 支持的区域

`us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`。

## 手动配置

如果你更喜欢显式配置而不是自动发现：

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
    推理支持是根据模型 ID 中包含的模式推断出来的，例如
    `thinking`、`reasoner`、`reasoning`、`deepseek.r`、`gpt-oss-120b` 或
    `gpt-oss-safeguard-120b`。OpenClaw 在发现阶段会自动为匹配的模型设置
    `reasoning: true`。
  </Accordion>

  <Accordion title="端点不可用">
    如果 Mantle 端点不可用、未返回任何模型，或者 bearer token 解析失败，
    则发现过程会返回空结果，并跳过隐式提供程序。OpenClaw 不会报错；其他已配置的提供程序
    会继续正常工作。
  </Accordion>

  <Accordion title="通过 Anthropic Messages 路由使用 Claude Opus 4.7 和 Claude Mythos Preview">
    无论 `/v1/models` 返回什么，OpenClaw 在成功发现后都会始终向 Mantle 目录附加两个 Claude 模型：
    `amazon-bedrock-mantle/anthropic.claude-opus-4-7`（Claude Opus 4.7）和
    `amazon-bedrock-mantle/anthropic.claude-mythos-preview`（Claude Mythos Preview）。这两个模型都使用
    `anthropic-messages` API 形式，并通过同一个带 bearer 认证的 Anthropic 兼容端点
    （`<mantle-base>/anthropic`）进行流式传输，因此 AWS bearer token 不会被视为
    Anthropic API key。

    Claude Mythos Preview 始终请求推理；如果未设置 `/think` 级别，则默认使用 `high`
    effort（从 `xhigh`/`max` 映射到 `high`，并将 `minimal` 提升到 `low`）。Mantle 上的 Opus 4.7
    以不包含模型提供推理的方式进行流式传输，并且 OpenClaw 会省略其 `temperature`
    参数，因为 Opus 4.7 在此路由上不接受采样覆盖；Mythos Preview 则通常接受
    `temperature` 覆盖。

    这两个模型不能通过 `models.providers["amazon-bedrock-mantle"].models`
    条目进行配置——它们在发现成功时总是会被自动添加，并且只有通过完全禁用发现
    才会被移除。

  </Accordion>

  <Accordion title="与 Amazon Bedrock 提供程序的关系">
    Bedrock Mantle 是一个独立于标准
    [Amazon Bedrock](/providers/bedrock) 提供程序的提供程序。Mantle 为其 OSS 目录使用
    兼容 OpenAI 的 `/v1` 接口，而标准 Bedrock 提供程序使用原生的 Bedrock Converse API。

    当存在时，这两个提供程序共享同一个 `AWS_BEARER_TOKEN_BEDROCK` 凭证。

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
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详情和凭证复用规则。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
