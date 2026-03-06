---
summary: "`openclaw cron` 的 CLI 参考（调度和运行后台作业）"
read_when:
  - 您需要定时作业和唤醒功能
  - 您正在调试 cron 执行和日志
title: "cron"
---

# `openclaw cron`

管理网关调度器的 cron 作业。

相关内容：

- Cron 作业: [Cron 作业](/automation/cron-jobs)

提示：运行 `openclaw cron --help` 获取完整命令信息。

注意：孤立的 `cron add` 作业默认使用 `--announce` 发送输出。使用 `--no-deliver` 可以保持输出为内部内容。`--deliver` 仍作为废弃别名对应 `--announce`。

注意：一次性（`--at`）作业在成功后默认自动删除。使用 `--keep-after-run` 可保留作业。

注意：循环作业在连续错误后采用指数递减重试间隔（30秒 → 1分钟 → 5分钟 → 15分钟 → 60分钟），然后在下一次成功运行后恢复正常调度。

注意：保留和修剪由配置控制：

- `cron.sessionRetention`（默认 `24h`）修剪已完成的孤立运行会话。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件。

## 常用编辑操作

在不更改消息内容的情况下更新发送设置：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

禁用孤立作业的发送功能：

```bash
openclaw cron edit <job-id> --no-deliver
```

为孤立作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向指定频道宣布：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

创建带轻量级引导上下文的孤立作业：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于孤立的 agent-turn 作业。对于 cron 运行，轻量模式保持引导上下文为空，而不注入完整的工作区引导集。
