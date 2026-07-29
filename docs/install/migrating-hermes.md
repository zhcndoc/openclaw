---
summary: "从 Hermes 迁移到 OpenClaw，支持可预览且可回滚的导入"
read_when:
  - 你来自 Hermes，并希望保留你的模型配置、提示词、记忆和技能
  - 你想了解 OpenClaw 会自动导入什么，以及哪些内容仅归档保存
  - 你需要一条干净、可脚本化的迁移路径（CI、全新笔记本、自动化）
title: "从 Hermes 迁移"
---

The bundled Hermes migration provider follows `HERMES_HOME` and the active Hermes profile, falling back to `~/.hermes` on macOS/Linux or `%LOCALAPPDATA%\hermes` on Windows. It previews every change before applying and redacts secrets in plans and reports. Standalone `openclaw migrate` writes a verified backup; the fresh onboarding path stages config, credentials, and files and publishes them only after imported inference verifies. An explicit `--from` path always wins.

<Note>
导入需要一个全新的 OpenClaw 设置。如果你已经有本地 OpenClaw 状态，请先重置配置、凭据、会话和工作区，或者在查看计划后直接使用带有 `--overwrite` 的 `openclaw migrate apply hermes`。
</Note>

## 两种导入方式

<Tabs>
  <Tab title="Onboarding wizard">
    检测活动的 Hermes home/profile，并在应用前显示预览。

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

    添加 `--from <path>` 以覆盖 Hermes home/profile 的自动发现。

  </Tab>
</Tabs>

## 会导入什么

<AccordionGroup>
  <Accordion title="Model configuration">
    - 来自 Hermes `config.yaml` 的默认模型选择。
    - 来自 `model`、`providers` 和 `custom_providers` 的已配置模型提供器和自定义端点，包括当前 Hermes Chat Completions、Codex Responses 和 Anthropic Messages 传输。

  </Accordion>
  <Accordion title="MCP servers">
    来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义，包括禁用状态、超时、并行工具支持、OAuth 范围、兼容的 TLS 字段，以及原生/资源/提示工具策略。字面量环境变量和标头需要凭据导入同意。仅适用于 Hermes 的生命周期、采样、引发、预检、保活、CA 证书包、受密码保护的客户端密钥，以及预注册的 OAuth 客户端设置，会被标记为需要人工审查的项目，而不是无效的 OpenClaw 配置。
  </Accordion>
  <Accordion title="Workspace files">
    - `SOUL.md` and `AGENTS.md` are copied into the OpenClaw agent workspace.
    - `memories/MEMORY.md` and `memories/USER.md` are **appended** to the matching OpenClaw memory files instead of overwriting them.
    - Memory-only surfaces behave differently: the onboarding memory page and the Control UI Memory import page copy these two files under `memory/imports/hermes/` for indexed recall and leave existing workspace memory untouched.

  </Accordion>
  <Accordion title="记忆配置">
    OpenClaw 文件记忆的默认记忆配置。像 Honcho 这样的外部记忆提供器会被记录为归档或需人工审查的项目，以便你有意地迁移它们。
  </Accordion>
  <Accordion title="Skills">
    `skills/` 下任意位置包含 `SKILL.md` 文件的 Skills 都会被递归发现、扁平化到 OpenClaw 工作区技能目录中，并连同其支持文件一起复制。来自 `skills.config` 的每个 skill 配置值都会被保留。
  </Accordion>
  <Accordion title="Auth credentials">
    交互式 `openclaw migrate` 会在导入 auth credentials 前询问，默认选中“是”。接受的导入包括当前 Hermes OpenAI Codex OAuth 条目、OpenCode OpenAI OAuth 和 GitHub Copilot 条目，以及[支持的 Hermes `.env` 键](/cli/migrate#supported-env-keys)。非交互式导入请使用 `--include-secrets`，跳过凭据请使用 `--no-auth-credentials`，或使用 onboarding 的 `--import-secrets` 标志。导入 Hermes OAuth 后，不要让 Hermes 和 OpenClaw 继续使用同一个 refresh grant；在同时运行两者之前，请先让其中一侧重新认证。
  </Accordion>
</AccordionGroup>

## 哪些内容仅归档保存

提供器会将这些内容复制到迁移报告目录中供人工审查，但不会将它们加载到实际的 OpenClaw 配置或凭据中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `plans/`, `workspace/`, `skins/`, and `kanban/`
- `pairing/` and `platforms/` stores, plus gateway routing/process state
- `state.db`, `hermes_state.db`, `projects.db`, `response_store.db`, `memory_store.db`, `verification_evidence.db`, `kanban.db`, and `retaindb_queue.db`

OpenClaw 会拒绝自动执行或信任这些状态，因为不同系统之间的格式和信任假设可能会发生变化。请在查看归档后手动移动你需要的内容。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    该计划会列出所有将要更改的内容，包括冲突、被跳过的项目以及敏感项目。输出中嵌套的类似密钥的键会被隐藏。

  </Step>
  <Step title="应用并备份">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 会在应用前创建并验证备份。这个非交互式示例只导入非机密状态。可在不使用 `--yes` 的情况下运行，以便交互式回答凭据提示；或者添加 `--include-secrets`，在无人值守运行中包含受支持的凭据。

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

在全新安装中，冲突并不常见。它们通常出现在你针对一个已经有用户修改的设置重新运行导入时。

如果在应用过程中中途出现冲突（例如，配置文件上发生了意外的竞争），该项会被报告为冲突，而其他独立的文件、技能、凭据、归档和配置条目会继续处理。请解决发生冲突的项目后重新运行导入；相同的内存导入是幂等的。

## 秘密信息

交互式 `openclaw migrate` 会询问是否导入检测到的认证凭据，默认选择“是”。

- 接受导入当前的 Hermes OpenAI Codex OAuth 条目、OpenCode OpenAI OAuth 和 GitHub Copilot 条目，以及 [受支持的 `.env` 键](/cli/migrate#supported-env-keys)。
- 使用 `--no-auth-credentials`，或在提示时回答 no，只导入非秘密状态。
- 使用 `--include-secrets` 可在无人值守的 `--yes` 运行中导入凭据。
- 使用 onboarding wizard 的 `--import-secrets` 标志从 wizard 导入凭据。

## 用于自动化的 JSON 输出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

使用 `--json` 且不带 `--yes` 时，apply 会打印计划而不会修改状态——这是适用于 CI 和共享脚本的最安全模式。

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
  <Accordion title="API 密钥未导入">
    交互式 `openclaw migrate` 只有在你接受凭据提示时才会导入 API 密钥。非交互式 `--yes` 运行需要 `--include-secrets`；入门导入需要 `--import-secrets`。仅会识别[受支持的 `.env` 键](/cli/migrate#supported-env-keys)——其他 `.env` 变量会被忽略。
  </Accordion>
</AccordionGroup>

## 相关内容

- [`openclaw migrate`](/cli/migrate)：完整的 CLI 参考、插件契约和 JSON 结构。
- [入门引导](/cli/onboard)：向导流程和非交互式标志。
- [迁移](/install/migrating)：在机器之间迁移 OpenClaw 安装。
- [诊断](/gateway/doctor)：迁移后的健康检查。
- [Agent 工作区](/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和 memory 文件所在的位置。
