---
summary: "从 iPhone 节点启用并调用受隐私保护的 HealthKit 摘要"
read_when:
  - 在 iPhone 节点上启用 HealthKit 摘要时
  - 调用 health.summary 或排查缺失的健康指标时
  - 查看哪些健康数据可以离开 iPhone 时
title: "HealthKit 摘要"
---

# HealthKit 摘要

OpenClaw 可以向已连接的 iPhone 节点请求当前日历日的只读摘要。iPhone 会在设备端计算汇总结果，并且只返回步数、睡眠时长、平均静息心率以及锻炼次数/时长。不支持单个 HealthKit 样本、来源、元数据、临床记录、后台摄取和写入。

此功能默认关闭。它需要在 iPhone 上单独授权，并在 Gateway 上完成授权。

## 要求

- 一台运行 OpenClaw iOS 应用且 HealthKit 报告健康数据可用的 iPhone。
- 一个已连接并获批准的 iPhone 节点。参见 [iOS app setup](/platforms/ios)。
- 一个当前可访问该 iPhone 节点的 Gateway。
- 任何你期望看到的指标都需要有可读取的 Health 数据。Apple Watch 可以向 iPhone 的 Health 存储贡献数据，但 HealthKit 汇总不需要 OpenClaw watchOS 应用。

## 启用访问

### 1. 授权 Gateway 命令

将 `health.summary` 添加到 `openclaw.json` 中现有的 `gateway.nodes.allowCommands` 数组里。保留已存在的任何命令：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["health.summary"],
    },
  },
}
```

`health.summary` 被归类为高隐私风险内容，iOS 平台默认从不允许。`gateway.nodes.denyCommands` 中的条目会覆盖允许条目。另见 [节点命令策略](/nodes#command-policy)。

### 2. 在 iPhone 上启用共享

在 iOS 应用中：

1. 打开 **设置 -> 权限 -> 隐私与访问 -> 健康摘要**。
2. 点击 **启用并共享摘要**。
3. 阅读披露说明，然后在 Apple 的权限表单中选择 OpenClaw 可读取的健康类别。

该开关会记录你为 OpenClaw 做出的明确共享选择。它并不表示 Apple 已授予所有请求的类别。

启用健康摘要会将 `health.summary` 添加到该节点声明的命令范围中。请批准随之产生的节点配对更新：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

然后验证已连接的 iPhone 是否暴露了有效的 `health.summary` 命令：

```bash
openclaw nodes describe --node "<iPhone name>"
```

## 请求今日摘要

仅支持 `today`。它覆盖本地午夜到请求时刻，
使用 iPhone 当前的日历和时区。

```bash
openclaw nodes invoke \
  --node "<iPhone name>" \
  --command health.summary \
  --params '{"period":"today"}' \
  --json
```

代理可以使用 `nodes` 工具调用相同的命令：

```json
{
  "action": "invoke",
  "node": "<iPhone name>",
  "invokeCommand": "health.summary",
  "invokeParamsJson": "{\"period\":\"today\"}"
}
```

摘要载荷包含：

| 字段                     | 含义                                          |
| ------------------------ | --------------------------------------------- |
| `period`                 | 始终为 `today`                                |
| `startISO`               | 一天的本地开始时间，编码为 ISO 时间点          |
| `endISO`                 | 请求时刻，编码为 ISO 时间点                    |
| `timeZoneIdentifier`     | iPhone 时区标识符                             |
| `stepCount`              | 四舍五入后的累计步数                          |
| `sleepDurationMinutes`   | 去重后的睡眠时间，裁剪到今天范围内            |
| `restingHeartRateBpm`    | 平均静息心率                                  |
| `workoutCount`           | 今天开始的锻炼次数                            |
| `workoutDurationMinutes` | 这些锻炼的总时长                              |

指标字段是可选的；当 HealthKit 没有返回可读取的值时，会被省略。睡眠阶段和重叠来源会在计算时长之前合并，因此同一分钟不会被重复计数。

## 隐私行为

- 聚合发生在 iPhone 上。原始样本不会离开设备。
- 请求的聚合会通过你的 Gateway 离开 iPhone。当代理请求它时，聚合会到达已配置的 AI 提供方，并且可能保留在聊天历史中。直接通过 CLI 调用时，它会返回给 CLI 操作员。
- OpenClaw 仅请求读取访问权限。它不能添加或修改 Health 数据。
- OpenClaw 仅在调用 `health.summary` 时读取 HealthKit。不会有
  后台健康数据摄取。
- HealthKit 会刻意不透露读取访问是否被拒绝。缺失的指标可能意味着访问被拒绝、没有匹配的样本，或相关数据类型不可用。OpenClaw 无法区分这些情况。
- 该摘要用于个人健康和健身上下文，而非诊断或医疗建议。

要停止共享，请返回 **Health Summaries** 并点击 **Disable**。随后 iPhone
会从其节点表面移除 Health 功能和 `health.summary` 命令。你也可以从
`gateway.nodes.allowCommands` 中移除 `health.summary`，以关闭 Gateway 端的入口。

## 故障排查

### 该命令未由节点声明

确认 iOS 应用中已启用 Health 摘要，并且 iPhone 已连接。
运行 `openclaw nodes pending` 并批准任何能力更新，然后再次检查
`openclaw nodes describe --node "<iPhone 名称>"`。

### 该命令需要显式选择加入

将 `health.summary` 添加到 `gateway.nodes.allowCommands`。同时检查
`gateway.nodes.denyCommands` 中不包含它；拒绝列表优先。

### `HEALTH_ACCESS_DISABLED`

应用端的共享开关已关闭。在 iPhone 上的 **隐私与访问** 下启用 **Health 摘要**。

### 摘要成功但缺少指标

打开 Apple 的 Health 应用，并确认今天存在数据。检查
OpenClaw 在 Apple 的 Health 设置中的访问权限，但不要将空结果
视为已拒绝访问的证据：HealthKit 会刻意隐藏这种区别。

### 较早的时间范围失败

该命令仅接受 `{"period":"today"}`。不支持多日和历史摘要。

## 相关

- [iOS 应用](/platforms/ios)
- [节点](/nodes)
- [网关配置参考](/gateway/configuration-reference#gateway)
- [安全审计](/gateway/security)
