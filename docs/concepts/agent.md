---
summary: "代理运行时、工作区契约和会话引导"
read_when:
  - 更改代理运行时、工作区引导或会话行为
title: "代理运行时"
---

# 代理运行时

OpenClaw 运行一个单一的嵌入式代理运行时。

## 工作区（必填）

OpenClaw 使用单一代理工作区目录（`agents.defaults.workspace`）作为代理工具和上下文的**唯一**工作目录（`cwd`）。

推荐：如果缺失，使用 `openclaw setup` 创建 `~/.openclaw/openclaw.json` 并初始化工作区文件。

完整工作区布局 + 备份指南：[代理工作区](/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以通过每会话工作区覆盖此设置，路径为 `agents.defaults.sandbox.workspaceRoot`（详见[网关配置](/gateway/configuration)）。

## 引导文件（注入）

在 `agents.defaults.workspace` 中，OpenClaw 期望以下用户可编辑文件：

- `AGENTS.md` — 操作说明 + “记忆”
- `SOUL.md` — 角色设定、边界、语气
- `TOOLS.md` — 用户维护的工具说明（如 `imsg`、`sag`、约定等）
- `BOOTSTRAP.md` — 一次性首次运行仪式（完成后删除）
- `IDENTITY.md` — 代理名称/风格/表情符号
- `USER.md` — 用户档案 + 首选称呼

新会话的首次轮次，OpenClaw 会将这些文件的内容直接注入代理上下文。

空白文件将被跳过。大型文件会被裁剪并以标记符截断，以保持提示精简（完整内容请查看文件）。

如果文件缺失，OpenClaw 会注入一行“缺失文件”标记（`openclaw setup` 会创建安全默认模板）。

`BOOTSTRAP.md` 仅为**全新工作区**创建（不存在其他引导文件时）。完成仪式后删除，后续重启时不会重新创建。

如需完全禁止创建引导文件（适用于预设工作区），请设置：

```json5
{ agent: { skipBootstrap: true } }
```

## 内置工具

核心工具（读取/执行/编辑/写入及相关系统工具）始终可用，受工具策略限制。`apply_patch` 是可选的，由 `tools.exec.applyPatch` 控制。`TOOLS.md` **不控制**工具是否存在；它是指导你如何使用工具的说明。

## 技能

OpenClaw 从三个位置加载技能（遇到同名以工作区为准）：

- 内置（随安装包提供）
- 管理/本地：`~/.openclaw/skills`
- 工作区：`<workspace>/skills`

技能可以通过配置或环境变量进行控制（详见[网关配置](/gateway/configuration)中的 `skills`）。

## 运行时边界

嵌入式代理运行时构建于 Pi 代理核心（模型、工具和提示管道）之上。会话管理、发现、工具连接和渠道投递是 OpenClaw 在该核心之上拥有的层。

## 会话

会话记录以 JSONL 格式存储于：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，由 OpenClaw 选择。
不读取来自其他工具的遗留会话文件夹。

## 流式传输时的引导

当队列模式为 `steer` 时，收到的消息会被注入当前运行中。排队的引导在**当前助手轮次完成其工具调用执行后**、下一次 LLM 调用前递送。引导不再跳过当前助手消息中剩余的工具调用；它会在下一个模型边界处注入排队的消息。

当队列模式为 `followup` 或 `collect`，收到的消息会被延迟处理，等当前轮次结束后再启动一个新的代理轮次。详情见[队列](/concepts/queue)中模式及去抖/容量行为。

块级流式会在助手块完成后立即发送；默认**关闭**（`agents.defaults.blockStreamingDefault: "off"`）。
通过 `agents.defaults.blockStreamingBreak` 调整边界（`text_end` 和 `message_end`，默认 `text_end`）。
用 `agents.defaults.blockStreamingChunk` 控制软块分割（默认 800–1200 个字符；优先段落分割，再换行，最后句子）。
使用 `agents.defaults.blockStreamingCoalesce` 合并流块，以减少单行刷屏（发送前基于空闲合并）。非 Telegram 渠道需显式设置 `*.blockStreaming: true` 才能启用块回复。
详细工具摘要在工具启动时发送（无去抖）；控制界面在可用时通过代理事件流式输出工具结果。
更多细节：[流式传输 + 分块](/concepts/streaming)。

## 模型引用

配置中的模型引用（如 `agents.defaults.model` 和 `agents.defaults.models`）通过第一次出现的 `/` 分割解析。

- 配置模型时请使用 `provider/model` 格式。
- 如果模型 ID 本身含有 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 若省略提供商，OpenClaw 会将输入视为默认提供商的别名或模型 ID（模型 ID 中不能带 `/`）。

## 配置（最简）

至少设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

_下一篇：[群聊](/channels/group-messages)_ 🦞
