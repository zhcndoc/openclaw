---
summary: "文件日志、控制台输出、CLI 跟随以及 Control UI 的 Logs 选项卡"
read_when:
  - "你需要了解 OpenClaw 日志的适合初学者的概览"
  - "你想配置日志级别、格式或脱敏"
  - "你正在排查问题并需要快速找到日志"
title: "日志"
---

OpenClaw 有两个主要的日志展示界面：

- **文件日志**（JSON 行）由 Gateway 写入。
- **终端中的控制台输出**，即运行 Gateway 的终端。

Control UI 的 **Logs** 选项卡会跟随 gateway 文件日志。本页解释日志存放位置、 如何阅读，以及如何配置日志级别和格式。

## <a id="where-logs-live"></a> 日志存放位置

默认情况下，网关每天写入一个滚动日志文件。默认配置文件保留历史路径：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

命名配置文件在同一目录中使用配置文件限定的文件名：

`/tmp/openclaw/openclaw-<profile>-YYYY-MM-DD.log`

文件名配置文件段是小写的，并且仅限于字母、数字和破折号。简单的小写名称保持可读性，因此 `--dev` 简写为 `openclaw-dev-YYYY-MM-DD.log`。大小写、下划线和文字破折号使用可逆的破折号转义，因此不同的配置文件名称永远不会共享日志文件。直接通过环境设置的超大值使用有界哈希后缀来保持在文件系统文件名限制内。显式的 `logging.file` 会覆盖这些默认值。

该日期使用网关主机的本地时区。当 `/tmp/openclaw` 不安全或不可用（并且始终位于 Windows 上）时，OpenClaw 使用 OS 临时目录下的用户范围的 `openclaw-<uid>` 目录。过时的日志文件将在 24 小时后删除。

当下一次写入超过 `logging.maxFileBytes`（默认值：100 MB）时，每个文件都会轮换。 OpenClaw 在活动文件旁边最多保留五个编号的存档，例如 `openclaw-YYYY-MM-DD.1.log` 或 `openclaw-dev-YYYY-MM-DD.1.log`，并继续写入新的活动日志而不是抑制诊断。

你可以在 `~/.openclaw/openclaw.json` 中覆盖该路径：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## <a id="how-to-read-logs"></a> 如何读取日志

### <a id="cli%3A-live-tail-(recommended)"></a><a id="cli-live-tail-recommended"></a> CLI：实时跟随（推荐）

通过 RPC 跟随网关日志文件：

```bash
openclaw logs --follow
openclaw --dev logs --follow
openclaw --profile work logs --follow
```

根配置文件选择器解析网关使用的相同配置文件特定文件，包括本地 RPC 不可用时的 CLI 回退读取。

选项：

| 标志                | 默认值  | 行为                                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------------------- |
| `--follow`          | 关闭      | 持续跟随；断开连接时会以退避方式重新连接                                   |
| `--limit <n>`       | `200`    | 每次获取的最大行数                                                                   |
| `--max-bytes <n>`   | `250000` | 每次读取的最大字节数                                                           |
| `--interval <ms>`   | `1000`   | 跟随时的轮询间隔                                                         |
| `--json`            | 关闭      | 按行分隔的 JSON（每行一个事件）                                              |
| `--plain`           | 关闭      | 在 TTY 会话中强制使用纯文本                                                      |
| `--no-color`        | —        | 禁用 ANSI 颜色                                                                   |
| `--utc`             | 关闭      | Render 中的 UTC 时间戳（默认为本地时间）                                      |
| `--local-time`      | 关闭      | 为本地时间默认值保留的兼容写法；除此之外无效果       |
| `--url` / `--token` | —        | 标准 Gateway RPC 标志                                                            |
| `--timeout <ms>`    | `30000`  | Gateway RPC 超时时间                                                                   |
| `--expect-final`    | 关闭      | 由 Agent 支持的 RPC 最终响应等待标志（此处通过共享客户端层接受） |

输出模式：

- **TTY 会话**：美化、带颜色、结构化的日志行。
- **非 TTY 会话**：纯文本。

当你显式传入 `--url` 时，CLI 不会自动应用配置或环境凭据；请自行添加 `--token`，否则调用会失败，并提示 `gateway url override requires explicit credentials`。

在 JSON 模式下，CLI 发出 `type`- 标记对象：

- `meta`：流元数据（文件、来源、来源类型、服务、游标、大小）
- `log`：已解析的日志条目
- `notice`：截断 / 轮转提示
- `raw`：未解析的日志行
- `error`：Gateway 连接失败（写入 stderr）

如果隐式的本地回环 Gateway 请求配对、在连接期间关闭， 或在 `logs.tail` 响应前超时，`openclaw logs` 会自动回退到已配置的 Gateway 文件日志。显式的 `--url` 目标不会使用此回退。`openclaw logs --follow` 更严格：在 Linux 上，它会在可用时通过 PID 使用当前 user-systemd Gateway 日志；否则会以退避方式重试实时 Gateway， 而不是跟随一个可能已过时的并行文件。

如果 Gateway 不可达，CLI 会打印一条简短提示，建议运行：

```bash
openclaw doctor
```

### <a id="control-ui-(web)"></a><a id="control-ui-web"></a> Control UI（网络）

Control UI 的 **Logs** 选项卡会使用 `logs.tail` 跟随同一个文件。 关于如何打开它，请参见 [Control UI](/web/control-ui)。

### <a id="channel-only-logs"></a> 仅限通道的日志

要过滤通道活动 （WhatsApp/Telegram/etc），请使用：

```bash
openclaw channels logs --channel whatsapp
```

`--channel` 默认为 `all`；`--lines <n>`（默认 200）和 `--json` 也可用。

## <a id="log-formats"></a> 日志格式

### <a id="file-logs-(jsonl)"></a><a id="file-logs-jsonl"></a> 文件日志（JSONL）

日志文件中的每一行都是一个 JSON 对象。CLI 和 Control UI 会解析这些条目，以渲染结构化输出（时间、级别、子系统、消息）。

在可用时，文件日志的 JSONL 记录还会包含可供机器过滤的顶层字段：

- `hostname`：gateway 主机名。
- `message`：展平后的日志消息文本，便于全文搜索。
- `agent_id`：当日志调用携带 agent 上下文时的活动 agent id。
- `session_id`：当日志调用携带 session 上下文时的活动 session id/key。
- `channel`：当日志调用携带 channel 上下文时的活动通道。

OpenClaw 会在保留这些字段的同时保留原始的结构化日志参数， 因此读取带编号 tslog 参数键的现有解析器仍然可以正常工作。

通话、实时语音和托管房间活动通过同一文件日志管道发出有限的生命周期日志记录。这些记录包括事件类型、模式、传输、提供商和 size/timing 测量（如果可用），但省略转录文本、音频负载、转弯 ID、呼叫 ID 和提供商项目 ID。

### <a id="console-output"></a> 控制台输出

控制台日志为 **TTY-aware** 并采用可读格式：

- 子系统前缀 （e.g. `gateway/channels/whatsapp`）
- 级别着色（info/warn/error）
- 可选的紧凑或 JSON 模式
- `warn`、`error` 和 `fatal` 记录上的结构化字段，附加为一个紧凑的 `key=value ...` 尾部（嵌套值如 JSON，上限为 2 KiB），因此纯文本接收器（例如 Journald）保留诊断； `info` 和较低的控制台行仅显示消息，文件日志始终包含完整记录。这些字段在展平之前会经历与 `json` 控制台样式相同的编辑，因此 `apiToken` 等敏感键会被名称屏蔽，并且长度上限只能剪辑已屏蔽的文本

控制台格式由 `logging.consoleStyle` 控制。

SQLite 工作线程诊断使用 stderr。最终后端正常关闭后，工作人员会刷新排队的文件日志，并在确认关闭之前将待处理的控制台输出提供最多五秒的时间。源加载的后端和编译的工作线程共享相同的文件日志队列。强制工人终止仍然可以丢弃待处理的诊断。

### <a id="gateway-websocket-logs"></a> Gateway WebSocket 日志

`openclaw gateway` 还具有 RPC 流量的 WebSocket 协议日志记录：

- 正常模式：仅显示有价值的结果（错误、解析错误、慢调用）
- `--verbose`：所有 request/response 流量
- `--ws-log auto|compact|full`：选择详细渲染样式
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

### <a id="steering-and-input-cancellation"></a> 转向和输入取消

当转向回退时，普通通道回复路由将 `steering rejected; applying follow-up policy` 记录在警告级别。固定的 `reason` 代码区分不可用的所有者或注入路径、待处理的源操作、更改的权限、终端回复状态和运行时拒绝。记录包括通道、不透明会话 ID 以及输入或活动运行 ID（如果提供）。 `disposition` 区分后续策略决策、已确认或拒绝的队列准入​​以及已知的队列上限拒绝；它不确认交货。这些记录省略了消息文本、附件、会话密钥和原始异常。

当保留的回复传递状态阻止转向时，网关会记录 `chat steering rejected; falling back to follow-up dispatch`。其结构化字段区分传入输入的 `runId` 和 `activeRunId`，并记录会话、活动源轮转、恢复声明和确切的 `reason`：

- `terminal-pending` 或 `delivered-terminal`：存在最终回复收据。
- `unresolved-terminal-tool` 或 `delivery-ambiguous`：最终回复传递未解决。
- `already-delivered`：活动源轮次记录为已完成。
- `unknown-source-with-terminal-history`：活动源未知，保留已完成的源匝数。
- `stale-claim`：恢复声明未授权主动源转向。
- `session-entry-unavailable`：网关无法读取当前会话状态。

这些检查也在普通对话期间运行；该警告并不意味着网关正在重新启动。拒绝退回到后续调度；它本身不会取消输入。

`chat pending input aborted` 记录在消费之前中止的已接受输入，包括在后续队列中等待的输入。该消息包括原因以及保存的输入是否变为 `cancelled` 还是 `interrupted`。结构化字段包括其运行、会话和代理 ID。原因区分 `rpc`、`stop`、`timeout`、`restart`、`archive`、`delete`、`authority-revoked` 和 `superseded`；非分类中止使用 `aborted`。这些记录省略了消息文本和附件。

## <a id="configuring-logging"></a> 配置日志

所有日志记录配置都位于 `~/.openclaw/openclaw.json` 中的 `logging` 下。

```json
{
  "logging": {
    "level": "info",
    "file": "/path/to/openclaw.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactPatterns": ["sk-.*"]
  }
}
```

### <a id="log-levels"></a> 日志级别

级别：`silent`、`fatal`、`error`、`warn`、`info`、`debug`、`trace`。

- `logging.level`: **文件日志**（JSONL）级别（默认：`info`）。
- `logging.consoleLevel`: **控制台** 详细程度级别。

您可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量 （e.g. `OPENCLAW_LOG_LEVEL=debug`） 覆盖两者。环境变量优先于配置文件，因此您可以提高单次运行的详细程度，而无需编辑 `openclaw.json`。您还可以传递全局 CLI 选项 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`），它会覆盖该命令的环境变量。

`--verbose` 只影响控制台输出和 WS 日志详细程度；它不会更改文件日志级别。

### <a id="provider-request-failures"></a> Provider 请求失败

模型传输失败会发出警告级别的 `Model request failed`，其中包含提供程序、模型、可用状态、代码、类型、消息、错误正文以及请求和响应 ID。文件日志在抄本编辑和剪辑之前保留这些错误字段；不包括生成的响应内容和请求负载。将这些本地日志视为敏感日志。日志导出保留其现有的编辑策略。

在选择恢复之前，嵌入式尝试还会记录 `Assistant attempt failed`，包括保存的错误字段。请求验证和内容策略失败会停止未更改的模型重试和回退。上下文限制使用现有的压缩恢复。退休的转录输入是终端：改变模型无法恢复其输入，并且原始拒绝在诊断中仍然可见。

Anthropic- 兼容的 HTTP 故障将 HTTP 状态与有界的、经过编辑的响应正文分开保存。 JSON 错误正文在诊断编辑和预览截断之前进行解析，因此长代理错误不会仅仅因为控制台预览较短而丢失其状态或上游拒绝原因。诊断编辑器仍然可以忽略过大或畸形的尸体。

聊天显示已识别的请求限制事实，包括实时故障和保存的历史记录中允许的和实际的 `cache_control` 块数。原始代理元数据保留在经过编辑的诊断中，而不是聊天消息中。

保存的失败回复还可以区分速率限制、身份验证失败、提供商 HTTP 错误和网络中断。工作人员推理保留了有界的、经过编辑的错误详细信息以进行分类，包括当大量部分响应无法放入转录本时。无法识别的错误仍然使用通用聊天副本；检查网关日志和存储的错误以进行诊断。

当回复调度在部分回复或采用的回合后消耗抛出的错误时，其终端 `message.dispatch.completed` 和 `message.processed` 诊断保留失败结果、标识符和计时。在默认 `info` 文件级别和不太详细的级别（包括来自诊断订阅者和遥测导出的文件级别）省略了额外的自由格式原因。

要在事件的 `error` 字段中收集该原因，请启用 `diagnostics.enabled` 并将有效的 **file** `logging.level` 设置为 `debug` 或 `trace`。现有的 `OPENCLAW_LOG_LEVEL` 和 `--log-level` 覆盖适用； `logging.consoleLevel` 或 `--verbose` 单独不能启用它。聊天通知保持通用。

该原因使用强制内置凭据编辑加上 `logging.redactPatterns`，然后上限为 2,048 个 UTF-16 代码单元，而无需拆分代理对。密文并不能保证删除任意私有文本：调试原因仍然可以包含提供者或用户内容。将调试日志和遥测视为敏感，诊断后返回`info`。

响应输出身份冲突记录事件类型、输出位置、预期和观察到的项目类型以及工具调用是否完成，而不记录项目 ID 或响应内容。当失败的响应没有产生可见文本或完成的工具调用并且其请求仅启用客户端执行的功能工具时，OpenClaw 使用现有的有界会话重试策略。继续会保留较早的工具结果，因此不会重播那些已完成的操作。输出后或与提供商托管的工具之间的冲突仍然存在；在继续之前检查之前的结果。即使后来的快照将其清除，先前发出的文本仍保留终端状态。自动恢复需要成功完成响应且无拒绝；该终端之前的冲突无法重试，因为最终结果未知。失败或不完整的终端响应（包括内容过滤）无法通过身份恢复来覆盖。每次尝试都会执行身份检查。

当 OpenAI 响应切断 `max_output_tokens` 处的工具调用时，嵌入式运行程序可以在早期工具稳定后在同一运行中继续一次。它会附加一个运行时脚本通知，在 ID 可用时识别未完成的调用，并指示模型将工作拆分为更小的工具调用。不完整的调用不会被执行，已完成的工具结果仍然可用，并且早期的记录条目不变。第二次截断结束运行，并显示现有的未完成工具调用警告。传输错误日志包括列入许可名单的不完整原因，没有原始提供商文本；内容过滤和未识别的不完整响应保留其现有的失败行为。

工作线程消息大小故障与模型上下文窗口限制是分开的。使用较小的响应重试或在网关上继续。如果工作线程无法保留模型的延续数据，请在网关上重试之前停止或回收它。早期的工具操作可能已经完成，因此请在重复之前检查其结果。

### <a id="targeted-model-transport-diagnostics"></a> 定向模型传输诊断

提示缓存历史警告标识第一个更改的消息和有界字段路径，例如 `content[0].thinkingSignature` 或 `content[0].arguments`。它们不报告消息内容、参数值或签名字节。未知的扩展键显示为 `other`；超出保留诊断前缀的块显示为 `content[remaining]`。历史警告可识别已更改的模型上下文；它并不能单独证明为什么提供商的缓存读取令牌会丢失。

在调试提供方调用时，请使用定向环境标志，而不是把所有日志都提升到 `debug`：

```bash
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 openclaw gateway
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools OPENCLAW_DEBUG_SSE=events openclaw gateway
```

可用标志：

- `OPENCLAW_DEBUG_MODEL_TRANSPORT=1`：在 `info` 级别输出请求开始、获取响应、SDK 头、首个流式事件、流完成和传输错误。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=summary`：在模型请求日志中包含有界的请求载荷摘要。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=tools`：在载荷摘要中包含所有面向模型的工具名称。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`：包含已脱敏、已截断的 JSON 载荷快照。仅在调试时使用；机密信息会被脱敏，但提示词和消息文本可能仍会保留。
- `OPENCLAW_DEBUG_SSE=events`：输出首个事件和流完成时间。
- `OPENCLAW_DEBUG_SSE=peek`：还在支持有效负载查看的传输上发出前五个经过编辑的 SSE 事件有效负载，每个事件都有上限。响应传输仍然仅包含元数据。
- `OPENCLAW_DEBUG_CODE_MODE=1`：发出代码模式模型表面诊断，包括有界激活事实、最终可见表面以及由于代码模式拥有工具表面而过滤的提供者本机工具的名称。

这些标志通过正常的 OpenClaw 日志记录进行记录，因此 `openclaw logs --follow` 和 Control UI 日志选项卡会显示它们。为了向后兼容，`OPENCLAW_DEBUG_CODE_MODE` 还将通用模型传输诊断提升为 `info`；仅当启用该标志时，才会发出专用代码模式诊断。

`[model-fetch]` 启动和响应元数据（提供程序、API、模型、状态、延迟和请求字段，例如方法、URL、超时、代理和策略）默认使用 `debug`。非 2xx 状态的响应仍为 `info`，传输失败仍为警告。 `[model-fetch]` 和 `[responses]` 将呼叫者发出的 `AbortError` 报告为 `debug` 处的 `aborted`（或带有目标标志的 `info`），而不是作为提供者故障。请求层拥有最终的取消或超时结果； SDK 也可以在其自己的截止日期到期时中止其获取。明确的 `TimeoutError` 原因和失败而没有调用者中止仍然是警告。经过的时间包括本地服务准备和等待响应标头，但不包括流式传输响应正文。排除故障时，上述目标调试标志会促进启动并快速成功响应 `info` 元数据。

嵌入式模型请求附加原始 `sessionKey`、`runId`、编号为 `requestId` 和 `requestNumber` 来获取和传输日志。字符串标识符使用无损 JSON 转义，因此控制字符无法伪造日志行；他们的值没有被编辑。请求序列在同一运行重试中继续。当提供商提供时，获取响应日志包括 HTTP `httpRequestId`。响应SSE和WebSocket `stream_start` / `stream_done`日志记录实际请求的层和`max_output_tokens`；完成还记录响应 ID、服务层、提供商报告的输出和推理令牌计数、流持续时间、总请求经过时间和 terminal/incomplete 原因。未知使用量保持 `unknown`，而不是零。这些元数据字段不包含提示或响应文本；原始标识符保留在本地，并在日志出口处遵循正常编辑。

当 Anthropic 报告从重播中删除无效思维时，`[anthropic] replayed thinking dropped: N block(s)` 是一个警告。它包括不匹配的原因和最多五个受影响的消息路径，而不是思考内容。不需要调试标志。

当 Anthropic 报告应用服务器端工具结果清除时，`[anthropic] server-side context edit: cleared N tool results (M input tokens)` 是信息级行。它仅包含计数，没有工具参数或结果内容，并且不需要调试标志。有关启用清除的路由和阈值，请参阅 [Session pruning](/concepts/session-pruning#direct-anthropic-api-key-requests)。

### <a id="trace-correlation"></a> Trace 关联

文件日志是 JSONL。当日志调用携带有效的诊断追踪上下文时， OpenClaw 会将追踪字段写为顶层 JSON 键（`traceId`、`spanId`、 `parentSpanId`、`traceFlags`），以便外部日志处理器可以将该行与 OTEL span 以及 provider 的 `traceparent` 传播关联起来。

Gateway HTTP 请求和 Gateway WebSocket 帧会建立一个内部请求追踪作用域。在该异步作用域内发出的日志和诊断事件，如果未传递显式追踪上下文， 则会继承请求追踪。Agent 运行和模型调用追踪会成为活动请求追踪的子级， 因此本地日志、诊断快照、OTEL spans，以及可信 provider 的 `traceparent` 头部都可以通过 `traceId` 关联起来，而无需记录原始请求或模型内容。

Talk 生命周期日志记录在启用 OpenTelemetry 日志导出时，也会流向 diagnostics-otel 日志导出， 并使用与文件日志相同的有界属性。请配置 `diagnostics.otel.logsExporter` 来选择 OTLP、stdout JSONL 或两者作为输出目标。

### <a id="chat-send-startup"></a> 聊天发送启动

当确认或启动至少需要一秒时，网关会记录 `slow chat send`。 `stage=request` 以确认结束； `stage=startup` 在代理执行开始时结束。 `replyInitialization` 涵盖通过会话准备的入站调度。后面的提示、技能、工具目录、model/auth、运行时准备都属于`preparation`，在第一个模型请求之前。

`detail.*` 字段使用现有回复和代理准备范围来归因这些间隔，而无需启用时间线文件日志记录。它们包括会话绑定、冷转录水合作用、写入器准入、快照读取和提交，以及使用时的工作区、Git 基线、挂钩和嵌入式准备。 `reply.session.writer` 包括队列等待和`reply.session.initialize`；它们的差异表明作者等待。父跨度和子跨度重叠且不得求和。未完成的跨度在启动边界处停止；后来的模型和工具延迟不会延长它们。启用诊断时，结构化 `chat.send.detail.*` 阶段事件使用相同的持续时间。

### <a id="embedded-attempt-preparation"></a> 嵌入式尝试准备

`model-dispatch` 准备摘要通过历史清理、提供程序验证、历史窗口、上下文引擎组装（包括内存准备）、提示构建、提示投影和压缩预检扩展了 `stream-ready`。它在第一次提供程序调用时结束，包括需要时的压缩请求。这些是经过的检查点，而不是 CPU 测量值。

启用时间线日志记录后，`provider.request.serialized` 会在传输消耗这些字节之前标记本机请求正文编码的完成。其`runId`和`spanId`匹配`provider.request.started`；该间隙隔离了请求投影、工作线程准入以及提供者调用后的序列化。该标记并不断言套接字已发送字节。本地模拟提供者的请求到达可以在没有模型时间的情况下测量剩余的传输间隔。

嵌入式 `prep stages` 总结了两个工具准备间隔：

- `bundle-tools`：等待MCP/LSP准备、工具标准化和政策预测，在准备入场后进行测量。
- `tool-catalog`：同步目录构建，包括代码模式或启用时的工具搜索、模式投影和工具诊断。

`tool-preparation` 是来自前面的引导检查点的包容性检查点。它包括间隔、准备入场等待和剩余的引导工作。这些条目重叠：不要将它们相加或将它们解释为 CPU 时间。稍后的权限刷新不会附加初始准备条目。条件代码模式和工具搜索目录消息仍报告其原始 activation/compaction 事件。

较旧的摘要将等待 `code-mode` 或 `tool-search` 的捆绑收费，并使用 `bundle-tools` 进行稍后的簿记检查点。这些名称不提供与更正的跨度相同的时序边界。

摘要保留其现有的身份字段和警告阈值：总共十秒或任何记录阶段五秒；更快的摘要使用跟踪日志记录。缺少摘要并不能证明准备工作已立即完成。

### <a id="session-catalog-provider-waits"></a> Session 目录提供者等待

启用过程诊断后，`gateway/session-catalog` 记录器会记录 `slow session catalog provider list` 至少一秒后稳定的尝试。 `admissionWaitMs` 记录初始提供者准入等待。 `providerElapsedMs` 跨越第一次提供者调用到最终逻辑结算，包括在逐步填充的步骤之间等待。 `completionDelayMs` 在最终结算和队列释放后开始。网关的早期操作员启动队列是独立的。

`stepCount` 统计已接受的回调。 `admittedStepMs`通过实际结算汇总他们所经过的时间，包括权限检查、工厂工作和I/O等待。 `continuationWaitMs` 测量未完成的步骤之后的队列等待，直到恢复或取消；它不包括初次入场。这些字段不是精确不相交的分区，并且不测量 CPU 时间。

`admitted` 和 `providerInvoked` 将从未进入队列活动槽的尝试与调用提供者的尝试区分开来。未达到的间隔被省略。 `outcome` 报告尝试的解决或拒绝； `signalAborted` 独立报告信号，不识别错误原因或证明本机工作已停止。活动的提供者调用或 `next()` 步骤将保留其槽位，直到其实际承诺解决为止，包括取消后。惰性延续在步骤之间与其他调用者一起排队。

`providerIdHash` 对最多 256 个 UTF-16 单元的提供商 ID 进行哈希处理；较长的 ID 会省略该字段。它支持关联，而不是匿名或授权。主机摘要仅计数返回的 gateway/node 类型、连接标志和错误存在，最多检查 512 个主机。 `returnedHostCount` 报告完整数组长度，`hostCountsComplete=false` 标记部分计数。不包含会话行、主机 ID、提供商标签、搜索文本或错误消息。

每个摘要都描述了底层提供者的尝试。缓存的和正在进行的关注者可以从该一次尝试中收到多个 RPC 响应。后来的 `waitUntil` 主机发布具有单独的生命周期，并且不包含在提供程序持续时间或返回主机计数中。该日志不能证明客户端已收到，也不能识别哪个本机操作速度较慢，也不能覆盖从未解决的尝试。缺失的记录并不能证明不存在摊位。

### <a id="codex-catalog-phases"></a> Codex 目录阶段

当启用过程诊断和警告级别日志记录时，同一 `gateway/session-catalog` 记录器会记录三个 Codex 摘要。每个摘要仅在其观察到的操作稳定并至少需要一秒钟后才会发出：

- `slow Codex catalog list phases` 涵盖了插件的列表操作。 `managedSnapshotMs`、`controlWaitSumMs`、`exclusionMarkSumMs`、`adoptionSumMs` 和 `mappingMs` 识别已达到的工作。计数包括 `localHostCount`、`controlPageCalls`、`exclusionMarkCalls` 和 `adoptionCalls`。当可选快照方法或存储不可用时，`managedSnapshotMs` 不存在。 `nodeRegistryCalls`和`nodeRegistryMs`测量现有节点注册表调用； `pairedNodeCalls`、`pairedNodeSettled` 和 `nodeWaitSumMs` 描述了列表达到的配对节点承诺。缓存计数器 `coldStarts`、`refreshStarts`、`freshHits`、`staleHits` 和 `pendingJoins` 区分新生产者、后台刷新、立即缓存传递和等待现有冷页的调用者。
- `slow Codex catalog page producer` 测量一个控制页计算。 `listOperationId` 在观察时识别其原始列表。 `origin` 是 `cold`、`refresh` 或 `uncached`。 `controlRequestCalls` 对输入的控制请求进行计数； `inclusiveControlRequestWaitMs` 将其经过的等待时间相加，`inclusiveControlRequestWaitMaxMs` 报告最长的等待时间。 `postResponseMs` 涵盖后续出处检查和页面投影。 `provenanceChecks`、`provenanceCacheHits`、`provenanceReadCalls` 和 `provenanceMs` 描述现有的来源路径。 `provenanceReadCalls` 计算对元数据读取器的调用，而不是文件系统读取系统调用或块。到达 `stopReason` 后，为 `exhausted`、`limit` 或 `page-bound`。
- `slow Codex catalog cache wait` 测量等待挂起的冷页的调用者。 `producerOperationId` 将其链接到观察到的生产者； `listOperationId` 链接可用的周围列表。 `producerObserved=false`表示生产者的诊断身份不可用，而不是不存在生产者。

页面生成器摘要还累积现有控制阶段转换所经过的时间。重复的阶段（包括选择重试）和多个控制调用会导致相同的页面总数。仅当摘要发出时，每个总计才会四舍五入。不存在未达到的阶段；达到的阶段可能报告零毫秒。

拒绝控制调用可以添加`controlFailurePhase`和`controlFailureCategory`。故障阶段使用相同的逻辑边界：

| Control相    | 经过场            | 边界                                                                                                                         |
| ---------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `load-control`   | `controlLoadMs`          | 在请求所有者报告其第一阶段之前加载并进入控制模块。                                        |
| `prepare`        | `controlPrepareMs`       | 收购或客户 API 进入之前的选项、防护、导入或 argument/budget 评估。                                  |
| `acquire-client` | `controlAcquireClientMs` | 共享客户端选择、进程注册准备、可能的启动、身份验证、初始化和准备。      |
| `client-request` | `controlClientRequestMs` | 调用客户端API；准备状态、共享本机请求等待、重试和调用者继续仍然可以在其中发生。 |
| `release-client` | `controlReleaseClientMs` | 合乎逻辑的租约释放或清理，包括清理后的较晚期限决定。这不是物理过程退出的证明。 |

这些是调用者观察到的间隔，当控件调用报告失败或关闭时冻结。它们排除了外部超时后继续进行的基础工作。对已固定连接的调用可以省略获取和释放，因为周围的引脚拥有这些操作。 Setup/settlement 间隙和舍入意味着阶段总数不需要完全等于包含等待。

类别为 `deadline-observed`、`scoped-rejection`、`rpc-method-unavailable`（键入 RPC 错误代码 `-32601`）、`rpc-error` 或 `other`。它们使用现有的所有者决策和键入的错误，而不复制异常消息、堆栈、响应数据或任意错误代码。普通启动、传输和其他未分类错误仍然存​​在 `other`；该类别未确定其原因。公共不可用主机消息仍处于清理状态。

成功的清理会保留早期错误的阶段，除非外部请求所有者遵守其截止日期。对于 `deadline-observed`，该阶段是稍后决策的活动阶段，即使清理刚刚完成。例如，`release-client/deadline-observed` 可以在调用客户端 API 之前跟踪预算耗尽；它并不能证明清理工作导致了截止日期。替换请求错误报告 `release-client` 的清理错误。内部处理的重试和成功的请求不会发布失败字段，并且后期回调无法覆盖已确定的观察结果。

这些字段不能证明本机请求已写入、本机进程失败或响应已到达客户端。在控制调用拒绝后，包含列表可以解析为不可用的主机。

`operationId` 对于 `diagnosticEpoch`、PID 和线程来说是本地的。它不是会话、本机请求或审核执行身份。一个生产者可以为多个服务员提供服务，并且在列表返回后可以继续进行陈旧的刷新。 `outcome=resolved`表示观察到的操作返回；已解析的列表可以包括断开连接或出错的主机。

所有计时都是经过的时间，包括异步等待。包含的控制请求间隔及其逻辑阶段总计不会隔离物理请求写入、线路延迟或本机 CPU，并且不能证明本机进程已停止。多个调用者可能正在等待相同的底层工作。来源时间包含在响应后时间中，并且主机工作可以重叠，因此总和不需要划分列表的经过时间。 `nodeWaitSumMs` 对现有配对节点承诺等待进行求和；它不是一个不相交的节点阶段或本机完成的证明。如果在子承诺未解决时列表关闭，则 `pairedNodeCalls` 可能会超过 `pairedNodeSettled` 并且总和是部分的。后来的主机出版物保留其单独的生命周期。未达到的时间被省略，而达到的阶段可能报告零毫秒。

跟踪器允许每个 JavaScript 运行时隔离最多 64 个活动诊断观察，并在这三个摘要中共享每个固定 60 秒窗口 60 条记录的预算。这些限制抑制了观察，而不是目录工作。每个记录的元数据上限为 28 个标量字段和 2 个 KiB（不包括记录器信封）。 `omittedObservations` 报告稍后发出的记录上的累积容量、速率或元数据限制抑制。窗口边界爆发仍然是可能的。禁用的诊断、日志记录级别、短暂的操作、未结算或日志记录失败也可能不会留下任何记录。

这些记录包含固定标签、计数、计时和诊断操作标识。它们省略了连接指纹、查询、光标、主页、路径、session/thread 标识符、标题、凭据和原始错误。现有的跟踪上下文可能会伴随日志；不会创建任何跟踪或审计身份。这些是普通的性能日志，不会更改 [ 审计收集 ](/gateway/audit)、授权、缓存行为或截止日期。即使内容捕获关闭，它们的清理属性也可能流经已启用的 [OpenTelemetry 日志导出器](/gateway/opentelemetry/privacy-and-trace-context)。丢失的原木并不能证明没有摊位。

### <a id="lifecycle-queue-waits"></a> 生命周期队列等待

启用过程诊断后，当队列采集在一秒后仍处于待处理状态时，`sessions/lifecycle` 记录器会发出 `session lifecycle queue waiting` 一次。它识别 `mutation` 或 `lifecycle` 队列并在该时刻对其当前持有者进行采样。自从服务员进入队列以来，持有者可能已经改变。采集后运行的延迟计时器不会发出任何持有样本。

`operationId` 和 `holderOperationId` 标识 `diagnosticEpoch`、PID 和线程内的诊断操作实例。操作使用固定边界标签 `lifecycle`、`mutation` 和 `compaction`。突变还包括有界 `mutationKind`（例如，`create`、`archive`、`delete` 或 `worktree-cleanup`）；队列样本包括 `holderMutationKind`。现有请求跟踪显示在 `operationTraceId`/`operationSpanId` 中，并在存在时单独显示 `holderTraceId`/`holderSpanId` 字段。丢失的踪迹字段仍然未知；不会创建新的跟踪或审计执行标识。

`identityHash` 是已经标准化的 store/session 身份的加盐摘要。它仅在同一 JavaScript 运行时隔离和诊断时期内关联。原始会话密钥和路径被省略。摘要是操作相关性，而不是匿名或授权证据。两条记录均包括 `sessionScopeHash`（第一个标准化身份的加盐摘要）和 `identityCount`。对于批次，此名称指定一个范围，而不是每个受影响的会话。 `holderSessionScopeHash` 为当前持有者标识相同的范围。不会记录会话标题、记录内容、存储库名称或原始身份。

`slow session lifecycle operation` 记录操作在其实际排队工作的结算过程中至少花费一秒钟。它将 `mutationQueueWaitMs`、`lifecycleQueueWaitMs`、`completionDelayMs` 和 `phaseDurationsMs.prepare`、`.run` 和 `.finalize` 分开。持有者当前的`holderPhase`也可以识别激活、准入或释放工作。 `lifecycle` 操作描述了在现有的主动突变空闲等待之后的队列尝试；此处不测量先前的空闲等待。没有规范化身份的调用没有队列，也不会发出队列操作摘要。调用者可以在所有排队的工作展开之前取消； `signalAborted` 报告信号但未声明持有者已释放。

跟踪器在可重入工作中保留外部所有权，并且仅当其实际队列回调退出时才收回持有者。它的状态弱地遵循现有队列对象；它不会创建另一个执行队列。每个运行时隔离，它最多保留 128 个持有者描述符和 32 个一次性等待计时器，并且每分钟最多发出 60 条记录。队列计时所有者明确区分重入，因此未观察到的外部持有者在容量或启用后保持未知状态。 `omittedObservations` 在后来的记录中报告了被抑制的观察结果；丢失的记录永远不会证明无需等待。

经过的时间间隔可以包括异步等待和嵌套工作，因此阶段和队列总计不需要形成不相交的分区。`isMainThread=true`标识发出线程；沿着`.run`间隔不会建立事件循环阻塞。将其与事件循环延迟或CPU归因于停顿之前的配置文件。生命周期准入之前的工作（包括请求预检）不在这些时间间隔内。持有者样本标识谁在采样时刻拥有该队列，而不是每个前任负责整个等待或消耗了哪些工作CPU。这些是普通的性能日志。他们不使用或改变[审核身份](/gateway/audit)、决定、保留、主要归属或承认权限。

### <a id="worker-pool-capacity"></a> 工作池容量

网关`status`响应包括`workerPools.transcriptReconciliation`和`workerPools.modelCatalog`。每个报告来自池所有者的 `maxWorkers`、`workers`、`workersCreated`、`activeTasks` 和 `pendingTasks`。两个网关池一次接纳一名工作人员。待处理的任务包括排队的和正在执行的工作；创建计数属于当前池生命周期。 `workerPools.modelCatalog` 还报告 `workerFailures`：自网关启动以来有多少模型目录工作器失败（内存不足、退出或超时）。发生故障的池被替换，因此该计数在替换后仍然存在。每次故障发生时还会记录一个 `model catalog worker failed` 警告，其中包含工作线程的原因以及要在新工作线程上重新发布的代理目录数量。空闲时退出的worker会立即被统计并记录；下一个目录请求将取代它。关闭和插件停用不计算在内。启动跟踪的 `memory.ready` 记录还包括这些池计数。

这些数字描述了工人和任务的数量。进程 RSS 包括每个隔离和本机分配； Node 的进程堆标志可以覆盖工作线程请求的堆限制。将内存增长归因于特定工作人员时，请使用构造函数或每个隔离测量。

### <a id="slow-git-content-reads"></a> Git 内容读取缓慢

启用进程诊断和信息级日志记录后，`git/worker` 在持续至少一秒的 diff、diff-baseline 或 PR 分支事实操作后发出 `slow Git content read`。日志消息包含与结构化文件日志相同的字段。每分钟记录限制为 60 条。

`operation` 识别呼叫者家庭。 `checkoutId`是绝对结账路径的截断SHA-256；链接结帐具有不同的 ID。当调用者提供托管索引所有权时，`checkoutClass` 为 `managed`，否则为 `unspecified`。不记录路径、引用、命令参数和输出内容。

`workerQueueWaitMs` 测量准入等待（如果从未调度则为空）。 `firstHostRequestMs` 包括在第一个主机请求之前等待加上工作程序启动和工作。 `workerMs` 涵盖后续的worker和host工作； `settlementMs` 涵盖最终清理。 `summedGitQueueWaitMs` 测量等待共享内容处理槽，而 `summedGitWallMs` 则对包括处理结算在内的命令执行进行求和。并发命令重叠，因此它们的总和可能超过操作持续时间；这些是墙上时间，而不是 CPU 时间。

`gitCommandCount` 计算启动的主机命令请求，而不是 Git 自己的子进程。 `gitStdoutBytes` 和 `gitStderrBytes` 计算捕获的字节数，不包括任何截断的输出。 `gitTimeoutCount` 统计返回的超时； `slowestGitCommand` 记录最长命令的白名单名称、适用时的差异模式、持续时间和终止。命令超时后，操作可以成功返回，因为可选统计信息会回退到未知。工件和维护操作有助于聚合 Git 工作线程指标，但不会发出此日志。

### <a id="slow-worktree-cleanup"></a> 工作树清理速度慢

启用进程诊断和信息级日志记录后，两个子系统会在返回或抛出后记录至少持续一秒的操作：

- `agents/worktrees`：`slow managed worktree removal` 通过分配租赁结算来衡量拆除。 `admissionMs` 涵盖删除回调开始之前的获取尝试、退避、设置和调度。 `bodyMs` 涵盖该回调； `finalizeMs` 涵盖排水、最终权限检查、租赁释放和竣工交付。创建和恢复操作不会发出此记录。
- `git/ref-mutation`：`slow Git ref mutation` 测量共享 Git-ref 队列操作。 `resolveMs` 涵盖公共目录解析； `queueWaitMs`涵盖了从入队到回调进入的时间； `queuedOperationMs`涵盖其结算的回调和交割。它可以包含多个 Git 命令，并且不识别队列持有者或每个前任者。

删除还记录了 `bodyMs` 内部达到的阶段：

- `preparationMs`：权限和删除声明检查、存储库重新绑定以及工作树锁定检查或解锁。
- `snapshotMs`：快照准备和发布，包括配置文件捕获和快照失败清理。
- `checkoutRemovalMs`：通过结果验证进行删除准入检查和物理 Git 工作树删除。
- `bodyFinalizeMs`：分支删除、修剪、空父清理、注册表最终确定或失败后的删除声明清理。这与`finalizeMs`，它衡量分配租赁包装器的最终结算。

不存在未达到的阶段；达到的阶段可以报告零毫秒。异常会关闭活动阶段并包括 `bodyFinalizeMs` 中的声明清理。这些字段细分了承认的主体，而不是单独的 Git 命令或 CPU 工作。他们使用相同的完成记录和费率预算。

两条记录均包括以整数毫秒为单位的 `durationMs`、`callbackEntered` 和 `outcome`（`returned` 或 `threw`）。从未进入其回调的删除将所有经过的时间报告为 `admissionMs` 并忽略 `bodyMs` 和 `finalizeMs`。 Git 目录解析失败报告 `resolveMs` 并忽略未到达的队列和操作持续时间。阶段持续时间在舍入之前划分每个记录的间隔。这些间隔包括异步等待：准入不是纯粹的锁等待，排队操作时间不是子进程 CPU 时间。它们嵌套在更广泛的操作中，例如会话补丁 `worktreeCleanup`；不要将嵌套持续时间添加到封闭的总计中。

每个子系统都有单独的固定预算，即每个 JavaScript 运行时隔离每 60 秒窗口 60 条记录。跨窗口边界的爆发仍然是可能的。 `omittedObservations` 在下一个发出的记录上报告抑制的记录，然后重置。挂起的操作在解决之前不会发出任何信号；禁用的诊断、日志级别、阈值和预算也可能不会留下任何记录。丢失的记录并不能证明没有延误。

添加的字段是固定标量计时、结果、计数、`pid`、`threadId` 和 `isMainThread`。它们省略了存储库路径、引用、参数、原始错误和命令输出。记录保留现有的有效诊断跟踪（如果可用）；它们不会创建任何跟踪、操作身份或私有身份哈希。使用跟踪关联嵌套记录，而不将经过的时间视为 CPU 归因。这些诊断在不改变其排序或完成行为的情况下测量清理情况。

### <a id="slow-agent-database-opens"></a> 缓慢的代理数据库打开

即使没有选择加入跟踪，前台网关启动也会报告一组有限的 `startup phase` 记录。 CLI 记录标识 `loading configuration` 之前的入口模块加载、环境选择、命令导入和状态准备。 Bootstrap 子阶段单独的配置保护导入、配置和数据库准入、插件元数据、有效负载验证和租约获取。网关记录单独的维护工作、监听器绑定、插件加载和附件、工作器启动、模型准备、通道启动和恢复的子代理激活。测量阶段记录其开始时间和经过的持续时间； `total` 是从进程启动（或当前进程内重新启动）起经过的时间。这些是挂机时间，包括异步等待，而不是 CPU 测量值。嵌套持续时间与其父阶段重叠；不要将它们添加到父总数中。插件服务开始至少需要 250 毫秒，始终记录一个紧凑的 `sidecars.plugin-services.<plugin>.<service>` 跨度以及经过的时间和 `success` 或 `failure` 结果，即使没有选择加入跟踪。插件和服务 ID 使用编码的诊断段；该记录不包含服务负载或错误文本。设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以获得完整的细分以及每个插件的导入和注册时间。

桌面权限缩小和会话身份检查仍保留在其所需的准入路径上。转录投影修复、孤儿结算、通道维护、配对诊断和恢复子代理激活在准备就绪后运行。退役的插件捕获加入现有的就绪后空闲清理。历史读取在需要时使用成绩单所有者的有限按需修复。孤立状态及其失败接收在数据库工作线程中一起解决，并在提交之前检查当前运行所有权。这些计划更改不会更改存储格式或需要更新迁移。每个CLI准入通证共享一个只读状态快照，并在现场守卫和写入之前释放它；获得预备租约仍会开启新的旅程。

当持久数据库打开至少需要一秒时，`slow OpenClaw agent database open` 警告包括 `phaseDurationsMs`：

| 阶段           | 包括工作                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `open`          | 权限、处理驱逐以及打开连接。                                               |
| `validation`    | 完整性、版本和所有者检查，包括异步准入期间的工作线程等待和重新验证。 |
| `configuration` | 连接和 WAL 设置。                                                                            |
| `schema`        | 需要时进行架构初始化或收敛。                                                       |
| `registration`  | 验证后驱逐和权限、清理设置和共享状态注册。                 |

整数毫秒持续时间分区 `elapsedMs`，在租约获取后使用单调时钟测量。实时缓存命中保持安静。这些是经过的持续时间，包括异步等待，而不是 CPU 时间或主事件循环在整个时间间隔内被阻止的证明。

结构化警告还包括 `pid`、Node 的 `threadId` 以及用于发出警告的开场者的 `isMainThread`。检查每个`openclaw logs --json`事件的原始`raw`记录；警告级别控制台文本还以 `key=value` 对形式携带这些字段。主线程上的开启程序可能已等待完整性工作线程，因此这些字段无法识别执行每个阶段的线程。 `admissionMode`记录实际的`sync`或`async`打开的驱动程序。异步准入卸载了其初始完整性检查；恢复验证和修复仍然可以在开启器上运行。将进程ID与日志时间戳和当前进程关联起来； PID 退出后可以重复使用。

`integrityGateMs` 涵盖通过准入重新验证和恢复进行的初始完整性检查。当驱动程序测量其同步完整性和外键回调时，`integrityCheckSyncMs` 报告回调的已用时间，`integrityOutsideCheckMs` 报告剩余的门时间。两个整数字段分区`integrityGateMs`；其余部分包括准入、IPC、调度和重新验证，而不仅仅是父队列等待。这些是墙持续时间，而不是 CPU 时间。回收Worker可以在其`admissionMode`为`async`时报告此同步检查。异步子进程检查会使这两个字段都不存在，因为其父进程本身无法测量回调。

SQLite 回收当工人的联合操作至少需要一秒时，他们也会在 `warn` 发出 `slow SQLite reclamation Worker operation`。该记录在解决了工人结果或本机退出和家长入场解决后发出。它包括父级的`pid`，`threadId`和`isMainThread`，实际的Node `workerThreadId`，`reclamationKind`，`elapsedMs`，终端`outcome`（`resolved`或`rejected`） 和 `exitCode`。计时从进入存档工作队列后开始，包括启动、验证、准入等待、工作和清理。它不会测量 CPU 时间、隔离验证阶段或确定发出父线程被阻止。因此，短写部分可以保持安静，而整个操作警告暴露了它们之间的缓慢准备。该记录继承现有的父跟踪（如果可用）。失败的保留回收操作还包括 `sessionIdHash`（针对一个会话时）、`error`（已编辑的消息和原因）和 `errorFrame`（第一个堆栈帧）。这些故障甚至会在一秒内发出一个警告，名为 `SQLite reclamation Worker failed`；较慢的故障使用现有的缓慢操作警告。在提交之前更新的会话写入取代的自动维护不是 Worker 故障：写入安静窗口后维护重试，并且快速取代的 Worker 在调试级别记录 `SQLite reclamation Worker superseded by newer inputs`。会话标识符使用与其他会话 SQLite 诊断相同的哈希值；失败字段经过编辑，每个字段限制为 2,048 个字符。冷存储操作使用相同的警告，将 `reclamationKind` 设置为 `cold-batch`（存档或外部化）、`cold-maintain`（回收空闲页面）或 `cold-restore`（恢复副本）。他们的作者警告具有相同的工人身份和编号的准入字段。

### <a id="sqlite-transaction-timing"></a> SQLite 交易时序

`sqlite/transaction` 警告 `slow SQLite transaction hold`、`slow SQLite transaction step` 和 `SQLite transaction lock wait failed` 包括 `database`、`operation`、`pid`、Node 的 `threadId` 和`isMainThread` 为执行事务的线程。显式标签优先；否则，诊断将使用本机数据库路径和当前的 Worker 操作。内存数据库是`:memory:`，退休句柄是`unavailable`，没有操作上下文的调用者是`unlabeled`。保留警告还包括 `mode`（`deferred` 或 `immediate`）。检查`openclaw logs --json`中的原始`raw`记录，以区分主线程和共享同一进程的Workers。 `async: false` 描述同步事务助手；它不识别线程。

保持时间从`BEGIN`成功后开始，包括同步回调、结果检查、提交或回滚。它不包括数据库打开和开始步骤。主机准入在交易计数内等待其持有；重叠的延迟读持有并不能确定多个写入者持有锁定。成功的开始和提交步骤计时包括本机执行、存储工作和调度延迟；他们不建立锁争用。单独的 `SQLite transaction lock wait failed` 警告标识捕获的 SQLite 锁定错误。这些经过的持续时间不会测量 SQL CPU 时间或建立与附近请求的因果链接。

保持警告将回调标记为 `callbackKind: "application-transaction"`：OpenClaw 的交易主体，而不是 SQLite 繁忙处理程序或 SQL 函数。 `phases.databaseAdmissionWaitMs` 测量与主机的同步元数据交换，与 `hostAdmissionWaitMs` 中的权限等待分开。 COMMIT 期间的元数据等待属于此字段，并且从保留的 `commitMs` 中排除。旧版 `sqlMs` 字段不包括等待时间和提交时间，但包括 SQL 语句之间的 JavaScript。默认 1,000 毫秒日志记录阈值不会建立一秒超时。

授权回收或冷存储提交后，较旧的构建报告 `session.reclamation.commit-settlement` 用于父端同步 SQLite 检查。现在，父级在检查实时权限后自动接受提交，并异步等待结算，无需该检查或其锁定等待。

热转录读取在 `operation` 中识别其目的：`session transcript <purpose> read`，其中 `<purpose>` 是 `identity`、`header`、`tail`、`incremental`、`checkpoint`、`events`、 `raw rows`、`storage rows` 或 `match`。这些固定标签可区分读者，而不保留会话 ID 或转录内容。嵌套读取仍然是外部事务计时的一部分；较旧的警告使用通用 `session transcript hot read` 标签。

`session branch summaries read` 涵盖快照读取和分支摘要计算。存储的会话在后台 Worker 中执行此工作；隐身会话使用其进程持有的数据库。缓存命中不执行此扫描。

立即 `BEGIN` 警告还包括 `beginAdmission`：`nativeAttempts` 计算实际本机 `BEGIN IMMEDIATE` 调用，`nativeMs` 测量这些调用； `serviceCalls` 对同步准入服务回调进行计数，`serviceMs` 对其进行测量。服务回调可能找不到任何工作，因此其计数并不意味着回收已被授权。失败的尝试和抛出回调保留其部分测量值。延期的`BEGIN`和`COMMIT`没有细分。

这些字段使用与未更改的 `elapsedMs` 总数相同的挂钟。本机时间不包括繁忙超时配置和恢复；其他簿记可以留下余数。一个服务可以同步加入另一个事务，该事务的时间已经包含在外部`serviceMs`中；不要将嵌套警告添加在一起。该故障未识别 CPU 时间或物理锁持有者。

### <a id="sqlite-session-writes"></a> SQLite 会话写入

当总运行时间达到 1000 ms 时，`session-sqlite` 子系统会发出 `slow SQLite session write`，当写入失败时，会发出 `SQLite session write failed`。这两个警告都包含 `operation`，这是一组固定语义操作名称中的标签，用于标识拥有 SQLite 编写器通道的回调。

计时字段将经过的时间间隔分为：

- `queueWaitMs`：等待进入写入通道的时间。
- `writerExecutionMs`：所属回调的持续时间，包括异步等待。
- `completionDelayMs`：回调完成和调用者恢复之间的时间。

当排队回调开始和结束时，这些字段可用； `elapsedMs` 记录总持续时间。警告的控制台行具有与 `key=value` 对相同的字段； `openclaw logs --json` 显示原始 `raw` 记录。

当 `queueWaitMs + writerExecutionMs` 达到 1000 毫秒时，即使执行本身很快，`slow agent database reservation` 也会覆盖直接、工作线程和有序读取预留。仅完成延迟不会触发此警告。当写入器在入队时持有通道时，`blockingOperation` 和可选的 `blockingCaller` 会识别该持有者； `blockingWorkerOperations` 列出其绑定的 Worker 操作标签。这是在排队时观察到的持有者，而不是队列中前面的每个写入者的详细信息。可重入借用不会发出第二次保留警告。低于阈值时不会发出预订警告。

Prometheus 已经公开了带有 `kind="sqlite_writer"` 和有界 `request_class` 标签的 `openclaw_worker_queue_wait_seconds`。它测量 Worker 请求排队到分派的时间；在该队列之前的外部预留等待在预留警告中可见，而不是在该工作线程直方图中可见。

使用 `operation` 定位所属代码路径。它不会识别特定的 SQL 语句、测量 CPU 时间或锁争用，也不会确定附近的 RPC 导致了延迟。较旧的记录可能缺少 `operation`；不要从相邻的日志消息中推断出它。

`session.reclamation.worker-commit` 标记每个编号的 Worker 写入许可，而不仅仅是其最终提交。 `reclamationAdmissionId` 是实际请求 ID，范围为该 Worker 和进程。 `reclamationAdmissionReleaseCause` 记录观察到的 `worker-release` 消息或 `worker-exit` 事件。它不会推断 initial/final 阶段或证明成功提交或清理。早期故障可能会导致释放原因不存在，因为尚未观察到这两个事件。

对于 `session.lifecycle.artifacts-prepare`，相同的警告包括有界的 `artifactPreparation` 对象。 `admissionMode` 区分现有的缓存句柄和异步获取；当规划器收到该句柄时，`admissionMs` 停止。异步采集可能包括共享准入和完整性检查等待，因此它不是 CPU 测量。

其余毫秒字段分隔节点清单和选择 （`nodeInventoryMs`）、引用和条目删除计划 （`referencePlanningMs`）、孤立选择和计划 （`orphanPlanningMs`） 以及转录标记迭代 （`markerScanMs`）。孤儿计划不包括标记时间。在代理或前缀过滤、引用的 ID、选定的条目、输入的标记查询、消耗的标记行和删除计划之前对报告现有的 node/window 行进行计数。它们是观察到的结果计数，而不是 SQLite 内部行访问。不添加标识符、标记文本、转录内容或字节计数。 `completed: false` 标记准备失败时的部分观察结果；缺少的字段未完成。这些字段不会更改警告阈值或证明附近的请求导致了该工作。在测量的子相位之外进行舍入和工作可能会与 `writerExecutionMs` 产生差异；不要将该剩余部分分配给特定阶段。

对于 `session.history.archive-prune`，相同的缓慢或失败警告可以包含一个有界 `archivePruning` 对象。其 `trigger` 在呼叫站点记录：`initial`、`after-eviction` 或 `final`。它区分维护流程中的修剪过程；它不识别导致维护的请求。

该对象聚合整个修剪过程中的观察结果：

- `admissionMs`、`cachedAdmissions` 和 `asyncAdmissions` 测量数据库采集并对其观察到的模式进行计数。准入时间在回调进入或获取失败时结束，并且可以包括共享准入和完整性检查等待。在模式选择之前拒绝会增加准入时间，但不会增加任一模式计数。
- `checkpointMs`、`checkpointMaxMs` 和 `checkpointCalls` 报告总时间、最长呼叫和输入的呼叫。 `checkpointIncomplete` 计算返回 false 的调用，这可能意味着检查点繁忙或错误；它不识别锁持有者或区分这些结果。抛出的检查点会影响调用计数和时间，而不会增加 `checkpointIncomplete`。
- `vacuumMs`、`vacuumPasses` 和 `vacuumPagesRequested` 测量增量真空调用及其请求的页数。请求的页面不是已确认的回收页面。
- `queryMs` 涵盖现有存档存在、候选、未发布名称和空闲列表读取。 `rowDeletionMs` 涵盖存档行删除事务。
- `fileRemovalMs`、`removedFiles`、`missingFiles` 和 `failedRemovals` 报告现有文件删除结果。 `removedFiles` 统计成功的当前布局和旧版删除。 `missingFiles` 计算返回 `ENOENT` 的当前布局删除尝试。其他当前布局失败和所有不成功的遗留删除均计入 `failedRemovals`；旧版计数包括丢失的路径、非文件以及统计或删除失败。
- `measurementMs` 和 `measurements` 涵盖等待的磁盘使用情况测量尝试，包括测量 Worker、扫描和返回结果的故障和排队时间。 `legacyInventoryMs` 涵盖旧文件清单、过滤和排序。

所有持续时间均为挂机时间，包括异步等待，而不是 CPU 测量值。 `completed: false` 在剪枝抛出时保留部分观察结果；缺少阶段计时字段意味着未进入该阶段。 `completed: true`表示剪枝pass正常返回。它并不能证明每个检查点都完成了，每个清除都成功了，或者达到了高水位目标。四舍五入和未测量的工作可以留下相对于`writerExecutionMs`的余数； `checkpointMaxMs` 已包含在 `checkpointMs` 中。

这些字段重用现有操作，无需额外的存储读取、每个文件记录、路径、名称或内容。它们不会更改警告阈值、检查点模式或超时或存档保留行为。

### <a id="slow-reply-preparation"></a> 慢回复准备

在确认之前，`slow chat send` 报告请求至少需要一秒钟，包括 `sessions.create` 的第一轮。其 `detail.admission.*` 将工作准入和该准入内的验证分开。 `detail.persist.*` 字段将待处理的输入暂存、记录持久性和仪表板权限准备分开。这些固定标签不包含消息内容或会话标识符，并且不需要诊断标志。持续时间包括等待的工作：`admission.revalidate` 嵌套在 `admission.work` 内，因此它们的值不得加在一起或视为 SQLite 执行时间。

当回复花费很长时间准备时，检查正常的网关日志：

```bash
openclaw logs --follow --plain | rg 'timings|agent turn milestone|liveness warning'
```

回复解析器、调度和代理轮流准备里程碑包括阶段持续时间、经过的时间和可用的 run/session 标识符。如果没有分析器标志，它们会在一个准备阶段经过 10 秒或 5 秒时发出警告。 Codex 准备工作还会立即记录每个已完成的慢速阶段（包括失败），并在提交本机回合之前发出 `native-turn-handoff` 摘要。计时记录包含阶段名称和标识符，而不是提示或工具参数。

调度准备将 `reply.wait_admission_ticket` 与 `reply.admit_pre_dispatch`、`reply.admit_dispatch` 和 `reply.admit_command_resolution` 分开。这些跨度将等待较早的输入与等待会话的执行所有者区分开来。从未到达回复解析器的已取消或失败的请求仍然报告在相同阈值下准备缓慢。

嵌入式运行启动、准备、核心插件工具和验证阶段摘要在消息中包括 `pid`、`threadId` 和 `isMainThread`，以区分共享日志文件的发射器。这些标识了摘要发射器，而不是每个定时操作运行的位置。已用阶段时间可以包括异步等待，但不是 CPU 时间。

使用第一个 `turn_accepted`、`model_call_started`、`tool_execution_started` 和 `assistant_output_started` 里程碑将启动与后续活动分开。默认情况下，延迟的第一个 assistant/tool 活动在 `info` 处记录一次，因为提供程序和工具延迟本身并不是准备警告。这些是运行时观察：本机轮次接受并不能证明提供者请求已经启动。整轮摘要仍然仅限分析器，因为它们的总数包括模型和工具时间。在将长时间的转向归因于网关启动之前，比较各个准备阶段。具有高事件循环延迟的同时 `liveness warning` 可以解释多个会话之间的延迟。

对于较短的延迟，[profiler 标记 ](/diagnostics/flags#profiler-flags) 降低警告阈值。他们不需要诊断多秒的启动停顿。

### <a id="model-call-size-and-timing"></a> 模型调用大小和时序

模型调用诊断记录有界 request/response 测量值，而不捕获原始提示或响应内容：

- `requestPayloadBytes`: UTF-8 字节大小，表示最终模型请求载荷
- `responseStreamBytes`: 流式模型响应分块载荷的 UTF-8 字节大小。高频文本、思考和工具调用 delta 事件只计算增量 `delta` 字节，而不是完整的 `partial` 快照。
- `timeToFirstByteMs`: 第一个流式响应事件到达前经过的时间
- `durationMs`: 模型调用总耗时

这些字段在启用诊断导出时，可用于诊断快照、模型调用插件钩子以及 OTEL 模型调用 spans/metrics。

本地 llama.cpp 和本机 Ollama 请求在一秒后显示“正在等待本地模型响应”，而没有响应事件。 Control UI、TUI 和带有进度草稿的通道显示此瞬态状态，包括同一回合中的后续模型调用。它会在第一个流事件、取消、失败或完成时清除。快速请求不会闪烁等待状态，并且不需要服务器轮询或用户配置。

“等待免费模型槽”是为与请求相关的后端证据保留的。固定的 llama.cpp 服务器和 Ollama 不会公开排队请求的证据：占用的插槽、模型驻留和静默单独无法区分排队与加载或提示处理。他们使用通用的响应等待措辞。

已完成的 llama.cpp 和 Ollama 调用还会在模型调用诊断、提供程序请求时间线事件以及网关稳定性快照和捆绑包中报告 `providerProcessingMs` 和 `providerWaitEstimateMs`。 `openclaw gateway stability` 将这些显示为 `processing` 和 `wait~`，以及总时间 `wall`。

处理是服务器报告的提示评估加上令牌生成时间。估计等待是挂起时间和处理之间的非负差：它包括后端排队、模型加载、传输和终端结算开销，因此它不是精确的时隙等待测量。 Ollama的`load_duration`可以包含调度，不计为推理。当最终服务器计时丢失或无效时（包括没有最终统计数据的取消），这些字段将保持不存在。中止的调用并不能证明后端释放了其插槽。不执行额外的服务器轮询。

当提供商报告时，提示缓存删除警告包括 `requestGapMs`（自会话上次请求以来的开始时间）、`responseId`、`sessionId` 和 `promptTokens`。 previous/current 线路摘要包括请求的 `serviceTier`，因此可以将层交换机与未更改路由上的缓存丢失区分开来。分类为 `unattributed` 的掉落物使用 `debug`；归因的下降仍然是警告。 `providerPrefix` 将最终编码的请求段与最后一个请求与可用的缓存读取使用情况进行比较：系统指令、工具、历史消息和其他请求参数。当先前的前缀未更改时，它会命名第一个不同的段或 `prefix-match`。匹配并不能证明提供程序缓存的可用性或保留率。不支持的传输和缺失基线报告 `unavailable`。

在现有的 512 条目诊断跟踪器中，提示内容仅以散列形式保留。历史比较保留前 512 个消息哈希值和一个剩余尾部哈希值。尾部发生变化，报告 `message-tail:512`；增长或收缩的尾部报告 `unverified-after:512`，因为无法验证其较早的前缀。共享提供程序缓存密钥的后台会话保留单独的诊断基线。这些警告中没有出现提示内容或摘要值。

OpenAI 服务层拒绝和降级记录包括请求的模型、账户路由、run/session ID、原始请求层和最终电汇请求层。终端响应还包括所服务的层、响应 ID/model、总输入令牌（包括缓存的输入）以及报告时的缓存令牌。更改了 `info` 的帐户目录观察日志；重复观察使用`debug`。将响应 ID 加入到提示缓存诊断中以检查相同的完成情况；仅降级并不能证明缓存未命中。这些是原始文件日志字段，并遵循出口处的常见编辑规则。

### <a id="console-styles"></a> 控制台样式

`logging.consoleStyle` 接受 `pretty` 或 `json`：

- `pretty`：人性化、彩色、带时间戳。
- `json`：每行 JSON（对于日志处理器）。

当 stdout 不是 TTY 时，会自动应用第三种渲染样式 `compact`（更紧密的输出，最适合长时间会话）。它不再是一个可设置的配置值； `openclaw doctor --fix` 将存储的 `consoleStyle: "compact"` 映射到 `"pretty"`。

### <a id="redaction"></a> 修订

文件日志存储具有仅限所有者 （`0600`） 权限的原始记录。当通过 `logs.tail`（CLI 或 Control UI）读取日志、打印到控制台或通过 diagnostic/support 捆绑包和 OpenTelemetry 导出日志时，OpenClaw 会屏蔽敏感值。直接文件读取是原始的：在共享之前保护和审查它们。日志消息应包含 ID、大小和结果，而不是消息文本、提示、工具参数或工具结果。配置快照、审核输出以及带有凭据的 URL 和命令行选项保留其凭据屏蔽。

网关代理入口通过结果和会话记录返回回复，而不将它们回显到服务日志。嵌套代理回复不会打印到日志中。交互式 `openclaw agent` 命令仍将回复打印到标准输出。停滞和卡住的会话诊断保留会话 ID、年龄、工具名称、cron 元数据和恢复结果，而无需从记录中复制助理回复。

`logging.redactPatterns` 替换日志和诊断的默认正则表达式字符串列表。表单主体的内置结构保护、结构化授权标头和裸 AWS 秘密访问密钥始终适用，包括自定义此列表时。尽最大努力进行编辑；在共享诊断导出之前先检查它们。

如果列表包含格式错误或被拒绝的模式，OpenClaw 会跳过这些条目，保留有效模式并添加默认保护。它每个进程警告一次，而不打印拒绝的值。更正您的配置中的 `logging.redactPatterns`；目录检查和Doctor仍然可以报告配置错误。

工具参数和结果不是秘密屏蔽的。这包括模型上下文、会话记录、Control UI 中的工具事件和摘要、会话历史记录和搜索结果以及 `.env` 文件的读取。 `API_TOKEN = computeToken()`等源码及模型不变。现有的大小限制、媒体处理和历史可见性规则仍然适用。

活动会话记录位于 [per-agent SQLite 数据库](/reference/database-schemas#database-layout) 中。它们可以包含由工具返回或在对话中提供的凭据和其他私人数据。保护对状态目录的访问并在共享之前查看成绩单。已经被掩盖的历史内容无法重建。

## <a id="diagnostics-and-opentelemetry"></a> 诊断与 OpenTelemetry

诊断是针对模型运行和消息流遥测（webhook、队列、会话状态）的结构化、机器可读事件。它们**不会**取代日志——而是为指标、追踪和导出器提供数据。默认情况下，事件会在进程内发出（将 `diagnostics.enabled: false` 设置为关闭它们）；导出它们是单独进行的。

当会话指令在模型执行之前拒绝轮次时，其现有的 `message.processed` 事件会报告 `outcome: "skipped"` 以及关闭的 `reason` 代码以及通常的通道、消息和会话相关性。拒绝不会将用户的消息、模型令牌或错误回复添加到该事件。

两个相邻的界面：

- **OpenTelemetry export** — 通过 OTLP/HTTP 将指标、跟踪和日志发送到任何 OpenTelemetry- 兼容的收集器或后端（Datadog、Grafana、Honeycomb、New Relic、 Tempo等）。完整配置、信号目录、metric/span 名称、环境变量和隐私模型位于专用页面上：[OpenTelemetry export](/gateway/opentelemetry)。
- **诊断标志** — 定向调试日志标志，将额外日志路由到 `logging.file`，而不会提高 `logging.level`。标志不区分大小写，并支持通配符（`telegram.*`、`*`）。在 `diagnostics.flags` 下配置，或通过 `OPENCLAW_DIAGNOSTICS=...` 环境变量覆盖。完整指南：[诊断标志](/diagnostics/flags)。

关于向收集器进行 OTLP 导出，请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。

## <a id="troubleshooting-tips"></a> 故障排除提示

- **网关无法访问？** 首先运行`openclaw doctor`。
- **日志为空？** 检查网关是否正在运行并写入 `logging.file` 中的文件路径。
- **需要更多详细信息？** 将 `logging.level` 设置为 `debug` 或 `trace` 并重试。

## <a id="related"></a> 相关内容

- [OpenTelemetry 导出](/gateway/opentelemetry) — OTLP/HTTP 导出、metric/span 目录、隐私模型
- [诊断标志](/diagnostics/flags) — 有针对性的调试日志标志
- [Gateway 日志内部机制](/gateway/logging) — WS 日志样式、子系统前缀和控制台捕获
- [配置参考](/gateway/config-observability#diagnostics) — 完整的`diagnostics.*`现场参考
- [`openclaw logs`](/cli/logs) — 尾部网关从 CLI 通过 RPC 进行日志记录
