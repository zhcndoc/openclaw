---
summary: "将 Amazon Bedrock（Converse API）模型与 OpenClaw 一起使用"
read_when:
  - 你想将 Amazon Bedrock 模型与 OpenClaw 一起使用
  - 你需要为模型调用配置 AWS 凭证/区域
title: "Amazon Bedrock"
---

OpenClaw 可以通过其 **Bedrock Converse** 流式 provider 使用 **Amazon Bedrock** 模型。Bedrock 身份验证使用 **AWS SDK 默认凭证链**，而不是 API 密钥。

| Property | Value                                                       |
| -------- | ----------------------------------------------------------- |
| Provider | `amazon-bedrock`                                            |
| API      | `bedrock-converse-stream`                                   |
| Auth     | AWS 凭证（环境变量、共享配置或实例角色）                   |
| Region   | `AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`）   |

## 入门

选择你偏好的身份验证方式并按步骤完成设置。

<Tabs>
  <Tab title="Access keys / env vars">
    **最适合：** 开发机、CI，或你直接管理 AWS 凭证的主机。

    <Steps>
      <Step title="在网关主机上设置 AWS 凭证">
        ```bash
        export AWS_ACCESS_KEY_ID="EXAMPLE_AWS_ACCESS_KEY_ID"
        export AWS_SECRET_ACCESS_KEY="..."
        export AWS_REGION="us-east-1"
        # 可选：
        export AWS_SESSION_TOKEN="..."
        export AWS_PROFILE="your-profile"
        # 可选（Bedrock API 密钥/持有者令牌）：
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```
      </Step>
      <Step title="在你的配置中添加 Bedrock provider 和 model">
        不需要 `apiKey`。使用 `auth: "aws-sdk"` 配置 provider：

        ```json5
        {
          models: {
            providers: {
              "amazon-bedrock": {
                baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
                api: "bedrock-converse-stream",
                auth: "aws-sdk",
                models: [
                  {
                    id: "us.anthropic.claude-opus-4-6-v1:0",
                    name: "Claude Opus 4.6 (Bedrock)",
                    reasoning: true,
                    input: ["text", "image"],
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                    contextWindow: 200000,
                    maxTokens: 8192,
                  },
                ],
              },
            },
          },
          agents: {
            defaults: {
              model: { primary: "amazon-bedrock/us.anthropic.claude-opus-4-6-v1:0" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Tip>
    使用 env-marker 身份验证（`AWS_ACCESS_KEY_ID`、`AWS_PROFILE` 或 `AWS_BEARER_TOKEN_BEDROCK`）时，OpenClaw 会自动启用隐式 Bedrock provider 进行模型发现，无需额外配置。
    </Tip>

  </Tab>

  <Tab title="EC2 instance roles (IMDS)">
    **最适合：** 绑定了 IAM 角色的 EC2 实例，使用实例元数据服务进行身份验证。

    <Steps>
      <Step title="显式启用发现">
        使用 IMDS 时，OpenClaw 不能仅从 env marker 检测到 AWS 身份验证，因此你必须显式启用：

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step title="可选：添加 env marker 以启用自动模式">
        如果你还希望 env-marker 自动检测路径生效（例如用于 `openclaw status` 展示）：

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        你**不需要**伪造的 API 密钥。
      </Step>
      <Step title="验证模型是否已发现">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    绑定到你的 EC2 实例的 IAM 角色必须具有以下权限：

    - `bedrock:InvokeModel`
    - `bedrock:InvokeModelWithResponseStream`
    - `bedrock:ListFoundationModels`（用于自动发现）
    - `bedrock:ListInferenceProfiles`（用于推理配置文件发现）

    或者附加托管策略 `AmazonBedrockFullAccess`。
    </Warning>

    <Note>
    只有当你特别希望为自动模式或状态展示提供 env marker 时，才需要 `AWS_PROFILE=default`。实际的 Bedrock 运行时身份验证路径使用 AWS SDK 默认链，因此即使没有 env marker，IMDS 实例角色身份验证也能工作。
    </Note>

  </Tab>
</Tabs>

## 自动模型发现

OpenClaw 可以自动发现支持 **流式输出** 和 **文本输出** 的 Bedrock 模型。发现过程使用 `bedrock:ListFoundationModels` 和 `bedrock:ListInferenceProfiles`，结果会被缓存（默认：1 小时）。

隐式 provider 的启用方式：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 为 `true`，
  即使没有 AWS env marker，OpenClaw 也会尝试发现。
- 如果未设置 `plugins.entries.amazon-bedrock.config.discovery.enabled`，
  OpenClaw 只会在检测到以下 AWS 身份验证标记之一时自动添加
  隐式 Bedrock provider：
  `AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY`，或 `AWS_PROFILE`。
- 实际的 Bedrock 运行时身份验证路径仍然使用 AWS SDK 默认链，因此
  即使发现过程需要通过 `enabled: true` 显式启用，共享配置、SSO 和 IMDS 实例角色身份验证也可以正常工作。

<Note>
对于显式的 `models.providers["amazon-bedrock"]` 条目，OpenClaw 仍然可以从 AWS env marker（例如 `AWS_BEARER_TOKEN_BEDROCK`）提前解析 Bedrock env-marker 身份验证，而无需强制加载完整的运行时身份验证。实际的模型调用身份验证路径仍然使用 AWS SDK 默认链。
</Note>

<AccordionGroup>
  <Accordion title="Discovery config options">
    配置选项位于 `plugins.entries.amazon-bedrock.config.discovery` 下：

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              discovery: {
                enabled: true,
                region: "us-east-1",
                providerFilter: ["anthropic", "amazon"],
                refreshInterval: 3600,
                defaultContextWindow: 32000,
                defaultMaxTokens: 4096,
              },
            },
          },
        },
      },
    }
    ```

    | Option | Default | Description |
    | ------ | ------- | ----------- |
    | `enabled` | auto | 在自动模式下，OpenClaw 只有在检测到受支持的 AWS env marker 时才启用隐式 Bedrock provider。设置为 `true` 可强制发现。 |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | 用于发现 API 调用的 AWS 区域。 |
    | `providerFilter` | (all) | 匹配 Bedrock provider 名称（例如 `anthropic`、`amazon`）。 |
    | `refreshInterval` | `3600` | 缓存持续时间（秒）。设为 `0` 可禁用缓存。 |
    | `defaultContextWindow` | `32000` | 用于已发现模型的上下文窗口（如果你知道模型限制，可覆盖）。 |
    | `defaultMaxTokens` | `4096` | 用于已发现模型的最大输出 tokens（如果你知道模型限制，可覆盖）。 |

  </Accordion>
</AccordionGroup>

## 快速设置（AWS 路径）

此流程会创建 IAM 角色、附加 Bedrock 权限、关联实例配置文件，并在 EC2 主机上启用 OpenClaw 发现功能。

```bash
# 1. 创建 IAM 角色和实例配置文件
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. 关联到你的 EC2 实例
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. 在 EC2 实例上显式启用发现
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# 4. 可选：如果你希望在不显式启用的情况下使用自动模式，可添加 env marker
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. 验证模型是否已发现
openclaw models list
```

## 高级配置

<AccordionGroup>
  <Accordion title="Inference profiles">
    OpenClaw 会与基础模型一起发现 **区域和全局推理配置文件**。当某个配置文件映射到已知的基础模型时，该配置文件会继承该模型的能力（上下文窗口、最大 tokens、推理、视觉），并且会自动注入正确的 Bedrock 请求区域。这意味着跨区域 Claude 配置文件无需手动覆盖 provider 即可工作。

    推理配置文件 ID 形式如 `us.anthropic.claude-opus-4-6-v1:0`（区域）或 `anthropic.claude-opus-4-6-v1:0`（全局）。如果底层模型已经出现在发现结果中，配置文件会继承其完整能力集；否则将应用安全默认值。

    无需额外配置。只要启用了发现，并且 IAM 主体具有 `bedrock:ListInferenceProfiles`，配置文件就会与基础模型一起出现在 `openclaw models list` 中。

  </Accordion>

  <Accordion title="Service tier">
    某些 Bedrock 模型支持 `service_tier` 参数，用于优化成本
    或延迟。可用的层级如下：

    | Tier | Description |
    |------|-------------|
    | `default` | 标准 Bedrock 层级 |
    | `flex` | 适用于可接受更长延迟的工作负载的折扣处理 |
    | `priority` | 适用于对延迟敏感的工作负载的优先处理 |
    | `reserved` | 适用于稳定态工作负载的预留容量 |

    通过 `agents.defaults.params` 为
    Bedrock 模型请求设置 `serviceTier`（或 `service_tier`），或者在
    `agents.defaults.models["<model-key>"].params` 中按模型设置：

    ```json5
    {
      agents: {
        defaults: {
          params: {
            serviceTier: "flex", // 适用于所有模型
          },
          models: {
            "amazon-bedrock/mistral.mistral-large-3-675b-instruct": {
              params: {
                serviceTier: "priority", // 按模型覆盖
              },
            },
          },
        },
      },
    }
    ```

    有效值为 `default`、`flex`、`priority` 和 `reserved`。并非所有
    模型都支持所有层级——如果请求了不受支持的层级，Bedrock 将
    返回校验错误。注意：错误信息可能有些误导；
    它可能会显示“所提供的模型标识符无效”，而不是指出
    不支持的服务层级。如果看到此错误，请检查模型是否
    支持所请求的层级。

  </Accordion>

  <Accordion title="Claude Opus 4.7 temperature">
    Bedrock 会拒绝 Claude Opus 4.7 的 `temperature` 参数。OpenClaw 会自动省略任何 Opus 4.7 Bedrock 引用的 `temperature`，包括基础模型 id、命名推理配置文件、其底层模型通过 `bedrock:GetInferenceProfile` 解析为 Opus 4.7 的应用推理配置文件，以及带可选区域前缀（`us.`、`eu.`、`ap.`、`apac.`、`au.`、`jp.`、`global.`）的带点形式 `opus-4.7` 变体。无需配置开关，该省略同时适用于请求 options 对象和 `inferenceConfig` 负载字段。
  </Accordion>

  <Accordion title="Claude Fable 5">
    在 `us-east-1` 中使用 `amazon-bedrock/anthropic.claude-fable-5`，或使用
    区域推理 id，例如 `us.anthropic.claude-fable-5`。
    OpenClaw 会应用 Fable 的 100 万上下文窗口、128K 输出上限、始终开启的
    自适应思考，以及受支持的 effort 映射。`/think off` 和
    `/think minimal` 映射为 `low`；不支持的 temperature 和强制工具选择控制会被省略。
    流式输出会在 Bedrock 返回终态之前保持，避免中途拒绝时暴露部分文本。
    Fable 仅支持标准 service tier；OpenClaw 会忽略为此模型配置的
    `flex`、`priority` 和 `reserved` 层级。

    AWS 要求在 Fable 可用之前显式选择加入 `provider_data_share` 数据保留。
    提示和补全内容会与 Anthropic 共享，并最多保留 30 天用于信任与安全。
    在启用该模型前，请先查看并配置
    [Bedrock data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html)
    。

  </Accordion>

  <Accordion title="Guardrails">
    你可以通过在 `amazon-bedrock` 插件配置中添加一个 `guardrail` 对象，
    将 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
    应用于所有 Bedrock 模型调用。Guardrails 让你可以强制执行内容过滤、主题拒绝、词语过滤、敏感信息过滤和上下文约束检查。

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              guardrail: {
                guardrailIdentifier: "abc123", // guardrail ID 或完整 ARN
                guardrailVersion: "1", // 版本号或 "DRAFT"
                streamProcessingMode: "sync", // 可选："sync" 或 "async"
                trace: "enabled", // 可选："enabled"、"disabled" 或 "enabled_full"
              },
            },
          },
        },
      },
    }
    ```

    | Option | Required | Description |
    | ------ | -------- | ----------- |
    | `guardrailIdentifier` | Yes | Guardrail ID（例如 `abc123`）或完整 ARN（例如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`）。 |
    | `guardrailVersion` | Yes | 已发布版本号，或工作草稿使用 `"DRAFT"`。 |
    | `streamProcessingMode` | No | 流式处理期间用于 guardrail 评估的 `"sync"` 或 `"async"`。如果省略，Bedrock 将使用默认值。 |
    | `trace` | No | 用于调试的 `"enabled"` 或 `"enabled_full"`；生产环境中可省略或设为 `"disabled"`。 |

    <Warning>
    网关使用的 IAM 主体除了标准调用权限外，还必须具有 `bedrock:ApplyGuardrail` 权限。
    </Warning>

  </Accordion>

  <Accordion title="Embeddings for memory search">
    Bedrock 也可以作为 [memory search](/concepts/memory-search) 的 embedding provider。这与 inference provider 是分开配置的——将 `agents.defaults.memorySearch.provider` 设置为 `"bedrock"`：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "bedrock",
            model: "amazon.titan-embed-text-v2:0", // 默认
          },
        },
      },
    }
    ```

    Bedrock embeddings 使用与 inference 相同的 AWS SDK 凭证链（实例角色、SSO、访问密钥、共享配置和 web identity）。无需 API 密钥。显式设置 `memorySearch.provider: "bedrock"` 以使用 Bedrock embeddings。

    支持的 embedding 模型包括 Amazon Titan Embed（v1、v2）、Amazon Nova Embed、Cohere Embed（v3、v4）以及 TwelveLabs Marengo。有关完整的模型列表和维度选项，请参见
    [Memory configuration reference -- Bedrock](/reference/memory-config#bedrock-embedding-config)。

  </Accordion>

  <Accordion title="Notes and caveats">
    - Bedrock 需要在你的 AWS 账户/区域中启用 **model access**。
    - 自动发现需要 `bedrock:ListFoundationModels` 和
      `bedrock:ListInferenceProfiles` 权限。
    - 如果你依赖自动模式，请在网关主机上设置一个受支持的 AWS 身份验证 env marker。若你更希望在没有 env marker 的情况下使用 IMDS/共享配置身份验证，请设置
      `plugins.entries.amazon-bedrock.config.discovery.enabled: true`。
    - OpenClaw 会按以下顺序展示凭证来源：`AWS_BEARER_TOKEN_BEDROCK`，
      然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然后是 `AWS_PROFILE`，最后是
      默认 AWS SDK 链。
    - 推理支持取决于模型；请查看 Bedrock 模型卡以了解
      当前能力。
    - 如果你更偏好托管密钥流程，也可以在 Bedrock 前面放置一个兼容 OpenAI 的
      代理，并将其配置为 OpenAI provider。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Model selection" href="/concepts/model-providers" icon="layers">
    选择 provider、model 引用以及故障转移行为。
  </Card>
  <Card title="Memory search" href="/concepts/memory-search" icon="magnifying-glass">
    用于 memory search 配置的 Bedrock embeddings。
  </Card>
  <Card title="Memory config reference" href="/reference/memory-config#bedrock-embedding-config" icon="database">
    完整的 Bedrock embedding 模型列表和维度选项。
  </Card>
  <Card title="Troubleshooting" href="/help/troubleshooting" icon="wrench">
    常规故障排查和常见问题。
  </Card>
</CardGroup>