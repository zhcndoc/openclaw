---
summary: "Hook 目录布局、处理程序合约、回复传递和 HOOK.md 元数据字段"
read_when:
  - "您正在编写一个新的内部钩子并且需要文件布局"
  - "您需要处理程序签名、事件字段或回复传递边界"
  - "您需要 `HOOK.md` frontmatter 和 `metadata.openclaw` 合约"
title: "写作挂钩"
---

挂钩文件布局、处理程序合约、回复传递和 `HOOK.md` 元数据字段。 [Hooks](/automation/hooks) 指南的一部分。

## <a id="writing-hooks"></a> 编写钩子

此示例响应重置命令并写入固定日志标记。它不读取消息内容、调用模型或联系外部服务。

### <a id="hook-structure"></a> 钩子结构

在网关主机上，使用新的托管挂钩目录。以下命令假定默认状态目录并且 `reset-greeting` 尚不存在；选择另一个名称而不是覆盖现有的钩子。

```bash
mkdir -p ~/.openclaw/hooks/reset-greeting

cat > ~/.openclaw/hooks/reset-greeting/HOOK.md <<'HOOK'
---
name: reset-greeting
description: "Confirm that a reset hook ran"
metadata:
  { "openclaw": { "events": ["command:new", "command:reset"] } }
---

# Reset greeting

Send a short confirmation after an authorized reset command.
HOOK

cat > ~/.openclaw/hooks/reset-greeting/handler.js <<'HANDLER'
export default function handler(event) {
  if (event.type !== "command" || !["new", "reset"].includes(event.action)) {
    return;
  }

  console.log("[reset-greeting] reset hook ran");
  event.messages.push("Reset hook ran.");
}
HANDLER
```

挂钩需要 `HOOK.md` 和处理程序文件。发现使用它找到的第一个文件按顺序检查 `handler.ts`、`handler.js`、`index.ts`，然后检查 `index.js`。该示例使用 JavaScript，因此不需要 TypeScript 类型或 SDK 导入。

启用并加载它：

```bash
openclaw hooks info reset-greeting
openclaw hooks enable reset-greeting
```

在配置的聊天通道上的一次性对话中发送 `/new`，该通道可以路由回复，例如向机器人发送直接消息。该对话中预计有 **Reset hook ran.** ，网关日志中预计有 `[reset-greeting] reset hook ran` 。 `/reset` 触发相同的示例。正常的命令授权仍然适用。

使用普通的 OpenClaw 会话，而不是 ACP- 绑定线程；绑定会话将重置处理委托给其所属的运行时。不要使用 Control UI/webchat 或 `sessions.reset` RPC 作为聊天回复检查：这些路径不会将此挂钩的 `event.messages` 传递到 UI。日志标记仍然可以显示重置事件已运行。具体边界见[回复投递](/automation/hooks/writing-hooks#reply-delivery)。

完成后禁用该示例：

```bash
openclaw hooks disable reset-greeting
```

禁用会使文件保留在原位。要使用工作区目录，请将这两个文件放入 `<workspace>/hooks/reset-greeting/` 中，然后显式启用该挂钩。工作区放置不是代理沙箱，也不能保证网关将加载该工作区的挂钩。

### <a id="handler-implementation"></a> 处理器实现

处理程序导出返回 `void` 或 `Promise<void>` 的函数。加载程序使用默认导出，除非 `metadata.openclaw.export` 指定另一个导出。返回值不会阻止、取消或重写操作。

每个事件都有这些字段：

| 字段        | 含义                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `type`       | 系列：`command`、`session`、`agent`、`gateway` 或 `message`                                                         |
| `action`     | 家庭内的行动，例如 `new` 或 `compact:before`                                                            |
| `sessionKey` | 会话关联键；网关事件使用网关密钥代替                                                      |
| `timestamp`  | JavaScript 创建事件对象时的 `Date`                                                                    |
| `context`    | [事件上下文重点描述的事件特定数据](/automation/hooks/event-types#event-context-highlights) |
| `messages`   | 最初为空字符串数组；只有某些生产者将其作为回复使用                                             |

将上下文视为观察，而不是实时状态编辑 API。字段因生产者而异，并且 `cfg` 并不出现在每个事件中。特别是，补丁事件带有克隆快照。显式可变异常是 `agent:bootstrap` 的 `context.bootstrapFiles`。

### <a id="reply-delivery"></a> 回复发货

推送到 `event.messages` 不是一般的发送消息 API：

| 制片人                                                                     | `event.messages` 会发生什么                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/new` 和 `/reset` 的聊天命令处理                                | 等待处理程序，用空行连接字符串，并尝试回复原始 channel/recipient，保留帐户和线程上下文 |
| 发出 `command:new` 或 `command:reset` 的网关会话 reset/create RPC | 处理程序运行，但消息不会作为聊天回复进行路由                                                                                         |
| `session:compact:before` 和 `session:compact:after`                         | 当存在时转发到调用者的压缩通知回调；该回调拥有交付                                                    |
| 所有其他核心事件                                                        | 忽略回复，包括 `/stop`、自动重置、消息事件、引导程序、补丁和网关生命周期事件                            |

缺少收件人、不受支持的路由、发送策略或传送失败可能会阻止回复。在处理程序的承诺解决之前附加消息；稍后推送的独立工作可能会错过生产者的交付步骤。要控制正常代理回复或发送取消，请使用适当的 [ 类型插件钩子 ](/plugins/hooks)。

### <a id="hook.md-format"></a><a id="hook-md-format"></a> HOOK.md 格式

`HOOK.md` 使用 YAML frontmatter 后跟人类可读的 Markdown：

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://example.com/my-hook
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Explain the side effects, configuration, and verification steps here.
```

`name` 默认为目录名；使用独特、稳定的名称。 `description` 显示在报告中。以下字段属于 `metadata.openclaw`。

2026 年 7 月之前的 `metadata.clawdbot` 格式不再被读取。通过将该元数据块重命名为 `openclaw` 来更新旧的 `HOOK.md`，保留其事件列表和其他字段。如果 `openclaw` 块已存在，请保留其值并仅合并您仍需要的旧字段。 OpenClaw 不重写文件；旧块中的事件声明和要求将被忽略。

| 字段              | 契约                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `events`           | 事件键数组。注册处理程序至少需要一个。                                                                                                                                                           |
| `export`           | 函数导出名称；默认为 `default`。                                                                                                                                                                             |
| `hookKey`          | 配置输入键；默认为钩子名称。发现冲突仍然使用钩子名称。                                                                                                                               |
| `emoji`            | 显示表情符号。                                                                                                                                                                                                           |
| `homepage`         | 文档 URL；覆盖顶级 `homepage`、`website` 或 `url`。                                                                                                                                                  |
| `os`               | 允许的 Node 平台名称，例如 `darwin`、`linux` 或 `win32`。                                                                                                                                                  |
| `requires.bins`    | 每个指定的可执行文件必须位于 `PATH` 上。                                                                                                                                                                                |
| `requires.anyBins` | `PATH` 上必须至少有一个指定的可执行文件。                                                                                                                                                                         |
| `requires.env`     | 每个命名变量都需要一个非空过程值或每个挂钩 `env` 值。                                                                                                                                             |
| `requires.config`  | 每个点的配置路径都必须是真实的。                                                                                                                                                                                 |
| `always`           | 绕过二进制、环境和配置要求；不会绕过 OS 或启用策略。                                                                                                                            |
| `install`          | 信息安装描述符：`kind` 是 `bundled`、`npm` 或 `git`；可选 `id`、`label`、`package`、`repository` 和 `bins`。此元数据不会安装依赖项或使 Git 规范被 CLI 接受。 |

使用 `hooks.internal.entries.<hookKey>.enabled` 来控制激活，而不是 `HOOK.md` 中的顶级 `enabled` 标志。对于历史需求元数据，`workspace.dir`、`browser.enabled` 和 `browser.evaluateEnabled` 在不存在时默认为 true。 `workspace.dir` 不是您需要添加到配置中的新设置。
