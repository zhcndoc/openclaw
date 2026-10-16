---
summary: "每个 plugins.entries.active-memory 键：类型、含义、范围和默认值，以及额外的调整字段。"
read_when:
  - "您需要活动记忆键的类型或默认值"
title: "配置参考"
---

## <a id="configuration"></a> 配置

所有活跃记忆配置都位于 `plugins.entries.active-memory` 下。

| 键                          | 类型                                                                                                 | 含义                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                    | `boolean`                                                                                            | 启用插件本身                                                                                                                                                                                             |
| `config.mode`                | `"escalate" \| "always" \| "off"`                                                                    | 控制阻塞式深度回忆子代理何时运行；默认值为 `"escalate"`                                                                                                                                           |
| `config.agents`              | `string[]`                                                                                           | 可能使用活动内存的代理 ID                                                                                                                                                                                  |
| `config.model`               | `string`                                                                                             | 可选的阻塞式子代理模型引用；未设置时继承当前会话模型                                                                                                                                 |
| `config.allowedChatTypes`    | `("direct" \| "group" \| "channel" \| "explicit")[]`                                                 | 允许运行活跃记忆的会话类型；默认为 `["direct"]`                                                                                                                                                    |
| `config.allowedChatIds`      | `string[]`                                                                                           | 在 `allowedChatTypes` 之后应用可选的每个会话白名单；非空列表阻止不在列表中的对话                                                                                             |
| `config.deniedChatIds`       | `string[]`                                                                                           | 可选的每个会话拒绝列表，可覆盖允许的会话类型和允许的 ID                                                                                                                               |
| `config.queryMode`           | `"message" \| "recent" \| "full"`                                                                    | 控制阻塞式子代理可以看到多少对话内容                                                                                                                                                            |
| `config.promptStyle`         | `"balanced" \| "strict" \| "contextual" \| "recall-heavy" \| "precision-heavy" \| "preference-only"` | 控制阻塞式子代理在决定是否返回记忆时的积极程度或严格程度                                                                                                                         |
| `config.toolsAllow`          | `string[]`                                                                                           | 具体的深度回忆工具名称。显式配置胜过提供者声明的和内置的默认值。通配符、`group:*` 和核心代理工具将被忽略。请参阅 [ 存储工具](/concepts/active-memory/memory-tools)。 |
| `config.thinking`            | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "adaptive" \| "max"`                | 阻塞式子代理的高级思考覆盖设置；默认为 `off` 以提升速度                                                                                                                                        |
| `config.fastMode`            | `boolean \| "auto"`                                                                                  | 可选的阻塞式子代理快速模式覆盖设置；未设置时继承代理、会话和模型的常规默认值                                                                                                      |
| `config.promptOverride`      | `string`                                                                                             | 高级完整提示词替换；不建议正常使用                                                                                                                                                      |
| `config.promptAppend`        | `string`                                                                                             | 附加到默认提示词或替换后提示词末尾的高级额外指令                                                                                                                                              |
| `config.timeoutMs`           | `number`                                                                                             | 阻塞式子代理的硬超时时间（范围为 250-120000 毫秒；默认值为 15000）                                                                                                                                          |
| `config.setupGraceTimeoutMs` | `number`                                                                                             | 召回超时到期前的高级额外设置预算；范围 0-30000 ms，默认 0。有关 v2026.4.x 升级指南，请参阅 [ 冷启动宽限](/concepts/active-memory/recommended-setup#cold-start-grace)         |
| `config.maxSummaryChars`     | `number`                                                                                             | 活跃记忆摘要中的最大字符数（范围为 40-1000；默认值为 220）                                                                                                                                          |
| `config.logging`             | `boolean`                                                                                            | 调优期间输出活跃记忆日志                                                                                                                                                                                 |
| `config.persistTranscripts`  | `boolean`                                                                                            | 将阻塞式子代理的会话记录导出为 JSONL 文件，然后删除其临时 SQLite 会话行                                                                                                         |
| `config.transcriptDir`       | `string`                                                                                             | 插件拥有的每个代理脚本目录下的相对工件目录（默认 `"active-memory"`）                                                                                                         |
| `config.modelFallback`       | `string`                                                                                             | 可选模型仅用作 [ 模型后备链中的最后一步](/concepts/active-memory/tuning#model-fallback-policy)                                                                                         |

有用的调优字段：

| 键                                | 类型     | 含义                                                                                                                                                         |
| ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.recentUserTurns`           | `number` | 当 `queryMode` 为 `recent` 时，要包含的之前用户轮次（范围 0-4；默认 2）                                                                                 |
| `config.recentAssistantTurns`      | `number` | 当 `queryMode` 为 `recent` 时，要包含的之前助手轮次（范围 0-3；默认 1）                                                                            |
| `config.recentUserChars`           | `number` | 每个最近用户轮次的最大字符数（范围 40-1000；默认 220）                                                                                                     |
| `config.recentAssistantChars`      | `number` | 每个最近助手轮次的最大字符数（范围 40-1000；默认 180）                                                                                                |
| `config.cacheTtlMs`                | `number` | 重复相同查询时的缓存复用时间（范围 1000-120000 ms；默认 15000）                                                                                |
| `config.circuitBreakerMaxTimeouts` | `number` | 在同一 agent/model. 连续多次超时后跳过召回成功召回后或冷却时间到期后重置（范围 1-20；默认 3）。 |
| `config.circuitBreakerCooldownMs`  | `number` | 重复失败后跳过召回暂停多长时间，以毫秒为单位（范围 5000-600000；默认 60000）。                                                             |
