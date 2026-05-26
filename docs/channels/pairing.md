---
summary: "配对概览：批准谁可以给你发私信 + 哪些节点可以加入"
read_when:
  - 设置 DM 访问控制
  - 配对新的 iOS/Android 节点
  - 审查 OpenClaw 安全态势
title: "配对"
---

"配对" 是 OpenClaw 的显式访问批准步骤。
它用于两个地方：

1. **DM 配对**（允许谁可以与机器人交谈）
2. **节点配对**（允许哪些设备/节点加入网关网络）

安全上下文：[安全](/gateway/security)

## 1) DM 配对（入站聊天访问）

当某个频道配置了 DM 策略 `pairing` 时，未知发送者会收到一个短码，在你批准之前，他们的消息**不会被处理**。

默认 DM 策略记录在：[安全](/gateway/security)

`dmPolicy: "open"` 仅在生效的 DM 白名单包含 `"*"` 时才是公开开放的。
对于公开开放配置，设置和验证都需要该通配符。如果现有
状态中包含带具体 `allowFrom` 条目的 `open`，运行时仍然只接纳
这些发送者，而配对存储中的批准不会扩大 `open` 访问范围。

配对码：

- 8 个字符，全部大写，不含歧义字符（`0O1I`）。
- **1 小时后过期**。机器人只会在创建新的请求时发送配对消息（大约每个发送者每小时一次）。
- 待处理的 DM 配对请求默认上限为**每个频道 3 个**；在某个请求过期或被批准之前，额外请求会被忽略。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

如果尚未配置命令拥有者，批准 DM 配对码时也会引导初始化
`commands.ownerAllowFrom`，将其设置为被批准的发送者，例如 `telegram:123456789`。
这会为首次设置提供一个显式的拥有者，用于特权命令和执行
审批提示。在拥有者存在之后，后续的配对批准只会授予 DM
访问权限；不会再添加更多拥有者。

Supported channels: `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### 可复用的发送者组

当相同的受信任发送者集合应适用于多个消息频道，或同时适用于 DM 和群组允许列表时，请使用顶层 `accessGroups`。

静态组使用 `type: "message.senders"`，并通过频道允许列表中的
`accessGroup:<name>` 引用：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
  channels: {
    telegram: { dmPolicy: "allowlist", allowFrom: ["accessGroup:operators"] },
    whatsapp: { groupPolicy: "allowlist", groupAllowFrom: ["accessGroup:operators"] },
  },
}
```

访问组的详细文档在这里：[访问组](/channels/access-groups)

### 状态存储位置

存储在 `~/.openclaw/credentials/` 下：

- 待处理请求：`<channel>-pairing.json`
- 已批准白名单存储：
  - 默认账号：`<channel>-allowFrom.json`
  - 非默认账号：`<channel>-<accountId>-allowFrom.json`

账号范围行为：

- 非默认账号只读写其作用域内的白名单文件。
- 默认账号使用按频道划分的未加作用域白名单文件。

请将这些文件视为敏感信息（它们控制对你的助手的访问）。

<Note>
配对白名单存储用于 DM 访问。群组授权是分开的。
批准 DM 配对码不会自动允许该发送者在群组中运行命令
或控制机器人。首次拥有者引导是 `commands.ownerAllowFrom` 中的独立配置
状态，而群聊投递仍遵循频道的群组白名单（例如 `groupAllowFrom`、`groups`，
或按频道不同的每群组/每主题覆盖项）。
</Note>

## 2) 节点设备配对（iOS/Android/macOS/无头节点）

节点以 `role: node` 的**设备**身份连接到 Gateway。Gateway
会创建一个必须被批准的设备配对请求。

### 通过 Telegram 配对（推荐用于 iOS）

如果你使用 `device-pair` 插件，你可以完全通过 Telegram 完成首次设备配对：

1. 在 Telegram 中给你的机器人发送：`/pair`
2. 机器人会回复两条消息：一条说明消息和一条单独的**设置码**消息（在 Telegram 中很容易复制/粘贴）。
3. 在手机上，打开 OpenClaw iOS 应用 → Settings → Gateway。
4. 扫描二维码或粘贴设置码并连接。
5. 回到 Telegram：`/pair pending`（查看请求 ID、角色和作用域），然后批准。

设置码是一个 base64 编码的 JSON 负载，其中包含：

- `url`：Gateway WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：用于初始配对握手的短期单设备引导令牌

该引导令牌携带内置的配对引导配置：

- 内置设置配置仅允许全新的二维码/设置码基础场景：
  `node` 加上有范围限制的 `operator` 交接
- 交接后的 `node` 令牌保持 `scopes: []`
- 交接后的 `operator` 令牌仅限于 `operator.approvals`、
  `operator.read` 和 `operator.write`
- 二维码/设置码引导不会授予 `operator.admin` 和 `operator.pairing`；
  它们需要单独批准的 operator 配对或令牌流程
- 之后的令牌轮换/撤销仍受设备已批准
  角色契约和调用方会话的 operator 范围双重限制

在设置码有效期间，请将其视为密码。

对于 Tailscale、公网或其他远程移动端配对，请使用 Tailscale Serve/Funnel
或其他 `wss://` Gateway URL。明文 `ws://` 设置码仅接受
环回、本地 LAN 地址、`.local` Bonjour 主机，以及 Android
模拟器主机。Tailnet CGNAT 地址、`.ts.net` 名称和公网主机仍会在
二维码/设置码发放之前失败并关闭。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

当由于批准配对设备会话是以仅配对范围打开的而导致显式批准被拒绝时，CLI 会使用
`operator.admin` 重新尝试同一请求。这使得已有管理能力的配对设备能够恢复新的
Control UI/浏览器配对，而无需手动编辑 `devices/paired.json`。Gateway
仍会验证重试连接；无法使用 `operator.admin` 进行身份验证的令牌仍会被阻止。

如果同一设备使用不同的认证详情重试（例如不同的
角色/范围/公钥），先前的待处理请求会被取代，并创建一个新的
`requestId`。

<Note>
已配对的设备不会在不提示的情况下获得更宽的访问权限。如果它重新连接并请求更多范围或更宽的角色，OpenClaw 会保持现有批准不变，并创建一个新的待升级请求。在批准之前，请使用 `openclaw devices list` 比较当前已批准的访问权限与新请求的访问权限。
</Note>

### 可选的受信任 CIDR 节点自动批准

设备配对默认仍需人工处理。对于严格受控的节点网络，
你可以通过显式 CIDR 或精确 IP 启用首次节点自动批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

这仅适用于没有请求
范围的全新 `role: node` 配对请求。Operator、浏览器、Control UI 和 WebChat 客户端仍然需要人工
批准。角色、范围、元数据和公钥的更改仍然需要人工
批准。

### 节点配对状态存储

存储在 `~/.openclaw/devices/` 下：

- `pending.json`（短期；待处理请求会过期）
- `paired.json`（已配对设备 + 令牌）

### 说明

- 旧版 `node.pair.*` API（CLI：`openclaw nodes pending|approve|reject|remove|rename`）是一个
  独立的、由 gateway 拥有的配对存储。WS 节点仍然需要设备配对。
- 配对记录是已批准角色的持久事实来源。活动
  设备令牌始终受限于该已批准角色集合；超出已批准角色的孤立令牌条目
  不会创建新的访问权限。

## 相关文档

- 安全模型 + 提示注入：[安全](/gateway/security)
- 安全更新（运行 doctor）：[更新](/install/updating)
- 频道配置：
  - Telegram: [Telegram](/channels/telegram)
  - WhatsApp: [WhatsApp](/channels/whatsapp)
  - Signal: [Signal](/channels/signal)
  - iMessage: [iMessage](/channels/imessage)
  - Discord: [Discord](/channels/discord)
  - Slack: [Slack](/channels/slack)
