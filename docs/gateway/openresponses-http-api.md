---
summary: "从网关暴露一个与 OpenResponses 兼容的 /v1/responses HTTP 端点"
read_when:
  - 集成支持 OpenResponses API 的客户端
  - 你需要基于条目的输入、客户端工具调用或 SSE 事件
title: "OpenResponses API"
---

OpenClaw 的网关可以提供一个与 OpenResponses 兼容的 `POST /v1/responses` 端点。

此端点默认**禁用**。请先在配置中启用它。

- `POST /v1/responses`
- 与网关相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/responses`

在底层，请求会作为一次正常的网关代理运行来执行（与 `openclaw agent` 使用相同代码路径），因此路由/权限/配置都与你的网关一致。

## 身份验证、安全性和路由

运行行为与 [OpenAI Chat Completions](/gateway/openai-http-api) 一致：

- 使用对应的网关 HTTP 认证路径：
  - 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
  - 可信代理认证（`gateway.auth.mode="trusted-proxy"`）：来自已配置可信代理来源的身份感知代理头；同主机回环代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`
  - 私有入口开放认证（`gateway.auth.mode="none"`）：不需要认证头
- 将该端点视为对网关实例的完整操作员访问
- 对于共享密钥认证模式（`token` 和 `password`），忽略更窄的 bearer 声明 `x-openclaw-scopes` 值，并恢复正常的完整操作员默认值
- 对于可信、携带身份的 HTTP 模式（例如可信代理认证或 `gateway.auth.mode="none"`），在存在时遵循 `x-openclaw-scopes`，否则回退到正常的操作员默认权限集
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 来选择代理
- 当你想覆盖所选代理的后端模型时，使用 `x-openclaw-model`
- 当你想显式进行会话路由时，使用 `x-openclaw-session-key`
- 当你想使用非默认的合成入口通道上下文时，使用 `x-openclaw-message-channel`

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明持有共享的网关操作员密钥
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员权限集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的聊天轮次视为 owner-sender 轮次
- 可信、携带身份的 HTTP 模式（例如可信代理认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 当头部存在时，遵循 `x-openclaw-scopes`
  - 当头部缺失时，回退到正常的操作员默认权限集
  - 只有当调用方显式缩小权限范围并省略 `operator.admin` 时，才会失去 owner 语义

通过 `gateway.http.endpoints.responses.enabled` 启用或禁用此端点。

同样的兼容性范围还包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

关于代理目标模型、`openclaw/default`、embedding 透传以及后端模型覆盖如何协同工作的权威说明，请参见 [OpenAI Chat Completions](/gateway/openai-http-api#agent-first-model-contract) 和 [模型列表与代理路由](/gateway/openai-http-api#model-list-and-agent-routing)。

## 会话行为

默认情况下，该端点对每个请求都是**无状态的**（每次调用都会生成一个新的会话键）。

如果请求包含 OpenResponses 的 `user` 字符串，网关会根据它派生一个稳定的会话键，
因此重复调用可以共享同一个代理会话。

## 请求形状（支持）

请求遵循带有基于条目的输入的 OpenResponses API。目前支持：

- `input`：字符串或条目对象数组。
- `instructions`：合并到系统提示中。
- `tools`：客户端工具定义（函数工具）。
- `tool_choice`：过滤或强制客户端工具。
- `stream`：启用 SSE 流式传输。
- `max_output_tokens`：尽力而为的输出限制（取决于提供方）。
- `user`：稳定的会话路由。

已接受但**当前忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

支持：

- `previous_response_id`：当请求保持在同一代理/用户/请求会话范围内时，OpenClaw 会重用较早的响应会话。

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

使用 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果代理决定调用某个工具，响应会返回一个 `function_call` 输出条目。
然后你需要发送后续请求并带上 `function_call_output` 来继续这一轮对话。

## 图片（`input_image`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大大小（当前）：10MB。

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

允许的 MIME 类型（当前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

最大大小（当前）：5MB。

当前行为：

- 文件内容会被解码并添加到**系统提示**中，而不是用户消息中，
  因此它是临时的（不会持久化到会话历史中）。
- 在添加之前，解码后的文件文本会被包装为**不受信任的外部内容**，
  因此文件字节会被视为数据，而不是受信任的指令。
- 注入的块会使用明确的边界标记，例如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，并包含一行
  `Source: External` 元数据。
- 这个文件输入路径故意省略较长的 `SECURITY NOTICE:` 横幅，以
  保留提示词预算；边界标记和元数据仍然保留。
- PDF 会先提取文本。如果找到的文本很少，则会将前几页
  光栅化为图像并传递给模型，而注入的文件块会使用占位符
  `[PDF content rendered to images]`。

PDF 解析由捆绑的 `document-extract` 插件提供，该插件使用
适用于 Node 的 `pdfjs-dist` 旧版构建（无 worker）。现代版 PDF.js 构建
需要浏览器 worker/DOM 全局对象，因此在网关中不会使用它。

URL 抓取默认值：

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8`（每个请求中基于 URL 的 `input_file` + `input_image` 总部分数）
- 请求会受到保护（DNS 解析、阻止私有 IP、重定向上限、超时）。
- 支持按输入类型设置可选主机名允许列表（`files.urlAllowlist`、`images.urlAllowlist`）。
  - 精确主机：`"cdn.example.com"`
  - 通配符子域：`"*.assets.example.com"`（不匹配 apex）
  - 为空或省略允许列表表示不限制主机名允许列表。
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
            maxChars: 200000,
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

- `maxBodyBytes`: 20MB
- `maxUrlParts`: 8
- `files.maxBytes`: 5MB
- `files.maxChars`: 200k
- `files.maxRedirects`: 3
- `files.timeoutMs`: 10s
- `files.pdf.maxPages`: 4
- `files.pdf.maxPixels`: 4,000,000
- `files.pdf.minTextChars`: 200
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10s
- HEIC/HEIF `input_image` 来源会被接受，并在提供给模型前标准化为 JPEG。

安全说明：

- URL 允许列表会在抓取之前以及重定向跳转过程中执行。
- 将主机名加入允许列表并不会绕过私有/内部 IP 阻止。
- 对于面向互联网暴露的网关，除了应用层防护外，还应 लागू 网络出口控制。
  参见 [安全](/gateway/security)。

## 流式传输（SSE）

设置 `stream: true` 以接收 Server-Sent Events（SSE）：

- `Content-Type: text/event-stream`
- 每条事件行的格式为 `event: <type>` 和 `data: <json>`
- 流结束时发送 `data: [DONE]`

当前发出的事件类型：

- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed`（发生错误时）

## 用法

`usage` 会在底层提供方报告 token 计数时填充。
OpenClaw 会在这些计数器到达下游状态/会话表面之前，规范化常见的 OpenAI 风格别名，包括
`input_tokens` / `output_tokens`
以及 `prompt_tokens` / `completion_tokens`。

## 错误

错误使用如下 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：

- `401` 缺少/无效的认证
- `400` 无效的请求体
- `405` 错误的方法

## 示例

非流式：

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

流式：

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
- [OpenAI](/providers/openai)
