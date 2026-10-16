---
doc-schema-version: 1
summary: "自动化：Gateway 调度器的定时任务、Webhook 和 Gmail PubSub 触发器"
read_when:
  - "调度后台任务或唤醒任务"
  - "将外部触发器（Webhook、Gmail）接入 OpenClaw"
  - "在计划工作的心跳和自动化之间做出选择"
title: "自动化"
sidebarTitle: "自动化"
---

自动化是 OpenClaw 内置的调度器。调度器会持久化任务，在正确的时间唤醒代理，并可以将输出发送到聊天频道、Webhook，或不发送到任何地方。

使用 `openclaw automations` CLI 管理自动化；`openclaw cron` 仍是相同命令的别名。

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="add-a-one-shot-reminder" title="添加一次性提醒">
    ```bash
    openclaw automations create "2027-02-01T16:00:00Z" \
      --name "Reminder" \
      --session main \
      --system-event "Reminder: check the automations docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step id="check-your-jobs" title="检查你的工作">
    ```bash
    openclaw automations list
    openclaw automations get <job-id>
    openclaw automations show <job-id>
    ```
  </Step>
  <Step id="see-run-history" title="查看运行历史记录">
    ```bash
    openclaw automations runs <job-id>
    ```
  </Step>
</Steps>

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页是一个索引。下面的每个部分都移动到子页面，并且单页面版本中的每个锚点仍然在此处解析。

### <a id="runtime-model-and-promotion"></a> 运行时模型及推广

[自动化如何工作](/automation/cron-jobs/how-it-works) - 运行时模型、运行生命周期和职位晋升。

- <a id="how-automations-work"></a>[自动化工作原理](/automation/cron-jobs/how-it-works#how-automations-work)
- <a id="isolated-run-hardening"></a>[隔离运行强化](/automation/cron-jobs/how-it-works#isolated-run-hardening)
- <a id="task-reconciliation"></a>[运行对账](/automation/cron-jobs/how-it-works#task-reconciliation)
- <a id="promoting-a-repeated-job-into-an-automation"></a>[将重复作业提升为自动化](/automation/cron-jobs/how-it-works#promoting-a-repeated-job-into-an-automation)

### <a id="schedule-and-trigger-sections"></a> 计划和触发部分

[自动化计划](/automation/cron-jobs/schedules) — 计划类型、cron 规则、节奏和条件观察程序。

- <a id="schedule-types"></a>[时间表类型](/automation/cron-jobs/schedules#schedule-types)
- <a id="heartbeat-task-migration"></a>[心跳任务迁移](/automation/cron-jobs/schedules#heartbeat-task-migration)
- <a id="stream-sources"></a>[流源](/automation/cron-jobs/schedules#stream-sources)
- <a id="dynamic-cadence-pacing"></a><a id="dynamic-cadence-(pacing)"></a>[动态节奏（pacing）](/automation/cron-jobs/schedules#dynamic-cadence-pacing)
- <a id="%2Floop-chat-shortcut"></a><a id="/loop-chat-shortcut"></a>[`/loop` 聊天快捷方式](/automation/cron-jobs/schedules#%2Floop-chat-shortcut)
- <a id="day-of-month-and-day-of-week-use-or-logic"></a>[月份和星期使用 OR 逻辑](/automation/cron-jobs/schedules#day-of-month-and-day-of-week-use-or-logic)
- <a id="event-triggers-condition-watchers"></a><a id="event-triggers-(condition-watchers)"></a>[事件触发器（条件观察器）](/automation/cron-jobs/schedules#event-triggers-condition-watchers)

### <a id="payload-and-execution-sections"></a> 有效负载和执行部分

[自动化有效负载](/automation/cron-jobs/payloads) — 有效负载类型、代理轮流标志和会话执行样式。

- <a id="payloads"></a>[有效负载](/automation/cron-jobs/payloads#payloads)
- <a id="agent-turn-options"></a>[代理转选项](/automation/cron-jobs/payloads#agent-turn-options)
- <a id="param-message"></a>[`--message`](/automation/cron-jobs/payloads#param-message)
- <a id="param-model"></a>[`--model`](/automation/cron-jobs/payloads#param-model)
- <a id="param-fallbacks"></a>[`--fallbacks`](/automation/cron-jobs/payloads#param-fallbacks)
- <a id="param-clear-fallbacks"></a>[`--clear-fallbacks`](/automation/cron-jobs/payloads#param-clear-fallbacks)
- <a id="param-clear-model"></a>[`--clear-model`](/automation/cron-jobs/payloads#param-clear-model)
- <a id="param-thinking"></a>[`--thinking`](/automation/cron-jobs/payloads#param-thinking)
- <a id="param-clear-thinking"></a>[`--clear-thinking`](/automation/cron-jobs/payloads#param-clear-thinking)
- <a id="param-light-context"></a>[`--light-context`](/automation/cron-jobs/payloads#param-light-context)
- <a id="param-tools"></a>[`--tools`](/automation/cron-jobs/payloads#param-tools)
- <a id="command-payloads"></a>[命令负载](/automation/cron-jobs/payloads#command-payloads)
- <a id="script-payloads"></a>[脚本有效负载](/automation/cron-jobs/payloads#script-payloads)
- <a id="execution-styles"></a>[执行样式](/automation/cron-jobs/payloads#execution-styles)
- <a id="codex-apps-in-scheduled-automations"></a>[计划自动化中的Codex应用程序](/automation/cron-jobs/payloads#codex-apps-in-scheduled-automations)
- <a id="main-session-vs-current-vs-isolated-vs-custom"></a>[主会话与当前会话、独立会话与自定义](/automation/cron-jobs/payloads#main-session-vs-current-vs-isolated-vs-custom)
- <a id="what-fresh-session-means-for-isolated-jobs"></a>[“新鲜会话”对于隔离作业意味着什么](/automation/cron-jobs/payloads#what-fresh-session-means-for-isolated-jobs)
- <a id="unattended-run-contract"></a>[无人值守运行合同](/automation/cron-jobs/payloads#unattended-run-contract)
- <a id="subagent-and-discord-delivery"></a>[子代理和Discord发货](/automation/cron-jobs/payloads#subagent-and-discord-delivery)

### <a id="delivery-sections"></a> 输送段

[自动化交付](/automation/cron-jobs/delivery) — 交付模式、故障通知和输出语言。

- <a id="delivery-and-output"></a>[发货输出](/automation/cron-jobs/delivery#delivery-and-output)
- <a id="failure-notifications"></a>[故障通知](/automation/cron-jobs/delivery#failure-notifications)
- <a id="output-language"></a>[输出语言](/automation/cron-jobs/delivery#output-language)

### <a id="management-and-configuration-sections"></a> 管理和配置部分

[管理自动化](/automation/cron-jobs/managing-jobs) — CLI 示例、管理命令、运行历史记录和配置键。

- <a id="cli-examples"></a>[CLI 示例](/automation/cron-jobs/managing-jobs#cli-examples)
- <a id="one-shot-reminder"></a>[一次性提醒](/automation/cron-jobs/managing-jobs#one-shot-reminder)
- <a id="recurring-isolated-job"></a>[重复隔离作业](/automation/cron-jobs/managing-jobs#recurring-isolated-job)
- <a id="model-and-thinking-override"></a>[模型与思维覆盖](/automation/cron-jobs/managing-jobs#model-and-thinking-override)
- <a id="webhook-output"></a>[Webhook输出](/automation/cron-jobs/managing-jobs#webhook-output)
- <a id="command-output"></a>[命令输出](/automation/cron-jobs/managing-jobs#command-output)
- <a id="managing-jobs"></a>[管理作业](/automation/cron-jobs/managing-jobs#managing-jobs)
- <a id="conversational-management"></a>[会话管理](/automation/cron-jobs/managing-jobs#conversational-management)
- <a id="cli-management"></a>[CLI 管理](/automation/cron-jobs/managing-jobs#cli-management)
- <a id="configuration"></a>[配置](/automation/cron-jobs/managing-jobs#configuration)
- <a id="retry-behavior"></a>[重试行为](/automation/cron-jobs/managing-jobs#retry-behavior)
- <a id="maintenance"></a>[维护](/automation/cron-jobs/managing-jobs#maintenance)
- <a id="legacy-store-migration"></a>[旧版商店迁移](/automation/cron-jobs/managing-jobs#legacy-store-migration)

### <a id="inbound-webhook-sections"></a> 入站 webhook 部分

[Inbound webhooks](/automation/cron-jobs/webhooks) — 用于外部调用者的网关 HTTP 挂钩。

- <a id="webhooks"></a>[Webhooks](/automation/cron-jobs/webhooks#webhooks)
- <a id="enable-and-test-an-agent-hook"></a>[启用并测试代理挂钩](/automation/cron-jobs/webhooks#enable-and-test-an-agent-hook)
- <a id="authentication"></a>[认证](/automation/cron-jobs/webhooks#authentication)
- <a id="post-hooks-wake"></a>[POST /hooks/wake](/automation/cron-jobs/webhooks#post-hooks-wake)
- <a id="post-hooks-agent"></a>[POST /hooks/agent](/automation/cron-jobs/webhooks#post-hooks-agent)
- <a id="mapped"></a>[映射挂钩 （`POST /hooks/<name>`）](/automation/cron-jobs/webhooks#mapped-hooks-post-hooks-name)
- <a id="verify-and-troubleshoot-hook-requests"></a>[验证挂钩请求并排除故障](/automation/cron-jobs/webhooks#verify-and-troubleshoot-hook-requests)

### <a id="gmail-sections"></a> Gmail 部分

[Gmail PubSub 触发器](/automation/cron-jobs/gmail) — Gmail 收件箱通过 Google Pub/Sub. 触发

- <a id="gmail-pubsub-integration"></a>[Gmail PubSub 集成](/automation/cron-jobs/gmail#gmail-pubsub-integration)
- <a id="configure-a-restricted-gmail-reader-recommended"></a><a id="configure-a-restricted-gmail-reader-(recommended)"></a>[配置受限的Gmail阅读器（推荐）](/automation/cron-jobs/gmail#configure-a-restricted-gmail-reader-recommended)
- <a id="authenticate-the-reader-model"></a>[验证读写器模型](/automation/cron-jobs/gmail#authenticate-the-reader-model)
- <a id="connect-gmail-transport"></a>[连接 Gmail 传输](/automation/cron-jobs/gmail#connect-gmail-transport)
- <a id="verify-the-reader-boundary"></a>[验证读卡器边界](/automation/cron-jobs/gmail#verify-the-reader-boundary)
- <a id="gateway-auto-start"></a>[网关自启动](/automation/cron-jobs/gmail#gateway-auto-start)
- <a id="manual-one-time-setup"></a>[手动一次性设置](/automation/cron-jobs/gmail#manual-one-time-setup)
- <a id="select-the-gcp-project"></a>[选择GCP项目](/automation/cron-jobs/gmail#select-the-gcp-project)
- <a id="create-topic-and-grant-gmail-push-access"></a>[创建主题并授予 Gmail 推送访问权限](/automation/cron-jobs/gmail#create-topic-and-grant-gmail-push-access)
- <a id="start-the-watch"></a>[启动手表](/automation/cron-jobs/gmail#start-the-watch)
- <a id="gmail-model-override"></a>[Gmail 模型覆盖](/automation/cron-jobs/gmail#gmail-model-override)

### <a id="troubleshooting-sections"></a> 故障排除部分

[自动化故障排除](/automation/cron-jobs/troubleshooting) - 命令梯形图和常见自动化故障形状。

- <a id="troubleshooting"></a>[故障排除](/automation/cron-jobs/troubleshooting#troubleshooting)
- <a id="command-ladder"></a>[指令梯形图](/automation/cron-jobs/troubleshooting#command-ladder)
- <a id="automations-not-firing"></a>[自动化未触发](/automation/cron-jobs/troubleshooting#automations-not-firing)
- <a id="job-fired-but-no-delivery"></a>[工作被解雇但没有交付](/automation/cron-jobs/troubleshooting#job-fired-but-no-delivery)
- <a id="automations-or-heartbeat-appear-to-prevent-new-style-rollover"></a>[自动化或心跳似乎可以防止/新型翻转](/automation/cron-jobs/troubleshooting#automations-or-heartbeat-appear-to-prevent-new-style-rollover)
- <a id="timezone-gotchas"></a>[时区问题](/automation/cron-jobs/troubleshooting#timezone-gotchas)

## <a id="related"></a> 相关内容

- [自动化](/automation) — 一览所有自动化机制
- [HHeartbeat](/gateway/heartbeat) — 周期性主会话轮次
- [长期意图](/concepts/standing-intents) — 事件触发的工作而不是计划
- [常规订单](/automation/standing-orders) — 计划运行所依据的操作权限
- [时区](/concepts/timezone) — 时区配置。
