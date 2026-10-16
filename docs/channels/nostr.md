---
summary: "Nostr DM 通道通过 NIP-04 加密消息"
read_when:
  - "你希望 OpenClaw 通过 Nostr 接收私信"
  - "你正在设置去中心化消息传递"
title: "Nostr"
---

Nostr 是一个可下载的通道插件（`@openclaw/nostr`），它允许 OpenClaw 通过 Nostr 中继接收并回复 NIP-04 加密的私信。每个网关仅对应一个账户；仅支持私信。

## <a id="install"></a> 安装

```bash
openclaw plugins install @openclaw/nostr
```

使用裸包规范来遵循当前的官方发布标签。仅当您需要可重复安装时才固定确切版本。

从本地结账（开发工作流程）：

```bash
openclaw plugins install --link <path-to-local-nostr-plugin>
```

安装或启用插件会将其应用于正在运行的网关；检查[申请结果](/plugins/manage-plugins#apply-changes-and-inspect)。安装插件后，载入 （`openclaw onboard`） 和 `openclaw channels add` 会从共享频道目录中显示 Nostr。

### <a id="non-interactive-setup"></a> 非交互式设置

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

使用 `--use-env` 将 `NOSTR_PRIVATE_KEY` 保留在环境中，而不是将密钥存储在配置里（仅默认账户）。

## <a id="quick-setup"></a> 快速设置

1. 生成一个 Nostr 密钥对（如需要）：

```bash
# Using nak
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

4. 重启网关。

## <a id="configuration-reference"></a> 配置参考

| 键          | 类型     | 默认值                                     | 描述                                              |
| ------------ | -------- | ------------------------------------------- | -------------------------------------------------------- |
| `privateKey` | 字符串   | 必填                                    | 私钥，格式为 `nsec` 或 hex；允许使用 secret refs |
| `relays`     | 细绳[] | `['wss://relay.damus.io', 'wss://nos.lol']` | 中继 URL （WebSocket）                                   |
| `dmPolicy`   | 字符串   | `pairing`                                   | DM 访问策略                                         |
| `allowFrom`  | 细绳[] | `[]`                                        | 允许的发送者 pubkey                                   |
| `enabled`    | 布尔值  | `true`                                      | Enable/disable频道                                   |
| `name`       | 字符串   | -                                           | 显示名称                                             |
| `profile`    | 目的   | -                                           | NIP-01 资料元数据                                  |

## <a id="profile-metadata"></a> 个人资料元数据

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

注意：

- 配置文件 URL 必须使用 `https://`。
- 从中继导入会合并字段并保留本地覆盖项。

## <a id="access-control"></a> 访问控制

### <a id="dm-policies"></a> DM 策略

- **pairing**（默认）：未知发送方会收到一个配对码。
- **allowlist**：只有 `allowFrom` 中的 pubkey 才能发送 DM。
- **open**：公共入站DM（需要`allowFrom: ["*"]`）。
- **disabled**：忽略入站 DM。

执行说明：

- 入站事件签名会在发送方策略和 NIP-04 解密之前进行验证，因此伪造事件会被尽早拒绝。
- 配对回复会在不解密或处理原始 DM 内容的情况下发送。
- 入站 DM 受到速率限制（全局和每个发件人），并且在解密之前会丢弃超大的有效负载。
- 使用 `dmPolicy: "allowlist"` 和仅包含十六进制文字或 `npub` 公钥（可选地以 `nostr:` 为前缀）的非空 `allowFrom`，其他作者在持久存储和速率核算之前在本地删除。对等列表不会发送到中继。匹配作者仍需经过正常授权。通配符、访问组、无效条目等DM策略保留正常准入路径；这不能防止 relay/network 泛洪或被允许的发件人滥用。

### <a id="allowlist-example"></a> 允许列表示例

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

## <a id="key-formats"></a> 密钥格式

支持的格式：

- **私钥：** `nsec...` 或 64 字符 hex
- **公钥（`allowFrom`）：** `npub...` 或 hex

## <a id="relays"></a> 中继

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

## <a id="protocol-support"></a> 协议支持

| NIP    | 状态    | 描述                           |
| ------ | --------- | ------------------------------------- |
| NIP-01 | 支持 | 基本事件格式 + 个人资料元数据 |
| NIP-04 | 支持 | 加密 DM （`kind:4`）              |
| NIP-17 | 计划   | 礼品包装的 DM                      |
| NIP-44 | 计划   | 版本化加密                  |

## <a id="testing"></a> 测试

### <a id="local-relay"></a> 本地中继

```bash
# Start strfry
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

### <a id="manual-test"></a> 手动测试

1. 记下网关日志中的机器人公钥，或通过 `openclaw channels status` 查看（hex；如果需要，请在你的客户端中将其转换为 npub）。
2. 打开一个 Nostr 客户端（Amethyst、Damus 等）。
3. DM 机器人公钥。
4. 验证响应。

## <a id="troubleshooting"></a> 故障排查

### <a id="not-receiving-messages"></a> 未收到消息

- 验证私钥是否有效。
- 检查中继 URL 是否可访问并使用 `wss://`（或本地使用 `ws://`）。
- 确认 `enabled` 不是 `false`。
- 检查网关日志中是否有中继连接错误。

### <a id="not-sending-responses"></a> 未发送响应

- 检查中继是否接受写入。
- 验证出站连接是否正常。
- 留意中继的速率限制。

### <a id="duplicate-responses"></a> 重复响应

- 在使用多个中继时这是预期行为。
- 消息会按事件 ID 去重；只有第一次投递会触发响应。

## <a id="security"></a> 安全

- 永远不要提交私钥。
- 对密钥使用环境变量。
- 生产环境机器人建议考虑使用 `allowlist`。
- 在发送方策略之前会先验证签名，并且在解密之前会强制执行发送方策略，因此伪造事件会被尽早拒绝，未知发送方也无法强制执行完整的加密计算。

## <a id="limitations-(mvp)"></a><a id="limitations-mvp"></a> 限制（MVP）

- 仅支持直接消息（不支持群聊）。
- 不支持媒体附件。
- 仅支持 NIP-04（NIP-17 礼物包装计划中）。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) — 所有支持的通道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [Groups](/channels/groups) — 群聊行为和提及门控
- [通道路由](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和强化
