---
summary: "`openclaw wiki` 的 CLI 参考（memory-wiki vault 状态、搜索、编译、lint、apply、bridge，以及 Obsidian 辅助工具）"
read_when:
  - 你想使用 memory-wiki CLI
  - 你正在编写或修改 `openclaw wiki`
title: "Wiki"
---

# `openclaw wiki`

检查并维护 `memory-wiki` vault。

由捆绑的 `memory-wiki` 插件提供。

相关：

- [Memory Wiki 插件](/plugins/memory-wiki)
- [Memory 概览](/concepts/memory)
- [CLI: memory](/cli/memory)

## 它的用途

当你需要一个编译后的知识 vault，并具备以下能力时，请使用 `openclaw wiki`：

- wiki 原生搜索和页面读取
- 富含来源信息的综合内容
- 矛盾和时效性报告
- 从当前活动的 memory 插件导入 bridge 内容
- 可选的 Obsidian CLI 辅助工具

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
openclaw wiki search "who should I ask about Teams?" --mode route-question
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

openclaw wiki obsidian status
openclaw wiki obsidian search "alpha"
openclaw wiki obsidian open syntheses/alpha-summary.md
openclaw wiki obsidian command workspace:quick-switcher
openclaw wiki obsidian daily
```

## 命令

### `wiki status`

检查当前 vault 模式、健康状况以及 Obsidian CLI 可用性。

当你不确定 vault 是否已初始化、bridge 模式是否健康，或 Obsidian 集成是否可用时，先使用这个命令。

当 bridge 模式处于活动状态且已配置为读取 memory artifacts 时，此命令会查询正在运行的 Gateway，因此它看到的活动 memory 插件上下文与 agent/runtime memory 相同。

### `wiki doctor`

运行 wiki 健康检查，并显示配置或 vault 问题。

当 bridge 模式处于活动状态且已配置为读取 memory artifacts 时，此命令会在生成报告之前查询正在运行的 Gateway。已禁用的 bridge 导入，以及不读取 memory artifacts 的 bridge 配置，仍然保持本地/离线。

典型问题包括：

- 启用了 bridge 模式，但没有公开的 memory artifacts
- vault 布局无效或缺失
- 期望使用 Obsidian 模式时缺少外部 Obsidian CLI

### `wiki init`

创建 wiki vault 布局和初始页面。

这会初始化根结构，包括顶层索引和缓存目录。

### `wiki ingest <path-or-url>`

将内容导入 wiki 源层。

注意：

- URL 导入受 `ingest.allowUrlIngest` 控制
- 导入的源页面会在 frontmatter 中保留来源信息
- 启用后，导入完成后可自动编译

### `wiki okf import <path>`

将一个已解包的 Open Knowledge Format bundle 导入到 wiki 概念页面中。

导入器会读取 OKF 目录树中每个未保留的 `.md` 概念文档，要求 `type` 字段非空，并将未知的 OKF `type` 值视为通用概念。保留的 OKF `index.md` 和 `log.md` 文件不会作为概念导入。

导入后的页面会扁平化放置到 `concepts/` 下，因此现有的 wiki compile、search、get、digest 和 dashboard 流程会立即看到它们。原始 OKF 概念 ID、`type`、`resource`、`tags`、时间戳、源路径以及完整 frontmatter 都会保留在页面 frontmatter 中。内部 OKF markdown 链接会重写为生成的 wiki 页面；损坏或外部链接则保持不变。

示例：

```bash
openclaw wiki okf import ./bundles/ga4
openclaw wiki okf import ./bundles/ga4 --json
openclaw wiki search "BigQuery Table" --mode source-evidence --json
openclaw wiki get <path-from-json-result>
```

### `wiki compile`

重建索引、相关块、仪表板和编译后的摘要。

这会将稳定的、面向机器的工件写入以下位置：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

如果启用了 `render.createDashboards`，编译还会刷新报告页面。

### `wiki lint`

对 vault 进行 lint 并报告：

- 结构问题
- 来源信息缺口
- 矛盾
- 未解决的问题
- 低置信度页面/断言
- 过时的页面/断言

在完成有意义的 wiki 更新后运行此命令。

### `wiki search <query>`

搜索 wiki 内容。

行为取决于配置：

- `search.backend`: `shared` or `local`
- `search.corpus`: `wiki`, `memory`, or `all`
- `--mode`: `auto`, `find-person`, `route-question`, `source-evidence`, or
  `raw-claim`

当你想要 wiki 特定的排序或来源信息细节时，请使用 `wiki search`。
如果要进行一次广泛的共享召回，且当前活动的 memory 插件提供共享搜索，则优先使用 `openclaw memory search`。

搜索模式帮助 agent 选择正确的表面：

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

文本输出在结果匹配到结构化断言时会包含 `Claim:` 和 `Evidence:` 行。JSON 输出还会暴露 `matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、`evidenceKinds` 和 `evidenceSourceIds`，供 agent 侧深入查看。

### `wiki get <lookup>`

按 id 或相对路径读取 wiki 页面。

示例：

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

在不进行自由形式页面编辑的情况下，应用细粒度修改。

支持的流程包括：

- 创建/更新 synthesis 页面
- 更新页面元数据
- 关联 source id
- 添加问题
- 添加矛盾
- 更新置信度/状态
- 写入结构化断言

设置此命令是为了让 wiki 能够安全演进，而无需手动编辑受管理的块。

### `wiki bridge import`

从活动 memory 插件中导入公开的 memory artifacts 到 bridge 支持的源页面。

当你想将最新导出的 memory artifacts 拉入 wiki vault 时，请在 `bridge` 模式下使用此命令。

对于活动的 bridge artifact 读取，CLI 会通过 Gateway RPC 路由导入，因此导入会使用运行时 memory 插件上下文。如果禁用了 bridge 导入或关闭了 artifact 读取，该命令会保持本地/离线的零导入行为。

### `wiki unsafe-local import`

在 `unsafe-local` 模式下，从显式配置的本地路径导入。

这故意属于实验性功能，且仅限同一台机器。

### `wiki obsidian ...`

用于在 Obsidian 友好模式下运行 vault 的 Obsidian 辅助命令。

子命令：

- `status`
- `search`
- `open`
- `command`
- `daily`

当启用 `obsidian.useOfficialCli` 时，这些命令要求 `PATH` 中存在官方 `obsidian` CLI。

## 实际使用指南

- 当来源可追溯性和页面身份很重要时，使用 `wiki search` + `wiki get`。
- 不要手动编辑受管理的生成区块，而应使用 `wiki apply`。
- 在信任矛盾或低置信度内容之前，先运行 `wiki lint`。
- 在批量导入或源变更之后，如果你希望立即获得新的仪表板和编译后的摘要，请运行 `wiki compile`。
- 当数据目录、文档导出或 agent 增强流水线已经输出 OKF markdown bundles 时，使用 `wiki okf import`。
- 当 bridge 模式依赖于新导出的 memory artifacts 时，使用 `wiki bridge import`。

## 配置关联

`openclaw wiki` 的行为由以下配置项决定：

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

完整配置模型请参见 [Memory Wiki 插件](/plugins/memory-wiki)。

## 相关

- [CLI 参考](/cli)
- [Memory wiki](/plugins/memory-wiki)
