---
summary: "OpenClaw 的类型化工作流运行时，具有可恢复的批准和输入门。"
title: "Lobster"
read_when:
  - "您需要可重复的多步骤工作流程以及批准或结构化问题"
  - "你需要在不重新运行前面步骤的情况下恢复工作流"
---

Lobster 将多步骤工具管道作为一个可重复的工具调用来运行，并具有显式的 approval/input 检查点和恢复令牌。检查点属于 Lobster 运行程序，而不是单独的编排注册表。

## <a id="why"></a> 为什么

如果没有 Lobster，一个多步骤任务就意味着很多次往返的工具调用，由模型来协调每一步。Lobster 将这种编排放进了一个带类型的运行时中：

- **一次调用，而不是多次**：一次 Lobster 工具调用即可返回整个流水线的结构化结果。
- **内置审批**：有副作用的操作（发送、发布、删除）会暂停工作流，直到明确批准。
- **可恢复**：被暂停的工作流会返回一个 token；批准后即可恢复，而无需重新运行之前的步骤。

Lobster 不是通用脚本语言，而是一个小而受限的 DSL：approve/resume 是持久化的、内置的原语；流水线就是数据（便于日志记录、diff、回放和审查）；微小的语法限制了“创造性”的代码路径，因此验证仍然切实可行；超时、输出上限、沙箱检查和 allowlist 都由运行时强制执行，而不是由每个脚本各自实现。每一步仍然可以调用任意 CLI 或脚本——如果你想要更丰富的编写语言，也可以从其他工具生成 `.lobster` 文件。

如果没有 Lobster，一个重复出现的邮件分拣流程会像这样：

```text
User: "Check my email and draft replies"
→ openclaw calls gmail.list
→ LLM summarizes
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ openclaw calls gmail.send
(repeat daily, no memory of what was triaged)
```

使用 Lobster，同样的任务只需一次调用，并会在审批时暂停、之后再恢复：

```json
{ "action": "run", "pipeline": "email.triage --limit 20", "timeoutMs": 30000 }
```

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

## <a id="how-it-works"></a> 工作原理

单独安装的官方 `@openclaw/lobster` 插件使用其嵌入式 `@clawdbot/lobster` 运行时运行 Lobster 工作流程 **in-process**。没有产生外部 `lobster` 子进程；工具调用直接返回 JSON 信封。如果管道因批准或输入而暂停，Lobster 会保存其延续并返回恢复令牌。批准请求还可以带有简短的批准 ID。通话在检查站结束；没有进程等待用户的回答。

## <a id="enable"></a> 启用

Lobster 是一个 **可选** 插件工具，默认情况下未安装或启用。安装官方插件：

```bash
openclaw plugins install @openclaw/lobster
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

然后全局允许该工具：

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
    "entries": {
      "main": {
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    }
  }
}
```

<Note>
`alsoAllow` 会在当前启用的工具配置基础上添加 `lobster`，而不会限制其他核心工具。只有当你想要更严格的允许列表模式时，才使用 `tools.allow`。
</Note>

在沙箱化的工具上下文中，该工具会被完全禁用。

如果你在开发或外部流水线中需要独立的 Lobster CLI（即不通过内置网关运行器），请从 [Lobster 仓库](https://github.com/openclaw/lobster)安装它，并将 `lobster` 放到 `PATH` 中。

## <a id="pattern%3A-small-cli-%2B-json-pipes-%2B-approvals"></a><a id="pattern-small-cli-+-json-pipes-+-approvals"></a> 模式：小型 CLI + JSON 管道 + 审批

构建会说 JSON 的小型命令，然后将它们串联成一次 Lobster 调用。 （下面是示例命令名称——请替换为你自己的。）

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
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

## <a id="json-only-llm-steps-(llm-task)"></a><a id="json-only-llm-steps-llm-task"></a> JSON-仅 LLM 步骤（llm 任务）

对于工作流中的**结构化 LLM 步骤**，启用可选的 `llm-task` 插件工具，并从 Lobster 中调用它：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "entries": {
      "main": {
        "tools": { "alsoAllow": ["llm-task"] }
      }
    }
  }
}
```

### <a id="important-limitation%3A-embedded-lobster-vs-openclaw.invoke"></a><a id="important-limitation-embedded-lobster-vs-openclaw-invoke"></a> 重要限制：嵌入式 Lobster 与 `openclaw.invoke`

已安装的Lobster插件运行工作流程**进行中**网关内。在那种嵌入模式下，`openclaw.invoke`做**不是**自动继承网关URL/auth嵌套的上下文OpenClaw CLI工具调用。

这意味着以下模式在嵌入式运行器中**目前不可靠**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

仅当在已使用正确的 gateway/auth 上下文配置 `openclaw.invoke` 的环境中运行 **standalone Lobster CLI** 时，才使用下面的示例。

对于 `openclaw.invoke` 和 `clawd.invoke`，仅 `localhost`、`127.0.0.1` 或 `[::1]` 目标接受环境 `OPENCLAW_TOKEN` 或 `CLAWD_TOKEN` 凭证。要将凭证发送到另一个 HTTP（S） 端点，请显式传递 `--token`。此规则也适用于显式配置远程连接的嵌入式工作流。此命令参数是远程网关凭据，而不是 Lobster 工具的批准-恢复 `token` 参数。如果调用超时或调度后失败，Lobster 不会自动重试，因为网关可能已经执行了该操作。

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": { "subject": "Hello", "body": "Can you help?" },
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
- 在 Lobster 流水线中使用非 `openclaw.invoke` 步骤，直到添加受支持的嵌入式桥接。

详情和配置选项请参见 [LLM Task](/tools/llm-task)。

## <a id="workflow-files-(.lobster)"></a><a id="workflow-files-lobster"></a> 工作流文件（.lobster）

Lobster 可以运行带有 `name`、`args`、`steps`、`env`、 `condition` 和 `approval` 字段的 YAML/JSON 工作流文件。在工具调用中将 `pipeline` 设置为文件路径。

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

注意：

- `stdin: $step.stdout` 和 `stdin: $step.json` 传递前一步的输出。
- `condition`（或 `when`）可以根据 `$step.approved` 对步骤进行门控。

### <a id="injected-environment-variables"></a> 注入的环境变量

每个步骤 shell 都会继承父环境以及这些 Lobster-injected 变量，因此命令可以引用已解析的工作流参数，而无需将原始值嵌入到命令字符串中：

- `LOBSTER_ARG_<NAME>` - 每个工作流参数对应一个。名称会转换为大写， 并将每一段非字母数字字符折叠为 `_`，因此参数 `user-id` 会变成 `LOBSTER_ARG_USER_ID`。
- `LOBSTER_ARGS_JSON` - 所有已解析参数组成的单个 JSON 字符串。

这就是完整的注入集。有**no**每步输出变量如`LOBSTER_STEP_<id>_STDOUT`或`LOBSTER_STEP_<id>_JSON_<field>`； shell 将这些名称视为未设置，因此参数扩展默认值可以隐藏错误。通过 `stdin:`、`env:` 或 `condition:` 值中的步骤引用（`$step.stdout`、`$step.json` 或 `$step.json.<field>`）读取先前步骤的输出。 （`LOBSTER_STATE_DIR` 是状态目录的单独运行时设置，而不是每次运行参数。）

## <a id="tool-parameters"></a> 工具参数

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

| 字段            | 默认值     | 笔记                                                                                                        |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `pipeline`       | 必填    | 内联管道字符串，或以 `.lobster`/`.yaml`/`.yml`/`.json` 结尾的工作流文件路径。           |
| `cwd`            | 网关CWD | 相对工作目录；必须解析到 gateway 工作目录内（拒绝绝对路径）。 |
| `timeoutMs`      | `20000`     | 超过此时间则中止运行。                                                                                  |
| `maxStdoutBytes` | `512000`    | 如果捕获的 stdout、stderr 或嵌入的 JSON 结果超过此大小，则中止。                            |
| `argsJson`       | -           | 工作流文件的参数 JSON 字符串（对内联管道忽略）。                                      |

### `resume`

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

对于批准，请使用 `requiresApproval` 中的 `token` 或 `approvalId` 以及布尔值 `approve`。对于输入，请使用 `requiresInput` 和 `responseJson` 中的 `token`。要取消任一类型的检查点，请使用 `cancel: true` 而不是决策。准确提供 `approve`、`responseJson` 或 `cancel: true` 之一。

### <a id="structured-input"></a> 结构化输入

工作流 `input` 步骤或内联 `ask` 阶段返回 `needs_input` 以及问题、JSON 架构和恢复令牌。可选的 `defaults` 和 `subject` 提供建议值和要查看的材料。例如：

```json
{
  "status": "needs_input",
  "requiresInput": {
    "type": "input_request",
    "prompt": "What feedback should be included?",
    "responseSchema": { "type": "string" },
    "resumeToken": "<resumeToken>"
  }
}
```

代理在聊天中提出问题，然后将用户的答案发送为 JSON：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "responseJson": "\"Please shorten the introduction.\""
}
```

`responseJson` 可以编码返回模式允许的任何值，而不仅仅是一个对象。 Lobster 在继续之前验证答案。无效的 JSON 或与架构不匹配的答案会使检查点可供更正。简历可以返回另一个问题或批准请求。

这是 chat/tool 交互，而不是收件箱卡或表单。该插件不会列出待处理的检查点；保留返回的令牌以便稍后恢复。与批准令牌一样，拥有输入令牌允许允许使用该工具的调用者恢复；令牌不绑定到 OpenClaw 用户或会话。

## <a id="output-envelope"></a> 输出信封

Lobster 返回具有以下四种状态之一的 JSON 信封：

- `ok` - 成功完成
- `needs_approval` - 已暂停；`requiresApproval` 携带一个 `resumeToken` 和一个简短的 `approvalId`，二者任意一个都可以恢复运行
- `needs_input` - 暂停； `requiresInput`携带问题、答案模式和`resumeToken`
- `cancelled` - 已明确拒绝或取消

该工具会在 `content`（格式化的 JSON）和 `details` （原始对象）中同时展示该信封。

## <a id="approvals"></a> 审批

如果存在 `requiresApproval`，请检查提示并决定：

- `approve: true` - 恢复并继续副作用
- `approve: false` - 取消并完成工作流

使用 `approve --preview-from-stdin --limit N` 将 JSON 预览附加到审批请求，无需自定义 jq/heredoc 胶水。恢复状态以小 JSON 文件形式存储在 Lobster 状态目录下（默认为 `~/.lobster/state`，用 `LOBSTER_STATE_DIR` 覆盖）；令牌本身仅编码指向该状态的指针，而不是完整的管道状态。

## <a id="safety"></a> 安全性

- **仅限本地进程内** - 工作流在网关进程内执行；插件本身不发起任何网络调用。
- **无密钥** - Lobster 不管理 OAuth；它调用由 OpenClaw 工具来处理这些内容。
- **感知沙箱** - 当工具上下文处于沙箱中时会被禁用。
- **加固** - 由嵌入式运行器强制执行超时和输出上限。

## <a id="troubleshooting"></a> 故障排查

| 错误                                                         | 原因/修复                                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `lobster runtime timed out`                                   | Pipeline 超过了 `timeoutMs`。增大它，或者拆分该流水线。                |
| `lobster stdout exceeded maxStdoutBytes`（或 `stderr`）        | 捕获到的输出超过了上限。提高 `maxStdoutBytes`，或者减少输出。       |
| `lobster runtime result exceeded maxStdoutBytes`              | JSON 结果超出上限。提高`maxStdoutBytes`或减少输出。       |
| `run --args-json must be valid JSON`                          | `argsJson`（workflow-file 运行）解析失败。修正 JSON 字符串。            |
| `lobster runtime failed`（或其他 `runtime_error` 消息） | 内嵌运行时返回了错误封装。请检查网关日志以获取详细信息。 |

## <a id="learn-more"></a> 了解更多

- [插件](/tools/plugin)
- [插件工具编写](/plugins/building-plugins#registering-agent-tools)

## <a id="case-study%3A-community-workflows"></a><a id="case-study-community-workflows"></a> 案例研究：社区工作流

一个公共示例：管理三个 Markdown 金库（个人、合作伙伴、共享）的“第二大脑”CLI + Lobster 管道。 CLI 发出 JSON 用于统计、收件箱列表和陈旧扫描； Lobster 将这些命令链接到 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync` 等工作流程中，每个工作流程都有批准门。 AI 在可用时处理判断（分类），在不可用时则退回到固定规则。

- 线程：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 回购：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## <a id="related"></a> 相关内容

- [Automation](/automation) - 所有自动化机制
- [Tools Overview](/tools) - 所有可用的代理工具。
- [Lobster 插件参考](/plugins/reference/lobster) - 插件的清单、配置和工具参考
