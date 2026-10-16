---
summary: "开始时的启动配置，以及从 v2026.4.x. 升级时设置的冷启动宽限预算"
read_when:
  - "您想要一个起始配置来调整"
  - "网关重启超时后您的第一次召回"
title: "推荐设置"
---

## <a id="recommended-setup"></a> 推荐设置

从 `recent` 开始：

```json5
{
  plugins: {
    entries: {
      "active-memory": {
        enabled: true,
        config: {
          agents: ["main"],
          mode: "escalate",
          queryMode: "recent",
          promptStyle: "balanced",
          timeoutMs: 15000,
          maxSummaryChars: 220,
          logging: true,
        },
      },
    },
  },
}
```

使用 `/verbose on` 来显示状态行，使用 `/trace on` 来显示调试摘要， 并在调优时使用——这两者都会在主回复之后作为后续消息发送，而不是在之前发送。只有当每个符合条件的轮次都值得这份延迟时才使用 `always`。保留 `escalate` 作为推荐的平衡方案，然后在深度召回查询本身中选择 `message`、`recent` 或 `full`。

### <a id="cold-start-grace"></a> 冷启动宽限

在 v2026.5.2 之前，插件在冷启动期间默默地将 `timeoutMs` 额外延长了 30000 毫秒，因此模型预热、嵌入索引加载和第一次召回可以共享更大的预算。 v2026.5.2 将这种优雅移到了明确的 `setupGraceTimeoutMs` 配置后面：除非您选择加入，否则 `timeoutMs` 现在默认是召回工作预算。阻塞挂钩将该预算分为两个固定阶段：召回开始前 session/config 预检最多 1500 毫秒，然后是召回工作后单独的固定 1500 毫秒用于中止结算和成绩单恢复停止。这两种津贴都不会扩展模型或工具的执行。

如果您从 v2026.4.x 升级并针对旧的隐式恩典世界调整了 `timeoutMs`（推荐的入门 `timeoutMs: 15000` 就是一个示例），请设置 `setupGraceTimeoutMs: 30000` 以恢复 v2026.5.2 之前的有效预算：

```json5
{
  plugins: {
    entries: {
      "active-memory": {
        config: {
          timeoutMs: 15000,
          setupGraceTimeoutMs: 30000,
        },
      },
    },
  },
}
```

最坏情况下的阻塞时间是 `timeoutMs + setupGraceTimeoutMs + 3000` ms（即配置的召回工作预算，加上最多 1500 ms 的预检，再加上固定的 1500 ms 召回后完成额度）。内嵌的召回运行器使用相同的有效超时预算，因此 `setupGraceTimeoutMs` 同时覆盖外层的提示构建看门狗和内层的阻塞式召回运行。

对于资源紧张、且可以接受冷启动延迟权衡的网关，较低的值（5000-15000 ms）也可以使用——代价是网关重启后第一次召回在预热完成前返回空结果的概率更高。
