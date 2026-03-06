---
summary: "使用 Discord 专用异步入站工作器，实现 Discord 网关监听器与长时代理回合解耦的状态及下一步计划"
owner: "openclaw"
status: "进行中"
last_updated: "2026-03-05"
title: "Discord 异步入站工作器计划"
---

# Discord 异步入站工作器计划

## 目标

通过使 Discord 入站回合异步化，消除 Discord 监听器超时作为用户可见失败模式的现象：

1. 网关监听器快速接受并规范化入站事件。
2. 一个 Discord 运行队列存储以当前相同排序边界为键的序列化作业。
3. 工作器在 Carbon 监听器生命周期之外执行实际的代理回合。
4. 回合完成后，回复被发送回发起的频道或线程。

这是解决排队的 Discord 运行在 `channels.discord.eventQueue.listenerTimeout` 超时时出错，而代理运行仍在进行中的长期方案。

## 当前状态

此方案已部分实现。

已完成：

- Discord 监听器超时和 Discord 运行超时现在由不同设置控制。
- 接受的入站 Discord 回合已入队至 `src/discord/monitor/inbound-worker.ts`。
- 工作器现拥有长时回合，而非 Carbon 监听器。
- 通过队列键保持了现有的每路由排序。
- Discord 工作器路径已有超时回归覆盖。

通俗来说意味着：

- 生产环境的超时漏洞已修复
- 长时回合不再因 Discord 监听器预算耗尽而终止
- 工作器架构尚未完备

仍然缺失：

- `DiscordInboundJob` 仍是部分规范化，携带了实时运行时引用
- 命令语义（`stop`、`new`、`reset` 及未来的会话控制）尚未完全本地化到工作器
- 工作器可观测性和操作员状态仍然非常有限
- 仍无重启持久化能力

## 方案存在的原因

当前行为让整个代理回合绑定于监听器的生命周期：

- `src/discord/monitor/listeners.ts` 应用了超时及中止边界。
- `src/discord/monitor/message-handler.ts` 把排队回合限制在该边界内。
- `src/discord/monitor/message-handler.process.ts` 在线执行媒体加载、路由、调度、输入提示、草稿流及最终回复发送。

该架构有两个不良属性：

- 长但健康的回合会被监听器看门狗中止
- 用户可能看不到回复，即使下游运行时本可以产生回复

提高超时虽有帮助，但未改变失败模式。

## 非目标

- 此次不改设计非 Discord 通道。
- 初次实现不扩大为通用跨通道工作器框架。
- 暂不抽取共享的跨通道入站工作器抽象，仅在明显重复时共享底层原语。
- 初次发布不添加持久化崩溃恢复，除非为安全落地所必需。
- 不更改路由选择、绑定语义或 ACP 策略。

## 当前约束

当前 Discord 处理路径仍依赖一些应不存于长期作业负载中的实时运行时对象：

- Carbon `Client`
- Discord 原生事件格式
- 内存中的公会历史映射
- 线程绑定管理器回调
- 实时输入提示和草稿流状态

执行已迁移至工作器队列，但规范边界仍不完整。目前工作器是“稍后在同一进程中用部分相同的实时对象运行”，而非完全基于数据的作业边界。

## 目标架构

### 1. 监听器阶段

`DiscordMessageListener` 仍为入口，但职责转为：

- 运行预检及策略检查
- 将接受的输入规范化为可序列化的 `DiscordInboundJob`
- 将作业排入基于会话或频道的异步队列
- 入队成功后立即返回给 Carbon

监听器不应再拥有端到端的 LLM 回合生命周期。

### 2. 规范化的作业负载

引入仅包含稍后运行回合所需数据的序列化作业描述符。

最小结构：

- 路由身份
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- 交付身份
  - 目标频道 ID
  - 回复目标消息 ID
  - 如果存在则包含线程 ID
- 发送者身份
  - 发送者 ID、标签、用户名、标签号
- 频道上下文
  - 公会 ID
  - 频道名或标识符
  - 线程元数据
  - 已解析的系统提示覆盖
- 规范化消息主体
  - 基本文本
  - 有效消息文本
  - 附件描述或已解析媒体引用
- 门控决定
  - 提及要求结果
  - 命令授权结果
  - 如适用，绑定的会话或代理元数据

作业负载不得含有实时 Carbon 对象或可变闭包。

当前实现状态：

- 部分完成
- `src/discord/monitor/inbound-job.ts` 存在并定义了工作器交接
- 负载仍携带实时 Discord 运行时上下文，应进一步精简

### 3. 工作器阶段

新增 Discord 专用工作器执行器，负责：

- 从 `DiscordInboundJob` 重建回合上下文
- 加载媒体及运行所需的其他频道元数据
- 派发代理回合
- 交付最终回复载荷
- 更新状态与诊断信息

建议位置：

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. 排序模型

排序必须保持与当前针对给定路由边界等效。

建议键：

- 使用与 `resolveDiscordRunQueueKey(...)` 相同的队列键逻辑

这保留了现有行为：

- 一个绑定的代理对话不会自我交叉
- 不同 Discord 频道仍可独立推进

### 5. 超时模型

切换后，存在两种独立超时类型：

- 监听器超时
  - 仅覆盖规范化和入队阶段
  - 应当较短
- 运行超时
  - 可选，由工作器拥有，显式且对用户可见
  - 不应意外继承自 Carbon 监听器设置

去除当前“Discord 网关监听器存活”与“代理运行健康”之间的意外耦合。

## 推荐的实现阶段

### 阶段 1：规范边界

- 状态：部分实现
- 已完成：
  - 抽取了 `buildDiscordInboundJob(...)`
  - 添加了工作器交接测试
- 剩余：
  - 使 `DiscordInboundJob` 仅包含纯数据
  - 将实时运行时依赖移至工作器拥有的服务，而非单个作业负载
  - 停止通过将实时监听器引用拼回作业来重建进程上下文

### 阶段 2：内存工作器队列

- 状态：已实现
- 已完成：
  - 新增 `DiscordInboundWorkerQueue`，以解析后的运行队列键为键
  - 监听器入队作业，而不再直接等待 `processDiscordMessage(...)`
  - 工作器仅在进程内、内存中执行作业

这是首次功能性切换。

### 阶段 3：进程拆分

- 状态：未开始
- 将交付、输入提示及草稿流管理移至面向工作器的适配层之后。
- 用工作器上下文重建替代直接使用实时预检上下文。
- 如有必要，暂时保留 `processDiscordMessage(...)` 作为门面，然后拆分。

### 阶段 4：命令语义

- 状态：未开始
- 确保本地 Discord 命令在作业排队时依然正确执行：

- `stop`
- `new`
- `reset`
- 及未来的任何会话控制命令

工作器队列必须暴露足够的运行状态，以支持命令定位活跃或排队的回合。

### 阶段 5：可观测性与操作员体验

- 状态：未开始
- 向监控状态发送队列深度和活跃工作器计数
- 记录入队时间、开始时间、结束时间及超时或取消原因
- 清晰记录工作器拥有的超时或交付失败日志

### 阶段 6：可选持久化跟进

- 状态：未开始
- 仅当内存版本稳定后：
  - 决定是否让排队的 Discord 作业在网关重启后存活
  - 如是，持久化作业描述符和交付检查点
  - 如否，文档说明明确的内存边界

除非重启恢复为落地必要，否则应为独立后续。

## 文件影响

当前主文件：

- `src/discord/monitor/listeners.ts`
- `src/discord/monitor/message-handler.ts`
- `src/discord/monitor/message-handler.preflight.ts`
- `src/discord/monitor/message-handler.process.ts`
- `src/discord/monitor/status.ts`

当前工作器文件：

- `src/discord/monitor/inbound-job.ts`
- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.test.ts`
- `src/discord/monitor/message-handler.queue.test.ts`

可能的下一个触点：

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## 现阶段下一步

下一步是让工作器边界真正完整，而非部分完成。

下一步操作：

1. 将实时运行时依赖从 `DiscordInboundJob` 移出
2. 改为将这些依赖保持在 Discord 工作器实例上
3. 把排队作业简化为纯粹的 Discord 特定数据：
   - 路由身份
   - 交付目标
   - 发送者信息
   - 规范化的消息快照
   - 门控与绑定决定
4. 在工作器内部从这些纯数据重建执行上下文

实际意味着：

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- 其他可变的仅运行时句柄

应不再存在于每个排队作业上，而是 leben 在工作器本体或工作器拥有的适配器后面。

该方案生效后，下一步应为 `stop`、`new` 和 `reset` 的命令状态清理。

## 测试计划

保持现有超时复现覆盖于：

- `src/discord/monitor/message-handler.queue.test.ts`

添加新测试覆盖：

1. 监听器在入队后立即返回，不等待完整回合结束
2. 保持每路由排序
3. 不同频道可并发运行
4. 回复被正确发送到原始消息目标
5. `stop` 取消活跃的工作器拥有的回合
6. 工作器失败时产生可见诊断，且不阻塞后续作业
7. 绑定 ACP 的 Discord 频道在工作器执行路径中正常路由

## 风险与缓解

- 风险：命令语义偏离当前同步行为  
  缓解：在同一次切换中完成命令状态的实现，不留后患

- 风险：回复交付丢失线程或回复上下文  
  缓解：在 `DiscordInboundJob` 中将交付身份设计为一等公民

- 风险：重试或队列重启出现重复发送  
  缓解：初期仅限内存，或在持久化前添加明确的交付幂等机制

- 风险：迁移过程中 `message-handler.process.ts` 变得难以理解  
  缓解：在或在工作器切换前拆分为规范化、执行和交付辅助模块

## 验收标准

当满足以下条件时视为方案完成：

1. Discord 监听器超时不再中止健康的长时回合。
2. 监听器生命周期和代理回合生命周期在代码中已分离。
3. 保持现有的每会话排序。
4. 绑定 ACP 的 Discord 频道通过相同工作器路径正常工作。
5. `stop` 定位运行于工作器拥有的回合，而非旧监听器调用栈。
6. 超时及交付失败明确为工作器结果，而非静默的监听器丢弃。

## 后续落地策略

通过后续 PR 完成：

1. 使 `DiscordInboundJob` 仅含纯数据，实时运行时引用迁移至工作器
2. 清理 `stop`、`new` 和 `reset` 的命令状态归属
3. 增加工作器可观测性和操作员状态
4. 决定是否需要持久化，或明确文档化内存边界

只要保持 Discord 专用且避免过早跨通道工作器抽象，这仍是受限的后续工作。
