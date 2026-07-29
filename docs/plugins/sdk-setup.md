---
summary: "设置向导、setup-entry.ts、配置 schema 和 package.json 元数据"
title: "插件设置与配置"
sidebarTitle: "设置与配置"
read_when:
  - 你正在为插件添加设置向导
  - 你需要理解 setup-entry.ts 与 index.ts 的区别
  - 你正在定义插件配置 schema 或 package.json 的 openclaw 元数据
---

插件打包（`package.json` 元数据）、清单（`openclaw.plugin.json`）、设置入口以及配置 schema 的参考文档。

<Tip>
**在找操作流程吗？** 操作指南会结合上下文讲解打包： [频道插件](/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供者插件](/plugins/sdk-provider-plugins#step-1-package-and-manifest)。
</Tip>

## 包元数据

你的 `package.json` 需要包含一个 `openclaw` 字段，用于告诉插件系统你的插件提供了什么：

<Tabs>
  <Tab title="频道插件">
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
  </Tab>
  <Tab title="提供者插件 / ClawHub 基线">
    ```json openclaw-clawhub-package.json
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
  </Tab>
</Tabs>

<Note>
在 ClawHub 上对外发布需要 `compat` 和 `build`。规范的发布片段位于 `docs/snippets/plugin-publish/`。
</Note>

### `openclaw` 字段

<ParamField path="extensions" type="string[]">
  入口文件（相对于包根目录）。适用于工作区和 git 检出开发的有效源码入口。
</ParamField>
<ParamField path="runtimeExtensions" type="string[]">
  `extensions` 对应的已构建 JavaScript 配对文件，当 OpenClaw 加载已安装的 npm 包时优先使用。有关源码/构建解析顺序，请参见 [SDK 入口点](/plugins/sdk-entrypoints)。
</ParamField>
<ParamField path="setupEntry" type="string">
  轻量级的仅设置入口（可选）。
</ParamField>
<ParamField path="runtimeSetupEntry" type="string">
  `setupEntry` 对应的已构建 JavaScript 配对文件。需要同时设置 `setupEntry`。
</ParamField>
<ParamField path="plugin" type="object">
  `{ id, label }` 的回退插件标识；当插件没有频道/提供者元数据可用于推导 id 或 label 时使用。
</ParamField>
<ParamField path="channel" type="object">
  用于设置、选择器、快速开始和状态界面的频道目录元数据。
</ParamField>
<ParamField path="install" type="object">
  安装提示：`npmSpec`、`localPath`、`defaultChoice`、`minHostVersion`、`expectedIntegrity`、`allowInvalidConfigRecovery`、`requiredPlatformPackages`。
</ParamField>
<ParamField path="startup" type="object">
  启动行为标志。
</ParamField>
<ParamField path="compat" type="object">
  此插件支持的 `pluginApi` 版本范围。外部 ClawHub 发布时必需。
</ParamField>

<Note>
提供者 id（`providers: string[]`）是清单元数据，不是包元数据。请在 `openclaw.plugin.json` 中声明它们，而不是这里——参见 [插件清单](/plugins/manifest)。
</Note>

### `openclaw.channel`

`openclaw.channel` 是用于运行时加载之前的频道发现和设置界面的轻量包元数据。

### Channel-owned setup fields

Channel plugins should define setup fields once in runtime code with `defineChannelSetupContract(...)` and publish the matching serializable projection under `openclaw.channel.setup.fields`. The runtime definition infers the plugin-local input type, parses both guided and non-interactive values, and keeps channel-specific keys out of core types. Package metadata lets `openclaw channels add <channel-id> --help` and `openclaw channels add --channel <channel-id> --help` discover only the selected channel's options without loading the plugin.

```ts
import { defineChannelSetupContract } from "openclaw/plugin-sdk/channel-setup";

export const setupContract = defineChannelSetupContract({
  fields: {
    endpoint: {
      kind: "string",
      cli: { flags: "--endpoint <url>", description: "Service endpoint" },
    },
    transport: {
      kind: "choice",
      choices: ["native", "container"],
      cli: { flags: "--transport <kind>", description: "Transport owner" },
    },
  },
  adapter: {
    applyAccountConfig: ({ cfg, input }) => ({
      ...cfg,
      channels: { ...cfg.channels, example: input },
    }),
  },
});
```

```json
{
  "openclaw": {
    "channel": {
      "id": "example",
      "setup": {
        "fields": [
          {
            "key": "endpoint",
            "kind": "string",
            "cli": { "flags": "--endpoint <url>", "description": "Service endpoint" }
          },
          {
            "key": "transport",
            "kind": "choice",
            "choices": ["native", "container"],
            "cli": { "flags": "--transport <kind>", "description": "Transport owner" }
          }
        ]
      }
    }
  }
}
```

Supported field kinds are `string`, `boolean`, `integer`, `string-list`, and `choice`. Use `sensitive: true` for credentials. Each field key must equal the camelCased attribute name of its long CLI flag, including any negated form, such as `apiToken` for `--api-token`. Boolean fields may add `cli.negatedFlags` when both positive and `--no-*` forms are needed. `channel`, `account`, and the account display `name` remain the shared control envelope.

The released `setup`/`ChannelSetupInput` adapter stays available for existing external plugins. New plugins should expose `setupContract`; OpenClaw always prefers it when both are present.

| Field                                  | Type       | What it means                                                                 |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `id`                                   | `string`   | Canonical channel id.                                                         |
| `label`                                | `string`   | Primary channel label.                                                        |
| `selectionLabel`                       | `string`   | Picker/setup label when it should differ from `label`.                        |
| `detailLabel`                          | `string`   | Secondary detail label for richer channel catalogs and status surfaces.       |
| `docsPath`                             | `string`   | Docs path for setup and selection links.                                      |
| `docsLabel`                            | `string`   | Override label used for docs links when it should differ from the channel id. |
| `blurb`                                | `string`   | Short onboarding/catalog description.                                         |
| `order`                                | `number`   | Sort order in channel catalogs.                                               |
| `aliases`                              | `string[]` | Extra lookup aliases for channel selection.                                   |
| `preferOver`                           | `string[]` | Lower-priority plugin/channel ids this channel should outrank.                |
| `systemImage`                          | `string`   | Optional icon/system-image name for channel UI catalogs.                      |
| `selectionDocsPrefix`                  | `string`   | Prefix text before docs links in selection surfaces.                          |
| `selectionDocsOmitLabel`               | `boolean`  | Show the docs path directly instead of a labeled docs link in selection copy. |
| `selectionExtras`                      | `string[]` | Extra short strings appended in selection copy.                               |
| `markdownCapable`                      | `boolean`  | Marks the channel as markdown-capable for outbound formatting decisions.      |
| `exposure`                             | `object`   | Channel visibility controls for setup, configured lists, and docs surfaces.   |
| `quickstartAllowFrom`                  | `boolean`  | Opt this channel into the standard quickstart `allowFrom` setup flow.         |
| `forceAccountBinding`                  | `boolean`  | Require explicit account binding even when only one account exists.           |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | Prefer session lookup when resolving announce targets for this channel.       |
| `setup`                                | `object`   | Serializable channel-owned setup fields used for lazy CLI option discovery.   |

示例：

```json
{
  "openclaw": {
    "channel": {
      "id": "my-channel",
      "label": "我的频道",
      "selectionLabel": "我的频道（自托管）",
      "detailLabel": "我的频道机器人",
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

- `configured`：在已配置/状态类列表界面中包含该频道
- `setup`：在交互式设置/配置选择器中包含该频道
- `docs`：在文档/导航界面中将该频道标记为面向公众

### `openclaw.install`

`openclaw.install` 是包元数据，不是清单元数据。

| 字段                        | 类型                                | 含义                                                                     |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `clawhubSpec`                | `string`                            | 用于安装/更新和入门按需安装流程的规范化 ClawHub 规格。                  |
| `npmSpec`                    | `string`                            | 用于安装/更新回退流程的规范化 npm 规格。                                 |
| `localPath`                  | `string`                            | 本地开发或捆绑安装路径。                                                 |
| `defaultChoice`              | `"clawhub"` \| `"npm"` \| `"local"` | 多个来源可用时的首选安装来源。                                           |
| `minHostVersion`             | `string`                            | 最低支持的 OpenClaw 版本，`>=x.y.z` 或 `>=x.y.z-prerelease`。           |
| `expectedIntegrity`          | `string`                            | 预期的 npm 制品完整性字符串，通常为 `sha512-...`，用于固定安装。        |
| `allowInvalidConfigRecovery` | `boolean`                           | 允许捆绑插件重装流程从特定的过时配置失败中恢复。                         |
| `requiredPlatformPackages`   | `string[]`                          | 在 npm 安装期间验证所需的平台特定 npm 别名。                             |

<AccordionGroup>
  <Accordion title="入门行为">
    交互式入门会将 `openclaw.install` 用于按需安装界面：如果你的插件在运行时加载之前暴露了提供者认证选项或频道设置/目录元数据，入门流程可以提示选择 ClawHub、npm 或本地安装，完成插件安装或启用，然后继续所选流程。ClawHub 选项使用 `clawhubSpec`，在存在时优先使用；npm 选项需要带有注册表 `npmSpec` 的可信目录元数据（精确版本和 `expectedIntegrity` 是可选固定值，在设置时会在安装/更新时强制执行）。将“展示什么”放在 `openclaw.plugin.json` 中，将“如何安装它”放在 `package.json` 中。
  </Accordion>
  <Accordion title="minHostVersion 强制执行">
    如果设置了 `minHostVersion`，安装以及非捆绑的清单注册表加载都会强制执行它。较旧的宿主会跳过外部插件；无效的版本字符串会被拒绝。捆绑源码插件默认视为与宿主检出版本一致。
  </Accordion>
  <Accordion title="固定的 npm 安装">
    对于固定的 npm 安装，请在 `npmSpec` 中保留精确版本，并添加预期的制品完整性：

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

  </Accordion>
  <Accordion title="allowInvalidConfigRecovery 作用范围">
    `allowInvalidConfigRecovery` 不是对损坏配置的通用绕过。它只用于狭义的捆绑插件恢复，允许重装/设置修复已知的升级残留，例如缺失的捆绑插件路径，或同一插件中陈旧的 `channels.<id>` 条目。如果配置因无关原因损坏，安装仍会失败并提示操作员运行 `openclaw doctor --fix`。
  </Accordion>
</AccordionGroup>

### 延迟完整加载

频道插件可以通过以下方式启用延迟加载：

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

启用后，OpenClaw 会仅在监听前的启动阶段加载 `setupEntry`，即使对于已经配置好的频道也是如此。完整入口会在网关开始监听后加载。

<Warning>
只有当你的 `setupEntry` 在网关开始监听前注册了网关所需的一切内容时，才启用延迟加载（频道注册、HTTP 路由、网关方法）。如果完整入口承担了必需的启动能力，请保持默认行为。
</Warning>

如果你的设置/完整入口注册了网关 RPC 方法，请将它们放在插件专用前缀下。保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）仍由核心拥有，并始终规范化为 `operator.admin`。

## 插件清单

每个原生插件都必须在包根目录中随附一个 `openclaw.plugin.json`。OpenClaw 使用它在不执行插件代码的情况下验证配置。

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "description": "为 OpenClaw 添加我的插件功能",
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

对于频道插件，添加 `channels`（提供方插件则添加 `providers`）：

```json
{
  "id": "my-channel",
  "channels": ["my-channel"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

即使没有配置的插件也必须提供 schema。空 schema 也是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

有关完整的 schema 参考，请参阅 [插件清单](/plugins/manifest)。

## ClawHub 发布

Skills 和 plugin packages 使用单独的 ClawHub 发布命令。对于 plugin packages，请使用包特定的命令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

<Note>
`clawhub skill publish <path>` 是用于发布 skill 文件夹的不同命令，不是 plugin package。请参阅 [Publishing on ClawHub](/clawhub/publishing)。
</Note>

## Setup 入口

`setup-entry.ts` 是 `index.ts` 的轻量替代方案，OpenClaw 仅在需要设置界面时加载它（引导、配置修复、已禁用频道检查）：

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

这可以避免在设置流程中加载较重的运行时代码（加密库、CLI 注册、后台服务）。

将设置安全导出保留在侧车模块中的打包工作区频道，可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)` 代替 `defineSetupPluginEntry(...)`。该打包契约还支持可选的 `runtime` 导出，因此设置阶段的运行时绑定可以保持轻量且明确。

<AccordionGroup>
  <Accordion title="OpenClaw 何时使用 setupEntry 而不是完整入口">
    - 频道已禁用，但仍需要设置/引导界面。
    - 频道已启用但尚未配置。
    - 已启用延迟加载（`deferConfiguredChannelFullLoadUntilAfterListen`）。

  </Accordion>
  <Accordion title="setupEntry 必须注册什么">
    - 频道插件对象（通过 `defineSetupPluginEntry`）。
    - 在 gateway listen 之前所需的任何 HTTP 路由。
    - 启动期间需要的任何 gateway 方法。

    这些启动阶段的 gateway 方法仍应避免使用保留的核心管理命名空间，例如 `config.*` 或 `update.*`。

  </Accordion>
  <Accordion title="setupEntry 不应包含什么">
    - CLI 注册。
    - 后台服务。
    - 重型运行时导入（crypto、SDK 等）。
    - 仅在启动后才需要的 gateway 方法。

  </Accordion>
</AccordionGroup>

### 细粒度 setup 辅助导入

对于热路径的仅设置场景，当你只需要设置面的部分能力时，优先使用更细粒度的 setup 辅助接口，而不是更宽泛的 `plugin-sdk/setup` 总入口：

| Import path                | Use it for                                                                                | Key exports                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime` | setup-time runtime helpers that stay available in `setupEntry` / deferred channel startup | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-tools`   | setup/install CLI/archive/docs helpers                                                    | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                                         |

当你想要完整的共享设置工具箱时，请使用更宽泛的 `plugin-sdk/setup` 接口，包括诸如 `moveSingleAccountChannelSectionToDefaultAccount(...)` 之类的配置补丁辅助工具。

Use `createSetupTranslator(...)` for fixed setup wizard copy. It uses the first nonblank value from `OPENCLAW_LOCALE`, `LC_ALL`, `LC_MESSAGES`, and `LANG`, in that order, then falls back to English. Set `OPENCLAW_LOCALE=en` for an explicit English override. Keep plugin-specific setup text in plugin-owned code and use shared catalog keys only for common setup labels, status text, and official bundled plugin setup copy.

setup 补丁适配器在导入时对热路径是安全的。其打包后的单账户提升契约面查找是懒加载的，因此导入 `plugin-sdk/setup-runtime` 不会在适配器真正被使用之前就急切地加载打包契约面的发现逻辑。

### Channel-owned setup input fields

`ChannelSetupInput` is a generic envelope shared by setup callers and channel
plugins. Its permanently typed fields are `name`, `token`, `tokenFile`,
`useEnv`, `allowFrom`, and `defaultTo`. Additional plugin-owned keys can still
be present on the runtime input object, but the shared type does not declare an
index signature. Each plugin must declare and narrow its own setup fields or
validate them with a plugin-owned schema at the adapter boundary:

```typescript
import type { ChannelSetupAdapter, ChannelSetupInput } from "openclaw/plugin-sdk/channel-setup";

type AcmeSetupInput = ChannelSetupInput & {
  workspaceId?: string;
  webhookUrl?: string;
};

export const acmeSetupAdapter: ChannelSetupAdapter = {
  applyAccountConfig: ({ cfg, input }) => {
    const setupInput = input as AcmeSetupInput;
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        acme: {
          token: setupInput.token,
          workspaceId: setupInput.workspaceId,
          webhookUrl: setupInput.webhookUrl,
        },
      },
    };
  },
};
```

Channel-specific fields that were previously declared directly on
`ChannelSetupInput` remain temporarily typed for external source compatibility.
They are deprecated. A 2026-07-22 registry sweep of 426 published out-of-tree
channel plugins removed 21 fields with no readers and retained 22 with known
readers. Each retained field is deleted as soon as no published plugin reads it;
no version boundary is required. New and bundled plugins must not rely on this
tier; declare the fields they own locally.

### Channel-owned single-account promotion

当频道从顶层单账户配置升级到 `channels.<id>.accounts.*` 时，默认的共享行为会将被提升的账户作用域值移动到 `accounts.default`。

Every channel plugin can extend or narrow that promotion through its setup adapter:

- `singleAccountKeysToMove`：应移动到被提升账户中的额外顶层键
- `namedAccountPromotionKeys`：当已存在命名账户时，仅这些键会移动到被提升账户；共享的策略/投递键保留在频道根部
- `resolveSingleAccountPromotionTarget(...)`：选择哪个现有账户接收被提升的值

The presence of `singleAccountKeysToMove` marks the promotion contract complete. Declare the field even when it is an empty array to opt out of legacy key promotion. Adapters that omit the field retain a reader-backed pre-declaration promotion tier for already-published plugins. The 2026-07-22 registry sweep removed 23 keys with no published dependents and retained six common keys plus the setup-only `rooms` key. Each retained key is deleted as soon as its published readers migrate to declarations; no version boundary is required.

Declare `openclaw.setupFeatures.configPromotion: true` in the plugin package manifest when doctor must load these declarations from the lightweight bundled setup artifact. The setup-only plugin surface and the full channel plugin must expose the same declarations.

When calling `moveSingleAccountChannelSectionToDefaultAccount(...)` with an already resolved plugin, pass its setup adapter as `setupSurface`. Caller-supplied setup surfaces take precedence over loaded and bundled lookup, which keeps scoped or setup-only plugins independent of global registration.

<Note>
Matrix 是当前的打包示例。如果已经恰好存在一个命名的 Matrix 账户，或者 `defaultAccount` 指向一个现有的非规范键，例如 `Ops`，那么提升会保留该账户，而不是创建一个新的 `accounts.default` 条目。
</Note>

## 配置模式

插件配置会根据 manifest 中的 JSON Schema 进行校验。用户按如下方式配置插件：

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

在注册期间，你的插件会将此配置作为 `api.pluginConfig` 接收。

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

### 构建频道配置 Schema

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

如果你已经将契约编写为 JSON Schema 或 TypeBox，请使用直接辅助函数，这样 OpenClaw 就可以在元数据路径上跳过 Zod 到 JSON Schema 的转换：

```typescript
import { Type } from "typebox";
import { buildJsonChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const configSchema = buildJsonChannelConfigSchema(
  Type.Object({
    token: Type.Optional(Type.String()),
    allowFrom: Type.Optional(Type.Array(Type.String())),
  }),
);
```

对于第三方插件，冷路径契约仍然是插件 manifest：将生成的 JSON Schema 镜像到 `openclaw.plugin.json#channelConfigs`，这样配置 schema、设置和 UI 界面就可以在不加载运行时代码的情况下检查 `channels.<id>`。

## 安装向导

频道插件可以为 `openclaw onboard` 提供一个交互式安装向导。该向导是 `ChannelPlugin` 上的一个 `ChannelSetupWizard` 对象：

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
      envPrompt: "是否使用环境中的 MY_CHANNEL_BOT_TOKEN？",
      keepPrompt: "保留当前令牌吗？",
      inputPrompt: "请输入你的机器人令牌：",
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

`ChannelSetupWizard` 也支持 `textInputs`、`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等更多功能。完整的打包示例请参见 Discord 插件的 `src/setup-core.ts`。

<AccordionGroup>
  <Accordion title="Shared allowFrom prompts">
    For DM allowlist prompts that only need the standard `note -> prompt -> parse -> merge -> patch` flow, prefer the shared setup helpers from `openclaw/plugin-sdk/setup`: `createPromptParsedAllowFromForAccount(...)` and `createTopLevelChannelParsedAllowFromPrompt(...)`.
  </Accordion>
  <Accordion title="标准频道设置状态">
    对于仅在标签、分数和可选附加行上有所不同的频道设置状态块，优先使用 `openclaw/plugin-sdk/setup` 中的 `createStandardChannelSetupStatus(...)`，而不是在每个插件里手写相同的 `status` 对象。
  </Accordion>
  <Accordion title="可选频道设置界面">
    对于只应出现在特定上下文中的可选设置界面，请使用 `openclaw/plugin-sdk/channel-setup` 中的 `createOptionalChannelSetupSurface`：

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

    当你只需要这个可选安装界面的其中一半时，`plugin-sdk/channel-setup` 也提供更底层的 `createOptionalChannelSetupAdapter(...)` 和 `createOptionalChannelSetupWizard(...)` 构建器。

    生成的可选 adapter/wizard 在写入真实配置时会默认失败关闭。它们会在 `validateInput`、`applyAccountConfig` 和 `finalize` 中复用相同的“需要安装”消息，并在设置了 `docsPath` 时附加文档链接。

  </Accordion>
  <Accordion title="基于二进制的设置辅助">
    对于基于二进制的设置 UI，优先使用共享的委派辅助函数，而不是在每个频道里重复同样的二进制/状态粘合代码：

    - `createDetectedBinaryStatus(...)` for status blocks that vary only by labels, hints, scores, and binary detection
    - `createCliPathTextInput(...)` for path-backed text inputs
    - `createDelegatedSetupWizardProxy(...)` when `setupEntry` needs to forward status, prepare, or finalize behavior to a heavier full wizard lazily
    - `createDelegatedTextInputShouldPrompt(...)` when `setupEntry` only needs to delegate a `textInputs[*].shouldPrompt` decision

  </Accordion>
</AccordionGroup>

## 发布与安装

**外部插件：** 发布到 [ClawHub](/clawhub)，然后安装：

<Tabs>
  <Tab title="npm">
    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    普通包规格会在启动切换期间从 npm 安装，除非名称与某个内置或官方插件 id 匹配；在这种情况下，OpenClaw 会改用本地/官方副本。若要确定性地选择来源，请使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:` —— 参见 [管理插件](/plugins/manage-plugins)。

  </Tab>
  <Tab title="仅 ClawHub">
    ```bash
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```
  </Tab>
  <Tab title="npm 包规格">
    当某个包尚未迁移到 ClawHub，或者你在迁移期间需要直接的 npm 安装路径时，请使用 npm：

    ```bash
    openclaw plugins install npm:@myorg/openclaw-my-plugin
    ```

  </Tab>
</Tabs>

**仓库内插件：** 放置在已打包插件的工作区树下；它们会在构建期间自动被发现。

<Info>
对于从 npm 源安装的插件，`openclaw plugins install` 会将包安装到 `~/.openclaw/npm/projects` 下按插件划分的项目中，并禁用生命周期脚本（`--ignore-scripts`）。请保持插件依赖树纯 JS/TS，并避免使用需要 `postinstall` 构建的包。
</Info>

<Note>
网关启动时不会安装插件依赖。npm/git/ClawHub 安装流程会负责依赖解析；本地插件必须已经安装好其依赖。
</Note>

打包后的包元数据是显式指定的，不会在网关启动时从构建出的 JavaScript 中推断得出。运行时依赖应位于拥有它们的插件包中；打包的 OpenClaw 启动流程不会修复或镜像插件依赖。

## 相关内容

- [构建插件](/plugins/building-plugins) — 分步入门指南
- [插件 Manifest](/plugins/manifest) — 完整的 manifest schema 参考
- [SDK 入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry`
