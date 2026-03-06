---
summary: "`openclaw health` 的 CLI 参考（通过 RPC 获取网关健康状态端点）"
read_when:
  - 你想快速检查正在运行的网关的健康状态
title: "health"
---

# `openclaw health`

获取正在运行的网关的健康状态。

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

说明：

- `--verbose` 会执行实时探测，并在配置了多个账户时打印每个账户的耗时。
- 输出包括配置了多个代理时每个代理的会话存储信息。
