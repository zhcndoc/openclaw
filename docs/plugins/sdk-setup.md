---
summary: "设置向导、setup-entry.ts、配置模式以及 package.json 元数据"
title: "插件设置与配置"
sidebarTitle: "设置与配置"
read_when:
  - 您正在为插件添加设置向导
  - 您需要了解 setup-entry.ts 与 index.ts 的区别
  - 您正在定义插件配置模式或 package.json openclaw 元数据
---

用于插件打包（`package.json` 元数据）、清单
（`openclaw.plugin.json`）、设置入口和配置模式的参考。

<Tip>
  **寻找逐步指南？** 操作指南涵盖了上下文中的打包内容：
  [频道插件](/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和
  [提供者插件](/plugins/sdk-provider-plugins#step-1-package-and-manifest)。
</Tip>

## 包元数据

您的 `package.json` 需要一个 `openclaw` 字段，用于告诉插件系统您的插件提供什么：

**频道插件：**

```json
{
  "name": "@myorg/openclaw-my-channel",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "我的频道",
      "blurb": "频道的简短描述。"
    }
  }
}
```

**提供者插件 / ClawHub 发布基线：**

```json openclaw-clawhub-package.json
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

如果您在 ClawHub 上外部发布插件，这些 `compat` 和 `build` 字段是必需的。规范发布代码片段位于 `docs/snippets/plugin-publish/`。

### `openclaw` 字段

| Field        | Type       | Description                                                                                                                 |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | 入口点文件（相对于包根目录）                                                                                                   |
| `setupEntry` | `string`   | 轻量级的仅用于设置的入口（可选）                                                                                               |
| `channel`    | `object`   | 用于设置、选择器、快速开始和状态界面的频道目录元数据                                                                         |
| `providers`  | `string[]` | 由此插件注册的提供者 id                                                                                                      |
| `install`    | `object`   | 安装提示：`npmSpec`、`localPath`、`defaultChoice`、`minHostVersion`、`expectedIntegrity`、`allowInvalidConfigRecovery` |
| `startup`    | `object`   | 启动行为标志                                                                                                                |

### `openclaw.channel`

`openclaw.channel` 是用于在运行时加载之前进行频道发现和设置界面的低成本包元数据。

| Field                                  | Type       | What it means                                                                 |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `id`                                   | `string`   | 规范频道 id。                                                                  |
| `label`                                | `string`   | 主要频道标签。                                                                  |
| `selectionLabel`                       | `string`   | 当需要与 `label` 不同时，选择器/设置中的标签。                                  |
| `detailLabel`                          | `string`   | 更丰富的频道目录和状态界面中使用的次级详情标签。                                |
| `docsPath`                             | `string`   | 用于设置和选择链接的文档路径。                                                  |
| `docsLabel`                            | `string`   | 当需要与频道 id 不同时，用于文档链接的覆盖标签。                                |
| `blurb`                                | `string`   | 简短的引导/目录描述。                                                           |
| `order`                                | `number`   | 频道目录中的排序顺序。                                                          |
| `aliases`                              | `string[]` | 频道选择的额外查找别名。                                                        |
| `preferOver`                           | `string[]` | 此频道应排在更低优先级的插件/频道 id 之上。                                      |
| `systemImage`                          | `string`   | 频道 UI 目录的可选图标/系统图像名称。                                            |
| `selectionDocsPrefix`                  | `string`   | 选择界面中文档链接前的前缀文本。                                                |
| `selectionDocsOmitLabel`               | `boolean`  | 在选择文案中直接显示文档路径，而不是带标签的文档链接。                            |
| `selectionExtras`                      | `string[]` | 附加到选择文案中的额外短字符串。                                                |
| `markdownCapable`                      | `boolean`  | 将频道标记为支持 markdown，以用于出站格式化决策。                                |
| `exposure`                             | `object`   | 用于设置、已配置列表和文档界面的频道可见性控制。                                |
| `quickstartAllowFrom`                  | `boolean`  | 让此频道加入标准快速开始 `allowFrom` 设置流程。                                 |
| `forceAccountBinding`                  | `boolean`  | 即使只有一个账户存在，也要求显式账户绑定。                                        |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | 在解析此频道的 announce 目标时，优先使用会话查找。                               |

示例：

```json
{
  "openclaw": {
    "channel": {
      "id": "my-channel",
      "label": "我的频道",
      "selectionLabel": "My Channel (self-hosted)",
      "detailLabel": "My Channel Bot",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "基于 Webhook 的自托管聊天集成。",
      "order": 80,
      "aliases": ["mc"],
      "preferOver": ["my-channel-legacy"],
      "selectionDocsPrefix": "指南：",
      "selectionExtras": ["Markdown"],
      "markdownCapable": true,
      "exposure": {
        "configured": true,
        "setup": true,
        "docs": true
      },
      "quickstartAllowFrom": true
    }
  }
}
```

`exposure` 支持：

- `configured`：将频道包含在已配置/状态风格的列表界面中
- `setup`：将频道包含在交互式设置/配置选择器中
- `docs`：在文档/导航界面中将频道标记为面向公众

`showConfigured` 和 `showInSetup` 仍作为旧版别名受支持。请优先使用
`exposure`。

### `openclaw.install`

`openclaw.install` 是包元数据，不是清单元数据。

| Field                        | Type                 | What it means                                                                    |
| ---------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `npmSpec`                    | `string`             | 安装/更新流程的规范 npm 规格。                                                     |
| `localPath`                  | `string`             | 本地开发或打包后的安装路径。                                                       |
| `defaultChoice`              | `"npm"` \| `"local"` | 两者都可用时的首选安装来源。                                                       |
| `minHostVersion`             | `string`             | 受支持的最低 OpenClaw 版本，格式为 `>=x.y.z`。                                     |
| `expectedIntegrity`          | `string`             | 预期的 npm 分发完整性字符串，通常为 `sha512-...`，用于固定安装。                   |
| `allowInvalidConfigRecovery` | `boolean`            | 允许打包插件重新安装流程从特定的过期配置失败中恢复。                                 |

交互式入门也会使用 `openclaw.install` 来提供按需安装界面。如果您的插件在运行时加载之前公开提供者身份验证选项或频道设置/目录元数据，入门可以显示该选项，提示选择 npm 还是本地安装，安装或启用插件，然后继续所选流程。npm 入门选项需要带有注册表 `npmSpec` 的受信任目录元数据；精确版本和 `expectedIntegrity` 是可选固定值。如果存在 `expectedIntegrity`，安装/更新流程将强制执行它。将“显示什么”的元数据放在 `openclaw.plugin.json` 中，将“如何安装它”的元数据放在 `package.json` 中。

如果设置了 `minHostVersion`，安装和清单注册表加载都会强制执行它。较旧的主机将跳过该插件；无效的版本字符串将被拒绝。

对于固定的 npm 安装，请在 `npmSpec` 中保留确切版本并添加预期的工件完整性：

```json
{
  "openclaw": {
    "install": {
      "npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3",
      "expectedIntegrity": "sha512-REPLACE_WITH_NPM_DIST_INTEGRITY",
      "defaultChoice": "npm"
    }
  }
}
```

`allowInvalidConfigRecovery` 不是针对损坏配置的通用绕过。它仅用于有限的打包插件恢复，因此重新安装/设置可以修复已知升级残留，例如缺少打包插件路径或同一插件的过期 `channels.<id>` 条目。如果配置因无关原因损坏，安装仍会失败关闭，并提示操作员运行 `openclaw doctor --fix`。

### 延迟完整加载

频道插件可以选择加入延迟加载：

```json
{
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

启用后，OpenClaw 在预监听启动阶段仅加载 `setupEntry`，即使是已配置的频道也是如此。完整入口在网关开始监听后加载。

<Warning>
  仅当您的 `setupEntry` 在网关开始监听之前注册了网关所需的所有内容（频道注册、HTTP 路由、网关方法）时才启用延迟加载。如果完整入口拥有所需的启动功能，请保持默认行为。
</Warning>

如果您的设置/完整入口注册了网关 RPC 方法，请将它们保留在
插件专用前缀下。保留的核心管理命名空间（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）由核心拥有，并且始终解析为
`operator.admin`。

## 插件清单

每个原生插件必须在包根目录中附带一个 `openclaw.plugin.json`。OpenClaw 使用此文件在不执行插件代码的情况下验证配置。

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "description": "为 OpenClaw 添加 My Plugin 功能",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookSecret": {
        "type": "string",
        "description": "Webhook 验证密钥"
      }
    }
  }
}
```

对于频道插件，添加 `kind` 和 `channels`：

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

即使没有配置的插件也必须附带模式。空模式是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

参见 [插件清单](/plugins/manifest) 获取完整模式参考。

## ClawHub 发布

对于插件包，使用特定于包的 ClawHub 命令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

遗留的仅技能发布别名适用于技能。插件包应始终使用 `clawhub package publish`。

## 设置入口

`setup-entry.ts` 文件是 `index.ts` 的轻量级替代方案，当 OpenClaw 仅需设置表面（入职、配置修复、禁用频道检查）时加载它。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

这避免了在设置流程期间加载沉重的运行时代码（加密库、CLI 注册、后台服务）。

将设置安全的导出保留在侧车模块中的捆绑工作区频道，可以使用
`openclaw/plugin-sdk/channel-entry-contract` 中的
`defineBundledChannelSetupEntry(...)` 来代替
`defineSetupPluginEntry(...)`。该捆绑契约还支持可选的
`runtime` 导出，因此设置时的运行时绑定可以保持轻量且显式。

**当 OpenClaw 使用 `setupEntry` 而不是完整入口时：**

- 频道已禁用但需要设置/入职界面
- 频道已启用但未配置
- 已启用延迟加载（`deferConfiguredChannelFullLoadUntilAfterListen`）

**`setupEntry` 必须注册的内容：**

- 频道插件对象（通过 `defineSetupPluginEntry`）
- 网关监听之前所需的任何 HTTP 路由
- 启动期间所需的任何网关方法

这些启动阶段的网关方法仍应避免使用保留的核心管理命名空间，例如
`config.*` 或 `update.*`。

**`setupEntry` 不应包含：**

- CLI 注册
- 后台服务
- 沉重的运行时导入（加密、SDK）
- 仅在启动后需要的网关方法

### 窄范围设置辅助导入

对于热路径的仅设置场景，当您只需要设置表面的一部分时，请优先使用更窄的设置辅助接缝，而不是更宽泛的 `plugin-sdk/setup` 总入口：

| Import path                        | Use it for                                                                                | Key exports                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | `setupEntry` / 延迟频道启动中仍可用的设置时运行时辅助工具                                       | `createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | 环境感知的账户设置适配器                                                                       | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | 设置/安装 CLI/归档/文档辅助工具                                                                | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR`                                                                                                                                                                                |

当您想要完整的共享设置工具箱时，请使用更宽泛的 `plugin-sdk/setup` 接缝，
包括诸如
`moveSingleAccountChannelSectionToDefaultAccount(...)` 之类的配置补丁辅助工具。

设置补丁适配器在导入时保持热路径安全。其打包的
单账户提升契约表面查找是懒加载的，因此导入
`plugin-sdk/setup-runtime` 不会在适配器实际使用之前急切加载打包的契约表面发现。

### 频道拥有的单账户提升

当频道从单账户顶层配置升级到
`channels.<id>.accounts.*` 时，默认的共享行为是将提升的
账户范围值移动到 `accounts.default`。

捆绑频道可以通过其设置契约表面缩小或覆盖该提升行为：

- `singleAccountKeysToMove`：应移动到
  提升账户中的额外顶层键
- `namedAccountPromotionKeys`：当命名账户已存在时，只有这些
  键会移动到提升账户；共享策略/投递键保留在
  频道根部
- `resolveSingleAccountPromotionTarget(...)`：选择哪个现有账户接收
  提升的值

Matrix 是当前的打包示例。如果已经恰好存在一个命名的 Matrix 账户，
或者 `defaultAccount` 指向一个现有的非规范键，例如 `Ops`，则提升会保留该账户，而不是创建新的 `accounts.default` 条目。

## 配置 schema

插件配置会根据清单中的 JSON Schema 进行验证。用户通过以下方式配置插件：

```json5
{
  plugins: {
    entries: {
      "my-plugin": {
        config: {
          webhookSecret: "abc123",
        },
      },
    },
  },
}
```

您的插件在注册期间通过 `api.pluginConfig` 接收此配置。

对于特定于频道的配置，请改用频道配置部分：

```json5
{
  channels: {
    "my-channel": {
      token: "bot-token",
      allowFrom: ["user1", "user2"],
    },
  },
}
```

### 构建频道配置模式

使用 `buildChannelConfigSchema` 将 Zod schema 转换为插件拥有的配置工件所使用的 `ChannelConfigSchema` 包装器：

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

对于第三方插件，冷路径契约仍然是插件清单：将生成的 JSON Schema 镜像到 `openclaw.plugin.json#channelConfigs` 中，以便配置 schema、设置和 UI 界面无需加载运行时代码即可检查 `channels.<id>`。

## 设置向导

频道插件可以为 `openclaw onboard` 提供交互式设置向导。向导是 `ChannelPlugin` 上的 `ChannelSetupWizard` 对象：

```typescript
import type { ChannelSetupWizard } from "openclaw/plugin-sdk/channel-setup";

const setupWizard: ChannelSetupWizard = {
  channel: "my-channel",
  status: {
    configuredLabel: "已连接",
    unconfiguredLabel: "未配置",
    resolveConfigured: ({ cfg }) => Boolean((cfg.channels as any)?.["my-channel"]?.token),
  },
  credentials: [
    {
      inputKey: "token",
      providerHint: "my-channel",
      credentialLabel: "机器人令牌",
      preferredEnvVar: "MY_CHANNEL_BOT_TOKEN",
      envPrompt: "是否使用环境变量中的 MY_CHANNEL_BOT_TOKEN？",
      keepPrompt: "保留当前令牌？",
      inputPrompt: "请输入您的机器人令牌：",
      inspect: ({ cfg, accountId }) => {
        const token = (cfg.channels as any)?.["my-channel"]?.token;
        return {
          accountConfigured: Boolean(token),
          hasConfiguredValue: Boolean(token),
        };
      },
    },
  ],
};
```

`ChannelSetupWizard` 类型支持 `credentials`, `textInputs`, `dmPolicy`, `allowFrom`, `groupAccess`, `prepare`, `finalize` 等。参见捆绑的插件包（例如 Discord 插件 `src/channel.setup.ts`）获取完整示例。

对于只需要标准 `note -> prompt -> parse -> merge -> patch` 流程的 DM 允许列表提示，推荐使用 `openclaw/plugin-sdk/setup` 中的共享设置助手：`createPromptParsedAllowFromForAccount(...)`，`createTopLevelChannelParsedAllowFromPrompt(...)` 和 `createNestedChannelParsedAllowFromPrompt(...)`。

对于仅因标签、分数和可选额外行而异的频道设置状态块，推荐使用 `openclaw/plugin-sdk/setup` 中的 `createStandardChannelSetupStatus(...)`，而不是在每个插件中手动编写相同的 `status` 对象。

对于仅应在某些上下文中出现的可选设置表面，使用 `openclaw/plugin-sdk/channel-setup` 中的 `createOptionalChannelSetupSurface`：

```typescript
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";

const setupSurface = createOptionalChannelSetupSurface({
  channel: "my-channel",
  label: "我的频道",
  npmSpec: "@myorg/openclaw-my-channel",
  docsPath: "/channels/my-channel",
});
// 返回 { setupAdapter, setupWizard }
```

`plugin-sdk/channel-setup` 还在您只需要该可选安装表面的其中一半时，提供更底层的 `createOptionalChannelSetupAdapter(...)` 和 `createOptionalChannelSetupWizard(...)` 构建器。

生成的可选 adapter/wizard 在真实配置写入时会安全失败关闭。它们会在 `validateInput`、`applyAccountConfig` 和 `finalize` 中复用同一条“需要安装”的消息，并在设置了 `docsPath` 时附加文档链接。

对于二进制文件支持的设置 UI，优先使用共享的委托帮助器，而不是把相同的二进制/status 连接代码复制到每个频道中：

- `createDetectedBinaryStatus(...)`：用于仅在标签、提示、分数和二进制检测上不同的状态块
- `createCliPathTextInput(...)`：用于基于路径的文本输入
- `createDelegatedSetupWizardStatusResolvers(...)`、`createDelegatedPrepare(...)`、`createDelegatedFinalize(...)` 和 `createDelegatedResolveConfigured(...)`：当 `setupEntry` 需要惰性转发到更重的完整向导时使用
- `createDelegatedTextInputShouldPrompt(...)`：当 `setupEntry` 只需要委托 `textInputs[*].shouldPrompt` 决策时使用

## 发布与安装

**外部插件：** 发布到 [ClawHub](/tools/clawhub) 或 npm，然后安装：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw 会先尝试 ClawHub，并自动回退到 npm。您也可以显式强制使用 ClawHub：

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # 仅 ClawHub
```

没有对应的 `npm:` 覆盖。若您希望在 ClawHub 回退后走 npm 路径，请使用常规的 npm 包规范：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

**仓库内插件：** 放置在捆绑插件工作区树下，它们在构建期间会自动被发现。

**用户可以安装：**

```bash
openclaw plugins install <package-name>
```

<Info>
  对于源自 npm 的安装，`openclaw plugins install` 会运行 `npm install --ignore-scripts`（无生命周期脚本）。请保持插件依赖树为纯 JS/TS，避免需要 `postinstall` 构建的包。
</Info>

捆绑的、由 OpenClaw 维护的插件是唯一的启动修复例外：当打包后的安装发现某个插件通过插件配置、旧式频道配置或其捆绑的默认启用清单被启用时，启动过程会在导入前安装该插件缺失的运行时依赖。第三方插件不应依赖启动时安装；请继续使用显式插件安装器。

## 相关内容

- [SDK 入口点](/plugins/sdk-entrypoints) -- `definePluginEntry` 和 `defineChannelPluginEntry`
- [插件清单](/plugins/manifest) -- 完整的清单架构参考
- [构建插件](/plugins/building-plugins) -- 分步入门指南
