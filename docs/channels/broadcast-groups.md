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
**状态：**实验性。已于 2026.1.9 添加。
</Note>

## 概述

广播组允许多个代理同时处理并响应同一条消息。这使你能够创建专门的代理团队，在单个 WhatsApp 群组或私信中协同工作——全部使用同一个电话号码。

当前范围：**仅限 WhatsApp**（web channel）。

广播组会在渠道白名单和群组激活规则之后进行评估。在 WhatsApp 群组中，这意味着当 OpenClaw 通常会回复时才会发生广播（例如：在被提及时，取决于你的群组设置）。

## 用例

<AccordionGroup>
  <Accordion title="1. 专门的代理团队">
    部署多个具有明确、聚焦职责的代理：

    ```
    Group: "开发团队"
    Agents:
      - CodeReviewer（审查代码片段）
      - DocumentationBot（生成文档）
      - SecurityAuditor（检查漏洞）
      - TestGenerator（建议测试用例）
    ```

    每个代理都会处理同一条消息，并提供其专业视角。

  </Accordion>
  <Accordion title="2. 多语言支持">
    ```
    Group: "国际支持"
    Agents:
      - Agent_EN（用英语回复）
      - Agent_DE（用德语回复）
      - Agent_ES（用西班牙语回复）
    ```
  </Accordion>
  <Accordion title="3. 质量保证工作流">
    ```
    Group: "客户支持"
    Agents:
      - SupportAgent（提供答案）
      - QAAgent（审查质量，仅在发现问题时回复）
    ```
  </Accordion>
  <Accordion title="4. 任务自动化">
    ```
    Group: "项目管理"
    Agents:
      - TaskTracker（更新任务数据库）
      - TimeLogger（记录耗时）
      - ReportGenerator（创建摘要）
    ```
  </Accordion>
</AccordionGroup>

## 配置

### 基础设置

添加一个顶层 `broadcast` 部分（与 `bindings` 同级）。键为 WhatsApp 对端 id：

- 群聊：群组 JID（例如 `120363403215116621@g.us`）
- 私信：E.164 电话号码（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**结果：** 当 OpenClaw 原本会在此聊天中回复时，它会运行这三个代理。

### 处理策略

控制代理如何处理消息：

<Tabs>
  <Tab title="parallel (default)">
    所有代理同时处理：

    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
  <Tab title="sequential">
    代理按顺序处理（一个等待前一个完成）：

    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
</Tabs>

### 完整示例

```json
{
  "agents": {
    "list": [
      {
        "id": "code-reviewer",
        "name": "代码审查员",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "security-auditor",
        "name": "安全审计员",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "docs-generator",
        "name": "文档生成器",
        "workspace": "/path/to/docs-generator",
        "sandbox": { "mode": "all" }
      }
    ]
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
  <Step title="广播检查">
    系统检查对端 ID 是否在 `broadcast` 中。
  </Step>
  <Step title="如果在广播列表中">
    - 所有列出的代理都会处理该消息。
    - 每个代理都有自己的会话键和隔离的上下文。
    - 代理会并行（默认）或按顺序处理。

  </Step>
  <Step title="如果不在广播列表中">
    应用正常路由（第一个匹配的绑定）。
  </Step>
</Steps>

<Note>
广播组不会绕过渠道白名单或群组激活规则（提及/命令等）。它们只会改变当消息符合处理条件时，_哪些代理_ 会运行。
</Note>

### 会话隔离

广播组中的每个代理都会完全独立地维护以下内容：

- **会话键**（`agent:alfred:whatsapp:group:120363...` 与 `agent:baerbel:whatsapp:group:120363...`）
- **对话历史**（代理看不到其他代理的消息）
- **工作区**（如果配置了，则是独立的沙箱）
- **工具访问权限**（不同的允许/拒绝列表）
- **记忆/上下文**（独立的 IDENTITY.md、SOUL.md 等）
- **群组上下文缓冲区**（用于上下文的最近群消息）按对端共享，因此所有广播代理在触发时都能看到相同的上下文

这使得每个代理都可以拥有：

- 不同的人格
- 不同的工具访问权限（例如，只读 vs. 可读写）
- 不同的模型（例如，opus vs. sonnet）
- 安装不同的技能

### 示例：隔离会话

在群组 `120363403215116621@g.us` 中，代理为 `["alfred", "baerbel"]`：

<Tabs>
  <Tab title="Alfred 的上下文">
    ```
    Session: agent:alfred:whatsapp:group:120363403215116621@g.us
    History: [user message, alfred's previous responses]
    Workspace: /Users/user/openclaw-alfred/
    Tools: read, write, exec
    ```
  </Tab>
  <Tab title="Bärbel 的上下文">
    ```
    Session: agent:baerbel:whatsapp:group:120363403215116621@g.us
    History: [user message, baerbel's previous responses]
    Workspace: /Users/user/openclaw-baerbel/
    Tools: read only
    ```
  </Tab>
</Tabs>

## 最佳实践

<AccordionGroup>
  <Accordion title="1. 保持代理专注">
    为每个代理设计单一、明确的职责：

    ```json
    {
      "broadcast": {
        "DEV_GROUP": ["formatter", "linter", "tester"]
      }
    }
    ```

    ✅ **好：** 每个代理只负责一件事。❌ **差：** 一个通用的“dev-helper”代理。

  </Accordion>
  <Accordion title="2. 使用描述性名称">
    让每个代理的用途一目了然：

    ```json
    {
      "agents": {
        "security-scanner": { "name": "安全扫描器" },
        "code-formatter": { "name": "代码格式化器" },
        "test-generator": { "name": "测试生成器" }
      }
    }
    ```

  </Accordion>
  <Accordion title="3. 配置不同的工具访问权限">
    只给代理所需的工具：

    ```json
    {
      "agents": {
        "reviewer": {
          "tools": { "allow": ["read", "exec"] }
        },
        "fixer": {
          "tools": { "allow": ["read", "write", "edit", "exec"] }
        }
      }
    }
    ```

    `reviewer` 是只读的。`fixer` 可以读写。

  </Accordion>
  <Accordion title="4. 监控性能">
    当代理很多时，考虑：

    - 使用 `"strategy": "parallel"`（默认）以获得速度
    - 将广播组限制在 5-10 个代理
    - 为更简单的代理使用更快的模型

  </Accordion>
  <Accordion title="5. 优雅地处理失败">
    代理彼此独立失败。一个代理的错误不会阻止其他代理：

    ```
    Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
    Result: Agent A and C respond, Agent B logs error
    ```

  </Accordion>
</AccordionGroup>

## 兼容性

### 提供方

广播组目前适用于：

- ✅ WhatsApp（已实现）
- 🚧 Telegram（计划中）
- 🚧 Discord（计划中）
- 🚧 Slack（计划中）

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

- `GROUP_A`：只有 alfred 回复（正常路由）。
- `GROUP_B`：agent1 和 agent2 都会回复（广播）。

<Note>
**优先级：** `broadcast` 的优先级高于 `bindings`。
</Note>

## 故障排除

<AccordionGroup>
  <Accordion title="代理没有响应">
    **检查：**

    1. 代理 ID 是否存在于 `agents.list` 中。
    2. 对端 ID 格式是否正确（例如，`120363403215116621@g.us`）。
    3. 代理是否不在拒绝列表中。

    **调试：**

    ```bash
    tail -f ~/.openclaw/logs/gateway.log | grep broadcast
    ```

  </Accordion>
  <Accordion title="只有一个代理在响应">
    **原因：** 对端 ID 可能在 `bindings` 中，但不在 `broadcast` 中。

    **修复：** 将其添加到 broadcast 配置中，或从 bindings 中移除。

  </Accordion>
  <Accordion title="性能问题">
    如果在代理较多时变慢：

    - 减少每个组中的代理数量。
    - 使用更轻量的模型（用 sonnet 代替 opus）。
    - 检查沙箱启动时间。

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
        "list": [
          {
            "id": "code-formatter",
            "workspace": "~/agents/formatter",
            "tools": { "allow": ["read", "write"] }
          },
          {
            "id": "security-scanner",
            "workspace": "~/agents/security",
            "tools": { "allow": ["read", "exec"] }
          },
          {
            "id": "test-coverage",
            "workspace": "~/agents/testing",
            "tools": { "allow": ["read", "exec"] }
          },
          { "id": "docs-checker", "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
        ]
      }
    }
    ```

    **用户发送：** 代码片段。

    **响应：**

    - code-formatter: "已修复缩进并添加类型提示"
    - security-scanner: "⚠️ 第 12 行存在 SQL 注入漏洞"
    - test-coverage: "覆盖率为 45%，缺少错误情况的测试"
    - docs-checker: "函数 `process_data` 缺少文档字符串"

  </Accordion>
  <Accordion title="示例 2：多语言支持">
    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "+15555550123": ["detect-language", "translator-en", "translator-de"]
      },
      "agents": {
        "list": [
          { "id": "detect-language", "workspace": "~/agents/lang-detect" },
          { "id": "translator-en", "workspace": "~/agents/translate-en" },
          { "id": "translator-de", "workspace": "~/agents/translate-de" }
        ]
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
  WhatsApp 群组 JID、E.164 号码或其他对等方 ID。值为应该处理消息的代理 ID 数组。
</ParamField>

## 限制

1. **最大代理数：** 没有硬性限制，但 10 个以上的代理可能会变慢。
2. **共享上下文：** 代理不会看到彼此的响应（这是设计如此）。
3. **消息顺序：** 并行响应可能会以任意顺序到达。
4. **速率限制：** 所有代理都会计入 WhatsApp 的速率限制。

## 未来增强

计划中的功能：

- [ ] 共享上下文模式（代理可以看到彼此的响应）
- [ ] 代理协调（代理可以相互发送信号）
- [ ] 动态代理选择（根据消息内容选择代理）
- [ ] 代理优先级（某些代理会先于其他代理响应）

## 相关

- [频道路由](/channels/channel-routing)
- [群组](/channels/groups)
- [多代理沙盒工具](/tools/multi-agent-sandbox-tools)
- [配对](/channels/pairing)
- [会话管理](/concepts/session)
