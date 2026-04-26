---
summary: "`openclaw health` 的 CLI 参考（通过 RPC 获取网关健康快照）"
read_when:
  - 你想快速检查正在运行的 Gateway 的健康状态
title: "Health"
---

# `openclaw health`

获取正在运行的网关的健康状态。

选项：

- `--json`: 机器可读的输出
- `--timeout <ms>`: 连接超时时间（毫秒）（默认 `10000`）
- `--verbose`: 详细日志
- `--debug`: `--verbose` 的别名

示例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

说明：

- 默认情况下，`openclaw health` 会向正在运行的网关请求其健康快照。当
  网关已经拥有最新的缓存快照时，它可以返回该缓存载荷，并在后台
  刷新。
- `--verbose` 会强制执行一次实时探测，打印网关连接详情，并将
  人类可读的输出扩展到所有已配置的账户和代理。
- 当配置了多个代理时，输出会包含每个代理的会话存储。

## 相关

- [CLI reference](/cli)
- [Gateway health](/gateway/health)
