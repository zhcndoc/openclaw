---
summary: "技能：托管技能 vs 工作空间技能，访问规则，以及配置/环境变量连接"
read_when:
  - 添加或修改技能时
  - 更改技能访问或加载规则时
title: "技能"
---

# 技能 (OpenClaw)

OpenClaw 使用与 **[AgentSkills](https://agentskills.io) 兼容** 的技能文件夹来教导代理如何使用工具。每个技能是一个目录，包含带有 YAML 头信息和说明的 `SKILL.md` 文件。OpenClaw 加载 **内置技能** 以及可选的本地覆盖，并在加载时根据环境、配置和二进制的存在情况进行过滤。

## 位置与优先级

技能从 **三个** 位置加载：

1. **内置技能**：随安装包一起提供（npm 包或 OpenClaw.app）
2. **托管/本地技能**：`~/.openclaw/skills`
3. **工作空间技能**：`<workspace>/skills`

如果技能名称冲突，优先级顺序为：

`<workspace>/skills`（最高）→ `~/.openclaw/skills` → 内置技能（最低）

另外，你可以通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 配置额外的技能文件夹（优先级最低）。

## 每个代理专用技能 vs 共享技能

在 **多代理** 设置中，每个代理都有自己的工作空间。这意味着：

- **每个代理专属技能** 存放在该代理的 `<workspace>/skills` 中。
- **共享技能** 存放在 `~/.openclaw/skills`（托管/本地）中，对同一台机器上的 **所有代理** 都可见。
- 共享文件夹也可以通过 `skills.load.extraDirs` 添加（优先级最低），如果你想为多个代理使用通用的技能包。

如果同名技能存在于多个位置，依旧遵循以上优先级规则：工作空间优先，然后是托管/本地，最后是内置。

## 插件 + 技能

插件可以通过在 `openclaw.plugin.json` 中列出相对插件根目录的 `skills` 文件夹来附带自己的技能。插件启用时加载其技能，并遵守普通技能优先级规则。可以通过插件配置项的 `metadata.openclaw.requires.config` 进行访问权限控制。详情见 [插件](/tools/plugin) 用于发现/配置，以及 [工具](/tools) 查看技能所教授的工具表面。

## ClawHub（安装 + 同步）

ClawHub is the public skills registry for OpenClaw. Browse at
[https://clawhub.com](https://clawhub.com). Use native `openclaw skills`
commands to discover/install/update skills, or the separate `clawhub` CLI when
you need publish/sync workflows.
Full guide: [ClawHub](/tools/clawhub).

常用流程：

- Install a skill into your workspace:
  - `openclaw skills install <skill-slug>`
- Update all installed skills:
  - `openclaw skills update --all`
- Sync (scan + publish updates):
  - `clawhub sync --all`

Native `openclaw skills install` installs into the active workspace `skills/`
directory. The separate `clawhub` CLI also installs into `./skills` under your
current working directory (or falls back to the configured OpenClaw workspace).
OpenClaw picks that up as `<workspace>/skills` on the next session.

## 安全提示

- 将第三方技能视为 **不受信任的代码**。启用前务必仔细阅读。
- 对于不受信任的输入和高风险工具，优先使用沙箱运行。详见 [沙箱](/gateway/sandboxing)。
- 工作空间和额外目录的技能发现仅接受其解析后真实路径位于配置根目录内的技能根目录和 `SKILL.md` 文件。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会在该代理运行周期内向 **宿主** 进程注入秘密（非沙箱内）。避免将秘密写入提示或日志。
- 更全面的威胁模型和检查清单，见 [安全](/gateway/security)。

## 格式（兼容 AgentSkills + Pi）

`SKILL.md` 至少应包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
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
description: Generate or edit images via a provider-backed image workflow
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

- 如果列出多个安装器，网关会选择一个 **优先选项**（优先 brew，其次 node）。
- 如果所有安装器均为 `download`，OpenClaw 会列出每个条目以显示可用工件。
- 安装器规格可以包含 `os: ["darwin"|"linux"|"win32"]` 用于按平台筛选选项。
- Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；可选：npm/pnpm/yarn/bun）。
  该配置仅影响 **技能安装**；网关运行时仍应使用 Node（不推荐 Bun 用于 WhatsApp/Telegram）。
- Go 安装：若缺少 `go` 且存在 `brew`，网关先通过 Homebrew 安装 Go，并尽可能将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：参数包括 `url`（必需）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认为检测到存档时自动）、`stripComponents`、`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

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

If you want stock image generation/editing inside OpenClaw itself, use the core
`image_generate` tool with `agents.defaults.imageGenerationModel` instead of a
bundled skill. Skill examples here are for custom or third-party workflows.

For native image analysis, use the `image` tool with `agents.defaults.imageModel`.
For native image generation/editing, use `image_generate` with
`agents.defaults.imageGenerationModel`. If you pick `openai/*`, `google/*`,
`fal/*`, or another provider-specific image model, add that provider's auth/API
key too.

Config keys match the **skill name** by default. If a skill defines
`metadata.openclaw.skillKey`, use that key under `skills.entries`.

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

## 会话快照（性能）

OpenClaw 会在 **会话开始时** 快照符合条件的技能列表，并在同一会话的后续回合重用。技能或配置的更改会在下一个新会话生效。

启用技能观察器或出现新的符合条件的远程节点时，技能列表也可在会话中期刷新（见下文）。相当于 **热重载**：刷新后的列表将在下一回合被使用。

## 远程 macOS 节点（Linux 网关）

如果网关运行在 Linux 上，但连接了一个 **允许 `system.run` 的 macOS 节点**（执行批准安全未设置为 `deny`），OpenClaw 可将仅限 macOS 的技能视为符合条件，只要该节点具备所需二进制。代理应通过 `nodes` 工具（通常是 `nodes.run`）执行这些技能。

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

访问 [https://clawhub.com](https://clawhub.com) 浏览。

---
