---
summary: "仓库脚本：用途、范围和安全说明"
read_when:
  - "从仓库中运行脚本时"
  - "在 ./scripts 下添加或修改脚本时"
title: "脚本"
---

`scripts/` 保存用于本地工作流程和操作任务的帮助程序脚本。当任务明显与脚本相关时使用它们。否则更喜欢 CLI。

## <a id="conventions"></a> 约定

- 脚本是**可选的**，除非在文档或发布检查清单中被引用。
- 如果存在 CLI 接口，优先使用它们（例如：`openclaw models status --check`）。
- 假设脚本是特定于主机的。在新机器上运行之前请阅读它们。

## <a id="auth-monitoring-scripts"></a> 身份验证监控脚本

一般模型身份验证包含在 [Authentication](/gateway/authentication) 中。下面的脚本是一个单独的可选系统。他们监视 remote/headless 主机上的 **Claude Code CLI 订阅令牌**。他们还允许您通过手机重新进行身份验证：

- `scripts/setup-auth-system.sh` - 一次性设置：检查当前身份验证状态，帮助生成一个长期有效的 `claude setup-token`，并打印 systemd/Termux 安装步骤。
- `scripts/claude-auth-status.sh [full|json|simple]` - 检查 Claude Code + OpenClaw 身份验证状态。
- `scripts/auth-monitor.sh` - 当令牌接近到期时（包括身份验证仍然可用时的最后一个小时），轮询状态并发送通知（通过 `openclaw message send`、and/or ntfy.sh）。环境：`WARN_HOURS`（默认`2`）、`NOTIFY_PHONE`、`NOTIFY_NTFY`。通过捆绑的 `scripts/systemd/openclaw-auth-monitor.{service,timer}` 按计划运行（每 30 分钟一次）。
- `scripts/mobile-reauth.sh` - 重新运行 `claude setup-token` 并打印 URL 以在手机上打开，以便通过 Termux 的 SSH 使用。
- `scripts/termux-quick-auth.sh`、`scripts/termux-auth-widget.sh` - Termux：小部件脚本。它们向主机发送 SSH 并显示状态祝酒词。当身份验证过期时，他们打开重新身份验证 console/instructions。

要使用 Claude CLI 登录 OpenClaw，请遵循 [Claude CLI reuse](/gateway/authentication#anthropic-claude-cli-reuse)。 Claude 进程拥有其登录凭据。

## <a id="github-read-helper"></a> GitHub 读取辅助脚本

当您希望 `gh` 使用 GitHub 应用程序安装令牌进行存储库范围的读取调用时，请使用 `scripts/gh-read`。这会在您的个人登录中留下正常的 `gh` 进行写入操作。

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

## <a id="when-adding-scripts"></a> 添加脚本时

- 保持脚本聚焦且有文档说明。
- 在相关文档中添加一条简短条目（如果缺失则新建一份）。

## <a id="related"></a> 相关内容

- [测试](/help/testing)
- [现场测试](/help/testing-live)
