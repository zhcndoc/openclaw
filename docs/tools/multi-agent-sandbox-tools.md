---
summary: “Per-agent sandbox + tool restrictions, precedence, and examples”
title: Multi-Agent Sandbox & Tools
read_when: “You want per-agent sandboxing or per-agent tool allow/deny policies in a multi-agent gateway.”
status: active
---

# 多代理沙箱与工具配置

Each agent in a multi-agent setup can override the global sandbox and tool
policy. This page covers per-agent configuration, precedence rules, and
examples.

- **Sandbox backends and modes**: see [Sandboxing](/gateway/sandboxing).
- **Debugging blocked tools**: see [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) and `openclaw sandbox explain`.
- **Elevated exec**: see [Elevated Mode](/tools/elevated).

Auth is per-agent: each agent reads from its own `agentDir` auth store at
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`.
Credentials are **not** shared between agents. Never reuse `agentDir` across agents.
If you want to share creds, copy `auth-profiles.json` into the other agent's `agentDir`.

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

每个层级可以进一步限制工具，但不能恢复之前层级已拒绝的工具。
如果设置了 `agents.list[].tools.sandbox.tools`，则会覆盖该代理的 `tools.sandbox.tools`。
如果设置了 `agents.list[].tools.profile`，则覆盖该代理的 `tools.profile`。
供应商工具键可接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）格式。

Tool policies support `group:*` shorthands that expand to multiple tools. See [Tool groups](/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands) for the full list.

Per-agent elevated overrides (`agents.list[].tools.elevated`) can further restrict elevated exec for specific agents. See [Elevated Mode](/tools/elevated) for details.

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

## See also

- [Sandboxing](/gateway/sandboxing) -- full sandbox reference (modes, scopes, backends, images)
- [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) -- debugging "why is this blocked?"
- [Elevated Mode](/tools/elevated)
- [Multi-Agent Routing](/concepts/multi-agent)
- [Sandbox Configuration](/gateway/configuration-reference#agentsdefaultssandbox)
- [Session Management](/concepts/session)
