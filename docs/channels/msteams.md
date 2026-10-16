---
summary: "Microsoft Teams 机器人支持状态、能力和配置"
read_when:
  - "处理 Microsoft Teams 频道功能时"
title: "Microsoft Teams"
---

状态：支持文字+DM附件； channel/group 文件发送需要 `sharePointSiteId` + Graph 权限（参见 [ 群聊中发送文件](/channels/msteams/messaging#sending-files-in-group-chats)）。民意调查和批准提示通过自适应卡发送。消息操作公开显式 `upload-file` 以进行文件优先发送。

<CardGroup cols={3}>
  <Card title="设置" icon="rocket" href="/channels/msteams/setup">
    注册机器人并安装Teams应用程序。
  </Card>
  <Card title="配对" icon="link" href="/channels/pairing">
    Teams DM 默认为配对模式。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [Microsoft Teams setup](/channels/msteams/setup) — 安装插件，注册机器人和 Teams 应用程序，然后针对开发隧道运行。
- [Microsoft Teams 访问控制](/channels/msteams/access-control) — DM 和组策略、团队和频道允许列表以及对话 ID。
- [Microsoft Teams 身份验证](/channels/msteams/authentication) — 证书和托管身份验证而不是客户端密钥。
- [Microsoft Teams 清单和权限](/channels/msteams/manifest-and-permissions) — 应用清单、RSC 权限以及每个功能所需的图形权限。
- [Microsoft Teams 配置](/channels/msteams/configuration) — `channels.msteams` 密钥、环境变量和历史限制。
- [Microsoft Teams 消息行为](/channels/msteams/messaging) — 会话路由、回复样式、附件和文件发送。
- [Microsoft Teams 卡片和操作](/channels/msteams/cards-and-actions) — 批准、投票、演示卡、成员信息和目标格式。
- [Microsoft Teams 故障排除](/channels/msteams/troubleshooting) — 已知限制、常见故障和参考链接。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/channels/msteams#reply-style-threads-vs-posts`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="bundled-plugin" />[捆绑插件](/channels/msteams/setup#bundled-plugin)
- <a id="quick-setup" />[快速设置](/channels/msteams/setup#quick-setup)
- <a id="goals" />[目标](/channels/msteams/setup#goals)
- <a id="config-writes" />[配置写入](/channels/msteams/access-control#config-writes)
- <a id="access-control-(dms-%2B-groups)" />[访问控制（DM + 群组）](</channels/msteams/access-control#access-control-(dms-%2B-groups)>）
- <a id="access-control-dms-+-groups" />[访问控制（DM + 群组）](/channels/msteams/access-control#access-control-dms-+-groups)
- <a id="how-it-works" />[工作原理](/channels/msteams/setup#how-it-works)
- <a id="step-1%3A-create-azure-bot" />[步骤 1：创建 Azure Bot](/channels/msteams/setup#step-1%3A-create-azure-bot)
- <a id="step-1-create-azure-bot" />[步骤 1：创建 Azure Bot](/channels/msteams/setup#step-1-create-azure-bot)
- <a id="step-2%3A-get-credentials" />[第 2 步：获取凭据](/channels/msteams/setup#step-2%3A-get-credentials)
- <a id="step-2-get-credentials" />[第 2 步：获取凭据](/channels/msteams/setup#step-2-get-credentials)
- <a id="step-3%3A-configure-messaging-endpoint" />[步骤 3：配置消息传送端点](/channels/msteams/setup#step-3%3A-configure-messaging-endpoint)
- <a id="step-3-configure-messaging-endpoint" />[步骤 3：配置消息传送端点](/channels/msteams/setup#step-3-configure-messaging-endpoint)
- <a id="step-4%3A-enable-teams-channel" />[步骤 4：启用 Teams 通道](/channels/msteams/setup#step-4%3A-enable-teams-channel)
- <a id="step-4-enable-teams-channel" />[步骤 4：启用 Teams 通道](/channels/msteams/setup#step-4-enable-teams-channel)
- <a id="step-5%3A-build-teams-app-manifest" />[第 5 步：构建 Teams 应用清单](/channels/msteams/setup#step-5%3A-build-teams-app-manifest)
- <a id="step-5-build-teams-app-manifest" />[第 5 步：构建 Teams 应用清单](/channels/msteams/setup#step-5-build-teams-app-manifest)
- <a id="step-6%3A-configure-openclaw" />[步骤 6：配置 OpenClaw](/channels/msteams/setup#step-6%3A-configure-openclaw)
- <a id="step-6-configure-openclaw" />[步骤 6：配置 OpenClaw](/channels/msteams/setup#step-6-configure-openclaw)
- <a id="step-7%3A-run-the-gateway" />[第 7 步：运行网关](/channels/msteams/setup#step-7%3A-run-the-gateway)
- <a id="step-7-run-the-gateway" />[第 7 步：运行网关](/channels/msteams/setup#step-7-run-the-gateway)
- <a id="federated-authentication-(certificate-plus-managed-identity)" />[联合身份验证（证书加托管身份）](</channels/msteams/authentication#federated-authentication-(certificate-plus-managed-identity)>）
- <a id="federated-authentication-certificate-plus-managed-identity" />[联合身份验证（证书加托管身份）](/channels/msteams/authentication#federated-authentication-certificate-plus-managed-identity)
- <a id="option-a%3A-certificate-based-authentication" />[选项 A：基于证书的身份验证](/channels/msteams/authentication#option-a%3A-certificate-based-authentication)
- <a id="option-a-certificate-based-authentication" />[选项 A：基于证书的身份验证](/channels/msteams/authentication#option-a-certificate-based-authentication)
- <a id="option-b%3A-azure-managed-identity" />[选项 B：Azure 托管 Identity](/channels/msteams/authentication#option-b%3A-azure-managed-identity)
- <a id="option-b-azure-managed-identity" />[选项 B：Azure 托管 Identity](/channels/msteams/authentication#option-b-azure-managed-identity)
- <a id="aks-workload-identity-setup" />[AKS 工作负载身份设置](/channels/msteams/authentication#aks-workload-identity-setup)
- <a id="auth-type-comparison" />[Auth类型比较](/channels/msteams/authentication#auth-type-comparison)
- <a id="local-development-(tunneling)" />[本地开发（隧道）](</channels/msteams/setup#local-development-(tunneling)>）
- <a id="local-development-tunneling" />[本地开发（隧道）](/channels/msteams/setup#local-development-tunneling)
- <a id="testing-the-bot" />[测试机器人](/channels/msteams/setup#testing-the-bot)
- <a id="environment-variables" />[环境变量](/channels/msteams/configuration#environment-variables)
- <a id="member-info-action" />[会员信息操作](/channels/msteams/cards-and-actions#member-info-action)
- <a id="history-context" />[H历史背景](/channels/msteams/configuration#history-context)
- <a id="current-teams-rsc-permissions-(manifest)" />[当前 Teams RSC 权限（清单）](</channels/msteams/manifest-and-permissions#current-teams-rsc-permissions-(manifest)>）
- <a id="current-teams-rsc-permissions-manifest" />[当前 Teams RSC 权限（清单）](/channels/msteams/manifest-and-permissions#current-teams-rsc-permissions-manifest)
- <a id="example-teams-manifest-(redacted)" />[示例 Teams 清单（已编辑）](</channels/msteams/manifest-and-permissions#example-teams-manifest-(redacted)>）
- <a id="example-teams-manifest-redacted" />[示例 Teams 清单（已编辑）](/channels/msteams/manifest-and-permissions#example-teams-manifest-redacted)
- <a id="manifest-caveats-(must-have-fields)" />[清单警告（必填字段）](</channels/msteams/manifest-and-permissions#manifest-caveats-(must-have-fields)>）
- <a id="manifest-caveats-must-have-fields" />[清单警告（必填字段）](/channels/msteams/manifest-and-permissions#manifest-caveats-must-have-fields)
- <a id="updating-an-existing-app" />[更新现有应用程序](/channels/msteams/manifest-and-permissions#updating-an-existing-app)
- <a id="capabilities%3A-rsc-only-vs-graph" />[功能：仅 RSC 与 Graph](/channels/msteams/manifest-and-permissions#capabilities%3A-rsc-only-vs-graph)
- <a id="capabilities-rsc-only-vs-graph" />[功能：仅 RSC 与 Graph](/channels/msteams/manifest-and-permissions#capabilities-rsc-only-vs-graph)
- <a id="with-teams-rsc-only-(app-installed%2C-no-graph-api-permissions)" />[仅与**Teams RSC**（已安装应用程序，无图形API权限）](</channels/msteams/manifest-and-permissions#with-teams-rsc-only-(app-installed%2C-no-graph-api-permissions)>）
- <a id="with-teams-rsc-only-app-installed-no-graph-api-permissions" />[仅具有**Teams RSC**（已安装应用程序，无图形API权限）](/channels/msteams/manifest-and-permissions#with-teams-rsc-only-app-installed-no-graph-api-permissions)
- <a id="with-teams-rsc-%2B-microsoft-graph-application-permissions" />[与**Teams RSC + Microsoft 图应用权限**](/channels/msteams/manifest-and-permissions#with-teams-rsc-%2B-microsoft-graph-application-permissions)
- <a id="with-teams-rsc-+-microsoft-graph-application-permissions" />[与**Teams RSC + Microsoft 图应用权限**](/channels/msteams/manifest-and-permissions#with-teams-rsc-+-microsoft-graph-application-permissions)
- <a id="rsc-vs-graph-api" />[RSC 与图表 API](/channels/msteams/manifest-and-permissions#rsc-vs-graph-api)
- <a id="graph-enabled-media-%2B-history" />[支持图形的媒体+历史记录](/channels/msteams/manifest-and-permissions#graph-enabled-media-%2B-history)
- <a id="graph-enabled-media-+-history" />[支持图形的媒体+历史记录](/channels/msteams/manifest-and-permissions#graph-enabled-media-+-history)
- <a id="channel%2Fgroup-file-recovery-(graphmediafallback)" />[Channel/group文件恢复（`graphMediaFallback`）](</channels/msteams/manifest-and-permissions#channel%2Fgroup-file-recovery-(graphmediafallback)>）
- <a id="channel/group-file-recovery-graphmediafallback" />[Channel/group文件恢复（`graphMediaFallback`）](/channels/msteams/manifest-and-permissions#channel/group-file-recovery-graphmediafallback)
- <a id="known-limitations" />[已知限制](/channels/msteams/troubleshooting#known-limitations)
- <a id="webhook-timeouts" />[Webhook 超时](/channels/msteams/troubleshooting#webhook-timeouts)
- <a id="teams-cloud-and-service-url-support" />[Teams 云和服务 URL 支持](/channels/msteams/troubleshooting#teams-cloud-and-service-url-support)
- <a id="formatting" />[格式化](/channels/msteams/troubleshooting#formatting)
- <a id="configuration" />[配置](/channels/msteams/configuration#configuration)
- <a id="routing-and-sessions" />[路由和会话](/channels/msteams/messaging#routing-and-sessions)
- <a id="reply-style%3A-threads-vs-posts" />[回复风格：线程与帖子](/channels/msteams/messaging#reply-style%3A-threads-vs-posts)
- <a id="reply-style-threads-vs-posts" />[回复风格：线程与帖子](/channels/msteams/messaging#reply-style-threads-vs-posts)
- <a id="resolution-precedence" />[分辨率优先级](/channels/msteams/messaging#resolution-precedence)
- <a id="thread-context-preservation" />[线程上下文保存](/channels/msteams/messaging#thread-context-preservation)
- <a id="attachments-and-images" />[附件和图片](/channels/msteams/messaging#attachments-and-images)
- <a id="sending-files-in-group-chats" />[群聊中发送文件](/channels/msteams/messaging#sending-files-in-group-chats)
- <a id="why-group-chats-need-sharepoint" />[为什么群聊需要SharePoint](/channels/msteams/messaging#why-group-chats-need-sharepoint)
- <a id="setup" />[设置](/channels/msteams/messaging#setup)
- <a id="sharing-behavior" />[分享行为](/channels/msteams/messaging#sharing-behavior)
- <a id="fallback-behavior" />[回退行为](/channels/msteams/messaging#fallback-behavior)
- <a id="files-stored-location" />[文件存储位置](/channels/msteams/messaging#files-stored-location)
- <a id="native-approval-cards" />[本地批准卡](/channels/msteams/cards-and-actions#native-approval-cards)
- <a id="polls-(adaptive-cards)" />[投票（自适应卡）](</channels/msteams/cards-and-actions#polls-(adaptive-cards)>）
- <a id="polls-adaptive-cards" />[投票（自适应卡）](/channels/msteams/cards-and-actions#polls-adaptive-cards)
- <a id="presentation-cards" />[演示卡](/channels/msteams/cards-and-actions#presentation-cards)
- <a id="target-formats" />[目标格式](/channels/msteams/cards-and-actions#target-formats)
- <a id="proactive-messaging" />[主动消息](/channels/msteams/cards-and-actions#proactive-messaging)
- <a id="team-and-channel-ids-(common-gotcha)" />[团队和通道 ID（常见问题）](</channels/msteams/access-control#team-and-channel-ids-(common-gotcha)>）
- <a id="team-and-channel-ids-common-gotcha" />[团队和通道 ID（常见问题）](/channels/msteams/access-control#team-and-channel-ids-common-gotcha)
- <a id="private-channels" />[私人渠道](/channels/msteams/access-control#private-channels)
- <a id="troubleshooting" />[故障排除](/channels/msteams/troubleshooting#troubleshooting)
- <a id="common-issues" />[常见问题](/channels/msteams/troubleshooting#common-issues)
- <a id="manifest-upload-errors" />[清单上传错误](/channels/msteams/troubleshooting#manifest-upload-errors)
- <a id="rsc-permissions-not-working" />[RSC 权限不起作用](/channels/msteams/troubleshooting#rsc-permissions-not-working)
- <a id="references" />[参考](/channels/msteams/troubleshooting#references)

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="渠道概览" icon="list" href="/channels">
    所有支持的频道。
  </Card>
  <Card title="配对" icon="link" href="/channels/pairing">
    DM 认证和配对流程。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群聊行为和提及门控。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    消息的会话路由。
  </Card>
  <Card title="配置参考" icon="sliders" href="/gateway/config-channels/workplace-chat">
    通道配置参考中的 Teams 字段。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    访问模型和强化。
  </Card>
  <Card title="Microsoft Teams 会议插件" icon="video" href="/plugins/teams-meetings">
    以访客身份加入 Teams 会议。
  </Card>
</CardGroup>
