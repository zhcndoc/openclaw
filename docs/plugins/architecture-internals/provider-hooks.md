---
summary: "提供者挂钩顺序表、工作提供者示例、捆绑的挂钩形状和模型目录注册"
read_when:
  - "实现提供者运行时挂钩"
  - "您需要模型提供程序插件的挂钩顺序和决策指南"
  - "您正在从插件发布模型目录行"
title: "提供程序运行时挂钩和目录"
sidebarTitle: "提供商挂钩和目录"
---

三个提供程序层、完整的钩子顺序表、工作的提供程序示例、捆绑的钩子形状以及提供程序目录如何合并。 [插件架构内部](/plugins/architecture-internals)指南的一部分。

## <a id="provider-runtime-hooks"></a> 提供方运行时钩子

提供方插件有三层：

- **Manifest 元数据**，用于运行时前的低成本查找： `setup.providers[].envVars`、`providerAuthAliases`、`providerAuthChoices` 和 `channelConfigs`。
- **配置时钩子**：`catalog` 以及 `applyConfigDefaults`。
- **运行时钩子**：40 多个可选钩子，涵盖身份验证、模型解析、 流包装、思考级别、重放策略和用量端点。请参阅 [钩子顺序和用法](#hook-order-and-usage)。

OpenClaw 仍然负责通用的代理循环、故障切换、转录处理和工具策略。 这些钩子是面向提供方特定行为的扩展接口，而不需要完全自定义的推理传输。

挂钩查找首先使用准备好的生成或匹配的加载注册表。如果未命中，provider/model-scoped 发现会重用加载程序的注册表缓存；显式运行时发现失效会清除该查找，而不是让另一个提供者缓存保留旧的挂钩。尝试准备的提供程序句柄保留其选择的插件，而每个挂钩接收当前的调用上下文。

Synthetic-auth 查找包括来自声明的提供者或 CLI 后端所有者的仅身份验证发现条目。静态模型目录行不会替换这些身份验证实现。如果所有者未提供合成验证挂钩，则查找不会返回合成结果，而不会加载不相关的发现条目。对于没有声明所有者的别名，轻量级条目后备仍然可用。外部身份验证捕获仍然在只读工作人员工作之前准备新的结果。

当提供程序具有基于环境的凭据时，使用清单 `setup.providers[].envVars` 通用 auth/status/model-picker 路径应该在不加载插件运行时的情况下看到。当一个提供商 ID 应重用另一提供商 ID 的环境变量、身份验证配置文件、配置支持的身份验证和 API-key 入门选择时，请使用清单 `providerAuthAliases`。当 onboarding/auth-choice CLI 表面应该知道提供程序的选择 id、组标签和简单的单标志身份验证连接而不加载提供程序运行时时，请使用清单 `providerAuthChoices`。保留提供程序运行时 `envVars` 以用于面向操作员的提示，例如加入标签或 OAuth 客户端 id/client-secret 设置变量。

通过所属的 `channelConfigs.<id>.schema` 和设置描述符，描述由环境变量驱动的频道设置和身份验证。

### <a id="hook-order-and-usage"></a> 钩子顺序与使用

对于 model/provider 插件，OpenClaw 按此粗略顺序调用挂钩。 “何时使用”栏是快速决策指南。 OpenClaw 不再调用的仅兼容提供程序字段（例如 `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`）故意不在此处列出。

| 钩子                              | 它的作用                                                                                                   | 何时使用                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`                         | 在 `models.json` 生成期间将提供程序配置发布到 `models.providers`                                | 提供商拥有目录或基本 URL 默认值                                                                                                  |
| `applyConfigDefaults`             | 在配置具体化期间应用提供者拥有的全局配置默认值                                      | 默认值取决于认证模式、环境或提供者模型系列语义                                                                         |
| _（内置模型查找）_         | OpenClaw 首先尝试正常的 registry/catalog 路径                                                          | _（不是插件挂钩）_                                                                                                                         |
| `normalizeModelId`                | 在查找之前标准化旧版或预览模型 ID 别名                                                     | 提供者在标准化模型解析之前拥有别名清理                                                                                |
| `normalizeTransport`              | 在通用模型组装之前规范化提供商系列 `api` / `baseUrl`                                      | 提供商拥有同一传输系列中自定义提供商 ID 的传输清理功能                                                          |
| `normalizeConfig`                 | 在 runtime/provider 分辨率之前标准化 `models.providers.<id>`                                           | 提供程序需要进行配置清理，该清理应与所属插件一起使用                                                                         |
| `applyNativeStreamingUsageCompat` | 将原生流式用量兼容性重写应用于配置提供者                                               | 提供者需要由端点驱动的原生流式用量元数据修复                                                                          |
| `resolveConfigApiKey`             | 在运行时身份验证加载之前解决配置提供程序的环境标记身份验证                                       | 提供者公开自己的环境标记 API-key 解析挂钩                                                                                |
| `resolveSyntheticAuth`            | Surface local/self-hosted 或配置支持的身份验证，无需保留明文                                   | 提供商可以使用 synthetic/local 凭证标记进行操作                                                                                 |
| `resolveExternalAuthProfiles`     | 覆盖提供商拥有的外部身份验证配置文件；对于 CLI/app-owned 信用，默认 `persistence` 为 `runtime-only` | 提供者重用外部身份验证凭据，而不保留复制的刷新令牌；在清单中声明 `contracts.externalAuthProviders` |
| `shouldDeferSyntheticProfileAuth` | env/config-backed auth 后面存储的合成配置文件占位符较低                                      | 提供程序存储不应赢得优先级的合成占位符配置文件                                                                 |
| `resolveDynamicModel`             | 尚未在本地注册表中同步提供商拥有的模型 ID 的回退                                       | 提供者接受任意上游模型 ID                                                                                                 |
| `prepareDynamicModel`             | 在重试之前返回异步准备的模型或热可重用元数据 `resolveDynamicModel`       | 提供商在解析未知 ID 之前需要网络元数据                                                                                  |
| `normalizeResolvedModel`          | 在嵌入式运行器使用已解析模型前进行最终重写                                               | 提供者需要传输重写，但仍使用核心传输                                                                             |
| `normalizeToolSchemas`            | 在嵌入式运行器看到工具架构前规范化它们                                                    | 提供者需要传输系列的架构清理                                                                                                |
| `inspectToolSchemas`              | 在规范化后提供提供者拥有的架构诊断信息                                                  | 提供者希望提供关键字警告，而不必让核心了解提供者特定规则                                                                 |
| `resolveReasoningOutputMode`      | 选择本机与标记推理输出合约                                                              | 提供商需要标记 reasoning/final 输出而不是本机字段                                                                         |
| `prepareExtraParams`              | 在通用流选项包装器之前规范化请求参数                                              | 提供者需要默认请求参数或每个提供者的参数清理                                                                           |
| `createStreamFn`                  | 使用自定义传输完全替换正常的流路径                                                   | 提供者需要自定义线协议，而不仅仅是包装器                                                                                     |
| `wrapStreamFn`                    | 应用通用包装器后的流包装器                                                              | 提供商需要请求 headers/body/model 兼容包装器，无需自定义传输                                                          |
| `reconcileLocalService`           | 在本地服务运行状况之后和每个请求之前协调提供商拥有的状态                             | 托管本地路由器必须重新加载持久提供程序状态，而不将提供程序策略移至核心                                            |
| `resolveTransportTurnState`       | 附加原生的每轮标头、元数据或 WebSocket 策略                                                  | 提供者希望通用传输发送提供者原生的轮次标识，或调整 WebSocket 标头和回退冷却时间                      |
| `resolveWebSocketSessionPolicy`   | 已弃用的 WebSocket 策略兼容性钩子                                                             | 现有插件将 WebSocket 字段迁移到 `resolveTransportTurnState`                                                                    |
| `formatApiKey`                    | 认证配置文件格式化器：将已存储的配置文件转换为运行时的 `apiKey` 字符串                                     | 提供者存储额外的认证元数据，需要自定义的运行时令牌格式                                                                    |
| `refreshOAuth`                    | 用于自定义刷新端点或刷新失败策略的 OAuth 刷新覆盖                                  | 提供者不适用于共享的 OpenClaw 刷新器                                                                                          |
| `buildAuthDoctorHint`             | OAuth 刷新失败时附加的修复提示                                                                  | 提供者在刷新失败后需要提供者拥有的认证修复指导                                                                      |
| `matchesContextOverflowError`     | 提供者拥有的上下文窗口溢出匹配器                                                                 | 提供者存在通用启发式规则无法识别的原始溢出错误                                                                                |
| `classifyFailoverReason`          | 提供商拥有的故障转移原因分类                                                                  | 提供商可以将原始 API/transport 错误映射到速率 limit/overload/etc                                                                          |
| `isCacheTtlEligible`              | proxy/backhaul 提供商的提示缓存策略                                                               | 提供者需要代理特定的缓存 TTL 门控                                                                                                |
| `buildMissingAuthMessage`         | 替代通用的缺少认证恢复消息                                                      | 提供者需要特定于提供者的缺少认证恢复提示                                                                                 |
| `augmentModelCatalog`             | Synthetic/final 发现后附加的目录行（已弃用，见下文）                                  | 提供程序需要 `models list` 和选取器中的合成前向兼容行                                                                     |
| `resolveThinkingProfile`          | 模型特定的 `/think` 级别集合、显示标签和默认值                                                 | 提供者为选定模型提供自定义思考层级或二元标签                                                                 |
| `isBinaryThinking`                | On/off 推理切换兼容性钩子                                                                     | 提供者仅公开二进制思维 on/off                                                                                                  |
| `supportsXHighThinking`           | `xhigh` 推理支持兼容性钩子                                                                   | 提供者希望仅在部分模型上启用 `xhigh`                                                                                             |
| `resolveDefaultThinkingLevel`     | 默认 `/think` 级别兼容性钩子                                                                      | 提供者负责某个模型系列的默认 `/think` 策略                                                                                      |
| `isModernModelRef`                | 用于实时轮廓过滤器和烟雾选择的现代模型匹配器                                              | 提供商拥有 live/smoke 首选模型匹配                                                                                             |
| `prepareRuntimeAuth`              | 在推理之前将配置的凭据交换为实际运行时 token/key                       | 提供商需要令牌交换或短期请求凭证                                                                             |
| `resolveUsageAuth`                | 解析 `/usage` 和相关状态表面的 usage/billing 凭证                                     | 提供商需要自定义 usage/quota 令牌解析或不同的使用凭证                                                               |
| `fetchUsageSnapshot`              | 解决身份验证后，获取并标准化特定于提供商的 usage/quota 快照                             | 提供者需要特定于提供者的使用端点或有效负载解析器                                                                           |
| `createEmbeddingProvider`         | 为 memory/search 构建提供商拥有的嵌入适配器                                                     | 内存嵌入行为属于提供者插件                                                                                    |
| `buildReplayPolicy`               | 返回控制提供者会话记录处理方式的重放策略                                        | 提供者需要自定义会话记录策略（例如，去除思考块）                                                               |
| `sanitizeReplayHistoryAsync`      | 通用转录清理后重写重播历史记录，等待转录元数据                          | 提供者需要超出共享压缩辅助程序的特定于提供者的重放重写                                                             |
| `sanitizeReplayHistory`           | 已弃用的第三方兼容性挂钩                                                                      | 现有插件迁移到等待的钩子及其 V2 会话状态合约                                                              |
| `validateReplayTurns`             | 在嵌入式运行器运行前，对重放轮次进行最终验证或重新整理                                           | 在通用清理后，提供者传输需要更严格的轮次验证                                                                    |
| `onModelSelected`                 | 运行提供者拥有的选择后副作用                                                                 | 模型变为活动模型时，提供者需要遥测或提供者拥有的状态                                                                  |

`reconcileLocalService` 仅针对配置的本地服务运行，包括从当前网关进程外部重用的健康进程。保持成本低廉、重复安全且具有中止意识。拒绝会阻止提供者请求并释放其租约，而不会将健康进程分类为启动失败。

规范化调度是特定于钩子的：

- Model 引用在 `normalizeModelId` 调度之前应用清单声明的模型 ID 规范化一次。匹配的提供商钩子可以细化准备好的模型ID；空结果使其保持不变。 OpenClaw 不会尝试其他提供商的规范化挂钩或随后重新应用清单规则。引用解析会读取选定的运行时注册表，而无需激活插件。可执行规范化需要一个准备好的运行时所有者；无需仅使用静态清单策略即可读取。直接注册的提供商拥有其 ID；兼容性别名仅在不存在文字提供程序时匹配，保留仅别名路由和显式 API-owner 资格。
- `normalizeTransport` 首先尝试匹配的提供商。仅当这不会更改 `api` 或 `baseUrl` 并且提供程序没有 `models.providers.<id>` 条目时，它才会尝试其他传输挂钩，并在第一次更改时停止。
- Config 程序集通过拥有的捆绑提供程序的轻量级策略表面调用 `normalizeConfig` 和 `resolveConfigApiKey`。它永远不会加载提供程序运行时，扫描其他提供程序的挂钩，或者在拥有的挂钩未返回任何更改后失败。

Google-family 配置清理由 Google 插件自己的 `normalizeConfig` 挂钩实现，与其轻量级策略表面共享。它不是一个单独的核心兼容性支持。

如果提供者需要完全自定义的线协议或自定义请求执行器，那就是另一类扩展。这些钩子面向仍然运行在 OpenClaw 正常推理循环上的提供者行为。

`resolveUsageAuth` 决定 OpenClaw 是否应调用 `fetchUsageSnapshot` 或回退到 usage/status 表面的通用凭证解析。当提供者具有使用凭证时返回 `{ token, accountId?, subscriptionType?, rateLimitTier? }`（可选计划元数据流入 `fetchUsageSnapshot`），当提供者拥有的使用身份验证已处理请求并且必须抑制通用 API-key/OAuth 回退时返回 `{ handled: true }`，并返回 `null` 或`undefined` 当提供商未处理使用身份验证时。

在清单 `providerUsageAuthEnvVars` 中声明组织或计费凭据。这样通用发现和秘密清理界面就能识别它们，而不会把它们当作推理认证候选项。

### <a id="provider-example"></a> 提供商示例

`example-proxy`、`exchangeToken` 和 `fetchExampleProxyUsage` 是您自己的提供商 id 和供应商 API 调用的占位符，而不是导出的 OpenClaw 帮助程序。

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

### <a id="built-in-examples"></a> 内置示例

捆绑的提供者插件会结合上面的钩子，以适配每个供应商的目录、认证、thinking、回放和使用量需求。权威的钩子集合位于各插件在 `extensions/` 下的实现中；本页展示的是形态，而不是逐项复刻列表。

<AccordionGroup>
  <Accordion id="pass-through-catalog-providers" title="传递目录提供商">
    OpenRouter、Kilocode、Z.AI、xAI 会注册 `catalog` 以及 `resolveDynamicModel` / `prepareDynamicModel`，以便在 OpenClaw 的静态目录之前暴露上游模型 id。
  </Accordion>
  <Accordion id="oauth-and-usage-endpoint-providers" title="OAuth 和使用端点提供商">
    GitHub Copilot、Gemini CLI、ChatGPT Codex、MiniMax、小米、z.ai 会将 `prepareRuntimeAuth` 或 `formatApiKey` 与 `resolveUsageAuth` + `fetchUsageSnapshot` 配对，以负责令牌交换和 `/usage` 集成。
  </Accordion>
  <Accordion id="replay-and-transcript-cleanup-families" title="重播和成绩单清理系列">
    共享的命名家族（`google-gemini`、`passthrough-gemini`、 `anthropic-by-model`、`hybrid-anthropic-openai`）允许提供者通过 `buildReplayPolicy` 采用转录策略，而不是由每个插件各自重新实现清理。
  </Accordion>
  <Accordion id="catalog-only-providers" title="仅目录提供商">
    `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`nvidia`、 `qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine` 只注册 `catalog` 并依赖共享推理循环。
  </Accordion>
  <Accordion id="anthropic-specific-stream-helpers" title="Anthropic-特定流助手">
    Beta 标头 `/fast` / `serviceTier` 和 `context1m` 位于 Anthropic 插件的公共 `api.ts` / `contract-api.ts` 接口（`wrapAnthropicProviderStream`、`resolveAnthropicBetas`、 `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`）而不是通用的 SDK。
  </Accordion>
</AccordionGroup>

## <a id="provider-catalogs"></a> 提供商目录

provider 插件可以通过 `registerProvider({ catalog: { run(...) { ... } } })` 为推理定义模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入 `models.providers` 的相同结构：

- `{ provider }` 表示单个 provider 条目
- `{ providers }` 表示多个 provider 条目

当插件拥有 provider 特定的模型 id、base URL 默认值，或受认证门控的模型元数据时，使用 `catalog`。

`catalog.order` 控制插件的目录与 OpenClaw 内置隐式 provider 的合并顺序：

- `simple`：普通 API-key 或环境驱动的提供程序
- `profile`：在存在认证 profile 时出现的 provider
- `paired`：合成多个相关 provider 条目的 provider
- `late`：最后一轮，在其他隐式 provider 之后

后面的 provider 在键冲突时获胜，因此插件可以有意用相同的 provider id 覆盖内置 provider 条目。

插件还可以通过 `api.registerModelCatalogProvider({ provider, kinds, staticCatalog, liveCatalog })` 发布只读模型行。这是 list/help/picker 曲面的前向路径，支持 `text`、`voice`、`image_generation`、`video_generation` 和 `music_generation` 行。提供商插件仍然拥有实时端点调用、令牌交换和供应商响应映射； core 拥有通用的行形状、源标签和媒体工具帮助格式化。媒体生成提供程序注册会自动从 `defaultModel`、`models` 和 `capabilities` 合成静态目录行。

兼容性：

- `discovery` 是 `catalog` 的旧别名。 OpenClaw 删除了 2026.4.26 中的别名及其弃用警告
- 将`discovery`重命名为`catalog`。仍然注册 `discovery` 的提供程序插件不发布任何目录行
- `augmentModelCatalog` 已弃用；捆绑提供商应通过 `registerModelCatalogProvider` 发布补充行。其移除时间为 2026-10-01
