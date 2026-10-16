---
summary: "修复了静默组、丢失命令、拒绝令牌和不稳定轮询的问题"
read_when:
  - "机器人未在 Telegram 群组中回复"
  - "命令丢失或启动时令牌被拒绝"
  - "长轮询停顿或 Telegram API 调用失败"
title: "Telegram 故障排除"
sidebarTitle: "故障排查"
---

症状优先检查是否存在不正常行为的 Telegram 机器人。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="bot-does-not-respond-to-non-mention-group-messages" title="机器人不响应未提及的群组消息">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见：BotFather `/setprivacy` -> Disable，然后将机器人从群组中移除并重新添加。
    - 当配置期望接收未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 检查显式数字组 ID；无法检查通配符 `"*"` 的成员资格。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion id="bot-not-seeing-group-messages-at-all" title="机器人根本看不到群组消息">

    - 当 `channels.telegram.groups` 存在时，必须将该群组列出（或包含 `"*"`）。
    - 验证机器人是否已加入该群组。
    - 查看 `openclaw logs --follow` 中的跳过原因。

  </Accordion>

  <Accordion id="commands-work-partially-or-not-at-all" title="命令部分起作用或根本不起作用">

    - 授权您的发送者身份（配对and/or数字`allowFrom`）；即使组策略为 `open`，命令授权仍然适用。
    - `setMyCommands failed` 和 `BOT_COMMANDS_TOO_MUCH` 表示本机菜单条目过多；减少 plugin/skill/custom 命令或禁用本机菜单。
    - 如果日志显示会话已存档，请在发送本机命令（例如 `/status`）之前恢复该会话。本机命令不会恢复存档的会话；他们的存档拒绝被记录为失败的入站事件而不是重试。
    - `deleteMyCommands` / `setMyCommands` 启动调用和 `sendChatAction` 键入调用受到限制，并在请求超时时通过 Telegram 的传输回退重试一次。持续的 network/fetch 错误通常意味着 DNS/HTTPS 到 `api.telegram.org` 无法访问。

  </Accordion>

  <Accordion id="startup-reports-unauthorized-token" title="启动报告未经授权的令牌">

    - `getMe returned 401` 是针对所配置机器人令牌的 Telegram 身份验证失败。请在 BotFather 中重新复制或重新生成令牌，然后更新 `channels.telegram.botToken`、`tokenFile`、`accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`（默认账户）。
    - 启动期间出现的 `deleteWebhook 401 Unauthorized` 也属于身份验证失败；将其视为“没有 webhook”只会把同样的坏令牌失败推迟到后续的 API 调用。

  </Accordion>

  <Accordion id="a-final-reply-fails-during-a-network-interruption" title="网络中断期间最终回复失败">

    OpenClaw 在出现不明确的网络故障后重试普通文本或富文本最终回复一次。 Recovery发送保存的回复；它不会运行模型或重复已完成的工具。仅当恢复也失败时才会出现送达通知。

    Telegram 不为这些发送提供幂等密钥或聊天历史记录查找。如果原始答复已到达但其确认丢失，则重试可能会产生副本。这种权衡仅适用于没有已知接受块的最终文本。媒体、交互式负载和工具启动的消息操作不会盲目重播。

    网关日志包括可用的传输错误代码和系统调用。单独的通用 `Network request ... failed` 消息并不显示 Telegram 是否收到请求。

  </Accordion>

  <Accordion id="polling-or-network-instability" title="轮询或网络不稳定">

    下面的 `Node 22+` 参考描述了 Node 网络行为，而不是 OpenClaw 支持的运行时版本。有关当前要求，请参阅 [Node.js](/install/node)。

    - 带有自定义 fetch/proxy 的 Node 22+ 如果 `AbortSignal` 类型不匹配，可能会触发立即中止行为。
    - 某些主机会先将 `api.telegram.org` 解析到 IPv6；损坏的 IPv6 出站会导致间歇性的 API 失败。
    - 带有 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!` 的日志会作为可恢复的网络错误重试。
    - 在轮询启动期间，OpenClaw 重用成功启动的 `getMe` 检查 grammY，因此运行程序在第一个 `getUpdates` 之前不需要第二个 `getMe`。
    - 如果在轮询启动期间 `deleteWebhook` 因瞬时网络错误而失败，OpenClaw 会继续进入长轮询，而不是再进行一次轮询前的控制平面调用。若 webhook 仍然处于活动状态，随后会在 `getUpdates` 中表现为冲突；OpenClaw 会重建传输并重试 webhook 清理。
    - 日志中的 `Polling stall detected` 表示 OpenClaw 会在默认 120 秒内没有完成的长轮询存活信号后重启轮询并重建传输。
    - `openclaw channels status --probe` 和 `openclaw doctor` 会在以下情况发出警告：运行中的轮询账户在启动宽限期后尚未完成 `getUpdates`、运行中的 webhook 账户在启动宽限期后尚未完成 `setWebhook`，或者最近一次成功的轮询传输活动已过期。
    - Telegram 会尊重进程代理环境变量用于 Bot API 传输：`HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍可绕过 `api.telegram.org`。
    - 如果在服务环境中设置了 `OPENCLAW_PROXY_URL` 且未存在标准代理环境变量，Telegram 也会使用该 URL 进行 Bot API 传输。
    - 如果文本有效，但附件因 `getaddrinfo EAI_AGAIN` 或 `ENOTFOUND` 失败，则裸代理环境变量仍会使媒体下载受到本地 DNS 检查。将 `channels.telegram.proxy` 设置为您可信的 HTTP（S） 或 SOCKS5 代理，以便它解析媒体主机名，或配置 [ 托管网络代理 ](/security/network-proxy)。代理端点本身必须保持本地可解析和可访问。 `dangerouslyAllowPrivateNetwork` 不修复丢失的 DNS。
    - 在具有不稳定直接 egress/TLS 的 VPS 主机上，通过代理路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Telegram DNS 结果顺序遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然后是 `channels.telegram.network.dnsResultOrder`，然后是进程默认值，如果没有适用，则回退到 `ipv4first`。对于 `ipv4first`，Telegram 默认禁用地址族竞争，因此无法到达的 IPv6 路由不会干扰首选 IPv4 连接。 `verbatim` 使地址族选择保持启用状态，尝试超时时间为 300 毫秒（WSL2 除外）。显式 `network.autoSelectFamily` 或其环境覆盖优先。
    - 在IPv6损坏的双栈主机上，设置`channels.telegram.network.dnsResultOrder: "ipv4first"`；无需更改 `NODE_OPTIONS`。事实证明在发送之前发生的连接失败仍可重试；发送后的超时仍然不明确，以避免重复回复。
    - 在 WSL2 上，或者当 IPv4-only 行为更有效时，强制选择地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - 默认情况下，RFC 2544 个基准范围答案 （`198.18.0.0/15`） 已允许用于 Telegram 媒体下载。如果受信任的假 IP 或透明代理在媒体下载期间将 `api.telegram.org` 重写为其他 private/internal/special-use 地址，请选择仅绕过 Telegram-：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 该选项也可在账户级别通过 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 单独启用。
    - 如果你的代理将 Telegram 媒体主机解析到 `198.18.x.x`，请先保持危险标志关闭——该范围默认已允许。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram 媒体 SSRF 防护。仅应在可信的、由操作者控制的代理环境（Clash、Mihomo、Surge fake-IP 路由）中使用，这些环境会在 RFC 2544 基准范围之外合成私有或特殊用途答案。普通的公网 Telegram 访问请保持关闭。
    </Warning>

    - 临时环境变量覆盖：`OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`、`OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`、`OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`。
    - 验证 DNS 解析结果：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多帮助：[渠道故障排查](/channels/troubleshooting)。
