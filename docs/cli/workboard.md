---
summary: "CLI 参考：`openclaw workboard` 的卡片、调度和 worker 运行"
read_when:
  - "你想从终端查看或创建 Workboard 卡片"
  - "你想通过 CLI 调度 Workboard worker 运行"
  - "你正在排查 Workboard CLI 或斜杠命令行为"
title: "工作台CLI"
---

`openclaw workboard` 是内置 [Workboard 插件](/plugins/workboard) 的终端入口。它允许操作员列出卡片、创建卡片、查看单个卡片，并让正在运行的 Gateway 将就绪工作调度为 subagent worker 运行。

在使用该命令前先启用插件：

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

## <a id="usage"></a> 用法

```bash
openclaw workboard list [--board <id>] [--status <status>] [--include-archived] [--json]
openclaw workboard create <title...> [--notes <text>] [--status <status>] [--priority <priority>] [--agent <id>] [--board <id>] [--labels <items>] [--json]
openclaw workboard show <id> [--json]
openclaw workboard move <id> --status <status> [--json]
openclaw workboard dispatch [--board <id>] [--max-starts <count>] [--admin] [--url <url>] [--token <token>] [--timeout <ms>] [--json]
```

该命令使用与仪表板和 Workboard 代理工具相同的插件拥有的 SQLite 数据库。当本地网关拥有状态目录时，命令在打开存储之前通过该网关路由。当网关停止时，命令会获取独占的离线所有权并在释放之前关闭存储。不可用、较旧或拒绝活动的网关永远不会触发本地写入回退；修复其连接或通过其服务所有者停止它并重试。卡 ID 是 UUID。接受卡 ID 的命令也接受明确的 ID 前缀。紧凑文本输出显示前 8 个字符。

有效的 `status` 值：`triage`、`backlog`、`todo`、`scheduled`、`ready`、`running`、`review`、`blocked`、`done`。有效的 `priority` 值：`low`、`normal`、`high`、`urgent`。

## `list`

```bash
openclaw workboard list
openclaw workboard list --board default --status ready
openclaw workboard list --json
```

文本输出非常紧凑：

```text
7f4a2c10  ready     high    default agent-a  Fix stale worker heartbeat
```

各列分别是 id 前缀、状态、优先级、board id、可选的 agent id，以及标题。

无效的 `--status` 退出时会出现错误，列出允许的值而不是返回空列表。

| 标志                 | 用途                                       |
| -------------------- | --------------------------------------------- |
| `--board <id>`       | 将结果限制为一个 board 命名空间          |
| `--status <status>`  | 将结果限制为一个 Workboard 状态         |
| `--include-archived` | 在紧凑文本输出中包含已归档卡片 |
| `--json`             | 以机器可读的 JSON 形式打印完整卡片列表      |

紧凑文本输出默认隐藏已归档卡片，因此 CLI 与 `/workboard list` 保持一致。传入 `--include-archived` 可显示它们。JSON 输出始终保留完整卡片列表，包括已归档卡片，以供现有自动化使用。

## `create`

```bash
openclaw workboard create "Fix stale worker heartbeat" --priority high --labels bug,workboard
openclaw workboard create "Write Workboard docs" --status ready --agent docs-agent --board docs --notes "Cover CLI, slash command, dispatch, and SQLite state."
```

| 标志                    | 用途                                 |
| ----------------------- | --------------------------------------- |
| `--notes <text>`        | 初始卡片备注                      |
| `--status <status>`     | 初始状态，默认 `todo`          |
| `--priority <priority>` | 优先级，默认 `normal`              |
| `--agent <id>`          | 将卡片分配给某个 agent 或 owner id |
| `--board <id>`          | 将卡片存储到某个 board 命名空间     |
| `--labels <items>`      | 以逗号分隔的标签                  |
| `--json`                | 以机器可读 JSON 输出创建的卡片  |

`create` 通过选定的状态所有者写入。该卡在 Control UI Workboard 选项卡和 Workboard 工具中立即可见。

## `show`

```bash
openclaw workboard show 7f4a2c10
openclaw workboard show 7f4a2c10 --json
```

文本输出会打印紧凑的卡片行和备注。JSON 输出会返回完整的卡片记录，包括执行元数据、尝试、评论、链接、证明、产物、工作线程日志、协议状态、诊断信息以及自动化元数据。

JSON 中的证明状态是工作人员报告的结果。 `passed` 记录工人对所附命令或检查的自我评估。这不是一个独立的验证结果。

## `move`

```bash
openclaw workboard move 7f4a2c10 --status review
openclaw workboard move 7f4a2c10 --status done --json
```

`move` 使用与在仪表板中拖动卡相同的手动操作员路径来更改卡的状态。它接受完整的卡 ID 或明确的前缀。主动依赖性和计划保留仍然适用。运营商可以在没有其代理领取令牌的情况下移动已领取的卡。声明令牌的范围仍然是代理工具突变，并且 JSON 输出会对它们进行编辑。

此命令通过选定的状态所有者进行写入，在网关运行时使用网关 RPC，在网关停止时使用独占离线所有权。

## `dispatch`

```bash
openclaw workboard dispatch
openclaw workboard dispatch --json
openclaw workboard dispatch --max-starts 10
openclaw workboard dispatch --admin
openclaw workboard dispatch --url http://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

`dispatch` 在打开本地工作板状态之前选择活动网关。隐式本地请求使用所有者绑定的 `workboard.cards.dispatch.owner` RPC。该方法使用与仪表板调度操作相同的子代理运行时。因此，就绪卡成为带有链接会话密钥的任务跟踪工作人员运行。 `--max-starts` 使用 `workboard.cards.dispatchWithOptions.owner` 作为隐式本地网关。没有所有者路由的旧网关或工作板插件在启动工作人员之前会拒绝；显式远程目标保留现有的 `workboard.cards.dispatch` 和 `workboard.cards.dispatchWithOptions` 合约。升级后，在使用该标志之前，请重新启动网关。分配了代理的卡使用代理范围的子代理会话密钥。未分配的卡保留未指定范围的子代理密钥，因此保留了网关配置的默认代理。

dispatch 循环：

1. 将依赖项已就绪的子卡提升为 `ready`。
2. 阻止已过期的认领或超时的 worker 运行。
3. 选择一小批无人认领的现成卡片。
4. 为调度员或指定的代理申领每张选定的卡。
5. 启动使用有界卡上下文和卡声明令牌运行的子代理工作线程。
6. 在卡上存储worker运行id、会话密钥、执行状态和worker日志。

空闲扫描使就绪卡历史记录保持不变。现有调度计数器和时间戳保留为历史值；新的启动使用该卡的启动、尝试和执行历史记录。

选择是保守的。默认情况下，一次调度最多启动三个工人。它会跳过已存档或已领取的卡牌。在一次通行证中，每个所有者或智能体仅启动一张卡。已由活跃运行或审核工作拥有的卡片将留待以后分发。使用正整数传递 `--max-starts <count>` 以更改单次上限。每人一张牌的规则仍然适用，因此有效的开始次数可能会更低。

如果在认领卡后工作程序启动失败，Workboard 会阻止该卡并清除认领。它记录卡执行和工作日志元数据中的失败。失败的启动保持可见，而不是默默地将卡返回到队列。

当这两个条件都成立时，CLI 会根据本地工作板状态回退到仅数据调度：

- 您没有给出明确的网关目标。
- 本地网关停止，CLI可以获得独占离线状态所有权。

仅数据调度仍然可以促进依赖关系、清除过时的声明并阻止超时运行，但它不会启动工作程序。无法联系到、缺少所需方法或拒绝请求的实时所有者永远不会触发本地回退。直接报告身份验证、权限、验证和显式目标失败。得到不确定的答复后，请在重试之前检查电路板。

仅数据调度需要停止网关。仅连接错误或缺少 RPC 方法并不能确定它已停止。正在运行的网关不会轮询另一个进程所做的突变。

文本输出会报告 worker 启动结果：

```text
dispatch complete: started=2 failures=0
```

当工作程序无法启动时，文本输出还会打印其卡 ID 前缀和失败原因。 JSON 输出在 `startFailures` 中包含相同的原因。

对于已授权完整主机工作区访问的卡，由于当前调用者仅限于配置的工作区而导致的拒绝包括 `--admin` 提示。请求`operator.admin`；网关必须批准该范围。该提示不适用于具有受限、只读或未知持久工作区权限的卡，并且 `--admin` 不会覆盖这些限制。

回退输出会明确说明：

```text
gateway unavailable; data dispatch only: promoted=1 blocked=0
```

JSON 输出包括调度结果。网关支持的调度可以包括 `started` 和 `startFailures`。仅数据回退包括 `gatewayUnavailable: true` 以及空 `started` 和 `startFailures` 数组。索赔令牌是从卡 JSON 输出中编辑的。

在仪表板中，相同的调度结果显示为简短摘要。操作员无需打开卡详细信息即可查看有多少卡已启动、升级、阻止、回收或失败。

## <a id="slash-command-parity"></a> 斜杠命令一致性

支持命令的通道可以使用对应的斜杠命令：

```text
/workboard list
/workboard show 7f4a2c10
/workboard create Fix stale worker heartbeat
/workboard move 7f4a2c10 --status review
/workboard dispatch
```

Slash 命令调度还使用网关子代理运行时。它遵循与仪表板和 CLI 网关路径相同的声明、工作启动和失败行为。

`/workboard list` 和 `/workboard show` 是授权命令发送者的读取命令。`/workboard create`、`/workboard move` 和 `/workboard dispatch` 会修改看板状态，并且在聊天界面上需要 owner 状态，或者使用具有 `operator.write` 或 `operator.admin` 的 Gateway 客户端。

## <a id="permissions"></a> 权限

CLI 调度路径通常请求网关 `operator.write` 和 `operator.read` 范围。工作区绑定卡直接在精确配置的代理工作区中运行。工作树请求被缩小到该目录，因此主机不会具体化存储库控制的代码。所选工作线程必须具有对该确切工作空间的可写、非共享 Docker 沙箱访问权限、与请求的安装和策略匹配的实时容器哈希，并且没有主机转义功能。传递 `--admin` 以显式请求 `operator.admin`，允许另一台主机签出，并使用正常的托管工作树设置。如果客户端未批准该范围，则连接将失败。只读网关令牌可以通过读取方法检查工作板数据，但不能创建卡片或调度工作人员。工作空间限制不会以其他方式更改具有工作板突变权限的呼叫者的手动卡移动。

本地 `list`、`create`、`show` 和 `move` 命令对当前配置文件使用的本地 OpenClaw 状态目录进行操作。当您需要不同的状态根时，请在顶级 `openclaw` 命令上使用 `--dev` 或 `--profile <name>`。

## <a id="troubleshooting"></a> 故障排查

### <a id="no-cards-appear"></a> 没有出现任何卡片

检查是否为相同的配置文件和状态根启用了该插件：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果仪表板显示有卡片但 CLI 没有，请检查这两个命令是否使用了相同的 `--dev` 或 `--profile` 设置。

### <a id="dispatch-says-data-only"></a> Dispatch 显示仅数据模式

启动或重启 Gateway：

```bash
openclaw gateway restart
openclaw gateway status --deep
```

然后重试 `openclaw workboard dispatch`。仅数据模式回退对本地状态清理很有用，但 worker 运行需要一个在线的 Gateway。

### <a id="dispatch-starts-nothing"></a> Dispatch 没有启动任何内容

检查是否至少有一张没有活跃 claim 的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

如果同一个 owner 已经有正在运行或处于 review 的工作，卡片也可能会被跳过。请将已完成的工作移动到 `done`，通过 Workboard 工具释放过期的 claim，或者在当前 worker 完成后再次运行 dispatch。

## <a id="related"></a> 相关内容

- [Workboard 插件](/plugins/workboard)
- [CLI 参考](/cli)
- [斜杠命令](/tools/slash-commands)
- [控制 UI](/web/control-ui)
