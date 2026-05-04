---
summary: "`openclaw sessions` 的 CLI 参考（列出存储的会话 + 用法）"
read_when:
  - 你想列出存储的会话并查看最近活动
title: "会话"
---

# `openclaw sessions`

列出存储的对话会话。

Session 列表不是通道/提供方在线状态检查。它们显示的是会话存储中持久化的
对话记录行。一个安静的 Discord、Slack、Telegram 或其他通道可以在不创建
新的会话记录的情况下成功重新连接，直到某条消息被处理为止。当你需要实时
通道连接状态时，请使用 `openclaw channels status --probe`、
`openclaw status --deep` 或 `openclaw health --verbose`。

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --verbose
openclaw sessions --json
```

作用域选择：

- 默认：已配置的默认代理存储
- `--verbose`：详细日志
- `--agent <id>`：一个已配置的代理存储
- `--all-agents`：聚合所有已配置的代理存储
- `--store <path>`：显式指定存储路径（不能与 `--agent` 或 `--all-agents` 组合使用）

为已存储的会话导出 trajectory bundle：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

这是 `/export-trajectory` 斜杠命令在所有者批准 exec 请求后使用的命令路径。输出目录始终会在所选工作区下解析到 `.openclaw/trajectory-exports/` 内部。

`openclaw sessions --all-agents` 读取已配置的代理存储。Gateway 和 ACP 的会话发现范围更广：它们还会包含在默认 `agents/` 根目录或模板化的 `session.store` 根目录下找到的仅磁盘存储。这些发现到的存储必须解析为代理根目录内的常规 `sessions.json` 文件；符号链接和超出根目录的路径会被跳过。

JSON 示例：

`openclaw sessions --all-agents --json`：

```json
{
  "path": null,
  "stores": [
    { "agentId": "main", "path": "/home/user/.openclaw/agents/main/sessions/sessions.json" },
    { "agentId": "work", "path": "/home/user/.openclaw/agents/work/sessions/sessions.json" }
  ],
  "allAgents": true,
  "count": 2,
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "gpt-5" },
    { "agentId": "work", "key": "agent:work:main", "model": "claude-opus-4-6" }
  ]
}
```

## 清理维护

立即运行维护（而不是等待下一次写入周期）：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用配置中的 `session.maintenance` 设置：

- 作用域说明：`openclaw sessions cleanup` 会维护会话存储、转录和 trajectory sidecar 文件。它不会清理 cron 运行日志（`cron/runs/<jobId>.jsonl`），这些日志由 [Cron configuration](/automation/cron-jobs#configuration) 中的 `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 管理，并在 [Cron maintenance](/automation/cron-jobs#maintenance) 中说明。

- `--dry-run`：预览将要剪枝/截断的条目数量，而不会写入。
  - 在文本模式下，dry-run 会打印按会话划分的操作表（`Action`、`Key`、`Age`、`Model`、`Flags`），这样你可以看到哪些会被保留，哪些会被移除。
- `--enforce`：即使 `session.maintenance.mode` 为 `warn`，也强制应用维护。
- `--fix-missing`：移除其转录文件缺失的条目，即使它们通常还未达到按年龄/数量淘汰的条件。
- `--active-key <key>`：保护某个特定的活动 key，不因磁盘预算回收而被移除。持久化的外部会话指针，例如群组会话和按线程范围的聊天会话，也会按年龄/数量/磁盘预算维护而保留。
- `--agent <id>`：为一个已配置的代理存储运行清理。
- `--all-agents`：为所有已配置的代理存储运行清理。
- `--store <path>`：针对特定的 `sessions.json` 文件运行。
- `--json`：打印 JSON 摘要。使用 `--all-agents` 时，输出会包含每个存储的一份摘要。

当 Gateway 可用时，对已配置代理存储执行的非 dry-run 清理会通过 Gateway 发送，因此它与运行时流量共享同一个会话存储写入器。若要对某个存储文件进行显式离线修复，请使用 `--store <path>`。

`openclaw sessions cleanup --all-agents --dry-run --json`：

```json
{
  "allAgents": true,
  "mode": "warn",
  "dryRun": true,
  "stores": [
    {
      "agentId": "main",
      "storePath": "/home/user/.openclaw/agents/main/sessions/sessions.json",
      "beforeCount": 120,
      "afterCount": 80,
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

相关：

- 会话配置：[配置参考](/gateway/config-agents#session)

## 相关

- [CLI 参考](/cli)
- [会话管理](/concepts/session)
