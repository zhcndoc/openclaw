---
summary: "从网关公开 OpenAI- 兼容 /v1/chat/completions HTTP 端点"
read_when:
  - "期望在集成中使用 OpenAI Chat Completions 的工具"
title: "OpenAI 聊天完成情况"
---

网关可以为小型 OpenAI- 兼容聊天完成表面提供服务。默认为**禁用**。

启用后，它会在与 Gateway 相同的端口上提供以下所有接口（WS + HTTP 多路复用）：

| 方法 | 路径                   |
| ------ | ---------------------- |
| POST   | `/v1/chat/completions` |
| GET    | `/v1/models`           |
| GET    | `/v1/models/{id}`      |
| POST   | `/v1/embeddings`       |

`POST /v1/responses` 与 `gateway.http.endpoints.responses.enabled` 单独启用。请参阅 [OpenResponses API](/gateway/openresponses-http-api)。

请求作为正常网关代理运行（与 `openclaw agent` 相同的代码路径）运行，因此路由、权限和配置与您的网关匹配。

## <a id="enabling-the-endpoint"></a> 启用端点

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

将 `enabled: false`（或省略它）以禁用。

## <a id="security-boundary-(important)"></a><a id="security-boundary-important"></a> 安全边界（重要）

将此端点视为对网关实例的**完整运维访问**：

- 此端点的有效网关 token/password 相当于 owner/operator 凭证，而不是狭窄的每用户范围。
- 请求会通过与受信任运维操作相同的控制平面代理路径运行，因此如果目标代理的策略允许敏感工具，此端点也可以使用它们。
- 仅将其保留在 loopback/tailnet/private ingress 上。不要将其暴露到公共互联网。

认证矩阵：

| 认证路径                                                                                            | 行为                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway.auth.mode="token"` or `"password"` + `Authorization: Bearer ...`                            | 证明持有共享的 gateway 密钥。忽略任何 `x-openclaw-scopes` 标头，并恢复完整的默认运维范围集合：`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`。将聊天回合视为 owner-sender 回合。 |
| 可信身份承载 HTTP（可信代理身份验证，或私有入口上的 `gateway.auth.mode="none"`） | 在场时授予 `x-openclaw-scopes` 荣誉；当不存在时，回退到默认的操作符范围设置。仅当调用者显式缩小范围并省略 `operator.admin` 时，才会丢失所有者语义。需要 `operator.admin` 用于所有者级控件，例如 `x-openclaw-model`。                        |

参见 [Operator scopes](/gateway/operator-scopes)、[Security](/gateway/security) 和 [Remote access](/gateway/remote)。

## <a id="authentication"></a> 身份验证

使用 Gateway 身份验证配置（有关该模式的详细信息，请参见 [受信任代理身份验证](/gateway/trusted-proxy-auth)）：

| 模式                                | 如何进行身份验证                                                                                                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway.auth.mode="token"`         | `Authorization: Bearer <token>`。通过 `gateway.auth.token` 或 `OPENCLAW_GATEWAY_TOKEN` 设置。                                                                                              |
| `gateway.auth.mode="password"`      | `Authorization: Bearer <password>`。通过 `gateway.auth.password` 或 `OPENCLAW_GATEWAY_PASSWORD` 设置。                                                                                     |
| `gateway.auth.mode="trusted-proxy"` | 通过已配置的身份感知代理进行路由；它会注入所需的身份头。对于同主机回环代理，需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。 |
| `gateway.auth.mode="none"`          | 不需要身份验证头（仅限私有入口）。                                                                                                                                         |

注意：

- 对于 `trusted-proxy` 网关，绕过代理的同主机调用可以直接回退到 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。任何 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 头部证据都会使请求继续走受信任代理路径。
- 如果配置了 `gateway.auth.rateLimit` 并且过多的身份验证尝试失败，则端点将返回带有 `Retry-After` 标头的 `429`。

## <a id="when-to-use-this-endpoint"></a> 何时使用此端点

- 当您的集成只是同一网关的另一个 operator/client 表面时， 更喜欢这种方式，而不是添加新的内置通道。
- 对于直接连接到远程网关的本机移动客户端，首选 [WebChat](/web/webchat) 或 [Gateway Protocol](/gateway/protocol) 与配对设备 bootstrap/device-token 流，因此设备不需要共享 HTTP token/password.
- 如果要集成一个具有自己用户、房间、Webhook 投递或出站传输的外部消息网络，则应改为构建一个频道插件。参见 [构建插件](/plugins/building-plugins)。

## <a id="agent-first-model-contract"></a> 代理优先模型契约

OpenClaw 将 OpenAI `model` 字段视为 **agent 目标**，而不是原始提供商模型 ID。

| `model` 值                                | 路由到                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `openclaw`                                   | 已配置的默认代理                                                                                                 |
| `openclaw/default`                           | 配置的默认代理（稳定的别名；即使真实的默认代理 ID 在环境之间发生变化，也可以安全地进行硬编码） |
| `openclaw/<agentId>` 或 `openclaw:<agentId>` | 特定代理                                                                                                           |
| `agent:<agentId>`                            | 特定代理（兼容别名）                                                                                     |

可选请求头：

| 请求头                                          | 作用                                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-openclaw-model: <provider/model-or-bare-id>` | 覆盖所选代理的后端模型。使用共享密钥 bearer 的调用方可以直接使用；具有身份的调用方（trusted-proxy，或带有 `x-openclaw-scopes` 的私有无认证入口）需要 `operator.admin`，否则返回 `403 missing scope: operator.admin`。 |
| `x-openclaw-agent-id: <agentId>`                | 用于代理选择的兼容性覆盖。                                                                                                                                                                                                                                 |
| `x-openclaw-session-key: <sessionKey>`          | 显式会话路由。如果使用保留的内部命名空间（`subagent:`、`cron:`、`acp:`），则会被 `400 invalid_request_error` 拒绝。                                                                                                                                |
| `x-openclaw-message-channel: <channel>`         | 设置通道感知 prompts/policies. 的综合入口通道上下文                                                                                                                                                                                              |

`/v1/models` 列出顶层代理目标（`openclaw`、`openclaw/default`、`openclaw/<agentId>`），而不是后端提供方模型，也不是子代理；子代理会保留在内部执行拓扑中。如果省略 `x-openclaw-model`，所选代理将使用其正常配置的模型运行。

模型列表和详细信息端点需要 `operator.read` 或包含它的范围，因为它们公开全局代理目标清单。

`/v1/embeddings` 使用相同的代理目标 `model` id。发送 `x-openclaw-model`（来自共享秘密调用者，或带有 `operator.admin` 的身份承载调用者）以选择特定的嵌入模型；否则，请求将使用所选代理的正常嵌入设置。

嵌入模型覆盖保留在代理配置的嵌入提供程序中。公认的提供商前缀必须与该提供商匹配；其他包含斜杠的值（例如 `library/bge-m3` 或 `hf:org/model`）仍然是完整的模型 ID。这也适用于显式配置的嵌入模型名称。

## <a id="session-behavior"></a> 会话行为

默认情况下，端点按请求为 **无状态**（每次调用都会生成新的会话密钥）。

如果请求包含 OpenAI `user` 字符串，网关会从中导出稳定的会话密钥，以便重复的呼叫可以共享代理会话。对于自定义应用程序，每个对话线程重复使用相同的 `user` 值；避免帐户级标识符，除非您希望多个 conversations/devices 共享一个 OpenClaw 会话。仅当您需要跨多个 clients/threads 进行显式路由控制时才使用 `x-openclaw-session-key`，并使用应用程序拥有的密钥来避免上述保留的命名空间。

如果该会话已存档，非流式传输请求将返回 HTTP `409` 和 `invalid_request_error` 以及在 Control UI 中恢复它的指导。流请求在流中报告相同的错误。在重试之前取消存档会话；被拒绝的请求保留其存档状态和历史记录。

### <a id="explicit-incognito-session-continuation"></a> 显式隐身会话继续

显式选择或继续与 `x-openclaw-session-key` 的隐身对话（`sessionKey` 覆盖）需要有效的 `operator.admin` 权限。此规则遵循权限，而不是入口：它拒绝没有 owner/admin 权限的可信代理调用者和明确将 `x-openclaw-scopes` 缩小到管理员以下（例如，`operator.write`）的私人 `gateway.auth.mode="none"` 调用者。任一接收到 HTTP `403` 并出现 `forbidden` 错误。此路径上的无配置文件私有无身份验证调用者将获得 `missing scope: operator.admin`；对于配置文件支持的调用方，响应会隐藏具有以下错误形状的私有目标（其中 `<sessionKey>` 是请求的覆盖）：

```json
{
  "error": {
    "message": "Incognito session \"<sessionKey>\" was not found.",
    "type": "forbidden"
  }
}
```

Owner/admin 呼叫者保持显式隐身会话继续。没有 `x-openclaw-scopes` 的私有无身份验证请求接收默认运算符范围，包括 `operator.admin`，因此被视为 owner/admin. 保留的内部命名空间覆盖（`subagent:`、`cron:`、`acp:`）仍然是单独的验证失败，并且仍然返回 HTTP `400` 与 `invalid_request_error`。

## <a id="request-limits"></a> 请求限制

`POST /v1/chat/completions`、`/v1/responses` 和 `/v1/embeddings` 的请求正文读取截止时间为 60 秒。超过该值的上传将返回 HTTP `408`。

该端点对每个请求正文设置了 20 MB 的内置限制、对最新用户消息中的 `image_url` 部分设置了 8 个的限制，以及对累计解码图像数据设置了 20 MB 的限制。图像来源策略仍可通过 `gateway.http.endpoints.chatCompletions.images` 进行配置：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: {
          enabled: true,
          images: {
            allowUrl: false,
            urlAllowlist: ["cdn.example.com", "*.assets.example.com"],
            allowedMimes: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/heic",
              "image/heif",
            ],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000,
          },
        },
      },
    },
  },
}
```

图像设置默认为：

| 键                   | 默认值                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `images.allowUrl`     | `false`（URL- 来源的 `image_url` 零件将被拒绝，除非启用） |
| `images.maxBytes`     | 每张图像 10MB                                                      |
| `images.maxRedirects` | 3                                                                   |
| `images.timeoutMs`    | 10s                                                                 |

HEIC/HEIF `image_url` 来源会被接受，并在通过共享的 OpenClaw 图像处理器（Rastermill）交付给提供方之前规范化为 JPEG；对于需要外部编解码器支持的格式，它会回退到系统转换器（`sips`、ImageMagick、GraphicsMagick 或 ffmpeg）。

安全说明：将主机名列入白名单不会绕过 private/internal IP 阻止。对于暴露在互联网上的网关，除了应用程序级防护之外，还应应用网络出口控制。请参阅 [Security](/gateway/security)。

## <a id="chat-tool-contract"></a> Chat 工具契约

`/v1/chat/completions` 支持与常见 OpenAI Chat 客户端兼容的函数工具子集。

### <a id="supported-request-fields"></a> 支持的请求字段

| 字段                      | 笔记                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tools`                    | `{ "type": "function", "function": { ... } }` 对象数组                                                                                                                               |
| `tool_choice`              | `"auto"`、`"none"`、`"required"`，或 `{ "type": "function", "function": { "name": "..." } }`                                                                                         |
| `messages[*].role: "tool"` | 后续轮次                                                                                                                                                                      |
| `messages[*].tool_call_id` | 将工具结果绑定回之前的工具调用                                                                                                                                        |
| `max_completion_tokens`    | 正安全整数；单次调用对完成 token 总数的上限（包括推理 token）。当前字段名；当两个字段都非 null 时使用。为 null 或省略时保持未设置。 |
| `max_tokens`               | 正安全整数；旧版别名。当 `max_completion_tokens` 非 null 时仍会进行验证，但在优先级处理时会被忽略。为 null 或省略时保持未设置。                   |
| `temperature`              | 0-2 的数值；尽力转发给上游提供方。超出范围时返回 `400 invalid_request_error`。                                                                            |
| `top_p`                    | 0-1 的数值；尽力转发。超出范围时返回 `400 invalid_request_error`。                                                                                                                |
| `frequency_penalty`        | -2.0 至 2.0 的数值；尽力转发。超出范围时返回 `400 invalid_request_error`。                                                                                                        |
| `presence_penalty`         | -2.0 至 2.0 的数值；尽力转发。超出范围时返回 `400 invalid_request_error`。                                                                                                        |
| `seed`                     | 整数；尽力转发。对于非整数值返回 `400 invalid_request_error`。                                                                                                            |
| `stop`                     | 字符串或最多 4 个字符串的数组；尽力而为。 `400 invalid_request_error` 用于超过 4 个序列或非 string/empty 条目。                                                  |

所有采样和 token 上限字段都走同一个 agent stream-param 通道，并会尽力转发：

- Token 上限：线路字段名称由提供商传输选择：`max_completion_tokens` 用于 OpenAI- 系列端点，`max_tokens` 用于仅接受旧名称（Mistral、Chutes）的提供商。
- `stop` 映射到传输层的 stop 字段：Chat Completions 后端使用 `stop`，Anthropic 使用 `stop_sequences`。OpenAI Responses API 没有 stop 参数，因此基于 Responses 的模型不会应用 `stop`。
- 基于 ChatGPT- 的 Codex 响应后端使用固定服务器端采样，并在请求到达之前剥离 `temperature`/`top_p`（以及 `max_output_tokens`、`metadata`、`prompt_cache_retention`、`service_tier`）后端。

### <a id="unsupported-variants"></a> 不支持的变体

以下情况返回 `400 invalid_request_error`：

- 非数组的 `tools`、非 function 工具条目，或缺少 `tool.function.name`
- `tool_choice` 变体，例如 `allowed_tools` 和 `custom`
- `tool_choice.function.name` 的值与所提供的工具不匹配

对于 `tool_choice: "required"` 和固定 function 的 `tool_choice`，端点会缩小可暴露给客户端的函数工具集合，指示运行时在响应前先调用一个客户端工具，并且如果 agent 响应中没有匹配的结构化客户端工具调用则报错。这适用于调用方提供的 HTTP `tools` 列表，而不是所有内部 OpenClaw agent 工具。

### <a id="non-streaming-tool-response-shape"></a> 非流式工具响应形状

当 agent 调用工具时，响应使用：

- `choices[0].finish_reason = "tool_calls"`
- `choices[0].message.tool_calls[]` 条目包含 `id`、`type: "function"`、`function.name`、`function.arguments`（JSON 字符串）
- 工具调用之前的助手说明，位于 `choices[0].message.content` 中（可能为空）

### <a id="streaming-tool-response-shape"></a> 流式工具响应形状

当 `stream: true` 时，工具调用会以增量 SSE 分块到达：先是一个初始的 assistant 角色 delta，然后是可选的 assistant 说明 deltas，接着是一个或多个携带工具身份和参数片段的 `delta.tool_calls` 分块，最后是一个带有 `finish_reason: "tool_calls"` 和 `data: [DONE]` 的最终分块。

对于必需的或功能固定的工具选择，散文将被保留，直到确认匹配的调用。当运行返回最终的散文时，流使用该文本而不是临时增量。

如果 `stream_options.include_usage=true` 且完整使用可用，则在 `[DONE]` 之前发出尾随使用块。没有最终统计的中断响应会忽略该块； JSON 响应也省略 `usage`。缺失或临时计数不会用零替换。

### <a id="tool-follow-up-loop"></a> 工具后续循环

接收到`tool_calls`后，执行所请求的功能并发送后续请求，该后续请求包括先前的辅助工具调用消息以及具有匹配的`tool_call_id`的一个或多个`role: "tool"`消息。这将继续相同的代理推理循环以产生最终答案。

如果工具未生成文本，则仍将其结果包含在 `content: ""` 或空文本部分数组中。空结果完成调用；省略结果则不然。旧版 `role: "function"` 结果可能会使用 `content: null` 及其函数 `name`。

## <a id="streaming-(sse)"></a><a id="streaming-sse"></a> 流式传输（SSE）

流式传输保留了单独的助理消息中的重复内容。如果无法通过附加到已发送的文本来表示更正，则流会报告错误，而不是以不一致的内容完成。

设置 `stream: true` 以接收服务器发送的事件：

- `Content-Type: text/event-stream`
- 每一行事件都是 `data: <json>`
- Stream 以 `data: [DONE]` 结尾

失败的代理运行（包括整个代理超时）会返回错误而不是成功完成。流式传输失败会发出 `error` 对象，后跟 `[DONE]`；部分内容可能已经到达客户端。超时设置遵循 [ 代理循环 ](/concepts/agent-loop#timeouts)。

断开 HTTP 客户端的连接将取消活动源 URL 下载和代理运行。如果在准备输入时发生取消，网关将释放该下载，并且不会启动另一个输入下载或代理运行。这适用于流式请求和非流式请求。如果网关本身在客户端仍处于连接状态时取消代理运行，则请求将失败并显示 `500 api_error` 和消息 `agent run was cancelled`，而不是作为提供程序超时。

## <a id="open-webui-quick-setup"></a> Open WebUI 快速设置

- 基础 URL: `http://127.0.0.1:18789/v1`
- Docker 在 macOS 底座 URL 上：`http://host.docker.internal:18789/v1`
- API 密钥: 你的 Gateway bearer token
- 模型: `openclaw/default`

预期行为：`GET /v1/models` 列出 `openclaw/default`，并且 Open WebUI 将其用作聊天模型 id。对于特定后端provider/model，设置代理的正常默认模型，或发送`x-openclaw-model`（共享秘密呼叫者，或带有`operator.admin`的身份承载呼叫者）。

快速冒烟测试：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，那么大多数 Open WebUI 配置都可以使用相同的 base URL 和 token 进行连接。

## <a id="examples"></a> 示例

某个应用对话的稳定 session：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "user": "conv:YOUR_CONVERSATION_ID",
    "messages": [{"role":"user","content":"Summarize my tasks for today"}]
  }'
```

在后续对话调用中重复使用相同的 `user` 值，以继续同一个 agent 会话。

非流式：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

流媒体：

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/gpt-5.4' \
  -d '{
    "model": "openclaw/research",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

列出模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

获取单个模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models/openclaw%2Fdefault \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

创建 embeddings：

```bash
curl -sS http://127.0.0.1:18789/v1/embeddings \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/text-embedding-3-small' \
  -d '{
    "model": "openclaw/default",
    "input": ["alpha", "beta"]
  }'
```

`/v1/embeddings` 支持将 `input` 作为字符串或字符串数组。

响应包括 `usage.prompt_tokens` 和 `usage.total_tokens`。本机 Ollama 和 OpenAI- 兼容嵌入提供程序传递其报告的令牌计数，包括零。没有使用情况报告的提供商在这两个字段中都返回零； OpenClaw 不估计代币使用情况。

提供程序失败使用与聊天完成相同的错误映射：缺少提供程序凭据返回 `401 authentication_error` 以及设置指南，未知提供程序模型返回 `404 invalid_request_error`，提供程序过载返回 `503 api_error`。凭证值已被编辑。意外故障返回 `500 api_error` 和 `internal error`。

如果提供程序清理失败，网关会记录重新启动指导并阻止对该 agent/provider 的进一步嵌入请求，直到重新启动。其他 agent/provider 示波器仍然可用。

对于支持它的模型，正整数 `dimensions` 请求输出向量大小。它会覆盖所选代理的活动 `memory.search.outputDimensionality`，并且在禁用内存搜索时也适用。省略它会保留配置的或提供程序的默认大小。

## <a id="related"></a> 相关内容

- [配置参考](/gateway/configuration-reference)
- [操作员范围](/gateway/operator-scopes)
- [OpenAI](/providers/openai)
