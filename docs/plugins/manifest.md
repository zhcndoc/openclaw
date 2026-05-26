---
summary: "插件清单 + JSON schema 要求（严格配置校验）"
read_when:
  - 你正在构建一个 OpenClaw 插件
  - 你需要发布插件配置 schema 或调试插件校验错误
title: "插件清单"
---

本页面仅适用于**原生 OpenClaw 插件清单**。

有关兼容的 bundle 布局，请参见 [插件捆绑包](/plugins/bundles)。

兼容的 bundle 格式使用不同的清单文件：

- Codex 捆绑包: `.codex-plugin/plugin.json`
- Claude 捆绑包: `.claude-plugin/plugin.json` 或默认的 Claude 组件
  布局（不带清单）
- Cursor 捆绑包: `.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些 bundle 布局，但它们不会根据此处描述的
`openclaw.plugin.json` schema 进行校验。

对于兼容的 bundles，OpenClaw 当前会读取 bundle 元数据以及声明的
skill 根目录、Claude 命令根目录、Claude bundle `settings.json` 默认值、
Claude bundle LSP 默认值，以及在布局符合 OpenClaw 运行时预期时支持的 hook packs。

每个原生 OpenClaw 插件**必须**在**插件根目录**下提供一个
`openclaw.plugin.json` 文件。OpenClaw 使用此清单在**不执行插件代码**的情况下验证配置。
缺失或无效的清单会被视为插件错误，并阻止配置校验。

查看完整的插件系统指南：[插件](/tools/plugin)。
有关原生能力模型和当前外部兼容性指导，请参见：
[能力模型](/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在**加载你的插件代码之前**读取的元数据。
下面的一切都必须足够轻量，才能在不启动插件运行时的情况下检查。

**用于：**

- 插件标识、配置校验和配置 UI 提示
- 认证、引导和设置元数据（别名、自动启用、提供方环境变量、认证选项）
- 控制平面界面的激活提示
- 简写模型族归属
- 静态能力归属快照（`contracts`）
- 共享 `openclaw qa` 主机可以检查的 QA 运行器元数据
- 合并到目录和校验界面的按通道配置元数据

**不要用于：** 注册运行时行为、声明代码入口点，
或 npm 安装元数据。这些属于你的插件代码和 `package.json`。

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

| 字段                                 | 必需 | 类型                             | 含义                                                                                                                                                                                                                                   |
| ------------------------------------ | ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是   | `string`                         | 规范化的插件 id。这是用于 `plugins.entries.<id>` 的 id。                                                                                                                                                                             |
| `configSchema`                       | 是   | `object`                         | 此插件配置的内联 JSON Schema。                                                                                                                                                                                                        |
| `enabledByDefault`                   | 否   | `true`                           | 将捆绑插件标记为默认启用。省略它，或设置任何非 `true` 值，即可让插件默认保持禁用。                                                                                                                                                    |
| `enabledByDefaultOnPlatforms`        | 否   | `string[]`                       | 仅在列出的 Node.js 平台上将捆绑插件标记为默认启用，例如 `["darwin"]`。显式配置仍然优先生效。                                                                                                                                        |
| `legacyPluginIds`                    | 否   | `string[]`                       | 归一化为此规范化插件 id 的旧 id。                                                                                                                                                                                                     |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 当认证、配置或模型引用提到这些 provider id 时，应自动启用此插件的 provider id。                                                                                                                                                      |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` |  घोषित一个由 `plugins.slots.*` 使用的互斥插件类型。                                                                                                                                                                                   |
| `channels`                           | 否   | `string[]`                       | 由此插件拥有的 channel id。用于发现和配置校验。                                                                                                                                                                                      |
| `providers`                          | 否   | `string[]`                       | 由此插件拥有的 provider id。                                                                                                                                                                                                         |
| `providerCatalogEntry`               | 否   | `string`                         | 轻量级 provider-catalog 模块路径，相对于插件根目录，用于可在不激活完整插件运行时的情况下加载的、以清单为作用域的 provider 目录元数据。                                                                                                   |
| `modelSupport`                       | 否   | `object`                         | 由清单拥有的简写模型族元数据，用于在运行时之前自动加载插件。                                                                                                                                                                         |
| `modelCatalog`                       | 否   | `object`                         | 由此插件拥有的 provider 的声明式模型目录元数据。这是面向未来的只读列表、引导、模型选择器、别名和抑制功能的控制平面契约，无需加载插件运行时。                                                                                           |
| `modelPricing`                       | 否   | `object`                         | 由 provider 拥有的外部定价查询策略。可用于将本地/自托管 provider 排除在远程定价目录之外，或在不在核心中硬编码 provider id 的情况下，将 provider 引用映射到 OpenRouter/LiteLLM 目录 id。                                              |
| `modelIdNormalization`               | 否   | `object`                         | 由 provider 拥有的模型 id 别名/前缀清理，必须在加载 provider 运行时之前执行。                                                                                                                                                        |
| `providerEndpoints`                  | 否   | `object[]`                       | 由清单拥有的端点主机/baseUrl 元数据，用于核心必须在加载 provider 运行时之前分类的 provider 路由。                                                                                                                                      |
| `providerRequest`                    | 否   | `object`                         | 在 provider 运行时加载之前，由通用请求策略使用的廉价 provider-family 和请求兼容性元数据。                                                                                                                                           |
| `cliBackends`                        | 否   | `string[]`                       | 由此插件拥有的 CLI 推理后端 id。用于根据显式配置引用在启动时自动激活。                                                                                                                                                                |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 其插件拥有的合成认证 hook 应在冷启动模型发现期间、运行时加载之前进行探测的 provider 或 CLI 后端引用。                                                                                                                                   |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 捆绑插件拥有的占位 API key 值，表示非密钥的本地、OAuth 或环境凭据状态。                                                                                                                                                              |
| `commandAliases`                     | 否   | `object[]`                       | 由此插件拥有的命令名称，应在运行时加载之前产生具备插件感知的配置和 CLI 诊断。                                                                                                                                                         |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 用于 provider 认证/状态查找的已弃用兼容性 env 元数据。新插件请优先使用 `setup.providers[].envVars`；OpenClaw 在弃用窗口期间仍会读取此项。                                                                                             |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 在认证查找时应复用另一个 provider id 的 provider id，例如一个共享基础 provider API key 和认证配置文件的 coding provider。                                                                                                              |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可以在不加载插件代码的情况下检查的廉价 channel env 元数据。用于 env 驱动的 channel 设置或通用启动/配置辅助程序应看到的认证界面。                                                                                              |
| `providerAuthChoices`                | 否   | `object[]`                       | 用于引导选择器、首选 provider 解析和简单 CLI 标志映射的廉价认证选项元数据。                                                                                                                                                             |
| `activation`                         | 否   | `object`                         | 用于启动、provider、命令、channel、路由和能力触发加载的廉价激活规划器元数据。仅限元数据；插件运行时仍然拥有实际行为。                                                                                                                 |
| `setup`                              | 否   | `object`                         | 发现和设置界面可以在不加载插件运行时的情况下检查的廉价设置/引导描述符。                                                                                                                                                               |
| `qaRunners`                          | 否   | `object[]`                       | 共享 `openclaw qa` 主机在插件运行时加载之前使用的廉价 QA 运行器描述符。                                                                                                                                                              |
| `contracts`                          | 否   | `object`                         | 用于外部 auth hook、embeddings、语音、实时转写、实时语音、媒体理解、图像生成、音乐生成、视频生成、web 获取、web 搜索和工具归属的静态能力归属快照。                                                                                         |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 针对在 `contracts.mediaUnderstandingProviders` 中声明的 provider id 的廉价媒体理解默认值。                                                                                                                                            |
| `imageGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 针对在 `contracts.imageGenerationProviders` 中声明的 provider id 的廉价图像生成认证元数据，包括 provider 拥有的认证别名和 base-url 守卫。                                                                                             |
| `videoGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 针对在 `contracts.videoGenerationProviders` 中声明的 provider id 的廉价视频生成认证元数据，包括 provider 拥有的认证别名和 base-url 守卫。                                                                                             |
| `musicGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 针对在 `contracts.musicGenerationProviders` 中声明的 provider id 的廉价音乐生成认证元数据，包括 provider 拥有的认证别名和 base-url 守卫。                                                                                             |
| `toolMetadata`                       | 否   | `Record<string, object>`         | 针对在 `contracts.tools` 中声明的插件工具的廉价可用性元数据。当某个工具在配置、环境或认证证据存在之前不应加载运行时时使用它。                                                                                                        |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在运行时加载之前合并到发现和校验界面的由清单拥有的 channel 配置元数据。                                                                                                                                                               |
| `skills`                             | 否   | `string[]`                       | 要加载的 skill 目录，相对于插件根目录。                                                                                                                                                                                               |
| `name`                               | 否   | `string`                         | 人类可读的插件名称。                                                                                                                                                                                                                   |
| `description`                        | 否   | `string`                         | 在插件界面中显示的简短摘要。                                                                                                                                                                                                           |
| `version`                            | 否   | `string`                         | 仅供参考的插件版本。                                                                                                                                                                                                                   |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感性提示。                                                                                                                                                                                                |

## 生成 provider 元数据参考

生成 provider 元数据字段描述了匹配的 `contracts.*GenerationProviders` 列表中声明的 provider 的静态 auth 信号。OpenClaw 在 provider 运行时加载之前读取这些字段，因此核心工具可以在不导入每个 provider 插件的情况下决定某个 generation provider 是否可用。

这些字段只应用于低成本、声明式的事实。传输、请求转换、token 刷新、凭据验证以及实际的生成行为都留在插件运行时中。

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

| 字段         | 必填 | 类型       | 含义                                                                                                                                                                           |
| ------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rootPath`    | 是   | `string`   | 指向插件拥有的、要检查的配置对象的点路径，例如 `plugins.entries.example.config`。                                                                                           |
| `overlayPath` | 否   | `string`   | 根配置内的点路径，其对象应在评估信号之前覆盖根对象。用于 `image`、`video` 或 `music` 等特定能力的配置。                                                                      |
| `required`    | 否   | `string[]` | 有效配置中必须具有已配置值的点路径。字符串必须非空；对象和数组不能为空。                                                                                                      |
| `requiredAny` | 否   | `string[]` | 有效配置中至少有一个必须具有已配置值的点路径。                                                                                                                                |
| `mode`        | 否   | `object`   | 有效配置内可选的字符串模式守卫。当仅在某一种模式下适用仅配置可用性时使用。                                                                                                    |

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
| ----------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是         | `string`   | 应检查其 `baseUrl` 的 provider 配置 id。                                                                                                |
| `defaultBaseUrl`  | 否         | `string`   | 当 provider 配置省略 `baseUrl` 时假定使用的 base URL。                                                                                   |
| `allowedBaseUrls` | 是         | `string[]` | 该 auth 信号允许的 base URL。当已配置或默认的 base URL 与这些规范化后的值都不匹配时，该信号将被忽略。 |

## 工具元数据参考

`toolMetadata` 使用与 generation provider 元数据相同的 `configSignals` 和 `authSignals` 形状，并以 tool 名称作为键。`contracts.tools` 声明所有权。`toolMetadata` 声明低成本的可用性证据，这样 OpenClaw 就可以避免仅仅为了让工具工厂返回 `null` 而导入插件运行时。

```json
{
  "providerAuthEnvVars": {
    "example": ["EXAMPLE_API_KEY"]
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

如果某个工具没有 `toolMetadata`，OpenClaw 会保留现有行为，并在工具契约符合策略时加载所属插件。对于工厂依赖 auth/config 的热路径工具，插件作者应声明 `toolMetadata`，而不是让核心去导入运行时询问。

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一个 onboarding 或 auth 选择项。OpenClaw 在 provider runtime 加载之前会先读取这些内容。Provider setup 列表会使用这些 manifest 选择项、基于 descriptor 派生的 setup 选择项，以及 install-catalog 元数据，而无需加载 provider runtime。

| 字段                 | 必填 | 类型                                                                  | 含义                                                                                            |
| --------------------- | ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                                              | 该选择项所属的 provider id。                                                                    |
| `method`              | 是   | `string`                                                              | 要分发到的 auth method id。                                                                     |
| `choiceId`            | 是   | `string`                                                              | onboarding 和 CLI 流程使用的稳定 auth-choice id。                                               |
| `choiceLabel`         | 否   | `string`                                                              | 面向用户的标签。若省略，OpenClaw 会回退到 `choiceId`。                                          |
| `choiceHint`          | 否   | `string`                                                              | 供选择器使用的简短辅助文本。                                                                    |
| `assistantPriority`   | 否   | `number`                                                              | 在助手驱动的交互式选择器中，较小的值会排在更前面。                                              |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                                        | 在助手选择器中隐藏该选项，同时仍允许手动通过 CLI 选择。                                         |
| `deprecatedChoiceIds` | 否   | `string[]`                                                            | 应将用户重定向到此替代选项的旧 choice id。                                                      |
| `groupId`             | 否   | `string`                                                              | 用于将相关选择项分组的可选 group id。                                                           |
| `groupLabel`          | 否   | `string`                                                              | 该组面向用户的标签。                                                                            |
| `groupHint`           | 否   | `string`                                                              | 该组的简短辅助文本。                                                                            |
| `optionKey`           | 否   | `string`                                                              | 用于简单单标志 auth 流程的内部选项键。                                                          |
| `cliFlag`             | 否   | `string`                                                              | CLI 标志名，例如 `--openrouter-api-key`。                                                       |
| `cliOption`           | 否   | `string`                                                              | 完整的 CLI 选项形式，例如 `--openrouter-api-key <key>`。                                        |
| `cliDescription`      | 否   | `string`                                                              | 用于 CLI 帮助中的描述。                                                                         |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation" \| "music-generation">` | 该选择项应出现在哪些 onboarding 界面中。若省略，默认值为 `["text-inference"]`。 |

## 命令别名参考

当某个插件拥有一个运行时命令名，而用户可能会误把它填进 `plugins.allow`，
或者试图将其作为根 CLI 命令运行时，请使用 `commandAliases`。OpenClaw
会在不导入插件运行时代码的情况下使用这些元数据进行诊断。

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
| `name`       | 是   | `string`          | 属于此插件的命令名。                                             |
| `kind`       | 否   | `"runtime-slash"` | 将该别名标记为聊天 slash 命令，而不是根 CLI 命令。               |
| `cliCommand` | 否   | `string`          | 如有相关的根 CLI 命令，则建议在 CLI 操作中使用该命令。           |

## activation 参考

当插件能够以较低成本声明哪些控制平面事件应将其纳入 activation/load 计划时，请使用 `activation`。

此块是 planner 元数据，不是生命周期 API。它不会注册运行时行为，不会替代 `register(...)`，也不保证
插件代码已经执行。activation planner 会使用这些字段在回退到现有 manifest 所有权元数据之前先缩小候选插件范围，
这些元数据包括 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks。

优先使用已经描述所有权的最窄元数据。若 `providers`、`channels`、`commandAliases`、setup 描述符或 `contracts`
已经能表达关系，就使用这些字段。对于无法用这些所有权字段表示的额外 planner 提示，请使用 `activation`。
对于诸如 `claude-cli`、`my-cli` 或 `google-gemini-cli` 之类的 CLI 运行时别名，请使用顶层 `cliBackends`；`activation.onAgentHarnesses` 仅用于
那些尚未拥有所有权字段的嵌入式 agent harness id。

此块仅为元数据。它不会注册运行时行为，也不会替代 `register(...)`、`setupEntry` 或其他运行时/插件入口点。
当前消费者将其用作更宽泛插件加载之前的缩小范围提示，因此缺少非启动激活元数据通常只会影响性能；
在 manifest 所有权回退仍然存在时，这不应影响正确性。

每个插件都应有意设置 `activation.onStartup`。只有当插件必须在 Gateway 启动期间运行时，才将其设为 `true`。
当插件在启动时是惰性的，并且应仅从更窄的触发器加载时，将其设为 `false`。
不再会因为省略 `onStartup` 而隐式在启动时加载插件；请为启动、channel、config、agent-harness、memory 或其他更窄的激活触发器使用显式的
activation 元数据。

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
| `onProviders`      | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的 provider id。                                                                                                                      |
| `onAgentHarnesses` | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的嵌入式 agent harness runtime id。CLI backend 别名请使用顶层 `cliBackends`。                                           |
| `onCommands`       | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的命令 id。                                                                                                                       |
| `onChannels`       | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的 channel id。                                                                                                                       |
| `onRoutes`         | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的 route 类型。                                                                                                                       |
| `onConfigPaths`    | 否       | `string[]`                                           | 当路径存在且未被显式禁用时，在 startup/load 计划中应包含此插件的根相对配置路径。                                                      |
| `onCapabilities`   | 否       | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面激活规划使用的宽泛能力提示。尽可能优先使用更窄的字段。                                                                                     |

当前实时消费者：

- Gateway 启动规划会使用 `activation.onStartup` 进行显式启动
  导入
- 命令触发的 CLI 规划会回退到旧版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- agent-runtime 启动规划会对
  嵌入式 harness 使用 `activation.onAgentHarnesses`，对 CLI 运行时别名使用顶层 `cliBackends[]`
- channel 触发的 setup/channel 规划在缺少显式 channel 激活元数据时会回退到旧版
  `channels[]` 所有权
- 启动插件规划会使用 `activation.onConfigPaths` 处理非 channel 的根级
  配置表面，例如内置 browser 插件的 `browser` 块
- provider 触发的 setup/runtime 规划在缺少显式 provider
  激活元数据时会回退到旧版 `providers[]` 和顶层 `cliBackends[]` 所有权

planner 诊断可以区分显式 activation 提示与 manifest 所有权回退。
例如，`activation-command-hint` 表示匹配到了 `activation.onCommands`，
而 `manifest-command-alias` 表示 planner 改用了 `commandAliases` 所有权。
这些原因标签用于宿主诊断和测试；插件作者应继续声明最能描述所有权的元数据。

## qaRunners 参考

当某个插件在共享的 `openclaw qa` 根命令下提供一个或多个传输运行器时，使用 `qaRunners`。请保持此元数据轻量且静态；插件运行时仍通过一个轻量级的 `runtime-api.ts` 接口负责实际的 CLI 注册，该接口导出 `qaRunnerCliRegistrations`。

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

## setup 参考

当 setup 和 onboarding 界面在运行时加载之前需要轻量的、由插件拥有的元数据时，使用 `setup`。

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

顶层 `cliBackends` 仍然有效，并继续用于描述 CLI 推断后端。`setup.cliBackends` 是面向 setup 的专用描述字段，用于应保持仅为元数据的控制平面/setup 流程。

当存在时，`setup.providers` 和 `setup.cliBackends` 是 setup 发现中优先使用的、先描述符再查找的界面。如果描述符仅缩小了候选插件范围，而 setup 仍然需要更丰富的 setup 期运行时钩子，请设置 `requiresRuntime: true`，并保留 `setup-api` 作为回退执行路径。

OpenClaw 也会将 `setup.providers[].envVars` 纳入通用的 provider 认证与环境变量查找中。`providerAuthEnvVars` 在弃用期内仍通过兼容适配器受支持，但仍使用它的未打包插件会收到清单诊断。新插件应将 setup/status 的环境变量元数据放在 `setup.providers[].envVars` 上。

当没有 setup 条目可用时，或者当 `setup.requiresRuntime: false` 声明 setup 不需要运行时执行时，OpenClaw 也可以从 `setup.providers[].authMethods` 推导出简单的 setup 选项。对于自定义标签、CLI 标志、onboarding 范围和助手元数据，显式的 `providerAuthChoices` 条目仍然是首选。

仅当这些描述符足以满足 setup 界面时，才将 `requiresRuntime: false` 设为 false。OpenClaw 会将显式的 `false` 视为仅描述符契约，并且不会为了 setup 查找而执行 `setup-api` 或 `openclaw.setupEntry`。如果一个仅描述符插件仍然提供了其中任一 setup 运行时条目，OpenClaw 会报告一个附加诊断并继续忽略它。省略 `requiresRuntime` 会保留旧版回退行为，因此没有添加该标志的现有插件不会被破坏。

由于 setup 查找可能会执行插件拥有的 `setup-api` 代码，规范化后的 `setup.providers[].id` 和 `setup.cliBackends[]` 值在所有已发现插件之间必须保持唯一。若所有权有歧义，则会直接失败，而不是根据发现顺序选出一个胜者。

当 setup 运行时确实执行时，如果 `setup-api` 注册了清单描述符未声明的 provider 或 CLI backend，或者某个描述符没有匹配的运行时注册，setup 注册表诊断会报告 descriptor drift。这些诊断是附加性的，不会拒绝旧版插件。

### setup.providers 参考

| 字段              | 必需 | 类型       | 含义                                                                                    |
| -------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `id`           | 是       | `string`   | 在 setup 或 onboarding 期间暴露的 provider id。请保持规范化 id 全局唯一。                         |
| `authMethods`  | 否       | `string[]` | 在无需加载完整运行时的情况下，该 provider 支持的 setup/auth 方法 id。                            |
| `envVars`      | 否       | `string[]` | 在插件运行时加载前，通用 setup/status 界面可以检查的环境变量。                                   |
| `authEvidence` | 否       | `object[]` | 适用于能通过非机密标记进行认证的 provider 的廉价本地认证证据检查。                              |

`authEvidence` 用于可通过本地凭据标记验证的、由 provider 拥有的本地凭据标记。
这些检查必须保持廉价且本地化：不能进行网络调用、不能读取 keychain 或 secret-manager、不能执行 shell 命令，也不能探测 provider API。

支持的证据条目：

| 字段              | 必需 | 类型              | 含义                                                                                                  |
| ------ | ------ | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `type`             | 是     | `string`          | 当前为 `local-file-with-env`。                                                                                 |
| `fileEnvVar`       | 否     | `string`          | 包含显式凭据文件路径的环境变量。                                                                               |
| `fallbackPaths`    | 否     | `string[]`        | 当 `fileEnvVar` 缺失或为空时检查的本地凭据文件路径。支持 `${HOME}` 和 `${APPDATA}`。                            |
| `requiresAnyEnv`   | 否     | `string[]`        | 在该证据有效之前，所列环境变量中至少一个必须非空。                                                             |
| `requiresAllEnv`   | 否     | `string[]`        | 在该证据有效之前，所列环境变量都必须非空。                                                                     |
| `credentialMarker` | 是     | `string`          | 证据存在时返回的非机密标记。                                                                                   |
| `source`           | 否     | `string`          | 用于 auth/status 输出的面向用户的来源标签。                                                                    |

### setup 字段

| 字段              | 必需 | 类型       | 含义                                                                                       |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------------------------------ |
| `providers`        | 否   | `object[]` | 在 setup 和 onboarding 期间暴露的 provider setup 描述符。                                   |
| `cliBackends`      | 否   | `string[]` | 用于基于描述符优先查找 setup 的 setup 期 backend id。请保持规范化 id 全局唯一。             |
| `configMigrations` | 否   | `string[]` | 该插件的 setup 界面所拥有的配置迁移 id。                                                   |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找之后，setup 是否仍需要执行 `setup-api`。                                        |

## uiHints 参考

`uiHints` 是一个从配置字段名到小型渲染提示的映射。

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

| 字段         | 类型       | 含义                              |
| ------------- | ---------- | --------------------------------- |
| `label`       | `string`   | 面向用户的字段标签。               |
| `help`        | `string`   | 简短帮助文本。                     |
| `tags`        | `string[]` | 可选的 UI 标签。                   |
| `advanced`    | `boolean`  | 将该字段标记为高级。               |
| `sensitive`   | `boolean`  | 将该字段标记为机密或敏感。         |
| `placeholder` | `string`   | 表单输入的占位文本。               |

## contracts 参考

仅在 OpenClaw 无需导入插件运行时即可读取的静态能力归属元数据中使用 `contracts`。

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["pi", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "embeddingProviders": ["openai-compatible"],
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
    "gatewayMethodDispatch": ["authenticated-request"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的：

| 字段                            | 类型       | 含义                                                                                       |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `embeddedExtensionFactories`     | `string[]` | Codex 应用服务器扩展工厂 id，目前为 `codex-app-server`。                                   |
| `agentToolResultMiddleware`      | `string[]` | 打包插件可为其注册工具结果中间件的运行时 id。                                               |
| `externalAuthProviders`          | `string[]` | 该插件拥有其外部认证 profile hook 的 provider id。                                         |
| `embeddingProviders`             | `string[]` | 该插件拥有的通用 embedding provider id，用于 memory 之外的可复用向量嵌入。                 |
| `speechProviders`                | `string[]` | 该插件拥有的语音 provider id。                                                             |
| `realtimeTranscriptionProviders` | `string[]` | 该插件拥有的实时转写 provider id。                                                         |
| `realtimeVoiceProviders`         | `string[]` | 该插件拥有的实时语音 provider id。                                                         |
| `memoryEmbeddingProviders`       | `string[]` | 该插件拥有的 memory embedding provider id。                                                |
| `mediaUnderstandingProviders`    | `string[]` | 该插件拥有的媒体理解 provider id。                                                         |
| `meetingNotesSourceProviders`    | `string[]` | 该插件拥有的会议笔记来源 provider id。                                                     |
| `imageGenerationProviders`       | `string[]` | 该插件拥有的图像生成 provider id。                                                         |
| `videoGenerationProviders`       | `string[]` | 该插件拥有的视频生成 provider id。                                                         |
| `webFetchProviders`              | `string[]` | 该插件拥有的网页抓取 provider id。                                                         |
| `webSearchProviders`             | `string[]` | 该插件拥有的网页搜索 provider id。                                                         |
| `migrationProviders`             | `string[]` | 该插件为 `openclaw migrate` 拥有的导入 provider id。                                       |
| `gatewayMethodDispatch`          | `string[]` | 保留给在进程内分发 Gateway 方法的已认证插件 HTTP 路由的授权项。                             |
| `tools`                          | `string[]` | 该插件拥有的 agent tool 名称。                                                              |

`contracts.embeddedExtensionFactories` 保留给仅用于打包的 Codex 应用服务器扩展工厂。打包的工具结果转换应声明 `contracts.agentToolResultMiddleware`，并改为通过 `api.registerAgentToolResultMiddleware(...)` 注册。外部插件不能注册工具结果中间件，因为该接缝可以在模型看到之前重写高信任度的工具输出。

运行时 `api.registerTool(...)` 的注册必须与 `contracts.tools` 匹配。工具发现会使用此列表，只加载能够拥有所请求工具的插件运行时。

实现 `resolveExternalAuthProfiles` 的 provider 插件应声明 `contracts.externalAuthProviders`。未声明的插件仍会通过已弃用的兼容性回退路径运行，但该回退更慢，并将在迁移窗口结束后移除。

打包的记忆嵌入 provider 应为其暴露的每个适配器 id 声明 `contracts.memoryEmbeddingProviders`，包括诸如 `local` 之类的内置适配器。独立 CLI 路径会使用此清单契约，在完整 Gateway 运行时注册 provider 之前，仅加载对应拥有者插件。

通用 embedding provider 应为通过 `api.registerEmbeddingProvider(...)` 注册的每个适配器声明 `contracts.embeddingProviders`。当向量需要被多个功能、工具或插件消费时，请使用通用契约。将 `contracts.memoryEmbeddingProviders` 保留给那些形状和生命周期都特定于 OpenClaw memory 索引的适配器。

`contracts.gatewayMethodDispatch` 当前接受
`"authenticated-request"`。它是针对原生插件 HTTP 路由的 API 卫生门禁，这些路由会有意在进程内分发 Gateway 控制平面方法，而不是用来防御恶意原生插件的沙箱。仅将其用于经过严格审查、且本身已要求 Gateway HTTP 认证的打包/运营者界面。

## mediaUnderstandingProviderMetadata 参考

当某个媒体理解 provider 具有默认模型、自动认证回退优先级，或通用核心辅助程序在运行时加载前需要的原生文档支持时，使用 `mediaUnderstandingProviderMetadata`。键也必须在 `contracts.mediaUnderstandingProviders` 中声明。

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

每个 provider 条目可以包含：

| 字段                  | 类型                                | 含义                                                                 |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | 该 provider 暴露的媒体能力。                                         |
| `defaultModels`        | `Record<string, string>`            | 当配置未指定模型时使用的能力到模型默认映射。                          |
| `autoPriority`         | `Record<string, number>`            | 用于自动基于凭据的 provider 回退时，数值越小排序越靠前。             |
| `nativeDocumentInputs` | `"pdf"[]`                           | 该 provider 支持的原生文档输入。                                     |

## channelConfigs 参考

当某个 channel 插件在其运行时代码加载之前需要轻量级的配置元数据时，请使用 `channelConfigs`。如果没有可用的 setup 条目，或者 `setup.requiresRuntime: false` 声明 setup 不需要运行时，那么只读的 channel 设置/状态发现可以直接使用这些元数据来处理已配置的外部 channel。

`channelConfigs` 是插件 manifest 元数据，不是新的顶层用户配置节。用户仍然在 `channels.<channel-id>` 下配置 channel 实例。OpenClaw 会在插件运行时代码执行之前读取 manifest 元数据，以决定哪个插件拥有该已配置的 channel。

对于 channel 插件，`configSchema` 和 `channelConfigs` 描述的是不同的路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

声明了 `channels[]` 的非打包插件也应声明匹配的 `channelConfigs` 条目。没有这些条目时，OpenClaw 仍然可以加载插件，但在插件运行时代码执行之前，冷路径配置 schema、setup 和 Control UI 界面将无法知道该 channel 所拥有的选项结构。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和
`nativeSkillsAutoEnabled` 可以为在 channel 运行时加载之前执行的命令配置检查声明静态的 `auto` 默认值。打包的 channels 也可以通过 `package.json#openclaw.channel.commands` 与它们其他归属包的 channel catalog 元数据一起发布相同的默认值。

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

| 字段          | 类型                      | 含义                                                                                     |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每个已声明的 channel config 条目都必须提供。              |
| `uiHints`     | `Record<string, object>` | 适用于该 channel config 区域的可选 UI 标签/占位符/敏感性提示。                            |
| `label`       | `string`                 | 当运行时元数据尚未就绪时，会合并到选择器和 inspect 界面的 channel 标签。                  |
| `description` | `string`                 | 用于 inspect 和 catalog 界面的简短 channel 描述。                                         |
| `commands`    | `object`                 | 用于运行前配置检查的静态 native command 和 native skill 自动默认值。                      |
| `preferOver`  | `string[]`               | 该 channel 在选择界面中应优先于哪些旧插件或较低优先级的插件 id。                          |

### 替换另一个 channel 插件

当你的插件是某个 channel id 的首选拥有者，而另一个插件也可以提供该 channel 时，请使用 `preferOver`。常见情况包括：插件 id 重命名、某个独立插件取代了一个打包插件，或者某个维护中的 fork 为了配置兼容性保留了相同的 channel id。

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

当配置了 `channels.chat` 时，OpenClaw 会同时考虑 channel id 和首选的插件 id。如果较低优先级的插件只是因为它是打包的或默认启用的而被选中，OpenClaw 会在有效运行时配置中禁用它，从而让一个插件独占该 channel 及其工具。显式的用户选择仍然优先：如果用户显式启用了两个插件，OpenClaw 会保留该选择，并报告重复的 channel/tool 诊断，而不是静默地更改请求的插件集合。

请将 `preferOver` 的作用域限制在确实能够提供相同 channel 的插件 id 上。它不是通用的优先级字段，也不会重命名用户配置键。

## modelSupport 参考

当 OpenClaw 需要在插件运行时加载之前，根据 `gpt-5.5` 或 `claude-sonnet-4.6` 这样的简写 model id 推断你的 provider 插件时，请使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 按以下优先级应用：

- 显式的 `provider/model` 引用使用其所属的 `providers` manifest 元数据
- `modelPatterns` 优先于 `modelPrefixes`
- 如果一个非打包插件和一个打包插件都匹配，则非打包插件胜出
- 剩余的歧义会被忽略，直到用户或配置指定 provider

字段：

| 字段            | 类型       | 含义                                                              |
| --------------- | ---------- | ----------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 与简写 model id 进行 `startsWith` 匹配的前缀。                    |
| `modelPatterns` | `string[]` | 在移除 profile 后缀后，与简写 model id 匹配的正则表达式源码。      |

`modelPatterns` 条目通过 `compileSafeRegex` 编译，该函数会拒绝包含嵌套重复的模式（例如 `(a+)+$`）。未通过安全检查的模式会被静默跳过，和语法无效的 regex 一样。请保持模式简单，避免嵌套量词。

## modelCatalog 参考

当 OpenClaw 需要在加载插件运行时之前了解 provider model 元数据时，请使用 `modelCatalog`。这是静态 catalog 行、provider 别名、抑制规则以及发现模式的 manifest 归属来源。运行时刷新仍然属于 provider 运行时代码，但 manifest 会告诉 core 何时需要运行时。

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

| Field            | Type                                                     | What it means                                                                                               |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | 该插件拥有的 provider id 的 catalog 行。键也应出现在顶层 `providers` 中。                                  |
| `aliases`        | `Record<string, object>`                                 | 应解析为所拥有 provider 的别名，用于 catalog 或抑制规划。                                                   |
| `suppressions`   | `object[]`                                               | 来自其他来源的 model 行，该插件因 provider 特定原因对其进行抑制。                                          |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | provider catalog 是否可以从 manifest 元数据读取、刷新到缓存中，或者是否需要运行时。                        |
| `runtimeAugment` | `boolean`                                                | 仅当 provider 运行时必须在 manifest/config 规划之后追加 catalog 行时设为 `true`。                           |

`aliases` 参与 model-catalog 规划中的 provider 所有权查找。别名目标必须是同一插件拥有的顶层 providers。 当 provider 过滤列表使用别名时，OpenClaw 可以读取拥有者 manifest，并在不加载 provider 运行时的情况下应用别名 API/base URL 覆盖。别名不会扩展未过滤的 catalog 列表；宽泛列表只会输出拥有者的规范 provider 行。

`suppressions` 取代了旧的 provider 运行时 `suppressBuiltInModel` 钩子。只有当 provider 由该插件拥有，或者声明为指向已拥有 provider 的 `modelCatalog.aliases` 键时，suppression 条目才会被遵守。模型解析期间不再调用运行时 suppression 钩子。

Provider 字段：

| 字段      | 类型                     | 含义                                                     |
| --------- | ------------------------ | -------------------------------------------------------- |
| `baseUrl` | `string`                 | 该 provider catalog 中模型的可选默认 base URL。          |
| `api`     | `ModelApi`               | 该 provider catalog 中模型的可选默认 API 适配器。        |
| `headers` | `Record<string, string>` | 适用于该 provider catalog 的可选静态 headers。           |
| `models`  | `object[]`               | 必填的 model 行。没有 `id` 的行会被忽略。                |

Model 字段：

| 字段           | 类型                                                           | 含义                                                               |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `id`            | `string`                                                       | provider 本地的 model id，不含 `provider/` 前缀。                  |
| `name`          | `string`                                                       | 可选显示名称。                                                     |
| `api`           | `ModelApi`                                                     | 可选的逐模型 API 覆盖。                                            |
| `baseUrl`       | `string`                                                       | 可选的逐模型 base URL 覆盖。                                       |
| `headers`       | `Record<string, string>`                                       | 可选的逐模型静态 headers。                                         |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 该模型接受的模态。                                                 |
| `reasoning`     | `boolean`                                                      | 该模型是否暴露 reasoning 行为。                                    |
| `contextWindow` | `number`                                                       | provider 原生上下文窗口。                                          |
| `contextTokens` | `number`                                                       | 当与 `contextWindow` 不同时，可选的有效运行时上下文上限。          |
| `maxTokens`     | `number`                                                       | 已知情况下的最大输出 token 数。                                    |
| `cost`          | `object`                                                       | 可选的每百万 token 美元定价，包含可选的 `tieredPricing`。          |
| `compat`        | `object`                                                       | 与 OpenClaw model config 兼容性匹配的可选兼容标志。                |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列表状态。仅当该行根本不应出现时才应抑制。                         |
| `statusReason`  | `string`                                                       | 在非可用状态下显示的可选原因。                                     |
| `replaces`      | `string[]`                                                     | 该模型所取代的旧 provider 本地 model id。                          |
| `replacedBy`    | `string`                                                       | 已弃用行的替代 provider 本地 model id。                            |
| `tags`          | `string[]`                                                     | 供选择器和筛选器使用的稳定标签。                                   |

抑制字段：

| 字段                      | 类型       | 含义                                                                                             |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `provider`                | `string`   | 要抑制的上游行的 provider id。必须由该插件拥有，或声明为指向已拥有别名。                          |
| `model`                   | `string`   | 要抑制的 provider 本地 model id。                                                                 |
| `reason`                  | `string`   | 当直接请求被抑制的行时显示的可选消息。                                                             |
| `when.baseUrlHosts`       | `string[]` | 应用该 suppression 之前所需的有效 provider base URL host 列表（可选）。                            |
| `when.providerConfigApiIn` | `string[]` | 应用该 suppression 之前所需的精确 provider-config `api` 值列表（可选）。                         |

不要将仅在运行时可用的数据放入 `modelCatalog`。仅当 manifest 行已经足够完整，使 provider 过滤列表和选择器界面可以跳过 registry/runtime 发现时，才使用 `static`。当 manifest 行只是有用的种子或补充，但后续刷新/缓存可以增加更多行时，使用 `refreshable`；`refreshable` 行本身并不具有权威性。当 OpenClaw 必须加载 provider 运行时才能知道列表时，使用 `runtime`。

## modelIdNormalization 参考

将 `modelIdNormalization` 用于廉价的、由提供方拥有的 model-id 清理，这必须在提供方运行时加载之前完成。这样可以把短模型名、提供方本地的旧 id，以及代理前缀规则保留在所属插件清单中，而不是放在核心模型选择表里。

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
| `aliases`                            | `Record<string,string>` | 忽略大小写的精确 model-id 别名。返回值保持原样。                                            |
| `stripPrefixes`                      | `string[]`              | 在别名查找前要移除的前缀，适用于旧版提供方/model 重复。                                     |
| `prefixWhenBare`                     | `string`                | 当归一化后的 model id 不包含 `/` 时要添加的前缀。                                           |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 别名查找后的条件性裸 id 前缀规则，以 `modelPrefix` 和 `prefix` 为键。                       |

## providerEndpoints 参考

将 `providerEndpoints` 用于端点分类，这种分类必须在提供方运行时加载之前被通用请求策略知晓。核心仍然负责每个 `endpointClass` 的含义；插件清单负责主机和 base URL 元数据。

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

将 `providerRequest` 用于廉价的请求兼容性元数据，通用请求策略需要它而无需加载提供方运行时。将行为相关的负载重写保留在提供方运行时钩子或共享的提供方家族辅助工具中。

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

提供方字段：

| 字段                 | 类型         | 含义                                                                                 |
| --------------------- | ------------ | ------------------------------------------------------------------------------------ |
| `family`              | `string`     | 通用请求兼容性决策和诊断中使用的提供方家族标签。                                     |
| `compatibilityFamily` | `"moonshot"` | 用于共享请求辅助工具的可选提供方家族兼容性分组。                                     |
| `openAICompletions`   | `object`     | OpenAI 兼容的 completions 请求标志，目前是 `supportsStreamingUsage`。                |

## modelPricing 参考

当某个提供方在运行时加载之前需要控制面定价行为时，请使用 `modelPricing`。Gateway 定价缓存会在不导入提供方运行时代码的情况下读取这些元数据。

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

| 字段         | 类型              | 含义                                                                                         |
| ------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | 对本地/自托管提供方设为 `false`，它们不应获取 OpenRouter 或 LiteLLM 定价。                    |
| `openRouter` | `false \| object` | OpenRouter 定价查找映射。`false` 会为该提供方禁用 OpenRouter 查找。                           |
| `liteLLM`    | `false \| object` | LiteLLM 定价查找映射。`false` 会为该提供方禁用 LiteLLM 查找。                                 |

来源字段：

| 字段                      | 类型               | 含义                                                                                                                |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 当外部目录提供方 id 与 OpenClaw 提供方 id 不同时使用，例如 `zai` 提供方对应 `z-ai`。                               |
| `passthroughProviderModel` | `boolean`          | 将包含斜杠的 model id 视为嵌套的 provider/model 引用，对 OpenRouter 等代理提供方很有用。                             |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录 model-id 变体。`version-dots` 会尝试带点的版本 id，例如 `claude-opus-4.6`。                         |

### OpenClaw 提供方索引

OpenClaw 提供方索引是由 OpenClaw 拥有的、面向尚未安装其插件的提供方的预览元数据。它不是插件清单的一部分。插件清单仍然是已安装插件的权威来源。Provider Index 是内部回退契约，未来的可安装提供方和预安装模型选择器界面会在提供方插件未安装时使用它。

目录权威顺序：

1. 用户配置。
2. 已安装插件清单 `modelCatalog`。
3. 来自显式刷新的模型目录缓存。
4. OpenClaw Provider Index 预览行。

Provider Index 不得包含密钥、启用状态、运行时钩子或实时的、按账户区分的模型数据。它的预览目录使用与插件清单相同的 `modelCatalog` provider row 形状，但应限制在稳定的显示元数据，除非诸如 `api`、`baseUrl`、定价或兼容性标志等运行时适配器字段被有意保持与已安装插件清单一致。具有实时 `/models` 发现能力的提供方应通过显式模型目录缓存路径写入刷新的行，而不是在普通列表或入门流程中调用提供方 API。

Provider Index 条目也可以携带可安装插件元数据，适用于那些插件已经从 core 移出或尚未安装的提供方。该元数据镜像 channel catalog 模式：包名、npm 安装规格、预期完整性以及廉价的认证选择标签，就足以展示一个可安装的设置选项。一旦插件安装完成，其清单将获胜，Provider Index 中对应的条目会被忽略。

旧的顶层能力键已弃用。请使用 `openclaw doctor --fix` 将 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移到 `contracts` 下；正常的清单加载不再将这些顶层字段视为能力归属。

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

一些运行前插件元数据会有意放在 `package.json` 的 `openclaw` 块下，而不是放在 `openclaw.plugin.json` 中。`openclaw.bundle` 和 `openclaw.bundle.json` 不是 OpenClaw 插件契约；原生插件必须使用 `openclaw.plugin.json`，以及下面支持的 `package.json#openclaw` 字段。

重要示例：

| 字段                                                                                      | 含义                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 声明原生插件入口点。必须保留在插件包目录内。                                                                                                   |
| `openclaw.runtimeExtensions`                                                               | 声明为已安装包构建的 JavaScript 运行时入口点。必须保留在插件包目录内。                                                                 |
| `openclaw.setupEntry`                                                                      | 仅用于设置的轻量入口点，在 onboarding、延迟的 channel 启动，以及只读的 channel 状态/SecretRef 发现期间使用。必须保留在插件包目录内。 |
| `openclaw.runtimeSetupEntry`                                                               | 声明为已安装包构建的 JavaScript 设置入口点。需要 `setupEntry`，必须存在，并且必须保留在插件包目录内。                         |
| `openclaw.channel`                                                                         | 便宜的 channel 目录元数据，如标签、文档路径、别名和选择文案。                                                                                                 |
| `openclaw.channel.commands`                                                                | 在 channel 运行时加载之前，供配置、审计和命令列表界面使用的静态原生命令和原生技能自动默认元数据。                                          |
| `openclaw.channel.configuredState`                                                         | 轻量级的已配置状态检查器元数据，可在不加载完整 channel 运行时的情况下回答“是否已经存在仅环境变量设置？”。                                         |
| `openclaw.channel.persistedAuthState`                                                      | 轻量级的持久化认证检查器元数据，可在不加载完整 channel 运行时的情况下回答“是否已经有任何登录状态？”。                                               |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 用于捆绑和外部发布插件的安装/更新提示。                                                                                                                   |
| `openclaw.install.defaultChoice`                                                           | 当有多个安装来源可用时的首选安装路径。                                                                                                                  |
| `openclaw.install.minHostVersion`                                                          | 使用类似 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 的 semver 下限指定的最小受支持 OpenClaw 主机版本。                                                                             |
| `openclaw.install.expectedIntegrity`                                                       | 预期的 npm dist 完整性字符串，例如 `sha512-...`；安装和更新流程会将获取到的工件与其进行校验。                                                            |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 当配置无效时，允许一条有限的捆绑插件重装恢复路径。                                                                                                       |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | 允许在启动期间，先加载仅设置的 channel 界面，再加载完整的 channel 插件。                                                                                                 |

清单元数据决定在运行时加载前哪些 provider/channel/setup 选项会出现在 onboarding 中。`package.json#openclaw.install` 告诉 onboarding 在用户选择这些选项之一时如何获取或启用该插件。不要把安装提示移到 `openclaw.plugin.json` 中。

`openclaw.install.minHostVersion` 在非 bundled 插件来源的安装和清单注册表加载期间强制执行。无效值会被拒绝；较新但有效的值会在旧主机上跳过外部插件。bundled source 插件被假定与主机 checkout 同版本。

官方按需安装元数据在插件发布到 ClawHub 时应使用 `clawhubSpec`；onboarding 会将其视为首选远程来源，并在安装后记录 ClawHub 工件事实。`npmSpec` 仍然是尚未迁移到 ClawHub 的包的兼容性回退。

精确的 npm 版本锁定已经存在于 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录条目应将精确规格与 `expectedIntegrity` 配对，这样如果获取到的 npm 工件不再匹配锁定的发布版本，更新流程就会关闭失败。为了兼容性，交互式 onboarding 仍然提供受信任注册表的 npm 规格，包括裸包名和 dist-tag。目录诊断可以区分精确、浮动、带完整性固定、缺失完整性、包名不匹配以及无效默认选择来源。它们还会在存在 `expectedIntegrity` 但没有可用来固定它的有效 npm 来源时发出警告。当存在 `expectedIntegrity` 时，安装/更新流程会强制执行它；当它省略时，注册表解析会被记录下来，但不会附加完整性固定。

当 status、channel 列表或 SecretRef 扫描需要在加载完整运行时之前识别已配置账户时，channel 插件应提供 `openclaw.setupEntry`。设置入口应暴露 channel 元数据以及设置安全的 config、status 和 secrets 适配器；把网络客户端、gateway 监听器和传输运行时保留在主扩展入口点中。

运行时入口点字段不会覆盖源入口点字段的包边界检查。例如，`openclaw.runtimeExtensions` 不能让一个越界的 `openclaw.extensions` 路径变得可加载。

`openclaw.install.allowInvalidConfigRecovery` 的范围被刻意限制。它不会让任意损坏的配置都能安装。当前它只允许安装流程从特定的过期内置插件升级失败中恢复，例如缺失的内置插件路径，或同一内置插件的过期 `channels.<id>` 条目。无关的配置错误仍然会阻止安装，并引导操作员使用 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一个微型检查器模块的包元数据：

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

当设置、doctor、status 或只读存在性流程在完整 channel 插件加载前需要一个廉价的认证是/否探测时使用它。持久化认证状态不是已配置的 channel 状态：不要使用这些元数据来自动启用插件、修复运行时依赖，或决定是否应该加载某个 channel 运行时。目标导出应当是一个只读取持久化状态的小函数；不要通过完整的 channel 运行时 barrel 去路由它。

`openclaw.channel.configuredState` 采用相同的结构，用于廉价的仅环境变量已配置检查：

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

当某个 channel 能从环境变量或其他很小的非运行时输入中回答已配置状态时使用它。如果检查需要完整的配置解析或真实的 channel 运行时，请把该逻辑保留在插件的 `config.hasConfiguredState` 钩子中。

## 发现优先级（重复的插件 id）

OpenClaw 从多个根目录发现插件。对于原始文件系统扫描顺序，请参见 [Plugin scan
order](/gateway/configuration-reference#plugin-scan-order)。如果两次发现
共享相同的 `id`，则只保留**优先级最高**的 manifest；
较低优先级的重复项会被丢弃，而不是与其并列加载。

优先级从高到低：

1. **配置选择** — 在 `plugins.entries.<id>` 中显式固定的路径
2. **捆绑** — 随 OpenClaw 一起发布的插件
3. **全局安装** — 安装到全局 OpenClaw 插件根目录中的插件
4. **工作区** — 相对于当前工作区发现的插件

影响：

- 工作区中存在的捆绑插件的分叉副本或过时副本不会覆盖捆绑构建。
- 要真正用本地插件覆盖捆绑插件，请通过 `plugins.entries.<id>` 将其固定，这样它会通过优先级获胜，而不是依赖工作区发现。
- 重复项被丢弃时会记录日志，因此 Doctor 和启动诊断可以指向被丢弃的副本。
- 配置选择的重复覆盖在诊断中会表述为显式覆盖，但仍会发出警告，以便过时分叉和意外覆盖保持可见。

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

- 未知的 `channels.*` 键都是**错误**，除非该 channel id 已由
  插件 manifest 声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现的**插件 id。未知 id 是**错误**。
- 如果某个插件已安装，但其 manifest 或 schema 损坏或缺失，
  校验会失败，Doctor 会报告该插件错误。
- 如果插件配置存在但插件已被**禁用**，配置会被保留，并且
  Doctor + 日志会显示一个**警告**。

完整的 `plugins.*` schema 请参见[配置参考](/gateway/configuration)。

## 注意事项

- 清单是 **原生 OpenClaw 插件所必需的**，包括本地文件系统加载。运行时仍会单独加载插件模块；清单仅用于发现和校验。
- 原生清单使用 JSON5 解析，因此只要最终值仍然是对象，就可以接受注释、尾随逗号和未加引号的键。
- 清单加载器只读取文档中说明的清单字段。避免使用自定义顶层键。
- 当插件不需要 `channels`、`providers`、`cliBackends` 和 `skills` 时，都可以省略。
- `providerCatalogEntry` 必须保持轻量，不应导入宽泛的运行时代码；请将其用于静态的提供者目录元数据或狭义的发现描述符，而不是用于请求时执行。`providerDiscoveryEntry` 是旧写法，对现有插件仍然有效。
- 独占插件类型通过 `plugins.slots.*` 选择：`kind: "memory"` 通过 `plugins.slots.memory`，`kind: "context-engine"` 通过 `plugins.slots.contextEngine`（默认 `legacy`）。
- 请在此清单中声明独占插件类型。运行时入口 `OpenClawPluginDefinition.kind` 已弃用，仅作为旧插件的兼容回退。
- 环境变量元数据（`setup.providers[].envVars`、已弃用的 `providerAuthEnvVars` 和 `channelEnvVars`）仅具声明性。状态、审计、cron 投递校验以及其他只读界面在将环境变量视为已配置之前，仍会应用插件信任和有效激活策略。
- 有关需要提供者代码的运行时向导元数据，请参见 [Provider runtime hooks](/plugins/architecture-internals#provider-runtime-hooks)。
- 如果你的插件依赖原生模块，请记录构建步骤以及任何包管理器白名单要求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

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
