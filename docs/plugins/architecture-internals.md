---
summary: "插件架构内部：加载管线、注册表、运行时钩子、HTTP 路由和参考表"
read_when:
  - 实现 provider 运行时钩子、channel 生命周期或包集合
  - 调试插件加载顺序或注册表状态
  - 添加新的插件能力或上下文引擎插件
title: "插件架构内部"
---

关于公开能力模型、插件形态以及所有权/执行
契约，请参见 [插件架构](/plugins/architecture)。本页是内部机制的
参考：加载管线、注册表、运行时钩子、
Gateway HTTP 路由、导入路径以及 schema 表。

## 加载管线

在启动时，OpenClaw 大致会执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容包清单以及包元数据
3. 拒绝不安全的候选项
4. 规范化插件配置（`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`）
5. 为每个候选项决定是否启用
6. 加载已启用的原生模块：已构建的打包模块使用原生加载器；
   未构建的原生插件使用 jiti
7. 调用原生 `register(api)` 钩子，并将注册内容收集到插件注册表中
8. 将注册表暴露给命令/运行时界面

<Note>
`activate` 是 `register` 的旧别名 —— 加载器会解析二者中存在的那个（`def.register ?? def.activate`）并在同一时点调用它。所有打包插件都使用 `register`；新插件请优先使用 `register`。
</Note>

安全门控会在**运行时执行之前**发生。当入口越出插件根目录、路径可被全局写入，或者对于未打包插件来说路径所有权看起来可疑时，候选项会被阻止。

### 先清单行为

清单是控制平面的事实来源。OpenClaw 使用它来：

- 标识插件
- 发现声明的 channels/skills/config schema 或打包能力
- 验证 `plugins.entries.<id>.config`
- 增强 Control UI 标签/占位符
- 显示安装/目录元数据
- 保留便宜的激活与设置描述符，而无需加载插件运行时

对于原生插件，运行时模块是数据平面部分。它注册实际行为，例如钩子、工具、命令或 provider 流程。

可选的清单 `activation` 和 `setup` 块保留在控制平面上。它们是仅元数据的描述符，用于激活规划和设置发现；
它们不能替代运行时注册、`register(...)` 或 `setupEntry`。
最先投入使用的实时激活消费者现在会使用清单命令、channel 和 provider 提示，
在更广泛的注册表物化之前缩小插件加载范围：

- CLI 加载会缩小到拥有所请求主命令的插件
- channel 设置/插件解析会缩小到拥有所请求
  channel id 的插件
- 显式 provider 设置/运行时解析会缩小到拥有所请求 provider id 的插件

激活规划器同时提供一个仅 ids 的 API 供现有调用方使用，以及一个规划 API 供新的诊断使用。计划条目会报告插件被选中的原因，
将显式 `activation.*` 规划器提示与清单所有权
回退区分开来，例如 `providers`、`channels`、`commandAliases`、`setup.providers`、
`contracts.tools` 和 hooks。这个原因拆分就是兼容性边界：
现有插件元数据继续可用，而新代码可以在不改变运行时加载语义的情况下检测更宽泛的提示或回退行为。

设置发现现在优先使用描述符拥有的 ids，例如 `setup.providers` 和
`setup.cliBackends`，在回退到
`setup-api` 之前先缩小候选插件范围，适用于那些仍然需要设置时运行时钩子的插件。Provider 设置流程优先使用清单 `providerAuthChoices`，然后为了兼容性再回退到运行时向导选项和安装目录选项。显式的
`setup.requiresRuntime: false` 是一个仅描述符层面的截断；省略
`requiresRuntime` 会保留旧的 `setup-api` 回退以兼容。若发现的多个插件声明了同一个规范化的 setup provider 或 CLI backend id，设置查找会拒绝这个歧义所有者，而不是依赖发现顺序。当设置运行时确实执行时，注册表诊断会报告
`setup.providers` / `setup.cliBackends` 与通过 setup-api 注册的 providers 或 CLI backends 之间的漂移，而不会阻止旧插件。

### 加载器缓存什么

OpenClaw 在进程内保留短期缓存，用于：

- 发现结果
- 清单注册表数据
- 已加载的插件注册表

这些缓存减少了突发性的启动开销和重复命令开销。可以将它们视为短生命周期的性能缓存，而非持久化。

性能说明：

- 设置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 可禁用这些缓存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存窗口。

## 注册表模型

已加载的插件不会直接修改任意核心全局变量。它们会注册到一个
中心插件注册表中。

该注册表跟踪：

- 插件记录（标识、来源、origin、状态、诊断）
- 工具
- 旧式 hooks 和 typed hooks
- channels
- providers
- Gateway RPC 处理器
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

然后核心特性会从该注册表中读取，而不是直接与插件模块交互。
这使加载保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对可维护性很重要。它意味着大多数核心界面只需要一个集成点：“读取注册表”，而不是“为每个插件模块做特殊处理”。

## 会话绑定回调

绑定会话的插件可以在审批结果确定时做出响应。

使用 `api.onConversationBindingResolved(...)` 可在绑定请求被批准或拒绝后接收回调：

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // 该插件 + 会话现在已存在一个绑定。
        console.log(event.binding?.conversationId);
        return;
      }

      // 请求被拒绝；清理任何本地待处理状态。
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

回调负载字段：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准请求的解析后绑定
- `request`：原始请求摘要、detach hint、发送者 id，以及
  会话元数据

这个回调仅用于通知。它不会改变谁被允许绑定会话，并且在核心审批处理完成后运行。

## Provider 运行时钩子

Provider 插件有三层：

- **清单元数据**，用于便宜的运行前查找：
  `setup.providers[].envVars`、已弃用的兼容项 `providerAuthEnvVars`、
  `providerAuthAliases`、`providerAuthChoices` 和 `channelEnvVars`。
- **配置时钩子**：`catalog`（旧称 `discovery`）以及
  `applyConfigDefaults`。
- **运行时钩子**：40+ 个可选钩子，覆盖 auth、模型解析、
  stream 包装、thinking levels、回放策略和 usage 端点。完整列表见
  [钩子顺序和用法](#hook-order-and-usage)。

OpenClaw 仍然负责通用 agent 循环、failover、转录处理和
工具策略。这些钩子是 provider 特定行为的扩展面，而不需要整套自定义推理传输。

在 provider 具有基于 env 的凭据时，使用清单 `setup.providers[].envVars`，
这样通用 auth/status/model-picker 路径就能在不加载插件运行时的情况下看到它们。已弃用的 `providerAuthEnvVars` 在弃用窗口内仍会被兼容适配器读取，且使用它的未打包插件会收到一条清单诊断。使用清单 `providerAuthAliases`，当某个 provider id 应该复用另一个 provider id 的 env vars、auth profiles、
配置驱动 auth 和 API key onboarding 选项时。使用清单 `providerAuthChoices`，当 onboarding/auth-choice CLI 界面需要知道该 provider 的 choice id、分组标签和单开关 auth 接线，而无需加载 provider 运行时时。将 provider 运行时的
`envVars` 保留给面向运维者的提示，例如 onboarding 标签或 OAuth
client-id/client-secret 设置变量。

当某个 channel 具有基于 env 的 auth 或设置，并且通用 shell-env 回退、配置/status 检查或设置提示应该在不加载 channel 运行时的情况下看到它时，使用清单 `channelEnvVars`。

### 钩子顺序和用法

对于 model/provider 插件，OpenClaw 会按下面的大致顺序调用钩子。
“When to use” 列是快速决策指南。

| #   | 钩子                              | 它做什么                                                                                                   | 何时使用                                                                                                                                   |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 生成期间将 provider 配置发布到 `models.providers`                                | provider 拥有目录或 base URL 默认值                                                                                                  |
| 2   | `applyConfigDefaults`             | 在配置物化期间应用 provider 拥有的全局配置默认值                                      | 默认值取决于 auth 模式、env 或 provider 模型族语义                                                                         |
| --  | _(内置模型查找)_         | OpenClaw 会先尝试正常的注册表/目录路径                                                          | _(不是插件钩子)_                                                                                                                         |
| 3   | `normalizeModelId`                | 在查找之前规范化旧式或预览版 model-id 别名                                                     | provider 在规范化模型解析之前负责别名清理                                                                                 |
| 4   | `normalizeTransport`              | 在通用模型组装之前规范化 provider-family 的 `api` / `baseUrl`                                      | provider 为同一传输家族中的自定义 provider ids 负责传输清理                                                          |
| 5   | `normalizeConfig`                 | 在运行时/provider 解析之前规范化 `models.providers.<id>`                                           | provider 需要与插件一起存放的配置清理；打包的 Google-family helper 也会兜底支持的 Google 配置项   |
| 6   | `applyNativeStreamingUsageCompat` | 将原生 streaming-usage 兼容重写应用到配置 provider                                               | provider 需要基于端点的原生 streaming usage 元数据修复                                                                          |
| 7   | `resolveConfigApiKey`             | 在运行时 auth 加载之前解析配置 provider 的 env-marker auth                                       | provider 具有 provider 拥有的 env-marker API key 解析；`amazon-bedrock` 在这里也有一个内置 AWS env-marker 解析器                  |
| 8   | `resolveSyntheticAuth`            | 在不持久化明文的情况下暴露本地/自托管或配置驱动的 auth                                   | provider 可以使用 synthetic/local 凭据标记                                                                                 |
| 9   | `resolveExternalAuthProfiles`     | 覆盖 provider 拥有的外部 auth profiles；CLI/app 拥有凭据的默认 `persistence` 是 `runtime-only` | provider 重用外部 auth 凭据而不持久化复制的 refresh token；在清单中声明 `contracts.externalAuthProviders` |
| 10  | `shouldDeferSyntheticProfileAuth` | 将已存储的 synthetic profile 占位符置于 env/config 驱动 auth 之后                                      | provider 存储的 synthetic 占位符 profiles 不应具有优先级                                                                 |
| 11  | `resolveDynamicModel`             | 对本地注册表中尚不存在的 provider 拥有的 model ids 提供同步回退                                       | provider 接受任意上游 model ids                                                                                                 |
| 12  | `prepareDynamicModel`             | 异步预热，然后再次运行 `resolveDynamicModel`                                                           | provider 在解析未知 ids 之前需要网络元数据                                                                                  |
| 13  | `normalizeResolvedModel`          | 在嵌入式运行器使用已解析模型之前进行最终重写                                               | provider 需要传输重写，但仍然使用核心传输                                                                             |
| 14  | `contributeResolvedModelCompat`   | 为位于另一个兼容传输之下的供应商模型提供兼容标志                                  | provider 在代理传输上识别自己的模型，而无需接管 provider                                                       |
| 15  | `capabilities`                    | 由共享核心逻辑使用的 provider 拥有的转录/工具元数据                                           | provider 需要转录/provider-family 怪异行为                                                                                              |
| 16  | `normalizeToolSchemas`            | 在嵌入式运行器看到工具 schema 之前对其进行规范化                                                    | provider 需要传输家族 schema 清理                                                                                                |
| 17  | `inspectToolSchemas`              | 在规范化后暴露 provider 拥有的 schema 诊断                                                  | provider 希望得到关键字警告，而无需让 core 学习 provider 特定规则                                                                 |
| 18  | `resolveReasoningOutputMode`      | 选择原生 vs 标记化 reasoning-output 契约                                                              | provider 需要标记化 reasoning/final 输出，而不是原生字段                                                                         |
| 19  | `prepareExtraParams`              | 通用 stream 选项包装器之前的请求参数规范化                                              | provider 需要默认请求参数或按 provider 的参数清理                                                                           |
| 20  | `createStreamFn`                  | 用自定义传输完全替换正常 stream 路径                                                   | provider 需要自定义线协议，而不只是包装器                                                                                     |
| 21  | `wrapStreamFn`                    | 在应用通用包装器之后的 stream 包装器                                                              | provider 需要请求 headers/body/model 兼容包装器，而不需要自定义传输                                                          |
| 22  | `resolveTransportTurnState`       | 附加原生每轮传输 headers 或元数据                                                           | provider 希望通用传输发送 provider 原生的轮次标识                                                                       |
| 23  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket headers 或 session 冷却策略                                                    | provider 希望通用 WS 传输调整 session headers 或回退策略                                                               |
| 24  | `formatApiKey`                    | auth profile 格式化器：存储的 profile 成为运行时 `apiKey` 字符串                                     | provider 存储额外 auth 元数据并需要自定义运行时 token 形态                                                                    |
| 25  | `refreshOAuth`                    | 针对自定义刷新端点或 refresh-failure 策略的 OAuth 刷新覆盖                                  | provider 不适配共享的 `pi-ai` 刷新器                                                                                           |
| 26  | `buildAuthDoctorHint`             | 当 OAuth 刷新失败时附加的修复提示                                                                  | provider 需要 provider 拥有的 auth 修复指导                                                                      |
| 27  | `matchesContextOverflowError`     | provider 拥有的上下文窗口溢出匹配器                                                                 | provider 具有通用启发式会遗漏的原始溢出错误                                                                                |
| 28  | `classifyFailoverReason`          | provider 拥有的 failover 原因分类                                                                  | provider 可以将原始 API/传输错误映射到 rate-limit/overload 等                                                                          |
| 29  | `isCacheTtlEligible`              | 面向代理/backhaul providers 的 prompt-cache 策略                                                               | provider 需要 provider 特定的缓存 TTL 门控                                                                                                |
| 30  | `buildMissingAuthMessage`         | 通用缺失 auth 恢复消息的替代方案                                                      | provider 需要 provider 特定的缺失 auth 恢复提示                                                                                 |
| 31  | `suppressBuiltInModel`            | 过期上游模型抑制以及可选的面向用户错误提示                                          | provider 需要隐藏过期的上游行，或用供应商提示替换它们                                                                 |
| 32  | `augmentModelCatalog`             | 发现后附加的 synthetic/final 目录行                                                          | provider 需要在 `models list` 和选择器中提供 synthetic 前向兼容行                                                                     |
| 33  | `resolveThinkingProfile`          | 模型特定 `/think` 级别集合、显示标签和默认值                                                 | provider 为所选模型暴露自定义 thinking 阶梯或二元标签                                                                 |
| 34  | `isBinaryThinking`                | 开/关 reasoning 切换兼容性钩子                                                                     | provider 只暴露二元 thinking 开/关                                                                                                  |
| 35  | `supportsXHighThinking`           | `xhigh` reasoning 支持兼容性钩子                                                                   | provider 只希望在部分模型上支持 `xhigh`                                                                                             |
| 36  | `resolveDefaultThinkingLevel`     | 默认 `/think` 级别兼容性钩子                                                                      | provider 拥有某个模型族的默认 `/think` 策略                                                                                      |
| 37  | `isModernModelRef`                | 用于实时 profile 过滤和 smoke 选择的 modern-model 匹配器                                              | provider 拥有实时/smoke 首选模型匹配                                                                                             |
| 38  | `prepareRuntimeAuth`              | 在推理之前将已配置凭据交换为实际运行时 token/key                       | provider 需要 token 交换或短期请求凭据                                                                             |
| 39  | `resolveUsageAuth`                | 为 `/usage` 和相关状态界面解析 usage/billing 凭据                                     | provider 需要自定义 usage/quota token 解析或不同的 usage 凭据                                                               |
| 40  | `fetchUsageSnapshot`              | 在 auth 解析后获取并规范化 provider 特定的 usage/quota 快照                             | provider 需要 provider 特定的 usage 端点或 payload 解析器                                                                           |
| 41  | `createEmbeddingProvider`         | 为 memory/search 构建 provider 拥有的 embedding 适配器                                                     | memory embedding 行为属于 provider 插件                                                                                    |
| 42  | `buildReplayPolicy`               | 返回一个控制该 provider 转录处理的 replay 策略                                        | provider 需要自定义转录策略（例如，移除 thinking-block）                                                               |
| 43  | `sanitizeReplayHistory`           | 在通用转录清理之后重写 replay 历史                                                        | provider 需要超出共享压缩 helper 的 provider 特定 replay 重写                                                             |
| 44  | `validateReplayTurns`             | 在嵌入式运行器之前进行最终 replay-turn 验证或重塑                                           | provider 传输在通用清理之后需要更严格的 turn 验证                                                                    |
| 45  | `onModelSelected`                 | 运行 provider 拥有的选择后副作用                                                                 | 当模型变为活动状态时，provider 需要遥测或 provider 拥有的状态                                                                  |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 会先检查
匹配到的 provider 插件，然后继续下放到其他具备钩子能力的 provider 插件，
直到某个插件真正更改了 model id 或 transport/config。这样可以保持
别名/兼容 provider shim 正常工作，而无需调用方知道由哪个打包插件负责重写。如果没有任何 provider 钩子重写某个受支持的
Google-family 配置项，打包的 Google 配置规范化器仍会应用那项兼容清理。

如果 provider 需要完全自定义的线协议或自定义请求执行器，
那就是另一类扩展。这些钩子用于仍在 OpenClaw 正常推理循环上运行的 provider 行为。

### Provider 示例

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

打包的 provider 插件会组合上述钩子，以适配各个厂商的目录、
auth、thinking、replay 和 usage 需求。权威钩子集合保留在各个插件的
`extensions/` 下；本页展示的是形态，而不是逐项复述列表。

<AccordionGroup>
  <Accordion title="透传目录 providers">
    OpenRouter、Kilocode、Z.AI、xAI 注册 `catalog` 加上
    `resolveDynamicModel` / `prepareDynamicModel`，以便它们可以在 OpenClaw 的静态目录之前呈现上游
    model ids。
  </Accordion>
  <Accordion title="OAuth 和 usage 端点 providers">
    GitHub Copilot、Gemini CLI、ChatGPT Codex、MiniMax、小米、z.ai 将
    `prepareRuntimeAuth` 或 `formatApiKey` 与 `resolveUsageAuth` +
    `fetchUsageSnapshot` 结合，以掌控 token 交换和 `/usage` 集成。
  </Accordion>
  <Accordion title="Replay 和转录清理家族">
    共享的命名家族（`google-gemini`、`passthrough-gemini`、
    `anthropic-by-model`、`hybrid-anthropic-openai`）允许 providers 通过
    `buildReplayPolicy` 进入转录策略，而不是由每个插件各自重新实现清理。
  </Accordion>
  <Accordion title="仅目录 providers">
    `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`nvidia`、
    `qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 和
    `volcengine` 只注册 `catalog` 并运行在共享推理循环上。
  </Accordion>
  <Accordion title="Anthropic 特定 stream helper">
    Beta headers、`/fast` / `serviceTier` 和 `context1m` 存在于
    Anthropic 插件公开的 `api.ts` / `contract-api.ts` 接缝中
    （`wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
    `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`），而不是放在
    通用 SDK 中。
  </Accordion>
</AccordionGroup>

## 运行时辅助工具

插件可以通过 `api.runtime` 访问选定的核心辅助工具。对于 TTS：

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

说明：

- `textToSpeech` 会为文件/语音备注界面返回标准的核心 TTS 输出负载。
- 使用核心 `messages.tts` 配置和提供方选择。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供方进行重采样/编码。
- `listVoices` 对每个提供方来说是可选的。可用于厂商自有的语音选择器或配置流程。
- 语音列表可以包含更丰富的元数据，例如地区、性别以及供感知提供方的个性标签。
- OpenAI 和 ElevenLabs 目前支持电话语音。Microsoft 不支持。

插件还可以通过 `api.registerSpeechProvider(...)` 注册语音提供方。

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

说明：

- 将 TTS 策略、回退和回复交付保留在核心中。
- 对于厂商自有的合成行为，请使用语音提供方。
- 旧版 Microsoft `edge` 输入会被规范化为 `microsoft` 提供方 id。
- 首选的所有权模型是面向公司的：随着 OpenClaw 增加这些能力契约，一个厂商插件可以拥有
  文本、语音、图像以及未来的媒体提供方。

对于图像/音频/视频理解，插件不是注册一个通用的键/值袋，而是注册一个类型化的
媒体理解提供方：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

说明：

- 将编排、回退、配置和通道接线保留在核心中。
- 将厂商行为保留在提供方插件中。
- 追加式扩展应保持类型化：新的可选方法、新的可选结果字段、新的可选能力。
- 视频生成已经遵循相同模式：
  - 核心拥有能力契约和运行时辅助工具
  - 厂商插件注册 `api.registerVideoGenerationProvider(...)`
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
```

对于音频转录，插件可以使用媒体理解运行时，或者使用旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // 当 MIME 无法可靠推断时可选：
  mime: "audio/ogg",
});
```

说明：

- `api.runtime.mediaUnderstanding.*` 是图像/音频/视频理解的首选共享接口。
- 使用核心媒体理解音频配置（`tools.media.audio`）和提供方回退顺序。
- 当未产生任何转录输出时（例如跳过/不支持的输入）返回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 仍保留为兼容别名。

插件还可以通过 `api.runtime.subagent` 启动后台子代理运行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

说明：

- `provider` 和 `model` 是每次运行的可选覆盖项，不是持久的会话更改。
- OpenClaw 仅对受信任的调用者接受这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须通过 `plugins.entries.<id>.subagent.allowModelOverride: true` 显式启用。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 可将受信任插件限制为特定的规范 `provider/model` 目标，或使用 `"*"` 明确允许任何目标。
- 不受信任的插件子代理运行仍然可用，但覆盖请求会被拒绝，而不是静默回退。

对于网络搜索，插件可以消费共享运行时辅助工具，而不是
直接深入代理工具接线：

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

插件还可以通过
`api.registerWebSearchProvider(...)` 注册网络搜索提供方。

说明：

- 将提供方选择、凭据解析和共享请求语义保留在核心中。
- 对于厂商特定的搜索传输，请使用网络搜索提供方。
- 对于需要搜索行为但不依赖代理工具包装器的功能/通道插件，`api.runtime.webSearch.*` 是首选共享接口。

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`：使用已配置的图像生成提供方链生成一张图像。
- `listProviders(...)`：列出可用的图像生成提供方及其能力。

## 网关 HTTP 路由

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

- `path`：网关 HTTP 服务器下的路由路径。
- `auth`：必填。使用 `"gateway"` 以要求正常的网关认证，或使用 `"plugin"` 以进行插件管理的认证/ webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其自己的现有路由注册。
- `handler`：当该路由处理了请求时返回 `true`。

说明：

- `api.registerHttpHandler(...)` 已被移除，并会导致插件加载错误。请改用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 精确的 `path + match` 冲突会被拒绝，除非设置 `replaceExisting: true`，并且一个插件不能替换另一个插件的路由。
- 具有不同 `auth` 级别的重叠路由会被拒绝。仅在同一 auth 级别上保留 `exact`/`prefix` 的兜底链。
- `auth: "plugin"` 路由**不会**自动接收操作员运行时作用域。它们用于插件管理的 webhook/签名验证，而不是特权的 Gateway 辅助调用。
- `auth: "gateway"` 路由运行在 Gateway 请求运行时作用域内，但该作用域是刻意保守的：
  - 共享密钥 bearer 认证（`gateway.auth.mode = "token"` / `"password"`）会将插件路由运行时作用域固定为 `operator.write`，即使调用方发送了 `x-openclaw-scopes`
  - 受信任的、带身份的 HTTP 模式（例如 `trusted-proxy`，或在私有入口上使用的 `gateway.auth.mode = "none"`）仅在显式存在该头时才会接受 `x-openclaw-scopes`
  - 如果在这些带身份的插件路由请求中缺少 `x-openclaw-scopes`，运行时作用域会回退到 `operator.write`
- 实用规则：不要把网关认证的插件路由当作隐式管理员入口。如果你的路由需要仅管理员可用的行为，请要求使用带身份的认证模式，并记录显式的 `x-openclaw-scopes` 头契约。

## 插件 SDK 导入路径

编写新插件时，请使用较窄的 SDK 子路径，而不是单一的 `openclaw/plugin-sdk` 根
barrel。核心子路径：

| 子路径                              | 目的                                               |
| ----------------------------------- | -------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | 插件注册原语                                         |
| `openclaw/plugin-sdk/channel-core`  | 通道入口/构建辅助工具                                   |
| `openclaw/plugin-sdk/core`          | 通用共享辅助工具和总括契约                               |
| `openclaw/plugin-sdk/config-schema` | 根 `openclaw.json` Zod 模式（`OpenClawSchema`） |

通道插件从一组较窄的接缝中选择 —— `channel-setup`、
`setup-runtime`、`setup-adapter-runtime`、`setup-tools`、`channel-pairing`、
`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-lifecycle`、
`channel-reply-pipeline`、`command-auth`、`secret-input`、`webhook-ingress`、
`channel-targets` 和 `channel-actions`。审批行为应统一到一个
`approvalCapability` 契约上，而不是在不相关的
插件字段之间混用。参见 [通道插件](/plugins/sdk-channel-plugins)。

运行时和配置辅助工具位于对应的 `*-runtime` 子路径下
（`approval-runtime`、`config-runtime`、`infra-runtime`、`agent-runtime`、
`lazy-runtime`、`directory-runtime`、`text-runtime`、`runtime-store` 等）。

<Info>
`openclaw/plugin-sdk/channel-runtime` 已弃用 — 这是为旧插件提供的兼容层。新代码应改为导入更窄的通用原语。
</Info>

仓库内部入口点（按打包的插件包根目录）：

- `index.js` — 打包后的插件入口
- `api.js` — 辅助工具/类型总括
- `runtime-api.js` — 仅运行时总括
- `setup-entry.js` — 设置插件入口

外部插件只能导入 `openclaw/plugin-sdk/*` 子路径。切勿
从核心或其他插件中导入另一个插件包的 `src/*`。Facade 加载的入口点会优先使用活动的运行时配置快照（如果存在），然后才回退到磁盘上的解析后配置文件。

像 `image-generation`、`media-understanding` 和 `speech` 这样的特定能力子路径之所以存在，是因为打包的插件今天正在使用它们。它们并不
会自动成为长期冻结的外部契约——在依赖它们时请查看相关的 SDK 参考页面。

## 消息工具架构

插件应自行负责特定于通道的 `describeMessageTool(...)` 架构
贡献，用于 reactions、reads 和 polls 等非消息原语。
共享的发送呈现应使用通用的 `MessagePresentation` 合同，
而不是 provider 原生的 button、component、block 或 card 字段。
有关该合同、
回退规则、provider 映射和插件作者检查清单，请参见
[消息呈现](/plugins/message-presentation)。

具备发送能力的插件通过消息能力声明其可渲染内容：

- `presentation` 用于语义化呈现块（`text`、`context`、`divider`、`buttons`、`select`）
- `delivery-pin` 用于置顶发送请求

Core 会决定是原生渲染该呈现，还是降级为文本。
不要从通用消息工具中暴露 provider 原生 UI 的逃生口。
面向旧版原生架构的已弃用 SDK 辅助函数仍会导出，以兼容现有
第三方插件，但新插件不应使用它们。

## 通道目标解析

通道插件应自行负责特定于通道的目标语义。保持共享的
出站主机保持通用，并使用消息适配器接口处理 provider 规则：

- `messaging.inferTargetChatType({ to })` 用于在目录查找前决定一个规范化目标
  应被视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉 core 一个
  输入是否应直接跳过目录搜索，转而进入类似 id 的解析。
- `messaging.targetResolver.resolveTarget(...)` 是插件回退路径，当
  core 在规范化之后或目录未命中之后需要最终由 provider 拥有的解析时使用。
- `messaging.resolveOutboundSessionRoute(...)` 在目标解析后负责
  构建 provider 特定的会话路由。

推荐拆分方式：

- 使用 `inferTargetChatType` 处理应在搜索 peers/groups 之前发生的类别判断。
- 使用 `looksLikeId` 处理“把它当作显式/原生目标 id”之类的检查。
- 使用 `resolveTarget` 作为 provider 特定的规范化回退，不要用于
  广泛的目录搜索。
- 将聊天 id、thread id、JID、handle 和 room id 等 provider 原生 id
  放在 `target` 值或 provider 特定参数中，不要放在通用 SDK
  字段中。

## 基于配置的目录

从配置派生目录条目的插件，应将该逻辑保留在插件内部，并复用
`openclaw/plugin-sdk/directory-runtime` 中的共享辅助函数。

当某个通道需要基于配置的 peers/groups，例如以下情况时使用：

- 基于 allowlist 的 DM peers
- 已配置的 channel/group 映射
- 账户作用域的静态目录回退

`directory-runtime` 中的共享辅助函数只处理通用操作：

- 查询过滤
- 限制应用
- 去重/规范化辅助
- 构建 `ChannelDirectoryEntry[]`

通道特定的账户检查和 id 规范化应保留在
插件实现中。

## Provider 目录

Provider 插件可以使用 `registerProvider({ catalog: { run(...) { ... } } })`
为推理定义模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入
`models.providers` 相同的结构：

- `{ provider }` 表示单个 provider 条目
- `{ providers }` 表示多个 provider 条目

当插件拥有 provider 特定模型 id、base URL 默认值，或受认证门控的模型元数据时，
使用 `catalog`。

`catalog.order` 控制插件目录与 OpenClaw 内置隐式 provider 的合并顺序：

- `simple`：普通 API key 或 env 驱动的 provider
- `profile`：当认证 profile 存在时出现的 provider
- `paired`：合成多个相关 provider 条目的 provider
- `late`：最后一轮，在其他隐式 provider 之后

后面的 provider 会在键冲突时获胜，因此插件可以有意用相同的 provider id
覆盖内置 provider 条目。

兼容性：

- `discovery` 仍然可作为旧别名使用
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 会使用 `catalog`

## 只读通道检查

如果你的插件注册了通道，建议同时实现
`plugin.config.inspectAccount(cfg, accountId)` 与 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是运行时路径。它可以假定凭据已完全具现化，
  并且在缺少必需密钥时可以快速失败。
- 只读命令路径，例如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve`，以及 doctor/config
  修复流程，不应仅为了描述配置而需要具现化运行时凭据。

建议的 `inspectAccount(...)` 行为：

- 仅返回描述性的账户状态。
- 保留 `enabled` 和 `configured`。
- 在相关时包含凭据来源/状态字段，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 为了报告只读可用性，你不需要返回原始 token 值。
  返回 `tokenStatus: "available"`（以及对应的 source 字段）就足以满足状态类命令。
- 当某个凭据通过 SecretRef 配置，但在当前命令路径中不可用时，使用
  `configured_unavailable`。

这使得只读命令可以报告“已配置但在此命令路径中不可用”，而不是崩溃或
把账户错误地报告为未配置。

## 包装包

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

每个条目都会成为一个插件。如果该 pack 列出多个扩展，插件 id
会变成 `name/<fileBase>`。

如果你的插件导入了 npm 依赖，请在该目录中安装它们，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全护栏：每个 `openclaw.extensions` 条目在 symlink 解析后都必须仍位于插件
目录内。逃逸出包目录的条目会被拒绝。

安全说明：`openclaw plugins install` 会用
`npm install --omit=dev --ignore-scripts` 安装插件依赖（运行时没有生命周期脚本、没有 dev 依赖）。请保持插件依赖
树为“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个轻量级的仅 setup 模块。
当 OpenClaw 需要为一个已禁用的通道插件提供 setup 界面时，或者
当某个通道插件已启用但仍未配置时，它会加载 `setupEntry`
而不是完整的插件入口。这会让启动和 setup 更轻量，
尤其是在你的主插件入口还同时连接了工具、hooks 或其他仅运行时
代码时。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以让通道插件在 gateway 的 pre-listen 启动阶段也走同样的
`setupEntry` 路径，即使该通道已经配置完成。

仅当 `setupEntry` 能完整覆盖 gateway 开始监听之前必须存在的启动面时，
才应使用此选项。实际上，这意味着 setup 入口必须注册启动所依赖的
每一项通道拥有的能力，例如：

- 通道注册本身
- gateway 开始监听前必须可用的任何 HTTP 路由
- 在同一窗口内必须存在的任何 gateway 方法、工具或服务

如果你的完整入口仍然拥有任何必需的启动能力，不要启用
此标志。保持插件使用默认行为，让 OpenClaw 在启动期间加载
完整入口。

捆绑的通道也可以发布仅 setup 的 contract-surface 辅助函数，core
可以在加载完整通道运行时之前先行查询。当前的 setup
晋升 surface 为：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

当 core 需要在不加载完整插件入口的情况下，把旧的单账户通道
配置晋升为 `channels.<id>.accounts.*` 时，会使用该 surface。
Matrix 是当前的捆绑示例：当已存在命名账户时，它只会把 auth/bootstrap key
移动到一个命名的已晋升账户中，并且它可以保留一个已配置的非规范默认账户 key，
而不是始终创建 `accounts.default`。

这些 setup patch 适配器保持了捆绑 contract-surface 发现的惰性。
导入时保持轻量；晋升 surface 只在首次使用时加载，
而不是在模块导入时重新进入捆绑通道启动流程。

当这些启动 surface 包含 gateway RPC 方法时，请将它们放在
插件特定前缀下。Core 管理命名空间（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）仍然保留且始终解析为
`operator.admin`，即使插件请求了更窄的作用域。

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

### 通道目录元数据

通道插件可以通过 `openclaw.channel` 公示 setup/discovery 元数据，并通过
`openclaw.install` 提供安装提示。这使 core 目录保持无数据状态。

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

除最小示例外，`openclaw.channel` 还有一些有用字段：

- `detailLabel`：用于更丰富的目录/状态展示的次级标签
- `docsLabel`：覆盖文档链接的链接文本
- `preferOver`：此目录条目应优先于哪些更低优先级的插件/通道 id
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：选择界面文案控制
- `markdownCapable`：将该通道标记为支持 markdown，以用于出站格式化决策
- `exposure.configured`：设为 `false` 时，从已配置通道列表界面中隐藏该通道
- `exposure.setup`：设为 `false` 时，从交互式 setup/configure 选择器中隐藏该通道
- `exposure.docs`：将该通道标记为文档导航界面中的内部/私有通道
- `showConfigured` / `showInSetup`：仍然接受的旧别名，用于兼容性；优先使用 `exposure`
- `quickstartAllowFrom`：让该通道接入标准 quickstart 的 `allowFrom` 流程
- `forceAccountBinding`：即使只有一个账户也要求显式账户绑定
- `preferSessionLookupForAnnounceTarget`：在解析 announce 目标时优先使用会话查找

OpenClaw 还可以合并**外部通道目录**（例如 MPM
registry 导出）。将 JSON 文件放在以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一个或多个 JSON 文件（逗号/分号/`PATH` 分隔）。每个文件应
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 键的旧别名。

生成的通道目录条目和 provider 安装目录条目，会在原始 `openclaw.install` 块旁暴露
规范化的安装来源事实。规范化事实会标识 npm spec 是精确版本还是浮动
选择器，是否存在预期的完整性元数据，以及是否也存在本地
源路径。当目录/包身份已知时，如果解析出的 npm 包名与该身份偏离，
规范化事实会发出警告。它们还会在 `defaultChoice` 无效或指向不可用
来源时发出警告，以及在存在 npm 完整性元数据但没有有效 npm
来源时发出警告。消费者应将 `installSource` 视为附加的可选字段，以便
更旧的手工构建条目和兼容性 shim 无需去合成它。
这让 onboarding 和诊断能够在不导入插件运行时的情况下解释来源平面的状态。

官方的外部 npm 条目应优先使用精确的 `npmSpec` 加上 `expectedIntegrity`。
裸包名和 dist-tag 仍可用于兼容性，但它们会暴露来源平面警告，
以便目录可以在不破坏现有插件的前提下，逐步转向锁定并带完整性校验的安装。
当从本地目录路径进行 onboarding 安装时，如果可能，
会记录一条 `plugins.installs` 记录，其中 `source` 为 `"path"`，以及一个相对于工作区的
`sourcePath`。绝对的运行负载路径保留在
`plugins.load.paths` 中；安装记录避免将本地工作站路径重复写入长期配置。
这使得本地开发安装在来源平面诊断中保持可见，同时不会增加第二个原始
文件系统路径披露面。

## 上下文引擎插件

上下文引擎插件负责摄取、组装和压缩的会话上下文编排。使用 `api.registerContextEngine(id, factory)` 从你的插件中注册它们，然后通过 `plugins.slots.contextEngine` 选择当前启用的引擎。

当你的插件需要替换或扩展默认的上下文流水线，而不只是添加内存搜索或钩子时，请使用这个方式。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "无损之爪", ownsCompaction: true },
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

如果你的引擎**不**拥有压缩算法，请保留 `compact()` 的实现，并显式委托给运行时：

```ts
import {
  buildMemorySystemPromptAddition,
  delegateCompactionToRuntime,
} from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", () => ({
    info: {
      id: "my-memory-engine",
      name: "我的内存引擎",
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

当插件需要现有 API 无法满足的行为时，不要通过私有的内部调用绕过插件系统。应当补充缺失的能力。

推荐流程：

1. 定义核心契约  
   决定核心应拥有哪些共享行为：策略、回退、配置合并、生命周期、面向通道的语义，以及运行时辅助函数的形态。
2. 添加带类型的插件注册/运行时入口  
   在 `OpenClawPluginApi` 和/或 `api.runtime` 上扩展出最小且有用的带类型能力接口。
3. 串联 core + channel/feature 消费方  
   通道和功能插件应通过 core 消费新能力，而不是直接导入某个厂商实现。
4. 注册厂商实现  
   然后由厂商插件将其后端注册到该能力上。
5. 添加契约覆盖  
   添加测试，确保所有权和注册形态长期保持明确。

这就是 OpenClaw 保持意见明确但又不会被硬编码成某一家提供商世界观的方式。请参见 [能力食谱](/tools/capability-cookbook)，获取具体的文件检查清单和完整示例。

### 能力检查清单

当你添加一项新能力时，实现通常应当同时涉及这些表面：

- `src/<capability>/types.ts` 中的核心契约类型
- `src/<capability>/runtime.ts` 中的核心运行器/运行时辅助函数
- `src/plugins/types.ts` 中的插件 API 注册入口
- `src/plugins/registry.ts` 中的插件注册表接线
- 当功能/通道插件需要消费它时，`src/plugins/runtime/*` 中的插件运行时暴露
- `src/test-utils/plugin-registration.ts` 中的捕获/测试辅助函数
- `src/plugins/contracts/registry.ts` 中的所有权/契约断言
- `docs/` 中的运维者/插件文档

如果其中某一处缺失，通常说明该能力还没有完全集成。

### 能力模板

最小模式：

```ts
// 核心契约
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

// 功能/通道插件共享的运行时辅助函数
const clip = await api.runtime.videoGeneration.generate({
  prompt: "展示机器人穿过实验室的画面。",
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
- 契约测试保持所有权明确

## 相关内容

- [插件架构](/plugins/architecture) — 公共能力模型与形态
- [插件 SDK 子路径](/plugins/sdk-subpaths)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
