---
summary: "CLI 参考文档，适用于 `openclaw devices`（设备配对 + 令牌轮换/撤销）"
read_when:
  - 你正在批准设备配对请求
  - 你需要轮换或撤销设备令牌
title: "设备"
---

# `openclaw devices`

管理设备配对请求和设备范围的令牌。

## 命令

### `openclaw devices list`

列出待处理的配对请求和已配对的设备。

```
openclaw devices list
openclaw devices list --json
```

待处理请求的输出会在设备当前已批准访问权限旁显示其请求的访问权限，前提是该设备已经配对。这样可以明确显示范围/角色升级，而不会看起来像是配对丢失了。

### `openclaw devices remove <deviceId>`

移除一个已配对的设备条目。

当你使用已配对的设备令牌进行身份验证时，非管理员调用者只能移除**自己的**设备条目。移除其他设备需要 `operator.admin`。

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

批量清除已配对设备。

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

通过精确的 `requestId` 批准一个待处理的设备配对请求。如果省略 `requestId` 或传入 `--latest`，OpenClaw 只会打印所选中的待处理请求并退出；在验证详细信息后，再使用准确的请求 ID 重新运行批准命令。

<Note>
如果某个设备在重试配对时更改了认证细节（角色、范围或公钥），OpenClaw 会取代之前的待处理条目并发出一个新的 `requestId`。请在批准前立即运行 `openclaw devices list` 以使用当前 ID。
</Note>

如果该设备已经配对，但请求更宽泛的范围或更高的角色，OpenClaw 会保留现有批准，并创建一个新的待处理升级请求。请在 `openclaw devices list` 中查看 `Requested` 与 `Approved` 列，或使用 `openclaw devices approve --latest` 在批准前预览确切的升级内容。

如果 Gateway 显式配置了 `gateway.nodes.pairing.autoApproveCidrs`，来自匹配客户端 IP 的首次 `role: node` 请求可以在它们出现在此列表之前就被批准。该策略默认禁用，并且从不适用于 operator/browser 客户端或升级请求。

批准节点或其他非 operator 设备角色需要 `operator.admin`。
仅当请求的 operator 范围仍在调用者自身范围内时，`operator.pairing` 才足以批准 operator 设备。有关批准时检查，请参见
[Operator scopes](/gateway/operator-scopes)。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

## Paperclip / `openclaw_gateway` 首次运行批准

当新的 Paperclip 代理首次通过 `openclaw_gateway` 适配器连接时，Gateway 可能会要求进行一次性的设备配对批准，之后运行才能成功。如果 Paperclip 报告 `openclaw_gateway_pairing_required`，请批准待处理设备并重试。

对于本地 Gateway，请预览最新的待处理请求：

```bash
openclaw devices approve --latest
```

预览会打印出精确的 `openclaw devices approve <requestId>` 命令。请核对请求详情，然后使用该请求 ID 重新运行该命令以完成批准。

对于远程 Gateway 或显式凭据，在预览和批准时传入相同的选项：

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

为了避免在重启后重复批准，请在 Paperclip 适配器配置中保留一个持久化的设备密钥，而不是每次运行都生成新的临时身份：

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

如果批准一直失败，请先运行 `openclaw devices list` 以确认是否存在待处理请求。

### `openclaw devices reject <requestId>`

拒绝一个待处理的设备配对请求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

为特定角色轮换设备令牌（可选更新范围）。
目标角色必须已经存在于该设备已批准的配对契约中；轮换不能铸造一个新的、未批准的角色。
如果省略 `--scope`，之后使用已存储的轮换令牌重新连接时，会复用该令牌缓存的已批准范围。如果传入显式的 `--scope` 值，它们将成为未来缓存令牌重新连接时使用的存储范围集合。
非管理员的已配对设备调用者只能轮换**自己的**设备令牌。
目标令牌的范围集合必须保持在调用者会话自身的 operator 范围内；轮换不能铸造或保留比调用者已有权限更宽泛的 operator 令牌。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 形式返回轮换元数据。如果调用者在使用该设备令牌进行身份验证时轮换自己的令牌，响应还会包含替换令牌，以便客户端在重新连接前将其持久化。共享/管理员轮换不会回显 bearer 令牌。

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

非管理员的已配对设备调用者只能撤销**自己的**设备令牌。撤销其他设备的令牌需要 `operator.admin`。
目标令牌的范围集合还必须符合调用者会话自身的 operator 范围；仅配对的调用者不能撤销 admin/write operator 令牌。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 形式返回撤销结果。

## 常用选项

- `--url <url>`：Gateway WebSocket URL（在已配置时默认为 `gateway.remote.url`）。
- `--token <token>`：Gateway token（如需要）。
- `--password <password>`：Gateway 密码（密码认证）。
- `--timeout <ms>`：RPC 超时时间。
- `--json`：JSON 输出（推荐用于脚本）。

<Warning>
当你设置 `--url` 时，CLI 不会回退到配置或环境凭据。请显式传入 `--token` 或 `--password`。缺少显式凭据会报错。
</Warning>

## 说明

- 令牌轮换会返回一个新令牌（敏感信息）。请将其视为秘密。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）范围。某些批准还要求调用者持有目标设备将铸造或继承的 operator 范围。非 operator 设备角色需要 `operator.admin`；请参见 [Operator scopes](/gateway/operator-scopes)。
- `gateway.nodes.pairing.autoApproveCidrs` 是仅用于新节点设备配对的可选 Gateway 策略；它不会改变 CLI 的批准权限。
- 令牌轮换和撤销始终限制在该设备已批准的配对角色集合和已批准的范围基线内。即使存在一个误留的缓存令牌条目，也不会赋予令牌管理目标权限。
- 对于已配对设备的令牌会话，跨设备管理仅限管理员：除非调用者拥有 `operator.admin`，否则 `remove`、`rotate` 和 `revoke` 仅可用于自身。
- 令牌变更也受调用者范围约束：仅配对会话不能轮换或撤销当前携带 `operator.admin` 或 `operator.write` 的令牌。
- `devices clear` 刻意由 `--yes` 把关。
- 如果在本地回环上不可用配对范围（且未传入显式 `--url`），`list`/`approve` 可以使用本地配对回退。
- `devices approve` 在铸造令牌前需要显式请求 ID；省略 `requestId` 或传入 `--latest` 只会预览最新的待处理请求。

## 令牌漂移恢复检查清单

当 Control UI 或其他客户端持续出现 `AUTH_TOKEN_MISMATCH`、`AUTH_DEVICE_TOKEN_MISMATCH` 或 `AUTH_SCOPE_MISMATCH` 时，请使用此清单。

1. 确认当前 gateway token 来源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配对设备并识别受影响的设备 id：

```bash
openclaw devices list
```

3. 为受影响设备轮换 operator 令牌：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果轮换还不够，移除过期的配对并重新批准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用当前共享 token/password 重试客户端连接。

说明：

- 正常重新连接的认证优先级是：显式共享 token/password 优先，然后是显式 `deviceToken`，然后是已存储的设备令牌，最后是引导令牌。
- 可信的 `AUTH_TOKEN_MISMATCH` 恢复可以在一次受限重试中临时同时发送共享令牌和已存储的设备令牌。
- `AUTH_SCOPE_MISMATCH` 表示设备令牌已被识别，但不包含请求的范围集合；在更改共享 Gateway 认证之前，请先修复配对/范围批准契约。

相关：

- [控制面板认证故障排查](/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway 故障排查](/gateway/troubleshooting#dashboard-control-ui-connectivity)

## 相关

- [CLI 参考](/cli)
- [节点](/nodes)
