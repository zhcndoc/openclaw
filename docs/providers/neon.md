---
summary: "使用一个分支范围的 Neon 凭证通过 Neon AI Gateway 路由 OpenClaw"
title: "Neon AI Gateway"
read_when:
  - "您已在使用 Neon，并需要一份用于 LLM 访问的凭据"
  - "您需要模型请求的每个分支隔离"
  - "您想要在没有单独提供商帐户的情况下访问 OpenAI、Anthropic、Google、Meta、Databricks 和阿里巴巴模型"
---

[Neon AI Gateway](https://neon.com/docs/ai-gateway/overview) 是 Neon 提供的 OpenAI- 兼容推理网关。一个 Neon 凭证可到达来自 OpenAI、Anthropic、Google、Meta、Databricks 和阿里巴巴的模型，因此 OpenClaw 通过用于其他代理提供商的相同 `openai-completions` 传输与其进行通信。

每个 Neon 分支都有自己的网关主机，因此请求的范围仅限于您指向的分支，与 Neon 数据库已经具有的隔离相同。

| 属性    | 值                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------- |
| 提供方 id | `neon`（自定义；在`models.providers.neon`下配置）                                          |
| 插件      | 没有任何；不是捆绑的 OpenClaw 提供程序插件                                                      |
| 认证        | 范围为 `ai_gateway:invoke` 的 Neon 凭证，作为不记名令牌发送                        |
| API         | `openai-completions`，以及特定模型的 `openai-responses` 和 `anthropic-messages`        |
| 基础 URL    | 用于响应的 `$NEON_AI_GATEWAY_BASE_URL/v1`、`/openai/v1` 或用于 Anthropic 消息的 `/anthropic` |

<Note>
  Neon AI Gateway 是自定义 OpenAI- 兼容提供程序，而不是捆绑的 OpenClaw 提供程序插件。 `openclaw onboard` 不提供 Neon 身份验证选项，因此您自己编写 `models.providers.neon` 条目。
</Note>

<Note>
  Neon AI Gateway 已全面上市。它需要付费 Neon 计划，并且并非在每个地区都可用；请参阅 [Regions](https://neon.com/docs/introduction/regions) 了解当前覆盖范围。
</Note>

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="create-a-credential" title="创建凭证">
    在 [Neon Console](https://console.neon.tech/) 中，选择您的分支，然后单击 **APP BACKEND** 下的 **Credentials**。单击“**”创建凭证“**”并勾选“`ai_gateway:invoke`”。该令牌以 `nt_live_` 开头，Neon 仅显示一次。

    使用 `neon` CLI，`neon env pull --file .env` 会写入当前分支的凭证和分支主机。

  </Step>
  <Step id="find-the-branch-host" title="找到分支主机">
    Neon 控制台在 AI 网关页面上将其显示为 `NEON_AI_GATEWAY_BASE_URL`：

    ```bash
    export NEON_AI_GATEWAY_BASE_URL="https://<your-neon-branch-host>"
    export NEON_AI_GATEWAY_TOKEN="example-neon-gateway-token-not-real"
    ```

    这不是数据库连接字符串。 `<your-neon-branch-host>` 是一个占位符：将控制台中的裸主机粘贴到其位置，后面没有路径。

  </Step>
  <Step id="add-the-provider-to-your-config" title="将提供程序添加到您的配置中">
    复制下面的 [Configuration](#configuration) 块，并将 `<your-neon-branch-host>` 替换为 `NEON_AI_GATEWAY_BASE_URL` 中的裸主机，保留 `/v1` 后缀。占位符不是真正的端点，因此在替换它之前配置会失败。在选择模型之前执行此操作。
  </Step>
  <Step id="select-a-model" title="选择模型">
    ```bash
    openclaw models set neon/gpt-5-mini
    openclaw models list --provider neon
    ```

    由于您在上一步中添加了 `models.providers.neon` 条目，因此 `openclaw models set` 会识别提供程序并保存选择。如果您在添加该条目之前运行它或者您拼错了提供程序，则会失败并显示 `Unknown model provider "neon"` 并保持您的配置不变。本地目录不知道的模型 ID 仍然保存在已配置的提供程序下，并警告检查 ID，因此请使用 `openclaw models list --provider neon` 确认结果。

  </Step>
</Steps>

## <a id="configuration"></a> 配置

```json5
{
  models: {
    providers: {
      neon: {
        baseUrl: "https://<your-neon-branch-host>/v1",
        apiKey: "${NEON_AI_GATEWAY_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "gpt-5-mini",
            name: "GPT-5 Mini",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 400000,
          },
          {
            id: "gemini-3-flash",
            name: "Gemini 3 Flash",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1000000,
          },
          {
            id: "qwen3-next-80b-a3b-instruct",
            name: "Qwen3-Next 80B Instruct",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131000,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "neon/gpt-5-mini" },
    },
  },
}
```

`baseUrl` 是 `NEON_AI_GATEWAY_BASE_URL` 的裸主机，末尾带有 `/v1`，因此在加载配置之前替换 `<your-neon-branch-host>`。需要 `/v1` 后缀，因为 OpenClaw 将 URL 交给 OpenAI 客户端，该客户端会附加 `chat/completions`。 Neon 在较长的 `/ai-gateway/mlflow/v1` 路径上提供相同的端点，并且 Neon 文档表明两种形式的行为相同，并且两种形式都没有被弃用，较长的 `/ai-gateway/...` 路径保证无限期地保持工作（请参阅 [ 较短路径](https://neon.com/docs/ai-gateway/models#shorter-paths)）。

由于 Neon 分支主机是公共 HTTPS 端点，因此您不需要专用网络覆盖。

### <a id="cost-and-output-limits"></a> 成本和产量限制

放`cost`从[霓虹灯模型目录](https://neon.com/docs/ai-gateway/models)。 Neon 按模型提供商公布的每个代币费率收取费用，不加价，从预付积分中计费。上述三种模型的目录价格为 $0.25和$2.00每百万代币`gpt-5-mini`， $0.50和$3.00为了`gemini-3-flash`和$0.15和$1.20为了`qwen3-next-80b-a3b-instruct`. OpenClaw读`cost` in USD每百万代币，所以这些数字按照书面形式下降。

没有模型条目设置 `maxTokens`，这意味着 OpenClaw 应用其自己的默认 8192 个输出标记，上限为模型的 `contextWindow`。 Neon 的目录发布了上下文窗口，但没有每个模型的输出上限，因此这里没有要复制的上游数字。如果您想要更长的完成时间，请自行设置 `maxTokens`。 Neon 记录的每分钟 20,000 个输出令牌是速率限制，而不是每个请求的上限。

`input` 阵列接受 `text`、`image`、`video` 和 `audio`。 Neon 的目录列出了比某些模型更多的输入类型，包括 `gpt-5-3-codex` 的 PDF 以及 Gemini 的视频和音频，但只有上述四个值在 OpenClaw 模型条目中有效。

### <a id="openclaw-does-not-ask-neon-for-streamed-token-usage"></a> OpenClaw 不要求 Neon 使用流式令牌

对于此 Neon 路由，OpenClaw 将 `supportsUsageInStreaming` 解析为 `false`，因此它不会将 `stream_options` 发送到 Neon。 Neon 分支主机是自定义 `baseUrl`，OpenClaw 不会将其识别为其内置端点之一，对于类似的未注册端点，派生默认值是 `false`。这适用于上述每个模型，并且不需要 `compat` 块来获取它。

这是 Neon 路由的默认值，而不是关于设置 `baseUrl` 的每个提供者的规则：OpenClaw 确实分类的端点可以派生相反的值，并且模型上的显式 `compat.supportsUsageInStreaming` 始终覆盖派生的默认值。

这是关于传出请求的声明，而不是关于您将看到的内容。OpenClaw仍然记录着`usage`任何带有一个对象的块上的对象，因此通常会考虑在未询问的情况下报告使用情况的提供者。在实践中，不询问通常意味着没有最终使用到达，然后以零令牌报告流式传输。

仅在验证所选模型接受 `stream_options` 并返回使用情况后才启用 `compat: { supportsUsageInStreaming: true }`。每个模型都保留此覆盖：Neon 路由到的上游提供商之间的支持可能有所不同。

## <a id="models"></a> 模型

Neon 使用没有供应商前缀的短模型 ID，例如 `gpt-5-mini`、`gemini-3-flash`、`llama-4-maverick`、`gpt-oss-120b` 和 `qwen3-next-80b-a3b-instruct`。 `databricks-` 前缀形式也被接受。列出分支实际可以到达的范围：

```bash
curl "$NEON_AI_GATEWAY_BASE_URL/v1/models" \
  -H "Authorization: Bearer $NEON_AI_GATEWAY_TOKEN"
```

Neon 以 OpenRouter- 形状的响应返回该列表，但 `pricing`、`context_length` 和 `per_request_limits` 当前始终为 `null`，因此从 [Neon 模型目录 ](https://neon.com/docs/ai-gateway/models) 中获取 `contextWindow` 值。相同的目录可在 [models.dev](https://models.dev/providers/neon/). 上浏览

Neon 的 [ 模型访问文档](https://neon.com/docs/ai-gateway/overview#model-access) 声明具有预付费积分的付费项目可以使用该目录。选择模型之前，请检查您的分支机构回复中的 `enabled` 字段；如果访问意外被禁用，请联系 Neon 支持人员。

## <a id="advanced"></a> 高级

<AccordionGroup>
  <Accordion id="branch-scoped-credentials" title="分支机构范围的凭证">
    凭证在其创建的分支以及从该分支衍生的每个分支上均有效，因此在 `main` 上创建的凭证涵盖从 `main` 分叉的预览分支和功能分支。它在该谱系之外的分支上无效，其中网关返回带有 `403` 的 `credential not authorized for this branch`。

    要轮换，请先创建新凭据，更新环境，然后撤销旧凭据。

  </Accordion>

  <Accordion id="models-that-require-the-responses-api" title="需要响应 API 的模型">
    Neon 在 `/openai/v1` 而不是 `/v1` 下公开 [OpenAI 响应 API](https://neon.com/docs/ai-gateway/openai-responses)。大多数 OpenAI 模型在两个端点上进行应答，但少数模型仅通过响应提供服务，并被聊天完成拒绝。在选择模型之前，请检查 Neon 的 [endpoint 指南 ](https://neon.com/docs/ai-gateway/models#which-endpoint-to-use) 和 [ 响应模型列表 ](https://neon.com/docs/ai-gateway/openai-responses#supported-models)。需要响应的模型需要以下配置。

    使用 `openai-responses` API 和基础 URL（与上面最后用 `/openai/v1` 替换的同一分支主机相同的分支主机）来到达它们：

    ```json5
    {
      models: {
        providers: {
          "neon-responses": {
            baseUrl: "https://<your-neon-branch-host>/openai/v1",
            apiKey: "${NEON_AI_GATEWAY_TOKEN}",
            api: "openai-responses",
            models: [
              {
                id: "gpt-5-3-codex",
                name: "GPT-5.3 Codex",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 400000,
              },
            ],
          },
        },
      },
    }
    ```

    此端点仅采用 OpenAI 模型 ID。发送 Gemini、Llama 或 Qwen ID 将返回 `400 model "<model-id>" is not available on the openai_responses endpoint`。

  </Accordion>

  <Accordion id="claude-models-through-the-anthropic-messages-endpoint" title="通过 Anthropic 消息端点进行 Claude 模型">
    Neon 还在 `/anthropic` 下公开了 [ 人类消息 API](https://neon.com/docs/ai-gateway/anthropic-messages)，其中 Anthropic SDK 附加了 `/v1/messages`。该方言仅是Claude，它达到了OpenAI-兼容`/v1`路径无法表达的原生Anthropic功能，例如扩展思维和提示缓存。显式设置 `cacheRetention` 以选择保留，如下面的配置所示。使用 `anthropic-messages` API 和 `/anthropic` 基础 URL 实现第二个提供程序条目，其形状与捆绑的 Anthropic- 兼容提供程序示例相同：

    ```json5
    {
      models: {
        providers: {
          "neon-anthropic": {
            baseUrl: "https://<your-neon-branch-host>/anthropic",
            apiKey: "${NEON_AI_GATEWAY_TOKEN}",
            authHeader: true,
            api: "anthropic-messages",
            models: [
              {
                id: "claude-sonnet-4-6",
                name: "Claude Sonnet 4.6",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "neon-anthropic/claude-sonnet-4-6" },
          models: {
            "neon-anthropic/claude-sonnet-4-6": {
              params: { cacheRetention: "short" },
            },
          },
        },
      },
    }
    ```

    OpenAI 条目中的相同 `cost`、`maxTokens` 和 `contextWindow` 警告适用于此处：从 [Neon 模型目录 ](https://neon.com/docs/ai-gateway/models) 中设置 `cost`，并从该目录中获取 `contextWindow`。

    设置 `authHeader: true` 因为 Neon 需要持有者凭证，包括在此 Anthropic- 兼容端点上。

    如上例所示，在 `agents.defaults.models` 下设置 `params.cacheRetention`，以为此自定义 `anthropic-messages` 路由选择缓存行为。使用 `"short"` 获得 5 分钟缓存，或使用 `"long"` 获得 1 小时 TTL； `"none"` 禁用它。请参阅 [ 提示缓存](/reference/prompt-caching)。

    这里有两个行为很重要：

    - 此端点仅采用 Claude 模型 ID。发送非 Anthropic ID 将返回 `400 model "<model-id>" is not available on the anthropic_messages endpoint`，因此请将此条目与 `/v1` 条目分开，该条目会到达每个模型。
    - 在非 `api.anthropic.com` 主机上，OpenClaw 抑制隐式 `anthropic-beta` 标头，例如交错思维，因此代理不会拒绝它们。如果您需要特定的测试版，请在提供程序上设置 `headers` 和 `anthropic-beta` 值。

  </Accordion>

  <Accordion id="rate-limits-and-quota" title="速率限制和配额">
    Neon 强制实施账户级代币每分钟的速率限制。检查返回 `429 Too Many Requests` 以及命名模型的消息。上游输出令牌限制也适用，因此 `429` 可能仅在输出令牌上发生。

    Neon 还强制执行帐户级支出上限，该上限会返回 `429` 和错误代码 `REQUEST_LIMIT_EXCEEDED`。

  </Accordion>

  <Accordion id="response-shape" title="响应形状">
    对于大多数模型，`message.content` 是一个普通字符串。有些模型会返回类型化内容块的数组；请参阅 Neon 的 [ 内容形状指南 ](https://neon.com/docs/ai-gateway/models#content-shape-varies-by-model)。 OpenClaw 的 `openai-completions` 传输会在传入过程中压平这些块，将 `text` 块视为辅助输出，将 `reasoning` 块视为思考，因此配置中的任何内容都不必处理数组形式。

    较低的输出令牌限制可能会在文本块出现之前切断响应。如果响应包含推理但没有答案，请在筹集 `maxTokens` 之前检查完成原因和输出代币预算。

  </Accordion>

  <Accordion id="proxy-behavior-notes" title="代理行为注释">
    - 标记为`reasoning: true`的自定义推理模型支持OpenAI-风格的推理控件。使用`openai-completions`，选择思考级别可以将`reasoning_effort`发送到Neon。如果上游模型拒绝该字段，请在该模型条目上设置 `compat.supportsReasoningEffort: false`。
    - Inference 在付费计划中使用预付费积分。 Neon 按模型提供商的每个代币费率收取费用，不加价。请参阅 [AI 网关概述](https://neon.com/docs/ai-gateway/overview)。
  </Accordion>

  <Accordion id="common-errors-and-troubleshooting" title="常见错误及故障排除">
    Neon 的 [ 故障排除指南](https://neon.com/docs/ai-gateway/troubleshooting) 涵盖了您最有可能遇到的错误：

    - 对于帐户访问错误，请检查 `GET /v1/models` 中模型的 `enabled` 字段。如果您的项目有付费计划和预付费积分，但访问权限被禁用，请联系 Neon 支持。对于凭证错误，请检查 `ai_gateway:invoke` 范围和分支沿袭。
    - `400 model "<model-id>" is not available on the <endpoint> endpoint` 表示模型 ID 不属于您所调用的方言，例如发送到 `/anthropic` 的 OpenAI ID 或发送到 Claude ID `/openai/v1`。使用与模型匹配的提供者条目。
    - AI 网关通常在付费计划中可用，但并非在每个区域都可用，因此在不受支持的区域或免费计划中创建的项目无法访问它。有关当前覆盖范围，请参阅 [Regions](https://neon.com/docs/introduction/regions)。

  </Accordion>
</AccordionGroup>

<Note>
有关一般提供程序配置和故障转移行为，请参阅 [Model Providers](/concepts/model-providers)。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="Neon AI Gateway 文档" href="https://neon.com/docs/ai-gateway/overview" icon="book">
    有关网关、身份验证和模型的官方 Neon 文档。
  </Card>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    所有提供者、模型参考和故障转移行为的概述。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
  <Card title="模型" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Anthropic 消息 API" href="https://neon.com/docs/ai-gateway/anthropic-messages" icon="robot">
    具有扩展思维和选择加入提示缓存的本机 Claude 方言。
  </Card>
  <Card title="故障排查" href="https://neon.com/docs/ai-gateway/troubleshooting" icon="wrench">
    常见的 Neon AI Gateway 错误及其解决方法。
  </Card>
</CardGroup>
