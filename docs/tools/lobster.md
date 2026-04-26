---
summary: "带有可恢复审批关卡的 OpenClaw 类型化工作流运行时。"
title: Lobster
read_when:
  - 您需要具有显式审批的确定性多步骤工作流
  - 您需要在不中断早期步骤的情况下恢复工作流
---

Lobster 是一个工作流外壳，它让 OpenClaw 能够将多步骤工具序列作为一个单一、确定性的操作运行，并带有显式审批检查点。

Lobster 是位于分离后台工作的上层一个创作层。关于在单个任务之上的流程编排，请参见 [Task Flow](/automation/taskflow) (`openclaw tasks flow`)。关于任务活动账本，请参见 [`openclaw tasks`](/automation/tasks)。

## 核心亮点

您的助手可以构建管理自身的工具。请求一个工作流，30 分钟后即可获得一个命令行工具及作为一次调用运行的流水线。Lobster 是缺失的那一块：确定性流水线、显式审批和支持恢复的状态。

## 为什么需要它

如今，复杂工作流需要多次反复调用工具。每次调用都消耗令牌，且大语言模型必须协调每一步。Lobster 将这种协调移入类型化运行时：

- **一次调用，替代多次**：OpenClaw 运行一次 Lobster 工具调用并获得结构化结果。
- **内置审批**：副作用（发送邮件、发布评论）会暂停工作流，直到明确批准。
- **支持恢复**：暂停的工作流返回令牌，批准后可恢复，且无需重跑所有步骤。

## 为什么要用 DSL 而非普通程序？

Lobster 有意保持小巧。目标不是“新语言”，而是支持一流审批和恢复令牌的可预测、AI 友好的流水线规范。

- **审批/恢复内置**：普通程序可以提示人工，但无法用持久令牌_暂停并恢复_，除非自己发明运行时。
- **确定性 + 审计性**：流水线是数据，方便日志记录、差异对比、重放和审查。
- **限制 AI 作用面**：极简语法 + JSON 管道，减少“创意”编程路径，令验证更现实。
- **安全策略内置**：运行时强制执行超时、输出限制、沙箱检查和允许列表，而非每个脚本单独处理。
- **仍可编程**：每一步均可调用任意命令行或脚本。如需 JS/TS，可从代码生成 `.lobster` 文件。

## 工作原理

OpenClaw 在进程内使用嵌入式运行器运行 Lobster 工作流。不会启动外部 CLI 子进程；工作流引擎在网关进程内执行，并直接返回一个 JSON 信封。
如果流水线因审批而暂停，工具会返回一个 `resumeToken`，以便您稍后继续。

## 模式：小型 CLI + JSON 管道 + 审批

构建支持 JSON 的小型命令，然后将它们串联为单次 Lobster 调用。（下面是示例命令名，可用自身替换）

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

若流水线请求审批，使用令牌继续：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 触发工作流；Lobster 执行步骤。审批关卡使副作用显式且可审计。

示例：将输入项映射为工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 仅 JSON 的 LLM 步骤（llm-task）

对于需要**结构化 LLM 步骤**的工作流，可启用可选 `llm-task` 插件工具，并由 Lobster 调用。它保持工作流的确定性，同时允许用模型进行分类/摘要/起草。

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
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

在流水线中使用：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "给定输入邮件，返回意图和草稿。",
  "thinking": "低",
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

详情及配置选项见 [LLM Task](/tools/llm-task)。

## 工作流文件（.lobster）

Lobster 可运行带有 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 字段的 YAML/JSON 工作流文件。OpenClaw 工具调用时，将 `pipeline` 设为文件路径。

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
- `condition`（或 `when`）用于根据 `$step.approved` 控制步骤执行。

## 安装 Lobster

捆绑的 Lobster 工作流在进程内运行；不需要单独的 `lobster` 二进制文件。嵌入式运行器随 Lobster 插件一起提供。

如果您需要用于开发或外部流水线的独立 Lobster CLI，请从 [Lobster repo](https://github.com/openclaw/lobster) 安装，并确保 `lobster` 在 `PATH` 中。

## 启用该工具

Lobster 是一个**可选**插件工具（默认未启用）。

推荐（安全且可叠加）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或针对单个代理：

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

除非打算使用严格允许列表模式，否则避免使用 `tools.allow: ["lobster"]`。

注意：允许列表为可选插件而非核心工具开启。若您的允许列表仅包含插件工具（如 `lobster`），OpenClaw 会保持核心工具启用。要限制核心工具，请在允许列表中也包含所需核心工具或组。

## 示例：邮件分诊

无 Lobster：

```
用户：“帮我检查邮件并起草回复”
→ openclaw 调用 gmail.list
→ LLM 总结
→ 用户：“帮我起草 #2 和 #5 的回复”
→ LLM 起草
→ 用户：“发送 #2"
→ openclaw 调用 gmail.send
（每天重复，无分诊记忆）
```

有 Lobster：

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

返回 JSON 信封（节选）：

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 需回复，2 需操作" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "发送 2 封草稿回复？",
    "items": [],
    "resumeToken": "..."
  }
}
```

用户批准 → 继续：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

一次工作流。确定性。安全。

## 工具参数

### `run`

以工具模式运行流水线。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

运行含参数的工作流文件：

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

审批后继续暂停的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `cwd`: 流水线的相对工作目录（必须保留在网关工作目录内）。
- `timeoutMs`: 若工作流超过此时长则中止（默认：20000）。
- `maxStdoutBytes`: 若输出超过此大小则中止工作流（默认：512000）。
- `argsJson`: 传递给 `lobster run --args-json` 的 JSON 字符串（仅工作流文件）。

## 输出信封

Lobster 返回带有三种状态之一的 JSON 信封：

- `ok` → 成功结束
- `needs_approval` → 暂停；需使用 `requiresApproval.resumeToken` 恢复
- `cancelled` → 明确拒绝或取消

工具在 `content`（美化 JSON）和 `details`（原始对象）中都展示该信封。

## 审批

若存在 `requiresApproval`，请查看提示并决定：

- `approve: true` → 恢复并继续副作用
- `approve: false` → 取消并结束工作流

使用 `approve --preview-from-stdin --limit N` 可以将 JSON 预览附加到审批请求，无需自定义 jq 或 heredoc。恢复令牌体积紧凑：Lobster 在其状态目录下存储恢复状态，仅返回简短令牌键。

## OpenProse

OpenProse 与 Lobster 配合良好：用 `/prose` 协调多代理预处理，再运行 Lobster 流水线实现确定性审批。若 Prose 程序需调用 Lobster，须通过 `tools.subagents.tools` 允许子代理使用 `lobster` 工具。详见 [OpenProse](/prose)。

## 安全性

- **仅本地进程内** — 工作流在网关进程内执行；插件本身不会发起网络调用。
- **无密钥** — Lobster 不管理 OAuth；它调用执行这些操作的 OpenClaw 工具。
- **感知沙箱** — 当工具上下文处于沙箱中时会被禁用。
- **加固** — 嵌入式运行器强制执行超时和输出上限。

## 故障排查

- **`lobster timed out`** → 增加 `timeoutMs`，或拆分较长流水线。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或减少输出大小。
- **`lobster returned invalid JSON`** → 确保流水线以工具模式运行并且只输出 JSON。
- **`lobster failed`** → 检查网关日志中的嵌入式运行器错误详情。

## 进一步了解

- [Plugins](/tools/plugin)
- [插件工具创作](/plugins/building-plugins#registering-agent-tools)

## 案例研究：社区工作流

一个公开例子：“第二大脑”CLI + Lobster 流水线，管理三个 Markdown 知识库（个人、伙伴、共享）。CLI 生成统计、收件箱列表和过期扫描的 JSON；Lobster 组合这些命令形成如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync` 等工作流，每个都有审批关卡。AI 负责判定（分类）时介入，无 AI 时则退用确定性规则。

- Thread: [https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- Repo: [https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相关内容

- [Automation & Tasks](/automation) — 调度 Lobster 工作流
- [Automation Overview](/automation) — 所有自动化机制
- [Tools Overview](/tools) — 所有可用的代理工具
