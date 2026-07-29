---
summary: "Meta 设置（认证 + muse-spark-1.1 模型选择）"
title: "Meta"
read_when:
  - 你想在 OpenClaw 中使用 Meta
  - 你需要 MODEL_API_KEY 环境变量或 CLI 认证选项
---

**Meta API** 使用与 OpenAI 兼容的 **Responses API**（`POST /v1/responses`）
来提供 `muse-spark-1.1` 推理模型。该提供方作为内置的 OpenClaw
插件提供。

| Property          | Value                              |
| ----------------- | ---------------------------------- |
| Provider id       | `meta`                             |
| Plugin            | bundled provider                   |
| Auth env var      | `MODEL_API_KEY`                    |
| Onboarding flag   | `--auth-choice meta-api-key`       |
| Direct CLI flag   | `--meta-api-key <key>`             |
| API               | Responses API (`openai-responses`) |
| Base URL          | `https://api.meta.ai/v1`           |
| Default model     | `meta/muse-spark-1.1`              |
| Default reasoning | `high` (`reasoning.effort`)        |

## 开始使用

<Steps>
  <Step title="设置 API 密钥">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice meta-api-key
```

```bash Direct flag
openclaw onboard --non-interactive --accept-risk \
  --auth-choice meta-api-key \
  --meta-api-key "$MODEL_API_KEY"
```

```bash Env only
export MODEL_API_KEY=<key>
```

    </CodeGroup>

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider meta
    ```

    列出静态的 `muse-spark-1.1` 目录条目。如果 `MODEL_API_KEY` 未解析，
    `openclaw models status --json` 会在
    `auth.unusableProfiles` 下报告缺失的凭据。

  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk \
  --mode local \
  --auth-choice meta-api-key \
  --meta-api-key "$MODEL_API_KEY"
```

## 内置目录

| Model ref             | Name           | Input       | Reasoning | Context window | Max output | Input / cached input / output per 1M tokens |
| --------------------- | -------------- | ----------- | --------- | -------------- | ---------- | ------------------------------------------- |
| `meta/muse-spark-1.1` | Muse Spark 1.1 | text, image | yes       | 1,048,576      | 131,072    | $1.25 / $0.15 / $4.25                       |

功能：

- Text and image input
- Tool calling and streaming
- Reasoning effort: `minimal`, `low`, `medium`, `high`, `xhigh` (default: `high`)
- Stateless encrypted reasoning replay (`store: false`, `include: ["reasoning.encrypted_content"]`)

<Warning>
`muse-spark-1.1` 不接受 `reasoning.effort: "none"`。OpenClaw 会将
`--thinking off` 映射为此提供方的 `minimal`。
</Warning>

## 手动配置

```json5
{
  env: { MODEL_API_KEY: "<key>" },
  agents: {
    defaults: {
      model: { primary: "meta/muse-spark-1.1" },
      models: {
        "meta/muse-spark-1.1": { alias: "Muse Spark 1.1" },
      },
    },
  },
}
```

<Note>
如果 Gateway 作为守护进程运行（launchd、systemd、Docker），请确保该进程可以使用 `MODEL_API_KEY` —— 例如放在
`~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供。仅在交互式 shell 中导出的密钥对受管理的服务没有帮助，除非另外导入了 env。
</Note>

## 烟雾测试

```bash
export MODEL_API_KEY=<key>
pnpm test:live -- extensions/meta/meta.live.test.ts
```

实时测试使用 `muse-spark-1.1` 调用 `POST /v1/responses`。

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="思考模式" href="/tools/thinking" icon="brain">
    muse-spark-1.1 的推理努力级别。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
</CardGroup>
