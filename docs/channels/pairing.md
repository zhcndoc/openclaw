---
summary: "配对概述：批准谁可以DM你+哪些节点可以加入"
read_when:
  - "设置 DM 访问控制"
  - "配对新的 iOS/Android 节点"
  - "审查 OpenClaw 安全态势"
title: "配对"
---

"配对" 是 OpenClaw 的显式访问批准步骤。 它用于两个地方：

1. **DM 配对**（允许谁可以与机器人交谈）
2. **Node配对**（允许其中devices/nodes加入网关网络）

安全上下文：[安全](/gateway/security)

## <a id="1)-dm-pairing-(inbound-chat-access)"></a><a id="1-dm-pairing-inbound-chat-access"></a> 1) DM 配对（入站聊天访问）

DM 配对适用于实现 OpenClaw 配对 API 的通道。使用 DM 策略 `pairing`，未知发件人会收到一个短代码，并且他们的消息为 **未处理**，直到您批准为止。

默认 DM 策略记录在：[安全](/gateway/security)

仅当有效的 DM 白名单中包含 `"*"` 时，`dmPolicy: "open"` 才是公开的。设置和验证需要公共开放配置的通配符。如果现有状态包含 `open` 和具体的 `allowFrom` 条目，运行时仍然只允许这些发送者，并且配对存储批准不会扩大 `open` 访问范围。

配对码：

- 8 个字符，大写，不包含易混淆字符（`0O1I`）。
- **1 小时后过期**。机器人仅在创建新请求时发送配对消息（每个发送者大约每小时一次）。
- 待处理的 DM 配对请求上限为**每个频道账号 3 个**；在某个请求过期或被批准之前，额外请求将被忽略。

### <a id="approve-from-the-control-ui"></a> Control UI批准

打开**设置→通道→DM访问请求**。该队列合并来自每个配置的通道帐户（其 DM 策略为 `pairing`）的待处理请求。按渠道或帐户筛选，查看发件人 ID 和元数据，然后选择 **Approve**。

批准只会授予直接消息访问权限，不会授予群组访问权限。 如果支持，批准对话还提供以下明确选项：

- **批准后通知请求者**
- **同时将此发送者设为第一个命令拥有者**，仅在当前不存在命令拥有者且 Control UI 会话具有 `operator.admin` 时显示

选择 **忽略** 可在不批准的情况下移除待处理请求。忽略不是永久封禁；发送者之后仍可再次请求访问。

### <a id="approve-from-the-cli"></a> 从 CLI 批准

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

添加 `--notify` 可在同一频道通知请求者。多账号频道使用 `--account <id>`。

不同于 Control UI 中的显式复选框，CLI 在未配置命令拥有者时会自动引导创建 `commands.ownerAllowFrom`，使用类似 `telegram:123456789` 的条目。这会为首次配置提供一个明确的拥有者，用于特权命令和 exec 批准提示。拥有者存在后，后续配对批准只会授予 DM 访问权限；不会再添加更多拥有者。

手动列入白名单的发件人不会自动成为命令所有者。如果授权的发送者没有所有者访问权限，则仅限所有者的命令会回复确切的 `openclaw config set commands.ownerAllowFrom` 命令，以便操作员运行。

### <a id="set-up-an-owner-without-dm-pairing"></a> 在没有 DM 配对的情况下设置所有者

运行`openclaw channels add`并完成通道设置。当不存在命令所有者时，向导会提供 **设置我的操作员帐户** 与聊天访问分开。输入您的个人用户 ID 并确认可以管理此安装的确切帐户。 **暂时跳过** 保持所有权不变。

这也适用于 Discord 服务器和其他禁用 DM 的组通道。所有者可以使用 `/update`、重新启动网关、更改配置和批准命令。所有权不授予聊天访问权限：现有频道和群组访问规则仍然适用。该向导绝不会自动提升聊天许可列表或替换现有所有者。

<Note>
WhatsApp 的登录 QR 将 WhatsApp 帐户链接到 OpenClaw。 DM 访问请求批准向该帐户发送消息的人员。这些是单独的流程。
</Note>

支持的通道包括：`discord`、`feishu`、`googlechat`、`imessage`、`irc`、`line`、`matrix`、`mattermost`、`msteams`、 `nextcloud-talk`、`nostr`、`signal`、`slack`、`sms`、`synology-chat`、`telegram`、`twitch`、`whatsapp`、 `zalo`，`zalouser`。

如果安装的外部插件实现了 OpenClaw 的配对 API，则也可以支持 DM 配对。检查插件的文档以了解特定于版本的限制。

### <a id="reusable-sender-groups"></a> 可复用的发送者组

当相同的受信任发送者集合应适用于多个消息频道，或同时适用于 DM 和群组允许列表时，请使用顶层 `accessGroups`。

静态组使用 `type: "message.senders"`，并通过频道允许列表中的 `accessGroup:<name>` 引用：

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

### <a id="where-the-state-lives"></a> 状态存储位置

对于使用 OpenClaw 的配对 API 的通道，状态存储在位于 `~/.openclaw/state/openclaw.sqlite` 的共享 SQLite 数据库中：

- `channel_pairing_requests` 中的待处理请求
- `channel_pairing_allow_entries` 中已批准的发送者

账号范围行为：

- 每个请求和已批准的发送者都按频道和账号键控
- 使用配对 API 的通道仅读取当前 SQLite 行；他们不合并旧文件

较旧的网关在 `~/.openclaw/credentials/` 下写入 `<channel>-pairing.json` 和 `<channel>-<accountId>-allowFrom.json`。 `openclaw doctor --fix` 将这些文件导入到 SQLite 中，并在成功导入后删除每个源。正常的网关启动会使这些旧文件保持不变。将 SQLite 数据库视为敏感数据库，因为这些行控制对您助手的访问。

<Note>
配对白名单存储用于 DM 访问。群组授权是分开的。 批准 DM 配对码不会自动允许该发送者在群组中运行命令或控制机器人。首次拥有者引导是 `commands.ownerAllowFrom` 中的独立配置状态，而群聊投递仍遵循频道的群组白名单（例如 `groupAllowFrom`、`groups`， 或按频道不同的每群组/每主题覆盖项）。
</Note>

## <a id="2)-node-device-pairing-(ios%2Fandroid%2Fmacos%2Fheadless-nodes)"></a><a id="2-node-device-pairing-ios/android/macos/headless-nodes"></a> 2） Node 设备配对（iOS/Android/macOS/headless 节点）

节点以 `role: node` 的**设备**身份连接到 Gateway。Gateway 会创建一个必须被批准的设备配对请求。

### <a id="pair-from-the-control-ui-(recommended)"></a><a id="pair-from-the-control-ui-recommended"></a> 从 Control UI 配对（推荐）

使用一个已经连接且具有 `operator.admin` 访问权限的 Control UI 会话：

1. 打开 Control UI 并前往 **设置 → 设备**。
2. 在 **设备**页面，点击 **配对设备**。
3. 保持选择**完整访问权限（推荐）**，或选择**受限访问权限**以省略管理员 Gateway 控制。
4. 点击 **创建设置码**。
5. 在手机上打开 OpenClaw 应用 → **设置** → **网关**。
6. 扫描QR代码或粘贴设置代码，然后连接。

当它们的设置码元数据匹配时，官方 OpenClaw iOS 和 Android 应用会自动批准。如果 **待批准** 显示一个请求（例如，对于非官方客户端或元数据不匹配），在批准之前请检查其角色和作用域。

当当前 Control UI 会话没有管理员访问权限时，该按钮会被禁用。在这种情况下，请使用下面来自 Gateway 主机的 CLI 批准流程。

<a id="pair-via-telegram-recommended-for-ios" />

### <a id="pair-via-telegram"></a> 通过 Telegram 配对

如果你使用 `device-pair` 插件，你可以完全通过 Telegram 完成首次设备配对：

1. 在 Telegram 中，给你的机器人发送消息：`/pair`
2. 机器人回复两条消息：一条指令消息和一条单独的**设置代码**消息（易于Telegram中的copy/paste）。
3. 在你的手机上，打开 OpenClaw iOS 应用 → 设置 → 网关。
4. 扫描QR代码（`/pair qr`）或粘贴设置代码并连接。
5. 官方移动端应用会自动连接。如果 `/pair pending` 显示一个请求，在批准前请检查其角色和作用域。

设置码是一个 base64 编码的 JSON 负载，其中包含：

- `url`：Gateway WebSocket URL（`ws://...` 或 `wss://...`）
- `urls`：在可用时，移动应用可以按顺序尝试的 LAN/Tailnet 路由
- `bootstrapToken`：用于初始配对握手的一次性引导令牌；Gateway 会在 10 分钟后过期它

配对完成后，运行 `/pair cleanup` 以使未使用的设置码失效。

该引导令牌携带内置的配对引导配置：

- 安全的 `wss://` 设置（或同主机回环）默认为 `node` 加完整的原生移动端 `operator` 访问权限
- 传递出去的 `node` 令牌保持 `scopes: []`
- 默认传递出去的 `operator` 令牌包括 `operator.admin`、 `operator.approvals`、`operator.read`、`operator.talk.secrets`，以及 `operator.write`
- Control UI **受限访问**和 `openclaw qr --limited` 会省略 `operator.admin`，同时保留其他 operator 作用域
- 明文 LAN `ws://` 设置会自动使用相同的受限配置；请配置 `wss://` 或 Tailscale Serve，并生成一个新的代码以获得完整访问权限
- later 代币 rotation/revocation 仍受设备批准的角色合约和调用方会话的操作员范围的约束

在设置码有效期间，请将其视为密码。

iOS 和 Android 的 **设置 → 网关**页面会显示**完整**或**受限** 访问权限。要将受限手机升级，请先配置安全的 `wss://` 或 Tailscale Serve 路由，然后生成一个新的完整访问权限设置码，在该设置页面中扫描或粘贴它，并重新连接。

对于 Tailscale、公共或其他远程移动配对，请使用 Tailscale Serve/Funnel 或另一个 `wss://` 网关 URL。仅环回、私有 LAN 地址、`.local` Bonjour 主机和 Android 模拟器主机接受明文 `ws://` 设置代码。非环回明文路由的访问受到限制。 Tailnet CGNAT 地址、`.ts.net` 名称和公共主机在 QR/setup-code 发行之前仍然被拒绝。

仅当 OpenClaw 拥有通过 `gateway.tailscale.mode=serve|funnel` 的路由时，才会通告 Tailscale 设置 URL。代理 `gateway.bind=lan` 侦听器的旧版外部服务路由不会被通告，因为普通侦听器拒绝 Tailscale- 形代理入口。运行`openclaw doctor`检查路由； Doctor 保持配置不变，因为它无法证明路由所有权。如果您确认它是来自旧版 OpenClaw 的过时路由，请仅删除其带有 `tailscale serve --yes --https=443 --set-path=/ off` 或 `tailscale funnel --yes --https=443 --set-path=/ off` 的根处理程序，然后手动配置 `gateway.bind=loopback` 和 `gateway.tailscale.mode=serve` 并重新启动网关。如果另一个服务拥有该路由，请关闭托管 Tailscale 入口并配置显式 `gateway.trustedProxies` 兼容性路径。自定义服务端口和 Tailscale 服务需要手动迁移。对于已停用的 `gateway.tailscale.serviceName` 配置，Doctor 会禁用托管入口并打印清除保留的服务路由所需的命令。

### <a id="approve-a-node-device"></a> 批准一个节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

当由于批准配对设备会话是在仅配对范围内打开而导致显式批准被拒绝时，CLI 会使用 `operator.admin` 重试相同的请求。这使得现有的具有管理功能的配对设备可以恢复新的 Control UI/browser 配对，而无需手动编辑配对存储。网关仍然验证重试的连接；无法通过 `operator.admin` 进行身份验证的令牌仍会被阻止。

如果同一设备使用不同的身份验证详细信息（例如不同的 role/scopes/public 密钥）重试，则先前的待处理请求将被取代并创建新的 `requestId`。

<Note>
已配对的设备不会在不提示的情况下获得更宽的访问权限。如果它重新连接并请求更多范围或更宽的角色，OpenClaw 会保持现有批准不变，并创建一个新的待升级请求。在批准之前，请使用 `openclaw devices list` 比较当前已批准的访问权限与新请求的访问权限。
</Note>

### <a id="optional-trusted-cidr-node-auto-approve"></a> 可选的受信任 CIDR 节点自动批准

默认情况下，设备配对仍为手动。对于严格控制的节点网络，您可以选择使用显式 CIDR 或确切 IP 进行首次节点自动批准：

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

这仅适用于没有请求范围的全新 `role: node` 配对请求。Operator、浏览器、Control UI 和 WebChat 客户端仍然需要人工批准。角色、范围、元数据和公钥的更改仍然需要人工批准。

### <a id="node-pairing-state-storage"></a> Node 配对状态存储

存储在位于 `~/.openclaw/state/openclaw.sqlite` 的共享 SQLite 状态数据库中：

- 待处理的设备配对请求（短期存在；5 分钟后过期）
- 已配对设备 + 令牌

较旧的网关将此状态保留在 `~/.openclaw/devices/*.json` 中。停止网关并运行 `openclaw doctor --fix` 将这些文件导入到 SQLite 中，并使用 `.migrated` 后缀进行存档。正常启动会使旧文件保持不变。

### <a id="notes"></a> 说明

- `node.pair.*` API（CLI：`openclaw nodes pending|approve|reject|remove|rename`）管理存储在同一已配对设备记录上的节点能力批准。WS 节点仍然需要设备配对；参见 [节点配对](/gateway/pairing)。
- 配对记录是已批准角色的持久事实来源。活动设备令牌始终受限于该已批准的角色集合；已批准角色之外的孤立令牌条目不会创建新的访问权限。

## <a id="related-docs"></a> 相关文档

- 安全模型 + 提示注入：[安全](/gateway/security)
- 安全更新（运行 doctor）：[更新](/install/updating)
- 频道配置：
  - Telegram： [电报](/channels/telegram)
  - WhatsApp： [WhatsApp](/channels/whatsapp)
  - Signal：[信号](/channels/signal)
  - iMessage： [iMessage](/channels/imessage)
  - Discord：[Discord](/channels/discord)
  - Slack：[Slack](/channels/slack)
- [`openclaw pairing`](/cli/pairing) — 来自 CLI 的驱动器配对
