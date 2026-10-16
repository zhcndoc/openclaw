---
summary: "跨消息通道运行有界代理组线程"
read_when:
  - "配置广播组"
  - "配置有界代理组线程"
  - "跨渠道调试多代理回复"
status: experimental
title: "广播组"
sidebarTitle: "广播组"
---

<Note>
**状态：** 实验。仍支持旧版 WhatsApp 广播阵列。
</Note>

## <a id="overview"></a> 概览

代理组线程使用顶级 `broadcast` 配置对同一入站消息运行 **多个代理**。每个代理都在自己的会话中运行。渠道限定的条目可以通过提及来选择参与者，并允许有限数量的后续轮次，以便代理可以在兄弟回复的基础上进行构建。

频道许可名单和组激活规则仍然适用。对于 Discord、Slack 和 Telegram 上的合格条目，明确提及任何已配置的参与者可以满足房间的提及门，即使该参与者不是普通的路由座席。旧版 WhatsApp 条目保留其现有的准入行为。

实时 WhatsApp QA 流水线包含 `whatsapp-broadcast-group-fanout`，用于验证一条被提及的群消息可以从两个已配置的代理中产生不同的可见回复。

## <a id="configuration"></a> 配置

### <a id="agent-group-threads"></a> 代理组线程

使用 `"<channel>:<peerId>"` 形式的密钥，例如 `"discord:123456789"`、`"slack:C0123"`、`"telegram:-100123"` 或 `"whatsapp:1203@g.us"`。该值可以是代理 ID 数组或严格对象：

```json5
{
  agents: {
    ownership: "explicit",
    entries: {
      reviewer: {
        name: "Reviewer",
        groupChat: { mentionPatterns: ["@reviewer\\b"] },
      },
      writer: {
        name: "Writer",
        groupChat: { mentionPatterns: ["@writer\\b"] },
      },
    },
  },
  bindings: [{ agentId: "reviewer", match: { channel: "telegram" } }],
  broadcast: {
    "telegram:-100123": {
      agents: ["reviewer", "writer"],
      mentionGating: true,
      maxRounds: 2,
      maxTurns: 4,
    },
  },
}
```

普通渠道路线仍需代理；上面的绑定在小组派遣之前选择审稿人。当房间的通道配置允许后，发送 `@reviewer @writer Review this draft`。双方参与者都可以回答最初的信息，并在预算范围内，在后续一轮中添加新的内容。发送 `@writer` 以仅选择第一轮的 Writer。

| 对象字段    | 默认值         | 契约                                                                       |
| --------------- | --------------- | ------------------------------------------------------------------------------ |
| `agents`        | 必需的        | 配置的代理 ID；最多 16 名参与者。                                 |
| `mentionGating` | `true`          | 选择明确提到的参与者；如果没有匹配，则选择全部。           |
| `maxRounds`     | `1`             | 1 到 4 之间的整数，包括第一轮。                              |
| `maxTurns`      | `agents.length` | 1 到 32 之间的整数；为一条入站消息启动的参与者总数。 |

未知的对象字段被拒绝。合格的数组使用相同的默认值：`"slack:C0123": ["reviewer", "writer"]` 运行第一轮并进行提及选择。对于同一对等点，合格的 WhatsApp 密钥优先于不合格的密钥。不支持不合格的对象条目。

`maxTurns` 统计由协调器**启动的**agent 运行，包括通过或失败的运行。插槽在并行启动之前同步预留，因此并行参与者不会超支预算。如果预算小于符合条件的参与者数量，则配置的顺序将确定开始的轮次。一个轮次可以通过块、预览或消息工具发送来产生多个平台消息。这些交付由代理运营和渠道运输管理； `maxTurns` 不会对物理消息进行计数、缓冲或限制。

Telegram、Discord 和 Slack 禁用合格组线程的共享预览和进度草稿，以便并发参与者不会覆盖彼此的草稿。最终回复、阻止回复和消息工具发送仍然可用。

默认轮次预算涵盖每个已配置代理的轮次。要让每个代理运行两次，请将 `maxRounds: 2` 和 `maxTurns` 设置为参与者计数的两倍。

### <a id="mention-selection"></a> 提及选择

选择仅使用当前入站文本中的显式 `@`-style 匹配，为参与者集计算一次。散文中的名字或纯粹的表情符号不会选择参与者。提及模式从代理的 `groupChat.mentionPatterns` 解析，然后是 `messages.groupChat.mentionPatterns`，然后是其身份派生模式。当您想单独解决参与者问题时，请为他们提供不同的模式。

对于 `mentionGating: true`，比赛仅选择第 1 轮匹配的参与者；没有匹配项选择全部。使用 `mentionGating: false`，选择所有参与者。此选项不会关闭通道的 `requireMention` 策略、发件人白名单或命令授权。

### <a id="bounded-follow-up-rounds"></a> Bounded 后续轮次

完成一轮后，另一轮只能在 `maxRounds` 和 `maxTurns` 内运行。符合资格的参与者是那些在上一轮中做出最终答复或在兄弟姐妹的最终答复中提到姓名的人。每个参与者的最终摘要文本限制为 4,000 个字符；合并的同级文本限制为 16,000 个字符。每个人都会收到该轮同级决赛的有属性的、有大小限制的摘要，并附有仅在添加新内容时回复的指令，否则返回 `NO_REPLY`。通过不会产生可见的最终答复。

所有通过的参与者都会结束该线程。达到限制或取消也会停止进一步的转弯。每个延续都有其自己的内部身份；它不是物理入站消息的重播。顺序策略改变一轮内的启动顺序；它不会将该轮变成一个管道，让每个参与者都能看到同一轮的早期回复。

预算状态位于内存中，范围为通道、帐户、对话、线程和根入站消息。它不可重新启动恢复：网关重新启动会丢失活动回合和预算状态。普通入站重复数据删除仍然是一种单独的保护。

### <a id="participant-labels"></a> 参与者标签

当合格条目配置多个参与者时，Discord、Slack 和 Telegram 回复以粗体参与者名称开头。配置的计数控制标签，即使提到选择、回合预算或沉默只留下一个响应者。 WhatsApp 演示文稿保持不变。

### <a id="basic-setup"></a> 基础设置

传统单通道设置使用不合格的 WhatsApp 对等 ID 作为键，并使用代理 ID 数组作为值：

- 群聊：群JID （e.g. `120363403215116621@g.us`）
- DMs：发件人 E.164 电话号码 （e.g. `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**结果：**当 OpenClaw 本来会在此聊天中回复时，它会同时运行这三个代理。

每个列出的代理 ID 必须存在于配置的名册中：配置验证拒绝数组和对象中的未知 ID。删除代理会将其从两种形式中删除。

运行时成员资格使用当前的 `agents.entries` 名册。在启动前运行 `openclaw doctor --fix` 以迁移旧版 `agents.list` 名册。

### <a id="processing-strategy"></a> 处理策略

`broadcast.strategy` 用于设置代理如何处理消息：

| 策略             | 行为                                                              |
| -------------------- | --------------------------------------------------------------------- |
| `parallel`（默认） | 所有代理同时处理；回复可能以任意顺序到达。       |
| `sequential`         | 代理按数组顺序处理；每个代理都要等前一个完成后才开始。 |

```json
{
  "broadcast": {
    "strategy": "sequential",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

### <a id="complete-example"></a> 完整示例

```json
{
  "agents": {
    "ownership": "explicit",
    "defaults": {
      "authInheritance": { "agentId": "code-reviewer" },
      "heartbeat": { "agentId": "code-reviewer" },
      "systemAgent": { "agentId": "code-reviewer" }
    },
    "entries": {
      "code-reviewer": {
        "name": "Code Reviewer",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      "security-auditor": {
        "name": "Security Auditor",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      "docs-generator": {
        "name": "Documentation Generator",
        "workspace": "/path/to/docs-generator",
        "sandbox": { "mode": "all" }
      }
    }
  },
  "bindings": [
    { "agentId": "code-reviewer", "match": { "channel": "whatsapp", "accountId": "*" } }
  ],
  "talk": { "agentId": "code-reviewer" },
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-reviewer", "security-auditor", "docs-generator"]
  }
}
```

## <a id="how-it-works"></a> 工作原理

### <a id="message-flow"></a> 消息流

<Steps>
  <Step id="incoming-message-arrives" title="传入消息到达">
    频道消息到达。
  </Step>
  <Step id="route-and-admission" title="路线及入场">
    OpenClaw 会应用渠道白名单、群组激活规则以及已配置的 ACP 绑定所有权。
  </Step>
  <Step id="broadcast-check" title="广播检查">
    如果没有配置的 ACP 绑定拥有该路由，则 OpenClaw 检查合格的 channel/peer 密钥，然后检查 WhatsApp 的旧对等密钥。
  </Step>
  <Step id="if-broadcast-applies" title="如果广播适用">
    - 选定的参与者在轮次限制内处理消息。
    - 每个代理都有自己的会话密钥和隔离上下文。
    - 代理会并行处理（默认）或按顺序处理。
    - WhatsApp 音频附件在扇出之前转录一次，因此代理共享一份转录内容，而不是进行单独的 STT 调用。

  </Step>
  <Step id="if-broadcast-does-not-apply" title="如果广播不适用">
    OpenClaw 会分发普通路由或在路由期间选定的已配置 ACP 会话路由。
  </Step>
</Steps>

<Note>
组线程不会绕过通道白名单、命令授权或独占 ACP 绑定。如上所述，参与者提及入场可扩展房间提及门。
</Note>

### <a id="session-isolation"></a> 会话隔离

广播组中的每个代理都会完全独立地维护以下内容：

- **会话密钥** （`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`）
- **对话历史记录**（兄弟回复仅通过有界后续摘要共享）
- **工作区**（如果已配置，则为独立沙箱）
- **工具访问**（不同的allow/deny列表）
- **Memory/context**（单独的`IDENTITY.md`、`SOUL.md`等）

在 Discord、Slack 和 Telegram 上，回复传递和完成挂钩使用响应参与者的会话，并且本地媒体使用该参与者的媒体根进行解析。这也适用于只有一名参与者的合格条目，其回复没有参与者姓名标签。

在 WhatsApp 上，有意共享一个输入：**组上下文缓冲区**（用于上下文的最近组消息）在每个对等点上共享，因此所有广播代理在触发时都会看到相同的上下文。扇出完成后一次被清除。

这使得每个代理都可以拥有不同的人格、模型、技能和工具访问权限（例如只读与可读写）。

### <a id="example%3A-isolated-sessions"></a><a id="example-isolated-sessions"></a> 示例：隔离会话

在群组 `120363403215116621@g.us` 中，代理为 `["alfred", "baerbel"]`：

<Tabs>
  <Tab id="alfreds-context" title="阿尔弗雷德的背景">
    ```text
    Session: agent:alfred:whatsapp:group:120363403215116621@g.us
    History: [user message, alfred's previous responses]
    Workspace: ~/openclaw-alfred/
    Tools: read, write, exec
    ```
  </Tab>
  <Tab id="baerbels-context" title="贝尔贝尔的背景">
    ```text
    Session: agent:baerbel:whatsapp:group:120363403215116621@g.us
    History: [user message, baerbel's previous responses]
    Workspace: ~/openclaw-baerbel/
    Tools: read only
    ```
  </Tab>
</Tabs>

## <a id="use-cases"></a> 使用场景

- **专业化代理团队**：一个开发组，其中 `code-reviewer`、`security-auditor`、`test-generator` 和 `docs-checker` 分别从各自的角度回应同一条消息。
- **多语言支持**：一个支持聊天中，`support-en`、`support-de`、`support-es` 以各自的语言回复。
- **质量保证**：`support-agent` 先回复，而 `qa-agent` 进行审查，并且只在发现问题时才回应。
- **任务自动化**：`task-tracker`、`time-logger` 和 `report-generator` 都会消费同一条状态更新。

## <a id="best-practices"></a> 最佳实践

<AccordionGroup>
  <Accordion id="1-keep-agents-focused" title="1. 保持智能体专注">
    为每个代理分配单一、明确的职责（`formatter`、`linter`、`tester`），而不是使用一个通用的“dev-helper”代理。
  </Accordion>
  <Accordion id="2-use-descriptive-ids-and-names" title="2. 使用描述性 ID 和名称">
    ```json
    {
      "agents": {
        "ownership": "explicit",
        "defaults": {
          "authInheritance": { "agentId": "security-scanner" },
          "heartbeat": { "agentId": "security-scanner" },
          "systemAgent": { "agentId": "security-scanner" }
        },
        "entries": {
          "security-scanner": {
            "name": "Security Scanner",
            "workspace": "~/.openclaw/workspace"
          },
          "code-formatter": { "name": "Code Formatter" },
          "test-generator": { "name": "Test Generator" }
        }
      },
      "talk": { "agentId": "security-scanner" }
    }
    ```
  </Accordion>
  <Accordion id="3-configure-different-tool-access" title="3. 配置不同的工具访问">
    ```json
    {
      "agents": {
        "ownership": "explicit",
        "defaults": {
          "authInheritance": { "agentId": "reviewer" },
          "heartbeat": { "agentId": "reviewer" },
          "systemAgent": { "agentId": "reviewer" }
        },
        "entries": {
          "reviewer": {
            "workspace": "~/.openclaw/workspace",
            "tools": { "allow": ["read", "exec"] }
          },
          "fixer": { "tools": { "allow": ["read", "write", "edit", "exec"] } }
        }
      },
      "talk": { "agentId": "reviewer" }
    }
    ```

    `reviewer` 是只读的。`fixer` 可以读写。

  </Accordion>
  <Accordion id="4-monitor-performance" title="4. 监控性能">
    当代理较多时，优先使用 `"strategy": "parallel"`（默认），将广播组保持在少量代理范围内，并为更简单的代理使用更快的模型。
  </Accordion>
  <Accordion id="5-failures-stay-isolated" title="5. 故障保持隔离">
    代理是独立失败的。某个代理的错误会被记录（`Broadcast agent <id> failed: ...`），不会阻塞其他代理。
  </Accordion>
</AccordionGroup>

## <a id="compatibility"></a> 兼容性

### <a id="providers"></a> 提供方

通道限定条目使用跨通道插件的共享核心调度路径。 Discord、Slack 和 Telegram 还支持参与者提及入场和姓名标签。旧版不合格条目仅适用于 WhatsApp（网络渠道）。

### <a id="routing"></a> 路由

广播组与现有路由并行工作：

```json
{
  "bindings": [
    {
      "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "GROUP_A" } },
      "agentId": "alfred"
    }
  ],
  "broadcast": {
    "GROUP_B": ["agent1", "agent2"]
  }
}
```

- `GROUP_A`：只有 alfred 响应（普通路由）。
- `GROUP_B`：代理 1 AND 代理 2 响应（广播）。

<Note>
**优先级：** `broadcast` 优先于普通路由绑定。已配置的 ACP 绑定（`bindings[].type="acp"`）是独占的：当某个绑定匹配时，OpenClaw 会将其分发到已配置的 ACP 会话，而不是进行扇出广播。
</Note>

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="agents-not-responding" title="代理未回复">
    **检查：**

    1. Agent IDs 存在于 `agents.entries` 中（配置校验会拒绝未知的 ids）。
    2. 合格的channel/peer钥匙与房间匹配。对于 DM，旧版 WhatsApp 密钥使用 JID（如 `120363403215116621@g.us`）或 E.164（如 `+15551234567`）。
    3. 消息通过了正常的门控（仍然适用 mention/activation 规则）。

    **调试：**

    ```bash
    openclaw logs --follow | grep -i broadcast
    ```

    成功的广播会记录 `Broadcasting message to <n> agents (<strategy>)`。

  </Accordion>
  <Accordion id="only-one-agent-responding" title="只有一名代理回应">
    **Check：** 明确提及可以选择一名参与者，`maxTurns` 可以只允许一次运行，或者其他可以通过。还要检查对等体是否仅在普通路由绑定中或与独占配置的 ACP 绑定匹配。

    **Fix：** 将普通路由绑定对等体添加到广播配置中，或者如果需要扇出广播，则将 remove/change 配置的 ACP 绑定添加到其中。

  </Accordion>
  <Accordion id="performance-issues" title="性能问题">
    如果在代理数量很多时变慢：减少每组代理数量，使用更轻量的模型，并检查沙箱启动时间。
  </Accordion>
</AccordionGroup>

## <a id="examples"></a> 示例

<AccordionGroup>
  <Accordion id="example-1-code-review-team" title="示例 1：代码审查团队">
    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": [
          "code-formatter",
          "security-scanner",
          "test-coverage",
          "docs-checker"
        ]
      },
      "agents": {
        "ownership": "explicit",
        "defaults": {
          "authInheritance": { "agentId": "code-formatter" },
          "heartbeat": { "agentId": "code-formatter" },
          "systemAgent": { "agentId": "code-formatter" }
        },
        "entries": {
          "code-formatter": {
            "workspace": "~/agents/formatter",
            "tools": { "allow": ["read", "write"] }
          },
          "security-scanner": {
            "workspace": "~/agents/security",
            "tools": { "allow": ["read", "exec"] }
          },
          "test-coverage": {
            "workspace": "~/agents/testing",
            "tools": { "allow": ["read", "exec"] }
          },
          "docs-checker": { "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
        }
      },
      "bindings": [
        { "agentId": "code-formatter", "match": { "channel": "whatsapp", "accountId": "*" } }
      ],
      "talk": { "agentId": "code-formatter" }
    }
    ```

    该组中的一个代码片段可以产生四种视角：格式修复、安全发现、覆盖范围差距和文档尼特。

  </Accordion>
  <Accordion id="example-2-multi-language-pipeline" title="示例 2：多语言管道">
    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "+15555550123": ["detect-language", "translator-en", "translator-de"]
      },
      "agents": {
        "ownership": "explicit",
        "defaults": {
          "authInheritance": { "agentId": "detect-language" },
          "heartbeat": { "agentId": "detect-language" },
          "systemAgent": { "agentId": "detect-language" }
        },
        "entries": {
          "detect-language": { "workspace": "~/agents/lang-detect" },
          "translator-en": { "workspace": "~/agents/translate-en" },
          "translator-de": { "workspace": "~/agents/translate-de" }
        }
      },
      "bindings": [
        { "agentId": "detect-language", "match": { "channel": "whatsapp", "accountId": "*" } }
      ],
      "talk": { "agentId": "detect-language" }
    }
    ```
  </Accordion>
</AccordionGroup>

## <a id="api-reference"></a> API 参考

### <a id="config-schema"></a> 配置模式

```typescript
type BroadcastGroupConfig = {
  agents: string[];
  mentionGating?: boolean;
  maxRounds?: number;
  maxTurns?: number;
};

type BroadcastConfig = {
  strategy?: "parallel" | "sequential";
  [key: string]: string[] | BroadcastGroupConfig | "parallel" | "sequential" | undefined;
};
```

### <a id="fields"></a> 字段

<ParamField path="strategy" type='"parallel" | "sequential"' default='"parallel"'>
  如何在每轮中处理合格的智能体。 `parallel`一起发起预留转弯； `sequential` 按配置顺序运行它们。
</ParamField>
<ParamField path="[channel:peerId]" type="string[] | BroadcastGroupConfig">
  渠道合格同行ID。数组使用组线程默认值；对象配置提及选择、回合和参与者轮次预算。最多16个特工。
</ParamField>
<ParamField path="[peerId]" type="string[]">
  旧版 WhatsApp 群组 JID 或 E.164 电话号码。每个列出的代理都会处理一轮，没有内部后续轮次或参与者选择。
</ParamField>

## <a id="limitations"></a> 限制

1. **共享上下文：** 后续摘要包含有限的同级决赛，而不是完整的同级会话或工具历史记录。
2. **消息排序：**并行响应可以按任何顺序到达。
3. **速率限制：**参与者共享通道账户的传输限制；一回合可以产生多个平台消息。
4. **Recovery：** 回合和回合预算状态位于内存中，网关重启后无法恢复。
5. **Control UI：** 专用团队线程会话尚不可用。每个参与者都有自己的会话。

## <a id="related"></a> 相关内容

- [频道路由](/channels/channel-routing)
- [群组](/channels/groups)
- [多代理沙箱工具](/tools/multi-agent-sandbox-tools)
- [配对](/channels/pairing)
- [会话管理](/concepts/session)
