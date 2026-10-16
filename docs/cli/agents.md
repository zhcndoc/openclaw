---
summary: "`openclaw agents` 的 CLI 参考（角色、团队、工作区、路由和身份）"
read_when:
  - "你需要多个隔离的代理（工作区 + 路由 + 认证）"
  - "您想要从角色创建代理或建立协调团队"
title: "智能体"
---

# `openclaw agents`

管理隔离的代理（工作区 + 认证 + 路由）。不带子命令运行 `openclaw agents` 等同于 `openclaw agents list`。

## <a id="examples"></a> 示例

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:*
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents add research --role researcher --non-interactive
openclaw agents team create --non-interactive
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## <a id="command-surface"></a> 命令界面

### `agents list`

选项：`--json`、`--bindings`（包括完整的路由规则，而不仅仅是每个代理的 counts/summaries）。

对于显式多智能体列表，默认徽章和 JSON `isDefault` 字段使用 `agents.defaults.systemAgent.agentId`。 Doctor 会在重新启动时保留迁移的默认值。如果没有指定，每个条目都会报告 `isDefault: false`；用 `openclaw config set agents.defaults.systemAgent.agentId <id>` 设置一项。 Control UI 的 **Set Default** 操作写入相同的名称。

提供者状态标签包括帐户 ID 旁边的可选帐户显示名称。路由规则继续按通道和账户 ID 来识别账户。

数据库属于另一个代理的代理显示为 **degraded**，并带有拒绝原因和修复指南。当辅助代理被拒绝时，网关可以继续为健康的代理提供服务。按照[Doctor的数据库恢复指导](/gateway/doctor/state-and-sessions)，修复文件后重新启动网关。

提供商行总结了显示的绑定范围的本地帐户状态。通配符包含每个本地已知帐户一次；消息路由仍然应用对等方和帐户优先级。具有省略或空白帐户 ID 的存储绑定引用文字 `default` 帐户密钥，与通道的命令首选帐户无关。使用 `--json --bindings` 将提供程序行包含在 JSON 中。

配置中保存的身份字段优先。未配置的字段将回退到代理工作区中的 `IDENTITY.md`。不支持的头像值和不可读的本地图像也会回退到工作区头像。

### `agents add [name]`

选项：`--role <role>`、`--workspace <dir>`、`--model <id>`、`--agent-dir <dir>`、`--bind <channel[:accountId]>`（可重复）、`--non-interactive`、`--json`。

基本非交互式创建在运行时使用本地网关。该命令绑定到该网关的状态所有者；不支持的方法、丢失回复或身份验证失败永远不会在本地重试写入。在重试不确定结果之前检查 `agents list`。

交互式设置、`--role`、`--agent-dir` 和 `--bind` 需要停止本地网关。这些设置流程通过工作区、凭证和配置结算拥有专有的状态所有权。通过其服务所有者停止网关，等待其退出，然后重新运行相同的命令。

- 自动化标志 `--workspace`、`--model`、`--agent-dir`、`--bind` 和 `--non-interactive` 选择非交互式路径。非交互模式需要代理名称，除非提供 `--role`，否则需要 `--workspace`。
- `--json` 单独保持引导向导的交互性。设置完成后，提示和状态将写入 stderr，并且 stdout 包含一个 JSON 摘要。
- 非交互式 `--json` 在摘要中报告规范化的代理 ID，无需额外的标准输出状态消息。
- 如果请求的绑定属于另一个代理，非交互式创建将保留新代理和任何不冲突的绑定，但会以状态 1 退出。摘要会列出冲突；使用 `agents bind` 和 `agents unbind` 解决它们，而不是重新创建代理。
- `main` 是普通代理 ID。在另一个代理拥有安装后重新创建它可能需要 `openclaw doctor --fix` 首先修复旧会话或共享身份验证所有权。
- 交互模式提供可选的身份验证复制。当队列没有默认代理时，请选择源代理或 **跳过复制身份验证配置文件**（默认）。选择来源在复制之前仍需要确认。仅复制可移植静态凭证（`api_key` 和静态 `token` 配置文件），除非凭证通过 `copyToAgents: false` 选择退出；除非提供商选择使用 `copyToAgents: true`，否则不会复制 OAuth 刷新令牌配置文件。如果没有副本，OAuth 仍可通过共享身份验证库保持可用。如果源代理有自己的本地 OAuth 配置文件，请单独登录新代理。
- 删除完成的座席 ID 可以使用 `agents add` 重新创建。 Creation 在发布新代理时（包括向导复制或配置 auth 时）声明已完成的删除记录。删除清理仍待处理的 ID 将被拒绝，直到清理完成。

#### <a id="role-templates"></a> 角色模板

`--role`适用于交互式和非交互式创作，包括`--json`。捆绑的角色是[Claw来源](/cli/claws)：每个角色目录包含一个带有身份和`SOUL.md`内容的`CLAW.md`清单，以及`workspace/AGENTS.md`中的其操作程序。可用角色：

| 角色          | 标题          | 用途                                                              |
| ------------- | -------------- | -------------------------------------------------------------------- |
| `coordinator` | 参谋长 | 协调专家作为您的单一联系人。              |
| `researcher`  | 研究员     | 收集证据并返回引用的研究摘要。                   |
| `writer`      | 作家         | 将摘要和源材料转变为可用的草稿。                |
| `reviewer`    | 审稿人       | 根据要求检查工件并返回可操作的结果。 |

角色种子`AGENTS.md`、`SOUL.md`和完整的`IDENTITY.md`； `USER.md`仍然使用标准模板。现有工作区文件将被保留。角色的名称、表情符号和主题保存在代理配置中，新的角色工作区会跳过身份仪式：不会创建 `BOOTSTRAP.md`。捆绑的角色使技能保持不变。还应用角色委派设置。独立的参谋长以标准专家 ID 为目标；使用 team 命令创建并连接所有四个代理。通过 Ask OpenClaw 创建代理时，您可以为其 id 单独指定显示名称，例如 id 为 `qa-writer` 的“QA Writer”。批准包括两者。明确的显示名称会替换角色的默认名称，同时保留其表情符号、主题和操作说明。未知角色将被拒绝并带有可用的角色名称。引导程序未完成的工作区无法采用角色。 OpenClaw 添加角色文件前检查完成情况；拒绝采用会使工作区文件和代理配置保持不变。完成其引导程序或选择一个新的工作区。

启用 Claws 后，等效的源路径是来自源签出的 `openclaw claws add docs/reference/templates/roles/<role>`。按照 [Claw 预览和同意流程 ](/cli/claws#inspect-and-preview) 进行添加。使用 `agents team create` 将代理连接到一个团队中。

### `agents team create`

团队创建需要停止本地网关并保留独占状态所有权，直到创建的代理和配置更改解决为止。

选项：`--preset <name>`（默认且仅捆绑预设：`team`）、`--coordinator <id>`（默认：`coordinator`）、`--prefix <p>`、`--workspace-root <dir>`、`--non-interactive`、`--json`。

从角色模板创建参谋长 （`coordinator`） 以及 `researcher`、`writer` 和 `reviewer`。每个工作空间位于`<workspace-root>/<agentId>`；默认根目录是安装的默认工作区目录。 `--prefix editorial` 对每个 id 进行命名，生成 `editorial-coordinator`、`editorial-researcher`、`editorial-writer` 和 `editorial-reviewer`。它还带有自定义 `--coordinator` id 前缀。如果存在任何生成的 ID，该命令将报告冲突并且不添加代理。

现有代理保持不变，包括已配置安装上的隐式 `main`。

```bash
openclaw agents team create --prefix editorial --workspace-root ~/agents --non-interactive --json
openclaw agent --agent editorial-coordinator --message "Research this topic and draft a brief."
```

协调者的`subagents.allowAgents`命名了三个专家ID，`delegationMode`是`"prefer"`。专家收到 `subagents.allowAgents: []` 和返回结果的指示，无需进一步授权。这不会更改全局委派默认值或工具策略。请参阅 [ 团队预设 ](/concepts/multi-agent#team-preset)。委派仍然是配置中的团队连接；一旦单独的爪形轮廓支持落地，爪子角色将进行这些设置。

协调员是一个明确的聊天目标。如果 `agents.defaults.systemAgent.agentId` 未设置，团队创建会将其设置为环境系统工作和默认兼容操作的协调器。现有所有者被保留并报告。通道绑定优先于此默认值。对于 `--json`，摘要包括 `coordinatorId`、创建的 `agents` 及其路径、`ambientOwnerId` 以及保留另一个环境所有者时的 `note`。

### `agents bindings`

选项：`--agent <id>`、`--json`。

### `agents bind`

选项：`--agent <id>`（默认为当前默认 agent）、`--bind <channel[:accountId]>`（可重复）、`--json`。

### `agents unbind`

选项：`--agent <id>`（默认为当前默认 agent）、`--bind <channel[:accountId]>`（可重复）、`--all`、`--json`。只接受 `--all` 或一个或多个 `--bind` 值，不能同时使用。

### `agents set-identity`

选项：`--agent <id>`、`--workspace <dir>`、`--identity-file <path>`、`--from-identity`、`--name <name>`、`--theme <theme>`、`--emoji <emoji>`、`--avatar <value>`、`--json`。另见下方的[设置身份](#set-identity)。

### `agents delete <id>`

选项：`--force`、`--json`。

- 唯一配置的代理无法删除。
- 如果没有 `--force`，则需要交互式确认（在非 TTY 会话中会失败；请使用 `--force` 重新运行）。
- 工作空间、智能体状态和会话记录目录移至垃圾箱，而不是硬删除。如果垃圾箱不可用，代理将从配置中删除，但清理仍处于待处理状态。配置发布成功后，网关删除将返回 `UNAVAILABLE`，其错误消息中包含路径失败，并且现有的 `removed` 和 `failed` 详细信息附加到错误响应。离线删除通过 `--json` 报告这些路径结果。
- Gateway 删除会持久关闭新会话、轮次和自动化，然后中止并等待活动轮次和后台 memory/session 工作在退出存储之前解决。在共享会话存储中，删除仅取消已删除代理的工作；幸存的特工仍被接纳。已接受的存储工作在退休前解决。一旦开始耗尽，后期会话写入就会被拒绝，而不会中断清理。网关在重新启动后恢复中断的删除，包括旧版本的日志。
- 当删除清理挂起时，即使耗尽或重新启动恢复失败，新会话写入仍会被拒绝。解决报告的故障并重试删除。在清理完成之前，工作区、代理目录和会话存储重定位也会被拒绝；保持存储目标不变的更新仍然可用。
- Gateway 删除使活动运行有 15 秒的时间耗尽。如果取消后运行未停止，则删除会报告其会话 ID 并保留代理的配置和存储。等待指定的运行结束，然后重试删除。
- Deletion 会关闭代理的每个终端，包括分离的终端和在没有聊天会话的情况下打开的终端，并等待其进程退出，然后再退出存储。幸存代理的终端仍然可用。
- 独立的后台命令在其代理被删除时也会被取消和耗尽。空闲的 MCP 运行时在存储之前退出，而活动的 MCP 视图则保持删除挂起状态；关闭这些视图并重试。跟踪的浏览器选项卡使用与会话删除相同的尽力清理。
- 在升级期间，Doctor 会在删除所有权下备份并准备可恢复的待删除旧数据库架构。然后，在应用记录的文件删除选择之前，网关恢复会完成正常的会话清理，包括本机绑定和相关状态。
- 如果会话存储清理失败，将从配置中删除代理，但保留其文件和挂起的清理。解决报告的存储错误，然后重试相同的删除命令。配置发布成功后，网关删除返回 `UNAVAILABLE`，在 `failed` 中命名失败的清理步骤和数据库路径，并将 `purgeFailed: true` 附加到其错误响应中；离线 `--json` 报告相同的标志，直到清除成功。
- 在尚未迁移共享身份验证的安装上，无法删除旧所有者。运行`openclaw doctor --fix`；重定位到共享状态 SQLite 后，`main` 遵循与任何其他代理相同的删除规则。
- 拥有会话数据库但仍被另一个配置的代理使用的代理无法删除，即使保留文件也是如此。保持该所有者的配置；将共享历史记录移动到另一个所有者需要支持的迁移，但目前不可用。
- 当网关可访问时，删除会通过网关进行路由，因此配置和会话存储清理与运行时流量共享相同的编写器。如果在连接之前无法到达配置的本地网关，CLI 将回退到脱机本地路径并以事务方式删除代理的计划作业。如果在 CLI 测试可达性之前本地网关凭据不可用，则删除仍会在本地回退，但会警告跳过 cron 清理，因为实时调度程序可能拥有该存储。
- Deletion 会删除代理的绑定，但不会删除其路由的通道帐户，并且仅删除针对已删除代理的绑定。与另一个代理的幸存帐户范围或通道范围绑定将保留整个帐户路由；幸存的对等点绑定仅涵盖来自该对等点的消息，因此来自帐户上其他对等点的消息仍然可以保持无主状态。如果删除留下了单个配置的代理，则路由将回退到该唯一代理。当没有后备所有者解析时，未调度的未绑定流量不会被分派；配置的 `agents.defaults.systemAgent.agentId`、保留的旧所有者或调用者提供的所有者仍然可以捕获它。保留入站消息以进行重试的通道（例如 Telegram）可能会在重新绑定后传递仍在排队的消息；请参阅 [ 路由重试限制 ](/concepts/multi-agent#routing-rules)。要同时停用代理的机器人，请在删除代理之前删除其通道帐户，命名幸存的代理，以便通道插件发现拥有工作区所有者：`openclaw channels remove --agent <surviving-agent-id> --channel <channel> --account <id> --delete`。如果没有 `--agent`，没有后备所有者的多代理配置将失败并显示 `AgentSelectionRequiredError`。如果另一个代理的绑定仍然使用该帐户，请跳过帐户删除。
- 如果另一个 agent 的工作区与此工作区是同一路径、位于此工作区内，或包含此工作区，则会保留该工作区，并且 `--json` 会报告 `workspaceRetained`、`workspaceRetainedReason` 和 `workspaceSharedWith`。
- Cleanup 还保留包含另一个代理的注册数据库的目录，因此删除父目录不能丢弃幸存者的历史记录。
- Cleanup 使用其文件系统含义解析符号链接目标，包括 `..` 段，因此悬空工作区链接无法选择不相关的相邻目录。

自动本地回退永远不会应用于远程网关或 `OPENCLAW_GATEWAY_URL` 覆盖，包括环回 SSH 隧道。连接或凭据失败会出现错误并退出，并保留本地配置、工作区和会话状态。恢复网关连接和凭据，或在网关主机上运行命令。

## <a id="routing-bindings"></a> 路由绑定

使用路由绑定将入站频道流量固定到特定的 agent。

如果您还希望每个座席有不同的可见技能，请在 `openclaw.json` 中配置 `agents.defaults.skills` 和 `agents.entries.*.skills`。参见[技能配置](/tools/skills-config)和[配置参考](/gateway/config-agents/workspace-and-bootstrap#agents-defaults-skills)。

列出绑定：

```bash
openclaw agents bindings
openclaw agents bindings --agent work
openclaw agents bindings --json
```

添加绑定：

```bash
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

你也可以在创建 agent 时添加绑定：

```bash
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:* --bind discord:*
```

如果你省略 `accountId`（`--bind <channel>`），OpenClaw 会从插件设置钩子、强制账户绑定或该频道配置的账户数量中解析它。

如果对于 `bind` 或 `unbind` 省略 `--agent`，则 OpenClaw 将以当前默认代理为目标。

### <a id="--bind-format"></a><a id="bind-format"></a> `--bind` 格式

| 格式                       | 含义                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `--bind <channel>:*`         | 匹配该频道上的所有账户。                                                                 |
| `--bind <channel>:<account>` | 匹配一个账户。                                                                                 |
| `--bind <channel>`           | 仅匹配默认账户，除非 CLI 能安全解析出特定于插件的账户作用域。 |

### <a id="binding-scope-behavior"></a> 绑定作用域行为

- 没有 `accountId` 的 A 存储绑定仅与文字 `default` 帐户密钥匹配。
- `accountId: "*"` 是频道级回退（所有账户），其具体性低于显式账户绑定。
- 绑定冲突、重复检测、移除比较规范化账户ID，就像消息路由一样；帐户 ID 大小写不会创建单独的路由。
- 如果同一个 agent 已经有一个不带 `accountId` 的匹配频道绑定，而你随后使用显式或已解析的 `accountId` 进行绑定，OpenClaw 会就地升级现有绑定，而不是添加重复项。

示例：

```bash
# match all accounts on the channel
openclaw agents bind --agent work --bind telegram:*

# match a specific account
openclaw agents bind --agent work --bind telegram:ops

# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:alerts
```

升级后，该绑定的路由将限定为 `telegram:alerts`。如果你还想要默认账户路由，请显式添加它（例如 `--bind telegram:default`）。

移除绑定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

## <a id="identity-files"></a> 身份文件

每个 agent 工作区都可以在工作区根目录包含一个 `IDENTITY.md`：

- 示例路径：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 从工作区根目录（或显式指定的 `--identity-file`）读取。

头像路径会相对于工作区根目录解析，并且不能逃离该目录，即使通过符号链接也不行。

## <a id="set-identity"></a> 设置身份

`set-identity` 会将字段写入 `agents.entries.*.identity`：`name`、`theme`、`emoji`、`avatar`（工作区相对路径、http(s) URL 或 data URI）。

- `--agent` 或 `--workspace` 用于选择目标代理。如果 `--workspace` 匹配多个代理，命令会失败，并提示你传入 `--agent`。
- `--workspace` 和 `--identity-file` 仅选择代理或身份文件。它们不会更改 `agents.entries.*.workspace`。对于 `--json`，`workspace` 是已解析的身份目录：`--workspace` 定位器、`--identity-file` 的父级或从此处读取身份时代理的工作区。仅当通过没有身份目录的标志提供身份时，它才是 `null`。 `storedWorkspace` 报告代理的持久工作区。
- 使用 `openclaw config set agents.entries.<id>.workspace <dir>` 重新定位现有代理，然后按照 CLI 重新启动提示进行操作，并使用 `openclaw agents list` 进行确认。
- 本地工作空间相关头像图像文件仅限于 2 个 MB。不会根据本地文件大小限制检查 HTTP（S） URL 和 `data:` URI。
- 当未提供显式身份字段时，命令会从 `IDENTITY.md` 读取身份数据。

从 `IDENTITY.md` 加载：

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

显式覆盖字段：

```bash
openclaw agents set-identity --agent main --name "OpenClaw" --emoji "🦞" --avatar avatars/openclaw.png
```

重新定位存储的工作空间：

```bash
openclaw config set agents.entries.work.workspace ~/.openclaw/workspace-work
openclaw agents list
```

配置示例：

```json5
{
  agents: {
    entries: {
      main: {
        identity: {
          name: "OpenClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/openclaw.png",
        },
      },
    },
  },
}
```

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [多代理路由](/concepts/multi-agent)
- [Agent 工作区](/concepts/agent-workspace)
- [技能配置](/tools/skills-config)：技能可见性配置。
