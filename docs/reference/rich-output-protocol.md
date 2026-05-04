---
summary: "用于嵌入、媒体、音频提示和回复的富输出短代码协议"
read_when:
  - 更改 Control UI 中的助手输出渲染时
  - 调试 `[embed ...]`、`MEDIA:`、回复或音频呈现指令时
title: "富输出协议"
---

助手输出可以携带一小组传递/渲染指令：

- `MEDIA:` 用于附件传递
- `[[audio_as_voice]]` 用于音频呈现提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用于回复元数据
- `[embed ...]` 用于 Control UI 的富渲染

远程 `MEDIA:` 附件必须是公开的 `https:` URL。普通的 `http:`、
回环、链路本地、私有和内部主机名会被忽略为附件
指令；服务器端媒体抓取器仍会执行其自身的网络保护。

本地 `MEDIA:` 附件可以使用绝对路径、工作区相对路径或
相对于主目录的 `~/` 路径。它们在传递前仍会经过代理文件读取策略和
媒体类型检查。

普通 Markdown 图片语法默认保持为文本。那些有意
将 Markdown 图片回复映射为媒体附件的频道，会在其出站
适配器中启用该功能；Telegram 就是这样做的，因此 `![alt](url)` 仍然可以变成媒体回复。

这些指令彼此独立。`MEDIA:` 和回复/语音标签仍然是传递元数据；`[embed ...]` 是仅用于 Web 的富渲染路径。
受信任的工具结果媒体在传递前会使用相同的 `MEDIA:` / `[[audio_as_voice]]` 解析器，因此文本工具输出仍然可以将音频附件标记为语音备注。

当启用块流式传输时，`MEDIA:` 仍然是单次传递元数据，适用于一个
轮次。如果同一个媒体 URL 在流式块中发送，并在最终
助手载荷中重复出现，OpenClaw 会只投递一次附件，并从最终载荷中移除重复项。

## `[embed ...]`

`[embed ...]` 是 Control UI 中唯一面向代理的富渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="状态" /]
```

规则：

- `[view ...]` 不再适用于新输出。
- Embed 短代码只会在助手消息表面中渲染。
- 只有基于 URL 的 embed 才会被渲染。使用 `ref="..."` 或 `url="..."`。
- 块形式的内联 HTML embed 短代码不会被渲染。
- Web UI 会从可见文本中移除该短代码，并以内联方式渲染该 embed。
- `MEDIA:` 不是 embed 别名，不应用于富 embed 渲染。

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
