---
summary: "提权执行模式：允许沙箱内的代理在沙箱外运行命令"
read_when:
  - 调整提权模式默认值、允许列表或斜杠命令行为
  - 了解沙箱化代理如何访问主机
title: "提权模式"
---

当代理在沙箱内运行时，它的 `exec` 命令会被限制在沙箱环境中。**提权模式** 允许代理突破沙箱，在外部运行命令，并带有可配置的审批门控。

<Info>
  只有当代理是**沙箱化**时，提权模式才会改变行为。对于未沙箱化的代理，`exec` 已经直接在主机上运行。
</Info>

## 指令

通过斜杠命令按会话控制提权模式：

| 指令             | 作用                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `/elevated on`   | 在配置的主机路径上于沙箱外运行，并保留审批                               |
| `/elevated ask`  | 与 `on` 相同（别名）                                                  |
| `/elevated full` | 在配置的主机路径上于沙箱外运行并跳过审批                                 |
| `/elevated off`  | 恢复为仅在沙箱内执行                                                   |

也可用 `/elev on|off|ask|full`。

发送不带参数的 `/elevated` 可查看当前级别。

## 工作原理

<Steps>
  <Step title="检查可用性">
    必须在配置中启用提权功能，并且发送者必须在允许列表中：

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
    发送仅包含指令的消息来设置会话默认值：

    ```
    /elevated full
    ```

    或以内联方式使用（仅对该消息生效）：

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="命令在沙箱外运行">
    当提权处于激活状态时，`exec` 调用会离开沙箱。默认有效主机是
    `gateway`，或者当配置/会话的 exec 目标是
    `node` 时则为 `node`。在 `full` 模式下，会跳过 exec 审批。在 `on`/`ask` 模式下，
    已配置的审批规则仍然适用。
  </Step>
</Steps>

## 决策顺序

1. 消息中的**内联指令**（仅对该消息生效）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性和允许列表

- **全局门控**：`tools.elevated.enabled`（必须为 `true`）
- **发送者允许列表**：`tools.elevated.allowFrom`，按通道分别列出
- **按代理门控**：`agents.list[].tools.elevated.enabled`（只能进一步限制）
- **按代理允许列表**：`agents.list[].tools.elevated.allowFrom`（发送者必须同时匹配全局 + 按代理）
- **Discord 回退**：如果省略 `tools.elevated.allowFrom.discord`，则使用 `channels.discord.allowFrom` 作为回退
- **所有门控都必须通过**；否则会将提权视为不可用

允许列表条目格式：

| 前缀                    | 匹配内容                        |
| ----------------------- | ------------------------------- |
| （无）                  | 发送者 ID、E.164 或 From 字段   |
| `name:`                 | 发送者显示名称                  |
| `username:`             | 发送者用户名                    |
| `tag:`                  | 发送者标签                      |
| `id:`, `from:`, `e164:` | 显式身份目标                    |

## 提权不控制的内容

- **工具策略**：如果工具策略拒绝 `exec`，提权无法覆盖
- **主机选择策略**：提权不会把 `auto` 变成自由的跨主机覆盖。它会使用配置/会话的 exec 目标规则，仅在目标已经是 `node` 时选择 `node`。
- **与 `/exec` 分离**：`/exec` 指令会为已授权发送者调整按会话的 exec 默认值，并且不需要提权模式

## 相关内容

- [Exec 工具](/tools/exec) — shell 命令执行
- [Exec 审批](/tools/exec-approvals) — 审批和允许列表系统
- [沙箱化](/gateway/sandboxing) — 沙箱配置
- [沙箱 vs 工具策略 vs 提权](/gateway/sandbox-vs-tool-policy-vs-elevated)
