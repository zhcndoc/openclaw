---
summary: "主机 exec 的权限模式、Codex Guardian 审批以及 ACPX harness 会话"
read_when:
  - 选择 `auto`、`ask`、`allowlist`、`full` 或 `deny` 作为命令权限
  - 通过 `tools.exec.mode` 配置经 Codex Guardian 审核的审批
  - 比较 OpenClaw exec 审批与 ACPX harness 权限
title: "权限模式"
---

权限模式决定了代理在运行主机命令、写入文件或向后端 harness 请求额外访问权限之前拥有多少权限。

<Note>
  权限模式与 `tools.exec.host=auto` 是分开的。`tools.exec.host`
  决定命令在哪里运行。`tools.exec.mode` 决定主机 exec 如何被
  审批。
</Note>

## 推荐默认值

对于需要有用的主机访问、但又不想让每次未命中都弹出人工提示的编码代理，使用 `auto`：

```bash
openclaw config set tools.exec.mode auto
openclaw approvals get
openclaw gateway restart
```

然后验证实际生效的策略：

```bash
openclaw exec-policy show
```

## OpenClaw 主机 exec 模式

`tools.exec.mode` 是主机 `exec` 的规范化策略面。每种模式都会解析为一个底层的 `security`（allowlist 严格度）和 `ask`（命中缺失时提示）配对：

| 模式        | security / ask          | 行为                                                                                          | 适用场景                                              |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `deny`      | `deny` / `off`          | 完全阻止主机 exec。                                                                             | 不允许任何主机命令。                                  |
| `allowlist` | `allowlist` / `off`     | 仅运行在 allowlist 中的命令；静默拒绝未命中的命令。                                              | 你有一组已知安全的命令集。                            |
| `ask`       | `allowlist` / `on-miss` | 运行 allowlist 匹配项；对未命中的命令询问人工确认。                                               | 每个新命令都应由人工审核。                            |
| `auto`      | `allowlist` / `on-miss` | 运行 allowlist 匹配项；未命中的命令先经过自动审核，再在需要时转交人工批准。                      | 编码会话需要实用且受保护的访问。                      |
| `full`      | `full` / `off`          | 无提示地运行主机 exec。                                                                         | 这个受信任的主机/会话应跳过审批门禁。                |

`ask` 和 `auto` 共享相同的 allowlist/ask 设置；`auto` 额外启用了原生自动审核器，它会自行决定未命中的命令，只有在无法安全批准时才会转交到配置的人类审批流程。

关于完整的主机 exec 策略、本地审批文件、allowlist 方案、安全二进制文件以及转发行为，请参见 [Exec approvals](/tools/exec-approvals)。

## Codex Guardian 映射

对于原生 Codex app-server 会话，`tools.exec.mode: "auto"` 会在本地 Codex 要求允许时，引导 Codex 走向经 Guardian 审核的批准流程。典型结果值如下：

| Codex 字段           | 典型值              |
| ------------------- | ----------------- |
| `approvalPolicy`    | `on-request`      |
| `approvalsReviewer` | `auto_review`     |
| `sandbox`           | `workspace-write` |

`auto` 模式会优先于任何已配置的 Codex sandbox/approval 覆盖项，因此它不会保留诸如 `approvalPolicy: "never"` 搭配 `sandbox: "danger-full-access"` 之类的旧式不安全组合。`tools.exec.mode: "deny"` 和 `"allowlist"` 会完全阻止 Codex app-server 的本地执行。仅当你有意希望采用无需批准的姿态时，才使用 `tools.exec.mode: "full"`。

关于 app-server 设置、认证顺序以及原生 Codex 运行时细节，请参见 [Codex harness](/plugins/codex-harness)。

## ACPX harness 权限

ACPX 会话是非交互式的，因此不能点击 TTY 权限提示。ACPX 使用 `plugins.entries.acpx.config` 下单独的 harness 级设置：

| 设置                        | 值              | 含义                                        |
| --------------------------- | --------------- | ------------------------------------------- |
| `permissionMode`            | `approve-reads` | 仅自动批准读取。                              |
| `permissionMode`            | `approve-all`   | 自动批准写入和 shell 命令。                  |
| `permissionMode`            | `deny-all`      | 拒绝所有权限提示。                            |
| `nonInteractivePermissions` | `fail`          | 当需要提示时中止。                            |
| `nonInteractivePermissions` | `deny`          | 拒绝提示，并在可能时继续。                    |

将 ACPX 权限与 OpenClaw exec 审批分别设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
openclaw gateway restart
```

将 `approve-all` 视为 ACPX 的“破玻璃”式无提示 harness 会话等价配置。关于设置细节和失败模式，请参见 [ACP agents setup](/tools/acp-agents-setup#permission-configuration)。

## 选择模式

| Goal                                          | Configure                                                   |
| --------------------------------------------- | ----------------------------------------------------------- |
| 完全阻止主机命令                               | `tools.exec.mode: "deny"`                                   |
| 仅允许已知安全命令运行                         | `tools.exec.mode: "allowlist"`                              |
| 每个新命令形状都请求人工确认                   | `tools.exec.mode: "ask"`                                    |
| 在交由人工之前使用 Codex/OpenClaw 自动审核     | `tools.exec.mode: "auto"`                                   |
| 完全跳过主机 exec 审批                         | `tools.exec.mode: "full"` plus matching host approvals file |
| 让非交互式 ACPX 会话可写入/可执行              | `plugins.entries.acpx.config.permissionMode: "approve-all"` |

如果更改模式后命令仍然提示或失败，请检查两个层面：

```bash
openclaw approvals get
openclaw exec-policy show
```

主机 exec 会使用 OpenClaw 配置和主机本地审批文件中更严格的结果。ACPX harness 权限不会放宽主机 exec 审批，主机 exec 审批也不会放宽 ACPX harness 提示。

## 相关内容

- [执行审批](/tools/exec-approvals)
- [执行审批 - 高级](/tools/exec-approvals-advanced)
- [Codex 运行环境](/plugins/codex-harness)
- [ACP 代理设置](/tools/acp-agents-setup#permission-configuration)
