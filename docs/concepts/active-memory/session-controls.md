---
summary: "暂停或恢复每个会话或全局的活动内存，并在聊天中显示其状态、调试摘要和原始隐藏前缀。"
read_when:
  - "您想要暂停一次对话的活动记忆"
  - "你想看看注入了什么活动内存"
title: "会话控制"
---

## <a id="session-toggle"></a> 会话切换

在不编辑配置的情况下，暂停或恢复当前聊天会话的活动记忆：

```text
/active-memory status
/active-memory off
/active-memory on
```

这只会影响当前会话；不会更改 `plugins.entries.active-memory.config.enabled`、代理的 `memory.search.rememberAcrossConversations` 设置，或其他全局配置。

要对所有会话使用 pause/resume，请使用全局表单（需要所有者或 `operator.admin`）：

```text
/active-memory status --global
/active-memory off --global
/active-memory on --global
```

全局形式会写入 `plugins.entries.active-memory.config.enabled`，但会保持 `plugins.entries.active-memory.enabled` 为开启状态，因此该命令仍可用来稍后重新开启活动记忆。

## <a id="how-to-see-it"></a> 如何查看它

默认情况下，active memory 会注入一个隐藏的、不受信任的提示前缀， 它不会显示在正常回复中。打开与你想要的输出相匹配的会话切换项：

```text
/verbose on
/trace on
```

开启后，OpenClaw 会在正常回复之后追加诊断行（作为后续内容，因此渠道客户端不会闪烁出一个单独的预回复气泡）：

- `/verbose on` 会添加一行状态信息：`🧩 Active Memory: status=ok elapsed=842ms query=recent summary=34 chars`
- `/trace on` 会添加一条调试摘要：`🔎 Active Memory Debug: Lemon pepper wings with blue cheese.`

示例流程：

```text
/verbose on
/trace on
what wings should i order?
```

```text
...normal assistant reply...

🧩 Active Memory: status=ok elapsed=842ms query=recent summary=34 chars
🔎 Active Memory Debug: Lemon pepper wings with blue cheese.
```

使用 `/trace raw` 时，被跟踪的 `Model Input (User Role)` 区块会显示原始隐藏前缀：

```text
Context:
<active_memory_plugin>
...
</active_memory_plugin>
```

默认情况下，阻塞子代理的记录是临时的，并在运行完成后删除；请参阅 [Transcript persistence](/concepts/active-memory/advanced-options#transcript-persistence) 保留它。
