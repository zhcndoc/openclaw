---
summary: “每个代理的沙箱 + 工具限制、优先级和示例”
title: 多代理沙箱与工具
read_when: “你希望在多代理网关中为每个代理单独设置沙箱或工具允许/拒绝策略。”
status: active
---

# 多代理沙箱与工具配置

多代理设置中的每个代理都可以覆盖全局沙箱和工具策略。本文介绍按代理配置、优先级规则和示例。

- **沙箱后端和模式**：见 [Sandboxing](/gateway/sandboxing)。
- **调试被阻止的工具**：见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) 和 `openclaw sandbox explain`。
- **提升权限执行**：见 [Elevated Mode](/tools/elevated)。

认证按代理隔离：每个代理都从自己的 `agentDir` 认证存储中读取，路径为
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`。
凭据**不会**在代理之间共享。切勿在不同代理之间复用 `agentDir`。
如果你想共享凭据，请将 `auth-profiles.json` 复制到另一个代理的 `agentDir` 中。

---

## 配置示例

### 示例 1：个人 + 限制型家庭代理

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "个人助手",
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "family",
        "name": "家庭机器人",
        "workspace": "~/.openclaw/workspace-family",
        "sandbox": {
          "mode": "all",
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"]
        }
      }
    ]
  },
  "bindings": [
    {
      "agentId": "family",
      "match": {
        "provider": "whatsapp",
        "accountId": "*",
        "peer": {
          "kind": "group",
          "id": "120363424282127706@g.us"
        }
      }
    }
  ]
}
```

**结果：**

- `main` 代理：在主机运行，拥有完整工具访问权限
- `family` 代理：在 Docker 中运行（每个代理一个容器），仅允许使用 `read` 工具

---

### 示例 2：工作代理使用共享沙箱

```json
{
  "agents": {
    "list": [
      {
        "id": "personal",
        "workspace": "~/.openclaw/workspace-personal",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "work",
        "workspace": "~/.openclaw/workspace-work",
        "sandbox": {
          "mode": "all",
          "scope": "shared",
          "workspaceRoot": "/tmp/work-sandboxes"
        },
        "tools": {
          "allow": ["read", "write", "apply_patch", "exec"],
          "deny": ["browser", "gateway", "discord"]
        }
      }
    ]
  }
}
```

---

### 示例 2b：全局编码配置 + 仅消息代理

```json
{
  "tools": { "profile": "coding" },
  "agents": {
    "list": [
      {
        "id": "support",
        "tools": { "profile": "messaging", "allow": ["slack"] }
      }
    ]
  }
}
```

**结果：**

- 默认代理使用编码工具集
- `support` 代理仅限消息工具（含 Slack）

---

### 示例 3：不同代理不同沙箱模式

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main", // 全局默认
        "scope": "session"
      }
    },
    "list": [
      {
        "id": "main",
        "workspace": "~/.openclaw/workspace",
        "sandbox": {
          "mode": "off" // 覆盖：main 始终不沙箱化
        }
      },
      {
        "id": "public",
        "workspace": "~/.openclaw/workspace-public",
        "sandbox": {
          "mode": "all", // 覆盖：public 始终沙箱化
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch"]
        }
      }
    ]
  }
}
```

---

## 配置优先级

当全局 (`agents.defaults.*`) 和特定代理 (`agents.list[].*`) 配置同时存在时：

### 沙箱配置

代理特定设置优先覆盖全局：

```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**注意：**

- `agents.list[].sandbox.{docker,browser,prune}.*` 会覆盖对应的全局设置（当沙箱作用域为 `"shared"` 时忽略）。

### 工具限制

过滤顺序为：

1. **工具配置文件** (`tools.profile` 或 `agents.list[].tools.profile`)
2. **供应商工具配置文件** (`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`)
3. **全局工具策略** (`tools.allow` / `tools.deny`)
4. **供应商工具策略** (`tools.byProvider[provider].allow/deny`)
5. **代理专属工具策略** (`agents.list[].tools.allow/deny`)
6. **代理供应商工具策略** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **沙箱工具策略** (`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`)
8. **子代理工具策略**（`tools.subagents.tools`，如适用）

每一层都可以进一步限制工具，但不能恢复前面层级中已被拒绝的工具。
如果设置了 `agents.list[].tools.sandbox.tools`，它会替换该代理的 `tools.sandbox.tools`。
如果设置了 `agents.list[].tools.profile`，它会覆盖该代理的 `tools.profile`。
供应商工具键可以接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

如果该链路中的任何显式允许列表最终让本次运行没有任何可调用工具，
OpenClaw 会在将提示提交给模型之前停止。这是有意为之：
配置了缺失工具（例如
`agents.list[].tools.allow: ["query_db"]`）的代理应当在注册 `query_db` 的插件未启用时直接报错，
而不是继续作为纯文本代理运行。

工具策略支持 `group:*` 简写，会展开为多个工具。完整列表见 [Tool groups](/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

按代理的提升权限覆盖（`agents.list[].tools.elevated`）可以进一步限制特定代理的提升执行。详情见 [Elevated Mode](/tools/elevated)。

---

## 从单代理迁移

**之前（单代理）：**

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "sandbox": {
        "mode": "non-main"
      }
    }
  },
  "tools": {
    "sandbox": {
      "tools": {
        "allow": ["read", "write", "apply_patch", "exec"],
        "deny": []
      }
    }
  }
}
```

**之后（多代理不同配置）：**

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      }
    ]
  }
}
```

旧式 `agent.*` 配置由 `openclaw doctor` 迁移；今后推荐使用 `agents.defaults` + `agents.list`。

---

## 工具限制示例

### 只读代理

```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### 安全执行代理（不修改文件）

```json
{
  "tools": {
    "allow": ["read", "exec", "process"],
    "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

### 仅通讯代理

```json
{
  "tools": {
    "sessions": { "visibility": "tree" },
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

此配置中的 `sessions_history` 仍会返回一个有边界、经过清理的回忆视图，而不是原始转录内容。Assistant 回忆会移除思考标签、
`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷
（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 以及被截断的工具调用块）、
降级的工具调用脚手架、泄露的 ASCII/全角模型控制
token，以及格式错误的 MiniMax 工具调用 XML，然后再进行脱敏/截断。

---

## 常见陷阱：“non-main”

`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认是 `"main"`），
而非代理 ID。群组/频道会话会始终有自己独立的键，因此被视为非主，会被沙箱化。
若想让某个代理从不沙箱化，请设置 `agents.list[].sandbox.mode: "off"`。

---

## 测试

配置多代理沙箱与工具后：

1. **检查代理解析：**

   ```exec
   openclaw agents list --bindings
   ```

2. **验证沙箱容器：**

   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **测试工具限制：**
   - 发送需受限工具的消息
   - 验证代理无法使用被拒绝的工具

4. **监视日志：**

   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 故障排查

### 代理未沙箱化，尽管 `mode: "all"`

- 检查是否有全局的 `agents.defaults.sandbox.mode` 覆盖了设置
- 代理特定配置优先，请设置 `agents.list[].sandbox.mode: "all"`

### 尽管有拒绝列表，工具仍可用

- 检查工具过滤顺序：全局 → 代理 → 沙箱 → 子代理
- 各层级只能进一步限制，不能恢复之前已拒绝工具
- 查看日志验证：`[tools] filtering tools for agent:${agentId}`

### 容器未按代理隔离

- 在代理特定沙箱配置中设置 `scope: "agent"`
- 默认是 `"session"`，每个会话创建一个容器

---

## 相关内容

- [Sandboxing](/gateway/sandboxing) -- 完整沙箱参考（模式、作用域、后端、镜像）
- [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试“为什么被阻止？”
- [Elevated Mode](/tools/elevated)
- [Multi-Agent Routing](/concepts/multi-agent)
- [Sandbox Configuration](/gateway/config-agents#agentsdefaultssandbox)
- [Session Management](/concepts/session)
