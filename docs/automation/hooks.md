---
summary: "钩子：面向命令和生命周期事件的事件驱动自动化"
read_when:
  - 你希望为 /new、/reset、/stop 和代理生命周期事件实现事件驱动自动化
  - 你想构建、安装或调试钩子
title: "钩子"
---

钩子是一些小脚本，会在 Gateway 内部发生某些事情时运行。它们可以从目录中发现，并通过 `openclaw hooks` 进行检查。只有在你启用钩子或配置至少一个 hook 条目、hook 包、旧式处理器或额外的 hook 目录后，Gateway 才会加载内部钩子。

OpenClaw 中有两种钩子：

- **内部钩子**（本页）：当代理事件触发时在 Gateway 内部运行，例如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP 端点，允许其他系统在 OpenClaw 中触发工作。参见 [Webhooks](/automation/cron-jobs#webhooks)。

钩子也可以打包在插件中。`openclaw hooks list` 会同时显示独立钩子和由插件管理的钩子。

## 快速开始

```bash
# 列出可用的钩子
openclaw hooks list

# 启用一个钩子
openclaw hooks enable session-memory

# 检查钩子状态
openclaw hooks check

# 获取详细信息
openclaw hooks info session-memory
```

## 事件类型

| 事件                     | 触发时机                                               |
| ------------------------ | ------------------------------------------------------ |
| `command:new`            | 发送 `/new` 命令时                                     |
| `command:reset`          | 发送 `/reset` 命令时                                   |
| `command:stop`           | 发送 `/stop` 命令时                                    |
| `command`                | 任何命令事件（通用监听器）                             |
| `session:compact:before` | 紧凑化在总结历史记录之前                               |
| `session:compact:after`  | 紧凑化完成之后                                           |
| `session:patch`          | 会话属性被修改时                                       |
| `agent:bootstrap`        | 工作区 bootstrap 文件被注入之前                        |
| `gateway:startup`        | 通道启动且钩子已加载之后                               |
| `gateway:shutdown`       | Gateway 关闭开始时                                    |
| `gateway:pre-restart`    | 预期中的 Gateway 重启之前                               |
| `message:received`       | 来自任意通道的入站消息                                 |
| `message:transcribed`    | 音频转写完成后                                         |
| `message:preprocessed`   | 媒体和链接预处理完成或被跳过后                          |
| `message:sent`           | 出站消息已送达                                         |

## 编写钩子

### 钩子结构

每个钩子都是一个包含两个文件的目录：

```
my-hook/
├── HOOK.md          # 元数据 + 文档
└── handler.ts       # 处理器实现
```

### HOOK.md 格式

```markdown
---
name: my-hook
description: "该 hook 的简短说明"
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# 我的 Hook

详细文档写在这里。
```

**元数据字段**（`metadata.openclaw`）：

| 字段       | 说明                                                 |
| ---------- | ---------------------------------------------------- |
| `emoji`    | CLI 中显示的 emoji                                   |
| `events`   | 要监听的事件数组                                     |
| `export`   | 要使用的命名导出（默认值为 `"default"`）              |
| `os`       | 所需平台（例如：`["darwin", "linux"]`）               |
| `requires` | 所需的 `bins`、`anyBins`、`env` 或 `config` 路径      |
| `always`   | 绕过资格检查（布尔值）                                |
| `install`  | 安装方式                                             |

### 处理器实现

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] 新命令被触发`);
  // 你的逻辑写在这里

  // 可选地向用户发送消息
  event.messages.push("Hook 已执行！");
};

export default handler;
```

每个事件都包含：`type`、`action`、`sessionKey`、`timestamp`、`messages`（使用 push 发送给用户）以及 `context`（事件特定数据）。代理和工具插件 hook 上下文还可以包含 `trace`，这是一个只读的、兼容 W3C 的诊断 trace 上下文，插件可将其传递给结构化日志以用于 OTEL 关联。

### 事件上下文要点

**命令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**消息事件** (`message:received`): `context.from`, `context.content`, `context.channelId`, `context.metadata` (提供方特定数据，包括 `senderId`、`senderName`、`guildId`)。`context.content` 会优先使用命令类消息中非空白的命令正文，然后回退到原始入站正文和通用正文；它不包含仅代理可见的增强内容，例如线程历史或链接摘要。

**消息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`。

**消息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**消息事件**（`message:preprocessed`）：`context.bodyForAgent`（最终增强后的正文）、`context.from`、`context.channelId`。

**Bootstrap 事件**（`agent:bootstrap`）：`context.bootstrapFiles`（可变数组）、`context.agentId`。

**会话补丁事件**（`session:patch`）：`context.sessionEntry`、`context.patch`（仅包含已更改字段）、`context.cfg`。只有具有特权的客户端才能触发补丁事件。

**紧凑化事件**：`session:compact:before` 包含 `messageCount`、`tokenCount`。`session:compact:after` 增加 `compactedCount`、`summaryLength`、`tokensBefore`、`tokensAfter`。

`command:stop` 反映用户发出 `/stop`；它属于取消/命令生命周期，而不是代理最终完成的门控。需要检查自然最终答案并要求代理再执行一次的插件，应使用类型化插件 hook `before_agent_finalize`。参见 [Plugin hooks](/plugins/hooks)。

## Gateway 生命周期事件

`gateway:shutdown` 包含 `reason` 和 `restartExpectedMs`，并在 gateway 关闭开始时触发。`gateway:pre-restart` 包含相同的上下文，但仅在关闭是预期重启的一部分且提供了有限的 `restartExpectedMs` 值时触发。在关闭期间，每个生命周期 hook 的等待都是尽力而为且有上限的，因此如果某个处理器卡住，关闭仍会继续。默认等待预算是 `gateway:shutdown` 5 秒，`gateway:pre-restart` 10 秒。

当通道仍然可用时，请使用 `gateway:pre-restart` 发送简短的重启通知：

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function handler(event) {
  if (event.type !== "gateway" || event.action !== "pre-restart") {
    return;
  }

  const restartInSeconds = Math.ceil(event.context.restartExpectedMs / 1000);
  await execFileAsync("openclaw", [
    "system",
    "event",
    "--mode",
    "now",
    "--text",
    `Gateway restarting in ~${restartInSeconds}s (${event.context.reason}). Checkpoint now.`,
  ]);
}
```

在 `gateway:shutdown`（或 `gateway:pre-restart`）事件与后续关闭流程之间，gateway 还会为进程停止时仍处于活动状态的每个会话触发一个类型化的 `session_end` 插件 hook。对于普通的 SIGTERM/SIGINT 停止，事件的 `reason` 为 `shutdown`；当关闭是预期重启的一部分时，`reason` 为 `restart`。此清理过程有上限，因此较慢的 `session_end` 处理器不会阻塞进程退出，并且已经通过 replace / reset / delete / compaction 完成终结的会话会被跳过，以避免重复触发。

## 钩子发现

钩子会按覆盖优先级从低到高在以下目录中发现：

1. **捆绑钩子**：随 OpenClaw 一起提供
2. **插件钩子**：打包在已安装插件中的钩子
3. **托管钩子**：`~/.openclaw/hooks/`（用户安装，在工作区之间共享）。来自 `hooks.internal.load.extraDirs` 的额外目录共享此优先级。
4. **工作区钩子**：`<workspace>/hooks/`（按代理隔离，默认禁用，直到显式启用）

工作区钩子可以添加新的 hook 名称，但不能覆盖同名的捆绑、托管或插件提供的钩子。

在内部钩子配置完成之前，Gateway 启动时会跳过内部钩子发现。使用 `openclaw hooks enable <name>` 启用捆绑或托管钩子，安装 hook 包，或设置 `hooks.internal.enabled=true` 以启用。启用一个已命名的钩子时，Gateway 只加载该钩子的处理器；`hooks.internal.enabled=true`、额外的 hook 目录以及旧式处理器会启用更广泛的发现。

### Hook 包

Hook 包是通过 `package.json` 中的 `openclaw.hooks` 导出钩子的 npm 包。使用以下命令安装：

```bash
openclaw plugins install <path-or-spec>
```

Npm spec 仅支持注册表来源（包名 + 可选的精确版本或 dist-tag）。Git/URL/file spec 和 semver 范围会被拒绝。

## 捆绑钩子

| 钩子                  | 事件                                              | 它的作用                                                     |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| session-memory        | `command:new`, `command:reset`                    | 将会话上下文保存到 `<workspace>/memory/`                     |
| bootstrap-extra-files | `agent:bootstrap`                                 | 从 glob 模式注入额外的 bootstrap 文件                        |
| command-logger        | `command`                                         | 将所有命令记录到 `~/.openclaw/logs/commands.log`            |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | 在会话紧凑化开始/结束时发送可见的聊天通知                    |
| boot-md               | `gateway:startup`                                 | 在网关启动时运行 `BOOT.md`                                   |

启用任意捆绑钩子：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### session-memory 详情

提取最近 15 条用户/助手消息，并使用宿主机本地日期保存到 `<workspace>/memory/YYYY-MM-DD-HHMM.md`。记忆捕获在后台运行，因此 `/new` 和 `/reset` 的确认不会因转录读取或可选的 slug 生成而延迟。将 `hooks.internal.entries.session-memory.llmSlug: true` 设为 true，可使用配置的模型生成描述性文件名 slug。需要配置 `workspace.dir`。

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

路径按相对于工作区来解析。只会加载被识别的 bootstrap 基名（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`）。

<a id="command-logger"></a>

### command-logger 详情

将每条斜杠命令记录到 `~/.openclaw/logs/commands.log`。

<a id="compaction-notifier"></a>

### compaction-notifier 详情

在 OpenClaw 开始和结束紧凑化会话转录时，向当前对话发送简短状态消息。这会让长轮次在聊天界面上不那么令人困惑，因为用户可以看到助手正在总结上下文，并会在紧凑化后继续。

<a id="boot-md"></a>

### boot-md 详情

Gateway 启动时运行当前工作区中的 `BOOT.md`。

## 插件钩子

插件可以通过 Plugin SDK 注册类型化钩子，以实现更深度的集成：
拦截工具调用、修改提示词、控制消息流等。
当你需要 `before_tool_call`、`before_agent_reply`、
`before_install` 或其他进程内生命周期钩子时，请使用插件钩子。

完整的插件 hook 参考请见 [Plugin hooks](/plugins/hooks)。

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
          "env": { "MY_CUSTOM_VAR": "value" }
        }
      }
    }
  }
}
```

额外的钩子目录：

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
旧的 `hooks.internal.handlers` 数组配置格式仍然受支持，以便向后兼容，但新的钩子应使用基于发现的系统。
</Note>

## CLI 参考

```bash
# 列出所有 hook（添加 --eligible、--verbose 或 --json）
openclaw hooks list

# 显示某个 hook 的详细信息
openclaw hooks info <hook-name>

# 显示资格摘要
openclaw hooks check

# 启用/禁用
openclaw hooks enable <hook-name>
openclaw hooks disable <hook-name>
```

## 最佳实践

- **保持处理函数快速。** Hook 会在命令处理期间运行。对于耗时较重的工作，请使用 `void processInBackground(event)` 进行即发即弃处理。
- **优雅地处理错误。** 将有风险的操作包裹在 try/catch 中；不要抛出异常，这样其他处理函数才能继续运行。
- **尽早过滤事件。** 如果事件类型/动作不相关，立即返回。
- **使用具体的事件键。** 相比 `"events": ["command"]`，更推荐使用 `"events": ["command:new"]`，以减少开销。

## 故障排查

### 未发现 Hook

```bash
# 验证目录结构
ls -la ~/.openclaw/hooks/my-hook/
# 应显示：HOOK.md, handler.ts

# 列出所有已发现的 hooks
openclaw hooks list
```

### Hook 不符合条件

```bash
openclaw hooks info my-hook
```

检查是否缺少二进制文件（PATH）、环境变量、配置值或 OS 兼容性问题。

### Hook 未执行

1. 验证 hook 已启用：`openclaw hooks list`
2. 重启你的网关进程，以便重新加载 hooks。
3. 检查网关日志：`./scripts/clawlog.sh | grep hook`

## 相关内容

- [CLI 参考：hooks](/cli/hooks)
- [Webhooks](/automation/cron-jobs#webhooks)
- [插件 hooks](/plugins/hooks) — 进程内插件生命周期 hooks
- [配置](/gateway/configuration-reference#hooks)
