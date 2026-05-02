---
summary: "用于非精确提醒的推断式后续记忆"
title: "推断式承诺"
sidebarTitle: "承诺"
read_when:
  - 你希望 OpenClaw 记住自然的后续跟进
  - 你想了解推断式检查点与提醒有何不同
  - 你想查看或忽略后续承诺
---

承诺是短暂的后续记忆。启用后，OpenClaw 可以注意到一次对话创建了一个未来的检查点机会，并记住稍后把它带回来。

示例：

- 你提到明天有面试。OpenClaw 可能会在之后跟进。
- 你说你精疲力尽。OpenClaw 可能稍后问你是否睡过觉。
- 代理说它会在某些事情改变后继续跟进。OpenClaw 可能会追踪这个未完成的闭环。

承诺不是像 `MEMORY.md` 那样的持久事实，也不是精确提醒。它们介于记忆和自动化之间：OpenClaw 记住一个与对话绑定的义务，然后由 heartbeat 在到期时交付它。

## 启用承诺

承诺默认关闭。可在配置中启用：

```bash
openclaw config set commitments.enabled true
openclaw config set commitments.maxPerDay 3
```

等效的 `openclaw.json`：

```json
{
  "commitments": {
    "enabled": true,
    "maxPerDay": 3
  }
}
```

`commitments.maxPerDay` 限制在滚动一天内，每个代理会话可交付的推断式后续数量。默认值为 `3`。

## 工作原理

在代理回复后，OpenClaw 可能会在单独的上下文中运行一个隐藏的后台提取步骤。该步骤只查找推断式后续承诺。它不会写入可见对话，也不会让主代理去推理这次提取。

当找到高置信度候选项时，OpenClaw 会存储一个承诺，其中包括：

- 代理 id
- 会话密钥
- 原始频道和交付目标
- 到期窗口
- 简短的建议签到内容
- 供 heartbeat 判断是否发送的非指令性元数据

交付通过 heartbeat 进行。当某个承诺到期时，heartbeat 会将该承诺添加到同一代理和频道范围的 heartbeat 轮次中。
模型可以发送一条自然的签到消息，或回复 `HEARTBEAT_OK` 将其忽略。
如果 heartbeat 配置为 `target: "none"`，则到期的承诺会保持在内部，不会发送外部签到。承诺交付提示不会回放原始对话文本，而且到期承诺的 heartbeat 轮次会在没有 OpenClaw 工具的情况下运行。

OpenClaw 绝不会在写入承诺后立刻交付它。到期时间至少会被钳制到创建承诺后的一个 heartbeat 间隔之后，因此该后续不会在被推断出来的同一时刻回声返回。

## 范围

承诺的作用范围限定在创建它们时所处的精确代理和频道上下文中。在 Discord 中与某个代理对话时推断出的后续，不会由另一个代理、另一个频道或无关会话交付。

这个范围是该功能的一部分。自然的检查点应当像同一段对话继续进行，而不是像一个全局提醒系统。

## 承诺与提醒

| 需求                                            | 使用                                      |
| ----------------------------------------------- | ---------------------------------------- |
| "下午 3 点提醒我"                              | [计划任务](/automation/cron-jobs) |
| "20 分钟后提醒我"                               | [计划任务](/automation/cron-jobs) |
| "每个工作日运行这份报告"                        | [计划任务](/automation/cron-jobs) |
| "我明天有面试"                                  | 承诺                                       |
| "我昨晚没睡"                                    | 承诺                                       |
| "如果我不回复这个开放线程，就跟进一下"           | 承诺                                       |

精确的用户请求已经属于调度器路径。承诺只用于推断式后续：也就是用户并没有要求提醒，但对话显然创建了一个有用的未来检查点的那些时刻。

## 管理承诺

使用 CLI 查看和清除已存储的承诺：

```bash
openclaw commitments
openclaw commitments --all
openclaw commitments --agent main
openclaw commitments --status snoozed
openclaw commitments dismiss cm_abc123
```

命令参考请见 [`openclaw commitments`](/cli/commitments)。

## 隐私与成本

承诺提取会使用一次 LLM 过程，因此启用后会在符合条件的轮次之后增加后台模型调用。该过程对用户可见对话是隐藏的，但它可以读取判断是否存在后续所需的最近交互内容。

已存储的承诺是本地 OpenClaw 状态。它们属于操作性记忆，而不是长期记忆。可通过以下命令关闭该功能：

```bash
openclaw config set commitments.enabled false
```

## 故障排查

如果预期中的后续没有出现：

- 确认 `commitments.enabled` 为 `true`。
- 使用 `openclaw commitments --all` 检查待处理、已忽略、已延后或已过期的记录。
- 确保代理的 heartbeat 正在运行。
- 检查该代理会话的 `commitments.maxPerDay` 是否已经达到上限。
- 请记住，精确提醒会被承诺提取跳过，并且应当出现在 [计划任务](/automation/cron-jobs) 下。

## 相关内容

- [记忆概览](/concepts/memory)
- [活动记忆](/concepts/active-memory)
- [Heartbeat](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
- [`openclaw commitments`](/cli/commitments)
- [配置参考](/gateway/configuration-reference#commitments)
