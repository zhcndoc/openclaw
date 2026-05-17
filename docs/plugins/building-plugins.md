---
summary: "在几分钟内创建你的第一个 OpenClaw 插件"
title: "构建插件"
sidebarTitle: "快速开始"
read_when:
  - 你想创建一个新的 OpenClaw 插件
  - 你需要一个插件开发的快速入门
  - 你正在为 OpenClaw 添加一个新的 channel、provider、tool 或其他能力
---

插件通过新增能力来扩展 OpenClaw：channels、模型提供方、
speech、实时转录、实时语音、媒体理解、图像生成、视频生成、网页抓取、网页搜索、agent 工具，或这些能力的任意组合。

你不需要将插件添加到 OpenClaw 仓库中。发布到
[ClawHub](/clawhub)，用户可通过
`openclaw plugins install clawhub:<package-name>` 安装。裸包规格在发布切换期间仍然会
从 npm 安装。

## 前提条件

- Node >= 22 和一个包管理器（npm 或 pnpm）
- 熟悉 TypeScript（ESM）
- 对于仓库内插件：已克隆仓库并执行 `pnpm install`。源码检出方式的插件开发仅支持 pnpm，因为 OpenClaw 会从 `extensions/*` 工作区包中加载已捆绑的插件。

## 这是什么类型的插件？

<CardGroup cols={3}>
  <Card title="Channel 插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到一个消息平台（Discord、IRC 等）
  </Card>
  <Card title="Provider 插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    添加一个模型提供方（LLM、代理或自定义端点）
  </Card>
  <Card title="CLI 后端插件" icon="terminal" href="/plugins/cli-backend-plugins">
    将本地 AI CLI 映射到 OpenClaw 的文本回退运行器
  </Card>
  <Card title="工具 / hook 插件" icon="wrench" href="/plugins/hooks">
    注册 agent 工具、事件钩子或服务 - 继续下面
  </Card>
</CardGroup>

对于在 onboarding/setup 运行时不能保证已安装的 channel 插件，请使用来自
`openclaw/plugin-sdk/channel-setup` 的 `createOptionalChannelSetupSurface(...)`。
它会生成一个 setup adapter + wizard 对，声明安装要求，并在真实的配置写入前保持关闭，
直到插件已安装。

## 快速开始：工具插件

本教程将创建一个最小插件，用于注册一个 agent 工具。Channel
和 provider 插件有上面链接的专门指南。

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
      "name": "My Plugin",
      "description": "向 OpenClaw 添加一个自定义工具",
      "contracts": {
        "tools": ["my_tool"]
      },
      "activation": {
        "onStartup": true
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    每个插件都需要一个清单，即使没有配置也是如此。运行时注册的工具
    必须列在 `contracts.tools` 中，这样 OpenClaw 才能在不加载每个插件运行时的情况下发现其所属
    插件。插件也应明确声明 `activation.onStartup`。本示例将其设为 `true`。完整 schema 请参见
    [Manifest](/plugins/manifest)。规范的 ClawHub
    发布片段位于 `docs/snippets/plugin-publish/` 中。

  </Step>

  <Step title="编写入口点">

    ```typescript
    // index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { Type } from "@sinclair/typebox";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
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

    `definePluginEntry` 用于非 channel 插件。对于 channel，请使用
    `defineChannelPluginEntry` - 参见 [Channel Plugins](/plugins/sdk-channel-plugins)。
    有关完整的入口点选项，请参见 [Entry Points](/plugins/sdk-entrypoints)。

  </Step>

  <Step title="测试并发布">

    **外部插件：** 使用 ClawHub 验证并发布，然后安装：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    像 `@myorg/openclaw-my-plugin` 这样的裸包说明会在发布切换期间
    从 npm 安装。当你想使用 ClawHub 解析时，请使用 `clawhub:`。

    **仓库内插件：** 放在捆绑插件工作区树下 - 会自动发现。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件能力

单个插件可以通过 `api` 对象注册任意数量的能力：

| 能力                   | 注册方法                                         | 详细指南                                                                        |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| 文本推理（LLM）        | `api.registerProvider(...)`                      | [Provider Plugins](/plugins/sdk-provider-plugins)                               |
| CLI 推理后端           | `api.registerCliBackend(...)`                    | [CLI Backend Plugins](/plugins/cli-backend-plugins)                             |
| Channel / 消息         | `api.registerChannel(...)`                       | [Channel Plugins](/plugins/sdk-channel-plugins)                                 |
| 语音（TTS/STT）        | `api.registerSpeechProvider(...)`                | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时转录               | `api.registerRealtimeTranscriptionProvider(...)` | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时语音               | `api.registerRealtimeVoiceProvider(...)`         | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解               | `api.registerMediaUnderstandingProvider(...)`    | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成               | `api.registerImageGenerationProvider(...)`       | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音乐生成               | `api.registerMusicGenerationProvider(...)`       | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 视频生成               | `api.registerVideoGenerationProvider(...)`       | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网页抓取               | `api.registerWebFetchProvider(...)`              | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网页搜索               | `api.registerWebSearchProvider(...)`             | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 工具结果中间件         | `api.registerAgentToolResultMiddleware(...)`     | [SDK Overview](/plugins/sdk-overview#registration-api)                          |
| Agent 工具             | `api.registerTool(...)`                          | 下文                                                                            |
| 自定义命令             | `api.registerCommand(...)`                       | [Entry Points](/plugins/sdk-entrypoints)                                        |
| 插件 hooks             | `api.on(...)`                                    | [Plugin hooks](/plugins/hooks)                                                  |
| 内部事件 hooks         | `api.registerHook(...)`                          | [Entry Points](/plugins/sdk-entrypoints)                                        |
| HTTP 路由              | `api.registerHttpRoute(...)`                     | [Internals](/plugins/architecture-internals#gateway-http-routes)                |
| CLI 子命令             | `api.registerCli(...)`                           | [Entry Points](/plugins/sdk-entrypoints)                                        |

关于完整的注册 API，请参见 [SDK Overview](/plugins/sdk-overview#registration-api)。

捆绑插件在需要模型看到输出之前先进行异步工具结果重写时，可以使用 `api.registerAgentToolResultMiddleware(...)`。
请在 `contracts.agentToolResultMiddleware` 中声明目标运行时，例如 `["pi", "codex"]`。
这是一个受信任的捆绑插件接入点；除非 OpenClaw 为此能力增加明确的信任策略，否则外部插件应优先使用常规的 OpenClaw 插件 hooks。

如果你的插件注册自定义 gateway RPC 方法，请将它们放在插件专用前缀下。
核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持保留状态，并且始终解析为 `operator.admin`，即使某个插件要求更窄的作用域也是如此。

`openclaw/plugin-sdk/gateway-method-runtime` 是一个保留的控制平面桥接，
用于声明
`contracts.gatewayMethodDispatch: ["authenticated-request"]` 的插件 HTTP 路由。它是
为经过审查的原生插件设置的有意使用保护，而不是沙箱边界。

需要牢记的 Hook 守卫语义：

- `before_tool_call`：`{ block: true }` 是终止性的，并会停止更低优先级的处理器。
- `before_tool_call`：`{ block: false }` 被视为没有决定。
- `before_tool_call`：`{ requireApproval: true }` 会暂停 agent 执行，并通过 exec approval 覆盖层、Telegram 按钮、Discord 交互，或任何 channel 上的 `/approve` 命令来提示用户批准。
- `before_install`：`{ block: true }` 是终止性的，并会停止更低优先级的处理器。
- `before_install`：`{ block: false }` 被视为没有决定。
- `message_sending`：`{ cancel: true }` 是终止性的，并会停止更低优先级的处理器。
- `message_sending`：`{ cancel: false }` 被视为没有决定。
- `message_received`：当你需要入站 thread/topic 路由时，优先使用类型化的 `threadId` 字段。将 `metadata` 保留给 channel 特定的额外信息。
- `message_sending`：优先使用类型化的 `replyToId` / `threadId` 路由字段，而不是 channel 特定的 metadata 键。

`/approve` 命令同时处理 exec 和插件批准，并带有有限回退：当找不到某个 exec approval id 时，OpenClaw 会通过插件批准重试同一个 id。
插件批准转发可以通过配置中的 `approvals.plugin` 单独配置。

如果自定义批准管道需要检测同样的有限回退情况，
请优先使用 `openclaw/plugin-sdk/error-runtime` 中的 `isApprovalNotFoundError`，
而不是手动匹配 approval-expiry 字符串。

更多示例和 hook 参考请参见 [Plugin hooks](/plugins/hooks)。

## 注册 agent 工具

工具是 LLM 可以调用的带类型函数。它们可以是必需的（始终可用）或可选的（由用户选择启用）：

```typescript
register(api) {
  // 必需工具 - 始终可用
  api.registerTool({
    name: "my_tool",
    description: "做一件事",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // 可选工具 - 用户必须将其添加到允许列表
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

工具工厂会接收一个运行时提供的上下文对象。当工具需要记录、展示或适配当前轮次所使用的活动模型时，请使用 `ctx.activeModel`。该对象可能包含 `provider`、`modelId` 和 `modelRef`。请将其视为信息性运行时元数据，而不是针对本地操作员、已安装插件代码或被修改过的 OpenClaw 运行时的安全边界。对于敏感的本地工具，请保留明确的插件或操作员选择加入，并在活动模型元数据缺失或不合适时以关闭状态失败。

每个通过 `api.registerTool(...)` 注册的工具也必须在插件清单中声明：

```json
{
  "contracts": {
    "tools": ["my_tool", "workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

OpenClaw 会捕获并缓存已注册工具中经过验证的描述符，
因此插件无需在清单中重复 `description` 或 schema 数据。清单契约只声明所有权和发现；
执行时仍然会调用实际注册的工具实现。
对于使用 `api.registerTool(..., { optional: true })` 注册的工具，将 `toolMetadata.<tool>.optional: true`
，以便 OpenClaw 能在该工具被显式加入允许列表之前避免加载该插件运行时。

用户可在配置中启用可选工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名称不得与核心工具冲突（冲突项会被跳过）
- 注册对象格式不正确的工具（包括缺少 `parameters`）会被跳过，并在插件诊断中报告，而不会破坏 agent 运行
- 对有副作用或额外二进制依赖的工具使用 `optional: true`
- 用户可以通过将插件 id 添加到 `tools.allow` 来启用某个插件中的所有工具

## 注册 CLI 命令

插件可以使用 `api.registerCli` 添加根级 `openclaw` 命令组。请为每个顶层命令根提供 `descriptors`，这样 OpenClaw 就能在不急于加载每个插件运行时的情况下显示并路由该命令。

```typescript
register(api) {
  api.registerCli(
    ({ program }) => {
      const demo = program
        .command("demo-plugin")
        .description("运行 demo 插件命令");

      demo
        .command("ping")
        .description("检查该插件 CLI 是否可执行")
        .action(() => {
          console.log("demo-plugin:pong");
        });
    },
    {
      descriptors: [
        {
          name: "demo-plugin",
          description: "运行 demo 插件命令",
          hasSubcommands: true,
        },
      ],
    },
  );
}
```

安装后，验证运行时注册并执行该命令：

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## 导入约定

始终从聚焦的 `openclaw/plugin-sdk/<subpath>` 路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// 错误：单体根路径（已弃用且将被移除）
import { ... } from "openclaw/plugin-sdk";
```

有关完整的子路径参考，请参阅 [SDK 概览](/plugins/sdk-overview)。

在你的插件中，使用本地 barrel 文件（`api.ts`、`runtime-api.ts`）进行内部导入——不要通过其 SDK 路径导入你自己的插件。

对于 provider 插件，除非接口确实是通用的，否则请将 provider 特定的辅助工具保留在这些包根的 barrel 文件中。当前内置的示例包括：

- Anthropic：Claude 流包装器以及 `service_tier` / beta 辅助工具
- OpenAI：provider 构建器、默认模型辅助工具、实时 provider
- OpenRouter：provider 构建器以及 boot/config 辅助工具

如果某个辅助工具只在一个内置 provider 包内部有用，请将它保留在该包根级别的导出面上，而不是将它提升到 `openclaw/plugin-sdk/*` 中。

一些生成的 `openclaw/plugin-sdk/<bundled-id>` 辅助导出面仍然存在，用于在其文档说明所有者用法时维护内置插件。请将这些视为保留接口，而不是新第三方插件的默认模式。

## 提交前检查清单

<Check>**package.json** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.json** 清单文件存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用聚焦的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自导入</Check>
<Check>测试通过（`pnpm test -- <bundled-plugin-root>/my-plugin/`）</Check>
<Check>`pnpm check` 通过（适用于仓库内插件）</Check>

## Beta 版本测试

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 发布标签，并通过 `Watch` > `Releases` 订阅。Beta 标签看起来像 `v2026.3.N-beta.1`。你也可以为 OpenClaw 官方 X 账号 [@openclaw](https://x.com/openclaw) 启用通知，以便及时获知发布公告。
2. 一旦出现 beta 标签，立即用它测试你的插件。正式版发布前的窗口通常只有几个小时。
3. 测试完成后，在你插件的 `plugin-forum` Discord 主题中回复 `all good`，或说明出现了什么问题。如果你还没有主题，请创建一个。
4. 如果存在问题，请创建或更新一个标题为 `Beta blocker: <plugin-name> - <summary>` 的 issue，并添加 `beta-blocker` 标签。将该 issue 链接放到你的主题中。
5. 针对 `main` 创建一个标题为 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，并在 PR 和你的 Discord 主题中都附上 issue 链接。贡献者不能给 PR 添加标签，因此标题是维护者和自动化识别 PR 侧信号的方式。有 PR 的 blocker 会被合并；没有 PR 的 blocker 仍然可能随版本发布。维护者会在 beta 测试期间关注这些主题。
6. 沉默即表示通过。如果你错过了这个窗口，你的修复很可能会在下一个周期才落地。

## 后续步骤

<CardGroup cols={2}>
  <Card title="Channel 插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    构建消息通道插件
  </Card>
  <Card title="Provider 插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    构建模型 provider 插件
  </Card>
  <Card title="CLI 后端插件" icon="terminal" href="/plugins/cli-backend-plugins">
    注册本地 AI CLI 后端
  </Card>
  <Card title="SDK 概览" icon="book-open" href="/plugins/sdk-overview">
    导入映射和注册 API 参考
  </Card>
  <Card title="运行时辅助工具" icon="settings" href="/plugins/sdk-runtime">
    通过 api.runtime 使用 TTS、搜索和子代理
  </Card>
  <Card title="测试" icon="test-tubes" href="/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="插件清单" icon="file-json" href="/plugins/manifest">
    完整的清单 schema 参考
  </Card>
</CardGroup>

## 另请参阅

- [插件架构](/plugins/architecture) - 内部架构深度解析
- [SDK 概览](/plugins/sdk-overview) - 插件 SDK 参考
- [清单](/plugins/manifest) - 插件清单格式
- [通道插件](/plugins/sdk-channel-plugins) - 构建通道插件
- [Provider 插件](/plugins/sdk-provider-plugins) - 构建 provider 插件
