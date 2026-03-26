---
title: "构建插件"
sidebarTitle: "快速开始"
summary: "在几分钟内创建你的第一个 OpenClaw 插件"
read_when:
  - 你想创建一个新的 OpenClaw 插件
  - 你需要一个插件开发的快速入门
  - 你正在为 OpenClaw 添加新的通道、提供者、工具或其他能力
---

# 构建插件

插件通过新能力扩展 OpenClaw：通道、模型提供者、语音、图像生成、网页搜索、代理工具，或这些能力的任意组合。

你不需要把插件添加到 OpenClaw 仓库。发布到
[ClawHub](/tools/clawhub) 或 npm，用户可以通过
`openclaw plugins install <package-name>` 安装。OpenClaw 会先尝试 ClawHub，
然后自动回退到 npm。

## 前置条件

- Node >= 22 和一个包管理器（npm 或 pnpm）
- 熟悉 TypeScript（ESM）
- 对于仓库内插件：已克隆仓库并完成 `pnpm install`

## 这是什么类型的插件？

<CardGroup cols={3}>
  <Card title="通道插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到一个消息平台（Discord、IRC 等）
  </Card>
  <Card title="提供者插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    添加一个模型提供者（LLM、代理或自定义端点）
  </Card>
  <Card title="工具 / 钩子插件" icon="wrench">
    注册代理工具、事件钩子或服务 —— 继续向下阅读
  </Card>
</CardGroup>

## 快速开始：工具插件

本教程将创建一个最小插件，用于注册一个代理工具。通道和提供者插件有上面链接的专门指南。

<Steps>
  <Step title="创建包和清单">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"]
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "my-plugin",
      "name": "我的插件",
      "description": "为 OpenClaw 添加一个自定义工具",
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    每个插件都需要一个清单，即使没有配置也是如此。完整 schema 请参见
    [清单](/plugins/manifest)。

  </Step>

  <Step title="编写入口点">

    ```typescript
    // index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { Type } from "@sinclair/typebox";

    export default definePluginEntry({
      id: "my-plugin",
      name: "我的插件",
      description: "为 OpenClaw 添加一个自定义工具",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "执行某件事",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return { content: [{ type: "text", text: `Got: ${params.input}` }] };
          },
        });
      },
    });
    ```

    `definePluginEntry` 用于非通道插件。对于通道，请使用
    `defineChannelPluginEntry` —— 参见 [通道插件](/plugins/sdk-channel-plugins)。
    关于完整的入口点选项，请参见 [入口点](/plugins/sdk-entrypoints)。

  </Step>

  <Step title="测试并发布">

    **外部插件：** 发布到 [ClawHub](/tools/clawhub) 或 npm，然后安装：

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw 会先检查 ClawHub，然后回退到 npm。

    **仓库内插件：** 放在 `extensions/` 下 —— 会被自动发现。

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## 插件能力

单个插件可以通过 `api` 对象注册任意数量的能力：

| 能力                 | 注册方法                                       | 详细指南                                                                      |
| -------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| 文本推理（LLM）      | `api.registerProvider(...)`                    | [提供者插件](/plugins/sdk-provider-plugins)                                   |
| 通道 / 消息传递      | `api.registerChannel(...)`                     | [通道插件](/plugins/sdk-channel-plugins)                                      |
| 语音（TTS/STT）      | `api.registerSpeechProvider(...)`              | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)    |
| 媒体理解             | `api.registerMediaUnderstandingProvider(...)`  | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)    |
| 图像生成             | `api.registerImageGenerationProvider(...)`     | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)    |
| 网页搜索             | `api.registerWebSearchProvider(...)`           | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)    |
| 代理工具             | `api.registerTool(...)`                        | 见下文                                                                         |
| 自定义命令           | `api.registerCommand(...)`                     | [入口点](/plugins/sdk-entrypoints)                                             |
| 事件钩子             | `api.registerHook(...)`                        | [入口点](/plugins/sdk-entrypoints)                                             |
| HTTP 路由             | `api.registerHttpRoute(...)`                   | [内部机制](/plugins/architecture#gateway-http-routes)                         |
| CLI 子命令           | `api.registerCli(...)`                         | [入口点](/plugins/sdk-entrypoints)                                             |

完整的注册 API 请参见 [SDK 概览](/plugins/sdk-overview#registration-api)。

需要牢记的钩子守卫语义：

- `before_tool_call`：`{ block: true }` 是终态，会停止低优先级处理器。
- `before_tool_call`：`{ block: false }` 视为没有决定。
- `message_sending`：`{ cancel: true }` 是终态，会停止低优先级处理器。
- `message_sending`：`{ cancel: false }` 视为没有决定。

详情请参见 [SDK 概览中的钩子决策语义](/plugins/sdk-overview#hook-decision-semantics)。

## 注册代理工具

工具是 LLM 可以调用的类型化函数。它们可以是必需的（始终可用），也可以是可选的（由用户选择启用）：

```typescript
register(api) {
  // 必需工具 — 始终可用
  api.registerTool({
    name: "my_tool",
    description: "执行某件事",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // 可选工具 — 用户必须将其加入允许列表
  api.registerTool(
    {
      name: "workflow_tool",
      description: "运行一个工作流",
      parameters: Type.Object({ pipeline: Type.String() }),
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

用户在配置中启用可选工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名称不得与核心工具冲突（冲突项会被跳过）
- 对于具有副作用或额外二进制依赖要求的工具，请使用 `optional: true`
- 用户可以通过将插件 id 添加到 `tools.allow` 来启用某个插件中的所有工具

## 导入约定

始终从专门的 `openclaw/plugin-sdk/<subpath>` 路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// 错误：单体根导入（已弃用，将被移除）
import { ... } from "openclaw/plugin-sdk";
```

完整的子路径参考请参见 [SDK 概览](/plugins/sdk-overview)。

在你的插件内部，使用本地的 barrel 文件（`api.ts`、`runtime-api.ts`）进行
内部导入 —— 绝不要通过自己的 SDK 路径导入自己的插件。

## 提交前检查清单

<Check>**package.json** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.json** 清单已存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用专门的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自身导入</Check>
<Check>测试通过（`pnpm test -- extensions/my-plugin/`）</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## 下一步

<CardGroup cols={2}>
  <Card title="通道插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    构建一个消息通道插件
  </Card>
  <Card title="提供者插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    构建一个模型提供者插件
  </Card>
  <Card title="SDK 概览" icon="book-open" href="/plugins/sdk-overview">
    导入映射和注册 API 参考
  </Card>
  <Card title="运行时辅助" icon="settings" href="/plugins/sdk-runtime">
    通过 api.runtime 提供 TTS、搜索、子代理
  </Card>
  <Card title="测试" icon="test-tubes" href="/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="插件清单" icon="file-json" href="/plugins/manifest">
    完整的清单 schema 参考
  </Card>
</CardGroup>
