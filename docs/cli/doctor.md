---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 指导修复）"
read_when:
  - 当您遇到连接/认证问题并需要指导修复时
  - 您已更新并想做个完整检查时
title: "doctor"
---

# `openclaw doctor`

网关和通道的健康检查 + 快速修复。

相关内容：

- 故障排查：[Troubleshooting](/gateway/troubleshooting)
- 安全审计：[Security](/gateway/security)

## 示例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

注意事项：

- 交互式提示（如钥匙串/OAuth 修复）仅在 stdin 为 TTY 且**未**设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）将跳过提示。
- `--fix`（`--repair` 的别名）会写入备份到 `~/.openclaw/openclaw.json.bak` 并删除未知的配置键，同时列出每个删除项。
- 状态完整性检查现在可以检测会话目录中的孤立转录文件，并可将其归档为 `.deleted.<timestamp>` 以安全地回收空间。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业格式，并可以在调度器需要在运行时自动规范化之前就地重写它们。
- Doctor 包含内存搜索就绪性检查，并可在缺少嵌入凭证时推荐执行 `openclaw configure --section model`。
- 如果启用了沙盒模式但 Docker 不可用，doctor 会报告高信号警告并提供修复方案（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文回退凭证。
- 如果在修复路径中通道 SecretRef 检查失败，doctor 会继续运行并报告警告，而不是提前退出。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）需要在当前命令路径中存在可解析的 Telegram 令牌。如果令牌检查不可用，doctor 会报告警告并跳过该次自动解析。

## macOS：`launchctl` 环境变量覆盖

如果您之前执行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖您的配置文件，可能导致持续的“未授权”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```
