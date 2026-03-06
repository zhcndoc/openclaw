---
summary: "直接运行 `openclaw agent` CLI（可选投递）"
read_when:
  - 添加或修改 agent CLI 入口点
title: "Agent 发送"
---

# `openclaw agent`（直接运行 agent）

`openclaw agent` 运行单个 agent 回合，无需入站聊天消息。默认情况下，它 **通过 Gateway** 运行；添加 `--local` 可强制使用当前机器上的嵌入式运行时。

## 行为

- 必需参数：`--message <文本>`
- 会话选择：
  - `--to <目标>` 从目标推导会话密钥（群组/频道保持隔离；私聊合并为 `main`），**或者**
  - `--session-id <id>` 复用已有会话 ID，**或者**
  - `--agent <id>` 直接指定配置好的 agent（使用该 agent 的 `main` 会话密钥）
- 运行与普通入站回复相同的嵌入式 agent 运行时。
- 思考/详细标记会保留到会话存储中。
- 输出：
  - 默认：打印回复文本（加上 `MEDIA:<url>` 行）
  - `--json`：打印结构化负载及元数据
- 可选通过 `--deliver` + `--channel` 将回复投递到频道（目标格式匹配 `openclaw message --target`）。
- 使用 `--reply-channel`/`--reply-to`/`--reply-account` 覆盖投递目标，而不改变会话。

如果 Gateway 不可达，CLI 会 **回退** 到嵌入式本地运行。

## 示例

```bash
openclaw agent --to +15555550123 --message "status update"
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --to +15555550123 --message "Summon reply" --deliver
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 参数

- `--local`：本地运行（需要在 shell 中配置模型提供者 API 密钥）
- `--deliver`：将回复发送到选定频道
- `--channel`：投递频道（`whatsapp|telegram|discord|googlechat|slack|signal|imessage`，默认：`whatsapp`）
- `--reply-to`：投递目标覆盖
- `--reply-channel`：投递频道覆盖
- `--reply-account`：投递账户 ID 覆盖
- `--thinking <off|minimal|low|medium|high|xhigh>`：持久化思考等级（仅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`：持久化详细等级
- `--timeout <秒>`：覆盖 agent 超时设置
- `--json`：输出结构化 JSON
