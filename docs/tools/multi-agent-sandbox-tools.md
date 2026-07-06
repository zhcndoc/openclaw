---
summary: "每个代理的沙箱 + 工具限制、优先级和示例"
title: "多代理沙箱和工具"
sidebarTitle: "多代理沙箱和工具"
read_when: "你想在多代理网关中为每个代理配置沙箱，或为每个代理设置工具允许/拒绝策略。"
status: active
---

多代理设置中的每个代理都可以覆盖全局沙箱和工具策略。本页介绍按代理配置、优先级规则和示例。

<CardGroup cols={3}>
  <Card title="沙箱" href="/gateway/sandboxing">
    后端和模式——完整的沙箱参考。
  </Card>
  <Card title="沙箱 vs 工具策略 vs 提权" href="/gateway/sandbox-vs-tool-policy-vs-elevated">
    调试“为什么这被阻止了？”
  </Card>
  <Card title="提权模式" href="/tools/elevated">
    为受信任的发送者执行提权。
  </Card>
</CardGroup>

<Warning>
身份验证按代理作用域划分：每个代理都有自己位于 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` 的 `agentDir` 身份验证存储。切勿在不同代理之间复用 `agentDir`。当代理没有本地配置文件时，它们可以读取默认/主代理的身份验证配置文件，但 OAuth 刷新令牌不会被克隆到次级代理存储中。如果你手动复制凭据，只复制可移植的静态 `api_key` 或 `token` 配置文件。
</Warning>

---

## 配置示例

<AccordionGroup>
  <Accordion title="示例 1：个人代理 + 受限的家庭代理">
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
              "allow": ["read", "message"],
              "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"],
              "message": {
                "crossContext": {
                  "allowWithinProvider": false,
                  "allowAcrossProviders": false
                }
              }
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

    - `main` 代理：运行在宿主机上，拥有完整工具访问权限。
    - `family` 代理：运行在 Docker 中（每个代理一个容器），仅可使用 `read` 和当前会话消息发送。

  </Accordion>
  <Accordion title="示例 2：具有共享沙箱的工作代理">
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
  </Accordion>
  <Accordion title="示例 2b：全局编码配置文件 + 仅消息代理">
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

    - 默认代理使用编码工具。
    - `support` 代理仅限消息功能（加上 Slack 工具）。

  </Accordion>
  <Accordion title="示例 3：每个代理使用不同的沙箱模式">
    ```json
    {
      "agents": {
        "defaults": {
          "sandbox": {
            "mode": "non-main",
            "scope": "session"
          }
        },
        "list": [
          {
            "id": "main",
            "workspace": "~/.openclaw/workspace",
            "sandbox": {
              "mode": "off"
            }
          },
          {
            "id": "public",
            "workspace": "~/.openclaw/workspace-public",
            "sandbox": {
              "mode": "all",
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
  </Accordion>
</AccordionGroup>

---

## 配置优先级

当全局（`agents.defaults.*`）和特定代理（`agents.list[].*`）配置同时存在时：

### 沙箱配置

特定代理设置会覆盖全局设置：

```text
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

<Note>
`agents.list[].sandbox.{docker,browser,prune}.*` 会覆盖该代理的 `agents.defaults.sandbox.{docker,browser,prune}.*`（当沙箱 scope 解析为 `"shared"` 时会被忽略）。
</Note>

### 工具限制

过滤顺序如下：

<Steps>
  <Step title="工具配置文件">
    `tools.profile` 或 `agents.list[].tools.profile`。
  </Step>
  <Step title="提供方工具配置文件">
    `tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`。
  </Step>
  <Step title="全局工具策略">
    `tools.allow` / `tools.deny`。
  </Step>
  <Step title="提供方工具策略">
    `tools.byProvider[provider].allow/deny`。
  </Step>
  <Step title="特定代理工具策略">
    `agents.list[].tools.allow/deny`。
  </Step>
  <Step title="代理提供方策略">
    `agents.list[].tools.byProvider[provider].allow/deny`。
  </Step>
  <Step title="沙箱工具策略">
    `tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`。
  </Step>
  <Step title="子代理工具策略">
    `tools.subagents.tools`，如适用。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="优先级规则">
    - 每一级都可以进一步限制工具，但不能恢复早先级别已拒绝的工具。
    - 如果设置了 `agents.list[].tools.sandbox.tools`，它会替换该代理的 `tools.sandbox.tools`。
    - 如果设置了 `agents.list[].tools.profile`，它会覆盖该代理的 `tools.profile`。
    - 提供方工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。
  </Accordion>
  <Accordion title="空允许列表行为">
    如果该链中的任何显式允许列表使运行最终没有可调用工具，OpenClaw 会在将提示提交给模型之前停止。这是有意为之：如果某个代理配置了缺失的工具，例如 `agents.list[].tools.allow: ["query_db"]`，它应该在注册 `query_db` 的插件未启用时明确失败，而不是继续作为纯文本代理运行。
  </Accordion>
</AccordionGroup>

工具策略支持会展开为多个工具的 `group:*` 简写。完整列表请参见 [工具组](/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

按代理的提权覆盖（`agents.list[].tools.elevated`）可以进一步限制特定代理的提权执行。详情请参见 [提权模式](/tools/elevated)。

---

## 从单代理迁移

<Tabs>
  <Tab title="迁移前（单代理）">
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
  </Tab>
  <Tab title="迁移后（多代理）">
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
  </Tab>
</Tabs>

<Note>
旧版 `agents.defaults.*`/`agents.list[].*` 配置键（例如 `sandbox.perSession`、`agentRuntime`、`embeddedPi`）会由 `openclaw doctor` 迁移；今后请优先使用 `agents.defaults` + `agents.list`。
</Note>

---

## Tool Limitations Examples

<Tabs>
  <Tab title="Read-only Agent">
    ```json
    {
      "tools": {
        "allow": ["read"],
        "deny": ["exec", "write", "edit", "apply_patch", "process"]
      }
    }
    ```
  </Tab>
  <Tab title="Disable Shell Execution for File System Tools">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```

    <Warning>
    This policy disables OpenClaw's file system tools, but `exec` is still a shell and can write files anywhere allowed by the selected host or sandbox file system. For a read-only agent, deny `exec` and `process`, or combine shell access with sandbox file system controls, such as `agents.defaults.sandbox.workspaceAccess: "ro"` or `"none"`.
    </Warning>

  </Tab>
  <Tab title="Communication Only">
    ```json
    {
      "tools": {
        "sessions": { "visibility": "tree" },
        "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
        "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
      }
    }
    ```

    `sessions_history` in this configuration file still returns a limited, sanitized memory view rather than the raw transcript output. Assistant memories remove thinking tags, `<relevant-memories>` scaffolding, plain-text tool call XML payloads (including `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, and truncated tool call blocks), degraded tool call scaffolding, leaked ASCII/full-width model control tokens, and malformed MiniMax tool call XML before sanitization.
  </Tab>
</Tabs>

---

## 常见陷阱：“non-main”

<Warning>
`agents.defaults.sandbox.mode: "non-main"` 会将会话密钥与主会话密钥进行检查（始终为 `"main"`；`session.mainKey` 不是用户可配置的，OpenClaw 会对任何其他值发出警告并忽略），而不是与 agent id 进行检查。群组/频道会话总是会获得自己的密钥，因此它们会被视为 non-main 并进入沙箱。如果你希望某个 agent 永远不进入沙箱，请将 `agents.list[].sandbox.mode: "off"`。
</Warning>

---

## 测试

在配置多智能体沙箱和工具之后：

<Steps>
  <Step title="检查智能体解析">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step title="验证沙箱容器">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step title="测试工具限制">
    - 发送一条需要受限工具的消息。
    - 验证智能体无法使用被拒绝的工具。

  </Step>
  <Step title="监控日志">
    ```bash
    openclaw logs --follow | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## 故障排查

<AccordionGroup>
  <Accordion title="尽管设置了 `mode: 'all'`，智能体仍未被沙箱化">
    - 检查是否存在全局的 `agents.defaults.sandbox.mode` 覆盖了它。
    - 智能体特定配置具有更高优先级，因此请设置 `agents.list[].sandbox.mode: "all"`。

  </Accordion>
  <Accordion title="尽管在拒绝列表中，工具仍然可用">
    - 检查 [完整的过滤顺序](#tool-restrictions)：profile → provider profile → global policy → provider policy → agent policy → agent provider policy → sandbox → subagent。
    - 每一层只能进一步限制，不能重新授予权限。
    - 参见 [Sandbox vs tool policy vs elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) 进行逐步调试。

  </Accordion>
  <Accordion title="容器未按智能体隔离">
    - 默认 `scope` 为 `"agent"`（每个 agent id 对应一个容器）。
    - 将 `scope: "session"` 设置为每个会话一个容器，或将 `scope: "shared"` 设置为在多个智能体之间复用一个容器。

  </Accordion>
</AccordionGroup>

---

## 相关内容

- [提升模式](/tools/elevated)
- [多智能体路由](/concepts/multi-agent)
- [沙箱配置](/gateway/config-agents#agentsdefaultssandbox)
- [沙箱 vs 工具策略 vs 提升模式](/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试“为什么这被阻止？”
- [沙箱化](/gateway/sandboxing) — 完整的沙箱参考（模式、作用域、后端、镜像）
- [会话管理](/concepts/session)
