---
summary: "通过 NIP-04 加密消息实现 Nostr 私信频道"
read_when:
  - 你希望 OpenClaw 通过 Nostr 接收私信
  - 你正在设置去中心化消息系统
title: "Nostr"
---

# Nostr

**状态：** 可选插件（默认禁用）。

Nostr 是一个去中心化社交网络协议。此频道使 OpenClaw 能够通过 NIP-04 接收和回复加密的私信（DM）。

## 按需安装

### 新用户引导（推荐）

- Onboarding (`openclaw onboard`) 和 `openclaw channels add` 列出了可选频道插件。
- 选择 Nostr 会提示你按需安装插件。

安装默认行为：

- **开发频道 + 可用 git 检出：** 使用本地插件路径。
- **稳定/测试版：** 从 npm 下载。

你可以随时覆盖提示中的选择。

### 手动安装

```bash
openclaw plugins install @openclaw/nostr
```

使用本地检出（开发工作流）：

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

安装或启用插件后，请重启网关。

### 非交互式设置

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

使用 `--use-env` 可以保持 `NOSTR_PRIVATE_KEY` 在环境变量中，而不是存储在配置中。

## 快速设置

1. 生成 Nostr 密钥对（如果需要）：

```bash
# 使用 nak
nak key generate
```

2. 添加到配置：

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

4. 重启网关。

## 配置参考

| 键           | 类型       | 默认值                                      | 描述                               |
| ------------ | ---------- | ------------------------------------------- | ---------------------------------- |
| `privateKey` | string     | 必填                                        | 私钥，支持 `nsec` 或十六进制格式     |
| `relays`     | string[]   | `['wss://relay.damus.io', 'wss://nos.lol']` | 中继服务器地址（WebSocket）           |
| `dmPolicy`   | string     | `pairing`                                   | 私信访问策略                       |
| `allowFrom`  | string[]   | `[]`                                        | 允许的发送者公钥                   |
| `enabled`    | boolean    | `true`                                      | 启用/禁用频道                      |
| `name`       | string     | -                                           | 显示名称                         |
| `profile`    | object     | -                                           | NIP-01 个人资料元数据               |

## 个人资料元数据

个人资料数据作为 NIP-01 `kind:0` 事件发布。你可以通过控制界面（频道 -> Nostr -> 个人资料）管理，也可以直接在配置中设置。

示例：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      profile: {
        name: "openclaw",
        displayName: "OpenClaw",
        about: "Personal assistant DM bot",
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

备注：

- 个人资料中的链接必须使用 `https://`。
- 从中继服务器导入资料时会合并字段并保留本地覆盖。

## 访问控制

### 私信策略

- **pairing**（默认）：未知发送者会收到配对码。
- **allowlist**：只有 `allowFrom` 中的公钥可以私信。
- **open**：开放的入站私信（需配置 `allowFrom: ["*"]`）。
- **disabled**：忽略所有入站私信。

执行说明：

- 发送者策略在签名验证和 NIP-04 解密之前进行检查。
- 配对回复会在不处理原始私信内容的情况下发送。
- 入站私信受速率限制，过大的负载会在解密前被丢弃。

### 白名单示例

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

支持格式：

- **私钥：** `nsec...` 或 64 字符十六进制
- **公钥（`allowFrom`）：** `npub...` 或十六进制

## 中继服务器

默认：`relay.damus.io` 和 `nos.lol`。

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

- 使用 2-3 个中继服务器保证冗余。
- 避免太多中继以减少延迟和重复。
- 付费中继可以提升可靠性。
- 本地中继适合测试使用（`ws://localhost:7777`）。

## 协议支持

| NIP    | 状态      | 描述                              |
| ------ | --------- | ---------------------------------- |
| NIP-01 | 支持      | 基础事件格式 + 个人资料元数据      |
| NIP-04 | 支持      | 加密私信（`kind:4`）              |
| NIP-17 | 规划中    | 礼物包装私信                      |
| NIP-44 | 规划中    | 版本化加密                        |

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

1. 从日志中记录机器人公钥（npub）。
2. 打开 Nostr 客户端（如 Damus、Amethyst 等）。
3. 给机器人公钥发送私信。
4. 验证回复。

## 故障排查

### 收不到消息

- 确认私钥有效。
- 确认中继地址可访问，使用 `wss://`（本地可使用 `ws://`）。
- 确认 `enabled` 没有被设置为 `false`。
- 查看网关日志是否有中继连接错误。

### 不发送回复

- 检查中继是否允许写入。
- 确认外部网络连接正常。
- 注意中继的速率限制。

### 重复回复

- 使用多个中继时为预期行为。
- 消息通过事件 ID 去重，只有首次收到消息时触发回复。

## 安全性

- 切勿将私钥提交到版本控制。
- 使用环境变量存储密钥。
- 生产环境机器人建议使用 `allowlist`。
- 配对和白名单策略在解密前强制执行，因此未知发送者无法强制进行完整的加密计算工作。

## 限制（MVP）

- 仅支持直接私信（无群聊）。
- 不支持媒体附件。
- 仅支持 NIP-04（计划支持 NIP-17 礼物包装）。
