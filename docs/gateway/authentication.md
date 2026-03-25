---
summary: "模型认证：OAuth，API 密钥和 setup-token"
read_when:
  - 调试模型认证或 OAuth 过期
  - 记录认证或凭证存储
title: "认证"
---

# 认证

OpenClaw 支持模型提供商的 OAuth 和 API 密钥。对于始终在线的网关主机，API 密钥通常是最可预测的选项。当订阅/OAuth 流程符合您的提供商账户模型时，也支持它们。

请参见 [/concepts/oauth](/concepts/oauth) 获取完整的 OAuth 流程和存储布局。
对于基于 SecretRef 的认证（`env`/`file`/`exec` 提供器），请参见 [Secrets Management](/gateway/secrets)。
有关 `models status --probe` 使用的凭证资格/原因码规则，请参阅 [Auth Credential Semantics](/auth-credential-semantics)。

## 推荐设置（API 密钥，任意提供商）

如果您运行的是一个长期运行的网关，建议从您选择的提供商获取一个 API 密钥开始。
专门对于 Anthropic，API 密钥认证是安全路径，推荐优于订阅的 setup-token 认证。

1. 在您的提供商控制台创建一个 API 密钥。
2. 将它放置在 **网关主机** 上（运行 `openclaw gateway` 的机器）。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果网关在 systemd/launchd 下运行，建议将密钥放入 `~/.openclaw/.env`，以便守护进程可以读取：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然后重启守护进程（或重启您的网关进程）并重新检查：

```bash
openclaw models status
openclaw doctor
```

如果您不想自己管理环境变量，onboarding 可以为守护进程存储
API 密钥：`openclaw onboard`。

详情请见 [帮助](/help) 关于环境继承（`env.shellEnv`、`~/.openclaw/.env`、systemd/launchd）。

## Anthropic：setup-token（订阅认证）

如果您正在使用 Claude 订阅，支持 setup-token 流程。请在 **网关主机** 上运行：

```bash
claude setup-token
```

然后将其粘贴到 OpenClaw 中：

```bash
openclaw models auth setup-token --provider anthropic
```

如果令牌是在另一台机器上生成的，请手动粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

如果看到如下 Anthropic 错误：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

…请改用 Anthropic API 密钥。

<Warning>
Anthropic 的 setup-token 支持仅限技术兼容性。Anthropic 过去曾阻止过在 Claude Code 之外的部分订阅使用。仅在您认为政策风险可接受且自行核实 Anthropic 当前条款时使用。
</Warning>

手动令牌输入（任意提供商；写入 `auth-profiles.json` 并更新配置）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

静态凭证也支持认证配置引用：

- `api_key` 凭证可以使用 `keyRef: { source, provider, id }`
- `token` 凭证可以使用 `tokenRef: { source, provider, id }`

便捷的自动化检查（过期/缺失返回退出码 `1`，即将过期返回 `2`）：

```bash
openclaw models status --check
```

可选的运维脚本（systemd/Termux）说明见此：
[/automation/auth-monitoring](/automation/auth-monitoring)

> `claude setup-token` 需要交互式 TTY。

## 检查模型认证状态

```bash
openclaw models status
openclaw doctor
```

## API 密钥轮换行为（网关）

部分提供商支持当 API 调用触发限流时，尝试使用备用密钥重试请求。

- 优先级顺序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个覆盖）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供商还将 `GOOGLE_API_KEY` 作为额外回退。
- 使用前相同的密钥列表会去重。
- OpenClaw 仅对限流错误（如 `429`、`rate_limit`、`quota`、`resource exhausted`）使用下一个密钥重试。
- 非限流错误不会使用备用密钥重试。
- 如果所有密钥都失败，返回最后一次尝试的最终错误。

## 控制使用哪个凭证

### 每会话（聊天命令）

使用 `/model <别名或ID>@<profileId>` 为当前会话固定指定的提供商凭证（示例配置文件 ID: `anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）获取简洁选择器；使用 `/model status` 获取完整视图（候选 + 下一个认证配置文件，以及配置时的提供商端点详细信息）。

### 每代理（CLI 覆盖）

为代理设置显式认证配置文件顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 以指定代理；不使用则默认当前代理。

## 故障排除

### "No credentials found"

如果 Anthropic 令牌配置缺失，请在 **网关主机** 上运行 `claude setup-token`，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 确认哪个配置文件即将过期。如果配置文件缺失，请重新运行 `claude setup-token` 并粘贴令牌。

## 需求

- Anthropic 订阅账户（用于 `claude setup-token`）
- 已安装 Claude Code CLI（可使用 `claude` 命令）
