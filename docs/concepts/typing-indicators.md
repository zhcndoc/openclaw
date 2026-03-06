---
summary: "OpenClaw 何时显示输入指示器及如何调整它们"
read_when:
  - 更改输入指示器行为或默认设置时
title: "输入指示器"
---

# 输入指示器

当运行处于活动状态时，输入指示器会发送到聊天频道。使用
`agents.defaults.typingMode` 来控制 **何时** 开始输入，使用 `typingIntervalSeconds`
来控制 **多久** 刷新一次。

## 默认设置

当 `agents.defaults.typingMode` **未设置** 时，OpenClaw 保持以下传统行为：

- **私聊**：模型循环开始时立即显示输入。
- **群聊且被提及时**：立即显示输入。
- **群聊且未被提及时**：仅当消息文本开始流式传输时显示输入。
- **心跳运行**：禁用输入指示。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` — 永不显示输入指示。
- `instant` — **模型循环开始时立即** 显示输入，即使运行最终只返回静默回复令牌。
- `thinking` — 在 **首次推理增量** 时开始显示输入（运行需配置 `reasoningLevel: "stream"`）。
- `message` — 在 **首次非静默文本增量** 时开始显示输入（忽略 `NO_REPLY` 静默令牌）。

触发时序顺序：
`never` → `message` → `thinking` → `instant`

## 配置

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

你可以为每个会话单独覆盖模式或刷新间隔：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 说明

- `message` 模式不会为仅静默回复显示输入（例如用于抑制输出的 `NO_REPLY` 令牌）。
- `thinking` 模式仅在运行流式传输推理（`reasoningLevel: "stream"`）时触发。
  如果模型不发出推理增量，则不会开始输入指示。
- 心跳运行无论模式如何都不会显示输入。
- `typingIntervalSeconds` 控制的是 **刷新频率**，而非开始时间。
  默认值为 6 秒。
