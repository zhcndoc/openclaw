---
summary: "插件架构内部：加载流水线、注册表、运行时钩子、HTTP 路由和参考表"
read_when:
  - "实现提供者运行时钩子、通道生命周期或包集合时"
  - "调试插件加载顺序或注册表状态时"
  - "添加新的插件能力或上下文引擎插件时"
title: "插件架构内部"
---

公共能力模型、插件形状和ownership/execution合约请参见[插件架构](/plugins/architecture)。此页面涵盖内部机制：加载管道、注册表、运行时挂钩、网关 HTTP 路由、导入路径和架构表。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [加载管道和注册表](/plugins/architecture-internals/load-pipeline) - 发现、安全门、清单优先元数据、插件缓存边界和注册表模型。
- [Provider 挂钩和目录](/plugins/architecture-internals/provider-hooks) — 提供商挂钩顺序表、工作示例、捆绑的挂钩形状和目录合并顺序。
- [核心运行时助手](/plugins/architecture-internals/runtime-helpers) — 通过 `api.runtime` 进行语音、媒体理解、子代理、网络搜索和图像生成。
- [网关路由](/plugins/architecture-internals/gateway-routes) — 插件 HTTP 端点及其身份验证、范围、替换和准入规则。
- [通道表面](/plugins/architecture-internals/channel-surfaces) — 对话绑定回调、消息工具模式、目标解析、目录和检查。
- [ 包和导入路径](/plugins/architecture-internals/packaging) — SDK 导入子路径、包包和频道目录以及安装元数据。
- [上下文引擎](/plugins/architecture-internals/context-engines) — 通过 `contextEngine` 插槽替换会话摄取、组装和压缩。
- [新功能](/plugins/architecture-internals/new-capability) - 功能核心的序列、文件清单和合同测试模式尚不具备。

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的八个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="load-pipeline-and-registry"></a> 加载管道和注册表

[加载管道和注册表](/plugins/architecture-internals/load-pipeline) - 发现、安全门、清单优先元数据、插件缓存边界和注册表核心读取。

- <a id="load-pipeline"></a>[负载管道](/plugins/architecture-internals/load-pipeline#load-pipeline)
- <a id="manifest-first-behavior"></a>[清单优先行为](/plugins/architecture-internals/load-pipeline#manifest-first-behavior)
- <a id="plugin-cache-boundary"></a>[插件缓存边界](/plugins/architecture-internals/load-pipeline#plugin-cache-boundary)
- <a id="registry-model"></a>[注册表模型](/plugins/architecture-internals/load-pipeline#registry-model)

### <a id="provider-hooks-and-catalogs"></a> Provider 挂钩和目录

[Provider 挂钩和目录](/plugins/architecture-internals/provider-hooks) — 提供者挂钩顺序表、工作提供者示例、捆绑的挂钩形状和模型目录注册。

- <a id="provider-runtime-hooks"></a>[提供程序运行时挂钩](/plugins/architecture-internals/provider-hooks#provider-runtime-hooks)
- <a id="hook-order-and-usage"></a>[H订购及使用](/plugins/architecture-internals/provider-hooks#hook-order-and-usage)
- <a id="provider-example"></a>[提供商示例](/plugins/architecture-internals/provider-hooks#provider-example)
- <a id="built-in-examples"></a>[内置示例](/plugins/architecture-internals/provider-hooks#built-in-examples)
- <a id="pass-through-catalog-providers"></a>[传递目录提供商](/plugins/architecture-internals/provider-hooks#pass-through-catalog-providers)
- <a id="oauth-and-usage-endpoint-providers"></a>[O身份验证和使用端点提供商](/plugins/architecture-internals/provider-hooks#oauth-and-usage-endpoint-providers)
- <a id="replay-and-transcript-cleanup-families"></a>[重播和成绩单清理系列](/plugins/architecture-internals/provider-hooks#replay-and-transcript-cleanup-families)
- <a id="catalog-only-providers"></a>[仅目录提供商](/plugins/architecture-internals/provider-hooks#catalog-only-providers)
- <a id="anthropic-specific-stream-helpers"></a>[人类特定的流助手](/plugins/architecture-internals/provider-hooks#anthropic-specific-stream-helpers)
- <a id="provider-catalogs"></a>[供应商目录](/plugins/architecture-internals/provider-hooks#provider-catalogs)

### <a id="core-runtime-helpers"></a> Core 运行时助手

[核心运行时助手](/plugins/architecture-internals/runtime-helpers) — 通过 `api.runtime` 公开的语音、媒体理解、子代理、Web 搜索和图像生成助手。

- <a id="runtime-helpers"></a>[运行时助手](/plugins/architecture-internals/runtime-helpers#runtime-helpers)
- <a id="api-runtime-imagegeneration"></a><a id="api.runtime.imagegeneration"></a>[`api.runtime.imageGeneration`](/plugins/architecture-internals/runtime-helpers#api-runtime-imagegeneration)

### <a id="gateway-routes"></a> 网关路由

[Gateway 路由](/plugins/architecture-internals/gateway-routes) — 在网关上注册插件 HTTP 端点及其身份验证、范围、替换和准入规则。

- <a id="gateway-http-routes"></a>[网关 HTTP 路线](/plugins/architecture-internals/gateway-routes#gateway-http-routes)

### <a id="channel-surfaces"></a> 通道表面

[通道表面](/plugins/architecture-internals/channel-surfaces) - 对话绑定回调、消息工具模式、目标解析、配置支持的目录和只读检查。

- <a id="conversation-binding-callbacks"></a>[会话绑定回调](/plugins/architecture-internals/channel-surfaces#conversation-binding-callbacks)
- <a id="message-tool-schemas"></a>[消息工具架构](/plugins/architecture-internals/channel-surfaces#message-tool-schemas)
- <a id="channel-target-resolution"></a>[通道目标解析](/plugins/architecture-internals/channel-surfaces#channel-target-resolution)
- <a id="config-backed-directories"></a>[配置支持的目录](/plugins/architecture-internals/channel-surfaces#config-backed-directories)
- <a id="read-only-channel-inspection"></a>[只读通道检查](/plugins/architecture-internals/channel-surfaces#read-only-channel-inspection)

### <a id="packs-and-import-paths"></a> 包和导入路径

[ 包和导入路径](/plugins/architecture-internals/packaging) — 插件 SDK 导入子路径、多扩展包包以及频道目录和安装元数据。

- <a id="plugin-sdk-import-paths"></a>[插件 SDK 导入路径](/plugins/architecture-internals/packaging#plugin-sdk-import-paths)
- <a id="package-packs"></a>[套装](/plugins/architecture-internals/packaging#package-packs)
- <a id="channel-catalog-metadata"></a>[频道目录元数据](/plugins/architecture-internals/packaging#channel-catalog-metadata)

### <a id="context-engines"></a> 上下文引擎

[上下文引擎](/plugins/architecture-internals/context-engines) — 通过 `contextEngine` 槽接管会话摄取、组装和压缩。

- <a id="context-engine-plugins"></a>[上下文引擎插件](/plugins/architecture-internals/context-engines#context-engine-plugins)

### <a id="new-capability"></a> 新能力

[新功能](/plugins/architecture-internals/new-capability) — 用于添加插件 API 尚不具备的功能的序列、文件清单和契约测试模式。

- <a id="adding-a-new-capability"></a>[添加新功能](/plugins/architecture-internals/new-capability#adding-a-new-capability)
- <a id="capability-checklist"></a>[能力清单](/plugins/architecture-internals/new-capability#capability-checklist)
- <a id="capability-template"></a>[能力模板](/plugins/architecture-internals/new-capability#capability-template)

## <a id="related"></a> 相关内容

- [插件架构](/plugins/architecture) — 公共能力模型和形状
- [插件 SDK 子路径](/plugins/sdk-subpaths)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
