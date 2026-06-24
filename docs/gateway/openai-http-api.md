---
summary: "从 Gateway 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - 期望在集成中使用 OpenAI Chat Completions 的工具
title: "OpenAI Chat Completions"
---

OpenClaw 的 Gateway 可以提供一个小型的、兼容 OpenAI 的 Chat Completions 端点。

此端点默认**禁用**。请先在配置中启用它。

- `POST /v1/chat/completions`
- 与 Gateway 相同的端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/v1/chat/completions`

当启用了 Gateway 的 OpenAI 兼容 HTTP 接口后，它还会提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底层，请求会作为一次普通的 Gateway agent 运行来执行（与 `openclaw agent` 使用相同的代码路径），因此路由/权限/配置会与你的 Gateway 保持一致。

## 身份验证

使用 Gateway 的身份验证配置。

常见的 HTTP 认证路径：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：
  `Authorization: Bearer <token-or-password>`
- 可信、携带身份的 HTTP 认证（`gateway.auth.mode="trusted-proxy"`）：
  通过已配置的、可识别身份的代理进行路由，并让它注入所需的身份头
- 私有入口开放认证（`gateway.auth.mode="none"`）：
  不需要认证头

注意：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 当 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自
  已配置的受信任代理来源；同主机 loopback 代理需要显式设置
  `gateway.auth.trustedProxy.allowLoopback = true`。
- 本机同主机的内部调用如果绕过代理，可以使用
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 作为本地直接
  回退方案。任何 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 头的证据
  都会让请求保持在 trusted-proxy 路径上。
- 如果配置了 `gateway.auth.rateLimit` 且出现过多认证失败，端点会返回带有 `Retry-After` 的 `429`。

## 安全边界（重要）

请将此端点视为该 gateway 实例的**完整运维者访问**入口。

- 这里的 HTTP bearer 认证不是细粒度的按用户范围模型。
- 用于此端点的有效 Gateway token/password 应视为 owner/operator 凭据。
- 通过该端点的请求会走与受信任运维操作相同的控制平面 agent 路径。
- 此端点没有单独的非 owner/按用户工具边界；一旦调用方通过了 Gateway 认证，OpenClaw 就会将其视为该 gateway 的受信任运维者。
- 对于共享密钥认证模式（`token` 和 `password`），即使调用方发送了更窄的 `x-openclaw-scopes` 头，端点也会恢复正常的完整运维者默认值。
- 可信、携带身份的 HTTP 模式（例如 trusted proxy 认证或 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会予以尊重，否则回退到正常的运维者默认 scope 集。
- 如果目标 agent 策略允许敏感工具，此端点可以使用它们。
- 请仅在 loopback/tailnet/private ingress 上保留此端点；不要将其直接暴露给公共互联网。

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明持有共享的 gateway 运维者密钥
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认运维者 scope 集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的 chat turns 视为 owner-sender turns
- trusted identity-bearing HTTP modes (for example trusted proxy auth, or `gateway.auth.mode="none"` on private ingress)
  - authenticate some outer trusted identity or deployment boundary
  - honor `x-openclaw-scopes` when the header is present
  - fall back to the normal operator default scope set when the header is absent
  - only lose owner semantics when the caller explicitly narrows scopes and omits `operator.admin`
  - require `operator.admin` for owner-level request controls such as `x-openclaw-model`

参见 [Security](/gateway/security) 和 [Remote access](/gateway/remote)。

## 何时使用此端点

当你要把工具或受信任的应用侧后端集成到现有 gateway，并且可以安全地持有 gateway 运维者凭据时，请使用 `/v1/chat/completions`。

- 当你的集成只是同一个 gateway 的另一个运维者/客户端表面时，优先使用它，而不是新增一个内建通道。
- 对于直接连接远程 gateway 的原生移动客户端，优先使用 [WebChat](/web/webchat) 或 [Gateway Protocol](/gateway/protocol)，并实现配对设备启动/设备令牌流程，这样设备就不需要共享 HTTP token/password。
- 如果你是在把外部消息网络与其自身的用户、房间、webhook 投递或出站传输集成起来，那么应改为构建一个通道插件。参见 [Building plugins](/plugins/building-plugins)。

## 以 Agent 为先的模型契约

OpenClaw 将 OpenAI 的 `model` 字段视为一个**agent 目标**，而不是原始的 provider model id。

- `model: "openclaw"` 会路由到已配置的默认 agent。
- `model: "openclaw/default"` 也会路由到已配置的默认 agent。
- `model: "openclaw/<agentId>"` 会路由到指定的 agent。

可选请求头：

- `x-openclaw-model: <provider/model-or-bare-id>` 会覆盖所选 agent 的后端模型。共享密钥 bearer 调用方可以使用此头。身份携带型调用方，例如 trusted-proxy 或带有 `x-openclaw-scopes` 的私有免认证入口请求，需要 `operator.admin`；仅写权限的调用方会收到 `403 missing scope: operator.admin`。
- `x-openclaw-agent-id: <agentId>` 仍作为兼容性覆盖项受支持。
- `x-openclaw-session-key: <sessionKey>` 显式控制会话路由。该值不得使用保留的内部会话命名空间，例如 `subagent:`、`cron:` 或 `acp:`；这类请求会以 `400 invalid_request_error` 被拒绝。
- `x-openclaw-message-channel: <channel>` 为感知通道的提示词和策略设置合成的入口通道上下文。

仍接受的兼容别名：

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## 启用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设置为 `true`：

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

## 禁用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设置为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## 会话行为

默认情况下，此端点是**每次请求无状态**的（每次调用都会生成一个新的 session key）。

如果请求包含 OpenAI 的 `user` 字符串，Gateway 会据此派生一个稳定的 session key，因此重复调用可以共享同一个 agent 会话。

对于自定义应用，最安全的默认做法是在同一个对话线程中重复使用相同的 `user` 值。除非你明确希望多个对话或设备共享一个 OpenClaw 会话，否则不要使用账户级标识符。仅在你需要跨多个客户端或线程进行显式路由控制时使用 `x-openclaw-session-key`，并选择不以保留内部命名空间开头的应用自有键，例如 `subagent:`、`cron:` 或 `acp:`。

## 为什么这个接口很重要

对于自托管前端和工具来说，这是兼容性最高、收益最大的功能集合：

- 大多数 Open WebUI、LobeChat 和 LibreChat 配置都期望有 `/v1/models`。
- 许多 RAG 系统期望有 `/v1/embeddings`。
- 现有的 OpenAI 聊天客户端通常可以先从 `/v1/chat/completions` 开始。
- 越来越多更偏 agent 原生的客户端开始更喜欢 `/v1/responses`。

## 模型列表与 agent 路由

<AccordionGroup>
  <Accordion title="`/v1/models` 返回什么？">
    一个 OpenClaw 的 agent 目标列表。

    返回的 ids 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 条目。
    可直接将它们作为 OpenAI 的 `model` 值使用。

  </Accordion>
  <Accordion title="`/v1/models` 会列出 agents 还是子 agents？">
    它列出的是顶层 agent 目标，而不是后端 provider 模型，也不是子 agents。

    子 agents 仍然是内部执行拓扑，不会作为伪模型出现在列表中。

  </Accordion>
  <Accordion title="为什么包含 `openclaw/default`？">
    `openclaw/default` 是已配置默认 agent 的稳定别名。

    这意味着即使真实的默认 agent id 在不同环境之间发生变化，客户端也可以继续使用一个可预测的 id。

  </Accordion>
  <Accordion title="如何覆盖后端模型？">
    使用 `x-openclaw-model`。这是一个 owner 级别的覆盖项：它可与 Gateway 的共享密钥 bearer token/password 路径配合使用，并且在 trusted proxy auth 等带身份的 HTTP 路径上需要 `operator.admin`。

    示例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果省略它，所选 agent 会使用其正常配置的模型选择运行。

  </Accordion>
  <Accordion title="embeddings 如何适配这个契约？">
    `/v1/embeddings` 使用相同的 agent 目标 `model` ids。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    当你需要指定某个 embedding 模型时，请从共享密钥调用方，或带有 `operator.admin` 的身份携带型调用方发送 `x-openclaw-model`。
    如果没有该头，请求会透传到所选 agent 的正常 embedding 配置。

  </Accordion>
</AccordionGroup>

## 流式传输（SSE）

设置 `stream: true` 以接收 Server-Sent Events（SSE）：

- `Content-Type: text/event-stream`
- 每一条事件行都是 `data: <json>`
- 流结束时发送 `data: [DONE]`

## Chat 工具契约

`/v1/chat/completions` 支持与常见 OpenAI Chat 客户端兼容的函数工具子集。

### 支持的请求字段

- `tools`: array of `{ "type": "function", "function": { ... } }`
- `tool_choice`: `"auto"`, `"none"`, `"required"`, or `{ "type": "function", "function": { "name": "..." } }`
- `messages[*].role: "tool"` 后续轮次
- `messages[*].tool_call_id` 用于将工具结果绑定回先前的工具调用
- `max_completion_tokens`: number; 每次调用的总 completion token 上限（包含 reasoning token）。这是当前 OpenAI Chat Completions 的字段名；当同时发送 `max_completion_tokens` 和 `max_tokens` 时优先使用它。
- `max_tokens`: number; 为向后兼容而接受的旧别名。如果同时存在 `max_completion_tokens`，则会被忽略。
- `temperature`: number; 最佳努力地将采样温度通过 agent stream-param 通道转发给上游 provider。
- `top_p`: number; 最佳努力地将 nucleus sampling 通过 agent stream-param 通道转发给上游 provider。
- `frequency_penalty`: number; 最佳努力地将频率惩罚通过 agent stream-param 通道转发给上游 provider。校验范围：-2.0 到 2.0。超出范围时返回 `400 invalid_request_error`。
- `presence_penalty`: number; 最佳努力地将存在惩罚通过 agent stream-param 通道转发给上游 provider。校验范围：-2.0 到 2.0。超出范围时返回 `400 invalid_request_error`。
- `seed`: number (integer); 最佳努力地将 seed 通过 agent stream-param 通道转发给上游 provider。非整数值会返回 `400 invalid_request_error`。
- `stop`: string 或最多 4 个字符串的数组；最佳努力地将停止序列通过 agent stream-param 通道转发给上游 provider。超过 4 个序列或包含非字符串/空项时返回 `400 invalid_request_error`。

当设置了任一 token 上限字段时，该值会通过 agent stream-param 通道转发给上游 provider。发送给上游 provider 的实际 wire 字段名由 provider transport 决定：OpenAI 系列端点使用 `max_completion_tokens`，而只接受旧名称的 provider（例如 Mistral 和 Chutes）则使用 `max_tokens`。采样字段（`temperature`、`top_p`、`frequency_penalty`、`presence_penalty`、`seed`）遵循相同的 stream-param 通道；基于 ChatGPT 的 Codex Responses 后端会在服务端将它们剥离，因为它使用固定采样。`stop` 也走 stream-param 通道，并映射到 transport 的 stop 字段（Chat Completions 后端使用 `stop`，Anthropic 使用 `stop_sequences`）；OpenAI Responses API 没有 stop 参数，因此在基于 Responses 的模型上不会应用 `stop`。

### 不支持的变体

端点会针对不支持的工具变体返回 `400 invalid_request_error`，包括：

- 非数组 `tools`
- 非函数工具条目
- 缺少 `tool.function.name`
- `tool_choice` 变体，如 `allowed_tools` 和 `custom`
- 与所提供 `tools` 不匹配的 `tool_choice.function.name` 值

对于 `tool_choice: "required"` 和固定函数的 `tool_choice`，端点会缩小暴露给客户端的函数工具集，指示运行时在响应前调用一个客户端工具，并在 agent 响应未包含匹配的结构化客户端工具调用时返回错误。该契约适用于调用方提供的 HTTP `tools` 列表，而不是每一个内部 OpenClaw agent 工具。

### 非流式工具响应形状

当 agent 决定调用工具时，响应使用：

- `choices[0].finish_reason = "tool_calls"`
- `choices[0].message.tool_calls[]` 条目包含：
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments`（JSON 字符串）

工具调用之前的 assistant 评论会在 `choices[0].message.content` 中返回（可能为空）。

### 流式工具响应形状

当 `stream: true` 时，工具调用会以增量 SSE 分块形式发出：

- 初始 assistant role delta
- 可选的 assistant 评论 deltas
- 一个或多个携带工具身份和参数片段的 `delta.tool_calls` 分块
- 最终分块，`finish_reason: "tool_calls"`
- `data: [DONE]`

如果 `stream_options.include_usage=true`，则会在 `[DONE]` 之前发出一个尾随 usage 分块。

### 工具后续循环

在收到 `tool_calls` 后，客户端应执行请求的函数，并发送一条后续请求，其中包括：

- 先前的 assistant tool-call 消息
- 一条或多条 `role: "tool"` 消息，且 `tool_call_id` 匹配

这使 gateway agent 运行可以继续同一推理循环，并生成最终的 assistant 答案。

## Open WebUI 快速设置

用于基本的 Open WebUI 连接：

- Base URL: `http://127.0.0.1:18789/v1`
- macOS 上 Docker 的 Base URL: `http://host.docker.internal:18789/v1`
- API key: 你的 Gateway bearer token
- Model: `openclaw/default`

预期行为：

- `GET /v1/models` 应列出 `openclaw/default`
- Open WebUI 应使用 `openclaw/default` 作为聊天模型 id
- 如果你想为该 agent 指定特定的后端提供方/模型，请设置该 agent 的普通默认模型，或者由共享密钥调用方发送 `x-openclaw-model`，或由带有 `operator.admin` 身份的调用方发送该头

快速自检：

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

注意：

- `/v1/models` 返回的是 OpenClaw agent 目标，而不是原始提供方目录。
- `openclaw/default` 始终存在，因此在不同环境中都可以使用同一个稳定 id。
- 后端提供方/模型覆盖应放在 `x-openclaw-model` 中，而不是 OpenAI 的 `model` 字段中。在带身份的 HTTP auth 路径上，此头需要 `operator.admin`。
- `/v1/embeddings` 支持将 `input` 作为字符串或字符串数组。

## 相关

- [配置参考](/gateway/configuration-reference)
- [OpenAI](/providers/openai)
