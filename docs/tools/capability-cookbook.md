---
summary: "为 OpenClaw 插件系统添加新共享能力的贡献者指南"
read_when:
  - 添加新的核心能力和插件注册入口
  - 判断代码应属于 core、供应商插件还是功能插件
  - 为 channels 或 tools 接入新的运行时辅助函数
title: "添加能力（贡献者指南）"
sidebarTitle: "添加能力"
---

<Info>
  这是面向 OpenClaw core 开发者的**贡献者指南**。如果你是在
  构建外部插件，请改看 [构建插件](/plugins/building-plugins)。
</Info>

当 OpenClaw 需要新的领域时使用此文档，例如图像生成、视频
生成，或未来某个由供应商支持的功能领域。

规则是：

- plugin = 归属边界
- capability = 共享的核心契约

这意味着你不应该一开始就把供应商直接接入某个 channel 或
tool。应先定义 capability。

## 何时创建 capability

当以下条件都满足时，创建一个新的 capability：

1. 不止一个供应商有合理可能实现它
2. channels、tools 或功能插件应当在不关心供应商的情况下消费它
3. core 需要负责回退、策略、配置或交付行为

如果这项工作只面向某个供应商，且尚不存在共享契约，就先停下来定义该契约。

## 标准流程

1. 定义带类型的核心契约。
2. 为该契约添加插件注册。
3. 添加共享运行时辅助函数。
4. 接入一个真实的供应商插件作为验证。
5. 将功能/channel 消费者迁移到运行时辅助函数。
6. 添加契约测试。
7. 为面向运维人员的配置和归属模型编写文档。

## 各部分放在哪里

Core：

- 请求/响应类型
- provider 注册表 + 解析
- 回退行为
- 配置 schema，以及在嵌套对象、通配符、数组项和组合节点上向下传递的 `title` / `description` 文档元数据
- 运行时辅助函数接口

Vendor plugin：

- 供应商 API 调用
- 供应商认证处理
- 供应商特定的请求规范化
- 该 capability 实现的注册

Feature/channel plugin：

- 调用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 辅助函数
- 绝不直接调用供应商实现

## Provider 与 harness 的分界

当行为属于模型 provider 契约，而不是通用 agent 循环时，使用 provider hooks。示例包括：在选择传输层后的 provider 特定请求参数、auth-profile 偏好、prompt 覆盖，以及在模型/profile 失败切换后的后续回退路由。

当行为属于执行某个 turn 的运行时时，使用 agent harness hooks。Harness 可以对“成功但不可用”的尝试结果进行分类，例如空响应、仅 reasoning 响应或仅 planning 响应，这样外层的模型回退策略就能决定是否重试。

保持这两个分界都足够窄：

- core 负责重试/回退策略
- provider 插件负责 provider 特定的请求/认证/路由提示
- harness 插件负责运行时特定的尝试分类
- 第三方插件返回提示信息，而不是直接修改 core 状态

## 文件清单

对于一个新的 capability，预计会涉及以下区域：

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
- 一个或多个内置插件包
- 配置/文档/测试

## 示例：图像生成

图像生成遵循标准形态：

1. core 定义 `ImageGenerationProvider`
2. core 暴露 `registerImageGenerationProvider(...)`
3. core 暴露 `runtime.imageGeneration.generate(...)`
4. `openai`、`google`、`fal` 和 `minimax` 插件注册由供应商支持的实现
5. 未来的供应商可以在不更改 channels/tools 的情况下注册相同的契约

配置键与视觉分析路由是分开的：

- `agents.defaults.imageModel` = 分析图像
- `agents.defaults.imageGenerationModel` = 生成图像

请保持它们分离，这样回退和策略才会保持明确。

## 审查清单

在发布新的 capability 之前，请确认：

- 没有任何 channel/tool 直接导入供应商代码
- 运行时辅助函数是共享路径
- 至少有一个契约测试断言了内置归属
- 配置文档说明了新的 model/config 键
- 插件文档解释了归属边界

如果某个 PR 跳过了 capability 层，直接把供应商行为硬编码进 channel/tool，就把它退回去，并先定义契约。

## 相关内容

- [插件](/tools/plugin)
- [创建技能](/tools/creating-skills)
- [工具和插件](/tools)
