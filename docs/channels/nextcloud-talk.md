---
summary: "Nextcloud Talk 支持状态、能力和配置"
read_when:
  - 正在处理 Nextcloud Talk 频道功能
title: "Nextcloud Talk"
---

Nextcloud Talk 是一个可下载的频道插件（`@openclaw/nextcloud-talk`），它通过 Talk webhook 机器人将 OpenClaw 连接到一个自托管的 Nextcloud 实例。支持直接消息、房间、表情回应和 markdown 消息；媒体将以 URL 形式发送。

## 安装

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

使用裸包规格以跟随当前官方发布标签。只有在需要可复现的安装时，才固定到确切版本。

从本地检出（开发工作流）：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

安装后重启网关。详情：[插件](/tools/plugin)。

## 快速设置（入门）

1. 安装插件（见上文）。
2. 在你的 Nextcloud 服务器上创建一个机器人：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature webhook --feature response --feature reaction
   ```

   保留 `--feature response`：如果没有它，外发回复会以 401 失败。可使用 `./occ talk:bot:state --feature webhook --feature response --feature reaction <botId> 1` 修复已存在的机器人。

3. 在目标房间设置中启用该机器人。
4. 配置 OpenClaw：
   - 配置项：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或环境变量：`NEXTCLOUD_TALK_BOT_SECRET`（仅默认账户）

   CLI 设置（`--url`/`--token` 是显式字段的别名；`nc-talk` 和 `nc` 可作为频道别名）：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --url https://cloud.example.com \
     --token "<shared-secret>"
   ```

   等效的显式字段：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret "<shared-secret>"
   ```

   基于文件的 secret：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret-file /path/to/nextcloud-talk-secret
   ```

5. 重启网关（或完成设置）。

最小配置：

```json5
{
  channels: {
    "nextcloud-talk": {
      enabled: true,
      baseUrl: "https://cloud.example.com",
      botSecret: "shared-secret",
      dmPolicy: "pairing",
    },
  },
}
```

## 说明

- Bot 无法发起私信。用户必须先向 Bot 发送消息。
- webhook URL 必须能够从 Nextcloud 服务器访问；如果网关位于代理之后，请设置 `webhookPublicUrl`。Webhook 请求使用 Bot 密钥进行 HMAC-SHA256 签名；无效签名会被拒绝并受到速率限制。
- 只有在原始事件被持久化存储后才会返回 HTTP 200；存储失败时返回 HTTP 500。持久化的 `200` 会携带 `x-openclaw-delivery-accepted: durable`（签名、验证和存储错误响应不会携带该标记），因此反向代理可以要求此标记，以区分 OpenClaw 的接受响应与普通的 `200`。
- Bot API 不支持媒体上传；出站媒体会追加为一行 `Attachment: <url>`。
- Webhook 负载无法区分私信和房间；设置 `apiUser` + `apiPassword` 可启用房间类型查询（缓存时间约为 5 分钟）。未设置时，每个会话都会被视为房间。
- 出站请求会经过 SSRF 防护。对于位于受信任的私有/内部网络中的 Nextcloud 主机，请使用 `channels.nextcloud-talk.network.dangerouslyAllowPrivateNetwork: true` 选择启用。
- 设置 `apiUser`/`apiPassword` 和 `webhookPublicUrl` 后，`openclaw channels status` 会探测 Bot，并在缺少 `response` 功能时发出警告。

## 访问控制（直接消息）

- 默认值：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知发送者将收到配对代码。
- 通过以下命令批准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公开直接消息：`channels.nextcloud-talk.dmPolicy="open"`，并设置 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 仅匹配 Nextcloud 用户 ID（小写）；显示名称会被忽略。

## 房间（群组）

- 默认：`channels.nextcloud-talk.groupPolicy = "allowlist"`（需提及门控）。
- 使用 `channels.nextcloud-talk.rooms` 允许名单中的房间，以 room token 为键；`"*"` 设置通配默认值：

```json5
{
  channels: {
    "nextcloud-talk": {
      rooms: {
        "room-token": { requireMention: true },
      },
    },
  },
}
```

- 每个房间的键：`requireMention`（默认 true）、`enabled`（false 会禁用该房间）、`allowFrom`（每个房间的发送者允许名单）、`tools`（工具允许/拒绝覆盖）、`skills`（限制加载的技能）、`systemPrompt`。
- 若要不允许任何房间，请保持允许名单为空，或设置 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 能力

| 功能            | 状态          |
| --------------- | ------------- |
| 私信            | 支持          |
| 房间            | 支持          |
| 线程            | 不支持        |
| 媒体            | 仅限 URL      |
| 反应            | 支持          |
| 原生命令        | 不支持        |

## 配置参考（Nextcloud Talk）

完整配置：[配置](/gateway/configuration)

提供者选项：

- `channels.nextcloud-talk.enabled`：启用/禁用通道启动。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`：bot 共享密钥（字符串或密钥引用）。
- `channels.nextcloud-talk.botSecretFile`：普通文件密钥路径。不接受符号链接。
- `channels.nextcloud-talk.apiUser`：用于房间查找（DM 检测）和状态探测的 API 用户。
- `channels.nextcloud-talk.apiPassword`：用于房间查找的 API/app 密码。
- `channels.nextcloud-talk.apiPasswordFile`：API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`：webhook 监听端口（默认：8788）。
- `channels.nextcloud-talk.webhookHost`：webhook 主机（默认：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：webhook 路径（默认：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可访问的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。`open` 需要 `allowFrom=["*"]`。
- `channels.nextcloud-talk.allowFrom`：DM 白名单（用户 ID）。
- `channels.nextcloud-talk.groupPolicy`：`allowlist | open | disabled`（默认：allowlist）。
- `channels.nextcloud-talk.groupAllowFrom`：房间发送者白名单（用户 ID）；未设置时回退到 `allowFrom`。
- `channels.nextcloud-talk.rooms`：按房间的设置和白名单（见上文）。
- 静态发送者访问组可通过 `accessGroup:<name>` 在 `allowFrom` 和 `groupAllowFrom` 中引用。
- `channels.nextcloud-talk.historyLimit`：群组历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`：DM 历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dms`：按用户 ID 键控的每个 DM 覆盖项（`historyLimit`）。
- `channels.nextcloud-talk.textChunkLimit`：出站文本分块大小（字符数，默认：4000）。
- `channels.nextcloud-talk.streaming.chunkMode`：`length`（默认）或 `newline`，先按空行（段落边界）拆分，再进行长度分块。
- `channels.nextcloud-talk.streaming.block.enabled`：为此通道启用或禁用块流式传输。
- `channels.nextcloud-talk.streaming.block.coalesce`：块流式传输合并调优。
- `channels.nextcloud-talk.responsePrefix`：出站回复前缀。
- `channels.nextcloud-talk.markdown.tables`：markdown 表格渲染模式（`off | bullets | code | block`）。
- `channels.nextcloud-talk.mediaMaxMb`：入站媒体大小上限（MB）。
- `channels.nextcloud-talk.network.dangerouslyAllowPrivateNetwork`：允许私有/内部 Nextcloud 主机绕过 SSRF 防护。
- `channels.nextcloud-talk.accounts.<id>`：按账号覆盖项（相同键）；`defaultAccount` 选择默认账号。环境变量 `NEXTCLOUD_TALK_BOT_SECRET` / `NEXTCLOUD_TALK_API_PASSWORD` 仅适用于默认账号。

## 相关内容

- [频道概览](/channels) — 所有受支持的频道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [群组](/channels/groups) — 群聊行为和 mention 门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全](/gateway/security) — 访问模型和加固
