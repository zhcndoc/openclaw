---
summary: "openclaw 代理的 CLI 参考（通过 Gateway 发送一次 agent turn）"
read_when:
  - 你想从脚本中运行一次 agent turn（可选地发送回复）
title: "代理"
---

# `openclaw agent`

通过 Gateway 运行一次 agent turn（使用 `--local` 可直接在本地嵌入运行）。
使用 `--agent <id>` 可直接指定一个已配置的 agent。

至少传入一个会话选择器：

- `--to <dest>`
- `--session-key <key>`
- `--session-id <id>`
- `--agent <id>`

相关：

- Agent 发送工具：[Agent send](/tools/agent-send)

## 选项

- `-m, --message <text>`: 必填消息正文
- `-t, --to <dest>`: 用于派生 session key 的收件人
- `--session-key <key>`: 用于路由的显式 session key
- `--session-id <id>`: 显式 session id
- `--agent <id>`: agent id；会覆盖路由绑定
- `--model <id>`: 本次运行的模型覆盖项（`provider/model` 或 model id）
- `--thinking <level>`: agent 思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供方支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`: 为该会话持久化详细级别
- `--channel <channel>`: 投递通道；省略则使用主会话通道
- `--reply-to <target>`: 投递目标覆盖项
- `--reply-channel <channel>`: 投递通道覆盖项
- `--reply-account <id>`: 投递账号覆盖项
- `--local`: 直接运行嵌入式 agent（在插件注册表预加载之后）
- `--deliver`: 将回复发送回所选通道/目标
- `--timeout <seconds>`: 覆盖 agent 超时时间（默认 600 或配置值）
- `--json`: 输出 JSON

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 说明

- Gateway 模式在 Gateway 请求失败时会回退到嵌入式 agent。使用 `--local` 可以在一开始就强制使用嵌入式执行。
- `--local` 仍然会先预加载插件注册表，因此插件提供的 providers、tools 和 channels 在嵌入式运行期间仍然可用。
- `--local` 和嵌入式回退运行都被视为一次性运行。为该本地进程打开的打包 MCP loopback 资源和 warm Claude stdio 会话会在回复后回收，因此脚本化调用不会让本地子进程持续存活。
- 基于 Gateway 的运行会让由 Gateway 持有的 MCP loopback 资源留在运行中的 Gateway 进程中；旧客户端可能仍会发送历史清理标志，但 Gateway 会将其作为兼容性空操作接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响的是回复投递，而不是会话路由。
- `--session-key` 用于选择显式 session key。以 `agent:` 开头的 key 必须使用 `agent:<agent-id>:<session-key>` 格式，而且当同时提供 `--agent` 时，`--agent` 必须与 key 中的 agent id 一致。未带前缀的普通非哨兵 key 会在提供 `--agent` 时限定到该 `--agent`，否则限定到配置的默认 agent；例如，`--agent ops --session-key incident-42` 会路由到 `agent:ops:incident-42`。字面量 `global` 和 `unknown` 仅在未提供 `--agent` 时才保持不加作用域；在这种情况下，嵌入式回退和存储归属都会使用配置的默认 agent。
- `--json` 会让 stdout 专门用于 JSON 响应。Gateway、插件以及嵌入式回退的诊断信息会发送到 stderr，因此脚本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本区分回退运行与 Gateway 运行。
- 如果 Gateway 接受了某次 agent 运行，但 CLI 在等待最终回复时超时，嵌入式回退会使用新的显式 `gateway-fallback-*` session/run id，并报告 `meta.fallbackReason: "gateway_timeout"` 以及回退 session 字段。这样可以避免与 Gateway 持有的 transcript 锁发生竞争，或在无提示的情况下替换原始路由会话。
- 对于基于 Gateway 的运行，`SIGTERM` 和 `SIGINT` 会中断正在等待的 CLI 请求。如果 Gateway 已经接受了该运行，CLI 在退出前还会针对该已接受的 run id 发送 `chat.abort`。本地 `--local` 运行和嵌入式回退运行会接收相同的中止信号，但不会发送 `chat.abort`。如果重复的 `--run-id` 在原始 agent 运行仍处于活动状态时到达 Gateway，重复响应会报告 `status: "in_flight"`，而非 JSON 的 CLI 则会在 stderr 中输出诊断信息，而不是返回空回复。对于外部 cron/systemd 包装器，请保留一个外层硬终止后备，例如 `timeout -k 60 600 openclaw agent ...`，这样当关闭过程无法完成回收时，supervisor 仍然可以清理该进程。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的 provider 凭据会以非敏感标记的形式持久化（例如环境变量名、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），而不是已解析的明文密钥。
- 标记写入以源为准：OpenClaw 持久化的是来自当前源配置快照的标记，而不是来自已解析运行时密钥值的内容。

## JSON 投递状态

当使用 `--json --deliver` 时，CLI 的 JSON 响应可能会包含顶层 `deliveryStatus`，以便脚本区分已投递、已抑制、部分失败和失败的发送：

```json
{
  "payloads": [{ "text": "Report ready", "mediaUrl": null }],
  "meta": { "durationMs": 1200 },
  "deliveryStatus": {
    "requested": true,
    "attempted": true,
    "status": "sent",
    "succeeded": true,
    "resultCount": 1
  }
}
```

`deliveryStatus.status` 的可取值为 `sent`、`suppressed`、`partial_failed` 或 `failed`。`suppressed` 表示投递被有意不发送，例如消息发送钩子取消了它，或者没有可见结果；它仍然是一个最终的、无需重试的结果。`partial_failed` 表示至少有一个 payload 已发送，而后续某个 payload 发送失败。`failed` 表示没有完成持久化发送，或者投递预检失败。

基于 Gateway 的 CLI 响应也会保留原始 Gateway 结果结构，此时同一个对象可在 `result.deliveryStatus` 处获取。

常见字段：

- `requested`：只要对象存在，就始终为 `true`。
- `attempted`：在持久化发送路径运行后为 `true`；预检失败或没有可见 payload 时为 `false`。
- `succeeded`：`true`、`false` 或 `"partial"`；`"partial"` 与 `status: "partial_failed"` 配对。
- `reason`：来自持久化投递或预检验证的、采用小写蛇形命名的原因。已知原因包括 `cancelled_by_message_sending_hook`、`no_visible_payload`、`no_visible_result`、`channel_resolved_to_internal`、`unknown_channel`、`invalid_delivery_target` 和 `no_delivery_target`；失败的持久化发送也可能报告失败阶段。请将未知值视为不透明值，因为该集合可能会扩展。
- `resultCount`：可用时的通道发送结果数量。
- `sentBeforeError`：当部分失败在错误发生前至少发送了一个 payload 时为 `true`。
- `error`：对失败或部分失败发送而言为布尔值 `true`。
- `errorMessage`：仅在捕获到底层投递错误消息时包含。预检失败会携带 `error` 和 `reason`，但不会包含 `errorMessage`。
- `payloadOutcomes`：可选的逐 payload 结果，包含可用时的 `index`、`status`、`reason`、`resultCount`、`error`、`stage`、`sentBeforeError` 或 hook 元数据。

## 相关

- [CLI 参考](/cli)
- [Agent 运行时](/concepts/agent)
