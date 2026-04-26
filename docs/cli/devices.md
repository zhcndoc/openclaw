---
summary: "`openclaw devices` 的命令行参考（设备配对 + 令牌轮换/撤销）"
read_when:
  - 您正在批准设备配对请求
  - 您需要轮换或撤销设备令牌
title: "设备"
---

# `openclaw devices`

管理设备配对请求和设备范围令牌。

## 命令

### `openclaw devices list`

列出待处理的配对请求和已配对设备。

```
openclaw devices list
openclaw devices list --json
```

待处理请求输出会在设备已配对时，将请求的访问权限显示在该设备当前已批准访问权限旁边。这样可以明确显示作用域/角色升级，而不会看起来像是配对丢失了。

### `openclaw devices remove <deviceId>`

移除一个已配对的设备条目。

当您使用配对设备令牌进行认证时，非管理员调用者只能移除**他们自己的**设备条目。移除其他设备需要 `operator.admin` 权限。

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

批量清除已配对的设备。

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

通过确切的 `requestId` 批准待处理的设备配对请求。如果省略 `requestId` 或传递 `--latest`，OpenClaw 仅打印选定的待处理请求并退出；在验证详细信息后，使用确切的请求 ID 重新运行批准命令。

注意：如果设备在更改认证详情（角色/作用域/公钥）后重试配对，OpenClaw 会取代之前的待处理条目并签发新的 `requestId`。在批准前立即运行 `openclaw devices list` 以使用当前 ID。

如果设备已经配对，并且请求更广泛的作用域或更高的角色，OpenClaw 会保留现有批准并创建新的待处理升级请求。请查看 `openclaw devices list` 中的 `Requested` 与 `Approved` 列，或使用 `openclaw devices approve --latest` 在批准前预览确切的升级内容。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

拒绝一个待处理的设备配对请求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

为特定角色轮换设备令牌（可选更新作用域）。目标角色必须已存在于该设备已批准的配对合约中；轮换不能创建新的未批准角色。如果省略 `--scope`，后续使用存储的轮换令牌重新连接时将复用该令牌缓存的已批准作用域。如果传递显式的 `--scope` 值，这些值将成为未来缓存令牌重新连接存储的作用域集。非管理员配对设备调用者只能轮换**他们自己的**设备令牌。此外，任何显式的 `--scope` 值必须保持在调用者会话自身的操作员作用域内；轮换不能创建比调用者已有权限更广泛的操作员令牌。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 格式返回新的令牌负载。

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

非管理员配对设备调用者只能撤销**他们自己的**设备令牌。撤销其他设备的令牌需要 `operator.admin` 权限。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 格式返回撤销结果。

## 常用选项

- `--url <url>`：网关 WebSocket URL（配置时默认为 `gateway.remote.url`）。
- `--token <token>`：网关令牌（如果需要）。
- `--password <password>`：网关密码（密码认证）。
- `--timeout <ms>`：RPC 超时时间。
- `--json`：JSON 格式输出（推荐用于脚本处理）。

注意：当您设置了 `--url` 后，CLI 不会回退使用配置或环境中的凭据，需显式传入 `--token` 或 `--password`。缺少显式凭据会报错。

## 备注

- 令牌轮换会返回一个新令牌（敏感信息）。请像对待秘密一样对待它。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）作用域。
- 令牌轮换保持在该设备已批准的配对角色集和已批准的作用域基线内。散乱的缓存令牌条目不会授予新的轮换目标。
- 对于配对设备令牌会话，跨设备管理仅限管理员：除非调用者拥有 `operator.admin` 权限，否则 `remove`、`rotate` 和 `revoke` 仅限操作自己的设备。
- `devices clear` 故意通过 `--yes` 进行门控（确认）。
- 如果在本地回环上无法使用配对作用域（且未传递显式的 `--url`），list/approve 可以使用本地配对回退方案。
- `devices approve` 在生成令牌之前需要显式的请求 ID；省略 `requestId` 或传递 `--latest` 仅预览最新的待处理请求。

## 令牌漂移恢复检查清单

当控制界面或其他客户端持续出现 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 错误时，请使用此方法：

1. 确认当前网关令牌来源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配对设备并确定受影响的设备 ID：

```bash
openclaw devices list
```

3. 为受影响设备轮换运营者令牌：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果轮换不足以解决问题，移除旧配对并重新批准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用当前共享的令牌或密码重试客户端连接。

注意：

- 正常重新连接认证优先级为：显式共享令牌/密码优先，然后是显式 `deviceToken`，接着是存储的设备令牌，最后是引导令牌。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢复可以在一次有界重试中暂时同时发送共享令牌和存储的设备令牌。

相关：

- [Dashboard auth troubleshooting](/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway troubleshooting](/gateway/troubleshooting#dashboard-control-ui-connectivity)

## 相关内容

- [CLI reference](/cli)
- [Nodes](/nodes)
