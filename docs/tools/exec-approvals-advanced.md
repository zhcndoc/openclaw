---
summary: "高级 exec 审批：安全二进制、解释器绑定、审批转发、原生投递"
read_when:
  - "配置安全二进制或自定义安全二进制配置文件"
  - "将审批转发到 Slack/Discord/Telegram 或其他聊天频道"
  - "为某个频道实现原生审批客户端"
title: "Exec 审批 — 高级"
---

高级执行批准主题：`safeBins` 快速路径、interpreter/runtime 绑定以及批准转发到聊天通道（包括本机交付）。有关核心策略和审批流程，请参阅 [Exec 审批](/tools/exec-approvals)。

## <a id="safe-bins-(stdin-only)"></a><a id="safe-bins-stdin-only"></a> 安全二进制（仅 stdin）

`tools.exec.safeBins` 命名的是**仅 stdin** 二进制程序（例如 `cut`），它们在 allowlist 模式下运行，**不需要**显式 allowlist 条目。安全二进制会拒绝位置文件参数和类路径令牌，因此它们只能处理传入的流。请将其视为面向流过滤器的窄型快速路径，而不是通用信任列表。

<Warning>
**not** 添加解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`） `safeBins`。如果命令可以按设计评估代码、执行子命令或读取文件，则首选显式允许列表条目并保持启用批准提示。自定义安全箱必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。
</Warning>

默认安全二进制：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果你选择启用它们，请为其非 stdin 工作流保留显式 allowlist 条目。对于安全二进制模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置参数形式会被拒绝，因此不能通过歧义性位置参数夹带文件操作数。

### <a id="argv-validation-and-denied-flags"></a> argv 验证与被拒绝的标志

验证仅取决于参数结构（没有主机文件系统存在检查），这可以防止 allow/deny 差异导致文件存在预言行为。默认安全箱拒绝面向文件的选项；必须识别长选项（拒绝未知标志和不明确的缩写）。接受默认 bin 的已识别只读布尔标志（例如 `wc -l`、`tr -d`、`uniq -c`），而无法识别的短标志将被安全 bin 验证拒绝，并落入配置的批准策略，包括 `mode=auto` 中的自动审阅者。

按安全二进制配置文件被拒绝的标志：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `tail`: `--follow`, `--retry`, `-F`, `-f`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全二进制还会在执行时强制将 argv 令牌视为**字面文本**（仅 stdin 段不进行通配符展开，也不进行 `$VARS` 展开），因此像 `*` 或 `$HOME/...` 这样的模式不能被用来偷偷读取文件。`awk`、 `sed` 和 `jq` 作为安全二进制时始终被拒绝，因为它们的语义无法被验证为仅 stdin：`jq` 可以读取环境数据，并从模块或启动文件加载 jq 代码。对于这些工具，请使用显式 allowlist 条目或审批提示，而不是 `safeBins`。

### <a id="trusted-binary-directories"></a> 可信二进制目录

安全 bin 必须从受信任的二进制目录解析（系统默认值加上可选的 `tools.exec.safeBinTrustedDirs`）。 `PATH` 条目永远不会被自动信任。默认受信任目录有意最小化：`/bin`、`/usr/bin`。如果您的 safe-bin 可执行文件位于包 manager/user 路径中（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），请将它们显式添加到 `tools.exec.safeBinTrustedDirs`。

### <a id="shell-chaining%2C-wrappers%2C-and-multiplexers"></a><a id="shell-chaining-wrappers-and-multiplexers"></a> Shell 串联、包装器与多路复用器

当每个顶级段都满足 allowlist（包括安全二进制或技能自动允许）时，允许 Shell 串联 （`&&`、`||`、`;`）。重定向在 allowlist 模式下仍不受支持。命令替换 （`$()` / 反引号）在 allowlist 解析期间会被拒绝，包括双引号内；如果你需要字面量 `$()` 文本，请使用单引号。

在 macOS companion-app 审批中，包含 Shell 控制或展开语法 （`&&`、`||`、`;`、`|`、`` ` ``、`$`、`<`、`>`、`(`、`)`）的原始 Shell 文本会被视为 allowlist 未命中，除非 Shell 二进制本身已被加入 allowlist。

对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围内的环境变量覆盖会被缩减为一个小的显式 allowlist（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。

对于 allowlist 模式中的 `allow-always` 决策，透明分发包装器 （例如 `env`、`flock`、`nice`、`nohup`、`stdbuf`、`timeout`）会保留内部可执行文件路径而不是包装器路径。Shell 多路复用器 （`busybox`、`toybox`）在 shell applet（`sh`、`ash` 等）上会以同样方式解除包装。 如果包装器或多路复用器无法安全解除包装，则不会自动持久化任何 allowlist 条目。

如果您将 `python3` 或 `node` 等解释器列入白名单，则更喜欢 `tools.exec.strictInlineEval=true`，因此内联评估仍需要审阅者或明确批准。在严格模式下，`allow-always` 仍然可以保留良性 interpreter/script 调用，但内联评估载体不会自动保留。

### <a id="safe-bins-versus-allowlist"></a> 安全二进制与 allowlist 的对比

| 话题            | `tools.exec.safeBins`                                  | 允许名单（SQLite 执行批准文档）                                         |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 目标             | 自动允许窄范围的 stdin 过滤器                        | 显式信任特定可执行文件                                              |
| 比赛类型       | 可执行文件名称 + safe-bin argv 策略                 | 已解析的可执行路径 glob，或 PATH-invoked 命令的裸命令名 glob |
| 参数范围   | 受安全二进制配置文件和字面标记规则限制 | 默认按路径匹配；可选 `argPattern` 可限制解析后的 argv              |
| 典型例子 | `head`, `tail`, `tr`, `wc`                             | `jq`、`python3`、`node`、`ffmpeg`、自定义 CLI                                     |
| 最佳用途         | 管道中的低风险文本转换                  | 任何行为更广泛或具有副作用的工具                                     |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每个代理的 `agents.entries.*.tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每个代理的 `agents.entries.*.tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每个代理的 `agents.entries.*.tools.exec.safeBinProfiles`）。按代理的配置文件键会覆盖全局键。
- allowlist 条目存放在主机本地的 approvals 文档中，位于 `agents.<id>.allowlist` 下（或通过 Control UI / `openclaw approvals allowlist ...`）。
- 当 interpreter/runtime bin 出现在 `safeBins` 中而没有显式配置文件时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺少的自定义 `safeBinProfiles.<bin>` 条目搭建为 `{}`（随后检查并紧固）。 Interpreter/runtime 垃圾箱不是自动脚手架的。

自定义配置文件示例：

```json5
{
  tools: {
    exec: {
      safeBins: ["myfilter"],
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

## <a id="interpreter%2Fruntime-commands"></a><a id="interpreter/runtime-commands"></a> Interpreter/runtime 命令

支持批准的 interpreter/runtime 运行有意保守：

- 始终绑定精确的 argv/cwd/env 上下文。
- 在网关上，整个普通外部调度链（每个原始包装可执行文件和最终命令段可执行文件）在人工或自动审查之前进行绑定，并在启动之前重新检查。 Node 主机在本地策略评估期间捕获相同的身份，并在调度前重新检查它们。受保护的可执行文件仅使用已解析的实际路径标识；可写可执行文件也使用内容哈希。更改后的分辨率（包括 `PATH` 上早期的新可执行文件）拒绝运行。仅身份绑定不会限制其他合格的 `allow-always` 决策。
- 直接脚本文件和直接运行时文件形式会尽力绑定到一个具体的本地文件快照。
- 仍会解析为单个直接本地文件的常见包管理器包装器形式（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）会在绑定前展开。
- 如果 OpenClaw 无法准确识别 interpreter/runtime 命令的一个具体本地文件（例如包脚本、评估表单、特定于运行时的加载程序链或不明确的多文件表单），则拒绝批准支持的执行，而不是声明它不具有语义覆盖。
- 对于这些工作流程，更喜欢沙箱、单独的主机边界或显式可信的 allowlist/full 工作流程，其中操作员接受更广泛的运行时语义。

Node 可执行文件身份绑定对于一次调用是本地的。远程人工审批计划保留其现有的直接可执行固定和单个脚本操作数快照；它不会在审批等待期间携带 shell 包装器内的每个可执行标识。对于这些内部命令，当批准的调用到达节点的本地策略评估时，身份重新验证就会开始，因此它不会检测到在远程批准等待之前所做的替换。

在 `mode=auto` 中，审阅者批准的非固定执行需要完整的调度链进行身份绑定。授权计划必须成功，每个候选者必须使用直接传输，每个包装器和最终可执行文件必须有一个记录的可执行操作数。受政策限制或不完整的信托计划无法确定资格。固定命令保留其现有的审阅行为。

Shell `-c` 包装器、带有分配的 `env`、`xcrun`、BusyBox/Toybox 小程序、shell `builtin`/`command`/`exec` 调度以及无法绑定完整链的任何其他内容都会跳过 `Exec auto-review skipped: dispatch chain cannot be bound` 的自动审查。当现有的绑定检查成功时，这些表单将采用一次性人工批准路径。当绑定所有可执行标识时，没有分配的普通命令和透明 `env` 仍然符合资格。检查远程节点命令的网关接受准备好的固定直接命令，包括节点自己的内置 POSIX shell 围绕一个带有静态参数的直接绝对可执行文件传输。该传输器是节点的调度程序；用户提供的 shell 或调度包装器、裸露的可执行文件名称和未加引号的 glob 仍然需要人工，因为网关无法检查节点的内存中可执行文件绑定。现有的绑定拒绝仍然有效。每个外部包装器自己的可执行文件仍然必须解析。 Shell 载体仅在 shell 命令位置免于文件绑定；外部调度也将这些名称绑定为可执行文件。没有持久的数据模型更改：绑定在批准生命周期内保留在内存中。

在 `mode=auto` 中，用户提供的 POSIX 登录或交互式 shell 包装器会跳过审阅者。可绑定命令（例如 `bash -lc 'printf ok'`）需要人工批准，因为它们的隐式启动文件位于操作数绑定之外。现有绑定拒绝优先：网关已拒绝交互式代码加载选项，例如 `-i`、`--interactive` 和组合 `-ic`，因此这些命令仍然被拒绝，而不是创建人工批准请求。这不会更改网关的普通 shell 启动快照。

当需要审批时，exec 工具会立即返回一个 approval id。使用该 id 来关联后续已批准运行的系统事件（`Exec finished`，以及在配置了时的 `Exec running`）。 如果在超时前没有收到决定，请求会被视为审批超时，并表现为终端主机命令拒绝。对于带有来源会话的主代理异步审批，OpenClaw 还会恢复该会话并附带一个内部 followup，这样代理就能观察到该命令没有运行，而不是在之后修复缺失结果。待处理的 exec 审批默认在 30 分钟后过期。

### <a id="followup-delivery-behavior"></a> 后续投递行为

已批准的异步 exec 完成后，OpenClaw 会向同一会话发送一个 followup `agent` 回合。 被拒绝的异步审批会使用相同的主会话 followup 路径来传递拒绝状态，但它们不会注册更高权限的运行时交接，也不会运行命令。没有可恢复主会话的拒绝会被抑制，或者在存在安全直达路由时通过该路由报告。

- 如果存在有效的外部投递目标（可投递频道加上目标 `to`），后续投递会使用该频道。
- 在仅 webchat 或无外部目标的内部会话流程中，后续投递保持仅会话内（`deliver: false`）。
- 如果调用方显式请求严格的外部投递但没有可解析的外部频道，请求会以 `INVALID_REQUEST` 失败。
- 如果启用了 `bestEffortDeliver` 且无法解析任何外部频道，则投递会降级为仅会话内，而不是失败。

## <a id="minimal-scopes-for-third-party-clients"></a> 第三方客户端的最小作用域

网关批准决议由专用 `operator.approvals` 范围保护。这适用于所有者特定的 `exec.approval.resolve` 方法和与种类无关的 `approval.resolve` 方法； `operator.write` 不包含它。仪表板和集成应该仅请求它们使用的方法所需的范围。将批准决议访问视为远程执行级权限，并故意授予 `operator.approvals`，即使客户端仅提供少量批准 UI。

## <a id="approval-forwarding-to-chat-channels"></a> 审批转发到聊天频道

你可以将 exec 审批提示转发到任何聊天频道（包括插件频道），并通过 `/approve` 来批准它们。这使用标准的外向投递管道。

对于用户授权的命令，代理首先通过工具请求执行。执行主机决定是否需要批准。代理仅使用确切的请求 ID 和回复指令，中继来自实际待批准的 `/approve` 命令。裸露的 `/approve` 或发明的 ID 无法批准命令。 `allow-once` 授权仅涵盖其特定命令；后续命令收到自己的策略决定。

配置：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

在聊天中回复：

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

`/approve` 命令处理执行批准和插件批准。如果 ID 与待执行的执行批准不匹配，它会自动检查插件批准。此回退仅限于“未找到批准”失败；真正的执行批准 denial/error 不会默默地重试作为插件批准。

### <a id="plugin-approval-forwarding"></a> 插件审批转发

插件审批转发使用与 exec 审批相同的投递管道，但在 `approvals.plugin` 下有自己独立的配置。启用或禁用其中之一不会影响另一个。关于插件编写行为、请求字段和决策语义，请参见 [插件权限请求](/plugins/plugin-permission-requests)。

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

其配置形状与 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、 `sessionFilter` 和 `targets` 的工作方式一致。

支持共享交互式回复的频道会为 exec 和插件审批渲染相同的审批按钮。不支持共享交互式 UI 的频道会退回为带有 `/approve` 说明的纯文本。插件审批请求可能会限制可用决策：审批界面使用请求声明的决策集，而网关会拒绝提交未被提供的决策。

### <a id="same-chat-approvals-on-any-channel"></a> 任意频道上的同聊审批

当执行或插件批准请求源自可交付聊天界面时，默认情况下该聊天可以使用 `/approve` 批准它。这适用于 Slack、Matrix、Microsoft Teams 和类似的可交付聊天，使用该对话的正常通道身份验证模型。 Web UI 支持两种审批类型；终端 UI 仅支持插件审批。如果发起聊天已经可以发送命令并接收回复，则批准请求不再需要单独的本机交付适配器来保持待处理状态。

Discord、Telegram 和 QQ bot 也支持同聊 `/approve`，但即使禁用了原生审批投递，这些频道仍会使用其解析出的审批者列表进行授权。

### <a id="native-approval-delivery"></a> 原生审批投递

某些通道还可以充当本机审批客户端：Discord、Slack、Telegram、Matrix 和 QQ 机器人。本机客户端在共享的同一聊天 `/approve` 流之上添加批准者 DM、原始聊天扇出和特定于渠道的交互式批准 UX。

当本机批准 cards/buttons 可用时，该本机 UI 是面向代理的主要路径。代理不应回显重复的普通聊天 `/approve` 命令，除非工具结果表明聊天批准不可用或手动批准是唯一剩余的路径。

如果配置了本机审批客户端，但原始通道没有活动的本机运行时，则 OpenClaw 使本地 `/approve` 提示保持可见。如果本机运行时处于活动状态并尝试传送，但没有目标收到卡，则 OpenClaw 会使用确切的 `/approve <id> <decision>` 命令发送同一聊天回退通知，以便仍可以解析请求。

通用模型：

- host exec policy 仍然决定是否需要 exec 审批
- `approvals.exec` 控制将审批提示转发到其他聊天目的地
- `channels.<channel>.execApprovals` 控制 Discord、Slack、Telegram、QQ bot 以及类似的频道特定原生客户端是否启用
- Slack 插件审批在请求来自 Slack 且 Slack 插件审批者可解析时，可以使用 Slack 的原生审批客户端；即使 Slack exec 审批被禁用，`approvals.plugin` 也可以将插件审批路由到 Slack 会话或目标
- 当稳定的 `users/<id>` 审批者从 `dm.allowFrom` 或 `defaultTo` 解析时，Google Chat 本机审批卡处理源自 Google Chat 空间或线程的执行和插件审批；他们不使用反应事件来做出决定
- WhatsApp 和 Signal 的 reaction 审批投递受 `approvals.exec` 和 `approvals.plugin` 约束；它们没有 `channels.<channel>.execApprovals` 区块

对于具有 `execApprovals` 块的通道，通过设置 `enabled: true` 或 `"auto"` 并配置可解析审批者来启用本机传递。默认值因通道而异：Discord 和 Slack 需要显式启用； Telegram 将未设置视为 `"auto"`。批准者可以来自 `execApprovals.approvers` 或通道支持的所有者配置，例如 `commands.ownerAllowFrom`。

设置 `enabled: false` 以显式禁用本机审批客户端。公共原始聊天传递通过 `channels.<channel>.execApprovals.target` 保持明确。当本机 `target` 启用原始聊天传递时，批准提示包括命令文本。

FAQ: [为什么聊天审批有两个 exec 审批配置？](/help/faq-first-run)

- Discord: `channels.discord.execApprovals.*`
- Slack: `channels.slack.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`
- QQ 机器人：`channels.qqbot.execApprovals.*`
- Google Chat: 使用 `channels.googlechat.dm.allowFrom` 或 `channels.googlechat.defaultTo` 配置稳定的审批者；不需要 `execApprovals` 区块
- WhatsApp: 使用 `approvals.exec` 和 `approvals.plugin` 将审批提示路由到 WhatsApp
- Signal: 使用 `approvals.exec` 和 `approvals.plugin` 将审批提示路由到 Signal

原生客户端特定路由：

- Telegram 默认为审批者 DM （`target: "dm"`）。切换到 `channel` 或 `both`，以便在原始 Telegram 中显示批准提示 chat/topic. 对于 Telegram 论坛主题，OpenClaw 保留批准提示和批准后后续操作的主题。
- Discord 和 Telegram 的审批者可以是显式指定的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断；只有已解析的审批者才能批准或拒绝。
- Slack 批准者可以是显式的 （`execApprovals.approvers`） 或从 `commands.ownerAllowFrom` 推断。 Slack 插件审批 DM 使用来自 `allowFrom` 和帐户默认路由的 Slack 插件审批者，而不是 Slack 执行审批者。 Slack 本机按钮保留批准 ID 类型，因此 `plugin:` ids 可以解析插件批准，而无需第二个 Slack-local 后备层。
- Google Chat 本机卡在消息文本中保留手动 `/approve` 回退，但卡按钮回调仅携带不透明的操作令牌；批准 ID 和决策从服务器端待处理状态恢复。
- 当匹配的顶层转发族路由到 WhatsApp 时，WhatsApp 表情审批可同时处理 exec 和插件提示。原生来源提示直接绑定；共享目标模式投递会将相同的有类型审批元数据绑定到被接受的 WhatsApp 消息回执上。
- 仅当匹配的顶层转发族已启用并路由到 Signal 时，Signal 反应审批才会同时处理 exec 和插件提示。直接的同聊 Signal exec 审批可以在没有显式审批者的情况下抑制本地 `/approve` 回退；但 Signal 反应解析仍需要来自 `channels.signal.allowFrom` 或 `defaultTo` 的显式 Signal 审批者。
- Matrix 原生 DM/channel 路由和反应快捷方式可处理执行和插件审批；插件授权仍然来自`channels.matrix.dm.allowFrom`。 Matrix 本机提示在第一个提示事件上包括 `com.openclaw.approval` 自定义事件内容，因此 OpenClaw-aware Matrix 客户端可以读取结构化审批状态，而股票客户端则保留纯文本 `/approve` 后备。
- 原生 Discord 和 Telegram 审批按钮会在传输私有的回调数据中携带明确的 exec 或 plugin 所有者类型，并且只解析该所有者。旧版缺少类型的 `/approve` 控件仍然是一条有限的兼容路径：它们只会尝试执行操作者可能批准的所有者类型，仅在收到“未找到审批”结果后继续，并且绝不会从审批 ID 推断所有权。
- 请求者不需要是审批者。
- 如果没有任何操作员 UI 或已配置的审批客户端能够接受该请求，提示会回退到 `askFallback`。

仅限所有者的敏感组命令（例如 `/diagnostics` 和 `/export-trajectory`）使用私有所有者路由来获取批准提示和最终结果。 OpenClaw 首先在所有者运行命令的同一表面上尝试专用路线。如果该表面没有私有所有者路由，它将回退到来自 `commands.ownerAllowFrom` 的第一个可用所有者路由，因此当 Telegram 是配置的主要私有接口时，Discord 组命令仍然可以将批准和结果发送到所有者的 Telegram DM。群聊只得到简短的确认。

参见：

- [Discord](/channels/discord)
- [电报](/channels/telegram)
- [QQ 机器人](/channels/qqbot)

### <a id="official-mobile-operator-apps"></a> 官方移动端操作员应用

当使用 `operator.admin` 连接时，或者当其配对的 `operator.approvals` 设备明确成为请求的目标时，官方 iOS 和 Android 应用程序还可以查看网关拥有的待执行批准。他们读取 Control UI 使用的相同的经过消毒的持久记录，提交善意决策，并显示​​网关存储的第一个答案结果。 Apple 手表通过配对的 iPhone 反映这些批准提示，并具有允许一次和拒绝操作。 Direct Watch Gateway 模式不审核批准。

丢失 resolve 确认不会使提交的选择成为权威结果： 应用会禁用控制项并再次读取记录。如果别的界面已经胜出，应用会显示那个已记录的决策。待处理提示始终绑定到发出它们的 Gateway，因此切换活动 Gateway 不会重定向旧的审批 ID。

### <a id="macos-ipc-flow"></a> macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：

- Unix套接字模式`0600`，令牌存储在`state/openclaw.sqlite`的`exec_approvals_config`行中。
- 相同-UID同行检查。
- Challenge/response（随机数 + HMAC 令牌 + 请求哈希）+ 短 TTL。

## FAQ

### <a id="when-would-accountid-and-threadid-be-used-on-an-approval-target%3F"></a><a id="when-would-accountid-and-threadid-be-used-on-an-approval-target"></a> 在审批目标上，什么时候会使用 `accountId` 和 `threadId`？

当某个频道配置了多个身份，而审批提示必须通过其中一个特定账号发出时，使用 `accountId`。当目标支持话题或线程，并且提示应停留在该线程中而不是顶级聊天中时，使用 `threadId`。

一个具体的 Telegram 场景是：带有论坛话题的运维超级群组，以及两个 Telegram 机器人账号。`to` 值指定超级群组，`accountId` 选择机器人账号，`threadId` 选择论坛话题：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "targets",
      targets: [
        {
          channel: "telegram",
          to: "-1001234567890",
          accountId: "ops-bot",
          threadId: "77",
        },
      ],
    },
  },
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "env:TELEGRAM_PRIMARY_BOT_TOKEN",
        },
        "ops-bot": {
          name: "Operations bot",
          botToken: "env:TELEGRAM_OPS_BOT_TOKEN",
        },
      },
    },
  },
}
```

通过该设置，转发的执行批准将由 `ops-bot` Telegram 帐户发布到聊天 `-1001234567890` 的主题 `77` 中。不带 `accountId` 的目标使用通道的默认帐户，不带 `threadId` 的目标发布到顶级目标。

### <a id="when-approvals-are-sent-to-a-session%2C-can-anyone-in-that-session-approve-them%3F"></a><a id="when-approvals-are-sent-to-a-session-can-anyone-in-that-session-approve-them"></a> 当审批发送到某个会话时，该会话中的任何人都可以批准吗？

不可以。会话投递只决定提示出现在哪里，它本身并不会授权该聊天中的每个参与者都能批准。

对于通用的同聊天 `/approve`，发送者必须已经被授权可在该频道会话中执行命令。如果频道暴露了明确的审批批准者，那么即使他们在该会话中并非其他命令的授权用户，也可以授权 `/approve` 动作。

有些渠道更严格。 Discord、Telegram、Matrix、Slack 本机审批 DM 和类似的本机审批客户端使用其解析的审批者列表进行审批授权。例如，Telegram 论坛主题批准提示对主题中的每个人都可见，但只有从 `channels.telegram.execApprovals.approvers` 或 `commands.ownerAllowFrom` 解析的数字 Telegram 用户 ID 才能批准或拒绝它。

## <a id="related"></a> 相关内容

- [执行审批](/tools/exec-approvals) — 核心策略和审批流程
- [Exec 工具](/tools/exec)
- [提升模式](/tools/elevated)
- [技能](/tools/skills) — 基于技能的自动允许行为
