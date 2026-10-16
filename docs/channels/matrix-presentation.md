---
summary: "Matrix OpenClaw-aware 客户端的 MessagePresentation 元数据"
read_when:
  - "构建呈现 OpenClaw 丰富响应的 Matrix 客户端"
  - "调试 com.openclaw.presentation 事件内容时"
title: "Matrix 展示元数据"
---

OpenClaw 会将规范化的 `MessagePresentation` 元数据附加到发出的 Matrix `m.room.message` 事件中，放在 `com.openclaw.presentation` 内容键下。

库存 Matrix 客户端不断渲染纯文本 `body`。 OpenClaw-aware 客户端可以读取结构化元数据并呈现本机 UI，例如按钮、选择、上下文行和分隔线。

## <a id="event-content"></a> 事件内容

```json
{
  "msgtype": "m.text",
  "body": "Select model\n\nChoose model:\n- DeepSeek",
  "com.openclaw.presentation": {
    "version": 1,
    "type": "message.presentation",
    "title": "Select model",
    "tone": "info",
    "blocks": [
      {
        "type": "select",
        "placeholder": "Choose model",
        "options": [
          {
            "label": "DeepSeek",
            "value": "/model deepseek/deepseek-chat -s"
          }
        ]
      }
    ]
  }
}
```

- `version` 是元数据 schema 版本；当前版本为 `1`。`type` 是一个稳定的区分标识符，始终为 `"message.presentation"`。Matrix 适配器只会发送这个版本和类型完全匹配的负载；客户端也应忽略其无法安全解释的未知版本、未知的 `type` 值以及未知的块类型。
- `title` 和 `tone`（`info`、`success`、`warning`、`danger`、`neutral`）是可选提示。
- 按钮和选择选项可以携带键入的 `action`（`{ "type": "command", "command": "/..." }` 或 `{ "type": "callback", "value": "..." }`）以及旧字符串 `value`。当两者都存在时，优先选择 `action`。

## <a id="fallback-behavior"></a> 回退行为

OpenClaw 总是会在 `body` 中渲染可读的纯文本回退内容。结构化元数据是附加性的，基础的 Matrix 互操作性不应依赖它。

回退渲染规则：

- `title`、`text` 和 `context` 内容会渲染为纯文本行。
- 带有 `command` 操作的按钮会渲染为 ``label: `/command` ``，这样命令仍可复制。带有 `callback` 操作或仅使用旧版 `value` 的按钮只渲染标签，以保持不透明的回调值私密；禁用按钮始终只渲染标签。URL 和 web-app 按钮会渲染为 `label: URL`。
- 选择块会将占位符（或 `Options:`）渲染为标题，并附加仅标签的选项行。
- 如果没有任何内容呈现，例如仅显示分隔符，则主体会回退到 `---`。

不受支持的客户端会继续显示后备文本。 OpenClaw-aware 客户端可能更喜欢显示结构化元数据，同时保留复制、搜索、通知和可访问性的后备。

## <a id="supported-blocks"></a> 支持的区块

Matrix 出站适配器原生支持以下内容：

- `buttons`
- `select`
- `context`
- `divider`

`text` 区块始终通过 fallback 正文支持。请将所有区块视为尽力呈现的提示；忽略未知字段和区块类型，而不是使整条消息失败。

## <a id="interactions"></a> 交互

此元数据不会添加 Matrix 回调语义。按钮和选择值是备用交互载荷，通常是斜杠命令或文本命令。希望支持交互的 Matrix 客户端会解析控件值（`action.command`，然后是 `action.value`，最后是 `value`），并将其作为普通消息发送回房间。

例如，可以通过在同一房间中将值作为加密的 Matrix 文本消息发送来处理值为 `/model deepseek/deepseek-chat -s` 的按钮。无论 [ 模型选择范围 ](/gateway/config-agents/models#agentsdefaultsmodelselectionscope) 设置如何，显式会话标志都会阻止配置的默认更新。

## <a id="relationship-to-approval-metadata"></a> 与审批元数据的关系

`com.openclaw.presentation` 用于通用的富消息展示。

审批提示使用专用的 `com.openclaw.approval` 元数据，因为审批携带安全敏感状态、决策以及 exec/plugin 详情。如果同一事件上同时存在这两个元数据键，客户端应优先使用专用的审批渲染器。

## <a id="media-messages"></a> 媒体消息

当回复包含多个媒体 URL 时，OpenClaw 为每个媒体 URL 发送一个 Matrix 事件。字幕文本和演示元数据仅附加到第一个事件，因此客户端可以获得一个稳定的结构化负载，而无需重复的渲染器。当长文本跨事件分块时，同样的规则适用：元数据仅依赖于第一个事件。

保持展示元数据紧凑。较大的用户可见文本应保留在 `body` 中，并使用标准的 Matrix 文本分块路径。
