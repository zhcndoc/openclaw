---
summary: "在 OpenClaw 中使用 Synthetic 的 Anthropic 兼容 API"
read_when:
  - 你想将 Synthetic 用作模型提供方
  - 你需要设置 Synthetic API 密钥或基础 URL
title: "Synthetic"
---

[Synthetic](https://synthetic.new) 提供兼容 Anthropic 的端点。
OpenClaw 通过官方的 `@openclaw/synthetic-provider`
插件提供支持，并使用 Anthropic Messages API。

| 属性     | 值                                    |
| -------- | ------------------------------------- |
| 提供方   | `synthetic`                           |
| 认证     | `SYNTHETIC_API_KEY`                   |
| API      | Anthropic Messages                    |
| 基础 URL | `https://api.synthetic.new/anthropic` |

## 入门

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/synthetic-provider
    openclaw gateway restart
    ```
  </Step>
  <Step title="获取 API 密钥">
    从您的 Synthetic 账户获取 `SYNTHETIC_API_KEY`，或者让引导流程
    提示您输入一个。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice synthetic-api-key
    ```
  </Step>
  <Step title="验证默认模型">
    引导流程会将默认模型设置为：
    ```text
    synthetic/hf:MiniMaxAI/MiniMax-M3
    ```
  </Step>
</Steps>

<Warning>
OpenClaw 的 Anthropic 客户端会自动在基础 URL 后追加 `/v1`，因此请使用
`https://api.synthetic.new/anthropic`（而不是 `/anthropic/v1`）。如果 Synthetic
更改了其基础 URL，请覆盖 `models.providers.synthetic.baseUrl`。
</Warning>

## 配置示例

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M3" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M3": { alias: "MiniMax M3" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M3",
            name: "MiniMax M3",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## 内置目录

所有 Synthetic 模型的费用均为 `0`（输入/输出/缓存）。有关服务可用性，请参阅 Synthetic 的
[当前模型列表](https://dev.synthetic.new/docs/api/models)。

| 模型 ID                                             | 上下文窗口     | 最大令牌数 | 推理      | 输入         |
| --------------------------------------------------- | -------------- | ---------- | --------- | ------------ |
| `hf:MiniMaxAI/MiniMax-M3`                           | 262,144        | 65,536     | 是        | 文本 + 图像  |
| `hf:moonshotai/Kimi-K2.7-Code`                      | 262,144        | 8,192      | 是        | 文本 + 图像  |
| `hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4` | 262,144        | 8,192      | 是        | 文本         |
| `hf:openai/gpt-oss-120b`                            | 131,072        | 8,192      | 是        | 文本         |
| `hf:Qwen/Qwen3.6-27B`                               | 262,144        | 81,920     | 是        | 文本 + 图像  |
| `hf:zai-org/GLM-4.7-Flash`                          | 196,608        | 131,072    | 是        | 文本         |
| `hf:zai-org/GLM-5.2`                                | 524,288        | 131,072    | 是        | 文本         |

<Tip>
模型引用使用 `synthetic/<modelId>` 这种格式。使用
`openclaw models list --provider synthetic` 查看你账户中可用的所有模型。
</Tip>

<AccordionGroup>
  <Accordion title="模型允许列表">
    如果启用了模型允许列表（`agents.defaults.modelPolicy.allow`），请添加所有
    计划使用的 Synthetic 模型。不在允许列表中的模型将对代理隐藏。
  </Accordion>

  <Accordion title="基础 URL 覆盖">
    如果 Synthetic 更改了其 API 端点，请覆盖基础 URL：

    ```json5
    {
      models: {
        providers: {
          synthetic: {
            baseUrl: "https://new-api.synthetic.new/anthropic",
          },
        },
      },
    }
    ```

    OpenClaw 仍会自动附加 `/v1`。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供方" href="/concepts/model-providers" icon="layers">
    提供方规则、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供方设置在内的完整配置模式。
  </Card>
  <Card title="Synthetic" href="https://synthetic.new" icon="arrow-up-right-from-square">
    Synthetic 仪表盘和 API 文档。
  </Card>
</CardGroup>