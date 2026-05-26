---
summary: "OpenClaw 代码模式：由 QuickJS-WASI 和隐藏的运行范围工具目录提供支持的可选 exec/wait 工具界面"
title: "代码模式"
sidebarTitle: "代码模式"
read_when:
  - 你希望为某次 agent 运行启用 OpenClaw 代码模式
  - 你需要解释为什么代码模式不同于 Codex Code mode
  - 你正在审查 exec/wait 合约、QuickJS-WASI 沙箱、TypeScript 转换，或隐藏的工具目录桥接
---

代码模式是 OpenClaw agent-runtime 的一项实验性功能。它默认关闭。启用后，OpenClaw 会改变模型在一次运行中看到的内容：模型不再直接看到所有已启用工具的 schema，而只会看到 `exec` 和 `wait`。

本页说明 OpenClaw 代码模式。它不是 Codex Code mode。二者
名称相同，但由不同的运行时实现，并暴露不同的
`exec` 合约：

- Codex Code Mode 默认对 Codex app-server 线程启用，除非受限的
  工具策略禁用了原生代码模式。它运行在 Codex coding harness 中，
  模型通过 `exec.command` 合约编写 shell 命令。
- OpenClaw code mode 默认关闭，除非配置了
  `tools.codeMode.enabled: true`。它运行在 OpenClaw 通用 agent runtime 中，
  模型通过 `exec.code` 合约编写 JavaScript 或 TypeScript 程序。

Codex Code Mode 和 Codex 原生动态工具搜索是稳定的 Codex harness
接口。OpenClaw 代码模式是 OpenClaw 自有的实验性工具表面适配器，面向
通用 OpenClaw 运行。它使用 `quickjs-wasi`、一个隐藏的 OpenClaw
工具目录，以及正常的 OpenClaw 工具执行器。

## 这是什么？

OpenClaw 代码模式允许模型编写一小段 JavaScript 或 TypeScript 程序，而不是直接从长长的工具列表中选择。

当代码模式处于激活状态时：

- 模型可见的工具列表只有 `exec` 和 `wait`。
- `exec` 在受限的 QuickJS-WASI worker 中执行模型生成的 JavaScript 或 TypeScript。
- 正常的 OpenClaw 工具对模型提示是隐藏的，并通过 `ALL_TOOLS` 和 `tools` 暴露到 guest 程序中。
- guest 代码可以搜索隐藏目录、描述某个工具，并通过与正常 agent 回合相同的 OpenClaw 执行路径调用工具。
- 当嵌套工具调用仍在等待时，`wait` 会恢复一个挂起的代码模式运行。

关键区别在于：代码模式改变的是面向模型的编排界面。它不会替代 OpenClaw 工具、插件工具、MCP 工具、认证、审批策略、通道行为或模型选择。

## 这为什么有用？

代码模式让大型工具目录更易于模型使用。

- 更小的提示面：提供方接收到的是两个控制工具，而不是数十或数百个完整的工具 schema。
- 更好的编排：模型可以在一个代码单元中使用循环、连接、小型转换、条件逻辑和并行的嵌套工具调用。
- 提供方中立：它适用于 OpenClaw、插件、MCP 和客户端工具，而不依赖提供方原生的代码执行。
- 现有策略保持生效：嵌套工具调用仍然会经过 OpenClaw 的策略、审批、钩子、会话上下文和审计路径。
- 清晰的失败模式：当代码模式被显式启用而运行时不可用时，OpenClaw 会失败关闭，而不是退回到广泛的直接工具暴露。

对于拥有大量已启用工具目录的 agent，或者对于模型需要在给出答案前反复搜索、组合和调用工具的工作流，代码模式尤其有用。

## 如何启用

在 agent 或运行时配置中添加 `tools.codeMode.enabled: true`：

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

也接受简写形式：

```json5
{
  tools: {
    codeMode: true,
  },
}
```

当 `tools.codeMode` 被省略、设置为 `false`，或者是一个不含 `enabled: true` 的对象时，代码模式保持关闭。

当你希望更严格的边界时，请使用显式限制：

```json5
{
  tools: {
    codeMode: {
      enabled: true,
      timeoutMs: 10000,
      memoryLimitBytes: 67108864,
      maxOutputBytes: 65536,
      maxSnapshotBytes: 10485760,
      maxPendingToolCalls: 16,
      snapshotTtlSeconds: 900,
      searchDefaultLimit: 8,
      maxSearchLimit: 50,
    },
  },
}
```

要在调试时确认模型负载形状，请使用有针对性的日志运行 Gateway：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

在代码模式激活时，日志中面向模型的工具名称应该是 `exec` 和 `wait`。如果你需要被脱敏的提供方负载，请在短时间调试会话中添加 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。

## 技术导览

本页其余部分描述运行时合约和实现细节。它面向维护者、调试工具暴露的插件作者，以及验证高风险部署的操作人员。

## 运行状态

- 运行时：[`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)。
- 默认状态：禁用。
- 稳定性：OpenClaw 的实验性界面；Codex Code mode 是一个独立的稳定 Codex harness 界面。
- 目标范围：通用 OpenClaw agent 运行。
- 安全态势：模型代码是不可信的。
- 面向用户的承诺：启用代码模式时，绝不会悄悄回退到广泛的直接工具暴露。

## 范围

代码模式负责一次已准备运行中的面向模型的编排形状。它不负责模型选择、通道行为、认证、工具策略或工具实现。

范围内：

- 面向模型可见的 `exec` 和 `wait` 工具定义
- 隐藏工具目录构建
- JavaScript 和 TypeScript guest 执行
- QuickJS-WASI worker 运行时
- 用于目录搜索、schema 描述和工具调用的 host 回调
- 挂起 guest 程序的可恢复状态
- 输出、超时、内存、待处理调用和快照限制
- 嵌套工具调用的遥测和轨迹投影

范围外：

- 提供方原生的远程代码执行
- shell 执行语义
- 更改现有工具授权
- 持久化的用户编写脚本
- guest 代码中的包管理器、文件、网络或模块访问
- 直接复用 Codex Code mode 内部实现

诸如远程 Python 沙箱之类由提供方拥有的工具仍然是独立工具。参见
[Code execution](/tools/code-execution)。

## 术语

**代码模式** 是 OpenClaw 的运行时模式，它隐藏正常模型工具并仅暴露 `exec` 和 `wait`。

**Guest 运行时** 是执行模型代码的 QuickJS-WASI JavaScript VM。

**Host 桥接** 是从 guest 代码回到 OpenClaw 的窄 JSON 兼容回调界面。

**目录** 是在正常工具策略、插件、MCP 和客户端工具解析之后的运行范围内有效工具列表。

**嵌套工具调用** 是通过 host 桥接从 guest 代码发起的工具调用。

**快照** 是序列化的 QuickJS-WASI VM 状态，保存后 `wait` 可以继续一个挂起的代码模式运行。

## 配置

`tools.codeMode.enabled` 是激活开关。仅设置其他代码模式字段不会启用该功能。

支持的字段：

- `enabled`: boolean。默认 `false`。仅在 `true` 时启用代码模式。
- `runtime`: `"quickjs-wasi"`。唯一支持的运行时。
- `mode`: `"only"`。暴露 `exec` 和 `wait`，隐藏正常模型工具。
- `languages`: 包含 `"javascript"` 和 `"typescript"` 的数组。默认两者都包含。
- `timeoutMs`: 单次 `exec` 或 `wait` 的墙钟时间上限。默认 `10000`。
  运行时限制：`100` 到 `60000`。
- `memoryLimitBytes`: QuickJS 堆上限。默认 `67108864`。运行时限制：
  `1048576` 到 `1073741824`。
- `maxOutputBytes`: 返回文本、JSON 和日志的上限。默认 `65536`。
  运行时限制：`1024` 到 `10485760`。
- `maxSnapshotBytes`: 序列化 VM 快照的上限。默认 `10485760`。
  运行时限制：`1024` 到 `268435456`。
- `maxPendingToolCalls`: 并发嵌套工具调用的上限。默认 `16`。
  运行时限制：`1` 到 `128`。
- `snapshotTtlSeconds`: 挂起的 VM 可恢复的时长。默认 `900`。
  运行时限制：`1` 到 `86400`。
- `searchDefaultLimit`: 默认隐藏目录搜索结果数量。默认 `8`。
  运行时会将其限制到 `maxSearchLimit`。
- `maxSearchLimit`: 隐藏目录搜索结果数量的最大值。默认 `50`。
  运行时限制：`1` 到 `50`。

如果启用了代码模式但 QuickJS-WASI 无法加载，OpenClaw 会对该次运行失败关闭。它不会为了回退而静默暴露正常工具。

## 激活

代码模式在已知有效工具策略之后、最终模型请求组装之前进行评估。

激活顺序：

1. 解析 agent、模型、提供方、沙箱、通道、发送方和运行策略。
2. 构建有效的 OpenClaw 工具列表。
3. 添加符合条件的插件、MCP 和客户端工具。
4. 应用允许和拒绝策略。
5. 如果 `tools.codeMode.enabled` 为 false，则继续使用正常的工具暴露。
6. 如果已启用且该运行有可用工具，则将有效工具注册到代码模式目录中。
7. 从模型可见的工具列表中移除所有正常工具。
8. 添加代码模式的 `exec` 和 `wait`。

那些刻意没有工具的运行，例如原始模型调用、`disableTools`，或空白允许列表，即使配置中包含 `tools.codeMode.enabled: true` 也不会激活代码模式界面。

代码模式目录是运行范围内的。它不得泄露来自其他 agent、会话、发送方或运行的工具。

## 模型可见工具

当代码模式激活时，模型只会看到以下顶层工具：

- `exec`
- `wait`

所有其他已启用工具都会对模型可见工具列表隐藏，并注册到代码模式目录中。

模型应使用 `exec` 来进行工具编排、数据连接、循环、并行嵌套调用和结构化转换。模型仅在 `exec` 返回可恢复的 `waiting` 结果时才应使用 `wait`。

## `exec`

`exec` 启动一个代码模式单元并返回一个结果。输入代码由模型生成，必须被视为不可信。

输入：

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

输入规则：

- One of code or command must be non-empty.
- code is the documented model-facing field.
- command is accepted as an exec-compatible alias for hook policies and
  trusted rewrites; when both are present, the values must match.
- Outer code-mode exec hook events include toolKind: "code_mode_exec" and
  include toolInputKind: "javascript" | "typescript" when the input language
  is known, so policies can distinguish code-mode cells from shell-style exec
  calls that share the same tool name.
- language defaults to "javascript".
- If language is "typescript", OpenClaw transpiles before evaluation.
- exec rejects import, require, dynamic import, and module-loader patterns
  in v1.
- exec does not expose the normal shell exec implementation recursively.

结果：

```typescript
type CodeModeResult = CodeModeCompletedResult | CodeModeWaitingResult | CodeModeFailedResult;

type CodeModeCompletedResult = {
  status: "completed";
  value: unknown;
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

当 QuickJS VM 以可恢复状态挂起时，`exec` 返回 `waiting`。该结果包含供 `wait` 使用的 `runId`。

当 guest VM 没有待处理工作，并且在 OpenClaw 的输出适配器运行后最终值与 JSON 兼容时，`exec` 才返回 `completed`。

## `wait`

`wait` 会继续一个暂停的代码模式 VM。

输入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

输出与 `exec` 返回的 `CodeModeResult` 联合类型相同。

之所以存在 `wait`，是因为嵌套的 OpenClaw 工具可能很慢、需要交互、受审批门控，或会流式返回部分更新。模型不应在主机等待外部工作时，持续保持一个很长的 `exec` 调用处于打开状态。

QuickJS-WASI 的快照与恢复是 v1 的恢复机制：

1. `exec` 执行代码，直到完成、失败或暂停。
2. 暂停时，OpenClaw 对 QuickJS VM 进行快照，并记录挂起的主机工作。
3. 当挂起工作结束后，`wait` 恢复 VM 快照。
4. OpenClaw 通过稳定名称重新注册主机回调。
5. OpenClaw 将嵌套工具结果交付给恢复后的 VM。
6. OpenClaw 清空 QuickJS 的挂起任务。
7. `wait` 返回 `completed`、`failed` 或另一个 `waiting` 结果。

快照是运行时状态，不是用户产物。它们有大小限制、会过期，并且仅作用于创建它们的运行和会话范围。

`wait` 在以下情况下失败：

- `runId` 未知。
- 快照已过期。
- 父运行或会话已被中止。
- 调用者不在同一运行/会话范围内。
- QuickJS-WASI 恢复失败。
- 恢复会超出配置的限制。

## Guest runtime API

guest runtime 暴露一个小型全局 API：

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` 是运行范围目录的紧凑元数据。默认情况下不包含完整 schema。

```typescript
type ToolCatalogEntry = {
  id: string;
  name: string;
  label?: string;
  description: string;
  source: "openclaw" | "plugin" | "mcp" | "client";
  sourceName?: string;
};
```

完整 schema 仅按需加载：

```typescript
type ToolCatalogEntryWithSchema = ToolCatalogEntry & {
  parameters: unknown;
};
```

目录辅助函数：

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogEntry[]>;
  describe(id: string): Promise<ToolCatalogEntryWithSchema>;
  call(id: string, input?: unknown): Promise<unknown>;
  [safeToolName: string]: unknown;
};
```

仅当安全名称没有歧义时，才会安装便捷工具函数：

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// 如果隐藏目录中有一个无歧义的 `web_search` 条目：
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

guest runtime 不得直接暴露主机对象。输入和输出通过 JSON 兼容值跨越桥接，并带有明确的大小上限。

## Output API

`text(value)` 会将可读文本追加到 `output` 数组。

`json(value)` 会在进行 JSON 兼容序列化后，追加一个结构化输出项。

guest 代码最终返回的值会成为 `completed` 结果中的 `value`。

输出项：

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

输出规则：

- 输出顺序与 guest 调用顺序一致
- 输出受 `maxOutputBytes` 限制
- 不可序列化的值会转换为普通字符串或错误
- v1 不支持二进制值
- 图像和文件通过普通 OpenClaw 工具传递，而不是通过
  code-mode bridge

## Tool catalog

隐藏目录在经过有效策略过滤后包含以下工具：

1. OpenClaw 核心工具。
2. 捆绑的插件工具。
3. 外部插件工具。
4. MCP 工具。
5. 当前运行的客户端提供的工具。

目录 id 在单次运行内是稳定的，并且在可能时，对于等价的工具
集合是确定性的。

推荐的 id 形式：

```text
<source>:<owner>:<tool-name>
```

示例：

```text
openclaw:core:message
plugin:browser:browser_request
mcp:github:create_issue
client:app:select_file
```

目录不包含 code-mode 控制工具：

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

这可以防止递归，并保持面向模型的合约足够精简。

## Tool Search 交互

当 code mode 处于激活状态时，它会取代 PI Tool Search 的模型表面。

当 `tools.codeMode.enabled` 为 true 且 code mode 激活时：

- OpenClaw 不会将 `tool_search_code`、`tool_search`、`tool_describe`
  或 `tool_call` 作为模型可见工具暴露出来。
- 同样的目录化思路会迁移到 guest runtime 内部。
- guest runtime 会接收紧凑的 `ALL_TOOLS` 元数据，以及 search、describe
  和 call 辅助函数。
- 嵌套调用通过 Tool Search 使用的同一 OpenClaw 执行路径进行分发。

现有的 [Tool Search](/tools/tool-search) 页面描述的是 PI 紧凑
目录桥接。对于可以使用 `exec` 和 `wait` 的运行，code mode 是通用的
OpenClaw 替代方案。

## Tool 名称和冲突

模型可见的 `exec` 工具是 code-mode 工具。如果常规的 OpenClaw
shell `exec` 工具已启用，它会对模型隐藏，并像其他工具一样被收录
到目录中。

在 guest runtime 内部：

- 如果策略允许，`tools.call("openclaw:core:exec", input)` 可以调用 shell exec 工具。
- 只有当 shell exec 目录条目有一个无歧义的安全名称时，才会安装 `tools.exec(...)`。
- code-mode 的 `exec` 工具绝不会通过 `tools` 递归可用。

如果两个工具归一化后得到相同的安全便捷名称，OpenClaw 会省略
该便捷函数，并要求使用 `tools.call(id, input)`。

## 嵌套工具执行

每一次嵌套工具调用都会跨越主机桥接并重新进入 OpenClaw。

嵌套执行会保留：

- 活动 agent id
- session id 和 session key
- sender 和 channel 上下文
- sandbox 策略
- 审批策略
- 插件 `before_tool_call` 钩子
- 中止信号
- 可用时的流式更新
- 轨迹和审计事件

嵌套调用会作为真实的工具调用投影到对话记录中，这样支持包
可以展示发生了什么。该投影会标识父级 code-mode 工具调用以及
嵌套工具 id。

允许并行嵌套调用，最多可达 `maxPendingToolCalls`。

## 运行时状态

每个 code-mode 运行都有一个状态机：

- `running`：VM 正在执行，或有嵌套调用在飞行中。
- `waiting`：VM 快照已存在，可通过 `wait` 恢复。
- `completed`：已返回最终值；快照已删除。
- `failed`：已返回错误；快照已删除。
- `expired`：快照或挂起状态超过保留期；无法恢复。
- `aborted`：父运行/会话已取消；快照已删除。

状态按 agent 运行、会话和工具调用 id 进行作用域划分。来自不同
运行或会话的 `wait` 调用会失败。

快照存储是有边界的：

- 每次运行的最大快照字节数
- 每个进程的最大活动快照数
- 快照 TTL
- 运行结束时清理
- 在不支持持久化时，于 Gateway 关闭时清理

## QuickJS-WASI runtime

OpenClaw 会在所属包中将 `quickjs-wasi` 作为直接依赖加载。该
runtime 不依赖于为代理、PAC 或其他无关依赖安装的传递副本。

runtime 职责：

- 编译或加载 QuickJS-WASI WebAssembly 模块
- 为每次 code-mode 运行或恢复创建一个隔离的 VM
- 通过稳定名称注册主机回调
- 设置内存和中断限制
- 执行 JavaScript
- 清空挂起任务
- 对暂停的 VM 状态进行快照
- 为 `wait` 恢复快照
- 在终态后释放 VM 句柄和快照

runtime 在 worker 中运行，位于 OpenClaw 主事件循环之外。guest 的
无限循环不应无限期阻塞 Gateway 进程。

## TypeScript

TypeScript 支持仅通过源代码转换实现：

- 接受输入：一段 TypeScript 代码字符串
- 输出：由 QuickJS-WASI 评估的 JavaScript 字符串
- 不进行类型检查
- 不进行模块解析
- v1 中不支持 `import` 或 `require`
- 诊断结果以 `failed` 结果返回

TypeScript 编译器仅会在 TypeScript 单元格中按需加载。纯
JavaScript 单元格和已禁用的 code mode 不会加载编译器。

在可行的情况下，转换应尽量保留有用的行号。

## 安全边界

模型代码是不可信的。runtime 采用纵深防御：

- 在主事件循环之外运行 QuickJS-WASI
- 将 `quickjs-wasi` 作为直接依赖加载，而不是通过 Codex 或传递
  包
- guest 中不提供文件系统、网络、子进程、模块导入、环境变量或
  主机全局对象
- 使用 QuickJS 内存和中断限制
- 强制执行父进程墙钟超时
- 强制执行输出、快照、日志和挂起调用上限
- 通过狭窄的 JSON 适配器序列化主机桥接值
- 将主机错误转换为普通的 guest 错误，绝不传递主机 realm 对象
- 在超时、中止、会话结束或过期时丢弃快照
- 拒绝对 `exec`、`wait` 和 Tool Search 控制工具的递归访问
- 防止便捷名称冲突覆盖目录辅助函数

sandbox 只是一个安全层。对于高风险部署，运维人员仍可能需要
操作系统级加固。

## 错误代码

```typescript
type CodeModeErrorCode =
  | "runtime_unavailable"
  | "invalid_config"
  | "invalid_input"
  | "unsupported_language"
  | "typescript_transform_failed"
  | "module_access_denied"
  | "timeout"
  | "memory_limit_exceeded"
  | "output_limit_exceeded"
  | "snapshot_limit_exceeded"
  | "snapshot_expired"
  | "snapshot_restore_failed"
  | "too_many_pending_tool_calls"
  | "nested_tool_failed"
  | "aborted"
  | "internal_error";
```

返回给 guest 的错误是普通数据。主机 `Error` 实例、堆栈对象、原型
和主机函数都不会进入 QuickJS。

## 遥测

code mode 会报告：

- 发送给模型的可见工具名称
- 隐藏目录大小和来源分布
- `exec` 和 `wait` 计数
- 嵌套 search、describe 和 call 的计数
- 被调用的嵌套工具 id
- 超时、内存、快照和输出上限失败
- 快照生命周期事件

遥测不得包含秘密、原始环境值，或超出既有 OpenClaw 轨迹策略范围的
未脱敏工具输入。

## 调试

当代码模式的行为与正常工具运行不同时，使用有针对性的模型传输日志：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

对于有效载荷形状调试，请使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。
这会记录模型请求的一个有上限、已脱敏的 JSON 快照；它只应在调试时使用，因为提示词和消息文本仍然可能出现。

对于流调试，请使用 `OPENCLAW_DEBUG_SSE=peek` 来记录前五个脱敏的 SSE 事件。如果代码模式表面已激活，但最终提供方有效载荷不包含且仅包含 `exec` 和 `wait`，代码模式也会失败关闭。

## 实现布局

实现单元：

- 配置契约：`tools.codeMode`
- 目录构建器：将有效工具压缩为条目和 id 映射
- 模型表面适配器：将可见工具替换为 `exec` 和 `wait`
- QuickJS-WASI 运行时适配器：加载、求值、快照、恢复、释放
- worker 监督器：超时、中止、崩溃隔离
- 桥接适配器：JSON 安全的宿主回调和结果传递
- TypeScript 转换适配器
- 快照存储：TTL、大小上限、运行/会话作用域
- 用于嵌套工具调用的轨迹投影
- 遥测计数器和诊断

该实现复用了 Tool Search 中的目录和执行器概念，但不使用 `node:vm` 子进程作为沙箱。

## 验证清单

代码模式覆盖应证明：

- 禁用配置不会改变现有工具暴露
- 不带 `enabled: true` 的对象配置会使代码模式保持禁用
- 启用配置在运行中工具激活时，只向模型暴露 `exec` 和 `wait`
- 原始无工具运行、`disableTools` 和空白名单不会触发代码模式有效载荷强制检查
- 所有有效工具都会出现在 `ALL_TOOLS` 中
- 被拒绝的工具不会出现在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe` 和 `tools.call` 可用于 OpenClaw 工具
- Tool Search 控制工具对模型表面和隐藏目录都不可见
- 嵌套调用会保留审批和钩子行为
- shell `exec` 对模型隐藏，但在允许时可通过目录 id 调用
- 递归的代码模式 `exec` 和 `wait` 不能从来宾代码中调用
- TypeScript 输入会被转换并求值，而不会在禁用或仅 JavaScript 路径上加载 TypeScript
- `import`、`require`、文件系统、网络和环境访问都会失败
- 无限循环会超时且不能阻塞 Gateway
- 内存上限失败会终止来宾 VM
- 对于已完成和已挂起的调用，输出和快照上限都会被强制执行
- `wait` 会恢复一个已挂起的快照并返回最终值
- 过期、已中止、错误会话以及未知的 `runId` 值都会失败
- 转录重放和持久化会保留代码模式控制调用
- 转录和遥测会清晰展示嵌套工具调用

## 端到端测试计划

在更改运行时时，请将以下内容作为集成或端到端测试运行：

1. 使用 `tools.codeMode.enabled: false` 启动一个 Gateway。
2. 发送一个带有小型直接工具集的 agent 回合。
3. 断言模型可见工具保持不变。
4. 以 `tools.codeMode.enabled: true` 重新启动。
5. 发送一个带有 OpenClaw、插件、MCP 和客户端测试工具的 agent 回合。
6. 断言模型可见工具列表恰好是 `exec`、`wait`。
7. 在 `exec` 中读取 `ALL_TOOLS` 并断言存在有效的测试工具。
8. 在 `exec` 中调用 `tools.search`、`tools.describe` 和 `tools.call`。
9. 断言被拒绝的工具缺失，且不能通过猜测的 id 调用。
10. 启动一个嵌套工具调用，在 `exec` 返回 `waiting` 后解析完成。
11. 调用 `wait` 并断言恢复的 VM 收到了工具结果。
12. 断言最终答案包含恢复后产生的输出。
13. 断言超时、中止和快照过期会清理运行时状态。
14. 导出轨迹并断言嵌套调用在父代码模式调用下可见。

仅限文档的对此页面的更改仍应运行 `pnpm check:docs`。

## 相关内容

- [工具搜索](/tools/tool-search)
- [Agent 运行时](/concepts/agent-runtimes)
- [Exec 工具](/tools/exec)
- [代码执行](/tools/code-execution)
