---
summary: "为 OpenClaw 插件系统添加新共享能力的贡献者指南"
read_when:
  - "添加新的核心能力和插件注册入口"
  - "决定代码应放在 core、vendor 插件还是 feature 插件中"
  - "为通道或工具连接新的运行时辅助函数"
title: "添加能力（贡献者指南）"
sidebarTitle: "添加能力"
---

<Info>
  这是面向 OpenClaw 核心开发者的 **贡献者指南**。如果你是在构建外部插件，请改看 [构建插件](/plugins/building-plugins)。 如需深入的架构参考（能力模型、所有权、加载流水线、运行时辅助函数）， 请看 [插件内部](/plugins/architecture)。
</Info>

当 OpenClaw 需要新的共享领域时使用，例如 embeddings、图像生成、视频生成，或某个未来的供应商支持功能领域。

规则如下：

- **plugin** = 所有权边界
- **capability** = 共享的核心契约

不要直接将某个供应商接入通道或工具。请先定义能力。

## <a id="when-to-create-a-capability"></a> 何时创建能力

仅当以下**全部**条件都成立时，才创建新的能力：

1. 有不止一个供应商很可能实现它。
2. 通道、工具或功能插件应当消费它，而无需关心供应商是谁。
3. Core 需要拥有回退、策略、配置或交付行为。

如果这项工作仅限于某个供应商，且尚不存在共享契约，则应先定义契约。

## <a id="the-standard-sequence"></a> 标准顺序

1. 定义带类型的核心契约。
2. 为该契约添加插件注册。
3. 添加共享运行时辅助函数。
4. 接入一个真实的供应商插件作为证明。
5. 将 feature/channel 使用者移至运行时助手上。
6. 添加契约测试。
7. 记录面向运维的配置和所有权模型。

## <a id="what-goes-where"></a> 什么去哪儿

| 层                      | 负责内容                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **核心**                   | Request/response型；提供商注册和解析；后备行为；配置模式，其中包含嵌套对象、通配符、数组项和组合节点上传播的 `title`/`description` 文档元数据；运行时辅助表面。 |
| **供应商插件**          | 厂商 API 调用、厂商认证处理、厂商特定的请求规范化，以及能力实现的注册。                                                                                                     |
| **Feature/channel 插件** | 调用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 辅助函数。绝不直接调用厂商实现。                                                                                                                    |

<a id="provider-and-harness-seams" />

## <a id="provider-and-harness-hooks"></a> Provider 和harness挂钩

当行为属于模型提供者合约而不是通用代理循环时，请使用 **provider hooks**。示例包括传输选择后特定于提供商的请求参数、身份验证配置文件首选项、提示覆盖以及 model/profile 故障转移后的后续回退路由。

当行为属于执行某个回合的运行时时，请使用 **agent harness hooks**。harness 可以对显式协议结果进行分类，例如空输出、无可见输出的推理，或没有最终答案的结构化计划，这样外层模型回退策略就可以做出重试决定。

保持两个钩子较窄：

- Core 拥有 retry/fallback 策略。
- Provider 插件拥有特定于提供者的 request/auth/routing 提示。
- Harness 插件负责运行时特定的尝试分类。
- 第三方插件只返回提示信息，而不是直接修改 core 状态。

## <a id="file-checklist"></a> 文件清单

对于新的能力，预计会涉及以下区域：

- `src/<capability>/types.ts`
- `src/<capability>/...registry/runtime.ts`
- `src/plugins/types.ts`
- `src/plugins/registry.ts`
- `src/plugins/captured-registration.ts`
- `src/plugins/contracts/registry.ts`
- `src/plugins/runtime/types-core.ts`
- `src/plugins/runtime/index.ts`
- `src/plugin-sdk/<capability>.ts`
- `src/plugin-sdk/<capability>-runtime.ts`
- 一个或多个内置插件包。
- 配置、文档、测试。

## <a id="worked-example%3A-image-generation"></a><a id="worked-example-image-generation"></a> 工作示例：图像生成

图像生成遵循标准形状：

1. Core 定义了 `ImageGenerationProvider`。
2. Core 公开了 `registerImageGenerationProvider(...)`。
3. Core 公开了 `api.runtime.imageGeneration.generate(...)` 和 `.listProviders(...)`。
4. 供应商插件（`comfy`、`deepinfra`、`fal`、`google`、`litellm`、`microsoft-foundry`、`minimax`、`openai`、 `openrouter`、`vydra`、`xai`）注册供应商支持的实现。
5. 未来的供应商注册相同的合同而不改变channels/tools.

配置键有意与视觉分析路由分开：

- `agents.defaults.imageModel` 分析图像。
- `agents.defaults.mediaModels.image` 生成图像。

将它们分开，以便后备方案和策略保持明确。

## <a id="embedding-providers"></a> 嵌入提供器

使用 `registerEmbeddingProvider(...)` / 合约 `embeddingProviders` 来实现可复用的向量嵌入提供器。该合约的范围有意设计得比 memory 更广：工具、搜索、检索、导入器或未来的功能插件都可以在不依赖 memory 引擎的情况下使用嵌入。Memory 搜索也会使用通用的 `embeddingProviders`。

旧的内存特定注册 API 和 `memoryEmbeddingProviders` 合约在 2026 年 8 月迁移窗口后被删除。对每个嵌入提供程序使用 `registerEmbeddingProvider` 和 `embeddingProviders`。

## <a id="review-checklist"></a> 审查清单

在发布新的能力之前，请确认：

- 否 channel/tool 直接导入供应商代码。
- 没有通道/工具直接导入供应商代码。
- 运行时辅助函数是共享路径。
- 配置文档命名新的model/config钥匙。
- 插件文档解释了所有权边界。

如果 PR 跳过功能层并将供应商行为硬编码到 channel/tool 中，请将其发回并首先定义合同。

## <a id="related"></a> 相关内容

- [插件内部](/plugins/architecture) — 能力模型、所有权、加载流水线、运行时辅助函数。
- [构建插件](/plugins/building-plugins) — 第一个插件教程。
- [SDK 概览](/plugins/sdk-overview) — 导入映射和注册 API 参考。
- [创建技能](/tools/creating-skills) — 配套的贡献者入口。
- [插件架构内部](/plugins/architecture-internals) — 加载管道、注册表模型和添加功能的指南。
