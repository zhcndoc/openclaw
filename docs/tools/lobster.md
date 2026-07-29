---
summary: "带有可恢复审批闸门的 OpenClaw 类型化工作流运行时。"
title: Lobster
read_when:
  - 你希望通过显式审批来运行确定性的多步工作流
  - 你需要在不重新运行前面步骤的情况下恢复工作流
---

Lobster 将多步骤工具流水线作为一次确定性的工具调用来运行，带有
显式审批检查点和恢复令牌。它位于分离的后台工作之上一层：对于
跨多个分离任务编排流程，请参见 [Task Flow](/automation/taskflow)（`openclaw tasks flow`）；对于任务
活动账本，请参见 [Background Tasks](/automation/tasks)。

## 为什么

如果没有 Lobster，一个多步骤任务就意味着很多次往返的工具调用，由模型来协调每一步。Lobster 将这种编排放进了一个带类型的运行时中：

- **一次调用，而不是多次**：一次 Lobster 工具调用即可返回整个流水线的结构化结果。
- **内置审批**：有副作用的操作（发送、发布、删除）会暂停工作流，直到明确批准。
- **可恢复**：被暂停的工作流会返回一个 token；批准后即可恢复，而无需重新运行之前的步骤。

Lobster 不是通用脚本语言，而是一个小而受限的 DSL：approve/resume 是持久化的、内置的原语；流水线就是数据（便于日志记录、diff、回放和审查）；微小的语法限制了“创造性”的代码路径，因此验证仍然切实可行；超时、输出上限、沙箱检查和 allowlist 都由运行时强制执行，而不是由每个脚本各自实现。每一步仍然可以调用任意 CLI 或脚本——如果你想要更丰富的编写语言，也可以从其他工具生成 `.lobster` 文件。

如果没有 Lobster，一个重复出现的邮件分拣流程会像这样：

```text
User: "Check my email and draft replies"
→ openclaw 调用 gmail.list
→ LLM 总结
→ User: "draft replies to #2 and #5"
→ LLM 起草
→ User: "send #2"
→ openclaw 调用 gmail.send
（每天重复，对已分拣内容没有记忆）
```

使用 Lobster，同样的任务只需一次调用，并会在审批时暂停、之后再恢复：

```json
{ "action": "run", "pipeline": "email.triage --limit 20", "timeoutMs": 30000 }
```

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 需要回复，2 需要处理" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "发送 2 封草稿回复？",
    "items": [],
    "resumeToken": "..."
  }
}
```

## 它是如何工作的

OpenClaw 使用随附的 `@clawdbot/lobster` 包作为嵌入式运行器，**在进程内** 运行 Lobster 工作流。不会生成外部的 `lobster` 子进程；工具调用会直接返回一个 JSON 封装。如果流水线因审批而暂停，该封装会携带一个恢复令牌（或一个简短的审批 ID），以便你之后继续。

## 启用

Lobster 是一个**可选**的插件工具，默认未启用。它是随套件提供的，因此不需要单独安装步骤——只需允许该工具：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或者按代理单独配置：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    ]
  }
}
```

<Note>
`alsoAllow` 会在当前启用的工具配置基础上添加 `lobster`，而不会限制其他核心工具。只有当你想要更严格的允许列表模式时，才使用 `tools.allow`。
</Note>

在沙箱化的工具上下文中，该工具会被完全禁用。

如果你在开发或外部流水线中需要独立的 Lobster CLI（即不通过内置网关运行器），请从
[Lobster 仓库](https://github.com/openclaw/lobster) 安装它，并将 `lobster` 放到 `PATH` 中。

## 模式：小型 CLI + JSON 管道 + 审批

构建会说 JSON 的小型命令，然后将它们串联成一次 Lobster 调用。
（下面是示例命令名称——请替换为你自己的。）

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt '应用更改？'",
  "timeoutMs": 30000
}
```

如果管道请求审批，请使用 token 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

示例：将输入项映射为工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 仅 JSON 的 LLM 步骤（llm-task）

对于工作流中的**结构化 LLM 步骤**，启用可选的
`llm-task` 插件工具，并从 Lobster 中调用它：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "alsoAllow": ["llm-task"] }
      }
    ]
  }
}
```

### 重要限制：嵌入式 Lobster 与 `openclaw.invoke`

捆绑的 Lobster 插件在网关内部以**进程内**方式运行工作流。
在这种嵌入式模式下，`openclaw.invoke` 对于嵌套的 OpenClaw CLI 工具调用，不会**自动**继承网关 URL/认证上下文。

这意味着以下模式在嵌入式运行器中**目前不可靠**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

仅在使用**独立的 Lobster CLI**，且你的环境中 `openclaw.invoke` 已正确配置了相应的网关/认证上下文时，才使用下面的示例。

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "给定输入邮件，返回意图和草稿。",
  "thinking": "low",
  "input": { "subject": "你好", "body": "你能帮忙吗？" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

如果你当前使用的是嵌入式 Lobster 插件，请优先选择以下之一：

- 在 Lobster 之外直接调用 `llm-task` 工具，或者
- 在 Lobster 流水线中使用非 `openclaw.invoke` 步骤，直到添加受支持的
  嵌入式桥接。

详情和配置选项请参见 [LLM Task](/tools/llm-task)。

## 工作流文件（.lobster）

Lobster 可以运行带有 `name`、`args`、`steps`、`env`、
`condition` 和 `approval` 字段的 YAML/JSON 工作流文件。在工具
调用中将 `pipeline` 设置为文件路径。

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

说明：

- `stdin: $step.stdout` 和 `stdin: $step.json` 传递前一步的输出。
- `condition`（或 `when`）可以根据 `$step.approved` 对步骤进行门控。

### 注入的环境变量

每个步骤的 shell 都会继承父环境以及这些由 Lobster 注入的
变量，因此命令可以引用已解析的工作流参数，而无需将原始值嵌入
命令字符串中：

- `LOBSTER_ARG_<NAME>` - 每个工作流参数对应一个。名称会转换为大写，
  并将每一段非字母数字字符折叠为 `_`，因此参数 `user-id` 会变成
  `LOBSTER_ARG_USER_ID`。
- `LOBSTER_ARGS_JSON` - 所有已解析参数组成的单个 JSON 字符串。

这就是完整的注入集合。不存在诸如 `LOBSTER_STEP_<id>_STDOUT` 或
`LOBSTER_STEP_<id>_JSON_<field>` 之类的逐步输出变量；shell 会将这些名称
视为未设置，因此参数展开默认值可能会掩盖错误。请改为通过步骤引用读取前一
步骤的输出——在 `stdin:`、`env:` 或 `condition:` 值中使用
`$step.stdout`、`$step.json` 或 `$step.json.<field>`。（`LOBSTER_STATE_DIR`
是状态目录的单独运行时设置，不是每次运行的参数。）

## 工具参数

### `run`

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

使用参数运行工作流文件：

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

| 字段              | 默认值        | 说明                                                                                                         |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| `pipeline`        | 必填         | 内联管道字符串，或以 `.lobster`/`.yaml`/`.yml`/`.json` 结尾的工作流文件路径。                                 |
| `cwd`             | gateway cwd  | 相对工作目录；必须解析到 gateway 工作目录内（拒绝绝对路径）。                                                |
| `timeoutMs`       | `20000`      | 超过此时间则中止运行。                                                                                       |
| `maxStdoutBytes`  | `512000`     | 如果捕获到的 stdout 或 stderr 超过此大小，则中止运行。                                                       |
| `argsJson`        | -            | 工作流文件的参数 JSON 字符串（对内联管道忽略）。                                                             |

### `resume`

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

`resume` 接受 `token`（来自 `requiresApproval` 的完整恢复令牌）
或 `approvalId`（来自同一对象的短 ID）——使用停止运行返回的任一项即可。
`approve` 为必填项。

### 托管任务流模式

在 `run` 上传入 `flowControllerId` 和 `flowGoal`（或在 `resume` 上传入
`flowId` 和 `flowExpectedRevision`）会通过插件运行时托管的 [Task Flow](/automation/taskflow) API 来驱动调用，而不是返回一个普通 envelope：OpenClaw 会创建或恢复一个持久化的 flow 记录，将 Lobster envelope 应用于其上（审批时为 `waiting`，完成时为 `succeeded`/`failed`），并返回 `{ ok, envelope, flow, mutation }`。此模式需要绑定的 Task Flow 运行时，适用于需要在 gateway 重启后仍保持持久化 flow 状态的插件/控制器代码，而不是典型的临时 agent 使用。

## 输出信封

Lobster 会返回一个 JSON 信封，具有以下三种状态之一：

- `ok` - 成功完成
- `needs_approval` - 已暂停；`requiresApproval` 携带一个 `resumeToken` 和一个
  简短的 `approvalId`，二者任意一个都可以恢复运行
- `cancelled` - 已明确拒绝或取消

该工具会在 `content`（格式化的 JSON）和 `details`
（原始对象）中同时展示该信封。

## 审批

如果存在 `requiresApproval`，请检查提示并决定：

- `approve: true` - 恢复并继续副作用
- `approve: false` - 取消并完成工作流

使用 `approve --preview-from-stdin --limit N` 可将 JSON 预览附加到
审批请求，而无需自定义 jq/heredoc 组合。恢复状态存储为
Lobster 状态目录（默认 `~/.lobster/state`，可通过 `LOBSTER_STATE_DIR` 覆盖）下的
小型 JSON 文件；令牌本身仅编码了对该状态的指针，而不是完整的流水线状态。

## OpenProse

OpenProse 与 Lobster 配合得很好：使用 `/prose` 来编排多智能体
准备工作，然后运行 Lobster 流水线以进行确定性审批。如果一个 Prose
程序需要 Lobster，请通过 `tools.subagents.tools`
为子代理启用 `lobster` 工具。参见 [OpenProse](/prose)。

## 安全性

- **仅限本地进程内** - 工作流在网关进程内执行；插件本身不发起任何网络调用。
- **无密钥** - Lobster 不管理 OAuth；它调用由 OpenClaw 工具来处理这些内容。
- **感知沙箱** - 当工具上下文处于沙箱中时会被禁用。
- **加固** - 由嵌入式运行器强制执行超时和输出上限。

## 故障排查

| Error                                                         | Cause / fix                                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `lobster runtime timed out`                                   | Pipeline 超过了 `timeoutMs`。增大它，或者拆分该流水线。                |
| `lobster stdout exceeded maxStdoutBytes` (or `stderr`)        | 捕获到的输出超过了上限。提高 `maxStdoutBytes`，或者减少输出。       |
| `run --args-json must be valid JSON`                          | `argsJson`（workflow-file 运行）解析失败。修正 JSON 字符串。            |
| `lobster runtime failed` (or another `runtime_error` message) | 内嵌运行时返回了错误封装。请检查网关日志以获取详细信息。 |

## 了解更多

- [插件](/tools/plugin)
- [插件工具编写](/plugins/building-plugins#registering-agent-tools)

## 案例研究：社区工作流

一个公开示例：“第二大脑” CLI + Lobster 管道，用于管理三个
Markdown vault（个人、伴侣、共享）。该 CLI 为统计信息、
收件箱列表和过期扫描输出 JSON；Lobster 将这些命令串联成工作流，
例如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和
`shared-task-sync`，每个都带有审批门控。AI 在可用时负责判断
（分类），不可用时则回退到确定性规则。

- 线程：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 仓库：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相关内容

- [Automation](/automation) - 所有自动化机制
- [Tools Overview](/tools) - 所有可用的代理工具
