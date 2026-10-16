---
doc-schema-version: 1
summary: "网关 HTTP 挂钩，让外部服务唤醒代理或提交轮次"
read_when:
  - "让外部服务通过 HTTP 调用 OpenClaw"
  - "启用、验证和冒烟测试挂钩端点"
  - "调试钩子请求状态代码"
title: "入站网络钩子"
sidebarTitle: "入站网络钩子"
---

网关 HTTP 挂钩：外部服务如何调用 OpenClaw 来唤醒代理或提交代理轮次。 [Automations](/automation/cron-jobs) 指南的一部分。

## Webhooks

网关 HTTP 挂钩允许外部服务唤醒代理或提交代理轮次。默认情况下它们是禁用的。这些端点与 [ 内部事件挂钩 ](/automation/hooks)（`HOOK.md` 处理程序）分开。它们也不同于出站自动化 Webhook 交付：此处，外部服务调用 OpenClaw。

### <a id="enable-and-test-an-agent-hook"></a> 启用并测试代理挂钩

从正在运行的网关和可以完成正常转弯的代理开始。将其合并到您的配置中，将令牌替换为长随机值，并将 `main` 替换为预期配置的代理：

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

使用专用于挂钩的令牌，而不是网关身份验证令牌或密码。在具有 profile/config. 的网关主机上运行以下命令验证配置，重新启动已安装的服务以加载它，并观察日志：

```bash
openclaw config validate
```

```bash
openclaw gateway restart
```

```bash
openclaw logs --follow
```

如果您在前台运行网关而不是作为已安装的服务运行，请停止并启动该进程。

在另一个终端中，向本地网关发送无害的测试。替换令牌、代理 ID 和端口以匹配您的配置：

```bash
curl --include http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer <long-random-hook-token>' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: webhook-smoke-001' \
  --data '{"message":"Summarize this test event: the sample import completed.","name":"Webhook smoke test","agentId":"main","deliver":false}'
```

预期的入场响应为 HTTP `200`：

```json
{ "ok": true, "runId": "<hook-request-run-id>" }
```

这意味着本次运行获得了session/global 的安置入场券。 **not** 表示模型完成、工具成功或消息已传递。单个代理请求最多可以等待 15 秒才能进入；当响应到达时，模型运行时可能仍在准备中。

对于需要在同一请求中提供终端执行和传递事实的调用方，请将 `"waitForCompletion": true` 添加到直接 `/hooks/agent` 负载中。响应在接纳后保持开放状态，并在接纳运行稳定后返回 HTTP `200`：

```json
{
  "ok": true,
  "runId": "<hook-request-run-id>",
  "completion": {
    "status": "ok",
    "replyDisposition": "silent",
    "delivered": false,
    "deliveryAttempted": true,
    "deliverySuppressionReason": "silent"
  }
}
```

`replyDisposition` 记录模型的终端回复是 `visible`、`silent` 还是 `empty`，而不暴露其文本。准入后执行或交付失败是 `completion` 中的终端数据，而不是可重试的 HTTP 失败。 `deliveryError`（如果存在）是固定分类值 `"delivery-failed"`；提供者、运行时、模型、目标、会话和诊断详细信息保持私有。响应从不包含模型输出或摘要。使用 `Idempotency-Key` 标头，以便丢失的响应可以重播相同的已承认的运行和完成结果，而无需再次调度。

在 `openclaw logs --follow` 中，搜索 `hook agent run completed` 和确切的 HTTP `runId`。使用 `status=ok` 运行，并且在信息级别没有显式传递错误日志；所有非正常状态（包括跳过的运行）、引发的错误和显式传递错误都记录在警告级别。对于此 `deliver: false` 测试，预计 `status=ok` 不会成功发布。 `status=ok` 和 `deliveryError` 的警告表示执行成功但交付失败。它不会触发另一次公告尝试。

结构化终端记录包括接受的`agentId`、`jobId`、钩子名称和源路径以及`logicalSessionKey`。当运行程序返回它们时，`sessionId` 关联运行脚本，`sessionKey` 识别运行时会话密钥。精确运行延续别名可以在完成后退役；该键不保证单独的持久会话行。丢失的会话事实仍然未知。诊断信息经过编辑、单行且每个字符串不得超过 500 个字符。不记录成功的输出：检查代理的运行会话。 HTTP `runId` 关联钩日志；它不是传递给 `openclaw automations runs` 的自动化作业 ID。

`sessionMode` 默认为 `isolated`，因此此测试获得新的运行会话和生成的逻辑 `hook:<uuid>` 密钥。存储的会话可以使用`cron:...:run:...`密钥；逻辑挂钩键不是关于记录的存储键的承诺。固定的 `defaultSessionKey` 会序列化共享该密钥的请求，即使在隔离模式下也是如此；仅当需要该排序时才使用它。

### <a id="authentication"></a> 认证

每个请求都必须通过以下标头之一包含挂钩令牌：

- `Authorization: Bearer <token>`（推荐）。
- `x-openclaw-token: <token>`.

查询字符串 `?token=...` 身份验证被拒绝。将 JSON 与 `Content-Type: application/json` 一起发送。所有挂钩端点仅接受 `POST`。 [Hooks 参考](/gateway/config-hooks#hooks) 列出了有效负载字段、限制、路由策略和错误响应。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    将所选代理的主会话的可信通知排入队列。立即唤醒使用普通会话执行：

    ```bash
    curl --include http://127.0.0.1:18789/hooks/wake \
      -H 'Authorization: Bearer <long-random-hook-token>' \
      -H 'Content-Type: application/json' \
      --data '{"text":"The sample import completed","mode":"now","agentId":"main"}'
    ```

    HTTP `200`包括`eventOutcome: "queued"`当队列接受唤醒或`eventOutcome: "coalesced"`当相同的唤醒已经是队列的最新待处理事件时。和`mode: "now"`，响应确认允许普通会话执行，未完成执行或交付。该事件在该会话中的现有工作之后等待，并且不依赖于心跳节奏或活动时间。使用`mode: "next-heartbeat"`保留下一个心跳的事件。

    完整的会话队列返回 HTTP `503` 并带有可操作的错误，而不是逐出已接受的事件。让会话在重试之前处理其挂起的事件。这也适用于映射的唤醒操作；当队列已满时，重复的唤醒仍然可以合并。

    提供的 `agentId` 必须命名已配置的代理。当队列没有隐式或保留的遗留所有者时显式提供它。主叫选择的`sessionKey`需要`mode: "now"`、`hooks.allowRequestSessionKey: true`以及配置的前缀策略；延迟唤醒使用主会话。

    唤醒文本是一个系统事件，而不是孤立的、安全的电子邮件阅读器轮流。仅发送您控制的简短通知。通过 `agent` 操作与受限读者路由原始电子邮件、文档或其他不受信任的内容。

  </Accordion>
  <Accordion title="POST /hooks/agent">
    提交具有所需 `message` 的代理轮次。可选的路由、模型、思考、超时和重复请求保护字段记录在 [ 有效负载参考 ](/gateway/config-hooks#hook-agent-payload) 中。

    保留 `sessionMode: "isolated"` 以获取新的上下文。仅当重复事件应重用先前上下文时才设置 `"persistent"`：直接请求则需要显式 `sessionKey`、`hooks.allowRequestSessionKey: true` 和非空 `hooks.allowedSessionKeyPrefixes`。

    提供时，`sessionKey` 必须是非空字符串。格式错误或空白密钥会返回 `400`，而不是默默地选择默认或生成的会话密钥。

    对于直接渠道交货，同时提供混凝土`channel`和`to`；添加`accountId`以选择已启用的通道帐户。仅提供目标的一部分、使用 `channel: "last"` 或选择无效帐户会在发货前返回 `400`。直接挂钩不会继承主会话的最后一个接收者。

    如果没有目标，默认 `deliver: true` 允许在目标代理的主会话上完成系统事件。设置 `deliver: false` 抑制成功公告并忽略目标字段；而是记录完成情况。不好的结果仍然会产生失败事件。禁用公告不是工具限制：如果代理不得发送消息，则单独限制代理的工具。

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    自定义路径通过 `hooks.mappings` 解析。第一个匹配的映射获胜，领先于预设。模板或可信本地 JS/TS 转换将有效负载转换为 `wake` 或 `agent` 操作；返回 `null` 的转换会生成 HTTP `204`，而无需运行。请参阅 [ 映射详细信息 ](/gateway/config-hooks#mapping-details)。

    转换可以在任一方向覆盖配置的唤醒计时：对于唤醒操作返回 `mode: "now"` 或 `mode: "next-heartbeat"`，或者对于代理操作返回相应的 `wakeMode`。

    持久映射挂钩需要稳定的映射 `sessionKey` 或 `hooks.defaultSessionKey`。模板派生密钥需要与请求密钥相同的调用者密钥选择加入和前缀策略。

    `forEach: "<key>"` 在顶级有效负载阵列上扇出。每一项都会看到一个单元素数组，因此 Gmail 预设的 `messages[0]` 表示当前电子邮件。 Agent扇出接纳应答最多约8秒的调度等待；待处理项目继续在后台运行，并且部分批次返回非 2xx。重试同一批次会重用待处理或已接受的代理项，同时有限的内存中重播缓存会保留它们。它不耐久的一次性交付；映射的唤醒操作没有重播标识，并且队列可以合并重复的唤醒。该参考涵盖批次上限和响应形状。

  </Accordion>
</AccordionGroup>

### <a id="verify-and-troubleshoot-hook-requests"></a> 验证挂钩请求并排除故障

| 观察                | 检查或下一步行动                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`                      | 检查钩子令牌，而不是网关身份验证；检查代理是否转发 auth 标头。                                                                                                  |
| `404`                      | 检查`hooks.enabled`、`hooks.path`以及自定义路径是否与映射匹配。                                                                                                     |
| `400`                      | 读取响应错误：JSON，代理选择、会话策略或传递坐标可能无效。重试之前更正请求。                                            |
| `405`, `408`, or `413`     | 使用`POST`；及时寄送遗体；保持在记录的身体限制范围内。                                                                                                              |
| `429`                      | 重复的身份验证失败受到限制。更正令牌并兑现 `Retry-After`。                                                                                             |
| `409`                      | 在重试之前解决目标会话冲突。                                                                                                                                    |
| `502` or `503`             | 检查网关日志以了解准备情况、容量或 restart/suspension 故障。单次运行准入超时取消排队工作；扇出待处理的工作仍然可以开始。                   |
| `200`，但没有聊天消息 | 首先检查完成日志。 `deliver: false` 故意压制成功公告；直接交付需要 `channel` 和 `to`。 HTTP 入场并不证明交货。 |
| `204`                      | 该映射有意不产生任何操作，例如 `null` 变换或空扇出数组。                                                                                    |

对于启用交付的请求，还需验证预期渠道、帐户和收件人的收据。检查 `deliveryError` 的终端警告，包括 `status=ok` 时的终端警告。 `delivered: false`单独并不能证明失败，`deliveryAttempted: true`不能证明收货。显式抑制和消息工具投递已经可以满足跑者的投递处理；丢失的交付标志仍然未知。

对于重试的代理请求，请重复使用 `Idempotency-Key` 和相同的负载。 [参考](/gateway/config-hooks#hook-retries-and-fan-out)解释了它的范围和寿命。使用新密钥进行新测试；重播的 `200` 不会再次运行代理。

<Warning>
将端点置于环回、尾网或受信任的反向代理后面。使用 HTTPS 进行远程调用并仅公开所需的路径。

- 使用专用的hook token和专用的子路径； `/` 被拒绝。
- 限制`hooks.allowedAgentIds`，包括有效的默认代理路径。
- 除非需要，否则保留`hooks.allowRequestSessionKey: false`；启用后，约束 `hooks.allowedSessionKeyPrefixes`。
- 将外部事件内容视为数据。默认情况下，代理挂钩内容是安全包装的，但包装不会删除工具或工作区访问权限。对不受信任的输入使用受限代理，并禁用不安全内容覆盖。

</Warning>
