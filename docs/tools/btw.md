---
summary: "使用 /btw 的临时旁路问题"
read_when:
  - 你想就当前会话快速提出一个旁路问题
  - 你正在跨客户端实现或调试 BTW 行为
title: "BTW 旁路问题"
---

`/btw` (别名 `/side`) 用于就**当前
会话**提出一个快速的旁路问题，而不会将其添加到对话历史中。它借鉴了 Claude Code 的 `/btw`，并适配了 OpenClaw 的 Gateway 和多通道架构。

这两个旁路问题契约是故意分开的。BTW 是对会话实际模型的一次性提问，保留了通道入口（WhatsApp、Telegram 和 Discord）、TUI，以及嵌入式 `tui --local` 的 harness 行为和 Codex 线程分叉连续性；TUI 按设计始终使用 BTW。配套的是一个持久的、只读的 RPC 线程，供 Control UI 类客户端使用。通道不能使用这个配套功能，因为它们没有 RPC 连接。

```text
/btw what changed?
/side what does this error mean?
```

## 它的作用

1. 将当前会话快照为后台上下文（包括任何
   正在进行中的主运行提示）。
2. 运行一个单独的一次性侧边查询，告诉模型只回答
   侧边问题，不要恢复或引导主任务。
3. 将答案作为实时侧边结果返回，而不是普通的助手消息。
4. 绝不会将问题或答案写入会话历史或 `chat.history`。

如果主运行当前处于活动状态，则不会受到影响。

对于 Codex harness 会话，BTW 会将活动的 Codex app-server 线程分叉为
一个短暂的子线程，而不是发起单独的提供方调用。这
保留了 Codex OAuth 和原生工具/线程行为，并且分叉后的
线程会继承父线程当前的审批策略、沙箱和原生
工具面。分叉线程会收到一个边界提示，告知模型
在此之前的一切都是继承来的参考上下文，不是活动指令，
只有边界之后的消息才是实时的。`/btw` 需要一个
已存在的 Codex 线程；请先发送一条普通消息。

对于 CLI 运行时别名，BTW 会以一次性的侧边问题模式调用所属的 CLI 后端：它会将已清理的对话上下文注入到新的 CLI 调用中，禁用工具捆绑和可重用会话状态，并添加
后端支持的任何 no-resume/no-tools 标志。直接（非 CLI）运行时
则改用直接的一次性提供方调用。

## 它不做什么

`/btw` 不会创建持久会话、继续未完成的主任务，
也不会将问答数据持久化到转录历史中。分离的 BTW 结果不会在
重新加载后保留。Control UI 伴侣可以在重新加载后重新载入其内存中的
线程，但该线程会在会话重置、Gateway
重启、空闲过期或 rail 的清除按钮时被清空。

## 传递模型

普通助手聊天使用 Gateway `chat` 事件。Detached BTW 使用一个独立的 `chat.side_result` 事件，因此客户端不会将其误认为是常规会话历史。Control UI 不消费该事件；它调用 session companion RPC，并在侧栏中渲染它们受限的交换状态。

## 表现形式

| Surface           | Behavior                                                                                                                                                                                                        |
| ----------------- | ----------------- |
| TUI               | 以内联方式渲染在聊天记录中，明显区别于普通回复，可通过 `Enter` 或 `Esc` 关闭。                                                                                                       |
| External channels | 作为一个清晰标注的一次性回复发送（Telegram、WhatsApp、Discord 没有本地的临时覆盖层）。                                                                                                     |
| Control UI / web  | 将 `/btw` 和 `/side` 路由到展开的会话侧栏伴侣。只读线程按会话键控，从 Gateway 内存重新加载，并可通过垃圾桶按钮清除。`Esc` 可折叠侧栏。 |

## 选择弹出菜单（控制 UI）

在 Control UI 的聊天消息中高亮文本时，会打开一个小的
选择弹出菜单，包含两个操作：

- **更多详情** 会立即请求会话侧边栏助手，要求其结合当前会话的上下文解释所选文本。
- **在侧边聊天中提问** 会打开侧边栏，并用带引号的草稿预填其编辑器，这样你就可以针对所选内容输入自己的问题。

这两个操作都遵循正常的 `/btw` 语义：问题和答案不会进入
会话历史，主运行也不会受到影响。

## 何时使用它

在需要快速澄清、在长时间运行仍在进行时给出一个事实性的附带回答，或者提供一个不应进入未来会话上下文的临时回答时，使用 `/btw`。

```text
/btw 我们正在编辑哪个文件？
/btw 用一句话总结当前任务
/btw 17 * 19 是多少？
```

对于任何你希望成为会话未来工作上下文一部分的内容，请改为在主会话中正常提问。

## 相关内容

<CardGroup cols={2}>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="terminal">
    原生命令目录和聊天指令。
  </Card>
  <Card title="思考级别" href="/tools/thinking" icon="brain">
    用于旁路问题模型调用的推理努力级别。
  </Card>
  <Card title="会话" href="/concepts/session" icon="comments">
    会话键、历史记录和持久化语义。
  </Card>
  <Card title="引导命令" href="/tools/steer" icon="arrow-right">
    在不结束当前运行的情况下，向活动运行注入一条引导消息。
  </Card>
</CardGroup>
