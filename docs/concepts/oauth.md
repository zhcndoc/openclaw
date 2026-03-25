---
summary: "OpenClaw中的OAuth：令牌交换、存储和多账户模式"
read_when:
  - 想要了解OpenClaw OAuth的端到端流程
  - 遇到令牌失效 / 登出问题
  - 想要设置setup-token或OAuth认证流程
  - 想要多账户或配置文件路由
title: "OAuth"
---

# OAuth

OpenClaw 支持通过 OAuth 进行"订阅认证"，适用于提供此功能的服务商（特别是 **OpenAI Codex (ChatGPT OAuth)**）。对于 Anthropic 订阅，请使用 **setup-token** 流程。过去部分用户在Claude Code 以外使用 Anthropic 订阅存在限制，因此请将其视为用户自行承担风险，并自行确认 Anthropic 当前政策。OpenAI Codex OAuth 明确支持在 OpenClaw 等外部工具中使用。本页面说明：

对于 Anthropic 生产环境，推荐使用 API key 认证路径，比订阅的 setup-token 更安全。

- OAuth **令牌交换** 的工作原理（PKCE）
- 令牌的**存储位置**（以及为何如此）
- 如何处理**多账户**（配置文件 + 每会话覆盖）

OpenClaw 还支持自带 OAuth 或 API key 流程的 **服务商插件**。可通过以下命令运行：

```bash
openclaw models auth login --provider <id>
```

## 令牌接收处（存在的原因）

OAuth 服务商通常在登录/刷新流程中生成**新的刷新令牌**。有些服务商（或OAuth客户端）会在同一用户/应用生成新令牌时，使旧的刷新令牌失效。

实际表现：

- 你通过 OpenClaw _和_ Claude Code / Codex CLI 登录 → 其中一个后来可能会"随机登出"

为减少这种情况，OpenClaw 将 `auth-profiles.json` 视为**令牌接收处**：

- 运行时从**一个位置**读取凭据
- 可以保留多个配置文件，且明确路由使用

## 存储位置（令牌存放在哪里）

秘密信息按**每个代理(agent)** 存储：

- 认证配置（OAuth + API keys + 可选的值级引用）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 兼容旧版文件：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （静态 `api_key` 条目发现后会被清理）

仅用于旧版导入（仍支持，但非主存储）：

- `~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）

以上所有路径也遵循 `$OPENCLAW_STATE_DIR`（状态目录覆盖）。完整参考：[/gateway/configuration](/gateway/configuration-reference#auth-storage)

关于静态秘钥引用及运行时快照激活行为，请参见 [Secrets Management](/gateway/secrets)。

## Anthropic setup-token（订阅认证）

<Warning>
Anthropic setup-token 支持仅为技术兼容，不代表政策保证。
Anthropic 过去曾阻止部分用户在 Claude Code 以外使用订阅。
请自行决定是否使用订阅认证，并核实 Anthropic 的当前条款。
</Warning>

在任意机器运行 `claude setup-token`，然后粘贴到 OpenClaw：

```bash
openclaw models auth setup-token --provider anthropic
```

若已从别处生成令牌，则手动粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

验证状态：

```bash
openclaw models status
```

## OAuth 交换（登录流程）

OpenClaw 的交互式登录流程由 `@mariozechner/pi-ai` 实现，并接入向导/命令中。

### Anthropic setup-token

流程步骤：

1. 运行 `claude setup-token`
2. 将令牌粘贴到 OpenClaw 中
3. 以令牌认证配置保存（不支持刷新）

向导路径为 `openclaw onboard` → 认证方式选择 `setup-token`（Anthropic）。

### OpenAI Codex（ChatGPT OAuth）

OpenAI Codex OAuth 明确支持在 Codex CLI 以外使用，包括 OpenClaw 工作流。

流程步骤（PKCE）：

1. 生成 PKCE 校验字符串/挑战码 + 随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试监听地址 `http://127.0.0.1:1455/auth/callback` 捕获回调
4. 若无法绑定回调（或处于远程/无头环境），则手动粘贴重定向URL/代码
5. 在 `https://auth.openai.com/oauth/token` 处进行交换
6. 从访问令牌中提取 `accountId` 并保存 `{ access, refresh, expires, accountId }`

向导路径为 `openclaw onboard` → 认证方式选择 `openai-codex`。

## 刷新与过期

配置文件存储一个 `expires` 时间戳。

运行时：

- 若 `expires` 在未来 → 使用已存储的访问令牌
- 若已过期 → 进行刷新（加文件锁）并覆盖存储凭据

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

`auth-profiles.json` 允许为同一服务商存在多个配置文件ID。

选择使用哪个配置文件：

- 通过配置顺序全局指定 (`auth.order`)
- 通过会话命令覆盖： `/model ...@<profileId>`

示例（会话覆盖）：

- `/model Opus@anthropic:work`

查看存在的配置文件ID：

- `openclaw channels list --json`（显示 `auth[]`）

相关文档：

- [/concepts/model-failover](/concepts/model-failover)（轮换 + 冷却规则）
- [/tools/slash-commands](/tools/slash-commands)（命令操作）
