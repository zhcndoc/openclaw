---
summary: "mac 应用如何嵌入 gateway WebChat 以及如何调试它"
read_when:
  - 调试 mac WebChat 视图或回环端口
title: "WebChat（macOS）"
---

macOS 菜单栏应用将 WebChat UI 作为原生 SwiftUI 视图嵌入。它连接到 Gateway，并默认使用所选 agent 的主会话（`main`，或者当 `session.scope` 为 `global` 时使用 `global`）。

完整的聊天窗口是一个原生分栏视图：

- **会话侧边栏**：可搜索的会话列表，包含置顶和最近两个部分、未读指示器，以及用于置顶/取消置顶、复制会话 key 和删除的上下文菜单。工具栏按钮（或 Cmd-N）会通过 `sessions.create` 创建一个真正的新会话。
- **窗口工具栏**：上下文使用量环（tokens 和会话成本，带有一个紧凑操作）、思考级别选择器、模型选择器，以及会话操作菜单（新建会话、刷新、复制会话 key、导出转写、压缩、清除历史）。
- **转写和输入框**：助手消息以带头像的纯文本形式渲染，用户消息以强调色气泡显示。输入 `/` 会打开由 `commands.list` 支持的斜杠命令自动补全，支持使用方向键/Tab/Return/Escape 进行键盘导航。右键单击消息可复制内容。

菜单栏中的锚定式快速聊天面板保持紧凑的单列布局，并带有内联选择器。

- **本地模式**：直接连接到本地 Gateway WebSocket。
- **远程模式**：通过 SSH 转发 Gateway 控制端口，并将该隧道用作数据平面。

## 启动与调试

- 手动：Lobster 菜单 -> “打开聊天”。
- 测试时自动打开：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --chat
  ```

  （`--webchat` 作为旧版别名也可接受。）

- 日志：`./scripts/clawlog.sh`（子系统 `ai.openclaw`，类别 `WebChatSwiftUI`）。

## 它是如何连接的

- 数据平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、`chat.inject`，以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- `chat.history` 返回一个用于显示的标准化转录：可见文本中的内联指令标签会被移除，纯文本工具调用 XML 载荷（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`，包括被截断的块）以及泄漏的模型控制 token 会被移除，纯静默 token 的助手行（例如精确的 `NO_REPLY`/`no_reply`）会被省略，过大的行可能会被一个截断占位符替换。
- 会话：默认使用如上所述的主会话；UI 可以在会话之间切换。
- 引导流程使用一个专用会话，以将首次运行设置与其他内容分开。
- 离线缓存：应用会为每个 gateway 保留一个小型只读缓存，用于存放最近的聊天会话和转录（`~/Library/Application Support/OpenClaw/chat-cache.sqlite`）：冷启动时会立即显示最后已知的转录，并在 Gateway 响应后刷新；在断开连接期间，最近的聊天仍可浏览（在连接恢复之前，发送会保持禁用）。

## 安全部分

- 远程模式只通过 SSH 转发 Gateway WebSocket 控制端口。

## 已知限制

- 该 UI 针对聊天会话进行了优化，而不是完整的浏览器沙箱。

## 相关内容

- [WebChat](/web/webchat)
- [macOS 应用](/platforms/macos)
