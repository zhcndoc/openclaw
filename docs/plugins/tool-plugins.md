---
summary: "使用 defineToolPlugin 和 openclaw 插件的 init/build/validate 构建简单的类型化 agent 工具"
title: "工具插件"
sidebarTitle: "工具插件"
read_when:
  - 你想构建一个只添加 agent 工具的简单 OpenClaw 插件
  - 你想使用 defineToolPlugin，而不是手动编写插件清单元数据
  - 你需要为仅工具插件搭建脚手架、生成、验证、测试或发布
---

工具插件会向 OpenClaw 添加可由 agent 调用的工具，而不会添加 channel、模型提供方、hook、service 或 setup 后端。插件拥有一组固定工具，并且你希望 OpenClaw 生成能让这些工具在不加载运行时代码的情况下仍可被发现的清单元数据时，请使用 `defineToolPlugin`。

推荐流程如下：

1. 使用 `openclaw plugins init` 搭建一个包。
2. 使用 `defineToolPlugin` 编写工具。
3. 构建 JavaScript。
4. 使用 `openclaw plugins build` 生成 `openclaw.plugin.json` 和 `package.json` 元数据。
5. 在发布或安装前验证生成的元数据。

对于 provider、channel、hook、service 或混合能力插件，请改从
[构建插件](/plugins/building-plugins)、[Channel Plugins](/plugins/sdk-channel-plugins)，或
[Provider Plugins](/plugins/sdk-provider-plugins) 开始。

## 要求

- Node >= 22。
- TypeScript ESM 包输出。
- 用于配置和工具参数 schema 的 `typebox`。
- `openclaw >=2026.5.17`，这是第一个导出 `openclaw/plugin-sdk/tool-plugin` 的 OpenClaw 版本。
- 一个可以发布 `dist/`、`openclaw.plugin.json` 和 `package.json` 的包根目录。

生成的插件会在运行时导入 `typebox`，因此请将 `typebox` 保留在 `dependencies` 中，而不只是 `devDependencies`。

## 快速开始

创建一个新的插件包：

```bash
openclaw plugins init stock-quotes --name "股票报价"
cd stock-quotes
npm install
npm run plugin:build
npm run plugin:validate
npm test
```

脚手架会创建：

- `src/index.ts`：一个带有 `echo` 工具的 `defineToolPlugin` 入口。
- `src/index.test.ts`：一个小型的元数据测试。
- `tsconfig.json`：输出到 `dist/` 的 NodeNext TypeScript。
- `package.json`：脚本、运行时依赖，以及 `openclaw.extensions: ["./dist/index.js"]`。
- `openclaw.plugin.json`：初始工具的生成清单元数据。

预期的验证输出：

```text
插件 stock-quotes 有效。
```

## 编写工具

`defineToolPlugin` 接受插件标识、一个可选的配置 schema，以及一个静态工具列表。参数和配置类型会从 TypeBox schemas 中推断。

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

当用户应该在工具发送给模型之前显式允许列表化时，将 `optional: true` 设为开启：

```typescript
tool({
  name: "workflow_run",
  description: "运行外部工作流。",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  execute: ({ goal }) => ({ queued: true, goal }),
});
```

`openclaw plugins build` 会写入匹配的 `toolMetadata.<tool>.optional` 清单条目，这样 OpenClaw 就可以在不加载插件运行时代码的情况下发现该工具。

当工具在创建之前需要运行时工具上下文时，请使用 `factory`。工厂会保持元数据静态，同时允许工具针对特定运行选择退出、检查沙箱状态，或绑定运行时辅助函数。

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

工厂仍然只适用于固定的工具名称。当插件动态计算工具名称，或将工具与 hooks、services、providers、commands 或其他运行时表面组合时，请直接使用 `definePluginEntry`。

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

当你需要返回自定义的 `AgentToolResult`，或重用已有的 `api.registerTool` 实现时，请使用工厂工具。当你需要完全动态的工具或混合插件能力时，请使用 `definePluginEntry`，而不是 `defineToolPlugin`。

## 配置

`configSchema` 是可选的。如果省略它，OpenClaw 会使用严格的空对象 schema，生成的清单中仍然会包含 `configSchema`。

```typescript
export default defineToolPlugin({
  id: "no-config-tools",
  name: "无需配置的工具",
  description: "添加不需要配置的工具。",
  tools: () => [],
});
```

当你包含 `configSchema` 时，第二个 `execute` 参数会从该 schema 中进行类型推断：

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

OpenClaw 从 Gateway 配置中的插件条目读取插件配置。不要在源码或文档示例中硬编码密钥。请根据插件的安全模型使用 config、环境变量或 SecretRefs。

## 生成的元数据

OpenClaw 通过冷元数据发现已安装插件。它必须能够在导入插件运行时代码之前读取插件清单。`defineToolPlugin` 因此会暴露静态元数据，而 `openclaw plugins build` 会将该元数据写入包中。

在更改插件 id、名称、描述、配置 schema、激活方式或工具名称后，请运行生成器：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

对于单工具插件，生成的清单如下所示：

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

`contracts.tools` 是重要的发现契约。它会告诉 OpenClaw 每个工具由哪个插件拥有，而无需加载每个已安装插件的运行时。如果清单过期，工具可能无法被发现，或者注册错误可能会被归咎到错误的插件。

## 包元数据

对于简单的工具插件工作流，`openclaw plugins build` 会将 `package.json` 对齐到选定的单一运行时入口：

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

已安装包请使用诸如 `./dist/index.js` 这样的构建后 JavaScript。源文件入口在工作区开发中很有用，但已发布的包不应依赖于 TypeScript 运行时加载。

## 在 CI 中验证

使用 `plugins build --check` 在生成元数据过期时让 CI 失败，而不重写文件：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
npm test
```

`plugins validate` 会检查以下内容：

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

对于打包后的快速验证，先打包并安装 tarball：

```bash
npm pack
openclaw plugins install npm-pack:./openclaw-plugin-stock-quotes-0.1.0.tgz
openclaw plugins inspect stock-quotes --runtime --json
```

安装后，启动或重启 Gateway，并让 agent 使用该工具。如果你正在调试工具可见性，在更改代码之前，请检查插件运行时和实际生效的工具目录。

## 发布

当包准备就绪时，通过 ClawHub 发布：

```bash
clawhub package publish your-org/stock-quotes --dry-run
clawhub package publish your-org/stock-quotes
```

使用显式的 ClawHub 定位器进行安装：

```bash
openclaw plugins install clawhub:your-org/stock-quotes
```

在发布切换期间，裸 npm 包规范仍然受支持，但 ClawHub 是 OpenClaw 插件首选的发现和分发入口。

## 故障排查

### `plugin entry not found: ./dist/index.js`

所选的入口文件不存在。运行 `npm run build`，然后重新执行
`openclaw plugins build --entry ./dist/index.js` 或
`openclaw plugins validate --entry ./dist/index.js`。

### `plugin entry does not expose defineToolPlugin metadata`

该入口没有导出由 `defineToolPlugin` 创建的值。请检查
模块的默认导出是否为 `defineToolPlugin(...)` 的结果，或者通过 `--entry`
传入正确的入口。

### `openclaw.plugin.json generated metadata is stale`

清单不再与入口元数据匹配。运行：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

同时提交 `openclaw.plugin.json` 和 `package.json` 的更改。

### `package.json openclaw.extensions must include ./dist/index.js`

包元数据指向了不同的运行时入口。运行
`openclaw plugins build --entry ./dist/index.js`，这样生成器就会将
包元数据与您打算发布的入口对齐。

### `Cannot find package 'typebox'`

构建后的插件在运行时导入了 `typebox`。请将 `typebox` 保持在
`dependencies` 中，重新安装包依赖，重新构建，并再次运行验证。

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
