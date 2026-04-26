---
summary: "使用 Amazon Bedrock（Converse API）模型与 OpenClaw"
read_when:
  - 您希望使用带有 OpenClaw 的 Amazon Bedrock 模型
  - 您需要为模型调用配置 AWS 凭证/区域
title: "Amazon Bedrock"
---

OpenClaw 可以通过 pi-ai 的 **Bedrock Converse** 流提供程序使用 **Amazon Bedrock** 模型。Bedrock 认证使用 **AWS SDK 默认凭证链**，而不是 API 密钥。

| 属性 | 值                                                       |
| -------- | ----------------------------------------------------------- |
| 提供商 | `amazon-bedrock`                                            |
| API      | `bedrock-converse-stream`                                   |
| 认证     | AWS 凭证（环境变量、共享配置或实例角色） |
| 区域   | `AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`） |

## 开始使用

选择您首选的认证方法并按照设置步骤操作。

<Tabs>
  <Tab title="访问密钥 / 环境变量">
    **适用于：** 开发者机器、CI 或直接管理 AWS 凭证的主机。

    <Steps>
      <Step title="在网关主机上设置 AWS 凭证">
        ```bash
        export AWS_ACCESS_KEY_ID="AKIA..."
        export AWS_SECRET_ACCESS_KEY="..."
        export AWS_REGION="us-east-1"
        # 可选：
        export AWS_SESSION_TOKEN="..."
        export AWS_PROFILE="your-profile"
        # 可选（Bedrock API 密钥/持有者令牌）：
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```
      </Step>
      <Step title="将 Bedrock 提供商和模型添加到您的配置">
        不需要 `apiKey`。使用 `auth: "aws-sdk"` 配置提供商：

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
    当使用环境变量标记认证（`AWS_ACCESS_KEY_ID`、`AWS_PROFILE` 或 `AWS_BEARER_TOKEN_BEDROCK`）时，OpenClaw 会自动启用隐式 Bedrock 提供商进行模型发现，无需额外配置。
    </Tip>

  </Tab>

  <Tab title="EC2 实例角色 (IMDS)">
    **适用于：** 附加了 IAM 角色的 EC2 实例，使用实例元数据进行认证。

    <Steps>
      <Step title="显式启用发现">
        使用 IMDS 时，OpenClaw 无法仅从环境变量标记检测 AWS 认证，因此您必须选择加入：

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step title="可选：为自动模式添加环境变量标记">
        如果您也希望环境变量标记自动检测路径生效（例如，用于 `openclaw status` 显示）：

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        您**不**需要假的 API 密钥。
      </Step>
      <Step title="验证模型是否已发现">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    附加到您的 EC2 实例的 IAM 角色必须具有以下权限：

    - `bedrock:InvokeModel`
    - `bedrock:InvokeModelWithResponseStream`
    - `bedrock:ListFoundationModels`（用于自动发现）
    - `bedrock:ListInferenceProfiles`（用于推理配置文件发现）

    或者附加托管策略 `AmazonBedrockFullAccess`。
    </Warning>

    <Note>
    仅当您特别需要环境变量标记用于自动模式或状态显示时，才需要 `AWS_PROFILE=default`。实际的 Bedrock 运行时认证路径使用 AWS SDK 默认链，因此即使没有环境变量标记，IMDS 实例角色认证也能工作。
    </Note>

  </Tab>
</Tabs>

## 自动模型发现

OpenClaw 可以自动发现支持**流式传输**和**文本输出**的 Bedrock 模型。发现过程使用 `bedrock:ListFoundationModels` 和 `bedrock:ListInferenceProfiles`，结果会被缓存（默认：1 小时）。

隐式提供商的启用方式：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 为 `true`，即使没有 AWS 环境变量标记，OpenClaw 也会尝试发现。
- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 未设置，仅当 OpenClaw 看到以下 AWS 认证标记之一时，才会自动添加隐式 Bedrock 提供商：`AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` 或 `AWS_PROFILE`。
- 实际的 Bedrock 运行时认证路径仍然使用 AWS SDK 默认链，因此即使发现需要 `enabled: true` 来选择加入，共享配置、SSO 和 IMDS 实例角色认证也可以工作。

<Note>
对于显式的 `models.providers["amazon-bedrock"]` 条目，OpenClaw 仍然可以从 AWS 环境变量标记（如 `AWS_BEARER_TOKEN_BEDROCK`）早期解析 Bedrock 环境变量标记认证，而无需强制加载完整的运行时认证。实际的模型调用认证路径仍然使用 AWS SDK 默认链。
</Note>

<AccordionGroup>
  <Accordion title="发现配置选项">
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

    | 选项 | 默认值 | 描述 |
    | ------ | ------- | ----------- |
    | `enabled` | auto | 在自动模式下，仅当 OpenClaw 看到支持的 AWS 环境变量标记时，才会启用隐式 Bedrock 提供商。设置为 `true` 以强制发现。 |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | 用于发现 API 调用的 AWS 区域。 |
    | `providerFilter` | (all) | 匹配 Bedrock 提供商名称（例如 `anthropic`, `amazon`）。 |
    | `refreshInterval` | `3600` | 缓存持续时间（秒）。设置为 `0` 以禁用缓存。 |
    | `defaultContextWindow` | `32000` | 用于发现模型的上下文窗口（如果您知道模型限制，可覆盖）。 |
    | `defaultMaxTokens` | `4096` | 用于发现模型的最大输出 token（如果您知道模型限制，可覆盖）。 |

  </Accordion>
</AccordionGroup>

## 快速设置（AWS 路径）

本指南将创建一个 IAM 角色，附加 Bedrock 权限，关联实例配置文件，并在 EC2 主机上启用 OpenClaw 发现。

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

# 2. 关联到您的 EC2 实例
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. 在 EC2 实例上，显式启用发现
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# 4. 可选：如果您想要自动模式而无需显式启用，请添加环境变量标记
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. 验证模型是否已发现
openclaw models list
```

## 高级配置

<AccordionGroup>
  <Accordion title="推理配置文件">
    OpenClaw 会发现**区域和全局推理配置文件**以及基础模型。当配置文件映射到已知的基础模型时，该配置文件会继承该模型的功能（上下文窗口、最大 token、推理、视觉），并自动注入正确的 Bedrock 请求区域。这意味着跨区域 Claude 配置文件无需手动提供商覆盖即可工作。

    推理配置文件 ID 类似于 `us.anthropic.claude-opus-4-6-v1:0`（区域）或 `anthropic.claude-opus-4-6-v1:0`（全局）。如果支持模型已在发现结果中，配置文件将继承其完整功能集；否则应用安全默认值。

    不需要额外配置。只要启用了发现且 IAM 主体具有 `bedrock:ListInferenceProfiles`，配置文件就会与基础模型一起出现在 `openclaw models list` 中。

  </Accordion>

  <Accordion title="护栏">
    您可以通过向 `amazon-bedrock` 插件配置添加 `guardrail` 对象，将 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) 应用于所有 Bedrock 模型调用。护栏让您能够强制执行内容过滤、主题拒绝、单词过滤、敏感信息过滤和上下文基础检查。

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              guardrail: {
                guardrailIdentifier: "abc123", // 护栏 ID 或完整 ARN
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

    | 选项 | 必需 | 描述 |
    | ------ | -------- | ----------- |
    | `guardrailIdentifier` | 是 | 护栏 ID（例如 `abc123`）或完整 ARN（例如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`）。 |
    | `guardrailVersion` | 是 | 发布的版本号，或工作草稿的 `"DRAFT"`。 |
    | `streamProcessingMode` | 否 | 流式传输期间护栏评估的 `"sync"` 或 `"async"`。如果省略，Bedrock 使用其默认值。 |
    | `trace` | 否 | 调试用的 `"enabled"` 或 `"enabled_full"`；生产环境省略或设置为 `"disabled"`。 |

    <Warning>
    网关使用的 IAM 主体除了标准调用权限外，还必须具有 `bedrock:ApplyGuardrail` 权限。
    </Warning>

  </Accordion>

  <Accordion title="用于记忆搜索的嵌入">
    Bedrock 还可以作为 [记忆搜索](/concepts/memory-search) 的嵌入提供商。这与推理提供商分开配置——将 `agents.defaults.memorySearch.provider` 设置为 `"bedrock"`：

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

    Bedrock 嵌入使用与推理相同的 AWS SDK 凭证链（实例角色、SSO、访问密钥、共享配置和 Web 身份）。不需要 API 密钥。当 `provider` 为 `"auto"` 时，如果该凭证链成功解析，则会自动检测 Bedrock。

    支持的嵌入模型包括 Amazon Titan Embed (v1, v2)、Amazon Nova Embed、Cohere Embed (v3, v4) 和 TwelveLabs Marengo。请参阅 [记忆配置参考 -- Bedrock](/reference/memory-config#bedrock-embedding-config) 获取完整的模型列表和维度选项。

  </Accordion>

  <Accordion title="注意事项">
    - Bedrock 要求您的 AWS 账户/区域中启用了**模型访问**。
    - 自动发现需要 `bedrock:ListFoundationModels` 和 `bedrock:ListInferenceProfiles` 权限。
    - 如果您依赖自动模式，请在网关主机上设置支持的 AWS 认证环境变量标记之一。如果您更喜欢没有环境变量标记的 IMDS/共享配置认证，请设置 `plugins.entries.amazon-bedrock.config.discovery.enabled: true`。
    - OpenClaw 按以下顺序显示凭证来源：`AWS_BEARER_TOKEN_BEDROCK`，然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然后是 `AWS_PROFILE`，最后是默认 AWS SDK 链。
    - 推理支持取决于模型；检查 Bedrock 模型卡片以了解当前功能。
    - 如果您更喜欢托管密钥流程，也可以在 Bedrock 前面放置一个 OpenAI 兼容代理，并将其配置为 OpenAI 提供商。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="记忆搜索" href="/concepts/memory-search" icon="magnifying-glass">
    用于记忆搜索配置的 Bedrock 嵌入。
  </Card>
  <Card title="记忆配置参考" href="/reference/memory-config#bedrock-embedding-config" icon="database">
    完整的 Bedrock 嵌入模型列表和维度选项。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题解答。
  </Card>
</CardGroup>