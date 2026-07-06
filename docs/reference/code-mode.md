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

代码模式是 OpenClaw 代理运行时中的一项实验性、可选择启用的功能。启用后，模型不再看到所有已启用工具的 schema；相反，在该次运行中，它只会看到两个工具：`exec` 和 `wait`。模型会编写一个小型 JavaScript 或 TypeScript 程序，用于搜索、描述并调用隐藏的工具目录。

本页介绍的是 OpenClaw 代码模式，而不是 Codex Code Mode。这两个功能共享一个名称，以及相同的、模型可见的工具名（`exec`、`wait`），但它们是彼此独立的实现：

- Codex Code Mode 运行在 Codex 编码脚手架中。它的 `exec` 工具是一个自由格式语法工具：模型编写原始 JavaScript 源码（可选地以前缀 `// @exec: {...}` 的 pragma 行指定执行选项），并在 Deno/V8 运行时中执行。
- OpenClaw 代码模式运行在通用的 OpenClaw 代理运行时中，除非配置了 `tools.codeMode.enabled: true`，否则会被禁用。它的 `exec` 工具接收一个 JSON `{ code, language }` 载荷，并在 QuickJS-WASI worker 中执行。

二者都属于 JavaScript 执行界面，而不是 shell 命令界面。请将它们视为相互独立、实现方式不同的功能，恰好都暴露了同名的 `exec`/`wait` 工具。

## 它的作用

- 模型可见的工具列表将严格变为 `exec` 和 `wait`。
- `exec` 在一个隔离的 QuickJS-WASI worker 线程中执行模型生成的 JavaScript 或 TypeScript。
- 其他所有已启用工具（OpenClaw core、plugin、MCP、client）都会从模型提示中隐藏，并通过 `ALL_TOOLS` 和 `tools` 暴露给 guest 程序。
- guest 代码会搜索隐藏的目录，描述某个工具的 schema，并通过与普通 agent turn 相同的执行路径调用工具（policy、approvals、hooks、telemetry 仍然全部适用）。
- MCP 工具按 `MCP` 命名空间分组；在 code mode 中，这是调用它们的唯一支持方式。
- 当嵌套工具调用仍在等待中时，`wait` 会恢复一个被挂起的 code-mode 运行。

Code mode 只会改变面向模型的编排层表面。它不会替换 tools、plugin tools、MCP tools、auth、approval policy、channel 行为或 model selection。

## 为什么使用它

- 更小的提示面：提供方只需要两个控制工具，而不是几十个或
  几百个完整的工具 schema。
- 更好的编排：模型可以在一个代码单元中使用循环、连接、小型转换、
  条件逻辑以及并行嵌套工具调用。
- 提供方无关：适用于 OpenClaw、plugin、MCP 和客户端工具，而无需
  依赖提供方原生的代码执行。
- 失败即关闭：如果启用了代码模式但 QuickJS-WASI 运行时不可用，
  运行会失败，而不是静默回退到广泛暴露的直接工具。

这对拥有大量已启用工具目录的代理，或者模型需要在回答前搜索、
组合并调用多个工具的工作流尤其有用。

## 启用它

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

简写：

```json5
{
  tools: {
    codeMode: true,
  },
}
```

当省略 `tools.codeMode`、将其设为 `false`，或者设为一个不包含 `enabled: true` 的对象时，代码模式保持关闭。

如果你使用带有已配置 MCP 服务器的沙箱代理，也请在沙箱工具策略中允许捆绑的 MCP 插件，例如 `tools.sandbox.tools.alsoAllow: ["bundle-mcp"]`。参见
[配置 - tools 和自定义提供程序](/gateway/config-tools#mcp-and-plugin-tools-inside-sandbox-tool-policy)。

设置显式限制以获得更严格的边界：

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

在代码模式激活时，日志中对模型可见的工具名称应为 `exec` 和 `wait`。如需查看完整的已脱敏提供程序负载，可在短暂的调试会话中添加 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。

## 技术导览

本页其余部分涵盖运行时契约和实现细节，
适用于维护者、调试工具暴露的插件作者，以及
验证高风险部署的操作人员。

## 运行状态

|                     |                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------- |
| 运行时              | [`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)                               |
| 默认状态            | 已禁用                                                                                      |
| 稳定性              | 试验性的 OpenClaw 表面（Codex Code Mode 是一个单独、稳定的 Codex harness 表面）          |
| 目标表面            | 通用 OpenClaw 代理运行                                                                     |
| 安全态势            | 模型代码是不可信的                                                                       |
| 面向用户的承诺      | 启用代码模式绝不会静默回退到广泛的直接工具暴露                                              |

## 范围

Code mode 拥有已准备运行的面向模型的编排形态。它
不拥有模型选择、通道行为、认证、工具策略或工具
实现。

在范围内：模型可见的 `exec`/`wait` 定义、隐藏工具目录
构建、JavaScript/TypeScript 来宾执行、QuickJS-WASI worker
运行时、用于搜索/描述/调用的主机回调、挂起来宾程序的可恢复状态、
输出/超时/内存/待处理调用/快照限制，以及用于嵌套工具调用的遥测/轨迹投影。

不在范围内：提供方原生的远程代码执行、shell 执行
语义、更改现有工具授权、持久化的用户编写脚本、来宾代码中的包管理器/文件/网络/模块访问，以及直接
重用 Codex Code Mode 内部机制。

提供方拥有的工具（例如远程 Python 沙箱）是独立的工具。参见
[代码执行](/tools/code-execution)。

## 术语

- **代码模式**：OpenClaw 运行时模式，隐藏普通模型工具，仅暴露 `exec` 和 `wait`。
- **访客运行时**：评估模型代码的 QuickJS-WASI JavaScript VM。
- **宿主桥接**：从访客代码返回到 OpenClaw 的窄 JSON 兼容回调接口。
- **目录**：在正常工具策略、插件、MCP 和客户端工具解析之后，按运行范围确定的有效工具列表。
- **嵌套工具调用**：通过宿主桥接从访客代码发起的工具调用。
- **快照**：保存的序列化 QuickJS-WASI VM 状态，以便 `wait` 可以继续一个已挂起的代码模式运行。

## 配置

`tools.codeMode.enabled` 是激活门控；仅设置其他字段并不会单独启用该功能。

| 字段                 | 默认值                         | 限制                                            |
| --------------------- | ------------------------------ | ----------------------------------------------- |
| `enabled`             | `false`                        | 布尔值；只有 `true` 才会启用代码模式            |
| `runtime`             | `"quickjs-wasi"`               | 仅支持的值                                      |
| `mode`                | `"only"`                       | 暴露 `exec`/`wait`，隐藏普通模型工具            |
| `languages`           | `["javascript", "typescript"]` | 这两者中的任意子集                              |
| `timeoutMs`           | `10000`                        | `100`-`60000`                                   |
| `memoryLimitBytes`    | `67108864`                     | `1048576`-`1073741824`                          |
| `maxOutputBytes`      | `65536`                        | `1024`-`10485760`                               |
| `maxSnapshotBytes`    | `10485760`                     | `1024`-`268435456`                              |
| `maxPendingToolCalls` | `16`                           | `1`-`128`                                       |
| `snapshotTtlSeconds`  | `900`                          | `1`-`86400`                                     |
| `searchDefaultLimit`  | `8`                            | 限制到 `maxSearchLimit`                         |
| `maxSearchLimit`      | `50`                           | `1`-`50`                                        |

如果已启用代码模式但 QuickJS-WASI 无法加载，OpenClaw 会在该次运行中直接失败关闭；它不会静默地暴露普通工具作为回退。

## 激活

代码模式的评估发生在确定有效工具策略之后、最终模型请求组装之前：

1. 解析 agent、model、provider、sandbox、channel、sender 和 run 策略。
2. 构建有效的 OpenClaw 工具列表，添加符合条件的插件、MCP 和客户端工具。
3. 应用允许/拒绝策略。
4. 如果 `tools.codeMode.enabled` 为 false，则继续按正常工具暴露流程。
5. 如果已启用且该运行中工具处于激活状态，则将有效工具注册到代码模式目录中。
6. 从模型可见列表中移除所有普通工具；添加 `exec` 和 `wait`。

那些刻意没有任何工具的运行（原始模型调用、`disableTools: true`，或空的 `tools.allow` 列表）不会激活代码模式表面，即使已配置 `tools.codeMode.enabled: true` 也是如此。代码模式和 OpenClaw 工具搜索对同一次运行来说是互斥的；如果代码模式被激活，工具搜索的压缩就不会发生。

代码模式目录是按运行范围限定的，绝不能泄露来自其他 agent、session、sender 或 run 的工具。

## 模型可见工具

当代码模式处于激活状态时，模型只能看到 `exec` 和 `wait`。其他所有已启用工具都会从模型可见的工具列表中隐藏，并注册到代码模式目录中。

使用 `exec` 进行工具编排、数据连接、循环、并行嵌套调用以及结构化转换。仅在 `exec` 返回可恢复的 `waiting` 结果时使用 `wait`。

## `exec`

`exec` 启动一个代码模式单元并返回一个结果。输入代码由模型生成，必须视为恶意内容。

输入：

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

规则：

- `code` 或 `command` 中必须有一个非空。
- `code` 是文档中面向模型的字段。
- `command` 作为 `exec` 兼容别名被接受，用于钩子策略和受信任的重写（OpenClaw 的正常 shell `exec` 工具也使用 `command` 字段）；当两者都存在时，值必须一致。
- `language` 默认为 `"javascript"`；schema 将其暴露为一个扁平字符串枚举（`"javascript" | "typescript"`），而不是 `oneOf`/`anyOf` 联合，因为某些提供方会拒绝这些结构。
- 如果 `language` 是 `"typescript"`，OpenClaw 会在执行前进行转译。
- `exec` 会拒绝 `import`、`require`、动态 import 以及模块加载器模式。
- `exec` 从不递归暴露普通 shell `exec` 实现。
- 外层代码模式 `exec` 钩子事件携带 `toolKind: "code_mode_exec"` 和 `toolInputKind: "javascript" | "typescript"`（在已知时），因此策略可以区分代码模式单元与共享同名工具的 shell 风格 `exec` 调用。

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

当 QuickJS VM 以仍需要模型可见续接的可恢复状态挂起时，`exec` 会返回 `waiting`；结果中包含供 `wait` 使用的 `runId`。命名空间桥接调用（包括 MCP 命名空间调用）在同一次 `exec`/`wait` 调用中、只要它们已就绪，就会自动被清空，因此一个紧凑的代码块可以调用 MCP 工具，而不必让每个命名空间 await 都对应一次模型工具调用。

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

`wait` 存在的原因是，嵌套的 OpenClaw 工具可能很慢、需要交互、需要审批，
或者会流式返回部分更新；在主机等待外部工作时，模型不应当一直保持一个很长的
`exec` 调用处于打开状态。

QuickJS-WASI 的快照/恢复是续跑机制：

1. `exec` 会执行代码，直到完成、失败或挂起。
2. 在挂起时，OpenClaw 会为 QuickJS VM 生成快照，并记录待处理的主机工作。
3. 当待处理工作结束后，`wait` 会恢复 VM 快照，并通过稳定名称重新注册主机回调。
4. OpenClaw 会将嵌套工具结果送入恢复后的 VM，并清空 QuickJS 待处理任务。
5. `wait` 返回 `completed`、`failed` 或另一个 `waiting` 结果。

快照是运行时状态，不是用户产物：它们只存在于进程内的 map 中（不写入数据库或磁盘），有大小限制，会过期，并且仅限定于创建它们的运行和会话范围内。

当出现以下情况时，`wait` 会失败（作为 `failed` 结果）：

- `runId` 未知，或者其快照已经过期。
- 调用方不在与该挂起运行相同的运行/会话范围内。
- 对该 `runId` 已经有一个 `wait` 正在进行中。
- QuickJS-WASI 恢复失败。
- 继续执行将超过 `maxOutputBytes` 或 `maxSnapshotBytes`。

## Guest runtime API

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;
declare const MCP: Record<string, unknown>;
declare const namespaces: Record<string, unknown>;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` 是运行范围目录的紧凑元数据；默认情况下不包含完整 schema。

```typescript
type ToolCatalogEntry = {
  id: string;
  name: string;
  label?: string;
  description: string;
  source: "openclaw" | "mcp" | "client";
  sourceName?: string;
};
```

插件工具使用 `source: "openclaw"`，并将 `sourceName` 设为所属插件的 id；不存在单独的 `"plugin"` 源值。`source: "mcp"` 仅用于 `sourceName`/`mcp` 元数据中的 MCP 条目（并会从 `ALL_TOOLS`/`tools.*` 中过滤掉，见下文）。

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
const hits = await tools.web_search({ query: "OpenClaw 代码模式" });
```

MCP 目录条目不能通过 `tools.call(...)` 或代码模式中的便捷函数调用；它们仅通过生成的 `MCP` 命名空间暴露。TypeScript 风格的声明文件可通过只读的 `API` 虚拟文件表面获取，因此代理无需将 MCP schema 添加到提示中，也能检查 MCP 签名：

```typescript
const files = await API.list("mcp");
const githubApi = await API.read("mcp/github.d.ts");

const issue = await MCP.github.createIssue({
  owner: "openclaw",
  repo: "openclaw",
  title: "调查网关日志",
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

声明文件是虚拟的，不会写入 workspace 或 state 目录。对于每次代码模式的 `exec` 调用，OpenClaw 会构建运行范围的工具目录，保留可见的 MCP 条目，渲染 `mcp/index.d.ts` 以及每个可见服务器对应的一个 `mcp/<server>.d.ts`，并将这个小型只读表注入 QuickJS worker。Guest 代码只能看到 `API` 对象：`API.list(prefix?)` 返回文件元数据，`API.read(path)` 返回所选声明内容。未知路径以及 `.`/`..` 段都会被拒绝。

这可以将大型 MCP schema 排除在模型提示之外：代理先从 `exec` 工具描述中得知虚拟 API 的存在，再仅读取所需的声明文件，然后使用一个对象参数调用 `MCP.<server>.<tool>()`。`MCP.<server>.$api()` 仍可作为程序内单个工具 schema 响应的内联回退方案。

Guest 运行时从不直接看到宿主对象。输入和输出通过桥接以 JSON 兼容值的形式传递，并带有明确的大小上限。

## 内部命名空间

内部命名空间让代码模式在不增加更多模型可见工具的情况下，获得简洁的领域 API。由加载器拥有的集成会注册一个命名空间，例如 `Issues` 或 `Calendar`；随后来宾代码在 QuickJS 程序中调用该命名空间，而模型仍只会看到 `exec` 和 `wait`。

命名空间目前仍是内部能力。这里没有公开的插件 SDK 命名空间 API：外部插件命名空间需要一个由加载器拥有的契约，这样插件身份、已安装清单、认证状态以及缓存的目录描述符才不会偏离支撑该命名空间的插件工具。Core code mode 只负责沙箱、序列化、目录门控以及桥接分发。

来宾代码可以直接使用全局变量，也可以使用 `namespaces` 映射：

```javascript
const open = await Issues.list({ state: "open" });
const alsoOpen = await namespaces.Issues.list({ state: "open" });
return { count: open.length, alsoCount: alsoOpen.length };
```

### 注册表生命周期

命名空间注册表是进程本地的，并按命名空间 id 键控：

1. 受信任的加载器调用 `registerCodeModeNamespaceForPlugin(pluginId, registration)`。
2. Code mode 为本次运行创建隐藏的 `ToolSearchRuntime`，并读取其运行范围内的目录。
3. `createCodeModeNamespaceRuntime(ctx, catalog)` 只保留那些 `requiredToolNames` 全部可见且归同一个 `pluginId` 所有的注册项。
4. 每个可见命名空间都会针对当前运行调用 `createScope(ctx)`，获得运行上下文，例如 `agentId`、`sessionKey`、`sessionId`、`runId`、配置和中止状态。
5. 作用域数据会被序列化为普通描述符，并作为直接全局变量以及 `namespaces.<globalName>` 注入到 QuickJS 中。
6. 来宾调用会通过 worker 桥接挂起，在主机侧解析命名空间路径，将调用映射到已声明的、插件拥有的目录工具，并通过 `ToolSearchRuntime.callExactId` 执行该工具。
7. 在活动的 `exec`/`wait` 调用中，会自动清空已准备好的命名空间桥接调用；如果在超时前命名空间工作仍未完成，或者来宾显式让出执行权，`wait` 会在之后恢复同一个命名空间运行时。
8. 插件回滚或卸载时会调用 `clearCodeModeNamespacesForPlugin(pluginId)`，以免失败的插件加载残留旧的全局变量。

命名空间调用就是目录工具调用：它们使用与 `tools.call(...)` 相同的策略钩子、审批、中止处理、遥测、转录投影以及挂起/恢复行为。

### 注册形状

从拥有这些底层工具的集成中注册命名空间。保持作用域尽可能小，只暴露映射到已声明目录工具的领域动词。

```typescript
import {
  createCodeModeNamespaceTool,
  registerCodeModeNamespaceForPlugin,
} from "../agents/code-mode-namespaces.js";

const pluginId = "github";

registerCodeModeNamespaceForPlugin(pluginId, {
  id: "github-issues",
  globalName: "Issues",
  description: "当前仓库的 GitHub issue 助手。",
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

`createCodeModeNamespaceTool(toolName, inputMapper)` 会将作用域成员标记为可调用的命名空间函数。可选的 `inputMapper` 会接收来宾参数，并返回底层目录工具所需的输入对象；如果没有提供，则使用来宾的第一个参数，若省略则使用 `{}`。

原始主机函数会在 guest 代码运行前被拒绝：

```typescript
createScope: () => ({
  // 错误：这会绕过目录工具生命周期，因此会被拒绝。
  list: async () => githubClient.listIssues(),
});
```

### 所有权与可见性

命名空间所有权绑定到注册调用者的 `pluginId`。`requiredToolNames` 同时充当可见性门和所有权检查：

- every required tool must exist in the run catalog
- every required tool must have `sourceName === pluginId`
- the namespace is hidden when any required tool is absent or owned by
  another plugin
- each callable path may target only a tool named in `requiredToolNames`

这可以防止另一个插件通过注册同名工具来暴露命名空间，并让命名空间与普通代理策略保持一致：如果本次运行看不到底层工具，它就看不到该命名空间。

例如，GitHub 命名空间应当位于一个由 GitHub 拥有的插件之后，该插件负责 GitHub 认证、REST/GraphQL 客户端、速率限制、写入审批和测试。Core code mode 不应内嵌 GitHub 特定 API、令牌处理或提供方策略。

### 作用域序列化规则

`createScope(ctx)` 可以返回一个普通对象，其中包含 JSON 兼容值、数组、嵌套对象以及 `createCodeModeNamespaceTool(...)` 调用标记。主机对象绝不会直接进入 QuickJS。

序列化器会拒绝：

- raw functions
- circular object graphs
- unsafe path segments: `__proto__`, `constructor`, `prototype`, empty keys,
  or keys containing the internal path separator
- `globalName` values that are not JavaScript identifiers
- `globalName` collisions with built-in code-mode globals such as `tools`,
  `namespaces`, `text`, `json`, `yield_control`, `MCP`, `API`, `ALL_TOOLS`, or
  `__openclaw*`

无法进行 JSON 序列化的值会在跨越桥接之前转换为 JSON 安全的回退值。二进制数据、句柄、套接字、客户端和类实例应当保留在普通目录工具之后。

### 提示词

只有当命名空间在该次运行中可见时，命名空间的 `description` 和可选 `prompt` 才会追加到模型可见的 `exec` schema 中。用它们来教授最小但有用的表面：

```typescript
{
  description: "Fiction 生产服务助手。",
  prompt:
    "Use Fictions.riskAudit(), Fictions.promoteIfReady(id, status), and Fictions.unpaidOver(amount).",
}
```

提示词应当围绕命名空间契约，而不是认证设置、实现历史或无关的插件行为。

### 清理

命名空间是进程本地注册项。当拥有它们的插件被禁用、卸载或回滚时，应将其移除：

```typescript
clearCodeModeNamespacesForPlugin(pluginId);
```

Code-mode 清理由插件拥有；当插件生命周期结束时，应清除该插件的命名空间注册项，而不是保留每个命名空间各自的清理句柄。测试可以调用 `clearCodeModeNamespacesForTest()`，以避免跨用例泄漏注册项。

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

命名空间是通用 `tools.search`/`tools.call` 目录的补充：当需要针对任意已启用的 OpenClaw、插件和客户端工具时使用目录；当需要 MCP 工具时使用 `MCP`；当需要插件拥有的、已文档化的领域 API，且简洁代码比反复查找 schema 更可靠时，使用其他命名空间。

## 输出 API

- `text(value)` 将人类可读的输出追加到 `output` 数组中。
- `json(value)` 在进行 JSON 兼容
  序列化后追加一个结构化输出项。
- 来宾代码最终返回的值会在 `completed`
  结果中成为 `value`。

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

规则：输出顺序与来宾调用一致；输出受
`maxOutputBytes` 限制；不可序列化的值会被转换为普通字符串或
错误；不支持二进制值。图像和文件通过
普通的 OpenClaw 工具传递，而不是通过代码模式桥接。

## 工具目录

隐藏目录在经过有效策略过滤后包含以下工具，顺序如下：OpenClaw 核心工具、捆绑的插件工具、外部插件工具、MCP 工具，然后是当前运行中由客户端提供的工具。

目录 ID 在一次运行中保持稳定，并在可能时对于等效工具集保持确定性。实际形式如下：

```text
<source>:<owner>:<tool-name>
```

其中 `<source>` 为 `openclaw`、`mcp` 或 `client`（插件工具使用 `openclaw`，并将插件 ID 作为 `<owner>`；核心工具使用 `openclaw:core:*`）。例如：

```text
openclaw:core:message
openclaw:browser:browser_request
mcp:github:create_issue
client:app:select_file
```

该目录不包含代码模式控制工具：`exec`、`wait`、`tool_search_code`、`tool_search`、`tool_describe`、`tool_call`。这可以防止递归，并保持面向模型的契约尽可能窄。

MCP 条目保留在运行作用域的目录中，因此策略、审批、钩子、遥测、转录投影以及精确的工具 ID 都与正常工具执行保持共享。面向访客的 `ALL_TOOLS`、`tools.search(...)`、`tools.describe(...)` 和 `tools.call(...)` 视图会省略 MCP 条目。生成的 `MCP.<server>.<tool>({ ...input })` 命名空间会解析回精确的目录 ID，并通过相同的执行器路径进行分发。

## 工具搜索交互

当运行时 `code mode` 激活时，Code mode 会取代 OpenClaw 工具搜索模型面的功能。

当 `tools.codeMode.enabled` 为 true 且 code mode 激活时：

- OpenClaw 不会将 `tool_search_code`、`tool_search`、`tool_describe` 或 `tool_call` 暴露为模型可见工具。
- 相同的目录编制思路会移入 guest 运行时内部。
- guest 运行时会接收紧凑的 `ALL_TOOLS` 元数据，以及用于非 MCP 工具的 search/describe/call 辅助函数。
- MCP 调用使用生成的 `MCP` 命名空间及其 `$api()` 标头，而不是 `tools.call(...)`。
- 嵌套调用会通过与 Tool Search 相同的 OpenClaw 执行器路径进行分发。

有关 OpenClaw 紧凑目录桥接，请参见 [工具搜索](/tools/tool-search)，在 code mode 激活的运行中，它会被 code mode 取代。

## 工具名称和冲突

The model-visible `exec` tool is the code-mode tool. If the normal OpenClaw
shell `exec` tool is enabled, it is hidden from the model and cataloged like
any other tool.

在 guest runtime 内部：

- 如果策略允许，`tools.call("openclaw:core:exec", input)` 可以调用 shell exec 工具。
- 只有当 shell exec 目录条目有一个无歧义的安全名称时，才会安装 `tools.exec(...)`。
- code-mode 的 `exec` 工具绝不会通过 `tools` 递归可用。

如果两个工具归一化后得到相同的安全便捷名称，OpenClaw 会省略该便捷函数，并要求使用 `tools.call(id, input)`。

## 嵌套工具执行

每次嵌套工具调用都会跨越宿主桥接并重新进入 OpenClaw，
保留：活动代理 ID、会话 ID 和密钥、发送者与通道上下文、
沙箱策略、审批策略、插件 `before_tool_call` 钩子、中止
信号、可用时的流式更新，以及轨迹/审计事件。

嵌套调用会作为真实的工具调用投射到转录中，因此支持
包会显示发生了什么，并且该投射会标识父级
代码模式工具调用以及嵌套工具 ID。

允许并行嵌套调用，最多可达 `maxPendingToolCalls`。

## 运行和快照生命周期

每次 code-mode 运行都会通过一个以内存中的 `runId` 为键的映射进行跟踪（不会持久化到磁盘或数据库）。`exec`/`wait` 会返回三种结果状态之一：`completed`、`waiting` 或 `failed`。

- `waiting` 结果会存储 QuickJS 快照、待处理的 bridge 请求，以及作用域元数据（agent run id、session id/key），直到 `wait` 恢复它或它过期。
- 过期、错误的 session、错误的 run，以及未知/已在恢复中的 `runId` 值不会产生单独的终态；它们会表现为 `failed` 结果（`code: "invalid_input"`），并带有类似 `code mode run is unavailable or expired.` 或 `code mode run belongs to a different session.` 的消息。
- 一旦一个运行进入 `completed` 或 `failed` 并结算，其快照就会立即从映射中移除；或者在 Gateway 关闭时被丢弃（按设计，重启后不会保留任何内容：这是临时运行时状态）。
- OpenClaw 将每个进程中同时挂起的运行数量上限限制为 64，并且当超过该上限时，会以 `too many suspended code mode runs.` 拒绝新的挂起请求。

快照存储受 `maxSnapshotBytes`（每次运行）、上述每进程挂起运行上限，以及 `snapshotTtlSeconds` 的限制。

## QuickJS-WASI 运行时

OpenClaw 在拥有该包的依赖中将 `quickjs-wasi` 作为直接依赖加载；它
不会依赖为无关依赖安装的传递性副本。

运行时职责：编译/加载 QuickJS-WASI WebAssembly 模块；
为每次代码模式运行或恢复创建一个隔离的 VM；通过稳定名称注册宿主回调；
设置内存和中断限制；执行 JavaScript；清空
待处理任务；快照挂起的 VM 状态；为 `wait`
恢复快照；在终止状态后释放 VM 句柄和快照。

运行时在 Node.js worker 线程中执行，位于 OpenClaw 的主
事件循环之外。来宾无限循环不得无限期阻塞 Gateway 进程；
worker 的中断处理器会独立于来宾代码的配合，强制执行墙钟超时。

## TypeScript

TypeScript 支持仅作为源代码转换：接受的输入是一个 TypeScript 代码字符串；输出是由 QuickJS-WASI 执行的 JavaScript 字符串。不进行类型检查、模块解析，也不支持 `import`/`require`。诊断信息会作为 `failed` 结果返回。

TypeScript 编译器仅在 TypeScript 单元格中按需加载；普通 JavaScript 单元格以及禁用代码模式下都不会加载它。

## 安全边界

模型代码是不可信的。runtime 采用纵深防御：

- 在主事件循环之外、于 worker 线程中运行 QuickJS-WASI
- 将 `quickjs-wasi` 作为直接依赖加载，而不是通过 Codex 或传递依赖加载
- 访客环境中不提供文件系统、网络、子进程、模块导入、环境变量或宿主全局对象
- 使用 QuickJS 内存和中断限制，以及父进程级别的墙钟超时
- 强制执行输出、快照、日志和待调用次数上限
- 通过窄 JSON 适配器序列化宿主桥接值
- 将宿主错误转换为普通的访客错误，绝不返回宿主运行域对象
- 在超时、中止、会话结束或过期时删除快照
- 拒绝对 `exec`、`wait` 和 Tool Search 控制工具的递归访问
- 防止便利名称冲突覆盖目录助手

沙箱只是其中一层安全措施；对于高风险部署，运维方仍可能需要操作系统级加固。

## 错误代码

```typescript
type CodeModeErrorCode =
  | "invalid_input"
  | "runtime_unavailable"
  | "timeout"
  | "output_limit_exceeded"
  | "snapshot_limit_exceeded"
  | "internal_error";
```

`invalid_input` 涵盖错误的 `exec`/`wait` 参数、被禁用的语言、
被拒绝的模块访问、TypeScript 转换失败、未知/已过期/
作用域错误的 `runId` 值，以及过多的挂起运行。`runtime_unavailable`
涵盖启动失败或以非零状态退出的 QuickJS 工作进程。

返回给来宾的错误是纯数据；宿主 `Error` 实例、堆栈
对象、原型以及宿主函数都不会进入 QuickJS。

## 遥测

每个结果的 `telemetry` 字段会报告：隐藏的目录大小，以及来源
分布（`openclaw`/`mcp`/`client` 计数）、本次运行目录的累计搜索/描述/调用
计数，以及模型可见的工具名称（`exec`、
`wait`）。

遥测不得包含密钥、原始环境值，或在现有 OpenClaw 轨迹策略之外未脱敏的
工具输入。

## 调试

当代码模式表现与普通工具运行不同的时候，使用有针对性的模型传输日志记录：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

对于负载形状调试，使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。
这会记录模型请求的一个带上限、已脱敏的 JSON 快照；仅在调试时使用，因为提示词和消息文本仍然可能出现。

对于流调试，使用 `OPENCLAW_DEBUG_SSE=peek` 来记录前五个已脱敏的 SSE 事件。若最终提供方负载在代码模式表面被激活后不恰好包含 `exec` 和 `wait`，代码模式也会进入关闭失败状态。

## 实现布局

- config contract: `tools.codeMode`
- 目录构建器：用于压缩条目和 id 映射的有效工具
- 模型表面适配器：用 `exec` 和 `wait` 替换可见工具
- QuickJS-WASI 运行时适配器：加载、求值、快照、恢复、释放
- worker 监督器：超时、中止、崩溃隔离
- bridge 适配器：JSON 安全的主机回调和结果传递
- TypeScript 转换适配器
- snapshot 存储：TTL、大小上限、run/session 作用域
- 用于嵌套工具调用的轨迹投影
- telemetry 计数器和诊断信息

该实现复用了 Tool Search 中的目录和执行器概念，但
没有使用 `node:vm` 子进程作为沙箱。

## 验证清单

代码模式覆盖应证明：

- disabled config leaves existing tool exposure unchanged
- object config without `enabled: true` leaves code mode disabled
- enabled config exposes only `exec` and `wait` to the model when tools are
  active for the run
- raw no-tool runs, `disableTools`, and empty allowlists do not trigger
  code-mode payload enforcement
- all effective non-MCP tools appear in `ALL_TOOLS`
- denied tools do not appear in `ALL_TOOLS`
- `tools.search`, `tools.describe`, and `tools.call` work for OpenClaw tools
- `API.list("mcp")` and `API.read("mcp/<server>.d.ts")` expose TypeScript-style MCP declarations without a bridge/tool call
- MCP namespace `$api()` remains available as an inline fallback for schemas
- MCP namespace calls work for visible MCP tools with one object input, while
  direct MCP catalog entries are absent from `tools.*`
- Tool Search control tools are hidden from both the model surface and the
  hidden catalog
- nested calls preserve approval and hook behavior
- shell `exec` is hidden from the model but callable by catalog id when
  allowed
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

1. 使用 `tools.codeMode.enabled: false` 启动一个 Gateway。
2. 发送一个带有小型直接工具集的 agent 回合。
3. 断言模型可见的工具保持不变。
4. 以 `tools.codeMode.enabled: true` 重新启动。
5. 发送一个带有 OpenClaw、插件、MCP 和客户端测试工具的 agent 回合。
6. 断言模型可见的工具列表恰好是 `exec`、`wait`。
7. 在 `exec` 中，读取 `ALL_TOOLS` 并断言有效的测试工具存在。
8. 在 `exec` 中，通过 `tools.search`、`tools.describe` 和 `tools.call` 调用 OpenClaw/插件/客户端工具。
9. 在 `exec` 中，调用 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")`，并断言声明文件描述了可见的 MCP 工具。
10. 在 `exec` 中，通过 `MCP.<server>.<tool>({ ...input })` 调用 MCP 工具，并断言直接的 MCP 目录条目不出现在 `ALL_TOOLS` 和 `tools.*` 中。
11. 断言被拒绝的工具不存在，且无法通过猜测的 id 调用。
12. 启动一个嵌套工具调用，使其在 `exec` 返回 `waiting` 后解析完成。
13. 调用 `wait` 并断言恢复的 VM 收到了工具结果。
14. 断言最终答案包含在恢复后生成的输出。
15. 断言超时、abort 和 snapshot 过期会清理运行时状态。
16. 导出轨迹，并断言嵌套调用在父 code-mode 调用下可见。

仅限文档的对此页面的更改仍应运行 `pnpm check:docs`。

## 相关内容

- [工具搜索](/tools/tool-search)
- [Agent 运行时](/concepts/agent-runtimes)
- [Exec 工具](/tools/exec)
- [代码执行](/tools/code-execution)
