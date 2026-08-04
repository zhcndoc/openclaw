---
summary: "用于结构化媒体、嵌入、音频提示和回复的丰富输出协议"
read_when:
  - 更改 Control UI 中的助手输出渲染时
  - 调试 `[embed ...]`、结构化媒体、回复或音频展示指令时
title: "丰富输出协议"
---

助手输出通过几个专用通道携带传递/渲染指令：

- 用于附件传递的结构化 `mediaUrl` / `mediaUrls` 字段。
- 用于音频展示提示的 `[[audio_as_voice]]`。
- 用于回复元数据的 `[[reply_to_current]]` / `[[reply_to:<id>]]`。
- 用于 Control UI 富文本渲染的 `[embed ...]`。

结构化媒体字段和 `[[...]]` 标签是传递元数据。`[embed ...]` 是单独的仅 Web 富渲染路径；它不是媒体别名。

## 媒体附件

远程附件必须是公开的 `https:` URL。`http:`、回环、链路本地、私有和内部主机名会被拒绝作为附件指令；服务器端媒体获取器会在其自身网络防护之上再进行限制。

本地附件接受绝对路径、工作区相对路径或主目录相对的 `~/` 路径。它们在传递前仍会经过代理文件读取策略和媒体类型检查。

<Warning>
不要从工具、插件、流式块、浏览器输出或消息操作中发出附件的文本命令。请改用结构化媒体字段：

```json
{ "message": "这是你的图片。", "mediaUrl": "/workspace/image.png" }
```

为兼容性起见，旧版最终回复文本仍可能被规范化，但这不是通用的插件/工具协议。
</Warning>

## 传统的 `MEDIA:` 行

传统的最终助手回复仍然可以通过单独一行的纯文本
`MEDIA:` 附加本地媒体。解析器只识别去除首尾空白后的文本以 `MEDIA:` 开头，且位于 Markdown 包装和代码围栏之外的行。

有效的传统最终回复：

```text
这是生成的图像。

MEDIA:/workspace/image.png
```

以下内容仍然是普通文本，不会附加媒体：

```text
**MEDIA:/workspace/image.png**
`MEDIA:/workspace/image.png`
这是你的图像：MEDIA:/workspace/image.png
```

对于工具、插件、浏览器输出、流式传输块和消息操作，优先使用结构化的 `mediaUrl` / `mediaUrls` 字段。

默认情况下，纯 Markdown 图片语法仍然是文本。明确将 Markdown 图片回复映射为媒体附件的渠道可以选择启用此功能；Telegram 已启用，因此 `![alt](url)` 仍然可以成为媒体回复。

启用块流式传输时，媒体必须通过结构化负载字段传递。如果同一个媒体 URL 同时出现在流式块中以及最终的助手负载中，OpenClaw 只会传递一次，并从最终负载中移除重复项。

## `[embed ...]`

`[embed ...]` 是 Control UI 唯一面向智能体的富渲染语法。自闭合示例：

```text
[embed ref="cv_123" title="状态" /]
```

规则：

- `[view ...]` 不再对新的输出有效。
- Embed 短代码仅在助手消息区域中渲染。
- 只有基于 URL 的 embed 才会渲染；请使用 `ref="..."` 或 `url="..."`。
- 块级形式的内联 HTML embed 短代码不会渲染。
- Web UI 会从可见文本中移除该短代码，并将 embed 以内联方式渲染。

## 存储的渲染形状

规范化/存储后的助手内容块是一个结构化的 `canvas` 项：

```json
{
  "type": "canvas",
  "preview": {
    "kind": "canvas",
    "surface": "assistant_message",
    "render": "url",
    "viewId": "cv_123",
    "url": "/__openclaw__/canvas/documents/cv_123/index.html",
    "title": "状态",
    "preferredHeight": 320
  }
}
```

`present_view` 不被识别；存储/渲染后的富文本块始终使用这种 `canvas` 形状。

## 相关内容

- [RPC 适配器](/reference/rpc)
- [Typebox](/concepts/typebox)
