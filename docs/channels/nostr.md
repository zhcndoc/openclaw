---
summary: "通过 NIP-04 加密消息的 Nostr DM 通道"
read_when:
  - 你希望 OpenClaw 通过 Nostr 接收私信
  - 你正在设置去中心化消息传递
title: "Nostr"
---

**状态：** 可选的捆绑插件（默认禁用，直到配置完成）。

Nostr 是一个用于社交网络的去中心化协议。此通道使 OpenClaw 能够通过 NIP-04 接收并响应加密的直接消息（DM）。

## 捆绑插件

当前 OpenClaw 版本已将 Nostr 作为捆绑插件提供，因此常规打包
构建不需要单独安装。

### 较旧/自定义安装

- Onboarding (`openclaw onboard`) 和 `openclaw channels add` 仍会从共享通道目录中显示
  Nostr。
- 如果你的构建不包含捆绑的 Nostr，请直接安装 npm 包。

```bash
openclaw plugins install @openclaw/nostr
```

使用裸包可跟随当前官方发布标签。只有在需要可复现安装时才固定
到精确版本。

使用本地检出版本（开发流程）：

```bash
openclaw plugins install --link <path-to-local-nostr-plugin>
```

安装或启用插件后，请重启 Gateway。

### 非交互式设置

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

使用 `--use-env` 可以将 `NOSTR_PRIVATE_KEY` 保留在环境中，而不是将密钥存储到配置中。

## 快速设置

1. 生成一个 Nostr 密钥对（如需要）：

```bash
# 使用 nak
nak key generate
```

2. 添加到配置中：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
    },
  },
}
```

3. 导出密钥：

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. 重启 Gateway。

## 配置参考

| 键           | 类型      | 默认值                                      | 描述                              |
| ------------ | --------- | ------------------------------------------- | ----------------------------------- |
| `privateKey` | string    | required                                    | `nsec` 或 hex 格式的私钥           |
| `relays`     | string[]  | `['wss://relay.damus.io', 'wss://nos.lol']` | 中继 URL（WebSocket）              |
| `dmPolicy`   | string    | `pairing`                                   | DM 访问策略                        |
| `allowFrom`  | string[]  | `[]`                                        | 允许的发送方 pubkey                |
| `enabled`    | boolean   | `true`                                      | 启用/禁用通道                      |
| `name`       | string    | -                                           | 显示名称                           |
| `profile`    | object    | -                                           | NIP-01 个人资料元数据               |

## 个人资料元数据

个人资料数据会作为 NIP-01 `kind:0` 事件发布。你可以通过 Control UI（Channels -> Nostr -> Profile）进行管理，也可以直接在配置中设置。

示例：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      profile: {
        name: "openclaw",
        displayName: "OpenClaw",
        about: "个人助手 DM 机器人",
        picture: "https://example.com/avatar.png",
        banner: "https://example.com/banner.png",
        website: "https://example.com",
        nip05: "openclaw@example.com",
        lud16: "openclaw@example.com",
      },
    },
  },
}
```

注意：

- 个人资料 URL 必须使用 `https://`。
- 从中继导入会合并字段并保留本地覆盖项。

## 访问控制

### DM 策略

- **pairing**（默认）：未知发送方会收到一个配对码。
- **allowlist**：只有 `allowFrom` 中的 pubkey 才能发送 DM。
- **open**：公开入站 DM（需要 `allowFrom: ["*"]`）。
- **disabled**：忽略入站 DM。

执行说明：

- 在发送方策略和 NIP-04 解密之前，会先验证入站事件签名，因此伪造事件会被尽早拒绝。
- 配对回复会在不处理原始 DM 正文的情况下发送。
- 入站 DM 会受到速率限制，超大的载荷会在解密前被丢弃。

### 允许列表示例

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      dmPolicy: "allowlist",
      allowFrom: ["npub1abc...", "npub1xyz..."],
    },
  },
}
```

## 密钥格式

支持的格式：

- **私钥：** `nsec...` 或 64 字符 hex
- **pubkey（`allowFrom`）：** `npub...` 或 hex

## 中继

默认值：`relay.damus.io` 和 `nos.lol`。

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"],
    },
  },
}
```

提示：

- 使用 2-3 个中继以提高冗余。
- 避免添加过多中继（延迟、重复）。
- 付费中继可以提高可靠性。
- 本地中继适合测试（`ws://localhost:7777`）。

## 协议支持

| NIP    | 状态      | 描述                          |
| ------ | --------- | ----------------------------- |
| NIP-01 | Supported | 基本事件格式 + 个人资料元数据 |
| NIP-04 | Supported | 加密 DM（`kind:4`）          |
| NIP-17 | Planned   | 礼物包装 DM                   |
| NIP-44 | Planned   | 版本化加密                    |

## 测试

### 本地中继

```bash
# 启动 strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["ws://localhost:7777"],
    },
  },
}
```

### 手动测试

1. 从日志中记下机器人 pubkey（npub）。
2. 打开一个 Nostr 客户端（Damus、Amethyst 等）。
3. 给机器人 pubkey 发送 DM。
4. 验证响应。

## 故障排除

### 未收到消息

- 验证私钥是否有效。
- 确保中继 URL 可访问，并使用 `wss://`（本地环境可使用 `ws://`）。
- 确认 `enabled` 不是 `false`。
- 检查 Gateway 日志中的中继连接错误。

### 未发送响应

- 检查中继是否接受写入。
- 验证出站连接是否正常。
- 留意中继的速率限制。

### 重复响应

- 在使用多个中继时这是预期行为。
- 消息会按事件 ID 去重；只有第一次投递会触发响应。

## 安全

- 永远不要提交私钥。
- 对密钥使用环境变量。
- 生产环境机器人建议考虑使用 `allowlist`。
- 在发送方策略之前会先验证签名，并且在解密之前会强制执行发送方策略，因此伪造事件会被尽早拒绝，未知发送方也无法强制执行完整的加密计算。

## 限制（MVP）

- 仅支持直接消息（不支持群聊）。
- 不支持媒体附件。
- 仅支持 NIP-04（NIP-17 礼物包装计划中）。

## 相关内容

- [Channels Overview](/channels) — 所有受支持的通道
- [Pairing](/channels/pairing) — DM 身份验证和配对流程
- [Groups](/channels/groups) — 群聊行为和提及门控
- [Channel Routing](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和加固
