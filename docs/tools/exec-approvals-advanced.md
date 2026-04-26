---
summary: "高级 exec 审批：安全 bin、解释器绑定、审批转发、原生投递"
read_when:
  - 配置安全 bin 或自定义安全 bin 配置文件
  - 将审批转发到 Slack/Discord/Telegram 或其他聊天频道
  - 为某个频道实现原生审批客户端
title: "Exec 审批 — 高级"
---

高级 exec 审批主题：`safeBins` 快速路径、解释器/运行时
绑定，以及向聊天频道转发审批（包括原生投递）。
有关核心策略和审批流程，请参见 [Exec 审批](/tools/exec-approvals)。

## 安全 bin（仅 stdin）

`tools.exec.safeBins` 定义了一小组**仅 stdin** 的二进制程序（例如
`cut`），它们可以在 allowlist 模式下运行，**无需**显式的 allowlist
条目。安全 bin 会拒绝位置文件参数和类路径标记，因此它们
只能作用于传入流。请将其视为用于
流过滤器的窄快速路径，而不是通用信任列表。

<Warning>
不要将解释器或运行时二进制程序（例如 `python3`、`node`、
`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins`。如果某个命令能够按设计
执行代码、执行子命令或读取文件，请优先使用显式 allowlist 条目，
并保持审批提示启用。自定义安全 bin 必须在 `tools.exec.safeBinProfiles.<bin>`
中定义显式配置文件。
</Warning>

默认安全 bin：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`、`uniq`、`head`、`tail`、`tr`、`wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果你选择启用它们，请为其非 stdin
工作流保留显式 allowlist 条目。对于安全 bin 模式下的 `grep`，
请使用 `-e`/`--regexp` 提供模式；位置参数形式的模式会被拒绝，
因此文件操作数不能作为歧义位置参数被混入。

### argv 校验与被拒绝的标志

校验仅依据 argv 形状确定（不检查主机文件系统存在性），
这可防止 allow/deny 差异造成文件存在性 oracle 行为。默认安全 bin 会拒绝面向文件的选项；
长选项采用 fail-closed 校验（未知标志和歧义缩写都会被拒绝）。

按安全 bin 配置文件拒绝的标志：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`、`--from-file`、`--library-path`、`--rawfile`、`--slurpfile`、`-L`、`-f`
- `sort`: `--compress-program`、`--files0-from`、`--output`、`--random-source`、`--temporary-directory`、`-T`、`-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全 bin 还会在执行时将 argv 标记强制视为**字面文本**（不进行 glob 展开，也不进行 `$VARS` 展开），
适用于仅 stdin 的片段，因此像 `*` 或 `$HOME/...` 之类的模式
不能被用来混入文件读取。

### 受信任的二进制目录

安全 bin 必须从受信任的二进制目录中解析（系统默认值加上可选的 `tools.exec.safeBinTrustedDirs`）。
`PATH` 条目绝不会被自动信任。默认受信任目录故意保持最小化：`/bin`、`/usr/bin`。如果
你的安全 bin 可执行文件位于包管理器/用户路径中（例如
`/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），请显式将它们添加到
`tools.exec.safeBinTrustedDirs`。

### Shell 串联、包装器与多路复用器

当每个顶层片段都满足 allowlist（包括安全 bin 或技能自动允许）时，允许使用 Shell 串联
（`&&`、`||`、`;`）。重定向在 allowlist 模式下仍不支持。命令替换（`$()` / 反引号）
会在 allowlist 解析期间被拒绝，包括在双引号内；如果你需要字面 `$()` 文本，请使用单引号。

在 macOS companion-app 审批中，包含 shell 控制或展开语法
（`&&`、`||`、`;`、`|`、`` ` ``、`$`、`<`、`>`、`(`、`)`）的原始 shell 文本
会被视为 allowlist 未命中，除非 shell 二进制本身已在 allowlist 中。

对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围内的 env 覆盖会
被缩减为一个较小的显式 allowlist（`TERM`、`LANG`、`LC_*`、`COLORTERM`、
`NO_COLOR`、`FORCE_COLOR`）。

对于 allowlist 模式下的 `allow-always` 决策，已知的分发包装器（`env`、
`nice`、`nohup`、`stdbuf`、`timeout`）会持久化内部可执行文件路径，
而不是包装器路径。Shell 多路复用器（`busybox`、`toybox`）对 shell applet
（`sh`、`ash` 等）也会以相同方式解除包装。如果包装器或多路复用器
无法安全地解除包装，则不会自动持久化任何 allowlist 条目。

如果你将 `python3` 或 `node` 等解释器加入 allowlist，建议设置
`tools.exec.strictInlineEval=true`，这样 inline eval 仍然需要显式审批。在严格模式下，
`allow-always` 仍可持久化良性的解释器/脚本调用，但 inline-eval 承载者不会被自动持久化。

### 安全 bin 与 allowlist 的对比

| 主题             | `tools.exec.safeBins`                                  | Allowlist（`exec-approvals.json`）                         |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 目标             | 自动允许窄范围 stdin 过滤器                            | 显式信任特定可执行文件                                      |
| 匹配类型         | 可执行文件名 + 安全 bin argv 策略                      | 已解析可执行文件路径通配符模式                              |
| 参数范围         | 受安全 bin 配置文件和字面标记规则限制                  | 仅路径匹配；其余参数由你负责                                  |
| 典型示例         | `head`、`tail`、`tr`、`wc`                             | `jq`、`python3`、`node`、`ffmpeg`、自定义 CLI               |
| 最佳用途         | 管道中的低风险文本转换                                  | 行为更广泛或带副作用的任何工具                              |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或按代理 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或按代理 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或按代理 `agents.list[].tools.exec.safeBinProfiles`）。按代理的配置文件键会覆盖全局键。
- allowlist 条目位于主机本地 `~/.openclaw/exec-approvals.json` 的 `agents.<id>.allowlist` 下（或通过 Control UI / `openclaw approvals allowlist ...`）。
- `openclaw security audit` 会在解释器/运行时 bin 出现在 `safeBins` 中但没有显式配置文件时，发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目脚手架化为 `{}`（之后请审核并收紧）。解释器/运行时 bin 不会自动脚手架化。

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

如果你显式将 `jq` 纳入 `safeBins`，OpenClaw 仍会在安全 bin
模式下拒绝 `env` 内建命令，因此 `jq -n env` 不能在没有显式 allowlist 路径
或审批提示的情况下导出主机进程环境。

## 解释器/运行时命令

基于审批的解释器/运行时运行会刻意保持保守：

- 始终绑定精确的 argv/cwd/env 上下文。
- 直接脚本文件和直接运行时文件形式会尽最大努力绑定到一个具体的本地
  文件快照。
- 常见的包管理器包装器形式，只要仍然解析到一个直接本地文件（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`），会在绑定前解除包装。
- 如果 OpenClaw 无法为解释器/运行时命令精确识别出一个具体的本地文件
  （例如包脚本、eval 形式、运行时特定的加载器链，或含糊的多文件
  形式），则会拒绝基于审批的执行，而不是错误地声称其拥有并不具备的
  语义覆盖。
- 对于这些工作流，请优先使用沙箱、独立主机边界，或明确受信任的
  allowlist/完整工作流，由操作员接受更广泛的运行时语义。

当需要审批时，exec 工具会立即返回一个审批 id。使用该 id 来
关联后续系统事件（`Exec finished` / `Exec denied`）。如果在超时前没有收到决定，
请求会被视为审批超时，并作为拒绝原因呈现。

### 后续投递行为

在已批准的异步 exec 完成后，OpenClaw 会向同一会话发送一个后续 `agent` 回合。

- 如果存在有效的外部投递目标（可投递频道加目标 `to`），后续投递会使用该频道。
- 在仅 webchat 或无外部目标的内部会话流程中，后续投递保持仅会话（`deliver: false`）。
- 如果调用方显式请求严格的外部投递，但没有可解析的外部频道，请求会以 `INVALID_REQUEST` 失败。
- 如果启用了 `bestEffortDeliver` 且无法解析外部频道，投递会降级为仅会话，而不是失败。

## 转发审批到聊天频道

你可以将 exec 审批提示转发到任意聊天频道（包括插件频道），并通过 `/approve`
对其批准。这使用常规的出站投递流水线。

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

`/approve` 命令同时处理 exec 审批和插件审批。如果该 ID 不匹配任何待处理的 exec 审批，它会自动改为检查插件审批。

### 插件审批转发

插件审批转发使用与 exec 审批相同的投递流水线，但在 `approvals.plugin` 下拥有
独立配置。启用或禁用其中一个不会影响另一个。

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

配置结构与 `approvals.exec` 完全相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的工作方式一致。

支持共享交互回复的频道会为 exec 和
插件审批呈现相同的审批按钮。不支持共享交互 UI 的频道会退回到带有 `/approve`
说明的纯文本。

### 任意频道上的同聊天审批

当 exec 或插件审批请求源自可投递的聊天界面时，同一聊天
现在默认可以使用 `/approve` 来批准它。这同样适用于 Slack、Matrix 和
Microsoft Teams 等频道，以及现有的 Web UI 和终端 UI 流程。

这个共享的文本命令路径使用该对话的常规频道认证模型。如果
发起聊天已经可以发送命令并接收回复，审批请求就不再需要
单独的原生投递适配器来保持待处理状态。

Discord 和 Telegram 也支持同聊天 `/approve`，但即使关闭了原生审批投递，这些频道
仍会使用其已解析的审批者列表进行授权。

对于通过 Gateway 直接调用的 Telegram 和其他原生审批客户端，
此回退故意仅限于“未找到审批”的失败。真实的
exec 审批拒绝/错误不会静默重试为插件审批。

### 原生审批投递

某些频道也可以作为原生审批客户端。原生客户端在共享的同聊天 `/approve`
流程之上，增加审批者 DM、原发起聊天分发，以及特定频道的交互式审批 UX。

当可用原生审批卡片/按钮时，该原生 UI 是主要的
面向代理路径。除非工具结果表明聊天审批不可用，或者
手动审批是唯一剩余路径，否则代理不应再回显重复的纯聊天
`/approve` 命令。

通用模型：

- 主机 exec 策略仍然决定是否需要 exec 审批
- `approvals.exec` 控制将审批提示转发到其他聊天目的地
- `channels.<channel>.execApprovals` 控制该频道是否充当原生审批客户端

当以下条件全部满足时，原生审批客户端会自动启用优先 DM 投递：

- 该频道支持原生审批投递
- 审批者可以从显式的 `execApprovals.approvers` 或该
  频道文档化的回退来源中解析得到
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

将 `enabled: false` 设为显式禁用原生审批客户端。将 `enabled: true` 设为
在审批者可解析时强制启用。公开原发起聊天投递仍通过
`channels.<channel>.execApprovals.target` 显式设置。

FAQ：[为什么聊天审批有两个 exec 审批配置？](/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

这些原生审批客户端在共享的
同聊天 `/approve` 流程和共享审批按钮之上，增加 DM 路由和可选的频道分发。

共享行为：

- Slack、Matrix、Microsoft Teams 以及类似的可投递聊天在同聊天 `/approve`
  中使用常规频道认证模型
- 当原生审批客户端自动启用时，默认的原生投递目标是审批者 DM
- 对于 Discord 和 Telegram，只有已解析的审批者可以批准或拒绝
- Discord 审批者可以是显式的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断
- Telegram 审批者可以是显式的（`execApprovals.approvers`）或从现有 owner 配置推断（`allowFrom`，以及在支持时的直接消息 `defaultTo`）
- Slack 审批者可以是显式的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断
- Slack 原生按钮会保留审批 id 类型，因此 `plugin:` id 可以解析到插件审批
  而无需第二层 Slack 本地回退
- Matrix 原生 DM/频道路由和反应快捷方式同时处理 exec 和插件审批；
  插件授权仍来自 `channels.matrix.dm.allowFrom`
- 请求者不需要是审批者
- 当发起聊天已经支持命令和回复时，该聊天可直接通过 `/approve` 批准
- 原生 Discord 审批按钮按审批 id 类型路由：`plugin:` id 会
  直接进入插件审批，其余全部进入 exec 审批
- 原生 Telegram 审批按钮遵循与 `/approve` 相同的有界 exec 到插件回退
- 当原生 `target` 启用原发起聊天投递时，审批提示会包含命令文本
- 待处理的 exec 审批默认在 30 分钟后过期
- 如果没有操作员 UI 或已配置的审批客户端可以接受请求，提示会回退到 `askFallback`

Telegram 默认投递到审批者 DM（`target: "dm"`）。如果你希望审批提示也出现在
发起的 Telegram 聊天/主题中，可以切换到 `channel` 或 `both`。对于 Telegram 论坛主题，
OpenClaw 会在审批提示和审批后的后续跟进中保留该主题。

另见：

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

- Unix socket 模式 `0600`，token 存储在 `exec-approvals.json` 中。
- 同 UID 对等端检查。
- 挑战/响应（nonce + HMAC token + request hash）+ 短 TTL。

## 相关内容

- [执行审批](/tools/exec-approvals) — 核心策略和审批流程
- [执行工具](/tools/exec)
- [提升模式](/tools/elevated)
- [技能](/tools/skills) — 基于技能的自动允许行为
