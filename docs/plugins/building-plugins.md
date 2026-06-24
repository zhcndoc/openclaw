---
summary: "在几分钟内创建你的第一个 OpenClaw 插件"
title: "构建插件"
sidebarTitle: "入门"
doc-schema-version: 1
read_when:
  - 你想创建一个新的 OpenClaw 插件
  - 你需要插件开发的快速入门
  - 你正在在 channel、provider、CLI backend、tool 或 hook 文档之间做选择
---

插件可以在不修改核心的情况下扩展 OpenClaw。插件可以添加消息
通道、模型提供方、本地 CLI 后端、代理工具、hook、媒体提供方，
或其他插件拥有的能力。

你不需要将外部插件添加到 OpenClaw 仓库中。将该包发布到
[ClawHub](/clawhub)，用户可以通过以下方式安装：

```bash
openclaw plugins install clawhub:<package-name>
```

在发布切换期间，裸包规范仍会从 npm 安装。需要 ClawHub 解析时请使用
`clawhub:` 前缀。

## 要求

- 使用 Node 22.19 或更高版本，以及 `npm` 或 `pnpm` 之类的包管理器。
- 熟悉 TypeScript ESM 模块。
- 对于仓库内打包插件开发，请克隆仓库并运行 `pnpm install`。
  源码检出的插件开发仅支持 pnpm，因为 OpenClaw 会从
  `extensions/*` 工作区包加载打包后的插件。

## 选择插件形态

<CardGroup cols={2}>
  <Card title="Channel plugin" icon="messages-square" href="/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到消息平台。
  </Card>
  <Card title="Provider plugin" icon="cpu" href="/plugins/sdk-provider-plugins">
    添加模型、媒体、搜索、获取、语音或实时提供方。
  </Card>
  <Card title="CLI backend plugin" icon="terminal" href="/plugins/cli-backend-plugins">
    通过 OpenClaw 模型回退运行本地 AI CLI。
  </Card>
  <Card title="Tool plugin" icon="wrench" href="/plugins/tool-plugins">
    注册代理工具。
  </Card>
</CardGroup>

## 快速开始

通过注册一个必需的代理工具来构建一个最小工具插件。这是
最短且有用的插件形态，并展示了包、清单、入口点和
本地验证。

<Steps>
  <Step title="创建包元数据">
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

    已发布的外部插件应将运行时入口指向构建后的 JavaScript
    文件。有关完整的入口点契约，请参见 [SDK 入口点](/plugins/sdk-entrypoints)。

    每个插件都需要一个清单，即使它没有配置。运行时工具
    必须出现在 `contracts.tools` 中，这样 OpenClaw 才能在不急于加载所有插件运行时的情况下发现其归属。请有意设置 `activation.onStartup`。
    此示例会在 Gateway 启动时启动。

    Host-trusted plugin surfaces 也受清单门控，并且需要对已安装插件显式启用。如果已安装插件注册了
    `api.registerAgentToolResultMiddleware(...)`，请在
    `contracts.agentToolResultMiddleware` 中声明每个目标运行时。如果它注册了
    `api.registerTrustedToolPolicy(...)`，请在
    `contracts.trustedToolPolicies` 中声明每个策略 id。这些声明可使安装时检查与运行时注册保持一致。

    每个清单字段的说明请参见 [插件清单](/plugins/manifest)。

  </Step>

  <Step title="注册工具">
    ```typescript index.ts
    import { Type } from "typebox";
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

    export default definePluginEntry({
      id: "my-plugin",
      name: "我的插件",
      description: "为 OpenClaw 添加一个自定义工具",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "回显一个输入值",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return {
              content: [{ type: "text", text: `Got: ${params.input}` }],
            };
          },
        });
      },
    });
    ```

    非 channel 插件使用 `definePluginEntry`。channel 插件使用
    `defineChannelPluginEntry`。

  </Step>

  <Step title="测试运行时">
    对于已安装或外部插件，请检查加载后的运行时：

    ```bash
    openclaw plugins inspect my-plugin --runtime --json
    ```

    如果插件注册了 CLI 命令，也请运行该命令。例如，
    一个演示命令应具有类似
    `openclaw demo-plugin ping` 的执行证明。

    对于本仓库中的打包插件，OpenClaw 会从 `extensions/*` 工作区中发现源码检出的
    插件包。运行最接近的定向测试：

    ```bash
    pnpm test -- extensions/my-plugin/
    pnpm check
    ```

  </Step>

  <Step title="发布">
    发布前请验证包：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    ```

    规范的 ClawHub 示例片段位于 `docs/snippets/plugin-publish/`。

  </Step>

  <Step title="安装">
    通过 ClawHub 安装已发布的包：

    ```bash
    openclaw plugins install clawhub:your-org/your-plugin
    ```

  </Step>
</Steps>

<a id="registering-agent-tools"></a>

## 注册工具

工具可以是必需的或可选的。启用插件时，必需工具始终可用。
可选工具需要用户选择启用。

```typescript
register(api) {
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

使用 `api.registerTool(...)` 注册的每个工具也必须在插件清单中声明：

```json
{
  "contracts": {
    "tools": ["workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

用户通过 `tools.allow` 进行选择启用：

```json5
{
  tools: { allow: ["workflow_tool"] }, // 或 ["my-plugin"]，用于启用某个插件的全部工具
}
```

可选工具控制工具是否对模型可见。当工具
或 hook 应在模型选择后、动作执行前请求批准时，请使用
[插件权限请求](/plugins/plugin-permission-requests)。

对于副作用、非常规二进制文件或不应默认暴露的能力，请使用可选工具。
工具名称不得与核心工具冲突；冲突会被跳过并在插件诊断中报告。
格式错误的注册，包括缺少 `parameters` 的工具描述符，也会以同样方式被跳过并报告。
已注册的工具是模型在策略和允许列表检查通过后可以调用的类型化函数。

工具工厂会接收一个运行时提供的上下文对象。当工具需要记录、显示或根据当前轮次的活动模型进行适配时，请使用 `ctx.activeModel`。
该对象可能包含 `provider`、`modelId` 和 `modelRef`。
请将其视为信息性的运行时元数据，而不是对本地操作员、已安装插件代码或被修改过的 OpenClaw 运行时的安全边界。
敏感的本地工具仍应要求明确的插件或操作员选择启用，并在缺少活动模型元数据或其不合适时安全失败。

清单负责声明所有权和发现；执行时仍会调用实际已注册的工具实现。
请将 `toolMetadata.<tool>.optional: true` 与 `api.registerTool(..., { optional: true })`
保持一致，这样 OpenClaw 才能在该工具未被显式允许列表收录前避免加载该插件运行时。

## 导入约定

从聚焦的 SDK 子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
```

不要从已弃用的根 barrel 导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk";
```

在你的插件包内，内部导入请使用本地 barrel 文件，例如 `api.ts` 和
`runtime-api.ts`。不要通过 SDK 路径导入你自己的插件。特定于 provider 的辅助函数应保留在 provider 包中，除非该边界确实是通用的。

自定义 Gateway RPC 方法是高级入口点。请为其保留插件专用前缀；像 `config.*`、
`exec.approvals.*`、`operator.admin.*`、`wizard.*` 和 `update.*` 这样的核心管理命名空间保持保留，
并解析到 `operator.admin`。`openclaw/plugin-sdk/gateway-method-runtime`
桥接仅保留给声明了 `contracts.gatewayMethodDispatch: ["authenticated-request"]`
的插件 HTTP 路由。

完整导入映射请参见 [Plugin SDK 概览](/plugins/sdk-overview)。

## 提交前检查清单

<Check>**package.json** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.json** 清单文件存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用聚焦的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自导入</Check>
<Check>测试通过（`pnpm test -- <bundled-plugin-root>/my-plugin/`）</Check>
<Check>`pnpm check` 通过（适用于仓库内插件）</Check>

## 测试 beta 版本

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

- [插件钩子](/plugins/hooks)
- [插件架构](/plugins/architecture)
