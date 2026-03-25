---
title: "Tool-loop detection"
summary: "How to enable and tune guardrails that detect repetitive tool-call loops"
read_when:
  - 用户报告代理卡在重复工具调用中
  - 您需要调整重复调用保护
  - 您正在编辑代理工具/运行时策略
---

# 工具循环检测

OpenClaw 可以防止代理陷入重复的工具调用模式。
该保护机制**默认关闭**。

仅在必要时启用，因为严格的设置可能会阻止合法的重复调用。

## 该功能存在的原因

- 检测没有进展的重复序列。
- 检测高频率无结果循环（相同工具、相同输入、重复错误）。
- 检测已知轮询工具的特定重复调用模式。

## 配置块

全局默认配置：

```json5
{
  tools: {
    loopDetection: {
      enabled: false,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

按代理覆盖（可选）：

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

- `enabled`：主开关。`false` 表示不执行循环检测。
- `historySize`：用于分析的最近工具调用数量。
- `warningThreshold`：达到该阈值前，模式仅被分类为警告。
- `criticalThreshold`：达到该阈值时阻止重复循环模式。
- `globalCircuitBreakerThreshold`：全局无进展断路阈值。
- `detectors.genericRepeat`：检测重复的相同工具和相同参数模式。
- `detectors.knownPollNoProgress`：检测已知轮询类的无状态变化模式。
- `detectors.pingPong`：检测交替的乒乓模式。

## 推荐设置

- 从 `enabled: true` 开始，保持默认值不变。
- 保持阈值顺序为 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`。
- 若出现误报：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`
  - （可选）提高 `globalCircuitBreakerThreshold`
  - 仅禁用引起问题的检测器
  - 减小 `historySize` 以降低历史上下文严格度

## 日志和预期行为

当检测到循环时，OpenClaw 会报告循环事件，并根据严重程度阻止或抑制下一次工具调用。
这可保护用户免于代币过度消耗和锁死，同时保留正常的工具访问。

- 首选警告和临时抑制。
- 仅在重复证据累积时升级处理。

## 备注

- `tools.loopDetection` 与代理级覆盖配置合并。
- 代理配置会完全覆盖或扩展全局值。
- 无配置时，护栏保持关闭。
