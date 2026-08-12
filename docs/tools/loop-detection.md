---
summary: "如何启用可检测重复工具调用循环的护栏"
title: "工具循环检测"
read_when:
  - 用户报告代理陷入重复的工具调用
  - 你需要控制重复调用保护
  - 你正在编辑代理工具/运行时策略
  - 在上下文溢出重试后遇到 `compaction_loop_persisted` 中止
---

OpenClaw 有两种协同工作的护栏，用于防止重复的工具调用模式，
两者都在 `tools.loopDetection` 下配置：

1. **循环检测**（`enabled`）- 默认禁用。监视滚动的
   工具调用历史，查找重复模式和未知工具重试。
2. **压缩后护栏** - 只要
   `enabled` 没有被显式设为 `false` 就会启用。每次压缩重试后都会武装，并在
   代理在窗口内重复相同的（`tool`、`args`、`result`）三元组时中止运行。

将 `tools.loopDetection.enabled: false` 设为静音两种护栏。

## 这样设计的原因

- 检测没有进展的重复序列。
- 检测高频无结果循环（同一工具、相同输入、重复错误）。
- 检测已知轮询工具的特定重复调用模式。
- 打破上下文溢出 -> 压缩 -> 相同循环的循环，而不是让它们无限运行。

## 配置块

全局设置：

```json5
{
  tools: {
    loopDetection: {
      enabled: false, // rolling-history 检测器的总开关
    },
  },
}
```

按代理覆盖（可选，位于 `agents.entries.*.tools.loopDetection`）：

```json5
{
  agents: {
    entries: {
      "safe-runner": {
        default: true,
        tools: {
          loopDetection: {
            enabled: true,
          },
        },
      },
    },
  },
}
```

按代理设置会覆盖全局设置。

你也可以在控制界面的**设置 -> 实验室**中启用全局 rolling-history 检测器。

### 字段行为

| 字段 | 默认值 | 作用 |
| --------- | ------- | ------------------------------------------------------------------------------------------------- |
| `enabled` | `false` | rolling-history 检测器的总开关。`false` 还会禁用压缩后保护。 |

对于 `exec`，无进展哈希会比较稳定的命令结果（状态、
退出码、超时标志、输出），并忽略诸如持续时间、PID、会话 ID 和工作目录
等易变的运行时元数据。外发消息发送结果会在哈希时去除每次调用特有的易变
ID（消息 ID、文件 ID、时间戳），因此“已发送”结果不会看起来与另一个
“已发送”结果相同。当可用运行 ID 时，历史仅在该运行内评估，
因此计划中的心跳周期和新运行不会从更早的运行中继承过时的循环计数。

## 推荐设置

- 对于较小的模型，设置 `enabled: true`。旗舰模型通常不需要滚动历史检测，并且可以将主开关保持为 `false`，同时仍然受益于压缩后保护机制。
- 若要禁用所有功能，包括压缩后保护机制，请显式设置
  `tools.loopDetection.enabled: false`。

## 压缩后护栏

在因上下文溢出而进行一次压缩重试之后，运行器会在接下来的几次工具调用上启用一个短窗口护栏。如果代理在该窗口内多次发出相同的
`(toolName, argsHash, resultHash)` 三元组，护栏就会判定压缩并未打破该
循环，并以 `compaction_loop_persisted` 错误终止运行。

该护栏受主开关 `tools.loopDetection.enabled` 控制，但有一个例外：当该标志未设置或为 `true` 时，它仍然保持**启用**，只有在该标志被显式设为 `false` 时才会关闭。这样设计是有意为之——护栏的存在就是为了跳出压缩循环，否则这些循环会无上限地消耗 token，因此即使是不配置的用户也能获得保护。

```json5
{
  tools: {
    loopDetection: {
      // 主开关；设为 false 可连同滚动检测器一起禁用护栏
      enabled: true,
    },
  },
}
```

- 当结果仍在变化时，护栏绝不会中止；只有窗口内结果字节级完全相同才会触发它。
- 它只会在一次压缩重试后的紧接阶段启用，而不会在运行中的其他时刻启用。

<Note>
  只要主标志没有被显式设为 `false`，即使你从未写过 `tools.loopDetection` 块，压缩后护栏也会运行。要验证这一点，请在一次压缩事件后立即检查网关日志中是否出现 `post-compaction guard armed for N attempts`。
</Note>

## 日志和预期行为

当检测到循环时，OpenClaw 会记录一个循环事件，并根据严重程度对下一次工具调用周期发出警告或进行阻止，从而在保持正常工具访问的同时，防止令牌消耗失控和系统卡死。

- 警告会首先出现。
- 当某种模式持续超过警告阈值后，系统会进行阻止。
- 在嵌入式代理循环中，第一次严重循环会在该工具批次中的任何工具运行之前阻止整个工具批次。随后，模型还会使用其正常工具再获得一次响应机会。
- 在这次响应期间，模型可以直接回答、提出问题，或使用不同的工具或不同的参数继续操作。
- 同一运行中再次出现严重循环时，系统会阻止其整个工具批次并结束本次运行。新的用户运行会以全新的恢复额度开始。
- 压缩后的防护机制会发出 `compaction_loop_persisted` 错误，其中会标明触发问题的工具和相同调用的次数。

## 相关内容

<CardGroup cols={2}>
  <Card title="执行审批" href="/tools/exec-approvals" icon="shield">
    Shell 执行的允许/拒绝策略。
  </Card>
  <Card title="思考级别" href="/tools/thinking" icon="brain">
    推理努力级别及其与提供方策略的交互。
  </Card>
  <Card title="子智能体" href="/tools/subagents" icon="users">
    启动隔离智能体以约束失控行为。
  </Card>
  <Card title="配置参考" href="/gateway/config-tools#toolsloopdetection" icon="gear">
    完整的 `tools.loopDetection` 模式及合并语义。
  </Card>
</CardGroup>
