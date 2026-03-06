---
summary: "Nextcloud Talk 支持状态、功能及配置"
read_when:
  - 正在开发 Nextcloud Talk 频道功能时
title: "Nextcloud Talk"
---

# Nextcloud Talk（插件）

状态：通过插件（Webhook 机器人）支持。支持私信、群组、表情反应和 Markdown 消息。

## 插件要求

Nextcloud Talk 作为插件提供，不包含在核心安装包内。

通过 CLI 安装（npm 仓库）：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/nextcloud-talk
```

如果在配置或初次使用时选择 Nextcloud Talk 并检测到 git 本地检出，OpenClaw 会自动提供本地安装路径。

详情请见：[插件](/tools/plugin)

## 快速设置（初学者）

1. 安装 Nextcloud Talk 插件。
2. 在你的 Nextcloud 服务器上创建一个机器人：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目标群组设置中启用该机器人。
4. 配置 OpenClaw：
   - 配置项：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或环境变量：`NEXTCLOUD_TALK_BOT_SECRET`（仅限默认账户）
5. 重启网关（或完成初始配置引导）。

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

- `channels.nextcloud-talk.enabled`：启用/禁用该频道。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`：机器人共享密钥。
- `channels.nextcloud-talk.botSecretFile`：密钥文件路径。
- `channels.nextcloud-talk.apiUser`：用于群组查询的 API 用户（用于私信检测）。
- `channels.nextcloud-talk.apiPassword`：群组查询的 API 或应用密码。
- `channels.nextcloud-talk.apiPasswordFile`：API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`：Webhook 监听端口（默认：8788）。
- `channels.nextcloud-talk.webhookHost`：Webhook 主机（默认：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：Webhook 路径（默认：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可访问的 Webhook URL。
- `channels.nextcloud-talk.dmPolicy`：私信策略，选项为 `pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`：私信允许名单（用户 ID）。`open` 策略下需 `"*"`。
- `channels.nextcloud-talk.groupPolicy`：群组策略，选项为 `allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群组允许名单（用户 ID）。
- `channels.nextcloud-talk.rooms`：按群组设置及允许列表。
- `channels.nextcloud-talk.historyLimit`：群组历史消息限制（0 表示禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`：私信历史消息限制（0 表示禁用）。
- `channels.nextcloud-talk.dms`：私信单独覆盖（历史限制）。
- `channels.nextcloud-talk.textChunkLimit`：发送文本块大小限制（字符数）。
- `channels.nextcloud-talk.chunkMode`：切块模式，`length`（默认）或 `newline`（先按空行段落拆分，再按长度切分）。
- `channels.nextcloud-talk.blockStreaming`：禁用该频道区块流式传输。
- `channels.nextcloud-talk.blockStreamingCoalesce`：区块流合并调优参数。
- `channels.nextcloud-talk.mediaMaxMb`：入站媒体大小限制（兆字节）。
