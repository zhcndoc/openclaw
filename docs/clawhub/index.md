---
summary: "有关发现、安装、发布、安全性和 Clawhub CLI 的公共 ClawHub 概述。"
read_when:
  - "解释什么是 ClawHub"
  - "搜索、安装或更新技能或插件"
  - "将技能或插件发布到注册表"
  - "在 Openclaw 和 Clawhub CLI 流程之间进行选择"
title: "ClawHub"
sidebarTitle: "ClawHub"
---

# ClawHub

ClawHub 是 OpenClaw 技能和插件的公共注册表。

- 使用本机 `openclaw` 命令搜索、安装和更新技能以及安装来自 ClawHub 的插件。
- 使用单独的 `clawhub` CLI 进行注册表验证、发布和 delete/undelete 工作流程。

站点：[clawhub.ai](https://clawhub.ai)

## <a id="quick-start"></a> 快速开始

使用OpenClaw搜索并安装技巧：

```bash
openclaw skills search "calendar"
openclaw skills install @openclaw/demo
openclaw skills update --all
```

使用 OpenClaw 搜索并安装插件：

```bash
openclaw plugins search "calendar"
openclaw plugins install clawhub:<package>
openclaw plugins update --all
```

当您需要经过注册表验证的工作流程（例如发布或 delete/undelete）时，请安装 ClawHub CLI：

```bash
npm i -g clawhub
# or
pnpm add -g clawhub
```

## <a id="what-clawhub-hosts"></a> ClawHub 托管什么

| 表面        | 它存储什么                                               | 典型命令                              |
| -------------- | ------------------------------------------------------------ | -------------------------------------------- |
| 技能         | 带有 `SKILL.md` 和支持文件的版本化文本包 | `openclaw skills install @openclaw/demo`     |
| 代码插件   | 带有兼容性元数据的 OpenClaw 插件包         | `openclaw plugins install clawhub:<package>` |
| 捆绑插件 | 用于 OpenClaw 分发的打包插件包            | `clawhub package publish <source>`           |

ClawHub 跟踪 semver 版本、`latest` 等标签、更改日志、文件、下载、星级和安全扫描摘要。公共页面显示当前的注册表状态，以便用户可以在安装之前检查技能或插件。

## <a id="native-openclaw-flows"></a> Native OpenClaw 流量

本机 OpenClaw 命令安装到活动 OpenClaw 工作区并保留源元数据，以便以后的更新命令可以保留在 ClawHub 上。

当插件安装应通过 ClawHub 解析时，请使用 `clawhub:<package>`。裸露的 npm-safe 插件规范可以在启动切换期间通过 npm 进行解析，并且仅当源必须是显式时，`npm:<package>` 仍保持为 npm-。

插件安装会在运行存档安装之前验证所公布的 `pluginApi` 和 `minGatewayVersion` 兼容性。当包版本发布 ClawPack 工件时，OpenClaw 更喜欢确切上传的 npm-pack `.tgz`，验证 ClawHub 摘要标头和下载的字节，并记录工件元数据以供以后更新。

## ClawHub CLI

ClawHub CLI 用于经过注册表验证的工作：

```bash
clawhub login
clawhub whoami
clawhub search "postgres backups"
clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0
clawhub package explore --family code-plugin
clawhub package inspect episodic-claw
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

CLI 还具有用于直接注册表工作流程的技能 install/update 命令：

```bash
clawhub install @openclaw/demo
clawhub update @openclaw/demo
clawhub update --all
clawhub list
```

这些命令将技能安装到当前工作目录下的 `./skills` 中，并将安装的版本记录在 `.clawhub/lock.json` 中。

## <a id="publishing"></a> 出版

从包含 `SKILL.md` 的本地文件夹发布技能：

```bash
clawhub skill publish <path>
```

常见的发布选项：

- `--slug <slug>`：发布的技能URL名称。
- `--name <name>`：显示名称。
- `--version <version>`：semver 版本。
- `--changelog <text>`：变更日志文本。
- `--tags <tags>`：逗号分隔的标签，默认为`latest`。

从本地文件夹 `owner/repo`、`owner/repo@ref` 或 GitHub URL 发布插件：

```bash
clawhub package publish <source>
```

使用 `--dry-run` 构建精确的发布计划而无需上传，并使用 `--json` 进行 CI- 友好输出。

代码插件必须在 `package.json` 中包含所需的 OpenClaw 兼容性元数据，包括 `openclaw.compat.pluginApi` 和 `openclaw.build.openclawVersion`。有关完整命令参考，请参阅 [CLI](/clawhub/cli)；有关技能元数据，请参阅 [ 技能格式 ](/clawhub/skill-format)。

## <a id="security-and-moderation"></a> 安全和审核

ClawHub 默认情况下是开放的：任何人都可以上传，但发布需要一个足够旧的 GitHub 帐户才能通过上传门。公共详细信息页面总结了安装或下载之前的最新扫描状态。

ClawHub 对已发布的技能和插件版本运行自动检查。扫描保留或阻止的版本可能会从公共目录和安装表面中消失，同时对其所有者在 `/dashboard` 中保持可见。

登录用户可以报告技能和包。版主可以审查报告、隐藏或恢复内容以及禁止滥用帐户。有关策略和实施详细信息，请参阅 [Security](/clawhub/security)、[Security Audits](/clawhub/security-audits)、[ 审核和帐户 Safety](/clawhub/moderation) 和 [ 可接受的使用情况 ](/clawhub/acceptable-usage)。

## <a id="telemetry-and-environment"></a> 遥测与环境

当您在登录时运行 `clawhub install` 时，CLI 可能会发送尽力安装事件，以便 ClawHub 可以计算聚合安装计数。禁用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

有用的环境覆盖：

| 变量                      | 作用                                                                |
| ----------------------------- | --------------------------------------------------------------------- |
| `CLAWHUB_SITE`                | 覆盖站点 URL 以进行注册表发现和设备验证。 |
| `CLAWHUB_REGISTRY`            | 覆盖注册表API URL。                                        |
| `CLAWHUB_CONFIG_PATH`         | 覆盖 CLI 存储 token/config 状态的位置。                     |
| `CLAWHUB_WORKDIR`             | 覆盖默认工作目录。                               |
| `CLAWHUB_DISABLE_TELEMETRY=1` | 禁用安装遥测。                                            |

有关更深入的参考材料，请参阅 [Telemetry](/clawhub/telemetry)、[HTTP API](/clawhub/http-api) 和 [Troubleshooting](/clawhub/troubleshooting)。
