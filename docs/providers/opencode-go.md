---
summary: "将 OpenCode Go 目录与共享 OpenCode 设置结合使用"
read_when:
  - "你想使用 OpenCode Go 目录"
  - "您需要 Go-hosted 模型的运行时模型参考"
title: "OpenCode Go"
---

OpenCode Go 是 [OpenCode](/providers/opencode) 内的单独付费订阅。它使用与 Zen 相同的 `OPENCODE_API_KEY` 凭证基础设施，但 Zen 密钥不会自动包含 Go 权利。 Go 保留其自己的运行时提供程序 ID （`opencode-go`），因此上游每个模型路由保持正确。 OpenCode Go 捆绑在 OpenClaw 包中，因此入门和配置就足够了；不需要单独安装插件。

| 属性         | 值                                              |
| ---------------- | -------------------------------------------------- |
| 运行时提供者 | `opencode-go`                                      |
| 插件           | 已内置（`opencode-go`）                            |
| 认证             | `OPENCODE_API_KEY`（别名：`OPENCODE_ZEN_API_KEY`） |
| 父级设置     | [OpenCode](/providers/opencode)                    |

## <a id="getting-started"></a> 入门

OpenCode Go 已包含在 OpenClaw 中。继续交互式登录或直接传递共享的 OpenCode API 密钥。

<Tabs>
  <Tab id="interactive" title="交互的">
    <Steps>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step id="set-a-go-model-as-default" title="将 Go 模型设置为默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k3"
        ```
      </Step>
      <Step id="verify-models-are-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab id="non-interactive" title="非交互式">
    <Steps>
      <Step id="pass-the-key-directly" title="直接传key">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
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
  env: { vars: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" } }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k3" } } },
}
```

## <a id="catalog"></a> 目录

运行 `openclaw models list --provider opencode-go` 以获取当前模型列表。 OpenClaw 显示每个模型 ID Go 的模型列表通过 `https://models.opencode.ai/api.json` 的元数据进行广告和丰富，因此新模型会在没有 OpenClaw 更新的情况下出现。元数据尚未描述的 ID 使用具有默认限制的 Go 的 OpenAI- 兼容路由。 OpenClaw 还在模型列表请求上使用其 `openclaw/<version>` 用户代理来标识自己。仅当使用 OpenCode 凭证配置或显式选择 OpenCode Zen 或 Go 时，才会下载并缓存上游目录；它永远不会在启动时或使用不相关的提供程序时获取。

示例参考包括 `opencode-go/deepseek-v4-flash`、`opencode-go/kimi-k3` 和 `opencode-go/qwen3.8-max`。将 CLI 用于当前阵容，而不是将这些示例视为库存。 OpenClaw 从主动发现中排除已弃用的行，并将刷新的生命周期状态应用于其脱机回退。捆绑的预览行保持隐藏状态，直到接受的上游元数据提供它们为止。捆绑种子中现有的显式引用仍然是可解析的。

Go 模型列表端点是一般清单，而不是帐户权限检查。成功列出并不授予访问权限：推理仍然需要有效的 Go 订阅，包括促销模型。

DeepSeek V4 模型在代理轮流和独立完成中应用相同的思维控制。显式的 `off` 会禁用本​​机思维并从重播历史中删除推理；启用思维保留了后续回合所需的推理。两条路径还省略了具有固定推理的 MiniMax 模型不受支持的控件，并删除了 Kimi K2 推理重放字段。

## <a id="privacy"></a> 隐私

保留和培训政策因模型而异。在使用模型之前查看当前的 [OpenCode Go 隐私表](https://opencode.ai/docs/go/#privacy)，因为提供者策略可以独立于 OpenClaw 进行更改。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="routing-behavior" title="路由行为">
    OpenClaw 会自动路由任何 `opencode-go/...` 模型引用。无需额外的提供方配置。
  </Accordion>

  <Accordion id="runtime-ref-convention" title="运行时引用约定">
    运行时引用保持显式：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`。这样可以确保上游按模型路由在两个目录中都保持正确。
  </Accordion>

  <Accordion id="shared-credentials" title="共享凭证">
    同一个 `OPENCODE_API_KEY` 可以对两个运行时提供方进行身份验证，因此设置时可以存储两个配置。Go 访问仍需要在 OpenCode 控制台中单独购买付费订阅。
  </Accordion>
</AccordionGroup>

<Tip>
参见 [OpenCode](/providers/opencode) 获取共享引导概览以及完整的 Zen + Go 目录参考。
</Tip>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="OpenCode（父级）" href="/providers/opencode" icon="server">
    共享引导、目录概览和高级说明。
  </Card>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
</CardGroup>
