---
summary: "使用 Kilo Gateway 的统一 API 在 OpenClaw 中访问多个模型"
title: "Kilocode"
read_when:
  - 你想用一个 API 密钥访问多个大型语言模型（LLM）
  - 你想通过 OpenClaw 中的 Kilo Gateway 运行模型
---

# Kilo Gateway

Kilo Gateway 提供了一个**统一的 API**，通过单一端点和 API 密钥将请求路由到多个模型。它兼容 OpenAI，大多数 OpenAI SDK 只需切换基础 URL 即可使用。

| 属性 | 值 |
| -------- | ---------------------------------- |
| 提供商 | `kilocode` |
| 认证 | `KILOCODE_API_KEY` |
| API | 兼容 OpenAI |
| 基础 URL | `https://api.kilo.ai/api/gateway/` |

## 快速开始

<Steps>
  <Step title="创建账户">
    前往 [app.kilo.ai](https://app.kilo.ai)，登录或创建账户，然后导航到 API Keys 并生成新密钥。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    或者直接设置环境变量：

    ```bash
    export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider kilocode
    ```
  </Step>
</Steps>

## 默认模型

默认模型是 `kilocode/kilo/auto`，这是一个由 Kilo Gateway 管理的提供商拥有的智能路由模型。

<Note>
OpenClaw 将 `kilocode/kilo/auto` 视为稳定的默认引用，但不发布该路由的基于源的任务到上游模型映射。`kilocode/kilo/auto` 背后的确切上游路由由 Kilo Gateway 拥有，而不是硬编码在 OpenClaw 中。
</Note>

## 内置目录

OpenClaw 在启动时从 Kilo Gateway 动态发现可用模型。使用 `/models kilocode` 查看账户可用的完整模型列表。

网关上可用的任何模型都可以使用 `kilocode/` 前缀：

| 模型引用 | 备注 |
| -------------------------------------- | ---------------------------------- |
| `kilocode/kilo/auto`                   | 默认 — 智能路由            |
| `kilocode/anthropic/claude-sonnet-4`   | 通过 Kilo 的 Anthropic                 |
| `kilocode/openai/gpt-5.5`              | 通过 Kilo 的 OpenAI                    |
| `kilocode/google/gemini-3-pro-preview` | 通过 Kilo 的 Google                    |
| ...还有更多                       | 使用 `/models kilocode` 列出全部 |

<Tip>
启动时，OpenClaw 查询 `GET https://api.kilo.ai/api/gateway/models` 并将发现的模型合并到静态回退目录之前。捆绑的回退始终包括 `kilocode/kilo/auto` (`Kilo Auto`)，其中 `input: ["text", "image"]`，`reasoning: true`，`contextWindow: 1000000` 和 `maxTokens: 128000`。
</Tip>

## 配置示例

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="传输和兼容性">
    Kilo Gateway 在源代码中被记录为与 OpenRouter 兼容，因此它保持在代理风格的 OpenAI 兼容路径上，而不是原生 OpenAI 请求整形。

    - 基于 Gemini 的 Kilo 引用保持在代理 Gemini 路径上，因此 OpenClaw 在那里保持 Gemini 思考签名清理，而无需启用原生 Gemini 重放验证或引导重写。
    - Kilo Gateway 在底层使用带有您的 API 密钥的 Bearer 令牌。

  </Accordion>

  <Accordion title="流包装器和推理">
    Kilo 的共享流包装器添加提供商应用头并为支持的具体模型引用标准化代理推理负载。

    <Warning>
    `kilocode/kilo/auto` 和其他不支持代理推理的提示跳过推理注入。如果您需要推理支持，请使用具体模型引用，例如 `kilocode/anthropic/claude-sonnet-4`。
    </Warning>

  </Accordion>

  <Accordion title="故障排除">
    - 如果启动时模型发现失败，OpenClaw 将回退到包含 `kilocode/kilo/auto` 的捆绑静态目录。
    - 确认您的 API 密钥有效，并且您的 Kilo 账户已启用所需模型。
    - 当 Gateway 作为守护进程运行时，确保 `KILOCODE_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/gateway/configuration-reference" icon="gear">
    Full OpenClaw configuration reference.
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Kilo Gateway 仪表板、API 密钥和账户管理。
  </Card>
</CardGroup>
