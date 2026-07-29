---
summary: "使用 Kilo Gateway 的统一 API 在 OpenClaw 中访问众多模型"
title: "Kilo Gateway"
read_when:
  - 你希望为多个 LLM 使用一个 API 密钥
  - 你希望通过 OpenClaw 中的 Kilo Gateway 运行模型
---

Kilo Gateway 将请求路由到许多模型，背后通过一个与 OpenAI 兼容的端点和 API 密钥进行统一访问。

| 属性 | 值                               |
| -------- | ---------------------------------- |
| 提供方 | `kilocode`                         |
| 认证 | `KILOCODE_API_KEY`                 |
| API | 兼容 OpenAI                  |
| 基础 URL | `https://api.kilo.ai/api/gateway/` |

## 安装插件

```bash
openclaw plugins install @openclaw/kilocode-provider
openclaw gateway restart
```

## 设置

<Steps>
  <Step title="创建账户">
    前往 [app.kilo.ai](https://app.kilo.ai)，登录或创建账户，然后生成一个 API 密钥。
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

## 默认模型和目录

The default model is `kilocode/kilo-auto/balanced`, Kilo Gateway's balanced smart-routing tier.
OpenClaw does not publish a task-to-upstream-model mapping for it; routing behind
`kilo-auto/balanced` is owned by Kilo Gateway.

At startup OpenClaw queries `GET https://api.kilo.ai/api/gateway/models` and merges discovered models
ahead of a static fallback catalog. The static fallback contains only
`kilocode/kilo-auto/balanced` (`Auto Balanced`, `input: ["text", "image"]`, `reasoning: true`,
`contextWindow: 1000000`, `maxTokens: 65536`).

网关上的任何模型都可以通过 `kilocode/<upstream-id>` 访问（例如
`kilocode/anthropic/claude-sonnet-4`、`kilocode/openai/gpt-5.5`）。运行 `/models kilocode` 或
`openclaw models list --provider kilocode` 可以查看完整的已发现列表。

## 配置示例

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo-auto/balanced" },
    },
  },
}
```

## 行为说明

<AccordionGroup>
  <Accordion title="传输与兼容性">
    Kilo Gateway 兼容 OpenRouter，因此它使用的是代理式的 OpenAI 兼容请求
    路径，而不是原生 OpenAI 请求格式化（没有 `store`，也没有 OpenAI reasoning-effort 负载）。

    - Gemini 支持的 Kilo 引用仍然走代理 Gemini 路径：OpenClaw 会在该路径中清理 Gemini thought
      签名，但不会启用原生 Gemini 回放验证或 bootstrap 重写。
    - 请求使用由你的 API key 生成的 Bearer token。

  </Accordion>

  <Accordion title="流包装器与推理">
    Kilo 流包装器会添加一个 `X-KILOCODE-FEATURE` 请求头（默认值为 `openclaw`，
    可通过 `KILOCODE_FEATURE` 环境变量覆盖），并为支持该功能的模型规范化 reasoning-effort 负载。

    <Warning>
    `kilocode/kilo-auto/balanced` and `x-ai/*` refs skip reasoning-effort injection. Use a concrete
    model ref such as `kilocode/anthropic/claude-sonnet-4` if you need reasoning support.
    </Warning>

  </Accordion>

  <Accordion title="Troubleshooting">
    - If model discovery fails at startup, OpenClaw falls back to the static catalog containing `kilocode/kilo-auto/balanced`.
    - Confirm your API key is valid and that your Kilo account has the desired models enabled.
    - When Gateway runs as a daemon, ensure `KILOCODE_API_KEY` is available to that process (for example in `~/.openclaw/.env` or via `env.shellEnv`).

  </Accordion>
</AccordionGroup>

## 相关内容

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
