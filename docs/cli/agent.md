---
summary: "openclaw 代理的 CLI 参考（通过 Gateway 发送一次 agent turn）"
read_when:
  - 你想从脚本中运行一次 agent turn（可选地发送回复）
title: "代理"
---

# `openclaw agent`

通过 Gateway 运行一次 agent turn。如果 Gateway 请求失败，则回退到内置 agent；可传入 `--local` 以强制优先使用内置执行。

至少传入一个会话选择器：`--to`、`--session-key`、`--session-id` 或 `--agent`。

相关内容：[Agent send tool](/tools/agent-send)

## 选项

- `-m, --message <text>`: 消息正文
- `--message-file <path>`: 从 UTF-8 文件读取消息正文
- `-t, --to <dest>`: 用于推导会话密钥的收件人
- `--session-key <key>`: 用于路由的显式会话密钥
- `--session-id <id>`: 显式会话 ID
- `--agent <id>`: 代理 ID；覆盖路由绑定
- `--model <id>`: 本次运行的模型覆盖（`provider/model` 或模型 ID）
- `--thinking <level>`: 代理思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供方支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`: 为会话持久化详细输出级别
- `--channel <channel>`: 传递通道；省略则使用主会话通道
- `--reply-to <target>`: 传递目标覆盖
- `--reply-channel <channel>`: 传递通道覆盖
- `--reply-account <id>`: 传递账户覆盖
- `--local`: 直接运行内置代理（在插件注册表预加载之后）
- `--deliver`: 将回复发送回所选通道/目标
- `--timeout <seconds>`: 覆盖代理超时时间（默认 600，或 `agents.defaults.timeoutSeconds`）；`0` 表示禁用超时
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

- 准确传入 `--message` 或 `--message-file` 其中之一。`--message-file` 会去除开头的 UTF-8 BOM，并保留多行内容；它会拒绝不是有效 UTF-8 的文件。
- 斜杠命令（例如 `/compact`）不能通过 `--message` 运行。CLI 会拒绝它们，并引导你使用对应的一等命令（压缩使用 `openclaw sessions compact <key>`）。
- `--local` 和内嵌回退运行都是一次性的：为本次运行打开的捆绑 MCP 回环资源和预热的 Claude stdio 会话，会在回复后被回收，因此脚本化调用不会留下本地子进程在运行。由 Gateway 支持的运行则会把 Gateway 拥有的 MCP 回环资源保留在正在运行的 Gateway 进程中。
- 当 `--agent`、`--channel` 和 `--to` 一起使用时，会话路由遵循频道的规范收件人和 `session.dmScope`。具有稳定的仅出站收件人身份的频道会使用由提供方拥有的会话，并与代理的主会话隔离。`--reply-channel` 和 `--reply-account` 只影响投递。
- `--session-key` 用于选择显式会话键。以 agent 为前缀的键必须使用 `agent:<agent-id>:<session-key>`，并且当同时提供 `--agent` 时，它必须与键中的 agent id 一致。裸的非 sentinel 键在提供 `--agent` 时会限定到 `--agent`，否则限定到配置的默认 agent；例如 `--agent ops --session-key incident-42` 会路由到 `agent:ops:incident-42`。字面键 `global` 和 `unknown` 只有在未提供 `--agent` 时才保持不限定。
- `--json` 会为 JSON 响应保留 stdout；Gateway、插件以及内嵌回退诊断信息会输出到 stderr，因此脚本可以直接解析 stdout。
- 内嵌回退的 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本能够检测到回退运行。
- 如果 Gateway 接受了运行，但 CLI 在等待最终回复时超时，内嵌回退会使用一个新的 `gateway-fallback-*` 会话/运行 id，并报告 `meta.fallbackReason: "gateway_timeout"` 以及回退会话字段，而不是与 Gateway 拥有的转录记录竞争，或静默替换原始会话。
- `SIGTERM`/`SIGINT` 会中断正在等待的 Gateway 支持请求；如果 Gateway 已经接受了该运行，CLI 在退出前还会针对该运行 id 发送 `chat.abort`。`--local` 和内嵌回退运行会接收相同信号，但不会发送 `chat.abort`。如果内部运行去重键已经存在一个该会话的活动运行，响应会报告 `status: "in_flight"`，而非 JSON 的 CLI 会打印 stderr 诊断信息，而不是空回复。对于外部 cron/systemd 包装器，请保留一个硬终止兜底，例如 `timeout -k 60 600 openclaw agent ...`，这样如果无法正常关闭，监督程序仍可回收该进程。
- 当此命令触发 `models.json` 重新生成时，由 SecretRef 管理的提供方凭据会以非密文标记的形式持久化（例如 env var 名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），绝不会解析为秘密明文。标记写入来自当前活动的源配置快照，而不是来自已解析的运行时密钥值。

## JSON 投递状态

使用 `--json --deliver` 时，CLI 的 JSON 响应会包含顶层 `deliveryStatus`，这样脚本就可以区分已投递、已抑制、部分失败和失败的发送：

```json
{
  "payloads": [{ "text": "报告已准备好", "mediaUrl": null }],
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

由 Gateway 支持的 CLI 响应还会在 `result.deliveryStatus` 中保留原始的 Gateway 结果结构。

`deliveryStatus.status` 的取值之一是：

| 状态             | 含义                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `sent`           | 投递完成。                                                                                                                                   |
| `suppressed`     | 投递被有意不发送（例如消息发送 hook 取消了它，或者没有可见结果）。终态，不会重试。                                                            |
| `partial_failed` | 至少有一个 payload 已发送，但后续某个 payload 失败了。                                                                                         |
| `failed`         | 没有完成任何持久化发送，或者投递预检失败。                                                                                                     |

常见字段：

- `requested`：当该对象存在时始终为 `true`。
- `attempted`：一旦持久化发送路径运行则为 `true`；对于预检失败或没有可见 payload 的情况为 `false`。
- `succeeded`：`true`、`false` 或 `"partial"`；`"partial"` 与 `status: "partial_failed"` 配对。
- `reason`：来自持久化投递或预检校验的、小写蛇形命名原因。已知值包括 `cancelled_by_message_sending_hook`、`no_visible_payload`、`no_visible_result`、`channel_resolved_to_internal`、`unknown_channel`、`invalid_delivery_target` 和 `no_delivery_target`；失败的持久化发送也可能报告失败阶段。由于集合可能扩展，请将未知值视为不透明值。
- `resultCount`：可用时，通道发送结果的数量。
- `sentBeforeError`：当部分失败在出错前至少发送了一个 payload 时为 `true`。
- `error`：对于失败或部分失败的发送为 `true`。
- `errorMessage`：仅在捕获到底层投递错误消息时存在。预检失败会带有 `error`/`reason`，但没有 `errorMessage`。
- `payloadOutcomes`：可选的逐 payload 结果，包含 `index`、`status`、`reason`、`resultCount`、`error`、`stage`、`sentBeforeError`，或者在可用时包含 hook 元数据。

## 相关

- [CLI 参考](/cli)
- [Agent 运行时](/concepts/agent)
