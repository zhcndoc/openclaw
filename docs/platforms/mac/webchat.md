---
summary: "mac 应用如何嵌入网关 WebChat 及如何调试"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

# WebChat（macOS 应用）

macOS 菜单栏应用将 WebChat UI 嵌入为本地的 SwiftUI 视图。它连接到网关并默认使用所选代理的**主会话**（可通过会话切换器切换到其他会话）。

- **本地模式**：直接连接本地网关 WebSocket。
- **远程模式**：通过 SSH 转发网关控制端口，并使用该通道作为数据平面。

## 启动与调试

- 手动：Lobster 菜单 → “打开聊天”。
- 自动打开用于测试：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日志：`./scripts/clawlog.sh`（子系统 `ai.openclaw`，类别 `WebChatSwiftUI`）。

## How it is wired

- 数据平面：网关 WS 方法 `chat.history`、`chat.send`、`chat.abort`、`chat.inject` 及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 会话：默认使用主会话（`main`，全局作用域时为 `global`）。UI 可切换会话。
- 新手引导使用专用会话以保持首次运行设置的独立。

## 安全面

- 远程模式仅通过 SSH 转发网关 WebSocket 控制端口。

## 已知限制

- UI 针对聊天会话进行了优化（非完整浏览器沙盒）。
