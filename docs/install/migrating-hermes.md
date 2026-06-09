---
summary: "从 Hermes 迁移到 OpenClaw，支持可预览且可回滚的导入"
read_when:
  - 你来自 Hermes，并希望保留你的模型配置、提示词、记忆和技能
  - 你想了解 OpenClaw 会自动导入什么，以及哪些内容仅归档保存
  - 你需要一条干净、可脚本化的迁移路径（CI、全新笔记本、自动化）
title: "从 Hermes 迁移"
---

OpenClaw 通过内置的迁移提供器导入 Hermes 状态。该提供器会在更改状态前预览所有内容，在计划和报告中对秘密信息进行脱敏，并在应用前创建经过验证的备份。

<Note>
导入需要一个全新的 OpenClaw 设置。如果你已经有本地 OpenClaw 状态，请先重置配置、凭据、会话和工作区，或者在审阅计划后直接使用带有 `--overwrite` 的 `openclaw migrate`。
</Note>

## 两种导入方式

<Tabs>
  <Tab title="入门向导">
    最快的路径。向导会检测 `~/.hermes` 下的 Hermes，并在应用前显示预览。

    ```bash
    openclaw onboard --flow import
    ```

    或者指定特定来源：

    ```bash
    openclaw onboard --import-from hermes --import-source ~/.hermes
    ```

  </Tab>
  <Tab title="CLI">
    对于脚本化或可重复执行的运行，请使用 `openclaw migrate`。完整参考请见 [`openclaw migrate`](/cli/migrate)。

    ```bash
    openclaw migrate hermes --dry-run    # 仅预览
    openclaw migrate apply hermes --yes  # 应用并跳过确认
    ```

    当 Hermes 位于 `~/.hermes` 之外时，添加 `--from <path>`。

  </Tab>
</Tabs>

## 会导入什么

<AccordionGroup>
  <Accordion title="模型配置">
    - 来自 Hermes `config.yaml` 的默认模型选择。
    - 来自 `providers` 和 `custom_providers` 的已配置模型提供商以及自定义 OpenAI 兼容端点。

  </Accordion>
  <Accordion title="MCP 服务器">
    来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
  </Accordion>
  <Accordion title="工作区文件">
    - `SOUL.md` 和 `AGENTS.md` 会被复制到 OpenClaw 的 agent 工作区中。
    - `memories/MEMORY.md` 和 `memories/USER.md` 会**追加**到对应的 OpenClaw memory 文件中，而不是覆盖它们。

  </Accordion>
  <Accordion title="记忆配置">
    OpenClaw 文件记忆的默认记忆配置。像 Honcho 这样的外部记忆提供器会被记录为归档或需人工审查的项目，以便你有意地迁移它们。
  </Accordion>
  <Accordion title="技能">
    位于 `skills/<name>/` 下、包含 `SKILL.md` 文件的技能会被复制，同时还会复制来自 `skills.config` 的每个技能的配置值。
  </Accordion>
  <Accordion title="Auth credentials">
    交互式 `openclaw migrate` 会在导入认证凭据前询问，默认选择“是”。可接受的导入包括来自 OpenCode `auth.json` 的 OpenCode OpenAI OAuth 凭据、来自 OpenCode `auth.json` 的 OpenCode 和 GitHub Copilot 条目，以及[受支持的 `.env` 键](/cli/migrate#supported-env-keys)。Hermes `auth.json` 中的 OAuth 条目属于旧状态，会作为需要手动重新认证/修复的项目显示，而不会导入到当前认证中。对于非交互式 `openclaw migrate` 凭据导入，请使用 `--include-secrets`；跳过则使用 `--no-auth-credentials`；从入门向导导入时使用 `--import-secrets`。
  </Accordion>
</AccordionGroup>

## 哪些内容仅归档保存

提供器会将这些内容复制到迁移报告目录中供人工审查，但不会将它们加载到实际的 OpenClaw 配置或凭据中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `state.db`

OpenClaw 会拒绝自动执行或信任这些状态，因为不同系统之间的格式和信任假设可能会发生变化。请在审阅归档后手动迁移你需要的内容。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    计划会列出所有将发生的更改，包括冲突、被跳过的项目以及任何敏感项。计划输出会对嵌套的疑似秘密键进行脱敏。

  </Step>
  <Step title="应用并备份">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 会在应用前创建并验证备份。这个非交互式示例导入的是非秘密状态。运行时不带 `--yes` 可回答凭据提示，或者添加 `--include-secrets` 以在无人值守运行中包含受支持的凭据。

  </Step>
  <Step title="运行 doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/gateway/doctor) 会重新应用任何待处理的配置迁移，并检查导入过程中引入的问题。

  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认 gateway 运行正常，并且你导入的模型、记忆和技能已加载。

  </Step>
</Steps>

## 冲突处理

当计划报告存在冲突时（即目标位置已存在文件或配置值），应用会拒绝继续。

<Warning>
仅在你确实打算替换现有目标时，才使用 `--overwrite` 重新运行。提供器仍可能会为被覆盖的文件在迁移报告目录中写入逐项备份。
</Warning>

对于全新的 OpenClaw 安装来说，冲突并不常见。它们通常出现在你在已经有用户修改的设置上重新运行导入时。

如果在应用过程中中途出现冲突（例如某个配置文件上发生了意外竞争），Hermes 会将剩余的相关配置项标记为 `skipped`，原因是 `blocked by earlier apply conflict`，而不是部分写入它们。迁移报告会记录每个被阻塞的项目，以便你解决最初的冲突后重新运行导入。

## 秘密信息

交互式 `openclaw migrate` 会询问是否导入检测到的认证凭据，默认选择“是”。

- 接受提示会导入来自 OpenCode `auth.json` 的 OpenCode OpenAI OAuth 凭据、来自 OpenCode `auth.json` 的 OpenCode 和 GitHub Copilot 条目，以及[受支持的 `.env` 键](/cli/migrate#supported-env-keys)。Hermes `auth.json` 中的 OAuth 条目会作为需要手动重新认证或修复的内容报告。
- 使用 `--no-auth-credentials`，或在提示中选择“否”，即可只导入非秘密状态。
- 在使用 `--yes` 无人值守运行时，使用 `--include-secrets`。
- 从入门向导导入凭据时，使用 `--import-secrets`。
- 对于由 SecretRef 管理的凭据，请在导入完成后配置 SecretRef 来源。

## 用于自动化的 JSON 输出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

在使用 `--json` 且不带 `--yes` 时，apply 只会打印计划，不会修改状态。这是 CI 和共享脚本中最安全的模式。

## 故障排查

<AccordionGroup>
  <Accordion title="应用因冲突而拒绝">
    检查计划输出。每个冲突都会标识源路径和现有目标。根据每个项目决定是跳过、编辑目标，还是使用 `--overwrite` 重新运行。
  </Accordion>
  <Accordion title="Hermes 位于 ~/.hermes 之外">
    传入 `--from /actual/path`（CLI）或 `--import-source /actual/path`（入门向导）。
  </Accordion>
  <Accordion title="入门向导拒绝在已有设置上导入">
    入门导入需要全新的设置。你可以选择重置状态后重新引导，或者直接使用 `openclaw migrate apply hermes`，它支持 `--overwrite` 和显式备份控制。
  </Accordion>
  <Accordion title="未导入 API 密钥">
    交互式 `openclaw migrate` 只有在你接受凭据提示时才会导入 API 密钥。非交互式 `--yes` 运行需要 `--include-secrets`；入门导入需要 `--import-secrets`。仅识别[受支持的 `.env` 键](/cli/migrate#supported-env-keys)；`.env` 中的其他变量会被忽略。
  </Accordion>
</AccordionGroup>

## 相关内容

- [`openclaw migrate`](/cli/migrate)：完整的 CLI 参考、插件契约和 JSON 结构。
- [Onboarding](/cli/onboard)：向导流程和非交互式标志。
- [Migrating](/install/migrating)：在机器之间迁移 OpenClaw 安装。
- [Doctor](/gateway/doctor)：迁移后的健康检查。
- [Agent workspace](/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和 memory 文件所在的位置。
