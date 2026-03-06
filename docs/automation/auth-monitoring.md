---
summary: "监控模型提供商的 OAuth 过期情况"
read_when:
  - 设置身份验证过期监控或警报时
  - 自动检查 Claude Code / Codex 的 OAuth 刷新情况
title: "身份验证监控"
---

# 身份验证监控

OpenClaw 通过 `openclaw models status` 暴露 OAuth 过期状态。可将其用于自动化和警报；脚本是手机工作流的可选补充。

## 推荐方式：CLI 检查（可移植）

```bash
openclaw models status --check
```

退出码：

- `0`：正常
- `1`：凭证过期或缺失
- `2`：即将过期（24 小时内）

此命令可用于 cron/systemd，且无需额外脚本。

## 可选脚本（运维 / 手机工作流）

这些脚本位于 `scripts/` 目录下，**可选**。假设有对网关主机的 SSH 访问权限，并针对 systemd + Termux 进行了调整。

- `scripts/claude-auth-status.sh` 现使用 `openclaw models status --json` 作为真实数据源（若 CLI 不可用则回退到直接读取文件），请确保定时器中 `openclaw` 在 `PATH` 中。
- `scripts/auth-monitor.sh`：cron/systemd 定时器目标；发送警报（ntfy 或手机）。
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`：systemd 用户定时器。
- `scripts/claude-auth-status.sh`：Claude Code + OpenClaw 身份验证检查器（完整/JSON/简易）。
- `scripts/mobile-reauth.sh`：通过 SSH 进行引导式重新认证流程。
- `scripts/termux-quick-auth.sh`：一键小部件状态 + 打开身份验证 URL。
- `scripts/termux-auth-widget.sh`：完整引导小部件流程。
- `scripts/termux-sync-widget.sh`：同步 Claude Code 凭证至 OpenClaw。

如果不需要手机自动化或 systemd 定时器，可跳过这些脚本。
