---
summary: "模型认证：OAuth、API 密钥、Claude CLI 复用以及 Anthropic setup-token"
read_when:
  - 调试模型认证或 OAuth 过期
  - 编写认证或凭据存储文档
title: "认证"
---

<Note>
本页是**模型提供方**认证参考（API 密钥、OAuth、Claude CLI 复用以及 Anthropic setup-token）。关于**网关连接**认证（token、password、trusted-proxy），请参见 [Configuration](/gateway/configuration) 和 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)。
</Note>

OpenClaw 支持模型提供方的 OAuth 和 API 密钥。对于始终在线的网关主机，API 密钥通常是最可预测的选项。当它们与你的提供方账户模型匹配时，也支持订阅/OAuth 流程。

有关完整的 OAuth 流程和存储布局，请参见 [/concepts/oauth](/concepts/oauth)。
对于基于 SecretRef 的认证（`env`/`file`/`exec` 提供方），请参见 [Secrets Management](/gateway/secrets)。
有关 `models status --probe` 使用的凭据资格/原因码规则，请参见
[Auth Credential Semantics](/auth-credential-semantics)。

## 推荐设置（API 密钥，任意提供方）

如果你运行的是长期存在的网关，请先为所选提供方使用 API 密钥。
就 Anthropic 而言，API 密钥认证仍然是最可预测的服务器端设置，但 OpenClaw 也支持复用本地 Claude CLI 登录。

1. 在你的提供方控制台中创建一个 API 密钥。
2. 将其放到**网关主机**上（运行 `openclaw gateway` 的机器）。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 运行在 systemd/launchd 下，建议将密钥放入
   `~/.openclaw/.env`，这样守护进程就可以读取它：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然后重启守护进程（或重启你的 Gateway 进程）并重新检查：

```bash
openclaw models status
openclaw doctor
```

如果你不想自己管理环境变量，onboarding 也可以为守护进程使用存储
API 密钥：`openclaw onboard`。

有关环境继承（`env.shellEnv`、`~/.openclaw/.env`、systemd/launchd）的详细信息，请参见 [Help](/help)。

## Anthropic：Claude CLI 与 token 兼容性

Anthropic setup-token 认证在 OpenClaw 中仍然可用，作为受支持的 token
路径。Anthropic 员工后来告诉我们，OpenClaw 风格的 Claude CLI 使用现在
再次被允许，因此除非 Anthropic 发布新政策，OpenClaw 会将 Claude CLI 复用
和 `claude -p` 的使用视为该集成的授权方式。当主机上可用 Claude CLI 复用时，
那现在是首选路径。

对于长期运行的网关主机，Anthropic API 密钥仍然是最可预测的
设置。如果你想在同一台主机上复用已有的 Claude 登录，请在 onboarding/configure 中使用
Anthropic Claude CLI 路径。

Claude CLI 复用的推荐主机设置：

```bash
# 在网关主机上运行
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

这是一个两步设置：

1. 先在网关主机上把 Claude Code 自身登录到 Anthropic。
2. 告诉 OpenClaw 将 Anthropic 模型选择切换到本地 `claude-cli`
   后端，并存储匹配的 OpenClaw 认证配置文件。

如果 `claude` 不在 `PATH` 中，请先安装 Claude Code，或者将
`agents.defaults.cliBackends.claude-cli.command` 设置为真实的二进制路径。

手动输入 token（任意提供方；会写入 `auth-profiles.json` 并更新配置）：

```bash
openclaw models auth paste-token --provider openrouter
```

`auth-profiles.json` 只存储凭据。其规范结构如下：

```json
{
  "version": 1,
  "profiles": {
    "openrouter:default": {
      "type": "api_key",
      "provider": "openrouter",
      "key": "OPENROUTER_API_KEY"
    }
  }
}
```

OpenClaw 在运行时要求使用规范的 `version` + `profiles` 结构。如果旧安装仍然保留平面文件，例如 `{ "openrouter": { "apiKey": "..." } }`，请运行 `openclaw doctor --fix` 将其重写为 `openrouter:default` 的 API 密钥配置文件；doctor 会在原文件旁边保留一份 `.legacy-flat.*.bak` 备份。诸如 `baseUrl`、`api`、模型 id、headers 和 timeouts 等端点细节应放在 `openclaw.json` 或 `models.json` 中的 `models.providers.<id>` 下，而不是放在 `auth-profiles.json` 中。

静态凭据也支持 Auth profile 引用：

- `api_key` 凭据可以使用 `keyRef: { source, provider, id }`
- `token` 凭据可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式的 profile 不支持 SecretRef 凭据；如果 `auth.profiles.<id>.mode` 设置为 `"oauth"`，则该 profile 的基于 SecretRef 的 `keyRef`/`tokenRef` 输入会被拒绝。

适合自动化的检查（过期/缺失时退出 `1`，即将过期时退出 `2`）：

```bash
openclaw models status --check
```

实时认证探测：

```bash
openclaw models status --probe
```

注意：

- 探测行可能来自 auth profile、环境凭据或 `models.json`。
- 如果显式的 `auth.order.<provider>` 省略了已存储的 profile，探测会将该 profile 报告为
  `excluded_by_auth_order`，而不是尝试它。
- 如果存在认证，但 OpenClaw 无法为该提供方解析出可探测的模型候选项，
  探测会报告 `status: no_model`。
- 限流冷却可以按模型范围生效。某个 profile 因一个模型进入冷却状态，
  仍可能可用于同一提供方上的另一个兄弟模型。

可选的运维脚本（systemd/Termux）文档在这里：
[Auth monitoring scripts](/help/scripts#auth-monitoring-scripts)

## Anthropic 说明

Anthropic 的 `claude-cli` 后端现已重新支持。

- Anthropic 员工告诉我们，这条 OpenClaw 集成路径现在再次被允许。
- 因此，除非 Anthropic 发布新政策，OpenClaw 会将 Claude CLI 复用和 `claude -p` 的使用视为 Anthropic 后端运行的授权方式。
- 对于长期运行的网关主机以及明确的服务端计费控制，Anthropic API 密钥仍然是最可预测的选择。

## 检查模型认证状态

```bash
openclaw models status
openclaw doctor
```

## API 密钥轮换行为（网关）

某些提供方在 API 调用遇到提供方限流时，支持使用备用密钥重试请求。

- 优先级顺序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个覆盖）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供方还额外包括 `GOOGLE_API_KEY` 作为后备。
- 使用前会对相同的密钥列表去重。
- OpenClaw 仅在限流错误时用下一个密钥重试（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent
requests`、`ThrottlingException`、`concurrency limit reached`，或
  `workers_ai ... quota limit exceeded`）。
- 非限流错误不会使用备用密钥重试。
- 如果所有密钥都失败，则返回最后一次尝试的最终错误。

## 控制使用哪个凭据

### 按会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 为当前会话固定某个特定的提供方凭据（示例 profile id：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）可获得紧凑选择器；使用 `/model status` 可查看完整视图（候选项 + 下一个 auth profile，以及已配置时的提供方端点细节）。

### 按代理（CLI 覆盖）

为某个代理设置显式的 auth profile 顺序覆盖（存储在该代理的 `auth-state.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 可针对特定代理；省略则使用已配置的默认代理。
当你调试顺序问题时，`openclaw models status --probe` 会将被省略的
已存储 profile 显示为 `excluded_by_auth_order`，而不是静默跳过它们。
当你调试冷却问题时，请记住限流冷却可能只绑定到某个模型 id，
而不是整个提供方 profile。

## 故障排除

### “No credentials found”

如果 Anthropic profile 丢失，请在**网关主机**上配置 Anthropic API 密钥，
或者设置 Anthropic setup-token 路径，然后重新检查：

```bash
openclaw models status
```

### Token 即将过期/已过期

运行 `openclaw models status` 以确认是哪个 profile 即将过期。如果某个
Anthropic token profile 丢失或已过期，请通过 setup-token 刷新该设置，或者迁移到 Anthropic API 密钥。

## 相关内容

- [Secrets management](/gateway/secrets)
- [Remote access](/gateway/remote)
- [Auth storage](/concepts/oauth)
