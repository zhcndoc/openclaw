---
summary: "每个代理的沙箱 + 工具限制、优先级和示例"
title: "多代理沙箱和工具"
sidebarTitle: "多代理沙箱和工具"
read_when: "您需要在多代理网关中使用每代理沙箱或每代理工具 allow/deny 策略。"
status: active
---

多代理设置中的每个代理都可以覆盖全局沙箱和工具策略。本页介绍按代理配置、优先级规则和示例。

<CardGroup cols={3}>
  <Card title="沙箱化" href="/gateway/sandboxing">
    后端和模式——完整的沙箱参考。
  </Card>
  <Card title="Sandbox、工具策略与 elevated" href="/gateway/sandbox-vs-tool-policy-vs-elevated">
    调试“为什么这被阻止了？”
  </Card>
  <Card title="高架模式" href="/tools/elevated">
    为受信任的发送者执行提权。
  </Card>
</CardGroup>

<Warning>
身份验证的范围由代理确定：每个代理都有自己的 `<agentDir>/openclaw-agent.sqlite` 身份验证存储（默认情况下为 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`）。切勿跨代理重复使用 `agentDir`。当代理没有本地配置文件时，可以读取 default/main 代理的身份验证配置文件，但 OAuth 刷新令牌不会克隆到辅助代理存储中。如果手动复制凭据，请仅复制便携式静态 `api_key` 或 `token` 配置文件。
</Warning>

---

## <a id="configuration-examples"></a> 配置示例

<AccordionGroup>
  <Accordion id="example-1-personal-restricted-family-agent" title="示例1：个人+受限家庭智能体">
    ```json
    {
      "agents": {
        "ownership": "explicit",
        "defaults": {
          "heartbeat": { "agentId": "main" },
          "systemAgent": { "agentId": "main" }
        },
        "entries": {
          "main": {
            "name": "Personal Assistant",
            "workspace": "~/.openclaw/workspace",
            "sandbox": { "mode": "off" }
          },
          "family": {
            "name": "Family Bot",
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
        }
      },
      "bindings": [
        {
          "agentId": "family",
          "match": {
            "channel": "whatsapp",
            "accountId": "*",
            "peer": {
              "kind": "group",
              "id": "120363424282127706@g.us"
            }
          }
        },
        {
          "agentId": "main",
          "match": { "channel": "whatsapp", "accountId": "*" }
        }
      ],
      "talk": { "agentId": "main" }
    }
    ```

    **结果：**

    - `main` 代理：在主机上运行，拥有完整的工具访问权限。
    - `family` 代理：在配置的容器沙箱后端中运行（每个代理使用一个容器），仅可使用 `read` 和发送当前对话消息。

  </Accordion>
  <Accordion id="example-2-work-agent-with-shared-sandbox" title="示例 2：具有共享沙箱的工作代理">
    ```json
    {
      "agents": {
        "ownership": "explicit",
        "defaults": {
          "heartbeat": { "agentId": "personal" },
          "systemAgent": { "agentId": "personal" },
          "authInheritance": { "agentId": "personal" }
        },
        "entries": {
          "personal": {
            "workspace": "~/.openclaw/workspace-personal",
            "sandbox": { "mode": "off" }
          },
          "work": {
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
        }
      },
      "talk": { "agentId": "personal" }
    }
    ```
  </Accordion>
  <Accordion id="example-2b-global-coding-profile-messaging-only-agent" title="示例 2b：全局编码配置文件 + 仅消息传递代理">
    ```json
    {
      "tools": { "profile": "coding" },
      "agents": {
        "ownership": "explicit",
        "defaults": {
          "heartbeat": { "agentId": "main" },
          "systemAgent": { "agentId": "main" }
        },
        "entries": {
          "main": {
            "workspace": "~/.openclaw/workspace"
          },
          "support": {
            "tools": { "profile": "messaging", "allow": ["slack"] }
          }
        }
      },
      "talk": { "agentId": "main" }
    }
    ```

    **结果：**

    - `main`继承了全局编码工具配置文件。
    - `support` 代理仅限消息功能（加上 Slack 工具）。

  </Accordion>
  <Accordion id="example-3-different-sandbox-modes-per-agent" title="示例 3：每个代理有不同的沙箱模式">
    ```json
    {
      "agents": {
        "ownership": "explicit",
        "defaults": {
          "heartbeat": { "agentId": "main" },
          "systemAgent": { "agentId": "main" },
          "sandbox": {
            "mode": "non-main",
            "scope": "session"
          }
        },
        "entries": {
          "main": {
            "workspace": "~/.openclaw/workspace",
            "sandbox": {
              "mode": "off"
            }
          },
          "public": {
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
        }
      },
      "talk": { "agentId": "main" }
    }
    ```
  </Accordion>
</AccordionGroup>

---

## <a id="configuration-precedence"></a> 配置优先级

当全局（`agents.defaults.*`）和特定代理（`agents.entries.*.*`）配置同时存在时：

### <a id="sandbox-config"></a> 沙箱配置

特定代理设置会覆盖全局设置：

```text
agents.entries.*.sandbox.mode > agents.defaults.sandbox.mode
agents.entries.*.sandbox.scope > agents.defaults.sandbox.scope
agents.entries.*.sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.entries.*.sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.entries.*.sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.entries.*.sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.entries.*.sandbox.prune.* > agents.defaults.sandbox.prune.*
```

<Note>
对于该代理，`agents.entries.*.sandbox.{docker,browser,prune}.*` 会覆盖 `agents.defaults.sandbox.{docker,browser,prune}.*`（当沙箱范围解析为 `"shared"` 时会被忽略）。`docker` 配置块会配置两个内置容器后端。
</Note>

### <a id="tool-restrictions"></a> 工具限制

过滤顺序如下：

<Steps>
  <Step id="tool-profile" title="刀具轮廓">
    `tools.profile` 或 `agents.entries.*.tools.profile`。
  </Step>
  <Step id="provider-tool-profile" title="提供商工具配置文件">
    `tools.byProvider[provider].profile` 或 `agents.entries.*.tools.byProvider[provider].profile`。
  </Step>
  <Step id="global-tool-policy" title="全球工具政策">
    `tools.allow` / `tools.deny`.
  </Step>
  <Step id="provider-tool-policy" title="提供商工具政策">
    `tools.byProvider[provider].allow/deny`.
  </Step>
  <Step id="agent-specific-tool-policy" title="特定于代理的工具策略">
    `agents.entries.*.tools.allow/deny`.
  </Step>
  <Step id="agent-provider-policy" title="代理提供商政策">
    `agents.entries.*.tools.byProvider[provider].allow/deny`.
  </Step>
  <Step id="sandbox-tool-policy" title="沙箱工具政策">
    `tools.sandbox.tools` 或 `agents.entries.*.tools.sandbox.tools`。
  </Step>
  <Step id="subagent-tool-policy" title="子代理工具策略">
    `tools.subagents.tools`，如适用。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion id="precedence-rules" title="优先规则">
    - 每个层级都可以进一步限制工具，但不能恢复先前层级已拒绝的工具。
    - 如果设置了 `agents.entries.*.tools.sandbox.tools`，它会替代该代理的 `tools.sandbox.tools`。
    - 如果设置了 `agents.entries.*.tools.profile`，它会覆盖该代理的 `tools.profile`。
    - Provider 工具密钥接受 `provider` （e.g. `anthropic`） 或 `provider/model` （e.g. `openai/gpt-5.4`）。

  </Accordion>
  <Accordion id="empty-allowlist-behavior" title="空白名单行为">
    如果该链中的任何显式允许列表导致运行时没有可调用工具，OpenClaw 会在将提示提交给模型之前停止。这是有意为之：若某个代理配置了缺失的工具，例如 `agents.entries.*.tools.allow: ["query_db"]`，那么在注册 `query_db` 的插件启用之前，它应当明确失败，而不是继续作为仅文本代理运行。
  </Accordion>
</AccordionGroup>

工具策略支持会展开为多个工具的 `group:*` 简写。完整列表请参见 [工具组](/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

配置的 MCP 工具使用相同的策略表面。他们的全名是`<safe-server>__<safe-tool>`； glob 可以针对服务器名称空间。例如：

```json5
{
  agents: {
    entries: {
      research: {
        tools: {
          allow: ["docs__read_docs"],
          deny: ["docs__delete_*"],
        },
      },
    },
  },
}
```

每个限制层都与前面的层相交，并且否认总是获胜。 OpenClaw 在首次模型转动之前将生成的原始工具集投影到本机 Claude、Codex 和 Gemini MCP 滤波器中。后端本地名称和设置是实现细节，而不是第二个运营商策略表面。省略了没有允许的工具的 MCP 服务器。限制性目录故障还会忽略该服务器并记录诊断，而不是打开失败。

每个代理的 elevated 覆盖（`agents.entries.*.tools.elevated`）可以进一步限制特定代理的 elevated exec。详情请参见 [Elevated 模式](/tools/elevated)。

---

## <a id="migration-from-single-agent"></a> 从单代理迁移

<Tabs>
  <Tab id="before-single-agent" title="之前（单一智能体）">
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
  <Tab id="after-explicit-agent" title="之后（显式代理）">
    ```json
    {
      "agents": {
        "entries": {
          "main": {
            "workspace": "~/.openclaw/workspace",
            "sandbox": { "mode": "off" }
          }
        }
      }
    }
    ```
  </Tab>
</Tabs>

<Note>
Doctor 将旧版 `agents.list` 名册和 `default` 标记迁移到具有明确表面所有者的 `agents.entries`。直接替换二进制文件后，在启动网关之前运行 `openclaw doctor --fix`。 6 月之前的密钥（例如 `sandbox.perSession`、`embeddedPi` 和 `embeddedHarness`）的迁移已停用；使用 `sandbox.scope`、`embeddedAgent` 和 provider/model 运行时策略。对于较旧的安装，请在安装最新版本之前通过 `2026.9.5`](/install/updating#upgrading-very-old-versions) 进行 [ 升级。
</Note>

---

## <a id="tool-restriction-examples"></a> 工具限制示例

<Tabs>
  <Tab id="read-only-agent" title="只读代理">
    ```json
    {
      "tools": {
        "allow": ["read"],
        "deny": ["exec", "write", "edit", "apply_patch", "process"]
      }
    }
    ```
  </Tab>
  <Tab id="shell-execution-with-filesystem-tools-disabled" title="禁用文件系统工具的 Shell 执行">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```

    <Warning>
    此策略会禁用 OpenClaw 的文件系统工具，但 `exec` 仍然是一个 shell，并且可以在所选主机或沙箱文件系统允许的任何位置写入文件。对于只读代理，请禁止 `exec` 和 `process`，或者将 shell 访问与沙箱文件系统控制结合使用，例如 `agents.defaults.sandbox.workspaceAccess: "ro"` 或 `"none"`。
    </Warning>

  </Tab>
  <Tab id="communication-only" title="仅限通讯">
    此完整配置将工具 allow/deny 策略应用于 `communication` 代理，并为网关上的每个代理设置会话可见性：

    ```json
    {
      "tools": {
        "sessions": { "visibility": "tree" }
      },
      "agents": {
        "entries": {
          "communication": {
            "tools": {
              "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
              "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
            }
          }
        }
      }
    }
    ```

    `tools.sessions.visibility` 是网关范围的，不能为每个代理设置。会话工具默认为 `all`，并开启代理间消息传递。通过 `tree`，调用者可以访问他们当前的会话以及他们生成的会话；主会话仍然可以访问属于其代理的每个会话。隐身限制和沙箱生成会话限制仍然适用。请参见 [`tools.sessions`](/gateway/config-tools#tools-sessions) 和 [`tools.agentToAgent`](/gateway/config-tools#tools-agenttoagent)。

    此配置文件中的 `sessions_history` 仍然返回有界的、经过清理的召回视图，而不是原始转录本转储。助手召回剥离了思维标签、`<relevant-memories>` 包装器、纯文本工具调用 XML 有效负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）、降级的工具调用包装器、泄露ASCII/full-width 模型控制令牌，以及畸形的 MiniMax 工具 - 在截断之前调用 XML。

  </Tab>
</Tabs>

---

## <a id="common-pitfall%3A-%22non-main%22"></a><a id="common-pitfall-non-main"></a> 常见陷阱：“non-main”

<Warning>
`agents.defaults.sandbox.mode: "non-main"` 根据主会话密钥检查会话密钥（始终为 `"main"`；`session.mainKey` 不可由用户配置，并且 OpenClaw 会发出警告并忽略任何其他值），而不是代理 ID。 Group/channel 会话始终获得自己的密钥，因此它们被视为非主会话，并将被沙箱化。如果您希望代理从不沙箱，请设置 `agents.entries.*.sandbox.mode: "off"`。
</Warning>

---

## <a id="testing"></a> 测试

在配置多智能体沙箱和工具之后：

<Steps>
  <Step id="check-agent-resolution" title="检查代理解析">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step id="verify-sandbox-containers" title="验证沙箱容器">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step id="test-tool-restrictions" title="测试工具限制">
    - 发送一条需要受限工具的消息。
    - 验证智能体无法使用被拒绝的工具。

  </Step>
  <Step id="monitor-logs" title="监控日志">
    ```bash
    openclaw logs --follow | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="agent-not-sandboxed-despite-mode-all" title="尽管 `mode: 'all'`，代理并未沙箱化">
    - 检查是否存在全局的 `agents.defaults.sandbox.mode` 覆盖了它。
    - 智能体特定配置具有优先级，因此请设置 `agents.entries.*.sandbox.mode: "all"`。

  </Accordion>
  <Accordion id="tools-still-available-despite-deny-list" title="尽管列入拒绝名单，工具仍然可用">
    - 检查 [完整的过滤顺序](#tool-restrictions)：配置档案 → 提供商配置档案 → 全局策略 → 提供商策略 → 智能体策略 → 智能体提供商策略 → 沙箱 → 子智能体。
    - 每一层只能进一步限制，不能重新授予权限。
    - 参见 [沙箱 vs 工具策略 vs 提权](/gateway/sandbox-vs-tool-policy-vs-elevated) 进行逐步调试。
    - 对于MCP工具，使用OpenClaw显示的提供者安全名称，例如`docs__read_docs`或`docs__*`；不要使用后端的原始配置字段名称。

  </Accordion>
  <Accordion id="container-not-isolated-per-agent" title="每个代理未隔离容器">
    - 默认 `scope` 为 `"agent"`（每个代理 ID 一个容器）。
    - 将 `scope: "session"` 设置为每个会话一个容器，或将 `scope: "shared"` 设置为在多个智能体之间复用一个容器。

  </Accordion>
</AccordionGroup>

---

## <a id="related"></a> 相关内容

- [提升模式](/tools/elevated)
- [多代理路由](/concepts/multi-agent)
- [沙箱配置](/gateway/config-agents/sandbox#agentsdefaultssandbox)
- [沙箱 vs 工具策略 vs 提升模式](/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试“为什么这被阻止？”
- [沙箱化](/gateway/sandboxing) — 完整的沙箱参考（模式、作用域、后端、镜像）
- [会话管理](/concepts/session)
- [OpenShell](/gateway/openshell) — 每个代理沙箱可以委托给的托管沙箱后端
- [ACP 代理](/tools/acp-agents) — 单独的边界：OpenClaw 沙箱策略不包装 ACP harness执行
- [Sub-agents](/tools/subagents) — 这些限制所产生的会话
