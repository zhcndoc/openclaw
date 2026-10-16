---
summary: "OpenClaw 和 Hermes Agent 在审查的 2026 年 8 月快照中的逐源比较以及属性表"
title: "OpenClaw 与Hermes代理"
read_when:
  - "您需要 OpenClaw 和 Hermes Agent 的并排属性表"
  - "您需要比较声明背后的来源引用"
  - "您正在检查哪些发现是回顾观察而不是测试"
---

Hermes Agent（Nous Research，MIT）是一个个人代理平台，具有 CLI、消息网关、桌面应用程序和插件系统。下面的比较反映了 [`6defe7eb6c`](https://github.com/NousResearch/hermes-agent/tree/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70) 的来源（2026 年 8 月 27 日审核），而不是实时对抗测试或对每个部署的保证。

**来源调查结果。** Hermes 的 [`security policy`](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/SECURITY.md) 将适配器内的授权调用者视为同等可信的；他们配置的工具可以包括 shell 访问。其 [ 命令防护 ](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/tools/approval.py#L4564) 在主机到达后端进行智能审查之前包括强硬和配置的拒绝规则。 Cron 和单查询上下文默认拒绝需要批准的命令，而其他非交互式上下文仍然可以自动批准。其[Codex适配器](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/agent/transports/codex_app_server_session.py)重用正在运行的代理内的线程并支持转向，但在进程重新启动后启动新的本机线程；用户轮流输入仅为文本。 [ 策划的 MCP 桥接器 ](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/agent/transports/hermes_tools_mcp_server.py) 将 Hermes 工具公开给 Codex，不包括需要运行 Hermes 代理循环上下文的工具。

**H历史报告。** [用户发布的 Hermes v0.8.0](https://github.com/NousResearch/hermes-agent/issues/7826) 静态分析审计结果将四项发现列为严重，九项列为严重；这些是记者的分类，未经验证的当前头部漏洞计数。引用的 [ 更新程序故障 ](https://github.com/NousResearch/hermes-agent/issues/32384) 和 [ 网关内存泄漏 ](https://github.com/NousResearch/hermes-agent/issues/25315) 已关闭，维护者评论记录修复。第三方CNA记录，包括[CVE-2026-14625](https://nvd.nist.gov/vuln/detail/CVE-2026-14625)，报告供应商不响应；该声明是 CNA 的说法，并非本次审查的独立调查结果。

Hermes 的 [ 内置内存存储 ](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/tools/memory_tool.py) 删除没有源会话逻辑删除的条目。稍后的写入可以再次添加相同的事实；这是从商店合约中推断出的限制，而不是复制模型驱动的复活。默认情况下启用自主内存写入，并具有可选的批准门。 Hermes 还在其 SQLite 存储中提供原子凭证写入、导入冻结编辑、子环境清理和会话归因。

这两个项目都支持许多 [ 模型提供者](/providers) 和 [ 通道](/channels)。计数不能直接比较：目录混合了供应商、身份验证路由、传输和插件分发类型。 OpenClaw的目录包括Nextcloud Talk、通用Nostr、Twitch、Urbit和三个Zalo连接路径； Hermes 的 Nostr 集成是 Buzz 特定的，并且支持自托管中继。检查当前目录，了解您需要的确切集成和维护模型。

**集成选择。** Hermes包括SimpleX、ntfy和对话式电子邮件适配器（IMAP轮询、线程SMTP回复），以及Home Assistant状态更改订阅。 OpenClaw 以自动化方式处理电子邮件：捆绑的 [IMAP 触发器 ](/automation/imap) 使用所选读者代理的工具策略将经过身份验证的入站邮件路由到隔离会话中。记录的设置配置了受限读取器；隔离本身并不能限制其工具。 [Gmail推送](/automation/cron-jobs#gmail-pubsub-integration)提供了单独的Gmail自动化路径，具有发送技能。 Hermes 的 [email 适配器](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/plugins/platforms/email/adapter.py#L1028) 默认情况下检查发件人授权和身份验证，然后使用配置的核心工具集将消息路由到每个发件人的对话中。这两个项目都支持第三方集成；评估适配器、其默认值以及维护者，而不是从功能计数中推断完整性。

Hermes 还具有 [opt-in 会话修剪 ](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/hermes_cli/config_defaults.py#L3256) 和 [OTLP 网关监控导出 ](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/agent/monitoring/otlp_exporter.py)，与其 Langfuse 跟踪分开。它的 [updater](https://github.com/NousResearch/hermes-agent/blob/6defe7eb6c462bb784d1f27f5afe7ca4b627fc70/hermes_cli/update_cmd.py#L8000) 快进选定的 Git 分支，并可以在关键文件语法检查失败时回滚。在比较 OpenClaw 的发布渠道和审核架构时，不应忽略这些控制。

| 属性             | OpenClaw                                                                                                                                        | Hermes代理（`6defe7eb6c`）                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 信任边界       | 网关拥有的权限；配置的沙箱、节点或云工作执行；沙箱默认关闭                                         | 母公司拥有的工具调度；终端、文件和生成的-Python工作可以使用远程后端                                                                                          |
| 政策门          | 由代码强制执行的结构工具策略和拒绝；可选的审核和批准层                                                         | 对主机到达后端 hardline/configured 拒绝背后的标记命令进行智能审查； cron 和一次性默认拒绝标记的命令，其他无头路径可能会自动批准 |
| 供应商harness     | Codex 应用程序服务器、Copilot SDK、Claude Code CLI 作为本机运行时                                                                               | 选择加入 Codex 循环，带转向和策划的 MCP 工具桥；纯文字轮流输入，重启后无原生恢复； Copilot API 和 ACP 适配器                                      |
| 代码执行       | JavaScript 代码模式，具有 Node 或 QuickJS、键入的工具文档以及在主机工具调用上检查的策略                                      | Python 位于本地子后端或配置的终端后端，通过父后端具有绑定工具 RPC                                                                                      |
| 角色和多用户 | 配置人员级别角色上限和默认角色；范围和会话属性                                                          | 适配器授权组内的平等信任；斜杠命令控制和单独的配置文件，包括配置文件复用                                                           |
| 密钥              | SecretRefs，可隔离所有者降级，受保护的存储值和出口哨兵；入口验证失败停止启动                       | Environment/vault 凭证、范围配置文件解析、可选的 Docker 令牌注入代理；没有一般的转录本存储编辑边界                                        |
| 电子邮件                | 隔离 IMAP 阅读器会话，具有操作员配置的工具限制；通过技能发送                                                       | 发送方默认为authorization/authentication； IMAP/SMTP 使用配置的核心工具和每个发送者对话进行聊天                                                                 |
| 升级             | 四个通道、不可变的包版本、模式保护、发布验证工作流程                                                           | Git分支快进，默认为main；语法检查回滚； Docker `:latest` 跟随主                                                                                         |
| 内存来源    | 跟踪会话起源、信任门控、有界准入策略、可归因清除和遗忘会话记录                               | 内置字符串条目，没有源会话沿袭或删除逻辑删除；自主写入默认值，可选批准                                                         |
| 审计                | 具有 30 天查询截止日期和行上限的元数据分类帐；尽力收集和单独的 OTel 诊断                                     | 会话归属；选择加入会话修剪； Langfuse 跟踪和单独的 OTLP 网关监控                                                                                      |
| 工人的可观察性 | 终端、网关开发服务器门户、代理工作人员桌面                                                                                   | 终端、桌面预览、SSH-转发开发服务器、可选 Camofox 浏览器 VNC                                                                                                    |
| 插件              | 进程内且未沙盒化；清单验证、SDK 合约、安装信任检查                                                            | 进程内且未沙盒化； Python 注册 API，桌面 SDK，基于声明的同意                                                                                           |
| 安全记录      | 公共存储库建议和记录的信任模型；计数不是安全分数                                                          | 第三方 CVE 和历史用户报告；在审核日期没有公共存储库建议                                                                                       |
| 治理           | OpenClaw Foundation、MIT、公共成熟度记分卡                                                                                             | Nous Research，风险投资支持，MIT                                                                                                                                                     |
| 资金和收入  | 独立 501（c）（3） 由捐款资助；无付费等级、托管服务或令牌；唯一默认的 Foundation 绑定请求是版本检查 | 风险投资（Paradigm 主导的 A 轮融资）； README 和设置中提供的付费 Nous Portal 等级（每个 TechCrunch 每月 20 至 200 美元）                                               |

在单独审查的 2026 年 8 月 28 日快照中，Hermes 默认使用 [ 持久内核进行本地 Python 执行 ](https://github.com/NousResearch/hermes-agent/blob/306db2776c6b6f1acc85c31c4dabba3263f0e9fd/tools/code_execution_tool.py#L2070) 和 [ 尝试持久内核进行远程执行 ](https://github.com/NousResearch/hermes-agent/blob/306db2776c6b6f1acc85c31c4dabba3263f0e9fd/tools/code_execution_tool.py#L1273)，当远程内核不可用时回退到每次调用执行。先前的 `code_execution.kernel_mode` 设置将被忽略。远程复用还取决于任务身份； `reset: true` 丢弃内核状态，Hermes 重启后状态不会恢复。
