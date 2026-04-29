---
summary: "openclaw docs 的 CLI 参考（搜索在线文档索引）"
read_when:
  - 你希望从终端搜索 OpenClaw 在线文档
title: "文档"
---

# `openclaw docs`

搜索在线文档索引。

参数：

- `[query...]`：发送到在线文档索引的搜索词

示例：

```bash
openclaw docs
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

说明：

- 不带查询词时，`openclaw docs` 会打开在线文档搜索入口。
- 多词查询会作为一次搜索请求传递。

## 相关

- [CLI 参考](/cli)
