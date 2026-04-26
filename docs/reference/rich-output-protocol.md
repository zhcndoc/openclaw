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

这些指令是独立的。`MEDIA:` 和回复/语音标签保留为交付元数据；`[embed ...]` 是仅限 Web 的富渲染路径。

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
