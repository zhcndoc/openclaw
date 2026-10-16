---
summary: "使用 Amazon Bedrock 地幔 OpenAI- 兼容和 Claude 消息模型与 OpenClaw"
read_when:
  - "您想要将基岩地幔托管的 OSS 模型与 OpenClaw 一起使用"
  - "您需要 GPT-OSS、Qwen、Kimi 或 GLM 的 Mantle OpenAI- 兼容端点"
  - "您想要使用 Claude Opus 5、Sonnet 5 或神话 5 到 Amazon Bedrock 地幔"
title: "Amazon Bedrock 地幔"
---

OpenClaw 包括一个捆绑的 **Amazon Bedrock Mantle** 提供程序，该提供程序连接到 Mantle OpenAI- 兼容端点。 Mantle 通过 Bedrock 基础设施支持的标准 `/v1/chat/completions` 表面托管开源和第三方模型（GPT-OSS、Qwen、Kimi、GLM 等）。 Mantle 还通过 Anthropic 消息路由公开 Anthropic Claude 模型。

| 属性       | 值                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| 提供商 ID    | `amazon-bedrock-mantle`                                                                |
| API            | `openai-completions` 适用于已发现的 OSS 模型，`anthropic-messages` 适用于 Claude 模型 |
| 认证           | 显式 `AWS_BEARER_TOKEN_BEDROCK` 或 IAM 凭证链不记名令牌生成    |
| 默认区域 | `us-east-1`（用 `AWS_REGION` 或 `AWS_DEFAULT_REGION` 覆盖）                       |

## <a id="getting-started"></a> 入门

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab id="explicit-bearer-token" title="显式不记名令牌">
    **最适合：** 你已经拥有 Mantle bearer token 的环境。

    <Steps>
      <Step id="set-the-bearer-token-on-the-gateway-host" title="在网关主机上设置承载令牌">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        可选地设置区域（默认值为 `us-east-1`）：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step id="verify-models-are-discovered" title="验证模型是否被发现">
        ```bash
        openclaw models list
        ```

        发现的模型会显示在 `amazon-bedrock-mantle` 提供程序下。除非你想覆盖默认值，否则不需要额外配置。
      </Step>
    </Steps>

  </Tab>

  <Tab id="iam-credentials" title="IAM 凭证">
    **最适合：使用 AWS SDK- 兼容凭证的**（共享配置、SSO、Web 身份、实例或任务角色）。

    <Steps>
      <Step id="configure-aws-credentials-on-the-gateway-host" title="在网关主机上配置 AWS 凭据">
        任何 AWS SDK- 兼容的身份验证源都可以工作：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step id="verify-models-are-discovered-1" title="验证模型是否被发现">
        ```bash
        openclaw models list
        ```

        OpenClaw 会自动从凭证链生成 Mantle bearer token。
      </Step>
    </Steps>

    <Tip>
    当未设置 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会从 AWS 默认凭证链为您铸造不记名令牌，包括共享 credentials/config 配置文件、SSO、Web 身份以及实例或任务角色。
    </Tip>

  </Tab>
</Tabs>

## <a id="automatic-model-discovery"></a> 自动模型发现

当设置了 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会直接使用它。否则， OpenClaw 会尝试从 AWS 默认凭证链生成 Mantle bearer token。然后它会通过查询该区域的 `/v1/models` 端点来发现可用的 Mantle 模型。

| 行为          | 详情                                                              |
| ----------------- | ------------------------------------------------------------------- |
| 发现缓存   | 同一区域和持有者凭证的结果缓存 1 小时 |
| IAM token 刷新 | 每 2 小时一次，按每个区域缓存                                    |

刷新失败报告不可用或拒绝目录访问。该目录保留了与该故障状态兼容的最后好的模型；过期的发现数据不会成为成功刷新。成功的空响应将清除已发现的成员资格。失败后恢复端点访问并再次刷新。

该插件的公共发现帮助程序保留其 v2026.9.2 咨询默认值：在失败时可以返回相同凭证的陈旧行，并且隐式解析对于空结果返回 `null`。编程调用者可以传递 `discoveryMode: "strict"` 来进行失败传播和成功的空提供程序结果。捆绑的目录挂钩始终选择该严格模式。

要保持 Mantle 插件启用，但禁止自动发现和 IAM bearer token 生成，请禁用由插件拥有的发现开关：

```bash
openclaw config set plugins.entries.amazon-bedrock-mantle.config.discovery.enabled false
```

<Note>
bearer token 与标准 [Amazon Bedrock](/providers/bedrock) 提供程序使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。
</Note>

### <a id="supported-regions"></a> 支持的区域

`us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`.

## <a id="manual-configuration"></a> 手动配置

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

显式非空 `models` 列表控制成员资格并替换发现的行，包括下面的 Claude 行。对于匹配的行，显式的 `input` 获胜；当源行省略 `input` 时，发现可以填充该功能元数据。省略 `models` 以保留自动 Mantle 目录，或包含您要使用的完整 Claude 模型条目。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="reasoning-support" title="推理支持">
    推理支持是从包含 `thinking`、`reasoner`、`reasoning`、`deepseek.r`、`gpt-oss-120b` 或 `gpt-oss-safeguard-120b` 等模式的模型 ID 推断出来的。 OpenClaw 在发现期间自动设置 `reasoning: true` 以匹配模型。
  </Accordion>

  <Accordion id="endpoint-unavailability" title="端点不可用">
    失败的端点请求报告不可用或拒绝目录访问。兼容的最后好模型仍以该故障状态列出。成功的空响应将清除已发现的成员资格。如果无法解析不记名令牌，则不会尝试发现并跳过隐式提供程序。其他配置的提供程序继续正常工作。
  </Accordion>

  <Accordion id="claude-via-the-anthropic-messages-route" title="Claude 通过 Anthropic 消息路由">
    当自动发现拥有模型列表时，OpenClaw 在成功返回至少一个模型的 `/v1/models` 查找后附加 5 个 Claude 模型：`amazon-bedrock-mantle/anthropic.claude-opus-5` （Claude Opus 5）、`amazon-bedrock-mantle/anthropic.claude-sonnet-5` （Claude Sonnet 5）、`amazon-bedrock-mantle/anthropic.claude-opus-4-7` （Claude Opus 4.7） 和 `amazon-bedrock-mantle/anthropic.claude-mythos-5` （Claude 神话 5） 以及 `amazon-bedrock-mantle/anthropic.claude-mythos-preview` （Claude 神话预览）。它们使用 `anthropic-messages` API 表面并通过相同的承载身份验证的 Anthropic- 兼容端点 （`<mantle-base>/anthropic`） 进行流式传输，因此 AWS 承载令牌不会被视为 Anthropic API 密钥。

    Claude Opus 5 发布了 1,000,000 个代币上下文窗口、128,000 个代币输出限制、图像输入和 `$5/$25` input/output 定价。适应性思维默认为`high`； `/think off` 禁用思考，而 `/think xhigh|max` 使用模型的本机努力水平。 OpenClaw 省略调用者选择的采样参数。

    Claude Sonnet 5 始终使用适应性思维并默认为 `high` 努力。 `/think off`和`/think minimal`映射到`low`，因为Mantle路线不能禁用思维。 OpenClaw 还省略了 Sonnet 5 请求的自定义温度。

    Claude Mythos 5 为限量访问。它提供 1,000,000 token 的上下文窗口和 128,000 token 的输出上限， 始终使用自适应思考，`/think off` 和 `/think minimal` 映射为 `low`， 并省略调用方选择的采样参数。

    Claude Mythos Preview 始终请求推理，当未设置 `/think` 级别时，默认为 `high` 工作量（从 `xhigh`/`max` 向下映射到 `high`，从 `minimal` 向上映射到 `low`）。 Mantle 流上的 Opus 4.7 没有模型提供的推理，并且 OpenClaw 省略了其 `temperature` 参数，因为 Opus 4.7 不接受此路由上的采样覆盖； Mythos Preview 通常接受 `temperature` 覆盖。

    非空显式 `models.providers["amazon-bedrock-mantle"].models` 列表控制成员资格并替换完整的已发现目录。仅当源行省略它时，匹配行才能继承发现的 `input` 功能。当您需要这些内置 Claude 行时，请忽略该列表。

  </Accordion>

  <Accordion id="relationship-to-amazon-bedrock-provider" title="与 Amazon Bedrock 提供商的关系">
    Bedrock Mantle 是独立于标准 [Amazon Bedrock](/providers/bedrock) 提供程序的提供程序。 Mantle 在其 OSS 目录中使用 OpenAI- 兼容的 `/v1` 表面，而标准 Bedrock 提供程序则使用本机 Bedrock Converse API。

    当存在时，这两个提供程序共享同一个 `AWS_BEARER_TOKEN_BEDROCK` 凭证。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/providers/bedrock" icon="cloud">
    用于 Anthropic Claude、Titan 和其他模型的原生 Bedrock 提供程序。
  </Card>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth 并授权" href="/gateway/authentication" icon="key">
    身份验证详细信息和凭证重用规则。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
