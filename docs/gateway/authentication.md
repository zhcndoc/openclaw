---
summary: "模型认证：OAuth、API 密钥、Claude CLI 复用以及 Anthropic setup-token"
read_when:
  - 调试模型认证或 OAuth 过期
  - 编写认证或凭据存储文档
title: "认证"
---

<Note>
本页涵盖**模型提供方**认证（API 密钥、OAuth、Claude CLI 复用、Anthropic setup-token）。关于**网关连接**认证（token、密码、trusted-proxy），请参见 [Configuration](/gateway/configuration) 和 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)。
</Note>

OpenClaw 支持模型提供方的 OAuth 和 API 密钥。对于始终在线的网关主机，API 密钥是最可预测的选项；当订阅/OAuth 流程与您的提供方账号模型匹配时，它们也同样适用。

- 完整的 OAuth 流程和存储布局：[/concepts/oauth](/concepts/oauth)
- 基于 SecretRef 的认证（`env`/`file`/`exec` 提供方）：[Secrets Management](/gateway/secrets)
- `models status --probe` 使用的凭据可用性/原因代码：[Auth Credential Semantics](/auth-credential-semantics)

## 推荐设置：API 密钥（任意提供商）

1. 在你的提供商控制台中创建一个 API 密钥。
2. 将其放到 **gateway 主机** 上（运行 `openclaw gateway` 的机器）：

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 gateway 通过 systemd/launchd 运行，请将密钥放入 `~/.openclaw/.env`，这样守护进程就可以读取它：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

4. 重启 gateway 进程（或守护进程），然后再次检查：

```bash
openclaw models status
openclaw doctor
```

如果你不想自己管理环境变量，`openclaw onboard` 也可以为守护进程使用而存储 API 密钥。有关完整的环境加载优先级（`env.shellEnv`、`~/.openclaw/.env`、systemd/launchd），请参见 [环境变量](/help/environment)。

## Anthropic：Claude CLI 复用

Anthropic 的 setup-token 认证仍然是受支持的路径。Claude CLI 复用（`claude -p` 风格的用法）也被允许用于此集成；当主机上可用 Claude CLI 登录时，对于本地/桌面使用而言，这是首选路径。对于长期运行的网关主机，Anthropic API key 仍然是最可预测的选择，并且可以进行明确的服务端计费控制。

Claude CLI 复用的主机设置：

```bash
# 在网关主机上运行
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

这分两步完成：先在主机上将 Claude Code 登录到 Anthropic，然后告诉 OpenClaw 通过本地 `claude-cli` 后端路由 Anthropic 模型选择，并保存匹配的 OpenClaw 认证配置文件。

The gateway service must resolve `claude` on `PATH`. If a deployment needs a
nonstandard executable path, register a wrapper through a
[CLI backend plugin](/plugins/cli-backend-plugins).

## 手动输入令牌

适用于任何提供商；会写入每个代理的 SQLite 认证存储并更新配置：

```bash
openclaw models auth paste-token --provider openrouter
```

OpenClaw 从每个代理的 `openclaw-agent.sqlite` 读取认证配置文件。端点详细信息（`baseUrl`、`api`、模型 ID、请求头、超时）应放在 `openclaw.json` 或 `models.json` 中的 `models.providers.<id>` 下，而不是放在认证配置文件中。

如果较旧的安装仍然包含 `auth-profiles.json`、`auth-state.json`，或者像 `{ "openrouter": { "apiKey": "..." } }` 这样的扁平结构，请运行 `openclaw doctor --fix` 将其导入 SQLite；doctor 会在原始 JSON 文件旁保留带时间戳的备份。

诸如 Bedrock 的 `auth: "aws-sdk"` 之类的外部认证路由并不属于凭据。对于命名的 Bedrock 路由，请在 `openclaw.json` 中设置 `auth.profiles.<id>.mode: "aws-sdk"` — 不要把 `type: "aws-sdk"` 写入认证配置存储。`openclaw doctor --fix` 会将旧版 AWS SDK 标记从凭据存储迁移到配置元数据中。

### 由 SecretRef 支持的凭据

- `api_key` 凭据可以使用 `keyRef: { source, provider, id }`
- `token` 凭据可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式的配置文件会拒绝 SecretRef 凭据：如果 `auth.profiles.<id>.mode` 是 `"oauth"`，则该配置文件的基于 SecretRef 的 `keyRef`/`tokenRef` 会被拒绝。

## 检查模型认证状态

```bash
openclaw models status
openclaw doctor
```

自动化友好的检查：当过期/缺失时退出 `1`，当即将过期时退出 `2`：

```bash
openclaw models status --check
```

实时认证探测（添加 `--probe-provider`、`--probe-profile`、`--probe-timeout`、`--probe-concurrency` 或 `--probe-max-tokens` 以缩小范围）：

```bash
openclaw models status --probe
```

注意：

- 探测行可以来自认证配置文件、环境凭据或 `models.json`。
- 如果 `auth.order.<provider>` 省略了某个已存储的配置文件，探测会针对该配置文件报告 `excluded_by_auth_order`，而不是尝试它。
- 如果存在认证，但 OpenClaw 无法为该提供商解析出可探测的模型，探测会报告 `status: no_model`。
- 限流冷却可以按模型作用域生效：某个配置文件在某个模型上进入冷却后，仍然可以为同一提供商上的兄弟模型提供服务。

可选运维脚本（systemd/Termux）：[认证监控脚本](/help/scripts#auth-monitoring-scripts)。

## API 密钥轮换（gateway）

当某个请求触发提供商的速率限制时，某些提供商会使用另一个已配置的密钥重试该请求。

每个提供商的密钥优先级顺序：

1. `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个覆盖，固定使用一个密钥）
2. `<PROVIDER>_API_KEYS`（以逗号/空格/分号分隔的列表）
3. `<PROVIDER>_API_KEY`
4. `<PROVIDER>_API_KEY_*`（任何以前缀开头的环境变量）

Google 提供商（`google`、`google-vertex`）还会额外回退到 `GOOGLE_API_KEY`。合并后的列表会在使用前去重。

OpenClaw 仅在错误消息匹配以下内容时才会轮换到下一个密钥：`rate_limit`、`rate limit`、`429`、`quota exceeded`/`quota_exceeded`、`resource exhausted`/`resource_exhausted`，或 `too many requests`。其他错误不会使用备用密钥重试。如果所有密钥都失败，则返回最后一次尝试的最终错误。

<Note>
类似 `ThrottlingException`、`concurrency limit reached` 或 `workers_ai ... quota limit exceeded` 之类的提供商特定短语用于驱动**故障切换/重试分类**（在重复失败时切换模型或提供商），这与上面的 API 密钥轮换是不同的机制。
</Note>

移除已保存的认证信息不会在提供商侧撤销该密钥——当你需要在提供商侧使其失效时，请在提供商控制台中轮换或撤销它。

## 网关运行时移除提供方认证

当你通过网关控制平面移除提供方认证时，OpenClaw 会删除该提供方已保存的认证配置文件，并中止其所选模型提供方与被移除提供方匹配的所有活动聊天/代理运行。被中止的运行会发出带有 `stopReason: "auth-revoked"` 的正常取消/生命周期事件，因此已连接的客户端可以显示该运行因凭据被移除而停止。

## 选择使用哪个凭据

### OpenAI 和旧版 `openai-codex` id

OpenAI API-key 配置文件和 ChatGPT/Codex OAuth 配置文件都使用规范的提供方 id `openai`。新配置请使用 `openai:*` 配置文件 id 和 `auth.order.openai`。

如果你在旧配置、auth 配置文件 id 或 `auth.order.openai-codex` 中看到 `openai-codex`，请把它视为旧版迁移输入——不要创建新的 `openai-codex` 配置文件。运行：

```bash
openclaw doctor --fix
openclaw models auth list --provider openai
```

Doctor 会将旧的 `openai-codex:*` 配置文件 id 和 `auth.order.openai-codex` 条目重写为规范的 `openai` 路由。有关 OpenAI 特定的模型/运行时路由，请参见 [OpenAI](/providers/openai)。

### 登录期间（CLI）

```bash
openclaw models auth login --provider openai --profile-id openai:ritsuko
openclaw models auth login --provider openai --profile-id openai:lain
```

`--profile-id` 可在同一个代理内将同一提供方的多个 OAuth 登录彼此分开。

`--force` 会删除所选代理目录中该提供方已保存的 auth 配置文件，然后重新运行相同的 auth 流程。当已保存的配置文件卡住、过期或绑定到错误账号时使用它。它不会在提供方处撤销凭据。

```bash
openclaw models auth login --provider anthropic --force
```

### 按会话（聊天命令）

- `/model <alias-or-id>@<profileId>` 为当前会话固定指定某个提供方凭据（示例配置文件 id：`anthropic:default`、`anthropic:work`）。
- `/model`（或 `/model list`）会显示一个简洁选择器；`/model status` 会显示完整视图（候选项 + 下一个 auth 配置文件，以及在已配置时的提供方端点详情）。

如果你更改了已经运行中的聊天的 auth 顺序或配置文件固定设置，请发送 `/new` 或 `/reset` 以开始一个新会话——现有会话会一直保留当前的模型/配置文件选择，直到重置。

### 按代理（CLI 覆盖）

Auth 顺序覆盖会存储在该代理的 SQLite auth 状态中：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 可针对特定代理；省略它则使用已配置的默认代理。`openclaw models status --probe` 会将被省略的已存储配置文件显示为 `excluded_by_auth_order`，而不是静默跳过它们。

## 故障排除

### “未找到凭据”

在 **gateway host** 上配置 Anthropic API key，或者设置 Anthropic setup-token 路径，然后重新检查：

```bash
openclaw models status
```

### Token 即将过期/已过期

运行 `openclaw models status` 查看哪个配置文件即将过期。如果 Anthropic token 配置文件缺失或已过期，请通过 setup-token 刷新它，或者迁移到 Anthropic API key。

## 相关内容

- [密钥管理](/gateway/secrets)
- [远程访问](/gateway/remote)
- [认证存储](/concepts/oauth)
