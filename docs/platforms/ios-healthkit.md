---
summary: "从 iOS 节点启用并调用受隐私保护的 HealthKit 摘要"
read_when:
  - 在 iOS 节点上启用 HealthKit 摘要时
  - 调用 health.summary 或排查缺失的健康指标时
  - 审查哪些健康数据可以离开 iOS 设备时
title: "HealthKit 摘要"
---

# HealthKit 摘要

OpenClaw 可以从已连接的 iPhone 或 iPad 节点请求当前日历日的只读摘要。设备会在本地计算聚合结果，并且仅返回步数、睡眠时长、平均静息心率，以及锻炼次数/时长。不支持单个 HealthKit 样本、来源、元数据、临床记录、后台摄取和写入。

此功能默认关闭。它需要在 iOS 设备上单独同意，并在 Gateway 上进行授权。

## Requirements

- 一台运行 OpenClaw iOS 应用且 HealthKit 报告健康数据可用的 iPhone 或 iPad。
- 一个已连接并获批准的 iOS 节点。请参见 [iOS 应用设置](/platforms/ios)。
- 一个当前可到达 iOS 节点的 Gateway。
- 你期望看到的任何指标都需要有可读取的健康数据。Apple Watch 可以向 Apple Health 存储贡献数据，但 HealthKit 摘要不需要 OpenClaw watchOS 应用。

## 启用访问

### 1. 授权 Gateway 命令

将 `health.summary` 添加到 `openclaw.json` 中现有的 `gateway.nodes.commands.allow` 数组里。保留已存在的任何命令：

```json5
{
  gateway: {
    nodes: {
      commands: { allow: ["health.summary"] },
    },
  },
}
```

`health.summary` 被归类为隐私敏感内容，且 iOS 平台默认绝不允许。`gateway.nodes.commands.deny` 中的条目会覆盖 allow 条目。另见 [节点命令策略](/nodes#command-policy)。

### 2. 在 iOS 设备上启用共享

在 iOS 应用中：

1. 打开 **设置 -> 权限**，并在始终可见的 **Apple Health** 部分中找到 **Apple Health Summaries**。
2. 点击 **启用 Apple Health Summaries**。
3. 阅读披露说明，然后在 Apple 的权限表中选择 OpenClaw 可以读取的 Health 类别。

该开关会记录你为 OpenClaw 做出的明确共享选择。它并不表示 Apple 已授予所有请求的类别。

启用健康摘要会将 `health.summary` 添加到该节点声明的命令范围中。请批准随之产生的节点配对更新：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

然后验证已连接的 iOS 设备是否暴露了有效的 `health.summary` 命令：

```bash
openclaw nodes describe --node "<iOS device name>"
```

## 请求今日摘要

仅支持 `today`。它涵盖本地午夜到请求时刻，
使用 iOS 设备当前的日历和时区。

```bash
openclaw nodes invoke \
  --node "<iOS device name>" \
  --command health.summary \
  --params '{"period":"today"}' \
  --json
```

代理可以使用 `nodes` 工具调用相同的命令：

```json
{
  "action": "invoke",
  "node": "<iOS device name>",
  "invokeCommand": "health.summary",
  "invokeParamsJson": "{\"period\":\"today\"}"
}
```

摘要载荷包含：

| 字段                     | 含义                                          |
| ------------------------ | --------------------------------------------- |
| `period`                 | 始终为 `today`                                |
| `startISO`               | 当地一天开始时间，编码为 ISO 时间点           |
| `endISO`                 | 请求时间，编码为 ISO 时间点                   |
| `timeZoneIdentifier`     | iOS 设备时区标识符                            |
| `stepCount`              | 四舍五入后的累计步数                          |
| `sleepDurationMinutes`   | 去重后的睡眠时长，裁剪到今天                   |
| `restingHeartRateBpm`    | 平均静息心率                                  |
| `workoutCount`           | 今日开始的锻炼次数                            |
| `workoutDurationMinutes` | 这些锻炼的总时长                              |

指标字段是可选的；当 HealthKit 没有返回可读取的值时，会被省略。睡眠阶段和重叠来源会在计算时长之前合并，因此同一分钟不会被重复计数。

## 隐私行为

- 聚合发生在 iOS 设备上。原始样本不会离开设备。
- 请求的聚合会通过你的 Gateway 离开设备。当代理
  请求它时，聚合会到达已配置的 AI 提供方，并可能保留在
  聊天历史中。直接通过 CLI 调用则会将其返回给 CLI 操作员。
- OpenClaw 仅请求读取权限。它不能添加或修改 Health 数据。
- OpenClaw 仅在调用 `health.summary` 时读取 HealthKit。不存在
  后台健康数据摄取。
- HealthKit 刻意不会透露读取权限是否被拒绝。缺少某项指标可能意味着拒绝访问、没有匹配的样本，或该数据类型不可用。OpenClaw 无法区分这些情况。
- 该摘要用于个人健康与健身背景信息，不是诊断或
  医疗建议。

要停止共享，请返回 **Apple Health Summaries** 并点击 **Turn Off Summaries**。
此时 iOS 设备会从其节点
界面中移除 Health capability 和 `health.summary` 命令。你也可以从
`gateway.nodes.commands.allow` 中移除 `health.summary`，以关闭 Gateway 端的门禁。

## 故障排查

### 该命令未由节点声明

确认 iOS 应用中已启用 Apple Health 摘要，并且设备已连接。
运行 `openclaw nodes pending` 并批准任何能力更新，然后再次检查
`openclaw nodes describe --node "<iOS device name>"`。

### 该命令需要显式选择加入

将 `health.summary` 添加到 `gateway.nodes.commands.allow`。同时检查
`gateway.nodes.commands.deny` 中不包含它；拒绝列表优先生效。

### `HEALTH_ACCESS_DISABLED`

应用端共享开关已关闭。请在 iOS 设备的
**Settings -> Permissions -> Apple Health** 下启用 **Apple Health Summaries**。

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
