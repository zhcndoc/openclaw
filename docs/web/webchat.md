---
summary: "Loopback WebChat 静态主机和 Gateway WS 用于聊天 UI"
read_when:
  - 调试或配置 WebChat 访问时
title: "WebChat"
---

# WebChat（Gateway WebSocket UI）

状态：macOS/iOS SwiftUI 聊天 UI 直接与 Gateway WebSocket 通信。

## 它是什么

- 网关的原生聊天 UI（无嵌入浏览器且无本地静态服务器）。
- 使用与其他渠道相同的会话和路由规则。
- 确定性路由：回复总是返回到 WebChat。

## 快速开始

1. 启动网关。
2. 打开 WebChat UI（macOS/iOS 应用）或 Control UI 的聊天标签页。
3. 确保配置了网关认证（默认要求，即使是回环访问）。

## 工作原理（行为）

- UI 连接到 Gateway WebSocket，使用 `chat.history`、`chat.send` 和 `chat.inject`。
- 为了稳定性，`chat.history` 有界：网关可能截断长文本字段、忽略重量级元数据，并用 `[chat.history omitted: message too large]` 替换过大条目。
- `chat.inject` 直接将助手备注追加到聊天记录中并广播到 UI（不运行代理）。
- 中止的执行可以保留部分助手输出在 UI 中可见。
- 网关在有缓冲输出时，将中止的部分助手文本持久化到聊天记录历史中，并用中止元数据标记。
- 聊天历史总是从网关获取（无本地文件监视）。
- 如果无法访问网关，WebChat 仅可读。

## Control UI 代理工具面板

- Control UI 的 `/agents` 工具面板有两个独立视图：
  - **当前可用** 使用 `tools.effective(sessionKey=...)`，显示当前会话在运行时实际可用的工具，包括核心、插件和渠道拥有的工具。
  - **工具配置** 使用 `tools.catalog`，重点关注配置文件、覆盖以及目录语义。
- 运行时可用性按会话范围生效。在同一代理上切换会话可能会改变 **当前可用** 列表。
- 配置编辑器并不意味着运行时可用性；有效访问仍遵循策略优先级（`allow`/`deny`，按代理以及提供方/渠道覆盖）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道传输网关 WebSocket。
- 无需运行独立的 WebChat 服务器。

## 配置参考（WebChat）

完整配置：[配置](/gateway/configuration)

渠道选项：

- 无专用的 `webchat.*` 配置块。WebChat 使用下面的网关端点 + 认证设置。

相关全局选项：

- `gateway.port`、`gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`、`gateway.auth.token`、`gateway.auth.password`：WebSocket 认证（token/密码）。
- `gateway.auth.mode: "trusted-proxy"`：用于浏览器客户端的反向代理认证（参见[Trusted Proxy Auth](/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：远程网关目标。
- `session.*`：会话存储和主键默认设置。
