---
summary: "Fireworks 设置（认证 + 模型选择）"
title: "Fireworks"
read_when:
  - 你想在 OpenClaw 中使用 Fireworks
  - 你需要 Fireworks API key 环境变量或默认模型 id
  - 你正在排查 Fireworks 上的 Kimi thinking-off 行为
---

[Fireworks](https://fireworks.ai) exposes open-weight and routed models through an OpenAI-compatible API. Install the official Fireworks provider plugin to use the current Fire Pass GLM router, two pre-cataloged Kimi models, and any Fireworks model or router id at runtime.

| Property        | Value                                               |
| --------------- | --------------------------------------------------- |
| Provider id     | `fireworks` (alias: `fireworks-ai`)                 |
| Package         | `@openclaw/fireworks-provider`                      |
| Auth env var    | `FIREWORKS_API_KEY`                                 |
| Onboarding flag | `--auth-choice fireworks-api-key`                   |
| Direct CLI flag | `--fireworks-api-key <key>`                         |
| API             | OpenAI-compatible (`openai-completions`)            |
| Base URL        | `https://api.fireworks.ai/inference/v1`             |
| Default model   | `fireworks/accounts/fireworks/routers/glm-5p2-fast` |
| Default alias   | `GLM 5.2 Fast`                                      |

## 入门

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/fireworks-provider
    ```
  </Step>
  <Step title="设置 Fireworks API key">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice fireworks-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY"
```

```bash Env only
export FIREWORKS_API_KEY=fw-...
```

    </CodeGroup>

    Onboarding stores the key against the `fireworks` provider in your auth profiles and sets Fireworks' current [Fire Pass](https://docs.fireworks.ai/firepass) GLM 5.2 Fast router as the default model.

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```

    The list should include `GLM 5.2 Fast`, `Kimi K2.6`, and `Kimi K2.6 Fast`. If `FIREWORKS_API_KEY` is unresolved, `openclaw models status --json` reports the missing credential under `auth.unusableProfiles`.

  </Step>
</Steps>

## 非交互式设置

对于脚本或 CI 安装，请在命令行中传入所有参数：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 内置目录

| Model ref                                              | Name           | Input        | Context | Max output | Thinking     |
| ------------------------------------------------------ | -------------- | ------------ | ------- | ---------- | ------------ |
| `fireworks/accounts/fireworks/routers/glm-5p2-fast`    | GLM 5.2 Fast   | text + image | 256,000 | 256,000    | On (default) |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6      | text + image | 262,144 | 262,144    | Forced off   |
| `fireworks/accounts/fireworks/routers/kimi-k2p6-turbo` | Kimi K2.6 Fast | text + image | 262,144 | 256,000    | Forced off   |

<Note>
  OpenClaw 将所有 Fireworks Kimi 模型固定为 `thinking: off`，因为 Fireworks 上的 Kimi 可能会在可见回复中泄露链式思维，除非请求明确禁用 thinking。通过 [Moonshot](/providers/moonshot) 直接路由同一模型可保留 Kimi 的推理输出。有关在提供商之间切换，请参见 [thinking modes](/tools/thinking)。
</Note>

## 自定义 Fireworks 模型 id

OpenClaw accepts any Fireworks model or router id at runtime. Use the exact id shown by Fireworks and prefix it with `fireworks/`. Dynamic resolution clones the Fire Pass template (text + image input and the OpenAI-compatible API) and disables thinking automatically when the id matches the Kimi pattern. GLM dynamic ids are marked text-only unless you configure a custom model entry with image input.

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/models/<your-model-id>",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="模型 id 前缀规则如何工作">
    OpenClaw 中的每个 Fireworks 模型引用都以 `fireworks/` 开头，后面跟着来自 Fireworks 平台的准确 id 或路由路径。例如：

    - Router model: `fireworks/accounts/fireworks/routers/kimi-k2p6-turbo`
    - Direct model: `fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw 在构建 API 请求时会去掉 `fireworks/` 前缀，并将剩余路径作为 OpenAI 兼容的 `model` 字段发送到 Fireworks 端点。

  </Accordion>

  <Accordion title="为什么 Kimi 会强制关闭 thinking">
    Fireworks 为 Kimi 提供服务时没有单独的推理通道，因此 chain-of-thought 可能会出现在可见的 `content` 流中。每次 Fireworks Kimi 请求时，OpenClaw 都会发送 `thinking: { type: "disabled" }`，并从负载中移除 `reasoning`、`reasoning_effort` 和 `reasoningEffort`（`extensions/fireworks/stream.ts`）。提供方策略（`extensions/fireworks/thinking-policy.ts`）仅为 Kimi 模型 id 宣告 `off` thinking 级别，因此手动 `/think` 切换和提供方策略界面会与运行时契约保持一致。

    若要端到端使用 Kimi 推理，请配置 [Moonshot 提供方](/providers/moonshot) 并通过它路由同一个模型。

  </Accordion>

  <Accordion title="守护进程的环境可用性">
    如果 Gateway 作为受管服务运行（launchd、systemd、Docker），Fireworks 密钥必须对该进程可见——而不仅仅对你的交互式 shell 可见。

    <Warning>
      仅在交互式 shell 中导出的密钥，对 launchd 或 systemd 守护进程没有帮助，除非该环境也被导入其中。请将密钥设置在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 设置，以便网关进程能够读取。
    </Warning>

    OpenClaw 在加载配置时会加载 `~/.openclaw/.env`，因此存放在其中的密钥会在所有平台上送达受管的网关服务。轮换密钥后，请重启网关（或重新运行 `openclaw doctor --fix`）。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供方" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="思考模式" href="/tools/thinking" icon="brain">
    `/think` 级别、提供方策略，以及路由具备推理能力的模型。
  </Card>
  <Card title="Moonshot" href="/providers/moonshot" icon="moon">
    通过 Moonshot 自己的 API 运行带原生 thinking 输出的 Kimi。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和 FAQ。
  </Card>
</CardGroup>
