---
summary: "将可复用流程的实验性捕获作为工作区技能，支持审查、批准、隔离和热更新技能"
title: "技能工作坊插件"
read_when:
  - 你希望代理将修正或可复用流程转化为工作区技能
  - 你正在配置流程性技能记忆
  - 你正在调试 skill_workshop 工具行为
  - 你正在决定是否启用自动技能创建
---

Skill Workshop 是**实验性**的。它默认禁用，其捕获启发式和审查者提示可能会在不同版本之间变化，并且自动写入仅应在受信任的工作区中使用，且应先审查待处理模式的输出。

Skill Workshop 是工作区技能的流程性记忆。它允许代理将可复用的工作流、用户修正、来之不易的修复以及反复出现的坑点转化为位于以下路径下的 `SKILL.md` 文件：

```text
<workspace>/skills/<skill-name>/SKILL.md
```

这与长期记忆不同：

- **记忆** 存储事实、偏好、实体和过去上下文。
- **技能** 存储代理在未来任务中应遵循的可复用流程。
- **Skill Workshop** 是从一次有用的执行转变为持久化工作区技能的桥梁，带有安全检查和可选批准。

当代理学到如下流程时，Skill Workshop 很有用：

- 如何验证外部来源的动画 GIF 资源
- 如何替换截图资源并验证尺寸
- 如何运行仓库特定的 QA 场景
- 如何调试重复出现的提供方故障
- 如何修复过时的本地工作流说明

它不用于：

- 诸如“用户喜欢蓝色”之类的事实
- 广泛的自传式记忆
- 原始对话记录归档
- 密钥、凭证或隐藏提示文本
- 不会重复出现的一次性说明

## 默认状态

捆绑的插件是**实验性**的，并且默认**禁用**，除非在 `plugins.entries.skill-workshop` 中显式启用。

插件清单不会设置 `enabledByDefault: true`。插件配置模式中的 `enabled: true` 默认值，仅在插件条目已经被选中并加载之后才适用。

实验性意味着：

- 该插件足够支持选择加入测试和内部自用
- 提案存储、审查阈值和捕获启发式可以演进
- 待批准模式是推荐的起始模式
- 自动应用适用于受信任的个人/工作区设置，不适用于共享或恶意的高输入环境

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

使用此配置：

- `skill_workshop` 工具可用
- 显式的可复用修正会排队为待处理提案
- 基于阈值的审查器轮次可以提出技能更新
- 在待处理提案被应用之前，不会写入任何技能文件

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

`approvalPolicy: "auto"` 仍然使用相同的扫描器和隔离路径。它不会应用带有严重问题的提案。

## 配置

| 键                   | 默认值       | 范围 / 值                                   | 含义                                                                 |
| -------------------- | ------------ | ------------------------------------------- | -------------------------------------------------------------------- |
| `enabled`            | `true`       | boolean                                     | 在插件条目加载后启用插件。                                           |
| `autoCapture`        | `true`       | boolean                                     | 在代理成功执行后启用事后捕获/审查。                                  |
| `approvalPolicy`     | `"pending"`  | `"pending"`, `"auto"`                       | 将提案排队或自动写入安全提案。                                        |
| `reviewMode`         | `"hybrid"`   | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | 选择显式修正捕获、LLM 审查器、两者或都不使用。                         |
| `reviewInterval`     | `15`         | `1..200`                                    | 在这么多次成功执行后运行审查器。                                      |
| `reviewMinToolCalls` | `8`          | `1..500`                                    | 在观察到这么多次工具调用后运行审查器。                                |
| `reviewTimeoutMs`    | `45000`      | `5000..180000`                              | 内嵌审查器运行的超时时间。                                            |
| `maxPending`         | `50`         | `1..200`                                    | 每个工作区保留的待处理/隔离提案最大数量。                              |
| `maxSkillBytes`      | `40000`      | `1024..200000`                              | 生成的技能/支持文件最大大小。                                         |

推荐配置：

```json5
// 保守模式：仅显式使用工具，不自动捕获。
{
  autoCapture: false,
  approvalPolicy: "pending",
  reviewMode: "off",
}
```

```json5
// 先审查模式：自动捕获，但需要批准。
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
// 低成本：不调用审查器 LLM，仅使用显式修正短语。
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "heuristic",
}
```

## 捕获路径

Skill Workshop 有三条捕获路径。

### 工具建议

当模型看到可复用流程，或者用户要求保存/更新技能时，可以直接调用 `skill_workshop`。

这是最显式的路径，即使 `autoCapture: false` 也能工作。

### 启发式捕获

当启用 `autoCapture` 且 `reviewMode` 为 `heuristic` 或 `hybrid` 时，插件会扫描成功执行的轮次，查找显式的用户修正短语：

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

该启发式会从最新匹配的用户指令创建提案。它使用主题提示为常见工作流选择技能名称：

- 动画 GIF 任务 -> `animated-gif-workflow`
- 截图或资源任务 -> `screenshot-asset-workflow`
- QA 或场景任务 -> `qa-scenario-workflow`
- GitHub PR 任务 -> `github-pr-workflow`
- 兜底 -> `learned-workflows`

启发式捕获的范围故意很窄。它用于清晰的修正和可重复的流程记录，而不是通用的转录总结。

### LLM 审查器

当启用 `autoCapture` 且 `reviewMode` 为 `llm` 或 `hybrid` 时，插件会在达到阈值后运行一个精简的内嵌审查器。

审查器接收：

- 最近的对话文本，最多截取最后 12,000 个字符
- 最多 12 个现有工作区技能
- 每个现有技能最多 2,000 个字符
- 仅 JSON 的指令

审查器没有工具：

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

审查器返回 `{ "action": "none" }` 或一个提案。`action` 字段可以是 `create`、`append` 或 `replace`——当相关技能已存在时，优先使用 `append`/`replace`；只有在没有现有技能适配时才使用 `create`。

`create` 示例：

```json
{
  "action": "create",
  "skillName": "media-asset-qa",
  "title": "媒体资源 QA",
  "reason": "可复用的动画媒体验收流程",
  "description": "在产品使用前验证外部来源的动画媒体。",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution.\n- Store a local approved copy.\n- Verify in product UI before final reply."
}
```

`append` 会添加 `section` + `body`。`replace` 会在命名技能中用 `newText` 替换 `oldText`。

## 提案生命周期

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
- `quarantined` - 因严重扫描结果被阻止

状态存储在 Gateway 状态目录下、按工作区分别保存：

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

待处理和隔离提案会按技能名称和变更负载去重。存储会为每个工作区保留最新的待处理/隔离提案，最多 `maxPending` 个。

## 工具参考

插件注册了一个代理工具：

```text
skill_workshop
```

### `status`

统计当前工作区各状态的提案数量。

```json
{ "action": "status" }
```

结果格式：

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

列出被隔离的提案。

```json
{ "action": "list_quarantine" }
```

当自动捕获似乎没有生效，并且日志中提到 `skill-workshop: quarantined <skill>` 时使用此项。

### `inspect`

按 id 获取一个提案。

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

创建一个提案。在 `approvalPolicy: "pending"`（默认）下，这会排队而不是写入。

```json
{
  "action": "suggest",
  "skillName": "animated-gif-workflow",
  "title": "动画 GIF 工作流",
  "reason": "用户建立了可复用的 GIF 验证规则。",
  "description": "在使用动画 GIF 资源之前先进行验证。",
  "body": "## Workflow\n\n- Verify the URL resolves to image/gif.\n- Confirm it has multiple frames.\n- Record attribution and license.\n- Avoid hotlinking when a local asset is needed."
}
```

<AccordionGroup>
  <Accordion title="Request immediate write in auto mode (apply: true)">

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "在使用动画 GIF 资源之前先进行验证。",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

With `approvalPolicy: "pending"`, `apply: true` still queues the proposal. Review it, then use
the `apply` action after approval.

  </Accordion>

  <Accordion title="在自动策略下强制待处理（apply: false）">

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "截图替换工作流。",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

  </Accordion>

  <Accordion title="追加到指定章节">

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA 场景工作流。",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

  </Accordion>

  <Accordion title="替换完全匹配的文本">

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

  </Accordion>
</AccordionGroup>

### `apply`

应用一个待处理提案。

With `approvalPolicy: "pending"`, this action asks for operator approval before writing the
workspace skill.

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` 会拒绝被隔离的提案：

```text
quarantined proposal cannot be applied
```

### `reject`

将提案标记为已拒绝。

```json
{
  "action": "reject",
  "id": "proposal-id"
}
```

### `write_support_file`

在现有或已提议的技能目录中写入一个支持文件。

允许的顶层支持目录：

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
  "body": "# 发布检查清单\n\n- 运行发布文档。\n- 验证变更日志。\n"
}
```

支持文件是工作区范围的，会进行路径检查，受 `maxSkillBytes` 字节限制，经过扫描，并以原子方式写入。

## 技能写入

Skill Workshop 只会写入以下路径：

```text
<workspace>/skills/<normalized-skill-name>/
```

技能名称会被规范化为：

- 转为小写
- 将非 `[a-z0-9_-]` 的连续字符替换为 `-`
- 去除首尾非字母数字字符
- 最大长度为 80 个字符
- 最终名称必须匹配 `[a-z0-9][a-z0-9_-]{1,79}`

对于 `create`：

- 如果技能不存在，Skill Workshop 会写入一个新的 `SKILL.md`
- 如果技能已存在，Skill Workshop 会将正文追加到 `## Workflow`

对于 `append`：

- 如果技能存在，Skill Workshop 会追加到请求的章节
- 如果技能不存在，Skill Workshop 会先创建一个最小技能，然后再追加

对于 `replace`：

- 技能必须已经存在
- `oldText` 必须精确存在
- 只会替换第一个完全匹配项

所有写入都是原子性的，并会立即刷新内存中的技能快照，因此新的或更新后的技能无需重启 Gateway 就可能变为可见。

## 安全模型

Skill Workshop 对生成的 `SKILL.md` 内容和支持文件进行安全扫描。

关键发现会将提案隔离：

| 规则 id                                | 会阻止包含以下内容的内容...                                            |
| -------------------------------------- | --------------------------------------------------------------------- |
| `prompt-injection-ignore-instructions` | 告诉代理忽略先前/更高优先级指令                                          |
| `prompt-injection-system`              | 提及系统提示、开发者消息或隐藏指令                                        |
| `prompt-injection-tool`                | 鼓励绕过工具权限/审批                                                   |
| `shell-pipe-to-shell`                  | 包含将 `curl`/`wget` 通过管道传给 `sh`、`bash` 或 `zsh` 的内容           |
| `secret-exfiltration`                  | 看起来会通过网络发送环境变量/进程环境数据                                 |

警告类发现会保留，但不会单独阻止：

| 规则 id              | 警告内容...                  |
| -------------------- | --------------------------- |
| `destructive-delete` | 大范围 `rm -rf` 风格命令    |
| `unsafe-permissions` | `chmod 777` 风格权限使用    |

被隔离的提案：

- 保留 `scanFindings`
- 保留 `quarantineReason`
- 出现在 `list_quarantine`
- 不能通过 `apply` 应用

要从被隔离的提案中恢复，请创建一个新的安全提案，并移除不安全内容。不要手动编辑 store JSON。

## 提示指导

启用后，Skill Workshop 会注入一段简短的提示，告诉代理使用 `skill_workshop` 来保存持久化的过程性记忆。

该指导强调：

- 过程，而不是事实/偏好
- 用户纠正
- 非显而易见且成功的流程
- 反复出现的坑
- 通过 append/replace 修复陈旧、单薄或错误的技能
- 在长工具循环或疑难修复后保存可复用的流程
- 简短的祈使句式技能文本
- 不要转录对话内容

写入模式文本会随 `approvalPolicy` 变化：

- pending mode: queue suggestions; use `apply` after explicit approval
- auto mode: apply safe workspace-skill updates unless `apply: false` queues instead

## 成本和运行时行为

启发式捕获不会调用模型。

LLM 审查会在当前/默认代理模型上运行一个嵌入式执行。它是基于阈值的，因此默认不会在每一轮都运行。

审查器：

- 在可用时使用相同配置的提供方/模型上下文
- 否则回退到运行时代理默认值
- 具有 `reviewTimeoutMs`
- 使用轻量级启动上下文
- 没有工具
- 不会直接写入任何内容
- 只能生成一个会经过正常扫描器以及审批/隔离路径的提案

如果审查器失败、超时或返回无效 JSON，插件会记录一条警告/调试信息，并跳过该次审查。

## 运行模式

当用户说以下内容时，使用 Skill Workshop：

- "next time, do X"
- "from now on, prefer Y"
- "make sure to verify Z"
- "save this as a workflow"
- "this took a while; remember the process"
- "update the local skill for this"

好的技能文本：

```markdown
## 工作流

- 验证 GIF URL 能解析为 `image/gif`。
- 确认文件包含多个帧。
- 记录源 URL、许可证和署名信息。
- 当资源会随产品一起发布时，存储一份本地副本。
- 在最终回复前，验证本地资源能在目标 UI 中正确渲染。
```

不好的技能文本：

```markdown
用户问了一个 GIF，我搜索了两个网站。然后其中一个被 Cloudflare 拦截了。最终答案说要检查署名。
```

不应保存不良版本的原因：

- 具有对话转录特征
- 不是祈使式
- 包含噪声式的一次性细节
- 没有告诉下一位代理该做什么

## 调试

检查插件是否已加载：

```bash
openclaw plugins list --enabled
```

从 agent/tool 上下文检查提案数量：

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

| 症状                               | 可能原因                                                                         | 检查                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 工具不可用                         | 插件条目未启用                                                                    | `plugins.entries.skill-workshop.enabled` 和 `openclaw plugins list` |
| 没有自动出现提案                   | `autoCapture: false`、`reviewMode: "off"`，或未达到阈值                             | 配置、提案状态、Gateway 日志                                           |
| 启发式未捕获                       | 用户措辞未匹配纠正模式                                                             | 使用显式的 `skill_workshop.suggest` 或启用 LLM 审查器                  |
| 审查器未创建提案                   | 审查器返回 `none`、无效 JSON 或超时                                               | Gateway 日志、`reviewTimeoutMs`、阈值                                  |
| 提案未被应用                       | `approvalPolicy: "pending"`                                                       | `list_pending`，然后 `apply`                                          |
| 提案从待处理中消失                 | 重复提案被复用、超过待处理数量被清理，或已被应用/拒绝/隔离                        | `status`、带状态过滤的 `list_pending`、`list_quarantine`             |
| 技能文件存在但模型看不到它         | 技能快照未刷新，或技能门控将其排除                                                 | `openclaw skills` 状态和工作区技能可用性                               |

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

运行审查器覆盖：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

审查器场景是刻意单独设置的，因为它启用了 `reviewMode: "llm"` 并会执行嵌入式审查器流程。

## 何时不要启用自动应用

以下情况避免使用 `approvalPolicy: "auto"`：

- 工作区包含敏感流程
- 代理正在处理不受信任的输入
- 技能会在更广泛的团队中共享
- 你仍在调试提示词或扫描器规则
- 模型经常处理带有恶意内容的网页/邮件

先使用 pending 模式。只有在审查过该工作区中代理提出的技能类型之后，才切换到 auto 模式。

## 相关文档

- [Skills](/tools/skills)
- [Plugins](/tools/plugin)
- [Testing](/reference/test)
