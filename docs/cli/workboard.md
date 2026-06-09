---
summary: "CLI 参考：`openclaw workboard` 的卡片、调度和 worker 运行"
read_when:
  - 你想从终端查看或创建 Workboard 卡片
  - 你想通过 CLI 调度 Workboard worker 运行
  - 你正在排查 Workboard CLI 或斜杠命令行为
title: "Workboard CLI"
---

`openclaw workboard` 是内置
[Workboard 插件](/plugins/workboard) 的终端入口。它允许操作员列出卡片、创建卡片、查看单张卡片，并让正在运行的 Gateway 将已就绪的工作调度到子代理 worker 运行中。

在使用该命令前先启用插件：

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

## 用法

```bash
openclaw workboard list [--board <id>] [--status <status>] [--json]
openclaw workboard create <title...> [--notes <text>] [--status <status>] [--priority <priority>] [--agent <id>] [--board <id>] [--labels <items>] [--json]
openclaw workboard show <id> [--json]
openclaw workboard dispatch [--url <url>] [--token <token>] [--timeout <ms>] [--json]
```

该命令读写与仪表盘和 Workboard agent 工具使用的同一个插件拥有的 SQLite 数据库。只要命令接受卡片 id，就可以传入完整 id，或传入无歧义的前缀。

## `list`

```bash
openclaw workboard list
openclaw workboard list --board default --status ready
openclaw workboard list --json
```

文本输出很紧凑：

```text
7f4a2c10  ready     high    default agent-a  修复失效的 worker 心跳
```

各列分别是 id 前缀、状态、优先级、board id、可选的 agent id，以及标题。

标志：

| Flag                | 作用                                  |
| ------------------ | ------------------------------------- |
| `--board <id>`      | 将结果限制在一个 board 命名空间内     |
| `--status <status>` | 将结果限制在一个 Workboard 状态内     |
| `--json`            | 以机器可读 JSON 输出完整卡片列表       |

## `create`

```bash
openclaw workboard create "修复失效的 worker 心跳" --priority high --labels bug,workboard
openclaw workboard create "编写 Workboard 文档" --status ready --agent docs-agent --board docs --notes "涵盖 CLI、斜杠命令、dispatch 和 SQLite 状态。"
```

标志：

| Flag                    | 作用                                    |
| ----------------------- | --------------------------------------- |
| `--notes <text>`        | 初始卡片备注                             |
| `--status <status>`     | 初始状态，默认 `todo`                    |
| `--priority <priority>` | 优先级，默认 `normal`                    |
| `--agent <id>`          | 将卡片分配给某个 agent 或 owner id       |
| `--board <id>`          | 将卡片存储到某个 board 命名空间          |
| `--labels <items>`      | 以逗号分隔的标签                         |
| `--json`                | 以机器可读 JSON 输出创建的卡片           |

`create` 会直接写入 Workboard SQLite 状态。该卡片会立即在 Control UI 的 Workboard 标签页以及 Workboard 工具中可见。

## `show`

```bash
openclaw workboard show 7f4a2c10
openclaw workboard show 7f4a2c10 --json
```

文本输出会打印紧凑的卡片行和备注。JSON 输出返回完整的卡片记录，包括执行元数据、尝试、评论、链接、证据、工件、worker 日志、协议状态、诊断信息和自动化元数据。

## `dispatch`

```bash
openclaw workboard dispatch
openclaw workboard dispatch --json
openclaw workboard dispatch --url http://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

`dispatch` 会先调用正在运行的 Gateway RPC 方法
`workboard.cards.dispatch`。该路径使用与仪表盘 dispatch 操作相同的 subagent 运行时，因此已就绪的卡片会变成带有关联会话键的、受任务追踪的 worker 运行。分配了 agent 的卡片会使用 agent 作用域的 subagent 会话键；未分配的卡片会保留未加作用域的 subagent 键，从而保留 Gateway 配置的默认 agent。

dispatch 循环：

1. 将依赖已就绪的子卡推进为 `ready`。
2. 阻止已过期的 claim 或已超时的 worker 运行。
3. 在已就绪卡片上记录 dispatch 元数据。
4. 选取一小批未被 claim 的已就绪卡片。
5. 为每张被选中的卡片向 dispatcher 或已分配 agent 发起 claim。
6. 使用受限的卡片上下文和卡片 claim token 启动一个 subagent worker 运行。
7. 在卡片上存储 worker run id、session key、当 Gateway 任务账本报告时的任务关联、执行状态以及 worker 日志。

选择策略是刻意保守的。一次 dispatch 默认最多启动三个 worker，会跳过已归档或已被 claim 的卡片，并且在单次遍历中每个 owner 或 agent 只启动一张卡片。已经被活跃运行或 review 工作占用的卡片会留到下次 dispatch。

如果在卡片被 claim 后 worker 启动失败，Workboard 会阻止该卡片、清除 claim，并在卡片执行和 worker-log 元数据中记录失败。这能确保失败的启动保持可见，而不是悄悄把卡片放回队列。

如果没有提供显式 Gateway 目标，并且本地 Gateway 不可用，或者尚未暴露 Workboard dispatch 方法，CLI 会回退为仅针对本地 Workboard 状态的数据式 dispatch。数据式 dispatch 仍然可以推进依赖、清理陈旧 claim，并阻止超时运行，但不会启动 worker。认证、权限、校验失败，以及针对显式 `--url` 或 `--token` 目标的失败，会直接上报。

文本输出会报告 worker 启动结果：

```text
dispatch complete: started=2 failures=0
```

回退输出会明确说明：

```text
gateway unavailable; data dispatch only: promoted=1 blocked=0
```

JSON 输出会包含 dispatch 结果。基于 Gateway 的 dispatch 可以包含 `started` 和 `startFailures`；仅数据回退会包含 `gatewayUnavailable: true`。claim token 在卡片 JSON 输出中会被脱敏。

在仪表盘中，相同的 dispatch 结果会以简短摘要展示，因此操作员无需打开卡片详情就能看到有多少卡片被启动、推进、阻止、重新领取或失败。

## 斜杠命令一致性

支持命令的通道可以使用对应的斜杠命令：

```text
/workboard list
/workboard show 7f4a2c10
/workboard create 修复失效的 worker 心跳
/workboard dispatch
```

斜杠命令的 dispatch 也使用 Gateway subagent 运行时，因此它遵循与仪表盘和 CLI Gateway 路径相同的 claim、worker 启动和失败行为。

`/workboard list` 和 `/workboard show` 是面向授权命令发送者的读取命令。`/workboard create` 和 `/workboard dispatch` 会修改 board 状态，在聊天界面上需要 owner 身份，或者需要具备 `operator.write` 或 `operator.admin` 的 Gateway 客户端。

## 权限

CLI dispatch 路径会以 `operator.read` 和 `operator.write` 作用域调用 Gateway RPC。只读的 Gateway token 可以通过读取方法检查 Workboard 数据，但不能创建卡片或调度 worker。

本地 `list`、`create` 和 `show` 命令操作的是当前 profile 使用的本地 OpenClaw 状态目录。需要不同状态根目录时，请在顶层 `openclaw` 命令上使用 `--dev` 或 `--profile <name>`。

## 故障排查

### 没有显示卡片

确认插件已在相同的 profile 和状态根目录下启用：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果仪表盘能看到卡片，但 CLI 看不到，请检查两个命令是否使用了相同的 `--dev` 或 `--profile` 设置。

### Dispatch 显示仅为数据模式

启动或重启 Gateway：

```bash
openclaw gateway restart
openclaw gateway status --deep
```

然后重试 `openclaw workboard dispatch`。仅数据回退对本地状态清理很有用，但 worker 运行需要一个在线的 Gateway。

### Dispatch 没有启动任何内容

检查是否至少有一张没有活跃 claim 的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

当同一个 owner 已经有正在运行或处于 review 的工作时，卡片也可能被跳过。将已完成的工作移到 `done`，通过 Workboard 工具释放陈旧 claim，或者在活跃 worker 完成后再次运行 dispatch。

## 相关内容

- [Workboard 插件](/plugins/workboard)
- [CLI 参考](/cli)
- [斜杠命令](/tools/slash-commands)
- [Control UI](/web/control-ui)
