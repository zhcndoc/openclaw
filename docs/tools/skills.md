---
summary: "技能：托管技能 vs 工作空间技能，访问规则，以及配置/环境变量连接"
read_when:
  - 添加或修改技能时
  - 更改技能访问或加载规则时
title: "技能"
---

OpenClaw 使用 **与 [AgentSkills](https://agentskills.io) 兼容** 的技能文件夹来教会代理如何使用工具。每个技能都是一个目录，其中包含带有 YAML 头信息和说明的 `SKILL.md`。OpenClaw 会加载 **内置技能包** 以及可选的本地覆盖，并在加载时根据环境、配置和二进制文件是否存在进行过滤。

## 位置与优先级

OpenClaw 从以下来源加载技能：

1. **额外技能文件夹**：通过 `skills.load.extraDirs` 配置
2. **内置技能**：随安装包附带（npm 包或 OpenClaw.app）
3. **托管/本地技能**：`~/.openclaw/skills`
4. **个人代理技能**：`~/.agents/skills`
5. **项目代理技能**：`<workspace>/.agents/skills`
6. **工作空间技能**：`<workspace>/skills`

如果技能名称冲突，优先级顺序为：

`<workspace>/skills` (最高) → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 内置技能 → `skills.load.extraDirs` (最低)

## 每个代理专用技能 vs 共享技能

在 **多代理** 设置中，每个代理都有自己的工作空间。这意味着：

- **每个代理专用技能** 仅存在于该代理的 `<workspace>/skills` 中。
- **项目代理技能** 存在于 `<workspace>/.agents/skills` 中，并在普通工作空间 `skills/` 文件夹之前应用于该工作空间。
- **个人代理技能** 存在于 `~/.agents/skills` 中，并应用于该机器上的所有工作空间。
- **共享技能** 存在于 `~/.openclaw/skills`（托管/本地）中，并对同一机器上的 **所有代理** 可见。
- 如果您希望多个代理使用通用的技能包，也可以通过 `skills.load.extraDirs` 添加 **共享文件夹**（优先级最低）。

如果同一技能名称存在于多个位置，则适用通常的优先级顺序：工作空间优先，然后是项目代理技能，然后是个人代理技能，然后是托管/本地，然后是内置，最后是额外目录。

## 代理技能允许列表

技能 **位置** 和技能 **可见性** 是独立的控制项。

- 位置/优先级决定同名技能的哪个副本胜出。
- 代理允许列表决定代理实际可以使用哪些可见技能。

使用 `agents.defaults.skills` 作为共享基线，然后通过 `agents.list[].skills` 按代理覆盖：

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // 继承 github, weather
      { id: "docs", skills: ["docs-search"] }, // 覆盖默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

规则：

- 默认情况下省略 `agents.defaults.skills` 以表示无限制技能。
- 省略 `agents.list[].skills` 以继承 `agents.defaults.skills`。
- 设置 `agents.list[].skills: []` 表示无技能。
- 非空的 `agents.list[].skills` 列表是该代理的最终集合；它不会与默认值合并。

OpenClaw 在提示构建、技能斜线命令发现、沙箱同步和技能快照中应用有效的代理技能集。

## 插件 + 技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（路径相对于插件根目录）来提供自己的技能。插件技能会在插件启用时加载。这是放置工具特定操作指南的合适位置，这些指南对于工具描述来说太长，但在插件安装后应始终可用；例如，浏览器插件提供了一个用于多步骤浏览器控制的 `browser-automation` 技能。如今，这些目录会合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的内置、托管、代理或工作空间技能会覆盖它们。
您可以通过插件配置项上的 `metadata.openclaw.requires.config` 来控制它们是否可用。有关发现/配置，请参阅 [插件](/tools/plugin)；有关这些技能所教授的工具界面，请参阅 [工具](/tools)。

## Skill Workshop

可选的、实验性的 Skill Workshop 插件可以将代理工作中观察到的可复用流程创建或更新为工作空间技能。从默认情况下禁用，必须通过
`plugins.entries.skill-workshop` 显式启用。

Skill Workshop 只会写入 `<workspace>/skills`，会扫描生成的内容，
支持待批准或自动安全写入，会对不安全提议进行隔离，
并在成功写入后刷新技能快照，以便新技能无需 Gateway 重启即可可用。

当您希望诸如“下次请验证 GIF 署名”之类的修正，或诸如媒体 QA 清单之类的经验流程变成持久的操作指令时，请使用它。建议从待批准开始；仅在经过审查后，在受信任的工作空间中使用自动写入。完整指南：
[Skill Workshop 插件](/plugins/skill-workshop)。

## ClawHub（安装 + 同步）

ClawHub 是 OpenClaw 的公共技能注册表。浏览地址 [https://clawhub.ai](https://clawhub.ai)。使用原生 `openclaw skills` 命令来发现/安装/更新技能，或在需要发布/同步工作流时使用独立的 `clawhub` CLI。
完整指南：[ClawHub](/tools/clawhub)。

常用流程：

- 将技能安装到您的工作空间：
  - `openclaw skills install <skill-slug>`
- 更新所有已安装的技能：
  - `openclaw skills update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

原生 `openclaw skills install` 安装到活动工作空间的 `skills/` 目录中。独立的 `clawhub` CLI 也会安装到当前工作目录下的 `./skills`（或回退到配置的 OpenClaw 工作空间）。OpenClaw 会在下次会话中将其识别为 `<workspace>/skills`。

## 安全提示

- 将第三方技能视为**不可信代码**。启用前请阅读。
- 对于不可信输入和危险工具，优先使用沙箱运行。请参阅 [沙箱](/gateway/sandboxing)。
- 工作空间和额外目录的技能发现仅接受技能根目录和 `SKILL.md` 文件，其解析后的真实路径必须位于配置的根目录内。
- 网关支持的技能依赖安装（`skills.install`、入职引导和技能设置 UI）在执行安装器元数据之前会运行内置的危险代码扫描器。`critical` 发现默认会被阻止，除非调用者显式设置危险覆盖；可疑发现仅发出警告。
- `openclaw skills install <slug>` 不同：它将 ClawHub 技能文件夹下载到工作空间中，不使用上述安装器元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将秘密注入到该代理回合的 **宿主机** 进程（而非沙箱）。请勿将秘密放在提示词和日志中。
- 有关更广泛的威胁模型和检查清单，请参阅 [安全](/gateway/security)。

## 格式（兼容 AgentSkills + Pi）

`SKILL.md` 至少应包含：

```markdown
---
name: image-lab
description: 通过提供商支持的图像工作流生成或编辑图像
---
```

说明：

- 我们遵循 AgentSkills 规范的布局和意图。
- 内嵌代理使用的解析器只支持 **单行** 头信息键。
- `metadata` 应为 **单行 JSON 对象**。
- 在说明中使用 `{baseDir}` 引用技能文件夹路径。
- 可选的头信息键：
  - `homepage` — 在 macOS 技能 UI 中显示为“网站”的 URL（也支持通过 `metadata.openclaw.homepage`）。
  - `user-invocable` — `true|false`（默认：`true`）。为 `true` 时，技能作为用户斜线命令暴露。
  - `disable-model-invocation` — `true|false`（默认：`false`）。为 `true` 时，技能不会出现在模型提示中（仍可由用户调用）。
  - `command-dispatch` — 可选值 `tool`。设置为 `tool` 时，斜线命令绕过模型，直接调度到工具。
  - `command-tool` — 设置为 `command-dispatch: tool` 时调用的工具名。
  - `command-arg-mode` — `raw`（默认）。用于工具调度，将原始参数字符串转发给工具（无核心解析）。

    工具调用参数为：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 访问控制（加载时过滤）

OpenClaw 在加载时根据 `metadata`（单行 JSON）过滤技能：

```markdown
---
name: image-lab
description: 通过提供商支持的图像工作流生成或编辑图像
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

- `always: true` — 始终包含该技能（跳过其他访问规则）。
- `emoji` — macOS 技能 UI 中的可选表情符号。
- `homepage` — macOS 技能 UI 中显示为“网站”的可选 URL。
- `os` — 可选平台列表（`darwin`，`linux`，`win32`）。设置后，技能仅在此操作系统上有效。
- `requires.bins` — 列表；每个二进制必须在 `PATH` 中存在。
- `requires.anyBins` — 列表；至少一个二进制必须在 `PATH` 中存在。
- `requires.env` — 列表；环境变量必须存在 **或** 在配置中提供。
- `requires.config` — `openclaw.json` 中必须为真值的路径列表。
- `primaryEnv` — 关联到 `skills.entries.<name>.apiKey` 的环境变量名。
- `install` — macOS 技能 UI 使用的可选安装器规范数组（brew/node/go/uv/download）。

关于沙箱：

- `requires.bins` 在技能加载时在 **宿主机** 检查。
- 如果代理在沙箱中，二进制必须存在 **容器内**。
  使用 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）安装。
  `setupCommand` 在容器创建后运行一次。
  软件包安装还需要网络访问、可写的根文件系统和容器中的 root 用户。
  例如：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙箱容器中有 `summarize` CLI 才能运行。

安装器示例：

```markdown
---
name: gemini
description: 使用 Gemini CLI 提供编码帮助和谷歌搜索查询。
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

说明：

- 如果列出了多个安装器，网关会选择 **单个** 首选选项（如果有 brew 则选 brew，否则选 node）。
- 如果所有安装器都是 `download`，OpenClaw 会列出每个条目以便您查看可用的构件。
- 安装器规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台过滤选项。
- Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。
  这仅影响 **技能安装**；Gateway 运行时仍应为 Node
  （不建议将 Bun 用于 WhatsApp/Telegram）。
- Gateway 支持的安装器选择是基于偏好的，不仅限于 node：
  当安装规范混合类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 首选 Homebrew，然后是 `uv`，然后是配置的 node 管理器，然后是其他回退选项如 `go` 或 `download`。
- 如果每个安装规范都是 `download`，OpenClaw 会显示所有下载选项，而不是合并为一个首选安装器。
- Go 安装：如果缺少 `go` 且可用 `brew`，网关会先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到 archive 时自动），`stripComponents`，`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

如果没有 `metadata.openclaw`，该技能总是可用的（除非在配置中禁用或通过 `skills.allowBundled` 阻止内置技能）。

## 配置覆盖 (`~/.openclaw/openclaw.json`)

内置/托管技能可以开启/关闭并提供环境变量：

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

注意：若技能名包含连字符，需对键使用引号（JSON5 允许键名带引号）。

如果您想在 OpenClaw 本身中使用标准图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不是内置技能。这里的技能示例适用于自定义或第三方工作流。

对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。对于原生图像生成/编辑，请使用 `image_generate` 配合 `agents.defaults.imageGenerationModel`。如果您选择 `openai/*`、`google/*`、`fal/*` 或其他特定提供商的图像模型，请同时添加该提供商的身份验证/API 密钥。

配置键默认与 **技能名称** 匹配。如果技能定义了 `metadata.openclaw.skillKey`，则在 `skills.entries` 下使用该键。

规则：

- `enabled: false` 禁用技能，即使其为内置/已安装。
- `env`：仅在进程中未设置该变量时注入。
- `apiKey`：简化设置，针对声明了 `metadata.openclaw.primaryEnv` 的技能。支持明文字符串或 SecretRef 对象（`{ source, provider, id }`）。
- `config`：自定义每技能字段的可选容器；所有自定义键必须放这里。
- `allowBundled`：仅对 **内置** 技能生效的允许列表。设置后，只有列表内内置技能有效（不影响托管/工作空间技能）。

## 环境注入（每次代理运行）

当代理运行开始时，OpenClaw 会：

1. 读取技能元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 注入到 `process.env`。
3. 使用 **符合条件的** 技能构建系统提示。
4. 运行结束后恢复原始环境。

此过程 **限于该代理运行周期**，非全局 shell 环境。

对于捆绑的 `claude-cli` 后端，OpenClaw 还会将相同的合格快照实例化为临时 Claude Code 插件，并通过 `--plugin-dir` 传递。Claude Code 随后可以使用其原生技能解析器，而 OpenClaw 仍然拥有优先级、每代理允许列表、门控和 `skills.entries.*` 环境/API 密钥注入。其他 CLI 后端仅使用提示目录。

## 会话快照（性能）

OpenClaw 会在 **会话开始时** 快照符合条件的技能列表，并在同一会话的后续回合重用。技能或配置的更改会在下一个新会话生效。

启用技能观察器或出现新的符合条件的远程节点时，技能列表也可在会话中期刷新（见下文）。相当于 **热重载**：刷新后的列表将在下一回合被使用。

如果该会话的有效代理技能允许列表发生变化，OpenClaw 会刷新快照，以便可见技能与当前代理保持一致。

## 远程 macOS 节点（Linux 网关）

如果网关运行在 Linux 上，但连接了 **macOS 节点** 且 **允许 `system.run`**（执行批准安全设置未设为 `deny`），当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。代理应通过 `exec` 工具使用 `host=node` 来执行这些技能。

此功能依赖节点报告其命令支持并通过 `system.run` 探测二进制。如果 macOS 节点断线，技能仍显示，但调用可能失败，直至节点重新连接。

## 技能观察器（自动刷新）

默认情况下，OpenClaw 监听技能文件夹，当 `SKILL.md` 文件变化时更新技能快照。该行为可通过 `skills.load` 配置：

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

## 令牌影响（技能列表）

符合条件时，OpenClaw 将编入一个紧凑的 XML 技能列表注入系统提示（通过 `pi-coding-agent` 的 `formatSkillsForPrompt`）。其开销是确定性的：

- **基础开销（当 ≥1 个技能时）：**195 字符
- **每个技能：**97 字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 字段长度

计算公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

说明：

- XML 转义将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），增加长度。
- 不同模型分词器令牌计数不同。OpenAI 估算约 4 字符/令牌，因此 **97 字符 ≈ 24 令牌**，再加上实际字段长度。

## 托管技能生命周期

OpenClaw 随安装包（npm 包或 OpenClaw.app）附带一套基础内置技能。`~/.openclaw/skills` 用于本地覆盖（例如，在不更改内置副本的情况下固定或修补技能）。工作空间技能属于用户所有，且与同名内置和托管技能相比优先级最高。

## 配置参考

完整配置架构见 [技能配置](/tools/skills-config)。

## 寻找更多技能？

浏览 [https://clawhub.ai](https://clawhub.ai)。

---

## 相关内容

- [创建技能](/tools/creating-skills) — 构建自定义技能
- [技能配置](/tools/skills-config) — 技能配置参考
- [斜线命令](/tools/slash-commands) — 所有可用的斜线命令
- [插件](/tools/plugin) — 插件系统概览
