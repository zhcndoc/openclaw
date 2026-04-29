---
summary: "Cerebras 设置（认证 + 模型选择）"
title: "Cerebras"
read_when:
  - 你想在 OpenClaw 中使用 Cerebras
  - 你需要 Cerebras API 密钥环境变量或 CLI 认证选项
---

[Cerebras](https://www.cerebras.ai) 提供高速、兼容 OpenAI 的推理服务。

| Property | Value                        |
| -------- | ---------------------------- |
| Provider | `cerebras`                   |
| Auth     | `CEREBRAS_API_KEY`           |
| API      | OpenAI-compatible            |
| Base URL | `https://api.cerebras.ai/v1` |

## 入门指南

<Steps>
  <Step title="获取 API 密钥">
    在 [Cerebras Cloud Console](https://cloud.cerebras.ai) 中创建一个 API 密钥。
  </Step>
  <Step title="运行初始化">
    ```bash
    openclaw onboard --auth-choice cerebras-api-key
    ```
  </Step>
  <Step title="验证模型可用">
    ```bash
    openclaw models list --provider cerebras
    ```
  </Step>
</Steps>

### 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## 内置目录

OpenClaw 为公开的 OpenAI 兼容端点提供了一个静态的 Cerebras 目录：

| Model ref                                 | Name                 | Notes                                  |
| ----------------------------------------- | -------------------- | -------------------------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | 默认模型；预览推理模型 |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | 生产推理模型             |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | 预览非推理模型            |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | 面向速度的生产模型         |

<Warning>
Cerebras 将 `zai-glm-4.7` 和 `qwen-3-235b-a22b-instruct-2507` 标记为预览模型，并且文档中说明 `llama3.1-8b` / `qwen-3-235b-a22b-instruct-2507` 将于 2026 年 5 月 27 日弃用。在将其用于生产环境之前，请先查看 Cerebras 的 supported-models 页面。
</Warning>

## 手动配置

通常，内置插件意味着你只需要 API 密钥。如果你想覆盖模型元数据，可以使用显式的
`models.providers.cerebras` 配置：

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "cerebras/zai-glm-4.7" },
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
        ],
      },
    },
  },
}
```

<Note>
如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `CEREBRAS_API_KEY`
对该进程可用，例如放在 `~/.openclaw/.env` 中，或通过
`env.shellEnv` 提供。
</Note>
