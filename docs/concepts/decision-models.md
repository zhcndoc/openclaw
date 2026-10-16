---
summary: "选择决策模型并定义类型选择、分数和布尔判断"
title: "决策模型"
read_when:
  - "在聊天、实用程序或决策模型之间进行选择"
  - "定义分类或评分标准"
  - "调用或实现决策模型插件API"
---

# <a id="decision-models"></a> 决策模型

**决策模型** 根据评分标准评估提供的证据并返回键入的答案：选择、分数或布尔概率。使用它进行有界判断，例如路由请求、对其紧急程度进行评分或检查它是否满足条件。

`decisionModel` 是具有共享 API 的模型角色。其提供者可以使用不同的模型架构和推理后端。共享接口并不会使它们的推理能力或概率可以互换。

该角色和 TypeSafe AI 适配器是在发布 OpenClaw `2026.9.5` 后添加的。这些说明适用于包含这些功能的开发检查以及包含这些功能的后续版本。请参阅每个提供商的设置页面以了解其主机要求。

| 角色            | 典型工作                                             | 结果                                  |
| --------------- | -------------------------------------------------------- | --------------------------------------- |
| 主要模型   | 对话和代理工作                              | 消息和工具调用                 |
| `utilityModel`  | 简短的语言任务，例如标题和摘要        | 生成的文本                          |
| `decisionModel` | 分类、评分标准和谓词评估 | 输入答案和概率估计 |

决策模型在 Control UI 中有一个单独的 **Decision** 选择器。选择选择提供者进行明确评估并支持消费者。核心 `decision_evaluate` 工具遵循该选择加上普通工具策略。选择不会启动后台工作或替换聊天模型。自动实验消费者还需要明确的 [ 决策辅助选择加入 ](/concepts/experimental-features#decision-assistance)。内置的 OpenClaw 运行时使用该选择来通过有限的最近对话进行对话工具过滤。选定的决策提供者收到次要证据；请参阅 [ 隐私和后备合约 ](/concepts/experimental-features#conversational-tool-filtering)。显式 `decision_evaluate` 仍然独立于实验室。

## <a id="choose-a-provider-and-model"></a> 选择提供商和模型

在选择模型之前配置提供者插件：

- [ONNX](/plugins/onnx) 在持久子进程中运行本地 CPU 分类器。遵循其开发检查或兼容包设置，然后显式下载模型或准备本地导出。推理不需要托管 API 凭证。
- [OpenAI](/providers/openai#decision-models) 使用捆绑的 `openai` 插件和 OpenAI 平台决策 API。配置OpenAI API密钥； ChatGPT/Codex 订阅凭证未授权此端点。评估将提供的证据发送至OpenAI，并产生平台使用费。
- [TypeSafe AI](/plugins/typesafe) 连接到托管 Jev 或自托管 System One 服务器（例如 Kev）。安装并启用外部插件，然后配置受保护的托管凭证、现有环回设置或 [ 标准模型提供者端点 ](/plugins/typesafe#custom-endpoint-and-provider-request-settings) 到 `models.providers.typesafe`。评估将用户内容发送到该端点；托管呼叫产生 TypeSafe 的正常费用。 Kev 选择 `typesafe/kev-latest`；路由器支持的服务器必须使用自己的路由模型 ID。

当前的插件声明这些模型引用：

| 模型参考                      | 模型                  | 准备                                            |
| ------------------------------------ | ---------------------- | ------------------------------------------------------ |
| `onnx/deberta-v3-base-zeroshot-v2.0` | DeBERTa 零射击 v2   | 下载固定的 ONNX 工件                         |
| `onnx/gliclass-base-v3.0`            | GLiClass 基础 v3       | 下载固定的 ONNX 工件                         |
| `onnx/gliclass-edge-v3.0`            | GLiClass Edge v3       | 下载固定的 ONNX 工件                         |
| `onnx/gliclass-instruct-base-v1.0`   | GLiClass 教学基地 | 本地出口                                           |
| `onnx/gliclass-instruct-edge-v1.0`   | GLiClass指令边缘 | 本地出口                                           |
| `onnx/gliner2.5-base-v1`             | GLiNER 2.5 底座        | 下载固定的 ONNX 工件                         |
| `onnx/gliner2.5-small-v1`            | GLiNER 2.5 小号       | 下载固定的 ONNX 工件                         |
| `openai/gpt-6-luna`                  | GPT-6 露娜             | OpenAI 平台 API 密钥和决策 API 访问       |
| `typesafe/jev-1.13.0`                | 杰夫 1.13.0             | TypeSafe 凭证                                    |
| `typesafe/jev-latest`                | 杰夫                    | TypeSafe凭证；遵循供应商的最新模型 |
| `typesafe/kev-latest`                | 凯夫（本地服务器）     | 运行系统一台服务器和显式环回 URL    |

ONNX 和 TypeSafe AI 插件目前是未发布的候选插件。他们的设置页面解释了源代码检查的使用和打包的主机层。该表描述了插件声明的模型，而不是您的计算机上准备好的工件或凭据。

设置提供程序后，将角色选择合并到您的配置中：

```json5
{
  agents: {
    ownership: "explicit",
    defaults: { decisionModel: "onnx/gliclass-edge-v3.0" },
    entries: {
      support: { decisionModel: "typesafe/jev-latest" },
      quiet: { decisionModel: "" },
    },
  },
}
```

未设置的代理覆盖会继承全局默认值。空代理覆盖会禁用该代理的决策。未设置或空的全局默认值会使该角色关闭。没有自动回退到对话模型。

对于本地设置验证，`openclaw onnx models` 列出预设，`openclaw onnx probe gliclass-edge-v3.0` 在模型下载后运行选择、分数和布尔烟雾评估。

## <a id="define-a-decision"></a> 定义决定

每个请求都包含共享的 `state` 和 `questions` 映射。状态接受文本、JSON 对象或数组或 `null`。问题键识别答案； `instructions` 和 `criteria` 定义判断。该细则随每个请求一起移动，因此没有单独的细则注册步骤。

| 问题类型 | 标准                                 | 回答                                                     |
| ------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `choice`      | 将标签映射到描述的对象 | `choice` 和具有相同标签的 `probabilities` 对象 |
| `score`       | 标题描述的有序数组  | 小数 `score` 和索引对齐 `probabilities`       |
| `boolean`     | `true` 和 `false` 下的说明    | `probabilityTrue`，从0到1                             |

使用描述性替代方案和可观察的分数锚点。当定位 ONNX 时，为布尔问题提供两个描述。让证据集中在问题上； ONNX 的代币预算包括状态、指令和标题。

## <a id="agent-evaluation-tool"></a> Agent评估工具

`decision_evaluate`是一个核心工具。当代理具有有效的 `decisionModel` 时，代理会收到它，并遵守正常的工具策略、显式拒绝和活动harness的功能。未配置的代理或每代理覆盖为空的代理不会收到该工具。无论其他实验消费者是否使用决策模型，该工具仍然适用。提供者插件仍然需要自己的正常设置。

使用显式共享 `state` 和 `questions` 映射来调用它：

```json
{
  "state": { "message": "Checkout is failing for all customers." },
  "questions": {
    "escalate": {
      "type": "boolean",
      "instructions": "Does this need incident response?",
      "criteria": {
        "true": { "includes": ["Widespread service outages"] },
        "false": "A routine request can follow normal handling"
      }
    },
    "route": {
      "type": "choice",
      "criteria": { "support": "Service failures", "billing": "Payment questions" }
    },
    "urgency": {
      "type": "score",
      "criteria": ["No disruption", "One workflow blocked", "Widespread outage"]
    }
  }
}
```

状态、指令和标准描述接受文本、JSON 对象或数组或 `null`。每个问题都会看到相同的状态，并且无法看到批次中的其他答案。当一个问题依赖于先前的答案时，请使用稍后的调用。该工具不收集任何环境对话。其可信呼叫代理绑定选择提供商和模型；输入不能覆盖该标识或选择。

结果保留布尔概率、分数从零开始的分数、原始分布和舍入、可选置信度和用法以及 provider/model 出处。他们不提供解释或授予采取行动的许可。证据发送至所选提供商的配置端点或本地运行时；只发送该目标授权的数据。提供者插件拥有凭证、模型加载、传输和特定于线路的验证。

提供程序功能通过其模型元数据进行声明并在 `models.list.decisionModels` 中公开。不受支持的问题和界限会产生可操作的、有界限的指导。请求被拒绝，而不是默默地被截断或拆分。当配置的提供程序不可用时，请勿替换 shell 或 HTTP 调用、在聊天中请求凭据或将失败视为否定答案。

缺少凭据、速率限制、过载和临时提供程序错误会使配置的工具可用并返回不可用的结果。配置更改遵循现有的 tool/context 刷新生命周期；执行重新检查有效的选择和权限。取消会传播到共享决策运行时，并且不得启动回退工作。

## <a id="call-from-a-plugin"></a> 从插件调用

从实时工具、挂钩或其他自有操作调用。这里`api`是插件API，`agentId`标识拥有该作品的代理，`signal`是该操作的取消信号。消费者不需要提供者 SDK 或 API 密钥。

```ts
const outcome = await api.runtime.decisions.evaluate(
  {
    state: { message: "Checkout is failing for all customers." },
    questions: {
      route: {
        type: "choice",
        instructions: "Which team should handle this?",
        criteria: {
          support: "Technical problems and service outages",
          billing: "Invoices, refunds, and incorrect charges",
          sales: "Pricing and purchasing questions",
        },
      },
      urgency: {
        type: "score",
        instructions: "Assess the operational impact.",
        criteria: [
          "No service disruption",
          "Minor inconvenience with a workaround",
          "An important workflow is blocked",
          "A widespread production outage",
        ],
      },
      escalate: {
        type: "boolean",
        instructions: "Does this require human incident response?",
        criteria: {
          true: "A serious service incident needs human attention",
          false: "A routine request can follow normal handling",
        },
      },
    },
  },
  {
    agentId,
    purpose: "support.triage",
    rubricVersion: "1",
    timeoutMs: 30000,
    signal,
  },
);
```

主机从拥有代理的配置中选择提供商和模型。 `purpose` 标识消费者操作； `rubricVersion` 在结果来源中标识其标题。它们不会取代问题说明。当其含义发生变化时，更改标题版本。仅当有意使用全局默认选择时才忽略 `agentId`。

`ok` 结果包含 `outcome.result.answers`（由提交的问题 ID 键入），以及提供商报告的模型、可选用法和 provider/rubric/runtime 出处。报告的别名（例如 `kev-latest`）不会标识特定的加载检查点。缺少使用或信心仍然不存在。例如，这些是说明性答案，而不是承诺的模型响应：

```json
{
  "route": {
    "type": "choice",
    "choice": "support",
    "probabilities": { "support": 0.97, "billing": 0.02, "sales": 0.01 }
  },
  "urgency": {
    "type": "score",
    "score": 2.85,
    "probabilities": [0, 0, 0.15, 0.85]
  },
  "escalate": { "type": "boolean", "probabilityTrue": 0.96 }
}
```

主持人在返回任何答案之前验证整个批次。在访问 TypeScript 中的类型特定字段之前，通过 `type` 缩小答案范围。

## <a id="interpret-scores-and-probabilities"></a> 解释分数和概率

分数为 **从零开始的评分标准位置**。上述四种紧急程度描述定义了从 0 到 3 的等级，包括分数。 2.85 的分数接近影响最大的锚点。显示器可以重新调整该位置：

```ts
if (outcome.status === "ok") {
  const urgency = outcome.result.answers.urgency;
  if (urgency?.type === "score") {
    const scoreOutOf100 = (100 * urgency.score) / 3;
  }
}
```

除数是最后一个标题索引：`criteria.length - 1`。显示值是刻度上的位置，而不是置信百分比或正确概率。标题的措辞决定了该规模的含义。

ONNX 使用 softmax 标准化实际标签 logits。选择使用最大的值；分数是概率加权的评分标准指数。 TypeSafe 保留 Jev 报告的标签、分数和概率估计。舍入的供应商概率不需要精确地加起来为 1，并且其报告的分数不需要等于根据这些舍入值计算的期望。

低布尔概率有利于 false；接近 0.5 的值对两种结果赋予相似的权重。缺少证据并不能保证接近 0.5. 的值当结果很重要时，包括明确的证据不足的选择替代方案。选择替代方案竞争；对独立标签使用单独的布尔问题。

您的消费者选择一项操作策略，例如当 `probabilityTrue` 至少为 0.9. 时升级在代表性示例上验证该阈值。概率和可选的特定于提供商的 `confidence` 值是估计值，并非证明的准确性保证。答案并不授予发送消息或执行其他效果的权限。

## <a id="limits-and-unavailable-results"></a> 限制和不可用的结果

对于可移植的评分标准，最多使用 32 个问题、2-64 个选项、2-10 个有意义的分数锚点、明确的 true/false 描述和简洁的证据。提供商限制不同：

| 提供者    | 选择替代方案 | 分数等级 | 额外限制                                                                  |
| ----------- | ------------------- | ------------ | ---------------------------------------------------------------------------------- |
| ONNX        | 2–64                | 2–64         | 最多 32 个问题；每个编码输入 512 个令牌；一个 MiB 已编译的批输入 |
| TypeSafe AI | 2–255               | 2–10         | 受主办方的批次限制和供应商输入合同的约束                   |

主机将请求绑定到1个MiB、20000个JSON节点、深度32、256个问题。每个提供商最多接受四个请求，并将每个截止时间限制为 30 秒。特定于提供商的限制可能更严格。不支持的输入将被拒绝，而不是默默地被截断。

`unavailable` 结果包括诸如 `disabled`、`not-configured`、`unsupported-input`、`overloaded` 或 `deadline` 之类的原因。消费者决定是否跳过、推迟或使用现有的后备。来电取消、消费者权限关闭、合同错误拒绝；不要将取消变成后备工作。请参阅 [SDK 合约 ](/plugins/sdk-overview/capabilities#decision-models-contract-version-1) 了解完整的生命周期和错误行为。

消费者应该构建有限的有用证据，评估一次，并在提供者返回 `unsupported-input` 时保留其正常行为，包括上下文溢出。运行时不会估计模型令牌、截断证据、重试或选择另一个 provider/model. 输入拒绝不会打开提供者电路；取消和关闭的权限仍然是终止的。

`decisions` 记录器记录 DEBUG 结果、调度状态、经过的时间、问题计数、提供的 JSON 字节计数以及实际提供程序使用情况（如果可用）。 JSON 字节不是模型标记。 Purpose/provider/model 标识符经过哈希处理；现有的环境痕迹相关性被保留。它不记录提交的文本、标题、凭据或提供程序错误主体，并且在禁用 DEBUG 时不执行额外的输入序列化。通用输入拒绝警告是有速率限制的。日志将提供者结果与调用者效果区分开来，此处仍未观察到。

对于 ONNX，冷加载大型模型可能会超出较慢机器上的截止日期。当内存允许时，让活动模型保持温暖，或者选择较小的模型。有关缓存设置和主动取消的效果，请参阅 [ONNX 生命周期和运行时](/plugins/onnx#lifecycle-and-runtime)。对于缺少 TypeSafe 凭证的情况，请按照其 [ 设置说明 ](/plugins/typesafe#enable-and-configure) 进行操作。

## <a id="provide-models-from-a-plugin"></a> 从插件提供模型

提供程序插件从 `openclaw/plugin-sdk/decisions` 实现 `DecisionProviderV1` 并将其注册到 `api.registerDecisionProvider(provider)`。其`id`和`contractVersion: 1`标识该合约； `evaluate(batch, context)` 返回经过验证的键入答案或支持的不可用原因。上下文包括所选模型、可选代理 ID、组合取消信号、单调截止日期以及用于自动消费者的可选主机拥有的 `isAdmissible()` 谓词。外部传输检查谓词在最终同步I/O，等待准备之后；请参阅 [ 提供商合约 ](/plugins/sdk-overview/capabilities#decision-models-contract-version-1)。

在插件清单中声明提供程序所有权和静态模型元数据：

```json
{
  "contracts": { "decisionProviders": ["example-decisions"] },
  "decisionModels": [{ "provider": "example-decisions", "id": "fast", "name": "Fast decisions" }]
}
```

此清单片段在单独的决策目录中公开了选择器 `example-decisions/fast`。消费者对每个提供商使用相同的评估 API。它本身不注册提供者。

提供商拥有特定于模型的输入转换、传输或本地推理、在需要时准备的凭证以及取消时的物理清理。注册和可选`isReady()`必须同步且无网络； `isReady()` 检查准备好的凭证可用性，而不是模型预热。返回真实模型估计值，而不是从仅标签响应中返回制造确定性。

[提供商合约](/plugins/sdk-overview/capabilities#decision-models-contract-version-1)拥有完整的SDK规则； [manifest 参考](/plugins/manifest/capabilities#decision-models-reference) 拥有发现字段。对于现有集成，请使用 [ONNX](/plugins/onnx) 或 [TypeSafe AI](/plugins/typesafe) 设置页面。
