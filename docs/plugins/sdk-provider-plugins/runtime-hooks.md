---
summary: "每个钩子提供者用于身份验证交换、标头、传输标识、用法和钩子顺序表的连接"
read_when:
  - "您需要令牌交换、自定义标头或本机传输身份"
  - "您正在暴露提供商的使用情况和计费数据"
  - "您需要提供程序挂钩顺序表和运行时后备注释"
title: "供应商挂钩接线"
sidebarTitle: "挂钩接线"
---

当家庭构建者不涵盖该行为时，连接个人提供商挂钩。 [构建提供商插件](/plugins/sdk-provider-plugins)指南的一部分；从共享构建器的 [Provider 钩子系列 ](/plugins/sdk-provider-plugins/hook-families) 开始。

## <a id="model-route-policy"></a> 模型路由策略

轻量级 `provider-policy-api` 工件通过 `resolveModelRoutes` 解析模型路由。其上下文和结果类型由 `openclaw/plugin-sdk/provider-model-types` 导出。

`ProviderResolveModelRoutesContext.routeIntent` 承载着准备好的、无秘密的消费者意图：可选的 `runtimeId`、可选的 `authRequirement`（`"subscription"` 或 `"api-key"`）和 `source`（`"explicit"` 或 `"inherited"`）。主机项目现有 model/provider 策略和继承的代理默认值；插件不得重新加载配置或凭据来重建它。这一事实不会授予凭证访问权限或更改哪些运行时可以执行路由。

`ProviderModelRouteResolution` 和 `kind: "routes"` 可以设置 `preferredAuthRequirement`。仅当两个身份验证类别都具有合格的配置文件并且自动选择时，Core 才会应用该首选项。准备和可用性应用相同的优先级：所需的消费者或提供商配置文件绑定选择帐户；配置的提供商身份验证限制自动选择该计费路由；显式身份验证顺序对剩余的合格配置文件进行排名。继承的 `routeIntent` 和 `preferredAuthRequirement` 仅在这些选择后打破平局。环境凭证提供后备材料，无需清除配置的身份验证；仅当未配置模式时才会推断其模式。首选项不会创建凭证或使不可用或冷却时间受阻的配置文件符合资格。单类选择保持其现有行为。

候选顺序与凭证优先级保持分离，并且 `runtimePolicy.compatibleIds` 继续描述执行兼容性。例如，OpenAI 使用旧的官方 Completions 适配器使两种路由都可用于受支持的模型，当两种路由都符合条件时首选订阅身份验证，并遵循显式的 API 路由意图。这些是现有合同的附加字段；他们不添加任何钩子或用户设置。

## <a id="credential-lookup-cancellation"></a> 凭证查找取消

使用 `openclaw/plugin-sdk/provider-auth-runtime` 中的 `resolveApiKeyForProvider` 的凭证使用者应传递其请求的可选 `signal`。它结束调用者对排队准入、配置文件锁定或 OAuth 结算的等待，而不是已声明刷新的凭证写入。开始的锁获取通过清理仍然拥有。保留不丢失的身份验证错误，而不是将每个失败转换为缺失的 API 密钥。

`openclaw/plugin-sdk/extension-shared` 中的 `buildTimeoutAbortSignal` 将呼叫者信号与操作超时结合在一起。当认证共享请求预算时，在凭证准备之前启动它，并在`finally`中调用其`cleanup`来释放定时器。

## <a id="oauth-refresh-configuration"></a> OAuth 刷新配置

`refreshOAuth(credential, config)` 接收调用者的有效 OpenClaw 配置作为可选的第二个参数。使用捕获的配置进行检查，例如区域端点兼容性，而不是重新加载全局运行时配置。现有的单参数挂钩保持兼容，直接调用者可以省略配置。

## <a id="hook-examples"></a> 示例

<Tabs>
  <Tab id="token-exchange" title="代币兑换">
    对于需要在每次推理调用前进行 token 交换的提供方：

    ```typescript
    prepareRuntimeAuth: async (ctx) => {
      const exchanged = await exchangeToken(ctx.apiKey);
      return {
        apiKey: exchanged.token,
        baseUrl: exchanged.baseUrl,
        expiresAt: exchanged.expiresAt,
      };
    },
    ```

  </Tab>
  <Tab id="custom-headers" title="自定义标头">
    对于需要自定义请求头或请求体修改的提供方：

    ```typescript
    // wrapStreamFn returns a StreamFn derived from ctx.streamFn
    wrapStreamFn: (ctx) => {
      if (!ctx.streamFn) return undefined;
      const inner = ctx.streamFn;
      return (model, context, options) =>
        inner(model, context, {
          ...options,
          headers: {
            ...options?.headers,
            "X-Acme-Version": "2",
          },
        });
    },
    ```

    现有包装器可能仍会传递已弃用的 `maxRetries` 流选项，包括 `0`。内置文本传输会忽略它：嵌入式运行器拥有重试预算，并且 SDK- 内部重试保持禁用状态。新的包装器应省略该选项。此已发布的源合同将保留，直到单独宣布的普通稳定版本和已发布的插件读者扫描确认删除是安全的；它不会更改图像生成或本机运行时重试策略。

  </Tab>
  <Tab id="native-transport-identity" title="本地传输身份">
    对于需要通用 HTTP 或 WebSocket 传输上的本机​​ request/session 标头或元数据的提供商：

    ```typescript
    resolveTransportTurnState: (ctx) => ({
      headers: {
        "x-request-id": ctx.turnId,
      },
      metadata: {
        session_id: ctx.sessionId ?? "",
        turn_id: ctx.turnId,
      },
      websocket: {
        headers: {
          "x-session-id": ctx.sessionId ?? "",
        },
        degradeCooldownMs: 60_000,
      },
    }),
    ```

    较旧的 `resolveWebSocketSessionPolicy` 挂钩仍受支持，但已弃用。将其字段移至 `resolveTransportTurnState.websocket` 下；在迁移过程中，新挂钩中的字段优先。该挂钩仅带有 TypeScript `@deprecated` 注释：它没有兼容性注册表记录，因此没有发布的删除日期。请参阅 [ 移除时间线 ](/plugins/sdk-migration/removal-timeline) 了解执行此操作的表面。

  </Tab>
  <Tab id="usage-and-billing" title="使用和计费">
    对于公开 usage/billing 数据的提供者：

    ```typescript
    resolveUsageAuth: async (ctx) => {
      const auth = await ctx.resolveOAuthToken();
      return auth ? { token: auth.token } : null;
    },
    fetchUsageSnapshot: async (ctx) => {
      // fetchAcmeUsage is your plugin's own vendor API call, not an SDK export.
      return await fetchAcmeUsage(ctx.token, ctx.timeoutMs, {
        fetch: ctx.fetchFn,
        signal: ctx.signal,
      });
    },
    ```

    两个使用挂钩都会收到一个可选的 `ctx.signal` 用于取消收集。 `ctx.fetchFn` 已经将其与请求取消结合起来；自定义传输必须将 `ctx.signal` 转发到其 I/O. 检查取消，然后在等待后开始额外的身份验证工作。耗尽的预算不会调用任何一个钩子并生成可见的 `Timeout` 快照。 Core 保留已完成的同级，并通过清理跟踪未完成的工作，包括身份验证拥有的凭据刷新。

    `resolveUsageAuth` 具有三种结果。当提供者具有 usage/billing 凭证时，返回 `{ token, accountId?, subscriptionType?, rateLimitTier? }`（可选字段将非秘密计划元数据从解析的配置文件携带到 `fetchUsageSnapshot`）。仅当提供者已明确处理使用授权但没有可用的使用令牌时才返回 `{ handled: true }`，并且 OpenClaw 必须跳过通用 API-key/OAuth 回退。当提供者未处理请求时返回 `null` 或 `undefined`，并且 OpenClaw 应继续使用通用回退。

    在 `contracts.usageProviders` 中声明提供方 id。当清单契约和**两个**钩子都存在时，OpenClaw 会自动将该提供方纳入用量收集，而无需加载无关的提供方插件。不需要更新核心允许列表。`fetchUsageSnapshot` 返回共享的、与提供方无关的结构：

    - `plan`：提供方报告的订阅或密钥标签
    - `windows`：以使用百分比表示的可重置配额窗口
    - `billing`：类型化的 `balance`、`spend` 或 `budget` 条目；`unit` 可以是 ISO 货币，也可以是 `credits` 等提供方单位
    - `summary`：无法放入上述结构化字段的紧凑型提供方特定上下文

    保持货币语义准确。除非上游合同另有规定，否则提供商信用不是 USD。仅实现 `fetchUsageSnapshot` 的插件仍然可供 explicit/synthetic 调用者使用，但不会自动发现，因为 OpenClaw 无法解析其使用凭证。

  </Tab>
</Tabs>

仅当 `createStreamFn` 传输了解 stable/dynamic 系统提示边界时，才在提供程序注册上设置 `supportsSystemPromptCacheBoundary: true`。使用 `openclaw/plugin-sdk/provider-transport-runtime` 中的 `splitSystemPromptCacheBoundary` 单独检查稳定前缀，并在发送任何有效负载之前消耗标记。禁用缓存时使用 `stripSystemPromptCacheBoundary`。默认情况下，OpenClaw 在调用自定义传输之前删除标记。

Google- 系列传输可以使用同一运行时入口点的 `buildGoogleSimpleThinking` 和 `buildGoogleGenerationConfig`。他们共享Gemini/Vertex的思维策略，包括输出代币预留；在序列化请求之前，传递调用者的原始 `maxTokens` 一次。

对于累积 JSON 工具参数的自定义 `createStreamFn` 传输，请使用 `openclaw/plugin-sdk/llm` 中的 `createToolArgumentPreviewSchedule()`。每个工具调用创建一个计划，并在调用 `parseStreamingJson` 之前将累积的原始字符串长度传递给它。返回的函数允许在几何增长检查点进行预览刷新，因此中间 `arguments` 快照可以在原始片段到达时保持不变。继续发出每个原始增量并在传输的终端边界验证完整的参数，即使上次预览未刷新也是如此。

<Accordion id="common-provider-hooks" title="常见的提供者挂钩">
  OpenClaw 大致按此顺序调用 model/provider 插件的钩子。大多数提供商仅使用 2-3 个。这不是完整的 `ProviderPlugin` 合约 - 请参阅 [Internals：Provider Runtime Hooks](/plugins/architecture-internals#provider-runtime-hooks) 以获取完整的、当前准确的挂钩列表和后备注释。 OpenClaw 不再调用的仅兼容提供程序字段，例如 `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`，此处未列出。

保持 `resolveSyntheticAuth` 同步和有界。外部 process/network 登录检查属于 `prepareSyntheticAuth`，它接收捕获的配置、环境和取消信号，并返回综合身份验证结果或不返回结果。 OpenClaw 在该准备代中保留完整的可用性。只读工作线程接收最终的提供者引用结果（包括不可用），保留别名优先级而无需重新运行外部检查。取消的准备必须在清理后拒绝，而不是报告丢失的登录。

| 钩子                              | 何时使用                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `catalog`                         | 模型目录或基础 URL 默认值                                                          |
| `applyConfigDefaults`             | 配置物化期间由提供方拥有的全局默认值                                |
| `normalizeModelId`                | Legacy/preview 查找前模型 ID 别名清理                                         |
| `normalizeTransport`              | 通用模型组装前清理提供方家族的 `api` / `baseUrl`                     |
| `normalizeConfig`                 | 规范化 `models.providers.<id>` 配置                                                    |
| `applyNativeStreamingUsageCompat` | 面向配置提供方的原生流式用量兼容重写                                 |
| `resolveConfigApiKey`             | 解析由提供方拥有的环境标记认证                                                   |
| `resolveSyntheticAuth`            | Local/self-hosted 或配置支持的合成身份验证                                           |
| `prepareSyntheticAuth`            | 在同步可用性读取之前异步验证外部身份验证                   |
| `resolveExternalAuthProfiles`     | 覆盖 CLI/app-managed 凭证的提供商拥有的外部身份验证配置文件               |
| `shouldDeferSyntheticProfileAuth` | env/config auth 后面的较低合成存储配置文件占位符                          |
| `resolveDynamicModel`             | 接受任意上游模型 ID                                                         |
| `prepareDynamicModel`             | 在同步解析之前返回异步发现的模型或热可重用元数据 |
| `normalizeResolvedModel`          | 在运行器之前执行传输重写                                                        |
| `normalizeToolSchemas`            | 注册前执行由提供方拥有的工具 schema 清理                                      |
| `inspectToolSchemas`              | 由提供方拥有的工具 schema 诊断                                                      |
| `resolveReasoningOutputMode`      | 带标签与原生 reasoning-output 契约                                                  |
| `prepareExtraParams`              | 默认请求参数                                                                      |
| `createStreamFn`                  | 完全自定义的 StreamFn 传输                                                             |
| `wrapStreamFn`                    | 正常流路径上的自定义 headers/body 包装器                                      |
| `reconcileLocalService`           | 廉价的托管服务修复可以在健康之后和每次请求之前安全地重复           |
| `resolveTransportTurnState`       | 本机每圈 headers/metadata 和 WebSocket headers/cool-down                            |
| `resolveWebSocketSessionPolicy`   | 已弃用的 WebSocket 兼容钩子；请使用 `resolveTransportTurnState`                    |
| `formatApiKey`                    | 自定义运行时令牌结构                                                                  |
| `loginOAuth`                      | 基于回调的 OAuth 会话登录 SDK `AuthStorage` API                            |
| `refreshOAuth`                    | 自定义 OAuth 刷新                                                                        |
| `buildAuthDoctorHint`             | 认证修复指导                                                                        |
| `matchesContextOverflowError`     | 由提供方拥有的溢出检测                                                           |
| `classifyFailoverReason`          | 提供商拥有率-limit/overload分类                                           |
| `isCacheTtlEligible`              | 提示词缓存 TTL 门控                                                                     |
| `buildMissingAuthMessage`         | 自定义缺少认证提示                                                                    |
| `augmentModelCatalog`             | Synthetic 前向兼容行（已弃用 - 更喜欢 `registerModelCatalogProvider`）          |
| `resolveThinkingProfile`          | 特定模型的 `/think` 选项集                                                          |
| `isBinaryThinking`                | 二进制思维 on/off 兼容性（已弃用 - 更喜欢 `resolveThinkingProfile`）         |
| `supportsXHighThinking`           | `xhigh` reasoning 支持兼容性（已弃用——优先使用 `resolveThinkingProfile`）      |
| `resolveDefaultThinkingLevel`     | 默认 `/think` 策略兼容性（已弃用 - 更喜欢 `resolveThinkingProfile`）        |
| `isModernModelRef`                | Live/smoke模型匹配                                                                   |
| `prepareRuntimeAuth`              | 推理前的令牌交换                                                             |
| `resolveUsageAuth`                | 自定义用量凭据解析                                                             |
| `fetchUsageSnapshot`              | 自定义用量端点                                                                       |
| `createEmbeddingProvider`         | 适用于 memory/search 的提供商自有嵌入适配器                                          |
| `buildReplayPolicy`               | 自定义成绩单 replay/compaction 政策                                                  |
| `sanitizeReplayHistoryAsync`      | 通用清理后，特定于提供者的重播会使用等待的转录元数据进行重写    |
| `sanitizeReplayHistory`           | 已弃用的第三方重播兼容性挂钩；迁移到 `sanitizeReplayHistoryAsync`   |
| `validateReplayTurns`             | 嵌入式运行器之前的严格 replay 回合验证                                    |
| `onModelSelected`                 | 选择后回调（e.g. 遥测）                                                    |

`reconcileLocalService` 仅针对已配置的本地服务调用，包括由重新启动的网关重用的健康进程。当协调失败时，尊重其中止信号并拒绝； OpenClaw 阻止提供者请求并释放请求租约。

运行时回退说明：

- `isCacheTtlEligible(ctx)` 接收 `provider`、`modelId`、可选的 `modelApi` 以及解析的路由事实 `baseUrl` 和 `supportsPromptCacheKey`。安装cache-TTL修剪和记录缓存触摸时使用相同的有界上下文；它不包括完整的模型、标头或额外的请求参数。 OpenAI 默认在官方平台和 Codex 端点上符合资格，遵循显式 `supportsPromptCacheKey: false`，并需要显式选择加入自定义代理路由。这控制客户端空闲修剪，而不是保证提供者缓存命中。
- Error 分类使用准备好的提供程序所有者或已加载的提供程序挂钩。 `matchesContextOverflowError` 和 `classifyFailoverReason` 在处理错误时永远不会触发插件发现；提供者的准备工作负责加载这些钩子。
- Config 程序集仅通过拥有的捆绑提供程序的轻量级策略表面调用 `normalizeConfig`，而无需加载提供程序运行时或扫描其他提供程序。 Google 自己的钩子通过该表面规范 `google` / `google-vertex` / `google-antigravity` 配置条目。
- Config 程序集同样使用 `resolveConfigApiKey` 的轻量级策略表面。 Amazon Bedrock 在其提供程序插件中保留 AWS 环境标记解析；当使用 `auth: "aws-sdk"` 配置时，运行时身份验证本身仍然使用 AWS SDK 默认链。
- `resolveThinkingProfile(ctx)` 接收选定的 `provider`、`modelId`、可选的目录路线事实 `api` 和 `baseUrl`、可选的合并的 `reasoning` 目录提示以及可选的合并模型 `compat` 事实。仅使用`compat`来选择提供商的思维UI/profile.
- 当提供者具有首选嵌入摘要工作时，`normalizeResolvedModel(ctx)` 可以在返回的 `ProviderRuntimeModel` 上设置 `compactionThinkingDefault`。这是准备好的运行时元数据，而不是操作员设置或目录字段。显式 `agents.defaults.compaction.thinkingLevel` 优先；否则主机使用此首选项，然后使用 `low`。所选择的努力仍然受限于实际的压缩候选。
- `resolveSystemPromptContribution` 允许提供商为模型系列注入缓存感知系统提示指导。当行为属于一个 provider/model 系列并且应该保留 stable/dynamic 缓存拆分时，优先使用它而不是传统插件范围的 `before_prompt_build` 挂钩。

捆绑的 HTTP 适配器可以保留来自私有本地 `openclaw/plugin-sdk/provider-http` 入口点的 `createProviderHttpError` 的数字响应状态。已绑定并编辑其诊断的适配器可以构造 `ProviderHttpError(message, { status })`。调整其消息时保留该错误实例，以便状态和重试元数据得以保留；搜索工具使用这些字段进行安全身份验证和配额指导，而无需暴露响应机构。

同一入口点公开 `runHttpTlsPreflight(url, options)` 用于非重定向可达性探测。它将证书故障与其他网络故障区分开来，接受取消和当前权限回调，并请求尽力取消未读响应正文。任何 HTTP 状态表示端点可达；这不是凭证或帐户检查。

捆绑且受信任的官方提供商策略可以使用私人 `openclaw/plugin-sdk/provider-thinking-runtime` 帮助程序中的 `resolveEffortThinkingProfile(compat?.supportedReasoningEfforts)`。它接受精确的 `off`、`minimal`、`low`、`medium`、`high`、`xhigh` 和 `max` 值，将 `none` 映射到 `off`，并且在前面添加 `off`，同时保留每个剩余级别的第一次出现。默认首选项为 `medium`、`high`、`low`，然后是 `off`。元数据丢失、为空或为空返回 `undefined`；没有支持值的非空列表返回仅关闭的配置文件。在提供程序策略中保留特定于模型的覆盖和 API 后备。

提供程序流适配器可以从 `openclaw/plugin-sdk/llm` 调用 `resolveOpenAIRequestReasoning(model, level)`，以通过共享传输所有者解决声明的工作、本机标签映射、逻辑关闭和标量工作禁用。将其 `effort` 和 `thinkingEnabled` 结果转换为提供商的有线方言，而不是定义另一个工作量阶梯。在返回到包装器上下文之前，从每个流调用的选项中读取级别。

捆绑且受信任的官方插件还可以从其轻量级 `provider-policy-api` 工件导出 `resolveToolSearchMode(ctx)`。上下文包含最终的`provider`、`modelId`、`api`和可选的`baseUrl`；其类型是从 `openclaw/plugin-sdk/provider-model-types` 导出的。返回 `"tools"` 以首选结构化工具搜索，返回 `false` 以否决托管本地服务默认值，或返回 `undefined` 以将该决定留给主机。主机将结果记录在解析的运行时模型上，而不是写入配置。显式 `tools.toolSearch` 设置优先。此挂钩更改架构公开，而不是工具权限或可用性。

当提供商提供托管搜索时，可以从同一策略工件导出 `resolveNativeWebSearch(ctx)`。其 `ProviderNativeWebSearchPolicyContext`（从 `openclaw/plugin-sdk/provider-model-types`）包含 `config`、`provider`、可选 `modelId`、`api` 和 `baseUrl`。仅当该路由将注入托管搜索时才返回 `true`；与有效载荷建设共享此政策。保持钩子同步并且不受运行时激活或凭证检查的影响。主机独立应用工具权限，并在构建工具搜索和代码模式目录之前删除托管 `web_search`。明确的托管提供商选择必须保持权威。

`resolveFastModeSupport(ctx)` 可以从同一策略工件导出并在提供程序上注册。仅针对已确认的无操作快速选择返回 `false`，针对适用的本地请求映射返回 `true`，或者在缺少事实时返回 `undefined`。 `ProviderFastModePolicyContext`携带选择的模型、路由、认证模式、运行时间、请求参数和传输策略；不包括凭据。与请求构建共享策略。主机仅发布 `supportsFastMode`，保留未知行为并清除已保存的首选项。这描述了本地适用性，而不是上游权利或履行，并且不拒绝 `/fast` 命令。

`resolveServiceTiers(ctx)` 可以通过相同的轻量级工件和提供者注册来发布已知的 model/route 层限制。收到`ProviderFastModePolicyContext`；当提供者没有添加限制时返回 `undefined`。 API-key OpenAI 响应目录将返回的列表与帐户观察或其路由默认值相交，将 `"default"` 保留为标准处理。 `false` 快速功能与 `["default"]` 一起使 Control UI 保持在禁用的标准控件上，而不会混淆显式配置的层与模型限制。与提供商请求构建者共享此能力决策；它本身不会改变配置或授予访问权限。

</Accordion>
