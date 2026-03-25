---
summary: "`openclaw devices` 的命令行参考（设备配对 + 令牌轮换/撤销）"
read_when:
  - 您正在审批设备配对请求
  - 您需要轮换或撤销设备令牌
title: "devices"
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

待处理请求的输出来包含请求的角色和作用域，以便在批准前进行审查。

### `openclaw devices remove <deviceId>`

移除一个已配对的设备条目。

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

批准一个待处理的设备配对请求。如果省略 `requestId`，OpenClaw 会自动批准最新的待处理请求。

注意：如果设备在更改认证详情（角色/作用域/公钥）后重试配对，OpenClaw 会取代之前的待处理条目并签发新的 `requestId`。在批准前立即运行 `openclaw devices list` 以使用当前 ID。

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

为特定角色轮换设备令牌（可选更新作用域）。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

```
openclaw devices revoke --device <deviceId> --role node
```

## 通用选项

- `--url <url>`：网关 WebSocket URL（配置时默认为 `gateway.remote.url`）。
- `--token <token>`：网关令牌（如果需要）。
- `--password <password>`：网关密码（密码认证）。
- `--timeout <ms>`：RPC 超时时间。
- `--json`：JSON 格式输出（推荐用于脚本处理）。

注意：当您设置了 `--url` 后，CLI 不会回退使用配置或环境中的凭据，需显式传入 `--token` 或 `--password`。缺少显式凭据会报错。

## 备注

- 令牌轮换会返回一个新的令牌（敏感信息），请妥善保管。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）权限作用域。
- `devices clear` 命令必须使用 `--yes` 参数以防误操作。
- 若本地回环接口无配对作用域（且未显式传入 `--url`），`list` 和 `approve` 命令可以使用本地配对回退机制。

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

相关链接：

- [控制台身份验证故障排除](/web/dashboard#if-you-see-unauthorized-1008)
- [网关故障排除](/gateway/troubleshooting#dashboard-control-ui-connectivity)
