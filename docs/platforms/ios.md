---
summary: "iOS 节点应用：连接网关、配对、画布及故障排查"
read_when:
  - 配对或重新连接 iOS 节点时
  - 从源码运行 iOS 应用时
  - 调试网关发现或画布命令时
title: "iOS 应用"
---

# iOS 应用（节点）

可用性：内部预览。iOS 应用尚未公开发布。

## 功能介绍

- 通过 WebSocket（局域网或 tailnet）连接网关。
- 暴露节点能力：画布、屏幕快照、相机捕捉、定位、对讲模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- 网关运行在另一设备上（macOS、Linux，或者通过 WSL2 的 Windows）。
- 网络路径：
  - 通过 Bonjour 在同一局域网内，**或者**
  - 通过单播 DNS-SD 使用 tailnet（示例域名：`openclaw.internal.`），**或者**
  - 手动输入主机/端口（回退方案）。

## 快速开始（配对 + 连接）

1. 启动网关：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中打开设置，选择发现的网关（或者启用手动主机并输入主机/端口）。

3. 在网关主机上批准配对请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

4. 验证连接状态：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 发现路径

### Bonjour（局域网）

网关会在 `local.` 广播 `_openclaw-gw._tcp`。iOS 应用会自动列出这些网关。

### Tailnet（跨网络）

如果 mDNS 被阻止，使用单播 DNS-SD 区域（选择一个域名，示例：`openclaw.internal.`）和 Tailscale 分割 DNS。  
具体请参阅 [Bonjour](/gateway/bonjour) 中的 CoreDNS 示例。

### 手动主机/端口

在设置中启用 **手动主机**，输入网关的主机和端口（默认 `18789`）。

## 画布 + A2UI

iOS 节点渲染一个 WKWebView 画布。使用 `node.invoke` 控制它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

备注：

- 网关画布主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` 页面。
- 这些由网关的 HTTP 服务提供（端口与 `gateway.port` 相同，默认 `18789`）。
- iOS 节点在连接时如果收到画布主机 URL 会自动导航至 A2UI。
- 通过 `canvas.navigate` 和 `{"url":""}` 可返回内置脚手架。

### 画布执行脚本 / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对讲模式

- 语音唤醒和对讲模式可在设置中启用。
- iOS 可能会挂起后台音频，应用不活跃时语音功能视为尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：请将 iOS 应用置于前台（画布/相机/屏幕命令需要应用前台运行）。
- `A2UI_HOST_NOT_CONFIGURED`：网关未广播画布主机 URL；检查 [网关配置](/gateway/configuration) 中的 `canvasHost`。
- 配对提示未弹出：执行 `openclaw devices list` 并手动批准。
- 重装后重新连接失败：钥匙串 pairing token 被清除；请重新配对节点。

## 相关文档

- [配对](/channels/pairing)
- [发现](/gateway/discovery)
- [Bonjour](/gateway/bonjour)
