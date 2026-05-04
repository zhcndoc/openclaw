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

## 选项

- `--no-workspace-suggestions`: 禁用工作区记忆/搜索建议
- `--yes`: 接受默认值而不提示
- `--repair`: 在不提示的情况下应用推荐的非服务修复；网关服务的安装和重写仍需要交互式确认或显式的 gateway 命令
- `--fix`: `--repair` 的别名
- `--force`: 应用激进修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`: 无提示运行；仅进行安全迁移和非服务修复
- `--generate-gateway-token`: 生成并配置网关令牌
- `--deep`: 扫描系统服务以查找额外的网关安装

说明：

- 只有当 stdin 是 TTY 且未设置 `--non-interactive` 时，才会运行交互式提示（例如密钥串/OAuth 修复）。无头运行（cron、Telegram、无终端）将跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切的插件加载，因此无头健康检查保持快速。交互式会话在检查需要插件参与时仍会完整加载插件。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak`，并删除未知的配置键，同时列出每一项删除。
- `doctor --fix --non-interactive` 会报告缺失或过期的网关服务定义，但不会在更新修复模式之外安装或重写它们。若缺少服务，请运行 `openclaw gateway install`；如果你有意替换启动器，请运行 `openclaw gateway install --force`。
- 状态完整性检查现在会检测会话目录中的孤立转录文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会保留它们。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业结构，并可在调度器运行时需要自动标准化之前直接原地重写它们。
- 在 Linux 上，当用户的 crontab 仍在运行旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会发出警告；该脚本已不再维护，并且当 cron 缺少 systemd 用户总线环境时，可能会记录虚假的 WhatsApp 网关中断。
- Doctor 会清理旧版 OpenClaw 版本创建的遗留插件依赖暂存状态。它还会在注册表能够解析时修复缺失的已配置可下载插件，并且 2026.5.2 版本的 doctor 运行会在将该版本的配置标记为已触及时，自动安装旧配置已经在使用的可下载插件。如果下载失败，doctor 会报告安装错误，并保留已配置的插件条目以供下一次修复尝试。
- 当插件发现正常时，Doctor 会通过从 `plugins.allow`/`plugins.entries` 中移除缺失的插件 id 来修复过期的插件配置，同时移除匹配的悬空通道配置、心跳目标和通道模型覆盖。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并移除其无效的 `config` 载荷来隔离无效的插件配置。网关启动本来就只会跳过那个坏插件，因此其他插件和通道可以继续运行。
- 当其他管理器负责网关生命周期时，请设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告网关/服务健康状况并应用非服务修复，但会跳过服务安装/启动/重启/引导以及旧版服务清理。
- 在 Linux 上，doctor 会忽略非活动的额外类网关 systemd 单元，并且在修复期间不会重写正在运行的 systemd 网关服务的命令/入口点元数据。如果你有意替换当前启动器，请先停止该服务，或使用 `openclaw gateway install --force`。
- Doctor 会自动迁移旧版扁平化 Talk 配置（`talk.voiceId`、`talk.modelId` 等）到 `talk.provider` + `talk.providers.<provider>`。
- 重复运行 `doctor --fix` 时，如果唯一差异只是对象键顺序，则不再报告/应用 Talk 规范化。
- Doctor 包含内存搜索就绪性检查，并且在嵌入凭据缺失时可建议运行 `openclaw configure --section model`。
- 当未配置命令所有者时，Doctor 会发出警告。命令所有者是被允许运行仅限所有者命令并批准危险操作的人类操作员账户。DM 配对只允许有人与机器人对话；如果你在首次引导所有者之前已批准过某个发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex 模式代理且操作员的 Codex 主目录中存在个人 Codex CLI 资产时，Doctor 会发出警告。本地 Codex app-server 启动会使用按代理隔离的主目录，因此请使用 `openclaw migrate codex --dry-run` 来盘点应被有意提升的资产。
- 当默认代理允许使用的技能在当前运行环境中不可用时，Doctor 会发出警告，因为缺少二进制文件、环境变量、配置或操作系统要求。`doctor --fix` 可以通过 `skills.entries.<skill>.enabled=false` 禁用这些不可用技能；如果你想保留该技能为启用状态，则应安装/配置缺失的要求。
- 如果已启用沙箱模式但 Docker 不可用，doctor 会报告一条高信号警告，并给出修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在旧版沙箱注册表文件（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 会报告它们；`openclaw doctor --fix` 会将有效条目迁移到分片注册表目录，并隔离无效的旧版文件。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文的备用凭据。
- 如果在修复路径中通道 SecretRef 检查失败，doctor 会继续执行并报告警告，而不是提前退出。
- 在状态目录迁移之后，当已启用的默认 Telegram 或 Discord 账户依赖环境变量回退，且 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 对 doctor 进程不可用时，doctor 会发出警告。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）要求当前命令路径中存在可解析的 Telegram token。如果 token 检查不可用，doctor 会报告警告并在该次运行中跳过自动解析。

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
