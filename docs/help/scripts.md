---
summary: "仓库脚本：目的、范围及安全注意事项"
read_when:
  - 运行仓库中的脚本时
  - 在 ./scripts 目录下添加或更改脚本时
title: "脚本"
---

`scripts/` 目录包含用于本地工作流和运维任务的辅助脚本。
当任务明确与某个脚本相关时请使用这些脚本；否则优先使用 CLI。

## 规范

- 脚本是**可选的**，除非文档或发布检查清单中有提及。
- 优先使用已有的 CLI 界面（例如：认证监控使用 `openclaw models status --check`）。
- 脚本通常是主机特定的；在新机器上运行前请先阅读脚本内容。

## 认证监控脚本

认证监控在[认证](/gateway/authentication)中涵盖。`scripts/` 下的脚本是针对 systemd/Termux 手机工作流的可选附加组件。

## GitHub 读取助手

当你希望 `gh` 使用 GitHub App 安装令牌进行仓库范围的读取调用，同时将正常的 `gh` 保留在你的个人登录状态下用于写入操作时，请使用 `scripts/gh-read`。

所需环境变量：

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

可选环境变量：

- `OPENCLAW_GH_READ_INSTALLATION_ID`：当你希望跳过基于仓库的安装查找时
- `OPENCLAW_GH_READ_PERMISSIONS`：作为以逗号分隔的覆盖，用于请求读取权限子集

仓库解析顺序：

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

示例：

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## 添加脚本时

- Keep scripts focused and documented.
- 在相关文档中添加一条简短条目（如果缺少则创建一个）。

## 相关内容

- [Testing](/help/testing)
- [Testing live](/help/testing-live)
