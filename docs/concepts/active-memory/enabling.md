---
summary: "打开活动记忆的两种方法：每个代理的 RememberAcrossConversations 产品设置和高级插件快速启动。"
read_when:
  - "您想要个人代理的交叉对话召回"
  - "您需要插件的安全高级启动配置"
title: "启用活动内存"
---

## <a id="remember-across-conversations"></a> 跨会话记忆

对于个人或完全受信任的代理，请通过每个代理的设置启用其其他私有对话之间的有限回忆：

```json5
{
  agents: {
    entries: {
      personal: {
        memory: {
          search: {
            rememberAcrossConversations: true,
          },
        },
      },
    },
  },
}
```

对于个人安装，此设置默认开启：全局 `session.dmScope` 必须未设置或为 `"main"`，且任何绑定都不得覆盖 `session.dmScope`。任何已配置的 DM 隔离都会将其默认关闭。显式的 `true` 或 `false` 始终优先生效。启用后，OpenClaw 会索引该代理的会话转录，并在适用的私有回复之前运行一次主动记忆检索步骤。该步骤可以从该代理的其他私有对话中读取相关的转录摘录。它不会包含当前正在回复的对话。

隐私边界是固定的：

- 私有直连和持久化的显式 UI 对话可以相互回忆
- 群组和频道既不是回忆来源，也不是回忆目的地
- 其他代理的转录内容永远不符合条件
- 元数据不足的未知或已归档转录会被拒绝

这不会合并转录、改变会话密钥或传递路由、扩大 `tools.sessions.visibility`，也不会授予更广泛的 `sessions_*` 工具访问权限。共享工作区记忆（`MEMORY.md` 和 `memory/*.md`）保持其现有行为。

活动内存必须保持启用状态。检索为符合条件的回复添加了有界阻止步骤。有意无意的跳过或不可用的搜索会添加一个简短的隐藏结果注释，而不是回忆的转录上下文。这告诉主模型，在不暴露提供者错误的情况下，召回未运行或无法完成。超时和空结果保留其现有行为。 OpenClaw 的内置内存提供程序支持这种受保护的转录回忆路径。其他记忆提供商保留自己的回忆行为，但不会自动接收私人转录授权。 `openclaw doctor` 报告不支持的提供程序或缺少 `memory_search` 工具。

## <a id="advanced-active-memory-quick-start"></a> 高级 Active Memory 快速开始

将以下内容粘贴到 `openclaw.json` 中，作为高级安全默认配置：启用插件，仅作用于 `main`，仅限直接消息会话，模型继承自当前会话。

```json5
{
  plugins: {
    entries: {
      "active-memory": {
        enabled: true,
        config: {
          enabled: true,
          mode: "escalate",
          agents: ["main"],
          allowedChatTypes: ["direct"],
          modelFallback: "google/gemini-3-flash",
          queryMode: "recent",
          promptStyle: "balanced",
          timeoutMs: 15000,
          maxSummaryChars: 220,
          persistTranscripts: false,
          logging: true,
        },
      },
    },
  },
}
```

`plugins.entries.*`（包括 `active-memory.config`）属于[无需重启的配置类别](/gateway/configuration#what-hot-applies-vs-what-needs-a-restart)： Gateway 会自动重新加载插件运行时，无需手动重启。如果你仍想强制完整重启，请运行：

```bash
openclaw gateway restart
```

要在对话中实时查看它：

```text
/verbose on
/trace on
```

各关键字段的作用：

- `plugins.entries.active-memory.enabled: true` 启用该插件
- `config.mode: "escalate"` 仅针对召回意图运行深度召回，而没有基于规则的强大召回命中
- `config.agents: ["main"]` 仅将 `main` agent 纳入
- `config.allowedChatTypes: ["direct"]` 将其范围限定为直接消息会话（明确选择 groups/channels）
- `config.model`（可选）固定专用回忆模型；未设置时继承当前会话模型
- `config.modelFallback` 仅在没有显式或继承模型可用时使用
- `config.fastMode` 可选地为回忆覆盖快速模式，而不更改主 agent
- `config.promptStyle: "balanced"` 是 `recent` 模式的默认值
- 活动内存仍然仅针对符合条件的交互式持久聊天会话运行（请参阅 [ 运行时 ](/concepts/active-memory/how-it-works#when-it-runs)）
