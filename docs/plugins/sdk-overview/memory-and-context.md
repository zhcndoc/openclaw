---
summary: "专有的上下文引擎和内存功能插槽及其嵌入适配器"
title: "插件 SDK 内存和上下文插槽"
sidebarTitle: "内存和上下文槽"
read_when:
  - "您正在注册上下文引擎或内存功能"
  - "您需要上下文引擎的持久许可转向合同"
  - "您正在暴露内存嵌入或公共工件适配器"
  - "您需要由所有者或对话受众授权提供者内存"
  - "您正在实施提供商拥有的预压缩持久性"
---

注册商一次只允许一个活动实施，而内存适配器合约则位于它们之上。 [插件SDK概述](/plugins/sdk-overview)的一部分。

## <a id="exclusive-slots"></a> 专属插槽

| 方法                                     | 注册内容                                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次一个活动）。使用`info.acceptedHostParams`限制接受的主机添加的生命周期字段，包括可选的`maintain()`取消；未声明的引擎接收所有当前主机字段。 |
| `api.registerMemoryCapability(capability)` | 统一内存能力                                                                                                                                                                                                |

要参与持久承认的轮次，上下文引擎必须在 `info.transcriptSemantics` 下声明 `currentTurnFence: "before-current-turn-entry-v1"` 和 `turnAdvancementIdempotency: "atomic-idempotent-v1"`，然后将 `commitTurn(...)` 实现为由 `advancementKey` 键入的原子写入，重复时不会产生额外效果。 OpenClaw 仅提供从其承认的用户条目到其终端条目的包含的已接受轮次；使用 `readSessionTranscriptVisibleMessageDelta(...)` 游标 API 引导或重建早期历史记录。如果没有完整的合同，OpenClaw 将旧上下文路径用于整个逻辑轮及其重试，保持配置的引擎不变，并在下一个逻辑轮中再次尝试该引擎。

## <a id="memory-embedding-adapters"></a> 内存嵌入适配器

- `registerMemoryCapability` 是唯一的内存插件 API。
- A 选定的内存插件可能会省略 `capability.runtime`，包括当它通过自己的挂钩处理内存时。内存设置页面中立地报告缺少主机搜索支持；这不评估其他内存集成。插件加载和搜索运行时失败仍然是错误。
- `registerMemoryCapability` 还可能公开 `publicArtifacts.listArtifacts(...)` 以进行主机管理的导出。枚举这些已声明工件的配套插件仍然使用保留的 `openclaw/plugin-sdk/memory-host-core` 外观中的 `listActiveMemoryPublicArtifacts(...)`，直到存在集中的公共消费者 API；他们不能进入另一个插件的私有布局。
- 可以返回会话记录命中的内存运行时应实现 `runtime.authorizeSearchHits(...)`。主机在原始搜索命中到达调用者可见的表面之前调用此挂钩，并提供请求代理、会话密钥和沙箱状态。仅返回请求者可能观察到的命中。对于没有会话的主机或话务员呼叫者，主机设置`trustedAgentScope`；返回该代理自己的会话命中数，而不返回其他代理的会话命中数。当会话呼叫者携带主机授予的会话召回通行证时，主机将其转发为`conversationRecall`；只允许通过的命中。如果不存在挂钩，OpenClaw 将保留会话源命中，同时保留普通内存命中。在拥有的内存插件中保留转录本身份和可见性策略；调用者不得从路径或重复的插件特定规则推断授权。
- 嵌入提供商使用`api.registerEmbeddingProvider(...)`和`contracts.embeddingProviders`；没有单独的仅内存注册表。

内存核心为网关路由的 CLI 搜索实现 `runtime.searchForCli(...)`。主机将获取的管理器、请求的代理、查询和当前突变防护传递给同一运行时实例。这会将调用记录保留在实例的配置状态存储中，以便以后的梦想扫描可以提升它。其他内存插件继续公开自己的搜索工具。

## <a id="pre-compaction-memory-flush"></a> 压缩前内存刷新

在 `MemoryPluginCapability` 上注册一个刷新解析器，以提供在压缩之前保存持久上下文的静默转向。 OpenClaw 首先从 `agents.defaults.compaction.memoryFlush` 和活动上下文窗口解析刷新时序。当`enabled`为`false`时，主机不调用解析器。返回 `null` 以跳过因提供商特定原因而进行的刷新。

有两个解析器字段：

- `flushPlanResolver` 返回完整的 `MemoryFlushPlan` 或 `null`。其合同与早期版本相比没有变化。内存核心使用它。
- `providerFlushPlanResolver` 返回主机完成的计划：`MemoryFlushFilePlanDraft`（完整的 `MemoryFlushPlan` 就是这样的草稿之一）或 `MemoryFlushToolsPlan`。当插件注册两者时，主机使用 `providerFlushPlanResolver`。

每个计划都有 `prompt`、`systemPrompt` 和一个持久臂。在 `providerFlushPlanResolver` 的计划中，`softThresholdTokens`、`forceFlushTranscriptBytes`、`reserveTokensFloor` 和 `model` 字段是提供商故意覆盖的。主机从其解析的时序中填充省略的时序字段，并仅针对工具臂从 `memoryFlush.model` 中填充省略的 `model`；没有 `model` 的文件计划将保留会话的模型。 `model` 覆盖将转向固定到精确的 `provider/model` 参考，例如 `ollama/qwen3:8b`，而不继承活动后备链。

仅选择一个持久臂：

| 手臂   | 规划字段                                                                                                      | 冲洗工具和存储                                                                                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文件  | `relativePath: string`                                                                                           | `read` 和仅限于目标文件的附加 `write`。主机创建目标并需要可写工作区访问权限。内存核心使用这个手臂。                                                |
| 工具 | `persistenceToolNames: readonly string[]`（非空），可选`lookupToolNames: readonly string[]`（只读） | `read` 加上所选内存插件拥有的声明的持久性和查找工具。主机不创建目标文件，并且不需要可写的工作区访问权限。查找工具无法持久保存内存。 |

只有选定的内存插槽所有者才能通过 `providerFlushPlanResolver` 提供工具臂计划。主机跟踪哪个插件提供了有效的解析器，包括何时合并 sidecar 功能字段；任何一种所有者的解析器都会胜过 sidecar 的解析器。来自非所有者的工具臂计划将被跳过，并出现命名该插件的警告。

对于工具臂，所有权来自注册的工具元数据。排除另一个插件中的同名工具。在此投影后，正常的消息、模型、沙箱、白名单和授权策略仍然适用。持久化和查找工具名称不能重叠；主机跳过重叠计划并用插件名称发出警告。如果声明的持久性工具均不存在，主机将跳过推理并记录一条警告，指出丢失的工具。如果策略删除任何查找工具，刷新仍会使用其幸存的持久性工具运行，并记录一个警告，指出不可用的查找工具。跳过刷新后可以继续压缩。

### <a id="audience-and-flush-identity"></a> 观众和同花身份

刷新在独立的内部会话中运行，因此其维护记录不会进入后续的用户轮次。对于工具臂轮次，主机从其可信会话条目、会话密钥、会话 ID 和源轮次的发送者所有权解析源轮次的 `memoryAudience`，包括轮次完成后计划的刷新。它将受众委托给分离的会话密钥，保留源沿袭和吊销检查。持久性和查找工具接收该委托受众和源沙箱状态。如果源没有有效的受众，主机将跳过工具臂刷新调试日志。维护副本仍有`senderIsOwner: false`；提供者通过提供的受众及其当前权限检查来授权内存访问。

仅工具臂刷新上下文包括 `OpenClawPluginToolContext` 上的 `memoryFlush: { flushId: string }`。主机根据源会话化身（其 `sessionId` 和生命周期修订版）及其预压缩 `compactionCount`（不存在时为零）计算 `flushId`。完成压缩后计数会增加，因此同一周期内的模型回退尝试和稍后的重试共享 ID；稍后的周期或新的会话化身（包括保留会话 ID 的重置）将获得不同的 ID。提供商可以将此 ID 与其突变身份结合起来以消除重复重试。 ID不授予权限。

### <a id="completion-evidence"></a> 竣工证据

仅当至少一个声明的持久性工具无错误地完成，或者助手的最终输出是静默令牌 `NO_REPLY` 时，工具臂刷新才会成功。成功的查找调用并不是持久性证据。如果没有任何有效的完成信号，主机将记录失败的刷新，原因为 `no persistence tool call succeeded`。运行错误仍然无法刷新。文件臂保留其文件写入和完成行为。

## <a id="provider-neutral-memory-runtime"></a> Provider-中性内存运行时

提供程序中立的运行时允许基于记录的提供程序拥有内存插槽，而无需模拟工作区文件。旧的文件状 `MemoryPluginRuntime` 合约保持不变。成功意味着：

- 现有的传统提供商无需更改即可继续工作；
- a 仅记录提供商可以为其支持的声明需求的每位读者提供服务；
- unsupported 操作被声明为功能，不会通过调用提供者和处理失败来发现。

集成分为三层：

1. 主机选择一个提供商，提供可信的调用者权限，拥有调用者绑定的生命周期，并路由请求。
2. `providerRuntime` 通过提供商范围内的参考和声明的功能提供中立的搜索、检索和运行状况。
3. 提供者拥有的工具、技能和UI保留了丰富的工作流程，例如突变、组织和维护。中性运行时不会取代它们。

外部插件从已经公开的 `MemoryPluginCapability` 派生提供程序类型； `memory-host-search` 仍然是捆绑消费者的私人本地外观。

```ts
import type { MemoryPluginCapability } from "openclaw/plugin-sdk/memory-host-core";

type MemoryProviderRuntime = NonNullable<MemoryPluginCapability["providerRuntime"]>;
type MemoryProviderOpenResult = Awaited<ReturnType<MemoryProviderRuntime["open"]>>;
type MemoryProviderHandle = NonNullable<MemoryProviderOpenResult["provider"]>;

const providerRuntime: MemoryProviderRuntime = {
  async open({ agentId, context }) {
    // Reuse the plugin's service. Routing facts and record IDs do not grant access.
    const provider: MemoryProviderHandle = await service.openMemoryReader({ agentId, context });
    return { provider };
  },
};

api.registerMemoryCapability({ providerRuntime });
```

`service.openMemoryReader` 是提供商拥有的代码。它返回具有以下成员的调用者绑定的 `MemoryProviderHandle`：

| 成员                | 契约                                                                                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capabilities`        | 支持的来源、分页、候选类型和项目过滤的必需声明。                                                                                                                                                           |
| `search(request)`     | 返回点击数和可选的分页、覆盖范围和警告字段。每个命中都有一个提供商范围的 `reference` 和 `excerpt`；分数和引用是可选的。每个提供商都必须遵守 `minScore`。 `lexicalOnly` 是提供商可能会忽略的提示。 |
| `get(request)`        | 通过可选修订和读取范围解析提供程序范围的引用。返回显式的 `ok` 或 `not_found`；否认和失败决不能成为空洞的成功。                                                                                     |
| `health()`            | 返回 `ready`、`degraded` 或 `unavailable` 而不显示分区内容。它必须适用于每个经过身份验证的调用者，包括以 `status` 为目的打开的主机权限； search 和 get 仍可能拒绝该调用者。                        |
| `close()`             | 释放该调用者的租约而不关闭另一个调用者的共享服务。                                                                                                                                                                      |
| `candidates(request)` | 当 `capabilities.candidates` 非空时准确呈现。合格结果包括提供商拥有的项目或触发元数据；单独的搜索支持并不能实现自动注入。                                                              |
| `refresh()`           | 可选的提供商拥有的刷新。这不是一般的梦想、修复或删除 API。                                                                                                                                                                |

在提供程序代码运行之前强制执行功能：

| 能力        | 宣言                                                         | 请求被拒绝                                                          |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 搜索来源    | 包含 `"memory"` and/or `"sessions"` 的非空 `sources` 数组 | `sources` 包含未声明的语料库                                   |
| 分页        | `pagination: boolean`                                               | 当分页为 false 时出现 `cursor`                              |
| 自动召回  | `candidates` 数组包含 `"trigger"` and/or `"project"`        | `candidates({ kind })` 命名为未声明的类型                           |
| 项目过滤 | `projectFilter: boolean`                                            | 当项目过滤为 false 时，提供非空 `activeProjectKeys` |

选定的内存插槽所有者还可以声明 `recallToolNames`。这些是 Active Memory 用于深度回忆的具体代理工具。有效的显式活动内存 `toolsAllow` 列表优先，然后是所选提供商的 `recallToolNames`，然后是内置后备。未选择的 sidecar 无法贡献此字段。对于本机提供程序，`recallToolNames` 还门控提供程序直接触发调用：Active Memory 仅当声明非空并且回合的工具策略允许每个声明的工具时才运行它。否则它会跳过提供者查找并且不注入任何内容。

### <a id="host-consumers"></a> 主机消费者

| 主机消费者                          | 提供程序运行时使用                              | 本地提供商声明                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 网关 `memory.search` v2             | `search()`                                        | 要求`sources`； `pagination: true` 光标                                                                                                                           |
| 网关 `memory.get` / `memory.status` | `get()` / `health()`                              | 所需的处理方法                                                                                                                                                       |
| 医生和 CLI 状态                  | `health()` 具有操作员或 host/status 权限 | 健康必须接受状态来电者                                                                                                                                             |
| 压缩后刷新                | 可选`refresh()`                              | 无能力标志；记录遗漏或拒绝                                                                                                                              |
| 项目召回                         | `candidates({ kind: "project" })`                 | 提供项目密钥时为 `candidates: ["project"]` 和 `projectFilter: true`                                                                                            |
| 主动记忆触发调用           | Lexical `search()` plus 触发器候选者        | `sources: ["memory"]`、`candidates: ["trigger"]`、非空 `recallToolNames` 回合工具策略允许全部，以及 `projectFilter: true`（当提供项目密钥时） |
| 主动记忆深度回忆              | 代理工具                                       | 选定的所有者声明并注册 `recallToolNames`                                                                                                                       |
| 语音快速上下文                     | `search()`                                        | 每个配置的源                                                                                                                                                       |
| 内存维基                            | `search()`                                        | 要求的来源；受保护的转录本回忆需要 `"sessions"`                                                                                                          |

所需的 `MemoryCallerContext` 携带 `assertCurrent()` 回调、可选的中止信号和 `MemoryCallerAuthority`：

- `operator`：经过身份验证的操作员范围和可选的连接身份；
- `session`：实际会话密钥、可选会话 ID、沙箱状态和可选主机解析的内存受众。 `conversationRecall` 携带授予该会话工具上下文的主机的有界调用传递，例如 Active Memory 调用运行；仅从受信任的上下文中复制它，而不是从模型输入中复制它；
- `host`：命名主机操作，而不是操作员或私人会话授权。

主机在异步操作之前和之后重新检查调用者和插件的生命周期。提供商应用所提供的权威机构的可见性策略，并在发布数据之前重新验证。没有观众的会话权限没有私人或对话授权。主机机构也不会授予私人或对话访问权限。

### <a id="memory-audience"></a> 内存观众

OpenClaw 从可信的转向事实和持久的会话沿袭中解决记忆受众问题。提供者和插件工具使用生成的主机铸造值：

```ts
type MemoryAudience =
  | { kind: "owner-private"; agentId: string }
  | { kind: "conversation"; agentId: string; sessionKey: string; sessionId: string };
```

- A 直接从受信任的代理所有者转向拥有 `owner-private` 受众。
- 来自另一个发送者的直接转向，或者组、频道或线程转向，具有持久根会话的 `conversation` 受众。
- 仅当主机验证每个记录的父密钥、会话 ID 和生命周期修订后，A 生成的子项才会继承其根受众。
- 缺失、畸形、跨代理、循环或陈旧的血统不会产生观众。未知或缺失的持久聊天类型也不会产生观众。

受众与沙盒政策是分开的。即使沙盒呼叫者拥有有效的受众，提供商也可以拒绝沙盒呼叫者。操作员权限也是独立且明确的；它不会成为所有者私有会话权限。

提供商不得通过会话查找、会话密钥模式、记录 ID 或缓存指纹来重建受众。他们还必须拒绝另一名特工的接见。主机将每个受众绑定到其调用会话，并在将其呈现给另一个会话时拒绝它。主机介导的子运行接收绑定到子会话的当前会话 ID 和生命周期修订的新受众（或者，对于分离的子运行，其密钥缺少行），共享父级的沿袭和撤销状态；子级重置或重新分配也会拒绝它。当其沿袭中的任何会话改变化身或生命周期时，或者当拥有它的运行结束时，主机拒绝其未创建的受众对象并使捕获的受众无效。主持人在打开提供商之前和之后以及每次提供商通话前后都会检查观众货币。传递给 `open()` 的 `context.assertCurrent()` 包含受众货币，因此在 I/O 之前调用它的提供商（包括在其自己等待的工作之后）会被拒绝，而不是在过时的权限下执行操作。保持会话 ID 和生命周期修订的会话写入，例如轮次自己的活动和使用簿记，在发布时不会中断这些检查；未决的重置、替换或删除仍将货币报告为不可用，直到其结算，然后撤销受众。受众撤销不会中止 `context.signal`；在每个效果之前调用 `assertCurrent()`。

### <a id="compatibility-and-host-integration"></a> 兼容性和主机集成

- 消费者更喜欢`providerRuntime`。只有它不存在才会选择主机拥有的旧适配器。失败、拒绝或无效的提供程序运行时绝不会重试旧存储。
- 现有插件注册、`MemoryPluginRuntime`、管理器类型和 `getActiveMemorySearchManager` 仍然可用。现有插件不需要源或存储迁移。
- 旧版适配器声明内存和会话搜索、无分页、项目过滤和无自动调用候选者。它保留管理器接收器、虚拟路径、读取范围、可见性过滤和清理。其运行状况详细信息省略了主机路径，例如数据库和工作区位置。
- Provider 引用包括 `providerId`；另一个选定的提供商的参考被拒绝。提供者拥有自己的修订行为，不得用不相关的内容替换陈旧的参考内容。
- 网关通过 `memory.search` 和 `version: 2` 公开中性搜索，通过 `memory.get` 公开检索，通过 `memory.status` 公开健康状况。任何与 `operator.read` 进行身份验证的操作员连接都可以调用它们，与未版本化的 `memory.search` 相同的调用者，包括令牌身份验证的 CLI 连接。进程内代理工具和代理运行时调用者使用其承认的运行操作员权限。每次提供程序调用之前和之后都会重新检查请求中止、连接关闭和撤销的客户端权限。省略搜索版本或发送 `version: 1` 将为传统提供商保留旧的文件形式的响应。本机提供程序返回命名所选插件的错误，并指示客户端使用 `version: 2` 重试。
- 当选定的插槽所有者注册 `providerRuntime` 并声明其所需功能时，Voice 快速上下文、项目调用、Active Memory 触发调用和 Memory Wiki 使用中性界面。通过遗留运行时，他们可以保留经理的电话、结果和引文标签。
- A 仅记录提供商保留自己的工具、技能和 UI；选择不会创建假文件浏览器。较旧的主机会忽略 `providerRuntime`，因此需要它的插件必须声明兼容的主机版本。

这是共享读取运行时。内存核心工具和 CLI、文件索引诊断、启动工作区文件、预压缩保存、重置捕获和维护保留其现有所有权。本地提供商工作流程将随之继续。

### <a id="dreaming-remains-separate"></a> Dreaming 保持独立

梦想不是提供者运行时能力。在现有的加载策略下，选择另一个内存插件仍然可以将 Memory Core 激活为梦想的 sidecar。明确禁用内存核心可以防止出现 sidecar。梦想UI和文件支持的维护方法并不意味着所选的提供商实现了梦想。

## <a id="bundled-memory-core-workers"></a> 捆绑内存核心工作人员

内存核心使用共享 `process-runtime` 工作池进行词法检索、余弦回退和不可变块准备。检索会保留搜索生成，直到其读者关闭；发布、源哈希验证和忘记操作仍由其现有数据库所有者保留。

捆绑的工作线程使用私有 `memory-core-host-engine-knn` 外观进行只读数据库访问，共享 SQLite 空闲生命周期和向量基元，以及 `memory-core-host-engine-indexing` 进行纯分块、注释、哈希和嵌入输入限制。这些外观避免将提供者注册表或可写存储初始化加载到工作线程中。它们是捆绑的运行时合约，而不是第三方类型的 SDK 入口点。
