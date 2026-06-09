---
summary: "丰富输出协议，用于结构化媒体、嵌入、音频提示和回复"
read_when:
  - 更改 Control UI 中的助手输出渲染时
  - 调试 `[embed ...]`、结构化媒体、回复或音频展示指令时
title: "丰富输出协议"
---

助手输出可以携带一小组传递/渲染指令：

- 用于附件传递的结构化 `mediaUrl` / `mediaUrls` 字段
- 用于音频展示提示的 `[[audio_as_voice]]`
- 用于回复元数据的 `[[reply_to_current]]` / `[[reply_to:<id>]]`
- 用于 Control UI 富渲染的 `[embed ...]`

远程媒体附件必须是公开的 `https:` URL。普通的 `http:`、
环回、本地链路、私有和内部主机名都会被忽略为附件
指令；服务器端媒体抓取器仍会执行其自身的网络防护。

本地媒体附件可以使用绝对路径、工作区相对路径或
相对主目录的 `~/` 路径。它们在传递前仍会经过代理文件读取策略和
媒体类型检查。

<Warning>
不要从工具、插件、流式块、
浏览器输出或消息操作中发出附件的文本命令。请改用结构化媒体字段。

有效的消息工具载荷：

```json
{ "message": "这是你的图片。", "mediaUrl": "/workspace/image.png" }
```

旧版最终助手回复文本可能仍会为了兼容性而被规范化，但
它不是通用的插件/工具协议。
</Warning>

普通 Markdown 图片语法默认仍作为文本处理。那些有意将 Markdown 图片回复映射为媒体附件的通道，会在其出站适配器中显式启用；Telegram 就是这样做的，因此 `![alt](url)` 仍然可以变成媒体回复。

这些指令彼此独立。结构化媒体字段和回复/语音标签是
传递元数据；`[embed ...]` 是仅用于 Web 的富渲染路径。

当启用块流式传输时，媒体必须通过结构化载荷
字段传递。如果同一个媒体 URL 同时在流式块中发送，并在
最终助手载荷中重复，OpenClaw 会只传递一次该附件，并从最终载荷中移除
重复项。

## `[embed ...]`

`[embed ...]` 是 Control UI 中唯一面向代理的富渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="状态" /]
```

规则：

- `[view ...]` 不再适用于新输出。
- Embed 简写仅在助手消息区域内渲染。
- 仅渲染由 URL 支持的 embed。使用 `ref="..."` 或 `url="..."`。
- 块形式的内联 HTML embed 简写不会被渲染。
- Web UI 会从可见文本中移除该简写，并在内联位置渲染 embed。
- 结构化媒体不是 embed 别名，不应用于富 embed 渲染。

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

存储/渲染后的富块直接使用这种 `canvas` 形状。`present_view` 不被识别。

## 相关内容

- [RPC adapters](/reference/rpc)
- [Typebox](/concepts/typebox)
