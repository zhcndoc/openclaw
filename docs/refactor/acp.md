---
summary: "用于使 ACP 会话和 ACPX 进程所有权显式化的迁移计划"
read_when:
  - 重构 ACP 会话生命周期或 ACPX 进程清理
  - 调试 ACPX 孤儿进程、PID 重用或多网关清理安全性
  - 更改为已生成的 ACP 或子代理会话设置 sessions_list 可见性
  - 为后台任务、ACP 会话或进程租约设计所有权元数据
title: "ACP 生命周期重构"
sidebarTitle: "ACP 生命周期重构"
---

ACP 生命周期当前可以正常工作，但其中太多内容都是事后推断出来的。进程清理通过 PID、命令字符串、包装器路径和实时进程表来重建所有权。会话可见性通过 session-key 字符串以及次级的 `sessions.list({ spawnedBy })` 查找来重建所有权。这使得局部修复成为可能，但也让边缘情况很容易被遗漏：PID 重用、带引号的命令、适配器的孙进程、多网关状态根、`cancel` 与 `close` 的区别，以及 `tree` 与 `all` 的可见性，都会变成各自独立、需要重新发现同一套所有权规则的地方。

这次重构将把所有权提升为一等公民。目标不是新的 ACP 产品表面；而是为现有 ACP 和 ACPX 行为提供更安全的内部契约。

## 目标

- 只有当当前实时证据与 OpenClaw 拥有的租约匹配时，清理才会向进程发出信号。
- `cancel`、`close` 和启动时回收具有不同的生命周期意图。
- `sessions_list`、`sessions_history`、`sessions_send` 和状态检查使用相同的请求者拥有的会话模型。
- 多网关安装不能回收彼此的 ACPX 包装器。
- 旧的 ACPX 会话记录在迁移期间继续可用。
- 运行时仍然由插件拥有；core 不需要了解 ACPX 包的细节。

## 非目标

- 替换 ACPX 或更改公共 `/acp` 命令表面。
- 将供应商特定的 ACP 适配器行为移入 core。
- 要求用户在升级前手动清理状态。
- 让 `cancel` 关闭可复用的 ACP 会话。

## 目标模型

### 网关实例身份

每个 Gateway 进程都应拥有一个稳定的运行时实例 id：

```ts
type GatewayInstanceId = string;
```

它可以在 Gateway 启动时生成，并在该安装的生命周期内持久化到状态中。它不是安全机密；它是一个所有权区分器，用于避免将一个 Gateway 的 ACP 进程与另一个 Gateway 的 ACP 进程混淆。

### ACP 会话所有权

每个已生成的 ACP 会话都应具备规范化的所有权元数据：

```ts
type AcpSessionOwner = {
  sessionKey: string;
  spawnedBy?: string;
  parentSessionKey?: string;
  ownerSessionKey: string;
  agentId: string;
  backend: "acpx";
  gatewayInstanceId: GatewayInstanceId;
  createdAt: number;
};
```

Gateway 应在已知的会话行上返回这些字段。可见性过滤应当是对行元数据的纯检查：

```ts
canSeeSessionRow({
  row,
  requesterSessionKey,
  visibility,
  a2aPolicy,
});
```

这会移除可见性检查中隐藏的二次 `sessions.list({ spawnedBy })` 调用。一个已生成的跨代理 ACP 子会话之所以对请求者可见，是因为行数据说明它属于请求者，而不是因为第二次查询碰巧找到了它。

### ACPX 进程租约

每次生成的包装器启动都应创建一条租约记录：

```ts
type AcpxProcessLease = {
  leaseId: string;
  gatewayInstanceId: GatewayInstanceId;
  sessionKey: string;
  wrapperRoot: string;
  wrapperPath: string;
  rootPid: number;
  processGroupId?: number;
  commandHash: string;
  startedAt: number;
  state: "open" | "closing" | "closed" | "lost";
};
```

包装器进程应在其环境中接收租约 id 和网关实例 id：

```sh
OPENCLAW_ACPX_LEASE_ID=...
OPENCLAW_GATEWAY_INSTANCE_ID=...
```

在平台允许时，验证应优先使用不会因命令引号而混淆的实时进程元数据：

- 根 PID 仍然存在
- 实时包装器路径位于 `wrapperRoot` 下
- 在可用时，进程组与租约匹配
- 如果可读取，环境中包含预期的租约 id
- 命令哈希或可执行文件路径与租约匹配

如果无法验证实时进程，清理应失败并关闭。

## 生命周期控制器

引入一个负责进程租约和清理策略的 ACPX 生命周期控制器：

```ts
interface AcpxLifecycleController {
  ensureSession(input: AcpRuntimeEnsureInput): Promise<AcpRuntimeHandle>;
  cancelTurn(handle: AcpRuntimeHandle): Promise<void>;
  closeSession(input: {
    handle: AcpRuntimeHandle;
    discardPersistentState?: boolean;
    reason?: string;
  }): Promise<void>;
  reapStartupOrphans(): Promise<void>;
  verifyOwnedTree(lease: AcpxProcessLease): Promise<OwnedProcessTree | null>;
}
```

`cancelTurn` 只请求取消当前轮次。它不能回收可复用的包装器或适配器进程。

`closeSession` 允许回收，但前提是先加载会话记录、加载租约，并验证实时进程树仍然属于该租约。

`reapStartupOrphans` 从状态中的开放租约开始。它可以使用进程表来查找后代进程，但不应先扫描任意看起来像 ACP 的命令，然后再判断它们大概是不是我们的。

## 包装器契约

生成的包装器应保持精简。它们应该：

- 在受支持的平台上以进程组方式启动适配器
- 将正常终止信号转发给进程组
- 检测父进程死亡
- 在父进程死亡时发送 SIGTERM，然后保持包装器存活，直到 SIGKILL 兜底机制执行
- 在可用时，将根 PID 和进程组 id 回传给生命周期控制器

包装器不应决定会话策略。它们只为自己的适配器组执行本地进程树清理。

## 会话可见性契约

可见性应使用规范化的行所有权：

```ts
type SessionVisibilityInput = {
  requesterSessionKey: string;
  row: {
    key: string;
    agentId: string;
    ownerSessionKey?: string;
    spawnedBy?: string;
    parentSessionKey?: string;
  };
  visibility: "self" | "tree" | "agent" | "all";
  a2aPolicy: AgentToAgentPolicy;
};
```

规则：

- `self`：仅请求者会话。
- `tree`：请求者会话，以及由请求者拥有或从请求者派生的行。
- `all`：所有同代理行、允许 a2a 的跨代理行，以及请求者拥有的已生成跨代理行，即使全局 a2a 被禁用。
- `agent`：仅同代理，除非显式的所有权关系表明该行属于请求者。

这使得 `tree` 和 `all` 具有单调性：`all` 不能隐藏 `tree` 能显示的受拥有子项。

## 迁移计划

### 阶段 1：添加身份和租约

- 在 Gateway 状态中添加 `gatewayInstanceId`。
- 在 ACPX 状态目录下添加一个 ACPX 租约存储。
- 在生成包装器之前写入租约。
- 在新的 ACPX 会话记录中存储 `leaseId`。
- 为旧记录保留现有的 PID 和命令字段。

### 阶段 2：先租约后清理

- 将关闭清理改为首先加载 `leaseId`。
- 在发出信号之前，根据租约验证实时进程所有权。
- 仅对旧记录保留当前的根 PID 和 wrapper-root 兜底。
- 在验证清理后将租约标记为 `closed`。
- 当进程在清理前已消失时，将租约标记为 `lost`。

### 阶段 3：先租约后启动回收

- 启动回收扫描开放租约。
- 对每个租约，验证根进程并收集后代。
- 以自下而上的顺序回收已验证的进程树。
- 以有界保留窗口过期旧的 `closed` 和 `lost` 租约。
- 仅将命令标记扫描作为临时的旧版兜底，并在可能时由包装器根和 Gateway 实例进行保护。

### 阶段 4：会话所有权行

- 向 Gateway 会话行添加所有权元数据。
- 让 ACPX、子代理、后台任务和会话存储写入器填充 `ownerSessionKey` 或 `spawnedBy`。
- 将会话可见性检查改为使用行元数据。
- 移除可见性阶段的二次 `sessions.list({ spawnedBy })` 查找。

### 阶段 5：移除旧的启发式方法

在一个发布周期后：

- 停止在非旧版 ACPX 清理中依赖存储的根命令字符串
- 移除命令标记启动扫描
- 移除可见性兜底列表查找
- 对缺失或无法验证的租约保留防御性的失败并关闭行为

## 测试

添加两个表驱动测试套件。

进程生命周期模拟器：

- PID 被无关进程重用
- PID 被另一个 Gateway 的包装器根重用
- 存储的包装器命令经过 shell 转义，而实时 `ps` 命令没有
- 适配器子进程退出，孙进程仍留在进程组中
- 父进程死亡时 SIGTERM 兜底最终到达 SIGKILL
- 进程列表不可用
- 缺少进程的过期租约
- 启动时的孤儿进程，包含包装器、适配器子进程和孙进程

会话可见性矩阵：

- `self`、`tree`、`agent`、`all`
- a2a 启用和禁用
- 同代理行
- 跨代理行
- 请求者拥有的已生成跨代理 ACP 行
- 沙箱化请求者被限制为 `tree`
- list、history、send 和 status 操作

重要的不变量：请求者拥有的已生成子项，在配置的可见性包含请求者会话树时应当可见，而且 `all` 的能力不能低于 `tree`。

## 兼容性说明

旧的会话记录可能没有 `leaseId`。它们应使用旧的失败并关闭清理路径：

- 要求一个实时根进程
- 如果预期存在已生成包装器，则要求 wrapper-root 所有权
- 对非包装器根要求命令一致
- 绝不只根据过时的存储 PID 元数据来发信号

如果某条旧记录无法验证，就不要处理它。启动时的租约清理和下一个发布周期最终应当淘汰这个兜底方案。

## 成功标准

- 关闭旧的或过期的 ACPX 会话不会杀死另一个 Gateway 的进程。
- 父进程死亡不会留下顽固运行的适配器孙进程。
- `cancel` 在不关闭可复用会话的情况下中止当前轮次。
- `sessions_list` 在 `tree` 和 `all` 下都能显示请求者拥有的跨代理 ACP 子会话。
- 启动清理由租约驱动，而不是由广泛的命令字符串扫描驱动。
- 聚焦的进程和可见性矩阵测试覆盖了此前需要一次性审查修复的所有边缘情况。
