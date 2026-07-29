---
summary: "Tlon/Urbit 支持状态、功能与配置"
read_when:
  - 正在处理 Tlon/Urbit 渠道功能
title: "Tlon"
---

Tlon 是一个构建于 Urbit 之上的去中心化通讯工具。OpenClaw 连接到你的 Urbit ship，并
响应私信和群聊消息。默认情况下，群组回复需要 @ 提及，此外还叠加了授权规则和所有者审批流程。

状态：捆绑插件。支持私信、群组提及、线程、富文本、图片上传/下载，以及
所有者审批系统。不支持表情反应和投票。

## 捆绑插件

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

详情：[插件](/tools/plugin)

## 设置

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
      ownerShip: "~your-main-ship", // 推荐：你的飞船，始终已授权
    },
  },
}
```

直接编辑配置后请重启网关。然后向机器人发送私信，或在群聊中 @ 它。

## 入站持久性

OpenClaw 在代理分发之前会持久化已接受的 Tlon DM 和群聊事件。待处理或可重试的轮次在 Gateway 重启后仍会保留，并且工作会继续按每个群组频道或直接对等方串行执行。稳定的 Urbit 消息 ID 也会在其队列记录或保留的完成记录存在时抑制重复投递的事件。

在队列到代理的边界上，投递至少发生一次：在移交过程中发生崩溃可能会重放一个轮次。因此，产生外部副作用的代理操作在可行时应保持幂等。

## 私有/LAN ship

OpenClaw 默认会阻止私有/内部主机名和 IP 段，以防止 SSRF 攻击。如果你的
ship 运行在私有网络上（localhost、LAN IP、内部主机名），请显式启用：

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

适用于类似 `http://localhost:8080`、`http://192.168.x.x:8080`，以及
`http://my-ship.local:8080` 的目标。仅对你信任的 ship URL 启用此项；这会为该账户的 HTTP 请求禁用 SSRF
保护。

<Note>
`channels.tlon.allowPrivateNetwork`（扁平键）已弃用。`openclaw doctor --fix` 会自动将其移动到
`channels.tlon.network.dangerouslyAllowPrivateNetwork`。
</Note>

## 群组频道

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

## 访问控制

DM 白名单（为空 = 不允许任何 DM，除非发送者是 `ownerShip`）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群组授权默认按每个频道设为 `restricted`。设置 `defaultAuthorizedShips` 作为
基础配置，并按频道 nest 覆盖：

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

将 `channels.tlon.implicitMentions.threadParticipation` 设置为 `false`，可要求对这些后续消息重新进行显式提及。账户覆盖使用 `channels.tlon.accounts.<id>.implicitMentions`。Tlon 目前不会生成 `replyToBot` 或 `quotedBot` 事实，因此这些标志在这里没有作用。

## 所有者和审批系统

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

当设置了 `ownerShip` 时，未授权的请求不会直接被丢弃——它们会排队等待审批，并向所有者发送 DM：

- 来自不在 `dmAllowlist` 上的船只的 DM 请求
- 频道中发送者未通过授权的提及
- 来自不在 `groupInviteAllowlist` 上的船只的群组邀请（当自动接受关闭时，或虽然开启但邀请者未被列入允许名单时）

所有者在 DM 中回复以处理请求：

| 所有者回复                 | 效果                                                 |
| -------------------------- | ---------------------------------------------------- |
| `approve` / `deny` / `block` | 作用于最近的待审批请求                                 |
| `approve <id>` / `deny <id>` | 作用于指定 id 的审批请求                               |
| `block`                      | 还会在底层阻止该船重新连接                             |
| `unblock ~ship`              | 取消底层阻止                                         |
| `blocked`                    | 列出当前被阻止的船只                                   |
| `pending`                    | 列出待审批请求                                         |

如果未配置 `ownerShip`，未授权的 DM 和频道提及会直接被丢弃并记录日志；不会出现审批提示。

## 自动接受设置

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

从允许列表中自动接受群组邀请（失败关闭：当 `autoAcceptGroupInvites: true` 且
`groupInviteAllowlist` 为空时，不会接受任何非所有者邀请）：

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

## 通过 Urbit 设置存储实现热重载

上面的多数设置（`dmAllowlist`、`groupInviteAllowlist`、`groupChannels`、
`defaultAuthorizedShips`、`autoDiscoverChannels`、`autoAcceptDmInvites`、
`autoAcceptGroupInvites`、`ownerShip`、`showModelSignature`）会在首次运行时镜像到飞船的
`%settings` agent（desk `moltbot`，bucket `tlon`）中，之后从那里实时读取，
因此通过 Landscape 客户端或捆绑 skill 的设置命令所做的更改无需重启网关即可生效。`channelRules` 和待批准项也会以 JSON 形式持久化在那里。对于从未写入设置存储的值，文件配置仍然是唯一的真实来源。

## 投递目标（CLI/cron）

Use with `openclaw message send` or cron delivery:

- DM: `~sampel-palnet` 或 `dm/~sampel-palnet`
- Group: `chat/~host-ship/channel` 或 `group:~host-ship/channel`

## Bundled Skills

This plugin bundles [`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill), which is a CLI for directly performing Urbit operations and can be used automatically after the plugin is installed:

- **Activity**: mentions, replies, unread
- **Channels**: list, create, rename
- **Contacts**: list/get/update profile
- **Groups**: create, join, invite/request flow, roles
- **Hooks**: manage channel hooks
- **Messages**: history, search
- **Direct Messages**: send, react, accept/reject
- **Posts**: react, delete
- **Notebook**: publish to journal channels
- **Settings**: hot-reload plugin configuration via the settings above

## 功能

| Feature         | Status                                        |
| --------------- | --------------------------------------------- |
| 直接消息        | 支持                                         |
| 群组/频道       | 支持（默认通过提及触发）                      |
| 线程           | 支持（加入后会持续回复）                       |
| 富文本          | Markdown 转换为 Tlon 的原生格式               |
| 图片            | 入站时下载，出站时上传                        |
| 反应            | 仅可通过 [捆绑技能](#bundled-skill)      |
| 投票            | 不支持                                       |
| 原生命令      | 默认仅限所有者                               |

## 故障排除

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常见失败：

- **忽略私信**：发送者不在 `dmAllowlist` 中，并且批准流程未配置 `ownerShip`。
- **忽略群组消息**：频道未被发现/固定，或者发送者授权失败且没有 `ownerShip` 可用于排队审批。
- **连接错误**：检查 ship URL 是否可访问；对于本地 ship，设置 `network.dangerouslyAllowPrivateNetwork`。
- **认证错误**：登录代码会轮换——请从你的 ship 中复制当前代码。

## 配置参考

完整配置：[配置](/gateway/configuration)

| Key                                                    | 含义                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `channels.tlon.enabled`                                | 启用/禁用频道启动。                                |
| `channels.tlon.ship`                                   | 机器人的 Urbit 船名（例如 `~sampel-palnet`）。                 |
| `channels.tlon.url`                                    | 船只 URL（例如 `https://sampel-palnet.tlon.network`）。          |
| `channels.tlon.code`                                   | 船只登录代码。                                               |
| `channels.tlon.network.dangerouslyAllowPrivateNetwork` | 允许 localhost/LAN 船只 URL（SSRF 可选）。                   |
| `channels.tlon.ownerShip`                              | 所有者船只：始终被授权，接收审批请求。     |
| `channels.tlon.dmAllowlist`                            | 允许发送私信的船只（为空 = 除所有者外无其他）。              |
| `channels.tlon.autoAcceptDmInvites`                    | 自动接受来自 `dmAllowlist` 中船只的私信。                   |
| `channels.tlon.autoAcceptGroupInvites`                 | 自动接受来自 `groupInviteAllowlist` 的群组邀请。         |
| `channels.tlon.groupInviteAllowlist`                   | 其群组邀请会被自动接受的船只。                   |
| `channels.tlon.autoDiscoverChannels`                   | 自动发现已加入的群组频道（默认值：`false`）。        |
| `channels.tlon.implicitMentions.threadParticipation`   | 允许参与过的线程后续消息绕过提及门控。      |
| `channels.tlon.groupChannels`                          | 手动固定的频道嵌套。                                 |
| `channels.tlon.defaultAuthorizedShips`                 | 所有频道都被授权的船只（在没有规则匹配时使用）。 |
| `channels.tlon.authorization.channelRules`             | 按频道嵌套划分的授权模式 + 允许列表。                        |
| `channels.tlon.showModelSignature`                     | 在回复后附加 `_[由 <model> 生成]_`。                  |
| `channels.tlon.responsePrefix`                         | 追加到外发回复前的静态前缀。                   |
| `channels.tlon.accounts.<id>`                          | 额外的命名账户（多船只设置）。                 |

## 说明

- 群组回复需要带有 @ 提及（例如 `~your-bot-ship`），除非机器人已经加入该线程。
- 线程回复会直接发送到线程中；机器人还会接收到该线程上下文的最后 10 条消息，作为 agent 的前置内容。
- 富文本（粗体、斜体、代码、标题、列表）会转换为 Tlon 的原生格式。
- 发送一条请求频道摘要的入站消息（例如“总结这个频道”）会触发内置的历史摘要功能，而不是正常的回复流程。

## 相关内容

- [渠道概览](/channels) — 所有受支持的渠道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全](/gateway/security) — 访问模型与加固
