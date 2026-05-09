---
summary: "如何启用和调优用于检测重复工具调用循环的护栏"
title: "工具循环检测"
read_when:
  - 用户报告智能体卡在重复调用工具的状态
  - 你需要调优重复调用保护
  - 你正在编辑智能体工具/运行时策略
  - 你在上下文溢出重试后遇到 `compaction_loop_persisted` 中止
---

OpenClaw 有两个协同工作的护栏，用于处理重复的工具调用模式：

1. **循环检测** (`tools.loopDetection.enabled`) — 默认禁用。监视滚动工具调用历史中的重复模式和未知工具重试。
2. **压缩后护栏** (`tools.loopDetection.postCompactionGuard`) — 默认启用，除非 `tools.loopDetection.enabled` 明确为 `false`。在每次压缩重试后启动，并在智能体在窗口内发出相同的 `(tool, args, result)` 三元组时中止运行。

这两个功能都配置在同一个 `tools.loopDetection` 块下，但只要主开关没有被显式关闭，压缩后护栏就会运行。将 `tools.loopDetection.enabled: false` 可同时关闭这两个表面。

## 这样设计的原因

- 检测没有进展的重复序列。
- 检测高频无结果循环（相同工具、相同输入、重复错误）。
- 检测已知轮询工具的特定重复调用模式。
- 防止上下文溢出、压缩、再进入相同循环的过程无限运行。

## 配置块

全局默认值，显示所有已文档化字段：

```json5
{
  tools: {
    loopDetection: {
      enabled: false, // 滚动历史检测器的主开关
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      unknownToolThreshold: 10,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
      postCompactionGuard: {
        windowSize: 3, // 在压缩重试后启动；除非 enabled 明确为 false，否则会运行
      },
    },
  },
}
```

按智能体覆盖（可选）：

```json5
{
  agents: {
    list: [
      {
        id: "safe-runner",
        tools: {
          loopDetection: {
            enabled: true,
            warningThreshold: 8,
            criticalThreshold: 16,
          },
        },
      },
    ],
  },
}
```

### 字段行为

| Field                            | Default | Effect                                                                                                                          |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                        | `false` | 滚动历史检测器的主开关。设置为 `false` 也会禁用压缩后护栏。                                                                     |
| `historySize`                    | `30`    | 保留用于分析的最近工具调用数量。                                                                                                |
| `warningThreshold`               | `10`    | 模式被归类为仅警告之前的阈值。                                                                                                  |
| `criticalThreshold`              | `20`    | 阻止重复循环模式的阈值。                                                                                                        |
| `unknownToolThreshold`           | `10`    | 在达到此次数的未命中后，阻止对同一不可用工具的重复调用。                                                                        |
| `globalCircuitBreakerThreshold`  | `30`    | 跨所有检测器的全局无进展断路器阈值。                                                                                            |
| `detectors.genericRepeat`        | `true`  | 检测相同工具 + 相同参数的重复模式。                                                                                             |
| `detectors.knownPollNoProgress`  | `true`  | 检测无状态变化的已知轮询类模式。                                                                                                |
| `detectors.pingPong`             | `true`  | 检测交替的乒乓模式。                                                                                                            |
| `postCompactionGuard.windowSize` | `3`     | 压缩后护栏保持启动状态的工具调用数量，以及会中止运行的相同三元组计数。                                                          |

对于 `exec`，无进展检查会比较稳定的命令结果，并忽略运行时的可变元数据，例如持续时间、PID、会话 ID 和工作目录。当可用运行 ID 时，最近的工具调用历史只会在该运行内进行评估，因此计划性的心跳周期和新的运行不会继承较早运行中的过时循环计数。

## 推荐设置

- 对于较小模型，设置 `enabled: true` 并保持阈值为默认值。旗舰模型很少需要滚动历史检测，可以将主开关保持为 `false`，同时仍然受益于压缩后护栏。
- 保持阈值顺序为 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`。
- 如果出现误报：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`。
  - 可选地提高 `globalCircuitBreakerThreshold`。
  - 仅禁用导致问题的特定检测器（`detectors.<name>: false`）。
  - 减小 `historySize` 以降低历史上下文的严格程度。
- 要禁用全部功能（包括压缩后护栏），请显式设置 `tools.loopDetection.enabled: false`。

## 压缩后护栏

当运行器在上下文溢出后完成一次压缩重试时，会启动一个短窗口护栏来监视接下来的几个工具调用。如果智能体在窗口内多次发出相同的 `(toolName, argsHash, resultHash)` 三元组，护栏就会认定压缩没有打破循环，并以 `compaction_loop_persisted` 错误中止运行。

该护栏受主 `tools.loopDetection.enabled` 标志控制，但有一个例外：当该标志未设置或为 `true` 时，它保持**启用**；只有当该标志被显式设为 `false` 时才会停用。这是有意设计的。该护栏用于逃离原本可能无界消耗 token 的压缩循环，因此即使未配置的用户也能获得保护。

```json5
{
  tools: {
    loopDetection: {
      // 主开关；设为 false 可连同滚动检测器一起禁用护栏
      enabled: true,
      postCompactionGuard: {
        windowSize: 3, // 默认值
      },
    },
  },
}
```

- 更小的 `windowSize` 更严格（在中止前允许更少的尝试）。
- 更大的 `windowSize` 会给智能体更多恢复尝试。
- 结果发生变化时护栏绝不会中止，只有在窗口内结果字节级完全相同时才会中止。
- 它的范围刻意很窄：只会在压缩重试后的紧接阶段触发。

<Note>
  只要主标志没有被显式设为 `false`，即使你从未编写过 `tools.loopDetection` 块，压缩后护栏也会运行。要验证这一点，请在压缩事件之后立即查看网关日志中的 `post-compaction guard armed for N attempts`。
</Note>

## 日志和预期行为

当检测到循环时，OpenClaw 会报告一个循环事件，并根据严重程度抑制或阻止下一次工具循环。这样可以在保持正常工具访问的同时，防止 token 消耗失控和系统卡死。

- 先出现警告。
- 当模式持续超过警告阈值后，会进行抑制。
- 严重阈值会阻止下一次工具循环，并在运行记录中显示清晰的循环检测原因。
- 压缩后护栏会发出 `compaction_loop_persisted` 错误，并附带出问题的工具名称和相同调用计数。

## 相关内容

<CardGroup cols={2}>
  <Card title="Exec approvals" href="/tools/exec-approvals" icon="shield">
    Shell 执行的允许/拒绝策略。
  </Card>
  <Card title="Thinking levels" href="/tools/thinking" icon="brain">
    推理努力级别及其与提供方策略的交互。
  </Card>
  <Card title="Sub-agents" href="/tools/subagents" icon="users">
    启动隔离智能体以约束失控行为。
  </Card>
  <Card title="Configuration reference" href="/gateway/configuration-reference" icon="gear">
    完整的 `tools.loopDetection` 模式及合并语义。
  </Card>
</CardGroup>
