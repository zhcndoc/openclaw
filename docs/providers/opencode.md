---
summary: "使用 OpenClaw 结合 OpenCode 的 Zen 和 Go 目录"
read_when:
  - 你想使用 OpenCode 托管的模型访问
  - 你想在 Zen 和 Go 目录之间进行选择
title: "OpenCode"
---

OpenCode 在 OpenClaw 中提供两个托管目录：

| Catalog | Prefix            | Runtime provider |
| ------- | ----------------- | ---------------- |
| **Zen** | `opencode/...`    | `opencode`       |
| **Go** | `opencode-go/...` | `opencode-go`    |

这两个目录共用一个 OpenCode API 密钥（`OPENCODE_API_KEY`，别名
`OPENCODE_ZEN_API_KEY`）。OpenClaw 会将运行时 provider id 分开，
以便上游按模型路由保持正确，但入门和文档会将它们视为
同一个 OpenCode 配置。

## 开始使用

<Tabs>
  <Tab title="Zen catalog">
    **最佳适用场景：** 精选的 OpenCode 多模型代理（Claude、GPT、Gemini、GLM、
    DeepSeek、Kimi、MiniMax、Qwen）。

    <Steps>
      <Step title="运行入门配置">
        ```bash
        openclaw onboard --auth-choice opencode-zen
        ```

        或者直接传入密钥：

        ```bash
        openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="将 Zen 模型设为默认值">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode/gpt-5.6-sol"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Go catalog">
    **最佳适用场景：** OpenCode 托管的 Kimi、GLM、MiniMax、Qwen 和 DeepSeek 系列。

    <Steps>
      <Step title="运行入门配置">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```

        或者直接传入密钥：

        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="将 Go 模型设为默认值">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.6"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 配置示例

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/gpt-5.6-sol" } } },
}
```

## 内置目录

### Zen

| Property         | Value                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Runtime provider | `opencode`                                                                                        |
| Example models   | `opencode/gpt-5.6-sol`, `opencode/gemini-3.6-flash`, `opencode/minimax-m3`, `opencode/big-pickle` |

Run `openclaw models list --provider opencode` for the full current list, which
also includes the currently promoted free-tier rows `opencode/big-pickle`,
`opencode/deepseek-v4-flash-free`, `opencode/laguna-s-2.1-free`,
`opencode/ling-3.0-flash-free`, `opencode/mimo-v2.5-free`,
`opencode/nemotron-3-ultra-free`, and `opencode/north-mini-code-free`.

### Go

| Property         | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| 运行时提供方 | `opencode-go`                                                            |
| 示例模型   | `opencode-go/kimi-k2.6`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

参见 [OpenCode Go](/providers/opencode-go) 获取完整的 Go 模型表。

## 高级配置

<AccordionGroup>
  <Accordion title="API key 别名">
    `OPENCODE_ZEN_API_KEY` 也可作为 `OPENCODE_API_KEY` 的别名使用。
  </Accordion>

  <Accordion title="共享凭据">
    在设置过程中输入一个 OpenCode key 会为两个运行时提供方都存储凭据。你不需要分别为每个目录进行入门配置。
  </Accordion>

  <Accordion title="获取 API key">
    创建一个 OpenCode 账户，并在
    [opencode.ai/auth](https://opencode.ai/auth) 生成 API key。计费和目录
    可用性由 OpenCode 仪表板管理。
  </Accordion>

  <Accordion title="Gemini 回放行为">
    由 Gemini 支持的 OpenCode 引用会保持在代理-Gemini 路径上，因此 OpenClaw 会在该路径上保留 Gemini 思维签名清理，而不会启用原生 Gemini 回放验证或引导重写。
  </Accordion>

  <Accordion title="非 Gemini 回放行为">
    非 Gemini 的 OpenCode 引用会保留最小化的 OpenAI 兼容回放策略。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="OpenCode Go" href="/providers/opencode-go" icon="server">
    完整的 Go 目录参考。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障切换行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
</CardGroup>
