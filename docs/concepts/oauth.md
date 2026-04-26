---
summary: "OpenClaw 中的 OAuth：令牌交换、存储和多账户模式"
read_when:
  - 您想了解 OpenClaw OAuth 端到端流程
  - 您遇到令牌失效/登出问题
  - 您想要 Claude CLI 或 OAuth 认证流程
  - 您想要多账户或配置文件路由
title: "OAuth"
---

OpenClaw 支持通过 OAuth 提供的“订阅认证”，适用于提供该能力的服务商
（尤其是 **OpenAI Codex（ChatGPT OAuth）**）。对于 Anthropic，当前实际上的区分是：

- **Anthropic API key**：正常 Anthropic API 计费
- **Anthropic Claude CLI / OpenClaw 内的订阅认证**：Anthropic 工作人员告知我们此用法再次被允许

OpenAI Codex OAuth 明确支持在 OpenClaw 等外部工具中使用。本页说明：

对于生产环境中的 Anthropic，API key 认证是更安全且推荐的路径。

- OAuth **令牌交换** 的工作原理（PKCE）
- 令牌的**存储位置**（以及为何如此）
- 如何处理**多账户**（配置文件 + 每会话覆盖）

OpenClaw 还支持自带 OAuth 或 API key 流程的 **服务商插件**。可通过以下命令运行：

```bash
openclaw models auth login --provider <id>
```

## 令牌接收处（存在的原因）

OAuth 服务商通常在登录/刷新流程中生成**新的刷新令牌**。有些服务商（或 OAuth 客户端）会在同一用户/应用生成新令牌时，使旧的刷新令牌失效。

实际表现：

- 你通过 OpenClaw _和_ Claude Code / Codex CLI 登录 → 其中一个后来可能会"随机登出"

为减少这种情况，OpenClaw 将 `auth-profiles.json` 视为**令牌接收处**：

- 运行时从**单一位置**读取凭据
- 我们可以保留多个配置文件并以确定性方式路由
- 外部 CLI 复用取决于服务商：Codex CLI 可以为一个空的
  `openai-codex:default` 配置文件初始化引导，但一旦 OpenClaw 拥有本地 OAuth 配置文件，
  本地刷新令牌就是权威来源；其他集成可以继续
  由外部管理并重新读取其 CLI 认证存储

## 存储位置（令牌存放在哪里）

秘密信息按**每个代理 (agent)** 存储：

- 认证配置（OAuth + API keys + 可选的值级引用）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 兼容旧版文件：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （静态 `api_key` 条目发现后会被清理）

仅用于旧版导入（仍支持，但非主存储）：

- `~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）

以上所有路径也遵循 `$OPENCLAW_STATE_DIR`（状态目录覆盖）。完整参考：[/gateway/configuration](/gateway/configuration-reference#auth-storage)

关于静态秘钥引用及运行时快照激活行为，请参见 [密钥管理](/gateway/secrets)。

## Anthropic 遗留令牌兼容性

<Warning>
Anthropic 公开的 Claude Code 文档指出，直接使用 Claude Code 仍属于 Claude 订阅限额内，且 Anthropic 工作人员告知我们 OpenClaw 风格的 Claude CLI 用法再次被允许。因此，除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 复用和 `claude -p` 用法视为此集成所认可的用法。

关于 Anthropic 当前直接的 Claude Code 计划文档，请参阅 [使用 Claude Code 与您的 Pro 或 Max 计划](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan) 和 [使用 Claude Code 与您的 Team 或 Enterprise 计划](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果您想在 OpenClaw 中使用其他订阅式选项，请参阅 [OpenAI Codex](/providers/openai)、[Qwen Cloud Coding 计划](/providers/qwen)、[MiniMax Coding 计划](/providers/minimax) 和 [Z.AI / GLM Coding 计划](/providers/glm)。
</Warning>

OpenClaw 也将 Anthropic setup-token 作为支持的令牌认证路径暴露出来，但现在当可用时，它更倾向于复用 Claude CLI 和 `claude -p`。

## Anthropic Claude CLI 迁移

OpenClaw 再次支持复用 Anthropic Claude CLI。如果您已在主机上拥有本地 Claude 登录，入职/配置可以直接复用该登录。

## OAuth 交换（登录工作原理）

OpenClaw 的交互式登录流程由 `@mariozechner/pi-ai` 实现，并接入向导/命令中。

### Anthropic 设置令牌

流程步骤：

1. 从 OpenClaw 启动 Anthropic setup-token 或 paste-token
2. OpenClaw 将生成的 Anthropic 凭据存储在认证配置文件中
3. 模型选择保持在 `anthropic/...`
4. 现有的 Anthropic 认证配置文件仍可用于回滚/顺序控制

### OpenAI Codex（ChatGPT OAuth）

OpenAI Codex OAuth 明确支持在 Codex CLI 以外使用，包括 OpenClaw 工作流。

流程步骤（PKCE）：

1. 生成 PKCE 校验字符串/挑战码 + 随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试监听地址 `http://127.0.0.1:1455/auth/callback` 捕获回调
4. 若无法绑定回调（或处于远程/无头环境），则手动粘贴重定向 URL/代码
5. 在 `https://auth.openai.com/oauth/token` 处进行交换
6. 从访问令牌中提取 `accountId` 并保存 `{ access, refresh, expires, accountId }`

向导路径为 `openclaw onboard` → 认证方式选择 `openai-codex`。

## 刷新与过期

配置文件存储一个 `expires` 时间戳。

运行时：

- 如果 `expires` 在未来 → 使用存储的访问令牌
- 如果已过期 → 刷新（在文件锁保护下）并覆盖存储的凭据
- 例外：某些外部 CLI 凭据保持由外部管理；OpenClaw
  会重新读取这些 CLI 认证存储，而不是消耗复制的刷新令牌。
  Codex CLI 引导路径有意更窄：它会为一个空的
  `openai-codex:default` 配置文件播种初始内容，然后由 OpenClaw 管理的刷新保持本地
  配置文件作为权威来源。

刷新流程自动完成，通常不需手动操作令牌。

## 多账户（配置文件）+ 路由

有两种方式：

### 1）推荐：分离代理（agents）

若希望"个人"和"工作"账号完全隔离，使用独立代理（分开会话 + 凭据 + 工作空间）：

```bash
openclaw agents add work
openclaw agents add personal
```

随后为每个代理配置认证（向导），并将聊天路由到相应代理。

### 2）高级：单代理内多配置文件

`auth-profiles.json` 允许为同一服务商存在多个配置文件 ID。

选择使用哪个配置文件：

- 通过配置顺序全局指定 (`auth.order`)
- 通过会话命令覆盖： `/model ...@<profileId>`

示例（会话覆盖）：

- `/model Opus@anthropic:work`

查看存在的配置文件 ID：

- `openclaw channels list --json`（显示 `auth[]`）

相关文档：

- [/concepts/model-failover](/concepts/model-failover) (轮换 + 冷却规则)
- [/tools/slash-commands](/tools/slash-commands) (命令界面)

## 相关内容

- [认证](/gateway/authentication) — 模型提供商认证概述
- [密钥](/gateway/secrets) — 凭据存储和 SecretRef
- [配置参考](/gateway/configuration-reference#auth-storage) — 认证配置键
