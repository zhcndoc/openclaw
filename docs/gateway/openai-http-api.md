---
summary: "从 Gateway 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - 期望在集成中使用 OpenAI Chat Completions 的工具
title: "OpenAI Chat Completions"
---

Gateway 可以提供一个小型的 OpenAI 兼容 Chat Completions 接口。它默认是**禁用**的。

启用后，它会在与 Gateway 相同的端口上提供以下所有接口（WS + HTTP 多路复用）：

| Method | Path                   |
| ------ | ---------------------- |
| POST   | `/v1/chat/completions` |
| GET    | `/v1/models`           |
| GET    | `/v1/models/{id}`      |
| POST   | `/v1/embeddings`       |
| POST   | `/v1/responses`        |

请求会作为一次正常的 Gateway agent 运行执行（与 `openclaw agent` 走同一代码路径），因此路由、权限和配置都与你的 Gateway 保持一致。

## 启用端点

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

## 安全边界（重要）

将此端点视为对网关实例的**完整运维访问**：

- 对此端点的有效 Gateway 令牌/密码等同于 owner/operator 凭据，而不是细粒度的按用户范围权限。
- 请求会通过与受信任运维操作相同的控制平面代理路径运行，因此如果目标代理的策略允许敏感工具，此端点也可以使用它们。
- 仅将其保留在 loopback/tailnet/private ingress 上。不要将其暴露到公共互联网。

认证矩阵：

| 认证路径                                                                                           | 行为                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway.auth.mode="token"` or `"password"` + `Authorization: Bearer ...`                            | 证明持有共享的 gateway 密钥。忽略任何 `x-openclaw-scopes` 标头，并恢复完整的默认运维范围集合：`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`。将聊天回合视为 owner-sender 回合。 |
| 受信任的带身份 HTTP（受信任代理认证，或私有入口上的 `gateway.auth.mode="none"`） | 在存在时遵守 `x-openclaw-scopes`；在不存在时回退到默认的运维范围集合。只有当调用方明确收窄范围并省略 `operator.admin` 时，才会失去 owner 语义。对于诸如 `x-openclaw-model` 之类的 owner 级控制，需要 `operator.admin`。                        |

参见 [Operator scopes](/gateway/operator-scopes)、[Security](/gateway/security) 和 [Remote access](/gateway/remote)。

## 身份验证

使用 Gateway 身份验证配置（有关该模式的详细信息，请参见 [受信任代理身份验证](/gateway/trusted-proxy-auth)）：

| 模式                                | 如何进行身份验证                                                                                                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway.auth.mode="token"`         | `Authorization: Bearer <token>`。通过 `gateway.auth.token` 或 `OPENCLAW_GATEWAY_TOKEN` 设置。                                                                                              |
| `gateway.auth.mode="password"`      | `Authorization: Bearer <password>`。通过 `gateway.auth.password` 或 `OPENCLAW_GATEWAY_PASSWORD` 设置。                                                                                     |
| `gateway.auth.mode="trusted-proxy"` | 通过已配置的身份感知代理进行路由；它会注入所需的身份头。对于同主机回环代理，需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。 |
| `gateway.auth.mode="none"`          | 不需要身份验证头（仅限私有入口）。                                                                                                                                         |

注意：

- 对于 `trusted-proxy` 网关，绕过代理的同主机调用可以直接回退到 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。任何 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 头部证据都会使请求继续走受信任代理路径。
- 如果配置了 `gateway.auth.rateLimit` 且身份验证失败次数过多，端点会返回带有 `Retry-After` 头的 `429`。

## 何时使用此端点

- 当你的集成只是同一网关的另一个运营者/客户端界面时，优先使用此方式，而不是添加一个新的内置频道。
- 对于直接连接到远程网关的原生移动客户端，优先使用 [WebChat](/web/webchat) 或带有配对设备引导/设备令牌流程的 [网关协议](/gateway/protocol)，这样设备就不需要共享的 HTTP 令牌/密码。
- 如果要集成一个具有自己用户、房间、Webhook 投递或出站传输的外部消息网络，则应改为构建一个频道插件。参见 [构建插件](/plugins/building-plugins)。

## Agent-first model contract

OpenClaw 将 OpenAI 的 `model` 字段视为**代理目标**，而不是原始提供方模型 ID。

| `model` 值                                  | 路由到                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `openclaw`                                   | 已配置的默认代理                                                                                                 |
| `openclaw/default`                           | 已配置的默认代理（稳定别名；即使真实默认代理 ID 在不同环境之间发生变化，也可安全硬编码） |
| `openclaw/<agentId>` or `openclaw:<agentId>` | 特定代理                                                                                                           |
| `agent:<agentId>`                            | 特定代理（兼容别名）                                                                                     |

可选请求头：

| Header                                          | 作用                                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-openclaw-model: <provider/model-or-bare-id>` | 覆盖所选代理的后端模型。使用共享密钥 bearer 的调用方可以直接使用；具有身份的调用方（trusted-proxy，或带有 `x-openclaw-scopes` 的私有无认证入口）需要 `operator.admin`，否则返回 `403 missing scope: operator.admin`。 |
| `x-openclaw-agent-id: <agentId>`                | 用于代理选择的兼容性覆盖。                                                                                                                                                                                                                                 |
| `x-openclaw-session-key: <sessionKey>`          | 显式会话路由。如果使用了保留的内部命名空间（`subagent:`、`cron:`、`acp:`），则会被拒绝，并返回 `400 invalid_request_error`。                                                                                                                                |
| `x-openclaw-message-channel: <channel>`         | 为支持频道感知的提示词/策略设置合成入口频道上下文。                                                                                                                                                                                              |

`/v1/models` 列出顶层代理目标（`openclaw`、`openclaw/default`、`openclaw/<agentId>`），而不是后端提供方模型，也不是子代理；子代理会保留在内部执行拓扑中。如果省略 `x-openclaw-model`，所选代理将使用其正常配置的模型运行。

`/v1/embeddings` 使用相同的代理目标 `model` ID。发送 `x-openclaw-model`（来自共享密钥调用方，或具有 `operator.admin` 的身份调用方）以选择特定的嵌入模型；否则请求将使用所选代理的正常嵌入设置。

## 会话行为

默认情况下，该端点**每个请求都是无状态的**（每次调用都会生成一个新的会话密钥）。

如果请求包含 OpenAI 的 `user` 字符串，网关会据此派生一个稳定的会话密钥，因此重复调用可以共享同一个代理会话。对于自定义应用，请在每个对话线程中复用相同的 `user` 值；除非你希望多个对话/设备共享一个 OpenClaw 会话，否则应避免使用账户级标识符。仅当你需要在多个客户端/线程之间进行显式路由控制时，才使用 `x-openclaw-session-key`，并使用由应用自行管理的密钥，以避开上述保留命名空间。

## 请求限制（配置）

默认值可在 `gateway.http.endpoints.chatCompletions` 下调整：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: {
          enabled: true,
          maxBodyBytes: 20000000,
          maxImageParts: 8,
          maxTotalImageBytes: 20000000,
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

省略时的默认值：

| 键                   | 默认值                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| `maxBodyBytes`       | 20MB                                                                         |
| `maxImageParts`      | 8（从最新用户消息中读取的 `image_url` 部分最大数量）                          |
| `maxTotalImageBytes` | 20MB（一次请求中所有 `image_url` 部分的累计解码字节数）                      |
| `images.allowUrl`    | `false`（除非启用，否则会拒绝来源于 URL 的 `image_url` 部分）               |
| `images.maxBytes`    | 每张图片 10MB                                                                |
| `images.maxRedirects`| 3                                                                            |
| `images.timeoutMs`   | 10秒                                                                         |

HEIC/HEIF `image_url` 来源会被接受，并在通过共享的 OpenClaw 图像处理器（Rastermill）交付给提供方之前规范化为 JPEG；对于需要外部编解码器支持的格式，它会回退到系统转换器（`sips`、ImageMagick、GraphicsMagick 或 ffmpeg）。

安全提示：将主机名加入允许列表并不会绕过对私有/内网 IP 的阻止。对于暴露在互联网的网关，除了应用层防护之外，还应配置网络出口控制。参见 [安全](/gateway/security)。

## Chat 工具契约

`/v1/chat/completions` 支持与常见 OpenAI Chat 客户端兼容的函数工具子集。

### 支持的请求字段

| 字段                       | 说明                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools`                    | `{ "type": "function", "function": { ... } }` 数组                                                                                        |
| `tool_choice`              | `"auto"`、`"none"`、`"required"`，或 `{ "type": "function", "function": { "name": "..." } }`                                                  |
| `messages[*].role: "tool"` | 后续轮次                                                                                                                               |
| `messages[*].tool_call_id` | 将工具结果绑定回先前的工具调用                                                                                                 |
| `max_completion_tokens`    | 数值；每次调用的总 completion tokens 上限（包括 reasoning tokens）。当前字段名；当同时发送它和 `max_tokens` 时使用。 |
| `max_tokens`               | 数值；旧版别名，当 `max_completion_tokens` 也存在时会被忽略。                                                                   |
| `temperature`              | 数值 0-2；尽力而为，转发给上游提供方。超出范围时返回 `400 invalid_request_error`。                                     |
| `top_p`                    | 数值 0-1；尽力而为。超出范围时返回 `400 invalid_request_error`。                                                                         |
| `frequency_penalty`         | 数值 -2.0 到 2.0；尽力而为。超出范围时返回 `400 invalid_request_error`。                                                                 |
| `presence_penalty`         | 数值 -2.0 到 2.0；尽力而为。超出范围时返回 `400 invalid_request_error`。                                                                 |
| `seed`                     | 整数；尽力而为。非整数值会返回 `400 invalid_request_error`。                                                                     |
| `stop`                     | 字符串或最多 4 个字符串的数组；尽力而为。超过 4 个序列或包含非字符串/空条目时返回 `400 invalid_request_error`。           |

所有采样和 token 上限字段都走同一个 agent stream-param 通道，并会尽力转发：

- Token 上限：线上的字段名由提供方传输层决定：OpenAI 系列端点使用 `max_completion_tokens`，仅接受旧名称的提供方（Mistral、Chutes）使用 `max_tokens`。
- `stop` 映射到传输层的 stop 字段：Chat Completions 后端使用 `stop`，Anthropic 使用 `stop_sequences`。OpenAI Responses API 没有 stop 参数，因此基于 Responses 的模型不会应用 `stop`。
- 基于 ChatGPT 的 Codex Responses 后端使用固定的服务端采样，并在请求到达该后端之前剥离 `temperature`/`top_p`（以及 `max_output_tokens`、`metadata`、`prompt_cache_retention`、`service_tier`）。

### 不支持的变体

以下情况返回 `400 invalid_request_error`：

- 非数组的 `tools`、非 function 工具条目，或缺少 `tool.function.name`
- `tool_choice` 变体，例如 `allowed_tools` 和 `custom`
- `tool_choice.function.name` 的值与所提供的工具不匹配

对于 `tool_choice: "required"` 和固定 function 的 `tool_choice`，端点会缩小可暴露给客户端的函数工具集合，指示运行时在响应前先调用一个客户端工具，并且如果 agent 响应中没有匹配的结构化客户端工具调用则报错。这适用于调用方提供的 HTTP `tools` 列表，而不是所有内部 OpenClaw agent 工具。

### 非流式工具响应形状

当 agent 调用工具时，响应使用：

- `choices[0].finish_reason = "tool_calls"`
- `choices[0].message.tool_calls[]` 条目包含 `id`、`type: "function"`、`function.name`、`function.arguments`（JSON 字符串）
- 工具调用之前的助手说明，位于 `choices[0].message.content` 中（可能为空）

### 流式工具响应形状

当 `stream: true` 时，工具调用会以增量 SSE 分块到达：先是一个初始的 assistant 角色 delta，然后是可选的 assistant 说明 deltas，接着是一个或多个携带工具身份和参数片段的 `delta.tool_calls` 分块，最后是一个带有 `finish_reason: "tool_calls"` 和 `data: [DONE]` 的最终分块。

如果 `stream_options.include_usage=true`，则会在 `[DONE]` 之前发出一个尾随 usage 分块。

### 工具后续循环

在收到 `tool_calls` 后，执行所请求的函数，并发送一个后续请求，其中包含先前的 assistant 工具调用消息，以及一个或多个带有匹配 `tool_call_id` 的 `role: "tool"` 消息。这会继续同一个 agent 推理循环，以生成最终答案。

## 流式传输（SSE）

设置 `stream: true` 以接收服务器发送事件：

- `Content-Type: text/event-stream`
- 每一行事件都是 `data: <json>`
- 流在 `data: [DONE]` 时结束

## Open WebUI 快速设置

- 基础 URL: `http://127.0.0.1:18789/v1`
- macOS 上 Docker 的基础 URL: `http://host.docker.internal:18789/v1`
- API 密钥: 你的 Gateway bearer token
- 模型: `openclaw/default`

预期行为: `GET /v1/models` 列出 `openclaw/default`，并且 Open WebUI 将其用作聊天模型 id。对于特定的后端提供方/模型，请设置 agent 的常规默认模型，或发送 `x-openclaw-model`（共享密钥调用方，或具有 `operator.admin` 的带身份调用方）。

快速烟雾测试:

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，那么大多数 Open WebUI 配置都可以使用相同的 base URL 和 token 进行连接。

## 示例

某个应用对话的稳定 session：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "user": "conv:YOUR_CONVERSATION_ID",
    "messages": [{"role":"user","content":"请总结我今天的任务"}]
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
    "messages": [{"role":"user","content":"你好"}]
  }'
```

流式：

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/gpt-5.4' \
  -d '{
    "model": "openclaw/research",
    "stream": true,
    "messages": [{"role":"user","content":"你好"}]
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

## 相关

- [配置参考](/gateway/configuration-reference)
- [Operator 范围](/gateway/operator-scopes)
- [OpenAI](/providers/openai)
