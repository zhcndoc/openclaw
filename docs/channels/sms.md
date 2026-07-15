---
summary: "Twilio SMS 渠道设置、访问控制和 webhook 配置"
read_when:
  - 你想通过 Twilio 将 OpenClaw 连接到 SMS
  - 你需要设置 SMS webhook 或 allowlist
title: "SMS"
---

OpenClaw 通过 Twilio 电话号码或 Messaging Service 接收和发送 SMS。Gateway 默认会注册一个入站 webhook 路由（默认 `/webhooks/sms`），验证 Twilio 请求签名，并通过 Twilio 的 Messages API 发送回复。

状态：官方插件，需单独安装。仅支持文本：不支持 MMS/媒体，仅支持直接消息。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    SMS 的默认 DM 策略是配对。
  </Card>
  <Card title="Gateway 安全" icon="shield" href="/gateway/security">
    查看 webhook 暴露和发送方访问控制。
  </Card>
  <Card title="渠道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## 开始之前

你需要：

- 已通过 `openclaw plugins install @openclaw/sms` 安装官方 SMS 插件。
- 一个 Twilio 账号，以及一个支持 SMS 的电话号码，或者一个 Twilio Messaging Service。
- Twilio Account SID 和 Auth Token。
- 一个可访问你的 OpenClaw Gateway 的公开 HTTPS URL。
- 一个发送方策略选择：`pairing`（默认）用于私人使用，`allowlist` 用于预先批准的电话号码，或 `open` 仅用于有意公开的 SMS 访问。

如果一个 Twilio 号码同时具备这两种能力，它既可以用于 SMS，也可以用于 [Voice Call](/plugins/voice-call)。SMS webhook 和 Voice webhook 在 Twilio 中分别配置，并使用不同的 Gateway 路径；本页仅涵盖 SMS webhook。

## 快速设置

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/sms
    ```
  </Step>
  <Step title="创建或选择一个 Twilio 发送方">
    在 Twilio 中，打开 **Phone Numbers > Manage > Active numbers**，并选择一个支持 SMS 的号码。保存以下信息：

    - Account SID，例如 `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
    - Auth Token
    - 发送方电话号码，例如 `+15551234567`

    如果你使用 Messaging Service 而不是固定发送号码，请保存 Messaging Service SID，例如 `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`。

  </Step>

  <Step title="配置 SMS 渠道">

将以下内容保存为 `sms.patch.json5`，并替换占位符：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

应用它：

```bash
openclaw config patch --file ./sms.patch.json5 --dry-run
openclaw config patch --file ./sms.patch.json5
```

  </Step>

  <Step title="将 Twilio 指向 Gateway webhook">
    在 Twilio 电话号码设置中，打开 **Messaging**，并将 **A message comes in** 设置为：

```text
https://gateway.example.com/webhooks/sms
```

    使用 HTTP `POST`。默认的本地路径是 `/webhooks/sms`；如果你需要不同的路由，请更改 `channels.sms.webhookPath`。

  </Step>

  <Step title="暴露准确的 SMS webhook 路径">
    你的公网 URL 必须将 SMS 路径路由到 Gateway 进程（默认端口 `18789`）。如果你使用 Tailscale Funnel 进行本地测试，请显式暴露 `/webhooks/sms`：

```bash
tailscale funnel --bg --set-path /webhooks/sms http://127.0.0.1:<gateway-port>/webhooks/sms
tailscale funnel status
```

    语音通话和 SMS 使用不同的 webhook 路径。如果同一个 Twilio 号码同时处理两者，请在 Twilio 和你的隧道中都保留这两条路由的配置。

  </Step>

  <Step title="启动 Gateway 并批准第一个发送方">

```bash
openclaw gateway
```

向 Twilio 号码发送一条短信。第一条消息会创建一个配对请求。批准它：

```bash
openclaw pairing list sms
openclaw pairing approve sms <CODE>
```

    配对代码 1 小时后过期。

  </Step>
</Steps>

## 配置示例

所有键都位于 `channels.sms` 下（每个账号则位于 `channels.sms.accounts.<id>` 下）：

| 键                                      | 默认值          | 目的                                                                |
| --------------------------------------- | --------------- | ------------------------------------------------------------------- |
| `enabled`                               | `true`          | 启用或禁用该渠道/账号。                                               |
| `accountSid`                            | —               | Twilio 账号 SID（`AC...`）。                                         |
| `authToken`                             | —               | Twilio Auth Token；明文字符串或 SecretRef。                          |
| `fromNumber`                            | —               | E.164 发件人号码。                                                   |
| `messagingServiceSid`                   | —               | 当未解析到 `fromNumber` 时使用的 Messaging Service SID（`MG...`）。 |
| `defaultTo`                             | —               | 发送流程未指定显式目标时的默认目的地。                                 |
| `webhookPath`                           | `/webhooks/sms` | 网关用于接收 Twilio 入站 webhook 的 HTTP 路径。                       |
| `publicWebhookUrl`                      | —               | 在 Twilio 中配置的公网 URL；签名验证所必需。                          |
| `dangerouslyDisableSignatureValidation` | `false`         | 跳过 `X-Twilio-Signature` 校验；仅用于本地隧道测试。                   |
| `dmPolicy`                              | `"pairing"`     | `pairing`、`allowlist`、`open` 或 `disabled`。                        |
| `allowFrom`                             | `[]`            | 允许的 E.164 发送方号码；若 `dmPolicy: "open"`，也可使用 `"*"`。     |
| `textChunkLimit`                        | `1500`          | 每个外发 SMS 分片允许的最大字符数。                                    |
| `accounts`, `defaultAccount`            | —               | 多账号映射和默认账号 id。                                              |

### 配置文件

当你希望渠道定义随 Gateway 配置一起携带时，请使用配置文件方式：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

### 环境变量

环境变量仅适用于默认账号；配置值的优先级高于环境变量值。

| 变量                                             | 映射到                                             |
| ----------------------------------------------- | -------------------------------------------------- |
| `TWILIO_ACCOUNT_SID`                            | `accountSid`                                       |
| `TWILIO_AUTH_TOKEN`                             | `authToken`                                        |
| `TWILIO_PHONE_NUMBER` (别名 `TWILIO_SMS_FROM`)  | `fromNumber`                                       |
| `TWILIO_MESSAGING_SERVICE_SID`                  | `messagingServiceSid`                              |
| `SMS_PUBLIC_WEBHOOK_URL`                        | `publicWebhookUrl`                                 |
| `SMS_WEBHOOK_PATH`                              | `webhookPath`                                      |
| `SMS_ALLOWED_USERS`                             | `allowFrom`（逗号分隔）                             |
| `SMS_TEXT_CHUNK_LIMIT`                          | `textChunkLimit`                                   |
| `SMS_DANGEROUSLY_DISABLE_SIGNATURE_VALIDATION`  | `dangerouslyDisableSignatureValidation`（`"true"`） |

```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="<twilio-auth-token>"
export TWILIO_PHONE_NUMBER="+15551234567"
export SMS_PUBLIC_WEBHOOK_URL="https://gateway.example.com/webhooks/sms"
```

然后在配置中启用该渠道：

```json5
{
  channels: {
    sms: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

### SecretRef auth token

`authToken` 可以是 SecretRef（`source: "env" | "file" | "exec"`）。当 Gateway 应该从 OpenClaw secrets runtime 解析 Twilio Auth Token，而不是存储明文配置时，请使用此方式：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: { source: "env", provider: "default", id: "TWILIO_AUTH_TOKEN" },
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

引用的环境变量或 secret provider 必须对 Gateway 运行时可见。修改主机环境变量后，请重启受管理的 Gateway 进程。

### Messaging Service sender

当 Twilio 应通过 Messaging Service 选择发送方时，请使用 `messagingServiceSid` 代替 `fromNumber`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

如果在配置和环境变量解析后同时存在 `fromNumber` 和 `messagingServiceSid`，则会使用 `fromNumber`。

### 默认外发目标

当自动化或代理发起的发送在缺少显式目标时需要一个默认目的地，请设置 `defaultTo`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      defaultTo: "+15557654321",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
    },
  },
}
```

## 访问控制

`channels.sms.dmPolicy` 控制直接 SMS 访问：

- `pairing`（默认）：未知发件人会获得一个配对码；使用 `openclaw pairing approve sms <CODE>` 进行批准。
- `allowlist`：仅处理 `allowFrom` 中的发件人。空的 `allowFrom` 会拒绝所有发件人（Gateway 会记录启动警告）。
- `open`：配置校验要求 `allowFrom` 包含 `"*"`。如果没有通配符，则只有列出的号码可以聊天。
- `disabled`：所有传入的私信都会被丢弃。

`allowFrom` 条目应为 E.164 电话号码，例如 `+15551234567`。支持 `sms:` 和 `twilio-sms:` 前缀，并会自动规范化。对于私人助手，建议使用带有明确电话号码的 `dmPolicy: "allowlist"`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "allowlist",
      allowFrom: ["+15557654321"],
    },
  },
}
```

## 发送 SMS

选择 SMS 渠道后，目标可接受裸露的 E.164 号码或 `sms:` 前缀：

```bash
openclaw message send --channel sms --target sms:+15551234567 --message "hello"
```

当渠道选择是隐式的时，`twilio-sms:` 前缀会选择此渠道，而不会接管 `sms:` 服务前缀；`sms:` 是 iMessage 用来为其自身目标选择运营商 SMS 投递的前缀：

```bash
openclaw message send --target twilio-sms:+15551234567 --message "hello"
```

CLI 需要显式的 `--target`。`defaultTo` 适用于自动化和代理发起的发送路径，在这些路径中，目标可以从渠道配置中解析出来。

来自入站 SMS 对话的代理回复会通过已配置的 Twilio 发送方自动回复给发送者。

SMS 输出为纯文本。OpenClaw 会去除 markdown、展开围栏代码块、将链接重写为 `label (url)`，并在通过 Twilio 发送前将长回复拆分为最多 `textChunkLimit` 个字符的片段（默认 1500）。

## 验证设置

Gateway 启动后：

1. 确认 Gateway 日志显示 SMS webhook 路由。
2. 运行一个 Twilio 侧探测（检查已配置的 Twilio webhook URL/方法以及最近的入站错误）：

```bash
openclaw channels capabilities --channel sms
openclaw channels status --channel sms --probe --json
```

3. 从你的手机向 Twilio 号码发送一条 SMS。
4. 运行 `openclaw pairing list sms`。
5. 使用 `openclaw pairing approve sms <CODE>` 批准配对代码。
6. 再发送一条 SMS，并确认代理回复。

对于仅出站测试，请使用：

```bash
openclaw message send --channel sms --target sms:+15557654321 --message "OpenClaw SMS test"
```

### 来自 macOS iMessage/SMS 的端到端测试

在一台能够通过 Messages 发送运营商 SMS 的 Mac 上，你可以使用 `imsg` 来驱动发送端，而无需碰你的手机：

```bash
imsg send --to "+15551234567" --service sms --text "OpenClaw SMS E2E $(date -u +%Y%m%dT%H%M%SZ)" --json
openclaw pairing list sms
openclaw pairing approve sms <CODE>
imsg send --to "+15551234567" --service sms --text "reply exactly SMS pong" --json
```

第一条消息应创建一个配对请求。第二条消息应通过 Twilio 收到代理回复。

## Webhook 安全

默认情况下，OpenClaw 会使用 `publicWebhookUrl` 和 `authToken` 验证 `X-Twilio-Signature`。请确保 `publicWebhookUrl` 的端点部分与在 Twilio 中配置的 URL 按字节级完全一致，包括协议、主机、路径和查询字符串。OpenClaw 会按 Twilio 的要求，在签名计算中排除 Twilio 的 [connection-override](https://www.twilio.com/docs/usage/webhooks/webhooks-connection-overrides) 片段（`#...`）。

Webhook 路由还会独立于签名验证强制执行以下规则：

- 仅允许 `POST`。
- 每个 SMS account、webhook route 和解析后的客户端地址，每分钟 300 个请求的失败请求预算。所有请求都会计入此预算，但只有在请求体解析失败、Twilio 验证失败或 AccountSid 匹配失败之后，才会应用 HTTP 429。
- 在上述检查通过后，每个 SMS account、webhook route 和解析后的客户端地址，每分钟允许 30 个可分发的已接受回调（超过则返回 HTTP 429）。如果签名验证被禁用，那么这个 30/min 限制就是未认证的分发上限。
- 客户端地址通过共享的 Gateway 可信代理规则解析。如果 `gateway.trustedProxies` 包含转发 Twilio 回调的反向代理，OpenClaw 会以转发后的客户端地址作为这些限制的键；否则会回退为直接的套接字地址。
- 负载中的 `AccountSid` 必须与配置的 `accountSid` 匹配（否则返回 HTTP 403）。
- 重放的 `MessageSid` 值会被去重 10 分钟。
- 每个 SMS account 的重放缓存最多保留 10,000 个活跃消息 SID。当前端口槽位全部处于活跃状态时，该 account 的新 webhook 会以 HTTP 429 失败并附带 `Retry-After` 头，直到最早的槽位过期。
- 超过 32 KB 的请求体将被拒绝。

Twilio 默认不会重试 HTTP 429，也没有说明对 `Retry-After` 的支持。`#rp=4xx` 和 `#rp=all` connection override 会启用 4xx 重试，但 Twilio 将完整的重试事务上限限制为 15 秒，因此重试仍可能在重放缓存槽位过期之前结束。当需要另一个处理程序接收失败投递时，请配置 fallback URL；应将 429 视为 fail-closed 拒绝，而不是可靠的背压。

仅用于本地隧道测试时，你可以设置：

```json5
{
  channels: {
    sms: {
      dangerouslyDisableSignatureValidation: true,
    },
  },
}
```

不要在公共 Gateway 上使用已禁用的签名验证。

## 多账户配置

当您运营多个 Twilio 号码时，请使用 `accounts`：

```json5
{
  channels: {
    sms: {
      accounts: {
        support: {
          enabled: true,
          accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          authToken: "twilio-auth-token",
          fromNumber: "+15551234567",
          publicWebhookUrl: "https://gateway.example.com/webhooks/sms/support",
          webhookPath: "/webhooks/sms/support",
          dmPolicy: "allowlist",
          allowFrom: ["+15557654321"],
        },
      },
    },
  },
}
```

每个账户都必须使用不同的 `webhookPath`；Gateway 会拒绝注册路径已被其他账户占用的 webhook 路由。`TWILIO_*`/`SMS_*` 环境回退仅适用于默认账户；设置 `defaultAccount` 可更改该默认账户。

## 故障排除

### Twilio 返回 403 或 OpenClaw 拒绝 webhook

检查 `publicWebhookUrl` 是否与 Twilio 中配置的 URL 完全一致，包括协议、主机、路径和查询字符串。Twilio 会对公开 URL 字符串进行签名，因此代理重写和备用主机名都可能破坏签名验证。

A 403 with `Invalid account` means the inbound payload's `AccountSid` does not match the configured `accountSid`; check that the webhook points at the account that owns the number.

### 未出现配对请求

检查 Twilio 号码的 **Messaging** webhook URL 和方法。它必须指向 SMS webhook URL，并且使用 `POST`。另外还要确认 Gateway 能通过公网或通过你的隧道访问。

如果 Twilio 消息日志显示错误 `11200`，说明 Twilio 已接受传入的 SMS，但无法访问你的 webhook。请检查：

- Twilio **Messaging > A message comes in** 指向 `publicWebhookUrl`。
- 方法是 `POST`。
- 隧道或反向代理暴露了完全一致的 `webhookPath`；如果使用 Tailscale Funnel，运行 `tailscale funnel status` 并确认已列出 `/webhooks/sms`。
- `publicWebhookUrl` 使用的协议、主机、路径和查询字符串与 Twilio 发送的一致，因此签名验证可以复现已签名的 URL。

`openclaw channels status --channel sms --probe` 会同时显示 Twilio webhook 设置不匹配和最近的 `11200` 错误。

### 外发发送失败

确认 `accountSid`、`authToken`，以及 `fromNumber` 或 `messagingServiceSid` 已正确解析。如果你使用的是 Twilio 试用账户，目标号码在发送外发 SMS 前可能需要先在 Twilio 中完成验证。

### 消息已到达，但代理没有回复

检查 `dmPolicy` 和 `allowFrom`。在默认的 `pairing` 策略下，发送者必须先获得批准，随后才会处理正常的 agent 回合。
