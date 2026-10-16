---
summary: "将 Amazon Bedrock（Converse API）模型与 OpenClaw 一起使用"
read_when:
  - "你想将 Amazon Bedrock 模型与 OpenClaw 一起使用"
  - "您需要 AWS credential/region 设置才能进行模型调用"
title: "Amazon Bedrock"
---

OpenClaw 可以通过其 **Bedrock Converse** 流式 provider 使用 **Amazon Bedrock** 模型。Bedrock 身份验证使用 **AWS SDK 默认凭证链**，而不是 API 密钥。

| 属性 | 值                                                       |
| -------- | ----------------------------------------------------------- |
| 提供者 | `amazon-bedrock`                                            |
| API      | `bedrock-converse-stream`                                   |
| 认证     | AWS 凭证（环境变量、共享配置或实例角色） |
| 区域   | `AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`） |

自定义提供商 ID（例如，`amazon-bedrock-east1`）可以使用 `api: "bedrock-converse-stream"` 和 `auth: "aws-sdk"`。他们激活相同的基岩插件。该区域来自所选提供商的标准 `bedrock-runtime.<region>.amazonaws.com` URL，然后是解析的模型 URL，然后是插件发现区域。如果没有其中之一，则应用 AWS SDK 区域环境和配置文件设置。自定义路由不会继承库存 `amazon-bedrock` 提供商的区域。

## <a id="getting-started"></a> 入门

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab id="access-keys-%2F-env-vars" title="访问键/环境变量">
    **最适合：** 开发机、CI，或你直接管理 AWS 凭证的主机。

    <Steps>
      <Step id="set-aws-credentials-on-the-gateway-host" title="在网关主机上设置 AWS 凭据">
        ```bash
        export AWS_ACCESS_KEY_ID="EXAMPLE_AWS_ACCESS_KEY_ID"
        export AWS_SECRET_ACCESS_KEY="..."
        export AWS_REGION="us-east-1"
        # Optional:
        export AWS_SESSION_TOKEN="..."
        export AWS_PROFILE="your-profile"
        # Optional (Bedrock API key/bearer token):
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```
      </Step>
      <Step id="add-a-bedrock-provider-and-model-to-your-config" title="将基岩提供商和模型添加到您的配置中">
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
                    id: "us.anthropic.claude-opus-4-6-v1",
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
              model: { primary: "amazon-bedrock/us.anthropic.claude-opus-4-6-v1" },
            },
          },
        }
        ```
      </Step>
      <Step id="verify-models-are-available" title="验证模型是否可用">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Tip>
    使用 env-marker 身份验证（`AWS_ACCESS_KEY_ID`、`AWS_PROFILE` 或 `AWS_BEARER_TOKEN_BEDROCK`）时，OpenClaw 会自动启用隐式 Bedrock provider 进行模型发现，无需额外配置。
    </Tip>

  </Tab>

  <Tab id="ec2-instance-roles-imds" title="EC2 实例角色 （IMDS）">
    **最适合：附加了 IAM 角色的** EC2 实例，使用实例元数据服务进行身份验证。

    <Steps>
      <Step id="enable-discovery-explicitly" title="显式启用发现">
        使用 IMDS 时，OpenClaw 不能仅从 env marker 检测到 AWS 身份验证，因此你必须显式启用：

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step id="optionally-add-an-env-marker-for-auto-mode" title="可以选择为自动模式添加环境标记">
        如果你还希望 env-marker 自动检测路径生效（例如用于 `openclaw status` 展示）：

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        你**不需要**伪造的 API 密钥。
      </Step>
      <Step id="verify-models-are-discovered" title="验证模型是否被发现">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    附加到 EC2 实例的 IAM 角色必须具有以下权限：

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

## <a id="automatic-model-discovery"></a> 自动模型发现

OpenClaw 可以自动发现支持 **流式输出** 和 **文本输出** 的 Bedrock 模型。发现过程使用 `bedrock:ListFoundationModels` 和 `bedrock:ListInferenceProfiles`，结果会被缓存（默认：1 小时）。

在 OpenClaw 缓存结果之前，两个列表（包括每个推理配置文件页面）都必须成功。刷新失败会报告不可用或拒绝目录访问，并保留兼容的最新模型。恢复对两个列表操作的访问并再次刷新。成功的空列表会清除已发现的成员资格。

在启动时没有兼容的先前目录的情况下，失败的推理配置文件列表也会阻止仅基础清单。授予两个列表权限或使用显式 `models.providers["amazon-bedrock"].models` 列表。

插件的公共发现帮助程序的编程调用者保留来自 v2026.9.2. 的建议默认值，传递 `discoveryMode: "strict"` 以传播获取失败并保留成功的空提供程序结果，就像捆绑的目录挂钩所做的那样。咨询部分结果不会作为完整清单缓存。

隐式 provider 的启用方式：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 为 `true`， 即使没有 AWS env marker，OpenClaw 也会尝试发现。
- 如果未设置 `plugins.entries.amazon-bedrock.config.discovery.enabled`， OpenClaw 只会在检测到以下 AWS 身份验证标记之一时自动添加隐式 Bedrock provider： `AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，或 `AWS_PROFILE`。
- 实际的 Bedrock 运行时身份验证路径仍然使用 AWS SDK 默认链，因此即使发现过程需要通过 `enabled: true` 显式启用，共享配置、SSO 和 IMDS 实例角色身份验证也可以正常工作。

<Note>
对于显式的 `models.providers["amazon-bedrock"]` 条目，OpenClaw 仍然可以从 AWS env marker（例如 `AWS_BEARER_TOKEN_BEDROCK`）提前解析 Bedrock env-marker 身份验证，而无需强制加载完整的运行时身份验证。实际的模型调用身份验证路径仍然使用 AWS SDK 默认链。
</Note>

<AccordionGroup>
  <Accordion id="discovery-config-options" title="发现配置选项">
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
    | `enabled` | 汽车 | 在自动模式下，OpenClaw 仅在检测到受支持的 AWS env marker 时启用隐式 Bedrock provider。设置为 `true` 可强制发现。 |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | 用于发现 API 调用的 AWS 区域。 |
    | `providerFilter` | （全部） | 匹配 Bedrock provider 名称（例如 `anthropic`、`amazon`）。 |
    | `refreshInterval` | `3600` | 缓存时长，单位为秒。设置为 `0` 可禁用缓存。 |
    | `defaultContextWindow` | `32000` | 用于未知 token 限制的已发现模型的上下文窗口（如果你知道模型限制，可覆盖此值）。 |
    | `defaultMaxTokens` | `4096` | 用于未知 token 限制的已发现模型的最大输出 token 数（如果你知道模型限制，可覆盖此值）。 |

  </Accordion>

  <Accordion id="context-window-and-max-token-limits" title="上下文窗口和最大令牌限制">
    Bedrock `ListFoundationModels` 和 `GetFoundationModel` API 不返回令牌限制元数据，仅返回模型 ID、名称、模式和生命周期状态。 OpenClaw 为流行的基岩模型（Claude、Nova、Llama、Mistral、DeepSeek 等）提供了已知上下文窗口和输出限制的查找表，因此会话管理、压缩阈值和上下文溢出检测可以在这些模型上正常工作。

    未在表中的已发现模型会回退到 `defaultContextWindow` 和 `defaultMaxTokens`。如果你使用的模型缺少准确限制，请通过显式的 `models.providers["amazon-bedrock"].models` 条目进行覆盖。

  </Accordion>
</AccordionGroup>

## <a id="quick-setup-(aws-path)"></a><a id="quick-setup-aws-path"></a> 快速设置（AWS 路径）

此流程会创建 IAM 角色、附加 Bedrock 权限、关联实例配置文件，并在 EC2 主机上启用 OpenClaw 发现功能。

```bash
# 1. Create IAM role and instance profile
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

# 2. Attach to your EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. On the EC2 instance, enable discovery explicitly
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# 4. Optional: add an env marker if you want auto mode without explicit enable
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. Verify models are discovered
openclaw models list
```

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="inference-profiles" title="推理配置文件">
    OpenClaw 会在基础模型之外一并发现 **区域和全局推理配置文件**。当配置文件映射到已知的基础模型时，该配置文件会继承该模型的能力（上下文窗口、最大 token 数、推理、视觉），并且会自动注入正确的 Bedrock 请求区域。这意味着跨区域 Claude 配置文件无需手动覆盖 provider 即可工作。全局跨区域配置文件（`global.*`）会在 `openclaw models list` 中优先显示，因为它们通常提供更好的容量和自动故障转移。

    推理配置文件 ID 类似于 `us.anthropic.claude-opus-4-6-v1`（区域）或 `anthropic.claude-opus-4-6-v1`（全球）。如果支持模型已存在于发现结果中，则配置文件将继承其完整功能集；否则应用安全默认值。

    无需额外配置。只要启用了发现，并且 IAM 主体具有 `bedrock:ListInferenceProfiles`，配置文件就会与基础模型一起出现在 `openclaw models list` 中。

  </Accordion>

  <Accordion id="service-tier" title="服务等级">
    某些 Bedrock 模型支持 `service_tier` 参数，用于优化成本或延迟。可用的层级如下：

    | 层级 | 描述 |
    |------|-------------|
    | `default` | 标准 Bedrock 层级 |
    | `flex` | 适用于可接受更长延迟的工作负载的折扣处理 |
    | `priority` | 适用于对延迟敏感的工作负载的优先处理 |
    | `reserved` | 适用于稳定态工作负载的预留容量 |

    通过 `agents.defaults.params` 为基岩模型请求设置 `serviceTier`（或 `service_tier`），或 `agents.defaults.models["<model-key>"].params` 中的每个模型：

    ```json5
    {
      agents: {
        defaults: {
          params: {
            serviceTier: "flex", // applies to all models
          },
          models: {
            "amazon-bedrock/mistral.mistral-large-3-675b-instruct": {
              params: {
                serviceTier: "priority", // per-model override
              },
            },
          },
        },
      },
    }
    ```

    有效值为 `default`、`flex`、`priority` 和 `reserved`。 Claude Fable 5、Opus 5和Sonnet 5仅支持`default`层； OpenClaw 发出警告并忽略针对这些模型请求的 `flex`、`priority` 或 `reserved`。对于其他模型，并非每个模型都支持每个层 - 不受支持的层会返回基岩验证错误，并且错误消息可能会产生误导（例如“提供的模型标识符无效”，而不是将该层命名为问题）。如果您看到此错误，请检查模型是否支持请求的层。

  </Accordion>

  <Accordion id="claude-opus-5-4-8-and-4-7-temperature" title="Claude Opus 5、4.8 和 4.7 温度">
    Bedrock 拒绝 Claude Opus 5、Opus 4.8 和 Opus 4.7. OpenClaw 自动忽略 `temperature` 的 `temperature` 参数匹配基岩参考，包括基础模型 ID、命名推理配置文件、底层模型通过 `bedrock:GetInferenceProfile` 解析为 Opus 5/4.8/4.7 的应用程序推理配置文件，以及带有可选区域前缀的点状 `opus-4.7`/`opus-4.8` 变体（`us.`、 `eu.`、`ap.`、`apac.`、`au.`、`jp.`、`global.`）。不需要配置旋钮，并且省略适用于请求选项对象和 `inferenceConfig` 有效负载字段。
  </Accordion>

  <Accordion title="Claude Opus 5">
    在 Messages-API Bedrock 端点上使用 `amazon-bedrock/anthropic.claude-opus-5`，或使用 regional/global 推理配置文件，例如出现在 Bedrock 发现中的 `global.anthropic.claude-opus-5`。 OpenClaw 应用 1,000,000 个令牌上下文窗口、128,000 个令牌输出限制、图像输入、提示缓存、拒绝安全流和本机 `xhigh`/`max` 工作级别。

    适应性思维默认为 `high`。 `/think off` 禁用思维，而 `/think xhigh|max` 保持自适应思维启用。 OpenClaw 省略了自定义采样参数和不受支持的非默认服务层。

  </Accordion>

  <Accordion id="claude-fable-5" title="Claude 寓言5">
    在 `us-east-1` 中使用 `amazon-bedrock/anthropic.claude-fable-5`，或区域推理 ID，例如 `us.anthropic.claude-fable-5`。 OpenClaw 应用了 Fable 的 1M 上下文窗口、128K 输出限制、始终在线的自适应思维以及支持的工作量映射。 《神鬼寓言5》和《5.1》默认为`medium`的努力；明确的努力设置优先。 `/think off` 和 `/think minimal` 映射到 `low`；省略了温度和强制工具选择控制，与 Opus 4.7/4.8 路线相匹配。流输出将一直保留，直到 Bedrock 返回终端状态，因此中流拒绝不会暴露部分文本。

    AWS 要求在 Fable 可用之前显式选择加入 `provider_data_share` 数据保留。 提示和补全内容会与 Anthropic 共享，并最多保留 30 天用于信任与安全。 在启用该模型前，请先查看并配置 [Bedrock data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html) 。

  </Accordion>

  <Accordion id="claude-mythos-5" title="Claude神话5">
    Claude Mythos 5 仅对已获得所需有限访问批准的账户可通过 Bedrock 使用。OpenClaw 能识别基础模型 `anthropic.claude-mythos-5` 以及区域或全局推理配置文件，例如 `us.anthropic.claude-mythos-5`。

    OpenClaw 会应用 1,000,000 token 的上下文窗口、128,000 token 的输出上限、图像输入、提示缓存、拒绝安全流式传输，以及原生 effort 等级。自适应思考始终开启：`/think off` 和 `/think minimal` 映射为 `low`，而 `xhigh` 和 `max` 仍然可用。 自定义采样和强制工具选择值会被省略。

  </Accordion>

  <Accordion title="Claude Sonnet 5">
    AWS 在 [`bedrock-runtime` 和 `bedrock-mantle` 端点](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5.html) 上都记录了 Sonnet 5。 OpenClaw 识别 Bedrock 基础模型 `anthropic.claude-sonnet-5` 以及区域或全局推理配置文件，例如 `us.anthropic.claude-sonnet-5`。它会应用 1,000,000 token 的上下文窗口、128,000 token 的输出上限、图像输入、原生 effort 等级、 提示缓存和拒绝安全流式传输。

    Bedrock 会为 Sonnet 5 保持自适应思考开启。OpenClaw 默认使用 `high`；`/think off` 和 `/think minimal` 映射为 `low`，因为该路由无法关闭思考功能。当自适应思考处于活动状态时，自定义 temperature 和强制工具选择值会被省略。

  </Accordion>

  <Accordion id="guardrails" title="护栏">
    您可以通过将 `guardrail` 对象添加到 `amazon-bedrock` 插件配置来将 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) 应用于所有 Bedrock 模型调用。 Guardrails 可让您强制执行内容过滤、主题拒绝、单词过滤器、敏感信息过滤器和上下文基础检查。

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              guardrail: {
                guardrailIdentifier: "abc123", // guardrail ID or full ARN
                guardrailVersion: "1", // version number or "DRAFT"
                streamProcessingMode: "sync", // optional: "sync" or "async"
                trace: "enabled", // optional: "enabled", "disabled", or "enabled_full"
              },
            },
          },
        },
      },
    }
    ```

    `guardrailIdentifier` 和 `guardrailVersion` 是必需的。

    | 选项 | 描述 |
    | ------ | ----------- |
    | `guardrailIdentifier` | 护栏ID（e.g. `abc123`）或完整ARN（e.g. `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`）。 |
    | `guardrailVersion` | 已发布的版本号，或用于工作草稿的 `"DRAFT"`。 |
    | `streamProcessingMode` | 流式传输期间用于 guardrail 评估的 `"sync"` 或 `"async"`。如果省略，Bedrock 将使用其默认值。 |
    | `trace` | 用于调试的 `"enabled"` 或 `"enabled_full"`；生产环境中省略或设为 `"disabled"`。 |

    <Warning>
    网关使用的 IAM 主体除了标准调用权限外，还必须具有 `bedrock:ApplyGuardrail` 权限。
    </Warning>

  </Accordion>

  <Accordion id="embeddings-for-memory-search" title="用于内存搜索的嵌入">
    Bedrock还可以充当[内存搜索](/concepts/memory-search)的嵌入提供者。这是与推理提供程序分开配置的——将 `memory.search.provider` 设置为 `"bedrock"`：

    ```json5
    {
      memory: {
        search: {
          provider: "bedrock",
          model: "amazon.titan-embed-text-v2:0", // default
        },
      },
    }
    ```

    Bedrock embeddings 使用与 inference 相同的 AWS SDK 凭证链（实例角色、SSO、访问密钥、共享配置和 web identity）。不需要 API 密钥。

    支持的 embedding 模型包括 Amazon Titan Embed（v1、v2）、Amazon Nova Embed、Cohere Embed（v3、v4）以及 TwelveLabs Marengo。有关完整的模型列表和维度选项，请参见 [Memory configuration reference -- Bedrock](/reference/memory-config#bedrock-embedding-config)。

  </Accordion>

  <Accordion id="notes-and-caveats" title="注意事项和警告">
    - Bedrock 需要在 AWS account/region. 中启用 **模型访问**
    - 自动发现需要 `bedrock:ListFoundationModels` 和 `bedrock:ListInferenceProfiles` 权限。
    - 如果您依赖自动模式，请在网关主机上设置受支持的 AWS 身份验证环境标记之一。如果您更喜欢不带环境标记的 IMDS/shared-config 身份验证，请设置 `plugins.entries.amazon-bedrock.config.discovery.enabled: true`。
    - OpenClaw 会按以下顺序展示凭证来源：`AWS_BEARER_TOKEN_BEDROCK`， 然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然后是 `AWS_PROFILE`，最后是默认 AWS SDK 链。
    - 推理支持取决于模型；请查看 Bedrock 模型卡以了解当前能力。
    - 如果您更喜欢托管密钥流，您还可以在 Bedrock 前面放置一个 OpenAI- 兼容代理，并将其配置为 OpenAI 提供程序。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="记忆搜索" href="/concepts/memory-search" icon="magnifying-glass">
    用于 memory search 配置的 Bedrock embeddings。
  </Card>
  <Card title="内存配置参考" href="/reference/memory-config#bedrock-embedding-config" icon="database">
    完整的 Bedrock embedding 模型列表和维度选项。
  </Card>
  <Card title="基岩地幔" href="/providers/bedrock-mantle" icon="layer-group">
    基岩地幔 OpenAI- 兼容和 Claude 消息模型。
  </Card>
  <Card title="提示缓存" href="/reference/prompt-caching" icon="database">
    提示词缓存如何在各提供方之间工作。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和 FAQ。
  </Card>
</CardGroup>
