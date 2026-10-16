---
summary: "模型可见的 exec 和 wait 合约、隐藏的工具目录和名称冲突"
title: "代码模式工具界面"
doc-schema-version: 1
read_when:
  - "您正在查看模型看到的紧凑工具合同"
  - "您需要 exec 或 wait 输入和结果形状"
  - "您需要目录排序、工具搜索交互或碰撞规则"
---

## <a id="model-visible-tools"></a> 模型可见工具

当代码模式处于活动状态时，模型会看到 `exec`、`wait`、启用的 `message` 工具以及任何所需的直接工具。保持 `message` 在回复传递模式中可见可以保留对话的工具前缀。所有其他启用的工具都从面向模型的工具列表中隐藏，并在代码模式目录中注册。

执行受限的后台运行保留已承认的目录描述以供快速重用。他们的执行权限仍然适用于每次调用；来宾中未安装受限制的 Swarm 全局变量。

使用 `exec` 进行工具编排、数据连接、循环、并行嵌套调用和结构化转换。仅当 `exec` 返回可恢复的 `waiting` 结果时才使用 `wait`。

## `exec`

`exec` 在新的 JavaScript 上下文中启动代码模式单元并返回一个结果。变量、函数和导入永远不会在单元之间传递。 `await store(key, value)` 和 `await load(key)` 在同一会话（包括重新启动）中跨单元和轮次保持较小的 JSON 值。有关限制和提交规则，请参阅 [ 会话存储 ](/tools/code-mode/guest-api#session-store)。输入代码是模型生成的，必须被视为敌对代码。

面向模型的输入：

```typescript
type CodeModeExecInput = {
  title: string;
  code: string;
  restartSafe?: boolean;
  awaitResults?: boolean;
};
```

规则：

- 每个新单元格都需要一个最多 120 个字符的非空白 `title`。使用简短的目的，通常为 3-7 个单词，例如“检查依赖图”。描述预期的工作，但不声称成功或包含秘密。 Control UI 在执行行上显示此标题。嵌套工具保留自己的摘要； `wait` 不需要标题并在原始单元格下恢复活动。
- `code` 是必需的面向模型的 JavaScript 字段，并且必须为非空。
- `command` 被接受作为钩子策略和可信重写的 exec 兼容别名（正常的 OpenClaw shell exec 工具也使用 `command` 字段）。空白呼叫者别名被视为不存在；使一个填充的别名（空白或非字符串）无效的挂钩或可信策略会使两者都无效，因此执行被阻止。当两个别名都不为空时，它们的值必须匹配。
- 写为普通 JavaScript。不接受 TypeScript 注释、接口和其他 TypeScript-only 语法。工具签名和 `API.read` 声明仍然可用作编写调用的文档。
- `API.read(path)` 返回 `{ path, description, content, bytes }`，而不是字符串。使用 `(await API.read(path)).content` 作为声明文本。
- 已停用的 `language` 和 `typecheck` 字段被拒绝为 `invalid_input`。当每个调用到达其正常执行所有者时，工具参数将被验证；代码模式在执行之前不会对整个程序进行类型检查。
- 不设置`restartSafe`在一个新的`exec`。将其设置为`true`仅当OpenClaw网关重新启动后显式请求重播，并且永远不会`write`， `edit`， `exec`，或任何突变。每个目录调用都必须明确重播安全。OpenClaw拒绝未标记的目录工具和未证明重放安全的命名空间表面。通用执行表面并不是重放安全的，仅仅因为一个命令显示为只读；使用审核的读取、grep 或查找工具。暂停的结果被标记为重播安全，因此[重新启动恢复](/gateway/restart-recovery)可以从其转录本重建中断的回合，而不是恢复进程本地延续。恢复仍然仅限于经过审核的只读核心工具和明确的重放安全插件工具。`store`和`load`不可用于`restartSafe`细胞。对于普通调用，请忽略该字段。
- `exec` 会拒绝 `import`、`require`、动态 import 以及模块加载器模式。
- `exec` 从不递归暴露普通 shell `exec` 实现。
- Outer 代码模式 `exec` 挂钩事件携带 `toolKind: "code_mode_exec"` 和 `toolInputKind: "javascript"`，因此策略可以区分代码模式单元和共享相同工具名称的 shell 样式 `exec` 调用。

结果：

```typescript
type CodeModeResult = CodeModeCompletedResult | CodeModeWaitingResult | CodeModeFailedResult;

type CodeModeCompletedResult = {
  status: "completed";
  value: unknown;
  warnings?: string[];
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeWaitingResult = {
  status: "waiting";
  runId: string;
  reason: "pending_tools" | "yield";
  pendingToolCalls?: CodeModePendingToolCall[];
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeFailedResult = {
  status: "failed";
  error: string;
  code?: CodeModeErrorCode;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};
```

当来宾以可恢复状态挂起且仍需要模型可见的延续时，`exec` 返回 `waiting` - 显式 `yield_control(...)` 或在执行截止日期内尚未解决的桥接工具调用。结果包括 `wait` 的 `runId`。本机通道执行批准有所不同：在运营商决策悬而未决时，OpenClaw 暂停代码模式执行预算和所属代理运行预算。原始 `exec` 仍处于飞行状态，然后在批准解决后以其未使用的预算恢复；它不返回 `pending_tools` 或需要通过 `wait` 进行模型轮询。如果来宾在同级呼叫等待批准时明确让步，则单元在停车时会继续观察该批准。其下一个 `wait` 也暂停以等待待决决定。每个调用仅收到自己未使用的执行预算；停放时间和之前调用的批准暂停不会增加执行信用。取消、所有者检查和延续到期保持不变。桥接请求（`catalog.search`、句柄 `describe()`、可调用工具句柄和包括 MCP 在内的命名空间调用）在同一 `exec`/`wait` 调用内自动排出，同时在截止日期内解决，因此等待多个工具的紧凑代码块在一个模型轮中运行完成，而不是每次等待强制调用一个模型工具。不带 `yieldMs` 或 `background: true` 的桥接 shell `exec` 会等待剩余调用预算（`tools.codeMode.timeoutMs`，默认 10 秒）减去后台运行前的恢复边距，因此在该窗口内完成的命令会在同一轮中返回内联。后期顺序调用后台会更快，并且仍然返回其进程句柄，以便来宾可以恢复内联。

仅当来宾 VM 没有挂起的工作并且 OpenClaw 的输出适配器运行后最终值与 JSON- 兼容时，`exec` 才会返回 `completed`。

新的 `exec` 和 `wait` 结果文本使用紧凑的 JSON 为工具数据留下更多上下文预算。保留状态、延续、重放安全、遥测和结构化 `details` 字段。 JSON 字符串内的文本保留其原始空白。 TUI 将这些结果显示为文字文本，因此 Markdown 语法和长令牌格式无法更改其值。 URL 仍以文本形式可见，而不是成为 Markdown 链接。

### <a id="required-results"></a> 必填结果

当需要该程序的结果来完成当前任务时，请使用 `awaitResults: true`。现有单元所有者在 VM 停止时保持工具调用打开，然后在待处理的工具结果稳定后恢复确切的继续。它不返回 `waiting` 句柄或进行模型轮询调用。已完成的操作不会重播。故障、停止、所有者更换以及现有运行和工具最后期限仍然会结束操作。

`awaitResults`仅暂停-VM工具等待。准备、来宾执行、检查点和恢复共享原始执行津贴；每个定居点都**不是**给予新的津贴。输出、内存、挂起呼叫和活动单元限制保持不变。`yield_control`不能放弃未完成的所需程序；完成程序或取消所属运行。普通细胞保留其现有的显式屈服行为。

必需的单元收集普通 shell 命令以完成。显式 `background: true` 仍然是有意分离的服务器的选择退出。普通电池内部的外壳 `exec({awaitResults: true, ...})` 或 `agents_wait({awaitResults: true, ...})` 也使得该电池成为必需的。这些声明不启用 `tools.exec.notifyOnExit`。

对于所需的收集器结果，请在所需的单元格中等待 `agents.run(...)`，或致电 `agents_wait({ids, awaitResults: true})`。普通播报子仍然使用现有的 `sessions_yield` 切换。接受的后台句柄不是最终结果：此功能不会从计划文本中推断义务，也不会默默地将每个异步服务转变为所需的工作。

### <a id="source-in-session-history"></a> 会话历史记录中的源

代码模式执行并保留原始工具输入，无需秘密屏蔽。源、凭证文字、嵌套工具参数和返回的文本将其内容保留在模型上下文和会话历史记录中，但受大小和媒体限制。 `logging.redactPatterns` 适用于日志和诊断，而不是存储源。已经被掩盖的历史来源无法重建。

## `wait`

`wait` 会继续一个暂停的代码模式 VM。

输入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

输出与 `exec` 返回的 `CodeModeResult` 并集相同。

`wait` 的存在是因为嵌套的 OpenClaw 工具可能会很慢、交互式或流式传输部分更新；当主机等待普通外部工作时，该模型不需要保持一个长的 `exec` 调用打开。本机通道执行批准是例外：它们保留在原始 `exec` 内，因此批准权限仍然与已承认的运行绑定。

快速内联主机交换保留相同的执行上下文。显式的收益或耗尽的调用预算可以暂停它，而无需重放工具。 Node 保留实时工作环境； QuickJS对其VM进行快照并可以释放worker。 QuickJS 工作池压力还可以在同一调用中内部停放单元。实际的 QuickJS 检查点强制执行 `maxSnapshotBytes`，因此大型活动堆可能会完成内联，但在必须真正停放时会失败。

两个执行者使用相同的 `wait` 合约：

1. `exec` 会执行代码，直到完成、失败或挂起。
2. 暂停时，选定的执行程序保留其延续性，并且 OpenClaw 记录挂起的主机工作。
3. 当挂起的工作解决时，`wait`恢复相同的执行器。 Node 继续其实时上下文； QuickJS 恢复其快照并重新注册回调。
4. OpenClaw 提供嵌套工具结果并让 JavaScript 延续运行。
5. `wait` 返回 `completed`、`failed` 或另一个 `waiting` 结果。

延续是运行时状态，而不是用户工件：它们的所有权仅存在于进程内映射中（无数据库或磁盘写入），它们会过期，并且它们的范围仅限于创建它们的运行和会话。 QuickJS 快照有大小限制； Node 保留实时工作内存。请参阅 [ 代码模式执行器 ](/tools/code-mode/executors#understand-waits-and-limits)。一个单元所有者负责初始执行、暂停和每次恢复。取消所属运行或当前工具调用，或在尝试拆卸时关闭其工具目录，会取消活动工作线程和挂起的主机工作并释放停放的延续，即使随后没有 `wait` 调用也是如此。目录描述刷新和客户端工具添加不会关闭所有者。忽略取消的外部操作可能仍会完成，但无法恢复已关闭的来宾、发出稍后的来宾输出或启动另一个来宾工具调用。

64 个时隙的进程范围限制适用于挂起的单元及其保留的恢复时隙。简历会保留其位置，直到完成或再次停放；初始执​​行在分派主机工作之前保留一个槽位，并通过实时执行和内部停放保留它。没有主机工作的单元不消耗槽。

快照 TTL 测量单元停放时的空闲时间。承认的 `wait` 使单元在其调用截止日期内保持活动状态，同时等待工具解决。如果该调用再次返回 `waiting`，则停放会启动新的快照 TTL。

当出现以下情况时，`wait` 会失败（作为 `failed` 结果）：

- `runId` 未知或其延续已过期。
- 调用者与挂起的运行不在同一 run/session 范围内。
- a `wait` 已在为该 `runId` 飞行。
- 所选执行程序无法恢复（例如，其工作线程退出或 QuickJS 恢复失败）。
- a QuickJS 检查点将超过 `maxSnapshotBytes`。普通超大成功输出被截断并保持成功。

不可用或过期的 ID 并不能证明早期操作无效。在继续之前查看之前的 `exec` 和 `wait` 结果；不要仅仅因为原始操作的延续不再可恢复而重播原始操作。如果另一个 `wait` 已经恢复相同的运行，则使用该等待的结果而不是启动并发等待。

后台 shell `sessionId` 不是代码模式 `runId`。当本机进程工具可用时，诊断会为其可调用名称命名，以便您可以在新的 `exec` 中使用 `action: "poll"` 轮询同一 shell 会话。不要再次启动该命令。

## <a id="tool-catalog"></a> 工具目录

隐藏目录在经过有效策略过滤后，按顺序包含以下工具：OpenClaw 核心工具、捆绑插件工具、外部插件工具、MCP 工具，然后是客户端在运行时当前提供的工具。

目录 ID 仍然是不透明的仅主机路由标识。它们在一次运行中是稳定的，并且在可能的情况下在等效工具集中是相同的，但它们永远不会包含在提示、来宾元数据、句柄描述或错误中。策略、批准、遥测、重放安全和命名空间调度继续在内部使用它们。

在工作程序开始之前，OpenClaw 为每个确切的工具名称预测一个有效的获胜者，并计算其最终的来宾可调用名称。这与直接模式优先级匹配：后来的客户端工具赢得了确切名称的影子，而插件冲突强制保持不变。最终的投影是通过桥接调用和继续恢复进行的；消费者不会从目录中重建它。

该目录省略了代码模式控制工具（`exec`、`wait`、`tool_search`、`tool_describe`、`dispatch_action`）和仅直接工具。控件不得在目录中递归；仅直接工具保持模型可见，因为它们的结构化结果无法跨越 JSON 访客桥。

MCP 条目保留在运行范围的目录中，因此策略、批准、挂钩、遥测、转录本投影和确切的工具 ID 仍与正常工具执行共享。 `catalog.search(...)` 一起搜索本机和 MCP 功能并返回可调用句柄。 MCP 匹配标识其最终的 `MCP.<server>.<tool>` 路径和声明文件；调用句柄使用相同的命名空间调度程序。 `catalog.all()` 仅列出本机和客户端句柄。远程描述和模式不属于可信快速索引。

## <a id="tool-search-interaction"></a> 工具搜索交互

对于处于活动状态的运行，代码模式会取代 OpenClaw 工具搜索模型表面。

当通过强制 `true` 或 `"auto"` 激活进入代码模式时：

- OpenClaw 不会将 `tool_search`、`tool_describe` 或 `dispatch_action` 公开为模型可见工具。
- 相同的目录编制思路会移入 guest 运行时内部。
- 来宾运行时接收裸异步全局变量以及本机工具的可调用 search/describe 句柄，以及按需 MCP 搜索句柄。
- MCP 调用直接或通过搜索句柄使用生成的 `MCP` 命名空间；处理 `describe()` 请求确切的 `$api()` 标头和架构。
- 嵌套调用会通过与 Tool Search 相同的 OpenClaw 执行器路径进行分发。

请参阅 [Tool Search](/tools/tool-search)，了解代码模式取代活动运行的 OpenClaw 结构化目录表面。

## <a id="tool-names-and-collisions"></a> 工具名称和冲突

模型可见的 `exec` 工具是 code-mode 工具。如果启用了普通的 OpenClaw shell `exec` 工具，它对模型是隐藏的，并且会像其他任何工具一样被编入目录。

在 guest runtime 内部：

- 准确的 JavaScript- 安全工具名称保持准确：`web_search(...)` 和 `sessions_spawn(...)`。
- 无效的标识符字符变为`_`；仍然无效的第一个字符将获得 `tool_` 前缀。例如，当该名称免费时，`llm-task` 会变为 `llm_task`。
- JavaScript 保留字、专用全局变量和规范化冲突接收从仅主机身份派生的稳定短后缀。
- 精确的安全名称赢得了无后缀的拼写。原始工具永远不会覆盖 `catalog`、`MCP`、`API`、`nodes`、`skills`、`namespaces`、`results`、`store`、`load`、 output/timer 帮助程序，或可选的 Swarm 全局变量。
- 当策略允许时，普通 shell `exec` 工具可作为 `exec(...)` 来宾全局进行调用。代码模式控制 `exec` 在客户机内部不可递归使用。
