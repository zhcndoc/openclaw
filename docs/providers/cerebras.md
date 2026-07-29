---
summary: "Cerebras 设置（认证 + 模型选择）"
title: "Cerebras"
read_when:
  - 你想在 OpenClaw 中使用 Cerebras
  - 你需要 Cerebras API 密钥环境变量或 CLI 认证选项
---

[Cerebras](https://www.cerebras.ai) provides high-speed OpenAI-compatible inference on custom inference hardware. The plugin ships a static three-model catalog (no live discovery).

| Property        | Value                                                     |
| --------------- | --------------------------------------------------------- |
| Provider id     | `cerebras`                                                |
| Plugin          | official external package (`@openclaw/cerebras-provider`) |
| Auth env var    | `CEREBRAS_API_KEY`                                        |
| Onboarding flag | `--auth-choice cerebras-api-key`                          |
| Direct CLI flag | `--cerebras-api-key <key>`                                |
| API             | OpenAI-compatible (`openai-completions`)                  |
| Base URL        | `https://api.cerebras.ai/v1`                              |
| Default model   | `cerebras/gemma-4-31b`                                    |

## 安装插件

```bash
openclaw plugins install @openclaw/cerebras-provider
openclaw gateway restart
```

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    在 [Cerebras Cloud Console](https://cloud.cerebras.ai) 中创建一个 API 密钥。
  </Step>
  <Step title="运行 onboarding">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice cerebras-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

```bash Env only
export CEREBRAS_API_KEY=csk-...
```

    </CodeGroup>

  </Step>
  <Step title="验证模型可用">
    ```bash
    openclaw models list --provider cerebras
    ```

    Lists all three static models. If `CEREBRAS_API_KEY` is unresolved, `openclaw models status --json` reports the missing credential under `auth.unusableProfiles`.

  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## 内置目录

All three models have a 131,072-token context window and a 40,960-token max output.

| Model ref               | Name         | Reasoning | Notes                                     |
| ----------------------- | ------------ | --------- | ----------------------------------------- |
| `cerebras/zai-glm-4.7`  | Z.ai GLM 4.7 | yes       | Scheduled for deprecation August 17, 2026 |
| `cerebras/gpt-oss-120b` | GPT OSS 120B | yes       | Production reasoning model                |
| `cerebras/gemma-4-31b`  | Gemma 4 31B  | yes       | Default; preview; text-and-image input    |

Fresh onboarding follows Cerebras's current [Gemma 4 recommendation](https://www.cerebras.ai/blog/gemma-4-on-cerebras-the-fastest-inference-is-now-multimodal). Cerebras describes Gemma 4 31B as its reference medium-size model for equal-or-higher intelligence than GPT OSS, with multimodal agentic support. It is a public-preview model and may change or be discontinued on shorter notice than the production GPT OSS endpoint; existing OpenClaw configurations keep their selected model.

## 手动配置

大多数配置只需要 API 密钥。使用显式的 `models.providers.cerebras` 配置来覆盖模型元数据，或在静态目录上以 `mode: "merge"` 运行：

```json5
{
  env: { CEREBRAS_API_KEY: "csk-..." },
  agents: {
    defaults: {
      model: { primary: "cerebras/gemma-4-31b" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "Z.ai GLM 4.7" },
          { id: "gpt-oss-120b", name: "GPT OSS 120B" },
          { id: "gemma-4-31b", name: "Gemma 4 31B" },
        ],
      },
    },
  },
}
```

<Note>
如果 Gateway 作为守护进程运行（launchd、systemd、Docker），请确保 `CEREBRAS_API_KEY` 对该进程可用——例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供。仅在交互式 shell 中导出的密钥不会对受管服务生效，除非另外导入了环境变量。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供方" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障切换行为。
  </Card>
  <Card title="Thinking modes" href="/tools/thinking" icon="brain">
    Reasoning effort levels for the Cerebras models.
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
  <Card title="模型 FAQ" href="/help/faq-models" icon="circle-question">
    认证配置文件、切换模型以及解决“没有配置文件”错误。
  </Card>
</CardGroup>
