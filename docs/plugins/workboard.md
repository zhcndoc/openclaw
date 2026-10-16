---
summary: "用于代理拥有的卡和基于规则的会话视图的可选工作板"
read_when:
  - "你想在 Control UI 中使用类似看板的工作板"
  - "你正在启用或禁用内置的 Workboard 插件"
  - "你想在不使用外部项目管理工具的情况下跟踪计划中的代理工作"
  - "您希望会话按会话状态、观察者运行状况和拉取请求状态进行分组"
title: "工作板插件"
doc-schema-version: 1
---

工作板插件向 [Control UI](/web/control-ui) 添加了一个可选的看板样式板：代理大小的工作卡、代理分配以及返回卡的任务、运行和 Control UI 会话的链接。单独的 **Sessions 板** 使用网关拥有的事实规则将现有会话分组为可编辑列。

Workboard 的设计刻意保持小巧：它只跟踪一个 OpenClaw Gateway 的本地操作工作。它不是 GitHub Issues、Linear、Jira 或其他团队项目管理系统的替代品。

## <a id="enable-it"></a> 启用它

Workboard 已捆绑，但默认处于禁用状态：

1. 在Control UI中打开**Plugins**，或使用相对于配置的Control UI基本路径的`/plugins`。例如，基本路径 `/openclaw` 使用 `/openclaw/plugins`。
2. 打开**Workboard**插件，选择**Lifecycle**，打开启用开关。由于 Workboard 包含在 OpenClaw 中，因此不需要 **Install** 操作。
3. 等待生命周期操作完成，然后打开“工作板”选项卡。

插件运行时加载后，“工作板”选项卡将显示在 Control UI 导航中。当它被禁用时，该选项卡在导航中保持隐藏状态。当插件被 `plugins.allow`/`plugins.deny` 禁用或阻止时，直接打开 `/workboard` 路由会显示插件不可用状态而不是卡数据。

等效的 CLI 工作流为：

```bash
openclaw plugins enable workboard
openclaw dashboard
```

启用自动应用于正在运行的网关。如果处于离线状态，请在打开仪表板之前启动它。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="configuration"></a> 配置

Workboard 没有特定于插件的配置。 Enable/disable 它带有标准插件条目：

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
```

## <a id="storage-recovery"></a> 存储恢复

如果 SQLite 工作线程失败，则在本机清理完成后，Workboard 将在下次调用时通过数据库工作线程所有者重新打开其存储。已在运行的操作仍可能报告失败或未知的写入结果； Workboard 不会重播该操作。一旦底层存储问题得到解决，就不需要重新启动网关。更新不需要配置或数据迁移。

## <a id="board-appearance"></a> 板外观

当工作板打开时，其侧边栏条目会展开以显示卡片和会话板，并突出显示打开的板。选择一个嵌套板将其打开。侧边栏标签使用板名称；具有相同名称的板在括号中包含其类型，例如 **Planning（卡片）** 和 **Planning（会话）**。您在 Control UI 中创建的板会立即固定在侧栏中。右键单击某个板，或聚焦其链接并按 **Shift+F10** 或上下文菜单键，将 **固定到侧边栏**、**从侧边栏取消固定**，或**删除板…**。删除需要确认命名板并需要写入权限。无法删除默认板卡和仍包含卡的板卡。删除打开的板将返回到工作板根页面。还可以使用**Customize**来管理管脚；移除的销钉保持移除状态。当您离开工作板时，固定板仍可用作顶级条目，并且您可以拖动它们以重新排序。

选择 **New board**，然后选择 **Cards**（默认）或 **Sessions**。会话板从下面描述的列开始。董事会的类型是永久性的；创建另一个板以使用另一种。现有的板仍然是 Cards 板。

使用 **Edit board** 更改面板的名称、图标和颜色。 **重置为默认**保存时清除图标和颜色；取消会使保存的板保持不变。对于会话板，同一对话框还可以编辑列标签、颜色、描述、列顺序和后备列。请董事会代理编辑栏规则。仅保存名称、图标或颜色会使已保存的列保持不变，包括在对话框打开时由其他操作员进行的列编辑。

对于 `workboard.boards.upsert`，省略 `icon` 或 `color`、传递 `null` 或传递空字符串将保留现有值，包括旧客户端。要明确清除外观，请发送 `clearAppearance: ["icon", "color"]`，或仅列出要清除的字段。即使请求还为其提供了替换值，列出的字段也会被清除。其他字段保留其普通更新行为。 `clearAppearance` 必须是仅包含 `"icon"` 和 `"color"` 的数组；空数组不会改变任何内容。使用此参数的客户端需要支持显式外观清除的网关版本；较旧的网关不实现此重置。

完整的卡列表根据板范围和卡修订共享一份准备好的、经过声明令牌编辑的快照。 `workboard.cards.list` 返回 `revision`；当当前为 `{ unchanged: true, revision }` 时，对 `{ sinceRevision: revision }` 重复相同的查询。该修订版包括存储纪元，以及对于范围查询而言，规范化的 `boardId` 和请求的 `sessionKey`。可选的 `sessionKey` 过滤器采用非空规范会话密钥，并通过其执行或通过记录的尝试或事件选择直接链接的卡。可与`boardId`组合使用；省略它会保留完整列表的行为。在加载卡片注释、评论、事件和其他详细信息之前，在数据库中进行选择。普通按键与Matrix/Signal结构段比较不区分大小写；不透明的对等 ID 和目录源标识符保留其确切身份。 Control UI 和服务器过滤器共享 `@openclaw/normalization-core` 中的 `normalizeSessionKeyForComparison`，通过 `openclaw/plugin-sdk/session-key-runtime` 暴露给插件。候选匹配在加载匹配卡之前仅读取会话链接字段。重新连接请求相同范围的新快照。 `plugin.workboard.changed` 包括事件 `revision` 和单独的 `cardsRevision`：会话事实通知推进事件序列，而不会使未更改的卡失效。

## <a id="sessions-board"></a> 会话板

使用会话板即可查看对话的进展情况，而无需创建卡片。默认情况下，它包括来自过去 72 小时内有活动的所有已配置代理的会话，但不包括存档会话、自动化 （cron） 会话、系统会话、停靠对话和每个代理的主会话。子代理会话仍包含在内。设置 `scope.includeAutomation: true` 以包括自动化和系统会话，或设置 `scope.includeHome: true` 以包括家庭会话。董事会代理可以设置这些选项。现有板使用相同的默认设置，无需迁移。每个会话仅出现在一列中。打开一个图块以继续对话；该图块还显示其代理、运行状态、可用的观察者标题、拉取请求和最近的活动。消息预览为纯文本：删除 Markdown 格式和 HTML，保留链接标签，并折叠 400 个字符限制之前的空格。磁贴最多链接四个拉取请求，按打开、草稿、合并、关闭状态排序，并包含任何其他拉取请求的计数。代理过滤器会缩小显示的会话范围，但不会更改保存的板范围。

即使包含自动化，Dock 对话仍被排除在外。

**人物过滤器：** 选择**Everyone**（默认）、**涉及我**或代理过滤器旁边的人。让我参与显示您拥有或之前提示的会话；一个人选择他们的个人资料关联。每个查看器、设备、网关和板都会记住该选择。它不会更改共享董事会、规则或董事会代理。 API客户端可以将`view: { involvingMe?: boolean, involvingProfileId?: string, includePeople?: boolean }`传递给`workboard.sessionsBoard.read`； `includePeople` 返回选择器的人员方面。

列是关于网关拥有的运行状态、观察者运行状况和拉取请求状态的规则。运行状态来自实时运行注册表和排队输入；没有活动运行的已保存 `running` 状态是空闲的。运行状况来自网关会话观察者：有人在 Control UI 中观看的会话的实时摘要，以及观察到的运行结束时的终端摘要。无人监视的会话没有运行状况，因此它们仅匹配运行和拉取请求规则。读取遵循当前调用者的会话可见性；板规格和引脚遵循网关的可信运营商模型。在写入之前，在调用者的实时权限下允许进行交互式编辑。草稿和隐身会话永远不会进入会话板或其事实读取。

新会话板按以下顺序使用这些列：

| 柱子      | 规则                                                              |
| ----------- | ----------------------------------------------------------------- |
| 需要输入 | 观察者健康状况为 `waiting-on-user`。                             |
| 卡住       | 观察者运行状况为 `stuck` 或 `failed`，或者运行状态为 `failed`。 |
| 工作中     | 运行处于活动状态。                                                    |
| 审核中   | 拉取请求处于开放状态或草稿状态。                                  |
| 合并      | 合并拉取请求。                                         |
| 完毕        | 观察者健康状况为 `done`。这也是后备列。      |

当其列仍然存在时，放置使用操作员引脚，然后是按保存顺序排列的第一个匹配列，然后是后备列。 `match` 接受一个规则或任意数组，例如 Stuck 的 `[{health:["stuck","failed"]},{run:["failed"]}]`，规则中的每个字段都需要匹配。字段内的值是替代值。列名和描述帮助人们了解看板； `match` 规则决定放置。

将会话拖到另一列中，或要求董事会代理移动它，以固定其位置。当会话事实发生变化时，引脚仍然有效。如果固定列被删除，董事会将再次应用其规则。平铺工具提示通过规则 **和**pinned**来区分**。

事实根据会话更改实时更新，最多每五秒自动重读一次板。仅类别会话更新和仅卡片更改不会重新加载会话板。网关选择一次授权名册，并为未更改的会话重用不可变的事实。该板为每个板和人员视图保留一个冻结快照，仅替换事实发生更改的行。实时运行状态、后台预览和时间相关的子代理状态保持最新状态；配置文件、配置、拓扑和访问更改刷新授权。 Age-window 和 unavailable-PR 重试截止日期仍会刷新快照。工具调用者获得自己的调用者范围名册；共享永远不会扩大会话可见性。 `workboard.sessionsBoard.read` 返回 `revision`；当当前为 `{ unchanged: true, revision }` 时，对 `{ sinceRevision: revision }` 重复相同的查询。重新连接并查看更改会请求完整快照。工作板更改事件的 `sessionsRevision` 独立于 `cardsRevision` 进行板编辑、操作员引脚和会话事实失效。

拉取请求事实来自网关的共享 PR 所有者，与 Control UI 侧栏中显示的会话无关。读取使用准备好的网关事实，无需等待 Git 或拉取请求。丢失的快照通过该所有者的有界后台加载程序加载，并在准备好时宣布主板更改。如果 PR 事实变得不可用或 GitHub 速率限制请求，则网关的选定事实所有者会保留最后准备好的板卡和列规则的 PR 列表，同时更新运行状态和运行状况。不可用 PR 每个会话读取重试，一分钟后开始，加倍至最长 15 分钟；成功读取会重置延迟。编辑更改会忽略保留的 PR 标题，直到有新的源文本可用，而不更改已知的 PR 状态或其重试时间表。内联警告可区分过时的 PR 事实与尚未加载的事实，并识别 GitHub 速率限制。读取失败的事实会保留最后已知的事实和位置；没有已知事实的会话使用后备列，原因为 `facts-unavailable`。可用事实与规则不匹配的会话也会使用该原因，而其拉取请求事实未知。打开面板会启动任何所需的后台刷新。共享快照重复使用准备好的事实，直到发布、修订更改、董事会年龄窗口到期或拉取请求重试到期；失败后备保留最后已知的事实。如果在事实中断期间编辑规则发生变化，董事会将丢弃保留的文本，同时保留已知的运行、运行状况和 PR 状态。

当 Control UI 主机支持会话坞时，**Board 代理** 在板旁边打开对话。它的第一次使用创建并保存名为 **Sessions 板·&lt; 板名称 &gt;** 的专用对话。这是一个停靠对话：它不包含在会话列表、“涉及我”的视图和人数统计中。从**Board代理**按钮打开它。它的人类创建者、共享和沙箱规则与普通对话相同。

对于具有旧板代理对话的板，下一个 **Board 代理** 使用会创建新的停靠对话并保存其引用。旧对话保留其历史记录，并且仍然是您可以存档的普通会话；它的创作面和出处没有被改写。

Board 代理是董事会使用的唯一模型，可根据需要调用以使用以下工具更改列、规则、范围或引脚：

| 工具                              | 论点和行为                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `workboard_sessions_board_read`   | 可选`boardId`；返回板、列、会话和任何警告。                                                        |
| `workboard_sessions_board_update` | 可选 `boardId`，加上 `columns` 或 `scope`。 `columns` 替换完整的有序列表；重命名标签时保留 id。 |
| `workboard_sessions_board_move`   | 可选`boardId`，必需`sessionKey`和`columnId`；固定该会话的位置。                                      |

启用插件后，每个代理都可以使用这三个工具；与卡片工具不同，它们不需要 `tools.allow` 条目，因此 Board 代理可以开箱即用。仅当仅存在一个会话板时才忽略 `boardId`。码头将页面上下文附加到对话，但插件工具不接收该上下文作为结构化参数。对于多个会话板，代理必须从该上下文或 `workboard_boards` 传递板 ID。

规范允许 2-12 列，具有唯一的小写 slug id（1-48 个字符）、标签 （1-60） 和描述 （1-400）。恰好有一列必须包含 `fallback: true`。可选颜色使用板调色板。 `scope` 接受 `agentIds`、`includeArchived`、`includeAutomation`、`includeHome` 和正 `maxAgeHours`。包含选项默认为 false。规则可以匹配 `health`、`run`（`active`、`idle`、`failed`）、`pullRequest`（`none`、`open`、`draft`、 `merged`、`closed`） 和 `archived`。未知的拉取请求状态不算作 `none`。

网关方法为 `workboard.sessionsBoard.read` （`operator.read`）、`workboard.sessionsBoard.update` 和 `.move` （`operator.write`）。全部需要 `boardId`。更新采用带有规格字段的 `patch` 对象，包括扩展坞的 `agentSessionKey`；移动还需要 `sessionKey` 和 `columnId`。使用 `workboard.boards.upsert` 和 `kind: "sessions"` 或使用 `workboard_board_create` 创建。更改现有板的类型被拒绝。

Workboard 在 SQLite 中存储电路板规格和操作员引脚。会话状态、观察者摘要和拉取请求状态仍然由网关拥有。插件启动时，旧的自动展示位置将被删除；操作员引脚被保留。其规则仍与之前的默认值相匹配的董事会将收到新的基于运行的规则；仅对旧的默认列顺序进行重新排序。保留自定义规则、标签、描述和自定义列顺序。会话板从不持有卡片：卡片创建、捕获和发送会拒绝会话板目标。删除一个会删除其 pin，而不删除任何会话或其董事会代理对话。

## <a id="card-fields"></a> 卡片字段

| 字段       | 值                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `status`    | `triage`, `backlog`, `todo`, `scheduled`, `ready`, `running`, `review`, `blocked`, `done`                     |
| `priority`  | `low`, `normal`, `high`, `urgent`                                                                             |
| `labels`    | 自由格式字符串                                                                                             |
| `agentId`   | 可选分配的代理                                                                                       |
| 链接参考文献 | 可选的任务、运行、会话或源 URL                                                                    |
| `execution` | 针对从卡片启动的 Codex/Claude 运行的可选元数据（engine、mode、model、session、run id、status） |

卡片还带有紧凑的元数据：

| 元数据      | 值                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 卡状态    | 尝试、评论、链接、证明、工件、自动化设置、附件、工作日志、工作协议状态、声明、诊断、通知、模板 ID、存档状态、过时会话检测                                                                                                                                                   |
| 最近的事件 | `created`, `edited`, `moved`, `linked`, `specified`, `decomposed`, `claimed`, `heartbeat`, `execution_updated`, `attempt_started`, `attempt_updated`, `comment_added`, `link_added`, `proof_added`, `artifact_added`, `attachment_added`, `diagnostic`, `notification`, `dispatch`, `orchestration`, `protocol_violation`, `archived`, `unarchived`, `stale` |

该元数据使操作员可以在不打开链接会话的情况下查看卡片如何在板上移动。它是本地操作上下文，不能替代会话记录或 GitHub 问题历史记录。

新的和编辑的评论仅限于 2000 个字符。未更改的存储评论正文（包括旧的超大评论）在发送和其他卡片更新期间保留其确切文本。现有的每卡元数据预算仍然适用。

该插件和 Control UI 使用一张 Workboard 卡合约。因此，Control UI 刷新会保留工作区来源和权限、声明状态、诊断操作和通知序列号，而不是投影卡的较小 UI-only 副本。未知的诊断类型、诊断严重性和通知类型将被忽略，直到两个表面都支持它们。它们永远不会被重写为另一种有效状态。

打开的“工作板”选项卡从 `plugin.workboard.changed` 失效中更新。每个事件仅包含一个存储纪元和修订版本。然后，UI 通过正常的 `operator.read` RPC 重新读取存储的卡片。多次修订合并为一篇后续阅读。工作板在拖动、编辑或写入卡片时推迟读取，然后在本地交互完成后恢复。重新连接始终从存储执行重新加载。没有例行的全卡轮询，并且 **Refresh** 仍可用于手动恢复。

侧边栏目录读取 `workboard.boards.list` 中的名称和摘要。会话标头芯片仅读取通过 `workboard.cards.list` 会话过滤器链接到其会话的卡；两者都不会下载不相关的卡历史记录。这些较窄的读取保留了现有的渲染。

网关在每个存储修订版中每个板过滤器共享一个不可变的完整 `workboard.cards.list` 有效负载，包括并发读取。会话过滤读取不会保留有效负载缓存。卡和板写入在下一次读取之前使缓存的有效负载无效；当现有的更改服务观察到来自另一个 SQLite 连接的提交时，它也会使其无效。每个响应仍然包含所有板摘要，因此对另一个板的更改也会使有效负载无效。声明令牌仍然经过编辑，并且 RPC 响应形状保持不变。

当存在多个板时，工具栏包含一个 **Board** 过滤器，该过滤器由持久的板元数据支持，而不仅仅是当前可见的板卡。因此，空板和存档板仍然可以选择。没有明确板 ID 的卡属于主 `default` 板。每个板都有一个 `/workboard/<boardId>` 主页面，可以将其添加为书签、共享或固定在侧边栏中。之前发布的 `/workboard?board=<boardId>` 表单仍然是兼容性别名并重定向到该页面，同时保留其他查询参数。选择**所有板**返回到`/workboard`。

板可以存储对拥有 AI- 分类提示、模型、计划和运行历史记录的自动化作业的 `automationJobId` 引用。当存在该引用时，主板页面会显示 **Automation** 链接。匹配的会话事件通过活动工作板服务的调度程序权限推动附加的自动化，包括在工作人员的工具权限关闭之后，同一板的事件合并 60 秒。如果尝试在其运行仍处于活动状态时结束，则生命周期扫描会在记录最终结果时推动自动化。自动化的时间表仍然是后盾。禁用和自动禁用的自动化永远不会被轻推。删除板不会删除或以其他方式改变操作员拥有的自动化作业。

卡片存储在插件自身的 Gateway 状态中，并随着该 Gateway 的其余 OpenClaw 状态一起移动（见 [存储](#storage)）。

## <a id="starting-work-from-a-card"></a> 从卡片开始工作

没有活动或未解决的任务关联的未链接卡可以直接开始工作：

- **Run Claude** / **Run OpenAI** 启动使用显式引擎运行的任务跟踪代理，发送卡提示，并将卡标记为 `running`。 Claude 运行使用 `anthropic/claude-sonnet-4-6`。 OpenAI 运行使用 `openai/gpt-6-astra`。
- **Open Claude** / **Open OpenAI** 创建链接的 Control UI 会话，而不发送卡提示，用于保持连接到电路板的手动工作。打开它会清除所有计划并将 `scheduled` 卡移动到 `todo`。其他卡保持其状态。

自主启动使用网关的任务跟踪代理运行路径（默认代理和模型，除非明确选择 Claude/OpenAI）。然后，Workboard 将生成的运行 ID 和会话密钥链接回卡上。每个链接执行还记录尝试摘要（引擎、模式、模型、运行 ID、时间戳、状态、滚动失败计数），以便重复的失败保持可见。

Control UI 从卡的链接会话中读取生命周期。卡状态更改由网关端工作板插件使用链接的运行和会话生命周期进行持久化（请参阅 [Session 生命周期sync](#session-lifecycle-sync)）。

## <a id="agent-tools"></a> 代理工具

下面的卡片工具是可选的插件工具。启用工作板仅向座席公开三个会话板工具；应该创建、领取或完成卡片的代理需要允许的卡片工具。将插件 ID 添加到代理的工具策略中以允许每个 Workboard 工具，或列出单个工具名称或模式，例如 `workboard_*`：

```json5
{
  agents: {
    entries: {
      main: {
        tools: { alsoAllow: ["workboard"] },
      },
    },
  },
}
```

如果没有该条目，代理只能看到 `workboard_sessions_board_*` 并且无法管理卡。 Workboard 从卡（**Start** 或调度）启动的工作程序不需要它：每个工作程序运行都会为其卡授予 `workboard_heartbeat`、`workboard_complete` 和 `workboard_block`。

| 工具                                                                                                                                             | 用途                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workboard_list`                                                                                                                                 | 列出状态为 claim/diagnostic 的紧凑型卡；可选板过滤器。                                                                                                                    |
| `workboard_read`                                                                                                                                 | 返回一张卡以及从同一张卡读取的有界工作人员上下文（注释、尝试、评论、链接、证明、工件、父结果、最近的受让人工作、主动诊断）。       |
| `workboard_create`                                                                                                                               | 创建一张卡片，可选设置父项、租户、技能、看板、工作区元数据、幂等键、运行时限制、重试预算。                                                             |
| `workboard_link`                                                                                                                                 | 将父卡片链接到子卡片。子卡片会保持 `todo`，直到每个父卡片都达到 `done`，随后通过分派提升移动到 `ready`。                                                     |
| `workboard_claim`                                                                                                                                | 为调用代理认领一张卡片；将 `backlog`/`todo`/`ready` 移入 `running`。                                                                                                        |
| `workboard_heartbeat`                                                                                                                            | 在较长运行期间刷新认领心跳。                                                                                                                                          |
| `workboard_release`                                                                                                                              | 在完成、暂停或移交后释放认领；可将卡片移动到下一个状态。                                                                                                |
| `workboard_complete` / `workboard_block`                                                                                                         | 用于最终摘要、证据、工件以及已创建卡片清单的结构化生命周期工具（必须引用链接回已完成卡片的卡片）或阻塞原因。                 |
| `workboard_attachment_add` / `workboard_attachment_read` / `workboard_attachment_delete`                                                         | 在插件 SQLite 状态中存储小型卡片附件，在卡片上建立索引，并在工作者上下文中暴露。                                                                                         |
| `workboard_worker_log` / `workboard_protocol_violation`                                                                                          | 记录工人日志行并在自动化工人停止而不调用 `workboard_complete`/`workboard_block`. 时阻止卡                                                           |
| `workboard_board_create` / `workboard_board_archive` / `workboard_board_delete`                                                                  | 管理持久化看板元数据（显示名称、描述、归档状态、默认工作区）。                                                                                            |
| `workboard_sessions_board_read` / `workboard_sessions_board_update` / `workboard_sessions_board_move`                                            | 阅读会话板布局，编辑列、规则或范围，或将会话固定在列中。                                                                                              |
| `workboard_runs`                                                                                                                                 | 返回某张卡片的持久化运行尝试历史。                                                                                                                                      |
| `workboard_specify`                                                                                                                              | 将粗糙的 triage/backlog 卡变成清晰的 `todo` 卡；在卡上记录规格摘要。                                                                                      |
| `workboard_decompose`                                                                                                                            | 将父级编排卡扇入链接的子级，继承 board/tenant 元数据；可以使用创建的卡清单来完成父项。                                             |
| `workboard_notify_subscribe` / `workboard_notify_list` / `workboard_notify_events` / `workboard_notify_advance` / `workboard_notify_unsubscribe` | 管理通知订阅。事件读取是重放安全的； `advance` 移动持久光标，以便呼叫者恢复而不会丢失或重复读取 completed/failed/stale 卡事件。 |
| `workboard_boards` / `workboard_stats`                                                                                                           | 检查看板命名空间和队列统计。                                                                                                                                                 |
| `workboard_promote` / `workboard_reassign` / `workboard_reclaim`                                                                                 | 恢复或转交卡住的工作。                                                                                                                                                           |
| `workboard_comment` / `workboard_proof`                                                                                                          | 添加移交注释或附上 proof/artifact 参考文献。                                                                                                                                    |
| `workboard_unblock`                                                                                                                              | 将被阻塞的工作移回 `todo`。                                                                                                                                                         |
| `workboard_move`                                                                                                                                 | 将卡片移动到另一种状态；已认领的卡片需要调用方的代理认领作用域。                                                                                                      |
| `workboard_dispatch`                                                                                                                             | 在不启动工作者的情况下，推动依赖提升或清理过期认领；工作者启动使用 Gateway 或斜杠命令分派。                                                        |

创建链接卡、链接现有卡以及分解一次保存一张卡。如果后面的步骤失败，已完成的步骤仍然可见； Workboard 报告原始错误而不回滚它们。重试之前检查电路板，并根据需要修复缺失的链接或删除不需要的部分卡。

证明状态是工作人员报告的结果，而不是独立验证。 `passed` 条目表示工作线程报告其命令或检查成功。需要独立质量门的消费者应检查附加命令 URL 或工件并运行自己的验证器。 `workboard_proof` 返回新记录的 `proofId`。当 `workboard_complete` 报告相同证明的终端状态时，传递 `proofId` 以便就地解析待处理记录，而不会丢失其身份或时间戳。已经具有相同终端状态的证明将不加改变地重复使用。没有 `proofId` 的完成证明仍然是仅附加的，因此稍后的重试不能仅仅因为其命令或注释相同而重写旧的历史记录。

在保存卡之前，Completion 会验证其证明、工件和通知。验证失败会使卡保持不变。完成通知保留完整的执行运行 ID，包括长度超过 120 个字符的 ID。跨执行准入、启动元数据、工作日志和通知订阅的运行 ID 限制为 512 个字符。如果录取拒绝，则使用较短的 ID； ID 永远不会被截断。元数据修剪保留完成的新通知和证明，并根据需要丢弃旧历史记录。如果这些记录不适合，则完成将失败且不保存卡。

除非调用者持有 `workboard_claim` 返回的声明令牌，否则声明的卡会拒绝来自其他代理的代理工具突变。代理工具或网关 RPC 调用返回的每张卡都会将 `metadata.claim.token` 编辑为 `[redacted]`（令牌本身返回一次，顶层，仅从 `workboard_claim`），因此 Control UI 操作员和其他代理可以检查索赔状态，而无需看到可用的令牌。恢复通过 `workboard_promote`/`workboard_reassign`/`workboard_reclaim` 进行，不需要令牌。

促销仅将`todo`卡移至`ready`；所有其他状态都会返回错误而不更改卡，包括设置 `force` 时。要恢复被阻止的工作，请先使用 `workboard_unblock` 将其移动到 `todo`。 `force` 仅绕过依赖性或计划保留。

## <a id="dispatch"></a> 调度

调度是 Gateway 本地的：它不会生成任意 OS 进程。正常的 OpenClaw 子代理会话仍然负责执行。一次调度流程：

1. 提升依赖已就绪的卡片。
2. 阻止过期的声明或超时的运行。
3. 将板配置的分类卡标记为编排候选者。
4. 声明一小批就绪卡并通过网关子代理运行时启动工作程序运行。

空闲扫描使就绪卡历史记录保持不变。现有调度计数器和时间戳保留为历史值；新的启动使用该卡的启动、尝试和执行历史记录。

Worker 会获得受限的卡片上下文，以及通过 Workboard 工具执行心跳、 完成或阻塞卡片所需的认领令牌。

工作空间路径遵循调用者现有的文件系统权限：

- 具有 `operator.write` 的 Gateway 客户端可以使用已配置的代理工作区。
- `operator.admin` 客户端可以使用其他主机结帐。
- 沙盒代理工具使用其沙盒工作区访问权限。
- 仅非沙盒工作区工具使用其配置的工作区根目录。

工作板会在分配工作空间时记录该权限，并在调度时再次将其与当前调用者的权限相交，因此保留的卡无法扩大后来调用者的访问权限。具有显式主机工作区但没有记录权限的旧卡必须在完整主机调度之前重新保存该工作区。没有主机路径的卡在首次调度时采用当前调用者的权限。

仅当其存储库根与目标代理工作区完全匹配时，工作区绑定调度才接受目录或 Git 签出。工作树请求被缩小到该目录并保留为目录工作空间，因此主机不会实现签出或执行存储库设置代码。目标工作人员必须为该确切的工作空间使用可写、非共享的 Docker 沙箱，而不需要提升执行、持久的 host/node exec 覆盖或未分类的插件和 MCP 工具。 Workboard 枚举其已注册的工具，而不是信任 `workboard_*` 前缀，并且调度拒绝其实时 mount/config 哈希已过时的热 Docker 容器。 Dispatch 报告不兼容的目标策略，而不是启动限制较少的工作线程。全主机调度可以针对其他本地签出并保持正常的托管工作树设置。

工作空间权限不会创建第二个卡生命周期权限模型。可能会改变工作板卡的调用者可以手动将它们移动到每个表面上的相同状态。只读工作区访问仅阻止需要写入的工作人员调度。

### <a id="worker-selection"></a> Worker 选择

每次流程默认**最多启动 3 个 worker**。就绪卡片会按优先级、然后位置、然后创建时间排序。一次流程只会为每个 owner/agent 启动一张卡片，并跳过那些在看板上已经有运行中或审核中工作的 owner。 已归档卡片、带有活动认领的卡片，以及不处于 `ready` 状态的卡片，绝不会被选中用于 worker 启动（但它们仍可能受到调度数据侧的影响： 过期认领清理、依赖提升、超时清理）。

会话密钥根据 board/card 是固定的，因此重复的调度会路由回同一工作通道，而不是创建不相关的会话：

- 已分配卡片：`agent:<agentId>:subagent:workboard-<boardId>-<cardId>`
- 未分配卡片：`subagent:workboard-<boardId>-<cardId>`（Gateway 会解析配置的默认 agent）

如果在认领卡后无法启动工作程序，Workboard 会阻止该卡、清除声明、记录运行启动失败并附加工作程序日志行 - 在 Control UI、CLI、JSON、代理工具和卡诊断中可见。

### <a id="entry-points"></a> 入口点

- Control UI 调度动作
- `openclaw workboard dispatch`
- 命令可用频道中的 `/workboard dispatch`

当网关可用时，所有三个都使用网关子代理运行时。 CLI 有一个操作员回退：如果网关调用因 connection/unavailable 错误（或旧网关的 `unknown method` 错误）而失败，并且没有明确的 `--url`/`--token` 目标且没有配置远程网关（`OPENCLAW_GATEWAY_URL` 或 `gateway.mode: remote`），则 CLI 适用针对本地 SQLite 状态运行仅数据调度 - 它可以提升依赖关系、清除陈旧声明并阻止超时运行，但无法启动工作线程。来自可访问网关的身份验证、权限和验证失败不会被视为不可用。它们表现为命令错误，并且当给出显式 `--url`/`--token` 目标时，任何网关故障也会出现。

板元数据可以设置 `autoDecompose`、`autoDecomposePerDispatch`、`defaultAssignee` 和 `orchestratorProfile`。 OpenClaw 记录此意图并将其公开在工作上下文中。实际的 specification/decomposition 仍然通过正常的 Workboard 工具运行。

## <a id="cli-and-slash-command"></a> CLI 和斜杠命令

```bash
openclaw workboard list [--board <id>] [--status <status>] [--include-archived] [--json]
openclaw workboard create "Fix stale card lifecycle" --priority high --labels bug,workboard
openclaw workboard show <card-id> [--json]
openclaw workboard move <card-id> --status <status> [--json]
openclaw workboard dispatch [--board <id>] [--json]
```

`list` 文本输出默认隐藏存档卡（`--include-archived` 覆盖）。 `--json` 始终包含存档的卡牌，与现有脚本使用的全卡合约相匹配。 `show` 和 `move` 接受明确的 ID 前缀。 `list`、`create`、`show` 和 `move` 直接访问本地插件状态。在本地 `create` 或 `move` 之前停止网关；在运行时，使用 Control UI 或网关 RPC 进行突变。只有 `dispatch` 调用正在运行的网关，并进行上述回退。仅数据调度还需要停止网关；仅连接错误并不能确定连接已停止。插件加载还可以在选择子命令之前初始化或升级本地数据库。在网关停止的情况下进行准备工作，包括当请求的命令是 `list` 或 `show` 时。当本地状态还需要准备时，可以使用Control UI或网关RPC进行在线访问。

有关完整标志、JSON 输出、Gateway 回退行为、id 前缀处理、dispatch 选择规则以及故障排查，请参见 [Workboard CLI](/cli/workboard)。

`/workboard list`、`/workboard show <card-id>`、`/workboard create <title>`、`/workboard move <card-id> --status <status>` 和 `/workboard dispatch` 镜像 CLI。 List 和 show 是任何授权命令发送者的读取操作。创建、移动和调度需要聊天界面上的所有者状态，或者具有 `operator.write`/`operator.admin`. 的网关客户端手动操作员移动使用与 Control UI 拖放相同的声明覆盖行为。他们的工作树访问仍然遵循上述相同的工作空间边界。

## <a id="session-lifecycle-sync"></a> 会话生命周期同步

卡片可以链接到现有的 Control UI 会话，或者您从卡片开始工作时创建的会话。链接卡显示内嵌的会话生命周期：正在运行、过时、链接空闲、完成或失败。您还可以使用 **Add to Workboard** 从其标题或“会话”选项卡捕获现有会话。该卡链接到该会话，使用会话标签或最近的用户提示作为标题，并从最近的用户提示中种子注释以及最新的助理响应（如果有）。

当您开始操作时，Capture 会使目标板保持选中状态。它会在重新使用非活动板卡之前重新加载非活动板卡，恢复存档的精确匹配，并且从不从临时链接推断会话所有权。

捕获的会话显示 **Open Workboard 卡** 和链接卡芯片。两者都使用相同的卡状态，包括在浏览器重新加载后。打开当前座席过滤器之外的卡会将板切换到 **所有座席**，而不更改所选的聊天座席。

打开卡片会加载其链接的会话详细信息，与侧边栏的代理过滤器和分页无关。当详细信息正在加载或不可用时，该卡会保留其链接并显示 **Session stateunknown** 或 **Session unavailable**。不明确的临时链接显示 **Session 链接不明确**。编辑卡片以选择确切的会话。使用 **Refresh** 重试。要继续现有会话，请在 **编辑卡** 中选择其确切链接，然后选择 **打开会话**。要重新开始，请清除 **编辑卡** 中的链接。清除链接会保留其任务关联，因此当该任务处于活动状态或未解决时，**Start** 仍然不可用。更改卡的受让人不会更改其现有会话的所有者。

裸 `global` 和 `unknown` 链接无法识别会话所有者。打开时，它们显示 **Session 链接不明确**。使用 **编辑卡** 选择显式会话。 Workboard 不为新捕获或链接提供这些裸链接。

如果活动的链接会话停止报告最近的活动，Workboard 会将卡标记为 `stale` 并将其存储为元数据，直到生命周期将其清除。

生命周期写入由网关端工作板插件拥有，因此它们不依赖于打开的浏览器选项卡。子代理完成挂钩立即保留最终结果。代理尝试挂钩会参考链接的会话状态：完成模型尝试不会将卡移动到 `review` 或 `blocked`，同时其运行仍处于活动状态。有界会话扫描每分钟运行一次，以协调终端、活动、空闲、丢失和陈旧会话状态。每个存储突变都会发出正常的 `plugin.workboard.changed` 失效，因此打开的“工作板”选项卡会重新加载存储的卡，而不是编写自己的生命周期投影。

存档链接会话不会隐藏此扫描的最终结果。重新启动或错过完成挂钩后，Workboard 仍会将链接到存档会话的活动卡协调为 `review` 或 `blocked`。

会话发现中仍然不存在隐身会话。显式链接的隐身卡使用授权的精确会话元数据读取（无需派生标题或消息预览）来协调其最终结果。

当卡片处于活动工作状态时，Workboard 会跟随链接的会话：

| 链接的会话状态                  | 卡片状态 |
| ------------------------------------- | ----------- |
| 积极的                                | `running`   |
| 完全的                             | `review`    |
| 失败、被杀死、超时或中止 | `blocked`   |

**人工审核状态优先。** 将卡片移动到 `review`、`blocked` 或 `done` 会停止该卡片的自动同步，直到你将其移回 `todo` 或 `running`。

启动卡使用正常的网关会话。 Workboard 仅存储卡片元数据和链接。对话记录、模型选择和运行生命周期仍归常规会话系统所有。在实时链接的卡上使用 **Stop** 来中止活动运行 - Workboard 将该卡标记为 `blocked`，以便后续操作保持可见。

新卡可以从工作板模板（`bugfix`、`docs`、`release`、`pr_review`、`plugin`）开始。模板预填充标题、注释、标签和优先级。模板 ID 存储为卡元数据。

<a id="dashboard-workflow" />

## <a id="control-ui-workflow"></a> Control UI 工作流程

1. 在 Control UI 中打开 Workboard 选项卡。
2. 创建一张卡片，填写标题、备注、优先级、标签、可选 agent，以及可选的关联 session；或者打开 Sessions，并为现有 session 选择 **Add to Workboard**。
3. 在列之间拖动卡，或集中其紧凑状态控件并使用菜单或 ArrowLeft/ArrowRight. 在拖动过程中，源卡变暗，可用的放置列会获得轮廓。
4. 当未链接的卡没有活动或未解决的任务关联时启动该卡。
5. 在 agent 工作时，从卡片打开关联的 session。
6. 让 lifecycle sync 将运行中的工作移动到 `review`/`blocked`，然后在被接受时手动将卡片移至 `done`。

### <a id="session-board-widgets"></a> 会话看板小组件

Workboard 为会话仪表板提供了三个本机小部件（请参阅 [Dashboards](/web/dashboards)）。代理通过使用 `content: { kind: "plugin", pluginKind, props }` 的 `dashboard` 工具将它们固定，并且它们呈现为具有实时数据的第一方 UI - 没有沙箱框架或能力授予：

- `workboard:card` 配合 `props: { cardId }` 显示一张卡片，其中包含其状态控件、优先级和分配的 agent。
- `workboard:board` 和可选的 `props: { boardId }` 显示了带有可拖动卡片和状态控件的完整看板。如果没有 `boardId`，它会显示每块板。对于 `boardId`，它仅显示该板。
- `workboard:mini` 和可选的 `props: { boardId, limit }` 显示每个状态计数以及顶部 ready/running 卡，以及完整板页面的链接。如果没有 `boardId`，它会聚合每个板。对于 `boardId`，它的范围是该板（在 `default` 上没有显式板 ID 创建的卡）。

## <a id="diagnostics"></a> 诊断

诊断结果由本地卡片元数据计算得出。内置检查会标记：

| 类型                        | 条件                                                                      |
| --------------------------- | ------------------------------------------------------------------------------ |
| `stranded_ready`            | 已分配的 `todo`/`backlog`/`ready` 卡片超过 1 小时未更新。             |
| `running_without_heartbeat` | `running` 卡片超过 20 分钟没有认领心跳或执行更新。 |
| `blocked_too_long`          | `blocked` 卡片超过 24 小时未更新。                                   |
| `repeated_failures`         | 卡片记录的失败次数达到 2 次或以上。                                |
| `missing_proof`             | `done` 卡片没有证明、工件或附件。                          |
| `orphaned_session`          | `running` 卡具有 `sessionKey`，但没有 `execution` 元数据。                |
| `archived_but_active`       | 已归档卡片仍处于任何非 `done` 生命周期状态。                      |

## <a id="permissions"></a> 权限

网关 RPC 方法位于 `workboard.*` 下。会话板方法使用与板相同的 read/write 范围：

| 范围            | 方法                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operator.read`  | `cards.list`、`cards.export`、`cards.diagnostics`、附件 list/get、通知事件读取、`boards.list`、`cards.stats`、`cards.runs`                                                                                                                                                                                                                                                            |
| `operator.read`  | `sessionsBoard.read`                                                                                                                                                                                                                                                                                                                                                                                    |
| `operator.write` | `cards.diagnostics.refresh`、create/captureSession/update/move/delete/comment/link/linkDependency/proof/artifact、附件 add/delete、工作日志、协议违规、claim/heartbeat/release/promote/reassign/reclaim/complete/block/unblock/start、`cards.dispatch`、`cards.bulk`、存档、`boards.upsert`/`archive`/`delete`、`cards.specify`/`decompose`、通知 subscribe/delete/advance |
| `operator.write` | `sessionsBoard.update`, `sessionsBoard.move`                                                                                                                                                                                                                                                                                                                                                            |

`workboard.cards.update`、`workboard.cards.move`、`workboard.cards.archive` 和 `workboard.cards.delete` 接受可选的 `expectedUpdatedAt` 请求字段。从您读取的卡中传递有限数字 `updatedAt` 以保护写入。如果卡已更改，则请求失败并显示 `workboard_conflict`，并返回 `error.details.card` 中的最新卡（`error.details.type` 为 `workboard_card_conflict`）。重试之前请检查该卡。省略该字段将保留该方法现有的不受保护的请求行为。

Control UI 批量操作使用每张卡的观察版本并在发生冲突时停止。剩余的卡片保持选中状态以供审核和重试；该批处理不会默默地重试较新的修订版或覆盖另一个客户端的更改。

没有 RPC 方法需要 `operator.admin`。以只读操作员访问权限连接的浏览器可以检查板，但不能改变卡。管理范围扩大了可接受的工作板主机路径。它不会改变可用的方法。

## <a id="storage"></a> 存储

Workboard 将持久数据存储在 OpenClaw 状态目录下的插件拥有的关系 SQLite 数据库中：板、卡片、标签、生命周期事件、运行尝试、注释、依赖项链接、证明、工件引用、附件元数据和 Blob、诊断、通知、工作日志、协议状态和订阅都位于 Workboard 表中（不是插件键值条目）。卡片导出保留了看板叙述，而不内联附件 blob 内容。

会话板在 `workboard_boards` 的基础上添加了可选的 `kind` 和 `sessions_spec` 列，以及用于操作引脚的 `workboard_session_placements`。现有板行不回填；缺席的种类仍然意味着卡片板。回滚到没有会话板的版本会将每个会话板显示为空的卡片板并忽略放置表；一旦新版本再次运行，针对它创建的卡就会被拒绝。会话记录和董事会代理对话保留在正常会话存储中。

SQLite 打开、查询和事务在后台数据库工作线程中运行。禁用或重新加载插件会在关闭连接之前耗尽已承认的存储工作。

工作板实例使用物理数据库的进程内写入器收据（包括通过同级实例提交）使缓存的卡列表和板修订无效。卡片清单重复使用检查收据；未结算的收据会使读取未缓存。与突变重叠的读取可以返回其较旧的快照；下一个请求观察作者收据并重新加载它。变更通知使用所有者出版物；没有计时器轮询 SQLite 来自其他进程的写入。如果工作人员回复在可能的提交后失败，则所有者会丢弃缓存的事实并在下次使用时重新读取它们，而无需重播突变。

保留 2026 年 7 月之前的 Workboard 插件状态 KV 数据的安装必须通过 OpenClaw `2026.9.7` 升级并运行 `openclaw doctor --fix`，然后才能升级到最新版本。 Current Doctor 报告了此要求，但不更改旧行；当前的关系 SQLite 存储仍然受支持。

## <a id="troubleshooting"></a> 故障排查

**标签页显示 Workboard 不可用**

```bash
openclaw plugins inspect workboard --runtime --json
```

如果已配置 `plugins.allow`，请将 `workboard` 添加进去。如果 `plugins.deny` 中包含 `workboard`，请在启用插件前将其移除。

**卡片无法保存**

确认浏览器连接具有 `operator.write` 访问权限。只读 operator 会话可以列出卡片，但不能创建、编辑、移动或删除卡片。

**启动卡片不会打开预期的会话**

检查卡片的 agent id 和关联会话，然后打开 Sessions 或 Chat，以查看实际的运行状态。

**Dispatch 不会启动工作进程**

确认至少有一张没有活动认领的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

如果 CLI 报告仅数据调度，请启动或重新启动网关并重试 - 仅数据调度会更新本地板状态，但无法启动子代理工作线程运行。当同一所有者或智能体的另一张卡已在运行或等待审核时，也可以跳过该卡。在为同一所有者分派更多工作之前，请先完成、阻止或释放该活动工作。

## <a id="related"></a> 相关内容

- [控制 UI](/web/control-ui)
- [工作板 CLI](/cli/workboard)
- [插件](/tools/plugin)
- [管理插件](/plugins/manage-plugins)
- [会话](/concepts/session)
- [托管工作树](/concepts/managed-worktrees)
