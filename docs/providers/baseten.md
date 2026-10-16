---
summary: "Baseten DeepSeek V4.1 Flash 和托管模型 API 的设置"
title: "Baseten"
read_when:
  - "您希望通过 Baseten 模型 API 进行图像输入和推理"
  - "您需要一个 OpenAI- 兼容的 API 用于 Baseten 的托管模型"
---

[Baseten 模型 API](https://docs.baseten.co/inference/model-apis/overview) 提供对前沿模型的托管、OpenAI- 兼容访问。官方外部插件使用经过身份验证的发现，因此 OpenClaw 遵循为您的 Baseten 帐户启用的完整模型集。其离线后备包含下面列出的当前精选模型。

| 属性        | 值                                                    |
| --------------- | -------------------------------------------------------- |
| 提供方 id     | `baseten`                                                |
| 插件          | 官方外部软件包（`@openclaw/baseten-provider`） |
| 认证环境变量    | `BASETEN_API_KEY`                                        |
| 引导标志 | `--auth-choice baseten-api-key`                          |
| 直接 CLI 标志 | `--baseten-api-key <key>`                                |
| API             | OpenAI-兼容（`openai-completions`）                 |
| 基础 URL        | `https://inference.baseten.co/v1`                        |
| 默认模型   | `baseten/deepseek-ai/DeepSeek-V4.1-Flash`                |

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/baseten-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="create-a-baseten-account-and-api-key" title="创建 Baseten 账户和 API 密钥">
    Baseten 的基本计划没有月度平台费。模型 API 呼叫按使用量定价。在[Baseten API密钥设置](https://app.baseten.co/settings/api_keys)中创建密钥，并在[定价页面](https://www.baseten.co/pricing)上检查当前费率。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice baseten-api-key
```

```bash Direct flag
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice baseten-api-key \
  --baseten-api-key "$BASETEN_API_KEY"
```

```bash Env only
export BASETEN_API_KEY=...
```

    </CodeGroup>

    Onboarding 会保存连接设置，而无需将生成的目录复制到您的配置中。现有模型行、别名和显式主模型保持不变。如果您使用 `models.mode: "replace"`，加入还会添加捆绑目录，因为该模式会禁用隐式发现。

  </Step>
  <Step id="verify-the-live-catalog" title="验证实时目录">
    ```bash
    openclaw models list --provider baseten
    ```

    使用可用的身份验证信息时，插件会请求 `GET /v1/models`，并列出该账户返回的所有模型。没有身份验证信息时，插件会保持离线状态并使用捆绑的备用目录。

  </Step>
</Steps>

<a id="inkling" />

## <a id="default-model"></a> 默认模型

DeepSeek V4.1 闪存是新 Baseten 设置的默认设置。它支持文本和图像输入、工具调用、1,048,576 个令牌上下文窗口以及最多 262,144 个输出令牌：

```json5
{
  agents: {
    defaults: {
      model: { primary: "baseten/deepseek-ai/DeepSeek-V4.1-Flash" },
    },
  },
}
```

使用`/model baseten/deepseek-ai/DeepSeek-V4.1-Flash -s`切换当前会话。它的思维选择是 `off`、`low`、`high` 和 `max`，其中 `high` 作为本机默认值。 OpenClaw 将 `off` 发送为 `reasoning_effort: "none"`。参见[Baseten的推理控制](https://docs.baseten.co/inference/model-apis/reasoning)。

保存的显式选择（例如 `baseten/thinkingmachines/inkling`）不会重定向到新的默认值。如果先前选择的模型不再可用，请列出当前目录并明确选择替换模型。重新连接 API 密钥会保留已保存的主要模型。

## <a id="bundled-fallback-catalog"></a> 捆绑后备目录

经过认证的实时目录具有权威性。这个精心策划的后备方案涵盖了当前的模型 API；实时发现可以包括其他模型。从此后备中删除已停用的行不会从您的配置中删除显式创作的行：

| 模型引用                                          | 输入       | 上下文 | 最大输出 |
| -------------------------------------------------- | ----------- | ------: | ---------: |
| `baseten/deepseek-ai/DeepSeek-V4-Pro-0813`         | 文本        |  1.048M |       262k |
| `baseten/deepseek-ai/DeepSeek-V4.1-Flash`          | 文本、图像 |  1.048M |       262k |
| `baseten/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B` | 文本        |    202k |       202k |
| `baseten/openai/gpt-oss-120b`                      | 文本        |    128k |       128k |
| `baseten/zai-org/GLM-5.2`                          | 文本、图像 |  1.048M |       262k |
| `baseten/zai-org/GLM-5.2-Fast`                     | 文本、图像 |  1.048M |       262k |

所有捆绑模型都支持工具调用和推理。 OpenClaw 将其思维水平映射到具有原生 `reasoning_effort` 的模型。其选择加入的 GLM 和 Nemotron 路由默认为“thinking off”。 Nemotron 公开了一个二进制 off/on 控件；捆绑的 GLM 5.2 定义暴露了关闭、高和最大值。这些路由使用Baseten的`chat_template_args.enable_thinking`控制。 GLM 的标量工作和图像输入取决于广告这些功能的发现；稀疏的实时 GLM 行当前忽略它们。

相同的思维控制适用于代理轮流和独立模型完成。当前的 DeepSeek V4 Pro 0813 和显式配置的旧版 Pro 参考在启用思考时保留重放的推理元数据，并针对显式 `off` 请求将其删除。当发送标量工作时，当前的 Pro 端点还会收到所需的思考信封。

<Note>
Baseten 可以独立于 OpenClaw 版本添加、删除或更改模型 API。该插件会刷新经过身份验证的 API 的模型 ID、上下文限制、输出限制以及输入、缓存输入和输出定价。当以其他方式填充的目录行省略相应的功能标志时，当前的 DeepSeek V4.1 Flash 和 V4 Pro 0813 保留其记录的控件。
</Note>

## <a id="prompt-caching"></a> 提示词缓存

对于本机 `https://inference.baseten.co/v1` 端点，OpenClaw 为相关请求发送稳定的 `x-session-affinity` 标头，以提高前缀缓存重用。它使用显式请求缓存密钥（如果存在），否则使用会话 ID。显式配置的关联标头优先。设置 `cacheRetention: "none"` 抑制生成的标头；它不会禁用 Baseten 的自动缓存。自定义端点保留其配置的行为。请参阅 [Baseten 会话关联性 ](https://docs.baseten.co/inference/model-apis/pricing-and-limits#session-affinity)。

## <a id="manual-config"></a> 手动配置

大多数设置只需要 API 密钥。若要明确指定提供商：

```json5
{
  env: { vars: { BASETEN_API_KEY: "..." } },
  agents: {
    defaults: {
      model: { primary: "baseten/deepseek-ai/DeepSeek-V4.1-Flash" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      baseten: {
        baseUrl: "https://inference.baseten.co/v1",
        apiKey: "${BASETEN_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-ai/DeepSeek-V4.1-Flash",
            name: "DeepSeek V4.1 Flash",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 262144,
          },
        ],
      },
    },
  },
}
```

<Note>
如果网关作为守护进程（launchd、systemd、Docker）运行，请确保 `BASETEN_API_KEY` 可用于该进程。例如，在`~/.openclaw/.env`中或通过`env.shellEnv`进行设置。仅在交互式 shell 中导出的密钥对于已运行的托管服务不可见。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="思维模式" href="/tools/thinking" icon="brain">
    选择 OpenClaw 推理强度级别。
  </Card>
  <Card title="模型 CLI" href="/cli/models" icon="terminal">
    列出、检查并选择已发现的模型。
  </Card>
  <Card title="模型 FAQ" href="/help/faq-models" icon="circle-question">
    身份验证配置和模型选择故障排除。
  </Card>
</CardGroup>
