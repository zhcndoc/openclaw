---
summary: "规范化支持与不支持的 SecretRef 证书范围"
read_when:
  - 验证 SecretRef 证书覆盖范围
  - 审计某个证书是否符合 `secrets configure` 或 `secrets apply` 的资格
  - 验证某个证书为何不在支持范围内
title: "SecretRef 证书范围"
---

此页面定义了规范的 SecretRef 凭据范围：哪些凭据字段接受 `SecretRef`（基于环境变量／文件／执行／存储的引用），而不是原始密钥值。

范围：

- 范围内：严格由用户提供、且 OpenClaw 不会铸造或轮换的证书。
- 范围外：运行时铸造或轮换的证书、OAuth 刷新材料，以及类会话工件。

以下列表由源目标注册表生成，并在 CI 中与 `docs/reference/secretref-user-supplied-credentials-matrix.json` 进行检查；不要手动编辑条目。

## 支持的凭证

### `openclaw.json` 目标（`secrets configure` + `secrets apply` + `secrets audit`）

[//]: # "secretref-supported-list-start"

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
- `skills.entries.*.apiKey`
- `memory.search.remote.apiKey`
- `agents.entries.*.tts.providers.*.apiKey`
- `agents.entries.*.memory.search.remote.apiKey`
- `talk.providers.*.apiKey`
- `talk.realtime.providers.*.apiKey`
- `tts.providers.*.apiKey`
- `plugins.entries.acpx.config.mcpServers.*.env.*`
- `plugins.entries.brave.config.webSearch.apiKey`
- `plugins.entries.codex.config.appServer.authToken`
- `plugins.entries.codex.config.appServer.headers.*`
- `plugins.entries.exa.config.webSearch.apiKey`
- `plugins.entries.firecrawl.config.webFetch.apiKey`
- `plugins.entries.google-meet.config.realtime.providers.*.apiKey`
- `plugins.entries.google.config.webSearch.apiKey`
- `plugins.entries.google.config.webSearch.headers.*`
- `plugins.entries.xai.config.webSearch.apiKey`
- `plugins.entries.moonshot.config.webSearch.apiKey`
- `plugins.entries.perplexity.config.webSearch.apiKey`
- `plugins.entries.firecrawl.config.webSearch.apiKey`
- `plugins.entries.minimax.config.webSearch.apiKey`
- `plugins.entries.tavily.config.webSearch.apiKey`
- `plugins.entries.parallel.config.webSearch.apiKey`
- `plugins.entries.voice-call.config.realtime.providers.*.apiKey`
- `plugins.entries.voice-call.config.streaming.providers.*.apiKey`
- `plugins.entries.voice-call.config.tts.providers.*.apiKey`
- `plugins.entries.voice-call.config.twilio.authToken`
- `plugins.entries.webhooks.config.routes.*.secret`
- `gateway.auth.password`
- `gateway.auth.token`
- `gateway.remote.token`
- `gateway.remote.password`
- `cron.webhookToken`
- `channels.telegram.botToken`
- `channels.telegram.webhookSecret`
- `channels.telegram.accounts.*.botToken`
- `channels.telegram.accounts.*.webhookSecret`
- `channels.slack.botToken`
- `channels.slack.appToken`
- `channels.slack.relay.authToken`
- `channels.slack.userToken`
- `channels.slack.signingSecret`
- `channels.slack.accounts.*.botToken`
- `channels.slack.accounts.*.appToken`
- `channels.slack.accounts.*.relay.authToken`
- `channels.slack.accounts.*.userToken`
- `channels.slack.accounts.*.signingSecret`
- `channels.sms.authToken`
- `channels.sms.accounts.*.authToken`
- `channels.buzz.authTag`
- `channels.buzz.privateKey`
- `channels.clickclack.token`
- `channels.clickclack.accounts.*.token`
- `channels.discord.token`
- `channels.discord.pluralkit.token`
- `channels.discord.voice.tts.providers.*.apiKey`
- `channels.discord.accounts.*.token`
- `channels.discord.accounts.*.pluralkit.token`
- `channels.discord.accounts.*.voice.tts.providers.*.apiKey`
- `channels.irc.password`
- `channels.irc.nickserv.password`
- `channels.irc.accounts.*.password`
- `channels.irc.accounts.*.nickserv.password`
- `channels.feishu.appSecret`
- `channels.feishu.encryptKey`
- `channels.feishu.verificationToken`
- `channels.feishu.accounts.*.appSecret`
- `channels.feishu.accounts.*.encryptKey`
- `channels.feishu.accounts.*.verificationToken`
- `channels.qqbot.clientSecret`
- `channels.qqbot.accounts.*.clientSecret`
- `channels.msteams.appPassword`
- `channels.mattermost.botToken`
- `channels.mattermost.accounts.*.botToken`
- `channels.matrix.accessToken`
- `channels.matrix.password`
- `channels.matrix.accounts.*.accessToken`
- `channels.matrix.accounts.*.password`
- `channels.nextcloud-talk.botSecret`
- `channels.nextcloud-talk.apiPassword`
- `channels.nextcloud-talk.accounts.*.botSecret`
- `channels.nextcloud-talk.accounts.*.apiPassword`
- `channels.zalo.botToken`
- `channels.zalo.webhookSecret`
- `channels.zalo.accounts.*.botToken`
- `channels.zalo.accounts.*.webhookSecret`
- `channels.googlechat.serviceAccount`
- `channels.googlechat.accounts.*.serviceAccount`

[//]: # "secretref-supported-list-end"

### `auth-profiles.json` 目标（`secrets configure` + `secrets apply` + `secrets audit`）

- 存储引用使用符合 `^[A-Z][A-Z0-9_]{0,127}$` 的名称，并且在此版本中仅从 Gateway 范围的团队作用域解析。典型引用为 `{"source":"store","provider":"default","id":"OPENAI_API_KEY"}`。
- 身份验证配置文件计划目标需要 `agentId`；计划条目以 `profiles.*.key` / `profiles.*.token` 为目标，并写入相邻引用（`keyRef` / `tokenRef`）。身份验证配置文件引用包含在运行时解析和审计覆盖范围内。
- 在 `openclaw.json` 中，SecretRef 必须使用结构化对象，例如 `{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}`。在 SecretRef 凭证路径上，旧式的 `secretref-env:<ENV_VAR>` 标记字符串会被拒绝；请运行 `openclaw doctor --fix` 以迁移有效标记。
- OAuth 策略保护：`auth.profiles.<id>.mode = "oauth"` 不能与该配置文件的 SecretRef 输入结合使用。违反此策略时，启动／重载和身份验证配置文件解析会立即失败。
- 对于由 SecretRef 管理的模型提供方，生成的 `agents/*/agent/models.json` 条目会保留非密文标记（而不是解析后的密文值），用于 `apiKey`／header 相关字段。标记持久化以源配置为准：OpenClaw 从当前生效的源配置快照（解析前）写入标记，而不是使用解析后的运行时密文值。
- 冷启动 Gateway 可以将可重试的解析失败隔离给已映射的、非 Gateway 所有者。当前已映射的类别包括模型提供方和技能、媒体／TTS／cron 提供方、符合条件的身份验证配置文件、按代理划分的内存、沙箱 SSH、频道账户，以及清单声明的插件路由。启动时会将每个失败所有者的显式引用保留在运行时快照中，通过 status 和 doctor 报告该所有者，并在不尝试更低优先级凭证的情况下拒绝该所有者的请求。重载和配置写入预检使用相同的所有者感知策略：健康的所有者会刷新；符合条件且失败的所有者仅在其引用标识、提供方定义以及完整的非密文所有者契约未发生变化时才保持陈旧状态；新的或已变化的失败会变为冷态。Gateway 入口认证、结构无效的引用或值、fail-closed 所有者，以及当前未映射的所有者仍然保持严格处理。
- 对于网页搜索：在显式提供方模式下（设置了 `tools.web.search.provider`），只有所选提供方的键处于激活状态。在自动模式下（未设置 `tools.web.search.provider`），只有按优先级解析出的第一个提供方键处于激活状态，未被选中的提供方引用在被选中之前会被视为非激活状态。提供方凭证使用 `plugins.entries.<plugin>.config.webSearch.*`。
- Slack 的 `identity: "user"` 使用 `channels.slack.userToken`，并在 Socket Mode 下配合 `channels.slack.appToken`，或在 HTTP 模式下配合 `channels.slack.signingSecret`。同样的配对规则也适用于 `channels.slack.accounts.*`；此身份不需要 bot token。

说明：

- 身份验证配置文件计划目标需要 `agentId`；计划条目以 `profiles.*.key` / `profiles.*.token` 为目标，并写入相邻引用（`keyRef` / `tokenRef`）。身份验证配置文件引用包含在运行时解析和审计覆盖范围内。
- 在 `openclaw.json` 中，SecretRef 必须使用结构化对象，例如 `{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}`。在 SecretRef 凭证路径上，旧式的 `secretref-env:<ENV_VAR>` 标记字符串会被拒绝；请运行 `openclaw doctor --fix` 以迁移有效标记。
- OAuth 策略保护：`auth.profiles.<id>.mode = "oauth"` 不能与该配置文件的 SecretRef 输入结合使用。违反此策略时，启动/重载和身份验证配置文件解析会立即失败。
- 对于由 SecretRef 管理的模型提供方，生成的 `agents/*/agent/models.json` 条目会保留非密文标记（而不是解析后的密文值），用于 `apiKey`/header 相关字段。标记持久化以源配置为准：OpenClaw 从当前生效的源配置快照（解析前）写入标记，而不是使用解析后的运行时密文值。
- 冷启动网关可以将可重试的解析失败隔离给已映射的、非网关所有者。当前已映射的类别包括模型提供方和技能、媒体/TTS/cron 提供方、符合条件的身份验证配置文件、按代理划分的内存、沙箱 SSH、频道账户，以及清单声明的插件路由。启动时会将每个失败所有者的显式引用保留在运行时快照中，通过 status 和 doctor 报告该所有者，并在不尝试更低优先级凭证的情况下拒绝该所有者的请求。重载和配置写入预检使用相同的所有者感知策略：健康的所有者会刷新；符合条件且失败的所有者仅在其引用标识、提供方定义以及完整的非密文所有者契约未发生变化时才保持陈旧状态；新的或已变化的失败会变为冷态。网关入口认证、结构无效的引用或值、fail-closed 所有者，以及当前未映射的所有者仍然保持严格处理。
- 对于网页搜索：在显式提供方模式下（设置了 `tools.web.search.provider`），只有所选提供方的键处于激活状态。在自动模式下（未设置 `tools.web.search.provider`），只有按优先级解析出的第一个提供方键处于激活状态，未被选中的提供方引用在被选中之前会被视为非激活状态。提供方凭证使用 `plugins.entries.<plugin>.config.webSearch.*`。
- Slack 的 `identity: "user"` 使用 `channels.slack.userToken`，并在 Socket Mode 下配合 `channels.slack.appToken`，或在 HTTP 模式下配合 `channels.slack.signingSecret`。同样的配对规则也适用于 `channels.slack.accounts.*`；此身份不需要 bot token。

## 不支持的证书

这些凭证属于已签发、轮换、带会话或具有 OAuth 持久性的类型，不适合只读的外部 SecretRef 解析：

[//]: # "secretref-unsupported-list-start"

- `hooks.token`
- `hooks.gmail.pushToken`
- `hooks.mappings[].sessionKey`
- `auth-profiles.oauth.*`
- `channels.discord.threadBindings.webhookToken`
- `channels.discord.accounts.*.threadBindings.webhookToken`
- `channels.whatsapp.creds.json`
- `channels.whatsapp.accounts.*.creds.json`

[//]: # "secretref-unsupported-list-end"

## 相关内容

- [密钥管理](/gateway/secrets)
- [认证凭据语义](/auth-credential-semantics)。
