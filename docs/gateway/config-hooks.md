---
summary: "挂钩配置：HTTP 合同、代理负载、会话策略、映射、重试和 Gmail"
read_when:
  - "连接入站挂钩端点"
  - "将钩子有效负载映射到代理或会话"
  - "调整挂钩重试、扇出或 Gmail 集成"
title: "配置——钩子"
---

`hooks.*` 下的入站挂钩键。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## <a id="hooks"></a> 钩子

`hooks.*` 配置通用网关 HTTP 入口。有关设置和验证的第一个请求，请参阅 [Webhooks](/automation/cron-jobs#webhooks)。这与 [ 内部挂钩 ](/automation/hooks)（`hooks.internal`、`HOOK.md`）分开。

```json5
{
  hooks: {
    enabled: true,
    token: "<long-random-hook-token>",
    path: "/hooks",
    allowedAgentIds: ["main"],
    allowRequestSessionKey: false,
  },
}
```

将 `main` 替换为预期配置的代理。 Hook 令牌授予入口访问权限，而不是经过身份验证的发送者身份；将有效负载内容视为不可信数据，并分别限制目标代理的工具和工作空间。

| 字段                       | 默认值                         | 契约                                                                                                                                                                                                          |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                   | `false`                         | 启用 HTTP 端点。需要非空 `token`。                                                                                                                                                           |
| `token`                     | 未设置                           | 共享钩子秘密字符串。使用专用的长随机值；这里不支持 SecretRef 对象。                                                                                                           |
| `path`                      | `/hooks`                        | 专用基本路径；添加前导斜杠并删除尾随斜杠。 `/` 被拒绝。                                                                                                                      |
| `allowedAgentIds`           | 无限制的                    | 有效的代理白名单，包括默认代理路径。省略或包含`"*"`允许全部； `[]` 否认一切。                                                                                             |
| `defaultSessionKey`         | 未设置                           | 未提供 request/mapping 密钥时的逻辑代理运行密钥；否则会生成新的 `hook:<uuid>`。本身不启用持久会话。                                                          |
| `allowRequestSessionKey`    | `false`                         | 允许来自 `/agent`、`/wake` 和有效负载派生的 mapping/transform 值的密钥。                                                                                                                                  |
| `allowedSessionKeyPrefixes` | 无限制的                    | 显式 request/mapping 密钥和 default/generated 密钥的不区分大小写的前缀。空列表或全空白列表不施加任何限制；否则，空白条目将被忽略。请参阅下面的会话策略。 |
| `presets`                   | `[]`                            | 内置映射附加在自定义映射之后。可用预设：`"gmail"`；未知名称不添加映射。                                                                                                     |
| `mappings`                  | `[]`                            | 有序映射列表；第一场比赛获胜。请参阅 [ 映射详细信息 ](/gateway/config-hooks#mapping-details)。                                                                                                             |
| `transformsDir`             | `<config-dir>/hooks/transforms` | 转换目录，仅限于该根目录，包括符号链接包含。通常为 `~/.openclaw/hooks/transforms`。                                                                                            |
| `gmail`                     | 未设置                           | Gmail 传输和处理默认值；请参阅 [Gmail 集成](/gateway/config-hooks#gmail-integration)。                                                                                                        |
| `internal`                  | 独立的子系统              | 内部事件挂钩配置；请参阅 [Hooks](/automation/hooks)。它不启用 HTTP 入口。                                                                                                               |

如果启用的挂钩令牌包含未解析的创作环境引用，则网关启动将继续，同时禁用外部 HTTP 挂钩并记录警告。将引用的机密提供给网关进程并重新加载或重新启动以启用端点。热重载中未解析的令牌将被拒绝；之前的有效钩子配置仍然有效。内部事件挂钩是一个单独的子系统。 `openclaw doctor` 报告当前环境中未解析的钩子凭据并提供恢复指导；它不会生成替换密钥或覆盖配置的引用。 CLI 和网关服务可以具有不同的环境。

`hooks.token` 应与活动网关共享秘密身份验证（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）不同。启动记录有关重用的非致命警告； `openclaw security audit` 报告了一个关键发现，包括在审核时提供的密码身份验证 （`--auth password --password <password>`）。使用 `openclaw doctor --fix` 轮换持久重用的挂钩令牌，然后更新所有外部发件人。

### <a id="hook-http-contract"></a> H查看HTTP合约

以下路径假设为 `hooks.path: "/hooks"`；如果配置不同，则替换该前缀。发送 `POST` 与 JSON 主体和 `Content-Type: application/json`。

身份验证接受 `Authorization: Bearer <token>` 或 `x-openclaw-token`。非空承载令牌优先。即使还存在有效标头，`token` 查询参数也会被拒绝并显示为 `400`。凭据丢失或错误返回 `401`。在 60 秒窗口内进行 20 次失败尝试后，来自该客户端的进一步无效身份验证尝试将受到 `429` 和 `Retry-After` 的限制；有效的身份验证会重置计数器。环回也不例外。在公开代理路由之前，正确配置可信代理归属。

正常主体限制为 **256 KiB**，具有 **30 秒** 主体读取超时。 Gmail 路径映射收到如下所述的更大的派生限额。通用挂钩解析 JSON，但不需要 JSON 内容类型标头。

| 端点             | 有效负载和结果                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /hooks/wake`   | 必需非空`text`；选修的`mode` （`"now"`默认或`"next-heartbeat"`）， `agentId`， `sessionKey`。退货`200 { ok: true, mode, eventOutcome }`； `eventOutcome` is `"queued"`当队列接受唤醒或`"coalesced"`当相同的唤醒已经是队列的最新待处理事件时。`now`承认普通会话事件；结果并不证明执行或交付已完成。 |
| `POST /hooks/agent`  | [代理负载](/gateway/config-hooks#hook-agent-payload)。默认情况下，session/global 放置入场后返回 `200 { ok: true, runId }`。使用`waitForCompletion: true`，等待承认的运行并在`completion`中添加有界终端execution/delivery事实。                                                                                                                                  |
| `POST /hooks/<name>` | 第一个匹配映射产生 wake/agent 操作。没有匹配的映射返回`404`；无操作返回 `204`。代理扇出具有 [batch 响应合约 ](/gateway/config-hooks#hook-retries-and-fan-out)。                                                                                                                                                                                                 |

直接 `/wake` 和 `/agent` 端点优先于具有这些名称的映射。 `/hooks`本身没有任何动作。

| 状态 | 含义                                                                                                                                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | JSON、有效负载、routing/session 策略或 delivery/account 选择无效。重试之前请阅读 `error`。                                                                                                              |
| `401`  | 挂钩验证失败。                                                                                                                                                                                                  |
| `404`  | 该路径上没有钩子操作或映射。禁用的钩子会影响网关路由的其余部分。                                                                                                                          |
| `405`  | 方法错误；返回 `Allow: POST`。                                                                                                                                                                                     |
| `408`  | 请求主体超时。                                                                                                                                                                                                        |
| `413`  | 正文超出路径的字节限制。                                                                                                                                                                                          |
| `429`  | 认证失败限制；荣誉`Retry-After`。                                                                                                                                                                       |
| `409`  | 由于目标会话已更改或无法接受工作，代理准入被拒绝。                                                                                                                                           |
| `500`  | Mapping/transform异常（`hook mapping failed`）；检查网关日志。                                                                                                                                                   |
| `502`  | 入院前代理准备失败。                                                                                                                                                                                   |
| `503`  | 15秒内未发生单次准入；排队的工作被取消。扇出待处理工作有所不同：它在后台继续进行。网关suspension/restart也可以返回`503 gateway_unavailable`。 |

代理准入失败使用 `{ ok: false, error, runId? }`。早期的 method/auth/path 故障可以是纯文本；不要假设每个错误响应都是 JSON。 15 秒的准入截止时间与主体读取超时和代理轮次的 `timeoutSeconds` 是分开的。 HTTP 的成功并不证明模型结果或渠道交付。参见[hook验证](/automation/cron-jobs#verify-and-troubleshoot-hook-requests)。

### <a id="hook-agent-payload"></a> Hook 代理负载

| 字段               | 默认值                  | 契约                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `message`           | 必填                 | 非空代理输入文本；外部内容是安全包装的。                                                                                                                                                                                               |
| `name`              | `"Hook"`                 | logs/completion 事件中使用的挂钩标签。                                                                                                                                                                                                                   |
| `agentId`           | 已解决的所有者           | 直接提供时必须命名已配置的代理。当无法解析 implicit/retained 所有者时需要。                                                                                                                                               |
| `sessionKey`        | default/generated 钥匙    | 遵守主叫键选择加入和前缀政策。                                                                                                                                                                                                              |
| `sessionMode`       | `"isolated"`             | `"isolated"` 创建新的运行会话； `"persistent"` 重用已解析的会话。                                                                                                                                                                        |
| `idempotencyKey`    | 未设置                    | 可选重播键；标头优先。请参阅下面的重试。                                                                                                                                                                                             |
| `waitForCompletion` | `false`                  | 仅限直接 `/agent`。当 `true` 时，在准入后保持 HTTP 响应打开，并返回 `completion` 以及 `status` 和可用的交付事实。映射和扇出仍然仅限入场。                                                              |
| `wakeMode`          | `"now"`                  | `"now"` 或 `"next-heartbeat"`；控制完成事件的唤醒，而不是是否立即分派代理。                                                                                                                                       |
| `deliver`           | `true`                   | 只有 `false` 选择退出。如果没有直接目标，成功的输出可能会成为主会话完成事件。 `false` 记录成功完成而不发出通知并忽略目标字段。不正常的执行结果会产生一个状态事件。 |
| `channel`           | 没有直接交付 | 注册具体通道id；必须与 `to` 配对。直接`/agent`不能使用`"last"`。                                                                                                                                                               |
| `to`                | 未设置                    | 用于直接通知传递的非空收件人，与 `channel` 配对。                                                                                                                                                                                      |
| `accountId`         | 频道默认          | 选择已配置、已启用的帐户；需要 `channel` 和 `to`。未知、禁用或无效的选择在调度前返回 `400`。                                                                                                                   |
| `model`             | agent/model 默认     | 模型 ID 或别名覆盖，取决于模型可用性和白名单政策。                                                                                                                                                                              |
| `thinking`          | agent/model 默认     | 跑步的思维覆盖。                                                                                                                                                                                                                               |
| `timeoutSeconds`    | 代理超时            | 正数字转向超时覆盖；直接有效负载值被限制为整秒。 Invalid/nonpositive 值将被忽略。                                                                                                                          |

省略所有目标字段将在不直接宣布目标的情况下运行。启用传送时，仅提供部分目标会失败，并显示 `400`。 `deliver: false` 禁用公告，而不是座席使用消息传递工具的能力；需要时在代理策略中限制这些工具。

### <a id="hook-session-and-agent-policy"></a> Hook 会话和代理策略

直接请求代理 ID 必须存在。映射代理 ID 解析为已配置的代理，并使用旧版默认代理回退未知映射 ID。如果无法解决业主问题，那么入场就失败，而不是发明代理。有效代理必须通过`allowedAgentIds`；还强制执行全局会话存储所有权。代理前缀密钥将重新调整范围到所选代理并再次进行前缀检查。

对于固定的全局会话存储，省略的目标在运行时默认值之前使用其持久的 `agents.defaults.sessionStore.agentId` 所有者。与该所有者冲突的显式目标将被拒绝。持久所有者仍必须通过 `allowedAgentIds`。

密钥从 request/mapping 解析，然后是 `hooks.defaultSessionKey`，然后是生成的 `hook:<uuid>`。配置的默认值必须与前缀允许列表匹配。如果没有默认值，白名单必须承认生成的 `hook:` 密钥。

- Direct `/agent` 持久模式需要显式请求 `sessionKey`、`allowRequestSessionKey: true` 和非空前缀白名单。
- 持久映射需要稳定映射 `sessionKey` 或 `defaultSessionKey`。静态映射键不需要调用者键选择加入，但仍然遵循配置的前缀。
- 模板映射键在配置解析时需要非空前缀允许列表，在调度时需要 `allowRequestSessionKey: true`。这包括内置 Gmail 预设，除非较早的映射覆盖它。
- `/wake` 仅接受具有 `mode: "now"` 和相同呼叫者 key/prefix 策略的显式密钥。如果没有，它将使用所选代理的主会话； `defaultSessionKey` 用于代理运行，而不是唤醒。

逻辑挂钩密钥并不总是存储的会话密钥。即使挂钩键稳定，隔离运行也会使用新的自动化运行会话。持久性控制对话重用，而不是工具权限或沙箱。即使在隔离模式下，共享标准化逻辑密钥的请求也会通过完成而被序列化。因此，固定的 `defaultSessionKey` 对这些请求进行排序，但可以使稍后的单个请求达到准入超时，同时较早的运行仍处于活动状态。

### <a id="mapping-details"></a> 映射详情

自定义 `mappings` 在 `presets` 之前按数组顺序运行。第一个匹配拥有该请求，包括返回 `null` 的转换；稍后的映射不会被尝试。两个匹配谓词在提供时都必须通过。省略它们会匹配任何自定义挂钩路径。

| 测绘领域                | 默认值                     | 契约                                                                                                                                          |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                         | `mapping-<index>`           | 已承认的代理操作的有界入口源归因，而不是经过身份验证的主体或调用者。                                         |
| `match.path`                 | 任何自定义路径             | `hooks.path` 之后的子路径，删除了 leading/trailing 斜杠（`gmail` 与 `/hooks/gmail` 匹配）。                                               |
| `match.source`               | 任何来源                  | 与有效负载的字符串 `source` 字段完全匹配。                                                                                          |
| `action`                     | `"agent"`                   | `"agent"` or `"wake"`.                                                                                                                            |
| `wakeMode`                   | `"now"`                     | `"now"` 或 `"next-heartbeat"`；对于唤醒操作，变为 `mode`。                                                                                   |
| `name`                       | 发货时 `"Hook"`        | 模板化代理运行标签。                                                                                                                        |
| `agentId`                    | 已解决的所有者              | 静态目标代理 ID；受有效智能体许可名单的约束。                                                                                     |
| `sessionKey`                 | default/generated 钥匙       | 静态或模板化逻辑键；请参阅会话策略。                                                                                              |
| `sessionMode`                | `"isolated"`                | `"isolated"` 或 `"persistent"` 用于代理操作。                                                                                                 |
| `messageTemplate`            | 空的                       | 代理输入模板；最后的操作必须有一个非空消息。                                                                              |
| `textTemplate`               | 空的                       | 唤醒文本模板；最终操作必须包含非空文本。使用受信任的通知文本，而不是原始的不受信任的内容。                           |
| `forEach`                    | 未设置                       | 顶级有效负载数组键；每项一项操作，最多 200 项。 Nested/prototype 路径被拒绝。                                       |
| `deliver`                    | `true`                      | 代理公告政策。与直接 `/agent` 不同，映射交付可以使用 `"last"` 或将部分目标推迟到自动化交付解析器。 |
| `channel`                    | `"last"`                    | 注册的通道 ID 或 `"last"`。映射不会公开 `accountId`。                                                                            |
| `to`                         | 未设置                       | 模板化的交付目标。优先选择显式 `channel` 和 `to`。                                                                                    |
| `model`                      | agent/model 默认        | 模板化模型覆盖。                                                                                                                         |
| `thinking`                   | agent/model 默认        | 模板化思维覆盖。                                                                                                                      |
| `timeoutSeconds`             | 代理超时               | 正整数轮次超时。                                                                                                                    |
| `allowUnsafeExternalContent` | `false`                     | 危险：禁用此映射的代理外部内容包装。 Gmail 的全局不安全标志也可以禁用换行。                       |
| `transform.module`           | 未设置                       | `transformsDir`下安全相对JS/TS模块；绝对、遍历、URL/drive 形式和符号链接转义均被拒绝。                         |
| `transform.export`           | `default`，然后 `transform` | 命名函数导出；必须存在明确命名的导出。                                                                                     |

模板支持 `{{payload.field}}` 或 `{{field}}`，数组索引，例如 `{{messages[0].subject}}`、`{{headers.x-event-type}}`、`{{query.kind}}`、`{{path}}` 和 `{{now}}`（ISO 时间戳）。 Missing/null 值变为空字符串；对象序列化为 JSON。空的渲染会话密钥模板将被拒绝。

转换接收 `{ payload, headers, url, path }` 并可根据需要异步返回部分操作覆盖。动作输出使用`kind: "agent"`或`"wake"`，分别用`message`或`text`。返回 `null` 会跳过该操作；当没有剩余操作时，在创建任何运行、任务、执行标识或审核收据之前，响应为 `204`。转换异常返回 `500`。

默认情况下，提供的变换 `sessionKey` 是从外部导出的。只有产生固定密钥的可信代码才应标记 `sessionKeySource: "static"`；切勿使用该标记来绕过有效负载派生密钥的策略。转换作为受信任的网关代码执行，而不是在读取器代理的沙箱中执行。它们会被缓存，直到钩子配置重新加载。将模块保留在钩子变换根目录下，而不是工作区技能目录下；如果医生报告，则移动无效模块或删除无效的 `transformsDir`。

### <a id="hook-retries-and-fan-out"></a> Hook重试和扇出

代理重播密钥按以下顺序解析：`Idempotency-Key`、`X-OpenClaw-Idempotency-Key`，然后是有效负载 `idempotencyKey`。仅使用最多 256 个字符的修剪非空字符串。相同的密钥仅针对相同的令牌、路径和已解析的调度字段重播；更改消息或路由可以创建新的运行。待处理的准入和未解决的完成的已准入运行将被保留，而不会出现 TTL 或大小驱逐。终端完成后，其重播条目将在 5 分钟后过期，并计入 1,000 个终端条目内存范围。重新启动会清除所有重播状态。失败的录取仍然可以重试。直接重试可能会更改 `waitForCompletion` 而不更改调度身份：仅准入调用者重播 `runId`，而等待调用者共享相同的完成承诺并重播其最终结果。

请求时，`completion.status` 为 `ok`、`error` 或 `skipped`，`replyDisposition` 为 `visible`、`silent` 或 `empty`。此配置仅公开终端模型回复是否存在，而不公开其文本。可选的下发字段为`delivered`、`deliveryAttempted`、`deliveryError`、`deliverySuppressionReason`（`empty`、`silent`、`heartbeat`、`channel_transform`）。丢失的交付字段仍然未知。准入后失败仍返回HTTP `200`；只有准入失败才使用上述非 2xx 状态。 `deliveryError`（如果存在）是固定分类值 `"delivery-failed"`。永远不会返回提供程序、运行时、模型、目标、会话、诊断、输出和摘要详细信息。

对于 `forEach`，templates/transforms 查看原始有效负载，并将所选阵列替换为 `[currentItem]`。缺失值、空值或非数组值不会产生任何操作 （`204`）。仅处理前 **200** 项；多余的项目会被丢弃并发出警告，而不是 HTTP 故障。在发件人处拆分较大的批次。

mapping/transform 工作后，扇出代理调度最多等待 **8 秒**。待处理的入场将在后台继续进行，没有单次运行 15 秒的取消截止日期。完全承认的多代理批次返回：

```json
{
  "ok": true,
  "runId": "<first-hook-request-run-id>",
  "runIds": ["<hook-request-run-id-1>", "<hook-request-run-id-2>"],
  "dispatched": 2
}
```

已结算的单项批次保留 `{ ok: true, runId }`。部分失败或待处理项目返回非 2xx 和 `ok: false`、不完整批次 `error`、已承认的 `runIds` 以及 `errors` 中最多 5 条失败消息。仅待处理批次使用 `503`。因此，错误可能与已承认或尚未完成的工作共存。

即使没有显式的幂等性密钥，代理扇出也会从每个呈现的操作中派生重播标识。相同的重试会在缓存生命周期内协调 pending/admitted 项；对于相同的重试，保持转换结果相同。唤醒操作立即调度并且没有重播标识，包括混合 wake/agent 批次。如果其队列接受了任何唤醒，则其响应包括 `eventOutcome: "queued"`；如果其队列合并了每个唤醒，则其响应包括 `"coalesced"`。这不是持久的一次性处理。

### <a id="gmail-integration"></a> Gmail 集成

Gmail 预设通过 `forEach: "messages"` 和 `sessionKey: "hook:gmail:{{messages[0].id}}"` 路由 `/hooks/gmail`，默认为隔离模式。自定义匹配映射在预设之前运行。如果没有映射 `agentId`，预设将使用已解析的默认代理；对话隔离不会限制该代理的工具或工作空间。

在连接不受信任的邮件之前应用 [ 受限 Gmail 阅读器配置](/automation/cron-jobs#configure-a-restricted-gmail-reader-recommended)。 setup 命令配置传输，而不是读取器或会话密钥策略。对于模板化密钥，请使用匹配的 `defaultSessionKey` 设置 `allowRequestSessionKey: true` 和 `allowedSessionKeyPrefixes: ["hook:gmail:"]`，或者允许更广泛的 `"hook:"` 命名空间。要保持主叫键覆盖禁用，请使用静态 `sessionKey` 将预设替换为早期映射。除非打算重用上下文，否则请保持隔离模式。

```json5
{
  hooks: {
    gmail: {
      account: "reader@example.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "<separate-random-push-token>",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openai/gpt-6-astra",
      thinking: "high",
    },
  },
}
```

这是传输块，而不是完整的读取器设置。该模型只是一个示例，读者必须能够理解。 Gmail 字段：

| `hooks.gmail` 字段          | 运行时默认值              | 契约                                                                                                                                                      |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account`                    | 必填                     | Gmail 帐户已在 `gog` 中获得授权。                                                                                                                    |
| `label`                      | `"INBOX"`                    | 值得关注的 Gmail 标签。启动观察器时，OpenClaw 不包括 `SPAM`、`TRASH`、`DRAFT` 和 `SENT`。                                                      |
| `topic`                      | 必填                     | 完整的 Pub/Sub 主题路径。安装程序可以配置 `gog-gmail-watch` 主题。                                                                                     |
| `subscription`               | `"gog-gmail-watch-push"`     | 设置使用的 Pub/Sub 订阅。                                                                                                                           |
| `pushToken`                  | 必填                     | 验证向观察者发出的传入推送。与 `hooks.token` 分开，验证转发到 OpenClaw。如果不存在，安装程序会生成一个。         |
| `hookUrl`                    | 本地网关 `/hooks/gmail` | 除非配置，否则转发从 `hooks.path` 和网关端口构建的 URL。                                                                                    |
| `includeBody`                | `true`                       | 包括电子邮件正文片段。在配置中设置 `false` 以省略它们。                                                                                              |
| `maxBytes`                   | `20000`                      | 传递给观察者的每条消息正文限制的正整数。还用于导出 Gmail HTTP 正文限额。                                             |
| `renewEveryMinutes`          | `720`                        | 正整数监视更新间隔。                                                                                                                      |
| `serve.bind`                 | `"127.0.0.1"`                | 观察者绑定主机。                                                                                                                                            |
| `serve.port`                 | `8788`                       | 正整数观察者端口。                                                                                                                                |
| `serve.path`                 | `"/gmail-pubsub"`            | 观察者之路。启用 Tailscale 且没有显式目标时，它会变为 `/`，因为暴露的前缀被剥离。                                           |
| `tailscale.mode`             | `"off"`                      | `"off"`、`"serve"` 或 `"funnel"`。设置默认为`"funnel"`；未保存配置的运行时默认为 `"off"`。                                            |
| `tailscale.path`             | 已解决的服务路径          | 暴露的 Tailscale 路径，通常在设置中为 `/gmail-pubsub`。                                                                                                    |
| `tailscale.target`           | 本地观察者                | 可选端口、`host:port` 或 URL 目标。显式目标保留配置的服务路径。                                                            |
| `model`                      | agent/model 默认         | Gmail 模型默认；显式映射模型会覆盖它。不允许的 Gmail 默认值将被忽略，而无效的显式运行覆盖将导致准备失败。 |
| `thinking`                   | agent/model 默认         | `"off"`、`"minimal"`、`"low"`、`"medium"` 或 `"high"`；明确的映射思维优先。                                                           |
| `allowUnsafeExternalContent` | `false`                      | 危险：禁用 Gmail 代理轮流的电子邮件安全包装。保留不受信任的收件箱。                                                              |

Gmail 路径映射使用 `max(256 KiB, min(32 MiB, 100 × (3 × maxBytes + 8192)))` 的请求正文限额。乘法器为转义内容和消息元数据保留空间；并不能保证每个上游积压工作都适合。上游历史页面大小统计历史记录，可以包含多条消息。扇出仍然只处理前 200 个项目，并且日志会丢弃多余的内容。请参阅 [ 批次限制和重试](/gateway/config-hooks#hook-retries-and-fan-out)。

什么时候`hooks.enabled: true`和`hooks.gmail.account`设置后，网关启动`gog gmail watch serve`如果其可执行文件和所需的传输配置可用，并更新手表。放`OPENCLAW_SKIP_GMAIL_WATCHER=1`选择退出。不要在同一个侦听器上启动第二个前台观察程序。设置输出可以包含令牌；看到[CLI参考](/cli/webhooks)。

成功的推送或挂钩响应是 transport/admission 证据，而不是已完成电子邮件处理或发送的证明。通过 [logs 及其运行输出 ](/automation/cron-jobs#verify-the-reader-boundary) 验证受限读取器。对于读取器到代理的切换，仅公开所需的工具并使用 `allow` 约束默认启用的 [`tools.agentToAgent`](/gateway/config-tools#tools-agenttoagent) 策略，或者在不需要切换时设置 `enabled: false`；另请参见 [ 提示注入 ](/gateway/security/prompt-injection) 和 [ 每代理沙箱和工具 ](/tools/multi-agent-sandbox-tools)。

---
