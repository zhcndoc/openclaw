---
doc-schema-version: 1
summary: "默认基于 SQLite- 的内存后端，具有关键字、向量和混合搜索"
title: "内置内存引擎"
read_when:
  - "你想了解默认的内存后端"
  - "你想配置嵌入提供商或混合搜索"
  - "你正在从已移除的 QMD 内存后端迁移"
---

内置引擎是默认的内存后端。它将你的记忆索引存储在每个 agent 对应的 SQLite 数据库中，并且无需额外依赖即可开始使用。

## <a id="what-it-provides"></a> 它提供什么

- 通过 FTS5 全文索引（BM25 评分）进行**关键词搜索**。
- 通过任意受支持的提供商生成的嵌入向量进行**向量搜索**。
- 结合两者以获得最佳结果的**混合搜索**。
- **使用固定规则按相关性、新近度和写入时间重要性对**进行排名。
- **多样性感知排序**，默认对混合结果启用 MMR。
- **可信触发器召回**，无需召回模型即可获取有界的回复前上下文。
- 通过对中文、日文和韩文进行三元组分词实现 **CJK 支持**。
- 使用 **sqlite-vec 加速**数据库内向量查询（可选）。

本机 sqlite-vec 查询在单独的只读进程中运行，因此缓慢的查询不会阻塞网关事件循环。取消搜索将终止其查询过程； OpenClaw 不会在网关线程上重试该本机查询。查询为每个数据库重用一个进程，最多有两个进程处于活动状态。空闲进程在 30 分钟后或当另一个数据库需要容量时退出。每个查询都会重新打开数据库，以便提交的更新和替换的索引保持可见。

关键字检索、召回元数据、策划的触发器和项目候选以及源时间戳使用内存搜索工作器。网关等待预测的行并应用相同的排名。仅会话搜索会保留调用者的最终元数据和时间戳读取，因为额外的工作请求会增加测量的延迟；其他检索读取在网关事件循环之外运行。搜索保留其索引生成，直到工作人员关闭其读取器；检索元数据是在候选检索后读取的，因此被遗忘的块被排除在外。这不会更改存储的数据、配置或升级行为。

网关准备就绪后，空闲预热会在第一次搜索之前加载活动内存核心检索工作线程。它不会打开索引、启动嵌入提供程序或延迟准备就绪。在预热完成之前到达的请求仍然正常初始化检索；工人保留现有的闲置退休政策。

如果在内存文件中的关键字匹配准备就绪后，语义检索达到 30 秒的工具截止时间，`memory_search` 将返回这些匹配项并带有部分结果警告。会话记录命中需要新的可见性检查，并且被排除在超时恢复之外。部分响应不会使整个记忆语料库进入超时冷却。当代理未提供最终答复时，后备警告会说明超时持续时间以及部分结果是否可用。

## <a id="when-to-use"></a> 何时使用

对于大多数用户来说，内置引擎是最佳选择：

- 开箱即用，无需额外依赖。
- 对关键词和向量搜索都有良好支持。
- 支持所有嵌入提供商。
- 混合搜索结合了两种检索方式的优点。

内置引擎可以使用 `memory.search.extraPaths` 索引工作区之外的目录。它使用有界词汇查询扩展来提高会话回忆，但它不提供学习或基于模型的相关性重排序阶段。其MMR通证使用固定规则并在本地运行。

如果你希望获得带有自动用户建模的跨会话记忆，请考虑 [Honcho](/concepts/memory-honcho)。

## <a id="getting-started"></a> 入门

默认情况下，内置引擎使用 OpenAI embeddings。如果 `OPENAI_API_KEY` 或 `models.providers.openai.apiKey` 已经配置好，那么向量搜索无需额外的内存配置即可工作。

要显式设置提供商：

```json5
{
  memory: {
    search: {
      provider: "openai",
    },
  },
}
```

如果没有 embedding 提供商，则只能使用关键词搜索。

要强制本地 GGUF 嵌入，请安装并配置官方 [llama.cpp 提供程序](/plugins/llama-cpp)，然后将 `local.modelPath` 指向 GGUF 文件：

```bash
openclaw plugins install @openclaw/llama-cpp-provider
```

```json5
{
  memory: {
    search: {
      provider: "local",
      fallback: "none",
      local: {
        modelPath: "~/.openclaw/models/llama.cpp/hf_ggml-org_embeddinggemma-300m-qat-Q8_0.gguf",
      },
    },
  },
}
```

## <a id="supported-embedding-providers"></a> 支持的 embedding 提供商

| 提供者          | ID                  | 笔记                               |
| ----------------- | ------------------- | ----------------------------------- |
| 基岩           | `bedrock`           | 使用 AWS 凭证链       |
| DeepInfra         | `deepinfra`         | 默认：`BAAI/bge-m3`              |
| Gemini            | `gemini`            | 支持多模态（图像 + 音频） |
| GitHub Copilot    | `github-copilot`    | 使用你的 Copilot 订阅      |
| LM Studio         | `lmstudio`          | Local/self-hosted                   |
| 本地             | `local`             | OpenClaw-托管llama.cpp服务器   |
| Mistral           | `mistral`           |                                     |
| Ollama            | `ollama`            | Local/self-hosted                   |
| OpenAI            | `openai`            | 默认：`text-embedding-3-small`   |
| OpenAI-兼容 | `openai-compatible` | 通用 `/v1/embeddings` 端点   |
| 航程            | `voyage`            |                                     |

将 `memory.search.provider` 设置为切换离开 OpenAI。

## <a id="how-indexing-works"></a> 索引如何工作

OpenClaw 会将 `MEMORY.md`、现有的根目录 `USER.md` 以及 `memory/*.md` 索引成若干块（默认每块 400 个 token，重叠 80 个 token），并将它们存储在按代理划分的 SQLite 数据库中。OpenClaw 不会自动创建 `USER.md`。

每个块都可以携带可为空的重要性和触发器元数据。空值表示中性，因此旧索引仍然可用。搜索会在应用 MMR 多样性处理之前，结合混合相关性、时间衰减和重要性；触发器召回只会注入经过整理或提升为可信的条目。

每个索引块还具有 SQLite- 拥有的出处：原始类（`owner`、`agent`、`untrusted` 或 `system`）、会话类型、观察时间和可选的取代密钥。此元数据与 Markdown 分开存储，因此召回的散文无法重写其自己的信任分类。自动会话摄取还记录其暂存条目的源会话起源，支持升级后选择性删除。有关覆盖范围和限制，请参阅 [ 内存来源和删除](/concepts/memory-provenance)。

- **索引位置：** 拥有该索引的代理数据库位于 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
- **存储维护：** SQLite WAL 侧文件会通过定期检查点和关闭时检查点进行限制。
- **文件观看：**对内存文件的更改会触发去抖重新索引（1.5s默认）。
- **索引兼容性：** 更改嵌入提供程序、模型、设置、配置的源或范围可以暂停搜索，直到您明确重建为止。请参阅 [ 提供商选择 ](/reference/memory-config#provider-selection)。
- **按需重新索引：** `openclaw memory index --force --agent <id>`

当内存核心拥有内存插槽时，其网关服务会安排每个配置的代理的内存管理器在启动时和插件更换后打开。此后台激活会等待该代理的数据库准备工作，包括在升级或重新启动之后，而不会延迟网关准备就绪。失败的准备报告数据库的修复指南。然后，监视的文件更改可以更新索引，而无需搜索或代理轮流。退役实例会关闭其管理器，包括文件观察器、计时器和会话侦听器。仍在进行中的会话启动扫描在当前步骤后停止，因此禁用或替换插件不会等待它。插件重新加载还会在发布周围停止并重新启动保留的内存核心服务，因此其管理器使用当前的嵌入提供程序，包括按需加载的提供程序，而无需等待搜索或转向。如果在耗尽管理器后重新加载失败，则恢复会重新启动其先前的服务并安排其索引激活，然后再报告先前的运行时已恢复。服务停止在关闭其管理器之前加入挂起的激活。仅作为另一个内存插件的整合 sidecar 运行的内存核心不会自动启动这些索引。

当索引标识报告 OpenClaw 分块实现更改时，正常或 CLI 搜索会在返回结果之前重建它。重建使用代理的当前嵌入设置；状态检查保持只读。

搜索触发的维护会在搜索保持可用的同时逐步应用挂起的内存文件更改。会话记录索引会等待，直到代理在 30 秒内没有记录更改或运行轮次。当代理处于活动状态时，待处理的更改将保持其原始年龄。大约五分钟后，索引在下一个转弯间隙开始，无需等待另一个安静期。它永远不会在跑步转弯期间启动。一次传递涵盖代理的待处理会话、共享转录本准备、嵌入缓存读取和有界发布事务。如果转弯在通过期间开始，则索引完成其当前的有界组，并在下一个安静期后恢复。

失败的会话通过（包括已处理的嵌入提供程序回退故障）将保留其待处理的工作，并在 1、5 和 15 分钟后重试，并遵循相同的空闲门。最后一次自动重试也会等待任何完全重建冷却时间结束。在这些自动重试之后，另一个转录本更改或轮换活动可以开始新的重试系列。跑步转弯可以延长任一延迟。

延迟后，新的会话内容将变得可搜索。当前回合已经在上下文中拥有了自己的内容； `memory_search` 不强制刷新转录本。正常关闭不会刷新排队索引。下次启动时，将从每个源的索引序列恢复增量追赶，包括重写和压缩。失败的完全重建保留其完全重试状态；普通的脏内容本身并不强制重建。在任何内容存在之前建立的索引在内容到达时仍然有效；重新启动并不需要完全重建，只是因为索引开始为空。即使嵌入缓存被禁用，不断增长的会话记录也会保留未更改的索引块，并仅嵌入新的或更改的块。显式完全重建仍会取代完整索引。如果内存文件在索引期间发生更改或消失，则只会增量重试该文件未完成的工作。其他文件完成索引，并且更改的文件的过时块不会发布。

自动完全重建重试会在失败后等待 30 秒。重复故障导致双倍延迟，最多可达 30 分钟；成功的重建会重置它。搜索会继续读取已发布的索引，并且当其身份有效时，目标会话更新仍然可以发布。显式 CLI 修复绕过进程局部冷却。

可选的嵌入提供程序故障也与搜索触发的维护共享 30 秒的恢复冷却时间。搜索保留了关键字回忆，并且现有的语义索引保持不变。已经仅包含关键字的索引在冷却期间仍然可以接受文件更新；语义索引在恢复后恢复。

当本机文件监视不可用时，Memory Core 使用默认间隔为 30 秒的后台轮询，包括使用 `CHOKIDAR_USEPOLLING` 显式启用轮询时。有效的 `CHOKIDAR_INTERVAL` 会覆盖此默认值，最小时间为 20 毫秒。较短的间隔会增加后台扫描成本，尤其是对于大型内存树。本机事件仍然会触发提示、去抖更新。本机观察者还每五分钟执行一次完整恢复扫描，因此错过的本机事件可能需要很长时间才能被检测到。此恢复间隔不会改变轮询节奏。自动回退在每个观察者生命周期内记录一个警告。同一进程中的代理共享对同一承认的根的观察，保留每个代理的文件选择规则。超过 128 个组合范围使用额外的有界订阅。如果共享观察失败，其成员会在观察者生命周期的剩余时间内独立重试，因此一个失败的作用域无法重复禁用健康的对等体。最后一个停止观察根的代理将关闭其订阅。正在运行的内存管理器在 `custom.watcher` 下公开每个本地观察的模式、轮询间隔和 `pollingFallback` 的状态；独立状态检查不会启动观察程序。文件系统库当前不保留回退原因或重试本机选择；该警告表示未报告任何原因。解决本机后端问题后重新启动网关，再次尝试本机观看。

如果主机用完本机文件监视容量，Memory Core 会记录一个警告并禁用其监视程序。稍后的搜索会触发增量同步以发现文件更改。当后台工作完成时，搜索可以返回先前的索引；后续搜索会看到更新的内容。恢复观看容量后重新启动网关即可再次启用本机观看。

当另一个 SQLite 编写器处于活动状态时，增量索引、过时源清理和缓存修剪会异步等待。缓存修剪会删除有界批次中最旧的条目，在批次之间进行屈服，同时保留现有的缓存上限。

完全重新索引在临时数据库中构建替换并以原子方式发布内存表。并发搜索和状态读取继续使用已发布的索引；重建失败会使该索引完好无损。嵌入缓存在发布之前受到限制，而不是在将多余条目复制到共享数据库之后。

其他代理状态（包括同一数据库中的会话和记录）将被保留。使用 [ 内存索引命令 ](/cli/memory#memory-index) 进行仅内存修复。

`openclaw memory status` 报告每个源的存储块文本和二进制嵌入字节（JSON 中的 `sourceCounts[].chunkBytes`）。这些是有效负载大小，而不是总磁盘使用量：排除嵌入缓存、FTS/vector 表、SQLite 开销和 WAL/free 页面。

块和嵌入缓存向量使用小端 64 位浮点 BLOB。软件搜索回退直接在工作线程中对这些全精度 BLOB 进行评分，无需为每个块分配数值数组，即使可选的 sqlite-vec 加速器不可用也是如此； sqlite-vec 保留其单独的 32 位向量索引。关键字索引使用每个块的稳定整数标识，因此编辑和删除会直接更新相应的 FTS 行。

代理模式 23 在本地转换现有的 JSON 向量，而无需联系嵌入提供者。它保留块 ID、出处、调用元数据和缓存标识。格式错误的遗留向量保留其可搜索文本并标记其来源以进行重新索引。无法保留的未知架构扩展会导致迁移停止，而无需重写这些表。升级或返回旧版本时，请遵循 [ 数据库版本控制和回滚合同 ](/reference/database-schemas/versioning)。

升级后，自动项目和触发器调用可能需要修复遗留来源。该修复在后台运行。回复将继续，同时自动召回保持为空，直到受影响的来源被重新分类。

<Info>
你也可以通过 `memory.search.extraPaths` 索引工作区之外的 Markdown 文件。参见 [配置参考](/reference/memory-config#additional-memory-paths)。
</Info>

## <a id="migrating-from-qmd"></a> 从 QMD 迁移

QMD 已被移除；builtin 是唯一的记忆引擎。升级后，运行：

```bash
openclaw doctor --fix
```

Doctor 删除已停用的 `memory.backend`、`memory.qmd` 和 `memory.search.qmd` 设置，包括代理范围的 `memory.search.qmd` 表单。它将 QMD 路径和额外集合保留为相应的 `memory.search.extraPaths` 条目，包括 `{ path, pattern }` 全局变量。启用 QMD 会话索引后，Doctor 还会启用内置会话索引，并将 `sessions` 添加到 `memory.search.sources`，而不启用更广泛的交叉对话调用。保留的会话重置记录保留在代理的会话目录中，并从那些原始工件中建立索引。

Doctor 仅删除 `~/.openclaw/agents/<agentId>/qmd/` 下的空每个代理 QMD 目录。非空目录保持不变：OpenClaw 已退役的 QMD 后端使用与独立 QMD 相同的布局，没有所有权标记。保留的目录不会阻止迁移或网关启动。备份后，如果您确认没有独立的 QMD 安装使用它们，则可以手动删除旧索引、模型下载、集合元数据和会话导出。

原始内存保留在 `MEMORY.md`、`USER.md`、`memory/*.md` 以及迁移的额外路径中。内置索引在下次同步时对那些相同的 Markdown 源进行索引。构建无损割接：不复制或删除原有内存内容；仅重建派生状态。

Builtin 现在通过以下功能覆盖了大多数 QMD 使用场景：

- 默认使用混合 BM25 和向量检索，随后依次应用时间衰减、重要性和项目亲和度，最后进行 MMR 多样性处理；
- 针对对话式搜索的有界词法查询扩展；
- string 或 `memory.search.extraPaths` 中的 `{ path, pattern }` 条目，以及
- 仅在 `extraPaths` 下可选的图像和音频索引。

QMD 查询模式的学习型 cross-encoder 重排序和 HyDE 生成不属于 builtin 记忆。MMR 可以减少重复结果，但不是学习型相关性重排序器。要替代 QMD 的进程内、零密钥 GGUF 嵌入，请安装 [llama.cpp provider](/plugins/llama-cpp) 并设置 `memory.search.provider: "local"`；如果没有嵌入提供程序，builtin 只会使用 BM25 关键词搜索。

## <a id="troubleshooting"></a> 故障排查

**内存搜索已禁用？** 检查 `openclaw memory status`。如果没有检测到提供商，请显式设置一个，或添加 API 密钥。

**未检测到本地提供程序？** 使用 `openclaw onboard` 运行一次交互式 [llama.cpp](/plugins/llama-cpp) 设置，确认本地路径存在，然后运行：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

独立的 CLI 命令和网关都使用相同的 `local` 提供商 ID。当您需要本地嵌入时，设置 `memory.search.provider: "local"`。

**结果过时？** 运行 `openclaw memory index --force` 进行重建。监视器在极少数边缘情况下可能会漏掉更改。

**sqlite-vec 未加载？** OpenClaw 自动回退到进程内余弦相似度。 `openclaw memory status --deep` 与嵌入提供程序分开报告本地向量存储，因此 `Vector store: unavailable` 指向 sqlite-vec 加载，而 `Embeddings: unavailable` 指向 provider/auth 或模型准备情况。检查日志中是否有特定的加载错误。

### <a id="safe-index-recovery"></a> 安全索引恢复

要在过时结果或嵌入提供程序更改后重建，请显式选择受影响的代理：

```bash
openclaw memory status --agent <agent-id> --deep
openclaw memory index --agent <agent-id> --force --verbose
openclaw memory status --agent <agent-id> --deep
```

<Warning>
该索引与存储的会话、记录和其他持久代理状态共享 `openclaw-agent.sqlite`。切勿删除该数据库或其 `-wal`、`-shm` 或 `-journal` sidecar 来重置内存。内存索引无法重建以这种方式丢失的对话历史记录。
</Warning>

要在重建之前丢弃派生索引和嵌入缓存，请使用 [`memory reset`](/cli/memory#memory-reset)：

```bash
openclaw memory reset --agent <agent-id>
openclaw memory index --agent <agent-id>
```

重置要求确认；添加 `--yes` 以供非交互式使用。它仅清除内存拥有的派生表，保留非内存数据库表，包括会话和记录以及内存源文件。它可以与现有的内存维护进行协调，而无需重新启动网关，从而可以在之后重新索引保留的源。如果索引正忙，请让它完成并重试重置。重置不会收缩数据库文件或恢复已删除的数据。

如果索引失败或数据库意外增长，请保留数据库及其 sidecar，保留详细错误，并[创建并验证备份](/cli/backup)手动恢复之前。仅靠大型数据库并不能显示哪些表负责。重新索引不是会话历史记录恢复：如果移动或删除数据库后历史记录丢失，请使用经过验证的备份进行恢复[恢复工作流程](/install/backups#restore-a-full-archive)。

### <a id="reclaim-disk-space"></a> 回收磁盘空间

以 `openclaw memory status --agent <agent-id> --json` 开头。比较数据库和 WAL 大小、可重用字节、保留的嵌入缓存有效负载和每个源块有效负载。可重用字节是SQLite内已经空闲的页面；它们不是附加数据。缓存和块有效负载不包括索引和 SQLite 开销，因此它们不会解释共享文件中的每个字节。

如果需要丢弃派生索引，请创建并验证 [backup](/cli/backup)，然后通过其部署所有者停止网关并停止其他编写器。通过重置和压缩使它们停止，以便后台索引无法在命令之间重新填充缓存：

```bash
openclaw memory reset --agent <agent-id> --yes
openclaw doctor --session-sqlite compact --session-sqlite-agent <agent-id>
openclaw memory index --agent <agent-id>
openclaw memory status --agent <agent-id>
```

如果只有未使用的页面需要回收，请跳过重置并保留现有索引。 Doctor 压缩整个代理数据库，验证完整性，并报告 before/after 数据库和 WAL 大小。 Compaction需要临时磁盘空间；在完整卷上，释放空间或将经过验证的备份移动到具有足够容量的卷，然后再尝试。重建可以调用嵌入提供商并产生费用。验证后通过其部署所有者重新启动网关。重置和压缩都不会删除存储的会话或更改保留。

## <a id="configuration"></a> 配置

有关嵌入提供商设置、搜索结果限制和阈值、批量索引、多模态记忆、sqlite-vec、额外路径以及所有其他配置项，请参阅 [记忆配置参考](/reference/memory-config)。

## <a id="related"></a> 相关内容

- [内存概览](/concepts/memory)
- [内存搜索](/concepts/memory-search)
- [活动内存](/concepts/active-memory)
