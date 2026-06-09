---
summary: "供代理拥有的卡片和会话交接使用的可选仪表板工作板"
read_when:
  - 你想在 Control UI 中使用类似看板的工作板
  - 你正在启用或禁用内置的 Workboard 插件
  - 你想在不使用外部项目管理工具的情况下跟踪计划中的代理工作
title: "Workboard 插件"
---

Workboard 插件为 [Control UI](/web/control-ui) 添加了一个可选的看板式面板。你可以用它来收集适合代理处理的工作卡片，将它们分配给代理，并从一张卡片上跟踪关联的后台任务、运行和仪表板会话。

Workboard 的设计刻意保持精简。它用于跟踪 OpenClaw Gateway 的本地运维工作；它不是 GitHub Issues、Linear、Jira 或其他团队项目管理系统的替代品。

## 默认状态

Workboard 是一个内置插件，默认处于禁用状态，除非你在插件配置中启用它。

使用以下命令启用它：

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

然后打开仪表板：

```bash
openclaw dashboard
```

Workboard 选项卡会出现在仪表板导航中。如果该选项卡可见，但插件被禁用，或者被 `plugins.allow` / `plugins.deny` 阻止，视图将显示插件不可用状态，而不是本地卡片数据。

## 卡片包含的内容

每张卡片会存储：

- 标题和备注
- 状态：`triage`、`backlog`、`todo`、`scheduled`、`ready`、`running`、`review`、`blocked` 或 `done`
- 优先级：`low`、`normal`、`high` 或 `urgent`
- 标签
- 可选的代理 ID
- 可选的关联任务、运行、会话或源 URL
- 可选的执行元数据，用于从卡片启动的 Codex 或 Claude 运行
- 面向尝试、评论、链接、证据、工件、自动化、附件、worker 日志、worker 协议状态、认领、诊断、通知、模板、归档状态以及过期会话检测的紧凑元数据
- 最近的卡片事件，例如创建、移动、关联、认领、心跳、尝试、证据、工件、诊断、通知、派发、归档、过期或代理更新等变更

卡片存储在插件的 Gateway 状态中。它们位于 Gateway 状态目录下，并会随着该 Gateway 的其余 OpenClaw 状态一起移动。

Workboard 会为每张卡片保留紧凑的元数据，这样操作人员无需打开关联会话，就能看到卡片如何在看板中流转。事件、尝试摘要、证据片段、相关链接、评论、归档标记和过期会话标记都刻意作为本地元数据保留；它们不能替代会话记录或 GitHub issue 历史。

## 卡片执行和任务

未关联的卡片可以从卡片本身启动工作。自动启动会使用 Gateway 的任务跟踪代理运行路径，然后 Workboard 会把生成的任务、运行 ID 和会话密钥关联回该卡片。启动时会使用 Gateway 配置的默认代理和模型。Codex 和 Claude 操作是可选的显式模型选择：

- 运行 Codex 或运行 Claude 会启动一个带任务的代理运行，发送卡片提示，并将卡片标记为 `running`。
- 打开 Codex 或打开 Claude 会创建一个关联的仪表板会话，但不会发送卡片提示，也不会移动卡片，因此你可以在它仍然附着在看板上的情况下手动处理。

执行元数据会在卡片上存储所选引擎、模式、模型引用、会话密钥、运行 ID、任务 ID（如果可用）以及生命周期状态。Codex 执行使用 `openai/gpt-5.5`；Claude 执行使用 `anthropic/claude-sonnet-4-6`。

每次关联的执行还会在同一张卡片记录上保留一个尝试摘要。尝试摘要会保留引擎、模式、模型、运行 ID、时间戳、状态以及滚动失败计数，这样重复失败在看板上仍然可见。

仪表板会从 Gateway 任务账本中刷新任务状态，并通过任务 ID、运行 ID 或关联会话密钥将任务匹配回卡片。如果任务处于排队或运行中，卡片生命周期会显示活跃任务状态。如果任务完成、失败、超时或被取消，卡片生命周期会使用与关联会话相同的生命周期同步，向 review 或 blocked 状态移动。

## 代理协作

Workboard 还为面向看板的工作流提供了可选的代理工具：

- `workboard_list` 列出紧凑卡片及其认领和诊断状态，并支持可选的看板过滤。
- `workboard_read` 返回一张卡片以及基于备注、尝试、评论、链接、证据、工件、父级结果、最近的受理人工作和活动诊断构建的有界 worker 上下文。
- `workboard_create` 创建一张卡片，可选地指定父级、租户、技能、看板、工作区元数据、幂等键、运行时限和重试预算。
- `workboard_link` 将父卡片链接到子卡片。子卡片会保持在 `todo`，直到每个父级都到达 `done`；然后派发提升会把它们移动到 `ready`。
- `workboard_claim` 为调用代理认领一张卡片，并将 `backlog`、`todo` 或 `ready` 卡片移入 `running`。
- `workboard_heartbeat` 在较长运行期间刷新认领心跳。
- `workboard_release` 在完成、暂停或交接后释放认领，并可将卡片移动到下一个状态。
- `workboard_complete` 和 `workboard_block` 是结构化生命周期工具，用于最终摘要、证据、工件、创建卡片清单和阻塞原因。创建卡片清单必须引用链接回已完成卡片的卡片，这样可以防止虚假的子卡片混入摘要。
- `workboard_attachment_add`、`workboard_attachment_read` 和 `workboard_attachment_delete` 会在插件 SQLite 状态中存储小型卡片附件，将其编入卡片索引，并在 worker 上下文中公开它们。
- `workboard_worker_log` 和 `workboard_protocol_violation` 会记录 worker 日志行，并在自动 worker 停止而未调用 `workboard_complete` 或 `workboard_block` 时阻塞卡片。
- `workboard_board_create`、`workboard_board_archive` 和 `workboard_board_delete` 管理持久化的看板元数据，例如显示名称、描述、归档状态和默认工作区。
- `workboard_runs` 返回存储在卡片上的持久化运行尝试历史。
- `workboard_specify` 将一张粗略的 triage 或 backlog 卡片转化为澄清后的 `todo` 卡片，并在卡片上记录规格摘要。
- `workboard_decompose` 将一个父级编排卡片拆分为链接的子卡片，继承看板和租户元数据，并可通过创建卡片清单完成父卡片。
- `workboard_notify_subscribe`、`workboard_notify_list`、`workboard_notify_events`、`workboard_notify_advance` 和 `workboard_notify_unsubscribe` 管理插件状态中的通知订阅。事件读取是可重放安全的；advance 工具会推进持久游标，使调用方可以在不丢失或重复读取已完成、失败或过期的卡片事件的情况下继续。
- `workboard_boards`、`workboard_stats`、`workboard_promote`、`workboard_reassign`、`workboard_reclaim`、`workboard_comment`、`workboard_proof`、`workboard_unblock` 和 `workboard_dispatch` 允许代理检查看板命名空间、查看队列统计、恢复卡住的工作、添加交接备注、附加证据或工件引用、将被阻塞的工作移回 `todo`，并推动依赖提升或过期认领清理。

被认领的卡片会拒绝来自其他代理的工具级变更，除非调用方持有 `workboard_claim` 返回的认领令牌。仪表板操作员仍然使用正常的 Gateway RPC 表面，并且可以恢复或重新分配卡片。

Workboard 将持久化的看板数据存储在 OpenClaw 状态目录下、由插件拥有的关系型 SQLite 数据库中。看板、卡片、标签、生命周期事件、运行尝试、评论、依赖链接、证据、工件引用、附件元数据和二进制内容、诊断、通知、worker 日志、协议状态以及订阅都保存在 Workboard 表中，而不是插件的键值条目中。卡片导出仍然会保留看板叙事，而不会内联附件二进制内容。

在 `.28` 版本中使用过 Workboard 的安装可以运行 `openclaw doctor --fix`，将随附的旧插件状态命名空间（`workboard.cards`、`workboard.boards` 和 `workboard.notify`）迁移到关系型数据库中。如果存在旧的 `workboard.attachments` 命名空间，doctor 也会迁移那些附件二进制内容。

Workboard 诊断由本地卡片元数据计算得出。内置检查会标记等待过久的已分配卡片、没有最近心跳的运行中卡片、需要关注的被阻塞卡片、重复失败、没有证据的已完成卡片，以及只有松散会话链接的运行中卡片。

派发被刻意限定为 Gateway 本地操作。它不会启动任意操作系统进程；正常的 OpenClaw 子代理会话仍然负责执行。派发操作会推动依赖就绪的卡片，记录就绪卡片上的派发元数据，阻塞过期的认领或超时运行，将看板配置的 triage 卡片标记为编排候选，然后认领一小批就绪卡片，并通过 Gateway 子代理运行时启动 worker 运行。已分配的卡片使用 `agent:<id>:subagent:workboard-*` worker 会话密钥；未分配的卡片使用未限定范围的 `subagent:workboard-*` 密钥，因此 Gateway 仍然会解析配置的默认代理。worker 会获得有界卡片上下文以及它们通过 Workboard 工具对卡片执行心跳、完成或阻塞所需的认领令牌。

### 派发 worker 选择

每次派发默认最多启动三个 worker。就绪卡片会按优先级、位置和创建时间排序，然后过滤以避免重复的活跃所有权。一次派发在同一轮中只会为同一所有者或代理启动一张卡片，并会跳过在看板上已经有运行中或 review 工作的所有者。

归档卡片、具有活跃认领的卡片，以及没有 `ready` 状态的卡片，不会被选中用于启动 worker。不过，在发生过期认领、依赖提升或超时清理时，dispatch 的数据侧仍然可能影响这些卡片。

### worker 提示词和生命周期

worker 提示词包括卡片标题、有界备注和上下文、指定的看板以及 Workboard worker 协议。它还包括认领所有者和认领令牌，因此 worker 可以调用 `workboard_heartbeat`、`workboard_complete` 或 `workboard_block`，而不会被其他参与者接管卡片。

当 worker 成功启动时，Workboard 会在卡片上存储会话密钥、运行 ID、引擎、模式、模型标签、状态和 worker 日志。会话密钥对于看板和卡片是确定性的，这使得重复派发会路由回同一个 worker 车道，而不是创建无关的会话。

如果在卡片被认领后 worker 无法启动，Workboard 会阻塞该卡片、清除认领、记录运行启动失败，并追加一条 worker 日志。该失败会在仪表板、CLI JSON、代理工具和卡片诊断中可见。

### 派发入口

就绪卡片的 worker 启动可以通过以下方式发生：

- 仪表板派发操作
- `openclaw workboard dispatch`
- 命令能力通道上的 `/workboard dispatch`

当 Gateway 可用时，这三种入口都会使用 Gateway 子代理运行时。CLI 还有一个额外的操作员回退：如果 Gateway 离线，或者没有公开 Workboard dispatch 方法，并且没有提供显式的 `--url` 或 `--token` 目标，它就会对本地 SQLite 状态执行仅数据派发。该回退可以提升依赖、清理过期认领并阻塞超时运行，但不能启动 worker。

看板元数据可以包含诸如 `autoDecompose`、`autoDecomposePerDispatch`、`defaultAssignee` 和 `orchestratorProfile` 之类的编排设置。OpenClaw 会记录编排意图并在 worker 上下文中公开它；但实际的规格说明和拆分仍然通过常规的 Workboard 工具完成。

## CLI 和斜杠命令

该插件注册了一个根 CLI 命令：

```bash
openclaw workboard list
openclaw workboard create "修复过时卡片生命周期" --priority high --labels bug,workboard
openclaw workboard show <card-id>
openclaw workboard dispatch
```

`openclaw workboard dispatch` 会调用正在运行的 Gateway，因此工作进程的启动会使用与仪表板相同的子代理运行时。如果 Gateway 不可用，它会回退到仅数据分发，因此依赖升级、过时认领清理和超时阻塞仍然可以运行。认证、权限和校验失败仍会作为命令错误返回，显式指定 `--url` 或 `--token` 目标时的失败也一样。

`/workboard` 斜杠命令支持相同的精简操作路径：`/workboard list`、`/workboard show <card-id>`、`/workboard create <title>` 和 `/workboard dispatch`。list 和 show 对已授权的命令发送者是只读操作。create 和 dispatch 需要聊天界面中的所有者状态，或者具有 `operator.write` 或 `operator.admin` 的 Gateway 客户端。

有关命令标志、JSON 输出、Gateway 回退行为、无歧义 id 前缀处理、分发选择规则和故障排查，请参阅 [Workboard CLI](/cli/workboard)。

## 会话生命周期同步

卡片可以链接到现有仪表板会话，或者链接到你从卡片开始工作时创建的会话。已链接的卡片会内联显示会话生命周期：运行中、过时、已链接空闲、完成、失败或缺失。

如果链接的会话缺失，卡片仍会保留链接以便提供上下文，并且仍会提供启动控件，这样你就可以在新的仪表板会话中重新开始工作。若一个活动的已链接会话停止报告最近活动，Workboard 会将该卡片标记为过时，并把该标记作为卡片元数据保存，直到生命周期将其清除。

你也可以在 Sessions 选项卡中通过 Add to Workboard 捕获一个现有的仪表板会话。卡片会链接到该会话，使用会话标签或最近的用户提示作为标题，并在可用聊天历史时，以上一次用户提示以及最新的助手回复生成备注。

当卡片仍处于活动工作状态时，Workboard 会跟踪已链接会话：

- active linked session -> `running`
- completed linked session -> `review`
- failed, killed, timed out, or aborted linked session -> `blocked`

手动审查状态优先。如果你将卡片移到 `review`、`blocked` 或 `done`，Workboard 会停止自动移动该卡片，直到你把它移回 `todo` 或 `running`。

## 仪表板工作流

1. 在 Control UI 中打开 Workboard 选项卡。
2. 创建一张卡片，填写标题、备注、优先级、标签、可选代理以及可选的已链接会话。
3. 或者打开 Sessions，并为现有会话选择 Add to Workboard。
4. 在列之间拖动卡片，或聚焦卡片上的紧凑状态控件，并使用其菜单或 ArrowLeft/ArrowRight。
5. 从卡片启动工作，以创建或复用一个仪表板会话。
6. 在代理工作时，从卡片打开已链接会话。
7. 让生命周期同步将运行中的工作移到 review 或 blocked，然后在接受后手动将卡片移到 done。

从卡片启动会使用正常的 Gateway 会话。Workboard 插件只存储卡片元数据和链接；对话记录、模型选择和运行生命周期仍由常规会话系统负责。

在一个处于活动链接状态的卡片上使用 Stop，可以中止当前会话运行。Workboard 会将该卡片标记为 `blocked`，以便它继续可见，便于后续跟进。

新卡片可以从 Workboard 模板开始，适用于 bug 修复、文档、发布、PR 审查或插件工作。模板会预填标题、备注、标签和优先级，并将所选模板 id 作为卡片元数据存储。

## 权限

该插件在 `workboard.*` 命名空间下注册了 Gateway RPC 方法：

- `workboard.cards.list` 需要 `operator.read`
- `workboard.cards.export` 需要 `operator.read`
- `workboard.cards.diagnostics` 需要 `operator.read`
- `workboard.cards.diagnostics.refresh` 需要 `operator.write`
- 附件列表/获取和通知事件读取需要 `operator.read`
- 通知游标推进需要 `operator.write`
- 创建、更新、移动、删除、评论、链接、依赖链接、证明、工件、
  附件添加/删除、工作线程日志、协议违规、认领、心跳、
  释放、完成、阻塞、解除阻塞、分发、批量和归档方法需要
  `operator.write`

连接到只读 operator 访问的浏览器可以查看看板，但不能修改卡片。

## 配置

Workboard 目前没有插件专属配置。通过标准插件入口启用或禁用它：

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

使用以下命令再次禁用它：

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## 故障排查

### 选项卡显示 Workboard 不可用

检查插件策略：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果配置了 `plugins.allow`，请将 `workboard` 加入该允许列表。如果 `plugins.deny` 包含 `workboard`，请在启用插件前将其移除。

### 卡片无法保存

确认浏览器连接具有 `operator.write` 访问权限。只读 operator 会话可以列出卡片，但不能创建、编辑、移动或删除卡片。

### 启动卡片没有打开预期的会话

Workboard 会创建指向正常仪表板会话的链接。检查卡片的代理 id 和已链接会话，然后打开 Sessions 或 Chat 视图以查看实际运行状态。

### 分发没有启动工作线程

确认至少有一张没有活动认领的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

如果 CLI 报告仅数据分发，请启动或重启 Gateway 后重试。仅数据分发会更新本地看板状态，但无法启动子代理工作线程运行。

如果同一所有者或代理的另一张卡片已经在运行或等待审查，卡片也可能会被跳过。为同一所有者分发更多工作之前，请先完成、阻塞或释放该活动工作。

## 相关内容

- [Control UI](/web/control-ui)
- [Workboard CLI](/cli/workboard)
- [Plugins](/tools/plugin)
- [Manage plugins](/plugins/manage-plugins)
- [Sessions](/concepts/session)
