---
summary: "通过 CLI 运行 agent 回合，并可选择将回复投递到各个渠道"
read_when:
  - 你想从脚本或命令行触发 agent 运行
  - 你需要以编程方式将 agent 回复投递到聊天渠道
title: "Agent 发送"
---

`openclaw agent` 会从命令行运行一个单独的 agent 回合，而不需要
传入聊天消息。可用于脚本化工作流、测试以及
程序化投递。完整的标志和行为参考：
[Agent CLI 参考](/cli/agent)。

对于严格、短暂的 CI 或代码自动化场景，如果需要自行负责设置、清理、
输出投影以及进程状态，请使用 [`openclaw agent exec`](/cli/agent#agent-exec)。

## 快速开始

<Steps>
  <Step title="运行一个简单的 agent 回合">
    ```bash
    openclaw agent --agent main --message "What is the weather today?"
    ```

    通过 Gateway 发送消息并打印回复。

  </Step>

  <Step title="从文件发送多行提示">
    ```bash
    openclaw agent --agent ops --message-file ./task.md
    ```

    读取一个有效的 UTF-8 文件作为 agent 消息体。

  </Step>

  <Step title="指定特定 agent 或会话">
    ```bash
    # 指定特定的 agent
    openclaw agent --agent ops --message "总结日志"

    # 指定一个电话号码（派生 session key）
    openclaw agent --to +15555550123 --message "状态更新"

    # 复用一个现有会话
    openclaw agent --session-id abc123 --message "继续任务"

    # 目标指定一个精确的 session key
    openclaw agent --session-key agent:ops:incident-42 --message "总结状态"
    ```

  </Step>

  <Step title="将回复投递到渠道">
    ```bash
    # 投递到 WhatsApp（默认渠道）
    openclaw agent --to +15555550123 --message "报告已准备好" --deliver

    # 投递到 Slack
    openclaw agent --agent ops --message "生成报告" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## 标志

| 标志                        | 描述                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| `--message <text>`          | 要发送的内联消息                                               |
| `--message-file <path>`     | 从有效的 UTF-8 文件中读取消息（最大 4 MiB）                 |
| `--to <dest>`               | 从目标（手机号、聊天 ID）推导会话密钥                    |
| `--session-key <key>`       | 使用显式会话密钥                                          |
| `--agent <id>`              | 目标为已配置的代理（使用其 `main` 会话）                  |
| `--session-id <id>`         | 按 ID 复用现有会话                                      |
| `--model <id>`              | 本次运行的模型覆盖（`provider/model` 或模型 ID）           |
| `--local`                   | 强制使用本地嵌入式运行时（跳过 Gateway）                          |
| `--deliver`                 | 将回复发送到聊天频道                                     |
| `--channel <name>`          | 投递频道；与 `--agent` + `--to` 一起使用时，也适用于 DM 范围     |
| `--reply-to <target>`       | 投递目标覆盖                                             |
| `--reply-channel <name>`    | 投递频道覆盖                                            |
| `--reply-account <id>`      | 投递账户 ID 覆盖                                         |
| `--thinking <level>`        | 为所选模型配置文件设置思考等级                    |
| `--verbose <on\|full\|off>` | 为会话持久化详细级别（`full` 也会记录工具输出） |
| `--timeout <seconds>`       | 覆盖代理超时时间（默认 600，或配置值）                |
| `--json`                    | 输出结构化 JSON                                               |

## 行为

- 默认情况下，CLI 通过 **Gateway** 运行。添加 `--local` 可强制使用当前机器上的嵌入式运行时。
- 必须且只能传入 `--message` 或 `--message-file` 之一。文件消息在移除可选的 UTF-8 BOM 后会保留多行内容。大于 4 MiB 的文件会在分发前被拒绝。
- 在经过临时握手重试后，如果出现 Gateway 超时或连接关闭，命令会失败并在 stderr 中给出提示；CLI 不会静默地改为在嵌入式环境中重新执行该轮。Gateway 可能仍会完成一个已接受的轮次，因此在重试或使用 `--local` 重新运行之前，请先检查 Gateway 和会话状态。
- 会话选择：`--to` 会派生会话键（群组/频道目标会保留隔离；私聊会折叠为 `main`）。当 `--agent`、`--channel` 和 `--to` 一起使用时，路由遵循频道的规范收件人和 `session.dmScope`。稳定的仅出站身份会使用一个由提供方拥有、且与代理主会话隔离的会话。
- `--session-key` 用于选择显式键。带代理前缀的键必须使用 `agent:<agent-id>:<session-key>`，并且当同时提供时，`--agent` 必须与该 agent id 匹配。裸的非哨兵键在提供 `--agent` 时会限定到 `--agent`；例如，`--agent ops --session-key incident-42` 会路由到 `agent:ops:incident-42`。如果没有 `--agent`，裸的非哨兵键会限定到已配置的默认代理。字面量 `global` 和 `unknown` 仅在未提供 `--agent` 时才保持不限定范围。
- `--reply-channel` 和 `--reply-account` 只影响投递。
- 思考和详细输出标志会持久化到会话存储中。
- 输出：默认是纯文本，或使用 `--json` 输出结构化负载 + 元数据。
- 使用 `--json --deliver` 时，JSON 会包含发送、抑制、部分发送和失败发送的投递状态。参见
  [JSON 投递状态](/cli/agent#json-delivery-status)。

## 示例

```bash
# 使用 JSON 输出的简单回合
openclaw agent --to +15555550123 --message "跟踪日志" --verbose on --json

# 使用模型覆盖的回合
openclaw agent --agent ops --model openai/gpt-5.4 --message "总结日志"

# 使用思考级别的回合
openclaw agent --session-id 1234 --message "总结收件箱" --thinking medium

# 从文件发送多行提示
openclaw agent --agent ops --message-file ./task.md

# 精确 session key
openclaw agent --session-key agent:ops:incident-42 --message "总结状态"

# 限定到某个 agent 的旧式 key
openclaw agent --agent ops --session-key incident-42 --message "总结状态"

# 投递到与会话不同的渠道
openclaw agent --agent ops --message "警报" --deliver --reply-channel telegram --reply-to "@admin"
```

## 相关内容

<CardGroup cols={2}>
  <Card title="Agent CLI 参考" href="/cli/agent" icon="terminal">
    完整的 `openclaw agent` 标志和选项参考。
  </Card>
  <Card title="子代理" href="/tools/subagents" icon="users">
    后台子 agent 启动。
  </Card>
  <Card title="会话" href="/concepts/session" icon="comments">
    session key 的工作方式，以及 `--to`、`--agent` 和 `--session-id` 如何解析它们。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="slash">
    agent 会话中使用的原生命令目录。
  </Card>
</CardGroup>
