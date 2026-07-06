---
summary: "CLI 参考文档，适用于 `openclaw devices`（设备配对 + 令牌轮换/撤销）"
read_when:
  - 你正在批准设备配对请求
  - 你需要轮换或撤销设备令牌
title: "设备"
---

# `openclaw devices`

管理设备配对请求和设备范围的令牌。

## 常用选项

- `--url <url>`：网关 WebSocket URL（配置后默认为 `gateway.remote.url`）
- `--token <token>`：网关令牌（如需要）
- `--password <password>`：网关密码（密码认证）
- `--timeout <ms>`：RPC 超时时间
- `--json`：JSON 输出（建议用于脚本）

<Warning>
当你设置 `--url` 时，CLI 不会回退到配置或环境凭据。请显式传入 `--token` 或 `--password`，否则命令会报错。
</Warning>

## 命令

### `openclaw devices list`

列出待处理的配对请求和已配对的设备。

```bash
openclaw devices list
openclaw devices list --json
```

对于已配对设备上的待处理请求，输出会在设备当前已批准访问权限旁显示请求的访问权限，因此范围/角色升级是可见的，而不会看起来像丢失了配对。

### `openclaw devices approve [requestId] [--latest]`

通过精确的 `requestId` 批准一个待处理的配对请求。省略 `requestId`，或传入 `--latest`，只会预览最新的待处理请求并退出（代码 1）；请使用准确的请求 ID 重新运行以批准。

```bash
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

<Note>
如果设备在重新尝试配对时更改了认证信息（角色、范围或公钥），OpenClaw 会用新的 `requestId` 覆盖之前的待处理条目。在批准之前，请先运行 `openclaw devices list` 以获取当前的 id。
</Note>

批准行为：

- 如果设备已经配对，并请求更广泛的范围或角色，OpenClaw 会保留现有批准并创建一个新的待处理升级请求。在批准前，请在 `openclaw devices list` 中比较 `Requested` 与 `Approved`，或使用 `--latest` 预览。
- 批准 `node` 角色或其他非 operator 角色需要 `operator.admin`。`operator.pairing` 足以用于 operator 设备批准，但前提是请求的 operator 范围不超出调用者自己的范围。参见 [Operator scopes](/gateway/operator-scopes)。
- 如果配置了 `gateway.nodes.pairing.autoApproveCidrs`，来自匹配客户端 IP 的首次 `role: node` 请求可以在它们出现在此列表之前自动批准。默认禁用；从不适用于 operator/browser 客户端或升级请求。

### `openclaw devices reject <requestId>`

拒绝一个待处理的设备配对请求。

```bash
openclaw devices reject <requestId>
```

### `openclaw devices remove <deviceId>`

移除一个已配对的设备条目。

```bash
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

使用已配对设备令牌进行身份验证的调用者，只能移除其**自己的**设备条目。移除其他设备需要 `operator.admin`。

### `openclaw devices clear --yes [--pending]`

批量清除已配对设备。受 `--yes` 保护。

```bash
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

`--pending` 还会拒绝所有待处理的配对请求。

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

为某个角色轮换设备令牌，也可选择更新其范围。

```bash
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

- 目标角色必须已存在于该设备已批准的配对契约中；轮换不能铸造一个新的、未批准的角色。
- 省略 `--scope` 会在之后的重新连接中重用存储令牌缓存的已批准范围。传入显式的 `--scope` 值会为未来缓存令牌的重新连接替换存储的范围集合。
- 非管理员的已配对设备调用者只能轮换**自己的**设备令牌，并且目标范围集合必须保持在调用者自己的 operator 范围内；轮换不能铸造或保留比调用者已拥有的更广泛的令牌。

以 JSON 返回轮换元数据。如果调用者在使用该设备令牌进行身份验证时轮换自己的令牌，响应会包含替换令牌，以便客户端可以在重新连接前持久化它。共享/管理员轮换绝不会回显 bearer 令牌。

### `openclaw devices revoke --device <id> --role <role>`

撤销某个角色的设备令牌。

```bash
openclaw devices revoke --device <deviceId> --role node
```

非管理员的已配对设备调用者只能撤销**自己的**设备令牌。撤销其他设备的令牌需要 `operator.admin`。目标范围集合也必须符合调用者自己的 operator 范围；仅配对权限的调用者不能撤销管理员/写入型 operator 令牌。

## 说明

- 这些命令需要 `operator.pairing`（或 `operator.admin`）作用域。非操作员设备角色始终需要 `operator.admin`；请参阅 [Operator scopes](/gateway/operator-scopes)。
- 令牌轮换和吊销仅限于设备已批准的配对角色集和作用域基线内。意外存在的缓存令牌条目不会授予令牌管理目标。
- 对于已配对设备的令牌会话，跨设备管理（`remove`、`rotate`、`revoke`）仅限于自身，除非调用方拥有 `operator.admin`。
- 令牌轮换会返回一个新的令牌（敏感信息）——请像对待密钥一样处理它。
- 如果本地回环不可用配对作用域，且未传递明确的 `--url`，`list`/`approve` 可以回退到本地配对状态。

## 令牌漂移恢复检查清单

当 Control UI 或其他客户端持续失败并出现 `AUTH_TOKEN_MISMATCH`、`AUTH_DEVICE_TOKEN_MISMATCH` 或 `AUTH_SCOPE_MISMATCH` 时，请使用此检查清单。

1. 确认当前网关令牌来源：

   ```bash
   openclaw config get gateway.auth.token
   ```

2. 列出已配对设备并确定受影响的设备 id：

   ```bash
   openclaw devices list
   ```

3. 为受影响的设备轮换 operator 令牌：

   ```bash
   openclaw devices rotate --device <deviceId> --role operator
   ```

4. 如果轮换还不够，请移除过期的配对并重新批准：

   ```bash
   openclaw devices remove <deviceId>
   openclaw devices list
   openclaw devices approve <requestId>
   ```

5. 使用当前共享令牌/密码重试客户端连接。

注意：

- 正常的重新连接认证优先级：先显式共享令牌/密码，然后是显式 `deviceToken`，再然后是已存储的设备令牌，最后是引导令牌。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢复可以在一次有边界的重试中，临时同时发送共享令牌和已存储的设备令牌。
- `AUTH_SCOPE_MISMATCH` 表示设备令牌已被识别，但不包含请求的 scope 集合；在更改共享网关认证之前，请先修复配对/scope 批准契约。

相关：

- [仪表盘认证故障排查](/web/dashboard#if-you-see-unauthorized-1008)
- [网关故障排查](/gateway/troubleshooting#dashboard-control-ui-connectivity)

## Paperclip / `openclaw_gateway` 首次运行批准

通过 `openclaw_gateway` 适配器连接的 Paperclip 代理，会像任何其他新客户端一样，经历相同的首次设备配对批准流程。如果 Paperclip 报告 `openclaw_gateway_pairing_required`，请批准待处理设备并重试。

```bash
openclaw devices approve --latest
```

预览会打印出精确的 `openclaw devices approve <requestId>` 命令；请核对详情，然后使用请求 ID 重新运行该命令以完成批准。对于远程网关或显式凭据，在预览和批准时传入相同的选项：

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

为避免每次重启后都重新批准，请在 Paperclip 中配置持久的 `adapterConfig.devicePrivateKeyPem`，而不是让它每次运行都生成新的临时设备身份：

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

如果批准一直失败，请先运行 `openclaw devices list` 以确认是否存在待处理请求。

## 相关内容

- [CLI 参考](/cli)
- [节点](/nodes)
