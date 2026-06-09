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
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills install <slug> --global
openclaw skills update <slug>
openclaw skills update <slug> --global
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills update --all --global
openclaw skills verify <slug>
openclaw skills verify <slug> --version <version>
openclaw skills verify <slug> --tag <tag>
openclaw skills verify <slug> --card
openclaw skills verify <slug> --global
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

`search`、`update` 和 `verify` 直接使用 ClawHub。`install <slug>` 会安装
ClawHub 技能，`install git:owner/repo[@ref]` 会克隆一个 Git 技能，而
`install ./path` 会复制一个本地技能目录。默认情况下，`install`、`update`
和 `verify` 以活动工作区的 `skills/` 目录为目标；使用 `--global` 时，它们会
以共享的受管技能目录为目标。`list`/`info`/`check` 仍然检查当前工作区和配置
可见的本地技能。基于工作区的命令会先通过 `--agent <id>` 解析目标工作区，
然后在当前工作目录位于已配置的代理工作区内时使用当前工作目录，最后使用默认代理。

Git 和本地目录安装都要求源根目录下存在 `SKILL.md`。安装的 slug 会优先来自
`SKILL.md` frontmatter 中有效的 `name`，否则来自源目录或仓库名；可使用 `--as <slug>` 覆盖它。`--version` 仅适用于 ClawHub。技能安装不支持 npm 包规格或 zip/归档路径，并且 `openclaw skills update` 只会更新由 ClawHub 跟踪的安装项。

由入门流程或 Skills 设置触发的 Gateway 支持的技能依赖安装，会改用单独的
`skills.install` 请求路径。

注意：

- `search [query...]` 接受可选查询；如果省略，则浏览默认的
  ClawHub 搜索信息流。
- `search --limit <n>` 限制返回结果数量。
- `install git:owner/repo[@ref]` 安装一个 Git 技能。分支引用可以包含
  `/`，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安装一个根目录包含 `SKILL.md` 的本地目录。
- `install --as <slug>` 会覆盖 Git 和本地目录安装时推断出的 slug。
- `install --version <version>` 仅适用于 ClawHub 技能 slug。
- `install --force` 会覆盖同一 slug 已存在的工作区技能文件夹。
- `--global` 目标为共享的受管技能目录，且不能与 `--agent <id>` 组合使用。
- `--agent <id>` 目标为某个已配置的代理工作区，并覆盖当前工作目录推断。
- `update <slug>` 会更新单个已跟踪技能。添加 `--global` 可将目标改为
  共享的受管技能目录，而不是工作区。
- `update --all` 会更新所选工作区中的已跟踪 ClawHub 安装项，若与 `--global`
  组合，则会更新共享的受管技能目录中的安装项。
- `verify <slug>` 默认打印 ClawHub 的 `clawhub.skill.verify.v1` JSON 封装。因为
  JSON 本身就是默认输出，所以没有 `--json` 标志。
- `verify` 会对已安装的 ClawHub 技能使用 `.clawhub/origin.json`，因此会针对其来源
  的注册表验证已安装版本。若存在 origin 元数据，`--version` 和 `--tag` 会覆盖版本选择器，
  但仍保留该已安装的注册表。
- `verify --card` 会改为输出生成的 Skill Card Markdown，而不是 JSON。若 ClawHub 返回
  `ok: false` 或 `decision: "fail"`，命令会以非零状态退出；除非 ClawHub 策略变更，
  未签名签名仅作信息展示。
- 已安装的 ClawHub bundle 可以包含生成的 `skill-card.md`。OpenClaw 会将验证视为
  ClawHub 服务器的决策，不会因为该生成卡片改变了 bundle 指纹，就拒绝已安装技能。
- `check --agent <id>` 会检查所选代理的工作区，并报告哪些已就绪技能实际上对该代理的
  提示或命令界面可见。
- `list` 是未提供子命令时的默认动作。
- `list`、`info` 和 `check` 会将渲染后的输出写入 stdout。使用 `--json` 时，这意味着
  机器可读载荷会继续留在 stdout，便于管道和脚本使用。

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
