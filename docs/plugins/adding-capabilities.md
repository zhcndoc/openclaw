---
summary: "为 OpenClaw 插件系统添加新共享能力的贡献者指南"
read_when:
  - 添加新的核心能力和插件注册入口
  - 决定代码应放在 core、vendor 插件还是 feature 插件中
  - 为通道或工具连接新的运行时辅助函数
title: "添加能力（贡献者指南）"
sidebarTitle: "添加能力"
---

<Info>
  这是面向 OpenClaw 核心开发者的 **贡献者指南**。如果你是
  在构建外部插件，请改看 [构建插件](/plugins/building-plugins)。
  如需深入的架构参考（能力模型、所有权、加载流水线、运行时辅助函数），
  请看 [插件内部](/plugins/architecture)。
</Info>

当 OpenClaw 需要新的共享领域时使用，例如 embeddings、图像
生成、视频生成，或某个未来的供应商支持功能领域。

规则如下：

- **plugin** = 所有权边界
- **capability** = 共享的核心契约

不要直接将某个供应商接入通道或工具。请先定义能力。

## 何时创建能力

仅当以下**全部**条件都成立时，才创建新的能力：

1. 有不止一个供应商很可能实现它。
2. 通道、工具或功能插件应当消费它，而无需关心供应商是谁。
3. Core 需要拥有回退、策略、配置或交付行为。

如果这项工作仅限于某个供应商，且尚不存在共享契约，则应先定义契约。

## 标准顺序

1. 定义带类型的核心契约。
2. 为该契约添加插件注册。
3. 添加共享运行时辅助函数。
4. 接入一个真实的供应商插件作为证明。
5. 将功能/通道消费者迁移到运行时辅助函数。
6. 添加契约测试。
7. 记录面向运维的配置和所有权模型。

## 各部分放哪里

| 层                        | 职责                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core**                   | 请求/响应类型；提供方注册与解析；回退行为；配置 schema，包括在嵌套对象、通配符、数组项和组合节点上传播的 `title`/`description` 文档元数据；运行时辅助接口。 |
| **Vendor plugin**          | 厂商 API 调用、厂商认证处理、厂商特定的请求规范化，以及能力实现的注册。                                                                                                     |
| **Feature/channel plugin** | 调用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 辅助函数。绝不直接调用厂商实现。                                                                                                                    |

## 提供者与 harness 的边界

当行为属于模型提供者契约，而不是通用 agent 循环时，请使用**提供者钩子**。示例包括：在传输选择之后的提供者特定请求参数、认证配置文件偏好、提示词覆盖，以及模型/配置文件失败切换后的后续回退路由。

当行为属于执行某个回合的运行时时，请使用 **agent harness hooks**。harness 可以对显式协议结果进行分类，例如空输出、无可见输出的推理，或没有最终答案的结构化计划，这样外层模型回退策略就可以做出重试决定。

保持这两个边界都尽量窄：

- Core 负责重试/回退策略。
- Provider 插件负责提供者特定的请求/认证/路由提示。
- Harness 插件负责运行时特定的尝试分类。
- 第三方插件只返回提示信息，而不是直接修改 core 状态。

## 文件清单

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

## Example: Image Generation

Image generation follows the standard pattern:

1. Core defines `ImageGenerationProvider`.
2. Core exposes `registerImageGenerationProvider(...)`.
3. Core exposes `api.runtime.imageGeneration.generate(...)` and `.listProviders(...)`.
4. Vendor plugins (`comfy`, `deepinfra`, `fal`, `google`, `litellm`, `microsoft-foundry`, `minimax`, `openai`, `openrouter`, `vydra`, `xai`) register vendor-backed implementations.
5. Future vendors register the same contract without changing channels/tools.

Configuration keys are intentionally separated from the vision analysis routing:

- `agents.defaults.imageModel` analyzes images.
- `agents.defaults.mediaModels.image` generates images.

Keep them separate so that fallback and policy remain explicit.

## 嵌入提供器

使用 `registerEmbeddingProvider(...)` / 合约 `embeddingProviders` 来实现可复用的向量嵌入提供器。该合约的范围有意设计得比 memory 更广：工具、搜索、检索、导入器或未来的功能插件都可以在不依赖 memory 引擎的情况下使用嵌入。Memory 搜索也会使用通用的 `embeddingProviders`。

较旧的、仅面向 memory 的注册 API 和 `memoryEmbeddingProviders` 合约已被弃用。对于所有新的嵌入提供器，请使用 `registerEmbeddingProvider` 和 `embeddingProviders`。

## 评审清单

在发布新的能力之前，请确认：

- 没有通道/工具直接导入供应商代码。
- 运行时辅助函数是共享路径。
- 至少有一个契约测试断言了内置所有权。
- 配置文档注明了新的模型/配置键。
- 插件文档解释了所有权边界。

如果某个 PR 跳过能力层，而把供应商行为硬编码到通道/工具中，请打回并先定义契约。

## 相关内容

- [插件内部](/plugins/architecture) — 能力模型、所有权、加载流水线、运行时辅助函数。
- [构建插件](/plugins/building-plugins) — 第一个插件教程。
- [SDK 概览](/plugins/sdk-overview) — 导入映射和注册 API 参考。
- [创建技能](/tools/creating-skills) — 配套的贡献者入口。
