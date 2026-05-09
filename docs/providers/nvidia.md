---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 兼容 API"
read_when:
  - 你想在 OpenClaw 中免费使用开源模型
  - 你需要设置 NVIDIA_API_KEY
title: "NVIDIA"
---

NVIDIA 提供了一个 OpenAI 兼容的 API，地址为 `https://integrate.api.nvidia.com/v1`，可免费使用
开源模型。使用来自
[build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API key 进行认证。

## 入门指南

<Steps>
  <Step title="获取你的 API key">
    在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 创建一个 API key。
  </Step>
  <Step title="导出 key 并运行初始化">
    ```bash
    export NVIDIA_API_KEY="nvapi-..."
    openclaw onboard --auth-choice nvidia-api-key
    ```
  </Step>
  <Step title="设置 NVIDIA 模型">
    ```bash
    openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b
    ```
  </Step>
</Steps>

<Warning>
如果你使用 `--nvidia-api-key` 而不是环境变量，值会进入 shell
历史记录和 `ps` 输出。尽可能优先使用 `NVIDIA_API_KEY` 环境变量。
</Warning>

对于非交互式设置，你也可以直接传入 key：

```bash
openclaw onboard --auth-choice nvidia-api-key --nvidia-api-key "nvapi-..."
```

## 配置示例

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## 内置目录

| Model ref                                  | 名称                         | 上下文 | 最大输出 |
| ------------------------------------------ | ---------------------------- | ------- | ---------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192      |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192      |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608 | 8,192      |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752 | 8,192      |

## 高级配置

<AccordionGroup>
  <Accordion title="自动启用行为">
    当设置了 `NVIDIA_API_KEY` 环境变量时，该提供方会自动启用。
    除了该 key 之外，不需要显式的提供方配置。
  </Accordion>

  <Accordion title="目录与定价">
    内置目录是静态的。由于 NVIDIA
    目前为所列模型提供免费 API 访问，源码中的成本默认设为 `0`。
  </Accordion>

  <Accordion title="OpenAI 兼容端点">
    NVIDIA 使用标准的 `/v1` completions 端点。任何 OpenAI 兼容的
    工具都应该可以直接使用 NVIDIA 的 base URL。
  </Accordion>

  <Accordion title="缓慢的自定义提供方响应">
    某些由 NVIDIA 托管的自定义模型，在发出第一个响应块之前，所需时间可能会超过默认模型空闲
    监视器的等待时间。对于自定义 NVIDIA 提供方
    条目，请提高提供方超时时间，而不是提高整个代理
    运行时超时时间：

    ```json5
    {
      models: {
        providers: {
          "custom-integrate-api-nvidia-com": {
            baseUrl: "https://integrate.api.nvidia.com/v1",
            api: "openai-completions",
            apiKey: "NVIDIA_API_KEY",
            timeoutSeconds: 300,
          },
        },
      },
      agents: {
        defaults: {
          models: {
            "custom-integrate-api-nvidia-com/meta/llama-3.1-70b-instruct": {
              params: { thinking: "off" },
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

<Tip>
NVIDIA 模型目前可免费使用。请查看
[build.nvidia.com](https://build.nvidia.com/) 以获取最新的可用性和
速率限制详情。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
</CardGroup>