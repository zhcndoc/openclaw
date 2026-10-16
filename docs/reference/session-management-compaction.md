---
summary: "深入解析：会话存储 + 转录、生命周期以及（自动）压缩内部机制"
read_when:
  - "您需要调试会话 ID、转录事件或会话行字段"
  - "你正在更改自动压缩行为或添加“压缩前”清理工作"
  - "你想实现内存刷新或静默系统轮次"
title: "会话管理深度解析"
---

单个 **网关进程** 拥有端到端的会话状态。 UI（macOS 应用程序、Web Control UI、TUI）查询网关以获取会话列表和令牌计数。在远程模式下，每个代理 SQLite 数据库位于远程主机上，因此检查本地 Mac 的状态不会反映网关正在使用的内容。

先看概述文档：[会话管理](/concepts/session)、[压缩](/concepts/compaction)、[内存概览](/concepts/memory)、[内存搜索](/concepts/memory-search)、[会话清理](/concepts/session-pruning)、[转录卫生](/reference/transcript-hygiene)，完整配置参考见 [Agent 配置](/gateway/config-agents)。

此页是一个索引。深入探讨记录在六页纸上，每个读者作业一页。打开与您的任务匹配的页面并停留在那里。

| 页面                                                                                         | 读它的时候                                                                                     |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [ 磁盘上的会话状态](/reference/session-management-compaction/store)                      | 网关主机上的两个持久层和每个代理路径。                          |
| [存储维护和保留](/reference/session-management-compaction/maintenance)      | `session.maintenance` 密钥、磁盘预算清理、cron 保留和 SQLite 降级路径。  |
| [会话密钥、ID 和转录事件](/reference/session-management-compaction/schema)  | `sessionKey` 模式、`sessionId` 生命周期、`SessionEntry` 字段和转录本条目类型。 |
| [压实行为和设置](/reference/session-management-compaction/compaction)      | 压缩的作用、运行时间、设置和提供程序以及出现的位置。           |
| [静音转动和内存刷新](/reference/session-management-compaction/housekeeping)   | `NO_REPLY` 合约和 `agents.defaults.compaction.memoryFlush`。                            |
| [会话记录工作集](/reference/session-management-compaction/resident-history) | 拟议的工人拥有的收购、居民预算和历史读者迁移。              |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/reference/session-management-compaction#when-auto-compaction-happens`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="two-persistence-layers" />[两个持久层](/reference/session-management-compaction/store#two-persistence-layers)
- <a id="on-disk-locations" />[磁盘上位置](/reference/session-management-compaction/store#on-disk-locations)
- <a id="store-maintenance-and-disk-controls" />[存储维护和磁盘控制](/reference/session-management-compaction/maintenance#store-maintenance-and-disk-controls)
- <a id="downgrading-after-the-sqlite-flip" />[ SQLite Flip](/reference/session-management-compaction/maintenance#downgrading-after-the-sqlite-flip) 后降级
- <a id="cron-sessions-and-run-logs" />[Cron 会话和运行日志](/reference/session-management-compaction/maintenance#cron-sessions-and-run-logs)
- <a id="session-keys-(sessionkey)" /><a id="session-keys-sessionkey" />[会话密钥 （`sessionKey`）](/reference/session-management-compaction/schema#session-keys-sessionkey)
- <a id="session-ids-(sessionid)" /><a id="session-ids-sessionid" />[会话 ID （`sessionId`）](/reference/session-management-compaction/schema#session-ids-sessionid)
- <a id="session-store-schema" />[会话存储架构](/reference/session-management-compaction/schema#session-store-schema)
- <a id="transcript-event-structure" />[成绩单事件结构](/reference/session-management-compaction/schema#transcript-event-structure)
- <a id="context-windows-vs-tracked-tokens" />[上下文窗口与跟踪令牌](/reference/session-management-compaction/compaction#context-windows-vs-tracked-tokens)
- <a id="compaction%3A-what-it-is" /><a id="compaction-what-it-is" />[压缩：它是什么](/reference/session-management-compaction/compaction#compaction-what-it-is)
- <a id="chunk-boundaries-and-tool-pairing" />[汇总输入和工具配对](/reference/session-management-compaction/compaction#summary-input-and-tool-pairing)
- <a id="when-auto-compaction-happens" />[自动压缩发生时](/reference/session-management-compaction/compaction#when-auto-compaction-happens)
- <a id="compaction-settings" />[压实设置](/reference/session-management-compaction/compaction#compaction-settings)
- <a id="pluggable-compaction-providers" />[可插拔压实供应器](/reference/session-management-compaction/compaction#pluggable-compaction-providers)
- <a id="user-visible-surfaces" />[用户可见表面](/reference/session-management-compaction/compaction#user-visible-surfaces)
- <a id="silent-housekeeping-(no_reply)" /><a id="silent-housekeeping-no_reply" />[静音看家（`NO_REPLY`）](/reference/session-management-compaction/housekeeping#silent-housekeeping-no_reply)
- <a id="pre-compaction-memory-flush" />[预压缩内存刷新](/reference/session-management-compaction/housekeeping#pre-compaction-memory-flush)

## <a id="troubleshooting-checklist"></a> 故障排查清单

- **会话密钥错误？** 从[/concepts/session](/concepts/session)开始，确认`/status`中的`sessionKey`。
- **存储与转录不匹配？** 使用 `openclaw status` 确认 Gateway 主机和存储路径。
- **压缩刷屏？** 检查模型的上下文窗口（太小会导致频繁压缩）以及工具结果膨胀（调整会话修剪）。
- **在小型本地模型上，似乎每个提示词都会溢出？** 确认提供商报告了正确的模型上下文窗口。只有在该窗口已知时，OpenClaw 才能限制有效保留量。
- **无声转泄漏？** 确认整个完成的最终修剪为大写`NO_REPLY`。小写字母、标点符号、引号、JSON 和尾随标记是可见文本。文字前导 `NO_REPLY\n` 仅删除该控制行并传递剩余文本；请参阅 [ 静音管家 ](/reference/session-management-compaction/housekeeping#silent-housekeeping-no_reply)。

## <a id="related"></a> 相关内容

- [会话管理](/concepts/session)
- [会话修剪](/concepts/session-pruning)
- [上下文引擎](/concepts/context-engine)
- [代理配置参考](/gateway/config-agents)。
