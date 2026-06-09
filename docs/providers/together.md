---
summary: "Together AI 设置（认证 + 模型选择）"
title: "Together AI"
read_when:
  - 你想将 Together AI 与 OpenClaw 一起使用
  - 你需要 API 密钥环境变量或 CLI 认证选项
---

[Together AI](https://together.ai) 通过统一的 API 提供对包括 Llama、DeepSeek、Kimi 等在内的领先开源模型的访问。

| Property | Value                         |
| -------- | ----------------------------- |
| Provider | `together`                    |
| Auth     | `TOGETHER_API_KEY`            |
| API      | OpenAI-compatible             |
| Base URL | `https://api.together.xyz/v1` |

## 开始使用

<Steps>
  <Step title="获取 API 密钥">
    在
    [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys) 创建一个 API 密钥。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "together/meta-llama/Llama-3.3-70B-Instruct-Turbo",
          },
        },
      },
    }
    ```
  </Step>
</Steps>

### 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

<Note>
引导预设会将
`together/meta-llama/Llama-3.3-70B-Instruct-Turbo` 设置为默认模型。
</Note>

## 内置目录

OpenClaw 附带以下内置 Together 目录：

| Model ref                                          | Name                         | Input       | Context | Notes                |
| -------------------------------------------------- | ---------------------------- | ----------- | ------- | -------------------- |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` | Llama 3.3 70B Instruct Turbo | text        | 131,072 | Default model        |
| `together/moonshotai/Kimi-K2.6`                    | Kimi K2.6 FP4                | text, image | 262,144 | Kimi reasoning model |
| `together/deepseek-ai/DeepSeek-V4-Pro`             | DeepSeek V4 Pro              | text        | 512,000 | Reasoning text model |
| `together/Qwen/Qwen2.5-7B-Instruct-Turbo`          | Qwen2.5 7B Instruct Turbo    | text        | 32,768  | Fast text model      |
| `together/zai-org/GLM-5.1`                         | GLM 5.1 FP4                  | text        | 202,752 | Reasoning text model |

## 视频生成

捆绑的 `together` 插件还通过共享的 `video_generate` 工具注册了视频生成。

| Property             | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| Default video model  | `together/Wan-AI/Wan2.2-T2V-A14B`                                        |
| Modes                | text-to-video; single-image reference only with `Wan-AI/Wan2.2-I2V-A14B` |
| Supported parameters | `aspectRatio`, `resolution`                                              |

要将 Together 用作默认视频提供方：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "together/Wan-AI/Wan2.2-T2V-A14B",
      },
    },
  },
}
```

<Tip>
有关共享工具参数、提供方选择和故障转移行为，请参阅 [视频生成](/tools/video-generation)。
</Tip>

<AccordionGroup>
  <Accordion title="环境说明">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保
    `TOGETHER_API_KEY` 对该进程可用（例如，放在
    `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 shell 中设置的密钥对守护进程管理的 gateway 进程不可见。
    请使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以实现
    持久可用。
    </Warning>

  </Accordion>

  <Accordion title="故障排除">
    - 验证你的密钥是否可用：`openclaw models list --provider together`
    - 如果模型没有出现，请确认 API 密钥已为你的 Gateway 进程设置在正确的
      环境中。
    - 模型引用使用 `together/<model-id>` 形式。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    提供方规则、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频生成工具参数和提供方选择。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供方设置在内的完整配置模式。
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Together AI 仪表盘、API 文档和定价。
  </Card>
</CardGroup>
