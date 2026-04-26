---
summary: "Nextcloud Talk 支持状态、功能及配置"
read_when:
  - 正在开发 Nextcloud Talk 频道功能时
title: "Nextcloud Talk"
---

状态：捆绑插件（webhook bot）。支持私信、房间、表情反应和 markdown 消息。

## 捆绑插件

Nextcloud Talk 作为捆绑插件包含在当前的 OpenClaw 发行版中，因此正常的打包构建无需单独安装。

如果您使用的是较旧的构建或排除了 Nextcloud Talk 的自定义安装，请手动安装：

通过 CLI 安装（npm 仓库）：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

详情：[插件](/tools/plugin)

## 快速设置（初学者）

1. 确保 Nextcloud Talk 插件可用。
   - 当前打包的 OpenClaw 发行版已捆绑它。
   - 较旧/自定义安装可以通过上述命令手动添加。
2. 在您的 Nextcloud 服务器上，创建一个机器人：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目标房间设置中启用机器人。
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

   文件存储的密钥：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret-file /path/to/nextcloud-talk-secret
   ```

5. 重启网关（或完成设置）。

最简配置示例：

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

## 注意事项

- 机器人无法主动发起私信，必须由用户先发消息给机器人。
- Webhook URL 必须能被网关访问；若网关位于代理后，需设置 `webhookPublicUrl`。
- 机器人 API 不支持媒体上传；媒体通过 URL 发送。
- Webhook 负载无法区分私信和群组；设置 `apiUser` 与 `apiPassword` 后可识别群组类型（否则私信会被当作群组处理）。

## 访问控制（私信）

- 默认：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知发送者获得配对码。
- 通过以下命令批准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公开私信：设置 `channels.nextcloud-talk.dmPolicy="open"` 以及 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 仅匹配 Nextcloud 用户 ID，显示名称不参与匹配。

## 群组（房间）

- 默认：`channels.nextcloud-talk.groupPolicy = "allowlist"`（需@提及）。
- 使用 `channels.nextcloud-talk.rooms` 进行群组白名单设置：

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

- 如不允许任何群组，则保持白名单为空或将 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能能力

| 功能           | 状态         |
| -------------- | ------------ |
| 私信           | 支持         |
| 群组           | 支持         |
| 线程           | 不支持       |
| 媒体           | 仅 URL      |
| 表情反应       | 支持         |
| 原生命令       | 不支持       |

## 配置参考（Nextcloud Talk）

完整配置文档：[配置](/gateway/configuration)

提供者参数：

- `channels.nextcloud-talk.enabled`: 启用/禁用频道启动。
- `channels.nextcloud-talk.baseUrl`: Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`: 机器人共享密钥。
- `channels.nextcloud-talk.botSecretFile`: 常规文件密钥路径。拒绝符号链接。
- `channels.nextcloud-talk.apiUser`: 用于房间查找的 API 用户（私信检测）。
- `channels.nextcloud-talk.apiPassword`: 用于房间查找的 API/应用密码。
- `channels.nextcloud-talk.apiPasswordFile`: API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`: webhook 监听端口（默认：8788）。
- `channels.nextcloud-talk.webhookHost`: webhook 主机（默认：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`: webhook 路径（默认：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`: 外部可访问的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`: `pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`: 私信白名单（用户 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`: `allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`: 群组白名单（用户 ID）。
- `channels.nextcloud-talk.rooms`: 每个房间的设置和白名单。
- `channels.nextcloud-talk.historyLimit`: 群组历史限制（0 表示禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`: 私信历史限制（0 表示禁用）。
- `channels.nextcloud-talk.dms`: 每个私信的覆盖设置（historyLimit）。
- `channels.nextcloud-talk.textChunkLimit`: 出站文本分块大小（字符数）。
- `channels.nextcloud-talk.chunkMode`: `length`（默认）或 `newline`，在按长度分块之前按空行（段落边界）分割。
- `channels.nextcloud-talk.blockStreaming`: 禁用此频道的块流式传输。
- `channels.nextcloud-talk.blockStreamingCoalesce`: 块流式传输合并调优。
- `channels.nextcloud-talk.mediaMaxMb`: 入站媒体上限（MB）。

## 相关内容

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群聊行为和提及限制
- [频道路由](/channels/channel-routing) — 消息会话路由
- [安全性](/gateway/security) — 访问模型和加固
