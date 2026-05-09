---
summary: "Exec 工具使用、stdin 模式和 TTY 支持"
read_when:
  - 使用或修改 exec 工具时
  - 调试 stdin 或 TTY 行为时
title: "Exec 工具"
---

在工作区中运行 shell 命令。`exec` 是一个会修改环境的 shell 接口：命令可以在所选主机或沙箱文件系统允许的任何位置创建、编辑或删除文件。禁用 OpenClaw 文件系统工具（如 `write`、`edit` 或 `apply_patch`）并不会让 `exec` 变成只读。

通过 `process` 支持前台 + 后台执行。如果不允许 `process`，`exec` 会同步运行并忽略 `yieldMs`/`background`。
后台会话按 agent 范围隔离；`process` 只能看到来自同一 agent 的会话。

## 参数

<ParamField path="command" type="string" required>
要运行的 Shell 命令。
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
命令的工作目录。
</ParamField>

<ParamField path="env" type="object">
在继承环境之上合并的键/值环境覆盖项。
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
在此延迟（ms）后自动将命令切换到后台。
</ParamField>

<ParamField path="background" type="boolean" default="false">
立即将命令置于后台，而不是等待 `yieldMs`。
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
为本次调用覆盖已配置的 exec 超时时间。只有当命令应在没有 exec 进程超时的情况下运行时，才设置 `timeout: 0`。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
在可用时于伪终端中运行。用于仅支持 TTY 的 CLI、编码 agent 和终端 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
在哪里执行。`auto` 在沙箱运行时处于活动状态时解析为 `sandbox`，否则解析为 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
`gateway` / `node` 执行的强制模式。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
`gateway` / `node` 执行的审批提示行为。
</ParamField>

<ParamField path="node" type="string">
当 `host=node` 时的节点 id/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
请求提升模式——从沙箱跳转到已配置的主机路径。只有当 elevated 解析为 `full` 时，才强制使用 `security=full`。
</ParamField>

注意：

- `host` 默认值为 `auto`：当会话的沙箱运行时处于活动状态时为 sandbox，否则为 gateway。
- `host` 只接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主机名选择器；像主机名的值会在命令运行前被拒绝。
- `auto` 是默认路由策略，不是通配符。从 `auto` 时，按调用设置 `host=node` 是允许的；只有在没有沙箱运行时处于活动状态时，按调用设置 `host=gateway` 才被允许。
- 在没有额外配置的情况下，`host=auto` 仍然“照常可用”：没有沙箱时它解析为 `gateway`；有活动沙箱时则保留在沙箱中。
- `elevated` 会从沙箱跳转到已配置的主机路径：默认是 `gateway`，或者当 `tools.exec.host=node`（或会话默认值为 `host=node`）时为 `node`。只有当当前会话/提供方已启用提升访问时才可用。
- `gateway`/`node` 的审批由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配对的节点（伴侣应用或无头 node 主机）。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- `exec host=node` 是节点唯一的 shell 执行路径；旧的 `nodes.run` 包装器已移除。
- `timeout` 适用于前台、后台、`yieldMs`、gateway、sandbox 和 node 的 `system.run` 执行。如果省略，OpenClaw 会使用 `tools.exec.timeoutSec`；显式 `timeout: 0` 会为该调用禁用 exec 进程超时。
- 在非 Windows 主机上，exec 在设置了 `SHELL` 时会使用它；如果 `SHELL` 是 `fish`，则优先使用 `PATH` 中的 `bash`（或 `sh`），以避免 fish 不兼容脚本，然后如果两者都不存在再回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7（`pwsh`）（Program Files、ProgramW6432，然后是 PATH），然后回退到 Windows PowerShell 5.1。
- 主机执行（`gateway`/`node`）会拒绝 `env.PATH` 和加载器覆盖（`LD_*`/`DYLD_*`），以防止二进制劫持或注入代码。
- OpenClaw 会在派生的命令环境中设置 `OPENCLAW_SHELL=exec`（包括 PTY 和 sandbox 执行），这样 shell/profile 规则就能检测 exec 工具上下文。
- `openclaw channels login` 会被 `exec` 阻止，因为它是一个交互式频道认证流程；请在 gateway 主机上的终端中运行它，或者在有可用时使用聊天中的频道原生登录工具。
- 重要：沙箱默认是**关闭**的。如果沙箱关闭，隐式 `host=auto`
  会解析为 `gateway`。显式 `host=sandbox` 仍然会失败并关闭，而不会静默地
  在 gateway 主机上运行。请启用沙箱或使用带审批的 `host=gateway`。
- 脚本预检检查（用于常见的 Python/Node shell 语法错误）只检查
  有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则会跳过该文件的预检。
- 对于从现在开始的长时间运行工作，请只启动一次，并依赖在启用后且命令输出或失败时的自动
  完成唤醒。
  使用 `process` 查看日志、状态、输入或干预；不要用 sleep 循环、timeout 循环或重复轮询来模拟
  调度。
- 对于应该稍后或按计划发生的工作，请改用 cron，而不是
  `exec` 的 sleep/delay 模式。

## 配置

- `tools.exec.notifyOnExit` (default: true): 当为 true 时，后台 exec 会话会在退出时排队一个系统事件并请求心跳。
- `tools.exec.approvalRunningNoticeMs` (default: 10000): 当受审批门禁的 exec 运行时间超过此值时，发出一次“running”通知（设为 0 可禁用）。
- `tools.exec.timeoutSec` (default: 1800): 默认的每条命令 exec 超时时间（秒）。按调用的 `timeout` 会覆盖它；按调用的 `timeout: 0` 会禁用 exec 进程超时。
- `tools.exec.host` (default: `auto`; resolves to `sandbox` when sandbox runtime is active, `gateway` otherwise)
- `tools.exec.security` (default: `deny` for sandbox, `full` for gateway + node when unset)
- `tools.exec.ask` (default: `off`)
- 无审批的主机 exec 是 gateway + node 的默认行为。如果你想要审批/允许列表行为，请同时收紧 `tools.exec.*` 和主机上的 `~/.openclaw/exec-approvals.json`；参见 [Exec approvals](/tools/exec-approvals#yolo-mode-no-approval)。
- YOLO 来自主机策略默认值（`security=full`、`ask=off`），而不是来自 `host=auto`。如果你想强制 gateway 或 node 路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 且 `ask=off` 模式下，主机 exec 会直接遵循已配置策略；不会额外进行启发式命令混淆预过滤或脚本预检拒绝层。
- `tools.exec.node` (default: unset)
- `tools.exec.strictInlineEval` (default: false): 当为 true 时，像 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e` 这样的内联解释器 eval 形式总是需要显式批准。`allow-always` 仍然可以持久化良性的解释器/脚本调用，但内联 eval 形式每次仍会提示。
- `tools.exec.pathPrepend`: 为 exec 运行追加到 `PATH` 前面的目录列表（仅 gateway + sandbox）。
- `tools.exec.safeBins`: 仅 stdin 的安全二进制文件，可在没有显式允许列表条目的情况下运行。行为细节参见 [Safe bins](/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`: 为 `safeBins` 路径检查额外显式信任的目录。`PATH` 条目绝不会被自动信任。内置默认值为 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`: 每个安全 bin 的可选自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

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

- `host=gateway`：将你的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖项会
  被主机执行拒绝。守护进程本身仍使用最小 `PATH` 运行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`。
  OpenClaw 会通过内部环境变量在 profile 加载后追加 `env.PATH`（无 shell 插值）；
  `tools.exec.pathPrepend` 在此同样适用。
- `host=node`：只会将你传递的、未被阻止的环境覆盖项发送到节点。`env.PATH` 覆盖项会
  被主机执行拒绝，并被 node 主机忽略。如果你需要在节点上添加额外的 PATH 条目，请
  配置节点主机服务环境（systemd/launchd）或将工具安装到标准位置。

按 agent 绑定节点（在配置中使用 agent 列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：Nodes 选项卡包含一个小型“Exec 节点绑定”面板，用于相同设置。

## 会话覆盖（`/exec`）

使用 `/exec` 来设置 **按会话** 的 `host`、`security`、`ask` 和 `node` 默认值。
不带参数发送 `/exec` 可显示当前值。

示例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授权模型

只有对 **已授权发送者**（频道允许列表/配对加上 `commands.useAccessGroups`）才会处理 `/exec`。
它只更新 **会话状态**，不会写入配置。要彻底禁用 exec，请通过工具
策略将其拒绝（`tools.deny: ["exec"]` 或按 agent 拒绝）。主机审批仍然适用，除非你显式设置
`security=full` 且 `ask=off`。

## Exec 审批（伴侣应用 / node 主机）

沙箱化 agent 在 `exec` 运行到 gateway 或 node 主机之前，可能需要逐请求审批。
有关策略、允许列表和 UI 流程，请参见 [Exec approvals](/tools/exec-approvals)。

当需要审批时，exec 工具会立即返回
`status: "approval-pending"` 和一个审批 id。一旦获批（或被拒绝 / 超时），
Gateway 会发出系统事件（`Exec finished` / `Exec denied`）。如果命令在
`tools.exec.approvalRunningNoticeMs` 之后仍在运行，则会发出一次 `Exec running` 通知。
在具有原生审批卡片/按钮的频道中，agent 应首先依赖该
原生 UI，只有当工具结果明确说明聊天审批不可用，或者手动审批是
唯一途径时，才包含手动的 `/approve` 命令。

## 允许列表 + 安全 bin

手动允许列表强制执行会匹配已解析的二进制路径 glob 和裸命令名
glob。裸名称只匹配通过 PATH 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配
`/opt/homebrew/bin/rg`，但不能匹配 `./rg` 或 `/tmp/rg`。当 `security=allowlist` 时，shell 命令只有在每个管道
段都在允许列表中或属于安全 bin 时才会被自动允许。串联（`;`、`&&`、`||`）和重定向
在允许列表模式下会被拒绝，除非每个顶级段都满足允许列表（包括安全 bin）。重定向仍然不受支持。
持久的 `allow-always` 信任不会绕过该规则：串联命令仍然需要每个
顶级段都匹配。

`autoAllowSkills` 是 exec 审批中的一个独立便捷路径。它不同于
手动路径允许列表条目。对于严格的显式信任，请保持 `autoAllowSkills` 处于禁用状态。

将这两个控制项用于不同用途：

- `tools.exec.safeBins`：小型、仅 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：为安全 bin 可执行路径显式添加额外受信任目录。
- `tools.exec.safeBinProfiles`：为自定义安全 bin 显式指定 argv 策略。
- 允许列表：对可执行路径的显式信任。

不要把 `safeBins` 当作通用允许列表，也不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果你需要这些，请使用显式允许列表条目并保持审批提示启用。
`openclaw security audit` 在解释器/运行时 `safeBins` 条目缺少显式配置文件时会发出警告，而 `openclaw doctor --fix` 可以为缺失的自定义 `safeBinProfiles` 条目生成脚手架。
`openclaw security audit` 和 `openclaw doctor` 还会在你显式把 `jq` 这类行为较宽的 bin 重新添加到 `safeBins` 时发出警告。
如果你显式允许列表中的解释器，请启用 `tools.exec.strictInlineEval`，这样内联代码求值形式仍然需要新的审批。

有关完整的策略细节和示例，请参见 [Exec approvals](/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

## 示例

前台：

```json
{ "tool": "exec", "command": "ls -la" }
```

后台 + 轮询：

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

轮询用于按需查看状态，而不是等待循环。如果启用了自动完成唤醒，
命令在输出内容或失败时可以唤醒会话。

发送按键（tmux 风格）：

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

提交（仅发送 CR）：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴（默认以括号包裹）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的一个子工具，用于结构化的多文件编辑。
它默认对 OpenAI 和 OpenAI Codex 模型启用。只有当你想要禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

注意：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["write"]` 会隐式允许 `apply_patch`。
- `deny: ["write"]` 不会拒绝 `apply_patch`；如果补丁写入也应被阻止，请显式拒绝 `apply_patch`，或在需要阻止补丁写入时使用 `deny: ["group:fs"]`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 的默认值为 `true`；将其设置为 `false` 可为 OpenAI 模型禁用该工具。
- `tools.exec.applyPatch.workspaceOnly` 的默认值为 `true`（仅限工作区内）。只有当你明确希望 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。

## 相关内容

- [Exec Approvals](/tools/exec-approvals) — shell 命令的审批门禁
- [沙箱](/gateway/sandboxing) — 在沙箱环境中运行命令
- [后台进程](/gateway/background-process) — 长时间运行的 exec 和 process 工具
- [安全性](/gateway/security) — 工具策略和提升权限
