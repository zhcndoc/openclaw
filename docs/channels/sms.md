---
summary: "Twilio SMS/MMS 设置、访问控制、webhook 和投递状态"
read_when:
  - 想要通过 Twilio 将 OpenClaw 连接到 SMS 或 MMS
  - 需要设置 SMS/MMS webhook 或允许列表
title: "SMS"
---

OpenClaw 通过 Twilio 电话号码或消息服务接收和发送 SMS/MMS。Gateway 注册一个 webhook 路由（默认为 `/webhooks/sms`），默认情况下验证 Twilio 请求签名，通过 Twilio 的 Messages API 发送回复，并记录出站消息的投递回调。

状态：官方插件，需单独安装。仅支持 SMS 文本和 MMS 附件，以及直接消息。

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
- 一个拥有支持 SMS 的电话号码或 Twilio Messaging Service 的 Twilio 账户。MMS 需要支持 MMS 的发送方；原生 MMS 的送达还取决于目标国家/地区和运营商。
- Twilio Account SID 和 Auth Token。
- 一个能够访问 OpenClaw Gateway 的公共 HTTPS URL。
- 选择发送方策略：私用时使用 `pairing`（默认），为预先批准的电话号码使用 `allowlist`，或仅在有意公开提供 SMS 访问时使用 `open`。

如果一个 Twilio 号码同时具备这两种能力，它既可以用于 SMS，也可以用于 [语音通话](/plugins/voice-call)。SMS webhook 和语音 webhook 在 Twilio 中分别配置，并使用不同的 Gateway 路径；本页仅涵盖 SMS webhook。

## 美国 A2P / 10DLC 投递

应用通过美国本地 10DLC 号码向美国收件人发送的 SMS 和 MMS 需要进行美国 A2P 10DLC 注册。免费电话号码和短代码使用单独的验证流程。这与 OpenClaw 渠道设置分开：Webhook 签名验证、配对和出站凭据都可能正确，但运营商仍可能阻止或过滤消息投递。

在依赖美国 10DLC 发送方之前，请在 Twilio 中确认：

- 账户已付费；Twilio 试用账户无法注册 A2P 10DLC。
- Twilio Trust Hub 中的主要或次要合规档案已获批准。
- 品牌和活动已完成注册并获批准。
- Twilio 电话号码的 A2P 状态为 `REGISTERED`，并且位于与已批准活动关联的消息服务的发送方池中；或者，你在此处配置的 `messagingServiceSid` 就是该已批准的服务。
- 活动描述的是真实的 OpenClaw 消息使用场景，并包含相匹配的示例消息。
- 每个网站、关键词、线下、纸质或二维码选择加入路径都已完整说明。如果该流程未公开可见，请提供可公开访问的截图或其他证据。
- 消息同意是自愿的，并且与必需的服务条款、账户创建或购买行为相互独立，同时包含 Twilio 要求的隐私政策、条款、发送频率、资费和退订说明。
- 你保留同意证明、明确标识发送方、遵守标准的一步退订关键词，并且不购买、租用、出售或转让同意。退订后，除非收件人再次选择加入，否则只能发送一条确认消息。

请以 Twilio 作为当前要求的权威来源：[A2P 10DLC 概览](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)、[注册快速入门](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart)以及[所需的企业和活动信息](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info)。本节提供的是设置指导，不构成法律建议。

如果 Twilio 在注册审核期间拒绝品牌或活动，请先在 Twilio 中解决该问题，然后再将发送方用于 OpenClaw。[`30909`](https://www.twilio.com/docs/api/errors/30909) 表示消息流程或行动号召不完整或无法验证。[`30923`](https://www.twilio.com/docs/api/errors/30923) 表示消息同意是服务、账户创建或购买的必要条件，或与服务条款捆绑在一起。[`30893`](https://www.twilio.com/docs/api/errors/30893) 表示示例消息与声明的使用场景不匹配

## 快速设置

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/sms
    ```
  </Step>
  <Step title="创建或选择 Twilio 发送方">
    在 Twilio 中，打开 **电话号码 > 管理 > 活动号码**，然后选择一个支持 SMS 的号码。要发送附件，请选择一个同时支持 MMS 的号码。保存：

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

  <Step title="将 Twilio 指向网关 webhook">
    在 Twilio 电话号码设置中，打开 **消息传送**，并将 **收到消息时** 设置为：

```text
https://gateway.example.com/webhooks/sms
```

    使用 HTTP `POST`。默认的本地路径是 `/webhooks/sms`；如果你需要不同的路由，请更改 `channels.sms.webhookPath`。

  </Step>

  <Step title="公开完整的 SMS webhook 路径">
    你的公共 URL 必须将 SMS 路径路由到 Gateway 进程（默认端口为 `18789`）。同一路径用于处理传入的 Twilio webhook，以及 OpenClaw 发送 MMS 时使用的短期令牌化附件。如果你使用 Tailscale Funnel 进行本地测试，请显式公开 `/webhooks/sms`：

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

| Key                                     | Default         | Purpose                                                                                |
| --------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `enabled`                               | `true`          | 启用或禁用渠道/账号。                                                                     |
| `accountSid`                            | —               | Twilio 账号 SID（`AC...`）。                                                            |
| `authToken`                             | —               | Twilio Auth Token；纯文本字符串或 SecretRef。                                           |
| `fromNumber`                            | —               | E.164 格式的发送方号码。                                                                |
| `messagingServiceSid`                   | —               | Messaging Service SID（`MG...`），在未解析出 `fromNumber` 时使用。                      |
| `defaultTo`                             | —               | 发送流程未指定明确目标时使用的默认目的地。                                                |
| `webhookPath`                           | `/webhooks/sms` | 用于接收 Twilio webhook 的 Gateway HTTP 路径。                                           |
| `publicWebhookUrl`                      | —               | 公共 Twilio webhook URL；签名验证和外发 MMS 托管所必需。                                 |
| `dangerouslyDisableSignatureValidation` | `false`         | 跳过 `X-Twilio-Signature` 检查；仅限本地隧道测试使用。                                   |
| `dmPolicy`                              | `"pairing"`     | `pairing`、`allowlist`、`open` 或 `disabled`。                                          |
| `allowFrom`                             | `[]`            | E.164 格式的允许发送方号码，或在 `dmPolicy: "open"` 时使用 `"*"`。                     |
| `textChunkLimit`                        | `1500`          | 每个外发 SMS 分块的最大字符数。                                                         |
| `accounts`, `defaultAccount`            | —               | 多账号映射和默认账号 ID。                                                               |

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

### SecretRef 身份验证令牌

`authToken` 可以是 SecretRef（`source: "env" | "file" | "exec" | "store"`）。当 Gateway 应从 OpenClaw secrets runtime 中解析 Twilio Auth Token，而不是存储明文配置时，请使用此方式：

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

### 发送 MMS

使用常规的结构化媒体字段或 CLI 的 `--media` 选项：

```bash
openclaw message send \
  --channel sms \
  --target sms:+15551234567 \
  --message "photo" \
  --media ./photo.jpg
```

OpenClaw 会通过共享的出站媒体策略加载附件，将其临时存储在插件专用的 SQLite 状态中，并在配置的 `publicWebhookUrl` 路径上为 Twilio 提供带令牌的 HTTPS URL。支持仅发送媒体。

生成的媒体 URL 是一种承载者能力，有效期为 10 分钟。请将其完整查询字符串视为机密：配置反向代理和访问日志以省略查询字符串，或编辑每个查询值。OpenClaw Gateway 路由诊断仅记录路径名，但无法控制上游代理日志。

OpenClaw 的出站投递会附加一个媒体项。OpenClaw 将 JPEG、JPG、PNG 和 GIF 附件限制为 5,000,000 字节；其他受支持的媒体类型限制为 500,000 字节。`application/vcard` 附件必须仅包含媒体；Twilio 不接受带有标题的此类附件。目标运营商可能会实施更小的限制，或拒绝不受支持的格式。Twilio 必须能够在没有 HTTP 身份验证的情况下获取生成的 URL，因此 `publicWebhookUrl` 不能包含嵌入式用户信息；基于查询的反向代理令牌会被保留。

对于传入的 MMS，OpenClaw 最多处理 10 个附件，总下载量最多为 5 MiB。任何额外或不可用的附件都会生成一条可见的媒体不可用通知，而不是丢弃已签名的消息或静默地发送空回合。仅在发送者授权后才会进行下载，同时使用 Twilio 身份验证和对 `api.twilio.com` 主机的限制。

### 投递状态

每次成功的出站发送后，如果响应中包含 Twilio API 状态，OpenClaw 都会存储初始的 Twilio API 状态。当 `publicWebhookUrl` 有效时，每条出站消息还会向 Twilio 提供一个派生的 `StatusCallback` URL，该 URL 会保留其基础 URL 和连接覆盖设置，同时添加所需的投递回调重试设置。无效或过长的派生 URL 将被省略。

后续的投递回调会更新同一条插件专用的 SQLite 记录。语义重试会被去重，较旧的状态转换无法使终态回退，冲突的终态观察结果会报告为 `conflicted`，而不是选择一个错误的胜者。记录包含消息 SID、状态／错误元数据和时间戳，但不包含消息正文或电话号码地址。每条记录会在最近一次观察结果后的最多 30 天内保留，同时受插件范围内 5,000 条消息的上限和最早记录淘汰机制约束。

## 验证设置

Gateway 启动后：

1. 确认 Gateway 日志显示 SMS webhook 路由。
2. 运行 Twilio 端探测（检查已配置的 Twilio webhook URL/方法、最近的入站错误以及最近存储的出站传送状态）：

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

- 仅限 `POST`。
- 每个 SMS 账户、Webhook 路由和解析出的客户端地址每分钟允许失败请求 300 个。所有请求都会计入此预算，但仅当正文解析或 Twilio 签名验证失败后才会返回 HTTP 429。
- 已签名的投递回调会在入站发送者配额检查之前完成分类，并在 HTTP 200 之前提交到有界、插件作用域的 SQLite 状态中。它们不会消耗入站分发配额：这些配额用于保护原始入站消息接收和下游代理分发。投递持久化另有一个针对每个 SMS 账户路由、每分钟 3,000 个回调的安全熔断器；超过该限制时会返回 HTTP 503，且不会写入上述持久化接受标记。这是故障关闭式过载保护，而非无损背压。禁用签名验证时，投递回调在持久化前首先受更严格的、按解析出的客户端地址计算的每分钟 30 个请求上限约束。
- 在正文解析和签名验证通过后，每个 SMS 账户、Webhook 路由和已验证发送者每分钟最多接受 30 个可分发回调（超过后返回 HTTP 429）。发送者键是签名所覆盖的 `From` 值的规范化形式，因此等价的 SMS/RCS 地址形式共享一个预算；某个发送者的洪泛流量只会耗尽其自身预算；位于 Twilio 共享出口地址之后的其他发送者的回调仍可进行分发。无效或缺失的发送者值共享一个独立的空发送者预算。
- 每个 SMS 账户和 Webhook 路由每分钟最多接受 300 个经过验证的回调。此限制约束了来自大量不同已签名发送者的持久化入口压力，同时不会重新造成共享出口地址之间的交叉限流。禁用签名验证时，`From` 不具备任何真实性保证；此时适用更严格的、按解析出的客户端地址计算的每分钟 30 个请求的分发上限，而不是已验证发送者和聚合策略。
- 客户端地址通过共享 Gateway 的受信任代理规则解析。如果 `gateway.trustedProxies` 包含转发 Twilio 回调的反向代理，OpenClaw 会使用转发的客户端地址作为基于地址的限流键；否则会回退到直接套接字地址。
- 入站负载必须携带非空的 `AccountSid`，且必须与配置的 `accountSid` 完全匹配。直接号码回调必须指向配置的 `fromNumber`；消息服务回调必须携带配置的 `MessagingServiceSid`。原始回调会先提交到持久化入口队列并得到确认；随后，身份不匹配会在排空过程中被标记为永久性无效负载失败，且永远不会被分发或允许下载媒体。
- 缺少 `AccountSid` 或 `AccountSid` 不同的投递回调会得到确认、被记录日志，并被有意不予存储。
- 持久化入口队列会对重放的 `MessageSid` 值进行去重。已完成消息的墓碑记录保留 24 小时（每个账户最多 20,000 条）；永久失败的墓碑记录保留 30 天（最多 1,000 条）。
- 投递观测使用不含个人身份信息的语义指纹，该指纹由来源、消息 SID、规范化状态、错误代码和运营商完成日期组成。同一出站消息的多个状态仍会彼此区分。记录会在最近一次观测后的 30 天过期，但 5,000 条消息的上限可能会使较早的记录提前被逐出。
- 超过 32 KB 的请求正文会被拒绝。

OpenClaw 会在生成的投递 `StatusCallback` URL 中添加 `5xx` 重试策略和重试次数，以便 Twilio 重试失败的 SQLite 提交或过载的投递状态路由。Twilio 默认不会重试 HTTP 429。`#rp=4xx` 和 `#rp=all` 连接覆盖选项可启用对 4xx 的重试，但 Twilio 会将完整的重试事务限制在 15 秒内。429 或投递状态 503 都不能保证之后能够恢复；当最终状态的完整性很重要时，请使用对账。遗漏的中间状态无法重建。

对于对完整性敏感的工作流，请持久化 Message SID，并通过轮询 Twilio 的 Message 资源来对账过期的非终态记录。Twilio 的[投递日志记录指南](https://www.twilio.com/docs/messaging/guides/outbound-message-logging)建议：如果消息在 12 小时内尚未达到 `delivered` 或 `undelivered` 状态，则进行轮询，因为状态回调可能尚未到达。SMS 备用 URL 不能替代此机制：它仅用于处理获取或执行[入站 SMS TwiML webhook](https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource)时发生的失败。

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

如果 Twilio 收到持久确认，但没有出现配对请求，请检查 Gateway 日志中是否存在永久性无效负载故障。确认回调中的 `AccountSid` 和 `To` 与配置的账户和 `fromNumber` 匹配，或者确认其 `MessagingServiceSid` 与配置的 Messaging Service 匹配。

### 未出现配对请求

检查 Twilio 号码的 **Messaging** webhook URL 和方法。它必须指向 SMS webhook URL，并且使用 `POST`。另外还要确认 Gateway 能通过公网或通过你的隧道访问。

如果 Twilio 消息日志显示错误 `11200`，说明 Twilio 已接受传入的 SMS，但无法访问你的 webhook。请检查：

- Twilio **Messaging > A message comes in** 指向 `publicWebhookUrl`。
- 方法是 `POST`。
- 隧道或反向代理暴露了完全一致的 `webhookPath`；如果使用 Tailscale Funnel，运行 `tailscale funnel status` 并确认已列出 `/webhooks/sms`。
- `publicWebhookUrl` 使用的协议、主机、路径和查询字符串与 Twilio 发送的一致，因此签名验证可以复现已签名的 URL。

`openclaw channels status --channel sms --probe` 会同时显示 Twilio webhook 设置不匹配和最近的 `11200` 错误。

### 外发发送失败

确认 `accountSid`、`authToken` 以及 `fromNumber` 或 `messagingServiceSid` 之一已成功解析。Twilio 试用账户只能向账户注册国家/地区内已验证的收件人发送消息，并且必须使用 Twilio 预定义的内容；不支持自定义 SMS 正文。试用账户也无法注册 A2P 10DLC，因此请先升级账户，然后再注册美国 10DLC 发送方。

### Twilio 接受发送请求，但后续传递失败

先查看 OpenClaw 存储的传递状态：

```bash
openclaw channels status --channel sms --probe --json
```

如果最近的外发状态为 `failed` 或 `undelivered`，请使用其 `messageSid` 在 Twilio 中检查最终的消息状态和错误代码。[`30034`](https://www.twilio.com/docs/api/errors/30034) 表示发送方尚未注册，或不在与已批准 Campaign 关联的 Messaging Service 的 Sender Pool 中。[`30035`](https://www.twilio.com/docs/api/errors/30035) 表示 Twilio 仍在注册、注销或重新分配该号码；请等待其状态变为 `REGISTERED` 后再发送。

### 消息已到达，但代理没有回复

检查 `dmPolicy` 和 `allowFrom`。在默认的 `pairing` 策略下，发送者必须先获得批准，随后才会处理正常的代理回合。
