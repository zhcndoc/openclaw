---
summary: "memory-wiki：带有出处、声明、仪表板和桥接模式的编译知识库"
read_when:
  - 您希望获得超越普通 MEMORY.md 笔记的持久化知识
  - 您正在配置捆绑的 memory-wiki 插件
  - 您想了解 wiki_search、wiki_get 或桥接模式
title: "Memory wiki"
---

`memory-wiki` 是一个捆绑插件，它将持久化记忆转化为一个编译后的
知识保险库。

它**不会**取代活跃的记忆插件。活跃的记忆插件仍然负责回忆、推广、索引和梦境。`memory-wiki` 则与之并列，将持久化知识编译成具有确定性页面、结构化声明、出处、仪表板和机器可读摘要的可导航维基。

当您希望记忆更像一个维护中的知识层，而不是 Markdown 文件的堆叠时，请使用它。

## 它增加了什么

- 一个专用的维基库，具有确定性的页面布局
- 结构化的声明和证据元数据，而不仅仅是散文
- 页面级别的出处、置信度、矛盾点和开放问题
- 供代理/运行时消费者使用的编译摘要
- 原生维基搜索/获取/应用/检查工具
- 可选的桥接模式，用于从活跃记忆插件导入公共工件
- 可选的 Obsidian 友好渲染模式和 CLI 集成

## 它与记忆的关系

可以这样理解这种分层：

| 层级                                                   | 拥有                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 活跃记忆插件 (`memory-core`, QMD, Honcho 等) | 回忆、语义搜索、推广、梦境、记忆运行时                               |
| `memory-wiki`                                           | 编译的维基页面、出处丰富的综合、仪表板、维基特定的搜索/获取/应用 |

如果活跃记忆插件公开了共享回忆工件，OpenClaw 可以通过 `memory_search corpus=all` 在一次传递中同时搜索两个层级。

当您需要在维基特定排名、出处或直接页面访问时，请使用维基原生工具。

## 推荐的混合模式

对于本地优先设置，一个强大的默认方案是：

- 使用 QMD 作为活跃记忆后端，用于回忆和广泛的语义搜索
- 使用 `bridge` 模式的 `memory-wiki` 用于持久的综合知识页面

这种划分效果很好，因为每一层都保持专注：

- QMD 保持原始笔记、会话导出和额外集合可搜索
- `memory-wiki` 编译稳定的实体、声明、仪表板和来源页面

实用规则：

- 当您想要对记忆进行一次广泛的回忆传递时，使用 `memory_search`
- 当您想要感知出处的维基结果时，使用 `wiki_search` 和 `wiki_get`
- 当您想要共享搜索跨越两个层级时，使用 `memory_search corpus=all`

如果桥接模式报告零导出的工件，则活跃记忆插件当前尚未公开公共桥接输入。首先运行 `openclaw wiki doctor`，然后确认活跃记忆插件支持公共工件。

## 库模式

`memory-wiki` 支持三种库模式：

### 隔离模式 (isolated)

独立的库，独立来源，不依赖 `memory-core`。

当您希望维基成为自己策划的知识存储时使用此模式。

### 桥接模式 (bridge)

通过公共插件 SDK 接缝从活跃记忆插件读取公共记忆工件和记忆事件。

当您希望维基编译并组织记忆插件导出的工件，而不触及私有插件内部时使用此模式。

桥接模式可以索引：

- 导出的记忆工件
- 梦境报告
- 每日笔记
- 记忆根文件
- 记忆事件日志

### 不安全本地模式 (unsafe-local)

显式的本地私有路径逃逸舱口。

此模式有意为实验性且不可移植。仅在您了解信任边界并特别需要桥接模式无法提供的本地文件系统访问时使用。

## 库布局

插件初始化如下库：

```text
<vault>/
  AGENTS.md
  WIKI.md
  index.md
  inbox.md
  entities/
  concepts/
  syntheses/
  sources/
  reports/
  _attachments/
  _views/
  .openclaw-wiki/
```

管理内容保留在生成的块内。人类笔记块被保留。

主要页面分组包括：

- `sources/` 用于导入的原始材料和桥接支持的页面
- `entities/` 用于持久化的事物、人、系统、项目和对象
- `concepts/` 用于想法、抽象、模式和策略
- `syntheses/` 用于编译的摘要和维护的汇总
- `reports/` 用于生成的仪表板

## 结构化声明和证据

页面可以携带结构化的 `claims` frontmatter，而不仅仅是自由文本。

每个声明可以包含：

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

证据条目可以包含：

- `sourceId`
- `path`
- `lines`
- `weight`
- `note`
- `updatedAt`

这使得维基更像一个信念层而不是被动笔记堆。声明可以被跟踪、评分、质疑和解决回来源。

## 编译管道

编译步骤读取维基页面，标准化摘要，并在以下位置发出稳定的面向机器的工件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

这些摘要的存在是为了让代理和运行时代码不必刮削 Markdown 页面。

编译输出还驱动：

- 搜索/获取流程的首次维基索引
- 声明 ID 查找回拥有页面
- 紧凑的提示补充
- 报告/仪表板生成

## 仪表板和健康报告

当启用 `render.createDashboards` 时，编译会在 `reports/` 下维护仪表板。

内置报告包括：

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

这些报告跟踪诸如：

- 矛盾注释集群
- 竞争性声明集群
- 缺少结构化证据的声明
- 低置信度页面和声明
- 陈旧或未知的新鲜度
- 有未解决问题页面的内容

## 搜索和检索

`memory-wiki` 支持两种搜索后端：

- `shared`：当可用时使用共享记忆搜索流程
- `local`：本地搜索维基

它还支持三个语料库：

- `wiki`
- `memory`
- `all`

重要行为：

- `wiki_search` 和 `wiki_get` 尽可能使用编译摘要作为首次传递
- 声明 ID 可以解析回拥有页面
- 有争议/陈旧/新鲜的声明会影响排名
- 出处标签可以存活到结果中

实用规则：

- 使用 `memory_search corpus=all` 进行广泛的回忆传递
- 当您需要维基特定排名、出处或页面级信念结构时，使用 `wiki_search` + `wiki_get`

## 代理工具

插件注册了这些工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它们的作用：

- `wiki_status`：当前库模式、健康状况、Obsidian CLI 可用性
- `wiki_search`：搜索维基页面，当配置时，也搜索共享记忆语料库
- `wiki_get`：通过 ID/路径读取维基页面，或回退到共享记忆语料库
- `wiki_apply`：窄合成/元数据突变，无需自由形式页面手术
- `wiki_lint`：结构检查、出处差距、矛盾、开放问题

插件还注册了一个非独占的记忆语料库补充，因此共享的 `memory_search` 和 `memory_get` 可以在活跃记忆插件支持语料库选择时访问维基。

## 提示和上下文行为

当启用 `context.includeCompiledDigestPrompt` 时，记忆提示部分会附加来自 `agent-digest.json` 的紧凑编译快照。

该快照有意小而高信号：

- 仅顶级页面
- 仅顶级声明
- 矛盾计数
- 问题计数
- 置信度/新鲜度限定符

这是可选的，因为它会改变提示形状，并且主要对明确消费记忆补充的上下文引擎或遗留提示组装有用。

## 配置

在 `plugins.entries.memory-wiki.config` 下放置配置：

```json5
{
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "isolated",
          vault: {
            path: "~/.openclaw/wiki/main",
            renderMode: "obsidian",
          },
          obsidian: {
            enabled: true,
            useOfficialCli: true,
            vaultName: "OpenClaw Wiki",
            openAfterWrites: false,
          },
          bridge: {
            enabled: false,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          ingest: {
            autoCompile: true,
            maxConcurrentJobs: 1,
            allowUrlIngest: true,
          },
          search: {
            backend: "shared",
            corpus: "wiki",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
          render: {
            preserveHumanBlocks: true,
            createBacklinks: true,
            createDashboards: true,
          },
        },
      },
    },
  },
}
```

关键切换：

- `vaultMode`：`isolated`、`bridge`、`unsafe-local`
- `vault.renderMode`：`native` 或 `obsidian`
- `bridge.readMemoryArtifacts`：导入活跃记忆插件的公共工件
- `bridge.followMemoryEvents`：在桥接模式下包含事件日志
- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`：将紧凑摘要快照附加到记忆提示部分
- `render.createBacklinks`：生成确定性的相关块
- `render.createDashboards`：生成仪表板页面

### 示例：QMD + 桥接模式

当您希望使用 QMD 进行回忆并使用 `memory-wiki` 维护知识层时使用此配置：

```json5
{
  memory: {
    backend: "qmd",
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "bridge",
          bridge: {
            enabled: true,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          search: {
            backend: "shared",
            corpus: "all",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
        },
      },
    },
  },
}
```

这将保持：

- QMD 负责活跃记忆回忆
- `memory-wiki` 专注于编译页面和仪表板
- 提示形状保持不变，直到您有意启用编译摘要提示

## 命令行界面 (CLI)

`memory-wiki` 还暴露了一个顶级 CLI 表面：

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki get entity.alpha
openclaw wiki apply synthesis "Alpha Summary" --body "..." --source-id source.alpha
openclaw wiki bridge import
openclaw wiki obsidian status
```

有关完整命令参考，请参见 [CLI: wiki](/cli/wiki)。

## Obsidian 支持

当 `vault.renderMode` 为 `obsidian` 时，插件会写入 Obsidian 友好的 Markdown，并可以选择使用官方的 `obsidian` CLI。

支持的工作流包括：

- 状态探测
- 库搜索
- 打开页面
- 调用 Obsidian 命令
- 跳转到每日笔记

这是可选的。维基在没有 Obsidian 的情况下仍可在原生模式下工作。

## 推荐工作流

1. 保持您的活跃记忆插件用于回忆/推广/梦境。
2. 启用 `memory-wiki`。
3. 除非您明确想要桥接模式，否则从 `isolated` 模式开始。
4. 当出处重要时使用 `wiki_search` / `wiki_get`。
5. 对于窄合成或元数据更新，使用 `wiki_apply`。
6. 在重大更改后运行 `wiki_lint`。
7. 如果您需要陈旧/矛盾可见性，请开启仪表板。

## 相关文档

- [内存概览](/concepts/memory)
- [CLI: 内存](/cli/memory)
- [CLI: wiki](/cli/wiki)
- [插件 SDK 概览](/plugins/sdk-overview)
