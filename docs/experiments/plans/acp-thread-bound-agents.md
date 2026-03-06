---
summary: "通过核心和插件支持的运行时中作为第一类 ACP 控制平面，集成 ACP 编码代理（首个实现 acpx）"
owner: "onutc"
status: "draft"
last_updated: "2026-02-25"
title: "ACP 线程绑定代理"
---

# ACP 线程绑定代理

## 概览

本方案定义了 OpenClaw 应如何在支持多线程的通道中（优先 Discord）支持 ACP 编码代理，具备生产级生命周期和恢复能力。

相关文档：

- [统一运行时流重构计划](/experiments/plans/acp-unified-streaming-refactor)

目标用户体验：

- 用户在某个线程中启动或聚焦一个 ACP 会话
- 用户在该线程中的消息路由到绑定的 ACP 会话
- 代理输出流回同一线程身份
- 会话可以是持久的或一次性的，并带有明确的清理控制

## 决策摘要

长期推荐采用混合架构：

- OpenClaw 核心负责 ACP 控制平面相关职责
  - 会话身份和元数据
  - 线程绑定与路由决策
  - 交付不变量及重复抑制
  - 生命周期清理与恢复语义
- ACP 运行时后端可插拔
  - 首个后端为基于 acpx 的插件服务
  - 运行时负责 ACP 传输、排队、取消、重连

OpenClaw 核心不应重新实现 ACP 传输内部细节。
OpenClaw 不应仅依赖纯插件拦截路径进行路由。

## 北极星架构（终极目标）

将 ACP 视为 OpenClaw 中的一级控制平面，支持插件式运行时适配器。

不可妥协的不变量：

- 每个 ACP 线程绑定必须引用有效的 ACP 会话记录
- 每个 ACP 会话有明确的生命周期状态（`creating`, `idle`, `running`, `cancelling`, `closed`, `error`）
- 每个 ACP 运行有明确的运行状态（`queued`, `running`, `completed`, `failed`, `cancelled`）
- 生成、绑定和初始入队操作是原子性的
- 命令重试是幂等的（无重复运行或重复的 Discord 输出）
- 绑定线程通道输出是 ACP 运行事件的投影，绝无临时副作用

长期所有权模型：

- `AcpSessionManager` 是唯一的 ACP 写入者和编排者
- manager 首先运行在网关进程，也可后续迁移到同接口的专用 sidecar
- 每个 ACP 会话键，manager 拥有一个内存中的 actor（串行命令执行）
- 适配器（`acpx` 及未来后端）仅实现传输/运行时

长期持久化模型：

- 将 ACP 控制平面状态迁移到 OpenClaw 状态目录下专用的 SQLite 存储（WAL 模式）
- 在迁移期间保持 `SessionEntry.acp` 作为兼容性投影，但非唯一真实性
- 以追加方式存储 ACP 事件，支持重放、崩溃恢复和确定性交付

### 交付策略（通往北极星的过渡）

- 短期过渡
  - 保持当前线程绑定机制和现有 ACP 配置接口
  - 修复元数据缺失bug，通过单一核心 ACP 分支路由 ACP 回合
  - 立即添加幂等键并启用失败关闭的路由检查
- 长期切换
  - 将 ACP 唯一真实性迁移至控制平面数据库和 actor
  - 绑定线程交付纯粹基于事件投影
  - 移除依赖机会性会话入口元数据的传统回退行为

## 为何不采用纯插件方案

当前插件钩子不足以实现端到端的 ACP 会话路由，必须依赖核心变更。

- 线程绑定的入向路由首先在核心调度中解析为会话键
- 消息钩子是“发即忘”，无法终断主回复路径
- 插件命令适合控制操作，不适合替代核心每回合调度流程

结论：

- ACP 运行时可插件化
- ACP 路由分支必须存在核心中

## 已有基础可复用

已实现且应保持权威：

- 线程绑定目标支持 `subagent` 和 `acp`
- 入向线程路由优先通过绑定路由后才是普通分发
- 通过 webhook 实现出向线程身份
- `/focus` 和 `/unfocus` 流程兼容 ACP 目标
- 持久化绑定存储，启动时恢复
- 在归档、删除、失焦、重置和删除时解绑生命周期

本计划在此基础上扩展，不替代。

## 架构

### 边界模型

核心（必须在 OpenClaw 核心）：

- 回复流水线中的 ACP 会话模式调度分支
- 交付仲裁，避免父频道与线程重复发送
- ACP 控制平面持久化（迁移时保留 `SessionEntry.acp` 兼容投影）
- 绑定解绑和运行时分离的生命周期语义，与会话重置/删除联动

插件后端（acpx 实现）：

- ACP 运行时工作进程监督
- acpx 进程调用和事件解析
- ACP 命令处理(`/acp ...`)及操作体验
- 后端特定配置默认和诊断

### 运行时所有权模型

- 单个网关进程拥有 ACP 编排状态
- ACP 执行在 acpx 后端的受控子进程中运行
- 进程策略为每激活 ACP 会话键长驻，而非每消息启动

避免每次提示启动带来的开销，保持取消和重连语义可靠。

### 核心运行时契约

添加核心 ACP 运行时契约，使路由代码不依赖 CLI 细节，且可以切换后端时不变更调度逻辑：

```ts
export type AcpRuntimePromptMode = "prompt" | "steer";

export type AcpRuntimeHandle = {
  sessionKey: string;
  backend: string;
  runtimeSessionName: string;
};

export type AcpRuntimeEvent =
  | { type: "text_delta"; stream: "output" | "thought"; text: string }
  | { type: "tool_call"; name: string; argumentsText: string }
  | { type: "done"; usage?: Record<string, number> }
  | { type: "error"; code: string; message: string; retryable?: boolean };

export interface AcpRuntime {
  ensureSession(input: {
    sessionKey: string;
    agent: string;
    mode: "persistent" | "oneshot";
    cwd?: string;
    env?: Record<string, string>;
    idempotencyKey: string;
  }): Promise<AcpRuntimeHandle>;

  submit(input: {
    handle: AcpRuntimeHandle;
    text: string;
    mode: AcpRuntimePromptMode;
    idempotencyKey: string;
  }): Promise<{ runtimeRunId: string }>;

  stream(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId: string;
    onEvent: (event: AcpRuntimeEvent) => Promise<void> | void;
    signal?: AbortSignal;
  }): Promise<void>;

  cancel(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId?: string;
    reason?: string;
    idempotencyKey: string;
  }): Promise<void>;

  close(input: { handle: AcpRuntimeHandle; reason: string; idempotencyKey: string }): Promise<void>;

  health?(): Promise<{ ok: boolean; details?: string }>;
}
```

实现细节：

- 首个后端：作为插件服务发布的 `AcpxRuntime`
- 核心通过注册表解析运行时，若无 ACP 后端可用，则以明确运维错误失败

### 控制平面数据模型及持久化

长期唯一真实性是专用 ACP SQLite 数据库（WAL 模式），用于事务更新和崩溃恢复：

- `acp_sessions`
  - `session_key`（主键），`backend`，`agent`，`mode`，`cwd`，`state`，`created_at`，`updated_at`，`last_error`
- `acp_runs`
  - `run_id`（主键），`session_key`（外键），`state`，`requester_message_id`，`idempotency_key`，`started_at`，`ended_at`，`error_code`，`error_message`
- `acp_bindings`
  - `binding_key`（主键），`thread_id`，`channel_id`，`account_id`，`session_key`（外键），`expires_at`，`bound_at`
- `acp_events`
  - `event_id`（主键），`run_id`（外键），`seq`，`kind`，`payload_json`，`created_at`
- `acp_delivery_checkpoint`
  - `run_id`（主键/外键），`last_event_seq`，`last_discord_message_id`，`updated_at`
- `acp_idempotency`
  - `scope`，`idempotency_key`，`result_json`，`created_at`，唯一 `(scope, idempotency_key)`

```ts
export type AcpSessionMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

存储规则：

- 迁移期间保持 `SessionEntry.acp` 作为兼容投影
- 进程 ID 和套接字只存内存
- 持久生命周期和运行状态存于 ACP DB，而非通用会话 JSON
- 若运行时所有者死亡，网关从 ACP DB 复原并从检查点恢复

### 路由与交付

入向：

- 保持当前线程绑定查找作为首要路由步骤
- 若绑定目标为 ACP 会话，则路由到 ACP 运行时分支，替代 `getReplyFromConfig`
- 显式 `/acp steer` 命令使用 `mode: "steer"`

出向：

- ACP 事件流正规化为 OpenClaw 回复片段
- 交付目标通过现有绑定路径解析
- 若该会话回合存在活动绑定线程，则抑制父频道完成消息

流式策略：

- 合并窗口内流式输出分片
- 可配置最小间隔和最大字符数，符合 Discord 速率限制
- 完成或失败时总发最终消息

### 状态机与事务边界

会话状态机：

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

运行状态机：

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

必需事务边界：

- 生成事务
  - 新建 ACP 会话行
  - 创建/更新 ACP 线程绑定行
  - 入队初始运行行
- 关闭事务
  - 标记会话关闭
  - 删除或过期绑定行
  - 写入最终关闭事件
- 取消事务
  - 用幂等键标记目标运行为取消中/已取消

边界间不允许部分成功。

### 每会话 actor 模型

`AcpSessionManager` 对每个 ACP 会话键运行一个 actor：

- actor 邮箱串行化 `submit`、`cancel`、`close` 和 `stream` 副作用
- actor 拥有运行时句柄还原及该会话运行时适配器生命周期
- actor 按序写入运行事件 (`seq`) 并在 Discord 交付前完成
- actor 在成功出向发送后更新交付检查点

消除跨回合竞态，防止重复或乱序线程输出。

### 幂等和交付投影

所有外部 ACP 操作必须携带幂等键：

- 生成幂等键
- 提示/导航幂等键
- 取消幂等键
- 关闭幂等键

交付规则：

- Discord 消息基于 `acp_events` 和 `acp_delivery_checkpoint`
- 重试从检查点继续发送，避免重复发送已投递片段
- 最终回复通过投影逻辑仅发一次

### 恢复与自愈

网关启动时：

- 加载非终态 ACP 会话（`creating`, `idle`, `running`, `cancelling`, `error`）
- 懒加载或配置上限内预加载 actor
- 协调缺失心跳的 `running` 运行，标记失败或由适配器恢复

Discord 线程消息入向时：

- 如有绑定但 ACP 会话已缺失，失败关闭并给出明确陈旧绑定提示
- 可选在安全验证后自动解绑陈旧绑定
- 永不默默将陈旧 ACP 绑定路由至普通 LLM 路径

### 生命周期与安全

支持操作：

- 取消当前运行：`/acp cancel`
- 解绑线程：`/unfocus`
- 关闭 ACP 会话：`/acp close`
- 通过有效 TTL 自动关闭空闲会话

TTL 策略：

- 有效 TTL 是以下数值的最小值
  - 全局/会话 TTL
  - Discord 线程绑定 TTL
  - ACP 运行时所有者 TTL

安全控制：

- 白名单 ACP 代理名称
- 限制 ACP 会话工作区根目录
- 环境变量白名单透传
- 限制账户及全局最大并发 ACP 会话
- 运行时崩溃的有界重启退避

## 配置界面

核心键：

- `acp.enabled`
- `acp.dispatch.enabled`（独立 ACP 路由开关）
- `acp.backend`（默认 `acpx`）
- `acp.defaultAgent`
- `acp.allowedAgents[]`
- `acp.maxConcurrentSessions`
- `acp.stream.coalesceIdleMs`
- `acp.stream.maxChunkChars`
- `acp.runtime.ttlMinutes`
- `acp.controlPlane.store`（默认为 `sqlite`）
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

插件/后端键（acpx 插件部分）：

- 后端命令/路径覆盖
- 后端环境变量白名单
- 后端每代理预设
- 后端启动/停止超时
- 后端每会话最大运行并发数

## 实现规格

### 控制平面模块（新）

在核心添加专用 ACP 控制平面模块：

- `src/acp/control-plane/manager.ts`
  - 拥有 ACP actor、生命周期转换、命令串行化
- `src/acp/control-plane/store.ts`
  - SQLite 架构管理、事务、查询辅助
- `src/acp/control-plane/events.ts`
  - 类型化 ACP 事件定义和序列化
- `src/acp/control-plane/checkpoint.ts`
  - 持久化交付检查点和重放游标
- `src/acp/control-plane/idempotency.ts`
  - 幂等键保留和响应重放
- `src/acp/control-plane/recovery.ts`
  - 启动时调和及 actor 还原计划

兼容桥接模块：

- `src/acp/runtime/session-meta.ts`
  - 临时保留以映射到 `SessionEntry.acp`
  - 迁移切换后不再作为真实来源

### 必需不变量（须代码强制）

- ACP 会话创建和线程绑定原子（单事务）
- 每个 ACP 会话 actor 同时最多一个活跃运行
- 事件 `seq` 在每次运行中严格递增
- 交付检查点永不推进过最后确认事件
- 幂等重放对重复命令键返回先前成功负载
- 陈旧或缺失 ACP 元数据不可路由到普通非 ACP 回复路径

### 核心触点

需改动核心文件：

- `src/auto-reply/reply/dispatch-from-config.ts`
  - ACP 分支调用 `AcpSessionManager.submit` 和事件投影交付
  - 移除绕过控制平面不变量的直接 ACP 回退
- `src/auto-reply/reply/inbound-context.ts` （或邻近的标准化上下文边界）
  - 暴露标准化路由键和幂等种子供控制平面使用
- `src/config/sessions/types.ts`
  - 保留 `SessionEntry.acp` 仅做兼容性投影字段
- `src/gateway/server-methods/sessions.ts`
  - reset/delete/archive 等操作须调用 ACP manager 的关闭/解绑事务路径
- `src/infra/outbound/bound-delivery-router.ts`
  - 对 ACP 绑定会话回合强制失败关闭交付目标行为
- `src/discord/monitor/thread-bindings.ts`
  - 添加 ACP 陈旧绑定验证辅助函数，接入控制平面查找
- `src/auto-reply/reply/commands-acp.ts`
  - 路由启动/取消/关闭/导航命令至 ACP manager API
- `src/agents/acp-spawn.ts`
  - 停止零散元数据写入，调用 ACP manager 生成事务
- `src/plugin-sdk/**` 及插件运行时桥梁
  - 清晰暴露 ACP 后端注册和健康语义接口

核心文件明确不替换：

- `src/discord/monitor/message-handler.preflight.ts`
  - 保持线程绑定覆盖行为为标准会话键解析器

### ACP 运行时注册 API

新增核心注册模块：

- `src/acp/runtime/registry.ts`

必需 API：

```ts
export type AcpRuntimeBackend = {
  id: string;
  runtime: AcpRuntime;
  healthy?: () => boolean;
};

export function registerAcpRuntimeBackend(backend: AcpRuntimeBackend): void;
export function unregisterAcpRuntimeBackend(id: string): void;
export function getAcpRuntimeBackend(id?: string): AcpRuntimeBackend | null;
export function requireAcpRuntimeBackend(id?: string): AcpRuntimeBackend;
```

行为：

- `requireAcpRuntimeBackend` 在无可用后端时抛出类型化 ACP 后端缺失错误
- 插件服务启动时注册后端，停止时注销
- 运行时查询仅读且进程本地

### acpx 运行时插件契约（实现细节）

首个生产后端 `extensions/acpx`，OpenClaw 与 acpx 通过严格命令契约连接：

- 后端 ID：`acpx`
- 插件服务 ID：`acpx-runtime`
- 运行时句柄编码：`runtimeSessionName = acpx:v1:<base64url(json)>`
- 编码载荷字段：
  - `name`（acpx 命名会话，使用 OpenClaw 的 `sessionKey`）
  - `agent`（acpx 代理命令）
  - `cwd`（会话工作区根）
  - `mode`（`persistent | oneshot`）

命令映射：

- 确保会话：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- 提示回合：
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- 取消：
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- 关闭：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

流式：

- OpenClaw 从 `acpx --format json --json-strict` 消费 ndjson 事件
- `text` 对应 `text_delta/output`
- `thought` 对应 `text_delta/thought`
- `tool_call` 对应 `tool_call`
- `done` 对应 `done`
- `error` 对应 `error`

### 会话 schema 补丁

在 `src/config/sessions/types.ts` 中补充 `SessionEntry`：

```ts
type SessionAcpMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

持久字段：

- `SessionEntry.acp?: SessionAcpMeta`

迁移规则：

- A 阶段：双写（`acp` 投影 + ACP SQLite 唯一真实性）
- B 阶段：ACP SQLite 为主读，旧有 `SessionEntry.acp` 作为回退
- C 阶段：迁移命令补全遗漏的 ACP 行
- D 阶段：移除回退读，投影仅作 UX 使用
- 保留旧字段（`cliSessionIds`, `claudeCliSessionId`）不改动

### 错误契约

添加稳定 ACP 错误代码和用户提示：

- `ACP_BACKEND_MISSING`
  - 提示：`未配置 ACP 运行时后端。请安装并启用 acpx 运行时插件。`
- `ACP_BACKEND_UNAVAILABLE`
  - 提示：`ACP 运行时后端当前不可用。稍后重试。`
- `ACP_SESSION_INIT_FAILED`
  - 提示：`无法初始化 ACP 会话运行时。`
- `ACP_TURN_FAILED`
  - 提示：`ACP 回合执行失败。`

规则：

- 在线程内返回可操作且用户安全的消息
- 仅在运行日志中记录详细后端/系统错误
- 当显式选择 ACP 路由时，绝不默默回退到普通 LLM 路径

### 重复交付仲裁

ACP 绑定回合单一路由规则：

- 若针对目标 ACP 会话及请求上下文存在活跃线程绑定，仅投递到该绑定线程
- 切勿同时向父频道发送同一回合
- 如绑定目标不明确，失败关闭并报明确错误（无隐式父频道回退）
- 若无活跃绑定，则使用普通会话目标行为

### 可观测性与运维准备

必需指标：

- 按后端及错误码统计 ACP 生成成功/失败次数
- ACP 回合延迟百分位（排队等待、运行时、投影交付）
- ACP actor 重启次数及原因
- 陈旧绑定检测次数
- 幂等重放命中率
- Discord 交付重试及速率限制计数

必需日志：

- 按 `sessionKey`, `runId`, `backend`, `threadId`, `idempotencyKey` 结构化日志
- 会话和运行状态机的明确状态转换日志
- 适配器命令日志，支持安全脱敏参数及退出摘要

必需诊断：

- `/acp sessions` 显示状态、活跃运行、最后错误和绑定状态
- `/acp doctor` 或等效命令验证后端注册、存储健康和陈旧绑定

### 配置优先级与有效值

ACP 启用优先级：

- 账户覆写：`channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- 频道覆写：`channels.discord.threadBindings.spawnAcpSessions`
- 全局 ACP 开关：`acp.enabled`
- 调度开关：`acp.dispatch.enabled`
- 后端可用性：是否有为 `acp.backend` 注册后端

自动启用行为：

- 当配置开启 ACP (`acp.enabled=true`、`acp.dispatch.enabled=true` 或 `acp.backend=acpx`) 时
- 插件会自动启用，设置 `plugins.entries.acpx.enabled=true`
- 若被拒绝列表或显式禁用则无效

TTL 有效值：

- `min(session TTL, discord 线程绑定 TTL, acp 运行时 TTL)`

### 测试地图

单元测试：

- `src/acp/runtime/registry.test.ts`（新增）
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts`（新增）
- `src/infra/outbound/bound-delivery-router.test.ts`（扩展 ACP 失败关闭用例）
- `src/config/sessions/types.test.ts` 或近似的会话存储测试（ACP 元数据持久化）

集成测试：

- `src/discord/monitor/reply-delivery.test.ts`（绑定 ACP 交付目标行为）
- `src/discord/monitor/message-handler.preflight*.test.ts`（绑定 ACP 会话键路由连续性）
- 后端包中的 acpx 插件运行时测试（服务注册/启动/停止 + 事件正规化）

网关端到端测试：

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts`（扩展 ACP 重置/删除生命周期覆盖）
- ACP 线程回合整流端到端测试（生成、消息、流、取消、失焦、重启恢复）

### 发布保护

添加独立的 ACP 调度杀死开关：

- `acp.dispatch.enabled` 首次发布默认为 `false`
- 禁用时：
  - ACP 生成/聚焦控制命令仍可绑定会话
  - ACP 调度路径不激活
  - 用户收到明确告知 ACP 调度因策略被禁用
- 经金丝雀验证后，后续发布可将默认改为 `true`

## 命令及 UX 计划

### 新命令

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### 现有命令兼容

- `/focus <sessionKey>` 继续支持 ACP 目标
- `/unfocus` 保持当前语义
- `/session idle` 和 `/session max-age` 替代旧的 TTL 覆盖

## 分阶段发布

### 阶段 0 ADR 和 schema 冻结

- 发布 ACP 控制平面所有权和适配器边界 ADR
- 冻结数据库 schema（`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`）
- 定义稳定 ACP 错误代码、事件契约及状态转换守卫

### 阶段 1 核心控制平面基础

- 实现 `AcpSessionManager` 和每会话 actor 运行时
- 实现 ACP SQLite 存储及事务辅助
- 实现幂等存储及重放辅助
- 实现事件追加及交付检查点模块
- 将生成/取消/关闭 API 与 manager 事务绑定

### 阶段 2 核心路由和生命周期集成

- 将线程绑定 ACP 回合从调度流水线路由至 ACP manager
- 当 ACP 绑定/会话不变式失败时执行失败关闭路由
- 集成重置/删除/归档/失焦生命周期与 ACP 关闭/解绑事务
- 添加陈旧绑定检测及可选自动解绑策略

### 阶段 3 acpx 后端适配器/插件

- 实现符合运行时契约的 `acpx` 适配器（`ensureSession`, `submit`, `stream`, `cancel`, `close`）
- 添加后端健康检查及启动/关闭注册
- 将 acpx ndjson 事件正规化为 ACP 运行时事件
- 强制执行后端超时、进程监督和重启/退避策略

### 阶段 4 交付投影及频道 UX（优先 Discord）

- 实现基于事件驱动的频道投影及检查点恢复（优先 Discord）
- 合并流式片段，配置速率限制感知刷新策略
- 保证每次运行有且仅有一次最终完成消息
- 发布 `/acp spawn`, `/acp cancel`, `/acp steer`, `/acp close`, `/acp sessions`

### 阶段 5 迁移及切换

- 引入双写机制，兼容写入 `SessionEntry.acp` 投影及 ACP SQLite 唯一真实性
- 添加迁移工具补充旧 ACP 元数据行
- 读取路径切换为 ACP SQLite 主体
- 移除依赖缺失 `SessionEntry.acp` 的旧回退路由

### 阶段 6 强化、SLO 及规模限制

- 强制并发限制（全局/账户/会话）、排队策略和超时预算
- 添加完整遥测、仪表板和告警阈值
- 做混沌测试覆盖崩溃恢复和重复交付抑制
- 发布后端故障、数据库损坏和陈旧绑定修复运行手册

### 完整实现清单

- 核心控制平面模块及测试
- DB 迁移与回滚计划
- ACP manager API 与调度、命令集成
- 适配器注册接口于插件运行时桥
- acpx 适配器实现与测试
- 支持线程能力通道的交付投影及检查点重放（优先 Discord）
- 支持重置/删除/归档/失焦生命周期钩子
- 陈旧绑定检测器和运维诊断界面
- 所有新 ACP 配置键的验证与优先级测试
- 运维文档及故障排查手册

## 测试计划

单元测试：

- ACP DB 事务边界（生成/绑定/入队原子性，取消，关闭）
- 会话及运行状态机转换守卫
- 所有 ACP 命令的幂等键预留及重放语义
- 每会话 actor 串行化和队列排序
- acpx 事件解析器与分片合并器
- 运行时监督重启与退避策略
- 配置优先级和有效 TTL 计算
- 核心 ACP 路由分支选择及后端/会话失效时失败关闭行为

集成测试：

- 模拟 ACP 适配器进程，实现确定性流和取消行为
- ACP manager + 调度的事务持久集成
- 线程绑定入向路由至 ACP 会话键
- 线程绑定出向交付抑制父频道重复消息
- 检查点重放支持交付失败恢复与从最后事件续传
- 插件服务注册与运行时 ACP 后端注销测试

网关端到端测试：

- 线程中新建 ACP，会话多轮提示交互，失焦
- 网关重启后从持久化 ACP DB 和绑定恢复，继续同一会话
- 多线程并发 ACP 会话无交叉干扰
- 重复命令重试（同一幂等键）不产生重复运行或回复
- 陈旧绑定场景产生明确错误并支持安全自动清理

## 风险与缓解

- 过渡期间重复交付
  - 缓解：单一目的地解析与幂等事件检查点
- 负载下运行时进程频繁切换
  - 缓解：每会话拥有长期进程 + 并发限制 + 退避
- 插件缺失或配置错误
  - 缓解：明显运维错误，失败关闭 ACP 路由（无隐式回退）
- 子代理和 ACP 门控配置混淆
  - 缓解：明确 ACP 键和含有效策略来源的命令反馈
- 控制平面存储腐败或迁移缺陷
  - 缓解：WAL 模式，备份/恢复接口，迁移烟雾测试和只读回退诊断
- actor 死锁或邮箱阻塞
  - 缓解：看门狗定时器，actor 健康探测，限制邮箱深度并拒绝并提供遥测

## 验收清单

- ACP 会话生成可在支持通道适配器（当前 Discord）内创建或绑定线程
- 所有线程消息仅路由至绑定的 ACP 会话
- ACP 输出显示在同一线程身份下，支持流式或批量
- 绑定回合无父频道重复输出
- 生成+绑定+初始入队原子写入持久存储
- ACP 命令重试幂等，无重复运行或输出
- 取消、关闭、失焦、归档、重置和删除执行确定性清理
- 崩溃重启保留映射，续接多轮连续性
- 并发线程绑定 ACP 会话无干扰
- ACP 后端缺失时产出明确可操作错误
- 检测并显式提示陈旧绑定（支持安全自动清理）
- 为运维人员提供控制平面指标和诊断
- 新增单元、集成和端到端测试均通过

## 附录：当前实现的目标重构（状态）

以下为非阻塞的后续工作，确保当前 ACP 路径功能落地后易于维护。

### 1) 集中 ACP 调度策略评估（已完成）

- 实现于 `src/acp/policy.ts` 的共享 ACP 策略辅助
- 调度、ACP 命令生命周期处理器及新建路径均调用共享策略逻辑

### 2) 按子命令领域拆分 ACP 命令处理器（已完成）

- `src/auto-reply/reply/commands-acp.ts` 作为轻量路由层
- 子命令行为拆分为：
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - 共享助手在 `src/auto-reply/reply/commands-acp/shared.ts`

### 3) 按职责拆分 ACP 会话管理器（已完成）

- 管理器拆分为：
  - `src/acp/control-plane/manager.ts`（公共外观 + 单例）
  - `src/acp/control-plane/manager.core.ts`（管理器实现）
  - `src/acp/control-plane/manager.types.ts`（管理器类型/依赖）
  - `src/acp/control-plane/manager.utils.ts`（归一化与辅助函数）

### 4) acpx 运行时适配器可选清理

- `extensions/acpx/src/runtime.ts` 可拆分为：
- 进程执行/监督
- ndjson 事件解析/正规化
- 运行时 API 面（`submit`, `cancel`, `close` 等）
- 优化测试性并方便审查后端行为
