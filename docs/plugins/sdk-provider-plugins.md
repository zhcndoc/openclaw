---
summary: "构建 OpenClaw 的模型提供方插件的分步指南"
title: "构建提供方插件"
sidebarTitle: "提供方插件"
read_when:
  - "你正在构建一个新的模型提供方插件"
  - "您想要将 OpenAI- 兼容代理或自定义 LLM 添加到 OpenClaw"
  - "你需要了解提供方认证、目录和运行时钩子"
---

构建一个提供程序插件，将模型提供程序 （LLM） 添加到 OpenClaw：模型目录、API-key 身份验证和动态模型解析。

Acme AI 是本指南及其子页面中使用的虚构供应商。示例中名为 `fetchAcme*` 的帮助程序是您自己的供应商 API 调用的占位符，而不是导出的 OpenClaw 函数。

<Info>
  OpenClaw 插件新手？首先阅读 [Getting Started](/plugins/building-plugins) 了解包结构和清单设置。
</Info>

<Tip>
  提供方插件会将模型添加到 OpenClaw 的常规推理循环中。如果模型必须通过管理线程、压缩或工具事件的原生 agent 守护进程运行，请将提供方与一个 [agent harness](/plugins/sdk-agent-harness) 配对，而不是将守护进程协议的详细信息放入核心中。
</Tip>

当登录属于本机harness时，身份验证方法可以返回 `agentRuntimeId` 和 `defaultModel`。模型设置将该运行时应用于所选代理的模型条目，而不是全局模型默认值。

当呼叫者有目标座席时，`ProviderAuthContext.agentId` 标识目标座席。本机登录方法可以使用它来检查以前记住的权限。用户明确同意后，返回 `ProviderAuthResult.nativeRuntimeConsent` 以及接受的harness ID。模型设置在运行时路由和插件启用时在同一经过验证的配置提交中暂存该代理上的这些权限。不要编写单独的权限存储或从成功登录推断同意。

## <a id="import-an-existing-credential-during-sign-in"></a> 登录时导入现有凭证

auth 方法可以使用 `migrationProviderId`、精确的 `itemId` 和 `credentialKind`（`api_key`、`oauth` 或 `token`）来声明 `credentialImport`。 `models auth login` 在开始交互式登录之前要求迁移所有者提供仅授权计划。 `--force`、`--profile-id` 和 `--set-default` 跳过导入。 `--set-default` 通过正常登录流程使用 auth 方法的推荐模型。

迁移插件在 `contracts.migrationProviders` 中声明其 ID，并且可以从顶级 `migration-provider-api.ts` 公共工件导出 `buildMigrationProvider()`。保持该条目轻量级。捆绑的插件和启用的已安装的插件可以提供它，而无需替换正在运行的插件注册表。明确禁用或拒绝的迁移所有者无法执行他们的工件。现有的捆绑迁移兼容性规则仍然适用。

登录调用者仅选择声明的身份验证项。其详细信息必须包含匹配的 `provider` 和 `credentialKind`。迁移结果还提供保存的 `profileId`。所有者必须尊重取消，在保留之前重新读取所选源，并拒绝更改的凭据。登录通过 `configPatchMode: "none"`，因此导入保留模型默认值和限制。不可用的存储或不可用的匹配 OAuth 配置文件将继续交互式登录。仅匹配的帐户身份并不能使过期的凭据可用。失败的选定导入会停止操作，而不是静默地启动不同的登录。

## <a id="loopback-oauth-callbacks"></a> Loopback OAuth 回调

捆绑提供程序使用 `openclaw/plugin-sdk/provider-auth-runtime` 中的 `startProviderOAuthLoopbackCallbackServer` 在打开浏览器之前绑定其回调。 `waitForCallback()` 返回 OAuth 错误或经过验证的 code/state 与 `parameters: URLSearchParams` 对特定于提供商的字段。重复的参数仍然可供提供商验证。

默认响应确认回调并关闭侦听器。设置`deferResponse: true`，在调用`complete({ status, body, contentType })`之前完成令牌交换和身份检查。中止，可选`timeoutMs`，浏览器断开连接仍然关闭延迟响应；迟到的 `complete()` 是空操作。始终在 `finally` 中调用 `close()`。调用者的信号和权限检查自己的令牌请求和持久性；听众的截止日期不会取消该工作。

默认情况下，侦听器绑定为重定向主机名解析的每个环回地址。 `bindHostname` 添加环回主机。使用 `bindOnlyHostname` 来保留提供者的确切 Node 绑定主机（`localhost`、`127.0.0.1` 或 `::1`）。

## <a id="handle-model-access-after-sign-in"></a> 登录后处理模型访问

来自 `openclaw/plugin-sdk/provider-auth-login-flow-runtime` 的 `runModelsAuthLoginFlow` 的现有使用者必须在保存凭证后处理选择。当有效的限制可以隐藏提供者的模型时，现有的 `prompter.select` 会收到以下选项：

| 值  | 标签                        | 作用                                                      |
| ------ | ---------------------------- | ----------------------------------------------------------- |
| `all`  | `Show all <Provider> models` | 将该提供商的通配符添加到现有策略所有者。 |
| `keep` | `Keep current restrictions`  | 限制不变。                              |

Render 提供的消息和选项，并返回所选选项的值。不要假设每个 `select` 调用都会选择提供程序或身份验证方法。这两种选择都不会激活新的默认模型。当不存在限制或已经允许整个提供者时，不要求选择。

取消或拒绝此保存后选择不会撤消已保存的凭据。流抛出`ProviderAuthConfigApplyError`，延伸`ProviderCredentialsSavedError`；报告凭证已保存，而不是将其视为失败的凭证交换。选择取消后，限制将保持不变。稍后的应用程序故障可能会导致策略已保存，但在正在运行的网关中不处于活动状态。保持凭证持久性和模型可见性结果不同。

### <a id="defer-the-choice-to-a-later-reply"></a> 推迟选择稍后回复

对于聊天按钮，传递同步 `onModelAccessRequested` 回调。它接收`PreparedProviderModelAccess`请求并替换后保存`select`调用；它不应用该选择。保留准备好的请求，直到登录完成。使用 `createProviderLoginFlowRegistry` 和 `reserveProviderLoginFlow` 仅保留凭证交换。

登录完成后，使用`flows`、`flowKey`、`prepared`、`terminalMessage`呼叫`offerProviderLoginModelAccess`。提供结构化答复。始终使用 `releaseProviderLoginFlow({ flows, flowKey, record })` 释放 `finally` 中的登录。悬而未决的模型访问问题有其自己的生命周期，并且在发布后仍然可以回答；它不会阻止另一个登录。

将后面的命令传递给 `answerProviderLoginModelAccess` 为 `flows`、`flowKey`、`agentId`、`command`、`runtime`、`readConfig` 和 `assertCurrent`； `signal` 是可选的。 `readConfig` 必须返回主机的当前配置。所有者验证答案、应用选择并处理该问题。过期或冲突的选择会根据当前的限制收到一个新问题。使用 `cancelProviderLoginFlow({ flows, flowKey })` 取消任一待处理阶段。不要从按钮文本重建通配符写入或将准备好的请求重新用于新登录。

### <a id="keep-hosted-writes-authorized"></a> 保持托管写入授权

托管呼叫者提供 `signal` 和 `assertCurrent` 来检查当前登录、发送者权限，并在生效前和等待工作后选择 provider/method。单独的中止信号或匹配的登录标识符并不是当前授权。 `beforePersistentEffect` 仍然是凭证持久性准备回调。浏览器授权在凭证阶段后结束；后面的模型选择使用当前对话或向导权限。

对于延迟选择，请通过应答命令的当前权限检查作为 `answerProviderLoginModelAccess.assertCurrent`。在提供时使用其配置参数：它是策略编写器的当前配置。否则读取主机的当前配置。原始登录回调不授权后续命令。让共享所有者报告可见性结果：保存的策略并不能证明正在运行的网关应用了它。

## <a id="submit-json-requests"></a> 提交 JSON 请求

捆绑的承载密钥提供程序使用 `openclaw/plugin-sdk/provider-http` 中的 `resolveProviderApiKeyHttpRequestConfig` 来一起解析当前凭证和 HTTP 请求策略。通过 `req`、`provider`、`missingApiKeyMessage` 和常用的 HTTP 配置选项。 JSON 内容类型为默认值；为多部分或其他非 JSON 请求设置 `jsonContentType: false`。特定于提供者的端点、额外标头和请求覆盖仍然由插件拥有。

当 JSON POST 返回完整的 JSON 响应时，使用 `openclaw/plugin-sdk/provider-http` 中的 `postJsonResponse`。它使用受保护的 POST 传输，检查 HTTP 状态，读取有界的 JSON，并在返回或抛出之前释放传输。轮询和生成的资产下载保留自己的请求生命周期。

通过通常的 `postJsonRequest` 传输选项加上 `errorLabel`。可选`responseLabel`更改JSON解析错误标签；默认为 `errorLabel`。 `errorOptions` 和 `readOptions` 保留 `assertOkOrThrowHttpError` 和 `readProviderJsonResponse` 接受的选项，包括截止日期、字节限制和凭证编辑标头。设置 `objectResponse: true` 需要 JSON 对象；否则使用通用结果类型并在插件边界验证供应商响应。除非调用者明确提供现有的重试选项，否则不会重试提交 POST。

保留 `postJsonRequest` 用于流式或二进制响应、自定义 response/error 解析器以及需要保留响应传输的代码。这些调用者必须在 `finally` 中释放它。

## <a id="walkthrough"></a> 演练

<Steps>
  <Step id="package-and-manifest" title="包装和清单">
    ### <a id="step-1%3A-package-and-manifest"></a><a id="step-1-package-and-manifest"></a> 第 1 步：Package 和 manifest

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-ai",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "providers": ["acme-ai"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-ai",
      "name": "Acme AI",
      "description": "Acme AI model provider",
      "providers": ["acme-ai"],
      "modelSupport": {
        "modelPrefixes": ["acme-"]
      },
      "setup": {
        "providers": [
          {
            "id": "acme-ai",
            "envVars": ["ACME_AI_API_KEY"]
          }
        ]
      },
      "providerAuthAliases": {
        "acme-ai-coding": "acme-ai"
      },
      "providerAuthChoices": [
        {
          "provider": "acme-ai",
          "method": "api-key",
          "choiceId": "acme-ai-api-key",
          "choiceLabel": "Acme AI API key",
          "groupId": "acme-ai",
          "groupLabel": "Acme AI",
          "cliFlag": "--acme-ai-api-key",
          "cliOption": "--acme-ai-api-key <key>",
          "cliDescription": "Acme AI API key"
        }
      ],
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    `setup.providers[].envVars` 允许 OpenClaw 检测凭据，而无需加载插件运行时。当提供程序变体应重用另一个提供程序 ID 的身份验证时，添加 `providerAuthAliases`。 `modelSupport` 是可选的，允许 OpenClaw 在运行时挂钩存在之前从速记模型 ID（如 `acme-large`）自动加载您的提供程序插件。 `package.json` 中的 `openclaw.compat` 和 `openclaw.build` 是 ClawHub 发布所必需的（`openclaw.compat.pluginApi` 和 `openclaw.build.openclawVersion` 是两个必填字段。当省略时，`minGatewayVersion` 回退到 `openclaw.install.minHostVersion`）。

    示例清单中的版本字符串是占位符。将它们固定到您的插件构建和测试所针对的 OpenClaw 版本。

  </Step>

  <Step id="register-the-provider" title="注册提供商">
    最小文本提供程序需要 `id`、`label`、`auth` 和 `catalog`。 `catalog` 是提供商拥有的 runtime/config 挂钩。它可以调用实时供应商 API 并返回 `models.providers` 条目。

    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";

    export default definePluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      register(api) {
        api.registerProvider({
          id: "acme-ai",
          label: "Acme AI",
          docsPath: "/providers/acme-ai",
          envVars: ["ACME_AI_API_KEY"],

          auth: [
            createProviderApiKeyAuthMethod({
              providerId: "acme-ai",
              methodId: "api-key",
              label: "Acme AI API key",
              hint: "API key from your Acme AI dashboard",
              optionKey: "acmeAiApiKey",
              flagName: "--acme-ai-api-key",
              envVar: "ACME_AI_API_KEY",
              promptMessage: "Enter your Acme AI API key",
              defaultModel: "acme-ai/acme-large",
            }),
          ],

          catalog: {
            order: "simple",
            run: async (ctx) => {
              const apiKey =
                ctx.resolveProviderApiKey("acme-ai").apiKey;
              if (!apiKey) return null;
              return {
                provider: {
                  baseUrl: "https://api.acme-ai.com/v1",
                  apiKey,
                  api: "openai-completions",
                  models: [
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
                  ],
                },
              };
            },
          },
        });

        api.registerModelCatalogProvider({
          provider: "acme-ai",
          kinds: ["text"],
          liveCatalog: async (ctx) => {
            const apiKey = ctx.resolveProviderApiKey("acme-ai").apiKey;
            if (!apiKey) return null;
            return [
              {
                kind: "text",
                provider: "acme-ai",
                model: "acme-large",
                label: "Acme Large",
                source: "live",
              },
            ];
          },
        });
      },
    });
    ```

    `registerModelCatalogProvider` 是 list/help/picker UI 的较新控制平面目录表面，涵盖 `text`、`voice`、`image_generation`、`video_generation` 和 `music_generation` 行。将供应商端点调用和响应映射保留在插件中。 OpenClaw 拥有共享行形状、源标签和帮助渲染。

    这是一个可运行的提供方。现在，用户可以运行 `openclaw onboard --acme-ai-api-key <key>`，并选择 `acme-ai/acme-large` 作为模型。

    对于从已加载的身份验证存储中进行提供程序密钥查找和选择，请从 `openclaw/plugin-sdk/provider-auth` 导入 `findNormalizedProviderValue` 和 `resolveAuthProfileOrder`。这使得提供者入口点不会仅仅为了选择凭证而加载完整的代理运行时。已弃用的 `agent-runtime` 导出仍可用于兼容性。在新代码中使用较窄的 `provider-auth` 路线。请参阅 [ 删除时间表 ](/plugins/sdk-migration/removal-timeline)，了解管理此页面及其子页面上指定的已弃用表面的日期和关卡。

    要读取运行时身份验证配置文件，请等待来自 `openclaw/plugin-sdk/agent-runtime` 的 `loadAuthProfileStoreForRuntimeAsync`。它读取数据库工作线程中的持久配置文件，并为服务拥有的状态目录保留可选的第三个 `env` 参数。同步 `loadAuthProfileStoreForRuntime` 在 2026 年 12 月 31 日之前已弃用，并将在 2027 年 1 月的第一个稳定版本中删除。

    `createProviderApiKeyAuthMethod` 接受可选的 `validateApiKey` 回调。在返回或保存任何身份验证配置文件之前，返回错误消息以拒绝已解析的密钥。该检查针对交互式输入、已解析的 SecretRefs 以及非交互式标志、环境或保存的配置文件凭据运行。

    当供应商提示或验证需要在身份验证步骤之间停留时，捆绑的自定义 API-key 方法可以使用 `openclaw/plugin-sdk/provider-auth-api-key` 中的 `captureProviderApiKey` 和 `persistProviderApiKey`。 `captureProviderApiKey(ctx, options)` 接受现有的 token/provider、环境和提示选项。它返回解析的 `apiKey` 与原始存储 `input` 和 `mode` 一起进行验证，而不保存凭据。构建从 `input` 和 `mode` 返回的配置文件，以便 SecretRefs 保留引用。帮助器保留上下文的暂存工作区和秘密存储提示首选项。

    `persistProviderApiKey(ctx, profileId, { provider, resolved, metadata })` 接受已解析的非交互式密钥。它使源自配置文件的凭据保持不变，如果凭据转换失败则返回 `false`，并传播持久性错误。在此通话之前进行供应商检查；之后通过其现有所有者应用 auth-profile 配置和模型默认值。两个助手都不会选择端点或模型。交互式身份验证方法可以使用 `ctx.existingProfiles` 与主机授权的 `{ profileId, credential }` 候选者重新连接。 CLI 登录和入门引导为所选提供商提供存储的配置文件； `--profile-id` 将 CLI 登录范围缩小到该配置文件。个人帐户流量仅提供当前人员选择的私人帐户。列表不存在或为空意味着没有可重复使用的帐户。提供商方法选择兼容的候选人并提供重用或新帐户；他们不得加载共享凭据来填充列表。

    创建静态令牌或 API 密钥的自定义交互式身份验证方法可以在其返回的配置文件上请求受保护的持久性：

    ```typescript
    return {
      profiles: [
        {
          profileId: "acme-ai:device",
          credential: { type: "token", provider: "acme-ai", token },
          secretStorage: {
            kind: "store",
            namePrefix: "ACME_AI_TOKEN",
          },
        },
      ],
    };
    ```

    OpenClaw 仅在分阶段验证运行时保留内联值。在最终持久性边界，它将值写入受保护的本地存储，并在身份验证配置文件中保存 `tokenRef` 或 `keyRef`。 `namePrefix` 必须是大写环境样式名称。 OpenClaw 添加了从提供商和最终配置文件 ID 派生的稳定后缀，因此多个配置文件保持独立。仅将其用于提供商创建的静态凭证，而不是轮换 OAuth 凭证或已作为 SecretRefs 提供的值。

    有关实时 `/models` 发现、目录帮助程序、定价标准化和更窄的单一提供商入口点，请参阅 [ 提供商模型目录](/plugins/sdk-provider-plugins/model-catalogs)。

  </Step>

  <Step id="add-dynamic-model-resolution" title="添加动态模型分辨率">
    如果您的提供商接受任意模型 ID（如代理或路由器），请添加 `resolveDynamicModel`：

    ```typescript
    api.registerProvider({
      // ... id, label, auth, catalog from above

      resolveDynamicModel: (ctx) => ({
        id: ctx.modelId,
        name: ctx.modelId,
        provider: "acme-ai",
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      }),
    });
    ```

    如果解析需要网络调用，则直接从 `prepareDynamicModel` 返回请求的模型。 OpenClaw 应用与同步动态分辨率相同的配置覆盖和标准化。不返回任何内容的现有挂钩在准备后仍会重试 `resolveDynamicModel`。

  </Step>

  <Step id="add-runtime-hooks-as-needed" title="添加运行时挂钩（根据需要）">
    大多数提供方只需要 `catalog` + `resolveDynamicModel`。随着你的提供方需要，再逐步添加钩子。

    从 [Provider 钩子族 ](/plugins/sdk-provider-plugins/hook-families) 中的共享族构建器开始，然后使用 [Provider 钩子接线 ](/plugins/sdk-provider-plugins/runtime-hooks) 连接各个钩子。

  </Step>

  <Step id="add-extra-capabilities-optional" title="添加额外功能（可选）">
    ### <a id="step-5%3A-add-extra-capabilities"></a><a id="step-5-add-extra-capabilities"></a> 第 5 步：添加额外能力

    提供程序插件可以注册嵌入、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网络获取和网络搜索以及文本推理。 OpenClaw 将此分类为 **hybrid-capability** 插件 - 公司插件的推荐模式（每个供应商一个插件）。请参阅 [ 内部：功能 Ownership](/plugins/architecture#capability-ownership-model)。

    从 [ 提供语音功能 ](/plugins/sdk-provider-plugins/voice-and-audio) 注册音频功能。从 [Provider 媒体和搜索 ](/plugins/sdk-provider-plugins/media-and-search) 注册嵌入、生成、获取和搜索。

  </Step>

  <Step id="test" title="测试">
    ### <a id="step-6%3A-test"></a><a id="step-6-test"></a> 第 6 步：测试

    ```typescript src/provider.test.ts
    import { describe, it, expect } from "vitest";
    // Export your provider config object from index.ts or a dedicated file
    import { acmeProvider } from "./provider.js";

    describe("acme-ai provider", () => {
      it("resolves dynamic models", () => {
        const model = acmeProvider.resolveDynamicModel!({
          modelId: "acme-beta-v3",
        } as any);
        expect(model.id).toBe("acme-beta-v3");
        expect(model.provider).toBe("acme-ai");
      });

      it("returns catalog when key is available", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: "test-key" }),
        } as any);
        expect(result?.provider?.models).toHaveLength(2);
      });

      it("returns null catalog when no key", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: undefined }),
        } as any);
        expect(result).toBeNull();
      });
    });
    ```

  </Step>
</Steps>

## <a id="publish-to-clawhub"></a> 发布到 ClawHub

提供方插件与其他外部代码插件的发布方式相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

`clawhub skill publish <path>` 是用于发布 skill 文件夹的不同命令，而不是用于发布插件包的命令——不要在此处使用它。

## <a id="file-structure"></a> 文件结构

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with provider auth metadata
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## <a id="catalog-order-reference"></a> 目录顺序参考

`catalog.order` 控制你的目录与内置提供者合并的相对时机：

| 顺序     | 什么时候          | 使用场景                                        |
| --------- | ------------- | ----------------------------------------------- |
| `simple`  | 第一关    | 普通 API- 密钥提供商                         |
| `profile` | simple 之后  | 由认证配置文件控制的提供者                |
| `paired`  | profile 之后 | 合成多个相关条目             |
| `late`    | 最后一轮     | 覆盖现有提供者（冲突时获胜） |

在每个阶段中，OpenClaw 同时运行最多四个目录挂钩。它等待阶段稳定，然后按提供者标签顺序合并模型行和提供者结果。 Hook 保留其各自的发现期限​​；完成顺序不会更改目录优先级。

## <a id="provider-stream-decorators"></a> Provider 流装饰器

`wrapStreamFn` 接收提供商拥有的行为的可选请求上下文：

- `modelParams` 仅包含每个模型参数，当前代理的模型参数优先于默认模型参数。排除全局和代理范围的参数； `extraParams` 仍然包含合并的请求参数。
- `modelCallUrgency` 是主机的 `foreground`、`normal` 或 `background` 分类。仅当所选端点支持并且操作员已启用该行为时，才将其转换为提供者本机调度提示。

仅装饰请求的包装器可以使用 `preservesGenericCompatibility: true` 返回其可调用项，例如 `Object.assign(decoratedStream, { preservesGenericCompatibility: true })`。这使共享请求整形和输出标准化保持活动状态，包括 MiMo 推理重放和最终答案处理。如果没有该标志，替换流将保留获取这些兼容性策略所有权的现有行为。返回原始流或不使用包装器也会保留它们。

捆绑适配器通过现有的专用 `provider-stream-shared` 接缝共享 `wrapProviderPayloadHook` 和 `mapAssistantMessageStream`。有效负载组合在调用者挂钩之前运行默认值，并在其结果稳定后进行线约束；每个适配器都保留自己的 replacement/null 策略。流映射器保留同步返回而不导入嵌入式运行器。这些是捆绑的实施助手，而不是新的第三方 SDK 合约。

注入客户端适配器还通过私有 `provider-transport-runtime` 接缝重用 Anthropic 思维和输出上限所有者。客户端创建和特定于提供者的默认值保留在适配器中；共享请求构建器拥有采样限制和缓存标记预算。

本地提供程序传输可以通过可选的 `StreamOptions.onProviderWait` 回调报告短暂等待。在等待响应时传递 `"response"`，或者仅当后端证据将当前请求与槽等待相关联时传递 `"slot"`。通过 `null` 进行清除。这是状态元数据，绝不是辅助文本或取消释放后端插槽的证据。

`openclaw/plugin-sdk/provider-transport-runtime` 中的 `createProviderWaitObserver` 提供共享延迟状态生命周期。在分派准备好的请求时调用 `start()`，在第一个响应事件和清理时调用 `stop()`。它在一秒后发出通用响应等待，并在取消或 `stop()` 时清除它。当调用者没有观察到等待时，它不会创建计时器。拥有请求相关证据的提供者可以致电 `report("slot")`。任何后端探测都必须受到该请求的生命周期的限制；不要添加始终在线的轮询循环。

## <a id="next-steps"></a> 下一步

- [Channel Plugins](/plugins/sdk-channel-plugins) - 如果你的插件还提供一个 channel
- [SDK Runtime](/plugins/sdk-runtime) - `api.runtime` 辅助函数（TTS、搜索、subagent）
- [SDK Overview](/plugins/sdk-overview) - 完整的子路径导入参考
- [Plugin Internals](/plugins/architecture-internals#provider-runtime-hooks) - hook 详情和捆绑示例。

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的五个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="provider-model-catalogs"></a> Provider 模型目录

[ 提供商模型目录](/plugins/sdk-provider-plugins/model-catalogs) — 实时模型发现、目录帮助程序、定价标准化和单一提供商输入帮助程序。

- <a id="live-model-discovery"></a>[现场模型发现](/plugins/sdk-provider-plugins/model-catalogs#live-model-discovery)

### <a id="provider-hook-families"></a> Provider 挂钩系列

[Provider hook family](/plugins/sdk-provider-plugins/hook-families) — 共享重放、流和工具兼容的系列构建器及其背后的 SDK 接口。

- <a id="sdk-seams-powering-the-family-builders"></a>[SDK 家族构建者背后的接口](/plugins/sdk-provider-plugins/hook-families#sdk-seams-powering-the-family-builders)

### <a id="provider-hook-wiring"></a> Provider挂钩接线

[Provider 挂钩接线](/plugins/sdk-provider-plugins/runtime-hooks) — 用于身份验证交换、标头、传输标识、用法和挂钩顺序表的每个挂钩接线。

- <a id="token-exchange"></a>[代币兑换](/plugins/sdk-provider-plugins/runtime-hooks#token-exchange)
- <a id="custom-headers"></a>[自定义标头](/plugins/sdk-provider-plugins/runtime-hooks#custom-headers)
- <a id="native-transport-identity"></a>[本机传输标识](/plugins/sdk-provider-plugins/runtime-hooks#native-transport-identity)
- <a id="usage-and-billing"></a>[使用和计费](/plugins/sdk-provider-plugins/runtime-hooks#usage-and-billing)
- <a id="common-provider-hooks"></a>[常见供应商挂钩](/plugins/sdk-provider-plugins/runtime-hooks#common-provider-hooks)

### <a id="provider-voice-capabilities"></a> 提供语音能力

[ 提供语音功能](/plugins/sdk-provider-plugins/voice-and-audio) — 语音、实时转录、实时语音和媒体理解功能。

- <a id="speech-tts"></a>[语音 （TTS）](/plugins/sdk-provider-plugins/voice-and-audio#speech-tts)
- <a id="realtime-transcription"></a>[实时转录](/plugins/sdk-provider-plugins/voice-and-audio#realtime-transcription)
- <a id="realtime-voice"></a>[实时语音](/plugins/sdk-provider-plugins/voice-and-audio#realtime-voice)
- <a id="media-understanding"></a>[媒体了解](/plugins/sdk-provider-plugins/voice-and-audio#media-understanding)

### <a id="provider-media-and-search"></a> Provider 媒体和搜索

[ 提供媒体和搜索](/plugins/sdk-provider-plugins/media-and-search) — 嵌入、图像和视频生成、网络获取和网络搜索功能。

- <a id="embeddings"></a>[嵌入](/plugins/sdk-provider-plugins/media-and-search#embeddings)
- <a id="image-and-video-generation"></a>[图像和视频生成](/plugins/sdk-provider-plugins/media-and-search#image-and-video-generation)
- <a id="web-fetch-and-search"></a>[Web 获取和搜索](/plugins/sdk-provider-plugins/media-and-search#web-fetch-and-search)

## <a id="related"></a> 相关内容

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [构建渠道插件](/plugins/sdk-channel-plugins)
- [模型提供商](/concepts/model-providers)
