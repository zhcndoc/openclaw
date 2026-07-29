---
summary: "Gateway 驱动的 `openclaw agent` 回合以及隔离的 `agent exec` 运行的 CLI 参考"
read_when:
  - 你想从脚本中运行一次 agent 回合（可选地发送回复）
  - 你需要为 CI 进行严格、一次性的临时 agent 运行
title: "Agent"
---

# `openclaw agent`

通过 Gateway 运行一次 agent 回合。显式的 `--local` 标志是唯一的内嵌执行路径。

至少传入一个会话选择器：`--to`、`--session-key`、`--session-id` 或 `--agent`。

相关内容：[Agent send tool](/tools/agent-send)

## `agent exec`

`openclaw agent exec` 运行一次嵌入式 agent 回合，无需连接 Gateway。它是 CI 和编码自动化推荐的无头入口，因为它负责设置、清理、输出投影以及进程状态。

```bash
openclaw agent exec "运行聚焦测试并修复失败"
openclaw agent exec --message-file task.md --cwd ./repo
cat task.md | openclaw agent exec --message-file - --json
```

默认情况下，该命令会创建一个临时状态目录，并在之后将其移除。其隐式配置会跳过工作区引导文件，禁用 agent 沙盒，选择 `coding` 工具配置文件，将文件系统工具限制为 `--cwd`，并为嵌入式本地工具运行时启用完整的 Gateway 主机执行策略。`--cwd` 默认为进程工作目录，并同时作为 agent 工作区和工具工作目录传入。

使用 `--state-dir <dir>` 可保留会话和其他运行状态。该目录必须已存在，并且不会被命令创建或删除。该命令仍然使用其隔离的隐式策略配置；它不会读取该目录中的普通 OpenClaw 配置。

`--auth-env-only` 默认启用。在此模式下，运行可以使用进程环境中已存在的提供商密钥，但不会加载 OpenClaw 认证配置文件，也不会加载外部 Codex、Claude 或其他 CLI 凭据存储。提供商认证变量仍可用于模型认证，但不会传递给 agent 启动的主机命令。仅当运行有意依赖这些已存储凭据时，才使用 `--no-auth-env-only`。

使用可重复标志来选择主模型和有序回退链：

```bash
openclaw agent exec "实现这个变更" \
  --model openai/gpt-5.6-sol \
  --fallback anthropic/claude-sonnet-4-6 \
  --fallback google/gemini-3.1-pro-preview
```

仅对该命令而言，显式的 `--fallback` 值在显式 `--model` 存在时仍然保持生效。其他 agent 入口点仍沿用其既有规则：用户选择的模型会禁用已配置的回退。

`agent exec` 的超时默认是 600 秒；这不会改变现有嵌入式 `agent --local` 的默认值。成功运行退出码为 `0`，任何模型或结果错误退出码为 `1`，超时退出码为 `2`。失败包括 `meta.error`、中止的运行、耗尽模型回退、错误停止原因以及任何错误负载。

普通输出只会将最终 assistant 文本写入 stdout。诊断信息使用 stderr。`--json` 会为 stdout 预留以下稳定封装：

```json
{
  "ok": true,
  "status": "ok",
  "final": "聚焦测试通过。",
  "payloads": [{ "text": "聚焦测试通过。" }],
  "usage": { "input": 120, "output": 8, "total": 128 },
  "costUsd": 0.0021,
  "codeModeEngaged": false,
  "assistantTurns": 2,
  "bridgeCalls": { "search": 1, "describe": 0, "call": 3 },
  "model": "gpt-5.6-sol",
  "provider": "openai",
  "sessionId": "019..."
}
```

`status` 为 `ok`、`error` 或 `timeout`。`usage` 在不可用时会被省略。失败的封装会增加 `error: { message, kind }`；当失败发生在模型选择之前时，`model` 和 `provider` 为 `null`。

运行统计字段是可累加的，并且可能缺失：

- `costUsd`：运行累计用量的预估 USD 成本，包括缓存读/写定价；当模型没有成本数据时省略。
- `codeModeEngaged`：仅当 [code mode](/tools/code-mode) 实际接管了该运行的模型工具面时才为 `true`；仅设置 `tools.codeMode.enabled=true` 并不能保证接管；通过原生 harness 面运行的模型可能会使其保持 `false`。
- `assistantTurns`：运行中已完成的 assistant/provider 往返次数；若无完成项则省略。
- `bridgeCalls`：内部工具搜索/code-mode bridge 调用计数（`search`/`describe`/`call`）。这些对提供商不可见；外层工具调用保留在完整运行元数据的 `meta.toolSummary.calls` 中。

相同字段也会出现在 `openclaw agent --json` 响应的 `meta.agentMeta` 中。

### `agent exec` 选项

- `[message]`：位置参数提示文本
- `--message-file <path>`：从文件读取 UTF-8 提示；`-` 表示读取 stdin
- `--cwd <dir>`：同时设置 agent 工作区和工具工作目录
- `--state-dir <dir>`：使用已有状态目录而不删除它
- `--model <provider/model>`：显式主模型
- `--thinking <level>`：单次运行的思考级别
- `--fallback <provider/model>`：有序回退模型；可重复且需要 `--model`
- `--auth-env-only`：忽略已存储和外部 CLI 凭据（默认）
- `--no-auth-env-only`：允许已存储和外部 CLI 凭据
- `--timeout <seconds>`：秒级截止时间（默认 `600`；`0` 表示禁用）
- `--json`：输出稳定的 JSON 封装

## 选项

- `-m, --message <text>`: 消息正文
- `--message-file <path>`: 从 UTF-8 文件中读取消息正文
- `-t, --to <dest>`: 用于推导会话密钥的收件人
- `--session-key <key>`: 用于路由的显式会话密钥
- `--session-id <id>`: 显式会话 ID
- `--agent <id>`: 代理 ID；覆盖路由绑定
- `--model <id>`: 本次运行的模型覆盖项（`provider/model` 或模型 ID）
- `--thinking <level>`: 代理思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供方支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`: 为该会话持久化详细日志级别
- `--channel <channel>`: 传递通道；省略则使用主会话通道
- `--reply-to <target>`: 传递目标覆盖项
- `--reply-channel <channel>`: 传递通道覆盖项
- `--reply-account <id>`: 传递账户覆盖项
- `--local`: 直接运行嵌入式代理（在插件注册表预加载之后）
- `--deliver`: 将回复发送回所选通道/目标
- `--timeout <seconds>`: 覆盖此命令的代理轮次截止时间（默认 600 秒，或 `agents.defaults.timeoutSeconds`）；`0` 会禁用整体截止时间。600 秒的回退值属于此 CLI 命令，而不属于普通 Gateway 轮次，后者的默认值为 48 小时。
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

- `--message` 和 `--message-file` 必须且仅能使用一个。`--message-file` 会去除开头的 UTF-8 BOM，并保留多行内容；它会拒绝不是有效 UTF-8 的文件。大于 4 MiB 的文件会在分发前被拒绝。
- Slash 命令（例如 `/compact`）不能通过 `--message` 运行。CLI 会拒绝它们，并指向对应的一级命令（压缩使用 `openclaw sessions compact <key>`）。
- `--local` 运行是一次性的：为本次运行打包的 MCP loopback 资源，以及启动时预热的 Claude stdio 会话，会在回复后被回收，因此脚本化调用不会留下本地子进程继续运行。由 Gateway 支持的运行则会将 Gateway 拥有的 MCP loopback 资源保留在正在运行的 Gateway 进程中。
- 使用 `--local` 的独立嵌入式执行在恢复重启时，如果已有主会话存在，则拒绝复用该会话。请通过健康的 Gateway 运行该轮次，或在那里使用 `/new` 或 `/reset` 重置；独立的嵌入式进程无法安全地与 Gateway 扫描器协调该恢复所有者。
- 当 `--agent`、`--channel` 和 `--to` 一起使用时，会话路由遵循 channel 的规范收件人与 `session.dmScope`。具有稳定的仅出站收件人身份的 channel 会使用由 provider 拥有的会话，与 agent 的主会话隔离。`--reply-channel` 和 `--reply-account` 仅影响投递。
- `--session-key` 用于选择显式会话键。以 agent 为前缀的键必须使用 `agent:<agent-id>:<session-key>` 形式，并且当同时提供 `--agent` 时，`--agent` 必须与该键的 agent id 匹配。不带哨兵的裸键在提供 `--agent` 时会限定到 `--agent`，否则限定到配置的默认 agent；例如 `--agent ops --session-key incident-42` 会路由到 `agent:ops:incident-42`。字面键 `global` 和 `unknown` 只有在未提供 `--agent` 时才保持不限定作用域。
- `--json` 会为 JSON 响应保留 stdout；Gateway、插件以及 `--local` 的诊断信息会输出到 stderr，因此脚本可以直接解析 stdout。
- 在瞬时握手重试耗尽后，Gateway 超时或连接关闭都会使命令失败；CLI 绝不会静默地以内嵌方式重新运行该轮次。传输丢失的情况是模糊的——Gateway 可能已经接受并且仍可能完成该轮次——因此 stderr 提示会建议你先检查 `openclaw gateway status` 和会话转录，再重试或使用 `--local` 重新运行，以避免重复执行该轮次。
- `SIGTERM`/`SIGINT` 会中断正在等待的、由 Gateway 支持的请求；如果 Gateway 已经接受了该运行，CLI 还会在退出前针对该 run id 发送 `chat.abort`。`--local` 运行会接收相同的信号，但不会发送 `chat.abort`。如果启动器子进程因首次转发的 `SIGINT` 或 `SIGTERM` 终止，则分别以状态码 130 或 143 退出。如果内部运行去重键已经在该会话中有一个活动运行，响应会报告 `status: "in_flight"`，而非 JSON 的 CLI 会输出 stderr 诊断信息，而不是空回复。对于外部 cron/systemd 包装器，请保留一个强制终止的后备机制，例如 `timeout -k 60 600 openclaw agent ...`，以便在关闭无法排空时，监督器能够回收该进程。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的 provider 凭据会以非秘密标记形式持久化（例如环境变量名、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），绝不会解析为秘密明文。标记写入来自当前活动的源配置快照，而不是来自已解析的运行时秘密值。

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
