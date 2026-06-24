---
summary: "`openclaw skills` 的 CLI 参考（search/install/update/verify/list/info/check/workshop）"
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
openclaw skills install @owner/<slug> --agent <id>
openclaw skills install @owner/<slug> --global
openclaw skills update @owner/<slug>
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

`search`, `update`, and `verify` 直接使用 ClawHub。`install @owner/<slug>`
安装一个 ClawHub 技能，`install git:owner/repo[@ref]` 克隆一个 Git 技能，且
`install ./path` 复制一个本地技能目录。默认情况下，`install`、`update`
和 `verify` 目标是活动工作区的 `skills/` 目录；使用 `--global` 时，它们
目标为共享的受管技能目录。`list`/`info`/`check` 仍然检查当前工作区和配置中
可见的本地技能。基于工作区的命令会先根据 `--agent <id>` 解析目标工作区，
如果当前工作目录位于已配置的代理工作区中，则使用当前工作目录，然后再使用
默认代理。

Git 和本地目录安装都要求源根目录下存在 `SKILL.md`。安装的 slug 会优先来自
`SKILL.md` frontmatter 中有效的 `name`，否则来自源目录或仓库名；可使用 `--as <slug>` 覆盖它。`--version` 仅适用于 ClawHub。技能安装不支持 npm 包规格或 zip/归档路径，并且 `openclaw skills update` 只会更新由 ClawHub 跟踪的安装项。

由入门流程或 Skills 设置触发的 Gateway 支持的技能依赖安装，会改用单独的
`skills.install` 请求路径。

注意：

- `search [query...]` 接受一个可选查询；省略它即可浏览默认的
  ClawHub 搜索信息流。
- `search --limit <n>` 会限制返回结果数量。
- `install git:owner/repo[@ref]` 安装一个 Git 技能。分支引用可以包含
  `/`，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安装一个其根目录包含 `SKILL.md` 的本地目录。
- `install --as <slug>` 会覆盖 Git 和本地目录安装的推断 slug。
- `install --version <version>` 仅适用于 ClawHub 技能引用。
- `install --force` 会覆盖同一 slug 的现有工作区技能文件夹。
- `--global` 目标是共享的受管技能目录，且不能与 `--agent <id>` 组合使用。
- `--agent <id>` 目标是一个已配置的代理工作区，并会覆盖当前工作目录推断。
- `update @owner/<slug>` 更新单个已跟踪的技能。添加 `--global` 可
  将目标改为共享的受管技能目录，而不是工作区。
- `update --all` 更新所选工作区中已跟踪的 ClawHub 安装项，或者在与
  `--global` 结合时更新共享的受管技能目录中的安装项。
- `verify @owner/<slug>` 默认会打印 ClawHub 的 `clawhub.skill.verify.v1` JSON
  封装。由于 JSON 本来就是默认输出，因此没有 `--json` 标志。当技能已经安装
  或不具歧义时，仍接受裸 slug 以保持兼容性，但使用带所有者限定的引用可避免
  发布者歧义。
- 当 ClawHub 返回由服务器解析的源溯源信息时，verify JSON 还会包含一个固定到
  提交的 `openclaw.verifiedSourceUrl`。不可用或自声明的源 URL 仅保留在原始
  溯源封装中，不会被提升。
- `verify` 对已安装的 ClawHub 技能使用 `.clawhub/origin.json`，因此它会根据
  技能来源的注册表来验证已安装版本。`--version` 和 `--tag` 会覆盖版本选择器，
  但在存在来源元数据时仍保留该已安装注册表。
- `verify --card` 会打印生成的 Skill Card Markdown，而不是 JSON。当 ClawHub 返回
  `ok: false` 或 `decision: "fail"` 时，该命令会以非零状态退出；除非 ClawHub
  策略发生变化，否则未签名的签名仅作信息展示。
- 已安装的 ClawHub bundle 可以包含生成的 `skill-card.md`。OpenClaw 将验证视为
  ClawHub 服务器决策，不会因为该生成卡片改变了 bundle 指纹，就拒绝已安装的技能。
- `check --agent <id>` 会检查所选代理的工作区，并报告哪些已就绪技能实际上对该代理的
  prompt 或命令界面可见。
- 当未提供子命令时，`list` 是默认动作。
- `list`、`info` 和 `check` 会将其渲染后的输出写入 stdout。使用
  `--json` 时，这意味着机器可读载荷会保留在 stdout 中，便于管道和脚本使用。

## 技能工作坊

`openclaw skills workshop` 用于管理所选工作区中的待处理技能提案。提案在应用之前都不算激活技能。有关提案存储、支持文件防护、Gateway 方法和审批策略，请参见
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

## 相关

- [CLI 参考](/cli)
- [技能](/tools/skills)
