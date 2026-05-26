---
summary: "技能：托管 vs 工作区、门控规则、代理允许列表以及配置 wiring"
read_when:
  - 添加或修改技能
  - 更改技能门控、允许列表或加载规则
  - 了解技能优先级和快照行为
title: "技能"
sidebarTitle: "技能"
---

OpenClaw 使用与 **[AgentSkills](https://agentskills.io) 兼容** 的技能
文件夹来教会代理如何使用工具。每个技能都是一个目录，包含带有 YAML frontmatter 和说明的 `SKILL.md`。OpenClaw
会加载内置技能以及可选的本地覆盖，并在加载时根据环境、配置和二进制文件是否存在进行过滤。

## 位置和优先级

OpenClaw 会从以下来源加载技能，**优先级最高的在前**：

| #   | 来源                  | 路径                             |
| --- | --------------------- | -------------------------------- |
| 1   | 工作区技能            | `<workspace>/skills`             |
| 2   | 项目代理技能          | `<workspace>/.agents/skills`     |
| 3   | 个人代理技能          | `~/.agents/skills`               |
| 4   | 托管/本地技能         | `~/.openclaw/skills`             |
| 5   | 内置技能              | 随安装包提供                     |
| 6   | 额外技能文件夹        | `skills.load.extraDirs`（配置）  |

如果技能名称冲突，优先级最高的来源获胜。

Codex CLI 的原生 `$CODEX_HOME/skills` 目录不属于这些 OpenClaw 技能根目录之一。在 Codex harness 模式下，本地 app-server 启动会使用每个代理隔离的 Codex home，因此操作员个人的 `~/.codex/skills` 不会被隐式加载。Codex 原生的 `.agents` 发现会单独继承 `HOME`；OpenClaw 上面列出的技能根目录已经包含 `~/.agents/skills`。使用 `openclaw migrate plan codex` 来盘点 Codex home 中的技能，然后使用 `openclaw migrate codex` 在复制之前通过交互式复选框提示选择要使用的技能目录。

对于非交互式运行，请对要复制的精确技能重复使用 `--skill <name>`。

## 每代理 vs 共享技能

在 **多代理** 设置中，每个代理都有自己的工作区：

| 范围                | 路径                                        | 对谁可见                  |
| ------------------- | ------------------------------------------- | ------------------------- |
| 每代理              | `<workspace>/skills`                        | 仅该代理                 |
| 项目代理            | `<workspace>/.agents/skills`                | 仅该工作区的代理         |
| 个人代理            | `~/.agents/skills`                          | 该机器上的所有代理       |
| 共享托管/本地       | `~/.openclaw/skills`                        | 该机器上的所有代理       |
| 共享额外目录        | `skills.load.extraDirs`（最低优先级）       | 该机器上的所有代理       |

多个位置存在同名技能 → 最高来源获胜。工作区高于
项目代理，高于个人代理，高于托管/本地，高于内置，
高于额外目录。

## 代理技能允许列表

技能的**位置**和技能的**可见性**是分开的两个控制项。
位置/优先级决定同名技能的哪个副本获胜；代理允许列表决定某个代理实际能使用哪些技能。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // 继承 github, weather
      { id: "docs", skills: ["docs-search"] }, // 替换默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="允许列表规则">
    - 省略 `agents.defaults.skills`，默认即为不受限制的技能。
    - 省略 `agents.list[].skills`，则继承 `agents.defaults.skills`。
    - 将 `agents.list[].skills` 设为 `[]`，表示没有技能。
    - 非空的 `agents.list[].skills` 列表是该代理的**最终**集合——不会与默认值合并。
    - 生效的允许列表适用于提示词构建、技能斜杠命令发现、沙箱同步以及技能快照。
  </Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录来提供自己的技能（路径相对于插件根目录）。当插件启用时，会加载插件技能。这是放置工具特定操作指南的合适位置，这类指南对工具描述来说太长，但在安装插件后又应该始终可用——例如，浏览器插件提供了一个用于多步浏览器控制的 `browser-automation` 技能。

插件技能目录会合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的内置、托管、代理或工作区技能会覆盖它们。你可以在插件的配置条目上通过 `metadata.openclaw.requires.config` 对它们进行门控。

有关发现/配置请参见 [插件](/tools/plugin)，有关这些技能所教授的工具表面请参见 [工具](/tools)。

## 技能工作坊

可选的、实验性的 **技能工作坊** 插件可以从代理工作期间观察到的可复用流程中创建或更新工作区技能。它默认禁用，必须通过 `plugins.entries.skill-workshop` 显式启用。

技能工作坊只会写入 `<workspace>/skills`，会扫描生成内容，支持待批准或自动安全写入，会隔离不安全提议，并在成功写入后刷新技能快照，使新技能无需 Gateway 重启即可可用。

可将其用于诸如 _“下次，验证 GIF 署名”_ 之类的修正，或诸如媒体 QA 检查清单这类经验总结出的工作流。请从待批准开始；仅在经过审查其提议后、且在可信工作区中才使用自动写入。完整指南：[技能工作坊插件](/plugins/skill-workshop)。

## ClawHub（安装与同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公开技能注册表。
可使用原生 `openclaw skills` 命令进行发现/安装/更新，或使用独立的 `clawhub` CLI 进行发布/同步工作流。完整指南：
[ClawHub](/clawhub)。

| Action                                 | Command                                                |
| -------------------------------------- | ------------------------------------------------------ |
| 将 ClawHub 技能安装到工作区           | `openclaw skills install <skill-slug>`                 |
| 将 Git 技能安装到工作区                | `openclaw skills install git:owner/repo@ref`           |
| 将本地技能安装到工作区                 | `openclaw skills install ./path/to/skill --as my-tool` |
| 为所有本地代理安装一个技能             | `openclaw skills install <skill-slug> --global`        |
| 更新所有工作区已安装的技能             | `openclaw skills update --all`                         |
| 更新单个共享托管技能                   | `openclaw skills update <skill-slug> --global`         |
| 更新所有共享托管/本地技能              | `openclaw skills update --all --global`                |
| 同步（扫描 + 发布更新）                | `clawhub sync --all`                                   |

原生 `openclaw skills install` 默认会安装到当前活动工作区的 `skills/` 目录。添加 `--global` 可安装到共享托管/本地目录（默认是 `~/.openclaw/skills`），该目录对所有本地代理可见，除非代理技能允许列表缩小了可见范围。独立的 `clawhub` CLI 也会安装到当前工作目录下的 `./skills`（或者回退到已配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其识别为 `<workspace>/skills`。
已配置的技能根目录也支持一个分组层级，例如 `skills/<group>/<skill>/SKILL.md`，这样相关的第三方技能可以保留在共享文件夹下，而不需要广泛的递归扫描。

Git 和本地目录安装都要求源根目录下有一个 `SKILL.md`。安装 slug 会优先取自 `SKILL.md` frontmatter 中的 `name`，前提是它是一个有效的 slug，然后回退到源目录或仓库名。使用 `--as <slug>` 可覆盖推断出的 slug。`--version` 只适用于 ClawHub 安装。技能安装不支持 npm 包规格或 zip/归档路径。`openclaw skills update` 只会更新由 ClawHub 跟踪的安装；要刷新 Git 或本地来源，请重新安装它们。

需要私有、非 ClawHub 分发的 Gateway 客户端可以使用 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 暂存一个 zip 技能归档，然后使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安装已提交的上传内容。这是面向受信任客户端的显式管理员上传路径，而不是普通的 `openclaw skills install <slug>` 或 ClawHub 安装流程。它默认关闭，只有在 `openclaw.json` 中设置 `skills.install.allowUploadedArchives: true` 时才有效。上传模式仍然会安装到默认的代理工作区 `skills/<slug>` 目录；归档内部的文件夹名称会被忽略，不作为最终安装目标。

ClawHub 技能页面会在安装前暴露最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的扫描器详情页。
`openclaw skills install <slug>` 仍然只是安装路径；发布者可以通过 ClawHub 仪表板或 `clawhub skill rescan <slug>` 处理误报。

## 安全

<Warning>
将第三方技能视为**不受信任的代码**。在启用之前先阅读它们。
对于不受信任的输入和高风险工具，优先使用沙箱运行。有关代理端控制，请参见
[沙箱化](/gateway/sandboxing)。
</Warning>

- 工作区、项目代理和额外目录的技能发现，仅接受其解析后的真实路径仍位于配置根目录内的技能根目录，除非 `skills.load.allowSymlinkTargets` 明确信任某个目标根目录。捆绑技能始终保持在容器内。受管的 `~/.openclaw/skills` 和个人的 `~/.agents/skills` 根目录可以包含由 ClawHub 或其他本地技能管理器安装的符号链接技能文件夹，但每个 `SKILL.md` 的真实路径仍必须位于其解析后的技能目录内。
- Gateway 私有归档安装默认关闭。显式启用时，它们需要包含 `SKILL.md` 的已提交 zip 上传，并复用与 ClawHub 技能安装相同的归档解压、路径遍历、符号链接、强制覆盖和回滚保护。它们受 `skills.install.allowUploadedArchives` 约束；正常的 ClawHub 安装不需要该设置。
- 由 Gateway 支持的技能依赖安装（`skills.install`、引导流程以及 Skills 设置 UI）会在执行安装器元数据之前运行内置的危险代码扫描器。`critical` 结果默认会阻止，除非调用方显式设置 dangerous override；`suspicious` 结果仍然只会警告。
- `openclaw skills install <slug>` 不同——它会将一个 ClawHub 技能文件夹下载到工作区，或使用 `--global` 下载到共享托管/本地技能中，并且不会使用上面的安装器元数据路径。Git 和本地目录安装会将受信任的 `SKILL.md` 目录复制到相同的技能根目录，但不会被 `openclaw skills update` 跟踪。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会将密钥注入该代理轮次的**宿主**进程（而不是沙箱）。请将密钥排除在提示词和日志之外。

有关更广泛的威胁模型和检查清单，请参见 [安全](/gateway/security)。

## SKILL.md 格式

`SKILL.md` 至少必须包含：

```markdown
---
name: image-lab
description: 通过基于提供商的图像工作流生成或编辑图像
---
```

OpenClaw 遵循 AgentSkills 规范中的布局/意图。嵌入式代理使用的解析器只支持**单行** frontmatter 键；`metadata` 应为**单行 JSON 对象**。在说明中使用 `{baseDir}` 来引用技能文件夹路径。

### 可选 frontmatter 键

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的 URL。也支持通过 `metadata.openclaw.homepage` 提供。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  当为 `true` 时，技能会作为用户斜杠命令暴露。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  当为 `true` 时，OpenClaw 会将该技能的说明排除在代理的正常提示词之外。该技能仍会被安装，并且在 `user-invocable` 也为 `true` 时，仍可作为斜杠命令显式运行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令会绕过模型并直接分派给工具。
</ParamField>
<ParamField path="command-tool" type="string">
  当设置了 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具分派，会将原始参数字符串转发给工具（不进行核心解析）。工具会以 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 的形式被调用。
</ParamField>

## Gatekeeping (Load-time Filters)

OpenClaw uses `metadata` (single-line JSON) to filter skills at load time:

```markdown
---
name: image-lab
description: Generate or edit images via provider-based image workflows
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
      },
  }
---
```

Fields under `metadata.openclaw`:

<ParamField path="always" type="boolean">
  When `true`, always include the skill (skip all other gatekeeping).
</ParamField>
<ParamField path="emoji" type="string">
  Optional emoji used by the macOS Skills UI.
</ParamField>
<ParamField path="homepage" type="string">
  Optional URL shown as “Website” in the macOS Skills UI.
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  Optional list of platforms. If set, the skill is only eligible on those operating systems.
</ParamField>
<ParamField path="requires.bins" type="string[]">
  Each one must exist in `PATH`.
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  At least one must exist in `PATH`.
</ParamField>
<ParamField path="requires.env" type="string[]">
  Environment variables must exist or be provided in config.
</ParamField>
<ParamField path="requires.config" type="string[]">
  List of `openclaw.json` paths that must be truthy.
</ParamField>
<ParamField path="primaryEnv" type="string">
  Name of the environment variable associated with `skills.entries.<name>.apiKey`.
</ParamField>
<ParamField path="install" type="object[]">
  Optional installer specs for macOS Skills UI use (brew/node/go/uv/download).
</ParamField>

If `metadata.openclaw` is absent, the skill is always eligible (unless
disabled in config, or blocked for bundled skills by `skills.allowBundled`).

<Note>
When `metadata.openclaw` is missing, the legacy `metadata.clawdbot` block is still accepted, so older installed skills continue to retain their dependency gatekeeping and installer hints. New and updated skills should use
`metadata.openclaw`.
</Note>

### Sandbox Notes

- `requires.bins` are checked on the **host** at skill load time.
- If the agent is in a sandbox, the binaries must also exist **inside the container**. Install them via `agents.defaults.sandbox.docker.setupCommand` (or a custom image). `setupCommand` runs once after the container is created. Package installs also require network egress, a writable root filesystem, and root in the sandbox.
- Example: the `summarize` skill (`skills/summarize/SKILL.md`) requires the `summarize` CLI to exist inside the sandbox container in order to run there.

### Installer Specs

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search queries.
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---
```

<AccordionGroup>
  <Accordion title="Installer selection rules">
    - If multiple installers are listed, Gateway chooses a preferred one (brew if available, otherwise node).
    - If all installers are `download`, OpenClaw lists each entry so you can inspect available artifacts.
    - Installer specs may include `os: ["darwin"|"linux"|"win32"]` to filter options by platform.
    - Node installs follow `skills.install.nodeManager` in `openclaw.json` (default: npm; options: npm/pnpm/yarn/bun). This only affects skill installation; Gateway runtime should still use Node—not Bun in WhatsApp/Telegram.
    - Gateway installer selection is preference-driven: when specs mix types, if `skills.install.preferBrew` is enabled and `brew` exists, OpenClaw prefers Homebrew, then `uv`, then the configured node manager, then other fallback options like `go` or `download`.
    - If all install specs are `download`, OpenClaw shows all download options instead of collapsing them into a single preferred installer.

  </Accordion>
  <Accordion title="Per-installer details">
    - **Homebrew installs:** OpenClaw does not auto-install Homebrew or translate
      brew formulas into system package manager commands. In Linux containers
      without `brew`, onboarding hides brew-only dependency installers; use a
      custom image or install the dependency manually before enabling that skill.
    - **Go installs:** if `go` is missing and `brew` is available, the gateway installs Go via Homebrew first and sets `GOBIN` to Homebrew's `bin` when possible.
    - **Download installs:** `url` (required), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (default: auto when archive detected), `stripComponents`, `targetDir` (default: `~/.openclaw/tools/<skillKey>`).

  </Accordion>
</AccordionGroup>

## Configuration Overrides

Packaged and managed skills can be toggled and provided env values under `skills.entries` in `~/.openclaw/openclaw.json`:

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plain string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<ParamField path="enabled" type="boolean">
  `false` disables the skill even if it is packaged or installed.
  Packaged `coding-agent` skills are optionally enabled: before exposing them to the agent, set
  `skills.entries.coding-agent.enabled: true`,
  then ensure at least one of `claude`, `codex`, `opencode`, or `pi` is installed and its respective CLI is authenticated.
</ParamField>
<ParamField path="apiKey" type='string | { source, provider, id }'>
  Convenience configuration for skills that declare `metadata.openclaw.primaryEnv`. Supports plain text or SecretRef.
</ParamField>
<ParamField path="env" type="Record<string, string>">
  Inject only if the variable is not already set in the process.
</ParamField>
<ParamField path="config" type="object">
  Optional container for custom per-skill fields. Put custom keys here.
</ParamField>
<ParamField path="allowBundled" type="string[]">
  Optional allowlist that applies only to **packaged** skills. If set, only packaged skills in the list are eligible (managed/workspace skills are unaffected).
</ParamField>

If a skill name contains a hyphen, quote the key (JSON5 allows quoted keys). By default, config keys match the **skill name** - if a skill defines `metadata.openclaw.skillKey`, use that key under `skills.entries`.

<Note>
For standard image generation/editing inside OpenClaw, use the core
`image_generate` tool together with
`agents.defaults.imageGenerationModel`, instead of packaged skills. The skill examples here are for custom or third-party workflows. For native image analysis, use the `image` tool together with `agents.defaults.imageModel`. If you choose an `openai/*`, `google/*`,
`fal/*`, or other provider-specific image model, also add that provider's
auth/API key.
</Note>

## Environment Injection

When agent runs start, OpenClaw will:

1. Read skill metadata.
2. Apply `skills.entries.<key>.env` and `skills.entries.<key>.apiKey` to `process.env`.
3. Build the system prompt using the **eligible** skills.
4. Restore the original environment after the run ends.

Environment injection is scoped to the agent run only, **not** the global shell
environment.

For packaged `claude-cli` backends, OpenClaw also materializes the same
eligible snapshot as a temporary Claude Code plugin and passes it via
`--plugin-dir`. This lets Claude Code use its native skill resolver while OpenClaw still retains precedence, per-agent allowlists, gatekeeping, and
`skills.entries.*` env/API key injection control. Other CLI backends use only
the prompt directory.

## Snapshotting and Refresh

OpenClaw snapshots eligible skills at session start and reuses that list during subsequent turns in the same session. Changes to skills or config take effect in the next new session.

Skills can refresh mid-session in two cases:

- Skill watching is enabled.
- A new eligible remote node appears.

Think of this as a **hot reload**: the refreshed list is adopted on the next agent turn. If the effective agent skill allowlist for the session changes, OpenClaw refreshes the snapshot so visible skills stay aligned with the current agent.

### Skill Watcher

By default, OpenClaw watches the skills folders and updates the skill snapshot when `SKILL.md` files change. Configure it under `skills.load`:

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

For intentional workspace, project-agent, or extra-directory layouts, use `allowSymlinkTargets` if a skill root contains a symlink, such as
`<workspace>/skills/manager -> ~/Projects/manager/skills`. Managed
`~/.openclaw/skills` and personal `~/.agents/skills` are allowed to follow symlinks from the local skill manager by default, but the target list still re-matches after realpath resolution, so keep the configuration scope as narrow as possible.

### Remote macOS Nodes (Linux Gateway)

If Gateway runs on Linux but is connected to a **macOS node** that allows `system.run` (Exec approvals security is not set to `deny`),
then OpenClaw can treat macOS-only skills as eligible when the required binaries exist on that node.
The agent should execute those skills through the `exec` tool with `host=node`.

This relies on the node reporting command support and probing binaries via
`system.which` or `system.run`.
Offline nodes do **not** make remote-only skills visible. If a connected node stops responding to binary probes,
OpenClaw clears its cached binary matches so the agent no longer sees skills that cannot currently run there.

## Token Impact

When skills are eligible, OpenClaw injects a compact XML list of available skills into the system prompt (via `formatSkillsForPrompt` in `pi-coding-agent`).
The cost is deterministic:

- **Base overhead** (only when ≥1 skill): 195 characters.
- **Per skill**: 97 characters + lengths of XML-escaped `<name>`, `<description>`, and `<location>` values.

Formula (character count):

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML escaping expands `& < > " '` into entities (`&amp;`, `&lt;`, etc.),
which increases length. Token counts vary by model tokenizer. A rough
OpenAI-style estimate is about 4 characters/token, so **97 characters ≈ 24 tokens** per
skill, plus your actual field lengths.

## Managed Skill Lifecycle

OpenClaw ships a base set of skills with the installation package (npm package or OpenClaw.app),
as **packaged skills**. `~/.openclaw/skills` is for local overrides—for example,
pinning or patching a skill without changing the packaged copy. Workspace skills are owned by the user
and override both on name collision.

## Looking for more skills?

Browse [https://clawhub.ai](https://clawhub.ai). Full configuration
schema: [技能配置](/tools/skills-config).

## Related

- [ClawHub](/clawhub) - Public skill registry
- [Creating skills](/tools/creating-skills) - Build custom skills
- [Plugins](/tools/plugin) - Plugin system overview
- [Skill Workshop plugin](/plugins/skill-workshop) - Generate skills from agent work
- [Skills config](/tools/skills-config) - Skills configuration reference
- [Slash commands](/tools/slash-commands) - All available slash commands
