---
summary: "Together AI 设置（认证 + 模型选择）"
title: "Together AI"
read_when:
  - 你想将 Together AI 与 OpenClaw 一起使用
  - 你需要 API 密钥环境变量或 CLI 认证选项
---

[Together AI](https://together.ai) 提供对领先的开源
模型的访问，包括 Llama、DeepSeek、Kimi 等，并通过统一的 API 提供服务。
OpenClaw 将其打包为 `together` 提供方。

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
            primary: "together/moonshotai/Kimi-K2.6",
          },
        },
      },
    }
    ```
  </Step>
</Steps>

### 非交互式示例

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

<Note>
引导会将 Together 推荐的聊天模型
`together/moonshotai/Kimi-K2.6` 设置为默认模型。
</Note>

## 内置目录

每百万 tokens 的费用以美元计。

| 模型引用                                           | 名称                         | 输入       | 上下文  | 最大输出   | 费用（输入／输出） | 备注           |
| -------------------------------------------------- | ---------------------------- | ----------- | ------- | ---------- | ------------- | --------------- |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` | Llama 3.3 70B Instruct Turbo | 文本        | 131,072 | 8,192      | 1.04 / 1.04   | 通用模型   |
| `together/moonshotai/Kimi-K2.6`                    | Kimi K2.6 FP4                | 文本、图像 | 262,144 | 32,768     | 1.20 / 4.50   | 默认模型   |
| `together/deepseek-ai/DeepSeek-V4-Pro`             | DeepSeek V4 Pro              | 文本        | 512,000 | 384,000    | 1.74 / 3.48   | 推理模型 |
| `together/zai-org/GLM-5.2`                         | GLM 5.2 FP4                  | 文本        | 262,144 | 131,072    | 1.40 / 4.40   | 推理模型 |

## 视频生成

捆绑的 `together` 插件还通过共享的 `video_generate` 工具注册了视频生成。

| 属性                 | 值                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------- |
| 默认视频模型         | `Wan-AI/Wan2.2-T2V-A14B`                                                                  |
| 其他模型             | `Wan-AI/Wan2.2-I2V-A14B`、`minimax/hailuo-02`、`kwaivgI/kling-2.1-master`                 |
| 模式                 | 文本转视频；仅 `Wan-AI/Wan2.2-I2V-A14B` 支持图像转视频（单张参考图像） |
| 时长                 | 1-10 秒                                                                              |
| 支持的参数           | `size`（解析为 `<width>x<height>`）；不读取 `aspectRatio`／`resolution`            |

要将 Together 用作默认视频提供方：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "together/Wan-AI/Wan2.2-T2V-A14B",
        },
      },
    },
  },
}
```

<Tip>
查看 [视频生成](/tools/video-generation) 了解共享工具参数、
提供方选择以及故障转移行为。
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
  <Card title="模型提供方" href="/concepts/model-providers" icon="layers">
    提供方规则、模型引用和故障切换行为。
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
