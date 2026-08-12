---
summary: "向多个代理广播 WhatsApp 消息"
read_when:
  - 配置广播组
  - 调试 WhatsApp 中的多代理回复
status: experimental
title: "广播组"
sidebarTitle: "广播组"
---

<Note>
**状态：** 实验性。已在 2026.1.9 中添加。仅适用于 WhatsApp（web channel）。
</Note>

## 概述

广播组会在同一条入站消息上运行**多个代理**。每个代理都在各自隔离的会话中处理该消息，并发布自己的回复，因此一个 WhatsApp 号码可以在单个群聊或私聊中承载一组专门代理。

广播组会在通道允许列表和群组激活规则之后进行评估。在 WhatsApp 群组中，当 OpenClaw 通常会回复时就会触发广播（例如：在被提及的时候，具体取决于你的群组设置）。它们只会改变**运行哪些代理**，绝不会改变某条消息是否符合处理条件。

实时 WhatsApp QA 流水线包含 `whatsapp-broadcast-group-fanout`，用于验证一条被提及的群消息可以从两个已配置的代理中产生不同的可见回复。

## 配置

### 基础设置

添加一个顶层 `broadcast` 部分（与 `bindings` 同级）。键为 WhatsApp 对端 id，值为代理 id 数组：

- 群聊：群组 JID（例如 `120363403215116621@g.us`）
- 私聊：发送者的 E.164 电话号码（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**结果：**当 OpenClaw 本来会在此聊天中回复时，它会同时运行这三个代理。

每个列出的代理 id 都必须存在于 `agents.entries` 中：配置校验会报告未知 id，运行时会跳过它们，并输出 `Broadcast agent <id> not found in agents.entries; skipping` 警告。

### 处理策略

`broadcast.strategy` 用于设置代理如何处理消息：

| 策略                 | 行为                                                              |
| -------------------- | --------------------------------------------------------------------- |
| `parallel`（默认）   | 所有代理同时处理；回复可能以任意顺序到达。       |
| `sequential`         | 代理按数组顺序处理；每个代理都要等前一个完成后才开始。 |

```json
{
  "broadcast": {
    "strategy": "sequential",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

### 完整示例

```json
{
  "agents": {
    "entries": {
      "code-reviewer": {
        "default": true,
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
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-reviewer", "security-auditor", "docs-generator"],
    "120363424282127706@g.us": ["support-en", "support-de"],
    "+15555550123": ["assistant", "logger"]
  }
}
```

## 工作原理

### 消息流

<Steps>
  <Step title="接收到传入消息">
    一条 WhatsApp 群消息或私信到达。
  </Step>
  <Step title="路由和接入">
    OpenClaw 会应用渠道白名单、群组激活规则以及已配置的 ACP 绑定所有权。
  </Step>
  <Step title="广播检查">
    如果没有配置的 ACP 绑定拥有该路由，OpenClaw 会检查对端 ID 是否在 `broadcast` 中。
  </Step>
  <Step title="如果广播适用">
    - 所有列出的代理都会处理该消息。
    - 每个代理都有自己的会话密钥和隔离上下文。
    - 代理会并行处理（默认）或按顺序处理。
    - 音频附件会在分发前只转录一次，因此各代理共享同一份转录结果，而不是分别发起独立的 STT 调用。

  </Step>
  <Step title="如果广播不适用">
    OpenClaw 会分发普通路由或在路由期间选定的已配置 ACP 会话路由。
  </Step>
</Steps>

<Note>
广播组不会绕过渠道白名单或群组激活规则（提及／命令等）。它们只会改变当消息符合处理条件时，_哪些代理_ 会运行。
</Note>

### 会话隔离

广播组中的每个代理都会完全独立地维护以下内容：

- **会话密钥** （`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`）
- **对话历史**（一个代理看不到其他代理的回复）
- **工作区**（如果已配置，则为独立沙箱）
- **工具访问权限**（不同的允许／拒绝列表）
- **记忆／上下文**（独立的 `IDENTITY.md`、`SOUL.md` 等）

有一个例外是刻意共享的：**群组上下文缓冲区**（用于上下文的最近群消息）按对端共享，因此所有广播代理在被触发时都会看到相同的上下文。广播完成后它会被清空一次。

这使得每个代理都可以拥有不同的人格、模型、技能和工具访问权限（例如只读与可读写）。

### 示例：隔离会话

在群组 `120363403215116621@g.us` 中，代理为 `["alfred", "baerbel"]`：

<Tabs>
  <Tab title="Alfred 的上下文">
    ```text
    Session: agent:alfred:whatsapp:group:120363403215116621@g.us
    History: [用户消息，alfred 之前的回复]
    Workspace: ~/openclaw-alfred/
    Tools: read, write, exec
    ```
  </Tab>
  <Tab title="Baerbel 的上下文">
    ```text
    Session: agent:baerbel:whatsapp:group:120363403215116621@g.us
    History: [用户消息，baerbel 之前的回复]
    Workspace: ~/openclaw-baerbel/
    Tools: 仅读取
    ```
  </Tab>
</Tabs>

## 使用场景

- **专业化代理团队**：一个开发组，其中 `code-reviewer`、`security-auditor`、`test-generator` 和 `docs-checker` 分别从各自的角度回应同一条消息。
- **多语言支持**：一个支持聊天中，`support-en`、`support-de`、`support-es` 以各自的语言回复。
- **质量保证**：`support-agent` 先回复，而 `qa-agent` 进行审查，并且只在发现问题时才回应。
- **任务自动化**：`task-tracker`、`time-logger` 和 `report-generator` 都会消费同一条状态更新。

## 最佳实践

<AccordionGroup>
  <Accordion title="1. 保持代理专注">
    为每个代理分配单一、明确的职责（`formatter`、`linter`、`tester`），而不是使用一个通用的“dev-helper”代理。
  </Accordion>
  <Accordion title="2. 使用描述性的 id 和名称">
    ```json
    {
      "agents": {
        "entries": {
          "security-scanner": { "default": true, "name": "Security Scanner" },
          "code-formatter": { "name": "Code Formatter" },
          "test-generator": { "name": "Test Generator" }
        }
      }
    }
    ```
  </Accordion>
  <Accordion title="3. 配置不同的工具访问权限">
    ```json
    {
      "agents": {
        "entries": {
          "reviewer": {
            "default": true,
            "tools": { "allow": ["read", "exec"] }
          },
          "fixer": { "tools": { "allow": ["read", "write", "edit", "exec"] } }
        }
      }
    }
    ```

    `reviewer` 是只读的。`fixer` 可以读写。

  </Accordion>
  <Accordion title="4. 监控性能">
    当代理较多时，优先使用 `"strategy": "parallel"`（默认），将广播组保持在少量代理范围内，并为更简单的代理使用更快的模型。
  </Accordion>
  <Accordion title="5. 故障保持隔离">
    代理是独立失败的。某个代理的错误会被记录（`Broadcast agent <id> failed: ...`），不会阻塞其他代理。
  </Accordion>
</AccordionGroup>

## 兼容性

### 提供方

广播组目前仅为 WhatsApp（web 通道）实现。其他通道会忽略 `broadcast` 配置。

### 路由

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
- `GROUP_B`：agent1 和 agent2 都会响应（广播）。

<Note>
**优先级：** `broadcast` 优先于普通路由绑定。已配置的 ACP 绑定（`bindings[].type="acp"`）是独占的：当某个绑定匹配时，OpenClaw 会将其分发到已配置的 ACP 会话，而不是进行扇出广播。
</Note>

## 故障排除

<AccordionGroup>
  <Accordion title="代理没有响应">
    **检查：**

    1. Agent IDs 存在于 `agents.entries` 中（配置校验会拒绝未知的 ids）。
    2. Peer ID 格式正确（群组 JID 如 `120363403215116621@g.us`，或用于 DM 的 E.164 如 `+15551234567`）。
    3. 消息通过了正常的门控（仍然适用 mention/activation 规则）。

    **调试：**

    ```bash
    openclaw logs --follow | grep -i broadcast
    ```

    成功的广播会记录 `Broadcasting message to <n> agents (<strategy>)`。

  </Accordion>
  <Accordion title="只有一个代理响应">
    **原因：** peer ID 可能在普通路由绑定中而不在 `broadcast` 中，或者它可能匹配了一个独占配置的 ACP 绑定。

    **修复：** 将普通路由绑定的 peer 添加到广播配置中，或者如果需要扇出广播，则移除/更改已配置的 ACP 绑定。

  </Accordion>
  <Accordion title="性能问题">
    如果在代理数量很多时变慢：减少每组代理数量，使用更轻量的模型，并检查沙箱启动时间。
  </Accordion>
</AccordionGroup>

## 示例

<AccordionGroup>
  <Accordion title="示例 1：代码审查团队">
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
        "entries": {
          "code-formatter": {
            "default": true,
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
      }
    }
    ```

    组内的一段代码片段会产生四个回复：格式修复、安全问题、覆盖率缺口，以及文档方面的小问题。

  </Accordion>
  <Accordion title="示例 2：多语言流水线">
    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "+15555550123": ["detect-language", "translator-en", "translator-de"]
      },
      "agents": {
        "entries": {
          "detect-language": { "default": true, "workspace": "~/agents/lang-detect" },
          "translator-en": { "workspace": "~/agents/translate-en" },
          "translator-de": { "workspace": "~/agents/translate-de" }
        }
      }
    }
    ```
  </Accordion>
</AccordionGroup>

## API 参考

### 配置模式

```typescript
interface OpenClawConfig {
  broadcast?: {
    strategy?: "parallel" | "sequential";
    [peerId: string]: string[];
  };
}
```

### 字段

<ParamField path="strategy" type='"parallel" | "sequential"' default='"parallel"'>
  如何处理代理。`parallel` 会同时运行所有代理；`sequential` 会按数组顺序运行它们。
</ParamField>
<ParamField path="[peerId]" type="string[]">
  WhatsApp 群组 JID 或 E.164 电话号码。值是应当全部处理来自该对等方消息的代理 ID 数组。
</ParamField>

## 限制

1. **最大代理数：** 没有硬性限制，但代理很多（10+）时可能会很慢。
2. **共享上下文：** 代理无法看到彼此的回复（按设计如此）。
3. **消息顺序：** 并行回复可能会以任意顺序到达。
4. **速率限制：** 所有回复都来自同一个 WhatsApp 账号，因此每个代理的回复都会计入同一 WhatsApp 速率限制。

## 相关

- [频道路由](/channels/channel-routing)
- [群组](/channels/groups)
- [多代理沙盒工具](/tools/multi-agent-sandbox-tools)
- [配对](/channels/pairing)
- [会话管理](/concepts/session)
