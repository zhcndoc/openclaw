---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 兼容 API"
read_when:
  - 你想在 OpenClaw 中免费使用开源模型
  - 你需要设置 NVIDIA_API_KEY
title: "NVIDIA"
---

NVIDIA 提供了一个 OpenAI 兼容的 API，地址为 `https://integrate.api.nvidia.com/v1`，可免费用于
开源模型。使用来自
[build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 密钥进行身份验证。

## 快速开始

<Steps>
  <Step title="获取您的 API 密钥">
    在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 创建 API 密钥。
  </Step>
  <Step title="导出密钥并运行初始化">
    ```bash
    export NVIDIA_API_KEY="nvapi-..."
    openclaw onboard --auth-choice skip
    ```
  </Step>
  <Step title="设置 NVIDIA 模型">
    ```bash
    openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b
    ```
  </Step>
</Steps>

<Warning>
如果您传递 `--token` 而不是环境变量，该值会出现在 shell 历史和 `ps` 输出中。可能时请优先使用 `NVIDIA_API_KEY` 环境变量。
</Warning>

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

| 模型引用                                  | 名称                         | 上下文 | 最大输出 |
| ------------------------------------------ | ---------------------------- | ------- | ---------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192      |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192      |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608 | 8,192      |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752 | 8,192      |

## 高级配置

<AccordionGroup>
  <Accordion title="自动启用行为">
    当设置了 `NVIDIA_API_KEY` 环境变量时，提供程序会自动启用。除了密钥之外，不需要显式的提供程序配置。
  </Accordion>

  <Accordion title="目录和定价">
    捆绑的目录是静态的。由于 NVIDIA 目前为列出的模型提供免费 API 访问，源中的成本默认为 `0`。
  </Accordion>

  <Accordion title="与 OpenAI 兼容的端点">
    NVIDIA 使用标准的 `/v1` 补全端点。任何与 OpenAI 兼容的工具都应该可以直接与 NVIDIA 基础 URL 一起使用。
  </Accordion>
</AccordionGroup>

<Tip>
NVIDIA 模型目前可以免费使用。查看 [build.nvidia.com](https://build.nvidia.com/) 以获取最新的可用性和速率限制详情。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    代理、模型和提供程序的完整配置参考。
  </Card>
</CardGroup>
