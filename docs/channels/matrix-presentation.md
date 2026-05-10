---
summary: "用于 OpenClaw 感知客户端的 Matrix MessagePresentation 元数据"
read_when:
  - 构建渲染 OpenClaw 富响应的 Matrix 客户端时
  - 调试 com.openclaw.presentation 事件内容时
title: "Matrix 展示元数据"
---

OpenClaw 可以将规范化的 `MessagePresentation` 元数据附加到发往 Matrix `m.room.message` 事件的 `com.openclaw.presentation` 下。

标准 Matrix 客户端会继续渲染纯文本 `body`。OpenClaw 感知客户端可以读取结构化元数据并渲染原生 UI，例如按钮、选择器、上下文行和分隔线。

## 事件内容

元数据存储在 Matrix 事件内容中：

```json
{
  "msgtype": "m.text",
  "body": "选择模型\n\n- DeepSeek: /model deepseek/deepseek-chat",
  "com.openclaw.presentation": {
    "version": 1,
    "type": "message.presentation",
    "title": "选择模型",
    "tone": "info",
    "blocks": [
      {
        "type": "select",
        "placeholder": "选择模型",
        "options": [
          {
            "label": "DeepSeek",
            "value": "/model deepseek/deepseek-chat"
          }
        ]
      }
    ]
  }
}
```

`version` 是 Matrix 展示元数据的 schema 版本。`type` 是 OpenClaw 感知客户端使用的稳定区分符。客户端应忽略未知的 `type` 值、无法安全解释的未知版本，以及未知的 block 类型。

## 回退行为

OpenClaw 总是会在 `body` 中渲染可读的纯文本回退内容。结构化元数据是附加性的，基础的 Matrix 互操作性不应依赖它。

不支持的客户端应继续显示回退文本。OpenClaw 感知客户端可以优先使用结构化元数据进行显示，同时保留回退文本用于复制、搜索、通知和可访问性。

## 支持的 block

Matrix 出站适配器声明支持：

- `buttons`
- `select`
- `context`
- `divider`

客户端应将这些 block 视为尽力而为的展示提示。未知字段和未知 block 类型应被忽略，而不是导致整条消息渲染失败。

## 交互

此元数据不添加 Matrix 回调语义。按钮和 select 选项的 value 是回退交互负载，通常是斜杠命令或文本命令。想要支持交互的 Matrix 客户端可以将所选 value 作为普通消息发送回房间。

例如，值为 `/model deepseek/deepseek-chat` 的按钮可以通过在同一房间中将该值作为加密的 Matrix 文本消息发送来处理。

## 与审批元数据的关系

`com.openclaw.presentation` 用于通用的富消息展示。

审批提示使用专用的 `com.openclaw.approval` 元数据，因为审批携带安全敏感状态、决策以及 exec/plugin 详情。如果同一事件上同时存在这两个元数据键，客户端应优先使用专用的审批渲染器。

## 媒体消息

当一条回复包含多个媒体 URL 时，OpenClaw 会为每个媒体 URL 发送一个 Matrix 事件。展示元数据只附加到第一个媒体事件上，这样客户端就有一个稳定的结构化负载，并避免重复渲染器。

保持展示元数据紧凑。较大的用户可见文本应保留在 `body` 中，并使用标准的 Matrix 文本分块路径。
