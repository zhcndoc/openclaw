---
summary: "插件架构内部：加载流水线、注册表、运行时钩子、HTTP 路由和参考表"
read_when:
  - 实现提供者运行时钩子、通道生命周期或包集合时
  - 调试插件加载顺序或注册表状态时
  - 添加新的插件能力或上下文引擎插件时
title: "插件架构内部"
---

关于公共能力模型、插件形态以及所有权/执行契约，请参见 [插件架构](/plugins/architecture)。本页是内部机制的参考：加载流水线、注册表、运行时钩子、Gateway HTTP 路由、导入路径和模式表。

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

<Note>
`activate` 是 `register` 的旧别名 —— 加载器会解析两者中的任意一个（`def.register ?? def.activate`），并在同一时刻调用它。所有捆绑插件都使用 `register`；新插件请优先使用 `register`。
</Note>

安全检查发生在**运行时执行之前**。当入口逃逸出插件根目录、路径可被全局写入，或者非捆绑插件的路径所有权看起来可疑时，候选项会被阻止。

被阻止的候选项仍会与其插件 id 绑定，以便诊断。如果配置
仍然引用该 id，验证会报告该插件已存在但被阻止，
并指回路径安全警告，而不是将该配置项视为过期。

### 清单优先行为

清单是控制面的事实来源。OpenClaw 使用它来：

- 识别插件
- 发现声明的通道/技能/配置模式或 bundle 能力
- 验证 `plugins.entries.<id>.config`
- 增强 Control UI 标签/占位符
- 展示安装/目录元数据
- 在不加载插件运行时的情况下保留廉价的激活和设置描述符

对于原生插件，运行时模块是数据面部分。它负责注册实际行为，例如钩子、工具、命令或提供者流程。

可选的清单 `activation` 和 `setup` 块保留在控制面上。它们是仅元数据的描述符，用于激活规划和设置发现；它们不能替代运行时注册、`register(...)` 或 `setupEntry`。最早的实时激活消费者现在会使用清单中的命令、通道和提供者提示，在更广泛的注册表物化之前缩小插件加载范围：

- CLI 加载会缩小到拥有所请求主命令的插件
- 通道设置/插件解析会缩小到拥有所请求
  通道 id 的插件
- 显式提供者设置/运行时解析会缩小到拥有所请求提供者 id 的插件
- Gateway 启动规划会使用 `activation.onStartup` 进行显式启动
  导入和启动退出；没有启动元数据的插件只会通过更窄的激活触发加载

请求时运行时预加载如果要求广泛的 `all` 范围，仍会从配置、启动规划、已配置通道、槽位和自动启用规则推导出一个显式的有效插件 id 集。若该推导集合为空，OpenClaw 会加载一个空的运行时注册表，而不是扩展到每一个可发现的插件。

激活规划器同时为现有调用方提供仅 ids 的 API，以及为新诊断提供 plan API。计划条目会报告插件被选中的原因，将显式的 `activation.*` 规划器提示与清单所有权回退区分开来，例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks。这个原因拆分就是兼容性边界：现有插件元数据继续有效，而新代码可以在不改变运行时加载语义的情况下检测宽泛提示或回退行为。

设置发现现在优先使用描述符拥有的 ids，例如 `setup.providers` 和 `setup.cliBackends`，在回退到 `setup-api` 之前缩小候选插件范围，适用于那些仍然需要设置期运行时钩子的插件。提供者设置列表会使用清单 `providerAuthChoices`、描述符派生的设置选项以及安装目录元数据，而不加载提供者运行时。显式 `setup.requiresRuntime: false` 是仅描述符的截断条件；省略 `requiresRuntime` 会保留旧的 `setup-api` 回退以兼容。若发现的多个插件声称拥有相同的标准化设置提供者或 CLI 后端 id，设置查找会拒绝歧义所有者，而不是依赖发现顺序。当设置运行时确实执行时，注册表诊断会报告 `setup.providers` / `setup.cliBackends` 与由 `setup-api` 注册的提供者或 CLI 后端之间的漂移，但不会阻止旧插件。

### 插件缓存边界

OpenClaw 不会在基于墙钟时间的窗口之后缓存插件发现结果或直接的清单注册表数据。安装、清单编辑和加载路径变更必须在下一次显式元数据读取或快照重建时可见。清单文件解析器可以保留一个有界的文件签名缓存，键由已打开的清单路径、inode、大小和时间戳组成；该缓存只用于避免对未变化字节重复解析，绝不能缓存发现、注册表、所有者或策略答案。

安全的元数据快速路径是显式对象所有权，而不是隐藏缓存。Gateway 启动的热点路径应在调用链中传递当前的 `PluginMetadataSnapshot`、派生的 `PluginLookUpTable` 或显式清单注册表。配置验证、启动自动启用、插件引导和提供者选择可以复用这些对象，只要它们代表当前配置和插件库存。设置查找仍会按需重建清单元数据，除非特定设置路径接收了显式清单注册表；请将其作为冷路径回退，而不是添加隐藏的查找缓存。当输入发生变化时，应重建并替换快照，而不是修改它或保留历史副本。
对活动插件注册表和捆绑通道引导辅助工具的视图，应从当前注册表/根目录重新计算。一次调用内可以使用短生命周期的 map 来去重或防止重入；但它们不能演变为进程级元数据缓存。

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

已加载的插件不会直接修改随机的核心全局变量。它们会注册到一个中心插件注册表中。

注册表跟踪：

- 插件记录（标识、来源、origin、状态、诊断）
- 工具
- 旧式 hooks 和类型化 hooks
- 通道
- 提供者
- Gateway RPC 处理器
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

然后核心功能会从该注册表中读取，而不是直接与插件模块对话。这使得加载保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对可维护性很重要。它意味着大多数核心界面只需要一个集成点：“读取注册表”，而不是“为每个插件模块做特殊处理”。

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
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：批准请求的已解析绑定
- `request`：原始请求摘要、detach 提示、发送者 id 和会话元数据

此回调仅用于通知。它不会改变谁可以绑定会话，并且会在核心审批处理完成后运行。

## 提供者运行时钩子

提供者插件有三层：

- **清单元数据**：用于廉价的运行前查找：
  `setup.providers[].envVars`、已弃用的兼容项 `providerAuthEnvVars`、
  `providerAuthAliases`、`providerAuthChoices` 和 `channelEnvVars`。
- **配置期钩子**：`catalog`（旧名 `discovery`）以及
  `applyConfigDefaults`。
- **运行时钩子**：40 多个可选钩子，覆盖认证、模型解析、
  流包装、思考层级、回放策略和使用量端点。完整列表见
  [钩子顺序与使用](#hook-order-and-usage)。

OpenClaw 仍然负责通用代理循环、故障转移、转录处理和工具策略。
这些钩子是提供者特定行为的扩展面，无需整个自定义推理传输。

当提供者拥有基于环境变量的凭据，并且通用认证/状态/模型选择路径应在不加载插件运行时的情况下看到它们时，请使用清单 `setup.providers[].envVars`。已弃用的 `providerAuthEnvVars` 在弃用窗口内仍会被兼容适配器读取，使用它的非捆绑插件会收到清单诊断。当一个提供者 id 需要复用另一个提供者 id 的环境变量、认证配置文件、基于配置的认证和 API 密钥引导选择时，请使用清单 `providerAuthAliases`。当入门/认证选择的 CLI 界面应在不加载提供者运行时的情况下知道提供者的选择 id、组标签和简单的一键认证接线时，请使用清单 `providerAuthChoices`。将提供者运行时 `envVars` 保留给面向运维者的提示，例如入门标签或 OAuth client-id/client-secret 设置变量。

当某个通道具有由环境变量驱动的认证或设置，而通用 shell-env 回退、配置/状态检查或设置提示应在不加载通道运行时的情况下看到它们时，请使用清单 `channelEnvVars`。

### 钩子顺序与使用

对于模型/提供者插件，OpenClaw 按以下大致顺序调用钩子。
“何时使用”列是快速决策指南。
OpenClaw 不再调用的仅兼容性提供者字段，例如
`ProviderPlugin.capabilities` 和 `suppressBuiltInModel`，故意不列在此处。

| #   | 钩子                              | 它的作用                                                                                                       | 何时使用                                                                                                                                       |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 生成期间将提供者配置发布到 `models.providers`                                                  | 提供者拥有目录或基础 URL 默认值                                                                                                                 |
| 2   | `applyConfigDefaults`             | 在配置物化期间应用提供者拥有的全局配置默认值                                                                    | 默认值取决于认证模式、环境或提供者模型家族语义                                                                                                 |
| --  | _(built-in model lookup)_         | OpenClaw 先尝试正常的注册表/目录路径                                                                              | _(不是插件钩子)_                                                                                                                               |
| 3   | `normalizeModelId`                | 在查找之前规范化旧版或预览版的模型 id 别名                                                                         | 提供者在规范模型解析之前拥有别名清理                                                                                                           |
| 4   | `normalizeTransport`              | 在通用模型组装之前规范化提供者家族的 `api` / `baseUrl`                                                         | 提供者拥有同一传输家族中自定义提供者 id 的传输清理                                                                                             |
| 5   | `normalizeConfig`                 | 在运行时/提供者解析之前规范化 `models.providers.<id>`                                                            | 提供者需要应与插件共存的配置清理；捆绑的 Google 家族辅助工具也会兜底支持的 Google 配置条目                                                   |
| 6   | `applyNativeStreamingUsageCompat` | 将原生流式使用量兼容重写应用到配置提供者                                                                          | 提供者需要端点驱动的原生流式使用量元数据修复                                                                                                   |
| 7   | `resolveConfigApiKey`             | 在运行时认证加载之前，解析配置提供者的环境标记认证                                                                | 提供者拥有提供者专属的环境标记 API 密钥解析；`amazon-bedrock` 在这里也有一个内置的 AWS 环境标记解析器                                         |
| 8   | `resolveSyntheticAuth`            | 在不持久化明文的情况下暴露本地/自托管或基于配置的认证                                                              | 提供者可以使用合成/本地凭据标记                                                                                                                 |
| 9   | `resolveExternalAuthProfiles`     | 覆盖提供者拥有的外部认证配置文件；CLI/app 拥有凭据的默认 `persistence` 为 `runtime-only`                         | 提供者重用外部认证凭据而不持久化复制的刷新令牌；在清单中声明 `contracts.externalAuthProviders`                                                 |
| 10  | `shouldDeferSyntheticProfileAuth` | 将存储的合成配置文件占位符降低到环境/配置支持的认证之后                                                            | 提供者存储的合成占位符配置文件不应优先                                                                                                         |
| 11  | `resolveDynamicModel`             | 当本地注册表中尚不存在时，对提供者拥有的模型 id 进行同步回退解析                                                    | 提供者接受任意上游模型 id                                                                                                                       |
| 12  | `prepareDynamicModel`             | 异步预热，然后再次运行 `resolveDynamicModel`                                                                       | 提供者在解析未知 id 前需要网络元数据                                                                                                           |
| 13  | `normalizeResolvedModel`          | 在嵌入式运行器使用已解析模型之前进行最终重写                                                                       | 提供者需要传输重写，但仍然使用核心传输                                                                                                         |
| 14  | `contributeResolvedModelCompat`   | 为位于另一种兼容传输后面的供应商模型贡献兼容标志                                                                   | 提供者在代理传输上识别自己的模型，而不接管该提供者                                                                                             |
| 15  | `normalizeToolSchemas`            | 在嵌入式运行器看到工具 schema 之前对其进行规范化                                                                  | 提供者需要传输家族 schema 清理                                                                                                                 |
| 16  | `inspectToolSchemas`              | 在规范化之后暴露提供者拥有的 schema 诊断                                                                         | 提供者希望有关键字警告，而无需让核心了解提供者特定规则                                                                                         |
| 17  | `resolveReasoningOutputMode`      | 选择原生 vs 标记化的 reasoning-output 契约                                                                        | 提供者需要标记化推理/最终输出而不是原生字段                                                                                                    |
| 18  | `prepareExtraParams`              | 在通用流选项包装器之前进行请求参数规范化                                                                          | 提供者需要默认请求参数或每个提供者的参数清理                                                                                                   |
| 19  | `createStreamFn`                  | 用自定义传输完全替换正常流路径                                                                                     | 提供者需要自定义线协议，而不仅仅是包装器                                                                                                       |
| 20  | `wrapStreamFn`                    | 在应用通用包装器之后的流包装器                                                                                     | 提供者需要请求头/正文/模型兼容包装器，而不是自定义传输                                                                                          |
| 21  | `resolveTransportTurnState`       | 绑定原生的逐轮传输头或元数据                                                                                         | 提供者希望通用传输发送提供者原生的轮次身份                                                                                                     |
| 22  | `resolveWebSocketSessionPolicy`   | 绑定原生 WebSocket 头或会话冷却策略                                                                                | 提供者希望通用 WS 传输调整会话头或回退策略                                                                                                    |
| 23  | `formatApiKey`                    | 认证配置文件格式化器：存储的配置文件变为运行时 `apiKey` 字符串                                                     | 提供者存储额外认证元数据，并需要自定义运行时令牌形状                                                                                           |
| 24  | `refreshOAuth`                    | 用于自定义刷新端点或刷新失败策略的 OAuth 刷新覆盖                                                                  | 提供者不适合共享的 `pi-ai` 刷新器                                                                                                               |
| 25  | `buildAuthDoctorHint`             | 当 OAuth 刷新失败时附加的修复提示                                                                                  | 提供者在刷新失败后需要提供者专属的认证修复指导                                                                                                 |
| 26  | `matchesContextOverflowError`     | 提供者拥有的上下文窗口溢出匹配器                                                                                   | 提供者有原始溢出错误，而通用启发式会漏掉它们                                                                                                   |
| 27  | `classifyFailoverReason`          | 提供者拥有的故障转移原因分类                                                                                        | 提供者可以将原始 API/传输错误映射为限流/过载等                                                                                                 |
| 28  | `isCacheTtlEligible`              | 面向代理/回传提供者的提示缓存策略                                                                                    | 提供者需要代理特定的缓存 TTL 门控                                                                                                             |
| 29  | `buildMissingAuthMessage`         | 通用缺失认证恢复消息的替代项                                                                                        | 提供者需要提供者特定的缺失认证恢复提示                                                                                                         |
| 30  | `augmentModelCatalog`             | 在发现之后附加的合成/最终目录行                                                                                     | 提供者需要在 `models list` 和选择器中加入合成的前向兼容行                                                                                        |
| 31  | `resolveThinkingProfile`          | 模型特定的 `/think` 级别集合、显示标签和默认值                                                                      | 提供者为所选模型暴露自定义 thinking 阶梯或二元标签                                                                                            |
| 32  | `isBinaryThinking`                | 开/关推理切换兼容性钩子                                                                                              | 提供者只暴露二元 thinking 开/关                                                                                                                |
| 33  | `supportsXHighThinking`           | `xhigh` 推理支持兼容性钩子                                                                                           | 提供者只希望在部分模型上使用 `xhigh`                                                                                                          |
| 34  | `resolveDefaultThinkingLevel`     | 默认 `/think` 级别兼容性钩子                                                                                         | 提供者拥有某个模型家族的默认 `/think` 策略                                                                                                     |
| 35  | `isModernModelRef`                | 用于实时配置文件筛选和烟雾测试选择的现代模型匹配器                                                                   | 提供者拥有实时/烟雾优选模型匹配                                                                                                                 |
| 36  | `prepareRuntimeAuth`              | 在推理前将已配置凭据交换为实际的运行时令牌/密钥                                                                      | 提供者需要令牌交换或短期请求凭据                                                                                                                |
| 37  | `resolveUsageAuth`                | 为 `/usage` 和相关状态界面解析使用量/计费凭据                                                                       | 提供者需要自定义使用量/配额令牌解析或不同的使用凭据                                                                                            |
| 38  | `fetchUsageSnapshot`              | 在认证解析后获取并规范化提供者特定的使用量/配额快照                                                                  | 提供者需要提供者特定的使用量端点或载荷解析器                                                                                                   |
| 39  | `createEmbeddingProvider`         | 为 memory/search 构建提供者拥有的 embedding 适配器                                                                 | memory embedding 行为应归属于提供者插件                                                                                                       |
| 40  | `buildReplayPolicy`               | 返回一个控制该提供者转录处理的回放策略                                                                              | 提供者需要自定义转录策略（例如，去除 thinking 块）                                                                                             |
| 41  | `sanitizeReplayHistory`           | 在通用转录清理之后重写回放历史                                                                                      | 提供者需要超出共享压缩辅助工具之外的提供者特定回放重写                                                                                         |
| 42  | `validateReplayTurns`             | 在嵌入式运行器之前进行最终回放轮次验证或重塑                                                                       | 提供者传输在通用清理之后需要更严格的轮次验证                                                                                                   |
| 43  | `onModelSelected`                 | 运行提供者拥有的选择后副作用                                                                                         | 当某个模型变为活动状态时，提供者需要遥测或提供者拥有的状态                                                                                     |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 会先检查
匹配到的提供者插件，然后继续回退到其他具备钩子能力的提供者插件，直到有某个插件真正改变模型 id 或传输/配置为止。这样可以让别名/兼容性提供者 shim 继续工作，而无需调用方知道哪个捆绑插件负责该重写。如果没有任何提供者钩子重写受支持的 Google 家族配置条目，捆绑的 Google 配置规范化器仍然会应用那种兼容性清理。

如果提供者需要完全自定义的线协议或自定义请求执行器，那就是另一类扩展。这些钩子面向仍然运行在 OpenClaw 正常推理循环上的提供者行为。

### 提供者示例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
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
          models: [{ id: "auto", name: "Auto" }],
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

- `textToSpeech` 会返回用于文件/语音备注界面的标准核心 TTS 输出载荷。
- 使用核心 `messages.tts` 配置和提供方选择。
- 返回 PCM 音频缓冲区 + 采样率。插件必须针对提供方进行重采样/编码。
- `listVoices` 是按提供方可选的。可用于供应商自有的语音选择器或设置流程。
- 语音列表可以包含更丰富的元数据，例如地区、性别和个性标签，以便为感知提供方的选择器提供支持。
- OpenAI 和 ElevenLabs 目前支持电话场景。Microsoft 不支持。

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
  model: "gpt-5.5",
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

- `api.runtime.mediaUnderstanding.*` 是用于
  图像/音频/视频理解的首选共享接口。
- `extractStructuredWithModel(...)` 是面向插件的受限
  供应商拥有的图像优先抽取接缝。至少包含一个图像输入；
  文本输入只是补充上下文。
  产品插件拥有它们的路由和 schema，而 OpenClaw 拥有
  提供方/运行时边界。
- 使用核心媒体理解音频配置（`tools.media.audio`）和提供方回退顺序。
- 当未生成任何转写输出时返回 `{ text: undefined }`（例如跳过/不支持的输入）。
- `api.runtime.stt.transcribeAudioFile(...)` 仍作为兼容别名保留。

插件还可以通过 `api.runtime.subagent` 启动后台子代理运行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "将此查询扩展为聚焦的后续搜索。",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

注释：

- `provider` 和 `model` 是每次运行可选的覆盖项，而不是持久的会话更改。
- OpenClaw 仅对受信任的调用方接受这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须显式开启 `plugins.entries.<id>.subagent.allowModelOverride: true`。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 可将受信任插件限制为特定的规范 `provider/model` 目标，或使用 `"*"` 明确允许任意目标。
- 不受信任的插件子代理运行仍然可以工作，但覆盖请求会被拒绝，而不是静默回退。
- 插件创建的子代理会话会标记为创建它们的插件 id。兼容的 `api.runtime.subagent.deleteSession(...)` 只能删除这些归属会话；任意会话删除仍需要管理员范围的 Gateway 请求。

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

- `path`：Gateway HTTP 服务器下的路由路径。
- `auth`：必填。使用 `"gateway"` 需要普通 Gateway 认证，或使用 `"plugin"` 进行插件管理的认证/ webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其自己的现有路由注册。
- `handler`：当路由已处理请求时返回 `true`。

注释：

- `api.registerHttpHandler(...)` 已被移除，会导致插件加载错误。请改用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 精确的 `path + match` 冲突会被拒绝，除非使用 `replaceExisting: true`，且一个插件不能替换另一个插件的路由。
- 不同 `auth` 级别的重叠路由会被拒绝。仅在相同 auth 级别上保留 `exact`/`prefix` 兜底链。
- `auth: "plugin"` 路由不会自动接收操作员运行时范围。它们用于插件管理的 webhooks/签名验证，而不是特权的 Gateway 辅助调用。
- `auth: "gateway"` 路由运行在 Gateway 请求运行时范围内，但该范围是有意保守的：
  - 共享密钥 bearer 认证（`gateway.auth.mode = "token"` / `"password"`）会将插件路由运行时范围固定为 `operator.write`，即使调用方发送了 `x-openclaw-scopes` 也是如此
  - 受信任的、带身份的 HTTP 模式（例如 `trusted-proxy`，或私有入口上的 `gateway.auth.mode = "none"`）仅在显式存在该头时才接受 `x-openclaw-scopes`
  - 如果这些带身份的插件路由请求中缺少 `x-openclaw-scopes`，运行时范围会回退到 `operator.write`
- 实用规则：不要把 gateway-auth 插件路由当作隐式管理员入口。如果你的路由需要仅管理员行为，请要求使用带身份的认证模式，并记录显式的 `x-openclaw-scopes` 头部契约。

## Plugin SDK 导入路径

在编写新插件时，请使用更窄的 SDK 子路径，而不是单体的 `openclaw/plugin-sdk` 根 barrel。核心子路径：

| 子路径                              | 用途                                               |
| ----------------------------------- | -------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | 插件注册原语                                       |
| `openclaw/plugin-sdk/channel-core`  | 通道入口/构建辅助工具                                |
| `openclaw/plugin-sdk/core`          | 通用共享辅助工具和总括契约                           |
| `openclaw/plugin-sdk/config-schema` | 根 `openclaw.json` Zod 模式（`OpenClawSchema`） |

Channel plugins 从一组更窄的接缝中选择——`channel-setup`、
`setup-runtime`、`setup-tools`、`channel-pairing`、
`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-lifecycle`、
`channel-reply-pipeline`、`command-auth`、`secret-input`、`webhook-ingress`、
`channel-targets` 和 `channel-actions`。审批行为应当集中
在单个 `approvalCapability` 合约上，而不是分散到无关的
插件字段中。参见 [Channel plugins](/plugins/sdk-channel-plugins)。

运行时和配置辅助工具位于对应的聚焦 `*-runtime` 子路径下
（`approval-runtime`、`agent-runtime`、`lazy-runtime`、`directory-runtime`、
`text-runtime`、`runtime-store`、`system-event-runtime`、`heartbeat-runtime`、
`channel-activity-runtime` 等）。优先使用 `config-contracts`、
`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation`，
而不是宽泛的 `config-runtime` 兼容 barrel。

<Info>
`openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/config-runtime`，
以及 `openclaw/plugin-sdk/infra-runtime` 是为旧插件保留的已弃用兼容 shim。新代码应改为导入更窄的通用原语。
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

- `presentation`：用于语义化展示块（`text`、`context`、`divider`、`buttons`、`select`）
- `delivery-pin`：用于置顶投递请求

Core 决定是原生渲染该展示，还是将其降级为文本。不要通过通用消息工具暴露 provider 原生 UI 的逃生通道。面向旧版原生架构的已弃用 SDK 辅助函数仍会导出，以兼容现有第三方插件，但新插件不应使用它们。

## 渠道目标解析

渠道插件应拥有渠道特定的目标语义。保持共享的 outbound host 通用化，并使用 messaging adapter 接口来处理 provider 规则：

- `messaging.inferTargetChatType({ to })` 在目录查找前决定归一化后的目标应被视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉 core 输入是否应直接跳过目录搜索，进入类 id 的解析。
- `messaging.targetResolver.resolveTarget(...)` 是插件级回退逻辑，在 core 在归一化之后或目录未命中之后需要进行最终的 provider 拥有的解析时使用。
- `messaging.resolveOutboundSessionRoute(...)` 在目标解析完成后负责构建 provider 特定的会话路由。

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
`api.registerModelCatalogProvider({ provider, kinds, staticCatalog, liveCatalog })` 发布只读模型行。这是列表/帮助/选择器界面的前进路径，并支持 `text`、`image_generation`、`video_generation` 和 `music_generation` 行。provider 插件仍然拥有实时端点调用、令牌交换和供应商响应映射；core 拥有通用行形状、来源标签和媒体工具帮助格式。媒体生成 provider 注册会根据 `defaultModel`、`models` 和 `capabilities` 自动生成静态目录行。

兼容性：

- `discovery` 仍然作为旧别名可用，但会发出弃用警告
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 会使用 `catalog`
- `augmentModelCatalog` 已弃用；打包的 provider 应通过 `registerModelCatalogProvider` 发布补充行

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

插件目录可以包含带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每个条目都会成为一个插件。如果该包列出多个扩展，插件 id 变为 `name/<fileBase>`。

如果你的插件导入 npm 依赖，请在该目录中安装它们，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全护栏：每个 `openclaw.extensions` 条目在符号链接解析后必须仍位于插件目录内。逃出包目录的条目会被拒绝。

安全提示：`openclaw plugins install` 使用项目本地的 `npm install --omit=dev --ignore-scripts` 安装插件依赖（运行时没有生命周期脚本、没有 dev 依赖），并忽略继承来的全局 npm 安装设置。请保持插件依赖树“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个轻量级的仅 setup 模块。当 OpenClaw 需要已禁用渠道插件的 setup 界面，或者当渠道插件已启用但仍未配置时，它会加载 `setupEntry` 而不是完整插件入口。这样可以在主插件入口也连接工具、hooks 或其他仅运行时代码时，让启动和 setup 更轻量。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以让渠道插件在 gateway 的预监听启动阶段进入同样的 `setupEntry` 路径，即使该渠道已经配置完成。

仅当 `setupEntry` 完整覆盖了 gateway 开始监听前必须存在的启动面时才使用此项。实际上，这意味着 setup 入口必须注册 startup 所依赖的每一个渠道拥有的能力，例如：

- 渠道注册本身
- gateway 开始监听前必须可用的任何 HTTP 路由
- 在同一窗口中必须存在的任何 gateway 方法、工具或服务

如果你的完整入口仍然拥有任何必需的启动能力，请不要启用此标志。保持插件使用默认行为，并让 OpenClaw 在启动期间加载完整入口。

捆绑渠道还可以发布仅 setup 的 contract-surface 辅助函数，core 可以在完整渠道运行时加载前查询这些函数。当前的 setup 提升 surface 是：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

当 core 需要在不加载完整插件入口的情况下，将旧的单账户渠道配置提升为 `channels.<id>.accounts.*` 时，会使用该 surface。Matrix 是当前的捆绑示例：当已存在命名账户时，它只会把 auth/bootstrap 键移动到已命名的提升账户中，并且可以保留一个已配置的非规范默认账户键，而不是始终创建 `accounts.default`。

这些 setup 补丁适配器保持了捆绑 contract-surface 发现的惰性。导入时保持轻量；promotion surface 只在首次使用时加载，而不是在模块导入时重新进入捆绑渠道的启动流程。

当这些启动 surface 包含 gateway RPC 方法时，请将它们放在插件专属前缀下。core 管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）仍然保留，并且始终解析为 `operator.admin`，即使插件请求了更窄的作用域。

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

### 渠道目录元数据

渠道插件可以通过 `openclaw.channel` 宣告 setup/discovery 元数据，并通过 `openclaw.install` 提供安装提示。这使 core 目录保持无数据状态。

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
      "blurb": "通过 Nextcloud Talk webhook bots 提供自托管聊天。",
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

除最小示例之外，`openclaw.channel` 还有一些有用字段：

- `detailLabel`：用于更丰富目录/状态界面的次级标签
- `docsLabel`：覆盖文档链接的链接文本
- `preferOver`：此目录条目应优先于哪些低优先级插件/渠道 id
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：选择界面的文案控制
- `markdownCapable`：将渠道标记为支持 markdown，用于出站格式化决策
- `exposure.configured`：设为 `false` 时，从已配置渠道列表界面隐藏该渠道
- `exposure.setup`：设为 `false` 时，从交互式 setup/configure 选择器中隐藏该渠道
- `exposure.docs`：将该渠道在文档导航界面中标记为内部/私有
- `showConfigured` / `showInSetup`：仍接受的旧版别名；优先使用 `exposure`
- `quickstartAllowFrom`：让渠道进入标准 quickstart 的 `allowFrom` 流程
- `forceAccountBinding`：即使只有一个账户也要求显式账户绑定
- `preferSessionLookupForAnnounceTarget`：解析 announce 目标时优先使用会话查找

OpenClaw 还可以合并**外部渠道目录**（例如 MPM registry 导出）。将 JSON 文件放在以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 键的旧版别名。

生成的渠道目录条目和 provider 安装目录条目，会在原始 `openclaw.install` 块旁边暴露归一化后的安装源事实。归一化事实会标识 npm spec 是精确版本还是浮动选择器、是否存在预期的完整性元数据，以及是否也可用本地源路径。当目录/包身份已知时，归一化事实会在解析出的 npm 包名与该身份不一致时发出警告。当 `defaultChoice` 无效或指向不可用来源时，以及当 npm 完整性元数据存在但没有有效 npm 来源时，它们也会发出警告。消费者应将 `installSource` 视为附加的可选字段，这样手工构建的条目和目录 shim 就不必自行合成它。
这使 onboarding 和诊断可以解释 source-plane 状态，而无需导入插件运行时。

官方外部 npm 条目应优先使用精确的 `npmSpec` 加上 `expectedIntegrity`。裸包名和 dist-tag 仍可用于兼容性，但它们会暴露 source-plane 警告，以便目录能朝着固定版本、带完整性校验的安装方式演进，而不破坏现有插件。当从本地目录路径进行 onboarding 安装时，它会记录一个受管理的插件索引条目，包含 `source: "path"`，并在可能时使用相对于工作区的 `sourcePath`。绝对的运行加载路径仍保留在 `plugins.load.paths` 中；安装记录避免将本地工作站路径重复写入长期配置。这样既能让本地开发安装对 source-plane 诊断可见，又不会新增第二个原始文件系统路径披露面。持久化的 `plugins/installs.json` 插件索引是安装源的事实来源，且无需加载插件运行时模块即可刷新。即使插件 manifest 缺失或无效，其 `installRecords` 映射仍是持久的；其 `plugins` 数组则是可重建的 manifest 视图。

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
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
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

如果你的引擎**不**负责压缩算法，请保持 `compact()` 的实现，并显式委托给运行时：

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
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
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

1. 定义核心契约  
   决定核心应负责哪些共享行为：策略、回退、配置合并、生命周期、面向通道的语义，以及运行时辅助函数的形状。
2. 添加带类型的插件注册/运行时表面  
   在 `OpenClawPluginApi` 和/或 `api.runtime` 上扩展最小且有用的类型化能力表面。
3. 连接 core + channel/feature 消费方  
   通道和功能插件应通过 core 消费新能力，而不是直接导入某个厂商实现。
4. 注册厂商实现  
   然后由厂商插件针对该能力注册其后端实现。
5. 添加契约覆盖  
   添加测试，使所有权和注册形式能够长期保持明确。

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
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

契约测试模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
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
