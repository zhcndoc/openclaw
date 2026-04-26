---
summary: "Vercel AI Gateway 设置（认证 + 模型选择）"
title: "Vercel AI gateway"
read_when:
  - 您想将 Vercel AI Gateway 与 OpenClaw 一起使用
  - 您需要 API 密钥环境变量或 CLI 身份验证选项
---

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供了一个统一的 API，可通过单一端点访问数百种模型。

| 属性            | 值                               |
| ------------- | -------------------------------- |
| Provider      | `vercel-ai-gateway`              |
| Auth          | `AI_GATEWAY_API_KEY`             |
| API           | 兼容 Anthropic Messages            |
| Model catalog | 通过 `/v1/models` 自动发现 |

<Tip>
OpenClaw 会自动发现 Gateway 的 `/v1/models` 目录，因此
`/models vercel-ai-gateway` 包含当前的模型引用，例如
`vercel-ai-gateway/openai/gpt-5.5` 和
`vercel-ai-gateway/moonshotai/kimi-k2.6`。
</Tip>

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    运行入门引导并选择 AI Gateway 身份验证选项：

    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```

  </Step>
  <Step title="设置默认模型">
    将模型添加到您的 OpenClaw 配置：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## 非交互示例

对于脚本或 CI 设置，请在命令行上传递所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 模型 ID 简写

OpenClaw 接受 Vercel Claude 简写模型引用，并在运行时对其进行规范化：

| 简写输入                     | 规范化模型引用                          |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>
您可以在配置中使用简写或完全限定的模型引用。OpenClaw 会自动解析规范形式。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="守护进程的环境变量">
    如果 OpenClaw Gateway 作为守护进程（launchd/systemd）运行，请确保
    `AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅在 `~/.profile` 中设置的密钥对于 launchd/systemd
    守护进程不可见，除非显式导入该环境。请在
    `~/.openclaw/.env` 中设置密钥或通过 `env.shellEnv` 设置，以确保网关进程可以
    读取它。
    </Warning>

  </Accordion>

  <Accordion title="提供商路由">
    Vercel AI Gateway 会根据模型引用前缀将请求路由到上游提供商。例如，`vercel-ai-gateway/anthropic/claude-opus-4.6` 会通过 Anthropic 路由，而 `vercel-ai-gateway/openai/gpt-5.5` 会通过 OpenAI 路由，`vercel-ai-gateway/moonshotai/kimi-k2.6` 会通过 MoonshotAI 路由。您的单个 `AI_GATEWAY_API_KEY` 即可处理所有上游提供商的身份验证。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题解答。
  </Card>
</CardGroup>
