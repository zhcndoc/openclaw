---
summary: "memory-wiki：一个带有来源、声明、仪表盘和桥接模式的编译知识库"
read_when:
  - "你想要超越普通 MEMORY.md 笔记的持久知识"
  - "你正在配置捆绑的 memory-wiki 插件"
  - "你需要为同一个 Gateway 中的不同代理使用独立的 wiki vault"
  - "你想了解 wiki_search、wiki_get 或 bridge 模式"
title: "记忆 wiki"
---

`memory-wiki` 是一个捆绑插件，可将持久知识编译成可导航的 wiki：根据保存的数据、带有证据的结构化声明、出处、仪表板和机器可读摘要构建的页面。

它不会取代活动记忆插件。回忆、晋升、索引和做梦仍由已配置的记忆插件（`memory-core`、Honcho 及其他插件）负责。`memory-wiki` 与其并行运行，将知识编译到一个受维护的 wiki 层中。

在使用其 CLI、工具或运行时集成之前，启用该插件：

```bash
openclaw plugins enable memory-wiki
```

启用自动应用于正在运行的网关。如果处于离线状态，请启动它以使用运行时集成。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

| 层                | 负责内容                                                                              |
| -------------------- | --------------------------------------------------------------------------------- |
| 活动记忆插件 | 回忆、语义搜索、晋升、做梦、记忆运行时                      |
| `memory-wiki`        | 编译的 wiki 页面、出处丰富的综合、仪表板、wiki search/get/apply |

实用规则：

- `memory_search` 用于对已配置的任意语料库进行一次宽泛的回忆检索
- `wiki_search` / `wiki_get` 用于你需要 wiki 特定排序、来源，或页面级信念结构时
- 当活动记忆插件支持语料库选择时，使用 `memory_search corpus=all` 可在一次调用中跨越两层

常见的本地优先设置使用内置内存进行调用，并在 `bridge` 模式下使用 `memory-wiki` 来实现持久的合成页面。请参阅 [Configuration](#configuration) 下的桥接模式示例。

如果 bridge 模式报告导出的工件数量为零，则说明活动记忆插件当前没有暴露公共 bridge 输入。先运行 `openclaw wiki doctor`，然后确认活动记忆插件支持公共工件。

## <a id="vault-modes"></a> Vault 模式

- `isolated`（默认）：自有 vault，自有来源，不依赖于当前激活的 memory 插件。用于构建一个自包含的精选知识库。
- `bridge`：通过公共插件 SDK 接口从活动内存插件读取公共内存工件和事件日志。使用它来编译内存插件的导出工件，而无需触及私有插件内部。
- `unsafe-local`：面向本机私有路径的显式逃生通道。该模式有意保持实验性且不可移植；仅在你了解信任边界并且确实需要 bridge 模式无法提供的本地文件系统访问时使用。

桥接和不安全本地源文件必须包含有效的 UTF-8。如果更改的源包含格式错误的字节，则其导入会失败，而不会替换其现有 wiki 页面或更新其同步元数据。将源恢复为有效的 UTF-8，然后重试 `openclaw wiki bridge import` 或 `openclaw wiki unsafe-local import`。

Vault 模式和 vault 范围是两个独立的选择：

- `vaultMode` 决定 wiki 输入的来源。
- `vault.scope` 决定所有 agent 共用一个 vault，还是每个 agent 使用一个子 vault。

`vault.scope: "global"` 是默认值，保留现有的单保管库行为。当代理不得共享 wiki 页面、编译摘要、搜索结果或写入时，请使用 `vault.scope: "agent"` 与 `isolated` 或 `bridge` 模式。代理作用域无法与 `unsafe-local` 模式结合使用，因为这些配置的专用路径不是代理拥有的输入。配置验证拒绝此组合。

Bridge 模式可以按每个 `bridge.*` 配置开关索引以下内容：

- 导出的 memory 产物（`indexMemoryRoot`）
- 每日笔记（`indexDailyNotes`）
- 梦境报告（`indexDreamReports`）
- memory 事件日志（`followMemoryEvents`）

当桥接模式处于活动状态并启用 `bridge.readMemoryArtifacts` 时，`openclaw wiki status`、`openclaw wiki doctor` 和 `openclaw wiki bridge import` 通过正在运行的网关进行路由，因此它们会看到与 agent/runtime 内存相同的活动内存插件上下文。如果禁用桥接或关闭工件读取，这些命令将保留 local/offline 行为。

## <a id="vault-layout"></a> 库布局

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

受管内容保留在生成的块内；人工笔记块会在重新生成时保留。

- `sources/`：导入的原始材料以及 bridge/unsafe-local-backed 页面
- `entities/`：持久的事物、人物、系统、项目、对象
- `concepts/`：想法、抽象、模式、政策（也是 OKF 导入的落脚点）
- `syntheses/`：汇总摘要和维护中的汇总表
- `reports/`：生成的仪表板。

## <a id="open-knowledge-format-imports"></a> Open Knowledge Format 导入

```bash
openclaw wiki okf import ./bundles/ga4
```

将解压的开放知识格式包导入 wiki 概念页面。当数据目录、文档爬虫或丰富代理已经生成 OKF 时，非常适合：将 OKF 保留为便携式交换工件，让 `memory-wiki` 将其转换为 OpenClaw-native 概念页面和编译摘要。

- 未保留的 `.md` 文件是概念文档
- 每个导入的概念都要求有一个非空的 `type` frontmatter 字段；缺失 `type` 会产生 `missing-type` 警告并跳过该文件
- 未知的 `type` 值会作为通用概念被接受
- `index.md` 和 `log.md` 是保留文件，绝不会作为概念导入
- 损坏的或外部降价链接保持不变
- 内联代码、隔离代码和缩进代码块内的链接保持原义

导入的页面会在 `concepts/` 下扁平化，因此现有的 compile、search、get 和 dashboard 流程无需第二个 wiki 树也能看到它们。每个页面都会保留原始的 OKF 概念 ID、源路径、`type`、`resource`、`tags`、时间戳，以及完整的 producer frontmatter。内部 OKF 链接会重写为生成的 wiki 概念页面，并同时发出结构化的 `relationships` 条目，`kind: okf-link`。

## <a id="structured-claims-and-evidence"></a> 结构化声明和证据

页面承载结构化的 `claims` frontmatter，而不只是自由格式文本。每条 claim 都可以包含 `id`、`text`、`status`、`confidence`、`evidence[]` 和 `updatedAt`。每条 evidence 记录都可以包含 `kind`、`sourceId`、`path`、 `lines`、`weight`、`confidence`、`privacyTier`、`note` 和 `updatedAt`。

这使得 wiki 更像一个信念层，而不是一个被动的笔记堆。声明可以被跟踪、评分、争议，并最终回溯到来源得到解决。

## <a id="agent-facing-entity-metadata"></a> 面向代理的实体元数据

实体页面承载通用路由元数据，可用于人物、团队、系统、项目或任何其他实体类型：

- `entityType`：例如 `person`、`team`、`system`、`project`
- `canonicalId`：跨别名和导入保持稳定的身份键
- `aliases`：可解析到同一页面的名称、处理名或标签
- `privacyTier`：自由格式字符串；`public` 视为无需审核，任何其他值（例如 `local-private`、`sensitive`、`confirm-before-use`）都会在 `reports/privacy-review.md` 中标记
- `bestUsedFor` / `notEnoughFor`：简明路由提示
- `lastRefreshedAt`：来源刷新时间戳，与页面编辑时间分开
- `personCard`：可选的面向人物的路由卡片（处理名、社交账号、邮箱、时区、分工、ask-for、avoid-asking-for、confidence、privacy tier）
- `relationships`：指向相关页面的有类型边（目标、关系类型、权重、置信度、证据类型、隐私级别、备注）

对于人物 wiki，请先查看 `reports/person-agent-directory.md`，然后在使用联系方式或推断事实之前，先用 `wiki_get` 打开该人物页面。

<Accordion id="entity-page-example" title="实体页面示例">
```yaml
pageType: entity
entityType: person
id: entity.example-person
canonicalId: maintainer.example-person
aliases:
  - Alex
  - example-handle
privacyTier: local-private
bestUsedFor:
  - Example project routing
notEnoughFor:
  - legal approval
lastRefreshedAt: "2026-04-29T00:00:00.000Z"
personCard:
  handles:
    - "@example-handle"
  socials:
    - "https://x.example/example-handle"
  emails:
    - alex@example.com
  timezone: America/Chicago
  lane: Example project
  askFor:
    - Example rollout questions
  avoidAskingFor:
    - unrelated billing decisions
  confidence: 0.8
  privacyTier: confirm-before-use
relationships:
  - targetId: entity.other-person
    targetTitle: Other Person
    kind: collaborates-with
    confidence: 0.7
    evidenceKind: discrawl-stat
claims:
  - id: claim.example.routing
    text: Alex is useful for example-project routing.
    status: supported
    confidence: 0.9
    evidence:
      - kind: maintainer-whois
        sourceId: source.maintainers
        privacyTier: local-private
```
</Accordion>

## <a id="compile-pipeline"></a> 编译管线

Compile 读取 wiki 页面，规范化摘要，并将面向机器的快照保留在 OpenClaw 的共享 SQLite 插件状态中。运行时代码在异步提示准备期间使用生命周期拥有的所有者快照加载 SQLite；同步提示程序集永远不会刮擦 Markdown 或读取缓存文件。编译输出还支持 search/get 的首次 wiki 索引、声明 ID 查找所属页面、紧凑的提示补充和报告生成。

当无法读取现有索引和仪表板注释的文件时，编译会保留它们。它报告读取错误，而不是将页面视为丢失；解决文件系统错误并再次编译。

仅在下一次编译后，源编辑和保管库恢复才变为面向机器。重新启动或刷新插件生命周期会将保管库的因果链编译发布与 SQLite 进行比较，并拒绝来自更新的回滚状态的快照。在回滚之前启动的编译器无法针对恢复的前身进行发布。提示准备不会轮询保管库或安装文件监视程序。回滚隔离后，运行进程中的编译会立即清除所有者；单独的编译器进程需要插件生命周期刷新，以便守护进程可以确认新的持久发布。启用自动编译后，状态和 wiki 工具的源同步会在重建丢失的进程内快照之前检查有效的外部发布缓存。未更改的保管库会重复使用该出版物；更改的导入、丢失的索引或无效的缓存仍然需要编译。 ChatGPT 导入回滚在编译前记录导入后编辑，并将其恢复路径保持在插件状态，因此中断的回滚可以协调恢复目录并在重试时报告相同的保留页面。目标恢复在持久进程重启栅栏之前完成。之后，重试重建派生索引、仪表板和编译的缓存，而无需重写源页面或移动或删除恢复工件。稍后的正常编译可能会刷新机器管理的相关块。这涵盖了普通文件系统调用返回后的进程内故障和进程重新启动。它不保证跨内核或主机断电的写入顺序。路径名写赛车围栏持久性要么在成功围栏后保留，要么通过围栏前重试保留在 `recovered/` 下。在对导入拥有的索引节点进行分类和取消链接之前打开的文件描述符进行的写入无法得到保证，并且可能会丢失。编译的缓存是可重建的：发布时期之前的缓存行被视为未命中并由下一次编译替换；他们没有迁移。

## <a id="dashboards-and-health-reports"></a> 仪表盘和健康报告

当启用 `render.createDashboards` 时，编译过程会在 `reports/` 下维护仪表盘：

| 报告                              | 跟踪内容                                             |
| ----------------------------------- | -------------------------------------------------- |
| `reports/open-questions.md`         | 存在未解决问题的页面                    |
| `reports/contradictions.md`         | 矛盾笔记簇                        |
| `reports/low-confidence.md`         | 置信度较低的页面和断言                    |
| `reports/claim-health.md`           | 缺少结构化证据的断言                 |
| `reports/stale-pages.md`            | 陈旧或新鲜度未知的页面                         |
| `reports/person-agent-directory.md` | person/entity路由卡                        |
| `reports/relationship-graph.md`     | 结构化关系边                      |
| `reports/provenance-coverage.md`    | 证据类别覆盖                            |
| `reports/privacy-review.md`         | 使用前需要审查的非公开隐私级别 |

## <a id="search-and-retrieval"></a> 搜索与检索

两种搜索后端：

- `shared`：在可用时使用共享记忆搜索流程
- `local`：本地搜索 wiki

三种语料库：`wiki`、`memory`、`all`。

- `wiki_search` / `wiki_get` 在可能时会先使用编译后的摘要作为第一步
- claim id 会解析回所属页面
- contested/stale/fresh 声称影响力排名
- 来源标签会保留到结果中

搜索模式（`--mode` / tool `mode` 参数）：

| 模式              | 加强项                                                         |
| ----------------- | -------------------------------------------------------------- |
| `auto`            | 平衡默认值                                               |
| `find-person`     | 类人实体、别名、句柄、社交、主要 ID   |
| `route-question`  | agent cards、ask-for/best-used-for 提示、关系上下文 |
| `source-evidence` | 来源页面和结构化证据元数据                  |
| `raw-claim`       | 匹配结构化 claim；返回 claim/evidence 元数据    |

当某个结果匹配结构化 claim 时，`wiki_search` 会在其详情载荷中返回 `matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、 `evidenceKinds` 和 `evidenceSourceIds`。当可用时，文本输出会包含简洁的 `Claim:` 和 `Evidence:` 行。

## <a id="agent-tools"></a> 代理工具

| 工具          | 用途                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wiki_status` | 当前 vault 模式和作用范围、已解析的代理、健康状态、Obsidian CLI 可用性                                                                               |
| `wiki_search` | 搜索 wiki 页面，并在已配置时搜索共享记忆语料；接受 `mode` 参数用于人员查找、问题路由、来源证据或原始声明深挖 |
| `wiki_get`    | 按 id/path 读取 wiki 页面；如果启用了共享搜索且未命中，则回退到共享记忆语料                                     |
| `wiki_apply`  | 无需自由页手术即可缩小 synthesis/metadata 突变                                                                                             |
| `wiki_lint`   | 结构检查、来源缺口、矛盾、未解问题                                                                                            |

`wiki_search` 有 30 秒的截止时间和荣誉回合取消。超时或取消会返回工具错误而不是空结果，并停止正在进行的页面扫描。对于已知页面，请使用 `wiki_get` 及其 id 或路径。

插件还注册了一个非独占的记忆语料补充，因此当活动记忆插件支持语料选择时，共享的 `memory_search` 和 `memory_get` 也可以访问 wiki。

## <a id="browsing-the-wiki-in-the-control-ui"></a> 浏览 Control UI 中的 wiki

[Control UI](/web/control-ui)可以直接浏览编译好的wiki：打开Memory页面，然后**Dreams→Diary→Memory Wiki**。选项卡将综合、实体和概念页面（加上包含声明、未决问题或矛盾的源代码和报告页面）与每页计数和完整库页面细分进行聚集，并内联打开整页内容。没有元数据的原始来源和报告计入细分，但不会列为卡片；从 **Imported Insights** 子选项卡打开它们，该子选项卡查看升级前出现的外部历史导入内容。

启用插件后，两个子选项卡都会出现；在代理范围的保管库设置中，它们显示所选代理自己的保管库。 UI 读取插件的网关方法（`wiki.overview`、`wiki.get`、`wiki.importInsights`）；内联页面预览使用 `wiki.get`，相同的查找代理通过 `wiki_get` 工具进行访问。

每个仪表板在其编译的快照中最多保留最新的 2,500 张卡片。当保管库超出该界限时，UI 显示返回的项目数和总项目数。

仪表板请求从不扫描原始库页面或等待完整库编译。在自动恢复期间，UI 报告仪表板正在重建；很快重新加载选项卡。当 `ingest.autoCompile` 为 `false` 时，源更改或较旧的缓存会报告需要编译。运行 `openclaw wiki compile`，然后重新加载选项卡。

## <a id="prompt-and-context-behavior"></a> 提示词和上下文行为

启用 `context.includeCompiledDigestPrompt` 时，内存提示部分会附加来自插件状态的紧凑编译快照：仅首页、仅热门声明、矛盾计数、问题计数、confidence/freshness 限定符。这是选择加入，因为它改变了提示形状；它主要对于显式消耗内存补充的上下文引擎或提示汇编很重要。

## <a id="configuration"></a> 配置

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
            scope: "global",
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
          unsafeLocal: {
            allowPrivateMemoryCoreAccess: false,
            paths: [],
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

| 键                                        | 值/默认值                               | 笔记                                                                                      |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `vaultMode`                                | `isolated`（默认）、`bridge`、`unsafe-local` | 选择输入和集成行为                                                     |
| `vault.scope`                              | `global`（默认）、`agent`                    | 一个共享 vault，或每个 agent 一个子 vault                                              |
| `vault.path`                               | 全局默认`<state-dir>/wiki/main`         | 全球精确金库；代理范围父级默认为 `<state-dir>/wiki`                    |
| `vault.renderMode`                         | `native`（默认）、`obsidian`                 | `obsidian` 写入 Obsidian- 友好页面而不是本机输出                         |
| `bridge.readMemoryArtifacts`               | 默认`true`                                 | 导入活动 memory 插件的公开制品                                               |
| `bridge.followMemoryEvents`                | 默认`true`                                 | 在桥接模式中包含事件日志                                                          |
| `unsafeLocal.allowPrivateMemoryCoreAccess` | 默认`false`                                | 运行 `unsafe-local` 导入所必需                                                     |
| `unsafeLocal.paths`                        | 默认`[]`                                   | 在 `unsafe-local` 模式下要导入的明确本地路径                                      |
| `ingest.autoCompile`                       | 默认`true`                                 | 导入源更改后重建编译输出                                      |
| `search.backend`                           | `shared`（默认）、`local`                    | `shared` 在可用时使用共享内存搜索流程； `local` 仅搜索 wiki |
| `search.corpus`                            | `wiki`（默认）、`memory`、`all`              | 维基搜索涵盖哪些语料库                                                            |
| `context.includeCompiledDigestPrompt`      | 默认`false`                                | 将所选 agent 的紧凑摘要快照追加到 memory 提示词部分              |
| `render.createBacklinks`                   | 默认`true`                                 | 从保存的数据生成相关块                                                    |
| `render.createDashboards`                  | 默认`true`                                 | 生成仪表盘页面                                                                   |

状态目录默认为`~/.openclaw`。当设置 `OPENCLAW_STATE_DIR` 时，默认 wiki 库将使用该目录。显式 `vault.path` 值保留其配置位置，并且 `~/` 仍针对主目录进行扩展。

### <a id="per-agent-vaults"></a> 每个 agent 独立的 vault

将 `vault.scope` 设为 `agent`，即可为每个已配置的 agent 提供一个独立的 wiki。 在此范围内，`vault.path` 是父目录，OpenClaw 会追加标准化后的 agent id：

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      heartbeat: { agentId: "support" },
      systemAgent: { agentId: "support" },
      authInheritance: { agentId: "support" },
    },
    entries: {
      support: { workspace: "~/.openclaw/workspace" },
      marketing: {},
    },
  },
  talk: { agentId: "support" },
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "bridge",
          vault: {
            scope: "agent",
            path: "~/.openclaw/wiki",
          },
          bridge: {
            enabled: true,
            readMemoryArtifacts: true,
          },
        },
      },
    },
  },
}
```

这解析为 `~/.openclaw/wiki/support` 和 `~/.openclaw/wiki/marketing`。如果在代理范围中省略 `vault.path`，则父级默认为 `<state-dir>/wiki`，其中状态目录为 `~/.openclaw` 或 `OPENCLAW_STATE_DIR` 的值。因此，默认 `main` 代理使用 `<state-dir>/wiki/main`。

Agent 工具、编译后的提示词摘要，以及通过 `memory_search` / `memory_get` 暴露的 wiki 补充内容，都会根据当前 agent 上下文解析 vault。 CLI 调用使用配置的默认 agent，除非命令传入 `--agent <agentId>`。 在多 agent 设置中，Gateway 调用仍然要求请求包含 `agentId`。

在桥接模式下，agent 范围的导入仅在公开 memory 制品的 `agentIds` 包含所选 agent 时才会接受。属于其他 agent、没有所有权元数据或所有者未知的制品都会被跳过。 全局范围则保持现有的共享制品行为。

<Warning>
更改 `vault.scope` 不会复制或拆分现有 vault。在 agent 范围内， 显式配置的 `vault.path` 会成为父目录，因此在切换生产 agent 之前， 请有意地移动或导入现有页面。先备份 vault。

每个 agent 独立的 vault 是同一进程内的知识边界，而不是操作系统级别的安全边界。拥有宿主文件系统访问权限的插件和未沙箱化工具仍然可以读取另一个 agent 的目录。 当 agent 彼此不信任时，请使用 [沙箱](/gateway/sandboxing) 或 [独立的 Gateway 配置文件](/gateway/multiple-gateways)。
</Warning>

### <a id="example%3A-builtin-memory-%2B-bridge-mode"></a><a id="example-builtin-memory-+-bridge-mode"></a> 示例：内置 memory + 桥接模式

当你希望使用内置 memory 进行回忆，并使用 `memory-wiki` 提供持续维护的知识层时，可以使用此配置。每一层各司其职：`memory-core` 搜索 memory 笔记和符合条件的会话来源，而 `memory-wiki` 编译稳定的实体、声明、仪表盘和来源页面。

```json5
{
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

这样可以让内置 memory 负责主动回忆，让 `memory-wiki` 专注于编译后的页面和仪表盘，并且在你主动启用编译摘要提示词之前，保持提示词结构不变。

## CLI

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

请参见 [CLI: wiki](/cli/wiki) 获取完整的命令参考，包括 `wiki okf import`、`wiki apply metadata`、`wiki unsafe-local import`、 `wiki chatgpt import` / `wiki chatgpt rollback`，以及完整的 `wiki obsidian` 子命令集合。

## <a id="obsidian-support"></a> Obsidian 支持

当`vault.renderMode`为`obsidian`时，插件会写入Obsidian-友好的Markdown，并且可以选择使用官方的`obsidian` CLI进行状态检查、库搜索、打开页面、调用命令和跳转到每日笔记。这是可选的；如果没有 Obsidian，wiki 仍然可以在本机模式下运行。

代理范围的保管库仍可以使用 Obsidian- 友好型 Markdown，但配置验证会拒绝 `obsidian.useOfficialCli: true` 和 `vault.scope: "agent"`。 `obsidian.vaultName` 设置是全局的，无法为每个代理选择不同的 Obsidian 保管库。请改用 wiki 工具和 CLI 操作，或在全局范围内保留 Obsidian- 操作的 wiki。

## <a id="recommended-workflow"></a> 推荐工作流

<Steps>
<Step id="keep-the-active-memory-plugin-for-recall" title="保留活动内存插件以供调用">
回忆、推广和梦境仍由已配置的 memory 后端负责。
</Step>
<Step id="enable-memory-wiki" title="启用内存维基">
除非你明确需要 bridge 模式，否则请从 `isolated` 模式开始。
</Step>
<Step id="use-wiki_search-%2F-wiki_get-when-provenance-matters" title="当出处很重要时使用 wiki_search / wiki_get">
当你希望获得 wiki 特有的排序或页面级信念结构时，优先使用它们，而不是 `memory_search`。
</Step>
<Step id="use-wiki_apply-for-narrow-syntheses-or-metadata-updates" title="使用 wiki_apply 进行窄合成或元数据更新">
避免手动编辑受管理的生成块。
</Step>
<Step id="run-wiki_lint-after-meaningful-changes" title="有意义的更改后运行 wiki_lint">
它可以发现矛盾、未解决的问题以及来源缺口。
</Step>
<Step id="turn-on-dashboards-for-stale%2Fcontradiction-visibility" title="打开仪表板以获得 stale/contradiction 可见性">
设置 `render.createDashboards: true`（默认）。
</Step>
</Steps>

## <a id="related-docs"></a> 相关文档

- [内存 Overview](/concepts/memory)
- [CLI：内存](/cli/memory)
- [CLI：wiki](/cli/wiki)
- [插件 SDK 概览](/plugins/sdk-overview)
- [内存 LanceDB](/plugins/memory-lancedb)
