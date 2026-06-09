---
summary: "上下文引擎：可插拔的上下文组装、压缩和子代理生命周期"
read_when:
  - 你想了解 OpenClaw 如何组装模型上下文
  - 你正在在旧版引擎和插件引擎之间切换
  - 你正在构建一个上下文引擎插件
title: "上下文引擎"
sidebarTitle: "上下文引擎"
---

**上下文引擎** 控制 OpenClaw 在每次运行时如何构建模型上下文：包含哪些消息、如何总结较早的历史，以及如何在子代理边界之间管理上下文。

OpenClaw 自带一个内置的 `legacy` 引擎，并且默认使用它——大多数用户从不需要更改这一点。仅当你想要不同的组装、压缩或跨会话回忆行为时，才安装并选择一个插件引擎。

## 快速开始

<Steps>
  <Step title="检查当前激活的引擎">
    ```bash
    openclaw doctor
    # 或直接检查配置：
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
  <Accordion title="1. Ingest">
    当向会话添加新消息时调用。引擎可以将该消息存储或索引到自己的数据存储中。
  </Accordion>
  <Accordion title="2. Assemble">
    在每次模型运行之前调用。引擎返回一个有序的消息集合（以及可选的 `systemPromptAddition`），这些内容要适配令牌预算。
  </Accordion>
  <Accordion title="3. Compact">
    当上下文窗口已满，或用户运行 `/compact` 时调用。引擎会总结较旧的历史以释放空间。
  </Accordion>
  <Accordion title="4. After turn">
    在一次运行完成后调用。引擎可以持久化状态、触发后台压缩，或更新索引。
  </Accordion>
</AccordionGroup>

对于捆绑的非 ACP Codex harness，OpenClaw 通过将组装后的上下文投射到 Codex 开发者指令和当前轮提示中来应用相同的生命周期。Codex 仍然拥有其原生线程历史和原生压缩器。

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

- **Ingest**：无操作（会话管理器直接处理消息持久化）。
- **Assemble**：透传（运行时中现有的 sanitize → validate → limit 流水线负责上下文组装）。
- **Compact**：委托给内置的摘要压缩，它会为较旧消息创建单个摘要，并保留最近消息不变。
- **After turn**：无操作。

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
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // 将消息存储到你的数据存储中
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget, availableTools, citationsMode }) {
      // 返回符合预算的消息
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
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
值，因此插件可以在第一个生命周期钩子运行之前初始化按代理或按工作区的状态。

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

| 成员               | 类型     | 作用                                                     |
| ------------------ | -------- | -------------------------------------------------------- |
| `info`             | 属性     | 引擎 id、名称、版本，以及它是否拥有压缩控制权            |
| `ingest(params)`   | 方法     | 存储单条消息                                             |
| `assemble(params)` | 方法     | 为模型运行构建上下文（返回 `AssembleResult`）            |
| `compact(params)`  | 方法     | 总结/缩减上下文                                           |

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
  控制运行器用于预先溢出预检查的令牌估计值。默认值为 `"assembled"`，这意味着只检查组装后提示词的估计值——适用于返回窗口化、自包含上下文的引擎。仅当你的组装视图可能掩盖底层转录中的溢出风险时，才将其设为 `"preassembly_may_overflow"`；此时，运行器在决定是否提前压缩时，会取组装后估计值与组装前（未窗口化）的会话历史估计值中的较大者。无论哪种方式，你返回的消息仍然是模型实际看到的内容——`promptAuthority` 只影响预检查。
</ParamField>

`compact` 返回一个 `CompactResult`。当压缩轮换活动转录时，`result.sessionId` 和 `result.sessionFile` 会标识下一个重试或下一轮必须使用的后继会话。

可选成员：

| 成员                           | 类型   | 作用                                                                                                            |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 为某个会话初始化引擎状态。引擎第一次看到某个会话时调用一次（例如导入历史记录）。                                  |
| `ingestBatch(params)`          | 方法 | 以批处理方式摄取一个已完成的轮次。运行完成后一次性传入该轮的所有消息。                                            |
| `afterTurn(params)`            | 方法 | 运行后的生命周期工作（持久化状态、触发后台压缩）。                                                              |
| `prepareSubagentSpawn(params)` | 方法 | 在子会话开始前为其设置共享状态。                                                                                  |
| `onSubagentEnded(params)`      | 方法 | 子代理结束后进行清理。                                                                                           |
| `dispose()`                    | 方法 | 释放资源。在网关关闭或插件重新加载期间调用——不是按会话调用。                                                     |

### Host requirements

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
        "Use the native Codex or OpenClaw embedded runtime, or select the legacy context engine.",
    },
  },
}
```

Native Codex and OpenClaw embedded agent runs satisfy `assemble-before-prompt`.
Generic CLI backends do not, so engines that require it are rejected before the
CLI process starts.

### Failure isolation

OpenClaw isolates the selected plugin engine from the core reply path. If a
non-legacy engine is missing, fails contract validation, throws during factory
creation, or throws from a lifecycle method, OpenClaw quarantines that engine
for the current Gateway process and downgrades context-engine work to the
built-in `legacy` engine. The error is logged with the failed operation so the
operator can repair, update, or disable the plugin without the agent going
silent.

Host requirement failures are different: when an engine declares that a runtime
lacks a required capability, OpenClaw fails closed before starting the run. That
protects engines that would corrupt state if they ran in an unsupported host.

### ownsCompaction

`ownsCompaction` controls whether OpenClaw runtime's built-in in-attempt auto-compaction stays enabled for the run:

<AccordionGroup>
  <Accordion title="ownsCompaction: true">
    The engine owns compaction behavior. OpenClaw disables OpenClaw runtime's built-in auto-compaction for that run, and the engine's `compact()` implementation is responsible for `/compact`, overflow recovery compaction, and any proactive compaction it wants to do in `afterTurn()`. OpenClaw may still run the pre-prompt overflow safeguard; when it predicts the full transcript will overflow, the recovery path calls the active engine's `compact()` before submitting another prompt.
  </Accordion>
  <Accordion title="ownsCompaction: false or unset">
    OpenClaw runtime's built-in auto-compaction may still run during prompt execution, but the active engine's `compact()` method is still called for `/compact` and overflow recovery.
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
  <Accordion title="内存插件">
    内存插件（`plugins.slots.memory`）与上下文引擎是分开的。内存插件提供搜索/检索；上下文引擎控制模型能看到什么。它们可以协同工作——上下文引擎可能会在组装期间使用内存插件数据。希望使用活动内存提示词路径的插件引擎，应优先使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它会将活动内存提示词分段转换为可直接前置的 `systemPromptAddition`。如果引擎需要更底层的控制，也仍然可以通过 `openclaw/plugin-sdk/memory-host-core` 中的 `buildActiveMemoryPromptSection(...)` 获取原始行。
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

- [Compaction](/concepts/compaction) - 压缩长对话
- [Context](/concepts/context) - 上下文如何为代理轮次构建
- [Plugin Architecture](/plugins/architecture) - 注册上下文引擎插件
- [Plugin manifest](/plugins/manifest) - 插件清单字段
- [Plugins](/tools/plugin) - 插件概览
