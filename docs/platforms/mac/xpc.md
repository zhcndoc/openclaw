---
summary: "OpenClaw 应用、网关节点传输及 PeekabooBridge 的 macOS IPC 架构"
read_when:
  - 编辑 IPC 合约或菜单栏应用 IPC 时
title: "macOS IPC"
---

# OpenClaw macOS IPC 架构

**当前模型：** 一个本地 Unix 套接字连接 **节点主机服务** 和 **macOS 应用**，用于执行审批和 `system.run`。存在一个 `openclaw-mac` 调试 CLI 用于发现/连接检查；代理动作仍通过网关 WebSocket 和 `node.invoke` 流转。UI 自动化使用 PeekabooBridge。

## 目标

- 单一 GUI 应用实例，拥有所有面向 TCC 的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 小巧的自动化接口：网关 + 节点命令，加上用于 UI 自动化的 PeekabooBridge。
- 可预测的权限：始终使用相同的已签名 Bundle ID，由 launchd 启动，确保 TCC 授权持续有效。

## 工作原理

### 网关 + 节点传输

- 应用运行网关（本地模式）并作为节点连接到它。
- 代理动作通过 `node.invoke` 执行（例如 `system.run`、`system.notify`、`canvas.*`）。

### 节点服务 + 应用 IPC

- 无界面节点主机服务连接到网关 WebSocket。
- `system.run` 请求通过本地 Unix 套接字转发给 macOS 应用。
- 应用在 UI 上下文中执行命令，必要时提示用户，并返回输出。

流程图（SCI）：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自动化）

- UI 自动化使用名为 `bridge.sock` 的单独 UNIX 套接字和 PeekabooBridge JSON 协议。
- 主机偏好顺序（客户端）：Peekaboo.app → Claude.app → OpenClaw.app → 本地执行。
- 安全性：桥接主机需允许特定 TeamID；仅 DEBUG 模式下允许同 UID 的旁路保护，需设置 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（Peekaboo 约定）。
- 详情见：[PeekabooBridge 使用](/platforms/mac/peekaboo)。

## 操作流程

- 重启/重建：`SIGN_IDENTITY="Apple Development: <开发者姓名> (<TEAMID>)" scripts/restart-mac.sh`
  - 终止已有实例
  - Swift 构建 + 打包
  - 写入/引导/启动 LaunchAgent
- 单实例运行：若已存在同一 bundle ID 的实例，应用提前退出。

## 加固说明

- 建议所有高权限操作均强制匹配 TeamID。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅限 DEBUG）允许同 UID 的调用者用于本地开发。
- 所有通信均限于本地，不开放任何网络套接字。
- TCC 提示仅来源于 GUI 应用包；保持签名 bundle ID 在重建中稳定。
- IPC 加固措施：套接字模式 `0600`，令牌，检查对端 UID，HMAC 挑战/响应，短 TTL。
