---
summary: "通过 inferrs（OpenAI 兼容的本地服务器）运行 OpenClaw"
read_when:
  - 你想使用本地 inferrs 服务器运行 OpenClaw
  - 你正在通过 inferrs 提供 Gemma 或其他模型
  - 你需要 inferrs 的准确 OpenClaw 兼容标志
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) 可以通过兼容 OpenAI 的 `/v1` API 提供本地模型。OpenClaw 通过通用的 `openai-completions` 路径与 `inferrs` 配合工作。

目前，最好将 `inferrs` 视为自定义的自托管 OpenAI 兼容后端，而不是专用的 OpenClaw 提供商插件。

## 开始使用

<Steps>
  <Step title="启动带有模型的 inferrs">
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
  <Step title="添加 OpenClaw 提供商条目">
    添加一个明确的提供商条目并将您的默认模型指向它。请参阅下面的完整配置示例。
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
          alias: "Gemma 4 (inferrs)",
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
            name: "Gemma 4 E2B (inferrs)",
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
    某些 `inferrs` Chat Completions 路由仅接受字符串 `messages[].content`，而不接受结构化的 content-part 数组。

    <Warning>
    如果 OpenClaw 运行失败并出现如下错误：

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    在您的模型条目中设置 `compat.requiresStringContent: true`。
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```

    OpenClaw 将在发送请求之前将纯文本内容部分扁平化为普通字符串。

  </Accordion>

  <Accordion title="Gemma 和 tool-schema 注意事项">
    某些当前的 `inferrs` + Gemma 组合接受小型直接 `/v1/chat/completions` 请求，但在完整的 OpenClaw agent-runtime 回合上仍然失败。

    如果发生这种情况，请先尝试此操作：

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    这将禁用该模型的 OpenClaw 工具 schema 表面，并可以减少对更严格的本地后端的提示压力。

    如果微型直接请求仍然有效但正常的 OpenClaw agent 回合继续在 `inferrs` 内部崩溃，剩余的问题通常是上游模型/服务器行为而不是 OpenClaw 的传输层。

  </Accordion>

  <Accordion title="手动冒烟测试">
    配置完成后，测试两层：

    ```bash
    curl http://127.0.0.1:8080/v1/chat/completions \
      -H 'content-type: application/json' \
      -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"2 + 2 是多少？"}],"stream":false}'
    ```

    ```bash
    openclaw infer model run \
      --model inferrs/google/gemma-4-E2B-it \
      --prompt "2 + 2 是多少？请用一句简短的话回答。" \
      --json
    ```

    如果第一个命令有效但第二个失败，请检查下面的故障排除部分。

  </Accordion>

  <Accordion title="代理式行为">
    `inferrs` 被视为代理式 OpenAI 兼容 `/v1` 后端，而不是原生 OpenAI 端点。

    - 原生仅限 OpenAI 的请求塑造不适用于此处
    - 无 `service_tier`，无 Responses `store`，无提示缓存提示，且无 OpenAI 推理兼容 payload 塑造
    - 隐藏的 OpenClaw 归属头（`originator`, `version`, `User-Agent`）不会注入到自定义 `inferrs` base URLs 上

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="curl /v1/models 失败">
    `inferrs` 未运行、不可访问或未绑定到预期的主机/端口。确保服务器已启动并在您配置的地址上监听。
  </Accordion>

  <Accordion title="messages[].content 期望为字符串">
    在模型条目中设置 `compat.requiresStringContent: true`。有关详细信息，请参阅上面的 `requiresStringContent` 部分。
  </Accordion>

  <Accordion title="直接 /v1/chat/completions 调用通过但 openclaw infer model run 失败">
    尝试设置 `compat.supportsTools: false` 以禁用工具 schema 表面。请参阅上面的 Gemma tool-schema 注意事项。
  </Accordion>

  <Accordion title="inferrs 在较大的 agent 回合上仍然崩溃">
    如果 OpenClaw 不再出现 schema 错误但 `inferrs` 在较大的 agent 回合上仍然崩溃，请将其视为上游 `inferrs` 或模型限制。减少提示压力或切换到不同的本地后端或模型。
  </Accordion>
</AccordionGroup>

<Tip>
对于一般帮助，请参阅 [故障排除](/help/troubleshooting) 和 [常见问题](/help/faq)。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="本地模型" href="/gateway/local-models" icon="server">
    针对本地模型服务器运行 OpenClaw。
  </Card>
  <Card title="网关故障排除" href="/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    调试通过探测但 agent 运行失败的本地 OpenAI 兼容后端。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障切换行为概览。
  </Card>
</CardGroup>