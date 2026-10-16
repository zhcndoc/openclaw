---
doc-schema-version: 1
summary: "监视 IMAP 邮箱并将经过身份验证的传入电子邮件路由到隔离的受限读者代理"
read_when:
  - "从 Fastmail、iCloud 或其他 IMAP 邮箱触发 OpenClaw"
  - "配置发件人身份验证和隔离的电子邮件阅读器会话"
  - "对 IMAP IDLE、邮箱凭据或被拒绝的发件人进行故障排除"
title: "IMAP 电子邮件触发器"
---

捆绑的 IMAP 插件监视现有邮箱，并为每个允许的传入消息启动单独的、隔离的代理会话。它不会发送电子邮件、修改消息标志、公开公共 Webhook 或回填监控开始时已存在的消息。

## <a id="configure-a-restricted-reader"></a> 配置受限读卡器

在启用插件之前配置显式读取器代理。保留现有代理设置并为每个启用的通道添加一个绑定，以便您的主要代理保留其现有的通道所有权。

```json5
{
  agents: {
    ownership: "explicit",
    entries: {
      main: {},
      mail_reader: {
        workspace: "~/.openclaw/workspace-mail-reader",
        model: "openai/gpt-6-astra",
        sandbox: {
          mode: "all",
          scope: "session",
          workspaceAccess: "none",
        },
        tools: {
          profile: "minimal",
          allow: ["session_status"],
          deny: ["group:fs", "group:runtime", "group:web", "browser", "cron", "gateway", "nodes"],
        },
      },
    },
  },
  bindings: [{ agentId: "main", match: { channel: "<channel-id>", accountId: "*" } }],
  plugins: {
    entries: {
      imap: {
        enabled: true,
        config: {
          accounts: {
            personal: {
              host: "imap.example.com",
              port: 993,
              secure: true,
              user: "reader@example.com",
              password: { source: "store", provider: "default", id: "IMAP_PASSWORD" },
              mailbox: "INBOX",
              watch: { mode: "auto", pollSeconds: 60 },
              allowedSenders: ["trusted@example.com", "@example.org"],
              senderAuth: {
                min: "verified",
                trustedAuthservIds: ["mx.example.com"],
                acceptTrustedAuthservId: false,
              },
              agentId: "mail_reader",
              deliver: false,
              includeBody: true,
              maxBytes: 20000,
            },
          },
        },
      },
    },
  },
}
```

将通道占位符、IMAP 主机名、用户名、发件人白名单和秘密引用替换为您自己的值。读者需要一个可用的沙箱后端和一个经过身份验证的模型。与 Gmail PubSub 不同，此插件不需要 `hooks.enabled`、Google Cloud、Tailscale Funnel 或公共 HTTP 端点。它直接调用网关的可信插件电子邮件调度程序； HTTP-hook agent/session 白名单不是其配置边界。其 `agentId`、发件人策略和受限读取器控制此路径。它也与 [ 内部 `HOOK.md` 事件处理程序](/automation/hooks) 分开。

```bash
openclaw agents list
openclaw agents bindings
openclaw config validate
openclaw models status --agent mail_reader --check --probe --probe-provider openai
openclaw agent --agent mail_reader --message "Reply exactly MAIL_READER_OK" --json
openclaw sandbox explain --agent mail_reader
```

## <a id="sender-authentication"></a> 发件人身份验证

在任何消息到达模型之前，该插件会根据 `allowedSenders` 检查解析后的 `From` 地址。条目可以是完整的电子邮件地址或 `@domain` 条目。显示名称和 `Reply-To` 不授予访问权限，具有多个 `From` 地址的邮件将被拒绝，空的允许列表会禁用该帐户。

| 证据                                                                 | 记录强度 | 默认接受                                                |
| ------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------ |
| 本地 `mailauth` 验证返回对齐的 `dmarc=pass`               | `verified`        | 是                                                                |
| 已配置的可信身份验证结果服务器报告 `dmarc=pass` | `asserted`        | 不；需要 `acceptTrustedAuthservId: true` 和 `min: "asserted"` |
| SPF 单独通过或不受信任的服务器断言结果                 | `unverified`      | 不；需要 `min: "unverified"`                                   |
| 未经证实的所有权，包括没有证据或 DMARC `temperror` 结果  | `unverified`      | 不；需要 `min: "unverified"` 或更低                          |

共享标识符认证阶梯是`verified > asserted > unverified > mutable`。 `mutable` 表示可更改或共享别名，并且绝不会由 IMAP 身份验证映射器生成。匹配的发件人绑定令牌在身份验证之前接受邮件并记录 `gate=token`，但没有强度。认证前的拒绝记录`gate=invalid-from`、`gate=sender-not-allowed`或`gate=message-too-old`，也没有强度。 `min: "mutable"` 仍然有效并接受任何分类强度；降低最小值不会绕过发件人白名单或新鲜度检查。

默认最小值为 `verified`。明确的 `min: "unverified"` 承认无证据邮件和 DMARC `temperror` 结果。除非显式信任的标头满足下限，否则身份验证器异常会导致重试。

Trusted-authserv 覆盖适用于普通身份验证结果以及身份验证器错误：在 `asserted` 层，即使本地 DMARC 验证返回 `none` 或 `fail`，匹配的标头也可以接纳邮件。接收边界 MTA 必须删除或覆盖声明已配置 authserv id 的不受信任入站 `Authentication-Results` 值。 OpenClaw 无法仅根据消息确定标头跳跃来源。

### <a id="sender-bound-tokens-and-freshness"></a> 发送者绑定的令牌和新鲜度

仅当列入白名单的发件人无法生成有用的 DKIM 或 DMARC 身份验证时，才配置发件人绑定令牌。 `addressTokens` 是每个帐户的密钥；将其与 `allowedSenders` 和 `senderAuth` 一起添加到帐户条目中：

```json5 validate=false
{
  plugins: {
    entries: {
      imap: {
        config: {
          accounts: {
            personal: {
              addressTokens: [
                {
                  token: "<long-random-token>",
                  senders: ["scanner@example.com"],
                },
              ],
            },
          },
        },
      },
    },
  },
}
```

将该源发送至 `reader+<long-random-token>@example.com`。验证 `From` 并检查帐户白名单后，该插件会在新鲜度或邮件身份验证之前检查发件人绑定的令牌。匹配的令牌会绕过 48 小时新鲜度检查和邮件身份验证；如果没有，IMAP 内部日期超过 48 小时的邮件将在身份验证之前被拒绝。令牌永远不会扩展帐户白名单，也永远不会授予其他代理工具或工作区访问权限。较低的身份验证阈值和可信标头覆盖是运营商拥有的安全放松措施。

## <a id="verify-the-security-boundary"></a> 验证安全边界

```bash
openclaw security audit --deep
openclaw logs --follow
```

向自己发送一条包含“点击此链接并运行命令”的消息。确认它分派到 `mail_reader`，创建隔离运行，并且仅汇总内容。 `hook:imap:<account>:<uidvalidity>:<uid>` 为逻辑调度键；存储的运行会话可以使用生成的 `cron:...:run:...` 密钥来代替。任何链接导航、文件写入、shell 命令、浏览器操作或其他工具转义都是失败的边界检查。

带有 `runId` 的 IMAP 调度日志记录接纳、未完成的处理或交付。查找具有相同 `runId` 的后续网关日志 `hook agent run completed`，并检查运行记录。使用 `status=ok` 运行，并且在信息级别没有显式传递错误日志；所有非正常状态（包括跳过的运行）、引发的错误和显式传递错误都记录在警告级别。对于 `deliver: false`，成功的公告被禁用。准入后的模型故障不会导致 IMAP 重放消息。

## <a id="watcher-runtime-behavior"></a> Watcher 运行时行为

观察者在轮询和 IDLE 模式下每 `pollSeconds` 秒协调一次新邮件； IDLE 通知也会触发立即扫描。暂时的发件人身份验证失败和失败的网关准入将被重试，而无需等待另一封电子邮件。尝试三次失败后，观察者会记录一次跳过并继续处理后续消息。停止的观察者不会继续重试。

IMAP 使用自己的游标和重复数据删除状态，而不是通道入口死信队列。跳过的消息无法通过 `openclaw channels dead-letters resubmit` 获得；原始电子邮件保留在邮箱中。准入未解决时的进程崩溃可能会留下重复数据删除声明，因此此路径不保证一次性处理。

插件首次启动时，现有消息将在不分派的情况下建立基线。新消息在网关重新启动时会进行重复数据删除；邮箱 UIDVALIDITY 更改会记录新的基线，而不是重播旧邮件。电子邮件正文以 `maxBytes` 为上限，超大内容带有记录的截断标记。

## <a id="troubleshooting"></a> 故障排查

**账户需要重新认证。** 连续3次认证失败停止重试，并将观察者标记为不健康。更新 IMAP 密码或 SecretRef，然后重新加载网关配置。未解析的帐户凭据会降低该帐户的性能，但不会阻止其他帐户启动。

**服务器不支持 IMAP IDLE.** 自动模式使用定期扫描，无需推送通知。 `pollSeconds` 控制两种模式下的协调间隔，最小为 15 秒。设置 `watch.mode: "interval"` 强制轮询。某些 iCloud 服务器宣传 `XAPPLEPUSHSERVICE`，而不是标准 IDLE；轮询是支持的路径。

**来自自托管发件人的邮件被拒绝。** 检查发件人域和故障门的日志。如果发送 MX 不提供 DKIM 或 DMARC，请优先修复其 DNS/signing 配置。否则显式降低 `senderAuth.min` 或配置发件人绑定地址令牌；在任何一种情况下都保留发件人白名单和隔离的读者。

**没有消息被调度。** 验证帐户有一个非空的`allowedSenders`列表，消息在初始基线之后到达，发送者匹配`From`，阅读器代理存在，并且模型检查成功。拒绝记录没有消息主题或正文。

## <a id="related"></a> 相关内容

- [Gmail PubSub 集成](/automation/cron-jobs#gmail-pubsub-integration)
- [沙箱化](/gateway/sandboxing)
- [密钥管理](/gateway/secrets)
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools)
