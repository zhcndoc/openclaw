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

这两个目录都使用同一个 OpenCode API key。OpenClaw 会将运行时提供方 id 分开，以便上游按模型路由时保持正确，但入门和文档会将它们视为同一个 OpenCode 配置。

## 开始使用

<Tabs>
  <Tab title="Zen 目录">
    **最适合：** 经过精选的 OpenCode 多模型代理（Claude、GPT、Gemini）。

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
        openclaw config set agents.defaults.model.primary "opencode/claude-opus-4-6"
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
    **最适合：** OpenCode 托管的 Kimi、GLM 和 MiniMax 系列。

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
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 内置目录

### Zen

| Property         | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| Runtime provider | `opencode`                                                              |
| Example models   | `opencode/claude-opus-4-6`, `opencode/gpt-5.5`, `opencode/gemini-3-pro` |

### Go

| Property         | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| Runtime provider | `opencode-go`                                                            |
| Example models   | `opencode-go/kimi-k2.6`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

## 高级配置

<AccordionGroup>
  <Accordion title="API key 别名">
    `OPENCODE_ZEN_API_KEY` 也支持作为 `OPENCODE_API_KEY` 的别名。
  </Accordion>

  <Accordion title="共享凭据">
    在设置过程中输入一个 OpenCode key 会为两个运行时提供方都存储凭据。你不需要分别为每个目录进行入门配置。
  </Accordion>

  <Accordion title="计费与控制台">
    你登录 OpenCode，添加计费信息，并复制你的 API key。计费和目录可用性由 OpenCode 控制台管理。
  </Accordion>

  <Accordion title="Gemini 回放行为">
    由 Gemini 支持的 OpenCode 引用会保持在代理-Gemini 路径上，因此 OpenClaw 会在该路径上保留 Gemini 思维签名清理，而不会启用原生 Gemini 回放验证或引导重写。
  </Accordion>

  <Accordion title="非 Gemini 回放行为">
    非 Gemini 的 OpenCode 引用会保留最小化的 OpenAI 兼容回放策略。
  </Accordion>
</AccordionGroup>

<Tip>
在设置过程中输入一个 OpenCode key 会为 Zen 和 Go 两个运行时提供方都存储凭据，因此你只需要配置一次。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
</CardGroup>
