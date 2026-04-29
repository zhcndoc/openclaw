---
summary: "通过 inferrs 运行 OpenClaw（兼容 OpenAI 的本地服务器）"
read_when:
  - 你想让 OpenClaw 对接本地 inferrs 服务器
  - 你正在通过 inferrs 提供 Gemma 或其他模型服务
  - 你需要 inferrs 对应的 OpenClaw 兼容标志的精确配置
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) 可以在一个兼容 OpenAI 的 `/v1` API 后面提供本地模型服务。OpenClaw 通过通用的
`openai-completions` 路径与 `inferrs` 协同工作。

目前最好将 `inferrs` 视为一个自托管的、兼容 OpenAI 的
后端，而不是一个专门的 OpenClaw 提供方插件。

## 快速开始

<Steps>
  <Step title="使用模型启动 inferrs">
    ```bash
    inferrs serve google/gemma-4-E2B-it \
      --host 127.0.0.1 \
      --port 8080 \
      --device metal
    ```
  </Step>
  <Step title="验证服务器是否可访问">
    ```bash
    curl http://127.0.0.1:8080/health
    curl http://127.0.0.1:8080/v1/models
    ```
  </Step>
  <Step title="添加一个 OpenClaw 提供方条目">
    添加一个显式的提供方条目，并将你的默认模型指向它。请参见下面的完整配置示例。
  </Step>
</Steps>

## 完整配置示例

此示例使用本地 `inferrs` 服务器上的 Gemma 4。

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
      models: {
        "inferrs/google/gemma-4-E2B-it": {
          alias: "Gemma 4（inferrs）",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        models: [
          {
            id: "google/gemma-4-E2B-it",
            name: "Gemma 4 E2B（inferrs）",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="为什么 requiresStringContent 很重要">
    某些 `inferrs` Chat Completions 路由只接受字符串类型的
    `messages[].content`，而不接受结构化的内容分块数组。

    <Warning>
    如果 OpenClaw 运行失败，并出现如下错误：

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    请在你的模型条目中设置 `compat.requiresStringContent: true`。
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```

    在发送请求之前，OpenClaw 会将纯文本内容分块展平成普通字符串。

  </Accordion>

  <Accordion title="Gemma 与工具 schema 的注意事项">
    某些当前的 `inferrs` + Gemma 组合可以接受较小的直接
    `/v1/chat/completions` 请求，但在完整的 OpenClaw agent-runtime
    轮次中仍然会失败。

    如果发生这种情况，先尝试以下配置：

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    这会禁用该模型的 OpenClaw 工具 schema 表面，并且可以减少对更严格的本地后端造成的提示词
    压力。

    如果较小的直接请求仍然可用，但正常的 OpenClaw agent 轮次继续在
    `inferrs` 内部崩溃，那么剩余问题通常是上游模型/服务器
    行为，而不是 OpenClaw 的传输层。

  </Accordion>

  <Accordion title="手动冒烟测试">
    配置完成后，请测试两个层面：

    ```bash
    curl http://127.0.0.1:8080/v1/chat/completions \
      -H 'content-type: application/json' \
      -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'
    ```

    ```bash
    openclaw infer model run \
      --model inferrs/google/gemma-4-E2B-it \
      --prompt "What is 2 + 2? Reply with one short sentence." \
      --json
    ```

    如果第一个命令可用但第二个失败，请查看下面的故障排除部分。

  </Accordion>

  <Accordion title="代理式行为">
    `inferrs` 被视为一种代理式、兼容 OpenAI 的 `/v1` 后端，而不是一个
    原生的 OpenAI 端点。

    - 这里不适用 OpenAI 原生专用的请求整形
    - 没有 `service_tier`、没有 Responses `store`、没有 prompt-cache 提示，也没有
      OpenAI reasoning-compat 负载整形
    - 隐藏的 OpenClaw 归属头（`originator`、`version`、`User-Agent`）
      不会注入到自定义 `inferrs` base URL 中

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="curl /v1/models 失败">
    `inferrs` 没有运行、无法访问，或者没有绑定到预期的
    host/port。请确保服务器已启动并正在监听你配置的地址。
  </Accordion>

  <Accordion title="messages[].content 预期为字符串">
    在模型条目中设置 `compat.requiresStringContent: true`。有关详细信息，请参见上文
    `requiresStringContent` 部分。
  </Accordion>

  <Accordion title="直接调用 /v1/chat/completions 成功，但 openclaw infer model run 失败">
    尝试设置 `compat.supportsTools: false` 以禁用工具 schema 表面。
    请参见上面的 Gemma 工具 schema 注意事项。
  </Accordion>

  <Accordion title="inferrs 在较大的 agent 轮次中仍然崩溃">
    如果 OpenClaw 不再出现 schema 错误，但 `inferrs` 在较大的
    agent 轮次中仍然崩溃，则应将其视为上游 `inferrs` 或模型限制。请降低
    提示词压力，或切换到不同的本地后端或模型。
  </Accordion>
</AccordionGroup>

<Tip>
如需一般帮助，请参阅 [故障排除](/help/troubleshooting) 和 [FAQ](/help/faq)。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="本地模型" href="/gateway/local-models" icon="server">
    在本地模型服务器上运行 OpenClaw。
  </Card>
  <Card title="网关故障排除" href="/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    调试那些能够通过探测但在 agent 运行时失败的本地 OpenAI 兼容后端。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供方、模型引用和故障转移行为的概览。
  </Card>
</CardGroup>