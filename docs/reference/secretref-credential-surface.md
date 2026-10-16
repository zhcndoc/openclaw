---
summary: "支持和不支持的 SecretRef 凭证"
read_when:
  - "验证 SecretRef 证书覆盖范围"
  - "审计某个证书是否符合 `secrets configure` 或 `secrets apply` 的资格"
  - "验证某个证书为何不在支持范围内"
title: "SecretRef 证书范围"
---

此页面列出了接受 `SecretRef`（env/file/exec/store-backed 参考）而不是原始机密值的凭证字段。

范围：

- 范围内：严格由用户提供、且 OpenClaw 不会铸造或轮换的证书。
- 范围外：运行时铸造或轮换的证书、OAuth 刷新材料，以及类会话工件。

以下列表由源目标注册表生成，并在 CI 中与 `docs/reference/secretref-user-supplied-credentials-matrix.json` 进行检查；不要手动编辑条目。

如果当前通道秘密合约工件无法加载，则源生成失败，而不是发布不完整的列表。没有该可选工件的插件不会贡献任何通道目标。此生成检查不会更改运行时 SecretRef 所有者隔离行为。

## <a id="supported-credentials"></a> 支持的凭证

### <a id="openclaw.json-targets-(secrets-configure-%2B-secrets-apply-%2B-secrets-audit)"></a><a id="openclaw-json-targets-secrets-configure-+-secrets-apply-+-secrets-audit"></a> `openclaw.json` 目标（`secrets configure` + `secrets apply` + `secrets audit`）

[//]： # “secretref-supported-list-start”

#### `agents`

- `agents.entries.*.memory.search.remote.apiKey`
- `agents.entries.*.tts.personas.*.providers.*.apiKey`
- `agents.entries.*.tts.providers.*.apiKey`

#### `channels`

- `channels.buzz.accounts.*.authTag`
- `channels.buzz.accounts.*.privateKey`
- `channels.buzz.authTag`
- `channels.buzz.privateKey`
- `channels.clickclack.accounts.*.token`
- `channels.clickclack.token`
- `channels.discord.accounts.*.pluralkit.token`
- `channels.discord.accounts.*.token`
- `channels.discord.accounts.*.voice.realtime.providers.*.apiKey`
- `channels.discord.accounts.*.voice.tts.personas.*.providers.*.apiKey`
- `channels.discord.accounts.*.voice.tts.providers.*.apiKey`
- `channels.discord.pluralkit.token`
- `channels.discord.token`
- `channels.discord.voice.realtime.providers.*.apiKey`
- `channels.discord.voice.tts.personas.*.providers.*.apiKey`
- `channels.discord.voice.tts.providers.*.apiKey`
- `channels.feishu.accounts.*.appSecret`
- `channels.feishu.accounts.*.encryptKey`
- `channels.feishu.accounts.*.verificationToken`
- `channels.feishu.appSecret`
- `channels.feishu.encryptKey`
- `channels.feishu.verificationToken`
- `channels.googlechat.accounts.*.serviceAccount`
- `channels.googlechat.serviceAccount`
- `channels.irc.accounts.*.nickserv.password`
- `channels.irc.accounts.*.password`
- `channels.irc.nickserv.password`
- `channels.irc.password`
- `channels.matrix.accessToken`
- `channels.matrix.accounts.*.accessToken`
- `channels.matrix.accounts.*.password`
- `channels.matrix.password`
- `channels.mattermost.accounts.*.botToken`
- `channels.mattermost.botToken`
- `channels.msteams.accounts.*.appPassword`
- `channels.msteams.appPassword`
- `channels.nextcloud-talk.accounts.*.apiPassword`
- `channels.nextcloud-talk.accounts.*.botSecret`
- `channels.nextcloud-talk.apiPassword`
- `channels.nextcloud-talk.botSecret`
- `channels.nostr.privateKey`
- `channels.qqbot.accounts.*.clientSecret`
- `channels.qqbot.clientSecret`
- `channels.slack.accounts.*.appToken`
- `channels.slack.accounts.*.botToken`
- `channels.slack.accounts.*.relay.authToken`
- `channels.slack.accounts.*.signingSecret`
- `channels.slack.accounts.*.userToken`
- `channels.slack.appToken`
- `channels.slack.botToken`
- `channels.slack.relay.authToken`
- `channels.slack.signingSecret`
- `channels.slack.userToken`
- `channels.sms.accounts.*.authToken`
- `channels.sms.authToken`
- `channels.telegram.accounts.*.botToken`
- `channels.telegram.accounts.*.webhookSecret`
- `channels.telegram.botToken`
- `channels.telegram.webhookSecret`
- `channels.x.accounts.*.bearerToken`
- `channels.x.accounts.*.clientSecret`
- `channels.x.accounts.*.refreshToken`
- `channels.x.accounts.*.verifiedFromGitHub.token`
- `channels.x.bearerToken`
- `channels.x.clientSecret`
- `channels.x.refreshToken`
- `channels.x.verifiedFromGitHub.token`
- `channels.zalo.accounts.*.botToken`
- `channels.zalo.accounts.*.webhookSecret`
- `channels.zalo.botToken`
- `channels.zalo.webhookSecret`

#### `cron`

- `cron.webhookToken`

#### `database`

- `database.postgres.connection`

#### `gateway`

- `gateway.auth.password`
- `gateway.auth.token`
- `gateway.remote.password`
- `gateway.remote.token`

#### `memory`

- `memory.search.remote.apiKey`

#### `models`

- `models.providers.*.apiKey`
- `models.providers.*.headers.*`
- `models.providers.*.request.auth.token`
- `models.providers.*.request.auth.value`
- `models.providers.*.request.headers.*`
- `models.providers.*.request.proxy.tls.ca`
- `models.providers.*.request.proxy.tls.cert`
- `models.providers.*.request.proxy.tls.key`
- `models.providers.*.request.proxy.tls.passphrase`
- `models.providers.*.request.tls.ca`
- `models.providers.*.request.tls.cert`
- `models.providers.*.request.tls.key`
- `models.providers.*.request.tls.passphrase`

#### `plugins`

- `plugins.entries.acpx.config.mcpServers.*.env.*`
- `plugins.entries.brave.config.webSearch.apiKey`
- `plugins.entries.codex.config.appServer.authToken`
- `plugins.entries.codex.config.appServer.headers.*`
- `plugins.entries.comfy.config.headers.*`
- `plugins.entries.exa.config.webSearch.apiKey`
- `plugins.entries.facetime.config.realtime.providers.*.apiKey`
- `plugins.entries.firecrawl.config.webFetch.apiKey`
- `plugins.entries.firecrawl.config.webSearch.apiKey`
- `plugins.entries.google-meet.config.realtime.providers.*.apiKey`
- `plugins.entries.google.config.webSearch.apiKey`
- `plugins.entries.google.config.webSearch.headers.*`
- `plugins.entries.imap.config.accounts.*.password`
- `plugins.entries.minimax.config.webSearch.apiKey`
- `plugins.entries.moonshot.config.webSearch.apiKey`
- `plugins.entries.parallel.config.webSearch.apiKey`
- `plugins.entries.perplexity.config.webSearch.apiKey`
- `plugins.entries.tavily.config.webSearch.apiKey`
- `plugins.entries.team-reports.config.discord.token`
- `plugins.entries.team-reports.config.github.token`
- `plugins.entries.typesafe.config.apiKey`
- `plugins.entries.voice-call.config.realtime.providers.*.apiKey`
- `plugins.entries.voice-call.config.streaming.providers.*.apiKey`
- `plugins.entries.voice-call.config.tts.providers.*.apiKey`
- `plugins.entries.voice-call.config.twilio.authToken`
- `plugins.entries.xai.config.webSearch.apiKey`

#### `skills`

- `skills.entries.*.apiKey`

#### `talk`

- `talk.providers.*.apiKey`
- `talk.realtime.providers.*.apiKey`

#### `tts`

- `tts.personas.*.providers.*.apiKey`
- `tts.providers.*.apiKey`

### <a id="sqlite-auth-profile-targets-(secrets-configure-%2B-secrets-apply-%2B-secrets-audit)"></a><a id="sqlite-auth-profile-targets-secrets-configure-+-secrets-apply-+-secrets-audit"></a> SQLite 身份验证配置文件目标 （`secrets configure` + `secrets apply` + `secrets audit`）

- `profiles.*.keyRef`（`type: "api_key"`；`auth.profiles.<id>.mode = "oauth"` 时不支持）
- `profiles.*.tokenRef`（`type: "token"`；`auth.profiles.<id>.mode = "oauth"` 时不支持）

说明：

### <a id="node-host-connection-targets"></a> Node-主机连接目标

- `gateway.cloudflareAccess.clientId`
- `gateway.cloudflareAccess.clientSecret`

这些字段位于节点主机保存的 `nodeHost.config` SQLite 机器状态值中，而不是 `openclaw.json` 中。它们接受相同的 SecretInput 表单，并在节点启动时通过配置的 SecretRef 提供程序进行解析。传统的 `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` 回退会自动保留这些字段的环境引用。它们不是 `secrets configure` 或 `secrets apply` 的目标。

注意：

- `database.postgres.connection` 仅接受 env、file 和 exec SecretRefs。存储支持的引用需要打开正在解析连接的数据库；请改用 env、file 或 exec SecretRef。
- Store 引用使用与 `^[A-Z][A-Z0-9_]{0,127}$` 匹配的名称，并且仅从网关范围的团队范围解析；不存在其他商店范围。典型的参考号是 `{"source":"store","provider":"default","id":"OPENAI_API_KEY"}`。
- 身份验证配置文件计划目标需要 `agentId`；计划条目以 `profiles.*.key` / `profiles.*.token` 为目标，并写入相邻引用（`keyRef` / `tokenRef`）。身份验证配置文件引用包含在运行时解析和审计覆盖范围内。
- 在`openclaw.json`、SecretRefs中必须使用结构化对象，例如`{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}`。旧版 `secretref-env:<ENV_VAR>` 标记字符串在 SecretRef 凭证路径上被拒绝；运行 `openclaw doctor --fix` 以迁移有效标记。
- OAuth 策略防护：`auth.profiles.<id>.mode = "oauth"` 不能与该配置文件的 SecretRef 输入组合。当违反此策略时，Startup/reload 和身份验证配置文件解析会快速失败。
- 对于由 SecretRef 管理的模型提供方，生成的 `agents/*/agent/models.json` 条目会保留非密文标记（而不是解析后的密文值），用于 `apiKey`/header 相关字段。标记持久化以源配置为准：OpenClaw 从当前生效的源配置快照（解析前）写入标记，而不是使用解析后的运行时密文值。
- 冷网关启动可以隔离映射的非网关所有者的可重试解决失败。当前映射的类包括模型提供者和技能、media/TTS/cron 提供者、合格的身份验证配置文件、每个代理内存、沙箱 SSH、通道帐户和清单声明的插件路由。启动将每个失败所有者的显式引用保留在运行时快照中，通过状态和医生报告所有者，并拒绝对该所有者的请求，而不尝试较低优先级的凭据。重新加载和配置写入预检使用相同的所有者感知策略：健康的所有者刷新；仅当其引用身份、提供者定义和完整的非秘密所有者合同未更改时，合格的失败所有者才会保持陈旧状态；新的或改变的故障变得冷淡。网关入口身份验证、结构上无效的引用或值、需要启动时停止的所有者以及当前未映射的所有者仍然严格。
- 对于网页搜索：在显式提供方模式下（设置了 `tools.web.search.provider`），只有所选提供方的键处于激活状态。在自动模式下（未设置 `tools.web.search.provider`），只有按优先级解析出的第一个提供方键处于激活状态，未被选中的提供方引用在被选中之前会被视为非激活状态。提供方凭证使用 `plugins.entries.<plugin>.config.webSearch.*`。
- Slack 的 `identity: "user"` 使用 `channels.slack.userToken`，并在 Socket Mode 下配合 `channels.slack.appToken`，或在 HTTP 模式下配合 `channels.slack.signingSecret`。同样的配对规则也适用于 `channels.slack.accounts.*`；此身份不需要 bot token。

## <a id="unsupported-credentials"></a> 不支持的证书

这些凭证是铸造、轮换、会话承载或 OAuth- 持久类，不适合只读外部 SecretRef 分辨率：

[//]： # “secretref-unsupported-list-start”

- `hooks.token`
- `hooks.gmail.pushToken`
- `hooks.mappings[].sessionKey`
- `auth-profiles.oauth.*`
- `channels.discord.accounts.*.threadBindings.webhookToken`
- `channels.discord.threadBindings.webhookToken`
- `channels.whatsapp.accounts.*.creds.json`
- `channels.whatsapp.creds.json`

[//]： # “secretref-unsupported-list-end”

## <a id="related"></a> 相关内容

- [密钥管理](/gateway/secrets)
- [秘密 CLI](/cli/secrets)
- [认证凭据语义](/auth-credential-semantics)。
