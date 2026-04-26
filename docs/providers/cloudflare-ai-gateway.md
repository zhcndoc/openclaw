---
summary: "Cloudflare AI 网关设置（认证 + 模型选择）"
title: "Cloudflare AI 网关"
read_when:
  - 你想将 Cloudflare AI 网关与 OpenClaw 一起使用
  - 你需要账号 ID、网关 ID 或 API 密钥环境变量
---

Cloudflare AI 网关位于提供商 API 之前，允许你添加分析、缓存和控制。对于 Anthropic，OpenClaw 通过你的网关端点使用 Anthropic Messages API。

| 属性      | 值                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| 提供商      | `cloudflare-ai-gateway`                                                                  |
| 基础 URL      | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`               |
| 默认模型 | `cloudflare-ai-gateway/claude-sonnet-4-6`                                                |
| API 密钥       | `CLOUDFLARE_AI_GATEWAY_API_KEY`（通过网关发出请求时使用的提供商 API 密钥） |

<Note>
对于通过 Cloudflare AI 网关路由的 Anthropic 模型，请使用你的 **Anthropic API 密钥** 作为提供商密钥。
</Note>

## 开始使用

<Steps>
  <Step title="设置提供商 API 密钥和网关详情">
    运行 onboarding 并选择 Cloudflare AI 网关认证选项：

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    这将提示你输入账号 ID、网关 ID 和 API 密钥。

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
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider cloudflare-ai-gateway
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本化或 CI 设置，在命令行上传递所有值：

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
  <Accordion title="经过认证的网关">
    如果你在 Cloudflare 中启用了网关认证，请添加 `cf-aig-authorization` 头。这 **除了** 你的提供商 API 密钥 **之外还需要**。

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
    `cf-aig-authorization` 头用于向 Cloudflare 网关本身进行认证，而提供商 API 密钥（例如你的 Anthropic 密钥）用于向上游提供商进行认证。
    </Tip>

  </Accordion>

  <Accordion title="环境说明">
    如果网关作为守护进程（launchd/systemd）运行，请确保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅位于 `~/.profile` 中的密钥无法帮助 launchd/systemd 守护进程，除非该环境也被导入到那里。请在 `~/.openclaw/.env` 中设置密钥或通过 `env.shellEnv` 设置，以确保网关进程可以读取它。
    </Warning>

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