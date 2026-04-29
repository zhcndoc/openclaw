---
summary: "Markdown 格式化流水线，用于出站频道"
read_when:
  - 你正在更改出站频道的 markdown 格式化或分块
  - 你正在添加新的频道格式化器或样式映射
  - 你正在调试跨频道的格式化回归问题
title: "Markdown 格式化"
---

OpenClaw 通过先将出站 Markdown 转换为共享的中间
表示（IR），再渲染为特定频道输出来进行格式化。IR 会保留
源文本不变，同时携带样式/链接跨度，以便分块和渲染能
在各频道之间保持一致。

## 目标

- **一致性：** 一次解析，多种渲染器。
- **安全分块：** 在渲染前拆分文本，这样行内格式永远不会
  跨越分块边界。
- **频道适配：** 将同一 IR 映射到 Slack mrkdwn、Telegram HTML 和 Signal
  样式范围，而无需重新解析 Markdown。

## 流水线

1. **解析 Markdown -> IR**
   - IR 是纯文本加上样式跨度（粗体/斜体/删除线/代码/剧透）和链接跨度。
   - 偏移量使用 UTF-16 代码单元，因此 Signal 的样式范围能与其 API 对齐。
   - 仅当某个频道启用表格转换时，才会解析表格。
2. **分块 IR（先格式化）**
   - 分块发生在渲染之前，基于 IR 文本进行。
   - 行内格式不会跨越分块边界；跨度会按每个分块进行切片。
3. **按频道渲染**
   - **Slack：** mrkdwn 令牌（粗体/斜体/删除线/代码），链接使用 `<url|label>`。
   - **Telegram：** HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal：** 纯文本 + `text-style` 范围；当标签与链接不同名时，链接会变成 `label (url)`。

## IR 示例

输入 Markdown：

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR（示意）：

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## 使用位置

- Slack、Telegram 和 Signal 的出站适配器都从 IR 渲染。
- 其他频道（WhatsApp、iMessage、Microsoft Teams、Discord）仍然使用纯文本或
  其各自的格式化规则，并在启用时于分块前应用 Markdown 表格转换。

## 表格处理

Markdown 表格在聊天客户端中的支持并不一致。使用
`markdown.tables` 来按频道（以及按账户）控制转换。

- `code`：将表格渲染为代码块（大多数频道的默认值）。
- `bullets`：将每一行转换为项目符号列表（Signal + WhatsApp 的默认值）。
- `off`：禁用表格解析和转换；原始表格文本直接透传。

配置键：

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

## 分块规则

- 分块限制来自频道适配器/配置，并应用于 IR 文本。
- 代码围栏会作为单个块保留，并在末尾保留一个换行符，以便频道
  能正确渲染它们。
- 列表前缀和引用块前缀都是 IR 文本的一部分，因此分块时
  不会在前缀中间拆分。
- 行内样式（粗体/斜体/删除线/行内代码/剧透）绝不会跨越
  分块；渲染器会在每个分块内重新开启样式。

如果你需要了解更多跨频道的分块行为，请参见
[Streaming + chunking](/concepts/streaming)。

## 链接策略

- **Slack：** `[label](url)` -> `<url|label>`；裸 URL 仍保持裸链接。解析期间会禁用自动链接，
  以避免重复链接。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：** `[label](url)` -> `label (url)`，除非标签与 URL 相同。

## 剧透

剧透标记（`||spoiler||`）仅为 Signal 解析，在那里它们会映射为
SPOILER 样式范围。其他频道将其视为纯文本。

## 如何添加或更新频道格式化器

1. **解析一次：** 使用共享的 `markdownToIR(...)` 辅助函数，并配合频道适用的
   选项（autolink、heading style、blockquote prefix）。
2. **渲染：** 实现一个带有 `renderMarkdownWithMarkers(...)` 和
   样式标记映射（或 Signal 样式范围）的渲染器。
3. **分块：** 在渲染前调用 `chunkMarkdownIR(...)`；对每个分块进行渲染。
4. **接线适配器：** 更新该频道的出站适配器以使用新的分块器
   和渲染器。
5. **测试：** 如果该频道使用分块，添加或更新格式测试和出站交付测试。

## 常见陷阱

- 必须保留 Slack 的尖括号令牌（`<@U123>`、`<#C123>`、`<https://...>`）；
  要安全地转义原始 HTML。
- Telegram HTML 需要对标签外的文本进行转义，以避免标记损坏。
- Signal 样式范围依赖 UTF-16 偏移量；不要使用代码点偏移量。
- 要保留围栏代码块末尾的换行符，这样结束标记会落在
  自己单独的一行。

## 相关内容

- [Streaming and chunking](/concepts/streaming)
- [System prompt](/concepts/system-prompt)
