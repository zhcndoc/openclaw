---
summary: "Fireworks 设置（认证 + 模型选择）"
title: "Fireworks"
read_when:
  - 你想在 OpenClaw 中使用 Fireworks
  - 你需要 Fireworks API 密钥环境变量或默认模型 ID
---

[Fireworks](https://fireworks.ai) 通过兼容 OpenAI 的 API 提供开放权重模型和路由模型。OpenClaw 包含一个内置的 Fireworks 提供者插件。

| 属性      | 值                                                  |
| ------------- | ------------------------------------------------------ |
| 提供者      | `fireworks`                                            |
| 认证          | `FIREWORKS_API_KEY`                                    |
| API           | 兼容 OpenAI 的 chat/completions                     |
| 基础 URL      | `https://api.fireworks.ai/inference/v1`                |
| 默认模型 | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |

## 快速开始

<Steps>
  <Step title="通过引导设置 Fireworks 认证">
    ```bash
    openclaw onboard --auth-choice fireworks-api-key
    ```

    这会将你的 Fireworks 密钥存储在 OpenClaw 配置中，并将 Fire Pass 入门模型设置为默认值。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本或 CI 设置，在命令行上传递所有值：

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
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                   | text,image | 262,144 | 262,144    | Fireworks 上最新的 Kimi 模型。对于 Fireworks K2.6 请求，思考功能已禁用；如果你需要 Kimi 的思考输出，请直接通过 Moonshot 路由。 |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | text,image | 256,000 | 256,000    | Fireworks 上默认捆绑的入门模型                                                                                                          |

<Tip>
如果 Fireworks 发布了更新的模型（例如新发布的 Qwen 或 Gemma），你可以直接使用其 Fireworks 模型 ID 切换到该模型，无需等待捆绑目录更新。
</Tip>

## 自定义 Fireworks 模型 ID

OpenClaw 也接受动态 Fireworks 模型 ID。使用 Fireworks 显示的确切模型或路由 ID，并在其前面加上 `fireworks/` 前缀。

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
  <Accordion title="模型 ID 前缀工作原理">
    OpenClaw 中的每个 Fireworks 模型引用都以 `fireworks/` 开头，后跟来自 Fireworks 平台的确切 ID 或路由路径。例如：

    - 路由模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - 直接模型：`fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw 在构建 API 请求时会剥离 `fireworks/` 前缀，并将剩余路径发送到 Fireworks 端点。

  </Accordion>

  <Accordion title="环境说明">
    如果 Gateway 在交互式 shell 之外运行，请确保 `FIREWORKS_API_KEY` 对该进程也可用。

    <Warning>
    仅位于 `~/.profile` 中的密钥对 launchd/systemd 守护进程没有帮助，除非该环境也被导入到那里。请将密钥设置在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置，以确保 gateway 进程可以读取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供者、模型引用和故障转移行为。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题解答。
  </Card>
</CardGroup>
