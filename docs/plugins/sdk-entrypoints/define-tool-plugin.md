---
summary: "仅限工具的入口帮助程序、其架构和生成的清单元数据"
title: "插件 SDK DefineToolPlugin 帮助程序"
sidebarTitle: "定义工具插件"
read_when:
  - "您正在编写一个仅添加代理工具的插件"
  - "您需要 DefineToolPlugin 签名及其清单输出"
---

仅添加代理工具的插件的入口助手。 [插件入口点的部分参考](/plugins/sdk-entrypoints)。

## `defineToolPlugin`

**导入：** `openclaw/plugin-sdk/tool-plugin`

适用于只添加代理工具的插件。它保持源代码简洁，可从 TypeBox schema 推断 config 和工具参数类型，将普通返回值包装为 OpenClaw 工具结果格式，并暴露静态元数据， `openclaw plugins build` 会将其写入插件清单（`contracts.tools`、 `configSchema`）。

```typescript
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { Type } from "typebox";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quotes.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "API key." })),
  }),
  tools: (tool) => [
    tool({
      name: "quote",
      label: "Quote",
      description: "Fetch a quote.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol." }),
      }),
      outputSchema: Type.Object(
        {
          symbol: Type.String(),
          hasKey: Type.Boolean(),
        },
        { additionalProperties: false },
      ),
      execute: async ({ symbol }, config) => ({ symbol, hasKey: Boolean(config.apiKey) }),
    }),
  ],
});
```

- `configSchema` 是可选的；省略它时会使用严格的空对象 schema （生成的清单仍会包含 `configSchema`）。
- `execute` 返回纯字符串或 JSON- 可序列化值；帮助器将其包装为文本工具结果，并将 `details` 设置为原始（未字符串化）返回值。
- `outputSchema` 可选地描述原始的 `details` 值，供代码模式和工具搜索使用。目录调用会在执行前拒绝无效 schema，并在返回前验证最终值。
- 对于自定义工具结果，`openclaw/plugin-sdk/tool-results` 导出 `textResult` 和 `jsonResult`。
- 工具名称是静态的，因此 `openclaw plugins build` 会从声明的工具中推导出 `contracts.tools`，无需手动重复名称。
- 运行时加载仍保持严格：已安装的插件仍需要 `openclaw.plugin.json` 和 `package.json` 中的 `openclaw.extensions`。OpenClaw 绝不会执行插件代码来推断缺失的清单数据。

## <a id="input-dependent-output-schemas"></a> 依赖于输入的输出模式

现有的 `outputSchema` 字段通过版本化的 `x-openclaw-input-discriminator` JSON 架构注释支持特定于操作的代码模式结果。使用标准 TypeBox API 从相同的本地变体构造联合和映射：

```typescript
const variants = Object.entries({
  list: Type.Object({ items: Type.Array(Type.String()) }),
  status: Type.Object({ ready: Type.Boolean() }),
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

将结果用作 `defineToolPlugin` 或 `api.registerTool` 中的 `outputSchema`。包括每个变体中的成功和非投掷失败结果。静态元数据保留注释。代码模式推断所选的返回类型；工具搜索验证实际和最初宣传的操作结果。缺失或广泛的选择器保留了健全的联盟。超出现有界限的引用模式和声明使用保守的伞式契约。有关版本、挂钩和验证行为，请参阅 [ 输入相关输出](/tools/code-mode/output#input-dependent-outputs)。
