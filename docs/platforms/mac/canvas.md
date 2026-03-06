---
summary: "通过 WKWebView + 自定义 URL 方案嵌入的代理控制 Canvas 面板"
read_when:
  - 实现 macOS Canvas 面板时
  - 为视觉工作区添加代理控件时
  - 调试 WKWebView Canvas 加载时
title: "Canvas"
---

# Canvas（macOS 应用）

该 macOS 应用通过 `WKWebView` 嵌入了一个由代理控制的**Canvas 面板**。它是一个轻量级的视觉工作区，用于 HTML/CSS/JS、A2UI 以及小型互动 UI 界面。

## Canvas 的存储位置

Canvas 状态存储于 Application Support 目录下：

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Canvas 面板通过**自定义 URL 方案**提供这些文件：

- `openclaw-canvas://<session>/<path>`

示例：

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

如果根目录下没有 `index.html`，应用将显示**内置的骨架页面**。

## 面板行为

- 无边框、可调整大小的面板，锚定在菜单栏附近（或鼠标光标处）。
- 记忆每个会话的大小和位置。
- 本地 Canvas 文件变化时自动重新加载。
- 同时仅显示一个 Canvas 面板（根据需要切换会话）。

可以在设置中关闭 Canvas → **允许 Canvas**。关闭后，Canvas 节点命令返回 `CANVAS_DISABLED`。

## 代理 API 面

Canvas 通过**Gateway WebSocket**暴露，代理可以：

- 显示/隐藏面板
- 导航到某路径或 URL
- 执行 JavaScript
- 捕获快照图像

CLI 示例：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

注意：

- `canvas.navigate` 支持本地 Canvas 路径、`http(s)` URL 及 `file://` URL。
- 传入 `"/"` 时，Canvas 显示本地骨架页或 `index.html`。

## Canvas 中的 A2UI

A2UI 由 Gateway Canvas 主机托管，并在 Canvas 面板内渲染。当 Gateway 广播 Canvas 主机时，macOS 应用首次打开时会自动导航至 A2UI 主机页面。

默认 A2UI 主机 URL：

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### A2UI 命令（v0.8）

Canvas 当前接受 **A2UI v0.8** 服务器到客户端消息：

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

`createSurface`（v0.9）暂不支持。

CLI 示例：

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

快速测试：

```bash
openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## Canvas 触发代理运行

Canvas 可以通过深度链接触发新的代理运行：

- `openclaw://agent?...`

示例（JavaScript）：

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

应用会提示确认，除非提供有效密钥。

## 安全性说明

- Canvas 方案阻止目录遍历；文件必须位于会话根目录下。
- 本地 Canvas 内容使用自定义方案（无需环回服务器）。
- 仅显式导航时允许外部的 `http(s)` URL。
