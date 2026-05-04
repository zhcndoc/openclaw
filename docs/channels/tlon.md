---
summary: "Tlon/Urbit 支持状态、功能与配置"
read_when:
  - 正在处理 Tlon/Urbit 渠道功能
title: "Tlon"
---

Tlon 是一个构建在 Urbit 之上的去中心化消息工具。OpenClaw 会连接到你的 Urbit 船，并且可以
响应私信和群聊消息。群组回复默认需要使用 @ 提及，并且还可以通过允许列表进一步限制。

状态：捆绑插件。支持私信、群组提及、线程回复、富文本格式以及
图片上传。目前尚不支持反应和投票。

## 捆绑插件

Tlon 作为捆绑插件随当前 OpenClaw 发布版一起提供，因此常规的
打包构建无需单独安装。

如果你使用的是较旧版本，或者是一个排除了 Tlon 的自定义安装，请安装
当前的 npm 包：

通过 CLI 安装（npm registry）：

```bash
openclaw plugins install @openclaw/tlon
```

使用裸包可跟随当前官方发布标签。只有在你需要可复现安装时，才固定到
精确版本。

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

详情：[插件](/tools/plugin)

## 设置

1. 确保 Tlon 插件可用。
   - 当前打包的 OpenClaw 发布版已经包含它。
   - 较旧/自定义安装可以使用上面的命令手动添加。
2. 收集你的船 URL 和登录代码。
3. 配置 `channels.tlon`。
4. 重启网关。
5. 向机器人发送私信或在群组频道中提及它。

最小配置（单账户）：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // 推荐：你的船，始终允许
    },
  },
}
```

## 私有/LAN 船

默认情况下，OpenClaw 会阻止私有/内部主机名和 IP 段，以防止 SSRF 攻击。
如果你的船运行在私有网络上（localhost、LAN IP 或内部主机名），
你必须显式启用：

```json5
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      allowPrivateNetwork: true,
    },
  },
}
```

这适用于如下 URL：

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ 仅在你信任本地网络时才启用此选项。此设置会禁用针对
向你的船 URL 发起请求时的 SSRF 防护。

## 群组频道

默认启用自动发现。你也可以手动固定频道：

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}
```

禁用自动发现：

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false,
    },
  },
}
```

## 访问控制

DM 允许列表（为空 = 不允许任何 DM，使用 `ownerShip` 进行审批流程）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群组授权（默认受限）：

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

## 所有者与审批系统

设置一个所有者船，以便在未授权用户尝试交互时接收审批请求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

所有者船会在**所有地方自动获得授权**——DM 邀请会自动接受，并且
频道消息始终被允许。你无需将所有者添加到 `dmAllowlist` 或
`defaultAuthorizedShips`。

设置后，所有者会收到以下 DM 通知：

- 来自不在允许列表中的船的 DM 请求
- 未经授权频道中的提及
- 群组邀请请求

## 自动接受设置

自动接受 DM 邀请（针对在 dmAllowlist 中的船）：

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

自动接受来自受信任船只的群组邀请：

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

当 `groupInviteAllowlist` 为空时，`autoAcceptGroupInvites` 会默认失败关闭。请将
允许列表设置为那些其群组邀请应被自动接受的船只。

## 投递目标（CLI/cron）

在 `openclaw message send` 或 cron 投递中使用这些格式：

- DM: `~sampel-palnet` 或 `dm/~sampel-palnet`
- Group: `chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 捆绑技能

Tlon 插件包含一个捆绑技能（[`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill)）
，它提供对 Tlon 操作的 CLI 访问：

- **Contacts**: 获取/更新个人资料，列出联系人
- **Channels**: 列出、创建、发布消息、获取历史记录
- **Groups**: 列出、创建、管理成员
- **DMs**: 发送消息，对消息作出反应
- **Reactions**: 为帖子和 DM 添加/移除表情反应
- **Settings**: 通过斜杠命令管理插件权限

安装插件后，该技能会自动可用。

## 功能

| Feature         | Status                                  |
| --------------- | --------------------------------------- |
| Direct messages | ✅ Supported                            |
| Groups/channels | ✅ Supported (mention-gated by default) |
| Threads         | ✅ Supported (auto-replies in thread)   |
| Rich text       | ✅ Markdown converted to Tlon format    |
| Images          | ✅ Uploaded to Tlon storage             |
| Reactions       | ✅ Via [bundled skill](#bundled-skill)  |
| Polls           | ❌ 尚不支持                             |
| Native commands | ✅ Supported (owner-only by default)    |

## 故障排除

先运行以下命令链：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常见失败：

- **DM 被忽略**：发送者不在 `dmAllowlist` 中，并且没有配置 `ownerShip` 用于审批流程。
- **群组消息被忽略**：频道未被发现，或发送者未获授权。
- **连接错误**：检查船 URL 是否可访问；为本地船启用 `allowPrivateNetwork`。
- **认证错误**：验证登录代码是否为最新（代码会轮换）。

## 配置参考

完整配置：[配置](/gateway/configuration)

提供者选项：

- `channels.tlon.enabled`: 启用/禁用频道启动。
- `channels.tlon.ship`: 机器人对应的 Urbit 船名称（例如 `~sampel-palnet`）。
- `channels.tlon.url`: 船 URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`: 船登录代码。
- `channels.tlon.allowPrivateNetwork`: 允许 localhost/LAN URL（绕过 SSRF）。
- `channels.tlon.ownerShip`: 所有者船，用于审批系统（始终已授权）。
- `channels.tlon.dmAllowlist`: 允许发送 DM 的船只（为空 = 无）。
- `channels.tlon.autoAcceptDmInvites`: 自动接受来自允许列表中船只的 DM。
- `channels.tlon.autoAcceptGroupInvites`: 自动接受来自允许列表中船只的群组邀请。
- `channels.tlon.groupInviteAllowlist`: 其群组邀请可被自动接受的船只。
- `channels.tlon.autoDiscoverChannels`: 自动发现群组频道（默认：true）。
- `channels.tlon.groupChannels`: 手动固定的频道嵌套。
- `channels.tlon.defaultAuthorizedShips`: 对所有频道均已授权的船只。
- `channels.tlon.authorization.channelRules`: 每个频道的授权规则。
- `channels.tlon.showModelSignature`: 将模型名称追加到消息中。

## 说明

- 群组回复需要提及（例如 `~your-bot-ship`）才能响应。
- 线程回复：如果传入消息位于某个线程中，OpenClaw 会在该线程内回复。
- 富文本：Markdown 格式（粗体、斜体、代码、标题、列表）会转换为 Tlon 的原生格式。
- 图片：URL 会上传到 Tlon 存储并作为图片块嵌入。

## 相关内容

- [渠道概览](/channels) — 所有受支持的渠道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全](/gateway/security) — 访问模型与加固
