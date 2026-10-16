---
summary: "提升执行模式：从沙盒代理运行沙盒外的命令"
read_when:
  - "调整提升模式默认值、白名单或斜杠命令行为"
  - "了解沙盒代理如何访问主机"
title: "高架模式"
---

当代理在沙箱内运行时，其 `exec` 命令仅限于沙箱环境。 **E提升模式**允许代理突破普通代理配置的沙箱，并在沙箱外运行命令，并具有可配置的批准门。其创建者角色需要沙箱的会话无法使用提升模式来逃脱。

<Info>
  提升模式仅在代理处于**沙箱化**状态时才会改变行为。对于未沙箱化的代理，exec 已经在宿主机上运行。
</Info>

## <a id="directives"></a> 指令

Control 每个会话的提升模式，带有斜杠命令：

| 指令        | 它的作用                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/elevated on`   | 在配置的主机路径上于沙箱外运行，保留审批                                                             |
| `/elevated ask`  | 与 `on` 相同（别名）                                                                                                            |
| `/elevated full` | 在配置的主机路径上的沙箱外部运行，并在 mode/host 批准策略已允许时跳过批准 |
| `/elevated off`  | 返回到受沙箱限制的执行                                                                                            |

也可使用 `/elev on|off|ask|full`。

发送不带参数的 `/elevated` 可查看当前级别。

## <a id="how-it-works"></a> 工作原理

<Steps>
  <Step id="check-availability" title="检查空房情况">
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

  <Step id="set-the-level" title="设置级别">
    发送仅包含指令的消息以设置会话默认值：

    ```text
    /elevated full
    ```

    或以内联方式使用（仅适用于该消息）：

    ```text
    /elevated on run the deployment script
    ```

  </Step>

  <Step id="commands-run-outside-the-sandbox" title="命令在沙箱外运行">
    随着活动的增加，`exec` 调用离开沙箱。默认情况下，有效主机为 `gateway`；当 configured/session 执行目标为 `node` 时，有效主机为 `node`。在 `full` 模式下，当解析的 exec mode/host 批准策略已经完全许可时，将跳过 exec 批准（安全 `full`，请询问 `off`）；否则仍适用正常审批政策。在`on`/`ask`模式下，配置的审批规则始终适用。
  </Step>
</Steps>

## <a id="resolution-order"></a> 解析顺序

1. 消息中的**内联指令**（仅适用于该消息）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## <a id="availability-and-allowlists"></a> 可用性和允许列表

- **Global gate**: `tools.elevated.enabled`（必须为 `true`）
- **Sender allowlist**: `tools.elevated.allowFrom`，按频道分别配置列表
- **Per-agent gate**: `agents.entries.*.tools.elevated.enabled`（只能进一步限制；全局和 per-agent gate 都必须为 `true`）
- **Per-agent allowlist**: `agents.entries.*.tools.elevated.allowFrom`（发送者必须同时匹配全局 + per-agent）
- **Channel-provided fallback allowlist**: 频道插件可以通过 SDK adapter hook 选择性提供一个回退允许列表，当未配置 `tools.elevated.allowFrom.<provider>` 时使用。目前没有任何内置频道实现这个 hook，因此实际上现在每个 provider 都需要显式配置一个 `tools.elevated.allowFrom.<provider>` 条目。
- **All gates must pass**；否则 elevated 会被视为不可用

允许列表条目格式：

| 前缀                  | 匹配内容                         |
| ----------------------- | ------------------------------- |
| （无）                  | 发送者 ID、E.164，或 From 字段 |
| `name:`                 | 发送者显示名称             |
| `username:`             | 发送者用户名                 |
| `tag:`                  | 发送者标签                      |
| `id:`, `from:`, `e164:` | 显式身份标识目标     |

## <a id="what-elevated-does-not-control"></a> 什么升高不控制

- **工具策略**：如果`exec`被工具策略拒绝，则提升无法覆盖它。
- **必需的角色沙箱**：如果经过身份验证的会话创建者的操作员角色需要沙箱，则提升模式无法在网关或节点上运行命令。
- **主机选择策略**：提升不会将`auto`变成免费的跨主机覆盖。它使用 configured/session 执行目标规则，仅当目标已经是 `node` 时才选择 `node`。
- **与 `/exec`** 分开：`/exec` 指令为授权发件人调整每会话执行默认值（主机、安全性、询问、节点），并且不需要提升模式。

<Note>
  bash 聊天命令（`!` 前缀；`/bash` 别名）是一个单独的门，除了其自己的 `tools.bash.enabled` 标志之外，还需要启用 `tools.elevated`。禁用提升的锁定 `!` shell 命令也会发出。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/tools/exec" icon="terminal">
    来自代理的 Shell 命令执行。
  </Card>
  <Card title="执行批准" href="/tools/exec-approvals" icon="shield">
    `exec` 的审批和允许列表系统。
  </Card>
  <Card title="沙箱化" href="/gateway/sandboxing" icon="box">
    Gateway 级别的沙箱配置。
  </Card>
  <Card title="沙盒、工具策略与提升策略" href="/gateway/sandbox-vs-tool-policy-vs-elevated" icon="scale-balanced">
    工具调用期间这三个门控如何组合。
  </Card>
  <Card title="多代理沙箱和工具" href="/tools/multi-agent-sandbox-tools" icon="shield">
    每个代理的沙箱和工具限制。
  </Card>
  <Card title="思考级别" href="/tools/thinking" icon="brain">
    高程运行使用的推理预算。
  </Card>
</CardGroup>
