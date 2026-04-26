---
summary: "将 OpenClaw 安装从一台机器移动（迁移）到另一台机器"
read_when:
  - 您正在将 OpenClaw 迁移到新的笔记本电脑/服务器
  - 您希望保留会话、认证和频道登录（WhatsApp 等）
title: "迁移指南"
---

# 将 OpenClaw 迁移到新机器

本指南将 OpenClaw 网关移动到新机器，无需重新进行初始化设置。

## 迁移内容

当您复制 **状态目录**（默认为 `~/.openclaw/`）和 **工作区** 时，您将保留：

- **配置** -- `openclaw.json` 和所有网关设置
- **认证** -- 每个 agent 的 `auth-profiles.json`（API 密钥 + OAuth），以及 `credentials/` 下的任何频道/提供方状态
- **会话** -- 对话历史和 agent 状态
- **频道状态** -- WhatsApp 登录、Telegram 会话等
- **工作区文件** -- `MEMORY.md`、`USER.md`、skills 和 prompts

<Tip>
在旧机器上运行 `openclaw status` 以确认您的状态目录路径。
自定义配置文件使用 `~/.openclaw-<profile>/` 或通过 `OPENCLAW_STATE_DIR` 设置的路径。
</Tip>

## 迁移步骤

<Steps>
  <Step title="停止网关并备份">
    在 **旧** 机器上，停止网关以便文件在复制过程中不会发生变化，然后归档：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果您使用多个配置文件（例如 `~/.openclaw-work`），请分别归档每一个。

  </Step>

  <Step title="在新机器上安装 OpenClaw">
    在新机器上 [安装](/install) CLI（如果需要还包括 Node）。
    如果初始化设置创建了一个全新的 `~/.openclaw/` 也没关系 -- 您下一步将覆盖它。
  </Step>

  <Step title="复制状态目录和工作区">
    通过 `scp`、`rsync -a` 或外部驱动器传输归档文件，然后解压：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    确保包含了隐藏目录，且文件所有权与运行网关的用户匹配。

  </Step>

  <Step title="运行 doctor 并验证">
    在新机器上，运行 [诊断](/gateway/doctor) 以应用配置迁移并修复服务：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

## 常见陷阱

<AccordionGroup>
  <Accordion title="配置文件或 state-dir 不匹配">
    如果旧网关使用了 `--profile` 或 `OPENCLAW_STATE_DIR` 而新网关没有，
    频道将显示为已注销，会话将为空。
    使用您迁移的 **相同** 配置文件或 state-dir 启动网关，然后重新运行 `openclaw doctor`。
  </Accordion>

  <Accordion title="仅复制 openclaw.json">
    单独的配置文件是不够的。模型认证配置文件位于
    `agents/<agentId>/agent/auth-profiles.json`，频道/提供方状态仍然
    位于 `credentials/` 下。始终迁移 **整个** 状态目录。
  </Accordion>

  <Accordion title="权限和所有权">
    如果您以 root 身份复制或切换了用户，网关可能无法读取凭证。
    确保状态目录和工作区由运行网关的用户拥有。
  </Accordion>

  <Accordion title="远程模式">
    如果您的 UI 指向 **远程** 网关，远程主机拥有会话和工作区。
    迁移网关主机本身，而不是您的本地笔记本电脑。请参阅 [FAQ](/help/faq#where-things-live-on-disk)。
  </Accordion>

  <Accordion title="备份中的密钥">
    状态目录包含认证配置文件、频道凭证和其他
    提供方状态。
    请对备份进行加密存储，避免不安全的传输通道，如果怀疑泄露请轮换密钥。
  </Accordion>
</AccordionGroup>

## 验证清单

在新机器上确认：

- [ ] `openclaw status` 显示网关正在运行
- [ ] 频道仍然已连接（无需重新配对）
- [ ] 仪表板可以打开并显示现有会话
- [ ] 工作区文件（memory、configs）存在

## 相关内容

- [安装概览](/install)
- [Matrix 迁移](/install/migrating-matrix)
- [卸载](/install/uninstall)
