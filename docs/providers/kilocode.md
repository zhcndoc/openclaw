---
summary: "使用 Kilo Gateway 的统一 API 在 OpenClaw 中访问众多模型"
title: "Kilo Gateway"
read_when:
  - 你希望为多个 LLM 使用一个 API 密钥
  - 你希望通过 OpenClaw 中的 Kilo Gateway 运行模型
---

Kilo Gateway 提供一个 **统一 API**，通过单个
端点和 API 密钥将请求路由到许多模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换 base URL 即可工作。

| Property | Value                              |
| -------- | ---------------------------------- |
| Provider | `kilocode`                         |
| Auth     | `KILOCODE_API_KEY`                 |
| API      | OpenAI-compatible                  |
| Base URL | `https://api.kilo.ai/api/gateway/` |

## Getting started

<Steps>
  <Step title="创建账户">
    前往 [app.kilo.ai](https://app.kilo.ai)，登录或创建账户，然后进入 API Keys 并生成一个新密钥。
  </Step>
  <Step title="运行 onboarding">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    或直接设置环境变量：

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

## Default model

默认模型是 `kilocode/kilo/auto`，这是由 Kilo Gateway 管理的、提供方拥有的智能路由
模型。

<Note>
OpenClaw 将 `kilocode/kilo/auto` 视为稳定的默认引用，但不会
为该路由发布基于源的任务到上游模型映射。`kilocode/kilo/auto` 后面的精确
上游路由由 Kilo Gateway 拥有，而不是在 OpenClaw 中硬编码。
</Note>

## Built-in catalog

OpenClaw 会在启动时从 Kilo Gateway 动态发现可用模型。使用
`/models kilocode` 查看你账户可用的完整模型列表。

网关上可用的任何模型都可以使用 `kilocode/` 前缀：

| Model ref                                | Notes                              |
| ---------------------------------------- | ---------------------------------- |
| `kilocode/kilo/auto`                     | 默认 — 智能路由            |
| `kilocode/anthropic/claude-sonnet-4`     | 通过 Kilo 的 Anthropic                 |
| `kilocode/openai/gpt-5.5`                | 通过 Kilo 的 OpenAI                    |
| `kilocode/google/gemini-3.1-pro-preview` | 通过 Kilo 的 Google                    |
| ...and many more                         | 使用 `/models kilocode` 列出全部 |

<Tip>
在启动时，OpenClaw 会查询 `GET https://api.kilo.ai/api/gateway/models`，并将
发现的模型优先于静态回退目录进行合并。内置回退始终
包含 `kilocode/kilo/auto`（`Kilo Auto`），其 `input: ["text", "image"]`，
`reasoning: true`，`contextWindow: 1000000`，以及 `maxTokens: 128000`。
</Tip>

## Config example

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
    Kilo Gateway 在源码中被记录为与 OpenRouter 兼容，因此它保持在
    代理式 OpenAI 兼容路径上，而不是原生 OpenAI 请求格式化路径。

    - 由 Gemini 支持的 Kilo 引用仍然走代理-Gemini 路径，因此 OpenClaw 会在该处保留
      Gemini thought-signature 清理，而不会启用原生 Gemini
      replay 验证或 bootstrap 重写。
    - Kilo Gateway 在底层使用带有你 API 密钥的 Bearer token。

  </Accordion>

  <Accordion title="流式包装器和推理">
    Kilo 的共享流式包装器会添加提供方应用头，并为受支持的具体模型引用规范化
    代理推理负载。

    <Warning>
    `kilocode/kilo/auto` 和其他不支持代理推理的提示会跳过推理
    注入。如果你需要推理支持，请使用具体的模型引用，例如
    `kilocode/anthropic/claude-sonnet-4`。
    </Warning>

  </Accordion>

  <Accordion title="故障排除">
    - 如果启动时模型发现失败，OpenClaw 会回退到包含 `kilocode/kilo/auto` 的内置静态目录。
    - 确认你的 API 密钥有效，并且你的 Kilo 账户已启用所需的模型。
    - 当 Gateway 作为守护进程运行时，确保 `KILOCODE_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

  </Accordion>
</AccordionGroup>

## Related

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障切换行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Kilo Gateway 控制面板、API 密钥和账户管理。
  </Card>
</CardGroup>
