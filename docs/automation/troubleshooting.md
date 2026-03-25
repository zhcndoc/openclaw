---
summary: "排查 cron 和心跳调度及发送问题"
read_when:
  - cron 未运行
  - cron 已运行但未发送消息
  - 心跳似乎静默或被跳过
title: "自动化排查"
---

# 自动化排查

针对调度器和发送问题（`cron` + `heartbeat`），请使用本页内容。

## 命令执行顺序

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后执行自动化检查：

```bash
openclaw cron status
openclaw cron list
openclaw system heartbeat last
```

## Cron 未触发

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw logs --follow
```

正确输出示例：

- `cron status` 显示已启用且存在未来的 `nextWakeAtMs` 时间。
- 任务被启用且有有效的调度/时区设置。
- `cron runs` 显示 `ok` 或明确的跳过原因。

常见表现：

- `cron: scheduler disabled; jobs will not run automatically` → cron 在配置或环境中被禁用。
- `cron: timer tick failed` → 调度器 tick 崩溃；检查周围的堆栈/日志上下文。
- 运行输出中有 `reason: not-due` → 手动执行无 `--force` 参数且任务尚未到期。

## Cron 触发但未发送

```bash
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

正确输出示例：

- 运行状态为 `ok`。
- 隔离任务已设置发送模式/目标。
- 通道探测显示目标通道已连接。

常见表现：

- 运行成功但发送模式为 `none` → 无需发送外部消息。
- 缺少或无效发送目标（`channel`/`to`） → 任务内部成功但跳过对外发送。
- 通道认证错误（`unauthorized`、`missing_scope`、`Forbidden`） → 发送因通道凭证/权限被阻止。

## 心跳被抑制或跳过

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

正确输出示例：

- 心跳已启用且间隔非零。
- 最近心跳结果为 `ran`（或已理解的跳过原因）。

常见表现：

- `heartbeat skipped`，并提示 `reason=quiet-hours` → 超出 `activeHours` 范围。
- `requests-in-flight` → 主通道繁忙；心跳延迟执行。
- `empty-heartbeat-file` → 因 `HEARTBEAT.md` 无有效内容且无标记的 cron 事件排队，间隔心跳跳过。
- `alerts-disabled` → 可视化设置抑制了外发心跳消息。

## 时区和 activeHours 注意事项

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone 未设置"
openclaw cron list
openclaw logs --follow
```

简要规则：

- `Config path not found: agents.defaults.userTimezone` 表示该键未设置；心跳将回退到主机时区（如果已设置则使用 `activeHours.timezone`）。
- 未带 `--tz` 的 Cron 使用网关主机时区。
- 心跳的 `activeHours` 使用配置的时区解析方式（`user`、`local` 或显式 IANA 时区）。
- 对于 Cron 的 `at` 调度，除非您在 CLI 中使用了 `--at "<offset-less-iso>" --tz <iana>`，否则将无时区的 ISO 时间戳视为 UTC。

常见表现：

- 主机时区变更后，任务运行时间与本地时钟不符。
- 因 `activeHours.timezone` 配置错误，心跳在白天总被跳过。

相关内容：

- [/automation/cron-jobs](/automation/cron-jobs)
- [/gateway/heartbeat](/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/automation/cron-vs-heartbeat)
- [/concepts/timezone](/concepts/timezone)
