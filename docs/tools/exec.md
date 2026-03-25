---
summary: "Exec 工具的使用、stdin 模式及 TTY 支持"
read_when:
  - 使用或修改 exec 工具时
  - 调试 stdin 或 TTY 行为时
title: "Exec 工具"
---

# Exec 工具

在工作区运行 shell 命令。通过 `process` 支持前台和后台执行。  
如果不允许使用 `process`，则 `exec` 同步运行，忽略 `yieldMs`/`background`。  
后台会话按代理隔离；`process` 只能看到来自同一代理的会话。

## 参数

- `command`（必需）
- `workdir`（默认当前工作目录）
- `env`（键/值覆盖）
- `yieldMs`（默认 10000）：延迟后自动切换到后台
- `background`（布尔）：立即后台运行
- `timeout`（秒，默认 1800）：超时杀死进程
- `pty`（布尔）：有条件时在伪终端中运行（仅针对 TTY CLI、编程代理、终端 UI）
- `host`（`sandbox | gateway | node`）：执行位置
- `security`（`deny | allowlist | full`）：`gateway`/`node` 的执行模式
- `ask`（`off | on-miss | always`）：`gateway`/`node` 的批准提示
- `node`（字符串）：`host=node` 时的节点id/名称
- `elevated`（布尔）：请求提升模式（gateway 主机）；仅当提升模式解析为 `full` 时才强制 `security=full`

备注：

- `host` 默认为 `sandbox` 。
- 当关闭沙箱时，忽略 `elevated`（此时 exec 已直接在主机运行）。
- `gateway`/`node` 的批准由 `~/.openclaw/exec-approvals.json` 控制。
- 节点需要配对的节点（伴随应用或无头节点主机）。
- 如果有多个节点，设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- 非 Windows 主机，exec 使用设置的 `SHELL`；如果 `SHELL` 是 `fish`，优先使用 `PATH` 里可用的 `bash`（或 `sh`），以避免与 fish 不兼容的脚本，否则回退到 `SHELL`。
- Windows 主机，exec 优先查找 PowerShell 7 (`pwsh`)（依次在 Program Files、ProgramW6432 和 PATH 中查找），然后回退到 Windows PowerShell 5.1。
- 主机执行（`gateway`/`node`）拒绝 `env.PATH` 以及加载器覆盖（`LD_*`/`DYLD_*`），防止二进制劫持或注入代码。
- OpenClaw 在生成的命令环境（包括 PTY 和沙箱执行）中设置环境变量 `OPENCLAW_SHELL=exec`，使 shell/profile 脚本能检测 exec 工具上下文。
- 重要：默认**关闭**沙箱。如果关闭沙箱且明确配置/请求 `host=sandbox`，exec 现在会拒绝执行（fail closed），而不是默默转到 gateway 主机执行。需启用沙箱或使用带批准的 `host=gateway`。
- 脚本预检（查常见 Python/Node shell 语法错误）仅检查有效 `workdir` 边界内的文件。脚本路径解析出 `workdir` 外时，跳过其预检。

## 配置

- `tools.exec.notifyOnExit` (default: true): when true, backgrounded exec sessions enqueue a system event and request a heartbeat on exit.
- `tools.exec.approvalRunningNoticeMs` (default: 10000): emit a single “running” notice when an approval-gated exec runs longer than this (0 disables).
- `tools.exec.host` (default: `sandbox`)
- `tools.exec.security` (default: `deny` for sandbox, `allowlist` for gateway + node when unset)
- `tools.exec.ask` (default: `on-miss`)
- `tools.exec.node` (default: unset)
- `tools.exec.strictInlineEval` (default: false): when true, inline interpreter eval forms such as `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e`, and `osascript -e` always require explicit approval and are never persisted by `allow-always`.
- `tools.exec.pathPrepend`: list of directories to prepend to `PATH` for exec runs (gateway + sandbox only).
- `tools.exec.safeBins`: stdin-only safe binaries that can run without explicit allowlist entries. For behavior details, see [Safe bins](/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs`: additional explicit directories trusted for `safeBins` path checks. `PATH` entries are never auto-trusted. Built-in defaults are `/bin` and `/usr/bin`.
- `tools.exec.safeBinProfiles`: optional custom argv policy per safe bin (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

示例：

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"],
    },
  },
}
```

### PATH 处理

- `host=gateway`：合并你的登录 shell `PATH` 到 exec 环境。主机执行拒绝 `env.PATH` 覆盖。守护进程本身仍运行在最小的 `PATH` 中：
  - macOS：`/opt/homebrew/bin`，`/usr/local/bin`，`/usr/bin`，`/bin`
  - Linux：`/usr/local/bin`，`/usr/bin`，`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），`/etc/profile` 可能重置 `PATH`。OpenClaw 通过内部环境变量（无 shell 插值）在 profile 后插入 `env.PATH`；`tools.exec.pathPrepend` 也适用。
- `host=node`：只发送你传入的非被拒绝环境覆盖。主机执行和节点宿主均拒绝 `env.PATH` 覆盖且忽略。需要额外 PATH 条目时，配置节点宿主服务环境（systemd/launchd）或安装工具到标准位置。

每个代理的节点绑定（使用配置中的代理列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制界面：节点标签页包含一个“小 Exec 节点绑定”面板用于相同设置。

## 会话覆盖（`/exec`）

使用 `/exec` 设置**每会话**的默认 `host`、`security`、`ask` 和 `node`。  
无参数发送 `/exec` 显示当前值。

示例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对**授权发起者**响应（渠道允许列表/配对+ `commands.useAccessGroups`）。  
其仅更新**会话状态**，不写配置。若需完全禁用 exec，可通过工具策略拒绝（`tools.deny: ["exec"]` 或针对某代理）。  
主机批准规则仍然生效，除非你明确设置 `security=full` 和 `ask=off`。

## Exec 批准（伴随应用 / 节点宿主）

沙箱代理可要求每次在 gateway 或节点主机上执行 exec 之前必须获得批准。  
详见 [Exec 批准](/tools/exec-approvals) 了解策略、允许列表和 UI 流程。

当需要批准时，exec 工具立即返回  
`status: "approval-pending"` 和批准 ID。批准（或拒绝/超时）后，Gateway 发送相关系统事件（`Exec finished` / `Exec denied`）。  
若命令运行超过 `tools.exec.approvalRunningNoticeMs`，则发送单次 `Exec running` 通知。

## 允许列表 + 安全二进制

手动允许列表匹配**已解析的二进制路径**（不支持单纯文件名匹配）。  
当 `security=allowlist` 时，shell 命令仅当每个管道段都在允许列表内或是安全二进制时自动允许。  
在允许列表模式下，链式命令 (`;`、`&&`、`||`) 和重定向被拒绝，除非每个顶层命令段都满足允许列表（含安全二进制）。重定向仍不支持。

`autoAllowSkills` 是 exec 批准中的一个便捷功能，不同于手动路径允许列表。为严格的明确信任，请关闭 `autoAllowSkills`。

两种机制各自适用不同场景：

- `tools.exec.safeBins`：小型、仅 stdin 流的过滤器。
- `tools.exec.safeBinTrustedDirs`：用于安全二进制可执行路径的额外显式信任目录。
- `tools.exec.safeBinProfiles`：安全二进制的自定义命令行参数策略。
- 允许列表：针对可执行路径的显式信任。

Do not treat `safeBins` as a generic allowlist, and do not add interpreter/runtime binaries (for example `python3`, `node`, `ruby`, `bash`). If you need those, use explicit allowlist entries and keep approval prompts enabled.
`openclaw security audit` warns when interpreter/runtime `safeBins` entries are missing explicit profiles, and `openclaw doctor --fix` can scaffold missing custom `safeBinProfiles` entries.
`openclaw security audit` and `openclaw doctor` also warn when you explicitly add broad-behavior bins such as `jq` back into `safeBins`.
If you explicitly allowlist interpreters, enable `tools.exec.strictInlineEval` so inline code-eval forms still require a fresh approval.

详见完整策略和示例：[Exec 批准](/tools/exec-approvals#safe-bins-stdin-only) 和 [安全二进制与允许列表区别](/tools/exec-approvals#safe-bins-versus-allowlist)。

## 示例

前台运行：

```json
{ "tool": "exec", "command": "ls -la" }
```

后台运行 + 轮询：

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

发送按键（tmux 风格）：

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

提交（仅发送回车）：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴（默认带括号模式）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch（实验性）

`apply_patch` 是 exec 的子工具，用于结构化多文件编辑。  
需显式开启：

```json5
{
  tools: {
    exec: {
      applyPatch: { enabled: true, workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

备注：

- 仅对 OpenAI/OpenAI Codex 模型可用。
- 工具策略依旧适用；`allow: ["exec"]` 隐式允许 `apply_patch`。
- 配置项位于 `tools.exec.applyPatch`。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限制在工作区内）。只有在有意让 `apply_patch` 写入/删除工作区外文件时，才设置为 `false`。
