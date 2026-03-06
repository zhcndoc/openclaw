---
summary: "关于 /think 和 /verbose 指令语法及其如何影响模型推理的说明"
read_when:
  - 调整思考或详细指令解析或默认值时
title: "思考等级"
---

# 思考等级 (/think 指令)

## 功能介绍

- 在任何传入消息正文内使用内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`.
- 等级（别名）：`off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → “思考”
  - low → “深入思考”
  - medium → “更深入思考”
  - high → “极致思考”（最大预算）
  - xhigh → “极致思考+”（仅限 GPT-5.2 + Codex 模型）
  - adaptive → 提供者管理的自适应推理预算（支持 Anthropic Claude 4.6 模型家族）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 都映射为 `xhigh`。
  - `highest`、`max` 映射为 `high`。
- 提供者说明：
  - Anthropic Claude 4.6 系列模型在未显式设置思考等级时默认使用 `adaptive`。
  - Z.AI (`zai/*`) 仅支持二元思考模式（`on`/`off`），任何非 `off` 等级均视为 `on`（映射为 `low`）。
  - Moonshot (`moonshot/*`) 将 `/think off` 映射为 `thinking: { type: "disabled" }`，任何非 `off` 等级映射为 `thinking: { type: "enabled" }`。启用思考时，Moonshot 只接受 `tool_choice` 的值为 `auto` 或 `none`；OpenClaw 会将不兼容的值规范化为 `auto`。

## 解析优先级顺序

1. 消息内联指令（仅应用于本消息）。
2. 会话覆盖（通过发送仅含指令的消息设置）。
3. 全局默认值（配置中 `agents.defaults.thinkingDefault`）。
4. 兜底：Anthropic Claude 4.6 模型为 `adaptive`，其它支持推理的模型为 `low`，否则为 `off`。

## 设置会话默认值

- 发送一条仅包含指令的消息（允许包含空白），例如 `/think:medium` 或 `/t high`。
- 该设置在当前会话（默认按发送者区分）中生效；通过发送 `/think:off` 或会话空闲重置清除。
- 会收到确认回复（如 `Thinking level set to high.` / `Thinking disabled.`）。如果等级无效（例如 `/thinking big`），指令会被拒绝并提示，且会话状态保持不变。
- 发送 `/think`（或 `/think:`）无参数时，可查看当前思考等级。

## 代理应用

- **嵌入式 Pi**：解析后的等级会传递给进程内的 Pi 代理运行时。

## 详细日志指令 (/verbose 或 /v)

- 等级：`on`（最小详细） | `full` | `off`（默认）。
- 仅含指令的消息切换会话详细日志状态，并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效等级会返回提示且不改变状态。
- `/verbose off` 会存储显式的会话覆盖；可通过 Sessions UI 选择 `inherit` 来清除。
- 内联指令仅影响当前消息；否则应用会话/全局默认。
- 发送 `/verbose`（或 `/verbose:`）无参数时查看当前详细等级。
- 详细日志开启时，发出结构化工具结果的代理（Pi 及其他 JSON 代理）会将每个工具调用作为单独仅元数据消息发送，带有前缀 `<emoji> <tool-name>: <arg>`（如果可用，显示路径/命令）。这些工具摘要在工具启动时即发送（单独气泡），非流式增量。
- 工具失败摘要在常规模式下可见，但原始错误详细信息后缀仅在详细等级为 `on` 或 `full` 时显示。
- 详细等级为 `full` 时，工具输出完成后也会转发（单独气泡，截断至安全长度）。如果在运行中切换 `/verbose on|full|off`，后续工具气泡将遵循新的设置。

## 推理可见性 (/reasoning)

- 等级：`on | off | stream`。
- 仅含指令的消息切换是否在回复中显示思考块。
- 启用时，推理作为**独立消息**发送，前缀为 `Reasoning:`。
- `stream`（仅 Telegram）：在回复生成时将推理内容流式发送至 Telegram 草稿区，发送最终答案时不附带推理。
- 别名：`/reason`。
- 发送 `/reasoning`（或 `/reasoning:`）无参数时查看当前推理等级。

## 相关

- 提升模式文档存放于 [提升模式](/tools/elevated) 。

## 心跳

- 心跳探测消息正文为配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令正常生效（但避免通过心跳更改会话默认）。
- 心跳默认只发送最终负载。若需同时发送独立的 `Reasoning:` 消息（如果存在），可设置 `agents.defaults.heartbeat.includeReasoning: true` 或特定代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天界面

- 网页聊天思考选择器在页面加载时，反映会话存储的等级（来源于入站会话存储/配置）。
- 选择其他等级仅影响下一条消息（`thinkingOnce`）；发送后选择器恢复至存储的会话等级。
- 若要修改会话默认值，发送 `/think:<level>` 指令（同前）；选择器将在下一次重载后反映更改。
