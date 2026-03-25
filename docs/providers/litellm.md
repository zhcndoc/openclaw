---
title: "LiteLLM"
summary: "Run OpenClaw through LiteLLM Proxy for unified model access and cost tracking"
read_when:
  - 你想通过 LiteLLM 代理路由 OpenClaw
  - 你需要通过 LiteLLM 进行成本跟踪、日志记录或模型路由
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一个开源的 LLM 网关，提供统一的 API 接入 100 多个模型提供商。通过 LiteLLM 路由 OpenClaw，可实现集中成本跟踪、日志记录，以及无需更改 OpenClaw 配置即可灵活切换后端。

## 为什么要将 LiteLLM 和 OpenClaw 一起使用？

- **成本跟踪** — 精确查看 OpenClaw 在所有模型上的花费
- **模型路由** — 无需更改配置即可在 Claude、GPT-4、Gemini、Bedrock 等之间切换
- **虚拟密钥** — 为 OpenClaw 创建带消费限制的密钥
- **日志记录** — 完整的请求/响应日志，便于调试
- **故障切换** — 当主提供商不可用时，自动切换备用提供商

## 快速开始

### 通过入门命令

```bash
openclaw onboard --auth-choice litellm-api-key
```

### 手动设置

1. 启动 LiteLLM 代理：

```bash
pip install 'litellm[proxy]'
litellm --model claude-opus-4-6
```

2. 指向 OpenClaw 使用 LiteLLM：

```bash
export LITELLM_API_KEY="your-litellm-key"

openclaw
```

完成。OpenClaw 现通过 LiteLLM 进行路由。

## 配置

### 环境变量

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### 配置文件

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## 虚拟密钥

为 OpenClaw 创建带消费限制的专用密钥：

```bash
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "openclaw",
    "max_budget": 50.00,
    "budget_duration": "monthly"
  }'
```

将生成的密钥用于 `LITELLM_API_KEY`。

## 模型路由

LiteLLM 可将模型请求路由到不同的后端。在 LiteLLM 的 `config.yaml` 中配置：

```yaml
model_list:
  - model_name: claude-opus-4-6
    litellm_params:
      model: claude-opus-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY
```

OpenClaw 始终请求 `claude-opus-4-6`，路由由 LiteLLM 负责处理。

## 查看使用情况

查看 LiteLLM 的仪表盘或使用 API：

```bash
# 密钥信息
curl "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-litellm-key"

# 消费日志
curl "http://localhost:4000/spend/logs" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## 注意事项

- LiteLLM 默认运行在 `http://localhost:4000`
- OpenClaw 通过兼容 OpenAI 的 `/v1/chat/completions` 端点连接
- OpenClaw 的所有功能均可通过 LiteLLM 使用，无任何限制

## 另见

- [LiteLLM 文档](https://docs.litellm.ai)
- [模型提供商](/concepts/model-providers)
