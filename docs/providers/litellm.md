---
summary: "通过 LiteLLM Proxy 运行 OpenClaw，实现统一的模型访问和成本跟踪"
title: "LiteLLM"
read_when:
  - 你想通过 LiteLLM 代理路由 OpenClaw
  - 你需要通过 LiteLLM 进行成本跟踪、日志记录或模型路由
---

[LiteLLM](https://litellm.ai) 是一个开源的 LLM 网关，提供统一的 API 以连接 100+ 个模型提供商。通过 LiteLLM 路由 OpenClaw，可实现集中式成本跟踪、日志记录、带消费限额的虚拟密钥，以及后端故障切换，而无需更改 OpenClaw 配置。

## 快速开始

<Tabs>
  <Tab title="入门（推荐）">
    ```bash
    openclaw onboard --auth-choice litellm-api-key
    ```

    对于针对远程代理的非交互式设置，请显式传入代理 URL：

    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health --auth-choice litellm-api-key \
      --litellm-api-key "$LITELLM_API_KEY" --custom-base-url "https://litellm.example/v1"
    ```

  </Tab>

  <Tab title="手动设置">
    <Steps>
      <Step title="启动 LiteLLM Proxy">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="将 OpenClaw 指向 LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"
        openclaw
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

## 配置

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

默认的模型 onboarding 写入为 `litellm/claude-opus-4-6`。

## 图像生成

LiteLLM 可以通过兼容 OpenAI 的 `/images/generations` 和
`/images/edits` 路由支持 `image_generate` 工具。默认图像模型为 `gpt-image-2`；可在
`agents.defaults.mediaModels.image` 下配置其他模型：

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
      },
    },
  },
  agents: {
    defaults: {
      mediaModels: {
        image: {
          primary: "litellm/gpt-image-2",
          timeoutMs: 180000,
        },
      },
    },
  },
}
```

回环 LiteLLM URL（`http://localhost:4000`、`127.0.0.1`、`::1`、`host.docker.internal`）无需全局私有网络覆盖即可工作。
对于部署在局域网主机上的代理，请设置
`models.providers.litellm.request.allowPrivateNetwork: true`，因为 API 密钥会发送到该主机。

## 高级

<AccordionGroup>
  <Accordion title="虚拟密钥">
    为 OpenClaw 创建一个带支出限制的专用密钥：

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

    将生成的密钥用作 `LITELLM_API_KEY`。

  </Accordion>

  <Accordion title="模型路由">
    LiteLLM 可以将模型请求路由到不同的后端。在你的 LiteLLM `config.yaml` 中进行如下配置：

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

    OpenClaw 持续请求 `claude-opus-4-6`; LiteLLM 负责路由。

  </Accordion>

  <Accordion title="查看使用情况">
    ```bash
    # 密钥信息
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # 支出日志
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion title="代理行为说明">
    - LiteLLM 默认运行在 `http://localhost:4000`。
    - OpenClaw 通过 LiteLLM 的代理式、与 OpenAI 兼容的 `/v1` 端点连接。
    - 通过已配置的 LiteLLM 基础 URL 时，不适用原生 OpenAI 专用的请求形状处理：
      没有 `service_tier`，没有 Responses 的 `store`，没有 prompt-cache 提示，也没有 OpenAI reasoning-effort
      负载形状处理。
    - 隐藏的 OpenClaw 归属头（`originator`、`version`、`User-Agent`）只会发送到
      已验证的原生 OpenAI 端点，因此不会在自定义 LiteLLM 基础 URL 上注入。
  </Accordion>
</AccordionGroup>

<Note>
有关通用提供商配置和故障转移行为，请参见 [模型提供商](/concepts/model-providers)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="LiteLLM 文档" href="https://docs.litellm.ai" icon="book">
    LiteLLM 官方文档和 API 参考。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概览。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整的配置参考。
  </Card>
  <Card title="模型" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
</CardGroup>