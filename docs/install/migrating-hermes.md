---
summary: "从 Hermes 迁移到 OpenClaw，支持预览、可回滚的导入"
read_when:
  - 你来自 Hermes，并希望保留你的模型配置、提示词、记忆和技能
  - 你想了解 OpenClaw 会自动导入什么，以及哪些内容只会归档保留
  - 你需要一个干净、可脚本化的迁移路径（CI、新笔记本、自动化）
title: "从 Hermes 迁移"
---

OpenClaw 通过一个内置的迁移提供器导入 Hermes 状态。该提供器会在修改状态之前预览所有内容，在计划和报告中对秘密信息进行脱敏，并在应用前创建并验证备份。

<Note>
导入需要一个全新的 OpenClaw 设置。如果你已经有本地 OpenClaw 状态，请先重置配置、凭证、会话和工作区，或者在查看计划后直接使用带有 `--overwrite` 的 `openclaw migrate`。
</Note>

## 两种导入方式

<Tabs>
  <Tab title="引导向导">
    最快的路径。向导会检测 `~/.hermes` 中的 Hermes，并在应用前显示预览。

    ```bash
    openclaw onboard --flow import
    ```

    或者指定一个特定来源：

    ```bash
    openclaw onboard --import-from hermes --import-source ~/.hermes
    ```

  </Tab>
  <Tab title="CLI">
    对于脚本化或可重复运行的场景，请使用 `openclaw migrate`。完整参考请参见 [`openclaw migrate`](/cli/migrate)。

    ```bash
    openclaw migrate hermes --dry-run    # 仅预览
    openclaw migrate apply hermes --yes  # 跳过确认直接应用
    ```

    当 Hermes 位于 `~/.hermes` 之外时，添加 `--from <path>`。

  </Tab>
</Tabs>

## 会导入什么

<AccordionGroup>
  <Accordion title="模型配置">
    - 来自 Hermes `config.yaml` 的默认模型选择。
    - 来自 `providers` 和 `custom_providers` 的已配置模型提供商以及自定义的 OpenAI 兼容端点。
  </Accordion>
  <Accordion title="MCP 服务器">
    来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
  </Accordion>
  <Accordion title="工作区文件">
    - `SOUL.md` 和 `AGENTS.md` 会复制到 OpenClaw 的代理工作区中。
    - `memories/MEMORY.md` 和 `memories/USER.md` 会**追加**到匹配的 OpenClaw 记忆文件中，而不是覆盖它们。
  </Accordion>
  <Accordion title="记忆配置">
    OpenClaw 文件记忆的默认记忆配置。像 Honcho 这样的外部记忆提供器会被记录为归档或需要人工审核的项目，以便你有计划地迁移它们。
  </Accordion>
  <Accordion title="技能">
    位于 `skills/<name>/` 下、包含 `SKILL.md` 文件的技能会被复制，同时还会复制来自 `skills.config` 的每个技能的配置值。
  </Accordion>
  <Accordion title="API 密钥（可选）">
    设置 `--include-secrets` 以导入受支持的 `.env` 键：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。不加该标志时，秘密信息绝不会被复制。
  </Accordion>
</AccordionGroup>

## 只保留为归档的内容

该提供器会将这些内容复制到迁移报告目录中以供人工审查，但不会将它们加载到正在运行的 OpenClaw 配置或凭证中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

OpenClaw 不会自动执行或信任这些状态，因为不同系统之间的格式和信任假设可能会发生变化。请在审查归档后，手动迁移你需要的内容。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    计划会列出所有将要发生的更改，包括冲突、被跳过的项目以及任何敏感项目。计划输出会对嵌套的疑似秘密键进行脱敏。

  </Step>
  <Step title="带备份应用">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 会在应用前创建并验证备份。如果你需要导入 API 密钥，请添加 `--include-secrets`。

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

    确认网关运行正常，并且你导入的模型、记忆和技能已加载。

  </Step>
</Steps>

## 冲突处理

如果计划报告冲突（某个文件或配置值在目标位置已存在），应用将拒绝继续。

<Warning>
只有在有意替换现有目标时，才使用 `--overwrite` 重新运行。提供器在迁移报告目录中仍可能会为被覆盖的文件写入逐项备份。
</Warning>

对于全新的 OpenClaw 安装，冲突并不常见。它们通常出现在你对一个已经有用户修改的设置重新运行导入时。

如果在应用过程中途出现冲突（例如，某个配置文件上出现了意外的竞争），Hermes 会将剩余的依赖配置项标记为 `skipped`，原因是 `blocked by earlier apply conflict`，而不是部分写入它们。迁移报告会记录每个被阻塞的项目，以便你解决最初的冲突并重新运行导入。

## 密钥

默认情况下，密钥绝不会被导入。

- 先运行 `openclaw migrate apply hermes --yes`，导入非密钥状态。
- 如果你也想复制受支持的 `.env` 键，请使用 `--include-secrets` 重新运行。
- 对于由 SecretRef 管理的凭证，请在导入完成后配置 SecretRef 来源。

## 用于自动化的 JSON 输出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

在使用 `--json` 且不带 `--yes` 时，应用会打印计划而不会修改状态。这是 CI 和共享脚本中最安全的模式。

## 故障排查

<AccordionGroup>
  <Accordion title="应用因冲突而拒绝">
    检查计划输出。每个冲突都会标明源路径和现有目标。根据每一项决定是跳过、编辑目标，还是使用 `--overwrite` 重新运行。
  </Accordion>
  <Accordion title="Hermes 位于 ~/.hermes 之外">
    传入 `--from /actual/path`（CLI）或 `--import-source /actual/path`（引导向导）。
  </Accordion>
  <Accordion title="引导向导拒绝在现有设置上导入">
    引导导入需要全新的设置。你可以重置状态后重新引导，或者直接使用 `openclaw migrate apply hermes`，它支持 `--overwrite` 和显式的备份控制。
  </Accordion>
  <Accordion title="API 密钥没有导入">
    需要使用 `--include-secrets`，并且只会识别上面列出的密钥。`.env` 中的其他变量会被忽略。
  </Accordion>
</AccordionGroup>

## 相关内容

- [`openclaw migrate`](/cli/migrate)：完整的 CLI 参考、插件契约和 JSON 结构。
- [引导](/cli/onboard)：向导流程和非交互式标志。
- [迁移](/install/migrating)：在机器之间迁移 OpenClaw 安装。
- [Doctor](/gateway/doctor)：迁移后的健康检查。
- [代理工作区](/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和记忆文件所在的位置。
