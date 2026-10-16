---
summary: "声明工具结果的输出合同和来宾输出 API"
title: "代码模式输出"
read_when:
  - "您正在为代码模式中使用的工具声明一个输出架构"
  - "您需要text、json和返回值输出规则"
  - "您正在调试原始优先或成形工具结果"
---

## <a id="declared-output-contracts"></a> 已声明的输出契约

OpenClaw 工具可以为放置在 `AgentToolResult.details` 中的结构化值声明 `outputSchema`。这对于代码模式和工具搜索很有用；它不是提供者本机工具响应模式，并且不会改变直接工具暴露。

对于使用 `defineToolPlugin` 制作的工具，请在 `parameters` 旁边声明 schema：

```typescript
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { Type } from "typebox";

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

目前内置合约包括`agents_list`、`agents_wait`、`apply_patch`、`automations`、`browser`、`conversations_list`、`conversations_send`、`conversations_turn`、`edit`、 `openclaw`、`process`、`read`、`screen`、`sessions_history`、`sessions_list`、`sessions_search`、`sessions_send`、`session_status`、 `suggest_task`、`terminal`、`web_fetch` 和 `web_search`。浏览器快照和文本观察公开了结构化结果中的有界 `text` 字符串，包括不受信任的浏览器内容包装器。这使得页面散文和快照引用可以在来宾单元中使用，而无需单独的评估调用。将页面内容返回到模型时保留包装器； `query`、`selector` 和 `maxChars` 换行前窄读。

`automations` 声明调度程序状态、分页作业摘要、完整作业、运行历史记录和操作结果。当活动运行仍拥有其会话时，成功删除可以包括 `sessionCleanup: "pending"`。该职位已被删除；运行结束后将进行会话清理。 `process` 声明会话列表、轮询和日志输出、输入确认和失败。在撰写结果之前，请通过 `API.read("tools/automations.d.ts")` 或 `API.read("tools/process.d.ts")` 阅读他们的声明。它们的声明通过输入 `action` 选择输出：`automations({ action: "list" })` 返回作业页面，而 `action: "status"` 返回调度程序状态。进程列表仍然包含其真正的失败结果；在读取 `result.sessions` 之前检查 `result.status === "failed"`。声明式和普通自动化创建仍然可能产生不同的 `add` 结果。

精确传递可以重用其所属的协议模式，而不是复制仅模型合约。例如，对话工具公开 `conversations.list`、`conversations.send` 和 `conversations.turn` 使用的相同网关结果模式； `web_fetch` 拥有一个工具本地模式，其提示公开稳定的元数据、文本、缓存状态和嵌套溢出元数据； `web_search` 声明其精确标准化的 results/answer/error/raw 联合作为完整的快速索引提示。文件系统合约返回结构化读取文本、图像、截断和可选未找到结果；显式编辑更改状态加上 diff/patch 数据；和应用补丁路径摘要。缺少标准每日注释 （`memory/YYYY-MM-DD.md`） 会返回可选的 `not_found` 结果，即使省略 `optional` 也是如此；除非明确提供 `optional: true` ，否则会抛出其他丢失路径。当快速索引声明字段时，一个单元可以组成发现和交付，而无需单独的检查轮次：

```javascript
const listed = await conversations_list({ query: "build bot" });
const target = listed.conversations.find((item) => item.label === "Build bot");
if (!target) throw new Error("conversation not found");
return await conversations_send({
  conversationRef: target.conversationRef,
  message: "Build finished.",
});
```

嵌套调用仍然使用正常的工具策略、挂钩和批准。如果完整合约是精确的，但对于有界快速索引来说太大，则它仍然可以通过可调用句柄的 `describe()` 获得，并且箭头保持为 `-> ?`。

还可以通过 `API.list("tools")` 和 `API.read("tools/<callableName>.d.ts")` 按需提供完整的本机工具声明，使用与发现相同的最终可调用名称。这些声明是从有效输入和可信输出模式生成的，而不是从缩短的快速索引生成的。本机列表条目包含路径； `API.read`生成文件后即可使用`bytes`。文件不会急切地注入到每个来宾 VM 中。未知的输出和不支持的模式叶仍然是 `unknown`；客户端模式不会提升为可信声明。运行时验证仍然是 TypeScript 无法表达的约束的真实来源。仅当有效模式接受运行时规范化使用的空对象时，本机声明才允许省略输入参数；仍然需要真正需要的投入。

已知的输出声明描述了完整的标准化工具值。程序数据接纳会拒绝过大的回复，而不是替换成功的截断标记。声明具有独立的大小、深度和遍历范围；当这些边界需要未知类型时，使用 `describe()` 作为原始模式。读取声明不执行工具或类型检查单元；它们指导代理的 JavaScript 组成。

契约规则是严格的：

- 描述确切的 JSON- 兼容的 `details` 值，未渲染的 `content` 块或提供者信封。
- 包含每一种不抛异常的成功或错误变体。如果工具没有稳定的结构化结果，则省略 `outputSchema`。
- 使用 `{ additionalProperties: false }` 关闭对象层以获得完整的快速索引提示。开放、超大或其他部分模式通过句柄 `describe()` 保持可用，但不启用一回合字段使用。
- OpenClaw 会先在运行工具前编译 schema，然后在正常工具钩子之后、目录调用返回之前验证最终的 `details`。无效 schema 不能运行工具；不匹配会失败且不会打印该值。
- 紧凑提示遵循固定规则和大小限制。当紧凑提示不足时，句柄 `describe()` 会公开完全可信模式。
- 已安装的插件代码本身就是受信任的本地代码。远程 MCP 和客户端元数据仍然是不受信任的，不能选择加入这些快速索引提示。

参见 [工具插件](/plugins/tool-plugins#output-contracts) 了解插件编写详情。

MCP 目录条目保留在生成的 `MCP` 命名空间下。面向任务的 `catalog.search(...)` 还返回 MCP 句柄，该句柄调用相同的命名空间路径并标识其声明文件。 MCP 条目在裸全局变量、`catalog.all()` 和可信快速索引中仍然不存在。 TypeScript-style声明文件可通过只读`API`虚拟文件界面获得，因此代理可以检查MCP签名，而无需将MCP模式添加到提示中：

```javascript
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

`(await API.read("mcp/<server>.d.ts")).content` 包含从 MCP 工具元数据推断的紧凑声明：

```typescript
interface McpToolResult {
  content: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
}

interface McpResourcesListResult {
  resources: unknown[];
  nextCursor?: string;
}
interface McpResourcesReadResult {
  contents: unknown[];
}
interface McpPromptsListResult {
  prompts: unknown[];
  nextCursor?: string;
}
interface McpPromptsGetResult {
  messages: unknown[];
  description?: string;
}

declare namespace MCP.github {
  /** Return this TypeScript-style API header. */
  function $api(toolName?: string, options?: { schema?: boolean }): Promise<McpApiHeader>;

  /**
   * Create a GitHub issue.
   * @param owner Repository owner
   * @param repo Repository name
   * @param title Issue title
   */
  function createIssue(input: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
  }): Promise<McpToolResult>;
}
```

字典输入保留其值类型。可空枚举和标记为 `nullable: true` 的字段包括 `null`，除非显式枚举将其排除。具有默认值的顶级字段可以在调用中省略。这些声明近似于 JSON 架构；对于 TypeScript 无法表达的约束，请使用 `MCP.<server>.$api("<tool>", { schema: true })` 检查原始模式。

MCP 工具调用返回其原始 JSON-safe 内容块，包括块注释和块级 `_meta`，以及顶级 `structuredContent` 和 `isError`（如果提供）。顶级 MCP `_meta` 和私有应用程序元数据永远不会进入来宾。带有 `isError: true` 的 MCP 应用程序故障仍然可以解决，因此来宾代码可以检查并从中恢复。相反，资源和提示操作返回其本机 MCP 形状：`resources.list()` 返回 `resources`、`resources.read()` 返回 `contents`、`prompts.list()` 返回 `prompts` 和 `prompts.get()` 返回 `messages`带有可选的 `description`。

声明文件是虚拟的，不是写在工作空间或状态目录下的。对于每个代码模式 `exec` 调用，OpenClaw 构建运行范围的工具目录，保留可见的 MCP 条目，渲染 `mcp/index.d.ts` 加上每个可见服务器一个 `mcp/<server>.d.ts`，并将该小的只读表注入到所选执行器的工作线程中。访客代码仅看到 `API` 对象：`API.list(prefix?)` 返回带有文件元数据的 `{ files }`，`API.read(path)` 返回 `{ path, description, content, bytes }`。 `content` 字段保存声明文本。未知路径和 `.`/`..` 段被拒绝。

这可以将大型 MCP schema 排除在模型提示之外：代理先从 `exec` 工具描述中得知虚拟 API 的存在，再仅读取所需的声明文件，然后使用一个对象参数调用 `MCP.<server>.<tool>()`。`MCP.<server>.$api()` 仍可作为程序内单个工具 schema 响应的内联回退方案。

来宾运行时永远不会直接看到主机对象。输入和输出作为 JSON- 兼容值通过桥，并具有明确的大小上限。

传递给 `results.save` 或 `store` 的工具参数和值必须序列化为 JSON（`store(key, undefined)` 除外，它会删除密钥）。 BigInts、循环和抛出序列化挂钩会使受影响的调用失败，而不是默默地替换其数据。捕获错误并显式转换值；现有保存的结果保持不变。

## <a id="input-dependent-outputs"></a> 输入相关输出

输出取决于字符串输入属性的工具可以使用标准 TypeBox 或 JSON 架构 API 注释其现有 `outputSchema`。从相同的变体中导出并集和映射：

```typescript
import { Type } from "typebox";

const variants = Object.entries({
  list: Type.Object({ items: Type.Array(Type.String()) }, { additionalProperties: false }),
  status: Type.Object({ ready: Type.Boolean() }, { additionalProperties: false }),
});
const outputSchema = Type.Union(
  variants.map(([, schema]) => schema),
  {
    "x-openclaw-input-discriminator": {
      version: 1,
      inputProperty: "action",
      mapping: Object.fromEntries(variants.map(([value], index) => [value, index])),
    },
  },
);
```

将此架构分配给工具的现有 `outputSchema` 属性。每个分支必须包含该输入值的每个非抛出结果，包括失败。完整的联合和选择器来自那些相同的分支。该注释不会更改输入验证或授权操作。

生成的声明为文字输入选择相应的结果。输入值的并集返回其结果的并集。缺失、广泛或未映射的值保留完整的输出并集。该属性可以有任何名称； `action` 是 `automations` 和 `process` 使用的约定。

目录执行在分派之前编译完整的模式。当钩子更改选择器时，结果必须满足实际准备的输入的分支和原始调用者的广告分支。兼容重写和 default/alias 准备工作仍然有效；不兼容的结果无法到达为原始操作键入的代码。根 JSON 架构约束保持不变。包含 `$ref`、`$dynamicRef` 或 `$recursiveRef` 或超出有界结构检查的模式保留其原始伞验证和声明。这保留了递归引用语义。生成的评论指出了这种保守的后退。行动声明还共享原来的 32,768 个字符的输出津贴；过大的专业化可以追溯到有界伞声明。这些回退不会影响特定于操作的 `automations` 和 `process` 合约。

序列化模式包含普通的 `anyOf` 分支和带有 `{ version: 1, inputProperty, mapping }` 的注释 `x-openclaw-input-discriminator`。该映射将字符串值与分支索引相关联。将并集和映射保持在一起；不要独立更新。 SDK 静态元数据和目录描述保留注释。不支持它的主机保留普通联盟。支持主机在执行该工具之前拒绝格式错误的注释和不受支持的版本。不支持的声明形状仍然是 `unknown`；该注释不会绕过架构检查或类型限制。

## <a id="output-api"></a> 输出 API

- `text(value)` 将人类可读的输出追加到 `output` 数组中。
- `json(value)` 在 JSON- 兼容序列化后附加结构化输出项。
- 访客代码的最终返回值在 `completed` 结果中变为 `value`。

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

在发出异步值或返回包含它们的数组或普通对象之前等待异步值。未等待的 Promises 显示为带有 `await` 和 `Promise.all` 指导的诊断字符串。例如，使用 `return await Promise.all(handles.map((tool) => tool.describe()));` 返回工具描述。输出序列化不会等待您嵌套的 Promise。

处理的 `Error` 值在 `text(...)`、`json(...)` 和返回的数组或普通对象中保留其 `name`、`message` 和 JSON- 兼容的可枚举自定义字段。不调用特定于错误的 `toJSON` 方法。这包括来自 `Promise.allSettled(...)` 的拒绝原因。处理错误不会使单元失败；未捕获的错误仍然会产生失败的结果。

返回值和 `json(...)` 输出保留文字 JSON 键，例如 `__proto__`。数值类型数组将其数字元素保留在索引 JSON 对象中；当您需要 JSON 数组时，请使用 `Array.from(...)`。最终返回值不会调用自定义 `toJSON` 方法。显式转换特殊值，例如为日期字符串返回 `date.toISOString()`。

最终值转换在单元内运行。在单元完成之前，属性获取器创建的输出和工具调用遵循普通的结算和暂停规则。

嵌套工具数据和模型可见输出具有单独的限制。成功的桥接回复以其完整的规范化 JSON 值到达来宾，或者其承诺因可捕获的程序数据资源错误而拒绝。传输永远不会替代成功的截断标记。这也适用于目录发现和整个适用的技能说明：完整或明确拒绝。

每个信元都有一个 `min(memoryLimitBytes, maxSnapshotBytes)` 编码的 UTF-8 字节的待回复收件箱：默认为 10 MiB，在现有配置限制下最多为 256 MiB。成功的值和有限的工具错误在解决之前、保留之前会消耗此容差。津贴涵盖内联执行和每次等待；在主机和工作人员释放已发送的回复后可重复使用，而不是累积分页配额。饱和时，固定的、有限的故障诊断仍然可用，而不保留工具数据；这些控制回复受到挂起呼叫时隙的限制。取消和到期关闭入场并释放未送达的答复。

这是额外的逻辑主机数据限额，而不是总 RSS 限制或可以暂停大数据的保证。执行器内存限制和 QuickJS 整体 VM 快照限制仍然适用；工作人员切换和 JSON 转换可以暂时保留额外的副本。出现准入错误后缩小或分页请求。

输出顺序与访客呼叫匹配。累积访客输出和最终值或故障诊断仍然在所有等待中共享一个 `maxOutputBytes` 序列化 UTF-8 预算。过大的错误保留其主要原因并以 `[error truncated]` 结束；截断不会把失败变成成功。对于超出此预算的成功发出或返回的输出，OpenClaw 将返回一个有界值 `truncated: true`、UTF-8-safe `prefix`、`omittedBytes` 以及使用更窄参数重新运行的指导。将该标记视为成功的部分结果：缩小搜索范围、分页、选择更少的文件或返回更小的投影。不可序列化的值被转换为纯字符串或错误；不支持二进制值。图像和文件通过普通的 OpenClaw 工具传输，而不是通过代码模式桥。

当后面的单元格需要完整数据时，返回 `await results.save(value)` 而不是发出该值。有界参考预览与完整保存的 JSON 是分开的； `results.load(id)` 让后面的代码可以选择较小的投影而无需重新获取。有关限制，请参阅 [ 跨单元重复使用数据](/tools/code-mode/quickstart#reuse-data-across-cells)。当当前回复结束时，参考文献将过期；切勿重复使用之前的 ID。使用 `await store(key, value)` 和 `await load(key)` 来获得同一会话中轮次和重新启动所需的小 JSON 值；请参阅 [ 会话存储 ](/tools/code-mode/guest-api#session-store)。

当最终显示投影截断超大最终对象或数组时，交互式 `exec`/`wait` 还会自动保留它。保存的结果使用 `value: { truncated: true, reference, guidance }`，与 `results.save` 返回的描述符相同。当发出的输出竞争空间时，它的身份仍然完整；预览文本和采样形状可能会缩小。如果连身份都无法匹配，则会发布新的保存，并且完成的结果会说明保留不可用。容量或数据允许失败同样保留原始成功的截断语义，而不驱逐早期的引用。小值、纯字符串、发出的输出、故障、无头执行和安全重启单元保留其普通输出行为。

标记前缀和省略字节数描述了标准化后的原始紧凑 JSON，包括数组括号、分隔符和 JSON 转义。普通输出是增量交付的。未变化的累计汇总不重复；新输出或更改的最终 value/error 保留可以生成相同原始输出的替换摘要。

面向模型的 `exec` 和 `wait` 结果也符合有效模型的每个结果上下文和持久性限制。 OpenClaw 保留完整的结果包络，包括状态、延续、诊断、遥测和 JSON 格式，在从保留的原始源投影输出之前，使用相同的紧凑表示进行预算拟合和交付。网络派生结果保留不受信任的内容包装器及其较小的内容限制。这些限制不会减少嵌套工具的字节限额。无头执行和没有模型上下文的低级控制保留其仅字节允许（具有网络派生控制输出的现有安全包装器限制）。

这可以保护新鲜结果；它不是档案 JSON 保证。稍后的聚合缩减、缓存 TTL 修剪以及重播为较小的模型仍可能会缩短或替换历史工具文本。已发送的结果在普通继续期间保持不变。传统工具保留自己的文本和图像格式：声明的输出模式描述 `details`，而不是模型可见的文本。文件读取生成器在相同的模型限制内保留其精确的分页页脚，并且拒绝过大的技能指令，而不是默默地部分服务。
