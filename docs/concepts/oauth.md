---
summary: "OpenClaw 中的 OAuth：令牌交换、存储与多账号模式"
read_when:
  - 你想端到端了解 OpenClaw 的 OAuth
  - 你遇到令牌失效 / 登出问题
  - 你想了解 Claude CLI 或 OAuth 认证流程
  - 你想使用多个账号或配置文件路由
title: "OAuth"
---

OpenClaw 支持为提供该功能的提供商使用 OAuth（“订阅认证”），
尤其是 **OpenAI Codex（ChatGPT OAuth）** 和 **Anthropic Claude CLI 复用**。
对于 Anthropic，实际可分为：

- **Anthropic API key**：正常的 Anthropic API 计费。
- **Anthropic Claude CLI / OpenClaw 内的订阅认证**：Anthropic 员工
  告诉我们这种用法现在再次被允许，因此除非 Anthropic
  发布新政策，否则 OpenClaw 会将 Claude CLI 复用和
  `claude -p` 用法视为此集成的授权用法。对于生产环境中的 Anthropic，API key 认证仍然
  是更安全、推荐的路径。

OpenClaw 会将 OpenAI API key 认证和 ChatGPT/Codex OAuth 都存储在
规范化的提供商 id `openai` 下。旧的 `openai-codex:*` 配置文件 id 和
`auth.order.openai-codex` 条目属于旧状态，会由
`openclaw doctor --fix` 修复；新配置请使用 `openai:*` 配置文件 id 和
`auth.order.openai`。

本页涵盖：

- OAuth **令牌交换** 的工作方式（PKCE）
- 令牌**存储**的位置（以及原因）
- 如何处理**多个账号**（配置文件 + 按会话覆盖）

提供其自身 OAuth 或 API key 流程的提供商插件都通过同一个
入口点运行：

```bash
openclaw models auth login --provider <id>
```

## 令牌汇点（为什么会存在）

OAuth 提供商通常会在每次登录/刷新时新铸造一个新的刷新令牌。
一些提供商在同一用户/应用发放新的刷新令牌时，会使之前的刷新令牌失效。实际表现：通过 OpenClaw 登录，以及通过 Claude Code / Codex CLI 登录，其中一个会在之后随机被登出。

为减少这种情况，OpenClaw 将认证配置文件存储视为一个**令牌汇点**：

- 运行时从每个 agent 的一个位置读取凭据
- 多个配置文件可以共存，并且能够确定性地路由
- 外部 CLI 复用取决于提供商：一旦 OpenClaw 为某个提供商拥有了本地 OAuth 配置文件，本地刷新令牌就是权威来源。如果该本地刷新令牌被拒绝，OpenClaw 会报告该配置文件需要重新认证，而不是回退到外部 CLI 的令牌材料。Codex CLI 的引导范围更窄：它只能在 OpenClaw 尚未为该提供商拥有 OAuth 之前，先为一个空的 `openai:default` 风格配置文件播种；此后，由 OpenClaw 拥有的刷新流程保持权威
- 状态/启动路径会将外部 CLI 发现范围限定为已配置的提供商集合，因此在单一提供商设置中，不会探测无关的 CLI 登录存储

## 存储（令牌存放在哪里）

机密信息和身份验证路由状态存储在每个 agent 的规范 SQLite 数据库中：

- `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
- 凭据记录：`auth_profile_store`
- 顺序、最近可用、冷却和使用情况记录：`auth_profile_state`

较旧的安装可能仍包含 `auth-profiles.json`、`auth-state.json`、
每个 agent 的 `auth.json`，或共享的 `credentials/oauth.json`。升级后请运行一次
`openclaw doctor --fix`。Doctor 会导入已验证的值，记录迁移回执，并将原始文件重命名为带时间戳的
归档文件。运行时永远不会读取这些已弃用的文件；当旧版凭据来源尚未迁移时，会报告
`AUTH_PROFILE_MIGRATION_REQUIRED`。

数据库和迁移来源遵循 `$OPENCLAW_STATE_DIR`。完整参考：[配置参考：身份验证存储](/gateway/configuration-reference#auth-storage)

关于静态密钥引用和运行时快照激活行为，见 [机密信息管理](/gateway/secrets)。

当次级 agent 没有本地 auth profile 时，OpenClaw 会从默认/主 agent 存储进行读穿式继承；读取时不会克隆主 agent 的存储。OAuth 刷新令牌尤其敏感：由于某些提供商会在使用后轮换或使刷新令牌失效，正常的复制流程默认会跳过它们。若某个 agent 需要独立账户，请为其单独配置 OAuth 登录。

## Anthropic Claude CLI 复用

OpenClaw 支持复用 Anthropic Claude CLI，以及将 `claude -p` 作为经批准的
身份验证路径。如果你已经在主机上登录了 Claude，onboarding/configure 可以直接复用该登录状态。Anthropic setup-token 仍然
作为受支持的 token-auth 路径可用，但 OpenClaw 在可用时更倾向于复用 Claude CLI。

<Warning>
Anthropic 的公开 Claude Code 文档说明，直接使用 Claude Code 仍属于 Claude 订阅额度内，且 Anthropic 员工告诉我们，类似 OpenClaw 的 Claude CLI 用法已再次获准。因此，除非 Anthropic
发布新政策，OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为此集成中的被授权行为。

关于 Anthropic 当前的直接 Claude Code 方案文档，请参见 [使用 Claude Code 搭配你的 Pro 或 Max
套餐](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
和 [使用 Claude Code 搭配你的 Team 或 Enterprise
套餐](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果你想在 OpenClaw 中使用其他订阅式选项，请参见 [OpenAI
Codex](/providers/openai)、[Qwen Cloud Coding
Plan](/providers/qwen)、[MiniMax Coding Plan](/providers/minimax)，以及 [Z.AI / GLM Coding Plan](/providers/zai)。
</Warning>

## OAuth 交换（登录如何工作）

OpenClaw 的交互式登录流程实现在 `openclaw/plugin-sdk/llm.ts` 中，并接入了向导/命令。

### Anthropic setup-token

流程形态：

1. 通过在任何安装了 Claude Code 的机器上运行 `claude setup-token` 创建令牌，然后从 OpenClaw 启动 Anthropic setup-token 或 paste-token
2. OpenClaw 将生成的 Anthropic 凭据存储在认证配置文件中
3. 模型选择保持为 `anthropic/...`
4. 现有的 Anthropic 认证配置文件仍然可用，可用于回滚/顺序控制

### OpenAI Codex（ChatGPT OAuth）

OpenAI Codex OAuth 明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流。

登录命令使用规范的 OpenAI provider id：

```bash
openclaw models auth login --provider openai
```

在同一个代理中使用多个 ChatGPT/Codex OAuth 账号时，请使用 `--profile-id openai:<name>`。新建配置文件不要使用 `openai-codex:<name>`。Doctor 会将该旧前缀迁移为无冲突的 `openai:*` 配置文件 id；修复后请运行 `openclaw models auth list --provider openai`，再把配置文件 id 复制到 `auth.order` 或 `/model ...@<profileId>` 中。

流程形态（PKCE）：

1. 生成一个 PKCE verifier/challenge 和一个随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`（作用域
   `openid profile email offline_access`）
3. 尝试在 `http://localhost:1455/auth/callback` 捕获回调（回调主机默认是 `localhost`，并且只接受 loopback 主机；
   可通过 `OPENCLAW_OAUTH_CALLBACK_HOST` 覆盖）
4. 如果你能在回调到达前粘贴 code（或者你处于
   远程/无头环境且回调无法绑定），则改为粘贴重定向 URL/code
   —— 手动粘贴会与浏览器回调竞争，先完成的那个获胜
5. 在 `https://auth.openai.com/oauth/token` 交换 code
6. 从 access token 中提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径是 `openclaw onboard` → auth choice `openai`。

## 刷新 + 过期

配置文件会存储一个 `expires` 时间戳。在运行时：

- 如果 `expires` 在未来，则使用已存储的访问令牌
- 如果已过期，则进行刷新（在文件锁下），并覆盖已存储的凭据
- 如果某个辅助代理读取了继承的主代理 OAuth 配置文件，则刷新会写回主代理存储，而不是把刷新令牌复制到辅助代理存储中
- 外部管理的 CLI 凭据（Claude CLI、窄化的 Codex CLI 引导；见 [令牌汇](#the-token-sink-why-it-exists)）会被重新读取，而不是消耗一个复制来的刷新令牌。如果受管刷新失败，OpenClaw 会报告受影响的配置文件需要重新认证，而不是返回外部 CLI 令牌内容。

刷新流程是自动的；通常你无需手动管理令牌。

## 多账号（配置文件）+ 路由

有两种模式：

### 1) 推荐：分离代理

如果你希望“个人”和“工作”永不互相影响，请使用隔离代理（独立会话 + 凭据 + 工作区）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后按代理配置认证（向导），并将聊天路由到正确的代理。

### 2) 高级：一个代理中使用多个配置文件

认证配置存储支持同一提供方的多个配置文件 ID。
选择要使用的配置文件：

- 通过全局配置排序（`auth.order`）
- 按会话通过 `/model ...@<profileId> -s`

示例（会话覆盖）：

- `/model Opus@anthropic:work -s`

列出现有的配置文件 ID：

```bash
openclaw models auth list --provider <id>
```

相关文档：

- [模型故障转移](/concepts/model-failover)（轮换 + 冷却规则）
- [斜杠命令](/tools/slash-commands)（命令入口）。

## 相关内容

- [认证](/gateway/authentication) - 模型提供商认证概览
- [Secrets](/gateway/secrets) - 凭据存储和 SecretRef
- [配置参考](/gateway/configuration-reference#auth-storage) - 认证配置键。
