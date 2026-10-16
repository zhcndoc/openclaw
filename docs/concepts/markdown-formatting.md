---
summary: "用于出站频道的 Markdown 格式化流水线"
read_when:
  - "你正在更改出站频道的 markdown 格式化或分块"
  - "你正在添加新的频道格式化器或样式映射"
  - "你正在调试跨频道的格式化回归问题"
title: "Markdown 格式化"
---

在渲染特定于通道的输出之前，OpenClaw 将出站 Markdown 转换为共享中间表示 （IR）。 IR 保留纯文本加上 style/link 跨度，因此一个解析步骤可提供每个通道，并且分块不会在跨度中间分割格式。

## <a id="pipeline"></a> 流水线

1. **将 Markdown 解析为 IR** (`markdownToIR`) - 纯文本加样式范围 （粗体、斜体、删除线、代码、代码块、spoiler、blockquote、 1-6 级标题）以及链接范围。偏移量使用 UTF-16 代码单元，因此 Signal 风格的范围可以直接与其 API 对齐。只有当频道启用表格模式时，表格才会被解析。
2. **对 IR 进行分块** (`chunkMarkdownIR` / `renderMarkdownIRChunksWithinLimit`)
   - 样式和链接范围与文本一起切片。渲染大小分块器在通道转义和链接重写之后测量每个候选者，并返回接受的源切片及其渲染的有效负载。
3. 每个通道的 **Render** （`renderMarkdownWithMarkers`） - 样式标记映射将跨度转换为通道的本机标记。

原始内联 HTML 词位在解析期间保留其原始字节。 Markdown 属性值内的标记和实体或识别的内联注释不会解析为 Markdown 内容。非序列化的创作标签范围让 HTML-aware 渲染器解释这些标签；其他渲染器保留它们的字面意思或转义它们。 HTML 块解析保持禁用状态，因此容器内的 Markdown 仍然有效，并且其主体中的裸 URL 保留正常链接。

共享 IR 渲染器的示例：

| 渠道  | 渲染器                                                                             | 笔记                                                                                    |
| -------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Matrix   | HTML 标签，包括本机表                                                   | 自动回复、直接发送和媒体字幕使用相同的格式化程序               |
| Signal   | 纯文本 + `text-style` 范围                                                     | 当标签与 URL 不同时，链接会渲染为 `label (url)`                        |
| Slack    | mrkdwn 记号（`*bold*`、`_italic_`、`` `code` ``、代码围栏）                      | 链接会变成 `<url\|label>`；解析时禁用自动链接，以避免重复链接      |
| Telegram | HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`、`<tg-spoiler>`） | 当 `richMessages` 打开时，还支持丰富消息表和标题 （`<h1>`-`<h6>`） |
| WhatsApp | WhatsApp 风格标记                                                               | 使用共享IR；渲染后测量样式块                               |

## <a id="ir-example"></a> IR 示例

输入 Markdown：

```markdown
Hello **world** - see [docs](https://docs.openclaw.ai).
```

IR（示意）：

```json
{
  "text": "Hello world - see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## <a id="table-handling"></a> 表格处理

`markdown.tables` 控制某个频道如何转换 Markdown 表格，可按频道设置，也可按账户单独设置：

| 模式      | 行为                                                                             |
| --------- | ------------------------------------------------------------------------------------ |
| `code`    | Render 作为代码块内对齐的 ASCII 表（后备默认值）              |
| `bullets` | 将每一行转换为 `label: value` 项目符号列表                                   |
| `block`   | 在传输支持原生表格时保留原生表格；否则回退到 `code` |
| `off`     | 禁用表格解析；原始表格文本将原样透传                       |

表格单元格中的内联代码在每个启用的表格模式中保留其解析的内容，包括前导空格和尾随空格。

每通道插件默认值：Matrix 默认为 `block`（本机表）； Mattermost 默认为 `off`； Signal和WhatsApp默认为`bullets`； Telegram 默认为 `block`（解析为 `code`，除非账户启用了 `richMessages`）。任何没有显式插件默认值的通道都会回退到 `code`。

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

## <a id="chunking-rules"></a> 分块规则

- Chunk限制来自通道adapters/config. `chunkMarkdownIR`限制IR文本； `renderMarkdownIRChunksWithinLimit` 测量传输大小单元中的最终有效负载，包括转义和重写链接。
- 围栏代码块会作为一个整体保留，并在末尾附加一个换行符，以便各通道能够正确渲染结束围栏。
- 列表和引用前缀是 IR 文本的一部分，因此分块时不会在前缀中间进行拆分。
- 列表项内的段落、标题和代码块在 IR 中保持分离，包括嵌套在带引号的列表项内的段落。
- 行内样式不会跨块拆分；渲染器会在下一块的开头重新打开已开启的样式。

有关块边界和跨通道传递行为，请参阅 [流式传输和分块](/concepts/streaming)。

## <a id="link-policy"></a> 链接策略

- **Slack：** `[label](url)` -> `<url|label>`；裸 URL 保持裸露状态。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：** `[label](url)` -> `label (url)`，除非标签已经与 URL 匹配。

## <a id="spoilers"></a> 剧透

剧透标记（`||spoiler||`）会在 Signal 中被解析（映射为 `SPOILER` 样式范围），并在 Telegram 中被解析（映射为 `<tg-spoiler>`）。其他渠道会将 `||...||` 视为普通文本。

## <a id="collapsible-details"></a> 可折叠详情

启用 `richMessages: true` 的 Control UI 和 Telegram 账户会将 `<details><summary>Label</summary>` 披露内容渲染为原生可折叠区块。 OpenClaw 只会在当前回复界面支持该选项时将其告知模型。其他渠道，包括未启用富消息的 Telegram 账户， 会将每个披露内容展平为 `**Summary**`，然后接上可见正文，这样就不会隐藏或丢失任何内容。

## <a id="adding-or-updating-a-channel-formatter"></a> 添加或更新通道格式化器

1. **解析一次**，使用 `markdownToIR(...)`，并传入与通道相适配的选项（`autolink`、`headingStyle`、`blockquotePrefix`、`tableMode`）。
2. **Render** 与 `renderMarkdownWithMarkers(...)` 和样式标记映射（或用于 Signal 等传输的自定义样式范围逻辑）。
3. **Chunk** 与 `chunkMarkdownIR(...)` 或 `renderMarkdownIRChunksWithinLimit(...)`。后者返回测量的`rendered`负载；直接使用它而不是再次渲染源。
4. **连接适配器**，从出站发送路径中调用新的分块器和渲染器。
5. 用格式测试以及通道进行分块时的出站投递测试进行**测试**。

对于不相交的文本替换和插入，`openclaw/plugin-sdk/text-chunking` 导出 `applyMarkdownTextEdits(text, edits)`。编辑使用 UTF-16 源坐标；结果包含已编辑的 `text` 和 `mapOffset` 用于替换内部外部的边界。每次编辑都会在其结束时和结束后移动偏移量。在同一位置的插入保留调用者顺序并先于从那里开始的替换。渲染器决定哪些样式包含替换文本。

## <a id="common-gotchas"></a> 常见陷阱

- Slack 角括号标记（`<@U123>`、`<#C123>`、`<https://...>`）必须在转义后仍然保留；原始 HTML 仍需要安全地进行转义。
- Telegram HTML 要求对标签外的文本进行转义，以避免标记损坏。
- Signal 样式范围使用 UTF-16 偏移量，而不是代码点偏移量。
- 保留围栏代码块末尾的换行，以便闭合标记单独位于一行。
- 代码跨度解析保留全空间内容。仅当两端都存在并且内容不全是空格时，它才会从每一端移除一个周围空格。
- Assistant-reply cleanup 删除 Markdown 代码之外的有效 `<final>` 标记，包括嵌套或杂散标记，同时保留其随附的答案文本。将文字 `<final>payload</final>` 示例放入内联代码或隔离代码块中，以便保留它们的标签。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="流式传输与分块" href="/concepts/streaming" icon="bars-staggered">
    出站流式传输行为、分块边界以及频道特定的交付。
  </Card>
  <Card title="系统提示词" href="/concepts/system-prompt" icon="message-lines">
    模型在对话前看到的内容，包括注入的工作区文件。
  </Card>
</CardGroup>
