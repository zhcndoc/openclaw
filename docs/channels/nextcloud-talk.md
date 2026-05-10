---
summary: "Nextcloud Talk 支持状态、能力和配置"
read_when:
  - 正在处理 Nextcloud Talk 频道功能
title: "Nextcloud Talk"
---

状态：捆绑插件（webhook bot）。支持私信、房间、反应和 markdown 消息。

## 捆绑插件

Nextcloud Talk 在当前 OpenClaw 版本中作为捆绑插件提供，因此
普通打包构建不需要单独安装。

如果你使用的是较旧的构建版本，或者是一个排除了 Nextcloud Talk 的自定义安装，
请直接安装 npm 包：

通过 CLI 安装（npm registry）：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

使用裸包以跟随当前官方发布标签。只有在需要可复现安装时才固定到精确
版本。

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

详情：[插件](/tools/plugin)

## 快速设置（入门）

1. 确保 Nextcloud Talk 插件可用。
   - 当前打包版 OpenClaw 已经捆绑了它。
   - 较旧/自定义安装可以使用上面的命令手动添加。
2. 在你的 Nextcloud 服务器上创建一个 bot：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature webhook --feature response --feature reaction
   ```

3. 在目标房间设置中启用该 bot。
4. 配置 OpenClaw：
   - 配置：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或环境变量：`NEXTCLOUD_TALK_BOT_SECRET`（仅默认账户）

   CLI 设置：

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

- bot 不能主动发起私信。用户必须先给 bot 发消息。
- webhook URL 必须能被 Gateway 访问；如果位于代理后面，请设置 `webhookPublicUrl`。
- bot API 不支持媒体上传；媒体会以 URL 的形式发送。
- webhook 负载无法区分私信与房间；设置 `apiUser` + `apiPassword` 可启用房间类型查找（否则私信会被当作房间处理）。

## 访问控制（私信）

- 默认：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知发送者会获得一个配对码。
- 通过以下方式批准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公开私信：`channels.nextcloud-talk.dmPolicy="open"` 再加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 仅匹配 Nextcloud 用户 ID；显示名称会被忽略。

## 房间（群组）

- 默认：`channels.nextcloud-talk.groupPolicy = "allowlist"`（基于 mention 门控）。
- 使用 `channels.nextcloud-talk.rooms` 将房间加入允许列表：

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

- 若要不允许任何房间，保持允许列表为空，或设置 `channels.nextcloud-talk.groupPolicy="disabled"`。

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

- `channels.nextcloud-talk.enabled`：启用/禁用频道启动。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`：bot 共享密钥。
- `channels.nextcloud-talk.botSecretFile`：普通文件的密钥路径。不接受符号链接。
- `channels.nextcloud-talk.apiUser`：用于房间查找的 API 用户（DM 检测）。
- `channels.nextcloud-talk.apiPassword`：用于房间查找的 API/app 密码。
- `channels.nextcloud-talk.apiPasswordFile`：API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`：webhook 监听端口（默认：8788）。
- `channels.nextcloud-talk.webhookHost`：webhook 主机（默认：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：webhook 路径（默认：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可访问的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`：`pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`：DM 允许列表（用户 ID）。`open` 需要 `"*"`.
- `channels.nextcloud-talk.groupPolicy`：`allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群组允许列表（用户 ID）。
- `channels.nextcloud-talk.rooms`：按房间设置和允许列表。
- `channels.nextcloud-talk.historyLimit`：群组历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`：私信历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dms`：按私信覆盖设置（historyLimit）。
- `channels.nextcloud-talk.textChunkLimit`：输出文本分块大小（字符数）。
- `channels.nextcloud-talk.chunkMode`：`length`（默认）或 `newline`，在按长度分块前按空行（段落边界）拆分。
- `channels.nextcloud-talk.blockStreaming`：为此频道禁用 block streaming。
- `channels.nextcloud-talk.blockStreamingCoalesce`：block streaming 合并调优。
- `channels.nextcloud-talk.mediaMaxMb`：输入媒体上限（MB）。

## 相关内容

- [频道概览](/channels) — 所有受支持的频道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [群组](/channels/groups) — 群聊行为和 mention 门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全](/gateway/security) — 访问模型和加固
