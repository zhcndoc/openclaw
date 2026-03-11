---
summary: "Canonical 支持与不支持的 SecretRef 凭证范围"
read_when:
  - 验证 SecretRef 凭证覆盖范围
  - 审计凭证是否符合 `secrets configure` 或 `secrets apply` 的资格
  - 验证凭证为何不在支持范围内
title: "SecretRef 凭证范围"
---

# SecretRef 凭证范围

本页面定义了规范的 SecretRef 凭证范围。

范围意图：

- 范围内：严格指用户提供且 OpenClaw 不会铸造或轮换的凭证。
- 范围外：运行时铸造或轮换的凭证、OAuth 刷新凭据及类似会话的产物。

## 支持的凭证

### `openclaw.json` 目标（`secrets configure` + `secrets apply` + `secrets audit`）

[//]: # "secretref-supported-list-start"

- `models.providers.*.apiKey`
- `models.providers.*.headers.*`
- `skills.entries.*.apiKey`
- `agents.defaults.memorySearch.remote.apiKey`
- `agents.list[].memorySearch.remote.apiKey`
- `talk.apiKey`
- `talk.providers.*.apiKey`
- `messages.tts.elevenlabs.apiKey`
- `messages.tts.openai.apiKey`
- `tools.web.fetch.firecrawl.apiKey`
- `tools.web.search.apiKey`
- `tools.web.search.gemini.apiKey`
- `tools.web.search.grok.apiKey`
- `tools.web.search.kimi.apiKey`
- `tools.web.search.perplexity.apiKey`
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
- `channels.discord.voice.tts.elevenlabs.apiKey`
- `channels.discord.voice.tts.openai.apiKey`
- `channels.discord.accounts.*.token`
- `channels.discord.accounts.*.pluralkit.token`
- `channels.discord.accounts.*.voice.tts.elevenlabs.apiKey`
- `channels.discord.accounts.*.voice.tts.openai.apiKey`
- `channels.irc.password`
- `channels.irc.nickserv.password`
- `channels.irc.accounts.*.password`
- `channels.irc.accounts.*.nickserv.password`
- `channels.bluebubbles.password`
- `channels.bluebubbles.accounts.*.password`
- `channels.feishu.appSecret`
- `channels.feishu.verificationToken`
- `channels.feishu.accounts.*.appSecret`
- `channels.feishu.accounts.*.verificationToken`
- `channels.msteams.appPassword`
- `channels.mattermost.botToken`
- `channels.mattermost.accounts.*.botToken`
- `channels.matrix.password`
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

- `profiles.*.keyRef`（`type: "api_key"`）
- `profiles.*.tokenRef`（`type: "token"`）

[//]: # "secretref-supported-list-end"

备注：

- Auth-profile 计划目标需要 `agentId`。
- 计划条目针对 `profiles.*.key` / `profiles.*.token` 并写入同级引用 (`keyRef` / `tokenRef`)。
- Auth-profile 引用包含在运行时解析和审计覆盖范围内。
- 对于 SecretRef 管理的模型提供者，生成的 `agents/*/agent/models.json` 条目持久化非秘密标记（而非解析出的秘密值）用于 `apiKey` / 头信息表面。
- 对于网页搜索：
  - 在显式提供者模式（设置了 `tools.web.search.provider`）下，仅所选提供者的密钥有效。
  - 在自动模式（未设置 `tools.web.search.provider`）下，仅按照优先级解析的第一个提供者密钥有效。
  - 在自动模式下，未被选中的提供者引用视为非激活状态，直到被选中。

## 不支持的凭证

超出范围的凭证包括：

[//]: # "secretref-unsupported-list-start"

- `commands.ownerDisplaySecret`
- `channels.matrix.accessToken`
- `channels.matrix.accounts.*.accessToken`
- `hooks.token`
- `hooks.gmail.pushToken`
- `hooks.mappings[].sessionKey`
- `auth-profiles.oauth.*`
- `discord.threadBindings.*.webhookToken`
- `whatsapp.creds.json`

[//]: # "secretref-unsupported-list-end"

理由：

- 此类凭证为铸造、轮换、持有会话特性或 OAuth 持久类，不适合只读的外部 SecretRef 解析。
