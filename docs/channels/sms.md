---
summary: "Twilio SMS 渠道设置、访问控制和 webhook 配置"
read_when:
  - 你想通过 Twilio 将 OpenClaw 连接到 SMS
  - 你需要设置 SMS webhook 或 allowlist
title: "SMS"
---

OpenClaw 可以通过 Twilio 电话号码或 Messaging Service 接收和发送 SMS。Gateway 默认会注册一个入站 webhook 路由，验证 Twilio 请求签名，并通过 Twilio 的 Messages API 将回复发送回去。

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

- 安装官方 SMS 插件：`openclaw plugins install @openclaw/sms`。
- 一个 Twilio 账号，以及一个支持 SMS 的电话号码，或一个 Twilio Messaging Service。
- Twilio Account SID 和 Auth Token。
- 一个可公开访问、能够连到你的 OpenClaw Gateway 的 HTTPS URL。
- 一个发送方策略选择：`pairing` 用于私人使用，`allowlist` 用于预先批准的电话号码，`open` 仅用于有意公开的 SMS 访问。

如果同一个号码同时具备 SMS 和 Voice Call 功能，就把它同时用于两者。请在 Twilio 中分别配置 SMS webhook 和 Voice webhook；本页只涵盖 SMS webhook。

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

  <Step title="暴露精确的 SMS webhook 路径">
    你的公共 URL 必须将 SMS 路径路由到 Gateway 进程。如果你使用 Tailscale Funnel 进行本地测试，请显式暴露 `/webhooks/sms`：

```bash
tailscale funnel --bg --set-path /webhooks/sms http://127.0.0.1:<gateway-port>/webhooks/sms
tailscale funnel status
```

    Voice Call 和 SMS 使用不同的 webhook 路径。如果同一个 Twilio 号码同时处理两者，请在 Twilio 和你的隧道中都保留这两条路由的配置。

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

当你从主机环境获取密钥并进行单账号部署时，请使用环境变量方式：

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

`TWILIO_SMS_FROM` 也可作为 `TWILIO_PHONE_NUMBER` 的别名。当 Twilio 应通过 Messaging Service 选择发送方时，请使用 `TWILIO_MESSAGING_SERVICE_SID` 代替电话号码发送方。

### SecretRef auth token

`authToken` 可以是一个 SecretRef。当 Gateway 应从 OpenClaw secrets runtime 解析 Twilio Auth Token，而不是将明文配置存储在本地时，请使用此方式：

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

### 仅限 allowlist 的私人号码

当只有已知电话号码应该能够与代理通信时，请使用 `allowlist`：

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

### Messaging Service 发送方

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

- `pairing`（默认）
- `allowlist`（要求 `allowFrom` 中至少有一个发送方）
- `open`（要求 `allowFrom` 包含 `"*"`）
- `disabled`

`allowFrom` 条目应为 E.164 电话号码，例如 `+15551234567`。`sms:` 前缀也被接受并会被规范化。对于私人助手，建议使用带有明确电话号码的 `dmPolicy: "allowlist"`。

## 发送 SMS

出站 SMS 目标使用带有已选择 SMS 渠道的 `sms:` 服务前缀：

```bash
openclaw message send --channel sms --target sms:+15551234567 --message "hello"
```

当渠道选择是隐式时，`twilio-sms:+15551234567` 会选择此渠道，而不会接管 iMessage 已在使用的现有、由渠道拥有的 `sms:` 服务前缀。

```bash
openclaw message send --target twilio-sms:+15551234567 --message "hello"
```

CLI 需要显式的 `--target`。`defaultTo` 适用于自动化和代理发起的发送路径，在这些路径中，目标可以从渠道配置中解析出来。

来自入站 SMS 对话的代理回复会通过已配置的 Twilio 发送方自动回复给发送者。

SMS 输出为纯文本。OpenClaw 会去除 markdown、展平 fenced code blocks、保留可读链接，并在通过 Twilio 发送前拆分过长的回复。

## 验证设置

Gateway 启动后：

1. 确认 Gateway 日志显示了 SMS webhook 路由。
2. 运行 Twilio 端探测：

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

默认情况下，OpenClaw 会使用 `publicWebhookUrl` 和 `authToken` 验证 `X-Twilio-Signature`。请确保 `publicWebhookUrl` 与 Twilio 中配置的 URL 完全逐字节一致，包括 scheme、host、path 和 query string。

仅在本地隧道测试时，你可以设置：

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

## 多账号配置

当你运营多个 Twilio 号码时，请使用 `accounts`：

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

每个账号都应使用不同的 `webhookPath`。

## 故障排除

### Twilio 返回 403 或 OpenClaw 拒绝 webhook

检查 `publicWebhookUrl` 是否与 Twilio 中配置的 URL 完全一致，包括协议、主机、路径和查询字符串。Twilio 会对公开 URL 字符串进行签名，因此代理重写和备用主机名都可能破坏签名验证。

### 没有出现配对请求

检查 Twilio 号码的 **Messaging** webhook URL 和方法。它必须指向 SMS webhook URL，并且使用 `POST`。另外还要确认 Gateway 能通过公网或通过你的隧道访问。

如果 Twilio 消息日志显示错误 `11200`，说明 Twilio 已接受传入的 SMS，但无法访问你的 webhook。请检查：

- Twilio **Messaging > A message comes in** 指向 `publicWebhookUrl`。
- 方法是 `POST`。
- 隧道或反向代理暴露了完全一致的 `webhookPath`；如果使用 Tailscale Funnel，运行 `tailscale funnel status` 并确认已列出 `/webhooks/sms`。
- `publicWebhookUrl` 使用的协议、主机、路径和查询字符串与 Twilio 发送的一致，因此签名验证可以复现已签名的 URL。

### 发送外发消息失败

确认 `accountSid`、`authToken`，以及 `fromNumber` 或 `messagingServiceSid` 已正确解析。如果你使用的是 Twilio 试用账户，目标号码在发送外发 SMS 前可能需要先在 Twilio 中完成验证。

### 消息已到达，但代理没有回复

检查 `dmPolicy` 和 `allowFrom`。在默认的 `pairing` 策略下，发送者必须先获得批准，随后才会处理正常的 agent 回合。
