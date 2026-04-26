---
summary: "`openclaw docs` 的命令行参考（搜索实时文档索引）"
read_when:
  - 你想从终端搜索实时的 OpenClaw 文档
title: "文档"
---

# `openclaw docs`

搜索实时文档索引。

参数：

- `[query...]`: 发送到实时文档索引的搜索词

示例：

```bash
openclaw docs
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

说明：

- 不带查询时，`openclaw docs` 会打开实时文档搜索入口。
- 多词查询会作为一次搜索请求原样传递。

## 相关内容

- [CLI 参考](/cli)
