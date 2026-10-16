---
summary: "像普通代理一样编写、检查和添加 Claw 包"
read_when:
  - "你正在编写或校验 CLAW.md 清单"
  - "您想从 Claw 添加新特工"
  - "您需要了解删除该代理后还剩下什么"
title: "利爪"
---

# `openclaw claws`

Claw 是新 OpenClaw 代理的便携式设置。它可以包括代理指令、工作区文件、技能、插件、MCP 服务器和自动化。 **Add 是一项单向操作：** 它创建一个普通代理并安装其要求。它不会创建一个已安装的爪子来管理。再次添加相同的爪子会创建另一个代理。

添加后，使用 [agent 命令](/cli/agents) 管理代理，使用 [cron 命令 ](/automation/cron-jobs) 管理代理，并与其普通插件或 MCP 控件共享依赖项。没有 Claw 状态、更新、删除或导出命令。要使用较新的版本，请将其添加为另一个代理。

添加一个之前，请在 **设置 → Labs** 中启用 **Claws**。在无头安装中，在 OpenClaw 配置中将 `gateway.controlUi.experimental.claws` 设置为 `true`。创作和检查本地 Claw 包不需要实验室切换。

CLI 接受本地包目录、`CLAW.md` 或分组的 JSON 清单。通过 ClawHub 发布和搜索 Claws 使用单独的注册表界面。 Control UI可以浏览**Agents**的官方Claws。

## <a id="author-locally"></a> 在本地创作

创建一个最小的项目，验证其输入，在不进行更改的情况下预览它，并构建一个不可变的包工件：

```bash
openclaw claws create ./incident-triage
openclaw claws validate ./incident-triage
openclaw claws dev ./incident-triage
openclaw claws build ./incident-triage --out ./incident-triage-1.0.0.tgz
```

一个包包含`package.json`， `CLAW.md`，以及其清单选择的任何文件。`create`只写`package.json`和`CLAW.md`并拒绝合并到非空目录中。项目验证拒绝包脚本和生命周期挂钩。`dev`构建相同的包工件并在本地检查其添加要求，而不安装包，联系ClawHub、启动代理轮流、启用自动化或更改OpenClaw状态。需要在线预检的需求显示为阻碍因素。`build`创建一个确定性的`.tgz`并拒绝覆盖现有文件。

最小的 `package.json` 标识了包及其清单：

```json
{
  "name": "@acme/incident-triage-claw",
  "version": "1.0.0",
  "type": "module",
  "openclaw": { "claw": "CLAW.md" }
}
```

`CLAW.md` 以 YAML frontmatter 开头。其Markdown本体成为新代理的`SOUL.md`：

```md
---
schemaVersion: 1
agent:
  id: incident-triage
  name: Incident triage
categories: [operations, research]
workspace:
  bootstrapFiles: {}
packages: []
mcpServers: {}
cronJobs: []
---

# Incident triage

Review incoming incidents, identify severity and ownership, and leave
a concise handoff with evidence.
```

`categories` 是可选的。声明一到三个不同的小写字母用于目录发现；接收注册管理机构决定其接受哪个类别名称。类别不会更改代理的运行时行为。

OpenClaw 会自动发现可选的 `profiles/openclaw.yml` 文件。 无需 manifest 指针。其他 harness 可以发现自己的常规配置文件，例如 `profiles/codex.yml`，而无需更改可移植 manifest。

较旧的 `metadata.openclaw.config` 指针已弃用，但仍会被读取，因此基于该指针发布的包仍可正常工作。读取该指针会报告 `deprecated_openclaw_profile_pointer` 警告；请将该文件移动到 `profiles/openclaw.yml`，并移除 metadata 条目。不是包相对 `.yml`/`.yaml` 路径的指针会被拒绝；如果 `profiles/openclaw.yml` 同时存在，而该指针引用的是另一个文件，也会因冲突而被拒绝。

包可以添加来自包相关源的命名引导文件和其他工作区文件。这些内容进入新代理的专用工作区：

```yaml
workspace:
  bootstrapFiles:
    AGENTS.md:
      source: workspace/AGENTS.md
  files:
    - source: workspace/reference/policy.md
      path: reference/policy.md
```

可选的包根 `BOOTSTRAP.md` 提供首次运行指令。该包还可以声明确切的 ClawHub 技能和插件要求、MCP 服务器和计划的自动化：

```yaml
packages:
  - kind: skill
    source: clawhub
    ref: incident-triage
    version: 1.0.0
  - kind: plugin
    source: clawhub
    ref: "@acme/audit-plugin"
    version: 2.0.0
mcpServers:
  statuspage:
    command: npx
    args: ["--yes", "@acme/statuspage-mcp@1.0.0"]
    env:
      STATUSPAGE_TOKEN: "${STATUSPAGE_TOKEN}"
cronJobs:
  - id: daily-summary
    name: Daily incident summary
    schedule: { cron: "0 9 * * *", timezone: UTC }
    session: isolated
    message: Summarize active incidents.
```

环境价值仍然是悬而未决的参考文献；切勿打包凭证。共享插件和 MCP 服务器必须与现有声明完全匹配，否则“添加”将报告冲突而不替换它们。插件和技能信任警告需要明确同意。自动化已分配给新代理。

OpenClaw 从 `profiles/openclaw.yml` 发现可选harness设置。这些设置可以细化代理的工具、沙箱、内存搜索和扩展要求，但无法设置模型、提供程序、凭据或命名委托代理。主办政策仍然限制每笔资助。 OpenClaw 忽略外国harness轮廓。仍会读取已发布的较旧 `metadata.openclaw.config` 配置文件指针，并带有弃用警告；新的包应该使用传统的配置文件路径。

包和工作区路径必须保留在包根目录内。清单限制为 1 MiB，包元数据限制为 256 KiB，工作区文件具有每个文件和聚合限制。选定的文件将成为包内容，因此在构建或发布之前检查它们的秘密。

<a id="inspect-and-preview"></a>

## <a id="inspect-and-add"></a> 检查并添加

使用前检查源：

```bash
openclaw claws inspect ./incident-triage
```

添加它以创建一个新的普通代理：

```bash
openclaw claws add ./incident-triage
```

每个添加都会选择一个未使用的代理 ID。 CLI 报告 ID，以便您可以随后打开或配置代理。 Control UI 打开新代理的聊天并以“你能做什么？”开头。添加成功后。

`--dry-run --json` 仍可用于自动化或离线检查。 `--agent-id` 和 `--workspace` 使用未使用的 ID 或新路径覆盖默认目标。普通添加不需要单独的计划或审核令牌。特殊的信任警告仍然需要明确同意。

Add reuses matching shared dependencies， installs missing requirements， creates the agent and its workspace， and assigns its automations. 现有代理或工作区永远不会被覆盖. If Add fails， 检查具体错误并解决后重试； 新创建的资源会在安全的地方被清理， 而添加之前存在的资源则保持不变。

## <a id="remove-the-agent"></a> 删除代理

删除从 Claw 添加的代理与删除任何其他代理相同：

```bash
openclaw agents delete incident-triage
```

普通代理删除流程会删除代理的专用工作区，包括其本地指令和技能以及分配给该代理的自动化。它还会删除用户稍后添加到该代理的文件或自动化操作。共享插件，MCP服务器和其他主机级集成仍然安装；当不再需要时，通过普通控件单独删除它们。没有Claw所有权记录或反向安装操作。

## <a id="command-reference"></a> 命令参考

| 命令                          | 用途                                          |
| -------------------------------- | ------------------------------------------------ |
| `claws create [path]`            | 创建一个最小的本地 Claw 项目。             |
| `claws validate [path]`          | 验证项目输入和包内容。    |
| `claws dev [path]`               | 在本地构建和预览，无需更改。      |
| `claws build [path] --out <tgz>` | 构建确定性包工件。          |
| `claws inspect <source>`         | 检查包或分组清单。           |
| `claws add <source>`             | 创建一个新代理并安装其要求。 |

使用 `--json` 进行实验性机器可读输出。验证错误、阻止的需求和失败的添加退出 `1`。

## <a id="see-also"></a> 另请参阅

- [代理](/cli/agents)
- [技能](/tools/skills)
- [插件](/tools/plugin)
- [定时任务](/automation/cron-jobs)
- [MCP 配置](/gateway/config-extensions#mcp)
