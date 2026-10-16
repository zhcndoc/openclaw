---
summary: "上下文引擎：可插拔的上下文组装、压缩和子代理生命周期"
read_when:
  - "你想了解 OpenClaw 如何组装模型上下文"
  - "你正在在旧版引擎和插件引擎之间切换"
  - "你正在构建一个上下文引擎插件"
title: "上下文引擎"
sidebarTitle: "上下文引擎"
---

**上下文引擎** 控制 OpenClaw 在每次运行时如何构建模型上下文：包含哪些消息、如何总结更早的历史，以及如何在子代理边界之间管理上下文。

OpenClaw 自带一个内置的 `legacy` 引擎，并默认使用它。只有当你希望获得不同的组装、压缩或跨会话记忆行为时，才安装并选择插件引擎。

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="check-which-engine-is-active" title="检查哪个引擎处于活动状态">
    ```bash
    openclaw doctor
    # or inspect config directly:
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step id="install-a-plugin-engine" title="安装插件引擎">
    上下文引擎插件的安装方式与其他 OpenClaw 插件相同。

    <Tabs>
      <Tab id="from-npm" title="来自 npm">
        ```bash
        openclaw plugins install @martian-engineering/lossless-claw
        ```
      </Tab>
      <Tab id="from-a-local-path" title="从本地路径">
        ```bash
        openclaw plugins install -l ./my-context-engine
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step id="enable-and-select-the-engine" title="启用并选择引擎">
    ```json5
    // openclaw.json
    {
      plugins: {
        slots: {
          contextEngine: "lossless-claw", // must match the plugin's registered engine id
        },
        entries: {
          "lossless-claw": {
            enabled: true,
            // Plugin-specific config goes here (see the plugin's docs)
          },
        },
      },
    }
    ```

    安装并配置后重启网关。

  </Step>
  <Step id="switch-back-to-legacy-optional" title="切换回旧版（可选）">
    将 `contextEngine` 设为 `"legacy"`（或者直接移除该键——`"legacy"` 是默认值）。
  </Step>
</Steps>

## <a id="how-it-works"></a> 工作原理

每次 OpenClaw 运行模型提示词时，上下文引擎都会在四个生命周期点参与：

<AccordionGroup>
  <Accordion id="1-ingest" title="1. 摄取">
    当向会话添加新消息时调用。引擎可以将该消息存储或索引到自己的数据存储中。
  </Accordion>
  <Accordion id="2-assemble" title="2. 组装">
    在每次模型运行之前调用。引擎返回一个有序的消息集合（以及可选的 `systemPromptAddition`），这些内容要适配令牌预算。
  </Accordion>
  <Accordion id="3-compact" title="3. 紧凑型">
    当上下文窗口已满，或用户运行 `/compact` 时调用。引擎会总结较旧的历史以释放空间。
  </Accordion>
  <Accordion id="4-after-turn" title="4. 转弯后">
    在一次运行完成后调用。引擎可以持久化状态、触发后台压缩，或更新索引。
  </Accordion>
</AccordionGroup>

引擎还可以实现可选的 `maintain()` 方法，用于在引导、成功转向或压缩后进行转录维护（通过 `runtimeContext.rewriteTranscriptEntries()` 进行安全重写）。设置 `info.turnMaintenanceMode: "background"` 将其作为延迟工作运行，而不是阻止回复。

当排队预算压缩接受后台维护时，它会通过维护、合并重新运行和引擎处置使准备好的运行时保持活动状态。验收并不意味着清理工作已经完成。从引擎方法和 `dispose()` 返回异步工作，以便主机可以在释放其资源之前加入它。

逻辑转向还通过引擎处置保留其管理供应登记。当该注册表从另一个检查复制运行时引擎时，其记录的捐助者依赖性可以在捐助者检查退出后保持引擎可用。退出供应注册机构仍然拒绝新的逻辑转向；现有的引擎工作会保留其物理资源，直到清理完成。原始注册保留其调用者拥有的生命周期。

对于捆绑的非 ACP Codex 执行环境，OpenClaw 通过将组装后的上下文投影到 Codex 开发者指令和当前回合提示中来应用相同的生命周期。Codex 仍然负责其原生线程历史和原生压缩器。

### <a id="subagent-lifecycle-(optional)"></a><a id="subagent-lifecycle-optional"></a> 子代理生命周期（可选）

OpenClaw 会调用两个可选的子代理生命周期钩子：

<ParamField path="prepareSubagentSpawn" type="method">
  在子运行开始之前准备共享上下文状态。该挂钩接收 parent/child 会话密钥、`contextMode`（`isolated` 或 `fork`）、可用转录本 ids/files 和可选的 TTL。如果它返回一个回滚句柄，OpenClaw在准备成功后spawn失败时调用它。生成请求 `lightContext` 并解析为 `contextMode="isolated"` 的本机子代理有意跳过此挂钩，以便子代理从轻量级引导上下文启动，而无需上下文引擎管理的预生成状态。
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  在子代理会话完成或被清理时进行清理。
</ParamField>

### <a id="system-prompt-addition"></a> 系统提示附加内容

`assemble` 方法可以返回一个 `systemPromptAddition` 字符串。OpenClaw 会将其前置到本次运行的系统提示中。这样引擎就可以注入动态记忆检索指引、检索说明或上下文感知提示，而无需依赖静态工作区文件。

## <a id="the-legacy-engine"></a> legacy 引擎

内置的 `legacy` 引擎保留了 OpenClaw 的原始行为：

- **摄取**：无操作（会话管理器直接处理消息持久化）。
- **组装**：透传（运行时中现有的 sanitize → validate → limit 流水线负责上下文组装）。
- **压缩**：委托给内置的摘要压缩，它会为较旧消息创建单个摘要，并保留最近消息不变。
- **回合后**：无操作。

legacy 引擎不会注册工具，也不会提供 `systemPromptAddition`。

当未设置 `plugins.slots.contextEngine` 时（或者它被设置为 `"legacy"`），会自动使用该引擎。

禁用或拒绝所选插件会保留插槽首选项，但当引擎的注册所有者识别该插件时，或者当引擎 ID 与插件 ID 匹配时，通常会使用 `legacy`。在没有注册的冷启动后，不同的引擎 ID 无法识别其所属插件：解析仍然报告丢失的引擎。无论此所有者映射如何，全局插件禁用都会使用 `legacy`。当运行时注册可用时，重新启用插件会恢复保留的选择。丢失或失败的已启用选择仍遵循下面的故障隔离行为。

## <a id="plugin-engines"></a> 插件引擎

插件可以使用插件 API 注册一个上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

// `buildContext`, `countTokens`, and `commitAcceptedTurn` below are your own
// plugin's helpers to implement. They are not part of the plugin SDK.
// `buildMemorySystemPromptAddition` is real SDK surface, imported above.

export default function register(api) {
  api.registerContextEngine("my-engine", (ctx) => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
      acceptedHostParams: ["sessionKey", "runtimeContext"],
      transcriptSemantics: {
        currentTurnFence: "before-current-turn-entry-v1",
        turnAdvancementIdempotency: "atomic-idempotent-v1",
      },
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({
      sessionId,
      sessionKey,
      messages,
      tokenBudget,
      availableTools,
      citationsMode,
    }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
          agentSessionKey: sessionKey,
        }),
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },

    async commitTurn({ advancementKey, messages }) {
      // Atomically store the accepted turn and advancementKey. Return
      // "duplicate" when that exact key was committed by an earlier retry.
      return await commitAcceptedTurn({
        advancementKey,
        messages,
      });
    },
  }));
}
```

工厂函数 `ctx` 包含可选的 `config`、`agentDir` 和 `workspaceDir` 值，因此插件可以在第一次生命周期调用之前为每个代理或每个工作区初始化状态。对于非 legacy 的 `assemble()` 调用之前，宿主会完成已注册的异步内存提示词准备。同步的 `buildMemorySystemPromptAddition(...)` 帮助函数会读取该不可变的运行快照；请将提供的工具、引用、代理和会话上下文原样传入。

然后在配置中启用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "my-engine",
    },
    entries: {
      "my-engine": {
        enabled: true,
      },
    },
  },
}
```

### <a id="the-contextengine-interface"></a> ContextEngine 接口

必需成员：

| 成员             | 类型     | 用途                                                                            |
| ------------------ | -------- | ---------------------------------------------------------------------------------- |
| `info`             | 属性 | 引擎 id、名称、版本、接受的宿主参数，以及是否拥有压缩控制权 |
| `ingest(params)`   | 方法   | 存储单条消息                                                             |
| `assemble(params)` | 方法   | 为模型运行构建上下文（返回 `AssembleResult`）                           |
| `compact(params)`  | 方法   | Summarize/reduce 上下文                                                           |

设置 `info.acceptedHostParams` 以限制引擎接收的主机添加的生命周期字段。当前密钥为 `sessionKey`、`prompt`、`runtimeSettings`、`sessionTarget`、`runtimeContext` 和 `abortSignal`。 OpenClaw 将声明与每个生命周期方法可用的字段相交，因此永远不会注入未声明或未知的键。 `abortSignal` 管理 `maintain()` 的可选合作取消；现有的紧凑操作中止信号始终被保留。没有此声明的引擎接收每个当前主机字段；当引擎验证较窄的输入形状时，声明一个显式列表，包括 `[]`。

对于持久化的已接纳轮次，请声明以下两种转录语义：

- `currentTurnFence: "before-current-turn-entry-v1"`
- `turnAdvancementIdempotency: "atomic-idempotent-v1"`

并将 `commitTurn(...)` 实现为由 `advancementKey` 键控的一次原子写入，重复时不会产生额外效果。首次写入时返回 `{ status: "committed" }`，当主机重试呈现已提交的密钥时返回 `{ status: "duplicate" }`。 `messages` 有效负载仅包含从允许的用户条目到接受的终端条目的包含范围。在引导或重建期间需要早期转录的引擎应通过转录光标 API、`readSessionTranscriptVisibleMessageDelta(...)` 读取它。在引导、维护、组装和重试期间读取预转转录本，然后在允许的用户消息之前查看确切的转录本前缀。主机仅针对接受的成功转弯调用`commitTurn`；失败或中止的回合不会推进上下文引擎状态。

确认哪个正在运行的回合消耗了引导消息可以保留该回合的准入。只有其私有转向相关性发生变化：实时记录更新会发布更正，但增量光标不会重播它。内容、出处、分支变更和成绩单替换仍然使旧的录取无效。

逻辑轮拥有者在运行结束时删除未接受的准入，包括在报告终端转录边界之前退出时。网关中断后的恢复也会在没有主机接受的情况下删除准入并记录跳过的进度；它永远不会从后来的成绩单条目中推断出成功。接受的工作将保持排队状态，直到引擎确认为止。现有发件箱行不需要迁移或配置更改。

在接受轮次最终确定确认 `committed` 或 `duplicate` 后，主机还通过相同的维护调度程序提供 `maintain()`。声明为 `turnMaintenanceMode: "background"` 的发动机实行延期维护。后台工作会保留逻辑轮次的引擎并提供资源，直到其解决为止，而无需使回复完成等待维护。声明 `"foreground"` 或省略模式运行维护内联的引擎：接受转弯完成和回复完成等待其解决。内联维护接收已提交的会话目标、provider/model/token 预算、LLM 功能和记录重写功能，无需后台压缩权限。转录重写重新打开持久目标，而不需要实时会话管理器。失败的提交仍然排队并且不会触发此切换。预运行发件箱恢复可在引导和组装之前协调摄取；它不会启动并发后台维护。维护是尽最大努力，而不是每次承诺的转弯都需要耐碰撞的工作，并且一次调用并不能保证引擎耗尽所有待处理的压实。

对于这些已承认的回合，嵌入式工具循环 `assemble()` 接收当前回合之前的历史记录，并具有为待处理的用户和工具消息保留空间的令牌预算。主机在下一个模型请求之前将这些待处理消息附加到组装的历史记录中，因此它们在不进入引擎存储的情况下保持可见。

如果缺少完整的声明和方法，OpenClaw 会在整个逻辑轮次（包括重试）中使用 legacy 上下文路径。配置的上下文引擎槽位不会改变，OpenClaw 会在下一个逻辑轮次再次尝试配置的引擎。如果声明了轮次栅栏，但由于确切的已接纳消息缺失、 被重写，或已被转录游标越过而无法遵守，同一轮次也会发生相同的局部降级。

`assemble` 返回一个 `AssembleResult`，其中包含：

<ParamField path="messages" type="Message[]" required>
  要发送给模型的有序消息。
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  引擎对组装上下文中总标记的估计。 OpenClaw 将其用于压缩阈值决策和诊断报告，但不决定是否发送提供程序请求。
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  前置到系统提示中。
</ParamField>
<ParamField path="promptAuthority" type='"assembled" | "preassembly_may_overflow"'>
  控制主机令牌压力诊断中包含的历史记录。默认为 `"assembled"`。当组装视图可以隐藏底层转录中的压力时，设置`"preassembly_may_overflow"`；然后诊断报告主机组装和预组装（非窗口化）历史估计的最大值。该诊断最大值不会阻止合适的传出请求。返回的消息保留模型上下文，并且该字段不会禁用对拥有压缩的引擎的主机请求准入检查。
</ParamField>
<ParamField path="contextProjection" type="ContextEngineProjection">
  适用于具有持久后端线程的主机的可选投影生命周期（例如 Codex app-server）。`mode: "thread_bootstrap"` 搭配稳定的 `epoch` 会要求主机在每个 epoch 只注入一次组装后的上下文，并在 epoch 变化前重用后端线程，而不是每轮都重新投影。对于正常的逐轮投影，请省略此字段。
</ParamField>

`compact` 返回一个 `CompactResult`。当压缩更改了活动会话身份时，`result.sessionTarget`（一个带类型的 `ContextEngineSessionTarget`，包含会话身份和存储作用域）标识下一次重试或下一轮必须使用的后继会话； `result.sessionId` 与后继 id 保持一致。

可选成员：

| 成员                         | 类型   | 用途                                                                                                                                      |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 初始化会话的引擎状态。当引擎第一次看到会话时调用一次（e.g.，导入历史记录）。                              |
| `maintain(params)`             | 方法 | 引导后、成功轮次后或压缩后的转录维护。使用 `runtimeContext.rewriteTranscriptEntries()` 进行安全重写。 |
| `ingestBatch(params)`          | 方法 | 以批处理方式摄取已完成的一轮。运行结束后调用，一次性接收该轮中的所有消息。                                  |
| `afterTurn(params)`            | 方法 | 运行后的生命周期工作（持久化状态、触发后台压缩）。                                                                      |
| `prepareSubagentSpawn(params)` | 方法 | 在子会话启动前为其设置共享状态。                                                                                    |
| `onSubagentEnded(params)`      | 方法 | 子代理结束后的清理工作。                                                                                                              |
| `dispose()`                    | 方法 | 当所有保留的工作完成后，拥有操作结束时释放引擎实例资源。                                          |

主机还处理为独立压缩、Doctor 检查和子代理生命周期挂钩解析的实例。排队的子代理生成会保留其实例，直到调度成功或回滚准备；返回排队的接受并不会结束该生命周期。超时压缩会保留其实例，直到底层插件工作完成为止。网关关闭会释放排队的实例，而不回滚其准备工作，因此持久的排队工作可以在重新启动后恢复。显式取消仍然会回滚准备工作。

前台引擎处理共享代理清理截止时间：默认为 10 秒，可通过 `OPENCLAW_AGENT_CLEANUP_TIMEOUT_MS` 进行调整。停滞的清理会记录警告并让完成的回复返回；它不会取消插件的待处理。清理失败和超时保留现有的一次性 CLI 清理失败结果；他们不证明资源关闭。

### <a id="runtime-settings"></a> 运行时设置

在 OpenClaw 内部运行的生命周期挂钩接收可选的 `runtimeSettings` 对象。它是一个版本化的只读内部 producer/consumer API 表面：OpenClaw 为选定的上下文引擎生成它，上下文引擎在生命周期挂钩内使用它。它不会直接呈现给用户，也不会创建专用的报告界面。

- `schemaVersion`：当前为 `1`
- `runtime`：OpenClaw 主机、运行时模式（`normal`、`fallback` 或 `degraded`）以及可选的 harness/runtime id
- `contextEngineSelection`：所选上下文引擎 id 和选择来源
- `executionHost`：调用该钩子的表面对应的主机 id 和标签
- `model`：请求的模型、已解析的模型、提供方，以及可选的模型家族
- `limits`：已知时的提示词令牌预算和最大输出令牌数
- `diagnostics`：已知时的关闭式回退和降级原因代码

可以未知的字段表示为`null`；诸如运行时模式和选择源之类的鉴别器字段仍然不可为空。限制主机参数并接受 `runtimeSettings` 的引擎必须将其包含在 `info.acceptedHostParams` 中。

### <a id="host-requirements"></a> 主机要求

上下文引擎可以在 `info.hostRequirements` 上声明主机能力要求。 OpenClaw 在开始操作之前检查这些要求，并在所选运行时无法满足这些要求时停止并显示描述性错误。

对于代理运行，当引擎必须通过 `assemble()` 控制实际模型提示时，声明 `assemble-before-prompt`：

```ts
info: {
  id: "my-context-engine",
  name: "My Context Engine",
  hostRequirements: {
    "agent-run": {
      requiredCapabilities: ["assemble-before-prompt"],
      unsupportedMessage:
        "Use the native Codex or OpenClaw embedded runtime, or select the legacy context engine.",
    },
  },
}
```

原生 Codex 和 OpenClaw 嵌入式代理运行满足 `assemble-before-prompt`。 通用 CLI 后端不满足，因此需要该能力的引擎会在 CLI 进程启动前被拒绝。

### <a id="failure-isolation"></a> 故障隔离

OpenClaw 将所选插件引擎与核心回复路径隔离。如果一个非 legacy 引擎缺失、合同验证失败、在工厂创建期间抛出异常，或在生命周期方法中抛出异常，OpenClaw 会为当前 Gateway 进程隔离该引擎，并将上下文引擎工作降级为内置的 `legacy` 引擎。错误会与失败的操作一起记录，因此操作员可以修复、更新或禁用该插件，而不会导致代理静默失效。

工厂进入之前的主机准入和资源所有权故障会在不隔离引擎的情况下传播。由于取消呼叫者的工作而导致的工厂拒绝也会在没有隔离或后备的情况下传播。完成清理拥有独立的异步生命周期，因此封闭的调用者范围不会阻止其工厂运行。

主机要求失败则不同：当引擎声明运行时缺乏所需功能时，OpenClaw 拒绝启动运行。这可以保护那些在不受支持的主机上运行时会破坏状态的引擎。

### <a id="ownscompaction"></a> owns压实

`ownsCompaction` 控制 OpenClaw 运行时内置的单次尝试自动压缩是否在该运行中保持启用：

<AccordionGroup>
  <Accordion id="ownscompaction-true" title="拥有压缩：true">
    发动机具有压实行为。 OpenClaw 禁用运行时的内置自动压缩，引擎的 `compact()` 实现负责 `/compact`、溢出恢复压缩以及它想要在 `afterTurn()` 中执行的任何主动压缩。

    嵌入式运行时仍然会在发送之前检查每个传出的提供程序请求，包括第一个请求。当请求从当前运行扩展匹配的测量前缀时，主机将其估计锚定到该提供程序的使用情况并计算附加的内容。否则，它会重新估计实际的系统提示、消息和工具。超出主机即时预算的请求在到达提供商之前进入恢复。引擎的 `estimatedTokens` 不控制此决定。

  </Accordion>
  <Accordion id="ownscompaction-false-or-unset" title="ownsCompaction： false 或未设置">
    OpenClaw 运行时内置的自动压缩仍可能在提示词执行期间运行，但当前激活引擎的 `compact()` 方法仍会在 `/compact` 和溢出恢复时被调用。
  </Accordion>
</AccordionGroup>

<Warning>
`ownsCompaction: false` **并不**意味着 OpenClaw 会自动回退到 legacy 引擎的压缩路径。
</Warning>

这意味着有两种有效的插件模式：

<Tabs>
  <Tab id="owning-mode" title="拥有方式">
    实现你自己的压缩算法，并设置 `ownsCompaction: true`。
  </Tab>
  <Tab id="delegating-mode" title="委托模式">
    设置 `ownsCompaction: false` 并让 `compact()` 从 `openclaw/plugin-sdk/core` 调用 `delegateCompactionToRuntime(...)` 以使用 OpenClaw 的内置压缩行为。
  </Tab>
</Tabs>

对于一个处于非拥有模式的活动引擎来说，空操作的 `compact()` 是不安全的，因为它会禁用该引擎槽位正常的 `/compact` 和溢出恢复压缩路径。

## <a id="configuration-reference"></a> 配置参考

```json5
{
  plugins: {
    slots: {
      // Select the active context engine. Default: "legacy".
      // Set to a plugin id to use a plugin engine.
      contextEngine: "legacy",
    },
  },
}
```

<Note>
该槽位在运行时是独占的——对于给定的一次运行或压缩操作，只会解析出一个已注册的上下文引擎。其他已启用的 `kind: "context-engine"` 插件仍然可以加载并运行其注册代码；`plugins.slots.contextEngine` 只是在 OpenClaw 需要上下文引擎时，选择它要解析的已注册引擎 id。
</Note>

<Note>
**插件卸载：**当你卸载当前被选为 `plugins.slots.contextEngine` 的插件时，OpenClaw 会将该槽位重置回默认值（`legacy`）。`plugins.slots.memory` 也会应用同样的重置行为。无需手动编辑配置。
</Note>

## <a id="relationship-to-compaction-and-memory"></a> 与压缩和内存的关系

<AccordionGroup>
  <Accordion id="compaction" title="压缩">
    压缩是上下文引擎的一项职责。legacy 引擎会委托给 OpenClaw 内置的摘要功能。插件引擎可以实现任何压缩策略（DAG 摘要、向量检索等）。
  </Accordion>
  <Accordion id="memory-plugins" title="内存插件">
    内存插件 （`plugins.slots.memory`） 与上下文引擎分开。内存插件提供search/retrieval；上下文引擎控制模型所看到的内容。它们可以一起工作 - 上下文引擎可能在组装期间使用内存插件数据。需要活动内存提示路径的插件引擎应使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它将主机准备的内存提示部分转换为准备就绪的 `systemPromptAddition`，而不暴露内存插件布局。
  </Accordion>
  <Accordion id="session-pruning" title="会话修剪">
    无论当前激活的是哪个上下文引擎，内存中对旧工具结果的裁剪都会继续运行。
  </Accordion>
</AccordionGroup>

## <a id="tips"></a> 提示

- 使用 `openclaw doctor` 验证你的引擎是否正确加载。
- 如果切换引擎，现有会话会继续保留当前历史记录。新的引擎会接管后续运行。
- 引擎错误会被记录，所选插件引擎会在当前 Gateway 进程中被隔离。OpenClaw 会在用户轮次回退到 `legacy` 以便回复继续进行，但你仍然应该修复、更新、禁用或卸载有问题的插件。
- 在开发中，使用 `openclaw plugins install -l ./my-engine` 链接本地插件目录，而无需复制。

## <a id="related"></a> 相关内容

- [Compaction](/concepts/compaction) - 总结长对话
- [上下文](/concepts/context) - 上下文如何为代理轮次构建
- [Honcho内存](/concepts/memory-honcho) - 上下文引擎可以利用的内存插件
- [Plugin Architecture](/plugins/architecture) - 注册上下文引擎插件
- [插件清单](/plugins/manifest) - 插件清单字段
- [插件](/tools/plugin) - 插件概览。
- [会话管理深入研究](/reference/session-management-compaction) - 会话存储、转录事件和自动压缩内部结构
- [系统提示](/concepts/system-prompt) - OpenClaw为每个代理运行组装到系统提示中的内容，以及它渲染的层
