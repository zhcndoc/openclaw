---
summary: "向多个代理广播 WhatsApp 消息"
read_when:
  - 配置广播组
  - 调试 WhatsApp 中的多代理回复
status: experimental
title: "广播组"
---

# 广播组

**状态：** 实验性  
**版本：** 2026.1.9 新增

## 概述

广播组允许多个代理同时处理并回复同一条消息。这使您能够创建专门的代理团队，在单个 WhatsApp 群组或私聊中协同工作——且都使用同一个电话号码。

当前范围：**仅限 WhatsApp**（web 频道）。

广播组的评估是在频道白名单和群组激活规则之后进行的。在 WhatsApp 群组中，这意味着广播在 OpenClaw 通常回复时发生（例如：当被提及，具体取决于您的群组设置）。

## 使用场景

### 1. 专业代理团队

部署多个代理，各司其职：

```
群组: "开发团队"
代理:
  - CodeReviewer（代码审查）
  - DocumentationBot（生成文档）
  - SecurityAuditor（安全审计）
  - TestGenerator（测试用例建议）
```

每个代理处理同一条消息，并提供其专属视角。

### 2. 多语言支持

```
群组: "国际支持"
代理:
  - Agent_EN（英文回复）
  - Agent_DE（德文回复）
  - Agent_ES（西班牙文回复）
```

### 3. 质量保证工作流程

```
群组: "客户支持"
代理:
  - SupportAgent（提供答案）
  - QAAgent（审核质量，仅在发现问题时回复）
```

### 4. 任务自动化

```
群组: "项目管理"
代理:
  - TaskTracker（更新任务数据库）
  - TimeLogger（记录工时）
  - ReportGenerator（生成总结）
```

## 配置

### 基础设置

添加顶层的 `broadcast` 部分（与 `bindings` 并列）。键为 WhatsApp 对等体 ID：

- 群聊：群组 JID（例如 `120363403215116621@g.us`）
- 私聊：E.164 号码（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**效果：** 当 OpenClaw 在此聊天中回复时，会运行这三个代理。

### 处理策略

控制代理处理消息的方式：

#### 并行（默认）

所有代理同时处理：

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

#### 顺序

代理按顺序处理（后者等待前者完成）：

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
    "list": [
      {
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "security-auditor",
        "name": "Security Auditor",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "docs-generator",
        "name": "Documentation Generator",
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

1. **收到消息**，进入 WhatsApp 群组  
2. **广播检查**：系统检查对等体 ID 是否在 `broadcast` 中  
3. **如果在广播列表中**：
   - 所有列出的代理处理该消息
   - 每个代理拥有自己的会话密钥和独立上下文
   - 代理并行（默认）或顺序处理  
4. **如果不在广播列表中**：
   - 正常路由（匹配第一个绑定）

注意：广播组不会绕过频道白名单或群组激活规则（提及/命令等）。仅改变_处理消息时启动哪些代理_。

### 会话隔离

广播组中每个代理完全独立：

- **会话密钥**（如 `agent:alfred:whatsapp:group:120363...` 与 `agent:baerbel:whatsapp:group:120363...`）
- **对话历史**（代理看不到其他代理的消息）
- **工作空间**（配置时各自沙箱）
- **工具访问权限**（各自允许/禁止列表）
- **记忆/上下文**（独立的 IDENTITY.md、SOUL.md 等）
- **群组上下文缓冲区**（最近群组消息共用，每个对等体共享，确保所有广播代理触发时看到相同上下文）

这允许每个代理拥有：

- 不同人格  
- 不同工具访问（例如只读与读写）  
- 不同模型（如 opus 与 sonnet）  
- 不同的技能插件

### 示例：隔离会话

在群组 `120363403215116621@g.us` 中，代理列表为 `["alfred", "baerbel"]`：

**Alfred 的上下文：**

```
会话：agent:alfred:whatsapp:group:120363403215116621@g.us
历史：[用户消息，alfred的前次回复]
工作空间：/Users/pascal/openclaw-alfred/
工具：读、写、执行权限
```

**Bärbel 的上下文：**

```
会话：agent:baerbel:whatsapp:group:120363403215116621@g.us
历史：[用户消息，baerbel的前次回复]
工作空间：/Users/pascal/openclaw-baerbel/
工具：只读权限
```

## 最佳实践

### 1. 让代理职能专注

设计每个代理负责单一、明确职责：

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **良好：** 每个代理只承担一项工作  
❌ **不佳：** 单一泛用“开发助手”代理

### 2. 使用描述性名称

让代理职责一目了然：

```json
{
  "agents": {
    "security-scanner": { "name": "安全扫描器" },
    "code-formatter": { "name": "代码格式器" },
    "test-generator": { "name": "测试生成器" }
  }
}
```

### 3. 配置不同的工具访问权限

授权代理仅能使用所需工具：

```json
{
  "agents": {
    "reviewer": {
      "tools": { "allow": ["read", "exec"] } // 只读
    },
    "fixer": {
      "tools": { "allow": ["read", "write", "edit", "exec"] } // 读写
    }
  }
}
```

### 4. 监控性能

针对代理多时建议：

- 使用 `"strategy": "parallel"`（默认）以提高速度  
- 广播组人数限制在 5-10 个代理  
- 简单代理使用速度更快的模型

### 5. 优雅处理失败

代理独立失败，一个代理出错不会阻塞其他：

```
消息 → [代理 A ✓, 代理 B ✗ 出错, 代理 C ✓]
结果：代理 A 和 C 回复，代理 B 记录错误
```

## 兼容性

### 平台支持

广播组当前支持：

- ✅ WhatsApp（已实现）  
- 🚧 Telegram（计划中）  
- 🚧 Discord（计划中）  
- 🚧 Slack（计划中）

### 路由

广播组与现有路由并存：

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

- `GROUP_A`：仅 alfred 回复（正常路由）  
- `GROUP_B`：agent1 和 agent2 同时回复（广播）

**优先级：** 广播配置优先于绑定。

## 故障排除

### 代理无响应

**检查：**

1. 代理 ID 存在于 `agents.list`  
2. 对等体 ID 格式正确（如 `120363403215116621@g.us`）  
3. 代理未被列入拒绝列表  

**调试：**

```bash
tail -f ~/.openclaw/logs/gateway.log | grep broadcast
```

### 仅一个代理回复

**原因：** 对等体 ID 可能存在于 `bindings`，但未配置于 `broadcast`。

**解决：** 添加到广播配置或移除绑定。

### 性能问题

**代理过多导致缓慢时：**

- 减少每组代理数量  
- 使用更轻量模型（sonnet 代替 opus）  
- 检查沙箱启动时间

## 示例

### 示例 1：代码审核团队

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

**用户发送：** 代码片段  
**回复示例：**

- code-formatter: "修正了缩进并添加了类型提示"  
- security-scanner: "⚠️ 第12行存在 SQL 注入漏洞"  
- test-coverage: "覆盖率为 45%，缺少错误案例测试"  
- docs-checker: "函数 `process_data` 缺少文档字符串"

### 示例 2：多语言支持

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

### 字段说明

- `strategy`（可选）：代理处理方式
  - `"parallel"`（默认）：所有代理同时处理  
  - `"sequential"`：按照数组顺序依次处理  
- `[peerId]`：WhatsApp 群组 JID、E.164 号码或其他对等体 ID  
  - 值：应处理消息的代理 ID 数组

## 限制

1. **最大代理数：** 无硬性限制，但超过 10 个代理可能性能下降  
2. **上下文隔离：** 代理看不到彼此回复（设计如此）  
3. **消息顺序：** 并行回复可能顺序不定  
4. **速率限制：** 所有代理共同计入 WhatsApp 速率限制

## 未来计划

计划功能：

- [ ] 共享上下文模式（代理可见彼此回复）  
- [ ] 代理协作（代理间可发送信号）  
- [ ] 动态代理选择（根据消息内容选择代理）  
- [ ] 代理优先级（部分代理优先回复）

## 参见

- [多代理配置](/tools/multi-agent-sandbox-tools)
- [路由配置](/channels/channel-routing)
- [会话管理](/concepts/session)
