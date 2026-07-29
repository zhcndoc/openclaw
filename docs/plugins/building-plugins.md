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

- Node 22.22.3+、Node 24.15+ 或 Node 25.9+，以及 `npm` 或 `pnpm`。
- TypeScript ESM 模块。
- 对于仓库内打包插件开发，克隆仓库并运行 `pnpm install`。
  源码检出插件开发仅支持 pnpm，因为 OpenClaw 会从 `extensions/*` 工作区包中发现
  已打包的插件。

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
最短且实用的插件形态，涵盖包、清单、入口点和
本地验证。

<Steps>
  <Step title="创建包元数据">
    <CodeGroup>

```json package.json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typebox": "1.1.39"
  },
  "peerDependencies": {
    "openclaw": ">=2026.3.24-beta.2"
  },
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

    每个插件都需要一个清单，即使没有配置也一样。运行时工具必须
    出现在 `contracts.tools` 中，这样 OpenClaw 才能在不急于加载所有插件运行时的情况下发现所有权。
    请有意设置 `activation.onStartup`；此示例会在 Gateway 启动时加载。

    受宿主信任的插件能力同样由清单门控，并且对已安装插件需要显式声明：
    `api.registerAgentToolResultMiddleware(...)`
    需要在 `contracts.agentToolResultMiddleware` 中列出每个目标运行时，
    而 `api.registerTrustedToolPolicy(...)` 需要在
    `contracts.trustedToolPolicies` 中列出每个策略 ID。这些声明使安装时检查与运行时注册保持一致。

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
          outputSchema: Type.Object(
            { input: Type.String() },
            { additionalProperties: false },
          ),
          async execute(_id, params) {
            const details = { input: params.input };
            return {
              content: [{ type: "text", text: `Got: ${params.input}` }],
              details,
            };
          },
        });
      },
    });
    ```

    对于非通道插件，请使用 `definePluginEntry`。通道插件则应改用
    `openclaw/plugin-sdk/core` 中的 `defineChannelPluginEntry`。

  </Step>

  <Step title="测试运行时">
    对于已安装或外部插件，请检查加载后的运行时：

    ```bash
    openclaw plugins inspect my-plugin --runtime --json
    ```

    如果插件注册了 CLI 命令，也请运行该命令并确认
    输出，例如 `openclaw demo-plugin ping`。

    对于本仓库中的打包插件，OpenClaw 会从 `extensions/*` 工作区中发现源码检出的
    插件包。运行最接近的定向测试：

    ```bash
    pnpm test extensions/my-plugin/
    pnpm check
    ```

  </Step>

  <Step title="测试包安装">
    在发布一个可直接打包的插件之前，请测试与用户将获得的相同安装形态。
    首先添加构建步骤，将诸如
    `openclaw.extensions` 之类的运行时入口指向构建后的 JavaScript，例如 `./dist/index.js`，并确保
    `npm pack` 会包含该 `dist/` 输出。TypeScript 源文件入口仅适用于源码检出和本地开发路径。

    然后打包插件，并使用 `npm-pack:` 安装 tarball：

    ```bash
    npm pack --pack-destination /tmp
    openclaw plugins install npm-pack:/tmp/<plugin-package>.tgz --force
    openclaw plugins inspect my-plugin --runtime --json
    ```

    `npm-pack:` 使用的是 OpenClaw 为每个插件托管的 npm 项目，因此它能发现
    源码检出测试可能隐藏的运行时依赖错误。它验证的是
    包和依赖形态，而不是目录链接的官方信任。
    运行时导入必须放在 `dependencies` 或 `optionalDependencies` 中；
    仅放在 `devDependencies` 里的依赖不会被安装到托管运行时项目中。

    不要把原始归档/路径安装作为官方或特权插件行为的最终验证。
    原始源码适合本地调试，但它不能证明与 npm 或 ClawHub 安装相同的依赖路径。
    如果你的插件依赖受信任的官方插件状态，请通过一个基于目录的官方安装，
    或一个记录官方信任的已发布包路径，再补充第二个验证。
    有关安装根和依赖所有权的详细信息，请参见
    [插件依赖解析](/plugins/dependency-resolution)。

  </Step>

  <Step title="发布">
    在发布前验证包：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    ```

    规范的 ClawHub 包片段位于 `docs/snippets/plugin-publish/`。

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

工具可以是必需的或可选的。必需工具在插件启用时始终可用。
可选工具则需要用户显式选择启用后，OpenClaw 才会加载其所属插件的运行时。

工具工厂会接收受信任的运行时上下文，包括 `deliveryContext`、
可用时当前平台对话的 `nativeChannelId`，以及 `requesterSenderId`。

```typescript
register(api) {
  api.registerTool(
    {
      name: "workflow_tool",
      description: "运行一个工作流",
      parameters: Type.Object({ pipeline: Type.String() }),
      outputSchema: Type.Object(
        { pipeline: Type.String() },
        { additionalProperties: false },
      ),
      async execute(_id, params) {
        return {
          content: [{ type: "text", text: params.pipeline }],
          details: { pipeline: params.pipeline },
        };
      },
    },
    { optional: true },
  );
}
```

`outputSchema` is optional. It describes the structured `details` value used by
[Code Mode](/tools/code-mode) and [Tool Search](/tools/tool-search). Catalog
calls reject invalid schemas before execution and validate the final value after
tool hooks. Omit it for tools without a stable JSON result. See
[Tool plugins](/plugins/tool-plugins#output-contracts) for the full contract.

Every tool registered with `api.registerTool(...)` must also be declared in the
plugin manifest:

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
  tools: { allow: ["workflow_tool"] }, // 或 ["my-plugin"]，表示启用该插件的所有工具
}
```

可选工具用于控制哪些工具对模型可见。当工具
或 hook 应在模型选择之后、动作执行之前请求批准时，请使用
[插件权限请求](/plugins/plugin-permission-requests)。

将可选工具用于副作用、非常规二进制文件，或默认情况下
不应暴露的能力。工具名称不得与核心工具名称冲突；发生冲突时会被跳过并在插件诊断中报告。
格式错误的注册也会以相同方式被跳过并报告：缺少非空的
`name`、`execute` 不是函数，或工具描述符缺少
`parameters` 对象。

工具工厂会接收一个运行时提供的上下文对象。当工具需要记录、展示或
根据当前轮次的活动模型进行适配时，请使用 `ctx.activeModel`；
它可能包含 `provider`、`modelId` 和 `modelRef`。
请将其视为信息性的运行时元数据，而不是针对本地操作员、已安装插件代码或被修改的 OpenClaw 运行时的安全边界。
敏感的本地工具仍应要求显式的插件或操作员选择启用，
并在缺少活动模型元数据或其不合适时安全失败。

清单负责声明所有权和发现；执行时仍会调用实际已注册的工具实现。
请将 `toolMetadata.<tool>.optional: true` 与 `api.registerTool(..., { optional: true })`
保持一致，这样 OpenClaw 才能在该工具未被显式允许列表收录前避免加载该插件运行时。

## 导入约定

从聚焦的 SDK 子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
```

Within your plugin package, use local barrel files such as `api.ts` and
`runtime-api.ts` for internal imports. Do not import your own plugin through an
SDK path. Provider-specific helpers should stay in the provider package unless
the seam is truly generic.

自定义 Gateway RPC 方法是高级入口点。为它们保留插件专用前缀；核心管理命名空间如 `config.*`、
`exec.approvals.*`、`operator.admin.*`、`wizard.*` 和 `update.*` 是保留的，
并会解析到 `operator.admin`。`openclaw/plugin-sdk/gateway-method-runtime`
桥接仅适用于声明了 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的插件 HTTP 路由。

请参阅 [插件 SDK 概览](/plugins/sdk-overview) 中的完整导入映射。

OpenClaw SDK compatibility fields carry TypeScript `@deprecated` annotations,
which editors surface as migration warnings. To enforce them at build time,
enable a type-aware rule such as
[`@typescript-eslint/no-deprecated`](https://typescript-eslint.io/rules/no-deprecated/).
Oxlint is not type-aware, so it cannot enforce these annotations.

## Pre-submission checklist

<Check>**package.json** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.json** 清单文件已存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用精确的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自身导入</Check>
<Check>测试通过（`pnpm test <bundled-plugin-root>/my-plugin/`）</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## 测试 beta 版本

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 的发布（`Watch` > `Releases`）。Beta 标签看起来像 `v2026.3.N-beta.1`。你也可以在 X 上关注 [@openclaw](https://x.com/openclaw) 以获取发布公告。
2. 一旦 beta 标签出现，立即用它测试你的插件。稳定版前的窗口通常只有几个小时。
3. 测试后，在 `plugin-forum` Discord 频道（[discord.gg/clawd](https://discord.gg/clawd)）里你插件对应的线程中发帖，内容可以是 `all good` 或者说明哪里坏了。如果你还没有线程，请创建一个。
4. 如果有东西坏了，打开或更新一个标题为 `Beta blocker: <plugin-name> - <summary>` 的 issue，并添加 `beta-blocker` 标签。在你的线程中链接该 issue。
5. 向 `main` 提交一个 PR，标题为 `fix(<plugin-id>): beta blocker - <summary>`，并在 PR 和你的 Discord 线程中都链接该 issue。贡献者不能给 PR 添加标签，所以标题是面向维护者和自动化系统的 PR 侧信号。带有 PR 的阻塞问题会被合并；没有 PR 的阻塞问题也可能仍然发布。
6. 沉默就表示通过。错过时间窗口通常意味着你的修复会在下一个周期生效。

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
