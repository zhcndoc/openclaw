---
summary: "Tlon/Urbit 支持状态、功能和配置"
read_when:
  - 在开发 Tlon/Urbit 频道功能时
title: "Tlon"
---

# Tlon（插件）

Tlon 是基于 Urbit 的去中心化聊天工具。OpenClaw 连接到你的 Urbit 船（ship），可以响应私信和群聊消息。群聊回复默认需要 @ 提及，并且可通过允许列表进一步限制。

状态：通过插件支持。支持私信、群组提及、线程回复、富文本格式和图片上传。不支持表情反应和投票。

## 需要插件

Tlon 作为插件提供，不包含在核心安装包中。

通过 CLI（npm 仓库）安装：

```bash
openclaw plugins install @openclaw/tlon
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/tlon
```

详情请见：[插件指南](/tools/plugin)

## 设置

1. 安装 Tlon 插件。
2. 获取你的船 URL 和登录码。
3. 配置 `channels.tlon`。
4. 重启网关。
5. 给机器人发私信或在群频道中提及它。

最简配置（单账号）：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // 建议设置：你的主船，始终允许
    },
  },
}
```

## 私有/局域网船

默认情况下，OpenClaw 为防范 SSRF 攻击会阻止私有或内部主机名及 IP 范围。如果你的船运行在私有网络（localhost、局域网 IP 或内部主机名），你必须显式开启：

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

适用 URL 如：

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ 仅当你信任本地网络时启用此项。该设置会禁用针对船 URL 请求的 SSRF 保护。

## 群频道

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

私信允许列表（空表示不允许私信，使用 `ownerShip` 通过审批流程）：

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

## 拥有者与审批系统

设置拥有者船，当未授权用户尝试互动时，可收到审批请求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

拥有者船**自动获得所有权限**——私信邀请自动接受，频道消息始终允许。无需将拥有者加入 `dmAllowlist` 或 `defaultAuthorizedShips`。

设置后，拥有者将收到以下私信通知：

- 来自不在允许列表船只的私信请求
- 在未授权频道的提及
- 群组邀请请求

## 自动接受设置

自动接受私信邀请（针对 `dmAllowlist` 中的船）：

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

自动接受群组邀请：

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
    },
  },
}
```

## 发送目标（CLI/定时任务）

与 `openclaw message send` 或定时发送结合使用：

- 私信：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群组：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 内置技能

Tlon 插件包含内置技能（[`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill)），提供 CLI 访问 Tlon 操作：

- **联系人**：获取/更新资料、联系人列表
- **频道**：列出、创建、发送消息、获取历史
- **群组**：列出、创建、管理成员
- **私信**：发送消息、对消息反应
- **反应**：为帖子和私信添加/移除表情反应
- **设置**：通过斜杠命令管理插件权限

安装插件后自动可用该技能。

## 功能支持情况

| 功能             | 状态                               |
| ---------------- | ---------------------------------- |
| 私信             | ✅ 支持                           |
| 群组/频道        | ✅ 支持（默认需提及）              |
| 线程             | ✅ 支持（自动在线程内回复）       |
| 富文本           | ✅ Markdown 转换为 Tlon 格式      |
| 图片             | ✅ 上传至 Tlon 存储               |
| 表情反应         | ✅ 通过 [内置技能](#内置技能)     |
| 投票             | ❌ 尚不支持                       |
| 原生命令         | ✅ 支持（默认仅拥有者）           |

## 故障排除

可依次执行以下步骤检查：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常见问题：

- **私信被忽略**：发送者未在 `dmAllowlist` 中且未配置 `ownerShip` 审批流程。
- **群消息被忽略**：频道未被发现或发送者未授权。
- **连接错误**：确认船 URL 可访问；本地船需启用 `allowPrivateNetwork`。
- **认证错误**：确认登录码有效（登录码会轮换）。

## 配置参考

完整配置见：[配置文档](/gateway/configuration)

提供者选项：

- `channels.tlon.enabled`：启用/禁用频道启动。
- `channels.tlon.ship`：机器人 Urbit 船名（如 `~sampel-palnet`）。
- `channels.tlon.url`：船 URL（如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：船登录码。
- `channels.tlon.allowPrivateNetwork`：允许 localhost/LAN 地址（绕过 SSRF）。
- `channels.tlon.ownerShip`：审批系统拥有者船（始终授权）。
- `channels.tlon.dmAllowlist`：允许私信的船（空表示无）。
- `channels.tlon.autoAcceptDmInvites`：自动接受允许列表船的私信邀请。
- `channels.tlon.autoAcceptGroupInvites`：自动接受所有群组邀请。
- `channels.tlon.autoDiscoverChannels`：自动发现群组频道（默认：true）。
- `channels.tlon.groupChannels`：手动固定的频道列表。
- `channels.tlon.defaultAuthorizedShips`：默认授权所有频道的船。
- `channels.tlon.authorization.channelRules`：按频道的授权规则。
- `channels.tlon.showModelSignature`：消息末尾附加模型名称。

## 备注

- 群组回复需提及（如 `~your-bot-ship`）才能响应。
- 线程回复：若收到的消息在某线程内，OpenClaw 会在线程内回复。
- 富文本：Markdown 格式（粗体、斜体、代码、高级标题、列表）会转换成 Tlon 原生格式。
- 图片：图片 URL 会上传至 Tlon 存储，并作为图片块嵌入。
