---
summary: "Cerebras 设置（认证 + 模型选择）"
title: "Cerebras"
read_when:
  - 你想在 OpenClaw 中使用 Cerebras
  - 你需要 Cerebras API 密钥环境变量或 CLI 认证选项
---

[Cerebras](https://www.cerebras.ai) 提供基于定制推理硬件的高速 OpenAI 兼容推理服务。该插件提供一个静态的三模型目录（不支持实时发现）。

| 属性             | 值                                                       |
| ---------------- | -------------------------------------------------------- |
| 提供商 ID        | `cerebras`                                               |
| 插件             | 官方外部软件包（`@openclaw/cerebras-provider`）          |
| 认证环境变量     | `CEREBRAS_API_KEY`                                       |
| 引导标志         | `--auth-choice cerebras-api-key`                         |
| 直接 CLI 标志    | `--cerebras-api-key <key>`                               |
| API              | OpenAI 兼容（`openai-completions`）                      |
| 基础 URL         | `https://api.cerebras.ai/v1`                             |
| 默认模型         | `cerebras/gemma-4-31b`                                   |

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
openclaw onboard --non-interactive --accept-risk --skip-health \
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

    列出全部三个静态模型。如果未解析 `CEREBRAS_API_KEY`，`openclaw models status --json` 会在 `auth.unusableProfiles` 下报告缺失的凭据。

  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## 内置目录

这三个模型都具有 131,072 个 token 的上下文窗口和 40,960 个 token 的最大输出长度。

| 模型引用                 | 名称         | 推理 | 备注                                     |
| ------------------------ | ------------ | ---- | ---------------------------------------- |
| `cerebras/zai-glm-4.7`  | Z.ai GLM 4.7 | 是   | 计划于 2026 年 8 月 17 日弃用             |
| `cerebras/gpt-oss-120b` | GPT OSS 120B | 是   | 生产环境推理模型                         |
| `cerebras/gemma-4-31b`  | Gemma 4 31B  | 是   | 默认；预览版；支持文本和图像输入           |

新的入门流程遵循 Cerebras 当前的 [Gemma 4 建议](https://www.cerebras.ai/blog/gemma-4-on-cerebras-the-fastest-inference-is-now-multimodal)。Cerebras 将 Gemma 4 31B 描述为其参考级中型模型，在智能水平上不低于 GPT OSS，并支持多模态智能体。该模型属于公开预览版，其变更或停用通知期限可能短于生产环境中的 GPT OSS 端点；现有的 OpenClaw 配置会保留所选模型。

## 手动配置

大多数配置只需要 API 密钥。使用显式的 `models.providers.cerebras` 配置来覆盖模型元数据，或在静态目录上以 `mode: "merge"` 运行：

```json5
{
  env: { vars: { CEREBRAS_API_KEY: "csk-..." } },
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
  <Card title="思考模式" href="/tools/thinking" icon="brain">
    Cerebras 模型的推理强度级别。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
  <Card title="模型 FAQ" href="/help/faq-models" icon="circle-question">
    认证配置文件、切换模型以及解决“没有配置文件”错误。
  </Card>
</CardGroup>
