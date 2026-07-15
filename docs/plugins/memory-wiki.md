---
summary: "memory-wiki：一个带有来源、声明、仪表盘和桥接模式的编译知识库"
read_when:
  - 你想要超越普通 MEMORY.md 笔记的持久知识
  - 你正在配置捆绑的 memory-wiki 插件
  - 你需要为同一个 Gateway 中的不同代理使用独立的 wiki vault
  - 你想了解 wiki_search、wiki_get 或 bridge 模式
title: "Memory wiki"
---

`memory-wiki` 是一个捆绑插件，它将持久知识编译成一个可导航的 wiki：确定性的页面、带有证据的结构化声明、来源、仪表盘以及机器可读的摘要。

它不会替代活动记忆插件。回忆、晋升、索引和做梦仍然由所配置的记忆后端负责（`memory-core`、QMD、Honcho 等）。`memory-wiki` 作为其旁路存在，并将知识编译成一个受维护的 wiki 层。

| 层                    | 负责内容                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| 活动记忆插件          | 回忆、语义搜索、晋升、做梦、记忆运行时                                            |
| `memory-wiki`         | 编译后的 wiki 页面、带有丰富来源的综合内容、仪表盘、wiki 搜索/get/apply |

实用规则：

- `memory_search` 用于对已配置的任意语料库进行一次宽泛的回忆检索
- `wiki_search` / `wiki_get` 用于你需要 wiki 特定排序、来源，或页面级信念结构时
- 当活动记忆插件支持语料库选择时，使用 `memory_search corpus=all` 可在一次调用中跨越两层

一种常见的本地优先设置：使用 QMD 作为活动记忆后端负责回忆，而 `memory-wiki` 以 `bridge` 模式生成持久的综合页面。参见 [Configuration](#configuration) 下的 QMD + bridge 模式示例。

如果 bridge 模式报告导出的工件数量为零，则说明活动记忆插件当前没有暴露公共 bridge 输入。先运行 `openclaw wiki doctor`，然后确认活动记忆插件支持公共工件。

## Vault 模式

- `isolated`（默认）：自有 vault，自有来源，不依赖于当前激活的 memory 插件。用于构建一个自包含的精选知识库。
- `bridge`：通过公开的插件 SDK 接口，读取当前激活的 memory 插件中的公开 memory 产物和事件日志。用于在不接触私有插件内部实现的情况下，汇总 memory 插件导出的产物。
- `unsafe-local`：面向本机私有路径的显式逃生通道。该模式有意保持实验性且不可移植；仅在你了解信任边界并且确实需要 bridge 模式无法提供的本地文件系统访问时使用。

Vault 模式和 vault 范围是两个独立的选择：

- `vaultMode` 决定 wiki 输入的来源。
- `vault.scope` 决定所有 agent 共用一个 vault，还是每个 agent 使用一个子 vault。

`vault.scope: "global"` 是默认值，并保留现有的单 vault 行为。请在 `isolated` 或 `bridge` 模式下将 `vault.scope` 设为 `"agent"`，当 agent 之间不能共享 wiki 页面、编译后的摘要、搜索结果或写入内容时使用。由于这些已配置的私有路径并不是 agent 拥有的输入，因此 agent 范围不能与 `unsafe-local` 模式结合。配置校验会拒绝这种组合。

Bridge 模式可以按每个 `bridge.*` 配置开关索引以下内容：

- 导出的 memory 产物（`indexMemoryRoot`）
- 每日笔记（`indexDailyNotes`）
- 梦境报告（`indexDreamReports`）
- memory 事件日志（`followMemoryEvents`）

当 bridge 模式处于激活状态且启用了 `bridge.readMemoryArtifacts` 时，
`openclaw wiki status`、`openclaw wiki doctor` 和 `openclaw wiki bridge
import` 会通过正在运行的 Gateway 路由，因此它们看到的 active memory
插件上下文与 agent/runtime memory 中相同。若 bridge 被禁用，或未开启产物
读取，这些命令将保持本地/离线行为。

## 库布局

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
- `reports/`：生成的仪表板

## Open Knowledge Format 导入

```bash
openclaw wiki okf import ./bundles/ga4
```

将一个未打包的 Open Knowledge Format 捆绑包导入到 wiki 概念页面中。适合数据目录、文档爬虫或增强代理已经生成 OKF 的场景：保留 OKF 作为可移植的交换工件，让 `memory-wiki` 将其转换为 OpenClaw 原生概念页面和编译后的摘要。

- 未保留的 `.md` 文件是概念文档
- 每个导入的概念都要求有一个非空的 `type` frontmatter 字段；缺失 `type` 会产生 `missing-type` 警告并跳过该文件
- 未知的 `type` 值会作为通用概念被接受
- `index.md` 和 `log.md` 是保留文件，绝不会作为概念导入
- 损坏的或外部的 markdown 链接会保持不变

导入的页面会在 `concepts/` 下扁平化，因此现有的 compile、search、get 和
dashboard 流程无需第二个 wiki 树也能看到它们。每个页面都会保留原始的 OKF 概念 ID、
源路径、`type`、`resource`、`tags`、时间戳，以及完整的 producer frontmatter。内部 OKF 链接会重写为生成的 wiki 概念页面，并同时发出结构化的 `relationships` 条目，`kind: okf-link`。

## 结构化声明和证据

页面承载结构化的 `claims` frontmatter，而不只是自由格式文本。每条
claim 都可以包含 `id`、`text`、`status`、`confidence`、`evidence[]` 和
`updatedAt`。每条 evidence 记录都可以包含 `kind`、`sourceId`、`path`、
`lines`、`weight`、`confidence`、`privacyTier`、`note` 和 `updatedAt`。

这使得 wiki 更像一个信念层，而不是一个被动的笔记堆。声明可以被跟踪、评分、争议，并最终回溯到来源得到解决。

## 面向代理的实体元数据

实体页面承载通用路由元数据，可用于人物、团队、
系统、项目或任何其他实体类型：

- `entityType`：例如 `person`、`team`、`system`、`project`
- `canonicalId`：跨别名和导入保持稳定的身份键
- `aliases`：可解析到同一页面的名称、处理名或标签
- `privacyTier`：自由格式字符串；`public` 视为无需审核，任何其他值（例如 `local-private`、`sensitive`、`confirm-before-use`）都会在 `reports/privacy-review.md` 中标记
- `bestUsedFor` / `notEnoughFor`：简明路由提示
- `lastRefreshedAt`：来源刷新时间戳，与页面编辑时间分开
- `personCard`：可选的面向人物的路由卡片（处理名、社交账号、邮箱、时区、分工、ask-for、avoid-asking-for、confidence、privacy tier）
- `relationships`：指向相关页面的有类型边（目标、关系类型、权重、置信度、证据类型、隐私级别、备注）

对于人物 wiki，请先查看 `reports/person-agent-directory.md`，然后在使用联系方式或推断事实之前，先用
`wiki_get` 打开该人物页面。

<Accordion title="实体页面示例">
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
  - 示例生态系统路由
notEnoughFor:
  - 法律批准
lastRefreshedAt: "2026-04-29T00:00:00.000Z"
personCard:
  handles:
    - "@example-handle"
  socials:
    - "https://x.example/example-handle"
  emails:
    - alex@example.com
  timezone: America/Chicago
  lane: 示例生态系统
  askFor:
    - 示例上线问题
  avoidAskingFor:
    - 无关的计费决策
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
    text: Alex is useful for example-ecosystem routing.
    status: supported
    confidence: 0.9
    evidence:
      - kind: maintainer-whois
        sourceId: source.maintainers
        privacyTier: local-private
```
</Accordion>

## 编译管线

Compile 会读取 wiki 页面，规范化摘要，并在以下位置生成稳定的、面向机器的工件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Agent 和运行时代码会读取这些摘要，而不是抓取 Markdown。编译后的输出还支持用于 search/get 的首次 wiki 索引、claim-id 回溯到所属页面、紧凑的提示补充内容，以及报告生成。

## 仪表盘和健康报告

当启用 `render.createDashboards` 时，compile 会在
`reports/` 下维护仪表盘：

| 报告                                | 跟踪内容                                           |
| ----------------------------------- | -------------------------------------------------- |
| `reports/open-questions.md`         | 存在未解决问题的页面                                |
| `reports/contradictions.md`         | 矛盾笔记簇                                           |
| `reports/low-confidence.md`         | 置信度较低的页面和断言                               |
| `reports/claim-health.md`           | 缺少结构化证据的断言                                 |
| `reports/stale-pages.md`            | 陈旧或未知新鲜度                                     |
| `reports/person-agent-directory.md` | 人物/实体路由卡                                      |
| `reports/relationship-graph.md`     | 结构化关系边                                         |
| `reports/provenance-coverage.md`    | 证据类别覆盖                                         |
| `reports/privacy-review.md`         | 使用前需要审查的非公开隐私级别                        |

## 搜索与检索

两种搜索后端：

- `shared`：在可用时使用共享记忆搜索流程
- `local`：本地搜索 wiki

三种语料库：`wiki`、`memory`、`all`。

- `wiki_search` / `wiki_get` 在可能时会先使用编译后的摘要作为第一步
- claim id 会解析回所属页面
- 有争议/过时/最新的 claim 会影响排序
- 来源标签会保留到结果中

搜索模式（`--mode` / tool `mode` 参数）：

| 模式              | 加强项                                                         |
| ----------------- | -------------------------------------------------------------- |
| `auto`            | 平衡默认值                                                     |
| `find-person`     | 类人物实体、别名、用户名、社交账号、规范 ID                    |
| `route-question`   | agent cards、ask-for/best-used-for 提示、关系上下文             |
| `source-evidence` | 来源页面和结构化证据元数据                                       |
| `raw-claim`       | 匹配结构化 claim；返回 claim/evidence 元数据                    |

当某个结果匹配结构化 claim 时，`wiki_search` 会在其详情载荷中返回
`matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、
`evidenceKinds` 和 `evidenceSourceIds`。当可用时，文本输出会包含简洁的
`Claim:` 和 `Evidence:` 行。

## 代理工具

| 工具          | 作用                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wiki_status` | 当前 vault 模式和作用范围、已解析的代理、健康状态、Obsidian CLI 可用性                                                                               |
| `wiki_search` | 搜索 wiki 页面，并在已配置时搜索共享记忆语料；接受 `mode` 参数用于人员查找、问题路由、来源证据或原始声明深挖 |
| `wiki_get`    | 按 id/path 读取 wiki 页面；如果启用了共享搜索且未命中，则回退到共享记忆语料                                     |
| `wiki_apply`  | 进行范围受限的综合/元数据变更，不进行自由形式的页面编辑                                                                                             |
| `wiki_lint`   | 结构检查、来源缺口、矛盾、未解问题                                                                                            |

插件还注册了一个非独占的记忆语料补充，因此当活动记忆插件支持语料选择时，共享的
`memory_search` 和 `memory_get` 也可以访问 wiki。

## 提示词和上下文行为

当启用 `context.includeCompiledDigestPrompt` 时，记忆提示词部分会
附加来自 `agent-digest.json` 的紧凑编译快照：仅包含顶部页面、仅包含顶部声明、矛盾计数、问题计数、置信度/新鲜度
限定词。之所以这是可选功能，是因为它会改变提示词的形状；它主要适用于明确消费记忆补充内容的
上下文引擎或提示词组装。

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

| Key                                        | Values / default                               | Notes                                                                         |
| ------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `vaultMode`                                | `isolated` (default), `bridge`, `unsafe-local` | 选择输入和集成行为                                                            |
| `vault.scope`                              | `global` (default), `agent`                    | 一个共享 vault，或每个 agent 一个子 vault                                      |
| `vault.path`                               | global default `~/.openclaw/wiki/main`         | 全局时为精确 vault；agent 范围的父目录默认是 `~/.openclaw/wiki`              |
| `vault.renderMode`                         | `native` (default), `obsidian`                 |                                                                               |
| `bridge.readMemoryArtifacts`               | default `true`                                 | 导入活动 memory 插件的公开制品                                               |
| `bridge.followMemoryEvents`                | default `true`                                 | 在桥接模式中包含事件日志                                                      |
| `unsafeLocal.allowPrivateMemoryCoreAccess` | default `false`                                | 运行 `unsafe-local` 导入所必需                                                |
| `unsafeLocal.paths`                        | default `[]`                                   | 在 `unsafe-local` 模式下要导入的明确本地路径                                   |
| `search.backend`                           | `shared` (default), `local`                    |                                                                               |
| `search.corpus`                            | `wiki` (default), `memory`, `all`              |                                                                               |
| `context.includeCompiledDigestPrompt`      | default `false`                                | 将所选 agent 的紧凑摘要快照追加到 memory 提示词部分                             |
| `render.createBacklinks`                   | default `true`                                 | 生成确定性的相关块                                                            |
| `render.createDashboards`                  | default `true`                                 | 生成仪表盘页面                                                                |

### 每个 agent 独立的 vault

将 `vault.scope` 设为 `agent`，即可为每个已配置的 agent 提供一个独立的 wiki。
在此范围内，`vault.path` 是父目录，OpenClaw 会追加标准化后的 agent id：

```json5
{
  agents: {
    list: [{ id: "support" }, { id: "marketing" }],
  },
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

这会解析为 `~/.openclaw/wiki/support` 和
`~/.openclaw/wiki/marketing`。如果在 agent 范围内省略 `vault.path`，
父目录默认是 `~/.openclaw/wiki`。因此，默认的 `main` agent 仍然保持
现有的 `~/.openclaw/wiki/main` 路径。

Agent 工具、编译后的提示摘要，以及通过 `memory_search` / `memory_get`
暴露的 wiki 补充内容，都会根据当前 agent 上下文来解析 vault。
对于包含多个已配置 agent 的 CLI 和 Gateway 调用，请使用
`openclaw wiki --agent <agentId> ...` 或 Gateway 请求的 `agentId`
显式提供 agent。若只配置了一个 agent，则在未提供 id 时它仍会作为默认值。

在桥接模式下，agent 范围的导入仅在公开 memory 制品的 `agentIds`
包含所选 agent 时才会接受。属于其他 agent、没有所有权元数据或所有者未知的制品都会被跳过。
全局范围则保持现有的共享制品行为。

<Warning>
更改 `vault.scope` 不会复制或拆分现有 vault。在 agent 范围内，
显式配置的 `vault.path` 会成为父目录，因此在切换生产 agent 之前，
请有意地移动或导入现有页面。先备份 vault。

每个 agent 独立的 vault 是同一进程内的知识边界，而不是操作系统级别的
安全边界。拥有宿主文件系统访问权限的插件和未沙箱化工具仍然可以读取另一个 agent 的目录。
当 agent 彼此不信任时，请使用 [沙箱](/gateway/sandboxing) 或
[独立的 Gateway 配置文件](/gateway/multiple-gateways)。
</Warning>

### 示例：QMD + 桥接模式

当你希望使用 QMD 进行回忆，并使用 `memory-wiki` 维护知识层时，可以使用此配置。每一层都保持专注：QMD 负责原始笔记、会话导出和额外集合的可搜索性，而 `memory-wiki` 负责编译稳定的实体、声明、仪表盘和源页面。

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

这会让 QMD 负责活动记忆回忆，让 `memory-wiki` 专注于已编译的页面和仪表盘，并且在你有意启用编译摘要提示之前，提示词结构保持不变。

## 命令行界面

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

请参见 [CLI: wiki](/cli/wiki) 获取完整的命令参考，包括
`wiki okf import`、`wiki apply metadata`、`wiki unsafe-local import`、
`wiki chatgpt import` / `wiki chatgpt rollback`，以及完整的 `wiki obsidian`
子命令集合。

## Obsidian 支持

当 `vault.renderMode` 为 `obsidian` 时，插件会写入适配 Obsidian 的
Markdown，并且可以选择使用官方 `obsidian` CLI 来进行状态
探测、vault 搜索、打开页面、调用命令以及跳转到
每日笔记。这个功能是可选的；即使不使用 Obsidian，wiki 仍然可以在原生模式下工作。

面向代理的 vault 仍然可以使用适配 Obsidian 的 Markdown，但配置
验证会在 `vault.scope: "agent"` 时拒绝 `obsidian.useOfficialCli: true`。
当前的 `obsidian.vaultName` 设置是全局性的，无法为每个代理选择不同的
Obsidian vault。请改用 wiki 工具和 CLI 操作，
或者将由 Obsidian 操作的 wiki 保持在全局作用域下。

## 推荐工作流

<Steps>
<Step title="保留活跃的 memory 插件用于回忆">
回忆、推广和梦境仍由已配置的 memory 后端负责。
</Step>
<Step title="启用 memory-wiki">
除非你明确需要 bridge 模式，否则请从 `isolated` 模式开始。
</Step>
<Step title="在需要来源信息时使用 wiki_search / wiki_get">
当你希望获得 wiki 特有的排序或页面级信念结构时，优先使用它们，而不是 `memory_search`。
</Step>
<Step title="在进行窄范围综合或元数据更新时使用 wiki_apply">
避免手动编辑受管理的生成块。
</Step>
<Step title="在有意义的更改后运行 wiki_lint">
它可以发现矛盾、未解决的问题以及来源缺口。
</Step>
<Step title="开启仪表板以查看过期/矛盾信息">
设置 `render.createDashboards: true`（默认）。
</Step>
</Steps>

## 相关文档

- [Memory 概览](/concepts/memory)
- [CLI: memory](/cli/memory)
- [CLI: wiki](/cli/wiki)
- [插件 SDK 概览](/plugins/sdk-overview)
