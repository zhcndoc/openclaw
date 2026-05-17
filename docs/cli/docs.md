---
summary: "openclaw docs 的 CLI 参考（搜索在线文档索引）"
read_when:
  - 你想从终端搜索实时的 OpenClaw 文档
  - 你需要知道 docs CLI 会调用哪些辅助二进制文件
title: "文档"
---

# `openclaw docs`

从终端搜索实时的 OpenClaw 文档索引。该命令会通过 shell 调用公共的、由 Mintlify 托管的 docs MCP 搜索端点 `https://docs.openclaw.ai/mcp.search_open_claw`，并将结果渲染到你的终端中。

## 用法

```bash
openclaw docs                       # 打印文档入口和示例搜索
openclaw docs <query...>            # 搜索实时文档索引
```

参数：

| Argument     | Description                                                                        |
| ------------ | ---------------------------------------------------------------------------------- |
| `[query...]` | 自由格式的搜索查询。多词查询会用空格连接，并作为一个整体发送。 |

## 示例

```bash
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

如果不提供查询，`openclaw docs` 会打印文档入口 URL 和一个示例搜索命令，而不是执行搜索。

## 工作原理

`openclaw docs` 会调用 `mcporter` CLI 来调用 docs 搜索 MCP 工具，然后将工具输出中的 `Title: / Link: / Content:` 块解析为结果列表。

为了解析 `mcporter`，OpenClaw 按以下顺序检查：

1. `PATH` 上的 `mcporter`（如果存在，则直接使用）。
2. 如果安装了 `pnpm`，则使用 `pnpm dlx mcporter ...`。
3. 如果安装了 `npx`，则使用 `npx -y mcporter ...`。

如果都不可用，命令会失败，并提示安装 `pnpm`（`npm install -g pnpm`）。

搜索调用使用固定的 30 秒超时。每条结果摘要会被截断到大约 220 个字符。

## 输出

在支持富文本（TTY）的终端中，结果会以标题加项目符号列表的形式渲染。每个项目符号会显示页面标题、链接的文档 URL，以及下一行的简短摘要。空结果会打印 "No results."。

在非富文本输出中（管道、`--no-color`、脚本），相同的数据会渲染为 Markdown：

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## 退出码

| Code | Meaning                                             |
| ---- | --------------------------------------------------- |
| `0`  | 搜索成功（包括零结果响应）。 |
| `1`  | MCP 工具调用失败；stderr 会内联打印。 |

## 相关

- [CLI 参考](/cli)
- [在线文档](https://docs.openclaw.ai)
