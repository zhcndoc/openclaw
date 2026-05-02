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

- 交互式提示（如密钥链/OAuth 修复）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）将跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切的插件加载，因此无头健康检查保持快速。当检查需要插件参与时，交互式会话仍会完整加载插件。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak`，并删除未知的配置键，同时列出每一项删除。
- `doctor --fix --non-interactive` 会报告缺失或过时的网关服务定义，但不会在更新修复模式之外安装或重写它们。对于缺失的服务，请运行 `openclaw gateway install`；如果你有意替换启动器，请运行 `openclaw gateway install --force`。
- 状态完整性检查现在会检测 sessions 目录中的孤立转录文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会保留它们。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 任务结构，并且可以在调度器需要在运行时自动规范化之前就原地重写它们。
- 在 Linux 上，当用户的 crontab 仍在运行旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会发出警告；该脚本已不再维护，并且当 cron 缺少 systemd 用户总线环境时，可能会错误地记录 WhatsApp 网关故障。
- Doctor 会清理旧版 OpenClaw 版本创建的遗留插件依赖暂存状态。它还会在注册表能够解析它们时，修复缺失的已配置可下载插件。
- Doctor 会通过从 `plugins.allow`/`plugins.entries` 中移除缺失的插件 ID 来修复过时的插件配置，并在插件发现正常时，同时移除匹配的悬空通道配置、心跳目标和通道模型覆盖。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并移除其无效的 `config` 负载来隔离无效的插件配置。网关启动本就只会跳过那个有问题的插件，因此其他插件和通道可以继续运行。
- 当其他监督器负责网关生命周期时，设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告网关/服务健康状况并应用非服务修复，但会跳过服务安装/启动/重启/引导以及旧版服务清理。
- 在 Linux 上，doctor 会忽略处于非活动状态的额外 gateway 类 systemd 单元，并且在修复期间不会重写正在运行的 systemd 网关服务的命令/入口点元数据。若你有意替换活动启动器，请先停止服务，或使用 `openclaw gateway install --force`。
- Doctor 会自动将旧版平铺式 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。
- 重复运行 `doctor --fix` 时，如果唯一差异只是对象键顺序，则不再报告/应用 Talk 规范化。
- Doctor 包含记忆搜索就绪性检查，并且在嵌入凭据缺失时可以推荐 `openclaw configure --section model`。
- 当未配置命令 owner 时，Doctor 会发出警告。命令 owner 是允许运行仅 owner 命令并批准危险操作的人工操作员账号。DM 配对只会让某人可以和机器人对话；如果你在首次 owner 启动之前就已批准了某个发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex 模式代理且操作员的 Codex 主目录中存在个人 Codex CLI 资产时，Doctor 会发出警告。本地 Codex app-server 启动会为每个代理使用隔离的独立主目录，因此请使用 `openclaw migrate codex --dry-run` 来清点应被有意提升的资产。
- 如果已启用沙箱模式但 Docker 不可用，doctor 会报告一个高信号警告并给出修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文回退凭据。
- 如果在修复路径中通道 SecretRef 检查失败，doctor 会继续执行并报告警告，而不是过早退出。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）要求当前命令路径中存在可解析的 Telegram token。如果无法检查 token，doctor 会报告警告并跳过该轮自动解析。

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
