---
summary: "Cerebras 设置（认证 + 模型选择）"
title: "Cerebras"
read_when:
  - 你想在 OpenClaw 中使用 Cerebras
  - 你需要 Cerebras API 密钥环境变量或 CLI 认证选项
---

[Cerebras](https://www.cerebras.ai) 提供在定制推理硬件上的高速、兼容 OpenAI 的推理服务。Cerebras 提供方插件包含一个静态的四模型目录。

| Property        | Value                                    |
| --------------- | ---------------------------------------- |
| Provider id     | `cerebras`                               |
| Plugin          | official external package                |
| Auth env var    | `CEREBRAS_API_KEY`                       |
| Onboarding flag | `--auth-choice cerebras-api-key`         |
| Direct CLI flag | `--cerebras-api-key <key>`               |
| API             | OpenAI-compatible (`openai-completions`) |
| Base URL        | `https://api.cerebras.ai/v1`             |
| Default model   | `cerebras/zai-glm-4.7`                   |

## 安装插件

安装官方插件，然后重启 Gateway：

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

    列表应包含全部四个静态模型。如果 `CEREBRAS_API_KEY` 未解析，`openclaw models status --json` 会在 `auth.unusableProfiles` 下报告缺失的凭据。

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

OpenClaw 提供了一个静态的 Cerebras 目录，与公开的 OpenAI 兼容端点一致。全部四个模型共享 128k 上下文和 8,192 最大输出 token。

| Model ref                                 | Name                 | Reasoning | Notes                                  |
| ----------------------------------------- | -------------------- | --------- | -------------------------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | yes       | 默认模型；预览版推理模型               |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | yes       | 生产级推理模型                         |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | no        | 预览版非推理模型                       |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | no        | 面向速度的生产模型                     |

<Warning>
  Cerebras 将 `zai-glm-4.7` 和 `qwen-3-235b-a22b-instruct-2507` 标记为预览模型，并且 `llama3.1-8b` 以及 `qwen-3-235b-a22b-instruct-2507` 文档说明将在 2026 年 5 月 27 日弃用。在将其用于生产工作负载之前，请查看 Cerebras 的支持模型页面。
</Warning>

## 手动配置

该插件通常意味着你只需要 API 密钥。当你想覆盖模型元数据，或在 `mode: "merge"` 下相对于静态目录运行时，请使用显式的 `models.providers.cerebras` 配置：

```json5
{
  env: { CEREBRAS_API_KEY: "csk-..." },
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
  如果 Gateway 以守护进程方式运行（launchd、systemd、Docker），请确保 `CEREBRAS_API_KEY` 对该进程可用——例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供。仅在交互式 shell 中导出的密钥不会对托管服务生效，除非该环境变量被单独导入。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供方" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障切换行为。
  </Card>
  <Card title="思考模式" href="/tools/thinking" icon="brain">
    两个具备推理能力的 Cerebras 模型的推理强度级别。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
  <Card title="模型 FAQ" href="/help/faq-models" icon="circle-question">
    认证配置文件、切换模型以及解决“没有配置文件”错误。
  </Card>
</CardGroup>
