---
summary: "通过 LiteLLM Proxy 运行 OpenClaw，实现统一的模型访问和成本跟踪"
title: "LiteLLM"
read_when:
  - "你想通过 LiteLLM 代理路由 OpenClaw"
  - "你需要通过 LiteLLM 进行成本跟踪、日志记录或模型路由"
---

[LiteLLM](https://litellm.ai) 是一个开源的 LLM 网关，提供统一的 API 以连接 100+ 个模型提供商。通过 LiteLLM 路由 OpenClaw，可实现集中式成本跟踪、日志记录、带消费限额的虚拟密钥，以及后端故障切换，而无需更改 OpenClaw 配置。

## <a id="quick-start"></a> 快速开始

<Tabs>
  <Tab id="onboarding-recommended" title="入门引导（推荐）">
    ```bash
    openclaw onboard --auth-choice litellm-api-key
    ```

    对于针对远程代理的非交互式设置，请显式传入代理 URL：

    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health --auth-choice litellm-api-key \
      --litellm-api-key "$LITELLM_API_KEY" --custom-base-url "https://litellm.example/v1"
    ```

  </Tab>

  <Tab id="manual-setup" title="手动设置">
    <Steps>
      <Step id="start-litellm-proxy" title="启动 LiteLLM 代理">
        LiteLLM 代表您调用上游提供商，因此在启动之前导出该提供商的密钥 — 对于以下模型为 `ANTHROPIC_API_KEY`。有关多后端设置，请参阅 [ 模型路由](#advanced)。

        ```bash
        pip install 'litellm[proxy]'
        export ANTHROPIC_API_KEY=sk-ant-...
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step id="point-openclaw-to-litellm" title="将 OpenClaw 指向 LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"
        openclaw
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## <a id="configuration"></a> 配置

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
            id: "gpt-6-astra",
            name: "GPT-6 Astra",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1050000,
            maxTokens: 128000,
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

在合并模式下，使用显式代理 URL 加入会保留任何编写的提供程序模型，否则会将提供程序模型列表保留为空以供发现。运行 `openclaw models list --provider litellm --refresh --json` 以列出代理的模型。对于 `models.mode: "replace"`，发现被禁用，因此加入会在提供者模型列表中保留记录的默认值，同时保留现有的模型定义。

## <a id="image-generation"></a> 图像生成

LiteLLM可以通过OpenAI-兼容的`/images/generations`和`/images/edits`路由支持`image_generate`工具。默认镜像模型为`gpt-image-2`；在 `agents.defaults.mediaModels.image` 下配置一个不同的：

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

环回 LiteLLM URL（`http://localhost:4000`、`127.0.0.1`、`::1`、`host.docker.internal`）无需全局专用网络覆盖即可工作。对于 LAN- 托管代理，请设置 `models.providers.litellm.request.allowPrivateNetwork: true`，因为 API 密钥将发送到该主机。

## <a id="advanced"></a> 高级

<AccordionGroup>
  <Accordion id="virtual-keys" title="虚拟按键">
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

  <Accordion id="model-routing" title="模型路由">
    LiteLLM 可以将模型请求路由到不同的后端。在你的 LiteLLM `config.yaml` 中进行如下配置：

    ```yaml
    model_list:
      - model_name: claude-opus-4-6
        litellm_params:
          model: claude-opus-4-6
          api_key: os.environ/ANTHROPIC_API_KEY

      - model_name: gpt-6-astra
        litellm_params:
          model: gpt-6-astra
          api_key: os.environ/OPENAI_API_KEY
    ```

    OpenClaw 持续请求 `claude-opus-4-6`; LiteLLM 负责路由。

  </Accordion>

  <Accordion id="viewing-usage" title="查看使用情况">
    ```bash
    # Key info
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # Spend logs
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion id="proxy-behavior-notes" title="代理行为注释">
    - LiteLLM 默认运行在 `http://localhost:4000`。
    - OpenClaw 通过 LiteLLM 的代理式 OpenAI- 兼容 `/v1` 端点进行连接。
    - Native-OpenAI-only 请求整形不适用于通过配置的 LiteLLM 基础 URL：无 `service_tier`、无响应 `store`、无提示缓存提示、无 OpenAI 推理工作负载整形。
    - 隐藏的 OpenClaw 归属头（`originator`、`version`、`User-Agent`）只会发送到已验证的原生 OpenAI 端点，因此不会在自定义 LiteLLM 基础 URL 上注入。
  </Accordion>
</AccordionGroup>

<Note>
有关一般提供程序配置和故障转移行为，请参阅 [Model Providers](/concepts/model-providers)。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="LiteLLM 文档" href="https://docs.litellm.ai" icon="book">
    LiteLLM 官方文档和 API 参考。
  </Card>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    所有提供程序、模型引用和故障转移行为的概述。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
  <Card title="模型" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
</CardGroup>
