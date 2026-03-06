---
summary: "计划：添加 OpenResponses /v1/responses 端点并优雅地弃用聊天完成接口"
read_when:
  - 设计或实现 `/v1/responses` 网关支持时
  - 规划从聊天完成兼容性迁移时
owner: "openclaw"
status: "draft"
last_updated: "2026-01-19"
title: "OpenResponses 网关集成计划"
---

# OpenResponses 网关集成计划

## 背景

OpenClaw 网关当前在 `/v1/chat/completions` 暴露了一个最小化的兼容 OpenAI 的聊天完成端点（参见 [OpenAI Chat Completions](/gateway/openai-http-api)）。

Open Responses 是基于 OpenAI Responses API 的一个开放推理标准。它设计用于智能代理工作流，使用基于条目的输入和语义流事件。OpenResponses 规范定义了 `/v1/responses`，而非 `/v1/chat/completions`。

## 目标

- 新增符合 OpenResponses 语义的 `/v1/responses` 端点。
- 保持聊天完成作为兼容层，方便禁用及最终移除。
- 使用独立且可复用的 schema 实现标准化的验证与解析。

## 非目标

- 第一阶段实现 OpenResponses 的全部功能（如图片、文件、托管工具）。
- 替换内部代理执行逻辑或工具编排。
- 第一阶段更改现有的 `/v1/chat/completions` 行为。

## 研究总结

来源：OpenResponses OpenAPI，OpenResponses 规范网站，及 Hugging Face 博客文章。

提取的重点：

- `POST /v1/responses` 接受 `CreateResponseBody` 字段，比如 `model`、`input`（字符串或 `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens` 和 `max_tool_calls`。
- `ItemParam` 是一个判别联合类型，包括：
  - 角色为 `system`、`developer`、`user`、`assistant` 的 `message` 条目
  - `function_call` 和 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功响应返回一个 `ResponseResource`，包含 `object: "response"`、`status` 和 `output` 条目。
- 流式使用的语义事件包括：
  - `response.created`、`response.in_progress`、`response.completed`、`response.failed`
  - `response.output_item.added`、`response.output_item.done`
  - `response.content_part.added`、`response.content_part.done`
  - `response.output_text.delta`、`response.output_text.done`
- 规范要求：
  - `Content-Type: text/event-stream`
  - `event:` 必须匹配 JSON 中的 `type` 字段
  - 终结事件必须是字面值 `[DONE]`
- 推理条目可能包含 `content`、`encrypted_content` 和 `summary`。
- Hugging Face 示例请求中包含可选头 `OpenResponses-Version: latest`。

## 拟议架构

- 新增 `src/gateway/open-responses.schema.ts`，仅包含 Zod schemas（无网关依赖）。
- 新增 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）处理 `/v1/responses`。
- 保持 `src/gateway/openai-http.ts` 不变，作为遗留兼容适配器。
- 新增配置项 `gateway.http.endpoints.responses.enabled`（默认 `false`）。
- 保持 `gateway.http.endpoints.chatCompletions.enabled` 独立，允许两个端点分别开关。
- 启动时若启用聊天完成，发出遗留状态警告。

## 聊天完成弃用路径

- 保持严格的模块边界：响应与聊天完成不共享 schema 类型。
- 聊天完成通过配置启用，方便禁用无需代码变动。
- `/v1/responses` 稳定后，文档中将聊天完成标记为遗留。
- 可选未来步骤：请求映射聊天完成到响应处理器，简化移除过程。

## 第一阶段支持子集

- 接受 `input` 字符串或含消息角色和 `function_call_output` 的 `ItemParam[]`。
- 将系统和开发者消息提取到 `extraSystemPrompt`。
- 选取最近的 `user` 或 `function_call_output` 作为当前代理运行消息。
- 不支持的内容部件（如图片/文件）返回 `invalid_request_error`。
- 返回单条助理消息，包含 `output_text` 内容。
- 返回 `usage`，但所有值为零，直到完成 Token 计费连接。

## 验证策略（无 SDK）

- 实现 Zod schemas，并支持以下子集：
  - `CreateResponseBody`
  - `ItemParam` 及消息内容部分联合类型
  - `ResponseResource`
  - 网关使用的流事件结构
- 将 schemas 保持在单一独立模块，避免漂移并便于未来代码生成。

## 流式实现（第一阶段）

- 使用带有 `event:` 和 `data:` 的 SSE 行。
- 必需序列（最小可用版本）：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta`（可重复）
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 测试与验证计划

- 增加 `/v1/responses` 端到端测试覆盖：
  - 认证要求
  - 非流响应结构
  - 流事件顺序及终结 `[DONE]`
  - 带请求头和 `user` 的会话路由
- 保持 `src/gateway/openai-http.test.ts` 不变。
- 手动使用 curl 请求 `/v1/responses` 带 `stream: true`，验证事件顺序和终结 `[DONE]`。

## 文档更新（后续）

- 新增 `/v1/responses` 使用和示例文档页面。
- 更新 `/gateway/openai-http-api`，增加遗留提示及指向 `/v1/responses`。
