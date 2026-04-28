---
summary: "插件清单 + JSON 模式要求（严格的配置验证）"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "插件清单"
---

本页仅适用于 **原生 OpenClaw 插件清单**。

有关兼容的捆绑布局，请参见 [插件捆绑](/plugins/bundles)。

兼容的捆绑格式使用不同的清单文件：

- Codex 捆绑：`.codex-plugin/plugin.json`
- Claude 捆绑：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件布局
- Cursor 捆绑：`.cursor-plugin/plugin.json`

OpenClaw 也能自动检测这些捆绑布局，但不会针对本文档中描述的 `openclaw.plugin.json` 模式进行验证。

对于兼容的捆绑包，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取捆绑包元数据以及声明的技能根目录、Claude 命令根目录、Claude 捆绑包 `settings.json` 默认值、Claude 捆绑包 LSP 默认值以及支持的钩子包。

每个原生 OpenClaw 插件**必须**在**插件根目录**下包含一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单验证配置，**不执行插件代码**。缺失或无效的清单会被视为插件错误，阻止配置验证。

查看完整的插件系统指南：[插件](/tools/plugin)。
有关原生能力模型和当前的外部兼容性指南：
[能力模型](/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在**加载你的插件代码之前**读取的元数据。下面的所有内容都必须足够轻量，能够在不启动插件运行时的情况下进行检查。

**可用于：**

- 插件标识、配置验证以及配置 UI 提示
- 认证、引导和设置元数据（别名、自动启用、提供商环境变量、认证选项）
- 控制平面的激活提示
- 模型家族所有权的简写
- 静态能力所有权快照（`contracts`）
- 共享 `openclaw qa` 主机可检查的 QA 运行器元数据
- 合并到目录和验证界面的按通道配置元数据

**不要用于：** 注册运行时行为、声明代码入口点，或 npm 安装元数据。这些属于你的插件代码和 `package.json`。

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
  "description": "OpenRouter 提供商插件",
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
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
  },
  "providerAuthAliases": {
    "openrouter-coding": "openrouter"
  },
  "channelEnvVars": {
    "openrouter-chatops": ["OPENROUTER_CHATOPS_TOKEN"]
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

| 字段                                 | 必需 | 类型                             | 含义                                                                                                                                                                                                                     |
| ------------------------------------ | ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                 | 是   | `string`                         | 规范化的插件 id。此 id 用于 `plugins.entries.<id>`。                                                                                                                                                                     |
| `configSchema`                       | 是   | `object`                         | 此插件配置的内联 JSON Schema。                                                                                                                                                                                           |
| `enabledByDefault`                   | 否   | `true`                           | 将捆绑插件标记为默认启用。省略它，或将其设置为任何非 `true` 值，即可让插件默认保持禁用。                                                                                                                                 |
| `legacyPluginIds`                    | 否   | `string[]`                       | 规范化为此 canonical 插件 id 的旧 id。                                                                                                                                                                                   |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 当认证、配置或模型引用提及这些 provider id 时，应自动启用此插件。                                                                                                                                                         |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 声明由 `plugins.slots.*` 使用的独占插件类型。                                                                                                                                                                            |
| `channels`                           | 否   | `string[]`                       | 由此插件拥有的 channel id。用于发现和配置验证。                                                                                                                                                                          |
| `providers`                          | 否   | `string[]`                       | 由此插件拥有的 provider id。                                                                                                                                                                                             |
| `providerDiscoveryEntry`             | 否   | `string`                         | 相对于插件根目录的轻量级 provider 发现模块路径，用于可在不激活完整插件运行时的情况下加载的、作用域限定于清单的 provider 目录元数据。                                                                                      |
| `modelSupport`                       | 否   | `object`                         | 由清单拥有的简写模型家族元数据，用于在运行时之前自动加载插件。                                                                                                                                                           |
| `modelCatalog`                       | 否   | `object`                         | 此插件所拥有 provider 的声明式模型目录元数据。这是面向未来的只读列表、引导、模型选择器、别名和抑制功能的控制平面契约，无需加载插件运行时。                                                                               |
| `modelPricing`                       | 否   | `object`                         | provider 所有的外部定价查询策略。可用于将本地/自托管 provider 排除在远程定价目录之外，或将 provider 引用映射到 OpenRouter/LiteLLM 目录 id，而无需在核心中硬编码 provider id。                                           |
| `modelIdNormalization`               | 否   | `object`                         | provider 所有的模型 id 别名/前缀清理，必须在加载 provider 运行时之前执行。                                                                                                                                               |
| `providerEndpoints`                  | 否   | `object[]`                       | 由清单拥有的 endpoint 主机/baseUrl 元数据，用于核心在加载 provider 运行时之前必须分类的 provider 路由。                                                                                                                  |
| `providerRequest`                    | 否   | `object`                         | 便宜的 provider 家族和请求兼容性元数据，供通用请求策略在加载 provider 运行时之前使用。                                                                                                                                   |
| `cliBackends`                        | 否   | `string[]`                       | 由此插件拥有的 CLI 推理后端 id。用于在显式配置引用下启动时自动激活。                                                                                                                                                      |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 在运行时加载之前、冷模型发现期间应探测其插件拥有的合成认证钩子的 provider 或 CLI 后端引用。                                                                                                                               |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 由捆绑插件拥有的占位 API key 值，表示非密钥的本地、OAuth 或环境凭据状态。                                                                                                                                                 |
| `commandAliases`                     | 否   | `object[]`                       | 由此插件拥有的命令名称，在运行时加载之前应生成与插件感知相关的配置和 CLI 诊断。                                                                                                                                            |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 用于 provider 认证/状态查找的已弃用兼容性环境元数据。新插件请优先使用 `setup.providers[].envVars`；OpenClaw 在弃用窗口期内仍会读取此项。                                                                                   |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 在认证查找中应复用另一个 provider id 的 provider id，例如共享基础 provider API key 和认证配置文件的编码 provider。                                                                                                       |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 无需加载插件代码即可检查的轻量级 channel 环境元数据。可用于环境驱动的 channel 设置，或通用启动/配置辅助工具应看到的认证界面。                                                                                  |
| `providerAuthChoices`                | 否   | `object[]`                       | 用于引导选择器、首选 provider 解析和简单 CLI 标志绑定的轻量级认证选项元数据。                                                                                                                                            |
| `activation`                         | 否   | `object`                         | 用于 provider、命令、channel、路由和能力触发加载的轻量级激活规划器元数据。仅限元数据；插件运行时仍负责实际行为。                                                                                                        |
| `setup`                              | 否   | `object`                         | 发现和设置界面可在不加载插件运行时的情况下检查的轻量级设置/引导描述符。                                                                                                                                                   |
| `qaRunners`                          | 否   | `object[]`                       | 共享 `openclaw qa` 主机在加载插件运行时之前使用的轻量级 QA 运行器描述符。                                                                                                                                                 |
| `contracts`                          | 否   | `object`                         | 面向外部认证钩子、语音、实时转录、实时语音、媒体理解、图像生成、音乐生成、视频生成、网页抓取、网页搜索和工具所有权的静态捆绑能力快照。                                                                                     |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 对于在 `contracts.mediaUnderstandingProviders` 中声明的 provider id 的轻量级媒体理解默认值。                                                                                                                             |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 由清单拥有的 channel 配置元数据，在运行时加载之前合并到发现和验证界面中。                                                                                                                                                |
| `skills`                             | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                                                                                                                                                     |
| `name`                               | 否   | `string`                         | 人类可读的插件名称。                                                                                                                                                                                                     |
| `description`                        | 否   | `string`                         | 在插件界面中显示的简短摘要。                                                                                                                                                                                             |
| `version`                            | 否   | `string`                         | 信息性插件版本。                                                                                                                                                                                                         |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感性提示。                                                                                                                                                                                 |

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一种引导或认证选择。
OpenClaw 在提供商运行时加载之前读取此内容。
提供商设置流程优先使用这些清单选择，然后再回退到运行时
向导元数据和安装目录选择以保证兼容性。

| 字段                  | 是否必需 | 类型                                            | 含义                                                                  |
| --------------------- | -------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `provider`            | 是       | `string`                                        | 此选择所属的提供商 ID。                                               |
| `method`              | 是       | `string`                                        | 要分派到的认证方法 ID。                                               |
| `choiceId`           | 是       | `string`                                        | 引导和 CLI 流程使用的稳定认证选择 ID。                                |
| `choiceLabel`         | 否       | `string`                                        | 面向用户的标签。如果省略，OpenClaw 将回退到 `choiceId`。              |
| `choiceHint`          | 否       | `string`                                        | 选择器的简短帮助文本。                                                |
| `assistantPriority`   | 否       | `number`                                        | 较小的值在助手驱动的交互式选择器中排序更靠前。                        |
| `assistantVisibility` | 否       | `"visible"` \| `"manual-only"`                  | 从助手选择器中隐藏该选择，同时仍允许手动 CLI 选择。                   |
| `deprecatedChoiceIds` | 否       | `string[]`                                      | 应将用户重定向到此替代选择的旧版选择 ID。                             |
| `groupId`             | 否       | `string`                                        | 用于分组相关选择的可选组 ID。                                         |
| `groupLabel`          | 否       | `string`                                        | 该组的面向用户标签。                                                  |
| `groupHint`           | 否       | `string`                                        | 该组的简短帮助文本。                                                  |
| `optionKey`           | 否       | `string`                                        | 用于简单单标志认证流程的内部选项键。                                  |
| `cliFlag`             | 否       | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                           |
| `cliOption`           | 否       | `string`                                        | 完整 CLI 选项形状，例如 `--openrouter-api-key <key>`。                |
| `cliDescription`      | 否       | `string`                                        | CLI 帮助中使用的描述。                                                |
| `onboardingScopes`    | 否       | `Array<"text-inference" \| "image-generation">` | 此选择应出现在哪些引导界面上。如果省略，默认为 `["text-inference"]`。 |

## commandAliases 参考

当插件拥有运行时命令名称且用户可能错误地将其放入 `plugins.allow` 或尝试作为根 CLI 命令运行时，请使用 `commandAliases`。OpenClaw 使用此元数据进行诊断，而无需导入插件运行时代码。

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

| 字段         | 是否必需 | 类型              | 含义                                             |
| ------------ | ------------------ | ------------------------------------------------ |
| `name`       | 是       | `string`          | 属于此插件的命令名称。                           |
| `kind`       | 否       | `"runtime-slash"` | 将别名标记为聊天斜杠命令而不是根 CLI 命令。      |
| `cliCommand` | 否       | `string`          | 建议用于 CLI 操作的相关根 CLI 命令（如果存在）。 |

## activation 参考

当插件可以低成本声明哪些控制平面事件
应将其包含在激活/加载计划中时，请使用 `activation`。

此块是规划器元数据，不是生命周期 API。它不会注册
运行时行为，不会替代 `register(...)`，也不保证
插件代码已经执行。激活规划器使用这些字段来
在回退到现有清单所有权
元数据（例如 `providers`、`channels`、`commandAliases`、`setup.providers`、
`contracts.tools` 和 hooks）之前缩小候选插件范围。

优先使用已经描述所有权的最窄元数据。当这些字段表达了相应关系时，请使用
`providers`、`channels`、`commandAliases`、设置描述符或 `contracts`。
当需要额外的规划器提示而这些所有权字段无法表示时，
请使用 `activation`。

此块仅为元数据。它不会注册运行时行为，也不会
替代 `register(...)`、`setupEntry` 或其他运行时/插件入口点。
当前消费者将其用作在更广泛的插件加载之前的缩小提示，因此
缺少激活元数据通常只会影响性能；在旧版清单所有权回退仍然存在时，
它不应影响正确性。

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| 字段              | 是否必需 | 类型                                                 | 含义                                                                                                                                     |
| ------------------ | -------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `onProviders`      | 否       | `string[]`                                           | 应将此插件包含在激活/加载计划中的提供商 ID。                                                                            |
| `onAgentHarnesses` | 否       | `string[]`                                           | 应将此插件包含在激活/加载计划中的嵌入式 agent harness 运行时 ID。CLI 后端别名请使用顶层 `cliBackends`。 |
| `onCommands`       | 否       | `string[]`                                           | 应将此插件包含在激活/加载计划中的命令 ID。                                                                             |
| `onChannels`       | 否       | `string[]`                                           | 应将此插件包含在激活/加载计划中的通道 ID。                                                                             |
| `onRoutes`         | 否       | `string[]`                                           | 应将此插件包含在激活/加载计划中的路由类型。                                                                             |
| `onConfigPaths`    | 否       | `string[]`                                           | 当路径存在且未被显式禁用时，应将此插件包含在启动/加载计划中的相对根配置路径。            |
| `onCapabilities`   | 否       | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面激活规划使用的宽泛能力提示。尽可能优先使用更窄的字段。                                           |

当前实时消费者：

- command-triggered CLI planning falls back to legacy
  `commandAliases[].cliCommand` or `commandAliases[].name`
- agent-runtime startup planning uses `activation.onAgentHarnesses` for
  embedded harnesses and top-level `cliBackends[]` for CLI runtime aliases
- channel-triggered setup/channel planning falls back to legacy `channels[]`
  ownership when explicit channel activation metadata is missing
- startup plugin planning uses `activation.onConfigPaths` for non-channel root
  config surfaces such as the bundled browser plugin's `browser` block
- provider-triggered setup/runtime planning falls back to legacy
  `providers[]` and top-level `cliBackends[]` ownership when explicit provider
  activation metadata is missing

规划器诊断可以区分显式激活提示和清单
所有权回退。例如，`activation-command-hint` 表示
`activation.onCommands` 匹配，而 `manifest-command-alias` 表示
规划器改为使用 `commandAliases` 所有权。这些原因标签仅供
主机诊断和测试使用；插件作者应继续声明最能描述所有权的元数据。

## qaRunners 参考

当插件在共享的 `openclaw qa` 根命令下提供一个或多个传输运行器时，请使用 `qaRunners`。请保持此元数据轻量且静态；插件运行时仍通过一个轻量级的 `runtime-api.ts` 接口来负责实际的 CLI 注册，该接口导出 `qaRunnerCliRegistrations`。

```json
{
  "qaRunners": [
    {
      "commandName": "matrix",
      "description": "在可丢弃的 homeserver 上运行 Docker 支持的 Matrix 实时 QA 任务"
    }
  ]
}
```

| 字段          | 是否必需 | 类型     | 含义                                                      |
| ------------- | -------- | -------- | --------------------------------------------------------- |
| `commandName` | 是       | `string` | 挂载在 `openclaw qa` 下的子命令，例如 `matrix`。         |
| `description` | 否       | `string` | 当共享宿主需要一个占位命令时使用的后备帮助文本。          |

## setup reference

当设置和引导界面需要在运行时加载之前拥有低成本的插件元数据时，请使用 `setup`。

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

顶层 `cliBackends` 保持有效并继续描述 CLI 推理后端。`setup.cliBackends` 是应保持仅为元数据的控制平面/设置流的特定于设置的描述符表面。

当存在时，`setup.providers` 和 `setup.cliBackends` 是设置发现的首选描述符优先查找表面。如果描述符仅窄化了候选插件且设置仍然需要更丰富的设置时运行时钩子，请设置 `requiresRuntime: true` 并将 `setup-api` 保留为回退执行路径。

OpenClaw 还将 `setup.providers[].envVars` 包含在通用提供商认证和
环境变量查找中。在弃用窗口期间，`providerAuthEnvVars` 仍通过兼容
适配器获得支持，但仍使用它的未打包插件会收到清单诊断。
新插件应将设置/状态环境元数据放在 `setup.providers[].envVars` 上。

当没有可用的设置条目时，或者当 `setup.requiresRuntime: false`
声明设置运行时不必要时，OpenClaw 还可以从 `setup.providers[].authMethods`
派生简单的设置选择。显式 `providerAuthChoices` 条目在自定义标签、
CLI 标志、引导范围和助手元数据方面仍然优先。

仅当这些描述符足以满足设置界面时，才将 `requiresRuntime: false` 设为 `false`。
OpenClaw 将显式 `false` 视为仅描述符契约，
不会为了设置查找而执行 `setup-api` 或 `openclaw.setupEntry`。如果
仅描述符插件仍然提供其中一个设置运行时条目，
OpenClaw 会报告追加诊断并继续忽略它。省略
`requiresRuntime` 会保留旧版回退行为，因此已有插件在未设置该标志时添加描述符也不会中断。

由于设置查找可能会执行插件拥有的 `setup-api` 代码，规范化后的
`setup.providers[].id` 和 `setup.cliBackends[]` 值在已发现插件之间必须保持唯一。
有歧义的所有权会直接失败，而不是按发现顺序挑选
胜出者。

当设置运行时确实执行时，如果 `setup-api` 注册了清单描述符
未声明的提供商或 CLI 后端，或者某个描述符没有匹配的运行时
注册，设置注册表诊断会报告描述符漂移。这些诊断是追加式的，不会拒绝旧版插件。

### setup.providers reference

| 字段          | 是否必需 | 类型       | 含义                                                       |
| ------------- | ---------- | ---------- | ---------------------------------------------------------- |
| `id`          | 是       | `string`   | 在设置或引导期间公开的提供商 ID。保持标准化 ID 全局唯一。  |
| `authMethods` | 否       | `string[]` | 此提供商在不加载完整运行时的情况下支持的设置/认证方法 ID。 |
| `envVars`     | 否       | `string[]` | 通用设置/状态表面可以在插件运行时加载之前检查的环境变量。  |

### setup 字段

| 字段               | 是否必需 | 类型       | 含义                                                            |
| ------------------ | ---------- | ---------- | --------------------------------------------------------------- |
| `providers`        | 否       | `object[]` | 在设置和引导期间公开的提供商设置描述符。                        |
| `cliBackends`      | 否       | `string[]` | 用于描述符优先设置查找的设置时后端 ID。保持标准化 ID 全局唯一。 |
| `configMigrations` | 否       | `string[]` | 由此插件的设置表面拥有的配置迁移 ID。                           |
| `requiresRuntime`  | 否       | `boolean`  | 描述符查找后设置是否仍需要 `setup-api` 执行。                   |

## uiHints 参考

`uiHints` 是从配置字段名到小型渲染提示的映射。

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

每个字段提示可以包括：

| 字段          | 类型       | 含义                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向用户的字段标签。     |
| `help`        | `string`   | 简短帮助文本。           |
| `tags`        | `string[]` | 可选 UI 标签。           |
| `advanced`    | `boolean`  | 将字段标记为高级。       |
| `sensitive`   | `boolean`  | 将字段标记为秘密或敏感。 |
| `placeholder` | `string`   | 表单输入的占位符文本。   |

## 合约参考

仅将 `contracts` 用于 OpenClaw 无需导入插件运行时即可读取的静态能力所有权元数据。

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["pi", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "migrationProviders": ["hermes"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的：

| 字段                            | 类型       | 含义                                                         |
| -------------------------------- | ---------- | ------------------------------------------------------------ |
| `embeddedExtensionFactories`     | `string[]` | Codex 应用服务器扩展工厂 ID，目前为 `codex-app-server`。    |
| `agentToolResultMiddleware`      | `string[]` | 捆绑插件可注册工具结果中间件的运行时 ID。                    |
| `externalAuthProviders`          | `string[]` | 其外部认证配置文件挂钩由此插件拥有的提供商 ID。              |
| `speechProviders`                | `string[]` | 此插件拥有的语音提供商 ID。                                  |
| `realtimeTranscriptionProviders` | `string[]` | 此插件拥有的实时转写提供商 ID。                              |
| `realtimeVoiceProviders`         | `string[]` | 此插件拥有的实时语音提供商 ID。                              |
| `memoryEmbeddingProviders`       | `string[]` | 此插件拥有的记忆嵌入提供商 ID。                              |
| `mediaUnderstandingProviders`    | `string[]` | 此插件拥有的媒体理解提供商 ID。                              |
| `imageGenerationProviders`       | `string[]` | 此插件拥有的图像生成提供商 ID。                              |
| `videoGenerationProviders`       | `string[]` | 此插件拥有的视频生成提供商 ID。                              |
| `webFetchProviders`              | `string[]` | 此插件拥有的网页抓取提供商 ID。                              |
| `webSearchProviders`             | `string[]` | 此插件拥有的网页搜索提供商 ID。                              |
| `migrationProviders`             | `string[]` | 此插件在 `openclaw migrate` 中拥有的导入提供商 ID。          |
| `tools`                          | `string[]` | 此插件在捆绑合约检查中拥有的代理工具名称。                   |

`contracts.embeddedExtensionFactories` 保留给捆绑的 Codex
仅应用服务器扩展工厂。捆绑的工具结果转换应改为声明
`contracts.agentToolResultMiddleware` 并通过
`api.registerAgentToolResultMiddleware(...)` 注册。外部插件不能注册工具结果中间件，因为该接缝可以在模型看到之前重写高信任度工具
输出。

实现 `resolveExternalAuthProfiles` 的提供商插件应声明
`contracts.externalAuthProviders`。未声明的插件仍会通过已弃用的兼容性回退运行，
但该回退速度更慢，并将在迁移窗口结束后移除。

捆绑的记忆嵌入提供商应对其公开的每个适配器 ID 声明
`contracts.memoryEmbeddingProviders`，包括诸如 `local` 之类的内置适配器。独立 CLI 路径使用此清单
合约，在完整 Gateway 运行时注册提供商之前只加载其所属插件。

## mediaUnderstandingProviderMetadata 参考

当某个媒体理解提供商具有默认模型、自动认证回退优先级，或原生文档支持，并且通用核心辅助函数在运行时加载之前就需要这些信息时，请使用 `mediaUnderstandingProviderMetadata`。键也必须在 `contracts.mediaUnderstandingProviders` 中声明。

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
      "nativeDocumentInputs": ["pdf"]
    }
  }
}
```

每个提供商条目可以包括：

| 字段                  | 类型                                | 含义                                                                      |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `capabilities`        | `("image" \| "audio" \| "video")[]` | 此提供商公开的媒体能力。                                                  |
| `defaultModels`       | `Record<string, string>`            | 当配置未指定模型时使用的能力到模型默认映射。                               |
| `autoPriority`        | `Record<string, number>`            | 数字越小，自动基于凭证的提供商回退排序越靠前。                             |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供商支持的原生文档输入。                                                |

## 通道配置参考

当某个通道插件在运行时加载之前需要廉价的配置元数据时，请使用 `channelConfigs`。只读的通道设置/状态发现可以在没有可用设置条目时，或当 `setup.requiresRuntime: false` 声明无需设置运行时时，直接使用这些元数据来处理已配置的外部通道。

对于通道插件，`configSchema` 和 `channelConfigs` 描述不同的路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

声明了 `channels[]` 的非捆绑插件也应声明匹配的
`channelConfigs` 条目。没有它们，OpenClaw 仍然可以加载插件，但
冷路径配置模式、设置和 Control UI 界面在插件运行时执行之前都无法知道
该通道拥有的选项形状。

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
          "label": "Homeserver URL",
          "placeholder": "https://matrix.example.com"
        }
      },
      "label": "Matrix",
      "description": "Matrix homeserver 连接",
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

每个通道条目可以包括：

| 字段          | 类型                     | 含义                                                           |
| ------------- | ------------------------ | -------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每个声明的通道配置条目都需要。 |
| `uiHints`     | `Record<string, object>` | 该通道配置部分的可选 UI 标签/占位符/敏感提示。                 |
| `label`       | `string`                 | 当运行时元数据未就绪时，合并到选择器和检查界面中的通道标签。   |
| `description` | `string`                 | 用于检查和目录界面的简短通道描述。                             |
| `preferOver`  | `string[]`               | 此通道在选择界面中应优先于的遗留或低优先级插件 ID。            |

## 模型支持参考

当 OpenClaw 应在插件运行时加载之前，从 `gpt-5.5` 或 `claude-sonnet-4.6` 之类的简写模型 ID 推断你的提供商插件时，请使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 应用此优先级：

- 显式的 `provider/model` 引用使用所属的 `providers` 清单元数据
- `modelPatterns` 优先于 `modelPrefixes`
- 如果一个非捆绑插件和一个捆绑插件都匹配，则非捆绑插件胜出
- 剩余的歧义将被忽略，直到用户或配置指定提供商

字段：

| 字段            | 类型       | 含义                                                 |
| --------------- | ---------- | ---------------------------------------------------- |
| `modelPrefixes` | `string[]` | 与简写模型 ID 通过 `startsWith` 匹配的前缀。         |
| `modelPatterns` | `string[]` | 移除配置文件后缀后与简写模型 ID 匹配的正则表达式源。 |

## modelCatalog 参考

当 OpenClaw 应在加载插件运行时之前了解提供商模型元数据时，请使用 `modelCatalog`。这是固定目录行、提供商别名、抑制规则和发现模式的清单所有权来源。运行时刷新仍属于提供商运行时代码，但清单会告诉核心何时需要运行时。

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
        "reason": "在 Azure OpenAI Responses 中不可用"
      }
    ],
    "discovery": {
      "openai": "static"
    }
  }
}
```

顶层字段：

| 字段          | 类型                                                     | 含义                                                                                               |
| -------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | 此插件拥有的提供商 ID 的目录行。键也应出现在顶层 `providers` 中。                                    |
| `aliases`      | `Record<string, object>`                                 | 应解析为所拥有提供商以用于目录或抑制规划的提供商别名。                                               |
| `suppressions` | `object[]`                                               | 此插件因特定提供商原因抑制的来自其他来源的模型行。                                                  |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供商目录是否可从清单元数据读取、刷新到缓存，或需要运行时。                                        |

`aliases` 参与 model-catalog 规划中的提供商所有权查找。
别名目标必须是同一插件拥有的顶层提供商。当
使用按提供商过滤的列表时，如果使用别名，OpenClaw 可以读取所属清单并
在不加载提供商运行时的情况下应用别名 API/基础 URL 覆盖。

`suppressions` 是对提供商运行时
`suppressBuiltInModel` 钩子的首选静态替代方案。只有当
提供商归该插件所有，或被声明为 `modelCatalog.aliases` 键且
目标为所拥有的提供商时，才会遵守抑制条目。对于尚未迁移的插件，运行时抑制钩子仍会作为已弃用的兼容性回退运行。

提供商字段：

| 字段     | 类型                     | 含义                                                     |
| --------- | ------------------------ | -------------------------------------------------------- |
| `baseUrl` | `string`                 | 此提供商目录中模型的可选默认基础 URL。                   |
| `api`     | `ModelApi`               | 此提供商目录中模型的可选默认 API 适配器。                 |
| `headers` | `Record<string, string>` | 应用于此提供商目录的可选静态请求头。                     |
| `models`  | `object[]`               | 必需的模型行。没有 `id` 的行会被忽略。                   |

模型字段：

| 字段           | 类型                                                           | 含义                                                               |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `id`            | `string`                                                       | 提供商本地模型 ID，不含 `provider/` 前缀。                         |
| `name`          | `string`                                                       | 可选显示名称。                                                      |
| `api`           | `ModelApi`                                                     | 可选的单模型 API 覆盖。                                            |
| `baseUrl`       | `string`                                                       | 可选的单模型基础 URL 覆盖。                                       |
| `headers`       | `Record<string, string>`                                       | 可选的单模型静态请求头。                                          |
| `input`         | `Array<"text" \| "image" \| "document">`                       | 模型接受的模态。                                                   |
| `reasoning`     | `boolean`                                                      | 模型是否暴露推理行为。                                             |
| `contextWindow` | `number`                                                       | 原生提供商上下文窗口。                                             |
| `contextTokens` | `number`                                                       | 当与 `contextWindow` 不同时，可选的有效运行时上下文上限。          |
| `maxTokens`     | `number`                                                       | 已知时的最大输出 token 数。                                        |
| `cost`          | `object`                                                       | 可选的每百万 token 美元定价，包括可选的 `tieredPricing`。         |
| `compat`        | `object`                                                       | 与 OpenClaw 模型配置兼容性匹配的可选兼容性标志。                   |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列表状态。仅当该行根本不应出现时才抑制。                           |
| `statusReason`  | `string`                                                       | 与不可用状态一起显示的可选原因。                                  |
| `replaces`      | `string[]`                                                     | 此模型取代的较旧提供商本地模型 ID。                                |
| `replacedBy`    | `string`                                                       | 已弃用条目的替代提供商本地模型 ID。                                |
| `tags`          | `string[]`                                                     | 由选择器和过滤器使用的稳定标签。                                   |

不要将仅运行时数据放入 `modelCatalog`。如果某个提供商需要账户状态、API 请求或本地进程发现才能知道完整模型集合，请在 `discovery` 中将该提供商声明为 `refreshable` 或 `runtime`。

## modelIdNormalization 参考

在便宜的、由提供商拥有的模型 ID 清理上使用 `modelIdNormalization`，这必须在提供商运行时加载之前发生。这会将诸如短模型名称、提供商本地的旧版 ID，以及代理前缀规则之类的别名，保留在所属插件清单中，而不是放在核心模型选择表中。

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

提供商字段：

| 字段                                 | 类型                    | 含义                                                                                      |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不区分大小写的精确模型 ID 别名。返回值保持原样。                                          |
| `stripPrefixes`                      | `string[]`              | 在别名查找前要移除的前缀，适用于旧版提供商/模型重复命名。                                  |
| `prefixWhenBare`                     | `string`                | 当归一化后的模型 ID 不包含 `/` 时，要添加的前缀。                                          |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 别名查找后的条件性裸 ID 前缀规则，以 `modelPrefix` 和 `prefix` 为键。                      |

## providerEndpoints 参考

在端点分类上使用 `providerEndpoints`，这是通用请求策略在提供商运行时加载之前必须知道的内容。核心仍然负责每个 `endpointClass` 的含义；插件清单负责主机和基础 URL 元数据。

端点字段：

| 字段                           | 类型       | 含义                                                                                         |
| ------------------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端点类别，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。                |
| `hosts`                        | `string[]` | 映射到该端点类别的精确主机名。                                                               |
| `hostSuffixes`                 | `string[]` | 映射到该端点类别的主机后缀。对于仅域后缀匹配，请在前面加上 `.`。                               |
| `baseUrls`                     | `string[]` | 映射到该端点类别的精确规范化 HTTP(S) 基础 URL。                                               |
| `googleVertexRegion`           | `string`   | 用于精确全局主机的静态 Google Vertex 区域。                                                   |
| `googleVertexRegionHostSuffix` | `string`   | 从匹配主机中剥离以暴露 Google Vertex 区域前缀的后缀。                                         |

## providerRequest 参考

在提供商运行时未加载时，使用 `providerRequest` 提供通用请求策略所需的廉价请求兼容性元数据。将行为相关的负载重写保留在提供商运行时钩子或共享的 provider-family 辅助程序中。

```json
{
  "providers": ["vllm"],
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

提供商字段：

| 字段                  | 类型         | 含义                                                                                     |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `family`              | `string`     | 通用请求兼容性决策和诊断所使用的提供商家族标签。                                         |
| `compatibilityFamily` | `"moonshot"` | 供共享请求辅助程序使用的可选提供商家族兼容性桶。                                         |
| `openAICompletions`   | `object`     | OpenAI 兼容的 completions 请求标志，当前为 `supportsStreamingUsage`。                     |

## modelPricing 参考

当提供商需要在运行时加载之前控制面定价行为时，使用 `modelPricing`。Gateway 定价缓存会读取这些元数据，而无需导入提供商运行时代码。

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

提供商字段：

| 字段        | 类型              | 含义                                                                                      |
| ----------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | 对于本地/自托管提供商设置为 `false`，这些提供商不应获取 OpenRouter 或 LiteLLM 定价。       |
| `openRouter` | `false \| object` | OpenRouter 定价查找映射。`false` 会为该提供商禁用 OpenRouter 查找。                       |
| `liteLLM`    | `false \| object` | LiteLLM 定价查找映射。`false` 会为该提供商禁用 LiteLLM 查找。                              |

来源字段：

| 字段                      | 类型               | 含义                                                                                                         |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 当外部目录提供商 ID 与 OpenClaw 提供商 ID 不同时使用，例如某个 `zai` 提供商使用 `z-ai`。                      |
| `passthroughProviderModel` | `boolean`          | 将包含斜杠的模型 ID 视为嵌套的提供商/模型引用，对 OpenRouter 之类的代理提供商很有用。                         |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录模型 ID 变体。`version-dots` 会尝试类似 `claude-opus-4.6` 这样的带点版本 ID。                |

### OpenClaw 提供商索引

## 清单与 package.json

这两个文件服务于不同的职责：

| 文件                   | 用途                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 发现、配置验证、auth-choice 元数据以及插件代码运行前必须存在的 UI 提示         |
| `package.json`         | npm 元数据、依赖安装以及用于入口点、安装门控、设置或目录元数据的 `openclaw` 块 |

如果您不确定某条元数据属于哪里，请使用此规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放入 `openclaw.plugin.json`
- 如果它是关于打包、入口文件或 npm 安装行为，请将其放入 `package.json`

### 影响发现的 package.json 字段

一些运行时前的插件元数据有意放在 `package.json` 的 `openclaw` 块下，而不是 `openclaw.plugin.json`。

重要示例：

| 字段                                                             | 含义                                                                                                                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 声明原生插件入口点。必须保留在插件包目录内。                                                                                                                                        |
| `openclaw.runtimeExtensions`                                      | 声明已构建的 JavaScript 运行时入口点，供已安装的包使用。必须保留在插件包目录内。                                                                                                     |
| `openclaw.setupEntry`                                             | 轻量级仅设置入口点，用于入门引导、延迟通道启动，以及只读通道状态/SecretRef 发现。必须保留在插件包目录内。                                                                             |
| `openclaw.runtimeSetupEntry`                                      | 声明已构建的 JavaScript 设置入口点，供已安装的包使用。必须保留在插件包目录内。                                                                                                      |
| `openclaw.channel`                                                | 诸如标签、文档路径、别名和选择文案之类的廉价通道目录元数据。                                                                                                                         |
| `openclaw.channel.configuredState`                                | 轻量级已配置状态检查器元数据，可在不加载完整通道运行时的情况下回答“是否已经存在仅环境设置？”。                                                                                         |
| `openclaw.channel.persistedAuthState`                             | 轻量级已持久化认证状态检查器元数据，可在不加载完整通道运行时的情况下回答“是否已经登录过？”。                                                                                         |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 内置和外部发布插件的安装/更新提示。                                                                                                                                                |
| `openclaw.install.defaultChoice`                                  | 当存在多个安装来源时的首选安装路径。                                                                                                                                                 |
| `openclaw.install.minHostVersion`                                 | 最低支持的 OpenClaw 主机版本，使用类似 `>=2026.3.22` 的 semver 下限。                                                                                                                |
| `openclaw.install.expectedIntegrity`                              | 预期的 npm dist 完整性字符串，例如 `sha512-...`；安装和更新流程会据此验证获取到的制品。                                                                                               |
| `openclaw.install.allowInvalidConfigRecovery`                     | 当配置无效时，允许一条有限的内置插件重新安装恢复路径。                                                                                                                                |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 允许在启动期间，先加载仅设置的通道界面，再加载完整的通道插件。                                                                                                                         |

清单元数据决定在运行时加载之前，入门引导中会显示哪些提供者/通道/设置选项。`package.json#openclaw.install` 告诉入门引导，当用户选择这些选项之一时，如何获取或启用该插件。不要把安装提示移到 `openclaw.plugin.json` 中。

`openclaw.install.minHostVersion` 会在安装和清单注册表加载期间强制执行。无效值会被拒绝；较新但有效的值会在旧主机上跳过该插件。

精确的 npm 版本锁定已经存在于 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录条目应将精确规格与 `expectedIntegrity` 配对，这样如果获取到的 npm 制品不再匹配固定发行版，更新流程就会安全失败。为了兼容性，交互式入门引导仍会提供受信任的注册表 npm 规格，包括裸包名和 dist-tag。目录诊断可以区分精确、浮动、完整性固定、缺少完整性、包名不匹配以及无效默认选择来源。它们还会在存在 `expectedIntegrity` 但没有可供其固定的有效 npm 源时发出警告。当存在 `expectedIntegrity` 时，安装/更新流程会强制执行；当它被省略时，注册表解析会被记录下来，但不带完整性固定。

当状态、通道列表或 SecretRef 扫描需要在完整通道插件加载之前识别已配置账户时，通道插件应提供 `openclaw.setupEntry`。设置入口应公开通道元数据以及适用于设置的配置、状态和 secrets 适配器；把网络客户端、网关监听器和传输运行时保留在主扩展入口点中。

运行时入口字段不会覆盖源入口字段的包边界检查。例如，`openclaw.runtimeExtensions` 不能使一个会越界的 `openclaw.extensions` 路径变得可加载。

`openclaw.install.allowInvalidConfigRecovery` 的范围是有意收窄的。它不会使任意损坏的配置都可安装。当前它只允许安装流程从特定的陈旧捆绑插件升级失败中恢复，例如缺失的捆绑插件路径，或者同一捆绑插件的陈旧 `channels.<id>` 条目。无关的配置错误仍然会阻止安装，并引导操作员执行 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是微型检查器模块的包元数据：

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

当设置、doctor、status 或只读存在性流程需要在完整通道插件加载之前进行一次廉价的“是/否”认证探测时使用它。持久化认证状态不是已配置的通道状态：不要使用这些元数据来自动启用插件、修复运行时依赖，或决定是否应加载某个通道运行时。目标导出应是一个只读取持久化状态的小函数；不要通过完整的通道运行时 barrel 来路由它。

`openclaw.channel.configuredState` 遵循相同的形状，以用于廉价的仅环境配置检查：

```json
{
  "openclaw": {
    "channel": {
      "id": "telegram",
      "configuredState": {
        "specifier": "./configured-state",
        "exportName": "hasTelegramConfiguredState"
      }
    }
  }
}
```

当通道可以从环境或其他微型非运行时输入回答配置状态时使用它。如果检查需要完整配置解析或真实的通道运行时，请将该逻辑保留在插件 `config.hasConfiguredState` 钩子中。

## 发现优先级（重复的插件 id）

OpenClaw 会从多个根目录发现插件（捆绑、全局安装、工作区、显式配置选择的路径）。如果两次发现共享相同的 `id`，则只保留**优先级最高**的清单；较低优先级的重复项会被丢弃，而不是并排加载。

优先级从高到低：

1. **配置选择** — 在 `plugins.entries.<id>` 中显式固定的路径
2. **捆绑** — 随 OpenClaw 一起发布的插件
3. **全局安装** — 安装到全局 OpenClaw 插件根目录中的插件
4. **工作区** — 相对于当前工作区发现的插件

影响：

- 工作区中存在的某个捆绑插件的分支或陈旧副本，不会覆盖捆绑构建。
- 若要真正用本地插件覆盖捆绑插件，请通过 `plugins.entries.<id>` 将其固定，这样它会按优先级胜出，而不是依赖工作区发现。
- 重复项被丢弃时会记录日志，因此 Doctor 和启动诊断可以指出被丢弃的副本。

## JSON Schema 要求

- **每个插件必须提供 JSON Schema**，即使它不接受任何配置。
- 空方案是允许的（例如，`{ "type": "object", "additionalProperties": false }`）。
- 模式在配置读取/写入时验证，而非运行时。

## 验证行为

- 除非频道 ID 被插件清单声明，否则未知的 `channels.*` 键是**错误**。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必须引用**可发现**的插件 ID。未知 ID 是**错误**。
- 如果插件已安装但清单或模式损坏或缺失，验证失败，Doctor 会报告插件错误。
- 如果存在插件配置但插件**被禁用**，配置会被保留，并在 Doctor 和日志中显示**警告**。

请参阅 [配置参考](/gateway/configuration) 以获取完整的 `plugins.*` 模式。

## 注意事项

- 该清单对于原生 OpenClaw 插件是**必需的**，包括本地文件系统加载。运行时仍然会单独加载插件模块；清单仅用于发现 + 验证。
- 原生清单使用 JSON5 解析，因此只要最终值仍然是对象，就可以接受注释、尾随逗号和未加引号的键。
- 清单加载器只读取文档化的清单字段。避免使用自定义顶层键。
- 当插件不需要时，可以省略 `channels`、`providers`、`cliBackends` 和 `skills`。
- `providerDiscoveryEntry` 必须保持轻量，不应导入大范围运行时代码；请将其用于静态提供者目录元数据或窄范围发现描述符，而不是请求时执行。
- 互斥插件类型通过 `plugins.slots.*` 选择：通过 `plugins.slots.memory` 选择 `kind: "memory"`，通过 `plugins.slots.contextEngine` 选择 `kind: "context-engine"`（默认 `legacy`）。
- 环境变量元数据（`setup.providers[].envVars`、已弃用的 `providerAuthEnvVars` 和 `channelEnvVars`）仅为声明式。状态、审计、cron 投递验证以及其他只读界面在将环境变量视为已配置之前，仍然会应用插件信任和有效激活策略。
- 对于需要提供者代码的运行时向导元数据，请参阅 [提供者运行时钩子](/plugins/architecture-internals#provider-runtime-hooks)。
- 如果你的插件依赖原生模块，请记录构建步骤以及任何包管理器白名单要求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相关

<CardGroup cols={3}>
  <Card title="构建插件" href="/plugins/building-plugins" icon="rocket">
    开始使用插件。
  </Card>
  <Card title="插件架构" href="/plugins/architecture" icon="diagram-project">
    内部架构和能力模型。
  </Card>
  <Card title="SDK 概览" href="/plugins/sdk-overview" icon="book">
    插件 SDK 参考和子路径导入。
  </Card>
</CardGroup>
