---
summary: "使用 defineToolPlugin 和 openclaw 插件的 init/build/validate 构建简单的类型化 agent 工具"
title: "工具插件"
sidebarTitle: "工具插件"
read_when:
  - "你想构建一个只添加 agent 工具的简单 OpenClaw 插件"
  - "你想使用 defineToolPlugin，而不是手动编写插件清单元数据"
  - "您需要创建、生成、验证、测试或发布纯工具插件"
  - "您需要插件工具上下文的内存受众和货币卫士"
---

`defineToolPlugin` 构建一个仅添加 agent 可调用工具的插件：不包含 channel、model provider、hook、service 或 setup 后端。它会生成 OpenClaw 发现工具所需的清单元数据，而无需加载插件运行时代码。

对于 provider、channel、hook、service 或混合能力插件，请改从 [构建插件](/plugins/building-plugins)、[Channel Plugins](/plugins/sdk-channel-plugins)，或 [Provider Plugins](/plugins/sdk-provider-plugins) 开始。

## <a id="requirements"></a> 要求

- Node 24.16+ or Node 26.1+.
- TypeScript ESM 包输出。
- `typebox` in `dependencies`（不仅仅是 `devDependencies` - 生成的插件在运行时导入它）。
- `openclaw >=2026.5.17`，这是第一个导出 `openclaw/plugin-sdk/tool-plugin` 的版本。
- 一个会发布 `dist/`、`openclaw.plugin.json` 和 `package.json` 的包根目录。

## <a id="quickstart"></a> 快速开始

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm install
npm run plugin:build
npm run plugin:validate
npm test
```

`plugins init` 创建以下启动文件：

| 文件                   | 用途                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `src/index.ts`         | `defineToolPlugin` 入口，包含一个 `echo` 工具                     |
| `src/index.test.ts`    | 元数据测试，断言工具列表                             |
| `tsconfig.json`        | 输出到 `dist/` 的 NodeNext TypeScript 配置                             |
| `vitest.config.ts`     | `src/**/*.test.ts` 的 Vitest 配置                              |
| `package.json`         | 脚本、运行时依赖、`openclaw.extensions: ["./dist/index.js"]` |
| `openclaw.plugin.json` | 为初始工具生成的清单元数据                  |

`npm run plugin:build` 先运行 `npm run build`（tsc），然后运行 `openclaw plugins build --entry ./dist/index.js`。`npm run plugin:validate` 会重新构建并运行 `openclaw plugins validate --entry ./dist/index.js`。 验证成功时会输出：

```text
Plugin stock-quotes is valid.
```

`openclaw plugins init <id>` 选项：

| 标志                 | 默认值            | 作用                                 |
| -------------------- | ------------------ | -------------------------------------- |
| `--directory <path>` | `<id>`             | 输出目录                       |
| `--name <name>`      | 标题 `<id>` | 显示名称                           |
| `--type <type>`      | `tool`             | 插件类型：`tool` 或 `provider`      |
| `--force`            | 关闭                | 覆盖已存在的输出目录 |

## <a id="write-a-tool"></a> 编写工具

`defineToolPlugin` 接受插件标识、一个可选的配置模式，以及一个静态的工具列表。参数和配置类型会根据 TypeBox 模式进行推断。

每个工具都可以声明 `workspaceAccess`：`false`（对于独立于工作空间的工具）、`"execute"`（对于其工具读取或写入工作文件的纯工厂）或 `true`（当其工厂也读取工作空间时）。省略的工厂声明等待完成工作区准备；省略的静态声明仅在执行时等待。明确的声明会在结帐期间保留早期的第一个回复。

```typescript
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { Type } from "typebox";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quote snapshots.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "Quote API key." })),
    baseUrl: Type.Optional(Type.String({ description: "Quote API base URL." })),
  }),
  tools: (tool) => [
    tool({
      name: "stock_quote",
      label: "Stock Quote",
      description: "Fetch a stock quote snapshot.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol, for example OPEN." }),
      }),
      outputSchema: Type.Object(
        {
          symbol: Type.String(),
          configured: Type.Boolean(),
          baseUrl: Type.String(),
        },
        { additionalProperties: false },
      ),
      async execute({ symbol }, config, context) {
        context.signal?.throwIfAborted();
        return {
          symbol: symbol.toUpperCase(),
          configured: Boolean(config.apiKey),
          baseUrl: config.baseUrl ?? "https://api.example.com",
        };
      },
    }),
  ],
});
```

工具名称是稳定的 API。请选择唯一、全小写且足够具体的名称，以避免与核心工具或其他插件发生冲突。

OpenClaw 将工具输入模式限制为 128 个嵌套模式级别，包括扩展的本地引用。更深的子模式变成宽松的 `{}` 模式，因此该工具仍然可调用。一次性警告会指出受影响的工具；超出截止值的验证不可用。保持模式足够浅以描述模型的有用参数。这也适用于 MCP 工具。

## <a id="optional-and-factory-tools"></a> 可选工具和工厂工具

当用户应当显式将工具加入允许列表后才将其发送给模型时，设置 `optional: true`。`openclaw plugins build` 会写入匹配的 `toolMetadata.<tool>.optional` 清单条目，因此 OpenClaw 无需加载插件运行时代码就能知道该工具是可选的。

```typescript
tool({
  name: "workflow_run",
  description: "Run an external workflow.",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  execute: ({ goal }) => ({ queued: true, goal }),
});
```

当工具在创建之前需要运行时工具上下文时，使用 `factory`——例如为了针对特定运行选择退出、检查沙箱状态，或绑定运行时辅助函数。尽管具体工具是在运行时构建的，元数据仍然保持静态。

```typescript
tool({
  name: "local_workflow",
  description: "Run a local workflow outside sandboxed sessions.",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  factory({ api, toolContext }) {
    if (toolContext.sandboxed) {
      return null;
    }
    return createLocalWorkflowTool(api);
  },
});
```

工厂可以将 `toolContext.delivery?.send({ text, mediaUrl })` 用于活动对话中的出站消息。主机选择目标、帐户、线程和本地媒体策略；插件无法重新定位此帮助程序，并且保留的副本在回合结束后停止工作。对于由网关传输拥有交付的通道，该帮助程序不可用。

对于允许的会话轮次，可选的 `memoryAudience?: MemoryAudience` 字段携带所选内存提供者使用的相同主机解析内存受众。它是 `{ kind: "owner-private", agentId }` 或 `{ kind: "conversation", agentId, sessionKey, sessionId }`。当主持人无法证明观众或不存在会话轮次时，该字段不存在。插件必须使用此准备好的值，并且不得从 `senderIsOwner`、会话密钥模式或会话查找推断内存权限。

在等待的工作中保留或使用 `memoryAudience` 的工具必须在释放数据或执行效果之前立即调用两个货币防护：

```typescript
toolContext.assertInvocationCurrent();
toolContext.assertMemoryAudienceCurrent?.();
```

在捕获的沿袭中的任何会话更改化身或生命周期后，可选的 `assertMemoryAudienceCurrent?(): void` 防护会失败。 `assertInvocationCurrent` 分别检查允许的工具调用和插件生命周期。当工具依赖于这些实时权限检查时，请使用版本 2 工具上下文。

`toolContext.approvalReviewerDeviceIds` 包含主机选择的设备，用于由该工具启动的批准。当使用受信任的进程内网关运行时时，将其传递给 `plugin.approval.request`。它仅将审核路由到这些设备；每个审阅者仍然需要 `operator.approvals`，并且该工具不得从模型创作的参数中获取审阅者 ID。

工厂可以返回一个核心 `AgentTool`、它们的数组、或者 `null` 或 `undefined` 以选择退出，如上面的示例所示。当它返回具体工具时，该工具首先使用核心运行时签名 `execute(toolCallId, params, signal?, onUpdate?)` 和工具调用 ID。这是与上面显示的声明性 `execute(params, config, context)` 相反的参数顺序，并且它与 [Building Plugins](/plugins/building-plugins) 中的 `api.registerTool` 示例匹配。从工厂工具的第一个参数读取 `params` 会返回工具调用 ID 字符串。

具体工具可以提供 `prepareArguments(args)` 在模式验证之前规范化输入。当工具调用必须一次运行一个时，本机代理循环也会遵循 `executionMode: "sequential"`。每当组装工具时，这些运行时属性、模式和显示元数据都来自当前工厂上下文。参数准备和执行使用同一个实例。当其拥有的插件注册表停用时，保留的工具将停止工作。

将 `async: false` 设置在模型用于等待的具体工具上，如 `sessions_yield` 所做的那样。在使用 [async 函数调用 ](/providers/openai/models) 的 GPT-6 Astra 请求上，OpenClaw 将其他直接函数工具标记为异步，但保持此工具同步，因此响应在调用时暂停，下一个请求首先传递较早的异步结果。其他提供者、代码模式以及通过工具搜索目录的调用均保持不变；声明 `catalogMode: "direct-only"` 以使工具直接可见。省略该属性将保留默认行为。

### <a id="owner-authorized-continuations"></a> 所有者授权的延续

要在显式 `sessions_yield` 之后恢复确切父级时参与，请通过 `api.registerTool` 注册 `OpenClawPluginToolFactory<2>` 描述符：

```typescript
api.registerTool(
  {
    contextVersion: 2,
    create(context) {
      if (context.senderIsOwner !== true) return null;
      return createPrivilegedTool({ assertCurrent: context.assertInvocationCurrent });
    },
  },
  { name: "my_privileged_tool" },
);
```

`OpenClawPluginToolContext<2>` 类型需要 `assertInvocationCurrent`，并且可以提供 `memoryAudience` 和 `assertMemoryAudienceCurrent`。在等待的工作中携带 `assertInvocationCurrent` 并在效果之前的最终同步写入或请求防护中调用它 - 不仅在开始工作之前或返回之后。检查捕获的插件生命周期并承认run/worker权限；延续还会检查原始所有者的实时精确父绑定。独立 HTTP/RPC 调用使用其经过身份验证的请求生存期，而 MCP 工具保留现有的经过身份验证的授权或环回运行时生存期。仅元数据目录构造不授予调用权限。没有承认调用的保留版本控制工具在调用其防护时会失败。

客户端输入工具也可能收到 `assertInputCommitAllowed`。当持久化客户端提供的字节时，将此主机绑定的同步策略回调传递给存储所有者的最终准入防护。调用它会检查当前的上传策略，即使对于网关无法分类的自定义工具名称也是如此。不要为不上传字节的纯文本操作调用它。它不执行数据库读取，因此它可以在工作线程支持的写入准入内运行。它不会取代调用或突变权限。在等待的准备过程中保留它，但不要将其应用于已经接受的结果或补偿性清理。代理生成的输入不需要此客户端上传策略回调。

旧函数和静态工具注册仍受其现有直接转向上下文的支持；此更改没有引入删除日期或缩短的兼容性窗口。他们确实 **not** 接收持续的所有者身份。仅选择加入不会授予任何内容：仅管理调用者、不相关的会话和分离的 cron 运行仍然无法获取所有者的身份。 `senderIsOwner` 是一项可用性检查，不能替代所需的最终效果防护。

在具体工厂工具上设置 `hideFromChannelProgress: true`，以使其瞬态活动远离通道进度草稿。生命周期事件和最终工具结果仍然正常流动。 OpenClaw 在规范化其模式时保留当前工厂的标志；省略或 `false` 保留正常的进度行为。参见[进度草案](/concepts/progress-drafts)。

工厂仍然会预先声明一个固定的工具名称。当插件动态计算工具名称，或将工具与 hooks、services、providers 或 commands 组合时，直接使用 `definePluginEntry`。

## <a id="return-values"></a> 返回值

`defineToolPlugin` 会将普通返回值包装为 OpenClaw 工具结果格式：

- 当模型应看到那段精确文本时，返回一个字符串。
- 当您希望模型看到格式化的 JSON 和 OpenClaw 时，返回 JSON- 兼容值以保留 `details` 中的原始值。

```typescript
tool({
  name: "echo_text",
  description: "Echo input text.",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => input,
});
```

```typescript
tool({
  name: "echo_json",
  description: "Echo input as structured JSON.",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => ({ input, length: input.length }),
});
```

当你需要自定义 `AgentToolResult`，或者希望复用现有的 `api.registerTool` 实现时，请使用工厂工具。

## <a id="output-contracts"></a> 产出合约

当工具返回稳定的 JSON- 兼容数据时添加 `outputSchema`。它描述了`AgentToolResult.details`中存储的原始值，而不是`content`中的格式化文本：

```typescript
tool({
  name: "shipment_list",
  description: "List shipments.",
  parameters: Type.Object({
    buyer: Type.Optional(Type.String()),
  }),
  outputSchema: Type.Array(
    Type.Object(
      {
        id: Type.String(),
        buyer: Type.String(),
        paid: Type.Boolean(),
        tons: Type.Number(),
      },
      { additionalProperties: false },
    ),
  ),
  execute: ({ buyer }) => listShipments(buyer),
});
```

[Code Mode](/tools/code-mode) 和 [Tool Search](/tools/tool-search) 将此模式转换为有界 TypeScript- 样式输出提示。这使得模型可以在一个程序中调用并转换已知结果，而不是花费另一个模型来观察其形状。

OpenClaw 在执行目录调用之前编译架构，然后在工具挂钩之后验证最终的 `details` 值，然后再通过桥返回它。无效的架构无法运行该工具；结果不匹配导致调用失败。包括每个非抛出结果变体，包括结构化错误变体，或者当结果不稳定时省略模式。不要将机密或敏感值放入模式描述中，因为受信任的输出元数据可能会变得模型可见。当您想要完整紧凑的输出提示时，请在对象层上使用 `{ additionalProperties: false }` ；开放或截断的模式通过可调用目录句柄的 `describe()` 仍然可用，但不会作为完整的快速索引合约进行宣传。

工厂工具在返回的具体 `AnyAgentTool` 上声明 `outputSchema`。静态 `tool({ factory })` 声明不接受单独的输出模式，因为它可能会偏离运行时工具。

OpenClaw 还对 `details` 的呼叫结果进行分级，因此 `status`、`ok`、`success`、`error`、`timedOut` 和 `exitCode` 是保留名称。 `blocked`、`denied`、`invalid`、`cancelled` 中的 `status` 或任何其他失败值标记调用失败，除非 `ok` 或 `success` 显式为 `true`，即使在`execute`正常返回。使用这些名称之一的域数据属于包装器键（例如 `{ card }`），而不是 `details` 的顶层。

对于工具拥有的超时，返回 `timedOut: true` 和 `details` 中的正整数 `timeoutMs`。如果代理未提供最终答复，OpenClaw 会在后备警告中包含该持续时间，而不会暴露原始错误文本。当可用的部分结果可用时，返回带有非空 `results` 数组的 `partial: true` ；警告包括其计数。这些诊断不会将不完整的操作转变为成功的调用。

## <a id="deliver-the-reply-directly"></a> 直接回复

默认情况下，模型读取每个工具结果并自行写入用户可见的回复。已经生成完成回复（例如报告或确认文本）的工具可以将其交给 OpenClaw 并结束回合，而无需额外的模型步骤。

在工具上声明能力并在`details.sourceReply`中返回回复：

```typescript
api.registerTool({
  name: "order_status",
  description: "Report the status of one order.",
  parameters: Type.Object({ orderId: Type.String() }),
  canDeliverSourceReply: true,
  catalogMode: "direct-only",
  async execute(_toolCallId, params) {
    const report = await buildOrderStatusReport(params.orderId);
    return {
      content: [{ type: "text", text: report.text }],
      details: {
        ok: true,
        sourceReply: {
          text: report.text,
          mediaUrls: report.pdfPath ? [report.pdfPath] : [],
        },
      },
    };
  },
});
```

OpenClaw 等待来自同一模型步骤的每个工具调用来解决。仅当整个批次可以完成而无需进一步的模型工作时，主持人才会跳过下一个模型步骤，然后将承认的回复传递给对话。如果同级失败、被拒绝或返回普通或进度结果，模型将继续使用工具结果；部分成功不得掩盖未完成的工作或其他调用的失败。现有的显式终端工具保留自己的完成契约。

成功发送后，当助理提交会话记录时，传递会记录回复，并进行与任何其他传递的回复相同的会话检查。回复需要 `text`、`mediaUrl` 或 `sourceReply` 内的 `mediaUrls`； `attachments` 与他们一起骑行。 `details.message`、`details.mediaUrl`等顶级结果字段不是回复内容。删除 `sourceReply`、将其留空或返回 `sourceReply.final: false` 会保留正常的模型路径。

OpenClaw 在工具钩子和结果中间件运行后读取回复，因此中间件可以重写或撤回它。只有工具作者才能授予该功能：`canDeliverSourceReply` 依赖于工具定义，而不是结果。从代码模式程序内部发出的调用返回到该程序，并且永远不会作为答复传递。在 Codex harness上，如示例中所示声明 `catalogMode: "direct-only"`。仅目录选择并不能保证交付：工具调用必须直接出现在本机模型响应中，而不仅仅是作为嵌套在程序内的执行。即使本机执行报告直接目录命名空间，嵌套调用仍保留普通程序数据。

使用此功能可以获得完整的报告、确认、收据或其他用户就绪的结果。对于搜索命中、原始数据库行或模型仍需要组合的中间结果，请将其关闭。现有工具不会自动选择加入，并且 `message` 工具保留其现有的交付合同。

## <a id="configuration"></a> 配置

`configSchema` 是可选的。省略它时，OpenClaw 会应用严格的空对象 schema；生成的 manifest 仍然包含 `configSchema`。

```typescript
export default defineToolPlugin({
  id: "no-config-tools",
  name: "No Config Tools",
  description: "Adds tools that do not need configuration.",
  tools: () => [],
});
```

如果提供了 `configSchema`，第二个 `execute` 参数会根据它进行类型推导：

```typescript
const configSchema = Type.Object({
  apiKey: Type.String(),
});

export default defineToolPlugin({
  id: "configured-tools",
  name: "Configured Tools",
  description: "Adds configured tools.",
  configSchema,
  tools: (tool) => [
    tool({
      name: "configured_ping",
      description: "Check whether configuration is available.",
      parameters: Type.Object({}),
      execute: (_params, config) => ({ hasKey: config.apiKey.length > 0 }),
    }),
  ],
});
```

OpenClaw 会从 Gateway 配置中该插件的条目读取插件配置。请勿在源码或文档示例中硬编码密钥；请根据插件的安全模型使用 config、环境变量或 SecretRefs。

## <a id="generated-metadata"></a> 生成的元数据

OpenClaw 必须先读取插件清单，然后才能导入插件运行时代码。 `defineToolPlugin` 为此暴露了静态元数据，而 `openclaw plugins build` 会将其写入包中。更改插件 id、名称、描述、配置模式、激活方式或工具名称后， 请重新运行生成器：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

单工具插件生成的清单：

```json
{
  "id": "stock-quotes",
  "name": "Stock Quotes",
  "description": "Fetch stock quote snapshots.",
  "version": "0.1.0",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  },
  "activation": {
    "onStartup": true
  },
  "contracts": {
    "tools": ["stock_quote"]
  }
}
```

`contracts.tools` 是重要的发现契约：它告诉 OpenClaw 在不加载每个已安装插件的运行时的情况下， 每个工具分别属于哪个插件。过期的清单会导致工具在发现过程中丢失，或者把注册错误归咎于错误的插件。

## <a id="package-metadata"></a> 包元数据

`openclaw plugins build` 还将 `package.json` 与选定的运行时条目对齐：

```json
{
  "type": "module",
  "files": ["dist", "openclaw.plugin.json", "README.md"],
  "dependencies": {
    "typebox": "^1.1.38"
  },
  "peerDependencies": {
    "openclaw": ">=2026.5.17"
  },
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

船舶建造为 JavaScript （`./dist/index.js`），不是 TypeScript 源条目。源条目仅适用于工作区本地开发。

## <a id="validate-in-ci"></a> 在 CI 中验证

当生成的元数据已过期时，`plugins build --check` 会在不重写文件的情况下失败：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
npm test
```

OpenClaw SDK 兼容性字段带有 TypeScript `@deprecated` 注释，编辑器将其显示为迁移警告。要在 CI 中强制执行它们，请启用类型感知规则，例如 [`@typescript-eslint/no-deprecated`](https://typescript-eslint.io/rules/no-deprecated/)。 Oxlint 无法识别类型，因此它无法强制执行这些注释。因此，生成的 `plugins init` 入门文件不会添加弃用 lint 配置。

`plugins validate` 检查：

- `openclaw.plugin.json` 是否存在并通过常规清单加载器。
- 当前入口是否导出 `defineToolPlugin` 元数据。
- 生成的清单字段是否与入口元数据匹配。
- `contracts.tools` 是否与声明的工具名称匹配。
- `package.json` 是否将 `openclaw.extensions` 指向所选的运行时入口。

## <a id="install-and-inspect-locally"></a> 在本地安装和检查

从另一个 OpenClaw 检出目录或已安装的 CLI 中，安装包路径：

```bash
openclaw plugins install ./stock-quotes
openclaw plugins inspect stock-quotes --runtime
```

对于打包后的冒烟测试，先执行打包并安装 tarball：

```bash
npm pack
openclaw plugins install npm-pack:./openclaw-plugin-stock-quotes-0.1.0.tgz
openclaw plugins inspect stock-quotes --runtime --json
```

安装自动应用于正在运行的本地网关；如果网关已停止，则启动它。要求代理使用该工具。如果该工具不可见，请在更改代码之前检查插件运行时和有效工具目录（请参阅 [Troubleshooting](#troubleshooting)）。稍后编辑源或清单后，使用 [ 插件 Reload](/cli/plugins#reload)。

## <a id="publish"></a> 发布

当包准备就绪后，通过 ClawHub 发布。`clawhub package publish` 接受以下来源：本地文件夹、GitHub 仓库（`owner/repo[@ref]`）或 tarball URL。

```bash
clawhub package publish ./stock-quotes --dry-run
clawhub package publish ./stock-quotes
```

使用显式的 ClawHub 定位器进行安装：

```bash
openclaw plugins install clawhub:your-org/stock-quotes
```

裸露的 npm 软件包规范从 npm 安装，但 ClawHub 是 OpenClaw 插件的首选发现和分发界面。请参阅 [ClawHub 发布 ](/clawhub/publishing) 了解所有者范围和发布审核。

## <a id="troubleshooting"></a> 故障排查

### `plugin entry not found: ./dist/index.js`

所选的入口文件不存在。运行 `npm run build`，然后重新执行 `openclaw plugins build --entry ./dist/index.js` 或 `openclaw plugins validate --entry ./dist/index.js`。

### `plugin entry does not expose defineToolPlugin metadata`

入口未导出由 `defineToolPlugin` 创建的值。确认模块的默认导出是 `defineToolPlugin(...)` 的结果，或者通过 `--entry` 传入正确的入口。

### `openclaw.plugin.json generated metadata is stale`

清单不再与入口元数据匹配。运行：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

同时提交 `openclaw.plugin.json` 和 `package.json` 的更改。

### `package.json openclaw.extensions must include ./dist/index.js`

包元数据指向了不同的运行时入口。运行 `openclaw plugins build --entry ./dist/index.js`，以便生成器使包元数据与您打算发布的入口保持一致。

### `Cannot find package 'typebox'`

构建后的插件在运行时导入了 `typebox`。请将其保留在 `dependencies` 中，重新安装、重新构建并重新运行验证。

### <a id="tool-does-not-appear-after-install"></a> 安装后工具没有出现

按以下顺序检查：

1. `openclaw plugins inspect <plugin-id> --runtime`
2. `openclaw plugins validate --root <plugin-root> --entry ./dist/index.js`
3. `openclaw.plugin.json` 的 `contracts.tools` 中包含预期的工具名称。
4. `package.json` 包含 `openclaw.extensions: ["./dist/index.js"]`。
5. Installation 报告运行时应用程序成功；源编辑或修复激活失败后，运行 `openclaw plugins reload <plugin-id>`。

## <a id="see-also"></a> 另请参阅

- [构建插件](/plugins/building-plugins)
- [插件 SDK 概览](/plugins/sdk-overview)
- [插件入口点](/plugins/sdk-entrypoints)
- [插件 SDK 子路径](/plugins/sdk-subpaths)
- [插件清单](/plugins/manifest)
- [插件 CLI](/cli/plugins)
- [ClawHub 发布](/clawhub/publishing)
