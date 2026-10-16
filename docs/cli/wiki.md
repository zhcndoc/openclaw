---
summary: "`openclaw wiki` 的 CLI 参考（memory-wiki vault 状态、搜索、编译、lint、应用、桥接、ChatGPT 导入，以及 Obsidian 辅助工具）"
read_when:
  - "你想使用 memory-wiki CLI"
  - "你正在编写或修改 `openclaw wiki`"
title: "维基百科"
---

# `openclaw wiki`

检查并维护 `memory-wiki` vault。由捆绑的可选 `memory-wiki` 插件提供。首次使用前请启用它：

```bash
openclaw plugins enable memory-wiki
openclaw gateway restart
```

相关：[Memory Wiki插件](/plugins/memory-wiki)、[内存Overview](/concepts/memory)、[CLI：内存](/cli/memory)

## <a id="common-commands"></a> 常用命令

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki okf import ./knowledge-catalog/okf/bundles/ga4
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki search "who should I ask about Teams?" --mode route-question
openclaw wiki get entity.alpha --from 1 --lines 80

openclaw wiki apply synthesis "Alpha Summary" \
  --body "Short synthesis body" \
  --source-id source.alpha

openclaw wiki apply metadata entity.alpha \
  --source-id source.alpha \
  --status review \
  --question "Still active?"

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

## <a id="agent-selection"></a> Agent 选择

当 `plugins.entries.memory-wiki.config.vault.scope` 为 `agent` 时，使用命令的 `--agent <id>` 选项选择知识库：

```bash
openclaw wiki status --agent support
openclaw wiki search "refund policy" --agent support
openclaw wiki ingest ./campaign-notes.md --agent marketing
```

当省略 `--agent` 时，CLI 操作使用配置的默认代理，与其他代理范围的 CLI 系列相匹配。传递标志以选择不同的代理。未知的代理 ID 在保管库操作开始之前失败。如果无法解决默认问题，该错误会告诉您传递 `--agent <id>` 或配置代理。当 `vault.scope` 为 `global` 时，该选项不会更改所选路径。

网关客户端保持显式：在代理范围的多代理设置中，在保管库支持的 `wiki.*` 请求上传递 `agentId`。丢失或未知的 ID 是一个错误。代理轮流、wiki 工具、记忆语料库补充和编译的提示摘要已经带有活动的运行时代理上下文。

## <a id="commands"></a> 命令

### `wiki status`

显示 vault 模式和作用域、已解析的 agent、健康状态以及 Obsidian CLI 可用性。请首先使用此命令检查目标 vault 是否已初始化、bridge 模式是否健康，或者 Obsidian 集成是否可用。

当 bridge 模式处于激活状态且配置为读取 memory artifacts 时，此命令会查询正在运行的 Gateway，因此它看到的与 agent/runtime memory 相同的当前活动内存插件上下文。

### `wiki doctor`

运行 wiki 健康检查并报告可执行的修复项。若状态不健康则以非零状态退出。

当桥接模式处于活动状态并配置为读取内存工件时，此命令会在构建报告之前查询正在运行的网关。禁用的桥接导入和不读取内存工件的桥接配置保留为 local/offline.

典型问题：

- 启用了 bridge 模式，但没有公开的 memory artifacts
- vault 布局无效或缺失
- 当需要 Obsidian 模式时， 缺少外部 Obsidian CLI

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

重建索引、相关块、仪表板和编译的 query/prompt 快照。快照持久化在OpenClaw的共享SQLite插件状态中，并保存在内存中用于同步提示投影；它不会在 Vault 中创建缓存文件。

如果启用了 `render.createDashboards`，编译还会刷新报告页面。

### `wiki lint`

检查 vault 并生成报告，覆盖以下内容：

- 结构问题（链接损坏、missing/duplicate id、缺少页面类型或标题、无效的 frontmatter）
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

- `find-person`：别名、句柄、社交、主 ID 和个人页面
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

通过 ID 或相对路径读取 wiki 页面。首先解析已编译的索赔 ID。激活保管库后，现有的可见 Markdown 路径仅读取请求的页面。新的 CLI 进程仍会根据保管库验证已编译的快照；缺少索引或快照会触发自动编译。丢失或无效的候选、无扩展路径、基本名称和页面 ID 保留其现有的查找后备，并可能扫描保管库。

Wiki 页面读取支持大文件和硬链接。读取逃离保管库或通过其中的符号链接的垃圾路径。

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

对于主动桥工件读取，CLI 通过网关 RPC 路由导入，因此它使用运行时内存插件上下文。如果禁用桥导入或关闭工件读取，该命令将保留 local/offline 零导入行为。导入后的索引刷新由 `ingest.autoCompile` 控制。

### `wiki unsafe-local import`

在 `unsafe-local` 模式下从显式配置的本地路径 （`unsafeLocal.paths`） 导入。仅有意进行实验且在同一台机器上。导入后的索引刷新由 `ingest.autoCompile` 控制。

### `wiki chatgpt import`

将 ChatGPT 导出导入为草稿 wiki source 页面。

```bash
openclaw wiki chatgpt import --export ./chatgpt-export
openclaw wiki chatgpt import --export ./conversations.json --dry-run
```

| 标志              | 默认值    | 描述                                                   |
| ----------------- | ---------- | ------------------------------------------------------------- |
| `--export <path>` | （必需的） | ChatGPT 导出目录或 `conversations.json` 路径。        |
| `--dry-run`       | `false`    | 预览 created/updated/skipped 计数，无需写页。 |

一次非 dry-run 的导入如果修改了任意页面，会记录一个 import run id，并在摘要中输出；回滚时需要该 id。

在初始化保管库或更改导入的页面之前，格式错误的 UTF-8 导出将被拒绝。如果错误指出导出无效，请下载新的 ChatGPT 导出并重试导入。

### `wiki chatgpt rollback <run-id>`

回滚之前执行的 ChatGPT 导入运行，删除该运行创建的页面，并恢复其覆盖的页面。导入后发生更改的页面会被移动到该运行的 `.openclaw-wiki/import-runs/<run-id>/recovered/` 目录下，而不是被删除。重试以及之后返回 `alreadyRolledBack` 的结果中，都会保留恢复路径。被中断的运行在目标恢复或派生 artifact 编译完成之前会保持为 `rolling_back` 状态。持久化的进程重启隔离栅栏会将这两个阶段分开：经过该隔离栅栏后，重试操作会重建索引和已编译缓存，但不会重写 source 页面或移动之后写入的路径名。之后进行一次普通的 compile 可能会刷新由机器管理的 Related 块。这涵盖了进程内故障，以及普通文件系统调用返回后发生的进程重启，但不涵盖内核或主机断电时的操作顺序问题。

### `wiki obsidian ...`

Obsidian 用于在 Obsidian- 友好模式下运行的保管库的帮助程序命令：`status`、`search`、`open`、`command`、`daily`。当启用 `obsidian.useOfficialCli` 时，这些需要 `PATH` 上的官方 `obsidian` CLI。

当 `vault.scope` 为 `agent` 时，配置验证会拒绝 `obsidian.useOfficialCli: true`，因为 `obsidian.vaultName` 是一项全局设置，而不是每代理映射。 Obsidian- 友好的 Markdown 渲染仍然可用。

## <a id="practical-usage-guidance"></a> 实用使用指南

- 当来源可信度和页面标识很重要时，使用 `wiki search` + `wiki get`。
- 使用 `wiki apply`，不要手动编辑受管理的生成部分。
- 在信任存在矛盾或低置信度内容之前，使用 `wiki lint`。
- 在批量导入或源更改之后，如果你希望立即获得新的仪表板和已编译摘要，请使用 `wiki compile`。
- 当数据目录、文档导出或 agent 富化流水线已经输出 OKF markdown bundles 时，使用 `wiki okf import`。
- 当 bridge 模式依赖于新导出的 memory artifacts 时，使用 `wiki bridge import`。

## <a id="configuration-tie-ins"></a> 配置关系

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

有关完整的配置模型，请参阅 [Memory Wiki 插件](/plugins/memory-wiki)。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [记忆维基](/plugins/memory-wiki)
