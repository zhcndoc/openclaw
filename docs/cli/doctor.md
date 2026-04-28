---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 指导修复）"
read_when:
  - 当你遇到连接/认证问题并希望获得引导式修复时
  - 当你更新后想做一次健全性检查时
title: "Doctor"
---

# `openclaw doctor`

网关和通道的健康检查 + 快速修复。

相关内容：

- 故障排查：[故障排查](/gateway/troubleshooting)
- 安全审计：[安全](/gateway/security)

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
- `--repair`: 应用推荐的修复而不提示
- `--fix`: `--repair` 的别名
- `--force`: 应用激进的修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`: 无提示运行；仅安全迁移
- `--generate-gateway-token`: 生成并配置网关令牌
- `--deep`: 扫描系统服务以查找额外的网关安装

注意：

- 交互式提示（如密钥链/OAuth 修复）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切的插件加载，因此无头健康检查保持快速。当检查需要插件贡献时，交互式会话仍会完全加载插件。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak`，并删除未知配置键，同时列出每一处移除。
- 状态完整性检查现在会检测 sessions 目录中的孤立转录文件，并可将其归档为 `.deleted.<timestamp>`，以安全回收空间。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业结构，并可在调度器需要在运行时自动规范化之前直接重写它们。
- Doctor 会在不写入已打包的全局安装的情况下修复缺失的捆绑插件运行时依赖。对于 root 拥有的 npm 安装或加固的 systemd 单元，请将 `OPENCLAW_PLUGIN_STAGE_DIR` 设置为可写目录，例如 `/var/lib/openclaw/plugin-runtime-deps`；它也可以是类似 `/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps` 的路径列表，其中前面的根目录是只读查找层，最后一个根目录是修复目标。
- Doctor 会通过从 `plugins.allow`/`plugins.entries` 中移除缺失的插件 id 来修复过期的插件配置，并在插件发现正常时移除匹配的悬空通道配置、心跳目标和通道模型覆盖。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并移除其无效的 `config` 载荷来隔离无效的插件配置。网关启动已会跳过那个有问题的插件，因此其他插件和通道可以继续运行。
- 当另一个监督器负责网关生命周期时，请设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告网关/服务健康状况并应用非服务类修复，但会跳过服务安装/启动/重启/引导以及旧版服务清理。
- 在 Linux 上，doctor 会忽略不活动的额外类网关 systemd 单元，并且在修复期间不会为正在运行的 systemd 网关服务重写命令/入口点元数据。若要停止服务，或在你有意替换活动启动器时使用 `openclaw gateway install --force`。
- Doctor 会自动将旧版扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。
- 重复运行 `doctor --fix` 时，如果唯一差异只是对象键顺序，则不再报告/应用 Talk 规范化。
- Doctor 包含内存搜索就绪检查，并且在缺少嵌入凭据时可建议使用 `openclaw configure --section model`。
- 如果启用了沙箱模式但 Docker 不可用，doctor 会报告一条高信噪比警告及修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文回退凭据。
- 如果在修复路径中通道 SecretRef 检查失败，doctor 会继续执行并报告警告，而不是提前退出。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）需要在当前命令路径中可解析的 Telegram token。如果无法进行 token 检查，doctor 会报告警告并在该轮跳过自动解析。

## macOS：`launchctl` 环境变量覆盖

如果您之前执行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖您的配置文件，可能导致持续的“未授权”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相关

- [CLI reference](/cli)
- [Gateway doctor](/gateway/doctor)
