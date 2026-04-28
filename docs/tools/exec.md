---
summary: "Exec 工具的使用、stdin 模式及 TTY 支持"
read_when:
  - 使用或修改 exec 工具时
  - 调试 stdin 或 TTY 行为时
title: "Exec 工具"
---

在工作区中运行 shell 命令。通过 `process` 支持前台 + 后台执行。
如果不允许 `process`，`exec` 会同步运行并忽略 `yieldMs`/`background`。
后台会话按代理划分作用域；`process` 只能看到来自同一代理的会话。

## 参数

<ParamField path="command" type="string" required>
要运行的 shell 命令。
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
命令的工作目录。
</ParamField>

<ParamField path="env" type="object">
在继承环境之上合并的键/值环境覆盖项。
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
在此延迟（ms）后自动将命令转入后台。
</ParamField>

<ParamField path="background" type="boolean" default="false">
立即将命令转入后台，而不是等待 `yieldMs`。
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
覆盖此调用的已配置 exec 超时时间。仅当命令应在没有 exec 进程超时的情况下运行时，才设置 `timeout: 0`。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
在可用时在伪终端中运行。用于仅支持 TTY 的 CLI、编码代理和终端 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
在哪里执行。`auto` 在沙箱运行时解析为 `sandbox`，否则解析为 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
`gateway` / `node` 执行的强制模式。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
`gateway` / `node` 执行的批准提示行为。
</ParamField>

<ParamField path="node" type="string">
当 `host=node` 时的节点 id/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
请求提升模式 — 逃离沙箱并进入已配置的主机路径。仅当提升解析为 `full` 时才强制 `security=full`。
</ParamField>

备注：

- `host` 默认为 `auto`：当会话启用了沙箱运行时则为 sandbox，否则为 gateway。
- `auto` 是默认路由策略，不是通配符。从 `auto` 出发，单次调用可使用 `host=node`；只有在没有启用沙箱运行时时，单次调用才允许 `host=gateway`。
- 在没有额外配置时，`host=auto` 仍然“直接可用”：没有沙箱时会解析为 `gateway`；有活动沙箱时则保持在沙箱中。
- `elevated` 会将沙箱逃逸到已配置的主机路径：默认是 `gateway`，如果 `tools.exec.host=node`（或会话默认是 `host=node`）则为 `node`。仅当当前会话/提供方启用了提升访问时才可用。
- `gateway`/`node` 的批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配对的节点（伴随应用或无头节点宿主）。
- 如果可用节点不止一个，请设置 `exec.node` 或 `tools.exec.node` 进行选择。
- `exec host=node` 是节点唯一的 shell 执行路径；旧的 `nodes.run` 包装器已被移除。
- `timeout` 适用于前台、后台、`yieldMs`、gateway、sandbox 以及 node 的 `system.run` 执行。如果省略，OpenClaw 会使用 `tools.exec.timeoutSec`；显式设置 `timeout: 0` 会为该调用禁用 exec 进程超时。
- 在非 Windows 主机上，exec 在设置了 `SHELL` 时会使用它；如果 `SHELL` 是 `fish`，则优先使用 `PATH` 中的 `bash`（或 `sh`），以避免与 fish 不兼容的脚本，然后在两者都不存在时回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7（`pwsh`）（Program Files、ProgramW6432，然后是 PATH），然后回退到 Windows PowerShell 5.1。
- 主机执行（`gateway`/`node`）会拒绝 `env.PATH` 和加载器覆盖（`LD_*`/`DYLD_*`），以防止二进制劫持或注入代码。
- OpenClaw 会在生成的命令环境中设置 `OPENCLAW_SHELL=exec`（包括 PTY 和 sandbox 执行），以便 shell/profile 规则能够检测 exec 工具上下文。
- 重要：沙箱默认是**关闭**的。如果沙箱关闭，隐式 `host=auto`
  会解析为 `gateway`。显式 `host=sandbox` 仍会直接失败，而不是静默地
  在 gateway 主机上运行。请启用沙箱，或使用带批准的 `host=gateway`。
- 脚本预检检查（用于常见的 Python/Node shell 语法错误）只会检查
  有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则会跳过
  该文件的预检。
- 对于现在开始的长时间运行工作，只启动一次并依赖自动
  完成唤醒（如果已启用），当命令输出或失败时会触发。
  使用 `process` 查看日志、状态、输入或干预；不要用
  sleep 循环、超时循环或重复轮询来模拟调度。
- 对于应在稍后或按计划发生的工作，请使用 cron，而不是
  `exec` 的 sleep/delay 模式。

## 配置

- `tools.exec.notifyOnExit`（默认：true）：为 true 时，后台 exec 会话会在退出时排队一个系统事件并请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认：10000）：当受审批门控的 exec 运行超过此时长时，发出一次“running”通知（0 表示禁用）。
- `tools.exec.timeoutSec`（默认：1800）：每个命令的默认 exec 超时时间（秒）。单次调用的 `timeout` 会覆盖它；单次调用的 `timeout: 0` 会禁用该调用的 exec 进程超时。
- `tools.exec.host`（默认：`auto`；当沙箱运行时启用时解析为 `sandbox`，否则为 `gateway`）
- `tools.exec.security`（默认：沙箱为 `deny`，gateway + node 在未设置时为 `full`）
- `tools.exec.ask`（默认：`off`）
- 默认情况下，gateway + node 使用无需批准的主机 exec。如果你想要审批/允许列表行为，请同时收紧 `tools.exec.*` 和主机 `~/.openclaw/exec-approvals.json`；参见 [Exec approvals](/tools/exec-approvals#no-approval-yolo-mode)。
- YOLO 来自主机策略默认值（`security=full`、`ask=off`），而不是来自 `host=auto`。如果你想强制 gateway 或 node 路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加 `ask=off` 模式下，主机 exec 会直接遵循配置的策略；不存在额外的启发式命令混淆预过滤或脚本预检拒绝层。
- `tools.exec.node`（默认：未设置）
- `tools.exec.strictInlineEval`（默认：false）：当为 true 时，`python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e` 等内联解释器 eval 形式始终需要明确批准。`allow-always` 仍可保留良性的解释器/脚本调用，但内联 eval 形式每次仍会提示。
- `tools.exec.pathPrepend`：在 exec 运行时要预先添加到 `PATH` 的目录列表（仅 gateway + sandbox）。
- `tools.exec.safeBins`：可在无需显式允许列表条目的情况下运行的仅 stdin 安全二进制文件。行为细节请参见 [Safe bins](/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用于 `safeBins` 路径检查的额外显式信任目录。`PATH` 条目永远不会被自动信任。内置默认值为 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每个安全二进制的可选自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

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

- `host=gateway`：将你的登录 shell `PATH` 合并到 exec 环境。主机执行拒绝 `env.PATH` 覆盖。守护进程本身仍运行在最小的 `PATH` 中：
  - macOS：`/opt/homebrew/bin`，`/usr/local/bin`，`/usr/bin`，`/bin`
  - Linux：`/usr/local/bin`，`/usr/bin`，`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），`/etc/profile` 可能重置 `PATH`。OpenClaw 通过内部环境变量（无 shell 插值）在 profile 之后插入 `env.PATH`；`tools.exec.pathPrepend` 也适用。
- `host=node`：只发送你传入的非被拒绝环境覆盖。主机执行和节点宿主均拒绝 `env.PATH` 覆盖且忽略。需要额外 PATH 条目时，配置节点宿主服务环境（systemd/launchd）或将工具安装到标准位置。

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
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对**授权发起者**响应（渠道允许列表/配对+ `commands.useAccessGroups`）。  
其仅更新**会话状态**，不写配置。若需完全禁用 exec，可通过工具策略拒绝（`tools.deny: ["exec"]` 或针对某代理）。  
主机批准规则仍然生效，除非你明确设置 `security=full` 和 `ask=off`。

## Exec 批准（伴随应用 / 节点宿主）

沙箱代理可要求每次在 gateway 或节点主机上执行 exec 之前必须获得批准。  
详见 [Exec 批准](/tools/exec-approvals) 了解策略、允许列表和 UI 流程。

当需要审批时，exec 工具会立即返回，状态为
`status: "approval-pending"` 并附带一个审批 id。一旦批准（或拒绝/超时），
Gateway 会发出系统事件（`Exec finished` / `Exec denied`）。如果命令在
`tools.exec.approvalRunningNoticeMs` 之后仍在运行，则会发出一次 `Exec running` 通知。
在带有原生审批卡片/按钮的渠道上，代理应优先依赖该原生 UI，
只有当工具结果明确指出聊天审批不可用，或手动审批是
唯一途径时，才包含手动 `/approve` 命令。

## 允许列表 + 安全二进制

手动允许列表强制仅匹配**解析后的二进制路径**（不匹配 basename）。当
`security=allowlist` 时，只有当管道中的每个段都在允许列表中或是安全二进制时，shell 命令才会被自动允许。串联（`;`、`&&`、`||`）和重定向在
允许列表模式下会被拒绝，除非每个顶层段都满足允许列表（包括安全二进制）。  
重定向仍不受支持。
持久化的 `allow-always` 信任不会绕过该规则：链式命令仍然需要每个
顶层段都匹配。

`autoAllowSkills` 是 exec 批准中的一个便捷功能，不同于手动路径允许列表。为严格的明确信任，请关闭 `autoAllowSkills`。

两种机制各自适用不同场景：

- `tools.exec.safeBins`：小型、仅 stdin 流的过滤器。
- `tools.exec.safeBinTrustedDirs`：用于安全二进制可执行路径的额外显式信任目录。
- `tools.exec.safeBinProfiles`：安全二进制的自定义命令行参数策略。
- 允许列表：针对可执行路径的显式信任。

不要将 `safeBins` 视为通用允许列表，也不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果需要这些，请使用显式允许列表条目并保持批准提示启用。  
`openclaw security audit` 会在解释器/运行时 `safeBins` 条目缺少显式配置文件时发出警告，`openclaw doctor --fix` 可以搭建缺失的自定义 `safeBinProfiles` 条目。  
`openclaw security audit` 和 `openclaw doctor` 也会在你显式将 `jq` 等行为广泛的二进制文件重新添加回 `safeBins` 时发出警告。  
如果你显式允许列表解释器，请启用 `tools.exec.strictInlineEval`，以便内联代码评估形式仍然需要新的批准。

有关完整的策略细节和示例，请参见 [Exec approvals](/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

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

轮询用于按需查看状态，而不是等待循环。如果启用了自动完成唤醒，
命令在产生输出或失败时可以唤醒会话。

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

## apply_patch

`apply_patch` 是 `exec` 的一个子工具，用于结构化多文件编辑。
它默认对 OpenAI 和 OpenAI Codex 模型启用。仅当你想禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

备注：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["write"]` 隐式允许 `apply_patch`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 默认为 `true`; 设置为 `false` 可为 OpenAI 模型禁用该工具。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限制在工作区内）。仅当你有意希望 `apply_patch` 在工作区目录之外写入/删除时才将其设置为 `false`。

## 相关内容

- [Exec 批准](/tools/exec-approvals) — shell 命令的批准网关
- [沙箱](/gateway/sandboxing) — 在沙箱环境中运行命令
- [后台进程](/gateway/background-process) — 长时间运行的 exec 和 process 工具
- [安全性](/gateway/security) — 工具策略和提升的访问权限
