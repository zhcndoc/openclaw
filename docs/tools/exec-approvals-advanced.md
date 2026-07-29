---
summary: "高级 exec 审批：安全二进制、解释器绑定、审批转发、原生投递"
read_when:
  - 配置安全二进制或自定义安全二进制配置文件
  - 将审批转发到 Slack/Discord/Telegram 或其他聊天频道
  - 为某个频道实现原生审批客户端
title: "Exec 审批 — 高级"
---

高级 exec 审批主题：`safeBins` 快路径、解释器/运行时绑定，以及向聊天频道转发审批（包括原生投递）。
有关核心策略和审批流程，请参见 [Exec 审批](/tools/exec-approvals)。

## 安全二进制（仅 stdin）

`tools.exec.safeBins` 命名的是**仅 stdin** 二进制程序（例如 `cut`），它们在 allowlist 模式下运行，**不需要**显式 allowlist 条目。安全二进制会拒绝位置文件参数和类路径令牌，因此它们只能处理传入的流。请将其视为面向流过滤器的窄型快速路径，而不是通用信任列表。

<Warning>
不要将解释器或运行时二进制程序（例如 `python3`、`node`、
`ruby`、`bash`、`sh`、`zsh`）加入 `safeBins`。如果某个命令按设计可以
执行代码、运行子子命令或读取文件，请优先使用显式 allowlist 条目，
并保持审批提示开启。自定义安全二进制必须在
`tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。
</Warning>

默认安全二进制：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`、`uniq`、`head`、`tail`、`tr`、`wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果你选择启用它们，请为其非 stdin 工作流保留显式
allowlist 条目。对于安全二进制模式下的 `grep`，请使用 `-e`/`--regexp`
提供模式；位置参数形式会被拒绝，因此不能通过歧义性位置参数
夹带文件操作数。

### argv 验证与被拒绝的标志

验证仅根据 argv 形状确定（不检查主机文件系统是否存在），这可防止因允许/拒绝差异而出现
文件存在性探测行为。默认安全二进制会拒绝面向文件的选项；长选项采用 fail-closed 验证（未知标志和含糊的缩写会被拒绝）。默认二进制中可识别的只读布尔标志（例如
`wc -l`、`tr -d`、`uniq -c`）会被接受，而未识别的短标志仍然
fail-closed，并转入人工审批。

按安全二进制配置文件被拒绝的标志：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`、`--from-file`、`--library-path`、`--rawfile`、`--slurpfile`、`-L`、`-f`
- `sort`: `--compress-program`、`--files0-from`、`--output`、`--random-source`、`--temporary-directory`、`-T`、`-o`
- `tail`: `--follow`、`--retry`、`-F`、`-f`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全二进制还会在执行时强制将 argv 令牌视为**字面文本**（仅 stdin 段不进行通配符展开，也不进行 `$VARS` 展开），因此像 `*` 或 `$HOME/...` 这样的模式不能被用来偷偷读取文件。`awk`、
`sed` 和 `jq` 作为安全二进制时始终被拒绝，因为它们的语义无法被验证为仅 stdin：`jq` 可以读取环境数据，并从模块或启动文件加载 jq 代码。对于这些工具，请使用显式 allowlist 条目或审批提示，而不是 `safeBins`。

### 可信二进制目录

安全二进制必须从可信二进制目录中解析（系统默认值加上可选的
`tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会被自动信任。
默认可信目录有意保持最小：`/bin`、`/usr/bin`。如果你的安全二进制可执行文件位于
包管理器/用户路径中（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），
请显式将它们添加到 `tools.exec.safeBinTrustedDirs`。

### Shell 串联、包装器与多路复用器

当每个顶级段都满足 allowlist（包括安全二进制或技能自动允许）时，允许 Shell 串联
（`&&`、`||`、`;`）。重定向在 allowlist 模式下仍不受支持。命令替换
（`$()` / 反引号）在 allowlist 解析期间会被拒绝，包括双引号内；如果你需要字面量 `$()`
文本，请使用单引号。

在 macOS companion-app 审批中，包含 Shell 控制或展开语法
（`&&`、`||`、`;`、`|`、`` ` ``、`$`、`<`、`>`、`(`、`)`）的原始 Shell 文本
会被视为 allowlist 未命中，除非 Shell 二进制本身已被加入 allowlist。

对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围内的环境变量覆盖会被缩减为一个小的显式
allowlist（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。

对于 allowlist 模式中的 `allow-always` 决策，透明分发包装器
（例如 `env`、`flock`、`nice`、`nohup`、`stdbuf`、`timeout`）会保留
内部可执行文件路径而不是包装器路径。Shell 多路复用器
（`busybox`、`toybox`）在 shell applet（`sh`、`ash` 等）上会以同样方式解除包装。
如果包装器或多路复用器无法安全解除包装，则不会自动持久化任何 allowlist
条目。

如果你将 `python3` 或 `node` 之类的解释器加入 allowlist，请优先设置
`tools.exec.strictInlineEval=true`，这样内联 eval 仍需要显式审批。在 strict 模式下，
`allow-always` 仍可持久化良性的解释器/脚本调用，但内联 eval 载体不会自动持久化。

### 安全二进制与 allowlist 的对比

| Topic            | `tools.exec.safeBins`                                  | Allowlist (SQLite exec approvals document)                                         |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 目标             | 自动允许窄范围的 stdin 过滤器                         | 显式信任特定可执行文件                                                           |
| 匹配类型         | 可执行文件名 + 安全二进制 argv 策略                  | 已解析可执行文件路径通配，或 PATH 调用命令的裸命令名通配                           |
| 参数范围         | 受安全二进制配置文件和字面标记规则限制               | 默认按路径匹配；可选 `argPattern` 可限制解析后的 argv                              |
| 典型示例         | `head`、`tail`、`tr`、`wc`                             | `jq`、`python3`、`node`、`ffmpeg`、自定义 CLI                                     |
| 最佳用途         | 管道中的低风险文本转换                               | 任何行为更广泛或具有副作用的工具                                                 |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每个代理的 `agents.entries.*.tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每个代理的 `agents.entries.*.tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每个代理的 `agents.entries.*.tools.exec.safeBinProfiles`）。按代理的配置文件键会覆盖全局键。
- allowlist 条目存放在主机本地的 approvals 文档中，位于 `agents.<id>.allowlist` 下（或通过 Control UI / `openclaw approvals allowlist ...`）。
- 当 `safeBins` 中出现解释器/运行时二进制但没有显式配置文件时，`openclaw security audit` 会以 `tools.exec.safe_bins_interpreter_unprofiled` 发出警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目脚手架化为 `{}`（之后请复查并收紧）。解释器/运行时二进制不会自动脚手架化。

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

## 解释器/运行时命令

带审批的解释器/运行时运行会刻意保持保守：

- 始终绑定精确的 argv/cwd/env 上下文。
- 直接脚本文件和直接运行时文件形式会尽力绑定到一个具体的本地
  文件快照。
- 仍会解析为单个直接本地文件的常见包管理器包装器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）会在绑定前展开。
- 如果 OpenClaw 无法为某个解释器/运行时命令精确识别一个具体的本地文件
  （例如包脚本、eval 形式、运行时特定加载器链，或歧义的多文件
  形式），则会拒绝带审批的执行，而不是声称它并不具备的语义覆盖。
- 对于这些工作流，请优先使用沙箱、单独的主机边界，或显式受信任的
  allowlist/完整工作流，由操作员接受更宽泛的运行时语义。

当需要审批时，exec 工具会立即返回一个 approval id。使用该 id
来关联后续已批准运行的系统事件（`Exec finished`，以及在配置了时的 `Exec running`）。
如果在超时前没有收到决定，请求会被视为审批超时，并
表现为终端主机命令拒绝。对于带有来源会话的主代理异步审批，OpenClaw 还会恢复该会话并附带一个内部 followup，这样代理就能观察到该命令没有运行，而不是在之后修复缺失结果。待处理的 exec 审批默认在 30 分钟后过期。

### 后续投递行为

已批准的异步 exec 完成后，OpenClaw 会向同一会话发送一个 followup `agent` 回合。
被拒绝的异步审批会使用相同的主会话 followup 路径来传递拒绝状态，但它们不会注册
更高权限的运行时交接，也不会运行命令。没有可恢复主会话的拒绝会被抑制，或者在存在安全直达路由时通过该路由报告。

- 如果存在有效的外部投递目标（可投递频道加上目标 `to`），后续投递会使用该频道。
- 在仅 webchat 或无外部目标的内部会话流程中，后续投递保持仅会话内（`deliver: false`）。
- 如果调用方显式请求严格的外部投递但没有可解析的外部频道，请求会以 `INVALID_REQUEST` 失败。
- 如果启用了 `bestEffortDeliver` 且无法解析任何外部频道，则投递会降级为仅会话内，而不是失败。

## 第三方客户端的最小作用域

网关审批解析受专用的 `operator.approvals` 作用域保护。这同时适用于仅限所有者的 `exec.approval.resolve` 方法和不区分类型的 `approval.resolve` 方法；`operator.write` 并不包含它。仪表板和集成应仅请求其所使用方法所需的作用域。应将审批解析访问视为与远程执行同等级别的权限，并有意识地授予 `operator.approvals`，即使客户端只展示一个小型审批界面也是如此。

## 审批转发到聊天频道

你可以将 exec 审批提示转发到任何聊天频道（包括插件频道），并通过 `/approve`
来批准它们。这使用标准的外向投递管道。

配置：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // 子串或正则
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

`/approve` 命令同时处理 exec 审批和插件审批。如果 ID 不匹配任何待处理的 exec 审批，它会自动改为检查插件审批。这个回退仅限于“未找到审批”的失败；真正的 exec 审批拒绝/错误不会被静默地重试为插件审批。

### 插件审批转发

插件审批转发使用与 exec 审批相同的投递管道，但在 `approvals.plugin` 下有自己独立的
配置。启用或禁用其中之一不会影响另一个。关于插件编写行为、请求字段和决策语义，请参见
[插件权限请求](/plugins/plugin-permission-requests)。

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

其配置形状与 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的工作方式一致。

支持共享交互式回复的频道会为 exec 和
插件审批渲染相同的审批按钮。不支持共享交互式 UI 的频道会退回为带有 `/approve`
说明的纯文本。插件审批请求可能会限制可用决策：审批界面使用请求声明的决策集，而网关会拒绝提交未被提供的决策。

### 任意频道上的同聊审批

当 exec 或插件审批请求来自可投递的聊天界面时，默认可以在同一聊天中用 `/approve`
批准它。这适用于 Slack、Matrix、Microsoft Teams 以及类似的可投递聊天，此外还适用于现有的 Web UI 和终端 UI 流程，并使用该会话的正常频道认证模型。如果发起审批的聊天本来就可以发送命令并接收回复，那么审批请求就不再需要单独的原生投递适配器来保持待处理状态。

Discord、Telegram 和 QQ bot 也支持同聊 `/approve`，但即使禁用了原生审批投递，这些频道仍会使用其解析出的审批者列表进行授权。

### 原生审批投递

某些频道也可以充当原生审批客户端：Discord、Slack、Telegram、Matrix 和 QQ bot。原生客户端在共享的同聊 `/approve` 流程之上，增加了审批者私信、来源聊天广播，以及频道特定的交互式审批体验。

当原生审批卡片/按钮可用时，该原生 UI 是面向代理的主要路径。除非工具结果表明聊天审批不可用，或者手动审批是唯一剩余路径，否则代理不应再额外回显重复的纯聊天 `/approve` 命令。

如果配置了原生审批客户端，但发起审批的频道没有可用的原生运行时，OpenClaw 会保留本地确定性的 `/approve` 提示可见。如果原生运行时处于活动状态并尝试投递但没有任何目标收到卡片，OpenClaw 会发送一条同聊回退通知，包含精确的 `/approve <id> <decision>` 命令，以便请求仍可被解决。

通用模型：

- host exec policy 仍然决定是否需要 exec 审批
- `approvals.exec` 控制将审批提示转发到其他聊天目的地
- `channels.<channel>.execApprovals` 控制 Discord、Slack、Telegram、QQ bot 以及类似的
  频道特定原生客户端是否启用
- Slack 插件审批在请求来自 Slack 且 Slack 插件审批者可解析时，可以使用 Slack 的原生审批客户端；即使 Slack exec 审批被禁用，`approvals.plugin` 也可以将插件审批路由到 Slack
  会话或目标
- 当请求来自 Google Chat 空间或线程，并且能从 `dm.allowFrom` 或
  `defaultTo` 解析出稳定的 `users/<id>` 审批者时，Google Chat 原生审批卡可处理 exec 和插件审批；它们不使用 reaction 事件来做决策
- WhatsApp 和 Signal 的 reaction 审批投递受 `approvals.exec` 和
  `approvals.plugin` 约束；它们没有 `channels.<channel>.execApprovals` 区块

当满足以下条件时，原生审批客户端会自动启用“优先私信”投递：

- 该频道支持原生审批投递
- 可以从显式的 `execApprovals.approvers` 或所有者身份中解析出审批者，
  例如 `commands.ownerAllowFrom`
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

将 `enabled: false` 设为显式禁用某个原生审批客户端。将 `enabled: true` 设为在审批者可解析时强制启用它。公开的来源聊天投递仍通过 `channels.<channel>.execApprovals.target` 显式开启。当原生 `target` 启用来源聊天投递时，审批提示会包含命令文本。

FAQ: [为什么聊天审批有两个 exec 审批配置？](/help/faq-first-run)

- Discord: `channels.discord.execApprovals.*`
- Slack: `channels.slack.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`
- QQ bot: `channels.qqbot.execApprovals.*`
- Google Chat: 使用 `channels.googlechat.dm.allowFrom` 或
  `channels.googlechat.defaultTo` 配置稳定的审批者；不需要 `execApprovals` 区块
- WhatsApp: 使用 `approvals.exec` 和 `approvals.plugin` 将审批提示路由到 WhatsApp
- Signal: 使用 `approvals.exec` 和 `approvals.plugin` 将审批提示路由到 Signal

原生客户端特定路由：

- Telegram 默认将审批发送给审批者私信（`target: "dm"`）。切换为 `channel` 或 `both`，也会在发起审批的 Telegram 聊天/话题中显示审批提示。对于 Telegram 论坛话题，OpenClaw 会保留话题上下文用于审批提示和审批后的跟进。
- Discord 和 Telegram 的审批者可以是显式指定的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断；只有已解析的审批者才能批准或拒绝。
- Slack 审批者可以是显式指定的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断。Slack 插件审批私信使用来自 `allowFrom` 和账户默认路由的 Slack 插件审批者，而不是 Slack exec 审批者。Slack 原生按钮会保留审批 ID 类型，因此 `plugin:` ID 可以在不需要第二层 Slack 本地回退的情况下解析插件审批。
- Google Chat 原生卡片会在消息文本中保留手动 `/approve` 回退，但卡片按钮回调只携带不透明的动作令牌；审批 ID 和决策会从服务器端待处理状态中恢复。
- 当匹配的顶层转发族路由到 WhatsApp 时，WhatsApp 表情审批可同时处理 exec 和插件提示。原生来源提示直接绑定；共享目标模式投递会将相同的有类型审批元数据绑定到被接受的 WhatsApp 消息回执上。
- 仅当匹配的顶层转发族已启用并路由到 Signal 时，Signal 反应审批才会同时处理 exec 和插件提示。直接的同聊 Signal exec 审批可以在没有显式审批者的情况下抑制本地 `/approve` 回退；但 Signal 反应解析仍需要来自 `channels.signal.allowFrom` 或 `defaultTo` 的显式 Signal 审批者。
- Matrix 原生私信/频道路由和反应快捷方式可同时处理 exec 和插件审批；插件授权仍来自 `channels.matrix.dm.allowFrom`。Matrix 原生提示会在第一个提示事件中包含 `com.openclaw.approval` 自定义事件内容，这样支持 OpenClaw 的 Matrix 客户端就能读取结构化审批状态，而原生客户端则保留纯文本 `/approve` 回退。
- 原生 Discord 和 Telegram 审批按钮会在传输私有的回调数据中携带明确的 exec 或 plugin 所有者类型，并且只解析该所有者。旧版缺少类型的 `/approve` 控件仍然是一条有限的兼容路径：它们只会尝试执行操作者可能批准的所有者类型，仅在收到“未找到审批”结果后继续，并且绝不会从审批 ID 推断所有权。
- 请求者不需要是审批者。
- 如果没有任何操作员 UI 或已配置的审批客户端能够接受该请求，提示会回退到 `askFallback`。

诸如 `/diagnostics` 和 `/export-trajectory` 之类的敏感 owner-only 组命令，对审批提示和最终结果使用私有的
所有者路由。OpenClaw 会先尝试在所有者运行该命令的同一界面上进行私有路由。如果该界面没有私有所有者路由，
它会回退到 `commands.ownerAllowFrom` 中第一个可用的所有者路由，因此即使 Telegram 是配置的主要私有界面，
Discord 组命令仍然可以把审批和结果发送到所有者的 Telegram 私信。群聊只会收到一条简短确认。

参见：

- [Discord](/channels/discord)
- [Telegram](/channels/telegram)
- [QQ bot](/channels/qqbot)

### 官方移动端操作员应用

官方 iOS 和 Android 应用在使用 `operator.admin` 连接时，也可以查看 Gateway 拥有的待处理 exec
审批；或者当其配对的 `operator.approvals` 设备被请求显式指定为目标时，也可以查看。它们会读取与
控制界面相同的已清理持久记录，提交带类型感知的决策，并显示 Gateway 的标准首答结果。
Apple Watch 会通过配对的 iPhone 镜像这些审批提示，并支持 allow-once 和 deny 操作。直接的 Watch Gateway 模式
不会查看审批。

丢失 resolve 确认不会使提交的选择成为权威结果：
应用会禁用控制项并再次读取记录。如果别的界面已经胜出，应用会显示那个已记录的决策。待处理提示始终绑定到发出它们的
Gateway，因此切换活动 Gateway 不会重定向旧的审批 ID。

### macOS IPC 流程

```
Gateway -> Node 服务 (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac 应用（界面 + 审批 + system.run）
```

安全说明：

- Unix socket mode `0600`, token stored in the `exec_approvals_config` row of
  `state/openclaw.sqlite`.
- Same-UID peer check.
- Challenge/response (nonce + HMAC token + request hash) + short TTL.

## 常见问题

### 在审批目标上，什么时候会使用 `accountId` 和 `threadId`？

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

在该配置下，转发的执行审批会由 `ops-bot` Telegram 账号发布到聊天 `-1001234567890` 的话题 `77` 中。没有 `accountId` 的目标会使用该频道的默认账号，而没有 `threadId` 的目标会发布到顶级目标位置。

### 当审批发送到某个会话时，该会话中的任何人都可以批准吗？

不可以。会话投递只决定提示出现在哪里，它本身并不会授权该聊天中的每个参与者都能批准。

对于通用的同聊天 `/approve`，发送者必须已经被授权可在该频道会话中执行命令。如果频道暴露了明确的审批批准者，那么即使他们在该会话中并非其他命令的授权用户，也可以授权 `/approve` 动作。

某些频道更严格。Discord、Telegram、Matrix、Slack 原生审批 DM，以及类似的原生审批客户端，会使用它们解析出的批准者列表来进行审批授权。例如，一个 Telegram 论坛话题中的审批提示可能对话题中的所有人可见，但只有从 `channels.telegram.execApprovals.approvers` 或 `commands.ownerAllowFrom` 解析出的数字 Telegram 用户 ID 才能批准或拒绝它。

## 相关内容

- [执行审批](/tools/exec-approvals) — 核心策略和审批流程
- [执行工具](/tools/exec)
- [提升模式](/tools/elevated)
- [技能](/tools/skills) — 基于技能的自动允许行为
