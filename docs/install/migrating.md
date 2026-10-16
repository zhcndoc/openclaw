---
summary: "迁移中心：跨系统导入、机器间迁移，以及插件升级"
read_when:
  - "你正在将 OpenClaw 迁移到一台新的笔记本电脑或服务器上"
  - "你来自另一个代理系统，并希望保留状态"
  - "你正在就地升级一个插件"
title: "迁移指南"
---

OpenClaw 支持三种迁移路径：从另一个代理系统导入、将现有安装迁移到新机器，以及就地升级插件。

## <a id="import-from-another-agent-system"></a> 从另一个代理系统导入

捆绑的迁移提供商将说明、MCP 服务器、技能、模型配置和（选择加入）API 密钥引入 OpenClaw。在任何更改之前都会预览计划，并且在报告中编辑秘密。独立的 `openclaw migrate` 有经过验证的备份支持；新的入门导入会在发布本地工件之前暂存并验证本地工件，并在任何不可逆的外部激活之前提交配置。

<CardGroup cols={2}>
  <Card title="从 Claude 迁移" href="/install/migrating-claude" icon="brain">
    导入 Claude Code 和 Claude Desktop 的状态，包括 `CLAUDE.md`、MCP 服务器、技能和项目命令。
  </Card>
  <Card title="从 Hermes 迁移" href="/install/migrating-hermes" icon="feather">
    导入 Hermes 配置、提供方、MCP 服务器、内存、技能，以及受支持的 `.env` 键。
  </Card>
</CardGroup>

CLI 入口点是 [`openclaw migrate`](/cli/migrate)。当引导流程检测到已知来源时，也可以提供迁移选项（`openclaw onboard --flow import`）。

## <a id="move-openclaw-to-a-new-machine"></a> 将 OpenClaw 迁移到新机器

复制 **状态目录**（默认是 `~/.openclaw/`）和你的 **工作区**，以保留：

- **配置** — `openclaw.json` 和所有网关设置。
- **Auth** — 共享和每个代理 SQLite 身份验证存储（API 密钥加上 OAuth），以及 `credentials/` 下的任何通道或提供者状态。
- **会话** — 对话历史和代理状态。
- **通道状态** — WhatsApp 登录、Telegram 会话，以及类似内容。
- **工作区文件** — `MEMORY.md`、`USER.md`、技能和提示。

<Tip>
在旧机器上运行 `openclaw status` 以确认你的状态目录路径。自定义配置文件使用 `~/.openclaw-<profile>/` 或通过 `OPENCLAW_STATE_DIR` 设置的路径。
</Tip>

### <a id="migration-steps"></a> 迁移步骤

<Steps>
  <Step id="stop-the-gateway-and-back-up" title="停止网关并备份">
    在 **old** 计算机上，停止网关，然后创建并验证备份存档：

    ```bash
    openclaw gateway stop
    mkdir -p ~/Backups/openclaw
    openclaw backup create --output ~/Backups/openclaw --verify
    ```

    在拍摄机器移动快照之前停止网关。更改的 SQLite 数据库的原始副本可以捕获不匹配的数据库和 WAL 文件；静默网关还可以保持状态树的其余部分稳定。如果您使用多个配置文件，请对每个选定的配置文件运行一次命令。

  </Step>

  <Step id="install-openclaw-on-the-new-machine" title="在新机器上安装OpenClaw">
    在新机器上[安装](/install) CLI（如有需要也安装 Node）。即使入门流程创建了一个新的 `~/.openclaw/` 也没关系——下一步会覆盖它。
  </Step>

  <Step id="transfer-and-restore-to-staging" title="转移并恢复到暂存">
    通过 `scp`、外部驱动器或其他受保护通道传输生成的 `.tar.gz` 存档。在新机器上，将其恢复到新的暂存目录：

    ```bash
    openclaw backup restore <archive.tar.gz> --target ~/openclaw-restored
    ```

    恢复永远不会就地激活。网关停止后，使用恢复的 `manifest.json` 映射将状态和工作区资产移动到其记录的目标，或将 `OPENCLAW_STATE_DIR` 指向恢复的状态资产。确认所有权与将运行网关的用户匹配。

    绝对符号链接保留其原始目标位置，包括指向单独备份的配置或凭据的链接。在另一台计算机或另一条路径上激活状态之前，请检查这些链接并确保它们的目标对于新位置来说是正确的。请参阅 [ 备份符号链接警告 ](/cli/backup#what-gets-backed-up)。

    <Warning>
    恢复较旧的通道状态可能会使棘轮凭证（例如 WhatsApp）失去同步。批准和 delivery/dedupe 状态也会回滚，并且必须重新安装插件 `node_modules` 树。请参阅 [ 恢复完整存档 ](/install/backups#restore-a-full-archive)。
    </Warning>

  </Step>

  <Step id="run-doctor-and-verify" title="运行 Doctor 并验证">
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

### <a id="common-pitfalls"></a> 常见陷阱

<AccordionGroup>
  <Accordion id="profile-or-state-dir-mismatch" title="配置文件或状态目录不匹配">
    如果旧网关使用了 `--profile` 或 `OPENCLAW_STATE_DIR`，而新网关没有使用，那么通道会显示为已登出，且会话将为空。请使用你迁移过来的**相同**配置文件或 state-dir 启动网关，然后重新运行 `openclaw doctor`。
  </Accordion>

  <Accordion id="copying-only-openclaw-json" title="仅复制 openclaw.json">
    仅配置文件是不够的。共享模型身份验证位于 `state/openclaw.sqlite` 中，代理本地配置文件位于 `agents/<agentId>/agent/openclaw-agent.sqlite` 中，通道和提供者状态位于 `credentials/` 中。始终使用上述备份和恢复流程迁移 **entire** 状态目录。
  </Accordion>

  <Accordion id="permissions-and-ownership" title="权限和所有权">
    如果您以 root 或切换用户身份进行复制，网关可能无法读取凭据。检查状态目录和工作区是否由运行网关的用户拥有。
  </Accordion>

  <Accordion id="remote-mode" title="远程模式">
    如果你的 UI 指向的是一个**远程**网关，那么远程主机拥有会话和工作区。应迁移网关主机本身，而不是你的本地笔记本电脑。参见 [FAQ](/help/faq#where-things-live-on-disk)。
  </Accordion>

  <Accordion id="secrets-in-backups" title="备份中的秘密">
    状态目录包含认证配置文件、通道凭据以及其他提供方状态。请将备份加密存储，避免不安全的传输通道，并在怀疑泄露时轮换密钥。
  </Accordion>
</AccordionGroup>

### <a id="verification-checklist"></a> 验证清单

在新机器上，确认：

- [ ] `openclaw status` 显示网关正在运行。
- [ ] 通道仍然已连接（无需重新配对）。
- [ ] 仪表板可以打开并显示现有会话。
- [ ] 工作区文件（内存、配置）都存在。

## <a id="upgrade-a-plugin-in-place"></a> 就地升级插件

就地插件升级会保留相同的插件 id 和配置键，但可能会将磁盘上的状态迁移到当前布局中。插件特定的升级指南与其通道一起提供：

- [Matrix 迁移](/channels/matrix-migration)：加密状态恢复限制、自动快照行为以及手动恢复命令。

## <a id="related"></a> 相关内容

- [`openclaw migrate`](/cli/migrate)：跨系统导入的 CLI 参考。
- [安装概述](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：迁移后的健康检查。
- [Updating](/install/updating)：就地更新现有安装，以及回滚策略。
- [卸载](/install/uninstall)：干净地移除 OpenClaw。
- [`openclaw backup`](/cli/backup) — 创建此迁移恢复的存档
