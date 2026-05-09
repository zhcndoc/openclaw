---
summary: "菜单栏状态逻辑以及向用户展示的内容"
read_when:
  - 调整 mac 菜单 UI 或状态逻辑时
title: "菜单栏"
---

## 显示内容

- 我们会在菜单栏图标以及菜单的第一行状态中展示当前 agent 的工作状态。
- 工作进行时会隐藏健康状态；当所有会话都处于空闲状态时，健康状态会重新显示。
- 根级 "Context" 子菜单包含最近会话，而不是在根菜单中直接展开它们。
- 根菜单中的 "Nodes" 区块只列出 **devices**（通过 `node.list` 绑定的节点），不包含 client/presence 条目。
- 当可用 provider usage 快照时，根级 "Usage" 区块会出现在 Context 下方；如果有 usage-cost 详情，则会继续显示在其后。

## 状态模型

- Sessions：事件载荷中包含 `runId`（每次运行一个）以及 `sessionKey`。"main" 会话的 key 为 `main`；如果不存在，则回退到最近更新的会话。
- 优先级：main 永远优先。如果 main 处于 active，其状态会立即显示。如果 main 处于 idle，则显示最近活跃的非 main 会话。我们不会在活动中途来回切换；只有当当前会话进入 idle 或 main 变为 active 时才会切换。
- Activity kinds:
  - `job`: 高层命令执行（`state: started|streaming|done|error`）。
  - `tool`: `phase: start|result`，包含 `toolName` 和 `meta/args`。

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

- `idle`: normal critter.
- `workingMain`: 带 glyph 的徽标、完整色调、腿部 "working" 动画。
- `workingOther`: 带 glyph 的徽标、弱化色调、无 scurry。
- `overridden`: 无论活动状态如何，都使用所选的 glyph/tint。

## Context 子菜单

- 根菜单显示一行 "Context"，带有会话数量/状态，并打开一个子菜单。
- Context 子菜单标题显示最近 24 小时内的活跃会话数量。
- 每个会话行都会保留 token bar、age、preview、thinking/verbose、reset、compact 和 delete 操作。
- Loading、disconnected 和 session-load error 消息会显示在 Context 子菜单内。
- Provider usage 和 usage-cost 详情保持在根级、位于 Context 下方，以便无需打开子菜单也能一眼看到。

## 状态行文本（菜单）

- 当工作进行时：`<Session role> · <activity label>`
  - 示例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 空闲时：回退到健康摘要。

## 事件接入

- Source: control-channel `agent` events（`ControlChannel.handleAgentEvent`）。
- Parsed fields:
  - `stream: "job"` with `data.state` 用于 start/stop。
  - `stream: "tool"` with `data.phase`, `name`, optional `meta`/`args`。
- Labels:
  - `exec`: `args.command` 的第一行。
  - `read`/`write`: 缩短后的路径。
  - `edit`: 路径以及从 `meta`/diff 计数推断出的变更类型。
  - fallback: 工具名称。

## 调试覆盖

- Settings ▸ Debug ▸ "Icon override" picker:
  - `System (auto)`（默认）
  - `Working: main`（按 tool kind）
  - `Working: other`（按 tool kind）
  - `Idle`
- 通过 `@AppStorage("iconOverride")` 存储；映射到 `IconState.overridden`。

## 测试清单

- Trigger main session job: verify icon switches immediately and status row shows main label.
- Trigger non-main session job while main idle: icon/status shows non-main; stays stable until it finishes.
- Start main while other active: icon flips to main instantly.
- Rapid tool bursts: ensure badge does not flicker (TTL grace on tool results).
- Health row reappears once all sessions idle.

## 相关

- [macOS app](/platforms/macos)
- [Menu bar icon](/platforms/macos/icon)
