---
summary: "Cerebras 设置（认证 + 模型选择）"
title: "Cerebras"
read_when:
  - 你想将 Cerebras 与 OpenClaw 一起使用
  - 你需要 Cerebras API key 环境变量或 CLI 认证选项
---

[Cerebras](https://www.cerebras.ai) 提供高速、兼容 OpenAI 的推理服务。

| Property | Value                        |
| -------- | ---------------------------- |
| Provider | `cerebras`                   |
| Auth     | `CEREBRAS_API_KEY`           |
| API      | 兼容 OpenAI                  |
| Base URL | `https://api.cerebras.ai/v1` |

## Getting Started

<Steps>
  <Step title="获取 API key">
    在 [Cerebras Cloud Console](https://cloud.cerebras.ai) 中创建一个 API key。
  </Step>
  <Step title="运行 onboarding">
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

OpenClaw 为公开的、兼容 OpenAI 的端点提供了一个静态的 Cerebras 目录：

| Model ref                                 | Name                 | Notes                                  |
| ----------------------------------------- | -------------------- | -------------------------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | 默认模型；预览推理模型                |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | 生产环境推理模型                      |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | 预览非推理模型                        |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | 面向速度优化的生产模型                |

<Warning>
Cerebras 将 `zai-glm-4.7` 和 `qwen-3-235b-a22b-instruct-2507` 标记为预览模型，而 `llama3.1-8b` / `qwen-3-235b-a22b-instruct-2507` 已在文档中说明将于 2026 年 5 月 27 日弃用。在将它们用于生产之前，请先查看 Cerebras 的 supported-models 页面。
</Warning>

## 手动配置

内置插件通常意味着你只需要 API key。若你想覆盖模型元数据，请使用显式的
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
如果 Gateway 以守护进程（launchd/systemd）运行，请确保 `CEREBRAS_API_KEY`
对该进程可用，例如放在 `~/.openclaw/.env` 中，或通过
`env.shellEnv` 提供。
</Note>
