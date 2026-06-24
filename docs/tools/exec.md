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
普通工具调用会忽略。`gateway` / `node` 的安全性由
`tools.exec.security` 和主机审批文件控制；提升模式只能在操作员明确授予提升访问权限时，
强制使用 `security=full`。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
基础 ask 模式来自 `tools.exec.ask` 和主机审批。
对于 channel-origin 模型调用，当有效主机 ask 为 `off` 时，每次调用的 `ask` 会被忽略；否则它最多只能收紧到更严格的模式。通过显式 `ask` 值构造 exec 工具的受信任内部/API 调用保持不变。
</ParamField>

<ParamField path="node" type="string">
当 `host=node` 时的节点 id/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
请求提升模式——从沙箱跳转到已配置的主机路径。只有当 elevated 解析为 `full` 时，才强制使用 `security=full`。
</ParamField>

注意：

- `host` 默认值为 `auto`：当会话中沙箱运行时处于活动状态时使用 sandbox，否则使用 gateway。
- `host` 只接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主机名选择器；类似主机名的值会在命令运行前被拒绝。
- `auto` 是默认路由策略，不是通配符。单次调用中 `host=node` 允许从 `auto` 路由；单次调用中 `host=gateway` 仅在没有活动沙箱运行时时允许。
- `tools.exec.mode` 是规范化的策略开关。可选值为 `deny`、`allowlist`、`ask`、`auto` 和 `full`。`auto` 会直接运行确定性的 allowlist/safe-bin 匹配，并将其余所有 exec 审批情况先交给 OpenClaw 原生自动审阅器，然后再请求人工审批。`ask` / `ask=always` 仍然每次都请求人工审批。
- 在没有额外配置时，`host=auto` 依然“开箱即用”：没有沙箱时会解析为 `gateway`；有活动沙箱时则保持在沙箱中。
- `elevated` 会将沙箱跳转到已配置的主机路径：默认是 `gateway`，或者在 `tools.exec.host=node` 时为 `node`（或会话默认是 `host=node` 时）。它仅在当前会话/提供方启用了提升访问权限时可用。
- `gateway`/`node` 的审批由主机审批文件控制。
- `node` 需要配对的节点（伴随应用或无头节点主机）。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 进行选择。
- `exec host=node` 是节点唯一的 shell 执行路径；旧的 `nodes.run` 包装器已被移除。
- `timeout` 适用于前台、后台、`yieldMs`、gateway、sandbox，以及 node 的 `system.run` 执行。如果省略，OpenClaw 使用 `tools.exec.timeoutSec`；显式 `timeout: 0` 会禁用该调用的 exec 进程超时。
- 在非 Windows 主机上，exec 会在设置了 `SHELL` 时使用它；如果 `SHELL` 是 `fish`，则优先从 `PATH` 中选择 `bash`（或 `sh`）以避免 fish 不兼容脚本，然后在两者都不存在时回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7（`pwsh`）（Program Files、ProgramW6432，然后是 PATH），然后回退到 Windows PowerShell 5.1。
- 在非 Windows 的 gateway 主机上，bash 和 zsh 的 exec 命令会使用启动快照。OpenClaw 会从 shell 启动文件中捕获可源入的
  别名/函数以及一小组安全环境变量到
  `$OPENCLAW_STATE_DIR/cache/shell-snapshots/`，然后在每个 exec 命令前先 source 该快照。
  类似机密的变量会被排除；sandbox 和 node exec 不使用该快照。在 Gateway 进程环境中设置
  `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` 可禁用此快照路径。
- 主机执行（`gateway`/`node`）会拒绝 `env.PATH` 和加载器覆盖（`LD_*`/`DYLD_*`），以防止二进制劫持或注入代码。
- OpenClaw 会在派生的命令环境中设置 `OPENCLAW_SHELL=exec`（包括 PTY 和 sandbox 执行），以便 shell/profile 规则识别 exec 工具上下文。
- 对于 channel-origin 运行，如果 channel 提供了那些 id，OpenClaw 还会在 `OPENCLAW_CHANNEL_CONTEXT` 中暴露一个窄范围的发送者/聊天身份 JSON 负载。
- `openclaw channels login` 被 `exec` 阻止，因为它是一个交互式 channel 认证流程；请在 gateway 主机上的终端中运行它，或者在存在时使用聊天中的 channel 原生登录工具。
- 重要：默认情况下**未开启**沙箱。如果沙箱未开启，隐式的 `host=auto`
  会解析为 `gateway`。显式 `host=sandbox` 仍会失败关闭，而不会悄悄
  在 gateway 主机上运行。请启用沙箱或使用带审批的 `host=gateway`。
- 脚本预检检查（用于常见的 Python/Node shell 语法错误）只会检查
  有效 `workdir` 边界内的文件。如果某个脚本路径解析到了 `workdir` 外部，则会跳过
  该文件的预检。
- 对于现在开始的长时间运行工作，只启动一次，并在启用自动
  完成唤醒且命令有输出或失败时依赖它来唤醒。
  使用 `process` 获取日志、状态、输入或干预；不要用 sleep 循环、timeout 循环或重复轮询来模拟
  调度。
- 对于应该稍后执行或按计划执行的工作，请使用 cron，而不是
  `exec` 的 sleep/delay 模式。

## 配置

- `tools.exec.notifyOnExit`（默认：true）：为 true 时，后台执行的 exec 会话会在退出时排入系统事件并请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认：10000）：当受审批门控的 exec 运行超过该时长时，发出一次“运行中”通知（0 可禁用）。
- `tools.exec.timeoutSec`（默认：1800）：默认的每条命令 exec 超时时间（秒）。单次调用的 `timeout` 会覆盖它；单次调用的 `timeout: 0` 会禁用该调用的 exec 进程超时。
- `tools.exec.host`（默认：`auto`；当沙箱运行时处于活动状态时解析为 `sandbox`，否则为 `gateway`）
- `tools.exec.security`（默认：sandbox 为 `deny`，gateway + node 在未设置时为 `full`）
- `tools.exec.ask`（默认：`off`）
- gateway + node 默认使用免审批 host exec。如果你想要审批/allowlist 行为，请同时收紧 `tools.exec.*` 和主机审批文件；参见 [Exec approvals](/tools/exec-approvals#yolo-mode-no-approval)。
- YOLO 来自主机策略默认值（`security=full`、`ask=off`），而不是 `host=auto`。如果你想强制 gateway 或 node 路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 且 `ask=off` 模式下，host exec 会直接遵循已配置策略；不会有额外的启发式命令混淆预过滤或脚本预检拒绝层。
- `tools.exec.node`（默认：未设置）
- `tools.exec.strictInlineEval`（默认：false）：当为 true 时，诸如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e` 这类内联解释器 eval 形式需要审阅者或显式审批。在 `mode=auto` 下，正常的 exec 审批路径可能会让原生自动审阅器允许一个明显低风险的单次命令；直接的 node-host `system.run` 调用仍然需要显式审批，因为它们无法把命令交给人工审批路径。如果审阅者提出请求，则该请求会转给人工。`allow-always` 仍然可以持久化良性的解释器/脚本调用，但内联 eval 形式不会变成持久的 allow 规则。
- `tools.exec.commandHighlighting`（默认：false）：当为 true 时，审批提示可在命令文本中高亮由解析器派生的命令跨度。可全局或按 agent 设置为 `true`，以启用命令文本高亮而不改变 exec 审批策略。
- `tools.exec.pathPrepend`：为 exec 运行在 `PATH` 前追加的目录列表（仅 gateway + sandbox）。
- `tools.exec.safeBins`：仅支持 stdin 的安全二进制，可在没有显式 allowlist 条目的情况下运行。行为细节请参见 [Safe bins](/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：额外显式信任的目录，用于 `safeBins` 的路径检查。`PATH` 条目永远不会被自动信任。内置默认值为 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每个 safe bin 可选的自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

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
    - 为防止用户 shell 配置（如 `~/.zshenv` 或 `/etc/zshenv`）在启动期间覆盖优先级路径，`tools.exec.pathPrepend` 条目会在执行前被安全地预先添加到 shell 命令中的最终 `PATH`。
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`。
  OpenClaw 会通过内部环境变量在 profile 加载后追加 `env.PATH`（不进行 shell 插值）；
  `tools.exec.pathPrepend` 在这里同样适用。
- `host=node`：只会把你传入的、未被阻止的环境覆盖项发送到节点。`env.PATH` 覆盖项会
  被主机执行拒绝，并且会被节点主机忽略。如果你需要在节点上添加额外的 PATH 条目，
  请配置节点主机服务环境（systemd/launchd）或将工具安装到标准位置。

按 agent 绑定节点（在配置中使用 agent 列表索引）：

```bash
openclaw config get agents.list
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
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

`/exec` 仅对**授权发送者**生效（channel allowlists/pairing plus `commands.useAccessGroups`）。
它只会更新**会话状态**，不会写入配置。授权的外部 channel 发送者可以
设置这些会话默认值。内部 gateway/webchat 客户端需要 `operator.admin` 才能持久化这些值。
要彻底禁用 exec，请通过工具策略将其拒绝（`tools.deny: ["exec"]` 或按 agent 配置）。主机审批仍然适用，除非你显式设置 `security=full` 和 `ask=off`。

## Exec 审批（伴侣应用 / node 主机）

沙箱化 agent 在 `exec` 运行到 gateway 或 node 主机之前，可能需要逐请求审批。
有关策略、允许列表和 UI 流程，请参见 [Exec approvals](/tools/exec-approvals)。

当需要审批时，exec 工具会立即返回
`status: "approval-pending"` 和一个审批 id。一旦被批准（或被拒绝 / 超时），
Gateway 只会为已批准的运行发出命令进度和完成系统事件
（`Exec running` / `Exec finished`）。被拒绝或超时的审批是终态，不会
通过拒绝系统事件唤醒 agent 会话。
在带有原生审批卡片/按钮的频道中，agent 应优先依赖该
原生 UI，只有当工具结果明确说明聊天审批不可用或手动审批是
唯一途径时，才应包含手动 `/approve` 命令。

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

不要将 `safeBins` 视为通用允许列表，也不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果你需要这些，请使用显式允许列表条目并保持审批提示启用。
`openclaw security audit` 会在解释器/运行时 `safeBins` 条目缺少显式配置文件时发出警告，而 `openclaw doctor --fix` 可以为缺失的自定义 `safeBinProfiles` 条目生成脚手架。
当你显式将 `jq` 等具有宽泛行为的 bin 重新添加到 `safeBins` 时，`openclaw security audit` 和 `openclaw doctor` 也会发出警告。
如果你显式允许列出解释器，请启用 `tools.exec.strictInlineEval`，这样内联代码求值形式仍然需要审阅者或显式审批。

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

- [执行审批](/tools/exec-approvals) — shell 命令的审批门禁
- [沙箱](/gateway/sandboxing) — 在沙箱环境中运行命令
- [后台进程](/gateway/background-process) — 长时间运行的 exec 和 process 工具
- [安全性](/gateway/security) — 工具策略和提升权限
