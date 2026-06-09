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

不要一开始就直接把某个供应商接到通道或工具中。应先定义能力。

## 何时创建能力

仅当以下**全部**条件都满足时，才创建新的能力：

1. 有不止一个供应商很可能实现它。
2. 通道、工具或功能插件应当消费它，而无需关心供应商是谁。
3. Core 需要拥有回退、策略、配置或交付行为。

如果这项工作只属于某个供应商，而且目前还没有共享契约，请先停下来并定义契约。

## 标准顺序

1. 定义带类型的核心契约。
2. 为该契约添加插件注册。
3. 添加共享运行时辅助函数。
4. 接入一个真实的供应商插件作为证明。
5. 将功能/通道消费者迁移到运行时辅助函数。
6. 添加契约测试。
7. 记录面向运维的配置和所有权模型。

## 各部分放哪里

**Core：**

- 请求/响应类型。
- 提供者注册表 + 解析。
- 回退行为。
- 配置 schema，并在嵌套对象、通配符、数组项和组合节点上传播 `title` / `description` 文档元数据。
- 运行时辅助函数入口。

**Vendor 插件：**

- 供应商 API 调用。
- 供应商认证处理。
- 供应商特定的请求归一化。
- 该能力实现的注册。

**Feature/channel 插件：**

- 调用 `api.runtime.*` 或对应的 `plugin-sdk/*-runtime` 辅助函数。
- 绝不直接调用某个供应商实现。

## 提供者与 harness 的边界

当行为属于模型提供者契约，而不是通用 agent 循环时，请使用**提供者钩子**。示例包括：在传输选择之后的提供者特定请求参数、认证配置文件偏好、提示词覆盖，以及模型/配置文件失败切换后的后续回退路由。

当行为属于执行某个回合的运行时时，请使用**agent harness 钩子**。harness 可以将“成功但不可用”的尝试结果分类，例如空响应、仅推理响应或仅规划响应，从而让外层模型回退策略决定是否重试。

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

## 实例：图像生成

图像生成遵循标准形态：

1. Core 定义 `ImageGenerationProvider`。
2. Core 暴露 `registerImageGenerationProvider(...)`。
3. Core 暴露 `runtime.imageGeneration.generate(...)`。
4. `openai`、`google`、`fal` 和 `minimax` 插件注册基于供应商的实现。
5. 未来的供应商在不更改通道/工具的情况下注册同一契约。

配置键特意与视觉分析路由分开：

- `agents.defaults.imageModel` 用于分析图像。
- `agents.defaults.imageGenerationModel` 用于生成图像。

请将它们分开，以便回退和策略保持显式。

## Embedding providers

对可复用的向量嵌入提供者，请使用 `embeddingProviders`。这个契约
有意比 memory 更宽：工具、搜索、检索、导入器，或未来的功能插件
都可以消费 embeddings，而无需依赖 memory 引擎。

Memory search can consume generic `embeddingProviders`. The older
`memoryEmbeddingProviders` contract is deprecated compatibility while existing
memory-specific providers migrate; new reusable embedding providers should use
`embeddingProviders`.

## Review checklist

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
