---
summary: "规范支持与不支持的 SecretRef 凭证范围"
read_when:
  - 验证 SecretRef 凭证覆盖范围
  - 审计某个凭证是否符合 `secrets configure` 或 `secrets apply` 的条件
  - 验证为什么某个凭证不在受支持的表面范围内
title: "SecretRef 凭证表面"
---

本页定义了规范化的 SecretRef 凭证表面范围。

范围意图：

- 范围内：严格指用户提供且 OpenClaw 不会铸造或轮换的凭证。
- 范围外：运行时铸造或轮换的凭证、OAuth 刷新凭据及类似会话的产物。

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
- `agents.defaults.memorySearch.remote.apiKey`
- `agents.list[].memorySearch.remote.apiKey`
- `talk.providers.*.apiKey`
- `messages.tts.providers.*.apiKey`
- `tools.web.fetch.firecrawl.apiKey`
- `plugins.entries.brave.config.webSearch.apiKey`
- `plugins.entries.exa.config.webSearch.apiKey`
- `plugins.entries.google.config.webSearch.apiKey`
- `plugins.entries.xai.config.webSearch.apiKey`
- `plugins.entries.moonshot.config.webSearch.apiKey`
- `plugins.entries.perplexity.config.webSearch.apiKey`
- `plugins.entries.firecrawl.config.webSearch.apiKey`
- `plugins.entries.minimax.config.webSearch.apiKey`
- `plugins.entries.tavily.config.webSearch.apiKey`
- `tools.web.search.apiKey`
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
- `channels.slack.userToken`
- `channels.slack.signingSecret`
- `channels.slack.accounts.*.botToken`
- `channels.slack.accounts.*.appToken`
- `channels.slack.accounts.*.userToken`
- `channels.slack.accounts.*.signingSecret`
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
- `channels.bluebubbles.password`
- `channels.bluebubbles.accounts.*.password`
- `channels.feishu.appSecret`
- `channels.feishu.encryptKey`
- `channels.feishu.verificationToken`
- `channels.feishu.accounts.*.appSecret`
- `channels.feishu.accounts.*.encryptKey`
- `channels.feishu.accounts.*.verificationToken`
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
- `channels.googlechat.serviceAccount` 通过同级的 `serviceAccountRef`（兼容异常）
- `channels.googlechat.accounts.*.serviceAccount` 通过同级的 `serviceAccountRef`（兼容异常）

### `auth-profiles.json` 目标（`secrets configure` + `secrets apply` + `secrets audit`）

- `profiles.*.keyRef` (`type: "api_key"`; 当 `auth.profiles.<id>.mode = "oauth"` 时不支持)
- `profiles.*.tokenRef` (`type: "token"`; 当 `auth.profiles.<id>.mode = "oauth"` 时不支持)

[//]: # "secretref-supported-list-end"

备注：

- Auth-profile 计划目标需要 `agentId`。
- 计划条目针对 `profiles.*.key` / `profiles.*.token` 并写入同级引用（`keyRef` / `tokenRef`）。
- Auth-profile 引用包含在运行时解析和审计覆盖范围内。
- OAuth 策略防护：`auth.profiles.<id>.mode = "oauth"` 不能与该配置文件的 SecretRef 输入组合。当违反此政策时，启动/重载和 auth-profile 解析将快速失败。
- 对于 SecretRef 管理的模型提供商，生成的 `agents/*/agent/models.json` 条目为 `apiKey`/header 表面保留非秘密标记（而非解析后的秘密值）。
- 标记持久化以源为准：OpenClaw 从活动源配置快照（解析前）写入标记，而不是从解析后的运行时秘密值写入。
- 对于 Web 搜索：
  - 在显式提供商模式（`tools.web.search.provider` 已设置）下，只有选定的提供商密钥处于活动状态。
  - 在自动模式（`tools.web.search.provider` 未设置）下，只有按优先级解析的第一个提供商密钥处于活动状态。
  - 在自动模式下，未选定的提供商引用被视为非活动状态，直到被选定。
  - 遗留的 `tools.web.search.*` 提供商路径在兼容性窗口期间仍然解析，但规范的 SecretRef 表面是 `plugins.entries.<plugin>.config.webSearch.*`。

## 不支持的凭证

超出范围的凭证包括：

[//]: # "secretref-unsupported-list-start"

- `commands.ownerDisplaySecret`
- `hooks.token`
- `hooks.gmail.pushToken`
- `hooks.mappings[].sessionKey`
- `auth-profiles.oauth.*`
- `channels.discord.threadBindings.webhookToken`
- `channels.discord.accounts.*.threadBindings.webhookToken`
- `channels.whatsapp.creds.json`
- `channels.whatsapp.accounts.*.creds.json`

[//]: # "secretref-unsupported-list-end"

理由：

- 这些凭证属于铸造、轮换、带会话或可持久化 OAuth 的类别，不适用于只读的外部 SecretRef 解析。

## 相关内容

- [Secrets management](/gateway/secrets)
- [Auth credential semantics](/auth-credential-semantics)
