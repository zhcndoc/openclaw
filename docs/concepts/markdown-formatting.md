---
summary: "面向外发渠道的 Markdown 格式化流程"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Markdown formatting"
---

OpenClaw 通过先将出站 Markdown 转换为共享的中间表示（IR），再渲染为各渠道特定输出来进行格式化。IR 会保留源文本原样，同时携带样式/链接区间，以便分块和渲染在各渠道间保持一致。

## 目标

- **一致性：** 一次解析，多种渲染器。
- **安全拆分：** 在渲染前拆分文本，确保行内格式在分块中不被破坏。
- **渠道适配：** 同一 IR 可映射为 Slack mrkdwn、Telegram HTML 及 Signal 样式区间，无需重新解析 Markdown。

## 流程

1. **解析 Markdown -> IR**
   - IR 是纯文本加样式区间（加粗/斜体/删除线/代码/剧透）和链接区间。
   - 偏移量使用 UTF-16 代码单元，以便 Signal 样式区间与其 API 对齐。
   - 仅当某渠道启用表格转换时才解析表格。
2. **拆分 IR（优先格式）**
   - 在 IR 文本上拆分，渲染前完成。
   - 行内格式在块内完整，区间按块切片。
3. **各渠道渲染**
   - **Slack：** mrkdwn 令牌（加粗/斜体/删除线/代码），链接格式 `<url|label>`。
   - **Telegram：** HTML 标签 (`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`)。
   - **Signal：** 纯文本 + `text-style` 区间；标签与 URL 不同则链接显示为 `label (url)`。

## IR 示例

输入 Markdown：

```markdown
你好 **世界** — 参见 [文档](https://docs.openclaw.ai)。
```

IR（示意）：

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## 使用场景

- Slack、Telegram 和 Signal 外发适配器从 IR 进行渲染。
- 其他渠道（WhatsApp、iMessage、Microsoft Teams、Discord）仍使用纯文本或
  各自的格式化规则，在启用时于分块前应用 Markdown 表格转换。

## 表格处理

Markdown 表格在各聊天客户端支持不统一。使用 `markdown.tables` 为各渠道（及账户）控制转换方式。

- `code`：将表格渲染为代码块（多渠道默认）。
- `bullets`：将每行转换成项目符号列表（Signal 和 WhatsApp 默认）。
- `off`：禁用表格解析和转换，保留原始表格文本。

配置示例：

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      work:
        markdown:
          tables: off
```

## 拆分规则

- 拆分限制由渠道适配器/配置提供，应用于 IR 文本。
- 代码块保持为单一块，尾部带换行，确保渠道正确渲染。
- 列表前缀和引用前缀属于 IR 文本，拆分时不会断开前缀。
- 行内样式（加粗/斜体/删除线/行内代码/剧透）不跨块拆分，渲染器在每块内重新开启样式。

如需了解更多跨渠道拆分行为，请参阅 [流式 + 拆分](/concepts/streaming)。

## 链接策略

- **Slack：** `[label](url)` 转 `<url|label>`；裸 URL 保持不变。解析时禁用自动链接，避免重复。
- **Telegram：** `[label](url)` 转 `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：** `[label](url)` 转为 `label (url)`，标签与 URL 相同时保留标签。

## 剧透

剧透标记 (`||spoiler||`) 仅为 Signal 解析，映射为 SPOILER 样式区间。其他渠道视为普通文本。

## 如何添加或更新渠道格式化器

1. **统一解析：** 使用共享的 `markdownToIR(...)` 辅助，传入渠道适用的选项（自动链接、标题样式、引用前缀）。
2. **渲染实现：** 用 `renderMarkdownWithMarkers(...)` 和样式标记映射（或 Signal 样式区间）实现渲染。
3. **拆分处理：** 渲染前调用 `chunkMarkdownIR(...)` 并对每块渲染。
4. **接入适配器：** 更新渠道出站适配器，使用新拆分器和渲染器。
5. **测试完善：** 添加或更新格式化测试，支持拆分的渠道要增加出站交付测试。

## 常见问题

- Slack angle-bracket tokens (`<@U123>`, `<#C123>`, `<https://...>`) must be
  preserved; escape raw HTML safely.
- Telegram HTML requires escaping text outside tags to avoid broken markup.
- Signal style ranges depend on UTF-16 offsets; do not use code point offsets.
- Preserve trailing newlines for fenced code blocks so closing markers land on
  their own line.

## 相关内容

- [流式 + 拆分](/concepts/streaming)
- [系统提示词](/concepts/system-prompt)
