---
summary: "用于发现、安装、移除、发布和验证 OpenClaw 技能与插件的 ClawHub CLI 入口。"
read_when:
  - 你想从命令行使用 ClawHub
  - 你想通过 OpenClaw 安装 ClawHub 技能或插件
  - 你需要移除已安装的 ClawHub 技能
  - 你想发布 ClawHub 软件包
title: "ClawHub CLI"
---

# ClawHub CLI

有两个命令行入口可与 ClawHub 交互：

- `openclaw skills` / `openclaw plugins` - 为本地 OpenClaw 代理或网关发现、安装和更新软件包。
- 独立的 `clawhub` CLI - 移除已安装的技能，并处理包括登录、发布、同步和转移在内的发布者工作流。

## 发现与安装

```bash
openclaw skills search "calendar"
openclaw skills install @owner/<slug>
openclaw skills install @owner/<slug> --version <version> --global
openclaw skills install skills-sh:<owner>/<repo>/<slug>
openclaw skills update @owner/<slug>
openclaw skills update --all --acknowledge-clawhub-risk
openclaw skills verify @owner/<slug> --card

openclaw plugins search "calendar"
openclaw plugins install clawhub:<package>
openclaw plugins install clawhub:<package> --acknowledge-clawhub-risk
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
```

技能默认安装到当前工作区的 `skills/` 目录；添加
`--global` 可使用共享的托管技能目录。插件安装需要显式使用
`clawhub:` 前缀，以强制优先通过 ClawHub 解析，而不是 npm、git 或
本地路径。完整标志参考：[`openclaw skills`](/cli/skills) 和
[`openclaw plugins`](/cli/plugins)。

`skills-sh:` 是一个明确的外部目录引用。OpenClaw 会将其发送到
ClawHub，并安装解析器返回的、精确到提交并固定的 GitHub 源码；
它绝不会直接从 skills.sh 下载技能内容。未认领的条目会标记为
**未被 ClawHub 扫描**。已认领且经过 ClawHub 扫描的技能则使用
原生的 `@owner/<slug>` 形式。

### 发布信任

OpenClaw 会在下载之前检查发布的 ClawHub 信任状态，适用于
skills 和 plugins。带版本号的发布会使用精确的发布信任元数据；
基于解析器的 GitHub skills 会通过 ClawHub 的安装解析器，
在返回固定提交前强制执行扫描和强制安装策略。

- **恶意或被阻止** 的发布会被直接拒绝。
- **有风险** 的发布（非干净扫描、非阻止性的审核状态）会打印
  警告，并且需要使用 `--acknowledge-clawhub-risk` 才能继续
  非交互式操作。
- **官方 ClawHub 发布者/包以及捆绑的 OpenClaw 源代码** 会跳过
  信任提示和安全裁决获取。

## 移除已安装的技能

如果尚未安装独立的 ClawHub CLI，请先明确安装：

```bash
npm i -g clawhub
clawhub uninstall @owner/my-skill
```

该命令会请求确认，然后移除已安装的技能目录及其 ClawHub 锁定文件条目。当安装位置位于当前工作目录之外时，请选择原始代理工作区或共享的 OpenClaw 状态目录：

```bash
clawhub --workdir /path/to/agent-workspace uninstall @owner/my-skill
clawhub --workdir ~/.openclaw uninstall @owner/my-skill
```

对于自定义的 `OPENCLAW_STATE_DIR`，请将 `~/.openclaw` 替换为所配置的目录。有关工作区定位和技能刷新行为，请参阅[移除 ClawHub 技能](/cli/skills#remove-a-clawhub-skill)。

## 发布和维护

先安装一次独立 CLI，然后登录：

```bash
npm i -g clawhub
clawhub login
```

使用 `clawhub package publish` 发布插件包（文件夹路径、GitHub 仓库 `owner/repo[@ref]`，或
tarball URL）：

```bash
clawhub package publish ./my-plugin --dry-run
clawhub package publish ./my-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

使用 `clawhub skill publish` 发布技能文件夹：

```bash
clawhub skill publish ./skills/review-helper
clawhub skill publish ./skills/review-helper --version 1.0.0 --owner your-org
```

其他维护命令：

```bash
clawhub sync --all                                          # 扫描本地技能，发布新的/已更新的
clawhub package transfer @old-owner/package --to new-owner   # 将一个插件包移动到另一个发布者
clawhub skill rename old-slug new-slug                       # 重命名已发布的技能，并重定向旧的 slug
clawhub explore --sort trending                              # 浏览注册表，按趋势排序
```

## 相关内容

- [`openclaw skills`](/cli/skills) - 本地技能搜索、安装、更新和
  验证
- [`openclaw plugins`](/cli/plugins) - 插件搜索、安装、更新和
  检查
- [ClawHub 发布](/clawhub/publishing) - 所有者范围、发布验证、
  和审查流程
- [创建技能](/tools/creating-skills) - 技能编写和发布流程
- [构建插件](/plugins/building-plugins) - 插件包编写。
