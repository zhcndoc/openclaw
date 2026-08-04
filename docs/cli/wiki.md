---
summary: "`openclaw wiki` 的 CLI 参考（memory-wiki vault 状态、搜索、编译、lint、应用、桥接、ChatGPT 导入，以及 Obsidian 辅助工具）"
read_when:
  - 你想使用 memory-wiki CLI
  - 你正在编写或修改 `openclaw wiki`
title: "Wiki"
---

# `openclaw wiki`

检查并维护 `memory-wiki` vault。由捆绑的可选 `memory-wiki` 插件提供。首次使用前请启用它：

```bash
openclaw plugins enable memory-wiki
openclaw gateway restart
```

相关：[Memory Wiki 插件](/plugins/memory-wiki)，[Memory 概览](/concepts/memory)，[CLI: memory](/cli/memory)

## 常用命令

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki okf import ./knowledge-catalog/okf/bundles/ga4
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki search "我应该问谁关于 Teams 的事？" --mode route-question
openclaw wiki get entity.alpha --from 1 --lines 80

openclaw wiki apply synthesis "Alpha Summary" \
  --body "简短的综合内容正文" \
  --source-id source.alpha

openclaw wiki apply metadata entity.alpha \
  --source-id source.alpha \
  --status review \
  --question "仍然活跃吗？"

openclaw wiki bridge import
openclaw wiki unsafe-local import
openclaw wiki chatgpt import --export ./chatgpt-export --dry-run
openclaw wiki chatgpt rollback <run-id>

openclaw wiki obsidian status
openclaw wiki obsidian search "alpha"
openclaw wiki obsidian open syntheses/alpha-summary.md
openclaw wiki obsidian command workspace:quick-switcher
openclaw wiki obsidian daily
```

## Agent 选择

当 `plugins.entries.memory-wiki.config.vault.scope` 为 `agent` 时，使用命令的
`--agent <id>` 选项选择知识库：

```bash
openclaw wiki status --agent support
openclaw wiki search "refund policy" --agent support
openclaw wiki ingest ./campaign-notes.md --agent marketing
```

省略 `--agent` 时，CLI 操作使用配置的默认 Agent，与其他按 Agent 作用域划分的 CLI 系列保持一致。传入该标志以选择其他 Agent。未知的 Agent ID 会在知识库操作开始前导致失败。如果无法解析默认 Agent，错误信息会提示你传入 `--agent <id>` 或配置一个 Agent。当 `vault.scope` 为 `global` 时，该选项不会改变所选路径。

网关客户端仍需显式指定：在按 Agent 作用域划分的多 Agent 设置中，为基于知识库的 `wiki.*` 请求传入 `agentId`。缺少或未知的 ID 会导致错误。Agent 对话轮次、wiki 工具、记忆语料补充内容以及已编译的提示词摘要，都已携带当前运行时的 Agent 上下文。

## 命令

### `wiki status`

显示 vault 模式和作用域、已解析的 agent、健康状态以及 Obsidian CLI 可用性。请首先使用此命令检查目标 vault 是否已初始化、bridge 模式是否健康，或者 Obsidian 集成是否可用。

当 bridge 模式处于激活状态且配置为读取 memory artifacts 时，此命令会查询正在运行的 Gateway，因此它看到的与 agent/runtime memory 相同的当前活动内存插件上下文。

### `wiki doctor`

运行 wiki 健康检查并报告可执行的修复项。若状态不健康则以非零状态退出。

当 bridge 模式处于激活状态且配置为读取 memory artifacts 时，此命令会在生成报告前查询正在运行的 Gateway。已禁用的 bridge 导入以及不读取 memory artifacts 的 bridge 配置会保持本地/离线。

典型问题：

- 启用了 bridge 模式，但没有公开的 memory artifacts
- vault 布局无效或缺失
- 期望使用 Obsidian 模式时缺少外部 Obsidian CLI

### `wiki init`

创建 wiki vault 布局和起始页面，包括顶层索引和缓存目录。

### `wiki ingest <path>`

将本地 markdown 或文本文件导入 wiki `sources/` 文件夹作为 source 页面。`<path>` 必须是本地文件路径；目前不支持 URL 导入。会拒绝二进制文件。

导入的 source 页面会携带溯源 frontmatter（`sourceType: local-file`、`sourcePath`、`ingestedAt`）。ingest 完成后总会重新编译 vault。

标志：`--title <title>` 覆盖 source 标题（默认：从文件名推导）。

### `wiki okf import <path>`

将一个已解包的 Open Knowledge Format bundle 导入到 wiki 概念页面中。

导入器会读取 OKF 目录树中所有非保留的 `.md` 概念文档，要求存在非空的 `type` 字段，并将未知的 OKF `type` 值视为通用概念。保留的 OKF `index.md` 和 `log.md` 文件不会作为概念导入。

导入的页面会扁平化到 `concepts/` 下，因此现有的 wiki compile、search、get、digest 和 dashboard 流程可以立即看到它们。原始 OKF concept ID、`type`、`resource`、`tags`、时间戳、source 路径以及完整 frontmatter 都会保留在页面 frontmatter 中。OKF 内部 markdown 链接会被重写为生成的 wiki 页面；断开的或外部链接会保持不变。导入后总会重新编译 vault。

示例：

```bash
openclaw wiki okf import ./bundles/ga4
openclaw wiki okf import ./bundles/ga4 --json
openclaw wiki search "BigQuery Table" --mode source-evidence --json
openclaw wiki get <path-from-json-result>
```

### `wiki compile`

重建索引、相关块、仪表盘以及已编译的查询/提示快照。快照会持久化到 OpenClaw 的共享 SQLite 插件状态中，并保留在内存中以便同步提示投射；它不会在 vault 中创建缓存文件。

如果启用了 `render.createDashboards`，编译还会刷新报告页面。

### `wiki lint`

检查 vault 并生成报告，覆盖以下内容：

- 结构性问题（损坏的链接、缺失/重复 id、缺失页面类型或标题、无效 frontmatter）
- 溯源缺口（缺失 source id、缺失导入溯源）
- 矛盾（被标记的矛盾、冲突的断言）
- 未决问题
- 低置信度页面和断言
- 过期页面和断言

在完成有意义的 wiki 更新后运行此命令。

### `wiki search <query>`

搜索 wiki 内容。行为取决于配置：

- `search.backend`: `shared` 或 `local`
- `search.corpus`: `wiki`、`memory` 或 `all`
- `--mode`: `auto`、`find-person`、`route-question`、`source-evidence` 或 `raw-claim`

用于 wiki 特定的排序和溯源请使用 `wiki search`。如果需要一次广泛的共享召回，且当前 memory 插件暴露了共享搜索，请优先使用 `openclaw memory search`。

搜索模式：

- `find-person`: 别名、账号、社交信息、规范 ID 和人物页面
- `route-question`: ask-for/best-used-for 提示和关系上下文
- `source-evidence`: source 页面和结构化证据字段
- `raw-claim`: 带有 claim/evidence 元数据的结构化断言文本

示例：

```bash
openclaw wiki search "bgroux" --mode find-person
openclaw wiki search "who knows Teams rollout?" --mode route-question
openclaw wiki search "maintainer-whois" --mode source-evidence
openclaw wiki search "strong route Teams" --mode raw-claim --json
```

当结果匹配到结构化断言时，文本输出会包含 `Claim:` 和 `Evidence:` 行。JSON 输出还会额外暴露 `matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、`evidenceKinds` 和 `evidenceSourceIds`，供 agent 侧进一步下钻。

### `wiki get <lookup>`

按 id 或相对路径读取 wiki 页面。

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

在不进行自由形式页面编辑的情况下应用细粒度修改：

- `apply synthesis <title>`：创建或刷新一篇带受管理摘要正文的 synthesis 页面
- `apply metadata <lookup>`：更新现有页面的元数据

两者都接受 `--source-id`、`--contradiction`、`--question`（都可重复）、`--confidence <n>`（0-1）以及 `--status <status>`。`apply metadata` 还接受 `--clear-confidence` 用于移除已存储的 confidence 值。这是演进 wiki 页面、同时保持受管理的生成块不变的推荐方式。

### `wiki bridge import`

从活跃的 memory 插件导入公开 memory artifacts 到 bridge 支持的 source 页面中。在 `bridge` 模式下使用此命令，将最新导出的 memory artifacts 拉取到 wiki vault。

对于活跃的 bridge artifact 读取，CLI 会通过 Gateway RPC 执行导入，因此会使用运行时 memory 插件上下文。如果 bridge 导入被禁用或 artifact 读取关闭，该命令会保持本地/离线的零导入行为。导入后的索引刷新受 `ingest.autoCompile` 控制。

### `wiki unsafe-local import`

在 `unsafe-local` 模式下，从显式配置的本地路径（`unsafeLocal.paths`）导入。该功能有意保持实验性，并且仅限同一台机器使用。导入后的索引刷新受 `ingest.autoCompile` 控制。

### `wiki chatgpt import`

将 ChatGPT 导出导入为草稿 wiki source 页面。

```bash
openclaw wiki chatgpt import --export ./chatgpt-export
openclaw wiki chatgpt import --export ./conversations.json --dry-run
```

| 标志              | 默认值     | 说明                                                      |
| ----------------- | ---------- | --------------------------------------------------------- |
| `--export <path>` | (required) | ChatGPT 导出目录或 `conversations.json` 路径。            |
| `--dry-run`       | `false`    | 预览创建/更新/跳过的数量，不写入页面。                    |

一次非 dry-run 的导入如果修改了任意页面，会记录一个 import run id，并在摘要中输出；回滚时需要该 id。

### `wiki chatgpt rollback <run-id>`

回滚之前执行的 ChatGPT 导入运行，删除该运行创建的页面，并恢复其覆盖的页面。导入后发生更改的页面会被移动到该运行的 `.openclaw-wiki/import-runs/<run-id>/recovered/` 目录下，而不是被删除。重试以及之后返回 `alreadyRolledBack` 的结果中，都会保留恢复路径。被中断的运行在目标恢复或派生 artifact 编译完成之前会保持为 `rolling_back` 状态。持久化的进程重启隔离栅栏会将这两个阶段分开：经过该隔离栅栏后，重试操作会重建索引和已编译缓存，但不会重写 source 页面或移动之后写入的路径名。之后进行一次普通的 compile 可能会刷新由机器管理的 Related 块。这涵盖了进程内故障，以及普通文件系统调用返回后发生的进程重启，但不涵盖内核或主机断电时的操作顺序问题。

### `wiki obsidian ...`

用于在 Obsidian 友好模式下运行的 vault 的 Obsidian 辅助命令：`status`、`search`、`open`、`command`、`daily`。当启用 `obsidian.useOfficialCli` 时，这些命令需要 `PATH` 中存在官方 `obsidian` CLI。

当 `vault.scope` 为 `agent` 时，配置校验会拒绝 `obsidian.useOfficialCli: true`，因为 `obsidian.vaultName` 是一个全局设置，而不是按 agent 映射。Obsidian 友好的 Markdown 渲染仍然可用。

## 实用使用指南

- 当来源可信度和页面标识很重要时，使用 `wiki search` + `wiki get`。
- 使用 `wiki apply`，不要手动编辑受管理的生成部分。
- 在信任存在矛盾或低置信度内容之前，使用 `wiki lint`。
- 在批量导入或源更改之后，如果你希望立即获得新的仪表板和已编译摘要，请使用 `wiki compile`。
- 当数据目录、文档导出或 agent 富化流水线已经输出 OKF markdown bundles 时，使用 `wiki okf import`。
- 当 bridge 模式依赖于新导出的 memory artifacts 时，使用 `wiki bridge import`。

## 配置关系

`openclaw wiki` 的行为由以下配置项决定：

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.vault.scope`
- `plugins.entries.memory-wiki.config.vault.path`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.ingest.autoCompile`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

完整的配置模型请参见 [Memory Wiki Plugin](/plugins/memory-wiki)。

## 相关

- [CLI 参考](/cli)
- [记忆维基](/plugins/memory-wiki)
