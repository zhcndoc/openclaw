---
summary: "执行审批、允许列表和沙箱逃逸提示"
read_when:
  - 配置执行审批或允许列表时
  - 在 macOS 应用中实现执行审批用户体验时
  - 审核沙箱逃逸提示及其影响时
title: "执行审批"
---

# 执行审批

执行审批是让沙箱代理能够在真实主机（`gateway` 或 `node`）上运行命令的**伴侣应用/节点主机防护机制**。可以把它看作是一种安全联锁装置：只有当策略 + 允许列表 + （可选）用户审批三者同时允许时，命令才被允许执行。执行审批**是在工具策略和权限提升门控之外额外施加的控制**（除非权限提升被设置为 `full`，此时跳过审批流程）。

有效策略是在 `tools.exec.*` 和审批默认值中取**更严格**的。如果审批配置项被省略，则使用 `tools.exec` 的值。

如果伴侣应用的 UI **不可用**，任何需要提示的请求将由**请求回退机制**处理（默认拒绝）。

## 适用范围

执行审批在执行主机本地强制执行：

- **gateway 主机** → 网关机器上的 `openclaw` 进程
- **node 主机** → 节点运行器（macOS 伴侣应用或无头节点主机）

- 通过网关认证的调用者是该网关的受信操作者。  
- 配对节点将该受信操作者的能力扩展到节点主机。  
- 执行审批减少了意外执行的风险，但并非基于单用户认证边界的控制。  
- 经审批的节点主机运行绑定标准执行上下文：标准的当前工作目录（cwd）、精确的 argv、env 绑定（如有）以及固定的可执行文件路径（适用时）。  
- 对于 shell 脚本和直接调用解释器/运行时文件的情况，OpenClaw 还尝试绑定一个具体的本地文件操作数。如果该绑定文件在审批后、执行前发生变化，则拒绝运行，而非执行发生偏移的内容。  
- 这种文件绑定是出于最大努力的考虑，而非每个解释器/运行时加载路径的完整语义模型。如果审批模式无法准确识别绑定一个具体的本地文件，则拒绝发放基于审批的运行，而非假装实现了完整覆盖。  

macOS 拆分：

- **节点主机服务** 通过本地 IPC 转发 `system.run` 到**macOS 应用**。
- **macOS 应用** 执行审批并在 UI 上下文中执行命令。

## 设置和存储

审批信息存储在执行主机本地的 JSON 文件中：

`~/.openclaw/exec-approvals.json`

示例 schema：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 策略参数

### 安全性（`exec.security`）

- **deny**：阻止所有主机执行请求。
- **allowlist**：仅允许允许列表中的命令。
- **full**：允许所有命令（等同于权限提升模式）。

### 提示（`exec.ask`）

- **off**：不提示。
- **on-miss**：仅在不匹配允许列表时提示。
- **always**：每个命令都提示。

### 提示回退（`askFallback`）

当需要提示但 UI 不可达时，回退决策：

- **deny**：阻止。
- **allowlist**：仅在允许列表匹配时允许。
- **full**：允许。

### Inline interpreter eval hardening (`tools.exec.strictInlineEval`)

When `tools.exec.strictInlineEval=true`, OpenClaw treats inline code-eval forms as approval-only even if the interpreter binary itself is allowlisted.

Examples:

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

This is defense-in-depth for interpreter loaders that do not map cleanly to one stable file operand. In strict mode:

- these commands still need explicit approval;
- `allow-always` does not persist new allowlist entries for them automatically.

## Allowlist (per agent)

允许列表是**按代理**区分的。如存在多个代理，可在 macOS 应用中切换编辑的代理。匹配模式是**不区分大小写的 glob 模式**。模式应解析为**二进制可执行路径**（仅有文件名的条目会被忽略）。遗留的 `agents.default` 条目会在加载时迁移至 `agents.main`。

示例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每条允许列表记录包含：

- **id**：用于 UI 身份识别的稳定 UUID（可选）
- **上次使用时间** 时间戳
- **上次使用的命令**
- **上次解析的路径**

## 自动允许技能 CLI

启用 **自动允许技能 CLI** 后，已知技能引用的可执行文件将被视为节点上的允许列表命令（macOS 节点或无头节点主机）。该功能通过 Gateway RPC 的 `skills.bins` 获取技能二进制列表。如果需要严格的手动允许列表，请禁用此选项。

重要信任说明：

- 该功能是一种**隐式便捷的允许列表**，与手动路径允许列表条目分开。
- 适用于 Gateway 和节点位于相同信任边界的受信操作环境。
- 如果需要严格的显式信任，保持 `autoAllowSkills: false`，只使用手动路径允许列表。

## 安全二进制（仅限 stdin）

`tools.exec.safeBins` defines a small list of **stdin-only** binaries (for example `cut`)
that can run in allowlist mode **without** explicit allowlist entries. Safe bins reject
positional file args and path-like tokens, so they can only operate on the incoming stream.
Treat this as a narrow fast-path for stream filters, not a general trust list.
Do **not** add interpreter or runtime binaries (for example `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) to `safeBins`.
If a command can evaluate code, execute subcommands, or read files by design, prefer explicit allowlist entries and keep approval prompts enabled.
Custom safe bins must define an explicit profile in `tools.exec.safeBinProfiles.<bin>`.
Validation is deterministic from argv shape only (no host filesystem existence checks), which
prevents file-existence oracle behavior from allow/deny differences.
File-oriented options are denied for default safe bins (for example `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Safe bins also enforce explicit per-binary flag policy for options that break stdin-only
behavior (for example `sort -o/--output/--compress-program` and grep recursive flags).
Long options are validated fail-closed in safe-bin mode: unknown flags and ambiguous
abbreviations are rejected.
Denied flags by safe-bin profile:

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全二进制执行时强制将 argv 标记视为**字面文本**（无文件名扩展，无环境变量扩展），防止诸如 `*` 或 `$HOME/...` 被用来偷渡文件读取。

Shell chaining (`&&`, `||`, `;`) is allowed when every top-level segment satisfies the allowlist
(including safe bins or skill auto-allow). Redirections remain unsupported in allowlist mode.
Command substitution (`$()` / backticks) is rejected during allowlist parsing, including inside
double quotes; use single quotes if you need literal `$()` text.
On macOS companion-app approvals, raw shell text containing shell control or expansion syntax
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) is treated as an allowlist miss unless
the shell binary itself is allowlisted.
For shell wrappers (`bash|sh|zsh ... -c/-lc`), request-scoped env overrides are reduced to a
small explicit allowlist (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
For allow-always decisions in allowlist mode, known dispatch wrappers
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persist inner executable paths instead of wrapper
paths. Shell multiplexers (`busybox`, `toybox`) are also unwrapped for shell applets (`sh`, `ash`,
etc.) so inner executables are persisted instead of multiplexer binaries. If a wrapper or
multiplexer cannot be safely unwrapped, no allowlist entry is persisted automatically.
If you allowlist interpreters like `python3` or `node`, prefer `tools.exec.strictInlineEval=true` so inline eval still requires an explicit approval.

Default safe bins:

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

如果安全二进制位于包管理器或用户路径（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），请显式添加到 `tools.exec.safeBinTrustedDirs`。

允许列表模式下不自动支持 shell 链接和重定向。

| Topic            | `tools.exec.safeBins`                                  | Allowlist (`exec-approvals.json`)                            |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| Goal             | Auto-allow narrow stdin filters                        | Explicitly trust specific executables                        |
| Match type       | Executable name + safe-bin argv policy                 | Resolved executable path glob pattern                        |
| Argument scope   | Restricted by safe-bin profile and literal-token rules | Path match only; arguments are otherwise your responsibility |
| Typical examples | `head`, `tail`, `tr`, `wc`                             | `jq`, `python3`, `node`, `ffmpeg`, custom CLIs               |
| Best use         | Low-risk text transforms in pipelines                  | Any tool with broader behavior or side effects               |

在 macOS 伴侣应用审批时，包含 shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``、`$`、`<`、`>`、`(`、`)`）的原始 shell 文本会被视为不匹配允许列表，除非 shell 可执行文件本身被允许。

对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求作用域的环境变量覆盖被限制在少量显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。

对于允许列表模式中的“始终允许”决策，已知调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会保留内部可执行文件路径而非包装器路径。shell 多路复用器（`busybox`、`toybox`）也会被解包，以确保保存的路径是内层的 shell applet 可执行文件而非多路复用器本体。如果包装器或多路复用器无法安全解包，则不会自动保存允许列表条目。

默认安全二进制：`jq`、`cut`、`uniq`、`head`、`tail`、`tr`、`wc`。

`grep` 和 `sort` 不包含在默认列表中。如需使用，请保留对应非 stdin 工作流的显式允许列表条目。

`grep` 安全二进制模式下，必须使用 `-e`/`--regexp` 提供模式，拒绝位置模式形式以防文件操作作为模糊位置参数潜入。

### 安全二进制与允许列表对比

| 主题     | `tools.exec.safeBins`                 | 允许列表 (`exec-approvals.json`)        |
| -------- | ------------------------------------- | --------------------------------------- |
| 目标     | 自动允许范围窄的 stdin 过滤器         | 显式信任特定可执行文件                  |
| 匹配类型 | 可执行文件名称 + 安全二进制 argv 策略 | 解析后的可执行文件路径 glob 模式        |
| 参数范围 | 受安全档案和字面令牌规则限制          | 仅路径匹配，参数责任自负                |
| 典型示例 | `jq`、`head`、`tail`、`wc`            | `python3`、`node`、`ffmpeg`、自定义 CLI |
| 最佳用例 | 管道内低风险文本转换                  | 任何有更广行为或副作用的工具            |

配置位置：

- `safeBins` 来源于配置（`tools.exec.safeBins` 或单代理下 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来源于配置（`tools.exec.safeBinTrustedDirs` 或单代理下同）。
- `safeBinProfiles` 来源于配置（`tools.exec.safeBinProfiles` 或单代理下同）。单代理配置键覆盖全局键。
- 允许列表条目存储在主机本地 `~/.openclaw/exec-approvals.json` 的 `agents.<id>.allowlist`（或通过控制 UI / `openclaw approvals allowlist ...`）中。
- `openclaw security audit` 在解释器/运行时二进制出现在 `safeBins` 但无显式配置档时，给出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可为缺失的自定义 `safeBinProfiles.<bin>` 条目生成空白模板 `{}`（生成后需复查并加强），解释器/运行时二进制不会被自动生成。

自定义配置示例：

```json5
{
  tools: {
    exec: {
      safeBins: ["jq", "myfilter"],
      safeBinProfiles: {
        myfilter: {
          minPositional: 0,
          maxPositional: 0,
          allowedValueFlags: ["-n", "--limit"],
          deniedFlags: ["-f", "--file", "-c", "--command"],
        },
      },
    },
  },
}
```

If you explicitly opt `jq` into `safeBins`, OpenClaw still rejects the `env` builtin in safe-bin
mode so `jq -n env` cannot dump the host process environment without an explicit allowlist path
or approval prompt.

## Control UI editing

通过 **控制 UI → 节点 → 执行审批** 面板编辑默认值、按代理覆盖和允许列表。选择作用域（默认或某代理），调整策略，添加/删除允许列表模式，点击**保存**。UI 会显示每个模式的**上次使用**元数据，方便列表整理。

目标选择器可选 **Gateway**（本地审批）或某 **节点**。节点必须声明支持 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果节点未支持审批，可以直接编辑其本地 `~/.openclaw/exec-approvals.json` 文件。

CLI：`openclaw approvals` 支持对网关或节点的编辑（详见[审批 CLI](/cli/approvals)）。

## 审批流程

当需要提示时，网关向操作客户端广播 `exec.approval.requested`。控制 UI 与 macOS 应用通过 `exec.approval.resolve` 解决请求，随后网关将获批请求转发至节点主机。

对于 `host=node`，审批请求包含规范的 `systemRunPlan` 负载。网关使用该计划作为转发获批 `system.run` 请求的权威命令/工作目录/会话上下文。

## 解释器/运行时命令

基于审批的解释器/运行时运行采用刻意保守的策略：

- Exact argv/cwd/env context is always bound.
- Direct shell script and direct runtime file forms are best-effort bound to one concrete local
  file snapshot.
- Common package-manager wrapper forms that still resolve to one direct local file (for example
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) are unwrapped before binding.
- If OpenClaw cannot identify exactly one concrete local file for an interpreter/runtime command
  (for example package scripts, eval forms, runtime-specific loader chains, or ambiguous multi-file
  forms), approval-backed execution is denied instead of claiming semantic coverage it does not
  have.
- For those workflows, prefer sandboxing, a separate host boundary, or an explicit trusted
  allowlist/full workflow where the operator accepts the broader runtime semantics.

需要审批时，执行工具会立即返回审批 id。使用此 id 关联后续系统事件（`执行完成` / `执行拒绝`）。若超时无决策，则请求视为审批超时并作为拒绝原因。  

确认对话框包含：

- 命令及参数
- 当前工作目录
- 代理 ID
- 解析后的可执行路径
- 主机与策略元数据

操作选项：

- **允许一次** → 立即运行
- **始终允许** → 添加到允许列表 + 运行
- **拒绝** → 阻止执行

## 审批转发至聊天频道

可将执行审批提示转发至任意聊天频道（含插件频道），并通过 `/approve` 完成审批。此机制使用正常的外发管道。

配置示例：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // 子串或正则表达式
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

聊天回复示例：

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

### 内置聊天审批客户端

Discord 和 Telegram 也可以作为显式的执行审批客户端，支持频道级别配置。

- Discord：`channels.discord.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

这些客户端为可选启用。如果某频道未启用 exec 审批，OpenClaw 不会仅因会话发生在那里而将该频道视为审批通道。

共有行为：

- 只有配置的审批者可以批准或拒绝
- 请求者无需为审批者
- 开启频道投递时，审批提示包含命令文本
- 如果无操作 UI 或配置的审批客户端能够接受请求，提示将回退至 `askFallback`

Telegram 默认发送审批通知至审批者私信（`target: "dm"`）。你可以切换为 `channel` 或 `both`，让审批提示也出现在原始 Telegram 聊天/主题中。对于 Telegram 论坛主题，OpenClaw 会保留审批提示和审批后续消息的主题。

详见：

- [Discord](/channels/discord#exec-approvals-in-discord)
- [Telegram](/channels/telegram#exec-approvals-in-telegram)

### macOS IPC 流程

```
Gateway -> Node 服务 (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac 应用 (UI + 审批 + system.run)
```

安全说明：

- Unix 套接字权限为 `0600`，令牌存储于 `exec-approvals.json`。
- 同 UID 的对等检查。
- 挑战/响应机制（随机数 + HMAC 令牌 + 请求哈希）+ 短 TTL。

## 系统事件

执行生命周期以系统消息形式展现：

- `执行中`（仅当命令运行时间超过阈值时）
- `执行完成`
- `执行被拒绝`

这些消息在节点报告事件后，发布到代理的会话中。网关主机执行审批在命令结束时（和可选的运行超过阈值时）发出相同生命周期事件。

审批门控的执行复用审批 id 作为消息中的 `runId`，便于关联。

## 影响及建议

- **full** 模式权限强大，推荐尽量使用允许列表。
- **ask** 模式可让你实时掌控且支持快速审批。
- 按代理的允许列表防止不同代理间审批泄漏。
- 审批仅适用于**授权发送者**发起的主机执行请求，未授权发送者无法执行 `/exec`。
- `/exec security=full` 是授权操作员的会话级便利选项，默认跳过审批。
  若需严控主机执行，可设置审批安全策略为 `deny` 或通过工具策略拒绝 `exec` 工具。

相关链接：

- [Exec 工具](/tools/exec)
- [权限提升模式](/tools/elevated)
- [技能](/tools/skills)
