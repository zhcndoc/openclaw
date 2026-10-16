---
summary: "仅当基于规则的记忆回忆不足时，深度对话历史回忆才会升级"
title: "主动记忆"
read_when:
  - "你想了解主动记忆的用途"
  - "你想为对话代理开启主动记忆"
  - "你想在不全局启用的情况下调整主动记忆行为"
---

Active Memory 是符合条件的对话会话的深度回忆通道。默认的 `escalate` 模式仅在消息询问过去并且基于规则的内存通道未发现强可信触发匹配时才运行其阻止召回子代理。这可以保持普通回复的快速性，同时为先前的决策、对话以及临时或多跳问题保留更深入的搜索路径。

扁平检索在直接事实匹配方面最强，但在时间性和多会话问题上较弱。[LongMemEval (arXiv:2410.10813)](https://arxiv.org/abs/2410.10813) 衡量了这种差距，而 PrefEval 基准则突出了偏好相关提醒的价值。 默认情况下的升级会把阻塞式模型调用用在这些更难的回忆形态实际上出现的地方。

此页是一个索引。活动记忆记录在九页中，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                           | 读它的时候                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [启用活动内存](/concepts/active-memory/enabling)                     | 您正在通过每个代理产品设置或高级插件配置打开活动内存。 |
| [主动存储器的工作原理](/concepts/active-memory/how-it-works)                | 您想要升级流程，或者您正在检查对话是否符合条件。                  |
| [会话控制](/concepts/active-memory/session-controls)                   | 您想暂停一次对话，或者看看它注入了什么。                                    |
| [查询模式、提示和模型](/concepts/active-memory/tuning)             | 您正在用召回质量与延迟进行权衡，或者选择召回模型。                             |
| [存储工具](/concepts/active-memory/memory-tools)                           | 您正在选择调用工具，或将活动内存连接到内置内存、LanceDB 或无损爪。  |
| [高级覆盖和转录](/concepts/active-memory/advanced-options) | 您需要提示或思考覆盖，或阻止磁盘上的子代理记录。                     |
| [配置参考](/concepts/active-memory/configuration)               | 您需要活动记忆键的类型、范围或默认值。                                         |
| [推荐设置](/concepts/active-memory/recommended-setup)                 | 您需要启动配置，或 v2026.4.x 升级后的冷启动宽限预算。           |
| [活动内存故障排除](/concepts/active-memory/troubleshooting)       | 活动内存未按预期运行，或者调用速度缓慢、为空或被策略禁用。           |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/concepts/active-memory#lossless-claw`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="remember-across-conversations" />[跨对话记住](/concepts/active-memory/enabling#remember-across-conversations)
- <a id="advanced-active-memory-quick-start" />[高级活动内存快速入门](/concepts/active-memory/enabling#advanced-active-memory-quick-start)
- <a id="how-it-works" />[工作原理](/concepts/active-memory/how-it-works#how-it-works)
- <a id="when-it-runs" />[运行时](/concepts/active-memory/how-it-works#when-it-runs)
  - <a id="session-types" />[会话类型](/concepts/active-memory/how-it-works#session-types)
- <a id="session-toggle" />[会话切换](/concepts/active-memory/session-controls#session-toggle)
- <a id="how-to-see-it" />[怎么看](/concepts/active-memory/session-controls#how-to-see-it)
- <a id="query-modes" />[查询模式](/concepts/active-memory/tuning#query-modes)
  - <a id="message" />[查询方式：留言](/concepts/active-memory/tuning#message)
  - <a id="recent" />[查询方式：recent](/concepts/active-memory/tuning#recent)
  - <a id="full" />[查询方式：full](/concepts/active-memory/tuning#full)
- <a id="prompt-styles" />[提示样式](/concepts/active-memory/tuning#prompt-styles)
- <a id="model-fallback-policy" />[模型后备策略](/concepts/active-memory/tuning#model-fallback-policy)
  - <a id="speed-recommendations" />[速度建议](/concepts/active-memory/tuning#speed-recommendations)
    - <a id="cerebras-setup" />[Cerebras 设置](/concepts/active-memory/tuning#cerebras-setup)
- <a id="memory-tools" />[内存工具](/concepts/active-memory/memory-tools#memory-tools)
  - <a id="built-in-memory" />[内置存储器](/concepts/active-memory/memory-tools#built-in-memory)
  - <a id="lancedb-memory" />[LanceDB内存](/concepts/active-memory/memory-tools#lancedb-memory)
  - <a id="lossless-claw" />[无损Claw](/concepts/active-memory/memory-tools#lossless-claw)
- <a id="advanced-escape-hatches" />[高级逃生舱口](/concepts/active-memory/advanced-options#advanced-escape-hatches)
- <a id="transcript-persistence" />[转录持久性](/concepts/active-memory/advanced-options#transcript-persistence)
- <a id="configuration" />[配置](/concepts/active-memory/configuration#configuration)
- <a id="recommended-setup" />[推荐设置](/concepts/active-memory/recommended-setup#recommended-setup)
  - <a id="cold-start-grace" />[冷启动恩典](/concepts/active-memory/recommended-setup#cold-start-grace)
- <a id="debugging" />[调试](/concepts/active-memory/troubleshooting#debugging)
- <a id="common-issues" />[常见问题](/concepts/active-memory/troubleshooting#common-issues)
  - <a id="registered-recall-tools-return-openclawverbatim531end" />[注册召回工具退货`status=policy-disabled`](/concepts/active-memory/troubleshooting#registered-recall-tools-return-status-policy-disabled)
  - <a id="embedding-provider-switched-or-stopped-working" />[嵌入提供商已切换或停止工作](/concepts/active-memory/troubleshooting#embedding-provider-switched-or-stopped-working)
  - <a id="recall-feels-slow-empty-or-inconsistent" />[回忆感觉缓慢、空虚或不一致](/concepts/active-memory/troubleshooting#recall-feels-slow-empty-or-inconsistent)
  - <a id="first-recall-after-gateway-restart-returns-openclawverbatim551end" />[ 网关重启后首次召回返回 `status=timeout`](/concepts/active-memory/troubleshooting#first-recall-after-gateway-restart-returns-status-timeout)

## <a id="related-pages"></a> 相关页面

- [内存架构](/concepts/memory-architecture)
- [内存 Search](/concepts/memory-search)
- [内存配置参考](/reference/memory-config)
- [插件 SDK 设置](/plugins/sdk-setup)
