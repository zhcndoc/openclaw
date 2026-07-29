---
summary: "创建、添加、更新和移除实验性的 Claw 代理包"
read_when:
  - 你正在编写或校验 CLAW.md 清单
  - 你想从一个 Claw 预览或添加一个代理
  - 你需要检查 Claw 的所有权、漂移或清理行为
title: "Claws"
---

# `openclaw claws`

Claw 是一个用于创建一个新的 OpenClaw 代理的版本化配置。它可以描述
该代理的可移植身份、工作区文件、技能、插件、MCP 服务器和
cron 任务。特定于 Harness 的代理设置可以通过引用的
包配置文件来承载。Claw 不会替换或修改现有代理。

Claws 仍处于实验阶段。其 schema、命令输出和生命周期可能会发生变化。
请显式启用该命令接口：

```bash
export OPENCLAW_EXPERIMENTAL_CLAWS=1
```

当前 CLI 会读取本地包目录、`CLAW.md` 或分组 JSON 清单。
通过 ClawHub 发布、搜索和安装整个 Claw 属于
单独的注册表路径，目前还不在此命令接口范围内。

## 创建一个 Claw 包

一个包包含 `package.json`、一个 `CLAW.md` 清单，以及该清单引用的任何 profile 或
workspace sidecar：

```json
{
  "name": "@acme/incident-triage-claw",
  "version": "1.0.0",
  "type": "module",
  "openclaw": { "claw": "CLAW.md" }
}
```

`CLAW.md` 以 YAML frontmatter 开始。非空的 Markdown 正文是可移植的 agent prompt。OpenClaw 会将其作为新 agent 的 Claw 托管 `SOUL.md`：

```md
---
schemaVersion: 1
agent:
  id: incident-triage
  name: Incident triage
metadata:
  openclaw.config: profiles/openclaw.yml
workspace:
  bootstrapFiles: {}
packages: []
mcpServers: {}
cronJobs: []
---

# 事故分诊

你审查传入的事故，识别严重性和归属，并留下带有证据的简洁交接说明。
```

`metadata` 是一个字符串到字符串的映射，用于可移植的消费者提示。OpenClaw 的 `openclaw.config` 键指向一个可选的、包相对的 YAML profile。导出的默认值是 `profiles/openclaw.yml`；该指针是规范性的，因此包可以选择另一个安全的相对 `.yml` 或 `.yaml` 路径。

```yaml
schemaVersion: 1
agent:
  tools:
    profile: coding
    alsoAllow: [cron]
    deny: [exec]
    fs:
      workspaceOnly: true
  memory:
    search:
      enabled: true
      rememberAcrossConversations: true
      sources: [memory, sessions]
```

这个 profile 只存在于 Claw 包内部。OpenClaw 在检查、添加、更新和导出该 Claw 时会验证并使用它；它不会被复制到用户正常的 OpenClaw 配置路径。其他运行环境可以忽略这个带命名空间的 metadata 键，并消费可移植的 manifest 字段。

同样严格的 1 版 schema 继续接受分组的 JSON manifest。分组 JSON 使用相同的 `metadata.openclaw.config` 指针，而不是嵌入第二份 OpenClaw profile。此页其余的 schema 片段使用 JSON，在 `CLAW.md` frontmatter 中也有等价的键可用。

OpenClaw 包 profile 可以选择由当前运行的 OpenClaw 版本注册的任意内置工具 profile，然后通过 `alsoAllow`、`deny` 和 `tools.fs.workspaceOnly: true` 进行细化。Claw 不能将该字段设为 `false` 从而削弱主机文件系统隔离。`tools.allow` 仍然可作为显式白名单使用，但不能与 `alsoAllow` 组合。Claw 也可以设置 `memory.search.enabled`，选择可移植的 `memory` 和 `sessions` 源，并通过 `rememberAcrossConversations` 启用跨对话记忆。声明 `sessions` 源需要该显式启用。
主机策略仍然会约束这些设置，而 Claw 不携带自定义 profile 定义、提供者、凭据、绑定或本地记忆路径。
所引用的 profile 限制为 256 KiB，必须是 JSON 兼容的 YAML，不能使用别名、锚点、标签或合并键，并且必须是包内的普通文件，不能是符号链接，也不能是硬链接。

包和 workspace 路径必须始终位于包根目录内。Manifest 限制为 1 MiB，包元数据限制为 256 KiB，workspace 源文件对单文件和总量限制分别生效。Workspace 源文件还会拒绝符号链接的父目录。

当 `CLAW.md` 正文非空时，它是 `SOUL.md` 的首选可移植来源；不要同时声明一个 `SOUL.md` sidecar。其他 bootstrap 文件使用命名条目，而额外文件使用包相对源路径和 workspace 相对目标路径：

```json
{
  "workspace": {
    "bootstrapFiles": {
      "AGENTS.md": { "source": "workspace/AGENTS.md" }
    },
    "files": [
      {
        "source": "workspace/reference/policy.md",
        "path": "reference/policy.md"
      }
    ]
  }
}
```

技能和插件使用精确的 ClawHub 版本：

```json
{
  "packages": [
    {
      "kind": "skill",
      "source": "clawhub",
      "ref": "incident-triage",
      "version": "1.0.0"
    },
    {
      "kind": "plugin",
      "source": "clawhub",
      "ref": "@acme/audit-plugin",
      "version": "2.0.0"
    }
  ]
}
```

dry run 会使用现有的技能和插件预检路径，在同意前解析精确的 artifact、完整性以及任何 ClawHub 信任警告。该警告仍会显示在完整性绑定的计划中。应用时会安装缺失的 artifact，或复用匹配的 artifact，并记录 Claw 是引入了还是引用了每个资源。插件仍然是全进程范围的 OpenClaw 能力，而不是按 agent 安装的能力。

cron job 会为新 agent 声明定时任务：

```json
{
  "cronJobs": [
    {
      "id": "daily-summary",
      "name": "Daily incident summary",
      "schedule": { "cron": "0 9 * * *", "timezone": "UTC" },
      "session": "isolated",
      "message": "Summarize active incidents."
    }
  ]
}
```

Claw 使用现有的 Gateway 调度器，并将创建的 job 绑定到新 agent。预览、来源、状态和移除都会覆盖这些 job，而不会改变普通 cron 命令的行为。移除时会通过 Gateway 重新读取实时 job，并在其拥有的定义在规划后发生变化时予以保留。

MCP 声明使用现有的 `mcp.servers` 配置模型：

```json
{
  "mcpServers": {
    "statuspage": {
      "command": "npx",
      "args": ["--yes", "@acme/statuspage-mcp@1.0.0"],
      "env": { "STATUSPAGE_TOKEN": "${STATUSPAGE_TOKEN}" }
    }
  }
}
```

环境引用仍然是引用；Claw 不会嵌入已解析的密钥值。无冲突的声明会变为受管理状态，而精确的现有声明或共享声明会被引用。预览、来源、状态、导出和移除遵循与其他 Claw 资源相同的所有权策略。

## 检查和预览

在不规划本地更改的情况下验证源内容：

```bash
openclaw claws inspect ./incident-triage.claw.json
```

预览所有提议的生命周期操作：

```bash
openclaw claws add ./incident-triage.claw.json --dry-run --json
```

计划会报告派生的 agent 和 workspace、每一项提议的操作、
前置条件、阻塞项、不同的能力提升，以及一个 `planIntegrity`
摘要。能力记录会显示精确的 package、MCP、scheduled-work、sandbox、
tool 或 heartbeat 影响。在创建 agent 之前先审查计划：

```bash
openclaw claws add ./incident-triage.claw.json \
  --yes \
  --plan-integrity <SHA256_FROM_DRY_RUN>
```

仅使用 `--yes` 并不足够。OpenClaw 会重建计划，并在源、目标或实时配置
在预览后发生变化时拒绝同意。在包默认值与本地状态冲突时，请在预览和应用
阶段都使用 `--agent-id` 或 `--workspace`。对于一次性配置文件和并行验证，
请传入显式的 `--workspace`；`OPENCLAW_STATE_DIR` 会重定位运行时状态，
但不会更改默认的 workspace 位置。

添加一个 Claw 会创建新的 agent 和 workspace 配置，写入声明的 workspace 文件，
安装或复用声明的 skill 和 plugin 构件，并记录 package、MCP 和 cron 的来源。
现有文件不会被覆盖，并且当受拥有内容发生漂移时，重试会以失败关闭。

## 检查已安装状态

```bash
openclaw claws status
openclaw claws status incident-triage --json
openclaw doctor
```

`status` 会将已安装的 agent 及其记录的 workspace、package、MCP 和 cron 溯源与当前状态进行比较。它会报告不完整的安装、缺失的资源以及漂移，而不会更改本地状态。`openclaw doctor` 会增加 Claw 特定的诊断，包括不完整的所有权记录、不安全的受管文件，以及无法与实时 Gateway 清单相互印证的 cron 任务。

Claw 溯源区分两种关系：

- **Managed：** 该 Claw 引入并当前管理该资源。在资源未变更且不存在冲突所有者时，它是清理候选项。
- **Referenced：** 该资源独立存在或为共享资源。移除会释放该 Claw 的引用，并默认保留该资源。

这不是引用计数。普通的 plugin、skill 和 agent 命令会保持其现有行为；Claws 在此基础上增加了溯源信息和受保护的生命周期操作。

## 更新已安装的 Claw

默认情况下，更新会使用添加该 Claw 时记录的来源。当该来源已移动，或在测试另一个包目录时，请使用
`--from`：

```bash
openclaw claws update incident-triage --dry-run --json
openclaw claws update incident-triage \
  --from ./incident-triage-next \
  --dry-run --json
```

该计划会将当前的来源信息和实时状态与目标清单进行比较。
它会报告代理、工作区、包、MCP、cron 和所有权的变更，
包括能力升级和阻塞因素。能力升级会有
单独的机器可读记录，以及在人类可读输出中带有精确脱敏影响的 `!` 行。已解析的包完整性、安装身份以及任何信任
警告都会包含在内。在更新期间，移除包声明会释放此 Claw 的边，而不会卸载工件。最终的
精确 `planIntegrity` 确认会绑定该披露的集合以及常规
内容变更。主机可将相同记录用于单独对话或汇总的多代理审查。使用明确同意应用已精确审查的计划：

```bash
openclaw claws update incident-triage \
  --yes \
  --plan-integrity <SHA256_FROM_DRY_RUN>
```

OpenClaw 会在每次变更前重建计划并对所拥有的状态执行比较并交换。移除的包声明会释放依赖边，而不会卸载工件。Cron 变更会重新读取实时调度器定义，并在操作员漂移时停止。包安装器、源配置写入器以及 Gateway 调度器
并非一个事务。如果在外部变更后无法证明补偿，OpenClaw 会报告错误代码 `update_partial`，并带有结构化
`status: partial`，保留不确定的来源信息，
并停止。请检查 `claws status`、受影响的资源以及 `openclaw doctor`；
然后在重试或移除任何内容之前再次预览。

## 删除已安装的 Claw

在选择清理前预览移除：

```bash
openclaw claws remove incident-triage --dry-run --json
openclaw claws remove incident-triage \
  --yes \
  --plan-integrity <SHA256_FROM_DRY_RUN>
```

默认会移除符合条件的受管状态并释放被引用的状态。已修改的文件以及具有其他当前所有者的资源会被保留或阻止。清理选项是计划摘要的一部分；`--yes` 绝不会扩大这些选项。全局安装的插件会被保留，同时释放此 Claw 的引用；如果你打算卸载一个进程范围的插件，请单独使用普通的插件生命周期管理。

若要移除未更改、由 Claw 引入且没有其他当前所有者的引用，请在预览和应用中都加入 `--remove-unused`。若要改为选择精确的被引用资源，请重复使用 `--remove-referenced`：

```bash
openclaw claws remove incident-triage \
  --dry-run \
  --remove-referenced 'plugin:@acme/audit-plugin@2.0.0'
```

只有在查看了显示的依赖项、独立所有者以及预先存在的来源之后，才使用 `--force-referenced`。它允许在这些冲突存在的情况下执行所选清理；但不会跳过 plan-integrity 同意。

## 导出已安装的 agent

导出会创建一个新的包目录，并在目标已存在或受管状态发生漂移时失败：

```bash
openclaw claws export incident-triage --out ./incident-triage-export --json
```

结果包含 `package.json`、规范化的 `CLAW.md` 以及受管工作区的
sidecar。受管的 `SOUL.md` 内容在其为非空 UTF-8 且合并后的文档
符合清单限制时，会作为 `CLAW.md` 的正文输出。否则，
导出会将其保留为显式 sidecar，以便该包仍可导入。它是一个可移植的 Claw 包，而不是整个实例的备份：不相关的 agent、
凭据、会话以及未归属的本地状态都会被排除。

## 命令参考

| 命令                                | 目的                                                |
| ----------------------------------- | ------------------------------------------------- |
| `claws inspect <source>`            | 验证一个包目录或分组清单。   |
| `claws add <source>`                | 预览或创建一个新的 agent 和工作区。      |
| `claws status [claw-or-agent]`      | 报告已安装状态、所有权和漂移。       |
| `claws update <claw-or-agent>`      | 预览或应用所选源中的更改。  |
| `claws remove <claw-or-agent>`      | 预览或移除 agent 和符合条件的资源。 |
| `claws export <agent> --out <path>` | 从已安装的 agent 创建一个可移植包。  |

使用 `--json` 获取实验性的机器可读输出。

## 另请参阅

- [代理](/cli/agents)
- [技能](/tools/skills)
- [插件](/tools/plugin)
- [定时任务](/automation/cron-jobs)
- [MCP 配置](/gateway/configuration-reference#mcp)
