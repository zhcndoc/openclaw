---
summary: "在几分钟内创建你的第一个 OpenClaw 插件"
title: "构建插件"
sidebarTitle: "入门"
doc-schema-version: 1
read_when:
  - "你想创建一个新的 OpenClaw 插件"
  - "你需要插件开发的快速入门"
  - "你正在在 channel、provider、CLI backend、tool 或 hook 文档之间做选择"
---

插件可以在不修改核心的情况下扩展 OpenClaw。插件可以添加消息通道、模型提供方、本地 CLI 后端、代理工具、hook、媒体提供方， 或其他插件拥有的能力。

你不需要将外部插件添加到 OpenClaw 仓库中。将该包发布到 [ClawHub](/clawhub)，用户可以通过以下方式安装：

```bash
openclaw plugins install clawhub:<package-name>
```

裸包规格从 npm 安装。当您需要 ClawHub 分辨率时，请使用 `clawhub:` 前缀。

## <a id="requirements"></a> 要求

- 所有插件 API 均为 [ 实验性 ](/plugins/sdk-overview#api-stability)。固定您的 OpenClaw 主机版本并测试您声明兼容的每个版本。
- Node 24.16+或Node 26.1+，以及`npm`或`pnpm`。
- TypeScript ESM 模块。
- 对于仓库内捆绑插件工作，克隆存储库并运行 `pnpm install`。源检查插件开发仅是 pnpm-，因为 OpenClaw 从 `extensions/*` 工作区包中发现捆绑的插件。

## <a id="choose-the-plugin-shape"></a> 选择插件形态

<CardGroup cols={2}>
  <Card title="频道插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到消息平台。
  </Card>
  <Card title="提供方插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    添加模型、媒体、搜索、获取、语音或实时提供方。
  </Card>
  <Card title="CLI 后端插件" icon="terminal" href="/plugins/cli-backend-plugins">
    通过 OpenClaw 模型回退运行本地 AI CLI。
  </Card>
  <Card title="工具插件" icon="wrench" href="/plugins/tool-plugins">
    注册代理工具。
  </Card>
  <Card title="功能插件" icon="panels-top-left" href="/plugins/feature-plugins">
    构建类型化操作、本机页面和 Control UI 替换。
  </Card>
</CardGroup>

## <a id="quickstart"></a> 快速开始

通过注册一个必需的代理工具来构建一个最小工具插件。这是最短且实用的插件形态，涵盖包、清单、入口点和本地验证。

<Steps>
  <Step id="create-package-metadata" title="创建包元数据">
    <CodeGroup>

```json package.json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typebox": "1.3.36"
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
  "name": "My Plugin",
  "description": "Adds a custom tool to OpenClaw",
  "categories": ["other"],
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

    已发布的外部插件应将运行时入口指向构建后的 JavaScript 文件。有关完整的入口点契约，请参见 [SDK 入口点](/plugins/sdk-entrypoints)。

    选择一个 [ 目录类别](/plugins/manifest#catalog-categories) 作为插件的主要用户用途。此通用示例使用 `other`；日历插件将使用 `scheduling`，编码助手将使用 `developer-tools`，代理执行后端将使用 `agent-runtimes`。

    每个插件都需要一个清单，即使没有配置也一样。运行时工具必须出现在 `contracts.tools` 中，这样 OpenClaw 才能在不急于加载所有插件运行时的情况下发现所有权。 请有意设置 `activation.onStartup`；此示例会在 Gateway 启动时加载。

    主机信任的插件表面也是清单门控的，并且需要对已安装的插件进行显式声明：`api.registerAgentToolResultMiddleware(...)` 需要 `contracts.agentToolResultMiddleware` 中列出的每个目标运行时，而 `api.registerTrustedToolPolicy(...)` 需要 `contracts.trustedToolPolicies` 中的每个策略 ID。这些声明使安装时检查和运行时注册保持一致。

    每个清单字段的说明请参见 [插件清单](/plugins/manifest)。

  </Step>

  <Step id="register-the-tool" title="注册工具">
    ```typescript index.ts
    import { Type } from "typebox";
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Echo one input value",
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

    对于非通道插件使用 `definePluginEntry`。通道插件使用 `openclaw/plugin-sdk/core` 中的 `defineChannelPluginEntry` 代替。

  </Step>

  <Step id="test-the-runtime" title="测试运行时间">
    对于已安装或外部插件，请检查加载后的运行时：

    ```bash
    openclaw plugins inspect my-plugin --runtime --json
    ```

    如果插件注册了 CLI 命令，也请运行该命令并确认输出，例如 `openclaw demo-plugin ping`。

    对于本仓库中的打包插件，OpenClaw 会从 `extensions/*` 工作区中发现源码检出的插件包。运行最接近的定向测试：

    ```bash
    pnpm test extensions/my-plugin/
    pnpm check
    ```

  </Step>

  <Step id="test-the-package-install" title="测试包安装">
    在发布一个可直接打包的插件之前，请测试与用户将获得的相同安装形态。 首先添加构建步骤，将诸如 `openclaw.extensions` 之类的运行时入口指向构建后的 JavaScript，例如 `./dist/index.js`，并确保 `npm pack` 会包含该 `dist/` 输出。TypeScript 源文件入口仅适用于源码检出和本地开发路径。

    插件构建可以使用 TypeScript 7. OpenClaw 加载发出的 JavaScript；本地 TypeScript 源条目使用 OpenClaw 的运行时转换器，不需要插件来安装 TypeScript 编译器。

    然后打包插件，并使用 `npm-pack:` 安装 tarball：

    ```bash
    npm pack --pack-destination /tmp
    openclaw plugins install npm-pack:/tmp/<plugin-package>.tgz --force
    openclaw plugins inspect my-plugin --runtime --json
    ```

    `npm-pack:` 使用的是 OpenClaw 为每个插件托管的 npm 项目，因此它能发现源码检出测试可能隐藏的运行时依赖错误。它验证的是包和依赖形态，而不是目录链接的官方信任。 运行时导入必须放在 `dependencies` 或 `optionalDependencies` 中； 仅放在 `devDependencies` 里的依赖不会被安装到托管运行时项目中。

    请勿使用原始 archive/path 安装作为官方或特权插件行为的最终证明。原始源对于本地调试很有用，但它们不能证明与 npm 或 ClawHub 安装相同的依赖路径。如果您的插件依赖于受信任的官方插件状态，请通过目录支持的官方安装或记录官方信任的已发布包路径添加第二个证明。有关安装根目录和依赖项所有权的详细信息，请参阅 [Plugin 依赖项解析](/plugins/dependency-resolution)。

  </Step>

  <Step id="publish" title="发布">
    发布使用单独的 `clawhub` CLI。首先安装并登录，然后在发布之前验证包：

    ```bash
    npm i -g clawhub
    clawhub login
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    ```

    共享的 ClawHub 软件包片段位于 `docs/snippets/plugin-publish/` 中。

  </Step>

  <Step id="install" title="安装">
    通过 ClawHub 安装已发布的包：

    ```bash
    openclaw plugins install clawhub:your-org/your-plugin
    ```

  </Step>
</Steps>

## <a id="add-plugin-artwork"></a> 添加插件图稿

为目录、设置和安装卡中的插件标识提供 `assets/icon.png`。使用单独的单色 `assets/activity.svg` 在聊天中进行紧凑的工具调用。检查浅色和深色主题中 16 像素的活动形状；避免标记后面出现实心方块。

一个活动图标覆盖了该插件。仅针对需要独特形状的工具添加 `assets/activity/<tool-name>.svg`，并使用其确切的 `tools.effective` ID。将资产包含在您发布的包中，并使用 `npm pack --dry-run` 验证它们的存在。请参阅 [ 活动图标合约 ](/plugins/manifest/surfaces#inline-activity-icons) 以了解受支持的 SVG 几何形状、大小边界和回退行为。

<a id="registering-agent-tools"></a>

## <a id="registering-tools"></a> 注册工具

工具可以是必需的或可选的。必需工具在插件启用时始终可用。 可选工具则需要用户显式选择启用后，OpenClaw 才会加载其所属插件的运行时。

工具工厂接收可信运行时上下文，包括 `deliveryContext`、用于活动平台对话（如果可用）的 `nativeChannelId` 以及 `requesterSenderId`。工厂可以使用 `toolContext.delivery?.send({ text, mediaUrl })` 将文本或媒体发送到当前对话。该属性在活动频道轮次之外或频道使用网关拥有的传送时不可用。 OpenClaw 绑定路由、账户、线程、媒体访问策略；该能力在回合结束时失效。

```typescript
register(api) {
  api.registerTool(
    (toolContext) => ({
      name: "workflow_tool",
      description: "Run a workflow",
      parameters: Type.Object({ pipeline: Type.String() }),
      outputSchema: Type.Object(
        { pipeline: Type.String() },
        { additionalProperties: false },
      ),
      async execute(_id, params) {
        await toolContext.delivery?.send({
          text: `Workflow started: ${params.pipeline}`,
        });
        return {
          content: [{ type: "text", text: params.pipeline }],
          details: { pipeline: params.pipeline },
        };
      },
    }),
    { name: "workflow_tool", optional: true },
  );
}
```

`outputSchema` 是可选的。它描述了 [Code Mode](/tools/code-mode) 和 [Tool Search](/tools/tool-search) 使用的结构化 `details` 值。目录调用在执行前拒绝无效模式，并在工具挂钩后验证最终值。对于没有稳定 JSON 结果的工具，请忽略它。完整合约请参见 [ 工具插件](/plugins/tool-plugins#output-contracts)。

当工具需要会话工作区时，在其注册选项中声明 `workspaceAccess`。当工厂读取工作文件时使用 `true`，或者忽略保留该安全默认值的选项。 OpenClaw 在调用这些工厂或启动模型之前完成工作区准备。当工厂仅构建定义并且在工具准备或执行期间访问工作文件时，请使用 `"execute"`。仅当工厂和执行都独立于会话工作区时才使用 `false`。这些显式声明让模型在结账继续的同时启动。普通工具对象默认为 `"execute"`，因为它们没有运行时工厂。 `defineToolPlugin` 在每个工具定义上接受相同的选项。

使用 `api.registerTool(...)` 注册的每个工具还必须在插件清单中声明：

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
  tools: { allow: ["workflow_tool"] }, // or ["my-plugin"] for every tool from one plugin
}
```

可选工具用于控制哪些工具对模型可见。当工具或 hook 应在模型选择之后、动作执行之前请求批准时，请使用 [插件权限请求](/plugins/plugin-permission-requests)。

`toolMetadata.<tool>.profiles` 将插件工具添加到指定的内置配置文件白名单中。例如，`"profiles": ["coding", "messaging"]` 在这些配置文件中公开它，而不添加核心目录条目。显式的运营商允许列表和拒绝规则仍然具有权威性。

将可选工具用于副作用、非常规二进制文件，或默认情况下不应暴露的能力。工具名称不得与核心工具名称冲突；发生冲突时会被跳过并在插件诊断中报告。 格式错误的注册也会以相同方式被跳过并报告：缺少非空的 `name`、`execute` 不是函数，或工具描述符缺少 `parameters` 对象。

工具工厂接收运行时提供的上下文对象。当工具需要记录、显示或适应当前回合的活动模型时，请使用 `ctx.activeModel`；它可以包括 `provider`、`modelId` 和 `modelRef`。将其视为信息运行时元数据，而不是针对本地操作员、安装的插件代码或修改的 OpenClaw 运行时的安全边界。敏感的本地工具仍应需要显式插件或操作员选择加入，并在活动模型元数据丢失或不合适时拒绝运行。

清单负责声明所有权和发现；执行时仍会调用实际已注册的工具实现。 请将 `toolMetadata.<tool>.optional: true` 与 `api.registerTool(..., { optional: true })` 保持一致，这样 OpenClaw 才能在该工具未被显式允许列表收录前避免加载该插件运行时。

## <a id="import-conventions"></a> 导入约定

从聚焦的 SDK 子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
```

在您的插件包中，使用本地桶文件（例如 `api.ts` 和 `runtime-api.ts`）进行内部导入。不要通过 SDK 路径导入您自己的插件。特定于提供程序的帮助程序应保留在提供程序包中，除非该接口确实是通用的。

自定义网关 RPC 方法是高级入口点。将它们保留在特定于插件的前缀上；核心管理命名空间（例如 `config.*`、`exec.approvals.*`、`operator.admin.*`、`wizard.*` 和 `update.*`）保持保留并解析为 `operator.admin`。 `openclaw/plugin-sdk/gateway-method-runtime` 桥保留用于经过身份验证的插件 HTTP 路由和声明 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的注册 RPC 处理程序。嵌套的 RPC 调度保留原始的经过身份验证的客户端、实时权限检查和请求拥有的取消信号。它仍然检查目标方法所需的范围，并在突变提交边界重新检查调用者权限；该合同从不提供合成客户或附加范围。

请参阅 [插件 SDK 概览](/plugins/sdk-overview) 中的完整导入映射。

OpenClaw SDK 兼容性字段带有 TypeScript `@deprecated` 注释，编辑器将其显示为迁移警告。要在构建时强制执行它们，请启用类型感知规则，例如 [`@typescript-eslint/no-deprecated`](https://typescript-eslint.io/rules/no-deprecated/)。 Oxlint 无法识别类型，因此它无法强制执行这些注释。

## <a id="pre-submission-checklist"></a> 预提交清单

<Check>**package.json** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.json** 清单文件已存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用精确的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自身导入</Check>
<Check>测试通过 （`pnpm test extensions/my-plugin/`）</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## <a id="test-against-beta-releases"></a> 测试 beta 版本

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 的发布（`Watch` > `Releases`）。Beta 标签看起来像 `v2026.3.N-beta.1`。你也可以在 X 上关注 [@openclaw](https://x.com/openclaw) 以获取发布公告。
2. 一旦 beta 标签出现，立即用它测试你的插件。稳定版前的窗口通常只有几个小时。
3. 测试后，在 `plugin-forum` Discord 频道（[discord.gg/clawd](https://discord.gg/clawd)）里你插件对应的线程中发帖，内容可以是 `all good` 或者说明哪里坏了。如果你还没有线程，请创建一个。
4. 如果有东西坏了，打开或更新一个标题为 `Beta blocker: <plugin-name> - <summary>` 的 issue，并添加 `beta-blocker` 标签。在你的线程中链接该 issue。
5. 打开一个标题为 `fix(<plugin-id>): beta blocker - <summary>` 的 PR 到 `main`，并将该问题链接到 PR 和您的 Discord 线程中。贡献者无法标记 PR，因此标题是针对维护人员和自动化的 PR-side 信号。带有 PR 的拦截器将被合并；无论如何，没有拦截器也可能会发货。
6. 沉默就表示通过。错过时间窗口通常意味着你的修复会在下一个周期生效。

## <a id="next-steps"></a> 下一步

<CardGroup cols={2}>
  <Card title="通道插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    构建消息通道插件
  </Card>
  <Card title="提供商插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    构建模型 provider 插件
  </Card>
  <Card title="CLI 后端插件" icon="terminal" href="/plugins/cli-backend-plugins">
    注册本地 AI CLI 后端
  </Card>
  <Card title="SDK概述" icon="book-open" href="/plugins/sdk-overview">
    导入映射和注册 API 参考
  </Card>
  <Card title="运行时助手" icon="settings" href="/plugins/sdk-runtime">
    TTS，搜索，通过 api.runtime 进行子代理
  </Card>
  <Card title="测试" icon="test-tubes" href="/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="插件清单" icon="file-json" href="/plugins/manifest">
    完整的清单 schema 参考
  </Card>
</CardGroup>

## <a id="related"></a> 相关内容

- [插件钩子](/plugins/hooks)
- [插件架构](/plugins/architecture)
- [插件架构内部](/plugins/architecture-internals)。
- [插件 SDK 子路径](/plugins/sdk-subpaths)
- [管理插件](/plugins/manage-plugins)
