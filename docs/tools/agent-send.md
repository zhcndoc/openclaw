---
summary: "通过 CLI 运行 agent 回合，并可选择将回复投递到各个渠道"
read_when:
  - "你想从脚本或命令行触发 agent 运行"
  - "你需要以编程方式将 agent 回复投递到聊天渠道"
title: "Agent 发送"
---

`openclaw agent` 会从命令行运行一个单独的 agent 回合，而不需要传入聊天消息。可用于脚本化工作流、测试以及程序化投递。完整的标志和行为参考： [Agent CLI 参考](/cli/agent)。

对于严格、短暂的 CI 或代码自动化场景，如果需要自行负责设置、清理、 输出投影以及进程状态，请使用 [`openclaw agent exec`](/cli/agent#agent-exec)。

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="run-a-simple-agent-turn" title="运行一个简单的代理回合">
    ```bash
    openclaw agent --agent main --message "What is the weather today?"
    ```

    通过 Gateway 发送消息并打印回复。

  </Step>

  <Step id="send-a-multiline-prompt-from-a-file" title="从文件发送多行提示">
    ```bash
    openclaw agent --agent ops --message-file ./task.md
    ```

    读取一个有效的 UTF-8 文件作为 agent 消息体。

  </Step>

  <Step id="target-a-specific-agent-or-session" title="定位特定代理或会话">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"

    # Target an exact session key
    openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
    ```

  </Step>

  <Step id="deliver-the-reply-to-a-channel" title="将回复发送到频道">
    ```bash
    # Deliver to WhatsApp (default channel)
    openclaw agent --to +15555550123 --message "Report ready" --deliver

    # Deliver to Slack
    openclaw agent --agent ops --message "Generate report" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## <a id="flags"></a> 标志

| 标志                        | 描述                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `--message <text>`          | 要发送的内联消息                                               |
| `--message-file <path>`     | 从有效的 UTF-8 文件中读取消息（最大 4 MiB）                 |
| `--to <dest>`               | 从目标（电话、聊天 ID）派生会话密钥                    |
| `--session-key <key>`       | 使用显式会话密钥                                          |
| `--agent <id>`              | 目标为已配置的代理（使用其 `main` 会话）                  |
| `--session-id <id>`         | 按 id 重用现有会话                                      |
| `--model <id>`              | 本次运行的模型覆盖（`provider/model` 或模型 ID）           |
| `--local`                   | 强制使用本地嵌入式运行时（跳过 Gateway）                          |
| `--deliver`                 | 将回复发送到聊天频道                                     |
| `--channel <name>`          | 投递频道；与 `--agent` + `--to` 一起使用时，也适用于 DM 范围     |
| `--reply-to <target>`       | 投递目标覆盖                                             |
| `--reply-channel <name>`    | 投递频道覆盖                                            |
| `--reply-account <id>`      | 送货帐户 ID 覆盖                                         |
| `--thinking <level>`        | 为所选模型配置文件设置思考等级                    |
| `--verbose <on\|full\|off>` | 为会话持久化详细级别（`full` 也会记录工具输出） |
| `--timeout <seconds>`       | 覆盖代理超时时间（默认 600，或配置值）                |
| `--json`                    | 输出结构化 JSON                                               |

## <a id="behavior"></a> 行为

- 默认情况下，CLI 通过 **Gateway** 运行。添加 `--local` 可强制使用当前机器上的嵌入式运行时。
- 必须且只能传入 `--message` 或 `--message-file` 之一。文件消息在移除可选的 UTF-8 BOM 后会保留多行内容。大于 4 MiB 的文件会在分发前被拒绝。
- 在经过临时握手重试后，如果出现 Gateway 超时或连接关闭，命令会失败并在 stderr 中给出提示；CLI 不会静默地改为在嵌入式环境中重新执行该轮。Gateway 可能仍会完成一个已接受的轮次，因此在重试或使用 `--local` 重新运行之前，请先检查 Gateway 和会话状态。
- 会话选择：`--to` 派生会话密钥（group/channel 目标保持隔离；直接聊天崩溃到 `main`）。将 `--agent`、`--channel` 和 `--to` 组合在一起，路由将遵循通道已解析的收件人和 `session.dmScope`。稳定的仅出站身份使用与代理主会话隔离的提供商拥有的会话。
- `--session-key` 选择显式密钥。代理前缀密钥必须使用 `agent:<agent-id>:<session-key>`，并且 `--agent` 必须与代理 ID 匹配（当两者都提供时）。裸露的非哨兵密钥在提供时范围为 `--agent`；例如，`--agent ops --session-key incident-42` 路由至 `agent:ops:incident-42`。如果没有 `--agent`，裸露的非哨兵键的范围仅限于配置的默认代理。仅当未提供 `--agent` 时，文字 `global` 和 `unknown` 才保持无作用域。
- `--reply-channel` 和 `--reply-account` 只影响投递。
- 思考和详细输出标志会持久化到会话存储中。
- 输出：默认是纯文本，或使用 `--json` 输出结构化负载 + 元数据。
- 使用 `--json --deliver` 时，JSON 会包含发送、抑制、部分发送和失败发送的投递状态。参见 [JSON 投递状态](/cli/agent#json-delivery-status)。

## <a id="examples"></a> 示例

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with a model override
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Multiline prompt from a file
openclaw agent --agent ops --message-file ./task.md

# Exact session key
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"

# Bare key scoped to an agent
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="代理CLI参考" href="/cli/agent" icon="terminal">
    完整的 `openclaw agent` 标志和选项参考。
  </Card>
  <Card title="子代理" href="/tools/subagents" icon="users">
    后台子 agent 启动。
  </Card>
  <Card title="会话" href="/concepts/session" icon="comments">
    session key 的工作方式，以及 `--to`、`--agent` 和 `--session-id` 如何解析它们。
  </Card>
  <Card title="反应" href="/tools/reactions" icon="thumbs-up">
    每个通道 `react` 操作的表情符号反应语义。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="slash">
    agent 会话中使用的原生命令目录。
  </Card>
  <Card title="ACP 代理" href="/tools/acp-agents" icon="robot">
    可通过 ACP 联系外部代理。
  </Card>
</CardGroup>
