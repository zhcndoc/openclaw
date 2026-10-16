---
summary: "OpenClaw 代码模式文档索引，每个阅读器作业一页"
title: "代码模式"
sidebarTitle: "代码模式"
doc-schema-version: 1
read_when:
  - "您想要为代理运行启用 OpenClaw 代码模式"
  - "你需要解释为什么 Code Mode 与 Codex Code Mode 不同"
  - "您正在寻找与您的任务匹配的代码模式页面"
---

代码模式是一项实验性 OpenClaw 代理运行时功能。启用后，模型将不再看到每个启用的工具架构。相反，它会看到 `exec`、`wait` 以及任何其结构化结果无法跨越 JSON-only 访客桥的直接工具。该模型编写了一个小型 JavaScript 程序，用于搜索、描述和调用隐藏的工具目录。 TypeScript-style签名描述了可用的工具；可执行单元使用没有类型注释的普通 JavaScript。

<Note>
当 `tools.codeMode` 不存在时，OpenClaw 使用 `"auto"` 层并仅对标记为首选代码模式执行者的模型启用代码模式。没有 `enabled` 的创作对象将保持关闭状态，`false` 和 `{ enabled: false }` 也是如此。代理和模型覆盖优先。使用 **Settings → Agents & Tools → Labs → Code Mode** 选择全局设置。
</Note>

本页记录了 OpenClaw 代码模式，而不是 Codex 代码模式。这两个功能共享一个名称和相同的控制工具名称（`exec`、`wait`），但它们是单独的实现：

- Codex Code Mode 运行在 Codex 编码框架内。它的 `exec` 工具是一种自由形式语法工具：模型编写原始 JavaScript 源码（可选地在前面加上 `// @exec: {...}` pragma 行以指定执行选项），并在 Codex 的进程内 V8 Code Mode 运行时中执行。
- OpenClaw 代码模式在通用 OpenClaw 代理运行时中运行，并通过全局、代理或模型激活设置启用。其 `exec` 工具采用 JSON `{ title, code }` 有效负载，由选定的 Node 或 QuickJS 执行器执行。

二者都属于 JavaScript 执行界面，而不是 shell 命令界面。请将它们视为相互独立、实现方式不同的功能，恰好都暴露了同名的 `exec`/`wait` 工具。

在 OpenClaw 代码模式下，`command` 是 `code` 的 JavaScript 别名，而不是 shell 命令。对于 shell 或文件操作，请从来宾 JavaScript 全局调用适当的异步工具。在可操作的 `invalid_input` 指导下，在来宾执行之前会拒绝可识别的 shell 命令。

JavaScript 在网关的主事件循环之外执行。 Node 是默认执行器，并在工作线程中使用 `node:vm` 进行可信执行；它不是安全边界。捆绑的 QuickJS 执行器提供强化的来宾隔离。两者都使用相同的工具桥，其中权限、批准和会话所有权保留在网关中。启用之前请参阅 [Code Mode executors](/tools/code-mode/executors)。

此页是一个索引。代码模式记录在九页中，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                      | 读它的时候                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [代码模式快速入门](/tools/code-mode/quickstart)       | 您想要打开代码模式、覆盖一种模型并从工具错误中恢复。   |
| [代码模式执行器](/tools/code-mode/executors)         | 您想要选择 Node 或 QuickJS 并了解它们的安全边界。       |
| [代码模式配置](/tools/code-mode/configuration) | 您需要配置字段、首选模型列表和激活顺序。 |

## <a id="what-it-does"></a> 它的作用

- 模型可见工具列表变为`exec`、`wait`，加上任何直接工具，例如`computer`或本机视觉`view_image`加载器，其图像结果无法在访客桥中保存。
- `exec` 在选定执行器的工作线程中评估模型生成的 JavaScript。
- 每个符合目录资格的启用的非MCP工具（OpenClaw核心、插件、客户端）都作为独立模型工具隐藏，并作为异步全局函数在来宾程序内公开。 MCP 位于 `MCP` 命名空间下。
- 当可信工具提供输出模式时，运行的提示符带有最终可调用名称的有界快速索引、紧凑输入提示和紧凑声明的输出提示。它省略了描述、完整模式、MCP 条目和溢出条目。可调用的 `catalog.search(...)` 结果是后备。输入提示保留整数和数字范围作为注释，例如 `offset?: number /* integer, >= 1 */`。其他验证详细信息保留在可通过 `describe()` 获取的完整架构中。这些提示不会更改工具验证或输出合同。核心文件和 shell 工具签名首先保留在有界索引中，然后是具有声明的输出提示的工具，因此目录增长不会隐藏其输入参数名称。索引遵循稳定的提示符前缀；目录更改不会重写 `exec` 架构。
- 来宾代码直接调用全局变量或搜索隐藏目录以查找可调用句柄。句柄公开有界元数据和 `describe()`，但永远不会公开确切的内部目录 ID。呼叫使用与正常代理轮流相同的执行路径（策略、批准、挂钩、遥测仍然适用）。
- MCP 工具分组在 `MCP` 命名空间下，并可通过 `catalog.search(...)` 按任务发现。 MCP 搜索句柄调用相同的命名空间路径并指向其确切的声明。
- 当嵌套工具调用仍待处理时，`wait` 恢复暂停的代码模式运行。

仅当外部代码模式结果为 `status: "waiting"` 时才调用 `wait`，使用其顶层 `runId`。完成的单元可以返回后台 shell 操作，并在 `value` 内有自己的 `sessionId`。使用新 `exec` 内启用的过程控制工具来轮询该操作。其 `sessionId` 不是运行 ID 的代码模式。

代码模式只会改变面向模型的编排层表面。它不会替换工具、插件工具、MCP 工具、身份验证、审批策略、频道行为或模型选择。

## <a id="creating-sessions-from-code-mode"></a> 从代码模式创建会话

紧凑的表面保留了会话路由。诸如“启动新任务”之类的显式请求使用已启用的 `sessions_create` 工具：包含 `message` 来开始工作，或忽略它以进行空闲会话。这将创建一个独立的持久可见会话，而不是受监督的子会话，因此没有完成事件或产量期望。请参阅 [ 会话工具](/concepts/session-tool#creating-an-independent-session)。

可用性来自当前授权的工具集。如果紧凑索引省略工具或其输入，则在 OpenClaw 代码模式下使用 `catalog.search(...)` 和返回句柄的 `describe()`。在 Codex 代码模式下，使用其 `ALL_TOOLS` 发现和 `tools` 调用表面。这两个表面都支持当前功能和工具策略未公开的工具。

实际委派帮助程序仍然使用子工具（`sessions_spawn` 用于 OpenClaw 或 ACP 委派，Codex 帮助程序的本机协作工具）。主动的、未经请求的后续提案在启用时使用 `suggest_task`；建议卡在被接受之前不会开始工作。

## <a id="why-use-it"></a> 为什么使用它

- 更小的提示面：提供方只获得两个控制工具、一个有界的原生工具索引，以及少量必需的直接工具，而不是几十或几百个完整的工具模式。
- 更好的编排：模型可以在一个代码单元中使用循环、连接、小型转换、条件逻辑以及并行嵌套工具调用。
- 更少的模型往返次数：声明的输出合约允许模型调用并转换工具结果为一个 `exec`。未知的输出仍然是原始的。
- 提供方无关：可用于 OpenClaw、插件、MCP 和客户端工具，而不依赖提供方原生代码执行。
- 无回退：如果启用了代码模式但所选执行器不可用，则运行会失败，而不是默默地回退到广泛的直接工具暴露。

这对拥有大量已启用工具目录的代理，或者模型需要在回答前搜索、 组合并调用多个工具的工作流尤其有用。

为小型目录或无法可靠编写短程序的模型保留直接工具暴露。当您想要紧凑的目录但更喜欢结构化的 search/describe/call 控件而不是 JavaScript 单元时，请使用 [Tool Search](/tools/tool-search)。

## <a id="technical-tour"></a> 技术导览

这些页面涵盖了运行时合同和实现细节，供维护者、调试工具暴露的插件作者以及验证高风险部署的操作员使用。

| 页面                                                          | 读它的时候                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [代码模式工具面](/tools/code-mode/tool-surface)       | 您需要 `exec` 和 `wait` 合约、隐藏目录和冲突。 |
| [编码模式客API](/tools/code-mode/guest-api)             | 您正在编写访客代码并需要其全局变量、句柄和 MCP 命名空间。 |
| [代码模式输出](/tools/code-mode/output)                   | 您需要声明的输出合同或访客输出 API。                   |
| [代码模式内部结构](/tools/code-mode/internals)             | 您需要范围、术语、嵌套执行、快照或安全边界。 |
| [代码模式故障排除](/tools/code-mode/troubleshooting) | 您需要错误代码、遥测字段或调试环境变量。   |
| [代码模式维护者笔记](/tools/code-mode/maintainers)    | 您正在更改代码模式源、验证它或编写 E2E 覆盖范围。    |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/tools/code-mode#guest-runtime-api`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quickstart" />[快速入门](/tools/code-mode/quickstart)
- <a id="enable-code-mode" />[启用代码模式](/tools/code-mode/quickstart#enable-code-mode)
- <a id="override-one-model" />[覆盖一个模型](/tools/code-mode/quickstart#override-one-model)
- <a id="what-the-model-does" />[ 模型的作用](/tools/code-mode/quickstart#what-the-model-does)
- <a id="recover-from-tool-errors" />[从工具错误中恢复](/tools/code-mode/quickstart#recover-from-tool-errors)
- <a id="verify-the-active-surface" />[验证活动表面](/tools/code-mode/quickstart#verify-the-active-surface)
- <a id="use-swarm-for-agent-fan-out" />[使用 Swarm 进行代理扇出](/tools/code-mode/quickstart#use-swarm-for-agent-fan-out)
- <a id="configuration" />[配置](/tools/code-mode/configuration#configuration)
- <a id="automatic-per-model-activation" />[每个模型自动激活](/tools/code-mode/configuration#automatic-per-model-activation)
- <a id="the-compat.codemode-catalog-flag" /><a id="the-compat-codemode-catalog-flag" />[兼容目录标志](/tools/code-mode/configuration#the-compat-codemode-catalog-flag)
- <a id="shipped-preferred-models" />[已发货优选模型](/tools/code-mode/configuration#shipped-preferred-models)
- <a id="models-shipped-by-more-than-one-provider" />[由多个提供商发货的模型](/tools/code-mode/configuration#models-shipped-by-more-than-one-provider)
- <a id="choosing-when-to-enable" />[选择何时启用](/tools/code-mode/configuration#choosing-when-to-enable)
- <a id="activation" />[激活](/tools/code-mode/configuration#activation)
- <a id="model-visible-tools" />[模型可见工具](/tools/code-mode/tool-surface#model-visible-tools)
- <a id="exec" />[执行工具](/tools/code-mode/tool-surface#exec)
- <a id="source-in-session-history" />[ 会话历史记录中的源](/tools/code-mode/tool-surface#source-in-session-history)
- <a id="wait" />[等待工具](/tools/code-mode/tool-surface#wait)
- <a id="tool-catalog" />[工具目录](/tools/code-mode/tool-surface#tool-catalog)
- <a id="tool-search-interaction" />[工具搜索交互](/tools/code-mode/tool-surface#tool-search-interaction)
- <a id="tool-names-and-collisions" />[工具名称和碰撞](/tools/code-mode/tool-surface#tool-names-and-collisions)
- <a id="guest-runtime-api" />[来宾运行时 API](/tools/code-mode/guest-api#guest-runtime-api)
- <a id="reading-paginated-file-data" />[读取分页文件数据](/tools/code-mode/guest-api#reading-paginated-file-data)
- <a id="declared-output-contracts" />[申报产出合同](/tools/code-mode/output#declared-output-contracts)
- <a id="output-api" />[输出 API](/tools/code-mode/output#output-api)
- <a id="runtime-status" />[运行状态](/tools/code-mode/internals#runtime-status)
- <a id="scope" />[范围](/tools/code-mode/internals#scope)
- <a id="terms" />[条款](/tools/code-mode/internals#terms)
- <a id="nested-tool-execution" />[嵌套刀具执行](/tools/code-mode/internals#nested-tool-execution)
- <a id="run-and-snapshot-lifecycle" />[运行和快照生命周期](/tools/code-mode/internals#run-and-snapshot-lifecycle)
- <a id="quickjs-wasi-runtime" />[QuickJS-WASI 运行时](/tools/code-mode/internals#quickjs-wasi-runtime)
- <a id="typescript" />[TypeScript](/tools/code-mode/internals#typescript)
- <a id="security-boundary" />[安全边界](/tools/code-mode/internals#security-boundary)
- <a id="error-codes" />[错误代码](/tools/code-mode/troubleshooting#error-codes)
- <a id="telemetry" />[遥测](/tools/code-mode/troubleshooting#telemetry)
- <a id="debugging" />[调试](/tools/code-mode/troubleshooting#debugging)
- <a id="implementation-layout" />[实施布局](/tools/code-mode/maintainers#implementation-layout)
- <a id="validation-checklist" />[验证清单](/tools/code-mode/maintainers#validation-checklist)
- <a id="e2e-test-plan" />[E2E 测试计划](/tools/code-mode/maintainers#e2e-test-plan)

## <a id="related"></a> 相关内容

- [Swarm](/tools/swarm) 用于从 Code Mode 脚本进行扇出式代理编排
- [工具 Search](/tools/tool-search)
- [Agent 运行时](/concepts/agent-runtimes)
- [Exec 工具](/tools/exec)
- [代码执行](/tools/code-execution)
