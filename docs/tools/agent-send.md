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

| Flag                        | 描述                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| `--message <text>`          | 内联消息发送                                                          |
| `--message-file <path>`     | 从有效的 UTF-8 文件中读取消息                                         |
| `--to <dest>`               | 从目标（电话、聊天 id）派生会话密钥                                     |
| `--session-key <key>`       | 使用显式会话密钥                                                      |
| `--agent <id>`              | 指定一个已配置的代理（使用其 `main` 会话）                             |
| `--session-id <id>`         | 通过 id 复用现有会话                                                  |
| `--model <id>`              | 本次运行的模型覆盖（`provider/model` 或模型 id）                        |
| `--local`                   | 强制使用本地嵌入式运行时（跳过 Gateway）                               |
| `--deliver`                 | 将回复发送到聊天频道                                                   |
| `--channel <name>`          | 投递渠道（discord、slack、telegram、whatsapp 等）                      |
| `--reply-to <target>`       | 投递目标覆盖                                                          |
| `--reply-channel <name>`    | 投递渠道覆盖                                                          |
| `--reply-account <id>`      | 投递账户 id 覆盖                                                      |
| `--thinking <level>`        | 为所选模型配置文件设置思考级别                                          |
| `--verbose <on\|full\|off>` | 为会话持久化详细级别（`full` 也会记录工具输出）                         |
| `--timeout <seconds>`       | 覆盖代理超时（默认 600，或配置值）                                     |
| `--json`                    | 输出结构化 JSON                                                      |

## 行为

- 默认情况下，CLI 通过 **Gateway** 运行。添加 `--local` 可强制在当前机器上使用嵌入式运行时。
- `--message` 和 `--message-file` 必须且只能传入一个。文件消息在移除可选的 UTF-8 BOM 后，会保留多行内容。
- 如果 Gateway 请求失败，CLI 会 **回退** 到本地嵌入式运行；Gateway 超时会使用全新的会话回退，而不是与原始转录内容竞争。
- 会话选择：`--to` 会派生会话键（群组/频道目标会保留隔离性；直接聊天会折叠为 `main`）。
- `--session-key` 用于选择显式键。以 agent 为前缀的键必须使用 `agent:<agent-id>:<session-key>`，并且当两者都提供时，`--agent` 必须与该 agent id 匹配。裸露的非 sentinel 键在提供 `--agent` 时会限定到 `--agent`；例如，`--agent ops --session-key incident-42` 会路由到 `agent:ops:incident-42`。在没有 `--agent` 时，裸露的非 sentinel 键会限定到配置的默认 agent。字面量 `global` 和 `unknown` 仅在未提供 `--agent` 时才保持不限定；嵌入式回退路径会将这些 sentinel 会话解析为配置的默认 agent。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复投递，而不是会话路由。
- thinking 和 verbose 标志会持续写入会话存储。
- 输出：默认是纯文本，或使用 `--json` 输出结构化负载 + 元数据。
- 使用 `--json --deliver` 时，JSON 会包含已发送、已抑制、部分发送和发送失败的投递状态。参见
  [JSON 投递状态](/cli/agent#json-delivery-status)。

## 示例

```bash
# 使用 JSON 输出的简单回合
openclaw agent --to +15555550123 --message "跟踪日志" --verbose on --json

# 使用模型覆盖的回合
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"

# 使用思考级别的回合
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

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
