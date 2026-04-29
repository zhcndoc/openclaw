---
summary: "菜单栏状态逻辑以及向用户展示的内容"
read_when:
  - 调整 mac 菜单 UI 或状态逻辑时
title: "菜单栏"
---

# 菜单栏状态逻辑

## 显示内容

- 我们会在菜单栏图标以及菜单的第一行状态中展示当前代理的工作状态。
- 当有工作进行时，健康状态会被隐藏；当所有会话都处于空闲时，它会重新显示。
- 菜单中的 “Nodes” 区块只列出**设备**（通过 `node.list` 配对的节点），不包括客户端/存在状态条目。
- 当可用提供方使用情况快照时，Context 下会显示一个 “Usage” 部分。

## 状态模型

- 会话：事件会携带 `runId`（每次运行的）以及载荷中的 `sessionKey`。 “main” 会话的键为 `main`；如果缺失，则回退到最近更新的会话。
- 优先级：main 始终优先。如果 main 处于活动状态，会立即显示其状态。如果 main 处于空闲，则显示最近活跃的非 main 会话。我们不会在活动过程中来回切换；只有当当前会话变为空闲，或者 main 变为活动时才会切换。
- 活动类型：
  - `job`：高层级命令执行（`state: started|streaming|done|error`）。
  - `tool`：`phase: start|result`，并带有 `toolName` 和 `meta/args`。

## IconState 枚举（Swift）

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（调试覆盖）

### ActivityKind → glyph

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- default → 🛠️

### 视觉映射

- `idle`：正常小动物。
- `workingMain`：带 glyph 的徽章、完整色调、腿部“工作中”动画。
- `workingOther`：带 glyph 的徽章、柔和色调、不快速跑动。
- `overridden`：无论活动如何，均使用所选 glyph/色调。

## 状态行文本（菜单）

- 当工作进行时：`<Session role> · <activity label>`
  - 示例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 空闲时：回退到健康摘要。

## 事件接入

- 来源：控制通道 `agent` 事件（`ControlChannel.handleAgentEvent`）。
- 解析字段：
  - `stream: "job"`，使用 `data.state` 表示开始/停止。
  - `stream: "tool"`，使用 `data.phase`、`name`，以及可选的 `meta`/`args`。
- 标签：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：缩短后的路径。
  - `edit`：路径加上从 `meta`/diff 数量推断出的变更类型。
  - fallback：工具名称。

## 调试覆盖

- 设置 ▸ 调试 ▸ “Icon override” 选择器：
  - `System (auto)`（默认）
  - `Working: main`（按工具类型）
  - `Working: other`（按工具类型）
  - `Idle`
- 通过 `@AppStorage("iconOverride")` 存储；映射到 `IconState.overridden`。

## 测试清单

- 触发 main 会话作业：验证图标立即切换，状态行显示 main 标签。
- 在 main 空闲时触发非 main 会话作业：图标/状态显示非 main；在完成前保持稳定。
- 当其他会话活跃时启动 main：图标立即切换到 main。
- 快速的工具突发：确保徽章不会闪烁（tool 结果上有 TTL 宽限）。
- 当所有会话都空闲后，健康行重新出现。

## 相关

- [macOS app](/platforms/macos)
- [Menu bar icon](/platforms/mac/icon)
