---
summary: "通过 WKWebView + 自定义 URL scheme 嵌入的受代理控制的 Canvas 面板"
read_when:
  - 实现 macOS Canvas 面板
  - 为视觉工作区添加代理控制
  - 调试 WKWebView Canvas 加载
title: "Canvas"
---

macOS 应用使用 `WKWebView` 嵌入一个受代理控制的 **Canvas 面板**。它
是一个用于 HTML/CSS/JS、A2UI 和小型交互式 UI 界面的轻量级视觉工作区。

## Canvas 的位置

Canvas 状态存储在 Application Support 下：

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Canvas 面板通过一个 **自定义 URL scheme** 提供这些文件：

- `openclaw-canvas://<session>/<path>`

示例：

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

如果根目录下没有 `index.html`，应用会显示一个 **内置脚手架页面**。

## 面板行为

- 无边框、可调整大小的面板，锚定在菜单栏附近（或鼠标光标附近）。
- 记住每个会话的大小/位置。
- 当本地 canvas 文件发生变化时自动重新加载。
- 同一时间只显示一个 Canvas 面板（按需切换会话）。

可在设置 → **Allow Canvas** 中禁用 Canvas。禁用后，canvas
节点命令会返回 `CANVAS_DISABLED`。

## 代理 API 表面

Canvas 通过 **Gateway WebSocket** 暴露，因此代理可以：

- 显示/隐藏面板
- 导航到路径或 URL
- 执行 JavaScript
- 捕获快照图像

CLI 示例：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

说明：

- `canvas.navigate` 接受 **本地 canvas 路径**、`http(s)` URL 和 `file://` URL。
- 如果你传入 `"/"`，Canvas 会显示本地脚手架或 `index.html`。

## Canvas 中的 A2UI

A2UI 由 Gateway canvas host 托管，并在 Canvas 面板内渲染。
当 Gateway 宣告一个 Canvas host 时，macOS 应用会在首次打开时自动导航到
A2UI host 页面。

默认 A2UI host URL：

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### A2UI 命令（v0.8）

Canvas 当前接受 **A2UI v0.8** 的 server→client 消息：

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

不支持 `createSurface`（v0.9）。

CLI 示例：

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas（A2UI v0.8）"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"如果你能读到这段文字，说明 A2UI 推送生效了。"},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

快速测试：

```bash
openclaw nodes canvas a2ui push --node <id> --text "来自 A2UI 的你好"
```

## 从 Canvas 触发代理运行

Canvas 可以通过深链接触发新的代理运行：

- `openclaw://agent?...`

示例（在 JS 中）：

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

除非提供有效密钥，否则应用会提示确认。

## 安全说明

- Canvas scheme 会阻止目录穿越；文件必须位于会话根目录下。
- 本地 Canvas 内容使用自定义 scheme（无需 loopback 服务器）。
- 仅当显式导航时才允许外部 `http(s)` URL。

## 相关内容

- [macOS app](/platforms/macos)
- [WebChat](/web/webchat)
