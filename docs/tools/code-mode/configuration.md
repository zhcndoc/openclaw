---
summary: "代码模式配置字段、每个模型的自动激活和激活顺序"
title: "代码模式配置"
doc-schema-version: 1
read_when:
  - "您正在设置代码模式限制或运行时"
  - "您需要首选模型列表和兼容目录标志"
  - "您需要运行的确切激活优先级"
---

## <a id="configuration"></a> 配置

不存在的全局 `tools.codeMode` 设置默认为 `"auto"`。如果您创作代码模式对象，则除非该对象显式设置 `enabled`，否则其激活将保持关闭状态；这使您可以在不启用该功能的情况下暂存执行程序或限制设置。简写 `false` 也会禁用它。代理和模型覆盖保留其现有优先级。

| 字段                 | 默认值    | 限制                                           |
| --------------------- | ---------- | ----------------------------------------------- |
| `enabled`             | 见上文  | `false`、`true` 或 `"auto"`（按模型）        |
| `executor`            | `"node"`   | `"node"` or `"quickjs"`                         |
| `mode`                | `"only"`   | 公开 control/direct 工具，对其余工具进行分类 |
| `timeoutMs`           | `10000`    | `100`-`60000`                                   |
| `memoryLimitBytes`    | `67108864` | `1048576`-`1073741824`                          |
| `maxOutputBytes`      | `65536`    | `1024`-`10485760`                               |
| `maxSnapshotBytes`    | `10485760` | `1024`-`268435456`                              |
| `maxPendingToolCalls` | `16`       | `1`-`128`                                       |
| `snapshotTtlSeconds`  | `900`      | `1`-`86400`                                     |
| `searchDefaultLimit`  | `8`        | 限制为 `maxSearchLimit`                     |
| `maxSearchLimit`      | `50`       | `1`-`50`                                        |

代码模式仅执行 JavaScript。 Doctor 和符合条件的网关启动迁移从全局和每个代理代码模式配置中删除已停用的 `languages` 设置，保留激活和限制。

默认的 Node 执行器使用 `node:vm` 进行可信执行，而不是安全隔离。选择 `executor: "quickjs"` 作为捆绑的强化来宾运行时。代理级执行器设置会覆盖全局选择。有关安全、内存、等待和升级行为，请参阅 [ 代码模式执行程序](/tools/code-mode/executors)。 `maxSnapshotBytes` 限制 QuickJS VM 快照和共享保存结果限额；它不限制 Node 保留的实时上下文。

`timeoutMs` 是每个 `exec` 或 `wait` 调用的挂钟预算。工作准备、访客计算和内联工具等待共享该预算；批准等待暂停它。对于显式 `awaitResults: true` 单元，关闭 VM 工具等待也会暂停执行允许。结算后，同样未使用的津贴恢复；工人的准备和客人的执行永远不会收到新的预算。现有的代理运行和工具截止日期在所需的等待期间继续运行。面向模型的 `exec` 描述包括有效限制。阻止耗尽预算的来宾计算失败，并显示 `timeout`。未完成的工具调用可以返回 `waiting`，因此稍后的 `wait` 可以使用新的调用预算来恢复它们。无头延续还遵循排队和初始化后的确切工人准入预算，以及其配置的切片限制和单个无头挂钟截止日期。检查点不会重置墙的截止时间。当 shell `exec` 工具可用时，将其用于较繁重的计算，并使 guest JavaScript 专注于协调工具和处理结果。

如果启用了代码模式但所选执行器无法加载，则 OpenClaw 停止运行；它不会默默地暴露普通工具作为后备。这适用于 `true` 和 `"auto"` 运行，其中模型按首选解析：参与的运行永远不会默默地回退到另一个执行器或广泛的直接工具暴露。

## <a id="automatic-per-model-activation"></a> 自动按模型启用

`tools.codeMode.enabled` 接受三个值：

- `false`：代码模式处于关闭状态，除非代理或模型覆盖启用它。
- `true`：代码模式用于支持工具的运行，除非覆盖将其禁用。
- `"auto"`：仅当运行的模型在其提供者目录中被标记为首选代码模式执行者时，代码模式才会启用。

当全局设置完全不存在时，OpenClaw 的行为就像 `"auto"` 一样。没有 `enabled` 的创作对象的行为与 `false` 相同。当没有代理或模型覆盖优先时，这些值提供默认值。 `"auto"` 使用目录功能；显式的每个模型布尔值会绕过该功能首选项。

### <a id="the-compat.codemode-catalog-flag"></a><a id="the-compat-codemode-catalog-flag"></a> `compat.codeMode` 目录标志

提供方目录可以在模型条目上用 `compat.codeMode` 对模型分层， 它与 `compat.supportsTools` 等标志并列：

- `"preferred"`：该模型能够稳定编写简短的编排程序，并受益于紧凑的代码模式界面；`"auto"` 会启用代码模式。
- `"capable"`（或缺省）：该模型在强制设置 `enabled: true` 时可以运行代码模式，但 `"auto"` 会保留普通工具暴露方式。

不支持工具的模型根本不能使用代码模式；不存在单独的“unsupported”层级。该标志是由提供方插件目录拥有的能力元数据；核心只读取通用的 compat 字段。

### <a id="shipped-preferred-models"></a> 已随版本发布的首选模型

捆绑的提供方目录当前将以下模型标记为 `"preferred"`：

| 提供者  | 模型                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 人择的 | `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-sonnet-5`, `claude-mythos-5`, `claude-opus-4-8`                                                                                          |
| 深度搜索  | `deepseek-v4-pro`, `deepseek-v4-flash`                                                                                                                                                                 |
| 谷歌    | `gemini-4-argon`, `gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash` |
| 基米      | `k3`, `k3-256k`                                                                                                                                                                                        |
| 极小极大   | `MiniMax-M3`                                                                                                                                                                                           |
| 登月计划  | `kimi-k3`                                                                                                                                                                                              |
| 开放性    | `gpt-5.6`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.5-pro`                                                                                                                    |
| 小米    | `mimo-v2.6-pro`, `mimo-v2.6-flash`                                                                                                                                                                     |
| 在       | `glm-5.3`, `glm-5.2`, `glm-5.1`                                                                                                                                                                        |

`claude-haiku-4-5` 标记为 `"capable"`：它通过显式 `true` 代理或模型设置仍然可用，但 `"auto"` 不会使用它。

其他一切，包括所有 Ollama-served 本地模型，都保持未标记状态，并在 `"auto"` 下保持正常工具暴露。

### <a id="models-shipped-by-more-than-one-provider"></a> 由多个提供方同时提供的模型

若干供应商可通过多个 provider id 访问：例如订阅端点与 API 端点并存，或某个网关转售另一供应商的模型。由于 `"auto"` 会根据本次运行所使用的目录来解析层级，因此，描述同一上游模型的两个目录不能意外产生不一致。

因此，一旦任何同级行声明其层，共享模型的每个目录行都会明确声明其层。行与供应商自己的权重名称进行匹配，因此在命名空间 id 或不同大小写下重新发布模型的目录会自动匹配：`novita/moonshotai/kimi-k3`、`deepinfra/zai-org/GLM-5.2` 和 `together/zai-org/GLM-5.2` 全部与第一方行分组，无需任何人声明任何内容。只有真正不同的名称才需要清单的 `upstreamModel` 标记，正如 `kimi` 目录用于 `moonshot/kimi-k3` 的那样。

经销商和聚合商目录，例如 `baseten`、`deepinfra`、`github-copilot`、`gmi`、`novita`、`nvidia`、`ollama-cloud`、`opencode`、 `opencode-go`、`qianfan`、`together`、`venice` 和 `volcengine-plan` 当前为模型第一方目录标志 `"capable"` 声明 `"preferred"`：首选层来自对第一方端点的评估，并且这些运行尚未重复经销商。推动其中一项争议是一种经过深思熟虑、有证据支持的改变，而不是疏忽。

对于 OpenAI 模型，仅当运行解析为 OpenClaw 嵌入式代理运行时，该标志才重要。默认 OpenAI 布线使用 Codex-style harness曲面，其中 OpenClaw 代码模式不适用；目录标志永远不会改变路由决策。

### <a id="choosing-when-to-enable"></a> 何时选择启用

代码模式可以通过用一个紧凑的目录和一个程序替换重复的完整工具模式和中间模型转动来减少令牌的使用。结果取决于模型和工作负载。在广泛强制执行之前，比较代表性任务的正确性和完整的根加后代令牌的使用。

当代理在模型之间切换时使用 `"auto"`：首选模型获得紧凑的表面，而其他模型保持正常的工具暴露。当您验证未标记的模型在代码模式下表现良好时，请在精确模型条目上使用 `true`。对于每个提示令牌都进行计费或重新计算的开放权重或未缓存服务，更愿意为每个模型启用（通过 `"auto"` 或显式模型覆盖）而不是全局启用，因为令牌节省取决于实际使用程序表面的模型。

## <a id="activation"></a> 激活

在确定有效工具策略之后、组装最终模型请求之前，会进行代码模式评估：

1. 解析 agent、模型、provider、sandbox、channel、sender 和 run policy。
2. 构建有效的 OpenClaw 工具列表，添加符合条件的插件、MCP 和客户端工具。
3. 适用allow/deny政策。
4. 使用 [ 代理和模型优先级 ](/tools/code-mode/quickstart#override-one-model) 解决激活问题。如果是 `false` 或 `"auto"` 并且运行的模型不是目录首选，请继续正常工具曝光。
5. 如果已启用且该运行的工具处于活动状态，则保留必需的仅直连工具，并将每个目录中符合条件的有效工具注册到代码模式目录中。
6. 从模型可见列表中移除已编目工具；将 `exec` 和 `wait` 与保留的仅直连工具一并添加。

那些刻意不包含任何工具的运行（原始模型调用、`disableTools: true`，或空的 `tools.allow` 列表）不会激活代码模式表面，即使配置了 `tools.codeMode.enabled: true` 也是如此。代码模式和 OpenClaw 工具发现对同一次运行是互斥的；如果代码模式被激活，则不会发生工具发现压缩。

代码模式目录的作用域限定为该运行，绝不能泄漏来自其他 agent、session、sender 或 run 的工具。
