---
summary: "钩子：面向命令和生命周期事件的事件驱动自动化"
read_when:
  - 你希望为 /new、/reset、/stop 和代理生命周期事件实现事件驱动自动化
  - 你想构建、安装或调试钩子
title: "钩子"
---

钩子是在代理事件触发时在网关内部运行的小脚本：像 `/new`、`/reset`、`/stop` 这样的命令、会话压缩、网关生命周期以及消息流。它们从目录中发现，并通过 `openclaw hooks` 管理。只有在你启用钩子，或者配置至少一个钩子条目、钩子包、旧版处理器或额外的钩子目录之后，网关才会加载内部钩子。

OpenClaw 中有两种钩子：

- **内部钩子**（本页）：在代理事件触发时在网关内部运行。
- **Webhooks**：外部 HTTP 端点，让其他系统触发 OpenClaw 中的工作。参见 [Webhooks](/automation/cron-jobs#webhooks)。

钩子也可以打包在插件中。`openclaw hooks list` 会同时显示独立钩子和由插件管理的钩子（显示为 `plugin:<id>`）。

## 选择合适的扩展面

OpenClaw 有几个看起来相似但用途不同的扩展面：

| 如果你想要...                                                                                                       | 使用...                               | 原因                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| 在 `/new` 时保存快照、记录 `/reset`、在 `message:sent` 后调用外部 API，或添加粗粒度的运维自动化 | 内部钩子（`HOOK.md`，本页）            | 基于文件的钩子适合由运维管理的副作用和命令/生命周期自动化                                      |
| 重写提示词、阻止工具、取消出站消息，或添加有序中间件/策略                                      | 通过 `api.on(...)` 的类型化插件钩子     | 类型化钩子具有明确的契约、优先级、合并规则以及阻止/取消语义                                    |
| 仅添加遥测导出或可观测性                                                                                              | 诊断事件                               | 可观测性是单独的事件总线，而不是策略钩子面                                                      |

当你需要像小型已安装集成一样运行的自动化时，使用内部钩子。当你需要运行时生命周期控制时，使用类型化插件钩子。

内部钩子处理程序是请求/事件处理程序。它们不得持有长生命周期的计时器、监视器、套接字或客户端；插件应注册服务，或改用类型化的 `gateway_start` / `gateway_stop` 生命周期。

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

Hooks 订阅此表中的特定键，或订阅一个裸的家族名称
(`command`, `session`, `agent`, `gateway`, `message`) 来接收该家族中的每个动作。
OpenClaw 核心不会发出任何其他事件，因此任何其他名称几乎
总是一个拼写错误，会让 hook 悄无声息地失效（只有发出自定义事件的插件才可能触发它）。
hook 加载器会对这类名称记录警告
（例如 `command:nwe`），并且 `openclaw hooks info <name>` 会将它们标记出来，因此
从未运行过的 hook 是可以诊断的。

| 事件                     | 触发时机                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `command:new`            | 执行 `/new` 命令                                             |
| `command:reset`          | 执行 `/reset` 命令                                           |
| `command:stop`           | 执行 `/stop` 命令                                            |
| `command`                | 任何命令事件（通用监听器）                                   |
| `session:auto-reset`     | 每日重置或空闲重置替换当前会话                               |
| `session:compact:before` | 压缩操作汇总历史记录之前                                     |
| `session:compact:after`  | 压缩操作完成之后                                             |
| `session:patch`          | 修改会话属性时                                               |
| `agent:bootstrap`        | 注入工作区引导文件之前                                       |
| `gateway:startup`        | 通道启动且 hooks 加载完成之后                                |
| `gateway:shutdown`       | 网关关闭开始时                                               |
| `gateway:pre-restart`    | 预期的网关重启之前                                           |
| `message:received`       | 从任何通道接收入站消息                                       |
| `message:transcribed`    | 音频转录完成之后                                             |
| `message:preprocessed`   | 媒体和链接预处理完成或跳过之后                               |
| `message:sent`           | 尝试发送出站消息（结果位于 `context.success` 中）            |

## 编写钩子

### 钩子结构

每个钩子都是一个包含两个文件的目录：

```text
my-hook/
├── HOOK.md          # 元数据 + 文档
└── handler.ts       # 处理器实现
```

处理器文件可以是 `handler.ts`、`handler.js`、`index.ts` 或 `index.js`。

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
| `emoji`    | CLI 显示的表情符号                                |
| `events`   | 要监听的事件数组                        |
| `export`   | 要使用的命名导出（默认值为 `"default"`）        |
| `os`       | 所需平台（例如：`["darwin", "linux"]`）     |
| `requires` | 所需的 `bins`、`anyBins`、`env` 或 `config` 路径 |
| `always`   | 绕过资格检查（布尔值）                  |
| `hookKey`  | 配置键覆盖（默认使用 hook 名称）        |
| `homepage` | 由 `openclaw hooks info` 显示的文档 URL              |
| `install`  | 安装方法                                 |

### 处理器实现

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] 新命令被触发`);
  // 在这里编写你的逻辑

  // 可选：在可回复的面上发送回复
  event.messages.push("Hook executed!");
};

export default handler;
```

每个事件都包含：`type`、`action`、`sessionKey`、`timestamp`、`messages` 和 `context`（事件特定数据）。面向 agent 和 tool 钩子的类型化插件 hook 上下文还可以包含 `trace`，这是一个只读、兼容 W3C 的诊断 trace 上下文，插件可以将其传递给结构化日志用于 OTEL 关联。

推送到 `event.messages` 的字符串只会在以下情况下回传到聊天：
`command:new` 和 `command:reset`（作为对原始
会话的回复路由），以及 `session:compact:before` / `session:compact:after`
（作为紧凑化状态通知发送）。其他所有事件，包括
`command:stop`、`message:*`、`agent:bootstrap`、`session:patch` 和
`gateway:*`，都会忽略推送的消息。

### 事件上下文要点

**命令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.senderId`、`context.workspaceDir`、`context.cfg`。

**命令事件**（`command:stop`）：`context.sessionEntry`、`context.sessionId`、`context.commandSource`、`context.senderId`。

**自动重置事件**（`session:auto-reset`）：`context.sessionEntry`、`context.reason`（`daily` 或 `idle`）、`context.transcriptArchived`、`context.nextSessionId`、`context.nextSessionKey`、`context.agentId`、`context.workspaceDir`、`context.storePath` 和 `context.cfg`。

**消息事件**（`message:received`）：`context.from`、`context.content`、`context.channelId`、`context.media`（按顺序排列的暂存附件信息）、远程媒体尚未在本地暂存时的 `context.originalMedia` 以及 `context.mediaStagingPending`，还有 `context.metadata`（包括 `senderId`、`senderName`、`guildId` 等提供商特定数据）。对于类似命令的消息，`context.content` 优先使用非空的命令正文，然后回退到原始入站正文和通用正文；它不包含仅供 agent 使用的增强内容，例如线程历史或链接摘要。`metadata` 中的旧版媒体别名已弃用。

**消息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`，发送失败时还包括 `context.error`。

**消息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId` 和 `context.media`。`context.mediaPath` 和 `context.mediaType` 仍然是第一个事实的弃用别名。

**消息事件**（`message:preprocessed`）：`context.bodyForAgent`（最终增强后的正文）、`context.from`、`context.channelId`。

**启动事件**（`agent:bootstrap`）：`context.bootstrapFiles`（可变数组）、`context.agentId`。

**会话补丁事件**（`session:patch`）：`context.sessionEntry`、`context.patch`（仅更改的字段）、`context.cfg`。只有有特权的客户端才能触发补丁事件；该上下文是一个克隆，因此处理器无法修改实时会话条目。

**紧凑化事件**：`session:compact:before` 包含 `messageCount`、`tokenCount`。`session:compact:after` 增加 `compactedCount`、`summaryLength`、`tokensBefore`、`tokensAfter`。

`command:stop` 反映用户发出了 `/stop`；它属于取消/命令生命周期，而不是代理最终完成的门控。需要检查自然最终答案并要求代理再次执行一次的插件，应使用类型化插件 hook `before_agent_finalize`。参见 [插件钩子](/plugins/hooks)。

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
    `Gateway 将在约 ${restartInSeconds}s 后重启（${event.context.reason}）。请立即保存检查点。`,
  ]);
}
```

在 `gateway:shutdown`（或 `gateway:pre-restart`）事件与后续关闭流程之间，gateway 还会为进程停止时仍处于活动状态的每个会话触发一个类型化的 `session_end` 插件 hook。对于普通的 SIGTERM/SIGINT 停止，事件的 `reason` 为 `shutdown`；当关闭是预期重启的一部分时，`reason` 为 `restart`。此清理过程有上限，因此较慢的 `session_end` 处理器不会阻塞进程退出，并且已经通过 replace / reset / delete / compaction 完成终结的会话会被跳过，以避免重复触发。

## 钩子发现

钩子来自四个来源：

1. **捆绑钩子**：随 OpenClaw 一起发布
2. **插件钩子**：捆绑在已安装的插件中；可以覆盖同名的捆绑钩子
3. **托管钩子**：`~/.openclaw/hooks/`（用户安装，在不同工作区之间共享）；可以覆盖捆绑钩子和插件钩子。来自 `hooks.internal.load.extraDirs` 的额外目录共享此优先级。
4. **工作区钩子**：`<workspace>/hooks/`（按代理隔离，默认禁用，直到显式启用）

工作区钩子可以添加新的 hook 名称，但不能覆盖同名的捆绑、托管或插件提供的钩子。

在内部钩子配置完成之前，Gateway 启动时会跳过内部钩子发现。使用 `openclaw hooks enable <name>` 启用捆绑或托管钩子，安装 hook 包，或设置 `hooks.internal.enabled=true` 以启用。启用一个已命名的钩子时，Gateway 只加载该钩子的处理器；`hooks.internal.enabled=true`、额外的 hook 目录以及旧式处理器会启用更广泛的发现。

### Hook 包

Hook 包是通过 `package.json` 中的 `openclaw.hooks` 导出钩子的 npm 包。使用以下命令安装：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规格仅限注册表（包名 + 可选的精确版本或 dist-tag）。Git/URL/file 规格和 semver 范围都会被拒绝。较旧的 `openclaw hooks install` 和 `openclaw hooks update` 命令是 `openclaw plugins install` / `openclaw plugins update` 的弃用别名。

## 捆绑钩子

| 钩子                  | 事件                                               | 功能                                                           |
| --------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| session-memory        | `command:new`、`command:reset`、`session:auto-reset` | 将会话上下文保存到 `<workspace>/memory/`                 |
| bootstrap-extra-files | `agent:bootstrap`                                  | 从 glob 模式注入其他引导文件                                  |
| command-logger        | `command`                                          | 将所有命令记录到 `~/.openclaw/logs/commands.log`           |
| compaction-notifier   | `session:compact:before`、`session:compact:after`  | 在会话紧凑化开始和结束时发送可见的聊天通知                   |
| boot-md               | `gateway:startup`                                  | 网关启动时运行 `BOOT.md`                                     |

启用任意捆绑钩子：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### session-memory 详情

在执行 `/new`、`/reset`、每日重置或闲置过期时，提取最近的用户/助手消息（默认为 15 条，可通过 `hooks.internal.entries.session-memory.messages` 配置），并使用 `agents.defaults.userTimezone` 将其保存到 `<workspace>/memory/YYYY-MM-DD-HHMM.md`。未配置用户时区时，将回退到主机时区。记忆捕获在后台运行，因此重置处理和替换会话不会因读取转录或生成可选 slug 而延迟。设置 `hooks.internal.entries.session-memory.llmSlug: true` 可生成描述性文件名 slug，还可以选择将 `hooks.internal.entries.session-memory.model` 设置为已配置的别名（例如 `sonnet`）、代理默认提供商上的裸模型 ID，或 `provider/model` 引用。如果省略 `model`，slug 生成会使用代理的默认模型；当默认模型不可用时，则回退到时间戳 slug。要求配置 `workspace.dir`。

<Note>
`memory` 源已经会为此钩子保存的对话摘录建立索引。如果同时启用了
[会话转录索引](/reference/memory-config#session-memory-search)，
同一对话可能会同时出现在 `memory` 和 `sessions` 中，从而产生重叠的搜索结果并增加额外的嵌入计算。
若只使用钩子进行召回，请设置 `memory.search.sources: ["memory"]` 和
`memory.search.rememberAcrossConversations: false`；仅设置 `sources` 并不能阻止跨对话召回添加 `sessions`。
若要召回完整转录，则运行 `openclaw hooks disable session-memory`。仅当你确实希望同时使用这两种表示形式时，才启用两者。
</Note>

<a id="bootstrap-extra-files"></a>

### bootstrap-extra-files 配置

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md"]
        }
      }
    }
  }
}
```

`patterns` 和 `files` 可作为 `paths` 的别名使用。路径将相对于工作区解析，且必须保持在工作区内部。只会加载可识别的 bootstrap 基本文件名（`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`BOOTSTRAP.md`、`MEMORY.md`）。

`TOOLS.md` 不再被识别为 bootstrap 基本文件名，也不会加载到运行时上下文中。`openclaw doctor --fix` 会将工作区根目录下的 `TOOLS.md` 迁移到 `AGENTS.md` 的 `## Tools` 部分；命名其他 `TOOLS.md` 文件的模式不会被迁移，应改指向 `AGENTS.md`。

<a id="command-logger"></a>

### command-logger 详情

将每个斜杠命令作为 JSON 行（时间戳、操作、会话键、发送者 ID、来源）记录到 `~/.openclaw/logs/commands.log`。

<a id="compaction-notifier"></a>

### compaction-notifier 详情

在 OpenClaw 开始和结束紧凑化会话转录时，向当前对话发送简短状态消息。这会让长轮次在聊天界面上不那么令人困惑，因为用户可以看到助手正在总结上下文，并会在紧凑化后继续。

<a id="boot-md"></a>

### boot-md 详情

如果文件存在于该代理解析后的工作区中，则在网关启动时为每个已配置的代理作用域运行 `BOOT.md`。

## 插件钩子

插件可以通过插件 SDK 注册类型化钩子，以实现更深度的集成：
拦截工具调用、修改提示词、控制消息流等。
当你需要 `before_tool_call`、`before_agent_reply`、
`before_install` 或其他进程内生命周期钩子时，请使用插件钩子。

插件管理的内部钩子是不同的：它们参与此页面的
粗粒度命令/生命周期事件系统，并在 `openclaw hooks list` 中显示为
`plugin:<id>`。请将它们用于副作用和与钩子包的兼容性，而不是用于
有序中间件或策略门控。

完整的插件钩子参考请见 [插件钩子](/plugins/hooks)。

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

每个钩子的环境变量值与进程环境一起满足该钩子的 `requires.env` 资格检查，处理器可以从其钩子配置项中读取这些值：

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

- **保持处理程序快速。** 钩子会在命令处理期间运行。对于较繁重的工作，请使用 `void processInBackground(event)` 进行即发即弃式处理。
- **优雅地处理错误。** 将有风险的操作包装在 try/catch 中；不要抛出异常，以便其他处理程序能够继续运行。
- **尽早过滤事件。** 如果事件类型/操作不相关，请立即返回。
- **使用具体的事件键。** 与 `"events": ["command"]` 相比，建议使用 `"events": ["command:new"]`，以减少开销。

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

1. 验证 hook 是否已启用：`openclaw hooks list`
2. 重启你的 gateway 进程，以便重新加载 hooks。
3. 检查 gateway 日志：`openclaw logs --follow | grep -i hook`

## 相关内容

- [CLI 参考：hooks](/cli/hooks)
- [Webhooks](/automation/cron-jobs#webhooks)
- [插件 hooks](/plugins/hooks) — 进程内插件生命周期 hooks
- [配置](/gateway/configuration-reference#hooks)
