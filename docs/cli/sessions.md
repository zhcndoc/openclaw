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

`openclaw sessions` 和 Gateway `sessions.list` 响应默认都有上限，因此大型、长期存储不会垄断 CLI 进程或 Gateway
事件循环。CLI 默认返回最新的 100 个会话；传入
`--limit <n>` 可获取更小/更大的窗口，或在你有意
需要完整存储时使用 `--limit all`。当调用方需要显示还有更多行时，JSON 响应会包含 `totalCount`、`limitApplied` 和 `hasMore`。

RPC 客户端可以传入 `configuredAgentsOnly: true`，在保留广泛的组合
发现来源的同时，仅返回当前在配置中存在的代理的行。
控制 UI 默认使用该模式，因此已删除或仅磁盘上的代理存储不会
再次出现在 Sessions 视图中。

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --limit 25
openclaw sessions --verbose
openclaw sessions --json
```

作用域选择：

- 默认：已配置的默认代理存储
- `--verbose`: 详细日志
- `--agent <id>`: 一个已配置的代理存储
- `--all-agents`: 汇总所有已配置的代理存储
- `--store <path>`: 显式存储路径（不能与 `--agent` 或 `--all-agents` 组合使用）
- `--limit <n|all>`: 要输出的最大行数（默认 `100`；`all` 恢复完整输出）

Tail human-readable trajectory progress for stored sessions:

```bash
openclaw sessions tail
openclaw sessions tail --follow
openclaw sessions tail --session-key "agent:main:telegram:direct:123" --tail 25
openclaw sessions --agent work tail --follow
openclaw sessions --all-agents tail --follow
```

`openclaw sessions tail` 将最近的轨迹 JSONL 事件渲染为紧凑的进度行。不指定 `--session-key` 时，它会先跟踪正在运行的会话，然后跟踪最新的存储会话。`--tail <count>` 控制在进入跟随模式前打印多少条现有事件；默认值是 `80`，`0` 表示从当前末尾开始。`--follow` 会持续监视所选轨迹文件，包括由 `<session>.trajectory-path.json` 引用的已移动文件。

进度视图刻意保持保守：不会打印提示文本、工具参数或工具结果正文。工具调用仅显示工具名和 `{...redacted...}`；工具结果显示 `ok`、`error` 或 `done` 等状态；模型完成行显示提供方/模型和终止状态。

为已存储会话导出轨迹包：

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
  "totalCount": 2,
  "limitApplied": 100,
  "hasMore": false,
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
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用配置中的 `session.maintenance` 设置：

- 范围说明：`openclaw sessions cleanup` 会维护会话存储、转录和轨迹侧车文件。它不会清理 cron 运行历史；这部分由 [Cron 配置](/automation/cron-jobs#configuration) 中的 `cron.runLog.keepLines` 管理，并在 [Cron 维护](/automation/cron-jobs#maintenance) 中说明。
- 清理还会删除未被引用的主转录、压缩检查点，以及早于 `session.maintenance.pruneAfter` 的轨迹侧车文件；仍被 `sessions.json` 引用的文件会被保留。

- `--dry-run`：在不写入的情况下预览会被清理/截断的条目数量。
  - 在文本模式下，dry-run 会打印按会话划分的操作表（`Action`、`Key`、`Age`、`Model`、`Flags`），以便你查看哪些会被保留，哪些会被移除。
- `--enforce`：即使 `session.maintenance.mode` 为 `warn`，也强制执行维护。
- `--fix-missing`：移除转录文件缺失，或仅有表头/为空的条目，即使它们按年龄/数量本来还不会被清理。
- `--fix-dm-scope`：当 `session.dmScope` 为 `main` 时，清理早先 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 路由留下的陈旧、按对端键控的直连 DM 行。请先使用 `--dry-run`；实际清理会从 `sessions.json` 中移除这些行，并将其转录保留为已删除归档。
- `--active-key <key>`：保护某个活动键，避免在磁盘预算回收时被清除。持久化的外部对话指针，例如群组会话和线程作用域聊天会话，也会在年龄/数量/磁盘预算维护中保留。
- `--agent <id>`：对一个已配置的代理存储执行清理。
- `--all-agents`：对所有已配置的代理存储执行清理。
- `--store <path>`：针对特定的 `sessions.json` 文件运行。
- `--json`：打印 JSON 摘要。使用 `--all-agents` 时，输出会为每个存储包含一份摘要。

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
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "missing": 0,
      "dmScopeRetired": 0,
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
