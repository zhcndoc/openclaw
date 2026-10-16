---
summary: "清单生成、媒体理解、端点和请求提供者元数据"
read_when:
  - "您拥有图像、视频、音乐或媒体理解提供商"
  - "您需要核心在运行时加载之前对提供者端点进行分类"
  - "您正在声明廉价的可用性信号，而不是导入运行时"
title: "清单提供者字段"
sidebarTitle: "提供商字段"
---

清单字段告诉核心提供程序可以做什么以及如何实现它，而无需导入提供程序运行时。 [插件清单](/plugins/manifest)参考的一部分； [ 顶级字段引用 ](/plugins/manifest#top-level-field-reference) 列出了每个字段。

## <a id="generation-provider-metadata-reference"></a> 生成 provider 元数据参考

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

| 字段                  | 必需的 | 类型       | 含义                                                                                                                                       |
| ---------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aliases`              | No       | `string[]` | 额外的 provider id，应该作为该 generation provider 的静态 auth 别名计入。                                                       |
| `authProviders`        | No       | `string[]` | 其已配置 auth 配置文件应计入该 generation provider auth 的 provider id。                                                      |
| `configSignals`        | No       | `object[]` | 面向本地或自托管 provider 的低成本、仅配置可用性信号，这些 provider 无需 auth 配置文件或环境变量即可配置。                 |
| `authSignals`          | No       | `object[]` | 显式 auth 信号。存在时，它们会替换来自 provider id、`aliases` 和 `authProviders` 的默认信号集。                     |
| `referenceAudioInputs` | No       | `boolean`  | 仅用于视频生成。当 provider 接受参考音频资产时设为 `true`；否则 `video_generate` 会隐藏音频参考参数。 |

每个 `configSignals` 条目支持：

| 字段            | 必需的 | 类型       | 含义                                                                                                                                                                             |
| ---------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPath`       | 是      | `string`   | 要检查的插件拥有的配置对象的点路径，例如 `plugins.entries.example.config`。                                                                                      |
| `overlayPath`    | No       | `string`   | 根配置内的点路径，其对象应在评估该信号之前覆盖根对象。用于 `image`、`video` 或 `music` 等特定能力的配置。   |
| `overlayMapPath` | No       | `string`   | 根配置内的点路径，其对象值应分别覆盖根对象。用于 `accounts` 之类的命名账户映射，只要配置了任意账户即可符合条件。 |
| `required`       | No       | `string[]` | 有效配置内必须具有已配置值的点路径。字符串必须非空；对象和数组不能为空。                                                  |
| `requiredAny`    | No       | `string[]` | 有效配置内至少有一个必须具有已配置值的点路径。                                                                                                    |
| `mode`           | No       | `object`   | 有效配置内可选的字符串模式守卫。当仅某一种模式适用“仅配置即可可用”时使用。                                                                  |

配置信号检查标准化 SecretRefs 的提供商和环境可用性。其他非空对象是配置的元数据；仅包含 `source` 和 `id` 的对象不会被解释为 SecretRef。 Doctor 修复已声明凭证路径上的遗留引用，而无需重写不透明的插件数据。

每个 `mode` 守卫支持：

| 字段        | 必需的 | 类型       | 含义                                                                      |
| ------------ | -------- | ---------- | ---------------------------------------------------------------------------------- |
| `path`       | No       | `string`   | 有效配置内的点路径。默认值为 `mode`。                          |
| `default`    | No       | `string`   | 当配置省略该路径时使用的模式值。                                  |
| `allowed`    | No       | `string[]` | 如果存在，则仅当有效模式属于这些值之一时，该信号才通过。 |
| `disallowed` | No       | `string[]` | 如果存在，则当有效模式属于这些值之一时，该信号失败。       |

每个 `authSignals` 条目支持：

| 字段             | 必需的 | 类型     | 含义                                                                                                                                                                 |
| ----------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是      | `string` | 要在已配置 auth 配置文件中检查的 provider id。                                                                                                                             |
| `providerBaseUrl` | No       | `object` | 可选防护，仅当引用的配置提供程序使用允许的基础 URL 时才使信号计数。当身份验证别名仅对某些 API 有效时使用此选项。 |

每个 `providerBaseUrl` 守卫支持：

| 字段             | 必需的 | 类型       | 含义                                                                                                                                        |
| ----------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是      | `string`   | 应检查其 `baseUrl` 的 provider 配置 id。                                                                                                |
| `defaultBaseUrl`  | No       | `string`   | 当 provider 配置省略 `baseUrl` 时假定使用的 base URL。                                                                                         |
| `allowedBaseUrls` | 是      | `string[]` | 此身份验证信号允许的基本 URL。当配置或默认基础 URL 与这些归一化值之一不匹配时，该信号将被忽略。 |

## <a id="mediaunderstandingprovidermetadata-reference"></a> mediaUnderstandingProviderMetadata 参考

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

| 字段                  | 类型                                                             | 含义                                                                                                   |
| ---------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]`                              | 此提供商暴露的媒体能力。                                                                    |
| `defaultModels`        | `Record<string, string>`                                         | 当配置未指定模型时使用的能力到模型默认映射。                                         |
| `autoPriority`         | `Record<string, number>`                                         | 数字越小，在基于凭证的自动提供商回退中排序越靠前。                                    |
| `nativeDocumentInputs` | `"pdf"[]`                                                        | 该提供商支持的原生文档输入。                                                               |
| `documentModels`       | `{ pdf?: { textExtraction?: string; image?: string \| false } }` | 每个文档类型的模型覆盖。设置 `image: false` 以禁用该文档类型的基于图像的提取。 |

## <a id="providerendpoints-reference"></a> providerEndpoints 参考

将 `providerEndpoints` 用于端点分类，通用请求策略必须在 provider 运行时加载之前知晓这一信息。核心仍然负责每个 `endpointClass` 的含义，而插件清单负责主机和 base URL 元数据。

当操作员设置 `models.providers.<id>.baseUrl` 时，相同的端点元数据控制隐式模型目录资格。目录、别名和本机模型基本 URL 也算作声明的端点。不匹配的提供者级别 URL 排除清单、发现、静态和生成的目录行；明确创作的模型保留在库存中。没有本机端点声明的插件保留其现有的发现行为。主机和后缀匹配保留其请求分类规则，因此目录资格不会建立确切的来源信任或证明请求可以成功。

官方外部化的 provider 插件会被排除在核心 dist 之外，因此在安装之前，它们的清单是不可见的。它们的 `providerEndpoints` 也必须镜像到 `scripts/lib/official-external-provider-catalog.json` 中，这样即使没有插件，端点分类也能继续工作；契约测试会强制校验这份镜像。

端点字段：

| 字段                          | 类型       | 含义                                                                                  |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端点类别，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。        |
| `hosts`                        | `string[]` | 映射到该端点类别的精确主机名。                                                |
| `hostSuffixes`                 | `string[]` | 映射到该端点类别的主机后缀。对仅域后缀匹配时请在前面加 `.`。 |
| `baseUrls`                     | `string[]` | 映射到端点类的精确规范化 HTTP（S） 基本 URL。                             |
| `googleVertexRegion`           | `string`   | 用于精确全局主机的静态 Google Vertex 区域。                                            |
| `googleVertexRegionHostSuffix` | `string`   | 从匹配主机中剥离以暴露 Google Vertex 区域前缀的后缀。                 |

## <a id="providerrequest-reference"></a> providerRequest 参考

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

| 字段                 | 类型         | 含义                                                                           |
| --------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `family`              | `string`     | 在通用请求兼容性决策和诊断中使用的提供方家族标签。  |
| `compatibilityFamily` | `"moonshot"` | 用于共享请求辅助工具的可选提供方家族兼容性分组。               |
| `openAICompletions`   | `object`     | OpenAI- 兼容的完成请求标志。 `supportsStreamingUsage` 是唯一的标志。 |
| `modelParamsSchema`   | `object`     | JSON 此提供程序的每个模型运行时参数的架构。                               |

`modelParamsSchema` 验证 `agents.defaults.models["provider/model"]` 和 `agents.entries.<agentId>.models["provider/model"]` 中的 `params`。它仅适用于声明的提供程序，并且仅接受插件拥有的提供程序 ID。保留 `additionalProperties: true`，以便共享运行时参数仍然可用。使用属性 `title` 和 `description` 作为标签并帮助进行架构查找。架构默认值是描述性的：验证不会将默认值插入模型覆盖层或更改其继承。此每个模型模式不涵盖全局和每个代理 `params`。

例如，vLLM 插件在此声明可选布尔值 `priorityScheduling`。在使用 `--scheduling-policy priority` 启动服务器后，操作员在确切的 `vllm/<model>` 条目的 `params` 下启用它。
