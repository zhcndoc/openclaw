---
summary: "插件清单 + JSON schema 要求（严格配置校验）"
read_when:
  - 你正在构建一个 OpenClaw 插件
  - 你需要发布插件配置 schema 或调试插件校验错误
title: "插件清单"
---

本页介绍 **OpenClaw 原生插件清单** `openclaw.plugin.json`。关于兼容的 bundle 布局（Codex、Claude、Cursor），请参见 [插件 bundle](/plugins/bundles)。

兼容的 bundle 格式使用各自的清单文件：

- Codex bundle：`.codex-plugin/plugin.json`
- Claude bundle：`.claude-plugin/plugin.json`，或者不使用清单的默认 Claude 组件布局
- Cursor bundle：`.cursor-plugin/plugin.json`

OpenClaw 会自动检测这些布局，但不会将它们按下面的 `openclaw.plugin.json` schema 进行校验。对于兼容的 bundle，当布局符合 OpenClaw 的运行时预期时，OpenClaw 会读取 bundle 元数据、声明的 skill 根目录、Claude 命令根目录、Claude `settings.json` 默认值、Claude LSP 默认值以及受支持的 hook pack。

每个原生 OpenClaw 插件**必须**在**插件根目录**中提供 `openclaw.plugin.json`。OpenClaw 会读取它来验证配置，**不会执行插件代码**。缺失或无效的清单会阻止配置校验，并被视为插件错误。

有关完整的插件系统指南，请参见 [Plugins](/tools/plugin)；有关原生能力模型和当前外部兼容性说明，请参见 [Capability model](/plugins/architecture#public-capability-model)。

## What this file does

`openclaw.plugin.json` is the metadata OpenClaw reads **before loading your plugin code**. Everything in it must be lightweight enough to be inspected without starting the plugin runtime.

**Used for:**

- plugin identity, config validation, and config UI hints
- auth, onboarding, and setup metadata (alias, auto-enable, provider env vars, auth choices)
- activation hints for control-plane surfaces
- shorthand model-family ownership
- static capability-ownership snapshots (`contracts`)
- dashboard widget data bindings and action verbs
- static MCP servers that should exist while the plugin is enabled
- QA runner metadata the shared `openclaw qa` host can inspect
- channel-specific config metadata merged into catalog and validation surfaces

**Do not use it for:** registering native runtime hooks, declaring plugin code entrypoints, or npm install metadata. Those belong in your plugin code and `package.json`.

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

| Field                                | Required | Type                         | What it means                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | Yes      | `string`                     | Canonical plugin id. This is the id used in `plugins.entries.<id>`.                                                                                                                                                                                                                            |
| `configSchema`                       | Yes      | `object`                     | Inline JSON Schema for this plugin's config.                                                                                                                                                                                                                                                   |
| `requiresPlugins`                    | No       | `string[]`                   | Plugin ids that must also be installed for this plugin to have an effect. Discovery keeps the plugin loadable but warns when any required plugin is missing.                                                                                                                                   |
| `enabledByDefault`                   | No       | `true`                       | Marks a bundled plugin as enabled by default. Omit it, or set any non-`true` value, to leave the plugin disabled by default.                                                                                                                                                                   |
| `enabledByDefaultOnPlatforms`        | No       | `string[]`                   | Marks a bundled plugin as enabled by default only on the listed Node.js platforms, for example `["darwin"]`. Explicit config still wins.                                                                                                                                                       |
| `legacyPluginIds`                    | No       | `string[]`                   | Legacy ids that normalize to this canonical plugin id.                                                                                                                                                                                                                                         |
| `autoEnableWhenConfiguredProviders`  | No       | `string[]`                   | Provider ids that should auto-enable this plugin when auth, config, or model refs mention them.                                                                                                                                                                                                |
| `kind`                               | No       | `PluginKind \| PluginKind[]` | Declares one or more exclusive plugin kinds (`"memory"`, `"context-engine"`) used by `plugins.slots.*`. A plugin that owns both slots declares both kinds in one array.                                                                                                                        |
| `channels`                           | No       | `string[]`                   | Channel ids owned by this plugin. Used for discovery and config validation.                                                                                                                                                                                                                    |
| `providers`                          | No       | `string[]`                   | Provider ids owned by this plugin.                                                                                                                                                                                                                                                             |
| `providerCatalogEntry`               | No       | `string`                     | Lightweight provider-catalog module path, relative to the plugin root, for manifest-scoped provider catalog metadata that can be loaded without activating the full plugin runtime.                                                                                                            |
| `modelSupport`                       | No       | `object`                     | Manifest-owned shorthand model-family metadata used to auto-load the plugin before runtime.                                                                                                                                                                                                    |
| `modelCatalog`                       | No       | `object`                     | Declarative model catalog metadata for providers owned by this plugin. This is the control-plane contract for future read-only listing, onboarding, model pickers, aliases, and suppression without loading plugin runtime.                                                                    |
| `modelPricing`                       | No       | `object`                     | Provider-owned hosted-pricing publication policy. Use it to opt local/self-hosted providers out of published pricing or map provider refs to OpenRouter/LiteLLM catalog ids without hardcoding provider ids in core.                                                                           |
| `modelIdNormalization`               | No       | `object`                     | Provider-owned model-id alias/prefix cleanup that must run before provider runtime loads.                                                                                                                                                                                                      |
| `providerEndpoints`                  | No       | `object[]`                   | Manifest-owned endpoint host/baseUrl metadata for provider routes that core must classify before provider runtime loads.                                                                                                                                                                       |
| `providerRequest`                    | No       | `object`                     | Cheap provider-family and request-compatibility metadata used by generic request policy before provider runtime loads.                                                                                                                                                                         |
| `secretProviderIntegrations`         | No       | `Record<string, object>`     | Declarative SecretRef exec provider presets that setup or install surfaces can offer without hardcoding provider-specific integrations in core.                                                                                                                                                |
| `cliBackends`                        | No       | `string[]`                   | CLI inference backend ids owned by this plugin. Used for startup auto-activation from explicit config refs.                                                                                                                                                                                    |
| `syntheticAuthRefs`                  | No       | `string[]`                   | Provider or CLI backend refs whose plugin-owned synthetic auth hook should be probed during cold model discovery before runtime loads.                                                                                                                                                         |
| `nonSecretAuthMarkers`               | No       | `string[]`                   | Bundled-plugin-owned placeholder API key values that represent non-secret local, OAuth, or ambient credential state.                                                                                                                                                                           |
| `commandAliases`                     | No       | `object[]`                   | Command names owned by this plugin that should produce plugin-aware config and CLI diagnostics before runtime loads.                                                                                                                                                                           |
| `providerUsageAuthEnvVars`           | No       | `Record<string, string[]>`   | Usage/billing-only provider credentials. OpenClaw uses these names for usage discovery and secret scrubbing but never for inference auth.                                                                                                                                                      |
| `providerAuthAliases`                | No       | `Record<string, string>`     | Provider ids that should reuse another provider id for auth lookup, for example a coding provider that shares the base provider API key and auth profiles.                                                                                                                                     |
| `providerAuthChoices`                | No       | `object[]`                   | Cheap auth-choice metadata for onboarding pickers, preferred-provider resolution, and simple CLI flag wiring.                                                                                                                                                                                  |
| `activation`                         | No       | `object`                     | Cheap activation planner metadata for startup, provider, command, channel, route, and capability-triggered loading. Metadata only; plugin runtime still owns actual behavior.                                                                                                                  |
| `setup`                              | No       | `object`                     | Cheap setup/onboarding descriptors that discovery and setup surfaces can inspect without loading plugin runtime.                                                                                                                                                                               |
| `qaRunners`                          | No       | `object[]`                   | Cheap QA runner descriptors used by the shared `openclaw qa` host before plugin runtime loads.                                                                                                                                                                                                 |
| `dashboard`                          | No       | `object`                     | Dashboard widget data bindings and action verbs. Each entry is validated against a Gateway method registered by this plugin with the required read or write scope. See [dashboard reference](#dashboard-reference).                                                                            |
| `mcpServers`                         | No       | `Record<string, object>`     | Static MCP server definitions contributed while this plugin is enabled. Relative command arguments and working directories resolve from the plugin root. Operator `mcp.servers` entries override or disable definitions with the same name. See [MCP server reference](#mcp-server-reference). |
| `contracts`                          | No       | `object`                     | Static capability ownership snapshot for external auth hooks, embeddings, speech, realtime transcription, realtime voice, media-understanding, image/video/music generation, web fetch, web search, worker providers, document/web-content extraction, and tool ownership.                     |
| `configContracts`                    | No       | `object`                     | Manifest-owned config behavior consumed by generic core helpers: dangerous-flag detection, SecretRef migration targets, and legacy config-path narrowing. See [configContracts reference](#configcontracts-reference).                                                                         |
| `mediaUnderstandingProviderMetadata` | No       | `Record<string, object>`     | Cheap media-understanding defaults for provider ids declared in `contracts.mediaUnderstandingProviders`.                                                                                                                                                                                       |
| `imageGenerationProviderMetadata`    | No       | `Record<string, object>`     | Cheap image-generation auth metadata for provider ids declared in `contracts.imageGenerationProviders`, including provider-owned auth aliases and base-url guards.                                                                                                                             |
| `videoGenerationProviderMetadata`    | No       | `Record<string, object>`     | Cheap video-generation auth metadata for provider ids declared in `contracts.videoGenerationProviders`, including provider-owned auth aliases and base-url guards.                                                                                                                             |
| `musicGenerationProviderMetadata`    | No       | `Record<string, object>`     | Cheap music-generation auth metadata for provider ids declared in `contracts.musicGenerationProviders`, including provider-owned auth aliases and base-url guards.                                                                                                                             |
| `toolMetadata`                       | No       | `Record<string, object>`     | Cheap availability metadata for plugin-owned tools declared in `contracts.tools`. Use it when a tool should not load runtime unless config, env, or auth evidence exists.                                                                                                                      |
| `channelConfigs`                     | No       | `Record<string, object>`     | Manifest-owned channel config metadata merged into discovery and validation surfaces before runtime loads.                                                                                                                                                                                     |
| `skills`                             | No       | `string[]`                   | Skill directories to load, relative to the plugin root.                                                                                                                                                                                                                                        |
| `name`                               | No       | `string`                     | Human-readable plugin name.                                                                                                                                                                                                                                                                    |
| `description`                        | No       | `string`                     | Short summary shown in plugin surfaces.                                                                                                                                                                                                                                                        |
| `catalog`                            | No       | `object`                     | Optional presentation hints for plugin catalog surfaces. This metadata does not install, enable, or grant trust to a plugin.                                                                                                                                                                   |
| `icon`                               | No       | `string`                     | HTTPS image URL for marketplace/catalog cards. ClawHub accepts any valid `https://` URL and falls back to the default plugin icon when this is omitted or invalid.                                                                                                                             |
| `version`                            | No       | `string`                     | Informational plugin version.                                                                                                                                                                                                                                                                  |
| `uiHints`                            | No       | `Record<string, object>`     | UI labels, placeholders, and sensitivity hints for config fields.                                                                                                                                                                                                                              |

## MCP server reference

`mcpServers` lets a native plugin ship an MCP server, including an MCP App, without requiring operators to duplicate its static process definition in `openclaw.json`:

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

OpenClaw includes these servers only while the owning plugin is enabled. Relative `command`, `args`, `cwd`, and `workingDirectory` paths resolve from the plugin root. User configuration remains authoritative: `mcp.servers.<name>` can replace a plugin default or set `enabled: false` to omit it. MCP App rendering and server-tool calls still require the normal MCP Apps setting and effective tool policy; declaring a server does not bypass either boundary.

## dashboard reference

`dashboard` lets an enabled plugin expose existing Gateway RPCs to granted dashboard widgets without adding plugin policy to core. Data bindings must name a method the same plugin registers with `operator.read`; action verbs must name a method it registers with `operator.write`. A mismatch rejects the plugin during registration.

```json
{
  "dashboard": {
    "dataBindings": [
      {
        "id": "items.list",
        "method": "example.items.list",
        "description": "List example items."
      }
    ],
    "actionVerbs": [
      {
        "id": "refresh",
        "method": "example.items.refresh",
        "description": "Refresh example items.",
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

The manifest ids are plugin-local. Widget grants use `<plugin-id>.<id>`, such as `example.items.list` and `example.refresh`. To keep the persisted grant namespace unambiguous, OpenClaw escapes `%` and `.` in the plugin-id segment as `%25` and `%2E`; ordinary plugin ids keep the natural form. `paramShape` is an optional JSON Schema applied to the action params object before OpenClaw invokes the plugin RPC.

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

| 字段            | Required | Type       | What it means                                                                                                                                                                             |
| ---------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`       | Yes      | `string`   | 要检查的插件拥有的配置对象的点路径，例如 `plugins.entries.example.config`。                                                                                                              |
| `overlayPath`    | No       | `string`   | 根配置内的点路径，其对象应在评估该信号之前覆盖根对象。用于 `image`、`video` 或 `music` 等特定能力的配置。                                                                                 |
| `overlayMapPath` | No       | `string`   | 根配置内的点路径，其对象值应分别覆盖根对象。用于 `accounts` 之类的命名账户映射，只要配置了任意账户即可符合条件。                                                                           |
| `required`       | No       | `string[]` | 有效配置内必须具有已配置值的点路径。字符串必须非空；对象和数组不能为空。                                                                                                                  |
| `requiredAny`    | No       | `string[]` | 有效配置内至少有一个必须具有已配置值的点路径。                                                                                                                                            |
| `mode`           | No       | `object`   | 有效配置内可选的字符串模式守卫。当仅某一种模式适用“仅配置即可可用”时使用。                                                                                                               |

每个 `mode` 守卫支持：

| 字段        | 必填 | 类型       | 含义                                                                      |
| ------------ | ---- | ---------- | ------------------------------------------------------------------------- |
| `path`       | 否   | `string`   | 有效配置内的点路径。默认值为 `mode`。                                     |
| `default`    | 否   | `string`   | 当配置省略该路径时使用的模式值。                                          |
| `allowed`    | 否   | `string[]` | 如果存在，则仅当有效模式属于这些值之一时，该信号才通过。                   |
| `disallowed` | 否   | `string[]` | 如果存在，则当有效模式属于这些值之一时，该信号失败。                       |

每个 `authSignals` 条目支持：

| 字段              | 必填 | 类型     | 含义                                                                                                                                                                 |
| ----------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是         | `string` | 要在已配置 auth 配置文件中检查的 provider id。                                                                                                                       |
| `providerBaseUrl` | 否         | `object` | 可选守卫：仅当引用的已配置 provider 使用允许的 base URL 时，该信号才计入。仅当某个 auth 别名只对特定 API 有效时使用。                                                |

每个 `providerBaseUrl` 守卫支持：

| 字段              | 必填 | 类型       | 含义                                                                                                                                        |
| ----------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是         | `string`   | 应检查其 `baseUrl` 的 provider 配置 id。                                                                                                |
| `defaultBaseUrl`  | 否         | `string`   | 当 provider 配置省略 `baseUrl` 时假定使用的 base URL。                                                                                   |
| `allowedBaseUrls` | 是         | `string[]` | 该 auth 信号允许的 base URL。当已配置或默认的 base URL 与这些规范化后的值都不匹配时，该信号将被忽略。 |

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

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一种 onboarding 或 auth 选项。OpenClaw 会在 provider 运行时加载之前读取这些内容。Provider setup 列表会使用这些 manifest 选项、由 descriptor 派生的 setup 选项，以及 install-catalog 元数据，而不会加载 provider 运行时。

| Field                 | Required | Type                                                                  | What it means                                                                                             |
| --------------------- | -------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `provider`            | Yes      | `string`                                                              | Provider id this choice belongs to.                                                                       |
| `method`              | Yes      | `string`                                                              | Auth method id to dispatch to.                                                                            |
| `choiceId`            | Yes      | `string`                                                              | Stable auth-choice id used by onboarding and CLI flows.                                                   |
| `choiceLabel`         | No       | `string`                                                              | User-facing label. If omitted, OpenClaw falls back to `choiceId`.                                         |
| `choiceHint`          | No       | `string`                                                              | Short helper text for the picker.                                                                         |
| `icon`                | No       | HTTPS URL                                                             | Artwork shown beside this choice in supported onboarding clients.                                         |
| `website`             | No       | HTTPS URL                                                             | Product, sign-in, or installation page shown by supported onboarding clients.                             |
| `assistantPriority`   | No       | `number`                                                              | Lower values sort earlier in assistant-driven interactive pickers.                                        |
| `assistantVisibility` | No       | `"visible"` \| `"manual-only"`                                        | Hide the choice from assistant pickers while still allowing manual CLI selection.                         |
| `deprecatedChoiceIds` | No       | `string[]`                                                            | Legacy choice ids that should redirect users to this replacement choice.                                  |
| `groupId`             | No       | `string`                                                              | Optional group id for grouping related choices.                                                           |
| `groupLabel`          | No       | `string`                                                              | User-facing label for that group.                                                                         |
| `groupHint`           | No       | `string`                                                              | Short helper text for the group.                                                                          |
| `onboardingFeatured`  | No       | `boolean`                                                             | Surface this group in the featured tier of the interactive onboarding picker, before the "More..." entry. |
| `optionKey`           | No       | `string`                                                              | Internal option key for simple one-flag auth flows.                                                       |
| `cliFlag`             | No       | `string`                                                              | CLI flag name, such as `--openrouter-api-key`.                                                            |
| `cliOption`           | No       | `string`                                                              | Full CLI option shape, such as `--openrouter-api-key <key>`.                                              |
| `cliDescription`      | No       | `string`                                                              | Description used in CLI help.                                                                             |
| `appGuidedSecret`     | No       | `boolean`                                                             | One pasted secret plus provider defaults is sufficient for app-guided setup.                              |
| `appGuidedDiscovery`  | No       | `boolean`                                                             | The matching runtime auth method owns read-only local discovery through `appGuidedSetup`.                 |
| `appGuidedAuth`       | No       | `"oauth"` \| `"device-code"`                                          | Provider-owned interactive login that native setup clients can render generically.                        |
| `onboardingScopes`    | No       | `Array<"text-inference" \| "image-generation" \| "music-generation">` | Which onboarding surfaces this choice should appear in. If omitted, it defaults to `["text-inference"]`.  |

When `appGuidedDiscovery` is true, the matching provider auth method must expose
`appGuidedSetup.detect` and `appGuidedSetup.prepare`. Detection must be
read-only: no login, model pull, download, or config write. Preparation rechecks
the exact selected model and returns a config proposal; OpenClaw live-tests that
proposal in isolation and commits it only after success.

## commandAliases reference

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

当插件可以廉价地声明哪些控制平面事件应将其包含在激活/加载计划中时，请使用 `activation`。

这个块是规划器元数据，不是生命周期 API。它不会注册运行时行为，不会替代 `register(...)`，也不保证插件代码已经执行。激活规划器会使用这些字段来缩小候选插件范围，然后再回退到现有的 manifest 归属元数据，例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks。

优先使用已经描述归属关系的最窄元数据。当这些字段能够表达这种关系时，请使用 `providers`、`channels`、`commandAliases`、setup descriptors 或 `contracts`。当需要一些无法由这些归属字段表示的额外规划器提示时，再使用 `activation`。对于诸如 `claude-cli`、`my-cli` 或 `google-gemini-cli` 这类 CLI 运行时别名，请使用顶层 `cliBackends`；`activation.onAgentHarnesses` 仅用于那些没有现有归属字段的嵌入式 agent harness id。

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
| `onProviders`      | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的 provider id。                                                                                                                      |
| `onAgentHarnesses` | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的嵌入式 agent harness runtime id。CLI backend 别名请使用顶层 `cliBackends`。                                           |
| `onCommands`       | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的命令 id。                                                                                                                       |
| `onChannels`      | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的 channel id。                                                                                                                       |
| `onRoutes`         | 否       | `string[]`                                           | 在 activation/load 计划中应包含此插件的 route 类型。                                                                                                                       |
| `onConfigPaths`    | 否       | `string[]`                                           | 当路径存在且未被显式禁用时，在 startup/load 计划中应包含此插件的根相对配置路径。                                                      |
| `onCapabilities`   | 否       | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面激活规划使用的宽泛能力提示。尽可能优先使用更窄的字段。                                                                                     |

当前实时消费者：

- Gateway startup planning uses `activation.onStartup` for explicit startup import.
- Command-triggered CLI planning falls back to legacy `commandAliases[].cliCommand` or `commandAliases[].name`.
- Agent-runtime startup planning uses `activation.onAgentHarnesses` for embedded harnesses and top-level `cliBackends[]` for CLI runtime aliases.
- Channel-triggered setup/channel planning falls back to legacy `channels[]` ownership when explicit channel activation metadata is missing.
- Startup plugin planning uses `activation.onConfigPaths` for non-channel root config surfaces such as the bundled browser plugin's `browser` block.
- Provider-triggered setup/runtime planning falls back to legacy `providers[]` and top-level `cliBackends[]` ownership when explicit provider activation metadata is missing.

规划器诊断可以区分显式激活提示与 manifest 归属回退。例如，`activation-command-hint` 表示匹配到了 `activation.onCommands`，而 `manifest-command-alias` 表示规划器改为使用 `commandAliases` 归属。这些原因标签仅用于宿主诊断和测试；插件作者应继续声明最能描述归属关系的元数据。

## qaRunners 参考

当某个插件在共享的 `openclaw qa` 根命令下贡献一个或多个 transport runner 时，请使用 `qaRunners`。请保持此元数据轻量且静态；插件运行时仍通过一个轻量级的 `runtime-api.ts` 接口负责实际的 CLI 注册，该接口导出匹配的 `qaRunnerCliRegistrations`。可选的 `adapterFactory` 会将 transport 暴露给共享的 QA 场景，而不会改变已注册命令的 runner。

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

OpenClaw includes `setup.providers[].envVars` in generic provider auth and env-var lookups. Put setup and status env metadata there.

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
| `fallbackPaths`    | 否       | `string[]`        | 当 `fileEnvVar` 缺失或为空时检查的本地凭据文件路径。支持 `${HOME}` 和 `${APPDATA}`。                            |
| `requiresAnyEnv`   | 否       | `string[]`        | 在该证据有效之前，所列环境变量中至少一个必须非空。                                                             |
| `requiresAllEnv`   | 否       | `string[]`        | 在该证据有效之前，所列环境变量都必须非空。                                                                     |
| `credentialMarker` | 是       | `string`          | 证据存在时返回的非机密标记。                                                                                   |
| `source`           | 否       | `string`          | 用于 auth/status 输出的面向用户的来源标签。                                                                    |

### setup 字段

| 字段              | 必需 | 类型       | 含义                                                                                       |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------------------------------ |
| `providers`        | 否   | `object[]` | 在 setup 和 onboarding 期间暴露的 provider setup 描述符。                                   |
| `cliBackends`      | 否   | `string[]` | 用于基于描述符优先查找 setup 的 setup 期 backend id。请保持规范化 id 全局唯一。             |
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

| Field          | Type             | What it means                                                                                                     |
| -------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `label`        | `string`         | User-facing field label.                                                                                          |
| `help`         | `string`         | Short helper text.                                                                                                |
| `tags`         | `string[]`       | Optional UI tags.                                                                                                 |
| `advanced`     | `boolean`        | Marks the field as advanced.                                                                                      |
| `sensitive`    | `boolean`        | Marks the field as secret or sensitive.                                                                           |
| `placeholder`  | `string`         | Placeholder text for form inputs.                                                                                 |
| `presentation` | `"phone-number"` | Display-only localized phone formatting for parseable international (`+...`) values; raw values remain unchanged. |

Channel config sections inherit `help` for the leaves every channel shares
(`enabled`, `allowFrom`, `dmPolicy`, `groupPolicy`, `streaming`, and similar) at
the channel root and under `accounts.<id>`. A channel that declares its own
`help` for one of those keys always wins, so override it whenever the shared
wording is wrong for your provider. Provider-specific keys such as credentials,
hosts, and webhooks still need their own hints.

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

工作器提供方必须在 `contracts.workerProviders` 中声明每个 `api.registerWorkerProvider(...)` ID。核心在调用 `provision` 之前会持久化持久化意图；提供方在外部分配之前验证其设置，并且针对同一操作 ID 的重复调用必须采用相同的租约。核心还会持久化该已验证的设置快照，并将其与 `leaseId` 一起传递给 `inspect({ leaseId, profile })` 和 `destroy({ leaseId, profile })`，即使在命名配置文件发生更改或被移除之后也是如此。销毁是幂等的，检查会返回已关闭的 `active` / `destroyed` / `unknown` 状态联合类型，SSH 私钥材料仅通过 `SecretRef` 引用。已分配的 SSH 端点还必须包含来自受信任预配输出的公有 `hostKey`，格式必须严格为 `algorithm base64`，不得包含主机名或注释，以便核心在连接前固定主机密钥。铸造动态身份引用的提供方可以实现权威性的 `resolveSshIdentity({ leaseId, profile, keyRef })`；不实现该方法的提供方则使用核心的通用密钥解析器。权威性的 `unknown` 会使一个活动的本地记录成为孤儿；在持久化的销毁请求之后，它会确认拆除完成。

`contracts.gatewayMethodDispatch` 当前接受 `"authenticated-request"`。它是针对原生插件 HTTP 路由的 API 卫生门禁，这些路由会有意在进程内分发 Gateway 控制平面方法，而不是用来作为防御恶意原生插件的沙箱。仅将其用于已严格审查、且本身就需要 Gateway HTTP 认证的捆绑/运维面。只有当一个具备权限的路由同时声明 `auth: "gateway"` 和路由特定的 `gatewayRuntimeScopeSurface: "trusted-operator"` 时，它才会在 Gateway 根工作接入关闭时仍保持可达；同一插件中的普通兄弟路由仍会处于接入边界之后。这样可以在不赋予整个插件接入绕过权限的前提下，保持挂起状态和恢复操作的可达性。解析和响应整形应限制在分发之外；实质性工作或变更性工作必须通过 Gateway 方法分发完成，因为它负责接入和作用域强制执行。

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

| Field                         | Required | Type       | What it means                                                                                                                                                                                                                          |
| ----------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compatibilityMigrationPaths` | No       | `string[]` | Root-relative config paths that indicate this plugin's setup-time compatibility migrations might apply. Lets generic runtime config reads skip every plugin setup surface when the config never references the plugin.                 |
| `compatibilityRuntimePaths`   | No       | `string[]` | Root-relative compatibility paths this plugin can service during runtime before plugin code fully activates. Use this for legacy surfaces that should narrow bundled candidate sets without importing every compatible plugin runtime. |
| `dangerousFlags`              | No       | `object[]` | Config literals that `openclaw doctor` should flag as insecure or dangerous when enabled. See below.                                                                                                                                   |
| `secretInputs`                | No       | `object`   | Config paths under `plugins.entries.<id>.config` for SecretRef migration, audit, startup materialization, and optional runtime owner isolation. See below.                                                                             |

每个 `dangerousFlags` 条目支持：

| 字段     | 必需 | 类型                                  | 含义                                                                                                       |
| -------- | ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `path`   | 是   | `string`                              | 相对于 `plugins.entries.<id>.config` 的点分隔配置路径。支持用于映射/数组段的 `*` 通配符。                   |
| `equals` | 是   | `string \| number \| boolean \| null` | 将此配置值标记为危险的精确字面量。                                                                           |

`secretInputs` 支持：

| Field                   | Required | Type       | What it means                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bundledDefaultEnabled` | No       | `boolean`  | Override bundled-plugin default enablement when deciding whether this SecretRef surface is active. Use this when the plugin is bundled but the surface should stay inactive until explicitly enabled in config.                                                                                                                                            |
| `paths`                 | Yes      | `object[]` | Secret-shaped config paths, each with `path` (dot-separated, relative to `plugins.entries.<id>.config`, supports `*` wildcards), optional `expected` (currently only `"string"`), and optional `ownerKind` (currently only `"route"`). A declared owner isolates only that exact matched path when resolution fails; its owner id is the full config path. |

## mediaUnderstandingProviderMetadata 参考

当某个媒体理解 provider 具有默认模型、自动认证回退优先级，或原生文档支持，而通用核心辅助函数在运行时加载之前就需要这些信息时，请使用 `mediaUnderstandingProviderMetadata`。这些键也必须在 `contracts.mediaUnderstandingProviders` 中声明。

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

每个 provider 条目可以包含：

| 字段                   | 类型                                                             | 含义                                                                                                           |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]`                              | 此 provider 暴露的媒体能力。                                                                                   |
| `defaultModels`        | `Record<string, string>`                                         | 当配置未指定模型时使用的能力到模型默认映射。                                                                   |
| `autoPriority`         | `Record<string, number>`                                         | 数字越小，在基于凭证的自动 provider 回退中排序越靠前。                                                        |
| `nativeDocumentInputs` | `"pdf"[]`                                                        | 该 provider 支持的原生文档输入。                                                                               |
| `documentModels`       | `{ pdf?: { textExtraction?: string; image?: string \| false } }` | 按文档类型覆盖模型。将 `image` 设为 `false` 可为该文档类型禁用基于图像的提取。 |

## channelConfigs 参考

当某个 channel 插件在运行时加载之前需要廉价的配置元数据时，请使用 `channelConfigs`。只读的 channel 设置/状态发现可以在没有 setup 条目的情况下，直接对已配置的外部 channel 使用这些元数据；或者当 `setup.requiresRuntime: false` 声明 setup 不需要运行时环境时，也可以这样使用。

`channelConfigs` 是插件 manifest 元数据，不是新的顶层用户配置章节。用户仍然在 `channels.<channel-id>` 下配置 channel 实例。OpenClaw 会先读取 manifest 元数据，以决定在插件运行时代码执行之前，哪个插件拥有该已配置的 channel。

对于 channel 插件，`configSchema` 和 `channelConfigs` 描述的是不同路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

Non-bundled plugins that declare `channels[]` should also declare matching `channelConfigs` entries. Without them, OpenClaw can still load the plugin, but cold-path config schema, setup, and Control UI surfaces cannot know the channel-owned option shape or display-only UI hints until plugin runtime executes.

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

| Field         | Type                     | What it means                                                                                                    |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | JSON Schema for `channels.<id>`. Required for each declared channel config entry.                                |
| `uiHints`     | `Record<string, object>` | Optional labels, placeholders, sensitivity, and display-only presentation hints for that channel config section. |
| `label`       | `string`                 | Channel label merged into picker and inspect surfaces when runtime metadata is not ready.                        |
| `description` | `string`                 | Short channel description for inspect and catalog surfaces.                                                      |
| `commands`    | `object`                 | Static native command and native skill auto-defaults for pre-runtime config checks.                              |
| `preferOver`  | `string[]`               | Legacy or lower-priority plugin ids this channel should outrank in selection surfaces.                           |

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

| Field                 | Type                     | What it means                                                                                                                                                                                                     |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`             | `string`                 | 可选的默认 base URL，适用于此 provider catalog 中的模型。                                                                                                                                                         |
| `api`                 | `ModelApi`               | 可选的默认 API 适配器，适用于此 provider catalog 中的模型。                                                                                                                                                       |
| `headers`             | `Record<string, string>` | 可选的静态请求头，适用于此 provider catalog。                                                                                                                                                                      |
| `defaultUtilityModel` | `string`                 | 可选的 provider 推荐的小模型 id，用于简短的内部工具任务（标题、进度叙述）。当 `agents.defaults.utilityModel` 未设置且该 provider 提供代理的主模型时使用。 |
| `models`              | `object[]`               | 必需的模型行。没有 `id` 的行会被忽略。                                                                                                                                                                            |

Model 字段：

| Field              | Type                                                           | What it means                                                                        |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `id`               | `string`                                                       | Provider-local model id, without the `provider/` prefix.                             |
| `name`             | `string`                                                       | Optional display name.                                                               |
| `api`              | `ModelApi`                                                     | Optional per-model API override.                                                     |
| `baseUrl`          | `string`                                                       | Optional per-model base URL override.                                                |
| `headers`          | `Record<string, string>`                                       | Optional per-model static headers.                                                   |
| `input`            | `Array<"text" \| "image" \| "document">`                       | Modalities the model accepts. Other values are silently dropped.                     |
| `reasoning`        | `boolean`                                                      | Whether the model exposes reasoning behavior.                                        |
| `contextWindow`    | `number`                                                       | Native provider context window.                                                      |
| `contextTokens`    | `number`                                                       | Optional effective runtime context cap when different from `contextWindow`.          |
| `maxTokens`        | `number`                                                       | Maximum output tokens when known.                                                    |
| `thinkingLevelMap` | `Record<string, string \| null>`                               | Optional per-thinking-level model-id or param overrides.                             |
| `cost`             | `object`                                                       | Optional USD per million token pricing, including optional `tieredPricing`.          |
| `compat`           | `object`                                                       | Optional compatibility flags matching OpenClaw model config compatibility.           |
| `upstreamModel`    | `string`                                                       | Optional `provider/model` ref of the same upstream model in another bundled catalog. |
| `mediaInput`       | `object`                                                       | Optional per-modality input config, currently image-only.                            |
| `status`           | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | Listing status. Suppress only when the row must not appear at all.                   |
| `statusReason`     | `string`                                                       | Optional reason shown with non-available status.                                     |
| `replaces`         | `string[]`                                                     | Older provider-local model ids this model supersedes.                                |
| `replacedBy`       | `string`                                                       | Replacement provider-local model id for deprecated rows.                             |
| `tags`             | `string[]`                                                     | Stable tags used by pickers and filters.                                             |

抑制字段：

| 字段                      | 类型       | 含义                                                                                             |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `provider`                | `string`   | 要抑制的上游行的 provider id。必须由该插件拥有，或声明为指向已拥有别名。                          |
| `model`                   | `string`   | 要抑制的 provider 本地 model id。                                                                 |
| `reason`                  | `string`   | 当直接请求被抑制的行时显示的可选消息。                                                             |
| `when.baseUrlHosts`       | `string[]` | 应用该 suppression 之前所需的有效 provider base URL host 列表（可选）。                            |
| `when.providerConfigApiIn` | `string[]` | 应用该 suppression 之前所需的精确 provider-config `api` 值列表（可选）。                         |

`upstreamModel` marks a row that serves the same upstream model as a row in another bundled catalog under a different name, for example a subscription endpoint next to the vendor's API endpoint. It is authoring metadata: normalization drops it, and a contract test uses it to keep capability flags such as `compat.codeMode` from drifting between catalogs that ship the same model. Most rows need no marker, because matching ignores a leading vendor namespace and casing: `moonshotai/kimi-k3` and `zai-org/GLM-5.2` already match the first-party `kimi-k3` and `glm-5.2` rows. Reach for `upstreamModel` only when the vendor's own names genuinely differ. See [Code mode](/tools/code-mode#models-shipped-by-more-than-one-provider).

Do not put runtime-only data in `modelCatalog`. Use `static` only when manifest rows are complete enough for provider-filtered list and picker surfaces to skip registry/runtime discovery. Use `refreshable` when manifest rows are useful listable seeds or supplements but a refresh/cache can add more rows later; refreshable rows are not authoritative by themselves. Use `runtime` when OpenClaw must load provider runtime to know the list.

## modelIdNormalization 参考

使用 `modelIdNormalization` 来进行廉价的、由提供方拥有的 model-id 清理，这类清理必须在 provider runtime 加载之前完成。这样可以把诸如简短模型名、提供方本地旧版 id，以及代理前缀规则等内容保留在所属插件清单中，而不是放在核心模型选择表里。

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
| `openAICompletions`   | `object`         | OpenAI 兼容的 completions 请求标志，目前是 `supportsStreamingUsage`。                |

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

OpenClaw 会根据插件根目录以及（对于 `${node}` 预设）当前 Node 可执行文件所在目录，为清单预设推导出 `trustedDirs`。清单中定义的 `trustedDirs` 会被忽略。其他 exec 提供方选项，例如 `timeoutMs`、`noOutputTimeoutMs`、`maxOutputBytes`、`jsonOnly`、`env`、`passEnv` 和 `allowInsecurePath`，会透传到普通的 SecretRef exec 提供方配置中。

## modelPricing 参考

Use `modelPricing` when the hosted catalog publisher needs provider-specific pricing-key behavior. The publisher reads this metadata without importing provider runtime code.

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

| Field        | Type              | What it means                                                                                 |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | Set `false` for local/self-hosted providers that should never use published external pricing. |
| `openRouter` | `false \| object` | OpenRouter publication-key mapping. `false` disables OpenRouter matching for this provider.   |
| `liteLLM`    | `false \| object` | LiteLLM publication-key mapping. `false` disables LiteLLM matching for this provider.         |

来源字段：

| 字段                      | 类型               | 含义                                                                                                                |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 当外部目录提供方 id 与 OpenClaw 提供方 id 不同时使用，例如 `zai` 提供方对应 `z-ai`。                               |
| `passthroughProviderModel` | `boolean`          | 将包含斜杠的 model id 视为嵌套的 provider/model 引用，对 OpenRouter 等代理提供方很有用。                             |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录 model-id 变体。`version-dots` 会尝试带点的版本 id，例如 `claude-opus-4.6`。                         |

### OpenClaw 提供方索引

OpenClaw 提供方索引是 OpenClaw 拥有的预览元数据，适用于插件可能尚未安装的提供方。它不是插件清单的一部分。插件清单仍然是已安装插件的权威来源。当提供方插件未安装时，提供方索引是未来可安装提供方和预安装模型选择器界面将消费的内部兜底契约。

目录权威顺序：

1. 用户配置。
2. 已安装插件清单 `modelCatalog`。
3. 来自显式刷新的模型目录缓存。
4. OpenClaw Provider Index 预览行。

Provider Index 中不得包含密钥、启用状态、运行时钩子或实时的账户特定模型数据。其预览目录使用与插件清单相同的 `modelCatalog` provider 行形状，但应仅限于稳定的显示元数据，除非像 `api`、`baseUrl`、定价或兼容性标志这样的运行时适配器字段被有意保持与已安装插件清单一致。具有实时 `/models` 发现能力的提供方应通过显式的模型目录缓存路径写入刷新后的行，而不是在正常的列出或引导流程中调用提供方 API。

对于那些插件已从核心移出或尚未安装的提供方，Provider Index 条目也可以携带可安装插件元数据。此元数据遵循通道目录模式：包名、npm 安装规范、预期完整性校验以及简洁的认证选项标签，足以展示一个可安装的设置选项。一旦插件安装完成，其清单将生效，而该提供方的 Provider Index 条目会被忽略。

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

| Field                                                                                      | What it means                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | Declares native plugin entrypoints. Must stay inside the plugin package directory.                                                                                                        |
| `openclaw.runtimeExtensions`                                                               | Declares built JavaScript runtime entrypoints for installed packages. Must stay inside the plugin package directory.                                                                      |
| `openclaw.setupEntry`                                                                      | Lightweight setup-only entrypoint used during onboarding, deferred channel startup, and read-only channel status/SecretRef discovery. Must stay inside the plugin package directory.      |
| `openclaw.runtimeSetupEntry`                                                               | Declares the built JavaScript setup entrypoint for installed packages. Requires `setupEntry`, must exist, and must stay inside the plugin package directory.                              |
| `openclaw.channel`                                                                         | Cheap channel catalog metadata like labels, docs paths, aliases, and selection copy.                                                                                                      |
| `openclaw.channel.approvalFlags`                                                           | Closed approval behavior flags available before runtime load. `native` means the channel owns native approval UI and same-turn resolution.                                                |
| `openclaw.channel.commands`                                                                | Static native command and native skill auto-default metadata used by config, audit, and command-list surfaces before channel runtime loads.                                               |
| `openclaw.channel.cliAddOptions`                                                           | Plugin-owned `openclaw channels add` options. Each entry declares `flags`, `description`, optional `defaultValue`, and optional `valueType` (`int` or `list`) for generic input coercion. |
| `openclaw.channel.configuredState`                                                         | Lightweight configured-state checker metadata that can answer "does env-only setup already exist?" without loading the full channel runtime.                                              |
| `openclaw.channel.persistedAuthState`                                                      | Lightweight persisted-auth checker metadata that can answer "is anything already signed in?" without loading the full channel runtime.                                                    |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Install/update hints for bundled and externally published plugins.                                                                                                                        |
| `openclaw.install.defaultChoice`                                                           | Preferred install path when multiple install sources are available.                                                                                                                       |
| `openclaw.install.minHostVersion`                                                          | Minimum supported OpenClaw host version, using a semver floor like `>=2026.3.22` or `>=2026.5.1-beta.1`.                                                                                  |
| `openclaw.compat.pluginApi`                                                                | Minimum OpenClaw plugin API range required by this package, using a semver floor like `>=2026.5.27`.                                                                                      |
| `openclaw.install.expectedIntegrity`                                                       | Expected npm dist integrity string such as `sha512-...`; install and update flows verify the fetched artifact against it.                                                                 |
| `openclaw.install.allowInvalidConfigRecovery`                                              | Allows a narrow bundled-plugin reinstall recovery path when config is invalid.                                                                                                            |
| `openclaw.install.requiredPlatformPackages`                                                | npm package aliases that must materialize when their lockfile platform constraints match the current host.                                                                                |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | Lets setup-runtime channel surfaces load before listen, then defers the full configured channel plugin until post-listen activation.                                                      |

Manifest 元数据决定在运行时加载之前，onboarding 中会出现哪些 provider/channel/setup 选项。`package.json#openclaw.install` 告诉 onboarding 当用户选择这些选项之一时如何获取或启用该插件。不要把安装提示移到 `openclaw.plugin.json` 中。

For `openclaw.channel.cliAddOptions`, use Commander's long-option syntax, such as `--initial-sync-limit <n>`. Set `valueType: "int"` to parse a non-negative integer or `valueType: "list"` to split comma-, semicolon-, or newline-delimited input into strings before the plugin setup adapter receives it. Omit `valueType` to pass the parsed Commander value through unchanged.

`openclaw.install.minHostVersion` is enforced during install and manifest registry loading for non-bundled plugin sources. Invalid values are rejected; newer-but-valid values skip external plugins on older hosts. Bundled source plugins are assumed to be co-versioned with the host checkout.

`openclaw.install.requiredPlatformPackages` 适用于通过可选的、按平台区分的别名暴露所需原生二进制文件的 npm 包。为每个受支持的平台别名列出裸 npm 包名。在 npm install 期间，OpenClaw 只会验证锁文件约束与当前主机匹配的已声明别名。如果 npm 报告成功但省略了该别名，OpenClaw 会用新的缓存重试一次；如果该别名仍然缺失，则回滚安装。

`openclaw.compat.pluginApi` 会在非捆绑插件来源的包安装期间强制执行。把它用于该包构建时所依赖的 OpenClaw 插件 SDK/运行时 API 下限。当插件包需要更高的 API，但在其他流程中仍希望保留较低的安装提示时，它可以比 `minHostVersion` 更严格。官方 OpenClaw 发布同步默认会把现有官方插件的 API 下限提升到 OpenClaw 发布版本，但仅插件发布可以在包有意支持旧主机时保留较低下限。不要仅用包版本作为兼容性契约。`peerDependencies.openclaw` 仍然是 npm 包元数据；OpenClaw 使用 `openclaw.compat.pluginApi` 契约来做安装兼容性决策。

官方按需安装元数据在插件发布到 ClawHub 时应使用 `clawhubSpec`；onboarding 会将其视为首选远程来源，并在安装后记录 ClawHub 工件事实。`npmSpec` 仍然是尚未迁移到 ClawHub 的包的兼容回退方案。

精确的 npm 版本锁定已经存在于 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录条目应将精确规格与 `expectedIntegrity` 配对，以便在获取到的 npm 工件不再匹配固定发布版本时，更新流程能够安全失败。交互式 onboarding 仍会提供受信任的注册表 npm 规格，包括裸包名和 dist-tags，以保证兼容性。目录诊断可以区分精确、浮动、完整性固定、缺少完整性、包名不匹配以及无效默认选择来源。它们还会在存在 `expectedIntegrity` 但没有可用于固定它的有效 npm 来源时发出警告。存在 `expectedIntegrity` 时，安装/更新流程会强制执行它；省略时，则会记录注册表解析结果而不附加完整性固定。

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

`openclaw.channel.configuredState` supports cheap configured checks. Prefer declarative env metadata when environment variables are sufficient:

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

Use `env.allOf` when every listed variable is required and `env.anyOf` when any one non-empty variable is enough. If a tiny non-runtime check needs more than environment metadata, use `specifier` plus `exportName` as shown for `persistedAuthState`; when `env` is present, OpenClaw uses it without loading that module. If the check needs full config resolution or the real channel runtime, keep that logic in the plugin `config.hasConfiguredState` hook instead.

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

- The manifest is **required for native OpenClaw plugins**, including local filesystem loads. Runtime still loads the plugin module separately; the manifest is only for discovery + validation.
- Native manifests are parsed with JSON5, so comments, trailing commas, and unquoted keys are accepted as long as the final value is still an object.
- Only documented manifest fields are read by the manifest loader. Avoid custom top-level keys.
- `channels`, `providers`, `cliBackends`, and `skills` can all be omitted when a plugin does not need them.
- `providerCatalogEntry` must stay lightweight and should not import broad runtime code; use it for static provider catalog metadata or narrow discovery descriptors, not request-time execution.
- Exclusive plugin kinds are selected through `plugins.slots.*`: `kind: "memory"` via `plugins.slots.memory` (default `memory-core`), `kind: "context-engine"` via `plugins.slots.contextEngine` (default `legacy`).
- Declare exclusive plugin kind in this manifest. Runtime-entry `OpenClawPluginDefinition.kind` is deprecated and remains only as a compatibility fallback for older plugins.
- Env-var metadata in `setup.providers[].envVars` is declarative only. Status, audit, cron delivery validation, and other read-only surfaces still apply plugin trust and effective activation policy before treating an env var as configured.
- For runtime wizard metadata that requires provider code, see [Provider runtime hooks](/plugins/architecture-internals#provider-runtime-hooks).
- If your plugin depends on native modules, document the build steps and any package-manager allowlist requirements (for example, pnpm `allow-build-scripts` + `pnpm rebuild <package>`).

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
