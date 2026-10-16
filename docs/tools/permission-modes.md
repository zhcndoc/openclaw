---
summary: "主机 exec 的权限模式、Codex Guardian 审批以及 ACPX harness 会话"
read_when:
  - "为命令权限选择自动、询问、白名单、完全或拒绝"
  - "通过 tools.exec.mode 配置 Codex Guardian 审核的批准"
  - "比较 OpenClaw exec 审批与 ACPX harness 权限"
title: "权限模式"
---

权限模式决定了代理在运行主机命令、写入文件或向后端 harness 请求额外访问权限之前拥有多少权限。

<Note>
  权限模式与 `tools.exec.host=auto` 是分开的。`tools.exec.host` 决定命令在哪里运行。`tools.exec.mode` 决定主机 exec 如何被审批。
</Note>

## <a id="recommended-default"></a> 推荐默认值

对于需要有用的主机访问、但又不想让每次未命中都弹出人工提示的编码代理，使用 `auto`：

```bash
openclaw config set tools.exec.mode auto
openclaw approvals get
openclaw gateway restart
```

`openclaw approvals get` 打印请求的策略、其背后的主机策略源以及有效结果。在重新启动应用之前，用它来确认 `tools.exec.mode` 写入已到达您期望的源中。

然后验证实际生效的策略：

```bash
openclaw exec-policy show
```

## <a id="openclaw-host-exec-modes"></a> OpenClaw 主机 exec 模式

`tools.exec.mode` 是主机 `exec` 的规范化策略面。每种模式都会解析为一个底层的 `security`（allowlist 严格度）和 `ask`（命中缺失时提示）配对：

| 模式        | 保安/询问          | 行为                                                                      | 适用场景                                               |
| ----------- | ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| `deny`      | `deny` / `off`          | 完全阻止主机 exec。                                                     | 不允许任何主机命令。                          |
| `allowlist` | `allowlist` / `off`     | 仅运行在 allowlist 中的命令；静默拒绝未命中的命令。                          | 你有一组已知安全的命令集。                     |
| `ask`       | `allowlist` / `on-miss` | 运行 allowlist 匹配项；对未命中的命令询问人工确认。                                 | 每个新命令都应由人工审核。               |
| `auto`      | `allowlist` / `on-miss` | 运行许可名单匹配；使用 `allow`、`deny` 或 `ask` 审核符合条件的未命中。 | 编码会话需要实用且受保护的访问。         |
| `full`      | `full` / `off`          | 在没有普通策略提示的情况下运行主机执行。                                | 该受信任的主机应该跳过普通的策略提示。 |

`ask` 和 `auto` 共享相同的 allowlist/ask 设置； `auto` 还启用了本机自动审阅器。 `allow` 判决允许一次低风险或中等风险的执行。 `deny` 判决会向代理返回原因，以便代理可以选择实质上更安全的替代方案或询问用户。 `ask` 判决需要人工批准，审核失败也是如此。在网关上，连续三个审阅者的拒绝升级为人类。现有的约束性检查和明确的人工批准要求仍然适用；请参见 [Exec 模式](/tools/exec#modes)。

网关批准支持的命令在审查之前绑定每个解析的命令段可执行文件，并在启动之前重新检查它：受保护的可执行文件仅使用解析的真实路径身份，而可写可执行文件也使用内容哈希。 Node 身份检查涵盖通过调度进行的本地策略评估，并具有 [ 远程 shell 包装批准限制 ](/tools/exec-approvals-advanced#interpreter%2Fruntime-commands)。在`auto`模式下，POSIX登录或交互式shell包装器会在绑定成功时跳过审核者并需要人工批准；现有的具有约束力的拒绝仍然被拒绝。它们的隐式启动文件位于操作数绑定之外。

[`tools.exec.strictInlineEval`](/tools/exec#inline-eval-strictinlineeval) 是一个单独的选择加入设置，默认为 `false`。当普通主机审批评估运行时，在启用严格模式时，即使在 `full`/`off` 策略下，公认的内联评估表单（例如 `python -c`、`node -e` 和 `sed` 程序）也需要审阅者或明确批准。单独配置的 `tools.exec.mode: "full"` 不会绕过该检查。

从具有有效安全性 `full` 的完全权限会话执行网关并询问 `off`，或者从允许 `full`/`off` 的执行和主机批准策略的允许的提升完全执行执行网关，会跳过主机批准路径及其严格内联检测器。整个会话的仅询问收紧将恢复这条道路。请参见[会话权限模式](/gateway/permission-modes)和[E提升模式](/tools/elevated)。

关于完整的主机 exec 策略、本地审批文件、allowlist 方案、安全二进制文件以及转发行为，请参见 [Exec approvals](/tools/exec-approvals)。

## <a id="codex-guardian-mapping"></a> Codex Guardian 映射

对于原生 Codex app-server 会话，`tools.exec.mode: "auto"` 会在本地 Codex 要求允许时，引导 Codex 走向经 Guardian 审核的批准流程。典型结果值如下：

| Codex 字段         | 典型值     |
| ------------------- | ----------------- |
| `approvalPolicy`    | `on-request`      |
| `approvalsReviewer` | `auto_review`     |
| `sandbox`           | `workspace-write` |

`auto` 模式会优先于任何已配置的 Codex sandbox/approval 覆盖项，因此它不会保留诸如 `approvalPolicy: "never"` 搭配 `sandbox: "danger-full-access"` 之类的旧式不安全组合。`tools.exec.mode: "deny"` 和 `"allowlist"` 会完全阻止 Codex app-server 的本地执行。仅当你有意希望采用无需批准的姿态时，才使用 `tools.exec.mode: "full"`。

关于 app-server 设置、认证顺序以及原生 Codex 运行时细节，请参见 [Codex harness](/plugins/codex-harness)。

## <a id="acpx-harness-permissions"></a> ACPX harness 权限

ACPX 会话没有交互式 TTY 权限提示。支持的 ACP 表单和 URL 请求在通道传送轮次期间仍然可以作为网关问题到达操作员；这些与许可批准是分开的。 ACPX 在 `plugins.entries.acpx.config` 下使用单独的harness级别设置：

| 设置                     | 值          | 含义                                     |
| --------------------------- | --------------- | ------------------------------------------- |
| `permissionMode`            | `approve-reads` | 仅自动批准读取。                    |
| `permissionMode`            | `approve-all`   | 自动批准写入和 shell 命令。     |
| `permissionMode`            | `deny-all`      | 拒绝所有权限提示。                |
| `nonInteractivePermissions` | `fail`          | 当需要提示时中止。      |
| `nonInteractivePermissions` | `deny`          | 拒绝提示，并在可能时继续。 |

将 ACPX 权限与 OpenClaw exec 审批分别设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

使用默认的混合重新加载模式，这些更改会自动重新加载 ACPX 插件。其他模式请参见[配置热重载](/gateway/configuration/hot-reload)。

将 `approve-all` 视为 ACPX 的“破玻璃”式无提示 harness 会话等价配置。关于设置细节和失败模式，请参见 [ACP agents setup](/tools/acp-agents-setup#permission-configuration)。

## <a id="choosing-a-mode"></a> 选择模式

| 目标                                          | 配置                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| 完全阻止主机命令                | `tools.exec.mode: "deny"`                                                              |
| 仅允许已知安全命令运行              | `tools.exec.mode: "allowlist"`                                                         |
| 每个新命令形状都请求人工确认       | `tools.exec.mode: "ask"`                                                               |
| 在交由人工之前使用 Codex/OpenClaw 自动审核  | `tools.exec.mode: "auto"`                                                              |
| 跳过普通主机执行批准提示      | `tools.exec.mode: "full"` 加上匹配的主机认证，带有 `strictInlineEval: false` |
| 进行非交互式 ACPX 会话 write/exec | `plugins.entries.acpx.config.permissionMode: "approve-all"`                            |

如果更改模式后命令仍然提示或失败，请检查两个层面：

```bash
openclaw approvals get
openclaw exec-policy show
```

在上述完全权限网关会话异常之外，主机执行使用 OpenClaw 配置和主机本地批准文件的更严格结果。 ACPX harness权限不会放松主机执行批准，主机执行批准也不会放松 ACPX harness提示。

## <a id="related"></a> 相关内容

- [执行批准](/tools/exec-approvals)
- [执行审批 - 高级](/tools/exec-approvals-advanced)
- [Codex 运行环境](/plugins/codex-harness)
- [ACP 代理设置](/tools/acp-agents-setup#permission-configuration)
