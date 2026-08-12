---
summary: "插件清单 + JSON schema 要求（严格配置校验）"
read_when:
  - 你正在构建一个 OpenClaw 插件
  - 你需要发布插件配置 schema 或调试插件校验错误
title: "插件清单"
---

本页介绍 **原生 OpenClaw 插件清单** `openclaw.plugin.json`。有关兼容的 bundle 布局（Agent Plugins、Codex、Claude、Cursor），请参见[插件 bundle](/plugins/bundles)。

兼容的 bundle 格式使用各自的清单文件：

- Agent Plugins bundle：包根目录中的 `plugin.json`，遵循开放的 [Agent Plugins 标准](https://agent-plugins.org)
- Codex bundle：`.codex-plugin/plugin.json`
- Claude bundle：`.claude-plugin/plugin.json`，或不使用清单的默认 Claude 组件布局
- Cursor bundle：`.cursor-plugin/plugin.json`

OpenClaw 会自动检测这些布局，但不会将它们按下面的 `openclaw.plugin.json` schema 进行校验。对于兼容的 bundle，当布局符合 OpenClaw 的运行时预期时，OpenClaw 会读取 bundle 元数据、声明的 skill 根目录、Claude 命令根目录、Claude `settings.json` 默认值、Claude LSP 默认值以及受支持的 hook pack。

每个原生 OpenClaw 插件**必须**在**插件根目录**中提供 `openclaw.plugin.json`。OpenClaw 会读取它来验证配置，**不会执行插件代码**。缺失或无效的清单会阻止配置校验，并被视为插件错误。

有关完整的插件系统指南，请参见 [插件](/tools/plugin)；有关原生能力模型和当前外部兼容性说明，请参见 [能力模型](/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在**加载插件代码之前**读取的元数据文件。其中的所有内容都必须足够轻量，以便在不启动插件运行时的情况下完成检查。

**用于：**

- 插件标识、配置验证和配置界面提示
- 身份验证、入门引导和设置元数据（别名、自动启用、提供商环境变量、身份验证选项）
- 控制平面界面的激活提示
- 模型系列所有权简写
- 静态能力所有权快照（`contracts`）
- 仪表板组件数据绑定和操作动词
- 插件启用期间应存在的静态 MCP 服务器
- 共享 `openclaw qa` 主机可检查的 QA 运行器元数据
- 合并到目录和验证界面中的频道专属配置元数据

**不要将其用于：**注册原生运行时钩子、声明插件代码入口点或 npm 安装元数据。这些内容应放在插件代码和 `package.json` 中。

## 最小示例

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

## 丰富示例

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "description": "OpenRouter 提供方插件",
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
      "choiceLabel": "OpenRouter API 密钥",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API 密钥",
      "onboardingScopes": ["text-inference"]
    }
  ],
  "uiHints": {
    "apiKey": {
      "label": "API 密钥",
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

## 顶层字段参考

| 字段                                 | 必填     | 类型                         | 含义                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                 | 是       | `string`                     | 规范插件 ID。此 ID 用于 `plugins.entries.<id>`。例外情况：如果某个软件包的 `package.json` 声明了多个插件条目，则每个条目会注册为 `<id>/<entry-basename>`（例如 `pack/one`），该条目范围内的 ID 是该条目在 `plugins.entries` 中使用的键。条目基本名称在软件包内必须唯一；发现时会拒绝冲突的基本名称。 |
| `configSchema`                       | 是       | `object`                     | 此插件配置的内联 JSON Schema。                                                                                                                                                                                                                                                                                                                                                     |
| `requiresPlugins`                    | 否       | `string[]`                   | 此插件要生效还必须安装的插件 ID。发现过程会保留该插件的可加载状态，但在缺少任何必需插件时发出警告。                                                                                                                                                                                                                                     |
| `enabledByDefault`                   | 否       | `true`                       | 将捆绑插件标记为默认启用。省略此字段，或将其设置为任何非 `true` 的值，则插件默认保持禁用。                                                                                                                                                                                                                                                                     |
| `enabledByDefaultOnPlatforms`        | 否       | `string[]`                   | 仅在列出的 Node.js 平台上将捆绑插件标记为默认启用，例如 `["darwin"]`。显式配置优先。                                                                                                                                                                                                                                                         |
| `legacyPluginIds`                    | 否       | `string[]`                   | 会规范化为此规范插件 ID 的旧版 ID。                                                                                                                                                                                                                                                                                                                                           |
| `autoEnableWhenConfiguredProviders`  | 否       | `string[]`                   | 当身份验证、配置或模型引用提及这些提供商 ID 时，应自动启用此插件。                                                                                                                                                                                                                                                                                                  |
| `kind`                               | 否       | `PluginKind \| PluginKind[]` | 声明一个或多个供 `plugins.slots.*` 使用的互斥插件类型（`"memory"`、`"context-engine"`）。同时拥有两个插槽的插件应在一个数组中声明两种类型。                                                                                                                                                                                                                          |
| `channels`                           | 否       | `string[]`                   | 此插件拥有的频道 ID。用于发现和配置验证。                                                                                                                                                                                                                                                                                                                      |
| `providers`                          | 否       | `string[]`                   | 此插件拥有的提供商 ID。                                                                                                                                                                                                                                                                                                                                                               |
| `providerCatalogEntry`               | 否       | `string`                     | 轻量级提供商目录模块路径，相对于插件根目录，用于提供商清单范围内的目录元数据；无需激活完整插件运行时即可加载这些元数据。                                                                                                                                                                                                              |
| `modelSupport`                       | 否       | `object`                     | 由清单拥有的模型系列元数据简写，用于在运行时之前自动加载插件。                                                                                                                                                                                                                                                                                                      |
| `modelCatalog`                       | 否       | `object`                     | 由提供商声明的模型目录元数据。此元数据是未来只读列表、引导流程、模型选择器、别名和抑制功能的控制平面契约，无需加载插件运行时。                                                                                                                                                                                                                                                                                                      |
| `modelPricing`                       | 否       | `object`                     | 由提供商拥有的托管定价发布策略。可使用此字段将本地/自托管提供商排除在已发布定价之外，或将提供商引用映射到 OpenRouter/LiteLLM 目录 ID，而无需在核心代码中硬编码提供商 ID。                                                                                                                                                                             |
| `modelIdNormalization`               | 否       | `object`                     | 由提供商拥有的模型 ID 别名/前缀清理逻辑，必须在提供商运行时加载之前执行。                                                                                                                                                                                                                                                                                                        |
| `providerEndpoints`                  | 否       | `object[]`                   | 由清单拥有的端点主机/baseUrl 元数据，用于提供商路由；核心代码必须在提供商运行时加载之前对其进行分类。                                                                                                                                                                                                                                                                         |
| `providerRequest`                    | 否       | `object`                     | 用于通用请求策略的轻量级提供商系列和请求兼容性元数据，在提供商运行时加载之前使用。                                                                                                                                                                                                                                                                           |
| `secretProviderIntegrations`         | 否       | `Record<string, object>`     | 声明式 SecretRef 执行提供商预设，安装或设置界面可以提供这些预设，而无需在核心代码中硬编码特定提供商的集成。                                                                                                                                                                                                                                                  |
| `cliBackends`                        | 否       | `string[]`                   | 此插件拥有的 CLI 推理后端 ID。用于根据显式配置引用在启动时自动激活。                                                                                                                                                                                                                                                                                      |
| `syntheticAuthRefs`                  | 否       | `string[]`                   | 在冷模型发现期间、运行时加载之前，应探测其插件拥有的合成身份验证钩子的提供商或 CLI 后端引用。                                                                                                                                                                                                                                                           |
| `nonSecretAuthMarkers`               | 否       | `string[]`                   | 由捆绑插件拥有的占位 API 密钥值，用于表示非机密的本地、OAuth 或环境凭据状态。                                                                                                                                                                                                                                                                             |
| `commandAliases`                     | 否       | `object[]`                   | 此插件拥有的命令名称；在运行时加载之前，这些命令应生成针对插件的配置和 CLI 诊断信息。                                                                                                                                                                                                                                                                                    |
| `providerUsageAuthEnvVars`           | 否       | `Record<string, string[]>`   | 仅用于用量/计费的提供商凭据。OpenClaw 使用这些名称进行用量发现和机密清理，但绝不将其用于推理身份验证。                                                                                                                                                                                                                                                        |
| `providerAuthAliases`                | 否       | `Record<string, string>`     | 应复用另一个提供商 ID 进行身份验证查找的提供商 ID，例如某个编程提供商与基础提供商共享 API 密钥和身份验证配置。                                                                                                                                                                                                                                       |
| `providerAuthChoices`                | 否       | `object[]`                   | 用于引导选择器、首选提供商解析和简单 CLI 标志连接的轻量级身份验证选项元数据。                                                                                                                                                                                                                                                                                    |
| `activation`                         | 否       | `object`                     | 用于启动、提供商、命令、频道、路由和能力触发加载的轻量级激活规划器元数据。仅包含元数据；插件运行时仍负责实际行为。                                                                                                                                                                                                                    |
| `setup`                              | 否       | `object`                     | 轻量级设置/引导描述符，发现和设置界面可以在不加载插件运行时的情况下检查这些描述符。                                                                                                                                                                                                                                                                                 |
| `doctorContract`                     | 否       | `object`                     | 声明插件构件导出的动态 doctor 契约界面，使 doctor 仅加载相关模块。                                                                                                                                                                                                                                                                               |
| `sessionRouteStateOwners`            | 否       | `object[]`                   | 用于 doctor 清理的静态会话路由所有权。每个条目声明一个 `id`、`label`，以及可选的 `providerIds`、`runtimeIds`、`cliSessionKeys` 和 `authProfilePrefixes`。                                                                                                                                                                                                                  |
| `qaRunners`                          | 否       | `object[]`                   | 共享的 `openclaw qa` 主机使用的轻量级 QA 运行器描述符，在插件运行时加载之前使用。                                                                                                                                                                                                                                                                                                   |
| `dashboard`                          | 否       | `object`                     | 控制面板小组件数据绑定和操作动词。每个条目都会根据此插件注册且具有所需读取或写入作用域的 Gateway 方法进行验证。参见[控制面板参考](#dashboard-reference)。                                                                                                                                                                              |
| `mcpServers`                         | 否       | `Record<string, object>`     | 此插件启用时提供的静态 MCP 服务器定义。相对命令参数和工作目录以插件根目录为基准解析。操作员的 `mcp.servers` 条目会覆盖或禁用同名定义。参见 [MCP 服务器参考](#mcp-server-reference)。                                                                                                   |
| `contracts`                          | 否       | `object`                     | 外部身份验证钩子、嵌入、语音、实时转录、实时语音、媒体理解、图像/视频/音乐生成、网页获取、网页搜索、工作器提供商、文档/网页内容提取和工具所有权的静态能力所有权快照。                                                                                                                       |
| `configContracts`                    | 否       | `object`                     | 由清单拥有、供通用核心辅助函数使用的配置行为：危险标志检测、SecretRef 迁移目标和旧版配置路径收窄。参见 [configContracts 参考](#configcontracts-reference)。                                                                                                                                                                           |
| `mediaUnderstandingProviderMetadata` | 否       | `Record<string, object>`     | 在 `contracts.mediaUnderstandingProviders` 中声明的提供商 ID 的轻量级媒体理解默认值。                                                                                                                                                                                                                                                                                         |
| `imageGenerationProviderMetadata`    | 否       | `Record<string, object>`     | 在 `contracts.imageGenerationProviders` 中声明的提供商 ID 的轻量级图像生成身份验证元数据，包括提供商拥有的身份验证别名和基础 URL 防护。                                                                                                                                                                                                                               |
| `videoGenerationProviderMetadata`    | 否       | `Record<string, object>`     | 在 `contracts.videoGenerationProviders` 中声明的提供商 ID 的轻量级视频生成身份验证元数据，包括提供商拥有的身份验证别名和基础 URL 防护。                                                                                                                                                                                                                               |
| `musicGenerationProviderMetadata`    | 否       | `Record<string, object>`     | 在 `contracts.musicGenerationProviders` 中声明的提供商 ID 的轻量级音乐生成身份验证元数据，包括提供商拥有的身份验证别名和基础 URL 防护。                                                                                                                                                                                                                               |
| `toolMetadata`                       | 否       | `Record<string, object>`     | `contracts.tools` 中声明的插件自有工具的轻量级可用性元数据。当某个工具只有在存在配置、环境或身份验证证据时才应加载运行时时使用。                                                                                                                                                                                                                        |
| `channelConfigs`                     | 否       | `Record<string, object>`     | 由清单拥有的频道配置元数据，在加载运行时之前合并到发现和验证界面中。                                                                                                                                                                                                                                                                                       |
| `skills`                             | 否       | `string[]`                   | 要加载的技能目录，相对于插件根目录。                                                                                                                                                                                                                                                                                                                                          |
| `name`                               | 否       | `string`                     | 人类可读的插件名称。                                                                                                                                                                                                                                                                                                                                                                      |
| `description`                        | 否       | `string`                     | 在插件界面中显示的简短摘要。                                                                                                                                                                                                                                                                                                                                                          |
| `catalog`                            | 否       | `object`                     | 插件目录界面可选的展示提示。这些元数据不会安装、启用插件，也不会授予插件信任。                                                                                                                                                                                                                                                                     |
| `icon`                               | 否       | `string`                     | 用于市场/目录卡片的 HTTPS 图像 URL。ClawHub 接受任何有效的 `https://` URL；省略此字段或 URL 无效时，将回退到默认插件图标。                                                                                                                                                                                                                               |
| `version`                            | 否       | `string`                     | 用于提供信息的插件版本。                                                                                                                                                                                                                                                                                                                                                                    |
| `uiHints`                            | 否       | `Record<string, object>`     | 配置字段的 UI 标签、占位符和敏感性提示。                                                                                                                                                                                                                                                                                                                                |

对于静态 doctor 所有权，优先使用顶层的 `sessionRouteStateOwners`。较旧的
`doctorContract.sessionRouteStateOwners: true` 声明，以及从
`doctor-contract-api` 导出的 `sessionRouteStateOwners`，对于外部插件仍受支持，
但已弃用。当清单字段存在时，OpenClaw 会直接使用该字段，而无需加载
doctor-contract 模块。移除计划：在外部插件迁移窗口结束后，于 OpenClaw
2027.1 中移除模块回退机制。

当 doctor-contract 模块导出非空的 `legacyConfigRules`、`normalizeCompatibilityConfig`
函数，或同时导出两者时，请设置 `doctorContract.configRepair: true`。一项声明即可涵盖完整的配置修复构件。

## MCP 服务器参考

`mcpServers` 允许原生插件提供 MCP 服务器（包括 MCP App），无需操作员在 `openclaw.json` 中重复定义其静态进程：

```json
{
  "mcpServers": {
    "example": {
      "transport": "stdio",
      "command": "node",
      "args": ["./mcp-server.js"]
    }
  }
}
```

OpenClaw 仅在所属插件启用期间包含这些服务器。相对的 `command`、`args`、`cwd` 和 `workingDirectory` 路径均从插件根目录解析。用户配置仍具有权威性：`mcp.servers.<name>` 可以替换插件默认值，或设置 `enabled: false` 以将其省略。MCP App 渲染和服务器工具调用仍需要正常的 MCP Apps 设置以及生效的工具策略；声明服务器不会绕过这两个边界。

## 仪表盘参考

`dashboard` 允许已启用的插件向获授权的仪表盘小组件公开现有的 Gateway RPC，而无需向核心添加插件策略。数据绑定必须指定插件通过 `operator.read` 注册的同名方法；操作动词必须指定插件通过 `operator.write` 注册的方法。若不匹配，插件会在注册期间被拒绝。

```json
{
  "dashboard": {
    "dataBindings": [
      {
        "id": "items.list",
        "method": "example.items.list",
        "description": "列出示例项目。"
      }
    ],
    "actionVerbs": [
      {
        "id": "refresh",
        "method": "example.items.refresh",
        "description": "刷新示例项目。",
        "paramShape": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "force": { "type": "boolean" }
          }
        }
      }
    ]
  }
}
```

清单 ID 的作用域限于插件本身。小组件授权使用 `<plugin-id>.<id>`，例如 `example.items.list` 和 `example.refresh`。为确保持久化授权命名空间明确无歧义，OpenClaw 会将 plugin-id 部分中的 `%` 和 `.` 分别转义为 `%25` 和 `%2E`；普通插件 ID 保持自然形式。`paramShape` 是一个可选的 JSON Schema，在 OpenClaw 调用插件 RPC 前应用于操作参数对象。

## 目录参考

`catalog` 为插件浏览器提供可选的显示提示。主机可以忽略这些提示。它们不会安装或启用插件，也不会改变其运行时行为或信任级别。

```json
{
  "catalog": {
    "featured": true,
    "order": 10
  }
}
```

| 字段       | 类型      | 含义                                                                 |
| ---------- | --------- | -------------------------------------------------------------------- |
| `featured` | `boolean` | 目录展示界面是否应突出显示此插件。                                   |
| `order`    | `number`  | 在精选插件中的升序显示提示；数值越小，显示越靠前。                   |

## 生成 provider 元数据参考

generation provider 元数据字段描述的是与匹配的 `contracts.*GenerationProviders` 列表中声明的 provider 相关的静态 auth 信号。OpenClaw 会在 provider 运行时加载之前读取这些字段，因此核心工具可以在不导入每个 provider 插件的情况下，判断某个 generation provider 是否可用。

仅将这些字段用于便宜、声明式的事实。传输、请求转换、token 刷新、凭证验证以及实际生成行为都保留在插件运行时中。

```json
{
  "contracts": {
    "imageGenerationProviders": ["example-image"]
  },
  "imageGenerationProviderMetadata": {
    "example-image": {
      "aliases": ["example-image-oauth"],
      "authProviders": ["example-image"],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example-image.config",
          "overlayPath": "image",
          "mode": {
            "path": "mode",
            "default": "local",
            "allowed": ["local"]
          },
          "requiredAny": ["workflow", "workflowPath"],
          "required": ["promptNodeId"]
        }
      ],
      "authSignals": [
        {
          "provider": "example-image"
        },
        {
          "provider": "example-image-oauth",
          "providerBaseUrl": {
            "provider": "example-image",
            "defaultBaseUrl": "https://api.example.com/v1",
            "allowedBaseUrls": ["https://api.example.com/v1"]
          }
        }
      ]
    }
  }
}
```

每个元数据条目支持：

| 字段                   | 必填 | 类型       | 含义                                                                                                                                       |
| ---------------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `aliases`              | 否   | `string[]` | 额外的 provider id，应该作为该 generation provider 的静态 auth 别名计入。                                                                  |
| `authProviders`        | 否   | `string[]` | 其已配置 auth 配置文件应计入该 generation provider auth 的 provider id。                                                                   |
| `configSignals`        | 否   | `object[]` | 面向本地或自托管 provider 的低成本、仅配置可用性信号，这些 provider 无需 auth 配置文件或环境变量即可配置。                                  |
| `authSignals`          | 否   | `object[]` | 显式 auth 信号。存在时，它们会替换来自 provider id、`aliases` 和 `authProviders` 的默认信号集。                                            |
| `referenceAudioInputs` | 否   | `boolean`  | 仅用于视频生成。当 provider 接受参考音频资产时设为 `true`；否则 `video_generate` 会隐藏音频参考参数。 |

每个 `configSignals` 条目支持：

| 字段            | 必填 | 类型       | 含义                                                                                                                                                                             |
| ---------------- | ---- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`       | 是   | `string`   | 要检查的插件拥有的配置对象的点路径，例如 `plugins.entries.example.config`。                                                                                                      |
| `overlayPath`    | 否   | `string`   | 根配置内的点路径，其对象应在评估该信号之前覆盖根对象。用于 `image`、`video` 或 `music` 等特定能力的配置。                                                                         |
| `overlayMapPath` | 否   | `string`   | 根配置内的点路径，其对象值应分别覆盖根对象。用于 `accounts` 之类的命名账户映射，只要配置了任意账户即可符合条件。                                                                   |
| `required`       | 否   | `string[]` | 有效配置内必须具有已配置值的点路径。字符串必须非空；对象和数组不能为空。                                                                                                          |
| `requiredAny`    | 否   | `string[]` | 有效配置内至少有一个必须具有已配置值的点路径。                                                                                                                                     |
| `mode`            | 否   | `object`   | 有效配置内可选的字符串模式守卫。当仅某一种模式适用“仅配置即可可用”时使用。                                                                                                       |

每个 `mode` 守卫支持：

| 字段        | 必填 | 类型       | 含义                                                                      |
| ------------ | ---- | ---------- | ------------------------------------------------------------------------- |
| `path`       | 否   | `string`   | 有效配置内的点路径。默认值为 `mode`。                                     |
| `default`    | 否   | `string`   | 当配置省略该路径时使用的模式值。                                          |
| `allowed`    | 否   | `string[]` | 如果存在，则仅当有效模式属于这些值之一时，该信号才通过。                   |
| `disallowed` | 否   | `string[]` | 如果存在，则当有效模式属于这些值之一时，该信号失败。                       |

每个 `authSignals` 条目支持：

| 字段              | 必填 | 类型     | 含义                                                                                                                                                                 |
| ----------------- | ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string` | 要在已配置 auth 配置文件中检查的 provider id。                                                                                                                       |
| `providerBaseUrl` | 否   | `object` | 可选守卫：仅当引用的已配置 provider 使用允许的 base URL 时，该信号才计入。仅当某个 auth 别名只对特定 API 有效时使用。                                                |

每个 `providerBaseUrl` 守卫支持：

| 字段              | 必填 | 类型       | 含义                                                                                                                                        |
| ----------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string`   | 应检查其 `baseUrl` 的 provider 配置 id。                                                                                                    |
| `defaultBaseUrl`  | 否   | `string`   | 当 provider 配置省略 `baseUrl` 时假定使用的 base URL。                                                                                     |
| `allowedBaseUrls` | 是   | `string[]` | 该 auth 信号允许的 base URL。当已配置或默认的 base URL 与这些规范化后的值都不匹配时，该信号将被忽略。 |

## 工具元数据参考

`toolMetadata` 使用与生成提供者元数据相同的 `configSignals` 和 `authSignals` 结构，并按工具名称作为键。`contracts.tools` 声明所有权。`toolMetadata` 声明廉价的可用性证据，这样 OpenClaw 就可以避免仅仅为了让其工具工厂返回 `null` 而导入插件运行时。

```json
{
  "setup": {
    "providers": [
      {
        "id": "example",
        "envVars": ["EXAMPLE_API_KEY"]
      }
    ]
  },
  "contracts": {
    "tools": ["example_search"]
  },
  "toolMetadata": {
    "example_search": {
      "authSignals": [
        {
          "provider": "example"
        }
      ],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example.config",
          "overlayPath": "search",
          "required": ["apiKey"]
        }
      ]
    }
  }
}
```

`toolMetadata` 条目还支持在上述共享的 `configSignals`/`authSignals` 字段之外，添加 `optional`（将该工具标记为插件激活时非必需）和 `replaySafe`（将工具执行标记为在不完整的模型轮次之后可安全重复）。

如果某个工具没有 `toolMetadata`，当工具契约与策略匹配时，OpenClaw 会保留现有行为并加载所属插件。对于其工厂依赖 auth/config 的热点路径工具，插件作者应声明 `toolMetadata`，而不是让 core 导入运行时去询问。

## `providerAuthChoices` 参考

每个 `providerAuthChoices` 条目描述一种引导或身份验证选项。OpenClaw 会在加载 Provider 运行时之前读取这些内容。Provider 设置列表会使用这些清单选项、由描述符派生的设置选项，以及安装目录元数据，而不会加载 Provider 运行时。

| Field                  | Required | Type                                                                  | 含义                                                                                                      |
| ---------------------- | -------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `provider`             | 是       | `string`                                                              | 此选项所属的 Provider id。                                                                                |
| `method`               | 是       | `string`                                                              | 要分派到的身份验证方法 id。                                                                              |
| `choiceId`             | 是       | `string`                                                              | 引导和 CLI 流程使用的稳定身份验证选项 id。                                                               |
| `choiceLabel`          | 否       | `string`                                                              | 面向用户显示的标签。如果省略，OpenClaw 会回退使用 `choiceId`。                                           |
| `choiceHint`           | 否       | `string`                                                              | 选择器中的简短辅助文本。                                                                                  |
| `icon`                 | 否       | HTTPS URL                                                             | 在受支持的引导客户端中显示在此选项旁的图像。                                                             |
| `website`              | 否       | HTTPS URL                                                             | 由受支持的引导客户端显示的产品、登录或安装页面。                                                         |
| `assistantPriority`    | 否       | `number`                                                              | 数值越低，在由助手驱动的交互式选择器中排序越靠前。                                                       |
| `assistantVisibility`  | 否       | `"visible"` \| `"manual-only"`                                        | 从助手选择器中隐藏此选项，但仍允许通过手动 CLI 选择。                                                     |
| `deprecatedChoiceIds`  | 否       | `string[]`                                                            | 应将用户重定向到此替代选项的旧版选项 id。                                                               |
| `groupId`              | 否       | `string`                                                              | 用于对相关选项进行分组的可选组 id。                                                                      |
| `groupLabel`           | 否       | `string`                                                              | 面向用户显示的组标签。                                                                                    |
| `groupHint`            | 否       | `string`                                                              | 该组的简短辅助文本。                                                                                      |
| `onboardingFeatured`   | 否       | `boolean`                                                             | 在交互式引导选择器的精选层级中显示此组，位于“更多...”入口之前。                                         |
| `optionKey`            | 否       | `string`                                                              | 用于简单单标志身份验证流程的内部选项键。                                                                 |
| `cliFlag`              | 否       | `string`                                                              | CLI 标志名称，例如 `--openrouter-api-key`。                                                              |
| `cliOption`            | 否       | `string`                                                              | 完整的 CLI 选项形式，例如 `--openrouter-api-key <key>`。                                                 |
| `cliDescription`       | 否       | `string`                                                              | CLI 帮助中使用的描述。                                                                                    |
| `appGuidedSecret`      | 否       | `boolean`                                                             | 对于由应用引导的设置，只需粘贴一个 secret 加上 Provider 默认值即可完成设置。                             |
| `appGuidedActionLabel` | 否       | `string`                                                              | 开始由 Provider 自有应用引导设置时显示的简短操作标签。                                                   |
| `appGuidedDiscovery`   | 否       | `boolean`                                                             | 匹配的运行时身份验证方法通过 `appGuidedSetup` 负责只读的本地发现。                                      |
| `appGuidedAuth`        | 否       | `"oauth"` \| `"device-code"`                                          | 由 Provider 负责的交互式登录，原生设置客户端可以对其进行通用渲染。                                      |
| `onboardingScopes`     | 否       | `Array<"text-inference" \| "image-generation" \| "music-generation">` | 此选项应出现在哪些引导界面中。如果省略，默认为 `["text-inference"]`。                                   |

当 `appGuidedDiscovery` 为 true 时，匹配的 Provider 身份验证方法必须提供
`appGuidedSetup.detect` 和 `appGuidedSetup.prepare`。检测必须是
只读的：不得执行登录、模型拉取、下载或配置写入。准备步骤会重新检查
精确选定的模型并返回配置提案；OpenClaw 会在隔离环境中对该提案进行实时测试，
仅在成功后才提交。Provider 还可以提供
`appGuidedSetup.detectAvailability`，以便在本地服务可访问但没有模型符合自动设置
条件时，将其设置选项标记为已检测。可用性探测同样是只读的。

## `commandAliases` 参考

当某个插件拥有一个运行时命令名，而用户可能误将其填写到 `plugins.allow` 中，或尝试将其作为根 CLI 命令运行时，请使用 `commandAliases`。OpenClaw 会在不导入插件运行时代码的情况下使用这些元数据进行诊断。

```json
{
  "commandAliases": [
    {
      "name": "dreaming",
      "kind": "runtime-slash",
      "cliCommand": "memory"
    }
  ]
}
```

| 字段         | 必填 | 类型              | 含义                                                            |
| ------------ | ----------------- | ----------------- | --------------------------------------------------------------- |
| `name`       | 是       | `string`          | 属于此插件的命令名。                                             |
| `kind`       | 否       | `"runtime-slash"` | 将该别名标记为聊天 slash 命令，而不是根 CLI 命令。               |
| `cliCommand` | 否       | `string`          | 如有相关的根 CLI 命令，则建议在 CLI 操作中使用该命令。           |

## activation 参考

当插件可以廉价地声明哪些控制平面事件应将其包含在激活／加载计划中时，请使用 `activation`。

这个块是规划器元数据，不是生命周期 API。它不会注册运行时行为，不会替代 `register(...)`，也不保证插件代码已经执行。激活规划器会使用这些字段来缩小候选插件范围，然后再回退到现有的 manifest 归属元数据，例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks。

优先使用已经描述归属关系的最窄元数据。当这些字段能够表达这种关系时，请使用 `providers`、`channels`、`commandAliases`、setup 描述符或 `contracts`。当需要一些无法由这些归属字段表示的额外规划器提示时，再使用 `activation`。对于诸如 `claude-cli`、`my-cli` 或 `google-gemini-cli` 这类 CLI 运行时别名，请使用顶层 `cliBackends`；`activation.onAgentHarnesses` 仅用于那些没有现有归属字段的嵌入式 agent harness id。

每个插件都应有意设置 `activation.onStartup`。仅当插件必须在 Gateway 启动期间运行时将其设为 `true`。当插件在启动时处于非激活状态，并且只应通过更窄的触发器加载时，将其设为 `false`。省略 `onStartup` 不再会隐式地在启动时加载插件；请为启动、channel、config、agent-harness、memory 或其他更窄的激活触发器使用显式的 activation 元数据。

```json
{
  "activation": {
    "onStartup": false,
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| 字段              | 必需 | 类型                                                 | 含义                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onStartup`        | 否       | `boolean`                                            | 显式的 Gateway 启动激活。每个插件都应设置此项。`true` 会在启动期间导入插件；`false` 会保持启动时惰性加载，除非其他匹配的触发器要求加载。 |
| `onProviders`      | 否       | `string[]`                                           | 在 activation／load 计划中应包含此插件的 provider id。                                                                                                                      |
| `onAgentHarnesses` | 否       | `string[]`                                           | 在 activation／load 计划中应包含此插件的嵌入式 agent harness runtime id。CLI backend 别名请使用顶层 `cliBackends`。                                           |
| `onCommands`       | 否       | `string[]`                                           | 在 activation／load 计划中应包含此插件的命令 id。                                                                                                                       |
| `onChannels`      | 否       | `string[]`                                           | 在 activation／load 计划中应包含此插件的 channel id。                                                                                                                       |
| `onRoutes`         | 否       | `string[]`                                           | 在 activation／load 计划中应包含此插件的 route 类型。                                                                                                                       |
| `onConfigPaths`    | 否       | `string[]`                                           | 当路径存在且未被显式禁用时，在 startup／load 计划中应包含此插件的根相对配置路径。                                                      |
| `onCapabilities`   | 否       | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面激活规划使用的宽泛能力提示。尽可能优先使用更窄的字段。                                                                                     |

当前实时使用方：

- Gateway 启动规划使用 `activation.onStartup` 进行显式启动导入。
- 命令触发的 CLI 规划会回退到旧版 `commandAliases[].cliCommand` 或 `commandAliases[].name`。
- Agent runtime 启动规划对嵌入式 harness 使用 `activation.onAgentHarnesses`，对 CLI runtime 别名使用顶层 `cliBackends[]`。
- Channel 触发的 setup／channel 规划在缺少显式 channel 激活元数据时，会回退到旧版 `channels[]` 归属。
- 启动插件规划对非 channel 的根配置界面使用 `activation.onConfigPaths`，例如内置 browser 插件的 `browser` 块。
- Provider 触发的 setup／runtime 规划在缺少显式 provider 激活元数据时，会回退到旧版 `providers[]` 和顶层 `cliBackends[]` 归属。

规划器诊断可以区分显式激活提示与 manifest 归属回退。例如，`activation-command-hint` 表示匹配到了 `activation.onCommands`，而 `manifest-command-alias` 表示规划器改为使用 `commandAliases` 归属。这些原因标签仅用于宿主诊断和测试；插件作者应继续声明最能描述归属关系的元数据。

## qaRunners 参考

当插件在共享的 `openclaw qa` 根命令下提供一个或多个传输运行器时，请使用 `qaRunners`。保持此元数据轻量且静态；插件运行时仍通过轻量的 `qa-runner-api.ts` 接口负责实际的 CLI 注册，该接口导出相匹配的 `qaRunnerCliRegistrations`。对于使用随附的 `runtime-api.ts` 契约的插件，在作者进行迁移期间，旧接口仍将接受至 2026-10-01。可选的 `adapterFactory` 会将传输暴露给共享 QA 场景，而不会更改已注册命令的运行器。

基于模块的流程场景是由适配器负责执行的一种形式。仅当该工厂创建的每个适配器都实现了 `prepareFlow` 时，才将
`adapterFactory.supportsModuleFlows` 设置为 `true`；QA 规划会将未声明支持的实现中的模块流程排除在外。

```json
{
  "qaRunners": [
    {
      "commandName": "matrix",
      "description": "在可丢弃的 homeserver 上运行 Docker 支持的 Matrix 实时 QA 流程"
    }
  ]
}
```

| 字段          | 必需 | 类型     | 含义                                                               |
| ------------- | ---- | -------- | ------------------------------------------------------------------ |
| `commandName` | 是   | `string` | 挂载在 `openclaw qa` 下的子命令，例如 `matrix`。                   |
| `description` | 否   | `string` | 当共享主机需要一个占位命令时使用的回退帮助文本。                   |

`adapterFactory` 的 id 必须与 `commandName` 匹配。不要为清单中不存在的命令导出注册项。

## setup 参考

在 setup 和 onboarding 界面需要在运行时加载之前就能获取插件自有的廉价元数据时，请使用 `setup`。

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"],
        "authEvidence": [
          {
            "type": "local-file-with-env",
            "fileEnvVar": "OPENAI_CREDENTIALS_FILE",
            "requiresAllEnv": ["OPENAI_PROJECT"],
            "credentialMarker": "openai-local-credentials",
            "source": "openai 本地凭据"
          }
        ]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

顶层 `cliBackends` 仍然有效，并继续用于描述 CLI 推理后端。`setup.cliBackends` 是 setup 专用的描述符表面，适用于应保持仅元数据的控制平面/setup 流程。

当存在时，`setup.providers` 和 `setup.cliBackends` 是 setup 发现的首选“先描述符”查找表面。如果描述符只缩小了候选插件范围，而 setup 仍需要更丰富的 setup 期运行时钩子，请设置 `requiresRuntime: true` 并保留 `setup-api` 作为回退执行路径。

OpenClaw 会将 `setup.providers[].envVars` 纳入通用 provider 认证和环境变量查找。请将 setup 和状态环境元数据放在那里。

当计费或组织级凭据必须激活 `resolveUsageAuth` 但又不能成为推理凭据时，请使用 `providerUsageAuthEnvVars`。这些名称会加入 workspace dotenv 阻止、ACP 子进程剥离、沙箱 secret 过滤以及广泛的 secret 清理。provider 运行时仍会在 `resolveUsageAuth` 中读取并分类该值。

当没有 setup 条目可用时，或者当 `setup.requiresRuntime: false` 声明 setup 不需要运行时时，OpenClaw 还可以从 `setup.providers[].authMethods` 推导简单的 setup 选项。显式的 `providerAuthChoices` 条目仍然更适合用于自定义标签、CLI 标志、onboarding 范围和助手元数据。

只有在这些描述符足以满足 setup 界面的需要时，才设置 `requiresRuntime: false`。OpenClaw 会将显式的 `false` 视为仅描述符契约，并且不会为了 setup 查找而执行 `setup-api` 或 `openclaw.setupEntry`。如果一个仅描述符插件仍然提供了这些 setup 运行时入口之一，OpenClaw 会报告一个附加诊断并继续忽略它。省略 `requiresRuntime` 会保留旧版回退行为，因此不会破坏那些在未设置该标志的情况下添加了描述符的现有插件。

由于 setup 查找可以执行插件拥有的 `setup-api` 代码，规范化后的 `setup.providers[].id` 和 `setup.cliBackends[]` 值必须在已发现的插件之间保持唯一。若所有权存在歧义，系统会关闭失败，而不是根据发现顺序挑选赢家。

当 setup 运行时确实执行时，如果 `setup-api` 注册了清单描述符未声明的 provider 或 CLI backend，或者某个描述符没有匹配的运行时注册，setup 注册表诊断会报告描述符漂移。这些诊断是附加性的，不会拒绝旧版插件。

### setup.providers 参考

| 字段              | 必需 | 类型       | 含义                                                                                    |
| -------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `id`           | 是       | `string`   | 在 setup 或 onboarding 期间暴露的 provider id。请保持规范化 id 全局唯一。                         |
| `authMethods`  | 否       | `string[]` | 在无需加载完整运行时的情况下，该 provider 支持的 setup/auth 方法 id。                            |
| `envVars`      | 否       | `string[]` | 在插件运行时加载前，通用 setup/status 界面可以检查的环境变量。                                   |
| `authEvidence` | 否       | `object[]` | 适用于能通过非机密标记进行认证的 provider 的廉价本地认证证据检查。                              |

`authEvidence` 用于 provider 自有的本地凭据标记验证，这类验证无需加载运行时代码即可完成。这些检查必须保持廉价且本地化：不能有网络调用、不能读取密钥环或 secret manager、不能执行 shell 命令，也不能探测 provider API。

支持的证据条目：

| 字段              | 必需 | 类型              | 含义                                                                                                  |
| ------ | ------ | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `type`             | 是     | `string`          | 当前为 `local-file-with-env`。                                                                                 |
| `fileEnvVar`       | 否     | `string`          | 包含显式凭据文件路径的环境变量。                                                                               |
| `fallbackPaths`    | 否     | `string[]`        | 当 `fileEnvVar` 缺失或为空时检查的本地凭据文件路径。支持 `${HOME}` 和 `${APPDATA}`。                            |
| `requiresAnyEnv`   | 否     | `string[]`        | 在该证据有效之前，所列环境变量中至少一个必须非空。                                                             |
| `requiresAllEnv`   | 否     | `string[]`        | 在该证据有效之前，所列环境变量都必须非空。                                                                     |
| `credentialMarker` | 是       | `string`          | 证据存在时返回的非机密标记。                                                                                   |
| `source`           | 否       | `string`          | 用于认证/状态输出的面向用户的来源标签。                                                                    |

### setup 字段

| 字段              | 必需 | 类型       | 含义                                                                                       |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------------------------------ |
| `providers`        | 否   | `object[]` | 在 setup 和 onboarding 期间暴露的 provider setup 描述符。                                   |
| `cliBackends`      | 否   | `string[]` | 用于基于描述符优先查找 setup 的 setup 期后端 id。请保持规范化 id 全局唯一。             |
| `configMigrations` | 否   | `string[]` | 该插件的 setup 界面所拥有的配置迁移 id。                                                   |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找之后，setup 是否仍需要执行 `setup-api`。                                        |

## uiHints 参考

`uiHints` 是一个从配置字段名到小型渲染提示的映射。键可以使用点号表示嵌套配置字段，但任何路径段都不能是 `__proto__`、`constructor` 或 `prototype`；setup 会拒绝这些名称。

```json
{
  "uiHints": {
    "apiKey": {
      "label": "API 密钥",
      "help": "用于 OpenRouter 请求",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  }
}
```

每个字段提示可以包含：

| 字段             | 类型              | 含义                                                                                                               |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `label`          | `string`          | 面向用户显示的字段标签。                                                                                           |
| `help`           | `string`          | 简短的辅助文本。                                                                                                   |
| `tags`           | `string[]`        | 可选的 UI 标签。                                                                                                   |
| `advanced`       | `boolean`         | 将字段标记为高级字段。                                                                                             |
| `sensitive`      | `boolean`         | 将字段标记为机密或敏感字段。                                                                                       |
| `placeholder`    | `string`          | 表单输入框的占位文本。                                                                                             |
| `presentation`   | `"phone-number"`  | 仅用于显示的本地化电话号码格式化，适用于可解析的国际号码（`+...`）；原始值保持不变。                              |

频道配置部分会在频道根级别以及 `accounts.<id>` 下，为每个频道共用的叶字段（`enabled`、`allowFrom`、`dmPolicy`、`groupPolicy`、`streaming` 及类似字段）继承 `help`。如果某个频道为其中某个键声明了自己的 `help`，则始终以该声明为准；因此，当共享措辞不适用于你的提供商时，请进行覆盖。凭据、主机和 Webhook 等提供商特有的键仍然需要各自的提示。

## contracts 参考

仅将 `contracts` 用于静态能力所有权元数据，OpenClaw 可以在不导入插件运行时的情况下读取这些元数据。

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["openclaw", "codex"],
    "trustedToolPolicies": ["workflow-budget"],
    "externalAuthProviders": ["acme-ai"],
    "embeddingProviders": ["openai-compatible"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "musicGenerationProviders": ["stability-audio"],
    "documentExtractors": ["example-docs"],
    "webContentExtractors": ["firecrawl"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "workerProviders": ["example-worker"],
    "usageProviders": ["acme-ai"],
    "migrationProviders": ["hermes"],
    "gatewayMethodDispatch": ["authenticated-request"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的：

| 字段                             | 类型       | 含义                                                                                                                               |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `embeddedExtensionFactories`     | `string[]` | Codex app-server 扩展工厂 ID，目前是 `codex-app-server`。                                                                           |
| `agentToolResultMiddleware`      | `string[]` | 此插件可为其注册工具结果中间件的运行时 ID。                                                                                           |
| `trustedToolPolicies`            | `string[]` | 已安装插件可注册的、插件本地受信任的前置工具策略 ID。捆绑插件可在没有此字段的情况下注册策略。                                         |
| `externalAuthProviders`          | `string[]` | 此插件拥有其外部认证配置文件钩子的提供方 ID。                                                                                         |
| `embeddingProviders`             | `string[]` | 此插件拥有的通用嵌入提供方 ID，用于可复用的向量嵌入场景，包括内存。                                                                  |
| `speechProviders`                | `string[]` | 此插件拥有的语音提供方 ID。                                                                                                           |
| `realtimeTranscriptionProviders` | `string[]` | 此插件拥有的实时转写提供方 ID。                                                                                                       |
| `realtimeVoiceProviders`         | `string[]` | 此插件拥有的实时语音提供方 ID。                                                                                                       |
| `memoryEmbeddingProviders`       | `string[]` | 已弃用的、此插件拥有的内存专用嵌入提供方 ID。                                                                                         |
| `mediaUnderstandingProviders`    | `string[]` | 此插件拥有的媒体理解提供方 ID。                                                                                                       |
| `transcriptSourceProviders`      | `string[]` | 此插件拥有的转写源提供方 ID。                                                                                                         |
| `documentExtractors`             | `string[]` | 此插件拥有的文档（例如 PDF）提取器提供方 ID。                                                                                         |
| `imageGenerationProviders`       | `string[]` | 此插件拥有的图像生成提供方 ID。                                                                                                       |
| `videoGenerationProviders`       | `string[]` | 此插件拥有的视频生成提供方 ID。                                                                                                       |
| `musicGenerationProviders`       | `string[]` | 此插件拥有的音乐生成提供方 ID。                                                                                                       |
| `webContentExtractors`           | `string[]` | 此插件拥有的网页内容提取提供方 ID。                                                                                                   |
| `webFetchProviders`              | `string[]` | 此插件拥有的网页抓取提供方 ID。                                                                                                       |
| `webSearchProviders`             | `string[]` | 此插件拥有的网页搜索提供方 ID。                                                                                                       |
| `workerProviders`                | `string[]` | 此插件拥有的云工作器提供方 ID，用于资源配置和基于配置文件的租约生命周期。                                                            |
| `usageProviders`                 | `string[]` | 此插件拥有其用量认证和用量快照钩子的提供方 ID。                                                                                       |
| `migrationProviders`             | `string[]` | 此插件为 `openclaw migrate` 拥有的导入提供方 ID。                                                                                      |
| `gatewayMethodDispatch`          | `string[]` | 供已认证插件 HTTP 路由使用的保留权限，这些路由在进程内分发 Gateway 方法。                                                             |
| `tools`                          | `string[]` | 此插件拥有的代理工具名称。                                                                                                           |

`contracts.embeddedExtensionFactories` 保留给捆绑的、仅限 Codex app-server 的扩展工厂。捆绑的工具结果中间件应声明 `contracts.agentToolResultMiddleware`，并改为使用 `api.registerAgentToolResultMiddleware(...)` 注册。已安装插件也可以使用相同的中间件接入点，但前提是显式启用，并且仅限于它们在 `contracts.agentToolResultMiddleware` 中声明的运行时。

需要主机信任的前置工具策略层的已安装插件，必须在 `contracts.trustedToolPolicies` 中声明每个已注册的本地 ID，并且必须显式启用。捆绑插件保留现有的受信任策略路径，但未声明策略 ID 的已安装插件会在注册前被拒绝。策略 ID 的作用域限定为注册它的插件，因此两个插件都可以声明并注册 `workflow-budget`；但单个插件不能重复注册同一个本地 ID 两次。

运行时的 `api.registerTool(...)` 注册必须与 `contracts.tools` 匹配。工具发现会使用此列表，仅加载能够拥有所请求工具的插件运行时。

实现 `resolveExternalAuthProfiles` 的提供方插件应声明 `contracts.externalAuthProviders`；未声明的外部认证钩子会被忽略。

实现了 `resolveUsageAuth` 和 `fetchUsageSnapshot` 的提供方插件，应在 `contracts.usageProviders` 中声明每个自动发现的提供方 ID。用量发现会在加载运行时代码之前读取此契约，然后仅在加载声明的所有者之后验证这两个钩子。

通用嵌入提供方应为每个通过 `api.registerEmbeddingProvider(...)` 注册的适配器声明 `contracts.embeddingProviders`。将通用契约用于可复用的向量生成，包括内存搜索所消费的提供方。`contracts.memoryEmbeddingProviders` 是已弃用的内存专用兼容项，仅在现有提供方迁移到通用嵌入提供方接入点期间保留。

Worker 提供方必须在 `contracts.workerProviders` 中声明每个 `api.registerWorkerProvider(...)` ID。Core 会在调用 `provision` 之前持久化耐久意图；提供方会在外部分配之前验证其设置，并且使用相同操作 ID 的重复调用必须采用同一个租约。对于有界配置时间超过 Core 默认五分钟的提供方，可以实现 `resolveProvisionTimeoutMs(profile)`，并在返回的正毫秒预算中包含获取、提供方自有设置和清理的时间。Core 还会持久化经过验证的设置快照，并将其与 `leaseId` 一起传递给 `inspect({ leaseId, profile })` 和 `destroy({ leaseId, profile })`，包括在命名配置文件被更改或删除之后。销毁操作具有幂等性，检查会返回已关闭的 `active`／`destroyed`／`unknown` 状态联合，并且 SSH 私钥材料只能通过 `SecretRef` 引用。已配置的 SSH 端点还必须使用来自受信任配置输出的公共 `hostKey`，其格式必须严格为 `algorithm base64`，且不得包含主机名或注释，以便 Core 在连接前固定主机密钥。它们可以包含最多 10 个有序且唯一的 `fallbackPorts`，但不得包含主 `port`；Core 会持久化这些候选端口，并且仅在幂等探测、内容寻址传输、收据／锁保护的工件安装、收敛式托管工作树镜像和隧道重连期间在这些端口之间轮换。含义不明确且未受保护的有状态命令会安全失败，不会在候选端口之间重放。当 SSH 账户还拥有无关进程时，租约可以设置 `sharedHost: true`；这样 Core 在工作区协调期间会避免冻结整个主机上的进程。省略该字段或设置为 `false` 表示使用专用工作器主机。活动检查会重复这一事实，以便 Core 能够为在该字段存在之前持久化的租约协调由提供方拥有的隔离；隧道启动会等待首次权威检查完成。可选的桌面元数据可以公布最多八个唯一的已关闭应用：`browser` 应包含绝对路径的 `executablePath` 和 1 至 65535 之间的 CDP 端口，或者 `terminal` 应包含绝对路径的 `executablePath`。Core 会拒绝未知的应用 ID 和字段，并将经过验证的元数据与现有桌面记录一同持久化。生成动态身份引用的提供方可以实现权威的 `resolveSshIdentity({ leaseId, profile, keyRef })`；没有实现该方法的提供方则使用 Core 的通用密钥解析器。权威的 `unknown` 状态会使本地活动记录成为孤立记录；在持久化销毁请求之后，它会确认拆除完成。

`contracts.gatewayMethodDispatch` 当前接受 `"authenticated-request"`。它是针对原生插件 HTTP 路由的 API 卫生门禁，这些路由会有意在进程内分发 Gateway 控制平面方法，而不是用来作为防御恶意原生插件的沙箱。仅将其用于已严格审查、且本身就需要 Gateway HTTP 认证的捆绑／运维面。只有当一个具备权限的路由同时声明 `auth: "gateway"` 和路由特定的 `gatewayRuntimeScopeSurface: "trusted-operator"` 时，它才会在 Gateway 根工作接入关闭时仍保持可达；同一插件中的普通兄弟路由仍会处于接入边界之后。这样可以在不赋予整个插件接入绕过权限的前提下，保持挂起状态和恢复操作的可达性。解析和响应整形应限制在分发之外；实质性工作或变更性工作必须通过 Gateway 方法分发完成，因为它负责接入和作用域强制执行。

## configContracts 参考

将 `configContracts` 用于清单所有的配置行为，这些行为是通用核心辅助工具所需，但又不能导入插件运行时：危险标志检测、SecretRef 迁移目标，以及旧版配置路径缩窄。

```json
{
  "configContracts": {
    "compatibilityMigrationPaths": ["legacyProvider"],
    "compatibilityRuntimePaths": ["legacyProvider.webhook"],
    "dangerousFlags": [
      {
        "path": "accounts.*.allowUnverifiedSenders",
        "equals": true
      }
    ],
    "secretInputs": {
      "bundledDefaultEnabled": false,
      "paths": [
        {
          "path": "routes.*.secret",
          "expected": "string",
          "ownerKind": "route"
        }
      ]
    }
  }
}
```

| 字段                          | 必需 | 类型       | 含义                                                                                                                                                                                                                             |
| ----------------------------- | ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compatibilityMigrationPaths` | 否   | `string[]` | 表示此插件的设置时兼容性迁移可能适用的相对于根的配置路径。当配置从未引用该插件时，允许通用运行时配置读取跳过每个插件的设置入口。                                                               |
| `compatibilityRuntimePaths`   | 否   | `string[]` | 此插件可在运行时、插件代码完全激活之前处理的相对于根的兼容性路径。用于应缩小捆绑候选集、但无需导入每个兼容插件运行时的旧版入口。 |
| `dangerousFlags`              | 否   | `object[]` | 启用时，`openclaw doctor` 应标记为不安全或危险的配置字面量。见下文。                                                                                                                                                            |
| `secretInputs`                | 否   | `object`   | `plugins.entries.<id>.config` 下用于 SecretRef 迁移、审计、启动时实体化以及可选运行时所有者隔离的配置路径。见下文。                                                                                                             |

每个 `dangerousFlags` 条目支持：

| 字段     | 必需 | 类型                                  | 含义                                                                                                       |
| -------- | ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `path`   | 是   | `string`                              | 相对于 `plugins.entries.<id>.config` 的点分隔配置路径。支持用于映射/数组段的 `*` 通配符。                   |
| `equals` | 是   | `string \| number \| boolean \| null` | 将此配置值标记为危险的精确字面量。                                                                           |

`secretInputs` 支持：

| 字段                    | 必需 | 类型       | 含义                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bundledDefaultEnabled` | 否   | `boolean`  | 在确定此 SecretRef 入口是否处于活动状态时，覆盖捆绑插件的默认启用状态。当插件已捆绑、但该入口应保持非活动状态直到在配置中显式启用时使用。                                                                                 |
| `paths`                 | 是   | `object[]` | Secret 形状的配置路径，每个路径包含 `path`（点分隔，相对于 `plugins.entries.<id>.config`，支持 `*` 通配符）、可选的 `expected`（目前仅支持 `"string"`）以及可选的 `ownerKind`（目前仅支持 `"route"`）。声明的所有者仅在解析失败时隔离该精确匹配的路径；其所有者 ID 是完整配置路径。 |

## mediaUnderstandingProviderMetadata 参考

当某个媒体理解提供商具有默认模型、自动认证回退优先级，或原生文档支持，而通用核心辅助函数在运行时加载之前就需要这些信息时，请使用 `mediaUnderstandingProviderMetadata`。这些键也必须在 `contracts.mediaUnderstandingProviders` 中声明。

```json
{
  "contracts": {
    "mediaUnderstandingProviders": ["example"]
  },
  "mediaUnderstandingProviderMetadata": {
    "example": {
      "capabilities": ["image", "audio"],
      "defaultModels": {
        "image": "example-vision-latest",
        "audio": "example-transcribe-latest"
      },
      "autoPriority": {
        "image": 40
      },
      "nativeDocumentInputs": ["pdf"],
      "documentModels": {
        "pdf": {
          "textExtraction": "example-doc-text-latest",
          "image": "example-doc-vision-latest"
        }
      }
    }
  }
}
```

每个提供商条目可以包含：

| 字段                   | 类型                                                             | 含义                                                                                                           |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]`                              | 此提供商暴露的媒体能力。                                                                                       |
| `defaultModels`        | `Record<string, string>`                                         | 当配置未指定模型时使用的能力到模型默认映射。                                                                   |
| `autoPriority`         | `Record<string, number>`                                         | 数字越小，在基于凭证的自动提供商回退中排序越靠前。                                                             |
| `nativeDocumentInputs` | `"pdf"[]`                                                        | 该提供商支持的原生文档输入。                                                                                   |
| `documentModels`        | `{ pdf?: { textExtraction?: string; image?: string \| false } }` | 按文档类型覆盖模型。将 `image` 设为 `false` 可为该文档类型禁用基于图像的提取。 |

## channelConfigs 参考

当某个 channel 插件在运行时加载之前需要廉价的配置元数据时，请使用 `channelConfigs`。只读的 channel 设置/状态发现可以在没有 setup 条目的情况下，直接对已配置的外部 channel 使用这些元数据；或者当 `setup.requiresRuntime: false` 声明 setup 不需要运行时环境时，也可以这样使用。

`channelConfigs` 是插件 manifest 元数据，不是新的顶层用户配置章节。用户仍然在 `channels.<channel-id>` 下配置 channel 实例。OpenClaw 会先读取 manifest 元数据，以决定在插件运行时代码执行之前，哪个插件拥有该已配置的 channel。

对于 channel 插件，`configSchema` 和 `channelConfigs` 描述的是不同路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

声明了 `channels[]` 的非 bundled 插件也应声明匹配的 `channelConfigs` 条目。如果没有这些条目，OpenClaw 仍然可以加载插件，但冷路径配置 schema、setup 和 Control UI 界面在插件运行时执行之前，无法了解 channel 所拥有的选项结构或显示专用的 UI 提示。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和 `nativeSkillsAutoEnabled` 可以为在 channel 运行时加载之前执行的命令配置检查声明静态的 `auto` 默认值。bundled channels 也可以通过 `package.json#openclaw.channel.commands` 与其余归该包所有的 channel catalog 元数据一起发布相同的默认值。

```json
{
  "channelConfigs": {
    "matrix": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "homeserverUrl": { "type": "string" }
        }
      },
      "uiHints": {
        "homeserverUrl": {
          "label": "主服务器 URL",
          "placeholder": "https://matrix.example.com"
        }
      },
      "label": "Matrix",
      "description": "Matrix 主服务器连接",
      "commands": {
        "nativeCommandsAutoEnabled": true,
        "nativeSkillsAutoEnabled": true
      },
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

每个 channel 条目可以包含：

| 字段          | 类型                     | 含义                                                                                                             |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每个声明的 channel 配置条目都必须包含。                                           |
| `uiHints`     | `Record<string, object>` | 可选的标签、占位符、敏感性设置，以及该 channel 配置部分仅用于显示的呈现提示。                                      |
| `label`       | `string`                 | 当运行时元数据尚未就绪时，合并到选择器和检查界面中的 channel 标签。                                               |
| `description` | `string`                 | 用于检查和 catalog 界面的简短 channel 描述。                                                                     |
| `commands`    | `object`                 | 用于运行时之前配置检查的静态原生命令和原生技能自动默认值。                                                       |
| `preferOver`  | `string[]`               | 在选择界面中该 channel 应优先于的旧版或低优先级插件 id。                                                         |

### 替换另一个 channel 插件

当你的插件是某个 channel id 的首选拥有者，而另一个插件也可以提供该 channel id 时，请使用 `preferOver`。常见情况包括：插件 id 更名、某个独立插件取代了一个 bundled 插件，或一个维护中的 fork 为了配置兼容性而保留相同的 channel id。

```json
{
  "id": "acme-chat",
  "channels": ["chat"],
  "channelConfigs": {
    "chat": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "webhookUrl": { "type": "string" }
        }
      },
      "preferOver": ["chat"]
    }
  }
}
```

当配置了 `channels.chat` 时，OpenClaw 会同时考虑 channel id 和首选插件 id。如果优先级较低的插件只是因为它是 bundled 或默认启用而被选中，OpenClaw 会在有效运行时配置中禁用它，这样就只有一个插件拥有该 channel 及其工具。显式的用户选择仍然优先：如果用户明确启用了这两个插件（通过 `plugins.allow` 或一个具体的 `plugins.entries` 配置），OpenClaw 会保留该选择，并报告重复的 channel/tool 诊断，而不是静默更改用户请求的插件集合。

请将 `preferOver` 的范围限制在确实能够提供相同 channel 的插件 id 上。它不是通用的优先级字段，也不会重命名用户配置键。

## modelSupport 参考

当 OpenClaw 应在插件运行时加载前，根据诸如 `gpt-5.6-sol` 或 `claude-sonnet-4.6` 这样的简写 model id 推断你的 provider 插件时，请使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 按以下优先级应用：

- 显式的 `provider/model` 引用使用其所属的 `providers` 清单元数据
- `modelPatterns` 优先于 `modelPrefixes`
- 如果一个非内置插件和一个内置插件都匹配，则非内置插件获胜
- 其余歧义会被忽略，直到用户或配置指定一个提供方

字段：

| 字段            | 类型       | 含义                                                              |
| --------------- | ---------- | ----------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 与简写 model id 进行 `startsWith` 匹配的前缀。                    |
| `modelPatterns` | `string[]` | 在移除 profile 后缀后，与简写 model id 匹配的正则表达式源码。      |

`modelPatterns` 条目会通过 `compileSafeRegex` 编译，该函数会拒绝包含嵌套重复的模式（例如 `(a+)+$`）。未通过安全检查的模式会被静默跳过，与语法无效的正则表达式相同。请保持模式简单，避免嵌套量词。

## modelCatalog 参考

当 OpenClaw 在加载插件运行时之前需要知道 provider 模型元数据时，请使用 `modelCatalog`。这是由 manifest 拥有的、用于固定 catalog 行、provider 别名、抑制规则和发现模式的来源。运行时刷新仍然属于 provider 运行时代码，但 manifest 会告知核心何时需要运行时。

```json
{
  "providers": ["openai"],
  "modelCatalog": {
    "providers": {
      "openai": {
        "baseUrl": "https://api.openai.com/v1",
        "api": "openai-responses",
        "models": [
          {
            "id": "gpt-5.4",
            "name": "GPT-5.4",
            "input": ["text", "image"],
            "reasoning": true,
            "contextWindow": 256000,
            "maxTokens": 128000,
            "cost": {
              "input": 1.25,
              "output": 10,
              "cacheRead": 0.125
            },
            "status": "available",
            "tags": ["default"]
          }
        ]
      }
    },
    "aliases": {
      "azure-openai-responses": {
        "provider": "openai",
        "api": "azure-openai-responses"
      }
    },
    "suppressions": [
      {
        "provider": "azure-openai-responses",
        "model": "gpt-5.3-codex-spark",
        "reason": "在 Azure OpenAI Responses 上不可用"
      }
    ],
    "discovery": {
      "openai": "static"
    }
  }
}
```

顶层字段：

| 字段            | 类型                                                     | 含义                                                                                               |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | 该插件拥有的 provider id 的 catalog 行。键也应出现在顶层 `providers` 中。                                  |
| `aliases`        | `Record<string, object>`                                 | 应解析为所拥有 provider 的别名，用于 catalog 或抑制规划。                                                   |
| `suppressions`   | `object[]`                                               | 来自其他来源的 model 行，该插件因 provider 特定原因对其进行抑制。                                          |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | provider catalog 是否可以从 manifest 元数据读取、刷新到缓存中，或者是否需要运行时。                        |
| `runtimeAugment` | `boolean`                                                | 仅当 provider 运行时必须在 manifest/config 规划之后追加 catalog 行时设为 `true`。                           |

`aliases` 会参与 model-catalog 规划中的 provider 归属查找。别名目标必须是由同一插件拥有的顶层 provider。当 provider 过滤列表使用别名时，OpenClaw 可以读取拥有者 manifest，并应用别名 API/base URL 覆盖，而无需加载 provider 运行时。别名不会扩展未过滤的 catalog 列表；宽泛列表只输出拥有者的规范 provider 行。

`suppressions` 替代了旧的 provider 运行时 `suppressBuiltInModel` 钩子。只有当 provider 归该插件拥有，或者被声明为指向已拥有 provider 的 `modelCatalog.aliases` 键时，抑制项才会生效。模型解析期间不再调用运行时抑制钩子。

Provider 字段：

| 字段                  | 类型                     | 含义                                                                                                                                                                                                     |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`             | `string`                 | 可选的默认 base URL，适用于此 provider catalog 中的模型。                                                                                                                                                         |
| `api`                 | `ModelApi`               | 可选的默认 API 适配器，适用于此 provider catalog 中的模型。                                                                                                                                                       |
| `headers`             | `Record<string, string>` | 可选的静态请求头，适用于此 provider catalog。                                                                                                                                                                      |
| `defaultUtilityModel` | `string`                 | 可选的 provider 推荐的小模型 id，用于简短的内部工具任务（标题、进度叙述）。当 `agents.defaults.utilityModel` 未设置且该 provider 提供代理的主模型时使用。 |
| `models`              | `object[]`               | 必需的模型行。没有 `id` 的行会被忽略。                                                                                                                                                                            |

Model 字段：

| 字段               | 类型                                                           | 含义                                                                                 |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `id`               | `string`                                                       | Provider 本地模型 id，不包含 `provider/` 前缀。                                      |
| `name`             | `string`                                                       | 可选的显示名称。                                                                     |
| `api`              | `ModelApi`                                                     | 可选的每个模型的 API 覆盖值。                                                        |
| `baseUrl`          | `string`                                                       | 可选的每个模型的 base URL 覆盖值。                                                   |
| `headers`          | `Record<string, string>`                                       | 可选的每个模型的静态请求头。                                                         |
| `input`            | `Array<"text" \| "image" \| "document">`                       | 模型接受的模态类型。其他值会被静默丢弃。                                             |
| `reasoning`        | `boolean`                                                      | 模型是否提供推理能力。                                                               |
| `contextWindow`    | `number`                                                       | Provider 原生上下文窗口。                                                            |
| `contextTokens`    | `number`                                                       | 可选的有效运行时上下文上限，当其不同于 `contextWindow` 时使用。                      |
| `maxTokens`        | `number`                                                       | 已知时的最大输出 token 数。                                                          |
| `thinkingLevelMap` | `Record<string, string \| null>`                               | 可选的、针对每个思考级别的模型 id 或参数覆盖值。                                     |
| `cost`             | `object`                                                       | 可选的每百万 token 的美元定价，包括可选的 `tieredPricing`。                         |
| `compat`           | `object`                                                       | 可选的兼容性标志，与 OpenClaw 模型配置兼容性相匹配。                                 |
| `upstreamModel`    | `string`                                                       | 可选的 `provider/model` 引用，指向另一个捆绑 catalog 中同一上游模型。                 |
| `mediaInput`       | `object`                                                       | 可选的按模态划分的输入配置，目前仅支持图像。                                        |
| `status`           | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列出状态。仅当该行完全不应出现时才进行抑制。                                         |
| `statusReason`     | `string`                                                       | 可选的、随非可用状态显示的原因。                                                      |
| `replaces`         | `string[]`                                                     | 该模型所取代的较旧 provider 本地模型 id。                                            |
| `replacedBy`       | `string`                                                       | 已弃用行的替代 provider 本地模型 id。                                                |
| `tags`             | `string[]`                                                     | 选择器和过滤器使用的稳定标签。                                                       |

抑制字段：

| 字段                      | 类型       | 含义                                                                                             |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `provider`                | `string`   | 要抑制的上游行的 provider id。必须由该插件拥有，或声明为指向已拥有别名。                          |
| `model`                   | `string`   | 要抑制的 provider 本地 model id。                                                                 |
| `reason`                  | `string`   | 当直接请求被抑制的行时显示的可选消息。                                                             |
| `when.baseUrlHosts`       | `string[]` | 应用该 suppression 之前所需的有效 provider base URL host 列表（可选）。                            |
| `when.providerConfigApiIn` | `string[]` | 应用该 suppression 之前所需的精确 provider-config `api` 值列表（可选）。                         |

`upstreamModel` 标记一行模型，表示它与另一个捆绑 catalog 中、名称不同的一行模型对应同一个上游模型，例如订阅端点旁边的供应商 API 端点。这是编写元数据：规范化会丢弃它，而契约测试会使用它，确保提供相同模型的 catalog 之间的 `compat.codeMode` 等能力标志不会发生偏移。大多数行无需此标记，因为匹配会忽略开头的供应商命名空间和大小写：`moonshotai/kimi-k3` 和 `zai-org/GLM-5.2` 已经可以分别匹配第一方的 `kimi-k3` 和 `glm-5.2` 行。只有当供应商自身使用的名称确实不同时，才使用 `upstreamModel`。请参阅[代码模式](/tools/code-mode#models-shipped-by-more-than-one-provider)。

不要将仅运行时数据放入 `modelCatalog`。只有当 manifest 行足够完整，使得按 provider 过滤的列表和选择器界面可以跳过 registry/runtime 发现时，才使用 `static`。当 manifest 行可作为可列出的种子或补充内容，但刷新/缓存稍后可以添加更多行时，使用 `refreshable`；仅凭 refreshable 行本身不具有权威性。当 OpenClaw 必须加载 provider 运行时才能知道模型列表时，使用 `runtime`。

## modelIdNormalization 参考

使用 `modelIdNormalization` 来进行廉价的、由提供方拥有的模型 ID 清理，这类清理必须在提供方运行时加载之前完成。这样可以把诸如简短模型名、提供方本地旧版 ID，以及代理前缀规则等内容保留在所属插件清单中，而不是放在核心模型选择表里。

```json
{
  "providers": ["anthropic", "openrouter"],
  "modelIdNormalization": {
    "providers": {
      "anthropic": {
        "aliases": {
          "sonnet-4.6": "claude-sonnet-4-6"
        }
      },
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  }
}
```

提供方字段：

| 字段                                 | 类型                    | 含义                                                                                       |
| ------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------ |
| `aliases`                            | `Record<string,string>` | 忽略大小写的精确模型 ID 别名。返回值保持原样。                                             |
| `stripPrefixes`                      | `string[]`              | 在别名查找前要移除的前缀，适用于旧版提供方/模型重复。                                     |
| `prefixWhenBare`                     | `string`                | 当归一化后的模型 ID 不包含 `/` 时要添加的前缀。                                           |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 别名查找后的条件性裸模型 ID 前缀规则，以 `modelPrefix` 和 `prefix` 为键。                  |

## providerEndpoints 参考

将 `providerEndpoints` 用于端点分类，通用请求策略必须在 provider 运行时加载之前知晓这一信息。核心仍然负责每个 `endpointClass` 的含义，而插件清单负责主机和 base URL 元数据。

官方外部化的 provider 插件会被排除在核心 dist 之外，因此在安装之前，它们的清单是不可见的。它们的 `providerEndpoints` 也必须镜像到 `scripts/lib/official-external-provider-catalog.json` 中，这样即使没有插件，端点分类也能继续工作；契约测试会强制校验这份镜像。

端点字段：

| 字段                           | 类型       | 含义                                                                                       |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------ |
| `endpointClass`                | `string`   | 已知的核心端点类别，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。             |
| `hosts`                        | `string[]` | 映射到该端点类别的精确主机名。                                                             |
| `hostSuffixes`                 | `string[]` | 映射到该端点类别的主机后缀。对仅域后缀匹配时请在前面加 `.`。                                 |
| `baseUrls`                     | `string[]` | 映射到该端点类别的精确标准化 HTTP(S) base URL。                                              |
| `googleVertexRegion`           | `string`   | 用于精确全局主机的静态 Google Vertex 区域。                                                  |
| `googleVertexRegionHostSuffix` | `string`   | 从匹配主机中剥离以暴露 Google Vertex 区域前缀的后缀。                                       |

## providerRequest 参考

将 `providerRequest` 用于轻量级的请求兼容性元数据，这些元数据是通用请求策略所需的，而无需加载提供方运行时。把与行为相关的载荷重写保留在提供方运行时钩子或共享的提供方家族辅助函数中。

```json
{
  "providerRequest": {
    "providers": {
      "vllm": {
        "family": "vllm",
        "openAICompletions": {
          "supportsStreamingUsage": true
        }
      }
    }
  }
}
```

提供方字段：

| 字段                 | 类型             | 含义                                                                                 |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `family`         | `string`         | 在通用请求兼容性决策和诊断中使用的提供方家族标签。                                     |
| `compatibilityFamily` | `"moonshot"`     | 用于共享请求辅助工具的可选提供方家族兼容性分组。                                     |
| `openAICompletions`   | `object`         | OpenAI 兼容的补全请求标志，目前是 `supportsStreamingUsage`。                |

## secretProviderIntegrations 参考

当某个插件可以发布可复用的 SecretRef exec 提供方预设时，请使用 `secretProviderIntegrations`。OpenClaw 会在插件运行时加载之前读取这些元数据，将插件所有权存储到 `secrets.providers.<alias>.pluginIntegration`，并将实际的密钥解析交由 SecretRef 运行时处理。预设仅对内置插件以及从受管理的插件安装根目录（例如 git 和 ClawHub 安装）中发现的已安装插件可用。

```json
{
  "secretProviderIntegrations": {
    "secret-store": {
      "providerAlias": "team-secrets",
      "displayName": "Team secrets",
      "source": "exec",
      "command": "${node}",
      "args": ["./bin/resolve-secrets.mjs"]
    }
  }
}
```

映射键是集成 id。若省略 `providerAlias`，OpenClaw 会使用该集成 id 作为 SecretRef 的提供方别名。提供方别名必须匹配常规的 SecretRef 提供方别名模式，例如 `team-secrets` 或 `onepassword-work`。

当操作员选择该预设时，OpenClaw 会写入类似这样的提供方引用：

```json
{
  "secrets": {
    "providers": {
      "team-secrets": {
        "source": "exec",
        "pluginIntegration": {
          "pluginId": "acme-secrets",
          "integrationId": "secret-store"
        }
      }
    }
  }
}
```

在启动/重载时，OpenClaw 会通过加载当前插件清单元数据来解析该提供方，检查所属插件是否已安装且处于激活状态，并根据清单实例化 exec 命令。禁用或移除插件会撤销活动 SecretRef 的该提供方。希望使用独立 exec 配置的操作员仍然可以直接编写手动的 `command`/`args` 提供方。

目前仅支持 `source: "exec"` 预设。`command` 必须是 `${node}`，并且 `args[0]` 必须是一个以 `./` 开头、相对于插件根目录的解析脚本。OpenClaw 会在启动/重载时将其实例化为当前 Node 可执行文件以及插件内脚本的绝对路径。诸如 `--require`、`--import`、`--loader`、`--env-file`、`--eval` 和 `--print` 之类的 Node 选项不属于清单预设契约的一部分。需要非 Node 命令的操作员可以直接配置独立的手动 exec 提供方。

OpenClaw 会根据插件根目录，以及对于 `${node}` 预设根据当前 Node 可执行文件所在目录，为清单预设推导 `trustedDirs`。清单中声明的 `trustedDirs` 会被忽略。其他 exec 提供方选项，例如 `timeoutMs`、`noOutputTimeoutMs`、`maxOutputBytes`、`jsonOnly`、`env` 和 `passEnv`，会原样传递给常规的 SecretRef exec 提供方配置。

## modelPricing 参考

当托管目录发布者需要提供方特定的定价键行为时，请使用 `modelPricing`。发布者读取此元数据时无需导入提供方运行时代码。

```json
{
  "providers": ["ollama", "openrouter"],
  "modelPricing": {
    "providers": {
      "ollama": {
        "external": false
      },
      "openrouter": {
        "openRouter": {
          "passthroughProviderModel": true
        },
        "liteLLM": false
      }
    }
  }
}
```

提供方字段：

| 字段         | 类型              | 含义                                                                                       |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------ |
| `external`   | `boolean`         | 对于不应使用已发布外部定价的本地／自托管提供方，设置为 `false`。                              |
| `openRouter` | `false \| object` | OpenRouter 发布键映射。`false` 会禁用此提供方的 OpenRouter 匹配。                            |
| `liteLLM`    | `false \| object` | LiteLLM 发布键映射。`false` 会禁用此提供方的 LiteLLM 匹配。                                 |

来源字段：

| 字段                      | 类型               | 含义                                                                                                                |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 当外部目录提供方 id 与 OpenClaw 提供方 id 不同时使用，例如 `zai` 提供方对应 `z-ai`。                               |
| `passthroughProviderModel` | `boolean`          | 将包含斜杠的 model id 视为嵌套的 provider／model 引用，对 OpenRouter 等代理提供方很有用。                             |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录 model-id 变体。`version-dots` 会尝试带点的版本 id，例如 `claude-opus-4.6`。                         |

### OpenClaw 提供方索引

OpenClaw 提供方索引是 OpenClaw 拥有的预览元数据，适用于插件可能尚未安装的提供方。它不是插件清单的一部分。插件清单仍然是已安装插件的权威来源。当提供方插件未安装时，提供方索引是未来可安装提供方和预安装模型选择器界面将消费的内部兜底契约。

目录权威顺序：

1. 用户配置。
2. 已安装插件清单 `modelCatalog`。
3. 来自显式刷新的模型目录缓存。
4. OpenClaw 提供方索引预览行。

提供方索引中不得包含密钥、启用状态、运行时钩子或实时的账户特定模型数据。其预览目录使用与插件清单相同的 `modelCatalog` provider 行形状，但应仅限于稳定的显示元数据，除非像 `api`、`baseUrl`、定价或兼容性标志这样的运行时适配器字段被有意保持与已安装插件清单一致。具有实时 `/models` 发现能力的提供方应通过显式的模型目录缓存路径写入刷新后的行，而不是在正常的列出或引导流程中调用提供方 API。

对于那些插件已从核心移出或尚未安装的提供方，提供方索引条目也可以携带可安装插件元数据。此元数据遵循通道目录模式：包名、npm 安装规范、预期完整性校验以及简洁的认证选项标签，足以展示一个可安装的设置选项。一旦插件安装完成，其清单将生效，而该提供方的提供方索引条目会被忽略。

`openclaw doctor --fix` 会将一小组封闭的旧版顶层清单能力键迁移到 `contracts.*` 中：`speechProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders` 和 `tools`。这些内容（以及任何其他能力列表）不再作为顶层清单字段读取；正常的清单加载只会在 `contracts` 下识别它们。

## Manifest 与 package.json

这两个文件用途不同：

| 文件                   | 用途                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 发现、配置校验、认证选择元数据，以及插件代码运行前必须存在的 UI 提示                                                         |
| `package.json`         | npm 元数据、依赖安装，以及用于入口点、安装门控、设置或目录元数据的 `openclaw` 块                                             |

如果你不确定某条元数据应该放在哪里，请使用以下规则：

- 如果 OpenClaw 在加载插件代码之前必须知道它，就放在 `openclaw.plugin.json` 中
- 如果它涉及打包、入口文件或 npm 安装行为，就放在 `package.json` 中

### 影响发现的 package.json 字段

一些运行前插件元数据有意放在 `package.json` 的 `openclaw` 块下，而不是 `openclaw.plugin.json` 中。`openclaw.bundle` 和 `openclaw.bundle.json` 不是 OpenClaw 插件契约；原生插件必须使用 `openclaw.plugin.json` 以及下面支持的 `package.json#openclaw` 字段。

重要示例：

| 字段                                                                                       | 含义                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openclaw.extensions`                                                                      | 声明原生插件入口点。必须位于插件包目录内。                                                                                                                                                 |
| `openclaw.runtimeExtensions`                                                               | 声明已安装包的构建后 JavaScript 运行时入口点。必须位于插件包目录内。                                                                                                                       |
| `openclaw.setupEntry`                                                                      | 在引导、channel 设置以及只读 channel 状态/SecretRef 发现期间使用的轻量级、仅用于设置的入口点。必须位于插件包目录内。                                                                      |
| `openclaw.runtimeSetupEntry`                                                               | 声明已安装包的构建后 JavaScript 设置入口点。需要同时存在 `setupEntry`，且必须位于插件包目录内。                                                                                             |
| `openclaw.channel`                                                                         | 轻量级 channel 目录元数据，例如标签、文档路径、别名和选择提示文案。                                                                                                                       |
| `openclaw.channel.approvalFlags`                                                           | 在运行时加载前可用的封闭式审批行为标志。`native` 表示该 channel 拥有原生审批 UI 和同轮解决能力。                                                                                            |
| `openclaw.channel.commands`                                                                | 在 channel 运行时加载前，由配置、审计和命令列表界面使用的静态原生命令及原生技能自动默认元数据。                                                                                            |
| `openclaw.channel.cliAddOptions`                                                           | 插件拥有的 `openclaw channels add` 选项。每个条目声明 `flags`、`description`、可选的 `defaultValue` 以及可选的 `valueType`（`int` 或 `list`），用于通用输入强制转换。                     |
| `openclaw.channel.configuredState`                                                         | 轻量级的已配置状态检查器元数据，可以在不加载完整 channel 运行时的情况下回答“仅通过环境变量的设置是否已经存在？”。                                                                         |
| `openclaw.channel.persistedAuthState`                                                      | 轻量级的持久化认证检查器元数据，可以在不加载完整 channel 运行时的情况下回答“是否已经有任何登录状态？”。                                                                                   |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 面向捆绑发布和外部发布插件的安装/更新提示。                                                                                                                                                 |
| `openclaw.install.defaultChoice`                                                           | 有多个安装来源可用时的首选安装路径。                                                                                                                                                       |
| `openclaw.install.minHostVersion`                                                          | 支持的 OpenClaw 主机最低版本，使用类似 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 的 semver 下限。                                                                                              |
| `openclaw.compat.pluginApi`                                                                | 此包所需的最低 OpenClaw 插件 API 范围，使用类似 `>=2026.5.27` 的 semver 下限。                                                                                                            |
| `openclaw.install.expectedIntegrity`                                                       | 预期的 npm dist 完整性字符串，例如 `sha512-...`；安装和更新流程会根据它验证获取到的工件。                                                                                                  |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 当配置无效时，允许一条范围有限的捆绑插件重新安装恢复路径。                                                                                                                                |
| `openclaw.install.requiredPlatformPackages`                                                | 当锁文件中的平台约束与当前主机匹配时，必须实际安装的 npm 包别名。                                                                                                                          |

清单元数据决定在运行时加载之前，引导过程中会出现哪些 provider/channel/setup 选项。`package.json#openclaw.install` 告诉引导流程，当用户选择这些选项之一时如何获取或启用该插件。不要把安装提示移到 `openclaw.plugin.json` 中。

已配置的启动插件会在网关开始监听后，从其完整运行时注册 HTTP 路由。在启动侧车准备就绪之前，其他未声明归属的 HTTP 请求会返回带有 `Retry-After: 1` 的 `503`；核心路由在整个启动期间仍然可用。

对于 `openclaw.channel.cliAddOptions`，请使用 Commander 的长选项语法，例如 `--initial-sync-limit <n>`。设置 `valueType: "int"` 可将输入解析为非负整数；设置 `valueType: "list"` 可在插件设置适配器接收输入前，将以逗号、分号或换行分隔的输入拆分为字符串。省略 `valueType` 时，会将解析后的 Commander 值原样传递。

`openclaw.install.minHostVersion` 会在非捆绑插件来源的安装和清单注册表加载期间强制执行。无效值会被拒绝；对于较旧的主机，较新但有效的版本值会跳过外部插件。捆绑源插件被视为与主机检出版本保持同步。

`openclaw.install.requiredPlatformPackages` 适用于通过可选的、按平台区分的别名暴露所需原生二进制文件的 npm 包。为每个受支持的平台别名列出裸 npm 包名。在 npm install 期间，OpenClaw 只会验证锁文件约束与当前主机匹配的已声明别名。如果 npm 报告成功但省略了该别名，OpenClaw 会用新的缓存重试一次；如果该别名仍然缺失，则回滚安装。

`openclaw.compat.pluginApi` 会在非捆绑插件来源的包安装期间强制执行。把它用于该包构建时所依赖的 OpenClaw 插件 SDK/运行时 API 下限。当插件包需要更高的 API，但在其他流程中仍希望保留较低的安装提示时，它可以比 `minHostVersion` 更严格。官方 OpenClaw 发布同步默认会把现有官方插件的 API 下限提升到 OpenClaw 发布版本，但仅插件发布可以在包有意支持旧主机时保留较低下限。不要仅用包版本作为兼容性契约。`peerDependencies.openclaw` 仍然是 npm 包元数据；OpenClaw 使用 `openclaw.compat.pluginApi` 契约来做安装兼容性决策。

官方按需安装元数据在插件发布到 ClawHub 时应使用 `clawhubSpec`；引导流程会将其视为首选远程来源，并在安装后记录 ClawHub 工件事实。`npmSpec` 仍然是尚未迁移到 ClawHub 的包的兼容回退方案。

精确的 npm 版本锁定已经存在于 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录条目应将精确规格与 `expectedIntegrity` 配对，以便在获取到的 npm 工件不再匹配固定发布版本时，更新流程能够安全失败。交互式引导仍会提供受信任的注册表 npm 规格，包括裸包名和 dist-tags，以保证兼容性。目录诊断可以区分精确、浮动、完整性固定、缺少完整性、包名不匹配以及无效默认选择来源。它们还会在存在 `expectedIntegrity` 但没有可用于固定它的有效 npm 来源时发出警告。存在 `expectedIntegrity` 时，安装/更新流程会强制执行它；省略时，则会记录注册表解析结果而不附加完整性固定。

当状态、channel 列表或 SecretRef 扫描需要在加载完整运行时之前识别已配置账户时，channel 插件应提供 `openclaw.setupEntry`。设置入口应暴露 channel 元数据以及设置安全的配置、状态和 secrets 适配器；将网络客户端、网关监听器和传输运行时保留在主扩展入口点中。

运行时入口点字段不会覆盖源入口点字段的包边界检查。例如，`openclaw.runtimeExtensions` 不能让一个会越界的 `openclaw.extensions` 路径变得可加载。

`openclaw.install.allowInvalidConfigRecovery` 的范围故意很窄。它不会让任意损坏的配置都能安装。当前它只允许安装流程从特定的过期捆绑插件升级失败中恢复，例如缺失的捆绑插件路径，或同一捆绑插件对应的过期 `channels.<id>` 条目。无关的配置错误仍会阻止安装，并将操作者引导到 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一个小型检查器模块的包元数据：

```json
{
  "openclaw": {
    "channel": {
      "id": "whatsapp",
      "persistedAuthState": {
        "specifier": "./auth-presence",
        "exportName": "hasAnyWhatsAppAuth"
      }
    }
  }
}
```

当设置、doctor、状态或只读存在性流程在完整 channel 插件加载前需要一个廉价的“是/否”认证探测时使用它。持久化认证状态不是已配置 channel 状态：不要用这些元数据来自动启用插件、修复运行时依赖，或决定是否应加载 channel 运行时。目标导出应是一个只读取持久化状态的小函数；不要通过完整的 channel runtime barrel 来路由它。

`openclaw.channel.configuredState` 支持廉价的已配置状态检查。当环境变量足够时，优先使用声明式环境元数据：

```json
{
  "openclaw": {
    "channel": {
      "id": "telegram",
      "configuredState": {
        "env": {
          "allOf": ["TELEGRAM_BOT_TOKEN"]
        }
      }
    }
  }
}
```

当所有列出的变量都必需时使用 `env.allOf`；当任意一个非空变量满足条件时使用 `env.anyOf`。如果一个小型的非运行时检查所需信息超出环境元数据范围，请像 `persistedAuthState` 示例那样使用 `specifier` 加 `exportName`；存在 `env` 时，OpenClaw 会直接使用它，而不会加载该模块。如果检查需要完整的配置解析或真正的 channel 运行时，请将该逻辑保留在插件的 `config.hasConfiguredState` hook 中。

## 发现优先级（重复的插件 id）

OpenClaw 从三个根目录发现插件，按以下顺序检查：随 OpenClaw 一起发布的捆绑插件、全局安装根目录（`~/.openclaw/extensions`），以及当前工作区根目录（`<workspace>/.openclaw/extensions`），另外还包括任何显式的 `plugins.load.paths` 条目。

如果两个发现项共享相同的 `id`，则只保留**优先级最高**的 manifest；较低优先级的重复项会被丢弃，而不会与其并列加载。优先级从高到低如下：

1. **配置选定** — 在 `plugins.entries.<id>` 中显式固定的路径
2. **与已跟踪的安装记录匹配的全局安装** — 通过 `openclaw plugin install`/`openclaw plugin update` 安装的插件，且 OpenClaw 的安装跟踪将其识别为同一个 id，即使该 id 也属于某个捆绑插件
3. **捆绑** — 随 OpenClaw 一起发布的插件
4. **工作区** — 相对于当前工作区发现的插件
5. 任何其他已发现的候选项

影响：

- 位于工作区或全局根目录中、未被跟踪的某个捆绑插件的分支副本或过时副本，不会覆盖捆绑版本。
- 要覆盖一个捆绑插件，可以针对该 id 运行 `openclaw plugin install`，这样被跟踪的全局安装会比捆绑副本优先级更高；或者通过 `plugins.entries.<id>` 固定一个特定路径，让它凭借配置选定优先级获胜。
- 重复项被丢弃时会记录日志，因此 Doctor 和启动诊断可以指出被丢弃的副本。
- 配置选定的重复覆盖会在诊断中表述为显式覆盖，但仍会发出警告，以便让过时分支和意外的覆盖保持可见。

## JSON Schema 要求

- **每个插件都必须提供 JSON Schema**，即使它不接受任何配置。
- 空 schema 是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 会在配置读写时进行验证，而不是在运行时。
- 当扩展或分叉捆绑插件并加入新的配置键时，请同时更新该插件的 `openclaw.plugin.json` 中的 `configSchema`。捆绑插件的 schema 非常严格，因此如果没有在 `configSchema.properties` 中添加 `myNewKey`，就在用户配置中添加 `plugins.entries.<id>.config.myNewKey`，会在插件运行时加载之前被拒绝。

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

## 校验行为

- 未知的 `channels.*` 键是**错误**，除非该 channel id 已由插件清单声明。如果相同的 id 也出现在 `plugins.allow`、`plugins.entries` 或 `plugins.installs` 中（即被引用但当前不可发现的插件），OpenClaw 会将其降级为**警告**。
- `plugins.entries.<id>`、`plugins.allow` 和 `plugins.deny` 引用未知插件 id 时是**警告**（“stale config entry ignored”），不是错误，因此升级和已移除/重命名的插件不会阻止网关启动。
- `plugins.slots.memory` 引用未知插件 id 时是**错误**，但已知的 `memory-lancedb` 官方外部插件除外，它会改为警告。
- 如果插件已安装，但清单或 schema 损坏或缺失，校验会失败，Doctor 会报告该插件错误。
- 如果插件配置存在，但插件已**禁用**，配置会被保留，并且 Doctor 和日志中会显示一个**警告**。

完整的 `plugins.*` schema 请参见[配置参考](/gateway/configuration)。

## 注意事项

- 原生 OpenClaw 插件必须提供清单，包括从本地文件系统加载的插件。运行时仍会单独加载插件模块；清单仅用于发现和验证。
- 原生清单使用 JSON5 解析，因此支持注释、尾随逗号和不带引号的键名，只要最终值仍然是一个对象。
- 清单加载器只读取已记录的清单字段。避免使用自定义顶层键。
- 如果插件不需要 `channels`、`providers`、`cliBackends` 和 `skills`，可以全部省略。
- `providerCatalogEntry` 必须保持轻量，不应导入宽泛的运行时代码；应将其用于静态提供商目录元数据或范围狭窄的发现描述，而不是请求时执行。
- 独占插件类型通过 `plugins.slots.*` 选择：`kind: "memory"` 通过 `plugins.slots.memory` 选择（默认为 `memory-core`），`kind: "context-engine"` 通过 `plugins.slots.contextEngine` 选择（默认为 `legacy`）。
- 在此清单中声明独占插件类型。运行时入口中的 `OpenClawPluginDefinition.kind` 已弃用，仅作为旧版插件的兼容性回退保留。
- `setup.providers[].envVars` 中的环境变量元数据仅具有声明性。状态、审计、cron 传递验证及其他只读界面，在将环境变量视为已配置之前，仍会应用插件信任和有效激活策略。
- 对于需要提供商代码的运行时向导元数据，请参阅 [提供商运行时钩子](/plugins/architecture-internals#provider-runtime-hooks)。
- 如果你的插件依赖原生模块，请记录构建步骤以及任何包管理器允许列表要求（例如 pnpm 的 `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相关内容

<CardGroup cols={3}>
  <Card title="构建插件" href="/plugins/building-plugins" icon="rocket">
    插件入门。
  </Card>
  <Card title="插件架构" href="/plugins/architecture" icon="diagram-project">
    内部架构和能力模型。
  </Card>
  <Card title="SDK 概览" href="/plugins/sdk-overview" icon="book">
    插件 SDK 参考和子路径导入。
  </Card>
</CardGroup>
