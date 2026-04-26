---
summary: "上下文引擎：可插拔的上下文组装、压缩和子代理生命周期"
read_when:
  - 你想了解 OpenClaw 如何组装模型上下文
  - 你正在在传统引擎和插件引擎之间切换
  - 你正在构建一个上下文引擎插件
title: "上下文引擎"
---

**上下文引擎** 控制 OpenClaw 在每次运行时如何构建模型上下文：
包括要包含哪些消息、如何总结较旧的历史记录，以及如何在子代理边界之间管理上下文。

OpenClaw 自带一个内置的 `legacy` 引擎，并且默认使用它——大多数用户从不需要更改这一点。只有当你希望获得不同的组装、压缩或跨会话记忆行为时，才安装并选择插件引擎。

## 快速开始

检查哪个引擎处于活跃状态：

```bash
openclaw doctor
# 或直接检查配置：
cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
```

### 安装上下文引擎插件

上下文引擎插件与其他 OpenClaw 插件的安装方式相同。先安装，然后在插槽中选择该引擎：

```bash
# 从 npm 安装
openclaw plugins install @martian-engineering/lossless-claw

# 或从本地路径安装（用于开发）
openclaw plugins install -l ./my-context-engine
```

然后启用插件并在配置中将其选为活跃引擎：

```json5
// openclaw.json
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw", // 必须与插件注册的引擎 ID 匹配
    },
    entries: {
      "lossless-claw": {
        enabled: true,
        // 插件特定配置放在此处（参见插件文档）
      },
    },
  },
}
```

安装并配置后重启网关。

要切换回内置引擎，将 `contextEngine` 设为 `"legacy"`（或完全删除该键——`"legacy"` 是默认值）。

## 工作原理

每次 OpenClaw 运行模型提示时，上下文引擎会在四个生命周期点参与：

1. **摄取** — 当新消息添加到会话时调用。引擎可以将其存储或索引到自己的数据存储中。
2. **组装** — 在每次模型运行前调用。引擎返回一组有序的消息（以及可选的 `systemPromptAddition`），这些消息需符合 Token 预算。
3. **压缩** — 当上下文窗口已满或用户运行 `/compact` 时调用。引擎总结历史记录以释放空间。
4. **回合后** — 在运行完成后调用。引擎可以持久化状态、触发后台压缩或更新索引。

对于捆绑的非 ACP Codex harness，OpenClaw 会通过将组装好的上下文投影到 Codex 开发者指令和当前回合提示中，来应用相同的生命周期。Codex 仍然拥有其原生线程历史和原生压缩器。

### 子代理生命周期（可选）

OpenClaw 会调用两个可选的子代理生命周期钩子：

- **prepareSubagentSpawn** — 在子运行开始前准备共享上下文状态。该钩子会接收父/子会话键、`contextMode`（`isolated` 或 `fork`）、可用的转录 id/文件，以及可选的 TTL。如果它返回一个回滚句柄，那么在准备成功后若生成失败，OpenClaw 会调用该句柄。
- **onSubagentEnded** — 在子代理会话完成或被清理时进行清理。

### 系统提示附加内容

`assemble` 方法可以返回一个 `systemPromptAddition` 字符串。OpenClaw 会将其附加到本次运行的系统提示前。这使得引擎可以注入动态召回指导、检索指令或上下文感知提示，而无需使用静态工作区文件。

## 传统引擎

内置的 `legacy`（传统）引擎保留了 OpenClaw 的原始行为：

- **摄取**：无操作（会话管理器直接处理消息持久化）。
- **组装**：透传（运行时中现有的清理 → 验证 → 限制管道处理上下文组装）。
- **压缩**：委托给内置的总结压缩，它会创建旧消息的单一摘要并保留近期消息完整。
- **回合后**：无操作。

传统引擎不注册工具也不提供 `systemPromptAddition`。

当未设置 `plugins.slots.contextEngine`（或设置为 `"legacy"`）时，会自动使用此引擎。

## 插件引擎

插件可以使用插件 API 注册上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function register(api) {
  api.registerContextEngine("my-engine", () => ({
    info: {
      id: "my-engine",
      name: "我的上下文引擎",
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
      // 总结旧上下文
      return { ok: true, compacted: true };
    },
  }));
}
```

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

| 成员 | 类型 | 用途 |
| ------------------ | -------- | -------------------------------------------------------- |
| `info` | 属性 | 引擎 ID、名称、版本以及是否拥有压缩控制权 |
| `ingest(params)` | 方法 | 存储单条消息 |
| `assemble(params)` | 方法 | 为模型运行构建上下文（返回 `AssembleResult`） |
| `compact(params)` | 方法 | 总结/减少上下文 |

`assemble` 返回包含以下内容的 `AssembleResult`：

- `messages` — 要发送给模型的有序消息。
- `estimatedTokens`（必需，`number` 类型）— 引擎对组装上下文中总 Token 数的估计。OpenClaw 使用此值进行压缩阈值决策和诊断报告。
- `systemPromptAddition`（可选，`string` 类型）— 附加到系统提示前。

可选成员：

| 成员 | 类型 | 用途 |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 为一个会话初始化引擎状态。首次看到某个会话时调用一次（例如导入历史记录）。 |
| `ingestBatch(params)`          | 方法 | 以批处理方式摄取一个已完成回合。运行完成后一次性接收该回合的所有消息时调用。     |
| `afterTurn(params)`            | 方法 | 运行后的生命周期工作（持久化状态、触发后台压缩）。                                         |
| `prepareSubagentSpawn(params)` | 方法 | 在子会话开始前为其建立共享状态。                                                       |
| `onSubagentEnded(params)`      | 方法 | 子代理结束后进行清理。                                                                                 |
| `dispose()`                    | 方法 | 释放资源。在网关关闭或插件重新加载期间调用——不是按会话调用。                           |

### ownsCompaction

`ownsCompaction` 控制 Pi 的内置尝试内自动压缩是否在该运行中保持启用：

- `true` — 引擎拥有压缩行为的控制权。OpenClaw 会为该次运行禁用 Pi 的内置自动压缩，而引擎的 `compact()` 实现负责 `/compact`、溢出恢复压缩，以及它希望在 `afterTurn()` 中执行的任何主动压缩。OpenClaw 仍可能运行提示前的溢出保护；当它预测完整转录将发生溢出时，恢复路径会在提交另一个提示之前调用活跃引擎的 `compact()`。
- `false` 或未设置 — 在提示执行期间，Pi 的内置自动压缩仍可能运行，但活跃引擎的 `compact()` 方法仍会在 `/compact` 和溢出恢复时被调用。

`ownsCompaction: false` **并不**意味着 OpenClaw 会自动回退到传统引擎的压缩路径。

这意味着有两种有效的插件模式：

- **拥有模式** — 实现你自己的压缩算法并设置 `ownsCompaction: true`。
- **委托模式** — 设置 `ownsCompaction: false` 并在 `compact()` 中调用 `openclaw/plugin-sdk/core` 的 `delegateCompactionToRuntime(...)` 以使用 OpenClaw 的内置压缩行为。

对于活跃的非拥有引擎，无操作的 `compact()` 是不安全的，因为它会禁用该引擎槽的正常 `/compact` 和溢出恢复压缩路径。

## 配置参考

```json5
{
  plugins: {
    slots: {
      // 选择活跃的上下文引擎。默认值："legacy"。
      // 设置为插件 ID 以使用插件引擎。
      contextEngine: "legacy",
    },
  },
}
```

该插槽在运行时是互斥的——在给定运行或压缩操作中只能解析一个已注册的上下文引擎。其他已启用的 `kind: "context-engine"` 插件仍可以加载并运行其注册代码；`plugins.slots.contextEngine` 仅选择 OpenClaw 在需要上下文引擎时解析哪个已注册的引擎 ID。

## 与压缩和记忆的关系

- **压缩** 是上下文引擎的一项职责。传统引擎委托给 OpenClaw 内置的总结功能。插件引擎可以实现任何压缩策略（DAG 摘要、向量检索等）。
- **记忆插件**（`plugins.slots.memory`）与上下文引擎是分开的。记忆插件提供搜索/检索；上下文引擎控制模型能看到什么。它们可以协同工作——上下文引擎可能会在组装期间使用记忆插件数据。希望使用活跃记忆提示路径的插件引擎应优先使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它会将活跃的记忆提示部分转换为可直接前置的 `systemPromptAddition`。如果引擎需要更底层的控制，它仍然可以通过 `openclaw/plugin-sdk/memory-host-core` 使用 `buildActiveMemoryPromptSection(...)` 来提取原始行。
- **会话裁剪**（在内存中裁剪旧工具结果）无论哪个上下文引擎处于活跃状态都会继续运行。

## 提示

- 使用 `openclaw doctor` 验证你的引擎是否正确加载。
- 如果切换引擎，现有会话会继续使用其当前历史记录。新引擎接管未来的运行。
- 引擎错误会被记录并在诊断中显示。如果插件引擎注册失败或选择的引擎 ID 无法解析，OpenClaw 不会自动回退；在你修复插件或将 `plugins.slots.contextEngine` 切换回 `"legacy"` 之前，运行会失败。
- 对于开发，使用 `openclaw plugins install -l ./my-engine` 链接本地插件目录而无需复制。

另请参阅：[压缩](/concepts/compaction)、[上下文](/concepts/context)、
[插件](/tools/plugin)、[插件清单](/plugins/manifest)。

## 相关内容

- [上下文](/concepts/context) — 代理回合的上下文构建方式
- [插件架构](/plugins/architecture) — 注册上下文引擎插件
- [压缩](/concepts/compaction) — 总结长对话
