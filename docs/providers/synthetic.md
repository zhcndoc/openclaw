---
summary: "在 OpenClaw 中使用 Synthetic 的 Anthropic 兼容 API"
read_when:
  - 你想将 Synthetic 用作模型提供方
  - 你需要设置 Synthetic API 密钥或基础 URL
title: "Synthetic"
---

[Synthetic](https://synthetic.new) 提供 Anthropic 兼容的端点。
OpenClaw 将其捆绑为 `synthetic` 提供方，并使用 Anthropic
Messages API。

| 属性     | 值                                    |
| -------- | ------------------------------------- |
| 提供方   | `synthetic`                           |
| 认证     | `SYNTHETIC_API_KEY`                   |
| API      | Anthropic Messages                    |
| 基础 URL | `https://api.synthetic.new/anthropic` |

## 入门

<Steps>
  <Step title="获取 API 密钥">
    从你的 Synthetic 账户中获取一个 `SYNTHETIC_API_KEY`，或者让引导流程
    提示你输入一个。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice synthetic-api-key
    ```
  </Step>
  <Step title="验证默认模型">
    引导流程会将默认模型设置为：
    ```text
    synthetic/hf:MiniMaxAI/MiniMax-M2.5
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
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
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
            id: "hf:MiniMaxAI/MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## 内置目录

所有 Synthetic 模型的费用均为 `0`（输入/输出/缓存）。

| 模型 ID                                               | 上下文窗口   | 最大 token 数 | 推理 | 输入         |
| ------------------------------------------------------ | ------------ | ------------- | ---- | ------------ |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192,000        | 65,536     | 否        | text         |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256,000        | 8,192      | 是       | text         |
| `hf:zai-org/GLM-4.7`                                   | 198,000        | 128,000    | 否        | text         |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128,000        | 8,192      | 否        | text         |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128,000        | 8,192      | 否        | text         |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128,000        | 8,192      | 否        | text         |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128,000        | 8,192      | 否        | text         |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159,000        | 8,192      | 否        | text         |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128,000        | 8,192      | 否        | text         |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524,000        | 8,192      | 否        | text         |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256,000        | 8,192      | 否        | text         |
| `hf:moonshotai/Kimi-K2.5`                              | 256,000        | 8,192      | 是       | text + image |
| `hf:openai/gpt-oss-120b`                               | 128,000        | 8,192      | 否        | text         |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256,000        | 8,192      | 否        | text         |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256,000        | 8,192      | 否        | text         |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250,000        | 8,192      | 否        | text + image |
| `hf:zai-org/GLM-4.5`                                   | 128,000        | 128,000    | 否        | text         |
| `hf:zai-org/GLM-4.6`                                   | 198,000        | 128,000    | 否        | text         |
| `hf:zai-org/GLM-5`                                     | 256,000        | 128,000    | 是       | text + image |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128,000        | 8,192      | 否        | text         |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256,000        | 8,192      | 是       | text         |

<Tip>
模型引用使用 `synthetic/<modelId>` 这种格式。使用
`openclaw models list --provider synthetic` 查看你账户中可用的所有模型。
</Tip>

<AccordionGroup>
  <Accordion title="模型白名单">
    如果你启用了模型白名单（`agents.defaults.models`），请添加你计划使用的每一个
    Synthetic 模型。不在白名单中的模型会对代理隐藏。
  </Accordion>

  <Accordion title="Base URL 覆盖">
    如果 Synthetic 更改了其 API 端点，请覆盖 base URL：

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
  <Card title="Model providers" href="/concepts/model-providers" icon="layers">
    Provider rules, model refs, and failover behavior.
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供方设置在内的完整配置模式。
  </Card>
  <Card title="Synthetic" href="https://synthetic.new" icon="arrow-up-right-from-square">
    Synthetic 仪表盘和 API 文档。
  </Card>
</CardGroup>