---
summary: "从 Gateway 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - 集成期望 OpenAI Chat Completions 的工具
title: "OpenAI 聊天补全"
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
- 当 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自已配置的受信任代理来源；同主机回环代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 如果配置了 `gateway.auth.rateLimit` 且认证失败次数过多，端点会返回带有 `Retry-After` 的 `429`。

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
  - 将此端点上的聊天轮次视为 owner-sender 轮次
- 可信、携带身份的 HTTP 模式（例如 trusted proxy 认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 认证某个外层受信任身份或部署边界
  - 当头部存在时，尊重 `x-openclaw-scopes`
  - 当头部不存在时，回退到正常的运维者默认 scope 集
  - 只有当调用方显式缩窄 scopes 且省略 `operator.admin` 时，才会失去 owner 语义

参见 [Security](/gateway/security) 和 [Remote access](/gateway/remote)。

## 以 agent 为先的模型契约

OpenClaw 将 OpenAI 的 `model` 字段视为一个**agent 目标**，而不是原始的 provider model id。

- `model: "openclaw"` 会路由到已配置的默认 agent。
- `model: "openclaw/default"` 也会路由到已配置的默认 agent。
- `model: "openclaw/<agentId>"` 会路由到指定的 agent。

可选请求头：

- `x-openclaw-model: <provider/model-or-bare-id>` 为所选 agent 覆盖后端模型。
- `x-openclaw-agent-id: <agentId>` 仍然受支持，作为兼容性覆盖。
- `x-openclaw-session-key: <sessionKey>` 完全控制会话路由。
- `x-openclaw-message-channel: <channel>` 为感知 channel 的提示词和策略设置合成的入口 channel 上下文。

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
    使用 `x-openclaw-model`。

    示例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果省略它，所选 agent 会使用其正常配置的模型选择运行。

  </Accordion>
  <Accordion title="embeddings 如何适配这个契约？">
    `/v1/embeddings` 使用相同的 agent 目标 `model` ids。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    当你需要特定的 embedding 模型时，请将其放在 `x-openclaw-model` 中。
    如果没有该头，请求会传递到所选 agent 的正常 embedding 配置。

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

- `tools`: `{"type":"function","function":{...}}` 数组
- `tool_choice`: `"auto"`、`"none"`
- `messages[*].role: "tool"` 后续轮次
- `messages[*].tool_call_id` 用于将工具结果绑定回先前的工具调用
- `max_completion_tokens`: 数字；每次调用的总 completion token 上限（包括 reasoning tokens）。这是当前 OpenAI Chat Completions 的字段名；当同时发送 `max_completion_tokens` 和 `max_tokens` 时优先使用它。
- `max_tokens`: 数字；为向后兼容而接受的旧别名。当 `max_completion_tokens` 也存在时会被忽略。
- `temperature`: 数字；尽力而为的采样温度，通过 agent stream-param 通道转发给上游 provider。
- `top_p`: 数字；尽力而为的核采样，通过 agent stream-param 通道转发给上游 provider。

当任一 token 上限字段被设置时，该值会通过 agent stream-param 通道转发给上游 provider。发送给上游 provider 的实际 wire 字段名由 provider transport 决定：OpenAI 系列端点使用 `max_completion_tokens`，而只接受旧名称的 provider（例如 Mistral 和 Chutes）使用 `max_tokens`。采样字段（`temperature`、`top_p`）遵循相同的 stream-param 通道；基于 ChatGPT 的 Codex Responses 后端会在服务端将它们剥离，因为它使用固定采样。

### 不支持的变体

端点会针对不支持的工具变体返回 `400 invalid_request_error`，包括：

- 非数组 `tools`
- 非 function 的工具条目
- 缺少 `tool.function.name`
- `tool_choice` 变体，例如 `allowed_tools` 和 `custom`
- `tool_choice: "required"`（运行时尚未强制；在实现硬性强制后将支持）
- `tool_choice: { "type": "function", "function": { "name": "..." } }`（与 `required` 的理由相同）
- `tool_choice.function.name` 的值与提供的 `tools` 不匹配

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

- `GET /v1/models` 应该列出 `openclaw/default`
- Open WebUI 应使用 `openclaw/default` 作为聊天模型 id
- 如果你希望该 agent 使用特定的后端 provider/model，请设置该 agent 的正常默认模型，或发送 `x-openclaw-model`

快速自检：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，那么大多数 Open WebUI 配置都可以使用相同的 base URL 和 token 进行连接。

## 示例

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

流式：

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

注意：

- `/v1/models` 返回的是 OpenClaw agent 目标，而不是原始 provider 目录。
- `openclaw/default` 始终存在，因此同一个稳定 id 可以跨环境工作。
- 后端 provider/model 覆盖应放在 `x-openclaw-model` 中，而不是 OpenAI 的 `model` 字段里。
- `/v1/embeddings` 支持 `input` 为字符串或字符串数组。

## 相关

- [配置参考](/gateway/configuration-reference)
- [OpenAI](/providers/openai)
