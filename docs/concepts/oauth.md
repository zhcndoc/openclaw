---
summary: "OpenClaw 中的 OAuth：令牌交换、存储与多账号模式"
read_when:
  - 你想端到端了解 OpenClaw 的 OAuth
  - 你遇到令牌失效 / 登出问题
  - 你想了解 Claude CLI 或 OAuth 认证流程
  - 你想使用多个账号或配置文件路由
title: "OAuth"
---

OpenClaw 支持通过 OAuth 提供“订阅式认证”，适用于提供该能力的服务商
（尤其是 **OpenAI Codex（ChatGPT OAuth）**）。对于 Anthropic，目前实际上的区分是：

- **Anthropic API key**：正常的 Anthropic API 计费
- **Anthropic Claude CLI / OpenClaw 内的订阅认证**：Anthropic 员工
  告知我们此用法已再次被允许

OpenAI Codex OAuth 明确支持用于 OpenClaw 这类外部工具。本页说明：

对于生产环境中的 Anthropic，API key 认证是更安全且更推荐的路径。

- OAuth **令牌交换** 如何工作（PKCE）
- 令牌**存储**在哪里（以及原因）
- 如何处理**多个账号**（配置文件 + 按会话覆盖）

OpenClaw 也支持**提供商插件**，它们会自带自己的 OAuth 或 API key
流程。运行方式如下：

```bash
openclaw models auth login --provider <id>
```

## 令牌汇点（为什么会存在）

OAuth 提供商在登录/刷新流程中通常会签发一个**新的刷新令牌**。某些提供商（或 OAuth 客户端）在同一用户/应用签发新令牌时，会使旧的刷新令牌失效。

实际症状：

- 你通过 OpenClaw 和 Claude Code / Codex CLI 登录 → 之后其中一个会随机“登出”

为降低这种情况，OpenClaw 将 `auth-profiles.json` 视为一个**令牌汇点**：

- 运行时从**一个地方**读取凭据
- 我们可以保留多个配置文件并进行确定性的路由
- 外部 CLI 复用取决于具体提供商：Codex CLI 可以为一个空的
  `openai-codex:default` 配置文件初始化引导，但一旦 OpenClaw 有了本地 OAuth 配置文件，
  本地刷新令牌就是权威来源。如果该本地刷新令牌被拒绝，
  OpenClaw 可以将一个可用的、同账号的 Codex CLI 令牌作为仅运行时
  的回退；其他集成可以继续由外部管理，并重新读取它们的
  CLI 认证存储
- 状态和启动路径在已经知道已配置提供商集合的情况下，
  会将外部 CLI 发现范围限制在该集合内，因此单提供商设置不会去探测
  无关的 CLI 登录存储

## 存储（令牌存放在哪里）

密钥存储在代理认证存储中：

- 认证配置文件（OAuth + API keys + 可选的值级引用）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 兼容旧版的文件：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （发现时会清理静态 `api_key` 条目）

仅用于旧版导入的文件（仍受支持，但不是主存储）：

- `~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）

以上所有路径也都会遵守 `$OPENCLAW_STATE_DIR`（状态目录覆盖）。完整参考：[/gateway/configuration](/gateway/configuration-reference#auth-storage)

关于静态密钥引用和运行时快照激活行为，见 [Secrets Management](/gateway/secrets)。

当次级代理没有本地认证配置文件时，OpenClaw 会从默认/主代理存储中使用读取透传式继承。读取时不会将主代理的 `auth-profiles.json` 克隆到本地。OAuth 刷新令牌尤其敏感：普通复制流程默认会跳过它们，因为某些提供商会在使用后轮换或使刷新令牌失效。当某个代理需要独立账号时，请为其配置单独的 OAuth 登录。

## Anthropic 旧令牌兼容性

<Warning>
Anthropic 的公开 Claude Code 文档说明，直接使用 Claude Code 仍属于 Claude 订阅额度内，且 Anthropic 员工告诉我们，类似 OpenClaw 的 Claude CLI 用法已再次获准。因此，除非 Anthropic
发布新政策，OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为此集成中的被授权行为。

关于 Anthropic 当前的直接 Claude Code 方案文档，请参见 [使用 Claude Code 搭配你的 Pro 或 Max
套餐](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
和 [使用 Claude Code 搭配你的 Team 或 Enterprise
套餐](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果你想在 OpenClaw 中使用其他订阅式选项，请参见 [OpenAI
Codex](/providers/openai)、[Qwen Cloud Coding
Plan](/providers/qwen)、[MiniMax Coding Plan](/providers/minimax)，
以及 [Z.AI / GLM Coding Plan](/providers/glm)。
</Warning>

OpenClaw 还暴露了 Anthropic setup-token 作为受支持的 token-auth 路径，但在可用时现在更倾向于 Claude CLI 复用和 `claude -p`。

## Anthropic Claude CLI 迁移

OpenClaw 现再次支持复用 Anthropic Claude CLI。如果你在主机上已经有本地
Claude 登录，上手/配置流程可以直接复用它。

## OAuth 交换（登录如何工作）

OpenClaw 的交互式登录流程实现在 `@earendil-works/pi-ai` 中，并接入了向导/命令。

### Anthropic setup-token

流程形态：

1. 从 OpenClaw 启动 Anthropic setup-token 或 paste-token
2. OpenClaw 将生成的 Anthropic 凭据存入认证配置文件
3. 模型选择保持在 `anthropic/...`
4. 现有的 Anthropic 认证配置文件仍可用作回滚/顺序控制

### OpenAI Codex（ChatGPT OAuth）

OpenAI Codex OAuth 明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流。

流程形态（PKCE）：

1. 生成 PKCE verifier/challenge + 随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试在 `http://127.0.0.1:1455/auth/callback` 捕获回调
4. 如果回调无法绑定（或你是远程/无头环境），则粘贴重定向 URL/code
5. 在 `https://auth.openai.com/oauth/token` 交换令牌
6. 从访问令牌中提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径为 `openclaw onboard` → 认证选项 `openai-codex`。

## 刷新 + 过期

配置文件会存储一个 `expires` 时间戳。

运行时：

- 如果 `expires` 在未来 → 使用已存储的访问令牌
- 如果已过期 → 刷新（在文件锁保护下）并覆盖已存储的凭据
- 如果次级代理读取的是继承来的主代理 OAuth 配置文件，刷新
  会回写到主代理存储，而不是把刷新令牌复制到
  次级代理存储
- 例外：某些外部 CLI 凭据仍由外部管理；OpenClaw
  会重新读取这些 CLI 认证存储，而不是消耗已复制的刷新令牌。
  Codex CLI 引导有意更窄：它会为一个空的
  `openai-codex:default` 配置文件播种初始化，然后由 OpenClaw 持有的刷新操作保持本地
  配置文件为权威来源。如果本地 Codex 刷新失败，而 Codex CLI 对
  同一账号拥有可用令牌，OpenClaw 可能会在当前
  运行时请求中使用该令牌，而不将其写回 `auth-profiles.json`

刷新流程是自动的；你通常不需要手动管理令牌。

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

`auth-profiles.json` 支持同一提供商的多个配置文件 ID。

选择使用哪个配置文件：

- 全局：通过配置顺序（`auth.order`）
- 按会话：通过 `/model ...@<profileId>`

示例（会话覆盖）：

- `/model Opus@anthropic:work`

如何查看有哪些配置文件 ID：

- `openclaw channels list --json`（显示 `auth[]`）

相关文档：

- [模型故障转移](/concepts/model-failover)（轮换 + 冷却规则）
- [斜杠命令](/tools/slash-commands)（命令入口）

## 相关内容

- [认证](/gateway/authentication) - 模型提供商认证概览
- [Secrets](/gateway/secrets) - 凭据存储和 SecretRef
- [配置参考](/gateway/configuration-reference#auth-storage) - 认证配置键
