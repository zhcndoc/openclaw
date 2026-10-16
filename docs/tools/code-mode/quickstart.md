---
summary: "启用 OpenClaw 代码模式、覆盖一种模型并从工具错误中恢复"
title: "代码模式快速入门"
read_when:
  - "你想为某次代理运行启用 OpenClaw 代码模式"
  - "您需要每个代理或每个模型覆盖示例"
  - "代码模式工具调用失败，您需要恢复步骤"
---

## <a id="enable-code-mode"></a> 启用代码模式

当 `tools.codeMode` 不存在时，OpenClaw 使用 `"auto"` 层进行将来的代理运行。它仅对提供商目录中标记为首选的模型启用代码模式。此默认值不需要任何配置。

使用 **Settings → Agents & Tools → Labs → Code Mode** 更改全局设置。更改适用于将来的代理运行，无需重新启动网关。

要在没有 Control UI 的情况下启用同一层，请在配置中设置：

```json5
{
  tools: {
    codeMode: "auto",
  },
}
```

对于每个支持工具的运行，无论模型如何，都默认打开代码模式：

```json5
{
  tools: {
    codeMode: true,
  },
}
```

对象形式也有效：`tools.codeMode.enabled` 接受相同的 `false`、`true` 和 `"auto"` 值。对于 `false` 或没有显式 `enabled` 值的创作对象，代码模式保持关闭状态，除非代理或模型覆盖启用它。配置限制或其他代码模式选项不会启用它。

启用后，代码模式默认为 Node 的 `node:vm` 执行器进行可信执行。在同一设置面板中选择 QuickJS 或设置 `tools.codeMode.executor: "quickjs"` 以进行强化访客隔离。选择之前请先阅读 [Code Mode executors](/tools/code-mode/executors)：`node:vm` 不是安全边界。

请参阅 [ 自动按模型激活 ](/tools/code-mode/configuration#automatic-per-model-activation) 了解确切的语义和附带的模型列表。

如果你使用带有已配置 MCP 服务器的沙箱代理，也请在沙箱工具策略中允许捆绑的 MCP 插件，例如 `tools.sandbox.tools.alsoAllow: ["bundle-mcp"]`。参见 [配置 - tools 和自定义提供程序](/gateway/config-tools#mcp-and-plugin-tools-inside-sandbox-tool-policy)。

设置显式限制以获得更严格的边界：

```json5
{
  tools: {
    codeMode: {
      enabled: true,
      executor: "quickjs",
      timeoutMs: 10000,
      memoryLimitBytes: 67108864,
      maxOutputBytes: 65536,
      maxSnapshotBytes: 10485760,
      maxPendingToolCalls: 16,
      snapshotTtlSeconds: 900,
      searchDefaultLimit: 8,
      maxSearchLimit: 50,
    },
  },
}
```

## <a id="override-one-model"></a> 覆盖一种模型

在 `agents.defaults.models` 中的确切 `provider/model` 条目上设置 `codeMode: true` 或 `codeMode: false`。省略 `codeMode` 以继承父激活设置，包括其 `"auto"` 行为。 model 字段只接受布尔值； `"auto"` 属于全局或每代理 `tools.codeMode` 设置。通配符行如`"openai/*"`可以配置运行时策略，但不能设置`codeMode`；配置验证会拒绝它们而不是忽略覆盖。

```json5
{
  tools: { codeMode: "auto" },
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.6-luna": {
          agentRuntime: { id: "openclaw" },
          codeMode: true,
        },
      },
    },
    entries: {
      research: {
        models: {
          "openai/gpt-5.6-luna": { codeMode: false },
        },
      },
    },
  },
}
```

该示例为此模型启用代码模式（`research` 代理除外）。激活从第一个显式设置开始按以下顺序解析：

1. `agents.entries.<agent>.models["provider/model"].codeMode`.
2. `agents.entries.<agent>.tools.codeMode.enabled`（或其 boolean/`"auto"` 简写）。
3. `agents.defaults.models["provider/model"].codeMode`.
4. `tools.codeMode.enabled`（或其简写）；完全不存在的全局设置默认为 `"auto"`，而没有 `enabled` 的创作对象默认为 `false`。

在Control UI中，打开**Settings → Agents → Agent defaults**，显示**Advanced**设置，并在**Agent下找到**Models**默认值**。每个模型在其运行时旁边都有一个 **Code Mode** 选择器：**Default** 删除覆盖，**On** 保存 `true`，并且**Off** 保存 `false`。对于特定于代理的覆盖，请展开 **Agent List**，然后展开代理的 **Agent Model Overrides**。不支持的字段仍标记为 **Raw** 编辑，而不隐藏其旁边支持的设置。

覆盖会影响未来运行中选定的模型，包括后备模型；它们不会在无工具运行时启用工具或更改运行时选择。该示例单独选择 `agentRuntime.id: "openclaw"`，因为 OpenAI 路由可能会使用 Codex。这些设置不控制 Codex 本机代码模式。模型仅覆盖更改激活；限制仍然来自全局和每个代理 `tools.codeMode` 选项。

## <a id="what-the-model-does"></a> 该模型的作用

每个 `exec` 都会启动一个新的 JavaScript 上下文。变量和函数不会在单元之间传递； `wait` 恢复相同的单元格。使用 `await store(key, value)` 和 `await load(key)` 来获取此会话中各轮次所需的小 JSON 值，包括重新启动后。请参阅 [ 会话存储 ](/tools/code-mode/guest-api#session-store) 了解其提交规则和限制。

对于带有声明输出的工具，例如 `Array<{ id: string; paid: boolean; tons: number }>`, 一个来宾程序可以选择、调用并转换它：

```javascript
const [shipmentTool] = await catalog.search("list shipments");
const shipments = await shipmentTool({});
return shipments.filter((shipment) => !shipment.paid && shipment.tons > 10);
```

声明的输出字段可能会在同一 `exec` 中提供稍后的调用；不要花第二个 `exec` 仅仅检查它们。

当快速索引线以 `-> ?` 结尾时，输出形状未知。第一个 `exec` 必须返回最终异步工具调用不变或保存其值以进行有限预览。不要将未知值输入到同一程序中猜测的字段相关逻辑中。检查原始值或保存的预览，然后使用稍后的 `exec` 进行相关合成。

## <a id="reuse-data-across-cells"></a> 跨单元重复使用数据

正常返回一个不熟悉的结果。当最终对象或数组超出输出或模型结果预算时，交互式 `exec` 和 `wait` 会在容量允许的情况下自动保存它。完成的结果包含 `value: { truncated: true, reference: { id, bytes, count, shape, preview, previewTruncated }, guidance }`。将该引用的 `id` 与另一个单元格中的 `results.load(id)` 一起使用。小的返回值保持其正常形状；发出的 `text` 和 `json` 输出不会自动保存。

当后续步骤需要检查和转换获取的结果时，保存它：

```javascript
const [shipmentTool] = await catalog.search("list shipments");
return await results.save(await shipmentTool({}));
```

直接返回此描述符作为单元格的输出。它的预览、形状和数量都已经准备好了；完整获取的值保留在保存的存储中。

返回的引用包含 `id`、编码的 JSON、`bytes`、`count`、采样的 `shape` 和有界字符串 `preview`。 `count` 是顶级数组长度、对象键计数或标量 1。嵌套数组长度显示在采样视图中，并带有路径和采样项索引。第一项、中间项和最后一项提供观察到的形状，包括观察到的异质值；这些不是模式或验证保证。 Discovery 最多访问 128 个节点、5 个级别和每个对象 16 个键，优先考虑它找到的 8 个最大的数组。有限的遍历被明确标记。紧凑标量包络字段与数组样本一起提供上下文。

小预览包含完整的 JSON。较大的预览描述了采样数据，并且本身可能被剪切为 JSON 前缀。 `previewTruncated: true` 始终表示预览不完整。描述符适合 768 个编码的 JSON 字节；输出和模型预算可以进一步缩短其描述性字段，同时保留其特性。在处理完整数据之前加载原始JSON。

检查这些字段后，后面的单元可以重用原始结果：

```javascript
const shipments = await results.load("result_<id from the previous cell>");
return shipments.filter((shipment) => !shipment.paid).length;
```

每次加载都会返回一个独立的 JSON 副本。修改它不会改变保存的值。使用`await results.delete(id)`释放容量。丢失或过期的引用会拒绝并出现可捕获的错误。 `API.read("results.d.ts")` 提供TypeScript-风格的文档；加载的数据被声明为 `unknown`，因此在组合之前检查其形状。

当当前回复结束时，参考文献将过期；切勿重复使用之前的 ID。对于稍后需要的小 JSON 值，请使用 `store`。引用在单元格完成和 `wait` 中保留，但在回复结束、中止、目录替换、权限更改或网关重新启动后不保留。它们是快照：当当前外部状态重要时再次获取。结果存储最多可容纳 64 个值，总编码 JSON 余量为 `min(memoryLimitBytes, maxSnapshotBytes)`（默认情况下为 10 MiB），与单元格收件箱分开。新保存在满时失败；现有的引用永远不会被自动驱逐。不保存任何函数、工具句柄或权限。结果操作在 `restartSafe` 单元中不可用，因为引用是暂时的并且无法安全地重播删除。在无头执行中也会禁用自动保存。如果容量、数据限额或输出预算阻止提供参考，则原始调用保持完成状态并返回一个普通截断标记，说明未保留完整结果。现有参考文献保持不变；没有公布部分节省的价值。

## <a id="recover-from-tool-errors"></a> 从工具错误中恢复

抛出的工具错误是可以捕获的。返回值可能会报告失败。遵循工具的结果契约，并在重试之前检查可能的效果。访客代码可以检查抛出错误的诊断字段：`code` 标识 `input_contract`、`output_contract`、`invalid_contract`、`invalid_input` 或 `tool_error`； `location` 包含原始访客呼叫站点框架（如果可用）。 `effectStatus` 仍为 `"unknown"`：分类不是调度所有者收据，并且从不授予重试权限。特别是，工具在开始工作后可能会抛出输入错误。访客代码可以返回选择下一步操作所需的信息：

```javascript
try {
  return await terminal({ action: "list" });
} catch (error) {
  return { status: "unavailable", error: error.message };
}
```

对于 `output_contract`，该工具返回的响应未通过其声明的输出架构。该错误包括最多五个验证详细信息，每个验证详细信息的长度为 256 UTF-8 字节加上截断标记，并包含字段路径和预期约束。响应正文被省略。例如，`receipt.count: must be number` 识别格式错误的计数，但不打印返回值。重试之前检查当前状态：结果验证不会撤消之前的效果，并且 `effectStatus` 仍为 `"unknown"`。

等待每个工具调用或显式处理其拒绝。 OpenClaw 在完成单元之前耗尽已调度的呼叫；未处理的拒绝（包括来自未等待的呼叫或计时器回调的拒绝）会使单元失败，而不是默默地报告成功。暂停后附加的处理程序仍会履行其最初的承诺。

JavaScript 语法错误和未捕获的嵌套工具失败变为失败的 `exec` 或 `wait` 结果。该模型可以读取错误，更正其代码，检查当前状态，并继续使用正常的工具表面。失败的单元不会施加单独的恢复模式或突变预算。

OpenClaw 不会自动重播失败的节目。较早的调用可能已更改状态，而失败的调用可能已部分应用。在决定剩下的内容之前检查权威状态，并且不要重复已完成的操作。当 `wait` 恢复挂起的单元时，这也适用：其先前的调用属于同一程序。

每个后续调用都会再次运行普通的挂钩和批准。已消耗的语音确认保持已消耗状态；发生错误后继续不会恢复授权。取消、明确终止工具结果、沙箱限制、批准要求和工具策略拒绝保留其现有行为。

## <a id="verify-the-active-surface"></a> 验证活动表面

要在调试时确认模型负载形状，请使用有针对性的日志运行 Gateway：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

在代码模式激活时，日志中对模型可见的工具名称应为 `exec` 和 `wait`。如需查看完整的已脱敏提供程序负载，可在短暂的调试会话中添加 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。

## <a id="use-swarm-for-agent-fan-out"></a> 使用 Swarm 进行代理分发

[Swarm](/tools/swarm) 添加了 `agents.run()`、`phase()` 和 `log()` 来宾全局变量，用于从代码模式脚本编排并发子代理。 Swarm 默认启用；代码模式激活保持独立。使用正常的 JavaScript 控制流进行扇出、决策门和结构化收集。

仅当启用 Swarm 并且本机 OpenClaw `sessions_spawn` 工具存在于代码模式目录中且获得运行的执行白名单允许时，Swarm 全局变量、`API.read("agents.d.ts")` 和 Swarm 提示提示才会出现。同名的 MCP 工具不符合条件。代码模式在内部等待收集器结果，因此 `agents.run()` 不需要独立的 `agents_wait` 工具。直接低级 Swarm 使用需要允许使用这两种工具。

将 `tools.swarm: false` 或 `tools.swarm.enabled: false` 设置为全局或在代理的 `tools` 下选择退出。使用代码模式不会覆盖该选择退出或授予对策略拒绝的工具的访问权限。
