---
summary: "迁移中心：跨系统导入、机器间迁移，以及插件升级"
read_when:
  - 你正在将 OpenClaw 迁移到一台新的笔记本电脑或服务器上
  - 你来自另一个代理系统，并希望保留状态
  - 你正在就地升级一个插件
title: "迁移指南"
---

OpenClaw 支持三种迁移路径：从另一个代理系统导入、将现有安装迁移到新机器，以及就地升级插件。

## 从另一个代理系统导入

捆绑的迁移提供器会将说明、MCP 服务器、技能、模型配置以及（可选）API 密钥导入到 OpenClaw 中。任何更改之前都会预览计划，报告中的机密信息会被隐藏，并且应用操作会由经过验证的备份提供支持。

<CardGroup cols={2}>
  <Card title="从 Claude 迁移" href="/install/migrating-claude" icon="brain">
    导入 Claude Code 和 Claude Desktop 的状态，包括 `CLAUDE.md`、MCP 服务器、技能和项目命令。
  </Card>
  <Card title="从 Hermes 迁移" href="/install/migrating-hermes" icon="feather">
    导入 Hermes 配置、提供方、MCP 服务器、内存、技能，以及受支持的 `.env` 键。
  </Card>
</CardGroup>

CLI 入口点是 [`openclaw migrate`](/cli/migrate)。当引导流程检测到已知来源时，也可以提供迁移选项（`openclaw onboard --flow import`）。

## 将 OpenClaw 迁移到新机器

复制 **状态目录**（默认是 `~/.openclaw/`）和你的 **工作区**，以保留：

- **配置** — `openclaw.json` 和所有网关设置。
- **认证** — 每个代理的 `auth-profiles.json`（API 密钥和 OAuth），以及 `credentials/` 下的任何通道或提供方状态。
- **会话** — 对话历史和代理状态。
- **通道状态** — WhatsApp 登录、Telegram 会话，以及类似内容。
- **工作区文件** — `MEMORY.md`、`USER.md`、技能和提示。

<Tip>
在旧机器上运行 `openclaw status` 以确认你的状态目录路径。自定义配置文件使用 `~/.openclaw-<profile>/` 或通过 `OPENCLAW_STATE_DIR` 设置的路径。
</Tip>

### 迁移步骤

<Steps>
  <Step title="停止网关并备份">
    在**旧**机器上，停止网关以确保文件不会在复制过程中发生变化，然后归档：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果你使用多个配置文件（例如 `~/.openclaw-work`），请分别归档每个配置文件。

  </Step>

  <Step title="在新机器上安装 OpenClaw">
    在新机器上[安装](/install) CLI（如有需要也安装 Node）。即使入门流程创建了一个新的 `~/.openclaw/` 也没关系——下一步会覆盖它。
  </Step>

  <Step title="复制状态目录和工作区">
    通过 `scp`、`rsync -a` 或外接驱动器传输归档，然后解压：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    确认隐藏目录已包含在内，并且文件所有者与将运行网关的用户一致。

  </Step>

  <Step title="运行 doctor 并验证">
    在新机器上，运行 [Doctor](/gateway/doctor) 以应用配置迁移并修复服务：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

如果 Telegram 或 Discord 使用默认的环境变量回退（`TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN`），请验证迁移后的状态目录 `.env` 包含这些键，而不要输出密钥值：

```bash
awk -F= '/^(TELEGRAM_BOT_TOKEN|DISCORD_BOT_TOKEN)=/ { print $1 "=present" }' ~/.openclaw/.env
```

当启用的默认 Telegram 或 Discord 账户没有已配置的令牌，且 doctor 进程也无法访问匹配的环境变量时，`openclaw doctor` 也会发出警告。

### 常见陷阱

<AccordionGroup>
  <Accordion title="配置文件或 state-dir 不匹配">
    如果旧网关使用了 `--profile` 或 `OPENCLAW_STATE_DIR`，而新网关没有使用，那么通道会显示为已登出，且会话将为空。请使用你迁移过来的**相同**配置文件或 state-dir 启动网关，然后重新运行 `openclaw doctor`。
  </Accordion>

  <Accordion title="只复制 openclaw.json">
    仅有配置文件是不够的。模型认证配置文件位于 `agents/<agentId>/agent/auth-profiles.json`，而通道和提供方状态位于 `credentials/` 下。务必迁移**整个**状态目录。
  </Accordion>

  <Accordion title="权限和所有权">
    如果你以 root 复制或切换了用户，网关可能无法读取凭据。请确保状态目录和工作区的所有者是运行网关的用户。
  </Accordion>

  <Accordion title="远程模式">
    如果你的 UI 指向的是一个**远程**网关，那么远程主机拥有会话和工作区。应迁移网关主机本身，而不是你的本地笔记本电脑。参见 [FAQ](/help/faq#where-things-live-on-disk)。
  </Accordion>

  <Accordion title="备份中的密钥">
    状态目录包含认证配置文件、通道凭据以及其他提供方状态。请将备份加密存储，避免不安全的传输通道，并在怀疑泄露时轮换密钥。
  </Accordion>
</AccordionGroup>

### 验证清单

在新机器上，确认：

- [ ] `openclaw status` 显示网关正在运行。
- [ ] 通道仍然已连接（无需重新配对）。
- [ ] 仪表板可以打开并显示现有会话。
- [ ] 工作区文件（内存、配置）都存在。

## 就地升级插件

就地插件升级会保留相同的插件 id 和配置键，但可能会将磁盘上的状态迁移到当前布局中。插件特定的升级指南与其通道一起提供：

- [Matrix 迁移](/channels/matrix-migration)：加密状态恢复限制、自动快照行为以及手动恢复命令。

## 相关内容

- [`openclaw migrate`](/cli/migrate)：跨系统导入的 CLI 参考。
- [安装概览](/install)：所有安装方式。
- [Doctor](/gateway/doctor)：迁移后的健康检查。
- [卸载](/install/uninstall)：干净地移除 OpenClaw。
