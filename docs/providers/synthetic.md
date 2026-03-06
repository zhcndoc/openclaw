---
summary: "在 OpenClaw 中使用 Synthetic 的兼容 Anthropic API"
read_when:
  - 你想使用 Synthetic 作为模型提供者
  - 你需要设置 Synthetic API 密钥或基础 URL
title: "Synthetic"
---

# Synthetic

Synthetic 提供兼容 Anthropic 的端点。OpenClaw 将其注册为
`synthetic` 提供者并使用 Anthropic Messages API。

## 快速设置

1. 设置 `SYNTHETIC_API_KEY`（或运行下面的向导）。
2. 运行入门流程：

```bash
openclaw onboard --auth-choice synthetic-api-key
```

默认模型设置为：

```
synthetic/hf:MiniMaxAI/MiniMax-M2.5
```

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

注意：OpenClaw 的 Anthropic 客户端会自动在基础 URL 后追加 `/v1`，所以要使用
`https://api.synthetic.new/anthropic`（不要使用 `/anthropic/v1`）。如果 Synthetic
更改其基础 URL，请覆盖 `models.providers.synthetic.baseUrl`。

## 模型目录

以下所有模型的费用均为 `0`（输入/输出/缓存）。

| 模型 ID                                               | 上下文窗口    | 最大 token 数 | 推理支持 | 输入类型       |
| ------------------------------------------------------ | -------------- | ---------- | --------- | ------------ |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192000         | 65536      | 否        | 文本          |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256000         | 8192       | 是        | 文本          |
| `hf:zai-org/GLM-4.7`                                   | 198000         | 128000     | 否        | 文本          |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128000         | 8192       | 否        | 文本          |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128000         | 8192       | 否        | 文本          |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128000         | 8192       | 否        | 文本          |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128000         | 8192       | 否        | 文本          |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159000         | 8192       | 否        | 文本          |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128000         | 8192       | 否        | 文本          |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524000         | 8192       | 否        | 文本          |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256000         | 8192       | 否        | 文本          |
| `hf:openai/gpt-oss-120b`                               | 128000         | 8192       | 否        | 文本          |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256000         | 8192       | 否        | 文本          |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256000         | 8192       | 否        | 文本          |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250000         | 8192       | 否        | 文本 + 图片    |
| `hf:zai-org/GLM-4.5`                                   | 128000         | 128000     | 否        | 文本          |
| `hf:zai-org/GLM-4.6`                                   | 198000         | 128000     | 否        | 文本          |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128000         | 8192       | 否        | 文本          |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256000         | 8192       | 是        | 文本          |

## 注意事项

- 模型引用格式为 `synthetic/<modelId>`。
- 如果启用模型白名单（`agents.defaults.models`），请添加你计划使用的所有模型。
- 详情请参阅 [模型提供者](/concepts/model-providers) 的提供者规则。
