---
summary: "CLI 参考：`openclaw workboard` 的卡片、调度和 worker 运行"
read_when:
  - 你想从终端查看或创建 Workboard 卡片
  - 你想通过 CLI 调度 Workboard worker 运行
  - 你正在排查 Workboard CLI 或斜杠命令行为
title: "Workboard CLI"
---

`openclaw workboard` 是内置 [Workboard 插件](/plugins/workboard) 的终端入口。它允许操作员列出卡片、创建卡片、查看单个卡片，并让正在运行的 Gateway 将就绪工作调度为 subagent worker 运行。

在使用该命令前先启用插件：

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

## 用法

```bash
openclaw workboard list [--board <id>] [--status <status>] [--include-archived] [--json]
openclaw workboard create <title...> [--notes <text>] [--status <status>] [--priority <priority>] [--agent <id>] [--board <id>] [--labels <items>] [--json]
openclaw workboard show <id> [--json]
openclaw workboard move <id> --status <status> [--json]
openclaw workboard dispatch [--board <id>] [--max-starts <count>] [--admin] [--url <url>] [--token <token>] [--timeout <ms>] [--json]
```

该命令读取并写入与仪表板和 Workboard 代理工具使用的同一插件所属 SQLite 数据库。卡片 ID 为 UUID；接受卡片 ID 的命令也接受无歧义的 ID 前缀（紧凑文本输出会显示前 8 个字符）。

有效的 `status` 值：`triage`、`backlog`、`todo`、`scheduled`、`ready`、`running`、`review`、`blocked`、`done`。有效的 `priority` 值：`low`、`normal`、`high`、`urgent`。

## `list`

```bash
openclaw workboard list
openclaw workboard list --board default --status ready
openclaw workboard list --json
```

文本输出非常紧凑：

```text
7f4a2c10  ready     high    default agent-a  修复失效的 worker 心跳
```

各列分别是 id 前缀、状态、优先级、board id、可选的 agent id，以及标题。

| Flag                 | 用途                                         |
| -------------------- | -------------------------------------------- |
| `--board <id>`       | 将结果限制为一个 board 命名空间             |
| `--status <status>`  | 将结果限制为一个 Workboard 状态             |
| `--include-archived` | 在紧凑文本输出中包含已归档卡片               |
| `--json`             | 以机器可读的 JSON 形式打印完整卡片列表       |

紧凑文本输出默认隐藏已归档卡片，因此 CLI 与 `/workboard list` 保持一致。传入 `--include-archived` 可显示它们。JSON 输出始终保留完整卡片列表，包括已归档卡片，以供现有自动化使用。

## `create`

```bash
openclaw workboard create "修复失效的 worker 心跳" --priority high --labels bug,workboard
openclaw workboard create "编写 Workboard 文档" --status ready --agent docs-agent --board docs --notes "涵盖 CLI、斜杠命令、dispatch 和 SQLite 状态。"
```

| 标志                    | 用途                                    |
| ----------------------- | --------------------------------------- |
| `--notes <text>`        | 初始卡片备注                             |
| `--status <status>`     | 初始状态，默认 `todo`                    |
| `--priority <priority>` | 优先级，默认 `normal`                    |
| `--agent <id>`          | 将卡片分配给某个 agent 或 owner id       |
| `--board <id>`          | 将卡片存储到某个 board 命名空间          |
| `--labels <items>`      | 以逗号分隔的标签                         |
| `--json`                | 以机器可读 JSON 输出创建的卡片           |

`create` 会直接写入 Workboard SQLite 状态。卡片会立即显示在 Control UI 的 Workboard 选项卡中，并对 Workboard 工具可见。

## `show`

```bash
openclaw workboard show 7f4a2c10
openclaw workboard show 7f4a2c10 --json
```

文本输出会打印紧凑的卡片行和备注。JSON 输出会返回完整的卡片记录，包括执行元数据、尝试、评论、链接、证明、产物、工作线程日志、协议状态、诊断信息以及自动化元数据。

## `move`

```bash
openclaw workboard move 7f4a2c10 --status review
openclaw workboard move 7f4a2c10 --status done --json
```

`move` 使用与在仪表板中拖动卡片相同的手动操作员路径来更改卡片的状态。它接受完整的卡片 ID 或一个无歧义的前缀。活动中的依赖和计划阻塞仍然适用。操作员可以在没有其代理认领令牌的情况下移动已认领的卡片；认领令牌仍仅限于代理工具变更，并且会在 JSON 输出中被隐藏。

## `dispatch`

```bash
openclaw workboard dispatch
openclaw workboard dispatch --json
openclaw workboard dispatch --max-starts 10
openclaw workboard dispatch --admin
openclaw workboard dispatch --url http://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

`dispatch` 首先调用正在运行的 Gateway RPC 方法 `workboard.cards.dispatch`，它使用与仪表板 dispatch 操作相同的 subagent 运行时，因此就绪卡片会变成带有关联会话键的任务跟踪 worker 运行。`--max-starts` 使用附加的 `workboard.cards.dispatchWithOptions` 方法，因此较旧的 Gateway 会在启动任何 worker 之前拒绝该选项；在升级后、使用该标志之前，请重启 Gateway。已分配 agent 的卡片使用 agent 作用域的 subagent 会话键；未分配的卡片保留无作用域的 subagent 键，以便保留 Gateway 配置的默认 agent。

dispatch 循环：

1. 将依赖项已就绪的子卡提升为 `ready`。
2. 阻止已过期的认领或超时的 worker 运行。
3. 在就绪卡片上记录 dispatch 元数据。
4. 选择一小批未被认领的就绪卡片。
5. 为 dispatcher 或已分配 agent 认领每张选中的卡片。
6. 使用受限的卡片上下文和卡片认领令牌启动一个 subagent worker 运行。
7. 当 Gateway 任务账本报告时，将 worker 运行 id、会话键、任务关联，以及执行状态和 worker 日志存储到卡片上。

选择是保守的：一次 dispatch 默认最多启动三个 worker，会跳过已归档或已被认领的卡片，并且在单次遍历中每个所有者或 agent 只启动一张卡片。已被活跃运行或审阅工作占用的卡片会留到之后的 dispatch 处理。传入 `--max-starts <count>` 且为正整数可更改每次遍历的上限；每个所有者仅一张卡片的规则仍然适用，因此实际启动数量可能更少。

如果 worker 启动在卡片被认领后失败，Workboard 会阻止该卡片，清除认领，并将失败记录到卡片执行和 worker-log 元数据中，让失败的启动保持可见，而不是悄悄把卡片返回队列。

如果没有提供显式的 Gateway 目标，并且本地 Gateway 不可用或尚未暴露 Workboard dispatch 方法，CLI 会回退到针对本地 Workboard 状态的数据型 dispatch。数据型 dispatch 仍然可以提升依赖、清理陈旧认领并阻止超时运行，但不会启动 worker。认证、权限和校验失败，以及显式 `--url` 或 `--token` 目标的失败，会直接报告，而不会触发回退。

文本输出会报告 worker 启动结果：

```text
dispatch complete: started=2 failures=0
```

回退输出会明确说明：

```text
gateway unavailable; data dispatch only: promoted=1 blocked=0
```

JSON 输出包含 dispatch 结果。基于 Gateway 的 dispatch 可以包含 `started` 和 `startFailures`；仅数据回退会包含 `gatewayUnavailable: true`。认领令牌会在卡片 JSON 输出中被隐藏。

在仪表板中，相同的 dispatch 结果会以简短摘要显示，这样操作员无需打开卡片详情就能看到有多少卡片已启动、已提升、已阻止、已重新认领或已失败。

## 斜杠命令一致性

支持命令的通道可以使用对应的斜杠命令：

```text
/workboard list
/workboard show 7f4a2c10
/workboard create Fix stale worker heartbeat
/workboard move 7f4a2c10 --status review
/workboard dispatch
```

斜杠命令 dispatch 也使用 Gateway 子代理运行时，因此它遵循与 dashboard 和 CLI Gateway 路径相同的 claim、worker-start 和失败行为。

`/workboard list` 和 `/workboard show` 是授权命令发送者的读取命令。`/workboard create`、`/workboard move` 和 `/workboard dispatch` 会修改看板状态，并且在聊天界面上需要 owner 状态，或者使用具有 `operator.write` 或 `operator.admin` 的 Gateway 客户端。

## 权限

CLI 分发路径通常请求 Gateway 的 `operator.write` 和 `operator.read` scope。绑定到工作区的卡片会直接运行在一个精确配置的 agent 工作区中；worktree 请求会被缩小到该目录，而不是让宿主机实例化由仓库控制的代码。所选 worker 必须对该精确工作区拥有可写的、非共享的 Docker sandbox 访问权限，拥有与请求的挂载和策略匹配的实时容器 hash，并且没有宿主机逃逸能力。传入 `--admin` 可显式请求 `operator.admin`，允许使用另一个宿主机 checkout，并使用正常的 managed-worktree 设置；如果该 scope 未获客户端批准，连接将失败。只读的 Gateway token 可以通过 read 方法检查 Workboard 数据，但不能创建卡片或分发 worker。对于拥有 Workboard mutation 权限的调用方，工作区限制不会以其他方式改变手动卡片移动。

本地的 `list`、`create`、`show` 和 `move` 命令作用于当前 profile 使用的本地 OpenClaw 状态目录。当你需要不同的 state root 时，请在顶层 `openclaw` 命令上使用 `--dev` 或 `--profile <name>`。

## 故障排查

### 没有出现任何卡片

确认插件已在相同的 profile 和状态根目录下启用：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果仪表板显示有卡片但 CLI 没有，请检查这两个命令是否使用了相同的 `--dev` 或 `--profile` 设置。

### Dispatch 显示仅数据模式

启动或重启 Gateway：

```bash
openclaw gateway restart
openclaw gateway status --deep
```

然后重试 `openclaw workboard dispatch`。仅数据模式回退对本地状态清理很有用，但 worker 运行需要一个在线的 Gateway。

### Dispatch 没有启动任何内容

检查是否至少有一张没有活跃 claim 的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

如果同一个 owner 已经有正在运行或处于 review 的工作，卡片也可能会被跳过。请将已完成的工作移动到 `done`，通过 Workboard 工具释放过期的 claim，或者在当前 worker 完成后再次运行 dispatch。

## 相关内容

- [Workboard 插件](/plugins/workboard)
- [CLI 参考](/cli)
- [斜杠命令](/tools/slash-commands)
- [Control UI](/web/control-ui)
