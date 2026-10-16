---
summary: "用于 OpenAI- 兼容 AI 推理的 Telnyx 设置"
title: "Telnyx"
read_when:
  - "您想要在 OpenClaw 中运行 Telnyx- 托管模型"
  - "您需要一个 OpenAI- 兼容的 API 用于 Telnyx AI 推理"
---

[Telnyx AI 推理](https://developers.telnyx.com/docs/inference/getting-started) 提供对开放权重模型以及代理边境路线的托管、OpenAI- 兼容访问。供应商维护的外部 [`@telnyx/openclaw-provider`](https://github.com/team-telnyx/openclaw-telnyx-provider) 插件提供运行时； OpenClaw 携带其目录和入门元数据。经过身份验证的发现遵循为您的 Telnyx 帐户启用的完整模型集，而离线后备包含构建该插件版本时可用的模型。

| 属性        | 值                                                            |
| --------------- | ---------------------------------------------------------------- |
| 提供方 id     | `telnyx`                                                         |
| 插件          | 供应商维护的外部包 （`@telnyx/openclaw-provider`） |
| 认证环境变量    | `TELNYX_API_KEY`                                                 |
| 引导标志 | `--auth-choice telnyx-api-key`                                   |
| 直接 CLI 标志 | `--telnyx-api-key <key>`                                         |
| API             | OpenAI-兼容（`openai-completions`）                         |
| 基础 URL        | `https://api.telnyx.com/v2/ai/openai`                            |
| 默认模型   | `telnyx/moonshotai/Kimi-K3`                                      |

## <a id="requirements"></a> 要求

`@telnyx/openclaw-provider@0.2.0` 的目录引脚需要 OpenClaw `2026.8.1` 或更新版本。安装插件之前升级 OpenClaw：

```bash
openclaw update
openclaw --version
```

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install telnyx
openclaw gateway restart
```

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="create-a-telnyx-account-and-api-key" title="创建 Telnyx 账户和 API 密钥">
    在 [Telnyx API 密钥门户 ](https://portal.telnyx.com/#/app/api-keys) 中创建密钥。推理调用是按使用情况定价的；有关当前模型和费率，请参阅 [Telnyx 推理文档 ](https://developers.telnyx.com/docs/inference/getting-started)。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice telnyx-api-key
```

```bash Direct flag
openclaw onboard --non-interactive --accept-risk \
  --auth-choice telnyx-api-key \
  --telnyx-api-key "$TELNYX_API_KEY"
```

```bash Env only
export TELNYX_API_KEY=...
```

    </CodeGroup>

    在交互式运行中，选择 **Telnyx API key** 选项。对于非交互式设置，请先阅读 [ 安全指南](/security)； `--accept-risk` 确认安装程序可以在没有提示的情况下写入凭据和守护程序配置。

  </Step>
  <Step id="verify-the-live-catalog" title="验证实时目录">
    ```bash
    openclaw models list --refresh --provider telnyx
    ```

    通过可用的身份验证，该插件会请求经过身份验证的 `/models` 端点，并列出为帐户返回的每个模型。如果没有身份验证，它会保持离线状态并使用捆绑后备。

  </Step>
</Steps>

## <a id="default-model"></a> 默认模型

`telnyx/moonshotai/Kimi-K3` 为默认模型。在OpenClaw中，它支持文本和图像输入、工具调用、推理、1M-token上下文窗口以及最多64k输出token：

```json5
{
  agents: {
    defaults: {
      model: { primary: "telnyx/moonshotai/Kimi-K3" },
    },
  },
}
```

使用 `/model telnyx/moonshotai/Kimi-K3` 切换现有聊天。

## <a id="live-model-discovery"></a> 实时模型发现

该插件获取经过身份验证的 `/models` 端点并将结果缓存五分钟，然后将这些行合并到捆绑的目录中。新推出的Telnyx模型无需等待插件发布即可自动出现，包括`telnyx/openai/gpt-5.x`、`telnyx/anthropic/claude-haiku-4-5`和`telnyx/google/gemini-2.5-flash`等代理前沿路线。

## <a id="bundled-fallback-catalog"></a> 捆绑后备目录

经过身份验证的实时目录具有权威性。在发现成功之前，这些条目可确保设置和模型选择功能可用：

| 模型引用                           | 输入       | 上下文 | 最大输出 |
| ----------------------------------- | ----------- | ------: | ---------: |
| `telnyx/moonshotai/Kimi-K3`         | 文本、图像 |      1M |        64k |
| `telnyx/moonshotai/Kimi-K2.6`       | 文本、图像 |    262k |         8k |
| `telnyx/moonshotai/Kimi-K2.5`       | 文本、图像 |    256k |         8k |
| `telnyx/zai-org/GLM-5.2`            | 文本        |      1M |       131k |
| `telnyx/zai-org/GLM-5.1-FP8`        | 文本        |    202k |         8k |
| `telnyx/MiniMaxAI/MiniMax-M3-MXFP8` | 文本        |      1M |         8k |
| `telnyx/MiniMaxAI/MiniMax-M2.7`     | 文本        |    200k |         8k |
| `telnyx/Qwen/Qwen3-235B-A22B`       | 文本        |     32k |         8k |
| `telnyx/openai/gpt-5.4`             | 文本        |    400k |         8k |
| `telnyx/openai/gpt-5.4-mini`        | 文本        |    400k |         8k |
| `telnyx/openai/gpt-5.2`             | 文本        |    400k |         8k |
| `telnyx/openai/gpt-5.1`             | 文本        |    400k |         8k |
| `telnyx/openai/gpt-5`               | 文本        |    400k |         8k |
| `telnyx/anthropic/claude-haiku-4-5` | 文本        |    400k |         8k |

所有捆绑模型都支持工具调用和推理。 `openai/*` 和 `anthropic/*` id 是 Telnyx- 代理的边境路线；其余为Telnyx-托管的开放重量模型。流使用情况在最终块上报告。

<Note>
Telnyx 可以独立于插件版本添加、删除或更改托管模型。该插件会根据经过身份验证的 API 刷新模型 ID、上下文限制、输出限制和定价，同时保留特定于模型的传输策略。
</Note>

## <a id="manual-config"></a> 手动配置

大多数设置只需要 API 密钥。若要明确指定提供商：

```json5
{
  env: { vars: { TELNYX_API_KEY: "..." } },
  agents: {
    defaults: {
      model: { primary: "telnyx/moonshotai/Kimi-K3" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      telnyx: {
        baseUrl: "https://api.telnyx.com/v2/ai/openai",
        apiKey: "${TELNYX_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "moonshotai/Kimi-K3",
            name: "Kimi K3",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1000000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

<Note>
如果网关作为守护进程（launchd、systemd、Docker）运行，请确保 `TELNYX_API_KEY` 可用于该进程。仅在交互式 shell 中导出的密钥对于已运行的托管服务不可见。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="思维模式" href="/tools/thinking" icon="brain">
    选择 OpenClaw 推理强度级别。
  </Card>
  <Card title="模型 CLI" href="/cli/models" icon="terminal">
    列出、检查并选择已发现的模型。
  </Card>
  <Card title="模型 FAQ" href="/help/faq-models" icon="circle-question">
    身份验证配置和模型选择故障排除。
  </Card>
</CardGroup>
