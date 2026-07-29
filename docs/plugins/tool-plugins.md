---
summary: "使用 defineToolPlugin 和 openclaw 插件的 init/build/validate 构建简单的类型化 agent 工具"
title: "工具插件"
sidebarTitle: "工具插件"
read_when:
  - 你想构建一个只添加 agent 工具的简单 OpenClaw 插件
  - 你想使用 defineToolPlugin，而不是手动编写插件清单元数据
  - 你需要为仅工具插件搭建脚手架、生成、验证、测试或发布
---

`defineToolPlugin` 构建一个仅添加 agent 可调用工具的插件：不包含
channel、model provider、hook、service 或 setup 后端。它会生成
OpenClaw 发现工具所需的清单元数据，而无需加载插件运行时代码。

对于 provider、channel、hook、service 或混合能力插件，请改从
[构建插件](/plugins/building-plugins)、[Channel Plugins](/plugins/sdk-channel-plugins)，或
[Provider Plugins](/plugins/sdk-provider-plugins) 开始。

## 要求

- Node 22.22.3+、Node 24.15+ 或 Node 25.9+。
- TypeScript ESM 包输出。
- `dependencies` 中包含 `typebox`（不能只放在 `devDependencies` 中——生成的
  插件会在运行时导入它）。
- `openclaw >=2026.5.17`，这是第一个导出
  `openclaw/plugin-sdk/tool-plugin` 的版本。
- 一个会发布 `dist/`、`openclaw.plugin.json` 和
  `package.json` 的包根目录。

## 快速开始

```bash
openclaw plugins init stock-quotes --name "股票报价"
cd stock-quotes
npm install
npm run plugin:build
npm run plugin:validate
npm test
```

`plugins init` 会生成以下内容：

| 文件                   | 作用                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `src/index.ts`         | `defineToolPlugin` 入口，包含一个 `echo` 工具                     |
| `src/index.test.ts`    | 元数据测试，断言工具列表                                           |
| `tsconfig.json`        | 输出到 `dist/` 的 NodeNext TypeScript 配置                         |
| `vitest.config.ts`     | `src/**/*.test.ts` 的 Vitest 配置                                  |
| `package.json`         | 脚本、运行时依赖、`openclaw.extensions: ["./dist/index.js"]`      |
| `openclaw.plugin.json` | 为初始工具生成的清单元数据                                         |

`npm run plugin:build` 先运行 `npm run build`（tsc），然后
运行 `openclaw plugins build --entry ./dist/index.js`。`npm run plugin:validate`
会重新构建并运行 `openclaw plugins validate --entry ./dist/index.js`。
验证成功时会输出：

```text
插件 stock-quotes 有效。
```

`openclaw plugins init <id>` 选项：

| 标志                  | 默认值             | 作用                                   |
| --------------------- | ------------------ | -------------------------------------- |
| `--directory <path>` | `<id>`             | 输出目录                               |
| `--name <name>`      | Title-cased `<id>` | 显示名称                               |
| `--type <type>`      | `tool`             | 脚手架类型：`tool` 或 `provider`       |
| `--force`            | off                | 覆盖已存在的输出目录                   |

## 编写工具

`defineToolPlugin` 接受插件标识、一个可选的配置模式，以及一个静态的工具列表。参数和配置类型会根据 TypeBox 模式进行推断。

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "股票报价",
  description: "获取股票报价快照。",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "报价 API 密钥。" })),
    baseUrl: Type.Optional(Type.String({ description: "报价 API 基础 URL。" })),
  }),
  tools: (tool) => [
    tool({
      name: "stock_quote",
      label: "股票报价",
      description: "获取股票报价快照。",
      parameters: Type.Object({
        symbol: Type.String({ description: "股票代码，例如 OPEN。" }),
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

## 可选工具和工厂工具

当用户应当显式将工具加入允许列表后才将其发送给模型时，设置 `optional: true`。`openclaw plugins build` 会写入匹配的 `toolMetadata.<tool>.optional` 清单条目，因此 OpenClaw 无需加载插件运行时代码就能知道该工具是可选的。

```typescript
tool({
  name: "workflow_run",
  description: "运行外部工作流。",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  execute: ({ goal }) => ({ queued: true, goal }),
});
```

当工具在创建之前需要运行时工具上下文时，使用 `factory`——例如为了针对特定运行选择退出、检查沙箱状态，或绑定运行时辅助函数。尽管具体工具是在运行时构建的，元数据仍然保持静态。

```typescript
tool({
  name: "local_workflow",
  description: "在沙箱会话之外运行本地工作流。",
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

工厂仍然会预先声明一个固定的工具名称。当插件动态计算工具名称，或将工具与 hooks、services、providers 或 commands 组合时，直接使用 `definePluginEntry`。

## 返回值

`defineToolPlugin` 会将普通返回值包装为 OpenClaw 工具结果格式：

- 当模型应看到那段精确文本时，返回一个字符串。
- 当你希望模型看到格式化的 JSON，并且 OpenClaw 将原始值保留在 `details` 中时，返回一个兼容 JSON 的值。

```typescript
tool({
  name: "echo_text",
  description: "回显输入文本。",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => input,
});
```

```typescript
tool({
  name: "echo_json",
  description: "将输入作为结构化 JSON 回显。",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => ({ input, length: input.length }),
});
```

当你需要自定义 `AgentToolResult`，或者希望复用现有的 `api.registerTool` 实现时，请使用工厂工具。

## Output contracts

Add `outputSchema` when a tool returns stable JSON-compatible data. It describes
the original value stored in `AgentToolResult.details`, not the formatted text
in `content`:

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

[Code Mode](/tools/code-mode) and [Tool Search](/tools/tool-search) turn this
schema into a bounded TypeScript-style output hint. That lets a model call and
transform a known result in one program instead of spending another model turn
observing its shape.

OpenClaw compiles the schema before executing a catalog call, then validates the
final `details` value after tool hooks before returning it through the bridge.
An invalid schema cannot run the tool; a result mismatch fails the completed
call. Include every non-throwing result variant, including structured error
variants, or omit the schema when the result is not stable. Do not put secrets
or sensitive values in schema descriptions because trusted output metadata can
become model-visible.
Use `{ additionalProperties: false }` on object layers when you want a complete
compact output hint; open or truncated schemas remain available through
`tools.describe(...)` but are not advertised as complete quick-index contracts.

Factory tools declare `outputSchema` on the concrete `AnyAgentTool` they
return. The static `tool({ factory })` declaration does not accept a separate
output schema because it could drift from the runtime tool.

## Configuration

`configSchema` 是可选的。省略它时，OpenClaw 会应用严格的空对象
schema；生成的 manifest 仍然包含 `configSchema`。

```typescript
export default defineToolPlugin({
  id: "no-config-tools",
  name: "无需配置的工具",
  description: "添加不需要配置的工具。",
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
  name: "已配置的工具",
  description: "添加已配置的工具。",
  configSchema,
  tools: (tool) => [
    tool({
      name: "configured_ping",
      description: "检查配置是否可用。",
      parameters: Type.Object({}),
      execute: (_params, config) => ({ hasKey: config.apiKey.length > 0 }),
    }),
  ],
});
```

OpenClaw 会从 Gateway 配置中该插件的条目读取插件配置。请勿
在源码或文档示例中硬编码密钥；请根据插件的安全模型使用 config、环境
变量或 SecretRefs。

## 生成的元数据

OpenClaw 必须先读取插件清单，然后才能导入插件运行时代码。  
`defineToolPlugin` 为此暴露了静态元数据，而  
`openclaw plugins build` 会将其写入包中。更改插件 id、名称、描述、配置模式、激活方式或工具名称后，  
请重新运行生成器：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

单工具插件生成的清单：

```json
{
  "id": "stock-quotes",
  "name": "股票报价",
  "description": "获取股票报价快照。",
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

`contracts.tools` 是重要的发现契约：它告诉 OpenClaw 在不加载每个已安装插件的运行时的情况下，  
每个工具分别属于哪个插件。过期的清单会导致工具在发现过程中丢失，或者把注册错误归咎于错误的插件。

## Package metadata

`openclaw plugins build` also aligns `package.json` to the selected runtime entry:

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

Publish the built JavaScript (`./dist/index.js`), do not use the TypeScript source entry.
The source entry is only for local development in the workspace.

## 在 CI 中验证

当生成的元数据已过期时，`plugins build --check` 会在不重写文件的情况下失败：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
npm test
```

OpenClaw SDK compatibility fields carry TypeScript `@deprecated` annotations,
which editors surface as migration warnings. To enforce them in CI, enable a
type-aware rule such as
[`@typescript-eslint/no-deprecated`](https://typescript-eslint.io/rules/no-deprecated/).
Oxlint is not type-aware, so it cannot enforce these annotations. The generated
`plugins init` scaffold therefore does not add a deprecation lint config.

`plugins validate` checks that:

- `openclaw.plugin.json` 是否存在并通过常规清单加载器。
- 当前入口是否导出 `defineToolPlugin` 元数据。
- 生成的清单字段是否与入口元数据匹配。
- `contracts.tools` 是否与声明的工具名称匹配。
- `package.json` 是否将 `openclaw.extensions` 指向所选的运行时入口。

## 在本地安装和检查

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

安装后，重启或重新加载 Gateway，并让代理使用该工具。如果工具不可见，请在修改代码之前检查插件运行时和实际生效的工具目录（请参见 [故障排查](#troubleshooting)）。

## 发布

当包准备就绪后，通过 ClawHub 发布。`clawhub package publish`
接受以下来源：本地文件夹、GitHub 仓库（`owner/repo[@ref]`）或
tarball URL。

```bash
clawhub package publish ./stock-quotes --dry-run
clawhub package publish ./stock-quotes
```

使用显式的 ClawHub 定位器进行安装：

```bash
openclaw plugins install clawhub:your-org/stock-quotes
```

在启动切换期间，裸 npm 包规范仍然会从 npm 安装，但
ClawHub 是 OpenClaw 插件首选的发现和分发入口。有关 owner 范围和
发布审核，请参见 [ClawHub 发布](/clawhub/publishing)。

## 故障排查

### `plugin entry not found: ./dist/index.js`

所选的入口文件不存在。运行 `npm run build`，然后重新执行
`openclaw plugins build --entry ./dist/index.js` 或
`openclaw plugins validate --entry ./dist/index.js`。

### `plugin entry does not expose defineToolPlugin metadata`

入口未导出由 `defineToolPlugin` 创建的值。确认模块的默认导出是
`defineToolPlugin(...)` 的结果，或者通过 `--entry` 传入正确的入口。

### `openclaw.plugin.json generated metadata is stale`

清单不再与入口元数据匹配。运行：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

同时提交 `openclaw.plugin.json` 和 `package.json` 的更改。

### `package.json openclaw.extensions must include ./dist/index.js`

包元数据指向了不同的运行时入口。运行
`openclaw plugins build --entry ./dist/index.js`，以便生成器使包元数据与您打算发布的入口保持一致。

### `Cannot find package 'typebox'`

构建后的插件在运行时导入了 `typebox`。请将其保留在
`dependencies` 中，重新安装、重新构建并重新运行验证。

### 安装后工具没有出现

按以下顺序检查：

1. `openclaw plugins inspect <plugin-id> --runtime`
2. `openclaw plugins validate --root <plugin-root> --entry ./dist/index.js`
3. `openclaw.plugin.json` 的 `contracts.tools` 中包含预期的工具名称。
4. `package.json` 包含 `openclaw.extensions: ["./dist/index.js"]`。
5. 安装插件后，Gateway 已重启或重新加载。

## 另请参见

- [构建插件](/plugins/building-plugins)
- [插件入口点](/plugins/sdk-entrypoints)
- [插件 SDK 子路径](/plugins/sdk-subpaths)
- [插件清单](/plugins/manifest)
- [插件 CLI](/cli/plugins)
- [ClawHub 发布](/clawhub/publishing)
