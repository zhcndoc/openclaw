---
summary: "在几分钟内创建你的第一个 OpenClaw 插件"
title: "构建插件"
sidebarTitle: "入门"
read_when:
  - 你想创建一个新的 OpenClaw 插件
  - 你需要一个插件开发的快速入门
  - 你正在为 OpenClaw 添加新的通道、提供者、工具或其他能力
---

插件通过新的能力扩展 OpenClaw：通道、模型提供者、
语音、实时转写、实时语音、媒体理解、图像
生成、视频生成、Web 获取、Web 搜索、代理工具，或这些能力的
任意组合。

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
  <Card title="工具 / 钩子插件" icon="wrench" href="/plugins/hooks">
    注册代理工具、事件钩子或服务——继续往下看
  </Card>
</CardGroup>

对于在引导/设置运行时不能保证已安装的通道插件，请从
`openclaw/plugin-sdk/channel-setup` 使用 `createOptionalChannelSetupSurface(...)`。
它会生成一个设置适配器 + 向导对，声明安装要求，并在真实配置写入时
在插件安装之前安全失败。

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
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
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

    每个插件都需要一个清单，即使没有配置。参见
    [清单](/plugins/manifest) 获取完整架构。标准的 ClawHub
    发布片段位于 `docs/snippets/plugin-publish/`。

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
            return { content: [{ type: "text", text: `得到: ${params.input}` }] };
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

    **外部插件：** 使用 ClawHub 验证并发布，然后安装：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    对于像 `@myorg/openclaw-my-plugin` 这样的裸包规格，OpenClaw 也会先检查 ClawHub 再检查 npm。

    **仓库内插件：** 放置在捆绑插件工作区树下 —— 自动发现。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件能力

单个插件可以通过 `api` 对象注册任意数量的能力：

| 能力             | 注册方法                              | 详细指南                                                                  |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| 文本推理（LLM）   | `api.registerProvider(...)`                      | [提供者插件](/plugins/sdk-provider-plugins)                               |
| CLI 推理后端  | `api.registerCliBackend(...)`                    | [CLI 后端](/gateway/cli-backends)                                           |
| 通道 / 消息传递    | `api.registerChannel(...)`                       | [通道插件](/plugins/sdk-channel-plugins)                                 |
| 语音（TTS/STT）       | `api.registerSpeechProvider(...)`                | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时转写 | `api.registerRealtimeTranscriptionProvider(...)` | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时语音         | `api.registerRealtimeVoiceProvider(...)`         | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解    | `api.registerMediaUnderstandingProvider(...)`    | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成       | `api.registerImageGenerationProvider(...)`       | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音乐生成       | `api.registerMusicGenerationProvider(...)`       | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 视频生成       | `api.registerVideoGenerationProvider(...)`       | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Web 获取              | `api.registerWebFetchProvider(...)`              | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Web 搜索             | `api.registerWebSearchProvider(...)`             | [提供者插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 工具结果中间件 | `api.registerAgentToolResultMiddleware(...)`     | [SDK 概览](/plugins/sdk-overview#registration-api)                          |
| 代理工具            | `api.registerTool(...)`                          | 见下文                                                                           |
| 自定义命令        | `api.registerCommand(...)`                       | [入口点](/plugins/sdk-entrypoints)                                        |
| 插件钩子           | `api.on(...)`                                    | [插件钩子](/plugins/hooks)                                                  |
| 内部事件钩子   | `api.registerHook(...)`                          | [入口点](/plugins/sdk-entrypoints)                                        |
| HTTP 路由            | `api.registerHttpRoute(...)`                     | [内部机制](/plugins/architecture-internals#gateway-http-routes)                |
| CLI 子命令        | `api.registerCli(...)`                           | [入口点](/plugins/sdk-entrypoints)                                        |

完整的注册 API 请参见 [SDK 概览](/plugins/sdk-overview#registration-api)。

捆绑插件可以在需要模型看到输出之前对工具结果进行异步重写时使用
`api.registerAgentToolResultMiddleware(...)`。请在
`contracts.agentToolResultMiddleware` 中声明目标运行时，例如
`["pi", "codex"]`。这是一个受信任的捆绑插件接缝；外部
插件应优先使用常规的 OpenClaw 插件钩子，除非 OpenClaw 为此能力
增加明确的信任策略。

如果你的插件注册自定义 gateway RPC 方法，请将它们保留在插件专用前缀下。核心管理命名空间（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）仍然保留，并且始终解析为
`operator.admin`，即使插件请求了更窄的作用域。

需要牢记的钩子守卫语义：

- `before_tool_call`: `{ block: true }` 是终态，并会停止更低优先级的处理器。
- `before_tool_call`: `{ block: false }` 会被视为未作决定。
- `before_tool_call`: `{ requireApproval: true }` 会暂停代理执行，并通过 exec approval 覆盖层、Telegram 按钮、Discord 交互，或任意通道上的 `/approve` 命令提示用户批准。
- `before_install`: `{ block: true }` 是终态，并会停止更低优先级的处理器。
- `before_install`: `{ block: false }` 会被视为未作决定。
- `message_sending`: `{ cancel: true }` 是终态，并会停止更低优先级的处理器。
- `message_sending`: `{ cancel: false }` 会被视为未作决定。
- `message_received`: 当你需要入站线程/主题路由时，优先使用类型化的 `threadId` 字段。将 `metadata` 保留给通道特定的额外信息。
- `message_sending`: 优先使用类型化的 `replyToId` / `threadId` 路由字段，而不是通道特定的 metadata 键。

`/approve` 命令处理执行和插件审批，并具有有界回退：当未找到执行审批 ID 时，OpenClaw 会通过插件审批重试相同的 ID。插件审批转发可以通过配置中的 `approvals.plugin` 独立配置。

如果自定义审批管道需要检测相同的有界回退情况，建议使用 `isApprovalNotFoundError` 来自 `openclaw/plugin-sdk/error-runtime`
而不是手动匹配审批过期字符串。

参见 [插件钩子](/plugins/hooks) 获取示例和钩子参考。

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

- 工具名称不得与核心工具冲突（冲突会被跳过）
- 任何注册对象格式不正确的工具，包括缺少 `parameters` 的情况，都会被跳过并记录到插件诊断信息中，而不是导致代理运行失败
- 对于有副作用或需要额外二进制依赖的工具，请使用 `optional: true`
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

对于提供者插件，将提供者特定的辅助函数保留在这些包根目录的 barrel 文件中，除非该接缝确实是通用的。当前捆绑示例：

- Anthropic: Claude 流包装器和 `service_tier` / beta 辅助函数
- OpenAI: 提供者构建器、默认模型辅助函数、实时提供者
- OpenRouter: 提供者构建器加上入职/配置辅助函数

如果辅助函数仅在一个捆绑提供者包内部有用，请将其保留在该包根目录接缝上，而不是将其提升到 `openclaw/plugin-sdk/*`。

一些生成的 `openclaw/plugin-sdk/<bundled-id>` 辅助函数接缝仍然存在，用于捆绑插件的维护和兼容性，例如
`plugin-sdk/feishu-setup` 或 `plugin-sdk/zalo-setup`。将这些视为保留表面，而不是新第三方插件的默认模式。

## 提交前检查清单

<Check>**package.json** 拥有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.json** 清单存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入使用聚焦的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而非 SDK 自导入</Check>
<Check>测试通过 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通过 (仓库内插件)</Check>

## Beta release testing

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 发布标签，并通过 `Watch` > `Releases` 订阅。Beta 标签看起来像 `v2026.3.N-beta.1`。你也可以开启官方 OpenClaw X 账户 [@openclaw](https://x.com/openclaw) 的通知以获取发布公告。
2. 一旦 beta 标签出现，立即针对该标签测试你的插件。稳定版之前的窗口期通常只有几个小时。
3. 测试后，在 `plugin-forum` Discord 频道中你的插件线程里发布 `all good` 或什么问题坏了。如果你还没有线程，创建一个。
4. 如果出了问题，打开或更新一个标题为 `Beta blocker: <plugin-name> - <summary>` 的 issue 并应用 `beta-blocker` 标签。将 issue 链接放在你的线程中。
5. 向 `main` 打开一个标题为 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，并在 PR 和你的 Discord 线程中链接该 issue。贡献者无法标记 PR，所以标题是维护者和自动化在 PR 端的信号。带有 PR 的 blocker 会被合并；没有的可能会照常发布。维护者在 beta 测试期间会关注这些线程。
6. 沉默意味着绿色。如果你错过了窗口期，你的修复可能会在下一个周期落地。

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

## 相关内容

- [插件架构](/plugins/architecture) — 内部架构深入探讨
- [SDK 概览](/plugins/sdk-overview) — 插件 SDK 参考
- [清单](/plugins/manifest) — 插件清单格式
- [通道插件](/plugins/sdk-channel-plugins) — 构建通道插件
- [提供者插件](/plugins/sdk-provider-plugins) — 构建提供者插件
