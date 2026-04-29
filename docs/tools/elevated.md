---
summary: "从沙箱代理中以提升权限模式运行命令，在沙箱外执行 exec"
read_when:
  - 调整提升模式默认值、允许列表或斜杠命令行为
  - 了解沙箱代理如何访问宿主机
title: "提升模式"
---

当代理在沙箱内运行时，它的 `exec` 命令会被限制在沙箱环境中。**提升模式** 允许代理突破沙箱，改为在沙箱外运行命令，并可配置审批门控。

<Info>
  只有当代理处于**沙箱化**状态时，提升模式才会改变行为。对于未沙箱化的代理，exec 本来就会在宿主机上运行。
</Info>

## 指令

通过斜杠命令按会话控制提升模式：

| 指令             | 作用                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `/elevated on`   | 在配置的宿主路径上于沙箱外运行，并保留审批                           |
| `/elevated ask`  | 与 `on` 相同（别名）                                                 |
| `/elevated full` | 在配置的宿主路径上于沙箱外运行，并跳过审批                           |
| `/elevated off`  | 恢复为仅在沙箱内执行                                                 |

也可使用 `/elev on|off|ask|full`。

发送不带参数的 `/elevated` 可查看当前级别。

## 工作原理

<Steps>
  <Step title="检查可用性">
    必须在配置中启用 elevated，且发送者必须在允许列表中：

    ```json5
    {
      tools: {
        elevated: {
          enabled: true,
          allowFrom: {
            discord: ["user-id-123"],
            whatsapp: ["+15555550123"],
          },
        },
      },
    }
    ```

  </Step>

  <Step title="设置级别">
    发送仅包含指令的消息以设置会话默认值：

    ```
    /elevated full
    ```

    或以内联方式使用（仅适用于该消息）：

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="命令在沙箱外运行">
    启用 elevated 后，`exec` 调用会离开沙箱。有效宿主默认为
    `gateway`，但当配置/会话的 exec 目标为 `node` 时则使用 `node`。在 `full` 模式下，会跳过 exec 审批。在 `on`/`ask` 模式下，仍会应用已配置的审批规则。
  </Step>
</Steps>

## 解析顺序

1. 消息中的**内联指令**（仅适用于该消息）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性和允许列表

- **全局门控**：`tools.elevated.enabled`（必须为 `true`）
- **发送者允许列表**：`tools.elevated.allowFrom`，按频道分别配置列表
- **每个代理的门控**：`agents.list[].tools.elevated.enabled`（只能进一步限制）
- **每个代理的允许列表**：`agents.list[].tools.elevated.allowFrom`（发送者必须同时匹配全局 + 每个代理的规则）
- **Discord 回退**：如果省略 `tools.elevated.allowFrom.discord`，则使用 `channels.discord.allowFrom` 作为回退
- **所有门控都必须通过**；否则 elevated 会被视为不可用

允许列表条目格式：

| 前缀                    | 匹配内容                        |
| ----------------------- | ------------------------------- |
| （无）                  | 发送者 ID、E.164，或 From 字段 |
| `name:`                 | 发送者显示名称                 |
| `username:`             | 发送者用户名                   |
| `tag:`                  | 发送者标签                     |
| `id:`, `from:`, `e164:` | 显式身份标识目标               |

## elevated 不控制的内容

- **工具策略**：如果 `exec` 被工具策略拒绝，elevated 无法绕过
- **宿主选择策略**：elevated 不会将 `auto` 变成可自由跨宿主覆盖。它使用已配置/会话的 exec 目标规则，仅在目标已经是 `node` 时选择 `node`
- **与 `/exec` 分离**：`/exec` 指令会为已授权发送者调整每个会话的 exec 默认值，并且不需要 elevated 模式

## 相关内容

- [Exec 工具](/tools/exec) — shell 命令执行
- [Exec 审批](/tools/exec-approvals) — 审批和允许列表系统
- [沙箱化](/gateway/sandboxing) — 沙箱配置
- [沙箱 vs 工具策略 vs 提升模式](/gateway/sandbox-vs-tool-policy-vs-elevated)
