---
summary: "从沙箱代理中以提升权限模式运行命令，在沙箱外执行 exec"
read_when:
  - 调整提升模式默认值、允许列表或斜杠命令行为
  - 了解沙箱代理如何访问宿主机
title: "提升模式"
---

当代理在沙箱中运行时，其 `exec` 命令仅限于沙箱环境。**提升模式**允许代理突破沙箱，并在其外部运行命令，同时支持可配置的审批门控。

<Info>
  提升模式仅在代理处于**沙箱化**状态时才会改变行为。对于未沙箱化的代理，exec 已经在宿主机上运行。
</Info>

## 指令

通过斜杠命令按会话控制提升模式：

| 指令 | 作用 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/elevated on`   | 在配置的主机路径上于沙箱外运行，保留审批                                                             |
| `/elevated ask`  | 与 `on` 相同（别名）                                                                                                            |
| `/elevated full` | 在配置的主机路径上于沙箱外运行，并在模式/主机审批策略已经宽松时跳过审批 |
| `/elevated off`  | 返回到受沙箱限制的执行                                                                                            |

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

  <Step title="在沙箱外运行命令">
    启用 elevated 后，`exec` 调用会离开沙箱。默认情况下，有效主机是
    `gateway`；当配置/会话的 exec 目标为
    `node` 时，有效主机为 `node`。在 `full` 模式下，如果解析后的 exec
    模式/主机审批策略已经是完全宽松（安全级别 `full`，`ask` 为 `off`），则会跳过 exec 审批；否则仍适用正常的审批策略。在
    `on`/`ask` 模式下，始终适用已配置的审批规则。
  </Step>
</Steps>

## 解析顺序

1. 消息中的**内联指令**（仅适用于该消息）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性和允许列表

- **全局开关**: `tools.elevated.enabled`（必须为 `true`）
- **发送者允许列表**: `tools.elevated.allowFrom`，按频道分别配置列表
- **每个代理的开关**: `agents.list[].tools.elevated.enabled`（只能进一步限制；全局和每个代理的开关都必须为 `true`）
- **每个代理的允许列表**: `agents.list[].tools.elevated.allowFrom`（发送者必须同时匹配全局 + 每个代理）
- **频道提供的回退允许列表**: 频道插件可以通过 SDK 适配器钩子可选地提供一个回退允许列表，当 `tools.elevated.allowFrom.<provider>` 未配置时使用。目前没有内置频道实现此钩子，因此实际上现在每个提供方都需要显式配置 `tools.elevated.allowFrom.<provider>` 条目。
- **所有开关都必须通过**；否则 elevated 会被视为不可用

允许列表条目格式：

| 前缀                    | 匹配内容                        |
| ----------------------- | ------------------------------- |
| （无）                  | 发送者 ID、E.164，或 From 字段 |
| `name:`                 | 发送者显示名称                 |
| `username:`             | 发送者用户名                   |
| `tag:`                  | 发送者标签                     |
| `id:`, `from:`, `e164:` | 显式身份标识目标               |

## elevated 不控制的内容

- **工具策略**：如果工具策略拒绝 `exec`，elevated 也无法覆盖。
- **主机选择策略**：elevated 不会把 `auto` 变成可自由跨主机覆盖。它使用已配置/会话中的 exec 目标规则，只有在目标本来就是 `node` 时才选择 `node`。
- **与 `/exec` 分离**：`/exec` 指令会为被授权的发送者调整每个会话的 exec 默认值（主机、安全性、ask、node），并且不需要 elevated 模式。

<Note>
  bash 聊天命令（`!` 前缀；`/bash` 别名）是一个独立门控，除了其自身的 `tools.bash.enabled` 标志外，还要求启用 `tools.elevated`。禁用 elevated 也会将 `!` shell 命令一并锁定。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/tools/exec" icon="terminal">
    来自代理的 Shell 命令执行。
  </Card>
  <Card title="Exec 审批" href="/tools/exec-approvals" icon="shield">
    `exec` 的审批和允许列表系统。
  </Card>
  <Card title="沙箱" href="/gateway/sandboxing" icon="box">
    Gateway 级别的沙箱配置。
  </Card>
  <Card title="沙箱 vs 工具策略 vs 提升模式" href="/gateway/sandbox-vs-tool-policy-vs-elevated" icon="scale-balanced">
    工具调用期间这三个门控如何组合。
  </Card>
</CardGroup>
