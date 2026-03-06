---
title: 出站会话镜像重构（问题 #1520）
description: 跟踪出站会话镜像重构的笔记、决策、测试和待办事项。
summary: "将出站发送镜像到目标频道会话的重构笔记"
read_when:
  - 处理出站转录/会话镜像行为时
  - 调试发送/消息工具路径的 sessionKey 推导时
---

# 出站会话镜像重构（问题 #1520）

## 状态

- 进行中。
- 核心和插件频道路由已更新以支持出站镜像。
- 网关发送现在在缺少 sessionKey 时推导目标会话。

## 背景

出站发送消息之前镜像到了_当前_代理会话（工具会话密钥），而非目标频道会话。入站路由使用频道/对等会话密钥，因此出站响应落在了错误的会话中，初次联系目标常缺少会话条目。

## 目标

- 将出站消息镜像到目标频道会话密钥。
- 缺少时在出站时创建会话条目。
- 保持线程/主题范围与入站会话密钥一致。
- 兼顾核心频道及捆绑扩展。

## 实现概要

- 新的出站会话路由助手：
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` 使用 `buildAgentSessionKey`（dmScope + identityLinks）构建目标 sessionKey。
  - `ensureOutboundSessionEntry` 通过 `recordSessionMetaFromInbound` 写入最小 `MsgContext`。
- `runMessageAction`（发送）推导目标 sessionKey 并传递给 `executeSendAction` 以支持镜像。
- `message-tool` 不再直接镜像；仅从当前会话密钥中解析 agentId。
- 插件发送路径通过使用推导的 sessionKey 的 `appendAssistantMessageToSessionTranscript` 来镜像。
- 网关发送在无提供 sessionKey 时推导目标会话密钥（默认代理），并确保会话条目。

## 线程/主题处理

- Slack：replyTo/threadId -> `resolveThreadSessionKeys`（后缀）。
- Discord：threadId/replyTo -> 使用 `useSuffix=false` 的 `resolveThreadSessionKeys` 匹配入站（线程频道 ID 已经限定会话范围）。
- Telegram：主题 ID 通过 `buildTelegramGroupPeerId` 映射为 `chatId:topic:<id>`。

## 涉及扩展

- Matrix、MS Teams、Mattermost、BlueBubbles、Nextcloud Talk、Zalo、Zalo Personal、Nostr、Tlon。
- 注意事项：
  - Mattermost 目标现在去除 `@` 以实现 DM 会话密钥路由。
  - Zalo Personal 对一对一目标使用 DM 对等类型（仅当存在 `group:` 才是群组）。
  - BlueBubbles 群组目标去除 `chat_*` 前缀以匹配入站会话密钥。
  - Slack 自动线程镜像对频道 ID 不区分大小写。
  - 网关发送在镜像前将提供的 sessionKey 转为小写。

## 决策

- **网关发送会话推导**：如果提供 `sessionKey`，则使用它。若省略，则从目标+默认代理推导 sessionKey 并镜像至该处。
- **会话条目创建**：始终使用带有 `Provider/From/To/ChatType/AccountId/Originating*`，与入站格式对齐的 `recordSessionMetaFromInbound`。
- **目标规范化**：出站路由优先使用解析后的目标（`resolveChannelTarget` 后）。
- **会话密钥大小写规范**：写入及迁移时统一转为小写。

## 新增/更新的测试

- `src/infra/outbound/outbound.test.ts`
  - Slack 线程会话密钥。
  - Telegram 主题会话密钥。
  - 使用 Discord 的 dmScope identityLinks。
- `src/agents/tools/message-tool.test.ts`
  - 从会话密钥推导 agentId（不传递 sessionKey）。
- `src/gateway/server-methods/send.test.ts`
  - 在省略时推导会话密钥并创建会话条目。

## 待办事项 / 后续跟进

- 语音通话插件使用自定义 `voice:<phone>` 会话密钥。出站映射尚未标准化；若消息工具应支持语音通话发送，需添加显式映射。
- 确认是否有外部插件使用超出捆绑集的非标准 `From/To` 格式。

## 涉及文件

- `src/infra/outbound/outbound-session.ts`
- `src/infra/outbound/outbound-send-service.ts`
- `src/infra/outbound/message-action-runner.ts`
- `src/agents/tools/message-tool.ts`
- `src/gateway/server-methods/send.ts`
- 测试文件：
  - `src/infra/outbound/outbound.test.ts`
  - `src/agents/tools/message-tool.test.ts`
  - `src/gateway/server-methods/send.test.ts`
