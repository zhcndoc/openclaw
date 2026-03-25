---
summary: "Hooks：针对命令和生命周期事件的事件驱动自动化"
read_when:
  - 您需要针对 /new、/reset、/stop 以及代理生命周期事件的事件驱动自动化
  - 您想要构建、安装或调试 hooks
title: "Hooks"
---

# Hooks

Hooks 提供了一个可扩展的事件驱动系统，用于在响应代理命令和事件时自动执行操作。Hooks 会自动从目录中发现，并可通过 `openclaw hooks` 进行查看，而 hook-pack 的安装和更新现在通过 `openclaw plugins` 进行。

## 入门导览

Hooks 是在某些事件发生时运行的小脚本。主要有两种类型：

- **Hooks**（本页内容）：当代理事件触发时，在网关内部运行，例如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP webhook，允许其他系统触发 OpenClaw 中的工作。参见 [Webhook Hooks](/automation/webhook) 或使用 `openclaw webhooks` 获取 Gmail 辅助命令。

Hooks 也可以捆绑在插件内部；参见 [Plugin hooks](/plugins/architecture#provider-runtime-hooks)。`openclaw hooks list` 会显示独立 hooks 和插件管理的 hooks。

常见用途：

- 在重置会话时保存内存快照
- 记录命令审计跟踪以便排错或合规
- 会话开始或结束时触发后续自动化
- 在事件触发时写入代理工作区文件或调用外部 API

如果您能编写一个小型 TypeScript 函数，您就能编写一个 hook。托管和捆绑的 hooks 是受信任的本地代码。工作区 hooks 会被自动发现，但 OpenClaw 会将它们保持禁用状态，直到您通过 CLI 或配置明确启用。

## 概览

Hooks 系统允许您：

- 在执行 `/new` 时保存会话上下文到内存
- 记录所有命令以便审计
- 在代理生命周期事件时触发自定义自动化
- 无需修改核心代码即可扩展 OpenClaw 行为

## 快速开始

### 内置 Hooks

OpenClaw 自带四个自动发现的内置 hooks：

- **💾 session-memory**: 当您发出 `/new` 或 `/reset` 命令时，将会话上下文保存到您的代理工作区（默认 `~/.openclaw/workspace/memory/`）
- **📎 bootstrap-extra-files**: 在 `agent:bootstrap` 期间从配置的 glob/路径模式注入额外的工作区引导文件
- **📝 command-logger**: 将所有命令事件记录到 `~/.openclaw/logs/commands.log`
- **🚀 boot-md**: 当网关启动时运行 `BOOT.md`（需要启用内部 hooks）

列出可用 hooks：

```bash
openclaw hooks list
```

启用 hook：

```bash
openclaw hooks enable session-memory
```

检查 hook 状态：

```bash
openclaw hooks check
```

获取详细信息：

```bash
openclaw hooks info session-memory
```

### 上手引导

在执行 `openclaw onboard` 期间，系统会提示您启用推荐的 hooks。向导会自动发现匹配的 hooks 并供您选择。

### 信任边界

Hooks 在网关进程内部运行。将捆绑的 hooks、托管的 hooks 以及 `hooks.internal.load.extraDirs` 视为受信任的本地代码。在 `<workspace>/hooks/` 下的工作区 hooks 是仓库本地代码，因此 OpenClaw 需要显式的启用步骤才会加载它们。

## Hook 发现

Hooks 会自动从以下目录中发现，按覆盖优先级递增的顺序排列：

1. **捆绑的 hooks**：随 OpenClaw 一起提供；对于 npm 安装位于 `<openclaw>/dist/hooks/bundled/`（或对于编译后的二进制文件位于相邻的 `hooks/bundled/`）
2. **插件 hooks**：安装在插件内部的 hooks（参见 [Plugin hooks](/plugins/architecture#provider-runtime-hooks)）
3. **托管 hooks**：`~/.openclaw/hooks/`（用户安装，跨工作区共享；可以覆盖捆绑和插件 hooks）。通过 `hooks.internal.load.extraDirs` 配置的**额外 hook 目录**也被视为托管 hooks，并具有相同的覆盖优先级。
4. **工作区 hooks**：`<workspace>/hooks/`（每个代理，默认禁用，直到显式启用；无法覆盖来自其他源的 hooks）

工作区 hooks 可以为仓库添加新的 hook 名称，但不能覆盖具有相同名称的捆绑、托管或插件提供的 hooks。

托管的 hooks 目录可以是**单个 hook**或**hook 包**（包目录）。

每个 hook 是一个目录，包含：

```
my-hook/
├── HOOK.md          # 元数据和文档
└── handler.ts       # 处理器实现
```

## Hook 包（npm/归档）

Hook 包是标准的 npm 包，通过 `package.json` 中的 `openclaw.hooks` 字段导出一个或多个 hooks。安装命令：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规范仅支持注册表格式（包名 + 可选版本/标签）。不接受 git/url/file 格式。

裸规格和 `@latest` 会走稳定线路。如果 npm 解析到预发布版本，OpenClaw 会停止并要求您显式通过预发布标签（如 `@beta`、`@rc`）或精确预发布版本进行选择。

示例 `package.json`：

```json
{
  "name": "@acme/my-hooks",
  "version": "0.1.0",
  "openclaw": {
    "hooks": ["./hooks/my-hook", "./hooks/other-hook"]
  }
}
```

每个条目指向含有 `HOOK.md` 和 `handler.ts`（或 `index.ts`）的 hook 目录。Hook 包可包含依赖，安装后放置于 `~/.openclaw/hooks/<id>` 下。每个 `openclaw.hooks` 条目解析后的路径必须位于包目录内，超出将被拒绝。

安全说明：`openclaw plugins install` 使用 `npm install --ignore-scripts` 安装 hook-pack 依赖项（无生命周期脚本）。保持 hook 包依赖树为"纯 JS/TS"，并避免依赖 `postinstall` 构建的包。

## Hook 结构

### HOOK.md 格式

`HOOK.md` 文件包含 YAML Frontmatter 的元数据和 Markdown 文档：

```markdown
---
name: my-hook
description: "此 hook 的简短描述"
homepage: https://docs.openclaw.ai/automation/hooks#my-hook
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# 我的 Hook

详细文档内容...

## 功能描述

- 监听 `/new` 命令
- 执行一些操作
- 记录结果

## 需求

- 需安装 Node.js

## 配置

无需配置。
```

### 元数据字段

`metadata.openclaw` 对象支持：

- **`emoji`**: 用于 CLI 的显示表情符号（例如 `"💾"`）
- **`events`**: 监听的事件数组（例如 `["command:new", "command:reset"]`）
- **`export`**: 要使用的命名导出（默认为 `"default"`）
- **`homepage`**: 文档 URL
- **`os`**: 所需平台（例如 `["darwin", "linux"]`）
- **`requires`**: 可选要求
  - **`bins`**: PATH 上需要的二进制文件（例如 `["git", "node"]`）
  - **`anyBins`**: 这些二进制文件中至少必须存在一个
  - **`env`**: 需要的环境变量
  - **`config`**: 需要的配置路径（例如 `["workspace.dir"]`）
- **`always`**: 绕过资格检查（布尔值）
- **`install`**: 安装方法（对于捆绑 hooks：`[{"id":"bundled","kind":"bundled"}]`）

### 处理器实现

`handler.ts` 文件导出一个 `HookHandler` 函数：

```typescript
const myHandler = async (event) => {
  // 仅在 'new' 命令时触发
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] 新命令已触发`);
  console.log(`  会话：${event.sessionKey}`);
  console.log(`  时间戳：${event.timestamp.toISOString()}`);

  // 在此处编写您的自定义逻辑

  // 可选择向用户发送消息
  event.messages.push("✨ 我的 hook 已执行！");
};

export default myHandler;
```

#### 事件上下文

每个事件包含：

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway' | 'message',
  action: string,              // 例：'new', 'reset', 'stop', 'received', 'sent'
  sessionKey: string,          // 会话标识符
  timestamp: Date,             // 事件发生时间
  messages: string[],          // 向此数组推送消息以发送给用户
  context: {
    // Command events (command:new, command:reset):
    sessionEntry?: SessionEntry,       // current session entry
    previousSessionEntry?: SessionEntry, // pre-reset entry (preferred for session-memory)
    commandSource?: string,            // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    cfg?: OpenClawConfig,
    // Command events (command:stop only):
    sessionId?: string,
    // Agent bootstrap events (agent:bootstrap):
    bootstrapFiles?: WorkspaceBootstrapFile[],
    // Message events (see Message Events section for full details):
    from?: string,             // message:received
    to?: string,               // message:sent
    content?: string,
    channelId?: string,
    success?: boolean,         // message:sent 是否成功
  }
}
```

## 事件类型

### 命令事件

代理命令发出时触发：

- **`command`**：所有命令事件（通用侦听）
- **`command:new`**：发出 `/new` 命令时
- **`command:reset`**：发出 `/reset` 命令时
- **`command:stop`**：发出 `/stop` 命令时

### 会话事件

- **`session:compact:before`**：压缩历史摘要之前
- **`session:compact:after`**：压缩完成，含摘要元数据

内部 hook 通过 `type: "session"`，`action: "compact:before"`/`compact:after` 发送以上事件，订阅时使用复合键。使用时注册 `session:compact:before` 和 `session:compact:after`。

### 代理事件

- **`agent:bootstrap`**：在注入工作区 bootstrap 文件之前（hooks 可变更 `context.bootstrapFiles`）

### 网关事件

网关启动时触发：

- **`gateway:startup`**：频道启动及 hooks 加载后

### 消息事件

收发消息时触发：

- **`message`**：所有消息事件（通用监听）
- **`message:received`**：收取任一渠道入站消息。触发时处于早期处理，媒体还未解析，内容可能包含 `<media:audio>` 等原始占位符。
- **`message:transcribed`**：消息已全解析（包含音频转录和链接理解）。可通过 `transcript` 获取音频转录文本。需要使用音频转录内容时使用此 hook。
- **`message:preprocessed`**：所有媒体和链接解析完毕后触发，提供最终的丰富内容（转录、图片描述、链接摘要），在代理看到消息之前。
- **`message:sent`**：出站消息发送成功时

#### 消息事件上下文

消息事件包含丰富上下文：

```typescript
// message:received 上下文
{
  from: string,           // 发送者标识（手机号、用户 ID 等）
  content: string,        // 消息内容
  timestamp?: number,     // UNIX 时间戳
  channelId: string,      // 渠道（如 "whatsapp"、"telegram"、"discord"）
  accountId?: string,     // 多账户提供商账号 ID
  conversationId?: string,// 会话 ID
  messageId?: string,     // 提供商消息 ID
  metadata?: {            // 额外提供商特定数据
    to?: string,
    provider?: string,
    surface?: string,
    threadId?: string | number,
    senderId?: string,
    senderName?: string,
    senderUsername?: string,
    senderE164?: string,
    guildId?: string,     // Discord guild / server ID
    channelName?: string, // Channel name (e.g., Discord channel name)
  }
}

// message:sent 上下文
{
  to: string,             // 接收者标识
  content: string,        // 发送的消息内容
  success: boolean,       // 是否发送成功
  error?: string,         // 失败时的错误信息
  channelId: string,      // 渠道
  accountId?: string,
  conversationId?: string,
  messageId?: string,
  isGroup?: boolean,      // 是否群组/频道消息
  groupId?: string,       // 群组/频道 ID，用于与 message:received 关联
}

// message:transcribed 上下文
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body before enrichment
  bodyForAgent?: string,  // Enriched body visible to the agent
  transcript: string,     // Audio transcript text
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file that was transcribed
  mediaType?: string,     // MIME type of the media
}

// message:preprocessed 上下文
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body
  bodyForAgent?: string,  // Final enriched body after media/link understanding
  transcript?: string,    // Transcript when audio was present
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file
  mediaType?: string,     // MIME type of the media
  isGroup?: boolean,
  groupId?: string,
}
```

#### 示例：消息记录器 Hook

```typescript
const isMessageReceivedEvent = (event: { type: string; action: string }) =>
  event.type === "message" && event.action === "received";
const isMessageSentEvent = (event: { type: string; action: string }) =>
  event.type === "message" && event.action === "sent";

const handler = async (event) => {
  if (isMessageReceivedEvent(event)) {
    console.log(`[message-logger] 收到自 ${event.context.from}: ${event.context.content}`);
  } else if (isMessageSentEvent(event)) {
    console.log(`[message-logger] 发送到 ${event.context.to}: ${event.context.content}`);
  }
};

export default handler;
```

### 工具结果 Hooks（插件 API）

这类 hooks 不是事件流监听器，而是让插件同步修改工具结果，在 OpenClaw 持久化到会话之前。

- **`tool_result_persist`**：修改工具结果，必须是同步函数；返回更新后的结果或 `undefined` 保持不变。详见 [Agent Loop](/concepts/agent-loop)。

### 插件 Hook 事件

压缩生命周期钩子，通过插件 hook 运行器暴露：

- **`before_compaction`**：压缩前，带计数与 token 元数据
- **`after_compaction`**：压缩后，含压缩摘要元数据

### 未来事件

计划支持的事件类型：

- **`session:start`**：新会话开始时
- **`session:end`**：会话结束时
- **`agent:error`**：代理遇到错误时

## 创建自定义 Hooks

### 1. 选择位置

- **Workspace hooks** (`<workspace>/hooks/`): 每个代理独立；可以添加新的 hook 名称，但无法覆盖同名的捆绑、托管或插件 hook
- **Managed hooks** (`~/.openclaw/hooks/`): 跨工作区共享；可以覆盖捆绑和插件 hook

### 2. 创建目录结构

```bash
mkdir -p ~/.openclaw/hooks/my-hook
cd ~/.openclaw/hooks/my-hook
```

### 3. 创建 HOOK.md

```markdown
---
name: my-hook
description: "执行一些有用操作"
metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
---

# 我的自定义 Hook

当你执行 `/new` 时，本 hook 会做一些有用的事情。
```

### 4. 创建 handler.ts

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log("[my-hook] 运行中！");
  // 您的逻辑写这里
};

export default handler;
```

### 5. 启用并测试

```bash
# 确认 hook 是否被发现
openclaw hooks list

# 启用 hook
openclaw hooks enable my-hook

# 重启网关进程（macOS 菜单栏 App 重启，或您的开发进程重启）

# 触发事件
# 通过消息渠道发送 /new
```

## 配置

### 新配置格式（推荐）

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

### 针对某个 Hook 的配置

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": {
            "MY_CUSTOM_VAR": "value"
          }
        }
      }
    }
  }
}
```

### 额外目录加载

从额外目录加载 hooks（视为托管 hook，具有相同的覆盖优先级）：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

### 旧配置格式（仍支持）

旧格式为兼容性保留，依然有效：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts",
          "export": "default"
        }
      ]
    }
  }
}
```

注意：`module` 必须为工作区内相对路径。绝对路径和跳出工作区目录均被拒绝。

**迁移建议**：新 hook 使用基于发现机制。旧 handler 会在目录钩子后加载。

## CLI 命令

### 列出 Hooks

```bash
# 列出所有 hooks
openclaw hooks list

# 只显示合格的 hooks
openclaw hooks list --eligible

# 详细显示（包括缺失的依赖）
openclaw hooks list --verbose

# JSON 输出
openclaw hooks list --json
```

### 查看 Hook 信息

```bash
# 查看某个 hook 的详细信息
openclaw hooks info session-memory

# JSON 输出
openclaw hooks info session-memory --json
```

### 检查条件

```bash
# 显示合格性摘要
openclaw hooks check

# JSON 输出
openclaw hooks check --json
```

### 启用 / 禁用

```bash
# 启用 hook
openclaw hooks enable session-memory

# 禁用 hook
openclaw hooks disable command-logger
```

## 内置 Hook 参考

### session-memory

Saves session context to memory when you issue `/new` or `/reset`.

**Events**: `command:new`, `command:reset`

**需求**：必须配置 `workspace.dir`

**输出**：`<workspace>/memory/YYYY-MM-DD-slug.md`（默认 `~/.openclaw/workspace`）

**功能说明**：

1. Uses the pre-reset session entry to locate the correct transcript
2. Extracts the last 15 user/assistant messages from the conversation (configurable)
3. Uses LLM to generate a descriptive filename slug
4. Saves session metadata to a dated memory file

**示例输出**：

```markdown
# 会话：2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram

## Conversation Summary

user: Can you help me design the API?
assistant: Sure! Let's start with the endpoints...
```

**文件名示例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md`（slug 生成失败时回退的时间戳名）

**启用命令**：

```bash
openclaw hooks enable session-memory
```

### bootstrap-extra-files

在 `agent:bootstrap` 阶段注入额外的启动文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**事件**：`agent:bootstrap`

**需求**：必须配置 `workspace.dir`

**输出**：不写文件，仅修改内存中的启动上下文

**配置示例**：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
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

**配置选项**：

- `paths` (string[]): 从工作区解析的 glob/路径模式。
- `patterns` (string[]): `paths` 的别名。
- `files` (string[]): `paths` 的别名。

**注意**：

- Paths are resolved relative to workspace.
- Files must stay inside workspace (realpath-checked).
- Only recognized bootstrap basenames are loaded (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`, `memory.md`).
- For subagent/cron sessions a narrower allowlist applies (`AGENTS.md`, `TOOLS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`).

**启用命令**：

```bash
openclaw hooks enable bootstrap-extra-files
```

### command-logger

将所有命令事件记录到集中审计文件。

**事件**：`command`

**需求**：无

**输出**：`~/.openclaw/logs/commands.log`

**功能说明**：

1. 捕获事件细节（命令动作、时间戳、会话键、发送者 ID、来源）
2. 以 JSONL 格式追加到日志文件
3. 静默且后台运行

**示例日志条目**：

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**查看日志命令**：

```bash
# 查看最近 20 条命令
tail -n 20 ~/.openclaw/logs/commands.log

# 用 jq 美化输出
cat ~/.openclaw/logs/commands.log | jq .

# 根据动作过滤
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**启用命令**：

```bash
openclaw hooks enable command-logger
```

### boot-md

网关启动时（频道启动后）执行 `BOOT.md`。需启用内部 hooks。

**事件**：`gateway:startup`

**需求**：必须配置 `workspace.dir`

**功能说明**：

1. 从工作区读取 `BOOT.md`
2. 通过代理运行器执行指令
3. 使用消息工具发送请求的出站消息

**启用命令**：

```bash
openclaw hooks enable boot-md
```

## 最佳实践

### 保持处理器快速

Hooks 在命令处理中执行，保持轻量：

```typescript
// ✓ 好示例 - 异步执行，立即返回
const handler: HookHandler = async (event) => {
  void processInBackground(event); // 触发后不等待
};

// ✗ 差示例 - 阻塞命令处理
const handler: HookHandler = async (event) => {
  await slowDatabaseQuery(event);
  await evenSlowerAPICall(event);
};
```

### 优雅处理错误

确保包裹高风险操作：

```typescript
const handler: HookHandler = async (event) => {
  try {
    await riskyOperation(event);
  } catch (err) {
    console.error("[my-handler] 失败:", err instanceof Error ? err.message : String(err));
    // 不抛出异常，以继续让其他处理器运行
  }
};
```

### 提前过滤事件

事件不相关时尽早返回：

```typescript
const handler: HookHandler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // 处理逻辑
};
```

### 指定精确事件键

元数据中尽量指定具体事件：

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # 精确
```

避免：

```yaml
metadata: { "openclaw": { "events": ["command"] } } # 泛用，带来额外开销
```

## 调试

### 启用 Hook 日志

网关启动时显示 hook 加载日志：

```
Registered hook: session-memory -> command:new
Registered hook: bootstrap-extra-files -> agent:bootstrap
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### 检查发现情况

列出所有发现的 hooks：

```bash
openclaw hooks list --verbose
```

### 检查注册

在处理器中打印调用日志：

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] 触发:", event.type, event.action);
  // 逻辑
};
```

### 校验资格

查看不合格原因：

```bash
openclaw hooks info my-hook
```

查看输出中的缺失依赖。

## 测试

### 监控网关日志

观察 hook 执行情况：

```bash
# macOS
./scripts/clawlog.sh -f

# 其他平台
tail -f ~/.openclaw/gateway.log
```

### 独立测试 Hooks

直接测试处理器：

```typescript
import { test } from "vitest";
import myHandler from "./hooks/my-hook/handler.js";

test("my handler works", async () => {
  const event = {
    type: "command",
    action: "new",
    sessionKey: "test-session",
    timestamp: new Date(),
    messages: [],
    context: { foo: "bar" },
  };

  await myHandler(event);

  // 断言副作用
});
```

## 架构

### 核心组件

- **`src/hooks/types.ts`**：类型定义
- **`src/hooks/workspace.ts`**：目录扫描与加载
- **`src/hooks/frontmatter.ts`**：HOOK.md 元数据解析
- **`src/hooks/config.ts`**：资格检查
- **`src/hooks/hooks-status.ts`**：状态报告
- **`src/hooks/loader.ts`**：动态模块加载器
- **`src/cli/hooks-cli.ts`**：CLI 命令
- **`src/gateway/server-startup.ts`**：网关启动时加载 hooks
- **`src/auto-reply/reply/commands-core.ts`**：触发命令事件

### 发现流程

```
网关启动
    ↓
Scan directories (bundled → plugin → managed + extra dirs → workspace)
    ↓
解析 HOOK.md 文件
    ↓
Sort by override precedence (bundled < plugin < managed < workspace)
    ↓
Check eligibility (bins, env, config, os)
    ↓
加载合格的处理器
    ↓
为事件注册处理器
```

### 事件流程

```
用户发送 /new 命令
    ↓
命令验证
    ↓
创建 hook 事件
    ↓
触发 hook（所有注册处理器）
    ↓
继续命令处理
    ↓
会话重置
```

## 故障排查

### Hook 未被发现

1. 检查目录结构：

   ```bash
   ls -la ~/.openclaw/hooks/my-hook/
   # 应包含 HOOK.md，handler.ts
   ```

2. 验证 HOOK.md 格式：

   ```bash
   cat ~/.openclaw/hooks/my-hook/HOOK.md
   # 应包含 YAML frontmatter 和 name、metadata
   ```

3. 列出所有已发现的 hook：

   ```bash
   openclaw hooks list
   ```

### Hook 不合格

检查需求：

```bash
openclaw hooks info my-hook
```

关注缺失的：

- 二进制程序（检查 PATH）
- 环境变量
- 配置
- OS 兼容性

### Hook 不执行

1. 确认 hook 已启用：

   ```bash
   openclaw hooks list
   # 已启用的 hook 左侧显示 ✓
   ```

2. 重启网关进程以重新加载 hook。

3. 查看网关日志是否有错误：

   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### 处理器错误

检查 TypeScript 或导入错误：

```bash
# 直接测试导入
node -e "import('./path/to/handler.ts').then(console.log)"
```

## 迁移指南

### 从旧配置迁移到发现机制

**旧配置示例**：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts"
        }
      ]
    }
  }
}
```

**迁移步骤**：

1. 创建 hook 目录：

   ```bash
   mkdir -p ~/.openclaw/hooks/my-hook
   mv ./hooks/handlers/my-handler.ts ~/.openclaw/hooks/my-hook/handler.ts
   ```

2. 创建 HOOK.md：

   ```markdown
   ---
   name: my-hook
   description: "我的自定义 hook"
   metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
   ---

   # 我的 Hook

   执行一些有用的操作。
   ```

3. 更新配置：

   ```json
   {
     "hooks": {
       "internal": {
         "enabled": true,
         "entries": {
           "my-hook": { "enabled": true }
         }
       }
     }
   }
   ```

4. 验证并重启网关：

   ```bash
   openclaw hooks list
   # 应显示：🎯 my-hook ✓
   ```

**迁移优势**：

- 自动发现
- CLI 管理
- 资格检查
- 更好的文档支持
- 结构一致

## 相关链接

- [CLI 参考：hooks](/cli/hooks)
- [内置 Hooks README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/automation/webhook)
- [配置](/gateway/configuration-reference#hooks)
