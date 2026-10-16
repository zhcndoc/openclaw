---
summary: "从 Hermes 迁移到 OpenClaw，支持可预览且可回滚的导入"
read_when:
  - "你来自 Hermes，并希望保留你的模型配置、提示词、记忆和技能"
  - "你想了解 OpenClaw 会自动导入什么，以及哪些内容仅归档保存"
  - "你需要一条干净、可脚本化的迁移路径（CI、全新笔记本、自动化）"
title: "从 Hermes 迁移"
---

捆绑的 Hermes 迁移提供程序遵循 `HERMES_HOME` 和活动 Hermes 配置文件，回退到 macOS/Linux 上的 `~/.hermes` 或 Windows 上的 `%LOCALAPPDATA%\hermes`。它会在应用之前预览每项更改，并编辑计划和报告中的秘密。独立`openclaw migrate`写入经过验证的备份；新的入门路径会暂存配置、凭据和文件，并仅在导入的推理验证后才发布它们。显式的 `--from` 路径总是获胜。

<Note>
导入需要全新的 OpenClaw 设置。如果您已有本地 OpenClaw 状态，请首先重置配置、凭据、会话和工作区，或者在查看计划后直接将 `openclaw migrate apply hermes` 与 `--overwrite` 一起使用。
</Note>

## <a id="two-ways-to-import"></a> 两种导入方式

<Tabs>
  <Tab id="onboarding-wizard" title="设置向导">
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
    使用 `openclaw migrate` 进行脚本化或可重复运行。完整参考请参见 [`openclaw migrate`](/cli/migrate)。

    ```bash
    openclaw migrate hermes --dry-run    # preview only
    openclaw migrate apply hermes --yes  # apply with confirmation skipped
    ```

    添加 `--from <path>` 以覆盖 Hermes home/profile 的自动发现。

  </Tab>
</Tabs>

## <a id="what-gets-imported"></a> 导入什么

<AccordionGroup>
  <Accordion id="model-configuration" title="模型配置">
    - 默认模型选择Hermes`config.yaml`。带有`--agent <id>`的，进口模型属于该智能体；共享默认值，其他代理保留其模型。
    - 来自 `model`、`providers` 和 `custom_providers` 的配置模型提供程序和自定义端点，包括 Hermes 传输别名、camelCase 提供程序字段以及带有每个模型元数据的模型列表。

  </Accordion>
  <Accordion id="mcp-servers" title="MCP 服务器">
    来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义，包括禁用状态、超时、并行工具支持、OAuth 范围、兼容的 TLS 字段和 native/resource/prompt 工具策略。文字环境变量和标头需要凭证导入同意。仅 Hermes 的生命周期、采样、诱导、预检、保活、CA-bundle、受密码保护的客户端密钥和预注册的 OAuth- 客户端设置将成为手动审核项，而不是无效的 OpenClaw 配置。

    空的 `tools.include` 会禁用本​​机工具，同时保留资源和提示实用程序设置。 OpenClaw工具过滤器支持精确名称和`*`； Hermes `?` 和支架图案需要人工审核。不支持的包含模式将被忽略，并且具有不支持的排除模式的服务器将被导入禁用，直到您替换其过滤器并启用它。

  </Accordion>
  <Accordion id="workspace-files" title="工作区文件">
    - `SOUL.md` 和 `AGENTS.md` 被复制到 OpenClaw 代理工作区中。
    - `memories/MEMORY.md` 和 `memories/USER.md` 将 **append** 到匹配的 OpenClaw 内存文件中，而不是覆盖它们。
    - 仅内存表面的行为不同：载入内存页面和 Control UI 内存导入页面将这两个文件复制到 `memory/imports/hermes/` 下以进行索引调用，并保持现有工作区内存不变。

  </Accordion>
  <Accordion id="memory-configuration" title="内存配置">
    OpenClaw 文件记忆的默认记忆配置。像 Honcho 这样的外部记忆提供器会被记录为归档或需人工审查的项目，以便你有意地迁移它们。
  </Accordion>
  <Accordion id="skills" title="技能">
    递归地发现 `skills/` 中活动目录下的 `SKILL.md` 文件的技能，将其平铺到 OpenClaw 工作区技能目录中，并与其支持文件一起复制。保留 `skills.config` 中的每个技能配置值和 `skills.disabled` 中的全局禁用状态。对于 `--skill`，仅导入所选技能的配置和禁用状态。仅导入 `_org/.active_org` 选择的组织镜像。
  </Accordion>
  <Accordion id="auth-credentials" title="身份验证凭据">
    交互式 `openclaw migrate` 会在导入 auth credentials 前询问，默认选中“是”。接受的导入包括当前 Hermes OpenAI Codex OAuth 条目、OpenCode OpenAI OAuth 和 GitHub Copilot 条目，以及[支持的 Hermes `.env` 键](/cli/migrate#supported-env-keys)。非交互式导入请使用 `--include-secrets`，跳过凭据请使用 `--no-auth-credentials`，或使用 onboarding 的 `--import-secrets` 标志。导入 Hermes OAuth 后，不要让 Hermes 和 OpenClaw 继续使用同一个 refresh grant；在同时运行两者之前，请先让其中一侧重新认证。
  </Accordion>
</AccordionGroup>

## <a id="what-stays-archive-only"></a> 仅存档的内容

提供程序将这些内容复制到迁移报告目录中以供手动审核，但 **not** 是否将它们加载到实时 OpenClaw 配置或凭据中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `plans/`、`workspace/`、`skins/` 和 `kanban/`
- `pairing/` 和 `platforms/` 商店，加上网关 routing/process 状态
- `state.db`、`hermes_state.db`、`projects.db`、`response_store.db`、`memory_store.db`、`verification_evidence.db`、`kanban.db` 和 `retaindb_queue.db`

OpenClaw 会拒绝自动执行或信任这些状态，因为不同系统之间的格式和信任假设可能会发生变化。请在查看归档后手动移动你需要的内容。

## <a id="recommended-flow"></a> 推荐流程

<Steps>
  <Step id="preview-the-plan" title="预览计划">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    该计划会列出所有将要更改的内容，包括冲突、被跳过的项目以及敏感项目。输出中嵌套的类似密钥的键会被隐藏。

  </Step>
  <Step id="apply-with-backup" title="申请并备份">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 会在应用前创建并验证备份。这个非交互式示例只导入非机密状态。可在不使用 `--yes` 的情况下运行，以便交互式回答凭据提示；或者添加 `--include-secrets`，在无人值守运行中包含受支持的凭据。

  </Step>
  <Step id="run-doctor" title="跑医生">
    ```bash
    openclaw doctor
    ```

    [Doctor](/gateway/doctor) 会重新应用任何待处理的配置迁移，并检查导入过程中引入的问题。

  </Step>
  <Step id="restart-and-verify" title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认 gateway 运行正常，并且你导入的模型、记忆和技能已加载。

  </Step>
</Steps>

## <a id="conflict-handling"></a> 冲突处理

当计划报告冲突时（目标中已存在文件或配置值），Apply 拒绝继续。

<Warning>
仅当有意替换现有目标时才使用 `--overwrite` 重新运行。提供商仍可以在迁移报告目录中为被覆盖的文件编写项目级备份。
</Warning>

在全新安装中，冲突并不常见。它们通常出现在你针对一个已经有用户修改的设置重新运行导入时。

如果在应用过程中出现冲突（例如，配置文件上出现意外竞争），则该项目将报告为冲突，而独立文件、技能、凭据、存档和配置条目将继续。解决冲突的项目并重新运行导入；重复相同的内存导入不会创建重复项。

## <a id="secrets"></a> 密钥

交互式 `openclaw migrate` 会询问是否导入检测到的认证凭据，默认选择“是”。

- 接受导入当前的 Hermes OpenAI Codex OAuth 条目、OpenCode OpenAI OAuth 和 GitHub Copilot 条目，以及 [受支持的 `.env` 键](/cli/migrate#supported-env-keys)。
- 使用 `--no-auth-credentials`，或在提示时回答 no，只导入非秘密状态。
- 使用 `--include-secrets` 可在无人值守的 `--yes` 运行中导入凭据。
- 使用 onboarding wizard 的 `--import-secrets` 标志从 wizard 导入凭据。

## <a id="json-output-for-automation"></a> 用于自动化的 JSON 输出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

`openclaw migrate hermes --json` 不带 `--yes` 打印计划而不应用它。非交互式 `migrate apply` 需要 `--yes`。部分应用失败会返回完整的 JSON 报告并退出，代码为 `1`。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="apply-refuses-with-conflicts" title="申请因冲突而被拒绝">
    检查计划输出。每个冲突都会标识源路径和现有目标。根据每个项目决定是跳过、编辑目标，还是使用 `--overwrite` 重新运行。
  </Accordion>
  <Accordion id="hermes-lives-outside-hermes" title="Hermes 住在 ~/.hermes 外面">
    通过 `--from /actual/path` （CLI） 或 `--import-source /actual/path`（入门引导）。
  </Accordion>
  <Accordion id="onboarding-refuses-to-import-on-an-existing-setup" title="入门引导拒绝导入现有设置">
    入门导入需要全新的设置。你可以选择重置状态后重新引导，或者直接使用 `openclaw migrate apply hermes`，它支持 `--overwrite` 和显式备份控制。
  </Accordion>
  <Accordion id="api-keys-did-not-import" title="API 密钥未导入">
    交互式 `openclaw migrate` 只有在你接受凭据提示时才会导入 API 密钥。非交互式 `--yes` 运行需要 `--include-secrets`；入门导入需要 `--import-secrets`。仅会识别[受支持的 `.env` 键](/cli/migrate#supported-env-keys)——其他 `.env` 变量会被忽略。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [`openclaw migrate`](/cli/migrate)：完整的 CLI 参考、插件合约和 JSON 形状。
- [Onboarding](/cli/onboard)：向导流程和非交互式标志。
- [迁移](/install/migrating)：在机器之间迁移 OpenClaw 安装。
- [Doctor](/gateway/doctor)：迁移后的健康检查。
- [Agent 工作区](/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和 memory 文件所在的位置。
