---
summary: "`openclaw skills` 的 CLI 参考（搜索/安装/更新/验证/列表/信息/检查/工作坊）"
read_when:
  - 你想查看哪些技能可用且已准备好运行
  - 你想搜索 ClawHub，或从 ClawHub、Git 或本地目录安装技能
  - 你需要移除已安装的 ClawHub 技能
  - 你想使用 ClawHub 验证 ClawHub 技能
  - 你需要调试技能缺失的二进制文件、环境变量或配置
title: "技能"
---

# `openclaw skills`

检查本地技能、搜索 ClawHub、从 ClawHub/Git/本地目录安装技能、验证 ClawHub 技能，并更新由 ClawHub 跟踪的安装项。

相关：

- 技能系统：[技能](/tools/skills)
- 技能工作坊：[技能工作坊](/tools/skill-workshop)
- 技能配置：[技能配置](/tools/skills-config)
- ClawHub 安装：[ClawHub](/clawhub/cli)。

## 命令

```bash
openclaw skills search "日历"
openclaw skills search --limit 20 --json
openclaw skills install @owner/<slug>
openclaw skills install @owner/<slug> --version <version>
openclaw skills install skills-sh:<owner>/<repo>/<slug>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
openclaw skills install @owner/<slug> --force
openclaw skills install @owner/<slug> --force-install
openclaw skills install @owner/<slug> --acknowledge-clawhub-risk
openclaw skills install @owner/<slug> --agent <id>
openclaw skills install @owner/<slug> --global
openclaw skills update @owner/<slug>
openclaw skills update @owner/<slug> --force-install
openclaw skills update @owner/<slug> --acknowledge-clawhub-risk
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
openclaw skills curator status
openclaw skills curator status --json
openclaw skills workshop propose-create --name "qa-check" --description "QA checklist" --proposal ./PROPOSAL.md
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "不适合复用"
openclaw skills workshop quarantine <proposal-id> --reason "需要安全审查"
```

`search`、`update` 和 `verify` 直接使用 ClawHub。`install @owner/<slug>`
安装一个原生 ClawHub 技能。`install skills-sh:<owner>/<repo>/<slug>` 会让
ClawHub 将外部列表解析为其精确同步的 GitHub 提交；OpenClaw 不会从 skills.sh 下载。
这些条目会显示为
**未经过 ClawHub 扫描**，并且该信任状态会在更新和验证过程中保留。已声明或经过 ClawHub 扫描的技能使用
`@owner/<slug>`。`install git:owner/repo[@ref]` 会克隆一个未受管理的 Git 技能，而 `install
./path` 会复制一个本地技能目录。默认情况下，`install`、
`update` 和 `verify` 目标都是当前工作区的 `skills/` 目录；使用 `--global` 时，它们会指向共享的受管技能目录。`list`／`info`／`check`
仍然会检查当前工作区和配置中可见的本地技能。
基于工作区的命令会先通过 `--agent <id>` 解析目标工作区，然后在当前工作目录位于已配置的代理
工作区内时使用当前工作目录，否则使用默认代理。

Git 和本地目录安装要求源根目录中存在 `SKILL.md`。安装 slug 会先取自
`SKILL.md` frontmatter 中有效的 `name`，否则取源目录或仓库名；可使用
`--as <slug>` 覆盖它。`--version` 仅适用于 ClawHub。技能安装不支持 npm 包规格
或 zip／archive 路径，并且 `openclaw skills update` 只会更新由 ClawHub 跟踪的安装。

由入门流程或 Skills 设置触发的 Gateway 支持的技能依赖安装，会改用单独的
`skills.install` 请求路径。

注意：

| 标志／行为                       | 描述                                                                                                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search [query...]`              | 可选查询；省略它即可浏览默认的 ClawHub 搜索源。                                                                                                                                                                                                               |
| `search --limit <n>`             | 限制返回的结果数量。                                                                                                                                                                                                                                                           |
| `install git:owner/repo[@ref]`   | 安装一个 Git 技能。分支引用可以包含斜杠，例如 `git:owner/repo@feature/foo`。                                                                                                                                                                                     |
| `install ./path/to/skill`        | 安装根目录包含 `SKILL.md` 的本地目录。                                                                                                                                                                                                                       |
| `install --as <slug>`            | 覆盖 Git 和本地目录安装时推断出的 slug。                                                                                                                                                                                                                |
| `install --version <version>`    | 适用于原生 ClawHub 技能引用，不适用于 `skills-sh:` 引用；镜像引用已经标识了精确同步的提交。                                                                                                                                            |
| `install --force`                | 覆盖现有工作区中具有相同 slug 的技能文件夹。                                                                                                                                                                                                                 |
| `install/update --force-install` | 在 ClawHub 扫描完成前，安装待处理的、由 GitHub 支持的 ClawHub 技能。                                                                                                                                                                                                  |
| `--global`                       | 指向共享的受管技能目录；不能与 `--agent <id>` 组合使用。                                                                                                                                                                                                 |
| `--agent <id>`                   | 指向一个已配置的代理工作区；覆盖当前工作目录推断结果。                                                                                                                                                                                           |
| `update @owner/<slug>`           | 更新单个受跟踪的技能。添加 `--global` 可将目标设为共享的受管技能目录，而不是工作区。                                                                                                                                                           |
| `update --all`                   | 更新所选工作区中受跟踪的 ClawHub 安装，或在使用 `--global` 时更新共享的受管技能目录。                                                                                                                                                              |
| `verify @owner/<slug>`           | 默认打印 ClawHub 的 `clawhub.skill.verify.v1` JSON 信封。接受 `--json` 作为显式的机器输出写法。为了兼容性，在技能已安装或引用明确时接受不带所有者的 slug；带所有者的引用可避免发布者歧义。 |
| `verify` provenance              | 当 ClawHub 返回服务器解析的源 provenance 时，验证 JSON 还会包含固定提交的 `openclaw.verifiedSourceUrl`。不可用或自行声明的源 URL 仅保留在原始 provenance 信封中，不会被提升。                                          |
| `verify` version selector        | 对于已安装的 ClawHub 技能，`verify` 使用 `.clawhub/origin.json`，因此会根据技能来源的注册表验证已安装的版本。当存在 origin 元数据时，`--version` 和 `--tag` 会覆盖版本选择器，但仍使用该已安装注册表。                   |
| `verify --card`                  | 打印生成的 Skill Card Markdown，而不是 JSON。当 ClawHub 返回 `ok: false` 或 `decision: "fail"` 时以非零状态退出；除非 ClawHub 策略发生变化，否则未签名的签名仅提供信息。                                                                            |
| Skill Card fingerprint           | 已安装的 ClawHub 软件包可以包含生成的 `skill-card.md`。OpenClaw 将验证视为 ClawHub 服务器的决定，不会仅仅因为生成的卡片改变了软件包指纹就拒绝已安装的技能。                                             |
| `check --agent <id>`             | 检查所选代理的工作区，并报告哪些已就绪技能实际上对该代理的提示词或命令界面可见。                                                                                                                                             |
| `list`                           | 未提供子命令时的默认操作。                                                                                                                                                                                                                                   |
| `list`／`info`／`check` output     | 渲染后的输出会发送到 stdout。使用 `--json` 时，机器可读的载荷会保留在 stdout 中，以供管道和脚本使用。                                                                                                                                                               |
| `curator status --json`          | 返回由较早版本写入的基于存续时间的旧版生命周期状态。每日收集审查不使用此状态。                                                                                                                                                             |

社区 ClawHub 技能的安装和更新会在下载前检查信任状态。
带版本的社区归档发布会使用精确发布的信任元数据。
由解析器支持的 GitHub 技能依赖 ClawHub 的安装解析器来在返回固定提交之前强制执行
扫描和强制安装策略；在该扫描完成前，可使用
`--force-install` 安装一个待处理的、由 GitHub 支持的技能。恶意或被阻止的社区发布会被拒绝。
有风险的社区发布需要审查，并且当非交互式命令应在该审查后继续时，需要
`--acknowledge-clawhub-risk`。官方 ClawHub 技能发布者和捆绑的 OpenClaw 技能源会绕过此发布信任提示。

## 删除 ClawHub 技能

使用独立的 ClawHub CLI 删除由 ClawHub 跟踪的技能。如果尚未安装 CLI，请先明确安装：

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

## 技能工作坊

`openclaw skills workshop` 管理所选工作区中的待处理技能提案。提案在应用之前不会成为生效技能。有关提案存储、支持文件保护措施、网关方法和审批策略，请参见
[技能工作坊](/tools/skill-workshop)。

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "可重复的 QA 检查清单" \
  --proposal ./PROPOSAL.md
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "可重复的 QA 检查清单" \
  --proposal-dir ./qa-check-proposal
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "重复"
openclaw skills workshop quarantine <proposal-id> --reason "需要安全审查"
```

`propose-create`、`propose-update` 和 `revise` 也接受 `--goal <text>`
和 `--evidence <text>`，用于将提案的动机和支持说明与 `--proposal`/`--proposal-dir` 内容一起记录。

## 相关

- [CLI 参考](/cli)
- [技能](/tools/skills)
