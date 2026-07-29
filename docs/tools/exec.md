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

<ParamField path="timeout" type="number" default="tools.exec.timeoutSeconds">
覆盖此调用中已配置的 exec 超时时间，单位为秒。适用于前台、后台、`yieldMs`、gateway、sandbox，以及 node `system.run` 执行。`timeout: 0` 会为该调用禁用 exec 进程超时。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
在可用时于伪终端中运行。用于仅支持 TTY 的 CLI、编码 agent 和终端 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
在哪里执行。`auto` 在沙箱运行时处于活动状态时解析为 `sandbox`，否则解析为 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
常规工具调用会忽略。`gateway`/`node` 安全性由 `tools.exec.mode` 和主机批准文件决定；提升模式只有在操作员明确授予提升访问权限时，才能强制使用 full 访问。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
基线 ask 模式由 `tools.exec.mode` 和主机批准决定。对于 channel-origin 模型调用，当有效主机 ask 为 `off` 时，每次调用的 `ask` 会被忽略；否则它只能收紧为更严格的模式。
</ParamField>

<ParamField path="node" type="string">
当 `host=node` 时的节点 id/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
请求提升模式：从沙箱逃逸到已配置的主机路径。仅当提升结果解析为 `full` 时才会强制 `security=full`。
</ParamField>

注意：

- `host` 仅接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主机名选择器；在命令运行前，类似主机名的值会被拒绝。
- 每次调用都可以从 `auto` 使用 `host=node`；每次调用的 `host=gateway` 仅在没有活动的沙箱运行时才允许。
- 在没有额外配置的情况下，`host=auto` 仍然“可直接工作”：没有沙箱时会解析为 `gateway`；有运行中的沙箱时则保持在沙箱中。
- `elevated` 会将沙箱逃逸到已配置的主机路径：默认是 `gateway`，或者当 `tools.exec.host=node` 时为 `node`（或会话默认值为 `host=node`）。仅当当前会话/提供方启用了提升访问时才可用。
- `gateway`/`node` 的批准由主机批准文件控制。
- `node` 需要配对的节点（伴侣应用或无头节点主机）。如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- `exec host=node` 是节点唯一的 shell 执行路径；旧的 `nodes.run` 包装器已被移除。
- 在非 Windows 主机上，exec 会在设置了 `SHELL` 时使用它；如果 `SHELL` 是 `fish`，则会优先使用 `PATH` 中的 `bash`（或 `sh`），以避免 fish 不兼容的 bash 语法，然后如果两者都不存在才回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7（`pwsh`）（Program Files、ProgramW6432，然后是 PATH），然后回退到 Windows PowerShell 5.1。
- 在非 Windows 的 gateway 主机上，bash 和 zsh exec 命令使用启动快照。OpenClaw 会从 shell 启动文件中捕获可 source 的别名/函数以及一小组安全环境变量，保存到 `$OPENCLAW_STATE_DIR/cache/shell-snapshots/`，然后在每次 exec 命令前先 source 该快照。看起来像密钥的变量会被排除；sandbox 和 node exec 不使用此快照。将 Gateway 进程环境中的 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` 设为禁用此快照路径。
- 主机执行（`gateway`/`node`）会拒绝 `env.PATH` 和加载器覆盖（`LD_*`/`DYLD_*`），以防止二进制劫持或注入代码。
- OpenClaw 会在生成的命令环境中设置 `OPENCLAW_SHELL=exec`（包括 PTY 和 sandbox 执行），以便 shell/profile 规则能够检测 exec-tool 上下文。
- 对于 channel-origin 运行，如果 channel 提供了这些 id，OpenClaw 还会在 `OPENCLAW_CHANNEL_CONTEXT` 中公开一个窄范围的发送者/聊天身份 JSON 负载。
- `exec` 不能运行 `openclaw channels login` 或 `/approve` shell 命令：`openclaw channels login` 是一个交互式 channel 认证流程，而 `/approve` 需要走批准命令处理器，而不是 shell。请在 gateway 主机上的终端中运行 channel 登录，或者在存在相应工具时使用特定于 channel 的登录代理工具（例如 `whatsapp_login`）。
- 重要：默认情况下，sandboxing 是**关闭的**。如果 sandboxing 关闭，隐式的 `host=auto` 会解析为 `gateway`。显式的 `host=sandbox` 仍然会关闭失败，而不会静默地在 gateway 主机上运行。请启用 sandboxing，或使用带批准的 `host=gateway`。
- 脚本预检检查（针对常见的 Python/Node shell 语法错误）只会检查有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则会跳过该文件的预检。当 `host=gateway` 且有效策略为 `security=full` 并且 `ask=off` 时，预检也会完全跳过。
- 对于现在开始的长时间运行工作，只启动一次，并依赖在启用自动完成唤醒且命令输出或失败时的自动完成唤醒。使用 `process` 获取日志、状态、输入或干预；不要用 sleep 循环、超时循环或重复轮询来模拟调度。
- agent 启动的后台命令会显示在 Web、iOS 和 Android 的后台任务视图中，直到它们完成。任务账本会在完成心跳再次唤醒 agent 之前完成最终定稿。
- 对于应在稍后或按计划执行的工作，请使用 cron，而不是 `exec` 的 sleep/delay 模式。

## 配置

| Key                                  | Default                  | Notes                                                                                                                                                   |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools.exec.timeoutSeconds`          | `1800`                   | 默认的每个命令 exec 超时时间，单位为秒。单次调用的 `timeout` 会覆盖它；单次调用的 `timeout: 0` 会禁用 exec 进程超时。                                    |
| `tools.exec.host`                    | `auto`                   | 当沙盒运行时处于激活状态时解析为 `sandbox`，否则解析为 `gateway`。                                                                                      |
| `tools.exec.mode`                    | host-derived             | 规范化的策略开关。见下方 [模式](#modes)。                                                                                                               |
| `tools.exec.reviewer.model`          | configured agent primary | `mode=auto` 审查的可选 provider/model 覆盖配置。                                                                                                         |
| `tools.exec.reviewer.timeoutMs`      | `30000`                  | 审查者模型准备与完成的分阶段超时时间，超过后回退到人工。                                                                                                |
| `tools.exec.node`                    | unset                    |                                                                                                                                                         |
| `tools.exec.notifyOnExit`            | `true`                   | 为 true 时，后台 exec 会话在退出时会入队一个系统事件并请求一次 heartbeat。                                                                              |
| `tools.exec.approvalRunningNoticeMs` | `10000`                  | 当受审批约束的 exec 运行时间超过此值时，发送一次“running”提示（`0` 表示禁用）。                                                                         |
| `tools.exec.strictInlineEval`        | `false`                  | 见 [内联求值](#inline-eval-strictinlineeval)。                                                                                                           |
| `tools.exec.commandHighlighting`     | `false`                  | 为 true 时，审批提示可以在命令文本中高亮由解析器推导出的命令片段。可全局或按 agent 设置；不会改变审批策略。                                             |
| `tools.exec.pathPrepend`             | unset                    | 在 exec 运行时预先追加到 `PATH` 的目录列表（仅 gateway + sandbox）。                                                                                   |
| `tools.exec.safeBins`                | unset                    | 仅允许 stdin 的安全二进制文件，可在没有显式 allowlist 条目的情况下运行。见 [安全二进制文件](/tools/exec-approvals-advanced#safe-bins-stdin-only)。       |
| `tools.exec.safeBinTrustedDirs`      | `/bin`, `/usr/bin`       | 用于 `safeBins` 路径检查的额外显式受信目录。`PATH` 条目不会被自动信任。                                                                                 |
| `tools.exec.safeBinProfiles`         | unset                    | 按安全二进制文件配置可选的自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。                                   |

对于 gateway 和 node，默认使用无需审批的 host exec（`mode=full`）——这来自 host-policy 默认值，而不是 `host=auto`。如果你想要审批/allowlist 行为，请设置 `tools.exec.mode` 并收紧 host approvals 文件；见 [Exec approvals](/tools/exec-approvals#yolo-mode-no-approval)。如果想无论沙盒状态如何都强制使用 gateway 或 node 路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。

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

### 模式

`tools.exec.mode` 是规范化持久化的策略开关。运行时安全性和审批行为都由它派生。

| 模式        | security    | ask       | 行为                                                                                                                         |
| ----------- | ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `deny`      | `deny`      | `off`     | 禁止 exec。                                                                                                                  |
| `allowlist` | `allowlist` | `off`     | 仅允许 allowlist/safe-bin 中的命令运行；其他命令都不会询问。                                                                  |
| `ask`       | `allowlist` | `on-miss` | allowlist 匹配的命令直接运行；其他所有命令都向人工询问。                                                                     |
| `auto`      | `allowlist` | `on-miss` | allowlist/safe-bin 匹配的命令直接运行；其他所有命令先经 OpenClaw 的原生自动审查，再向人工询问。                               |
| `full`      | `full`      | `off`     | 没有审批关卡。                                                                                                               |

每个会话的 `/exec ask=always` 仍然会每次都询问人工，无论持久化模式为何。

自动审查审批是一次性的。在 gateway 上，OpenClaw 会向审查者提供已解析的可执行文件路径，并将执行锁定到同一路径。那些无法归约为单一可执行执行计划的命令——例如 heredoc、shell 展开，或不受支持的包装器引用方式——即使模型本可放行，也会回退到人工审批。

对于并非已由显式运行时或原生策略决定的 Codex app-server 命令审批，会走人工审批路径。OpenClaw 不会为这些请求运行其配置的 exec 审查器，因为 Codex 不会暴露一个可执行且可强制绑定的已解析可执行文件，使审查决定与 Codex 实际运行的命令绑定起来。

### 内联求值（`strictInlineEval`）

当 `tools.exec.strictInlineEval` 为 `true` 时，内联解释器求值形式需要审查者或显式审批：`python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e`、`osascript -e`，以及其他受支持解释器和命令载体中的类似形式（如 `awk`、`find -exec`、`make`、`sed`、`xargs` 等更多形式）。在 `mode=auto` 下，常规 exec 审批路径可能会让原生自动审查者放行一个明显低风险的一次性命令；但直接的 node-host `system.run` 调用仍需要显式审批，因为它们无法把命令交给人工审批路线。如果审查者提出要求，请求会转给人工。`allow-always` 仍然可以为良性的解释器/脚本调用持久化规则，但内联 eval 形式不会变成持久化的允许规则。

### PATH 处理

- `host=gateway`：将你的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖会被拒绝用于 host 执行。daemon 本身仍使用最小 `PATH` 运行：
  - macOS: `/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux: `/usr/local/bin`、`/usr/bin`、`/bin`
  - 为防止用户 shell 配置（如 `~/.zshenv` 或 `/etc/zshenv`）在启动期间覆盖优先路径，`tools.exec.pathPrepend` 条目会在执行前，安全地预先追加到 shell 命令内最终的 `PATH` 前面。
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`。OpenClaw 会在 profile 加载后，通过内部环境变量（不做 shell 插值）把 `env.PATH` 预先追加进去；`tools.exec.pathPrepend` 在这里同样生效。
- `host=node`：只会发送你传入的、未被阻止的 env 覆盖项。`env.PATH` 覆盖会被拒绝用于 host 执行，并被 node hosts 忽略。如果你需要在 node 上增加 PATH 条目，请配置 node host service 环境（systemd/launchd）或将工具安装到标准位置。

按 agent 绑定 node（在配置中使用带键的 agent ID）：

```bash
openclaw config get agents.entries
openclaw config set 'agents.entries.main.tools.exec.node' "node-id-or-name"
```

控制界面：**Devices** 页面包含一个用于相同设置的简易“Exec node binding”面板。

## 会话覆盖（`/exec`）

使用 `/exec` 为每个会话设置 `host`、`security`、`ask` 和 `node` 的默认值。不带参数发送 `/exec` 将显示当前值。

示例：

```text
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

`/exec` 仅对通过通道允许列表/配对和访问组的**已授权发送者**生效。访问组强制始终启用。它只更新**会话状态**，不会写入配置。已授权的外部通道发送者可以设置这些会话默认值。内部 gateway/webchat 客户端需要 `operator.admin` 才能持久化它们。

要完全禁用 exec，请通过工具策略拒绝它（`tools.deny: ["exec"]` 或按代理设置）。除非你显式设置 `security=full` 且 `ask=off`，否则仍然适用 host 审批。

## Exec 批准（伴侣应用 / node 主机）

沙盒化代理在网关或 node 主机上运行 `exec` 之前，可能需要按请求进行批准。有关策略、允许列表和 UI 流程，请参见 [Exec 批准](/tools/exec-approvals)。

当需要人工批准时，node 主机和非原生网关流程会立即返回 `status: "approval-pending"` 以及一个批准 ID。原生聊天和 Web UI 网关流程则可以改为在行内等待，并在批准后返回最终的命令结果。`approval-pending` 结果表示命令尚未开始，因此只有当已批准的命令实际以内联方式运行时，前台回退警告才会出现。已批准的异步运行会发出命令进度和完成系统事件（`Exec running` / `Exec finished`）；被拒绝或超时的批准是终态，不会用拒绝系统事件唤醒代理会话。

在具有原生批准卡片/按钮的渠道中，代理应首先依赖该原生 UI，只有在工具结果明确说明聊天批准不可用，或手动批准是唯一途径时，才应包含手动 `/approve` 命令。

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

`openclaw security audit` 会在解释器/运行时的 `safeBins` 条目缺少显式配置文件时发出警告，而 `openclaw doctor --fix` 可以为缺失的自定义 `safeBinProfiles` 条目生成脚手架。`openclaw security audit` 和 `openclaw doctor` 也会在你显式将 `jq` 这类具有广泛行为的 bin 重新添加到 `safeBins` 时发出警告（`jq` 可以读取环境数据，并从模块或启动文件加载 jq 代码，因此应优先使用显式允许列表条目或受审批门控的运行方式）。即使显式列出，`jq` 也会被拒绝为安全 bin。如果你显式允许列表化了解释器，请启用 `tools.exec.strictInlineEval`，这样内联代码求值形式仍然需要审核者或显式批准。

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

轮询用于按需获取状态，而不是在循环中等待。如果启用了自动完成唤醒，命令在产生输出或失败时可以唤醒会话。

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

粘贴（默认用括号包裹）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的一个子工具，用于结构化的多文件编辑。它默认启用，并且对任何模型提供方都可用；`allowModels` 可以对其进行限制。只有在你想要禁用它或将其限制给特定模型时，才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.6-sol"] },
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
