---
summary: "配对概述：批准谁可以私信你 + 哪些节点可以加入"
read_when:
  - 设置私信访问控制
  - 配对新的 iOS/Android 节点
  - 审查 OpenClaw 安全态势
title: "配对"
---

# 配对

"配对"是 OpenClaw 的**所有者显式批准**步骤。
它用于两个场景：

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

支持的频道：`bluebubbles`、`discord`、`feishu`、`googlechat`、`imessage`、`irc`、`line`、`matrix`、`mattermost`、`msteams`、`nextcloud-talk`、`nostr`、`signal`、`slack`、`synology-chat`、`telegram`、`twitch`、`whatsapp`、`zalo`、`zalouser`。

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

## 2) 节点设备配对（iOS/Android/macOS/无头节点）

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

设置代码有效期内请像对待密码一样保护。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

如果同一设备使用不同的认证详情重试（例如不同的角色/作用域/公钥），之前的待处理请求将被取代并创建新的 `requestId`。

### 节点配对状态存储

存储路径为 `~/.openclaw/devices/`：

- `pending.json`（短期，待处理请求会过期）
- `paired.json`（已配对设备 + 令牌）

### 注意事项

- 旧版 `node.pair.*` API（CLI：`openclaw nodes pending/approve`）是网关拥有的独立配对存储。
- WebSocket 节点仍需要设备配对。

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
