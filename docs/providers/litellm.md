---
summary: "通过 LiteLLM Proxy 运行 OpenClaw，实现统一的模型访问和成本跟踪"
title: "LiteLLM"
read_when:
  - 你想通过 LiteLLM 代理路由 OpenClaw
  - 你需要通过 LiteLLM 进行成本跟踪、日志记录或模型路由
---

[LiteLLM](https://litellm.ai) 是一个开源的 LLM 网关，提供面向 100+ 模型提供商的统一 API。通过 LiteLLM 路由 OpenClaw，可获得集中式成本跟踪、日志记录，以及无需更改 OpenClaw 配置即可切换后端的灵活性。

<Tip>
**为什么要将 LiteLLM 与 OpenClaw 一起使用？**

- **成本跟踪** — 精确查看 OpenClaw 在所有模型上的花费
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之间切换，无需修改配置
- **虚拟密钥** — 为 OpenClaw 创建带支出限制的密钥
- **日志记录** — 完整的请求/响应日志，便于调试
- **回退** — 当主提供商不可用时自动故障转移

</Tip>

## 快速开始

<Tabs>
  <Tab title="入门引导（推荐）">
    **最适合：** 快速获得可用的 LiteLLM 设置。

    <Steps>
      <Step title="运行入门引导">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```

        对于连接远程代理的非交互式设置，请显式传入代理 URL：

        ```bash
        openclaw onboard --non-interactive --auth-choice litellm-api-key --litellm-api-key "$LITELLM_API_KEY" --custom-base-url "https://litellm.example/v1"
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="手动设置">
    **最适合：** 对安装和配置进行完全控制。

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

        就是这样。OpenClaw 现在会通过 LiteLLM 路由。
      </Step>
    </Steps>

  </Tab>
</Tabs>

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

## 高级配置

### 图像生成

LiteLLM 也可以通过与 OpenAI 兼容的
`/images/generations` 和 `/images/edits` 路由来支持 `image_generate` 工具。请在
`agents.defaults.imageGenerationModel` 下配置 LiteLLM 图像模型：

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
      imageGenerationModel: {
        primary: "litellm/gpt-image-2",
        timeoutMs: 180_000,
      },
    },
  },
}
```

诸如 `http://localhost:4000` 的回环 LiteLLM URL 无需全局
私有网络覆盖即可工作。对于局域网托管的代理，请设置
`models.providers.litellm.request.allowPrivateNetwork: true`，因为 API 密钥
将会发送到配置的代理主机。

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

    OpenClaw 仍然只请求 `claude-opus-4-6` —— 路由由 LiteLLM 处理。

  </Accordion>

  <Accordion title="查看用量">
    查看 LiteLLM 的仪表盘或 API：

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
    - LiteLLM 默认运行在 `http://localhost:4000`
    - OpenClaw 通过 LiteLLM 的代理式、与 OpenAI 兼容的 `/v1`
      端点进行连接
    - 通过 LiteLLM 时，不适用原生仅 OpenAI 的请求形状调整：
      没有 `service_tier`，没有 Responses 的 `store`，没有提示缓存提示，也没有
      OpenAI reasoning-compat 有效载荷形状调整
    - 在自定义 LiteLLM base URL 上，不会注入隐藏的 OpenClaw 归因头
      （`originator`、`version`、`User-Agent`）
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
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
</CardGroup>