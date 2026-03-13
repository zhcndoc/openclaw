---
summary: "`openclaw qr` 的 CLI 参考（生成 iOS 配对二维码和设置码）"
read_when:
  - 你想快速将 iOS 应用与网关配对时
  - 你需要输出设置码以便远程/手动共享时
title: "qr"
---

# `openclaw qr`

根据你当前的网关配置生成 iOS 配对二维码和设置码。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 选项

- `--remote`：使用配置中的 `gateway.remote.url` 以及远程令牌/密码
- `--url <url>`：覆盖负载中使用的网关 URL
- `--public-url <url>`：覆盖负载中使用的公网 URL
- `--token <token>`：覆盖启动流程认证所用的网关令牌
- `--password <password>`：覆盖启动流程认证所用的网关密码
- `--setup-code-only`：仅打印设置码
- `--no-ascii`：跳过 ASCII 二维码渲染
- `--json`：输出 JSON（包含 `setupCode`、`gatewayUrl`、`auth`、`urlSource`）

## 备注

- `--token` 和 `--password` 不能同时使用。
- 设置码本身现在携带一个不透明的短期有效 `bootstrapToken`，而非共享的网关令牌/密码。
- 使用 `--remote` 时，如果配置中有效的远程凭据以 SecretRefs 形式存在，且没有传入 `--token` 或 `--password`，命令会从活动的网关快照中解析它们。若网关不可用，则命令会快速失败。
- 不使用 `--remote` 时，在没有 CLI 认证覆盖的情况下会解析本地网关的认证 SecretRefs：
  - 当令牌认证可用时（明确指定 `gateway.auth.mode="token"` 或推断的模式中没有密码来源优先），解析 `gateway.auth.token`。
  - 当密码认证可用时（明确指定 `gateway.auth.mode="password"` 或推断的模式中没有令牌优先），解析 `gateway.auth.password`。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），且未设置 `gateway.auth.mode`，则设置码解析失败，直到显式设置认证模式。
- 网关版本兼容性说明：该命令路径需要支持 `secrets.resolve` 的网关；旧版本网关将返回未知方法错误。
- 扫码后，通过以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`
