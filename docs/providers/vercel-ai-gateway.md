---
summary: "Vercel AI Gateway 设置（认证 + 模型选择）"
title: "Vercel AI gateway"
read_when:
  - 你想将 Vercel AI Gateway 与 OpenClaw 一起使用
  - 你需要 API key 环境变量或 CLI 认证选项
---

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供了一个统一的 API，可通过单一端点访问数百种模型。

| Property      | Value                                  |
| ------------- | -------------------------------------- |
| Provider      | `vercel-ai-gateway`                    |
| Package       | `@openclaw/vercel-ai-gateway-provider` |
| Auth          | `AI_GATEWAY_API_KEY`                   |
| API           | Anthropic Messages compatible          |
| Model catalog | Auto-discovered via `/v1/models`       |

<Tip>
OpenClaw 会自动发现 Gateway 的 `/v1/models` 目录，因此
`/models vercel-ai-gateway` 会包含当前的模型引用，例如
`vercel-ai-gateway/openai/gpt-5.5` 和
`vercel-ai-gateway/moonshotai/kimi-k2.6`。
</Tip>

## 开始使用

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/vercel-ai-gateway-provider
    ```
  </Step>
  <Step title="设置 API key">
    运行 onboarding 并选择 AI Gateway 认证选项：

    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```

  </Step>
  <Step title="设置默认模型">
    将模型添加到你的 OpenClaw 配置中：

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
  <Step title="验证模型可用">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本或 CI 环境，请在命令行中传入所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 模型 ID 简写

OpenClaw 接受 Vercel Claude 简写模型引用，并在运行时将其规范化：

| 简写输入                            | 规范化后的模型引用                        |
| ----------------------------------- | ----------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>
你可以在配置中使用简写或完整的模型引用。OpenClaw 会自动解析规范形式。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="守护进程的环境变量">
    如果 OpenClaw Gateway 作为守护进程运行（launchd/systemd），请确保
    `AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅在交互式 shell 中导出的 key 对 launchd/systemd 守护进程不可见，除非该环境被显式导入。请将
    key 设置在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 设置，以确保 gateway
    进程能够读取它。
    </Warning>

  </Accordion>

  <Accordion title="提供方路由">
    Vercel AI Gateway 会根据模型引用前缀将请求路由到上游提供方。例如，`vercel-ai-gateway/anthropic/claude-opus-4.6` 会通过
    Anthropic 路由，而 `vercel-ai-gateway/openai/gpt-5.5` 会通过
    OpenAI 路由，`vercel-ai-gateway/moonshotai/kimi-k2.6` 会通过
    MoonshotAI 路由。你的单个 `AI_GATEWAY_API_KEY` 负责所有上游提供方的认证。
  </Accordion>
  <Accordion title="思考等级">
    当 OpenClaw 知道上游提供方契约时，`/think` 选项会遵循受信任的上游模型前缀。`vercel-ai-gateway/anthropic/...` 使用
    Claude 思考配置文件，包括 Claude 4.6 模型的自适应默认值。
    `vercel-ai-gateway/openai/gpt-5.4`、`gpt-5.5` 和 Codex 风格的引用会像直接使用 OpenAI/OpenAI Codex 提供方一样提供
    `/think xhigh`。其他命名空间引用会保持正常推理等级，除非其目录元数据声明了更多内容。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障切换行为。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和常见问题。
  </Card>
</CardGroup>
