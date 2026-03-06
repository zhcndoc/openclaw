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

- 交互式提示（如钥匙串/OAuth 修复）仅在标准输入为 TTY 且未设置 `--non-interactive` 时运行。无头运行（如定时任务、Telegram、无终端）将跳过提示。
- `--fix`（`--repair` 的别名）会备份配置至 `~/.openclaw/openclaw.json.bak`，并删除未知配置键，且会列出每个被移除项。
- 状态完整性检查现已检测会话目录中的孤立转录文件，并可将其归档为 `.deleted.<timestamp>`，以安全回收空间。
- doctor 包含内存搜索准备状态检测，缺少嵌入凭据时会建议运行 `openclaw configure --section model`。
- 如果启用了沙箱模式但 Docker 不可用，doctor 会报告高威胁警告并给出修复建议（安装 Docker 或执行 `openclaw config set agents.defaults.sandbox.mode off`）。

## macOS：`launchctl` 环境变量覆盖

如果您之前执行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖您的配置文件，可能导致持续的“未授权”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```
