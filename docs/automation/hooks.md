---
summary: "钩子：针对命令和生命周期事件的事件驱动自动化"
read_when:
  - 您需要针对 /new、/reset、/stop 以及代理生命周期事件的事件驱动自动化
  - 您想要构建、安装或调试钩子
title: "钩子"
---

钩子是在 Gateway 内部发生某些事情时运行的小脚本。它们可以从目录中发现，并通过 `openclaw hooks` 进行检查。只有在您启用钩子，或至少配置了一个钩子条目、钩子包、旧版处理器或额外钩子目录后，Gateway 才会加载内部钩子。

OpenClaw 中有两种钩子：

- **内部钩子**（本页）：当代理事件触发时在网关内部运行，例如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP 端点，允许其他系统触发 OpenClaw 中的工作。请参阅 [Webhooks](/automation/cron-jobs#webhooks)。

钩子也可以捆绑在插件中。`openclaw hooks list` 会显示独立钩子和插件管理的钩子。

## 快速开始

```bash
# 列出可用的钩子
openclaw hooks list

# 启用钩子
openclaw hooks enable session-memory

# 检查钩子状态
openclaw hooks check

# 获取详细信息
openclaw hooks info session-memory
```

## 事件类型

| 事件                     | 触发时机                                    |
| ------------------------ | ------------------------------------------------ |
| `command:new`            | 发出 `/new` 命令                            |
| `command:reset`          | 发出 `/reset` 命令                          |
| `command:stop`           | 发出 `/stop` 命令                           |
| `command`                | 任何命令事件（通用监听器）             |
| `session:compact:before` | 在压缩总结历史之前             |
| `session:compact:after`  | 在压缩完成后                       |
| `session:patch`          | 当会话属性被修改时             |
| `agent:bootstrap`        | 在工作区引导文件注入之前        |
| `gateway:startup`        | 在通道启动且钩子加载之后        |
| `message:received`       | 来自任何通道的传入消息                 |
| `message:transcribed`    | 在音频转录完成后              |
| `message:preprocessed`   | 在所有媒体和链接理解完成后 |
| `message:sent`           | 传出消息已交付                       |

## 编写钩子

### 钩子结构

每个钩子是一个包含两个文件的目录：

```
my-hook/
├── HOOK.md          # 元数据和文档
└── handler.ts       # 处理器实现
```

### HOOK.md 格式

```markdown
---
name: my-hook
description: "此钩子功能的简短描述"
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# 我的 Hook

详细的文档内容写在这里。
```

**元数据字段** (`metadata.openclaw`)：

| 字段      | 描述                                          |
| ---------- | ---------------------------------------------------- |
| `emoji`    | CLI 显示的 emoji                                |
| `events`   | 要监听的事件数组                        |
| `export`   | 要使用的命名导出（默认为 `"default"`）        |
| `os`       | 所需的平台（例如 `["darwin", "linux"]`）     |
| `requires` | 所需的 `bins`、`anyBins`、`env` 或 `config` 路径 |
| `always`   | 绕过资格检查（布尔值）                  |
| `install`  | 安装方法                                 |

### 处理器实现

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] 新命令已触发`);
  // 你的逻辑在这里

  // 可选：向用户发送消息
  event.messages.push("Hook executed!");
};

export default handler;
```

每个事件都包括：`type`、`action`、`sessionKey`、`timestamp`、`messages`（通过 push 发送给用户）以及 `context`（特定于事件的数据）。代理和工具插件钩子上下文还可以包括 `trace`，这是一个只读、与 W3C 兼容的诊断 trace 上下文，插件可以将其传递给结构化日志以用于 OTEL 关联。

### 事件上下文亮点

**命令事件** (`command:new`, `command:reset`)：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**消息事件** (`message:received`)：`context.from`、`context.content`、`context.channelId`、`context.metadata`（特定于提供商的数据，包括 `senderId`、`senderName`、`guildId`）。

**消息事件** (`message:sent`)：`context.to`、`context.content`、`context.success`、`context.channelId`。

**消息事件** (`message:transcribed`)：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**消息事件** (`message:preprocessed`)：`context.bodyForAgent`（最终 enriched body）、`context.from`、`context.channelId`。

**引导事件** (`agent:bootstrap`)：`context.bootstrapFiles`（可变数组）、`context.agentId`。

**会话补丁事件** (`session:patch`)：`context.sessionEntry`、`context.patch`（仅更改的字段）、`context.cfg`。只有特权客户端可以触发补丁事件。

**压缩事件**：`session:compact:before` 包括 `messageCount`、`tokenCount`。`session:compact:after` 添加 `compactedCount`、`summaryLength`、`tokensBefore`、`tokensAfter`。

## 钩子发现

钩子从以下目录中发现，按覆盖优先级递增的顺序：

1. **内置钩子**：随 OpenClaw 一起发布
2. **插件钩子**：捆绑在已安装插件内的钩子
3. **管理钩子**：`~/.openclaw/hooks/`（用户安装，跨工作区共享）。来自 `hooks.internal.load.extraDirs` 的额外目录共享此优先级。
4. **工作区钩子**：`<workspace>/hooks/`（每个代理，默认禁用直到显式启用）

工作区钩子可以添加新的钩子名称，但不能覆盖具有相同名称的内置、管理或插件提供的钩子。

Gateway 在启动时会跳过内部钩子发现，直到配置了内部钩子。使用 `openclaw hooks enable <name>` 启用捆绑或管理钩子，安装钩子包，或设置 `hooks.internal.enabled=true` 以选择加入。启用一个命名钩子后，Gateway 只加载该钩子的处理器；`hooks.internal.enabled=true`、额外钩子目录以及旧版处理器会选择加入更广泛的发现。

### Hook packs

钩子包是通过 `package.json` 中的 `openclaw.hooks` 导出钩子的 npm 包。安装方式：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规格仅限注册表（包名 + 可选的精确版本或 dist-tag）。Git/URL/文件规格和 semver 范围将被拒绝。

## 内置钩子

| 钩子                  | 事件                         | 功能                                          |
| --------------------- | ------------------------------ | ----------------------------------------------------- |
| session-memory        | `command:new`, `command:reset` | 将会话上下文保存到 `<workspace>/memory/`        |
| bootstrap-extra-files | `agent:bootstrap`              | 从 glob 模式注入额外的引导文件 |
| command-logger        | `command`                      | 将所有命令记录到 `~/.openclaw/logs/commands.log`  |
| boot-md               | `gateway:startup`              | 当网关启动时运行 `BOOT.md`                |

启用任何内置钩子：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### session-memory 详情

提取最近 15 条用户/助手消息，通过 LLM 生成描述性的文件名 slug，并使用主机本地日期保存到 `<workspace>/memory/YYYY-MM-DD-slug.md`。需要配置 `workspace.dir`。

<a id="bootstrap-extra-files"></a>

### bootstrap-extra-files 配置

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md", "packages/*/TOOLS.md"]
        }
      }
    }
  }
}
```

路径相对于工作区解析。仅加载识别的引导基名（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`）。

<a id="command-logger"></a>

### command-logger 详情

将每个斜杠命令记录到 `~/.openclaw/logs/commands.log`。

<a id="boot-md"></a>

### boot-md 详情

当网关启动时，从活动工作区运行 `BOOT.md`。

## 插件钩子

插件可以通过 Plugin SDK 注册带类型的钩子，以实现更深度的集成：
拦截工具调用、修改提示词、控制消息流等。
当您需要 `before_tool_call`、`before_agent_reply`、
`before_install` 或其他进程内生命周期钩子时，请使用插件钩子。

完整的插件钩子参考，请参阅 [Plugin hooks](/plugins/hooks)。

## 配置

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

每个钩子的环境变量：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": { "MY_CUSTOM_VAR": "值" }
        }
      }
    }
  }
}
```

额外钩子目录：

```json
{
  "hooks": {
    "internal": {
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

<Note>
旧的 `hooks.internal.handlers` 数组配置格式仍支持向后兼容，但新钩子应使用基于发现的系统。
</Note>

## CLI 参考

```bash
# 列出所有钩子（添加 --eligible、--verbose 或 --json）
openclaw hooks list

# 显示钩子详细信息
openclaw hooks info <hook-name>

# 显示资格摘要
openclaw hooks check

# 启用/禁用
openclaw hooks enable <hook-name>
openclaw hooks disable <hook-name>
```

## 最佳实践

- **保持处理器快速。** 钩子在命令处理期间运行。使用 `void processInBackground(event)` 后台处理繁重工作。
- **优雅地处理错误。** 将风险操作包装在 try/catch 中；不要抛出异常以便其他处理器可以运行。
- **尽早过滤事件。** 如果事件类型/操作不相关，立即返回。
- **使用特定事件键。** 优先使用 `"events": ["command:new"]` 而不是 `"events": ["command"]` 以减少开销。

## 故障排查

### 未发现钩子

```bash
# 验证目录结构
ls -la ~/.openclaw/hooks/my-hook/
# 应显示：HOOK.md, handler.ts

# 列出所有发现的钩子
openclaw hooks list
```

### 钩子不符合资格

```bash
openclaw hooks info my-hook
```

检查是否缺少二进制文件（PATH）、环境变量、配置值或操作系统兼容性。

### 钩子未执行

1. 验证钩子是否已启用：`openclaw hooks list`
2. 重启网关进程以便重新加载钩子。
3. 检查网关日志：`./scripts/clawlog.sh | grep hook`

## 相关内容

- [CLI 参考：钩子](/cli/hooks)
- [Webhooks](/automation/cron-jobs#webhooks)
- [Plugin hooks](/plugins/hooks) — 进程内插件生命周期钩子
- [Configuration](/gateway/configuration-reference#hooks)
