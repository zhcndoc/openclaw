---
summary: "设置向导、setup-entry.ts、配置 schema 和 package.json 元数据"
title: "插件设置与配置"
sidebarTitle: "设置与配置"
read_when:
  - "你正在为插件添加设置向导"
  - "你需要理解 setup-entry.ts 与 index.ts 的区别"
  - "你正在定义插件配置 schema 或 package.json 的 openclaw 元数据"
---

插件打包（`package.json` 元数据）、清单（`openclaw.plugin.json`）、设置入口以及配置 schema 的参考文档。

<Tip>
**在找操作流程吗？** 操作指南会结合上下文讲解打包： [频道插件](/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供者插件](/plugins/sdk-provider-plugins#step-1-package-and-manifest)。
</Tip>

在此页面上：

- [包元数据](#package-metadata)
- [插件清单](#plugin-manifest)
- [设置条目](#setup-entry)
- [配置架构](#config-schema)
- [设置向导](#setup-wizards)
- [发布和安装](#publishing-and-installing)

## <a id="package-metadata"></a> 包元数据

你的 `package.json` 需要包含一个 `openclaw` 字段，用于告诉插件系统你的插件提供了什么：

<Tabs>
  <Tab id="channel-plugin" title="频道插件">
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
          "label": "My Channel",
          "blurb": "Short description of the channel."
        }
      }
    }
    ```
  </Tab>
  <Tab id="provider-plugin-%2F-clawhub-baseline" title="提供商插件/ClawHub 基线">
    ```json openclaw-clawhub-package.json
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
  </Tab>
</Tabs>

<Note>
在 ClawHub 上进行外部发布需要 `compat` 和 `build`。共享发布片段位于 `docs/snippets/plugin-publish/` 中。
</Note>

### <a id="openclaw-fields"></a> `openclaw` 字段

<ParamField path="extensions" type="string[]">
  入口文件（相对于包根目录）。适用于工作区和 git 检出开发的有效源码入口。
</ParamField>
<ParamField path="runtimeExtensions" type="string[]">
  为 `extensions` 构建 JavaScript 对等体，当 OpenClaw 加载已安装的 npm 包时首选。有关 source/built 分辨率顺序，请参阅 [SDK 入口点 ](/plugins/sdk-entrypoints)。
</ParamField>
<ParamField path="setupEntry" type="string">
  轻量级的仅设置入口（可选）。
</ParamField>
<ParamField path="runtimeSetupEntry" type="string">
  `setupEntry` 对应的已构建 JavaScript 配对文件。需要同时设置 `setupEntry`。
</ParamField>
<ParamField path="plugin" type="object">
  `{ id, label }` 后备插件标识，当插件没有 channel/provider 元数据来派生 id 或标签时使用。
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

### <a id="channel-owned-setup-fields"></a> 由频道拥有的设置字段

频道插件应在运行时代码中使用 `defineChannelSetupContract(...)` 一次性定义设置字段，并在 `openclaw.channel.setup.fields` 下发布匹配的可序列化投影。运行时定义会推断插件本地的输入类型，解析引导式和非交互式值，并将频道专属键排除在核心类型之外。包元数据使 `openclaw channels add <channel-id> --help` 和 `openclaw channels add --channel <channel-id> --help` 能够在不加载插件的情况下，仅发现所选频道的选项。

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

支持的字段类型为`string`、`boolean`、`integer`、`string-list`和`choice`。使用 `sensitive: true` 作为凭据。每个字段键必须等于其长 CLI 标志的驼峰式属性名称，包括任何否定形式，例如 `--api-token` 的 `apiToken`。当同时需要正数和 `--no-*` 形式时，布尔字段可以添加 `cli.negatedFlags`。 `channel`、`account` 和帐户显示 `name` 仍然是共享控制信封。

对于布尔型 `useEnv` 字段，请将 `envVars` 设置为插件运行时所需的静态环境变量名称。随后，非交互式频道设置会在写入配置前，当任何已声明的变量为空时拒绝 `--use-env`。当列表中的任意一个变量均可满足要求时，请设置 `envVarMode: "any"`，例如内联凭据或文件路径替代项。省略 `envVars` 会保留插件现有的验证行为。

已发布的 `setup`/`ChannelSetupInput` 适配器仍然可用于现有的外部插件。新插件应公开 `setupContract`。当两者都存在时，OpenClaw 总是更喜欢它。

使用 `afterAccountConfigWritten`（或向导的 `afterConfigWritten`）进行连接检查和其他需要保存配置的工作。 OpenClaw 在写入成功后运行这些回调，并通过运行时 `cfg` 从确切提交的文件中重新读取，并解析环境引用和插件默认值。保存的文件可以保留 `${VAR}` 引用。保存的配置丢失或无效会阻止回调执行。回调失败将报告为设置后警告，而不撤消已保存的配置。

| 字段                                  | 类型       | 含义                                                                 |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `id`                                   | `string`   | 主通道 ID。                                                           |
| `label`                                | `string`   | 主要频道标签。                                                        |
| `selectionLabel`                       | `string`   | Picker/setup 标签应与 `label` 不同。                        |
| `detailLabel`                          | `string`   | 用于更丰富的频道目录和状态界面的次要详细标签。       |
| `docsPath`                             | `string`   | 用于设置和选择链接的文档路径。                                      |
| `docsLabel`                            | `string`   | 当文档链接使用的标签与频道 ID 不同时，覆盖该标签。 |
| `blurb`                                | `string`   | onboarding/catalog 简短描述。                                         |
| `order`                                | `number`   | 频道目录中的排序顺序。                                               |
| `aliases`                              | `string[]` | 用于频道选择的额外查找别名。                                   |
| `preferOver`                           | `string[]` | 较低优先级 plugin/channel id 此通道的排名应高于。                |
| `systemImage`                          | `string`   | 通道 UI 目录的可选 icon/system-image 名称。                      |
| `selectionDocsPrefix`                  | `string`   | 文档链接之前的前缀；默认省略或使用 `""` 抑制它。        |
| `selectionDocsOmitLabel`               | `boolean`  | 在选择文案中直接显示文档路径，而不是带标签的文档链接。 |
| `selectionExtras`                      | `string[]` | 附加到选择文案末尾的其他简短字符串。                               |
| `markdownCapable`                      | `boolean`  | 将通道标记为支持降价以进行出站格式化决策。      |
| `exposure`                             | `object`   | 用于控制频道在设置、已配置列表和文档界面中的可见性。   |
| `quickstartAllowFrom`                  | `boolean`  | 将该频道加入标准快速入门的 `allowFrom` 设置流程。         |
| `forceAccountBinding`                  | `boolean`  | 即使只有一个账户，也要求显式绑定账户。           |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | 为该频道解析通知目标时，优先使用会话查找。       |
| `setup`                                | `object`   | 由频道拥有、用于延迟 CLI 选项发现的可序列化设置字段。   |

示例：

```json
{
  "openclaw": {
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (self-hosted)",
      "detailLabel": "My Channel Bot",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Webhook-based self-hosted chat integration.",
      "order": 80,
      "aliases": ["mc"],
      "preferOver": ["my-channel-legacy"],
      "selectionDocsPrefix": "Guide:",
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

- `configured`：在 configured/status-style 列表表面中包含频道
- `setup`：将频道包含在交互式 setup/configure 选择器中
- `docs`：在 docs/navigation 表面中将通道标记为面向公众

### `openclaw.install`

`openclaw.install` 是包元数据，不是清单元数据。

| 字段                        | 类型                                | 含义                                                                    |
| ---------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| `clawhubSpec`                | `string`                            | install/update 的主要 ClawHub 规范和载入按需安装流程。  |
| `npmSpec`                    | `string`                            | install/update 后备流的主要 npm 规范。                              |
| `localPath`                  | `string`                            | 本地开发或捆绑安装路径。                                       |
| `defaultChoice`              | `"clawhub"` \| `"npm"` \| `"local"` | 多个来源可用时的首选安装来源。                    |
| `minHostVersion`             | `string`                            | 最低支持的 OpenClaw 版本，`>=x.y.z` 或 `>=x.y.z-prerelease`。           |
| `expectedIntegrity`          | `string`                            | 预期的 npm 制品完整性字符串，通常为 `sha512-...`，用于固定安装。   |
| `allowInvalidConfigRecovery` | `boolean`                           | 允许捆绑插件重装流程从特定的过时配置失败中恢复。 |
| `requiredPlatformPackages`   | `string[]`                          | 在 npm 安装期间验证所需的平台特定 npm 别名。              |

<AccordionGroup>
  <Accordion id="onboarding-behavior" title="入门引导行为">
    交互式入门使用 `openclaw.install` 进行按需安装界面：如果您的插件在运行时加载之前公开提供商身份验证选择或通道 setup/catalog 元数据，则入门可以提示 ClawHub、npm 或本地安装、安装或启用插件，然后继续选定的流程。 ClawHub 选项使用 `clawhubSpec`，并且在存在时优先使用。 npm 中的选择需要具有注册表 `npmSpec` 的可信目录元数据（确切版本和 `expectedIntegrity` 是可选引脚，设置时在 install/update 上强制执行）。将“显示内容”保留在 `openclaw.plugin.json` 中，将“如何安装”保留在 `package.json` 中。
  </Accordion>
  <Accordion id="minhostversion-enforcement" title="minHostVersion 强制执行">
    如果设置了 `minHostVersion`，安装和非捆绑清单注册表加载都会强制执行它。较旧的主机会跳过外部插件。无效的版本字符串将被拒绝。假定捆绑的源插件与主机签出是共同版本的。
  </Accordion>
  <Accordion id="pinned-npm-installs" title="固定 npm 安装">
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
  <Accordion id="allowinvalidconfigrecovery-scope" title="allowedInvalidConfigRecovery 范围">
    `allowInvalidConfigRecovery` 不是对损坏的配置的一般旁路。它只是狭窄的捆绑插件恢复，让 reinstall/setup 修复已知的升级遗留问题，例如丢失的捆绑插件路径或同一插件的陈旧 `channels.<id>` 条目。如果配置由于不相关的原因而被破坏，安装仍然会停止并告诉操作员运行 `openclaw doctor --fix`。
  </Accordion>
</AccordionGroup>

### <a id="setup-time-gateway-methods"></a> 设置时网关方法

如果您的 setup/full 条目注册了网关 RPC 方法，请将它们保留在特定于插件的前缀上。保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持核心拥有并始终规范化为 `operator.admin`。

## <a id="plugin-manifest"></a> 插件清单

每个原生插件都必须在包根目录中随附一个 `openclaw.plugin.json`。OpenClaw 使用它在不执行插件代码的情况下验证配置。

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Adds My Plugin capabilities to OpenClaw",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookSecret": {
        "type": "string",
        "description": "Webhook verification secret"
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

## <a id="setup-entry"></a> Setup 入口

`setup-entry.ts` 是 `index.ts` 的轻量替代方案，OpenClaw 仅在需要设置界面时加载它（引导、配置修复、已禁用频道检查）：

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

这可以避免在设置流程中加载较重的运行时代码（加密库、CLI 注册、后台服务）。

在 sidecar 模块中保持设置安全导出的捆绑工作区通道可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)` 而不是 `defineSetupPluginEntry(...)`。该捆绑合约还支持可选的 `runtime` 导出，因此设置时运行时连接可以保持轻量级和明确。

<AccordionGroup>
  <Accordion id="when-openclaw-uses-setupentry-instead-of-the-full-entry" title="当 OpenClaw 使用 setupEntry 而不是完整条目时">
    - 通道已禁用，但需要 setup/onboarding 表面。
    - 频道已启用，但尚未完成配置。

  </Accordion>
  <Accordion id="what-setupentry-must-register" title="setupEntry必须注册什么">
    - 频道插件对象（通过 `defineSetupPluginEntry`）。
    - 通过 `registerSetupRuntime` 声明的设置阶段运行时界面（如有需要）。

    设置阶段的 gateway 方法仍应避开 `config.*` 或 `update.*` 等保留的核心管理命名空间。

  </Accordion>
  <Accordion id="what-setupentry-should-not-include" title="NOT 应该包含哪些 setupEntry">
    - CLI 注册。
    - 后台服务。
    - HHeavy 运行时导入（加密、SDK）。
    - 仅在启动后才需要的 gateway 方法。

  </Accordion>
</AccordionGroup>

### <a id="narrow-setup-helper-imports"></a> 细粒度 setup 辅助导入

对于仅热设置路径，当您只需要部分设置表面时，更喜欢狭窄的设置帮助程序界面，而不是更广泛的 `plugin-sdk/setup` 伞：

| 导入路径                | 用途                                                     | 主要导出                                                                                                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime` | 设置时可在 `setupEntry` 中继续使用的运行时辅助接口 | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-tools`   | setup/install CLI/archive/docs 帮助者                         | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                                         |

当您需要完整的共享设置工具箱（包括 `moveSingleAccountChannelSectionToDefaultAccount(...)` 等配置补丁帮助程序）时，请使用更广泛的 `plugin-sdk/setup` 界面。

使用 `createSetupTranslator(...)` 处理固定的设置向导文案。它会按顺序使用 `OPENCLAW_LOCALE`、`LC_ALL`、`LC_MESSAGES` 和 `LANG` 中第一个非空的值，然后回退到英语。设置 `OPENCLAW_LOCALE=en` 可显式指定使用英语。将插件专属的设置文本保留在插件自有代码中；共享目录键仅用于通用设置标签、状态文本以及官方内置插件的设置文案。

当插件导入安装补丁适配器时，它们不会立即执行工作。它们的捆绑单帐户升级合约面查找是惰性的，因此导入 `plugin-sdk/setup-runtime` 不会在实际使用适配器之前急切地加载捆绑的合约面发现。

### <a id="channel-owned-setup-input-fields"></a> 频道自有的设置输入字段

`ChannelSetupInput` 是由设置调用方和频道插件共享的通用封装。其永久类型化的字段为 `name`、`token`、`tokenFile`、`useEnv`、`allowFrom` 和 `defaultTo`。运行时输入对象中仍可以存在其他由插件自有的键，但共享类型不会声明索引签名。每个插件都必须声明并收窄其自身的设置字段，或在适配器边界处使用插件自有的 schema 对其进行验证：

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

之前直接在 `ChannelSetupInput` 上声明的特定于通道的字段仍然临时键入，以实现外部源兼容性。它们已被弃用。 2026 年 7 月 22 日，对 426 个已发布的树外通道插件进行了注册表扫描，删除了 21 个没有读者的字段，并保留了 22 个有已知读者的字段。一旦没有发布的插件读取每个保留的字段，它就会被删除。不需要版本边界。新的和捆绑的插件不得依赖于这一层。声明他们在本地拥有的字段。

### <a id="channel-owned-single-account-promotion"></a> 频道自有的单账户提升

当频道从顶层单账户配置升级到 `channels.<id>.accounts.*` 时，默认的共享行为会将被提升的账户作用域值移动到 `accounts.default`。

每个频道插件都可以通过其设置适配器扩展或收窄该提升行为：

- `configPromotion: "preserve-root"`：保留所有根值，包括公用名称、策略和传递字段。该插件拥有其帐户布局
- `singleAccountKeysToMove`：应移动到被提升账户中的额外顶层键
- `namedAccountPromotionKeys`：当指定帐户已存在时，只有这些密钥会移至升级帐户中。共享 policy/delivery 密钥保留在通道根目录中
- `resolveSingleAccountPromotionTarget(...)`：选择哪个现有账户接收被提升的值

`singleAccountKeysToMove`的出现标志着促销合同的完成。即使该字段是空数组，也要声明该字段以选择退出旧密钥升级。空数组不会抑制公共字段。省略该字段的适配器为已发布的插件保留读者支持的预声明升级层。 2026 年 7 月 22 日的注册表清理删除了 23 个没有发布依赖项的密钥，并保留了 6 个通用密钥以及仅用于安装的 `rooms` 密钥。一旦其发布的读者迁移到声明，每个保留的密钥就会被删除。不需要版本边界。

当 Doctor 必须从轻量级设置条目加载这些声明时，请在插件包清单中声明 `openclaw.setupFeatures.configPromotion: true`。 Doctor 通过插件清单发现捆绑和安装插件的条目，包括禁用的插件。仅设置插件表面和完整通道插件必须公开相同的声明。

对于插件拥有的根布局，还要在 `package.json` 中声明 `openclaw.setupFeatures.configPromotion: "preserve-root"`。 Doctor 读取已安装和捆绑的插件（包括禁用的插件）的静态声明，而不执行其运行时。省略声明或使用 `false` 并不表示选择退出促销。运行时声明属于传递给 `defineChannelSetupContract` 的适配器，并涵盖共享 CLI、声明性向导和策略编写器升级。它不会更改显式迁移基本名称的帮助程序。当根保留隐式身份时，使用选定帐户编写器。 Buzz 就是这种布局的一个例子。

调用 `moveSingleAccountChannelSectionToDefaultAccount(...)` 时，如果已经解析出插件，请将其设置适配器作为 `setupSurface` 传入。调用方提供的设置界面优先于已加载和内置的查找结果，这使得作用域插件或仅供设置使用的插件不依赖全局注册。

<Note>
Matrix 是当前捆绑的示例。如果已存在一个名为 Matrix 的帐户，或者如果 `defaultAccount` 指向现有的自定义密钥（例如 `Ops`），则升级会保留该帐户，而不是创建新的 `accounts.default` 条目。
</Note>

## <a id="config-schema"></a> 配置模式

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

### <a id="building-channel-config-schemas"></a> 构建频道配置 Schema

使用 `buildChannelConfigSchema` 将 Zod schema 转换为插件拥有的配置工件所使用的 `ChannelConfigSchema` 包装器：

```typescript
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";
import { z } from "zod";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

如果您已将合约编写为 JSON Schema 或 TypeBox，请使用直接帮助程序，以便 OpenClaw 可以跳过元数据路径上的 Zod 到 JSON-Schema 转换：

```typescript
import { buildJsonChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";
import { Type } from "typebox";

const configSchema = buildJsonChannelConfigSchema(
  Type.Object({
    token: Type.Optional(Type.String()),
    allowFrom: Type.Optional(Type.Array(Type.String())),
  }),
);
```

对于第三方插件，冷路径契约仍然是插件 manifest：将生成的 JSON Schema 镜像到 `openclaw.plugin.json#channelConfigs`，这样配置 schema、设置和 UI 界面就可以在不加载运行时代码的情况下检查 `channels.<id>`。

## <a id="setup-wizards"></a> 安装向导

通道插件可以为 `openclaw onboard` 提供交互式设置向导。该向导是 `ChannelPlugin` 上的 `ChannelSetupWizard` 对象：

```typescript
import type { ChannelSetupWizard } from "openclaw/plugin-sdk/channel-setup";

const setupWizard: ChannelSetupWizard = {
  channel: "my-channel",
  status: {
    configuredLabel: "Connected",
    unconfiguredLabel: "Not configured",
    resolveConfigured: ({ cfg }) => Boolean((cfg.channels as any)?.["my-channel"]?.token),
  },
  credentials: [
    {
      inputKey: "token",
      providerHint: "my-channel",
      credentialLabel: "Bot token",
      preferredEnvVar: "MY_CHANNEL_BOT_TOKEN",
      envPrompt: "Use MY_CHANNEL_BOT_TOKEN from environment?",
      keepPrompt: "Keep current token?",
      inputPrompt: "Enter your bot token:",
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

在持久设置效果之前，请等待 `options.beforePersistentEffect?.()` 运行主机准备。托管通道向导还提供 `options.assertPersistentEffectCurrent`，这是实时向导所有者的同步检查。通过异步凭证准备进行该检查，并在存储所有者的最终写入许可时调用它。分离的 QR 登录回调必须在其向导被处置、替换或完成后停止；成功的早期准备检查并不能让该向导保持活力。此可选的生命周期检查不会取代现有的异步准备回调。

<AccordionGroup>
  <Accordion id="shared-allowfrom-prompts" title="共享的allowFrom提示">
    对于仅需要标准 `note -> prompt -> parse -> merge -> patch` 流程的 DM 白名单提示，首选来自 `openclaw/plugin-sdk/setup` 的共享设置帮助程序：`createPromptParsedAllowFromForAccount(...)` 和 `createTopLevelChannelParsedAllowFromPrompt(...)`。
  </Accordion>
  <Accordion id="standard-channel-setup-status" title="标准通道设置状态">
    对于仅因标签、分数和可选额外行而变化的通道设置状态块，更喜欢 `openclaw/plugin-sdk/setup` 中的 `createStandardChannelSetupStatus(...)`，而不是在每个插件中手动滚动相同的 `status` 对象。
  </Accordion>
  <Accordion id="optional-channel-setup-surface" title="可选通道设置表面">
    对于仅应出现在某些上下文中的可选设置表面，请使用 `openclaw/plugin-sdk/channel-setup` 中的 `createOptionalChannelSetupSurface`：

    ```typescript
    import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";

    const setupSurface = createOptionalChannelSetupSurface({
      channel: "my-channel",
      label: "My Channel",
      npmSpec: "@myorg/openclaw-my-channel",
      docsPath: "/channels/my-channel",
    });
    // Returns { setupAdapter, setupWizard }
    ```

    当你只需要这个可选安装界面的其中一半时，`plugin-sdk/channel-setup` 也提供更底层的 `createOptionalChannelSetupAdapter(...)` 和 `createOptionalChannelSetupWizard(...)` 构建器。

    生成的可选 adapter/wizard 拒绝实际配置写入。它们在 `validateInput`、`applyAccountConfig` 和 `finalize` 中重复使用一条安装所需的消息，并在设置 `docsPath` 时附加文档链接。

  </Accordion>
  <Accordion id="binary-backed-setup-helpers" title="二进制支持的设置助手">
    对于二进制支持的设置 UI，更喜欢共享委托助手，而不是将相同的 binary/status 胶水复制到每个通道中：

    - `createDetectedBinaryStatus(...)`：用于仅在标签、提示、分数和二进制检测方面有所不同的状态块
    - `createCliPathTextInput(...)`：用于基于路径的文本输入
    - `createDelegatedSetupWizardProxy(...)`：当 `setupEntry` 需要将状态、准备或完成行为延迟转发给更完整的安装向导时使用
    - `createDelegatedTextInputShouldPrompt(...)`：当 `setupEntry` 只需要委派 `textInputs[*].shouldPrompt` 的判断时使用

  </Accordion>
</AccordionGroup>

## <a id="publishing-and-installing"></a> 发布与安装

**外部插件：** 发布到 [ClawHub](/clawhub)，然后安装：

<Tabs>
  <Tab title="npm">
    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    从 npm 安装裸包规范，除非名称与捆绑或官方插件 ID 匹配，在这种情况下，OpenClaw 使用 local/official 副本。使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:` 显式选择源 — 请参阅 [ 管理插件](/plugins/manage-plugins)。

  </Tab>
  <Tab id="clawhub-only" title="仅限 ClawHub">
    ```bash
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```
  </Tab>
  <Tab id="npm-package-spec" title="npm 封装规格">
    当软件包尚未移动到 ClawHub 时，或者在迁移期间需要直接 npm 安装路径时，请使用 npm：

    ```bash
    openclaw plugins install npm:@myorg/openclaw-my-plugin
    ```

  </Tab>
</Tabs>

**In-repo 插件：** 放置在捆绑的插件工作区树下。它们是在构建过程中自动发现的。

<Info>
对于 npm-sourced 安装，`openclaw plugins install` 会将软件包安装到 `~/.openclaw/npm/projects` 下的每个插件项目中，并禁用生命周期脚本 （`--ignore-scripts`）。保持插件依赖树纯粹的 JS/TS 并避免需要 `postinstall` 构建的包。
</Info>

<Note>
网关启动时不安装插件依赖项。 npm/git/ClawHub 安装流程自身的依赖性收敛。本地插件必须已安装其依赖项。
</Note>

捆绑包元数据是显式的，不是从网关启动时构建的 JavaScript 推断出来的。运行时依赖项属于拥有它们的插件包。打包的 OpenClaw 启动永远不会修复或镜像插件依赖项。

### <a id="clawhub-publishing"></a> ClawHub 发布

技能和插件包使用单独的 ClawHub 发布命令。对于插件包，请使用特定于包的命令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

<Note>
`clawhub skill publish <path>` 是发布技能文件夹的不同命令，而不是插件包。请参阅 ClawHub](/clawhub/publishing) 上的 [ 发布。
</Note>

## <a id="related"></a> 相关内容

- [构建插件](/plugins/building-plugins) — 分步入门指南
- [插件清单](/plugins/manifest) — 完整清单架构参考
- [SDK 入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry`。
- [插件 SDK 概述](/plugins/sdk-overview) — 导入地图和注册 API 参考
- [Plugin SDK 子路径](/plugins/sdk-subpaths) — 公共入口点目录
- [插件架构内部](/plugins/architecture-internals) — 加载管道和注册表模型
