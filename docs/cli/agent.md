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

- `-m, --message <text>`: 消息正文
- `--message-file <path>`: 从 UTF-8 文件中读取消息正文
- `-t, --to <dest>`: 用于派生会话键的收件人
- `--session-key <key>`: 明确指定要用于路由的会话键
- `--session-id <id>`: 明确指定会话 ID
- `--agent <id>`: agent ID；覆盖路由绑定
- `--model <id>`: 本次运行的模型覆盖项（`provider/model` 或模型 ID）
- `--thinking <level>`: agent 思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供方支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`: 为会话持久化详细级别
- `--channel <channel>`: 投递通道；省略则使用主会话通道
- `--reply-to <target>`: 投递目标覆盖项
- `--reply-channel <channel>`: 投递通道覆盖项
- `--reply-account <id>`: 投递账户覆盖项
- `--local`: 直接在本地运行嵌入式 agent（在插件注册表预加载之后）
- `--deliver`: 将回复发送回选定的通道/目标
- `--timeout <seconds>`: 覆盖 agent 超时时间（默认 600 或配置值）
- `--json`: 输出 JSON

## 示例

```bash
openclaw agent --to +15555550123 --message "状态更新" --deliver
openclaw agent --agent ops --message "总结日志"
openclaw agent --agent ops --message-file ./task.md
openclaw agent --agent ops --model openai/gpt-5.4 --message "总结日志"
openclaw agent --session-key agent:ops:incident-42 --message "总结状态"
openclaw agent --agent ops --session-key incident-42 --message "总结状态"
openclaw agent --session-id 1234 --message "总结收件箱" --thinking medium
openclaw agent --to +15555550123 --message "追踪日志" --verbose on --json
openclaw agent --agent ops --message "生成报告" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "在本地运行" --local
```

## 说明

- `--message` 和 `--message-file` 必须且只能传入一个。`--message-file` 会在移除可选的 UTF-8 BOM 后保留多行文件内容，并拒绝不是有效 UTF-8 的文件。
- 当 Gateway 请求失败时，Gateway 模式会回退到嵌入式 agent。使用 `--local` 可在一开始就强制执行嵌入式运行。
- `--local` 仍会先预加载插件注册表，因此由插件提供的 provider、工具和通道在嵌入式运行期间依然可用。
- `--local` 和嵌入式回退运行都被视为一次性运行。为该本地进程打开的捆绑 MCP loopback 资源和预热的 Claude stdio 会话会在回复后释放，因此脚本化调用不会让本地子进程一直存活。
- 基于 Gateway 的运行会将 Gateway 所拥有的 MCP loopback 资源保留在正在运行的 Gateway 进程中；旧客户端可能仍会发送历史清理标志，但 Gateway 会将其作为兼容性空操作接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复投递，而不是会话路由。
- `--session-key` 选择一个显式会话键。以 agent 为前缀的键必须使用 `agent:<agent-id>:<session-key>`，且当同时提供时，`--agent` 必须与该键的 agent id 匹配。普通的非哨兵键在提供 `--agent` 时会限定到 `--agent`，否则限定到已配置的默认 agent；例如，`--agent ops --session-key incident-42` 会路由到 `agent:ops:incident-42`。字面量 `global` 和 `unknown` 仅在未提供 `--agent` 时才保持不加作用域；在这种情况下，嵌入式回退和存储归属会使用已配置的默认 agent。
- `--json` 会将 stdout 保留给 JSON 响应。Gateway、插件和嵌入式回退诊断信息会输出到 stderr，因此脚本可以直接解析 stdout。
- 嵌入式回退的 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本区分回退运行和 Gateway 运行。
- 如果 Gateway 接受了 agent 运行，但 CLI 在等待最终回复时超时，嵌入式回退会使用一个新的显式 `gateway-fallback-*` session/run id，并报告 `meta.fallbackReason: "gateway_timeout"` 以及回退会话字段。这样可以避免与 Gateway 所拥有的 transcript 锁发生竞争，或无声地替换原始路由会话。
- 对于基于 Gateway 的运行，`SIGTERM` 和 `SIGINT` 会中断等待中的 CLI 请求。如果 Gateway 已经接受了该运行，CLI 还会在退出前为该已接受的 run id 发送 `chat.abort`。本地 `--local` 运行和嵌入式回退运行也会接收相同的中止信号，但不会发送 `chat.abort`。如果重复的 `--run-id` 在原始 agent 运行仍处于活动状态时到达 Gateway，重复响应会报告 `status: "in_flight"`，而非 JSON 的 CLI 会打印 stderr 诊断信息，而不是空回复。对于外部 cron/systemd 包装器，请保留一个外层的强制终止后备，例如 `timeout -k 60 600 openclaw agent ...`，以便在无法正常结束时，监督进程仍可回收该进程。
- 当该命令触发 `models.json` 重新生成时，SecretRef 管理的提供方凭据会以非秘密标记的形式持久化（例如环境变量名、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），而不是解析后的秘密明文。
- 标记写入以源配置为权威：OpenClaw 持久化的是来自活动源配置快照中的标记，而不是来自解析后的运行时秘密值。

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
