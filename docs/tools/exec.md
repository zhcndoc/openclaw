---
summary: "Exec 工具使用、stdin 模式和 TTY 支持"
read_when:
  - 使用或修改 exec 工具时
  - 调试 stdin 或 TTY 行为时
title: "Exec 工具"
---

在工作区中运行 shell 命令。`exec` 是一个会修改环境的 shell 接口：命令可以在所选主机或沙箱文件系统允许的任何位置创建、编辑或删除文件。禁用 OpenClaw 文件系统工具（如 `write`、`edit` 或 `apply_patch`）并不会让 `exec` 变成只读。

支持通过 `process` 进行前台和后台执行。如果 `process` 被禁止，`exec` 将同步运行并忽略 `yieldMs`/`background`。后台会话按代理划分作用域；`process` 只能看到来自同一代理的会话。

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
覆盖此调用中配置的 exec 超时时间（秒）。适用于前台、后台、`yieldMs`、gateway、sandbox 以及 node 的 `system.run` 执行。`timeout: 0` 会为该调用禁用 exec 进程超时。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
在可用时于伪终端中运行。用于仅支持 TTY 的 CLI、编码 agent 和终端 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
在哪里执行。`auto` 在沙箱运行时处于活动状态时解析为 `sandbox`，否则解析为 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
对普通工具调用忽略。`gateway`/`node` 安全性由 `tools.exec.security` 和主机审批文件控制；只有当操作员明确授予提升访问权限时，提升模式才能强制 `security=full`。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
基础 ask 模式来自 `tools.exec.ask` 和主机审批。对于源自通道的模型调用，当有效主机 ask 为 `off` 时，按调用设置的 `ask` 会被忽略；否则它最多只能收紧为更严格的模式。使用显式 `ask` 值构造 exec 工具的受信任内部/API 调用保持不变。
</ParamField>

<ParamField path="node" type="string">
当 `host=node` 时的节点 id/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
请求提升模式：从沙箱逃逸到已配置的主机路径。仅当提升结果解析为 `full` 时才会强制 `security=full`。
</ParamField>

注意：

- `host` 仅接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主机名选择器；类主机名的值会在命令运行前被拒绝。
- 从 `auto` 可按调用设置 `host=node`；仅当没有活动的沙箱运行时，才允许按调用设置 `host=gateway`。
- 在没有额外配置的情况下，`host=auto` 仍然“直接可用”：没有沙箱时会解析为 `gateway`；有活动沙箱时会保留在沙箱中。
- `elevated` 会从沙箱逃逸到已配置的主机路径：默认是 `gateway`，或者当 `tools.exec.host=node`（或会话默认值为 `host=node`）时为 `node`。它仅在当前会话/提供方已启用提升访问时可用。
- `gateway`/`node` 的审批由主机审批文件控制。
- `node` 需要配对的节点（伴侣应用或无头节点主机）。如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 以选择其一。
- `exec host=node` 是节点唯一的 Shell 执行路径；旧的 `nodes.run` 包装器已被移除。
- 在非 Windows 主机上，exec 会在设置了 `SHELL` 时使用它；如果 `SHELL` 是 `fish`，它会优先从 `PATH` 中选择 `bash`（或 `sh`），以避免与 fish 不兼容的 bash 语法，然后在两者都不存在时回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7（`pwsh`）（先查 Program Files、ProgramW6432，然后查 PATH），再回退到 Windows PowerShell 5.1。
- 在非 Windows 的 gateway 主机上，bash 和 zsh 的 exec 命令使用启动快照。OpenClaw 会从 shell 启动文件中捕获可加载的别名/函数和一小组安全环境变量到 `$OPENCLAW_STATE_DIR/cache/shell-snapshots/`，然后在每个 exec 命令前加载该快照。看起来像机密的变量会被排除；sandbox 和 node exec 不使用此快照。可在 Gateway 进程环境中设置 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` 以禁用此快照路径。
- 主机执行（`gateway`/`node`）会拒绝 `env.PATH` 和加载器覆盖项（`LD_*`/`DYLD_*`），以防止二进制劫持或注入代码。
- OpenClaw 会在生成的命令环境中设置 `OPENCLAW_SHELL=exec`（包括 PTY 和 sandbox 执行），以便 shell/profile 规则能够检测 exec 工具上下文。
- 对于源自通道的运行，当通道提供了这些 id 时，OpenClaw 还会在 `OPENCLAW_CHANNEL_CONTEXT` 中公开一个较窄的发送者/聊天身份 JSON 载荷。
- `exec` 不能运行 `openclaw channels login` 或 `/approve` shell 命令：`openclaw channels login` 是交互式通道认证流程，而 `/approve` 需要走审批命令处理器，而不是 shell。请在 gateway 主机上的终端中运行通道登录，或者在存在相应工具时使用特定于通道的登录代理工具（例如 `whatsapp_login`）。
- 重要：沙箱默认是**关闭**的。如果沙箱关闭，隐式的 `host=auto` 会解析为 `gateway`。显式的 `host=sandbox` 仍会失败并关闭，而不会静默在 gateway 主机上运行。请启用沙箱，或使用带审批的 `host=gateway`。
- 脚本预检检查（用于常见的 Python/Node Shell 语法错误）只检查有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则会跳过该文件的预检。当 `host=gateway` 且有效策略为 `security=full` 且 `ask=off` 时，预检也会完全跳过。
- 对于从现在开始的长时间运行工作，请只启动一次，并依赖已启用时的自动完成唤醒：当命令产生输出或失败时会触发唤醒。使用 `process` 获取日志、状态、输入或人工干预；不要用 sleep 循环、超时循环或重复轮询来模拟调度。
- 对于应当稍后或按计划发生的工作，请使用 cron，而不是 `exec` 的 sleep/delay 模式。

## 配置

| 键                                   | 默认                                                   | 备注                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools.exec.timeoutSec`              | `1800`                                                 | 默认每个命令的执行超时时间（秒）。单次调用的 `timeout` 会覆盖它；单次调用的 `timeout: 0` 会禁用 exec 进程超时。                                          |
| `tools.exec.host`                    | `auto`                                                 | 当沙盒运行时处于活动状态时解析为 `sandbox`，否则为 `gateway`。                                                                                           |
| `tools.exec.security`                | 沙盒为 `deny`，gateway/node 为 `full`，未设置时为 `full` |                                                                                                                                                         |
| `tools.exec.ask`                     | `off`                                                  |                                                                                                                                                         |
| `tools.exec.mode`                    | 未设置                                                 | 规范化的策略开关。见下方 [Modes](#modes)。不能与 `tools.exec.security`/`tools.exec.ask` 组合使用。                                                     |
| `tools.exec.node`                    | 未设置                                                 |                                                                                                                                                         |
| `tools.exec.notifyOnExit`            | `true`                                                 | 为 true 时，后台运行的 exec 会话在退出时会入队一个系统事件并请求一次心跳。                                                                               |
| `tools.exec.approvalRunningNoticeMs` | `10000`                                                | 当需要审批的 exec 运行超过该时长时，发出一次“running”通知（`0` 表示禁用）。                                                                             |
| `tools.exec.strictInlineEval`        | `false`                                                | 见 [Inline eval](#inline-eval-strictinlineeval)。                                                                                                       |
| `tools.exec.commandHighlighting`     | `false`                                                | 为 true 时，审批提示可以在命令文本中高亮解析器识别出的命令片段。可全局或按 agent 设置；不会改变审批策略。                                                |
| `tools.exec.pathPrepend`             | 未设置                                                 | 要在 exec 运行时追加到 `PATH` 前面的目录列表（仅 gateway + sandbox）。                                                                                   |
| `tools.exec.safeBins`                | 未设置                                                 | 可通过 stdin-only 运行、且无需显式 allowlist 条目的安全二进制程序。见 [Safe bins](/tools/exec-approvals-advanced#safe-bins-stdin-only)。                |
| `tools.exec.safeBinTrustedDirs`      | `/bin`、`/usr/bin`                                     | 用于 `safeBins` 路径检查的额外显式受信任目录。`PATH` 条目绝不会被自动信任。                                                                            |
| `tools.exec.safeBinProfiles`         | 未设置                                                 | 每个安全二进制程序可选的自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。                                      |

对于 gateway 和 node，默认是无审批的 host exec（`security=full`，`ask=off`）——这来自 host-policy 默认值，而不是来自 `host=auto`。如果你想要审批/allowlist 行为，请同时收紧 `tools.exec.*` 和 host approvals 文件；见 [Exec approvals](/tools/exec-approvals#yolo-mode-no-approval)。如果要无论沙盒状态如何都强制使用 gateway 或 node 路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。

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

### Modes

`tools.exec.mode` 是规范化的策略开关。设置它会派生出 `security`/`ask`，并且不能与显式的 `tools.exec.security`/`tools.exec.ask` 组合使用。

| 模式        | security    | ask       | 行为                                                                                                                         |
| ----------- | ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `deny`      | `deny`      | `off`     | 禁止 exec。                                                                                                                  |
| `allowlist` | `allowlist` | `off`     | 仅允许 allowlist/safe-bin 中的命令运行；其他命令都不会询问。                                                                  |
| `ask`       | `allowlist` | `on-miss` | allowlist 匹配的命令直接运行；其他所有命令都向人工询问。                                                                     |
| `auto`      | `allowlist` | `on-miss` | allowlist/safe-bin 匹配的命令直接运行；其他所有命令先经 OpenClaw 的原生自动审查，再向人工询问。                               |
| `full`      | `full`      | `off`     | 没有审批关卡。                                                                                                               |

`ask`/`ask=always` 仍然会每次都询问人工，无论模式如何。

### Inline eval (`strictInlineEval`)

当 `tools.exec.strictInlineEval` 为 `true` 时，内联解释器求值形式需要审查者或显式审批：`python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e`、`osascript -e`，以及其他受支持解释器和命令载体中的类似形式（如 `awk`、`find -exec`、`make`、`sed`、`xargs` 等更多形式）。在 `mode=auto` 下，常规 exec 审批路径可能会让原生自动审查者放行一个明显低风险的一次性命令；但直接的 node-host `system.run` 调用仍需要显式审批，因为它们无法把命令交给人工审批路线。如果审查者提出要求，请求会转给人工。`allow-always` 仍然可以为良性的解释器/脚本调用持久化规则，但内联 eval 形式不会变成持久化的允许规则。

### PATH 处理

- `host=gateway`：将你的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖会被拒绝用于 host 执行。daemon 本身仍使用最小 `PATH` 运行：
  - macOS: `/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux: `/usr/local/bin`、`/usr/bin`、`/bin`
  - 为防止用户 shell 配置（如 `~/.zshenv` 或 `/etc/zshenv`）在启动期间覆盖优先路径，`tools.exec.pathPrepend` 条目会在执行前，安全地预先追加到 shell 命令内最终的 `PATH` 前面。
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`。OpenClaw 会在 profile 加载后，通过内部环境变量（不做 shell 插值）把 `env.PATH` 预先追加进去；`tools.exec.pathPrepend` 在这里同样生效。
- `host=node`：只会发送你传入的、未被阻止的 env 覆盖项。`env.PATH` 覆盖会被拒绝用于 host 执行，并被 node hosts 忽略。如果你需要在 node 上增加 PATH 条目，请配置 node host service 环境（systemd/launchd）或将工具安装到标准位置。

按 agent 绑定节点（在配置中使用 agent 列表索引）：

```bash
openclaw config get agents.list
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
```

控制 UI：Nodes 选项卡包含一个小型“Exec 节点绑定”面板，用于相同设置。

## 会话覆盖（`/exec`）

使用 `/exec` 来设置 **每个会话** 的 `host`、`security`、`ask` 和 `node` 默认值。发送不带参数的 `/exec` 可显示当前值。

示例：

```text
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

只有 **已授权的发送方**（频道允许列表/配对以及 `commands.useAccessGroups`）才会接受 `/exec`。它只更新 **会话状态**，不会写入配置。已授权的外部频道发送方可以设置这些会话默认值。内部网关/webchat 客户端需要 `operator.admin` 才能持久化这些设置。

若要完全禁用 exec，请通过工具策略将其拒绝（`tools.deny: ["exec"]` 或按 agent 设置）。除非你明确设置 `security=full` 和 `ask=off`，否则仍然适用主机审批。

## Exec 审批（伴侣应用 / node 主机）

沙盒化代理在网关或 node 主机上运行 `exec` 之前，可能需要按请求进行审批。有关策略、允许列表和 UI 流程，请参见 [Exec 审批](/tools/exec-approvals)。

当需要审批时，exec 工具会立即返回 `status: "approval-pending"` 和一个审批 id。一旦获得批准（或被拒绝 / 超时），Gateway 只会针对已批准的运行发出命令进度和完成系统事件（`Exec running` / `Exec finished`）。被拒绝或超时的审批会终结流程，不会通过拒绝系统事件唤醒代理会话。

在具有原生审批卡片/按钮的渠道中，代理应首先依赖该原生 UI，只有在工具结果明确说明聊天审批不可用，或手动审批是唯一途径时，才应包含手动 `/approve` 命令。

## 允许列表 + 安全 bin

手动允许列表强制会匹配已解析的二进制路径 glob 和裸命令名 glob。裸名称只匹配通过 PATH 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但不能匹配 `./rg` 或 `/tmp/rg`。

当 `security=allowlist` 时，只有在流水线中的每个分段都在允许列表中或属于安全 bin 时，shell 命令才会被自动允许。除非每个顶层分段都满足允许列表（包括安全 bin），否则链式操作（`;`、`&&`、`||`）和重定向会在允许列表模式下被拒绝。重定向仍然不受支持。持久化的 `allow-always` 信任不会绕过该规则：链式命令仍然要求每个顶层分段都匹配。

`autoAllowSkills` 是 exec 审批中的一个单独便捷路径，不同于手动路径允许列表条目。若要严格地显式信任，请保持 `autoAllowSkills` 处于禁用状态。

将这两个控制项用于不同用途：

- `tools.exec.safeBins`：小型、仅 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：为安全 bin 可执行路径显式添加额外受信任目录。
- `tools.exec.safeBinProfiles`：为自定义安全 bin 显式指定 argv 策略。
- 允许列表：对可执行路径的显式信任。

不要将 `safeBins` 视为通用允许列表，也不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果你需要这些，请使用显式允许列表条目并保持审批提示启用。

`openclaw security audit` 会在解释器/运行时 `safeBins` 条目缺少显式配置文件时发出警告，而 `openclaw doctor --fix` 可以为缺失的自定义 `safeBinProfiles` 条目生成脚手架。`openclaw security audit` 和 `openclaw doctor` 还会在你显式将 `jq` 这类具有宽泛行为的 bin 重新加入 `safeBins` 时发出警告（`jq` 支持宽泛程序和内置功能，因此应优先使用显式允许列表条目或受审批门控的运行方式）。如果你显式允许列表了解释器，请启用 `tools.exec.strictInlineEval`，这样内联代码求值形式仍然需要审阅者或显式批准。

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

轮询用于按需获取状态，不用于等待循环。如果启用了自动完成唤醒，命令在输出或失败时可以唤醒会话。

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

`apply_patch` 是 `exec` 的一个子工具，用于结构化的多文件编辑。它默认启用，并且对任何模型提供方都可用；`allowModels` 可以对其进行限制。只有在你想要禁用它或将其限制给特定模型时，才使用配置：

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

- 工具策略仍然适用；`allow: ["write"]` 会隐式允许 `apply_patch`。
- `deny: ["write"]` 不会拒绝 `apply_patch`；如果也要阻止补丁写入，请显式拒绝 `apply_patch`，或者在应同时阻止补丁写入时使用 `deny: ["group:fs"]`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 的默认值是 `true`；将其设为 `false` 可禁用该工具。
- `tools.exec.applyPatch.workspaceOnly` 的默认值是 `true`（仅限工作区内）。只有在你有意让 `apply_patch` 在工作区目录之外进行写入/删除时，才将其设为 `false`。
- `tools.exec.applyPatch.allowModels` 是一个可选的模型 id 白名单（原始格式，如 `gpt-5.4`，或完整格式，如 `openai/gpt-5.4`）。设置后，只有匹配的模型才能使用该工具；未设置时，所有模型都可使用。

## 相关内容

- [执行审批](/tools/exec-approvals) — shell 命令的审批门禁
- [沙箱](/gateway/sandboxing) — 在沙箱环境中运行命令
- [后台进程](/gateway/background-process) — 长时间运行的 exec 和 process 工具
- [安全性](/gateway/security) — 工具策略和提升权限
