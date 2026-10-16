---
summary: "将 OpenCode Zen 和 Go 目录与 OpenClaw 结合使用"
read_when:
  - "您想要 OpenCode-hosted 模型访问权限"
  - "你想在 Zen 和 Go 目录之间进行选择"
title: "OpenCode"
---

OpenCode 在 OpenClaw 中提供两个托管目录：

| 目录 | 前缀            | 运行时提供者 |
| ------- | ----------------- | ---------------- |
| **Zen** | `opencode/...`    | `opencode`       |
| **Go**  | `opencode-go/...` | `opencode-go`    |

两个目录都使用相同的 OpenCode API 密钥基础设施（`OPENCODE_API_KEY`，别名 `OPENCODE_ZEN_API_KEY`）。 Go仍然需要自己付费订阅；拥有 Zen 密钥本身并不授予 Go 访问权限。 OpenClaw 保持运行时提供程序 ID 的分割，以便上游每个模型的路由保持正确。

OpenClaw 通过 Anthropic、Gemini、OpenAI 聊天完成和 OpenAI 响应传输向 `https://opencode.ai` 发送稳定的 `x-opencode-session` 会话标头。当禁用提示缓存时，此标头保持启用状态。低级 SDK 流调用者应在其流选项中提供 `sessionId`。

OpenAI- 兼容和 Anthropic 传输上的 Zen 和 Go 发现请求和模型请求将客户端在其本机端点上标识为 `openclaw/<version>`。自定义代理 URL 不会继承此属性。 `google-generative-ai` SDK 路径尚未应用此用户代理策略。 OpenClaw 不会模拟 OpenCode 客户端。

当未提供显式路由标头或会话标识符时，独立 `openclaw infer model run --local` 调用和 [prepared 完成助手 ](/plugins/sdk-runtime/models#prepared-completion-sdk-compatibility) 每次调用都会生成新的路由标头。此生成的值保留在标头中，不会创建对话或启用基于会话的缓存。无论标头名称大小写如何，都会保留显式模型或调用者路由标头。

## <a id="getting-started"></a> 入门

<Tabs>
  <Tab id="zen-catalog" title="禅宗目录">
    **最佳适用场景：** 精选的 OpenCode 多模型代理（Claude、GPT、Gemini、GLM、 DeepSeek、Kimi、MiniMax、Qwen）。

    <Steps>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice opencode-zen
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step id="set-a-zen-model-as-the-default" title="将 Zen 模型设置为默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode/gpt-5.6-sol"
        ```
      </Step>
      <Step id="verify-models-are-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab id="go-catalog" title="Go目录">
    **最佳适用场景：** 分别订阅的 Go 系列，涵盖 DeepSeek、GLM、GPT、 Grok、Hy3、Kimi、MiMo、MiniMax 和 Qwen。

    <Steps>
      <Step id="use-the-bundled-go-catalog" title="使用捆绑的 Go 目录">
        OpenCode Go 包含在 OpenClaw 中，因此不需要单独安装插件或重新启动网关。
      </Step>
      <Step id="run-onboarding-1" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step id="set-a-go-model-as-the-default" title="将 Go 模型设置为默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k3"
        ```
      </Step>
      <Step id="verify-models-are-available-1" title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## <a id="config-example"></a> 配置示例

```json5
{
  env: { vars: { OPENCODE_API_KEY: "sk-..." } },
  agents: { defaults: { model: { primary: "opencode/gpt-5.6-sol" } } },
}
```

## <a id="provider-catalogs"></a> 提供商目录

### <a id="zen"></a> 禅宗

| 属性         | 值                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| 运行时提供者 | `opencode`                                                               |
| 示例模型   | `opencode/gpt-5.6-sol`, `opencode/kimi-k3`, `opencode/deepseek-v4-flash` |

对当前活动列表运行 `openclaw models list --provider opencode`。模型可用性和促销路线可以独立于 OpenClaw 进行更改。

实时发现将您的 OpenCode 帐户可用的模型与来自 `https://models.opencode.ai/api.json` 的权威模型元数据相结合。仅当使用 OpenCode 凭证配置或显式选择 OpenCode Zen 或 Go 时，OpenClaw 才会获取并缓存该目录；启动和不相关的提供商永远不会下载它。新列出的聊天模型无需 OpenClaw 更新即可使用。具有可信元数据的模型保留其上游传输和功能；列出的没有元数据的 ID 使用 Zen 的本机 OpenAI- 兼容路由，并具有默认限制。键范围的响应可以忽略该工作区不可用的模型。元数据和生命周期状态一起刷新；已弃用的模型被排除在主动发现及其离线回退之外。已弃用的显式引用仍然可以解析为现有配置，但不会显示为当前建议。

帐户列表失败会产生失败的目录结果，而不是成功的种子列表。成功的空或完全过滤的帐户响应将保持为空。单独的公共元数据源在可信离线元数据不可用时仍然可以使用；不会替换或重试帐户列表请求。

某些 Zen 免费层模型仅接受来自 OpenCode 客户端的请求。 `403 FreeTierError` 表示该模型的免费套餐受到限制，而不是您保存的密钥已过期。选择其他模型或使用允许 API 访问的付费计划。再次登录或更改用户代理不会授予访问权限。此拒绝仅标记所选模型不可用；它不会将其他模型的凭证置于冷却状态。仅帐户列表中的 ID 并不能证明它可以在 OpenClaw 中运行。该列表没有免费层标志，因此 OpenClaw 不会根据模型名称猜测访问权限。 `402` 资金不足响应意味着该帐户需要更多信用，而不是模型 ID 未知。

价格估算还通过 [ 托管模型目录 ](/concepts/models#hosted-catalog-updates) 进行刷新，使用与实时发现相同的公共 OpenCode 定价源。托管更新在下次网关重新启动后激活；捆绑的快照仍然可以离线使用。您的配置或代理本地 `models.json` 中的明确模型价格保持优先。这些是广告价格估算，而不是经过验证的发票总额。

#### <a id="kimi-k3-thinking"></a> Kimi K3 思维

对于 `opencode/kimi-k3`，选择 **Off**、**Low**、**High** 或 **Max**。其提供程序默认值为 **High**。 **Off** 显式发送 `reasoning_effort: "none"`；省略努力并不会禁用禅宗的推理。这些选择适用于 Zen 路线，而不适用于其他 Kimi 提供商。拾取器还可能显示 [**Ultra**](/tools/thinking)，这是一种单独的harness模式。

### Go

| 属性         | 值                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| 运行时提供者 | `opencode-go`                                                                     |
| 示例模型   | `opencode-go/kimi-k3`, `opencode-go/deepseek-v4-flash`, `opencode-go/qwen3.8-max` |

有关发现、路由和访问要求，请参阅 [OpenCode Go](/providers/opencode-go)。 Go 的模型列表端点宣传其总体阵容；列出模型并不能证明您的帐户可以运行它。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="api-key-aliases" title="API 密钥别名">
    `OPENCODE_ZEN_API_KEY` 也可作为 `OPENCODE_API_KEY` 的别名使用。
  </Accordion>

  <Accordion id="shared-credentials" title="共享凭证">
    在设置过程中输入一个 OpenCode 密钥可以存储两个运行时提供程序的凭据。它不会创建 Go 订阅或授予 Go 权利；使用前请先在OpenCode控制台订阅Go。
  </Accordion>

  <Accordion id="getting-an-api-key" title="获取 API 密钥">
    创建 OpenCode 帐户并在 [opencode.ai/auth](https://opencode.ai/auth). 生成 API 密钥计费和目录可用性通过 OpenCode 仪表板进行管理。
  </Accordion>

  <Accordion id="gemini-replay-behavior" title="Gemini 重播行为">
    Gemini-支持的OpenCode引用保留在代理Gemini路径上，因此OpenClaw在那里保持Gemini思想签名卫生，而不启用本机Gemini重播验证或引导重写。
  </Accordion>

  <Accordion id="non-gemini-replay-behavior" title="非 Gemini 重播行为">
    非 Gemini OpenCode 裁判保留最低 OpenAI- 兼容重播策略。
  </Accordion>
  <Accordion id="pricing-and-privacy" title="定价和隐私">
    计费、数据保留和训练政策因模型而异。在选择路径前，请查看最新的 [OpenCode Zen 定价和政策](https://opencode.ai/docs/zen/)。 免费模型可能属于临时性的反馈计划。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="OpenCode Go" href="/providers/opencode-go" icon="server">
    Go 目录发现和访问要求。
  </Card>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
  <Card title="OpenCode 插件参考" href="/plugins/reference/opencode" icon="plug">
    本机会话、会话目录切换和插件配置键。
  </Card>
</CardGroup>
