---
doc-schema-version: 1
summary: "CLI `openclaw skills` （search/install/update/verify/list/info/check/library/workshop） 的参考"
read_when:
  - "你想查看哪些技能可用且已准备好运行"
  - "你想搜索 ClawHub，或从 ClawHub、Git 或本地目录安装技能"
  - "你需要移除已安装的 ClawHub 技能"
  - "你想使用 ClawHub 验证 ClawHub 技能"
  - "您想要调试缺少的 binaries/env/config 技能"
title: "技能 CLI"
---

# `openclaw skills`

检查本地技能、搜索 ClawHub、从 ClawHub/Git/local 目录安装技能、验证 ClawHub 技能并更新 ClawHub- 跟踪的安装。

使用 [`openclaw plugins`](/cli/plugins) 作为插件包。独立的 [ClawHub CLI](/clawhub/cli) 处理 [ 发布 ](/clawhub/publishing)、注册表维护和 [ 删除 ClawHub 技能 ](/cli/skills#remove-a-clawhub-skill)。

相关：

- 技能系统：[技能](/tools/skills)
- 技能创作：[创作技能](/tools/creating-skills)
- 技能工坊：[Skill Workshop](/tools/skill-workshop)
- 技能配置：[技能配置](/tools/skills-config)

## <a id="commands"></a> 命令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install @owner/<slug>
openclaw skills install @owner/<slug> --version <version>
openclaw skills install skills-sh:<owner>/<repo>/<slug>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
openclaw skills install @owner/<slug> --force
openclaw skills install @owner/<slug> --force-install
openclaw skills install @owner/<slug> --acknowledge-install-policy-warning
openclaw skills install @owner/<slug> --agent <id>
openclaw skills install @owner/<slug> --global
openclaw skills update @owner/<slug>
openclaw skills update @owner/<slug> --force
openclaw skills update @owner/<slug> --force-install
openclaw skills update @owner/<slug> --acknowledge-install-policy-warning
openclaw skills update @owner/<slug> --global
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills update --all --global
openclaw skills verify @owner/<slug>
openclaw skills verify @owner/<slug> --json
openclaw skills verify @owner/<slug> --version <version>
openclaw skills verify @owner/<slug> --tag <tag>
openclaw skills verify @owner/<slug> --card
openclaw skills verify @owner/<slug> --global
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills list --agent <id>
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills info <name> --agent <id>
openclaw skills check
openclaw skills check --agent <id>
openclaw skills check --json
openclaw skills workshop list
openclaw skills workshop changes --limit 20
openclaw skills workshop show <name>
openclaw skills workshop archive <name> --reason "Superseded"
openclaw skills workshop restore <name>
```

`search`、`update`和`verify`直接使用ClawHub。 `install @owner/<slug>` 安装本机 ClawHub 技能。 `install skills-sh:<owner>/<repo>/<slug>` 要求 ClawHub 将外部列表解析为其精确同步的 GitHub 提交； OpenClaw 不会从 skills.sh. 下载这些条目显示为 **未由 ClawHub** 扫描，并且通过更新和验证保留信任状态。声称或 ClawHub- 扫描的技能使用 `@owner/<slug>`。 `install git:owner/repo[@ref]` 克隆非托管 Git 技能，`install ./path` 复制本地技能目录。当根 `SKILL.md` 在相同的内容规则下不可加载时，两者都会在复制之前失败：`skills.limits.maxSkillFileBytes` 内带有描述的 frontmatter。硬链接源文件将被复制为新文件，以便该链接不会通过检查。默认情况下，`install`、`update` 和 `verify` 的目标是活动工作区 `skills/` 目录；对于 `--global`，他们的目标是共享托管技能目录。 `list`/`info`/`check` 和裸 `openclaw skills` 请求所选网关的权威技能清单。配置的远程网关或显式 `OPENCLAW_GATEWAY_URL` 永远不会回退到客户端本地技能：丢失 URL、连接失败和身份验证错误仍然可见。只有隐式选择的本地网关在不可用时才能回退到本地清单。工作区支持的命令从 `--agent <id>` 解析目标工作区，然后解析当前工作目录（如果位于已配置的代理工作区中），然后解析默认代理。

搜索结果仅将 `v` 添加到数字版本标签，保留现有前缀和构建名称。 JSON 输出保留注册表的原始版本值。

技能表将水平选项卡呈现为单个空格，因此描述与相邻列保持对齐。 JSON 输出将描述和路径中的制表符和行结尾保留为转义字符。

`info` 在元数据键之前解析确切的技能名称。键、不区分大小写和分隔符标准化匹配必须标识一项技能；不明确的选择器会失败，而不是选择发现顺序。

`check` 分离 **inventory**、**readiness** 和 **visibility**：

- **Inventory** 表示 OpenClaw 在已配置的根或捆绑源中找到该技能，并且可以报告其状态。
- **Readiness** 表示所选网关或节点满足技能声明的先决条件，因此有资格运行。
- **Visibility** 表示在应用代理过滤器和调用标志后，合格技能将暴露于所选代理的提示、选择器或命令界面。

`check` 报告缺少的先决条件，与代理排除无关：被代理白名单排除的技能也可能出现在 **缺少的要求** 下。残疾技能和被捆绑许可名单阻止的技能保留各自的准备类别。将列出的缺少要求的技能视为存在于清单中，但目前不符合条件或对客服人员不可见；在期望模型成功使用之前安装或配置报告的先决条件。

工坊命令保留相同的目标边界。在明确选择的网关失败后，它们永远不会读取或改变客户端本地状态；有意离线行为仅适用于隐式选择的本地网关。

Git 和本地目录安装需要 `SKILL.md` 位于源根目录。安装 slug 有效时来自 `SKILL.md` frontmatter `name`，然后是源目录或存储库名称；使用 `--as <slug>` 覆盖它。 `--version` 仅是 ClawHub-。技能安装不支持 npm 软件包规范或 zip/archive 路径，并且 `openclaw skills update` 仅更新 ClawHub-tracked 安装。

由入门流程或 Skills 设置触发的 Gateway 支持的技能依赖安装，会改用单独的 `skills.install` 请求路径。

当 `security.installPolicy` 在交互式终端中返回 `warn` 时，OpenClaw 打印原因和结果，然后询问 `type: '<skill>' to install anyway`（或 `update anyway`）。如果完整呈现的评论超过 4,000 个字符，则 OpenClaw 在提示之前停止；首先减少或合并政策产出。匹配的答案会在继续之前再次评估所演的技能。拒绝且非交互式的直接 CLI 命令在提交前停止；经过审查，`--acknowledge-install-policy-warning` 是对该命令调用中每个警告的显式非交互式批准。每个批准的警告都会在继续之前重新评估。自动和托管技能安装本身无法使用该标志。当存在等效的直接 CLI 命令时，使用该命令；否则，更改 `security.installPolicy` 以针对已审核的请求返回 `allow`，然后重试受管流。 `--force` 和确认都不会覆盖 `block` 或策略失败。

注意：

| Flag/behavior                    | 描述                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search [query...]`              | 可选查询；忽略它即可浏览 ClawHub 趋势技能源。                                                                                                                                                                                                                                                               |
| `search --limit <n>`             | 限制返回的结果数量。                                                                                                                                                                                                                                                                                                            |
| `install git:owner/repo[@ref]`   | 安装一个 Git 技能。分支引用可以包含斜杠，例如 `git:owner/repo@feature/foo`。                                                                                                                                                                                                                                      |
| `install ./path/to/skill`        | 安装根目录包含 `SKILL.md` 的本地目录。                                                                                                                                                                                                                                                                        |
| `install --as <slug>`            | 覆盖 Git 和本地目录安装时推断出的 slug。                                                                                                                                                                                                                                                                 |
| `install --version <version>`    | 适用于原生 ClawHub 技能引用，不适用于 `skills-sh:` 引用；镜像引用已经标识了精确同步的提交。                                                                                                                                                                                             |
| `install --force`                | 覆盖现有工作区中具有相同 slug 的技能文件夹。                                                                                                                                                                                                                                                                  |
| `update --force`                 | 即使已安装的文件不再与记录的安装摘要匹配，也会替换跟踪的技能。如果没有它，更新将保留本地更改。预摘要安装需要进行一次强制更新，然后才能验证后续更新。单独强制使用这些技能； `--all --force` 还用检测到的本地编辑替换技能。 |
| `install/update --force-install` | 在 ClawHub 扫描完成之前安装待处理的 GitHub- 支持的 ClawHub 技能。                                                                                                                                                                                                                                                   |
| `--global`                       | 指向共享的受管技能目录；不能与 `--agent <id>` 组合使用。                                                                                                                                                                                                                                                  |
| `--agent <id>`                   | 指向一个已配置的代理工作区；覆盖当前工作目录推断结果。                                                                                                                                                                                                                                            |
| `update @owner/<slug>`           | 更新单个受跟踪的技能。添加 `--global` 可将目标设为共享的受管技能目录，而不是工作区。                                                                                                                                                                                                            |
| `update --all`                   | 更新所选工作区中受跟踪的 ClawHub 安装，或在使用 `--global` 时更新共享的受管技能目录。                                                                                                                                                                                                               |
| `verify @owner/<slug>`           | 默认打印 ClawHub 的 `clawhub.skill.verify.v1` JSON 信封。接受 `--json` 作为显式的机器输出写法。为了兼容性，在技能已安装或引用明确时接受不带所有者的 slug；带所有者的引用可避免发布者歧义。                                                  |
| `verify` 出处              | 当 ClawHub 返回服务器解析的源来源时，验证 JSON 是否还包含提交固定的 `openclaw.verifiedSourceUrl`。不可用或自行声明的源 URL 仅保留在原始出处信封中，不会被提升。                                                                                           |
| `verify` 版本选择器        | 对于已安装的 ClawHub 技能，`verify` 使用 `.clawhub/origin.json`，因此会根据技能来源的注册表验证已安装的版本。当存在 origin 元数据时，`--version` 和 `--tag` 会覆盖版本选择器，但仍使用该已安装注册表。                                                                    |
| `verify --card`                  | 打印生成的技能卡Markdown而不是JSON。当 ClawHub 返回 `ok: false` 或 `decision: "fail"` 时，以非零值退出。                                                                                                                                                                                                  |
| 技能卡指纹           | 已安装的 ClawHub 软件包可以包含生成的 `skill-card.md`。OpenClaw 将验证视为 ClawHub 服务器的决定，不会仅仅因为生成的卡片改变了软件包指纹就拒绝已安装的技能。                                                                                              |
| `check --agent <id>`             | 检查所选代理的工作区，并报告哪些已就绪技能实际上对该代理的提示词或命令界面可见。                                                                                                                                                                                              |
| `workshop --agent <id>`          | 在 Workshop 叶命令之前或之后接受，例如 `workshop --agent <id> list` 或 `workshop list --agent <id>`。如果两者都提供，则叶子值获胜。                                                                                                                                                            |
| `list`                           | 未提供子命令时的默认操作。                                                                                                                                                                                                                                                                                    |
| `list`/`info`/`check` 输出     | 渲染输出转到标准输出。使用 `--json`，机器可读的有效负载保留在管道和脚本的标准输出上。                                                                                                                                                                                                                |

在支持完整扫描仪报告、验证的服务器上JSON包括`security.scannerReports.aig`（整个上游SARIF报告）和`security.scannerReports.skillspector`（整个上游JSON报告）当ClawHub保留了他们。嵌套扫描仪字段保持不变，包括覆盖范围和不完整的分析细节。一份报告是`null`不可用时，包括未保留完整输出的旧扫描；摘要不被替代。较旧的服务器可能会省略`security.scannerReports`完全。`verify`读取存储的扫描并且不会启动另一次扫描。验证响应最多可达64 MiB；较大的响应会在不打印部分报告的情况下显式失败。其他ClawHub JSON请求保留其16 MiB限制。

## <a id="release-trust"></a> 解除信任

社区 ClawHub 技能安装和更新在下载前检查信任。版本化社区存档版本使用精确版本信任元数据。解析器支持的 GitHub 技能依赖于 ClawHub 的安装解析器在返回固定提交之前强制执行扫描和强制安装策略；在扫描完成之前使用 `--force-install` 安装待处理的 GitHub- 支持的技能。恶意或被阻止的社区发布将被拒绝。审核结果打印准确的 ClawHub 审核概述和详细信息链接，然后继续。官方 ClawHub 技能发布者和捆绑的 OpenClaw 技能源绕过此发布信任检查。

## <a id="remove-a-clawhub-skill"></a> 删除 ClawHub 技能

使用独立的 ClawHub CLI 删除 ClawHub- 跟踪技能。如果未安装 CLI，请先显式安装：

```bash
npm i -g clawhub
clawhub uninstall @owner/my-skill
```

CLI 会在删除技能目录及其 `.clawhub/lock.json` 条目之前请求确认。请使用已安装技能的所有者限定名称或简写 slug，而不是其原始的 `skills-sh:` 引用。

选择安装技能时使用的同一根目录：对于特定代理的技能，使用代理工作区；对于使用 `--global` 安装的共享技能，使用 OpenClaw 状态目录：

```bash
clawhub --workdir /path/to/agent-workspace uninstall @owner/my-skill
clawhub --workdir ~/.openclaw uninstall @owner/my-skill
```

如果设置了 `OPENCLAW_STATE_DIR`，则改用配置的状态目录来处理共享技能：

```bash
clawhub --workdir "$OPENCLAW_STATE_DIR" uninstall @owner/my-skill
```

默认的 [技能监视器](/tools/skills#snapshots-and-refresh) 会在代理的下一轮运行时检测到删除操作。如果已禁用监视，请启动新会话。

## <a id="personal-skill-library"></a> 个人技能库

`openclaw skills library` 管理选定网关上已识别呼叫者的技能。它使用与 Control UI 和代理工作流程相同的所有者感知服务；它永远不会在 CLI 主机上写入库数据库或修订目录。

```bash
openclaw skills library --help
```

列出您的图书馆：

```bash
openclaw skills library list --scope mine --json
```

从包含 `SKILL.md` 的目录创建私有技能：

```bash
openclaw skills library create ./my-skill --slug my-skill
```

在编辑之前阅读其稳定版 ID 和当前版本：

```bash
openclaw skills library read <skill-id> --json
```

仅更新说明，同时保留支持文件：

```bash
openclaw skills library update <skill-id> ./SKILL.md --expected-revision <revision-hash>
```

目录输入取代了完整的包。单个 `SKILL.md` 输入保留当前支持文件；重复 `--delete-file <relative-path>` 以显式删除文件。更新比较已读取的修订版；冲突需要查看较新的内容，而不是强制覆盖。支持文件是修订版的一部分，包括二进制资产和可执行标志。

私有导入ZIP：

```bash
openclaw skills library import ./my-skill.zip --slug my-skill
```

导入 ClawHub 技能而不发布您的库：

```bash
openclaw skills library import @owner/<slug> --clawhub --slug my-skill
```

`--version <version>` 选择 ClawHub 版本并需要 `--clawhub`。 `share`、`unshare`、`transfer`、`enable`、`disable`、`remove` 和 `rollback` 取 `<skill-id> --expected-revision <hash>`。回滚还需要 `--revision <retained-hash>`。

将精确的修订附加到现有会话：

```bash
openclaw skills library attach --session <session-key> --skill-id <skill-id> --revision <revision-hash>
```

`detach` 采取相同的会话和技能 ID。刷新一项选定的技能：

```bash
openclaw skills library refresh --session <session-key> --skill-id <skill-id>
```

省略 `--skill-id` 会刷新所有选定的技能，并且需要对每一项技能进行当前库访问。它永远不会用当前调用者的库替换选择。每个操作都会报告其对下一回合的影响。

使用 `list --session <session-key>` 检查选定的修订以及您可以附加的技能，而无需更改会话。 `read --session <session-key>` 还需要 `--revision <hash>` 并仅读取确切选定的版本；它不会公开其他私人修订或授予编辑它们的权限。

个人操作需要经过身份验证的网关配置文件。单用户网关上的 Control UI 使用持久所有者配置文件，但临时 CLI 连接不会继承它。单独的 CLI 共享令牌或密码仍然没有个人资料；在这种情况下，请使用现有的工作区命令。明确选择的远程网关永远不会回退到客户端本地个人库。

共享使团队成员可以使用技能，但不授予编辑权限。转移到团队所有权需要管理员权限。默认情况下，保存会影响新会话；为现有会话显式附加或刷新选择。删除会保留已选择的修订版本。请参阅 [ 个人库所有权和修订 ](/tools/skills#personal-skills-on-a-shared-gateway)。

## <a id="skill-workshop"></a> 技能工作坊

`openclaw skills workshop` 检查和管理所选代理的学习（研讨会）技能。代理自己创建和更新这些技能；每个更改都会立即应用并首先保存以前的版本。请参阅 [ 技能 Workshop](/tools/skill-workshop)。

```bash
openclaw skills workshop list
openclaw skills workshop changes --limit 20
openclaw skills workshop show release-notes
openclaw skills workshop show release-notes --file references/checklist.md
openclaw skills workshop show release-notes --version <version-id>
openclaw skills workshop archive release-notes --reason "Superseded by deploy-notes"
openclaw skills workshop restore release-notes
openclaw skills workshop restore release-notes --version <version-id>
```

| 命令                                        | 描述                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `list`                                         | 列出实时学习的技能及其使用次数，以及存档的技能。显示自主模式和技能根。                   |
| `changes [--limit <n>]`                        | 显示最近的更改，最新的在前：谁制作了这些更改（`agent`、`review`、`curator`、`user`）、操作和保存的版本 ID。 |
| `show <name> [--file <path>] [--version <id>]` | 从实时技能或保存的版本打印 `SKILL.md` 或一个支持文件。                                                  |
| `archive <name> [--reason <text>]`             | 向其智能体隐藏该技能。该技能保持可恢复状态。                                                                     |
| `restore <name> [--version <id>]`              | 恢复最新保存的版本或指定的版本。首先保存当前的Live Copy，因此恢复是不可撤消的。              |

每个 Workshop 命令接受 `--agent <id>` 和 `--json`。 `archive` 和 `restore` 在找零源中充当 `user`。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [技能](/tools/skills)
