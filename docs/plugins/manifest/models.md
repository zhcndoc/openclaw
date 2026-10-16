---
summary: "清单模型目录、速记族、ID 规范化和定价字段"
read_when:
  - "您拥有一个提供程序插件并且必须声明其模型"
  - "您需要在运行时加载之前读取目录行、别名或抑制"
  - "您正在将提供商模型映射到已发布的定价源"
title: "清单模型字段"
sidebarTitle: "模型字段"
---

描述提供程序插件公开的模型的清单字段：它声明的速记 ID、目录行核心可以在运行时加载、模型 ID 清理和托管定价策略之前读取。 [插件清单](/plugins/manifest)参考的一部分； [ 顶级字段引用 ](/plugins/manifest#top-level-field-reference) 列出了每个字段。

## <a id="modelsupport-reference"></a> modelSupport 参考

当 OpenClaw 应在插件运行时加载之前从速记模型 ID（例如 `gpt-6-astra` 或 `claude-sonnet-4.6`）推断您的提供程序插件时，请使用 `modelSupport`。

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

| 字段           | 类型       | 含义                                                                   |
| --------------- | ---------- | ------------------------------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 与简写 model id 进行 `startsWith` 匹配的前缀。                 |
| `modelPatterns` | `string[]` | 在移除 profile 后缀后，与简写 model id 匹配的正则表达式源码。 |

`modelPatterns` 条目会通过 `compileSafeRegex` 编译，该函数会拒绝包含嵌套重复的模式（例如 `(a+)+$`）。未通过安全检查的模式会被静默跳过，与语法无效的正则表达式相同。请保持模式简单，避免嵌套量词。

## <a id="modelcatalog-reference"></a> modelCatalog 参考

当 OpenClaw 在加载插件运行时之前应该知道提供程序模型元数据时，请使用 `modelCatalog`。这是固定目录行、发布时元数据源、提供者别名、抑制规则和发现模式的清单拥有的源。运行时刷新仍然属于提供程序运行时代码，但清单会告诉核心何时需要运行时。

```json
{
  "providers": ["openai"],
  "modelCatalog": {
    "modelsDev": {
      "openai": "openai"
    },
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
        "reason": "not available on Azure OpenAI Responses"
      }
    ],
    "discovery": {
      "openai": "static"
    }
  }
}
```

顶级字段：

| 字段            | 类型                                                     | 含义                                                                                               |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `modelsDev`      | `Record<string, string>`                                 | 发布时选择加入从拥有的 OpenClaw 提供商 ID 到 models.dev 提供商 ID 的映射。             |
| `providers`      | `Record<string, object>`                                 | 该插件拥有的 provider id 的 catalog 行。键也应出现在顶层 `providers` 中。       |
| `aliases`        | `Record<string, object>`                                 | 应解析为所拥有 provider 的别名，用于 catalog 或抑制规划。              |
| `suppressions`   | `object[]`                                               | 来自其他来源的 model 行，该插件因 provider 特定原因对其进行抑制。                  |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | provider catalog 是否可以从 manifest 元数据读取、刷新到缓存中，或者是否需要运行时。 |
| `runtimeAugment` | `boolean`                                                | 仅当 provider 运行时必须在 manifest/config 规划之后追加 catalog 行时设为 `true`。       |

发布托管目录时，`modelsDev` 选择自有提供商参与 models.dev 元数据水合作用。每个 OpenClaw 提供程序声明一次上游提供程序，而不是每个模型一次。省略表示没有models.dev水合作用；没有中央提供商后备。当 OpenClaw 提供者 ID 和源 ID 被修剪时，密钥将被标准化。空或非字符串源 ID 以及无主提供者的映射将被忽略；单独的别名并不授予所有权。映射不会创建目录提供程序行或放松其验证。

Hydration 添加符合条件的模型 ID，并仅填充未定义的元数据。显式清单值仍然具有权威性，包括 `false`； models.dev 从不提供运输设置或价格。价格仍然遵循提供商拥有的定价政策。仅当提供程序默认值适合新导入的行时才选择加入；为每个模型选择传输的提供商不应选择加入，除非这些默认设置是安全的。如果 models.dev 无法访问或其响应格式错误，则发布失败并且上次发布的工件保持不变。如果仅映射的上游提供程序丢失或格式错误，则该提供程序将发布其清单行而不进行水合作用，并且运行会记录一条警告并命名它；其他提供商仍在更新。当 models.dev 重命名提供程序时，使每个映射保持最新。即使没有 `--pricing`，发布者也会水合选择加入的元数据；该标志仅控制价格丰富。试运行执行相同的元数据水合作用，而不写入工件。

该字段是发布时创作元数据，而不是网关发现挂钩。它不添加运行时网络调用或热重载；现有的 [ 托管目录更新生命周期](/concepts/models#hosted-catalog-updates) 不变。

`aliases` 参与模型目录规划的提供商所有权查找。别名目标必须是同一插件拥有的顶级提供程序。当提供程序过滤的列表使用别名时，OpenClaw 可以读取所属清单并应用别名 API/base URL 覆盖，而无需加载提供程序运行时。别名不会扩展未过滤的目录列表；宽列表仅发出拥有的主要提供者行。

`suppressions` 替代了旧的 provider 运行时 `suppressBuiltInModel` 钩子。只有当 provider 归该插件拥有，或者被声明为指向已拥有 provider 的 `modelCatalog.aliases` 键时，抑制项才会生效。模型解析期间不再调用运行时抑制钩子。

提供方字段：

| 字段                 | 类型                     | 含义                                                                                                                                                                                                     |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`             | `string`                 | 可选的默认 base URL，适用于此 provider catalog 中的模型。                                                                                                                                                    |
| `api`                 | `ModelApi`               | 可选的默认 API 适配器，适用于此 provider catalog 中的模型。                                                                                                                                                 |
| `headers`             | `Record<string, string>` | 可选的静态请求头，适用于此 provider catalog。                                                                                                                                                      |
| `defaultUtilityModel` | `string`                 | 可选的 provider 推荐的小模型 id，用于简短的内部工具任务（标题、进度叙述）。当 `agents.defaults.utilityModel` 未设置且该 provider 提供代理的主模型时使用。 |
| `models`              | `object[]`               | 必需的模型行。没有 `id` 的行会被忽略。                                                                                                                                                            |

清单不提出建议。目录 v2 从 [ 精选推荐模型列表 ](/concepts/recommended-models) 中派生出每个提供商的 `recommendedModels`。仍将 `recommendedModels` 负载设置不变的清单；该字段被忽略。

目录生成器选择使用 `--out <v1-file> --out-v2 <v2-file>` 进行本地配对输出。它会验证两个包并在替换任一输出之前准备候选字节和先前文件备份。配对的目标必须解析为不同的常规文件或不存在的目标。输出符号链接和目录别名在准备之前解析；发布替换其真正父级中的每个目标，并保持输出符号链接完好无损。如果目标父级存在，则悬空输出符号链接会创建其目标。在替换任一输出之前，缺少目标父级和符号链接循环会失败。仅 v1 的编写器未更改。

每个文件都单独替换：这是 **not** 多文件原子事务。使用单个发布者，并且在命令成功之前不要提供或部署该对。如果发布失败或过程在替换之间停止，请检查两个输出旁边的 `.catalog-pair-*` 目录。每个包含 `next.json`、`previous.json`（当输出存在时）以及 `RECOVERY.txt` 映射目标和恢复目录。停止竞争编写器，将当前输出与这些工件进行比较，并在重试之前显式恢复或完成该对。没有自动回滚或重播可以覆盖其他编写者的替换。不支持并发发布者和私人恢复文件的替换；该协议不保证断电耐久性。成功发布后，清理失败会发出保留路径警告，但不会将该对报告为未发布。

Model 字段：

| 字段                  | 类型                                                           | 含义                                                                        |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `id`                   | `string`                                                       | Provider 本地模型 id，不包含 `provider/` 前缀。                             |
| `name`                 | `string`                                                       | 可选的显示名称。                                                               |
| `api`                  | `ModelApi`                                                     | 可选的每个模型的 API 覆盖值。                                                     |
| `baseUrl`              | `string`                                                       | 可选的每个模型的 base URL 覆盖值。                                                |
| `headers`              | `Record<string, string>`                                       | 可选的每个模型的静态请求头。                                                   |
| `input`                | `Array<"text" \| "image" \| "video" \| "document">`            | 模型接受的模态类型。其他值会被静默丢弃。                     |
| `reasoning`            | `boolean`                                                      | 模型是否提供推理能力。                                        |
| `contextWindow`        | `number`                                                       | Provider 原生上下文窗口。                                                      |
| `contextWindows`       | `Array<{ id: string; label: string; contextWindow: number }>`  | 最多 16 个可选窗口，按令牌计数升序排列。              |
| `contextWindowDefault` | `string`                                                       | 默认可选窗口 ID；必须在 `contextWindows` 中命名一个条目。                |
| `contextTokens`        | `number`                                                       | 可选的有效运行时上下文上限，当其不同于 `contextWindow` 时使用。          |
| `maxTokens`            | `number`                                                       | 已知时的最大输出 token 数。                                                    |
| `thinkingLevelMap`     | `Record<string, string \| null>`                               | 可选的、针对每个思考级别的模型 id 或参数覆盖值。                             |
| `cost`                 | `object`                                                       | 可选的 USD 每百万代币定价，包括可选的 `tieredPricing`。          |
| `compat`               | `object`                                                       | 可选的兼容性标志，与 OpenClaw 模型配置兼容性相匹配。           |
| `upstreamModel`        | `string`                                                       | 可选的 `provider/model` 引用，指向另一个捆绑 catalog 中同一上游模型。 |
| `mediaInput`           | `object`                                                       | 可选的每种模式输入配置。 `image` 是唯一的模式。                    |
| `status`               | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列出状态。仅当该行完全不应出现时才进行抑制。                   |
| `statusReason`         | `string`                                                       | 可选的、随非可用状态显示的原因。                                     |
| `replaces`             | `string[]`                                                     | 该模型所取代的较旧 provider 本地模型 id。                                |
| `replacedBy`           | `string`                                                       | 已弃用行的替代 provider 本地模型 id。                             |
| `tags`                 | `string[]`                                                     | 选择器和过滤器使用的稳定标签。                                             |

抑制字段：

| 字段                      | 类型       | 含义                                                                                                                                              |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`   | 要抑制的上游行的 provider id。必须由该插件拥有，或声明为指向已拥有别名。                                                  |
| `model`                    | `string`   | 要抑制的 provider 本地 model id。                                                                                                                       |
| `reason`                   | `string`   | 当直接请求被抑制的行时显示的可选消息。                                                                                      |
| `retirement`               | `object`   | 明确的永久退休元数据。实现医生修复；空对象意味着没有声明后继者。                                             |
| `retirement.replacedBy`    | `string`   | 记录的提供商本地后继模型 ID，包括该 ID 中的任何斜杠。 Doctor 保留适用的帐户密码并修复持久的引用。 |
| `when.baseUrlHosts`        | `string[]` | 应用该 suppression 之前所需的有效 provider base URL host 列表（可选）。                                                                |
| `when.providerConfigApiIn` | `string[]` | 应用该 suppression 之前所需的精确 provider-config `api` 值列表（可选）。                                                               |

仅根据肯定的提供者证据来声明停用，而绝不能根据失败或空的发现请求来声明停用。范围帐户路由报废为 `when.baseUrlHosts`；匹配这些规则需要一个具体的选定端点，并且保持同级端点不变。无条件退休规则不需要凭证。格式错误或空的退休范围会被忽略，而不是成为全局规则。运行时阻止退休的路由，而 [`openclaw doctor --fix`](/cli/doctor) 拥有持久替换或覆盖删除。普通抑制和模型行的 `deprecated` 列表状态不授权报废修复。清单更改在网关重新启动或所属元数据重新加载后生效。

`upstreamModel` 将提供相同上游模型的行标记为另一个捆绑目录中具有不同名称的行，例如供应商的 API 端点旁边的订阅端点。它正在编写元数据：规范化会删除它，合同测试使用它来防止 `compat.codeMode` 等功能标志在发布相同模型的目录之间漂移。大多数行不需要标记，因为匹配会忽略领先的供应商命名空间和大小写：`moonshotai/kimi-k3` 和 `zai-org/GLM-5.2` 已与第一方 `kimi-k3` 和 `glm-5.2` 行匹配。仅当供应商自己的名称确实不同时，才可获取 `upstreamModel`。参见[代码模式](/tools/code-mode/configuration#models-shipped-by-more-than-one-provider)。

不要将仅运行时数据放入 `modelCatalog`。仅当清单行足够完整以供提供者筛选的列表和选择器表面跳过 registry/runtime 发现时，才使用 `static`。当清单行是有用的可列出种子或补充但 refresh/cache 可以稍后添加更多行时，请使用 `refreshable`；可刷新的行本身并不具有权威性。当 OpenClaw 必须加载提供程序运行时才能了解列表时，请使用 `runtime`。

提供者获得凭据后，列表和选择器表面会显示其声明的清单行，而在每种发现模式下，帐户发现仍处于待定状态。一旦该提供商的发现发布，其帐户结果就会取代它们。

目录刷新计划将手动根声明与生成的提供者清单分开。拥有同一提供商 ID 的插件不会将手动模型转换为一次性缓存数据。合并模式保留这些声明和仅授权记录；显式替换模式保留其替换合同。生成的目录仍然遵循当前所有权、端点资格和权威替换规则。

使用 `activation.onStartup: false` 的插件生成的缓存读取需要对该目录中至少一个当前拥有的、符合端点资格的提供程序进行当前身份验证。运行时读取器使用捕获的身份验证或提供程序配置中的可用密钥；保留的目录无法验证自身。显式创作的行保持独立。此成员资格规则不会删除存储的数据或授予请求权限。

功能属于声明的 API 和基础 URL，而不仅仅是 provider/model id。当模型列表丰富缓存行时，它仅将清单功能用于匹配的路由；自定义端点必须提供自己的限制和功能。

## <a id="modelidnormalization-reference"></a> modelIdNormalization 参考

使用 `modelIdNormalization` 进行廉价的提供者拥有的模型 ID 清理，该清理必须在提供者运行时加载之前进行。这会将别名（例如短模型名称、提供者本地旧 ID 和代理前缀规则）保留在所属插件清单中，而不是保留在核心模型选择表中。

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

| 字段                                | 类型                    | 含义                                                                             |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不区分大小写的精确模型 ID 别名。值按书面形式返回。                  |
| `stripPrefixes`                      | `string[]`              | 在别名查找之前删除的前缀，对于旧版 provider/model 复制很有用。     |
| `prefixWhenBare`                     | `string`                | 当规范化模型 ID 尚未包含 `/` 时要添加的前缀。                  |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 别名查找后的条件裸 ID 前缀规则，由 `modelPrefix` 和 `prefix` 键入。 |

## <a id="modelpricing-reference"></a> modelPricing 参考

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
          "provider": "openrouter"
        },
        "modelsDev": false,
        "liteLLM": false
      }
    }
  }
}
```

提供方字段：

| 字段        | 类型              | 含义                                                                                   |
| ------------ | ----------------- | ----------------------------------------------------------------------------------------------- |
| `cerebras`   | `false \| object` | 显式映射到公共 Cerebras `/public/v1/models` 目录。从未隐式启用。  |
| `chutes`     | `false \| object` | 显式映射到公共 Chutes `/v1/models` 目录。从未隐式启用。           |
| `deepinfra`  | `false \| object` | 显式映射到公共 DeepInfra `/models/list` 目录。从未隐式启用。      |
| `external`   | `boolean`         | 为 local/self-hosted 提供商设置 `false`，这些提供商永远不应使用已发布的外部定价。   |
| `openCode`   | `false \| object` | 显式映射到公共 `models.opencode.ai/api.json` 目录。从未隐式启用。 |
| `modelsDev`  | `false \| object` | models.dev 对请求进行计费的提供商的价格表。默认启用。              |
| `openRouter` | `false \| object` | OpenRouter自己的价格。他们只定价 `openrouter/*` 密钥，而不是供应商的模型。          |
| `liteLLM`    | `false \| object` | LiteLLM 发布键映射。`false` 会禁用此提供方的 LiteLLM 匹配。           |
| `venice`     | `false \| object` | 显式映射到公共 Venice `/api/v1/models` 目录。从未隐式启用。       |

来源字段：

| 字段                      | 类型               | 含义                                                                                                        |
| -------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 当外部目录提供程序 ID 与 OpenClaw 提供程序 ID 不同时，例如 `z-ai` 表示 `zai` 提供程序。 |
| `passthroughProviderModel` | `boolean`          | 对于计费的网关，将包含斜线的模型 ID 视为按供应商费率定价的 `vendor/model` 参考。      |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录 model-id 变体。`version-dots` 会尝试带点的版本 id，例如 `claude-opus-4.6`。            |

价格来自于为请求开具账单的人。声明的提供者策略仅启用其声明的源映射。如果没有策略，发布将尝试提供者的 models.dev 条目，然后是 LiteLLM。 models.dev 条目是由 `modelCatalog.modelsDev` 或 `modelsDev.provider` 命名的条目，否则为 OpenClaw 提供者 ID。 OpenRouter 的 Feed 描述了 OpenRouter 的账单，包括其促销活动，因此它仅对 OpenRouter 航线进行定价。

具有 `passthroughProviderModel` 的网关在清单命名时首先使用自己的价格表，例如 `kilo` 或 `vercel` models.dev 条目。如果没有命名列表，网关将按供应商的费率计费：供应商自己的目录行，然后是供应商的独立价格。

每个选定的价格都是一个完整的时间表：基本费率和上下文层永远不会跨来源组合。支持 OpenRouter 的本机提示长度覆盖；基于时间的覆盖不表示为静态上下文层。

对于权威的本机源映射，请使用：

```json
{
  "providers": ["opencode", "venice"],
  "modelPricing": {
    "providers": {
      "opencode": { "openCode": { "provider": "opencode" } },
      "venice": { "venice": { "provider": "venice" } }
    }
  }
}
```

仅当声明其源时，发布者才在没有凭据的情况下获取固定的公共端点，并且仅在显式映射的所有者命名空间中发布本机价格。 Cerebras、Chutes 和 DeepInfra 使用相同的形状及其各自的源 ID 和提供商 ID。轻量级插件拥有的 `pricing-api.ts` 工件与运行时发现共享有效负载解析，而无需导入提供程序运行时。

DeepInfra 的顶级数组使用 `model_name` 标识。其数字折扣和缓存输入比率适用于每个代币的原生美分价格。定价散文、非空表、计划的到期时间和未记录的通用缓存写入速率均经过验证，但作为不受支持的计划而被忽略。 Priority/flex 和显式缓存保留乘数不会改变标准成本。它的代理投影继续拥有运行时元数据；定价源不会发现聊天模型。

选择加入的本地来源拥有完整的提供商时间表，包括缺失的价格：通用来源无法填补其空白。捆绑模型的成功且无价格的提要会保留该模型的元数据，忽略其成本，并发出发布警告。缺少定价并不能证明该模型已退役或免费使用。明确的本地零价格仍然是未知的估计。获取失败、响应机构或声明价格格式错误以及没有可用价格的提要会停止发布，从而使之前托管的目录保持完整。显式运营商费率保持不变。此创作元数据不添加任何操作员设置，并且不会更改网关的现有刷新和重新启动生命周期。

### <a id="openclaw-provider-index"></a> OpenClaw 提供方索引

编制的 OpenClaw 提供商指数已停用。模型元数据来自插件清单、提供商拥有的发现和托管模型目录，并通过模型解析应用配置的覆盖。有关目录源和刷新行为，请参阅 [ 模型列表](/cli/models#list)。

提供程序设置使用已安装的清单元数据和官方外部插件目录。外部目录为未安装的插件提供安装提示和授权选择标签；安装的插件所有者优先。安装提示保留在 `package.json#openclaw.install` 中，而不是单独编译的提供程序索引中。

`openclaw doctor --fix` 会将一小组封闭的旧版顶层清单能力键迁移到 `contracts.*` 中：`speechProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders` 和 `tools`。这些内容（以及任何其他能力列表）不再作为顶层清单字段读取；正常的清单加载只会在 `contracts` 下识别它们。
