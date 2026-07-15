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

- 8 个字符，大写，不包含易混淆字符（`0O1I`）。
- **1 小时后过期**。机器人仅在创建新请求时发送配对消息（每个发送者大约每小时一次）。
- 待处理的 DM 配对请求上限为**每个频道账号 3 个**；在某个请求过期或被批准之前，额外请求将被忽略。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

在批准命令中添加 `--notify`，会在同一频道通知请求者。多账号频道需要使用 `--account <id>`。

如果尚未配置命令拥有者，批准一个 DM 配对码还会引导
`commands.ownerAllowFrom` 指向被批准的发送者，例如 `telegram:123456789`。
这会为首次设置提供一个明确的拥有者，用于特权命令和 exec
批准提示。在拥有者存在之后，后续的配对批准只会授予 DM
访问权限；不会再添加更多拥有者。

支持的频道（任何声明配对功能的已安装频道插件；像 `openclaw-weixin` 这样的外部插件可以添加更多）：`discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `signal`, `slack`, `sms`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`。

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

存储在共享的 SQLite 状态数据库中，位于
`~/.openclaw/state/openclaw.sqlite`：

- `channel_pairing_requests` 中的待处理请求
- `channel_pairing_allow_entries` 中已批准的发送者

账号范围行为：

- 每个请求和已批准的发送者都按频道和账号键控
- 运行时只读取规范的 SQLite 行；不会合并旧文件

旧版网关会将 `<channel>-pairing.json` 和
`<channel>-<accountId>-allowFrom.json` 写入 `~/.openclaw/credentials/`。
启动迁移和 `openclaw doctor --fix` 会把这些文件导入 SQLite，并在成功导入后删除每个源文件。请将 SQLite 数据库视为敏感信息，因为这些记录决定了对你的助手的访问权限。

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

### 从 Control UI 配对（推荐）

使用一个已经连接且具有 `operator.admin` 访问权限的 Control UI 会话：

1. 打开 Control UI 并进入 **Settings → Devices**。
2. 在 **Devices** 页面，点击 **Pair mobile device**。
3. 保持 **Full access (recommended)**，或选择 **Limited access** 以省略
   管理性 Gateway 控制。
4. 点击 **Create setup code**。
5. 在你的手机上，打开 OpenClaw 应用 → **Settings** → **Gateway**。
6. 扫描二维码或粘贴设置码，然后连接。

当它们的设置码元数据匹配时，官方 OpenClaw iOS 和 Android 应用会自动批准。如果 **Pending approval** 显示一个请求（例如，对于非官方客户端或元数据不匹配），在批准之前请检查其角色和作用域。

当当前 Control UI 会话没有管理员访问权限时，该按钮会被禁用。在这种情况下，请使用下面来自 Gateway 主机的 CLI 批准流程。

### 通过 Telegram 配对

如果你使用 `device-pair` 插件，你可以完全通过 Telegram 完成首次设备配对：

1. 在 Telegram 中，给你的机器人发送消息：`/pair`
2. 机器人会回复两条消息：一条说明消息，以及一条单独的 **设置码** 消息（在 Telegram 中很容易复制/粘贴）。
3. 在你的手机上，打开 OpenClaw iOS 应用 → Settings → Gateway。
4. 扫描二维码（`/pair qr`）或粘贴设置码并连接。
5. 官方移动端应用会自动连接。如果 `/pair pending` 显示一个请求，在批准前请检查其角色和作用域。

设置码是一个 base64 编码的 JSON 负载，其中包含：

- `url`：Gateway WebSocket URL（`ws://...` 或 `wss://...`）
- `urls`：在可用时，移动应用可以按顺序尝试的 LAN/Tailnet 路由
- `bootstrapToken`：用于初始配对握手的一次性引导令牌；Gateway 会在 10 分钟后过期它

配对完成后，运行 `/pair cleanup` 以使未使用的设置码失效。

该引导令牌携带内置的配对引导配置：

- 安全的 `wss://` 设置（或同主机回环）默认为 `node` 加完整的
  原生移动端 `operator` 访问权限
- 传递出去的 `node` 令牌保持 `scopes: []`
- 默认传递出去的 `operator` 令牌包括 `operator.admin`、
  `operator.approvals`、`operator.read`、`operator.talk.secrets`，以及
  `operator.write`
- Control UI **Limited access** 和 `openclaw qr --limited` 会省略
  `operator.admin`，同时保留其他 operator 作用域
- 明文 LAN `ws://` 设置会自动使用相同的受限配置；请配置
  `wss://` 或 Tailscale Serve，并生成一个新的代码以获得完整访问权限
- 后续令牌轮换/撤销仍受设备已批准的
  角色契约以及调用方会话的 operator 作用域共同限制

在设置码有效期间，请将其视为密码。

iOS 和 Android 的 **Settings → Gateway** 页面会显示 **Full** 或 **Limited**
访问权限。要将受限手机升级，请先配置安全的 `wss://` 或
Tailscale Serve 路由，然后生成一个新的完整访问权限设置码，在该设置页面中扫描或粘贴它，并重新连接。

对于 Tailscale、公共网络或其他远程移动端配对，请使用 Tailscale Serve/Funnel
或其他 `wss://` Gateway URL。明文 `ws://` 设置码仅接受用于回环、本地 LAN 地址、`.local` Bonjour 主机以及 Android
模拟器主机。非回环明文路由会获得受限访问权限。Tailnet
CGNAT 地址、`.ts.net` 名称和公共主机在二维码/设置码发放前仍会失败并关闭。

对于 `gateway.bind=lan` 设置 URL，OpenClaw 会检测持续存在的 Tailscale Serve
HTTPS 根路径，这些根路径代理活动 Gateway 的回环端口，并将它们与 LAN 路由一起公布。设置命令只在 `lan` 下添加此回退；`custom` 和 `tailnet` 会保留其明确公布的路由。iOS 应用会按顺序探测公布的路由，并保存第一个可达的端点。

### 批准一个节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

当显式批准被拒绝，是因为批准配对设备会话是以仅配对范围打开的，
CLI 会使用 `operator.admin` 重新尝试同一个请求。这使得现有的具备管理员能力的配对设备能够恢复一个新的
Control UI/浏览器配对，而无需手动编辑配对存储。Gateway 仍会验证重试后的连接；无法使用 `operator.admin` 进行身份验证的令牌仍会被阻止。

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

存储在共享的 SQLite 状态数据库 `~/.openclaw/state/openclaw.sqlite` 中：

- 待处理的设备配对请求（短期存在；5 分钟后过期）
- 已配对设备 + 令牌

较早的网关会将此状态保存在 `~/.openclaw/devices/*.json` 中；这些文件会在网关启动时导入到 SQLite，并以 `.migrated` 后缀归档。

### 说明

- `node.pair.*` API（CLI：`openclaw nodes pending|approve|reject|remove|rename`）管理
  存储在同一已配对设备记录上的节点能力批准。WS 节点仍然需要设备配对；参见 [Node pairing](/gateway/pairing)。
- 配对记录是已批准角色的持久事实来源。活动设备令牌始终受限于该已批准的角色集合；已批准角色之外的孤立令牌条目不会创建新的访问权限。

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
