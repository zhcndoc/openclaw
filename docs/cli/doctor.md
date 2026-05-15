---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导式修复）"
read_when:
  - 当你遇到连接/认证问题并希望获得引导式修复时
  - 当你已更新并希望进行一次完整性检查时
title: "Doctor"
---

# `openclaw doctor`

网关和通道的健康检查 + 快速修复。

相关：

- 故障排查: [Troubleshooting](/gateway/troubleshooting)
- 安全审计: [Security](/gateway/security)

## 示例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
openclaw doctor --repair --non-interactive
openclaw doctor --generate-gateway-token
```

针对通道的权限，请改用通道探测而不是 `doctor`：

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

面向目标的 Discord 能力探测会报告机器人在该通道中的有效权限；状态探测会审计已配置的 Discord 通道和语音自动加入目标。

## 选项

- `--no-workspace-suggestions`: 禁用工作区内存/搜索建议
- `--yes`: 接受默认值，不再提示
- `--repair`: 在不提示的情况下应用建议的非服务修复；网关服务安装和重写仍然需要交互式确认或显式的网关命令
- `--fix`: `--repair` 的别名
- `--force`: 应用激进修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`: 无提示运行；仅执行安全迁移和非服务修复
- `--generate-gateway-token`: 生成并配置网关令牌
- `--deep`: 扫描系统服务中额外的网关安装，并报告最近的 Gateway supervisor 重启交接

说明：

- 在 Nix 模式下（`OPENCLAW_NIX_MODE=1`），只读的 doctor 检查仍然可用，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 会被禁用，因为 `openclaw.json` 是不可变的。请改为编辑此次安装对应的 Nix 源；对于 nix-openclaw，请使用 agent-first 的 [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。
- 交互式提示（如 keychain/OAuth 修复）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切的插件加载，因此无头健康检查保持快速。当某项检查需要插件贡献时，交互式会话仍会完整加载插件。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak`，并删除未知配置键，同时列出每一项移除内容。
- `doctor --fix --non-interactive` 会报告缺失或过期的网关服务定义，但不会在更新修复模式之外安装或重写它们。对于缺失的服务，请运行 `openclaw gateway install`；如果你有意要替换启动器，则运行 `openclaw gateway install --force`。
- 状态完整性检查现在会检测会话目录中的孤儿转录文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会将它们保留在原地。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中旧版 cron 作业格式，并且可以在调度器运行时需要自动规范化之前就原地重写它们。
- 在 Linux 上，当用户的 crontab 仍在运行旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会发出警告；该脚本已不再维护，并且在 cron 缺少 systemd user-bus 环境时会记录错误的 WhatsApp 网关宕机信息。
- 当启用 WhatsApp 时，doctor 会检查本地 `openclaw-tui` 客户端仍在运行的降级 Gateway 事件循环。`doctor --fix` 只会停止已验证的本地 TUI 客户端，以免 WhatsApp 回复排队在过时的 TUI 刷新循环之后。
- Doctor 会将旧版 `openai-codex/*` 模型引用重写为规范的 `openai/*` 引用，覆盖主模型、fallback、heartbeat/subagent/compaction 覆盖、hooks、通道模型覆盖以及过期会话路由固定。`--fix` 会把 Codex 意图迁移到按 provider/model 作用域的 `agentRuntime.id: "codex"` 条目上，保留诸如 `openai-codex:...` 之类的会话 auth-profile 固定，移除过期的整 agent/会话 runtime 固定，并确保已修复的 OpenAI agent 引用在 Codex auth 路由上而不是直接使用 OpenAI API-key 认证。
- Doctor 会清理旧版 OpenClaw 版本创建的遗留插件依赖暂存状态，并为声明其为 peer dependency 的受管 npm 插件重新链接宿主 `openclaw` 包。它还会修复配置中引用的缺失可下载插件，例如 `plugins.entries`、已配置通道、已配置 provider/search 设置或已配置 agent runtimes 中引用的插件。在包更新期间，doctor 会在包替换完成前跳过包管理器插件修复；如果某个已配置插件仍需要恢复，请在之后重新运行 `openclaw doctor --fix`。如果下载失败，doctor 会报告安装错误，并保留已配置的插件条目以便下次修复尝试。
- Doctor 通过从 `plugins.allow`/`plugins.deny`/`plugins.entries` 中移除缺失的插件 id 来修复过时的插件配置，并在插件发现正常时移除匹配的悬空通道配置、heartbeat 目标和通道模型覆盖。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并移除其无效的 `config` 负载来隔离无效的插件配置。Gateway 启动本来就只会跳过那个有问题的插件，因此其他插件和通道可以继续运行。
- 当另一个 supervisor 负责网关生命周期时，请设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告网关/服务健康并应用非服务修复，但会跳过服务安装/启动/重启/bootstrap 以及旧版服务清理。
- 在 Linux 上，doctor 会忽略不活动的额外 gateway-like systemd 单元，并且在修复期间不会为正在运行的 systemd 网关服务重写命令/入口点元数据。请先停止服务，或者在你有意替换当前启动器时使用 `openclaw gateway install --force`。
- Doctor 会自动将旧版扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。
- 重复运行 `doctor --fix` 时，如果唯一差异只是对象键顺序，则不再报告/应用 Talk 规范化。
- Doctor 包含 memory-search 就绪性检查，并且在缺少 embedding 凭据时可以建议运行 `openclaw configure --section model`。
- 当未配置命令所有者时，doctor 会发出警告。命令所有者是被允许运行仅所有者命令并批准危险操作的人类操作员账户。DM 配对只会让某人能与机器人对话；如果你在首次所有者引导前已批准过发送者，请显式设置 `commands.ownerAllowFrom`。
- 当已配置 Codex 模式 agent 且操作员的 Codex home 中存在个人 Codex CLI 资产时，doctor 会发出警告。本地 Codex app-server 启动会使用按 agent 隔离的 home，因此请使用 `openclaw migrate codex --dry-run` 来清点应当有意提升的资产。
- Doctor 会移除已退役的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 会始终保持 Codex 原生的 workspace tools 为原生形态。
- 当默认 agent 允许的 skills 在当前运行时环境中不可用，因为缺少 bin、env vars、config 或 OS 要求时，doctor 会发出警告。`doctor --fix` 可以通过 `skills.entries.<skill>.enabled=false` 禁用这些不可用的 skills；如果你想保持 skill  सक्रिय，请改为安装/配置缺失的要求。
- 如果已启用 sandbox 模式但 Docker 不可用，doctor 会报告高信号警告并给出修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在旧版 sandbox registry 文件（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 会报告它们；`openclaw doctor --fix` 会将有效条目迁移到分片 registry 目录，并隔离无效的旧文件。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文回退凭据。
- 如果在修复路径中 channel SecretRef 检查失败，doctor 会继续执行并报告警告，而不是过早退出。
- 在状态目录迁移之后，当已启用的默认 Telegram 或 Discord 账户依赖 env fallback，而 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 对 doctor 进程不可用时，doctor 会发出警告。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）要求当前命令路径中存在可解析的 Telegram token。如果无法进行 token 检查，doctor 会报告警告并在该轮跳过自动解析。

## macOS: `launchctl` 环境变量覆盖

如果你之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖你的配置文件，并可能导致持续的“unauthorized”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相关

- [CLI reference](/cli)
- [Gateway doctor](/gateway/doctor)
