---
summary: "插件架构内部：加载流水线、注册表、运行时钩子、HTTP 路由和参考表"
read_when:
  - 实现提供者运行时钩子、通道生命周期或包集合时
  - 调试插件加载顺序或注册表状态时
  - 添加新的插件能力或上下文引擎插件时
title: "插件架构内部"
---

有关公开能力模型、插件形态以及所有权/执行约定，请参见 [插件架构](/plugins/architecture)。本页介绍内部机制：加载流水线、注册表、运行时钩子、Gateway HTTP 路由、导入路径和 schema 表。

## 加载流水线

在启动时，OpenClaw 大致会执行以下步骤：

1. 发现候选插件根目录
2. 读取原生或兼容捆绑清单以及包元数据
3. 拒绝不安全的候选项
4. 规范化插件配置（`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`）
5. 为每个候选项决定是否启用
6. 加载已启用的原生模块：已构建的捆绑模块使用原生加载器；
   第三方本地源码 TypeScript 使用紧急 Jiti 回退
7. 调用原生 `register(api)` 钩子，并将注册内容收集到插件注册表中
8. 将注册表暴露给命令/运行时界面

Safety gates run **before** runtime execution. Discovery blocks a candidate
when:

- 其解析后的入口逃逸出了插件根目录
- 其路径（或其根目录）是全局可写的
- 对于非捆绑插件，其路径所有权与当前 uid（或 root）不匹配

全局可写的捆绑目录会先尝试就地 `chmod` 修复（npm/全局安装可能会以 `0777` 提供包目录），然后安全门才会重新检查；所有权检查对捆绑来源会完全跳过。

当已知插件 id 时，被阻止的候选项在发出的诊断信息中仍会携带该 id（包括从一个在其他方面被拒绝的目录中的清单解析出的 id），因此引用该 id 的配置会看到一个与路径安全警告绑定的已阻止插件，而不是无关的“未知插件”错误。

### 清单优先行为

清单是控制面的事实来源。OpenClaw 使用它来：

- 识别插件
- 发现声明的通道/技能/配置模式或 bundle 能力
- 验证 `plugins.entries.<id>.config`
- 增强 Control UI 标签/占位符
- 展示安装/目录元数据
- 在不加载插件运行时的情况下保留廉价的激活和设置描述符

对于原生插件，运行时模块是数据面部分。它负责注册实际行为，例如钩子、工具、命令或提供者流程。

可选的清单 `activation` 和 `setup` 块仍然留在控制面。它们是用于激活规划和设置发现的纯元数据描述符；它们不会替代运行时注册、`register(...)` 或 `setupEntry`。实时激活消费者会使用清单中的命令、通道和提供者提示，在更大范围的注册表物化之前缩小插件加载范围：

- CLI 加载会缩小到拥有所请求主命令的插件
- 通道设置/插件解析会缩小到拥有所请求通道 id 的插件
- 显式提供者设置/运行时解析会缩小到拥有所请求提供者 id 的插件
- Gateway 启动规划会对显式启动导入使用 `activation.onStartup`；没有启动元数据的插件只会通过更窄的激活触发器加载

激活规划器同时为现有调用方提供仅 ids 的 API，以及用于诊断的 plan API。计划条目会报告插件被选中的原因，将显式的 `activation.*` 提示与清单所有权回退区分开来：

| 原因（来自 `activation.*` 提示）   | 原因（来自清单所有权）                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `activation-agent-harness-hint`      | —                                                                                     |
| `activation-capability-hint`        | —                                                                                     |
| `activation-channel-hint`          | `manifest-channel-owner`（`channels`）                                                |
| `activation-command-hint`          | `manifest-command-alias`（`commandAliases`）                                          |
| `activation-provider-hint`         | `manifest-provider-owner`（`providers`）、`manifest-setup-provider-owner`（`setup.providers`） |
| `activation-route-hint`            | —                                                                                     |
| —（hook 触发没有 hint 变体）        | `manifest-hook-owner`（`hooks`）、`manifest-tool-contract`（`contracts.tools`）       |

这种原因拆分就是兼容边界：现有插件元数据继续可用，而新代码可以在不改变运行时加载语义的情况下检测更宽泛的提示或回退行为。

请求时的运行时预加载如果请求的是宽泛的 `all` 范围，仍会从配置、启动规划、已配置通道、slots 和自动启用规则中推导出一个显式的有效插件 id 集合（`src/plugins/effective-plugin-ids.ts` 中的 `resolveEffectivePluginIds`）。如果推导出的集合为空，OpenClaw 会保持该范围为空，而不是扩大到所有可发现的插件。

设置发现会优先使用描述符拥有的 ids，例如 `setup.providers` 和 `setup.cliBackends`，先缩小候选插件范围，然后才回退到 `setup-api`，以处理那些仍然需要设置时运行时钩子的插件。提供者设置列表会使用清单 `providerAuthChoices`、描述符派生的设置选项以及安装目录元数据，而无需加载提供者运行时。显式的 `setup.requiresRuntime: false` 是一个仅描述符级别的截止条件；省略 `requiresRuntime` 会保留旧版的 `setup-api` 回退，以兼容旧行为。如果有多个发现的插件声称拥有同一个规范化后的设置提供者或 CLI backend id，设置查找会拒绝这个有歧义的所有者，而不是依赖发现顺序。当设置运行时确实执行时，注册表诊断会报告 `setup.providers` / `setup.cliBackends` 与实际由 `setup-api` 注册的 providers 或 CLI backends 之间的漂移，但不会阻止旧插件。

### 插件缓存边界

OpenClaw 不会在基于墙钟时间的窗口内缓存插件发现结果或直接的清单注册表数据。安装、清单编辑和加载路径变更必须在下一次显式的元数据读取或快照重建时可见。清单文件解析器维护一个有界的文件签名缓存，该缓存以已打开的清单路径以及设备/inode、大小和 mtime/ctime 为键；该缓存只用于避免对未变更字节的重复解析，绝不能缓存发现、注册表、所有者或策略答案。

安全的元数据快路径是显式对象所有权，而不是隐藏缓存。Gateway 启动的热路径应在调用链中传递当前的 `PluginMetadataSnapshot`、派生的 `PluginLookUpTable` 或显式清单注册表。配置验证、启动自动启用、插件引导和提供者选择可以在这些对象代表当前配置和插件库存时复用它们。设置查找仍会按需重建清单元数据，除非特定设置路径接收到了显式的清单注册表；请将其保留为冷路径回退，而不是添加隐藏的查找缓存。当输入变化时，应重建并替换快照，而不是变异它或保留历史副本。活动插件注册表以及捆绑通道引导辅助视图应根据当前注册表/根目录重新计算。在一次调用内用于去重工作或防止重入的短生命周期 map 是可以的；它们不能变成进程级元数据缓存。

对于插件加载，持久缓存层是运行时加载。它可以在代码或已安装工件实际被加载时重用加载器状态，例如：

- `PluginLoaderCacheState` 和兼容的活动运行时注册表
- jiti/module 缓存和公共表面加载器缓存，用于避免重复导入
  相同的运行时表面
- 用于已安装插件工件的文件系统缓存
- 用于路径规范化或重复项解析的短生命周期、按调用创建的 map

这些缓存是数据面实现细节。除非调用方明确请求运行时加载，否则它们不能回答控制面问题，例如“哪个插件拥有这个提供者？”。

不要为以下内容添加持久化或基于墙钟时间的缓存：

- 发现结果
- 直接的清单注册表
- 从已安装插件索引重建的清单注册表
- 提供者所有者查找、模型抑制、提供者策略或公共工件元数据
- 任何其他派生自清单的答案，只要清单变更、已安装索引变化或加载路径变化，应在下一次元数据读取时可见

从持久化的已安装插件索引重建清单元数据的调用方，会按需重建该注册表。已安装索引是持久化的源平面状态；它不是隐藏的进程内元数据缓存。

## 注册表模型

已加载的插件不会直接修改随机的核心全局变量。它们会注册到一个
中心插件注册表（`src/plugins/registry-types.ts` 中的 `PluginRegistry`），
该注册表会跟踪插件记录（身份、来源、出处、状态、诊断信息）
以及每种能力对应的数组：工具、旧式 hooks 和类型化 hooks、
通道、提供者、网关 RPC 处理器、HTTP 路由、CLI 注册器、
后台服务、插件拥有的命令，以及数十种更多的类型化提供者
家族（语音、嵌入、图像/视频/音乐生成、Web
抓取/搜索、代理控制器、会话操作，等等）。

核心功能随后会从该注册表中读取，而不是直接与插件
模块交互。这使得加载方向保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对可维护性很重要。它意味着大多数核心表面只需要
一个集成点：“读取注册表”，而不是“为每个插件模块做特殊处理”。

## 会话绑定回调

绑定会话的插件可以在审批结果确定时进行响应。

使用 `api.onConversationBindingResolved(...)` 可以在绑定请求被批准或拒绝后接收回调：

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // 现在已经为该插件 + 会话存在一个绑定。
        console.log(event.binding?.conversationId);
        return;
      }

      // 请求被拒绝；清除任何本地待处理状态。
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

回调载荷字段：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"`deny"`
- `binding`：批准请求的已解析绑定
- `request`：原始请求摘要、detach 提示、发送者 id 和会话元数据

此回调仅用于通知。它不会改变谁可以绑定会话，并且会在核心审批处理完成后运行。

## 提供方运行时钩子

提供方插件有三层：

- **Manifest metadata** for cheap pre-runtime lookup:
  `setup.providers[].envVars`, `providerAuthAliases`, `providerAuthChoices`,
  and `channelConfigs`.
- **Config-time hooks**: `catalog` plus `applyConfigDefaults`.
- **Runtime hooks**: 40+ optional hooks covering auth, model resolution,
  stream wrapping, thinking levels, replay policy, and usage endpoints. See
  [Hook order and usage](#hook-order-and-usage).

OpenClaw 仍然负责通用的代理循环、故障切换、转录处理和工具策略。
这些钩子是面向提供方特定行为的扩展接口，而不需要完全自定义的推理传输。

Use manifest `setup.providers[].envVars` when the provider has env-based
credentials that generic auth/status/model-picker paths should see without
loading plugin runtime. Use manifest `providerAuthAliases`
when one provider id should reuse another provider id's env vars, auth profiles,
config-backed auth, and API-key onboarding choice. Use manifest
`providerAuthChoices` when onboarding/auth-choice CLI surfaces should know the
provider's choice id, group labels, and simple one-flag auth wiring without
loading provider runtime. Keep provider runtime
`envVars` for operator-facing hints such as onboarding labels or OAuth
client-id/client-secret setup vars.

Describe env-driven channel setup and auth through the owning
`channelConfigs.<id>.schema` and setup descriptors.

### 钩子顺序与使用

对于模型/提供者插件，OpenClaw 按以下大致顺序调用钩子。
“何时使用”列是快速决策指南。
OpenClaw 不再调用的仅兼容性提供者字段，例如
`ProviderPlugin.capabilities` 和 `suppressBuiltInModel`，故意不列在此处。

| Hook                              | 它的作用                                                                                                   | 何时使用                                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`                         | 在 `models.json` 生成期间将提供者配置发布到 `models.providers`                                | 提供者拥有目录或基础 URL 默认值                                                                                                  |
| `applyConfigDefaults`             | 在配置物化期间应用提供者拥有的全局配置默认值                                      | 默认值取决于认证模式、环境变量或提供者模型家族语义                                                                         |
| _(内置模型查找)_         | OpenClaw 先尝试正常的注册表/目录路径                                                          | _(不是插件钩子)_                                                                                                                         |
| `normalizeModelId`                | 在查找之前规范化旧版或预览版模型 id 别名                                                     | 提供者在规范模型解析之前负责别名清理                                                                                 |
| `normalizeTransport`              | 在通用模型组装之前规范化提供者家族的 `api` / `baseUrl`                                      | 提供者在同一传输家族中为自定义提供者 id 负责传输清理                                                          |
| `normalizeConfig`                 | 在运行时/提供者解析之前规范化 `models.providers.<id>`                                           | 提供者需要与插件共存的配置清理；捆绑的 Google 家族辅助工具也会兜底受支持的 Google 配置条目   |
| `applyNativeStreamingUsageCompat` | 将原生 streaming-usage 兼容性重写应用到配置提供者                                               | 提供者需要基于端点的原生 streaming usage 元数据修复                                                                          |
| `resolveConfigApiKey`             | 在加载运行时认证之前，为配置提供者解析环境标记认证                                       | 提供者公开自己的环境标记 API key 解析钩子                                                                                |
| `resolveSyntheticAuth`            | 在不持久化明文的情况下暴露本地/自托管或基于配置的认证                                   | 提供者可以使用合成/本地凭据标记                                                                                 |
| `resolveExternalAuthProfiles`     | 覆盖提供者拥有的外部认证配置文件；CLI/应用拥有凭据的默认 `persistence` 为 `runtime-only` | 提供者复用外部认证凭据而不持久化复制的刷新令牌；在清单中声明 `contracts.externalAuthProviders` |
| `shouldDeferSyntheticProfileAuth` | 将存储的合成配置文件占位符排在基于环境变量/配置的认证之后                                      | 提供者存储的合成占位配置文件不应获得优先级                                                                                 |
| `resolveDynamicModel`             | 为本地注册表中尚不存在的提供者自有模型 id 提供同步回退                                       | 提供者接受任意上游模型 id                                                                                                 |
| `prepareDynamicModel`             | 异步预热，然后再次运行 `resolveDynamicModel`                                                           | 提供者在解析未知 id 之前需要网络元数据                                                                                  |
| `normalizeResolvedModel`          | 嵌入式运行器使用已解析模型之前的最终重写                                               | 提供者需要传输重写，但仍使用核心传输                                                                             |
| `normalizeToolSchemas`            | 嵌入式运行器看到工具 schema 之前进行规范化                                                    | 提供者需要传输家族的 schema 清理                                                                                                |
| `inspectToolSchemas`              | 规范化后暴露提供者拥有的 schema 诊断                                                  | 提供者希望有关键字警告，而无需让核心了解提供者特定规则                                                                 |
| `resolveReasoningOutputMode`      | 选择原生 vs 标记化 reasoning-output 契约                                                              | 提供者需要标记化的 reasoning/最终输出，而不是原生字段                                                                         |
| `prepareExtraParams`              | 在通用流选项包装器之前进行请求参数规范化                                              | 提供者需要默认请求参数或按提供者进行参数清理                                                                           |
| `createStreamFn`                  | 用自定义传输完全替换正常流路径                                                   | 提供者需要自定义线协议，而不只是包装器                                                                                     |
| `wrapStreamFn`                    | 在应用通用包装器之后包装流                                                              | 提供者需要请求头/正文/模型兼容包装，而不需要自定义传输                                                          |
| `resolveTransportTurnState`       | 绑定原生的按轮次传输头或元数据                                                           | 提供者希望通用传输发送提供者原生的轮次身份                                                                       |
| `resolveWebSocketSessionPolicy`   | 绑定原生 WebSocket 头或会话冷却策略                                                    | 提供者希望通用 WS 传输调整会话头或回退策略                                                               |
| `formatApiKey`                    | 认证配置文件格式化器：存储的配置文件变为运行时 `apiKey` 字符串                                     | 提供者存储额外认证元数据，并需要自定义运行时令牌形状                                                                    |
| `refreshOAuth`                    | 自定义刷新端点或刷新失败策略的 OAuth 刷新覆盖                                  | 提供者不适用于共享的 OpenClaw 刷新器                                                                                          |
| `buildAuthDoctorHint`             | OAuth 刷新失败时附加的修复提示                                                                  | 刷新失败后提供者需要提供者拥有的认证修复指导                                                                      |
| `matchesContextOverflowError`     | 提供者拥有的上下文窗口溢出匹配器                                                                 | 提供者存在通用启发式方法会漏掉的原始溢出错误                                                                                |
| `classifyFailoverReason`          | 提供者拥有的故障转移原因分类器                                                                  | 提供者可将原始 API/传输错误映射到速率限制/过载等                                                                          |
| `isCacheTtlEligible`              | 代理/回传提供者的提示缓存策略                                                               | 提供者需要代理特定的缓存 TTL 门控                                                                                                |
| `buildMissingAuthMessage`         | 通用缺失认证恢复消息的替代方案                                                      | 提供者需要提供者特定的缺失认证恢复提示                                                                                 |
| `augmentModelCatalog`             | 在发现之后附加合成/最终目录行（已弃用，见下文）                                  | 提供者需要在 `models list` 和选择器中加入合成的前向兼容行                                                                     |
| `resolveThinkingProfile`          | 模型特定的 `/think` 级别集合、显示标签和默认值                                                 | 提供者为所选模型暴露自定义的 thinking 阶梯或二元标签                                                                 |
| `isBinaryThinking`                | 开/关推理切换兼容性钩子                                                                     | 提供者只暴露二元 thinking 开/关                                                                                                  |
| `supportsXHighThinking`           | `xhigh` 推理支持兼容性钩子                                                                   | 提供者只希望在部分模型上启用 `xhigh`                                                                                             |
| `resolveDefaultThinkingLevel`     | 默认 `/think` 级别兼容性钩子                                                                      | 提供者拥有某个模型家族的默认 `/think` 策略                                                                                      |
| `isModernModelRef`                | 用于实时配置文件过滤和 smoke 选择的现代模型匹配器                                              | 提供者拥有实时/smoke 首选模型匹配                                                                                             |
| `prepareRuntimeAuth`              | 在推理前将已配置凭据交换为实际运行时令牌/密钥                       | 提供者需要令牌交换或短期请求凭据                                                                             |
| `resolveUsageAuth`                | 为 `/usage` 和相关状态界面解析 usage/billing 凭据                                     | 提供者需要自定义 usage/quota 令牌解析或不同的 usage 凭据                                                               |
| `fetchUsageSnapshot`              | 在认证解析后获取并规范化提供者特定的 usage/quota 快照                             | 提供者需要提供者特定的 usage 端点或负载解析器                                                                           |
| `createEmbeddingProvider`         | 构建一个提供者拥有的用于内存/搜索的 embedding 适配器                                                     | 内存 embedding 行为属于提供者插件                                                                                    |
| `buildReplayPolicy`               | 返回一个控制该提供者转录处理的回放策略                                        | 提供者需要自定义转录策略（例如，去除 thinking 块）                                                               |
| `sanitizeReplayHistory`           | 在通用转录清理后重写回放历史                                                        | 提供者需要超出共享压缩辅助工具范围的提供者特定回放重写                                                             |
| `validateReplayTurns`             | 嵌入式运行器之前的最终回放轮次验证或重塑                                           | 提供者传输在通用清理后需要更严格的轮次验证                                                                    |
| `onModelSelected`                 | 运行提供者拥有的选择后副作用                                                                 | 模型变为活动状态时提供者需要遥测或提供者拥有的状态                                                                  |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 会先检查
匹配到的提供者插件，然后继续回退到其他具备钩子能力的提供者插件，直到有某个插件真正改变模型 id 或传输/配置为止。这样可以让别名/兼容性提供者 shim 继续工作，而无需调用方知道哪个捆绑插件负责该重写。如果没有任何提供者钩子重写受支持的 Google 家族配置条目，捆绑的 Google 配置规范化器仍然会应用那种兼容性清理。

如果提供者需要完全自定义的线协议或自定义请求执行器，那就是另一类扩展。这些钩子面向仍然运行在 OpenClaw 正常推理循环上的提供者行为。

`resolveUsageAuth` 决定 OpenClaw 是否应调用 `fetchUsageSnapshot`，还是在 usage/status 界面上回退到通用凭据解析。若提供者具有 usage 凭据，则返回
`{ token, accountId?, subscriptionType?, rateLimitTier? }`（可选的计划元数据会流入
`fetchUsageSnapshot`）；当提供者拥有的 usage 认证已处理该请求且必须禁止通用 API key/OAuth 回退时，返回
`{ handled: true }`；当提供者未处理 usage 认证时，返回 `null` 或 `undefined`。

在清单 `providerUsageAuthEnvVars` 中声明组织或计费凭据。这样通用发现和秘密清理界面就能识别它们，而不会把它们当作推理认证候选项。

### Provider 示例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "示例代理",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "自动" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### 内置示例

捆绑的提供者插件会结合上面的钩子，以适配每个供应商的目录、认证、thinking、回放和使用量需求。权威的钩子集合位于各插件在 `extensions/` 下的实现中；本页展示的是形态，而不是逐项复刻列表。

<AccordionGroup>
  <Accordion title="透传目录提供者">
    OpenRouter、Kilocode、Z.AI、xAI 会注册 `catalog` 以及
    `resolveDynamicModel` / `prepareDynamicModel`，以便在 OpenClaw 的静态目录之前暴露上游
    模型 id。
  </Accordion>
  <Accordion title="OAuth 和使用量端点提供者">
    GitHub Copilot、Gemini CLI、ChatGPT Codex、MiniMax、小米、z.ai 会将
    `prepareRuntimeAuth` 或 `formatApiKey` 与 `resolveUsageAuth` +
    `fetchUsageSnapshot` 配对，以负责令牌交换和 `/usage` 集成。
  </Accordion>
  <Accordion title="回放与转录清理家族">
    共享的命名家族（`google-gemini`、`passthrough-gemini`、
    `anthropic-by-model`、`hybrid-anthropic-openai`）允许提供者通过
    `buildReplayPolicy` 采用转录策略，而不是由每个插件各自重新实现清理。
  </Accordion>
  <Accordion title="仅目录提供者">
    `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`nvidia`、
    `qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 和
    `volcengine` 只注册 `catalog` 并依赖共享推理循环。
  </Accordion>
  <Accordion title="Anthropic 特定流式辅助工具">
    Beta 头、`/fast` / `serviceTier` 和 `context1m` 位于 Anthropic 插件的公共
    `api.ts` / `contract-api.ts` 接缝中
    （`wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
    `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`），而不是在通用 SDK 中。
  </Accordion>
</AccordionGroup>

## 运行时辅助工具

插件可以通过 `api.runtime` 访问选定的核心辅助工具。对于 TTS：

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "来自 OpenClaw 的问候",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "来自 OpenClaw 的问候",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

注释：

- `textToSpeech` returns the normal core TTS output payload for file/voice-note surfaces.
- Uses core `tts` configuration and provider selection.
- Returns PCM audio buffer + sample rate. Plugins must resample/encode for providers.
- `listVoices` is optional per provider. Use it for vendor-owned voice pickers or setup flows.
- Core passes a resolved request deadline to provider `listVoices` hooks; provider-specific timeout settings may override it.
- Voice listings can include richer metadata such as locale, gender, and personality tags for provider-aware pickers.
- OpenAI and ElevenLabs support telephony today. Microsoft does not.

插件也可以通过 `api.registerSpeechProvider(...)` 注册语音提供方。

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

注释：

- 将 TTS 策略、回退和回复投递保留在核心中。
- 对于供应商自有的合成行为，请使用语音提供方。
- 旧版 Microsoft `edge` 输入会被规范化为 `microsoft` 提供方 id。
- 推荐的所有权模型是公司导向的：一个供应商插件可以拥有文本、语音、图像，以及 OpenClaw 增加这些能力合同时的未来媒体提供方。

对于图像/音频/视频理解，插件应注册一个带类型的媒体理解提供方，而不是通用的键/值袋：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

注释：

- 将编排、回退、配置和通道接线保留在核心中。
- 将供应商行为保留在提供方插件中。
- 增量扩展应保持类型化：新增可选方法、新增可选结果字段、新增可选能力。
- 视频生成已经遵循相同模式：
  - 核心负责能力合约和运行时辅助工具
  - 供应商插件注册 `api.registerVideoGenerationProvider(...)`
  - 功能/通道插件消费 `api.runtime.videoGeneration.*`

对于媒体理解运行时辅助工具，插件可以调用：

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});

const extraction = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
  provider: "codex",
  model: "gpt-5.6-sol",
  input: [
    {
      type: "image",
      buffer: receiptImageBuffer,
      fileName: "receipt.png",
      mime: "image/png",
    },
    { type: "text", text: "使用打印出的字段作为事实来源。" },
  ],
  instructions: "返回实体和可搜索标签。",
  schemaName: "example.evidence",
  jsonSchema: {
    type: "object",
    properties: {
      entities: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
    },
  },
  cfg: api.config,
});
```

对于音频转写，插件可以使用媒体理解运行时，或者旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // 当无法可靠推断 MIME 时可选：
  mime: "audio/ogg",
});
```

注释：

- `api.runtime.mediaUnderstanding.*` is the preferred shared surface for
  image/audio/video understanding.
- `extractStructuredWithModel(...)` is the plugin-facing seam for bounded
  provider-owned image-first extraction. Include at least one image input;
  text inputs are supplemental context. Product plugins own their routes and
  schemas while OpenClaw owns the provider/runtime boundary.
- Uses core media-understanding audio configuration (`tools.media.audio`) and provider fallback order.
- Returns `{ text: undefined }` when no transcription output is produced (for example skipped/unsupported input).

插件还可以通过 `api.runtime.subagent` 启动后台子代理运行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  toolsAlsoAllow: ["my_plugin_progress"],
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

注释：

- `provider` 和 `model` 是每次运行可选的覆盖项，不是持久的会话更改。
- `toolsAlsoAllow` 接受由调用插件注册的、精确且唯一拥有的工具名称。核心和含糊不清的名称会被拒绝。它会在正常配置文件的基础上进行叠加，但操作员的允许列表和拒绝列表仍然具有最终权威。
- OpenClaw 仅对受信任的调用方认可这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须显式启用 `plugins.entries.<id>.subagent.allowModelOverride: true`。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 将受信任插件限制到特定的规范化 `provider/model` 目标，或者使用 `"*"` 显式允许任何目标。
- 不受信任的插件子代理运行仍然可以工作，但覆盖请求会被拒绝，而不是静默回退。
- 由插件创建的子代理会话会标记创建它的插件 id。兼容的 `api.runtime.subagent.deleteSession(...)` 只能删除这些所属会话；任意会话删除仍然需要具有管理员范围的 Gateway 请求。

对于网络搜索，插件可以消费共享运行时辅助工具，而不是直接进入代理工具接线：

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw 插件运行时辅助工具",
    count: 5,
  },
});
```

插件也可以通过
`api.registerWebSearchProvider(...)` 注册网络搜索提供方。

注释：

- 将提供方选择、凭据解析和共享请求语义保留在核心中。
- 对于供应商特定的搜索传输，请使用网络搜索提供方。
- `api.runtime.webSearch.*` 是需要搜索行为、但不依赖代理工具包装器的功能/通道插件的首选共享接口。

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "一个友好的龙虾吉祥物", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`：使用已配置的图像生成提供方链生成图像。
- `listProviders(...)`：列出可用的图像生成提供方及其能力。

## Gateway HTTP 路由

插件可以使用 `api.registerHttpRoute(...)` 暴露 HTTP 端点。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由字段：

- `path`: 网关 HTTP 服务器下的路由路径。
- `auth`: 必填，`"gateway"` 或 `"plugin"`。使用 `"gateway"` 表示需要正常的网关认证，使用 `"plugin"` 表示由插件管理认证/ webhook 校验。
- `match`: 可选。`"exact"`（默认）或 `"prefix"`。
- `handleUpgrade`: 可选，用于同一路由上的 WebSocket 升级请求的处理器。
- `replaceExisting`: 可选。允许同一个插件替换其自身已存在的路由注册。
- `handler`: 当该路由已处理请求时返回 `true`。

注释：

- `api.registerHttpHandler(...)` was removed and will cause a plugin-load error. Use `api.registerHttpRoute(...)` instead.
- Plugin routes must declare `auth` explicitly.
- Exact `path + match` conflicts are rejected unless `replaceExisting: true`, and one plugin cannot replace another plugin's route.
- Overlapping routes with different `auth` levels are rejected. Keep `exact`/`prefix` fallthrough chains on the same auth level only.
- `auth: "plugin"` routes do **not** receive operator runtime scopes automatically. They are for plugin-managed webhooks/signature verification, not privileged Gateway helper calls.
- `auth: "gateway"` routes run inside a Gateway request runtime scope. The default surface (`gatewayRuntimeScopeSurface: "write-default"`) is intentionally conservative:
  - shared-secret bearer auth (`gateway.auth.mode = "token"` / `"password"`) and any non-trusted-proxy auth method get a single `operator.write` scope, even if the caller sends `x-openclaw-scopes`
  - `trusted-proxy` callers without an explicit `x-openclaw-scopes` header also keep the legacy `operator.write`-only surface
  - `trusted-proxy` callers that do send `x-openclaw-scopes` get the declared scopes instead
  - a route can opt into `gatewayRuntimeScopeSurface: "trusted-operator"` to always honor `x-openclaw-scopes` for identity-bearing auth modes (falling back to the full CLI default scope set when the header is absent)
- Sandboxed external Control UI tabs backed by `auth: "gateway"` routes use a short-lived signed cookie grant minted only by authenticated bootstrap; plugin-auth tabs keep their direct iframe path. Before mounting, the parent runs a route-owned probe inside the same opaque sandbox and fails closed when browser privacy policy blocks the cookie. The grant is bound to the owning plugin, matched route root, and current auth generation; its process-random cookie name prevents trusted same-host Gateways from overwriting one another, but cookies never isolate TCP ports. The Gateway hostname is therefore one credential boundary: do not cohost mutually untrusted services on that hostname, including other ports. Route dispatch rejects reuse against a nested route owned by another plugin. Because sandbox descendants are cross-site for cookie purposes, the grant accepts only `GET` and `HEAD` with `operator.read`; mutations and WebSocket upgrades stay on explicit Gateway-authenticated surfaces. The cookie intentionally cannot use CHIPS: current browsers include a cross-site-ancestor bit in the partition key, so nested opaque sandbox frames would lose access to same-route assets. The cookie requires a secure context and browser permission for cross-site cookies, so gateway-auth external tabs are unavailable on plain-HTTP LAN origins or under full third-party-cookie blocking; use HTTPS/Tailscale Serve or browser-trusted loopback with a compatible cookie policy.
- The grant prevents Gateway bearer-token disclosure and accidental route/scope reuse; it does not create a security boundary between native plugins. Native plugin code and the UI content it serves remain part of the same trusted in-process plugin boundary.
- Practical rule: do not assume a gateway-auth plugin route is an implicit admin surface. If your route needs admin-only behavior, opt into `trusted-operator` scope surface, require an identity-bearing auth mode, and document the explicit `x-openclaw-scopes` header contract.
- After route matching and authentication, ordinary handlers participate in Gateway root-work admission. A prepared or restarting Gateway returns `503` before invoking the handler. The narrow exception is a manifest-entitled `auth: "gateway"` route that also opts into the route-specific `trusted-operator` surface; it remains reachable so suspension control dispatch cannot be stranded, while ordinary sibling routes from the same plugin remain behind the admission boundary. WebSocket `handleUpgrade` ownership uses the same atomic admission boundary; once the handler accepts a socket, the socket's later lifetime is plugin-owned and is not tracked by this boundary.

## 插件 SDK 导入路径

在编写新插件时，请使用更窄的 SDK 子路径，而不是单体的 `openclaw/plugin-sdk` 根 barrel。核心子路径：

| Subpath                            | Purpose                                      |
| ---------------------------------- | -------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry` | Plugin registration primitives               |
| `openclaw/plugin-sdk/channel-core` | Channel entry/build helpers                  |
| `openclaw/plugin-sdk/core`         | Generic shared helpers and umbrella contract |

通道插件会从一组更窄的接入点中选择——`channel-setup`、
`setup-runtime`、`setup-tools`、`channel-pairing`、
`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-outbound`、
`command-auth`、`secret-input`、`webhook-ingress`、
`channel-targets` 和 `channel-actions`。审批行为应当收敛到单一的
`approvalCapability` 契约上，而不是分散在互不相关的插件字段中。请参见
[Channel plugins](/plugins/sdk-channel-plugins)。

运行时和配置辅助工具位于对应的聚焦 `*-runtime` 子路径下
（`approval-runtime`、`agent-runtime`、`lazy-runtime`、`directory-runtime`、
`text-runtime`、`runtime-store`、`system-event-runtime`、`heartbeat-runtime`、
`channel-activity-runtime` 等）。优先使用 `config-contracts`、
`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation`，
而不是宽泛的 `config-runtime` 兼容 barrel。

<Info>
`openclaw/plugin-sdk/channel-lifecycle`, small channel helper facades,
`openclaw/plugin-sdk/config-runtime`, and `openclaw/plugin-sdk/infra-runtime`
are deprecated compatibility shims for older plugins. New code should import
narrower generic primitives instead.
</Info>

仓库内部入口点（按打包插件包根目录）：

- `index.js` — 打包后的插件入口
- `api.js` — 辅助工具/类型 barrel
- `runtime-api.js` — 仅运行时 barrel
- `setup-entry.js` — 设置插件入口

外部插件应仅导入 `openclaw/plugin-sdk/*` 子路径。切勿从核心或其他插件中导入另一个插件包的 `src/*`。facade 加载的入口点优先使用活动运行时配置快照（如果存在），然后回退到磁盘上的已解析配置文件。

像 `image-generation`、`media-understanding` 和 `speech` 这样的能力特定子路径之所以存在，是因为打包插件今天就在使用它们。它们并不是自动长期冻结的外部契约——在依赖它们时，请查看相关的 SDK 参考页面。

## 消息工具架构

插件应拥有渠道特定的 `describeMessageTool(...)` 架构贡献，用于非消息原语，例如反应、已读和投票。共享发送展示应使用通用的 `MessagePresentation` 合约，而不是 provider 原生的 button、component、block 或 card 字段。有关该合约、降级规则、provider 映射以及插件作者检查清单，请参见 [消息展示](/plugins/message-presentation)。

具备发送能力的插件通过消息能力声明它们可以渲染的内容：

- `presentation` 用于语义展示块（`text`、`context`、
  `divider`、`chart`、`table`、`buttons`、`select`）
- `delivery-pin` 用于置顶发送请求

Core 决定是原生渲染该展示，还是将其降级为文本。不要通过通用消息工具暴露 provider 原生 UI 的逃生通道。面向旧版原生架构的已弃用 SDK 辅助函数仍会导出，以兼容现有第三方插件，但新插件不应使用它们。

## 渠道目标解析

渠道插件应拥有渠道特定的目标语义。保持共享的 outbound host 通用化，并使用 messaging adapter 接口来处理 provider 规则：

- `messaging.inferTargetChatType({ to })` 决定一个规范化目标在目录查找之前应被视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉核心层输入是否应直接跳过目录搜索，进入类似 id 的解析。
- `messaging.targetResolver.reservedLiterals` 列出该 provider 中作为渠道/会话引用的裸词。解析会优先保留已配置的目录条目，再拒绝保留字面量，然后在目录未命中时关闭式失败。
- `messaging.targetResolver.resolveTarget(...)` 是插件回退逻辑：当核心在规范化之后或目录未命中之后需要进行最终的、由 provider 拥有的解析时使用。
- `messaging.resolveOutboundSessionRoute(...)` 在目标解析完成后，负责构建 provider 特定的会话路由。

推荐拆分方式：

- 将 `inferTargetChatType` 用于应在搜索 peers/groups 之前发生的分类决策。
- 将 `looksLikeId` 用于“将其视为显式/原生目标 id”的检查。
- 将 `resolveTarget` 用于 provider 特定的归一化回退，而不是用于广泛目录搜索。
- 将 chat id、thread id、JID、handle 和 room id 等 provider 原生 id 保留在 `target` 值或 provider 特定参数中，而不是放在通用 SDK 字段里。

## 基于配置的目录

从配置派生目录条目的插件，应将该逻辑保留在插件内部，并复用来自 `openclaw/plugin-sdk/directory-runtime` 的共享辅助函数。

当某个渠道需要基于配置的 peers/groups 时使用此方式，例如：

- 基于 allowlist 的 DM peers
- 已配置的 channel/group 映射
- 账户作用域的静态目录回退

`directory-runtime` 中的共享辅助函数只处理通用操作：

- 查询过滤
- limit 应用
- 去重/归一化辅助
- 构建 `ChannelDirectoryEntry[]`

渠道特定的账户检查和 id 归一化应保留在插件实现中。

## provider 目录

provider 插件可以通过 `registerProvider({ catalog: { run(...) { ... } } })` 为推理定义模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入 `models.providers` 的相同结构：

- `{ provider }` 表示单个 provider 条目
- `{ providers }` 表示多个 provider 条目

当插件拥有 provider 特定的模型 id、base URL 默认值，或受认证门控的模型元数据时，使用 `catalog`。

`catalog.order` 控制插件的目录与 OpenClaw 内置隐式 provider 的合并顺序：

- `simple`：普通 API key 或 env 驱动的 provider
- `profile`：在存在认证 profile 时出现的 provider
- `paired`：合成多个相关 provider 条目的 provider
- `late`：最后一轮，在其他隐式 provider 之后

后面的 provider 在键冲突时获胜，因此插件可以有意用相同的 provider id 覆盖内置 provider 条目。

插件还可以通过
`api.registerModelCatalogProvider({ provider, kinds, staticCatalog, liveCatalog
})` 发布只读模型行。这是用于列表/帮助/选择器界面的前进路径，并支持
`text`、`voice`、`image_generation`、`video_generation` 和 `music_generation`
行。provider 插件仍然负责实时端点调用、令牌交换以及
厂商响应映射；核心负责通用行结构、来源标签以及
媒体工具帮助格式。媒体生成 provider 注册会自动根据
`defaultModel`、`models` 和 `capabilities` 合成静态目录行。

兼容性：

- `discovery` 仍可作为旧别名使用，但会发出弃用警告
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 会使用 `catalog`
  并发出警告
- `augmentModelCatalog` 已弃用；内置 provider 应通过 `registerModelCatalogProvider` 发布补充行

## 只读渠道检查

如果你的插件注册了一个渠道，优先在 `resolveAccount(...)` 旁边实现 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。它可以假设凭据已经完全 materialize，并且在所需密钥缺失时快速失败。
- 诸如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 以及 doctor/config 修复流程等只读命令路径，不应仅为了描述配置而去 materialize 运行时凭据。

推荐的 `inspectAccount(...)` 行为：

- 只返回具描述性的账户状态。
- 保留 `enabled` 和 `configured`。
- 在相关时包含凭据来源/状态字段，例如：
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 仅为了报告只读可用性，不需要返回原始 token 值。返回 `tokenStatus: "available"`（以及匹配的 source 字段）对状态类命令已经足够。
- 当凭据通过 SecretRef 配置，但在当前命令路径中不可用时，使用 `configured_unavailable`。

这使得只读命令可以报告“已配置但在此命令路径中不可用”，而不是崩溃或把账户误报为未配置。

## 包集合

插件目录可以包含带有 `openclaw.extensions` 的 `package.json` 文件：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每个条目都会成为一个插件。如果一个包列出了多个扩展，插件
id 会变为 `<manifestOrPackageName>/<fileBase>`（如果存在，则优先使用 manifest id；否则使用未带作用域的 `package.json` 名称）。

如果你的插件导入了 npm 依赖，请将它们安装在该目录中，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全防护：在符号链接解析之后，每个 `openclaw.extensions` 条目仍必须保留在插件目录内。逃逸出包目录的条目将被拒绝。

安全提示：`openclaw.plugins install` 使用项目本地的 `npm install --omit=dev --ignore-scripts` 来安装插件依赖（运行时不执行生命周期脚本，不包含 dev 依赖），并忽略继承而来的全局 npm 安装设置。请保持插件依赖树为“纯 JS/TS”，并避免使用需要 `postinstall` 构建的包。

可选项：`openclaw.setupEntry` 可以指向一个轻量级的仅用于设置的模块。当 OpenClaw 需要为被禁用的频道插件显示设置界面，或者当频道插件已启用但尚未配置时，它会加载 `setupEntry`，而不是完整的插件入口。这使启动和设置更轻量，同时仍允许主插件入口连接工具、钩子或其他仅运行时需要的代码。

可选项：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 允许频道插件在网关预监听启动阶段使用相同的 `setupEntry` 路径，即使该频道已经完成配置。

仅在设置入口完整覆盖了网关开始监听之前必须存在的一切内容时才使用此选项。实际上，这意味着设置入口必须注册启动所依赖的每个频道拥有的能力，例如：

- 频道注册本身
- 在网关开始监听之前必须可用的任何 HTTP 路由
- 必须在同一窗口内存在的任何网关方法、工具或服务

如果你的完整入口仍然拥有任何必需的启动能力，请不要启用此标志。保持插件使用默认行为，并让 OpenClaw 在启动期间加载完整入口。

内置频道也可以发布仅用于设置的契约表面辅助函数，供核心在完整频道运行时加载之前查询。目前的设置提升表面是：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

当核心需要将旧的单账户频道配置提升到 `channels.<id>.accounts.*` 时，会使用此表面，而无需加载完整的插件入口。Matrix 是当前的内置示例：当已存在命名账户时，它只会将 auth/bootstrap 键移动到命名的提升账户中，并且可以保留已配置的非默认账户键，而不是总是创建 `accounts.default`。

这些设置补丁适配器保留了对内置契约表面功能的惰性发现。请保持导入轻量；提升表面只会在首次使用时加载，而不会在模块导入期间重新进入内置频道启动流程。

当这些启动表面包含网关 RPC 方法时，请将它们放在插件专用前缀下。核心管理的命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）仍然保留，并且始终解析为 `operator.admin`，即使插件请求更窄的作用域也是如此。

示例：

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### 频道目录元数据

频道插件可以通过 `openclaw.channel` 声明设置/发现元数据，并通过 `openclaw.install` 提供安装指导。这使核心目录不再承载数据。

示例：

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk（自托管）",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "通过 Nextcloud Talk webhook 机器人实现自托管聊天。",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

除了最小示例之外，`openclaw.channel` 还有几个有用的字段：

- `detailLabel`: secondary label for richer catalog/status surfaces
- `docsLabel`: override link text for the docs link
- `preferOver`: lower-priority plugin/channel ids this catalog entry should outrank
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras`: selection-surface copy controls
- `markdownCapable`: marks the channel as markdown-capable for outbound formatting decisions
- `exposure.configured`: hide the channel from configured-channel listing surfaces when set to `false`
- `exposure.setup`: hide the channel from interactive setup/configure pickers when set to `false`
- `exposure.docs`: mark the channel as internal/private for docs navigation surfaces
- `quickstartAllowFrom`: opt the channel into the standard quickstart `allowFrom` flow
- `forceAccountBinding`: require explicit account binding even when only one account exists
- `preferSessionLookupForAnnounceTarget`: prefer session lookup when resolving announce targets

OpenClaw 还可以合并**外部频道目录**（例如 MPM 注册表导出）。把 JSON 文件放在以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件，使用逗号、分号或 `PATH` 分隔。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 键的旧别名。

生成的频道目录条目和提供者安装目录条目会在原始 `openclaw.install` 块旁公开规范化的安装源事实。规范化事实会识别 npm spec 是精确版本还是浮动选择器、是否存在预期的完整性元数据，以及是否也可用本地源路径。当已知目录/包身份时，如果解析出的 npm 包名与该身份不匹配，规范化事实会发出警告。它们还会在 `defaultChoice` 无效或指向不可用源时发出警告，并且在 npm 完整性元数据存在但没有有效 npm 源时发出警告。消费者应将 `installSource` 视为一个额外的可选字段，这样手工构建的条目和目录适配器就不需要自行生成它。
这使得 onboarding 和诊断能够解释源平面状态，而无需导入插件运行时。

官方外部 npm 条目应优先使用精确的 `npmSpec` 加上
`expectedIntegrity`。为了兼容性，仍然允许裸包名和 dist-tag，
但它们会暴露源平面的警告，以便目录能够在不破坏现有插件的情况下，逐步转向固定并经过完整性验证的安装。
当从本地目录路径进行 onboarding 时，它会记录一个托管插件
插件索引条目，使用 `source: "path"`，并在可能时记录一个
相对于工作区的 `sourcePath`。绝对运行时加载路径仍保留在
`plugins.load.paths` 中；安装记录避免将本地工作站路径复制到长期配置中。
这使本地开发安装在源平面诊断中可见，同时不会增加第二个原始文件系统路径泄漏面。
持久化的 `installed_plugin_index` SQLite 表是安装
来源的事实来源，并且可以在不加载插件运行时模块的情况下刷新。
即使插件清单缺失或无效，其 `installRecords` 映射仍然是持久化的；其 `plugins` 载荷是可重建的清单视图。

## 上下文引擎插件

上下文引擎插件负责会话上下文的编排，包括摄取、组装和压缩。通过你的插件使用 `api.registerContextEngine(id, factory)` 注册它们，然后通过 `plugins.slots.contextEngine` 选择当前启用的引擎。

当你的插件需要替换或扩展默认的上下文流水线，而不仅仅是增加记忆搜索或钩子时，请使用此功能。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", (ctx) => ({
    info: { id: "lossless-claw", name: "无损爪", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, sessionKey, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
          agentSessionKey: sessionKey,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

工厂函数 `ctx` 提供可选的 `config`、`agentDir` 和 `workspaceDir` 值，用于构造时初始化。

The host completes registered async memory prompt preparation before calling a
non-legacy engine's `assemble()`. `buildMemorySystemPromptAddition(...)` stays
synchronous and reads that immutable run snapshot while `assemble()` is active.
Pass the supplied tool and citation context through unchanged so the snapshot
cannot cross run boundaries.

`assemble()` may return `contextProjection` when the active harness has a
persistent backend thread. Omit it for legacy per-turn projection. Return
`{ mode: "thread_bootstrap", epoch }` when the assembled context should be
injected once into a backend thread and reused until the epoch changes. Change
the epoch after the engine's semantic context changes, such as after an
engine-owned compaction pass. Hosts may preserve tool-call metadata, input
shape, and redacted tool results in a thread-bootstrap projection so fresh
backend threads retain tool continuity without copying raw secret-bearing
payloads.

如果你的引擎**不**负责压缩算法，请保留 `compact()` 的实现，并显式委托它：

```ts
import {
  buildMemorySystemPromptAddition,
  delegateCompactionToRuntime,
} from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", (ctx) => ({
    info: {
      id: "my-memory-engine",
      name: "我的记忆引擎",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, sessionKey, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
          agentSessionKey: sessionKey,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## 添加新能力

当插件需要当前 API 无法满足的行为时，不要通过私有方式绕过插件系统。应当补齐缺失的能力。

推荐顺序：

1. **定义核心契约。** 决定 core 应当拥有哪些共享行为：
   策略、回退、配置合并、生命周期、面向通道的语义，以及
   运行时辅助函数的形态。
2. **添加带类型的插件注册/运行时表面。** 扩展
   `OpenClawPluginApi` 和/或 `api.runtime`，提供最小且有用的带类型
   能力表面。
3. **连接 core + 通道/功能消费者。** 通道和功能插件
   应当通过 core 消费新能力，而不是直接导入某个厂商实现。
4. **注册厂商实现。** 然后由厂商插件围绕该能力注册它们的后端。
5. **添加契约覆盖。** 添加测试，使所有权和注册形态在长期内保持明确。

这就是 OpenClaw 在保持明确立场的同时，又不会变成对某个提供商世界观的硬编码的方式。参见 [能力食谱](/tools/capability-cookbook)，其中包含具体的文件清单和完整示例。

### 能力检查清单

当你添加一种新能力时，实现通常应该同时涉及这些表面：

- `src/<capability>/types.ts` 中的 core 契约类型
- `src/<capability>/runtime.ts` 中的 core 运行器/运行时辅助函数
- `src/plugins/types.ts` 中的插件 API 注册表面
- `src/plugins/registry.ts` 中的插件注册表连接线
- 当功能/通道插件需要消费它时，在 `src/plugins/runtime/*` 中暴露插件运行时
- `src/test-utils/plugin-registration.ts` 中的捕获/测试辅助函数
- `src/plugins/contracts/registry.ts` 中的所有权/契约断言
- `docs/` 中的运维/插件文档

如果其中某个表面缺失，通常意味着该能力还没有完全集成。

### 能力模板

最小模式：

```ts
// core 契约
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// 插件 API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// 供功能/渠道插件使用的共享运行时辅助函数
const clip = await api.runtime.videoGeneration.generate({
  prompt: "展示机器人在实验室中行走。",
  cfg,
});
```

契约测试模式（`src/plugins/contracts/registry.ts` 暴露诸如
`providerContractPluginIds` 之类的所有权查找；测试断言某个插件的
`contracts.videoGenerationProviders` 列表与其实际注册内容一致）：

```ts
expect(pluginManifest.contracts?.videoGenerationProviders).toEqual(["openai"]);
```

这样可以让规则保持简单：

- core 负责能力契约 + 编排
- 厂商插件负责厂商实现
- 功能/通道插件消费运行时辅助函数
- 契约测试让所有权保持明确

## 相关内容

- [插件架构](/plugins/architecture) — 公共能力模型和形状
- [插件 SDK 子路径](/plugins/sdk-subpaths)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
