---
summary: "向 OpenClaw 插件系统添加新共享能力的贡献者指南"
read_when:
  - 添加新的核心能力和插件注册入口时
  - 决定代码应归属核心、供应商插件还是功能插件时
  - 为渠道或工具接入新的运行时助手时
title: "添加能力（贡献者指南）"
sidebarTitle: "添加能力"
---

<Info>
  这是面向 OpenClaw 核心开发人员的**贡献者指南**。如果您正在
  构建外部插件，请参阅 [构建插件](/plugins/building-plugins)
  代替。
</Info>

当 OpenClaw 需要新的领域（如图像生成、视频生成或某些未来供应商支持的功能区域）时使用此指南。

规则：

- 插件 = 所有权边界
- 能力 = 共享核心契约

这意味着您不应该一开始就将供应商直接连接到渠道或工具。首先定义能力。

## 何时创建能力

当所有以下条件都满足时，创建新能力：

1. 不止一个供应商可以合理地实现它
2. 渠道、工具或功能插件应该使用它而无需关心供应商
3. 核心需要拥有回退、策略、配置或交付行为

如果工作仅针对供应商且尚不存在共享契约，请停下来先定义契约。

## 标准序列

1. 定义类型化的核心契约。
2. 为该契约添加插件注册。
3. 添加共享运行时助手。
4. 接入一个真实的供应商插件作为证明。
5. 将功能/渠道消费者移至运行时助手。
6. 添加契约测试。
7. 记录面向操作员的配置和所有权模型。

## 内容归属

核心：

- request/response types
- provider registry + resolution
- fallback behavior
- config schema plus propagated `title` / `description` docs metadata on nested object, wildcard, array-item, and composition nodes
- runtime helper surface

供应商插件：

- 供应商 API 调用
- 供应商身份验证处理
- 供应商特定的请求规范化
- 能力实现的注册

功能/渠道插件：

- 调用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 助手
- 绝不直接调用供应商实现

## Provider and harness seams

Use provider hooks when the behavior belongs to the model provider contract
rather than the generic agent loop. Examples include provider-specific request
params after transport selection, auth-profile preference, prompt overlays, and
follow-up fallback routing after model/profile failover.

Use agent harness hooks when the behavior belongs to the runtime that is
executing a turn. Harnesses can classify successful-but-unusable attempt results
such as empty, reasoning-only, or planning-only responses so the outer model
fallback policy can make the retry decision.

Keep both seams narrow:

- core owns the retry/fallback policy
- provider plugins own provider-specific request/auth/routing hints
- harness plugins own runtime-specific attempt classification
- third-party plugins return hints, not direct mutations of core state

## File checklist

对于新能力，预计会涉及以下区域：

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
- 一个或多个捆绑插件包
- 配置/文档/测试

## 示例：图像生成

图像生成遵循标准形状：

1. core defines `ImageGenerationProvider`
2. core exposes `registerImageGenerationProvider(...)`
3. core exposes `runtime.imageGeneration.generate(...)`
4. the `openai`, `google`, `fal`, and `minimax` plugins register vendor-backed implementations
5. future vendors can register the same contract without changing channels/tools

配置键与视觉分析路由分开：

- `agents.defaults.imageModel` = 分析图像
- `agents.defaults.imageGenerationModel` = 生成图像

保持这些分开，以便回退和策略保持明确。

## 审查清单

在发布新能力之前，验证：

- 没有渠道/工具直接导入供应商代码
- 运行时助手是共享路径
- 至少有一个契约测试断言捆绑所有权
- 配置文档命名新的模型/配置键
- 插件文档解释所有权边界

如果 PR 跳过能力层并将供应商行为硬编码到渠道/工具中，请退回并先定义契约。

## 相关内容

- [插件](/tools/plugin)
- [创建技能](/tools/creating-skills)
- [工具和插件](/tools)
