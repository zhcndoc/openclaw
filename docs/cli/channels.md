---
summary: "CLI `openclaw channels` 的参考（帐户、状态、死信、功能、解析、日志、login/logout）"
read_when:
  - "你想添加或移除频道账户（Discord、Google Chat、iMessage、Matrix、Signal、Slack、Telegram、WhatsApp 等）"
  - "你想检查频道状态或跟踪频道日志"
  - "你需要检查或重新提交失败的入站频道事件"
title: "渠道"
---

# `openclaw channels`

在 Gateway 上管理聊天频道账户及其运行时状态。

相关文档：

- 频道指南：[Channels](/channels)
- 网关配置：[配置](/gateway/configuration)

## <a id="common-commands"></a> 常用命令

```bash
openclaw channels list
openclaw channels list --all
openclaw channels status
openclaw channels status --probe
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
openclaw channels dead-letters list --channel telegram --account default
```

当插件无法加载或注册时，`channels status` 使配置的通道保持可见。受影响的帐户报告 `running: false`、`lifecycle: "blocked"` 和插件错误，而不是陈旧的成功检查。运行`openclaw doctor`，修复或更新插件，并重新启动网关，然后再次检查。

`channels list` 仅显示聊天频道：默认配置的帐户，每个帐户带有 `installed`、`configured` 和 `enabled` 状态标签（`--json` 用于机器输出）。传递 `--all` 还可以显示尚未配置帐户的捆绑频道以及尚未位于磁盘上的可安装目录频道。提供商身份验证和模型使用情况在其他地方：`openclaw models auth list` 用于提供商身份验证配置文件，`openclaw status` 或 `openclaw models list` 用于 usage/quota.

`--json` 从插件元数据返回本地帐户清单，而无需联系网关或执行通道 setup/runtime 代码。即使其插件有设置条目，配置的帐户仍然可见。使用 `channels status --probe` 进行实时检查。

禁用插件并不会卸载它。其渠道库存中仍保留`installed: true`；对于 `--all`，即使禁用其插件，未配置帐户的已安装频道也会具有 `origin: "available"`。

在显式多代理设置中，工作区范围的通道插件来自 `agents.defaults.systemAgent.agentId`。如果没有该所有者，`channels list` 将返回带有诊断的共享捆绑、托管和全局库存；它不会猜测一个代理工作区。

对于 `add`、`login`、`logout`、`remove` 和 `resolve` 或 `capabilities --channel`，使用 `--agent <id>` 选择用于通道插件发现的工作区。该选项在子命令之前或之后起作用；子命令值优先。如果没有它，发现将使用配置的系统代理或现有的 sole/legacy 所有者。在交互式引导 `channels add` 中，没有此类所有者的显式队列会在工作区范围内的发现之前提示设置所有者；标志驱动或非交互式设置仍然需要 `--agent`。选择工作区不会创建帐户路由绑定；引导设置单独询问路由。

`add`、`login`、`logout` 和 `remove` 也采用 `--account <id>`。省略它会选择默认帐户。空白值会被拒绝，而不是像死信命令那样回退到默认值，因此未设置的 shell 变量无法默默地选择您未命名的帐户。

对于 `--json`，每个频道条目都包含 `label` 及其帐户、安装状态和来源。当经过验证的官方频道元数据提供经过验证的根相对文档路径时，条目还包括 `docsPath`。自动化可以使用 `https://docs.openclaw.ai` 加入此路径，而无需信任插件提供的 URL。未跟踪或不一致的已安装插件来源省略了 `docsPath`；使用 `openclaw doctor --fix` 修复已验证的遗留来源或重新安装官方软件包。

## <a id="status-%2F-capabilities-%2F-resolve-%2F-logs"></a><a id="status-/-capabilities-/-resolve-/-logs"></a> 状态 / 能力 / 解析 / 日志

`capabilities` 和 `resolve` 拒绝明确为空或仅包含空格的 `--account` 值。省略保留每个命令的默认或更广泛帐户范围的选项；不要传递空 shell 变量来请求该范围。

- `channels status`：`--channel <name>`、`--probe`、`--timeout <ms>`（默认`60000`）、`--json`
- `channels capabilities`：`--channel <name>`、`--agent <id>`、`--account <id>`（需要 `--channel`）、`--target <dest>`（需要 `--channel`）、`--timeout <ms>`（默认） `10000`，上限为 `30000`）、`--json`
- `channels resolve <entries...>`：`--channel <name>`、`--account <id>`、`--agent <id>`、`--kind <auto|user|group|channel>`（默认`auto`）、`--json`
- `channels logs`: `--channel <name|all>`（默认 `all`）、`--lines <n>`（默认 `200`）、`--json`

`channels logs --lines` 需要一个正整数。省略`--lines`，使用默认的`200`；明确的空值将被拒绝。

`channels logs --channel <name>` 匹配以 `<name>`、`channels/<name>` 或 `gateway/channels/<name>` 为根的子系统或模块名称，包括斜杠分隔的后代。 `discord-archive` 等类似名称与 `discord` 不匹配。

`channels status` 读取网关记录的通道生命周期和健康状况，以及无秘密的帐户元数据。它不会解析操作凭据或运行实时状态挂钩。未知的配置和过时的连接仍然可见；通道未记录的提供商详细信息可能需要显式探测。 WhatsApp记录的认证年龄随着通道心跳刷新。

`channels status --probe` 是实时路径：在可访问的网关上，它运行每个帐户的 `probeAccount` 和可选的 `auditAccount` 检查，因此输出可以包括传输状态以及成功或失败的帐户检查和审核。通道会按照每个通道的有限期限同时进行检查，包括帐户解析和状态挂钩。超时的通道会返回其记录的状态并发出警告，而不是阻止健康的通道返回其结果。如果网关无法访问，`channels status` 将回退到仅配置摘要，而不是实时检查输出。

如果网关回答错误（例如未知的 `--channel`），则该命令会报告该错误并以非零值退出，而不是显示无法访问的回退。

在检查通道之前，该命令会使用共享就绪预算等待本地网关启动，并报告其观察到的阶段。在截止日期前仍在进行的启动是一个非失败的结果，而不是一个无法访问的网关。在这种情况下，`--json` 返回 `{ "status": "starting", "startupPhase": "…" }`；启动后重新运行以收集通道结果。

该命令读取现有的本地设备身份验证，而不创建网关返回的身份或持久令牌，包括启用 `--probe` 时。

`channels status` 不支持`--deep`；使用 `openclaw channels status --probe` 进行通道检查。单独的顶级 `openclaw status --deep` 命令提供更广泛的状态检查。

## <a id="inbound-dead-letters"></a> 入站死信

已经用尽重试策略的入站事件会在共享状态数据库中保留，保留时间与该队列现有的失败条目保留期一致。使用以下命令检查某个通道账号：

```bash
openclaw channels dead-letters list --channel telegram --account default
openclaw channels dead-letters list --channel telegram --account default --json
```

文本视图显示事件 ID、失败原因、尝试计数和失败期限。 JSON 输出还包括保留的有效负载、元数据、通道和用于诊断的尝试时间戳。

省略 `--account` 将检查 `default` 帐户。两个死信命令都拒绝空白值，而不是回退到 `default`，因此未设置的 shell 变量无法默默地选择您未命名的帐户。您可以将 `--account` 放置在 `list` 或 `resubmit` 之前或之后； leaf 命令之后的值优先。

更正根本问题后，使用原始事件 ID 重新排队一个事件：

```bash
openclaw channels dead-letters resubmit <event-id> --channel telegram --account default
```

请在 Gateway 主机上运行这些命令，以便它们访问与通道运行时相同的共享状态数据库。重新提交会保留负载、元数据和 lane，但会重置尝试计数和队列时长。它会原子性地替换该事件的失败标记，因此当事件处于待处理或已认领状态时重复执行该命令会被拒绝，而不会创建第二次分发。运行中的通道会在下一次入站清理时将其取出。已完成的事件仍然是终态，不能重新提交。对于在添加负载保留之前创建的失败行，它们仍可能出现在列表中，但由于其负载不可用，重新提交会被拒绝。

`openclaw health` 会报告每个通道账号的死信数量以及最早失败时长。`openclaw doctor` 会指出受影响的账号，并返回到检查命令。

不要使用 `openclaw sessions`、Gateway `sessions.list` 或代理的 `sessions_list` 工具作为通道 socket 健康信号。这些界面报告的是已存储的会话记录，而不是提供方运行时状态。在 Discord 提供方重启后，一个已连接但安静的账号可能仍然是健康的，而在下一次入站或出站会话事件到来之前，可能不会出现任何 Discord 会话记录。

## <a id="add-%2F-remove-accounts"></a><a id="add-/-remove-accounts"></a> 添加 / 移除账户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

对于无头主机，请先完成非交互式引导，然后使用明确的凭据标志或基于环境变量的设置选项添加每个频道：

```bash
export OPENAI_API_KEY="<provider-key>"
export TELEGRAM_BOT_TOKEN="<bot-token>"

openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --skip-channels \
  --no-install-daemon
openclaw channels add --channel telegram --use-env
```

`--use-env` 会在写入配置前验证所选频道插件声明的环境变量。对于 Telegram，该命令需要 `TELEGRAM_BOT_TOKEN`；其他插件会在错误信息中列出缺失的变量。Gateway 服务必须接收与引导 shell 相同的环境变量。如果 Gateway 已经以启用配置重新加载的方式运行，它会监视配置写入，并自动重启受影响的频道。

参见 [CLI 自动化](/start/wizard-cli-automation)，了解其他非交互式提供方和 Gateway 选项。容器部署还应遵循 [Docker 无头引导](/install/docker#headless-bootstrap)中的环境配置说明。

<Tip>
`openclaw channels add telegram --help` 或 `openclaw channels add --channel telegram --help` 只会显示 Telegram 的设置标志。`openclaw channels add --help` 只会显示共享的命令外壳。
</Tip>

`channels remove` 仅在 installed/configured 通道插件上运行。首先使用 `channels add` 作为可安装的目录频道。如果没有 `--delete`，它会要求禁用该帐户并保留其配置； `--delete` 删除配置条目而不提示。对于运行时支持的通道插件，`channels remove` 还会要求正在运行的网关在更新配置之前停止所选帐户，因此禁用或删除帐户不会使旧侦听器保持活动状态，直到重新启动为止。

共享控制信封包含 `--agent`、`--channel`、`--account` 和可选帐户显示 `--name`。每个现代通道插件都拥有其凭证、传输和特定于提供者的语义。通过位置 id 或 `--channel <id>` 选择频道后，CLI 仅从捆绑或安装的插件包元数据构建该频道的选项，而不加载频道运行时代码。

像 `--token`、`--url` 或 `--use-env` 这类看起来通用的标志，在现代契约处理它们时仍然属于频道所有。当所选第三方插件仍使用旧的共享设置适配器时，core 只会为该频道注册已发布的兼容标志集，并连同其旧的 `cliAddOptions` 一起使用。无关的旧字段不会泄漏到其他频道中，而现代被选中的频道会拒绝它未声明的兼容标志。

频道专有标志的示例包括：

| 渠道     | 标志                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Google Chat | `--webhook-path`, `--webhook-url`, `--audience-type`, `--audience`                                   |
| iMessage    | `--cli-path`, `--db-path`, `--service`, `--region`                                                   |
| Matrix      | `--homeserver`, `--user-id`, `--access-token`, `--password`, `--device-name`, `--initial-sync-limit` |
| Nostr       | `--private-key`, `--relay-urls`                                                                      |
| Signal      | `--signal-number`, `--signal-transport`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`    |
| 特隆        | `--ship`, `--url`, `--code`, `--group-channels`, `--dm-allowlist`, `--auto-discover-channels`        |
| WhatsApp    | `--auth-dir`                                                                                         |

如果频道插件需要在基于标志的添加命令期间安装，OpenClaw 会使用该频道的默认安装来源，而不会打开交互式插件安装提示。

引导式设置和基于标志的设置都会经过所选频道的解析器、验证器、账户解析、配置写入器以及写入后的钩子。未支持的标志会以所属频道的设置错误失败，而不会作为全局输入袋被接受。

新的或更改的 SecretRef 支持的通道凭证将作为受保护条目保存在 [ 共享秘密存储区 ](/gateway/secrets/secret-store-and-egress) 中。 `openclaw.json` 保留 `store` SecretRef 而不是凭证。现有的引用、环境支持的设置和令牌文件选择将被保留。存储写入在运行时使用本地网关，或在停止时使用独占离线所有权。如果配置发布失败，安装程序将保留保存的条目并报告其名称，以便您可以在清理之前检查配置。为现有的 Doctor 和机密迁移工作流程保留未更改的明文凭据；升级不会默默地重写它们。

当你运行不带直接账户、凭据或频道配置标志的 `openclaw channels add` 时，交互式向导可以进行提示。位置参数中的频道 id 和 `--channel <id>` 都会立即打开该频道的引导式设置。返回会回到完整的频道选择器：

```bash
openclaw channels add telegram
openclaw channels add --channel telegram
```

引导式设置需要交互式终端。在非 TTY shell 中，OpenClaw 立即退出而不是等待输入。运行 `openclaw channels add --channel <id> --help` 以列出通道声明的设置标志，然后将它们传递以进行非交互式设置。 `--use-env` 仅出现在注册位置：现代通道在其设置合约中声明匹配字段，而仍在旧版共享设置适配器上的插件从上述兼容性集中获取它。当所选通道将 `--use-env` 排除在外时，退出消息指向该通道的 `--help` 而不是 `--use-env`。

向导可能会提示：

- 这些账户的可选显示名称
- 这些帐户的可选显示名称
- `Route these channel accounts to agents now?`

如果你确认立即绑定，向导会询问哪个 agent 应拥有每个已配置的频道账户，并写入账户范围的路由绑定。

你也可以稍后使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由规则（参见 [agents](/cli/agents)）。

当你向仍在使用单账户顶层设置的频道添加非默认账户时，OpenClaw 会先把这些顶层值提升到该频道的账户映射中，然后再写入新账户。提升时，如果该频道恰好已有一个命名账户，或者 `defaultAccount` 指向其中一个，就会重用现有的命名账户；否则，这些值会落到 `channels.<channel>.accounts.default`。

路由行为保持一致：

- 现有的仅频道绑定（没有 `accountId`）仍然会匹配默认账户。
- 在非交互模式下，`channels add` 不会自动创建或重写绑定。
- 交互式设置可以选择性地添加账户范围的绑定。

如果你的配置已经处于混合状态（存在命名账户，同时顶层单账户值仍然设置着），请运行 `openclaw doctor --fix`，将账户范围的值移动到为该频道选定的已提升账户中。

## <a id="login-and-logout-(interactive)"></a><a id="login-and-logout-interactive"></a> 登录和登出（交互式）

在 `channels add` 或 `channels login` 写入本地凭据或配置之前，OpenClaw 会将选定的 CLI state/config 路径与本地网关或其安装的服务进行比较。已证实的不匹配在写入之前停止。无法验证的远程网关或经过身份验证的路径会生成警告。

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` 支持 `--agent <id>`、`--account <id>` 和 `--verbose`； `channels logout` 支持 `--agent <id>` 和 `--account <id>`。
- 当只有一个配置的通道支持该操作时，`channels login` 和 `logout` 可以推断通道；有几个，通过`--channel`。仅省略 `--channel` 才会触发推理：拒绝空白值，因此未设置的 shell 变量无法注销您未命名的通道。
- `channels logout` 在可达时优先使用实时 Gateway 路径，因此登出会在清除 channel 认证状态之前停止任何活动的监听器。如果本地 Gateway 不可达，则回退到本地认证清理；在 `gateway.mode: "remote"` 下，Gateway 错误会直接使命令失败。
- Logout 报告插件是否清除了已保存的身份验证。如果插件报告帐户未注销，CLI 会警告其他凭据可能仍处于活动状态；这并不是说提供商方令牌已被撤销。
- 登录和注销基本配置更改创作源，而不是运行时默认值。没有要清除的凭据的注销不会仅仅因为运行时默认值已实现而重写配置；仍然可以保存有意的插件启用或安装更改。
- 登录成功后，CLI 请求可到达的本地网关启动帐户。如果跳过该启动或另一个生命周期操作拥有该帐户，则会报告原因和状态命令；保留已保存的身份验证。在远程模式下，它会在本地保存身份验证，并指出远程运行时未重新启动。
- 请在 gateway 主机上的终端中运行 `channels login`。Agent `exec` 会阻止此交互式登录流程；如果可用，应在聊天中使用 channel 原生的 agent 登录工具，例如 `whatsapp_login`。

## <a id="per-account-recovery-(non-destructive)"></a><a id="per-account-recovery-non-destructive"></a> 每账户恢复（非破坏性）

当一个帐户需要在保留其配对和凭据的同时重新连接时，请调用 `channels.stop` 和 `channels.start` 网关 RPC。两者都需要 `operator.admin`。通过`openclaw gateway call`调用它们：

```bash
# Stop one WhatsApp account without clearing its pairing.
openclaw gateway call channels.stop --params '{"channel":"whatsapp","accountId":"<accountId>"}'
# Start the same account again.
openclaw gateway call channels.start --params '{"channel":"whatsapp","accountId":"<accountId>"}'
openclaw channels status --channel whatsapp --probe
```

在两次调用中使用相同的 `accountId`。从两者中省略它以选择默认帐户。

`channels.stop` 返回 `{ channel, accountId, stopped }`； `channels.start` 返回 `{ channel, accountId, started, outcome }`。这些布尔值反映了操作后账户的运行时快照：仅当 `running` 为 true 时，`started` 才为 true；当 `running` 不为 true 时，`stopped` 为 true。 `started: false` 响应本身并不能确定帐户已停止，并且 `started: true` 不能确定提供者连接是否正常。恢复后检查通道状态和日志。

当网关拥有其生命周期时，显式启动的帐户会出现在运行时状态中，即使插件的静态帐户列表尚不包含它。成功停止后，该未列出的帐户将从状态中消失。默认帐户选择以及自动运行状况监控和主机解冻恢复继续使用插件的静态帐户列表。

主机解冻恢复检测到比正常节奏至少 45 秒的维护间隙。如果进程 CPU 时间消耗了至少一半的间隙，则网关会记录事件循环负载并跳过解冻恢复，从而保留事件循环运行状况测量。否则，它会刷新运行状况和状态，并在跟踪的工作空闲时尝试恢复通道。繁忙的支票让工作准入处于开放状态。通道重启重试在解冻检测后十分钟到期，包括等待准入重新打开所花费的时间；每次解冻，延期和放弃均记录一次。此窗口期满后，普通通道健康状况监控仍将继续。

`outcome` 解释了生命周期所有者对所请求帐户的决定：

- `{ status: "handed-off" }`：启动已交给帐户运行时。检查提供商连接状态。
- `{ status: "retry", reason }`：现有任务、启动或停止仍拥有该帐户（`task-owned`、`start-in-flight` 或 `stop-in-flight`）。流水账可以用`started: true`返回`task-owned`；没有必要再开始一次。等待飞行中停止完成后再重新开始。
- `{ status: "skipped", reason }`：启动被跳过，例如因为帐户是 `disabled`、`unconfigured` 或 `unlinked`。重试之前修复指定的帐户条件。其他经理原因包括 `unsupported`、`autostart-suppressed`、`ambient-suppressed`、`secret-unavailable` 和 `manual-stop`；手动RPC绕过自动启动抑制，但不绕过帐户配置或秘密检查。

将跳过在通道或帐户配置中明确禁用的帐户，而不解析非活动凭据。已启用帐户上不可用的已配置机密仍会返回 RPC 错误，而不是从另一个凭据开始。

与此恢复路径不同的是，`openclaw channels logout` 会清除帐户的凭据并需要重新登录； `openclaw gateway restart` 重新启动整个网关。有关崩溃回路断路器及其手动 `channels.start` 超控，请参阅 [ 重新启动恢复 ](/gateway/restart-recovery)。

## <a id="troubleshooting"></a> 故障排查

- 运行 `openclaw status --deep` 进行广泛检查。
- 使用 `openclaw doctor` 获取引导式修复。
- 当网关不可达时，`openclaw channels status` 会回退到仅基于配置的摘要。如果通过 SecretRef 配置了受支持的渠道凭据，但在当前命令路径中不可用，它会将该账户报告为已配置并附带降级说明，而不是显示为未配置。

<a id="capabilities-probe" />

## <a id="capabilities-check"></a> 能力检查

获取提供商能力提示（在可用时包含 intents/scopes）以及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

注意：

- `--channel` 是可选的；省略它可列出所有频道（包括由插件提供的频道）。
- `--account` 仅在与 `--channel` 一起使用时有效。
- 每个帐户检查和诊断步骤都有其自己的超时。文本和 JSON 输出中都会报告停止的步骤，并且该命令将继续处理其余帐户。
- `--target` 接受 `channel:<id>` 或原始数字通道 id，并且仅适用于 Discord。对于Discord语音通道，权限检查标记缺少`ViewChannel`、`Connect`、`Speak`、`SendMessages`和`ReadMessageHistory`。
- Checks 是特定于提供商的：Discord 机器人身份 + 意图加上可选的通道权限； Slack 机器人 + 用户范围； Telegram 机器人标志 + webhook； Signal守护进程版本； Microsoft Teams 应用程序令牌 + 图 roles/scopes（已知时有注释）。没有检查的通道报告实时检查不可用。

## <a id="resolve-names-to-ids"></a> 将名称解析为 ID

使用提供程序目录将 channel/user 名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
openclaw channels --agent ops resolve --channel slack "#general"
openclaw channels resolve --agent ops --channel slack "#general"
```

注意：

- 在多代理配置中，在父位置或叶位置使用 `--agent <id>` 来选择代理拥有的工作区和通道插件上下文。
- 使用 `--kind user|group|channel|auto` 强制目标类型。
- 当多个条目共享同名时，解析会优先选择活动匹配项。
- `channels resolve` 是只读的。如果所选账户通过 SecretRef 配置但该凭据在当前命令路径中不可用，命令会返回带说明的降级未解析结果，而不是中止整个运行。
- `channels resolve` 不会安装频道插件。对于可安装目录中的频道，请先使用 `channels add --channel <name>` 再解析名称。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [渠道概览](/channels)
