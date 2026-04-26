---
summary: "QA 场景目录与运行器整合的重构计划"
read_when:
  - 重构 QA 场景定义或 qa-lab 运行器代码
  - 在 markdown 场景与 TypeScript 运行器逻辑之间迁移 QA 行为
title: "QA 重构"
---

状态：基础迁移已完成。

## 目标

将 OpenClaw QA 从拆分定义模型迁移到单一事实来源：

- 场景元数据
- 发送给模型的提示
- 设置和拆卸
- 测试工具逻辑
- 断言和成功标准
- 工件和报告提示

期望的最终状态是一个通用的 QA 测试工具，它加载强大的场景定义文件，而不是在 TypeScript 中硬编码大部分行为。

## 当前状态

Primary source of truth now lives in `qa/scenarios/index.md` plus one file per
scenario under `qa/scenarios/<theme>/*.md`.

已实现：

- `qa/scenarios/index.md`
  - 权威 QA 包元数据
  - 操作者身份
  - 启动任务
- `qa/scenarios/<theme>/*.md`
  - 每个场景一个 markdown 文件
  - 场景元数据
  - 处理器绑定
  - 场景特定执行配置
- `extensions/qa-lab/src/scenario-catalog.ts`
  - markdown 包解析器 + zod 验证
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - 从 markdown 包渲染计划
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - 种子生成的兼容性文件以及 `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - 通过 markdown 定义的处理器绑定选择可执行场景
- QA 总线协议 + UI
  - 用于图像/视频/音频/文件渲染的通用内联附件

剩余拆分表面：

- `extensions/qa-lab/src/suite.ts`
  - 仍拥有大部分可执行的自定义处理器逻辑
- `extensions/qa-lab/src/report.ts`
  - 仍从运行时输出派生报告结构

因此，事实来源的拆分已修复，但执行仍主要基于处理器，而非完全声明式。

## 真实场景表面是什么样的

阅读当前套件显示有几个不同的场景类别。

### 简单交互

- 频道基线
- 私信基线
- 线程跟进
- 模型切换
- 批准跟进
- 反应/编辑/删除

### 配置和运行时变更

- 配置补丁技能禁用
- 配置应用重启唤醒
- 配置重启能力翻转
- 运行时库存漂移检查

### 文件系统和仓库断言

- 源/文档发现报告
- 构建 Lobster Invaders
- 生成的图像工件查找

### 内存编排

- 内存召回
- 频道上下文中的内存工具
- 内存失败回退
- 会话内存排名
- 线程内存隔离
- 内存梦想扫描

### 工具和插件集成

- MCP 插件工具调用
- 技能可见性
- 技能热安装
- 原生图像生成
- 图像往返
- 从附件理解图像

### 多轮和多参与者

- 子代理交接
- 子代理扇出合成
- 重启恢复风格流程

这些类别很重要，因为它们驱动 DSL 需求。一个扁平的提示 + 预期文本列表是不够的。

## 方向

### 单一事实来源

Use `qa/scenarios/index.md` plus `qa/scenarios/<theme>/*.md` as the authored
source of truth.

该包应保持：

- 在审查中人类可读
- 机器可解析
- 足够丰富以驱动：
  - 套件执行
  - QA 工作区引导
  - QA Lab UI 元数据
  - 文档/发现提示
  - 报告生成

### 推荐的编写格式

使用 markdown 作为顶级格式，内部包含结构化 YAML。

推荐形状：

- YAML 前置元数据
  - id
  - title
  - surface
  - tags
  - docs refs
  - code refs
  - model/provider overrides
  - prerequisites
- 文本部分
  - objective
  - notes
  - debugging hints
- 围栏 YAML 块
  - setup
  - steps
  - assertions
  - cleanup

这提供：

- 比巨型 JSON 更好的 PR 可读性
- 比纯 YAML 更丰富的上下文
- 严格解析和 zod 验证

原始 JSON 仅作为中间生成形式可接受。

## 提议的场景文件形状

示例：

````md
---
id: image-generation-roundtrip
title: 图像生成往返
surface: image
tags: [media, image, roundtrip]
models:
  primary: openai/gpt-5.4
requires:
  tools: [image_generate]
  plugins: [openai, qa-channel]
docsRefs:
  - docs/help/testing.md
  - docs/concepts/model-providers.md
codeRefs:
  - extensions/qa-lab/src/suite.ts
  - src/gateway/chat-attachments.ts
---

# 目标

验证生成的媒体能在后续轮次中重新附加。

# 设置

```yaml scenario.setup
- action: config.patch
  patch:
    agents:
      defaults:
        imageGenerationModel:
          primary: openai/gpt-image-1
- action: session.create
  key: agent:qa:image-roundtrip
```

# 步骤

```yaml scenario.steps
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    图像生成检查：生成一张 QA 灯塔图像，并用一句话总结。
- action: artifact.capture
  kind: generated-image
  promptSnippet: 图像生成检查
  saveAs: lighthouseImage
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    往返图像检查：用一句话描述生成的灯塔附件。
  attachments:
    - fromArtifact: lighthouseImage
```

# 预期

```yaml scenario.expect
- assert: outbound.textIncludes
  value: lighthouse
- assert: requestLog.matches
  where:
    promptIncludes: 往返图像检查
  imageInputCountGte: 1
- assert: artifact.exists
  ref: lighthouseImage
```
````

## DSL 必须覆盖的测试运行器能力

基于当前套件，通用运行器需要的不只是提示执行。

### 环境和设置操作

- `bus.reset`
- `gateway.waitHealthy`
- `channel.waitReady`
- `session.create`
- `thread.create`
- `workspace.writeSkill`

### 代理回合操作

- `agent.send`
- `agent.wait`
- `bus.injectInbound`
- `bus.injectOutbound`

### 配置和运行时操作

- `config.get`
- `config.patch`
- `config.apply`
- `gateway.restart`
- `tools.effective`
- `skills.status`

### 文件和工件操作

- `file.write`
- `file.read`
- `file.delete`
- `file.touchTime`
- `artifact.captureGeneratedImage`
- `artifact.capturePath`

### 内存和定时操作

- `memory.indexForce`
- `memory.searchCli`
- `doctor.memory.status`
- `cron.list`
- `cron.run`
- `cron.waitCompletion`
- `sessionTranscript.write`

### MCP 操作

- `mcp.callTool`

### 断言

- `outbound.textIncludes`
- `outbound.inThread`
- `outbound.notInRoot`
- `tool.called`
- `tool.notPresent`
- `skill.visible`
- `skill.disabled`
- `file.contains`
- `memory.contains`
- `requestLog.matches`
- `sessionStore.matches`
- `cron.managedPresent`
- `artifact.exists`

## 变量和工件引用

DSL 必须支持保存输出和后续引用。

当前套件示例：

- 创建线程，然后重用 `threadId`
- 创建会话，然后重用 `sessionKey`
- 生成图像，然后在下一回合附加文件
- 生成唤醒标记字符串，然后断言它稍后出现

所需能力：

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- 路径、会话键、线程 ID、标记、工具输出的类型化引用

没有变量支持，测试工具将不断将场景逻辑泄漏回 TypeScript。

## 什么应该作为逃生舱口

在第一阶段，完全纯声明式运行器不现实。

一些场景本质上是编排密集的：

- 内存梦想扫描
- 配置应用重启唤醒
- 配置重启能力翻转
- 按时间戳/路径解析生成的图像工件
- 发现报告评估

这些应该目前使用显式自定义处理器。

推荐规则：

- 85-90% 声明式
- 对困难剩余部分使用显式 `customHandler` 步骤
- 仅使用命名和记录的自定义处理器
- 场景文件中无匿名内联代码

这保持通用引擎清洁，同时仍允许进展。

## 架构变更

### 当前

场景 markdown 已经是以下方面的事实来源：

- 套件执行
- 工作区引导文件
- QA Lab UI 场景目录
- 报告元数据
- 发现提示

生成的兼容性：

- 种子工作区仍包含 `QA_KICKOFF_TASK.md`
- 种子工作区仍包含 `QA_SCENARIO_PLAN.md`
- 种子工作区现在也包含 `QA_SCENARIOS.md`

## 重构计划

### 阶段1：加载器和模式

完成。

- added `qa/scenarios/index.md`
- split scenarios into `qa/scenarios/<theme>/*.md`
- added parser for named markdown YAML pack content
- validated with zod
- switched consumers to the parsed pack
- removed repo-level `qa/seed-scenarios.json` and `qa/QA_KICKOFF_TASK.md`

### 阶段2：通用引擎

- 将 `extensions/qa-lab/src/suite.ts` 拆分为：
  - 加载器
  - 引擎
  - 操作注册表
  - 断言注册表
  - 自定义处理器
- 将现有辅助函数保留为引擎操作

交付物：

- 引擎执行简单声明式场景

从大部分是提示 + 等待 + 断言的场景开始：

- 线程跟进
- 从附件理解图像
- 技能可见性和调用
- 频道基线

交付物：

- 第一批通过通用引擎交付的真实 markdown 定义场景

### 阶段4：迁移中等场景

- 图像生成往返
- 频道上下文中的内存工具
- 会话内存排名
- 子代理交接
- 子代理扇出合成

交付物：

- 变量、工件、工具断言、请求日志断言得到验证

### 阶段5：将困难场景保留在自定义处理器上

- 内存梦想扫描
- 配置应用重启唤醒
- 配置重启能力翻转
- 运行时库存漂移

交付物：

- 相同的编写格式，但在需要处使用显式自定义步骤块

### 阶段6：删除硬编码场景映射

一旦包覆盖足够好：

- 从 `extensions/qa-lab/src/suite.ts` 中移除大部分场景特定的 TypeScript 分支

## 模拟 Slack/富媒体支持

当前 QA 总线是文本优先。

相关文件：

- `extensions/qa-channel/src/protocol.ts`
- `extensions/qa-lab/src/bus-state.ts`
- `extensions/qa-lab/src/bus-queries.ts`
- `extensions/qa-lab/src/bus-server.ts`
- `extensions/qa-lab/web/src/ui-render.ts`

当前 QA 总线支持：

- 文本
- 反应
- 线程

它尚未建模内联媒体附件。

### 需要的传输契约

添加通用 QA 总线附件模型：

```ts
type QaBusAttachment = {
  id: string;
  kind: "image" | "video" | "audio" | "file";
  mimeType: string;
  fileName?: string;
  inline?: boolean;
  url?: string;
  contentBase64?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  altText?: string;
  transcript?: string;
};
```

然后添加 `attachments?: QaBusAttachment[]` 到：

- `QaBusMessage`
- `QaBusInboundMessageInput`
- `QaBusOutboundMessageInput`

### 为什么先通用

不要构建仅 Slack 的媒体模型。

相反：

- 一个通用 QA 传输模型
- 其上的多个渲染器
  - 当前 QA Lab 聊天
  - 未来模拟 Slack web
  - 任何其他模拟传输视图

这防止重复逻辑并让媒体场景保持传输无关。

### 需要的 UI 工作

更新 QA UI 以渲染：

- 内联图像预览
- 内联音频播放器
- 内联视频播放器
- 文件附件芯片

当前 UI 已经可以渲染线程和反应，因此附件渲染应层叠到相同的消息卡片模型上。

### 媒体传输启用的场景工作

一旦附件通过 QA 总线流动，我们可以添加更丰富的模拟聊天场景：

- 模拟 Slack 中的内联图像回复
- 音频附件理解
- 视频附件理解
- 混合附件排序
- 保留媒体的线程回复

## 建议

接下来的实现步骤应该是：

1. 添加 markdown 场景加载器 + zod 模式
2. 从 markdown 生成当前目录
3. 首先迁移几个简单的场景
4. 添加通用问答总线附件支持
5. 在问答用户界面中渲染内联图片
6. 然后扩展到音频和视频

这是验证两个目标的最小路径：

- 通用的 markdown 定义的问答
- 更丰富的模拟消息界面

## 开放问题

- 是否应允许场景文件包含带有变量插值的嵌入式 markdown 提示模板
- setup/cleanup 应该是命名分区，还是仅仅是有序动作列表
- 工件引用在 schema 中是否应该强类型，还是基于字符串
- 自定义处理器应当存在于单一注册表中，还是按 surface 分别注册
- 迁移期间，生成的 JSON 兼容文件是否应继续提交到仓库中

## 相关

- [QA E2E 自动化](/concepts/qa-e2e-automation)
