---
summary: "通过 CLI 运行 agent 回合，并可选择将回复投递到各个渠道"
read_when:
  - 你想从脚本或命令行触发 agent 运行
  - 你需要以编程方式将 agent 回复投递到聊天渠道
title: "Agent send"
---

`openclaw agent` 从命令行运行单个 agent 回合，无需传入
聊天消息。可用于脚本化工作流、测试和
程序化投递。

## 快速开始

<Steps>
  <Step title="运行一个简单的 agent 回合">
    ```bash
    openclaw agent --agent main --message "What is the weather today?"
    ```

    这会通过 Gateway 发送消息并打印回复。

  </Step>

  <Step title="从文件发送多行提示">
    ```bash
    openclaw agent --agent ops --message-file ./task.md
    ```

    这会将一个有效的 UTF-8 文件作为 agent 消息正文读取。

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

| Flag                          | Description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| `--message \<text\>`          | 内联发送的消息                                              |
| `--message-file \<path\>`     | 从有效的 UTF-8 文件读取消息                                 |
| `--to \<dest\>`               | 从目标（电话、聊天 ID）派生 session key                     |
| `--session-key \<key\>`       | 使用显式 session key                                        |
| `--agent \<id\>`              | 目标为已配置的 agent（使用其 `main` 会话）                  |
| `--session-id \<id\>`         | 通过 id 复用现有会话                                        |
| `--local`                     | 强制使用本地嵌入式运行时（跳过 Gateway）                    |
| `--deliver`                   | 将回复发送到聊天渠道                                        |
| `--channel \<name\>`          | 投递渠道（whatsapp、telegram、discord、slack 等）          |
| `--reply-to \<target\>`       | 投递目标覆盖                                                |
| `--reply-channel \<name\>`    | 投递渠道覆盖                                                |
| `--reply-account \<id\>`      | 投递账户 id 覆盖                                             |
| `--thinking \<level\>`        | 为所选模型配置文件设置 thinking 级别                        |
| `--verbose \<on\|full\|off\>` | 设置详细级别                                                |
| `--timeout \<seconds\>`       | 覆盖 agent 超时时间                                          |
| `--json`                      | 输出结构化 JSON                                             |

## 行为

- 默认情况下，CLI 会**通过 Gateway** 运行。添加 `--local` 可强制在当前机器上使用
  嵌入式运行时。
- 精确传入 `--message` 或 `--message-file` 之一。文件消息在移除可选的 UTF-8 BOM 后会保留
  多行内容。
- 如果 Gateway 不可达，CLI 会**回退**到本地嵌入式运行。
- 会话选择：`--to` 会派生 session key（群组/频道目标
  保持隔离；直接聊天会折叠到 `main`）。
- `--session-key` 选择一个显式 key。以 agent 前缀开头的 key 必须使用
  `agent:<agent-id>:<session-key>`，并且在同时提供时 `--agent` 必须与该 agent id 匹配。
  裸的非 sentinel key 在提供 `--agent` 时会限定到 `--agent`；例如，
  `--agent ops --session-key incident-42` 会路由到
  `agent:ops:incident-42`。如果没有 `--agent`，裸的非 sentinel key 会限定到
  已配置的默认 agent。字面量 `global` 和 `unknown` 仅在未提供 `--agent`
  时保持不加范围；在这种情况下，嵌入式回退和存储归属会使用已配置的默认 agent。
- thinking 和 verbose 标志会持久化到 session store。
- 输出：默认是纯文本，或使用 `--json` 输出结构化 payload + metadata。
- 使用 `--json --deliver` 时，JSON 包含已发送、已抑制、部分发送和发送失败的投递状态。
  参见 [JSON delivery status](/cli/agent#json-delivery-status)。

## 示例

```bash
# 使用 JSON 输出的简单回合
openclaw agent --to +15555550123 --message "跟踪日志" --verbose on --json

# 指定 thinking 级别的回合
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
  <Card title="Agent CLI reference" href="/cli/agent" icon="terminal">
    完整的 `openclaw agent` 标志和选项参考。
  </Card>
  <Card title="Sub-agents" href="/tools/subagents" icon="users">
    后台子 agent 启动。
  </Card>
  <Card title="Sessions" href="/concepts/session" icon="comments">
    session key 的工作方式，以及 `--to`、`--agent` 和 `--session-id` 如何解析它们。
  </Card>
  <Card title="Slash commands" href="/tools/slash-commands" icon="slash">
    agent 会话中使用的原生命令目录。
  </Card>
</CardGroup>
