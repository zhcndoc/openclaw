---
summary: "用于嵌入、媒体、音频提示和回复的富输出短代码协议"
read_when:
  - 更改 Control UI 中的助手输出渲染时
  - 调试 `[embed ...]`、`MEDIA:`、回复或音频呈现指令时
title: "富输出协议"
---

助手输出可以携带一小组交付/渲染指令：

- `MEDIA:` 用于附件交付
- `[[audio_as_voice]]` 用于音频呈现提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用于回复元数据
- `[embed ...]` 用于 Control UI 富渲染

远程 `MEDIA:` 附件必须是公开的 `https:` URL。普通的 `http:`、
回环、本地链路、私有和内部主机名会被忽略为附件
指令；服务器端媒体获取器仍会强制执行各自的网络保护。

普通 Markdown 图片语法默认仍作为文本。那些有意将 Markdown 图片回复映射为媒体附件的通道，会在其出站适配器中选择启用；Telegram 就是这样做的，因此 `![alt](url)` 仍然可以变成媒体回复。

这些指令彼此独立。`MEDIA:` 和回复/语音标签仍然是交付元数据；`[embed ...]` 是仅限 Web 的富渲染路径。
受信任的工具结果媒体在交付前使用相同的 `MEDIA:` / `[[audio_as_voice]]` 解析器，因此文本工具输出仍然可以将音频附件标记为语音笔记。

当启用块流式传输时，`MEDIA:` 对于一个轮次仍然是单次交付元数据。如果同一个媒体 URL 在流式块中发送并在最终助手负载中重复，OpenClaw 只交付一次该附件，并从最终负载中移除重复项。

## `[embed ...]`

`[embed ...]` 是 Control UI 唯一面向代理的富渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="状态" /]
```

规则：

- `[view ...]` 不再适用于新输出。
- Embed 短代码仅在助手消息表面渲染。
- 仅渲染基于 URL 的 embed。使用 `ref="..."` 或 `url="..."`。
- 块形式内联 HTML embed 短代码不会被渲染。
- Web UI 会从可见文本中剥离短代码并内联渲染 embed。
- `MEDIA:` 不是 embed 别名，不应被用于富 embed 渲染。

## 存储渲染结构

标准化/存储的助手内容块是一个结构化的 `canvas` 项：

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

已存储/已渲染的富块直接使用这种 `canvas` 结构。`present_view` 无法识别。

## 相关

- [RPC adapters](/reference/rpc)
- [Typebox](/concepts/typebox)
