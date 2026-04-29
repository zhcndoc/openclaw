---
summary: "Fireworks 设置（认证 + 模型选择）"
title: "Fireworks"
read_when:
  - 你想在 OpenClaw 中使用 Fireworks
  - 你需要 Fireworks API 密钥环境变量或默认模型 ID
---

[Fireworks](https://fireworks.ai) 通过与 OpenAI 兼容的 API 提供开源权重模型和路由模型。OpenClaw 包含一个内置的 Fireworks 提供方插件。

| Property      | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Provider      | `fireworks`                                            |
| Auth          | `FIREWORKS_API_KEY`                                    |
| API           | OpenAI-compatible chat/completions                     |
| Base URL      | `https://api.fireworks.ai/inference/v1`                |
| Default model | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |

## 入门

<Steps>
  <Step title="通过 onboarding 配置 Fireworks 认证">
    ```bash
    openclaw onboard --auth-choice fireworks-api-key
    ```

    这会将你的 Fireworks 密钥存储到 OpenClaw 配置中，并将 Fire Pass 入门模型设为默认值。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```
  </Step>
</Steps>

## 非交互示例

对于脚本或 CI 环境，请在命令行中传入所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 内置目录

| Model ref                                              | Name                        | Input      | Context | Max output | Notes                                                                                                                                               |
| ------------------------------------------------------ | --------------------------- | ---------- | ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                   | text,image | 262,144 | 262,144    | Fireworks 上最新的 Kimi 模型。Fireworks K2.6 请求已禁用思考；如果你需要 Kimi 的思考输出，请直接通过 Moonshot 路由。 |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | text,image | 256,000 | 256,000    | Fireworks 上默认内置的入门模型                                                                                                          |

<Tip>
如果 Fireworks 发布了更新的模型，例如新的 Qwen 或 Gemma 版本，你可以直接使用其 Fireworks 模型 id 切换过去，无需等待内置目录更新。
</Tip>

## 自定义 Fireworks 模型 id

OpenClaw 也支持动态 Fireworks 模型 id。请使用 Fireworks 显示的准确模型或路由 id，并在前面加上 `fireworks/`。

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="模型 id 前缀规则如何工作">
    OpenClaw 中的每个 Fireworks 模型引用都以 `fireworks/` 开头，后面跟着来自 Fireworks 平台的准确 id 或路由路径。例如：

    - 路由模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - 直接模型：`fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw 在构建 API 请求时会去掉 `fireworks/` 前缀，并将剩余路径发送到 Fireworks 端点。

  </Accordion>

  <Accordion title="环境说明">
    如果 Gateway 运行在你的交互式 shell 之外，请确保 `FIREWORKS_API_KEY` 也对该进程可用。

    <Warning>
    仅放在 `~/.profile` 中的密钥对 launchd/systemd 守护进程没有帮助，除非该环境也被导入其中。请将密钥设置在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 设置，以确保 gateway 进程可以读取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和 FAQ。
  </Card>
</CardGroup>
