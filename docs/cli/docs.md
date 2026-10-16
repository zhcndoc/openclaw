---
summary: "`openclaw docs` 的 CLI 参考（搜索实时文档索引）"
read_when:
  - "你想从终端搜索在线 OpenClaw 文档"
  - "您需要知道文档 CLI 调用哪个托管搜索 API"
title: "文档"
---

# `openclaw docs`

从终端搜索实时的 OpenClaw 文档索引。

## <a id="usage"></a> 用法

```bash
openclaw docs                              # print docs entrypoint and example search
openclaw docs --json                       # print the same guidance as JSON
openclaw docs <query...> [--json] [--limit <count>]
```

| Argument/option   | 描述                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `[query...]`      | 自由格式的搜索查询。多词查询会以空格连接后作为一个整体发送。 |
| `--json`          | 在标准输出上生成一个机器可读的 JSON 对象。                                   |
| `--limit <count>` | 最多返回这么多结果。该值必须是正整数。            |

如果没有查询，`openclaw docs` 会打印文档入口 URL 和示例搜索命令，而不是执行搜索。

省略 `--limit` 以显示搜索服务返回的所有结果。该限制适用于显示的结果，并且不会减少下载的响应大小。

## <a id="examples"></a> 示例

```bash
openclaw docs browser existing-session
openclaw docs browser existing-session --json
openclaw docs plugin --limit 5
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

## <a id="how-it-works"></a> 工作原理

`openclaw docs` 会调用 `https://docs.openclaw.ai/api/search` 并渲染 JSON 结果。搜索请求使用固定的 30 秒超时。

## <a id="output"></a> 输出

在富文本（TTY）终端中，结果会渲染为一个标题，后跟一个项目符号列表：页面标题、链接的文档 URL，以及下一行上的一小段摘要。空结果会输出“没有结果。”。

没有结果数组的响应格式错误并且命令失败；它不会被视为没有匹配项的成功搜索。

在非富文本输出中（管道、`--no-color`、脚本），相同的数据会渲染为 Markdown：

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

使用 `--json` 时，stdout 包含一个对象，其中包含规范化的查询和结果列表。未提供查询时，`query` 为 `null`，`url` 为文档入口点，`results` 为空。此时会抑制样式和标题；请求诊断信息仍会输出到 stderr，因此 stdout 可以直接通过管道传递给 JSON 解析器。

发生故障时，`--json` 在 stdout 上发出 [CLI JSON 故障信封 ](/cli#json-failures)，同时在 stderr 上保留错误消息。

## <a id="exit-codes"></a> 退出代码

| 代码 | 含义                                                                  |
| ---- | ------------------------------------------------------------------------ |
| `0`  | 搜索成功，包括零结果响应。                       |
| `1`  | 托管文档搜索 API 调用失败；stderr 会打印错误消息。 |

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [在线文档](https://docs.openclaw.ai)
