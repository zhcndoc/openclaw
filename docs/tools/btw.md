---
summary: "使用 /btw 的临时旁路问题"
read_when:
  - 你想就当前会话快速提出一个旁路问题
  - 你正在跨客户端实现或调试 BTW 行为
title: "BTW 旁路问题"
---

`/btw` 让你可以就 **当前会话** 提出一个快速的旁路问题，而不会
把这个问题变成正常的对话历史。`/side` 是它的别名。

它的设计灵感来自 Claude Code 的 `/btw` 行为，但已适配 OpenClaw 的
Gateway 和多通道架构。

## 它的作用

当你发送：

```text
/btw what changed?
```

OpenClaw 会：

1. 快照当前会话上下文，
2. 运行一个单独的临时旁路查询，
3. 只回答旁路问题，
4. 保持主运行不受影响，
5. 不会将 BTW 问题或答案写入会话历史，
6. 以 **实时旁路结果** 的形式输出答案，而不是普通的助手消息。

重要的心智模型是：

- 相同的会话上下文
- 单独的一次性旁路查询
- 当会话使用原生 harness 时，使用相同的原生 harness 传输
- 不污染未来上下文
- 不持久化转录内容

对于 Codex harness 会话，BTW 会通过将活动 app-server 线程分叉为一个临时的侧线程，始终留在 Codex 内部。这样既保持了 Codex OAuth 和原生线程行为不变，又能将侧边答案与父级转录隔离开来。类似 Codex `/side`，侧线程会保留当前的 Codex 权限和原生工具面，并带有一些护栏，提示模型不要把继承自父线程的工作当作当前生效的指令。

对于 CLI 运行时别名，BTW 会使用所属的 CLI 后端以旁路问题模式执行，而不是回退到直接的 provider 调用。OpenClaw 会把经过净化的对话上下文注入到一次全新的 CLI 单次调用中，为该调用禁用 OpenClaw MCP 工具捆绑和可复用的 CLI 会话状态，并允许后端添加其支持的任何 CLI 原生 no-resume 或 no-tools 标志。直接的非 CLI 运行时仍然保留直接的一次性路径。

## 它不做什么

`/btw` **不会**：

- 创建一个新的持久会话，
- 继续未完成的主任务，
- 将 BTW 问题/答案数据写入转录历史，
- 出现在 `chat.history` 中，
- 在重新加载后保留。

它是刻意设计成 **临时的**。

## 上下文如何工作

BTW 只把当前会话作为 **背景上下文** 使用。

如果主运行当前处于活动状态，OpenClaw 会快照当前消息状态，
并将正在进行中的主提示词作为背景上下文包含进去，同时明确告诉模型：

- 只回答旁路问题，
- 不要恢复或完成未完成的主任务，
- 不要引导父级对话。

这样，BTW 就能在保持与主运行隔离的同时，仍然感知当前会话的主题。

## 传递模型

BTW **不会** 作为普通的助手转录消息来传递。

在 Gateway 协议层面：

- 普通助手聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

这种区分是有意为之。如果 BTW 复用了普通的 `chat` 事件路径，
客户端会把它当作常规对话历史。

由于 BTW 使用的是单独的实时事件，并且不会从
`chat.history` 回放，所以在重新加载后它就会消失。

## 表现形式

### TUI

在 TUI 中，BTW 会以内联方式渲染在当前会话视图中，但它仍然是临时的：

- 在视觉上与普通助手回复明显不同
- 可通过 `Enter` 或 `Esc` 关闭
- 重新加载后不会回放

### 外部通道

在 Telegram、WhatsApp 和 Discord 之类的通道上，BTW 会以
清晰标注的一次性回复形式发送，因为这些界面没有本地临时覆盖层的概念。

该答案仍然被视为旁路结果，而不是正常的会话历史。

### 控制 UI / Web

Gateway 会正确地将 BTW 以 `chat.side_result` 发送，而 BTW 不会包含在
`chat.history` 中，因此就持久化契约而言，Web 端已经是正确的。

当前的控制 UI 仍然需要一个专门的 `chat.side_result` 消费者来在浏览器中
实时渲染 BTW。等到客户端支持到位之前，BTW 只是一个 Gateway 级别的功能，
在 TUI 和外部通道上行为完整，但浏览器 UX 还不完整。

## 何时使用 BTW

在以下场景使用 `/btw`：

- 想快速澄清当前工作，
- 长任务仍在进行时想获得一个事实性的旁路答案，
- 需要一个临时答案，但它不应成为未来会话上下文的一部分。

示例：

```text
/btw what file are we editing?
/side what changed while the main run continued?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何时不要使用 BTW

当你希望答案成为会话未来工作上下文的一部分时，
不要使用 `/btw`。

这种情况下，请在主会话中正常提问，而不是使用 BTW。

## 相关内容

<CardGroup cols={2}>
  <Card title="Slash commands" href="/tools/slash-commands" icon="terminal">
    原生命令目录和聊天指令。
  </Card>
  <Card title="Thinking levels" href="/tools/thinking" icon="brain">
    用于旁路问题模型调用的推理努力级别。
  </Card>
  <Card title="Session" href="/concepts/session" icon="comments">
    会话键、历史记录和持久化语义。
  </Card>
  <Card title="Steer command" href="/tools/steer" icon="arrow-right">
    在不结束当前运行的情况下，向活动运行注入一条引导消息。
  </Card>
</CardGroup>
