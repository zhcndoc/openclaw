---
summary: "通过 WKWebView + 自定义 URL scheme 嵌入的受代理控制的 Canvas 面板"
read_when:
  - 实现 macOS Canvas 面板
  - 为视觉工作区添加代理控制
  - 调试 WKWebView Canvas 加载
title: "画布"
---

macOS 应用使用 `WKWebView` 嵌入一个由代理控制的 **画布面板**，这是一个轻量级的可视化工作区，用于 HTML/CSS/JS、A2UI 以及小型交互式 UI 界面。

## Canvas 的位置

Canvas 状态存储在 Application Support 下：

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Canvas 面板通过自定义 URL scheme 公开这些文件，
`openclaw-canvas://<session>/<path>`：

- `openclaw-canvas://main/` -> `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` -> `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` -> `<canvasRoot>/main/widgets/todo/index.html`

如果根目录中没有 `index.html`，应用将显示一个内置的脚手架页面。

## 面板行为

- 无边框、可调整大小的面板，锚定在菜单栏（或鼠标光标）附近。
- 显示 Canvas 不会切换应用或抢占键盘焦点。
- 每个会话都会记住大小/位置。
- 当本地 canvas 文件更改时会自动重新加载。
- 同一时间只显示一个 Canvas 面板（必要时会切换会话）。

可在 Settings -> **Allow Canvas** 中禁用 Canvas。禁用后，
canvas 节点命令会返回 `CANVAS_DISABLED`。

## 代理 API 表面

Canvas 通过 Gateway WebSocket 暴露，因此代理可以显示/隐藏
面板、导航到路径或 URL、执行 JavaScript，以及捕获
快照图像：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

`eval` 和 `a2ui.*` 会在不打开或显示面板的情况下更新内容。只有
`present`、`navigate` 或用户操作才会显示它；在隐藏之后，内容更新
仍会继续应用到隐藏的面板。`snapshot` 需要一个可见的面板，否则
会返回 `CANVAS_HIDDEN`；请先运行 `present`。

`canvas.navigate` 接受本地 canvas 路径、`http(s)` URL 和 `file://`
URL。传入 `"/"` 会显示本地脚手架或 `index.html`。

位于 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` 下的 Gateway 托管目标会通过节点会话的当前作用域 Canvas URL 进行解析。应用会在导航前刷新该短期有效的能力；你无需自行构造或复制 capability URL。

## Canvas 中的 A2UI

A2UI 由 Gateway canvas host 托管，并渲染在 Canvas
面板内。当 Gateway 广播 Canvas host 时，macOS 应用会在首次打开时自动跳转到
A2UI host 页面。

广告的 URL 具有能力范围，例如
`http://<gateway-host>:18789/__openclaw__/cap/<token>/__openclaw__/a2ui/?platform=macos`。
请将其视为一次性凭据，而不是稳定链接。

### A2UI 命令（v0.8）

Canvas 接受 A2UI v0.8 的 server-to-client 消息：`beginRendering`、
`surfaceUpdate`、`dataModelUpdate`、`deleteSurface`。`createSurface`（v0.9）目前
还不支持。

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas（A2UI v0.8）"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"如果你能读到这段文字，说明 A2UI 推送生效了。"},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

快速冒烟测试：

```bash
openclaw nodes canvas a2ui push --node <id> --text "来自 A2UI 的你好"
```

## 从 Canvas 触发代理运行

Canvas 可以通过 `openclaw://agent?...` 深度链接触发新的代理运行：

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

支持的查询参数：

| 参数                     | 含义                         |
| ------------------------ | ---------------------------- |
| `message`                | 预填充的代理提示词。         |
| `sessionKey`             | 稳定的会话标识符。           |
| `thinking`               | 可选的思考配置。             |
| `deliver`, `to`, `channel` | 传递目标。                 |
| `timeoutSeconds`         | 可选的运行超时时间。         |
| `key`                    | 由应用生成的安全令牌，用于受信任的本地调用方。 |

除非提供有效的 key，否则应用会提示确认。未带 key 的链接会在批准前显示消息和 URL，并忽略传递路由字段；带 key 的链接会使用正常的 Gateway 运行路径。

## 安全说明

- Canvas 方案会阻止目录遍历；文件必须位于会话根目录下。
- 本地 Canvas 内容使用自定义方案（无需回环服务器）。
- 仅当明确导航时，才允许外部 `http(s)` URL。
- 普通网页仅用于渲染。只有来自应用拥有的 Canvas 方案，或由应用选择的、精确限定能力范围的 Gateway A2UI 文档，才接受代理操作；子框架、重定向、失效的能力以及已更改的查询都不能触发操作。

## 相关内容

- [macOS 应用](/platforms/macos)
- [WebChat](/web/webchat)
