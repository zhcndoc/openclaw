---
summary: "插件清单 + JSON schema 要求（严格配置校验）"
read_when:
  - "你正在构建一个 OpenClaw 插件"
  - "你需要发布插件配置 schema 或调试插件校验错误"
title: "插件清单"
---

本页介绍 **原生 OpenClaw 插件清单** `openclaw.plugin.json`。有关兼容的 bundle 布局（Agent Plugins、Codex、Claude、Cursor），请参见[插件 bundle](/plugins/bundles)。

兼容的 bundle 格式使用各自的清单文件：

- Agent Plugins bundle：包根目录中的 `plugin.json`，遵循开放的 [Agent Plugins 标准](https://agent-plugins.org)
- Codex 捆绑包：`.codex-plugin/plugin.json`
- Claude bundle：`.claude-plugin/plugin.json`，或不使用清单的默认 Claude 组件布局
- 光标包：`.cursor-plugin/plugin.json`

OpenClaw 自动检测这些布局，但不会根据下面的 `openclaw.plugin.json` 架构验证它们。对于兼容捆绑包，当布局与 OpenClaw 的运行时预期匹配时，OpenClaw 会读取捆绑包元数据、声明的技能根、Claude 命令根、Claude `settings.json` 默认值、Claude LSP 默认值和支持的挂钩包。

每个原生 OpenClaw 插件**必须**在**插件根目录**中提供 `openclaw.plugin.json`。OpenClaw 会读取它来验证配置，**不会执行插件代码**。缺失或无效的清单会阻止配置校验，并被视为插件错误。

有关完整的插件系统指南，请参见 [插件](/tools/plugin)；有关原生能力模型和当前外部兼容性说明，请参见 [能力模型](/plugins/architecture#public-capability-model)。

## <a id="what-this-file-does"></a> 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在**加载插件代码之前**读取的元数据文件。其中的所有内容都必须足够轻量，以便在不启动插件运行时的情况下完成检查。

**用于：**

- 插件身份、配置验证和配置 UI 提示
- 身份验证、入门引导和设置元数据（别名、自动启用、提供商环境变量、身份验证选项）
- 控制平面界面的激活提示
- root CLI 命令名称、说明和子命令标记 （`cliCommands`）
- 模型系列所有权简写
- 静态能力所有权快照（`contracts`）
- 仪表板组件数据绑定和操作动词
- 插件启用期间应存在的静态 MCP 服务器
- 持久且可再生的状态或代理相关备份资源
- 共享 [`openclaw qa`](/concepts/qa-e2e-automation) 主机可以检查的 QA 运行程序元数据
- 合并到目录和验证界面中的频道专属配置元数据

**请勿将其用于：** 注册本机运行时挂钩、声明完整插件运行时入口点或 npm 安装元数据。这些属于您的插件代码和 `package.json`。

## <a id="where-each-field-is-documented"></a> 其中记录了每个字段

每个清单字段都记录在此页面或下面的七个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="model-fields"></a> 模型字段

[Manifest 模型字段](/plugins/manifest/models) — Manifest 模型目录、速记族、id 规范化和定价字段。

- <a id="modelsupport-reference"></a>[`modelSupport`](/plugins/manifest/models#modelsupport-reference)
- <a id="modelcatalog-reference"></a>[`modelCatalog`](/plugins/manifest/models#modelcatalog-reference)
- <a id="modelidnormalization-reference"></a>[`modelIdNormalization`](/plugins/manifest/models#modelidnormalization-reference)
- <a id="modelpricing-reference"></a>[`modelPricing`](/plugins/manifest/models#modelpricing-reference)
- <a id="openclaw-provider-index"></a>[OpenClaw 提供商 Index](/plugins/manifest/models#openclaw-provider-index)

### <a id="provider-fields"></a> Provider 字段

[Manifest 提供者字段](/plugins/manifest/providers) — 清单生成、媒体理解、端点和请求提供者元数据。

- <a id="generation-provider-metadata-reference"></a>[`imageGenerationProviderMetadata`, `videoGenerationProviderMetadata`, `musicGenerationProviderMetadata`](/plugins/manifest/providers#generation-provider-metadata-reference)
- <a id="mediaunderstandingprovidermetadata-reference"></a>[`mediaUnderstandingProviderMetadata`](/plugins/manifest/providers#mediaunderstandingprovidermetadata-reference)
- <a id="providerendpoints-reference"></a>[`providerEndpoints`](/plugins/manifest/providers#providerendpoints-reference)
- <a id="providerrequest-reference"></a>[`providerRequest`](/plugins/manifest/providers#providerrequest-reference)

### <a id="setup-and-auth-fields"></a> Setup 和 auth 字段

[Manifest 设置和身份验证字段](/plugins/manifest/setup-and-auth) — Manifest 设置描述符、身份验证选择、对话发现和配置 UI 提示。

- <a id="native-conversation-discovery"></a>[`setup.nativeSessionCatalog`](/plugins/manifest/setup-and-auth#native-conversation-discovery)
- <a id="providerauthchoices-reference"></a>[`providerAuthChoices`](/plugins/manifest/setup-and-auth#providerauthchoices-reference)
- <a id="setup-reference"></a>[`setup`, `providerUsageAuthEnvVars`](/plugins/manifest/setup-and-auth#setup-reference)
- <a id="setup.providers-reference"></a><a id="setup-providers-reference"></a>[`setup.providers`](/plugins/manifest/setup-and-auth#setup-providers-reference)
- <a id="setup-fields"></a>[`setup` 字段表](/plugins/manifest/setup-and-auth#setup-fields)
- [`configGroups`](/plugins/manifest/setup-and-auth#configgroups-reference)
- <a id="uihints-reference"></a>[`uiHints`](/plugins/manifest/setup-and-auth#uihints-reference)

### <a id="capability-fields"></a> 能力字段

[清单功能字段](/plugins/manifest/capabilities) - 清单功能所有权、工具可用性元数据和激活计划。

- <a id="contracts-reference"></a>[`contracts`](/plugins/manifest/capabilities#contracts-reference)
- [`decisionModels`](/plugins/manifest/capabilities#decision-models-reference)
- <a id="tool-metadata-reference"></a>[`toolMetadata`](/plugins/manifest/capabilities#tool-metadata-reference)
- <a id="activation-reference"></a>[`activation`](/plugins/manifest/capabilities#activation-reference)

### <a id="host-surface-fields"></a> 主机面场

[清单主机表面字段](/plugins/manifest/surfaces) — 图标、CLI、MCP、Control UI、仪表板、QA、通道和备份表面的清单字段。

- <a id="plugin-icon"></a>[插件图标、`doctorContract`、`doctorHealthChecks`、`sessionRouteStateOwners`](/plugins/manifest/surfaces#plugin-icon)
- <a id="transcript-sources-reference"></a>[`transcriptSources`](/plugins/manifest/surfaces#transcript-sources-reference)
- <a id="backupresources-reference"></a>[`backupResources`](/plugins/manifest/surfaces#backupresources-reference)
- <a id="mcp-server-reference"></a>[`mcpServers`](/plugins/manifest/surfaces#mcp-server-reference)
- [`uiCapabilities`](/plugins/manifest/surfaces#ui-capabilities)
- <a id="controlui-reference"></a>[`controlUi`](/plugins/manifest/surfaces#controlui-reference)
- [`themes`](/plugins/manifest/surfaces#themes)
- <a id="dashboard-reference"></a>[`dashboard`](/plugins/manifest/surfaces#dashboard-reference)
- <a id="catalog-reference"></a>[`catalog`](/plugins/manifest/surfaces#catalog-reference)
- <a id="clicommands-reference"></a>[`cliCommands`](/plugins/manifest/surfaces#clicommands-reference)
- <a id="commandaliases-reference"></a>[`commandAliases`](/plugins/manifest/surfaces#commandaliases-reference)
- <a id="qarunners-reference"></a>[`qaRunners`](/plugins/manifest/surfaces#qarunners-reference)
- <a id="channelconfigs-reference"></a>[`channelConfigs`](/plugins/manifest/surfaces#channelconfigs-reference)
- [`channelAccountKeyPolicies`](/plugins/manifest/surfaces#channelaccountkeypolicies-reference)
- <a id="replacing-another-channel-plugin"></a>[`channelConfigs.<id>.preferOver`](/plugins/manifest/surfaces#replacing-another-channel-plugin)

### <a id="config-and-secret-fields"></a> 配置和秘密字段

[Manifest 配置和秘密字段](/plugins/manifest/config-and-secrets) — 清单危险标记、SecretRef 迁移和秘密提供程序预设元数据。

- <a id="configcontracts-reference"></a>[`configContracts`](/plugins/manifest/config-and-secrets#configcontracts-reference)
- <a id="secretproviderintegrations-reference"></a>[`secretProviderIntegrations`](/plugins/manifest/config-and-secrets#secretproviderintegrations-reference)

### <a id="manifest-and-package.json-fields"></a><a id="manifest-and-package-json-fields"></a> Manifest 和 package.json 字段

[Manifest 与 package.json](/plugins/manifest/package-json) — 哪个运行前元数据位于 package.json 中，哪个重复的插件 ID 获胜。

- <a id="manifest-versus-package.json"></a><a id="manifest-versus-package-json"></a>[Manifest 与 `package.json`](/plugins/manifest/package-json#manifest-versus-package-json)
- <a id="package.json-fields-that-affect-discovery"></a><a id="package-json-fields-that-affect-discovery"></a>[`package.json#openclaw` 字段](/plugins/manifest/package-json#package-json-fields-that-affect-discovery)
- <a id="discovery-precedence-(duplicate-plugin-ids)"></a><a id="discovery-precedence-duplicate-plugin-ids"></a>[发现优先级](/plugins/manifest/package-json#discovery-precedence-duplicate-plugin-ids)

## <a id="minimal-example"></a> 最小示例

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

## <a id="rich-example"></a> 丰富示例

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "description": "OpenRouter provider plugin",
  "version": "1.0.0",
  "providers": ["openrouter"],
  "modelSupport": {
    "modelPrefixes": ["router-"]
  },
  "modelIdNormalization": {
    "providers": {
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  },
  "providerEndpoints": [
    {
      "endpointClass": "openrouter",
      "hostSuffixes": ["openrouter.ai"]
    }
  ],
  "providerRequest": {
    "providers": {
      "openrouter": {
        "family": "openrouter"
      }
    }
  },
  "cliBackends": ["openrouter-cli"],
  "syntheticAuthRefs": ["openrouter-cli"],
  "setup": {
    "providers": [
      {
        "id": "openrouter",
        "envVars": ["OPENROUTER_API_KEY"]
      }
    ]
  },
  "providerAuthAliases": {
    "openrouter-coding": "openrouter"
  },
  "providerAuthChoices": [
    {
      "provider": "openrouter",
      "method": "api-key",
      "choiceId": "openrouter-api-key",
      "choiceLabel": "OpenRouter API key",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API key",
      "onboardingScopes": ["text-inference"]
    }
  ],
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": {
        "type": "string"
      }
    }
  }
}
```

## <a id="top-level-field-reference"></a> 顶层字段参考

| 字段                                | 必需的 | 类型                         | 含义                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是      | `string`                     | 主要插件 ID。这是 `plugins.entries.<id>` 中使用的 id。例外：`package.json` 声明多个插件条目的包将每个条目注册为 `<id>/<entry-basename>`（例如 `pack/one`），并且该条目范围的 id 是该条目的 `plugins.entries` 键。条目基本名称在包内必须是唯一的；冲突的基名在发现时会被拒绝。 |
| `configSchema`                       | 是      | `object`                     | 此插件配置的内联 JSON Schema。                                                                                                                                                                                                                                                                                                                                                   |
| `requiresPlugins`                    | No       | `string[]`                   | 还必须安装插件 ID 才能使该插件生效。 Discovery 保持插件可加载，但在缺少任何所需插件时发出警告。                                                                                                                                                                                                                                   |
| `enabledByDefault`                   | No       | `true`                       | 将捆绑插件标记为默认启用。省略此字段，或将其设置为任何非 `true` 的值，则插件默认保持禁用。                                                                                                                                                                                                                                                                   |
| `enabledByDefaultOnPlatforms`        | No       | `string[]`                   | 仅在列出的 Node.js 平台上将捆绑插件标记为默认启用，例如 `["darwin"]`。显式配置优先。                                                                                                                                                                                                                                                       |
| `legacyPluginIds`                    | No       | `string[]`                   | 标准化为此主要插件 ID 的旧 ID。                                                                                                                                                                                                                                                                                                                                           |
| `autoEnableWhenConfiguredProviders`  | No       | `string[]`                   | 当 auth、config 或 model refs 提到它们时，应自动启用此插件的提供者 ID。                                                                                                                                                                                                                                                                                                |
| `kind`                               | No       | `PluginKind \| PluginKind[]` | 声明 [`plugins.slots.*`](/gateway/configuration-reference#plugins) 使用的一种或多种专有插件类型（`"memory"`、`"context-engine"`）。拥有两个插槽的插件会在一个数组中声明这两种插槽。                                                                                                                                                                            |
| `channels`                           | No       | `string[]`                   | 该插件拥有的频道 ID。用于发现和配置验证。                                                                                                                                                                                                                                                                                                                    |
| `providers`                          | No       | `string[]`                   | 该插件拥有的提供者 ID。                                                                                                                                                                                                                                                                                                                                                             |
| `providerCatalogEntry`               | No       | `string`                     | 轻量级提供商目录模块路径，相对于插件根目录，用于提供商清单范围内的目录元数据；无需激活完整插件运行时即可加载这些元数据。                                                                                                                                                                                                            |
| `capabilityCatalogEntry`             | No       | `string`                     | 相对于插件根的键入语音、实时转录和实时语音提供者描述符的轻量级模块。请参阅 [ 功能目录](#capability-catalogs)。                                                                                                                                                                                                             |
| `modelSupport`                       | No       | `object`                     | 由清单拥有的模型系列元数据简写，用于在运行时之前自动加载插件。                                                                                                                                                                                                                                                                                                    |
| `modelCatalog`                       | No       | `object`                     | 由提供商声明的模型目录元数据。此元数据是未来只读列表、引导流程、模型选择器、别名和抑制功能的控制平面契约，无需加载插件运行时。                                                                                                                                                                    |
| `modelPricing`                       | No       | `object`                     | 提供商拥有的托管定价发布政策。使用它可以从已发布的定价中选择 local/self-hosted 提供商，或将提供商参考映射到支持的公共定价目录，而无需在核心中对提供商 ID 进行硬编码。                                                                                                                                                                        |
| `modelIdNormalization`               | No       | `object`                     | 提供程序拥有的模型 ID alias/prefix 清理必须在提供程序运行时加载之前运行。                                                                                                                                                                                                                                                                                                      |
| `providerEndpoints`                  | No       | `object[]`                   | 清单拥有的端点 host/baseUrl 提供程序路由的元数据，核心必须在提供程序运行时加载之前进行分类。                                                                                                                                                                                                                                                                       |
| `managesOwnAvailability`             | No       | `boolean`                    | 声明该插件的提供者管理自己的速率限制和过载恢复。仅绕过临时容量冷却；身份验证、计费和订阅块仍然强制执行。在插件运行时加载之前从元数据中读取。                                                                                                                                     |
| `providerRequest`                    | No       | `object`                     | 用于通用请求策略的轻量级提供商系列和请求兼容性元数据，在提供商运行时加载之前使用。                                                                                                                                                                                                                                                                         |
| `secretProviderIntegrations`         | No       | `Record<string, object>`     | 设置或安装表面可以提供声明性 [SecretRef](/gateway/secrets) 执行提供程序预设，而无需在核心中对提供程序特定的集成进行硬编码。                                                                                                                                                                                                                            |
| `cliBackends`                        | No       | `string[]`                   | CLI 此插件拥有的推理后端 ID。用于从显式配置引用启动自动激活。                                                                                                                                                                                                                                                                                    |
| `syntheticAuthRefs`                  | No       | `string[]`                   | 提供程序或 CLI 后端引用，其插件拥有的合成身份验证挂钩应在运行时加载之前在冷模型发现期间进行检查。                                                                                                                                                                                                                                                        |
| `nonSecretAuthMarkers`               | No       | `string[]`                   | 由捆绑插件拥有的占位 API 密钥值，用于表示非机密的本地、OAuth 或环境凭据状态。                                                                                                                                                                                                                                                                           |
| `commandAliases`                     | No       | `object[]`                   | 此插件拥有的命令名称；在运行时加载之前，这些命令应生成针对插件的配置和 CLI 诊断信息。                                                                                                                                                                                                                                                                           |
| `cliCommands`                        | No       | `object[]`                   | 加载插件代码之前，`openclaw --help` 中显示的根 CLI 命令。每行需要 `name`、`description` 和 `hasSubcommands`。                                                                                                                                                                                                                                                          |
| `providerUsageAuthEnvVars`           | No       | `Record<string, string[]>`   | Usage/billing-only 提供商凭据。 OpenClaw 使用这些名称进行使用发现和秘密清理，但绝不会用于推理验证。                                                                                                                                                                                                                                                      |
| `providerAuthAliases`                | No       | `Record<string, AuthAlias>`  | 重用另一个提供商进行身份验证查找的提供商 ID。 `baseUrls` 条件仅在该提供商配置的端点匹配时适用；存储的凭证保留其提供者身份。                                                                                                                                                                                             |
| `providerAuthChoices`                | No       | `object[]`                   | 用于引导选择器、首选提供商解析和简单 CLI 标志连接的轻量级身份验证选项元数据。                                                                                                                                                                                                                                                                                  |
| `activation`                         | No       | `object`                     | 用于启动、提供商、命令、频道、路由和能力触发加载的轻量级激活规划器元数据。仅包含元数据；插件运行时仍负责实际行为。                                                                                                                                                                                                                  |
| `backupResources`                    | No       | `object[]`                   | 清单拥有的持久或可再生的状态或代理相关备份资源。仅适用于有效激活的、可加载的插件，而不执行其运行时。请参阅 [ 备份资源参考 ](/plugins/manifest/surfaces#backupresources-reference)。                                                                                                                              |
| `setup`                              | No       | `object`                     | 廉价的 setup/onboarding 描述符，发现和设置表面可以在不加载插件运行时的情况下进行检查。                                                                                                                                                                                                                                                                               |
| `doctorContract`                     | No       | `object`                     | 声明插件构件导出的动态 doctor 契约界面，使 doctor 仅加载相关模块。                                                                                                                                                                                                                                                                             |
| `doctorHealthChecks`                 | No       | `boolean`                    | 在所选插件的公共 API 中声明健康检查注册。由Codex医生健康API阅读。                                                                                                                                                                                                                                                                                   |
| `sessionRouteStateOwners`            | No       | `object[]`                   | 用于 doctor 清理的静态会话路由所有权。每个条目声明一个 `id`、`label`，以及可选的 `providerIds`、`runtimeIds`、`cliSessionKeys` 和 `authProfilePrefixes`。                                                                                                                                                                                                                |
| `qaRunners`                          | No       | `object[]`                   | 共享的 `openclaw qa` 主机使用的轻量级 QA 运行器描述符，在插件运行时加载之前使用。                                                                                                                                                                                                                                                                                                 |
| `uiCapabilities`                     | No       | `string[]`                   | 静态 UI 贡献类型显示在插件的功能部分，无需激活。省略是指未指定； `[]` 声明无。请参阅 [UI 功能](/plugins/manifest/surfaces#ui-capabilities)。                                                                                                                                                                             |
| `dashboard`                          | No       | `object`                     | 仪表板小部件数据绑定和动作动词。每个条目都会根据此插件注册的具有所需读取或写入范围的网关方法进行验证。请参阅 [ 仪表板参考 ](/plugins/manifest/surfaces#dashboard-reference)。                                                                                                                                                  |
| `mcpServers`                         | No       | `Record<string, object>`     | 启用此插件时贡献静态 MCP 服务器定义。相对命令参数和工作目录从插件根解析。运算符 `mcp.servers` 条目覆盖或禁用具有相同名称的定义。请参阅 [MCP 服务器参考 ](/plugins/manifest/surfaces#mcp-server-reference)。                                                                       |
| `themes`                             | No       | `object[]`                   | 静态主题 ID、名称、描述和插件相关 JSON 源。启用的插件有助于共享设置和代理主题目录；插件重新加载会刷新调色板编辑，而无需重新启动网关。请参阅 [ 主题](/plugins/manifest/surfaces#themes)。                                                                                                                          |
| `contracts`                          | No       | `object`                     | 外部身份验证挂钩、嵌入、语音、实时转录、实时语音、媒体理解、image/video/music 生成、Web 获取、Web 搜索、工作人员提供程序、document/web-content 提取和工具所有权的静态功能所有权快照。                                                                                                                     |
| `transcriptSources`                  | No       | `Record<string, object>`     | `contracts.transcriptSourceProviders` 中声明的 ID 的静态转录源名称和自动启动定位器要求。请参阅 [ 转录来源参考 ](/plugins/manifest/surfaces#transcript-sources-reference)。                                                                                                                                                                     |
| `configContracts`                    | No       | `object`                     | 通用核心助手使用的清单拥有的配置行为：危险标记检测、SecretRef 迁移目标和遗留配置路径缩小。请参阅 [config 合同参考 ](/plugins/manifest/config-and-secrets#configcontracts-reference)。                                                                                                                                     |
| `mediaUnderstandingProviderMetadata` | No       | `Record<string, object>`     | `contracts.mediaUnderstandingProviders` 中声明的提供商 ID 的廉价媒体理解默认值。                                                                                                                                                                                                                                                                                       |
| `imageGenerationProviderMetadata`    | No       | `Record<string, object>`     | 在 `contracts.imageGenerationProviders` 中声明的提供者 ID 的廉价图像生成身份验证元数据，包括提供者拥有的身份验证别名和基本 URL 防护。                                                                                                                                                                                                                             |
| `videoGenerationProviderMetadata`    | No       | `Record<string, object>`     | `contracts.videoGenerationProviders` 中声明的提供商 ID 的廉价视频生成身份验证元数据，包括提供商拥有的身份验证别名和基本 URL 防护。                                                                                                                                                                                                                             |
| `musicGenerationProviderMetadata`    | No       | `Record<string, object>`     | `contracts.musicGenerationProviders` 中声明的提供商 ID 的廉价音乐生成身份验证元数据，包括提供商拥有的身份验证别名和基本 URL 防护。                                                                                                                                                                                                                             |
| `toolMetadata`                       | No       | `Record<string, object>`     | `contracts.tools` 中声明的插件自有工具的轻量级可用性元数据。当某个工具只有在存在配置、环境或身份验证证据时才应加载运行时时使用。                                                                                                                                                                                                                      |
| `channelConfigs`                     | No       | `Record<string, object>`     | 由清单拥有的频道配置元数据，在加载运行时之前合并到发现和验证界面中。                                                                                                                                                                                                                                                                                     |
| `channelAccountKeyPolicies`          | No       | `Record<string, object>`     | 存储已声明通道的帐户密钥选择规则。请参阅 [ 帐户密钥策略](/plugins/manifest/surfaces#channelaccountkeypolicies-reference)。                                                                                                                                                                                                                                          |
| `skills`                             | No       | `string[]`                   | 要加载的技能目录，相对于插件根目录。                                                                                                                                                                                                                                                                                                                                        |
| `name`                               | No       | `string`                     | 人类可读的插件名称。                                                                                                                                                                                                                                                                                                                                                                    |
| `description`                        | No       | `string`                     | 在插件界面中显示的简短摘要。                                                                                                                                                                                                                                                                                                                                                        |
| `catalog`                            | No       | `object`                     | 插件目录界面可选的展示提示。这些元数据不会安装、启用插件，也不会授予插件信任。                                                                                                                                                                                                                                                                   |
| `categories`                         | No       | `string[]`                   | 一到三个受控目录类别段，首先按主要类别排序。捆绑的插件必须准确声明一个活动类别。                                                                                                                                                                                                                                             |
| `version`                            | No       | `string`                     | 用于提供信息的插件版本。                                                                                                                                                                                                                                                                                                                                                                  |
| `configGroups`                       | No       | `object[]`                   | 作者定义的设置部分，具有唯一的 ID、标题、可选的整数顺序和即时配置属性名称。请参阅 [configGroups](/plugins/manifest/setup-and-auth#configgroups-reference)。                                                                                                                                                                                            |
| `uiHints`                            | No       | `Record<string, object>`     | 配置字段的 UI 标签、占位符和敏感性提示。                                                                                                                                                                                                                                                                                                                              |

`AuthAlias` 可以是提供商 ID 字符串，也可以是具有 `provider` 和 `baseUrls` 的对象。对象别名仅适用于修剪空格和尾部斜杠后配置的模型提供程序端点。它不会重命名存储的凭据提供程序或提供新的设置提供程序。现有的配置文件顺序、显式绑定和插件信任检查仍然适用。

## <a id="catalog-categories"></a> 目录类别

选择最能描述为什么有人会安装该插件的类别。使用其主要用户目的，而不是它公开的每个工具、提供程序或运行时功能。例如，代理执行后端属于 `agent-runtimes`，文档提取属于 `documents-files`，消息传递适配器属于 `channels`，即使它也提供工作区工具。

捆绑的 OpenClaw 插件恰好声明了一个活动类别。新的 ClawHub 出版物还使用相同的数组形状仅接受一个声明的类别，或者省略 ClawHub 的字段以生成类别。

OpenClaw 目录浏览还可以从启用的本地已知插件的 `imageGenerationProviders`、`videoGenerationProviders` 或 `musicGenerationProviders` 合约中获取媒体成员身份。这使得模型插件在媒体下保持可发现性，而无需在其清单中添加第二个用途类别。网关将这些仅显示的成员资格作为 `capabilityCategories`，与声明的 `categories` 分开，并在将本地条目与托管目录卡连接时将它们组合起来。相同的连接适用于后面的页面；类别排名、身份和托管光标仍属于其现有所有者。没有本地清单事实的仅远程条目保留注册表的类别。仅语音或转录并不能添加媒体成员资格。

禁用的插件仅保留其声明的类别。这些成员资格不会安装或启用插件、授予权限或更改提供商选择。

OpenClaw 的清单读取器继续接受一到三个独特的有序类别，因此以前安装和发布的包仍然可读。当阅读旧的多类别声明时，第一个仍然是主要的，并且所有类别仍然是可搜索的。更严格的新发布规则不会使已安装插件的清单无效。

以下活动类别按浏览顺序列出：

| 蛞蝓                  | 用途                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels`            | 人工代理消息传输和通道适配器。当主要目的是让人们通过消息服务与代理对话时选择此选项，即使适配器还公开工作区工具。                                 |
| `models`              | 通用模型提供程序、推理后端和模型路由。 Agent执行引擎属于Agent运行时；专门的语音或媒体生成器属于语音或媒体，因为这是它们的主要用途。                          |
| `agent-runtimes`      | 运行 model/tool 循环并管理本机会话的代理执行引擎和后端，包括 Codex、ACP 和 Copilot 运行时。 Context组件属于Context；跨代理的协调工作属于代理编排。 |
| `memory`              | 跨对话的持久代理记忆、嵌入和检索。构建或压缩活动对话上下文属于上下文。                                                                                            |
| `context`             | 构建、选择、压缩或管理活动对话上下文。持久内存属于Memory；运行代理并拥有其本机会话的引擎属于代理运行时。                                       |
| `voice`               | 语音合成、转录、语音通话和语音交互。音乐和一般媒体创作或分析属于媒体。                                                                                                         |
| `web`                 | 一般网络搜索、爬行和获取网页。主要目的是特定研究或业务工作流程的工具属于该工作流程的类别。                                                                            |
| `computer-use`        | 交互式桌面和浏览器导航、单击、键入和屏幕截图。托管执行环境属于基础设施；网络搜索和爬行属于Web。                                                             |
| `media`               | 创建、转换或理解图像、视频、音乐和其他媒体。语音交互和转录属于语音。                                                                                                       |
| `security`            | 通过身份验证、授权、凭证控制、安全审核或策略来保护访问并加强信任。与其他目的相关的身份验证不属于此处。                                          |
| `integrations`        | 通用连接器、API 桥接器以及没有更具体用户用途的服务集成平台。特定工作流程的连接器属于该工作流程的类别；暴露工具或 MCP 是不够的。                     |
| `developer-tools`     | 编写、审查、测试和调试软件、开发环境和编码工作流程。主要目的是提供代理执行引擎的插件属于代理运行时。                                           |
| `infrastructure`      | 部署、托管、监控和操作系统、网络、服务和执行环境。运行代理循环的引擎属于代理运行时；协调代理属于代理编排。                        |
| `documents-files`     | 读取、创建、提取、传输和管理文档和文件。软件代码审查属于开发者工具；任务和项目管理属于生产力。                                                        |
| `inbox-collaboration` | 管理电子邮件、收件箱、团队沟通和协作工作空间。为人们与代理交谈提供传输属于通道。                                                                                       |
| `productivity`        | 管理任务、笔记、项目、计划以及个人或团队工作。约会和可用性属于日程安排；文档处理属于文档和文件。                                                                    |
| `scheduling`          | 日历、约会、可用性和预订。技术作业调度属于其支持的工作流程，或用于一般系统调度的基础设施。                                                                        |
| `finance-payments`    | 付款、计费、会计、银行、交易和财务工作流程。一般业务报告属于数据和分析。                                                                                                           |
| `sales-marketing`     | 客户关系、销售、客户支持、外展、活动和营销运营。一般电子邮件或聊天管理属于收件箱和协作。                                                                          |
| `data-analytics`      | 查询数据库、处理数据集、分析、报告和商业智能。 Agent内存存储属于Memory；操作遥测属于基础设施。                                                           |
| `agent-orchestration` | 协调代理、委派工作以及运行多步骤代理工作流程。执行代理循环并管理其本机会话的引擎和后端属于代理运行时。                                                     |
| `research`            | 调查主题、评估来源、研究科学文献并综合证据。一般的网页搜索和页面抓取都属于Web；交互式浏览器控件属于计算机使用。                           |
| `other`               | 仅当插件的主要用途不适合其他类别或可用证据不足时才使用。不要仅仅因为插件有多种功能就使用它。                                                            |

旧版 `tools`、`runtime` 和 `gateway` 声明仍然有效，因此现有包会继续加载。它们已从活跃的浏览分类中退休。为新声明选择有效类别；遗留值不会自动转换为不同的类别。

对于外部插件兼容性，省略仍然有效。当外部目录提供派生后备时，显式包声明优先。捆绑的 OpenClaw 插件必须声明一个活动类别。

## <a id="json-schema-requirements"></a> JSON Schema 要求

- **每个插件都必须提供 JSON Schema**，即使它不接受任何配置。
- 空 schema 是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Config 在配置 read/write 时间和插件加载之前根据清单模式进行验证。
- Local `$ref` JSON 指针片段支持 URI 百分比编码，包括编码的 `/` 分隔符。在解析指针标记之前，片段会被解码一次；使用 `~1` 作为键内的斜线，使用 `~0` 作为波形符。
- 当使用新的配置密钥扩展或分叉捆绑插件时，请同时更新该插件的 `openclaw.plugin.json` `configSchema`。捆绑的插件模式是严格的，因此在用户配置中添加 `plugins.entries.<id>.config.myNewKey` 而不将 `myNewKey` 添加到 `configSchema.properties` 将在插件运行时加载之前被拒绝。

示例 schema 扩展示例：

```json
{
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "myNewKey": {
        "type": "string"
      }
    }
  }
}
```

## <a id="retained-state-checks"></a> 保留状态检查

源插件可能会公开轻量级 `state-retention-api.ts` 及其 Doctor 合约。核心包在外部化插件运行时时单独保留此工件。它使用与 Doctor 相同的 `defineRetiredPluginStateMigration` 对象导出 `packageName` 和 `stateMigrations`。仅检查源是否存在；它们不得解码、变异或迁移状态。

在更换网关之前，候选更新准入会对选定的官方安装所有者和捆绑所有者运行匹配检查。包名称和迁移 ID 必须与所选所有者的清单声明匹配。外部阴影和残疾安装业主保留自己的合同。禁用捆绑运行时不会禁用这些主机保留的检查或激活插件。准入仅从暂存的候选程序包中读取检查，独立于运行时注册表和捆绑包目录覆盖。检查失败会产生拒绝判决，因此已发布的更新程序会保留正在运行的网关和原始文件，而不是退回到较旧的许可。

## <a id="validation-behavior"></a> 校验行为

### <a id="capability-catalogs"></a> 能力目录

`capabilityCatalogEntry` 声明一个相对于所选插件根的轻量级模块，例如 `"./capability-catalog.ts"`。它导出实际语音、实时转录或实时语音提供者描述符，而无需导入完整的插件条目。请参阅 [ 类型的 SDK 合约 ](/plugins/sdk-subpaths#capability-catalog-entry)。

每个提供的系列都是权威的，包括一个空数组。省略的系列或没有此声明的插件保留已安装插件的现有 `register()` 发现合同。声明的条目格式错误、丢失或损坏，修复诊断失败；它不会完成完整注册。已经注册的运行时提供者仍然具有权威性，包括实时代理和就绪关闭。

该条目使用与其他插件表面相同的插件根边界检查、安装所有者优先级、准备元数据生成和 source/built 工件策略。存储库构建包括声明的条目并将发出的清单路径重写到相应的 JavaScript 工件。插件重新加载失效；目录请求不会轮询文件是否有更改。

### <a id="cloud-worker-profile-suggestions"></a> 云工作人员档案建议

`contracts.workerProfileSuggestions` 列出其插件公开 `worker-profile-api.ts`（或其内置 JavaScript 工件）的工作程序提供者 ID。该工件导出 `discoverWorkerProfile`，从 `openclaw/plugin-sdk/plugin-entry` 键入为 `WorkerProfileSuggestionDiscovery`。它返回建议的配置条目或 `undefined`。

当不存在云配置文件时，网关仅加载此声明的设置表面，即使插件声明 `activation.onStartup: false` 也是如此。插件禁用、允许列表和拒绝列表仍然适用。该工件必须保持轻量级，重用插件生命周期缓存，并避免导入完整的插件条目。 Discovery 可能会检查本地 CLI 配置和机器目录；它不得分配机器或修改配置。当管理员采纳建议时，显式 `refresh` 选项会重新检查发现。

建议不是运行时配置文件。在正常放置可以使用建议之前，网关会通过其配置所有者保存已采纳的建议。现有的配置文件会抑制建议。发现描述的是配置的输入，而不是实时提供者的健康状况；正常分配保留其身份验证和配置检查。

### <a id="configuration-validation"></a> 配置验证

- Settings 验证与清单 ID 匹配，不区分大小写。错误和架构默认值使用创作的设置条目，而不是创建具有不同大小写的第二个条目。
- 必填字段错误会在应用架构默认值后识别每个缺失的字段。对于多个字段的依赖关系，该错误会报告依赖关系条件，但不会声明已存在的字段丢失。
- 未知的 `channels.*` 键是**错误**，除非该 channel id 已由插件清单声明。如果相同的 id 也出现在 `plugins.allow`、`plugins.entries` 或 `plugins.installs` 中（即被引用但当前不可发现的插件），OpenClaw 会将其降级为**警告**。
- 引用未知插件 ID 的 `plugins.entries.<id>`、`plugins.allow` 和 `plugins.deny` 是 **warnings**（“过时的配置条目被忽略”），而不是错误，因此升级和 removed/renamed 插件不会阻止网关启动。确切的 `{ enabled: false }` 插件条目是有意卸载标记，因此验证和 Doctor 会保留它，而不会出现过时配置警告。
- `plugins.slots.memory` 引用未知插件 id 时是**错误**，但已知的 `memory-lancedb` 官方外部插件除外，它会改为警告。
- 如果插件已安装，但清单或 schema 损坏或缺失，校验会失败，Doctor 会报告该插件错误。
- 如果插件配置存在，但插件已**禁用**，配置会被保留，并且 Doctor 和日志中会显示一个**警告**。

有关完整的 `plugins.*` 架构，请参阅 [ 配置参考](/gateway/configuration-reference#plugins)。

## <a id="notes"></a> 说明

- 清单是本机 OpenClaw 插件 **所需的**，包括本地文件系统加载。运行时仍然单独加载插件模块；清单仅用于发现+验证。
- 原生清单使用 JSON5 解析，因此支持注释、尾随逗号和不带引号的键名，只要最终值仍然是一个对象。
- 清单加载器只读取已记录的清单字段。避免使用自定义顶层键。
- 如果插件不需要 `channels`、`providers`、`cliBackends` 和 `skills`，可以全部省略。
- `providerCatalogEntry` 必须保持轻量，不应导入宽泛的运行时代码；应将其用于静态提供商目录元数据或范围狭窄的发现描述，而不是请求时执行。
- 独占插件类型通过 `plugins.slots.*` 选择：`kind: "memory"` 通过 `plugins.slots.memory` 选择（默认为 `memory-core`），`kind: "context-engine"` 通过 `plugins.slots.contextEngine` 选择（默认为 `legacy`）。
- 在此清单中声明专有插件类型。捆绑插件使用清单类型，而无需在启用期间加载其运行时。运行时条目 `OpenClawPluginDefinition.kind` 已于 2026 年 7 月 25 日弃用，仅作为旧外部插件的兼容性回退；其移除时间为 2026 年 10 月 1 日。请参阅 [ 兼容性策略 ](/plugins/sdk-migration/compatibility-policy#compatibility-policy)。
- `setup.providers[].envVars` 中的环境变量元数据仅具有声明性。状态、审计、cron 传递验证及其他只读界面，在将环境变量视为已配置之前，仍会应用插件信任和有效激活策略。
- 对于需要提供商代码的运行时向导元数据，请参阅 [提供商运行时钩子](/plugins/architecture-internals#provider-runtime-hooks)。
- 如果你的插件依赖原生模块，请记录构建步骤以及任何包管理器允许列表要求（例如 pnpm 的 `allow-build-scripts` + `pnpm rebuild <package>`）。

## <a id="related"></a> 相关内容

<CardGroup cols={3}>
  <Card title="构建插件" href="/plugins/building-plugins" icon="rocket">
    插件入门。
  </Card>
  <Card title="插件架构" href="/plugins/architecture" icon="diagram-project">
    内部架构和能力模型。
  </Card>
  <Card title="SDK概述" href="/plugins/sdk-overview" icon="book">
    插件 SDK 参考和子路径导入。
  </Card>
  <Card title="模型字段" href="/plugins/manifest/models" icon="list">
    清单模型目录、速记族、ID 规范化和定价字段。
  </Card>
  <Card title="提供商字段" href="/plugins/manifest/providers" icon="list">
    清单生成、媒体理解、端点和请求提供者元数据。
  </Card>
  <Card title="设置和验证字段" href="/plugins/manifest/setup-and-auth" icon="list">
    清单设置描述符、身份验证选择、对话发现和配置 UI 提示。
  </Card>
  <Card title="能力领域" href="/plugins/manifest/capabilities" icon="list">
    清单功能所有权、工具可用性元数据和激活计划。
  </Card>
  <Card title="宿主表面场" href="/plugins/manifest/surfaces" icon="list">
    图标、CLI、MCP、Control UI、仪表板、QA、通道和备份表面的清单字段。
  </Card>
  <Card title="配置和秘密字段" href="/plugins/manifest/config-and-secrets" icon="list">
    清单危险标记、SecretRef 迁移和秘密提供程序预设元数据。
  </Card>
  <Card title="清单与 package.json" href="/plugins/manifest/package-json" icon="list">
    哪些运行前元数据位于 package.json 中，哪些重复的插件 ID 获胜。
  </Card>
  <Card title="插件设置与配置" href="/plugins/sdk-setup" icon="sliders">
    使用此清单的打包和配置模式。
  </Card>
  <Card title="插件入口点" href="/plugins/sdk-entrypoints" icon="door-open">
    `definePluginEntry` 和其他条目帮助程序导出插件的代码。
  </Card>
  <Card title="工具插件" href="/plugins/tool-plugins" icon="wrench">
    为代理工具声明 `contracts.tools`。
  </Card>
  <Card title="管理插件" href="/plugins/manage-plugins" icon="plug">
    安装并启用此清单描述的插件。
  </Card>
  <Card title="备份" href="/cli/backup" icon="box-archive">
    此处声明的 `backupResources` 表面。
  </Card>
</CardGroup>
