---
summary: "ClawHub：OpenClaw 技能和插件的公共注册表，原生安装流程，以及 clawhub CLI"
read_when:
  - 搜索、安装或更新技能或插件时
  - 将技能或插件发布到注册表时
  - 配置 clawhub CLI 或其环境覆盖项时
title: "ClawHub"
sidebarTitle: "ClawHub"
---

ClawHub 是 **OpenClaw 技能和插件** 的公共注册表。

- 使用原生 `openclaw` 命令来搜索、安装和更新技能，以及从 ClawHub 安装插件。
- 使用单独的 `clawhub` CLI 来进行注册表认证、发布、删除/取消删除，以及同步工作流。

站点：[clawhub.ai](https://clawhub.ai)

## 快速开始

<Steps>
  <Step title="搜索">
    ```bash
    openclaw skills search "calendar"
    ```
  </Step>
  <Step title="安装">
    ```bash
    openclaw skills install <skill-slug>
    ```
  </Step>
  <Step title="使用">
    启动一个新的 OpenClaw 会话——它会加载这个新技能。
  </Step>
  <Step title="发布（可选）">
    对于需要注册表认证的工作流（发布、同步、管理），请安装
    单独的 `clawhub` CLI：

    ```bash
    npm i -g clawhub
    # 或
    pnpm add -g clawhub
    ```

  </Step>
</Steps>

## 原生 OpenClaw 流程

<Tabs>
  <Tab title="技能">
    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生 `openclaw` 命令会安装到你当前的工作区中，并
    保留来源元数据，因此后续的 `update` 调用可以继续依赖 ClawHub。

  </Tab>
  <Tab title="插件">
    ```bash
    openclaw plugins install clawhub:<package>
    openclaw plugins update --all
    ```

    裸 npm 安全的插件规格也会先尝试在 npm 之前对 ClawHub 进行解析：

    ```bash
    openclaw plugins install openclaw-codex-app-server
    ```

    当你想要仅使用 npm 解析、而不进行 ClawHub 查找时，请使用 `npm:<package>`：

    ```bash
    openclaw plugins install npm:openclaw-codex-app-server
    ```

    插件安装会在归档安装运行前验证所声明的 `pluginApi` 和
    `minGatewayVersion` 兼容性，因此不兼容的主机会尽早失败，
    而不是部分安装该包。

  </Tab>
</Tabs>

<Note>
`openclaw plugins install clawhub:...` 只接受可安装的插件
家族。如果 ClawHub 包实际上是一个技能，OpenClaw 会停止并
改为指引你使用 `openclaw skills install <slug>`。

匿名 ClawHub 插件安装对私有包也会失败关闭。

社区或其他非官方渠道仍然可以安装，但 OpenClaw 会发出警告，
以便运维人员在启用它们之前审查来源和验证情况。
</Note>

## ClawHub 是什么

- OpenClaw 技能和插件的公共注册表。
- 技能包及其元数据的版本化存储。
- 用于搜索、标签和使用信号的发现入口。

一个典型的技能是一个版本化的文件包，其中包括：

- 一个 `SKILL.md` 文件，包含主要描述和用法。
- 该技能使用的可选配置、脚本或辅助文件。
- 标签、摘要和安装要求等元数据。

ClawHub 使用元数据来驱动发现，并安全地暴露技能
能力。注册表会跟踪使用信号（星标、下载量）来
改进排序和可见性。每次发布都会创建一个新的 semver
版本，注册表会保留版本历史，以便用户审计
变更。

## 工作区与技能加载

单独的 `clawhub` CLI 也会将技能安装到你当前工作目录下的
`./skills`。如果已配置 OpenClaw 工作区，`clawhub`
会回退到该工作区，除非你覆盖 `--workdir`
（或 `CLAWHUB_WORKDIR`）。OpenClaw 会从
`<workspace>/skills` 加载工作区技能，并在**下一次**会话中
将它们拾取。

如果你已经在使用 `~/.openclaw/skills` 或内置技能，工作区
技能会优先。关于技能如何加载、
共享和受限的更多细节，请参见 [技能](/tools/skills)。

## 服务特性

| 特性               | 说明                                                       |
| ------------------ | ---------------------------------------------------------- |
| 公共浏览           | 技能及其 `SKILL.md` 内容可公开查看。                        |
| 搜索               | 基于嵌入（向量搜索），不只是关键字。                         |
| 版本管理           | semver、更新日志和标签（包括 `latest`）。                  |
| 下载               | 每个版本一个 zip。                                          |
| 星标和评论         | 社区反馈。                                                  |
| 审核               | 批准和审计。                                                |
| 面向 CLI 的 API    | 适合自动化和脚本化。                                         |

## 安全与审核

ClawHub 默认是开放的——任何人都可以上传技能，但 GitHub
账号必须**至少注册一周**才能发布。这可以减缓滥用，
同时不会阻止合法贡献者。

<AccordionGroup>
  <Accordion title="举报">
    - 任何已登录用户都可以举报技能。
    - 必须填写举报原因，并会被记录。
    - 每个用户同一时间最多可以有 20 个活跃举报。
    - 超过 3 个不同用户举报的技能会默认被自动隐藏。
  </Accordion>
  <Accordion title="审核">
    - 审核员可以查看被隐藏的技能，将其取消隐藏、删除，或封禁用户。
    - 滥用举报功能可能导致账号被封禁。
    - 想成为审核员？请在 OpenClaw Discord 中询问，并联系审核员或维护者。
  </Accordion>
</AccordionGroup>

## ClawHub CLI

你只在注册表认证的工作流中需要它，例如
发布/同步。

### 全局选项

<ParamField path="--workdir <dir>" type="string">
  工作目录。默认：当前目录；会回退到 OpenClaw 工作区。
</ParamField>
<ParamField path="--dir <dir>" type="string" default="skills">
  技能目录，相对于 workdir。
</ParamField>
<ParamField path="--site <url>" type="string">
  站点基础 URL（浏览器登录）。
</ParamField>
<ParamField path="--registry <url>" type="string">
  注册表 API 基础 URL。
</ParamField>
<ParamField path="--no-input" type="boolean">
  禁用提示（非交互式）。
</ParamField>
<ParamField path="-V, --cli-version" type="boolean">
  打印 CLI 版本。
</ParamField>

### 命令

<AccordionGroup>
  <Accordion title="认证（login / logout / whoami）">
    ```bash
    clawhub login              # 浏览器流程
    clawhub login --token <token>
    clawhub logout
    clawhub whoami
    ```

    登录选项：

    - `--token <token>` — 粘贴一个 API token。
    - `--label <label>` — 为浏览器登录 token 存储的标签（默认：`CLI token`）。
    - `--no-browser` — 不打开浏览器（需要 `--token`）。

  </Accordion>
  <Accordion title="搜索">
    ```bash
    clawhub search "query"
    ```

    搜索技能。若要发现插件/包，请使用 `clawhub package explore`。

    - `--limit <n>` — 最大结果数。

  </Accordion>
  <Accordion title="浏览 / 检查插件">
    ```bash
    clawhub package explore --family code-plugin
    clawhub package explore "episodic-claw" --family code-plugin
    clawhub package inspect episodic-claw
    ```

    `package explore` 和 `package inspect` 是 ClawHub CLI 中用于插件/包发现和元数据检查的入口。原生 OpenClaw 安装仍然使用 `openclaw plugins install clawhub:<package>`。

    选项：

    - `--family skill|code-plugin|bundle-plugin` — 过滤包家族。
    - `--official` — 仅显示官方包。
    - `--executes-code` — 仅显示会执行代码的包。
    - `--version <version>` / `--tag <tag>` — 检查特定包版本。
    - `--versions`、`--files`、`--file <path>` — 检查包历史和文件。
    - `--json` — 机器可读输出。

  </Accordion>
  <Accordion title="安装 / 更新 / 列表">
    ```bash
    clawhub install <slug>
    clawhub update <slug>
    clawhub update --all
    clawhub list
    ```

    选项：

    - `--version <version>` — 安装或更新到特定版本（`update` 仅支持单个 slug）。
    - `--force` — 如果文件夹已存在则覆盖，或当本地文件与任何已发布版本都不匹配时覆盖。
    - `clawhub list` 会读取 `.clawhub/lock.json`。

  </Accordion>
  <Accordion title="发布技能">
    ```bash
    clawhub skill publish <path>
    ```

    选项：

    - `--slug <slug>` — 技能 slug。
    - `--name <name>` — 显示名称。
    - `--version <version>` — semver 版本。
    - `--changelog <text>` — 更新日志文本（可以为空）。
    - `--tags <tags>` — 以逗号分隔的标签（默认：`latest`）。

  </Accordion>
  <Accordion title="发布插件">
    ```bash
    clawhub package publish <source>
    ```

    `<source>` 可以是本地文件夹、`owner/repo`、`owner/repo@ref`，或一个
    GitHub URL。

    选项：

    - `--dry-run` — 在不上传任何内容的情况下构建完整的发布计划。
    - `--json` — 为 CI 输出机器可读结果。
    - `--source-repo`、`--source-commit`、`--source-ref` — 当自动检测不足时可用的可选覆盖项。

  </Accordion>
  <Accordion title="删除 / 取消删除（拥有者或管理员）">
    ```bash
    clawhub delete <slug> --yes
    clawhub undelete <slug> --yes
    ```
  </Accordion>
  <Accordion title="同步（扫描本地 + 发布新增或更新）">
    ```bash
    clawhub sync
    ```

    选项：

    - `--root <dir...>` — 额外的扫描根目录。
    - `--all` — 不经提示上传全部内容。
    - `--dry-run` — 显示将要上传的内容。
    - `--bump <type>` — 更新时使用 `patch|minor|major`（默认：`patch`）。
    - `--changelog <text>` — 非交互式更新的更新日志。
    - `--tags <tags>` — 以逗号分隔的标签（默认：`latest`）。
    - `--concurrency <n>` — 注册表检查并发数（默认：`4`）。

  </Accordion>
</AccordionGroup>

## 常见工作流

<Tabs>
  <Tab title="搜索">
    ```bash
    clawhub search "postgres backups"
    ```
  </Tab>
  <Tab title="查找插件">
    ```bash
    clawhub package explore --family code-plugin
    clawhub package explore "memory" --family code-plugin
    clawhub package inspect episodic-claw
    ```
  </Tab>
  <Tab title="安装">
    ```bash
    clawhub install my-skill-pack
    ```
  </Tab>
  <Tab title="更新全部">
    ```bash
    clawhub update --all
    ```
  </Tab>
  <Tab title="发布单个技能">
    ```bash
    clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
    ```
  </Tab>
  <Tab title="同步多个技能">
    ```bash
    clawhub sync --all
    ```
  </Tab>
  <Tab title="从 GitHub 发布插件">
    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    clawhub package publish your-org/your-plugin@v1.0.0
    clawhub package publish https://github.com/your-org/your-plugin
    ```
  </Tab>
</Tabs>

### 插件包元数据

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

已发布的包应当提供**构建后的 JavaScript**，并将
`runtimeExtensions` 指向该输出。如果没有构建产物，Git 检出安装仍然可
回退到 TypeScript 源码，但构建后的运行时条目可以避免在启动、
doctor 和插件加载路径中进行运行时 TypeScript 编译。

## 版本管理、锁文件和遥测

<AccordionGroup>
  <Accordion title="版本管理和标签">
    - 每次发布都会创建一个新的 **semver** `SkillVersion`。
    - 标签（如 `latest`）指向某个版本；移动标签可让你回滚。
    - 变更日志按版本附加，在同步或发布更新时可以为空。
  </Accordion>
  <Accordion title="本地更改与仓库版本">
    更新会使用内容哈希将本地技能内容与仓库版本进行比较。如果本地文件与任何已发布版本都不匹配，CLI 会在覆盖前询问（在非交互式运行中则需要 `--force`）。
  </Accordion>
  <Accordion title="同步扫描和回退根目录">
    `clawhub sync` 会先扫描你当前的工作目录。如果未找到任何技能，它会回退到已知的旧位置（例如
    `~/openclaw/skills` 和 `~/.openclaw/skills`）。这样设计是为了
    在不需要额外标志的情况下找到旧的技能安装。
  </Accordion>
  <Accordion title="存储和锁文件">
    - 已安装的技能会记录在你的工作目录下的 `.clawhub/lock.json` 中。
    - 身份验证令牌存储在 ClawHub CLI 配置文件中（可通过 `CLAWHUB_CONFIG_PATH` 覆盖）。
  </Accordion>
  <Accordion title="遥测（安装次数）">
    当你登录后运行 `clawhub sync` 时，CLI 会发送一个最小
    快照来计算安装次数。你可以完全禁用此功能：

    ```bash
    export CLAWHUB_DISABLE_TELEMETRY=1
    ```

  </Accordion>
</AccordionGroup>

## 环境变量

| 变量                          | 作用                                          |
| ----------------------------- | ----------------------------------------------- |
| `CLAWHUB_SITE`                | 覆盖站点 URL。                                 |
| `CLAWHUB_REGISTRY`            | 覆盖仓库 API URL。                             |
| `CLAWHUB_CONFIG_PATH`         | 覆盖 CLI 存储令牌/配置的位置。                  |
| `CLAWHUB_WORKDIR`             | 覆盖默认工作目录。                              |
| `CLAWHUB_DISABLE_TELEMETRY=1` | 禁用 `sync` 上的遥测。                          |

## 相关内容

- [社区插件](/plugins/community)
- [插件](/tools/plugin)
- [技能](/tools/skills)