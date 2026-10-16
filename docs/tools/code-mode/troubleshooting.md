---
summary: "代码模式错误代码、遥测字段和调试环境变量"
title: "代码模式故障排除"
read_when:
  - "代码模式运行失败，您需要错误代码的含义"
  - "您正在阅读代码模式遥测或轨迹输出"
  - "您需要代码模式会话的调试环境变量"
---

## <a id="error-codes"></a> 错误代码

```typescript
type CodeModeErrorCode =
  | "invalid_input"
  | "runtime_unavailable"
  | "aborted"
  | "timeout"
  | "output_limit_exceeded"
  | "snapshot_limit_exceeded"
  | "internal_error";
```

`invalid_input`掩盖不好的`exec`/`wait`争论，包括退休`language`和`typecheck`字段，拒绝模块访问，JavaScript语法错误，unknown/expired/ 错误范围`runId`值以及过多的暂停运行。它还涵盖了未捕获的嵌套工具调用，该调用被主机拒绝为无效输入（`input_contract`架构不匹配或工具自身的输入错误）；该错误指出了丢失或意外的参数。其他未捕获的工具故障报告`internal_error`。客人指定的代码`error.code`切勿更改终端代码。`runtime_unavailable`涵盖不可用的执行程序或无法启动或意外退出的工作程序。检查所选的`tools.codeMode.executor`及其插件可用性；这`quickjs`执行者需要捆绑`code-mode-quickjs`运行时。尽管通用插件禁用或允许列表设置，显式选择仍会激活该捆绑包，但显式拒绝或禁用条目仍会阻止它。OpenClaw不会自动切换执行者。`aborted`表示调用者取消了活动`exec` or `wait`； OpenClaw终止工作人员或放弃暂停的运行，以便`runId`无法恢复。它不同于`timeout`，这意味着超出了执行期限。`output_limit_exceeded`为无法序列化到有界投影的结果保留；普通的超大成功结果被截断并保持成功。

在任何嵌套工具调度之前的源准备期间，JavaScript 语法错误被拒绝。有界诊断包括基于 1 的源代码行和列。格式错误的 JavaScript 在模块访问检查之前报告其语法错误。更正来源并提交新的`exec`； OpenClaw 不会自动修复或重播它。此无分派结果不会启用 `restartSafe` 或更改结果的 `replaySafe` 标志。有效来宾代码（包括 `SyntaxError`）引发的异常仍然是运行时故障。

当前解析器有一个已知的限制，即在可选的关键字命名属性（例如 `value?.return / 2 / 3`）之后立即进行除法。这是有效的 JavaScript，但源准备在工具调度之前拒绝它。将属性访问括起来：`(value?.return) / 2 / 3`。

返回给访客的错误是纯数据；主机 `Error` 实例、堆栈对象和原型不通过 JSON 结果桥传递。该桥接合约并未使 Node 执行者成为安全边界；请参见 [ 代码模式执行器 ](/tools/code-mode/executors)。

`failurePhase` 标识终端错误的来源。未捕获的拒绝工具调用报告 `"bridge"`；成功调用后出现新的 JavaScript 错误或捕获的工具拒绝报告 `"guest"`。重新抛出原始工具错误保留`"bridge"`，包括`wait`之后。网桥故障来源和代码仅来自主机回复。来宾代码无法解决其自己的待处理工具调用或伪造桥出处。

失败根源与重放安全是分开的。当 `bridgeDispatchStarted` 为 `true` 且 `replaySafe` 为 `false` 时，请在重复发送或其他更改状态的操作之前检查目标 — 即使是访客错误。失败的 `exec` 本身并不能证明消息未传递。

## <a id="telemetry"></a> 遥测

每个结果的 `telemetry` 字段报告：隐藏目录大小和源细分（`openclaw`/`mcp`/`client` 计数）、运行目录的累积 search/describe/call 计数以及代码模式控制工具名称（`exec` 和 `wait`）。 `counterScope` 标识一个计数器的生命周期，在替换或恢复目录时发生变化，但在附加工具或提示策略缩小该目录时保持稳定。

目录拆卸仅保留这些最终聚合诊断，而不保留可执行工具或 VM 状态。如果在 `wait` 正在观察待处理工作时拆卸关闭挂起的运行，则该等待将返回 `failed` 以及 `code: "aborted"` 和最终遥测数据；挂起的调用被取消，并且延续被释放。保留的诊断不授予恢复或修复已关闭运行的权限。

运行元数据（`openclaw agent --json` 中的 `meta.agentMeta`，镜像在 `agent exec --json` 信封上）添加每次运行的统计信息：

- `codeModeEngaged`： `true` 仅当代码模式实际拥有模型工具表面时。这是可靠的参与信号 - 不要从配置或工具名称推断参与：shell 工具也称为 `exec`，并且 `"auto"` 层参与每个模型功能。桥接 OpenClaw 工具表面 （Copilot） 的harness会报告其解析门，因此 `codeModeEngaged: false` 与 `tools.codeMode.enabled=true` 会产生静默无操作可观察。运行自己的本机工具表面 （Codex） 的harness从不使用 OpenClaw 代码模式，因此它们始终读取 `false`；出于同样的原因，未报告任何内容的尝试将标准化为 `false`。 Codex 自己的 `codeModeOnly` 是一个单独的本机功能，该字段不跟踪。
- `assistantTurns`：本次运行中已完成的 assistant/provider 往返次数。
- `bridgeCalls`：本次运行累计的内部桥接调用次数（`{ search, describe, call }`）。这些调用不会到达 provider；provider 可见的外部工具调用仍保留在 `meta.toolSummary.calls` 中。
- `costUsd`：根据运行的累积使用量和模型的成本配置估计 USD 成本（包括缓存 read/write 层）；当模型没有成本数据时省略。

遥测不得包含密钥、原始环境变量值，或超出现有 OpenClaw 轨迹策略之外的未脱敏工具输入。

## <a id="debugging"></a> 调试

访客异常、拒绝的输入和允许的访客截止日期均记录在 `agents/code-mode` 下的警告级别。 Worker startup/crash 故障、桥梁基础设施故障和输出合同违规仍然是错误。桥拒绝在其主机边界处记录一次，包括当访客抓住它时；未捕获的拒绝不会添加第二个预计错误记录。服务器记录在来宾投影和输出限制之前保留原始错误类、消息和堆栈头。它包括会话、代理运行、代码模式运行、外部工具调用、桥接请求和执行程序工作标识符（如果可用）。不需要调试标志。文件日志保留原始诊断信息；日志导出应用正常的编辑。

缺失或不明确的编辑锚点属于输入错误。检查当前文件后更正补丁或进行编辑。代码模式永远不会自动重试失败的访客代码或嵌套工具调用；细胞中较早的动作可能已经完成。

Node 工作线程堆耗尽报告 `runtime_unavailable` 以及配置的堆限额和对结果进行分页或保留较少来宾数据的指导。重试之前检查已完成的操作：工作线程终止不会撤消已分派的工具。 Worker生命周期退休原因`crash`记录本机Worker错误，包括堆耗尽； `gc-thrash` 通过近限 GC 看门狗识别退役。两者都与 `failurePhase: "bridge"` 报告的普通刀具报废无关。

JavaScript 标记为 `openclaw-code-mode:user.js` 的故障帧使用提交的 JavaScript 中的行号，不包括内部包装器和无头设置，包括在 `wait` 之后。新单元故障中省略了内部包装器和控制器框架；错误消息仍然共享现有的输出预算。代码模式不接受 TypeScript 源代码或生成编译器诊断。

当代码模式表现与普通工具运行不同的时候，使用有针对性的模型传输日志记录：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

对于负载形状调试，使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。 这会记录模型请求的一个带上限、已脱敏的 JSON 快照；仅在调试时使用，因为提示词和消息文本仍然可能出现。

对于流调试，请使用 `OPENCLAW_DEBUG_SSE=peek` 记录前五个经过编辑的 SSE 事件。如果最终提供程序有效负载不完全包含一个 `exec`、一个 `wait`，并且在代码模式表面激活后仅批准直接工具，则代码模式也会拒绝最终提供程序有效负载。
