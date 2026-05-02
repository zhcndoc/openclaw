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

你不需要把插件添加到 OpenClaw 仓库中。发布到
[ClawHub](/tools/clawhub)，用户通过
`openclaw plugins install <package-name>` 安装。OpenClaw 会先尝试 ClawHub，
如果包仍然使用 npm 分发，则会自动回退到 npm。

## 前提条件

- Node >= 22 以及一个包管理器（npm 或 pnpm）
- 熟悉 TypeScript（ESM）
- 对于仓库内插件：已克隆仓库并完成 `pnpm install`

## 这是什么类型的插件？

<CardGroup cols={3}>
  <Card title="Channel 插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到一个消息平台（Discord、IRC 等）
  </Card>
  <Card title="Provider 插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    添加一个模型提供方（LLM、代理或自定义端点）
  </Card>
  <Card title="工具 / hook 插件" icon="wrench" href="/plugins/hooks">
    注册 agent 工具、事件 hooks 或服务 — 继续阅读下文
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
      "description": "为 OpenClaw 添加一个自定义工具",
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

    每个插件都需要一个清单，即使没有配置；并且每个插件都应该有意地声明 `activation.onStartup`。
    运行时注册的工具需要在启动时导入，所以这个示例将其设为 `true`。
    完整 schema 请参见 [Manifest](/plugins/manifest)。规范的 ClawHub 发布片段位于
    `docs/snippets/plugin-publish/` 中。

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

    `definePluginEntry` 用于非 channel 插件。对于 channels，请使用
    `defineChannelPluginEntry` — 参见 [Channel Plugins](/plugins/sdk-channel-plugins)。
    关于完整的入口点选项，请参见 [Entry Points](/plugins/sdk-entrypoints)。

  </Step>

  <Step title="测试并发布">

    **外部插件：** 使用 ClawHub 验证并发布，然后安装：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    对于像 `@myorg/openclaw-my-plugin` 这样的裸包规格，OpenClaw 也会在 npm 之前先检查 ClawHub；
    对于尚未迁移到 ClawHub 的包，npm 仍然作为回退方案。

    **仓库内插件：** 放置在捆绑插件工作区树下 — 会自动被发现。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件能力

单个插件可以通过 `api` 对象注册任意数量的能力：

| 能力                     | 注册方法                                         | 详细指南                                                                       |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| 文本推理（LLM）          | `api.registerProvider(...)`                      | [Provider Plugins](/plugins/sdk-provider-plugins)                              |
| CLI 推理后端             | `api.registerCliBackend(...)`                    | [CLI Backends](/gateway/cli-backends)                                          |
| Channel / 消息            | `api.registerChannel(...)`                       | [Channel Plugins](/plugins/sdk-channel-plugins)                                |
| Speech（TTS/STT）        | `api.registerSpeechProvider(...)`                | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时转录                 | `api.registerRealtimeTranscriptionProvider(...)` | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时语音                 | `api.registerRealtimeVoiceProvider(...)`         | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解                 | `api.registerMediaUnderstandingProvider(...)`    | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成                 | `api.registerImageGenerationProvider(...)`       | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音乐生成                 | `api.registerMusicGenerationProvider(...)`       | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 视频生成                 | `api.registerVideoGenerationProvider(...)`       | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网页抓取                 | `api.registerWebFetchProvider(...)`              | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网页搜索                 | `api.registerWebSearchProvider(...)`             | [Provider Plugins](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 工具结果中间件           | `api.registerAgentToolResultMiddleware(...)`     | [SDK Overview](/plugins/sdk-overview#registration-api)                         |
| Agent 工具               | `api.registerTool(...)`                          | 下方                                                                           |
| 自定义命令               | `api.registerCommand(...)`                       | [Entry Points](/plugins/sdk-entrypoints)                                       |
| 插件 hooks               | `api.on(...)`                                    | [Plugin hooks](/plugins/hooks)                                                 |
| 内部事件 hooks           | `api.registerHook(...)`                          | [Entry Points](/plugins/sdk-entrypoints)                                       |
| HTTP 路由                | `api.registerHttpRoute(...)`                     | [Internals](/plugins/architecture-internals#gateway-http-routes)               |
| CLI 子命令               | `api.registerCli(...)`                           | [Entry Points](/plugins/sdk-entrypoints)                                       |

关于完整的注册 API，请参见 [SDK Overview](/plugins/sdk-overview#registration-api)。

捆绑插件在需要模型看到输出之前先进行异步工具结果重写时，可以使用 `api.registerAgentToolResultMiddleware(...)`。
请在 `contracts.agentToolResultMiddleware` 中声明目标运行时，例如 `["pi", "codex"]`。
这是一个受信任的捆绑插件接入点；除非 OpenClaw 为此能力增加明确的信任策略，否则外部插件应优先使用常规的 OpenClaw 插件 hooks。

如果你的插件注册自定义 gateway RPC 方法，请将它们放在插件专用前缀下。
核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持保留状态，并且始终解析为 `operator.admin`，即使某个插件要求更窄的作用域也是如此。

需要记住的 hook 守卫语义：

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
  // 必需工具 — 始终可用
  api.registerTool({
    name: "my_tool",
    description: "做一件事",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // 可选工具 — 用户必须添加到允许列表
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

Always import from the focused `openclaw/plugin-sdk/<subpath>` paths:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root path (deprecated and will be removed)
import { ... } from "openclaw/plugin-sdk";
```

For the full subpath reference, see the [SDK overview](/plugins/sdk-overview).

Inside your plugin, use local barrel files (`api.ts`, `runtime-api.ts`) for
internal imports—do not import your own plugin via its SDK path.

For provider plugins, keep provider-specific helpers in those package-root
barrels unless the interface is genuinely generic. Current bundled examples
include:

- Anthropic: Claude stream wrappers and `service_tier` / beta helpers
- OpenAI: provider builders, default model helpers, realtime providers
- OpenRouter: provider builders and boot/config helpers

If a helper is only useful inside one bundled provider package, keep it on that
package-root surface instead of promoting it into `openclaw/plugin-sdk/*`.

Some generated `openclaw/plugin-sdk/<bundled-id>` helper surfaces still exist
for bundled plugin maintenance when they document owner usage. Treat those as
reserved interfaces, not the default pattern for new third-party plugins.

## Pre-submit checklist

<Check>**package.json** has the correct `openclaw` metadata</Check>
<Check>**openclaw.plugin.json** manifest exists and is valid</Check>
<Check>Entry points use `defineChannelPluginEntry` or `definePluginEntry`</Check>
<Check>All imports use focused `plugin-sdk/<subpath>` paths</Check>
<Check>Internal imports use local modules, not SDK self-imports</Check>
<Check>Tests pass (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` passes (for in-repo plugins)</Check>

## Beta release testing

1. Watch GitHub release tags on [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) and subscribe via `Watch` > `Releases`. Beta tags look like `v2026.3.N-beta.1`. You can also enable notifications for the official OpenClaw X account [@openclaw](https://x.com/openclaw) to catch release announcements.
2. As soon as a beta tag appears, test your plugin against it immediately. The window before stable is often only a few hours.
3. After testing, reply in your plugin’s `plugin-forum` Discord thread with `all good` or describe what broke. If you do not have a thread yet, create one.
4. If there is a problem, open or update an issue titled `Beta blocker: <plugin-name> - <summary>` and add the `beta-blocker` label. Put the issue link in your thread.
5. Create a PR against `main` titled `fix(<plugin-id>): beta blocker - <summary>` and include the issue link in both the PR and your Discord thread. Contributors cannot label PRs, so the title is how maintainers and automation recognize PR-side signals. Blockers with PRs will be merged; blockers without PRs may still ship. Maintainers watch those threads during beta testing.
6. Silence means pass. If you miss the window, your fix will likely land in the next cycle.

## Next steps

<CardGroup cols={2}>
  <Card title="Channel plugins" icon="messages-square" href="/plugins/sdk-channel-plugins">
    Build a message channel plugin
  </Card>
  <Card title="Provider plugins" icon="cpu" href="/plugins/sdk-provider-plugins">
    Build a model provider plugin
  </Card>
  <Card title="SDK overview" icon="book-open" href="/plugins/sdk-overview">
    Import map and registration API reference
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/plugins/sdk-runtime">
    TTS, search, and sub-agents via api.runtime
  </Card>
  <Card title="Testing" icon="test-tubes" href="/plugins/sdk-testing">
    Testing tools and patterns
  </Card>
  <Card title="Plugin manifest" icon="file-json" href="/plugins/manifest">
    Full manifest schema reference
  </Card>
</CardGroup>

## See also

- [Plugin architecture](/plugins/architecture) — Deep dive into the internal architecture
- [SDK overview](/plugins/sdk-overview) — Plugin SDK reference
- [Manifest](/plugins/manifest) — Plugin manifest format
- [Channel plugins](/plugins/sdk-channel-plugins) — Build channel plugins
- [Provider plugins](/plugins/sdk-provider-plugins) — Build provider plugins
