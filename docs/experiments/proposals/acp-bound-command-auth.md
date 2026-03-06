---
summary: "提案：面向 ACP 绑定对话的长期命令授权模型"
read_when:
  - 在设计 Telegram/Discord ACP 绑定频道/主题中本地命令授权行为时
title: "ACP 绑定命令授权（提案）"
---

# ACP 绑定命令授权（提案）

状态：已提议，**尚未实现**。

本文档描述了 ACP 绑定对话中本地命令的长期授权模型。这是一个实验性提案，不替代当前生产环境的行为。

已实现的行为请查阅以下源码和测试：

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## 问题

目前我们有针对特定命令的检查（例如 `/new` 和 `/reset`），即使 allowlist 为空，也需要在 ACP 绑定的频道/主题内生效。这缓解了当前的用户体验痛点，但基于命令名的特殊处理不可扩展。

## 长期方案

将命令授权从临时处理逻辑移至命令元数据和共享策略评估器。

### 1) 在命令定义中添加授权策略元数据

每个命令定义应声明一个授权策略。示例形式：

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // 默认，当前严格行为
  | { mode: "bound_acp_or_owner_or_allowlist" } // 允许明确绑定的 ACP 对话中使用
  | { mode: "owner_only" };
```

`/new` 和 `/reset` 会使用 `bound_acp_or_owner_or_allowlist`。
大多数其他命令将保持为 `owner_or_allowlist`。

### 2) 各频道共享一个评估器

引入一个辅助函数，使用以下信息评估命令授权：

- 命令策略元数据
- 发送者授权状态
- 已解析的对话绑定状态

Telegram 和 Discord 的本地处理器应调用同一辅助函数，避免行为差异。

### 3) 以绑定匹配作为绕过边界

当策略允许绑定 ACP 绕过时，仅在当前对话解析出配置的绑定匹配时授权（而不仅仅是当前会话密钥看起来像 ACP）。

这保持边界明确，最大限度减少意外扩大。

## 优点

- 可扩展至未来命令，无需添加更多基于命令名的条件判断。
- 保持各频道行为一致。
- 通过要求显式绑定匹配，保持当前安全模型。
- 保持 allowlist 作为可选加固措施，而非普遍要求。

## 推出计划（未来）

1. 在命令注册类型和命令数据中添加命令授权策略字段。
2. 实现共享评估器并迁移 Telegram 与 Discord 本地处理器。
3. 将 `/new` 和 `/reset` 迁移至基于元数据的策略。
4. 针对策略模式和频道界面添加测试。

## 非目标

- 本提案不改变 ACP 会话生命周期行为。
- 本提案不要求所有 ACP 绑定命令必须有 allowlist。
- 本提案不更改现有路由绑定语义。

## 备注

本提案有意为增量改进，不删除或替换已有实验文档。
