---
summary: "清单功能所有权、工具可用性元数据和激活计划"
read_when:
  - "您正在声明您的插件拥有哪些功能"
  - "您希望核心跳过导入运行时来查找工具"
  - "当激活规划器加载您的插件时，您正在调整"
title: "清单能力字段"
sidebarTitle: "能力领域"
---

声明插件拥有什么以及激活规划器何时加载它的清单字段。 [插件清单](/plugins/manifest)参考的一部分； [ 顶级字段引用 ](/plugins/manifest#top-level-field-reference) 列出了每个字段。

## <a id="contracts-reference"></a> contracts 参考

仅将 `contracts` 用于静态能力所有权元数据，OpenClaw 可以在不导入插件运行时的情况下读取这些元数据。

`contracts.codeModeExecutors` 声明由插件的 `code-mode-executor-api` 公共工件提供的受支持执行器。插件目前实现`quickjs`；另一个可选执行器 `node` 归 core 所有。该插件的安装 ID 与该执行程序 ID 是分开的。选择 QuickJS 仅加载其承认的所有者。当插件被全局禁用或允许列表命名其他插件时，选定的捆绑执行器仍然可用，从而保留其以前的核心运行时可用性。明确的所有者拒绝或禁用条目仍然会阻止选择；外部执行器遵循完整的插件策略。该工件使用 `openclaw/plugin-sdk/code-mode-executor-runtime` 合约导出 `codeModeExecutor`。它不注册模型工具或替换主机工具授权。请参阅 [ 代码模式执行器](/tools/code-mode/executors)。

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["openclaw", "codex"],
    "trustedToolPolicies": ["workflow-budget"],
    "externalAuthProviders": ["acme-ai"],
    "embeddingProviders": ["openai-compatible"],
    "decisionProviders": ["example-decisions"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "musicGenerationProviders": ["stability-audio"],
    "documentExtractors": ["example-docs"],
    "webContentExtractors": ["firecrawl"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "workerProviders": ["example-worker"],
    "storageProviders": ["example-storage"],
    "usageProviders": ["acme-ai"],
    "migrationProviders": ["hermes"],
    "gatewayMethodDispatch": ["authenticated-request"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的。对于 `speechProviders` 和 `realtimeVoiceProviders`，首先列出主要提供商 ID，然后列出该功能范围内的任何别名：

| 字段                            | 类型       | 含义                                                                                                                        |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `embeddedExtensionFactories`     | `string[]` | Codex 应用程序服务器扩展工厂 ID。 `codex-app-server` 是唯一接受的 ID。                                                  |
| `agentToolResultMiddleware`      | `string[]` | 该插件可以为其注册工具结果中间件的运行时 ID。                                                                     |
| `trustedToolPolicies`            | `string[]` | 已安装插件可以注册的插件本地可信预工具策略 ID。捆绑插件可以在没有此字段的情况下注册策略。 |
| `externalAuthProviders`          | `string[]` | 其外部身份验证配置文件挂钩此插件拥有的提供商 ID。                                                                      |
| `embeddingProviders`             | `string[]` | 该插件拥有的通用嵌入提供程序 ID，用于可重用向量嵌入使用，包括内存。                                 |
| `decisionProviders`              | `string[]` | 注册为 `api.registerDecisionProvider` 的类型化决策提供者；通过 `decisionModel` 选择。                           |
| `speechProviders`                | `string[]` | 该插件拥有的语音提供者 ID。                                                                                                |
| `realtimeTranscriptionProviders` | `string[]` | 该插件拥有的实时转录提供商 ID。                                                                                |
| `realtimeVoiceProviders`         | `string[]` | 该插件拥有的实时语音提供商 ID。                                                                                        |
| `mediaUnderstandingProviders`    | `string[]` | 该插件拥有的媒体理解提供者 ID。                                                                                   |
| `transcriptSourceProviders`      | `string[]` | 该插件拥有的转录源提供者 ID。                                                                                     |
| `documentExtractors`             | `string[]` | 该插件拥有的文档（例如 PDF）提取器提供者 ID。                                                                  |
| `imageGenerationProviders`       | `string[]` | 该插件拥有的图像生成提供商 id。                                                                                      |
| `videoGenerationProviders`       | `string[]` | 该插件拥有的视频生成提供商 id。                                                                                      |
| `musicGenerationProviders`       | `string[]` | 该插件拥有的音乐生成提供商 id。                                                                                      |
| `webContentExtractors`           | `string[]` | 该插件拥有的网页内容提取提供商 ID。                                                                           |
| `webFetchProviders`              | `string[]` | 该插件拥有的 Web-fetch 提供者 ID。                                                                                             |
| `webSearchProviders`             | `string[]` | 该插件拥有的网络搜索提供商 ID。                                                                                            |
| `workerProviders`                | `string[]` | 云工作者提供商 ID 该插件拥有用于配置和配置文件支持的租赁生命周期。                                      |
| `workerProfileSuggestions`       | `string[]` | 具有轻量级 [ 配置文件建议工件 ](/plugins/manifest#cloud-worker-profile-suggestions) 的工作程序提供者 ID。            |
| `storageProviders`               | `string[]` | 使用 `api.registerStorageProvider` 注册的存储传输 ID；按指定存储位置选择。                            |
| `usageProviders`                 | `string[]` | 其usage-auth 和usage-snapshot 挂钩此插件拥有的提供者ID。                                                             |
| `migrationProviders`             | `string[]` | 导入此插件拥有的 [`openclaw migrate`](/cli/migrate) 提供程序 ID。                                                         |
| `gatewayMethodDispatch`          | `string[]` | 供已认证插件 HTTP 路由使用的保留权限，这些路由在进程内分发 Gateway 方法。                                  |
| `tools`                          | `string[]` | 此插件拥有的代理工具名称。                                                                                                   |

文档提取器可以返回可选的完整性元数据及其文本和图像。 `pages.processed`是实际处理的从1开始的页面的有界列表； `pages.total` 是文档页数； `pages.selection` 区分自动限制和显式请求； `pages.truncated`、`textTruncated` 和 `imagesTruncated` 报告已知遗漏。 `maxPages`为计数帽；自动页面选择仍然由提取器拥有，而 `pageNumbers` 限制显式选择。当提取者无法证实这些事实时，省略 `metadata`；不要推断下游的完整性。

`contracts.embeddedExtensionFactories` 保留用于捆绑 Codex 仅应用程序服务器扩展工厂。捆绑的工具结果转换应声明 `contracts.agentToolResultMiddleware` 并注册为 `api.registerAgentToolResultMiddleware(...)`。仅当显式启用且仅适用于它们在 `contracts.agentToolResultMiddleware` 中声明的运行时时，安装的插件才可以使用相同的中间件接口。

需要主机信任的预工具策略层的已安装插件必须在 `contracts.trustedToolPolicies` 中声明每个注册的本地 ID 并显式启用。捆绑的插件保留现有的可信策略路径，但具有未声明的策略 ID 的已安装插件在注册之前会被拒绝。策略 ID 的范围仅限于注册插件，因此两个插件可以同时声明和注册 `workflow-budget`；单个插件不能两次注册相同的本地 ID。

运行时的 `api.registerTool(...)` 注册必须与 `contracts.tools` 匹配。工具发现会使用此列表，仅加载能够拥有所请求工具的插件运行时。

实现 `resolveExternalAuthProfiles` 的提供方插件应声明 `contracts.externalAuthProviders`；未声明的外部认证钩子会被忽略。

同时实现 `resolveUsageAuth` 和 `fetchUsageSnapshot` 的提供商插件应在 `contracts.usageProviders` 中声明每个自动发现的提供商 ID。使用发现在加载运行时代码之前读取此协定，然后在仅加载声明的所有者后验证两个挂钩。

嵌入提供程序必须为每个注册到 `api.registerEmbeddingProvider(...)` 的适配器声明 `contracts.embeddingProviders`。相同的通用合约服务于可重用的向量生成和内存搜索。不再接受已退役的 `contracts.memoryEmbeddingProviders` 密钥。

存储提供者必须在 `contracts.storageProviders` 中声明每个 `api.registerStorageProvider(...)` id。核心储备`filesystem`。 `storage.locations` 中的配置引用通过此声明自动启用捆绑所有者；显式禁用和拒绝规则仍然适用。外部提供商需要明确的插件启用。请参阅 [ 存储提供商合同 ](/plugins/sdk-overview/capabilities#storage-providers)。

Worker 提供者必须在 `contracts.workerProviders` 中声明每个 `api.registerWorkerProvider(...)` id。注册需要 `resolveAllocation`、`provision`、`inspect` 和 `destroy`。分配解析器返回准确的操作清理句柄和显式的共享主机事实，而无需创建或准备机器；请参阅 [worker 提供者合同 ](/plugins/sdk-overview/capabilities#worker-providers)。核心在调用 `provision` 之前保持持久意图；提供者在外部分配之前验证其设置和可选的每次调度 `machineClass` 和 `executionMode`，并且具有相同操作 id 的重复调用必须采用相同的租约而不更改所选模式。提供者可以实现异步 `listMachineOptions(profile)` 以公开进程稳定的选择器元数据；当机器选择没有意义时可以忽略它。机器选项仅包含 `id`、`label`、可选正整数 `cpu` 和 `memoryGb` 以及可选 `default`。会话放置提供程序声明一个封闭、唯一、固定顺序的 `supportedExecutionModes` 元组：`["worker-turn"]`、`["remote-exec"]` 或 `["worker-turn", "remote-exec"]`。空列表、重复项、未知值和无法识别的订单将被拒绝。 `worker-turn` 需要节点租用； `remote-exec` 接受节点租赁或 SSH 租赁。省略不宣传任何会话放置模式，同时保留直接的生命周期操作可用。直接环境创建不提供会话执行模式；提供商使用其记录的默认值，即 Crabbox 的 `worker-turn`。有限配置超过核心五分钟默认值的提供商可以实施 `resolveProvisionTimeoutMs(profile)`，并在返回的正毫秒预算中包括获取、提供商拥有的设置和清理。可选的 `resolveDestroyTimeoutMs(profile)` 为请求的拆卸和引导失败清理提供同等的预算，包括确认发布之前的快照捕获。两个钩子都必须在平台计时器限制内返回正安全整数；显式服务超时覆盖优先。 Core 还保留已验证的设置快照，并将其与 `leaseId` 一起传递到 `inspect({ leaseId, profile })` 和 `destroy({ leaseId, profile })`，包括在更改或删除指定配置文件之后。重复销毁是安全的，检查返回封闭的 `active` / `dormant` / `destroyed` / `unknown` 状态联合，并且 SSH 私钥材料只能通过 `SecretRef` 引用。配置的 SSH 端点还必须包含来自可信配置输出的公共 `hostKey`，与 `algorithm base64` 完全相同，没有主机名或注释，以便核心可以在连接之前固定主机。它们可能包括最多 10 个有序的、唯一的 `fallbackPorts`，不包括主 `port`； core 保留这些候选者并在它们之间轮换，仅用于检查安全重复、内容寻址传输、receipt/lock-guarded 工件安装、聚合托管工作树镜像和隧道重新连接。不明确的不受保护的状态命令会被拒绝，并且不会在候选者之间重播。当 SSH 帐户还拥有不相关进程时，租约可能会设置 `sharedHost: true`；然后，core 会在工作区协调期间避免主机范围内的进程冻结。省略或`false`表示专用工作主机。主动检查重复了这一事实，因此核心可以协调提供商拥有的隔离，以在该字段存在之前持续存在租赁；隧道启动等待第一次权威检验。可选的桌面元数据可以通告最多八个唯一的关闭应用程序：带有绝对值 `executablePath` 的 `browser` 和从 1 到 65535 的 CDP 端口，或带有绝对值 `executablePath` 的 `terminal`。 Core 拒绝未知的应用程序 ID 和字段，并将经过验证的元数据与现有桌面记录一起保存。铸造动态身份参考的提供商可以实施权威的 `resolveSshIdentity({ leaseId, profile, keyRef })`；没有它的提供商使用核心的通用秘密解析器。权威`unknown`围栏环境，进入正常拆机；它不会绕过共享或未知主机上所需的确切工作停止确认。

`contracts.gatewayMethodDispatch` 接受单个值 `"authenticated-request"`。它是一个 API 卫生门，用于经过身份验证的本机插件 HTTP 路由和注册的 RPC 处理程序，有意在进程中分派网关方法，而不是针对恶意本机插件的沙箱。 Dispatch 保留原始的经过身份验证的客户端和配置文件，应用目标方法的范围，并且从不创建合成调用者。仅将其用于经过严格审查的表面。 RPC 处理人员仍通过普通网关准入；该合同没有增加暂停旁路。仅当授权路由还声明了 `auth: "gateway"` 和特定于路由的 `gatewayRuntimeScopeSurface: "trusted-operator"` 时，授权路由仍可访问，而网关根工作准入关闭；来自同一插件的普通同级路由保留在准入边界后面。这可以保持暂停状态和恢复可达，而无需授予整个插件准入旁路。保持解析和响应整形限制在调度之外；实质性或变更工作必须经过 Gateway 方法调度，Gateway 方法调度拥有准入和范围执行权。

当工作人员提供商的桌面端点可以安全地调整大小（例如专用虚拟显示器）时，可以设置 `allowsDesktopResize: true`。遗漏或`false`不授予许可。端点可以使用 `allowsResize: false` 进一步限制此提供商范围的权限，例如本机显示。 Core 在 SSH 和节点传输的桌面观察结果中将此事实作为可选的 `canResize` 进行携带。这是请求调整大小的权限，而不是协商的 VNC 支持。在请求调整大小之前，查看器还必须保持控制并完成身份验证。

## <a id="decision-models-reference"></a> 决策模型参考

将 `decisionModels` 声明为 `contracts.decisionProviders` 拥有的提供者的静态选择器元数据。这些条目与会话 `modelCatalog` 和 `providers` 元数据分开。 Discovery 会读取清单，而无需加载提供程序运行时或解析凭据。

```json
{
  "contracts": { "decisionProviders": ["example-decisions"] },
  "decisionModels": [
    {
      "provider": "example-decisions",
      "id": "fast",
      "name": "Fast decisions",
      "capabilities": {
        "questionTypes": ["boolean", "choice", "score"],
        "maxQuestions": 32,
        "maxChoiceAlternatives": 64,
        "maxScoreLevels": 16,
        "maxInputTokens": 8192,
        "inputTokenScope": "encoded-question",
        "requiresBooleanCriteria": true,
        "confidence": "provider-specific"
      }
    }
  ]
}
```

每个条目都需要提供者 ID、模型 ID 和显示名称。选择器使用 `example-decisions/fast`。禁用的插件被排除在决策选择器之外；保存的不可用选择仍然可见，可供操作员修复。

`capabilities` 是可选的静态元数据。它描述了提供商对发现和指导的支持；它并不证明凭证或运行时已准备就绪，并且其限制不会提高 OpenClaw 的主机准入界限。

| 字段                     | 必需的 | 接受值                                                             | 省略语义                                                                                        |
| ------------------------- | -------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `questionTypes`           | 是      | 非空数组，最多包含 `boolean`、`choice` 和 `score` 中的三个 | 当该字段不存在或无效时，整个 `capabilities` 对象将被省略；重复项被删除。 |
| `maxQuestions`            | No       | 正安全整数                                                      | 没有公布特定于提供商的问题限制。                                                        |
| `maxChoiceAlternatives`   | No       | 正安全整数                                                      | 没有公布特定于提供商的选择替代限制。                                              |
| `maxScoreLevels`          | No       | 正安全整数                                                      | 没有公布特定于提供商的分数级别限制。                                                     |
| `maxInputTokens`          | No       | 正安全整数                                                      | 没有公布特定于提供商的输入令牌限制。                                                     |
| `inputTokenScope`         | No       | `encoded-question` or `state-plus-each-criterion`                          | 提供商未声明 `maxInputTokens` 的计算方式。                                          |
| `requiresBooleanCriteria` | No       | 布尔值                                                                    | 没有公布额外的布尔标准要求。                                                      |
| `confidence`              | No       | `provider-specific` or `none`                                              | 没有公布置信度结果语义。                                                              |

`encoded-question` 表示提供者对其编码请求进行计数，包括提供者添加的标题开销。 `state-plus-each-criterion` 表示每个标准评估都计算共享状态。 `provider-specific` 置信度是一个提供者指标，而不是答案正确的校准概率； `none` 声明提供者不返回信任。

格式错误的可选字段和未知字段将被单独忽略。格式错误的 `questionTypes` 值会删除整个功能描述符，但不会删除模型条目。重复的 `provider/id` 条目保留第一个有效的模型描述符。

## <a id="tool-metadata-reference"></a> 工具元数据参考

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
      "profiles": ["coding", "full"],
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

`toolMetadata` 条目还接受：

- `profiles`：默认公开插件工具的内置工具配置文件。有效值为 `minimal`、`coding`、`messaging` 和 `full`。这些贡献合并到相应的配置文件白名单中；明确的运营商允许列表和拒绝规则仍然具有权威性。
- `optional`：将该工具标记为插件激活不需要的。
- `replaySafe`：将工具执行标记为在不完整的模型转动后可以安全地重复。
- `sideEffecting`：将执行标记为可能更改持久状态或外部状态。

这些字段补充了上面共享的 `configSignals` 和 `authSignals` 字段。

如果某个工具没有 `toolMetadata`，当工具契约与策略匹配时，OpenClaw 会保留现有行为并加载所属插件。对于其工厂依赖 auth/config 的热点路径工具，插件作者应声明 `toolMetadata`，而不是让 core 导入运行时去询问。

## <a id="activation-reference"></a> activation 参考

当插件可以便宜地声明哪些控制平面事件应将其包含在 activation/load 计划中时，请使用 `activation`。

这个块是规划器元数据，不是生命周期 API。它不会注册运行时行为，不会替代 `register(...)`，也不保证插件代码已经执行。激活规划器会使用这些字段来缩小候选插件范围，然后再回退到现有的 manifest 归属元数据，例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks。

更喜欢已经描述所有权的最窄元数据。当这些字段表示关系时，请使用 `providers`、`channels`、`commandAliases`、设置描述符或 `contracts`。使用 `activation` 获取这些所有权字段无法表示的额外规划器提示。对 CLI 运行时别名使用顶级 `cliBackends`，例如 `claude-cli`、`my-cli` 或 `google-gemini-cli`； `activation.onAgentHarnesses` 仅适用于尚未具有所有权字段的嵌入式代理harness ID。

每个插件都应该有意设置 `activation.onStartup`。仅当插件必须在网关启动期间运行时，才将其设置为 `true`。当插件在启动时处于惰性状态并且应该仅从较窄的触发器加载时，将其设置为 `false`。省略 `onStartup` 不再隐式启动加载插件；对启动、通道、配置、代理harness、内存或其他较窄的激活触发器使用显式激活元数据。 `plugins.load.paths` 中列出的无清单独立文件没有清单来声明这一点，并在启用后像 `onStartup: true` 一样启动。

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

| 字段              | 必需的 | 类型                                                 | 含义                                                                                                                                                                               |
| ------------------ | -------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onStartup`        | No       | `boolean`                                            | 显式的 Gateway 启动激活。每个插件都应设置此项。`true` 会在启动期间导入插件；`false` 会保持启动时惰性加载，除非其他匹配的触发器要求加载。 |
| `onProviders`      | No       | `string[]`                                           | 应在 activation/load 计划中包含此插件的提供商 ID。                                                                                                                      |
| `onAgentHarnesses` | No       | `string[]`                                           | 嵌入式代理利用运行时 ID，应在 activation/load 计划中包含此插件。使用顶级 `cliBackends` 作为 CLI 后端别名。                                           |
| `onCommands`       | No       | `string[]`                                           | 应在 activation/load 计划中包含此插件的命令 ID。                                                                                                                       |
| `onChannels`       | No       | `string[]`                                           | 应在 activation/load 计划中包含此插件的频道 ID。                                                                                                                       |
| `onRoutes`         | No       | `string[]`                                           | 应在 activation/load 计划中包含此插件的路由类型。                                                                                                                       |
| `onConfigPaths`    | No       | `string[]`                                           | 当路径存在且未明确禁用时，根相对配置路径应在 startup/load 计划中包含此插件。                                                      |
| `onCapabilities`   | No       | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面激活规划使用的宽泛能力提示。尽可能优先使用更窄的字段。                                                                                     |

激活计划消费者：

- Gateway 启动规划使用 `activation.onStartup` 进行显式启动导入。
- 命令触发的 CLI 规划会回退到旧版 `commandAliases[].cliCommand` 或 `commandAliases[].name`。
- Agent runtime 启动规划对嵌入式 harness 使用 `activation.onAgentHarnesses`，对 CLI runtime 别名使用顶层 `cliBackends[]`。
- 当显式通道激活元数据丢失时， 通道触发的 setup/channel 规划将回退到旧版 `channels[]` 所有权。
- 启动插件规划对非 channel 的根配置界面使用 `activation.onConfigPaths`，例如内置 browser 插件的 `browser` 块。
- 当显式提供程序激活元数据丢失时， 提供程序触发的 setup/runtime 规划将回退到旧版 `providers[]` 和顶级 `cliBackends[]` 所有权。

规划器诊断可以区分显式激活提示和明显所有权回退。例如，`activation-command-hint` 表示 `activation.onCommands` 匹配，而 `manifest-command-alias` 表示规划者改用 `commandAliases` 所有权。这些原因标签用于主机诊断和测试；插件作者应该不断声明最能描述所有权的元数据。 [load pipeline](/plugins/architecture-internals/load-pipeline) 参考对于规划器缩小步骤和完整的原因标签表具有权威性。
