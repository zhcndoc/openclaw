---
summary: "由 Gateway 驱动的 `openclaw agent` 回合，以及隔离的 `agent exec` 运行的 CLI 参考"
read_when:
  - 你想从脚本中运行一次 agent 回合（可选择发送回复）
  - 你需要为 CI 执行严格的一次性临时 agent 运行
title: "Agent"
---

# `openclaw agent`

通过 Gateway 运行一次 agent 回合。显式指定 `--local` 标志是唯一的内嵌执行路径。

至少传入一个会话选择器：`--to`、`--session-key`、`--session-id` 或 `--agent`。

相关内容：[Agent 发送工具](/tools/agent-send)。

## `agent exec`

`openclaw agent exec` 运行一次嵌入式 agent 回合，无需连接 Gateway。它是 CI 和编码自动化推荐的无头入口，因为它负责设置、清理、输出投影以及进程状态。

```bash
openclaw agent exec "运行聚焦测试并修复失败"
openclaw agent exec --message-file task.md --cwd ./repo
cat task.md | openclaw agent exec --message-file - --json
```

默认情况下，该命令会创建临时状态目录，并在稍后将其移除；它会使用普通的 OpenClaw 配置运行，因此已配置的提供商、凭据和 `agentRuntime` harness 选择方式与其他地方完全一致。`--cwd` 默认为进程工作目录，并同时作为 agent 工作区和工具工作目录传入。

配置分三部分分层，且完全在内存中处理：exec 会组合运行配置，并将其作为当前进程的运行时配置发布，而不是将副本写入磁盘。只有在配置未设置某项时，exec 默认值才会生效：跳过工作区引导文件、关闭 agent 沙箱、选择 `coding` 工具配置、将文件系统工具限制在 `--cwd` 范围内，并在无头回合所需的完整执行策略下运行。配置中设置的任何内容都会覆盖这些默认值，因此已配置的沙箱、shell 环境或工具配置不会被降级；当配置启用沙箱时，exec 的主机路由仍由沙箱负责。调用本身始终拥有最后决定权：运行范围限定为 `--cwd`，且永远不会执行引导。

使用 `--state-dir <dir>` 保留会话和其他运行状态。该目录必须已经存在，且命令绝不会创建或删除它。保留的状态目录要求独占所有权：当 Gateway 或其他嵌入式写入器拥有该目录时，exec 会拒绝启动，然后在整个运行期间持有状态锁。省略 `--state-dir` 可使用隔离的临时状态，或者先使用 `openclaw gateway stop` 停止 Gateway。

当 exec 使用环境配置或固定配置时，已安装插件仍会从操作员普通的插件根目录解析；而会话及其他运行状态则使用临时目录。在这些模式下，`--state-dir` 仅控制运行状态；对于由已安装插件提供的已配置提供商、频道或 harness，不要求设置该参数。

如需可复现的运行，请固定配置，而不是继承环境配置。`--config <path>` 会严格使用指定配置文件运行，并通过常规加载器读取，因此 JSON5 语法和 `$include` 会相对于该文件解析；缺失或无效的文件会导致运行失败，而不会回退到默认值。如果环境配置存在但无法解析，也同样会导致运行失败。`--isolated` 会完全忽略环境配置，只使用上述 exec 默认值。在 CI 中，这两种方式都是正确选择，因为继承操作员状态会使运行结果依赖机器环境。

默认情况下会使用已存储的凭据，因此指定文件夹范围的运行可以访问与 CLI 其他部分相同的登录信息。传入 `--auth-env-only` 可将运行限制为进程环境中已有的提供商密钥。该模式完全不加载配置；如果同时使用 `--config`，则会被拒绝而不是静默忽略，因为配置可以通过多个入口同时提供提供商凭据：[内联密钥和机密标头](/reference/secretref-credential-surface)、`env` 块以及登录 shell 导入。它还会跳过 OpenClaw 身份验证配置文件，以及外部 Codex、Claude 或其他 CLI 凭据存储。提供商身份验证变量仍可用于模型身份验证，但不会传递给 agent 启动的主机命令。

使用可重复标志来选择主模型和有序回退链：

```bash
openclaw agent exec "实现这个变更" \
  --model openai/gpt-5.6-sol \
  --fallback anthropic/claude-sonnet-4-6 \
  --fallback google/gemini-3.1-pro-preview
```

仅对该命令而言，显式的 `--fallback` 值在显式 `--model` 存在时仍然保持生效。其他 agent 入口点仍沿用其既有规则：用户选择的模型会禁用已配置的回退。

比较本地模型或较小模型时，请显式选择一次性工具界面：

```bash
openclaw agent exec "Inspect this repository" \
  --model ollama/qwen3.5:9b \
  --code-mode code \
  --local-model-lean \
  --json
```

`--code-mode direct` 会禁用 Code Mode，`auto` 会使用模型能力元数据，而 `code` 会在支持工具的运行中强制使用通用 Code Mode 界面。`--local-model-lean` 会移除高延迟和依赖频道的工具，并为隔离运行启用有界 Tool Search 默认值。

`agent exec` 的超时时间默认为 600 秒；这不会改变现有嵌入式 `agent --local` 的默认值。成功运行以 `0` 退出，任何模型或结果错误以 `1` 退出，超时以 `2` 退出。失败包括 `meta.error`、中止的运行、耗尽所有模型回退、错误停止原因以及任何错误负载。

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
  "toolSummary": { "calls": 2, "tools": ["read", "write"], "totalToolTimeMs": 48 },
  "model": "gpt-5.6-sol",
  "provider": "openai",
  "sessionId": "019..."
}
```

`status` 为 `ok`、`error` 或 `timeout`。`usage` 在不可用时会被省略。失败的封装会增加 `error: { message, kind }`；当失败发生在模型选择之前时，`model` 和 `provider` 为 `null`。

运行统计字段是可累加的，并且可能缺失：

- `costUsd`: 根据运行累计使用量估算的美元成本，包括缓存读取／写入定价；模型没有成本数据时省略。
- `codeModeEngaged`: 仅当 [code mode](/tools/code-mode) 在本次运行中实际接管模型工具界面时才为 `true`。仅设置 `tools.codeMode.enabled=true` 并不能保证其启用；而由 harness 接管其原生工具界面的情况下，该值始终为 `false`，因为 OpenClaw code mode 不会接管这些工具。
- `assistantTurns`: 本次运行中已完成的 assistant／provider 往返次数；没有完成任何往返时省略。
- `bridgeCalls`: 内部工具搜索／Code Mode 桥接调用次数（`search`／`describe`／`call`）。这些调用对提供商不可见；外部工具调用会保留在完整运行元数据的 `meta.toolSummary.calls` 中。
- `toolSummary`: 嵌入式运行中外部模型可见的工具调用次数、工具名称、失败次数以及工具总耗时。

在 `openclaw agent --json` 响应中，agent 运行统计字段位于 `meta.agentMeta`；外部工具摘要仍位于 `meta.toolSummary`。

### Code Mode 模型矩阵

在源代码检出目录中，针对任意显式模型引用运行有界评估矩阵：

```bash
pnpm qa:code-mode-models -- --model ollama/qwen3.5:9b
```

重复使用 `--model` 可比较多个模型；也可以使用 `--mode`、`--task` 和 `--repetitions` 缩小默认的 direct／automatic／forced Code Mode 矩阵。每个单元都会运行一个隔离的 `agent exec` 任务，并记录模型／提供商身份、耗时、结果状态、失败类别、外部工具调用、Code Mode 桥接调用以及经过验证的输出／效果。

输出目录包含规范的 QA Lab `qa-evidence.json`。`summary.json` 和 `results.jsonl` 是用于支持汇总和逐单元结果的文件；`manifest.json` 记录请求的矩阵和源代码身份。

这些只是评估证据，不是 CI 或发布门禁。结果不会改变模型能力、运行时路由、回退机制或修复策略。

### `agent exec` 选项

- `[message]`: 位置参数形式的提示文本
- `--message-file <path>`: 从文件读取 UTF-8 提示；`-` 表示读取 stdin
- `--cwd <dir>`: 同时设置 agent 工作区和工具工作目录
- `--state-dir <dir>`: 使用现有状态目录，且不删除它
- `--config <path>`: 使用该配置文件而不是环境配置运行（支持 JSON5 和 `$include`）
- `--isolated`: 忽略环境配置，仅使用 exec 默认值
- `--model <provider/model>`: 显式指定主模型
- `--code-mode <mode>`: 选择 `direct`、`auto` 或强制使用 `code` 工具模式
- `--local-model-lean`: 使用精简的本地模型工具界面
- `--thinking <level>`: 本次运行的思考级别
- `--fallback <provider/model>`: 有序回退模型；可重复使用，且要求同时指定 `--model`
- `--auth-env-only`: 仅使用环境中的提供商密钥；跳过已存储凭据、外部 CLI 凭据以及配置
- `--no-auth-env-only`: 允许使用已存储凭据和外部 CLI 凭据（默认）
- `--timeout <seconds>`: 以秒为单位的截止时间（默认 `600`；`0` 表示禁用）
- `--json`: 输出稳定的 JSON 封装。

## 选项

- `-m, --message <text>`：消息正文
- `--message-file <path>`：从 UTF-8 文件中读取消息正文
- `-t, --to <dest>`：用于推导会话密钥的收件人
- `--session-key <key>`：用于路由的显式会话密钥
- `--session-id <id>`：显式会话 ID
- `--agent <id>`：代理 ID；覆盖路由绑定
- `--model <id>`：本次运行的模型覆盖项（`provider/model` 或模型 ID）
- `--thinking <level>`：代理思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供方支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：为该会话持久化详细日志级别
- `--channel <channel>`：传递通道；省略则使用主会话通道
- `--reply-to <target>`：传递目标覆盖项
- `--reply-channel <channel>`：传递通道覆盖项
- `--reply-account <id>`：传递账户覆盖项
- `--local`：直接运行嵌入式代理（在插件注册表预加载之后）
- `--deliver`：将回复发送回所选通道/目标
- `--timeout <seconds>`：覆盖此命令的代理轮次截止时间（默认 600 秒，或 `agents.defaults.timeoutSeconds`）；`0` 会禁用整体截止时间。600 秒的回退值属于此 CLI 命令，而不属于普通 Gateway 轮次，后者的默认值为 48 小时。
- `--json`：输出 JSON。

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

- 必须在 `--message` 和 `--message-file` 中恰好选择一个。`--message-file` 会去除开头的 UTF-8 BOM 并保留多行内容；对于不是有效 UTF-8 的文件会拒绝处理。大于 4 MiB 的文件会在分发前被拒绝。
- 斜杠命令（例如 `/compact`）不能通过 `--message` 运行。CLI 会拒绝执行，并指引你使用对应的一级命令（用于压缩的命令为 `openclaw sessions compact <key>`）。
- `--local` 运行是一次性的：为本次运行打开的捆绑 MCP 回环资源和 Claude stdio 热会话会在回复后被回收，因此脚本化调用不会遗留正在运行的本地子进程。由 Gateway 支持的运行则会将 Gateway 所有的 MCP 回环资源保留在运行中的 Gateway 进程内。
- `--local` 要求对配置的状态目录拥有独占所有权。当 Gateway 或其他 `agent --local` 运行拥有该目录时，它会拒绝启动，并在整个嵌入式回合期间持有相同的状态锁。不使用 `--local` 以使用活动中的 Gateway，或先使用 `openclaw gateway stop` 停止它。
- 使用 `--local` 进行独立嵌入式执行时，如果重启恢复处于待处理状态，则拒绝复用现有主会话。请通过运行正常的 Gateway 执行该回合，或在 Gateway 中使用 `/new` 或 `/reset` 重置；独立的嵌入式进程无法与 Gateway 扫描器安全地协调恢复所有者。
- 同时使用 `--agent`、`--channel` 和 `--to` 时，会话路由遵循通道的规范接收者和 `session.dmScope`。具有稳定的仅出站接收者身份的通道会使用由提供商所有、且与代理主会话隔离的会话。`--reply-channel` 和 `--reply-account` 只影响消息投递。
- `--session-key` 用于选择显式会话键。代理前缀形式的键必须使用 `agent:<agent-id>:<session-key>`，并且在同时提供 `--agent` 时，`--agent` 必须与键中的代理 ID 匹配。不带前缀且不是哨兵值的键，在提供 `--agent` 时归属于该代理，否则归属于配置的默认代理；例如，`--agent ops --session-key incident-42` 会路由到 `agent:ops:incident-42`。字面键 `global` 和 `unknown` 仅在未提供 `--agent` 时保持无作用域。
- `--json` 会将 stdout 专用于 JSON 响应；Gateway、插件和 `--local` 的诊断信息会输出到 stderr，以便脚本直接解析 stdout。
- 瞬时握手重试耗尽后，Gateway 超时或连接关闭会导致命令失败；CLI 绝不会静默地重新以内嵌方式运行该回合。传输中断状态不明确——Gateway 可能已经接受请求，也可能仍会完成该回合——因此 stderr 提示会建议检查 `openclaw gateway status` 和会话记录，然后再重试或使用 `--local` 重新运行，以避免执行该回合两次。
- `SIGTERM`/`SIGINT` 会中断等待中的 Gateway 支持请求；如果 Gateway 已接受运行，CLI 还会在退出前为该运行 ID 发送 `chat.abort`。`--local` 运行会收到相同信号，但不会发送 `chat.abort`。如果启动器子进程因首次转发的 `SIGINT` 或 `SIGTERM` 而终止，则分别以状态码 130 或 143 退出。如果内部运行去重键已针对该会话存在活动运行，则响应会报告 `status: "in_flight"`，非 JSON CLI 会输出 stderr 诊断信息，而不是空回复。对于外部 cron/systemd 包装器，请保留一个强制终止兜底机制，例如 `timeout -k 60 600 openclaw agent ...`，这样当关闭流程无法排空时，监管程序仍能回收该进程。
- 当此命令触发 `models.json` 重新生成时，由 SecretRef 管理的提供商凭据会以非秘密标记的形式持久化（例如环境变量名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），绝不会保存解析后的明文密钥。标记写入来自活动源配置快照，而不是解析后的运行时密钥值。

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
