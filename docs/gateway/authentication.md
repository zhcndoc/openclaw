---
summary: "模型认证：OAuth、API 密钥、Claude CLI 复用以及 Anthropic setup-token"
read_when:
  - "调试模型认证或 OAuth 过期"
  - "编写认证或凭据存储文档"
title: "认证"
---

<Note>
本页面涵盖 **模型提供商** 身份验证（API 密钥、OAuth、Claude CLI 重用、Anthropic 设置令牌）。对于 **网关连接** 身份验证（令牌、密码、可信代理），请参阅 [ 配置 ](/gateway/configuration) 和 [ 可信代理 Auth](/gateway/trusted-proxy-auth)。
</Note>

OpenClaw 支持模型提供者的 OAuth 和 API 密钥。对于始终在线的网关主机，API 密钥是最可预测的选项；当 subscription/OAuth 流与您的提供商帐户模型匹配时，它们也可以工作。

- 完整 OAuth 流程和存储布局：[/concepts/oauth](/concepts/oauth)
- 基于 SecretRef 的身份验证（`env`/`file`/`exec`/`store` 提供商）：[Secrets Management](/gateway/secrets)
- Credential eligibility/reason 使用的 `models status --probe` 代码：[Auth 凭证 Semantics](/auth-credential-semantics)

## <a id="recommended-setup%3A-api-key-(any-provider)"></a><a id="recommended-setup-api-key-any-provider"></a> 推荐设置：API 密钥（任意提供商）

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

## <a id="anthropic%3A-claude-cli-reuse"></a><a id="anthropic-claude-cli-reuse"></a> Anthropic：Claude CLI 复用

Anthropic setup-token auth 仍然是受支持的路径。 Claude CLI 重用（`claude -p`-style 用法）也被批准用于此集成；当 Claude CLI 登录在主机上可用时，这是 local/desktop 使用的首选路径。对于长期存在的网关主机，Anthropic API 密钥仍然是最可预测的选择，具有明确的服务器端计费控制。

Claude CLI 复用的主机设置：

```bash
# Run on the gateway host
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

这是两个步骤：将 Claude Code 登录到主机上的 Anthropic，然后告诉 OpenClaw 通过本地 `claude-cli` 后端路由 Anthropic 模型。

OpenClaw 从不读取、存储、刷新或转发本机登录令牌。安装的`claude`进程读取并刷新自己的登录名。在网关进程上设置时，`CLAUDE_CONFIG_DIR` 选择单独的 Claude 登录。 OpenClaw- 托管设置令牌和 API 密钥仍然是单独的凭据。

网关服务必须解析 `PATH` 上的 `claude`。如果部署需要非标准可执行路径，请通过 [CLI 后端插件 ](/plugins/cli-backend-plugins) 注册包装器。

### <a id="anthropic-setup-token"></a> Anthropic 设置令牌

在安装了 Claude Code 的任何计算机上运行 `claude setup-token`。它打印一个以 `sk-ant-oat01-` 开头的长期令牌。将其存储在网关主机上：

```bash
openclaw models auth login --provider anthropic --method setup-token
```

该命令需要交互式 TTY。有关管理存储令牌的 auth-profile 命令，请参阅 [`openclaw models`](/cli/models#auth-profiles)；有关提供者端详细信息，请参阅 [Anthropic](/providers/anthropic)。

## <a id="manual-token-entry"></a> 手动输入令牌

适用于任何提供商；会写入每个代理的 SQLite 认证存储并更新配置：

```bash
openclaw models auth paste-token --provider openrouter
```

OpenClaw 从每个代理的 `openclaw-agent.sqlite` 读取身份验证配置文件。端点详细信息（`baseUrl`、`api`、模型 ID、标头、超时）属于 `openclaw.json` 或 `models.json` 中的 `models.providers.<id>` 下，而不是身份验证配置文件中。

如果较旧的安装仍然包含 `auth-profiles.json`、`auth-state.json`，或者像 `{ "openrouter": { "apiKey": "..." } }` 这样的扁平结构，请运行 `openclaw doctor --fix` 将其导入 SQLite；doctor 会在原始 JSON 文件旁保留带时间戳的备份。

Bedrock `auth: "aws-sdk"` 等外部身份验证路由不是凭据。对于命名的基岩路线，请在 `openclaw.json` 中设置 `auth.profiles.<id>.mode: "aws-sdk"` — 不要将 `type: "aws-sdk"` 写入身份验证配置文件存储中。 `openclaw doctor --fix` 将旧版 AWS SDK 标记从凭证存储迁移到配置元数据中。

### <a id="secretref-backed-credentials"></a> 由 SecretRef 支持的凭据

- `api_key` 凭据可以使用 `keyRef: { source, provider, id }`
- `token` 凭据可以使用 `tokenRef: { source, provider, id }`
- OAuth-mode 配置文件拒绝 SecretRef 凭证：如果 `auth.profiles.<id>.mode` 是 `"oauth"`，则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 将被拒绝。

## <a id="checking-model-auth-status"></a> 检查模型认证状态

```bash
openclaw models status
openclaw doctor
```

自动化友好检查，expired/missing时退出`1`，`2`到期时退出：

```bash
openclaw models status --check
```

实时身份验证检查（添加 `--probe-provider`、`--probe-profile`、`--probe-timeout`、`--probe-concurrency` 或 `--probe-max-tokens` 以缩小范围）：

```bash
openclaw models status --probe
```

注意：

- Check 行可以来自身份验证配置文件、env 凭据或 `models.json`。
- 如果 `auth.order.<provider>` 省略了存储的配置文件，则检查会报告该配置文件的 `excluded_by_auth_order`，而不是尝试它。
- 如果身份验证存在，但 OpenClaw 无法解析可针对该提供商进行测试的模型，则检查报告 `status: no_model`。
- 限流冷却可以按模型作用域生效：某个配置文件在某个模型上进入冷却后，仍然可以为同一提供商上的兄弟模型提供服务。

可选运维脚本（systemd/Termux）：[认证监控脚本](/help/scripts#auth-monitoring-scripts)。

## <a id="api-key-rotation-(gateway)"></a><a id="api-key-rotation-gateway"></a> API 密钥轮换（gateway）

当某个请求触发提供商的速率限制时，某些提供商会使用另一个已配置的密钥重试该请求。

每个提供商的密钥优先级顺序：

1. `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个覆盖，固定使用一个密钥）
2. `<PROVIDER>_API_KEYS`（comma/space/semicolon-separated列表）
3. `<PROVIDER>_API_KEY`
4. `<PROVIDER>_API_KEY_*`（任何以前缀开头的环境变量）

Google 提供商（`google`、`google-vertex`）还会额外回退到 `GOOGLE_API_KEY`。合并后的列表会在使用前去重。

OpenClaw 仅在错误消息匹配以下内容时才会轮换到下一个密钥：`rate_limit`、`rate limit`、`429`、`quota exceeded`/`quota_exceeded`、`resource exhausted`/`resource_exhausted`，或 `too many requests`。其他错误不会使用备用密钥重试。如果所有密钥都失败，则返回最后一次尝试的最终错误。

<Note>
特定于提供商的短语（例如 `ThrottlingException`、`concurrency limit reached` 或 `workers_ai ... quota limit exceeded`）驱动 **failover/retry 分类**（在重复失败时切换模型或提供商），这是与上面的 API- 密钥轮换不同的机制。
</Note>

移除已保存的认证信息不会在提供商侧撤销该密钥——当你需要在提供商侧使其失效时，请在提供商控制台中轮换或撤销它。

## <a id="removing-provider-auth-while-the-gateway-is-running"></a> 网关运行时移除提供方认证

当您通过网关控制平面删除提供者身份验证时，OpenClaw 会删除该提供者已保存的身份验证配置文件，并中止其所选模型提供者与已删除模型提供者匹配的活动 chat/agent 运行。中止的运行会发出带有 `stopReason: "auth-revoked"` 的正常 cancellation/lifecycle 事件，因此连接的客户端可以显示运行已停止，因为凭据已被删除。

## <a id="controlling-which-credential-is-used"></a> 选择使用哪个凭据

### <a id="openai-and-legacy-openai-codex-ids"></a> OpenAI 和旧版 `openai-codex` id

OpenAI API-key 配置文件和 ChatGPT/Codex OAuth 配置文件均使用标准提供商 ID `openai`。使用 `openai:*` 配置文件 ID 和 `auth.order.openai` 进行新配置。

如果您在较旧的配置、身份验证配置文件 ID 或 `auth.order.openai-codex` 中看到 `openai-codex`，请将其视为旧迁移输入 — 不要创建新的 `openai-codex` 配置文件。跑步：

```bash
openclaw doctor --fix
openclaw models auth list --provider openai
```

Doctor 将旧版 `openai-codex:*` 配置文件 ID 和 `auth.order.openai-codex` 条目重写为当前 `openai` 路由。对于 OpenAI- 特定的 model/runtime 路由，请参阅 [OpenAI](/providers/openai)。

### <a id="during-login-(cli)"></a><a id="during-login-cli"></a> 登录期间（CLI）

```bash
openclaw models auth login --provider openai --profile-id openai:ritsuko
openclaw models auth login --provider openai --profile-id openai:lain
```

`--profile-id` 可在同一个代理内将同一提供方的多个 OAuth 登录彼此分开。

`--force` 会删除所选代理目录中该提供方已保存的 auth 配置文件，然后重新运行相同的 auth 流程。当已保存的配置文件卡住、过期或绑定到错误账号时使用它。它不会在提供方处撤销凭据。

```bash
openclaw models auth login --provider anthropic --force
```

### <a id="per-session-(chat-command)"></a><a id="per-session-chat-command"></a> 按会话（聊天命令）

- `/model <alias-or-id>@<profileId> -s` 会为当前会话固定特定的提供方凭据（配置文件 id 示例：`anthropic:default`、`anthropic:work`）。
- `/model`（或 `/model list`）显示紧凑选择器；`/model status` 显示完整视图（候选项 + 下一个 auth 配置文件，以及配置完成时的提供方端点详细信息）。

对 `auth.order` 的更改会影响自动配置文件选择。 `/new` 和 `/reset` 清除自动选择的 fallback/rotation 状态，但保留有效的显式用户 model/profile 引脚；选择另一个显式 `@profile` 选择来替换用户配置文件引脚。

### <a id="per-agent-(cli-override)"></a><a id="per-agent-cli-override"></a> 按代理（CLI 覆盖）

Auth 顺序覆盖会存储在该代理的 SQLite auth 状态中：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 可针对特定代理；省略它则使用已配置的默认代理。`openclaw models status --probe` 会将被省略的已存储配置文件显示为 `excluded_by_auth_order`，而不是静默跳过它们。

## <a id="troubleshooting"></a> 故障排查

### <a id="%22no-credentials-found%22"></a><a id="no-credentials-found"></a> “未找到凭据”

在 **网关主机** 上配置 Anthropic API 密钥，或设置 [Anthropic setup-token](#anthropic-setup-token) 路径，然后重新检查：

```bash
openclaw models status
```

### <a id="token-expiring%2Fexpired"></a><a id="token-expiring/expired"></a> 代币 expiring/expired

运行 `openclaw models status` 以查看哪个配置文件即将过期。如果 Anthropic 令牌配置文件丢失或过期，请通过 [setup-token](#anthropic-setup-token) 刷新它或迁移到 Anthropic API 密钥。

## <a id="related"></a> 相关内容

- [密钥管理](/gateway/secrets)
- [远程访问](/gateway/remote)
- [认证存储](/concepts/oauth)
