---
summary: "在插件中编写代理工具（模式，可选工具，允许列表）"
read_when:
  - 你想在插件中添加新的代理工具
  - 你需要通过允许列表使工具成为可选
title: "插件代理工具"
---

# 插件代理工具

OpenClaw 插件可以注册 **代理工具**（JSON-schema 函数），这些工具在代理运行时向 LLM 暴露。工具可以是 **必需的**（始终可用）或 **可选的**（需选择加入）。

代理工具在主配置的 `tools` 下配置，或在每个代理的 `agents.list[].tools` 下配置。允许列表/拒绝列表策略控制代理可以调用哪些工具。

## 基础工具

```ts
import { Type } from "@sinclair/typebox";

export default function (api) {
  api.registerTool({
    name: "my_tool",
    description: "执行一个操作",
    parameters: Type.Object({
      input: Type.String(),
    }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });
}
```

## 可选工具（需选择加入）

可选工具 **绝不会** 自动启用。用户必须将它们添加到代理允许列表中。

```ts
export default function (api) {
  api.registerTool(
    {
      name: "workflow_tool",
      description: "运行本地工作流",
      parameters: {
        type: "object",
        properties: {
          pipeline: { type: "string" },
        },
        required: ["pipeline"],
      },
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

在 `agents.list[].tools.allow`（或全局的 `tools.allow`）中启用可选工具：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        tools: {
          allow: [
            "workflow_tool", // 具体工具名
            "workflow", // 插件 id（启用该插件下所有工具）
            "group:plugins", // 所有插件工具
          ],
        },
      },
    ],
  },
}
```

其他影响工具可用性的配置选项：

- 仅命名插件工具的允许列表被视为插件加入；核心工具保持启用状态，除非你也在允许列表中包含了核心工具或组。
- `tools.profile` / `agents.list[].tools.profile`（基础允许列表）
- `tools.byProvider` / `agents.list[].tools.byProvider`（供应商特定的允许/拒绝）
- `tools.sandbox.tools.*`（受限环境中的沙盒工具策略）

## 规则 + 提示

- 工具名称 **不得** 与核心工具名称冲突；冲突工具将被跳过。
- 允许列表中使用的插件 id 不得与核心工具名称冲突。
- 对于触发副作用或需要额外二进制文件/凭证的工具，建议设置 `optional: true`。
