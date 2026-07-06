---
summary: "用于出站频道的 Markdown 格式化流水线"
read_when:
  - 你正在更改出站频道的 markdown 格式化或分块
  - 你正在添加新的频道格式化器或样式映射
  - 你正在调试跨频道的格式化回归问题
title: "Markdown 格式化"
---

OpenClaw 在渲染特定频道的输出之前，会将出站 Markdown 转换为共享的中间表示（IR）。IR 保留纯文本以及样式/链接跨度，因此一次解析即可服务于所有频道，并且分块时绝不会在跨度中间拆分格式。

## 流水线

1. **将 Markdown 解析为 IR** (`markdownToIR`) - 纯文本加样式范围
   （粗体、斜体、删除线、代码、代码块、spoiler、blockquote、
   1-6 级标题）以及链接范围。偏移量使用 UTF-16 代码单元，因此 Signal 风格的
   范围可以直接与其 API 对齐。只有当频道启用表格模式时，表格才会被解析。
2. **对 IR 进行分块** (`chunkMarkdownIR` / `renderMarkdownIRChunksWithinLimit`)
   - 分块发生在渲染之前的 IR 文本上，因此内联样式和链接会按每个块切分，
   而不是跨越边界被截断。
3. **按频道渲染** (`renderMarkdownWithMarkers`) - 样式标记映射
   会将范围转换为该频道的原生标记语言。

| Channel                                                          | Renderer                                                                             | Notes                                                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Slack                                                            | mrkdwn 记号（`*bold*`、`_italic_`、`` `code` ``、代码围栏）                      | 链接会变成 `<url\|label>`；解析时禁用自动链接，以避免重复链接      |
| Telegram                                                         | HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`、`<tg-spoiler>`） | 在启用 `richMessages` 时，还支持富消息表格和标题（`<h1>`-`<h6>`） |
| Signal                                                           | 纯文本 + `text-style` 范围                                                     | 当标签与 URL 不同时，链接会渲染为 `label (url)`                        |
| Discord, WhatsApp, iMessage, Microsoft Teams, and other channels | 纯文本                                                                           | 不使用基于 IR 的样式；Markdown 表格转换仍会通过 `convertMarkdownTables` 运行    |

## IR 示例

输入 Markdown：

```markdown
Hello **world** - see [docs](https://docs.openclaw.ai).
```

IR（示意）：

```json
{
  "text": "你好 world - 查看 docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 18, "end": 22, "href": "https://docs.openclaw.ai" }]
}
```

## 表格处理

`markdown.tables` 控制某个频道如何转换 Markdown 表格，可按
频道设置，也可按账户单独设置：

| 模式      | 行为                                                                                 |
| --------- | ------------------------------------------------------------------------------------ |
| `code`    | 在代码块中渲染为对齐的 ASCII 表格（回退默认值）                                      |
| `bullets` | 将每一行转换为 `label: value` 项目符号列表                                            |
| `block`    | 在传输支持原生表格时保留原生表格；否则回退到 `code`                                  |
| `off`     | 禁用表格解析；原始表格文本将原样透传                                                   |

各频道的插件默认值：Signal、WhatsApp 和 Matrix 的默认值为
`bullets`；Mattermost 的默认值为 `off`；Telegram 的默认值为 `block`（当
账户未启用 `richMessages` 时会解析为 `code`）。任何没有显式插件默认值的频道都会回退到 `code`。

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

- 分块限制来自通道适配器/配置，并适用于 IR 文本，而不是
  渲染后的输出。
- 围栏代码块会作为一个整体保留，并在末尾附加一个换行符，以便
  各通道能够正确渲染结束围栏。
- 列表和引用前缀是 IR 文本的一部分，因此分块时不会在前缀中间
  进行拆分。
- 行内样式不会跨块拆分；渲染器会在下一块的开头重新打开已开启的
  样式。

有关块边界和跨通道传递行为，请参阅 [流式传输和分块](/concepts/streaming)。

## 链接策略

- **Slack：** `[label](url)` -> `<url|label>`；裸 URL 保持裸露。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：** `[label](url)` -> `label (url)`，除非标签已经
  与 URL 匹配。

## 剧透

剧透标记（`||spoiler||`）会在 Signal 中被解析（映射为 `SPOILER`
样式范围），并在 Telegram 中被解析（映射为 `<tg-spoiler>`）。其他渠道会将
`||...||` 视为普通文本。

## 添加或更新通道格式化器

1. **解析一次**，使用 `markdownToIR(...)`，并传入与通道相适配的
   选项（`autolink`、`headingStyle`、`blockquotePrefix`、`tableMode`）。
2. 使用样式标记映射（或
   对于像 Signal 这样的传输方式使用自定义样式范围逻辑）通过 `renderMarkdownWithMarkers(...)` 进行**渲染**。
3. 在渲染每个块之前，使用 `chunkMarkdownIR(...)` 或
   `renderMarkdownIRChunksWithinLimit(...)` 进行**分块**。
4. **连接适配器**，从
   出站发送路径中调用新的分块器和渲染器。
5. 用格式测试以及通道进行分块时的出站投递测试进行**测试**。

## 常见陷阱

- Slack angle-bracket tokens (`<@U123>`, `<#C123>`, `<https://...>`) 必须
  在转义后仍然保留；原始 HTML 仍需要安全地进行转义。
- Telegram HTML 要求对标签外的文本进行转义，以避免标记损坏。
- Signal 样式范围使用 UTF-16 偏移量，而不是代码点偏移量。
- 保留围栏代码块末尾的换行，以便闭合标记
  单独位于一行。

## 相关内容

<CardGroup cols={2}>
  <Card title="流式传输与分块" href="/concepts/streaming" icon="bars-staggered">
    出站流式传输行为、分块边界以及频道特定的交付。
  </Card>
  <Card title="系统提示词" href="/concepts/system-prompt" icon="message-lines">
    模型在对话前看到的内容，包括注入的工作区文件。
  </Card>
</CardGroup>
