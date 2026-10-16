---
title: "技能"
sidebarTitle: "技能"
summary: "技能教会你的代理如何使用工具。了解它们如何加载、优先级如何工作，以及如何配置门控、允许列表和环境注入。"
read_when:
  - "添加或修改技能"
  - "更改技能门控、允许列表或加载规则"
  - "理解技能优先级和快照行为"
---

技能是降价指令文件，教代理如何以及何时使用工具。每个技能都位于一个包含 `SKILL.md` 文件的目录中，其中包含 YAML frontmatter 和 markdown body。 OpenClaw 加载捆绑技能以及任何本地覆盖，并在加载时根据环境、配置和二进制文件的存在情况对其进行过滤。

<CardGroup cols={2}>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    从零开始构建并测试一个自定义技能。
  </Card>
  <Card title="技能工作坊" href="/tools/skill-workshop" icon="flask">
    您的代理通过更改历史记录和撤消自行学习技能。
  </Card>
  <Card title="技能配置" href="/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置模式和代理允许列表。
  </Card>
  <Card title="ClawHub" href="/clawhub" icon="cloud">
    浏览并安装社区技能。
  </Card>
</CardGroup>

## <a id="loading-order"></a> 加载顺序

文件支持的技能从这些源加载，**优先级最高，最先**。当相同的技能名称出现在多个地方时，来源最高的获胜。 [个人图书馆技能](#personal-skills-on-a-shared-gateway)是通过身份和修订来选择的，而不是通过扫描每个用户的文件来发现的。

| 优先级    | 来源                 | 路径                                                 |
| ----------- | ---------------------- | ---------------------------------------------------- |
| 1 — 最高 | 工作区技能       | `<workspace>/skills`                                 |
| 2           | 项目代理技能   | `<workspace>/.agents/skills`                         |
| 3           | 个人代理技能  | `~/.agents/skills`（仅默认状态）              |
| 4           | 托管 / 本地技能 | `<state-dir>/skills`                                 |
| 5           | 车间技能        | `<state-dir>/agents/<agentId>/agent/workshop-skills` |
| 6           | 捆绑技能         | 随安装包提供                             |
| 6           | 保管技能       | 已发货；仅配置的托管代理             |
| 7 — 最低  | 额外目录      | `skills.load.extraDirs` + 插件技能              |

当会话使用不同的执行工作空间时，OpenClaw 还会加载该工作空间的 `skills/` 和 `.agents/skills/` 目录。这些技能按照优先顺序和提示顺序遵循整个代理目录；在执行工作空间中，`skills/` 胜过 `.agents/skills/`。两个目录都参与快照刷新和沙箱同步。沙盒运行读取物化副本，而不是原始主机路径。

托管工作树会话将其记录的源工作区保留为技能源。即使文件传输插件从配对节点为代理工作区提供服务，该源也会在网关上读取和监视。节点读取其配置的代理技能根；它不接收网关源路径。选定的技能文件和支持资源是从其所属主机提供的。面向模型的工作区托管条目使用 `workspace-skill://` 读取位置，因此相同的网关路径无法将读取重定向到节点。即使会话在工作树中执行，配置的代理工作区仍然是主要技能源；仅选择该工作树作为代理的工作区才能使其技能具有首要优先级。选定的嵌套工作区保持嵌套状态：发现不会走到其父存储库。从存储库安装 OpenClaw 不会使该存储库的 `.agents/skills/` 成为全局捆绑技能源。

每个发现过程都会针对 winning/losing 发现根和源类型报告一份摘要，其中包含技能计数和最多三个示例名称。工作空间或项目技能优先于捆绑技能，托管工作树技能优先于项目结帐技能，这些都是警告；其他碰撞仅供参考。 Worktree来源使用配置的`worktreeRoot`（状态目录默认为`worktrees/`），而不检查Git。相同的内容保持沉默。刷新时不会重复未更改的根对摘要；内容、声明的元数据或冲突成员资格的更改会更新摘要。优先级不变。

技能根目录支持分组布局。只要在已配置的根目录下任意位置出现 `SKILL.md`，OpenClaw 就会发现该技能（最多向下 6 层）：

```text
<workspace>/skills/research/SKILL.md          ✓ found as "research"
<workspace>/skills/personal/research/SKILL.md ✓ also found as "research"
```

在分组发现过程中，找到 `SKILL.md` 就会结束对该目录下的遍历。无效技能文件被报告并跳过；有效的兄弟姐妹仍然可以加载。

文件夹路径仅用于组织。技能的名称和斜杠命令来自 `name` frontmatter 字段（如果缺少 `name`，则使用目录名）。代理允许列表（见下文）也会匹配这个 `name`。

发布版本的 [Custodian 技能库](/tools/custodian-skills) 共享捆绑的优先级层，但除了配置的 system/Custodian 代理之外，每个代理都不存在。

<Note>
  Codex CLI 的原生 `$CODEX_HOME/skills` 目录**不是** OpenClaw 的技能根目录。请使用 `openclaw migrate plan codex` 清点这些技能，然后用 `openclaw migrate codex` 将它们复制到你的 OpenClaw 工作区。
</Note>

## <a id="node-hosted-skills"></a> Node-托管技能

连接的无头节点可以发布安装在其活动 OpenClaw 技能目录中的技能（默认情况下为 `~/.openclaw/skills`；配置文件环境覆盖适用）。当节点连接时它们出现在正常代理技能列表中，当节点断开连接时它们消失。本地或网关技能在碰撞时保留其名称；节点技能收到一个稳定的节点前缀名称。 Node-hosted v1 要求目录名称与技能的 `name` frontmatter 字段相匹配。发布的名称、描述和说明来自相同的捕获文件内容。

技能条目包括节点定位器。它的文件、相对引用和二进制文件位于节点上，因此使用 `exec host=node node=<node-id>` 加载并执行它。更改技能文件后重新启动节点主机。请参阅 [Nodes](/nodes/mcp-and-skills#node-hosted-skills) 了解配对和关闭开关。

## <a id="per-agent-vs-shared-skills"></a> 按代理与共享技能

在多代理设置中，每个代理都有自己的工作区。请使用与你期望可见性匹配的路径：

| 范围          | 路径                                                 | 对谁可见                     |
| -------------- | ---------------------------------------------------- | ------------------------------ |
| 每个代理      | `<workspace>/skills`                                 | 仅该代理                |
| 项目代理  | `<workspace>/.agents/skills`                         | 仅该工作区的代理    |
| 个人代理 | `~/.agents/skills`                                   | 使用默认状态的代理 |
| 共享托管 | `<state-dir>/skills`                                 | 使用该状态的所有代理    |
| 车间       | `<state-dir>/agents/<agentId>/agent/workshop-skills` | 仅该代理                |
| 额外目录     | `skills.load.extraDirs`                              | 使用该配置的所有代理   |

一名特工学到的工坊技能不会与另一特工共享。当技能必须可供多个客服人员使用时，将技能发布到托管库。

当 `OPENCLAW_STATE_DIR` 指向默认 `~/.openclaw` 以外的位置时，会话技能索引会排除基于主目录的个人或兼容性技能根目录，例如 `~/.agents/skills`。工作区、项目、捆绑、额外以及由状态拥有的托管技能仍会照常加载。

## <a id="personal-skills-on-a-shared-gateway"></a> 共享网关上的个人技能

在共享网关上，已识别的操作员可以保留个人技能库，而无需获得更改每个人的工作空间技能或网关配置的许可。打开 **Plugins → Skills** 创建技能、导入 `SKILL.md` 或 ZIP 捆绑包，或从 ClawHub 添加技能。编辑器通过说明不断支持脚本、参考和资源。

普通的单管理设置保持不变：工作区创作仍然使用 `<workspace>/skills`，并且现有的文件支持技能不会移至库中。共享令牌不能识别一个人。个人库操作需要经过身份验证的 [Gateway 配置文件](/concepts/user-model)。团队特定的界面和代理指南使用不同的网关配置文件，而不是渠道发送者、联系人、帐户、代理、设备或浏览器连接。链接和合并的登录身份算作一个配置文件。

### <a id="ownership-and-sharing"></a> 所有权和共享

新的托管技能属于经过身份验证的创建者。 **与团队共享** 使其他操作员可以使用一项技能，而无需授予他们编辑权限。管理员可以将 **转移到 team**，更改管理所有权，同时保留原始作者。共享和传输不会移动文件或更改技能的稳定值ID。配置文件合并保留现有修订路径。

调用托管技能时，使用技能选择器或返回的命令标识。不同的所有者可以使用相同的友好名称，而无需一种技能默默地替换另一种技能。

<Warning>
共享网关保留 [ 信任域 ](/start/teams#one-trust-boundary)。附加到共享会话的技能是该会话的输入，而不是秘密存储。图书馆所有权决定管理和发现；它不授予新工具、凭据、主机安装权限或与网关操作员的隔离。将凭证排除在技能内容之外。
</Warning>

### <a id="revisions-and-session-selection"></a> 修订和会话选择

保存会发布完整的不可变修订版：`SKILL.md` 和每个支持文件。修订哈希包括可移植文件路径、确切内容、大小和可执行标志。仅编辑帮助程序脚本仍然会更改修订版；共享、所有权更改、ZIP 时间戳和存档条目顺序不会。相同的保存是无操作的。过时的编辑会因冲突而失败，而不是覆盖较新的修订版本。

会话保留其选定的技能 ID 和修订版本。加入会话或获得会话所有权的其他人不会取代该选择。已发布的更改可用于新会话；显式附加或刷新技能以在现有会话的下一轮中使用它。回滚选择保留的修订版。从库中删除技能会将其从新选择中排除，而不会删除会话已选择的修订版本。禁用技能会将其从新会话默认值中删除；显式附件仍然可用。

新会话最多选择 64 个启用的库技能，个人技能优先，每组内稳定 ID 排序。如果库超出该限制，“技能”页面会说明如何分离选定的技能并附加另一个技能。启用不会绕过代理白名单、所需的二进制文件、操作系统限制或其他先决条件。

托管捆绑包最多包含 256 个文件，每个文件 1 个 MiB，总共 8 个 MiB。工作线程资源交付也有 8 MiB 聚合限制；如果其完整捆绑包超出该限制，则缩小会话选择范围。已发布的修订版本将被保留，包括旧会话仍选择的修订版本。

ZIP 导入允许每个网关配置文件最多 16 个未完成的上传，跨网关最多允许 32 个。链接或合并的身份共享配置文件限制。已完成的导入不计入任一限制，上传将在开始一小时后过期。如果配置文件合并或升级留下的上传数量超过限制允许的数量，则仍可以完成现有的未过期上传。完成现有上传或等待它们过期后再开始更多上传。

网关将库记录和修订元数据存储在 `state/openclaw.sqlite` 中，并将不可变包存储在其状态目录内的 `skill-library/<skill-id>/revisions/<revision-hash>/` 中。不要直接编辑这些托管目录。使用编辑器、[Skills 库 CLI](/cli/skills#personal-skill-library) 或代理的授权创作工具。运行时副本与项目文件分开，并且不得与项目一起提交。

<a id="agent-skill-allowlists" />

## <a id="agent-allowlists"></a> 代理允许列表

技能的**位置**（优先级）和技能的**可见性**（哪个代理可以使用它）是两个独立的控制项。使用允许列表来限制某个代理能看到哪些技能，无论它们从哪里加载。

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      skills: ["github", "weather"], // shared baseline
      heartbeat: { agentId: "writer" },
      systemAgent: { agentId: "writer" },
      authInheritance: { agentId: "writer" },
    },
    entries: {
      writer: { workspace: "~/.openclaw/workspace" }, // inherits github, weather
      docs: { skills: ["docs-search"] }, // replaces defaults entirely
      "locked-down": { skills: [] }, // no skills
    },
  },
  talk: { agentId: "writer" },
}
```

<AccordionGroup>
  <Accordion id="allowlist-rules" title="允许名单规则">
    - 省略 `agents.defaults.skills` 可使默认情况下所有技能都不受限制。
    - 省略 `agents.entries.*.skills` 可继承 `agents.defaults.skills`。
    - 设置 `agents.entries.*.skills: []` 不公开该代理的任何技能。
    - 非空的 `agents.entries.*.skills` 列表是**最终**集合——它不会与默认值合并。
    - 生效的允许列表适用于提示词构建、斜杠命令发现、沙箱同步以及技能快照。
    - 这不是主机外壳授权边界。如果同一代理可以使用 `exec`，请通过沙箱、OS- 用户隔离、exec deny/allowlists 和每个资源凭据单独约束该 shell。
  </Accordion>
</AccordionGroup>

## <a id="plugins-and-skills"></a> 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根的路径）来发布自己的技能。启用插件时会加载插件技能 - 例如，浏览器插件附带了用于多步骤浏览器控制的 `browser-automation` 技能。

插件技能目录会与 `skills.load.extraDirs` 处于同一较低优先级级别进行合并，因此名称相同的内置、托管、代理或工作区技能将覆盖它们。插件技能本身的适用性可以通过其 frontmatter 中的 `metadata.openclaw.requires` 进行控制，其方式与其他技能相同。

对于多帐户通道插件，在通道子树（例如，`channels.discord`）上控制一般消息传递技能，而不是根令牌字段：凭据可能位于指定帐户下。这是粗略的技能可见性检查。该插件仍然拥有凭证解析、帐户启用、操作可用性和授权；符合条件的技能并不授予工具访问权限。

有关完整的插件系统，请参阅 [插件](/tools/plugin) 和 [工具](/tools)。

## <a id="reference-a-skill-in-a-prompt"></a> 在提示词中引用技能

在 Control UI 编辑器中输入 `$`，即可搜索当前代理可用的技能。选择搜索结果后，会插入其稳定的命令名称，例如 `$release_notes`，而不会替换消息的其余内容。一个提示词可以引用多个技能：

```text
Use $github and $release_notes to summarize this change for the release.
```

OpenClaw 解析每个通道和通用网关、CLI 和 Webhook 代理轮次上授权发件人的显式引用。它与当前代理的合格的、用户可调用的技能相匹配，并告诉模型在执行操作之前读取每个引用的 `SKILL.md`。一条消息最多可以引用八种不同的技能； OpenClaw 返回可见错误，而不是忽略额外或允许列表隐藏的引用。 `$` 形式是可组合的提示文本。在通道消息中，`/release_notes ...`仍然是独立的命令形式，并且当技能声明`command-dispatch: tool`时可以使用直接工具调度；通用代理轮流扩展与模型指令相同的主导技能命令，而无需运行通道命令调度程序。常见的大写 shell 变量如 `$HOME`、`$PATH` 和 `$EDITOR` 仍然是普通文本；使用小写 `$home`、`$path` 或 `$editor` 来引用具有这些名称的技能。当引用应保持原义时，将其转义为 `\$name`。

`disable-model-invocation: true` 的技能不会出现在 `$` 选择器和模型的正常提示之外，因此模型无法自行选择它们。授权的显式 `$skill-name` 引用仍然会调用它们；该标志仅隐藏模型发起的选择中的技能。

## <a id="skill-workshop"></a> 技能工作坊

[Skill Workshop](/tools/skill-workshop) 允许代理在 `<state-dir>/agents/<agentId>/agent/workshop-skills` 中保存和更新自己的技能。每项更改都会立即应用、公布并保存以前的版本，以便可以撤消。所学到的技能对其座席始终可见；归档一个以隐藏它。操作员通过自己的工具或文件在该目录之外编辑技能。

```bash
openclaw skills workshop list
openclaw skills workshop changes
openclaw skills workshop archive <name>
openclaw skills workshop restore <name>
```

请参阅 [Skill Workshop](/tools/skill-workshop) 了解代理如何学习技能，并参阅 [`openclaw skills workshop`](/cli/skills#skill-workshop) 了解 CLI 参考。

## <a id="installing-from-clawhub"></a> 从 ClawHub 安装

[ClawHub](https://clawhub.ai) 是公开的技能注册中心。使用 `openclaw skills` 命令进行安装和更新，或使用 `clawhub` CLI 进行发布和同步。

| 操作                             | 命令                                                |
| ---------------------------------- | ------------------------------------------------------ |
| 将技能安装到工作区 | `openclaw skills install @owner/<slug>`                |
| 安装外部 skills.sh 引用  | `openclaw skills install skills-sh:owner/repo/slug`    |
| 从 Git 仓库安装      | `openclaw skills install git:owner/repo@ref`           |
| 安装本地技能目录    | `openclaw skills install ./path/to/skill --as my-tool` |
| 为所有本地代理安装       | `openclaw skills install @owner/<slug> --global`       |
| 更新所有工作区技能        | `openclaw skills update --all`                         |
| 更新共享托管技能      | `openclaw skills update @owner/<slug> --global`        |
| 更新所有共享托管技能   | `openclaw skills update --all --global`                |
| 验证技能的信任封装    | `openclaw skills verify @owner/<slug>`                 |
| 打印生成的 Skill Card     | `openclaw skills verify @owner/<slug> --card`          |
| 通过 ClawHub CLI 发布 / 同步     | `clawhub sync --all`                                   |

<AccordionGroup>
  <Accordion id="install-details" title="安装详情">
    `openclaw skills install` 默认将技能安装到当前工作区的 `skills/` 目录。添加 `--global` 可安装到共享的 `~/.openclaw/skills` 目录，除非代理允许列表将其限制，否则所有本地代理都可见。

    技能工坊不会安装到这两个位置。生成的技能位于所选代理的 `<state-dir>/agents/<agentId>/agent/workshop-skills` 中。

    Git 和本地安装要求源根目录下存在 `SKILL.md`。slug 首先来自 `SKILL.md` frontmatter 中有效的 `name`，然后回退到目录或仓库名称。使用 `--as <slug>` 可覆盖。 `openclaw skills update` 仅跟踪 ClawHub 安装——要刷新 Git 或本地来源，需要重新安装。

    ClawHub 跟踪在工作区中使用 `.clawhub/lock.json`，在每个已安装的技能中使用 `.clawhub/origin.json`。 2026 年 7 月之前的 `.clawdhub` 目录不再读取。对于较旧的安装，请在更新或验证技能之前将这些元数据目录重命名为 `.clawhub`；保留并协调任何现有的 `.clawhub` 元数据，而不是覆盖它。

  </Accordion>
  <Accordion id="verification-and-security-scanning" title="验证和安全扫描">
    `openclaw skills verify @owner/<slug>` 会向 ClawHub 请求该技能的 `clawhub.skill.verify.v1` 信任封装。已安装的 ClawHub 技能会根据 `.clawhub/origin.json` 中记录的版本和注册表进行验证。 对于已存在的已安装技能或无歧义技能，裸 slug 仍然可接受，但带所有者限定的引用可避免发布者歧义。

    ClawHub 技能页面会在安装前展示最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的详细页面。当 ClawHub 将验证标记为失败时， 该命令会以非零状态退出。发布者可通过 ClawHub 仪表板或 `clawhub skill rescan @owner/<slug>` 处理误报。

  </Accordion>
  <Accordion id="private-archive-installs" title="私人存档安装">
    需要非 ClawHub 交付的网关客户端可以使用 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 暂存 zip 技能存档，然后使用 `skills.install({ source: "upload", ... })` 进行安装。该路径默认关闭，需要 `openclaw.json` 中的 `skills.install.allowUploadedArchives: true`。正常的 ClawHub 安装永远不需要该设置。
  </Accordion>
</AccordionGroup>

## <a id="security"></a> 安全

<Warning>
  将第三方技能视为**不受信任的代码**。在启用前先阅读它们。 对不受信任的输入和高风险工具优先使用沙箱运行。有关代理侧控制，请参见 [沙箱化](/gateway/sandboxing)。
</Warning>

<AccordionGroup>
  <Accordion id="path-containment" title="路径遏制">
    工作区、项目代理和额外目录技能发现仅接受其解析的真实路径保留在配置的根内的技能根，除非 `skills.load.allowSymlinkTargets` 明确信任目标根。技能工坊拒绝在 `<state-dir>/agents/<agentId>/agent/workshop-skills` 之外解析的符号链接技能。托管 `~/.openclaw/skills` 和个人 `~/.agents/skills` 可能包含符号链接的技能文件夹，但每个 `SKILL.md` 真实路径仍必须保留在其解析的技能目录中。可选的 `skill-card.md` 文件必须是该目录内的常规文件，并且不大于 256 KiB，包括它们在读取过程中增长的情况。
  </Accordion>
  <Accordion id="operator-install-policy" title="运营商安装政策">
    配置 `security.installPolicy` 以在技能安装继续之前运行受信任的本地策略命令。该策略接收元数据和分阶段源路径，适用于 ClawHub、上传、Git、本地、更新和依赖项安装程序路径，并在命令无法返回有效决策时阻止安装。
  </Accordion>
  <Accordion id="secret-injection-scope" title="秘密注射范围">
    `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会将密钥注入到该代理轮次的**宿主**进程中——不会注入到沙箱中。请将密钥排除在提示词和日志之外。
  </Accordion>
</AccordionGroup>

有关更广泛的威胁模型和安全检查清单，请参见 [安全](/gateway/security)。

## <a id="skill.md-format"></a><a id="skill-md-format"></a> SKILL.md 格式

每个 skill 的 frontmatter 至少需要 `name` 和 `description`：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---

When the user asks to generate an image, use the `image_generate` tool...
```

<Note>
  OpenClaw 遵循 [AgentSkills](https://agentskills.io) 规范。Frontmatter 会先按 YAML 解析；如果失败，则回退到仅单行解析器。嵌套的 `metadata` 块（包括多行 YAML 映射）会被展平为 JSON 字符串，并重新按 JSON5 解析，因此在 [门控](#gating) 下展示的块形式可正常工作。请在正文中使用 `{baseDir}` 来引用 skill 文件夹路径。
</Note>

### <a id="optional-frontmatter-keys"></a> 可选前面板按键

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“网站”的 URL。也支持通过 `metadata.openclaw.homepage` 配置。
</ParamField>

<ParamField path="user-invocable" type="boolean" default="true">
  当为 `true` 时，该 skill 会作为用户可调用的斜杠命令暴露出来。
</ParamField>

<ParamField path="disable-model-invocation" type="boolean" default="false">
  当为 `true` 时，OpenClaw 会将该 skill 的说明排除在 agent 的常规提示词之外。 该 skill 仍然可以作为斜杠命令使用，只要 `user-invocable` 也为 `true`。
</ParamField>

<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令会绕过模型，直接分发到已注册的工具。
</ParamField>

<ParamField path="command-tool" type="string">
  当设置了 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>

<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具调度，将原始参数字符串转发到工具而不进行核心解析。该工具接收 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。
</ParamField>

## <a id="gating"></a> 门控

OpenClaw 在加载时使用 `metadata.openclaw`（嵌入在 frontmatter 中的 JSON5 对象，参见上面的解析说明）来过滤技能。没有 `metadata.openclaw` 块的技能默认始终符合条件，除非被显式禁用。

技能 **inventory**、技能 **readiness** 和技能 **visibility** 相关但不同：

- **Inventory** 回答 OpenClaw 是否在配置的根或捆绑源中发现了技能。
- **Readiness** 回答当前运行时是否可以满足技能声明的要求，例如二进制文件、环境变量、配置路径、操作系统约束或可访问的节点托管功能。
- **Visibility** 回答在应用代理白名单、调用标志和会话快照规则后是否向所选代理公开就绪的合格技能。

技能可能存在于库存中，但仍未准备好或不可见。当调试出现在配置中但未针对代理显示的技能，或者缺少所需的工具、凭据或主机功能时，请使用 [`openclaw skills check`](/cli/skills#commands)。

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

<ParamField path="always" type="boolean">
  当 `true` 时，只要其 `os` 要求兼容，就包含该技能，绕过 `requires.bins`、`requires.anyBins`、`requires.env` 和 `requires.config`。
</ParamField>

<ParamField path="emoji" type="string">
  macOS 技能 UI 中显示的可选表情符号。
</ParamField>

<ParamField path="homepage" type="string">
  可选的 URL 在 macOS 技能 UI 中显示为“网站”。
</ParamField>

<ParamField path="os" type='("darwin" | "macos" | "linux" | "win32")[]'>
  硬平台过滤器。设置后，仅当本地主机或连接的远程运行时与列出的 OS 匹配时，该技能才有效。 `always` 不会覆盖此过滤器。 `macos` 被接受作为 `darwin` 的别名。
</ParamField>

<ParamField path="requires.bins" type="string[]">
  每个二进制文件都必须存在于 `PATH` 中。
</ParamField>

<ParamField path="requires.anyBins" type="string[]">
  至少有一个二进制文件必须存在于 `PATH` 中。
</ParamField>

新的依赖性检查检测安装到 `PATH` 上已有目录中的二进制文件。这不会刷新现有会话的技能快照；请参阅 [ 快照并刷新 ](/tools/skills#snapshots-and-refresh)。

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
  macOS 技能 UI 使用的可选安装程序规范（brew / node / go / uv / download）。
</ParamField>

<Note>
  2026 年 7 月之前的 `metadata.clawdbot` 格式不再被读取。要更新旧技能，请编辑其 `SKILL.md` frontmatter 并将该块重命名为 `metadata.openclaw`，保留其要求和安装程序字段。如果两个块都存在，则保留当前块并仅合并您仍然需要的旧字段。 OpenClaw 不重写文件；旧块的依赖关系门和安装程序提示将被忽略，直到您更新它。
</Note>

### <a id="installer-specs"></a> 安装器规格

安装程序规范告诉 macOS 技能 UI 如何安装依赖项：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
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
  <Accordion id="installer-selection-rules" title="安装人员选择规则">
    - 当列出多个安装器时，网关会选择一个首选项（可用时优先 brew，否则 node）。
    - 如果所有安装器都是 `download`，OpenClaw 会列出每个条目，以便你查看所有可用制品。
    - 规格可以包括 `os: ["darwin"|"macos"|"linux"|"win32"]` 以按平台过滤。
    - Node 在 `openclaw.json` 中安装荣誉 `skills.install.nodeManager`（默认：npm；选项：npm / pnpm / yarn / 面包）。这只影响技能安装；网关运行时仍应为 Node。
    - 网关安装器优先级：Homebrew → uv → 已配置的 node manager → go → download。
  </Accordion>
  <Accordion id="per-installer-details" title="每个安装程序的详细信息">
    - **Homebrew:** OpenClaw 不会自动安装 Homebrew，也不会将 brew formula 转换为系统包命令。在没有 `brew` 的 Linux 容器中，只显示非 brew 专用的安装器；请使用自定义镜像或手动安装依赖。
    - **Go：** OpenClaw 需要 Go 1.21 或更高版本才能自动安装技能。如果`go`缺失，而Homebrew可用，则OpenClaw先通过Homebrew安装Go；在没有 Homebrew 的 Linux 上，当刷新的 `golang-go` 候选满足最低版本时，它可以使用 `apt-get` 作为 root 或通过无密码 `sudo`。依赖项的实际 `go install` 始终针对专用的 OpenClaw- 托管 bin 目录（全新安装时 Homebrew 的 `bin`，其他 `~/.local/bin`），而不是您配置的 `GOBIN` — 您自己的 `GOBIN`， `GOPATH` 和 `GOTOOLCHAIN` 环境变量会被读取，但不会被覆盖。
    - **下载：** `url`（必需）、`sha256`（可选的 64 字符十六进制摘要，在下载后、安装或解压文件之前进行验证）、`archive` （`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认：当配方或 URL 识别存档时自动）、`stripComponents`、`targetDir`（默认： `~/.openclaw/tools/<skillKey>`）。没有 `sha256` 的现有规格保留以前的下载行为。响应机构的上限为 256 MiB；较大的传输在流式传输时会中止，并且部分暂存数据会被删除。存档提取不需要系统 `tar` 命令。对于 `extract: true`，有效的 `Content-Disposition` 文件名可以标识由无扩展名的 URL 提供的存档。无效或空的响应文件名回退到 URL；响应标头不会启用省略 `extract` 的配方的提取。
  </Accordion>
  <Accordion id="sandboxing-notes" title="沙箱笔记">
    `requires.bins`被检查在**主持人**在技​​能加载时。如果代理在沙箱中运行，则二进制文件也必须存在**容器内**。通过安装它`agents.defaults.sandbox.docker.setupCommand`或自定义图像。`setupCommand`容器创建后运行一次，需要网络出口、可写根FS，以及沙箱中的 root 用户。
  </Accordion>
</AccordionGroup>

## <a id="config-overrides"></a> 配置覆盖

在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切换和配置捆绑或托管技能：

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
  即使捆绑或安装，`false` 也会禁用该技能。 `coding-agent` 捆绑技能是可选的 — 设置 `skills.entries.coding-agent.enabled: true` 并检查 `claude`、`codex`、`opencode` 或另一个受支持的 CLI 之一是否已安装并经过身份验证。
</ParamField>

<ParamField path="apiKey" type='string | { source, provider, id }'>
  适用于声明了 `metadata.openclaw.primaryEnv` 的技能的便捷字段。支持明文字符串或 SecretRef 对象。
</ParamField>

<ParamField path="env" type="Record<string, string>">
  为代理运行注入的环境变量。仅当变量尚未在进程中设置时才注入。
</ParamField>

<ParamField path="config" type="object">
  用于自定义每技能配置字段的可选包。
</ParamField>

<ParamField path="allowBundled" type="string[]">
  仅适用于**内置** skills 的可选允许列表。设置后，只有列表中的内置 skills 才符合条件。已管理和工作区 skills 不受影响。
</ParamField>

<Note>
  默认情况下，配置键与**技能名称**匹配。如果某个技能定义了 `metadata.openclaw.skillKey`，则请改为在 `skills.entries` 下使用该键。 带连字符的名称需要加引号：JSON5 允许带引号的键。
</Note>

## <a id="environment-injection"></a> 环境注入

当代理运行开始时，OpenClaw 会：

<Steps>
  <Step id="reads-skill-metadata" title="读取技能元数据">
    OpenClaw 会解析代理的有效技能列表，应用门控规则、允许列表和配置覆盖。
  </Step>
  <Step id="injects-env-and-api-keys" title="注入 env 和 API 密钥">
    `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 会在运行期间应用到 `process.env`。
  </Step>
  <Step id="builds-the-system-prompt" title="构建系统提示符">
    符合条件的技能会被编译成一个紧凑的 XML 块，并注入到系统提示词中。
  </Step>
  <Step id="restores-the-environment" title="恢复环境">
    运行结束后，原始环境会被恢复。
  </Step>
</Steps>

<Warning>
  环境注入仅作用于**主机**上的代理运行，而不作用于沙箱。在沙箱内，`env` 和 `apiKey` 不会生效。有关如何将密钥传递到沙箱运行，请参阅 [技能配置](/tools/skills-config#sandboxed-skills-and-env-vars)。
</Warning>

对于捆绑的 `claude-cli` 后端，没有库选择的会话将合格技能具体化为临时 Claude Code 插件，通过 `--plugin-dir` 传递。具有库选择的会话使用 OpenClaw 的提示目录和固定修订路径。 OpenClaw 对于这些会话省略 `--plugin-dir`，以防止 Claude 的本机技能别名与库命令标识发生冲突。其他 CLI 后端仅使用提示目录。

## <a id="snapshots-and-refresh"></a> 快照与刷新

当会话开始时，OpenClaw 对符合条件的技能 **进行快照**，并重复使用该列表，直到应用下面的刷新触发器。新会话会重新检查技能先决条件，包括安装到现有 `PATH` 目录中的二进制文件，即使技能文件未更改也是如此。现有快照保留其选定的技能来源：具有相同名称的新合格技能不会在水合作用期间替换另一个来源的实施。

托管库选择将保留其准确的修订版本，直到显式附加或刷新为止，包括跨网关重新启动。下面的刷新触发器适用于普通的文件支持的技能根。

一名后台工作人员发现跨托管、捆绑、插件、个人和工作区技能根源的本地文件支持技能。启用 `skills.load.watch` 后，它大约每分钟检查一次磁盘上的被动更改。因此，在 OpenClaw 外部进行的编辑可能需要大约一分钟才能显示，包括添加或删除技能以及创建、删除或替换技能根或工作区。每个发现过程都会读取一次共享根以匹配发现限制和文件策略，然后分别应用每个工作区的优先级。下一遍再次读取这些根以观察变化。

显式 OpenClaw 操作请求立即重新扫描：安装、更新、卸载或编辑技能；改变影响技能的配置；并启动或重新启动网关。新的合格远程节点也会刷新技能资格。远程工作区发现保留在拥有这些文件的主机上。配置更改替换了健康发现工作线程上的源计划和订阅；他们不会等待不必要的工作人员重新启动。

工作人员在发现后发布完整的快照。扫描运行时，轮流重复使用上次发布的技能，而无需等待其他工作区。首次发现和显式刷新操作仍在等待发布。现有会话会在下一个代理轮次时获取更改后的文件支持技能。如果有效代理白名单发生更改，OpenClaw 会刷新快照以保持可见技能一致。

将 `skills.load.watch` 设置为 `false` 以禁用被动自动重新扫描。显式的 OpenClaw 操作和网关启动仍然会立即刷新技能。

<AccordionGroup>
  <Accordion id="automatic-skill-refresh" title="自动技能刷新">
    后台发现工作人员会扫描配置的技能根，因此工作区其他位置的普通源编辑不会触发技能重新扫描。在`skills.load`下配置：

    ```json5
    {
      skills: {
        load: {
          extraDirs: ["~/path/to/agent-scripts/skills"],
          allowSymlinkTargets: ["~/path/to/skills"],
          watch: true, // default
        },
      },
    }
    ```

    被动编辑将合并到下一次定期扫描中。支持文件更改会刷新沙箱副本，而不更改技能目录。未更改的名称、配置密钥、来源、优先获胜者和 `SKILL.md` 内容保持相同的快照版本，并且不通知聊天元数据使用者。具有相同 `SKILL.md` 内容和声明元数据的副本不会生成优先冲突日志。每个订购的 winner/loser 发现根和源类型总结了不同的内容。在网关过程中，具有相同聚合摘要的刷新保持静默；编辑副本或更改碰撞技能名称会更新摘要。优先级保持不变。

    使用 `allowSymlinkTargets` 进行有意的符号链接布局，其中技能根符号链接指向配置的根之外，例如 `<workspace>/skills/manager -> ~/path/to/skills`。 Skill Workshop 不使用这些配置的符号链接目标。每次扫描时都会跳过转义路径，但每个进程都会记录每个 source/root/path 警告一次，除非其解析的目标发生更改。警告缓存最多保留1,024条路径；被驱逐的路径可以再次发出警告。每次扫描仍会报告审核诊断。

  </Accordion>
  <Accordion id="remote-macos-nodes-linux-gateway" title="远程macOS节点（Linux网关）">
    如果网关在 Linux 上运行，但 **macOS 节点** 与 `system.run` 允许连接，则当该节点上存在所需的二进制文件时，OpenClaw 可以仅将 macOS- 技能视为合格。代理应通过 `exec` 工具和 `host=node` 运行这些技能。

    离线节点 **not** 使仅远程技能可见。如果节点停止应答 bin 检查，OpenClaw 将清除其缓存的 bin 匹配。

    连接时 bin 检查会短暂等待节点的命令处理程序。网关关闭会取消此准备等待，但仍会加入已开始的检查。

  </Accordion>
</AccordionGroup>

## <a id="search-installed-skills"></a> 搜索安装技巧

提示包含有界的技能目录。当启用该工具时，即时预算省略的技能仍然可以通过 `skills_search` 发现。小目录继续完整出现。

当搜索可用时，代理将被指示在涉及文件、专用工具或可重用工作流程的工作之前检查相关技能。明确识别省略的目录；代理按任务目标进行搜索，而不是尝试扫描不存在的列表。已知的名字和清晰的目录匹配可以直接进入完整的技能阅读。简单的对话和独立的答案不需要发现。

- `skills_search({ query, limit? })` 搜索符合条件的安装名称、描述和有界指令文本。默认限制为 5；最大值为 20。查询必须包含 1-1,000 个字符。结果包含名称、位置和简短描述，而不是说明。 `hasMore` 表示存在其他匹配项。
- `skills_read({ name })` 加载完整的 `SKILL.md` 以获得确切的名称。响应包括技能的位置和任何特定于主机的指导，因此无需事先搜索即可解析相对资源路径。指令正文不变。提示目录中省略的指令限制为 256 KiB，如果较大则拒绝，未截断。提示列出的指令保留现有的全读合同，包括代码模式的单独程序数据限制。

这两个工具都使用当前会话的合格目录。搜索不会添加已禁用、已过滤、不合格和模型隐藏的技能。现有的显式用户引用保持独立。搜索不会查询 ClawHub、安装技能或授予执行其命令的权限。

指令体索引需要有效的本机 `skills_read` 工具。当读取被拒绝或屏蔽时，搜索仅使用元数据并且不执行指令体读取。撤销还排除缓存的正文匹配，并拒绝在上一次授权下启动的​​正在进行的索引。

在 OpenClaw 代码模式下，使用 `await skills.search(query, limit)` 和 `await skills.read(name)`。这些呼叫通过相同的工具和策略进行调度。读取返回一个具有相同位置上下文和完整指令的字符串。 `await skills.list(offset)` 最多返回 20 个目录条目；默认偏移量为 0。 Codex 通过其动态刀具面接收 OpenClaw 刀具；这些与 Codex 的本地技能资源工具不同。 Codex 拒绝超出回合动态工具输出预算的技能读取，而不是将部分指令作为成功读取返回。现有的 `read` 政策拨款也允许 `skills_read`。明确的 `skills_read` 否认仍然获胜；仅搜索权限并不授予读取权限。

搜索使用已准备目录的内存中词法索引。它遵循现有的[快照和刷新规则](/tools/skills#snapshots-and-refresh)，没有嵌入服务或持久搜索索引。第一次搜索通过承认的文件系统所有者读取主体。并发的首次搜索共享一个构建；取消服务员并不会取消其主人。稍后的搜索将重用该准备好的目录的完整索引，并仍然检查当前的运行权限。名称和描述的词汇权重是正文的两倍；确切的名字排在第一位。

身体索引按名称顺序最多读取 1,024 项技能，一次读取 4 项。每个身体最多贡献 16 个 KiB，在所选技能中平均减少，以保持其总数最多为 4 MiB。本地文件提供一个有界前缀，并读取一个额外字节来检测截断。拒绝超大有界读取或不支持有界搜索读取的所有者仅保留元数据。具有只读整体技能的远程工作区所有者不使用其文档桥进行索引。已经交付的内联主体可以提供有界前缀。元数据仍然可搜索完整的合格目录。如果正文不可读、被省略或被缩短，`coverage` 会报告 `bodyIndexed`、`metadataOnly` 和 `truncatedBodies`。部分覆盖的空结果并不能证明不存在适用的技能。索引从不执行技能内容，索引限制不会截断 `skills_read`。

沙盒搜索仅包括可读的、交付的技能。 Discovery 不会扩展现有工作线程传输选择或其 8 MiB 总资源限制。专门的远程工作人员保留其现有的工具协议；新的搜索工具未添加到该协议中。使用网关运行来搜索其完整的合格目录。

## <a id="token-impact"></a> Token 影响

当技能符合条件时，OpenClaw 会在系统提示符中注入一个紧凑的 XML 块。成本遵循固定公式并按技能线性缩放：

- **基础开销**（仅在有 1 个或以上 skills 符合条件时）：一段固定的介绍性文本，加上 `<available_skills>` 包装器。
- **每个 skill：**约 97 个字符 + 你的 `name`、`description` 和 `location` 字段长度。
- XML 转义会将 `& < > " '` 展开为实体，因此每次出现都会增加少量字符。
- At ~4 chars/token，97 个字符 ≈ 每个技能在字段长度之前 24 个标记。

如果渲染的块超出配置的提示预算 （`skills.limits.maxSkillsPromptChars`），OpenClaw 首先保留无描述紧凑格式可以容纳的尽可能多的技能身份（名称和位置）。然后，它使用任何剩余预算来缩短描述。如果没有剩余描述预算，则省略描述。每当需要压缩格式或列表截断时，提示都会包含一条指向 `openclaw skills check` 的注释。

请保持描述简短且具有描述性，以尽量减少提示词开销

对于小型上下文窗口，OpenClaw 嵌入式运行时进一步缩短了已承认目录中的描述。它会保留每个承认的名称、位置和装载注释，即使这些超出了描述预算。完整技能说明和保存的快照不变；代码模式仍然可以读取每一项承认的技能。本机harness保留自己的提示策略。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    编写自定义技能的分步指南。
  </Card>
  <Card title="技能工作坊" href="/tools/skill-workshop" icon="flask">
    您的代理会自行保存和更新技能，并可撤消。
  </Card>
  <Card title="技能配置" href="/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置模式和代理允许列表。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="terminal">
    技能斜杠命令如何注册和路由。
  </Card>
  <Card title="ClawHub" href="/clawhub" icon="cloud">
    在公共注册表上浏览和发布技能。
  </Card>
  <Card title="插件" href="/tools/plugin" icon="plug">
    插件可以将技能与它们记录的工具一起传递。
  </Card>
  <Card title="OpenProse 迁移" href="/prose" icon="pen-nib">
    从已删除的 OpenProse 插件移至上游代理技能。
  </Card>
</CardGroup>
