---
summary: "`openclaw skills` 的 CLI 参考（搜索/安装/更新/验证/列表/信息/检查/工作坊）"
read_when:
  - 你想查看哪些技能可用并已准备好运行
  - 你想在 ClawHub 中搜索技能，或从 ClawHub、Git、本地目录安装技能
  - 你想使用 ClawHub 验证某个 ClawHub 技能
  - 你想排查技能缺失的二进制文件 / 环境 / 配置问题
title: "技能"
---

# `openclaw skills`

检查本地技能、搜索 ClawHub、从 ClawHub/Git/本地目录安装技能、验证 ClawHub 技能，并更新由 ClawHub 跟踪的安装项。

相关：

- 技能系统：[技能](/tools/skills)
- 技能工作坊：[技能工作坊](/tools/skill-workshop)
- 技能配置：[技能配置](/tools/skills-config)
- ClawHub 安装：[ClawHub](/clawhub/cli)

## 命令

```bash
openclaw skills search "日历"
openclaw skills search --limit 20 --json
openclaw skills install @owner/<slug>
openclaw skills install @owner/<slug> --version <version>
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
openclaw skills workshop propose-create --name "qa-check" --description "QA 检查清单" --proposal ./PROPOSAL.md
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "不适合复用"
openclaw skills workshop quarantine <proposal-id> --reason "需要安全审查"
```

`search`、`update` 和 `verify` 直接使用 ClawHub。`install @owner/<slug>`
会安装一个 ClawHub 技能，`install git:owner/repo[@ref]` 会克隆一个 Git 技能，
而 `install ./path` 会复制一个本地技能目录。默认情况下，`install`、
`update` 和 `verify` 会针对活动工作区的 `skills/` 目录；加上
`--global` 后，则会针对共享的受管技能目录。`list`/`info`/`check`
仍然会检查当前工作区和配置中可见的本地技能。基于工作区的命令会先通过
`--agent <id>` 解析目标工作区，然后在当前工作目录位于已配置的 agent
工作区内时使用该工作目录，最后才使用默认 agent。

Git 和本地目录安装要求源根目录中存在 `SKILL.md`。安装 slug 会先取自
`SKILL.md` frontmatter 中有效的 `name`，否则取源目录或仓库名；可使用
`--as <slug>` 覆盖它。`--version` 仅适用于 ClawHub。技能安装不支持 npm 包规格
或 zip/archive 路径，并且 `openclaw skills update` 只会更新由 ClawHub 跟踪的安装。

由入门流程或 Skills 设置触发的 Gateway 支持的技能依赖安装，会改用单独的
`skills.install` 请求路径。

注意：

| Flag/behavior                    | Description                                                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search [query...]`              | 可选查询；省略则浏览默认的 ClawHub 搜索源。                                                                                                                                                                                                                                      |
| `search --limit <n>`             | 限制返回结果数量。                                                                                                                                                                                                                                                                |
| `install git:owner/repo[@ref]`   | 安装一个 Git 技能。分支引用可以包含斜杠，例如 `git:owner/repo@feature/foo`。                                                                                                                                                                                                      |
| `install ./path/to/skill`        | 安装一个根目录包含 `SKILL.md` 的本地目录。                                                                                                                                                                                                                                       |
| `install --as <slug>`            | 覆盖 Git 和本地目录安装时推断出的 slug。                                                                                                                                                                                                                                         |
| `install --version <version>`    | 仅适用于 ClawHub 技能引用。                                                                                                                                                                                                                                                       |
| `install --force`                | 覆盖同一 slug 已存在的工作区技能文件夹。                                                                                                                                                                                                                                          |
| `install/update --force-install` | 在 ClawHub 扫描完成之前，先安装一个待处理的、由 GitHub 支持的 ClawHub 技能。                                                                                                                                                                                                      |
| `--global`                       | 针对共享的受管技能目录；不能与 `--agent <id>` 同时使用。                                                                                                                                                                                                                         |
| `--agent <id>`                   | 针对一个已配置的 agent 工作区；会覆盖当前工作目录推断。                                                                                                                                                                                                                            |
| `update @owner/<slug>`           | 更新单个已跟踪的技能。添加 `--global` 可针对共享的受管技能目录，而不是工作区。                                                                                                                                                                                                    |
| `update --all`                   | 更新所选工作区中的已跟踪 ClawHub 安装，或在使用 `--global` 时更新共享的受管技能目录。                                                                                                                                                                                             |
| `verify @owner/<slug>`           | 默认打印 ClawHub 的 `clawhub.skill.verify.v1` JSON 包装。没有 `--json` 标志，因为 JSON 本来就是默认输出。为兼容性考虑，当技能已安装或不歧义时接受裸 slug；使用带 owner 的引用可避免发布者歧义。                                                                                 |
| `verify` provenance              | 当 ClawHub 返回由服务器解析出的源 provenance 时，verify 的 JSON 还会包含一个固定到提交的 `openclaw.verifiedSourceUrl`。不可用或自声明的源 URL 只会保留在原始 provenance 包装中，不会被提升。                                                                                  |
| `verify` version selector        | `verify` 对已安装的 ClawHub 技能使用 `.clawhub/origin.json`，因此它会将已安装版本与其来源注册表进行校验。`--version` 和 `--tag` 会覆盖版本选择器，但在存在 origin 元数据时仍会保留该已安装注册表。                                                                                 |
| `verify --card`                  | 改为打印生成的 Skill Card Markdown，而不是 JSON。当 ClawHub 返回 `ok: false` 或 `decision: "fail"` 时以非零状态退出；除非 ClawHub 策略更改，未签名的签名信息仅用于提示。                                                                                                       |
| Skill Card fingerprint           | 已安装的 ClawHub bundle 可以包含生成的 `skill-card.md`。OpenClaw 将验证视为 ClawHub 服务器的决策，不会仅因为该生成卡片改变了 bundle 指纹就拒绝已安装技能。                                                                                                                      |
| `check --agent <id>`             | 检查所选 agent 的工作区，并报告哪些已就绪技能实际上对该 agent 的提示或命令界面可见。                                                                                                                                                                                              |
| `list`                           | 当未提供子命令时的默认操作。                                                                                                                                                                                                                                                      |
| `list`/`info`/`check` output     | 渲染后的输出会发送到 stdout。使用 `--json` 时，机器可读负载仍会保留在 stdout，便于管道和脚本使用。                                                                                                                                                                                |

社区 ClawHub 技能的安装和更新会在下载前检查信任状态。
带版本的社区归档发布会使用精确发布的信任元数据。
由解析器支持的 GitHub 技能依赖 ClawHub 的安装解析器来在返回固定提交之前强制执行
扫描和强制安装策略；在该扫描完成前，可使用
`--force-install` 安装一个待处理的、由 GitHub 支持的技能。恶意或被阻止的社区发布会被拒绝。
有风险的社区发布需要审查，并且当非交互式命令应在该审查后继续时，需要
`--acknowledge-clawhub-risk`。官方 ClawHub 技能发布者和捆绑的 OpenClaw 技能源会绕过此发布信任提示。

## 技能工作坊

`openclaw skills workshop` 管理所选工作区中的待处理技能提案。提案在应用之前不会成为生效技能。有关提案存储、support-file 保护措施、Gateway 方法和审批策略，请参见
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
