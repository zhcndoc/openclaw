---
summary: "从网关暴露一个兼容 OpenResponses 的 `/v1/responses` HTTP 端点"
read_when:
  - 与支持 OpenResponses API 的客户端集成
  - 你需要基于项的输入、客户端工具调用或 SSE 事件
title: "OpenResponses API"
---

网关可以提供一个兼容 OpenResponses 的 `POST /v1/responses` 端点。它**默认禁用**，并与网关共享同一个端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/responses`。

请求会作为一次正常的网关 agent 运行执行（与 `openclaw agent` 使用相同的代码路径），因此路由、权限和配置都与你的网关一致。

可通过 `gateway.http.endpoints.responses.enabled` 启用或禁用。启用后，同一兼容接口还会提供 `GET /v1/models`、`GET /v1/models/{id}`、`POST /v1/embeddings` 和 `POST /v1/chat/completions`。

## 身份验证、安全性和路由

运行行为与 [OpenAI Chat Completions](/gateway/openai-http-api) 一致：

- Auth path matches `gateway.auth.mode`: shared-secret (`token`/`password`) uses `Authorization: Bearer <token-or-password>`; trusted-proxy uses identity-aware proxy headers (same-host loopback proxies need `gateway.auth.trustedProxy.allowLoopback = true`, with a same-host direct fallback via `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` when no `Forwarded`/`X-Forwarded-*`/`X-Real-IP` header is present); `none` on private ingress needs no auth header. See [受信任代理认证](/gateway/trusted-proxy-auth)。
- 将该端点视为对网关实例的完整运维访问权限。
- 共享密钥认证模式会忽略更窄的 bearer 声明的 `x-openclaw-scopes`，并恢复完整的默认运维权限范围集合：`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`。此端点上的聊天轮次会被视为 owner-sender 轮次。
- 受信任的、携带身份的 HTTP 模式（trusted-proxy，或 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会予以尊重，否则回退到运维默认权限范围集合。只有当调用方显式缩小权限范围并省略 `operator.admin` 时，owner 语义才会丢失。
- 使用 `model: "openclaw"`、`"openclaw/default"`、`"openclaw/<agentId>"`，或 `x-openclaw-agent-id` 标头来选择 agent。
- 使用 `x-openclaw-model` 覆盖所选 agent 的后端模型（在携带身份的认证路径上需要 `operator.admin`）。
- 使用 `x-openclaw-session-key` 进行显式会话路由（如果使用保留命名空间：`subagent:`、`cron:`、`acp:`，将返回 `400 invalid_request_error` 拒绝）。
- 使用 `x-openclaw-message-channel` 指定非默认的合成入口通道上下文。

关于 agent-target 模型、`openclaw/default`、嵌入透传以及后端模型覆盖的规范说明，请参见 [OpenAI Chat Completions](/gateway/openai-http-api#agent-first-model-contract)。

另请参见 [Operator scopes](/gateway/operator-scopes) 和 [Security](/gateway/security)。

## 会话行为

默认情况下，该端点对每个请求都是**无状态的**（每次调用都会生成一个新的会话键）。

如果请求包含 OpenResponses 的 `user` 字符串，Gateway 会根据它派生出一个稳定的会话键，以便重复调用可以共享同一个代理会话。

`previous_response_id` 会在请求保持在相同的代理/用户/请求会话范围内时重用之前响应的会话（通过 auth subject、agent id 和 `x-openclaw-session-key` 匹配）。

## 请求格式

| 字段                                                            | 支持                                                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `input`                                                          | 字符串或条目对象数组。                                                                                                           |
| `instructions`                                                   | 合并到系统提示中。                                                                                                             |
| `tools`                                                          | 客户端工具定义（函数工具）。                                                                                                   |
| `tool_choice`                                                    | `"auto"`、`"none"`、`"required"`，或 `{ "type": "function", "name": "..." }`，用于筛选或强制使用客户端工具。                    |
| `stream`                                                         | 启用 SSE 流式传输。                                                                                                           |
| `max_output_tokens`                                              | 尽力而为的输出上限（取决于提供方）。                                                                                           |
| `temperature`                                                    | 尽力而为的采样温度。被基于 ChatGPT 的 Codex Responses 后端忽略，该后端使用固定的服务器端采样。                                   |
| `top_p`                                                          | 尽力而为的核采样。与 `temperature` 一样，Codex Responses 也有同样的注意事项。                                                   |
| `user`                                                           | 稳定的会话路由。                                                                                                               |
| `previous_response_id`                                           | 会话连续性（见上文）。                                                                                                         |
| `max_tool_calls`, `reasoning`, `metadata`, `store`, `truncation` | 已接受，但当前被忽略。                                                                                                         |

## 条目（input）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 会追加到系统提示中。
- 最近的 `user` 或 `function_call_output` 项会成为“当前消息”。
- 更早的 user/assistant 消息会作为上下文历史包含进来。

### `function_call_output`（基于轮次的工具）

将工具结果发送回模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 和 `item_reference`

为兼容 schema 而接受，但在构建提示时会被忽略。

## 工具（客户端侧函数工具）

通过 `tools: [{ type: "function", name, description?, parameters? }]` 提供工具。

如果代理调用了工具，响应会返回一个 `function_call` 输出项。发送后续请求时使用 `function_call_output` 以继续该轮对话。

对于 `tool_choice: "required"` 和固定函数的 `tool_choice`，该端点会收窄可暴露的客户端函数工具集，指示运行时在响应前调用客户端工具，并在未包含匹配的结构化客户端工具调用时拒绝该轮请求，这与 `/v1/chat/completions` 合同一致。非流式请求会返回带有 `api_error` 的 `502`，流式请求会发出 `response.failed` 事件。

## 图像（`input_image`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（默认）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。最大大小（默认）：10MB。

## 文件（`input_file`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "hello.txt"
  }
}
```

允许的 MIME 类型（默认）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、`application/json`、`application/pdf`。最大大小（默认）：5MB。

当前行为：

- 文件内容会被解码并添加到**系统提示词**中，而不是用户消息中，因此它是临时的（不会保存在会话历史中）。
- 在添加之前，解码后的文件文本会被包装为**不受信任的外部内容**，因此文件字节会被当作数据而不是可信指令处理。注入的区块使用明确的边界标记（`<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`）以及一行 `Source: External` 元数据。为了保留提示词预算，它有意省略了较长的 `SECURITY NOTICE:` 横幅；不过边界标记和元数据仍然适用。
- PDF 会先进行文本解析。如果找到的文本很少，则会将前几页栅格化为图像并传递给模型，此时注入的文件区块会使用占位符 `[PDF content rendered to images]`。

PDF 解析由捆绑的 `document-extract` 插件提供，该插件使用 `clawpdf` 及其打包的 PDFium WebAssembly 运行时来进行文本提取和页面渲染。

URL 抓取默认值：

- `files.allowUrl`：`true`
- `images.allowUrl`：`true`
- `maxUrlParts`：`8`（每个请求中基于 URL 的 `input_file` + `input_image` 部分总数）
- 请求受保护（DNS 解析、私有 IP 阻止、重定向上限、超时）。
- 每种输入类型都支持可选的主机名允许列表（`files.urlAllowlist`、`images.urlAllowlist`）：精确主机（`"cdn.example.com"`）或通配符子域（`"*.assets.example.com"`，不匹配根域）。空的或省略的允许列表表示不限制主机名允许列表。
- 若要完全禁用基于 URL 的抓取，请设置 `files.allowUrl: false` 和/或 `images.allowUrl: false`。

## 文件 + 图片限制（配置）

默认值可在 `gateway.http.endpoints.responses` 下调整：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          maxUrlParts: 8,
          files: {
            allowUrl: true,
            urlAllowlist: ["cdn.example.com", "*.assets.example.com"],
            allowedMimes: [
              "text/plain",
              "text/markdown",
              "text/html",
              "text/csv",
              "application/json",
              "application/pdf",
            ],
            maxBytes: 5242880,
            maxChars: 60000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200,
            },
          },
          images: {
            allowUrl: true,
            urlAllowlist: ["images.example.com"],
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

| Key                      | Default   |
| ------------------------ | --------- |
| `maxBodyBytes`           | 20MB      |
| `maxUrlParts`            | 8         |
| `files.maxBytes`         | 5MB       |
| `files.maxChars`         | 60k       |
| `files.maxRedirects`     | 3         |
| `files.timeoutMs`        | 10s       |
| `files.pdf.maxPages`     | 4         |
| `files.pdf.maxPixels`    | 4,000,000 |
| `files.pdf.minTextChars` | 200       |
| `images.maxBytes`        | 10MB      |
| `images.maxRedirects`    | 3         |
| `images.timeoutMs`       | 10s       |

HEIC/HEIF `input_image` 源在通过共享的 OpenClaw 图像处理器（Rastermill）传递给提供方之前会被标准化为 JPEG；对于需要外部编解码器支持的格式，它会回退到系统转换器（`sips`、ImageMagick、GraphicsMagick 或 ffmpeg）。

安全提示：URL 白名单会在抓取前以及重定向跳转时强制执行。将主机名加入白名单并不会绕过对私有/内部 IP 的阻止。对于暴露在公网的网关，除了应用层防护之外，还应配置网络出站控制。另请参阅 [安全](/gateway/security)。

## 流式传输（SSE）

将 `stream: true` 设置为接收服务器发送事件（Server-Sent Events）：

- `Content-Type: text/event-stream`
- 每条事件行的格式为 `event: <type>` 和 `data: <json>`
- 流结束时发送 `data: [DONE]`

当前发出的事件类型：`response.created`、`response.in_progress`、`response.output_item.added`、`response.content_part.added`、`response.output_text.delta`、`response.output_text.done`、`response.content_part.done`、`response.output_item.done`、`response.completed`、`response.failed`（出错时）。

## 用法

`usage` 会在底层提供方报告 token 计数时被填充。OpenClaw 会在这些计数器到达下游状态/会话界面之前，规范化常见的 OpenAI 风格别名，包括 `input_tokens` / `output_tokens` 和 `prompt_tokens` / `completion_tokens`。

## 错误

错误使用如下 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：`400` 请求体无效，`401` 缺少/无效的认证，`403` 缺少 operator 作用域，`405` 方法错误，`429` 认证失败次数过多（带 `Retry-After`）。

## Example

Non-streaming:

```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "input": "hi"
  }'
```

Streaming:

```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "input": "hi"
  }'
```

## 相关内容

- [OpenAI chat completions](/gateway/openai-http-api)
- [Operator scopes](/gateway/operator-scopes)
- [OpenAI](/providers/openai)
