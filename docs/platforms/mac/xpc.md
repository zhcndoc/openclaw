---
summary: "OpenClaw 应用的 macOS IPC 架构、网关节点传输，以及 PeekabooBridge"
read_when:
  - 编辑 IPC 合约或菜单栏应用 IPC
title: "macOS IPC"
---

# OpenClaw macOS IPC 架构

**当前模型：** 一个本地 Unix socket 将 **node 主机服务** 连接到 **macOS 应用**，用于 exec 审批和 `system.run`。`openclaw-mac` 调试 CLI 可用于发现/连接检查；agent 动作仍通过 Gateway WebSocket 和 `node.invoke` 流转。UI 自动化使用 PeekabooBridge。

## 目标

- 单一 GUI 应用实例，负责所有面向 TCC 的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 为自动化提供一个小而明确的表面：Gateway + node 命令，以及用于 UI 自动化的 PeekabooBridge。
- 可预测的权限：始终使用相同的已签名 bundle ID，由 launchd 启动，因此 TCC 授权会保持有效。

## 工作原理

### Gateway + node 传输

- 应用运行 Gateway（本地模式）并作为一个 node 连接到它。
- agent 动作通过 `node.invoke` 执行（例如 `system.run`、`system.notify`、`canvas.*`）。

### Node 服务 + app IPC

- 一个无头 node 主机服务连接到 Gateway WebSocket。
- `system.run` 请求通过本地 Unix socket 转发到 macOS 应用。
- 应用在 UI 上下文中执行 exec，必要时进行提示，并返回输出。

图示（SCI）：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自动化）

- UI 自动化使用一个名为 `bridge.sock` 的独立 UNIX socket 和 PeekabooBridge JSON 协议。
- 主机偏好顺序（客户端侧）：Peekaboo.app → Claude.app → OpenClaw.app → 本地执行。
- 安全性：bridge 主机要求允许的 TeamID；DEBUG 仅限的同 UID 逃生口由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 保护（Peekaboo 约定）。
- 详见：[PeekabooBridge 使用](/platforms/mac/peekaboo)。

## 运行流程

- 重启/重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 终止现有实例
  - Swift 构建 + 打包
  - 写入/引导/启动 LaunchAgent
- 单实例：如果检测到另一个具有相同 bundle ID 的实例正在运行，应用会提前退出。

## 加固说明

- 对所有特权面，优先要求 TeamID 匹配。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅 DEBUG）可能允许同 UID 调用者用于本地开发。
- 所有通信都保持本地；不暴露网络 socket。
- TCC 提示只来自 GUI 应用 bundle；在重建之间保持已签名 bundle ID 稳定。
- IPC 加固：socket 模式 `0600`、token、对等 UID 检查、HMAC 挑战/响应、短 TTL。

## 相关内容

- [macOS 应用](/platforms/macos)
- [macOS IPC 流程（Exec 审批）](/tools/exec-approvals-advanced#macos-ipc-flow)
