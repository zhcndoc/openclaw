---
summary: "Cloudflare AI Gateway 设置（认证 ＋ 模型选择）"
title: "Cloudflare AI 网关"
read_when:
  - "你想将 Cloudflare AI Gateway 与 OpenClaw 一起使用"
  - "你需要 account ID、gateway ID 或 API key 环境变量"
---

[Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) 位于提供商 API 前面，并添加了分析、缓存和控制。对于 Anthropic、OpenClaw 通过网关端点使用 Anthropic 消息 API。

| 属性      | 值                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| 提供者      | `cloudflare-ai-gateway`                                                                  |
| 插件        | 官方外部包（`@openclaw/cloudflare-ai-gateway-provider`）                   |
| 基础 URL      | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`               |
| 默认模型 | `cloudflare-ai-gateway/claude-sonnet-4-6`                                                |
| API 密钥       | `CLOUDFLARE_AI_GATEWAY_API_KEY`（你用于通过 Gateway 发起请求的提供方 API key） |

<Note>
对于通过 Cloudflare AI 网关路由的 Anthropic 模型，请使用您的 **Anthropic API key** 作为提供商密钥。
</Note>

当 Anthropic Messages 模型启用 thinking 时，OpenClaw 会在通过 Cloudflare AI Gateway 发送负载之前移除尾随的 assistant prefill turns。 Anthropic 会拒绝在 extended thinking 下进行 response prefilling，而普通的 non-thinking prefill 仍然可用。

## <a id="install-plugin"></a> 安装插件

安装官方插件：

```bash
openclaw plugins install @openclaw/cloudflare-ai-gateway-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="set-the-provider-api-key-and-gateway-details" title="设置提供商 API 密钥和网关详细信息">
    运行入门引导并选择 Cloudflare AI Gateway 认证选项：

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    这会提示你输入账户 ID、网关 ID 和 API 密钥。

  </Step>
  <Step id="set-a-default-model" title="设置默认模型">
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
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider cloudflare-ai-gateway
    ```
  </Step>
</Steps>

## <a id="non-interactive-example"></a> 非交互式示例

对于脚本或 CI 环境，请在命令行中传入所有值：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="authenticated-gateways" title="经过身份验证的网关">
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

  <Accordion id="environment-note" title="环境注意事项">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅在交互式 shell 中导出的密钥不会对 launchd/systemd 守护进程有帮助，除非该环境也被导入其中。在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置密钥，以便网关进程可以读取它。
    </Warning>

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
