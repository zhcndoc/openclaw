---
summary: "Vercel AI Gateway 设置（认证＋模型选择）"
title: "Vercel AI 网关"
read_when:
  - "你想将 Vercel AI Gateway 与 OpenClaw 一起使用"
  - "你需要 API 密钥环境变量或 CLI 认证选项"
---

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供了一个统一的 API，可通过单一端点访问数百种模型。

| 属性      | 值                                  |
| ------------- | -------------------------------------- |
| 提供者      | `vercel-ai-gateway`                    |
| 包裹       | `@openclaw/vercel-ai-gateway-provider` |
| 认证          | `AI_GATEWAY_API_KEY`                   |
| API           | Anthropic Messages 兼容          |
| 基础 URL      | `https://ai-gateway.vercel.sh`         |
| 模型目录 | 通过 `/v1/models` 自动发现       |

<Tip>
OpenClaw 会自动发现 Gateway 的 `/v1/models` 目录，因此 `/models vercel-ai-gateway` 聊天命令和 `openclaw models list --provider vercel-ai-gateway` 都会包含当前模型引用，例如 `vercel-ai-gateway/openai/gpt-5.5` 和 `vercel-ai-gateway/moonshotai/kimi-k2.6`。
</Tip>

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/vercel-ai-gateway-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="set-the-api-key" title="设置API密钥">
    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```
  </Step>
  <Step id="set-a-default-model" title="设置默认模型">
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
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## <a id="non-interactive-example"></a> 非交互式示例

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## <a id="model-id-shorthand"></a> 模型 ID 简写

OpenClaw 在运行时会规范化 Claude 的简写模型引用：

| 简写输入                     | 规范化后的模型引用                          |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>
在您的配置中使用任一形式； OpenClaw 自动解析完整的 `anthropic/...` 引用。
</Tip>

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="environment-variable-for-daemon-processes" title="守护进程的环境变量">
    如果 OpenClaw Gateway 作为守护进程运行（launchd/systemd），请确保 `AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅在交互式 shell 中导出的密钥对 launchd/systemd 守护程序不可见，除非显式导入该环境。在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置密钥，以便网关进程可以读取它。
    </Warning>

  </Accordion>

  <Accordion id="provider-routing" title="提供商路由">
    Vercel AI Gateway 会根据模型引用前缀将每个请求路由到上游提供方。例如，`vercel-ai-gateway/anthropic/claude-opus-4.6` 会通过 Anthropic 路由，`vercel-ai-gateway/openai/gpt-5.5` 会通过 OpenAI 路由，而 `vercel-ai-gateway/moonshotai/kimi-k2.6` 会通过 MoonshotAI 路由。一个 `AI_GATEWAY_API_KEY` 可对所有上游提供方进行身份验证。
  </Accordion>
  <Accordion id="thinking-levels" title="思考级别">
    当 OpenClaw 识别到 `/think` 选项时，会遵循上游模型前缀。`vercel-ai-gateway/anthropic/...` 使用 Claude 思考配置文件， 包括 Claude 4.6 模型的自适应默认值。受信任的 `vercel-ai-gateway/openai/...` 引用（`gpt-5.2` 及更新版本，以及向下到 `gpt-5.1-codex` 的 Codex 变体）会暴露 `/think xhigh`。其他命名空间引用则保持标准推理层级，除非其目录元数据声明了更多内容。
  </Accordion>
  <Accordion id="app-attribution" title="应用归因">
    对 `ai-gateway.vercel.sh` 的请求携带 Vercel 记录的应用属性标头 `HTTP-Referer: https://openclaw.ai` 和 `X-Title: OpenClaw`。这也适用于 `baseUrl` 指向 AI 网关的自定义提供商 ID。自定义代理 `baseUrl` 没有归属标头。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和 FAQ。
  </Card>
</CardGroup>
