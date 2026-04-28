---
summary: "配对概述：批准谁可以私信你 + 哪些节点可以加入"
read_when:
  - 设置私信访问控制
  - 配对新的 iOS/Android 节点
  - 审查 OpenClaw 安全态势
title: "配对"
---

“Pairing” 是 OpenClaw 的显式 **所有者批准** 步骤。
它用于两个地方：

1. **私信配对**（谁被允许与机器人聊天）
2. **节点配对**（哪些设备/节点被允许加入网关网络）

安全上下文见：[安全](/gateway/security)

## 1) 私信配对（入站聊天访问）

当频道配置了私信策略 `pairing` 时，未知发送者会获得一个短代码，且其消息**不会被处理**，直到你批准。

默认的私信策略见文档：[安全](/gateway/security)

配对代码：

- 8 个字符，大写，不含易混淆字符（`0O1I`）。
- **1 小时后过期**。机器人只有在创建新请求时才会发送配对消息（大约每个发送者每小时一次）。
- 待处理私信配对请求默认限制为**每频道 3 个**；超过后将被忽略，直到有请求过期或被批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <code>
```

支持的频道：`bluebubbles`, `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### 状态存储位置

存储路径为 `~/.openclaw/credentials/`：

- 待处理请求：`<channel>-pairing.json`
- 已批准的允许列表存储：
  - 默认账户：`<channel>-allowFrom.json`
  - 非默认账户：`<channel>-<accountId>-allowFrom.json`

账户作用域行为：

- 非默认账户只读写其作用域内的允许列表文件。
- 默认账户使用频道作用域的非作用域允许列表文件。

请将这些视为敏感信息（它们控制对助理的访问权限）。

<Note>
这是用于私信访问的存储。群组授权是分开的。批准一个私信配对代码不会自动允许该发送者在群组中运行群组命令或控制机器人。对于群组访问，请配置频道的显式群组允许列表（例如 `groupAllowFrom`、`groups`，或者根据频道不同使用按群组或按主题的覆盖配置）。
</Note>

## 2) 节点设备配对 (iOS/Android/macOS/无头节点)

节点作为 `role: node` 的**设备**连接到网关。网关创建设备配对请求，必须经过批准。

### 通过 Telegram 配对（iOS 推荐）

如果你使用 `device-pair` 插件，可以完全通过 Telegram 进行首次设备配对：

1. 在 Telegram 中，向你的机器人发送消息：`/pair`
2. 机器人回复两条消息：一条指令消息和一条单独的**设置代码**消息（在 Telegram 中便于复制/粘贴）。
3. 在你的手机上，打开 OpenClaw iOS 应用 → 设置 → 网关。
4. 粘贴设置代码并连接。
5. 回到 Telegram：`/pair pending`（查看请求 ID、角色和作用域），然后批准。

设置代码是一个 base64 编码的 JSON，有：

- `url`：网关 WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：用于初始配对握手的短期单设备引导令牌  

该引导令牌携带内置的配对引导配置文件：

- 主要移交的 `node` 令牌保持 `scopes: []`
- 任何移交的 `operator` 令牌仍受限于引导允许列表：
  `operator.approvals`, `operator.read`, `operator.talk.secrets`, `operator.write`
- 引导作用域检查是角色前缀的，不是一个扁平的作用域池：
  operator 作用域条目仅满足 operator 请求，非 operator 角色
  仍必须在其自己的角色前缀下请求作用域

在设置代码有效期间，请将其视为密码对待。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

如果同一设备使用不同的认证详情重试（例如不同的角色/作用域/公钥），之前的待处理请求将被取代并创建新的 `requestId`。

<Note>
一个已经配对的设备不会在不知不觉中获得更广的访问权限。如果它重新连接并请求更多作用域或更宽泛的角色，OpenClaw 会保留现有批准不变，并创建一个新的待处理升级请求。在批准之前，请使用 `openclaw devices list` 比较当前已批准的访问权限与新请求的访问权限。
</Note>

### 节点配对状态存储

存储路径为 `~/.openclaw/devices/`：

- `pending.json`（短期，待处理请求会过期）
- `paired.json`（已配对设备 + 令牌）

### 注意事项

- 旧版 `node.pair.*` API（CLI：`openclaw nodes pending|approve|reject|remove|rename`）是
  一个独立的、由网关拥有的配对存储。WS 节点仍然需要设备配对。
- 配对记录是已批准角色的持久事实来源。活动
  设备令牌始终受限于该已批准的角色集合；在已批准角色之外的
  一个孤立令牌条目不会创建新的访问权限。

## 相关文档

- 安全模型 + prompt 注入：[安全](/gateway/security)
- 安全更新（运行诊断）：[更新](/install/updating)
- 频道配置：
  - Telegram：[Telegram](/channels/telegram)
  - WhatsApp：[WhatsApp](/channels/whatsapp)
  - Signal：[Signal](/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/channels/bluebubbles)
  - iMessage（旧版）：[iMessage](/channels/imessage)
  - Discord：[Discord](/channels/discord)
  - Slack：[Slack](/channels/slack)
