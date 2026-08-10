---
summary: "使用 OpenClaw 结合 OpenCode 的 Zen 和 Go 目录"
read_when:
  - 你想使用 OpenCode 托管的模型访问
  - 你想在 Zen 和 Go 目录之间进行选择
title: "OpenCode"
---

OpenCode 在 OpenClaw 中提供两个托管目录：

| 目录 | 前缀 | 运行时提供商 |
| ------- | ----------------- | ---------------- |
| **Zen** | `opencode/...`    | `opencode`       |
| **Go** | `opencode-go/...` | `opencode-go`    |

两个目录使用相同的 OpenCode API 密钥基础设施（`OPENCODE_API_KEY`，
别名为 `OPENCODE_ZEN_API_KEY`）。Go 仍然需要单独的付费订阅；
拥有 Zen 密钥本身并不会授予 Go 的访问权限。OpenClaw 将运行时提供商 ID 分开，
以确保上游的按模型路由保持正确。

## 开始使用

<Tabs>
  <Tab title="Zen 目录">
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

  <Tab title="Go 目录">
    **最佳适用场景：** 分别订阅的 Go 系列，涵盖 DeepSeek、GLM、GPT、
    Grok、Hy3、Kimi、MiMo、MiniMax 和 Qwen。

    <Steps>
      <Step title="使用内置的 Go 目录">
        此版本已将 OpenCode Go 集成到 OpenClaw 中，因此无需单独安装插件或重启网关。
      </Step>
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
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k3"
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

## 提供方目录

### Zen

| 属性             | 值                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 运行时提供方     | `opencode`                                                                                                             |
| 示例模型         | `opencode/gpt-5.6-sol`、`opencode/kimi-k3`、`opencode/gemini-3.6-flash`、`opencode/minimax-m3`、`opencode/big-pickle` |

运行 `openclaw models list --provider opencode` 获取当前可用的模型列表，
其中还包括已推广的免费层模型条目 `opencode/big-pickle`、
`opencode/deepseek-v4-flash-free`、`opencode/laguna-s-2.1-free`、
`opencode/ling-3.0-tiny-free`、`opencode/longcat-2.0-free`、
`opencode/mimo-v2.5-free`、
`opencode/nemotron-3-ultra-free` 和 `opencode/north-mini-code-free`。

实时发现功能会将 OpenCode 返回的 ID 与 OpenClaw 的可信元数据进行安全交集处理。按密钥限定的响应可能会省略当前工作区不可用的模型；缺少这些模型并不意味着离线定义已被弃用。已弃用的显式引用对于现有配置仍可解析，但不会显示为当前推荐项。

### Go

| 属性             | 值                                                                           |
| ---------------- | ---------------------------------------------------------------------------- |
| 运行时提供方     | `opencode-go`                                                                |
| 示例模型         | `opencode-go/kimi-k3`、`opencode-go/gpt-5.6-luna`、`opencode-go/qwen3.8-max` |

参见 [OpenCode Go](/providers/opencode-go) 获取完整的 Go 模型表。

## 高级配置

<AccordionGroup>
  <Accordion title="API key 别名">
    `OPENCODE_ZEN_API_KEY` 也可作为 `OPENCODE_API_KEY` 的别名使用。
  </Accordion>

  <Accordion title="共享凭据">
    在设置期间输入一个 OpenCode 密钥，可以为两个运行时提供商存储凭据。它不会创建 Go 订阅或授予 Go 使用权；使用 Go 前，请先在 OpenCode 控制台中订阅 Go。
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
  <Accordion title="定价和隐私">
    计费、数据保留和训练政策因模型而异。在选择路径前，请查看最新的
    [OpenCode Zen 定价和政策](https://opencode.ai/docs/zen/)。
    免费模型可能属于临时性的反馈计划。
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
