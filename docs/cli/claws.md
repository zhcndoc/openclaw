---
summary: "创建、添加、更新和移除实验性的 Claw 代理包"
read_when:
  - 你正在编写或校验 CLAW.md 清单
  - 你想从一个 Claw 预览或添加一个代理
  - 你需要检查 Claw 的所有权、漂移或清理行为
title: "Claws"
---

# `openclaw claws`

Claw 是一个用于创建新的 OpenClaw 代理的版本化配置。它可以描述代理的
可移植身份、工作区文件、技能、插件、MCP 服务器和 cron 任务。特定于宿主环境的代理设置
可以存放在常规的软件包配置文件中。Claw 不会替换或修改现有代理。

Claws 仍处于实验阶段。其 schema、命令输出和生命周期可能会发生变化。
请显式启用该命令接口：

```bash
export OPENCLAW_EXPERIMENTAL_CLAWS=1
```

当前 CLI 会读取本地包目录、`CLAW.md` 或分组 JSON 清单。
通过 ClawHub 发布、搜索和安装整个 Claw 属于
单独的注册表路径，目前还不在此命令接口范围内。

## 创建一个 Claw 包

一个包包含 `package.json`、一个 `CLAW.md` manifest，以及该 manifest 使用的任何常规
配置文件、引导说明或可移植资源：

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
workspace:
  bootstrapFiles: {}
packages: []
mcpServers: {}
cronJobs: []
---

# 事故分诊

你审查传入的事故，识别严重性和归属，并留下带有证据的简洁交接说明。
```

OpenClaw 会自动发现可选的 `profiles/openclaw.yml` 文件。
无需 manifest 指针。其他 harness 可以发现自己的常规配置文件，例如
`profiles/codex.yml`，而无需更改可移植 manifest。

较旧的 `metadata.openclaw.config` 指针已弃用，但仍会被读取，因此基于该指针发布的
包仍可正常工作。读取该指针会报告
`deprecated_openclaw_profile_pointer` 警告；请将该文件移动到
`profiles/openclaw.yml`，并移除 metadata 条目。不是包相对 `.yml`/`.yaml` 路径的指针会被拒绝；如果
`profiles/openclaw.yml` 同时存在，而该指针引用的是另一个文件，也会因冲突而被拒绝。

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

此配置文件仅存在于 Claw 包内部。OpenClaw 会在检查、添加、更新和导出该 Claw 时对其进行验证和使用；它不会被复制到用户正常的 OpenClaw 配置路径中。其他 harness 会使用可移植 manifest，并且只解释它们自己的常规配置文件。

相同的严格版本 1 schema 仍然接受分组 JSON manifest。分组 JSON 会发现相同的常规配置文件，而不是嵌入一份 OpenClaw 设置副本。本页面其余的 schema 片段使用 JSON；`CLAW.md` frontmatter 中提供了等效的键。

OpenClaw 包配置可以选择运行中的 OpenClaw 版本所注册的任何内置工具配置文件，然后使用
`alsoAllow`、`deny` 和 `tools.fs.workspaceOnly: true` 对其进行细化。Claw 不能将该字段设置为
`false`，从而削弱主机文件系统隔离。`tools.allow` 仍可作为显式 allowlist 使用，但不能与
`alsoAllow` 结合使用。Claw 还可以设置 `memory.search.enabled`，选择可移植的
`memory` 和 `sessions` 源，并通过 `rememberAcrossConversations` 选择启用跨会话记忆。
声明 `sessions` 源要求同时启用该选项。
主机策略仍会限制这些设置，并且 Claw 不携带自定义配置文件定义、提供商、凭据、绑定或本地记忆路径。
常规配置文件大小限制为 256 KiB，必须是兼容 JSON 的 YAML，不得使用别名、锚点、标签或合并键，并且必须是包内的常规、非符号链接、非硬链接文件。

OpenClaw 配置文件还可以声明特定于 harness 的扩展要求：

```yaml
schemaVersion: 1
agent: {}
extensions:
  - id: incident-tools
    kind: plugin
    format: claude
    source: clawhub
    ref: "@acme/incident-tools"
    version: 2.0.0
```

`format` 声明 OpenClaw 必须检测的构件格式（`openclaw`、`claude`、`codex` 或
`cursor`）。规范的插件预检会解析确切的构件，并报告当前 OpenClaw 适配器映射了哪些组件，以及哪些组件仍不可用。缺少身份信息、完整性信息、格式检测结果或适配器身份时，应用会被阻止。由扩展支持的插件使用现有的插件安装器和所有权模型；它们是共享的主机要求，不是 Claw 所拥有的成员，也不是第二套包系统。

OpenClaw 在应用期间会忽略其他 harness 的配置文件。包完整性仍涵盖每个已发布的包字节，而开发快照会绑定可移植 manifest、引导文件和 workspace 源，以及所选的 OpenClaw 配置文件。状态和 doctor 会报告适配器映射偏差或不可用的检查结果。导出会将由扩展支持的插件写入 `profiles/openclaw.yml`，不会在可移植的 `packages` 列表中重复记录它们。

包路径和 workspace 路径必须始终位于包根目录内。Manifest 限制为 1 MiB，包元数据限制为 256 KiB，workspace 源文件还会分别执行单文件和总量限制。Workspace 源文件也会拒绝包含符号链接的父目录。

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

额外文件是可移植资源机制。作者可以将包源文件组织在诸如
`assets/`、`schemas/`、`templates/` 和 `examples/` 等目录下，然后使用
`workspace.files` 将其映射到新 agent 的 workspace 中。应用时会将这些目标记录为受管理文件；更新时会重新协调未更改的受管理资源，而移除时会保留已修改或由用户拥有的文件。

可选的包根目录 `BOOTSTRAP.md` 用于提供对话式首次运行说明。OpenClaw 会将其植入新 agent 的 workspace，并通过原生 workspace bootstrap 状态记录进度。一旦 agent 使用或移除该文件，Claw 更新就不会重新创建它。因此，根目录中的 `BOOTSTRAP.md` 不能同时通过 `workspace.files` 声明。移除 Claw 时，在验证其记录的摘要后，会删除未更改且仍处于待处理状态的包 bootstrap；对于已编辑的 bootstrap 内容以及入门过程中创建的文件，则会予以保留。

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

试运行会使用现有的技能和插件预检路径，在征得同意前解析确切的构件、完整性以及任何 ClawHub 信任警告。该警告仍会显示在完整性绑定的计划中。每项要求都会显示为已满足、缺少但可安装、冲突或需要设置。对确切计划的同意会批准缺少的安装；OpenClaw 会在创建 agent 或 workspace 之前完成这些规范的插件操作。应用会复用匹配的构件，并记录 Claw 是引入还是引用了每项资源。插件仍是进程范围内的 OpenClaw 能力，而不是按 agent 安装的组件。

定时任务会为新 agent 声明定时任务：

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

## 在本地创作

创建一个最小项目，验证其可发布输入内容，离线预览完整的
OpenClaw 添加计划，并构建一个不可变的软件包制品：

```bash
openclaw claws create ./incident-triage
openclaw claws validate ./incident-triage
openclaw claws dev ./incident-triage
openclaw claws build ./incident-triage --out ./incident-triage-1.0.0.tgz
```

`create` 只写入 `package.json` 和 `CLAW.md`，并拒绝合并到非空目录中。项目验证要求
`openclaw.claw` 指向根目录下的 `CLAW.md`，拒绝软件包脚本和生命周期钩子，发现唯一且明确的项目根目录，并报告被排除在软件包之外的文件。

`dev` 会验证并构建将要发布的同一制品，然后通过规范的添加规划器运行该制品。它不会安装软件包、联系 ClawHub、启动代理回合、启用计划任务、传递消息或修改 OpenClaw 状态。需要在线预检的依赖项会显示为阻塞项，而不会削弱这一边界。使用 `--agent-id` 或 `--workspace` 可预览不会发生冲突的本地目标位置。

`build` 会写入一个带有 `package/` 根目录的确定性、兼容 npm 的 `.tgz` 文件。软件包中只包含软件包元数据、`CLAW.md`、可选的 `BOOTSTRAP.md`、OpenClaw 配置文件以及清单所选定的源文件。测试、缓存、环境中存在的或未选中的凭据、未选中的文件、之前生成的制品以及源代码管理状态均留在软件包之外。选定的源文件字节会成为软件包内容，因此作者不得选中包含机密信息的文件。构建操作拒绝覆盖现有制品，报告其 SHA-256 完整性，并在成功前通过规范的 Claw 读取器重新打开该制品。

## 检查和预览

在不规划本地更改的情况下验证源文件。对于 OpenClaw 配置文件
扩展，inspect 还会执行规范的只读构件探测，并报告已映射和不可用的组件：

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

添加 Claw 时，系统首先落实已获同意的共享插件要求，然后创建新的 agent 和 workspace
配置，写入可选的首次运行指令，写入声明的 workspace 资源，实现 workspace 技能，
并记录 package、MCP 和 cron 的来源信息。不会覆盖现有文件；如果受管理的内容发生
偏移，重试将安全失败。

## 检查已安装状态

```bash
openclaw claws status
openclaw claws status incident-triage --json
openclaw doctor
```

`status` 会将已安装的代理及其记录的工作区、软件包、MCP 和 cron 来源与当前状态进行比较。它还会报告原生首次运行引导是否仍处于待处理状态。它会报告安装不完整、资源缺失和状态偏移，但不会更改本地状态。`openclaw doctor` 还会针对 Claw 添加特定诊断，包括所有权记录不完整、不安全的受管文件，以及无法通过实时 Gateway 清单核实的 cron 作业。

Claw 溯源区分两种关系：

- **Managed：** 该 Claw 引入并当前管理该资源。在资源未变更且不存在冲突所有者时，它是清理候选项。
- **Referenced：** 该资源独立存在或为共享资源。移除会释放该 Claw 的引用，并默认保留该资源。

这不是引用计数。普通的插件、技能和代理命令会保持其现有行为；Claws 在此基础上增加了溯源信息和受保护的生命周期操作。

## 更新已安装的 Claw

默认情况下，更新会使用添加该 Claw 时记录的来源。当该来源已移动，或在测试另一个包目录时，请使用
`--from`：

```bash
openclaw claws update incident-triage --dry-run --json
openclaw claws update incident-triage \
  --from ./incident-triage-next \
  --dry-run --json
```

该计划会将当前来源信息和实时状态与目标清单进行比较。
它会报告代理、工作区、包、MCP、Cron 和所有权变更，
包括能力升级和阻塞项。能力升级会分别记录为机器可读的记录，并在
人类可读的输出中以带有精确脱敏影响的 `!` 行显示。解析后的包完整性、安装标识、信任警告以及
剩余的本地设置前置条件也会包含在内。移除包声明会释放该 Claw 的依赖边，但在更新期间不会卸载工件。最终的
精确 `planIntegrity` 确认会将该披露集合以及普通内容变更一并绑定。主机可以使用相同的记录进行单独的对话框展示或
聚合式多代理审查。使用明确的同意应用经过审查的精确计划：

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

默认会移除符合条件的托管状态，并释放所引用的状态。已修改的文件以及由其他当前所有者拥有的资源会被保留或阻止移除。清理选项属于计划摘要的一部分；`--yes` 绝不会扩大清理范围。全局安装的插件会被保留，同时释放对此 Claw 的引用。移除报告会列出 Claw add 引入的、但被保留的需求；如果要卸载整个进程范围内的插件，请单独使用常规的插件生命周期管理。

若要移除未更改、由 Claw 引入且没有其他当前所有者的引用，请在预览和应用中都加入 `--remove-unused`。若要改为选择精确的被引用资源，请重复使用 `--remove-referenced`：

```bash
openclaw claws remove incident-triage \
  --dry-run \
  --remove-referenced 'plugin:@acme/audit-plugin@2.0.0'
```

只有在查看了显示的依赖项、独立所有者以及预先存在的来源之后，才使用 `--force-referenced`。它允许在这些冲突存在的情况下执行所选清理；但不会跳过 plan-integrity 同意。

## 导出已安装的代理

导出会创建一个新的包目录，并在目标已存在或受管状态发生漂移时失败：

```bash
openclaw claws export incident-triage --out ./incident-triage-export --json
```

使用 `--bootstrap <path>` 可将一个经过明确审查的 Markdown 文件附加为
包根目录的 `BOOTSTRAP.md`。导出会自动重新输出未更改且仍处于待处理状态的包
bootstrap。若包 bootstrap 在工作区中发生漂移（被编辑、不安全或无法读取），导出会以
`bootstrap_drifted` 失败，其方式与受管工作区文件失败时的
`workspace_files_drifted` 相同；传入 `--bootstrap <path>` 并提供经过审查的替代文件即可
继续导出。代理已经消费过的 bootstrap 属于已完成的生命周期状态，因此导出会省略
`BOOTSTRAP.md`，而不是失败。导出器会验证已完成的包；如果验证失败，则会删除新建的输出
目录。Bootstrap 是由包提供的提示内容：不要包含凭据、令牌、私人答案或特定机器的路径。导出不会推断问题、渲染个人数据模板、持久化答案，也不会添加单独的设置生命周期。

结果包含 `package.json`、规范的 `CLAW.md` 以及受管工作区旁车文件。当受管的
`SOUL.md` 内容为非空 UTF-8，且合并后的文档符合清单大小限制时，会作为
`CLAW.md` 正文输出。否则，导出会将其保留为显式旁车文件，以确保该包仍可导入。它是一个
可移植的 Claw 包，而不是整个实例的备份：无关的代理、凭据、会话和不属于该包的本地状态都会被排除。

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
- [MCP 配置](/gateway/configuration-reference#mcp)。
