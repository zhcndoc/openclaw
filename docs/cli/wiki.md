---
summary: "openclaw wiki 的命令行参考（内存知识库状态、搜索、编译、检查、应用、桥接及 Obsidian 助手）"
read_when:
  - 您想使用 memory-wiki CLI
  - 您正在编写或修改 `openclaw wiki`
title: "Wiki"
---

# `openclaw wiki`

检查和维护 `memory-wiki` 知识库。

由捆绑的 `memory-wiki` 插件提供。

相关资源：

- [Memory Wiki 插件](/plugins/memory-wiki)
- [Memory 概览](/concepts/memory)
- [CLI：memory](/cli/memory)

## 用途说明

当您希望拥有一个已编译的知识库，并具备以下功能时，请使用 `openclaw wiki`：

- 原生维基式搜索与页面阅读
- 来源丰富的综合摘要
- 矛盾点与内容新鲜度报告
- 从活跃记忆插件导入桥接数据
- 可选的 Obsidian CLI 辅助工具

## 常用命令

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
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

openclaw wiki obsidian status
openclaw wiki obsidian search "alpha"
openclaw wiki obsidian open syntheses/alpha-summary.md
openclaw wiki obsidian command workspace:quick-switcher
openclaw wiki obsidian daily
```

## 命令详解

### `wiki status`

检查当前知识库模式、健康状况以及 Obsidian CLI 的可用性。

当您不确定知识库是否已初始化、桥接模式是否正常，或 Obsidian 集成是否可用时，请首先使用此命令。

### `wiki doctor`

运行知识库健康检查，并报告配置或知识库中的问题。

常见问题包括：

- 启用了桥接模式但未设置公开的记忆工件
- 知识库布局无效或缺失
- 预期使用 Obsidian 模式时缺少外部 Obsidian CLI

### `wiki init`

创建知识库的初始结构并生成起始页面。

这将初始化根目录结构，包括顶级索引和缓存目录。

### `wiki ingest <path-or-url>`

将内容导入到知识库源层。

注意事项：

- URL 导入受 `ingest.allowUrlIngest` 控制
- 导入的源页面在 frontmatter 中保留来源信息
- 启用后可在导入完成后自动运行编译

### `wiki compile`

重建索引、关联块、仪表板以及编译后的摘要。

这会在以下位置写入稳定的机器可读工件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

如果启用了 `render.createDashboards`，编译还会刷新报告页面。

### `wiki lint`

检查知识库并报告：

- 结构性问题
- 来源信息缺失
- 矛盾点
- 待解决问题
- 低置信度的页面/声明
- 过时的页面/声明

在进行有意义的知识库更新后请运行此命令。

### `wiki search <query>`

搜索知识库内容。

行为取决于配置：

- `search.backend`: `shared` 或 `local`
- `search.corpus`: `wiki`, `memory`, 或 `all`

当您需要维基特定的排序或来源详情时，请使用 `wiki search`。
如需一次广泛的共享检索，当活跃记忆插件支持共享搜索时，建议优先使用 `openclaw memory search`。

### `wiki get <lookup>`

通过 ID 或相对路径读取知识库页面。

示例：

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

在不进行自由格式页面编辑的前提下，执行窄范围修改。

支持的流程包括：

- 创建/更新综合摘要页面
- 更新页面元数据
- 附加来源 ID
- 添加问题
- 添加矛盾点
- 更新置信度/状态
- 写入结构化声明

此命令的存在是为了让知识库能够在不手动编辑管理区块的情况下安全演进。

### `wiki bridge import`

从活跃记忆插件导入公开的记忆工件到桥接支持的源页面。

在 `bridge` 模式下，当您希望将最新的导出的记忆工件拉取到知识库中时使用此命令。

### `wiki unsafe-local import`

在 `unsafe-local` 模式下，从明确配置的本地路径导入。

此功能有意设计为实验性的，且仅限同一台机器上使用。

### `wiki obsidian ...`

用于运行在 Obsidian 友好模式下的知识库的帮助命令。

子命令包括：

- `status`
- `search`
- `open`
- `command`
- `daily`

当 `obsidian.useOfficialCli` 启用时，这些命令需要官方 `obsidian` CLI 位于 `PATH` 中。

## 实用操作指导

- 当来源信息和页面身份很重要时，请使用 `wiki search` + `wiki get`。
- 不要手动编辑生成的区块，而是使用 `wiki apply`。
- 在信任矛盾或低置信度内容之前，请先运行 `wiki lint`。
- 在批量导入或源变更后，如果您希望立即获得新的仪表板和编译摘要，请使用 `wiki compile`。
- 当桥接模式依赖于新导出的记忆工件时，请使用 `wiki bridge import`。

## 配置关联

`openclaw wiki` 的行为由以下配置决定：

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

请参阅 [Memory Wiki 插件](/plugins/memory-wiki) 了解完整的配置模型。

## 相关内容

- [CLI 参考](/cli)
- [Memory wiki](/plugins/memory-wiki)
