---
summary: "代理工作区路径、引导注入、上下文预算、图像处理和时区"
read_when:
  - "选择代理读取和写入文件的位置"
  - "调整引导注入或上下文预算"
  - "调整入站图像缩放或代理时区"
title: "配置——代理工作区和引导程序"
---

`agents.defaults.*` 用于文件系统范围、引导上下文注入、上下文预算映射、入站图像处理和代理时区的密钥。

## `agents.defaults.workspace`

默认值：设置时为 `OPENCLAW_WORKSPACE_DIR`，否则为 `<state-dir>/workspace`。对于默认安装，这是 `~/.openclaw/workspace`；对于命名配置文件，这是 `~/.openclaw-<profile>/workspace`。自定义 `OPENCLAW_STATE_DIR` 将工作区保留在该状态目录下。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

显式 `agents.defaults.workspace` 值优先于 `OPENCLAW_WORKSPACE_DIR`。独家代理直接使用此路径。在多代理队列中，没有自己的 `workspace` 的代理使用代理 id 子目录，因此没有隐式所有者声明共享根。

## `agents.defaults.cwd`

代理回复运行的可选工作目录。使用它在现有存储库中运行编码工具，同时引导文件（`AGENTS.md`、`SOUL.md`）和内存保留在托管代理工作区中。

```json5
{
  agents: {
    defaults: { workspace: "~/.openclaw/workspace" },
    entries: { coder: { cwd: "~/path/to/app", sandbox: { mode: "off" } } },
  },
}
```

会话生成的工作目录优先，然后是 `agents.entries.*.cwd`，然后是 `agents.defaults.cwd`。如果未设置，工具将使用代理工作区。路径像`workspace`一样扩展`~`；相对路径根据网关进程工作目录进行解析。不同的工作目录需要非沙盒运行；沙盒运行会拒绝它。当目录不同时，系统提示符会识别它们各自的角色，以便可交付成果保留在工作目录中。

## `agents.defaults.repoRoot`

可选的仓库根目录，将显示在系统提示词的运行时行中。如果未设置，OpenClaw 将通过从工作区向上遍历自动检测它。

```json5
{
  agents: { defaults: { repoRoot: "~/path/to/openclaw" } },
}
```

## `agents.defaults.skills`

对于未设置 `agents.entries.*.skills` 的代理，可选的默认技能允许列表。

```json5
{
  agents: {
    ownership: "explicit",
    defaults: { skills: ["github", "weather"] },
    entries: {
      writer: {}, // inherits github, weather
      docs: { skills: ["docs-search"] }, // replaces defaults
      "locked-down": { skills: [] }, // no skills
    },
  },
}
```

- 默认情况下，对于不受限制的技能，省略 `agents.defaults.skills`。
- 省略 `agents.entries.*.skills` 以继承默认值。
- 设置 `agents.entries.*.skills: []` 为无技能。
- 非空的 `agents.entries.*.skills` 列表是该代理的最终技能集合；它不会与默认值合并。

## `agents.defaults.skipBootstrap`

禁用工作区引导程序文件（`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`BOOTSTRAP.md`）的自动创建，而不是现有文件的注入。对于嵌入式运行时，请使用 `contextInjection: "never"` 禁用注入，除非每个代理都覆盖。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

## `agents.defaults.skipOptionalBootstrapFiles`

跳过创建选定的可选工作区文件，同时仍写入必需的引导文件（`AGENTS.md`、`BOOTSTRAP.md`）。有效值：`SOUL.md`、`USER.md` 和 `IDENTITY.md`（接受 `HEARTBEAT.md`，但不执行任何操作，因为心跳上下文已移至 cron 监控临时文件）。

```json5
{
  agents: {
    defaults: {
      skipOptionalBootstrapFiles: ["SOUL.md", "USER.md"],
    },
  },
}
```

## `agents.defaults.contextInjection`

控制嵌入式运行时中的工作区引导文件注入。默认值：`"always"`。这些模式不控制 CLI- 支持的提示准备或阻止代理使用工具读取文件。

- `"always"`：使用正常的工作区引导注入，取决于运行的上下文模式和文件过滤器。
- `"continuation-skip"`：在成功交付工作区上下文跳过引导程序重新注入的成功转向后，合格的延续转向，包括已完成设置的工作区。失败、中止、轻量级、cron 和心跳轮次不记录完成情况；无法读取的文件将在下一轮重试。挂起的完全引导设置和压缩后重试仍然使用正常的上下文解析。
- `"never"`：在每个回合中禁用工作区引导程序和上下文文件注入，包括心跳和压缩恢复回合。将此用于具有专门的无引导工作流程的嵌入式代理。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

每个代理的覆盖设置：`agents.entries.*.contextInjection`。省略的值继承 `agents.defaults.contextInjection`。

## `agents.defaults.bootstrapMaxChars`

截断前每个工作区引导文件的最大字符数。默认值：`20000`。例外：`USER.md` 具有固定的 4,000 个字符上限；对于`USER.md`，此设置只能降低它，而不能提高它。请参见 [ 用户模型 ](/concepts/user-model)。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

每个代理的覆盖设置：`agents.entries.*.bootstrapMaxChars`。省略的值继承 `agents.defaults.bootstrapMaxChars`。

## `agents.defaults.bootstrapTotalMaxChars`

跨所有工作区引导文件注入的最大总字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

按代理覆盖：`agents.entries.*.bootstrapTotalMaxChars`。省略的值将继承 `agents.defaults.bootstrapTotalMaxChars`。

## <a id="per-agent-bootstrap-profile-overrides"></a> 每代理引导程序配置文件覆盖

当某个代理需要与共享默认值不同的提示词注入行为时，可使用逐代理引导配置文件覆盖。省略的字段会继承自 `agents.defaults`。

```json5
{
  agents: {
    defaults: {
      contextInjection: "continuation-skip",
      bootstrapMaxChars: 20000,
      bootstrapTotalMaxChars: 60000,
    },
    entries: {
      "strict-worker": {
        contextInjection: "always",
        bootstrapMaxChars: 50000,
        bootstrapTotalMaxChars: 300000,
      },
    },
  },
}
```

## <a id="bootstrap-truncation-notice"></a> Bootstrap 截断通知

当引导上下文被截断时，OpenClaw 始终会在系统提示符中注入简洁的代理可见通知，说明某些引导文件被截断并直接读取受影响的文件。此通知是内置的且不可配置，并且它故意省略每个文件的诊断：文件名、原始计数与注入计数以及限制原因保留在诊断中，例如 context/status 报告和日志。

## <a id="context-budget-ownership-map"></a> 上下文预算所有权图

OpenClaw 具有多个大容量 prompt/context 预算，并且它们有意按子系统划分，而不是全部流经一个通用旋钮。

| 预算                                                         | 覆盖范围                                                                                                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents.defaults.bootstrapMaxChars` / `bootstrapTotalMaxChars` | 普通工作区引导注入                                                                                                                            |
| `agents.defaults.startupContext.*`                             | 一次性reset/startup模型运行前奏，包括最近的每日`memory/*.md`文件。无需调用模型即可确认裸聊天 `/new` 和 `/reset` |
| `skills.limits.*`                                              | 注入系统提示词中的紧凑技能列表                                                                                                         |
| `agents.defaults.contextLimits.*`                              | 有边界的运行时摘录和注入的运行时所有方区块                                                                                                      |

匹配的按代理覆盖：

- `agents.entries.*.skillsLimits.maxSkillsPromptChars`
- `agents.entries.*.contextInjection`
- `agents.entries.*.bootstrapMaxChars`
- `agents.entries.*.bootstrapTotalMaxChars`
- `agents.entries.*.contextLimits.*`

### `agents.defaults.startupContext`

控制 reset/startup 模型运行上注入的首轮启动前奏。裸聊天 `/new` 和 `/reset` 命令在不调用模型的情况下确认重置，因此它们不会加载此前奏。

```json5
{
  agents: {
    defaults: {
      startupContext: {
        enabled: true,
        applyOn: ["new", "reset"],
        dailyMemoryDays: 2,
        maxFileBytes: 16384,
        maxFileChars: 1200,
        maxTotalChars: 2800,
      },
    },
  },
}
```

### `agents.defaults.contextLimits`

有边界的运行时上下文表面的共享默认值。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`：截断前的默认 `memory_get` 摘录上限。 添加元数据和续接提示后，内容可能会进一步增加。
- 当 `memory_get` 未指定 `lines` 时，OpenClaw 使用内置的 120 行窗口， 然后应用 `memoryGetMaxChars`。
- 实时工具结果使用模型上下文自动上限：低于 100K 个 token 时为 `16000` 个字符， 达到 100K+ 个 token 时为 `32000` 个字符，达到 200K+ 个 token 时为 `64000` 个字符。
- `postCompactionMaxChars`：压缩后刷新注入期间所使用的 AGENTS.md 摘录上限。

### `agents.entries.*.contextLimits`

针对共享 `contextLimits` 开关的逐代理覆盖。省略的字段会继承自 `agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: { memoryGetMaxChars: 12000 },
    },
    entries: {
      "tiny-local": {
        contextLimits: {
          memoryGetMaxChars: 6000,
        },
      },
    },
  },
}
```

### `skills.limits.maxSkillsPromptChars`

注入系统提示词中的紧凑技能列表的全局上限。这不会影响按需读取 `SKILL.md` 文件。

```json5
{
  skills: { limits: { maxSkillsPromptChars: 18000 } },
}
```

### `agents.entries.*.skillsLimits.maxSkillsPromptChars`

针对技能提示词预算的逐代理覆盖。

```json5
{
  agents: {
    entries: {
      "tiny-local": { skillsLimits: { maxSkillsPromptChars: 6000 } },
    },
  },
}
```

## `agents.defaults.imageMaxDimensionPx`

提供者调用之前 transcript/tool 图像块中最长图像边的最大像素大小。默认值：`1200`。

较低的值通常会减少视觉 token 的使用量以及截图较多的运行中的请求负载大小。 较高的值会保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

## `agents.defaults.imageQuality`

图像工具 compression/detail 对从文件路径、URL 和媒体引用加载的图像的偏好。默认值：`auto`。

OpenClaw 使调整大小阶梯适应所选的图像模型。例如，Claude Opus 4.8、OpenAI GPT-6 Astra、Qwen VL 和托管 Llama 4 视觉模型可以使用比older/default 高细节视觉路径，而多图像转弯在 `auto` 模式下被更积极地压缩，以控制令牌和延迟成本。

价值观：

- `auto`：根据模型限制和图像数量自适应。
- `efficient`：优先更小的图像，以降低 token 和字节使用量。
- `balanced`：使用标准的中间梯度。
- `high`：为截图、图表和文档图像保留更多细节。

```json5
{
  agents: { defaults: { imageQuality: "auto" } },
}
```

## `agents.defaults.userTimezone`

消息信封、排队的系统事件以及系统提示词本地日期上下文所使用的时区。默认使用主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```
