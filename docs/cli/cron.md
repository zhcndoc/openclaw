---
summary: "`openclaw cron` 的 CLI 参考（调度和运行后台作业）"
read_when:
  - 你想要计划任务和唤醒
  - 你正在调试 cron 执行和日志
title: "Cron"
---

# `openclaw cron`

管理网关调度器的 cron 作业。

相关内容：

- Cron 作业：[Cron 作业](/automation/cron-jobs)

提示：运行 `openclaw cron --help` 获取完整命令信息。

注意：`openclaw cron list` 和 `openclaw cron show <job-id>` 会预览
解析后的交付路由。对于 `channel: "last"`，预览会显示路由是从
主/当前会话解析得到，还是会在关闭状态下失败。

注意：孤立的 `cron add` 作业默认使用 `--announce` 交付。使用 `--no-deliver` 可保持
输出内部。`--deliver` 仍然是 `--announce` 的弃用别名。

注意：孤立 cron 的聊天交付是共享的。`--announce` 是运行器对最终回复的回退
交付；`--no-deliver` 会禁用该回退，但在可用聊天路由时不会移除代理的
`message` 工具。

注意：一次性（`--at`）作业默认在成功后删除。使用 `--keep-after-run` 来保留它们。

注意：`--session` 支持 `main`、`isolated`、`current` 和 `session:<id>`。使用 `current` 在创建时绑定到活动会话，或使用 `session:<id>` 指定明确的持久会话键。

注意：对于一次性 CLI 作业，无偏移量的 `--at` 日期时间被视为 UTC，除非您同时传递 `--tz <iana>`，这将把该本地时钟时间解释为给定时区中的时间。

注意：重复作业现在在连续错误后使用指数退避重试（30 秒 → 1 分钟 → 5 分钟 → 15 分钟 → 60 分钟），然后在下次成功运行后恢复正常计划。

注意：`openclaw cron run` 命令在手动运行排队后即刻返回。成功响应包含 `{ ok: true, enqueued: true, runId }`；使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

注意：`openclaw cron run <job-id>` 默认强制运行。使用 `--due` 保留旧的“仅到期时运行”行为。

注意：孤立 cron 轮次抑制过时的仅确认回复。如果第一个结果只是临时状态更新，且没有后代子代理运行负责最终答案，cron 会在交付前重新提示一次以获取真实结果。

注意：如果孤立 cron 运行仅返回静默令牌（`NO_REPLY` / `no_reply`），cron 会抑制直接出站交付以及回退排队摘要路径，因此不会有任何内容发布回聊天。

注意：`cron add|edit --model ...` 使用该选定的允许模型用于作业。如果模型不被允许，cron 会警告并回退到作业的代理/默认模型选择。配置的回退链仍然适用，但没有明确每作业回退列表的单纯模型覆盖不再将代理主模型作为隐藏的额外重试目标附加。

注意：孤立 cron 模型优先级首先是 Gmail-hook 覆盖，然后是每作业 `--model`，接着是任何存储的 cron 会话模型覆盖，最后是正常的代理/默认选择。

注意：孤立 cron 快速模式遵循解析后的实时模型选择。模型配置 `params.fastMode` 默认适用，但存储的会话 `fastMode` 覆盖仍优先于配置。

注意：如果孤立运行抛出 `LiveSessionModelSwitchError`，cron 会在重试前持久化切换后的 provider/model（以及切换后的 auth profile 覆盖，如果存在）。外部重试循环限制在初始尝试后的 2 次切换重试，然后中止而不是无限循环。

注意：失败通知首先使用 `delivery.failureDestination`，然后是全局 `cron.failureDestination`，最后在没有配置明确失败目的地时回退到作业的主要宣布目标。

注意：保留/修剪在配置中控制：

- `cron.sessionRetention`（默认 `24h`）修剪已完成的孤立运行会话。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件。

升级注意：如果您有当前交付/存储格式之前的旧 cron 作业，请运行 `openclaw doctor --fix`。Doctor 现在规范化遗留 cron 字段（`jobId`、`schedule.cron`、顶层交付字段包括遗留 `threadId`、负载 `provider` 交付别名），并在配置了 `cron.webhook` 时将简单的 `notify: true` webhook 回退作业迁移到显式 webhook 交付。

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
  --name "轻量级晨间简报" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "请总结昨夜的更新。" \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于孤立代理轮次作业。对于 cron 运行，轻量级模式保持引导上下文为空，而不是注入完整的工作区引导集。

交付所有权注意：

- 孤立 cron 聊天交付是共享的。代理在可用聊天路由时可以使用
  `message` 工具直接发送。
- `announce` 仅在代理未直接发送到解析后的目标时，才会将最终回复作为回退
  交付。`webhook` 会将完成的负载发布到 URL。
  `none` 会禁用运行器回退交付。

## 常用管理命令

手动运行：

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`cron runs` 条目包含交付诊断信息，包括预期的 cron 目标、
解析后的目标、message-tool 发送、回退使用情况以及已交付状态。

代理/会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

交付调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

失败交付注意：

- `delivery.failureDestination` 支持孤立作业。
- 主会话作业仅在主要
  交付模式为 `webhook` 时才能使用 `delivery.failureDestination`。
- 如果您未设置任何失败目的地，且作业已公告到某个
  频道，则失败通知会复用同一个公告目标。

## 相关内容

- [CLI 参考](/cli)
- [计划任务](/automation/cron-jobs)
