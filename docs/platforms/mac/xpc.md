---
summary: "OpenClaw 应用的 macOS IPC 架构、网关节点传输，以及 PeekabooBridge"
read_when:
  - 编辑 IPC 合约或菜单栏应用 IPC
title: "macOS IPC"
---

# OpenClaw macOS IPC 架构

一个本地 Unix socket 将节点主机服务连接到 macOS 应用，用于执行批准和 `system.run`。存在一个 `openclaw-mac` 调试 CLI（`apps/macos/Sources/OpenClawMacCLI`），用于发现/连接检查；但代理操作仍通过 Gateway WebSocket 和 `node.invoke` 流转。基于节点的 `computer.act` 路径会在进程内运行嵌入式 Peekaboo 自动化；独立的 Peekaboo 客户端使用 PeekabooBridge。

## 目标

- 一个单一的 GUI 应用实例，负责所有面向 TCC 的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 一个用于自动化的小表面：Gateway + 节点命令、进程内 `computer.act`，以及面向独立 UI 自动化客户端的 PeekabooBridge。
- 可预测的权限：始终使用相同的已签名 bundle ID，由 launchd 启动，因此 TCC 授权会保持有效。

## 工作原理

### Gateway + node 传输

- 应用运行 Gateway（本地模式）并作为节点连接到它。
- Agent 操作通过 `node.invoke` 执行（例如 `system.run`、`system.notify`、`canvas.*`）。
- 节点命令包括 `canvas.*`、`camera.snap`、`camera.clip`、`screen.snapshot`、`screen.record`、`computer.act`、`system.run` 和 `system.notify`。
- 节点会报告一个 `permissions` 映射，以便 agent 了解是否可用屏幕、摄像头、麦克风、语音、自动化或辅助功能访问权限。

### Node 服务 + app IPC

- 一个无头的节点宿主服务连接到 Gateway WebSocket。
- `system.run` 请求会通过本地 Unix 套接字（`ExecApprovalsSocket.swift`）转发到 macOS 应用。
- 应用在 UI 上下文中执行该命令，必要时提示用户，并返回输出。

图示（SCI）：

```text
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自动化）

- 内置 agent 的 `computer` 工具**不**使用这个套接字。配对的 macOS 节点会在应用进程中借助嵌入式 Peekaboo 服务来实现 `computer.act`。
- UI 自动化使用单独的 UNIX 套接字（`~/Library/Application Support/OpenClaw/<socket>`）以及 PeekabooBridge JSON 协议。
- 主机优先级顺序（客户端侧）：Peekaboo.app -> Claude.app -> OpenClaw.app -> 本地执行。
- 安全性：bridge 主机要求允许列表中的 TeamID（捆绑的 `PeekabooBridgeHostCoordinator` 会将固定团队以及应用自身的签名团队加入允许列表）；一个仅限 DEBUG 的同 UID 逃生通道由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 保护（Peekaboo 约定）。
- 参见：[PeekabooBridge 使用](/platforms/mac/peekaboo) 了解详情。

## 运行流程

- 重启/重新构建：`scripts/restart-mac.sh` 会终止现有实例，通过 Swift 重新构建、重新打包并重新启动。它会自动检测可用的签名身份，并在未找到时回退到 `--no-sign`；传入 `--sign` 可强制要求签名（如果没有可用密钥则失败），或传入 `--no-sign` 强制走未签名路径。签名路径下在环境中设置的 `SIGN_IDENTITY` 会被取消设置，因此 `scripts/codesign-mac-app.sh` 自己的身份自动检测会选择证书。
- 单实例：应用会检查 `NSWorkspace.runningApplications` 中是否存在重复的 bundle ID，并在发现多个实例时退出（`MenuBar.swift` 中的 `isDuplicateInstance()`）。

## 加固说明

- 优先要求所有特权面都进行 TeamID 匹配。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅 DEBUG）可允许同 UID 调用者用于本地开发。
- 所有通信仍保持仅本地；不会暴露网络 socket。
- TCC 提示仅来自 GUI 应用程序包；请在每次重新构建时保持已签名的 bundle ID 稳定。
- Exec 授权 socket 加固：文件模式 `0600`、共享令牌、peer-UID 检查（`getpeereid`）、HMAC-SHA256 挑战/响应，以及请求的短 TTL。

## 相关内容

- [macOS 应用](/platforms/macos)
- [macOS IPC 流程（Exec 审批）](/tools/exec-approvals-advanced#macos-ipc-flow)
