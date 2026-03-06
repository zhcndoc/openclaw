---
summary: "通道无关的会话绑定架构及迭代 1 交付范围"
read_when:
  - 重构通道无关的会话路由和绑定
  - 调查跨通道的重复、陈旧或缺失的会话交付问题
owner: "onutc"
status: "进行中"
last_updated: "2026-02-21"
title: "会话绑定通道无关计划"
---

# 会话绑定通道无关计划

## 概览

本文档定义了长期通道无关的会话绑定模型，以及下一次实现迭代的具体范围。

目标：

- 使子代理绑定会话路由成为核心能力
- 保持通道特定行为在适配器中
- 避免对正常 Discord 行为的回归

## 存在的原因

当前行为混合了：

- 完成内容策略
- 目标路由策略
- Discord 特定细节

这导致了诸如：

- 并发运行下主频道和线程的重复交付
- 重用绑定管理器时使用过时令牌
- 缺失对基于 webhook 发送的活动计数

## 迭代 1 范围

本迭代范围有意限制。

### 1. 添加通道无关的核心接口

添加绑定和路由的核心类型和服务接口。

建议的核心类型：

```ts
export type BindingTargetKind = "subagent" | "session";
export type BindingStatus = "active" | "ending" | "ended";

export type ConversationRef = {
  channel: string;
  accountId: string;
  conversationId: string;
  parentConversationId?: string;
};

export type SessionBindingRecord = {
  bindingId: string;
  targetSessionKey: string;
  targetKind: BindingTargetKind;
  conversation: ConversationRef;
  status: BindingStatus;
  boundAt: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
};
```

核心服务契约：

```ts
export interface SessionBindingService {
  bind(input: {
    targetSessionKey: string;
    targetKind: BindingTargetKind;
    conversation: ConversationRef;
    metadata?: Record<string, unknown>;
    ttlMs?: number;
  }): Promise<SessionBindingRecord>;

  listBySession(targetSessionKey: string): SessionBindingRecord[];
  resolveByConversation(ref: ConversationRef): SessionBindingRecord | null;
  touch(bindingId: string, at?: number): void;
  unbind(input: {
    bindingId?: string;
    targetSessionKey?: string;
    reason: string;
  }): Promise<SessionBindingRecord[]>;
}
```

### 2. 为子代理完成添加一个核心交付路由器

为完成事件添加单一目标解析路径。

路由器契约：

```ts
export interface BoundDeliveryRouter {
  resolveDestination(input: {
    eventKind: "task_completion";
    targetSessionKey: string;
    requester?: ConversationRef;
    failClosed: boolean;
  }): {
    binding: SessionBindingRecord | null;
    mode: "bound" | "fallback";
    reason: string;
  };
}
```

本迭代中：

- 仅通过此新路径路由 `task_completion` 事件
- 其他事件种类保持现有路径不变

### 3. 继续保持 Discord 作为适配器

Discord 仍然是首个适配器实现。

适配器职责：

- 创建/重用线程会话
- 通过 webhook 或频道发送发送绑定消息
- 验证线程状态（已归档/已删除）
- 映射适配器元数据（webhook 身份、线程 ID）

### 4. 修复当前已知的正确性问题

本迭代必需：

- 在重用现有线程绑定管理器时刷新令牌使用
- 记录基于 webhook 的 Discord 发送的出站活动
- 在为会话模式完成选择绑定线程目标时，停止隐式的主频道回退

### 5. 保持当前运行时安全默认值

对禁用线程绑定生成的用户无行为更改。

默认配置保持：

- `channels.discord.threadBindings.spawnSubagentSessions = false`

结果：

- 普通 Discord 用户保持当前行为不变
- 新核心路径仅影响启用的绑定会话完成路由

## 迭代 1 不包含

明确推迟：

- ACP 绑定目标（`targetKind: "acp"`）
- 除 Discord 之外的新频道适配器
- 全局替换所有交付路径（`spawn_ack`，未来的 `subagent_message`）
- 协议层级变更
- 所有绑定持久化存储的迁移/版本设计重构

关于 ACP 的说明：

- 接口设计保留 ACP 空间
- 本迭代不启动 ACP 实现

## 路由不变量

以下不变量为迭代 1 强制要求。

- 目标选择与内容生成是两个独立步骤
- 若会话模式完成解析到活跃绑定目标，则交付必须定位该目标
- 不允许隐式从绑定目标重路由至主频道
- 回退行为必须显式且可观察

## 兼容性与发布

兼容性目标：

- 对禁用线程绑定生成的用户无回归
- 本迭代对非 Discord 频道不作更改

发布流程：

1. 将接口和路由器置于当前功能开关内。
2. 通过路由器路由 Discord 会话模式绑定交付。
3. 对非绑定流程保留旧路径。
4. 通过针对性测试和金丝雀运行时日志验证。

## 迭代 1 所需测试

单元及集成测试覆盖：

- 管理器令牌轮换在重用管理器后使用最新令牌
- webhook 发送更新频道活动时间戳
- 同一请求发起频道中两个活跃绑定会话不会重复发送至主频道
- 绑定会话模式运行的完成只解析到线程目标
- 禁用生成标志保持旧行为不变

## 建议实现文件

核心部分：

- `src/infra/outbound/session-binding-service.ts`（新增）
- `src/infra/outbound/bound-delivery-router.ts`（新增）
- `src/agents/subagent-announce.ts`（完成目标解析集成）

Discord 适配器和运行时：

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

测试：

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## 迭代 1 完成标准

- 核心接口存在并已连接完成路由
- 上述正确性修复完成且有测试覆盖
- 会话模式绑定运行无主频道与线程重复完成交付
- 禁用绑定生成的部署无行为改变
- ACP 明确保持推迟状态
