---
summary: "模型认证：OAuth、API 密钥、Claude CLI 复用和 Anthropic setup-token"
read_when:
  - 调试模型认证或 OAuth 过期
  - 记录认证或凭证存储
title: "认证"
---

<Note>
本页涵盖**模型提供商**认证（API 密钥、OAuth、Claude CLI 复用和 Anthropic setup-token）。对于**网关连接**认证（token、密码、trusted-proxy），请参阅 [配置](/gateway/configuration) 和 [受信任代理认证](/gateway/trusted-proxy-auth)。
</Note>

OpenClaw 支持模型提供商的 OAuth 和 API 密钥。对于始终在线的网关主机，API 密钥通常是最可预测的选项。当订阅/OAuth 流程符合您的提供商账户模型时，也支持它们。

请参见 [/concepts/oauth](/concepts/oauth) 获取完整的 OAuth 流程和存储布局。
对于基于 SecretRef 的认证（`env`/`file`/`exec` 提供器），请参见 [密钥管理](/gateway/secrets)。
有关 `models status --probe` 使用的凭证资格/原因码规则，请参阅 [认证凭证语义](/auth-credential-semantics)。

## 推荐设置（API 密钥，任意提供商）

如果您运行的是长期存在的网关，请为您选择的提供商先从 API 密钥开始。
具体对于 Anthropic，API 密钥认证仍然是最可预测的服务器设置，但 OpenClaw 也支持复用本地的 Claude CLI 登录。

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

## Anthropic: Claude CLI 和 token 兼容性

Anthropic setup-token 认证在 OpenClaw 中仍然作为支持的 token 路径可用。Anthropic 工作人员此后告诉我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为此集成的许可行为。当主机上可用 Claude CLI 复用时，这现在是首选路径。

对于长期存在的网关主机，Anthropic API 密钥仍然是最可预测的设置。如果您想复用同一主机上的现有 Claude 登录，请在 onboarding/configure 中使用 Anthropic Claude CLI 路径。

推荐的 Claude CLI 复用主机设置：

```bash
# 在网关主机上运行
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

这是一个两步设置：

1. 在网关主机上将 Claude Code 本身登录到 Anthropic。
2. 告诉 OpenClaw 将 Anthropic 模型选择切换到本地 `claude-cli`
   后端，并存储匹配的 OpenClaw 认证配置文件。

如果 `claude` 不在 `PATH` 中，请先安装 Claude Code，或将
`agents.defaults.cliBackends.claude-cli.command` 设置为真实的二进制路径。

手动输入令牌（任意提供商；会写入 `auth-profiles.json` 并更新配置）：

```bash
openclaw models auth paste-token --provider openrouter
```

静态凭证也支持认证配置引用：

- `api_key` 凭证可以使用 `keyRef: { source, provider, id }`
- `token` 凭证可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式配置文件不支持 SecretRef 凭证；如果 `auth.profiles.<id>.mode` 设置为 `"oauth"`, 则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。

便捷的自动化检查（过期/缺失返回退出码 `1`，即将过期返回 `2`）：

```bash
openclaw models status --check
```

实时认证探测：

```bash
openclaw models status --probe
```

注意：

- 探测行可以来自认证配置文件、环境凭证或 `models.json`。
- 如果显式的 `auth.order.<provider>` 省略了存储的配置文件，探测会将该配置文件报告为 `excluded_by_auth_order`，而不是尝试它。
- 如果认证存在但 OpenClaw 无法为该提供商解析可探测的模型候选，探测报告 `status: no_model`。
- 速率限制冷却可以是模型范围的。一个配置文件针对一个模型冷却时，仍可用于同一提供商上的兄弟模型。

可选的操作脚本（systemd/Termux）记录在此处：
[认证监控脚本](/help/scripts#auth-monitoring-scripts)

## Anthropic 说明

Anthropic `claude-cli` 后端再次得到支持。

- Anthropic 工作人员告诉我们，此 OpenClaw 集成路径再次被允许。
- 因此，除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为 Anthropic 后端运行的许可行为。
- 对于长期存在的网关主机和明确的服务器端计费控制，Anthropic API 密钥仍然是最可预测的选择。

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
- Google 提供商还包括 `GOOGLE_API_KEY` 作为额外的回退。
- 相同的密钥列表在使用前会去重。
- OpenClaw 仅针对速率限制错误使用下一个密钥重试（例如 `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, 或 `workers_ai ... quota limit exceeded`）。
- 非速率限制错误不会使用备用密钥重试。
- 如果所有密钥都失败，则返回最后一次尝试的最终错误。

## 控制使用哪个凭证

### 每会话（聊天命令）

使用 `/model <别名或 ID>@<profileId>` 为当前会话固定指定的提供商凭证（示例配置文件 ID: `anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）获取简洁选择器；使用 `/model status` 获取完整视图（候选 + 下一个认证配置文件，以及配置时的提供商端点详细信息）。

### 每代理（CLI 覆盖）

为代理设置明确的认证配置文件顺序覆盖（存储在该代理的 `auth-state.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 定位特定代理；省略它以使用配置的默认代理。
当您调试顺序问题时，`openclaw models status --probe` 将省略的存储配置文件显示为 `excluded_by_auth_order`，而不是静默跳过它们。
当您调试冷却问题时，请记住速率限制冷却可以绑定到一个模型 ID，而不是整个提供商配置文件。

## 故障排除

### "未找到凭证"

如果 Anthropic 配置文件缺失，请在**网关主机**上配置 Anthropic API 密钥或设置 Anthropic setup-token 路径，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认哪个配置文件即将过期。如果一个
Anthropic 令牌配置文件缺失或已过期，请通过
setup-token 刷新该设置，或迁移到 Anthropic API 密钥。

## 相关

- [密钥管理](/gateway/secrets)
- [远程访问](/gateway/remote)
- [认证存储](/concepts/oauth)
