---
summary: "用于外部 CLI（signal-cli，传统 imsg）和网关模式的 RPC 适配器"
read_when:
  - 添加或更改外部 CLI 集成
  - 调试 RPC 适配器（signal-cli、imsg）
title: "RPC 适配器"
---

OpenClaw 通过 JSON-RPC 集成外部 CLI。目前使用两种模式。

## 模式 A：HTTP 守护进程（signal-cli）

- `signal-cli` 作为守护进程运行，使用基于 HTTP 的 JSON-RPC。
- 事件流为 SSE（`/api/v1/events`）。
- 健康检查接口：`/api/v1/check`。
- 当 `channels.signal.autoStart=true` 时，OpenClaw 管理其生命周期。

详情请参见 [Signal](/channels/signal) 的设置和端点。

## 模式 B：标准输入输出子进程（传统：imsg）

> **注意：** 对于新的 iMessage 设置，请改用 [BlueBubbles](/channels/bluebubbles)。

- OpenClaw 启动 `imsg rpc` 作为子进程（传统 iMessage 集成）。
- JSON-RPC 通过 stdin/stdout 且按行分隔（每行一个 JSON 对象）。
- 无需 TCP 端口，无需守护进程。

主要使用的方法：

- `watch.subscribe` → 通知（`method: "message"`）
- `watch.unsubscribe`
- `send`
- `chats.list`（探测/诊断）

详情请参见 [iMessage](/channels/imessage) 的传统设置及寻址（推荐使用 `chat_id`）。

## 适配器指南

- Gateway 拥有该进程（启动/停止与提供方生命周期绑定）。
- 保持 RPC 客户端具有弹性：设置超时，退出后重启。
- 优先使用稳定 ID（例如 `chat_id`），而不是显示字符串。

## 相关内容

- [Gateway protocol](/gateway/protocol)
