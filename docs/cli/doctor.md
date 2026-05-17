---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导式修复）"
read_when:
  - 当你遇到连接/认证问题并希望获得引导式修复时
  - 当你已更新并希望进行一次完整性检查时
title: "医生"
---

# `openclaw doctor`

网关和通道的健康检查 + 快速修复。

相关：

- 故障排查: [疑难解答](/gateway/troubleshooting)
- 安全审计: [安全](/gateway/security)

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

- 在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，只读的 doctor 检查仍然可用，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 会被禁用，因为 `openclaw.json` 是不可变的。请改为编辑此安装对应的 Nix 源；对于 nix-openclaw，请使用以 agent 为先的[快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。
- 交互式提示（如钥匙串/OAuth 修复）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切插件加载，因此无头健康检查保持快速。当检查需要插件贡献时，交互式会话仍会完整加载插件。
- `--fix`（`--repair` 的别名）会写入备份到 `~/.openclaw/openclaw.json.bak`，并删除未知配置键，同时列出每一处删除。
- `doctor --fix --non-interactive` 会报告缺失或过时的网关服务定义，但不会在更新修复模式之外安装或重写它们。若服务缺失，请运行 `openclaw gateway install`；如果你有意要替换启动器，请运行 `openclaw gateway install --force`。
- 状态完整性检查现在会检测 sessions 目录中的孤立转录文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会让它们保持原位。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业结构，并可在调度器运行时自动规范化之前直接就地重写它们。
- Doctor 会报告带有显式 `payload.model` 覆盖的 cron 作业，包括提供者命名空间计数以及与 `agents.defaults.model` 的不匹配情况，因此在进行认证或计费调查时，无法继承默认模型的计划任务也能被看见。
- 在 Linux 上，当用户的 crontab 仍在运行旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会给出警告；该脚本已不再维护，并且在 cron 缺少 systemd user-bus 环境时可能记录错误的 WhatsApp 网关中断。
- 启用 WhatsApp 时，doctor 会检查在本地 `openclaw-tui` 客户端仍在运行的情况下是否存在降级的 Gateway 事件循环。`doctor --fix` 只会停止已验证的本地 TUI 客户端，因此 WhatsApp 回复不会排在过时的 TUI 刷新循环之后。
- Doctor 会将旧版 `openai-codex/*` 模型引用在主模型、回退、heartbeat/subagent/compaction 覆盖、hooks、通道模型覆盖以及过期会话路由固定项中重写为规范的 `openai/*` 引用。`--fix` 会将 Codex 意图迁移到提供者/模型范围的 `agentRuntime.id: "codex"` 条目上，保留诸如 `openai-codex:...` 之类的会话认证配置文件固定项，移除过时的整代理/会话运行时固定项，并让修复后的 OpenAI 代理引用继续走 Codex 认证路由，而不是直接使用 OpenAI API key 认证。
- Doctor 会清理旧版 OpenClaw 版本创建的陈旧插件依赖预备状态，并为声明它为 peer dependency 的受管 npm 插件重新链接宿主 `openclaw` 包。它还会修复配置引用的缺失可下载插件，例如 `plugins.entries`、已配置通道、已配置提供者/搜索设置或已配置的代理运行时。更新包期间，doctor 会跳过包管理器插件修复，直到包替换完成；如果某个已配置插件仍需要恢复，请随后重新运行 `openclaw doctor --fix`。如果下载失败，doctor 会报告安装错误并保留已配置的插件条目，以便下次重试修复。
- Doctor 会通过从 `plugins.allow`/`plugins.deny`/`plugins.entries` 中移除缺失的插件 id 来修复过时的插件配置，并在插件发现正常时移除匹配的悬空通道配置、heartbeat 目标和通道模型覆盖。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并移除其无效的 `config` 负载来隔离无效插件配置。Gateway 启动本来就只会跳过那个坏插件，因此其他插件和通道可以继续运行。
- 当另一个 supervisor 负责网关生命周期时，设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告网关/服务健康状况并应用非服务修复，但会跳过服务安装/启动/重启/bootstrap 以及旧版服务清理。
- 在 Linux 上，doctor 会忽略处于非活动状态的额外 gateway-like systemd 单元，并且在修复过程中不会重写正在运行的 systemd 网关服务的命令/入口点元数据。若你有意替换当前启动器，请先停止该服务，或使用 `openclaw gateway install --force`。
- Doctor 会自动将旧版扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。
- 重复运行 `doctor --fix` 时，如果唯一差异只是对象键顺序，则不再报告/应用 Talk 规范化。
- Doctor 包含内存搜索就绪性检查，并在缺少嵌入凭据时可建议运行 `openclaw configure --section model`。
- 当未配置命令所有者时，doctor 会发出警告。命令所有者是被允许运行仅所有者可用命令并批准危险操作的人类操作员账号。DM 配对只意味着某人可以与机器人对话；如果你在首次建立 owner bootstrap 之前已批准过某个发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex 模式代理且操作员的 Codex home 中存在个人 Codex CLI 资产时，doctor 会发出警告。本地 Codex app-server 启动使用按代理隔离的 home，因此请使用 `openclaw migrate codex --dry-run` 来盘点应被有意提升的资产。
- Doctor 会移除已退役的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始终保持 Codex 原生的工作区工具为原生状态。
- 当默认代理可用的技能在当前运行时环境中不可用时，doctor 会发出警告，因为缺少 bin、环境变量、配置或操作系统要求。`doctor --fix` 可以通过设置 `skills.entries.<skill>.enabled=false` 来禁用这些不可用技能；如果你希望保持该技能启用，则应安装/配置缺失的要求。
- 如果已启用沙箱模式但 Docker 不可用，doctor 会报告一条高信号警告，并给出修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在旧版沙箱注册文件（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 会报告它们；`openclaw doctor --fix` 会将有效条目迁移到分片注册目录，并隔离无效的旧文件。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文回退凭据。
- 如果在修复路径中通道 SecretRef 检查失败，doctor 会继续执行并报告警告，而不是提前退出。
- 在状态目录迁移之后，如果已启用的默认 Telegram 或 Discord 账号依赖环境回退，并且 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 对 doctor 进程不可用，doctor 会发出警告。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）需要在当前命令路径中有可解析的 Telegram token。如果令牌检查不可用，doctor 会报告警告并在该次执行中跳过自动解析。

## macOS: `launchctl` 环境变量覆盖

如果你之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖你的配置文件，并可能导致持续的“未经授权”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相关

- [CLI 参考](/cli)
- [Gateway doctor](/gateway/doctor)
