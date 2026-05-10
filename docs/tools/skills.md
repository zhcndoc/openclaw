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

Codex CLI 的原生 `$CODEX_HOME/skills` 目录不属于这些 OpenClaw
技能根目录之一。在 Codex harness 模式下，本地 app-server 启动会使用按代理隔离的
Codex home，因此个人 Codex CLI 技能不会被隐式加载。
使用 `openclaw migrate codex --dry-run` 可清点这些技能，并使用
`openclaw migrate codex` 在复制到当前 OpenClaw 代理工作区之前，通过交互式复选框提示
选择技能目录。对于非交互运行，请对要复制的确切技能重复使用
`--skill <name>`。

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
  <Accordion title="Allowlist rules">
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

| 操作                             | 命令                                |
| -------------------------------- | ----------------------------------- |
| 将技能安装到工作区               | `openclaw skills install <skill-slug>` |
| 更新所有已安装技能               | `openclaw skills update --all`         |
| 同步（扫描 + 发布更新）          | `clawhub sync --all`                   |

原生的 `openclaw skills install` 会安装到当前工作区的
`skills/` 目录。单独的 `clawhub` CLI 也会安装到你当前工作目录下的
`./skills`（或者回退到已配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其识别为
`<workspace>/skills`。
已配置的技能根目录也支持一个分组层级，例如
`skills/<group>/<skill>/SKILL.md`，因此相关的第三方技能可以
保存在共享文件夹下，而无需进行广泛的递归扫描。

ClawHub 技能页面会在安装前展示最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的扫描详情页。
`openclaw skills install <slug>` 仍然只是安装路径；发布者可通过 ClawHub 仪表板或
`clawhub skill rescan <slug>` 处理误报。

## 安全

<Warning>
将第三方技能视为**不受信任的代码**。在启用之前先阅读它们。
对于不受信任的输入和高风险工具，优先使用沙箱运行。有关代理端控制，请参见
[沙箱化](/gateway/sandboxing)。
</Warning>

- 工作区和额外目录的技能发现只接受其解析后的真实路径仍位于已配置根目录内的技能根和 `SKILL.md` 文件。
- Gateway 支持的技能依赖安装（`skills.install`、入门引导以及 Skills 设置 UI）会在执行安装器元数据之前运行内置的危险代码扫描器。默认会阻止 `critical` 级别的结果，除非调用方显式设置了危险覆盖；`suspicious` 结果仍然只会警告。
- `openclaw skills install <slug>` 不同——它会将一个 ClawHub 技能文件夹下载到工作区中，并且不使用上面的安装器元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会在该代理轮次中将机密注入到**主机**进程中（而不是沙箱中）。请避免在提示词和日志中泄露机密。

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

## 门控（加载时过滤器）

OpenClaw 使用 `metadata`（单行 JSON）在加载时过滤技能：

```markdown
---
name: image-lab
description: 通过基于提供商的图像工作流生成或编辑图像
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

`metadata.openclaw` 下的字段：

<ParamField path="always" type="boolean">
  当为 `true` 时，始终包含该技能（跳过其他门控）。
</ParamField>
<ParamField path="emoji" type="string">
  macOS Skills UI 使用的可选表情符号。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的可选 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  可选的平台列表。如果设置，则该技能仅在这些操作系统上符合条件。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每个都必须存在于 `PATH` 中。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少有一个必须存在于 `PATH` 中。
</ParamField>
<ParamField path="requires.env" type="string[]">
  环境变量必须存在或已在配置中提供。
</ParamField>
<ParamField path="requires.config" type="string[]">
  必须为 truthy 的 `openclaw.json` 路径列表。
</ParamField>
<ParamField path="primaryEnv" type="string">
  与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
</ParamField>
<ParamField path="install" type="object[]">
  供 macOS Skills UI 使用的可选安装器规格（brew/node/go/uv/download）。
</ParamField>

如果不存在 `metadata.openclaw`，则该技能始终符合条件（除非
在配置中被禁用，或对内置技能被 `skills.allowBundled` 阻止）。

<Note>
当 `metadata.openclaw` 缺失时，仍接受旧的 `metadata.clawdbot` 区块，因此较旧的已安装技能仍保留其依赖门控和安装器提示。新的和更新的技能应使用
`metadata.openclaw`。
</Note>

### 沙箱注意事项

- `requires.bins` 会在技能加载时在**主机**上检查。
- 如果代理处于沙箱中，二进制文件也必须存在于**容器内**。通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）安装它。`setupCommand` 会在容器创建后执行一次。包安装还需要网络外联、可写的根文件系统以及沙箱中的 root 用户。
- 示例：`summarize` 技能（`skills/summarize/SKILL.md`）需要沙箱容器中存在 `summarize` CLI 才能在那里运行。

### 安装器规格

```markdown
---
name: gemini
description: 使用 Gemini CLI 进行编码辅助和 Google 搜索查询。
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
              "label": "安装 Gemini CLI（brew）",
            },
          ],
      },
  }
---
```

<AccordionGroup>
  <Accordion title="Installer selection rules">
    - 如果列出了多个安装器，Gateway 会选择一个首选项（可用时优先 brew，否则是 node）。
    - 如果所有安装器都是 `download`，OpenClaw 会列出每个条目，以便你查看可用工件。
    - 安装器规格可以包含 `os: ["darwin"|"linux"|"win32"]`，用于按平台过滤选项。
    - Node 安装会遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；可选：npm/pnpm/yarn/bun）。这只会影响技能安装；Gateway 运行时仍应使用 Node——不建议在 WhatsApp/Telegram 中使用 Bun。
    - Gateway 支持的安装器选择是基于偏好驱动的：当安装规格混合了不同类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 会优先选择 Homebrew，然后是 `uv`，然后是已配置的 node manager，再到其他回退选项如 `go` 或 `download`。
    - 如果所有安装规格都是 `download`，OpenClaw 会展示所有下载选项，而不是折叠为一个首选安装器。

  </Accordion>
  <Accordion title="每个安装器的详细信息">
    - **Go 安装：** 如果 `go` 缺失且 `brew` 可用，Gateway 会先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **下载安装：** `url`（必需）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认：检测到归档时自动）、`stripComponents`、`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

  </Accordion>
</AccordionGroup>

## 配置覆盖

打包并管理的技能可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切换并提供 env 值：

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或明文字符串
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
  `false` 会禁用该技能，即使它已打包或已安装。
  打包的 `coding-agent` 技能是可选启用的：在向代理暴露之前，先设置
  `skills.entries.coding-agent.enabled: true`，
  然后确保 `claude`、`codex`、`opencode` 或 `pi` 中至少有一个已安装，并且其各自的 CLI 已完成认证。
</ParamField>
<ParamField path="apiKey" type='string | { source, provider, id }'>
  为声明了 `metadata.openclaw.primaryEnv` 的技能提供便捷配置。支持明文或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  仅在该变量尚未在进程中设置时注入。
</ParamField>
<ParamField path="config" type="object">
  用于每个技能的自定义字段的可选容器。自定义键必须放在这里。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  仅适用于 **打包** 技能的可选允许列表。如果设置，则只有列表中的打包技能才有资格（已管理/工作区技能不受影响）。
</ParamField>

如果技能名称包含连字符，请将键加上引号（JSON5 允许使用带引号的
键）。默认情况下，配置键与 **技能名称** 匹配 - 如果某个技能
定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

<Note>
在 OpenClaw 内部进行标准图片生成/编辑时，请使用核心
`image_generate` 工具，并配合 `agents.defaults.imageGenerationModel`，
而不是使用打包技能。这里的技能示例是用于自定义或第三方
工作流。进行原生图像分析时，请使用 `image` 工具并配合
`agents.defaults.imageModel`。如果你选择 `openai/*`、`google/*`、
`fal/*` 或其他特定提供商的图像模型，也要一并添加该提供商的
认证/API key。
</Note>

## 环境注入

当代理运行开始时，OpenClaw 会：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用到 `process.env`。
3. 使用 **符合条件的** 技能构建系统提示词。
4. 在运行结束后恢复原始环境。

环境注入的作用域只限于代理运行，**不是**全局 shell
环境。

对于打包的 `claude-cli` 后端，OpenClaw 还会把同样的
符合条件的快照生成为一个临时的 Claude Code 插件，并通过
`--plugin-dir` 传递给它。这样 Claude Code 就可以使用其原生的技能解析器，而 OpenClaw 仍然保有优先级、按代理的允许列表、门控，以及
`skills.entries.*` 的 env/API key 注入控制。其他 CLI 后端只使用
提示词目录。

## 快照与刷新

OpenClaw 会在会话开始时对符合条件的技能进行快照，
并在同一会话的后续轮次中复用该列表。对技能或配置的更改会在下一次新会话时生效。

技能可以在会话中途刷新的两种情况：

- 启用了技能监视器。
- 出现了一个新的符合条件的远程节点。

可以把这理解为一次 **热重载**：刷新后的列表会在
下一次代理轮次中被采用。如果该会话的有效代理技能允许列表发生变化，OpenClaw 会刷新快照，以便可见技能与当前代理保持一致。

### 技能监视器

默认情况下，OpenClaw 会监视技能文件夹，并在 `SKILL.md` 文件发生更改时更新技能快照。在 `skills.load` 下进行配置：

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

对于有意采用的兄弟仓库布局，其中一个内置技能根目录包含符号链接，请使用 `allowSymlinkTargets`，例如
`~/.agents/skills/manager -> ~/Projects/manager/skills`。目标列表
会在 realpath 解析后进行匹配，并且应保持范围尽量狭窄。

### Remote macOS nodes (Linux gateway)

如果 Gateway 运行在 Linux 上，但连接了一个允许 `system.run` 的 **macOS 节点**（Exec approvals 安全设置未设为 `deny`），
那么当所需二进制文件在该节点上存在时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。
代理应通过带有 `host=node` 的 `exec` 工具来执行这些技能。

这依赖于节点报告其命令支持情况，并通过 `system.which` 或 `system.run` 进行二进制探测。
离线节点**不会**使远程专属技能可见。如果某个已连接节点停止响应二进制探测，
OpenClaw 会清除其缓存的二进制匹配结果，这样代理就不会再看到当前无法在那里运行的技能。

## Token 影响

当技能符合条件时，OpenClaw 会将一个紧凑的可用技能 XML 列表注入系统提示词（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。
其成本是确定性的：

- **基础开销**（仅在 ≥1 个技能时）：195 个字符。
- **每个技能**：97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符数）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义会将 `& < > " '` 展开为实体（`&amp;`、`&lt;` 等），
从而增加长度。Token 数会因模型分词器而异。一个粗略的
OpenAI 风格估算是约 4 个字符/token，因此 **97 个字符 ≈ 24 个 token** 每个
技能，再加上你实际字段长度。

## 已管理技能生命周期

OpenClaw 随安装包（npm 包或 OpenClaw.app）提供一组基础技能，
作为 **打包技能**。`~/.openclaw/skills` 用于本地覆盖——例如，
在不更改打包副本的情况下固定或修补某个技能。工作区技能归用户所有，
并且在名称冲突时会覆盖两者。

## 想找更多技能？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置
schema：[技能配置](/tools/skills-config)。

## 相关内容

- [ClawHub](/clawhub) - 公共技能注册表
- [Creating skills](/tools/creating-skills) - 构建自定义技能
- [Plugins](/tools/plugin) - 插件系统概览
- [Skill Workshop plugin](/plugins/skill-workshop) - 从代理工作中生成技能
- [Skills config](/tools/skills-config) - 技能配置参考
- [Slash commands](/tools/slash-commands) - 所有可用的斜杠命令
