---
summary: "openclaw health 的 CLI 参考（通过 RPC 获取网关健康快照）"
read_when:
  - 你想快速检查正在运行的 Gateway 的健康状态
title: "健康"
---

# `openclaw health`

从正在运行的 Gateway 获取健康状态。

## 选项

| 标志             | 默认值 | 描述                                                           |
| ---------------- | ------- | -------------------------------------------------------------- |
| `--json`         | `false` | 以机器可读的 JSON 代替文本输出。                                 |
| `--timeout <ms>` | `10000` | 连接超时时间，单位为毫秒。                                       |
| `--verbose`      | `false` | 详细日志。强制进行实时探测，并展开每个代理的输出。             |
| `--debug`        | `false` | `--verbose` 的别名。                                           |

示例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

说明：

- 默认的 `openclaw health` 会向正在运行的 gateway 请求其健康快照。当
  gateway 已经有最新的缓存快照时，它可以返回该缓存载荷，并在后台
  刷新。
- `--verbose` 会强制进行实时探测，打印 gateway 连接详情，并将
  可读输出扩展到所有已配置的账户和代理。
- 当配置了多个代理时，输出会包含每个代理的会话存储。

## 相关

- [CLI reference](/cli)
- [Gateway health](/gateway/health)
