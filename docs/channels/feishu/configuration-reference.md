---
summary: "每个 `channels.feishu` 配置密钥及其默认值"
read_when:
  - "查找 `channels.feishu` 配置密钥"
  - "检查 Feishu 设置的默认值"
title: "Feishu配置参考"
sidebarTitle: "配置参考"
---

包含默认值的完整 `channels.feishu` 密钥列表以及 Webhook 路径规则。

## <a id="configuration-reference"></a> 配置参考

完整配置：[网关配置](/gateway/configuration)

| 设置                                                       | 描述                                                                                                                             | 默认值                              |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `channels.feishu.enabled`                                     | Enable/disable 频道                                                                                                              | `true`                               |
| `channels.feishu.domain`                                      | API 域名（`feishu`、`lark` 或 `https://` 基础 URL）                                                                                | `feishu`                             |
| `channels.feishu.connectionMode`                              | 事件传输方式（`websocket` 或 `webhook`）                                                                                              | `websocket`                          |
| `channels.feishu.defaultAccount`                              | 出站路由的默认账号                                                                                                    | `default`                            |
| `channels.feishu.verificationToken`                           | webhook 模式必需                                                                                                               | -                                    |
| `channels.feishu.encryptKey`                                  | webhook 模式必需                                                                                                               | -                                    |
| `channels.feishu.webhookPath`                                 | 标准化 HTTP 请求路径（必须以 `/` 开头）                                                                                      | `/feishu/events`                     |
| `channels.feishu.legacyWebhook`                               | 显式转发监听器：`{ port, host? }`；省略或 `false` 不打开监听器，受帐户继承限制                   | 无                                 |
| `channels.feishu.accounts.<id>.appId`                         | 应用 ID                                                                                                                                  | -                                    |
| `channels.feishu.accounts.<id>.appSecret`                     | 应用密钥                                                                                                                              | -                                    |
| `channels.feishu.accounts.<id>.domain`                        | 每个账号的域名覆盖                                                                                                             | `feishu`                             |
| `channels.feishu.accounts.<id>.replyToMode`                   | 按帐户回复参考模式                                                                                                        | 已继承                            |
| `channels.feishu.accounts.<id>.requireMentionInBotThreads`    | 此机器人启动的线程中每个帐户的提及要求                                                                          | 已继承                            |
| `channels.feishu.accounts.<id>.tts`                           | 每个账号的 TTS 覆盖                                                                                                                | `tts`                                |
| `channels.feishu.accounts.<id>.actions.sticker`               | 每个帐户的贴纸操作覆盖                                                                                                     | 已继承                            |
| `channels.feishu.dmPolicy`                                    | DM 政策（`pairing`、`allowlist`、`open`）                                                                                              | `pairing`                            |
| `channels.feishu.allowFrom`                                   | DM 允许列表（open_id 列表）                                                                                                             | -                                    |
| `channels.feishu.groupPolicy`                                 | 群组策略（`open`、`allowlist`、`disabled`）                                                                                          | `allowlist`                          |
| `channels.feishu.groupAllowFrom`                              | 群组允许列表                                                                                                                         | -                                    |
| `channels.feishu.groupSenderAllowFrom`                        | 应用于所有群组的发送者允许列表                                                                                                  | -                                    |
| `channels.feishu.requireMention`                              | 分组需要@mention                                                                                                              | `true`（保单时为`false` `open`）  |
| `channels.feishu.requireMentionInBotThreads`                  | 覆盖此机器人启动的线程中的提及；参见[访问控制](/channels/feishu/access-control#mentions-in-bot-started-threads) | 现有提及行为            |
| `channels.feishu.allowBots`                                   | 接受其他提及此机器人的机器人，并提供机器人循环保护                                                                       | `false`                              |
| `channels.feishu.groups.<chat_id>.requireMention`             | 每组 @mention 覆盖；显式 ID 还允许该组处于白名单模式                                                        | 已继承                            |
| `channels.feishu.groups.<chat_id>.requireMentionInBotThreads` | 此机器人启动的线程中每组的提及要求                                                                            | 已继承                            |
| `channels.feishu.groups.<chat_id>.enabled`                    | Enable/disable 特定组                                                                                                         | `true`                               |
| `channels.feishu.groups.<chat_id>.allowFrom`                  | 每个群组的发送者允许列表（覆盖 `groupSenderAllowFrom`）                                                                           | -                                    |
| `channels.feishu.groupSessionScope`                           | 群组会话映射（`group`、`group_sender`、`group_topic`、`group_topic_sender`）                                                    | `group`                              |
| `channels.feishu.replyToMode`                                 | 回复参考模式（`off`、`first`、`all`、`batched`）                                                                                 | `all`                                |
| `channels.feishu.replyInThread`                               | 机器人回复 create/continue 主题线程（`disabled`、`enabled`）                                                                       | `disabled`                           |
| `channels.feishu.reactionNotifications`                       | 入站反应事件（`off`、`own`、`all`）                                                                                           | `own`                                |
| `channels.feishu.actions.sticker`                             | 启用收到的贴纸发送和配置的贴纸搜索                                                                           | `false`                              |
| `channels.feishu.stickerSets`                                 | 可搜索收到的贴纸键和关键字，按机器人应用程序 ID 分组                                                                    | 无                                 |
| `channels.feishu.vcAutoJoin`                                  | 正常 DM 授权后加入受邀 VC 会议                                                                                  | `false`                              |
| `channels.feishu.dynamicAgentCreation.enabled`                | 启用自动每用户代理创建                                                                                                | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate`      | 动态代理工作区的路径模板                                                                                              | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`       | 代理目录名称模板                                                                                                           | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`              | 创建的动态代理的最大数量                                                                                              | 无限                            |
| `channels.feishu.textChunkLimit`                              | 消息分块大小                                                                                                                      | `4000`                               |
| `channels.feishu.streaming.chunkMode`                         | 分块拆分方式（`length` 或 `newline`）                                                                                                 | `length`                             |
| `channels.feishu.mediaMaxMb`                                  | 媒体大小限制                                                                                                                        | `30`                                 |
| `channels.feishu.renderMode`                                  | 回复渲染方式（`auto`、`raw`、`card`）                                                                                                 | `auto`                               |
| `channels.feishu.streaming.mode`                              | 流式卡片输出（`partial` 或 `off`）                                                                                              | `partial`                            |
| `channels.feishu.streaming.block.enabled`                     | 完整块回复流式输出                                                                                                         | `false`                              |
| `channels.feishu.typingIndicator`                             | 发送正在输入反应                                                                                                                   | `true`                               |
| `channels.feishu.resolveSenderNames`                          | 解析发送者显示名称                                                                                                            | `true`                               |
| `channels.feishu.configWrites`                                | 允许由通道发起的配置写入（动态代理需要）                                                                        | `true`                               |
| `channels.feishu.tools.doc`                                   | 启用文档工具                                                                                                                   | `true`                               |
| `channels.feishu.tools.chat`                                  | 启用聊天信息工具                                                                                                                  | `true`                               |
| `channels.feishu.tools.wiki`                                  | 启用知识库工具（需要 `doc`）                                                                                            | `true`                               |
| `channels.feishu.tools.drive`                                 | 启用云存储工具                                                                                                              | `true`                               |
| `channels.feishu.tools.perm`                                  | 启用权限管理工具                                                                                                      | `false`                              |
| `channels.feishu.tools.scopes`                                | 启用应用作用域诊断工具                                                                                                       | `true`                               |
| `channels.feishu.tools.bitable`                               | 启用 Bitable/Base 工具                                                                                                               | `true`                               |
| `channels.feishu.accounts.<id>.tools.bitable`                 | 每个账号的 Bitable/Base 工具开关                                                                                                      | 已继承                            |

在Webhook模式下，`channels.feishu.webhookPath`和`channels.feishu.accounts.<id>.webhookPath`都必须是规范化的以`/`开头的HTTP请求路径，例如`/feishu/events`。支持可选的查询字符串，并且必须完全匹配。完整 URL、相对路径、URL 片段、点段和未编码的空格或 Unicode 将被拒绝。如果现有配置包含未规范化的路径，请在启动网关之前运行 `openclaw doctor --fix` 修复它。

## <a id="gateway-webhook-route"></a> 网关 webhook 路由

Webhook 模式在 `webhookPath`（通常为 `/feishu/events`）处使用网关 HTTP 侦听器（`gateway.port`，通常为 `18789`）。配置公共 Feishu 回调 URL 或反向代理以到达该网关端口和路径。该路由验证Feishu签名，不需要网关承载认证。当加密密钥不同时，帐户可以共享路径；网关端口上的不明确签名会被拒绝，而不是选择任意帐户。共享路径和加密密钥的旧帐户在其单独的显式旧侦听器上仍然可以区分。在将回调移动到共享网关端口之前，为这些帐户提供不同的加密密钥或 Webhook 路径。

共享网关路径的帐户共享其未经身份验证的请求率和正在进行的正文读取预算，因为签名验证需要完整的正文。对单独的预算使用不同的 `webhookPath` 路径名。即使路径匹配，受信任的传统端点仍保留独立的运行中容量。

新安装不会打开单独的 Webhook 端口。在现有安装中，Doctor 会为依赖于隐式端点的已启用 Webhook 帐户固定 `legacyWebhook: { port: 3000, host: "127.0.0.1" }` 一次。网关拥有这个显式侦听器并将请求转发到相同的插件路由和签名验证器。设置 `legacyWebhook: { port: 3100, host: "127.0.0.1" }` 以选择另一个端点。省略的对象 `host` 绑定到 `127.0.0.1`；显式主机（包括通配符地址）将被保留。帐户条目继承根设置，并且 `accounts.<id>.legacyWebhook: false` 禁用该帐户的转发。 Feishu 需要 OpenClaw 2026.9.8 或更新版本。网关拥有每个 Webhook 侦听器，并且共享旧套接字保持打开状态，而另一个帐户仍然使用该端点。帐户关闭时，经过身份验证的响应最多可能会完成五秒钟，与前一个侦听器的关闭宽限期相匹配。未完成的答复在截止日期前关闭；其他帐户保留其路由和侦听器。在此宽限期内，停止帐户的正确签名回调会收到可重试的 `503`，除非实时继承者已经接受其签名。

该插件的 Doctor 迁移将 `webhookPort` 和 `webhookHost` 移动到 `legacyWebhook: { port, host }`，仅设置一个键时保留有效的旧默认值。正常配置备份会保护原始设置。现有的 `legacyWebhook` 设置，包括 `false`，获胜。一次性引脚保留了现有的安装，省略了旧的设置；它需要先前操作的证据，并且不适用于全新安装。

使用这些旧密钥从 2026.9.6 主机更新时，首先将 OpenClaw 核心更新到 2026.9.8 或更高版本，其中包括 [ 插件更新迁移修复 ](https://github.com/openclaw/openclaw/pull/160682)。然后将任何固定的 Feishu 包显式更新到您选择的版本。核心更新程序保留显式的插件版本引脚。更新后的安装程序在激活替换包之前应用 Feishu 的迁移；已发布的 2026.9.6 安装程序在运行修复之前会拒绝新架构。拒绝的仅插件更新会使之前的安装和设置保持不变。

已弃用的 TypeScript `webhookPort` 和 `webhookHost` 输入字段保持源兼容，直到下一个插件 SDK 主要版本为止。运行时配置使用`legacyWebhook`；运行 `openclaw doctor --fix` 迁移旧密钥。

要仅使用网关端口，请更新 Feishu 回调 URL 或反向代理上游到网关端口和 `webhookPath`，验证交付，然后删除 `legacyWebhook` 引脚。保留医生用引脚保存的 `meta.migrations.webhookListeners`，这样以后的运行就不会重新创建它。有关包含的只读配置源，请参阅 [webhook 迁移](/gateway/doctor/config-migrations#channel-webhook-listeners)。使用 `accounts.<id>.legacyWebhook: false` 覆盖继承的根侦听器。 Startup 和 Doctor 打印目标和删除说明。医生以信息形式呈现健康终点指导，以警告形式呈现路径冲突；已禁用的帐户和 WebSocket 帐户不会收到 Webhook 注释。 OpenClaw 无法更新 Feishu 控制台中存储的回调 URL。

确切的网关检查路径（`/health`、`/healthz`、`/ready`、`/readyz`、`/startup` 和 `/startupz`，包括查询字符串）无法在网关端口上接收 Feishu 回调。如果没有显式的旧侦听器，Webhook 启动会拒绝这些路径并命名替换路径。启用后，旧侦听器将继续为旧路径提供服务。将 `webhookPath` 更改为 `/feishu/events`（或其他未保留的路径），更新 Feishu 回调 URL 或反向代理路径，并在删除 `legacyWebhook` 引脚之前验证网关上的传递。此规则不保留嵌套在检查路径下方的路径。

`/api/channels` 下的路径需要网关认证，无法在网关端口接收普通的 Feishu 回调。这也适用于该前缀的编码形式。 Startup和Doctor给出了相同的路径改变指令；旧侦听器使这些回调保持工作状态，直到迁移路径和外部回调或代理。
