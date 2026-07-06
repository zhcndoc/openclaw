---
summary: "菜单栏状态逻辑以及向用户展示的内容"
read_when:
  - 调整 mac 菜单 UI 或状态逻辑时
title: "菜单栏"
---

## 显示内容

- 当前代理工作状态会显示在菜单栏图标中以及菜单的第一行状态中。
- 当工作处于活跃状态时，健康状态会被隐藏；当所有会话都处于空闲状态时，它会重新显示。
- 根级“Context”项会打开一个包含最近会话的子菜单，而不是在根菜单中展开它们。
- 根菜单中的“Nodes”块仅列出已配对的**设备**（来自 `node.list`），不包含客户端/在线状态条目。
- 当可用提供方使用情况快照时，根级“Usage”部分会显示在 Context 下方；如有可用的成本详情，则会紧随其后显示。

## 状态模型

- 来源：`WorkActivityStore`（`apps/macos/Sources/OpenClaw/WorkActivityStore.swift`）。
- 事件作为带有 `runId` 的 `ControlAgentEvent` 到达；处理器（`ControlChannel.routeWorkActivity`）从事件负载中读取 `sessionKey`，如果没有则默认使用 `"main"`。
- 优先级：主会话（默认 `sessionKey == "main"`）始终优先。如果主会话处于活动状态，会立即显示其状态。如果主会话处于空闲状态，则改为显示最近活跃的非主会话。存储不会在活动过程中切换；它只会在当前会话变为空闲或主会话变为活动时切换。
- 活动类型：
  - `job`：高层命令执行（`state: started|streaming|done|error|...`）。
  - `tool`：`phase: start|result`，包含 `name`，以及可选的 `meta`/`args`。

## IconState 枚举（Swift）

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（调试覆盖）

### ActivityKind -> 徽标符号

`ActivityKind` 封装了一个 `ToolKind`（`bash`、`read`、`write`、`edit`、`attach`、`other`）或一个裸 `job`。每种都会映射为绘制在小动物图标上的一个 SF Symbol 徽标（`IconState.badgeSymbolName`）：

| Kind            | Symbol                             |
| --------------- | ---------------------------------- |
| `bash`          | `chevron.left.slash.chevron.right` |
| `read`          | `doc`                              |
| `write`         | `pencil`                           |
| `edit`          | `pencil.tip`                       |
| `attach`        | `paperclip`                        |
| `other` / `job` | `gearshape.fill`                   |

### 视觉映射

- `idle`：普通小动物，无徽标。
- `workingMain`：带符号的徽标，完整色调（`.primary` prominence），腿部“工作中”动画。
- `workingOther`：带符号的徽标，弱化色调（`.secondary` prominence），不奔跑。
- `overridden`：无论真实活动如何，都使用所选符号/色调。

## Context 子菜单

- 根菜单显示一行“Context”，带有会话数量/状态；点击后会打开一个子菜单（`MenuSessionsInjector`）。
- 子菜单标题显示过去 24 小时内的活跃会话数量。
- 每个会话行都保留其 token 条、时长、预览、thinking/verbose 切换、重置、压缩和删除操作。
- 加载中、断开连接以及会话加载错误消息会显示在 Context 子菜单内。
- Usage 和 cost 部分仍然保留在 Context 下方的根级别，这样无需打开子菜单也能一眼查看。

## 状态行文本（菜单）

- 当工作处于激活状态时：`<Session role> · <activity label>`（`MenuContentView` 中的 `"\(roleLabel) · \(activity.label)"`），其中角色标签为 `Main` 或 `Other`。
- 当处于空闲状态时：回退到健康摘要。

## 事件接入

- 来源：control-channel 的 `agent` 事件，通过 `ControlChannel.routeWorkActivity(from:)` 路由。
- 解析字段：
  - `stream: "job"`，使用 `data.state` 表示开始/停止。
  - `stream: "tool"`，使用 `data.phase`、`data.name`，以及可选的 `data.meta`/`data.args`。
- 工具标签来自 `ToolDisplayRegistry.resolve(name:args:meta:)`；无法解析的名称将回退为原始工具名。

## 调试覆盖

- 设置 > 调试 > “图标覆盖” 选择器：
  - `系统（自动）`（默认）
  - `工作中：main` / `工作中：other`（按工具类型：bash、read、write、edit、other）
  - `空闲`
- 存储在 `UserDefaults` 键 `openclaw.iconOverride` 下；映射到 `IconState.overridden`。

## 测试清单

- 触发主会话任务：图标立即切换，状态行显示主标签。
- 在主会话空闲时触发非主会话任务：图标/状态显示非主会话；在其完成前保持稳定。
- 当另一个会话处于活动状态时启动主会话：图标会立即切换到主会话。
- 快速工具突发：徽标不会闪烁（在清除已完成工具前有 2 秒宽限窗口，`WorkActivityStore.toolResultGrace`）。
- 当所有会话都空闲后，健康状态行会重新出现。

## 相关

- [macOS 应用](/platforms/macos)
- [菜单栏图标](/platforms/macos/icon)
