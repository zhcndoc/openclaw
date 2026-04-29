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

`tools.exec.safeBins` 定义了一小组**仅 stdin** 的二进制程序（例如
`cut`），它们可以在 allowlist 模式下运行，**无需**显式的 allowlist
条目。安全二进制会拒绝位置文件参数和类似路径的标记，因此它们
只能作用于传入的流。请将其视为面向流过滤器的狭窄快速路径，
而不是通用信任列表。

<Warning>
不要将解释器或运行时二进制程序（例如 `python3`、`node`、
`ruby`、`bash`、`sh`、`zsh`）加入 `safeBins`。如果某个命令按设计可以
执行代码、运行子命令或读取文件，请优先使用显式 allowlist 条目，
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

验证仅根据 argv 形状进行确定性判断（不检查宿主文件系统是否存在），
这可以防止因 allow/deny 差异而产生文件存在性 oracle 行为。面向文件的选项会被默认安全二进制拒绝；
长选项会以 fail-closed 方式验证（拒绝未知标志和歧义缩写）。

按安全二进制配置文件被拒绝的标志：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`、`--from-file`、`--library-path`、`--rawfile`、`--slurpfile`、`-L`、`-f`
- `sort`: `--compress-program`、`--files0-from`、`--output`、`--random-source`、`--temporary-directory`、`-T`、`-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全二进制还会在执行时将 argv 标记强制视为**字面文本**（不进行 glob 展开和
`$VARS` 展开），适用于仅 stdin 的段，因此像 `*` 或 `$HOME/...`
这样的模式不能被用来夹带文件读取。

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

对于 allowlist 模式下的 `allow-always` 决策，已知的分发包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）
会持久化内部可执行文件路径，而不是包装器路径。Shell 多路复用器（`busybox`、`toybox`）
在处理 Shell 小程序（`sh`、`ash` 等）时也会以同样方式展开。如果某个包装器或多路复用器无法安全展开，
则不会自动持久化 allowlist 条目。

如果你将 `python3` 或 `node` 之类的解释器加入 allowlist，请优先设置
`tools.exec.strictInlineEval=true`，这样内联 eval 仍需要显式审批。在 strict 模式下，
`allow-always` 仍可持久化良性的解释器/脚本调用，但内联 eval 载体不会自动持久化。

### 安全二进制与 allowlist 的对比

| 主题             | `tools.exec.safeBins`                                  | Allowlist（`exec-approvals.json`）                                                     |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 目标             | 自动允许狭窄的 stdin 过滤器                             | 显式信任特定可执行文件                                                               |
| 匹配类型         | 可执行文件名 + 安全二进制 argv 策略                    | 解析后的可执行文件路径 glob，或 PATH 调用命令的裸命令名 glob                          |
| 参数范围         | 受安全二进制配置文件和字面标记规则限制                  | 仅路径匹配；其余参数由你自行负责                                                       |
| 典型示例         | `head`、`tail`、`tr`、`wc`                             | `jq`、`python3`、`node`、`ffmpeg`、自定义 CLI                                         |
| 最佳用途         | 管道中低风险的文本转换                                  | 任何具有更广泛行为或副作用的工具                                                       |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或按 agent 的 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或按 agent 的 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或按 agent 的 `agents.list[].tools.exec.safeBinProfiles`）。按 agent 的配置文件键会覆盖全局键。
- allowlist 条目位于宿主本地的 `~/.openclaw/exec-approvals.json` 中的 `agents.<id>.allowlist` 下（或通过 Control UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制出现在 `safeBins` 中但没有显式配置文件时，`openclaw security audit` 会以 `tools.exec.safe_bins_interpreter_unprofiled` 发出警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目脚手架化为 `{}`（之后请自行审查并收紧）。解释器/运行时二进制不会自动脚手架化。

自定义配置文件示例：

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

如果你显式将 `jq` 纳入 `safeBins`，OpenClaw 仍会在安全二进制模式下拒绝 `env` 内建，
因此 `jq -n env` 无法在没有显式 allowlist 路径或审批提示的情况下转储宿主进程环境。

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

当需要审批时，exec 工具会立即返回一个审批 id。使用该 id 来
关联后续系统事件（`Exec finished` / `Exec denied`）。如果在超时前未收到决策，
则该请求会被视为审批超时，并作为拒绝原因展示。

### 后续投递行为

在一个已批准的异步 exec 完成后，OpenClaw 会向同一会话发送一个后续的 `agent` 回合。

- 如果存在有效的外部投递目标（可投递频道加上目标 `to`），后续投递会使用该频道。
- 在仅 webchat 或无外部目标的内部会话流程中，后续投递保持仅会话内（`deliver: false`）。
- 如果调用方显式请求严格的外部投递但没有可解析的外部频道，请求会以 `INVALID_REQUEST` 失败。
- 如果启用了 `bestEffortDeliver` 且无法解析任何外部频道，则投递会降级为仅会话内，而不是失败。

## 将审批转发到聊天频道

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

`/approve` 命令同时处理 exec 审批和插件审批。如果该 ID 与待处理的 exec 审批不匹配，它会自动转而检查插件审批。

### 插件审批转发

插件审批转发使用与 exec 审批相同的投递管道，但在 `approvals.plugin` 下有自己独立的配置。
启用或禁用其中一个不会影响另一个。

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
插件审批渲染相同的审批按钮。不支持共享交互式 UI 的频道会回退到带有
`/approve` 说明的纯文本。

### 任意频道上的同聊审批

当某个 exec 或插件审批请求起源于一个可投递的聊天界面时，同一个聊天
现在默认可以用 `/approve` 来批准它。这同样适用于 Slack、Matrix 和
Microsoft Teams 等频道，以及现有的 Web UI 和终端 UI 流程。

这种共享文本命令路径会为该对话使用正常的频道认证模型。如果
发起的聊天本来就能发送命令并接收回复，审批请求就不再需要
单独的原生投递适配器来保持挂起状态。

Discord 和 Telegram 也支持同聊 `/approve`，但即使禁用了原生审批投递，
这些频道仍会使用其解析出的审批者列表进行授权。

对于 Telegram 和其他直接调用 Gateway 的原生审批客户端，
这种回退有意被限定在“找不到审批”的失败上。真正的 exec 审批拒绝/错误
不会悄悄重试为插件审批。

### 原生审批投递

某些频道也可以充当原生审批客户端。原生客户端在共享的同聊 `/approve`
流程之上，增加了审批者私信、起源聊天分发，以及频道特定的交互式审批 UX。

当原生审批卡片/按钮可用时，该原生 UI 是面向 agent 的主要路径。
除非工具结果表明聊天审批不可用，或手动审批是剩余的唯一路径，
否则 agent 不应再额外回显一条重复的纯聊天 `/approve` 命令。

如果配置了原生审批客户端，但起源频道没有激活原生运行时，OpenClaw 会保留本地确定性的
`/approve` 提示可见。如果原生运行时已激活并尝试投递，但没有任何目标收到该卡片，
OpenClaw 会发送一条同聊回退通知，并附上精确的 `/approve <id> <decision>` 命令，以便仍可解决该请求。

通用模型：

- 宿主 exec 策略仍然决定是否需要 exec 审批
- `approvals.exec` 控制将审批提示转发到其他聊天目的地
- `channels.<channel>.execApprovals` 控制该频道是否作为原生审批客户端

当满足以下条件时，原生审批客户端会自动启用“优先私信”投递：

- 该频道支持原生审批投递
- 可以从显式的 `execApprovals.approvers` 或所有者身份中解析出审批者，
  例如 `commands.ownerAllowFrom`
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

设置 `enabled: false` 可显式禁用原生审批客户端。设置 `enabled: true` 可在审批者解析成功时强制启用。
公共起源聊天投递始终通过 `channels.<channel>.execApprovals.target` 显式设置。

FAQ：[为什么聊天审批有两个 exec 审批配置？](/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

这些原生审批客户端在共享的同聊 `/approve` 流程和共享审批按钮之上，增加了私信路由和可选的频道分发。

共享行为：

- Slack、Matrix、Microsoft Teams 以及类似的可投递聊天使用正常的频道认证模型来处理同聊 `/approve`
- 当原生审批客户端自动启用时，默认原生投递目标为审批者私信
- 对于 Discord 和 Telegram，只有解析出的审批者可以批准或拒绝
- Discord 审批者可以是显式的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断
- Telegram 审批者可以是显式的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断
- Slack 审批者可以是显式的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断
- Slack 原生按钮会保留审批 id 类型，因此 `plugin:` id 可以解析插件审批，
  而无需第二层 Slack 本地回退
- Matrix 原生私信/频道路由和 reaction 快捷方式同时处理 exec 和插件审批；
  插件授权仍来自 `channels.matrix.dm.allowFrom`
- Matrix 原生提示会在第一个提示事件中包含 `com.openclaw.approval` 自定义事件内容，
  这样支持 OpenClaw 的 Matrix 客户端就能读取结构化审批状态，而标准客户端
  仍保留纯文本 `/approve` 回退
- 请求者不必是审批者
- 当该聊天本身已支持命令和回复时，起源聊天可以直接使用 `/approve` 批准
- 原生 Discord 审批按钮按审批 id 类型路由：`plugin:` id 会直接进入插件审批，
  其他所有内容都进入 exec 审批
- 原生 Telegram 审批按钮遵循与 `/approve` 相同的受限 exec-to-plugin 回退
- 当原生 `target` 启用起源聊天投递时，审批提示会包含命令文本
- 待处理的 exec 审批默认在 30 分钟后过期
- 如果没有运维 UI 或配置的审批客户端可以接受该请求，提示会回退到 `askFallback`

诸如 `/diagnostics` 和 `/export-trajectory` 之类的敏感 owner-only 组命令，对审批提示和最终结果使用私有的
所有者路由。OpenClaw 会先尝试在所有者运行该命令的同一界面上进行私有路由。如果该界面没有私有所有者路由，
它会回退到 `commands.ownerAllowFrom` 中第一个可用的所有者路由，因此即使 Telegram 是配置的主要私有界面，
Discord 组命令仍然可以把审批和结果发送到所有者的 Telegram 私信。群聊只会收到一条简短确认。

Telegram 默认使用审批者私信（`target: "dm"`）。当你希望审批提示也出现在起源 Telegram 聊天/话题中时，
可以切换到 `channel` 或 `both`。对于 Telegram 论坛话题，OpenClaw 会在审批提示和审批后跟进中保留该话题。

参见：

- [Discord](/channels/discord)
- [Telegram](/channels/telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：

- Unix socket 模式为 `0600`，token 存储在 `exec-approvals.json` 中。
- 同 UID 对等方检查。
- 挑战/响应（nonce + HMAC token + request hash）+ 短 TTL。

## 相关内容

- [执行审批](/tools/exec-approvals) — 核心策略和审批流程
- [执行工具](/tools/exec)
- [提升模式](/tools/elevated)
- [技能](/tools/skills) — 基于技能的自动允许行为
