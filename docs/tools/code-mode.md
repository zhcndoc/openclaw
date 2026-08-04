---
summary: "使用 OpenClaw 代码模式来发现、调用并组合大型工具目录，以紧凑的 JavaScript 或 TypeScript 工作流完成任务"
title: "代码模式"
sidebarTitle: "代码模式"
read_when:
  - 你想为某次代理运行启用 OpenClaw 代码模式
  - 你需要解释为什么 Code Mode 与 Codex Code Mode 不同
  - 你正在审查紧凑工具契约、QuickJS-WASI 沙箱、TypeScript 转换或隐藏的工具目录桥接
  - 你正在审查 MCP 命名空间桥接或虚拟 API 声明
---

代码模式是 OpenClaw 代理运行时的一项实验性功能。它默认使用
`"auto"` 等级，只会启用那些在目录中被标记为首选代码模式执行者的模型；其他所有模型仍保持正常的工具暴露方式。启用后，模型不再看到所有已启用工具的 schema；相反，它只会看到 `exec`、`wait`，以及任何其结构化结果无法穿过仅限 JSON 的 guest 桥接的 direct-only 工具。模型会编写一小段 JavaScript 或 TypeScript 程序，用于搜索、描述并调用隐藏的工具目录。

本页文档介绍的是 OpenClaw 代码模式，而不是 Codex Code Mode。这两个功能共享同一个名称以及相同的控制工具名称（`exec`、`wait`），但它们是彼此独立的实现：

- Codex Code Mode 运行在 Codex 编码框架内。它的 `exec` 工具是一种自由形式语法工具：模型编写原始 JavaScript 源码（可选地在前面加上 `// @exec: {...}` pragma 行以指定执行选项），并在 Codex 的进程内 V8 Code Mode 运行时中执行。
- OpenClaw 代码模式运行在通用 OpenClaw 代理运行时中，由 `tools.codeMode.enabled`（默认 `"auto"`，按模型激活）控制。它的 `exec` 工具接受一个 JSON `{ code, language }` 载荷，并在 QuickJS-WASI worker 中执行。

二者都属于 JavaScript 执行界面，而不是 shell 命令界面。请将它们视为相互独立、实现方式不同的功能，恰好都暴露了同名的 `exec`/`wait` 工具。

在 OpenClaw 代码模式中，`command` 是 `code` 的 JavaScript 或 TypeScript 别名，而不是 shell 命令。对于 shell 或文件操作，请从 guest JavaScript 中使用 `tools.callValue` 调用相应的目录工具。可识别的 shell 命令会在 QuickJS worker 启动之前被拒绝，并附带可操作的 `invalid_input` 指引。

## 它的作用

- 面向模型可见的工具列表会变为 `exec`、`wait`，再加上任何仅直接可用的工具  
  例如 `computer`，或原生视觉 `image` 加载器，其图像结果  
  无法通过访客桥接继续传递。
- `exec` 会在隔离的 QuickJS-WASI 工作线程中执行模型生成的 JavaScript 或 TypeScript。
- 每个符合目录条件且已启用的工具（OpenClaw 核心工具、插件、MCP、客户端）都会从  
  独立的模型工具中隐藏，并通过 `ALL_TOOLS`  
  和 `tools` 暴露给访客程序。
- `exec` 的描述包含一个受限的快速索引，列出精确的 OpenClaw/插件  
  目录 ID、简洁的输入提示，以及在受信任工具提供输出 schema 时的简洁声明输出提示。它省略了描述、完整 schema、  
  MCP 条目和溢出条目；访客侧的目录查找仍然是回退方案。
- 访客代码会搜索隐藏目录，描述工具的 schema，并通过与普通 agent 回合  
  相同的执行路径调用工具（策略、审批、hooks、遥测仍然全部适用）。
- MCP 工具会按 `MCP` 命名空间分组；在代码模式中，这是调用它们的唯一支持方式。
- 当嵌套工具调用仍在等待时，`wait` 会恢复一个已挂起的代码模式运行。

代码模式只会改变面向模型的编排层表面。它不会替换工具、插件工具、MCP 工具、身份验证、审批策略、频道行为或模型选择。

## 为什么使用它

- 更小的提示面：提供方只获得两个控制工具、一个有界的原生工具索引，以及少量必需的直接工具，而不是几十或几百个完整的工具模式。
- 更好的编排：模型可以在一个代码单元中使用循环、连接、小型转换、条件逻辑以及并行嵌套工具调用。
- 更少的模型往返：声明式输出契约让模型能够在一次 `exec` 中调用并转换工具结果；未知输出仍保持原始优先。
- 提供方无关：可用于 OpenClaw、插件、MCP 和客户端工具，而不依赖提供方原生代码执行。
- 失败即关闭：如果启用了代码模式但 QuickJS-WASI 运行时不可用，运行将失败，而不是悄悄回退到广泛的直接工具暴露。

这对拥有大量已启用工具目录的代理，或者模型需要在回答前搜索、
组合并调用多个工具的工作流尤其有用。

对于工具目录较小，或者模型不能稳定编写简短程序的情况，请保留直接工具暴露。当你想要一个紧凑的目录，但更倾向于使用结构化的搜索/描述/调用控制，而不是 QuickJS-WASI guest 时，请使用 [工具搜索](/tools/tool-search)。

## 快速开始

### 默认值和覆盖

代码模式在 `"auto"` 层级中默认启用：只有当本次运行的模型在其提供程序目录中被标记为首选代码模式执行器时，它才会生效，而其他所有模型仍保持正常的工具暴露。无需任何配置。有关确切语义以及随附的模型列表，请参见[按模型自动激活](#automatic-per-model-activation)。

要对每次运行都选择退出：

```json5
{
  tools: {
    codeMode: false,
  },
}
```

要强制每次具备工具能力的运行都启用代码模式，而不考虑模型：

```json5
{
  tools: {
    codeMode: true,
  },
}
```

对象形式也可以：`tools.codeMode.enabled` 接受相同的 `false`、`true` 和 `"auto"` 值。不设置 `enabled` 的对象会保留 `"auto"` 默认值。

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

### 模型会做什么

对于带有声明输出的工具，例如
`Array<{ id: string; paid: boolean; tons: number }>`, 一个来宾程序可以
选择、调用并转换它：

```javascript
const [shipmentTool] = await tools.search("list shipments");
const shipments = await tools.callValue(shipmentTool.id, {});
return shipments.filter((shipment) => !shipment.paid && shipment.tons > 10);
```

当快速索引行以 `-> ?` 结尾时，输出形状是未知的。第一次
`exec` 必须原样返回 `await tools.callValue(...)`。之后的一个 `exec` 可以
转换观测到的值。这会额外消耗一次模型轮次，但可以防止
模型猜测字段名。

### 验证活动表面

要在调试时确认模型负载形状，请使用
有针对性的日志运行 Gateway：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

在代码模式激活时，日志中对模型可见的工具名称应为 `exec` 和 `wait`。如需查看完整的已脱敏提供程序负载，可在短暂的调试会话中添加 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。

## 使用 Swarm 进行代理分发

[Swarm](/tools/swarm) 为来自 Code Mode 脚本的并发子代理编排添加了 `agents.run()`、`phase()` 和 `log()` 客户端全局变量。启用 `tools.codeMode` 和 `tools.swarm`，然后使用普通 JavaScript 控制流进行分发、决策门控和结构化收集。Swarm 是一个单独的可选开关；仅启用 Code Mode 并不会暴露 `agents.*` API。

## 技术导览

本页其余部分涵盖运行时契约和实现细节，
适用于维护者、调试工具暴露的插件作者，以及
验证高风险部署的操作人员。

## 运行状态

|                     |                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------- |
| 运行时              | [`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)                               |
| 默认状态            | `"auto"`（仅启用目录首选模型）                                            |
| 稳定性              | 实验性的 OpenClaw 接口（Codex Code Mode 是一个独立、稳定的 Codex harness 接口） |
| 目标范围            | 通用 OpenClaw 代理运行                                                                 |
| 安全态势            | 模型代码是恶意的                                                                       |
| 面向用户的承诺      | 启用代码模式绝不会静默回退为广泛的直接工具暴露                  |

## 范围

Code mode 拥有已准备运行的面向模型的编排形态。它
不拥有模型选择、通道行为、认证、工具策略或工具
实现。

范围内：模型可见的直接工具定义、隐藏工具目录
构建、JavaScript/TypeScript 来宾执行、QuickJS-WASI worker
运行时、用于 search/describe/call 的宿主回调、挂起来宾程序的可恢复状态、
输出/超时/内存/待处理调用/快照限制，以及用于嵌套工具调用的遥测/轨迹投影。

不在范围内：提供方原生的远程代码执行、shell 执行
语义、更改现有工具授权、持久化的用户编写脚本、来宾代码中的包管理器/文件/网络/模块访问，以及直接
重用 Codex Code Mode 内部机制。

提供方拥有的工具（例如远程 Python 沙箱）是独立的工具。参见
[代码执行](/tools/code-execution)。

## 术语

- **Code mode**: OpenClaw 运行时模式，会隐藏与目录兼容的模型
  工具，并暴露 `exec`、`wait`，以及必需的仅直接使用工具。
- **Guest runtime**: 执行模型代码的 QuickJS-WASI JavaScript VM。
- **Host bridge**: 从 guest 代码返回到 OpenClaw 的狭窄、兼容 JSON 的回调接口。
- **Catalog**: 在常规工具
  策略、插件、MCP 和客户端工具解析之后，按运行范围确定的有效工具列表。
- **Nested tool call**: 通过主机
  桥从 guest 代码发起的工具调用。
- **Snapshot**: 保存的 QuickJS-WASI VM 序列化状态，使 `wait` 能够继续一个已挂起的 code-mode 运行。

## 配置

`tools.codeMode.enabled` 是激活门槛；仅设置其他字段不会单独启用此功能。

| 字段                  | 默认值                       | 限制                                           |
| --------------------- | ---------------------------- | ----------------------------------------------- |
| `enabled`             | `"auto"`                     | `false`、`true` 或 `"auto"`（按模型）           |
| `runtime`             | `"quickjs-wasi"`             | 仅支持的值                                      |
| `mode`                | `"only"`                     | 暴露控制/直接工具，其余工具归类                 |
| `languages`           | `["javascript", "typescript"]` | 两者中的任意子集                                |
| `timeoutMs`            | `10000`                      | `100`-`60000`                                   |
| `memoryLimitBytes`    | `67108864`                   | `1048576`-`1073741824`                          |
| `maxOutputBytes`      | `65536`                      | `1024`-`10485760`                               |
| `maxSnapshotBytes`    | `10485760`                   | `1024`-`268435456`                              |
| `maxPendingToolCalls` | `16`                         | `1`-`128`                                       |
| `snapshotTtlSeconds`  | `900`                        | `1`-`86400`                                     |
| `searchDefaultLimit`  | `8`                          | 限制为 `maxSearchLimit`                         |
| `maxSearchLimit`      | `50`                         | `1`-`50`                                        |

如果代码模式已启用但 QuickJS-WASI 无法加载，OpenClaw 会在该次运行中直接失败并关闭；
它不会在回退时静默暴露普通工具。此规则适用于 `true` 和模型解析结果为首选的 `"auto"` 运行：
一旦进入运行，就绝不会静默回退为广泛的直接工具暴露。

## 自动按模型启用

`tools.codeMode.enabled` 接受三个值：

- `"auto"`（默认）：仅当运行所用模型在其提供方目录中被标记为首选代码模式执行者时，代码模式才会启用。
- `false`：所有运行都关闭代码模式。
- `true`：无论模型如何，所有支持工具的运行都会启用代码模式。

`false` 和 `true` 是绝对覆盖项，其行为与 `"auto"` 层级出现之前完全相同。

### `compat.codeMode` 目录标志

提供方目录可以在模型条目上用 `compat.codeMode` 对模型分层，
它与 `compat.supportsTools` 等标志并列：

- `"preferred"`：该模型能够稳定编写简短的编排程序，并受益于紧凑的代码模式界面；`"auto"` 会启用代码模式。
- `"capable"`（或缺省）：该模型在强制设置 `enabled: true` 时可以运行代码模式，但 `"auto"` 会保留普通工具暴露方式。

不支持工具的模型根本不能使用代码模式；不存在单独的“unsupported”层级。该标志是由提供方插件目录拥有的能力元数据；核心只读取通用的 compat 字段。

### 已随版本发布的首选模型

捆绑的提供方目录当前将以下模型标记为 `"preferred"`：

| 提供方    | 模型                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| anthropic | `claude-fable-5`, `claude-opus-5`, `claude-sonnet-5`, `claude-mythos-5`, `claude-opus-4-8`, `claude-haiku-4-5`                               |
| deepseek  | `deepseek-v4-pro`, `deepseek-v4-flash`                                                                                                       |
| google    | `gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash` |
| kimi      | `k3`, `k3-256k`                                                                                                                              |
| minimax   | `MiniMax-M3`                                                                                                                                 |
| moonshot  | `kimi-k3`                                                                                                                                    |
| openai    | `gpt-5.6`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.5-pro`                                                          |
| xiaomi    | `mimo-v2.5`                                                                                                                                  |
| zai       | `glm-5.2`, `glm-5.1`                                                                                                                         |

其余所有模型，包括所有由 Ollama 提供的本地模型，都会保持未标记状态，并在 `"auto"` 下保持普通工具暴露方式。

### 由多个提供方同时提供的模型

若干供应商可通过多个 provider id 访问：例如订阅端点与 API 端点并存，或某个网关转售另一供应商的模型。由于 `"auto"` 会根据本次运行所使用的目录来解析层级，因此，描述同一上游模型的两个目录不能意外产生不一致。

因此，共享模型的每一行目录条目，一旦任一同级条目标记了层级，都会显式写明自己的层级。匹配权重时按供应商自身名称进行匹配，所以如果某个目录用命名空间 id 或不同大小写重新发布了一个模型，也会自动匹配：`novita/moonshotai/kimi-k3`、`nvidia/z-ai/glm-5.2` 和 `together/deepseek-ai/DeepSeek-V4-Pro` 都会与第一方条目归为一组，而无需任何人额外声明。只有真正不同的名称才需要清单中的 `upstreamModel` 标记，正如 `kimi` 目录对 `moonshot/kimi-k3` 所使用的那样。

像 `baseten`、`deepinfra`、`github-copilot`、`gmi`、`novita`、`nvidia`、`ollama-cloud`、`opencode`、`opencode-go`、`qianfan`、`together`、`venice` 和 `volcengine-plan` 这类转售商和聚合器目录，目前对第一方目录标记为 `"preferred"` 的模型声明为 `"capable"`：首选层级来自在第一方端点上的评估，而这些运行尚未针对每个转售商重复执行。将这些条目中的某一项提升层级，是一个有意且有证据支持的变更，而不是疏漏。

对于 OpenAI 模型，该标志只在运行解析到 OpenClaw 内嵌代理运行时才有意义。默认的 OpenAI 路由使用 Codex 风格的 harness 界面，在这种情况下 OpenClaw 代码模式并不适用；目录标志不会改变这一路由决策。

### 何时选择启用

在上面列出的首选模型上进行的 A/B 评估中，代码模式在任务通过率持平或更高的情况下，总 token 使用量大约降低了 30-50%，主要原因是它用一个紧凑的程序界面替代了许多完整的工具 schema 和逐工具往返。低于首选层级的模型没有显示出一致的收益，有时甚至表现倒退，这也是 `"auto"` 让它们继续使用直接工具的原因。

默认的 `"auto"` 适合会在多个模型之间切换的代理：强模型获得紧凑界面，较弱或本地模型则保留它们最擅长的暴露方式。当你已经验证某个未标记模型在代码模式下表现良好时，请使用 `true`；对单模型部署来说，全局强制开启最可预测。对于开权重或未缓存的服务场景，每个 prompt token 都会被计费或重新计算，建议按模型启用（通过 `"auto"` 或每个代理的覆盖配置），而不是全局启用，因为节省 token 的前提是模型确实能很好地使用程序界面。

## 激活

在确定有效工具策略之后、组装最终模型请求之前，会进行代码模式评估：

1. 解析 agent、模型、provider、sandbox、channel、sender 和 run
   policy。
2. 构建有效的 OpenClaw 工具列表，添加符合条件的插件、MCP 和
   客户端工具。
3. 应用允许/拒绝策略。
4. 如果 `tools.codeMode.enabled` 为 `false`，或者其值为 `"auto"` 且该运行的模型
   不是目录首选，则继续按正常方式暴露工具。
5. 如果已启用且该运行的工具处于活动状态，则保留必需的仅直连工具，并将每个目录中符合条件的有效工具注册到代码模式目录中。
6. 从模型可见列表中移除已编目工具；将 `exec` 和 `wait` 与保留的仅直连工具一并添加。

那些刻意不包含任何工具的运行（原始模型调用、`disableTools: true`，或空的 `tools.allow` 列表）不会激活代码模式表面，即使配置了 `tools.codeMode.enabled: true` 也是如此。代码模式和 OpenClaw 工具发现对同一次运行是互斥的；如果代码模式被激活，则不会发生工具发现压缩。

代码模式目录的作用域限定为该运行，绝不能泄漏来自其他 agent、session、sender 或 run 的工具。

## 模型可见工具

当代码模式处于激活状态时，模型可见 `exec`、`wait` 以及任何必需的
仅直连工具。其他所有已启用工具都会从面向模型的工具列表中隐藏，并注册到代码模式目录中。

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

当来宾环境暂停并保留了仍然需要对模型可见的续执行状态时，`exec` 会返回 `waiting`——例如显式的 `yield_control(...)`，或是在 `exec` 截止时间内尚未完成的桥接工具调用。结果包含用于 `wait` 的 `runId`。桥接工具调用——`tools.search`/`describe`/`call` 以及命名空间调用（包括 MCP 命名空间调用）——会在同一次 `exec`/`wait` 调用中自动清空，只要它们在截止时间内完成；因此，一个等待多个工具的紧凑代码块可以在一个模型回合内执行完毕，而不必为每个 `await` 强制进行一次模型工具调用。可重启的运行永远不会自动清空；其待处理工作仍然会经过可重放安全检查。

当来宾虚拟机没有待处理工作，并且在 OpenClaw 的输出适配器运行后最终值与 JSON 兼容时，`exec` 才返回 `completed`。

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

## Guest 运行时 API

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;
declare const MCP: Record<string, unknown>;
declare const namespaces: Record<string, unknown>;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` 是运行作用域目录的紧凑元数据；默认情况下它不包含完整 schema。模型可见的 `exec` 描述还包括一个有界、确定性的精确 OpenClaw/插件 id 子集、紧凑输入提示以及可信的声明式输出提示。描述会继续延后加载，因此对抗性的目录说明文字无法引导模型。当该索引未列出某个工具时，请读取 `ALL_TOOLS`，或在 guest 程序中调用 `tools.search(...)`。

每条快速索引行中的箭头描述的是 `tools.callValue(...)` 的返回值。`-> Array<{ id: string }>` 是一个声明式输出提示；`-> ?` 表示输出未知。未知输出保持原始值优先：先原样返回该值，观察它，然后在后续的 `exec` 中进行过滤或映射，而不是猜测字段名。当一个已声明输出的读取最终流向一个 `-> ?` 调用时，也同样适用：直接返回该调用的原始值，不要把它包装成请求的答案形状。

```typescript
type ToolCatalogEntry = {
  id: string;
  name: string;
  label?: string;
  description: string;
  source: "openclaw" | "mcp" | "client";
  sourceName?: string;
  input: string;
  output?: string;
};
```

`input` 是针对常见情况的有界 TypeScript 风格签名。若仍需要精确的完整 schema，请使用 `tools.describe(...)`。远程 MCP 和客户端条目使用 `input: "unknown"`，因此它们不受信任的 schema 会继续延后，直到 `describe`。`output` 只在由受信任的 OpenClaw 核心或插件 `outputSchema` 派生出的完整紧凑提示时才会出现。MCP 和客户端的输出 schema 声明不会被提升为这个受信任的目录提示。

插件工具使用 `source: "openclaw"`，并将 `sourceName` 设为所属插件 id；不存在单独的 `"plugin"` source 值。`source: "mcp"` 只用于 `sourceName`/`mcp` 元数据中的 MCP 条目（并且会从 `ALL_TOOLS`/`tools.*` 中过滤掉，见下文）。

完整 schema 仅按需加载：

```typescript
type ToolCatalogEntryWithSchema = ToolCatalogEntry & {
  parameters: unknown;
  outputSchema?: unknown;
};
```

目录辅助函数：

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogEntry[]>;
  describe(id: string): Promise<ToolCatalogEntryWithSchema>;
  callValue(id: string, input?: unknown): Promise<unknown>;
  call(id: string, input?: unknown): Promise<unknown>;
  [safeToolName: string]: unknown;
};
```

配对的网关节点可通过 `nodes` 全局变量获取：

```typescript
const available = await nodes.list();
const node = await nodes.get(available[0].id);
const status = await node.invoke("device.status");
```

`nodes.list()` 返回已配对节点的 id、名称、平台、连接状态以及已声明的命令。`nodes.get(idOrName)` 会优先解析精确 id，然后才是显示名称，并返回一个带有 `id`、`name` 和 `invoke(command, params?)` 的句柄。调用使用的是普通的 `nodes` 工具路径，因此配对、命令策略、作用域、审批、超时、钩子和遥测都保持不变。只有当节点声明了 `fs.listDir` 时，句柄才会包含 `listDir(path)`。它不包含 `exec`：通用 nodes 接口为带有节点主机的正常 shell `exec` 工具保留了 `system.run`。

仅为无歧义的安全名称安装了便捷工具函数：

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.callValue(fileRead.id, { path: "README.md" });

// 如果隐藏目录中有一个无歧义的 `web_search` 条目：
const hits = await tools.web_search({ query: "OpenClaw 代码模式" });
```

`tools.callValue(...)` 会直接返回普通工具的 JSON `details` 值。`tools.call(...)` 会保留原始的 `{ tool, result }` 包装，以便需要内容块或其他结果元数据的调用方使用。

## 已声明的输出契约

OpenClaw 工具可以为放置在 `AgentToolResult.details` 中的结构化值声明 `outputSchema`。这对 Code Mode 和 Tool Search 很有用；它不是提供方原生的工具响应 schema，也不会改变直接工具暴露方式。

对于使用 `defineToolPlugin` 制作的工具，请在 `parameters` 旁边声明 schema：

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

const Shipment = Type.Object(
  {
    id: Type.String(),
    paid: Type.Boolean(),
    tons: Type.Number(),
  },
  { additionalProperties: false },
);

export default defineToolPlugin({
  id: "shipping",
  name: "Shipping",
  description: "Shipment tools.",
  tools: (tool) => [
    tool({
      name: "shipping_list",
      description: "List shipments.",
      parameters: Type.Object({}),
      outputSchema: Type.Array(Shipment),
      execute: async () => loadShipments(),
    }),
  ],
});
```

对于 `api.registerTool(...)` 或工厂工具，请将相同的 `outputSchema` 属性放到返回的 `AnyAgentTool` 对象上。

当前内置契约包括 `agents_list`、`apply_patch`、`conversations_list`、`conversations_send`、`conversations_turn`、`edit`、`openclaw`、`read`、`screen`、`sessions_history`、`sessions_list`、`sessions_search`、`sessions_send`、`session_status`、`spawn_task`、`terminal`、`web_fetch` 和 `web_search`。精确透传可以直接重用其所属协议的 schema，而不是复制一个仅限模型的契约。例如，对话工具暴露了与 `conversations.list`、`conversations.send` 和 `conversations.turn` 相同的 Gateway 结果 schemas；`web_fetch` 拥有一个工具本地 schema，其提示暴露稳定元数据、文本、缓存状态和嵌套溢出元数据；`web_search` 将其精确的规范化结果/答案/错误/原始值联合类型声明为完整的快速索引提示。文件系统契约返回结构化的读取文本、图像、截断以及可选的未找到结果；显式编辑返回变更状态以及 diff/patch 数据；`apply-patch` 返回路径摘要。当快速索引声明了这些字段时，一个单元就可以同时完成发现和交付，而无需单独的检查轮次：

```javascript
const listed = await tools.conversations_list({ query: "build bot" });
const target = listed.conversations.find((item) => item.label === "Build bot");
if (!target) throw new Error("conversation not found");
return await tools.conversations_send({
  conversationRef: target.conversationRef,
  message: "Build finished.",
});
```

嵌套调用仍然使用正常的工具策略、钩子和审批。如果完整契约是精确的，但对于受限的快速索引来说太大，则它仍可通过 `tools.describe(...)` 获得，而箭头保持为 `-> ?`。

契约规则是严格的：

- 描述的是精确的、与 JSON 兼容的 `details` 值，而不是渲染后的 `content` 块或提供方信封。
- 包含每一种不抛异常的成功或错误变体。如果工具没有稳定的结构化结果，则省略 `outputSchema`。
- 对于完整的快速索引提示，请用 `{ additionalProperties: false }` 关闭对象层级。开放式、过大或其他部分 schema 仍可通过 `tools.describe(...)` 获得，但不会启用单轮字段使用。
- OpenClaw 会先在运行工具前编译 schema，然后在正常工具钩子之后、目录调用返回之前验证最终的 `details`。无效 schema 不能运行工具；不匹配会失败且不会打印该值。
- 紧凑提示是确定性的且有界的。当紧凑提示不足时，`tools.describe(...)` 会暴露完整且可信的 schema。
- 已安装的插件代码本身就是受信任的本地代码。远程 MCP 和客户端元数据仍然是不受信任的，不能选择加入这些快速索引提示。

参见 [工具插件](/plugins/tool-plugins#output-contracts) 了解插件编写详情。

MCP 目录条目不能通过 `tools.callValue(...)`、`tools.call(...)` 或代码模式中的便捷函数直接调用；它们仅通过生成的 `MCP` 命名空间暴露。TypeScript 风格的声明文件可通过只读的 `API` 虚拟文件表面获取，因此代理无需将 MCP schemas 添加到提示中，就能检查 MCP 签名：

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

隐藏目录在经过有效策略过滤后，按顺序包含以下工具：OpenClaw 核心工具、捆绑插件工具、外部插件工具、MCP 工具，然后是客户端在运行时当前提供的工具。

目录 ID 在单次运行内保持稳定，并且在可能的情况下，对于等价的工具集是确定性的。实际格式如下：

```text
<source>:<owner>:<tool-name>
```

其中 `<source>` 为 `openclaw`、`mcp` 或 `client`（插件工具使用 `openclaw`，其插件 ID 作为 `<owner>`；核心工具使用 `openclaw:core:*`）。例如：

```text
openclaw:core:message
openclaw:browser:browser_request
mcp:github:create_issue
client:app:select_file
```

该目录省略了代码模式控制工具（`exec`、`wait`、`tool_search_code`、
`tool_search`、`tool_describe`、`tool_call`），以及只能直接调用的工具。控制
工具不得通过目录递归；直接可调用的工具仍对模型可见，因为它们的结构化结果无法跨越 QuickJS 桥接。

MCP 条目保留在按运行范围划分的目录中，因此策略、审批、钩子、
遥测、转录投影以及精确工具 ID 都与常规工具执行保持共享。面向来宾的 `ALL_TOOLS`、`tools.search(...)`、
`tools.describe(...)`、`tools.callValue(...)` 和 `tools.call(...)` 视图会省略 MCP 条目。生成的
`MCP.<server>.<tool>({ ...input })` 命名空间会解析回精确的目录 ID，并通过相同的执行器路径进行调度。

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

模型可见的 `exec` 工具是 code-mode 工具。如果启用了普通的 OpenClaw
shell `exec` 工具，它对模型是隐藏的，并且会像
其他任何工具一样被编入目录。

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

- `waiting` 结果会存储 QuickJS 快照、待处理的桥接请求，以及
  作用域元数据（代理运行 id、会话 id/key），直到 `wait` 恢复它或
  它过期。
- 过期、错误的会话、错误的运行，以及未知/已在恢复中的 `runId`
  值不会产生单独的终态；它们会表现为
  `failed` 结果（`code: "invalid_input"`），并带有类似 `code mode
run is unavailable or expired.` 或 `code mode run belongs to a different
session.` 的消息。
- 一次运行的快照会在其状态变为
  `completed` 或 `failed` 后立即从映射中移除，或者在 Gateway 关闭时被丢弃（没有任何内容会在重启后保留：这是短暂的运行时状态）。
- 对于只读工作，`exec` 可以设置 `restartSafe: true`。随后 OpenClaw 会在执行前拒绝任何会产生副作用的目录和命名空间工具调用，并
  将挂起结果标记为可重放安全。如果重启中断了 `wait`，
  [重启恢复](/gateway/restart-recovery) 会从转录内容而不是从
  进程本地快照重建该轮执行。恢复轮本身仍然仅限于经过审计的只读核心工具和明确可重放安全的插件工具。
- OpenClaw 会限制每个进程中同时挂起的运行数量（64），并且会拒绝超过该上限的新挂起，提示 `too many suspended code mode
runs.`。

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

每个结果的 `telemetry` 字段都会报告：隐藏目录大小和来源
分解（`openclaw`/`mcp`/`client` 计数）、本次运行目录的累计搜索/描述/调用
次数，以及模型可见的工具名称（`exec`、`wait` 和保留的仅直接调用工具）。
`counterScope` 标识一个计数器生命周期：目录被替换或恢复时会发生变化，但在追加工具或提示策略缩小该目录范围时保持稳定。

运行元数据（`openclaw agent --json` 中的 `meta.agentMeta`，在
`agent exec --json` 包装层中也会镜像）会添加每次运行的统计信息：

- `codeModeEngaged`：仅当代码模式实际拥有模型工具面时才为 `true`。这是可靠的启用信号——不要根据配置或工具名称推断是否启用：shell 工具同样名为 `exec`，而 `"auto"` 层级会根据模型能力启用。桥接 OpenClaw 工具面的执行框架（Copilot）会报告其解析后的门控状态，因此当 `tools.codeMode.enabled=true` 且 `codeModeEngaged: false` 时，可以观察到静默无操作。运行自身原生工具面的执行框架（Codex）从不启用 OpenClaw 代码模式，因此其值始终为 `false`；出于同样原因，不报告该字段的尝试会被规范化为 `false`。Codex 自身的 `codeModeOnly` 是一个独立的原生功能，该字段不会对其进行跟踪。
- `assistantTurns`：本次运行中已完成的 assistant/provider 往返次数。
- `bridgeCalls`：本次运行累计的内部桥接调用次数（`{ search, describe, call }`）。这些调用不会到达 provider；provider 可见的外部工具调用仍保留在 `meta.toolSummary.calls` 中。
- `costUsd`：根据本次运行累计的使用量和模型成本配置估算的美元成本（包含缓存读取/写入层级）；当模型没有成本数据时省略。

遥测不得包含密钥、原始环境变量值，或超出现有 OpenClaw 轨迹策略之外的
未脱敏工具输入。

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

对于流式调试，使用 `OPENCLAW_DEBUG_SSE=peek` 来记录前五个已脱敏的 SSE 事件。如果最终的提供方负载在代码模式表面激活后不包含恰好一个 `exec`、一个 `wait`，以及仅包含已批准的直接调用工具，则代码模式也会失败并关闭。

## 实现布局

- 配置契约：`tools.codeMode`
- 目录构建器：有效工具，用于压缩条目和 id 映射
- 模型表面适配器：用控制/直接工具替换可见工具
- QuickJS-WASI 运行时适配器：加载、求值、快照、恢复、释放
- 工作线程监管器：超时、终止、崩溃隔离
- 桥接适配器：JSON 安全的宿主回调和结果传递
- TypeScript 转换适配器
- 快照存储：TTL、大小上限、运行/会话作用域
- 嵌套工具调用的轨迹投影
- 遥测计数器和诊断

该实现复用了工具搜索中的目录和执行器概念，但
没有使用 `node:vm` 子进程作为沙箱。

## 验证清单

代码模式覆盖应证明：

- disabled 配置不会改变现有工具暴露
- 不带 `enabled: true` 的对象配置会使代码模式保持禁用
- 启用的配置在运行期间工具处于激活状态时，会向模型暴露 `exec`、`wait`，以及仅必需的 direct-only 工具
- 原始无工具运行、`disableTools` 和空允许列表不会触发代码模式载荷强制
- 所有目录中符合条件的有效非 MCP 工具都出现在 `ALL_TOOLS` 中
- direct-only 工具保持对模型可见，但不会出现在 `ALL_TOOLS` 中
- 被拒绝的工具不会出现在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe`、`tools.callValue` 和 `tools.call` 能用于 OpenClaw 工具
- `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")` 在没有桥接/工具调用的情况下暴露 TypeScript 风格的 MCP 声明
- MCP 命名空间 `$api()` 作为架构的内联回退仍然可用
- 对于可见的 MCP 工具，MCP 命名空间调用可以使用一个对象输入正常工作，而直接的 MCP 目录项不会出现在 `tools.*` 中
- Tool Search 控制工具对模型表面和隐藏目录都不可见
- 嵌套调用会保留审批和钩子行为
- shell `exec` 对模型隐藏，但在允许时可按目录 id 调用
- 递归的代码模式 `exec` 和 `wait` 不能从 guest 代码中调用
- TypeScript 输入会被转换并求值，而在禁用或仅 JavaScript 路径上不会加载 TypeScript
- `import`、`require`、文件系统、网络和环境访问会失败
- 无限循环会超时，且不能阻塞 Gateway
- 内存上限失败会终止 guest VM
- 对于已完成和已挂起的调用，输出和快照上限都会被强制执行
- `wait` 会恢复一个挂起的快照并返回最终值
- 过期、已中止、错误会话和未知的 `runId` 值会失败
- 转录回放和持久化会保留代码模式控制调用
- 转录和遥测会清晰显示嵌套工具调用

## 端到端测试计划

在更改运行时时，请将以下内容作为集成或端到端测试运行：

1. 启动一个 `tools.codeMode.enabled: false` 的 Gateway。
2. 使用一个小型直接工具集发送一次 agent turn。
3. 断言模型可见的工具未发生变化。
4. 以 `tools.codeMode.enabled: true` 重启。
5. 使用 OpenClaw、plugin、MCP 和 client 测试工具发送一次 agent turn。
6. 断言模型可见的工具列表为 `exec`、`wait`，外加仅配置的
   direct-only 工具。
7. 在 `exec` 中，读取 `ALL_TOOLS` 并断言目录可用的有效测试
   工具存在，而 direct-only 工具不存在。
8. 在 `exec` 中，通过 `tools.search`、`tools.describe` 和 `tools.callValue`
   （或原始 `tools.call`）调用 OpenClaw/plugin/client 工具。
9. 在 `exec` 中，调用 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")`，
   并断言声明文件描述了可见的 MCP 工具。
10. 在 `exec` 中，通过 `MCP.<server>.<tool>({ ...input })` 调用 MCP 工具，并
    断言直接 MCP 目录条目不出现在 `ALL_TOOLS` 和 `tools.*` 中。
11. 断言被拒绝的工具不存在，并且无法通过猜测 id 来调用。
12. 启动一个嵌套工具调用，该调用在 `exec` 返回 `waiting` 后才解析完成。
13. 调用 `wait`，并断言恢复的 VM 收到了工具结果。
14. 断言最终答案包含在恢复后生成的输出。
15. 断言超时、abort 和快照过期会清理运行时状态。
16. 导出轨迹，并断言嵌套调用在父级代码模式调用下可见。

仅限文档的对此页面的更改仍应运行 `pnpm check:docs`。

## 相关内容

- [Swarm](/tools/swarm) 用于从 Code Mode 脚本进行扇出式代理编排
- [工具搜索](/tools/tool-search)
- [代理运行时](/concepts/agent-runtimes)
- [Exec 工具](/tools/exec)
- [代码执行](/tools/code-execution)
