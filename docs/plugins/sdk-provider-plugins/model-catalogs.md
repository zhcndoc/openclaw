---
summary: "实时模型发现、目录助手和提供商拥有的定价标准化"
read_when:
  - "您选择供应商参与共享实时模型发现"
  - "您需要 liveModelDiscovery 合约、缓存和失败规则"
  - "您正在标准化提供商拥有的定价源"
  - "您需要更窄的单提供商插件入口帮助程序"
title: "提供者模型目录"
sidebarTitle: "模型目录"
---

提供商插件的目录参考：共享实时模型发现、目录助手、定价标准化和更窄的单一提供商入口点。 [构建提供商插件](/plugins/sdk-provider-plugins)指南的一部分。

对于轻量级模型参考标准化，请使用 `openclaw/plugin-sdk/model-ref-parse`。其 `normalizeGooglePreviewModelId` 和 `normalizeAntigravityPreviewModelId` 导出共享目录的别名规则，而无需加载提供程序重播或传输帮助程序。 `normalizeOpenRouterModelFamilyId` 删除了用于系列检测的可选 `openrouter/` 限定符和前导 `~` 别名前缀，而不更改 API 模型 ID。使用 `splitTrailingAuthProfile` 分离跟踪身份验证配置文件，同时保留模型版本和本地量化后缀。

成功的目录挂钩可以返回有关 `ready` 结果的私有 `modelIdCatalog` 证据：`{ baseUrl, modelIds, aliases? }`。在过滤模型类型之前包括每个服务器列出的 ID，并为成功的空响应保留一个空列表。该证据与 `listedModelIds` 分开，保留其权利含义。

在投影目录时（包括配置热重载之后），Core 将当前编写的引用和声明与保留的列表进行比较。默认比较使用精确 ID 和尾部斜杠规范化端点。具有其他别名或端点规则的提供者可以提供纯同步 `catalog.getUnlistedConfiguredModelIds(listing, configuredModels)` 挂钩。它仅接收该提供者的已解析引用，包括模型级端点覆盖；它必须跳过路由到另一台服务器的引用，并且不得执行 I/O. `aliases` 是可选的提供商拥有的匹配数据。

仅公开导出派生的 `unlistedConfiguredModelIds` 公告。它永远不会改变权利或模型可用性。失败或跳过的发现不会产生 Missing-ID 警告，并且重新投影保留的证据不会提出提供商请求。

## <a id="live-model-discovery"></a> 实时模型发现

如果您的提供商公开了 OpenAI- 兼容的 `/models` API，请选择单提供商帮助程序进行共享发现：

```typescript
catalog: {
  buildProvider: () => ({
    api: "openai-completions",
    baseUrl: "https://api.acme-ai.com/v1",
    models: [...STATIC_MODELS],
  }),
  buildStaticProvider: () => ({
    api: "openai-completions",
    baseUrl: "https://api.acme-ai.com/v1",
    models: [...STATIC_MODELS],
  }),
  liveModelDiscovery: true,
},
```

`liveModelDiscovery: true` 是公共 Plugin SDK 契约，行为如下：

| 区域           | 契约                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 凭据    | 发现功能使用目录中解析出的提供方凭据；当认证提供 `discoveryApiKey` 时优先使用它。永远不会将秘密引用标记作为令牌发送。默认请求使用 `Authorization: Bearer <token>`；如需使用其他厂商认证方案，请使用 `buildRequestHeaders`。                                                                                                                                                                                                                                                                                                                          |
| 端点       | 默认 URL 是相对于有效提供程序 `baseUrl` 的 `models`，包括启用 `allowExplicitBaseUrl` 时的运算符覆盖。使用 `endpointPath` 作为另一个相对路径。仅对固定供应商 URL 使用 `endpointUrl: { url, requireBaseUrl }`；除非有效基础 URL 仍等于 `requireBaseUrl`，否则将跳过发现，因此不会将自定义代理凭据发送给供应商。                                                                                                                                                                                                |
| 网络限制 | Fetch 使用 OpenClaw 的 SSRF 防护、跨分页共用的一个 5 秒超时预算、每页 4 MiB 的响应大小限制，以及 50 页限制。会拒绝跨来源分页链接；跨来源重定向后会移除凭据。                                                                                                                                                                                                                                                                                                                                                                      |
| 缓存          | 按提供方、端点和解析出的凭据缓存成功且非空的目录 60 秒。不会缓存空结果或不可用结果。                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 过滤      | 列表决定了存在哪些模型。精确的实时 ID 保留其可信的静态元数据；每个其他列出的聊天 ID 都会成为保守的 text/chat 行，因此新模型出现时没有 OpenClaw 版本。已禁用、已存档、已弃用、过去的 `shutdown_date`、明确非聊天、嵌入、重新排名、审核、语音、转录、实时、音频、图像、视频和旧版完成行均被排除，包括静态 ID。仅使用 `readRows` 从非标准响应信封中选择行；特定于提供者的模型语义仍然属于自定义目录。                   |
| 入场      | 选修的。当您的请求调整特定于模型版本时，请设置 `acceptUnknownModel: ({ id, record }) => boolean`，因此发现无法发布您尚未为其构建有效请求的模型。仅针对您的静态目录尚未发布的 ID 调用它；已知 ID 会绕过它并保留其已发布的元数据。返回 `false` 以删除该行。省略它的提供者保持以前的行为不变。更喜欢将供应商宣传的功能与您自己的合同检查进行比较，而不是手动维护的模型列表，并在该行不包含功能数据时拒绝该行。 |
| 失败        | 实时发现属于辅助功能。认证、网络、超时、分页、解析、目录为空和过滤失败时，会返回提供方拥有的静态种子，而不是移除该提供方。                                                                                                                                                                                                                                                                                                                                                                                                                          |

相对目录缓存 TTL 在成功加载完成时启动。缓存命中保留了该截止日期，并且明确的绝对提供者截止日期保持不变。待处理的负载保留其初始到期时间，因此可以替换停滞的工作。通过准备好的目录所有者进行的显式刷新会绕过仅针对该请求获取的密钥的完整响应缓存条目。同一采集中的重复读取共享刷新值；并发调用者共享待处理的工作。普通获取保持其现有的缓存生命周期。

被动模型列表读取等待针对新提交的目录和配置的配置替换恢复。他们不会使用已停用的配置重试。确切的运行时获取仍然与其请求的配置绑定。

捆绑提供商在其目录选项中设置 `discoveryMode: "strict"`。此代码选项将成功的空结果保留为空，并通过 `ProviderCatalogResult.outcomes` 报告采集失败，而不是返回种子模型作为成功刷新。 HTTP 401/403 产生目录范围内的 `auth-rejected` 结果；其他采集失败会产生 `unavailable`。静态目录和跳过的发现都不会产生实时结果。当提供其凭证时，每个结果都带有为实际请求选择的配置文件。家庭提供者独立报告每个兄弟姐妹。显式 `ready` 结果可能包括 `modelOrder: string[]` 以对其在选择器中已发现的模型进行排名。这不会添加模型或授予访问权限；不存在的模型将被忽略，并且没有 `modelOrder` 的结果将保留清单顺序。提供商范围内的刷新保留在所选提供商的注册别名下报告的明确结果；不相关的兄弟姐妹结果仍然被排除在外。通过正缓存生存期，经过验证的空结果使用与非空结果相同的成功观察生存期。过期后，普通目录读取返回保留行，而现有库存所有者在后台刷新提供程序。 `ttlMs: 0` 仍然禁用响应缓存，并且不记录此更新路径的到期时间。

成功的验证结果可能包括私有 `modelServiceTiers` 观察：绑定到该结果的 `profileId` 的 `{ modelId, runtimeId, api, baseUrl, serviceTiers }` 行。仅提供帐户成功响应明确公布的层 ID；切勿从静态种子或本机后备目录中复制它们。在将 `serviceTiers` 投影到公共模型选择上之前，主机会匹配所选的配置文件、模型、路线和运行时间。帐户层级地图从未出现在公开场合 `providerOutcomes`。缺失、失败、陈旧或不匹配的观察结果导致支持未知。此元数据不授权执行或保证上游履行。

来自帐户范围的订阅列表的 `ready` 结果可能包括私有 `listedModelIds: string[]` 出处：响应返回的每个模型 ID，包括隐藏行。它从未出现在公开场合 `providerOutcomes`。当存在时，如果 id 不存在，选择器会将模型的订阅路由视为无权用于该帐户，除非另一个可用的凭证类为该模型提供服务。空数组是权威的。该列表仅适用于生成它的凭据：结果为 `profileId`，或省略时的非配置文件身份验证。另一个帐户的列表使得权利未知。当列表失败或未描述帐户权利时，请省略该字段。

公共元数据请求在发现选项中声明 `authentication: "none"`。准备好的请求没有凭证或配置文件身份；其缓存密钥独立于配置的推理凭证。返回的提供者配置仍然保留其推理凭证。

省略`discoveryMode`的外部调用保留上述咨询合同。公共 Chutes、Hugging Face、KiloCode 和 Vercel AI 网关发现函数和构建器也保留该默认值。他们的捆绑目录钩子明确传递 `{ discoveryMode: "strict" }` ； Hugging Face 发现在其现有超时参数后接受此选项对象。 Chutes公共默认在HTTP 401之后保留其匿名重试；如果没有选定的凭据，严格调用绝不会重试。严格路径和建议路径共享相同的受保护传输和缓存，并具有单独的缓存标识。咨询电话仍然只保留非空结果。自定义实时构建者可以在其目录挂钩上使用 `runLiveProviderCatalog` 来报告成功的采集并将采集错误转换为结果。单独返回提供程序配置并不能建立实时发现结果。

当提供商未报告时，目录挂钩应省略 `contextWindow`；单独保留报告的`contextTokens`提示限额。缓存目录保留了这一遗漏。运行时构建提供估计并用 `contextWindowSource: "synthetic"` 标记；动态运行时解析器可以以相同的方式标记它们自己的未知模型估计。该标记仅用于运行时，从不配置或保留目录元数据。接受的帐户发现可以取代对同一提供商、精确模型 ID 和传输 API（以及端点，当回退绑定时）的估计。请勿将策划的静态限制或创作的上限标记为合成。失败的发现将保留估计值，除非目录所有者可以保留同一帐户的库存。

为了兼容性，由旧目录挂钩返回但没有结果的非空行在相同凭据下可以幸免于提供程序范围内的故障。这不会建立成功的发现源或保留不相关的配置行和补充行。空的遗留目录和特定于配置文件的故障不使用该后备；成功的替换会清除前一行的出处。将元数据反馈后备与帐户发现分开；不要匿名重试被拒绝的帐户请求或在严格构建器内替换种子行。

自定义目录挂钩可以从 `ctx.resolveProviderApiKey()` 接收可选的 `mode` 元数据：`api_key`、`oauth` 或 `token`。如果存在，它会描述该查找所选择的凭证。在选择供应商认证方案时使用它；单独的 `resolveProviderAuth()` 呼叫可以选择不同的配置文件。省略模式元数据不会更改现有的回调行为。

当 OAuth 准备耗尽其候选者时，`ctx.resolveProviderAuth()` 可以设置 `preparationFailed: true`。不要将该标志视为缺少配置或重新启动相同配置文件的解析。挂钩仍然可以选择另一个凭证源。其返回的提供者配置或显式结果仍然具有权威性；否则，目录所有者将报告所尝试的配置文件标识所消耗的准备失败。

对于非 Bearer 或非标准的列表端点，请传入选项，而不是 `true`：

```typescript
liveModelDiscovery: {
  endpointPath: "model-catalog",
  buildRequestHeaders: ({ apiKey, discoveryApiKey }) => ({
    "vendor-version": "2026-01-01",
    "x-api-key": discoveryApiKey ?? apiKey ?? "",
  }),
  readRows: (body) =>
    body && typeof body === "object" &&
    Array.isArray((body as { models?: unknown }).models)
      ? (body as { models: unknown[] }).models
      : [],
},
```

不要将 `endpointUrl` 用作无条件的备用主机。对于模型列表主机与推理主机不同的提供方，其 `requireBaseUrl` 检查是凭据隔离边界。

如果提供者需要自定义模型语义而不是保守的 OpenAI- 兼容投影，请仅在插件中保留该投影。将其传递为 `projectRows`；共享运行时仍然拥有受保护的获取、提供者身份验证标头、缓存准入和静态回退。

当插件自行构建提供程序配置时使用 `buildLiveModelProviderConfig`。如果没有 `projectRows`，列表将决定存在哪些模型：发布每个列出的聊天模型，静态 `models` 行仅丰富匹配 ID，非聊天行将按照与 `liveModelDiscovery` 相同的规则进行过滤。要限制列表，请传递 `readModelId(row)` 并针对提供程序不支持的行返回 `undefined`；返回的字符串也变成模型ID。当直播API发布更丰富的模型元数据时通过`projectRows`：

```typescript index.ts
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  buildLiveModelProviderConfig,
  type LiveModelCatalogFetchGuard,
} from "openclaw/plugin-sdk/provider-catalog-live-runtime";

const STATIC_MODELS = [
  {
    id: "acme-large",
    name: "Acme Large",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    contextWindow: 200000,
    maxTokens: 32768,
  },
  {
    id: "acme-small",
    name: "Acme Small",
    reasoning: false,
    input: ["text"],
    cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
] as const;

async function buildAcmeLiveProvider(params: {
  apiKey: string;
  discoveryApiKey?: string;
  fetchGuard?: LiveModelCatalogFetchGuard;
}) {
  return await buildLiveModelProviderConfig({
    providerId: "acme-ai",
    endpoint: "https://api.acme-ai.com/v1/models",
    providerConfig: {
      baseUrl: "https://api.acme-ai.com/v1",
      api: "openai-completions",
    },
    models: STATIC_MODELS,
    apiKey: params.apiKey,
    discoveryApiKey: params.discoveryApiKey,
    fetchGuard: params.fetchGuard,
    ttlMs: 60_000,
    auditContext: "acme-ai-model-discovery",
    projectRows: (rows, fallback) =>
      rows.flatMap((row) => {
        const model = projectAcmeModel(row, fallback);
        return model ? [model] : [];
      }),
  });
}

export default definePluginEntry({
  id: "acme-ai",
  name: "Acme AI",
  register(api) {
    api.registerProvider({
      id: "acme-ai",
      label: "Acme AI",
      catalog: {
        order: "simple",
        run: async (ctx) => {
          const auth = ctx.resolveProviderAuth("acme-ai");
          const apiKey = auth.apiKey ?? ctx.resolveProviderApiKey("acme-ai").apiKey;
          if (!apiKey) return null;
          return {
            provider: await buildAcmeLiveProvider({
              apiKey,
              discoveryApiKey: auth.discoveryApiKey,
            }),
          };
        },
      },
      staticCatalog: {
        order: "simple",
        run: async () => ({
          provider: {
            baseUrl: "https://api.acme-ai.com/v1",
            api: "openai-completions",
            models: [...STATIC_MODELS],
          },
        }),
      },
    });
  },
});
```

`run` 应保持身份验证门控状态，并在没有可用凭证时返回 `null`。保持离线 `staticRun` 或静态回退，以便设置、文档、测试和选择器界面不依赖于实时网络访问。使用适合模型列表新鲜度的 TTL，避免请求时文件系统轮询，并仅当上游响应不是 OpenAI- 兼容的 `{ data: [{ id, object }] }` 形状时才传递特定于提供者的 `readRows`。当行在其他地方携带 ID 时传递 `readModelId`，或者提供程序必须拒绝某些列出的行。

在模型运行时准备期间，`staticCatalog.run` 和 `prepareSyntheticAuth` 接收可选的 `signal`。关闭和 plugin/config 替换会中止它。当它中止时停止等待的获取，并在挂钩稳定之前完成资​​源清理。 OpenClaw 丢弃取消的结果并在替换可以获取相同的代理资源之前加入清理。

对于单独的权威元数据源，相同的 `provider-catalog-live-runtime` 子路径公开 `ProviderCatalogSnapshot`：每个条目将运行时模型与其生命周期状态配对。 `projectUpstreamProviderCatalogSnapshot` 从受信任的种子和接受的上游行重建该快照，删除撤回的仅上游模型。 `projectProviderCatalogSnapshotRows` 将通告的 ID 与活动快照条目相交，按端点顺序进行重复数据删除； `listProviderCatalogSnapshotEntries` 为目录消费者预测相同的生命周期事实。将种子生命周期策略和特定于模型的装饰保留在所属插件中。刷新元数据后派生静态回退资格，以便第一个失败或完全过滤的发现使用当前状态。公共元数据永远不会建立帐户权利或扩展凭证的发现范围。

私有 `createUpstreamProviderCatalog` 帮助程序将此快照生命周期保存在一个准备好的所有者中。提供受信任的种子、提供者路由、元数据和模型列表端点、发现和启动模型审核标签、静态条目资格以及任何模型装饰。可选的 `upstreamSeed` 控制哪些种子生命周期事实在上游刷新中幸存，并且当插件承认元数据未描述的列出的 ID 时，可选的 `projectRows` 会替换列出的行的默认选择 （`projectProviderCatalogSnapshotRows`）。模型列表请求携带来自相同所有者推断用途的提供者的属性标头。所有者暴露`getSnapshot`、`refreshMetadata`、`buildStaticProvider`和`buildLiveProvider`；凭证属于每个构建调用。实时构建会在派生静态资格和投影广告 ID 之前刷新元数据。元数据获取失败保留之前的快照；模型列表失败和空结果仍然严格。当 feed 缺少提供者时，`refreshMetadata` 返回 `undefined`，因此显式模型准备不会将保留的元数据误认为是成功刷新。插件策略仍然拥有哪些模型可以直接从种子或当前快照解析。

`resolveStarterModel` 根据新帐户模型列表响应检查首选 provider/model 参考。仅当其确切模型 ID 被公布时，它才返回该引用，而不刷新或扩展元数据快照。

上游推理元数据将省略的控制保留为未指定，并将空选项或工作列表保留为无工作控制。本机 `null` 工作映射到 `none`；提供者本地工作名称保留其大小写。这些事实与模型是否在内部执行推理无关。

官方插件使用私有的、纯的 `openclaw/plugin-sdk/model-catalog-pricing` 运行时子路径。它公开了 `normalizeModelPricingCatalog(rows, normalizePricing, options?)` 供提供商拥有的定价源。它返回完整成本的地图：省略了缺失的价格，而格式错误的声明价格、无效或重复的模型 ID 以及没有可用价格的 Feed 返回 `undefined`。提供提供商的单位换算。选项可以选择`readModelId(model)`（默认`model.id`）、`readPricing(model)`（默认`model.pricing`）和`isSupportedPricing(rawPricing)`（默认`true`）。在忽略不受支持的时间表之前，已对宣布的价格进行标准化和验证；即使在未定价或不受支持的行上，重复的 ID 也会被拒绝。非令牌域可以从 `readPricing` 返回 `undefined`。不导入任何身份验证、发现或运行时加载程序。

DeepInfra 的 `pricing-api.ts` 将这些选择器用于其本机数组和 `model_name` 标识。使用期权合约（包括DeepInfra和Venice）与匹配的主机发布插件，并在发布时协调其插件API和最小主机楼层。私有子路径不是独立版本的第三方兼容性 API。

此子路径还公开本机 OpenRouter 定价对象的 `normalizeOpenRouterModelPricing(pricing)`。它将每个令牌的费率和静态提示长度覆盖转换为完整的每百万成本表，无需网络访问或来自其他来源的价格。覆盖严格适用于 `min_prompt_tokens` 之上，计算未缓存的输入、缓存读取和缓存写入。匹配的条目按源顺序应用：每个价格键后面的条目获胜，包括在相同的阈值下；省略的键继承本机基础或较早的匹配条目。缓存速率不存在，基本默认为零。无效的有效代币利率返回 `undefined`。跳过基于时间或未知条件的条目；其他已知的电荷维度被忽略。

## <a id="selecting-catalog-augmentation-hooks"></a> 选择目录扩充挂钩

`augmentModelCatalogWithProviderPlugins` 是从 `openclaw/plugin-sdk/provider-catalog-runtime` 导出的。其可选的顶级 `providerIds` 选择运行哪个已注册的 `augmentModelCatalog` 挂钩：

- Omit `providerIds` 以保留无范围行为。
- 通过 `[]` 运行无增强挂钩。
- 传递提供商 ID 或注册别名以选择匹配的挂钩。匹配规范化 ID 和别名，包括提供者系列使用的钩子别名。

此选择器执行 **not** 过滤所选挂钩返回的行。 family hook 可能会返回多个提供者的行；调用者拥有任何行过滤。帮助器返回补充行，而不是输入 `context.entries`。

附带的 v2026.9.4 导出没有 `providerIds` 选择器，并且可能在运行时忽略该选项。依赖于范围挂钩选择的插件必须需要包含 `openclaw.compat.pluginApi` 中的选择器的主机版本。忽略该选项会保留旧主机和新主机上的现有行为。

该顶级选择器与 `catalog.run` 回调上下文分开。当 `ctx.providerIds` 存在时，它包含为该目录所有者选择的标准化提供商身份。当钩子不服务任何凭证或发出网络请求之前，返回 `null`； OpenClaw 还会过滤返回到该范围的身份。范围不存在意味着调用者请求完整的目录。

如果上游提供方使用的控制标记与 OpenClaw 不同，请添加一个小型的双向文本变换，而不是替换流路径：

```typescript
api.registerTextTransforms({
  input: [
    { from: /red basket/g, to: "blue basket" },
    { from: /paper ticket/g, to: "digital ticket" },
    { from: /left shelf/g, to: "right shelf" },
  ],
  output: [
    { from: /blue basket/g, to: "red basket" },
    { from: /digital ticket/g, to: "paper ticket" },
    { from: /right shelf/g, to: "left shelf" },
  ],
});
```

`input` 会在传输前重写最终的系统提示词和文本消息内容。`output` 会在 OpenClaw 解析自己的控制标记或通道投递之前，重写助手文本增量和最终文本。

对于仅使用 API-key 身份验证注册一个文本提供程序以及单个目录支持的运行时的捆绑提供程序，更喜欢使用较窄的 `defineSingleProviderPluginEntry(...)` 帮助程序：

```typescript
import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";

export default defineSingleProviderPluginEntry({
  id: "acme-ai",
  name: "Acme AI",
  description: "Acme AI model provider",
  provider: {
    label: "Acme AI",
    docsPath: "/providers/acme-ai",
    auth: [
      {
        methodId: "api-key",
        label: "Acme AI API key",
        hint: "API key from your Acme AI dashboard",
        optionKey: "acmeAiApiKey",
        flagName: "--acme-ai-api-key",
        envVar: "ACME_AI_API_KEY",
        promptMessage: "Enter your Acme AI API key",
        defaultModel: "acme-ai/acme-large",
      },
    ],
    catalog: {
      buildProvider: () => ({
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        models: [{ id: "acme-large", name: "Acme Large" }],
      }),
      buildStaticProvider: () => ({
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        models: [{ id: "acme-large", name: "Acme Large" }],
      }),
    },
  },
});
```

`buildProvider` 是 OpenClaw 可以解析真实提供者身份验证时使用的实时目录路径。它可以执行特定于提供者的发现。仅对在配置身份验证之前可以安全显示的脱机行使用 `buildStaticProvider`；它不得要求凭据或发出网络请求。 OpenClaw 的 `models list --all` 显示当前仅针对捆绑的提供程序插件执行静态目录，其中配置为空，环境为空，并且没有 agent/workspace 路径。

如果您的身份验证流程还需要在加入期间修补 `models.providers.*`、别名和代理默认模型，请使用 `openclaw/plugin-sdk/provider-onboard` 中的预设帮助程序。对于仅注册连接设置，请将 `createProviderConnectionPresetAppliers(...)` 与惰性 `catalogModels` 供应商一起使用。普通设置会写入连接事实、别名和丢失的主数据库，而无需将内置目录复制到保存的配置中。显式 `models.mode: "replace"` 评估供应商并将生成的行合并到创作的行后面。每个设置结果都拥有其生成的模型数据。

当替换模式必须保留现有的必需默认规则时，请使用 `createDefaultModelsConnectionPresetAppliers(...)`：仅当配置的提供程序缺少选定的 `defaultModelId` 时才添加提供的 `defaultModels`。 `applyProviderConnectionConfig(...)` 为身份验证流提供目录变体，用于解析每次调用的端点或主端点。这些助手保留创作的行、现有别名和后备。身份验证流程仍然拥有任何显式默认选择。

现有的公共 `createDefaultModelPresetAppliers(...)`、`createDefaultModelsPresetAppliers(...)` 和 `createModelCatalogPresetAppliers(...)` 保留其普通模式下的目录播种行为。后两者也接受惰性模型供应商。具有已发布配置助手的提供者可以在其现有助手和新注册的设置助手之间共享一个预设描述符；迁移注册而不默默地更改已发布的帮助者合同。

独立发布的插件必须要求包含 `openclaw.compat.pluginApi` 中这些帮助程序的主机版本。核心版本版本同步工具更新了配对版本的范围；这些导入不适用于缺乏帮助程序的旧主机。

当提供程序的本机端点支持正常 `openai-completions` 传输上的流式使用块时，首选 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目录帮助程序，而不是硬编码提供程序 ID 检查。 `supportsNativeStreamingUsageCompat(...)` 和 `applyProviderNativeStreamingUsageCompat(...)` 检测端点功能映射的支持，因此即使插件使用自定义提供商 ID，本机 Moonshot/DashScope-style 端点仍然选择加入。

上面的实时发现示例涵盖了 `/models`-style 提供商 API。将该发现保留在 `catalog.run` 内，通过可用身份验证进行控制，并保持 `staticRun` 不受网络影响以进行离线目录生成。

当配置的模型引用需要其行时，运行时模型准备也会运行 `staticRun`，然后将 `ctx.providerIds` 设置为选定的提供程序 ID。只有在这种情况下，挂钩才可以等待其同步挂钩读取的提供者拥有的缓存，例如用于思维级别的模型功能。目录生成、`models list --all` 和医生验证使 `ctx.providerIds` 未设置；保持这些运行不受网络影响。

共享凭证的官方提供商插件可以使用私有运行时 `openclaw/plugin-sdk/provider-catalog-shared` 子路径中的 `resolveFirstProviderCatalogAuth(ctx.resolveProviderApiKey, providerIds)`。在呼叫者的有序 ID 中保持提供商的优先级。帮助程序在第一个带有 `apiKey` 或 `discoveryApiKey` 的结果处停止，并返回整个结果，保留其配置文件和身份验证模式。未解析的 SecretRef 标记优先于其他提供商的实时密钥；帐户之间的字段永远不会混合。当没有提供者具有身份验证并传播查找失败时，它会返回 `undefined`。使用此主机导出的官方插件版本必须需要在其 `compat.pluginApi` 中提供它的主机版本。

来自私有本地 `openclaw/plugin-sdk/provider-model-metadata` 表面的 `findNormalizedProviderKey(entries, providerId)` 返回第一个配置的密钥，其修剪后的小写拼写与提供者 ID 匹配。喜欢精确创作密钥的调用者必须首先检查该密钥。
