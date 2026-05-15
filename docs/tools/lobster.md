---
summary: "带有可恢复审批闸门的 OpenClaw 类型化工作流运行时。"
title: Lobster
read_when:
  - 你希望通过显式审批来运行确定性的多步工作流
  - 你需要在不重新运行前面步骤的情况下恢复工作流
---

Lobster 是一个工作流外壳，它让 OpenClaw 能将多步工具序列作为一次单一、确定性的操作来运行，并带有显式的审批检查点。

Lobster 是位于分离式后台工作的上一层编写层。对于位于单个任务之上的流程编排，请参见 [Task Flow](/automation/taskflow)（`openclaw tasks flow`）。有关任务活动账本，请参见 [`openclaw tasks`](/automation/tasks)。

## Hook

你的助手可以构建管理它自己的工具。提出一个工作流需求，30 分钟后你就会得到一个 CLI 以及能作为一次调用运行的管道。Lobster 正是缺失的那一环：确定性管道、显式审批，以及可恢复状态。

## 为什么

如今，复杂工作流需要多次来回的工具调用。每次调用都会消耗 token，而 LLM 必须编排每一步。Lobster 将这种编排移入一个类型化运行时：

- **一次调用，而不是多次**：OpenClaw 执行一次 Lobster 工具调用并获得结构化结果。
- **内置审批**：副作用（发送邮件、发布评论）会暂停工作流，直到显式批准。
- **可恢复**：暂停的工作流会返回一个 token；批准后即可恢复，而无需重新运行全部内容。

## 为什么使用 DSL，而不是普通程序？

Lobster 故意保持小巧。目标不是“又一种新语言”，而是一个可预测、对 AI 友好的管道规范，内置审批和恢复 token。

- **审批/恢复内置**：普通程序可以提示人类，但如果不自己发明运行时，它无法借助持久化 token 来_暂停并恢复_。
- **确定性 + 可审计性**：管道就是数据，因此它们容易记录、比较、重放和审查。
- **面向 AI 的受限表面**：小型语法 + JSON 管道可减少“创意”代码路径，并使验证变得现实。
- **内建安全策略**：超时、输出上限、沙箱检查和允许列表由运行时强制执行，而不是由每个脚本分别处理。
- **仍然可编程**：每一步都可以调用任意 CLI 或脚本。如果你想用 JS/TS，可以从代码生成 `.lobster` 文件。

## 它是如何工作的

OpenClaw 使用嵌入式运行器 **在进程内** 运行 Lobster 工作流。不会启动外部 CLI 子进程；工作流引擎在网关进程内部执行，并直接返回一个 JSON 信封。
如果管道因审批而暂停，工具会返回一个 `resumeToken`，以便你稍后继续。

## 模式：小型 CLI + JSON 管道 + 审批

构建能说 JSON 的小命令，然后把它们串成一次 Lobster 调用。（下面是示例命令名——请替换为你自己的。）

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

AI 触发工作流；Lobster 执行各步骤。审批闸门使副作用保持显式且可审计。

示例：将输入项映射为工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 仅 JSON 的 LLM 步骤（llm-task）

对于需要一个 **结构化 LLM 步骤** 的工作流，启用可选的
`llm-task` 插件工具，并从 Lobster 中调用它。这能让工作流
保持确定性，同时仍允许你使用模型进行分类/摘要/起草。

启用该工具：

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

捆绑的 Lobster 插件在网关内部**进程内**运行工作流。在这种嵌入式模式下，`openclaw.invoke` 不会自动为嵌套的 OpenClaw CLI 工具调用继承网关 URL/认证上下文。

这意味着以下模式在嵌入式运行器中**目前不可靠**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

仅当你在一个 `openclaw.invoke` 已配置正确网关/认证上下文的环境中运行**独立的 Lobster CLI** 时，才使用下面的示例。

在独立的 Lobster CLI 管道中使用它：

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

- 在 Lobster 之外直接调用 `llm-task` 工具，或
- 在 Lobster 管道内避免使用 `openclaw.invoke` 步骤，直到添加受支持的嵌入式桥接。

详情和配置选项请参见 [LLM Task](/tools/llm-task)。

## 工作流文件（.lobster）

Lobster 可以运行带有 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 字段的 YAML/JSON 工作流文件。在 OpenClaw 工具调用中，将 `pipeline` 设置为文件路径。

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

## 安装 Lobster

捆绑的 Lobster 工作流以内嵌方式运行；不需要单独的 `lobster` 二进制文件。嵌入式运行器随 Lobster 插件一同提供。

如果你在开发或外部管道中需要独立的 Lobster CLI，请从 [Lobster repo](https://github.com/openclaw/lobster) 安装，并确保 `lobster` 位于 `PATH` 中。

## 启用该工具

Lobster 是一个**可选**的插件工具（默认未启用）。

推荐方式（增量式，安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或者按 agent 配置：

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

除非你打算使用受限的允许列表模式，否则不要使用 `tools.allow: ["lobster"]`。

<Note>
Allowlist 是可选插件的自愿启用项。`alsoAllow` 仅启用指定的可选插件工具，同时保留正常的核心工具集。若要限制核心工具，请使用 `tools.allow` 并指定你想要的核心工具或工具组。
</Note>

## 示例：邮件分拣

不使用 Lobster：

```
User: "查看我的邮件并起草回复"
→ openclaw calls gmail.list
→ LLM summaries
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ openclaw calls gmail.send
（每天重复，没有对已分拣内容的记忆）
```

使用 Lobster：

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

返回一个 JSON 信封（已截断）：

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 封需要回复，2 封需要处理" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "发送 2 封草稿回复？",
    "items": [],
    "resumeToken": "..."
  }
}
```

用户批准 → 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

一个工作流。确定性。安全。

## 工具参数

### `run`

以工具模式运行管道。

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

### `resume`

在审批后继续已暂停的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `cwd`：管道的相对工作目录（必须保持在网关工作目录内）。
- `timeoutMs`：如果工作流超过此时长则中止（默认：20000）。
- `maxStdoutBytes`：如果输出超过此大小则中止（默认：512000）。
- `argsJson`：传递给 `lobster run --args-json` 的 JSON 字符串（仅工作流文件）。

## 输出信封

Lobster 会返回一个 JSON 信封，具有以下三种状态之一：

- `ok` → 成功完成
- `needs_approval` → 已暂停；需要 `requiresApproval.resumeToken` 才能恢复
- `cancelled` → 明确拒绝或已取消

该工具会在 `content`（格式化 JSON）和 `details`（原始对象）中同时显示该信封。

## 审批

如果存在 `requiresApproval`，请检查提示并决定：

- `approve: true` → 恢复并继续执行副作用
- `approve: false` → 取消并完成工作流

使用 `approve --preview-from-stdin --limit N` 可以在无需自定义 jq/heredoc 连接的情况下，将 JSON 预览附加到审批请求中。恢复 token 现在更紧凑：Lobster 将工作流恢复状态存储在其状态目录下，并返回一个较小的 token 键。

## OpenProse

OpenProse 与 Lobster 搭配得很好：使用 `/prose` 编排多 agent 准备工作，然后运行一个 Lobster 管道以进行确定性的审批。如果某个 Prose 程序需要 Lobster，可通过 `tools.subagents.tools` 为子 agent 允许 `lobster` 工具。参见 [OpenProse](/prose)。

## 安全性

- **仅本地进程内** - 工作流在网关进程内执行；插件本身不发起网络调用。
- **无密钥** - Lobster 不管理 OAuth；它调用的是由 OpenClaw 管理的工具。
- **沙箱感知** - 当工具上下文处于沙箱中时会被禁用。
- **加固** - 嵌入式运行器会强制执行超时和输出上限。

## 故障排查

- **`lobster timed out`** → 增加 `timeoutMs`，或将长管道拆分。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或减少输出大小。
- **`lobster returned invalid JSON`** → 确保管道以工具模式运行，并且只输出 JSON。
- **`lobster failed`** → 检查网关日志中的嵌入式运行器错误详情。

## 了解更多

- [Plugins](/tools/plugin)
- [Plugin tool authoring](/plugins/building-plugins#registering-agent-tools)

## 案例研究：社区工作流

一个公开示例：一个“第二大脑”CLI + Lobster 管道，用于管理三个 Markdown vault（个人、伴侣、共享）。该 CLI 为统计信息、收件箱列表和过期扫描输出 JSON；Lobster 将这些命令串成 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync` 等工作流，每个工作流都带有审批闸门。AI 在可用时负责判断（分类），在不可用时回退到确定性规则。

- 线程：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 仓库：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相关内容

- [Automation](/automation) - scheduling Lobster workflows
- [Automation Overview](/automation) - all automation mechanisms
- [Tools Overview](/tools) - all available agent tools
