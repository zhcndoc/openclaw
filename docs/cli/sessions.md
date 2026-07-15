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
openclaw sessions --limit 25
openclaw sessions --store ./tmp/sessions.json
openclaw sessions --json
```

标志：

| Flag                 | Description                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| `--agent <id>`       | 一个已配置的 agent 存储（默认：已配置的默认 agent）。                     |
| `--all-agents`       | 聚合所有已配置的 agent 存储。                                           |
| `--store <path>`     | 显式指定存储路径（不能与 `--agent` 或 `--all-agents` 组合使用）。       |
| `--active <minutes>` | 只显示过去 N 分钟内更新过的会话。                                       |
| `--limit <n\|all>`   | 输出的最大行数（默认 `100`；`all` 可恢复完整输出）。                    |
| `--json`             | 机器可读输出。                                                           |
| `--verbose`          | 详细日志。                                                               |

`openclaw sessions` 和 Gateway 的 `sessions.list` RPC 默认都有边界限制，
因此大型、长生命周期的存储不会垄断 CLI 进程或 Gateway 事件循环。
CLI 默认返回最新的 100 个会话；如需更小/更大的窗口，请传入 `--limit <n>`，
如果你确实需要完整存储，则传入 `--limit all`。当调用方需要显示还有更多行时，
JSON 响应会包含 `totalCount`、`limitApplied` 和 `hasMore`。

RPC 客户端可以传入 `configuredAgentsOnly: true`，以保留广泛的组合发现来源，
但只返回当前配置中存在的 agent 的行。控制 UI 默认使用该模式，因此已删除
或仅磁盘存在的 agent 存储不会重新出现在 Sessions 视图中。

`--all-agents` 读取已配置的 agent 存储。Gateway 和 ACP session
发现范围更广：它们还包括从已配置的 agent 根目录或模板化的 `session.store`
根目录解析出的 SQLite 存储。旧版选择器路径必须解析到 agent 根目录内；
符号链接和根目录外路径会被跳过。

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
    { "agentId": "main", "key": "agent:main:main", "model": "openai/gpt-5.6-sol" },
    { "agentId": "work", "key": "agent:work:main", "model": "anthropic/claude-sonnet-4-6" }
  ]
}
```

## 尾部轨迹进度

```bash
openclaw sessions tail
openclaw sessions tail --follow
openclaw sessions tail --session-key "agent:main:telegram:direct:123" --tail 25
openclaw sessions --agent work tail --follow
openclaw sessions --all-agents tail --follow
```

`openclaw sessions tail` 会将最近的运行时轨迹事件渲染为紧凑的进度行。若未指定 `--session-key`，它会先跟踪正在运行的会话，然后跟踪最新的已存储会话。`--tail <count>` 控制在跟随模式之前打印多少条现有事件；默认值为 `80`，而 `0` 则从当前末尾开始。`--follow` 会持续监视所选的基于 SQLite 的会话或一个显式指定的旧版轨迹文件。

进度视图是有意保持保守的：不会打印提示文本、工具参数和工具结果正文。
工具调用会显示工具名称以及 `{...redacted...}`；工具结果会显示诸如 `ok`、`error`
或 `done` 的状态；模型完成行会显示提供方/模型以及终态。

## 导出轨迹包

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

这是在所有者批准 exec 请求后，由 `/export-trajectory` 斜杠命令使用的命令路径。输出目录始终会在所选工作区下的 `.openclaw/trajectory-exports/` 内解析。

## 清理维护

立即运行维护，而不是等到下一个写入周期：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用配置中的 `session.maintenance` 设置
（[配置参考](/gateway/config-agents#session)）：

- 范围说明：`openclaw sessions cleanup` 会维护会话存储、
  转录、轨迹行以及旧版轨迹侧边车。它不会清理 cron 运行历史，
  cron 运行历史会自动为每个作业保留最新的 2000 行
  （[Cron 配置](/automation/cron-jobs#configuration)）。
- 清理还会清除未被引用的旧版/归档转录工件、
  压缩检查点，以及早于 `session.maintenance.pruneAfter`
  的轨迹侧边车；仍被 SQLite 会话行引用的工件会被保留。
- 清理会将短生命周期的 Gateway 模型运行探测清理单独报告为
  `modelRunPruned`。这只匹配形如 `agent:*:explicit:model-run-<uuid>` 的严格显式键。
  保留期固定为 `24h`，并且受压力门控：只有在达到会话条目维护/容量上限压力时，
  才会移除过期的探测行。运行时，模型运行清理会先于全局过期清理和容量限制处理。

标志：

| Flag                 | Description                                                                                                                                                                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`          | 预览将被清理/截断的条目数量，而不进行写入。在文本模式下，会打印按会话的操作表（`Action`、`Key`、`Age`、`Model`、`Flags`），以及按会话标签分组的摘要。                                                                                                                 |
| `--enforce`          | 即使 `session.maintenance.mode` 为 `warn`，也执行维护。                                                                                                                                                                                                                                                   |
| `--fix-missing`      | 移除归档转录工件缺失，或仅有头部/为空的旧版条目，即使它们通常还不会因年龄/数量而被清理。                                                                                                                                                                                                                 |
| `--fix-dm-scope`     | 当 `session.dmScope` 为 `main` 时，清理早先 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 路由遗留下来的、按对端键控的陈旧直接 DM 行。请先使用 `--dry-run`；执行时会从 SQLite 中移除这些行，并将其旧版转录工件保留为已删除归档。 |
| `--active-key <key>` | 保护某个特定的活动键不被磁盘预算驱逐。持久化的外部会话指针，例如群组会话和线程范围聊天会话，也会在年龄/数量/磁盘预算维护中被保留。                                                                                               |
| `--agent <id>`       | 为某个已配置的代理存储运行清理。                                                                                                                                                                                                                                                                        |
| `--all-agents`       | 为所有已配置的代理存储运行清理。                                                                                                                                                                                                                                                                        |
| `--store <path>`     | 针对某个特定的旧版存储选择器路径运行。                                                                                                                                                                                                                                                                   |
| `--json`             | 输出 JSON 摘要。使用 `--all-agents` 时，输出会为每个存储包含一份摘要。                                                                                                                                                                                                                                   |

当 Gateway 可访问时，针对已配置代理存储的非 dry-run 清理会通过 Gateway 发送，
因此它与运行时流量共享相同的会话存储写入器。使用 `--store <path>` 可以
对旧版存储选择器执行显式离线修复。

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

## 压缩会话

为卡住或过大的会话回收上下文预算。`openclaw sessions
compact <key>` 是对 `sessions.compact`
Gateway RPC 的一等封装，并且需要正在运行的 Gateway。

```bash
openclaw sessions compact "agent:main:main"
openclaw sessions compact "agent:main:main" --max-lines 200
openclaw sessions compact "agent:work:main" --agent work --json
```

- 如果不使用 `--max-lines`，Gateway 会对会话记录进行 LLM 总结。CLI 默认不会施加客户端截止时间；压缩生命周期由 Gateway 负责。
- 使用 `--max-lines <n>` 时，它会截断为最后 `n` 行会话记录，并将之前的会话记录归档为一个 `.bak` 旁车文件。
- `--agent <id>`：拥有该会话的代理；对于 `global` keys 是必需的。
- `--url` / `--token` / `--password`：Gateway 连接覆盖项。
- `--timeout <ms>`：可选的客户端 RPC 超时，单位为毫秒。
- `--json`：打印原始 RPC 负载。

当 Gateway 报告压缩失败或无法连接时，命令会以非零状态退出，因此 crons 和脚本不会把静默的无操作误认为成功。

<Note>
`openclaw agent --message '/compact ...'` **不是**一条压缩路径。CLI 中的斜杠命令会被 authorized-sender 检查拒绝；该调用会以非零状态退出，并给出指引，指向这里，而不是静默地无操作。
</Note>

### sessions.compact RPC

`openclaw gateway call sessions.compact --params '<json>'` 接受：

| 字段       | 类型          | 必需 | 说明                                                     |
| ---------- | ------------- | ---- | -------------------------------------------------------- |
| `key`      | string        | yes  | 要压缩的会话 key（例如 `agent:main:main`）。             |
| `agentId`  | string        | no   | 拥有该会话的代理 id（用于 `global` keys）。             |
| `maxLines` | integer ≥ 1   | no   | 截断为最后 N 行，而不是进行 LLM 总结。                  |

LLM 总结响应示例：

```json
{
  "ok": true,
  "key": "agent:main:main",
  "compacted": true,
  "result": { "tokensBefore": 243868, "tokensAfter": 34941 }
}
```

截断响应示例（`--max-lines 200`）：

```json
{
  "ok": true,
  "key": "agent:main:main",
  "compacted": true,
  "archived": "/home/user/.openclaw/agents/main/sessions/transcripts/<id>.jsonl.bak",
  "kept": 200
}
```

## 相关

- [会话配置](/gateway/config-agents#session)
- [会话管理](/concepts/session)
- [压缩](/concepts/compaction)
- [CLI 参考](/cli)
