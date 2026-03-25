---
summary: "ClawHub guide: public registry, native OpenClaw install flows, and ClawHub CLI workflows"
read_when:
  - 向新用户介绍 ClawHub
  - 安装、搜索或发布技能时
  - 解释 ClawHub CLI 标志和同步行为时
title: "ClawHub"
---

# ClawHub

ClawHub is the public registry for **OpenClaw skills and plugins**.

- Use native `openclaw` commands to search/install/update skills and install
  plugins from ClawHub.
- Use the separate `clawhub` CLI when you need registry auth, publish, delete,
  undelete, or sync workflows.

官网：[clawhub.ai](https://clawhub.ai)

## Native OpenClaw flows

Skills:

```bash
openclaw skills search "calendar"
openclaw skills install <skill-slug>
openclaw skills update --all
```

Plugins:

```bash
openclaw plugins install clawhub:<package>
openclaw plugins update --all
```

Bare npm-safe plugin specs are also tried against ClawHub before npm:

```bash
openclaw plugins install openclaw-codex-app-server
```

Native `openclaw` commands install into your active workspace and persist source
metadata so later `update` calls can stay on ClawHub.

## What ClawHub is

- OpenClaw 技能的公共注册表。
- 技能包及元数据的版本化存储库。
- 用于搜索、标签和使用信号的发现入口。

## 它如何工作

1. 用户发布一个技能包（文件 + 元数据）。
2. ClawHub 存储该包，解析元数据，并分配版本号。
3. 注册表索引该技能便于搜索和发现。
4. 用户在 OpenClaw 中浏览、下载和安装技能。

## 你可以做什么

- 发布新技能及已有技能的新版本。
- 按名称、标签或搜索发现技能。
- 下载技能包并检查其文件。
- 举报存在滥用或不安全的技能。
- 如果你是管理员，可隐藏、取消隐藏、删除或封禁用户。

## 针对谁（适合初学者）

如果你想为你的 OpenClaw 代理添加新功能，ClawHub 是查找和安装技能的最简单途径。你不需要了解后台如何工作。你可以：

- 用自然语言搜索技能。
- 将技能安装进你的工作区。
- 以后用一条命令更新技能。
- 通过发布技能备份你自己的技能。

## 快速开始（非技术用户）

1. Search for something you need:
   - `openclaw skills search "calendar"`
2. Install a skill:
   - `openclaw skills install <skill-slug>`
3. Start a new OpenClaw session so it picks up the new skill.
4. If you want to publish or manage registry auth, install the separate
   `clawhub` CLI too.

## Install the ClawHub CLI

You only need this for registry-authenticated workflows such as publish/sync:

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 它如何融入 OpenClaw

Native `openclaw skills install` installs into the active workspace `skills/`
directory. `openclaw plugins install clawhub:...` records a normal managed
plugin install plus ClawHub source metadata for updates.

The separate `clawhub` CLI also installs skills into `./skills` under your
current working directory. If an OpenClaw workspace is configured, `clawhub`
falls back to that workspace unless you override `--workdir` (or
`CLAWHUB_WORKDIR`). OpenClaw loads workspace skills from `<workspace>/skills`
and will pick them up in the **next** session. If you already use
`~/.openclaw/skills` or bundled skills, workspace skills take precedence.

有关技能如何加载、共享和权限控制的详细说明，请参见
[技能](/tools/skills)。

## 技能系统概述

技能是一个版本化的文件包，教会 OpenClaw 如何执行具体任务。每次发布都创建一个新版本，注册表保留版本历史，便于用户审计变更。

典型技能包含：

- 一个包含主要描述和使用说明的 `SKILL.md` 文件。
- 可选的配置、脚本或技能支持文件。
- 元数据，如标签、摘要和安装需求。

ClawHub 利用元数据来支持技能发现，并安全地公开技能功能。注册表还跟踪使用信号（如星标和下载量）来提升排名和可见度。

## 服务提供内容（功能）

- **公共浏览** 技能及其 `SKILL.md` 内容。
- **基于嵌入向量的搜索**，不仅限于关键词。
- **版本管理**，支持 semver、变更日志和标签（包括 `latest`）。
- **版本下载**，以 zip 格式。
- **星标和评论** 以获取社区反馈。
- **内容审核机制**，支持审批和审计。
- **CLI 友好的 API** 便于自动化和脚本操作。

## 安全与审核

ClawHub 默认对外开放。任何人都可以上传技能，但发布需使用创建至少一周的 GitHub 账号。此措施有助于减缓滥用，却不封锁合法贡献者。

举报与审核：

- 任何已登录用户均可举报技能。
- 举报时需要填写原因并记录。
- 每个用户最多可同时保持 20 个有效举报。
- 举报数超过 3 个独立用户的技能默认自动隐藏。
- 管理员可查看隐藏技能，进行取消隐藏、删除或封禁用户。
- 滥用举报功能可能导致账号封禁。

有兴趣成为管理员？请在 OpenClaw Discord 询问并联系管理员或维护者。

## CLI 命令和参数

全局选项（对所有命令适用）：

- `--workdir <dir>`：工作目录（默认当前目录；回退到 OpenClaw 工作区）。
- `--dir <dir>`：相对于工作目录的技能目录（默认 `skills`）。
- `--site <url>`：网站基础 URL（浏览器登录用）。
- `--registry <url>`：注册表 API 基础 URL。
- `--no-input`：禁用交互式提示（非交互模式）。
- `-V, --cli-version`：打印 CLI 版本。

身份认证：

- `clawhub login`（浏览器流程）或 `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

其它选项：

- `--token <token>`：粘贴 API 令牌。
- `--label <label>`：浏览器登录令牌存储标签（默认：`CLI token`）。
- `--no-browser`：不打开浏览器（需配合 `--token` 使用）。

搜索：

- `clawhub search "query"`
- `--limit <n>`：最大返回结果数。

安装：

- `clawhub install <slug>`
- `--version <version>`：安装特定版本。
- `--force`：存在同名文件夹时强制覆盖。

更新：

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`：更新到指定版本（单个 slug）。
- `--force`：本地文件不匹配任何发布版本时强制覆盖。

列出：

- `clawhub list`（读取 `.clawhub/lock.json`）

发布：

- `clawhub publish <path>`
- `--slug <slug>`：技能别名。
- `--name <name>`：显示名称。
- `--version <version>`：semver 版本。
- `--changelog <text>`：变更日志文本（可为空）。
- `--tags <tags>`：逗号分隔标签（默认：`latest`）。

删除／恢复（仅所有者／管理员）：

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

同步（扫描本地技能并发布新增／更新）：

- `clawhub sync`
- `--root <dir...>`：额外扫描目录。
- `--all`：无提示全部上传。
- `--dry-run`：显示将上传内容。
- `--bump <type>`：更新版本号类型 `patch|minor|major`（默认：`patch`）。
- `--changelog <text>`：非交互更新时的变更日志。
- `--tags <tags>`：逗号分隔标签（默认：`latest`）。
- `--concurrency <n>`：注册表检查并发数（默认：4）。

## 代理的常见工作流

### 搜索技能

```bash
clawhub search "postgres backups"
```

### 下载新技能

```bash
clawhub install my-skill-pack
```

### 更新已安装技能

```bash
clawhub update --all
```

### 备份你的技能（发布或同步）

针对单个技能文件夹：

```bash
clawhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

批量扫描并备份多个技能：

```bash
clawhub sync --all
```

## 高级细节（技术部分）

### 版本管理和标签

- 每次发布都会创建一个新的 **semver** `SkillVersion`。
- 标签（如 `latest`）指向一个版本；移动标签可实现版本回滚。
- 变更日志归属于具体版本，同步或发布更新时可为空。

### 本地更改与注册表版本

更新时通过内容哈希比对本地技能与注册表版本。如果本地文件不匹配任何发布版本，CLI 会询问是否覆盖（非交互模式需使用 `--force`）。

### 同步扫描和回退目录

`clawhub sync` 优先扫描当前工作目录。如果找不到技能，会回退扫描已知的旧目录（例如 `~/openclaw/skills` 和 `~/.openclaw/skills`），方便发现旧版安装。

### 存储和锁文件

- 安装的技能记录于工作目录的 `.clawhub/lock.json`。
- 认证令牌存储在 ClawHub CLI 配置文件中（可通过 `CLAWHUB_CONFIG_PATH` 覆盖）。

### 远程统计（安装计数）

当你登录状态运行 `clawhub sync` 时，CLI 会发送最小快照用于计算安装量。你可以完全禁用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## 环境变量

- `CLAWHUB_SITE`：覆盖网站 URL。
- `CLAWHUB_REGISTRY`：覆盖注册表 API URL。
- `CLAWHUB_CONFIG_PATH`：覆盖 CLI 存储令牌/配置的位置。
- `CLAWHUB_WORKDIR`：覆盖默认工作目录。
- `CLAWHUB_DISABLE_TELEMETRY=1`：禁用 `sync` 时的遥测。
