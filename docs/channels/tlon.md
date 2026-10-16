---
summary: "Tlon/Urbit 支持状态、功能与配置"
read_when:
  - "正在处理 Tlon/Urbit 渠道功能"
title: "特隆"
---

Tlon 是一个构建于 Urbit 之上的去中心化通讯工具。OpenClaw 连接到你的 Urbit ship，并响应私信和群聊消息。默认情况下，群组回复需要 @ 提及，此外还叠加了授权规则和所有者审批流程。

状态：捆绑插件。支持 DM、群组提及、话题、富文本、图像 upload/download 和所有者批准系统。反应和民意调查则不然。

## <a id="bundled-plugin"></a> 捆绑插件

Tlon 已捆绑在当前的 OpenClaw 发布版中；打包构建不需要单独安装。

在较旧的构建或不包含它的自定义安装中，请从 npm 安装：

```bash
openclaw plugins install @openclaw/tlon
```

使用不带版本的包名以跟踪当前发布标签。仅在需要可复现安装时才固定版本（`@openclaw/tlon@x.y.z`）。

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

详细信息：[插件](/tools/plugin)

## <a id="setup"></a> 设置

```bash
openclaw channels add --channel tlon --ship ~sampel-palnet --url https://your-ship-host --code lidlut-tabwed-pillex-ridrup
```

或者直接编辑配置：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // recommended: your ship, always authorized
    },
  },
}
```

登录代码是您的船舶的网络登录代码：在船舶的道场中运行 `+code` 打印当前的登录代码。它会轮换，因此每当身份验证开始失败时，请重新读取它。

发货 URL 支持括号中的 IPv6 文字，例如 `http://[::1]:8080`。环回和私有 IPv6 地址需要以下私有网络选择加入。

配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。检查`openclaw channels status --probe`，如果网关离线则启动网关。然后 DM 机器人或在群组频道中@提及它。

## <a id="inbound-durability"></a> 入站持久性

OpenClaw 在代理调度之前保留已接受的 Tlon DM 和群聊事件。待定或可重试的轮次在网关重新启动后仍然存在，并且每个组通道或直接对等点的工作仍保持序列化。当队列记录或保留的完成记录存在时，稳定的 Urbit 消息 ID 还会抑制重新传递事件。

交付至少一次跨越队列到代理边界：切换期间的崩溃可能会重播一个回合。因此，产生外部副作用的代理操作应在可行的情况下避免在重试时重复这些影响。

## <a id="private%2Flan-ships"></a><a id="private/lan-ships"></a> Private/LAN 船舶

默认情况下，OpenClaw 会阻止 private/internal 主机名和 IP 范围以进行 SSRF 保护。如果您的飞船在专用网络上运行（本地主机、LAN IP、内部主机名），请明确选择加入：

```json5
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      network: {
        dangerouslyAllowPrivateNetwork: true,
      },
    },
  },
}
```

适用于类似 `http://localhost:8080`、`http://192.168.x.x:8080`，以及 `http://my-ship.local:8080` 的目标。仅对你信任的 ship URL 启用此项；这会为该账户的 HTTP 请求禁用 SSRF 保护。

<Note>
`channels.tlon.allowPrivateNetwork`（扁平键）已弃用。`openclaw doctor --fix` 会自动将其移动到 `channels.tlon.network.dangerouslyAllowPrivateNetwork`。
</Note>

## <a id="group-channels"></a> 群组频道

手动固定频道，或开启自动发现：

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
      autoDiscoverChannels: true,
    },
  },
}
```

在配置中未设置时，`autoDiscoverChannels` 的默认值为 `false`；安装向导会将该提示默认设为“是”，并明确写入 `true`。开启后，OpenClaw 会在启动时抓取已加入的群组，在接受群组邀请时监视新频道，并每 2 分钟重新检查一次。

## <a id="access-control"></a> 访问控制

DM 白名单（空 = 不允许发送 DM，除非发件人是 `ownerShip`）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群组授权默认按每个频道设为 `restricted`。设置 `defaultAuthorizedShips` 作为基础配置，并按频道 nest 覆盖：

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"],
          },
          "chat/~host-ship/announcements": {
            mode: "open",
          },
        },
      },
    },
  },
}
```

一旦机器人在某个线程中回复过，它就会继续响应该线程后续的消息，而无需再次提及。

设置 `channels.tlon.implicitMentions.threadParticipation: false` 以要求对这些后续内容进行新的明确提及。帐户覆盖使用 `channels.tlon.accounts.<id>.implicitMentions`。 Tlon 目前不生成 `replyToBot` 或 `quotedBot` 事实，因此这些标志在这里不起作用。

设置 `channels.tlon.requireMentionInBotThreads: false` 以在该帐户的船舶创作线程根（包括第一个回复）时接受未提及的回复。将其设置为 `true` 需要在这些线程中重新提及，即使在机器人参与之后也是如此。省略它以保留现有的参与策略。根作者是从经过认证的船舶API中读取的；不可用或外来根会保留正常的提及策略。

指定帐户可以使用 `accounts.<id>.requireMentionInBotThreads` 覆盖它。每个通道的 `authorization.channelRules.<nest>.requireMentionInBotThreads` 会覆盖帐户默认值，包括通过 Urbit 设置存储提供的规则。对于此选项，保存的通道规则仅在设置布尔值时才会覆盖文件值；较旧的仅访问规则继承文件值。发件人授权仍然适用，并且此选项不会更改顶级频道帖子或 DM。

## <a id="owner-and-approval-system"></a> 所有者和审批系统

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

所有者船具有全局授权：DM 邀请始终会自动接受，群组邀请始终会自动接受，频道消息也始终会通过授权。所有者无需出现在 `dmAllowlist`、`defaultAuthorizedShips` 或 `groupInviteAllowlist` 中。

群组 DM 是个例外。 Tlon 不会验证谁编写了组 DM 消息，因此组 DM 消息永远不会携带所有者权限：所有者命令、批准回复和管理命令只能在与机器人的 1：1 DM 中工作。声称作者在 `dmAllowlist` 上的组 DM 消息仍会得到答复，但作为普通的未经验证的发件人。

在此行为之前的版本保存的待处理 DM 请求无法与组 DM 声明分开。批准后仍会将船舶添加到 `dmAllowlist`，但不会重播其存储的消息。批准确认告诉所有者该邮件未得到处理，发件人必须重新发送该邮件。

当设置了 `ownerShip` 时，未授权的请求不会直接被丢弃——它们会排队等待审批，并向所有者发送 DM：

- 来自不在 `dmAllowlist` 上的船只的 DM 请求
- 频道中发送者未通过授权的提及
- 来自不在 `groupInviteAllowlist` 上的船只的群组邀请（当自动接受关闭时，或虽然开启但邀请者未被列入允许名单时）

所有者在 DM 中回复以处理请求：

| 所有者回复                  | 作用                                               |
| ---------------------------- | ---------------------------------------------------- |
| `approve` / `deny` / `block` | 作用于最近的待审批请求             |
| `approve <id>` / `deny <id>` | 作用于指定 id 的审批请求                    |
| `block`                      | 还会在底层阻止该船重新连接 |
| `unblock ~ship`              | 取消底层阻止                              |
| `blocked`                    | 列出当前被阻止的船只                        |
| `pending`                    | 列出待审批请求                      |

如果没有配置 `ownerShip`，未经授权的 DM 和频道提及将被删除并记录；没有批准提示。

监视器最多允许 100 个新的待批准。旧版本的现有批准将被保留，因此所有者回复在升级后继续针对相同的请求。当队列已满时，监视器向所有者发送一份饱和通知，并且在解决待处理项目之前不会接受更多唯一请求。每个满队列剧集最多会重试失败的通知传送 3 次。在容量可用后接受新请求会启动新的事件，因此再次填充队列可以在同一监视器运行中发送另一个通知。被拒绝的请求者必须在有可用容量后重试；待处理的 DM 和群组邀请更新仍然可重试，而不是被确认。

群组邀请更新一次适用于一个群组。撤销、删除或完成的邀请会清除该组的重复抑制，以便可以在当前自动接受和白名单设置下处理以后的邀请。

## <a id="auto-accept-settings"></a> 自动接受设置

自动接受来自已在 `dmAllowlist` 中的飞船的 DM 邀请（无论此标志如何，所有者始终会被自动接受）：

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

自动接受来自白名单的群组邀请（使用 `autoAcceptGroupInvites: true` 和空 `groupInviteAllowlist`，不接受非所有者邀请）：

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
      groupInviteAllowlist: ["~zod"],
    },
  },
}
```

## <a id="hot-reload-via-urbit-settings-store"></a> 通过 Urbit 设置存储实现热重载

上面的多数设置（`dmAllowlist`、`groupInviteAllowlist`、`groupChannels`、 `defaultAuthorizedShips`、`autoDiscoverChannels`、`autoAcceptDmInvites`、 `autoAcceptGroupInvites`、`ownerShip`、`showModelSignature`）会在首次运行时镜像到飞船的 `%settings` agent（desk `moltbot`，bucket `tlon`）中，之后从那里实时读取， 因此通过 Landscape 客户端或捆绑 skill 的设置命令所做的更改无需重启网关即可生效。`channelRules` 和待批准项也会以 JSON 形式持久化在那里。对于从未写入设置存储的值，文件配置仍然是唯一的真实来源。

## <a id="delivery-targets-(cli%2Fcron)"></a><a id="delivery-targets-cli/cron"></a> 投递目标（CLI/cron）

与 `openclaw message send` 或 cron 传递一起使用：

- DM: `~sampel-palnet` 或 `dm/~sampel-palnet`
- Group: `chat/~host-ship/channel` 或 `group:~host-ship/channel`

## <a id="bundled-skill"></a> 捆绑技能

该插件捆绑了 [`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill)，这是一个用于直接 Urbit 操作的 CLI，安装插件后自动可用：

- **Activity**：提及、回复、未读
- **Channels**：列出、创建、重命名
- **联系人**：list/get/update配置文件
- **Groups**：创建、加入、invite/request 流、角色
- **Hooks**：管理通道挂钩
- **消息**：历史记录、搜索
- **DMs**：发送，反应，accept/decline
- **帖子**：反应，删除
- **Notebook**：发布到日记频道
- **Settings**：通过上面的设置存储热重载插件配置

## <a id="capabilities"></a> 功能

`channels.tlon.mediaMaxMb` 限制 MiB 中的每个入站图像下载和出站图像加载。指定帐户可以使用 `accounts.<id>.mediaMaxMb` 覆盖它；否则通道根然后 `agents.defaults.mediaMaxMb` 应用。现有6个MiB上限，适用于图片下载和上传。通过配置上限，失败的大小检查或下载会导致发送失败，而不是嵌入未经检查的 URL。绑定下载成功后上传失败仍可使用原来的URL。如果没有配置上限，即使无法在该上限内下载图像，现有链接回退仍然可用。

| 功能         | 状态                                        |
| --------------- | --------------------------------------------- |
| 直接消息 | 支持                                     |
| Groups/channels | 支持（默认提及）          |
| 线程         | 支持（加入后会持续回复） |
| 富文本       | Markdown 转换为 Tlon 的原生格式    |
| 图片          | 入站时下载，出站时上传         |
| 反应       | 仅可通过 [捆绑技能](#bundled-skill)  |
| 投票           | 不支持                                 |
| 原生命令 | 默认仅限所有者                         |

## <a id="troubleshooting"></a> 故障排查

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常见故障：

- **忽略私信**：发送者不在 `dmAllowlist` 中，并且批准流程未配置 `ownerShip`。
- **忽略组消息**：通道不是discovered/pinned，或者发件人授权失败，没有`ownerShip`排队批准。
- **连接错误**：检查 ship URL 是否可访问；对于本地 ship，设置 `network.dangerouslyAllowPrivateNetwork`。
- **认证错误**：登录代码会轮换——请从你的 ship 中复制当前代码。

## <a id="configuration-reference"></a> 配置参考

完整配置：[配置](/gateway/configuration)

| 键                                                    | 含义                                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `channels.tlon.enabled`                                | Enable/disable 通道启动。                                                                                              |
| `channels.tlon.ship`                                   | Bot 的 Urbit 飞船名称 （e.g. `~sampel-palnet`）。                                                                               |
| `channels.tlon.url`                                    | 发货 URL （e.g. `https://sampel-palnet.tlon.network`）。                                                                        |
| `channels.tlon.code`                                   | 船只登录代码。                                                                                                             |
| `channels.tlon.network.dangerouslyAllowPrivateNetwork` | 允许 localhost/LAN 发送 URL（SSRF 选择加入）。                                                                                 |
| `channels.tlon.ownerShip`                              | 所有者船只：始终被授权，接收审批请求。                                                                   |
| `channels.tlon.dmAllowlist`                            | 允许运送至 DM（空=除所有者外没有任何人）。                                                                            |
| `channels.tlon.autoAcceptDmInvites`                    | 自动接受来自 `dmAllowlist` 中船只的私信。                                                                                 |
| `channels.tlon.autoAcceptGroupInvites`                 | 自动接受来自 `groupInviteAllowlist` 的群组邀请。                                                                       |
| `channels.tlon.groupInviteAllowlist`                   | 其群组邀请会被自动接受的船只。                                                                                 |
| `channels.tlon.autoDiscoverChannels`                   | 自动发现已加入的群组频道（默认值：`false`）。                                                                      |
| `channels.tlon.implicitMentions.threadParticipation`   | 允许参与过的线程后续消息绕过提及门控。                                                                    |
| `channels.tlon.requireMentionInBotThreads`             | 仅在该帐户的船舶创建的根的线程中覆盖提及门控；省略保留现有行为。        |
| `channels.tlon.groupChannels`                          | 手动固定的频道嵌套。                                                                                               |
| `channels.tlon.defaultAuthorizedShips`                 | 所有频道都被授权的船只（在没有规则匹配时使用）。                                                               |
| `channels.tlon.authorization.channelRules`             | 每通道嵌套身份验证模式、白名单和可选的 `requireMentionInBotThreads` 覆盖。                                   |
| `channels.tlon.showModelSignature`                     | 将 `_[Generated by <model>]_` 附加到回复中。                                                                                |
| `channels.tlon.responsePrefix`                         | 自动回复前缀：文字、`"auto"`，或模板，例如`"[{model}]"`； account 覆盖 win，`""` 禁用它。 |
| `channels.tlon.accounts.<id>`                          | 额外的命名账户（多船只设置）。                                                                               |

## <a id="notes"></a> 说明

- Group 回复需要@提及 （e.g. `~your-bot-ship`），除非线程参与或机器人拥有的线程策略允许。
- 线程回复会直接发送到线程中；机器人还会接收到该线程上下文的最后 10 条消息，作为 agent 的前置内容。
- 富文本（粗体、斜体、代码、标题、列表）会转换为 Tlon 的原生格式。
- 发送一条请求频道摘要的入站消息（例如“总结这个频道”）会触发内置的历史摘要功能，而不是正常的回复流程。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) — 所有支持的通道
- [Pairing](/channels/pairing) — DM 声明它的通道的身份验证； Tlon 不是其中之一，而是使用 `dmAllowlist` 加上上面的 `ownerShip` 审批流程
- [Groups](/channels/groups) — 群聊行为和提及门控
- [通道路由](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和强化
