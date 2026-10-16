---
summary: "session.* 范围、身份链接、重置策略、共享和保留"
read_when:
  - "选择对话映射到会话的方式"
  - "设置会话重置或保留策略"
  - "与其他操作员共享会话"
title: "配置——代理会话"
---

`session.*` 键：对话如何映射到会话、会话何时重置以及谁可以看到或加入会话。

## <a id="communication-defaults"></a> 通讯默认值

配置会话是否可以发起或接受来自其他会话的消息：

```json5
{
  session: {
    communication: {
      send: "always",
      receive: "ask",
    },
  },
}
```

两个方向均接受 `always`、`ask` 或 `never`；省略的值默认为 `always`。 `ask` 在发送或承认消息作为新的对等输入之前需要人工决定。现有访问限制仍然适用于 `always`。

Control UI 会话菜单的 **Advanced** 子菜单可以覆盖任一方向。 **Reset** 删除覆盖，因此稍后的配置更改将再次应用。当默认值更改时，不会覆盖现有的显式覆盖。重置会保留会话设置，新的显式子级和分叉会继承它们，并且委派的工作仍受其父级限制。采用现有会话永远不会替换其设置。更改适用于新录取，不适用于已接受的消息。

这些首选项不会取代 `tools.sessions.visibility`、人员共享或面向渠道的 `sendPolicy`。请求的答复和授权的任务结果保留其现有的完成权限。请参阅 [ 会话工具](/concepts/session-tool#communication-preferences)。

旧版本不强制执行这些首选项。在降级之前，请删除新的配置密钥并通过旧版本的工具和会话策略恢复任何限制。

## <a id="session"></a> 会话

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    groupScope: "per-group", // main | per-group
    notifyOnCreate: true, // notify Home about new sessions (default)
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 30 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    maintenance: {
      mode: "enforce", // enforce (default) | warn
      pruneAfter: "30d",
      archiveDashboardAfter: "7d", // false or 0 disables this dashboard trigger
      maxEntries: 5000,
      preserveRecent: "7d", // opt-in protection; disabled when omitted or false
      resetArchiveRetention: "30d", // duration or false
      maxDiskBytes: "500mb", // physical disk budget; default "10gb"
      highWaterBytes: "400mb", // optional cleanup target
      coldStorage: {
        enabled: false, // opt in to compressed inactive transcripts
        afterDays: 30,
      },
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // default inactivity auto-unbind in hours (`0` disables)
      maxAgeHours: 0, // default hard max age in hours (`0` disables)
    },
    sharing: {
      readOnly: true,
      suggest: true,
      drafts: true,
    },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

<Accordion id="session-field-details" title="会话字段详细信息">

- **`scope`**：群聊上下文的基础会话分组策略。
  - `per-sender`（默认）：在一个频道上下文中，每个发送者都获得一个隔离的会话。
  - `global`：频道上下文中的所有参与者共享一个会话（仅在确实需要共享上下文时使用）。
- **`dmScope`**：私信的分组方式。
  - `main`：所有私信共享主会话。
  - `per-peer`：通过发送者 ID 跨渠道隔离。
  - `per-channel-peer`：按频道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`：按账户 + 频道 + 发送者隔离（推荐用于多账户）。
- **`groupScope`**：如何对组、房间和频道进行分组。
  - `per-group`（默认）：将每个非直接对等方保留在其通道范围的会话中。
  - `main`：将非直接对等点路由到代理主会话中。当只有选定的受信任房间应共享主要上下文时，首选狭窄的 `bindings[].session.groupScope` 覆盖。
- **`notifyOnCreate`**：在所属代理的主对话中对新会话感知进行排队（默认值：`true`）。待处理的创作与可用标题、创作者和创作源共享一个有界摘要，而无需复制消息。当摘要已满时，较旧的条目将被忽略，从而为提醒和其他事件留下队列容量。 Home 在下一个回合或预定的心跳时消耗它。将 `false` 设置为禁用。草稿、隐身会话、主页本身、隐藏的内部会话和计划的 cron 运行均被排除在外；重新打开或重置现有会话不会再次通知。摘要位于内存中，并且在网关重新启动后不会保留。参见[主会场](/concepts/main-session#what-flows-into-the-main-session)。
- **`identityLinks`**：将共享身份ID映射到提供者前缀的对等点以进行跨通道会话共享。
- **`resetTriggers`**：重置会话的显式命令或短语。匹配不区分大小写；列出每个所需的拼写，因为命令别名不会自动添加。例如，`["/tell"]` 重置 `/tell` 消息，而 `/steer` 保持其正常的转向行为。保留匹配触发器后的后续文本，包括后面的行。
- **`reset`**：主重置策略。 `none` 禁用自动复位，为默认值；相反，压缩限制了活动上下文。 `daily` 在 `atHour` 本地时间复位； `idle` 在 `idleMinutes` 之后复位。当两者都配置时，以先到期者为准。 `/new` 和 `/reset` 在每种模式下均可用。每日重置新鲜度使用会话行的`sessionStartedAt`；空闲重置新鲜度使用`lastInteractionAt`。 Background/system-event 写入（例如心跳、cron 唤醒、执行通知和网关簿记）可以更新 `updatedAt`，但它们不会使 daily/idle 会话保持新鲜。
  - **`resetByType`**：按类型覆盖（`direct`、`group`、`thread`）。Doctor 会将旧版 `dm` 条目迁移为 `direct`；架构会拒绝 `dm`。
- **`resetByChannel`**：按 provider/channel id 键控的每通道重置覆盖。当会话的通道有匹配条目时，它会在该会话中完全胜出 `resetByType`/`reset`。仅当一个通道需要重置与类型级别策略不同的行为时才使用。
- **`mainKey`**：已接受但被忽略。每个代理主会话后缀始终为 `main`；省略该字段。全局会话范围使用 `global` 代替。
- **`sendPolicy`**：按 `channel`、`chatType`（`direct|group|channel`，兼容旧版 `dm` 别名）、`keyPrefix` 或 `rawKeyPrefix` 进行匹配。先匹配到的拒绝规则优先。
- **`maintenance`**：会话存储清理和保留控制。
  - `mode`：`enforce` 应用年龄、计数和磁盘预算清理，并且是默认值； `warn` 报告这些策略而不应用它们。单独的选择加入 `coldStorage.enabled` 开关独立控制冷转录本提取。
  - `pruneAfter`：过时条目的年龄截止（默认 `30d`）。合格的持久会话存档到位，其身份和历史完好无损；这不会压缩或提取其转录本行。一次性自动化行被删除。
  - `archiveDashboardAfter`：用​​于归档可见仪表板会话的不活动截止（默认 `7d`）； `false` 或 `0` 仅禁用此仪表板触发器。符合条件的会话仍可以通过 `pruneAfter` 或 `maxEntries` 进行存档。
  - `maxEntries`：未归档的SQLite会话条目的最大数量（默认`5000`）。存档的行不消耗上限。清理会存档最旧的符合条件的普通会话，而合成运行时会话仍然是一次性的，并且可能会被删除。固定会话、活动或承认的工作、模型锁定会话以及持久的外部对话指针仍然受到保护；如果保护措施阻止到达上限，则未归档的存储将保留在上限之上。运行时使用小型高水位缓冲区编写批量清理，用于生产规模的上限； `openclaw sessions cleanup --enforce` 立即应用上限，但不会取消对行的保护。
  - `preserveRecent`：可选的不活动窗口，可保护最近活动的交互式会话及其所有 SQLite 历史生成免遭自动年龄、计数和磁盘预算历史记录逐出（例如 `"7d"`）。未设置或 `false` 将禁用此保护。 Synthetic 模型运行、cron、hook、heartbeat、ACP 和子代理会话仍然符合有界清理的条件。保护可以暂时将存储保留在配置的条目或磁盘目标之上，并且不会存档会话。
  - 短命网关模型运行检查会话使用固定的 `24h` 保留，但清理是压力门控的：当达到会话条目 maintenance/cap 压力时，它仅删除过时的严格模型运行检查行。只有匹配 `agent:*:explicit:model-run-<uuid>` 的严格显式检查密钥才符合资格；正常的直接、组、线程、cron、hook、heartbeat、ACP 和子代理会话不会继承此 24 小时保留。当模型运行清理运行时，它会在更广泛的 `pruneAfter` 过时条目清理和 `maxEntries` 上限之前运行。
  - 当前架构会拒绝旧版 `rotateBytes`；`openclaw doctor --fix` 会从旧配置中删除该字段。
  - `resetArchiveRetention`：reset/deleted 转录档案的基于年龄的保留。默认情况下，存档会保留到磁盘预算耗尽为止；设置持续时间以选择挂钟删除，或设置 `false` 以明确禁用它。
  - `maxDiskBytes`：每个代理物理磁盘预算（默认 `10gb`），计算 SQLite 主文件、其 `-wal` 文件以及代理会话目录中的文件计数。在 `warn` 模式下，它会记录警告。在 `enforce` 模式下，它首先回收可检查点的数据库空间，然后删除旧的 reset/delete 工件、未引用的历史生成，最后删除由活动会话上限明确标记为存档的最旧会话。手动、遗留、年龄保留、陈旧仪表板和恢复档案仍然受到保护。受保护的历史记录和尚未回收的数据库页面可以使使用率保持在清理目标之上；这不是一个有保证的物理上限。设置 `false`、`0` 或 `"0"` 以完全禁用预算。
  - `highWaterBytes`：预算清理后的可选目标。默认为 `80%` 或 `maxDiskBytes`。解析为零的值将回退到默认值；负值无效。使用 `maxDiskBytes` 禁用预算，而不是使用零高水位标记。
  - `coldStorage.enabled`：选择将非活动转录本后台提取到压缩的 JSONL 文件（默认 `false`）。当前和历史窗口均符合资格；主动跑步、承认的工作和恢复拥有的会话受到保护。这独立于仪表板存档和 reset/deletion 存档保留。请参见 [ 冷转录本存储 ](/reference/session-management-compaction/maintenance#cold-transcript-storage)。
  - `coldStorage.afterDays`：成绩单变得合格之前的非活动天数的正整数（默认 `30`）。最近的会话活动保护当前窗口；历史窗口使用自己的活动时间戳。积极的工作、恢复和明确的历史参考仍然可以保护他们所需的成绩单。工作人员应用当前策略而不需要新的聊天活动。更改这些设置无需重新启动网关即可生效；禁用提取会使已存档的历史记录可读。
- **`threadBindings`**：线程绑定会话功能的全局默认值。
  - `enabled`：受支持的频道线程绑定功能的总开关。
  - `idleHours`：默认不活动在几小时内自动解除绑定（`0` 禁用；提供商可以覆盖）
  - `maxAgeHours`：默认的硬性最大存续时间（小时）（`0` 禁用；提供商可以覆盖）。
  - `spawnSessions`：用​​于从 `sessions_spawn` 和 ACP 线程生成创建线程绑定工作会话的默认门。代理生成总是打开一个新的子线程并且从不绑定当前对话。启用线程绑定时默认为 `true`； providers/accounts 可以覆盖。
  - `defaultSpawnContext`：线程绑定生成任务的默认原生子代理上下文（`"fork"` 或 `"isolated"`）。默认为 `"fork"`。
- **`sharing`**：控制所有者和 `operator.admin` 连接可以选择的每会话协作模式。每个标志默认为`true`；将 1 设置为 `false` 会从 Control UI 中删除该选择，并使创建时可见，否则 `session.visibility.set` 会拒绝它。新会话从 `shared` 开始，除非 Control UI 以草稿形式开始会话。
  - `readOnly`：允许使用 `read-only`，非成员可以观看，但不能发送消息、调整方向、中止、批准或修改会话状态。
  - `suggest`：允许 `suggest`，其中查看者可以向会话所有者或 `operator.admin` 连接提交建议以发送、排队、编辑或取消，而无需授予发送或管理会话的直接访问权限。
  - `drafts`：允许使用 `draft`，这会将会话从非管理员、非所有者的会话列表和事件广播中隐藏。

会话可见性和成员资格保留在已保存的共享状态中。结构化 `session.sharing` 事件带有归因参与者；无主体更改使用附加 `session.sharing.evidence` 事件。每个共享更改还会发出现有的 `sessions.changed` 行刷新，因此无法识别证据事件的客户端仍会刷新已保存的状态。这些事件和 `session.suggestion` 不会在对话记录中添加管理旁白。这些控件协调共享一个代理的操作员；它们不是租户之间的安全边界。当工作需要隔离时，使用单独的网关或代理。

对于 [dashboards](/web/dashboards)，撤销会阻止新的写入被允许。当访问权限被撤销时，已经在进行中的仪表板写入可能仍会完成；撤销不会收回其保存的小部件或布局。

</Accordion>

## <a id="cold-storage"></a> 冷库

在 **Settings → 代理默认值 → Session** 中，**Session storage** 面板显示 SQLite 中的转录本计数以及压缩存档、数据库和 WAL 大小、存档文件字节以及嵌入的压缩存档字节。 SQLite。嵌入字节数已包含在数据库总数中；不要再次添加它们。该面板还显示最新的后台维护结果，对新存档的记录和移回文件的嵌入存档进行单独计数。按代理展开 **Details** 以比较代理，或选择 **Refresh** 以读取当前使用情况。需要管理员访问权限。

打开 **Archive 较早的成绩单** 并将 **Archive after （days）** 设置为正整数。更改通过正常的设置流程保存并应用，无需重新启动网关。保存并应用策略后，**立即运行** 启动或加入后台批处理并立即返回。面板遵循其状态直至完成或失败；离开页面不会停止工作人员。工作线程也会自动运行，无需新的聊天活动。不活跃的当前和历史记录可能会变冷；打开或恢复一个会恢复其使用前的历史记录。

冰冷的档案保存着权威的历史。支持的OpenClaw备份命令捕获其与数据库验证的内容；直接数据库复制还必须保留引用的文件。在启用该功能之前，请参阅 [ 冷转录本存储 ](/reference/session-management-compaction/maintenance#cold-transcript-storage) 了解资格和恢复情况，以及 [ 冷转录本备份 ](/install/backups#cold-transcript-backups) 。
