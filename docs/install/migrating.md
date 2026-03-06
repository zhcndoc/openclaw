---
summary: "将 OpenClaw 安装从一台机器迁移到另一台机器"
read_when:
  - 你正在将 OpenClaw 迁移到新的笔记本电脑/服务器
  - 你想保留会话、认证和频道登录（WhatsApp 等）
title: "迁移指南"
---

# 将 OpenClaw 迁移到新机器

本指南介绍如何将 OpenClaw Gateway 从一台机器迁移到另一台机器，**无需重新完成入门流程**。

迁移从概念上很简单：

- 复制 **状态目录**（`$OPENCLAW_STATE_DIR`，默认：`~/.openclaw/`）——包含配置、认证、会话和频道状态。
- 复制你的 **工作区**（默认 `~/.openclaw/workspace/`）——包含你的代理文件（记忆、提示等）。

但在 **配置文件（profiles）**、**权限** 和 **部分复制** 上存在常见陷阱。

## 开始之前（你要迁移的内容）

### 1) 确认你的状态目录

大多数安装使用默认路径：

- **状态目录:** `~/.openclaw/`

但如果你使用了以下情况，可能不同：

- `--profile <name>`（通常变成 `~/.openclaw-<profile>/`）
- `OPENCLAW_STATE_DIR=/some/path`

如果不确定，请在**旧机**上运行：

```bash
openclaw status
```

查看输出中关于 `OPENCLAW_STATE_DIR` / 配置文件的提示。如果你运行多个网关，对每个配置文件重复此操作。

### 2) 确认你的工作区

常见默认路径：

- `~/.openclaw/workspace/`（推荐的工作区）
- 你自定义创建的文件夹

你的工作区包含类似 `MEMORY.md`、`USER.md` 和 `memory/*.md` 的文件。

### 3) 理解将要保留的内容

如果同时复制了状态目录和工作区，你将保留：

- 网关配置（`openclaw.json`）
- 认证配置文件 / API 密钥 / OAuth 令牌
- 会话历史和代理状态
- 频道状态（例如 WhatsApp 登录/会话）
- 你的工作区文件（记忆、技能笔记等）

如果只复制工作区（例如通过 Git），则不会保留：

- 会话
- 凭证
- 频道登录

这些都存放在 `$OPENCLAW_STATE_DIR` 下。

## 迁移步骤（推荐）

### 步骤 0 — 备份（旧机器）

在**旧机器**上，先停止网关以保证文件在复制时不被更改：

```bash
openclaw gateway stop
```

（可选但推荐）归档状态目录和工作区：

```bash
# 如果你使用配置文件或自定义目录，请调整路径
cd ~
tar -czf openclaw-state.tgz .openclaw

tar -czf openclaw-workspace.tgz .openclaw/workspace
```

如果你有多个配置文件 / 状态目录（例如 `~/.openclaw-main`, `~/.openclaw-work`），请分别归档。

### 步骤 1 — 在新机器上安装 OpenClaw

在**新机器**上安装 CLI（及 Node，若需要）：

- 参见：[安装](/install)

此时，入门流程如果创建了新的 `~/.openclaw/` 也没关系——下一步你会覆盖它。

### 步骤 2 — 将状态目录和工作区复制到新机器

复制**两个**文件夹：

- `$OPENCLAW_STATE_DIR`（默认 `~/.openclaw/`）
- 你的工作区（默认 `~/.openclaw/workspace/`）

常用方法：

- `scp` 传输归档包后解压
- 通过 SSH 使用 `rsync -a`
- 外接硬盘复制

复制后，确认：

- 隐藏目录（例如 `.openclaw/`）被包含
- 文件所有权归运行网关的用户所有

### 步骤 3 — 运行 Doctor（迁移和服务修复）

在**新机器**上：

```bash
openclaw doctor
```

Doctor 是“安全无忧”的命令。它会修复服务，应用配置迁移，并提示不匹配问题。

然后执行：

```bash
openclaw gateway restart
openclaw status
```

## 常见陷阱（及避免方法）

### 陷阱：配置文件（profile）/状态目录不匹配

如果旧网关使用了某个配置文件（或 `OPENCLAW_STATE_DIR`），而新网关使用了不同的，可能出现：

- 配置更改无效
- 频道缺失或登出
- 会话历史为空

解决方法：使用**相同的配置文件/状态目录**启动网关/服务，然后重新运行：

```bash
openclaw doctor
```

### 陷阱：只复制了 `openclaw.json`

`openclaw.json` 并不足够。许多提供者的状态存放在：

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

务必迁移整个 `$OPENCLAW_STATE_DIR` 文件夹。

### 陷阱：权限 / 所有权问题

如果你用 root 复制或者更换了用户，网关可能无法读取凭证或会话。

解决方法：确保状态目录和工作区归运行网关的用户所有。

### 陷阱：远程/本地模式迁移问题

- 如果你的 UI（WebUI/TUI）指向**远程**网关，远程主机拥有会话存储和工作区数据。
- 迁移本地笔记本电脑不会移动远程网关的状态。

如果处于远程模式，请迁移**网关所在主机**。

### 陷阱：备份中包含秘密信息

`$OPENCLAW_STATE_DIR` 包含敏感信息（API 密钥、OAuth 令牌、WhatsApp 凭证）。备份时请像对待生产环境秘密一样处理：

- 加密存储
- 避免通过不安全渠道共享
- 如果怀疑泄露，尽快更新密钥

## 验证清单

在新机器上确认：

- `openclaw status` 显示网关正在运行
- 频道仍然连接（例如 WhatsApp 无需重新配对）
- 控制面板打开并显示已有会话
- 你的工作区文件（记忆、配置）完整存在

## 相关链接

- [Doctor](/gateway/doctor)
- [网关故障排除](/gateway/troubleshooting)
- [OpenClaw 数据存储位置是什么？](/help/faq#where-does-openclaw-store-its-data)
