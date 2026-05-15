---
summary: "通过 ds4 运行 OpenClaw，ds4 是一个本地 DeepSeek V4 Flash 的 OpenAI 兼容服务器"
read_when:
  - 你想让 OpenClaw 对接 antirez/ds4
  - 你想要一个支持工具调用的本地 DeepSeek V4 Flash 后端
  - 你需要 ds4-server 的 OpenClaw 配置
title: "ds4"
---

[ds4](https://github.com/antirez/ds4) 从本地
Metal 后端提供 DeepSeek V4 Flash，并带有 OpenAI 兼容的 `/v1` API。OpenClaw 通过通用的 `openai-completions` 提供方家族连接到 ds4。

ds4 不是内置的 OpenClaw 提供方插件。请在
`models.providers.ds4` 下进行配置，然后选择 `ds4/deepseek-v4-flash`。

- Provider id: `ds4`
- Plugin: none
- API: OpenAI 兼容的 Chat Completions (`openai-completions`)
- Suggested base URL: `http://127.0.0.1:18000/v1`
- Model id: `deepseek-v4-flash`
- Tool calls: 通过 OpenAI 风格的 `tools` 和 `tool_calls` 支持
- Reasoning: DeepSeek 风格的 `thinking` 和 `reasoning_effort`

## Requirements

- 支持 Metal 的 macOS。
- 一个可用的 ds4 检出版本，包含 `ds4-server` 和 DeepSeek V4 Flash GGUF 文件。
- 你所选择的上下文所需的足够内存。更大的 `--ctx` 值会在服务器启动时分配更多
  KV 内存。

<Warning>
OpenClaw agent 的回合会包含工具 schema 和工作区上下文。像 `--ctx 4096` 这样很小的上下文
可能能通过直接的 curl 测试，但在完整 agent 运行时会因为 `500 prompt exceeds context` 而失败。
用于 agent 和工具烟雾测试时，至少使用 `--ctx 32768`。只有在你有足够内存并且希望 ds4
表现为 Think Max 时，才使用 `--ctx 393216`。
</Warning>

## Quickstart

<Steps>
  <Step title="Start ds4-server">
    将 `<DS4_DIR>` 替换为你的 ds4 检出路径。

    ```bash
    <DS4_DIR>/ds4-server \
      --model <DS4_DIR>/ds4flash.gguf \
      --host 127.0.0.1 \
      --port 18000 \
      --ctx 32768 \
      --tokens 128
    ```

  </Step>
  <Step title="Verify the OpenAI-compatible endpoint">
    ```bash
    curl http://127.0.0.1:18000/v1/models
    ```

    响应中应包含 `deepseek-v4-flash`。

  </Step>
  <Step title="Add the OpenClaw provider config">
    添加 [Full config](#full-config) 中的配置，然后运行一次性模型
    检查：

    ```bash
    openclaw infer model run \
      --local \
      --model ds4/deepseek-v4-flash \
      --thinking off \
      --prompt "精确回复：openclaw-ds4-ok" \
      --json
    ```

  </Step>
</Steps>

## Full config

当 ds4 已经在 `127.0.0.1:18000` 上运行时，使用此配置。

```json5
{
  agents: {
    defaults: {
      model: { primary: "ds4/deepseek-v4-flash" },
      models: {
        "ds4/deepseek-v4-flash": {
          alias: "DS4 本地",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash (ds4)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32768,
            maxTokens: 128,
            compat: {
              supportsUsageInStreaming: true,
              supportsReasoningEffort: true,
              maxTokensField: "max_tokens",
              supportsStrictMode: false,
              thinkingFormat: "deepseek",
              supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          },
        ],
      },
    },
  },
}
```

保持 `contextWindow` 与 `ds4-server --ctx` 的值一致。保持 `maxTokens`
与 `--tokens` 一致，除非你有意让 OpenClaw 请求比服务器默认值
更少的输出。

## On-demand startup

当选择了 `ds4/...` 模型时，OpenClaw 可以只启动 ds4。将
`localService` 添加到同一个提供方条目中：

```json5
{
  models: {
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "<DS4_DIR>/ds4-server",
          args: [
            "--model",
            "<DS4_DIR>/ds4flash.gguf",
            "--host",
            "127.0.0.1",
            "--port",
            "18000",
            "--ctx",
            "32768",
            "--tokens",
            "128",
          ],
          cwd: "<DS4_DIR>",
          healthUrl: "http://127.0.0.1:18000/v1/models",
          readyTimeoutMs: 300000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash (ds4)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32768,
            maxTokens: 128,
            compat: {
              supportsUsageInStreaming: true,
              supportsReasoningEffort: true,
              maxTokensField: "max_tokens",
              supportsStrictMode: false,
              thinkingFormat: "deepseek",
              supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          },
        ],
      },
    },
  },
}
```

`command` 必须是绝对可执行路径。不使用 shell 查找和 `~` 展开。关于每个
`localService` 字段，参见 [Local model services](/gateway/local-model-services)。

## Think Max

ds4 只有在以下两个条件都满足时才会应用 Think Max：

- `ds4-server` 以 `--ctx 393216` 或更高启动。
- 请求使用 `reasoning_effort: "max"` 或等效的 ds4 effort 字段。

如果你运行这么大的上下文，请同时更新服务器标志和 OpenClaw 模型
元数据：

```json5
{
  contextWindow: 393216,
  maxTokens: 384000,
  compat: {
    supportsUsageInStreaming: true,
    supportsReasoningEffort: true,
    maxTokensField: "max_tokens",
    supportsStrictMode: false,
    thinkingFormat: "deepseek",
    supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
  },
}
```

## Test

先进行直接的 HTTP 检查：

```bash
curl http://127.0.0.1:18000/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"精确回复：ds4-ok"}],"max_tokens":16,"stream":false,"thinking":{"type":"disabled"}}'
```

然后测试 OpenClaw 的模型路由：

```bash
openclaw infer model run \
  --local \
  --model ds4/deepseek-v4-flash \
  --thinking off \
  --prompt "精确回复：openclaw-ds4-ok" \
  --json
```

对于完整的 agent 和工具调用烟雾测试，请使用至少 32768 的上下文：

```bash
openclaw agent \
  --local \
  --session-id ds4-tool-smoke \
  --model ds4/deepseek-v4-flash \
  --thinking off \
  --message "先使用一次 shell 命令 pwd，然后精确回复：tool-ok <output>" \
  --json \
  --timeout 240
```

预期结果：

- `executionTrace.winnerProvider` 为 `ds4`
- `executionTrace.winnerModel` 为 `deepseek-v4-flash`
- `toolSummary.calls` 至少为 `1`
- `finalAssistantVisibleText` 以 `tool-ok` 开头

## Troubleshooting

<AccordionGroup>
  <Accordion title="curl /v1/models cannot connect">
    ds4 未运行，或者未绑定到 `baseUrl` 中的主机和端口。先启动
    `ds4-server`，然后重试：

    ```bash
    curl http://127.0.0.1:18000/v1/models
    ```

  </Accordion>

  <Accordion title="500 prompt exceeds context">
    配置的 `--ctx` 对 OpenClaw 的回合来说太小了。提高
    `ds4-server --ctx`，然后将 `models.providers.ds4.models[].contextWindow`
    更新为匹配的值。带工具的完整 agent 回合所需上下文远多于
    直接的一条消息 curl 请求。
  </Accordion>

  <Accordion title="Think Max does not activate">
    ds4 只有在 `--ctx` 至少为 `393216` 且请求
    指定 `reasoning_effort: "max"` 时才会使用 Think Max。更小的上下文会回退到高
    推理。
  </Accordion>

  <Accordion title="The first request is slow">
    ds4 具有冷 Metal 常驻和模型预热阶段。使用
    `localService.readyTimeoutMs: 300000`，当 OpenClaw 按需启动服务器时。
  </Accordion>
</AccordionGroup>

## Related

<CardGroup cols={2}>
  <Card title="Local model services" href="/gateway/local-model-services" icon="play">
    在模型请求之前按需启动本地模型服务器。
  </Card>
  <Card title="Local models" href="/gateway/local-models" icon="server">
    选择并操作本地模型后端。
  </Card>
  <Card title="Model providers" href="/concepts/model-providers" icon="layers">
    配置提供方引用、认证和故障转移。
  </Card>
  <Card title="DeepSeek" href="/providers/deepseek" icon="brain">
    原生 DeepSeek 提供方行为和思维控制。
  </Card>
</CardGroup>