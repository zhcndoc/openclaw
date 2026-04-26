---
summary: "使用 OpenCode Zen 和 Go 目录搭配 OpenClaw"
read_when:
  - 你想使用 OpenCode 托管的模型访问
  - 你想在 Zen 和 Go 目录中进行选择
title: "OpenCode"
---

OpenCode 在 OpenClaw 中提供两个托管目录：

| 目录 | Prefix            | 运行时提供者 |
| ------- | ----------------- | ---------------- |
| **Zen** | `opencode/...`    | `opencode`       |
| **Go**  | `opencode-go/...` | `opencode-go`    |

两个目录都使用相同的 OpenCode API 密钥。OpenClaw 保持运行时提供者 ID 的分离，以确保上游的逐模型路由保持正确，但入门和文档将它们视为一个 OpenCode 设置。

## 入门指南

<Tabs>
  <Tab title="Zen 目录">
    **最适合：** 精选的 OpenCode 多模型代理（Claude、GPT、Gemini）。

    <Steps>
      <Step title="运行初始化">
        ```bash
        openclaw onboard --auth-choice opencode-zen
        ```

        或直接传递密钥：

        ```bash
        openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="将 Zen 模型设置为默认">
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
      <Step title="运行初始化">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```

        或直接传递密钥：

        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="将 Go 模型设置为默认">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
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

| 属性         | 值                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| 运行时提供者 | `opencode`                                                              |
| 示例模型   | `opencode/claude-opus-4-6`, `opencode/gpt-5.5`, `opencode/gemini-3-pro` |

### Go

| 属性         | 值                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| 运行时提供者 | `opencode-go`                                                            |
| 示例模型   | `opencode-go/kimi-k2.5`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

## 高级配置

<AccordionGroup>
  <Accordion title="API 密钥别名">
    `OPENCODE_ZEN_API_KEY` 也支持作为 `OPENCODE_API_KEY` 的别名。
  </Accordion>

  <Accordion title="共享凭据">
    在设置期间输入一个 OpenCode 密钥即可存储两个运行时提供者的凭据。您不需要分别对每个目录进行初始化。
  </Accordion>

  <Accordion title="计费和仪表板">
    您登录 OpenCode，添加计费详细信息，然后复制您的 API 密钥。计费和目录可用性均在 OpenCode 仪表板中管理。
  </Accordion>

  <Accordion title="Gemini 重放行为">
    基于 Gemini 的 OpenCode 引用保留在代理 -Gemini 路径上，因此 OpenClaw 在那里保持 Gemini 思维签名清理，而无需启用原生 Gemini 重放验证或引导重写。
  </Accordion>

  <Accordion title="非 Gemini 重放行为">
    非 Gemini 的 OpenCode 引用保持最小的 OpenAI 兼容重放策略。
  </Accordion>
</AccordionGroup>

<Tip>
在设置期间输入一个 OpenCode 密钥即可存储 Zen 和
Go 运行时提供者的凭据，因此您只需初始化一次。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供者、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    代理、模型和提供者的完整配置参考。
  </Card>
</CardGroup>
