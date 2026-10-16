---
summary: "从网关公开 OpenResponses 兼容 /v1/responses HTTP 端点"
read_when:
  - "与支持 OpenResponses API 的客户端集成"
  - "你需要基于项的输入、客户端工具调用或 SSE 事件"
title: "OpenResponses API"
---

网关可以提供一个兼容 OpenResponses 的 `POST /v1/responses` 端点。它**默认禁用**，并与网关共享同一个端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/responses`。

请求作为正常网关代理运行（与 `openclaw agent` 相同的代码路径）运行，因此路由、权限和配置与您的网关匹配。

使用 `gateway.http.endpoints.responses.enabled` 启用或禁用。启用后，同一兼容性表面还服务于 `GET /v1/models`、`GET /v1/models/{id}` 和 `POST /v1/embeddings`。

`POST /v1/chat/completions` 与 `gateway.http.endpoints.chatCompletions.enabled` 单独启用。请参阅 [OpenAI 聊天 Completions](/gateway/openai-http-api)。

## <a id="authentication%2C-security%2C-and-routing"></a><a id="authentication-security-and-routing"></a> 身份验证、安全性和路由

运行行为与 [OpenAI Chat Completions](/gateway/openai-http-api) 一致：

- Auth path matches `gateway.auth.mode`: shared-secret (`token`/`password`) uses `Authorization: Bearer <token-or-password>`; trusted-proxy uses identity-aware proxy headers (same-host loopback proxies need `gateway.auth.trustedProxy.allowLoopback = true`, with a same-host direct fallback via `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` when no `Forwarded`/`X-Forwarded-*`/`X-Real-IP` header is present); `none` on private ingress needs no auth header. See [受信任代理认证](/gateway/trusted-proxy-auth)。
- 将该端点视为对网关实例的完整运维访问权限。
- 共享密钥认证模式会忽略更窄的 bearer 声明的 `x-openclaw-scopes`，并恢复完整的默认运维权限范围集合：`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`。此端点上的聊天轮次会被视为 owner-sender 轮次。
- 受信任的、携带身份的 HTTP 模式（trusted-proxy，或 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会予以尊重，否则回退到运维默认权限范围集合。只有当调用方显式缩小权限范围并省略 `operator.admin` 时，owner 语义才会丢失。
- 使用 `model: "openclaw"`、`"openclaw/default"`、`"openclaw/<agentId>"`，或 `x-openclaw-agent-id` 标头来选择 agent。
- 使用 `x-openclaw-model` 覆盖所选 agent 的后端模型（在携带身份的认证路径上需要 `operator.admin`）。
- 使用 `x-openclaw-session-key` 进行显式会话路由（如果使用保留的命名空间，则会被 `400 invalid_request_error` 拒绝：`subagent:`、`cron:`、`acp:`）。
- 使用 `x-openclaw-message-channel` 指定非默认的合成入口通道上下文。

有关代理目标模型、`openclaw/default`、嵌入传递和后端模型覆盖的共享说明，请参阅 [OpenAI 聊天 Completions](/gateway/openai-http-api#agent-first-model-contract)。

另请参见 [Operator scopes](/gateway/operator-scopes) 和 [Security](/gateway/security)。

## <a id="session-behavior"></a> 会话行为

默认情况下，端点按请求为 **无状态**（每次调用都会生成新的会话密钥）。

如果路由会话已存档，非流式请求将返回 HTTP `409` 和 `invalid_request_error` 以及在 Control UI 中恢复它的指导。流请求在流中报告相同的错误。在重试之前取消存档会话；被拒绝的请求保留其存档状态和历史记录。

如果请求包含 OpenResponses 的 `user` 字符串，Gateway 会根据它派生出一个稳定的会话键，以便重复调用可以共享同一个代理会话。

当请求停留在相同的 agent/user/requested-session 范围内（由身份验证主题、代理 ID 和 `x-openclaw-session-key` 匹配）时，`previous_response_id` 会重用先前响应的会话。

连续映射在共享状态数据库的核心键控存储（`core:openresponses`，命名空间 `response-sessions`）中网关重新启动后仍可保存长达 30 天，上限为网关上最新的 5,000 个响应。这与默认会话维护期限和计数相匹配；它不会延长基础会话或脚本的生命周期。映射仅包含 response/session 标识符、身份验证主体（安装密钥承载 HMAC 或经过验证的代理身份）、代理和请求的会话范围以及存储管理的时间戳。不会复制响应内容，也不需要单独的表或架构迁移。键控存储在查找时立即拒绝过期映射，并在后续写入该命名空间时分批删除过期行。空闲网关不运行插件状态到期扫描；即使在删除行之前，过期的映射仍然不可用。如果连续性持久性在成功运行后失败，端点将返回 HTTP `500` 或流 `response.failed`，而不是报告其响应 ID 无法继续的成功。

未知、已过期、已驱逐或超出范围的 `previous_response_id` 返回与 `invalid_request_error` 相同的 HTTP `400`，包括 `stream: true` 时。要恢复，请重新发送完整的输入历史记录并省略 `previous_response_id`；网关绝不会默默地为未解决的延续开始新的对话。旧网关退出后，无法恢复在此存储更改之前发出的响应。

隐身响应永远不会创建连续映射。当隐身会话处于活动状态时，使用相同的 `x-openclaw-session-key` 显式地继续它们；使用他们的响应 ID 返回与未知 ID 相同的 `400`。

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

## <a id="request-shape"></a> 请求格式

| 字段                                                            | 支持                                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `input`                                                          | 字符串或条目对象数组。                                                                                               |
| `instructions`                                                   | 合并到系统提示中。                                                                                                 |
| `tools`                                                          | 客户端工具定义（函数工具）。                                                                                      |
| `tool_choice`                                                    | `"auto"`、`"none"`、`"required"`，或 `{ "type": "function", "name": "..." }`，用于筛选或强制使用客户端工具。                |
| `stream`                                                         | 启用 SSE 流式传输。                                                                                                         |
| `max_output_tokens`                                              | 尽力而为的输出上限（取决于提供方）。                                                                                 |
| `temperature`                                                    | 尽力采样温度。被基于 ChatGPT- 的 Codex 响应后端忽略，该后端使用固定服务器端采样。 |
| `top_p`                                                          | 尽力而为的核采样。与 `temperature` 一样，Codex Responses 也有同样的注意事项。                                                    |
| `user`                                                           | 稳定的会话路由。                                                                                                        |
| `previous_response_id`                                           | 会话连续性（见上文）。                                                                                                |
| `max_tool_calls`, `reasoning`, `metadata`, `store`, `truncation` | 已接受，但当前被忽略。                                                                                                |

## <a id="items-(input)"></a><a id="items-input"></a> 条目（input）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 会追加到系统提示中。
- 最近的 `user` 或 `function_call_output` 项会成为“当前消息”。
- 更早的 user/assistant 消息会作为上下文历史包含进来。

### <a id="function_call_output-(turn-based-tools)"></a><a id="function_call_output-turn-based-tools"></a> `function_call_output`（基于轮次的工具）

将工具结果发送回模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### <a id="reasoning-and-item_reference"></a> `reasoning` 和 `item_reference`

为兼容 schema 而接受，但在构建提示时会被忽略。

## <a id="tools-(client-side-function-tools)"></a><a id="tools-client-side-function-tools"></a> 工具（客户端侧函数工具）

通过 `tools: [{ type: "function", name, description?, parameters? }]` 提供工具。

如果代理调用了工具，响应会返回一个 `function_call` 输出项。发送后续请求时使用 `function_call_output` 以继续该轮对话。

如果工具未生成文本，则返回 `output: ""` 及其 `call_id`。空结果仍然完成该工具调用，并且可以是延续中唯一的新输入项。

管理自己历史记录的客户端可以将 `response.output` 附加到 `input`，然后附加新用户消息或 `function_call_output` 项目。保持返回的助手元数据和函数调用 ID、名称和参数不变。或者，提供 `previous_response_id` 并且仅提供新的输入项目。

对于 `tool_choice: "required"` 和功能固定的 `tool_choice`，端点缩小了公开的客户端功能工具集，指示运行时在响应之前调用客户端工具，如果不包含匹配的结构化客户端工具调用（与 `/v1/chat/completions` 合约匹配），则拒绝轮流。非流式请求返回 `502` 和 `api_error`；流请求发出 `response.failed` 事件。

## <a id="images-(input_image)"></a><a id="images-input_image"></a> 图像（`input_image`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（默认）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。最大大小（默认）：10MB。

## <a id="files-(input_file)"></a><a id="files-input_file"></a> 文件（`input_file`）

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

- 从其他非类型化字节推断出的文本保留其检测到的编码，包括 UTF-16 和 Windows-1252。声明的文本字符集仍然受支持。
- 文件内容会被解码并添加到**系统提示词**中，而不是用户消息中，因此它是临时的（不会保存在会话历史中）。
- 解码的文件文本在添加之前被包装为 **不受信任的外部内容**，因此文件字节被视为数据，而不是受信任的指令。注入的块使用显式边界标记（`<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`）和 `Source: External` 元数据行。它故意省略了一行数据边界注释以保留即时预算；边界标记和元数据仍然适用。
- 首先解析 PDF 的文本。如果发现的文本很少，则第一页将被光栅化为图像并传递给模型，并且注入的文件块使用占位符 `[PDF content rendered to images]`。
- 当页面、文本或图像限制导致提取部分时，注入的文件块以不受信任的文件内容边界之外的有界 `[Partial document: ...]` 标记开始。

PDF 解析由捆绑的 `document-extract` 插件提供，该插件使用 `clawpdf` 及其打包的 PDFium WebAssembly 运行时来进行文本提取和页面渲染。

URL 抓取默认值：

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`：`8`（根据请求，基于 URL- 的 `input_file` + `input_image` 零件总数）
- 请求受保护（DNS 解析、私有 IP 阻止、重定向上限、超时）。
- 每种输入类型都支持可选的主机名允许列表（`files.urlAllowlist`、`images.urlAllowlist`）：精确主机（`"cdn.example.com"`）或通配符子域（`"*.assets.example.com"`，不匹配根域）。空的或省略的允许列表表示不限制主机名允许列表。
- 要完全禁用基于 URL- 的获取，请设置 `files.allowUrl: false` and/or `images.allowUrl: false`。

## <a id="file-%2B-image-limits"></a><a id="file-+-image-limits"></a> 文件+图像限制

端点使用内置的 20 MB 请求正文限制和 60 秒正文读取截止时间。超过截止时间的上传返回 HTTP `408`。文件和图像源策略在 `gateway.http.endpoints.responses` 下仍然可配置：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
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

| 键                      | 默认值   |
| ------------------------ | --------- |
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

安全说明：URL 允许列表在提取之前和重定向跃点上强制执行。将主机名列入白名单不会绕过 private/internal IP 阻止。对于暴露在互联网上的网关，除了应用程序级防护之外，还应应用网络出口控制。请参阅 [Security](/gateway/security)。

## <a id="streaming-(sse)"></a><a id="streaming-sse"></a> 流式传输（SSE）

流式传输保留了单独的助理消息中的重复内容。如果无法通过附加到已发送的文本来表示更正，则流会发出 `response.failed` 而不是以不一致的内容完成。

设置 `stream: true` 以接收服务器发送的事件：

- `Content-Type: text/event-stream`
- 每条事件行的格式为 `event: <type>` 和 `data: <json>`
- Stream 以 `data: [DONE]` 结尾

当前发出的事件类型：`response.created`、`response.in_progress`、`response.output_item.added`、`response.content_part.added`、`response.output_text.delta`、`response.output_text.done`、`response.content_part.done`、`response.output_item.done`、`response.completed`、 `response.incomplete`（产出预算截断）、`response.failed`（错误）。

失败的代理运行（包括整个代理超时）会返回失败的响应。流式传输失败会发出 `response.failed`，后跟 `[DONE]`；部分内容可能已经到达客户端。超时设置遵循 [ 代理循环 ](/concepts/agent-loop#timeouts)。

由于代理达到其输出令牌预算而结束的回复将返回 `status: "incomplete"` 和 `incomplete_details: { "reason": "max_output_tokens" }`，并且其最终消息项携带 `status: "incomplete"`。流在终端 `response.incomplete` 事件上发出这些字段，因此按事件类型调度的客户端也会观察到截断。这反映了 `/v1/chat/completions` 上的 `finish_reason: "length"` 投影。

断开连接HTTP客户端取消活动源-URL下载并运行代理。如果在准备输入时发生取消，网关将释放该下载，并且不会启动另一个输入下载或代理运行。这适用于流式请求和非流式请求。如果网关本身在客户端仍处于连接状态时取消代理运行，则请求将返回失败的响应（HTTP `500`当不流式传输时）和消息`agent run was cancelled`，而不是提供者超时。

## <a id="usage"></a> 用法

当底层提供商报告令牌计数时，将填充 `usage`。 OpenClaw 在这些计数器到达下游 status/session 表面（包括 `input_tokens` / `output_tokens` 和 `prompt_tokens` / `completion_tokens`）之前对常见的 OpenAI-style 别名进行标准化。

如果响应在完全使用到达之前结束，则 JSON 响应和终端流资源将省略 `usage`，而不是呈现零或临时计数作为完成。流完成不依赖于使用报告的到达。

## <a id="errors"></a> 错误

错误使用如下 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：`400` 无效的请求正文、`401` missing/invalid 身份验证、`403` 缺少运算符范围、`405` 方法错误、`429` 失败的身份验证尝试次数过多（使用 `Retry-After`）。

## <a id="examples"></a> 示例

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

流媒体：

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

## <a id="related"></a> 相关内容

- [OpenAI 聊天完成](/gateway/openai-http-api)
- [操作员范围](/gateway/operator-scopes)
- [OpenAI](/providers/openai)
