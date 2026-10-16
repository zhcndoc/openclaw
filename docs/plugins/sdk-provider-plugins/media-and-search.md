---
summary: "嵌入、图像和视频生成、网络获取和网络搜索提供商功能"
read_when:
  - "您正在注册用于内存或搜索的嵌入提供程序"
  - "您正在向提供商插件添加图像、视频或音乐生成"
  - "您正在连接网络获取或网络搜索提供商"
title: "提供商媒体和搜索"
sidebarTitle: "媒体和搜索"
---

提供者插件可以与文本推理一起注册嵌入、生成和 Web 功能。在现有 `api.registerProvider(...)` 调用旁边的 `register(api)` 中注册每一个。 [构建提供商插件](/plugins/sdk-provider-plugins)指南的一部分。

捆绑的运行时适配器可以从私有 `openclaw/plugin-sdk/concurrency-runtime` 子路径使用 `createDeferred` 创建延迟承诺。它返回 `promise`、`resolve` 和 `reject`，而不加载日志记录或提供程序身份验证；适配器保留取消和终端结算的责任。

语音提供者可以使用轻量级 `openclaw/plugin-sdk/speech-provider` 子路径中的 `createSpeechDirectiveParser`。将每个覆盖字段映射到其策略密钥和接受的令牌别名；可选字段回调保留供应商验证和警告文本。共享解析器处理别名分派和策略门控并返回覆盖补丁。主机将这些补丁合并到提供商的累积覆盖中；仅当合并嵌套值（例如语音设置）时，回调才使用 `currentOverrides`。

## <a id="media-and-search-capabilities"></a> 媒体和搜索功能

<Tabs>
  <Tab id="embeddings" title="嵌入">
    ```typescript
    // fetchAcmeEmbedding is your plugin's own vendor API call, not an SDK export.
    api.registerEmbeddingProvider({
      id: "acme-ai",
      defaultModel: "acme-embed",
      transport: "remote",
      authProviderId: "acme-ai",
      create: async ({ model }) => ({
        provider: {
          id: "acme-ai",
          model,
          dimensions: 1536,
          embed: async (input) => {
            const text = typeof input === "string" ? input : input.text;
            return fetchAcmeEmbedding(text);
          },
          embedBatch: async (inputs) =>
            Promise.all(
              inputs.map((input) =>
                fetchAcmeEmbedding(typeof input === "string" ? input : input.text),
              ),
            ),
        },
      }),
    });
    ```

    在`contracts.embeddingProviders`中声明相同的id。这是可重用向量生成的通用嵌入契约，包括内存搜索。不再接受已退休的特定于内存的注册商和清单合同。

    OpenAI-兼容的端点可以使用`createRemoteEmbeddingProvider`从`openclaw/plugin-sdk/memory-core-host-engine-embeddings`。其可选的`buildRequestFields(kind)`回调返回额外的JSON字段为`"query"` or `"document"`请求，例如`dimensions` or `input_type`。共享工厂始终供应客户的`model`和原来的`input`这些字段后面的数组，保留响应计数验证。

    `resolveRemoteEmbeddingClient` 返回的客户端在每个 HTTP 请求之前通过 auth-profile 所有者解析 OAuth 授权。 API 密钥和显式授权标头保持静态。也通过批处理助手传递客户端的可选 `resolveRequestHeaders` 回调：它接收 `{ forceRefresh, signal }` 并返回请求标头。 `withRemoteHttpResponse` 在受保护的调度之前应用这些标头，并提供实际标头作为第二个 `onResponse` 参数以进行错误编辑。如果该处理程序针对 `401 token_expired` 引发提供程序 HTTP 错误，则帮助程序将释放响应，使用 `forceRefresh: true` 解析标头一次，然后仅重试该请求。上传必须使用可重放的正文，例如批处理助手的 `FormData`。

    嵌入适配器可以使用 `openclaw/plugin-sdk/memory-core-host-engine-embeddings` 中的 `resolveEmbeddingProviderSsrFPolicy` 来应用共享模型提供程序网络策略。传递嵌入提供者ID、API、有效基URL以及配置的`request.allowPrivateNetwork`值；将返回的策略重新用于嵌入请求以及批量上传、状态和下载请求。

    如果端点记录了输入数组限制，请在创建的提供程序实例上设置可选的 `maxInputsPerRequest` 字段。对所选端点和模型使用正安全整数；未知时省略。在发送内联嵌入请求之前，内存将其限制在该数量，以及现有的字节预算。当端点报告支持的限制错误时，未声明或过时的限制仍使用反应式拆分。无效声明将被忽略。提供者批处理作业有自己的限制。

    本机 OpenAI 适配器声明 [2048 输入 ](https://developers.openai.com/api/reference/resources/embeddings/methods/create)。服务[embedding-3](https://docs.bigmodel.cn/cn/guide/models/embedding/embedding-3)的插件可以声明64；请勿将该限制应用于没有文档的其他模型。自定义 OpenAI- 兼容端点未声明。使用 `createRemoteEmbeddingProvider` 的捆绑适配器可以将相同的字段传递给该工厂。此可选字段保留现有插件合约、索引内容和嵌入缓存标识。

    `embed` 和 `embedBatch` 接受可选的 `onUsage` 看涨期权。当响应没有有效计数时，报告使用情况的提供程序会在解析之前使用 `{ promptTokens, totalTokens }` 或 `undefined` 对每个成功的上游请求调用一次。调用者可以总结这些报告，并将任何不可用的响应视为不完整的使用。共享远程工厂报告OpenAI-style使用情况；矢量返回值和现有插件保持不变。

    接受模型别名的提供者可以公开`normalizeModel(options): string`。内存使用此同步挂钩来进行创建选项和冷索引身份检查。保持仅配置：不验证或访问网络。重复标准化使已经标准化的值保持不变，并在`create`，它可能接收一个已经标准化的模型或称为外部存储器。仅当模型在发现之前仍未知时才返回空字符串；不要将无效的显式模型转变为省略的选择。对于精确的预初始化身份，`resolveIndexIdentity(options)`另外提供所需的`cacheKeyData`以及任何等效的持久别名。

  </Tab>
  <Tab id="image-and-video-generation" title="图像和视频生成">
    图像和视频能力使用**感知模式**的结构。图像提供方声明必需的 `generate` 和 `edit` 能力块；视频提供方声明 `generate`、`imageToVideo` 和 `videoToVideo`。类似 `maxInputImages`／`maxInputVideos`／`maxDurationSeconds` 的扁平聚合字段不足以清晰地公开变换模式支持或禁用的模式。音乐生成遵循相同的 `generate`／`edit` 模式。

    捆绑提供程序可以使用私有 `openclaw/plugin-sdk/video-generation` 子路径中的 `normalizeVideoGenerationDuration({ durationSeconds })` 来舍入可选持续时间，并在舍入后拒绝 1–9007199254740991 秒之外的值。遗漏返回`undefined`；提供商默认值仍归提供商所有。 `selectSupportedVideoDuration` 从非空列表中选择最接近的值，优先选择较长的平局持续时间。在提供者中保留提供者特定的界限。

    ```typescript
    api.registerImageGenerationProvider({
      id: "acme-ai",
      label: "Acme Images",
      capabilities: {
        generate: { maxCount: 4, supportsSize: true },
        edit: { enabled: false },
      },
      generateImage: async (req) => ({
        images: [
          {
            buffer: await generateAcmeImageBytes(req),
            mimeType: "image/png",
            fileName: "acme-image.png",
          },
        ],
      }),
    });

    api.registerVideoGenerationProvider({
      id: "acme-ai",
      label: "Acme Video",
      defaultTimeoutMs: 600_000,
      models: ["acme-video", "acme-image-video"],
      capabilities: {
        generate: { maxVideos: 1, maxDurationSeconds: 10, supportsResolution: true },
        imageToVideo: {
          enabled: true,
          maxVideos: 1,
          maxInputImages: 1,
          maxInputImagesByModel: { "acme/reference-to-video": 9 },
          maxDurationSeconds: 5,
        },
        videoToVideo: { enabled: false },
      },
      catalogByModel: {
        "acme-image-video": {
          modes: ["imageToVideo"],
          capabilities: {
            imageToVideo: {
              enabled: true,
              maxVideos: 1,
              maxInputImages: 1,
              resolutions: ["480P", "720P", "1080P"],
              supportsResolution: true,
            },
            videoToVideo: { enabled: false },
          },
        },
      },
      generateVideo: async (req) => ({
        videos: [
          {
            url: await generateAcmeVideoUrl(req),
            mimeType: "video/mp4",
          },
        ],
      }),
    });
    ```

    示例中的辅助函数代表提供方调用：图像辅助函数返回非空的编码字节，而视频辅助函数返回托管媒体 URL。视频提供方也可以改为返回非空的编码字节，或者在 URL 是传递回退时同时返回两者。空结果数组和空缓冲区会被视为候选失败，但当视频资源包含可用 URL 时，会忽略空缓冲区并继续使用该 URL。

    两种提供方类型都必须使用 `capabilities`；`edit` 以及视频变换块（`imageToVideo`、`videoToVideo`）始终需要显式的 `enabled` 标志。

    当列出的模型的静态模式或能力与提供方默认值不同时，使用 `catalogByModel`。这些元数据可以在不调用提供方代码的情况下，让 `video_generate action=list` 和模型目录保持准确。请求时的能力查找和强制执行仍应放在 `resolveModelCapabilities` 和 `generateVideo` 中；如有可能，两个路径应复用同一个能力常量。

    以下 [ 私有本地助手](/plugins/sdk-subpaths#compatibility-and-private-local-helpers) 仅支持捆绑和单独发布的官方插件。

    对于异步提供程序作业，来自 `openclaw/plugin-sdk/provider-http` 的 `pollProviderOperation` 共享有界轮询循环，同时插件提供其请求、completion/failure 检查和等待功能。 `pollProviderOperationJson` 添加了标准 HTTP JSON 传输。将供应商身份验证和截止日期范围保留在提供商适配器中。

    当自定义正文读取器耗尽相同的截止日期时，重复使用 `createProviderOperationTimeoutError(deadline)`。它以共享错误格式保留操作标签和可选超时。

    来自 `openclaw/plugin-sdk/media-generation-runtime` 的 `readGeneratedVideoAsset` 读取字节上限下的响应，并导出资产的 MIME 类型和文件名。设置 `validateBinaryResponse` 以拒绝非视频响应。可选的 `overflowUrl` 仅在主体超过该上限时提供交付；格式错误的媒体和传输错误仍然失败。调用者负责响应清理。 `downloadGeneratedVideoAsset` 还拥有获取、截止日期和清理功能。

  </Tab>
  <Tab id="web-fetch-and-search" title="网页获取和搜索">
    ```typescript
    api.registerWebFetchProvider({
      id: "acme-ai-fetch",
      label: "Acme Fetch",
      hint: "Fetch pages through Acme's rendering backend.",
      envVars: ["ACME_FETCH_API_KEY"],
      placeholder: "acme-...",
      signupUrl: "https://acme.example.com/fetch",
      credentialPath: "plugins.entries.acme.config.webFetch.apiKey",
      getCredentialValue: (fetchConfig) => fetchConfig?.acme?.apiKey,
      setCredentialValue: (fetchConfigTarget, value) => {
        const acme = (fetchConfigTarget.acme ??= {});
        acme.apiKey = value;
      },
      createTool: () => ({
        description: "Fetch a page through Acme Fetch.",
        parameters: {},
        execute: async (args) => ({ content: [] }),
      }),
    });

    api.registerWebSearchProvider({
      id: "acme-ai-search",
      label: "Acme Search",
      hint: "Search the web through Acme's search backend.",
      envVars: ["ACME_SEARCH_API_KEY"],
      placeholder: "acme-...",
      signupUrl: "https://acme.example.com/search",
      credentialPath: "plugins.entries.acme.config.webSearch.apiKey",
      getCredentialValue: (searchConfig) => searchConfig?.acme?.apiKey,
      setCredentialValue: (searchConfigTarget, value) => {
        const acme = (searchConfigTarget.acme ??= {});
        acme.apiKey = value;
      },
      createTool: () => ({
        description: "Search the web through Acme Search.",
        parameters: {},
        execute: async (args) => ({ content: [] }),
      }),
    });
    ```

    两种提供方类型共享相同的凭据连接结构： `hint`、`envVars`、`placeholder`、`signupUrl`、`credentialPath`、 `getCredentialValue`、`setCredentialValue` 和 `createTool` 都是必需的。

    搜索提供商可以将 `configPath` 声明为相对于其自己的搜索设置页面插件配置的路径。默认为`["webSearch"]`；当提供者没有内联设置时使用 `null`。共享插件的提供者可以公开不同的设置，而不显示仅适用于同级提供者的字段。凭证仍由 `credentialPath` 描述，并使用现有的屏蔽凭证编辑器。

    使用 `openclaw/plugin-sdk/provider-web-search` 的搜索提供程序应在每次执行时解析一次 `resolveSearchCacheTtlMs(searchConfig)`，并将该值传递给 `readCachedSearchPayload(cacheKey, ttlMs)` 和 `writeCachedSearchPayload(cacheKey, payload, ttlMs)`。零 TTL 绕过读取和写入；正值 TTL 限制了进入年龄，但不延长其原始有效期。读取返回标记为 `cached: true` 的有效负载，或未命中时返回标记为 `undefined` 的有效负载。读者的 `ttlMs` 参数是可选的：现有的单参数调用继续单独使用存储的到期日。

    两个工具定义都接受 `execute(args, context?)`，其中可选上下文携带 `signal?: AbortSignal`。将该信号转发给网络请求并在异步工作后检查取消情况。现有的单参数实现仍然有效； OpenClaw 在取消后拒绝延迟获取结果，然后再将其发布到其获取缓存。

  </Tab>
</Tabs>
