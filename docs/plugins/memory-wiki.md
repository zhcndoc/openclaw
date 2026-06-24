---
summary: "memory-wiki：一个带有来源、声明、仪表盘和桥接模式的编译知识库"
read_when:
  - 你希望在普通 MEMORY.md 笔记之外保留持久知识
  - 你正在配置捆绑的 memory-wiki 插件
  - 你想了解 wiki_search、wiki_get 或桥接模式
title: "Memory wiki"
---

`memory-wiki` 是一个捆绑插件，它将持久记忆转化为一个编译后的
知识库。

它**不会**取代活动记忆插件。活动记忆插件仍然负责
回忆、提升、索引和做梦。`memory-wiki` 位于其旁边，
并将持久知识编译为一个可导航的 wiki，包含确定性的页面、
结构化声明、来源、仪表盘和机器可读摘要。

当你希望记忆更像一个维护中的知识层，
而不是一堆 Markdown 文件时，就使用它。

## 它增加了什么

- 一个专用的 wiki 库，具有确定性的页面布局
- 结构化的声明和证据元数据，而不只是散文
- 页面级来源、置信度、矛盾和未解决问题
- 供代理/运行时消费者使用的编译摘要
- wiki 原生的 search/get/apply/lint 工具
- 可导入到编译后 wiki 概念中的 Open Knowledge Format
- 可选的桥接模式，可从活动记忆插件导入公开制品
- 可选的 Obsidian 友好渲染模式和 CLI 集成

## 它如何与记忆配合

可以这样理解这个分层：

| 层                                                      | 负责                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 活动记忆插件 (`memory-core`、QMD、Honcho 等)            | 回忆、语义搜索、提升、做梦、记忆运行时                                                     |
| `memory-wiki`                                           | 编译后的 wiki 页面、带丰富来源的综合、仪表盘、wiki 专用搜索/get/apply                      |

如果活动记忆插件暴露了共享回忆制品，OpenClaw 可以在一次遍历中同时搜索
两个层级：`memory_search corpus=all`。

当你需要 wiki 专用排序、来源信息或直接页面访问时，请改用
wiki 原生工具。

## 推荐的混合模式

对于本地优先的设置，一个很好的默认方案是：

- 使用 QMD 作为活动记忆后端，负责回忆和广泛语义搜索
- 使用 `memory-wiki` 的 `bridge` 模式，生成持久化的综合知识页面

这种分工效果很好，因为每一层都保持专注：

- QMD 保持原始笔记、会话导出和额外集合可搜索
- `memory-wiki` 编译稳定的实体、声明、仪表盘和来源页面

实用规则：

- 当你想要一次覆盖整个记忆的广泛回忆时，使用 `memory_search`
- 当你想要带来源感知的 wiki 结果时，使用 `wiki_search` 和 `wiki_get`
- 当你想让共享搜索跨越两个层级时，使用 `memory_search corpus=all`

如果桥接模式报告导出的制品为零，则说明活动记忆插件
目前还没有暴露公开的桥接输入。先运行 `openclaw wiki doctor`，
然后确认活动记忆插件支持公开制品。

当桥接模式处于激活状态且 `bridge.readMemoryArtifacts` 已启用时，
`openclaw wiki status`、`openclaw wiki doctor` 和 `openclaw wiki bridge
import` 会通过正在运行的 Gateway 读取。这使 CLI 的桥接检查与运行时记忆插件上下文保持一致。若桥接被禁用或制品读取被关闭，这些命令仍会保持本地/离线行为。

## 库模式

`memory-wiki` 支持三种库模式：

### `isolated`

拥有自己的库、自己的来源，不依赖 `memory-core`。

当你希望 wiki 成为自己独立策展的知识库时使用。

### `bridge`

通过公共插件 SDK 接口，从活动记忆插件读取公开记忆制品和记忆事件。

当你希望 wiki 编译并组织记忆插件导出的制品，而不进入私有插件内部时使用。

桥接模式可以索引：

- 导出的记忆制品
- 做梦报告
- 每日笔记
- 记忆根文件
- 记忆事件日志

### `unsafe-local`

面向本机私有路径的显式逃生通道。

此模式刻意设计为实验性且不可移植。仅在你理解信任边界，
并且确实需要桥接模式无法提供的本地文件系统访问时使用。

## 库布局

插件会初始化如下库结构：

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

受管理内容保留在生成块内。人工笔记块会被保留。

主要页面分组如下：

- `sources/`：用于导入的原始材料和由桥接支撑的页面
- `entities/`：用于持久化的事物、人、系统、项目和对象
- `concepts/`：用于想法、抽象、模式和策略
- `syntheses/`：用于编译摘要和维护中的汇总
- `reports/`：用于生成的仪表盘

## Open Knowledge Format 导入

`memory-wiki` 可以使用以下命令导入解包后的 Open Knowledge Format 捆绑包：

```bash
openclaw wiki okf import ./bundles/ga4
```

当数据目录、文档爬虫或丰富化代理已经生成 OKF 时，这是最合适的方式：
保留 OKF 作为可移植的交换制品，然后让 `memory-wiki` 将其转换为
OpenClaw 原生的概念页面和编译摘要。

导入器遵循 OKF v0.1 结构：

- 非保留的 `.md` 文件会被视为概念文档
- 每个导入的概念都需要一个非空的 `type` frontmatter 字段
- 未知的 OKF `type` 值也会被接受
- 保留的 `index.md` 和 `log.md` 文件不会作为概念导入
- 断开的或外部的 markdown 链接会被保留

导入的概念页面会平铺到 `concepts/` 下，因此现有的编译、
搜索、get、仪表盘和提示摘要路径都能看到它们，而无需添加第二棵
wiki 树。每个页面都会保留原始 OKF 概念 ID、源路径、`type`、
`resource`、`tags`、时间戳以及完整的生产者 frontmatter。内部 OKF 链接
会重写为生成的 wiki 概念页面，并且也会作为结构化的 `relationships`
条目输出，`kind: okf-link`。

## 结构化声明和证据

页面可以携带结构化的 `claims` frontmatter，而不只是自由文本。

每个声明都可以包含：

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

证据条目可以包含：

- `kind`
- `sourceId`
- `path`
- `lines`
- `weight`
- `confidence`
- `privacyTier`
- `note`
- `updatedAt`

这就是让 wiki 更像一个信念层，而不是一个被动笔记堆的原因。
声明可以被跟踪、评分、争议处理，并最终回溯到来源解决。

## 面向代理的实体元数据

实体页面也可以携带用于代理的路由元数据。这是通用的
frontmatter，因此适用于人、团队、系统、项目或任何其他
实体类型。

常见字段包括：

- `entityType`：例如 `person`、`team`、`system` 或 `project`
- `canonicalId`：在别名和导入之间使用的稳定身份键
- `aliases`：应解析到同一页面的名称、账号或标签
- `privacyTier`：`public`、`local-private`、`sensitive` 或 `confirm-before-use`
- `bestUsedFor` / `notEnoughFor`：简洁的路由提示
- `lastRefreshedAt`：独立于页面编辑时间的来源刷新时间戳
- `personCard`：可选的人员专用路由卡，包含账号、社交链接、
  邮箱、时区、轨道、可询问内容、避免询问内容、置信度和隐私
- `relationships`：指向相关页面的类型化边，包含目标、关系类型、权重、
  置信度、证据类型、隐私层级和备注

对于人员 wiki，代理通常应先打开
`reports/person-agent-directory.md`，然后在使用联系方式或推断事实之前，
用 `wiki_get` 打开该人员页面。

示例：

```yaml
pageType: entity
entityType: person
id: entity.brad-groux
canonicalId: maintainer.brad-groux
aliases:
  - Brad
  - bgroux
privacyTier: local-private
bestUsedFor:
  - Microsoft Teams 和 Azure 路由
notEnoughFor:
  - 法律批准
lastRefreshedAt: "2026-04-29T00:00:00.000Z"
personCard:
  handles:
    - "@bgroux"
  socials:
    - "https://x.example/bgroux"
  emails:
    - brad@example.com
  timezone: America/Chicago
  lane: Microsoft 生态系统
  askFor:
    - Teams rollout questions
  avoidAskingFor:
    - 无关的计费决策
  confidence: 0.8
  privacyTier: confirm-before-use
relationships:
  - targetId: entity.alice
    targetTitle: Alice
    kind: collaborates-with
    confidence: 0.7
    evidenceKind: discrawl-stat
claims:
  - id: claim.brad.teams
    text: Brad 对 Microsoft Teams 路由很有用。
    status: supported
    confidence: 0.9
    evidence:
      - kind: maintainer-whois
        sourceId: source.maintainers
        privacyTier: local-private
```

## 编译管线

编译步骤会读取 wiki 页面、规范化摘要，并在以下位置输出稳定的
面向机器的制品：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

之所以存在这些摘要，是为了让代理和运行时代码不必去抓取 Markdown
页面。

编译输出还驱动：

- 用于 search/get 流程的首轮 wiki 索引
- 将 claim-id 回查到所属页面
- 紧凑的提示词补充
- 报告/仪表盘生成

## 仪表盘和健康报告

当启用 `render.createDashboards` 时，编译会在 `reports/` 下维护仪表盘。

内置报告包括：

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`
- `reports/person-agent-directory.md`
- `reports/relationship-graph.md`
- `reports/provenance-coverage.md`
- `reports/privacy-review.md`

这些报告会跟踪如下内容：

- 矛盾备注聚类
- 竞争性声明聚类
- 缺少结构化证据的声明
- 低置信度页面和声明
- 过时或未知新鲜度
- 存在未解决问题的页面
- 人员/实体路由卡
- 结构化关系边
- 证据类别覆盖情况
- 需要在使用前审查的非公开隐私层级

## 搜索与检索

`memory-wiki` 支持两种搜索后端：

- `shared`：在可用时使用共享记忆搜索流程
- `local`：本地搜索 wiki

它还支持三种语料库：

- `wiki`
- `memory`
- `all`

重要行为：

- `wiki_search` 和 `wiki_get` 在可能时会先使用编译后的摘要
- claim id 可以回解析到所属页面
- 有争议/过时/新鲜的声明会影响排序
- 来源标签可以保留到结果中
- 搜索模式可以针对人员查找、问题路由、来源
  证据或原始声明来偏置排序

实用规则：

- 当你想要一次广泛回忆时，使用 `memory_search corpus=all`
- 当你关心 wiki 专用排序、来源信息或页面级信念结构时，使用 `wiki_search` + `wiki_get`

搜索模式：

- `auto`：平衡的默认模式
- `find-person`：提升类似人员的实体、别名、账号、社交信息和
  规范 ID
- `route-question`：提升代理卡片、可询问提示、最佳用途提示和
  关系上下文
- `source-evidence`：提升来源页面和结构化证据元数据
- `raw-claim`：提升匹配的结构化声明，并在结果中返回声明/证据
  元数据

当结果匹配到结构化声明时，`wiki_search` 可以在其详细载荷中返回
`matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、
`evidenceKinds` 和 `evidenceSourceIds`。当可用时，文本输出还会包含简洁的
`Claim:` 和 `Evidence:` 行。

## 代理工具

插件注册了以下工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它们的作用：

- `wiki_status`：当前库模式、健康状态、Obsidian CLI 可用性
- `wiki_search`：搜索 wiki 页面，并在配置后搜索共享记忆语料库；
  接受 `mode` 用于人员查找、问题路由、来源证据或原始
  声明深挖
- `wiki_get`：按 id/path 读取 wiki 页面，或回退到共享记忆语料库
- `wiki_apply`：进行受限的综合/元数据修改，而不进行自由形式的页面手术
- `wiki_lint`：结构检查、来源缺口、矛盾、开放问题

插件还注册了一个非独占的记忆语料补充，因此当活动记忆插件支持语料选择时，共享的
`memory_search` 和 `memory_get` 也可以访问 wiki。

## 提示词和上下文行为

当启用 `context.includeCompiledDigestPrompt` 时，记忆提示词部分会
附加来自 `agent-digest.json` 的紧凑编译快照。

该快照刻意保持小而高信号：

- 仅保留顶部页面
- 仅保留顶部声明
- 矛盾数量
- 问题数量
- 置信度/新鲜度限定信息

这是可选功能，因为它会改变提示词形状，主要适用于上下文引擎
或显式消费记忆补充内容的旧式提示词组装。

## 配置

把配置放在 `plugins.entries.memory-wiki.config` 下：

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

关键开关：

- `vaultMode`：`isolated`、`bridge`、`unsafe-local`
- `vault.renderMode`：`native` 或 `obsidian`
- `bridge.readMemoryArtifacts`：导入活动记忆插件的公开制品
- `bridge.followMemoryEvents`：在桥接模式中包含事件日志
- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`：将紧凑摘要快照附加到记忆提示词部分
- `render.createBacklinks`：生成确定性的相关块
- `render.createDashboards`：生成仪表盘页面

### 示例：QMD + 桥接模式

当你希望使用 QMD 负责回忆，而 `memory-wiki` 负责维护
知识层时，就使用这个方案：

```json5
{
  memory: {
    backend: "qmd",
  },
  plugins: {
    entries: {
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

这会保持：

- 由 QMD 负责活动记忆回忆
- `memory-wiki` 专注于编译后的页面和仪表盘
- 在你显式启用编译摘要提示词之前，提示词形状保持不变

## CLI

`memory-wiki` 还提供顶层 CLI 接口：

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

完整命令参考请参见 [CLI: wiki](/cli/wiki)。

## Obsidian 支持

当 `vault.renderMode` 为 `obsidian` 时，插件会写入适用于 Obsidian 的
Markdown，并且可以选择使用官方的 `obsidian` CLI。

支持的工作流包括：

- 状态探测
- vault 搜索
- 打开页面
- 调用 Obsidian 命令
- 跳转到每日笔记

这是一项可选功能。即使不使用 Obsidian，wiki 在原生模式下仍然可以工作。

## 推荐工作流

1. 保持你当前的 memory 插件，用于回忆/提升/梦想。
2. 启用 `memory-wiki`。
3. 除非你明确想要 bridge 模式，否则从 `isolated` 模式开始。
4. 当需要关注来源时，使用 `wiki_search` / `wiki_get`。
5. 对于较小的综合或元数据更新，使用 `wiki_apply`。
6. 在有意义的更改后运行 `wiki_lint`。
7. 如果你想查看过期信息/冲突，可打开仪表板。

## 相关文档

- [Memory 概览](/concepts/memory)
- [CLI: memory](/cli/memory)
- [CLI: wiki](/cli/wiki)
- [Plugin SDK 概览](/plugins/sdk-overview)
