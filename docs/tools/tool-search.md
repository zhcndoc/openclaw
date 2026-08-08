---
summary: "工具搜索：通过搜索、描述和调用，将庞大的 OpenClaw 工具目录压缩起来"
title: "工具搜索"
read_when:
  - 当你希望 OpenClaw 代理使用大型工具目录，但不想把每个工具 schema 都加入提示词时
  - 当你希望通过一个紧凑的运行时入口同时暴露 OpenClaw 工具、MCP 工具和客户端工具时
  - 当你正在实现或调试 OpenClaw 运行中的工具发现功能时
---

工具搜索是 OpenClaw 代理运行时的一项实验性功能。它为代理提供一种
紧凑的方式来发现并调用大型工具目录。当一次运行中可用工具很多，
但模型大概率只需要其中少数几个时，它会很有用。

本文档介绍 OpenClaw 工具搜索。它不是 Codex 原生工具
搜索或动态工具接口。Codex 原生代码模式、工具搜索、延迟
动态工具以及嵌套工具调用是稳定的 Codex harness 接口，
不依赖 `tools.toolSearch`。

对于提供 QuickJS-WASI `exec`/`wait`
接口而不是工具搜索控制项的通用 OpenClaw 运行时，请参见 [代码模式](/tools/code-mode)。

当为 OpenClaw 运行启用时，模型会自动接收一个有边界的
可用受信任工具名称和描述目录。默认情况下，它还会接收一个
`tool_search_code` 工具，以及任何其结构化结果无法通过紧凑桥传递的仅直接工具。
代码工具会在隔离的 Node 子进程中运行一小段 JavaScript 主体，并通过 `openclaw.tools` 桥接：

```js
const hits = await openclaw.tools.search("创建一个 GitHub issue");
const tool = await openclaw.tools.describe(hits[0].id);
return await openclaw.tools.call(tool.id, {
  title: "启动时崩溃",
  body: "复现步骤...",
});
```

该目录可以包含符合目录条件的 OpenClaw 工具、插件工具、MCP
工具以及客户端提供的工具。这个目录让模型了解它可以发现哪些
受信任能力，而无需预先暴露目录中每个 schema。它还说明，
经策略批准的 MCP 和客户端工具可能是可发现的。它们不受信任的名称和描述不会被复制到
系统提示词中。相反，模型会搜索紧凑描述符，在需要精确 schema 时描述
选中的某个工具，并通过 OpenClaw 调用该工具。仅直接工具仍然对模型可见，
并不会被加入目录。

Codex harness 运行不会接收这些实验性的 OpenClaw 工具搜索
控制项。OpenClaw 通过动态工具把产品能力传递给 Codex，而
Codex 负责稳定的原生代码模式、原生工具搜索、延迟动态
工具以及嵌套工具调用。

## 一次回合如何运行

在规划阶段，OpenClaw 内嵌运行器会为此次运行构建有效目录：

1. 为代理、配置文件、沙箱和会话解析当前生效的工具策略。
2. 列出符合条件的 OpenClaw 工具和插件工具。
3. 通过会话 MCP 运行时列出符合条件的 MCP 工具。
4. 添加为此次运行提供的符合条件的客户端工具。
5. 将核心编码原语和仅可直接使用的工具保持为模型可见，并为目录中其余符合条件的工具编制紧凑描述符。
6. 将确定性、有界且经过策略过滤的能力目录添加到缓存稳定的系统提示前缀中。
7. 将 OpenClaw 代码桥、结构化回退工具或紧凑目录界面，与那些稳定且可直接调用的工具一同暴露出来。

在执行阶段，每一次真实的工具调用都会返回到 OpenClaw。隔离的 Node
运行时不持有插件实现、MCP 客户端对象或密钥。
`openclaw.tools.call(...)` 会通过桥接返回 Gateway，在那里
正常的策略、审批、钩子、日志和结果处理仍然生效。

## 模式

`tools.toolSearch` 有三种面向模型的模式：

- `code`: 暴露 `tool_search_code`，这是默认的紧凑 JavaScript 桥接，
  同时暴露能力目录和仅直接调用工具。
- `tools`: 暴露 `tool_search`、`tool_describe` 和 `tool_call` 作为纯
  结构化工具，适用于不应接收代码的提供方，同时暴露能力目录和仅直接调用工具。
- `directory`: 暴露 `tool_search`、`tool_describe` 和 `tool_call`，以及一个
  有界、缓存稳定的提示目录。核心编码原语、仅直接调用工具，以及运行交付策略要求的工具仍然可见；其他
  模式保持延后加载。

所有模式都使用相同的经策略过滤的目录和标准 OpenClaw 执行路径。标记为
`catalogMode: "direct-only"` 的工具会保持在该目录之外，并保持对模型可见。
如果当前运行时无法启动隔离的 Node 代码模式子进程，默认的 `code` 模式会在目录
压缩之前回退到 `tools`。在 `directory` 模式下，客户端提供的工具在当前运行中
仍保持直接可见，而 OpenClaw 工具、插件工具和 MCP 工具可以被压缩到目录目录之后。
对精确隐藏目录名称的直接调用会在执行前从同一已授权目录中恢复。

所有模式都是实验性的。对于较小的 OpenClaw 工具目录，优先直接暴露工具；
对于 Codex harness 运行，优先使用 Codex 原生的稳定表面。

没有单独的源选择配置。启用 Tool Search 时，在正常策略过滤之后，目录会包含
符合目录条件的 OpenClaw、MCP 和客户端工具；direct-only 工具会单独保留。

## 为什么需要它

大型目录很有用，但代价也高。把每个工具 schema 都发送给模型
会让请求更大、规划更慢，并增加误选工具的可能性。

工具搜索改变了这种形态：

- direct tools: 模型在第一个 token 之前就会看到每个已选 schema
- Tool Search code mode: 模型会看到一个紧凑的代码工具、一个有边界的
  能力目录、一个简短的 API 契约，以及任何仅直接暴露的工具
- Tool Search tools mode: 模型会看到三个紧凑的结构化回退
  工具、相同的能力目录，以及任何仅直接暴露的工具
- Tool Search directory mode: 模型会看到一个有边界的目录，以及
  search/describe/call 控制项、策略要求的直接工具，以及任何
  仅直接暴露的工具
- 在本轮过程中：模型可以根据需要加载其余 schema

对于小型目录，直接暴露工具仍然是正确的默认方案。对于一次运行中
可能看到很多工具的场景，尤其是来自 MCP 服务器或
客户端提供的应用工具时，工具搜索最合适。

能力目录按工具名称排序，限制为 18,000 个字符，
并基于已通过策略过滤的目录构建。OpenClaw 会在目录快照不变时复用
渲染后的目录，并将其放在系统提示缓存边界之上。用户消息、每轮工具猜测、
会话标识符，以及不受信任的 MCP 或客户端元数据都不会进入目录。
这使得重复轮次能够复用 prompt KV 缓存。当授权目录发生变化时，OpenClaw 会为新的
快照构建新的目录。

## API

`openclaw.tools.search(query, options?)`

搜索当前运行的有效目录。

查询必须使用英文编写。排序采用词法方式（针对工具
名称、描述以及第一方参数名称和描述使用 Okapi BM25），并带有
轻量级英文词干化，因此 `scheduling` 可以匹配到描述为 `Schedule a
recurring task` 的工具，还带有少量意图扩展，因此 `look up the price` 可以匹配到
描述为 `Search the web` 的工具。工具名称和描述均使用英文编写，
所以其他语言的查询通常不会匹配到任何内容。它不会被拒绝——目录
完全可以合法地用其他文字系统描述一个工具——但它也不再会像以前的
评分器那样：当查询没有产生可用词项时，随意截取目录的一部分并
把它呈现得像是经过排序的结果。`tool_search` 和代码模式桥接都在其面向模型的描述中
说明了这一要求。

不受信任的参数模式永远不会被索引。MCP 和客户端工具只按名称和描述进行匹配，
这与将其输入签名延迟为 `input: "unknown"` 的边界是一致的。

结果是紧凑且安全的，
可以放回提示上下文中。每个命中都包含一个受限的 TypeScript 风格
`input` 签名，例如 `{ id: string; mode?: "drip" | "flood" }`，因此
当该签名已经足够时，模型可以跳过 `describe`。受信任的
OpenClaw 核心或插件工具还可能包含一个紧凑的 `output` 提示，例如
`Array<{ id: string; paid: boolean }>`。MCP 和客户端的输出模式声明不会被提升为这种受信任的提示。
它们不受信任的输入模式也会延迟为 `input: "unknown"`；在调用它们之前请先使用 `describe`。
开放的、过大的或其他部分式输出模式会省略该提示，并仍然可通过
`describe` 获取。

```js
const hits = await openclaw.tools.search("日历事件", { limit: 5 });
```

`openclaw.tools.describe(id)`

加载一个搜索结果的完整元数据，包括精确的输入模式，以及当工具声明了
受信任的完整 `outputSchema` 时也会包含该模式。

```js
const calendarCreate = await openclaw.tools.describe("mcp:calendar:create_event");
```

`openclaw.tools.call(id, args)`

通过 OpenClaw 调用所选工具，并返回原始的 `{ tool, result }`
封装。返回 JSON 的工具通常会把其值放在
`result.details` 中。OpenClaw 会在执行前验证受信任的核心或插件工具所声明的输入模式。
缺失必填参数、类型不正确，
以及被禁止的属性会返回可操作的工具错误，而不是执行该工具；拼写错误的属性在可用时会包含建议的参数。
如果受信任的工具还声明了 `outputSchema`，OpenClaw 会在执行前编译该模式，
并在所有正常工具钩子之后、返回目录调用结果之前验证最终的 `details`。
MCP 和客户端自有的模式仍会延迟到它们各自的执行边界。

在结构化模式下，`tool_call` 还会修复来自本地模型的扁平化目标参数。
它会保留诸如 `id` 和 `name` 之类的目标字段，并且会拒绝
含糊不清的工具选择器，而不是调用错误的工具。当目标字段与另一个已编目的工具匹配时，
请将目标参数嵌套在 `args` 下。

```js
await openclaw.tools.call(calendarCreate.id, {
  summary: "计划",
  start: "2026-05-09T14:00:00Z",
});
```

工具作者在工具的 `outputSchema` 属性上声明输出契约。
它描述的是 `AgentToolResult.details`，而不是渲染后的内容块。请包含
所有不会抛错的变体，或者在结果不稳定时省略它。请参阅
[代码模式输出契约](/tools/code-mode#declared-output-contracts) 和
[工具插件](/plugins/tool-plugins#output-contracts)。

结构化回退模式暴露与工具相同的操作：

- `tool_search`
- `tool_describe`
- `tool_call`

`tool_search` 接受现有的单查询格式，也接受由多个
独立查询组成的批次：

```json
{
  "query": "today's calendar events",
  "limit": 3
}
```

```json
{
  "queries": [
    { "query": "today's calendar events", "limit": 3 },
    { "query": "Slack messages needing attention", "limit": 3 }
  ]
}
```

单查询调用仍会直接返回紧凑的候选数组。
批量调用则按请求顺序返回 `{ results: [{ query, candidates }] }`。
每个查询使用与普通搜索相同的有效目录、排序、筛选和单查询限制；
同一个候选项可以出现在多个结果组中。
描述会在输出前进行压缩。如果完整批次超过
4,000 个字符的响应预算，则会移除排名较低的候选项，
并且响应中会包含 `truncated: true`。丢失了候选项的结果组
也会包含 `truncated: true`，因此不会将一个被截断的空结果组误认为
没有匹配项的查询。
省略的单查询限制使用 `searchDefaultLimit`。一次批次中的有效限制
最多可以请求总计 50 个候选项。一个批次最多接受 16 个查询，
每个查询最多 512 个字符，序列化查询列表总计最多 512 个 UTF-8 字节。
无效批次会作为一个请求整体失败，而没有匹配项的有效查询
会返回空的 `candidates` 数组。

目录模式暴露：

- `tool_search`
- `tool_describe`
- `tool_call`

它还会直接显示核心文件和 shell 原语、客户端提供的工具、仅直接可用的
工具，以及策略要求的交付工具。其他已授权的
工具模式会保持延迟状态，而不是随着每次用户提示而改变。MCP 工具
不能冒充直接可见的核心或策略要求的交付工具。如果受限目录省略了条目，请使用 `tool_search` 查找它们，并使用 `tool_describe`
检索它们的完整模式。如果模型直接请求一个精确的隐藏目录工具名称，
OpenClaw 会在正常执行前从已授权目录中解析它。
目录模式下的客户端工具名称不得与 OpenClaw、插件或 MCP
工具名称冲突，因为精确的延迟分发会使用这些名称。

## 运行时边界

代码桥接运行在一个短生命周期的 Node 子进程中。该子进程以
启用 Node 权限模式启动，环境为空，没有文件系统或
网络权限，也没有子进程或工作线程权限。OpenClaw 强制执行
父进程的墙钟超时，并在超时时终止子进程，包括
异步续行之后。

运行时只暴露以下内容：

- `console.log`、`console.warn` 和 `console.error`
- `openclaw.tools.search`
- `openclaw.tools.describe`
- `openclaw.tools.call`

对于最终调用，正常的 OpenClaw 行为仍然适用：

- 工具允许和拒绝策略
- 按代理和按沙箱的工具限制
- 通道/运行时工具策略
- 审批钩子
- 插件 `before_tool_call` 钩子
- 会话身份、日志和遥测

## 配置

为 OpenClaw 运行启用默认代码桥接的工具搜索：

```bash
openclaw config set tools.toolSearch true
```

等效的 JSON：

```json5
{
  tools: {
    toolSearch: true,
  },
}
```

改为在 OpenClaw 运行中使用结构化回退工具：

```json5
{
  tools: {
    toolSearch: {
      mode: "tools",
    },
  },
}
```

改为在 OpenClaw 运行中使用紧凑目录表面：

```json5
{
  tools: {
    toolSearch: {
      mode: "directory",
    },
  },
}
```

调整 code 模式的超时和搜索结果限制（所示值为默认值）：

```json5
{
  tools: {
    toolSearch: {
      mode: "code",
      codeTimeoutMs: 10000,
      searchDefaultLimit: 8,
      maxSearchLimit: 20,
    },
  },
}
```

运行时会将 `codeTimeoutMs` 限制在 1000-60000 之间，将 `maxSearchLimit` 限制在 1-50 之间，并且将
`searchDefaultLimit` 限制在 1..`maxSearchLimit` 之间。

禁用它：

```json5
{
  tools: {
    toolSearch: false,
  },
}
```

## 提示词和遥测

代码模式会将一个 `telemetry` 对象附加到每个 `tool_search_code` 结果中：

- `catalogSize`: 运行时解析的目录条目数量
- `sources`: 按 `openclaw`、`mcp` 和 `client` 划分的目录条目数量
- `counterScope`: 计数器生命周期的不透明标识符；当追加工具或提示词策略缩小目录时保持稳定，而当目录被替换或恢复时发生变化
- `searchCount`、`describeCount`、`callCount`: 目录会话的累计总数，会在多次调用之间延续，而不是每次调用时重置

`tools` 和 `directory` 模式不会发出 `telemetry` 对象；它们的 `tool_search`、`tool_describe` 和 `tool_call` 结果只携带该操作的目录数据。OpenClaw 不会记录序列化后的工具或提示词字节数。[端到端场景](#e2e-validation) 会单独通过 mock provider 通道，而不是运行时测量 provider 负载的字节数。

无论哪种模式，目标工具调用都会像正常的工具调用和工具结果对一样被投影到会话转录中，而 search、describe 和 call 结果都会携带每个工具的 `id` 和 `source`。因此，会话日志仍然可以回答：

- 模型一开始看到了多少个工具 schema
- 它执行了多少次搜索和描述操作
- 最终调用了哪个工具
- 结果来自 OpenClaw、MCP 还是客户端工具。

## 端到端验证

QA Lab 网关场景通过 OpenClaw 运行时验证全部三条路径：

```bash
pnpm openclaw qa suite --provider-mode mock-openai --scenario tool-search-gateway-e2e
```

它会创建一个包含大型工具目录的临时虚假插件，启动模拟 OpenAI 提供商，然后分别以直连模式、代码模式工具搜索和结构化工具搜索模式运行网关。它会比较直连模式和代码模式下的提供商请求负载，然后验证三条路径中的会话日志和工具调用流程。

该回归验证证明：

1. Direct mode can call the fake plugin tool.
2. Tool Search can call the same fake plugin tool.
3. Direct mode exposes the fake plugin tool schemas directly to the provider.
4. Tool Search exposes only the compact bridge plus any direct-only tools.
5. The Tool Search request payload is smaller for the large fake catalog.
6. Session logs show the expected tool-call counts and bridged call telemetry.
7. Structured mode resolves two queries with one `tool_search` call before the
   selected plugin tool runs through `tool_call`.

## 失败行为

工具搜索应当在关闭状态下失败：

- 如果工具不在有效策略中，搜索不应返回它
- 如果选中的工具变为不可用，`tool_call` 应当失败
- 如果策略或审批阻止执行，调用结果应报告该
  阻止，而不是绕过它
- 如果代码桥接无法创建隔离运行时，请使用 `mode: "tools"` 或
  为该部署禁用工具搜索。

## 相关内容

- [工具和插件](/tools)
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools)
- [Exec 工具](/tools/exec)
- [ACP 代理设置](/tools/acp-agents-setup)
- [构建插件](/plugins/building-plugins)
