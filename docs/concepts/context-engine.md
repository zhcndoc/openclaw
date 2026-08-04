---
summary: "上下文引擎：可插拔的上下文组装、压缩和子代理生命周期"
read_when:
  - 你想了解 OpenClaw 如何组装模型上下文
  - 你正在在旧版引擎和插件引擎之间切换
  - 你正在构建一个上下文引擎插件
title: "上下文引擎"
sidebarTitle: "上下文引擎"
---

**上下文引擎** 控制 OpenClaw 在每次运行时如何构建模型上下文：包含哪些消息、如何总结更早的历史，以及如何在子代理边界之间管理上下文。

OpenClaw 自带一个内置的 `legacy` 引擎，并默认使用它。只有当你希望获得不同的组装、压缩或跨会话记忆行为时，才安装并选择插件引擎。

## 快速开始

<Steps>
  <Step title="检查当前激活的引擎">
    ```bash
    openclaw doctor
    # 或者直接检查配置：
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step title="安装插件引擎">
    上下文引擎插件的安装方式与其他 OpenClaw 插件相同。

    <Tabs>
      <Tab title="来自 npm">
        ```bash
        openclaw plugins install @martian-engineering/lossless-claw
        ```
      </Tab>
      <Tab title="来自本地路径">
        ```bash
        openclaw plugins install -l ./my-context-engine
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="启用并选择引擎">
    ```json5
    // openclaw.json
    {
      plugins: {
        slots: {
          contextEngine: "lossless-claw", // 必须与插件注册的引擎 id 匹配
        },
        entries: {
          "lossless-claw": {
            enabled: true,
            // 插件特定配置写在这里（参见插件文档）
          },
        },
      },
    }
    ```

    安装并配置后重启网关。

  </Step>
  <Step title="切回 legacy（可选）">
    将 `contextEngine` 设为 `"legacy"`（或者直接移除该键——`"legacy"` 是默认值）。
  </Step>
</Steps>

## 工作原理

每次 OpenClaw 运行模型提示词时，上下文引擎都会在四个生命周期点参与：

<AccordionGroup>
  <Accordion title="1. 摄取">
    当向会话添加新消息时调用。引擎可以将该消息存储或索引到自己的数据存储中。
  </Accordion>
  <Accordion title="2. 组装">
    在每次模型运行之前调用。引擎返回一个有序的消息集合（以及可选的 `systemPromptAddition`），这些内容要适配令牌预算。
  </Accordion>
  <Accordion title="3. 压缩">
    当上下文窗口已满，或用户运行 `/compact` 时调用。引擎会总结较旧的历史以释放空间。
  </Accordion>
  <Accordion title="4. 回合结束后">
    在一次运行完成后调用。引擎可以持久化状态、触发后台压缩，或更新索引。
  </Accordion>
</AccordionGroup>

引擎还可以实现一个可选的 `maintain()` 方法，用于在引导完成后、某次成功回合后或压缩后进行转录维护（通过 `runtimeContext.rewriteTranscriptEntries()` 进行安全重写）。将 `info.turnMaintenanceMode` 设为 `"background"`，即可让它作为延迟任务运行，而不是阻塞回复。

对于捆绑的非 ACP Codex 执行环境，OpenClaw 通过将组装后的上下文投影到 Codex 开发者指令和当前回合提示中来应用相同的生命周期。Codex 仍然负责其原生线程历史和原生压缩器。

### 子代理生命周期（可选）

OpenClaw 会调用两个可选的子代理生命周期钩子：

<ParamField path="prepareSubagentSpawn" type="method">
  在子代理运行开始前准备共享上下文状态。该钩子接收父/子会话键、`contextMode`（`isolated` 或 `fork`）、可用的转录 id/文件，以及可选的 TTL。如果它返回一个回滚句柄，则当生成在准备成功后失败时，OpenClaw 会调用该句柄。请求 `lightContext` 且解析为 `contextMode="isolated"` 的原生子代理生成会刻意跳过此钩子，因此子代理会从轻量级启动上下文开始，而不会带有由上下文引擎管理的预生成状态。
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  在子代理会话完成或被清理时进行清理。
</ParamField>

### 系统提示附加内容

`assemble` 方法可以返回一个 `systemPromptAddition` 字符串。OpenClaw 会将其前置到本次运行的系统提示中。这样引擎就可以注入动态记忆检索指引、检索说明或上下文感知提示，而无需依赖静态工作区文件。

## legacy 引擎

内置的 `legacy` 引擎保留了 OpenClaw 的原始行为：

- **摄取**：无操作（会话管理器直接处理消息持久化）。
- **组装**：透传（运行时中现有的 sanitize → validate → limit 流水线负责上下文组装）。
- **压缩**：委托给内置的摘要压缩，它会为较旧消息创建单个摘要，并保留最近消息不变。
- **回合后**：无操作。

legacy 引擎不会注册工具，也不会提供 `systemPromptAddition`。

当未设置 `plugins.slots.contextEngine` 时（或者它被设置为 `"legacy"`），会自动使用该引擎。

## 插件引擎

插件可以使用插件 API 注册一个上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function register(api) {
  api.registerContextEngine("my-engine", (ctx) => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
      acceptedHostParams: ["sessionKey"],
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // 将消息存储到你的数据存储中
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
      // 返回符合预算的消息
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
      // 总结较旧的上下文
      return { ok: true, compacted: true };
    },
  }));
}
```

工厂函数 `ctx` 包含可选的 `config`、`agentDir` 和 `workspaceDir`
值，因此插件可以在第一次生命周期调用之前为每个代理或每个工作区初始化状态。对于非 legacy 的 `assemble()` 调用之前，宿主会完成已注册的异步内存提示词准备。同步的
`buildMemorySystemPromptAddition(...)` 帮助函数会读取该不可变的运行快照；请将提供的工具、引用、代理和会话上下文原样传入。

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

### ContextEngine 接口

必需成员：

| 成员               | 类型     | 用途                                                                               |
| ------------------ | -------- | ---------------------------------------------------------------------------------- |
| `info`             | 属性     | 引擎 id、名称、版本、接受的宿主参数，以及是否拥有压缩控制权                         |
| `ingest(params)`   | 方法     | 存储单条消息                                                                       |
| `assemble(params)` | 方法     | 为模型运行构建上下文（返回 `AssembleResult`）                                     |
| `compact(params)`  | 方法     | 总结/缩减上下文                                                                    |

设置 `info.acceptedHostParams`，以声明引擎接受的由宿主添加的生命周期字段。
当前的键包括 `sessionKey`、`prompt`、`runtimeSettings`、
`sessionTarget` 和 `runtimeContext`。OpenClaw 会将该声明与每个生命周期方法
可用的字段取交集，因此不会注入未声明或未知的键。没有此声明的引擎会在
2026-08-12 之前通过预先添加宿主字段的 legacy 参数集接收参数；在该日期之后，
未声明的引擎会接收当前所有宿主字段。

`assemble` 返回一个 `AssembleResult`，包含：

<ParamField path="messages" type="Message[]" required>
  要发送给模型的有序消息。
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  引擎对组装后上下文总令牌数的估计。OpenClaw 使用它来决定压缩阈值并进行诊断报告。
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  前置到系统提示中。
</ParamField>
<ParamField path="promptAuthority" type='"assembled" | "preassembly_may_overflow"'>
  控制运行器用于预防性溢出预检查的令牌估计值。默认值为 `"assembled"`，这意味着对于不拥有压缩控制权的引擎，只检查组装后提示词的估计值。设置了 `ownsCompaction: true` 的引擎会自行管理提示词准入，因此 OpenClaw 默认会跳过通用的预提示词预检查。仅当你的组装视图可能掩盖底层转录本中的溢出风险时，才将其设为 `"preassembly_may_overflow"`；此时运行器会继续保持通用预检查启用，并在决定是否进行预防性压缩时，取组装估计值与预组装（未窗口化）会话历史估计值中的较大者。无论哪种情况，你返回的消息仍然是模型实际看到的内容——`promptAuthority` 只影响预检查。
</ParamField>
<ParamField path="contextProjection" type="ContextEngineProjection">
  适用于具有持久后端线程的主机的可选投影生命周期（例如 Codex app-server）。`mode: "thread_bootstrap"` 搭配稳定的 `epoch` 会要求主机在每个 epoch 只注入一次组装后的上下文，并在 epoch 变化前重用后端线程，而不是每轮都重新投影。对于正常的逐轮投影，请省略此字段。
</ParamField>

`compact` 返回一个 `CompactResult`。当压缩更改了活动会话
身份时，`result.sessionTarget`（一个带类型的 `ContextEngineSessionTarget`，包含
会话身份和存储作用域）标识下一次重试或下一轮必须使用的后继会话；
`result.sessionId` 与后继 id 保持一致。

可选成员：

| 成员                           | 类型   | 用途                                                                                                                                         |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法   | 初始化会话的引擎状态。引擎首次看到某个会话时调用一次（例如导入历史记录）。                               |
| `maintain(params)`             | 方法   | 引导后、成功轮次后或压缩后的转录维护。使用 `runtimeContext.rewriteTranscriptEntries()` 进行安全重写。 |
| `ingestBatch(params)`          | 方法   | 以批处理方式摄取已完成的一轮。运行结束后调用，一次性接收该轮中的所有消息。                                  |
| `afterTurn(params)`            | 方法   | 运行后的生命周期工作（持久化状态、触发后台压缩）。                                                                      |
| `prepareSubagentSpawn(params)` | 方法   | 在子会话启动前为其设置共享状态。                                                                                    |
| `onSubagentEnded(params)`      | 方法   | 子代理结束后的清理工作。                                                                                                              |
| `dispose()`                    | 方法   | 释放资源。Gateway 关闭或插件重新加载期间调用——不是按会话调用。                                                        |

### 运行时设置

在 OpenClaw 内部运行的生命周期钩子会接收一个可选的 `runtimeSettings`
对象。它是一个带版本的、只读的内部生产者/消费者 API 接口：OpenClaw 为所选上下文引擎生成它，而上下文引擎在生命周期钩子中消费它。它不会直接呈现给用户，也不会创建专用的报告界面。

- `schemaVersion`：当前为 `1`
- `runtime`：OpenClaw 主机、运行时模式（`normal`、`fallback` 或
  `degraded`），以及可选的 harness/运行时 id
- `contextEngineSelection`：所选上下文引擎 id 和选择来源
- `executionHost`：调用该钩子的表面对应的主机 id 和标签
- `model`：请求的模型、已解析的模型、提供方，以及可选的模型家族
- `limits`：已知时的提示词令牌预算和最大输出令牌数
- `diagnostics`：已知时的关闭式回退和降级原因代码

可能未知的字段以 `null` 表示；运行时模式和选择来源等判别字段
仍不可为 null。在兼容窗口期间，接受 `runtimeSettings` 的引擎必须在
`info.acceptedHostParams` 中包含它。

### 主机要求

上下文引擎可以在 `info.hostRequirements` 上声明宿主能力要求。
OpenClaw 会在启动操作前检查这些要求，并在所选运行时无法满足时以描述性错误
直接失败。

对于代理运行，当引擎必须通过 `assemble()` 控制
实际模型提示词时，请声明 `assemble-before-prompt`：

```ts
info: {
  id: "my-context-engine",
  name: "My Context Engine",
  hostRequirements: {
    "agent-run": {
      requiredCapabilities: ["assemble-before-prompt"],
      unsupportedMessage:
        "请使用原生 Codex 或 OpenClaw 嵌入式运行时，或者选择 legacy 上下文引擎。",
    },
  },
}
```

原生 Codex 和 OpenClaw 嵌入式代理运行满足 `assemble-before-prompt`。
通用 CLI 后端不满足，因此需要该能力的引擎会在 CLI 进程启动前被拒绝。

### 故障隔离

OpenClaw 将所选插件引擎与核心回复路径隔离。如果一个非 legacy 引擎缺失、合同验证失败、在工厂创建期间抛出异常，或在生命周期方法中抛出异常，OpenClaw 会为当前 Gateway 进程隔离该引擎，并将上下文引擎工作降级为内置的 `legacy` 引擎。错误会与失败的操作一起记录，因此操作员可以修复、更新或禁用该插件，而不会导致代理静默失效。

主机要求失败则不同：当引擎声明某个运行时缺少所需能力时，OpenClaw 会在运行开始前以关闭式失败。这样可保护那些在不受支持主机上运行会破坏状态的引擎。

### ownsCompaction

`ownsCompaction` 控制 OpenClaw 运行时内置的单次尝试自动压缩是否在该运行中保持启用：

<AccordionGroup>
  <Accordion title="ownsCompaction: true">
    引擎拥有压缩行为。OpenClaw 会为该运行禁用 OpenClaw 运行时内置的自动压缩和通用的预提示词溢出预检查，而引擎的 `compact()` 实现负责 `/compact`、提供方溢出恢复压缩，以及它希望在 `afterTurn()` 中执行的任何主动压缩。如果引擎在 `assemble()` 中返回 `promptAuthority: "preassembly_may_overflow"`，OpenClaw 仍会运行预提示词溢出保护。
  </Accordion>
  <Accordion title="ownsCompaction: false or unset">
    OpenClaw 运行时内置的自动压缩仍可能在提示词执行期间运行，但当前激活引擎的 `compact()` 方法仍会在 `/compact` 和溢出恢复时被调用。
  </Accordion>
</AccordionGroup>

<Warning>
`ownsCompaction: false` **并不**意味着 OpenClaw 会自动回退到 legacy 引擎的压缩路径。
</Warning>

这意味着有两种有效的插件模式：

<Tabs>
  <Tab title="拥有模式">
    实现你自己的压缩算法，并设置 `ownsCompaction: true`。
  </Tab>
  <Tab title="委托模式">
    设置 `ownsCompaction: false`，并让 `compact()` 调用 `openclaw/plugin-sdk/core` 中的 `delegateCompactionToRuntime(...)`，以使用 OpenClaw 内置的压缩行为。
  </Tab>
</Tabs>

对于一个处于非拥有模式的活动引擎来说，空操作的 `compact()` 是不安全的，因为它会禁用该引擎槽位正常的 `/compact` 和溢出恢复压缩路径。

## 配置参考

```json5
{
  plugins: {
    slots: {
      // 选择活动上下文引擎。默认值："legacy"。
      // 设置为插件 id 以使用插件引擎。
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

## 与压缩和内存的关系

<AccordionGroup>
  <Accordion title="压缩">
    压缩是上下文引擎的一项职责。legacy 引擎会委托给 OpenClaw 内置的摘要功能。插件引擎可以实现任何压缩策略（DAG 摘要、向量检索等）。
  </Accordion>
  <Accordion title="记忆插件">
    记忆插件（`plugins.slots.memory`）与上下文引擎是分开的。记忆插件提供搜索/检索；上下文引擎控制模型能看到什么。它们可以协同工作——上下文引擎在组装过程中可能会使用记忆插件数据。希望使用活动记忆提示路径的插件引擎，应使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它会将主机预先准备好的记忆提示部分转换为可直接前置的 `systemPromptAddition`，而不会暴露记忆插件的布局。
  </Accordion>
  <Accordion title="会话裁剪">
    无论当前激活的是哪个上下文引擎，内存中对旧工具结果的裁剪都会继续运行。
  </Accordion>
</AccordionGroup>

## 提示

- 使用 `openclaw doctor` 验证你的引擎是否正确加载。
- 如果切换引擎，现有会话会继续保留当前历史记录。新的引擎会接管后续运行。
- 引擎错误会被记录，所选插件引擎会在当前 Gateway 进程中被隔离。OpenClaw 会在用户轮次回退到 `legacy` 以便回复继续进行，但你仍然应该修复、更新、禁用或卸载有问题的插件。
- 在开发中，使用 `openclaw plugins install -l ./my-engine` 链接本地插件目录，而无需复制。

## 相关内容

- [压缩](/concepts/compaction) - 压缩长对话
- [上下文](/concepts/context) - 上下文如何为代理轮次构建
- [插件架构](/plugins/architecture) - 注册上下文引擎插件
- [插件清单](/plugins/manifest) - 插件清单字段
- [插件](/tools/plugin) - 插件概览。
