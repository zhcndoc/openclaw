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

Workboard 已捆绑，但默认是禁用的：

```bash
openclaw plugins enable workboard
openclaw gateway restart
openclaw dashboard
```

Workboard 选项卡会出现在仪表板导航中。如果该选项卡可见，但插件被禁用，或者被 `plugins.allow`/`plugins.deny` 阻止，则该选项卡会显示插件不可用状态，而不是卡片数据。

## 配置

Workboard 没有插件特定的配置。使用标准
插件条目启用/禁用它：

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
| `execution` | 针对从卡片启动的 Codex/Claude 运行的可选元数据（engine、mode、model、session、run id、status） |

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

卡片存储在插件自身的 Gateway 状态中，并随着该 Gateway 的其余 OpenClaw 状态一起移动（参见 [存储](#storage)）。

## 从卡片开始工作

未关联的卡片可以直接开始工作：

- **运行 Codex** / **运行 Claude** 会启动一个带任务跟踪的代理运行，使用明确的引擎，发送卡片提示，并将卡片标记为 `running`。Codex 运行使用 `openai/gpt-5.5`；Claude 运行使用 `anthropic/claude-sonnet-4-6`。
- **打开 Codex** / **打开 Claude** 会创建一个关联的仪表板会话，但不会发送卡片提示，也不会移动卡片，适用于保持附属于看板的手动工作。

自主启动使用 Gateway 的任务跟踪代理运行路径（除非明确选择 Codex/Claude，否则使用默认代理和模型）；随后 Workboard 会将生成的任务、运行 ID 和会话密钥链接回卡片。每次已关联的执行还会记录一条尝试摘要（引擎、模式、模型、运行 ID、时间戳、状态、滚动失败计数），以便重复失败保持可见。

仪表板会从 Gateway 任务账本刷新任务状态，并通过任务 ID、运行 ID 或关联的会话密钥将任务匹配到卡片。处于队列中/运行中的任务会保持卡片的生命周期处于活动状态；已完成、失败、超时或已取消的任务会使用与关联会话相同的同步规则将卡片推向 `review` 或 `blocked`（参见 [会话生命周期同步](#session-lifecycle-sync)）。

## 代理工具

| 工具                                                                                                                                             | 用途                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workboard_list`                                                                                                                                 | 列出紧凑卡片，包含认领/诊断状态；可选看板筛选。                                                                                                                                            |
| `workboard_read`                                                                                                                                 | 返回一张卡片以及受限的 worker 上下文（备注、尝试、评论、链接、证据、工件、父结果、最近的执行者工作、活跃诊断）。                                                                              |
| `workboard_create`                                                                                                                               | 创建一张卡片，可选包含父级、租户、技能、看板、工作区元数据、幂等键、运行时限、重试预算。                                                                                                   |
| `workboard_link`                                                                                                                                 | 将父卡片链接到子卡片。子卡片会保持为 `todo`，直到每个父卡片都达到 `done`，然后通过调度晋升移动到 `ready`。                                                                                  |
| `workboard_claim`                                                                                                                                | 为调用该工具的代理认领一张卡片；将 `backlog`/`todo`/`ready` 移入 `running`。                                                                                                                 |
| `workboard_heartbeat`                                                                                                                            | 在较长运行期间刷新认领心跳。                                                                                                                                                           |
| `workboard_release`                                                                                                                              | 在完成、暂停或交接后释放认领；可将卡片移动到下一个状态。                                                                                                                                   |
| `workboard_complete` / `workboard_block`                                                                                                         | 用于最终摘要、证据、工件以及已创建卡片清单的结构化生命周期工具（必须引用链接回已完成卡片的卡片），或用于阻塞原因。                                                                               |
| `workboard_attachment_add` / `workboard_attachment_read` / `workboard_attachment_delete`                                                         | 在插件 SQLite 状态中存储小型卡片附件，在卡片上建立索引，并在 worker 上下文中暴露。                                                                                                          |
| `workboard_worker_log` / `workboard_protocol_violation`                                                                                          | 记录 worker 日志行，并在自动 worker 停止而未调用 `workboard_complete`/`workboard_block` 时阻塞卡片。                                                                                         |
| `workboard_board_create` / `workboard_board_archive` / `workboard_board_delete`                                                                  | 管理持久化的看板元数据（显示名称、描述、归档状态、默认工作区）。                                                                                                                            |
| `workboard_runs`                                                                                                                                 | 返回某张卡片持久化的运行尝试历史。                                                                                                                                                     |
| `workboard_specify`                                                                                                                              | 将一张粗略的分诊/待办卡片转为明确的 `todo` 卡片；在卡片上记录规格摘要。                                                                                                                     |
| `workboard_decompose`                                                                                                                            | 将一个父级编排卡片拆分为已链接的子卡片，继承看板/租户元数据；可使用已创建卡片清单完成父卡片。                                                                                                   |
| `workboard_notify_subscribe` / `workboard_notify_list` / `workboard_notify_events` / `workboard_notify_advance` / `workboard_notify_unsubscribe` | 管理通知订阅。事件读取支持重放安全；`advance` 会移动持久游标，因此调用方可以在不丢失或重复读取已完成/失败/陈旧卡片事件的情况下继续。                                                            |
| `workboard_boards` / `workboard_stats`                                                                                                           | 检查看板命名空间和队列统计。                                                                                                                                                           |
| `workboard_promote` / `workboard_reassign` / `workboard_reclaim`                                                                                 | 恢复或转交卡住的工作。                                                                                                                                                                 |
| `workboard_comment` / `workboard_proof`                                                                                                          | 添加交接备注或附加证据/工件引用。                                                                                                                                                       |
| `workboard_unblock`                                                                                                                              | 将被阻塞的工作移回 `todo`。                                                                                                                                                            |
| `workboard_dispatch`                                                                                                                             | 促发依赖晋升或陈旧认领清理。                                                                                                                                                           |

已认领的卡片会拒绝来自其他代理的工具变更，除非调用方持有由 `workboard_claim` 返回的认领令牌。每个由代理工具或 Gateway RPC 调用返回的卡片都会将 `metadata.claim.token` 脱敏为 `[redacted]`（令牌本身仅在 `workboard_claim` 的顶层返回一次），因此仪表板操作员和其他代理可以检查认领状态，而始终看不到可用的令牌。恢复通过 `workboard_promote`/`workboard_reassign`/`workboard_reclaim` 进行，这些工具不需要该令牌。

## 调度

调度是 Gateway 本地的：它不会生成任意 OS 进程。正常的
OpenClaw 子代理会话仍然负责执行。一次调度流程：

1. 提升依赖已就绪的卡片。
2. 在就绪卡片上记录调度元数据。
3. 阻止已过期的认领或超时运行。
4. 将 बोर्ड 配置的分诊卡标记为编排候选。
5. 认领一小批就绪卡片，并通过
   Gateway 子代理运行时启动 worker 运行。

Worker 会获得受限的卡片上下文，以及通过 Workboard 工具执行心跳、
完成或阻塞卡片所需的认领令牌。

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
openclaw workboard dispatch [--board <id>] [--json]
```

`list` 的文本输出默认隐藏已归档卡片（`--include-archived`
会覆盖此行为）；`--json` 始终包含已归档卡片，与现有脚本使用的完整卡片
契约保持一致。`show` 接受一个无歧义的 id 前缀。
`list`、`create` 和 `show` 始终直接读写本地插件状态。
只有 `dispatch` 会调用正在运行的 Gateway，并使用上面描述的回退方案。

有关完整标志、JSON 输出、Gateway
回退行为、id 前缀处理、dispatch 选择规则以及故障排查，请参见 [Workboard CLI](/cli/workboard)。

`/workboard list`、`/workboard show <card-id>`、`/workboard create <title>`，
以及 `/workboard dispatch` 与 CLI 保持一致。对于任何经过授权的命令发送者，List 和 show 都是读取操作。
在聊天界面上，Create 和 dispatch 需要 owner 状态，或者具有 `operator.write`/`operator.admin` 的 Gateway 客户端。

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

1. 在控制界面中打开 Workboard 选项卡。
2. 创建一张卡片，填写标题、备注、优先级、标签、可选代理，以及
   可选的关联会话；或者打开 Sessions，并为现有会话选择 **Add to Workboard**。
3. 在列之间拖动卡片，或者聚焦其紧凑状态控件，并使用
   菜单或 ArrowLeft/ArrowRight。
4. 从卡片开始工作，以创建或复用一个仪表板会话。
5. 当代理工作时，从卡片中打开关联的会话。
6. 让生命周期同步将运行中的工作移入 `review`/`blocked`，然后在接受后手动将卡片移动到 `done`。

## 诊断

诊断结果由本地卡片元数据计算得出。内置检查会标记：

| 类型                        | 条件                                                                           |
| --------------------------- | ------------------------------------------------------------------------------ |
| `stranded_ready`            | 分配为 `todo`/`backlog`/`ready` 的卡片超过 1 小时未更新。                       |
| `running_without_heartbeat` | `running` 卡片在超过 20 分钟内没有领取心跳或执行更新。                           |
| `blocked_too_long`          | `blocked` 卡片超过 24 小时未更新。                                              |
| `repeated_failures`         | 卡片跟踪的失败次数达到 2 次或更多。                                              |
| `missing_proof`             | `done` 卡片没有证明、产物或附件。                                                |
| `orphaned_session`          | 带有 `sessionKey` 但没有 `execution` 元数据的 `running` 卡片。                  |

## 权限

Gateway RPC 方法位于 `workboard.*` 下：

| 作用域            | 方法                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operator.read`  | `cards.list`、`cards.export`、`cards.diagnostics`、附件列表/获取、通知事件读取、`boards.list`、`cards.stats`、`cards.runs`                                                                                                                                                                                                                                       |
| `operator.write` | `cards.diagnostics.refresh`、创建/更新/移动/删除/评论/链接/链接依赖/证明/工件、附件添加/删除、worker 日志、协议违规、claim/heartbeat/release/promote/reassign/reclaim/complete/block/unblock、`cards.dispatch`、`cards.bulk`、归档、`boards.upsert`/`archive`/`delete`、`cards.specify`/`decompose`、通知订阅/删除/推进 |

没有任何 RPC 方法需要 `operator.admin`。具有只读 operator 访问权限的浏览器可以检查看板，但不能修改卡片。

## 存储

Workboard 将持久化数据存储在 OpenClaw 状态目录下一个由插件拥有的关系型 SQLite 数据库中：看板、卡片、标签、生命周期事件、运行尝试、评论、依赖链接、证明、工件引用、附件元数据和二进制内容、诊断信息、通知、worker 日志、协议状态以及订阅都保存在 Workboard 的表中（而不是插件的键值条目中）。卡片导出会保留看板叙事内容，而不会内联附件二进制内容。

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

检查卡片的 agent id 和关联会话，然后打开 Sessions 或 Chat 以
查看实际的运行状态。

**Dispatch 不会启动 worker**

确认至少有一张没有活动认领的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

如果 CLI 报告的是仅数据分发（data-only dispatch），请启动或重启 Gateway 后重试——仅数据分发会更新本地看板状态，但不能启动 subagent worker 运行。若同一 owner 或 agent 的另一张卡片已经在运行或等待审查，当前卡片也可能会被跳过；请先完成、阻塞或释放该活动工作，再为同一 owner 继续分发更多卡片。

## 相关内容

- [控制 UI](/web/control-ui)
- [Workboard CLI](/cli/workboard)
- [插件](/tools/plugin)
- [管理插件](/plugins/manage-plugins)
- [会话](/concepts/session)
