---
summary: "从 Gateway 暴露一个兼容 OpenResponses 的 /v1/responses HTTP 端点"
read_when:
  - 集成使用 OpenResponses API 的客户端时
  - 需要基于项的输入、客户端工具调用或 SSE 事件时
title: "OpenResponses API"
---

OpenClaw 的 Gateway 可以提供一个与 OpenResponses 兼容的 `POST /v1/responses` 端点。

该端点 **默认情况下是禁用的**，需先在配置中启用。

- `POST /v1/responses`
- 与 Gateway 相同端口（WS 和 HTTP 复用）：`http://<gateway-host>:<port>/v1/responses`

底层，所有请求都作为普通 Gateway 代理运行（与执行 `openclaw agent` 相同代码路径），因此路由/权限/配置与您的 Gateway 保持一致。

## 认证、安全和路由

操作行为与 [OpenAI Chat Completions](/gateway/openai-http-api) 相匹配：

- 使用匹配的 Gateway HTTP 认证路径：
  - 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
  - 可信代理认证（`gateway.auth.mode="trusted-proxy"`）：来自配置的非回环可信代理源的身份感知代理标头
  - 私有入口开放认证（`gateway.auth.mode="none"`）：无认证标头
- 将该端点视为网关实例的完全操作员访问权限
- 对于共享密钥认证模式（`token` 和 `password`），忽略较窄的 bearer 声明的 `x-openclaw-scopes` 值并恢复正常的完全操作员默认值
- 对于可信身份承载的 HTTP 模式（例如可信代理认证或 `gateway.auth.mode="none"`），当存在时尊重 `x-openclaw-scopes`，否则回退到正常的操作员默认范围集
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 选择代理
- 当您想覆盖所选代理的后端模型时使用 `x-openclaw-model`
- 使用 `x-openclaw-session-key` 进行显式会话路由
- 当您想要非默认的合成入口通道上下文时使用 `x-openclaw-message-channel`

认证矩阵：

- `gateway.auth.mode="token"` or `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享网关操作员密钥
  - 忽略较窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的聊天回合视为所有者发送者回合
- 可信身份承载的 HTTP 模式（例如可信代理认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 当标头存在时尊重 `x-openclaw-scopes`
  - 当标头缺失时回退到正常的操作员默认范围集
  - 仅当调用者显式缩小范围并省略 `operator.admin` 时才失去所有者语义

使用 `gateway.http.endpoints.responses.enabled` 启用或禁用此端点。

相同的兼容性表层还包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

关于代理目标模型、`openclaw/default`、嵌入透传和后端模型覆盖如何协同工作的规范说明，请参阅 [OpenAI Chat Completions](/gateway/openai-http-api#agent-first-model-contract) 和 [模型列表与代理路由](/gateway/openai-http-api#model-list-and-agent-routing)。

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
- `truncation`

支持：

- `previous_response_id`：当请求保持在相同的代理/用户/请求会话范围内时，OpenClaw 会复用之前的响应会话。

## 项目（输入）

### `message`

角色包括：`system`、`developer`、`user`、`assistant`。

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

### `reasoning` 与 `item_reference`

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

- 文件内容被解码并添加到 **系统提示** 中，而不是用户消息，
  因此它是临时的（不会持久化在会话历史中）。
- 解码后的文件文本在添加前被包装为 **不可信的外部内容**，
  因此文件字节被视为数据，而不是可信指令。
- 注入的块使用显式边界标记，例如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` 并包含一个
  `Source: External` 元数据行。
- 此文件输入路径故意省略了长的 `SECURITY NOTICE:` 横幅，以
  保留提示预算；边界标记和元数据仍然保留。
- PDF 首先解析文本。如果发现文本很少，前几页会被
  光栅化为图像并传递给模型，注入的文件块使用
  占位符 `[PDF content rendered to images]`。

PDF 解析由捆绑的 `document-extract` 插件提供，该插件使用
适用于 Node 的 `pdfjs-dist` 旧版构建（无 worker）。现代 PDF.js 构建
需要浏览器 worker/DOM 全局对象，因此 Gateway 中不使用它。

URL 拉取默认：

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8` (每个请求基于 URL 的 `input_file` + `input_image` 部分总数)
- 请求受保护（DNS 解析、私有 IP 阻断、重定向限制、超时）。
- 每种输入类型支持可选的主机名白名单（`files.urlAllowlist`、`images.urlAllowlist`）。
  - 精确主机：`"cdn.example.com"`
  - 通配符子域：`"*.assets.example.com"`（不匹配根域）
  - 空或未设置的白名单表示没有主机名白名单限制。
- 要完全禁用基于 URL 的拉取，请设置 `files.allowUrl: false` 和/或 `images.allowUrl: false`。

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
- `files.timeoutMs`: 10 秒
- `files.pdf.maxPages`: 4
- `files.pdf.maxPixels`: 400 万像素
- `files.pdf.minTextChars`: 200
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10 秒
- HEIC/HEIF `input_image` 源被接受，且在传递给提供方前转换成 JPEG 格式。

安全提示：

- URL 白名单在拉取和重定向跳转时都会生效。
- 允许某个主机名不能绕过私有/内部 IP 阻断。
- 对于暴露于互联网的 Gateway，除了应用层保护，还应使用网络出口控制。详情见 [安全](/gateway/security)。

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

当底层提供商报告令牌计数时，`usage` 会被填充。
OpenClaw 在这些计数器到达下游状态/会话表面之前规范化常见的 OpenAI 风格别名，包括 `input_tokens` / `output_tokens`
和 `prompt_tokens` / `completion_tokens`。

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

## 相关

- [OpenAI chat completions](/gateway/openai-http-api)
- [OpenAI](/providers/openai)
