---
summary: "仓库脚本：用途、范围和安全说明"
read_when:
  - 从仓库中运行脚本时
  - 在 ./scripts 下添加或修改脚本时
title: "脚本"
---

`scripts/` 目录包含用于本地工作流和运维任务的辅助脚本。
当某个任务明确与某个脚本相关时使用这些脚本；否则优先使用 CLI。

## 约定

- 脚本是**可选的**，除非在文档或发布检查清单中提及。
- 当存在 CLI 接口时优先使用它们（例如：auth 监控使用 `openclaw models status --check`）。
- 假定脚本依赖于主机；在新机器上运行前请先阅读它们。

## 身份验证监控脚本

身份验证监控在 [Authentication](/gateway/authentication) 中有说明。`scripts/` 下的脚本是用于 systemd/Termux 手机工作流的可选补充。

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
