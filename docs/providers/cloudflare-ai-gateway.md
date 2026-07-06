---
summary: "Cloudflare AI Gateway 设置（认证 + 模型选择）"
title: "Cloudflare AI gateway"
read_when:
  - 你想将 Cloudflare AI Gateway 与 OpenClaw 一起使用
  - 你需要 account ID、gateway ID 或 API key 环境变量
---

[Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) 位于提供方 API 之前，并添加分析、缓存和控制功能。对于 Anthropic，OpenClaw 会通过你的 Gateway 端点使用 Anthropic Messages API。

| Property      | Value                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| Provider      | `cloudflare-ai-gateway`                                                                  |
| Plugin        | official external package (`@openclaw/cloudflare-ai-gateway-provider`)                   |
| Base URL      | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`               |
| Default model | `cloudflare-ai-gateway/claude-sonnet-4-6`                                                |
| API key       | `CLOUDFLARE_AI_GATEWAY_API_KEY`（你用于通过 Gateway 发起请求的提供方 API key） |

<Note>
对于通过 Cloudflare AI Gateway 路由的 Anthropic 模型，请将你的 **Anthropic API key** 作为提供方密钥使用。
</Note>

当 Anthropic Messages 模型启用 thinking 时，OpenClaw 会在通过 Cloudflare AI Gateway 发送负载之前移除尾随的 assistant prefill turns。
Anthropic 会拒绝在 extended thinking 下进行 response prefilling，而普通的
non-thinking prefill 仍然可用。

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/cloudflare-ai-gateway-provider
openclaw gateway restart
```

## 入门

<Steps>
  <Step title="设置提供方 API key 和 Gateway 详情">
    运行 onboarding 并选择 Cloudflare AI Gateway 认证选项：

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    这会提示你输入 account ID、gateway ID 和 API key。

  </Step>
  <Step title="设置默认模型">
    将模型添加到你的 OpenClaw 配置中：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-6" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型可用">
    ```bash
    openclaw models list --provider cloudflare-ai-gateway
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本或 CI 环境，请在命令行中传入所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## 高级配置

<AccordionGroup>
  <Accordion title="已认证的网关">
    如果你在 Cloudflare 中启用了 Gateway 认证，请添加 `cf-aig-authorization` 标头。这是**额外添加的**，不同于你的提供方 API key。

    ```json5
    {
      models: {
        providers: {
          "cloudflare-ai-gateway": {
            headers: {
              "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
            },
          },
        },
      },
    }
    ```

    <Tip>
    `cf-aig-authorization` 标头用于对 Cloudflare Gateway 本身进行认证，而提供方 API key（例如你的 Anthropic key）用于对上游提供方进行认证。
    </Tip>

  </Accordion>

  <Accordion title="环境说明">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅在交互式 shell 中导出的密钥不会帮助 launchd/systemd 守护进程，除非该环境也被导入其中。请将密钥设置在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 设置，以确保 gateway 进程可以读取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障切换行为。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和 FAQ。
  </Card>
</CardGroup>