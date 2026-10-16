---
summary: "来宾代码内的全局变量、目录句柄、MCP 命名空间和虚拟 API 声明"
title: "代码模式客API"
read_when:
  - "您正在为代码模式撰写或评论访客 JavaScript"
  - "你正在审查 MCP 命名空间桥接或虚拟 API 声明"
  - "您需要从访客代码读取分页文件数据"
---

## <a id="guest-runtime-api"></a> Guest 运行时 API

以下 TypeScript 声明记录了访客 API。可执行单元使用无类型注释的普通 JavaScript。每个 `exec` 都会启动一个新的 JavaScript 上下文：变量和函数永远不会转移到另一个单元格。 `wait` 恢复相同的单元格。

```typescript
declare const catalog: ToolCatalog;
declare const MCP: Record<string, unknown>;
declare const namespaces: Record<string, unknown>;
declare const API: {
  list(prefix?: string): Promise<{
    files: Array<{ path: string; description?: string; bytes?: number }>;
  }>;
  read(path: string): Promise<{
    path: string;
    description?: string;
    content: string;
    bytes: number;
  }>;
};

declare function setTimeout(
  callback: (...args: unknown[]) => void,
  delay?: number,
  ...args: unknown[]
): number;
declare function clearTimeout(id: number): void;
declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
declare function store(key: string, value: unknown): Promise<void>;
declare function load(key: string): Promise<unknown>;
```

`API.read(path)` 返回文件记录，而不是字符串。声明文字为`(await API.read(path)).content`；例如，`(await API.read("mcp/lab.d.ts")).content.match(/function\s+\w+/g)`。

`TextEncoder` 和 `TextDecoder` 可用于本地文本和字节转换。编码器和解码器实例在任一执行器下都保留 `wait`。这些 API 提供本地字节转换，而不提供文件系统、模块或网络访问。返回值仍然使用JSON-only桥；发出解码后的文本或字节值数组，而不是二进制附件。

`console.log`、`console.info`、`console.warn`、`console.error` 和 `console.debug` 通过与 `text` 和 `json` 相同的有序输出通道发出诊断文本，而不是通过主机日志。他们返回`undefined`； `console.error` 不抛出。非日志方法在其消息中添加级别前缀，例如 `[warn]`。参数之间用空格分隔；像 `%s` 这样的 printf 样式标记保持字面意思。未提供其他控制台 API 方法。

控制台检查是有意限制的，而不是 Node/browser 控制台模拟。字符串不带引号；对象和数组使用紧凑的 JSON- 形状检查可枚举自己的属性，其中包含错误自己的消息。它不调用 getter 或自定义 `toJSON` 方法。循环、访问器、未等待的承诺和检查失败都会获得诊断占位符。每次调用最多访问 100 个值、每个对象 50 个属性以及四个对象级别。字符串值和键最多保留 512 个 UTF-16 代码单元；消息最多保留 4096，加上截断后缀，而不拆分代理对。

在所有简历中，控制台条目还有 16,384 个序列化 JSON UTF-16 代码单元（少于 49,152 UTF-8 字节）的额外保守限制。一旦填满，单个 `[console output truncated]` 条目将替换下一条消息，并且进一步的控制台调用将被忽略。现有的累计 `maxOutputBytes` 和模型结果上限仍然适用于控制台输出以及 `text`、`json` 以及最终值或误差。当诊断检查不充分时，使用具有较窄输入的显式 `text`/`json`。

来宾定时器通过主机进行桥接，因此它们在任一执行器下都可以生存 `wait`，并保持受代码模式执行和延续限制的限制。 `clearTimeout` 还会取消先前暂停之前创建的计时器；这适用于交互式代码模式和无头自动化脚本。

每个有效的非 MCP 工具也作为异步全局函数安装。运行的代码模式提示包括一小组由固定规则选择的最终可调用名称，以及紧凑的输入提示和可信声明的输出提示。描述仍然被推迟，因此对抗性目录散文无法引导模型。当该索引省略工具时，调用`catalog.search(...)`；其结果是可调用函数。

每个快速索引行中的箭头描述了可调用函数的值。 `-> Array<{ id: string }>` 是声明的输出提示； `-> ?` 输出未知。对于未知输出，返回值不变或返回 `await results.save(value)` 以进行有限预览。在后面的`exec`中观察原始值或过滤或映射之前的预览；不要将猜测的字段输入到同一程序中的相关逻辑中。当声明的输出读取提供最终的 `-> ?` 调用时，这也适用：返回或保存最终的原始值，而不将其包装在猜测的答案形状中。

`results.load(id)` 为当前回复中的后续单元返回一个分离的 JSON 副本，并且 `results.delete(id)` 释放容量。当回复结束时，参考文献就会过期；切勿重复使用之前的 ID。对于稍后需要的小值，请使用 `store`。阅读 `results.d.ts` 至 `API.read` 了解类型、限制和生命周期，或参阅 [ 跨单元重复使用数据](/tools/code-mode/quickstart#reuse-data-across-cells)。超大的最终对象和数组可能会自动返回 `value.reference`，而不是不可恢复的显示前缀；将其 `id` 与 `results.load` 一起使用。更大的预览显示明确采样的路径、计数和观察到的形状。这些样本不是模式；而是模式。在处理完整数据之前加载原始值。

```typescript
type ToolCatalogMetadata = {
  callableName: string;
  toolName: string;
  label?: string;
  description: string;
  source: "openclaw" | "client" | "mcp";
  apiPath?: string;
  input?: string;
  output?: string;
};

type ToolCatalogHandle = ((input?: unknown) => Promise<unknown>) &
  ToolCatalogMetadata & {
    describe(): Promise<ToolCatalogDescription | McpCatalogDescription>;
    toJSON(): ToolCatalogMetadata;
  };
```

返回 `await catalog.search(...)` 或 `catalog.all()` 将每个可调用句柄序列化到此有界元数据。序列化不会调用`describe()`或启动另一个桥接请求；在同一程序内，句柄仍然可调用。

`input` 是常见情况下的有界 TypeScript- 样式签名。当仍需要确切的完整架构时，请使用句柄的 `describe()`。客户端条目使用 `input: "unknown"`，因此它们的不受信任架构将延迟到 `describe()`。 `output` 仅针对源自可信 OpenClaw 核心或插件 `outputSchema` 的完整紧凑提示而存在。 MCP 和客户端输出架构声明不会提升到此可信目录提示中。

插件工具使用`source: "openclaw"`；没有单独的 `"plugin"` 源值。搜索包括可见的 MCP 工具，使用与本机工具相同的排名和总结果限制。 MCP 手柄有 `source: "mcp"`、完全合格的 `callableName`（如 `MCP.accounting.listInvoices`）、原始 MCP、`toolName` 和 `apiPath`（如 `mcp/accounting.d.ts`）。其远程描述仅限于 512 个 UTF-16 代码单元，无需拆分代理对；输入和输出提示仍然不存在。返回或发出 MCP 发现元数据使用正常的不受信任内容包装器，即使没有调用 MCP 工具也是如此。

MCP 使用一个对象参数处理调用现有名称空间路径，包括其输入默认值、策略检查、批准和本机 MCP 结果投影。他们的 `describe()` 返回确切工具的 `$api(method, { schema: true })` 标头和模式。选择 `$api` 声明时，规范化方法名称优先于冲突的原始工具名称。使用 `(await API.read(handle.apiPath)).content` 作为整个服务器的 TypeScript 声明。搜索还接受完全合格的 `callableName`。 `catalog.all()` 继续仅列出本机和客户端句柄；搜索不会将远程工具添加到该列表或可信快速索引中。

完整 schema 仅按需加载：

```typescript
type ToolCatalogDescription = Omit<ToolCatalogMetadata, "toolName"> & {
  name: string;
  parameters: unknown;
  outputSchema?: unknown;
};
```

MCP 描述形状：

```typescript
type McpCatalogDescription = {
  kind: "mcp_api";
  scope: "tool";
  server: { identifier: string; serverName: string };
  header: string;
  tools: unknown[];
  schemas: Record<string, unknown>;
  note: string;
};
```

目录辅助函数：

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogHandle[]>;
  all(): readonly ToolCatalogHandle[];
};
```

`catalog.search(...)` 返回可调用句柄的冻结数组，或者在没有工具匹配时返回空数组。如果匹配的可调用名称超出了可用的节目数据收件箱容量，搜索将拒绝并指导缩小请求范围。它永远不会默默地替换空的或部分匹配列表。错误发生后仍可进行更窄的搜索。

精确的可调用拼写优先于不区分大小写的匹配。当启用的名称仅大小写不同时，使用句柄的 `callableName` 查找相同的工具。

配对的网关节点可通过 `nodes` 全局变量获取：

```javascript
const available = await nodes.list();
const node = await nodes.get(available[0].id);
const status = await node.invoke("device.status");
```

`nodes.list()` 返回配对的节点 ID、名称、平台、连接状态和通告的命令。 API 声明描述了这些字段和节点句柄方法。命令参数和结果仍然是 `unknown`，因为每个节点命令定义了自己的有效负载；在撰写之前检查结果。 `nodes.get(idOrName)` 解析显示名称之前的确切 id，并返回包含 `id`、`name` 和 `invoke(command, params?)` 的句柄。调用使用正常的 `nodes` 工具路径，因此配对、命令策略、范围、批准、超时、挂钩和遥测未更改。仅当节点通告 `fs.listDir` 时，句柄才包含 `listDir(path)`，并且该列表省略文件：将普通 shell `exec` 工具与节点主机一起使用以获得完整的目录内容。它不包括 `exec`：通用节点表面为带有节点主机的普通 shell `exec` 工具保留 `system.run`。

直接调用快速索引全局变量，或者在需要查找时使用可调用目录句柄：

```javascript
const content = await read({ path: "README.md" });

const [tool] = await catalog.search("...");
const result = await tool({ query: "OpenClaw" });

const [search] = await catalog.search("search the web", { limit: 1 });
const schema = await search.describe();
const hits = await search({ query: "OpenClaw code mode" });
```

调用本机全局或本机目录句柄会直接返回普通工具的 JSON `details` 值。当工具将其结果标记为 `isError: true` 并且其详细信息不包含非空 `message` 或 `error` 字符串时，该值包括工具的文本内容为 `message`，因此来宾代码和模型可以了解调用失败的原因。 MCP 句柄保留本机 MCP 结果（`content`、可选 `structuredContent` 和可选 `isError`）。确切的目录 ID 和原始 `{ tool, result }` 信封对访客不可见。

`ls`、`find` 和 `grep` 工具在 `content` 中包含其有界列表或搜索文本，包括空结果消息和截断通知。目录页面保留`nextAfter`；搜索结果保留其现有的限制和截断元数据。

## <a id="session-store"></a> 会话存储

使用 `await store(key, value)` 和 `await load(key)` 在同一会话中跨单元和轮次保持较小的 JSON 值，包括网关重新启动：

```javascript
await store("shipmentSummary", { unpaid: 3, totalTons: 42 });
```

在稍后的单元格或回合中：

```javascript
const summary = await load("shipmentSummary");
return summary;
```

键必须是最多 256 个字符的非空字符串；无效密钥以 `TypeError` 拒绝。值使用普通桥 JSON 标准化。每个序列化值最多可以使用 256 个 KiB 的编码 JSON，并且所有存储的值一起最多可以使用 1 个 MiB。超过任一限制都会被 `RangeError` 拒绝并保持商店不变。 `await store(key, undefined)` 删除密钥。 `await load(key)` 在丢失时返回 `undefined`，否则返回分离的副本；编辑该副本不会更改保存的值。

写入按单元进行缓冲。该单元中的后续加载会看到其挂起的写入，包括在 `wait` 之后。仅当单元稳定 `completed` 时，写入才可用于其他单元。失败、超时、中止、过期或处置的单元会丢弃其挂起的写入。如果持久性失败，单元格将保持完成状态并发出警告，并且运行的投影保持不变。在依赖写入之前验证记录：持久提交后可能会发生追加错误。

会话记录拥有提交的值。分叉和分支仅继承其自己的转录路径上的值；压实可以保留它们。自定义存储条目不会进入模型上下文。加载网络派生数据会将其来源带入接收单元的正常不可信内容包装器中。

两个执行器都通过绑定会话在交互式单元中支持这些助手。无头和 `restartSafe` 单元拒绝存储操作，没有可用会话管理器的单元也是如此。阅读合约 `API.read("results.d.ts")`。

## <a id="reading-paginated-file-data"></a> 读取分页文件数据

对于文本文件页面，`read(...)` 返回 `content` 中的文件文本；文件名解析和分页通知保留在人类可读的工具显示中，而不是结构化文件数据中。文件文本（包括 `.env` 内容）未经过秘密屏蔽。解析前检查`kind`：`"truncated"`表示`continuation`处有更多数据可用。使用相同的路径和返回的 `offset`、可选的 `cursor` 和可选的 `limit` 读取下一页。用 `"\n"` 连接行延续；直接追加游标延续。不要从文件数据中删除显示通知模式：这些字符串可能是实际的文件内容。每个调用仍遵循其显式 `limit`；如果还有更多文件数据，则结果为 `"truncated"`，其继续描述下一页。
