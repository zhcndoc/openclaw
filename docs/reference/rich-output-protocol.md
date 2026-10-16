---
summary: "用于结构化媒体、嵌入、音频提示和回复的丰富输出协议"
read_when:
  - "更改 Control UI 中的助手输出渲染时"
  - "调试 `[embed ...]`、结构化媒体、回复或音频展示指令时"
title: "丰富输出协议"
---

助理输出通过几个专用通道携带 delivery/render 指令：

- 用于附件传递的结构化 `mediaUrl` / `mediaUrls` 字段。
- 用于音频展示提示的 `[[audio_as_voice]]`。
- 用于回复元数据的 `[[reply_to_current]]` / `[[reply_to:<id>]]`。
- 用于 Control UI 富文本渲染的 `[embed ...]`。

结构化媒体字段和 `[[...]]` 标签是传递元数据。`[embed ...]` 是单独的仅 Web 富渲染路径；它不是媒体别名。

## <a id="media-attachments"></a> 媒体附件

远程附件必须是公共 `https:` URL。 `http:`、环回、链路本地、私有和内部主机名作为附件指令被拒绝；服务器端媒体获取器在顶部应用自己的网络防护。

本地附件接受绝对路径、工作区相对路径或主目录相对的 `~/` 路径。它们在传递前仍会经过代理文件读取策略和媒体类型检查。

存储的入站附件还接受对话历史记录中的 `media://inbound/<id>` 引用。在结构化附件字段或独立的 `MEDIA:` 行中使用参考。网关将其解析为存储的文件，并应用相同的文件读取和沙箱检查作为显式本地路径。

在 Control UI 聊天中，相对本地引用根据会话的工作目录进行解析，包括选定的项目或工作树。它们使用与绝对路径相同的经过身份验证的媒体路由；丢失的文件显示附件错误，而不是文字 `MEDIA:` 行。另一个执行主机上的文件必须首先作为托管附件传送。

<Warning>
工具、插件、浏览器输出、消息操作和流块有效负载必须使用结构化附件字段，而不是文本命令。回复有效负载使用 `mediaUrl` / `mediaUrls`：

```json
{ "text": "Here is your image.", "mediaUrl": "/workspace/image.png" }
```

对于 `message(action=send)`，对于一个附件使用 `media`，对于多个附件使用 `attachments: [{media: ...}]`。下面的自动模式模型编写的文本兼容性不是通用工具、插件或块流协议。
</Warning>

## <a id="legacy-media%3A-lines"></a><a id="legacy-media-lines"></a> 传统的 `MEDIA:` 行

在自动可见回复模式下，最终助理回复仍然可以使用普通的独立 `MEDIA:` 线路附加媒体。 WebChat 还支持下面描述的承诺注释兼容性路径。解析器仅识别在 Markdown 包装器和围栏或缩进代码块之外的修剪文本以 `MEDIA:` 开头的行。最多接受三个前导空格；四空格或制表符缩进遵循 CommonMark 代码块规则。

有效的自动模式助手输出：

```text
Here is the generated image.

MEDIA:/workspace/image.png
```

以下内容仍然是普通文本，不会附加媒体：

```text
**MEDIA:/workspace/image.png**
`MEDIA:/workspace/image.png`
Here is your image: MEDIA:/workspace/image.png
```

当标点符号属于其路径或 URL 时，请用双引号引用旧引用，例如 `MEDIA:"https://example.com/video.mp4?token=ends,"`。标点符号仍然是参考文献的一部分；附件验证仍然适用。

### <a id="webchat-commentary-compatibility"></a> WebChat 注释兼容性

在自动模式下，一旦助理消息提交到脚本中，WebChat 还可以附加来自模型编写的评论（进度消息）的媒体，同时任务继续进行。这不是解析任意流增量或流块有效负载。

运行时在 `before_message_write` 挂钩运行之前捕获模型创作的引用。只有保留在承诺评论中的捕获集中的参考文献才有资格进行附件准备；通过钩子新插入的引用仍然是普通文本。准备工作与确切提交的消息和当前承认的运行绑定在一起。捕获的引用建立交付意图，而不是文件访问权限：文件读取策略、媒体验证、身份验证服务和实时 run/session 所有权检查仍然适用。

这种兼容性不会取代仅使用消息工具的传递。当解析的源回复模式为 `message_tool_only`（使用 `messages.visibleReplies: "message_tool"` 配置）时，可见输出必须使用 `message(action=send)` 及其结构化附件字段，而不是注释或最终文本中的旧版 `MEDIA:` 行。参见[可见回复配置](/gateway/config-agents/messages-and-talk#other-message-keys)。

### <a id="structured-payloads-and-block-streaming"></a> 结构化有效负载和块流

工具、插件、浏览器输出、消息操作和流式块有效负载仍然需要如上所述的结构化附件字段。承诺的 WebChat 注释是一个单独的兼容性路径，对于那些生产者返回的文本也不例外。

默认情况下，纯 Markdown 图片语法仍然是文本。明确将 Markdown 图片回复映射为媒体附件的渠道可以选择启用此功能；Telegram 已启用，因此 `![alt](url)` 仍然可以成为媒体回复。

启用块流时，流块中的媒体必须位于结构化 `mediaUrl` / `mediaUrls` 字段上。如果相同的媒体 URL 出现在流块中并再次出现在最终的辅助有效负载中，则 OpenClaw 将其传送一次并从最终的有效负载中删除重复项。

## `[embed ...]`

`[embed ...]` 是 Control UI 唯一面向智能体的富渲染语法。自闭合示例：

```text
[embed ref="cv_123" title="Status" /]
```

规则：

- `[view ...]` 对于新输出无效。 `[embed ...]` 将其替换为 2026.4.11 （[#64104](https://github.com/openclaw/openclaw/pull/64104)）。
- Embed 短代码仅在助手消息区域中渲染。
- 仅支持URL-支持的嵌入渲染；使用 `ref="..."` 或 `url="..."`。
- 块级形式的内联 HTML embed 短代码不会渲染。
- Web UI 会从可见文本中移除该短代码，并将 embed 以内联方式渲染。

对于YouTube视频，直接提供其URL；无需 HTML 小部件、下载或重新托管：

```text
[embed url="https://www.youtube.com/watch?v=VIDEO_ID" title="Trailer" /]
```

当用户按下 **Play** 时，Control UI 渲染缩略图卡并加载 YouTube 播放器。此专用卡不需要`gateway.controlUi.allowExternalEmbedUrls`；它不允许任意外部页面或 `show_widget` 内的 YouTube iframe。在严格嵌入模式下，它提供了一个观看链接。在其他表面上使用常规 YouTube 链接。请参阅 [YouTube 视频](/web/control-ui/chat#youtube-videos) 了解支持的 URL 和隐私行为。

## <a id="stored-rendering-shape"></a> 存储的渲染形状

normalized/stored 辅助内容块是结构化的 `canvas` 项：

```json
{
  "type": "canvas",
  "preview": {
    "kind": "canvas",
    "surface": "assistant_message",
    "render": "url",
    "viewId": "cv_123",
    "url": "/__openclaw__/canvas/documents/cv_123/index.html",
    "title": "Status",
    "preferredHeight": 320
  }
}
```

`present_view` 无法识别； stored/rendered 丰富的块始终使用此 `canvas` 形状。

## <a id="related"></a> 相关内容

- [Hosted embeds](/web/control-ui/chat#hosted-embeds) - Control UI 如何呈现 `[embed ...]` 及其 iframe 沙箱策略
- [打字盒](/concepts/typebox)
