---
summary: "ClawHub 指南：公共注册表、原生 OpenClaw 安装流程及 ClawHub CLI 工作流"
read_when:
  - 向新用户介绍 ClawHub
  - 安装、搜索或发布技能或插件
  - 解释 ClawHub CLI 标志和同步行为
title: "ClawHub"
---

ClawHub 是 **OpenClaw 技能和插件** 的公共注册表。

- 使用原生 `openclaw` 命令从 ClawHub 搜索/安装/更新技能和安装插件。
- 当需要注册表认证、发布、删除、取消删除或同步工作流时，使用独立的 `clawhub` CLI。

官网：[clawhub.ai](https://clawhub.ai)

## 原生 OpenClaw 流程

技能：

```bash
openclaw skills search "calendar"
openclaw skills install <skill-slug>
openclaw skills update --all
```

插件：

```bash
openclaw plugins install clawhub:<package>
openclaw plugins update --all
```

纯 npm 安全的插件规格也会在 npm 之前尝试从 ClawHub 获取：

```bash
openclaw plugins install openclaw-codex-app-server
```

原生 `openclaw` 命令安装到你的活动工作区并持久化源元数据，以便后续的 `update` 调用可以保持在 ClawHub 上。

插件安装会在归档安装运行前验证声明的 `pluginApi` 和 `minGatewayVersion`
兼容性，因此不兼容的主机会尽早失败，
而不是部分安装该包。

`openclaw plugins install clawhub:...` 只接受可安装的插件家族。
如果 ClawHub 包实际上是一个技能，OpenClaw 会停止并改为提示你使用
`openclaw skills install <slug>`。

## 什么是 ClawHub

- OpenClaw 技能和插件的公共注册表。
- 技能包和元数据的版本化存储。
- 用于搜索、标签和使用信号的发现界面。

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

1. 搜索你需要的内容：
   - `openclaw skills search "calendar"`
2. 安装技能：
   - `openclaw skills install <skill-slug>`
3. 启动新的 OpenClaw 会话以加载新技能。
4. 如果你想发布或管理注册表认证，也请安装独立的 `clawhub` CLI。

## 安装 ClawHub CLI

你仅需要在进行注册表认证工作流（如发布/同步）时使用此工具：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 它如何融入 OpenClaw

原生 `openclaw skills install` 会安装到活动工作区的 `skills/` 目录。`openclaw plugins install clawhub:...` 会记录正常的托管插件安装以及用于更新的 ClawHub 源元数据。

匿名的 ClawHub 插件安装在私有包上也会失败并关闭。
社区或其他非官方渠道仍然可以安装，但 OpenClaw 会发出警告，
以便操作人员在启用前审查来源和验证信息。

独立的 `clawhub` CLI 也会将技能安装到当前工作目录下的
`./skills` 中。如果配置了 OpenClaw 工作区，`clawhub`
会回退到该工作区，除非你覆盖 `--workdir`（或
`CLAWHUB_WORKDIR`）。OpenClaw 会从 `<workspace>/skills` 加载工作区技能，
并会在**下一次**会话中识别它们。如果你已经使用
`~/.openclaw/skills` 或内置技能，则工作区技能优先。

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

发布技能：

- `clawhub skill publish <path>`
- `--slug <slug>`：技能标识符。
- `--name <name>`：显示名称。
- `--version <version>`：Semver 版本。
- `--changelog <text>`：变更日志文本（可为空）。
- `--tags <tags>`：逗号分隔的标签（默认：`latest`）。

发布插件：

- `clawhub package publish <source>`
- `<source>` 可以是本地文件夹、`owner/repo`、`owner/repo@ref` 或 GitHub URL。
- `--dry-run`：构建准确的发布计划而不上传任何内容。
- `--json`：输出机器可读的输出用于 CI。
- `--source-repo`, `--source-commit`, `--source-ref`：当自动检测不足时的可选覆盖。

删除/取消删除（仅所有者/管理员）：

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
clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

批量扫描并备份多个技能：

```bash
clawhub sync --all
```

### 从 GitHub 发布插件

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
clawhub package publish https://github.com/your-org/your-plugin
```

代码插件必须在 `package.json` 中包含所需的 OpenClaw 元数据：

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

已发布的包应提供构建后的 JavaScript，并将 `runtimeExtensions`
指向该输出。如果没有构建文件，Git 检出安装仍然可以回退到 TypeScript 源码，
但构建后的运行时条目可以避免在启动、doctor 和插件加载路径中进行运行时 TypeScript
编译。

## 高级细节（技术）

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
- `CLAWHUB_DISABLE_TELEMETRY=1`：禁用 `sync` 的遥测。

## 相关内容

- [插件](/tools/plugin)
- [技能](/tools/skills)
- [社区插件](/plugins/community)
