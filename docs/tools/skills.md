---
title: "技能"
sidebarTitle: "技能"
summary: "技能教会你的代理如何使用工具。了解它们如何加载、优先级如何工作，以及如何配置门控、允许列表和环境注入。"
read_when:
  - 添加或修改技能
  - 更改技能门控、允许列表或加载规则
  - 理解技能优先级和快照行为
---

技能是 Markdown 指令文件，用于教会代理如何以及何时使用
工具。每个技能都位于一个目录中，该目录包含一个带有 YAML
frontmatter 和 Markdown 正文的 `SKILL.md` 文件。OpenClaw 会加载捆绑技能以及任何本地
覆盖，并根据环境、配置和
二进制文件是否存在在加载时进行过滤。

<CardGroup cols={2}>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    从零开始构建并测试一个自定义技能。
  </Card>
  <Card title="技能工作坊" href="/tools/skill-workshop" icon="flask">
    审阅并批准代理起草的技能提案。
  </Card>
  <Card title="技能配置" href="/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置模式和代理允许列表。
  </Card>
  <Card title="ClawHub" href="/clawhub" icon="cloud">
    浏览并安装社区技能。
  </Card>
</CardGroup>

## 加载顺序

OpenClaw 从以下来源加载，**优先级从高到低**。当同名
技能出现在多个位置时，优先级更高的来源获胜。

| 优先级    | 来源                   | 路径                                    |
| ----------- | ---------------------- | --------------------------------------- |
| 1 — 最高 | 工作区技能             | `<workspace>/skills`                    |
| 2           | 项目代理技能           | `<workspace>/.agents/skills`            |
| 3           | 个人代理技能           | `~/.agents/skills`                      |
| 4           | 托管 / 本地技能        | `~/.openclaw/skills`                    |
| 5           | 捆绑技能               | 随安装包一起提供                        |
| 6 — 最低   | 额外目录               | `skills.load.extraDirs` + 插件技能       |

技能根目录支持分组布局。只要在已配置的根目录下任意位置出现 `SKILL.md`，OpenClaw 就会发现该技能（最多向下 6 层）：

```text
<workspace>/skills/research/SKILL.md          ✓ 发现为 "research"
<workspace>/skills/personal/research/SKILL.md ✓ 也发现为 "research"
```

文件夹路径仅用于组织。技能的名称和斜杠命令来自 `name` frontmatter 字段（如果缺少 `name`，则使用目录名）。代理允许列表（见下文）也会匹配这个 `name`。

<Note>
  Codex CLI 的原生 `$CODEX_HOME/skills` 目录**不是** OpenClaw 的
  技能根目录。请使用 `openclaw migrate plan codex` 清点这些技能，然后用
  `openclaw migrate codex` 将它们复制到你的 OpenClaw 工作区。
</Note>

## 节点托管技能

已连接的无头节点可以发布其活动 OpenClaw
技能目录中安装的技能（默认位于 `~/.openclaw/skills`；适用配置文件环境覆盖）。
当节点连接时，这些技能会出现在正常的代理技能列表中，
断开连接时则会消失。发生名称冲突时，本地或 Gateway 技能会保留其名称；
节点技能会获得一个确定性的、以节点为前缀的名称。
节点托管 v1 要求目录名称与该技能的 `name`
frontmatter 字段匹配。

技能条目包含节点定位器。其文件、相对引用和
二进制文件都位于节点上，因此请使用 `exec host=node node=<node-id>` 来加载和执行它。
更改其技能文件后，请重启节点主机。有关配对和关闭开关，请参见 [节点](/nodes#node-hosted-skills)。

## 按代理与共享技能

在多代理设置中，每个代理都有自己的工作区。请使用与你期望可见性匹配的路径：

| 范围           | 路径                         | 可见对象                   |
| -------------- | ---------------------------- | --------------------------- |
| 每代理         | `<workspace>/skills`         | 仅该代理                   |
| 项目代理       | `<workspace>/.agents/skills` | 仅该工作区的代理           |
| 个人代理       | `~/.agents/skills`           | 此机器上的所有代理         |
| 共享托管       | `~/.openclaw/skills`         | 此机器上的所有代理         |
| 额外目录       | `skills.load.extraDirs`      | 此机器上的所有代理         |

## 代理允许列表

技能的**位置**（优先级）和技能的**可见性**（哪个代理可以使用它）是两个独立的控制项。使用允许列表来限制某个代理能看到哪些技能，无论它们从哪里加载。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // 共享基线
    },
    list: [
      { id: "writer" }, // 继承 github, weather
      { id: "docs", skills: ["docs-search"] }, // 完全替换 defaults
      { id: "locked-down", skills: [] }, // 没有技能
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="允许列表规则">
    - 省略 `agents.defaults.skills`，则默认情况下所有技能都不受限制。
    - 省略 `agents.list[].skills`，则继承 `agents.defaults.skills`。
    - 将 `agents.list[].skills: []` 设置为不向该代理暴露任何技能。
    - 非空的 `agents.list[].skills` 列表是**最终**集合——它不会与默认值合并。
    - 生效的允许列表适用于提示词构建、斜杠菜单命令发现、沙盒同步和技能快照。
    - 这不是主机 shell 的授权边界。如果同一代理可以使用 `exec`，请通过沙盒、OS 用户隔离、exec 拒绝/允许列表以及按资源的凭据单独限制该 shell。
  </Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录来提供自己的技能（路径相对于插件根目录）。当插件启用时，会加载插件技能——例如，浏览器插件提供了一个用于多步骤浏览器控制的 `browser-automation` 技能。

插件技能目录的合并优先级与 `skills.load.extraDirs` 处于相同的较低优先级层级，因此同名的内置、托管、代理或工作区技能会覆盖它们。可以通过其 frontmatter 中的 `metadata.openclaw.requires` 来控制插件技能自身的适用性，方式与其他技能相同。

有关完整插件系统，请参见 [插件](/tools/plugin) 和 [工具](/tools)。

## 技能工作坊

[技能工作坊](/tools/skill-workshop) 是代理与你当前技能文件之间的一个提案队列。当代理发现可复用的工作时，它会起草一个提案，而不是直接写入 `SKILL.md`。你需要在任何内容变更之前进行审阅和批准。

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

有关完整生命周期、CLI
参考和配置，请参见 [技能工作坊](/tools/skill-workshop)。

## 从 ClawHub 安装

[ClawHub](https://clawhub.ai) 是公开的技能注册中心。使用
`openclaw skills` 命令进行安装和更新，或使用 `clawhub` CLI 进行
发布和同步。

| 操作                               | 命令                                                |
| ---------------------------------- | ---------------------------------------------- |
| 将技能安装到工作区                 | `openclaw skills install @owner/<slug>`                |
| 从 Git 仓库安装                   | `openclaw skills install git:owner/repo@ref`           |
| 安装本地技能目录                 | `openclaw skills install ./path/to/skill --as my-tool` |
| 为所有本地代理安装               | `openclaw skills install @owner/<slug> --global`       |
| 更新所有工作区技能               | `openclaw skills update --all`                         |
| 更新共享托管技能                 | `openclaw skills update @owner/<slug> --global`        |
| 更新所有共享托管技能             | `openclaw skills update --all --global`                |
| 验证技能的信任封装               | `openclaw skills verify @owner/<slug>`                 |
| 打印生成的 Skill Card          | `openclaw skills verify @owner/<slug> --card`          |
| 通过 ClawHub CLI 发布 / 同步      | `clawhub sync --all`                                   |

<AccordionGroup>
  <Accordion title="安装详情">
    `openclaw skills install` 默认将技能安装到当前工作区的 `skills/`
    目录。添加 `--global` 可安装到共享的
    `~/.openclaw/skills` 目录，除非代理允许列表将其限制，否则所有本地代理都可见。

    Git 和本地安装要求源根目录下存在 `SKILL.md`。slug 首先来自
    `SKILL.md` frontmatter 中有效的 `name`，然后回退到
    目录或仓库名称。使用 `--as <slug>` 可覆盖。
    `openclaw skills update` 仅跟踪 ClawHub 安装——要刷新 Git 或
    本地来源，需要重新安装。

  </Accordion>
  <Accordion title="验证和安全扫描">
    `openclaw skills verify @owner/<slug>` 会向 ClawHub 请求该技能的
    `clawhub.skill.verify.v1` 信任封装。已安装的 ClawHub 技能会根据
    `.clawhub/origin.json` 中记录的版本和注册表进行验证。
    对于已存在的已安装技能或无歧义技能，裸 slug 仍然可接受，但
    带所有者限定的引用可避免发布者歧义。

    ClawHub 技能页面会在安装前展示最新的安全扫描状态，并提供
    VirusTotal、ClawScan 和静态分析的详细页面。当 ClawHub 将验证标记为失败时，
    该命令会以非零状态退出。发布者可通过 ClawHub 仪表板或
    `clawhub skill rescan @owner/<slug>` 处理误报。

  </Accordion>
  <Accordion title="私有归档安装">
    需要非 ClawHub 分发的网关客户端可以使用 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit`
    分段上传 zip 技能归档，然后使用 `skills.install({ source: "upload", ... })` 安装。此路径
    默认关闭，并且需要在 `openclaw.json` 中设置 `skills.install.allowUploadedArchives: true`。正常的 ClawHub 安装不需要该设置。
  </Accordion>
</AccordionGroup>

## 安全

<Warning>
  将第三方技能视为**不受信任的代码**。在启用前先阅读它们。
  对不受信任的输入和高风险工具优先使用沙箱运行。有关代理侧控制，请参见
  [沙箱化](/gateway/sandboxing)。
</Warning>

<AccordionGroup>
  <Accordion title="路径包含性">
    Workspace、project-agent 和 extra-dir 的技能发现仅接受其解析后的 realpath 仍位于已配置根目录内的技能根目录，除非
    `skills.load.allowSymlinkTargets` 明确信任某个目标根目录。
    只有在启用 `skills.workshop.allowSymlinkTargetWrites` 时，Skill Workshop 才会通过这些受信任的目标进行写入。
    托管的 `~/.openclaw/skills` 和个人的 `~/.agents/skills` 可以包含带有符号链接的技能文件夹，但每个 `SKILL.md` 的 realpath 仍必须保持在其解析后的技能目录内。
  </Accordion>
  <Accordion title="操作者安装策略">
    配置 `security.installPolicy` 可在技能安装继续之前运行一个受信任的本地策略命令。该策略会接收元数据和暂存的源路径，适用于 ClawHub、上传、Git、本地、更新和
    依赖安装器路径，并且在命令无法返回有效决策时会默认失败关闭。
  </Accordion>
  <Accordion title="秘密注入范围">
    `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会将密钥注入到该代理轮次的**宿主**进程中——不会注入到沙箱中。请将密钥排除在提示词和日志之外。
  </Accordion>
</AccordionGroup>

有关更广泛的威胁模型和安全检查清单，请参见
[安全](/gateway/security)。

## SKILL.md 格式

每个 skill 的 frontmatter 至少需要 `name` 和 `description`：

```markdown
---
name: image-lab
description: 通过基于提供商的图像工作流生成或编辑图像
---

当用户请求生成图像时，使用 `image_generate` 工具...
```

<Note>
  OpenClaw 遵循 [AgentSkills](https://agentskills.io) 规范。Frontmatter
  会先按 YAML 解析；如果失败，则回退到仅单行解析器。嵌套的 `metadata`
  块（包括多行 YAML 映射）会被展平为 JSON 字符串，并重新按 JSON5 解析，因此
  在 [Gating](#gating) 下展示的块形式可正常工作。请在正文中使用 `{baseDir}`
  来引用 skill 文件夹路径。
</Note>

### 可选 frontmatter 键

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的 URL。也支持通过
  `metadata.openclaw.homepage` 配置。
</ParamField>

<ParamField path="user-invocable" type="boolean" default="true">
  当为 `true` 时，该 skill 会作为用户可调用的斜杠命令暴露出来。
</ParamField>

<ParamField path="disable-model-invocation" type="boolean" default="false">
  当为 `true` 时，OpenClaw 会将该 skill 的说明排除在 agent 的常规提示词之外。
  该 skill 仍然可以作为斜杠命令使用，只要 `user-invocable` 也为 `true`。
</ParamField>

<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令会绕过模型，直接分发到已注册的工具。
</ParamField>

<ParamField path="command-tool" type="string">
  当设置了 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>

<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具分发，会将原始参数字符串原样传递给工具，不进行核心解析。工具接收
  `{ command: "<原始参数>", commandName: "<斜杠命令>", skillName: "<skill 名称>" }`。
</ParamField>

## 门控

OpenClaw 在加载时使用 `metadata.openclaw`（嵌入在 frontmatter 中的 JSON5 对象，参见上面的解析说明）来过滤技能。没有 `metadata.openclaw` 块的技能默认始终符合条件，除非被显式禁用。

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

<ParamField path="always" type="boolean">
  当为 `true` 时，始终包含该技能，并跳过所有其他门控。
</ParamField>

<ParamField path="emoji" type="string">
  在 macOS Skills UI 中显示的可选 emoji。
</ParamField>

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的可选 URL。
</ParamField>

<ParamField path="os" type='("darwin" | "linux" | "win32")[]'>
  平台过滤器。设置后，该技能仅在所列 OS 上符合条件。
</ParamField>

<ParamField path="requires.bins" type="string[]">
  每个二进制文件都必须存在于 `PATH` 中。
</ParamField>

<ParamField path="requires.anyBins" type="string[]">
  至少有一个二进制文件必须存在于 `PATH` 中。
</ParamField>

<ParamField path="requires.env" type="string[]">
  每个环境变量都必须存在于进程中，或通过配置提供。
</ParamField>

<ParamField path="requires.config" type="string[]">
  每个 `openclaw.json` 路径都必须为真值。
</ParamField>

<ParamField path="primaryEnv" type="string">
  与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
</ParamField>

<ParamField path="install" type="object[]">
  macOS Skills UI 使用的可选安装器规格（brew / node / go / uv / download）。
</ParamField>

<Note>
  当 `metadata.openclaw` 不存在时，仍然接受旧版 `metadata.clawdbot` 块，因此较早安装的技能仍可保留它们的依赖门控和安装提示。新技能应使用 `metadata.openclaw`。
</Note>

### 安装器规格

安装器规格告诉 macOS Skills UI 如何安装依赖：

```markdown
---
name: gemini
description: 使用 Gemini CLI 提供编码辅助和 Google 搜索查询。
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
  <Accordion title="安装器选择规则">
    - 当列出多个安装器时，gateway 会选择一个首选项（可用时优先 brew，否则 node）。
    - 如果所有安装器都是 `download`，OpenClaw 会列出每个条目，以便你查看所有可用制品。
    - 规格可以包含 `os: ["darwin"|"linux"|"win32"]` 来按平台过滤。
    - Node 安装会遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；可选：npm / pnpm / yarn / bun）。这只影响技能安装；Gateway 运行时仍应使用 Node。
    - Gateway 安装器优先级：Homebrew → uv → 已配置的 node manager → go → download。
  </Accordion>
  <Accordion title="每个安装器的详细信息">
    - **Homebrew:** OpenClaw 不会自动安装 Homebrew，也不会将 brew
      formula 转换为系统包命令。在没有 `brew` 的 Linux 容器中，只显示非 brew 专用的安装器；请使用自定义镜像或手动安装依赖。
    - **Go:** OpenClaw 进行自动技能安装时要求 Go 1.21 或更高版本。
      如果缺少 `go` 且 Homebrew 可用，OpenClaw 会先通过 Homebrew 安装 Go；在没有 Homebrew 的 Linux 上，如果刷新后的 `golang-go` 候选版本满足最低版本要求，也可以改用 `apt-get` 以 root 或通过免密 `sudo` 来安装。依赖项实际执行的 `go install` 总是目标为专用的、由 OpenClaw 管理的 bin 目录（全新安装时为 Homebrew 的 `bin`，否则为 `~/.local/bin`），而不是你配置的 `GOBIN` —— 你自己的 `GOBIN`、`GOPATH` 和 `GOTOOLCHAIN`
      环境变量会被读取，但绝不会被覆盖。
    - **Download:** `url`（必填）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、
      `extract`（默认：检测到 archive 时自动）、`stripComponents`、
      `targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。
  </Accordion>
  <Accordion title="沙箱说明">
    `requires.bins` 会在技能加载时于**主机**上检查。如果 agent 在沙箱中运行，该二进制文件也必须存在于**容器内**。请通过 `agents.defaults.sandbox.docker.setupCommand` 或自定义镜像安装它。`setupCommand` 会在容器创建后运行一次，并且需要沙箱具备网络外连、可写的根文件系统以及 root 用户。
  </Accordion>
</AccordionGroup>

## 配置覆盖

在 `~/.openclaw/openclaw.json` 的 `skills.entries` 下切换并配置内置或已管理的技能：

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
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
  `false` 会禁用该技能，即使它是内置或已安装的。`coding-agent` 内置技能默认不启用——需要设置 `skills.entries.coding-agent.enabled: true`，并确保已安装且完成认证的 `claude`、`codex`、`opencode` 或其他受支持的 CLI 之一。
</ParamField>

<ParamField path="apiKey" type='string | { source, provider, id }'>
  适用于声明了 `metadata.openclaw.primaryEnv` 的技能的便捷字段。支持明文字符串或 SecretRef 对象。
</ParamField>

<ParamField path="env" type="Record<string, string>">
  为 agent 运行注入的环境变量。仅在该变量尚未在进程中设置时才会注入。
</ParamField>

<ParamField path="config" type="object">
  用于自定义每个 skill 配置字段的可选对象。
</ParamField>

<ParamField path="allowBundled" type="string[]">
  仅适用于**内置** skills 的可选允许列表。设置后，只有列表中的内置 skills 才符合条件。已管理和工作区 skills 不受影响。
</ParamField>

<Note>
  默认情况下，配置键与**技能名称**匹配。如果某个技能定义了
  `metadata.openclaw.skillKey`，则请改为在 `skills.entries` 下使用该键。
  带连字符的名称需要加引号：JSON5 允许带引号的键。
</Note>

## 环境注入

当 agent 运行开始时，OpenClaw 会：

<Steps>
  <Step title="读取 skill 元数据">
    OpenClaw 会解析 agent 的有效 skill 列表，应用门控规则、允许列表和配置覆盖。
  </Step>
  <Step title="注入环境变量和 API 密钥">
    `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 会在运行期间应用到
    `process.env`。
  </Step>
  <Step title="构建系统提示词">
    符合条件的 skills 会被编译成一个紧凑的 XML 块，并注入到系统提示词中。
  </Step>
  <Step title="恢复环境">
    运行结束后，原始环境会被恢复。
  </Step>
</Steps>

<Warning>
  环境注入仅作用于**主机**上的 agent 运行，而不作用于沙箱。在沙箱内，`env` 和 `apiKey` 不会生效。有关如何将密钥传递到沙箱运行，请参阅
  [Skills 配置](/tools/skills-config#sandboxed-skills-and-env-vars)。
</Warning>

对于内置的 `claude-cli` 后端，OpenClaw 还会将同一份符合条件的 skill 快照作为临时 Claude Code 插件落盘，并通过 `--plugin-dir` 传递。其他 CLI 后端只使用提示词目录。

## 快照与刷新

OpenClaw 会在会话开始时对符合条件的 skills 进行快照，并在该会话后续的所有轮次中复用这份列表。对 skills 或配置的更改会在下一次新会话中生效。

以下两种情况下，skills 会在会话中刷新：

- skills watcher 检测到 `SKILL.md` 变更。
- 新的符合条件的远程节点连接上来。

刷新后的列表会在下一次 agent 轮次中生效。如果有效的 agent 允许列表发生变化，OpenClaw 会刷新快照以保持可见 skills 的一致性。

<AccordionGroup>
  <Accordion title="Skills watcher">
    默认情况下，OpenClaw 会监视 skill 文件夹，并在 `SKILL.md` 文件变更时更新快照。在 `skills.load` 下配置：

    ```json5
    {
      skills: {
        load: {
          extraDirs: ["~/Projects/agent-scripts/skills"],
          allowSymlinkTargets: ["~/Projects/manager/skills"],
          watch: true, // 默认
          watchDebounceMs: 250, // 默认
        },
      },
    }
    ```

    对于有意使用符号链接布局的场景，其中 skill 根目录的符号链接指向已配置根目录之外的位置，例如
    `<workspace>/skills/manager -> ~/Projects/manager/skills`，请使用 `allowSymlinkTargets`。
    仅当 Skill Workshop 也应通过这些受信任的符号链接路径应用提案时，才启用 `skills.workshop.allowSymlinkTargetWrites`。

  </Accordion>
  <Accordion title="远程 macOS 节点（Linux gateway）">
    如果 Gateway 运行在 Linux 上，但连接了一个允许 `system.run` 的**macOS 节点**，那么当所需二进制文件存在于该节点上时，OpenClaw 可以将仅适用于 macOS 的 skills 视为符合条件。agent 应通过带 `host=node` 的 `exec` 工具运行这些 skills。

    离线节点不会让仅远程可用的 skills 可见。如果某个节点停止响应 bin 探测，OpenClaw 会清除其缓存的 bin 匹配结果。

  </Accordion>
</AccordionGroup>

## Token 影响

当 skills 符合条件时，OpenClaw 会在系统提示词中注入一个紧凑的 XML 块。其成本是确定性的，并且会随每个 skill 线性增长：

- **基础开销**（仅在有 1 个或以上 skills 符合条件时）：一段固定的介绍性文本，加上 `<available_skills>` 包装器。
- **每个 skill：**约 97 个字符 + 你的 `name`、`description` 和 `location` 字段长度。
- XML 转义会将 `& < > " '` 展开为实体，因此每次出现都会增加少量字符。
- 按每 token 约 4 个字符计算，97 个字符 ≈ 每个 skill 24 个 token，尚未计入字段长度。

如果渲染后的块会超过配置的提示词预算
（`skills.limits.maxSkillsPromptChars`），OpenClaw 会首先尽可能保留尽量多的 skill 标识（name、location 和 version），这些信息可以放入不含描述的紧凑格式中。然后会使用剩余预算放入缩短后的描述。如果不再有描述预算，则会省略描述。只要需要紧凑格式或列表截断，提示词中就会包含一条指向 `openclaw skills check` 的提示。

请保持描述简短且具有描述性，以尽量减少提示词开销

## 相关内容

<CardGroup cols={2}>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    编写自定义技能的分步指南。
  </Card>
  <Card title="技能工作坊" href="/tools/skill-workshop" icon="flask">
    面向代理草拟技能的提案队列。
  </Card>
  <Card title="技能配置" href="/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置模式和代理允许列表。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="terminal">
    技能斜杠命令如何注册和路由。
  </Card>
  <Card title="ClawHub" href="/clawhub" icon="cloud">
    在公共注册表中浏览和发布技能。
  </Card>
  <Card title="插件" href="/tools/plugin" icon="plug">
    插件可以连同其所文档化的工具一起发布技能。
  </Card>
</CardGroup>
