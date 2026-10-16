---
summary: "工具搜索：通过搜索、描述和调用，将庞大的 OpenClaw 工具目录压缩起来"
title: "工具搜索"
read_when:
  - "当你希望 OpenClaw 代理使用大型工具目录，但不想把每个工具 schema 都加入提示词时"
  - "当你希望通过一个紧凑的运行时入口同时暴露 OpenClaw 工具、MCP 工具和客户端工具时"
  - "当你正在实现或调试 OpenClaw 运行中的工具发现功能时"
---

工具搜索是 OpenClaw 代理运行时的一项实验性功能。它为代理提供一种紧凑的方式来发现并调用大型工具目录。当一次运行中可用工具很多， 但模型大概率只需要其中少数几个时，它会很有用。

本页记录了 OpenClaw 工具搜索。它不是 Codex-native 工具搜索或动态工具表面。 Codex-native 代码模式、工具搜索、延迟动态工具和嵌套工具调用是稳定的 Codex harness表面，不依赖于 `tools.toolSearch`。

对于公开 JavaScript `exec`/`wait` 表面而不是工具搜索控件的通用 OpenClaw 运行时，请参阅 [Code Mode](/tools/code-mode)。

当 `tools.toolSearch` 未设置时，OpenClaw 嵌入，Copilot 自动运行使用结构化工具搜索。这推迟了工具架构，同时保持策略批准的功能可用。它不会启用精益模式或删除可选工具。设置 `tools.toolSearch: false` 以恢复直接模式。接合的 [ 代码 Mode](/tools/code-mode) 优先，并且 Codex 保持其原始表面。此自动默认值不会重写配置文件。

默认情况下，嵌入式在本机 Ollama 传输上使用本地模型运行，使策略批准的 `web_search`、`web_fetch`、`memory_search` 和 `memory_get` 架构直接可见。其他可选工具仍然使用工具搜索。任何显式 `tools.toolSearch` 值都会保留其配置的行为，包括 `true`、对象或 `false`。已知托管 Ollama 路由和 OpenAI- 兼容传输保留一般默认值。

当启用 OpenClaw 运行时，模型会自动接收可用可信工具名称和描述的有界目录，以及结构化 `tool_search`、`tool_describe` 和 `dispatch_action` 控件。设置 `tools.toolSearch: true` 或不带模式的对象会选择此结构化表面。仅限直接使用的工具与控件一起保持可见。

该目录随着活动模型的上下文窗口而缩放。当空间紧张时，在省略工具名称之前会缩短描述；每个授权的目录条目仍然可搜索和调用。 OpenClaw-owned 工具的无效参数包括可以呈现的有界预期输入签名，以及被拒绝字段中接收到的类型。简短的标量预览可能会显示序列化错误，例如 `"10"` 而不是 `10`。敏感字段和注册机密已被编辑；任意文本和容器内容都会被保留。诊断是有限的，并且在目标工具执行之前无效参数仍然会失败。如果调用将承认的技能名称误认为工具 ID，则错误会指向该技能的完整指令，而不是通过工具搜索发送模型。

延迟目录省略了已经直接公开的工具。它们仍然是可搜索的，因此发现仍然可以返回其完整模式，而无需复制本机指导。

该目录可以包含符合目录条件的 OpenClaw 工具、插件工具、MCP 工具以及客户端提供的工具。这个目录让模型了解它可以发现哪些受信任能力，而无需预先暴露目录中每个 schema。它还说明， 经策略批准的 MCP 和客户端工具可能是可发现的。它们不受信任的名称和描述不会被复制到系统提示词中。相反，模型会搜索紧凑描述符，在需要精确 schema 时描述选中的某个工具，并通过 OpenClaw 调用该工具。仅直接工具仍然对模型可见， 并不会被加入目录。

Codex harness 运行不会接收这些实验性的 OpenClaw 工具搜索控制项。OpenClaw 通过动态工具把产品能力传递给 Codex，而 Codex 负责稳定的原生代码模式、原生工具搜索、延迟动态工具以及嵌套工具调用。

## <a id="how-a-turn-runs"></a> 一次回合如何运行

在规划阶段，OpenClaw 内嵌运行器会为此次运行构建有效目录：

1. 为代理、配置文件、沙箱和会话解析当前生效的工具策略。
2. 列出符合条件的 OpenClaw 工具和插件工具。
3. 通过会话 MCP 运行时列出符合条件的 MCP 工具。
4. 添加为此次运行提供的符合条件的客户端工具。
5. 将核心编码原语和仅可直接使用的工具保持为模型可见，并为目录中其余符合条件的工具编制紧凑描述符。
6. 在cache-stable system-prompt前缀中添加一个通过固定规则选择并通过策略过滤的限制大小的能力目录。
7. 将结构化搜索、描述和调用工具或紧凑的目录表面与那些稳定的、可直接调用的工具一起公开。

在执行时，每个实际工具调用都会返回到 OpenClaw，其中正常的策略、批准、挂钩、日志记录和结果处理仍然适用。

## <a id="modes"></a> 模式

`tools.toolSearch` 有两种面向模型的模式：

- `tools`：`tools.toolSearch`未设置时的默认值，`true`，或没有模式的对象。将 `tool_search`、`tool_describe` 和 `dispatch_action` 公开为普通结构化工具，以及功能目录和仅限直接工具。
- `directory`：公开 `tool_search`、`tool_describe` 和 `dispatch_action` 以及有界的、缓存稳定的提示目录。核心编码原语、直接工具以及运行交付策略所需的工具仍然可见；其他模式保持延迟。

所有模式都使用相同的策略过滤目录和正常的 OpenClaw 执行路径。标记为 `catalogMode: "direct-only"` 的工具位于该目录之外并保持模型可见。在 `directory` 模式下，客户端提供的工具在当前运行中保持直接可见，而 OpenClaw 工具、插件工具和 MCP 工具可以压缩在目录编目后面。在嵌入式工具中执行之前，对确切隐藏目录名称的直接调用是从同一授权目录中进行水化的。 [Copilotharness](/plugins/copilot) 相反，将 `directory` 映射到结构化 `tools` 语义：隐藏的 OpenClaw 目录名称必须通过 `dispatch_action` 调用，因为它们不是注册的 SDK 处理程序。

对于 OpenClaw 运行，结构化 `tools` 表面默认处于打开状态。目标工具保留自己的超时和批准行为。 Codex harness运行使用其原生表面。

压缩并不总是更便宜：小型目录可能会增加模式开销，而额外的发现轮次可以抵消初始有效负载节省。当直接模式更适合您的工作负载时，设置 `tools.toolSearch: false`。

没有单独的源选择配置。启用 Tool Search 时，在正常策略过滤之后，目录会包含符合目录条件的 OpenClaw、MCP 和客户端工具；direct-only 工具会单独保留。

## <a id="why-this-exists"></a> 为什么存在这个

大型目录很有用，但代价也高。把每个工具 schema 都发送给模型会让请求更大、规划更慢，并增加误选工具的可能性。

工具搜索改变了这种形态：

- direct tools: 模型在第一个 token 之前就会看到每个已选 schema
- Tool 搜索工具模式：该模型看到三个紧凑的结构化工具、相同的功能目录以及任何直接工具
- Tool Search directory mode: 模型会看到一个有边界的目录，以及 search/describe/call 控制项、策略要求的直接工具，以及任何仅直接暴露的工具
- 在本轮过程中：模型可以根据需要加载其余 schema

即使当前回合自动提供最终回复，启用的 `message` 工具在两种模式下都保持直接可见。切换回复传递模式不会更改该工具前缀或授予对不可用工具的访问权限。

当一次运行可以看到许多工具时，尤其是来自 MCP 服务器或客户端提供的应用程序工具时，工具搜索非常有用。结构化搜索是默认设置，但实际请求大小和延迟取决于目录和模型的调用。

功能目录按工具名称排序，限制为 18,000 个字符，并根据已策略过滤的目录构建。 OpenClaw 将渲染的目录重新用于未更改的目录快照，并将其放置在系统提示缓存边界之上。用户消息、每回合工具猜测、会话标识符和不受信任的 MCP 或客户端元数据不会进入该目录。这使得重复轮流能够立即重用 KV- 缓存。当授权目录发生变化时，OpenClaw 为新快照构建新目录。提示钩子 `toolsAllow` 限制在提交最终提示之前适用：嵌入式提示和 Copilot 提示仅通告剩余目录，而不重新运行钩子或重写先前的对话轮次。

## <a id="structured-controls"></a> 结构化控制

### <a id="search"></a> 搜索

`tool_search` 搜索当前运行的有效目录。它接受查询和可选的限制。

查询必须用英语书写。排名是词汇的（Okapi BM25 在工具名称、描述以及第一方参数名称和描述上），具有简单的英语词干，因此 `scheduling` 达到描述为 `Schedule a recurring task` 的工具，以及小的意图扩展，因此 `look up the price` 达到描述为 `Search the web` 的工具。工具名称和描述都是用英语编写的，因此用另一种语言进行查询通常不会匹配到任何内容。它不会被拒绝——目录可以合法地描述另一个脚本中的工具——但是没有可用术语的查询不会返回排名结果，而不是目录的任意部分。即使它标记为空，确切的工具名称仍然受到尊重。 `tool_search` 在其面向模型的描述中陈述了这一要求。

不受信任的参数模式永远不会被索引。MCP 和客户端工具只按名称和描述进行匹配， 这与将其输入签名延迟为 `input: "unknown"` 的边界是一致的。

结果紧凑且安全，可以放回提示上下文中。每个命中都包含有界的 TypeScript-style `input` 签名，例如 `{ id: string; mode?: "drip" | "flood" }`，因此当该签名足够时，模型可以跳过 `tool_describe`。受信任的 OpenClaw 核心或插件工具还可能包括紧凑的 `output` 提示，例如 `Array<{ id: string; paid: boolean }>`。 MCP 和客户端输出架构声明不会提升到此可信提示中。它们不受信任的输入模式也被推迟为 `input: "unknown"`；在调用它们之前使用 `tool_describe`。开放、超大或其他部分输出模式会忽略提示，并通过 `tool_describe` 保持可用。

```json
{ "query": "calendar event", "limit": 5 }
```

### <a id="describe"></a> 描述

`tool_describe` 接受搜索结果的 `id` 并加载其完整元数据，包括确切的输入模式和工具声明时的可信完整 `outputSchema`。

```json
{ "id": "mcp:calendar:create_event" }
```

### <a id="call"></a> 致电

`dispatch_action` 接受工具 `id` 及其目标 `args`，通过 OpenClaw 调用所选工具，并返回 `{ tool, result }` 包络。面向模型的 `result` 包含目标的内容和模型相关的状态字段。 OpenClaw 在执行之前验证可信核心或插件工具声明的输入模式。缺少必需的参数、不正确的类型和禁止的属性会返回可操作的工具错误，而不是执行该工具；拼写错误的属性包括建议的参数（如果可用）。如果可信工具也声明了 `outputSchema`，则 OpenClaw 会在执行之前编译该架构，并在返回目录调用之前在正常工具挂钩之后验证最终的 `details`。 MCP 和客户端拥有的模式仍然推迟到其拥有的执行边界。

如果 `dispatch_action` 命名了为当前回合声明的仅直接工具，它将返回通过其声明的名称和参数直接调用该工具的指导。它不会通过目录调度直接工具或建议搜索它们。当前轮不可用的工具仍会收到普通的目录缺失错误。

`dispatch_action` 还修复本地模型的扁平化目标参数。它保留 `id` 和 `name` 等目标字段，并拒绝不明确的工具选择器，而不是调用错误的工具。当目标字段与另一个编目工具匹配时，将目标参数嵌套在 `args` 下。

结构化控件的面向模型的文本仅包括工具的 `id`、`name` 和 `source` 以及目标的模型可见内容和状态；它不会重复目标的结构化 `details`、描述或输入签名。该控件自己的结构化 `details` 为运行时使用者保留了完整的调用信封。使用 `tool_describe` 获取完整的工具元数据。

```json
{
  "id": "mcp:calendar:create_event",
  "args": {
    "summary": "Planning",
    "start": "2026-05-09T14:00:00Z"
  }
}
```

工具作者在工具的 `outputSchema` 属性上声明输出协定。它描述了 `AgentToolResult.details`，而不是渲染的内容块。包括所有非投掷变体或忽略它以获得不稳定的结果。参见[代码模式输出合约](/tools/code-mode/output#declared-output-contracts)和[工具插件](/plugins/tool-plugins#output-contracts)。

延迟名称是目录条目，在此模式下不能直接调用函数。将结果 ID 或名称放入 `dispatch_action.id` 中，并将所有目标参数放入 `dispatch_action.args` 中，包括当其他指令通过名称引用延迟工具时。一个紧凑的搜索签名可能足以称呼它；当需要完整模式时，使用 `tool_describe`。

### <a id="batch-search"></a> 批量搜索

`tool_search` 接受单个查询形状或一批独立查询：

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

单查询调用继续直接返回紧凑候选数组。当两个形状都包含搜索时，非空 `query` 首先运行，顶级 `limit` 的范围仅限于此。批量条目按照请求顺序排列，包括重复的查询文本；每次发生都有其自己的限制并计入批次预算。

除了非空批处理之外，省略的 `null`、空的或仅包含空格的 `query` 也会被忽略。在这种情况下，请省略顶层 `limit` 或将其设置为 `null`；非空顶级限制将被拒绝，而不是应用于批次。省略或 `null` `queries` 保留标量行为，并且当 `query` 非空时，`queries: []` 也会回落到标量形状。没有批处理的空白标量查询仍会返回空的候选数组。没有批次的缺失标量或 `null` 标量，或者没有非空标量的空批次将被拒绝。标量 `limit: null` 使用默认限制，就像省略的限制一样。无效的查询形状、无效的限制和超出预算的批次仍然会失败。

批量调用按请求顺序返回 `{ results: [{ query, candidates }] }`。每个查询使用与普通搜索相同的有效目录、排名、过滤和每个查询限制；一位候选人可能会出现在多个结果组中。描述在输出之前被压缩。如果整个批次超过 4,000 个字符的响应预算，则会删除排名较低的候选者，并且响应包括 `truncated: true`。丢失候选的结果组还包括 `truncated: true`，因此空的截断组不会被误认为是没有匹配项的查询。省略的每个查询限制使用 `searchDefaultLimit`。一批的有效限制总共最多可以要求50名候选人。一个批次最多接受 16 个查询，每个查询最多 512 个字符，序列化查询列表中最多 512 个 UTF-8 字节。无效批次作为一个请求会失败，而没有匹配项的有效查询会返回一个空的 `candidates` 数组。

### <a id="directory-mode"></a> 目录模式

目录模式暴露：

- `tool_search`
- `tool_describe`
- `dispatch_action`

它还使核心文件和 shell 原语、客户端提供的工具、仅限直接的工具以及策略要求的交付工具直接可见。其他授权工具模式保持延迟，而不是根据每个用户提示进行更改。 MCP 工具无法模拟直接可见的核心或策略要求的交付工具。如果有界目录省略条目，请使用 `tool_search` 查找它们，并使用 `tool_describe` 检索其完整架构。如果模型直接请求精确的隐藏目录工具名称，嵌入式harness会在正常执行之前从授权目录中解析它。 Copilot 使用 `dispatch_action` 代替，如 [Modes](#modes) 中所述。目录模式客户端工具名称不得与 OpenClaw、插件或 MCP 工具名称冲突，因为确切的延迟调度使用这些名称。

## <a id="execution-policy"></a> 执行政策

对于最终调用，正常的 OpenClaw 行为仍然适用：

- 工具允许和拒绝策略
- 按代理和按沙箱的工具限制
- channel/runtime 工具政策
- 审批钩子
- 插件 `before_tool_call` 钩子
- tool `executionMode`：顺序调用与同一目录中的其他调用专门运行，包括来自其他工具搜索或代码模式单元的调用
- 会话身份、日志和遥测

## <a id="config"></a> 配置

在未设置 `tools.toolSearch` 的情况下，OpenClaw 运行时使用结构化 `tools` 模式，默认搜索限制为 8，最大为 20。本地 Ollama 模型、LM Studio 和托管本地服务保留其较小的限制 5 和 10。已知托管 Ollama 路由使用一般搜索限制。限制。由 Ollama 守护程序提供的未标记别名会继承守护程序的限制，即使该别名转发到托管模型也是如此。其他提供程序未根据模型名称或单独的环回 URL 分类为本地提供程序。

显式 `tools.toolSearch` 值优先，包括 `false`。设置 `agents.defaults.experimental.localModelLean: false` 会恢复可选工具，但不会关闭自动工具搜索。

显式启用结构化工具搜索：

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

显式固定结构化默认值：

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

调整搜索结果限制（显示的值为默认值）：

```json5
{
  tools: {
    toolSearch: {
      mode: "tools",
      searchDefaultLimit: 8,
      maxSearchLimit: 20,
    },
  },
}
```

运行时将 `maxSearchLimit` 钳位到 1-50，将 `searchDefaultLimit` 钳位到 1..`maxSearchLimit`。

禁用它：

```json5
{
  tools: {
    toolSearch: false,
  },
}
```

## <a id="upgrading"></a> 升级中

现在，每个通用harness上的调度员都被命名为 `dispatch_action`。更新自定义指令以使用具有相同 `id` 和 `args` 参数的名称。现有已完成的 `tool_call` 记录条目会重播和显示，而无需重写存储的历史记录。匹配 `tool_call`（包括通配符）的工具策略条目和文字插件挂钩匹配器仍然控制 `dispatch_action`；挂钩事件名称和调用 ID 未更改。新模型调用必须使用当前广告名称。 Codex 保留其原生工具搜索界面。

工具搜索代码模式 （`tool_search_code`） 已停用。运行`openclaw doctor --fix`将`tools.toolSearch.mode: "code"`迁移到`"tools"`并删除`codeTimeoutMs`。迁移会保留是否启用工具搜索。 `openclaw update` 通常会为您运行；推迟 Doctor 配置修复的更新（例如较旧的 Git 更新程序）随后需要 `openclaw doctor --fix`。在未迁移的配置上启动的网关将退出并命名已停用的密钥和此命令。 `toolSearch: true` 和没有模式的对象现在选择结构化搜索。使用 [Code Mode](/tools/code-mode) 及其 `exec`/`wait` 表面进行 JavaScript 编排。

## <a id="session-activity"></a> 会话活动

搜索、描述和调用结果携带该操作的目录数据。 OpenClaw 不记录序列化工具或提示字节计数。 [E2E 场景](#e2e-validation) 与模拟提供程序通道分开测量提供程序有效负载字节。

无论模式如何，已完成的目标调用都会作为会话历史记录中的有界显示活动持续存在，而无需添加合成模型轮流进行重播。搜索、描述和调用结果带有每个工具的`id`和`source`。因此会话日志仍然回答：

- 模型一开始看到了多少个工具 schema
- 它执行了多少次搜索和描述操作
- 最终调用了哪个工具
- 结果来自 OpenClaw、MCP 还是客户端工具。

## <a id="e2e-validation"></a> E2E 验证

QA 实验室网关场景将直接和结构化工具搜索与 OpenClaw 运行时进行比较：

```bash
pnpm openclaw qa suite --provider-mode mock-openai --scenario tool-search-gateway-e2e
```

它创建一个带有大型工具目录的临时假插件，启动模拟 OpenAI 提供程序，然后以直接和结构化工具搜索模式运行网关。它比较提供商请求负载，然后验证两个通道上的会话日志和工具流。

该回归验证证明：

1. 直接方式可以调用fake插件工具。
2. Tool搜索可以调用相同的假冒插件工具。
3. Direct 模式将伪造的插件工具模式直接暴露给提供者。
4. Tool Search 公开紧凑的结构化控件以及任何直接工具。
5. 对于大型假目录，工具搜索请求负载较小。
6. 会话日志显示预期的工具调用计数。
7. 在所选插件工具运行 `dispatch_action` 之前， 结构化模式可通过一次 `tool_search` 调用解析两个查询。

### <a id="real-model-comparison"></a> 实模对比

```bash
pnpm test:live -- src/agents/tool-search.live.test.ts
```

此选择加入检查使用配置的 OpenAI 凭据；如果没有它们，它将被跳过。它通过 OpenClaw 运行程序将直接曝光、未设置的默认值以及显式工具搜索模式与小型和大型合成目录进行比较。目标工具内部创建的验证码证明实际执行。该检查涵盖策略拒绝和直接工具、延迟模式和转录本交付，而无需强制选择模型工具。它报告请求字节、发现和调用计数、模式恢复和经过的时间。小目录是经过测量的，而不是假设可以从压缩中受益。成功的检查并不是跨提供商的可靠性基准。

## <a id="failure-behavior"></a> 失败行为

工具搜索应拒绝不可用或不允许的工具：

- 如果工具不在有效策略中，搜索不应返回它
- 如果所选工具不可用，`dispatch_action` 应该失败
- 如果策略或审批阻止执行，调用结果应报告该阻止，而不是绕过它

## <a id="related"></a> 相关内容

- [工具和插件](/tools)
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools)
- [Exec 工具](/tools/exec)
- [ACP 代理设置](/tools/acp-agents-setup)
- [构建插件](/plugins/building-plugins)
