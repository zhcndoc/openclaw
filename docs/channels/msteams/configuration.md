---
summary: "Microsoft Teams 配置键、环境变量和历史限制"
read_when:
  - "查找 `channels.msteams` 配置密钥"
  - "从环境变量设置 Teams 凭据"
  - "调整到达提示的历史记录数量"
title: "Microsoft Teams配置"
sidebarTitle: "配置"
---

`channels.msteams` 设置、代表身份验证密钥的环境变量以及历史上下文规则。

## <a id="multiple-bot-accounts"></a> 多个机器人帐户

对每个 Teams 机器人注册使用 `channels.msteams.accounts.<id>`，然后使用 `bindings[].match.accountId` 路由该帐户。根设置是共享默认值；帐户设置会覆盖它们。

```json5
{
  bindings: [
    { agentId: "main", match: { channel: "msteams", accountId: "default" } },
    { agentId: "support", match: { channel: "msteams", accountId: "support" } },
  ],
  channels: {
    msteams: {
      enabled: true,
      tenantId: "<TENANT_ID>",
      webhook: { path: "/api/messages" },
      dmPolicy: "allowlist",
      allowFrom: ["00000000-0000-0000-0000-000000000000"],
      defaultAccount: "default",
      accounts: {
        default: {
          appId: "<PRIMARY_CLIENT_ID>",
          appPassword: "<PRIMARY_CLIENT_SECRET>",
        },
        support: {
          appId: "<SUPPORT_CLIENT_ID>",
          appPassword: "<SUPPORT_CLIENT_SECRET>",
          webhook: { path: "/api/messages/support" },
          allowFrom: ["11111111-1111-1111-1111-111111111111"],
        },
      },
    },
  },
}
```

- Enabled 帐户必须使用唯一的 `appId` 值和 Webhook 路径。所有机器人都会收到 `gateway.port` 上的回调；不需要单独的侦听器端口。
- 默认帐户使用根 Webhook 路径（省略时为 `/api/messages`）。没有显式路径的命名帐户会附加其规范化帐户 ID：`support` 使用 `/api/messages/support`。将每个 Azure Bot 消息传递终结点设置为其自己的路径，例如 `https://gateway.example.com/api/messages/support`。
- 命名帐户必须定义​​自己的`appId`和`appPassword`以进行秘密身份验证。这些字段不是从根继承的。
- `tenantId`、联合身份验证设置、访问策略、team/channel 允许列表、流式传输、SSO、委派身份验证和传递设置从根继承，除非帐户覆盖它们。 `legacyWebhook` 永远不会继承到命名帐户；保持兼容性侦听器明确并为每个侦听器提供唯一的端口。
- 现有根级单机器人凭据仍保留默认帐户以实现兼容性。配置该根身份或 `accounts.default`，而不是同时配置两者。

## <a id="environment-variables"></a> 环境变量

这些与身份验证相关的配置密钥可以通过环境变量设置，而不是仅针对默认帐户的 `openclaw.json`。指定帐户必须在配置中定义其机器人身份（其他密钥，例如 `groupPolicy` 或 `historyLimit`，仅用于配置）：

| 环境变量                              | 配置键                | 笔记                               |
| ------------------------------------ | ------------------------- | ----------------------------------- |
| `MSTEAMS_APP_ID`                     | `appId`                   |                                     |
| `MSTEAMS_APP_PASSWORD`               | `appPassword`             |                                     |
| `MSTEAMS_TENANT_ID`                  | `tenantId`                |                                     |
| `MSTEAMS_AUTH_TYPE`                  | `authType`                | `"secret"` 或 `"federated"`         |
| `MSTEAMS_CERTIFICATE_PATH`           | `certificatePath`         | 联合身份验证 + 证书             |
| `MSTEAMS_CERTIFICATE_THUMBPRINT`     | `certificateThumbprint`   | 可接受，但不是身份验证所必需     |
| `MSTEAMS_USE_MANAGED_IDENTITY`       | `useManagedIdentity`      | 联合身份验证 + 托管身份        |
| `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID` | `managedIdentityClientId` | 仅限用户分配的托管身份 |

## <a id="history-context"></a> 历史上下文

- `channels.msteams.historyLimit` 控制将多少条最近的 channel/group 消息包装到提示中。回退到 `messages.groupChat.historyLimit`，然后默认为 50。将 `0` 设置为禁用。
- Graph 线程上下文将父级回复和最多 50 个回复以及最近的频道历史记录一起添加。 Graph 按最旧的顺序返回回复，并将每页上限限制为 50，因此该插件会遵循连续链接到达最新的回复，然后保留最新的窗口。如果无法完整检索回复页面，或者它们的时间戳不完整，则忽略线程回复充实，而不是用最旧的优先前缀替换。它排除触发消息并将历史记录与发送者的命令文本分开，因此历史记录中引用的命令不会执行。长提取的消息将其开头和结尾保留在提示的每条消息限制内。
- Thread 和引用的附件上下文遵循 `channels.msteams.contextVisibility`，回落到 `channels.defaults.contextVisibility`，然后是 `all`。使用 `allowlist` 按发件人白名单 （`allowFrom` / `groupAllowFrom`） 进行过滤，或使用 `allowlist_quote` 过滤线程历史记录，同时允许引用上下文。
- DM 历史可通过 `channels.msteams.dmHistoryLimit`（用户回合）进行限制。按用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## <a id="configuration"></a> 配置

关键设置（共享通道模式请参见 [/gateway/configuration](/gateway/configuration)）：

- `channels.msteams.enabled`：enable/disable 通道。
- `channels.msteams.defaultAccount`：省略`accountId`时使用的帐户。
- `channels.msteams.accounts.<id>.enabled`：enable/disable 1 个 Teams 机器人帐户。
- `channels.msteams.accounts.<id>.appId`、`channels.msteams.accounts.<id>.appPassword`、`channels.msteams.accounts.<id>.webhook.path`：每个机器人身份、秘密和网关回调路径。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：机器人凭据。
- `channels.msteams.cloud`：Teams SDK 云环境（`Public`、`USGov`、`USGovDoD` 或 `China`；默认 `Public`）。对于 USGov/DoD SDK 云环境，请与 `serviceUrl` 一起设置；China 使用 SDK 预设和已存储的 Azure China Bot Framework 会话引用，并禁用基于 Graph 的辅助功能，直到 Azure China Graph 路由上线。
- `channels.msteams.serviceUrl`：用于 SDK 主动操作的 Bot Connector 服务 URL 边界。公有云使用 SDK 默认值；用于 GCC（`https://smba.infra.gcc.teams.microsoft.com/teams`）、GCC High 或 DoD 时请设置。China 在存储的会话引用来自 21Vianet 运营的 Teams 时，接受 Azure China Bot Framework 通道主机。
- `channels.msteams.webhook.path`：网关HTTP路由（省略或空使用`/api/messages`），在`gateway.port`（默认`18789`）上服务。
- `channels.msteams.legacyWebhook`：显式兼容性侦听器。 `{ port, host? }` 选择一个端点，当省略 `host` 时保留先前的通配符绑定。省略或 `false` 不打开单独的侦听器。
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认 `pairing`）。
- `channels.msteams.allowFrom`：DM 白名单（建议使用 AAD 对象 ID）。稳定的 AAD 对象 ID 还授权审批操作。当图形访问可用时，向导会在设置过程中将名称解析为 ID。
- `channels.msteams.defaultTo`：默认出站目标；稳定的 AAD 对象 ID 也可以授权审批操作。
- `channels.msteams.dangerouslyAllowNameMatching`：打破玻璃切换以重新启用可变 UPN/display-name 匹配和直接 team/channel 名称路由。
- `channels.msteams.textChunkLimit`：发出文本分块的字符数上限（默认 `4000`，且无论配置更高值都硬性上限为 `4000`）。
- `channels.msteams.streaming.chunkMode`：`length`（默认）或 `newline`，先按空行（段落边界）拆分，再按长度分块。
- `channels.msteams.mediaAllowHosts`：入站附件主机的允许列表（默认 Microsoft/Teams 域名：Graph、SharePoint/OneDrive、Teams CDN、Bot Framework、Azure Media Services）。
- `channels.msteams.mediaAuthAllowHosts`：在媒体重试时附加 Authorization 标头的允许列表（默认 Graph + Bot Framework 主机）。
- `channels.msteams.graphMediaFallback`：当 channel/group HTML 省略文件标记时，选择进入图形消息查找（默认 `false`；请参阅 [Channel/group 文件恢复](/channels/msteams/manifest-and-permissions#channel%2Fgroup-file-recovery-graphmediafallback)）。
- `channels.msteams.mediaMaxMb`：按通道覆盖媒体大小限制，单位为 MB。未设置时回退到 `agents.defaults.mediaMaxMb`。
- `channels.msteams.requireMention`：在channels/groups中需要@mention（默认`true`）。
- `channels.msteams.requireMentionInBotThreads`：覆盖源于此机器人跟踪消息的通道线程中的提及门控。省略保留当前行为；请参阅 [Bot 创建的线程](/channels/msteams/access-control#mentions-in-bot-created-threads)。
- `channels.msteams.replyStyle`：`thread | top-level`（参见[回复样式](/channels/msteams/messaging#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：按团队覆盖。
- `channels.msteams.teams.<teamId>.requireMention`：按团队覆盖。
- `channels.msteams.teams.<teamId>.requireMentionInBotThreads`：每团队机器人线程覆盖。
- `channels.msteams.teams.<teamId>.tools`：默认的按团队工具策略覆盖（`allow`/`deny`/`alsoAllow`），在缺少频道覆盖时使用。
- `channels.msteams.teams.<teamId>.toolsBySender`：默认的每团队每发送者工具策略覆盖（支持 `"*"` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMentionInBotThreads`：每通道机器人线程覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：按频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：每个通道每个发送者工具策略覆盖（支持 `"*"` 通配符）。
- `toolsBySender` 密钥使用显式前缀：`channel:`、`id:`、`e164:`、`username:`、`name:`。运行 `openclaw doctor --fix` 将已停用的无前缀密钥迁移到 `id:` 条目。
- `channels.msteams.authType`：身份验证类型 - `"secret"`（默认）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 证书文件路径（联合 + 证书认证）。
- `channels.msteams.certificateThumbprint`：证书指纹；可接受，但认证不要求。
- `channels.msteams.useManagedIdentity`：启用托管标识认证（联合模式）。
- `channels.msteams.managedIdentityClientId`：用户分配托管标识的客户端 ID。
- `channels.msteams.sharePointSiteId`：SharePoint 站点 ID，用于在群组 chats/channels 中上传文件（请参阅 [ 在群组聊天中发送文件](/channels/msteams/messaging#sending-files-in-group-chats)）。
- `channels.msteams.welcomeCard`、`channels.msteams.groupWelcomeCard`、`channels.msteams.promptStarters`：第一个 DM/group 联系人上显示的欢迎自适应卡及其建议的提示按钮。
- `channels.msteams.responsePrefix`：添加到外发回复前的文本前缀。
- `channels.msteams.feedbackEnabled`（默认`true`）、`channels.msteams.feedbackReflection`（默认`true`）、`channels.msteams.feedbackReflectionCooldownMs`：大拇指-up/down回复反馈和负反馈反射后续。
- `channels.msteams.sso`、`channels.msteams.delegatedAuth`：Bot Framework OAuth 连接和 SSO- 支持的流的委托图形范围； `sso.enabled: true` 需要 `sso.connectionName`。

## <a id="migrating-an-existing-webhook-endpoint"></a> 迁移现有 Webhook 端点

Teams Webhook 现在共享网关 HTTP 侦听器。 Teams SDK 仍验证 Azure JWT 签名；调用者不提供网关令牌。将公共 HTTPS 消息传递终结点保留在 Azure Bot 中，并将其反向代理上游更改为网关端口 `18789`（或您的 `gateway.port`），同时保留 `/api/messages` 或您配置的 `webhook.path`。如果直接公开端口，请将 Azure Bot 的消息传递终结点更新为到达此网关路由的公共 HTTPS URL。

医生在依赖隐式端口的现有安装上为启用的 Teams 通道固定 `legacyWebhook: { port: 3978 }` 一次。需要先前操作的证据；全新安装不会打开单独的侦听器。显式配置的 `webhook.port` 通过 Doctor 的正常配置备份和写入流程移动到 `legacyWebhook.port`。固定的兼容性侦听器转发到相同的网关路由和 JWT 验证。

已弃用的 TypeScript `webhook.port` 输入保持源兼容，直到下一个插件 SDK 主要版本为止。运行时配置使用`legacyWebhook`；运行 `openclaw doctor --fix` 迁移旧密钥。

通过网关端口确认交付后，删除 `channels.msteams.legacyWebhook` 引脚和任何旧的防火墙或 Compose 端口映射。保留医生用引脚保存的 `meta.migrations.webhookListeners`，这样以后的运行就不会重新创建它。有关包含的只读配置源，请参阅 [webhook 迁移](/gateway/doctor/config-migrations#channel-webhook-listeners)。显式 `false` 也会禁用侦听器。医生和启动打印网关路由和要删除的设置。

对于仅通过环境变量提供 Teams 凭据的现有安装，Doctor 会保留端点，而不在源配置中启用 Teams。如果这些凭据仅对网关服务可见，Doctor 会将决定悬而未决，直到网关启动。继续使用`gateway run --ambient-channels`激活它。单独的侦听器设置不再启用 Teams；使用 `enabled: true` 进行永久选择加入。 Doctor 将该标志添加到先前暗示激活的创作侦听器设置中，包括显式的 `legacyWebhook: false`。它不会将标志添加到已记录迁移完成的生成引脚。

当该路由可用时，自定义路径还接受旧的 `/api/messages` 别名及其现有的弃用警告。如果另一个插件拥有该别名，则启动会记录冲突并继续提供配置的路径。将 Azure Bot 更新到配置的路径。

网关保留 `/health`、`/healthz`、`/ready`、`/readyz`、`/startup` 和 `/startupz` 进行检查，包括带有查询字符串的 URL。如果以前的 Teams 回调使用这些路径之一，请将 `webhook.path` 设置为 `/api/messages` 并更新 Azure Bot 或代理上游以匹配。医生报告了这种冲突。兼容性监听器使旧端点保持工作；当未配置显式旧侦听器时，启动会拒绝不可用的网关路由。在移除监听器的 pin 之前验证替换。

`/api/channels` 下的路径需要主侦听器上的网关身份验证，包括编码的拼写。 Teams 回调使用 Azure JWT 进行身份验证，因此请改用 `/api/messages`。 Doctor 和 Startup 报告相同的回调更改操作；兼容性侦听器继续为旧路径提供服务，直到切换完成。

表达参数、通配符和大括号模式继续在旧端口上工作。网关路由注册使用文字路径。在禁用模式的旧侦听器之前，请将现有 `webhook.path` 更改为 `/api/messages` 并更新 Azure Bot 或代理。医生和初创公司识别这些模式；如果没有显式的遗留侦听器，启动会报告所需的更改，而不是默默地删除回调。
