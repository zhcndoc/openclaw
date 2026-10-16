---
summary: "OpenClaw中的OAuth：代币交换、存储和多账户模式"
read_when:
  - "你想端到端了解 OpenClaw 的 OAuth"
  - "你遇到令牌失效 / 登出问题"
  - "你想了解 Claude CLI 或 OAuth 认证流程"
  - "你想使用多个账号或配置文件路由"
title: "OAuth"
---

OpenClaw 支持为提供该功能的提供商使用 OAuth（“订阅认证”）， 尤其是 **OpenAI Codex（ChatGPT OAuth）** 和 **Anthropic Claude CLI 复用**。 对于 Anthropic，实际可分为：

- **Anthropic API key**：正常的 Anthropic API 计费。
- **Anthropic Claude CLI / OpenClaw** 内的订阅授权：Anthropic 工作人员告诉我们再次允许这种使用，所以 OpenClaw除非 Anthropic 发布新策略，否则将 Claude CLI 重用和 `claude -p` 使用视为此集成的认可。对于生产中的 Anthropic，API 密钥身份验证仍然是更安全的推荐路径。

OpenClaw 在标准提供商 ID `openai` 下存储 OpenAI API-key auth 和 ChatGPT/Codex OAuth。较旧的 `openai-codex:*` 配置文件 ID 和 `auth.order.openai-codex` 条目是由 `openclaw doctor --fix` 修复的遗留状态；使用 `openai:*` 配置文件 ID 和 `auth.order.openai` 进行新配置。

本页涵盖：

- OAuth **令牌交换** 的工作方式（PKCE）
- 令牌**存储**的位置（以及原因）
- 如何处理**多个账号**（配置文件 + 按会话覆盖）

提供自己的 OAuth 或 API-key 流的提供商插件通过相同的入口点运行：

```bash
openclaw models auth login --provider <id>
```

在 Control UI 中，打开 **设置 → 模型 → 连接提供商** 以保存支持的帐户，而无需请求模型回复。模型设置中的 **Connect 提供程序** 打开相同的选取器和连接流程。当您想要验证模型并选择它时，选择 **Test & use**。仅支持完整设置的插件保留其单独的设置操作。

OpenClaw 的浏览器回调页面遵循系统的浅色或深色外观。如果页面显示 **Authorization returned**，请返回终端，同时 OpenClaw 完成交换并保存帐户。登录完成后，终端或 Control UI 会报告。

## <a id="the-token-sink-(why-it-exists)"></a><a id="the-token-sink-why-it-exists"></a> 令牌汇点（为什么会存在）

OAuth 提供商通常会在每个 login/refresh. 上生成一个新的刷新令牌某些提供商在为同一 user/app. 颁发新令牌时会使之前的刷新令牌失效实际症状：通过 OpenClaw 登录并通过 Claude Code / Codex CLI 登录，并且其中一个随机被注销稍后。

为减少这种情况，OpenClaw 将认证配置文件存储视为一个**令牌汇点**：

- 运行时从每个 agent 的一个位置读取凭据
- 多个配置文件可以共存并按固定规则路由
- external CLI 重用是特定于提供商的：一旦 OpenClaw 拥有提供商的本地 OAuth 配置文件，本地刷新令牌就是事实来源。如果该本地刷新令牌被拒绝，OpenClaw 会报告配置文件以进行重新身份验证，而不是退回到外部 CLI 令牌材料。 Codex CLI 引导程序仍然更窄：在 OpenClaw 拥有该提供商的 OAuth 之前，它只能播种一个空的 `openai:default`-style 配置文件；之后，OpenClaw-owned 刷新仍然是事实来源
- status/startup 将外部 CLI 发现范围路径路径到已配置的提供程序集，因此不会针对单提供程序设置检查不相关的 CLI 登录存储

## <a id="storage-(where-tokens-live)"></a><a id="storage-where-tokens-live"></a> 存储（令牌存放在哪里）

凭证使用共享的通读基础，而每个代理拥有其本地凭证覆盖和身份验证路由状态：

- 共享凭证：`~/.openclaw/state/openclaw.sqlite`
- 代理本地凭证和状态：`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
- 代理凭证行：`auth_profile_store`
- 代理顺序、最后好、冷却时间和使用行：`auth_profile_state`

从配置文件或 `models accounts login` 添加的个人帐户使用所选网关的共享状态数据库中的私有身份范围记录：`model-accounts` 拥有所选链接，每个凭证都有自己的 `model-account:<profile-id>` 记录，其中包含其秘密和使用状态。一次运行时仅加载选定的个人配置文件；普通的共享帐户读取永远不会枚举这些记录。个人 OAuth 刷新写回到该人的帐户记录，而不是共享或代理本地凭据。

较旧的安装可能仍包含 `auth-profiles.json`、`auth-state.json` 或每个代理 `auth.json`。升级后运行一次`openclaw doctor --fix`。 Doctor 导入经过验证的值，记录迁移收据，并将原始文件重命名为带时间戳的存档。

旧的共享 `credentials/oauth.json` 导入程序已退役。 Doctor 保持该文件不变，并报告在安装最新版本之前需要通过 `2026.9.5`](/install/updating#upgrading-very-old-versions) 导入该文件进行 [ 升级。

运行时从不使用这些废弃文件中的凭据。当受支持的导入文件之一仍然存在时会发生什么取决于 SQLite 是否已经可以为该代理提供凭据：

- 存储保存配置文件：退役的文件是剩余字节。运行时记录一个一次性警告，命名该文件并继续工作；医生将其归档在下一个`--fix`上。 Doctor 永远不会用导入的值覆盖可用的存储凭据，因此文件无法复活过时的令牌。
- 存储为空：运行时仅读取 `auth-profiles.json` 中的提供者元数据以覆盖 `AUTH_PROFILE_MIGRATION_REQUIRED`。此处指定的提供程序无法通过环境或配置身份验证；不相关的提供者继续正常解析。错误和医生发现列出了受影响的提供程序和恢复命令 `openclaw doctor --fix`。
- 如果无法确定提供商范围（包括格式错误的 JSON 或其他已停用的凭证格式），则拒绝将在代理范围内保持不变。网关启动会降级凭证所有者，而不是拒绝启动。凭证写入和快照发布将保持隔离状态，直到迁移被清除。

数据库和迁移源遵循 `$OPENCLAW_STATE_DIR`。完整参考：[/gateway/config-secrets-env#auth-storage](/gateway/config-secrets-env#auth-storage)

有关静态机密引用和运行时快照激活行为，请参阅 [Secrets Management](/gateway/secrets)。

当代理没有本地身份验证配置文件时，OpenClaw 读取共享身份验证存储；它不会将共享凭据克隆到代理数据库中。 OAuth 刷新令牌特别敏感：正常复制流程默认会跳过它们，因为某些提供程序会在使用后轮换或使刷新令牌失效。当坐席需要独立账户时，为坐席配置单独的OAuth登录。

## <a id="anthropic-claude-cli-reuse"></a> Anthropic Claude CLI 复用

OpenClaw 支持复用 Anthropic Claude CLI，以及将 `claude -p` 作为经批准的身份验证路径。如果你已经在主机上登录了 Claude，onboarding/configure 可以直接复用该登录状态。Anthropic setup-token 仍然作为受支持的 token-auth 路径可用，但 OpenClaw 在可用时更倾向于复用 Claude CLI。

<Warning>
Anthropic 的公开 Claude Code 文档称直接使用 Claude Code 保持在 Claude 订阅限制内，Anthropic 工作人员告诉我们 OpenClaw-style Claude CLI 再次被允许使用。因此，除非 Anthropic 发布新策略，否则 OpenClaw 将 Claude CLI 重用和 `claude -p` 使用视为此集成的认可。

有关 Anthropic 当前的直接 Claude-Code 计划文档，请参阅 [ 在 Pro 或 Max 计划中使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan) 和 [ 在团队或企业中使用 Claude Code计划](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果你想在 OpenClaw 中使用其他订阅式选项，请参见 [OpenAI Codex](/providers/openai)、[Qwen Cloud Coding Plan](/providers/qwen)、[MiniMax Coding Plan](/providers/minimax)，以及 [Z.AI / GLM Coding Plan](/providers/zai)。
</Warning>

## <a id="oauth-exchange-(how-login-works)"></a><a id="oauth-exchange-how-login-works"></a> OAuth 交换（登录如何工作）

OpenClaw 的 OAuth 注册表和适配器位于 `src/llm/utils/oauth/` 中。共享提供程序助手位于 `src/plugin-sdk/provider-oauth-runtime.ts` 和 `src/plugin-sdk/provider-auth-runtime.ts` 中。 `src/commands/models/auth.ts` 中的身份验证命令运行选定的提供程序方法并保留返回的配置文件。

### <a id="restarting-sign-in-in-model-setup"></a> 在模型设置中重新启动登录

在 **Model Setup** 中，再次启动相同的登录会替换对相同代理和工作区的未完成的尝试。这包括 **使用 ChatGPT** 登录以及其他提供商登录流程。使用最新的浏览器链接；不再接受上次尝试的回调。

其他用户的登录、不同的设置流程或已保存凭据或配置的尝试仍将受到保护。让该操作完成后再重试。

### <a id="anthropic-setup-token"></a> Anthropic 设置令牌

流程形态：

1. 通过在任何具有 Claude Code 的机器上运行 `claude setup-token` 来创建令牌，然后从 OpenClaw 启动 Anthropic 设置令牌或粘贴令牌
2. OpenClaw 将生成的 Anthropic 凭据存储在认证配置文件中
3. 模型选择保持为 `anthropic/...`
4. 现有的 Anthropic 身份验证配置文件仍然可用于 rollback/order 控制

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流。

登录命令使用标准 OpenAI 提供商 ID：

```bash
openclaw models auth login --provider openai
```

在同一个代理中使用多个 ChatGPT/Codex OAuth 账号时，请使用 `--profile-id openai:<name>`。新建配置文件不要使用 `openai-codex:<name>`。Doctor 会将该旧前缀迁移为无冲突的 `openai:*` 配置文件 id；修复后请运行 `openclaw models auth list --provider openai`，再把配置文件 id 复制到 `auth.order` 或 `/model ...@<profileId>` 中。

流程形态（PKCE）：

1. 生成一个 PKCE verifier/challenge 和一个随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`（作用域 `openid profile email offline_access`）
3. 尝试在 `http://localhost:1455/auth/callback` 捕获回调（回调主机默认是 `localhost`，并且只接受 loopback 主机； 可通过 `OPENCLAW_OAUTH_CALLBACK_HOST` 覆盖）
4. 如果您可以在回调到达之前粘贴代码（或者您是 remote/headless 并且回调无法绑定），请粘贴重定向 URL/code - 手动粘贴会与浏览器回调竞争，以先完成者为准
5. 在 `https://auth.openai.com/oauth/token` 交换 code
6. 从 access token 中提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径是 `openclaw onboard` → auth choice `openai`。

## <a id="refresh-%2B-expiry"></a><a id="refresh-+-expiry"></a> 刷新 + 过期

配置文件会存储一个 `expires` 时间戳。在运行时：

- 如果 `expires` 在未来，则使用已存储的访问令牌
- if 已过期，刷新并将新凭证保存回所属 SQLite 存储
- 如果代理从共享存储中读取 OAuth 配置文件，刷新将写回该共享所有者，而不是将刷新令牌复制到代理存储中
- 外部管理的 CLI 凭据（Claude CLI、窄化的 Codex CLI 引导；见 [令牌汇](#the-token-sink-why-it-exists)）会被重新读取，而不是消耗一个复制来的刷新令牌。如果受管刷新失败，OpenClaw 会报告受影响的配置文件需要重新认证，而不是返回外部 CLI 令牌内容。

刷新流程是自动的；通常你无需手动管理令牌。

## <a id="multiple-accounts-(profiles)-%2B-routing"></a><a id="multiple-accounts-profiles-+-routing"></a> 多账号（配置文件）+ 路由

三种模式：

### <a id="1)-preferred%3A-separate-agents"></a><a id="1-preferred-separate-agents"></a> 1) 推荐：分离代理

如果你希望“个人”和“工作”永不互相影响，请使用隔离代理（独立会话 + 凭据 + 工作区）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后按代理配置认证（向导），并将聊天路由到正确的代理。

### <a id="2)-advanced%3A-multiple-profiles-in-one-agent"></a><a id="2-advanced-multiple-profiles-in-one-agent"></a> 2) 高级：一个代理中使用多个配置文件

身份验证配置文件存储支持同一提供商的多个配置文件 ID。选择使用哪一个：

- 通过全局配置排序（`auth.order`）
- 按会话通过 `/model ...@<profileId> -s`

示例（会话覆盖）：

- `/model Opus@anthropic:work -s`

### <a id="3)-multi-user%3A-personal-accounts"></a><a id="3-multi-user-personal-accounts"></a> 3） 多用户：个人账户

在共享网关上，每个经过验证的人员都可以在 **设置 → 个人资料 → 连接帐户** 中保存每个提供商的多个帐户，并选择一个作为新聊天默认值。 **添加帐户** 和 `openclaw models accounts login` 使用相同的网关拥有的提供商和登录方法目录。 Anthropic 个人设置接受 API 密钥，而不是 Claude 订阅令牌； system/agent 身份验证仍然是一个单独的流程。在请求提供者凭据之前，两个登录界面都会显示网关、经过验证的人员和个人范围。网关身份和提供商登录是分开的；共享网关令牌不能识别个人身份。请参见 [ 个人账户 CLI 设置 ](/cli/models#personal-model-accounts)。

新会话或现有聊天中的模型选择器可以为该聊天选择一个帐户，而无需更改默认值。有序共享帐户仍然是同一提供商的故障转移候选者；该选择不构成计费保证。个人凭据保留在共享配置文件列表之外。请参阅 [ 每人模型帐户](/concepts/multi-user#per-person-model-accounts)。

列出您保存的个人帐户：

```bash
openclaw models accounts list
```

对于共享或代理本地配置文件 ID，请使用：

```bash
openclaw models auth list --provider <id>
```

相关文档：

- [模型故障转移](/concepts/model-failover)（轮换 + 冷却规则）
- [斜杠命令](/tools/slash-commands)（命令入口）。

## <a id="related"></a> 相关内容

- [OpenAI认证](/providers/openai/authentication) - 登录方法、身份和功能
- [认证](/gateway/authentication) - 模型提供商认证概览
- [Secrets](/gateway/secrets) - 凭据存储和 SecretRef
- [配置 Reference](/gateway/config-secrets-env#auth-storage) - 身份验证配置密钥
- [Auth 凭证语义](/auth-credential-semantics) - 身份验证配置文件排序和运行时凭证解析的共享规则
