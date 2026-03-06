---
summary: "生产计划，用于实现可靠的交互式进程监督（PTY + 非PTY），具备明确的所有权、统一的生命周期和确定性的清理机制"
read_when:
  - 处理 exec/进程生命周期所有权及清理时
  - 调试 PTY 和非PTY 的监督行为时
owner: "openclaw"
status: "进行中"
last_updated: "2026-02-15"
title: "PTY 和进程监督计划"
---

# PTY 和进程监督计划

## 1. 问题与目标

我们需要一个可靠的生命周期管理，用于长期运行命令的执行，覆盖以下方面：

- `exec` 前台运行
- `exec` 后台运行
- `process` 后续操作（`poll`、`log`、`send-keys`、`paste`、`submit`、`kill`、`remove`）
- CLI 代理运行子进程

目标不仅仅是支持 PTY，更是实现可预测的所有权、取消、超时和清理，且不使用不安全的进程匹配启发式规则。

## 2. 范围与界限

- 保持实现内部于 `src/process/supervisor`。
- 不创建新的包。
- 在可行范围内保持当前行为兼容。
- 不拓展到终端重放或 tmux 风格的会话持久化。

## 3. 本分支已实现内容

### 已有的监督器基础

- 监督模块已存在于 `src/process/supervisor/*`。
- Exec 运行时和 CLI 运行器均已通过监督器的生成和等待流程。
- 注册表终结为幂等操作。

### 本次更新完成的内容

1. 明确的 PTY 命令契约

- `SpawnInput` 现为 `src/process/supervisor/types.ts` 中的判别联合类型。
- PTY 运行需使用 `ptyCommand`，不能重用通用的 `argv`。
- 监督器不再通过 `argv` 拼接重建 PTY 命令字符串（见 `src/process/supervisor/supervisor.ts`）。
- Exec 运行时直接传入 `ptyCommand`（见 `src/agents/bash-tools.exec-runtime.ts`）。

2. 进程层类型解耦

- 监督器类型不再从 agents 导入 `SessionStdin`。
- 进程本地标准输入契约定义于 `src/process/supervisor/types.ts`（`ManagedRunStdin`）。
- 适配器仅依赖进程层类型：
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. 进程工具生命周期所有权改进

- `src/agents/bash-tools.process.ts` 请求取消时先通过监督器。
- `process kill/remove` 当监督器查询失败时使用进程树回退终止。
- `remove` 保持确定性移除行为，在请求终止后立即丢弃运行中的会话条目。

4. 单一来源的 watchdog 默认值

- 新增共享默认值文件 `src/agents/cli-watchdog-defaults.ts`。
- `src/agents/cli-backends.ts` 及 `src/agents/cli-runner/reliability.ts` 使用该共享默认。

5. 删除无用辅助函数

- 移除 `src/agents/bash-tools.shared.ts` 中未使用的 `killSession` 辅助路径。

6. 增加直接监督路径测试

- 新增 `src/agents/bash-tools.process.supervisor.test.ts` 以测试通过监督器取消的杀进程和移除流程。

7. 可靠性缺口修复完成

- `src/agents/bash-tools.process.ts` 在监督器查无记录时回退到真实的操作系统级进程终止。
- `src/process/supervisor/adapters/child.ts` 对默认取消/超时杀死路径使用进程树终止语义。
- 新增共享进程树工具 `src/process/kill-tree.ts`。

8. PTY 合同边缘案例覆盖

- 新增 `src/process/supervisor/supervisor.pty-command.test.ts`，测试逐字 PTY 命令转发及空命令拒绝。
- 新增 `src/process/supervisor/adapters/child.test.ts`，测试 child 适配器取消时的进程树杀死行为。

## 4. 剩余缺口与决策

### 可靠性状态

本次更新关闭了两个关键的可靠性缺口：

- `process kill/remove` 在监督器查无时有真实操作系统终止回退。
- child 取消/超时使用进程树杀死作为默认路径。
- 二者均有回归测试支持。

### 持久性与启动时协调

重启行为明确为仅限于内存生命周期：

- `reconcileOrphans()` 设计为 `src/process/supervisor/supervisor.ts` 中的空操作。
- 活跃运行不在进程重启后恢复。
- 此边界条件为目前实现的有意设定，避免了部分持久化风险。

### 可维护性后续工作

1. `src/agents/bash-tools.exec-runtime.ts` 中的 `runExecProcess` 仍承担多项职能，后续可拆分为更聚焦的辅助函数。

## 5. 实施计划

必需的可靠性与契约项的实现已完成：

已完成：

- `process kill/remove` 的真实终止回退
- child 适配器默认杀死路径的进程树取消
- 回归测试覆盖回退杀死和 child 适配器杀死路径
- 明确的 `ptyCommand` 下的 PTY 命令边缘案例测试
- 明确的内存重启边界，`reconcileOrphans()` 设计为空操作

可选后续：

- 将 `runExecProcess` 拆分为聚焦助手实现，保持行为不变。

## 6. 文件映射

### 进程监督器

- `src/process/supervisor/types.ts` 更新，引入判别的 spawn 输入和进程本地 stdin 契约。
- `src/process/supervisor/supervisor.ts` 更新，使用明确的 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 和 `src/process/supervisor/adapters/pty.ts` 从 agent 类型解耦。
- `src/process/supervisor/registry.ts` 继续保持幂等终结，未做变更。

### Exec 与进程集成

- `src/agents/bash-tools.exec-runtime.ts` 更新，明确传递 PTY 命令并保留回退路径。
- `src/agents/bash-tools.process.ts` 更新，取消通过监督器请求，失败时回退进程树终止。
- `src/agents/bash-tools.shared.ts` 移除直接杀死辅助路径。

### CLI 可靠性

- 新增共享基线 `src/agents/cli-watchdog-defaults.ts`。
- `src/agents/cli-backends.ts` 和 `src/agents/cli-runner/reliability.ts` 共享同一默认配置。

## 7. 本次更新的验证运行

单元测试：

- `pnpm vitest src/process/supervisor/registry.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.pty-command.test.ts`
- `pnpm vitest src/process/supervisor/adapters/child.test.ts`
- `pnpm vitest src/agents/cli-backends.test.ts`
- `pnpm vitest src/agents/bash-tools.exec.pty-cleanup.test.ts`
- `pnpm vitest src/agents/bash-tools.process.poll-timeout.test.ts`
- `pnpm vitest src/agents/bash-tools.process.supervisor.test.ts`
- `pnpm vitest src/process/exec.test.ts`

端到端测试目标：

- `pnpm vitest src/agents/cli-runner.test.ts`
- `pnpm vitest run src/agents/bash-tools.exec.pty-fallback.test.ts src/agents/bash-tools.exec.background-abort.test.ts src/agents/bash-tools.process.send-keys.test.ts`

类型检查说明：

- 使用 `pnpm build`（以及 `pnpm check` 进行完整的 lint 和文档门控）完成类型检查。
- 旧提示中提及的 `pnpm tsgo` 已过时。

## 8. 保持的操作保证

- Exec 环境硬化行为不变。
- 审批和允许列表流程不变。
- 输出消毒及输出上限不变。
- PTY 适配器仍保证在强制杀死时等待结算及监听器卸载。

## 9. 完成定义

1. 监督器为托管运行的生命周期所有者。
2. PTY 启动使用明确命令契约，无 argv 重建。
3. 进程层类型不再依赖 agent 层的监督器 stdin 契约。
4. Watchdog 默认值为单一来源。
5. 相关单元及端到端测试全部通过。
6. 重启持久性边界有明确文档说明或完全实现。

## 10. 总结

本分支已形成清晰且更安全的监督结构：

- 明确的 PTY 命令契约
- 更清晰的进程层分离
- 监督器驱动的取消路径用于进程操作
- 监督器查无时的真实终止回退
- child 运行默认杀死路径的进程树取消
- 统一的 watchdog 默认值
- 明确的内存内重启边界（本次更新不涉及重启间孤儿进程的协调）
