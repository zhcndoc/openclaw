---
summary: "仓库脚本：用途、范围和安全说明"
read_when:
  - 从仓库中运行脚本时
  - 在 ./scripts 下添加或修改脚本时
title: "脚本"
---

`scripts/` 包含用于本地工作流程和运维任务的辅助脚本。当任务明确与某个脚本相关时使用这些脚本；否则优先使用 CLI。

## 约定

- 脚本是**可选的**，除非在文档或发布检查清单中被引用。
- 如果存在 CLI 接口，优先使用它们（例如：`openclaw models status --check`）。
- 假定脚本是主机特定的；在新机器上运行之前先阅读它们。

## 身份验证监控脚本

常规模型身份验证已在[身份验证](/gateway/authentication)中涵盖。下面的脚本是一个独立的可选系统，用于在远程/无头主机上监控 **Claude Code CLI 订阅令牌**，并可从手机重新进行身份验证：

- `scripts/setup-auth-system.sh` - 一次性设置：检查当前身份验证状态，帮助生成一个长期有效的 `claude setup-token`，并打印 systemd/Termux 安装步骤。
- `scripts/claude-auth-status.sh [full|json|simple]` - 检查 Claude Code + OpenClaw 身份验证状态。
- `scripts/auth-monitor.sh` - 轮询状态，并在令牌临近过期时发送通知（通过 OpenClaw send 和/或 ntfy.sh）。环境变量：`WARN_HOURS`（默认 `2`）、`NOTIFY_PHONE`、`NOTIFY_NTFY`。可通过捆绑的 `scripts/systemd/openclaw-auth-monitor.{service,timer}` 定时运行（每 30 分钟一次）。
- `scripts/mobile-reauth.sh` - 重新运行 `claude setup-token`，并打印可在手机上打开的 URL，适用于通过 Termux 的 SSH。
- `scripts/termux-quick-auth.sh`、`scripts/termux-auth-widget.sh`、`scripts/termux-sync-widget.sh` - Termux:Widget 脚本，通过 SSH 连接到主机，显示状态提示，并在身份验证过期时打开重新认证控制台/说明。

## GitHub 读取辅助脚本

当你希望 `gh` 使用 GitHub App 安装令牌执行仓库范围内的读取调用，同时让正常的 `gh` 保持使用你的个人登录进行写入操作时，请使用 `scripts/gh-read`。

必需的环境变量：

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

可选的环境变量：

- `OPENCLAW_GH_READ_INSTALLATION_ID`：当你想跳过基于仓库的安装查找时使用
- `OPENCLAW_GH_READ_PERMISSIONS`：以逗号分隔的方式覆盖要请求的读取权限子集

仓库解析顺序：

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

示例：

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## 添加脚本时

- 保持脚本聚焦且有文档说明。
- 在相关文档中添加一条简短条目（如果缺失则新建一份）。

## 相关内容

- [测试](/help/testing)
- [在线测试](/help/testing-live)
