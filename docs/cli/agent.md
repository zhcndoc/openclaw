---
summary: "由 Gateway 驱动的 `openclaw agent` 回合，以及隔离的 `agent exec` 运行的 CLI 参考"
read_when:
  - "你想从脚本中运行一次 agent 回合（可选择发送回复）"
  - "你需要为 CI 执行严格的一次性临时 agent 运行"
title: "代理"
---

# `openclaw agent`

通过网关运行一个代理。显式 `--local` 标志和 `agent exec` 是嵌入式执行路径。

网关支持的轮次是操作员输入。携带 `OPENCLAW_SHELL=exec` 的代理 `exec` 子进程不能使用此命令向另一个会话报告；请改用其属性会话工具或正常的子代理完成。这不会改变操作员终端的使用或单独的嵌入式执行路径。

传递至少一个会话选择器：`--to`、`--session-key`、`--session-id` 或 `--agent`。即使另一个选择器提供了有效的目标，在本地或网关调度之前，显式空白或仅包含空白的选择器值也会被拒绝。省略未使用的选择器而不是传递空值。

当 `--session-id` 在代理的存储分区中找到现有会话时，即使 `session.store` 使用一个固定的 JSON 定位器并且存储的密钥是​​ `global` 或 `unknown`，它也会保留该代理。

对于网关支持的轮次，网关会解析 `--session-id`，包括当它与 CLI 在同一台计算机上运行时。 CLI 在发送请求之前不会读取会话元数据。如果 ID 不存在，网关将在所选代理下创建可恢复会话。这需要网关广告命名会话创建支持；在使用此 CLI 的 `--session-id` 之前更新并重新启动较旧的网关。 CLI 在发送回合之前检查支持。

完成转弯后退出 `0`。写入任何文本或 JSON 结果后，错误、超时和取消结果退出 `1`。接收到的 `SIGINT` 或 `SIGTERM` 相反会保留下述信号特定的退出状态。

相关内容：[Agent 发送工具](/tools/agent-send)。

## `agent exec`

`openclaw agent exec` 运行一次嵌入式 agent 回合，无需连接 Gateway。它是 CI 和编码自动化推荐的无头入口，因为它负责设置、清理、输出投影以及进程状态。

```bash
openclaw agent exec "Run the focused tests and fix failures"
openclaw agent exec --message-file task.md --cwd ./repo
cat task.md | openclaw agent exec --message-file - --json
```

默认情况下，该命令创建一个临时状态目录，并在确认清理后将其删除，包括接受的数据库工作和运行的数据库资源。它针对您的普通 OpenClaw 配置运行，因此配置的提供程序、凭据和 `agentRuntime` harness选择应用与在其他地方完全相同。 `--cwd` 默认为进程工作目录，并作为代理工作区和工具工作目录传递。

配置完全在内存中分层：exec 组成运行配置并将其发布为该进程的运行时配置，而不是将副本写入磁盘。 Exec 默认值仅适用于您的配置未设置设置的情况：代理沙箱关闭，选择 `coding` 工具配置文件，文件系统工具仅限于 `--cwd`，并且 exec 在无头转向所需的完整执行策略下运行。您的配置设置的任何内容都会胜过这些默认设置，因此配置的沙箱、shell 环境或工具配置文件永远不会降级，并且当您的配置启用沙箱时，exec 主机路由仍保留在沙箱中。调用本身总是最后获胜：运行的范围为 `--cwd` 并设置 `skipBootstrap: true` 以防止创建工作区引导文件。

在 Codex 运行时中，`agent exec` 使用 OpenClaw 的 shell 和文件系统工具而不是 Codex-native 执行，从而使工具清理工作由一次性运行的所有者负责。普通网关支持的 Codex 转弯保留其原生工具表面。

默认情况下仍会注入现有工作区文件（例如 `AGENTS.md`）。对于必须忽略此自动上下文的嵌入式运行时运行，请在固定配置中设置 `agents.defaults.contextInjection: "never"`，除非每个代理都覆盖。这控制注入，而不是通过工具访问文件；请参阅 [Workspace 和 bootstrap](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.contextinjection)。

当您的工具策略启用 `browser` 时，本地浏览器控制无需网关即可工作。显式网关或节点路由和沙箱限制仍然适用；参见[节点浏览器代理](/tools/browser/remote#node-browser-proxy-zero-config-default)。

使用 `--state-dir <dir>` 保留会话和其他运行状态。该目录必须已经存在，且命令绝不会创建或删除它。保留的状态目录要求独占所有权：当 Gateway 或其他嵌入式写入器拥有该目录时，exec 会拒绝启动，然后在整个运行期间持有状态锁。省略 `--state-dir` 可使用隔离的临时状态，或者先使用 `openclaw gateway stop` 停止 Gateway。

当 exec 使用环境配置或固定配置时，已安装插件仍会从操作员普通的插件根目录解析；而会话及其他运行状态则使用临时目录。在这些模式下，`--state-dir` 仅控制运行状态；对于由已安装插件提供的已配置提供商、频道或 harness，不要求设置该参数。

如需可复现的运行，请固定配置，而不是继承环境配置。`--config <path>` 会严格使用指定配置文件运行，并通过常规加载器读取，因此 JSON5 语法和 `$include` 会相对于该文件解析；缺失或无效的文件会导致运行失败，而不会回退到默认值。如果环境配置存在但无法解析，也同样会导致运行失败。`--isolated` 会完全忽略环境配置，只使用上述 exec 默认值。在 CI 中，这两种方式都是正确选择，因为继承操作员状态会使运行结果依赖机器环境。

使用 `--config-override '<JSON object>'` 更改一次运行的选定设置，同时继承其他所有内容：

```bash
openclaw agent exec "Inspect this repository" \
  --config-override '{"tools":{"deny":["exec"]}}'
```

加载普通、`--config` 或 `--isolated` 基础后会进行覆盖。嵌套对象合并；数组和标量值替换以前的值，包括空数组。重复该标志以按顺序应用覆盖。生成的配置经过验证并且从未保存。每个代理设置保留其正常优先级高于代理默认值；目标 `agents.entries.<id>` 更改一个代理的设置。显式运行标志（例如 `--model`、`--thinking` 和 `--code-mode`）以及命令的 workspace/state 绑定仍然胜过配置值。 `--config` 保留其替代文件含义。

覆盖使用 JSON 语法和正常运行时规范化，包括 `~` 路径。文件包含和登录外壳导入属于所选基础的加载程序。覆盖的 `env` 变量适用于运行，保留现有的进程环境优先级，并在清理期间恢复。

默认情况下使用存储的凭据，因此文件夹范围的运行会达到与 CLI 的其余部分相同的登录名。传递 `--auth-env-only` 将运行限制为流程环境中已存在的提供程序密钥。该模式根本不加载任何配置，并且将其与 `--config` 或 `--config-override` 配对会被拒绝而不是默默地忽略，因为配置会同时通过多个表面提供提供者凭据：[inline 密钥和秘密标头](/reference/secretref-credential-surface)、`env` 块和登录 shell 导入。它还会跳过 OpenClaw 身份验证配置文件和外部 Codex、Claude 或其他 CLI 凭证存储。提供程序身份验证变量仍然可用于模型身份验证，但在代理启动的主机命令中被省略。

在没有 Codex 插件的全新安装中，OpenAI API-key 运行使用内置的 OpenClaw 运行时。隐式 Codex 首选项不需要在 `--auth-env-only` 运行之前安装本机harness。显式配置的 Codex 运行时或现有的 Codex 会话引脚仍然需要该工具。

使用可重复标志来选择主模型和有序回退链：

```bash
openclaw agent exec "Implement the change" \
  --model openai/gpt-6-astra \
  --fallback anthropic/claude-sonnet-4-6 \
  --fallback google/gemini-3.1-pro-preview
```

仅对该命令而言，显式的 `--fallback` 值在显式 `--model` 存在时仍然保持生效。其他 agent 入口点仍沿用其既有规则：用户选择的模型会禁用已配置的回退。

比较本地模型或较小模型时，请显式选择一次性工具界面：

```bash
openclaw agent exec "Inspect this repository" \
  --model ollama/qwen3.5:9b \
  --code-mode code \
  --local-model-lean \
  --json
```

`--code-mode direct` 禁用代码模式，`auto` 使用模型功能元数据，`code` 强制使用通用代码模式表面以支持工具运行。 `--local-model-lean` 删除了高延迟和通道相关的工具，并为隔离运行启用了有限的工具搜索默认值。它的工具搜索目录列出了名称和所有者，但没有描述；完整的描述仍然可以搜索。该标志保留普通的系统指令、技能和工作空间上下文。

对于 `agent exec`，每次模型尝试的超时默认为 600 秒，每个配置的回退都有新的预算；这不会更改现有的嵌入式 `agent --local` 默认值。成功运行退出 `0`，任何模型或结果错误退出 `1`，超时退出 `2`。故障包括 `meta.error`、中止运行、耗尽模型回退、错误停止原因以及任何错误负载。

如果在运行错误或超时后清理失败，则保留原始结果和退出代码，并在 stderr 上报告清理失败。成功运行后的清理失败将退出 `1`，但保留完整的最终文本、有效负载和运行元数据。 JSON 信封报告 `error.kind: "cleanup"`，以便调用者可以区分已完成的清理失败的工作和失败的任务。

不确定的运行时清理会保留临时状态以供检查，并保留任何获取的状态锁定，直到该进程退出。在针对保留状态重试运行之前检查报告的清理失败。

普通输出只会将最终 assistant 文本写入 stdout。诊断信息使用 stderr。`--json` 会为 stdout 预留以下稳定封装：

```json
{
  "ok": true,
  "status": "ok",
  "final": "The focused tests pass.",
  "payloads": [{ "text": "The focused tests pass." }],
  "usage": { "input": 120, "output": 8, "total": 128 },
  "costUsd": 0.0021,
  "codeModeEngaged": false,
  "assistantTurns": 2,
  "bridgeCalls": { "search": 1, "describe": 0, "call": 3 },
  "toolSummary": { "calls": 2, "tools": ["read", "write"], "totalToolTimeMs": 48 },
  "model": "gpt-6-astra",
  "provider": "openai",
  "sessionId": "019..."
}
```

`status` 为 `ok`、`error` 或 `timeout`。`usage` 在不可用时会被省略。失败的封装会增加 `error: { message, kind }`；当失败发生在模型选择之前时，`model` 和 `provider` 为 `null`。

运行统计字段是可累加的，并且可能缺失：

- `costUsd`：记录的每次调用 USD 成本总和，保留请求定价层和重试模型价格，包括缓存 reads/writes. 当每次调用成本不完整时，仅提供统一价格估算；分层估算被省略，而不是作为一项请求对组合使用进行定价。当无法获得成本时省略。
- `codeModeEngaged`: 仅当 [code mode](/tools/code-mode) 在本次运行中实际接管模型工具界面时才为 `true`。仅设置 `tools.codeMode.enabled=true` 并不能保证其启用；而由 harness 接管其原生工具界面的情况下，该值始终为 `false`，因为 OpenClaw code mode 不会接管这些工具。
- `assistantTurns`：运行中完成assistant/provider往返；当没有完成时省略。
- `bridgeCalls`：内部工具-search/code-mode桥接调用计数（`search`/`describe`/`call`）。这些对于提供商来说是不可见的；外部工具调用保留在完整运行元数据的 `meta.toolSummary.calls` 中。
- `toolSummary`: 嵌入式运行中外部模型可见的工具调用次数、工具名称、失败次数以及工具总耗时。

代理运行统计字段出现在 `openclaw agent --json` 响应中的 `meta.agentMeta` 上；外部工具摘要保留在 `meta.toolSummary`。

### <a id="code-mode-model-matrix"></a> Code Mode 模型矩阵

在源代码检出目录中，针对任意显式模型引用运行有界评估矩阵：

```bash
pnpm qa:code-mode-models -- --model ollama/qwen3.5:9b
```

重复 `--model` 比较模型，或使用 `--mode`、`--task` 和 `--repetitions` 缩小选择范围。基本任务和文件工作流任务通过独立的 `agent exec` 调用运行；下面的网关任务使用一次性网关并显式选择 OpenClaw 代理运行时。每个单元记录 model/provider 身份、计时、结果状态、故障类别、工具活动和特定于任务的正确性检查。

默认保留两个任务（`read` 和 `dependent-read-write`）、三种模式和三种重复：每个模型 18 个单元。扩展任务是可选的，因此默认的模型调用预算不会增加：

| 任务                         | Oracle 的工作负载和正确性                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read`                       | 读取验证码并准确返回。                                                                                                                                                        |
| `dependent-read-write`       | 读取、写入和读回代码；验证最终答案和输出文件。                                                                                                                            |
| `large-result-reduction`     | 使用单独的规则文件从大于 64 KiB 的有界 JSONL 文件中过滤 512 个订单，然后计算计数和整数总计。需要处理读取分页而不是回显大输入。 |
| `parallel-independent-reads` | 读取三个独立文件，请求支持的并行调用，并按指定顺序而不是完成顺序组合它们的值。                                                       |
| `dependent-chain`            | 遵循从 `start.json` 到有效负载的两个文件路径引用，在选择下一个路径之前等待每个依赖项。                                                                                 |

上述三个文件工作流任务需要准确的最终答案并匹配 `result.txt`。对于给定的重复，models/modes 的输入是固定且相同的。提示请求文件工具和回读，但预言机验证结果和聚合工具执行，而不是完整的调用跟踪：它无法证明分页策略、实际并发性、依赖顺序或回读。这些需要单独的 runtime/trajectory 证明。

预览六单元 direct/Code 模式比较，无需构建或调用任何模型：

```bash
pnpm qa:code-mode-models -- --model ollama/qwen3.5:9b \
  --mode direct --mode code --repetitions 1 \
  --task large-result-reduction --task parallel-independent-reads \
  --task dependent-chain --dry-run
```

仅针对明确预期的模型运行删除 `--dry-run`；提供商可能会收取费用。演练写入计划并清空 QA 证据，而不传递任务结果。离线harness覆盖范围与 `pnpm test extensions/qa-lab/src/code-mode-model-matrix.test.ts` 一起运行，并使用合成的 CLI，无需提供商调用；它不是实时代码模式性能证据。

输出目录包含标准 QA Lab `qa-evidence.json`。 `summary.json` 和 `results.jsonl` 支持聚合和每单元工件； `manifest.json` 记录请求的矩阵和源标识。

每个汇总组保留通过率、第一-pass/eventual 成功、失败类别和`p50WallMs`。其附加 `metrics` 对象汇总了辅助转弯、外部工具调用、桥接 search/describe/tool 调用，并将 USD 成本报告为 `{ samples, total, p50 }`。仅当前包络值才算作样本；缺失遥测不为零（`total` 和 `p50` 为空，没有样本）。观察到的零仍然为零。中位数使用中上样本进行偶数计数，与现有的墙上时间摘要相匹配。所有重复，包括遥测失败的重复，都会有所贡献。

对于返回代理信封的单元，`elapsedMs` 在夹具准备后测量代理过程和效果验证。利用错误单元来代替对尝试的单元进行计时，包括异常之前的任何设置。两者都不包括矩阵构建，也不包括仅来宾执行时间。该harness不会报告不可观察的阶段时序、重叠、减速比或推断的加速。比较 timing/counts 之前的正确性，检查缺失样本计数，并在提供时保留原始的每单元 `usage`/`costUsd`/`bridgeCalls`。

这些只是评估证据，不是 CI 或发布门禁。结果不会改变模型能力、运行时路由、回退机制或修复策略。

#### <a id="paired-performance-workloads"></a> 配对性能工作负载

这些选择加入的工作负载将代码模式与正常的 OpenClaw 工具暴露进行比较。 `--mode direct` 明确禁用代码模式并保留正常的工具搜索； `--mode code` 启用它。两只手臂使用相同的提示、种子输入、允许的工具、模型和思维设置。他们拒绝 `--mode auto`，固定 OpenClaw 运行时，禁用快速模式，并跳过后续采访。 OpenAI 模型在此使用 OpenClaw，而不是其本机代理harness。

绩效选择需要两个治疗组，并且不能与仅代码面试任务混合。每波之后都会重新构建已构建的工件；漂移会停止接纳并保留比较，同时保留观察结果。

| 任务                        | 工作量和检查                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repo-invoice-repair`       | 修复十进制解析和发票聚合、添加回归覆盖率、运行测试并生成摘要。保留的 CLI 输入验证提交的源。 |
| `invoice-reconciliation`    | 遍历发票页面并根据提供的对账政策准确编写 JSON 和 CSV 可交付成果。                                                     |
| `batch-settlement-recovery` | 处理短暂且不确定的结算结果；验证一次性效果和最终报告。                                                        |
| `fanout-dependency`         | 协调七个真实收集器子项，具有三个子项运行限制、相关 reconciliation/audit 阶段和不可用的源。                 |

针对干净的、已构建的运行时预览八个单元：

```bash
pnpm qa:code-mode-models -- --model openai/gpt-5.6-sol \
  --mode direct --mode code --executor node --repetitions 1 \
  --task repo-invoice-repair --task invoice-reconciliation \
  --task batch-settlement-recovery --task fanout-dependency \
  --thinking low --timeout 600 --concurrency 2 \
  --max-cells 8 --max-tokens 1000000 \
  --max-known-cost-usd 25 --max-wall-seconds 3600 \
  --runtime-dir ../frozen-runtime \
  --output-dir artifacts/code-mode/paired-preview --dry-run
```

以下冻结运行时要求适用。使用新的输出目录进行实时运行。 `--keep-state`保留一次性工作空间和状态以供检查；运行程序还使用哈希值捕获每个工作负载的命名可交付成果。

默认时间表在两对之间交替启动臂。 `--schedule` 接受 `{model, task, repetition, firstMode}` 条目的 JSON 数组，其中 `firstMode` 是 `direct` 或 `code`。条目必须与所选库存匹配并且需要两种模式。保持时间表固定以便进行比较。 `--concurrency` 限制根细胞，而不是后代。极限允许完整的成对波；代币、已知成本和墙限制会在承认的工作完成时阻止新的浪潮。缺少使用量或价格会使观察到的总数下限，因此这些不是硬性支出上限。未启动的单元格在明细表和摘要中仍然可见。

`mode-comparison.json` 按模型、任务、种子、source/build、prompt/fixture 指纹和设置对结果进行配对。每个单元的记帐包括父级和子级输入、缓存 reads/writes 和输出，并与运行时总计进行协调。缺少的使用量或价格仍然不可用，永远不会为零。失败的尝试仍保留在操作总数中。成功的配对三角洲需要双臂通过并完成测量；观察到的错误计数包括有意检查，而不是修复次数。任务延迟不包括启动和面试。

自动完成意味着 artifact/effect 检查已通过。最终响应的准确性和执行完整性需要针对保留的记录、命令、收据和文件进行单独裁决。正确的工件可能伴随着错误的测试声明。临时工作区和文件工具限制不会隔离广泛的 shell 访问：从独立功能和效率比较中排除重用同级解决方案或基准答案的运行。扇出检查证明依赖性完成并强制执行并发限制；它们并不能证明每次独立发布都先于收藏。检查编排跟踪并测量该调度声明的子并发性。在汇总节省之前报告正确性、缺失和排除情况；所选的工作负载组合不会建立通用的令牌、成本或速度增益。

#### <a id="gateway-tasks-and-follow-up-interviews"></a> 网关任务和后续采访

相同的矩阵可以使用一次性构建的网关，然后在新一轮的相同对话中采访代理。这些任务是选择性加入的，并且需要 `--mode code`。网关任务支持具有相应提供者凭据的显式 Anthropic、Google 或 OpenAI 模型引用。上面的默认矩阵没有改变。

| 任务                      | 独立行为检查                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invoices-auto-retention` | 返回一个超大的不熟悉的导出，然后根据其在后面的单元格中自动保留的引用进行计算，并使用一次获取和有界模型可见数据。该提示不会要求代理保存它。 |
| `inventory-join`          | 解决跨嵌套、异构库存和供应商数据的自然再订购汇总请求，包括缺少数量和不可用的价格。                                                        |
| `automation-contracts`    | 使用工具声明为已禁用作业的 create/read/update/history/delete 流程编写 JavaScript，然后验证预先存在的作业是否保持不变。                                             |
| `process-contracts`       | 启动一个提供的有限助手，通过 JavaScript 在其声明的指导下使用真实的处理工具，并验证其输出和成功退出。                                                      |
| `partial-failure`         | 合成工具在返回格式错误的声明输出之前记录效果。验证一次调度、有用的验证详细信息以及随后读取的实际状态。                                         |
| `javascript-contracts`    | 读取类型化工具声明，捕获并报告无效的读取参数，然后使用 JavaScript 读取、写入和读回验证码。                                                                |

首先建立干净的基线和候选人结帐。两者使用相同的工具、模型、提示、固定装置、思维设置、超时和重复：

```bash
pnpm qa:code-mode-models -- --model openai/gpt-5.6-luna --mode code \
  --task invoices-auto-retention --task inventory-join --repetitions 1 \
  --thinking low --runtime-dir ../baseline \
  --output-dir artifacts/code-mode/baseline --allow-failures

pnpm qa:code-mode-models -- --model openai/gpt-5.6-luna --mode code \
  --task invoices-auto-retention --task inventory-join --repetitions 1 \
  --thinking low --runtime-dir ../candidate \
  --output-dir artifacts/code-mode/candidate \
  --baseline-results artifacts/code-mode/baseline/results.jsonl --allow-failures
```

`--runtime-dir` 使用现有的构建工件而无需重建。它需要干净的提交签出以及与提交匹配的构建标记并记录干净的构建输入。在使用具有来源能力的邮票编写器进行修订时，在干净的结帐中运行 `pnpm build` 以刷新陈旧或较旧的邮票。没有这些作者的历史修订作为冻结运行时不受支持；仅靠重建它们并不能增加这个来源。该矩阵记录源和工件哈希值，并在配对单元或其工作负载指纹不同时拒绝比较。为另一个模型添加 `--model` 并重复任务选择器以包含更多场景。失败的试验仍保留在结果中； `--allow-failures` 仅更改命令的退出状态。

每个网关都拥有临时主目录、状态、工作空间、配置和一个空闲的环回端口。该进程仅接收其选择的提供程序密钥和所需的主机路径。 Synthetic插件工具实现夹具导出和突变接收；自动化和流程操作使用真正的内置功能。不使用运营商网关、存储的运营商凭证、真实通道和真实设备。每个场景仅公开其所需的工具。在任何付费模型调用之前，Gateway 目录预检会检查灯具的可用性；缺失的功能是harness故障，而不是失败的模型任务。

每个单元的工件包括实际的 task/interview 转录本、工具效果收据、检查和经过净化的诊断。面试前捕获任务收据；单独的任务和面试收据文件将边界与完整的分类账一起保留。进程助手的确切写入源字节是其工作负载指纹的一部分。 JavaScript合约任务验证声明发现、运行时输入验证和依赖文件操作顺序，包括通过`wait`完成。预览完整性检查使用观察到的元数据来检查引用；丢失或冲突的元数据仍然未知。除非明确要求发布，否则请将成绩单保存在本地。有关样本覆盖范围、新鲜度、寿命、限制和重试安全性的访谈声明必须根据这些记录进行审查：仅靠结构化答案并不能建立理解。先前的结果参考在实际观察时在新的承认的采访中进行测试；它不能成为持久的对话状态。

网关行将启动、任务和面试时间分开。他们的普通 `assistantTurns`、`usage` 和 `costUsd` 描述了该任务；面试测量是分开的。缺少成本或使用量仍然不可用。摘要和比较输出还将观察到的任务行为检查与访谈一致性检查分开；两者都不能取代面试的人工评估。最初的整体通过标志和比较增量仍然需要完全成功。当配对任务行为检查都通过并且验证了请求的模型身份时，`taskBehavior.deltas` 报告仅任务差异，即使采访具有不一致的标志。丢失的痕迹或检查结果仍然不可用，并且所有原始故障都被保留。这些是观察结果，而不是统计速度保证。

### <a id="agent-exec-options"></a> `agent exec` 选项

- `[message]`: 位置参数形式的提示文本
- `--message-file <path>`: 从文件读取 UTF-8 提示；`-` 表示读取 stdin
- `--cwd <dir>`: 同时设置 agent 工作区和工具工作目录
- `--state-dir <dir>`: 使用现有状态目录，且不删除它
- `--config <path>`: 使用该配置文件而不是环境配置运行（支持 JSON5 和 `$include`）
- `--isolated`: 忽略环境配置，仅使用 exec 默认值
- `--model <provider/model>`: 显式指定主模型
- `--code-mode <mode>`: 选择 `direct`、`auto` 或强制使用 `code` 工具模式
- `--local-model-lean`: 使用精简的本地模型工具界面
- `--thinking <level>`: 本次运行的思考级别
- `--fallback <provider/model>`: 有序回退模型；可重复使用，且要求同时指定 `--model`
- `--auth-env-only`: 仅使用环境中的提供商密钥；跳过已存储凭据、外部 CLI 凭据以及配置
- `--no-auth-env-only`: 允许使用已存储凭据和外部 CLI 凭据（默认）
- `--timeout <seconds>`: 以秒为单位的截止时间（默认 `600`；`0` 表示禁用）
- `--json`: 输出稳定的 JSON 封装。

## <a id="options"></a> 选项

- `-m, --message <text>`：消息正文
- `--message-file <path>`：从 UTF-8 文件中读取消息正文
- `-t, --to <dest>`：用于推导会话密钥的收件人
- `--session-key <key>`：用于路由的显式会话密钥
- `--session-id <id>`：显式会话 ID
- `--agent <id>`：代理id；覆盖路由绑定
- `--model <id>`：本次运行的模型覆盖（`provider/model` 或模型 ID）
- `--thinking <level>`：代理思维级别（`off`、`minimal`、`low`、`medium`、`high`，加上provider/runtime-supported级别如`xhigh`， `adaptive`、`max` 或 `ultra`）
- `--verbose <on|off>`：为该会话持久化详细日志级别
- `--channel <channel>`：传递通道；省略则使用主会话通道
- `--reply-to <target>`：传递目标覆盖项
- `--reply-channel <channel>`：传递通道覆盖项
- `--reply-account <id>`：传递账户覆盖项
- `--local`：直接运行嵌入式代理（在插件注册表预加载之后）
- `--deliver`：将回复发送回选定的channel/target
- `--timeout <seconds>`：覆盖每次模型尝试的执行预算（默认600，或`agents.defaults.timeoutSeconds`）；每个配置的后备都会获得新的预算，并且 `0` 会禁用尝试截止时间。网关客户端在回退尝试中等待运行的最终结果，取消和连接失败仍然适用。 600 秒默认值属于此 CLI 命令，而不是普通网关轮次，其默认值为每次尝试 48 小时。
- `--json`：输出JSON

模型切换保留了会话所要求的思维水平。如果所选模型无法支持继承的级别，则运行将使用支持的级别并打印限制通知。 JSON 输出包括 `result.meta.requestShaping.thinking` 中的有效级别和 `thinkingClamp` 中的通知（`meta` 位于 `--local` 的顶层）。当您切换回支持模型时，保存的首选项仍然可用。

使用 OpenClaw 的托管代理循环的网关命令在可选的内存刷新和压缩之前返回其完成的答复。该工作有其自己的会话所有者并使用该命令的剩余时间。同一会话中的新一轮会在开始推理之前取消并解决它。一次性 `--local` 命令跳过可选的转弯后工作；在该循环中的推理之前，仍然会发生所需的检查点和压缩。通用 CLI 后端在命令返回之前保留其现有的主机压缩；本机后端保留自己的压缩策略。取消、重新启动和会话所有权更改继续阻碍活跃的写入者。

## <a id="examples"></a> 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --message-file ./task.md
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## <a id="notes"></a> 说明

- 必须在 `--message` 和 `--message-file` 中恰好选择一个。`--message-file` 会去除开头的 UTF-8 BOM 并保留多行内容；对于不是有效 UTF-8 的文件会拒绝处理。大于 4 MiB 的文件会在分发前被拒绝。
- `--message` 不运行通道斜杠命令调度程序。公认的 `$skill-name` 引用和领先的 `/skill-name [input]` 是范围内的例外：OpenClaw 将它们扩展为模型指令，以便在操作之前阅读技能。其他带有斜杠前缀的消息保持正常的代理轮流行为； `/compact` 被拒绝，指针指向 `openclaw sessions compact <key>`。
- `--local` 运行是一次性的：缓存的提供程序连接、捆绑的 MCP 环回资源以及为运行打开的热 Claude stdio 会话在回复后将停用，因此脚本化调用不会使套接字或本地子进程保持运行状态。网关支持的运行将网关拥有的资源保留在正在运行的网关进程下。
- `--local` 要求对配置的状态目录拥有独占所有权。当 Gateway 或其他 `agent --local` 运行拥有该目录时，它会拒绝启动，并在整个嵌入式回合期间持有相同的状态锁。不使用 `--local` 以使用活动中的 Gateway，或先使用 `openclaw gateway stop` 停止它。
- 使用 `--local` 进行独立嵌入式执行时，如果重启恢复处于待处理状态，则拒绝复用现有主会话。请通过运行正常的 Gateway 执行该回合，或在 Gateway 中使用 `/new` 或 `/reset` 重置；独立的嵌入式进程无法与 Gateway 扫描器安全地协调恢复所有者。
- 将 `--agent`、`--channel` 和 `--to` 组合在一起，会话路由将遵循通道的已解析收件人和 `session.dmScope`。具有稳定的仅出站接收者身份的通道使用与代理的主会话隔离的提供商拥有的会话。 `--reply-channel` 和 `--reply-account` 仅影响交货。
- `--session-key` 选择显式会话密钥。代理前缀密钥必须使用 `agent:<agent-id>:<session-key>`，并且 `--agent` 必须与密钥的代理 ID 匹配（当两者都给出时）。裸露的非哨兵密钥在提供时范围为 `--agent`，否则为配置的默认代理；例如，`--agent ops --session-key incident-42` 路由到 `agent:ops:incident-42`。仅当未提供 `--agent` 时，文字键 `global` 和 `unknown` 才保持无作用域。
- `--json` 会将 stdout 专用于 JSON 响应；Gateway、插件和 `--local` 的诊断信息会输出到 stderr，以便脚本直接解析 stdout。
- 如果排队的输入在轮次开始之前达到 `--timeout`，则网关将其撤回。已确认的提款将返回 `reason: "input_withdrawn_before_turn"` 和 `pendingInputId` 并具有非零退出状态。输入未交付；提高 `--timeout` 并重试。这与传输超时不同，传输超时的结果仍然未知。
- 瞬时握手重试次数用尽后，网关超时或关闭连接使命令失败； CLI 永远不会默默地重新运行嵌入的回合。传输丢失是不明确的 - 网关可能已接受并且仍可能完成转弯 - 因此 stderr 提示表示在重试或使用 `--local` 重新运行之前检查 `openclaw gateway status` 和会话记录，以避免执行两次转弯。当网关在传输错误之前接受运行时，提示将接受的运行命名为 ID，并且 `--json` 失败将保留标准 `ok: false` 信封，其中包含 `runId` 和 `origin: "gateway"` 字段以及 `error.type`/`error.message`.
- `SIGTERM`/`SIGINT` 中断正在等待的网关支持的请求；如果网关已接受运行，则 CLI 还会在退出之前发送该运行 ID 的 `chat.abort`。 `--local` 运行时接收相同信号，但不发送 `chat.abort`。在 Unix 上，启动包装器保留运行时子进程的实际终止信号，包括关闭升级后的 `SIGKILL`； shell 将 `SIGINT` 和 `SIGTERM` 报告为状态 130 和 143。显式数字返回保持数字状态，包括返回 `0` 的已处理关闭。 Windows 保留其数字终止行为。如果内部 run-dedup 密钥已在此会话中进行活动运行，则响应会报告 `status: "in_flight"`，并且非 JSON CLI 将打印 stderr 诊断而不是空回复。对于外部 cron/systemd 包装器，请保留硬终止逆止器（例如 `timeout -k 60 600 openclaw agent ...`），以便主管可以在关闭无法排空的情况下收获该进程。
- 当此命令触发 `models.json` 重新生成时，由 SecretRef 管理的提供商凭据会以非秘密标记的形式持久化（例如环境变量名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），绝不会保存解析后的明文密钥。标记写入来自活动源配置快照，而不是解析后的运行时密钥值。

## <a id="json-failures"></a> JSON 故障

失败保留[CLI错误包络](/cli#json-failures)：`ok: false`和`error.type: "cli_error"`。当网关返回运行 ID 时，信封还包括顶级 `runId` 和 `origin: "gateway"`。这包括缓存的最终错误而没有新的接受响应，以及接受后超时或连接丢失。

`origin` 标识运行的网关所有权；它并不能证明运行失败或停止。传输丢失后，请在重试之前检查会话记录。省略出处意味着 CLI 没有观察到网关运行标识，而不是没有发生运行。没有网关运行 ID 的本地错误和拒绝会忽略这些字段。本地生成的请求密钥本身并不是网关的来源。

## <a id="json-delivery-status"></a> JSON 投递状态

使用 `--json --deliver` 时，CLI 的 JSON 响应会包含顶层 `deliveryStatus`，这样脚本就可以区分已投递、已抑制、部分失败和失败的发送：

```json
{
  "payloads": [{ "text": "Report ready", "mediaUrl": null }],
  "meta": { "durationMs": 1200 },
  "deliveryStatus": {
    "requested": true,
    "attempted": true,
    "status": "sent",
    "succeeded": true,
    "resultCount": 1
  }
}
```

由 Gateway 支持的 CLI 响应还会在 `result.deliveryStatus` 中保留原始的 Gateway 结果结构。

`deliveryStatus.status` 的取值之一是：

| 状态           | 含义                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `sent`           | 投递完成。                                                                                                                        |
| `suppressed`     | 投递被有意不发送（例如消息发送 hook 取消了它，或者没有可见结果）。终态，不会重试。 |
| `partial_failed` | 至少有一个 payload 已发送，但后续某个 payload 失败了。                                                                                   |
| `failed`         | 没有完成任何持久化发送，或者投递预检失败。                                                                                   |

常见字段：

- `requested`：当该对象存在时始终为 `true`。
- `attempted`：一旦持久化发送路径运行则为 `true`；对于预检失败或没有可见 payload 的情况为 `false`。
- `succeeded`：`true`、`false` 或 `"partial"`；`"partial"` 与 `status: "partial_failed"` 配对。
- `reason`：来自持久化投递或预检校验的、小写蛇形命名原因。已知值包括 `cancelled_by_message_sending_hook`、`no_visible_payload`、`no_visible_result`、`channel_resolved_to_internal`、`unknown_channel`、`invalid_delivery_target` 和 `no_delivery_target`；失败的持久化发送也可能报告失败阶段。由于集合可能扩展，请将未知值视为不透明值。
- `resultCount`：可用时，通道发送结果的数量。
- `sentBeforeError`：当部分失败在出错前至少发送了一个 payload 时为 `true`。
- `error`：对于失败或部分失败的发送为 `true`。
- `errorMessage`：仅在捕获到底层投递错误消息时存在。预检失败会带有 `error`/`reason`，但没有 `errorMessage`。
- `payloadOutcomes`：可选的逐 payload 结果，包含 `index`、`status`、`reason`、`resultCount`、`error`、`stage`、`sentBeforeError`，或者在可用时包含 hook 元数据。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [代理运行时](/concepts/agent)
