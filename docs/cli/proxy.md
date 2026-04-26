---
summary: "CLI 参考：`openclaw proxy`，本地调试代理和捕获检查器"
read_when:
  - 你需要在本地捕获 OpenClaw 传输流量以进行调试
  - 你想检查调试代理会话、blob 或内置查询预设
title: "代理"
---

# `openclaw proxy`

运行本地显式调试代理并检查捕获的流量。

这是一个用于传输层调查的调试命令。它可以启动一个
本地代理，使用启用捕获的子命令运行命令，列出捕获会话，
查询常见流量模式，读取捕获的 blob，并清除本地捕获
数据。

## 命令

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## 查询预设

`openclaw proxy query --preset <name>` 接受：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## 注释

- `start` 默认使用 `127.0.0.1`，除非设置了 `--host`。
- `run` 会启动一个本地调试代理，然后在 `--` 之后运行命令。
- 捕获内容是本地调试数据；完成后请使用 `openclaw proxy purge`。

## 相关

- [CLI 参考](/cli)
- [可信代理认证](/gateway/trusted-proxy-auth)
