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
    openclaw agent --message "今天天气怎么样？"
    ```

    这会通过 Gateway 发送消息并打印回复。

  </Step>

  <Step title="指定特定的 agent 或会话">
    ```bash
    # 指定特定的 agent
    openclaw agent --agent ops --message "总结日志"

    # 指定一个电话号码（派生 session key）
    openclaw agent --to +15555550123 --message "状态更新"

    # 复用现有会话
    openclaw agent --session-id abc123 --message "继续任务"
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
| `--message \<text\>`          | 要发送的消息（必填）                                         |
| `--to \<dest\>`               | 从目标（电话、聊天 id）派生 session key                   |
| `--agent \<id\>`              | 目标为已配置的 agent（使用其 `main` 会话）                  |
| `--session-id \<id\>`         | 按 id 复用现有会话                                          |
| `--local`                     | 强制使用本地嵌入式运行时（跳过 Gateway）                   |
| `--deliver`                   | 将回复发送到聊天渠道                                        |
| `--channel \<name\>`          | 投递渠道（whatsapp、telegram、discord、slack 等）         |
| `--reply-to \<target\>`       | 覆盖投递目标                                                |
| `--reply-channel \<name\>`    | 覆盖投递渠道                                                |
| `--reply-account \<id\>`      | 覆盖投递账号 id                                             |
| `--thinking \<level\>`        | 为所选模型配置文件设置 thinking 级别                        |
| `--verbose \<on\|full\|off\>` | 设置详细输出级别                                            |
| `--timeout \<seconds\>`       | 覆盖 agent 超时时间                                         |
| `--json`                      | 输出结构化 JSON                                              |

## 行为

- 默认情况下，CLI 会**通过 Gateway** 运行。添加 `--local` 可强制在当前机器上使用
  嵌入式运行时。
- 如果 Gateway 不可达，CLI 会**回退**到本地嵌入式运行。
- 会话选择：`--to` 会派生 session key（群组/频道目标保持隔离；直接聊天会折叠为 `main`）。
- thinking 和 verbose 标志会持久保存到会话存储中。
- 输出：默认输出纯文本，或使用 `--json` 输出结构化负载 + 元数据。

## 示例

```bash
# 使用 JSON 输出的简单回合
openclaw agent --to +15555550123 --message "跟踪日志" --verbose on --json

# 指定 thinking 级别的回合
openclaw agent --session-id 1234 --message "总结收件箱" --thinking medium

# 投递到与会话不同的渠道
openclaw agent --agent ops --message "警报" --deliver --reply-channel telegram --reply-to "@admin"
```

## 相关内容

- [Agent CLI reference](/cli/agent)
- [Sub-agents](/tools/subagents) — 后台 sub-agent 启动
- [Sessions](/concepts/session) — session key 的工作方式
