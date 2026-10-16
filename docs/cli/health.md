---
summary: "`openclaw health` 的 CLI 参考（通过 RPC 的网关运行状况快照）"
read_when:
  - "你想快速检查正在运行的 Gateway 的健康状态"
title: "健康"
---

# `openclaw health`

通过 WebSocket RPC 从正在运行的 Gateway 获取健康快照（CLI 不直接使用通道套接字）。

## <a id="options"></a> 选项

| 标志             | 默认值 | 描述                                                                       |
| ---------------- | ------- | --------------------------------------------------------------------------------- |
| `--json`         | `false` | 打印机器可读的 JSON，而不是文本。                                      |
| `--timeout <ms>` | `60000` | 以毫秒为单位的连接超时时间。                                               |
| `--verbose`      | `false` | 强制实时检查并扩展所有配置的帐户和代理的输出。 |
| `--debug`        | `false` | `--verbose` 的别名。                                                            |

示例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

## <a id="behavior"></a> 行为

- 本地网关启动使用共享的 60 秒准备预算并报告其观察到的阶段。显式的 `--timeout` 会覆盖该预算。在截止日期前仍在进行的启动会返回非失败结果； JSON 报告 `{ "status": "starting", "startupPhase": "…" }` 而不是运行状况快照。

- 本地就绪状态可识别提供环回服务的通配符侦听器，包括在 macOS 上，其中单独的环回绑定可以在同一端口上成功。

- 如果没有 `--verbose`，网关可以返回缓存的快照并在后台刷新它以供下一个调用者使用。缓存的快照在长达 60 秒内是新鲜的，并且与实时通道运行时状态保持不变。
- `--verbose` 强制对每个通道帐户进行实时检查。它还打印网关连接详细信息。它在所有配置的帐户和代理中扩展了人类可读的输出，而不仅仅是默认代理。
- 未配置或禁用的首选帐户不会隐藏其他活动帐户的检查结果。普通输出仍然遵循默认代理的帐户绑定。 `--verbose` 包括所有帐户。
- 当显示的帐户被禁用时，运行状况文本显示 `disabled` 和 `status --deep` 将其标记为 `OFF`，即使帐户保持配置状态也是如此。
- 不健康的通道线路包括记录的可用启动错误，因此停止的通道会报告其故障原因及其状态。
- 人类可读的输出包括显式、自动或默认启用的插件的失败，以及已配置插件不可用的警告。它最多显示 20 个插件诊断以及省略的计数。这些警告也出现在 `openclaw gateway health` 和 `openclaw status --deep` 的运行状况表中。插件诊断针对单线终端输出进行了清理； JSON 保留快照值。
- 准备就绪后，`--json` 返回完整快照：通道、每个帐户检查、插件加载状态、上下文引擎隔离状态、模型定价缓存状态、事件循环运行状况、交付队列警告和每个代理会话存储。
- Config 读取失败报告不可读的路径和底层错误，而不是缺少凭据诊断。这也适用于 `openclaw gateway health`。
- 会话在文本中老化，JSON 使用网关的时钟。
- 文本中的心跳间隔显示解析的节奏，而不舍入毫秒。周单位会长期保留。
- 顶级 `ok: true` 表示运行状况 RPC 成功并且网关生成了快照。队列和插件警告不会将其更改为 `false`。
- 当出站或会话传递或入站通道事件为死信时，文本输出会报告其计数和最早的故障年龄。入站计数按渠道帐户分组。使用 [`openclaw channels dead-letters`](/cli/channels#inbound-dead-letters) 检查或恢复单个事件。
- 可选 `deliveryQueues.ingressPressure` 总结了可能阻塞后续事件的持久入站通道。它按通道帐户分组，从不公开事件、通道、有效负载、错误、所有者、令牌、会话或目标标识符。有关确切的限定和计数语义，请参阅 [Gateway health](/gateway/health#queue-warnings)。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [`openclaw status`](/cli/status) — 本地诊断和通道检查，无需完整的运行状况快照
- [网关健康状态](/gateway/health)
