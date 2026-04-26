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

- 交互式提示（例如密钥链/OAuth 修复）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切的插件加载，因此无头健康检查仍能保持快速。当检查需要插件贡献时，交互式会话仍会完整加载插件。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak`，并删除未知配置键，同时列出每一项移除内容。
- 状态完整性检查现在会检测会话目录中孤立的转录文件，并可将其归档为 `.deleted.<timestamp>`，以安全地回收空间。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 任务结构，并可在调度器需要在运行时自动规范化之前就原地重写它们。
- Doctor 会修复缺失的捆绑插件运行时依赖，而不会写入已打包的全局安装。对于 root 拥有的 npm 安装或加固的 systemd 单元，请将 `OPENCLAW_PLUGIN_STAGE_DIR` 设置为可写目录，例如 `/var/lib/openclaw/plugin-runtime-deps`。
- Doctor 会自动将旧版扁平的 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。
- 反复运行 `doctor --fix` 时，如果唯一差异只是对象键顺序，则不再报告/应用 Talk 规范化。
- Doctor 包含记忆搜索就绪检查，并且在缺少嵌入凭据时可建议运行 `openclaw configure --section model`。
- 如果已启用沙盒模式但 Docker 不可用，doctor 会报告一个高信号警告并给出修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文回退凭据。
- 如果在修复路径中通道 SecretRef 检查失败，doctor 会继续执行并报告警告，而不是过早退出。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）需要在当前命令路径中有可解析的 Telegram token。如果无法检查 token，doctor 会报告警告并在该轮跳过自动解析。

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
