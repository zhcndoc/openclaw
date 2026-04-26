---
summary: "将可复用流程的实验性捕获作为工作区技能，并进行审阅、批准、隔离和热刷新"
title: "技能工作坊插件"
read_when:
  - 你希望代理将修正或可复用流程转化为工作区技能
  - 你正在配置流程性技能记忆
  - 你正在调试 skill_workshop 工具行为
  - 你正在决定是否启用自动创建技能
---

Skill Workshop 是**实验性**的。它默认处于禁用状态，其捕获
启发式规则和审阅者提示词可能会在不同版本之间发生变化，而且自动
写入只应在受信任的工作区中使用，并且应先查看待处理模式的
输出。

Skill Workshop 是工作区技能的流程性记忆。它允许代理将
可复用的工作流、用户修正、来之不易的修复，以及反复出现的陷阱
转换为位于以下路径下的 `SKILL.md` 文件：

```text
<workspace>/skills/<skill-name>/SKILL.md
```

这与长期记忆不同：

- **记忆** 存储事实、偏好、实体和过去的上下文。
- **技能** 存储代理在未来任务中应遵循的可复用流程。
- **Skill Workshop** 是从一次有用的执行过程到持久化工作区
  技能的桥梁，带有安全检查和可选审批。

Skill Workshop 适用于代理学习如下流程时：

- 如何验证外部来源的动画 GIF 资源
- 如何替换截图资源并验证尺寸
- 如何运行特定仓库的 QA 场景
- 如何调试重复出现的提供方失败
- 如何修复过时的本地工作流笔记

它不适用于：

- 像“用户喜欢蓝色”这样的事实
- 广泛的自传式记忆
- 原始对话记录归档
- 秘密、凭证或隐藏提示文本
- 不会重复的一次性指令

## Default state

内置插件是**实验性**的，并且默认**禁用**，除非在
`plugins.entries.skill-workshop` 中显式启用。

插件清单不会设置 `enabledByDefault: true`。插件配置 schema 中的
`enabled: true` 默认值，仅在插件条目
已经被选中并加载之后才生效。

实验性意味着：

- 该插件已经足够支持自愿试用和内部自用
- 提案存储、审阅阈值和捕获启发式规则可能会演进
- 待批准模式是推荐的起始模式
- 自动应用适用于受信任的个人/工作区配置，不适用于共享或敌对的
  高输入量环境

## 启用

最小安全配置：

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "pending",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

使用此配置时：

- `skill_workshop` 工具可用
- 显式的可复用修正会排队为待处理提案
- 基于阈值的审阅流程可以提议技能更新
- 在应用待处理提案之前，不会写入任何技能文件

仅在受信任的工作区中使用自动写入：

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "auto",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

`approvalPolicy: "auto"` 仍然使用相同的扫描器和隔离路径。它
不会应用带有严重问题的提案。

## 配置

| 键                  | 默认值      | 范围 / 值                                   | 含义                                                                 |
| -------------------- | ----------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `enabled`            | `true`      | boolean                                     | 在插件条目加载后启用插件。                                           |
| `autoCapture`        | `true`      | boolean                                     | 在代理成功完成轮次后启用后处理捕获/审阅。                             |
| `approvalPolicy`     | `"pending"` | `"pending"`, `"auto"`                       | 排队提案或自动写入安全提案。                                         |
| `reviewMode`         | `"hybrid"`  | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | 选择显式修正捕获、LLM 审阅者、两者都用或都不用。                      |
| `reviewInterval`     | `15`        | `1..200`                                    | 在经过这么多次成功轮次后运行审阅者。                                   |
| `reviewMinToolCalls` | `8`         | `1..500`                                    | 在观察到这么多次工具调用后运行审阅者。                                 |
| `reviewTimeoutMs`    | `45000`     | `5000..180000`                              | 内嵌审阅运行的超时时间。                                              |
| `maxPending`         | `50`        | `1..200`                                    | 每个工作区保留的待处理/隔离提案上限。                                  |
| `maxSkillBytes`      | `40000`     | `1024..200000`                              | 生成的技能/支持文件最大大小。                                         |

推荐配置：

```json5
// 保守模式：仅显式工具使用，不自动捕获。
{
  autoCapture: false,
  approvalPolicy: "pending",
  reviewMode: "off",
}
```

```json5
// 先审阅模式：自动捕获，但需要批准。
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "hybrid",
}
```

```json5
// 受信任自动化：立即写入安全提案。
{
  autoCapture: true,
  approvalPolicy: "auto",
  reviewMode: "hybrid",
}
```

```json5
// 低成本：不调用审阅者 LLM，仅使用显式修正短语。
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "heuristic",
}
```

## Capture paths

Skill Workshop 有三种捕获路径。

### Tool suggestions

当模型看到可复用流程，或用户要求保存/更新技能时，
可以直接调用 `skill_workshop`。

这是最显式的路径，即使在 `autoCapture: false` 时也可工作。

### Heuristic capture

当启用 `autoCapture` 且 `reviewMode` 为 `heuristic` 或 `hybrid` 时，
插件会扫描成功轮次中的显式用户修正短语：

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

该启发式规则会从最新匹配的用户指令生成提案。它使用主题提示
为常见工作流选择技能名称：

- 动画 GIF 任务 -> `animated-gif-workflow`
- 截图或资源任务 -> `screenshot-asset-workflow`
- QA 或场景任务 -> `qa-scenario-workflow`
- GitHub PR 任务 -> `github-pr-workflow`
- 回退 -> `learned-workflows`

启发式捕获的范围故意很窄。它用于清晰的修正和
可重复的流程笔记，而不是一般性的对话摘要。

### LLM reviewer

当启用 `autoCapture` 且 `reviewMode` 为 `llm` 或 `hybrid` 时，
插件会在达到阈值后运行一个精简的嵌入式审阅者。

审阅者接收：

- 最近的对话文本，最多截取最后 12,000 个字符
- 最多 12 个现有工作区技能
- 每个现有技能最多 2,000 个字符
- 仅 JSON 的指令

审阅者没有工具：

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

审阅者返回 `{ "action": "none" }` 或一个提案。`action` 字段可以是 `create`、`append` 或 `replace`——当相关技能已存在时优先使用 `append`/`replace`；仅当没有现有技能适配时才使用 `create`。

示例 `create`：

```json
{
  "action": "create",
  "skillName": "media-asset-qa",
  "title": "媒体资源 QA",
  "reason": "可复用的动画媒体验收工作流",
  "description": "在产品使用前验证外部来源的动画媒体。",
  "body": "## 工作流\n\n- 验证确实为动画。\n- 记录归属信息。\n- 存储本地已批准副本。\n- 在最终回复前于产品 UI 中验证。"
}
```

`append` 会添加 `section` + `body`。`replace` 会在命名技能中将 `oldText` 替换为 `newText`。

## Proposal lifecycle

每个生成的更新都会成为一个提案，包含：

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- 可选的 `agentId`
- 可选的 `sessionId`
- `skillName`
- `title`
- `reason`
- `source`: `tool`、`agent_end` 或 `reviewer`
- `status`
- `change`
- 可选的 `scanFindings`
- 可选的 `quarantineReason`

提案状态：

- `pending` - 等待批准
- `applied` - 已写入 `<workspace>/skills`
- `rejected` - 被操作员/模型拒绝
- `quarantined` - 被严重扫描结果阻止

状态按工作区存储在 Gateway 状态目录下：

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

待处理和隔离提案会按技能名称和变更负载去重。存储会保留
最新的待处理/隔离提案，最多不超过 `maxPending`。

## Tool reference

该插件注册一个代理工具：

```text
skill_workshop
```

### `status`

统计当前工作区中各状态的提案数量。

```json
{ "action": "status" }
```

结果结构：

```json
{
  "workspaceDir": "/path/to/workspace",
  "pending": 1,
  "quarantined": 0,
  "applied": 3,
  "rejected": 0
}
```

### `list_pending`

列出待处理提案。

```json
{ "action": "list_pending" }
```

要列出其他状态：

```json
{ "action": "list_pending", "status": "applied" }
```

有效的 `status` 值：

- `pending`
- `applied`
- `rejected`
- `quarantined`

### `list_quarantine`

列出已隔离提案。

```json
{ "action": "list_quarantine" }
```

当自动捕获看起来没有任何作用，并且日志中提到
`skill-workshop: quarantined <skill>` 时，请使用此命令。

### `inspect`

按 id 获取一个提案。

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

创建一个提案。使用 `approvalPolicy: "pending"`（默认）时，会将其排队而不是写入。

```json
{
  "action": "suggest",
  "skillName": "animated-gif-workflow",
  "title": "动画 GIF 工作流",
  "reason": "用户建立了可复用的 GIF 验证规则。",
  "description": "在使用动画 GIF 资产前进行验证。",
  "body": "## 工作流\n\n- 验证 URL 是否解析为 image/gif。\n- 确认它包含多个帧。\n- 记录归属与许可。\n- 在需要本地资源时避免热链。"
}
```

<AccordionGroup>
  <Accordion title="强制安全写入（apply: true）">

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "在使用动画 GIF 资产前进行验证。",
  "body": "## 工作流\n\n- 验证确实为动画。\n- 记录归属信息。"
}
```

  </Accordion>

  <Accordion title="在自动策略下强制进入待处理（apply: false）">

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "截图替换工作流。",
  "body": "## 工作流\n\n- 验证尺寸。\n- 优化 PNG。\n- 运行相关门禁。"
}
```

  </Accordion>

  <Accordion title="追加到指定部分">

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA 场景工作流。",
  "body": "- 对于媒体 QA，验证生成的资源可正确渲染并通过最终断言。"
}
```

  </Accordion>

  <Accordion title="替换精确文本">

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- 检查 PR。",
  "newText": "- 在决定前检查未解决的审阅线程、CI 状态、关联问题和变更文件。"
}
```

  </Accordion>
</AccordionGroup>

### `apply`

应用一个待处理提案。

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` 会拒绝已隔离的提案：

```text
quarantined proposal cannot be applied
```

### `reject`

将一个提案标记为已拒绝。

```json
{
  "action": "reject",
  "id": "proposal-id"
}
```

### `write_support_file`

在现有或提议中的技能目录内写入一个支持文件。

允许的顶级支持目录：

- `references/`
- `templates/`
- `scripts/`
- `assets/`

示例：

```json
{
  "action": "write_support_file",
  "skillName": "release-workflow",
  "relativePath": "references/checklist.md",
  "body": "# 发布检查清单\n\n- 运行发布文档。\n- 验证更新日志。\n"
}
```

支持文件按工作区范围管理，会进行路径检查，受 `maxSkillBytes`
字节限制，经过扫描，并以原子方式写入。

## Skill writes

Skill Workshop 仅会写入以下路径下：

```text
<workspace>/skills/<normalized-skill-name>/
```

技能名称会被标准化为：

- 转为小写
- 非 `[a-z0-9_-]` 的连续字符会替换为 `-`
- 去除首尾非字母数字字符
- 最大长度为 80 个字符
- 最终名称必须匹配 `[a-z0-9][a-z0-9_-]{1,79}`

对于 `create`：

- 如果技能不存在，Skill Workshop 会写入一个新的 `SKILL.md`
- 如果它已存在，Skill Workshop 会将正文追加到 `## Workflow`

对于 `append`：

- 如果技能存在，Skill Workshop 会追加到请求的部分
- 如果它不存在，Skill Workshop 会先创建一个最小技能，然后再追加

对于 `replace`：

- 技能必须已存在
- `oldText` 必须精确存在
- 只会替换第一个精确匹配项

所有写入都是原子的，并且会立即刷新内存中的技能快照，因此
新的或更新后的技能无需 Gateway 重启就可能变得可见。

## Safety model

Skill Workshop 会对生成的 `SKILL.md` 内容和支持文件运行安全扫描器。

关键问题会将提案隔离：

| 规则 ID                               | 会阻止包含以下内容：                                         |
| -------------------------------------- | ------------------------------------------------------------ |
| `prompt-injection-ignore-instructions` | 指示代理忽略先前/更高优先级指令                               |
| `prompt-injection-system`              | 提及系统提示、开发者消息或隐藏指令                             |
| `prompt-injection-tool`                | 鼓励绕过工具权限/审批                                         |
| `shell-pipe-to-shell`                  | 包含将 `curl`/`wget` 通过管道传递给 `sh`、`bash` 或 `zsh`      |
| `secret-exfiltration`                  | 看起来会通过网络发送环境变量/进程环境数据                     |

警告类问题会保留，但不会单独阻止：

| 规则 ID              | 警告内容为...                      |
| -------------------- | ---------------------------------- |
| `destructive-delete` | 广泛的 `rm -rf` 类命令              |
| `unsafe-permissions` | `chmod 777` 类权限使用             |

被隔离的提案：

- 保留 `scanFindings`
- 保留 `quarantineReason`
- 出现在 `list_quarantine` 中
- 不能通过 `apply` 应用

要从被隔离的提案中恢复，请创建一个新的安全提案，并移除不安全内容。不要手动编辑 store JSON。

## 提示指引

启用后，Skill Workshop 会注入一小段提示，告诉代理使用 `skill_workshop` 来保存持久化的过程性记忆。

该指导强调：

- 流程，而不是事实/偏好
- 用户纠正
- 非显而易见的成功流程
- 反复出现的陷阱
- 通过 append/replace 修复陈旧、稀薄或错误的技能
- 在长工具循环或棘手修复后保存可复用流程
- 简短的祈使式技能文本
- 不要转储对话记录

写入模式文本会随着 `approvalPolicy` 而变化：

- pending 模式：排队建议；仅在明确批准后应用
- auto 模式：当工作区技能明显可复用时，自动应用安全的更新

## 成本和运行时行为

启发式捕获不会调用模型。

LLM 审核使用活动/默认代理模型上的内嵌运行。它基于阈值，因此默认不会在每一轮都运行。

审核器：

- 在可用时使用相同配置的 provider/model 上下文
- 回退到运行时代理默认值
- 具有 `reviewTimeoutMs`
- 使用轻量级启动上下文
- 没有工具
- 不会直接写入任何内容
- 只能发出一个会经过正常扫描器和审批/隔离流程的提案

如果审核器失败、超时或返回无效 JSON，插件会记录警告/调试消息，并跳过该次审核。

## 操作模式

当用户说以下内容时使用 Skill Workshop：

- “下次，做 X”
- “从现在开始，优先 Y”
- “一定要验证 Z”
- “把这个保存为工作流程”
- “这个花了很久；记住这个过程”
- “更新这个本地技能”

好的技能文本：

```markdown
## 工作流

- 验证 GIF URL 能解析为 `image/gif`。
- 确认文件有多个帧。
- 记录源 URL、许可证和署名。
- 当资源会随产品一起交付时，保存本地副本。
- 在最终回复前验证本地资源能在目标 UI 中渲染。
```

不好的技能文本：

```markdown
用户问了一个 GIF，我搜索了两个网站。然后其中一个被 Cloudflare 拦截了。最终答案说要检查署名。
```

不应保存不佳版本的原因：

- 具有对话记录形态
- 不是祈使句
- 包含噪声性的单次细节
- 没有告诉下一位代理应该怎么做

## 调试

检查插件是否已加载：

```bash
openclaw plugins list --enabled
```

从代理/工具上下文检查提案数量：

```json
{ "action": "status" }
```

查看待处理提案：

```json
{ "action": "list_pending" }
```

查看被隔离的提案：

```json
{ "action": "list_quarantine" }
```

常见症状：

| 症状                                  | 可能原因                                                                         | 检查                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 工具不可用                            | 插件条目未启用                                                                   | `plugins.entries.skill-workshop.enabled` 和 `openclaw plugins list` |
| 没有自动提案出现                      | `autoCapture: false`、`reviewMode: "off"`，或未达到阈值                          | 配置、提案状态、Gateway 日志                                          |
| 启发式未捕获                          | 用户措辞不符合纠正模式                                                           | 使用明确的 `skill_workshop.suggest` 或启用 LLM 审核器               |
| 审核器未创建提案                      | 审核器返回 `none`、无效 JSON，或超时                                             | Gateway 日志、`reviewTimeoutMs`、阈值                                 |
| 提案未被应用                          | `approvalPolicy: "pending"`                                                      | `list_pending`，然后 `apply`                                          |
| 提案从待处理中消失                    | 重复提案被复用、超过待处理上限被修剪，或已被应用/拒绝/隔离                    | `status`、带状态过滤的 `list_pending`、`list_quarantine`            |
| 技能文件存在但模型看不到              | 技能快照未刷新，或技能门控将其排除                                               | `openclaw skills` 状态和工作区技能可用性                              |

相关日志：

- `skill-workshop: queued <skill>`
- `skill-workshop: applied <skill>`
- `skill-workshop: quarantined <skill>`
- `skill-workshop: heuristic capture skipped: ...`
- `skill-workshop: reviewer skipped: ...`
- `skill-workshop: reviewer found no update`

## QA 场景

基于仓库的 QA 场景：

- `qa/scenarios/plugins/skill-workshop-animated-gif-autocreate.md`
- `qa/scenarios/plugins/skill-workshop-pending-approval.md`
- `qa/scenarios/plugins/skill-workshop-reviewer-autonomous.md`

运行确定性覆盖：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

运行审核器覆盖：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

审核器场景被刻意单独分离，因为它启用了
`reviewMode: "llm"` 并会执行内嵌审核器流程。

## 何时不要启用自动应用

在以下情况下避免使用 `approvalPolicy: "auto"`：

- 工作区包含敏感流程
- 代理正在处理不受信任的输入
- 技能会在更大的团队范围内共享
- 你仍在调试提示词或扫描规则
- 模型经常处理恶意网页/邮件内容

请先使用 pending 模式。只有在审查了该工作区中代理提议的技能类型之后，才切换到 auto 模式。

## 相关文档

- [技能](/tools/skills)
- [插件](/tools/plugin)
- [测试](/reference/test)
