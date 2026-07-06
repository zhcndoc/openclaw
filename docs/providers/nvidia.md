---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 兼容 API"
read_when:
  - 你想在 OpenClaw 中免费使用开源模型
  - 你需要设置 `NVIDIA_API_KEY`
  - 你想通过 NVIDIA 使用 Nemotron 3 Ultra
title: "NVIDIA"
---

NVIDIA 通过 OpenAI 兼容的 API 在
`https://integrate.api.nvidia.com/v1` 免费提供开放模型，并使用来自
[build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 密钥进行身份验证。OpenClaw
默认将 NVIDIA 提供商设置为 Nemotron 3 Ultra，这是 NVIDIA 的 550B 总参数 / 55B
活跃推理模型，适用于长上下文的智能体工作。

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
    openclaw models set nvidia/nvidia/nemotron-3-ultra-550b-a55b
    ```
  </Step>
</Steps>

对于非交互式设置，请直接传入 key：

```bash
openclaw onboard --auth-choice nvidia-api-key --nvidia-api-key "nvapi-..."
```

<Warning>
`--nvidia-api-key` 会将 key 记录到 shell history 和 `ps` 输出中。尽可能优先使用
`NVIDIA_API_KEY` 环境变量。
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
      model: { primary: "nvidia/nvidia/nemotron-3-ultra-550b-a55b" },
    },
  },
}
```

## 精选目录

当配置了 NVIDIA API 密钥时，设置和模型选择路径会从
`https://assets.ngc.nvidia.com/products/api-catalog/featured-models.json` 获取
NVIDIA 的公共精选模型目录，并将结果缓存 24 小时（前 32 条条目，作为自由文本输入行导入）。
因此，来自 build.nvidia.com 的新精选模型会在设置和模型选择界面中显示，而无需等待 OpenClaw 发布新版本。
当实时源可用时，在 NVIDIA 设置期间，返回的第一个模型将作为预选项。

该获取过程对 `assets.ngc.nvidia.com` 使用固定的 HTTPS 主机策略。如果未配置
NVIDIA API 密钥，或者该源不可用或格式错误，OpenClaw 将回退到内置目录和下面的内置默认值。

## Nemotron 3 Ultra

Nemotron 3 Ultra 是 OpenClaw 中默认的 NVIDIA 模型。NVIDIA 对
[`nvidia/nemotron-3-ultra-550b-a55b`](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b) 的构建页面将其列为可用的免费端点，且上下文规格为 1M tokens。内置目录记录的最大输出为 16,384 tokens，以匹配 NVIDIA 当前针对该托管端点的 OpenAI 兼容示例请求。

捆绑的 Ultra 行默认发送
`chat_template_kwargs: { enable_thinking: false, force_nonempty_content: true }`
，因此正常的聊天输出会保留在可见答案中，而不会暴露推理文本。

在需要最高能力的 NVIDIA 默认模型时使用 Ultra。如果你想要更小的 Nemotron 3 选项，就保持选择 Super；或者在 NVIDIA 目录中选择一个第三方模型，当它们的上下文、延迟或行为更适合时使用。

## 内置回退目录

| Model ref                                  | Name                         | Context   | Max output | Notes                                    |
| ------------------------------------------ | ---------------------------- | --------- | ---------- | ---------------------------------------- |
| `nvidia/nvidia/nemotron-3-ultra-550b-a55b` | NVIDIA Nemotron 3 Ultra 550B | 1,000,000 | 16,384     | 默认                                     |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 1,048,576 | 8,192      |                                          |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144   | 8,192      |                                          |
| `nvidia/minimaxai/minimax-m2.7`            | Minimax M2.7                 | 196,608   | 8,192      |                                          |
| `nvidia/z-ai/glm-5.1`                      | GLM 5.1                      | 202,752   | 8,192      |                                          |
| `nvidia/minimaxai/minimax-m2.5`            | MiniMax M2.5                 | 196,608   | 8,192      | 已弃用；请使用 `minimaxai/minimax-m2.7` |
| `nvidia/z-ai/glm5`                         | GLM-5                        | 202,752   | 8,192      | 已弃用；请使用 `z-ai/glm-5.1`           |

## 高级配置

<AccordionGroup>
  <Accordion title="自动启用行为">
    当设置了 `NVIDIA_API_KEY` 环境变量，或在引导过程中已保存密钥时，提供方会自动启用。除密钥外，无需额外的提供方配置。
  </Accordion>

  <Accordion title="目录与定价">
    当配置了 NVIDIA 认证时，OpenClaw 会优先使用 NVIDIA 的公开精选模型目录，并将其缓存 24 小时。内置回退目录是静态的，并保留了已弃用但仍随发行版提供的引用，以便升级兼容。由于 NVIDIA 目前为列出的模型提供免费 API 访问，源码中的成本默认值为 `0`。
  </Accordion>

  <Accordion title="OpenAI-compatible endpoint">
    OpenClaw 使用 `openai-completions` 适配器通过标准的 `/v1` 聊天补全路由与 NVIDIA 通信。任何兼容 OpenAI 的工具都应可在 NVIDIA base URL 下直接使用。
  </Accordion>

  <Accordion title="Nemotron 3 Ultra 推理参数">
    NVIDIA 的 Ultra 示例请求使用 `chat_template_kwargs.enable_thinking`
    和 `reasoning_budget` 来控制推理输出。OpenClaw 内置的 Ultra 行默认禁用模板推理，以用于正常聊天。如果你需要启用 NVIDIA 的推理输出，或者强制设置其他 NVIDIA 特定请求字段，请按模型设置参数，并将提供方级别的覆盖限定在 NVIDIA 模型上：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "nvidia/nvidia/nemotron-3-ultra-550b-a55b": {
              params: {
                chat_template_kwargs: { enable_thinking: true },
                extra_body: { reasoning_budget: 16384 },
              },
            },
          },
        },
      },
    }
    ```

    `params.chat_template_kwargs` 会合并到请求中已有的 `chat_template_kwargs`
   ，而不是替换整个对象。
    `params.extra_body` 是最终的 OpenAI 兼容请求体覆盖项，
    会覆盖冲突的负载键，因此仅应将其用于 NVIDIA 针对所选端点
    文档中说明的字段。

  </Accordion>

  <Accordion title="缓慢的自定义提供方响应">
    某些由 NVIDIA 托管的自定义模型，在发出第一段响应之前，所需时间可能会超过默认约 120 秒的模型空闲看门狗阈值。对于自定义 NVIDIA 提供方条目，应提高提供方超时，而不是提高整个代理运行时超时；`timeoutSeconds` 同时覆盖提供方的 HTTP 请求，并提高该提供方的空闲/流式看门狗上限：

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