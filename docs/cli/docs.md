---
summary: "openclaw docs 的 CLI 参考（搜索在线文档索引）"
read_when:
  - 你想从终端搜索在线 OpenClaw 文档
  - 你需要知道 docs CLI 调用的是哪个托管搜索 API
title: "文档"
---

# `openclaw docs`

从终端搜索实时的 OpenClaw 文档索引。

## 用法

```bash
openclaw docs                       # 打印文档入口和示例搜索
openclaw docs <query...>            # 搜索实时文档索引
```

| 参数         | 描述                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| `[query...]` | 自由格式的搜索查询。多词查询会用空格连接，并作为一个整体发送。 |

如果没有查询，`openclaw docs` 会打印文档入口 URL 和示例搜索命令，而不是执行搜索。

## 示例

```bash
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

## 它是如何工作的

`openclaw docs` 会调用 `https://docs.openclaw.ai/api/search` 并渲染 JSON 结果。搜索请求使用固定的 30 秒超时。

## 输出

在富文本（TTY）终端中，结果会渲染为一个标题，后跟一个项目符号列表：页面标题、链接的文档 URL，以及下一行上的一小段摘要。空结果会输出“No results.”。

在非富文本输出中（管道、`--no-color`、脚本），相同的数据会渲染为 Markdown：

```markdown
# 文档搜索：<query>

- [标题](https://docs.openclaw.ai/...) - 摘要
- [标题](https://docs.openclaw.ai/...) - 摘要
```

## 退出码

| Code | Meaning                                                                  |
| ---- | ------------------------------------------------------------------------ |
| `0`  | 搜索成功，包括零结果响应。                       |
| `1`  | 托管文档搜索 API 调用失败；stderr 会打印错误消息。 |

## 相关

- [CLI 参考](/cli)
- [在线文档](https://docs.openclaw.ai)
