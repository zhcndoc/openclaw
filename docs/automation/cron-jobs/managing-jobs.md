---
doc-schema-version: 1
summary: "CLI 示例、作业管理命令、运行历史记录和 cron 配置密钥"
read_when:
  - "列出、编辑、运行或删除存储的作业"
  - "读取运行历史记录和完成状态"
  - "在网关上设置 cron 配置键"
title: "管理自动化"
sidebarTitle: "管理职位"
---

存储作业的日常操作：复制就绪的 CLI 示例、管理命令、运行历史语义和 `cron.*` 配置密钥。 [Automations](/automation/cron-jobs) 指南的一部分。

自动化消息和通知中的运行链接会打开准确记录的运行，即使较新的运行填满第一个历史记录页面也是如此。选择 **显示所有运行** 以返回到该自动化的完整历史记录。具有重用会话或开始时间标识的链接不会选择不明确的运行。

## <a id="cli-examples"></a> CLI 示例

<Tabs>
  <Tab id="one-shot-reminder" title="一键提醒">
    ```bash
    openclaw automations add \
      --name "Calendar check" \
      --at "20m" \
      --session main \
      --system-event "Next heartbeat: check calendar." \
      --wake now
    ```
  </Tab>
  <Tab id="recurring-isolated-job" title="重复的孤立工作">
    ```bash
    openclaw automations create "0 7 * * *" \
      "Summarize overnight updates." \
      --name "Morning brief" \
      --tz "America/Los_Angeles" \
      --session isolated \
      --announce \
      --channel slack \
      --to "channel:C1234567890"
    ```
  </Tab>
  <Tab id="model-and-thinking-override" title="模型和思维超越">
    ```bash
    openclaw automations add \
      --name "Deep analysis" \
      --cron "0 6 * * 1" \
      --tz "America/Los_Angeles" \
      --session isolated \
      --message "Weekly deep analysis of project progress." \
      --model "opus" \
      --thinking high \
      --announce
    ```
  </Tab>
  <Tab id="webhook-output" title="Webhook 输出">
    ```bash
    openclaw automations create "0 18 * * 1-5" \
      "Summarize today's deploys as JSON." \
      --name "Deploy digest" \
      --webhook "https://example.invalid/openclaw/cron"
    ```
  </Tab>
  <Tab id="command-output" title="命令输出">
    ```bash
    openclaw automations create "*/15 * * * *" \
      --name "Queue depth check" \
      --command "scripts/check-queue.sh" \
      --command-cwd "/srv/app" \
      --announce \
      --channel telegram \
      --to "-1001234567890"
    ```
  </Tab>
</Tabs>

## <a id="managing-jobs"></a> 管理作业

在 Control UI 中，当调度程序事件到达时，开放式自动化会刷新其下一次运行时间和条件活动。这些运行时更新保留未保存的设置和用于冲突检测的已保存定义，包括当选定的自动化位于当前列表页面或过滤器之外时。

### <a id="conversational-management"></a> 会话管理

`commands.ownerAllowFrom` 中明确列出的经过身份验证的通道发送者或具有 `operator.admin` 的 Control UI 管理员可以要求代理列出、检查、更新、运行或删除该网关上的任何现有自动化，无论其创建者或通道如何。例如，要求它禁用在 Telegram 中创建的提醒。这与 **Automations** 页面上的管理员权限相匹配。通过操作员 CLI 或网关 API 创建命令负载。

经过身份验证的新 Control UI 管理员轮次还可以通过聊天创建普通自动化，包括与 `timeoutSeconds: 0` 当前对话中的重复代理轮次。创建保留调用者的 account/session 所有权和捕获的工具限制。远程管理不授予本地主机或提供程序读取权限，也不授予捕获新配置的 MCP 执行权限的权限。不完整的工具捕获仍然会阻止继承未捕获的工具表面。

网关根据经过验证的回合的准入事实授予此权限。每个操作都使用一次性授权，该授权会在 60 秒后过期，并保持与该确切活动运行的绑定。当使用该功能时以及在提交突变之前，将根据当前全局所有者列表重新检查通道所有者成员资格。频道白名单、通配符条目、显示名称、帐户 ID 和会话路由不会建立所有权。其他通道轮次和没有 `operator.admin` 的 Control UI 轮次不会收到管理授权。如果访问被拒绝或授权过期，请从新的经过身份验证的配置通道所有者或 Control UI 管理员处重试，或使用 **Automations** 页面。

当承认的所有者或管理员轮流使用 `sessions_yield` 等待其子代理时，已验证的请求者延续保留该任务的自动化管理。它为新的运行获得了新的资助；原始运行的补助金通常会过期。延续仍仅限于管理；它无法夺取新创建者的执行权。从全局所有者列表中删除通道发送者、取消、会话重置或存档、新的直接用户轮流以及网关重新启动都会使切换无效。普通的会话间消息和子结果不会授予管理访问权限。

每个管理员管理请求都会在网关的 `cron: admin management` 日志中记录其方法、运行、操作实例以及成功或失败，以及普通工具审核记录。管理权限不会转移创建者归属或替换作业的计划执行策略。

### <a id="cli-management"></a> CLI 管理

对于缺少创建者帐户元数据的旧版自动化，请运行 `openclaw doctor --fix`。仅当存储的创建者身份证明这一点时，Doctor 才会对帐户进行核对，并报告修复情况。然后，匹配的创建者会话可以更新代理提示，而无需提供新的工具帽。现有工具权限和创建者归属保持不变；无上限作业保留其遗留执行政策。显式权限编辑仍然需要匹配所有者权限。存储身份无法证明账户的作业需要经过身份验证的管理员恢复； Doctor 不会从传送设置或当前呼叫者推断所有权。

```bash
# List enabled jobs
openclaw automations list

# Include disabled jobs
openclaw automations list --all

# Get one stored job as JSON
openclaw automations get <jobId>

# Show one job, including resolved delivery route
openclaw automations show <jobId>

# Enable/disable without deleting
openclaw automations enable <jobId>
openclaw automations disable <jobId>

# Edit a job
openclaw automations edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw automations run <jobId>

# Force run a job now and wait for its terminal status
openclaw automations run <jobId> --wait --wait-timeout 10m --poll-interval 2s

# Run only if due
openclaw automations run <jobId> --due

# View run history
openclaw automations runs <jobId> --limit 50

# View one exact run
openclaw automations runs <jobId> --run-id <runId>

# Delete a job
openclaw automations remove <jobId>

# Agent selection (multi-agent setups)
openclaw automations create "0 6 * * *" "Check ops queue" --name "Ops sweep" --session isolated --agent ops
openclaw automations edit <jobId> --clear-agent
```

归档会话（Control UI 或使用 `sessions.list` 中的持久 ID 的 `sessions.patch { key, archived: true, expectedSessionId }`）会禁用绑定到该会话的每个启用的自动化作业：其隔离的 `cron:<jobId>` 会话、`session:<key>` 目标或 delivery/wake `sessionKey` 车道。恢复会话需要相同的观察身份，并且不会重新启用这些作业；使用 `openclaw automations enable <jobId>`。启用绑定作业的会话会在 Control UI 侧栏中显示时钟徽章。

`openclaw automations run <jobId>` 在手动运行排队后返回。将 `--wait` 用于关闭挂钩、维护脚本或其他必须阻塞直到排队运行完成的自动化；它轮询返回的`runId`（默认超时`10m`，轮询间隔`2s`）并仅针对`completionStatus: "succeeded"`退出`0`。失败或未知的完成以及等待超时退出非零。

相反，代理 `automations` 工具的 `run` 操作会在网关中等待：当运行在调用的 `timeoutMs`（默认 60 秒，上限为 10 分钟）内结束时，它会返回已完成的运行（状态、错误、交付状态和摘要）。较长的运行返回 `runId`；稍后使用 `runs` 操作和 `runId` 来读取它。主会话作业以及在调用会话中运行的作业会立即返回，因为它们仅在调用轮次结束后才开始。

立即运行交付衡量从接受手动请求时起的延迟。旧的待处理调度槽不会使其新输出变得陈旧；自动和 `--due` 运行会保留该检查的原始计划时间。手动运行仍然保留作业的重复节奏或未来的一次性发生。

运行暂停的未来单次拍摄会使其暂停并保留其已保存的事件。当需要自动执行时重新启用它。如果在计划时间之前接受手动运行，但在命令队列中等待超过该时间，则在重新启用或重新启动网关后，该事件仍然可用。

运行历史记录将负载执行保存在 `status`（`ok`、`error` 或 `skipped`）中，并将整个运行完成保存在 `completionStatus`（`succeeded`、`failed` 或 `unknown`）中。除非承认的作业明确设置了`delivery.bestEffort: true`，否则需要请求交付；仅传递失败离开执行 `status: "ok"`，不增加执行错误计数器或进入重试退避，并记录 `completionStatus: "failed"`。没有传送标识的适配器发送将保持 `unknown`，不会自动重新发送（可能会重复消息）。

一旦成功的一次性消耗了其计划的发生，其完成的事件和运行历史记录就会忽略 `nextRunAtMs`，包括作业自动删除的时间。保留未来事件的早期手动运行仍会报告该事件。

当执行成功但整个运行完成失败或仍然未知时，Control UI 运行历史记录显示 `OK · Error` 或 `OK · Unknown`。其状态过滤器仍然选择执行状态。

运行历史记录搜索匹配摘要、任务名称以及执行或交付错误。即使运行的执行状态为 `ok`，您也可以搜索运行中显示的传送错误。

当所选历史记录不可用时，运行历史记录会显示加载指示器。失败的请求显示错误和 **Retry** 按钮；先前加载的相同选择的运行仍然可见。仅在成功请求确认当前选择和过滤器没有运行后，才会出现空历史记录指南。

临时网关重新连接后，自动化重新打开当前选定的作业并使用新的作业数据运行。关闭面板或选择另一个自动化会替换该选择；重新连接不会重播被取代的链接。 **显示所有运行** 清除重新连接时的链接运行选择。更改网关身份或代理范围会清除选择。

在运行中选择 **查看记录** 可读取该运行的录制对话，包括之前的页面。当调度程序重用其会话别名时，成绩单选择仍与记录的运行绑定。网关客户端将 `cron.history` 与作业 `id` 和精确的 `runId` 或 `runAtMs` 结合使用；响应包含 `messages`、可选的 `activity` 和不透明的 `nextCursor`。丢失或不明确的运行记录仍然不可用，而不是打开不同的运行。选定的运行标识其记录的对话生成：独立的运行具有新的生成，而自定义会话保留其在运行中共享的对话历史记录。当前作业和会话权限适用于每个页面。不可用或不可访问的记录会返回一般错误，但不会泄露所选的会话密钥。

故意沉默 （`NO_REPLY`）、心跳确认和通道回复会转换记录 `deliverySuppressionReason`，而无需声明交付或触发交付失败警报。这些成功的非结果和显式 `delivery.bestEffort: true` 的成功执行通常会一次性删除。一场空洞的决赛并不是故意的沉默，而是一场空洞的决赛。耗尽恢复记录的是失败的运行，而不是合成的成功 `NO_REPLY`。相反，传输钩子否决记录了没有故意抑制原因的传递错误。没有最终回复的活动后代、过时的临时输出以及被 TTS 清空的输出反而会记录传递错误。保留的一次性作业不会自动重新运行；在重试或删除它们之前检查它们的历史记录和交付结果。

直接网关事件源可以将 `cron.run` 与 `mode: "if-enabled"` 一起使用来立即运行，而无需覆盖操作员禁用或自动禁用的作业。显式运算符立即运行命令继续使用 `force`。

重新启用自动禁用的作业或耗尽的流会重置其失败计数器。协调 `declarationKey` 的 API 客户端可以对显式 `enabled: true` 执行相同的操作；省略启用的例行声明保留了已停止的作业，而例行协调则保留了现有的失败条纹。

代理 `automations` 工具返回紧凑的作业摘要（`id`、`name`、`enabled`、`effectiveAgentId`、`nextRunAt`、`nextRunAtMs`、`scheduleKind`、`lastRunAt`、 `lastRunStatus`）来自 `automations(action: "list")`。 `effectiveAgentId` 标识已解析的执行所有者，或者当所有权未解析时为 `null`。运行日期是精确的 ISO 时间戳，如果不存在则为 `null`；毫秒字段仍然可供编程调用者使用。基于时间的作业还包括其确切的 `schedule`（`at`、`every` 或 `cron`），包括没有下次运行的已禁用作业。事件驱动的时间表、有效负载和交付定义仍然被省略；使用 `automations(action: "get", jobId: "...")` 进行一个完整的作业定义。直接网关调用者可以将`compact: true`传递给`cron.list`；省略它会保留带有交付预览的完整响应。 `cron.add` 在创建的作业上包含相同的试运行预览，因此创建时输出会命名已解决的路线或交付被拒绝的原因。

`openclaw automations create` 是 `openclaw automations add` 的别名。新作业可以使用位置计划（`"0 9 * * 1"`、`"every 1h"`、`"20m"` 或 ISO 时间戳），后跟位置代理提示。在 `automations add|create` 或 `automations edit` 上使用 `--webhook <url>` 到 POST 将完成的运行有效负载发送到 HTTP 端点； Webhook 传送不能与聊天传送标志（`--announce`、`--channel`、`--to`、`--thread-id`、`--account`）结合使用。在 `automations edit`、`--clear-channel`、`--clear-to`、`--clear-thread-id` 和 `--clear-account` 上，单独取消设置这些路由字段（每个字段都被拒绝并与其匹配的设置标志一起拒绝）——与 `--no-deliver` 不同，后者仅禁用运行程序回退传递。

Webhook URL 仍受 [ 严格出站策略](/automation/cron-jobs/delivery#delivery-and-output) 的约束；为有意的本地或私人接收器配置 `cron.webhookSsrfPolicy`。

清除 Control UI 中的 **超时（秒）** 并保存会删除已保存的覆盖，从而恢复 [ 默认运行时预算](/automation/cron-jobs/how-it-works)。对于 API 客户端，`cron.update` 有效负载补丁使用数字设置超时，使用 `timeoutSeconds: null` 清除它，并在省略 `timeoutSeconds` 时保留保存的值。新作业省略该字段使用默认值； `null`只是一条更新指令。

<Note>
模型覆盖说明：

- `openclaw automations add|edit --model ...` 会更改作业所选的模型。
- 如果模型允许，则确切的 provider/model 会到达隔离代理运行。
- 如果模型不被允许或无法解析，调度程序会使该运行失败，并返回明确的验证错误。
- API `cron.update` 负载补丁可以将 `model: null` 设置为清除已存储的作业模型覆盖。
- `openclaw automations edit <job-id> --clear-model` 会从 CLI 清除该覆盖（效果与 `model: null` 补丁相同），且不能与 `--model` 同时使用。
- 已配置的备用链仍会生效，因为自动化的 `--model` 是作业的主要模型，而不是会话 `/model` 覆盖。
- `openclaw automations add|edit --fallbacks ...` 会设置负载中的 `fallbacks`，替换该作业已配置的备用模型；`--fallbacks ""` 会禁用备用模型，使运行严格执行。`openclaw automations edit <job-id> --clear-fallbacks` 会清除每个作业的覆盖设置。
- 如果没有显式或已配置的备用列表，单独使用 `--model` 不会将代理主要模型作为静默的额外重试目标。

</Note>

## <a id="configuration"></a> 配置

```json5
{
  cron: {
    enabled: true,
    triggers: {
      enabled: false,
    },
    webhookToken: "replace-with-dedicated-webhook-token",
    webhookSsrfPolicy: {
      allowedHostnames: ["127.0.0.1"], // optional exact exception for a trusted receiver
    },
    sessionRetention: "24h",
  },
}
```

`webhookToken` 在自动化 Webhook POST 上作为 `Authorization: Bearer <token>` 发送。 Webhook URL 不得包含嵌入的 username/password 凭据；当接收方支持承载身份验证时，使用 `webhookToken`。 `webhookSsrfPolicy` 适用于每个出站自动化 Webhook，并且在省略时是严格的。与广泛的 `dangerouslyAllowPrivateNetwork` 选择加入相比，更喜欢狭窄的 `allowedHostnames` 条目。

自动化作业、运行历史记录以及隔离的格式错误作业都存储在共享的 SQLite 状态数据库中。请使用 CLI 或 Gateway API 更改作业；`cron.store` 已弃用。

设置 `cron.skipMissedJobs: true` 以跳过网关离线时错过的重复出现的（`cron` 和 `every`）时隙。在启动时，这些作业会前进到下一个未来发生的位置，而不是追赶，避免过时的提醒和不必要的模型调用，但代价是放弃错过的工作。默认为`false`（追赶）；无论哪种方式，一次性 （`at`） 作业都会保留其正常的追赶行为。

禁用自动化：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion id="retry-behavior" title="重试行为">
    **一次性重试**：临时错误（速率限制、过载、网络、超时、服务器错误）会使用内置重试计划。永久性错误会立即禁用该作业。

    **周期性重试**：连续执行错误会按扩展后的计划退避（30s、60s、5m、15m、60m）。在下一次成功运行后，退避计时会重置。

  </Accordion>
  <Accordion id="maintenance" title="维护">
    `cron.sessionRetention`（默认 `24h`、`false` 或 `"0h"` 禁用）修剪隔离的运行会话条目。终端运行历史记录保留 7 天（`lost` 行保留 24 小时），每个作业和历史记录类强制执行最新的 2000 行作为额外上限。

    网关保留在第一次扫描之前等待延迟的代理数据库启动准备，并将等待记录为有意延迟。即使计划执行被禁用，保留也会继续。

    每次注册表扫描后，网关都会等待，直到下一个候选到期或提交的 cron 会话或存储拓扑更改。空的、未更改的注册表不需要定期读取。保护过期会话和失败扫描每分钟重试；运行历史记录恢复保持现有的分钟节奏。

    每个代理会话存储还保留其下一个 cron 运行到期时间，因此空或未到期的存储不需要在每个维护标记上进行读取。提交的 cron 运行更改会刷新该截止日期；繁忙的会话和失败的会话存储扫描将在五分钟后重试。

    会话保留会跳过待删除或已完成删除的代理，同时继续维护健康的代理。挂起的删除清理仍归代理删除操作所有。

  </Accordion>
  <Accordion id="legacy-store-migration" title="旧商店迁移">
    `openclaw doctor --fix` 将受支持的 `jobs-quarantine.json` sidecar 导入到 SQLite 中，并使用 `.migrated` 后缀归档原始文件。已停用的 `jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 输入保持不变：安装 OpenClaw `2026.9.7`，运行其 Doctor，然后升级到最新版本。请参阅 [ 保留政策](/gateway/doctor/config-migrations#retention-policy)。格式错误的 SQLite 作业行在隔离区中仍可恢复，同时有效作业继续运行。
  </Accordion>
</AccordionGroup>
