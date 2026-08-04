---
summary: "供代理拥有的卡片和会话交接使用的可选仪表板工作板"
read_when:
  - 你想在 Control UI 中使用类似看板的工作板
  - 你正在启用或禁用内置的 Workboard 插件
  - 你想在不使用外部项目管理工具的情况下跟踪计划中的代理工作
title: "Workboard 插件"
---

Workboard 插件会向
[Control UI](/web/control-ui) 添加一个可选的看板式工作板：适合代理大小的工作卡片、分配给代理，以及返回卡片任务、运行和仪表板会话的链接。

Workboard 的设计刻意保持小巧：它只跟踪一个 OpenClaw Gateway 的本地操作工作。它不是 GitHub Issues、Linear、Jira 或其他团队项目管理系统的替代品。

## 启用它

Workboard 已捆绑，但默认处于禁用状态：

1. 在 Control UI 中打开 **插件**，或使用相对于
   已配置 Control UI 基础路径的 `/settings/plugins`。例如，基础路径为 `/openclaw` 时，
   使用 `/openclaw/settings/plugins`。
2. 找到 **Workboard** 并选择 **启用**。由于 Workboard 已包含在
   OpenClaw 中，因此不需要执行 **安装** 操作。
3. 如果 UI 提示需要重启，请重启 Gateway。

在插件运行时加载后，Workboard 选项卡会出现在仪表板导航中。
当它被禁用时，该选项卡会继续在导航中隐藏。直接打开
`/workboard` 路由时，如果插件被禁用或被
`plugins.allow`/`plugins.deny` 阻止，则会显示插件不可用状态，而不是卡片
数据。

等效的 CLI 工作流为：

```bash
openclaw plugins enable workboard
openclaw gateway restart
openclaw dashboard
```

## 配置

Workboard 没有特定于插件的配置。使用标准的插件条目启用/禁用它：

```json5
{
  plugins: {
    entries: {
      workboard: {
        enabled: true,
        config: {},
      },
    },
  },
}
```

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## 卡片字段

| 字段       | 值                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `status`    | `triage`, `backlog`, `todo`, `scheduled`, `ready`, `running`, `review`, `blocked`, `done`                     |
| `priority`  | `low`, `normal`, `high`, `urgent`                                                                             |
| `labels`    | 自由格式字符串                                                                                             |
| `agentId`   | 可选分配的代理                                                                                       |
| linked refs | 可选的任务、运行、会话或源 URL                                                                    |
| `execution` | 针对从卡片启动的 Codex/Claude 运行的可选元数据（engine、mode、model、session、run id、status）                    |

卡片还携带用于尝试、评论、链接、证明、
制品、自动化设置、附件、工作进程日志、工作进程协议
状态、声明、诊断、通知、模板 id、归档状态，以及
过期会话检测的紧凑元数据，另外还有一个最近事件列表（`created`、`edited`、
`moved`、`linked`、`specified`、`decomposed`、`claimed`、`heartbeat`、
`execution_updated`、`attempt_started`、`attempt_updated`、`comment_added`、
`link_added`、`proof_added`、`artifact_added`、`attachment_added`、
`diagnostic`、`notification`、`dispatch`、`orchestration`、
`protocol_violation`、`archived`、`unarchived`、`stale`）。这些元数据让
操作员无需打开关联会话，就能看到卡片如何在看板中流转；它是本地运行上下文，不是会话记录或 GitHub issue 历史的替代品。

插件和 Control UI 使用同一份 Workboard 卡片契约。因此，仪表板刷新会保留工作区来源与权限、认领状态、诊断
操作以及通知序列号，而不是投影出一个更小的、仅供 UI 使用的
卡片副本。未知的诊断类型、诊断严重性和通知类型会被忽略，直到两个界面都支持它们；它们绝不会
被改写成另一种有效状态。

打开的仪表板会根据 `plugin.workboard.changed` 失效通知进行更新。每个
事件只包含存储时钟周期和修订号；随后 UI 会通过正常的 `operator.read` RPC
重新读取规范化卡片。多个修订会合并为
一次后续读取。Workboard 会在卡片被拖动、
编辑或写入时延迟该读取，然后在本地交互结束后恢复。重新连接时总会执行一次规范化重新加载。没有常规的整卡轮询，**刷新**
仍可作为手动恢复手段。

当存在多个看板时，工具栏会包含一个由已持久化的看板元数据支持的**看板**筛选器，而不仅仅依赖当前可见的卡片。因此，空看板和已归档看板仍然可以被选择。没有显式看板 id 的卡片属于规范的 `default` 看板。每个看板都有一个规范的
`/workboard/<boardId>` 页面，可添加书签、共享或固定到侧边栏。之前发布的
`/workboard?board=<boardId>` 形式仍作为兼容别名保留，并在保留其他查询参数的同时重定向到该页面。选择**所有看板**会返回 `/workboard`。

卡片存储在插件自身的 Gateway 状态中，并随着该 Gateway 的其余 OpenClaw 状态一起移动（见 [存储](#storage)）。

## 从卡片开始工作

未关联的卡片可以直接开始工作：

- **Run Codex** / **Run Claude** 启动一次带任务跟踪的代理运行，使用明确的引擎，发送卡片提示，并将卡片标记为 `running`。Codex 运行使用 `openai/gpt-5.6-sol`；Claude 运行使用 `anthropic/claude-sonnet-4-6`。
- **Open Codex** / **Open Claude** 创建一个已关联的仪表板会话，但不会发送卡片提示或移动卡片，适用于保留在看板上进行的手动工作。

自主启动使用 Gateway 的任务跟踪代理运行路径（除非明确选择 Codex/Claude，否则使用默认代理和模型）；随后 Workboard 会将生成的任务、运行 ID 和会话密钥链接回卡片。每次已关联的执行还会记录一条尝试摘要（引擎、模式、模型、运行 ID、时间戳、状态、滚动失败计数），以便重复失败保持可见。

仪表板会从 Gateway 任务账本刷新任务状态，并通过任务 ID、运行 ID 或关联的会话密钥将任务匹配到卡片。处于队列中/运行中的任务会保持卡片的生命周期处于活动状态；已完成、失败、超时或已取消的任务会使用与关联会话相同的同步规则将卡片推向 `review` 或 `blocked`（参见 [会话生命周期同步](#session-lifecycle-sync)）。

## 代理工具

| 工具                                                                                                                                             | 用途                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workboard_list`                                                                                                                                 | 列出紧凑卡片及其认领/诊断状态；可选的看板筛选。                                                                                                                                            |
| `workboard_read`                                                                                                                                 | 返回一张卡片以及受限的工作上下文（备注、尝试、评论、链接、证据、工件、父结果、最近指派给该卡片的工作、当前诊断）。                                                                       |
| `workboard_create`                                                                                                                               | 创建一张卡片，可选设置父项、租户、技能、看板、工作区元数据、幂等键、运行时限制、重试预算。                                                                                                 |
| `workboard_link`                                                                                                                                 | 将父卡片链接到子卡片。子卡片会保持 `todo`，直到每个父卡片都达到 `done`，随后通过分派提升移动到 `ready`。                                                                                  |
| `workboard_claim`                                                                                                                                | 为调用代理认领一张卡片；将 `backlog`/`todo`/`ready` 移入 `running`。                                                                                                                       |
| `workboard_heartbeat`                                                                                                                            | 在较长运行期间刷新认领心跳。                                                                                                                                          |
| `workboard_release`                                                                                                                              | 在完成、暂停或移交后释放认领；可将卡片移动到下一个状态。                                                                                                                                |
| `workboard_complete` / `workboard_block`                                                                                                         | 用于最终摘要、证据、工件以及已创建卡片清单的结构化生命周期工具（必须引用链接回已完成卡片的卡片）或阻塞原因。                                                                             |
| `workboard_attachment_add` / `workboard_attachment_read` / `workboard_attachment_delete`                                                         | 在插件 SQLite 状态中存储小型卡片附件，在卡片上建立索引，并在工作者上下文中暴露。                                                                                                         |
| `workboard_worker_log` / `workboard_protocol_violation`                                                                                          | 记录工作者日志行，并在自动化工作者停止而未调用 `workboard_complete`/`workboard_block` 时阻塞一张卡片。                                                                                     |
| `workboard_board_create` / `workboard_board_archive` / `workboard_board_delete`                                                                  | 管理持久化看板元数据（显示名称、描述、归档状态、默认工作区）。                                                                                                                            |
| `workboard_runs`                                                                                                                                 | 返回某张卡片的持久化运行尝试历史。                                                                                                                                      |
| `workboard_specify`                                                                                                                              | 将粗略的分诊/待办卡片转为明确的 `todo` 卡片；在卡片上记录规格摘要。                                                                                                                        |
| `workboard_decompose`                                                                                                                            | 将父级编排卡片分解为链接的子卡片，继承看板/租户元数据；可用已创建卡片清单完成父卡片。                                                                                                     |
| `workboard_notify_subscribe` / `workboard_notify_list` / `workboard_notify_events` / `workboard_notify_advance` / `workboard_notify_unsubscribe` | 管理通知订阅。事件读取支持重放安全；`advance` 会移动持久游标，使调用方在恢复时不会丢失或重复读取已完成/失败/过时的卡片事件。                                                              |
| `workboard_boards` / `workboard_stats`                                                                                                           | 检查看板命名空间和队列统计。                                                                                                                                             |
| `workboard_promote` / `workboard_reassign` / `workboard_reclaim`                                                                                 | 恢复或转交卡住的工作。                                                                                                                                                           |
| `workboard_comment` / `workboard_proof`                                                                                                          | 添加移交备注或附加证据/工件引用。                                                                                                                                    |
| `workboard_unblock`                                                                                                                              | 将被阻塞的工作移回 `todo`。                                                                                                                                                         |
| `workboard_move`                                                                                                                                 | 将卡片移动到另一种状态；已认领的卡片需要调用方的代理认领作用域。                                                                                                      |
| `workboard_dispatch`                                                                                                                             | 在不启动工作者的情况下，推动依赖提升或清理过期认领；工作者启动使用 Gateway 或斜杠命令分派。                                                        |

证明状态是工作者报告的结果，而非独立验证。`passed` 条目表示工作者报告其命令或检查已成功；需要独立质量门禁的使用者应检查所附的命令、URL 或工件，并运行自己的验证器。`workboard_proof` 会返回新记录的 `proofId`。当 `workboard_complete` 报告同一证明的终止状态时，传入 `proofId`，即可在原位置解决待处理记录，同时保留其身份和时间戳。已经具有相同终止状态的证明将原样复用。不带 `proofId` 的完成证明仍采用追加模式，因此后续重试不会仅仅因为命令或备注相同就重写较早的历史记录。

已认领的卡片会拒绝来自其他代理的代理工具变更，除非调用方持有 `workboard_claim` 返回的认领令牌。代理工具或 Gateway RPC 调用返回的每张卡片都会将 `metadata.claim.token` 脱敏为 `[redacted]`（令牌本身仅从 `workboard_claim` 顶层返回一次），因此控制面板操作员和其他代理可以检查认领状态，而不会看到可用的令牌。恢复操作通过 `workboard_promote`/`workboard_reassign`/`workboard_reclaim` 进行，这些操作不需要令牌。

## 调度

调度是 Gateway 本地的：它不会生成任意 OS 进程。正常的
OpenClaw 子代理会话仍然负责执行。一次调度流程：

1. 提升依赖已就绪的卡片。
2. 在就绪卡片上记录调度元数据。
3. 阻止已过期的认领或超时运行。
4. 将看板配置的分诊卡标记为编排候选。
5. 认领一小批就绪卡片，并通过
   Gateway 子代理运行时启动 worker 运行。

Worker 会获得受限的卡片上下文，以及通过 Workboard 工具执行心跳、
完成或阻塞卡片所需的认领令牌。

Workspace 路径遵循调用方现有的文件系统权限。具有 `operator.write` 的 Gateway
客户端可以使用已配置的 agent 工作区；
`operator.admin` 客户端可以使用其他主机检出目录。受沙箱限制的 agent 工具使用
其沙箱工作区访问权限，而未受沙箱限制的仅工作区工具使用其
配置的工作区根目录。Workboard 在分配工作区时记录该权限，并在调度时
再次将其与当前调用方的权限求交，因此持久化的卡片不会扩大后续调用方的访问权限。
较旧的卡片如果带有显式的主机工作区但没有记录的权限，则必须先将该工作区
重新保存，才能进行完整主机调度；没有主机路径的卡片会在首次调度时采用
当前调用方的权限。

仅当工作区绑定的调度请求的仓库根目录与目标 agent 工作区完全匹配时，
才接受目录或 Git 检出目录。worktree 请求会被缩小到该目录并持久化为目录工作区，
因此主机不会物化该检出目录，也不会执行仓库设置代码。目标 worker 必须为该确切
工作区使用可写、非共享的 Docker 沙箱，且不得使用提升执行权限、持久化的主机/节点 exec 覆盖，
以及未分类的插件和 MCP 工具。Workboard 枚举其已注册工具，而不是信任
`workboard_*` 前缀，并且如果活动挂载/配置哈希已过期，调度会拒绝热 Docker 容器。
调度会报告不兼容的目标策略，而不是启动一个限制更少的 worker。
完整主机调度可以针对其他本地检出目录，并保留正常的受管 worktree 设置。

工作区权限不会创建第二套卡片生命周期权限模型。
可以修改 Workboard 卡片的调用方，可以在所有界面上手动将其推进相同的状态；
只读的工作区访问只会阻止需要写入的 worker 调度。

### Worker 选择

每次流程默认**最多启动 3 个 worker**。就绪卡片会按
优先级、然后位置、然后创建时间排序。一次流程只会为每个
owner/agent 启动一张卡片，并跳过那些在看板上已经有运行中或审核中工作的 owner。
已归档卡片、带有活动认领的卡片，以及不处于 `ready`
状态的卡片，绝不会被选中用于 worker 启动（但它们仍可能受到调度数据侧的影响：
过期认领清理、依赖提升、超时清理）。

会话键会针对每个 board/card 进行确定性生成，因此重复调度会回到
同一 worker 车道，而不是创建无关的会话：

- 已分配卡片：`agent:<agentId>:subagent:workboard-<boardId>-<cardId>`
- 未分配卡片：`subagent:workboard-<boardId>-<cardId>`（Gateway 会解析
  配置的默认 agent）

如果在卡片被认领后无法启动 worker，Workboard 会阻塞该
卡片、清除认领、记录运行启动失败，并追加一行 worker 日志——
该日志可在仪表板、CLI JSON、agent 工具以及卡片诊断中查看。

### 入口点

- 仪表板调度操作
- `openclaw workboard dispatch`
- 命令可用频道中的 `/workboard dispatch`

当 Gateway 可用时，这三者都使用 Gateway 子代理运行时。CLI 有一个
操作员回退机制：如果 Gateway 调用因连接/不可用错误失败（或者对于旧版
Gateway，因 `unknown method` 错误失败），并且没有显式的
`--url`/`--token` 目标，同时也没有配置远程 Gateway（`OPENCLAW_GATEWAY_URL` 或
`gateway.mode: remote`）适用，那么 CLI 会在本地 SQLite 状态上执行仅数据的调度——
它可以提升依赖、清理过期认领并阻塞超时运行，但无法启动 worker。来自可达 Gateway 的认证、
权限和验证失败不被视为不可用；它们会作为命令错误暴露出来，
当提供了显式的 `--url`/`--token` 目标时，任何 Gateway 失败也同样如此。

看板元数据可以设置 `autoDecompose`、`autoDecomposePerDispatch`、
`defaultAssignee` 和 `orchestratorProfile`。OpenClaw 会记录这一意图并
在 worker 上下文中暴露它；实际的规格说明/分解仍然通过正常的 Workboard 工具运行。

## CLI 和斜杠命令

```bash
openclaw workboard list [--board <id>] [--status <status>] [--include-archived] [--json]
openclaw workboard create "修复失效卡片生命周期" --priority high --labels bug,workboard
openclaw workboard show <card-id> [--json]
openclaw workboard move <card-id> --status <status> [--json]
openclaw workboard dispatch [--board <id>] [--json]
```

`list` 的文本输出默认隐藏已归档卡片（`--include-archived`
会覆盖这一行为）；`--json` 始终包含已归档卡片，与现有脚本使用的完整卡片
契约保持一致。`show` 和 `move` 接受不含歧义的 id 前缀。`list`、`create`、`show` 和 `move` 始终直接读写本地插件
状态。只有 `dispatch` 会调用正在运行的 Gateway，并采用上文
所述的回退机制。

有关完整标志、JSON 输出、Gateway
回退行为、id 前缀处理、dispatch 选择规则以及故障排查，请参见 [Workboard CLI](/cli/workboard)。

`/workboard list`、`/workboard show <card-id>`、`/workboard create <title>`、
`/workboard move <card-id> --status <status>` 和 `/workboard dispatch` 与
CLI 保持一致。List 和 show 对任何已授权的命令发送者都是只读操作。
Create、move 和 dispatch 在聊天界面上需要所有者权限，或者使用具有
`operator.write`/`operator.admin` 的 Gateway 客户端。手动 operator 移动使用
与仪表板拖放相同的认领覆盖行为。它们的 worktree 访问仍遵循上文
所述的相同工作区边界。

## 会话生命周期同步

卡片可以链接到现有的仪表板会话，或者链接到你从卡片开始工作时创建的会话。已链接的卡片会内联显示会话生命周期：运行中、过期、已链接空闲、完成、失败或缺失。你也可以在 Sessions 选项卡中使用 **Add to Workboard** 捕获一个现有会话；卡片会链接到该会话，使用会话标签或最近的用户提示作为标题，并在可用时基于最近的用户提示以及最新的助手回复填充备注。

如果链接的会话丢失，卡片仍会保留链接以便提供上下文，并且仍然提供开始控制来重启到一个新的会话中。如果一个处于活动状态的已链接会话停止报告最近活动，Workboard 会将该卡片标记为 `stale`，并将其作为元数据存储，直到生命周期将其清除。

当卡片处于活动工作状态时，Workboard 会跟随链接的会话：

| 链接的会话状态                         | 卡片状态    |
| ------------------------------------- | ----------- |
| active                                | `running`   |
| completed                             | `review`    |
| failed, killed, timed out, or aborted | `blocked`   |

**人工审核状态优先。** 将卡片移动到 `review`、`blocked` 或 `done` 会停止该卡片的自动同步，直到你将其移回 `todo` 或 `running`。

启动卡片会使用常规的 Gateway 会话；Workboard 只存储卡片元数据和链接。对话记录、模型选择以及运行生命周期仍由常规会话系统管理。对一个正在运行的已链接卡片使用 **Stop** 可中止当前运行——Workboard 会将该卡片标记为 `blocked`，以便它仍然可见，供后续跟进。

新卡片可以从 Workboard 模板（`bugfix`、`docs`、`release`、`pr_review`、`plugin`）开始。模板会预填标题、备注、标签和优先级；模板 id 会作为卡片元数据存储。

## 仪表板工作流

1. 在 Control UI 中打开 Workboard 选项卡。
2. 创建一张卡片，填写标题、备注、优先级、标签、可选 agent，以及
   可选的关联 session；或者打开 Sessions，并为
   现有 session 选择 **Add to Workboard**。
3. 将卡片在各列之间拖动，或者聚焦其紧凑状态控件并使用
   菜单或 ArrowLeft/ArrowRight。在拖动过程中，源卡片会变暗，
   可放置的列会获得轮廓高亮。
4. 从卡片开始工作，以创建或复用一个 dashboard session。
5. 在 agent 工作时，从卡片打开关联的 session。
6. 让 lifecycle sync 将运行中的工作移动到 `review`/`blocked`，然后在被接受时手动将卡片移至 `done`。

### 会话看板小组件

Workboard 为会话仪表板提供两个原生小组件（参见
[仪表板](/web/dashboards)）。agent 使用其 `dashboard` 工具并通过
`content: { kind: "plugin", pluginKind, props }` 固定这些小组件；它们会以带有实时数据的一等 UI 组件进行渲染——无需沙盒框架或能力授权：

- `workboard:card` 配合 `props: { cardId }` 显示一张卡片，其中包含其状态
  控件、优先级和分配的 agent。
- `workboard:mini` 可选配 `props: { boardId, limit }`，显示各状态的
  数量、排名靠前的 ready/running 卡片，并链接到完整的看板页面。
  不提供 `boardId` 时，它会汇总所有看板；提供 `boardId` 时，它会限定在
  该看板内（未明确指定看板 id 创建的卡片会归属于 `default`）。

## 诊断

诊断结果由本地卡片元数据计算得出。内置检查会标记：

| 类型                        | 条件                                                                           |
| --------------------------- | ------------------------------------------------------------------------------ |
| `stranded_ready`            | 已分配的 `todo`/`backlog`/`ready` 卡片超过 1 小时未更新。             |
| `running_without_heartbeat` | `running` 卡片超过 20 分钟没有认领心跳或执行更新。 |
| `blocked_too_long`          | `blocked` 卡片超过 24 小时未更新。                                   |
| `repeated_failures`         | 卡片记录的失败次数达到 2 次或以上。                                |
| `missing_proof`             | `done` 卡片没有证明、工件或附件。                          |
| `orphaned_session`          | 具有 `sessionKey` 但没有 `execution` 元数据的 `running` 卡片。                |
| `archived_but_active`       | 已归档卡片仍处于任何非 `done` 生命周期状态。                      |

## 权限

Gateway RPC 方法位于 `workboard.*` 下：

| 作用域            | 方法                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `operator.read`  | `cards.list`、`cards.export`、`cards.diagnostics`、附件列表/获取、通知事件读取、`boards.list`、`cards.stats`、`cards.runs`                                                                                                                                                                                                                                       |
| `operator.write` | `cards.diagnostics.refresh`、创建/更新/移动/删除/评论/链接/链接依赖/证明/工件、附件添加/删除、worker 日志、协议违规、claim/heartbeat/release/promote/reassign/reclaim/complete/block/unblock、`cards.dispatch`、`cards.bulk`、归档、`boards.upsert`/`archive`/`delete`、`cards.specify`/`decompose`、通知订阅/删除/推进 |

没有任何 RPC 方法需要 `operator.admin`。以只读
operator 访问连接的浏览器可以检查看板，但不能修改卡片。管理员作用域会扩大可接受的 Workboard 主机路径；它不会改变可用的方法。

## 存储

Workboard 将持久化数据存储在 OpenClaw 状态目录下一个由插件拥有的关系型 SQLite 数据库中：看板、卡片、标签、生命周期事件、运行尝试、评论、依赖链接、证明、工件引用、附件元数据和二进制内容、诊断信息、通知、工作器日志、协议状态以及订阅都保存在 Workboard 的表中（而不是插件的键值条目中）。卡片导出会保留看板叙事内容，而不会内联附件二进制内容。

在 `.28` 版本中使用过 Workboard 的安装，可以运行 `openclaw doctor --fix`，将随附的旧版插件状态命名空间（`workboard.cards`、`workboard.boards`、`workboard.notify`，以及如果存在的话 `workboard.attachments`）迁移到关系型数据库中。

## 故障排查

**标签页显示 Workboard 不可用**

```bash
openclaw plugins inspect workboard --runtime --json
```

如果已配置 `plugins.allow`，请将 `workboard` 添加进去。如果 `plugins.deny`
中包含 `workboard`，请在启用插件前将其移除。

**卡片无法保存**

确认浏览器连接具有 `operator.write` 访问权限。只读 operator 会话可以列出卡片，但不能创建、编辑、移动或删除卡片。

**启动卡片不会打开预期的会话**

检查卡片的 agent id 和关联会话，然后打开 Sessions 或 Chat，以
查看实际的运行状态。

**Dispatch 不会启动工作进程**

确认至少有一张没有活动认领的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

如果 CLI 报告的是仅数据分发（data-only dispatch），请启动或重启 Gateway 后重试——仅数据分发会更新本地看板状态，但不能启动子代理工作进程运行。若同一 owner 或 agent 的另一张卡片已经在运行或等待审查，当前卡片也可能会被跳过；请先完成、阻塞或释放该活动工作，再为同一 owner 继续分发更多卡片。

## 相关内容

- [控制 UI](/web/control-ui)
- [Workboard CLI](/cli/workboard)
- [插件](/tools/plugin)
- [管理插件](/plugins/manage-plugins)
- [会话](/concepts/session)
