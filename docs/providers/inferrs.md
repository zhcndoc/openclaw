---
summary: "通过 inferrs 运行 OpenClaw（兼容 OpenAI 的本地服务器）"
read_when:
  - 你想让 OpenClaw 对接本地 inferrs 服务器
  - 你正在通过 inferrs 提供 Gemma 或其他模型服务
  - 你需要 inferrs 对应的 OpenClaw 兼容标志的精确配置
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) 在 OpenAI 兼容的 `/v1` API 后提供本地模型服务。OpenClaw 通过通用的 `openai-completions` 适配器与之对接。

| Property           | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| Provider id        | `inferrs`（自定义；在 `models.providers.inferrs` 下配置）             |
| Plugin             | none — 不是内置的 OpenClaw 提供方插件                                 |
| Auth env var       | 不需要；如果你的 inferrs 服务器没有认证，任何值都可以                 |
| API                | 兼容 OpenAI（`openai-completions`）                                  |
| Suggested base URL | `http://127.0.0.1:8080/v1`（或你的 inferrs 服务器监听的其他地址）     |

<Note>
  `inferrs` 是一个自托管的、兼容 OpenAI 的自定义后端，不是专用的 OpenClaw 提供方插件：你需要在 `models.providers.inferrs` 下进行配置，而不是选择某个引导认证选项。若想要带自动发现的内置插件，请参阅 [SGLang](/providers/sglang) 或 [vLLM](/providers/vllm)。
</Note>

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
  <Step title="添加一个 OpenClaw 提供商条目">
    添加一个显式的提供商条目，并将你的默认模型指向它。请参见下面的配置示例。
  </Step>
</Steps>

## 完整配置示例

本地 `inferrs` 服务器上的 Gemma 4：

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

## 按需启动

OpenClaw 仅在选择 `inferrs/...` 模型时才会自行启动 `inferrs`。将 `localService` 添加到同一个 provider 条目中：

```json5
{
  models: {
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/opt/homebrew/bin/inferrs",
          args: [
            "serve",
            "google/gemma-4-E2B-it",
            "--host",
            "127.0.0.1",
            "--port",
            "8080",
            "--device",
            "metal",
          ],
          healthUrl: "http://127.0.0.1:8080/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
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

`command` 必须是绝对路径。在 Gateway 主机上运行 `which inferrs` 并使用该路径。完整字段参考： [本地模型服务](/gateway/local-model-services)。

## 高级配置

<AccordionGroup>
  <Accordion title="Why requiresStringContent matters">
    Some `inferrs` Chat Completions routes accept only string `messages[].content`, not structured content-part arrays.

    <Warning>
    If OpenClaw runs fail with:

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    set `compat.requiresStringContent: true` in the model entry. OpenClaw then flattens pure text content parts into plain strings before sending the request.
    </Warning>

  </Accordion>

  <Accordion title="Gemma and tool-schema caveat">
    Some `inferrs` + Gemma combinations accept small direct `/v1/chat/completions` requests but fail on full OpenClaw agent-runtime turns. Try disabling the tool schema surface first:

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    That reduces prompt pressure on stricter local backends. If tiny direct requests still work but normal OpenClaw agent turns keep crashing inside `inferrs`, treat it as an upstream model/server limitation rather than an OpenClaw transport issue.

  </Accordion>

  <Accordion title="Manual smoke test">
    Test both layers once configured:

    ```bash
    curl http://127.0.0.1:8080/v1/chat/completions \
      -H 'content-type: application/json' \
      -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"2 + 2 等于多少？"}],"stream":false}'
    ```

    ```bash
    openclaw infer model run \
      --model inferrs/google/gemma-4-E2B-it \
      --prompt "2 + 2 等于多少？请用一句简短的话回答。" \
      --json
    ```

    If the first command works but the second fails, see Troubleshooting below.

  </Accordion>

  <Accordion title="Proxy-style behavior">
    Because `inferrs` uses the generic `openai-completions` adapter (not `openai-responses`), native-OpenAI-only request shaping never applies: no `service_tier`, no Responses `store`, no prompt-cache hints, and no OpenAI reasoning-compat payload shaping get sent.
  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="curl /v1/models fails">
    `inferrs` 未运行、无法访问，或未绑定到你配置的主机/端口。请确认服务器已启动并在该地址上监听。
  </Accordion>

  <Accordion title="messages[].content expected a string">
    在模型条目中设置 `compat.requiresStringContent: true`（见上文）。
  </Accordion>

  <Accordion title="Direct /v1/chat/completions calls pass but openclaw infer model run fails">
    设置 `compat.supportsTools: false` 以禁用工具 schema 表面（见上面的 Gemma 注意事项）。
  </Accordion>

  <Accordion title="inferrs still crashes on larger agent turns">
    如果 schema 错误已经消失，但 `inferrs` 在较大的 agent 轮次中仍然崩溃，请将其视为上游 `inferrs` 或模型限制。减少提示词压力或切换后端/模型。
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
  <Card title="本地模型服务" href="/gateway/local-model-services" icon="play">
    按需启动已配置提供方的本地模型服务器。
  </Card>
  <Card title="网关故障排除" href="/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    调试通过探测但在 agent 运行时失败的本地 OpenAI 兼容后端。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供方、模型引用和故障转移行为的概览。
  </Card>
</CardGroup>