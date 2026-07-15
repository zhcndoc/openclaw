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

启用 OpenClaw 运行后，模型默认会收到一个 `tool_search_code` 工具，
外加任何其结构化结果无法通过紧凑桥接传递的仅直连工具。代码工具会在隔离的
Node 子进程中运行一小段 JavaScript 代码体，并通过 `openclaw.tools` 桥接：

```js
const hits = await openclaw.tools.search("创建一个 GitHub issue");
const tool = await openclaw.tools.describe(hits[0].id);
return await openclaw.tools.call(tool.id, {
  title: "启动时崩溃",
  body: "复现步骤...",
});
```

目录可以包含符合目录条件的 OpenClaw 工具、插件工具、MCP
工具以及客户端提供的工具。模型不会预先看到目录中每个 schema。
相反，它会搜索紧凑描述，在需要精确 schema 时描述某个选中的
工具，然后通过 OpenClaw 调用该工具。仅直连工具仍然对模型可见，
且不会被加入目录。

Codex harness 运行不会接收这些实验性的 OpenClaw 工具搜索
控制。OpenClaw 通过动态工具把产品能力传递给 Codex，而
Codex 负责稳定的原生代码模式、原生工具搜索、延迟动态
工具以及嵌套工具调用。

## 一次 turn 如何运行

在规划阶段，OpenClaw 内嵌运行器会为该运行构建有效目录：

1. 为代理、配置文件、沙箱和会话解析当前生效的工具策略。
2. 列出符合条件的 OpenClaw 和插件工具。
3. 通过会话 MCP 运行时列出符合条件的 MCP 工具。
4. 添加为当前运行提供的符合条件的客户端工具。
5. 将仅可直接访问的工具保持对模型可见，并为其余目录中符合条件的工具索引紧凑描述。
6. 公开 OpenClaw 代码桥接、结构化回退工具，或与这些仅可直接访问的工具并列的紧凑目录表面。

在执行阶段，每一次真实工具调用都会返回到 OpenClaw。隔离的 Node
运行时不持有插件实现、MCP 客户端对象或密钥。
`openclaw.tools.call(...)` 会跨越桥接返回 Gateway，在那里
正常的策略、审批、钩子、日志和结果处理仍然生效。

## 模式

`tools.toolSearch` 有三种面向模型的模式：

- `code`: 暴露 `tool_search_code`，这是默认的紧凑 JavaScript 桥接层，
  以及直接可用工具。
- `tools`: 暴露 `tool_search`、`tool_describe` 和 `tool_call` 作为纯
  结构化工具，适用于不应接收代码的提供方，以及直接可用工具。
- `directory`: 暴露 `tool_search`、`tool_describe` 和 `tool_call`，并提供一个
  有界的提示目录，其中包含可用工具名称和描述，适用于需要看到工具名称但
  不需要每个完整 schema 的提供方。OpenClaw 还可以针对当前轮次直接暴露一小组
  有界的、可能会用到或必需的工具 schema。直接可用工具在此模式下也仍然可见。

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

- 直接工具：模型在第一个 token 之前就会看到每个已选中的 schema
- Tool Search 代码模式：模型会看到一个紧凑的代码工具、一个简短的 API
  合约，以及任何仅直接可见的工具
- Tool Search 工具模式：模型会看到三个紧凑的结构化回退
  工具，以及任何仅直接可见的工具
- Tool Search 目录模式：模型会看到一个有界目录，以及
  search/describe/call 控制项和一小组有界的可能或必需
  schema，再加上任何仅直接可见的工具
- 在对话轮次中：模型可以根据需要加载剩余的 schema

对于小型目录，直接暴露工具仍然是正确的默认方案。对于一次运行中
可能看到很多工具的场景，尤其是来自 MCP 服务器或
客户端提供的应用工具时，工具搜索最合适。

## API

`openclaw.tools.search(query, options?)`

在当前运行的有效目录中搜索。结果是紧凑的，并且安全地放回提示上下文。

```js
const hits = await openclaw.tools.search("日历事件", { limit: 5 });
```

`openclaw.tools.describe(id)`

加载一个搜索结果的完整元数据，包括精确的输入 schema。

```js
const calendarCreate = await openclaw.tools.describe("mcp:calendar:create_event");
```

`openclaw.tools.call(id, args)`

通过 OpenClaw 调用选中的工具。

```js
await openclaw.tools.call(calendarCreate.id, {
  summary: "计划",
  start: "2026-05-09T14:00:00Z",
});
```

结构化回退模式将相同操作作为工具暴露：

- `tool_search`
- `tool_describe`
- `tool_call`

目录模式暴露：

- `tool_search`
- `tool_describe`
- `tool_call`

它还会直接显示客户端提供的工具和所有仅直接可见的工具，并且可能会为当前轮次直接公开一小组有界的、可能需要的目录工具 schema。如果有界目录省略了某些条目，请使用 `tool_search` 来找到它们。如果模型直接请求某个精确的隐藏目录工具名称，OpenClaw 会在正式执行前从授权目录中为其填充。
目录模式下的客户端工具名称不得与 OpenClaw、插件或 MCP 工具名称冲突，因为精确的延迟分发会使用这些名称。

## 运行时边界

代码桥接运行在一个短生命周期的 Node 子进程中。该子进程以
启用 Node permission mode 启动，环境为空，没有文件系统或
网络权限，也没有子进程或 worker 权限。OpenClaw 强制执行
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

工具搜索会记录足够的遥测数据，以便与直接工具暴露进行比较：

- 发送给 harness 的已序列化工具和提示词总字节数
- 目录大小和来源分布
- 搜索、描述和调用次数
- 通过 OpenClaw 执行的最终工具调用
- 选中的工具 id 和来源

会话日志应当能够回答以下问题：

- 模型一开始看到了多少个工具 schema
- 它执行了多少次搜索和描述操作
- 最终调用了哪个工具
- 结果来自 OpenClaw、MCP 还是客户端工具

## 端到端验证

QA 实验室网关场景使用 OpenClaw 运行时验证了两条路径：

```bash
pnpm openclaw qa suite --provider-mode mock-openai --scenario tool-search-gateway-e2e
```

它会创建一个带有大型工具目录的临时假插件，启动 mock
OpenAI provider，在直接模式下启动一次 Gateway，再在启用工具搜索
的情况下启动一次，然后比较 provider 请求负载和会话日志。

该回归验证证明：

1. 直接模式可以调用假插件工具。
2. 工具搜索可以调用相同的假插件工具。
3. 直接模式会将假插件工具的 schema 直接暴露给 provider。
4. 工具搜索只暴露紧凑的桥接工具，以及任何仅直接模式可用的工具。
5. 对于大型假目录，工具搜索的请求负载更小。
6. 会话日志显示了预期的工具调用次数和桥接调用遥测数据。

## 失败行为

工具搜索应当在关闭状态下失败：

- 如果工具不在有效策略中，搜索不应返回它
- 如果选中的工具变为不可用，`tool_call` 应当失败
- 如果策略或审批阻止执行，调用结果应报告该
  阻止，而不是绕过它
- 如果代码桥接无法创建隔离运行时，请使用 `mode: "tools"` 或
  为该部署禁用工具搜索

## 相关内容

- [工具和插件](/tools)
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools)
- [Exec 工具](/tools/exec)
- [ACP 代理设置](/tools/acp-agents-setup)
- [构建插件](/plugins/building-plugins)
