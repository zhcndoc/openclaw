---
summary: "菜单栏状态逻辑及向用户展示的内容"
read_when:
  - 调整 Mac 菜单 UI 或状态逻辑时
title: "菜单栏"
---

# 菜单栏状态逻辑

## 显示内容

- 我们在菜单栏图标和菜单的第一状态行展示当前代理的工作状态。
- 当工作处于活动状态时，健康状态被隐藏；所有会话空闲后，健康状态重新显示。
- 菜单中的“节点”块仅列出**设备**（通过 `node.list` 配对的节点），不显示客户端/存在条目。
- 当提供者使用快照可用时，Context 下会出现“使用情况”部分。

## 状态模型

- 会话：事件携带 `runId`（每次运行）和载荷中的 `sessionKey`。 “主”会话键为 `main`；若缺失，则回退到最近更新的会话。
- 优先级：主会话始终优先。如果主会话处于活跃状态，立即显示其状态。主会话空闲时，显示最近活跃的非主会话。活动中不切换状态，仅在当前会话空闲或主会话变为活跃时切换。
- 活动类型：
  - `job`：高层命令执行（`state: started|streaming|done|error`）。
  - `tool`：`phase: start|result` 并携带 `toolName` 和 `meta/args`。

## IconState 枚举（Swift）

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（调试覆盖）

### ActivityKind → 图标

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- 默认 → 🛠️

### 视觉映射

- `idle`：普通小生物图标。
- `workingMain`：带图标的徽章，完全着色，腿部带“工作”动画。
- `workingOther`：带图标的徽章，阴影色调，无奔跑动画。
- `overridden`：无视活动状态使用选定图标/色调。

## 状态栏文本（菜单）

- 工作时：`<Session 角色> · <活动标签>`
  - 示例：`Main · exec: pnpm test`，`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 空闲时：显示健康摘要内容。

## 事件摄取

- 来源：控制通道的 `agent` 事件（`ControlChannel.handleAgentEvent`）。
- 解析字段：
  - `stream: "job"`，携带用于开始/停止的 `data.state`。
  - `stream: "tool"`，携带 `data.phase`、`name`，可选 `meta`/`args`。
- 标签：
  - `exec`：使用 `args.command` 的第一行。
  - `read`/`write`：精简路径。
  - `edit`：路径加上从 `meta`/差异计数推断的更改类型。
  - 回退使用工具名称。

## 调试覆盖

- 设置 ▸ 调试 ▸ “图标覆盖”选择器：
  - `System (auto)`（默认）
  - `Working: main`（按工具类型）
  - `Working: other`（按工具类型）
  - `Idle`
- 通过 `@AppStorage("iconOverride")` 存储；映射到 `IconState.overridden`。

## 测试清单

- 触发主会话任务：验证图标立即切换，状态栏显示主标签。
- 主会话空闲时触发非主任务：图标/状态显示非主；保持稳定直到结束。
- 主会话启动时若其他会话活跃：图标立即切换至主。
- 快速工具爆发：确保徽章不闪烁（工具结果有 TTL 宽限）。
- 所有会话空闲后，健康行重新出现。
