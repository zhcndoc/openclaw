---
summary: "从 Gateway 暴露一个兼容 OpenResponses 的 /v1/responses HTTP 端点"
read_when:
  - 集成使用 OpenResponses API 的客户端时
  - 需要基于项的输入、客户端工具调用或 SSE 事件时
title: "OpenResponses API"
---

# OpenResponses API（HTTP）

OpenClaw 的 Gateway 可以提供一个兼容 OpenResponses 的 `POST /v1/responses` 端点。

该端点 **默认情况下是禁用的**，需先在配置中启用。

- `POST /v1/responses`
- 与 Gateway 相同端口（WS 和 HTTP 复用）：`http://<gateway-host>:<port>/v1/responses`

底层，所有请求都作为普通 Gateway 代理运行（与执行 `openclaw agent` 相同代码路径），因此路由/权限/配置与您的 Gateway 保持一致。

## 认证

使用 Gateway 的认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

说明：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token` （或环境变量 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password` （或环境变量 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果配置了 `gateway.auth.rateLimit` 且认证失败次数过多，端点将返回 `429` 并带有 `Retry-After`。

## 安全边界（重要）

将此端点视为 Gateway 实例的 **完全操作员访问** 接口。

- 此处的 HTTP bearer 认证不是狭义的单用户权限模型。
- 有效的 Gateway 令牌/密码用于此端点时，应视作拥有者/操作员凭证。
- 请求通过与受信操作员操作相同的控制平面代理路径执行。
- 如果目标代理策略允许敏感工具，该端点可以调用这些工具。
- 应将此端点仅限于环回接口、Tailnet 或私有入口，切勿直接暴露于公网。

参阅 [安全](/gateway/security) 及 [远程访问](/gateway/remote)。

## 选择代理

无须自定义头部：在 OpenResponses 的 `model` 字段中编码代理 ID：

- `model: "openclaw:<agentId>"` （示例：`"openclaw:main"`、`"openclaw:beta"`）
- `model: "agent:<agentId>"`（别名）

或通过 Header 直接指定 OpenClaw 代理：

- `x-openclaw-agent-id: <agentId>` （默认：`main`）

高级用法：

- `x-openclaw-session-key: <sessionKey>` 用于完全控制会话路由。

## 启用该端点

设置 `gateway.http.endpoints.responses.enabled` 为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: true },
      },
    },
  },
}
```

## 禁用该端点

设置 `gateway.http.endpoints.responses.enabled` 为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: false },
      },
    },
  },
}
```

## 会话行为

默认情况下，该端点**对每个请求无状态**（每次调用都会生成新的会话密钥）。

如果请求中包含 OpenResponses 的 `user` 字符串，Gateway 会基于它派生稳定的会话密钥，方便多次调用共享同一代理会话。

## 请求格式（支持）

请求遵循 OpenResponses API，基于项的输入。当前支持：

- `input`：字符串或项对象数组。
- `instructions`：合并进系统提示。
- `tools`：客户端工具定义（函数工具）。
- `tool_choice`：过滤或指定客户端工具。
- `stream`：启用 SSE 流式输出。
- `max_output_tokens`：尽力限制输出令牌数（依提供方而定）。
- `user`：稳定会话路由。

接受但**当前忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `previous_response_id`
- `truncation`

## 项（输入）

### `message`

角色包含：`system`、`developer`、`user`、`assistant`。

- `system` 与 `developer` 内容附加到系统提示中。
- 最近的 `user` 或 `function_call_output` 项成为“当前消息”。
- 之前的用户/助手消息作为上下文历史包含。

### `function_call_output`（基于回合的工具）

将工具结果发送回模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 和 `item_reference`

为兼容模式被接受，但生成提示时忽略。

## 工具（客户端函数工具）

工具定义例：

```json
tools: [{ type: "function", function: { name, description?, parameters? } }]
```

代理决定调用工具时，响应返回 `function_call` 输出项。

之后您可发送后续请求，包含 `function_call_output` 继续对话。

## 图片（`input_image`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

支持的 MIME 类型（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。

最大尺寸（当前）：10MB。

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

支持的 MIME 类型（当前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、`application/json`、`application/pdf`。

最大尺寸（当前）：5MB。

当前行为说明：

- 文件内容解码后会添加进**系统提示**，而非用户消息，  
  因此内容是瞬时的（不会写入会话历史）。
- PDF 会被解析成文本。如果文本内容很少，将把前几页转为光栅图像传给模型。

PDF 解析使用适合 Node 的 `pdfjs-dist` 旧版构建（不使用 worker）。现代的 PDF.js 构建依赖浏览器 worker/DOM，全局对象，因此不在 Gateway 中使用。

URL 拉取默认：

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8` （每请求基于 URL 的 `input_file` + `input_image` 总数限制）
- 请求有保护机制（DNS 解析、私有 IP 阻断、重定向限制、超时限制）。
- 每个输入类型支持可选的主机名允入白名单（`files.urlAllowlist`、`images.urlAllowlist`）。
  - 精确主机名示例：`"cdn.example.com"`
  - 通配符子域示例：`"*.assets.example.com"`（不匹配顶级域名）

## 文件与图片限制（配置）

可在 `gateway.http.endpoints.responses` 下调整默认值：

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

未配置时默认值为：

- `maxBodyBytes`: 20MB
- `maxUrlParts`: 8
- `files.maxBytes`: 5MB
- `files.maxChars`: 200k
- `files.maxRedirects`: 3
- `files.timeoutMs`: 10秒
- `files.pdf.maxPages`: 4
- `files.pdf.maxPixels`: 400万像素
- `files.pdf.minTextChars`: 200
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10秒
- HEIC/HEIF `input_image` 源被接受，且在传递给提供方前转换成 JPEG 格式。

安全提示：

- URL 允许列表在拉取和重定向跳转时都会生效。
- 允许某个主机名不能绕过私有/内部 IP 阻断。
- 对于暴露于互联网的 Gateway，除了应用层保护，还应使用网络出口控制。  
  详情见 [安全](/gateway/security)。

## 流式传输（SSE）

设置 `stream: true` 可接收服务器发送事件（SSE）：

- `Content-Type: text/event-stream`
- 每条事件包含 `event: <type>` 和 `data: <json>`
- 流结束时发送 `data: [DONE]`

当前可能触发的事件类型：

- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed`（出错时）

## 使用率

当底层提供商报告令牌计数时，`usage` 字段会被填充。

## 错误

错误以 JSON 对象返回，如：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：

- `401` 缺失/无效认证
- `400` 请求体无效
- `405` 请求方法错误

## 示例

非流式示例：

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

流式示例：

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
