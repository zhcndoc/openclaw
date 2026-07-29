---
summary: "用于外部 CLI 的 RPC 适配器（signal-cli、imsg）和网关模式"
read_when:
  - 添加或更改外部 CLI 集成时
  - 调试 RPC 适配器（signal-cli、imsg）时
title: "RPC 适配器"
---

OpenClaw 通过 JSON-RPC 集成外部 CLI。目前使用两种模式。

## 模式 A：HTTP 守护进程（signal-cli）

- `signal-cli` 以守护进程方式运行，通过 HTTP 提供 JSON-RPC。
- 事件流使用 SSE（`/api/v1/events`）。
- 健康检查探针：`/api/v1/check`。
- 当 `channels.signal.transport.kind="managed-native"`（默认值）时，OpenClaw 负责生命周期管理。

有关设置和端点，请参见 [Signal](/channels/signal)。

## 模式 B：stdio 子进程（imsg）

- OpenClaw 为 [iMessage](/channels/imessage) 启动 `imsg rpc` 作为子进程。
- JSON-RPC 通过 stdin/stdout 以按行分隔的方式传输（每行一个 JSON 对象）。
- 不需要 TCP 端口，也不需要守护进程。

使用的核心方法：

- `watch.subscribe` → 通知（`method: "message"`）
- `watch.unsubscribe`
- `send`
- `chats.list`（探测/诊断）

请参见 [iMessage](/channels/imessage) 了解设置和寻址方式（优先使用 `chat_id`，而不是显示字符串）。

## 适配器指南

- 网关负责进程（启动/停止与提供方生命周期绑定）。
- 让 RPC 客户端具备弹性：超时、退出后重启。
- 优先使用稳定 ID（例如 `chat_id`），而不是显示字符串。

## 相关

- [网关协议](/gateway/protocol)
