---
summary: "OpenClaw 代码模式：由 QuickJS-WASI 和隐藏的运行范围工具目录提供支持的可选 exec/wait 工具界面"
title: "代码模式"
sidebarTitle: "代码模式"
read_when:
  - 你想为某次代理运行启用 OpenClaw 代码模式
  - 你需要解释为什么代码模式不同于 Codex Code mode
  - 你正在审查 exec/wait 合约、QuickJS-WASI 沙箱、TypeScript 转换，或隐藏的工具目录桥接
  - 你正在添加或审查内部代码模式命名空间注册表集成
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

- 模型可见的工具列表恰好是 `exec` 和 `wait`。
- `exec` 在受限的 QuickJS-WASI worker 中执行模型生成的 JavaScript 或 TypeScript。
- 正常的 OpenClaw 工具对模型提示是隐藏的，并通过 `ALL_TOOLS` 和 `tools` 在 guest 程序内部暴露。
- guest 代码可以搜索隐藏目录、描述某个工具，并通过正常 agent 回合使用的同一 OpenClaw 执行路径调用工具。
- MCP 工具按 `MCP` 命名空间分组。在代码模式中，这是调用 MCP 工具的唯一受支持方式。
- 当嵌套工具调用仍在等待时，`wait` 会恢复一个暂停的代码模式运行。

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

当你在使用配置了 MCP 服务器的沙箱化 agent 时，也要确保沙箱工具策略允许捆绑的 MCP 插件，例如使用 `tools.sandbox.tools.alsoAllow: ["bundle-mcp"]`。参见
[Configuration - tools and custom providers](/gateway/config-tools#mcp-and-plugin-tools-inside-sandbox-tool-policy)。

当你想要更严格的边界时，请使用显式限制：

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

- `code` 或 `command` 其中之一必须非空。
- `code` 是文档中面向模型的字段。
- `command` 作为 `exec` 兼容别名被接受，用于钩子策略和可信重写；当两者都存在时，值必须一致。
- 外层代码模式 `exec` 钩子事件包含 `toolKind: "code_mode_exec"`，并在输入语言已知时包含 `toolInputKind: "javascript" | "typescript"`，以便策略区分代码模式单元和共享同一工具名称的 shell 风格 `exec` 调用。
- `language` 默认为 `"javascript"`。
- 如果 `language` 是 `"typescript"`，OpenClaw 会在求值前进行转译。
- `exec` 在 v1 中拒绝 `import`、`require`、动态 `import` 和模块加载器模式。
- `exec` 不会递归地暴露正常的 shell `exec` 实现。

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

当 QuickJS VM 挂起并带有仍需要模型可见续接的可恢复状态时，`exec` 会返回 `waiting`。结果包含一个用于 `wait` 的 `runId`。命名空间桥接调用，包括 MCP 命名空间调用，会在同一个 `exec`/`wait` 调用内于就绪时自动排空，因此一个紧凑的代码块可以检查 `$api()` 并调用一个 MCP 工具，而不必为每次命名空间 `await` 触发一次模型工具调用。

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
declare const MCP: Record<string, unknown>;
declare const namespaces: Record<string, unknown>;

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

MCP 目录条目不能通过 `tools.call(...)` 或代码模式中的便捷函数调用。它们仅通过生成的 `MCP` 命名空间暴露。TypeScript 风格的声明文件可通过只读的 `API` 虚拟文件表面获得，因此 agent 可以在不把 MCP schema 加入提示词的情况下检查 MCP 签名：

```typescript
const files = await API.list("mcp");
const githubApi = await API.read("mcp/github.d.ts");

const issue = await MCP.github.createIssue({
  owner: "openclaw",
  repo: "openclaw",
  title: "Investigate gateway logs",
});

const snapshot = await MCP.chromeDevtools.takeSnapshot({ output: "markdown" });
const resource = await MCP.docs.resources.read({ uri: "memo://one" });
const prompt = await MCP.docs.prompts.get({
  name: "brief",
  arguments: { topic: "release" },
});
```

`API.read("mcp/<server>.d.ts")` 返回由 MCP 工具元数据推导出的紧凑声明：

```typescript
type McpToolResult = {
  content?: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
};

declare namespace MCP.github {
  /** 返回这个 TypeScript 风格的 API 头。 */
  function $api(toolName?: string, options?: { schema?: boolean }): Promise<McpApiHeader>;

  /**
   * 创建一个 GitHub issue。
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param title issue 标题
   */
  function createIssue(input: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
  }): Promise<McpToolResult>;
}
```

这些声明文件是虚拟的，不是写入工作区或状态目录下的文件。对于每次代码模式 `exec` 调用，OpenClaw 都会构建运行范围内的工具目录，保留可见的 MCP 条目，渲染 `mcp/index.d.ts` 以及每个可见服务器对应的一个 `mcp/<server>.d.ts` 声明文件，并将这个小型只读表注入到 QuickJS worker 中。guest 代码只会看到 `API` 对象：`API.list(prefix?)` 返回文件元数据，`API.read(path)` 返回所选的声明内容。未知路径以及 `.` / `..` 段会被拒绝。

这使得大型 MCP schema 不会进入模型提示词。agent 通过 `exec` 工具描述得知虚拟 API 的存在，仅读取所需的声明文件，然后以一个对象参数调用 `MCP.<server>.<tool>()`。当 agent 需要在程序内部获得单个工具的 schema 响应时，`MCP.<server>.$api()` 仍可作为内联备用方案。

guest runtime 不能直接暴露 host 对象。输入和输出通过 JSON 兼容值跨桥传递，并带有显式大小上限。

## 内部命名空间

内部命名空间让 code mode 在不增加更多模型可见工具的情况下，获得简洁的领域 API。由加载器拥有的集成可以注册诸如 `Issues`、`Fictions` 或 `Calendar` 这样的命名空间；随后 guest 代码会在 QuickJS 程序中调用该命名空间，而 OpenClaw 对模型仍然只展示 `exec` 和 `wait`。

命名空间目前仍是内部能力。这里没有公开的插件 SDK 命名空间 API：外部插件命名空间需要一个由加载器拥有的契约，这样插件身份、已安装清单、认证状态以及缓存的目录描述符才不会偏离支撑该命名空间的插件工具。Core code mode 只负责沙箱、序列化、目录门控以及桥接分发。

随后 guest 代码可以使用直接全局变量，或者使用 `namespaces` 映射：

```javascript
const open = await Issues.list({ state: "open" });
const alsoOpen = await namespaces.Issues.list({ state: "open" });
return { count: open.length, alsoCount: alsoOpen.length };
```

### 注册表生命周期

命名空间注册表是进程本地的，并按命名空间 id 进行键控。一次典型运行会经历以下路径：

1. 受信任的加载器调用 `registerCodeModeNamespaceForPlugin(pluginId, registration)`。
2. Code mode 为本次运行创建隐藏的 `ToolSearchRuntime`，并读取其运行作用域的目录。
3. `createCodeModeNamespaceRuntime(ctx, catalog)` 只保留那些 `requiredToolNames` 全部可见且归同一个 `pluginId` 所有的注册项。
4. 每个可见命名空间都会为当前运行调用 `createScope(ctx)`。该作用域会接收诸如 `agentId`、`sessionKey`、`sessionId`、`runId`、配置以及中止状态等运行上下文。
5. 作用域数据会被序列化为普通描述符，并作为直接全局变量以及 `namespaces.<globalName>` 注入到 QuickJS 中。
6. guest 调用会通过 worker bridge 挂起，在主机端解析命名空间路径，将调用映射到声明的、插件拥有的目录工具，并通过 `ToolSearchRuntime.call` 执行该工具。
7. OpenClaw 会在活动的 `exec`/`wait` 工具调用内自动清空就绪的命名空间桥接调用。如果命名空间工作在超时前仍未完成，或者 guest 显式让出执行权，则 `wait` 会稍后恢复同一个命名空间运行时。
8. 插件回滚或卸载会调用 `clearCodeModeNamespacesForPlugin(pluginId)`，这样失败的插件加载就不会遗留陈旧的全局变量。

一个重要的不变量：命名空间调用就是目录工具调用。它们使用与 `tools.call(...)` 相同的策略钩子、审批、中止处理、遥测、转录投影以及挂起/恢复行为。

### 注册形状

从拥有底层工具的集成中注册命名空间。保持作用域尽量小，只暴露那些映射到已声明目录工具的领域动词。

```typescript
import {
  createCodeModeNamespaceTool,
  registerCodeModeNamespaceForPlugin,
} from "../agents/code-mode-namespaces.js";

const pluginId = "github";

registerCodeModeNamespaceForPlugin(pluginId, {
  id: "github-issues",
  globalName: "Issues",
  description: "GitHub issue helpers for the current repository.",
  requiredToolNames: ["github_list_issues", "github_update_issue"],
  prompt: "Use Issues.list(params) and Issues.update(number, patch).",
  createScope: (ctx) => ({
    repository: ctx.config,
    list: createCodeModeNamespaceTool("github_list_issues", ([params]) => params ?? {}),
    update: createCodeModeNamespaceTool("github_update_issue", ([number, patch]) => ({
      number,
      patch,
    })),
  }),
});
```

`createCodeModeNamespaceTool(toolName, inputMapper)` 会把作用域成员标记为可调用的命名空间函数。可选的 `inputMapper` 会接收 guest 参数，并返回底层目录工具所需的输入对象。若没有输入映射器，则使用 guest 的第一个参数；若未提供参数，则使用 `{}`。

原始主机函数会在 guest 代码运行前被拒绝：

```typescript
createScope: () => ({
  // 错误：这会绕过目录工具生命周期，因此会被拒绝。
  list: async () => githubClient.listIssues(),
});
```

### 所有权与可见性

命名空间所有权绑定到注册调用者的 `pluginId`。`requiredToolNames` 同时充当可见性门和所有权检查：

- 每个必需工具都必须存在于运行目录中
- 每个必需工具都必须具有 `sourceName === pluginId`
- 当任何必需工具缺失或归属其他插件时，命名空间会被隐藏
- 每条可调用路径只能指向 `requiredToolNames` 中命名的工具

这可以防止另一个插件通过注册同名工具来暴露某个命名空间。它也让命名空间与普通代理策略保持一致：如果本次运行看不到底层工具，就看不到该命名空间。

例如，GitHub 命名空间应当位于一个 GitHub 拥有的扩展之后，该扩展负责 GitHub 认证、REST 或 GraphQL 客户端、速率限制、写入审批和测试。Core code mode 不应嵌入 GitHub 专用 API、令牌处理或提供方策略。

### 作用域序列化规则

`createScope(ctx)` 可以返回一个普通对象，其中包含 JSON 兼容值、数组、嵌套对象以及 `createCodeModeNamespaceTool(...)` 调用标记。主机对象绝不会直接进入 QuickJS。

序列化器会拒绝：

- 原始函数
- 循环对象图
- 不安全的路径段：`__proto__`、`constructor`、`prototype`、空键，或包含内部路径分隔符的键
- 不是 JavaScript 标识符的 `globalName` 值
- 与内置 code-mode 全局变量冲突的 `globalName`，例如 `tools`、`namespaces`、`text`、`json`、`yield_control` 或 `__openclaw*`

无法进行 JSON 序列化的值会在跨越桥接之前转换为 JSON 安全的回退值。二进制数据、句柄、套接字、客户端和类实例应当保留在普通目录工具之后。

### 提示词

只有当命名空间在该运行中可见时，命名空间的 `description` 和可选 `prompt` 才会追加到模型可见的 `exec` schema 中。请用它们来教授最小但有用的表面：

```typescript
{
  description: "Fiction production service helpers.",
  prompt:
    "Use Fictions.riskAudit(), Fictions.promoteIfReady(id, status), and Fictions.unpaidOver(amount).",
}
```

提示词应当围绕命名空间契约，而不是认证设置、实现历史或无关的插件行为。

### 清理

命名空间是进程本地注册项。请在拥有它们的插件被禁用、卸载或回滚时移除它们：

```typescript
clearCodeModeNamespacesForPlugin(pluginId);
```

仅在移除一个已知命名空间时使用 `unregisterCodeModeNamespace(namespaceId)`。测试可以调用 `clearCodeModeNamespacesForTest()`，以避免跨用例泄漏注册项。

### 测试清单

命名空间变更应覆盖安全边界和 guest 行为：

- 只有在底层工具可见时，命名空间提示文本才会出现
- 来自其他 `sourceName` 的同名工具不会暴露该命名空间
- 原始作用域函数会被拒绝
- 伪造的命名空间 id 和伪造的路径会被拒绝
- 可调用路径不能指向未声明的工具
- 嵌套对象和共享引用会被正确序列化
- 命名空间调用通过目录工具执行并返回 JSON 安全的细节
- guest 代码可以捕获失败
- 挂起的命名空间调用会通过 `wait` 恢复
- 插件回滚会清除其拥有的命名空间注册项

命名空间是通用 `tools.search` / `tools.call` 目录的补充。对任意已启用的 OpenClaw、插件和客户端工具使用目录；对 MCP 工具使用 `MCP`；对插件拥有、已文档化的领域 API 使用其他命名空间，在这些场景下，简洁代码比反复查找 schema 更可靠。

## 输出 API

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

## 工具目录

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

MCP 条目会保留在运行作用域目录中，因此策略、审批、钩子、遥测、转录投影以及精确工具 id 仍与正常工具执行共享。guest 可见的 `ALL_TOOLS`、`tools.search(...)`、`tools.describe(...)` 和 `tools.call(...)` 视图会省略 MCP 条目。生成的 `MCP.<server>.<tool>({ ...input })` 命名空间会解析回精确的目录 id，然后通过相同的执行器路径分发。

## Tool Search 交互

对于 code mode 处于活动状态的运行，Code mode 会取代 OpenClaw Tool Search 的模型表面。

当 `tools.codeMode.enabled` 为 true 且 code mode 激活时：

- OpenClaw 不会将 `tool_search_code`、`tool_search`、`tool_describe` 或 `tool_call` 作为模型可见工具暴露出来。
- 同样的目录化思路会转移到 guest runtime 内部。
- guest runtime 会接收紧凑的 `ALL_TOOLS` 元数据，以及针对非 MCP 工具的搜索、描述和调用辅助函数。
- MCP 调用使用生成的 `MCP` 命名空间及其 `$api()` 头信息，而不是 `tools.call(...)`。
- 嵌套调用会通过 Tool Search 所使用的同一 OpenClaw 执行器路径分发。

现有的 [Tool Search](/tools/tool-search) 页面描述了 OpenClaw 紧凑目录桥接。对于可以使用 `exec` 和 `wait` 的运行，Code mode 是通用的 OpenClaw 替代方案。

## 工具名称和冲突

模型可见的 `exec` 工具是 code-mode 工具。如果常规的 OpenClaw shell `exec` 工具已启用，它会对模型隐藏，并像其他工具一样被收录到目录中。

在 guest runtime 内部：

- 如果策略允许，`tools.call("openclaw:core:exec", input)` 可以调用 shell exec 工具。
- 只有当 shell exec 目录条目有一个无歧义的安全名称时，才会安装 `tools.exec(...)`。
- code-mode 的 `exec` 工具绝不会通过 `tools` 递归可用。

如果两个工具归一化后得到相同的安全便捷名称，OpenClaw 会省略该便捷函数，并要求使用 `tools.call(id, input)`。

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

嵌套调用会作为真实的工具调用投影到对话记录中，这样支持包可以展示发生了什么。该投影会标识父级 code-mode 工具调用以及嵌套工具 id。

允许并行嵌套调用，最多可达 `maxPendingToolCalls`。

## 运行时状态

每个 code-mode 运行都有一个状态机：

- `running`：VM 正在执行，或有嵌套调用在飞行中。
- `waiting`：VM 快照已存在，可通过 `wait` 恢复。
- `completed`：已返回最终值；快照已删除。
- `failed`：已返回错误；快照已删除。
- `expired`：快照或挂起状态超过保留期；无法恢复。
- `aborted`：父运行/会话已取消；快照已删除。

状态按 agent 运行、会话和工具调用 id 进行作用域划分。来自不同运行或会话的 `wait` 调用会失败。

快照存储是有边界的：

- 每次运行的最大快照字节数
- 每个进程的最大活动快照数
- 快照 TTL
- 运行结束时清理
- 在不支持持久化时，于 Gateway 关闭时清理

## QuickJS-WASI runtime

OpenClaw 会在所属包中将 `quickjs-wasi` 作为直接依赖加载。该 runtime 不依赖于为代理、PAC 或其他无关依赖安装的传递副本。

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

runtime 在 worker 中运行，位于 OpenClaw 主事件循环之外。guest 的无限循环不应无限期阻塞 Gateway 进程。

## TypeScript

TypeScript 支持仅通过源代码转换实现：

- 接受输入：一段 TypeScript 代码字符串
- 输出：由 QuickJS-WASI 评估的 JavaScript 字符串
- 不进行类型检查
- 不进行模块解析
- v1 中不支持 `import` 或 `require`
- 诊断结果以 `failed` 结果返回

TypeScript 编译器仅会在 TypeScript 单元格中按需加载。纯 JavaScript 单元格和已禁用的 code mode 不会加载编译器。

在可行的情况下，转换应尽量保留有用的行号。

## 安全边界

模型代码是不可信的。runtime 采用纵深防御：

- 在主事件循环之外运行 QuickJS-WASI
- 将 `quickjs-wasi` 作为直接依赖加载，而不是通过 Codex 或传递包
- guest 中不提供文件系统、网络、子进程、模块导入、环境变量或主机全局对象
- 使用 QuickJS 内存和中断限制
- 强制执行父进程墙钟超时
- 强制执行输出、快照、日志和挂起调用上限
- 通过狭窄的 JSON 适配器序列化主机桥接值
- 将主机错误转换为普通的 guest 错误，绝不传递主机 realm 对象
- 在超时、中止、会话结束或过期时丢弃快照
- 拒绝对 `exec`、`wait` 和 Tool Search 控制工具的递归访问
- 防止便捷名称冲突覆盖目录辅助函数

sandbox 只是一个安全层。对于高风险部署，运维人员仍可能需要操作系统级加固。

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

返回给 guest 的错误是普通数据。主机 `Error` 实例、堆栈对象、原型和主机函数都不会进入 QuickJS。

## 遥测

code mode 会报告：

- 发送给模型的可见工具名称
- 隐藏目录大小和来源分布
- `exec` 和 `wait` 计数
- 嵌套 search、describe 和 call 的计数
- 被调用的嵌套工具 id
- 超时、内存、快照和输出上限失败
- 快照生命周期事件

遥测不得包含秘密、原始环境值，或超出既有 OpenClaw 轨迹策略范围的未脱敏工具输入。

## 调试

当代码模式的行为与正常工具运行不同时，使用有针对性的模型传输日志：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

对于有效载荷形状调试，请使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。这会记录模型请求的一个有上限、已脱敏的 JSON 快照；它只应在调试时使用，因为提示词和消息文本仍然可能出现。

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

- disabled config leaves existing tool exposure unchanged
- object config without `enabled: true` leaves code mode disabled
- enabled config exposes only `exec` and `wait` to the model when tools are active for the run
- raw no-tool runs, `disableTools`, and empty allowlists do not trigger code-mode payload enforcement
- all effective non-MCP tools appear in `ALL_TOOLS`
- denied tools do not appear in `ALL_TOOLS`
- `tools.search`, `tools.describe`, and `tools.call` work for OpenClaw tools
- `API.list("mcp")` and `API.read("mcp/<server>.d.ts")` expose TypeScript-style MCP declarations without a bridge/tool call
- MCP namespace `$api()` remains available as an inline fallback for schemas
- MCP namespace calls work for visible MCP tools with one object input, while direct MCP catalog entries are absent from `tools.*`
- Tool Search control tools are hidden from both the model surface and the hidden catalog
- nested calls preserve approval and hook behavior
- shell `exec` is hidden from the model but callable by catalog id when allowed
- recursive code-mode `exec` and `wait` are not callable from guest code
- TypeScript input is transformed and evaluated without loading TypeScript on disabled or JavaScript-only paths
- `import`, `require`, filesystem, network, and environment access fail
- infinite loops time out and cannot block the Gateway
- memory cap failures terminate the guest VM
- output and snapshot caps are enforced for completed and suspended calls
- `wait` resumes a suspended snapshot and returns the final value
- expired, aborted, wrong-session, and unknown `runId` values fail
- transcript replay and persistence preserve code-mode control calls
- transcript and telemetry show nested tool calls clearly

## 端到端测试计划

在更改运行时时，请将以下内容作为集成或端到端测试运行：

1. Start a Gateway with `tools.codeMode.enabled: false`.
2. Send an agent turn with a small direct tool set.
3. Assert the model-visible tools are unchanged.
4. Restart with `tools.codeMode.enabled: true`.
5. Send an agent turn with OpenClaw, plugin, MCP, and client test tools.
6. Assert the model-visible tool list is exactly `exec`, `wait`.
7. In `exec`, read `ALL_TOOLS` and assert the effective test tools are present.
8. In `exec`, call OpenClaw/plugin/client tools through `tools.search`, `tools.describe`, and `tools.call`.
9. In `exec`, call `API.list("mcp")` and `API.read("mcp/<server>.d.ts")` and assert the declaration files describe visible MCP tools.
10. In `exec`, call MCP tools through `MCP.<server>.<tool>({ ...input })` and assert direct MCP catalog entries are absent from `ALL_TOOLS` and `tools.*`.
11. Assert denied tools are absent and cannot be called by guessed id.
12. Start a nested tool call that resolves after `exec` returns `waiting`.
13. Call `wait` and assert the restored VM receives the tool result.
14. Assert the final answer contains output produced after restore.
15. Assert timeout, abort, and snapshot expiry clean up runtime state.
16. Export trajectory and assert nested calls are visible under the parent code-mode call.

仅限文档的对此页面的更改仍应运行 `pnpm check:docs`。

## 相关内容

- [工具搜索](/tools/tool-search)
- [Agent 运行时](/concepts/agent-runtimes)
- [Exec 工具](/tools/exec)
- [代码执行](/tools/code-execution)
