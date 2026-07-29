---
summary: "面向 Control UI、原生应用、频道和父会话的持久、可深链接的审批设计"
read_when:
  - 更改 exec 或插件审批生命周期、存储、协议或授权
  - 向某个频道添加审批链接或原生审批控件
  - 将子会话审批投影到父会话或编排器视图中
title: "多界面操作员审批"
---

# 多界面操作员审批

此设计跟踪 [#103505](https://github.com/openclaw/openclaw/issues/103505)。它将进程本地的审批权限替换为由 Gateway 拥有、以 SQLite 为后端的生命周期。每个由 Gateway 拥有的 exec 或插件/工具审批都会获得一个稳定的 ID、一个经过认证的 Control UI 路由、原子性的“先答复者获胜”决议，以及仅面向操作员的投影，显示到其源会话流和祖先会话流中。

内联操作和深链接并存。不存在审批模式切换。

## 目标

- 为 exec 和 plugin 门控提供一个持久的审批对象。
- 稳定的 `${controlUiBasePath}/approve/{approvalId}` 路由。
- 可从任意已授权的 Control UI、原生应用或渠道界面进行处理。
- 在并发界面之间实现原子性的“先到先得”行为。
- 相同重试保持幂等；冲突的后续答案不能覆盖获胜结果。
- 超时、格式错误的受信任裁决、缺失路由、取消和重启都应失败并关闭。
- 请求事件和终态事件会送达源会话以及所有相关的父级/编排者所有者。
- 渠道接收类型化的审批和导航动作；传输回调数据保持渠道私有。
- 现有的 exec/plugin Gateway 方法保持兼容，同时其实现逐步收敛到同一服务。

## 非目标

- 在 Gateway 重启后，继续保留或恢复被阻塞的工具执行本身。
- 将审批 ID 或 URL 变成持有者凭证。
- 将审批提示附加到模型可见的对话记录中，或唤醒父代理。
- 将审批策略、产品命令或审阅者授权移入通道插件。
- 按通道、设备或祖先克隆审批状态。
- 重新设计 exec allowlist、插件策略组合，或 `allow-always` 持久化，除非这是使终态结果无歧义所必需的。
- 在第一阶段中让无 gateway 的嵌入式 TUI 可被远程访问。它仍然只限本地使用，并且在没有审阅者时必须安全失败。

## 预发布基线与证据映射

此表记录了 #103505 打开时的实现状态。下面的 rollout 部分跟踪建立在该基线之上的持久化注册表、类型化动作、深链页面以及原生客户端增量。

| 作用域            | 基线入口点和所有者                                                                                                                                          | 基线行为和差距                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent exec        | `src/agents/bash-tools.exec-approval-request.ts`, `src/agents/bash-tools.exec-host-shared.ts`                                                             | 两阶段 `exec.approval.*` 注册避免了过早的 `/approve` 竞争，但超时仍可能通过 `askFallback` 变为允许。                                                                                           |
| 插件工具门禁      | `src/agents/agent-tools.before-tool-call.ts`                                                                                                              | 请求 `plugin.approval.*`；`timeoutBehavior: "allow"` 可能会批准一个已超时的门禁。嵌入模式在 `src/infra/embedded-plugin-approval-broker.ts` 中有单独的进程本地权限。                          |
| 插件节点门禁      | `src/gateway/node-invoke-plugin-policy.ts`                                                                                                              | 直接通过插件管理器创建并广播，复制了 server-method 生命周期的一部分。                                                                                                                       |
| Gateway 权限      | `src/gateway/server-aux-handlers.ts`, `src/gateway/exec-approval-manager.ts`, `src/gateway/server-methods/approval-shared.ts`                           | 独立的 exec 和 plugin 管理器使用进程本地 map。终态条目会保留 15 秒。先到先得只在单个进程内成立。                                                                                               |
| Gateway 协议      | `packages/gateway-protocol/src/schema/exec-approvals.ts`, `packages/gateway-protocol/src/schema/plugin-approvals.ts`, `src/gateway/methods/core-descriptors.ts` | Exec 只有 pending-only 的 `get`；plugin 没有 `get`；不存在可供深链使用的、不区分 kind 的终态查找。                                                                                             |
| 交付              | `src/infra/exec-approval-channel-runtime.ts`, `src/infra/approval-native-runtime.ts`, `src/infra/approval-handler-runtime.ts`                           | 支持来源路由、审批者私信、pending 重放、原生处理器以及进程内终态清理。另一个后续改动会添加持久化终态协调。                                                                                     |
| 可移植动作        | `src/interactive/payload.ts`, `src/plugin-sdk/interactive-runtime.ts`, `src/plugin-sdk/approval-reply-runtime.ts`                                       | 审批按钮是包含 `/approve ...` 的命令动作；URL 和 Web App 目标是未类型化的按钮字段。                                                                                                          |
| Telegram          | `extensions/telegram/src/approval-handler.runtime.ts`, `extensions/telegram/src/button-types.ts`                                                        | 渲染器在生成私有回调数据之前，会先解析命令文本以识别审批语义。                                                                                                                               |
| 控制 UI           | `ui/src/app/exec-approval.ts`, `ui/src/app/overlays.ts`, `ui/src/components/exec-approval.ts`                                                           | 审批 UI 是一个全局模态框。`ui/src/app-route-paths.ts` 和 `ui/src/app-routes.ts` 使用精确路由，并将未知路径重写为 Chat。                                                                        |
| 会话所有权        | `src/agents/subagent-registry.types.ts`, `src/agents/subagent-registry-read.ts`, `src/config/sessions/types.ts`                                         | 存在 controller、requester、显式 parent 和 legacy spawn 所有权，但审批事件并未投射到这些会话流。                                                                                               |
| 共享状态          | `src/state/openclaw-state-schema.sql`, `src/state/openclaw-state-db.ts`                                                                                   | 现有的即时事务和 Kysely 条件更新支持在 `state/openclaw.sqlite` 中进行持久化的 compare-and-set。                                                                                                |

具有代表性的当前测试包括 `src/gateway/exec-approval-manager.test.ts`、`src/gateway/server-methods/approval-shared.test.ts`、`src/agents/bash-tools.exec-gateway-approval.e2e.test.ts`、`extensions/telegram/src/approval-handler.runtime.test.ts` 和 `ui/src/e2e/approval-flow.e2e.test.ts`。

plugin SDK 仍然是唯一的 channel/plugin 边界。审批运行时和展示层的更改必须通过现有的 `src/plugin-sdk/approval-*.ts` 和 `src/plugin-sdk/interactive-runtime.ts` 子路径导出；plugin 生产代码不得导入 Gateway 内部实现。

## 现有方案

Omnigent 提供了有用的 UX 和失败语义：

- [`approval.py`](https://github.com/omnigent-ai/omnigent/blob/46e3cd9754c3b8567f7b09f4d19b6249dabe0e80/omnigent/runtime/policies/approval.py) 会暂停 ASK，按策略应用超时，并且只把完全匹配的 accept 视为批准。
- [`sessions.py`](https://github.com/omnigent-ai/omnigent/blob/46e3cd9754c3b8567f7b09f4d19b6249dabe0e80/omnigent/server/routes/sessions.py) 包含服务器端原生 harness 门控以及祖先请求/解析投影。
- [`ApprovePage.tsx`](https://github.com/omnigent-ai/omnigent/blob/46e3cd9754c3b8567f7b09f4d19b6249dabe0e80/web/src/pages/ApprovePage.tsx) 提供独立的移动端审批页面。

不要不加批判地照搬它的存储声明。当前活跃的待处理状态是进程本地的，位于 [`_elicitation_registry.py`](https://github.com/omnigent-ai/omnigent/blob/46e3cd9754c3b8567f7b09f4d19b6249dabe0e80/omnigent/server/_elicitation_registry.py) 中，而未使用的待处理表已被 [`e3b1f2a4c9d7_drop_pending_tool_calls_table.py`](https://github.com/omnigent-ai/omnigent/blob/46e3cd9754c3b8567f7b09f4d19b6249dabe0e80/omnigent/db/migrations/versions/e3b1f2a4c9d7_drop_pending_tool_calls_table.py) 移除。OpenClaw 则有意更进一步：SQLite 是权威来源，且每一次终态转换都是一次数据库 compare-and-set。

## 架构与所有权

Gateway 负责整个生命周期：

1. 代理、插件钩子或节点策略提供特定类型的请求和进程本地执行绑定。
2. Gateway 对其进行校验，并构建一个已清理的审阅者投影。
3. 审批服务计算来源/所有者受众，插入规范行，然后注册进程内等待器。
4. 在持久化插入之后，Gateway 发布现有的审批事件、会话投影、频道通知以及原生推送。
5. 每个表面都通过同一个服务进行解析。
6. 该服务提交一次终态转换，唤醒运行时等待器，并发布终态投影。
7. 事件投递失败绝不会回滚已提交的决定；客户端通过 `approval.get` 或列表回放恢复。

所有权边界：

- `src/gateway/`：审批服务、授权、RPC 适配器、URL 构造、等待器生命周期以及事件发布。
- `src/state/`：共享 schema 和生成的 Kysely 类型。
- `src/infra/`：已清理的审批视图模型和可移植的展示构造。
- `src/agents/`：请求、等待并应用返回的裁决；不负责持久化。
- `src/channels/` 和 `extensions/*`：渲染类型化操作、授权频道用户、编码私有回调以及更新已送达控件。
- `src/plugin-sdk/`：仅公开审批和展示契约。
- `ui/`：独立页面以及现有的队列/模态框客户端。

进程内等待器是一种通知机制，不是权威来源。注册会先插入该行并同步安装等待器，然后再发布请求，因此解析器不可能在这些步骤之间插入。之后每个解析器都会先通过 SQLite 提交，再使该等待器结束。

## 持久化记录

向共享状态数据库中添加一个 `operator_approvals` 表。

| 列                                                 | 目的                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `approval_id`                                      | 全局唯一的规范化 ID。为保持协议兼容性，保留现有 exec ID 和 `plugin:` ID，但绝不能根据前缀推断类型。      |
| `resolution_ref`                                   | 用于无法携带规范化 ID 的传输回调的唯一完整 SHA-256 base64url 定位符。它不是授权信息，也不是公开 URL ID。 |
| `kind`                                             | 封闭的 `exec \| plugin` 区分器。                                                                                                        |
| `status`                                           | 封闭的 `pending \| allowed \| denied \| expired \| cancelled` 状态。                                                                          |
| `presentation_json`                                | 已验证、带 kind 标签的审阅者投影。原始运行时请求、命令绑定和回调负载都保留在进程本地。               |
| `source_agent_id`, `source_session_key`            | 源身份和会话投影锚点。会话密钥是持久的；轮换的会话 UUID 不是。                                          |
| `audience_session_keys_json`                       | 由受限广度优先所有权遍历生成的、排序且去重后的 JSON 数组。请求事件和终态事件使用同一快照。 |
| `requested_by_device_id`, `requested_by_client_id` | 持久化的请求方/审计元数据。连接 ID 保留在内存中，不是跨界面的主体标识。                                         |
| `reviewer_device_ids_json`                         | 仅由受信任的审批运行时提供的、可选的显式目标审阅者设备。                                                  |
| `runtime_epoch`                                    | 拥有已挂起执行的进程纪元；用于在重启后取消孤立行。                                                     |
| `created_at_ms`, `expires_at_ms`, `updated_at_ms`  | 权威时间。                                                                                                                         |
| `decision`                                         | 当存在时的显式用户决策。                                                                                                       |
| `terminal_reason`                                  | 封闭原因，例如 `user`、`timeout`、`malformed-verdict`、`no-route`、`run-aborted` 或 `gateway-restart`。                                |
| `resolved_at_ms`, `resolver_kind`, `resolver_id`   | 在服务端保留的获胜者和审计身份。审阅者投影省略原始解析器标识符。                                           |
| `consumed_at_ms`, `consumed_by`                    | 为 `allow-once` 单独设置的重放防护；消费时不能擦除已记录的决策。                                                       |

必需索引：

| Index                                      | Purpose                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| unique `(resolution_ref)`                  | 在插入期间拒绝 `approval_id`/`resolution_ref` 跨列歧义。 |
| `(status, expires_at_ms)`                  | 查找待审批项并协调权威截止时间。               |
| `(source_session_key, created_at_ms DESC)` | 为单个源会话重放最近的审批记录。                             |
| `(resolved_at_ms)`                         | 根据固定保留策略清理保留的终态审批记录。  |

Audience 数组较小且有界。会话过滤后的重放首先通过 Kysely 选择可见的 pending 行，然后在应用代码中解码并过滤有界的 audience 数组；它不使用字符串匹配或原始 SQL JSON 查询。

将终态行保留 30 天，并与 `src/audit/audit-event-store.ts` 中的元数据审计保留策略保持一致。清理是固定的维护策略，不是新的配置项。数据库是私有的本地控制平面状态，但审阅者 API 绝不能暴露完整存储的请求或运行时绑定。

## 状态机和比较并设置

仅以下转换是有效的：

- `pending -> allowed`：显式 `allow-once` 或 `allow-always`。
- `pending -> denied`：显式拒绝、受信任的格式错误终局裁定，或无投递路由。
- `pending -> expired`：达到权威截止时间。
- `pending -> cancelled`：运行中止、平滑关闭，或重启孤儿恢复。

每个非 `allowed` 的终态都具有有效裁定 `deny`。

解析使用一次即时 SQLite 事务和一个 Kysely 条件更新，等价于：

```sql
UPDATE operator_approvals
SET status = ?, decision = ?, terminal_reason = ?, resolved_at_ms = ?
WHERE approval_id = ?
  AND status = 'pending'
  AND expires_at_ms > ?;
```

如果更新未影响任何行，同一事务读取该记录：

- 缺失或未授权：返回未找到；不要泄露存在性。
- 仍为 pending 但已到截止时间：将其比较并设置为 `expired`，然后返回该终态行。
- 相同记录决策：返回幂等成功以及记录的胜出者。
- 不同决策：统一 API 返回 `applied: false` 并附带记录的胜出者；在其已发布契约要求时，旧版适配器保留 `APPROVAL_ALREADY_RESOLVED`。
- 任何终态：绝不修改它。

`now == expires_at_ms` 视为已过期。网关时间具有权威性。

`allow-once` 执行使用第二次 CAS，基于 `consumed_at_ms IS NULL`，并绑定到现有的精确命令/系统运行上下文。审批行在消费后仍保留为审计记录。

无法认证或无法识别审批的格式错误 HTTP/RPC 输入会被拒绝且不发生变更，并且永远不能批准。对于已知审批，如果从受信任的 harness/waiter 收到格式错误的终局裁定，则会转换为 `denied`。

## Gateway API

新增与 kind 无关的审核者方法：

| 方法                                    | 合约                                                                                                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approval.get { id }`                     | 返回一个可见的待处理或已保留的终态投影。                                                                                                                                                                          |
| `approval.resolve { id, kind, decision }` | 接受规范 ID 或固定大小的传输引用，然后执行授权、kind 以及允许的决策校验、截止时间协调和终态 CAS。响应始终携带规范 ID。                                                                                         |

在 CAS 成功后，立即返回已提交的投影。旧事件、通道转发器以及推送终结器都只是尽力而为的后续处理；缓慢或失败的表面不应延迟或回滚获胜的响应。

特定 kind 的请求校验仍保留在 `exec.approval.request` 和 `plugin.approval.request` 中。现有的 `exec.approval.get/list/waitDecision/resolve` 和 `plugin.approval.list/waitDecision/resolve` 将变为协议边界适配器，指向规范服务，因为它们是以 Gateway API 形式发布的。在同一次变更中，内部调用方迁移到该服务。

审核者投影是一个带标签的联合类型：

```ts
type OperatorApproval = {
  id: string;
  status: OperatorApprovalStatus;
  presentation:
    | { kind: "exec"; commandText: string /* 安全的 exec 预览 */ }
    | { kind: "plugin"; title: string; description: string /* 安全的插件预览 */ };
  // 通用生命周期字段
};
```

稳定路径是派生出来的，而不是持久化保存的。`approval.get` 返回 `urlPath`；知道已批准公共来源的表面也可能收到绝对 `url`。审核者快照省略 source 和 audience session keys。Gateway 将这些路由键保留在服务端，用于单独的 `session.approval` 投影。

## 事件和可移植操作

PR 1 保留了已发布的事件名称、负载以及现有的记录级接收者过滤器：

- `exec.approval.requested`
- `exec.approval.resolved`
- `plugin.approval.requested`
- `plugin.approval.resolved`

这些旧版事件可能包含完整的运行时请求，因此不能向每个 approval 范围内的客户端进行广播。PR 5 通过已清理的生命周期投影添加了带标签的生命周期字段（`status`、`sourceSessionKey`、`urlPath`、终态元数据，以及展示层级的 `kind`），而不是扩大旧版事件的投递范围。

新增一个 approval 范围内的 `session.approval` 投影事件。使用持久化的受众键仅发布一次规范事件；精确会话订阅者会针对每个匹配的键收到相同事件：

- `sessionKey`：接收该投影的流。
- `sourceSessionKey`：触发该门控的子会话/来源。
- `phase`：`pending \| terminal`，根据审批状态进行区分。
- 一个安全的 `OperatorApproval` 投影。

客户端通过 `sessions.messages.subscribe { key, agentId?, includeApprovals: true }` 选择加入。成功响应会添加一个 `approvalReplay`，其中包含最多 1,000 条当前待处理审批，范围仅限于该精确流键，并且订阅该客户端也被记录授权可以查看这些审批。`truncated: false` 表示过滤后的回放具有权威性，重新连接的客户端应使用它替换本地的待处理集合；`truncated: true` 是过载信号，客户端必须保留未见到的本地条目，直到规范查找或后续生命周期事件将其解决。若在回放期间发现稍后持久化的超时，则只会先向已订阅且具记录授权的受众发出终态墓碑记录，之后再返回新的快照。`operator.admin` 可以直接选择加入；更窄范围的客户端则需要配对设备身份和 `operator.approvals` 两者同时具备。仅订阅会话绝不会授予审批可见性。

在 `src/gateway/server-broadcast.ts` 中将该事件注册到 `operator.approvals` 下。该投影仅用于观察：它不会追加 transcript 行、不会发送 `sessions.changed`，也不会唤醒代理。

扩展 `src/interactive/payload.ts` 中的 `MessagePresentationAction`：

```ts
type MessagePresentationAction =
  | { type: "command"; command: string }
  | { type: "callback"; value: string }
  | {
      type: "approval";
      approvalId: string;
      approvalKind: "exec" | "plugin";
      decision: ExecApprovalDecision;
    }
  | { type: "url"; url: string }
  | { type: "web-app"; url: string };
```

核心层会在可用且已批准的绝对 Control UI 源时构建带类型的决策操作和一个单独的 Review 链接。各通道会将审批操作编码为自己的回调格式，并将解析结果发送到规范服务。若适用，回调会使用完全一致的规范 ID；否则会使用该行唯一的完整摘要 `resolution_ref`。该引用仅是一个紧凑的查找键：正常的 Gateway 身份验证、记录授权、显式 kind、允许决策校验、截止时间协调以及 first-answer CAS 仍然适用。通道不得截断 ID、解析哈希前缀、解析 `/approve` 文本，或根据 ID 前缀推断 kind。

将 `button.url`、`button.webApp` 以及由命令驱动的审批控件保留为已弃用的插件 SDK 兼容输入。在 SDK 边界对其进行规范化；并在同一个 PR 中迁移所有捆绑的内部调用方。`/approve {id} {decision}` 仍然是文本回退和 CLI/chat 命令，而不是按钮语义契约。

## Control UI

The route is `${basePath}/approve/{approvalId}`. The ID is the unique path parameter; the source session identity comes from the record.

Because the current router has exact static routes and rewrites unknown paths to Chat, this deep link needs to be detected in `ui/src/app/bootstrap.ts` before normal route normalization. Reuse the normal Gateway/auth setup, but render a standalone approval page outside the sidebar shell and global modals.

This document is owned by the Gateway whose URL it provides. Its initial connection ignores the app-wide persisted remote Gateway selection without changing or copying that selection’s settings; only authentication remains session-scoped to the Gateway serving the document. Trusted native authentication, or a separately confirmed `gatewayUrl` override, may redirect it. The core will prefer keeping the single-segment `/approve` namespace ahead of plugin HTTP routes and static extension detection, including IDs ending in `.json` or `.js`; when the Control UI service is disabled, that reserved route fails closed with `404`. Keep this page in the main Control UI bundle so a failed lazy-load chunk cannot leave a security decision stuck on a loading spinner.

Page states:

- Loading
- Authentication required
- Pending
- Resolving
- Approved or rejected here
- Resolved elsewhere
- Expired
- Canceled
- Forbidden / not found
- Connection error, retryable

This page calls Gateway RPC, not a second unauthenticated REST API. A browser refresh re-reads persisted state. It never puts Gateway credentials in the URL, query parameters, or fragment.

## 授权与隐私

URL 是定位符，不是权限凭证。解析需要：

1. 已认证的 Gateway 连接；
2. `operator.approvals` 或 `operator.admin`；
3. 记录级审查者授权。

记录级规则：

- `operator.admin` 可以审查。
- 当 `reviewer_device_ids` 存在时，它具有权威性。只有列表中的已配对 `operator.approvals` 设备可以审查；请求设备不会因此获得隐式访问，除非它也在列表中。
- 如果没有显式的审查者列表，请求的已配对 `operator.approvals` 设备可以审查自己的记录。
- 真正的旧版记录若没有请求者或审查者绑定，仍保留宽泛的已配对设备可见性，因此升级不会让已在等待中的工作无法继续。
- 无设备的内部运行时可以通过受限的 approval-runtime 连接进行解析，但不能读取。该权限仅来自服务器认证的运行时令牌；公开的 `approval.resolve` 字段无法生成它。
- 对于旧版适配器，实时请求者连接所有权仍然有效；它绝不会因为客户端名称匹配而被推断出来。
- 受众成员资格只会改变展示方式。它绝不会扩大授权。

`approval.get` 只暴露经过清理的审查者投影，并省略内部来源/受众路由键。PR 5 的 `session.approval` 事件在 Gateway 于服务器端应用持久化的受众快照后，会携带其唯一目标 `sessionKey` 以及 `sourceSessionKey`。现有的 exec/plugin 事件在消费者迁移之前，会保持其历史有效载荷和受限接收者不变。可执行请求、命令绑定和续传仍只保留在进程本地的等待器中。持久化行包含安全的展示内容以及生命周期、路由和审计元数据；它绝不会存储原始环境值、凭据、认证头或通道回调数据。

## Audience Projection

Before insertion, compute the audience once and persist the ordered snapshot. Ownership is a graph, not always a single parent chain: a child may simultaneously have the current controller and the original requester, and those owners can point to different roots.

Use a deterministic breadth-first traversal:

1. Initialize the queue with the source session key.
2. For each dequeued key, read the latest subagent registry row and enqueue the two distinct ownership edges in a fixed order: `controllerSessionKey`, then `requesterSessionKey`.
3. When a registry row is available, do not continue following session-entry ancestry that may have become stale after steering. Otherwise, enqueue the single current fallback edge `parentSessionKey ?? spawnedBy`.
4. Normalize and deduplicate on enqueue so the first, shortest path wins.
5. Stop when 64 unique keys are reached; this audience size cap also bounds traversal depth.

The registry source is `src/agents/subagent-registry-read.ts`; ownership fields are defined in `src/agents/subagent-registry.types.ts`. Session fallback fields are defined in `src/config/sessions/types.ts`.

Regardless of how focus/controller ownership changes while approval is pending, request and terminal projections use the same persisted audience. This guarantees that terminal cleanup will execute for every audience session stream that received the request projection. Resolution always targets the source approval ID; audience sessions never receive cloned approval state. Forwarded channel-message cleanup remains the separate delivery locator follow-up step below.

Do not write transcript messages, inject system prompts, start owner turns, or emit `sessions.changed` just for approval.

## 已交付表面收敛

原生审批处理器已经会保留其已交付的消息条目足够长的时间，以便替换或撤销活动控件。通用转发审批消息当前会丢弃 `MessageReceipt`，因此在另一个表面上的决策可能会让其旧控件看起来仍处于待处理状态。后续的一个独立修补通过共享状态数据库中的 `operator_approval_deliveries` 子表来弥补这一缺口。

每一行存储审批 ID、唯一交付 ID、频道/账户/精确路由、经过边界限制且经 JSON 验证的频道私有消息定位符、交付时间戳以及终局化状态。它从不存储回调数据、决策令牌或原始审批请求。频道负责定位符编码和消息变更；核心负责规范化状态、目标选择、重试策略以及备用终局文本。

交付注册和终局解析可安全地发生竞争：

1. 在待发送返回其回执后，在一个事务中插入交付定位符并读取父审批状态。
2. 如果父项已经是终态，则安排立即终局化，而不是让迟到的交付继续保持待定。
3. 每次已提交的终态转换都会分别安排所有尚未终局化的交付行；可丢弃的广播不是触发条件。
4. 频道终局化器会报告 `replaced`、`retired` 或 `unsupported`。`replaced` 会抑制重复的终局消息；`retired` 会发送现有的终局后续消息；`unsupported` 或失败则回退，但不会回滚审批 CAS。
5. 启动时会重试带有未完成交付的终态审批，使清理对 Gateway 重启具有弹性。

这个传输生命周期是一个可选的交付适配器钩子，而不是渲染器或面向模型的消息操作。QQ C2C/群消息当前没有编辑、删除或键盘清除 API；该适配器仍然不受支持，并且在传输获得变更 API 之前，只能在后续点击后显示规范事实。

## Restart, timeouts, and routing semantics

SQLite persistence does not imply execution recovery. Command/tool bindings are retained in memory because they may contain security-sensitive runtime facts, and they are not a recoverable job contract.

At Gateway startup:

- Generate a new runtime epoch;
- Atomically convert pending rows from earlier epochs to `cancelled` with reason `gateway-restart`;
- Retain those rows so their URL explains what happened;
- Never perform subsequent approval on missing runtime bindings.

Timers are only a wake-up optimization. Deadline authority lives in `expires_at_ms`; reads, waits, and parsing all perform expiration reconciliation.

Final strict behavior:

- timeout -> `expired`, reject;
- no route -> `denied`, reject;
- runtime abort -> `cancelled`, reject;
- trusted verdict malformed -> `denied`, reject;
- only an explicit allow decision -> `allowed`.

Current published exec behavior still conflicts with this contract:

- `src/agents/bash-tools.exec-host-shared.ts` may apply `askFallback`.
- `docs/tools/exec-approvals.md` and `docs/cli/approvals.md` document that behavior surface.

Plugin approvals now fail closed on timeout and malformed verdicts; the legacy
`timeoutBehavior` field is still accepted, but ignored. Exec strict semantics
follow-up work must update code, types, docs, tests, and changelog together, and
be explicitly owner/security reviewed. `askFallback` may continue to describe a
pre-gate strategy choice during migration, but it must never turn a timeout on
an already-created pending record into approval.

## 兼容性计划

- 采用增量式 Gateway 协议；不提升协议版本。
- 在外部边界保留现有的 exec/plugin 方法和事件。
- 保留现有 ID，包括 `plugin:` 前缀，但不再将前缀用作类型信息。
- 保留 `/approve` 文本命令行为。
- 将旧的按钮 URL/Web App 字段和 command actions 作为插件 SDK 的兼容性输入；新的核心输出为有类型的数据。
- 在同一次 typed-action 变更中迁移所有内置通道和内部调用方。
- 为新的 URL/page 以及之后的超时行为变更添加一条更新日志。
- 不要添加 elicitation-mode 设置。

## 推进计划

### PR 1：持久化生命周期

- 本设计说明。
- 共享 SQLite schema、Kysely 生成、存储，以及 30 天清理。
- Gateway 审批服务、运行时等待器桥接，以及重启后的孤儿处理。
- 统一的 `approval.get/resolve`。
- Exec/plugin 方法适配器。
- 首个回答获胜、幂等性、过期、授权和消费测试。
- 暂不更改 UI 或 channel 行为。

### PR 2：类型化动作和 channel 回调

- 类型化的审批、URL 和 Web App 动作。
- Core 表现层构建器和 plugin SDK 导出。
- 传输私有的回调编码，带显式 owner kind。
- 用于超出传输限制的规范化 ID 的持久化固定大小回调引用。
- 捆绑 channel 迁移，摆脱 command-text 和 approval-ID 推断。
- 以点击表面上的规范化首个回答为准，并尽力更新活动原生终态；持久化 channel message 终态化将作为后续事项。
- SDK 和捆绑 channel 测试。

### PR 3：Control UI 深链接

- 独立、已认证的审批页面，以及感知 base-path 的启动路由。
- Serving-Gateway 绑定，不修改操作者已保存的远程选择。
- Core 拥有的 approval HTTP 命名空间，包括类似资产的 ID。
- Gateway 生成的 URL payload，以及在生命周期事件上线前保持 pending 状态轮询。
- 手机宽度、重连、竞争回答、重载，以及挂载路径证明。

### PR 4：原生客户端

- iOS 和 Android 审核界面使用具备 kind 感知的 `approval.get/resolve`；watchOS 通过配对的 iPhone 转发对审阅者安全的提示和决策。
- Watch 提供其紧凑中继契约支持的 exec 决策：允许一次和拒绝。
- 规范化的首个回答终态真相取代本地的尝试决策状态。
- 丢失或含糊的 resolve 确认会冻结控件，直到规范化回读完成。
- 之前已发布的 Gateway v4 实例通过窄化的旧方法回退继续保留 exec 审核；保留跨表面的终态状态则需要统一方法。
- 审阅者警告和所有者上下文在 iPhone、Watch 和 Android 上保持可见。
- 原生单元、构建和平台证明。

### PR 5：祖先生命周期传播

- 从 PR 1 中持久化的 audience snapshot 进行 `session.approval` 的 pending/terminal 交付。
- 精确会话订阅、重连回放，以及不修改 transcript 或唤醒 agent 的终态墓碑。
- 生命周期回调在持久化 insert/CAS 之后运行，且永远不会成为审批权威。
- 嵌套 subagent 和重连证明。

### PR 6：失败关闭行为

- 将 `node-invoke-plugin-policy.ts` 和嵌入式 plugin broker 从重复权限中迁移出来。
- 严格的超时、格式错误、无路由、绑定，以及 allow-once 消耗语义。
- 弃用已发布的宽松超时设置，并且在 ask 处于 pending 后不再遵循它们。
- 多表面争用和故障注入证明。

### 后续：持久化远程消息清理

- 持久化转发交付定位器，并在重启后将每条已交付的 channel message 终态化。
- 将此传输生命周期与规范化审批权威和类型化表现动作保持分离。

## 测试

所需的重点覆盖：

- SQLite 重新打开可保留待处理和终态投影。
- 两个并发解析器恰好产生一个 CAS 胜者。
- 相同决策的重试可幂等成功；冲突重试返回已记录的胜者。
- 在截止时间时或之后进行解析不能批准。
- `allow-once` 可恰好消费一次，且不会擦除终态审计状态。
- 启动时取消较旧的运行时 epoch。
- 未授权的查找和解析不会泄露记录是否存在。
- 显式审查者允许名单以及通用的配对 `operator.approvals` 行为。
- Exec 和插件旧版方法共享同一个存储。
- 网关请求/list/get/resolve 模式以及可扩展事件载荷。
- 类型化动作规范化、回退渲染、SDK 导出以及捆绑的通道切换。
- Telegram 回调编码包含传输私有数据，并且不进行命令字符串推断。
- 直接子级、分支控制器/请求者所有者、嵌套所有者、重新分配、会话字段回退、循环以及受众规模上限。
- 请求和终态受众数组完全相同。
- 所有者投影不会导致转录变更或代理唤醒。
- 控制 UI 路由在 `/` 和配置的基础路径下都可工作；刷新会显示待处理或终态真实状态。
- 同时进行的 Control UI 和 Telegram 应答显示一个胜者，输家显示“已在其他地方解决”。
- 原生审批标识符和 Gateway 所有者标识符在路由和协调过程中保留完全一致的 UTF-8 字节。
- 原生 RPC 家族协商会为每个已接纳的 Gateway 路由固定一个规范或旧版家族，并且在使用后绝不会无提示降级。
- 丢失的原生解析确认会冻结操作，直到规范化回读；失败的回读既不能伪造胜者，也不能确认 Watch 刷新。
- Watch 快照请求关联仅对精确配对的 Gateway 所有者和已完成的规范化 iPhone 回读被接受。
- 通过 Testbox/Crabbox 的用户路径证明，包括移动宽度审批页、Telegram 动作清理，以及在 Android、iPhone 和 Watch 之间一次 pending/resolve/late-loser 往返。

## 可观测性

发出结构化、无内容的转换日志，包含审批 ID、类型、源会话键、状态、原因和延迟。绝不要记录预览或原始绑定。

跟踪：

- 按类型统计的请求数量；
- 按类型/状态/原因统计的终态数量；
- 挂起指标；
- 请求到终态的延迟；
- 解析竞态结果：胜出者、幂等重试、冲突、过期；
- 投递路由数量和无路由拒绝；
- 启动时孤儿取消；
- 受众规模。

已提交的转换即使后续事件投递失败也算成功。生命周期订阅者通过 PR 5 重放和规范查找恢复。持久化通道消息终态化仍然是上面单独的后续事项。

## 待决策事项

1. **外部可达的 Control UI 源。** 每个快照都携带稳定的相对 `urlPath`。只有在 Gateway 暴露成功后，才可以从缓存的 Tailscale Serve/Funnel 位置公开绝对 URL；`allowedOrigins`、请求的 Host 头、`gateway.remote.url` 以及仅用于显示的 loopback/LAN 候选都不是规范源。Telegram 可以使用其经过认证的 Mini App 包装器来保留通过 bootstrap 的审批路径。任何反向代理在存在单独审查过的显式公共 URL 协议之前，都只能保持相对路径。绝不要让任何通道去猜测源。
2. **Exec 严格超时兼容切换。** 插件审批超时现在会以失败关闭处理，而 `timeoutBehavior` 已弃用。剩余已发布的 `askFallback` 协议需要明确的负责人/安全审查、更新日志、文档，以及迁移/弃用决策；在挂起的 ask 超时后，它会停止授权执行之前必须完成这些工作。
3. **无 Gateway 的嵌入式模式。** 建议：最初保持仅本地可用，然后在存在 Gateway 时将其作为规范服务的客户端。不要发布服务器无法解析的深度链接。
