---
summary: "长轮询和 Webhook 模式相比，具有网关路由和持久的入口行为"
read_when:
  - "在长轮询和 Webhook 模式之间进行选择"
  - "将反向代理放在 Telegram 网关 webhook 路由前面"
title: "Telegram 运输"
sidebarTitle: "交通"
---

长轮询是默认设置。当 HTTPS 入口可用时，Webhook 模式是替代方案。

## <a id="long-polling-and-webhooks"></a> 长轮询和 webhooks

<AccordionGroup>
  <Accordion id="long-polling-vs-webhook" title="长轮询与 webhook">
    默认为长轮询。对于webhook模式，设置`channels.telegram.webhookUrl`和`channels.telegram.webhookSecret`；可选 `webhookPath`（默认 `/telegram-webhook`）和 `webhookCertPath`（用于直接 IP 或无域设置的自签名证书 PEM）。

    网关保留 `/health`、`/healthz`、`/ready`、`/readyz`、`/startup` 和 `/startupz` 进行检查，包括查询变体。 `/api/channels` 命名空间还需要网关身份验证，包括编码形式，并且无法接收直接 Telegram 回调。选择 `/telegram-webhook` 或其他路由作为网关入口。确切的 `/healthz` 路径仍保留用于旧侦听器的运行状况检查，并且不能是 Telegram Webhook 路径。当您更新 `webhookPath`、`webhookUrl` 和反向代理映射时，其他网关保留的路径可以继续通过显式 `legacyWebhook` 端点接收回调。如果没有显式端点，保留路径会产生可操作的启动错误。验证 [hot reload](/gateway/configuration/hot-reload) 是否应用了 `openclaw channels status --probe` 的路由更改。

    在长轮询模式下，OpenClaw 在更新提交到持久入口队列后保存其重新启动位置。失败的处理程序仍然可以从该队列中重试。

    Webhook 路由在网关 HTTP 端口（默认 `18789`）上可用。将公共 HTTPS 入口指向该端口和 `webhookPath`。 OpenClaw 在每次 webhook 启动时（包括重新启动后）注册配置的 `webhookUrl` 不变。配置的 `gateway.publicOrigin` 不会替换操作员管理的回调或反向代理映射。 Telegram 的秘密标头仍然是身份验证边界，因此该路由不需要网关承载令牌。

    新安装不会打开旧转发端口。在升级过程中，Doctor 会将现有隐式 `127.0.0.1:8787` 端点保留为显式 `legacyWebhook` 引脚，除非 `webhookUrl` 与配置的 `gateway.publicOrigin` 以及该帐户的可用 `webhookPath` 相匹配。比较包括路径和查询； OpenClaw 无法从任意现有回调 URL 推断网关目标。要停用 pin，请公开可用的网关 webhook 路由，将 `webhookUrl` 设置为其公共 URL，并删除 `legacyWebhook`； OpenClaw 在释放旧侦听器之前注册 URL。或者，将现有回调的反向代理上游移动到网关端口，验证传入消息，并设置 `legacyWebhook: false` 以保留其公共 URL。删除该设置永远不会恢复隐式侦听器。

    在进程内帐户重新加载期间，网关使先前的侦听器保持可重试状态，直到 Telegram 接受 `setWebhook` 作为替换 URL。接收更新并不能完成该切换。完全重新启动网关会关闭旧进程的套接字； Telegram 在替换启动并注册其路线时重试挂起的交付。

    医生将引脚及其 `meta.migrations.webhookListeners` 完成记录一起保存。移除 pi​​n 时保留该记录，以便稍后 Doctor 运行和更新将其移除。有关包含的只读配置源，请参阅 [webhook 迁移](/gateway/doctor/config-migrations#channel-webhook-listeners)。

    旧端口保留其未经身份验证的 `/healthz` 响应（`200`、普通 `ok`）和帐户本地失败秘密速率限制。健康匹配是精确的：查询字符串、尾部斜杠、大小写更改和编码变体不是健康检查。 HEAD 返回相同的状态，但没有正文。主网关端口保留其自己的检查和响应标头行为。

    升级后，运行`openclaw doctor --fix`。 Doctor 备份配置并将旧的 `webhookPort` 和 `webhookHost` 设置迁移到 `legacyWebhook: { port, host }`，保留端口 `8787` 的仅主机设置。显式端点对象会覆盖默认值；省略的对象主机使用 `127.0.0.1`。现有 `legacyWebhook: false` 设置在迁移期间保持禁用状态。

    命名帐户继承通道的 `legacyWebhook` 设置。即使通道配置指定了端点，帐户级别的 `false` 也会禁用该帐户的旧端点。显式帐户端点会覆盖继承的 `false`。共享旧套接字保持打开状态，而另一个帐户仍然使用该端点。两个端口使用相同的网关路由处理程序和 Telegram 秘密验证。

    单独安装的 Telegram 插件需要 OpenClaw 2026.9.8 或更新版本，其 Doctor 可以在新运行时启动之前保留省略的端点。在手动替换插件之前升级 OpenClaw。较旧的主机拒绝不兼容的软件包并保留其当前的插件。网关拥有每个显式配置的转发监听器； Telegram不再开设单独的帐户拥有的服务器。

    当 Webhook 密钥不同时，帐户可能会共享网关路由。匹配多个帐户的请求将被拒绝；在将流量转移到网关端口之前分配不同的秘密或路径。迁移的旧端点会保留先前在单独的显式端口上共享机密和路径的帐户的帐户选择。

    webhook 模式会先验证请求守卫、Telegram secret token 和 JSON body，然后在返回空的 `200` 之前将更新提交到其持久化入口队列。成功的持久化接纳会包含 `x-openclaw-delivery-accepted: durable`；健康检查、路由、认证、验证以及存储错误响应不会包含该头。反向代理和主机控制器可以要求该头，以区分 OpenClaw 的接纳与普通空 `200`，而不必通过响应时间推断是否被接纳。

    持久写入后，OpenClaw 通过核心通道入口引流（每个 chat/per-topic 通道、依次完成采用、预采用停顿超时）声明并处理更新。缓慢的代理轮流不持有Telegram的交割ACK。

  </Accordion>
</AccordionGroup>

## <a id="ingress-acknowledgment-boundary"></a> Ingress 确认边界

Telegram 确认是通过持久队列准入来控制的，而不是通过插件挂钩或代理轮次的完成来控制。 Webhook模式使用上面描述的边界；长轮询使用以下序列：

1. 轮询工作线程收到一个 Telegram 更新并等待。
2. OpenClaw 以事务方式将原始更新放入 `state/openclaw.sqlite` 中帐户范围的 `channel_ingress_events` 队列中。
3. 入队成功后，OpenClaw安排重启偏移量的持久性并确认工作线程，允许轮询继续。
4. 共享漏极单独处理排队的更新。如果接纳失败，OpenClaw 会拒绝工人确认，而不是默默前进。

`offset queued` 表示重新启动偏移写入已计划，但未提交。在写入完成之前发生崩溃可能会使 Telegram 重新传送已排队的更新。仅当同一传输事件 ID 的待处理行、已完成的逻辑删除或失败的行仍然存在时，队列才会拒绝该传输事件。这是有界重放重复数据删除，而不是一次性处理。请参阅 [ 持久入口和重播重复数据删除 ](/plugins/sdk-channel-plugins/durable-ingress#durable-ingress-and-replay-dedupe)。

### <a id="replay-limits"></a> 重播限制

在升级期间，超过 24 小时的旧假脱机更新将成为 `stale-legacy-import` 故障逻辑删除，使用其原始收据或 message/edit 日期。新的更新仍在发送；原始源字节和导入收据将保留。一条警告报告计数和 oldest/newest 日期。这有意放弃真正未处理的旧更新，以避免执行过时的指令。先前导入的队列行未更改。

即使没有轮询偏移，两种传输都会在接受更新之前记录帐户的机器人身份。替换已知机器人会在替换开始之前清除其旧的入口行。相同机器人重新启动和令牌轮换保留排队工作和重播保护，就像没有已知先前身份的遗留队列一样。如果身份准备失败，帐户启动将停止并出现错误，要求您重新启动帐户；中断的重置会保留之前的标识以供重试。

对于每个 Telegram 帐户队列，已完成的逻辑删除和失败的行最多保留 30 天，每类上限为 1,000 个条目。无论先达到哪个限制，都会结束该类别的保留。完成会清除入站负载和元数据，同时保留事件标识。

副作用发生后但队列完成之前发生的崩溃可能会重复该副作用。请参见 [ 传输保留 ](/plugins/sdk-channel-plugins/durable-ingress#transport-classes-and-retention)、[ 至少一次副作用 ](/plugins/sdk-channel-plugins/durable-ingress#at-least-once-side-effects) 和 [ 入站死信 ](/cli/channels#inbound-dead-letters)。

记录的持久性边界是成功完成 SQLite 事务，而不是单独的每个事件 fsync 保证。使用持久状态目录；删除它会丢失排队的更新和保存的轮询偏移量。

### <a id="shutdown"></a> 关机

即使在 15 秒入口关闭宽限期到期后，长轮询和 Webhook 帐户也会等待已承认的重播提交或回滚。已接受的组介绍将通过其现有的 60 秒代理轮流预算以及帐户关闭完成之前的后续重复数据删除提交进行跟踪。在接受介绍之前取消会导致介绍无法开始。普通处理程序和机器人关闭宽限期保持不变。

### <a id="plugin-hooks"></a> 插件钩子

没有插件挂钩可以推迟 Telegram 的传输确认，直到插件拥有的持久性完成：

- `message_received` 是对已接受的入站转弯的即发即忘观察。
- `before_dispatch` 是正常模型发货前的有条件索赔。
- `before_agent_run` 是模型提交之前的一个门，仅在模型轮次到达该阶段时运行。

没有人接收原始更新作为持久性边界。请参阅 [ 消息和传递挂钩 ](/plugins/hooks/messages) 和 [hook 目录 ](/plugins/hooks/reference#hook-catalog)。
