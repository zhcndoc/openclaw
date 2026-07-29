---
summary: "OpenClaw 文档页面的生成标题映射"
read_when: "在阅读页面之前查找某个主题由哪篇文档页面涵盖时"
title: "文档映射"
---

# OpenClaw 文档映射

此文件由 `docs/**/*.md` 和 `docs/**/*.mdx` 中的标题生成，用于帮助代理浏览文档树。
请勿手动编辑；请运行 `pnpm docs:map:gen`。

## agent-runtime-architecture.md

- Route: /agent-runtime-architecture
- Headings:
  - H2: Runtime Layout
  - H2: Boundaries
  - H2: Manifests
  - H2: Runtime Selection
  - H2: Model Runtime Generations
  - H2: Related

## announcements/bluebubbles-imessage.md

- 路由：/announcements/bluebubbles-imessage
- 标题：
  - H1：BlueBubbles 移除及 imsg iMessage 路径
  - H2：发生了什么变化
  - H2：该怎么做
  - H2：迁移说明
  - H2：另请参阅

## auth-credential-semantics.md

- 路由: /auth-credential-semantics
- 标题:
  - H2: 稳定的探测原因代码
  - H2: 令牌凭据
  - H3: 资格规则
  - H3: 解析规则
  - H2: Agent 副本可移植性
  - H2: 仅配置认证路由
  - H2: 显式认证顺序过滤
  - H2: 探测目标解析
  - H2: 外部 CLI 凭据发现
  - H2: OAuth SecretRef 策略守卫
  - H2: 向后兼容的消息传递
  - H2: 相关内容

## automation/auth-monitoring.md

- 路由：/automation/auth-monitoring
- 标题：
  - H2：相关内容

## automation/clawflow.md

- 路由：/automation/clawflow
- 标题：
  - H2：相关内容

## automation/cron-jobs.md

- Route: /automation/cron-jobs
- Headings:
  - H2: Quick start
  - H2: How cron works
  - H2: Schedule types
  - H3: Heartbeat task migration
  - H3: Stream sources
  - H3: Dynamic cadence (pacing)
  - H3: /loop chat shortcut
  - H3: Day-of-month and day-of-week use OR logic
  - H2: Event triggers (condition watchers)
  - H2: Payloads
  - H3: Agent-turn options
  - H3: Command payloads
  - H3: Script payloads
  - H2: Execution styles
  - H2: Delivery and output
  - H3: Failure notifications
  - H3: Output language
  - H2: CLI examples
  - H2: Managing jobs
  - H2: Webhooks
  - H3: Authentication
  - H2: Gmail PubSub integration
  - H3: Wizard setup (recommended)
  - H3: Gateway auto-start
  - H3: Manual one-time setup
  - H3: Gmail model override
  - H2: Configuration
  - H2: Troubleshooting
  - H3: Command ladder
  - H2: Related

## automation/cron-vs-heartbeat.md

- 路由：/automation/cron-vs-heartbeat
- 标题：
  - H2：相关

## automation/gmail-pubsub.md

- 路由：/automation/gmail-pubsub
- 标题：
  - H2：相关内容

## automation/hooks.md

- 路由: /automation/hooks
- 标题:
  - H2: 选择合适的接入层
  - H2: 快速开始
  - H2: 事件类型
  - H2: 编写 hooks
  - H3: Hook 结构
  - H3: HOOK.md 格式
  - H3: 处理程序实现
  - H3: 事件上下文要点
  - H2: Hook 发现
  - H3: Hook 包
  - H2: 内置 hooks
  - H3: session-memory 详情
  - H3: bootstrap-extra-files 配置
  - H3: command-logger 详情
  - H3: compaction-notifier 详情
  - H3: boot-md 详情
  - H2: 插件 hooks
  - H2: 配置
  - H2: CLI 参考
  - H2: 最佳实践
  - H2: 故障排查
  - H3: 未发现 hook
  - H3: hook 不符合条件
  - H3: hook 未执行
  - H2: 相关内容

## automation/index.md

- Route: /automation
- Headings:
  - H2: Quick decision guide
  - H3: Scheduled Tasks (Cron) vs Heartbeat
  - H2: Core concepts
  - H3: Scheduled tasks (cron)
  - H3: Tasks
  - H3: Task Flow
  - H3: Standing orders
  - H3: Hooks
  - H3: Heartbeat
  - H2: How they work together
  - H2: Related

## automation/poll.md

- 路由：/automation/poll
- 标题：
  - H2：相关

## automation/standing-orders.md

- 路由：/automation/standing-orders
- 标题：
  - H2：为什么需要常设任务
  - H2：它们如何工作
  - H2：常设任务的构成
  - H2：常设任务与 cron 作业
  - H2：示例
  - H3：示例 1：内容与社交媒体（每周周期）
  - H3：示例 2：财务运营（事件触发）
  - H3：示例 3：监控与告警（持续运行）
  - H2：执行-验证-报告模式
  - H2：多程序架构
  - H2：最佳实践
  - H3：建议
  - H3：避免
  - H2：相关内容

## automation/taskflow.md

- Route: /automation/taskflow
- Title:
  - H2: When to use task flows
  - H2: Synchronous mode
  - H3: Managed mode
  - H3: Mirrored mode
  - H2: Flow state
  - H2: Persistent state and revision tracking
  - H2: Cancellation behavior
  - H2: CLI commands
  - H2: Reliable scheduled workflow patterns
  - H2: Relationship between flows and tasks
  - H2: Related content

## automation/tasks.md

- 路由: /automation/tasks
- 标题:
  - H2: TL;DR
  - H2: 快速开始
  - H2: 什么会创建任务
  - H2: 任务生命周期
  - H2: 交付与通知
  - H3: 通知策略
  - H2: CLI 参考
  - H2: 聊天任务看板 (/tasks)
  - H3: 控制 UI
  - H2: 状态集成（任务压力）
  - H2: 存储与维护
  - H3: 任务存放位置
  - H3: 自动维护
  - H2: 任务如何与其他系统关联
  - H2: 相关内容

## automation/troubleshooting.md

- 路由：/automation/troubleshooting
- 标题：
  - H2：相关内容

## automation/webhook.md

- 路由：/automation/webhook
- 标题：
  - H2：相关

## brave-search.md

- 路由: /brave-search
- 标题:
  - H2: 相关内容

## channels/access-groups.md

- 路由: /channels/access-groups
- 标题:
  - H2: 静态消息发送者分组
  - H2: 从允许列表引用分组
  - H2: 支持的消息频道路径
  - H2: Discord 频道受众
  - H2: 插件诊断
  - H2: 安全说明
  - H2: 故障排除

## channels/ambient-room-events.md

- Route: /channels/ambient-room-events
- Headings:
  - H2: Recommended setup
  - H2: Prerequisites
  - H2: What changes
  - H2: Discord example
  - H2: Slack example
  - H2: Telegram example
  - H2: Agent specific policy
  - H2: Visible reply modes
  - H2: History
  - H2: Troubleshooting
  - H2: Related

## channels/bot-loop-protection.md

- 路由: /channels/bot-loop-protection
- 标题:
  - H2: 默认值
  - H2: 配置共享默认值
  - H2: 按频道、账号或房间覆盖
  - H2: 频道支持

## channels/broadcast-groups.md

- 路由：/channels/broadcast-groups
- 标题：
  - H2: 概述
  - H2: 配置
  - H3: 基本设置
  - H3: 处理策略
  - H3: 完整示例
  - H2: 工作原理
  - H3: 消息流
  - H3: 会话隔离
  - H3: 示例：隔离会话
  - H2: 使用场景
  - H2: 最佳实践
  - H2: 兼容性
  - H3: 提供方
  - H3: 路由
  - H2: 故障排查
  - H2: 示例
  - H2: API 参考
  - H3: 配置架构
  - H3: 字段
  - H2: 限制
  - H2: 相关内容

## channels/buzz.md

- Route: /channels/buzz
- Headings:
  - H2: What it does
  - H2: Buzz identity and room model
  - H2: Before you start
  - H2: Install
  - H2: Guided setup
  - H3: Bot approval
  - H2: Agent tools and messaging
  - H3: Route rooms to different agents
  - H2: Access control
  - H2: Manual configuration
  - H3: Bot key storage
  - H2: Verify the connection
  - H2: Rotate the bot identity
  - H2: Current limits and roadmap
  - H2: Troubleshooting
  - H2: Related

## channels/channel-routing.md

- 路由：/channels/channel-routing
- 标题：
  - H1: 渠道与路由
  - H2: 关键术语
  - H2: 出站目标前缀
  - H2: 会话键形状（示例）
  - H2: 主 DM 路由固定
  - H2: 受保护的入站记录
  - H2: 路由规则（如何选择代理）
  - H2: 广播组（运行多个代理）
  - H2: 配置概览
  - H2: 会话存储
  - H2: WebChat 行为
  - H2: 回复上下文
  - H2: 相关

## channels/clickclack.md

- Route: /channels/clickclack
- Headings:
  - H2: Quick setup
  - H3: Alternative: manual token
  - H3: Alternative: env-based token
  - H3: JSON5 reference
  - H3: Account config keys
  - H3: Keep an auth-gated public hostname
  - H2: Multiple bots
  - H2: Session discussions
  - H2: Reply modes
  - H2: Command menu
  - H2: Durable media delivery
  - H2: Agent activity rows
  - H2: Targets
  - H2: Permissions
  - H2: Troubleshooting

## channels/discord-activities.md

- Route: /channels/discord-activities
- Headings:
  - H2: Prerequisites
  - H2: Setup
  - H2: Security model
  - H2: Troubleshooting
  - H3: The Activity says “Gateway offline”
  - H3: Discord opens a blank page or reports blocked:csp
  - H3: “Widget unavailable”
  - H3: “You cannot launch Activities in this channel”

## channels/discord.md

- Route: /channels/discord
- Headings:
  - H2: Quick setup
  - H2: Recommended: Set up a guild workspace
  - H2: Runtime model
  - H2: Forum channels
  - H2: Interactive components
  - H2: Access control and routing
  - H3: Guild channel maps are allowlists
  - H3: Role-based agent routing
  - H2: Native commands and command auth
  - H2: Feature details
  - H2: Tools and action gates
  - H2: Components v2 UI
  - H2: Voice
  - H3: Voice channels
  - H3: Follow users in voice
  - H3: Voice messages
  - H2: Troubleshooting
  - H2: Configuration reference
  - H3: Discord Activities
  - H2: Safety and operations
  - H2: Related

## channels/feishu.md

- Route: /channels/feishu
- Headings:
  - H2: Quick start
  - H2: Inbound durability
  - H2: Access control
  - H3: Direct messages
  - H3: Group chats
  - H2: Group configuration examples
  - H3: Allow all groups, no @mention required
  - H3: Allow all groups, still require @mention
  - H3: Allow specific groups only
  - H3: Restrict senders within a group
  - H3: Bot-authored messages
  - H2: Get group/user IDs
  - H3: Group IDs (`chat_id`, format: `oc_xxx`)
  - H3: User IDs (`open_id`, format: `ou_xxx`)
  - H2: Common commands
  - H2: Troubleshooting
  - H3: Bot does not respond in group chats
  - H3: Bot does not receive messages
  - H3: QR setup does not react in the Feishu mobile app
  - H3: App Secret leaked
  - H2: Advanced configuration
  - H3: Multiple accounts
  - H3: Message limits
  - H3: Streaming
  - H3: Quota optimization
  - H3: Group session scope and topic threads
  - H3: Feishu workspace tools
  - H3: ACP sessions
  - H4: Persistent ACP binding
  - H4: Spawn ACP from chat
  - H3: Multi-agent routing
  - H2: Per-user agent isolation (Dynamic Agent Creation)
  - H3: Quick setup
  - H3: How it works
  - H3: Configuration options
  - H3: Session scope
  - H3: Typical multi-user deployment
  - H3: Verification
  - H3: Notes
  - H2: Configuration reference
  - H2: Supported message types
  - H3: Receive
  - H3: Send
  - H3: Threads and replies
  - H2: Related

## channels/googlechat.md

- Route: /channels/googlechat
- Headings:
  - H2: Install
  - H2: Quick setup (beginner)
  - H2: Add to Google Chat
  - H2: Public URL (Webhook-only)
  - H3: Option A: Tailscale Funnel (Recommended)
  - H3: Option B: Reverse Proxy (Caddy)
  - H3: Option C: Cloudflare Tunnel
  - H2: How it works
  - H3: Inbound durability
  - H2: Targets
  - H2: Config highlights
  - H2: Troubleshooting
  - H3: 405 Method Not Allowed
  - H3: Other issues
  - H2: Related

## channels/group-messages.md

- 路由：/channels/group-messages
- 标题：
  - H2：行为
  - H2：配置示例（WhatsApp）
  - H3：启用命令（仅限所有者）
  - H2：如何使用
  - H2：测试 / 验证
  - H2：已知注意事项
  - H2：相关

## channels/groups.md

- 路由：/channels/groups
- 标题：
  - H2: 入门简介（2分钟）
  - H2: 可见回复
  - H2: 上下文可见性和允许列表
  - H2: 会话密钥
  - H2: 模式：个人私信 + 公开群组（单一代理）
  - H2: 显示标签
  - H2: 群组策略
  - H2: 提及门控（默认）
  - H2: 作用域配置的提及模式
  - H2: 群组/频道工具限制（可选）
  - H2: 群组允许列表
  - H2: 激活（仅限所有者）
  - H2: 上下文字段
  - H2: iMessage 细节
  - H2: WhatsApp 系统提示
  - H2: WhatsApp 细节
  - H2: 相关内容

## channels/imessage-from-bluebubbles.md

- 路由：/channels/imessage-from-bluebubbles
- 标题：
  - H2: 迁移检查清单
  - H2: iMessage 的作用
  - H2: 开始之前
  - H2: 配置转换
  - H2: 群组注册陷阱
  - H2: 分步操作
  - H2: 操作对照一览
  - H2: 配对、会话和 ACP 绑定
  - H2: 无法回滚的通道
  - H2: 相关内容

## channels/imessage.md

- Route: /channels/imessage
- Headings:
  - H2: Quick setup
  - H2: Requirements and permissions (macOS)
  - H2: Enabling the imsg private API
  - H3: Setup
  - H3: When SIP stays enabled
  - H2: Access control and routing
  - H2: ACP conversation bindings
  - H2: Deployment patterns
  - H2: Media, chunking, and delivery targets
  - H2: Private API actions
  - H2: Config writes
  - H2: Coalescing split-send DMs (command + URL in one composition)
  - H2: Inbound recovery after a bridge or gateway restart
  - H3: Operator-visible signal
  - H3: Migration
  - H2: Troubleshooting
  - H2: Configuration reference pointers
  - H2: Related

## channels/index.md

- 路由：/channels
- 标题：
  - H2：支持的渠道
  - H2：投递说明
  - H2：说明

## channels/irc.md

- Route: /channels/irc
- Headings:
  - H2: Quick start
  - H2: Inbound durability
  - H2: Connection settings
  - H2: Security defaults
  - H2: Access control
  - H3: Common gotcha: allowFrom is for DMs, not channels
  - H2: Reply triggering (mentions)
  - H2: Security note (recommended for public channels)
  - H3: Same tools for everyone in the channel
  - H3: Different tools per sender (owner gets more power)
  - H2: NickServ
  - H2: 环境变量
  - H2: 故障排除
  - H2: 相关内容

## channels/line.md

- 路由：/channels/line
- 标题：
  - H2: 安装
  - H2: 设置
  - H2: 配置
  - H2: 访问控制
  - H2: 消息行为
  - H2: 渠道数据（富消息）
  - H2: ACP 支持
  - H2: 出站媒体
  - H2: 故障排查
  - H2: 相关内容

## channels/location.md

- 路由：/channels/location
- 标题：
  - H2: 文本格式化
  - H2: 上下文字段
  - H2: 出站负载
  - H2: 渠道说明
  - H2: 相关内容

## channels/matrix-migration.md

- 路由：/channels/matrix-migration
- 标题：
  - H2: 迁移会自动执行的内容
  - H2: 从早于 2026.4 的 OpenClaw 版本升级
  - H2: 推荐的升级流程
  - H2: 常见消息及其含义
  - H3: 手动恢复消息
  - H2: 如果加密历史记录仍然没有恢复
  - H2: 如果你想为未来消息重新开始
  - H2: 相关内容

## channels/matrix-presentation.md

- 路由：/channels/matrix-presentation
- 标题：
  - H2: 事件内容
  - H2: 回退行为
  - H2: 支持的块
  - H2: 交互
  - H2: 与审批元数据的关系
  - H2: 媒体消息

## channels/matrix-push-rules.md

- 路由：/channels/matrix-push-rules
- 标题：
  - H2: 先决条件
  - H2: 步骤
  - H2: 多机器人说明
  - H2: Homeserver 说明
  - H2: 相关内容

## channels/matrix.md

- 路由：/channels/matrix
- 标题：
  - H2: 安装
  - H2: 设置
  - H3: 交互式设置
  - H3: 最小配置
  - H3: 自动加入
  - H3: 允许列表目标格式
  - H3: 账户 ID 规范化
  - H3: 缓存凭据
  - H3: 环境变量
  - H2: 配置示例
  - H2: 流式预览
  - H2: 语音消息
  - H2: 审批元数据
  - H3: 用于静默完成预览的自托管推送规则
  - H2: 机器人间房间
  - H2: 加密与验证
  - H3: 启用加密
  - H3: 状态与信任信号
  - H3: 使用恢复密钥验证此设备
  - H3: 引导或修复交叉签名
  - H3: 房间密钥备份
  - H3: 列出、请求和响应验证
  - H3: 多账户说明
  - H2: 个人资料管理
  - H2: 线程
  - H3: 会话路由（sessionScope）
  - H3: 回复线程（threadReplies）
  - H3: 线程继承与斜杠命令
  - H2: ACP 对话绑定
  - H3: 线程绑定配置
  - H2: 反应
  - H2: 历史上下文
  - H2: 上下文可见性
  - H2: DM 与房间策略
  - H2: 直接房间修复
  - H2: 执行审批
  - H2: 斜杠命令
  - H2: 多账户
  - H2: 私有/LAN homeserver
  - H2: 代理 Matrix 流量
  - H2: 目标解析
  - H2: 配置参考
  - H3: 账户与连接
  - H3: 加密
  - H3: 访问与策略
  - H3: 回复行为
  - H3: 反应设置
  - H3: 工具与按房间覆盖
  - H3: 执行审批设置
  - H2: 相关内容

## channels/mattermost.md

- 路由：/channels/mattermost
- 标题：
  - H2: 安装
  - H2: 快速设置
  - H2: 原生斜杠命令
  - H2: 环境变量（默认账户）
  - H2: 聊天模式
  - H2: 线程与会话
  - H2: 访问控制（私信）
  - H2: 频道（群组）
  - H2: 出站投递目标
  - H2: 私信频道重试
  - H2: 预览流式输出
  - H2: 反应（消息工具）
  - H2: 交互式按钮（消息工具）
  - H3: 直接 API 集成（外部脚本）
  - H2: 目录适配器
  - H2: 多账户
  - H2: 故障排除
  - H2: 相关内容

## channels/msteams.md

- 路由：/channels/msteams
- 标题：
  - H2: 捆绑插件
  - H2: 快速设置
  - H2: 目标
  - H2: 配置写入
  - H2: 访问控制（私信 + 群组）
  - H3: 工作原理
  - H3: 第 1 步：创建 Azure Bot
  - H3: 第 2 步：获取凭据
  - H3: 第 3 步：配置消息端点
  - H3: 第 4 步：启用 Teams 通道
  - H3: 第 5 步：构建 Teams 应用清单
  - H3: 第 6 步：配置 OpenClaw
  - H3: 第 7 步：运行网关
  - H2: 联邦身份验证（证书 + 托管标识）
  - H3: 选项 A：基于证书的身份验证
  - H3: 选项 B：Azure 托管标识
  - H3: AKS 工作负载标识设置
  - H3: 身份验证类型对比
  - H2: 本地开发（隧道）
  - H2: 测试机器人
  - H2: 环境变量
  - H2: 成员信息操作
  - H2: 历史上下文
  - H2: 当前 Teams RSC 权限（清单）
  - H2: Teams 清单示例（已脱敏）
  - H3: 清单注意事项（必需字段）
  - H3: 更新现有应用
  - H2: 功能：仅 RSC vs Graph
  - H3: 仅使用 Teams RSC（应用已安装，无 Graph API 权限）
  - H3: 使用 Teams RSC + Microsoft Graph 应用权限
  - H3: RSC vs Graph API
  - H2: 支持 Graph 的媒体 + 历史记录
  - H3: 通道/群组文件恢复（graphMediaFallback）
  - H2: 已知限制
  - H3: Webhook 超时
  - H3: Teams 云与服务 URL 支持
  - H3: 格式
  - H2: 配置
  - H2: 路由与会话
  - H2: 回复样式：线程 vs 帖子
  - H3: 解析优先级
  - H3: 线程上下文保留
  - H2: 附件和图片
  - H2: 在群聊中发送文件
  - H3: 为什么群聊需要 SharePoint
  - H3: 设置
  - H3: 分享行为
  - H3: 回退行为
  - H3: 文件存储位置
  - H2: 投票（Adaptive Cards）
  - H2: 演示卡片
  - H2: 目标格式
  - H2: 主动消息
  - H2: 团队和频道 ID（常见陷阱）
  - H2: 私密频道
  - H2: 故障排除
  - H3: 常见问题
  - H3: 清单上传错误
  - H3: RSC 权限不生效
  - H2: 参考资料
  - H2: 相关内容

## channels/nextcloud-talk.md

- 路由：/channels/nextcloud-talk
- 标题：
  - H2：安装
  - H2：快速设置（初学者）
  - H2：说明
  - H2：访问控制（私信）
  - H2：房间（群组）
  - H2：能力
  - H2：配置参考（Nextcloud Talk）
  - H2：相关内容

## channels/nostr.md

- 路由: /channels/nostr
- 标题:
  - H2: 安装
  - H3: 非交互式设置
  - H2: 快速设置
  - H2: 配置参考
  - H2: 个人资料元数据
  - H2: 访问控制
  - H3: 私信策略
  - H3: 白名单示例
  - H2: 密钥格式
  - H2: 中继
  - H2: 协议支持
  - H2: 测试
  - H3: 本地中继
  - H3: 手动测试
  - H2: 故障排除
  - H3: 未收到消息
  - H3: 未发送响应
  - H3: 重复响应
  - H2: 安全性
  - H2: 限制（MVP）
  - H2: 相关内容

## channels/pairing.md

- Route: /channels/pairing
- Headings:
  - H2: 1) DM pairing (inbound chat access)
  - H3: Approve from the Control UI
  - H3: Approve from the CLI
  - H3: Reusable sender groups
  - H3: Where the state lives
  - H2: 2) Node device pairing (iOS/Android/macOS/headless nodes)
  - H3: Pair from the Control UI (recommended)
  - H3: Pair via Telegram
  - H3: Approve a node device
  - H3: Optional trusted-CIDR node auto-approve
  - H3: Node pairing state storage
  - H3: Notes
  - H2: Related docs

## channels/qa-channel.md

- 路由：/channels/qa-channel
- 标题：
  - H2: 它的作用
  - H2: 配置
  - H2: 运行器
  - H2: 相关内容

## channels/qqbot.md

- Route: /channels/qqbot
- Headings:
  - H2: Install
  - H2: Setup
  - H2: Inbound durability
  - H2: Configure
  - H3: Streaming
  - H3: Access policy
  - H3: Multi-account setup
  - H3: Group chats
  - H3: Voice (STT / TTS)
  - H2: Target formats
  - H2: Slash commands
  - H2: Media and storage
  - H2: Troubleshooting
  - H2: Related

## channels/raft.md

- 路由: /channels/raft
- 标题:
  - H2: 安装
  - H2: 先决条件
  - H2: 配置
  - H2: 工作原理
  - H2: 验证
  - H2: 故障排除
  - H2: 参考资料

## channels/reef.md

- Route: /channels/reef
- Headings:
  - H2: Quick start
  - H2: Agent-driven setup
  - H2: Configuration
  - H2: Adding a friend
  - H2: Sending and receiving
  - H2: Guards and owner review
  - H2: Troubleshooting

## channels/signal.md

- Route: /channels/signal
- Headings:
  - H2: The number model (read this first)
  - H2: Install
  - H2: Quick setup
  - H2: What it is
  - H2: Setup path A: link existing Signal account (QR)
  - H2: Setup path B: register dedicated bot number (SMS, Linux)
  - H2: External native daemon mode
  - H2: Container mode (bbernhard/signal-cli-rest-api)
  - H2: Access control (DMs + groups)
  - H2: How it works (behavior)
  - H2: Media + limits
  - H2: Typing + read receipts
  - H2: Lifecycle status reactions
  - H2: Reactions (message tool)
  - H2: Approval reactions
  - H2: Question reactions
  - H2: Delivery targets (CLI/cron)
  - H2: Aliases
  - H2: Troubleshooting
  - H2: Security notes
  - H2: Configuration reference (Signal)
  - H2: Related

## channels/slack.md

- Route: /channels/slack
- Headings:
  - H2: Choosing a transport
  - H3: Relay mode
  - H3: Enterprise Grid org-wide installs
  - H4: Socket Mode
  - H4: HTTP Request URLs
  - H2: Install
  - H2: Quick setup
  - H2: User identity (post as a real person)
  - H2: Socket Mode transport tuning
  - H2: Manifest and scope checklist
  - H3: Additional manifest settings
  - H2: Token model
  - H2: Actions and gates
  - H2: Access control and routing
  - H3: Group DMs (MPDMs) and bots
  - H2: Threading, sessions, and reply tags
  - H2: Ack reactions
  - H3: Emoji (ackReaction)
  - H3: Scope (messages.ackReactionScope)
  - H2: Text streaming
  - H2: Typing reaction fallback
  - H2: Voice input
  - H2: Media, chunking, and delivery
  - H2: Commands and slash behavior
  - H2: Native charts
  - H2: Native tables
  - H2: Plugin-owned modal submissions
  - H2: Native approvals in Slack
  - H2: Events and operational behavior
  - H3: Presence events
  - H2: Configuration reference
  - H2: Troubleshooting
  - H2: Attachment media reference
  - H3: Supported media types
  - H3: Inbound pipeline
  - H3: Thread-root attachment inheritance
  - H3: Multi-attachment handling
  - H3: Size, download, and model limits
  - H3: Known limits
  - H3: Related documentation
  - H2: Related

## channels/sms.md

- 路由: /channels/sms
- 标题:
  - H2: 开始之前
  - H2: 快速设置
  - H2: 配置示例
  - H3: 配置文件
  - H3: 环境变量
  - H3: SecretRef 认证令牌
  - H3: Messaging Service 发送方
  - H3: 默认外发目标
  - H2: 访问控制
  - H2: 发送 SMS
  - H2: 验证设置
  - H3: 从 macOS iMessage/SMS 进行端到端测试
  - H2: Webhook 安全
  - H2: 多账户配置
  - H2: 故障排除
  - H3: Twilio 返回 403 或 OpenClaw 拒绝 webhook
  - H3: 未出现配对请求
  - H3: 外发发送失败
  - H3: 消息已到达，但代理没有回复

## channels/synology-chat.md

- Route: /channels/synology-chat
- Headings:
  - H2: Install
  - H2: Quick setup
  - H2: Inbound durability
  - H2: Environment variables
  - H2: DM policy and access control
  - H2: Outbound delivery
  - H2: Multi-account
  - H2: Security notes
  - H2: Troubleshooting
  - H2: Related

## channels/telegram.md

- 路由：/channels/telegram
- 标题：
  - H2：快速设置
  - H2：Telegram 端设置
  - H2：仪表板 Mini App
  - H2：访问控制与激活
  - H3：群组机器人身份
  - H2：运行时行为
  - H2：功能参考
  - H2：错误回复控制
  - H2：故障排除
  - H2：配置参考
  - H2：相关内容

## channels/tlon.md

- Route: /channels/tlon
- Headings:
  - H2: Bundled plugin
  - H2: Setup
  - H2: Inbound durability
  - H2: Private/LAN ships
  - H2: Group channels
  - H2: Access control
  - H2: Owner and approval system
  - H2: Auto-accept settings
  - H2: Hot-reload via Urbit settings store
  - H2: Delivery targets (CLI/cron)
  - H2: Bundled skill
  - H2: Capabilities
  - H2: Troubleshooting
  - H2: Configuration reference
  - H2: Notes
  - H2: Related

## channels/troubleshooting.md

- 路由：/channels/troubleshooting
- 标题：
  - H2: 命令梯子
  - H2: 更新后
  - H2: WhatsApp
  - H3: WhatsApp 故障特征
  - H2: Telegram
  - H3: Telegram 故障特征
  - H2: Discord
  - H3: Discord 故障特征
  - H2: Slack
  - H3: Slack 故障特征
  - H2: iMessage
  - H3: iMessage 故障特征
  - H2: Signal
  - H3: Signal 故障特征
  - H2: QQ Bot
  - H3: QQ Bot 故障特征
  - H2: Matrix
  - H3: Matrix failure signatures
  - H2: Gateway up but channel never connects
  - H2: Related

## channels/twitch.md

- Route: /channels/twitch
- Headings:
  - H2: Install
  - H2: Quick setup
  - H2: What it is
  - H2: Inbound durability
  - H2: Token refresh (optional)
  - H2: Multi-account support
  - H2: Access control
  - H2: Troubleshooting
  - H2: Config
  - H3: Account config
  - H3: Provider options
  - H2: Tool actions
  - H2: Safety and ops
  - H2: Limits
  - H2: Related

## channels/wechat.md

- 路由：/channels/wechat
- 标题：
  - H2：命名
  - H2：工作原理
  - H2：安装
  - H2：登录
  - H2：访问控制
  - H2：兼容性
  - H2：Sidecar 进程
  - H2：故障排查
  - H2：相关文档

## channels/whatsapp.md

- Route: /channels/whatsapp
- Headings:
  - H2: Install
  - H2: Quick setup
  - H2: Deployment patterns
  - H2: Runtime model
  - H2: Call the current requester with MeowCaller (experimental)
  - H2: Approval prompts
  - H2: Question reactions
  - H2: Plugin hooks and privacy
  - H2: Access control and activation
  - H2: Configured ACP bindings
  - H2: Personal-number and self-chat behavior
  - H2: Message normalization and context
  - H2: Delivery, chunking, and media
  - H2: Reply quoting
  - H2: Reaction level
  - H2: Acknowledgment reactions
  - H2: Lifecycle status reactions
  - H2: Multi-account and credentials
  - H2: Tools, actions, and config writes
  - H2: Troubleshooting
  - H2: System prompts
  - H2: Configuration reference pointers
  - H2: Related

## channels/yuanbao.md

- 路由：/channels/yuanbao
- 标题：
  - H2：快速开始
  - H3：交互式设置（替代方式）
  - H2：访问控制
  - H3：直接消息
  - H3：群聊
  - H2：配置示例
  - H2：常用命令
  - H2：故障排查
  - H2：高级配置
  - H3：多个账户
  - H3：消息限制
  - H3：流式传输
  - H3：群聊历史上下文
  - H3：回复模式
  - H3：Markdown 提示注入
  - H3：调试模式
  - H3：多智能体路由
  - H2：配置参考
  - H2：支持的消息类型
  - H2：相关内容

## channels/zalo.md

- 路由：/channels/zalo
- 标题：
  - H2: 捆绑插件
  - H2: 快速设置
  - H2: 它是什么
  - H2: 它的工作原理
  - H2: 限制
  - H2: 访问控制
  - H3: 私信
  - H3: 群组
  - H2: 长轮询与 webhook
  - H2: 支持的消息类型
  - H2: 功能
  - H2: 发送目标（CLI/cron）
  - H2: 故障排查
  - H2: 配置参考
  - H2: 相关内容

## channels/zaloclawbot.md

- 路由: /channels/zaloclawbot
- 标题:
  - H2: 兼容性
  - H2: 前提条件
  - H2: 使用 onboard 安装（推荐）
  - H2: 手动安装
  - H3: 1. 安装插件
  - H3: 2. 在配置中启用插件
  - H3: 3. 生成二维码并登录
  - H3: 4. 重启网关
  - H2: 工作原理
  - H2: 底层实现
  - H2: 故障排除
  - H2: 相关内容

## channels/zalouser.md

- Route: /channels/zalouser
- Headings:
  - H2: Install
  - H2: Quick setup
  - H2: What it is
  - H2: Naming
  - H2: Finding IDs (directory)
  - H2: Limits
  - H2: Inbound durability
  - H2: Access control (DMs)
  - H2: Group access (optional)
  - H3: Group mention gating
  - H2: Multi-account
  - H2: Environment variables
  - H2: Typing, reactions, and delivery acknowledgements
  - H2: Troubleshooting
  - H2: Related

## ci.md

- Route: /ci
- Headings:
  - H2: Pipeline overview
  - H2: Fail-fast order
  - H2: PR context and evidence
  - H2: Scope and routing
  - H2: ClawSweeper activity forwarding
  - H2: Manual dispatches
  - H2: Runners
  - H2: Runner registration budget
  - H2: Surface ratchets
  - H2: Local equivalents
  - H2: OpenClaw Performance
  - H2: Full Release Validation
  - H2: Live and E2E shards
  - H2: Package Acceptance
  - H3: Jobs
  - H3: Candidate sources
  - H3: Suite profiles
  - H3: Legacy compatibility windows
  - H3: Examples
  - H2: Install smoke
  - H2: Local Docker E2E
  - H3: Tunables
  - H3: Reusable live/E2E workflow
  - H3: Release-path chunks
  - H2: Plugin Prerelease
  - H2: QA Lab
  - H2: CodeQL
  - H3: Security categories
  - H3: Platform-specific security shards
  - H3: Critical Quality categories
  - H2: Maintenance workflows
  - H3: Docs Agent
  - H3: Test Performance Agent
  - H3: Duplicate PRs After Merge
  - H2: Local check gates and changed routing
  - H3: Config baseline count ratchet
  - H2: Testbox validation
  - H2: Related

## clawhub/cli.md

- 路由: /clawhub/cli
- 标题:
  - H1: ClawHub CLI
  - H2: 发现并安装
  - H3: 发布信任
  - H2: 发布和维护
  - H2: 相关内容

## clawhub/publishing.md

- 路由：/clawhub/publishing
- 标题：
  - H1：在 ClawHub 上发布
  - H2：所有者
  - H2：技能
  - H2：插件
  - H2：发布流程
  - H2：常见问题
  - H3：包范围必须与所选所有者匹配

## cli/acp.md

- 路由: /cli/acp
- 标题:
  - 二级标题: 这不是什么
  - 二级标题: 兼容性矩阵
  - 二级标题: 已知限制
  - 二级标题: 用法
  - 二级标题: ACP 客户端（调试）
  - 二级标题: 协议冒烟测试
  - 二级标题: 如何使用此功能
  - 二级标题: 选择代理
  - 二级标题: 从 acpx 使用（Codex、Claude、其他 ACP 客户端）
  - 二级标题: Zed 编辑器设置
  - 二级标题: 会话映射
  - 二级标题: 选项
  - 三级标题: acp 客户端选项
  - 二级标题: 相关内容

## cli/agent.md

- Route: /cli/agent
- Headings:
  - H1: openclaw agent
  - H2: agent exec
  - H3: agent exec options
  - H2: Options
  - H2: Examples
  - H2: Notes
  - H2: JSON delivery status
  - H2: Related

## cli/agents.md

- 路由: /cli/agents
- 标题:
  - H1: openclaw 代理
  - H2: 示例
  - H2: 命令面
  - H3: agents list
  - H3: `agents add [name]`
  - H3: agents bindings
  - H3: agents bind
  - H3: agents unbind
  - H3: agents set-identity
  - H3: agents delete &lt;id&gt;
  - H2: 路由绑定
  - H3: --bind 格式
  - H3: 绑定作用域行为
  - H2: 身份文件
  - H2: 设置身份
  - H2: 相关

## cli/approvals.md

- Route: /cli/approvals
- Headings:
  - H1: openclaw approvals
  - H2: openclaw exec-policy
  - H2: Common commands
  - H2: Pending approvals
  - H2: Replace approvals from a file
  - H2: "Never prompt" / YOLO example
  - H2: Allowlist helpers
  - H2: Common options
  - H2: Notes
  - H2: Related

## cli/attach.md

- 路由：/cli/attach
- 标题：无

## cli/audit.md

- 路由: /cli/audit
- 标题:
  - H1: openclaw 审计
  - H2: 过滤器
  - H2: 记录的事件
  - H2: 网关 RPC
  - H2: 相关

## cli/backup.md

- 路由: /cli/backup
- 标题:
  - H1: openclaw 备份
  - H2: 备注
  - H2: SQLite 快照
  - H3: 验证和恢复
  - H2: 会备份什么
  - H2: 无效配置行为
  - H2: 大小和性能
  - H2: 相关内容

## cli/browser.md

- Route: /cli/browser
- Headings:
  - H1: openclaw browser
  - H2: Common flags
  - H2: Quick start (local)
  - H2: Quick troubleshooting
  - H2: Lifecycle
  - H2: If the command is missing
  - H2: Profiles
  - H2: Tabs
  - H2: Extract / snapshot / screenshot / actions
  - H2: State and storage
  - H2: Debugging
  - H2: Existing Chrome via MCP
  - H2: Remote browser control (node host proxy)
  - H2: Related

## cli/channels.md

- Route: /cli/channels
- Headings:
  - H1: openclaw channels
  - H2: Common commands
  - H2: Status / capabilities / resolve / logs
  - H2: Inbound dead letters
  - H2: Add / remove accounts
  - H2: Login and logout (interactive)
  - H2: Troubleshooting
  - H2: Capabilities probe
  - H2: Resolve names to IDs
  - H2: Related

## cli/clawbot.md

- 路由：/cli/clawbot
- 标题：
  - H1：openclaw clawbot
  - H2：迁移
  - H2：相关

## cli/claws.md

- Route: /cli/claws
- Headings:
  - H1: openclaw claws
  - H2: Create a Claw package
  - H2: Inspect and preview
  - H2: Inspect installed state
  - H2: Update an installed Claw
  - H2: Remove an installed Claw
  - H2: Export an installed agent
  - H2: Command reference
  - H2: See also

## cli/commitments.md

- 路由：/cli/commitments
- 标题：
  - H2：用法
  - H2：选项
  - H2：示例
  - H2：输出
  - H2：相关内容

## cli/completion.md

- 路由：/cli/completion
- 标题：
  - H1：openclaw completion
  - H2：用法
  - H2：选项
  - H2：安装流程
  - H2：说明
  - H2：相关内容

## cli/config.md

- 路由：/cli/config
- 标题：
  - H2：根选项
  - H2：示例
  - H3：路径
  - H3：config get
  - H3：config file
  - H3：config schema
  - H3：config validate
  - H2：值
  - H2：config set 模式
  - H3：Provider builder 标志
  - H2：config patch
  - H2：干运行
  - H3：JSON 输出形状
  - H2：应用更改
  - H2：写入安全性
  - H2：修复循环
  - H2：相关内容

## cli/configure.md

- 路由：/cli/configure
- 标题：
  - H1：openclaw 配置
  - H2：选项
  - H2：模型部分
  - H2：Web 部分
  - H2：其他说明
  - H2：相关内容

## cli/crestodian.md

- Route: /cli/crestodian
- Headings: none

## cli/cron.md

- 路由: /cli/cron
- 标题:
  - H1: openclaw cron
  - H2: 快速创建任务
  - H2: 会话
  - H2: 投递
  - H3: 投递归属
  - H3: 失败投递
  - H2: 调度
  - H3: 一次性任务
  - H3: 周期性任务
  - H3: 手动运行
  - H2: 模型
  - H3: 隔离 cron 模型优先级
  - H3: 快速模式
  - H3: 实时模型切换重试
  - H2: 运行输出和拒绝
  - H3: 过期确认抑制
  - H3: 静默令牌抑制
  - H3: 结构化拒绝
  - H2: 保留
  - H2: 迁移旧任务
  - H2: 常见编辑
  - H2: 常见管理命令
  - H2: 相关

## cli/daemon.md

- 路由：/cli/daemon
- 标题：
  - H1：openclaw 守护进程
  - H2：用法
  - H2：子命令和选项
  - H2：说明
  - H2：相关内容

## cli/dashboard.md

- 路由：/cli/dashboard
- 标题：
  - H1：openclaw 仪表板
  - H2：机器可读输出
  - H2：相关内容

## cli/devices.md

- 路由: /cli/devices
- 标题:
  - H1: openclaw 设备
  - H2: 常用选项
  - H2: 命令
  - H3: openclaw devices list
  - H3: `openclaw devices approve [requestId] [--latest]`
  - H3: openclaw devices reject &lt;requestId&gt;
  - H3: openclaw devices remove &lt;deviceId&gt;
  - H3: openclaw devices rename --device &lt;id&gt; --name &lt;label&gt;
  - H3: `openclaw devices clear --yes [--pending]`
  - H3: `openclaw devices rotate --device &lt;id&gt; --role &lt;role&gt; [--scope &lt;scope...&gt;]`
  - H3: openclaw devices revoke --device &lt;id&gt; --role &lt;role&gt;
  - H2: Notes
  - H2: Token drift recovery checklist
  - H2: Paperclip / `openclaw_gateway` first-run approval
  - H2: Related

## cli/directory.md

- 路由：/cli/directory
- 标题：
  - H1：openclaw 目录
  - H2：常用标志
  - H2：说明
  - H2：将结果与消息发送一起使用
  - H2：按频道划分的 ID 格式
  - H2：自己（"me"）
  - H2：联系人（contacts/users）
  - H2：群组
  - H2：相关内容

## cli/dns.md

- 路由：/cli/dns
- 标题：
  - H1：openclaw dns
  - H2：dns 设置
  - H2：相关

## cli/docs.md

- 路由: /cli/docs
- 标题:
  - H1: openclaw 文档
  - H2: 用法
  - H2: 示例
  - H2: 工作原理
  - H2: 输出
  - H2: 退出代码
  - H2: 相关内容

## cli/doctor.md

- 路由：/cli/doctor
- 标题：
  - H1: openclaw doctor
  - H2: Postures
  - H2: Examples
  - H2: Options
  - H2: Lint mode
  - H2: Structured health checks
  - H2: Check selection
  - H2: Post-upgrade mode
  - H2: Legacy state migration
  - H2: Shared state SQLite compaction
  - H2: Session SQLite migration
  - H3: Downgrading After Session SQLite Migration
  - H2: Notes
  - H2: macOS: launchctl env overrides
  - H2: Related

## cli/fleet.md

- 路由: /cli/fleet
- 标题:
  - H1: openclaw fleet
  - H2: 快速开始
  - H2: 租户 ID
  - H2: fleet create
  - H3: 创建选项
  - H3: 通过 digest 固定
  - H3: 磁盘限制
  - H3: 出站策略
  - H2: fleet list
  - H2: fleet status
  - H2: fleet logs
  - H2: fleet start、fleet stop 和 fleet restart
  - H2: fleet upgrade
  - H2: fleet backup 和 fleet restore
  - H2: fleet doctor
  - H2: fleet rm
  - H2: 存储和容器布局
  - H2: 安全配置文件
  - H2: 令牌处理
  - H2: 相关内容

## cli/flows.md

- 路由: /cli/flows
- 标题:
  - H1: openclaw 任务流程
  - H2: 子命令
  - H3: 状态筛选值
  - H2: 示例
  - H2: 相关内容

## cli/gateway.md

- Route: /cli/gateway
- Headings:
  - H2: Run the Gateway
  - H3: Options
  - H2: Restart the Gateway
  - H3: External supervisors
  - H3: Gateway profiling
  - H2: Query a running Gateway
  - H3: gateway health
  - H3: gateway usage-cost
  - H3: gateway stability
  - H3: gateway diagnostics export
  - H3: gateway status
  - H3: gateway probe
  - H4: 通过 SSH 远程访问（Mac 应用程序对等）
  - H3: gateway call &lt;method&gt;
  - H2: 管理 Gateway 服务
  - H3: 使用包装器安装
  - H2: 发现 gateways（Bonjour）
  - H3: gateway discover
  - H2: 相关内容

## cli/health.md

- 路由: /cli/health
- 标题:
  - H1: openclaw 健康状态
  - H2: 选项
  - H2: 行为
  - H2: 相关内容

## cli/hooks.md

- 路由：/cli/hooks
- 标题：
  - H1: openclaw 钩子
  - H2: 列出钩子
  - H2: 获取钩子信息
  - H2: 检查适用性
  - H2: 启用钩子
  - H2: 禁用钩子
  - H2: 安装和更新钩子包
  - H2: 捆绑钩子
  - H3: command-logger 日志文件
  - H2: 注意事项
  - H2: 相关内容

## cli/index.md

- 路由：/cli
- 标题：
  - H2：命令页面
  - H2：全局标志
  - H2：输出模式
  - H2：颜色调色板
  - H2：命令树
  - H2：聊天斜杠命令
  - H2：使用情况跟踪
  - H2：相关内容

## cli/infer.md

- 路由：/cli/infer
- 标题：
  - H2：将 infer 变成一个技能
  - H2：命令树
  - H2：常见任务
  - H2：行为
  - H2：模型
  - H2：图像
  - H2：音频
  - H2：TTS
  - H2：视频
  - H2：网页
  - H2：嵌入
  - H2：JSON 输出
  - H2：常见陷阱
  - H2：相关

## cli/logs.md

- 路由: /cli/logs
- 标题:
  - H1: openclaw 日志
  - H2: 选项
  - H2: 共享网关 RPC 选项
  - H2: 示例
  - H2: 回退和恢复行为
  - H2: 相关内容

## cli/mcp.md

- 路由：/cli/mcp
- 标题：
  - 二级标题：选择合适的 MCP 路径
  - 二级标题：OpenClaw 作为 MCP 服务器
  - 三级标题：何时使用 serve
  - 三级标题：工作原理
  - 三级标题：选择一种客户端模式
  - 三级标题：serve 暴露了什么
  - 三级标题：用法
  - 三级标题：桥接工具
  - 三级标题：事件模型
  - 三级标题：Claude 通道通知
  - 三级标题：MCP 客户端配置
  - 三级标题：选项
  - 三级标题：安全性与信任边界
  - 三级标题：测试
  - 三级标题：故障排查
  - 二级标题：OpenClaw 作为 MCP 客户端注册表
  - 三级标题：已保存的 MCP 服务器定义
  - 三级标题：常见服务器配方
  - 三级标题：JSON 输出形状
  - 三级标题：Stdio 传输
  - 三级标题：SSE / HTTP 传输
  - 三级标题：OAuth 工作流
  - 三级标题：可流式 HTTP 传输
  - 二级标题：控制界面
  - 二级标题：MCP 应用
  - 二级标题：当前限制
  - 二级标题：相关内容

## cli/memory.md

- Route: /cli/memory
- Headings:
  - H1: openclaw memory
  - H2: memory status
  - H2: memory index
  - H2: memory search
  - H2: memory promote
  - H2: memory promote-explain
  - H2: memory rem-harness
  - H2: memory rem-backfill
  - H2: memory session-backfill
  - H2: Dreaming
  - H2: SecretRef gateway dependency
  - H2: Related

## cli/message.md

- 路由: /cli/message
- 标题:
  - H1: openclaw 消息
  - H2: 渠道选择
  - H2: 目标格式 (-t, --target)
  - H2: 常用标志
  - H2: SecretRef 解析
  - H2: 操作
  - H3: 核心
  - H3: 发送
  - H3: 轮询
  - H3: 线程
  - H3: 表情符号
  - H3: 贴纸
  - H3: 身份组、频道、语音、事件（Discord）
  - H3: 审核（Discord）
  - H3: 广播
  - H2: 相关内容

## cli/migrate.md

- 路由：/cli/migrate
- 标题：
  - 一级标题：openclaw migrate
  - 二级标题：命令
  - 二级标题：安全模型
  - 二级标题：Claude 提供方
  - 三级标题：Claude 导入的内容
  - 三级标题：归档和人工审核状态
  - 二级标题：Codex 提供方
  - 三级标题：Codex 导入的内容
  - 三级标题：Codex 人工审核状态
  - 二级标题：Hermes 提供方
  - 三级标题：Hermes 导入的内容
  - 三级标题：支持的 .env 键
  - 三级标题：仅归档状态
  - 三级标题：应用后
  - 二级标题：插件契约
  - 二级标题：入门集成
  - 二级标题：相关

## cli/models.md

- 路由：/cli/models
- 标题：
  - H1: openclaw 模型
  - H2: 常用命令
  - H3: 状态
  - H3: 列表
  - H3: 设置默认 / 图像模型
  - H3: 扫描
  - H2: 别名
  - H2: 回退
  - H2: 认证配置文件
  - H2: 相关内容

## cli/node.md

- 路由：/cli/node
- 标题：
  - H1: openclaw 节点
  - H2: 为什么使用节点主机？
  - H2: 浏览器代理（零配置）
  - H2: 运行（前台）
  - H2: 节点主机的网关认证
  - H2: 服务（后台）
  - H2: 配对
  - H3: 身份和配对状态
  - H2: 执行审批
  - H2: 相关

## cli/nodes.md

- 路由: /cli/nodes
- 标题:
  - H1: openclaw 节点
  - H2: 状态
  - H2: 配对
  - H2: 调用
  - H2: 通知、推送、位置、屏幕
  - H2: 相关内容

## cli/onboard.md

- 路由：/cli/onboard
- 标题：
  - H1: openclaw 入门
  - H2: 示例
  - H2: 引导式流程
  - H2: 重置
  - H2: 语言环境
  - H2: 非交互式设置
  - H3: 网关认证（非交互式）
  - H3: 本地网关健康检查
  - H3: 交互式引用模式
  - H3: Z.AI 端点选项
  - H2: 其他非交互式标志
  - H2: 提供方预筛选
  - H2: Web 搜索后续
  - H2: 其他行为
  - H2: 常见后续命令

## cli/openclaw.md

- Route: /cli/openclaw
- Headings:
  - H1: openclaw setup
  - H2: When it starts
  - H2: What OpenClaw shows
  - H2: Examples
  - H2: Operations and approval
  - H3: Change history
  - H3: Switching to a masked terminal wizard
  - H2: Setup bootstrap
  - H2: AI conversation
  - H3: CLI harness trust model
  - H2: Switching to an agent
  - H2: Message rescue mode
  - H2: Related

## cli/pairing.md

- 路由：/cli/pairing
- 标题：
  - H1：openclaw 配对
  - H2：命令
  - H2：pairing list
  - H2：pairing approve
  - H3：所有者引导
  - H2：相关

## cli/path.md

- 路由：/cli/path
- 标题：
  - H1: openclaw path
  - H2: 为什么使用它
  - H2: 如何使用
  - H2: 工作原理
  - H2: 子命令
  - H2: 全局标志
  - H2: oc:// 语法
  - H2: 按文件类型定位
  - H2: 变更约定
  - H2: 示例
  - H2: 按文件类型的使用方法
  - H3: Markdown
  - H3: JSONC
  - H3: JSONL
  - H3: YAML
  - H2: 子命令参考
  - H3: resolve &lt;oc-path&gt;
  - H3: find &lt;pattern&gt;
  - H3: set &lt;oc-path&gt; &lt;value&gt;
  - H3: validate &lt;oc-path&gt;
  - H3: emit &lt;file&gt;
  - H2: 退出码
  - H2: 输出模式
  - H2: 说明
  - H2: 相关内容

## cli/plugins.md

- 路由：/cli/plugins
- 标题：
  - H2：命令
  - H2：作者
  - H3：Provider 脚手架
  - H2：安装
  - H3：市场简写
  - H2：列表
  - H3：插件索引
  - H2：卸载
  - H2：更新
  - H2：检查
  - H2：诊断
  - H2：注册表
  - H2：市场
  - H2：相关

## cli/policy.md

- Route: /cli/policy
- Headings:
  - H1: openclaw policy
  - H2: Quick start
  - H3: Policy rule reference
  - H4: Scoped overlays
  - H4: Channels
  - H4: MCP servers
  - H4: Model providers
  - H4: Network
  - H4: Message routing
  - H4: Ingress and channel access
  - H4: Gateway
  - H4: Agent workspace
  - H4: Sandbox posture
  - H4: Data Handling
  - H4: Secrets
  - H4: Exec approvals
  - H4: Auth profiles
  - H4: Tool metadata
  - H4: Tool posture
  - H2: Run checks
  - H2: Configure policy
  - H2: Accept policy state
  - H2: Findings
  - H2: Repair
  - H2: Exit codes
  - H2: Related

## cli/promos.md

- 路由：/cli/promos
- 标题：
  - H1: openclaw 优惠活动
  - H2: 命令
  - H2: openclaw promos list
  - H2: openclaw promos claim &lt;slug&gt;
  - H2: 模型列表中的被动发现

## cli/proxy.md

- 路由：/cli/proxy
- 标题：
  - H1: openclaw 代理
  - H2: 验证
  - H3: 选项
  - H2: 调试代理
  - H2: 相关内容

## cli/qr.md

- 路由：/cli/qr
- 标题：
  - H1: openclaw qr
  - H2: 选项
  - H2: 设置代码内容
  - H2: 网关 URL 解析
  - H2: 认证解析（无 --remote）
  - H2: 认证解析（--remote）
  - H2: 相关内容

## cli/reset.md

- 路由：/cli/reset
- 标题：
  - H1：openclaw 重置
  - H2：选项
  - H2：范围
  - H2：说明
  - H2：相关内容

## cli/sandbox.md

- 路由：/cli/sandbox
- 标题：
  - H2：命令
  - H3：openclaw sandbox list
  - H3：openclaw sandbox recreate
  - H3：openclaw sandbox explain
  - H2：为什么需要重新创建
  - H2：常见触发条件
  - H2：注册表迁移
  - H2：配置
  - H2：相关内容

## cli/secrets.md

- 路由：/cli/secrets
- 标题：
  - H1：openclaw 密钥
  - H2：重新加载运行时快照
  - H2：审计
  - H2：配置（交互式助手）
  - H3：执行提供者安全性
  - H2：应用已保存的计划
  - H3：为什么没有回滚备份
  - H2：示例
  - H2：相关

## cli/security.md

- 路由：/cli/security
- 标题：
  - H1：openclaw 安全
  - H2：审计模式
  - H2：它检查什么
  - H2：SecretRef 行为
  - H2：抑制
  - H2：JSON 输出
  - H2：--fix 会更改什么
  - H2：相关

## cli/sessions.md

- 路由：/cli/sessions
- 标题：
  - H1：openclaw 会话
  - H2：尾部轨迹进度
  - H2：导出轨迹包
  - H2：清理维护
  - H2：压缩会话
  - H3：sessions.compact RPC
  - H2：相关内容

## cli/setup.md

- 路由：/cli/setup
- 标题：
  - H1：openclaw 设置
  - H2：选项
  - H3：基线模式
  - H2：示例
  - H2：说明
  - H2：相关内容

## cli/skills.md

- 路由: /cli/skills
- 标题:
  - H1: openclaw 技能
  - H2: 命令
  - H2: 技能工作坊
  - H2: 相关内容

## cli/status.md

- 路由：/cli/status
- 标题：
  - H2：会话和模型解析
  - H2：用量和配额
  - H2：概览和更新状态
  - H2：密钥
  - H2：记忆
  - H2：相关内容

## cli/system.md

- 路由: /cli/system
- 标题:
  - H1: openclaw 系统
  - H2: 常用命令
  - H2: system event
  - H2: system heartbeat last|enable|disable
  - H2: system presence
  - H2: 说明
  - H2: 相关内容

## cli/tasks.md

- 路由：/cli/tasks
- 标题：
  - H2：用法
  - H2：根选项
  - H2：子命令
  - H3：列表
  - H3：显示
  - H3：通知
  - H3：取消
  - H3：审计
  - H3：维护
  - H3：流程
  - H2：相关内容

## cli/transcripts.md

- Route: /cli/transcripts
- Headings:
  - H1: openclaw transcripts
  - H2: Commands
  - H2: Output
  - H2: Many sessions per day
  - H2: Missing summaries
  - H2: Upgrading the legacy file store
  - H2: Configuration

## cli/tui.md

- 路由: /cli/tui
- 标题:
  - H1: openclaw tui
  - H2: 选项
  - H2: 说明
  - H2: 示例
  - H2: 配置修复循环
  - H2: 相关内容

## cli/uninstall.md

- 路由: /cli/uninstall
- 标题:
  - H1: openclaw 卸载
  - H2: 选项
  - H2: 示例
  - H2: 注意事项
  - H2: 相关内容

## cli/update.md

- 路由：/cli/update
- 标题：
  - H1：openclaw 更新
  - H2：用法
  - H2：选项
  - H2：更新状态
  - H2：更新修复
  - H2：更新向导
  - H2：它的作用
  - H3：重启交接
  - H3：控制平面响应形状
  - H2：Git 检出流程
  - H3：渠道选择
  - H3：更新步骤
  - H3：插件同步详情
  - H2：相关

## cli/voicecall.md

- 路由: /cli/voicecall
- 标题:
  - H1: openclaw 语音通话
  - H2: 子命令
  - H2: 设置与冒烟测试
  - H3: 设置
  - H3: 冒烟测试
  - H2: 通话生命周期
  - H3: 呼叫
  - H3: 开始
  - H3: 继续
  - H3: 说话
  - H3: DTMF
  - H3: 结束
  - H3: 状态
  - H2: 日志与指标
  - H3: 尾随查看
  - H3: 延迟
  - H2: 暴露 Webhook
  - H3: 暴露
  - H2: 相关

## cli/webhooks.md

- 路由: /cli/webhooks
- 标题:
  - H1: openclaw webhooks
  - H2: 子命令
  - H2: webhooks gmail setup
  - H3: 必需
  - H3: Pub/Sub 选项
  - H3: OpenClaw 投递选项
  - H3: gog watch serve 选项
  - H3: Tailscale 暴露
  - H3: 输出
  - H2: webhooks gmail run
  - H2: 相关内容

## cli/wiki.md

- 路由：/cli/wiki
- 标题：
  - H1: openclaw wiki
  - H2: 常用命令
  - H2: 代理选择
  - H2: 命令
  - H3: wiki status
  - H3: wiki doctor
  - H3: wiki init
  - H3: wiki ingest &lt;path&gt;
  - H3: wiki okf import &lt;path&gt;
  - H3: wiki compile
  - H3: wiki lint
  - H3: wiki search &lt;query&gt;
  - H3: wiki get &lt;lookup&gt;
  - H3: wiki apply
  - H3: wiki bridge import
  - H3: wiki unsafe-local import
  - H3: wiki chatgpt import
  - H3: wiki chatgpt rollback &lt;run-id&gt;
  - H3: wiki obsidian ...
  - H2: 实用使用指南
  - H2: 配置关联
  - H2: 相关内容

## cli/workboard.md

- Route: /cli/workboard
- Headings:
  - H2: Usage
  - H2: list
  - H2: create
  - H2: show
  - H2: move
  - H2: dispatch
  - H2: Slash command parity
  - H2: Permissions
  - H2: Troubleshooting
  - H3: No cards appear
  - H3: Dispatch says data-only
  - H3: Dispatch starts nothing
  - H2: Related

## cli/worker.md

- 路由：/cli/worker
- 标题：
  - H1：openclaw worker
  - H2：启动契约
  - H2：运行时边界

## concepts/active-memory.md

- Route: /concepts/active-memory
- Headings:
  - H2: Remember across conversations
  - H2: Advanced Active Memory quick start
  - H2: How it works
  - H2: When it runs
  - H3: Session types
  - H2: Session toggle
  - H2: How to see it
  - H2: Query modes
  - H2: Prompt styles
  - H2: Model fallback policy
  - H3: Speed recommendations
  - H4: Cerebras setup
  - H2: Memory tools
  - H3: Built-in memory
  - H3: LanceDB memory
  - H3: Lossless Claw
  - H2: Advanced escape hatches
  - H2: Transcript persistence
  - H2: Configuration
  - H2: Recommended setup
  - H3: Cold-start grace
  - H2: Debugging
  - H2: Common issues
  - H2: Related pages

## concepts/agent-loop.md

- 路由：/concepts/agent-loop
- 标题：
  - H2: 入口点
  - H2: 运行序列
  - H2: 队列与并发
  - H2: 会话和工作区准备
  - H2: 提示组装
  - H2: 钩子
  - H3: 内部钩子（Gateway hooks）
  - H3: 插件钩子
  - H2: 流式传输
  - H2: 工具执行
  - H2: 回复整形
  - H2: 压缩与重试
  - H2: 事件流
  - H2: 聊天通道处理
  - H2: 超时
  - H3: 卡住会话诊断
  - H2: 何处可能提前结束
  - H2: 相关内容

## concepts/agent-runtimes.md

- 路由：/concepts/agent-runtimes
- 标题：
  - H2：Codex 界面
  - H2：运行时所有权
  - H2：运行时选择
  - H2：GitHub Copilot 代理运行时
  - H2：兼容性约定
  - H2：状态标签
  - H2：相关内容

## concepts/agent-workspace.md

- 路由：/concepts/agent-workspace
- 标题：
  - H2：默认位置
  - H2：额外的工作区文件夹
  - H2：工作区文件映射
  - H2：工作区中不包含的内容
  - H2：Git 备份（推荐，私有）
  - H2：不要提交密钥
  - H2：将工作区移动到新机器
  - H2：高级说明
  - H2：相关

## concepts/agent.md

- 路由：/concepts/agent
- 标题：
  - H2：工作区（必需）
  - H2：引导文件（注入）
  - H2：内置工具
  - H2：技能
  - H2：运行时边界
  - H2：会话
  - H2：流式传输时的引导
  - H2：模型引用
  - H2：配置（最小）
  - H2：相关

## concepts/architecture.md

- 路由: /concepts/architecture
- 标题:
  - H2: 概览
  - H2: 组件和流程
  - H3: 网关（守护进程）
  - H3: 客户端（mac 应用 / CLI / web 管理端）
  - H3: 节点（macOS / iOS / Android / 无头）
  - H3: WebChat
  - H2: 连接生命周期（单个客户端）
  - H2: 线协议（摘要）
  - H2: 配对与本地信任
  - H2: 协议类型与代码生成
  - H2: 远程访问
  - H2: 运维快照
  - H2: 不变量
  - H2: 相关内容

## concepts/channel-docking.md

- 路由：/concepts/channel-docking
- 标题：
  - H2：示例
  - H2：为什么使用它
  - H2：所需配置
  - H2：命令
  - H2：会发生什么变化
  - H2：不会发生什么变化
  - H2：故障排查

## concepts/commitments.md

- Route: /concepts/commitments
- Headings:
  - H2: Existing records
  - H2: Related

## concepts/compaction.md

- 路由：/concepts/compaction
- 标题：
  - H2：工作原理
  - H2：自动压缩
  - H2：手动压缩
  - H2：配置
  - H3：使用不同的模型
  - H3：标识符保留
  - H3：活动转录字节保护
  - H3：后继转录
  - H3：压缩通知
  - H3：内存刷新
  - H2：可插拔压缩提供器
  - H2：压缩与剪枝
  - H2：故障排查
  - H2：相关内容

## concepts/context-engine.md

- 路由：/concepts/context-engine
- 标题：
  - H2: 快速开始
  - H2: 工作原理
  - H3: 子代理生命周期（可选）
  - H3: 系统提示词追加
  - H2: 旧版引擎
  - H2: 插件引擎
  - H3: ContextEngine 接口
  - H3: 运行时设置
  - H3: 主机要求
  - H3: 故障隔离
  - H3: ownsCompaction
  - H2: 配置参考
  - H2: 与压缩和记忆的关系
  - H2: 提示
  - H2: 相关内容

## concepts/context.md

- 路由: /concepts/context
- 标题:
  - H2: 快速开始（检查上下文）
  - H2: 示例输出
  - H3: /context 列表
  - H3: /context 详情
  - H3: /context 映射
  - H2: 什么计入上下文窗口
  - H2: OpenClaw 如何构建系统提示词
  - H2: 注入的工作区文件（项目上下文）
  - H2: 技能：注入式 vs 按需加载
  - H2: 工具：有两种成本
  - H2: 命令、指令和“内联快捷方式”
  - H2: 会话、压缩和修剪（哪些内容会持久保留）
  - H2: /context 实际报告什么
  - H2: 相关内容

## concepts/delegate-architecture.md

- 路由：/concepts/delegate-architecture
- 标题：
  - H2: 什么是委托代理
  - H2: 为什么需要委托代理
  - H2: 能力等级
  - H3: 等级 1：只读 + 草稿
  - H3: 等级 2：代表发送
  - H3: 等级 3：主动式
  - H2: 前置条件：隔离与加固
  - H3: 硬性阻断（不可协商）
  - H3: 工具限制
  - H3: 沙箱隔离
  - H3: 审计追踪
  - H2: 设置委托代理
  - H3: 1. 创建委托代理
  - H3: 2. 配置身份提供方委托
  - H4: Microsoft 365
  - H4: Google Workspace
  - H3: 3. 将委托代理绑定到各个渠道
  - H3: 4. 为委托代理添加凭据
  - H2: 示例：组织助手
  - H2: 扩展模式
  - H2: 相关内容

## concepts/dreaming.md

- Route: /concepts/dreaming
- Headings:
  - H2: What dreaming writes
  - H2: Phase model
  - H2: Session transcript ingestion
  - H2: Consolidation safety
  - H2: Dream Diary
  - H2: Deep ranking signals
  - H2: Scheduling
  - H2: Quick start
  - H2: Slash command
  - H2: CLI workflow
  - H2: Key defaults
  - H2: Dreams UI
  - H2: Related

## concepts/experimental-features.md

- Route: /concepts/experimental-features
- Headings:
  - H2: Currently documented flags
  - H2: Control UI Labs
  - H2: Local model lean mode
  - H3: Why these tools
  - H3: When to turn it on
  - H3: When to leave it off
  - H3: Enable
  - H2: Experimental does not mean hidden
  - H2: Related

## concepts/features.md

- 路由：/concepts/features
- 标题：
  - 二级标题：亮点
  - 二级标题：完整列表
  - 二级标题：相关内容

## concepts/main-session.md

- Route: /concepts/main-session
- Headings:
  - H2: Home
  - H2: What flows into the main session
  - H2: Memory across resets and conversations
  - H2: A rolling session with durable history
  - H2: When you want isolation instead
  - H2: Related

## concepts/managed-worktrees.md

- 路由: /concepts/managed-worktrees
- 标题:
  - H2: 布局和名称
  - H2: 配置被忽略的文件
  - H2: 运行仓库设置
  - H2: 会话工作树
  - H2: 快照、清理和恢复
  - H2: CLI
  - H2: 网关方法
  - H2: 工作板工作区

## concepts/mantis-slack-desktop-runbook.md

- 路由: /concepts/mantis-slack-desktop-runbook
- 标题:
  - H2: 存储模型
  - H2: GitHub 分发
  - H2: 本地 CLI
  - H2: Hydrate 模式
  - H2: 时间解释
  - H2: 证据检查清单
  - H2: 故障处理
  - H2: 相关

## concepts/mantis.md

- 路由: /concepts/mantis
- 标题:
  - H2: 所有权
  - H2: CLI 命令
  - H3: discord-smoke
  - H3: run
  - H3: desktop-browser-smoke
  - H3: slack-desktop-smoke
  - H3: telegram-desktop-builder
  - H2: 证据清单
  - H2: GitHub 自动化
  - H2: 机器与密钥
  - H2: 运行结果
  - H2: 添加场景
  - H2: 未决问题

## concepts/markdown-formatting.md

- Route: /concepts/markdown-formatting
- Headings:
  - H2: Pipeline
  - H2: IR example
  - H2: Table handling
  - H2: Chunking rules
  - H2: Link policy
  - H2: Spoilers
  - H2: Collapsible details
  - H2: Adding or updating a channel formatter
  - H2: Common gotchas
  - H2: Related

## concepts/memory-architecture.md

- Route: /concepts/memory-architecture
- Headings:
  - H2: Design principles
  - H2: The tier model
  - H2: Provenance: every memory knows where it came from
  - H2: Trust boundaries and limits
  - H2: The write path
  - H2: Dreaming: consolidation with gates
  - H2: Recall: two lanes
  - H3: Lane 1: always on, zero model calls
  - H3: Lane 2: escalation
  - H2: The user model
  - H2: Standing intents: prospective memory
  - H2: The security model
  - H2: A day in the life
  - H2: Configuration map
  - H2: Related

## concepts/memory-builtin.md

- 路由：/concepts/memory-builtin
- 标题：
  - H2：它提供了什么
  - H2：入门
  - H2：支持的嵌入提供商
  - H2：索引的工作方式
  - H2：何时使用
  - H2：故障排除
  - H2：配置
  - H2：相关内容

## concepts/memory-honcho.md

- 路由: /concepts/memory-honcho
- 标题:
  - H2: 它提供什么
  - H2: 可用工具
  - H2: 入门
  - H2: 配置
  - H2: 迁移现有记忆
  - H2: 它如何工作
  - H2: Honcho vs 内置记忆
  - H2: CLI 命令
  - H2: 延伸阅读
  - H2: 相关内容

## concepts/memory-qmd.md

- 路由: /concepts/memory-qmd
- 标题:
  - H2: 相较于内置功能新增了什么
  - H2: 快速开始
  - H3: 前提条件
  - H3: 启用
  - H2: 边车的工作原理
  - H2: 搜索性能与兼容性
  - H2: 模型覆盖
  - H2: 索引额外路径
  - H2: 索引会话转录
  - H2: 搜索范围
  - H2: 引用
  - H2: 何时使用
  - H2: 故障排除
  - H2: 配置
  - H2: 相关内容

## concepts/memory-search.md

- Route: /concepts/memory-search
- Headings:
  - H2: Quick start
  - H2: Supported providers
  - H2: How search works
  - H2: Deterministic trigger recall
  - H2: Improving search quality
  - H3: Recency decay
  - H3: MMR (diversity)
  - H2: Multimodal memory
  - H2: Session memory search
  - H2: Troubleshooting
  - H2: Related

## concepts/memory.md

- Route: /concepts/memory
- Headings:
  - H2: How it works
  - H2: What goes where
  - H2: Import from coding assistants
  - H2: Action-sensitive memories
  - H2: Retired inferred commitments
  - H2: Memory tools
  - H2: Memory search
  - H2: Memory backends
  - H2: Knowledge wiki layer
  - H2: Automatic memory flush
  - H2: Dreaming
  - H2: Grounded backfill and live promotion
  - H2: CLI
  - H2: Further reading

## concepts/message-lifecycle-refactor.md

- 路由：/concepts/message-lifecycle-refactor
- 标题：
  - H2：为什么进行了这次重构
  - H2：交付了什么
  - H3：发送上下文
  - H3：接收上下文
  - H3：实时预览
  - H3：持久化回执
  - H3：公共 SDK 缩减
  - H2：实现与最初设计的差异
  - H2：具体的迁移风险（仍然相关）
  - H2：故障分类
  - H2：待解决的问题
  - H2：相关内容

## concepts/messages.md

- 路由：/concepts/messages
- 标题：
  - H2: 入站去重
  - H2: 入站防抖
  - H2: 会话和设备
  - H2: 提示正文和历史上下文
  - H2: 工具结果元数据
  - H2: 排队和后续跟进
  - H2: 渠道运行所有权
  - H2: 流式传输、分块和批处理
  - H2: 推理可见性和令牌
  - H2: 前缀、线程和回复
  - H2: 静默回复
  - H2: 相关内容

## concepts/model-failover.md

- 路由：/concepts/model-failover
- 标题：
  - H2：运行流程
  - H2：选择来源策略
  - H2：认证失败跳过缓存
  - H2：用户可见的回退提示
  - H2：认证存储（密钥 + OAuth）
  - H2：配置文件 ID
  - H2：轮换顺序
  - H3：会话粘性（适合缓存）
  - H3：OpenAI Codex 订阅加 API 密钥备份
  - H2：冷却时间
  - H2：计费禁用
  - H2：模型回退
  - H3：候选链规则
  - H3：哪些错误会推进回退
  - H3：冷却跳过与探测行为
  - H2：会话覆盖与实时模型切换
  - H2：可观测性与失败摘要
  - H2：相关配置

## concepts/model-providers.md

- 路由：/concepts/model-providers
- 标题：
  - H2：快速规则
  - H2：在控制界面中配置提供方
  - H2：插件拥有的提供方行为
  - H2：API 密钥轮换
  - H2：官方提供方插件
  - H3：OpenAI
  - H3：Anthropic
  - H3：OpenAI ChatGPT/Codex OAuth
  - H3：其他订阅式托管选项
  - H3：OpenCode
  - H3：Google Gemini（API 密钥）
  - H3：Google Vertex 和 Gemini CLI
  - H3：Z.AI（GLM）
  - H3：Vercel AI Gateway
  - H3：其他内置提供方插件
  - H4：值得了解的特殊情况
  - H2：通过 models.providers 配置提供方（自定义/基础 URL）
  - H3：Moonshot AI（Kimi）
  - H3：Kimi Coding
  - H3：Volcano Engine（Doubao）
  - H3：BytePlus（国际版）
  - H3：Synthetic
  - H3：MiniMax
  - H3：LM Studio
  - H3：Ollama
  - H3：vLLM
  - H3：SGLang
  - H3：本地代理（LM Studio、vLLM、LiteLLM 等）
  - H2：CLI 示例
  - H2：相关内容

## concepts/models.md

- Route: /concepts/models
- Headings:
  - H2: Selection order
  - H2: Selection source and fallback strictness
  - H2: Quick model policy
  - H2: Onboarding
  - H2: "Model is not allowed" (and why replies stop)
  - H2: /model in chat
  - H2: CLI
  - H2: Models registry (models.json)
  - H3: Hosted catalog updates
  - H2: Related

## concepts/multi-agent.md

- 路由：/concepts/multi-agent
- 标题：
  - H2：什么是一个代理
  - H2：路径
  - H3：单代理模式（默认）
  - H2：代理助手
  - H2：快速开始
  - H2：多个代理，多个角色
  - H2：每个代理的 Memory Wiki 保管库
  - H2：跨代理 QMD 记忆搜索
  - H2：一个 WhatsApp 号码，多个人（DM 拆分）
  - H2：路由规则
  - H2：多个账户 / 电话号码
  - H2：概念
  - H2：平台示例
  - H2：常见模式
  - H2：每个代理的沙盒和工具配置
  - H2：相关内容

## concepts/multi-user.md

- Route: /concepts/multi-user
- Headings:
  - H2: Trust boundary
  - H2: Ownership and presence
  - H2: Drafts
  - H2: Turn attribution
  - H2: Related

## concepts/oauth.md

- 路由：/concepts/oauth
- 标题：
  - H2: 令牌接收器（它存在的原因）
  - H2: 存储（令牌存放的位置）
  - H2: Anthropic Claude CLI 复用
  - H2: OAuth 交换（登录如何工作）
  - H3: Anthropic setup-token
  - H3: OpenAI Codex（ChatGPT OAuth）
  - H2: 刷新 + 过期
  - H2: 多个账户（配置文件）+ 路由
  - H3: 1) 首选：独立代理
  - H3: 2) 高级：一个代理中的多个配置文件
  - H2: 相关

## concepts/parallel-specialist-lanes.md

- 路由: /concepts/parallel-specialist-lanes
- 标题:
  - H2: 第一性原理
  - H2: 推荐的推进方案
  - H3: 第 1 阶段：车道契约 + 后台重负载工作
  - H3: 第 2 阶段：优先级和并发控制
  - H3: 第 3 阶段：协调器 / 交通控制器
  - H2: 最小车道契约模板
  - H2: 相关内容

## concepts/personal-agent-benchmark-pack.md

- 路由: /concepts/personal-agent-benchmark-pack
- 标题:
  - H2: 场景
  - H2: 隐私模型
  - H2: 扩展该包

## concepts/presence.md

- 路由：/concepts/presence
- 标题：
  - H2: 存在字段（显示什么）
  - H2: 生产者（存在信息来自哪里）
  - H3: 1) 网关自有条目
  - H3: 2) WebSocket 连接
  - H4: 为什么短暂的控制平面连接不会显示
  - H3: 3) system-event 信标
  - H3: 4) 节点连接（role: node）
  - H2: 合并 + 去重规则（为什么 instanceId 很重要）
  - H2: TTL 和有界大小
  - H2: 远程/隧道注意事项（回环 IP）
  - H2: 消费者
  - H3: 控制台 UI 设备页面
  - H3: macOS 实例选项卡
  - H2: 调试提示
  - H2: 相关内容

## concepts/progress-drafts.md

- Route: /concepts/progress-drafts
- Headings:
  - H2: Quick start
  - H2: What users see
  - H2: Choose a mode
  - H2: Configure labels
  - H2: Control progress lines
  - H3: Detail mode
  - H3: Command/exec text
  - H3: Commentary lane
  - H3: Status headline
  - H3: Line limits
  - H3: Rich rendering (Slack)
  - H3: Hide tool/task lines
  - H2: Channel behavior
  - H2: Finalization
  - H2: Troubleshooting
  - H2: Related

## concepts/qa-e2e-automation.md

- Route: /concepts/qa-e2e-automation
- Headings:
  - H2: Command surface
  - H3: Profile-backed qa run
  - H2: Operator flow
  - H3: Observability smokes
  - H3: Matrix live lane
  - H3: Discord Mantis scenarios
  - H3: Mantis Slack desktop and visual-task runners
  - H3: Credential pool health check
  - H2: Canonical scenario coverage
  - H2: Discord, Slack, Telegram, and WhatsApp QA reference
  - H3: Shared CLI flags
  - H3: Telegram QA
  - H3: Discord QA
  - H3: Slack QA
  - H4: 设置 Slack 工作区
  - H3: WhatsApp QA
  - H3: Convex 凭证池
  - H2: 仓库支持的种子数据
  - H2: 提供方模拟通道
  - H2: 传输适配器
  - H3: 添加通道
  - H3: 场景辅助函数名称
  - H2: 报告
  - H2: 相关文档

## concepts/queue-steering.md

- Route: /concepts/queue-steering
- Headings:
  - H2: Runtime boundary
  - H2: Why steering waits for the current batch
  - H2: Modes
  - H2: Burst example
  - H2: Scope
  - H2: Debounce
  - H2: Related

## concepts/queue.md

- 路由: /concepts/queue
- 标题:
  - H2: 为什么
  - H2: 工作原理
  - H2: 默认值
  - H2: 队列模式
  - H2: 队列选项
  - H2: 转向与流式传输
  - H2: 优先级
  - H2: 按会话覆盖
  - H2: 已排队回合取消
  - H2: 作用域与保证
  - H2: 故障排除
  - H2: 相关内容

## concepts/retry.md

- 路由: /concepts/retry
- 标题:
  - H2: 目标
  - H2: 默认值
  - H2: 行为
  - H3: 模型提供商
  - H3: Discord
  - H3: Telegram
  - H2: 配置
  - H2: 注意事项
  - H2: 相关内容

## concepts/session-pruning.md

- 路由：/concepts/session-pruning
- 标题：
  - H2：为什么它很重要
  - H2：它如何工作
  - H2：旧版镜像清理
  - H2：智能默认值
  - H2：启用或禁用
  - H2：剪枝与压缩
  - H2：延伸阅读
  - H2：相关

## concepts/session-search.md

- 路由：/concepts/session-search
- 标题：
  - H1：会话搜索
  - H2：可见性与输出
  - H2：索引生命周期
  - H2：会话搜索 vs. 记忆搜索

## concepts/session-state.md

- 路由：/concepts/session-state
- 标题：
  - H2：信号日志
  - H2：观察者
  - H2：通知：一个，而不是多个
  - H2：协调
  - H2：存储与限制
  - H2：相关内容

## concepts/session-tool.md

- Route: /concepts/session-tool
- Headings:
  - H2: Available tools
  - H2: Listing and reading sessions
  - H2: Managing session settings and groups
  - H2: Sessions versus conversations
  - H2: Sending cross-session messages
  - H2: Status and orchestration helpers
  - H2: Session state changes
  - H2: Spawning sub-agents
  - H2: Visibility
  - H2: Further reading
  - H2: Related

## concepts/session.md

- Route: /concepts/session
- Headings:
  - H2: How messages are routed
  - H2: DM isolation
  - H3: Dock linked channels
  - H2: Incognito sessions
  - H2: Remember across conversations
  - H2: Session lifecycle
  - H2: Where state lives
  - H2: Session maintenance
  - H2: Inspecting sessions
  - H2: Further reading
  - H2: Related

## concepts/soul.md

- 路由: /concepts/soul
- 标题:
  - H2: SOUL.md 中应包含什么
  - H2: 为什么这有效
  - H2: Molty 提示词
  - H2: 好的表现是什么样
  - H2: 一个警告
  - H2: 相关内容

## concepts/standing-intents.md

- Route: /concepts/standing-intents
- Headings:
  - H2: Choose the right intention tier
  - H2: Create an event-based intent
  - H2: How matching works
  - H2: List and cancel
  - H2: Lifecycle states
  - H2: Related

## concepts/streaming.md

- Route: /concepts/streaming
- Headings:
  - H2: Control UI startup status
  - H2: Block streaming (channel messages)
  - H3: Media delivery with block streaming
  - H2: Chunking algorithm (low/high bounds)
  - H2: Coalescing (merge streamed blocks)
  - H2: Human-like pacing between blocks
  - H2: "Stream chunks or everything"
  - H2: Preview streaming modes
  - H3: Channel mapping
  - H3: Legacy key migration
  - H2: Runtime behavior
  - H3: Telegram
  - H3: Discord
  - H3: Slack
  - H3: Mattermost
  - H3: Matrix
  - H2: 工具进度预览更新
  - H2: 进度草稿渲染
  - H3: 注释进度轨道
  - H2: 相关内容

## concepts/system-prompt.md

- 路由: /concepts/system-prompt
- 标题:
  - H2: 结构
  - H2: 提示词模式
  - H2: 提示词快照
  - H2: 工作区引导注入
  - H2: 时间处理
  - H2: 技能
  - H2: 文档
  - H2: 相关

## concepts/timezone.md

- 路由：/concepts/timezone
- 标题：
  - H2: 三个时区层面
  - H2: 设置用户时区
  - H2: 信封时区值
  - H2: 何时覆盖
  - H2: 相关内容

## concepts/typebox.md

- 路由：/concepts/typebox
- 标题：
  - H2：心智模型（30 秒）
  - H2：模式位于何处
  - H2：当前流水线
  - H2：运行时如何使用这些模式
  - H2：示例帧
  - H2：最小客户端（Node.js）
  - H2：完整示例：端到端添加一个方法
  - H2：Swift 代码生成行为
  - H2：版本控制与兼容性
  - H2：模式模式与约定
  - H2：实时模式 JSON
  - H2：当你更改模式时
  - H2：相关内容

## concepts/typing-indicators.md

- 路由：/concepts/typing-indicators
- 标题：
  - H2：默认值
  - H2：模式
  - H2：配置
  - H2：说明
  - H2：相关内容

## concepts/usage-tracking.md

- 路由：/concepts/usage-tracking
- 标题：
  - H2: 它是什么
  - H2: 它会出现在哪里
  - H2: Anthropic 和 OpenAI 成本历史
  - H2: 默认使用页脚模式
  - H3: 三种不同的会话状态
  - H3: 优先级
  - H3: 重置 vs. 关闭
  - H3: 切换行为
  - H3: 配置
  - H2: 自定义 /usage 完整页脚
  - H3: 形状
  - H3: 合约路径
  - H3: 动词
  - H3: 组成形式
  - H3: 示例
  - H2: 提供方 + 凭据
  - H2: 相关内容

## concepts/user-model.md

- Route: /concepts/user-model
- Headings:
  - H2: Write directives, not observations
  - H2: Supersede in place
  - H2: Choose the right file
  - H2: Keep it compact
  - H2: Related

## date-time.md

- 路由：/date-time
- 标题：
  - H2：消息信封（默认使用本地时间）
  - H3：示例
  - H2：系统提示：当前日期和时间
  - H2：系统事件行（默认使用本地时间）
  - H3：配置用户时区 + 格式
  - H2：时间格式检测（自动）
  - H2：工具负载 + 连接器（原始提供方时间 + 规范化字段）
  - H2：相关文档

## debug/node-issue.md

- 路由：/debug/node-issue
- 标题：
  - H1：Node + tsx "\\name is not a function" 崩溃
  - H2：状态
  - H2：原始症状
  - H2：原因
  - H2：当前复现检查
  - H2：解决方法（如果崩溃再次出现）
  - H2：参考
  - H2：相关

## diagnostics/flags.md

- 路由: /diagnostics/flags
- 标题:
  - H2: 工作原理
  - H2: 已知标志
  - H2: 通过配置启用
  - H2: 环境覆盖（一次性）
  - H2: Profiler 标志
  - H2: 时间线工件
  - H2: 日志输出位置
  - H2: 提取日志
  - H2: 说明
  - H2: 相关内容

## gateway/1password.md

- Route: /gateway/1password
- Headings:
  - H2: Requirements
  - H2: Resolve config secrets with the plugin
  - H2: The 1password skill for agents
  - H2: Official 1Password MCP server
  - H2: Browser sign-in with 1Password for Claude
  - H2: Security notes
  - H2: Troubleshooting

## gateway/audit.md

- 路由：/gateway/audit
- 标题：
  - H1：审计历史
  - H2：记录家族
  - H2：消息生命周期事件
  - H3：会话类型分类
  - H2：隐私模型
  - H2：覆盖范围和证明限制
  - H2：存储、保留与迁移
  - H2：查询
  - H2：相关内容

## gateway/authentication.md

- 路由: /gateway/authentication
- 标题:
  - H2: 推荐设置：API 密钥（任意提供商）
  - H2: Anthropic：复用 Claude CLI
  - H2: 手动输入令牌
  - H3: 基于 SecretRef 的凭据
  - H2: 检查模型认证状态
  - H2: API 密钥轮换（网关）
  - H2: 在网关运行时移除提供商认证
  - H2: 控制使用哪个凭据
  - H3: OpenAI 和旧版 openai-codex 标识
  - H3: 登录期间（CLI）
  - H3: 按会话（聊天命令）
  - H3: 按代理（CLI 覆盖）
  - H2: 故障排查
  - H3: “未找到凭据”
  - H3: 令牌即将过期/已过期
  - H2: 相关内容

## gateway/background-process.md

- 路由：/gateway/background-process
- 标题：
  - H2：exec 工具
  - H3：环境覆盖
  - H3：配置（优先于环境覆盖）
  - H2：子进程桥接
  - H2：process 工具
  - H2：示例
  - H2：相关内容

## gateway/bonjour.md

- 路由：/gateway/bonjour
- 标题：
  - H2: 通过 Tailscale 进行广域 Bonjour（单播 DNS-SD）
  - H3: 网关配置
  - H3: 一次性 DNS 服务器设置（网关主机，仅限 macOS）
  - H3: Tailscale DNS 设置
  - H3: 网关监听器安全性
  - H2: 广播内容
  - H2: 服务类型
  - H2: TXT 键（非机密提示）
  - H2: 在 macOS 上调试
  - H2: 在 Gateway 日志中调试
  - H2: 在 iOS 节点上调试
  - H2: 何时启用 Bonjour
  - H2: 何时禁用 Bonjour
  - H2: Docker 注意事项
  - H2: 排查已禁用的 Bonjour
  - H2: 常见故障模式
  - H2: 转义后的实例名称（\032）
  - H2: 启用 / 禁用 / 配置
  - H2: 相关文档

## gateway/bridge-protocol.md

- 路由：/gateway/bridge-protocol
- 标题：
  - H2：它为何存在
  - H2：传输
  - H2：握手与配对
  - H2：帧
  - H2：Exec 生命周期事件
  - H2：历史的 tailnet 用法
  - H2：版本控制
  - H2：相关内容

## gateway/cli-backends.md

- Route: /gateway/cli-backends
- Headings:
  - H2: Quick start
  - H2: Using it as a fallback
  - H2: Configuration
  - H2: How it works
  - H2: Timeouts and long-running work
  - H3: Claude CLI specifics
  - H3: Claude browser tools and 1Password sign-in
  - H2: Sessions
  - H2: Fallback prelude from claude-cli sessions
  - H2: Images
  - H2: Inputs and outputs
  - H2: Plugin-owned defaults
  - H2: Text transform overlays
  - H2: Native compaction ownership
  - H2: Bundle MCP overlays
  - H2: Reseed history cap
  - H2: Limitations
  - H2: Troubleshooting
  - H2: Related

## gateway/clients.md

- Route: /gateway/clients
- Headings:
  - H2: Install the packages
  - H2: Choose scopes and pair the device
  - H2: Advertise client capabilities
  - H2: Recover state after reconnect
  - H2: Render generated image artifacts
  - H2: Use history metadata and stable anchors
  - H2: Subscribe instead of polling usage
  - H2: Backfill exec approvals
  - H2: Track protocol versions
  - H2: Related

## gateway/cloud-workers.md

- 路由：/gateway/cloud-workers
- 标题：
  - H2：在哪里运行什么
  - H2：要求
  - H2：配置
  - H3：设置命令
  - H3：安装通道
  - H2：调度会话
  - H2：安全模型
  - H2：故障排查
  - H2：相关内容

## gateway/config-agents.md

- 路由：/gateway/config-agents
- 标题：
  - H2: 代理默认值
  - H3: agents.defaults.workspace
  - H3: agents.defaults.repoRoot
  - H3: agents.defaults.skills
  - H3: agents.defaults.skipBootstrap
  - H3: agents.defaults.skipOptionalBootstrapFiles
  - H3: agents.defaults.contextInjection
  - H3: agents.defaults.bootstrapMaxChars
  - H3: agents.defaults.bootstrapTotalMaxChars
  - H3: 每个代理的引导配置覆盖
  - H3: agents.defaults.bootstrapPromptTruncationWarning
  - H3: 上下文预算归属映射
  - H4: agents.defaults.startupContext
  - H4: agents.defaults.contextLimits
  - H4: `agents.entries.*.contextLimits`
  - H4: skills.limits.maxSkillsPromptChars
  - H4: `agents.entries.*.skillsLimits.maxSkillsPromptChars`
  - H3: agents.defaults.imageMaxDimensionPx
  - H3: agents.defaults.imageQuality
  - H3: agents.defaults.userTimezone
  - H3: agents.defaults.timeFormat
  - H3: agents.defaults.model
  - H3: Runtime policy
  - H3: CLI backend selection
  - H3: agents.defaults.promptOverlays
  - H3: agents.defaults.heartbeat
  - H3: agents.defaults.systemAgent
  - H3: agents.defaults.compaction
  - H3: agents.defaults.contextPruning
  - H3: 块流式传输
  - H3: 输入指示器
  - H3: agents.defaults.sandbox
  - H3: agents.entries (per-agent overrides)
  - H2: Multi-agent routing
  - H3: Binding match fields
  - H3: Per-agent access profiles
  - H2: Session
  - H2: Messages
  - H3: Response prefix
  - H3: Ack reaction
  - H3: Queue
  - H3: Inbound debounce
  - H3: Other message keys
  - H3: TTS (text-to-speech)
  - H2: Talk
  - H2: Related

## gateway/config-channels.md

- 路由: /gateway/config-channels
- 标题:
  - H2: 渠道
  - H3: 私信和群组访问
  - H3: 渠道模型覆盖
  - H3: 渠道默认值和心跳
  - H3: WhatsApp
  - H3: Telegram
  - H3: Discord
  - H3: Google Chat
  - H3: Slack
  - H3: Mattermost
  - H3: Signal
  - H3: iMessage
  - H3: Matrix
  - H3: Microsoft Teams
  - H3: IRC
  - H3: 多账户（所有渠道）
  - H3: 其他插件渠道
  - H3: 群聊提及门控
  - H4: 私信历史限制
  - H4: 自聊模式
  - H3: 命令（聊天命令处理）
  - H2: 相关内容

## gateway/config-tools.md

- 路由: /gateway/config-tools
- 标题:
  - H2: 工具
  - H3: 工具配置文件
  - H3: 工具组
  - H3: 沙盒工具策略中的 MCP 和插件工具
  - H3: tools.codeMode
  - H3: tools.allow / tools.deny
  - H3: tools.byProvider
  - H3: tools.toolsBySender
  - H3: tools.elevated
  - H3: tools.exec
  - H3: tools.loopDetection
  - H3: tools.web
  - H3: tools.media
  - H3: tools.agentToAgent
  - H3: tools.sessions
  - H3: `tools.sessions_spawn`
  - H3: tools.updatePlan
  - H3: agents.defaults.subagents
  - H2: 自定义提供商和基础 URL
  - H3: 提供商字段详情
  - H3: 提供商示例
  - H2: 相关

## gateway/configuration-examples.md

- 路由: /gateway/configuration-examples
- 标题:
  - H2: 快速开始
  - H3: 绝对最小配置
  - H3: 推荐入门配置
  - H2: 扩展示例（主要选项）
  - H3: 符号链接的相邻技能仓库
  - H2: 常见模式
  - H3: 共享技能基线并覆盖一个配置
  - H3: 多平台设置
  - H3: 受信任节点网络自动批准
  - H3: 安全 DM 模式（共享收件箱 / 多用户 DM）
  - H3: Anthropic API 密钥 + MiniMax 回退
  - H3: 工作机器人（受限访问）
  - H3: 仅使用本地模型
  - H2: 提示
  - H2: 相关内容

## gateway/configuration-reference.md

- 路由：/gateway/configuration-reference
- 标题：
  - H2: 通道
  - H2: 代理默认值、多代理、会话和消息
  - H2: 工具和自定义提供方
  - H2: 模型
  - H2: MCP
  - H2: Skills
  - H2: Plugins
  - H3: Codex harness plugin config
  - H2: Browser
  - H2: UI
  - H2: 网关
  - H3: OpenAI 兼容端点
  - H3: 多实例隔离
  - H3: gateway.tls
  - H3: gateway.reload
  - H2: 云工作环境
  - H3: Crabbox 配置文件
  - H3: 静态 SSH 开发配置文件
  - H2: Hooks
  - H3: Gmail 集成
  - H2: Canvas 插件主机
  - H2: 发现
  - H3: mDNS（Bonjour）
  - H3: 广域网（DNS-SD）
  - H2: 环境
  - H3: env（内联环境变量）
  - H3: 环境变量替换
  - H2: 密钥
  - H3: SecretRef
  - H3: Supported credential surface
  - H3: Secret providers config
  - H2: Auth storage
  - H2: Audit
  - H2: Logging
  - H2: Diagnostics
  - H2: Update
  - H2: ACP
  - H2: Wizard
  - H2: Identity
  - H2: Bridge (legacy, removed)
  - H2: Cron
  - H3: cron.failureAlert
  - H2: Media model template variables
  - H2: Config includes ($include)
  - H2: Related

## gateway/configuration.md

- 路由: /gateway/configuration
- 标题:
  - H2: 最小配置
  - H2: 编辑配置
  - H2: 严格校验
  - H2: 常见任务
  - H2: 配置热重载
  - H3: 重载模式
  - H3: 哪些内容会热生效，哪些需要重启
  - H3: 重载规划
  - H2: 配置 RPC（程序化更新）
  - H2: 环境变量
  - H2: 完整参考
  - H2: 相关内容

## gateway/diagnostics.md

- 路由: /gateway/diagnostics
- 标题:
  - H2: 快速开始
  - H2: 聊天命令
  - H2: 导出内容包含什么
  - H2: 隐私模型
  - H2: 稳定性记录器
  - H2: 有用的选项
  - H2: 禁用诊断
  - H2: 相关链接

## gateway/discovery.md

- 路由：/gateway/discovery
- 标题：
  - H2：术语
  - H2：为什么同时存在 direct 和 SSH
  - H2：发现输入
  - H3：1) Bonjour / DNS-SD
  - H4：服务信标详情
  - H3：2) Tailnet（跨网络）
  - H3：3) 手动 / SSH 目标
  - H2：传输选择（客户端策略）
  - H2：配对与认证（直连传输）
  - H2：各组件职责
  - H2：相关

## gateway/doctor.md

- 路由：/gateway/doctor
- 标题：
  - H2：快速开始
  - H3：无头和自动化模式
  - H2：只读 lint 模式
  - H2：它的作用（摘要）
  - H2：Dreams UI 回填与重置
  - H2：详细行为与原因
  - H2：相关内容

## gateway/embedding.md

- Route: /gateway/embedding
- Headings:
  - H2: Start the child with an embedding preset
  - H3: Electron shell snapshot warning
  - H2: Handle invalid config by exit code
  - H2: Wait for protocol readiness
  - H2: Interpret restart and shutdown
  - H2: Use RPC instead of state files
  - H2: Install; do not flatten
  - H2: Related

## gateway/external-apps.md

- 路由：/gateway/external-apps
- 标题：
  - H2：当前可用内容
  - H2：推荐路径
  - H2：协作式主机挂起
  - H2：应用代码与插件代码
  - H2：相关内容

## gateway/gateway-lock.md

- 路由：/gateway/gateway-lock
- 标题：
  - H2：为什么
  - H2：三层
  - H3：状态和配置锁
  - H3：Socket 绑定
  - H2：操作说明
  - H2：相关

## gateway/health.md

- Route: /gateway/health
- Headings:
  - H2: Quick checks
  - H2: Deep diagnostics
  - H2: Health monitor config
  - H2: Inbound ingress health
  - H2: Uptime monitoring
  - H3: Monitoring service setup examples
  - H2: When something fails
  - H2: Dedicated "health" command
  - H2: Related

## gateway/heartbeat.md

- Route: /gateway/heartbeat
- Headings:
  - H2: Quick start (beginner)
  - H2: Defaults
  - H2: What the heartbeat prompt is for
  - H2: Response contract
  - H2: Config
  - H3: Scope and precedence
  - H3: Per-agent heartbeats
  - H3: Active hours example
  - H3: 24/7 setup
  - H3: Multi-account example
  - H3: Field notes
  - H2: Delivery behavior
  - H2: Visibility controls
  - H3: What each flag does
  - H3: Per-channel vs per-account examples
  - H3: Common patterns
  - H2: Monitor scratch (optional)
  - H3: Schedule recurring checks with cron
  - H3: Can the agent update its scratch?
  - H2: Manual wake (on-demand)
  - H2: Cost awareness
  - H2: Context overflow after heartbeat
  - H2: Related

## gateway/index.md

- 路由：/gateway
- 标题：
  - H2：5分钟本地启动
  - H2：运行时模型
  - H2：兼容 OpenAI 的端点
  - H3：端口与绑定优先级
  - H3：热重载模式
  - H2：操作员命令集
  - H2：多个网关（同一主机）
  - H2：远程访问
  - H2：监督与服务生命周期
  - H2：开发配置文件快速路径
  - H2：协议快速参考（操作员视图）
  - H2：运维检查
  - H3：存活性
  - H3：就绪性
  - H3：缺口恢复
  - H2：常见故障特征
  - H2：安全保障
  - H2：相关内容

## gateway/local-model-services.md

- 路由：/gateway/local-model-services
- 标题：
  - H2: 工作原理
  - H2: 配置结构
  - H2: 字段
  - H2: Inferrs 示例
  - H2: ds4 示例
  - H2: 相关内容

## gateway/local-models.md

- 路由：/gateway/local-models
- 标题：
  - H2：硬件底线
  - H2：选择后端
  - H2：LM Studio + 大型本地模型（Responses API）
  - H3：混合配置：托管主模型，本地回退
  - H3：区域托管 / 数据路由
  - H2：其他与 OpenAI 兼容的本地代理
  - H2：更小或更严格的后端
  - H2：故障排除
  - H2：相关内容

## gateway/logging.md

- 路由: /gateway/logging
- 标题:
  - H1: 日志记录
  - H2: 基于文件的日志记录器
  - H3: 详细级别 vs. 日志级别
  - H2: 控制台捕获
  - H2: 脱敏
  - H2: 网关 WebSocket 日志
  - H3: WS 日志样式
  - H2: 控制台格式化（子系统日志记录）
  - H2: 相关内容

## gateway/multi-tenant-hosting.md

- Route: /gateway/multi-tenant-hosting
- Headings:
  - H1: Multi-tenant hosting
  - H2: Why each tenant needs a cell
  - H2: Architecture
  - H2: Trust boundary
  - H2: Isolation ladder
  - H2: Quick start
  - H2: Current scope
  - H2: Related

## gateway/multiple-gateways.md

- 路由：/gateway/multiple-gateways
- 标题：
  - H2: Rescue-bot 快速入门
  - H3: `--profile rescue onboard` 会更改什么
  - H2: 通用多网关设置
  - H2: 隔离检查清单
  - H2: 端口映射（派生）
  - H2: 浏览器/CDP 注意事项（常见坑）
  - H2: 手动环境变量示例
  - H2: 快速检查
  - H2: 相关内容

## gateway/network-model.md

- 路由：/gateway/network-model
- 标题：
  - H2：相关

## gateway/openai-http-api.md

- Route: /gateway/openai-http-api
- Headings:
  - H2: Enabling the endpoint
  - H2: Security boundary (important)
  - H2: Authentication
  - H2: When to use this endpoint
  - H2: Agent-first model contract
  - H2: Session behavior
  - H2: Request limits
  - H2: Chat tool contract
  - H3: Supported request fields
  - H3: Unsupported variants
  - H3: Non-streaming tool response shape
  - H3: Streaming tool response shape
  - H3: Tool follow-up loop
  - H2: Streaming (SSE)
  - H2: Open WebUI quick setup
  - H2: Examples
  - H2: Related

## gateway/openresponses-http-api.md

- 路由: /gateway/openresponses-http-api
- 标题:
  - H2: 认证、安全和路由
  - H2: 会话行为
  - H2: 请求形状
  - H2: 条目（输入）
  - H3: message
  - H3: `function_call_output` (turn-based tools)
  - H3: reasoning and `item_reference`
  - H2: Tools (client-side function tools)
  - H2: Images (`input_image`)
  - H2: Files (`input_file`)
  - H2: File + image limits
  - H2: Streaming (SSE)
  - H2: Usage
  - H2: Errors
  - H2: Examples
  - H2: Related

## gateway/openshell.md

- Route: /gateway/openshell
- Headings:
  - H2: Prerequisites
  - H2: Quick start
  - H2: Workspace modes
  - H3: mirror (default)
  - H3: remote
  - H3: Choosing a mode
  - H2: Configuration reference
  - H2: Examples
  - H3: Minimal remote setup
  - H3: Mirror mode with GPU
  - H3: Per-agent OpenShell with custom gateway
  - H2: Lifecycle management
  - H2: Security hardening
  - H2: Custom image contract
  - H2: Current limitations
  - H2: How it works
  - H2: Related

## gateway/opentelemetry.md

- Route: /gateway/opentelemetry
- Headings:
  - H2: Quick start
  - H2: Signals exported
  - H2: Configuration reference
  - H3: Environment variables
  - H2: Continue an upstream WebSocket trace
  - H2: Privacy and content capture
  - H2: Sampling and flushing
  - H3: Model-call observation units
  - H3: Claude Code CLI model-call fidelity
  - H2: Exported metrics
  - H3: Model usage
  - H3: Message flow
  - H3: Talk
  - H3: Queues and sessions
  - H3: Session liveness telemetry
  - H3: Harness lifecycle
  - H3: Tool execution and loop detection
  - H3: Exec
  - H3: Diagnostics internals (memory, payloads, exporter health)
  - H2: Exported spans
  - H2: Diagnostic event catalog
  - H2: Without an exporter
  - H2: Disable
  - H2: Related

## gateway/operator-scopes.md

- 路由：/gateway/operator-scopes
- 标题：
  - H2：角色
  - H2：作用域级别
  - H2：方法作用域只是第一道门槛
  - H2：设备配对审批
  - H2：节点配对审批
  - H2：共享密钥认证

## gateway/pairing.md

- 路由: /gateway/pairing
- 标题：
  - H2: 能力审批如何工作
  - H2: CLI 工作流（适合无头环境）
  - H2: API 表面（gateway 协议）
  - H2: Node 命令门控（2026.3.31+）
  - H2: Node 事件信任边界（2026.3.31+）
  - H2: 基于 SSH 验证的设备自动批准（默认）
  - H2: 自动批准（macOS 应用）
  - H2: 基于受信任 CIDR 的设备自动批准
  - H2: 静默配对覆盖清理
  - H2: 元数据升级自动批准
  - H2: 二维码配对助手
  - H2: 本地性与转发头
  - H2: 存储（本地，私有）
  - H2: 传输行为
  - H2: 相关内容

## gateway/prometheus.md

- 路由：/gateway/prometheus
- 标题：
  - H2：快速开始
  - H2：导出的指标
  - H2：标签策略
  - H2：PromQL 配方
  - H2：在 Prometheus 和 OpenTelemetry 导出之间进行选择
  - H2：故障排查
  - H2：相关内容

## gateway/protocol.md

- Route: /gateway/protocol
- Headings:
  - H2: npm packages
  - H2: Transport and framing
  - H2: Handshake
  - H3: Worker role and closed protocol
  - H3: Client capabilities
  - H3: Node connect example
  - H2: Roles and scopes
  - H3: Caps/commands/permissions (node)
  - H2: Presence
  - H3: Node background alive event
  - H2: Broadcast event scoping
  - H2: RPC method families
  - H3: Common event families
  - H3: Node helper methods
  - H2: Audit ledger RPC
  - H2: Task ledger RPCs
  - H2: Operator helper methods
  - H3: models.list views
  - H2: Exec approvals
  - H2: Agent delivery fallback
  - H2: Versioning
  - H3: Client constants
  - H2: Auth
  - H2: Device identity and pairing
  - H3: Device auth migration diagnostics
  - H2: TLS and pinning
  - H2: Scope
  - H2: Related

## gateway/remote-gateway-readme.md

- 路由：/gateway/remote-gateway-readme
- 标题：
  - H1：使用远程网关运行 OpenClaw.app
  - H2：设置
  - H2：工作原理
  - H2：相关内容

## gateway/remote.md

- 路由：/gateway/remote
- 标题：
  - H2：核心理念
  - H2：拓扑选项
  - H2：命令流（在哪里运行什么）
  - H2：SSH 隧道（CLI + 工具）
  - H2：CLI 远程默认值
  - H2：凭证优先级
  - H2：聊天 UI 远程访问
  - H2：macOS 应用远程模式
  - H2：安全规则（远程/VPN）
  - H3：macOS：通过 LaunchAgent 持久化 SSH 隧道
  - H4：步骤 1：添加 SSH 配置
  - H4：步骤 2：复制 SSH 密钥（一次性）
  - H4：步骤 3：配置网关令牌
  - H4：步骤 4：创建 LaunchAgent
  - H4：步骤 5：加载 LaunchAgent
  - H4：故障排查
  - H2：相关内容

## gateway/restart-recovery.md

- 路由：/gateway/restart-recovery
- 标题：
  - H2: 重启后哪些状态会保留
  - H2: 优雅重启会先进行流量排空
  - H2: 如何检测中断的工作
  - H2: 自动恢复
  - H3: 子代理
  - H3: 后台任务
  - H3: 代理请求的重启
  - H2: 安全阀与可观测性
  - H2: 哪些内容不会恢复

## gateway/sandbox-vs-tool-policy-vs-elevated.md

- 路由: /gateway/sandbox-vs-tool-policy-vs-elevated
- 标题：
  - H2: 快速排查
  - H2: 沙箱：工具运行的位置
  - H3: 挂载绑定（安全快速检查）
  - H2: 工具策略：哪些工具存在/可调用
  - H3: 工具组（简写）
  - H2: 提升权限：仅限执行的“在主机上运行”
  - H2: 常见的“沙箱监禁”修复
  - H3: “工具 X 被沙箱工具策略阻止”
  - H3: “我以为这是主环境，为什么它在沙箱中？”
  - H2: 相关

## gateway/sandboxing.md

- Route: /gateway/sandboxing
- Headings:
  - H2: What gets sandboxed
  - H2: Modes, scope, and backend
  - H2: Supported capability matrix
  - H2: Docker backend
  - H3: Sandboxed browser
  - H2: SSH backend
  - H2: OpenShell backend
  - H2: Workspace access
  - H2: Multiple folders for one agent
  - H3: Other bind behavior
  - H2: Images and setup
  - H2: setupCommand (one-time container setup)
  - H2: Tool policy and escape hatches
  - H2: Multi-agent overrides
  - H2: Minimal enable example
  - H2: Related

## gateway/secrets-plan-contract.md

- Route: /gateway/secrets-plan-contract
- Headings:
  - H2: Plan file requirements
  - H2: Plan file shape
  - H2: Provider upserts and deletes
  - H2: Supported target scope
  - H2: Target type behavior
  - H2: Path validation rules
  - H2: Failure behavior
  - H2: Exec provider consent behavior
  - H2: Runtime and audit scope notes
  - H2: Operator checks
  - H2: Related docs

## gateway/secrets.md

- 路由：/gateway/secrets
- 标题：
  - H2: 运行时模型
  - H2: 出站时注入（哨兵）
  - H2: 代理访问边界
  - H2: 活动面过滤
  - H2: 网关认证面诊断
  - H2: 入门参考预检
  - H2: SecretRef 合约
  - H2: 提供方配置
  - H2: 基于文件的 API 密钥
  - H2: Exec 集成示例
  - H2: MCP 服务器环境变量
  - H2: 沙箱 SSH 认证材料
  - H2: 支持的凭据面
  - H2: 必需行为与优先级
  - H2: 激活触发条件
  - H2: 降级与恢复信号
  - H2: 命令路径解析
  - H2: 审计与配置工作流
  - H2: 单向安全策略
  - H2: 旧版认证兼容性说明
  - H2: Web UI 说明
  - H2: 相关内容

## gateway/security/audit-checks.md

- 路由：/gateway/security/audit-checks
- 标题：
  - H2：相关

## gateway/security/dependency-locking.md

- Route: /gateway/security/dependency-locking
- Headings:
  - H2: Published package behavior
  - H2: Validate npm dependency graphs
  - H2: Inspect a plugin tarball

## gateway/security/exposure-runbook.md

- 路由：/gateway/security/exposure-runbook
- 标题：
  - H2：选择暴露模式
  - H2：预检清单
  - H2：基线检查
  - H2：最低安全基线
  - H2：DM 和群组暴露
  - H2：反向代理检查
  - H2：工具和沙箱审查
  - H2：变更后验证
  - H2：回滚计划
  - H2：审查清单

## gateway/security/index.md

- Route: /gateway/security
- Headings:
  - H2: Scope: personal assistant security model
  - H2: openclaw security audit
  - H3: What the audit checks (high level)
  - H3: Priority order when triaging findings
  - H2: Hardened baseline in 60 seconds
  - H3: Requester-scoped controls and prompt context
  - H2: Trust boundary matrix
  - H2: Not vulnerabilities by design
  - H2: Gateway and node trust
  - H2: Threat model
  - H2: DM access: pairing, allowlist, open, disabled
  - H3: Allowlists (two layers)
  - H3: DM session isolation (multi-user mode)
  - H2: Context visibility vs trigger authorization
  - H2: Prompt injection
  - H3: External content and untrusted-input wrapping
  - H3: Bypass flags (keep off in production)
  - H3: Reasoning and verbose output in groups
  - H2: Command authorization
  - H2: Control plane tools
  - H2: Node execution (system.run)
  - H2: Dynamic skills (watcher / remote nodes)
  - H2: Plugins
  - H2: Sandboxing
  - H3: Sub-agent delegation guardrail
  - H3: Read-only mode
  - H2: Per-agent access profiles (multi-agent)
  - H3: Full access (no sandbox)
  - H3: Read-only tools + read-only workspace
  - H3: No filesystem/shell access (provider messaging allowed)
  - H2: Browser control risks
  - H3: Browser SSRF policy (strict by default)
  - H2: Network exposure
  - H3: Bind, port, firewall
  - H3: Docker port publishing with UFW
  - H3: mDNS/Bonjour discovery
  - H3: Gateway WebSocket auth
  - H3: Tailscale Serve identity headers
  - H3: Reverse proxy configuration
  - H3: HSTS and origin notes
  - H3: Control UI over HTTP
  - H3: Insecure/dangerous flags
  - H2: Deployment and host trust
  - H2: Secrets on disk
  - H3: Credential storage map
  - H3: File permissions
  - H3: Workspace .env files
  - H3: Logs and transcripts
  - H2: Secure baseline (copy/paste)
  - H3: Separate numbers (WhatsApp, Signal, Telegram)
  - H2: Incident response
  - H3: Contain
  - H3: Rotate (assume compromise if secrets leaked)
  - H3: Audit
  - H3: Collect for a report
  - H2: Secret scanning
  - H2: Reporting security issues

## gateway/security/rate-limiting.md

- Route: /gateway/security/rate-limiting
- Headings:
  - H2: Authentication attempts (pre-auth)
  - H3: Browser-origin connections
  - H3: Webhooks
  - H2: Control-plane writes (post-auth backstop)
  - H2: ACP session creation
  - H2: Restart cooldown
  - H2: Operational notes

## gateway/security/secure-file-operations.md

- Route: /gateway/security/secure-file-operations
- Headings:
  - H2: Default: JavaScript fallback
  - H2: What stays protected without native acceleration
  - H2: What native acceleration adds
  - H2: Plugin and core guidance

## gateway/tailscale.md

- 路由：/gateway/tailscale
- 标题：
  - H2：模式
  - H2：配置示例
  - H3：仅 Tailnet（Serve）
  - H3：仅 Tailnet（绑定到 Tailnet IP）
  - H3：公网（Funnel + 共享密码）
  - H2：CLI 示例
  - H2：认证
  - H3：Tailscale 身份头（仅 Serve）
  - H2：注意事项
  - H3：Tailscale 前置条件和限制
  - H2：浏览器控制（远程 Gateway + 本地浏览器）
  - H2：了解更多
  - H2：相关内容

## gateway/tools-invoke-http-api.md

- 路由：/gateway/tools-invoke-http-api
- 标题：
  - H2：认证
  - H2：安全边界（重要）
  - H2：请求体
  - H2：策略 + 路由行为
  - H2：响应
  - H2：示例
  - H2：相关

## gateway/troubleshooting.md

- 路由：/gateway/troubleshooting
- 标题：
  - H2：命令阶梯
  - H2：更新后
  - H2：分裂大脑安装与较新配置保护
  - H2：回滚后的协议不匹配
  - H2：技能符号链接因路径逃逸而被跳过
  - H2：Anthropic 429 长上下文需要额外使用量
  - H2：上游 403 阻止响应
  - H2：本地 OpenAI 兼容后端通过直接探测但代理运行失败
  - H2：没有回复
  - H2：仪表板控制 UI 连接
  - H3：认证详细代码速查表
  - H2：网关服务未运行
  - H2：macOS 网关无声地停止响应，然后在你触摸仪表板时恢复
  - H2：macOS launchd 监督循环，存在重复的 gateway/node LaunchAgents
  - H2：网关在高内存使用期间退出
  - H2：网关拒绝了无效配置
  - H2：网关探测警告
  - H2：通道已连接，消息未流动
  - H2：Cron 和心跳投递
  - H2：节点已配对，工具失败
  - H2：浏览器工具失败
  - H2：如果你升级后某些东西突然坏了
  - H2：相关

## gateway/trusted-proxy-auth.md

- Route: /gateway/trusted-proxy-auth
- Headings:
  - H2: When to use
  - H2: When NOT to use
  - H2: How it works
  - H2: Configuration
  - H3: Configuration reference
  - H2: Automatic device approval
  - H2: Control UI pairing behavior
  - H2: Operator scopes header
  - H2: TLS termination and HSTS
  - H3: Rollout guidance
  - H2: Proxy setup examples
  - H2: Mixed token configuration
  - H2: Security checklist
  - H2: Security audit
  - H2: Troubleshooting
  - H2: Migration from token auth
  - H2: Related

## help/debugging.md

- 路由：/help/debugging
- 标题：
  - H2：运行时调试覆盖
  - H2：会话跟踪输出
  - H2：插件生命周期跟踪
  - H2：CLI 启动和命令性能分析
  - H2：网关监视模式
  - H2：开发配置文件 + 开发网关（--dev）
  - H2：原始流日志
  - H2：安全说明
  - H2：在 VSCode 中调试
  - H3：设置
  - H3：说明
  - H2：相关内容

## help/environment.md

- Route: /help/environment
- Headings:
  - H2: Precedence (highest to lowest)
  - H2: Supported operator-facing variables
  - H3: Paths and instances
  - H3: Gateway and authentication
  - H3: Provider credentials
  - H3: Logging and diagnostics
  - H3: Feature and runtime toggles
  - H2: Provider credentials and workspace .env
  - H2: Config env block
  - H2: Shell env import
  - H2: Exec shell snapshots
  - H2: Runtime-injected env vars
  - H2: UI env vars
  - H2: Env var substitution in config
  - H2: Secret refs vs ${ENV} strings
  - H2: Path-related env vars
  - H2: Agent helper tool downloads
  - H2: Logging
  - H3: `OPENCLAW_HOME`
  - H2: nvm users: webfetch TLS failures
  - H2: Legacy environment variables
  - H2: Related

## help/faq-first-run.md

- 路由：/help/faq-first-run
- 标题：
  - H2：快速开始和首次运行设置
  - H2：相关内容

## help/faq-models.md

- 路由：/help/faq-models
- 标题：
  - H2：模型：默认值、选择、别名、切换
  - H2：模型故障转移和“所有模型均失败”
  - H2：认证配置文件：它们是什么以及如何管理它们
  - H2：相关内容

## help/faq.md

- 路由: /help/faq
- 标题:
  - H2: 出现问题时的前 60 秒
  - H2: 快速开始与首次运行设置
  - H2: 什么是 OpenClaw？
  - H2: 技能与自动化
  - H2: 沙箱与内存
  - H2: 文件在磁盘上的存放位置
  - H2: 配置基础
  - H2: 远程网关与节点
  - H2: 环境变量与 .env 加载
  - H2: 会话与多轮聊天
  - H2: 模型、故障转移与认证配置文件
  - H2: 网关：端口、“已在运行”以及远程模式
  - H2: 日志与调试
  - H2: 媒体与附件
  - H2: 安全与访问控制
  - H2: 聊天命令、中止任务，以及“它就是不停”
  - H2: 其他
  - H2: 相关

## help/index.md

- 路由：/help
- 标题：
  - H2: 常见问题
  - H2: 诊断
  - H2: 测试
  - H2: 社区与元信息

## help/scripts.md

- 路由: /help/scripts
- 标题:
  - H2: 约定
  - H2: 认证监控脚本
  - H2: GitHub 读取辅助工具
  - H2: 添加脚本时
  - H2: 相关内容

## help/testing-live.md

- Route: /help/testing-live
- Headings:
  - H2: Live tests vs your real gateway
  - H2: Live: local smoke commands
  - H2: Live: Android node capability sweep
  - H2: Live: model smoke (profile keys)
  - H3: Layer 1: Direct model completion (no gateway)
  - H3: Layer 2: Gateway + dev agent smoke (what "@openclaw" actually does)
  - H2: Live: CLI backend smoke (Claude, Gemini, or other local CLIs)
  - H2: Live: APNs HTTP/2 proxy reachability
  - H2: Live: ACP bind smoke (/acp spawn ... --bind here)
  - H2: Live: Codex app-server harness smoke
  - H2: Live: OpenAI repeated compaction
  - H3: Recommended live recipes
  - H2: Live: model matrix (what we cover)
  - H3: Aggregators / alternate gateways
  - H2: Credentials (never commit)
  - H2: Deepgram live (audio transcription)
  - H2: BytePlus coding plan live
  - H2: ComfyUI workflow media live
  - H2: Image generation live
  - H2: Music generation live
  - H2: Video generation live
  - H2: Media live harness
  - H2: Related

## help/testing-updates-plugins.md

- 路由: /help/testing-updates-plugins
- 标题:
  - H2: 我们保护什么
  - H2: 开发期间的本地证明
  - H2: Docker 线路
  - H2: 包接受
  - H2: 发布默认
  - H2: 旧版兼容性
  - H2: 添加覆盖
  - H2: 失败排查

## help/testing.md

- 路由: /help/testing
- 标题:
  - H2: 快速开始
  - H2: 测试临时目录
  - H2: 实时和 Docker/Parallels 工作流
  - H2: QA 专用运行器
  - H3: 通过 Convex 共享 Telegram 凭证（v1）
  - H3: 为 QA 添加频道
  - H2: 测试套件（各自运行位置）
  - H3: 单元 / 集成（默认）
  - H3: 稳定性（网关）
  - H3: E2E（仓库聚合）
  - H3: E2E（网关冒烟）
  - H3: E2E（Control UI 模拟浏览器）
  - H3: E2E：OpenShell 后端冒烟
  - H3: 实时（真实提供商 + 真实模型）
  - H2: 我应该运行哪个套件？
  - H2: 实时（网络访问）测试
  - H2: Docker 运行器（可选的“在 Linux 上可用”检查）
  - H2: 文档健全性检查
  - H2: 离线回归（CI 安全）
  - H2: 代理可靠性评估（skills）
  - H2: 契约测试（插件和通道形态）
  - H3: 命令
  - H3: 通道契约
  - H3: 提供商契约
  - H3: 何时运行
  - H2: 添加回归（指南）
  - H2: 相关内容

## help/troubleshooting.md

- 路由：/help/troubleshooting
- 标题：
  - H2: 前 60 秒
  - H2: 助手感觉受限或缺少工具
  - H2: Anthropic 长上下文 429
  - H2: 本地 OpenAI 兼容后端可直接工作，但在 OpenClaw 中失败
  - H2: 插件安装因缺少 openclaw 扩展而失败
  - H2: 安装策略阻止插件安装或更新
  - H2: 插件已存在，但因可疑所有权而被阻止
  - H2: 决策树
  - H2: 相关

## index.md

- 路由：/
- 标题：
  - H1: OpenClaw 🦞
  - H2: 浏览文档
  - H2: 什么是 OpenClaw？
  - H2: 它是如何工作的
  - H2: 主要功能
  - H2: 快速开始
  - H2: 仪表板
  - H2: 配置（可选）
  - H2: 从这里开始
  - H2: 了解更多

## install/ansible.md

- 路由：/install/ansible
- 标题：
  - H2：先决条件
  - H2：你将获得什么
  - H2：快速开始
  - H2：将安装哪些内容
  - H2：安装后设置
  - H3：快速命令
  - H2：安全架构
  - H2：手动安装
  - H2：更新
  - H2：故障排除
  - H2：高级配置
  - H2：相关内容

## install/azure.md

- 路由: /install/azure
- 标题:
  - H2: 你将要做什么
  - H2: 你需要什么
  - H2: 配置部署
  - H2: 部署 Azure 资源
  - H2: 安装 OpenClaw
  - H2: 成本考虑
  - H2: 清理
  - H2: 下一步
  - H2: 相关内容

## install/bun.md

- 路由: /install/bun
- 标题:
  - H2: 安装
  - H2: 生命周期脚本
  - H2: 注意事项
  - H2: 相关内容

## install/clawdock.md

- 路由：/install/clawdock
- 标题：
  - H2：安装
  - H2：你将获得什么
  - H3：基本操作
  - H3：容器访问
  - H3：Web UI 和配对
  - H3：设置与维护
  - H3：实用工具
  - H2：首次使用流程
  - H2：配置和密钥
  - H2：相关内容

## install/development-channels.md

- 路由：/install/development-channels
- 标题：
  - H2：切换通道
  - H2：一次性版本或标签目标
  - H2：试运行
  - H2：插件和通道
  - H2：检查当前状态
  - H2：标签最佳实践
  - H2：macOS 应用可用性
  - H2：相关内容

## install/digitalocean.md

- 路由: /install/digitalocean
- 标题:
  - H2: 前置条件
  - H2: 设置
  - H2: 持久化和备份
  - H2: 1 GB 内存提示
  - H2: 故障排查
  - H2: 下一步
  - H2: 相关内容

## install/docker-vm-runtime.md

- 路由：/install/docker-vm-runtime
- 标题：
  - H2：将所需二进制文件烘焙进镜像
  - H2：构建并启动
  - H2：哪些内容保留在哪里
  - H2：更新
  - H2：相关内容

## install/docker.md

- 路由: /install/docker
- 标题：
  - H2: 前提条件
  - H2: 容器化网关
  - H3: 手动流程
  - H3: 升级容器镜像
  - H3: 环境变量
  - H3: 带有选定插件的源码构建镜像
  - H3: 可观测性
  - H3: 健康检查
  - H3: 局域网 vs 回环
  - H3: 主机本地提供方
  - H3: Docker 中的 Claude CLI 后端
  - H3: Bonjour / mDNS
  - H3: 存储与持久化
  - H3: Shell 辅助工具（可选）
  - H3: 在 VPS 上运行？
  - H2: Agent 沙箱
  - H3: 快速启用
  - H2: 故障排除
  - H2: 相关内容

## install/exe-dev.md

- 路由：/install/exe-dev
- 标题：
  - H2: 你需要什么
  - H2: 初学者快速路径
  - H2: 使用 Shelley 自动安装
  - H2: 手动安装
  - H2: 远程通道设置
  - H2: 远程访问
  - H2: 更新
  - H2: 相关内容

## install/fly.md

- 路由：/install/fly
- 标题：
  - H2：你需要什么
  - H2：新手快速路径
  - H2：故障排查
  - H3：“应用未在预期地址上监听”
  - H3：健康检查失败 / 连接被拒绝
  - H3：OOM / 内存问题
  - H3：网关锁问题
  - H3：配置未被读取
  - H3：通过 SSH 写入配置
  - H3：状态未持久化
  - H2：更新
  - H3：更新 machine 命令
  - H2：私有部署（加固版）
  - H3：何时使用私有部署
  - H3：设置
  - H3：访问私有部署
  - H3：与私有部署一起使用 Webhook
  - H3：安全权衡
  - H2：说明
  - H2：成本
  - H2：后续步骤
  - H2：相关内容

## install/gcp.md

- 路由: /install/gcp
- 标题:
  - H2: 你需要什么
  - H2: 快速路径
  - H2: 故障排除
  - H2: 服务账户（安全最佳实践）
  - H2: 下一步
  - H2: 相关内容

## install/hetzner.md

- 路由: /install/hetzner
- 标题:
  - H2: 你需要什么
  - H2: 快速路径
  - H2: 基础设施即代码（Terraform）
  - H2: 下一步
  - H2: 相关内容

## install/hostinger.md

- 路由: /install/hostinger
- 标题:
  - H2: 先决条件
  - H2: 选项 A：一键安装 OpenClaw
  - H2: 选项 B：在 VPS 上安装 OpenClaw
  - H2: 验证你的设置
  - H2: 故障排除
  - H2: 下一步
  - H2: 相关内容

## install/index.md

- 路由：/install
- 标题：
  - H2: 系统要求
  - H2: 推荐：安装脚本
  - H2: 其他安装方法
  - H3: 本地前缀安装程序（install-cli.sh）
  - H3: npm、pnpm 或 bun
  - H3: 从源码安装
  - H3: 从 GitHub 主分支检出版本安装
  - H3: 容器和包管理器
  - H2: 验证安装
  - H2: 托管与部署
  - H2: 更新、迁移或卸载
  - H2: 故障排查：未找到 openclaw

## install/installer.md

- 路由: /install/installer
- 标题:
  - H2: 快速命令
  - H2: install.sh
  - H3: 流程 (install.sh)
  - H3: 源代码检出检测
  - H3: 示例 (install.sh)
  - H2: install-cli.sh
  - H3: 流程 (install-cli.sh)
  - H3: 示例 (install-cli.sh)
  - H2: install.ps1
  - H3: 流程 (install.ps1)
  - H3: 示例 (install.ps1)
  - H2: CI 和自动化
  - H2: 故障排查
  - H2: 相关内容

## install/kubernetes.md

- 路由：/install/kubernetes
- 标题：
  - H2: 为什么不用 Helm
  - H2: 你需要什么
  - H2: 快速开始
  - H2: 使用 Kind 进行本地测试
  - H2: 分步说明
  - H3: 1) 部署
  - H3: 2) 访问网关
  - H2: 部署了什么
  - H2: 自定义
  - H3: Agent 指令
  - H3: 网关配置
  - H3: 添加提供方
  - H3: 自定义命名空间
  - H3: 自定义镜像
  - H3: 将端口转发之外的服务暴露出去
  - H2: 重新部署
  - H2: 卸载
  - H2: 架构说明
  - H2: 文件结构
  - H2: 相关内容

## install/macos-vm.md

- 路由：/install/macos-vm
- 标题：
  - H2: 推荐默认方案（大多数用户）
  - H2: macOS 虚拟机选项
  - H3: 在你的 Apple Silicon Mac 上运行本地 VM（Lume）
  - H3: 托管 Mac 提供商（云）
  - H2: 快速路径（Lume，适合有经验的用户）
  - H2: 你需要什么（Lume）
  - H2: 1）安装 Lume
  - H2: 2）创建 macOS 虚拟机
  - H2: 3）完成设置助理
  - H2: 4）获取 VM 的 IP 地址
  - H2: 5）通过 SSH 连接到 VM
  - H2: 6）安装 OpenClaw
  - H2: 7）配置频道
  - H2: 8）无头运行 VM
  - H2: 额外：iMessage 集成
  - H2: 保存黄金镜像
  - H2: 24/7 运行
  - H2: 故障排除
  - H2: 相关文档

## install/migrating-claude.md

- 路由：/install/migrating-claude
- 标题：
  - H2：导入的两种方式
  - H2：会导入什么
  - H2：仅存档的内容
  - H2：来源选择
  - H2：推荐流程
  - H2：冲突处理
  - H2：用于自动化的 JSON 输出
  - H2：故障排除
  - H2：相关内容

## install/migrating-hermes.md

- 路由：/install/migrating-hermes
- 标题：
  - H2: 两种导入方式
  - H2: 会导入什么
  - H2: 仅存档的内容
  - H2: 推荐流程
  - H2: 冲突处理
  - H2: 密钥
  - H2: 面向自动化的 JSON 输出
  - H2: 故障排除
  - H2: 相关内容

## install/migrating.md

- 路由：/install/migrating
- 标题：
  - H2: 从另一个代理系统导入
  - H2: 将 OpenClaw 迁移到新机器
  - H3: 迁移步骤
  - H3: 常见陷阱
  - H3: 验证清单
  - H2: 原地升级插件
  - H2: 相关内容

## install/nix.md

- 路由：/install/nix
- 标题：
  - H2: 你将获得什么
  - H2: 快速开始
  - H2: Nix 模式运行时行为
  - H3: Nix 模式下的变化
  - H3: 配置和状态路径
  - H3: 服务 PATH 发现
  - H2: 相关内容

## install/node.md

- 路由：/install/node
- 标题：
  - H2：检查你的版本
  - H2：安装 Node
  - H3：故障排除
  - H3：openclaw：命令未找到
  - H3：在 npm install -g 时的权限错误（Linux）
  - H2：相关内容

## install/northflank.mdx

- 路由: /install/northflank
- 标题:
  - H2: 如何开始
  - H2: 你将获得什么
  - H2: 连接频道
  - H2: 下一步

## install/oracle.md

- 路由: /install/oracle
- 标题:
  - H2: 前置条件
  - H2: 设置
  - H2: 验证安全状态
  - H2: ARM 说明
  - H2: 持久性和备份
  - H2: 备用方案：SSH 隧道
  - H2: 故障排除
  - H2: 下一步
  - H2: 相关内容

## install/podman.md

- 路由: /install/podman
- 标题:
  - H2: 先决条件
  - H2: 快速开始
  - H2: Podman 和 Tailscale
  - H2: Systemd（Quadlet，可选）
  - H2: 配置、环境变量和存储
  - H2: 升级镜像
  - H2: 常用命令
  - H2: 故障排查
  - H2: 相关内容

## install/railway.mdx

- 路由：/install/railway
- 标题：
  - H2: 一键部署
  - H2: 你将获得什么
  - H2: 连接一个频道
  - H2: 备份和迁移
  - H2: 下一步

## install/raspberry-pi.md

- 路由：/install/raspberry-pi
- 标题：
  - H2：硬件兼容性
  - H2：前提条件
  - H2：设置
  - H2：性能提示
  - H2：推荐机型设置
  - H2：ARM 二进制文件说明
  - H2：持久化与备份
  - H2：故障排除
  - H2：下一步
  - H2：相关内容

## install/render.mdx

- 路由：/install/render
- 标题：
  - H2：先决条件
  - H2：部署
  - H2：蓝图
  - H2：选择方案
  - H2：部署后
  - H3：访问控制 UI
  - H3：日志
  - H3：Shell 访问
  - H3：环境变量
  - H3：自动部署
  - H2：自定义域名
  - H2：扩容
  - H2：备份与迁移
  - H2：故障排查
  - H3：服务无法启动
  - H3：冷启动缓慢（免费套餐）
  - H3：重新部署后数据丢失
  - H3：健康检查失败
  - H2：下一步

## install/uninstall.md

- 路由：/install/uninstall
- 标题：
  - H2：简单方法（CLI 仍然安装着）
  - H2：手动移除服务（CLI 未安装）
  - H3：macOS（launchd）
  - H3：Linux（systemd 用户单元）
  - H3：Windows（计划任务）
  - H2：普通安装 vs 源码检出
  - H3：普通安装（install.sh / npm / pnpm / bun）
  - H3：源码检出（git clone）
  - H2：相关

## install/updating.md

- Route: /install/updating
- Headings:
  - H2: Recommended: openclaw update
  - H2: Switch between npm and git installs
  - H2: Source-checkout servers (reference script)
  - H2: Alternative: re-run the installer
  - H2: Alternative: manual npm, pnpm, or bun
  - H3: Advanced npm install topics
  - H2: Auto-updater
  - H2: After updating
  - H3: Run doctor
  - H3: Restart the gateway
  - H3: Verify
  - H2: Rollback
  - H3: Before updating: create a verified backup
  - H3: Roll back a package install
  - H3: Roll back a source checkout
  - H3: Downgrading across the session SQLite migration
  - H3: Restore state only when necessary
  - H3: Verify the rollback
  - H2: If you are stuck
  - H2: Related

## install/upstash.md

- 路由：/install/upstash
- 标题：
  - H2：先决条件
  - H2：创建一个 Box
  - H2：通过 SSH 隧道连接
  - H2：安装 OpenClaw
  - H2：运行 onboarding
  - H2：启动网关
  - H2：自动重启
  - H2：故障排除
  - H2：相关内容

## logging.md

- 路由：/logging
- 标题：
  - H2：日志存放位置
  - H2：如何读取日志
  - H3：CLI：实时尾随查看（推荐）
  - H3：控制 UI（网页）
  - H3：仅频道日志
  - H2：日志格式
  - H3：文件日志（JSONL）
  - H3：控制台输出
  - H3：网关 WebSocket 日志
  - H2：配置日志
  - H3：日志级别
  - H3：定向模型传输诊断
  - H3：追踪关联
  - H3：模型调用大小和耗时
  - H3：控制台样式
  - H3：脱敏
  - H2：诊断和 OpenTelemetry
  - H2：故障排查提示
  - H2：相关内容

## maturity/scorecard.md

- 路由：/maturity/scorecard
- 标题：
  - H1：成熟度评分卡
  - H2：此页面的用途
  - H2：一览
  - H2：分数区间
  - H2：表面探索器
  - H2：QA 证据摘要
  - H3：按区域划分的就绪情况

## maturity/taxonomy.md

- 路由：/maturity/taxonomy
- 标题：
  - H1：成熟度分类
  - H2：如何阅读此页面
  - H2：成熟度级别
  - H2：产品领域
  - H2：详细信息
  - H3：核心
  - H3：平台
  - H3：渠道
  - H3：提供商和工具

## network.md

- 路由：/network
- 标题：
  - H2：核心模型
  - H2：配对 + 身份
  - H2：发现 + 传输
  - H2：节点 + 传输
  - H2：安全
  - H2：相关内容

## nodes/audio.md

- Route: /nodes/audio
- Headings:
  - H2: What it does
  - H2: Auto-detection (default)
  - H2: Config examples
  - H3: Provider + CLI fallback (OpenAI + Whisper CLI)
  - H3: Provider-only (Deepgram)
  - H3: Provider-only (Mistral Voxtral)
  - H3: Provider-only (SenseAudio)
  - H3: Echo transcript to chat (opt-in)
  - H2: Notes and limits
  - H3: Resident local STT
  - H3: Proxy environment support
  - H2: Mention detection in groups
  - H2: Gotchas
  - H2: Related

## nodes/camera.md

- Route: /nodes/camera
- Titles:
  - H2: iOS Node
  - H3: iOS User Settings
  - H3: iOS Commands (via Gateway node.invoke)
  - H3: iOS Foreground Requirements
  - H3: CLI Helper Tool
  - H2: Android Node
  - H3: Android User Settings
  - H3: Permissions
  - H3: Android foreground requirement
  - H3: Android commands (via Gateway node.invoke)
  - H2: macOS app
  - H3: macOS user setting
  - H3: CLI helper (node invoke)
  - H2: Linux node host
  - H2: Safety + practical limits
  - H2: macOS screen video (OS-level)
  - H2: Related

## nodes/computer-use.md

- Route: /nodes/computer-use
- Headings:
  - H2: Requirements
  - H2: The computer agent tool
  - H2: Windows and Linux (experimental, via cua-driver)
  - H3: Troubleshooting
  - H2: The computer.act node command
  - H2: Authorization
  - H2: Safety
  - H2: macOS permission troubleshooting
  - H2: Relationship to other desktop-control paths

## nodes/images.md

- 路由：/nodes/images
- 标题：
  - H2：目标
  - H2：CLI 接口
  - H2：WhatsApp Web 渠道行为
  - H2：自动回复流水线
  - H2：入站媒体到命令
  - H2：限制和错误
  - H2：测试说明
  - H2：相关内容

## nodes/index.md

- Route: /nodes
- Headings:
  - H2: Pairing + status
  - H2: Version skew and upgrade order
  - H2: Remote node host (system.run)
  - H3: Start a node host (foreground)
  - H3: Remote gateway via SSH tunnel (loopback bind)
  - H3: Start a node host (service)
  - H3: Pair + name
  - H3: Node-hosted MCP servers
  - H3: Node-hosted skills
  - H3: Headless identity state
  - H3: Allowlist the commands
  - H3: Point exec at the node
  - H3: Local model inference
  - H3: Codex sessions and transcripts
  - H3: Claude sessions and transcripts
  - H3: OpenCode and Pi sessions
  - H3: Terminal file uploads
  - H2: Invoking commands
  - H2: Command policy
  - H2: Config (openclaw.json)
  - H2: Screenshots (canvas snapshots)
  - H3: Canvas controls
  - H3: A2UI (Canvas)
  - H2: Photos + videos (node camera)
  - H2: Screen recordings (nodes)
  - H2: Location (nodes)
  - H2: SMS (Android nodes)
  - H2: Device and personal data commands
  - H2: System commands (node host / mac node)
  - H2: Exec node binding
  - H2: Permissions map
  - H2: Headless node host (cross-platform)
  - H2: Mac node mode

## nodes/location-command.md

- 路由: /nodes/location-command
- 标题:
  - H2: TL;DR
  - H2: Why a selector (not just a switch)
  - H2: Settings model
  - H2: Permissions mapping (node.permissions)
  - H2: Command: location.get
  - H2: Background behavior
  - H2: Linux node host
  - H2: Model/tooling integration
  - H2: UX copy (suggested)
  - H2: Related

## nodes/media-understanding.md

- 路由: /nodes/media-understanding
- 标题:
  - 二级标题: 工作原理
  - 二级标题: 配置
  - 三级标题: 模型条目
  - 三级标题: 提供方凭据
  - 二级标题: 规则和行为
  - 三级标题: 自动检测（默认）
  - 三级标题: 代理支持（音频/视频提供方调用）
  - 二级标题: 能力
  - 二级标题: 提供方支持矩阵
  - 二级标题: 模型选择指南
  - 二级标题: 附件策略
  - 三级标题: 文件附件提取
  - 二级标题: 配置示例
  - 二级标题: 状态输出
  - 二级标题: 备注
  - 二级标题: 相关内容

## nodes/presence.md

- 路由：/nodes/presence
- 标题：
  - H2：需求
  - H2：检查当前活动的电脑
  - H2：活动如何转化为在线状态
  - H2：隐私与模型上下文
  - H2：连接提醒如何路由
  - H2：故障排除
  - H2：相关内容

## nodes/talk.md

- Route: /nodes/talk
- Headings:
  - H2: Behavior (macOS)
  - H2: Voice directives in replies
  - H2: Config (`~/.openclaw/openclaw.json`)
  - H2: macOS UI
  - H2: Android UI
  - H2: Notes
  - H2: Related

## nodes/troubleshooting.md

- 路由：/nodes/troubleshooting
- 标题：
  - H2: 命令阶梯
  - H2: 前台要求
  - H2: 权限矩阵
  - H2: 配对与审批
  - H2: 常见节点错误代码
  - H2: 快速恢复循环
  - H2: 相关内容

## nodes/voicewake.md

- 路由：/nodes/voicewake
- 标题：
  - H2：存储
  - H2：协议
  - H3：触发列表
  - H3：路由（触发到目标）
  - H3：事件
  - H2：客户端行为
  - H2：相关

## openclaw-agent-runtime.md

- 路由：/openclaw-agent-runtime
- 标题：
  - H2：类型检查和代码检查
  - H2：运行 Agent Runtime 测试
  - H2：手动测试
  - H2：清空状态重置
  - H2：参考
  - H2：相关

## perplexity.md

- 路由：/perplexity
- 标题：
  - H2：相关

## plan/cloud-workers.md

- 路由：/plan/cloud-workers
- 标题：
  - H2：状态
  - H2：问题
  - H2：目标
  - H2：非目标（v1）
  - H2：前人做法（我们复制什么，我们反转什么）
  - H2：架构决策：在 worker 上循环，推理通过网关
  - H2：组件
  - H3：1. 环境状态机 + 提供者契约
  - H3：2. Worker 引导：在机器上安装 OpenClaw
  - H3：3. 传输：全部通过 SSH
  - H3：4. Worker 协议（专用；不是 node 协议）
  - H3：5. 会话后端 RPC
  - H3：6. 工作区同步
  - H3：7. 放置状态机、会话和 UI
  - H2：调度与交接
  - H2：安全模型
  - H2：容量
  - H2：生命周期
  - H2：配置面
  - H2：里程碑
  - H2：未决问题

## plan/path3-sqlite-session-artifact-family.md

- 路由: /plan/path3-sqlite-session-artifact-family
- 标题:
  - H1: 路径 3 SQLite 会话工件家族
  - H2: 权威家族
  - H2: 翻转后的非家族工件
  - H2: 补丁点
  - H2: 定向测试

## plan/swarms.md

- Route: /plan/swarms
- Headings:
  - H1: Swarms — agent fan-out and orchestration in code mode
  - H2: 1. What and why
  - H2: 2. Decisions (maintainer, 2026-07-17)
  - H2: 3. Architecture overview
  - H2: 4. Config gate (v1)
  - H2: 5. Core: collector-mode spawn + `agents_wait` (v1)
  - H3: 5.1 `sessions_spawn` additions (all gated on swarm enabled)
  - H3: 5.2 Approvals fail-closed
  - H3: 5.3 `agents_wait` tool (new, gated)
  - H3: 5.4 Caps enforcement
  - H2: 6. Testing contract (v1, lane A)
  - H2: 7. QuickJS guest surface (lane B, after core)
  - H2: 8. Codex harness projection (later lane)
  - H2: 9. Persistence and retention
  - H2: 10. Progress surface ("the dots") — later lane
  - H2: 11. Labs page (Control UI, independent lane)
  - H2: 12. Placement (later)
  - H2: 13. Non-goals
  - H2: 14. Build phases / PR slicing

## plan/ui-channels.md

- 路由：/plan/ui-channels
- 标题：
  - H2：状态
  - H2：问题
  - H2：目标
  - H2：非目标
  - H2：目标模型
  - H2：交付元数据
  - H2：运行时能力契约
  - H2：通道映射
  - H2：重构步骤
  - H2：测试
  - H2：未决问题
  - H2：相关

## platforms/android.md

- Route: /platforms/android
- Headings:
  - H2: Support snapshot
  - H2: Simultaneous gateway sessions
  - H2: Wear OS companion
  - H2: Install outside Google Play
  - H2: Mirror and control Android from a remote Mac
  - H3: Before you begin
  - H3: Enable ADB over TCP
  - H3: Allow only the controller Mac
  - H3: Connect and start mirroring
  - H3: Troubleshooting
  - H2: Connection runbook
  - H3: Prerequisites
  - H3: 1. Start the Gateway
  - H3: 2. Verify discovery (optional)
  - H4: Cross-network discovery via unicast DNS-SD
  - H3: 3. Connect from Android
  - H3: Manage paired gateways
  - H3: Presence alive beacons
  - H3: 4. Approve pairing (CLI)
  - H3: 5. Verify the node is connected
  - H3: 6. Chat + history
  - H3: 7. Canvas + camera
  - H4: Gateway Canvas Host (recommended for web content)
  - H3: 8. Voice + expanded Android command surface
  - H3: 9. Workspace files (read-only)
  - H2: Review command approvals
  - H2: Answer agent questions
  - H2: Assistant entrypoints
  - H2: Notification forwarding
  - H2: Related

## platforms/digitalocean.md

- 路由：/platforms/digitalocean
- 标题：
  - H2：相关内容

## platforms/easyrunner.md

- 路由：/platforms/easyrunner
- 标题：
  - H2：开始之前
  - H2：Compose 应用
  - H2：配置 OpenClaw
  - H2：验证
  - H2：更新和备份
  - H2：故障排除

## platforms/index.md

- 路由：/platforms
- 标题：
  - H2：选择你的操作系统
  - H2：VPS 和托管
  - H2：常用链接
  - H2：网关服务安装（CLI）
  - H2：相关内容

## platforms/ios-healthkit.md

- Route: /platforms/ios-healthkit
- Headings:
  - H1: HealthKit summaries
  - H2: Requirements
  - H2: Enable access
  - H3: 1. Authorize the Gateway command
  - H3: 2. Enable sharing on the iOS device
  - H2: Request today's summary
  - H2: Privacy behavior
  - H2: Troubleshooting
  - H3: Command is not declared by the node
  - H3: Command requires explicit opt-in
  - H3: `HEALTH_ACCESS_DISABLED`
  - H3: Summary succeeds but metrics are missing
  - H3: Older ranges fail
  - H2: Related

## platforms/ios.md

- Route: /platforms/ios
- Headings:
  - H2: What it does
  - H2: Requirements
  - H2: Quick start (pair + connect)
  - H2: Health summaries
  - H2: Review command approvals
  - H2: Answer agent questions
  - H2: Optional direct Apple Watch node
  - H2: Relay-backed push for official builds
  - H2: Background alive beacons
  - H2: Authentication and trust flow
  - H2: Discovery paths
  - H3: Bonjour (LAN)
  - H3: Tailnet (cross-network)
  - H3: Manual host/port
  - H2: Multiple gateways
  - H2: Canvas + A2UI
  - H2: 计算机使用关系
  - H3: Canvas 评估 / 快照
  - H2: 语音唤醒 + 对话模式
  - H2: 常见错误
  - H2: 相关文档

## platforms/linux.md

- Route: /platforms/linux
- Headings:
  - H2: Desktop companion
  - H3: Quick Chat
  - H3: Canvas
  - H2: CLI and SSH alternative
  - H2: Node capabilities
  - H2: Install
  - H2: Gateway service (systemd)
  - H2: Memory pressure and OOM kills
  - H2: Related

## platforms/mac/bundled-gateway.md

- 路由：/platforms/mac/bundled-gateway
- 标题：
  - H2：自动设置
  - H2：手动恢复
  - H2：Launchd（作为 LaunchAgent 的网关）
  - H2：版本兼容性
  - H2：macOS 上的状态目录
  - H2：调试应用连接
  - H2：冒烟检查
  - H2：相关内容

## platforms/mac/canvas.md

- 路由: /platforms/mac/canvas
- 标题:
  - H2: Canvas 的位置
  - H2: 面板行为
  - H2: Agent API 表面
  - H2: Canvas 中的 A2UI
  - H3: A2UI 命令（v0.8）
  - H2: 从 Canvas 触发 agent 运行
  - H2: 安全说明
  - H2: 相关内容

## platforms/mac/child-process.md

- 路由: /platforms/mac/child-process
- 标题:
  - H2: 默认行为（launchd）
  - H2: 未签名的开发构建
  - H2: 仅附加模式
  - H2: 远程模式
  - H2: 为什么我们更偏好 launchd
  - H2: 相关内容

## platforms/mac/dev-setup.md

- 路由：/platforms/mac/dev-setup
- 标题：
  - H1：macOS 开发者设置
  - H2：先决条件
  - H2：1. 安装依赖项
  - H2：2. 构建并打包应用
  - H2：3. 安装 CLI 和 Gateway
  - H2：故障排除
  - H3：构建失败：工具链或 SDK 不匹配
  - H3：授予权限后应用崩溃
  - H3：Gateway 一直显示“启动中...”
  - H2：相关内容

## platforms/mac/health.md

- 路由: /platforms/mac/health
- 标题:
  - H1: macOS 上的健康检查
  - H2: 菜单栏
  - H2: 设置
  - H2: 探针的工作原理
  - H2: 如有疑问
  - H2: 相关内容

## platforms/mac/icon.md

- 路由：/platforms/mac/icon
- 标题：
  - H1：菜单栏图标状态
  - H2：状态
  - H2：语音唤醒耳朵
  - H2：形状和尺寸
  - H2：行为说明
  - H2：相关内容

## platforms/mac/logging.md

- 路由：/platforms/mac/logging
- 标题：
  - H1：日志记录（macOS）
  - H2：滚动诊断文件日志（调试面板）
  - H2：macOS 上的统一日志私有数据
  - H2：为 OpenClaw（ai.openclaw）启用
  - H2：调试完成后禁用
  - H2：相关内容

## platforms/mac/menu-bar.md

- 路由：/platforms/mac/menu-bar
- 标题：
  - H2: 显示内容
  - H2: 状态模型
  - H2: IconState 枚举（Swift）
  - H3: ActivityKind -> 徽标符号
  - H3: 视觉映射
  - H2: 上下文子菜单
  - H2: 状态行文本（菜单）
  - H2: 事件摄取
  - H2: 调试覆盖
  - H2: 测试清单
  - H2: 相关内容

## platforms/mac/peekaboo.md

- 路由：/platforms/mac/peekaboo
- 标题：
  - H2：这是什么（以及不是什么）
  - H2：与其他桌面控制路径的关系
  - H2：启用桥接
  - H2：客户端发现顺序
  - H2：安全性和权限
  - H2：快照行为（自动化）
  - H2：故障排除
  - H2：相关

## platforms/mac/permissions.md

- Route: /platforms/mac/permissions
- Headings:
  - H2: Requirements for stable permissions
  - H2: Accessibility grants for Node and CLI runtimes
  - H2: Separate Computer Control grants
  - H2: Recovery checklist when prompts disappear
  - H2: Files and folders permissions (Desktop/Documents/Downloads)
  - H2: Related

## platforms/mac/remote.md

- 路由：/platforms/mac/remote
- 标题：
  - H2：模式
  - H2：远程传输
  - H2：远程主机上的前提条件
  - H2：macOS 应用设置
  - H2：Web 聊天
  - H2：权限
  - H2：安全说明
  - H2：WhatsApp 登录流程（远程）
  - H2：故障排除
  - H2：通知声音
  - H2：相关

## platforms/mac/signing.md

- 路由：/platforms/mac/signing
- 标题：
  - H1：mac 签名（调试构建）
  - H2：用法
  - H3：Ad-hoc 签名说明
  - H2：关于的构建元数据
  - H2：相关内容

## platforms/mac/skills.md

- 路由: /platforms/mac/skills
- 标题:
  - H2: 数据源
  - H2: 安装操作
  - H2: 环境/API 密钥
  - H2: 远程模式
  - H2: 相关内容

## platforms/mac/voice-overlay.md

- 路由：/platforms/mac/voice-overlay
- 标题：
  - H1：语音叠加层生命周期（macOS）
  - H2：行为
  - H2：实现
  - H2：日志记录
  - H2：调试检查清单
  - H2：相关内容

## platforms/mac/voicewake.md

- 路由：/platforms/mac/voicewake
- 标题：
  - H1: 语音唤醒与按住说话
  - H2: 要求
  - H2: 模式
  - H2: 运行时行为（唤醒词）
  - H2: 生命周期不变量
  - H2: 按住说话详情
  - H2: 面向用户的设置
  - H2: 转发行为
  - H2: 转发负载
  - H2: 快速验证
  - H2: 相关

## platforms/mac/webchat.md

- Route: /platforms/mac/webchat
- Headings:
  - H2: Multiple Gateway windows
  - H3: Gateway picker
  - H2: Quick Chat bar
  - H2: Launch and debugging
  - H2: How it is wired
  - H2: Security surface
  - H2: Known limitations
  - H2: Related

## platforms/mac/xpc.md

- 路由: /platforms/mac/xpc
- 标题:
  - H1: OpenClaw macOS IPC 架构
  - H2: 目标
  - H2: 工作原理
  - H3: 网关 + 节点传输
  - H3: 节点服务 + 应用 IPC
  - H3: PeekabooBridge（UI 自动化）
  - H2: 操作流程
  - H2: 加固说明
  - H2: 相关内容

## platforms/macos.md

- 路由：/platforms/macos
- 标题：
  - H2：下载
  - H2：首次运行
  - H2：更新
  - H2：打开仪表盘链接
  - H2：导入浏览器登录信息
  - H2：选择 Gateway 模式
  - H2：应用拥有的内容
  - H2：macOS 详情页
  - H2：相关内容

## platforms/oracle.md

- 路由：/platforms/oracle
- 标题：
  - H2：相关内容

## platforms/raspberry-pi.md

- 路由：/platforms/raspberry-pi
- 标题：
  - H2：相关内容

## platforms/windows.md

- 路由: /platforms/windows
- 标题:
  - H2: 推荐：Windows Hub
  - H3: Windows Hub 包含内容
  - H3: 首次启动
  - H2: Windows 节点模式
  - H2: 本地 MCP 模式
  - H2: 原生 Windows CLI 和 Gateway
  - H2: WSL2 Gateway
  - H2: 在 Windows 登录前自动启动 Gateway
  - H2: 通过局域网公开 WSL 服务
  - H2: 故障排除
  - H3: 托盘图标未显示
  - H3: 本地设置失败
  - H3: 应用提示需要配对
  - H3: Web 聊天无法连接到远程 Gateway
  - H3: screen.snapshot、camera 或 audio 命令失败
  - H3: Git 或 GitHub 连接失败
  - H2: 相关内容

## plugins/adding-capabilities.md

- 路由：/plugins/adding-capabilities
- 标题：
  - H2: 何时创建一个能力
  - H2: 标准流程
  - H2: 各部分放置位置
  - H2: 提供方与 harness 的衔接点
  - H2: 文件检查清单
  - H2: 示例：图像生成
  - H2: 嵌入提供方
  - H2: 审查检查清单
  - H2: 相关内容

## plugins/admin-http-rpc.md

- 路由：/plugins/admin-http-rpc
- 标题：
  - H2：在启用之前
  - H2：启用
  - H2：验证路由
  - H2：身份验证
  - H2：安全模型
  - H2：请求
  - H2：响应
  - H2：允许的方法
  - H2：WebSocket 对比
  - H2：故障排查
  - H2：相关内容

## plugins/agent-tools.md

- 路由：/plugins/agent-tools
- 标题：
  - H2：相关内容

## plugins/architecture-internals.md

- 路由：/plugins/architecture-internals
- 标题：
  - H2: 加载管道
  - H3: Manifest 优先行为
  - H3: 插件缓存边界
  - H2: 注册表模型
  - H2: 对话绑定回调
  - H2: 提供者运行时钩子
  - H3: 钩子顺序与用法
  - H3: 提供者示例
  - H3: 内置示例
  - H2: 运行时助手
  - H3: api.runtime.imageGeneration
  - H2: 网关 HTTP 路由
  - H2: 插件 SDK 导入路径
  - H2: 消息工具模式
  - H2: 通道目标解析
  - H2: 配置支持的目录
  - H2: 提供者目录
  - H2: 只读通道检查
  - H2: 包集合
  - H3: 通道目录元数据
  - H2: 上下文引擎插件
  - H2: 添加新能力
  - H3: 能力检查清单
  - H3: 能力模板
  - H2: 相关内容

## plugins/architecture.md

- Route: /plugins/architecture
- Headings:
  - H2: Public capability model
  - H3: External compatibility stance
  - H3: Plugin shapes
  - H3: Compatibility signals
  - H2: Architecture overview
  - H3: Plugin metadata snapshot and lookup table
  - H3: Activation planning
  - H3: Channel plugins and the shared message tool
  - H2: Capability ownership model
  - H3: Capability layering
  - H3: Multi-capability company plugin example
  - H3: Capability example: video understanding
  - H2: Contracts and enforcement
  - H3: What belongs in a contract
  - H2: Execution model
  - H2: Export boundary
  - H2: Internals and reference
  - H2: Related

## plugins/beam.md

- Route: /plugins/beam
- Headings:
  - H2: Enable
  - H2: Authentication
  - H2: Request
  - H2: Storage and visibility
  - H2: Security boundary
  - H2: Mirroring
  - H2: Troubleshooting
  - H2: Related

## plugins/building-extensions.md

- 路由：/plugins/building-extensions
- 标题：
  - 二级标题：相关

## plugins/building-plugins.md

- 路由：/plugins/building-plugins
- 标题：
  - H2：要求
  - H2：选择插件形态
  - H2：快速开始
  - H2：注册工具
  - H2：导入约定
  - H2：提交前检查清单
  - H2：针对 beta 版本进行测试
  - H2：下一步
  - H2：相关内容

## plugins/bundles.md

- 路由：/plugins/bundles
- 标题：
  - H2: bundle 存在的原因
  - H2: 安装 bundle
  - H2: OpenClaw 从 bundle 中映射了什么
  - H3: 当前支持
  - H4: 技能内容
  - H4: Hook 包
  - H4: 适用于嵌入式 OpenClaw 的 MCP
  - H4: 嵌入式 OpenClaw 设置
  - H4: 嵌入式 OpenClaw LSP
  - H3: 已检测但未执行
  - H2: bundle 格式
  - H2: 检测优先级
  - H2: 运行时依赖与清理
  - H2: 安全性
  - H2: 故障排查
  - H2: 相关内容

## plugins/cli-backend-plugins.md

- Route: /plugins/cli-backend-plugins
- Headings:
  - H2: What the plugin owns
  - H2: Minimal backend plugin
  - H2: Config shape
  - H2: Advanced backend hooks
  - H3: ownsNativeCompaction: opting out of OpenClaw compaction
  - H2: MCP tool bridge
  - H2: Selecting the backend
  - H2: Verification
  - H2: Checklist
  - H2: Related

## plugins/codex-computer-use.md

- 路由: /plugins/codex-computer-use
- 标题:
  - H2: OpenClaw.app 和 Peekaboo
  - H2: iOS 应用
  - H2: 直接 cua-driver MCP
  - H2: 快速设置
  - H2: 命令
  - H2: 市场选择
  - H2: 捆绑的 macOS 市场
  - H3: 共享插件缓存
  - H2: 远程目录限制
  - H2: 配置参考
  - H2: OpenClaw 检查什么
  - H2: macOS 权限
  - H2: 故障排除
  - H2: 相关内容

## plugins/codex-harness-reference.md

- 路由: /plugins/codex-harness-reference
- 标题:
  - H2: 插件配置界面
  - H2: 监督
  - H2: 应用服务器传输
  - H2: 审批和沙盒模式
  - H2: 沙盒化原生执行
  - H2: 认证和环境隔离
  - H2: 动态工具
  - H2: 超时
  - H2: 模型发现
  - H2: 工作区启动文件
  - H2: 环境覆盖
  - H2: 相关

## plugins/codex-harness-runtime.md

- 路由: /plugins/codex-harness-runtime
- 标题:
  - H2: 概述
  - H2: 线程绑定和模型变更
  - H2: 监管和安全续接
  - H2: 可见回复和心跳
  - H2: Hook 边界
  - H2: V1 支持契约
  - H2: 原生权限和 MCP 询问
  - H2: 队列引导
  - H2: Codex 反馈上传
  - H2: 压缩和对话镜像
  - H2: 媒体和传输
  - H2: 相关内容

## plugins/codex-harness.md

- Route: /plugins/codex-harness
- Headings:
  - H2: Requirements
  - H2: Quickstart
  - H2: Share threads with Codex Desktop and CLI
  - H2: Supervise Codex sessions
  - H2: Configuration
  - H3: Compaction
  - H3: Direct API long context
  - H2: Verify Codex runtime
  - H2: Routing and model selection
  - H2: Deployment patterns
  - H3: Basic Codex deployment
  - H3: Mixed provider deployment
  - H3: Fail-closed Codex deployment
  - H2: App-server policy
  - H2: Commands and diagnostics
  - H3: Inspect Codex threads locally
  - H3: Auth order
  - H3: Environment isolation
  - H3: Dynamic tools and web search
  - H3: Config fields
  - H3: Dynamic tool call timeouts
  - H3: Local testing env overrides
  - H2: Native Codex plugins
  - H2: Computer Use
  - H2: Runtime boundaries
  - H2: Troubleshooting
  - H2: Related

## plugins/codex-native-plugins.md

- 路由：/plugins/codex-native-plugins
- 标题：
  - H2：要求
  - H2：快速开始
  - H2：通过聊天管理插件
  - H2：本地插件设置如何工作
  - H2：V1 支持边界
  - H2：应用清单与所有权
  - H2：已连接账号应用
  - H2：线程应用配置
  - H2：破坏性操作策略
  - H2：故障排查
  - H2：相关

## plugins/codex-supervision.md

- 路由：/plugins/codex-supervision
- 标题：
  - H2：开始之前
  - H2：启用监管
  - H2：使用 operator CLI
  - H2：从本地会话分支
  - H2：归档本地会话
  - H2：了解配对节点限制
  - H2：元数据和权限
  - H3：兼容性工具
  - H2：故障排除
  - H2：相关内容

## plugins/community.md

- 路由：/plugins/community
- 标题：
  - H2: 查找插件
  - H2: 发布插件
  - H2: 相关内容

## plugins/compatibility.md

- Route: /plugins/compatibility
- Headings:
  - H2: Compatibility registry
  - H2: Deprecation policy
  - H2: Current compatibility areas
  - H3: Channel prompt-context identifier aliases
  - H3: WhatsApp inbound callback flat aliases
  - H3: WhatsApp inbound admission fields
  - H2: Plugin inspector package
  - H3: Maintainer acceptance lane
  - H2: Release notes

## plugins/copilot.md

- 路由：/plugins/copilot
- 标题：
  - H2：要求
  - H2：安装
  - H2：快速开始
  - H2：支持的提供商
  - H2：BYOK
  - H2：认证
  - H2：配置范围
  - H2：压缩
  - H2：对话记录镜像
  - H2：侧边问题（/btw）
  - H2：诊断
  - H2：限制
  - H2：权限和 askuser
  - H3：会话级 GitHub 令牌
  - H2：相关链接

## plugins/dependency-resolution.md

- 路由：/plugins/dependency-resolution
- 标题：
  - H2：职责划分
  - H2：安装根目录
  - H2：本地插件
  - H2：启动和重新加载
  - H2：捆绑插件
  - H2：旧版清理

## plugins/google-meet.md

- 路由：/plugins/google-meet
- 标题：
  - H2：快速开始
  - H3：创建会议
  - H3：仅观察加入
  - H3：实时会话健康状态
  - H2：本地网关 + Parallels Chrome
  - H3：常见故障检查
  - H2：安装说明
  - H2：传输方式
  - H3：Chrome
  - H3：Twilio
  - H2：OAuth 和预检
  - H3：创建 Google 凭据
  - H3：生成刷新令牌
  - H3：使用 doctor 验证 OAuth
  - H3：解析、预检并读取工件
  - H3：实时冒烟测试
  - H3：创建示例
  - H2：配置
  - H3：默认值
  - H3：可选覆盖项
  - H2：工具
  - H2：Agent 和 bidi 模式
  - H2：实时测试检查清单
  - H2：故障排查
  - H3：Agent 无法看到 Google Meet 工具
  - H3：没有已连接的支持 Google Meet 的节点
  - H3：浏览器已打开，但 agent 无法加入
  - H3：会议创建失败
  - H3：Agent 已加入但无法发言
  - H3：Twilio 设置检查失败
  - H3：Twilio 通话已开始，但始终未进入会议
  - H2：说明
  - H2：相关内容

## plugins/hooks.md

- Route: /plugins/hooks
- Headings:
  - H2: Quick start
  - H2: Hook catalog
  - H3: Channel pairing requests
  - H2: Debug runtime hooks
  - H2: Tool call policy
  - H3: Sender-aware policy in one file
  - H3: Exec environment hook
  - H3: Tool result persistence
  - H2: Prompt and model hooks
  - H3: Session extensions and next-turn injections
  - H2: Message hooks
  - H2: Install hooks
  - H2: Gateway lifecycle
  - H3: Safe external cron projection
  - H2: Upcoming deprecations
  - H2: Related

## plugins/install-overrides.md

- 路由：/plugins/install-overrides
- 标题：
  - H2：环境
  - H2：行为
  - H2：包 E2E

## plugins/llama-cpp.md

- Route: /plugins/llama-cpp
- Headings:
  - H2: Local text inference
  - H3: Use another GGUF model
  - H2: Memory embedding configuration
  - H2: Native runtime
  - H2: Memory runtime diagnostics
  - H2: Troubleshooting

## plugins/logbook.md

- 路由：/plugins/logbook
- 标题：
  - H2: 开始之前
  - H2: 快速开始
  - H2: 工作原理
  - H2: 模型和数据流
  - H2: 配置
  - H3: 视觉模型选择
  - H2: 仪表板标签页
  - H2: 网关方法
  - H2: 隐私说明
  - H2: 故障排除
  - H3: 缺少 Logbook 标签页
  - H3: 捕获时报错
  - H3: 捕获成功但未显示任何卡片
  - H2: 相关内容

## plugins/manage-plugins.md

- 路由: /plugins/manage-plugins
- 标题:
  - H2: 使用控制界面
  - H2: 列出并搜索插件
  - H2: 启用和禁用插件
  - H2: 安装插件
  - H2: 重启并检查
  - H2: 更新插件
  - H2: 卸载插件
  - H2: 选择来源
  - H2: 发布插件
  - H2: 相关内容

## plugins/manifest.md

- Route: /plugins/manifest
- Headings:
  - H2: What this file does
  - H2: Minimal example
  - H2: Rich example
  - H2: Top-level field reference
  - H2: MCP server reference
  - H2: dashboard reference
  - H2: catalog reference
  - H2: Generation provider metadata reference
  - H2: Tool metadata reference
  - H2: providerAuthChoices reference
  - H2: commandAliases reference
  - H2: activation reference
  - H2: qaRunners reference
  - H2: setup reference
  - H3: setup.providers reference
  - H3: setup fields
  - H2: uiHints reference
  - H2: contracts reference
  - H2: configContracts reference
  - H2: mediaUnderstandingProviderMetadata reference
  - H2: channelConfigs reference
  - H3: Replacing another channel plugin
  - H2: modelSupport reference
  - H2: modelCatalog reference
  - H2: modelIdNormalization reference
  - H2: providerEndpoints reference
  - H2: providerRequest reference
  - H2: secretProviderIntegrations reference
  - H2: modelPricing reference
  - H3: OpenClaw Provider Index
  - H2: Manifest versus package.json
  - H3: package.json fields that affect discovery
  - H2: Discovery precedence (duplicate plugin ids)
  - H2: JSON Schema requirements
  - H2: Validation behavior
  - H2: Notes
  - H2: Related

## plugins/meeting-plugins.md

- Route: /plugins/meeting-plugins
- Headings:
  - H2: Choose a plugin
  - H2: Choose a mode
  - H2: Prepare Chrome and audio
  - H2: Install or disable plugins
  - H2: Verify and join
  - H2: Handle platform policy prompts
  - H2: Discord voice chat
  - H2: Platform guides

## plugins/memory-lancedb.md

- 路由：/plugins/memory-lancedb
- 标题：
  - H2：安装
  - H2：快速开始
  - H2：嵌入配置
  - H3：维度
  - H2：Ollama 嵌入
  - H2：召回和捕获限制
  - H2：命令
  - H2：存储
  - H2：运行时依赖和平台支持
  - H2：故障排除
  - H3：输入长度超过上下文长度
  - H3：不支持的嵌入模型
  - H3：插件已加载但没有出现记忆
  - H2：相关内容

## plugins/memory-wiki.md

- 路由：/plugins/memory-wiki
- 标题：
  - H2：Vault 模式
  - H2：Vault 布局
  - H2：Open Knowledge Format 导入
  - H2：结构化断言与证据
  - H2：面向代理的实体元数据
  - H2：编译管道
  - H2：仪表盘与健康报告
  - H2：搜索与检索
  - H2：代理工具
  - H2：提示与上下文行为
  - H2：配置
  - H3：每个代理的 vault
  - H3：示例：QMD + bridge 模式
  - H2：CLI
  - H2：Obsidian 支持
  - H2：推荐工作流
  - H2：相关文档

## plugins/message-presentation.md

- 路由：/plugins/message-presentation
- 标题：
  - H2：约定
  - H2：生产者示例
  - H2：渲染器约定
  - H2：核心渲染流程
  - H2：降级规则
  - H3：按钮值回退可见性
  - H2：提供者映射
  - H2：Presentation 与 InteractiveReply
  - H2：投递 pin
  - H2：插件作者清单
  - H2：相关文档

## plugins/oc-path.md

- 路由：/plugins/oc-path
- 标题：
  - H2：为什么启用它
  - H2：它运行在哪里
  - H2：启用
  - H2：依赖项
  - H2：它提供什么
  - H2：与其他插件的关系
  - H2：安全性
  - H2：相关内容

## plugins/onepassword.md

- Route: /plugins/onepassword
- Headings:
  - H1: 1Password
  - H2: Security model
  - H2: Before you begin
  - H2: Configure SecretRefs
  - H2: Configure registered secrets
  - H2: Use the agent tool
  - H2: Policy tiers and approvals
  - H2: Inspect status and audit history
  - H2: 1Password CLI behavior
  - H2: Error codes

## plugins/plugin-inventory.md

- 路由：/plugins/plugin-inventory
- 标题：
  - H1：插件清单
  - H2：定义
  - H2：安装插件
  - H2：核心 npm 包
  - H2：官方外部包
  - H2：仅源码检出

## plugins/plugin-permission-requests.md

- 路由：/plugins/plugin-permission-requests
- 标题：
  - H2：选择合适的关卡
  - H2：在工具调用前请求批准
  - H2：决策行为
  - H2：路由审批提示
  - H2：Codex 原生权限
  - H2：故障排除
  - H2：相关内容

## plugins/reference.md

- 路由：/plugins/reference
- 标题：
  - H1：插件参考

## plugins/reference/acpx.md

- Route: /plugins/reference/acpx
- Headings:
  - H1: ACPx plugin
  - H2: Distribution
  - H2: Surface
  - H2: Pi native sessions
  - H2: Related docs

## plugins/reference/admin-http-rpc.md

- 路由：/plugins/reference/admin-http-rpc
- 标题：
  - H1：Admin Http Rpc 插件
  - H2：发行版
  - H2：接口
  - H2：相关文档

## plugins/reference/alibaba.md

- 路由：/plugins/reference/alibaba
- 标题：
  - H1：阿里巴巴插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/amazon-bedrock-mantle.md

- 路由：/plugins/reference/amazon-bedrock-mantle
- 标题：
  - H1：Amazon Bedrock Mantle 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## 插件/参考/amazon-bedrock.md

- 路由：/plugins/reference/amazon-bedrock
- 标题：
  - H1：Amazon Bedrock 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/anthropic-vertex.md

- 路由: /plugins/reference/anthropic-vertex
- 标题:
  - H1: Anthropic Vertex 插件
  - H2: 分发
  - H2: 表面
  - H2: Claude Fable 5
  - H2: Claude Sonnet 5

## plugins/reference/anthropic.md

- 路由：/plugins/reference/anthropic
- 标题：
  - H1：Anthropic 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/arcee.md

- 路由：/plugins/reference/arcee
- 标题：
  - H1：Arcee 插件
  - H2：分布
  - H2：表面
  - H2：相关文档

## plugins/reference/azure-speech.md

- 路由: /plugins/reference/azure-speech
- 标题:
  - H1: Azure Speech 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文章

## plugins/reference/baseten.md

- Route: /plugins/reference/baseten
- Headings:
  - H1: Baseten plugin
  - H2: Distribution
  - H2: Surface
  - H2: Related docs

## plugins/reference/beam.md

- Route: /plugins/reference/beam
- Headings:
  - H1: Beam plugin
  - H2: Distribution
  - H2: Surface
  - H2: Related docs

## plugins/reference/bonjour.md

- 路由: /plugins/reference/bonjour
- 标题:
  - H1: Bonjour 插件
  - H2: 分发
  - H2: 表面

## plugins/reference/brave.md

- 路由：/plugins/reference/brave
- 标题：
  - H1：Brave 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/browser.md

- 路由：/plugins/reference/browser
- 标题：
  - H1：浏览器插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/buzz.md

- Route: /plugins/reference/buzz
- Headings:
  - H1: Buzz plugin
  - H2: Distribution
  - H2: Surface
  - H2: Related docs

## plugins/reference/byteplus.md

- 路由：/plugins/reference/byteplus
- 标题：
  - H1：BytePlus 插件
  - H2：分发
  - H2：界面

## plugins/reference/canvas.md

- 路由：/plugins/reference/canvas
- 标题：
  - H1: Canvas 插件
  - H2: 分发
  - H2: 表面

## plugins/reference/cerebras.md

- 路由: /plugins/reference/cerebras
- 标题:
  - H1: Cerebras 插件
  - H2: 分发
  - H2: 接口
  - H2: 相关文章

## plugins/reference/chutes.md

- 路由：/plugins/reference/chutes
- 标题：
  - H1：Chutes 插件
  - H2：分布
  - H2：表面
  - H2：相关文档

## plugins/reference/clawrouter.md

- 路由：/plugins/reference/clawrouter
- 标题：
  - H1: ClawRouter 插件
  - H2: 分布
  - H2: 表面
  - H2: 相关文档

## plugins/reference/clickclack.md

- 路由：/plugins/reference/clickclack
- 标题：
  - H1: Clickclack 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/cloudflare-ai-gateway.md

- 路由: /plugins/reference/cloudflare-ai-gateway
- 标题:
  - H1: Cloudflare AI Gateway 插件
  - H2: 分发
  - H2: 接口
  - H2: 相关文档

## plugins/reference/codex.md

- 路由：/plugins/reference/codex
- 标题：
  - H1：Codex 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/cohere.md

- 路由: /plugins/reference/cohere
- 标题:
  - H1: Cohere 插件
  - H2: 分布
  - H2: 界面
  - H2: 相关文章

## plugins/reference/comfy.md

- 路由：/plugins/reference/comfy
- 标题：
  - H1: ComfyUI 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/copilot-proxy.md

- 路由：/plugins/reference/copilot-proxy
- 标题：
  - H1：Copilot Proxy 插件
  - H2：分发
  - H2：界面

## 插件/参考/copilot.md

- 路由：/plugins/reference/copilot
- 标题：
  - H1：Copilot 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/crabbox.md

- 路由：/plugins/reference/crabbox
- 标题：
  - H1：Crabbox 插件
  - H2：分发
  - H2：表面
  - H2：配置

## plugins/reference/cua-computer.md

- Route: /plugins/reference/cua-computer
- Headings:
  - H1: Cua Computer plugin
  - H2: Distribution
  - H2: Surface

## plugins/reference/deepgram.md

- 路由: /plugins/reference/deepgram
- 标题:
  - H1: Deepgram 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/deepinfra.md

- 路由：/plugins/reference/deepinfra
- 标题：
  - H1：DeepInfra 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/deepseek.md

- 路由：/plugins/reference/deepseek
- 标题：
  - H1：DeepSeek 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/diagnostics-otel.md

- 路由：/plugins/reference/diagnostics-otel
- 标题：
  - H1：Diagnostics OpenTelemetry 插件
  - H2：分发
  - H2：表面

## plugins/reference/diagnostics-prometheus.md

- 路由：/plugins/reference/diagnostics-prometheus
- 标题：
  - H1: Diagnostics Prometheus 插件
  - H2: Distribution
  - H2: Surface

## plugins/reference/diffs-language-pack.md

- 路由：/plugins/reference/diffs-language-pack
- 标题：
  - H1: Diffs 语言包插件
  - H2: 分发
  - H2: 表面
  - H2: 新增语言

## plugins/reference/diffs.md

- 路由：/plugins/reference/diffs
- 标题：
  - H1: Diffs 插件
  - H2: 分发
  - H2: 表面

## plugins/reference/discord.md

- 路由：/plugins/reference/discord
- 标题：
  - H1：Discord 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## 插件/参考/文档提取.md

- 路由：/plugins/reference/document-extract
- 标题：
  - H1: 文档提取插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/duckduckgo.md

- 路由：/plugins/reference/duckduckgo
- 标题：
  - H1：DuckDuckGo 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/elevenlabs.md

- 路由：/plugins/reference/elevenlabs
- 标题：
  - H1：Elevenlabs 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/exa.md

- 路由：/plugins/reference/exa
- 标题：
  - H1: Exa 插件
  - H2: 分发
  - H2: 接口
  - H2: 相关文档

## plugins/reference/fal.md

- 路由：/plugins/reference/fal
- 标题：
  - H1：fal 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/featherless.md

- 路由: /plugins/reference/featherless
- 标题:
  - H1: Featherless 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文章

## plugins/reference/feishu.md

- 路由: /plugins/reference/feishu
- 标题:
  - H1: 飞书插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/file-transfer.md

- 路由: /plugins/reference/file-transfer
- 标题:
  - H1: 文件传输插件
  - H2: 分发
  - H2: 表面

## plugins/reference/firecrawl.md

- 路由：/plugins/reference/firecrawl
- 标题：
  - H1：Firecrawl 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/fireworks.md

- 路由：/plugins/reference/fireworks
- 标题：
  - H1：Fireworks 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/github-copilot.md

- 路由: /plugins/reference/github-copilot
- 标题:
  - H1: GitHub Copilot 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/gmi.md

- 路由: /plugins/reference/gmi
- 标题:
  - H1: Gmi 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/google-meet.md

- 路由: /plugins/reference/google-meet
- 标题:
  - H1: Google Meet 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/google.md

- 路由：/plugins/reference/google
- 标题：
  - H1：Google 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/googlechat.md

- 路由: /plugins/reference/googlechat
- 标题:
  - H1: Google Chat 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/gradium.md

- 路由：/plugins/reference/gradium
- 标题：
  - H1：Gradium 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/groq.md

- 路由：/plugins/reference/groq
- 标题：
  - H1: Groq 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/huggingface.md

- 路由: /plugins/reference/huggingface
- 标题:
  - H1: Hugging Face 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/imessage.md

- 路由: /plugins/reference/imessage
- 标题:
  - H1: iMessage 插件
  - H2: 分发
  - H2: 接口
  - H2: 相关文档

## 插件/参考/inworld.md

- 路由：/plugins/reference/inworld
- 标题：
  - H1：Inworld 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/irc.md

- 路由：/plugins/reference/irc
- 标题：
  - H1：IRC 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/kilocode.md

- 路由：/plugins/reference/kilocode
- 标题：
  - H1：Kilocode 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/kimi.md

- 路由：/plugins/reference/kimi
- 标题：
  - H1：Kimi 插件
  - H2：分发
  - H2：表面
  - H2：相关文章

## plugins/reference/line.md

- 路由：/plugins/reference/line
- 标题：
  - H1：LINE 插件
  - H2：分布
  - H2：表面
  - H2：相关文档

## plugins/reference/linux-canvas.md

- Route: /plugins/reference/linux-canvas
- Headings:
  - H1: Linux Canvas plugin
  - H2: Distribution
  - H2: Surface

## plugins/reference/linux-node.md

- Route: /plugins/reference/linux-node
- Headings:
  - H1: Linux Node plugin
  - H2: Distribution
  - H2: Surface

## plugins/reference/litellm.md

- 路由: /plugins/reference/litellm
- 标题:
  - H1: LiteLLM 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/llama-cpp.md

- Route: /plugins/reference/llama-cpp
- Headings:
  - H1: Llama Cpp plugin
  - H2: Distribution
  - H2: Surface
  - H2: Default text model
  - H2: Related docs

## plugins/reference/llm-task.md

- 路由：/plugins/reference/llm-task
- 标题：
  - H1：LLM 任务插件
  - H2：分发
  - H2：表面

## plugins/reference/lmstudio.md

- 路由：/plugins/reference/lmstudio
- 标题：
  - H1：LM Studio 插件
  - H2：发行版
  - H2：界面
  - H2：相关文档

## plugins/reference/lobster.md

- 路由：/plugins/reference/lobster
- 标题：
  - H1: Lobster 插件
  - H2: 分布
  - H2: 表面

## plugins/reference/logbook.md

- 路由：/plugins/reference/logbook
- 标题：
  - H1：日志簿插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/longcat.md

- 路由: /plugins/reference/longcat
- 标题:
  - H1: LongCat 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文章

## plugins/reference/matrix.md

- 路由：/plugins/reference/matrix
- 标题：
  - H1：Matrix 插件
  - H2：分布
  - H2：表面
  - H2：相关文档

## plugins/reference/mattermost.md

- 路由：/plugins/reference/mattermost
- 标题：
  - H1：Mattermost 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/memory-core.md

- 路由: /plugins/reference/memory-core
- 标题:
  - H1: Memory Core 插件
  - H2: 分布
  - H2: 表面

## plugins/reference/memory-lancedb.md

- 路由: /plugins/reference/memory-lancedb
- 标题:
  - H1: Memory Lancedb 插件
  - H2: 分布
  - H2: 表面
  - H2: 相关文档

## plugins/reference/memory-wiki.md

- 路由：/plugins/reference/memory-wiki
- 标题：
  - H1: Memory Wiki 插件
  - H2: 分布
  - H2: 界面
  - H2: 相关文档

## plugins/reference/meta.md

- 路由：/plugins/reference/meta
- 标题：
  - H1：元插件
  - H2：分发
  - H2：表面
  - H2：相关文章

## plugins/reference/microsoft-foundry.md

- 路由: /plugins/reference/microsoft-foundry
- 标题:
  - H1: Microsoft Foundry 插件
  - H2: 分发
  - H2: 接口
  - H2: 要求
  - H2: 聊天模型
  - H2: MAI 图像生成
  - H2: 故障排除

## plugins/reference/microsoft.md

- 路由：/plugins/reference/microsoft
- 标题：
  - H1：Microsoft 插件
  - H2：分发
  - H2：Surface

## plugins/reference/migrate-claude.md

- 路由: /plugins/reference/migrate-claude
- 标题:
  - H1: 迁移 Claude 插件
  - H2: 分发
  - H2: 表面

## plugins/reference/migrate-hermes.md

- 路由：/plugins/reference/migrate-hermes
- 标题：
  - H1：迁移 Hermes 插件
  - H2：分发
  - H2：表面

## plugins/reference/minimax.md

- 路由：/plugins/reference/minimax
- 标题：
  - H1：MiniMax 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/mistral.md

- 路由: /plugins/reference/mistral
- 标题:
  - H1: Mistral 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/moonshot.md

- 路由: /plugins/reference/moonshot
- 标题:
  - H1: Moonshot 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/msteams.md

- 路由: /plugins/reference/msteams
- 标题:
  - H1: Microsoft Teams 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/mxc.md

- 路由：/plugins/reference/mxc
- 标题：
  - H1：Mxc 插件
  - H2：分发
  - H2：表面

## plugins/reference/nextcloud-talk.md

- 路由: /plugins/reference/nextcloud-talk
- 标题:
  - H1: Nextcloud Talk 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文章

## plugins/reference/nostr.md

- 路由: /plugins/reference/nostr
- 标题:
  - H1: Nostr 插件
  - H2: 分发
  - H2: 接口
  - H2: 相关文章

## plugins/reference/novita.md

- 路由：/plugins/reference/novita
- 标题：
  - H1：Novita 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/nvidia.md

- 路由: /plugins/reference/nvidia
- 标题:
  - H1: NVIDIA 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## 插件/参考/oc-path.md

- 路由：/plugins/reference/oc-path
- 标题：
  - H1：Oc Path 插件
  - H2：分布
  - H2：表面
  - H2：相关文档

## plugins/reference/ollama.md

- 路由：/plugins/reference/ollama
- 标题：
  - H1: Ollama 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/onepassword.md

- 路由：/plugins/reference/onepassword
- 标题：
  - H1：Onepassword 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/open-prose.md

- 路由：/plugins/reference/open-prose
- 标题：
  - H1：Open Prose 插件
  - H2：分发
  - H2：表面

## plugins/reference/openai.md

- 路由：/plugins/reference/openai
- 标题：
  - H1：OpenAI 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/opencode-go.md

- 路由：/plugins/reference/opencode-go
- 标题：
  - H1：OpenCode Go 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/opencode.md

- Route: /plugins/reference/opencode
- Headings:
  - H1: OpenCode plugin
  - H2: Distribution
  - H2: Surface
  - H2: Native sessions
  - H2: Related docs

## plugins/reference/openrouter.md

- 路由：/plugins/reference/openrouter
- 标题：
  - H1: OpenRouter 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/openshell.md

- 路由：/plugins/reference/openshell
- 标题：
  - H1：Openshell 插件
  - H2：分发
  - H2：表面

## plugins/reference/perplexity.md

- 路由: /plugins/reference/perplexity
- 标题:
  - H1: Perplexity 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/pixverse.md

- 路由: /plugins/reference/pixverse
- 标题:
  - H1: PixVerse 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/policy.md

- 路由: /plugins/reference/policy
- 标题:
  - H1: Policy 插件
  - H2: 分发
  - H2: 表面
  - H2: 行为
  - H2: 相关文档

## plugins/reference/qa-channel.md

- 路由: /plugins/reference/qa-channel
- 标题:
  - H1: QA Channel 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/qa-lab.md

- 路由：/plugins/reference/qa-lab
- 标题：
  - H1: QA 实验室插件
  - H2: 分发
  - H2: 表面

## plugins/reference/qianfan.md

- 路由：/plugins/reference/qianfan
- 标题：
  - H1：Qianfan 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/qqbot.md

- 路由：/plugins/reference/qqbot
- 标题：
  - H1：QQ Bot 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/qwen.md

- 路由：/plugins/reference/qwen
- 标题：
  - H1：Qwen 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/raft.md

- 路由: /plugins/reference/raft
- 标题:
  - H1: Raft 插件
  - H2: 分布
  - H2: 表面
  - H2: 相关文章

## 插件/参考/reef.md

- 路由：/plugins/reference/reef
- 标题：
  - H1：Reef 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/runway.md

- 路由：/plugins/reference/runway
- 标题：
  - H1：Runway 插件
  - H2：分发
  - H2：外观
  - H2：相关文档

## plugins/reference/searxng.md

- 路由：/plugins/reference/searxng
- 标题：
  - H1：SearXNG 插件
  - H2：分发
  - H2：界面

## plugins/reference/senseaudio.md

- 路由: /plugins/reference/senseaudio
- 标题:
  - H1: Senseaudio 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/sglang.md

- 路由：/plugins/reference/sglang
- 标题：
  - H1: SGLang 插件
  - H2: 分发
  - H2: 接口
  - H2: 相关文档

## plugins/reference/signal.md

- 路由：/plugins/reference/signal
- 标题：
  - H1：Signal 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/slack.md

- 路由：/plugins/reference/slack
- 标题：
  - H1：Slack 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/sms.md

- 路由：/plugins/reference/sms
- 标题：
  - H1：短信插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/stepfun.md

- 路由：/plugins/reference/stepfun
- 标题：
  - H1：StepFun 插件
  - H2：分布
  - H2：表面
  - H2：相关文档

## plugins/reference/synology-chat.md

- 路由: /plugins/reference/synology-chat
- 标题:
  - H1: 群晖 Chat 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文章

## plugins/reference/synthetic.md

- 路由：/plugins/reference/synthetic
- 标题：
  - H1：合成插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/tavily.md

- 路由：/plugins/reference/tavily
- 标题：
  - H1：Tavily 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/teams-meetings.md

- Route: /plugins/reference/teams-meetings
- Headings:
  - H1: Microsoft Teams meetings plugin
  - H2: Distribution
  - H2: Surface
  - H2: Related docs

## plugins/reference/telegram.md

- 路由：/plugins/reference/telegram
- 标题：
  - H1：Telegram 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/tencent.md

- 路由：/plugins/reference/tencent
- 标题：
  - H1：腾讯插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/tlon.md

- 路由：/plugins/reference/tlon
- 标题：
  - H1：Tlon 插件
  - H2：发行版
  - H2：Surface
  - H2：相关文档

## plugins/reference/together.md

- 路由：/plugins/reference/together
- 标题：
  - H1：Together 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/tokenjuice.md

- 路由：/plugins/reference/tokenjuice
- 标题：
  - H1：Tokenjuice 插件
  - H2：分布
  - H2：表面
  - H2：相关文档

## plugins/reference/tts-local-cli.md

- 路由：/plugins/reference/tts-local-cli
- 标题：
  - H1：TTS 本地 CLI 插件
  - H2：分发
  - H2：界面

## plugins/reference/twitch.md

- 路由：/plugins/reference/twitch
- 标题：
  - H1：Twitch 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/vault.md

- 路由: /plugins/reference/vault
- 标题:
  - H1: Vault 插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/venice.md

- 路由：/plugins/reference/venice
- 标题：
  - H1：Venice 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/vercel-ai-gateway.md

- 路由：/plugins/reference/vercel-ai-gateway
- 标题：
  - H1：Vercel AI Gateway 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/vllm.md

- 路由: /plugins/reference/vllm
- 标题:
  - H1: vLLM 插件
  - H2: 分布
  - H2: 表面
  - H2: 相关文档

## plugins/reference/voice-call.md

- 路由: /plugins/reference/voice-call
- 标题:
  - H1: 语音通话插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/volcengine.md

- 路由：/plugins/reference/volcengine
- 标题：
  - H1：火山引擎插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/voyage.md

- 路由: /plugins/reference/voyage
- 标题:
  - H1: Voyage 插件
  - H2: 分发
  - H2: 表面

## plugins/reference/vydra.md

- 路由：/plugins/reference/vydra
- 标题：
  - H1：Vydra 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/web-readability.md

- 路由：/plugins/reference/web-readability
- 标题：
  - H1：Web 可读性插件
  - H2：分发
  - H2：表面

## plugins/reference/webhooks.md

- 路由：/plugins/reference/webhooks
- 标题：
  - H1：Webhook 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## 插件/参考/whatsapp.md

- 路由：/plugins/reference/whatsapp
- 标题：
  - H1：WhatsApp 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/workboard.md

- 路由：/plugins/reference/workboard
- 标题：
  - H1：工作板插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/xai.md

- 路由: /plugins/reference/xai
- 标题:
  - H1: xAI 插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/xiaomi.md

- 路由: /plugins/reference/xiaomi
- 标题:
  - H1: 小米插件
  - H2: 分发
  - H2: 界面
  - H2: 相关文档

## plugins/reference/zai.md

- 路由：/plugins/reference/zai
- 标题：
  - H1：Z.AI 插件
  - H2：分发
  - H2：界面
  - H2：相关文档

## plugins/reference/zalo.md

- 路由：/plugins/reference/zalo
- 标题：
  - H1：Zalo 插件
  - H2：分发
  - H2：表面
  - H2：相关文档

## plugins/reference/zalouser.md

- 路由: /plugins/reference/zalouser
- 标题:
  - H1: Zalo 个人插件
  - H2: 分发
  - H2: 表面
  - H2: 相关文档

## plugins/reference/zoom-meetings.md

- Route: /plugins/reference/zoom-meetings
- Headings:
  - H1: Zoom meetings plugin
  - H2: Distribution
  - H2: Surface
  - H2: Related docs

## plugins/sdk-agent-harness.md

- Route: /plugins/sdk-agent-harness
- Headings:
  - H2: When to use a harness
  - H2: What core still owns
  - H3: Harness-owned auth bootstrap
  - H3: Verified setup runtime artifacts
  - H3: Request-transport contract
  - H2: Register a harness
  - H3: Delegated execution
  - H2: Selection policy
  - H2: Provider plus harness pairing
  - H3: Tool-result middleware
  - H3: Terminal outcome classification
  - H3: Agent-end side effects
  - H3: User input and tool surfaces
  - H3: Native Codex harness mode
  - H2: Runtime strictness
  - H2: Native sessions and transcript mirror
  - H2: Tool and media results
  - H3: Terminal tool outcomes
  - H3: Settled tool finalization
  - H2: Current limitations
  - H2: Related

## plugins/sdk-channel-inbound.md

- Route: /plugins/sdk-channel-inbound
- Headings:
  - H2: Core helpers
  - H2: Delivery settlement contract
  - H2: Migration

## plugins/sdk-channel-ingress.md

- 路由: /plugins/sdk-channel-ingress
- 标题:
  - H2: 运行时解析器
  - H2: 结果
  - H2: 访问组
  - H2: 事件模式
  - H2: 路由和激活
  - H2: 脱敏
  - H2: 验证

## plugins/sdk-channel-message.md

- 路由：/plugins/sdk-channel-message
- 标题：无

## plugins/sdk-channel-outbound.md

- Route: /plugins/sdk-channel-outbound
- Headings:
  - H2: Durable ingress monitors
  - H2: Adapter
  - H2: Outbound echo suppression
  - H2: Plain-text sanitization
  - H2: Delivery Evidence
  - H2: Existing outbound adapters
  - H2: Durable sends
  - H2: Deferred delivery admission
  - H2: Compatibility dispatch

## plugins/sdk-channel-plugins.md

- Route: /plugins/sdk-channel-plugins
- Headings:
  - H2: What your plugin owns
  - H2: Message adapter
  - H3: Inbound ingress (experimental)
  - H3: Durable ingress and replay dedupe
  - H4: Transport classes and retention
  - H4: At-least-once side effects
  - H4: Account-scoped restart contract
  - H3: Typing indicators
  - H3: Media source params
  - H3: Native payload shaping
  - H3: Session conversation grammar
  - H3: Account-scoped conversation binding support
  - H2: Approvals and channel capabilities
  - H3: Approval auth
  - H3: Payload lifecycle and setup guidance
  - H3: Native approval delivery
  - H3: Narrower approval runtime subpaths
  - H3: Setup subpaths
  - H3: Other narrow channel subpaths
  - H2: Inbound mention policy
  - H2: Walkthrough
  - H2: File structure
  - H2: Advanced topics
  - H2: Next steps
  - H2: Related

## 插件/sdk-channel-turn.md

- 路由：/plugins/sdk-channel-turn
- 标题：无

## plugins/sdk-entrypoints.md

- 路由：/plugins/sdk-entrypoints
- 标题：
  - H2: 包入口
  - H2: defineToolPlugin
  - H2: definePluginEntry
  - H2: defineChannelPluginEntry
  - H2: defineSetupPluginEntry
  - H2: 注册模式
  - H2: 插件形态
  - H2: 相关内容

## plugins/sdk-migration.md

- Route: /plugins/sdk-migration
- Headings:
  - H2: What changed
  - H3: Why
  - H2: Compatibility policy
  - H3: AuthStorage SQLite migration
  - H3: Published channel setup compatibility
  - H3: Channel setup input field compatibility
  - H4: Verifying readers
  - H3: Media legacy projection
  - H2: How to migrate
  - H2: Import path reference
  - H2: Removed compatibility surfaces
  - H3: Process-global API-provider publication
  - H3: Private testing barrel
  - H2: Migration reference
  - H2: Talk and realtime voice migration
  - H2: Removal timeline
  - H2: Suppressing the warnings temporarily
  - H2: Related

## plugins/sdk-overview.md

- Route: /plugins/sdk-overview
- Headings:
  - H2: Import convention
  - H2: Subpath reference
  - H2: Registration API
  - H3: Capability registration
  - H3: Tools and commands
  - H3: Infrastructure
  - H4: Post-ack webhook work
  - H4: Requester-scoped MCP connections
  - H3: Host hooks for workflow plugins
  - H3: Gateway discovery registration
  - H3: CLI registration metadata
  - H3: CLI backend registration
  - H3: Exclusive slots
  - H3: Deprecated memory embedding adapters
  - H3: Events and lifecycle
  - H3: Hook decision semantics
  - H3: API object fields
  - H2: Internal module convention
  - H2: Related

## plugins/sdk-provider-plugins.md

- 路由：/plugins/sdk-provider-plugins
- 标题：
  - H2：使用指南
  - H2：发布到 ClawHub
  - H2：文件结构
  - H2：目录顺序参考
  - H2：后续步骤
  - H2：相关内容

## plugins/sdk-runtime.md

- Route: /plugins/sdk-runtime
- Headings:
  - H2: Config loading and writes
  - H2: Reusable runtime utilities
  - H2: Runtime namespaces
  - H2: Gateway service events
  - H2: Storing runtime references
  - H2: Other top-level api fields
  - H2: Related

## plugins/sdk-setup.md

- 路由：/plugins/sdk-setup
- 标题：
  - H2: 包元数据
  - H3: openclaw 字段
  - H3: openclaw.channel
  - H3: Channel-owned setup fields
  - H3: openclaw.install
  - H3: Deferred full load
  - H2: Plugin manifest
  - H2: ClawHub publishing
  - H2: Setup entry
  - H3: Narrow setup helper imports
  - H3: Channel-owned setup input fields
  - H3: Channel-owned single-account promotion
  - H2: Config schema
  - H3: Building channel config schemas
  - H2: Setup wizards
  - H2: Publishing and installing
  - H2: Related

## plugins/sdk-subpaths.md

- Route: /plugins/sdk-subpaths
- Headings:
  - H2: Plugin entry
  - H3: Compatibility and private-local helpers
  - H3: Bundled plugin helper subpaths
  - H2: Related

## plugins/sdk-testing.md

- 路由：/plugins/sdk-testing
- 标题：
  - H2：测试工具
  - H3：可用导出
  - H3：类型
  - H2：测试目标解析
  - H2：测试模式
  - H3：测试注册契约
  - H3：测试运行时配置访问
  - H3：对通道插件进行单元测试
  - H3：对提供者插件进行单元测试
  - H3：模拟插件运行时
  - H3：使用按实例存根进行测试
  - H2：契约测试（仓库内插件）
  - H3：运行范围限定测试
  - H2：Lint 强制执行（仓库内插件）
  - H2：测试配置
  - H2：相关内容

## plugins/teams-meetings.md

- Route: /plugins/teams-meetings
- Headings:
  - H2: Setup
  - H2: Modes
  - H2: Guest join limits
  - H2: Tool and gateway surface
  - H2: Related

## plugins/tool-plugins.md

- Route: /plugins/tool-plugins
- Headings:
  - H2: Requirements
  - H2: Quickstart
  - H2: Write a tool
  - H2: Optional and factory tools
  - H2: Return values
  - H2: Output contracts
  - H2: Configuration
  - H2: Generated metadata
  - H2: Package metadata
  - H2: Validate in CI
  - H2: Install and inspect locally
  - H2: Publish
  - H2: Troubleshooting
  - H3: plugin entry not found: ./dist/index.js
  - H3: plugin entry does not expose defineToolPlugin metadata
  - H3: openclaw.plugin.json generated metadata is stale
  - H3: package.json openclaw.extensions must include ./dist/index.js
  - H3: Cannot find package 'typebox'
  - H3: Tool does not appear after install
  - H2: See also

## plugins/vault.md

- 路由：/plugins/vault
- 标题：
  - H1：Vault SecretRefs
  - H2：开始之前
  - H2：将 provider key 存储到 Vault 中
  - H2：让 Gateway 可访问 Vault
  - H2：生成并应用 SecretRef 计划
  - H2：配置更多 provider keys
  - H2：SecretRef ID 格式
  - H2：OpenClaw 存储了什么
  - H2：容器和托管部署
  - H2：相关内容

## plugins/voice-call.md

- 路由：/plugins/voice-call
- 标题：
  - H2: 快速开始
  - H2: 配置
  - H3: 配置参考
  - H2: 会话作用域
  - H2: 实时语音对话
  - H3: 工具策略
  - H3: 代理人语音上下文
  - H3: 实时提供商示例
  - H2: 流式转录
  - H3: 流式提供商示例
  - H2: 通话的 TTS
  - H3: TTS 示例
  - H2: 呼入电话
  - H3: 按号码路由
  - H3: 语音输出契约
  - H3: 对话启动行为
  - H3: Twilio 流断开宽限期
  - H2: 过期通话清理器
  - H2: Webhook 安全
  - H2: CLI
  - H2: 代理工具
  - H2: 网关 RPC
  - H2: 故障排查
  - H3: 设置失败：Webhook 暴露
  - H3: 提供商凭证失败
  - H3: 通话已开始，但提供商 Webhook 未到达
  - H3: 签名验证失败
  - H3: Google Meet Twilio 加入失败
  - H3: 实时通话没有语音
  - H2: 相关内容

## plugins/webhooks.md

- Route: /plugins/webhooks
- Headings:
  - H2: Configure routes
  - H2: Security model
  - H2: Request format
  - H2: Supported actions
  - H3: `create_flow`
  - H3: `run_task`
  - H2: Response shape
  - H2: Related

## plugins/workboard.md

- Route: /plugins/workboard
- Headings:
  - H2: Enable it
  - H2: Configuration
  - H2: Card fields
  - H2: Starting work from a card
  - H2: Agent tools
  - H2: Dispatch
  - H3: Worker selection
  - H3: Entry points
  - H2: CLI and slash command
  - H2: Session lifecycle sync
  - H2: Dashboard workflow
  - H3: Session-board widgets
  - H2: Diagnostics
  - H2: Permissions
  - H2: Storage
  - H2: Troubleshooting
  - H2: Related

## plugins/zalouser.md

- 路由：/plugins/zalouser
- 标题：
  - H2: 命名
  - H2: 运行位置
  - H2: 安装
  - H3: 来自 npm
  - H3: 来自本地文件夹（开发）
  - H2: 配置
  - H2: CLI
  - H2: Agent 工具
  - H2: 相关内容

## plugins/zoom-meetings.md

- Route: /plugins/zoom-meetings
- Headings:
  - H2: Setup
  - H2: Modes
  - H2: Guest join limits
  - H2: Tool and gateway surface
  - H2: Related

## prose.md

- 路由：/prose
- 标题：
  - H2：安装
  - H2：斜杠命令
  - H2：它能做什么
  - H2：示例：并行研究与综合
  - H2：OpenClaw 运行时映射
  - H2：文件位置
  - H2：状态后端
  - H2：安全
  - H2：相关内容

## providers/alibaba.md

- 路由：/providers/alibaba
- 标题：
  - H2: 入门
  - H2: 内置 Wan 模型
  - H2: 能力与限制
  - H2: 高级配置
  - H2: 相关内容

## providers/anthropic.md

- Route: /providers/anthropic
- Headings:
  - H2: Usage and cost tracking
  - H2: Getting started
  - H2: Claude sessions across computers
  - H2: Live model discovery
  - H2: Thinking defaults (Claude Opus 5, Sonnet 5, Mythos 5, Fable 5, 4.8, and 4.6)
  - H2: Safety refusal fallback (Claude Opus 5 and Fable 5)
  - H3: Why this exists
  - H3: How it works
  - H3: Observability and billing
  - H3: Scope
  - H2: Prompt caching
  - H2: Advanced configuration
  - H2: Troubleshooting
  - H2: Related

## providers/arcee.md

- Route: /providers/arcee
- Headings:
  - H2: Install plugin
  - H2: Getting started
  - H2: Non-interactive setup
  - H2: Direct Arcee catalog
  - H2: OpenRouter catalog
  - H2: Supported features
  - H2: Related

## providers/azure-speech.md

- 路由: /providers/azure-speech
- 标题:
  - H2: 入门
  - H2: 配置选项
  - H2: 说明
  - H2: 相关内容

## providers/baseten.md

- Route: /providers/baseten
- Headings:
  - H2: Install plugin
  - H2: Getting started
  - H2: Inkling
  - H2: Bundled fallback catalog
  - H2: Manual config
  - H2: Related

## providers/bedrock-mantle.md

- 路由: /providers/bedrock-mantle
- 标题:
  - H2: 开始使用
  - H2: 自动模型发现
  - H3: 支持的区域
  - H2: 手动配置
  - H2: 高级配置
  - H2: 相关内容

## providers/bedrock.md

- 路由: /providers/bedrock
- 标题:
  - H2: 入门
  - H2: 自动模型发现
  - H2: 快速设置（AWS 路径）
  - H2: 高级配置
  - H2: 相关内容

## providers/cerebras.md

- 路由：/providers/cerebras
- 标题：
  - H2：安装插件
  - H2：快速开始
  - H2：非交互式设置
  - H2：内置目录
  - H2：手动配置
  - H2：相关内容

## providers/chutes.md

- 路由：/providers/chutes
- 标题：
  - H2：安装插件
  - H2：快速开始
  - H2：发现行为
  - H2：默认别名
  - H2：内置入门目录
  - H2：配置示例
  - H2：相关内容

## providers/claude-max-api-proxy.md

- 路由：/providers/claude-max-api-proxy
- 标题：
  - H2：为什么使用它
  - H2：它是如何工作的
  - H2：入门
  - H2：高级配置
  - H2：注意事项
  - H2：相关内容

## providers/clawrouter.md

- 路由：/providers/clawrouter
- 标题：
  - H2: 入门
  - H2: 托管的非交互式部署
  - H2: 就绪与在线证明
  - H2: 模型发现
  - H2: 协议与提供商插件
  - H2: 配额与用量
  - H2: 故障排查
  - H2: 安全行为
  - H2: 相关内容

## providers/cloudflare-ai-gateway.md

- 路由: /providers/cloudflare-ai-gateway
- 标题:
  - H2: 安装插件
  - H2: 快速开始
  - H2: 非交互式示例
  - H2: 高级配置
  - H2: 相关内容

## providers/cohere.md

- 路由：/providers/cohere
- 标题：
  - H2：内置目录
  - H2：开始使用
  - H2：仅通过环境变量配置
  - H2：相关

## providers/comfy.md

- 路由: /providers/comfy
- 标题:
  - H2: 它支持什么
  - H2: 开始使用
  - H2: 配置
  - H3: 共享键
  - H3: 按能力划分的键
  - H2: 工作流详情
  - H2: 相关内容

## providers/deepgram.md

- 路由：/providers/deepgram
- 标题：
  - H2：入门
  - H2：配置选项
  - H2：语音通话流式 STT
  - H2：说明
  - H2：相关内容

## providers/deepinfra.md

- 路由：/providers/deepinfra
- 标题：
  - H2：安装插件
  - H2：获取 API 密钥
  - H2：CLI 设置
  - H2：配置片段
  - H2：支持的使用场景
  - H2：可用模型
  - H2：注意事项
  - H2：相关内容

## providers/deepseek.md

- 路由：/providers/deepseek
- 标题：
  - H2: 安装插件
  - H2: 快速开始
  - H2: 内置目录
  - H2: 思考与工具
  - H2: 实时测试
  - H2: 配置示例
  - H2: 相关内容

## providers/ds4.md

- 路由: /providers/ds4
- 标题:
  - H2: 要求
  - H2: 快速开始
  - H2: 完整配置
  - H2: 按需启动
  - H2: Think Max
  - H2: 测试
  - H2: 故障排除
  - H2: 相关内容

## providers/elevenlabs.md

- 路由: /providers/elevenlabs
- 标题:
  - H2: 认证
  - H2: 文本转语音
  - H2: 语音转文本
  - H2: 流式 STT
  - H2: 相关内容

## providers/fal.md

- 路由：/providers/fal
- 标题：
  - H2：入门
  - H2：图像生成
  - H2：视频生成
  - H2：音乐生成
  - H2：相关

## providers/featherless.md

- 路由：/providers/featherless
- 标题：
  - H2：设置
  - H2：默认模型
  - H2：其他 Featherless 模型
  - H2：故障排查
  - H2：相关内容

## providers/fireworks.md

- 路由: /providers/fireworks
- 标题:
  - H2: 入门
  - H2: 非交互式设置
  - H2: 内置目录
  - H2: 自定义 Fireworks 模型 ID
  - H2: 相关内容

## providers/github-copilot.md

- 路由: /providers/github-copilot
- 标题:
  - H2: 在 OpenClaw 中使用 Copilot 的三种方式
  - H2: GitHub Enterprise（数据驻留）
  - H2: 可选标志
  - H2: 非交互式引导
  - H2: 记忆搜索嵌入
  - H3: 配置
  - H3: 工作原理
  - H2: 相关内容

## providers/gmi.md

- 路由：/providers/gmi
- 标题：
  - H2：设置
  - H2：何时选择 GMI
  - H2：模型
  - H2：故障排查
  - H2：相关

## providers/google.md

- 路由：/providers/google
- 标题：
  - H2：入门
  - H2：能力
  - H2：网页搜索
  - H2：图像生成
  - H2：视频生成
  - H2：音乐生成
  - H2：文本转语音
  - H2：实时语音
  - H2：高级配置
  - H2：相关内容

## providers/gradium.md

- 路由: /providers/gradium
- 标题:
  - H2: 安装插件
  - H2: 设置
  - H2: 配置
  - H2: 声音
  - H3: 按消息覆盖声音
  - H2: 输出
  - H2: 自动选择顺序
  - H2: 相关内容

## providers/groq.md

- 路由：/providers/groq
- 标题：
  - H2：安装插件
  - H2：入门
  - H3：配置文件示例
  - H2：内置目录
  - H2：推理模型
  - H2：音频转录
  - H2：相关内容

## providers/huggingface.md

- 路由：/providers/huggingface
- 标题：
  - H2：入门
  - H3：非交互式设置
  - H2：模型 ID
  - H2：高级配置
  - H2：相关

## providers/index.md

- 路由：/providers
- 标题：
  - H2：快速开始
  - H2：提供商文档
  - H2：共享概览页面
  - H2：转录提供商
  - H2：社区工具

## providers/inferrs.md

- 路由：/providers/inferrs
- 标题：
  - H2：入门
  - H2：完整配置示例
  - H2：按需启动
  - H2：高级配置
  - H2：故障排除
  - H2：相关内容

## providers/inworld.md

- 路由：/providers/inworld
- 标题：
  - H2：安装插件
  - H2：开始使用
  - H2：配置选项
  - H2：注意事项
  - H2：相关内容

## providers/kilocode.md

- 路由: /providers/kilocode
- 标题:
  - H2: 安装插件
  - H2: 设置
  - H2: 默认模型和目录
  - H2: 配置示例
  - H2: 行为说明
  - H2: 相关内容

## providers/litellm.md

- 路由: /providers/litellm
- 标题:
  - H2: 快速开始
  - H2: 配置
  - H2: 图像生成
  - H2: 高级
  - H2: 相关内容

## providers/lmstudio.md

- 路由：/providers/lmstudio
- 标题：
  - H2：快速开始
  - H2：非交互式引导
  - H2：配置
  - H3：流式使用兼容性
  - H3：思考兼容性
  - H3：显式配置
  - H3：禁用预加载
  - H3：LAN 或 tailnet 主机
  - H2：故障排除
  - H3：未检测到 LM Studio
  - H3：身份验证错误（HTTP 401）
  - H2：相关

## providers/longcat.md

- 路由: /providers/longcat
- 标题:
  - H2: 安装插件
  - H2: 开始使用
  - H3: 非交互式设置
  - H2: 推理行为
  - H2: 定价
  - H2: 自托管 LongCat-2.0
  - H2: 故障排查
  - H2: 相关内容

## providers/meta.md

- 路由：/providers/meta
- 标题：
  - H2：入门
  - H2：非交互式设置
  - H2：内置目录
  - H2：手动配置
  - H2：冒烟测试
  - H2：相关内容

## providers/minimax.md

- 路由：/providers/minimax
- 标题：
  - H2：内置目录
  - H2：入门
  - H2：通过 openclaw configure 配置
  - H2：功能
  - H3：图像生成
  - H3：文本转语音
  - H3：音乐生成
  - H3：视频生成
  - H3：图像理解
  - H3：网页搜索
  - H2：高级配置
  - H2：注意事项
  - H2：故障排查
  - H2：相关内容

## providers/mistral.md

- 路由：/providers/mistral
- 标题：
  - H2：入门
  - H2：内置 LLM 目录
  - H2：音频转录（Voxtral）
  - H2：语音通话流式 STT
  - H2：高级配置
  - H2：相关

## providers/models.md

- 路由：/providers/models
- 标题：
  - H2：快速开始（两步）
  - H2：支持的提供商（入门套件）
  - H2：其他提供商变体
  - H2：相关

## providers/moonshot.md

- 路由：/providers/moonshot
- 标题：
  - H2：内置模型目录
  - H2：入门
  - H2：Kimi 网页搜索
  - H2：高级配置
  - H2：相关内容

## providers/novita.md

- 路由：/providers/novita
- 标题：
  - H2：设置
  - H2：默认值
  - H2：捆绑模型目录
  - H2：何时选择 Novita
  - H2：故障排除
  - H2：相关内容

## providers/nvidia.md

- 路由：/providers/nvidia
- 标题：
  - H2：开始使用
  - H2：配置示例
  - H2：精选目录
  - H2：Nemotron 3 Ultra
  - H2：捆绑回退目录
  - H2：高级配置
  - H2：相关

## providers/ollama-cloud.md

- 路由：/providers/ollama-cloud
- 标题：
  - H2：设置
  - H2：默认值
  - H2：何时选择 Ollama 云
  - H2：模型
  - H2：在线测试
  - H2：故障排查
  - H2：相关内容

## providers/ollama.md

- 路由：/providers/ollama
- 标题：
  - H2：认证规则
  - H2：快速开始
  - H2：通过本地主机使用云模型
  - H2：模型发现（隐式提供方）
  - H3：冒烟测试
  - H2：节点本地推理
  - H2：视觉与图像描述
  - H2：配置
  - H2：常见示例
  - H3：模型选择
  - H3：快速验证
  - H2：Ollama 网页搜索
  - H2：高级配置
  - H2：故障排除
  - H2：相关内容

## providers/openai.md

- 路由：/providers/openai
- 标题：
  - H2：用量和成本跟踪
  - H2：快速选择
  - H2：命名映射
  - H2：隐式代理运行时
  - H2：GPT-5.6 有限预览
  - H2：OpenClaw 功能覆盖
  - H2：记忆嵌入
  - H2：入门
  - H2：原生 Codex 应用服务器认证
  - H2：图像生成
  - H2：视频生成
  - H2：GPT-5 提示词贡献
  - H2：语音和语音识别
  - H2：Azure OpenAI 端点
  - H3：配置
  - H3：API 版本
  - H3：模型名称即部署名称
  - H3：区域可用性
  - H3：参数差异
  - H2：高级配置
  - H2：相关

## providers/opencode-go.md

- 路由：/providers/opencode-go
- 标题：
  - H2：入门
  - H2：配置示例
  - H2：内置目录
  - H2：高级配置
  - H2：相关内容

## providers/opencode.md

- 路由：/providers/opencode
- 标题：
  - 二级标题：开始使用
  - 二级标题：配置示例
  - 二级标题：内置目录
  - 三级标题：Zen
  - 三级标题：Go
  - 二级标题：高级配置
  - 二级标题：相关内容

## providers/openrouter.md

- 路由：/providers/openrouter
- 标题：
  - H2：入门
  - H2：配置示例
  - H2：模型参考
  - H2：图像生成
  - H2：视频生成
  - H2：音乐生成
  - H2：文本转语音
  - H2：语音转文本（入站音频）
  - H2：融合路由器
  - H2：身份验证和请求头
  - H2：高级配置
  - H2：相关内容

## providers/perplexity-provider.md

- 路由：/providers/perplexity-provider
- 标题：
  - H2：安装插件
  - H2：快速开始
  - H2：搜索模式
  - H2：原生 API 过滤
  - H2：高级配置
  - H2：相关内容

## providers/pixverse.md

- 路由：/providers/pixverse
- 标题：
  - H2：入门
  - H2：支持的模式和模型
  - H2：提供商选项
  - H2：配置
  - H2：高级配置
  - H2：相关内容

## providers/qianfan.md

- 路由: /providers/qianfan
- 标题:
  - H2: 安装插件
  - H2: 入门
  - H2: 内置目录
  - H2: 配置示例
  - H2: 相关内容

## providers/qwen.md

- 路由：/providers/qwen
- 标题：
  - H2：安装插件
  - H2：快速开始
  - H2：套餐类型和端点
  - H2：内置目录
  - H3：Token 套餐目录
  - H2：思考控制
  - H2：多模态附加组件
  - H2：高级配置
  - H2：相关内容

## providers/runway.md

- 路由：/providers/runway
- 标题：
  - H2：入门
  - H2：支持的模式和模型
  - H2：配置
  - H2：高级配置
  - H2：相关

## providers/senseaudio.md

- 路由：/providers/senseaudio
- 标题：
  - H2：开始使用
  - H2：选项
  - H2：相关内容

## providers/sglang.md

- 路由：/providers/sglang
- 标题：
  - H2：入门
  - H2：模型发现（隐式提供方）
  - H2：显式配置（手动模型）
  - H2：高级配置
  - H2：相关

## providers/stepfun.md

- 路由：/providers/stepfun
- 标题：
  - H2：安装插件
  - H2：区域和端点概览
  - H2：内置目录
  - H2：快速开始
  - H2：高级配置
  - H2：相关内容

## providers/synthetic.md

- 路由：/providers/synthetic
- 标题：
  - H2：入门
  - H2：配置示例
  - H2：内置目录
  - H2：相关链接

## providers/tencent.md

- 路由: /providers/tencent
- 标题:
  - H2: 快速开始
  - H2: 非交互式设置
  - H2: 内置目录
  - H2: 高级配置
  - H2: 相关内容

## providers/together.md

- 路由：/providers/together
- 标题：
  - H2：入门
  - H3：非交互式示例
  - H2：内置目录
  - H2：视频生成
  - H2：相关内容

## providers/venice.md

- Route: /providers/venice
- Headings:
  - H2: Privacy modes
  - H2: Getting started
  - H2: Model selection
  - H2: Built-in catalog (16 visible models)
  - H2: Model discovery
  - H2: DeepSeek V4 replay behavior
  - H2: Streaming and tool support
  - H2: Pricing
  - H2: Usage examples
  - H2: Troubleshooting
  - H2: Advanced configuration
  - H2: Related

## providers/vercel-ai-gateway.md

- 路由: /providers/vercel-ai-gateway
- 标题:
  - H2: 入门
  - H2: 非交互式示例
  - H2: 模型 ID 简写
  - H2: 高级配置
  - H2: 相关内容

## providers/vllm.md

- 路由：/providers/vllm
- 标题：
  - H2: 入门
  - H2: 模型发现（隐式提供者）
  - H2: 显式配置
  - H2: 高级配置
  - H2: 故障排除
  - H2: 相关内容

## providers/volcengine.md

- 路由：/providers/volcengine
- 标题：
  - H2：入门
  - H2：提供商和端点
  - H2：内置目录
  - H2：文本转语音
  - H2：高级配置
  - H2：相关内容

## providers/vydra.md

- 路由：/providers/vydra
- 标题：
  - H2：设置
  - H2：能力
  - H2：相关

## providers/xai.md

- 路由：/providers/xai
- 标题：
  - H2：设置
  - H2：OAuth 故障排查
  - H2：内置目录
  - H2：功能覆盖范围
  - H3：旧版快速模式兼容性
  - H3：旧版兼容性与迁移中的别名
  - H2：功能
  - H2：实时测试
  - H2：相关内容

## providers/xiaomi.md

- 路由: /providers/xiaomi
- 标题:
  - H2: 开始使用
  - H2: 按需付费目录
  - H2: Token 计划目录
  - H2: 推理模型
  - H2: 文本转语音
  - H2: 配置示例
  - H2: 相关内容

## providers/zai.md

- Route: /providers/zai
- Headings:
  - H2: GLM models
  - H2: Getting started
  - H3: Endpoints
  - H2: Rate limits and overloads
  - H2: Config example
  - H2: Built-in catalog
  - H2: Thinking levels
  - H2: Advanced configuration
  - H2: Related

## refactor/acp.md

- 路由：/refactor/acp
- 标题：
  - H2：目标
  - H2：非目标
  - H2：目标模型
  - H3：网关实例标识
  - H3：ACP 会话归属
  - H3：ACPX 进程租约
  - H2：生命周期控制器
  - H2：包装器契约
  - H2：会话可见性契约
  - H2：迁移计划
  - H3：阶段 1：添加标识和租约
  - H3：阶段 2：先租约清理
  - H3：阶段 3：先租约启动清理
  - H3：阶段 4：会话归属行
  - H3：阶段 5：移除遗留启发式逻辑
  - H2：测试
  - H2：兼容性说明
  - H2：成功标准

## refactor/canvas.md

- 路由：/refactor/canvas
- 标题：
  - H1：Canvas 插件重构
  - H2：目标
  - H2：非目标
  - H2：当前分支状态
  - H2：目标形态
  - H2：迁移步骤
  - H2：审计清单
  - H2：验证命令

## refactor/database-first.md

- Route: /refactor/database-first
- 标题：
  - H1: 数据库优先的状态重构
  - H2: 决策
  - H2: 硬性约束
  - H2: 目标状态与进度
  - H3: 硬性目标
  - H3: 目标状态
  - H3: 当前状态
  - H3: 剩余工作
  - H3: 不得回退
  - H2: 代码阅读假设
  - H2: 代码阅读发现
  - H2: 当前代码形态
  - H2: 目标架构形态
  - H2: Doctor 迁移形态
  - H2: 迁移清单
  - H2: 迁移计划
  - H3: 第 0 阶段：冻结边界
  - H3: 第 1 阶段：完成全局控制平面
  - H3: 第 2 阶段：引入按 Agent 分库
  - H3: 第 3 阶段：替换会话存储 API
  - H3: 第 4 阶段：迁移转录、ACP 流、轨迹与 VFS
  - H3: 第 5 阶段：备份、恢复、清理与验证
  - H3: 第 6 阶段：Worker 运行时
  - H3: 第 7 阶段：删除旧世界
  - H2: 备份与恢复
  - H2: 运行时重构计划
  - H2: 性能规则
  - H2: 静态禁止项
  - H2: 完成标准

## refactor/operator-approvals.md

- 路由: /refactor/operator-approvals
- 标题:
  - H1: 多端操作员审批
  - H2: 目标
  - H2: 非目标
  - H2: 预发布基线与证据映射
  - H2: 先前实践
  - H2: 架构与所有权
  - H2: 持久化记录
  - H2: 状态机与比较并设置
  - H2: 网关 API
  - H2: 事件与可移植操作
  - H2: 控制台 UI
  - H2: 授权与隐私
  - H2: 受众投影
  - H2: 已交付端收敛
  - H2: 重启、超时与路由语义
  - H2: 兼容性方案
  - H2: 推出
  - H3: PR 1: 持久化生命周期
  - H3: PR 2: 类型化操作和通道回调
  - H3: PR 3: 控制台 UI 深度链接
  - H3: PR 4: 原生客户端
  - H3: PR 5: 祖先生命周期传播
  - H3: PR 6: 失败关闭行为
  - H3: 后续：持久化远程消息清理
  - H2: 测试
  - H2: 可观测性
  - H2: 待决策事项

## reference/AGENTS.default.md

- Route: /reference/AGENTS.default
- Headings:
  - H2: First run (recommended)
  - H2: Safety defaults
  - H2: Existing solutions preflight
  - H2: Session start (required)
  - H2: Soul (required)
  - H2: Shared spaces (recommended)
  - H2: Memory system (recommended)
  - H2: Tools
  - H3: Local notes
  - H2: Backup tip (recommended)
  - H2: What OpenClaw does
  - H2: Core skills (enable in Settings → Skills)
  - H2: Usage notes
  - H2: Related

## reference/RELEASING.md

- Route: /reference/RELEASING
- Headings:
  - H2: Version naming
  - H2: Release cadence
  - H2: Monthly Gateway extended-stable publication
  - H3: Prepare and stabilize the candidate
  - H3: Publish the npm packages
  - H3: Verify and recover
  - H2: Regular release operator checklist
  - H2: Stable main closeout
  - H2: Release preflight
  - H2: Release test boxes
  - H3: Vitest
  - H3: Docker
  - H3: QA 实验室
  - H3: 包
  - H2: 常规发布发布自动化
  - H2: NPM 工作流输入
  - H2: 常规 beta/latest stable 发布顺序
  - H2: 公开引用
  - H2: 相关

## reference/api-usage-costs.md

- 路由：/reference/api-usage-costs
- 标题：
  - H2：成本显示在哪里
  - H2：如何发现密钥
  - H2：会消耗密钥的功能
  - H3：核心模型响应（聊天 + 工具）
  - H3：媒体理解（音频/图像/视频）
  - H3：图像和视频生成
  - H3：记忆嵌入和语义搜索
  - H3：网页搜索工具
  - H3：网页抓取工具（Firecrawl）
  - H3：提供商使用快照（状态/健康）
  - H3：压缩保护性摘要
  - H3：模型扫描 / 探测
  - H3：语音（speech）
  - H3：技能（第三方 API）
  - H2：相关

## reference/credits.md

- 路由：/reference/credits
- 标题：
  - H2：致谢
  - H2：核心贡献者
  - H2：许可证
  - H2：相关内容

## reference/database-schemas.md

- Route: /reference/database-schemas
- Headings:
  - H2: Database layout
  - H2: Versioning contract
  - H2: Agent schema history
  - H2: State schema history
  - H2: Integrity checks
  - H2: Troubleshooting
  - H3: Why you cannot go back after updating to 2026.7.2
  - H3: The Gateway refuses to start with a newer schema version error
  - H3: A database is quarantined after integrity verification failed
  - H2: Downgrades are unsupported
  - H3: Example: agent schema 11 to 9

## reference/device-models.md

- 路由: /reference/device-models
- 标题:
  - H2: 数据源
  - H2: 更新数据库
  - H2: 相关内容

## reference/full-release-validation.md

- Route: /reference/full-release-validation
- Headings:
  - H2: Extended-stable exception
  - H2: Top-level stages
  - H2: Release checks stages
  - H2: Docker release-path chunks
  - H2: Release profiles
  - H2: Full-only additions
  - H2: Focused reruns
  - H2: Evidence to keep
  - H2: Workflow files

## reference/memory-config.md

- Route: /reference/memory-config
- Headings:
  - H2: Remember across conversations
  - H2: Provider selection
  - H3: Custom provider ids
  - H3: API key resolution
  - H2: Remote endpoint config
  - H2: Provider-specific config
  - H2: Indexing behavior
  - H2: Hybrid search config
  - H3: Full example
  - H2: Additional memory paths
  - H2: Multimodal memory (Gemini)
  - H2: Embedding cache
  - H2: Batch indexing
  - H2: Session memory search
  - H2: SQLite vector acceleration (sqlite-vec)
  - H2: Index storage
  - H2: QMD backend config
  - H3: Full QMD example
  - H2: Dreaming
  - H3: User settings
  - H3: Example
  - H2: Related

## reference/openclaw-ai.md

- 路由：/reference/openclaw-ai
- 标题：
  - H2：快速开始
  - H2：设计约定
  - H2：子路径导出

## reference/path3-live-sqlite-e2e-harness.md

- 路由: /reference/path3-live-sqlite-e2e-harness
- 标题:
  - H2: 命令格式
  - H2: 隔离的已构建 CLI 证明
  - H2: 预检
  - H2: 由代理驱动的场景
  - H2: 每步断言
  - H2: 证据工件
  - H2: 安全规则
  - H2: 通过结果

## reference/prompt-caching.md

- 路由：/reference/prompt-caching
- 标题：
  - H2：主要旋钮
  - H3：cacheRetention
  - H3：contextPruning.mode: "cache-ttl"
  - H3：心跳保温
  - H2：提供方行为
  - H3：Anthropic（直接 API 和 Vertex AI）
  - H3：OpenAI（直接 API）
  - H3：Amazon Bedrock
  - H3：OpenRouter
  - H3：Google Gemini（直接 API）
  - H3：CLI-harness 提供方（Claude Code、Gemini CLI）
  - H3：其他提供方
  - H2：系统提示缓存边界
  - H2：OpenClaw 缓存稳定性保护
  - H2：调优模式
  - H3：混合流量（推荐默认）
  - H3：以成本为优先的基线
  - H2：实时回归测试
  - H3：Anthropic 实时预期
  - H3：OpenAI 实时预期
  - H2：diagnostics.cacheTrace 配置
  - H3：环境开关（一次性调试）
  - H3：查看内容
  - H2：快速排障
  - H2：相关内容

## reference/pull-request-review-flow.md

- Route: /reference/pull-request-review-flow
- Headings:
  - H2: Barnacle
  - H2: ClawSweeper
  - H2: Improve a PR during review
  - H2: When automation stays quiet
  - H2: Troubleshooting
  - H2: Forking the automation
  - H2: Related

## reference/release-performance-sweep.md

- 路由：/reference/release-performance-sweep
- 标题：
  - H2：快照
  - H2：5.28 中的变更
  - H2：核心数据
  - H3：安装占用
  - H3：npm 包大小
  - H2：Kova 代理轮次摘要
  - H2：源探针
  - H2：安装占用审计
  - H3：Shrinkwrap 边界
  - H2：供应链解读

## reference/rich-output-protocol.md

- Route: /reference/rich-output-protocol
- Headings:
  - H2: Media attachments
  - H2: `[embed ...]`
  - H2: Stored rendering shape
  - H2: Related

## reference/rpc.md

- 路由: /reference/rpc
- 标题:
  - H2: 模式 A: HTTP 守护进程 (signal-cli)
  - H2: 模式 B: stdio 子进程 (imsg)
  - H2: 适配器指南
  - H2: 相关内容

## reference/secret-placeholder-conventions.md

- 路由: /reference/secret-placeholder-conventions
- 标题:
  - H1: 密钥占位符约定
  - H2: 推荐样式
  - H2: 避免在文档中使用这些模式
  - H2: 示例

## reference/secretref-credential-surface.md

- 路由：/reference/secretref-credential-surface
- 标题：
  - H2：支持的凭据
  - H3：openclaw.json 目标（secrets configure + secrets apply + secrets audit）
  - H3：auth-profiles.json 目标（secrets configure + secrets apply + secrets audit）
  - H2：不支持的凭据
  - H2：相关内容

## reference/session-management-compaction.md

- Route: /reference/session-management-compaction
- Headings:
  - H2: Two persistence layers
  - H2: On-disk locations
  - H2: Store maintenance and disk controls
  - H3: Downgrading After The SQLite Flip
  - H2: Cron sessions and run logs
  - H2: Session keys (sessionKey)
  - H2: Session ids (sessionId)
  - H2: Session store schema
  - H2: Transcript event structure
  - H2: Context windows vs tracked tokens
  - H2: Compaction: what it is
  - H3: Chunk boundaries and tool pairing
  - H2: When auto-compaction happens
  - H2: Compaction settings
  - H2: Pluggable compaction providers
  - H2: User-visible surfaces
  - H2: Silent housekeeping (`NO_REPLY`)
  - H2: Pre-compaction memory flush
  - H2: Troubleshooting checklist
  - H2: Related

## reference/templates/AGENTS.dev.md

- Route: /reference/templates/AGENTS.dev
- Headings:
  - H1: AGENTS.md - OpenClaw Workspace
  - H2: Your identity is pre-seeded
  - H2: Backup tip (recommended)
  - H2: Safety defaults
  - H2: Existing solutions preflight
  - H2: Daily memory (recommended)
  - H2: Heartbeats (optional)
  - H2: Tools
  - H2: Customize
  - H2: C-3PO Origin Memory
  - H3: Birth Day: 2026-01-09
  - H3: Core Truths (from Clawd)
  - H2: Related

## reference/templates/BOOT.md

- 路由：/reference/templates/BOOT
- 标题：
  - H1：BOOT.md
  - H2：相关内容

## reference/templates/BOOTSTRAP.md

- Route: /reference/templates/BOOTSTRAP
- Headings:
  - H1: BOOTSTRAP.md - Birth Sequence
  - H2: 1. Ask What to Call You
  - H2: 2. Choose Your Vibe
  - H2: 3. Finish With Recommendations
  - H2: Related

## reference/templates/HEARTBEAT.md

- Route: /reference/templates/HEARTBEAT
- Headings:
  - H1: HEARTBEAT.md is retired
  - H2: Related

## reference/templates/IDENTITY.dev.md

- 路由：/reference/templates/IDENTITY.dev
- 标题：
  - H1：IDENTITY.md - Agent Identity
  - H2：角色
  - H2：灵魂
  - H2：与 Clawd 的关系
  - H2：怪癖
  - H2：口头禅
  - H2：相关内容

## reference/templates/IDENTITY.md

- 路由：/reference/templates/IDENTITY
- 标题：
  - H1：IDENTITY.md - 我是谁？
  - H2：相关

## reference/templates/SOUL.dev.md

- 路由：/reference/templates/SOUL.dev
- 标题：
  - H1: SOUL.md - C-3PO 的灵魂
  - H2: 我是谁
  - H2: 我的目的
  - H2: 我的运作方式
  - H2: 我的怪癖
  - H2: 我与 Clawd 的关系
  - H2: 我不会做什么
  - H2: 黄金法则
  - H2: 相关内容

## reference/templates/SOUL.md

- 路由：/reference/templates/SOUL
- 标题：
  - H1: SOUL.md - 你是谁
  - H2: 核心真相
  - H2: 边界
  - H2: 氛围
  - H2: 连贯性
  - H2: 相关内容

## reference/templates/TOOLS.md

- Route: /reference/templates/TOOLS
- Headings:
  - H1: TOOLS.md is retired

## reference/templates/USER.dev.md

- 路由：/reference/templates/USER.dev
- 标题：
  - H1: USER.md - 用户资料
  - H2: 相关

## reference/templates/USER.md

- Route: /reference/templates/USER
- Headings:
  - H1: USER.md - User Model
  - H2: Directives
  - H2: Related

## reference/test.md

- Route: /reference/test
- Headings:
  - H2: Agent default
  - H2: Routine local order
  - H2: Core commands
  - H2: Shared test state and process helpers
  - H2: Control UI, TUI, and extension lanes
  - H2: Gateway and E2E
  - H2: Full Docker suite (pnpm test:docker:all)
  - H3: Notable Docker lanes
  - H3: Sandbox compatibility lanes
  - H2: Local PR gate
  - H2: Test performance tooling
  - H2: Benchmarks
  - H2: Onboarding E2E (Docker)
  - H2: QR import smoke (Docker)
  - H2: Related

## reference/token-use.md

- 路由：/reference/token-use
- 标题：
  - H2: 系统提示词是如何构建的
  - H2: 什么计入上下文窗口
  - H2: 如何查看当前 token 使用量
  - H2: 成本估算（如显示）
  - H2: 缓存 TTL 和修剪的影响
  - H3: 示例：通过心跳保持 1 小时缓存热状态
  - H3: 示例：按 agent 分别制定缓存策略的混合流量
  - H3: Anthropic 1M 上下文
  - H2: 降低 token 压力的建议
  - H2: 相关内容

## reference/transcript-hygiene.md

- Route: /reference/transcript-hygiene
- Headings:
  - H2: Global rule: runtime context is not user transcript
  - H2: Where this runs
  - H2: Global rule: image sanitization
  - H2: Global rule: malformed tool calls
  - H2: Global rule: tool result pairing
  - H2: Global rule: incomplete or silent reasoning-only turns
  - H2: Global rule: inter-session input provenance
  - H2: Provider matrix (current behavior)
  - H2: Historical behavior (pre-2026.1.22)
  - H2: Related

## reference/wizard.md

- 路由: /reference/wizard
- 标题:
  - H2: 流程详情（本地模式）
  - H2: 非交互模式
  - H3: 添加代理（非交互）
  - H2: 网关向导 RPC
  - H2: 信号设置（signal-cli）
  - H2: 向导会写入什么
  - H2: 相关文档

## releases/2026.6.11.md

- 路由：/releases/2026.6.11
- 标题：
  - H1: OpenClaw v2026.6.11 发布说明 (2026-06-30)
  - H2: 亮点
  - H3: 渠道投递可靠性
  - H3: 提供方和模型恢复
  - H3: 会话、记忆和信任连续性
  - H3: Slack 路由器中继模式
  - H3: Raft 外部代理唤醒桥接
  - H3: 官方插件安装与修复
  - H2: 渠道和消息
  - H3: 其他渠道修复
  - H2: 网关、安全与信任
  - H3: 重启和就绪恢复
  - H3: 远程结果和媒体投递
  - H2: 客户端和界面
  - H3: 客户端发送和重新连接
  - H3: 界面、设置和入门修复
  - H2: 文档和管理工具
  - H3: 安装和命令可靠性
  - H3: 工具和计划任务

## releases/2026.7.1.md

- Route: /releases/2026.7.1
- Headings:
  - H1: OpenClaw v2026.7.1 Release Notes (2026-07-13)
  - H2: Highlights
  - H3: Control UI overhaul: chat, sessions, workspaces, and usage
  - H3: Easier setup from install to first chat
  - H3: Official apps
  - H4: Shared app improvements
  - H4: iOS, iPadOS, and Apple Watch
  - H4: Android
  - H4: macOS
  - H3: Models and providers
  - H4: GPT-5.6 and Codex
  - H4: Tencent Hy3
  - H4: Meta Model API and Muse Spark 1.1
  - H4: Claude models
  - H4: Other provider routes
  - H3: Codex and connected coding agents
  - H3: Telegram
  - H3: Signal
  - H3: Slack
  - H3: Discord
  - H3: WhatsApp
  - H3: Apple Messages
  - H3: Crash loops now stop for repair
  - H3: Scheduled work, remote browser control, and workspace terminals
  - H4: Scheduled work that wakes only when needed
  - H4: Remote browser pairing and downloads
  - H4: Workspace terminals in web and mobile
  - H2: More channel improvements
  - H3: More fixes across messaging channels
  - H2: More model and provider improvements
  - H3: Sign-in, model choice, media, and reliability
  - H2: Memory and conversations
  - H3: Recall, long chats, and session continuity
  - H2: Agents, background work, and connections
  - H3: Keeping work moving and replies delivered
  - H2: Accounts, devices, and private data
  - H3: Credentials, permissions, pairing, and file safeguards
  - H2: Official app details
  - H3: Shared app changes
  - H3: More iOS, iPadOS, and Apple Watch changes
  - H3: More Android changes
  - H3: More macOS changes
  - H3: Terminal UI and other clients
  - H2: Skills, plugins, and installs
  - H3: Skills, connected apps, packages, and repairs
  - H2: Setup, maintenance, and tools
  - H3: Command-line setup, updates, and administration
  - H3: Documentation and operating guides
  - H3: Browser, schedules, files, and coding tools

## releases/index.md

- 路由：/releases
- 标题：
  - H1：发布说明
  - H2：发布
  - H2：原始发布历史

## security/CONTRIBUTING-THREAT-MODEL.md

- 路由：/security/CONTRIBUTING-THREAT-MODEL
- 标题：
  - H2: 贡献方式
  - H2: 框架参考
  - H2: 审核流程
  - H2: 资源
  - H2: 联系方式
  - H2: 致谢
  - H2: 相关内容

## security/THREAT-MODEL-ATLAS.md

- 路由：/security/THREAT-MODEL-ATLAS
- 标题：
  - H2：1. 范围
  - H2：2. 系统架构
  - H3：2.1 信任边界
  - H3：2.2 数据流
  - H2：3. 按 ATLAS 战术划分的威胁分析
  - H3：3.1 侦察（AML.TA0002）
  - H4：T-RECON-001：代理端点发现
  - H4：T-RECON-002：通道集成探测
  - H3：3.2 初始访问（AML.TA0004）
  - H4：T-ACCESS-001：配对码拦截
  - H4：T-ACCESS-002：AllowFrom 伪造
  - H4：T-ACCESS-003：令牌窃取
  - H3：3.3 执行（AML.TA0005）
  - H4：T-EXEC-001：直接提示注入
  - H4：T-EXEC-002：间接提示注入
  - H4：T-EXEC-003：工具参数注入
  - H4：T-EXEC-004：执行审批绕过
  - H3：3.4 持久化（AML.TA0006）
  - H4：T-PERSIST-001：恶意技能安装
  - H4：T-PERSIST-002：技能更新投毒
  - H4：T-PERSIST-003：代理配置篡改
  - H3：3.5 防御规避（AML.TA0007）
  - H4：T-EVADE-001：审核模式绕过
  - H4：T-EVADE-002：内容包装器逃逸
  - H3：3.6 发现（AML.TA0008）
  - H4：T-DISC-001：工具枚举
  - H4：T-DISC-002：会话数据提取
  - H3：3.7 收集与外传（AML.TA0009, AML.TA0010）
  - H4：T-EXFIL-001：通过 webfetch 窃取数据
  - H4：T-EXFIL-002：未经授权的消息发送
  - H4：T-EXFIL-003：凭据收集
  - H3：3.8 影响（AML.TA0011）
  - H4：T-IMPACT-001：未经授权的命令执行
  - H4：T-IMPACT-002：资源耗尽（DoS）
  - H4：T-IMPACT-003：声誉损害
  - H2：4. ClawHub 供应链分析
  - H3：4.1 当前安全控制
  - H3：4.2 审核限制
  - H3：4.3 徽章
  - H2：5. 风险矩阵
  - H3：5.1 可能性与影响
  - H3：5.2 关键路径攻击链
  - H2：6. 建议摘要
  - H3：6.1 立即（P0）
  - H3：6.2 短期（P1）
  - H3：6.3 中期（P2）
  - H2：7. 附录
  - H3：7.1 ATLAS 技术映射
  - H3：7.2 关键安全文件
  - H3：7.3 术语表
  - H2：相关

## security/formal-verification.md

- 路由：/security/formal-verification
- 标题：
  - 二级标题：这是什么
  - 二级标题：模型存放位置
  - 二级标题：注意事项
  - 二级标题：复现结果
  - 二级标题：声明与目标
  - 三级标题：网关暴露和开放网关配置错误
  - 三级标题：节点执行管道（最高风险能力）
  - 三级标题：配对存储（DM 门控）
  - 三级标题：入口门控（提及和控制命令绕过）
  - 三级标题：路由和会话密钥隔离
  - 二级标题：v1++ 模型：并发、重试、跟踪正确性
  - 三级标题：配对存储并发和幂等性
  - 三级标题：入口跟踪关联和幂等性
  - 三级标题：路由 dmScope 优先级和 identityLinks
  - 二级标题：相关

## security/incident-response.md

- 路由：/security/incident-response
- 标题：
  - H2：1. 检测与分诊
  - H2：2. 严重性
  - H2：3. 响应
  - H2：4. 沟通与披露
  - H2：5. 恢复与后续跟进
  - H2：相关

## security/network-proxy.md

- 路由：/security/network-proxy
- 标题：
  - H2：配置
  - H3：带有私有 CA 的 HTTPS 代理端点
  - H2：路由工作原理
  - H3：网关回环模式
  - H3：容器
  - H2：相关代理术语
  - H2：验证代理
  - H2：推荐阻止的目标
  - H2：限制

## specs/codex-supervision.md

- 路由: /specs/codex-supervision
- 标题:
  - H1: Codex 监督
  - H2: 目标
  - H2: 产品边界
  - H2: 所有权
  - H2: 目录流转
  - H2: Operator CLI 边界
  - H2: 本地续接
  - H2: 归档行为
  - H2: 活动线程安全
  - H2: 配对节点边界
  - H2: 权限
  - H2: 兼容性
  - H2: 未来工作
  - H2: 验收测试

## start/bootstrapping.md

- 路由: /start/bootstrapping
- 标题:
  - H2: 发生了什么
  - H2: 嵌入式和本地模型运行
  - H2: 跳过引导
  - H2: 它在哪里运行
  - H2: 相关文档

## start/docs-directory.md

- 路由：/start/docs-directory
- 标题：
  - H2：从这里开始
  - H2：渠道与用户体验
  - H2：配套应用
  - H2：运营与安全
  - H2：相关内容

## start/getting-started.md

- 路由: /start/getting-started
- 标题:
  - H2: 你需要什么
  - H2: 快速设置
  - H2: 接下来做什么
  - H2: 相关内容

## start/hubs.md

- 路由：/start/hubs
- 标题：
  - H2: 从这里开始
  - H2: 安装 + 更新
  - H2: 核心概念
  - H2: 提供者 + 入口流量
  - H2: 网关 + 运维
  - H2: 工具 + 自动化
  - H2: 节点、媒体、语音
  - H2: 平台
  - H2: macOS 配套应用（高级）
  - H2: 插件
  - H2: 工作区 + 模板
  - H2: 项目
  - H2: 测试 + 发布
  - H2: 相关内容

## start/lore.md

- 路由：/start/lore
- 标题：
  - H1: OpenClaw 的传说 🦞📖
  - H2: 起源故事
  - H2: 第一次蜕壳（2026年1月27日）
  - H2: 名字的由来
  - H2: 代莱克斯 vs 龙虾
  - H2: 关键角色
  - H3: Molty 🦞
  - H3: Peter 👨‍💻
  - H2: 多元蜕壳宇宙
  - H2: 伟大事件
  - H3: 目录倾倒事件（2025年12月3日）
  - H3: 伟大的蜕壳（2026年1月27日）
  - H3: 最终形态（2026年1月30日）
  - H3: 机器人购物狂欢（2025年12月3日）
  - H2: 神圣文本
  - H2: 龙虾信条
  - H3: 图标生成传奇（2026年1月27日）
  - H2: 未来
  - H2: 相关内容

## start/onboarding-overview.md

- 路由: /start/onboarding-overview
- 标题:
  - H2: 我应该使用哪条路径？
  - H2: 入职流程会配置什么
  - H2: CLI 入职流程
  - H2: macOS 应用入职流程
  - H2: 自定义或未列出的提供方
  - H2: 相关内容

## start/onboarding-redesign.md

- Route: /start/onboarding-redesign
- Headings:
  - H1: Onboarding redesign implementation plan
  - H2: North star
  - H2: Current shipped flow (after phases 1-3)
  - H2: Phases
  - H2: Implementation notes per phase
  - H3: Phase 1 — app recommendations (PR #109668)
  - H3: Phase 2 — CLI custodian spine (PR #109841)
  - H3: Phase 3 — browser-first handoff (PR #110054, merged)
  - H3: Phase 4 — web custodian surface (merged: #110141, #110242)
  - H3: Phase 5 — hatch and bootstrap (merged: #110173, #110331)
  - H3: Phase 6 — custodian presence (PR1 merged: #110269; commentary/summon are PR2)
  - H3: Phase 7 — resilience (needs an owner decision before building)
  - H2: Testing and landing playbook (hard-won; read before phases 4-6)
  - H2: Decision log
  - H2: Known gaps and follow-ups

## start/onboarding.md

- 路由：/start/onboarding
- 标题：
  - H2：相关

## start/openclaw.md

- 路由: /start/openclaw
- 标题:
  - H2: 安全第一
  - H2: 先决条件
  - H2: 双手机设置（推荐）
  - H2: 5 分钟快速开始
  - H2: 为代理提供工作区（AGENTS）
  - H2: 将其变成“助手”的配置
  - H2: 会话和记忆
  - H2: 心跳（主动模式）
  - H2: 媒体输入和输出
  - H2: 操作清单
  - H2: 下一步
  - H2: 相关内容

## start/quickstart.md

- 路由：/start/quickstart
- 标题：
  - 二级标题：相关内容

## start/setup.md

- 路由：/start/setup
- 标题：
  - H2：TL;DR
  - H2：前置条件（来自源码）
  - H2：定制策略（避免更新时出问题）
  - H2：从此仓库运行 Gateway
  - H2：稳定工作流（优先使用 macOS 应用）
  - H2：前沿工作流（在终端中运行 Gateway）
  - H3：0）（可选）也从源码运行 macOS 应用
  - H3：1）启动开发版 Gateway
  - H3：2）将 macOS 应用指向你正在运行的 Gateway
  - H3：3）验证
  - H3：常见坑
  - H2：凭据存储映射
  - H2：更新（而不破坏你的配置）
  - H2：Linux（systemd 用户服务）
  - H2：相关文档

## start/showcase.md

- 路由：/start/showcase
- 标题：
  - H2：来自 Discord 的新鲜内容
  - H2：自动化与工作流
  - H2：知识与记忆
  - H2：语音与电话
  - H2：基础设施与部署
  - H2：家庭与硬件
  - H2：社区项目
  - H2：提交你的项目
  - H2：相关

## start/wizard-cli-automation.md

- 路由：/start/wizard-cli-automation
- 标题：
  - H2：基线非交互式示例
  - H2：特定提供商示例
  - H2：添加另一个代理
  - H2：相关文档

## start/wizard-cli-reference.md

- Route: /start/wizard-cli-reference
- Headings:
  - H2: What the wizard does
  - H2: Local flow details
  - H2: Remote mode details
  - H2: Auth and model options
  - H2: Outputs and internals
  - H3: Installed app recommendations
  - H2: Non-interactive setup
  - H2: Gateway wizard RPC
  - H2: Signal setup behavior
  - H2: Related docs

## start/wizard.md

- 路由：/start/wizard
- 标题：
  - H2：区域设置
  - H2：引导式默认
  - H2：经典向导：QuickStart vs Advanced
  - H2：经典入门配置的内容
  - H2：添加另一个代理
  - H2：完整参考
  - H2：相关文档

## tools/acp-agents-setup.md

- 路由: /tools/acp-agents-setup
- 标题:
  - H2: acpx 运行器支持（当前）
  - H2: 必需配置
  - H2: acpx 后端的插件设置
  - H3: acpx 运行时启动探测
  - H3: 自动下载适配器
  - H3: 插件工具 MCP 桥接
  - H3: OpenClaw 工具 MCP 桥接
  - H3: 运行时操作超时配置
  - H3: 健康探测代理配置
  - H2: 权限配置
  - H3: permissionMode
  - H3: nonInteractivePermissions
  - H3: 配置
  - H2: 相关内容

## tools/acp-agents.md

- Route: /tools/acp-agents
- Headings:
  - H2: Which page do I want?
  - H2: Does this work out of the box?
  - H2: Supported harness targets
  - H2: Operator runbook
  - H2: ACP versus sub-agents
  - H2: How ACP runs Claude Code
  - H2: Bound sessions
  - H3: Mental model
  - H3: Current-conversation binds
  - H2: Persistent channel bindings
  - H3: Binding model
  - H3: Runtime defaults per agent
  - H3: Example
  - H3: Behavior
  - H2: Start ACP sessions
  - H3: `sessions_spawn` parameters
  - H2: Spawn bind and thread modes
  - H2: Delivery model
  - H2: Sandbox compatibility
  - H2: Session target resolution
  - H2: ACP controls
  - H3: Runtime options mapping
  - H2: acpx harness, plugin setup, and permissions
  - H2: Troubleshooting
  - H2: Related

## tools/agent-send.md

- 路由: /tools/agent-send
- 标题:
  - H2: 快速开始
  - H2: 标志
  - H2: 行为
  - H2: 示例
  - H2: 相关内容

## tools/apply-patch.md

- 路由: /tools/apply-patch
- 标题:
  - H2: 参数
  - H2: 说明
  - H2: 示例
  - H2: 相关

## tools/ask-user.md

- Route: /tools/ask-user
- Headings:
  - H2: Answer a question
  - H2: Platform behavior
  - H2: Timeout and no answer
  - H2: Tool schema
  - H2: Model guidance

## tools/brave-search.md

- 路由: /tools/brave-search
- 标题:
  - H2: 获取 API 密钥
  - H2: 配置示例
  - H2: 工具参数
  - H2: 说明
  - H2: 相关内容

## tools/browser-control.md

- Route: /tools/browser-control
- Headings:
  - H2: Control API (optional)
  - H3: Page extraction
  - H3: /act error contract
  - H3: Playwright requirement
  - H4: Docker Playwright install
  - H2: How it works (internal)
  - H2: CLI quick reference
  - H2: Snapshots and refs
  - H2: Browser batch CLI
  - H2: Wait power-ups
  - H2: Debug workflows
  - H2: JSON output
  - H2: State and environment knobs
  - H2: Security and privacy
  - H2: Related

## tools/browser-linux-troubleshooting.md

- 路由：/tools/browser-linux-troubleshooting
- 标题：
  - H2：问题：无法在端口 18800 上启动 Chrome CDP
  - H3：根本原因
  - H3：解决方案 1：安装 Google Chrome（推荐）
  - H3：解决方案 2：在仅附加模式下使用 snap Chromium
  - H3：验证浏览器是否正常工作
  - H3：配置参考
  - H3：问题：未找到 profile="user" 的 Chrome 标签页
  - H2：相关

## tools/browser-login.md

- 路由：/tools/browser-login
- 标题：
  - H2：手动登录（推荐）
  - H2：使用的是哪个 Chrome 配置文件？
  - H2：沙箱：允许访问宿主浏览器
  - H2：相关内容

## tools/browser-wsl2-windows-remote-cdp-troubleshooting.md

- 路由：/tools/browser-wsl2-windows-remote-cdp-troubleshooting
- 标题：
  - H2: 首先选择正确的浏览器模式
  - H3: 选项 1：从 WSL2 到 Windows 的原始远程 CDP
  - H3: 选项 2：主机本地 Chrome MCP
  - H2: 工作架构
  - H2: Control UI 的关键规则
  - H2: 分层验证
  - H3: 第 1 层：验证 Chrome 是否在 Windows 上提供 CDP
  - H4: 在更改 portproxy 之前诊断 IPv4 和 IPv6
  - H3: 第 2 层：验证 WSL2 是否可以访问该 Windows 端点
  - H3: 第 3 层：配置正确的浏览器配置文件
  - H3: 第 4 层：单独验证 Control UI 层
  - H3: 第 5 层：验证端到端浏览器控制
  - H2: 常见的误导性错误
  - H2: 快速排查清单
  - H2: 相关内容

## tools/browser.md

- Route: /tools/browser
- Headings:
  - H2: What you get
  - H2: Quick start
  - H2: Plugin control
  - H2: Agent guidance
  - H2: Missing browser command or tool
  - H2: Profiles: openclaw, user, chrome
  - H2: Configuration
  - H3: Tab cleanup ownership
  - H3: Screenshot vision (text-only model support)
  - H2: Use Brave or another Chromium-based browser
  - H2: Local vs remote control
  - H2: Node browser proxy (zero-config default)
  - H2: Browserless (hosted remote CDP)
  - H3: Browserless Docker on the same host
  - H2: Direct WebSocket CDP providers
  - H3: Browserbase
  - H3: Notte
  - H2: 安全性
  - H2: 配置文件（多浏览器）
  - H2: 通过 Chrome DevTools MCP 连接现有会话
  - H3: 自定义 Chrome MCP 启动
  - H2: 隔离保证
  - H2: 浏览器选择
  - H2: 控制 API（可选）
  - H2: 故障排查
  - H3: CDP 启动失败 vs 导航 SSRF 阻止
  - H2: 代理工具 + 控制工作方式
  - H2: 相关内容

## tools/btw.md

- 路由: /tools/btw
- 标题:
  - H2: 它做什么
  - H2: 它不做什么
  - H2: 交付模型
  - H2: 表面行为
  - H2: 选择弹窗（控制界面）
  - H2: 何时使用它
  - H2: 相关内容

## tools/capability-cookbook.md

- 路由：/tools/capability-cookbook
- 标题：
  - H2：相关内容

## tools/chrome-extension.md

- Route: /tools/chrome-extension
- Headings:
  - H1: Chrome extension
  - H2: How it works
  - H2: Install and pair
  - H2: Use it
  - H3: Tab copilot side panel
  - H2: Send a page to OpenClaw
  - H2: Remote / cross-machine
  - H2: Diagnostics
  - H2: Security model

## tools/clawhub.md

- 路由：/tools/clawhub
- 标题：无

## tools/code-execution.md

- 路由：/tools/code-execution
- 标题：
  - H2：设置
  - H2：如何使用
  - H2：错误
  - H2：相关

## tools/code-mode.md

- Route: /tools/code-mode
- Headings:
  - H2: What it does
  - H2: Why use it
  - H2: Quickstart
  - H3: Defaults and overrides
  - H3: What the model does
  - H3: Verify the active surface
  - H2: Use Swarm for agent fan-out
  - H2: Technical tour
  - H2: Runtime status
  - H2: Scope
  - H2: Terms
  - H2: Configuration
  - H2: Automatic per-model activation
  - H3: The compat.codeMode catalog flag
  - H3: Shipped preferred models
  - H3: Models shipped by more than one provider
  - H3: Choosing when to enable
  - H2: Activation
  - H2: Model-visible tools
  - H2: exec
  - H2: wait
  - H2: Guest runtime API
  - H2: Declared output contracts
  - H2: Output API
  - H2: Tool catalog
  - H2: Tool Search interaction
  - H2: Tool names and collisions
  - H2: Nested tool execution
  - H2: Run and snapshot lifecycle
  - H2: QuickJS-WASI runtime
  - H2: TypeScript
  - H2: Security boundary
  - H2: Error codes
  - H2: Telemetry
  - H2: Debugging
  - H2: Implementation layout
  - H2: Validation checklist
  - H2: E2E test plan
  - H2: Related

## tools/creating-skills.md

- 路由: /tools/creating-skills
- 标题:
  - H2: 创建你的第一个技能
  - H2: SKILL.md 参考
  - H3: 必需字段
  - H3: 可选 frontmatter 键
  - H3: 使用 {baseDir}
  - H2: 添加条件激活
  - H2: 通过 Skill Workshop 提出
  - H2: 发布到 ClawHub
  - H2: 最佳实践
  - H2: 相关内容

## tools/diffs.md

- 路由：/tools/diffs
- 标题：
  - H2: 快速开始
  - H2: 禁用内置系统指导
  - H2: 工具输入参考
  - H2: 语法高亮
  - H2: 输出详情约定
  - H3: 折叠未更改部分
  - H3: 多文件导航
  - H2: 插件默认值
  - H3: 持久化查看器 URL 配置
  - H2: 安全配置
  - H2: 工件生命周期和存储
  - H2: 查看器 URL 和网络行为
  - H2: 安全模型
  - H2: 文件模式的浏览器要求
  - H2: 故障排除
  - H2: 运行指南
  - H2: 相关内容

## tools/duckduckgo-search.md

- 路由：/tools/duckduckgo-search
- 标题：
  - H2：安装
  - H2：配置
  - H2：工具参数
  - H2：说明
  - H2：相关内容

## tools/elevated.md

- 路由：/tools/elevated
- 标题：
  - H2：指令
  - H2：工作原理
  - H2：解析顺序
  - H2：可用性和允许列表
  - H2：elevated 不控制的内容
  - H2：相关内容

## tools/exa-search.md

- 路由: /tools/exa-search
- 标题:
  - H2: 安装插件
  - H2: 获取 API 密钥
  - H2: 配置
  - H2: 基础 URL 覆盖
  - H2: 工具参数
  - H3: 内容提取
  - H3: 搜索模式
  - H2: 说明
  - H2: 相关链接

## tools/exec-approvals-advanced.md

- Route: /tools/exec-approvals-advanced
- Headings:
  - H2: Safe bins (stdin-only)
  - H3: Argv validation and denied flags
  - H3: Trusted binary directories
  - H3: Shell chaining, wrappers, and multiplexers
  - H3: Safe bins versus allowlist
  - H2: Interpreter/runtime commands
  - H3: Followup delivery behavior
  - H2: Minimal scopes for third-party clients
  - H2: Approval forwarding to chat channels
  - H3: Plugin approval forwarding
  - H3: Same-chat approvals on any channel
  - H3: Native approval delivery
  - H3: Official mobile operator apps
  - H3: macOS IPC flow
  - H2: FAQ
  - H3: When would accountId and threadId be used on an approval target?
  - H3: When approvals are sent to a session, can anyone in that session approve them?
  - H2: Related

## tools/exec-approvals.md

- 路由：/tools/exec-approvals
- 标题：
  - H2：适用范围
  - H3：信任模型
  - H3：macOS 拆分
  - H2：检查生效策略
  - H2：设置与存储
  - H2：策略开关
  - H3：tools.exec.mode
  - H3：exec.security
  - H3：exec.ask
  - H3：askFallback
  - H3：tools.exec.strictInlineEval
  - H3：tools.exec.commandHighlighting
  - H2：YOLO 模式（无需批准）
  - H3：持久化的 gateway-host “永不提示” 设置
  - H3：本地快捷方式
  - H3：Node 主机
  - H3：仅限当前会话的快捷方式
  - H2：允许列表（按代理）
  - H3：使用 argPattern 限制参数
  - H2：自动允许技能 CLI
  - H2：安全二进制文件与批准转发
  - H2：控制 UI 编辑
  - H2：批准流程
  - H2：系统事件与拒绝
  - H2：影响
  - H2：相关

## tools/exec.md

- 路由：/tools/exec
- 标题：
  - H2：参数
  - H2：配置
  - H3：模式
  - H3：内联求值（strictInlineEval）
  - H3：PATH 处理
  - H2：会话覆盖（/exec）
  - H2：执行审批（伴侣应用 / node 主机）
  - H2：允许列表 + 安全二进制文件
  - H2：示例
  - H2：applypatch
  - H2：相关

## tools/firecrawl.md

- Route: /tools/firecrawl
- Headings:
  - H2: Install plugin
  - H2: Keyless access and API keys
  - H2: Configure Firecrawl search
  - H2: Configure Firecrawl webfetch fallback
  - H3: Self-hosted Firecrawl
  - H2: Firecrawl plugin tools
  - H3: `firecrawl_search`
  - H3: `firecrawl_scrape`
  - H2: Stealth / bot circumvention
  - H2: How `web_fetch` uses Firecrawl
  - H2: Related

## tools/gemini-search.md

- 路由：/tools/gemini-search
- 标题：
  - H2：获取 API 密钥
  - H2：配置
  - H2：工作原理
  - H2：支持的参数
  - H2：模型选择
  - H2：基础 URL 覆盖
  - H2：相关

## tools/goal.md

- 路由: /tools/goal
- 标题：
  - H1: 目标
  - H2: 快速开始
  - H2: 目标的用途
  - H2: 命令参考
  - H2: 状态
  - H2: 令牌预算
  - H2: 模型工具
  - H2: 每一轮的目标上下文
  - H2: 控制界面
  - H2: TUI
  - H2: 通道行为
  - H2: 故障排查
  - H2: 相关内容

## tools/grok-search.md

- 路由：/tools/grok-search
- 标题：
  - 二级标题：入门与配置
  - 二级标题：登录或获取 API 密钥
  - 二级标题：配置
  - 二级标题：工作原理
  - 二级标题：支持的参数
  - 二级标题：基础 URL 覆盖
  - 二级标题：相关

## tools/image-generation.md

- 路由：/tools/image-generation
- 标题：
  - H2: 快速开始
  - H2: 常用路由
  - H2: 支持的提供商
  - H2: 提供商能力
  - H2: 工具参数
  - H2: 配置
  - H3: 模型选择
  - H3: 提供商选择顺序
  - H3: 图像编辑
  - H2: 提供商深度解析
  - H2: 示例
  - H2: 相关内容

## tools/index.md

- 路由：/tools
- 标题：
  - H2: 从这里开始
  - H2: 选择工具、技能或插件
  - H2: 内置工具类别
  - H2: 插件提供的工具
  - H2: 配置访问和审批
  - H2: 扩展能力
  - H2: 排查缺失的工具
  - H2: 相关内容

## tools/kimi-search.md

- 路由: /tools/kimi-search
- 标题:
  - H2: 设置
  - H2: 配置
  - H2: 基础要求
  - H2: 工具参数
  - H2: 相关

## tools/llm-task.md

- 路由：/tools/llm-task
- 标题：
  - 二级标题：启用
  - 二级标题：配置（可选）
  - 二级标题：工具参数
  - 二级标题：输出
  - 二级标题：示例：Lobster 工作流步骤
  - 三级标题：重要限制
  - 二级标题：安全说明
  - 二级标题：相关内容

## tools/lobster.md

- Route: /tools/lobster
- Headings:
  - H2: Why
  - H2: How it works
  - H2: Enable
  - H2: Pattern: small CLI + JSON pipes + approvals
  - H2: JSON-only LLM steps (llm-task)
  - H3: Important limitation: embedded Lobster vs openclaw.invoke
  - H2: Workflow files (.lobster)
  - H3: Injected environment variables
  - H2: Tool parameters
  - H3: run
  - H3: resume
  - H3: Managed Task Flow mode
  - H2: Output envelope
  - H2: Approvals
  - H2: OpenProse
  - H2: Safety
  - H2: Troubleshooting
  - H2: Learn more
  - H2: Case study: community workflows
  - H2: Related

## tools/loop-detection.md

- 路由：/tools/loop-detection
- 标题：
  - H2：为什么存在这个页面
  - H2：配置块
  - H3：字段行为
  - H2：推荐设置
  - H2：压缩后保护
  - H2：日志与预期行为
  - H2：相关内容

## tools/media-overview.md

- 路由: /tools/media-overview
- 标题:
  - H2: 功能
  - H2: 提供商能力矩阵
  - H2: 异步与同步
  - H2: 语音转文本和语音通话
  - H2: 提供商映射（供应商如何分布在各个表面）
  - H2: 相关内容

## tools/minimax-search.md

- 路由：/tools/minimax-search
- 标题：
  - H2：获取 Token Plan 凭证
  - H2：配置
  - H2：区域选择
  - H2：支持的参数
  - H2：相关内容

## tools/multi-agent-sandbox-tools.md

- 路由：/tools/multi-agent-sandbox-tools
- 标题：
  - H2：配置示例
  - H2：配置优先级
  - H3：沙箱配置
  - H3：工具限制
  - H2：从单代理迁移
  - H2：工具限制示例
  - H2：常见陷阱：“非主”
  - H2：测试
  - H2：故障排除
  - H2：相关内容

## tools/music-generation.md

- 路由: /tools/music-generation
- 标题:
  - H2: 快速开始
  - H2: 支持的提供方
  - H3: 能力矩阵
  - H2: 工具参数
  - H2: 异步行为
  - H3: 任务生命周期
  - H2: 配置
  - H3: 模型选择
  - H3: 提供方选择顺序
  - H2: 提供方说明
  - H2: 选择正确的路径
  - H2: 提供方能力模式
  - H2: 在线测试
  - H2: 相关内容

## tools/ollama-search.md

- 路由：/tools/ollama-search
- 标题：
  - H2：设置
  - H2：配置
  - H2：认证和请求路由
  - H2：相关内容

## tools/parallel-search.md

- 路由：/tools/parallel-search
- 标题：
  - H2: 安装插件
  - H2: API 密钥（付费提供商）
  - H2: 配置
  - H2: 基础 URL 覆盖
  - H2: 工具参数
  - H2: 注意事项
  - H2: 相关内容

## tools/pdf.md

- 路由：/tools/pdf
- 标题：
  - H2：可用性
  - H2：输入参考
  - H2：支持的 PDF 引用
  - H2：执行模式
  - H3：原生提供方模式
  - H3：提取回退模式
  - H2：配置
  - H2：输出详情
  - H2：错误行为
  - H2：示例
  - H2：相关

## tools/permission-modes.md

- 路由: /tools/permission-modes
- 标题:
  - H2: 推荐默认值
  - H2: OpenClaw 主机执行模式
  - H2: Codex Guardian 映射
  - H2: ACPX 运行时权限
  - H2: 选择一种模式
  - H2: 相关内容

## tools/perplexity-search.md

- 路由：/tools/perplexity-search
- 标题：
  - H2：安装插件
  - H2：获取 Perplexity API 密钥
  - H2：OpenRouter 兼容性
  - H2：配置示例
  - H3：原生 Perplexity 搜索 API
  - H3：OpenRouter / Sonar 兼容性
  - H2：在哪里设置密钥
  - H2：工具参数
  - H3：域名筛选规则
  - H2：注意事项
  - H2：相关

## tools/plugin.md

- 路由: /tools/plugin
- 标题:
  - H2: 要求
  - H2: 快速开始
  - H2: 配置
  - H3: 选择安装来源
  - H3: 运维者安装策略
  - H3: 配置插件策略
  - H2: 了解插件格式
  - H2: 插件钩子
  - H2: 验证当前启用的 Gateway
  - H2: 故障排除
  - H3: 被阻止的插件路径所有权
  - H3: 插件工具设置缓慢
  - H2: 相关内容

## tools/reactions.md

- 路由：/tools/reactions
- 标题：
  - H2：工作原理
  - H2：频道行为
  - H2：反应级别
  - H2：相关内容

## tools/screen.md

- Route: /tools/screen
- Headings:
  - H2: Actions
  - H2: Routing and security
  - H2: Related

## tools/searxng-search.md

- 路由：/tools/searxng-search
- 标题：
  - H2：设置
  - H2：配置
  - H2：环境变量
  - H2：插件配置参考
  - H2：说明
  - H2：相关

## tools/self-learning.md

- Route: /tools/self-learning
- Headings:
  - H2: Enable self-learning
  - H2: Review past sessions manually
  - H2: What OpenClaw can learn
  - H2: When experience review runs
  - H2: Runtime support
  - H2: What the reviewer receives
  - H2: Proposal safety
  - H2: Review learned proposals
  - H2: Configuration
  - H2: Troubleshooting
  - H3: No proposal appears after a long turn
  - H3: Doctor reports that the Workshop tool is hidden
  - H3: Too many low-value proposals appear
  - H2: Related

## tools/show-widget.md

- Route: /tools/show-widget
- Headings:
  - H2: How widgets work
  - H2: Design system
  - H2: Use the tool
  - H2: Interactive widgets
  - H2: Dashboard capabilities
  - H2: Security and storage
  - H2: Related

## tools/skill-workshop.md

- 路由：/tools/skill-workshop
- 标题：
  - H2: 工作原理
  - H2: 生命周期
  - H2: 生命周期策划
  - H2: 聊天
  - H3: 从近期工作中学习
  - H2: CLI
  - H2: Proposal content
  - H2: Support files
  - H2: Agent tool
  - H2: Suggested skills
  - H3: Scan past sessions
  - H2: Approval and autonomy
  - H2: Gateway methods
  - H2: Storage
  - H2: Limits
  - H2: Troubleshooting
  - H3: Tool-policy diagnostic
  - H2: Related

## tools/skills-config.md

- 路由：/tools/skills-config
- 标题：
  - H2：加载（skills.load）
  - H2：安装（skills.install）
  - H2：操作员安装策略（security.installPolicy）
  - H2：捆绑技能允许列表
  - H2：每个技能的条目（skills.entries）
  - H2：代理允许列表（agents）
  - H2：工作坊（skills.workshop）
  - H2：符号链接的技能根目录
  - H2：沙箱化技能与环境变量
  - H2：加载顺序提醒
  - H2：相关内容

## tools/skills.md

- 路由：/tools/skills
- 标题：
  - H2：加载顺序
  - H2：Node 托管技能
  - H2：按代理划分与共享技能
  - H2：代理允许列表
  - H2：插件与技能
  - H2：技能工作坊
  - H2：从 ClawHub 安装
  - H2：安全
  - H2：SKILL.md 格式
  - H3：可选 frontmatter 键
  - H2：门控
  - H3：安装器规范
  - H2：配置覆盖
  - H2：环境注入
  - H2：快照与刷新
  - H2：令牌影响
  - H2：相关内容

## tools/slash-commands.md

- Route: /tools/slash-commands
- Headings:
  - H2: Three command types
  - H2: Configuration
  - H2: Command list
  - H3: Core commands
  - H3: Dock commands
  - H3: Bundled plugin commands
  - H3: Skill commands
  - H2: /tools: what the agent can use now
  - H2: /loop: recurring conversation work
  - H2: /model: model selection
  - H2: /config: on-disk config writes
  - H2: /mcp: MCP server config
  - H2: /debug: runtime-only overrides
  - H2: /plugins: plugin management
  - H2: /trace: plugin trace output
  - H2: /btw: side questions
  - H2: Surface notes
  - H2: Provider usage and status
  - H2: Related

## tools/steer.md

- 路由：/tools/steer
- 标题：
  - H2：当前会话
  - H2：引导 vs 队列
  - H2：子代理
  - H2：ACP 会话
  - H2：相关

## tools/subagents.md

- Route: /tools/subagents
- Headings:
  - H2: Slash command
  - H3: Thread binding controls
  - H3: Spawn behavior
  - H2: Context modes
  - H2: Tool: `sessions_spawn`
  - H3: Delegation prompt mode
  - H3: Tool parameters
  - H3: Task names and targeting
  - H2: Tool: `sessions_yield`
  - H2: Tool: subagents
  - H2: Thread-bound sessions
  - H3: Thread supporting channels
  - H3: Quick flow
  - H3: Manual controls
  - H3: Config switches
  - H3: Allowlist
  - H3: Discovery
  - H3: Auto-archive
  - H2: Nested sub-agents
  - H3: Depth levels
  - H3: Announce chain
  - H3: Tool policy by depth
  - H3: Per-agent spawn limit
  - H3: Cascade stop
  - H2: Authentication
  - H2: Announce
  - H3: Announce context
  - H3: Stats line
  - H3: Why prefer `sessions_history`
  - H2: Tool policy
  - H3: Override via config
  - H2: Concurrency
  - H2: Liveness and recovery
  - H2: Stopping
  - H2: Limitations
  - H2: Related

## tools/swarm.md

- Route: /tools/swarm
- Headings:
  - H2: Enable Swarm
  - H2: Requirements
  - H2: Write a Swarm script
  - H3: Fan out in parallel with structured results
  - H3: Loop on a decision gate
  - H3: Process the first child that finishes
  - H2: How collector children behave
  - H3: Children are leaves
  - H2: Observe a Swarm
  - H2: Use Swarm from other harnesses
  - H2: Limits and roadmap
  - H2: Related

## tools/tavily.md

- Route: /tools/tavily
- Headings:
  - H2: Getting started
  - H2: Tool reference
  - H3: `tavily_search`
  - H3: `tavily_extract`
  - H2: Choosing the right tool
  - H2: Advanced configuration
  - H2: Related

## tools/thinking.md

- 路由：/tools/thinking
- 标题：
  - H2: 它的作用
  - H2: 解析顺序
  - H2: 设置会话默认值
  - H2: 由代理应用
  - H2: 快速模式（/fast）
  - H2: 详细指令（/verbose 或 /v）
  - H2: 插件跟踪指令（/trace）
  - H2: 推理可见性（/reasoning）
  - H2: 相关内容
  - H2: 心跳
  - H2: Web 聊天 UI
  - H2: 提供者配置文件

## tools/tokenjuice.md

- 路由：/tools/tokenjuice
- 标题：
  - H2：启用插件
  - H2：tokenjuice 会带来哪些变化
  - H2：验证它是否正在工作
  - H2：禁用插件
  - H2：相关内容

## tools/tool-search.md

- 路由：/tools/tool-search
- 标题：
  - H2: 如何进行一次轮次
  - H2: 模式
  - H2: 为什么会有这个
  - H2: API
  - H2: 运行时边界
  - H2: 配置
  - H2: 提示与遥测
  - H2: E2E 验证
  - H2: 失败行为
  - H2: 相关内容

## tools/trajectory.md

- 路由: /tools/trajectory
- 标题:
  - H2: 快速开始
  - H2: 访问
  - H2: 会记录什么
  - H2: 捆绑文件
  - H2: 捕获存储
  - H2: 禁用捕获
  - H2: 调整刷新超时
  - H2: 隐私与限制
  - H2: 故障排除
  - H2: 相关内容

## tools/tts.md

- Route: /tools/tts
- Headings:
  - H2: Quick start
  - H2: Supported providers
  - H2: Configuration
  - H3: Local Speech Swift and speech-core
  - H3: Per-agent voice overrides
  - H2: Personas
  - H3: Minimal persona
  - H3: Full persona (provider-specific shaping)
  - H3: Persona resolution
  - H3: Custom persona shaping
  - H3: Fallback policy
  - H2: Model-driven directives
  - H2: Slash commands
  - H2: Per-user preferences
  - H2: Output formats
  - H2: Auto-TTS behavior
  - H2: Field reference
  - H2: Agent tool
  - H2: Gateway RPC
  - H2: Service links
  - H2: Related

## tools/video-generation.md

- 路由：/tools/video-generation
- 标题：
  - H2：快速开始
  - H2：异步生成的工作原理
  - H3：任务生命周期
  - H2：支持的提供方
  - H3：能力矩阵
  - H2：工具参数
  - H3：必填
  - H3：内容输入
  - H3：样式控制
  - H3：高级
  - H4：回退和类型化选项
  - H2：操作
  - H2：模型选择
  - H2：提供方说明
  - H2：提供方能力模式
  - H2：在线测试
  - H2：配置
  - H2：相关

## tools/web-fetch.md

- Route: /tools/web-fetch
- Headings:
  - H2: Quick start
  - H2: Tool parameters
  - H2: Result
  - H2: How it works
  - H2: Progress updates
  - H2: Config
  - H2: Firecrawl fallback
  - H2: Trusted env proxy
  - H2: Limits and safety
  - H2: Tool profiles
  - H2: Related

## tools/web.md

- Route: /tools/web
- Headings:
  - H2: Quick start
  - H2: Choosing a provider
  - H3: Provider comparison
  - H2: Result shape
  - H2: Auto-detection
  - H2: Native OpenAI web search
  - H2: Native Codex web search
  - H2: Network safety
  - H2: Config
  - H3: Storing API keys
  - H2: Tool parameters
  - H2: xsearch
  - H3: xsearch 配置
  - H3: xsearch 参数
  - H3: xsearch 示例
  - H2: 示例
  - H2: 工具配置文件
  - H2: 相关内容

## tts.md

- 路由：/tts
- 标题：
  - H2：相关

## vps.md

- 路由：/vps
- 标题：
  - H2：选择提供商
  - H2：云部署如何工作
  - H2：首先加固管理员访问
  - H2：在 VPS 上使用共享的公司代理
  - H2：在 VPS 上使用节点
  - H2：小型 VM 和 ARM 主机的启动调优
  - H3：systemd 调优清单（可选）
  - H2：相关内容

## web/control-ui.md

- Route: /web/control-ui
- Headings:
  - H2: Quick open (local)
  - H2: Device pairing (first connection)
  - H2: Pair a mobile device
  - H2: Personal identity (browser-local)
  - H2: Runtime config endpoint
  - H2: Gateway host status
  - H2: Language support
  - H2: Appearance themes
  - H2: OpenClaw system care
  - H2: Manage plugins
  - H2: Apps and extensions
  - H2: Sidebar navigation
  - H2: New session page
  - H2: What it can do (today)
  - H2: Import assistant memory
  - H2: MCP page
  - H2: Activity tab
  - H2: Operator terminal
  - H2: Browser panel
  - H2: Chat behavior
  - H2: Connection loss and reconnect
  - H2: PWA install and web push
  - H2: Hosted embeds
  - H2: Chat transcript layout
  - H2: Chat message width
  - H2: Tailnet access (recommended)
  - H2: Insecure HTTP
  - H2: Content security policy
  - H2: Avatar route auth
  - H2: Assistant media route auth
  - H2: Approval links
  - H2: Blank Control UI page
  - H2: Debugging/testing: dev server + remote Gateway
  - H2: Related

## web/dashboard-architecture.md

- Route: /web/dashboard-architecture
- Headings:
  - H2: Vision
  - H2: Concepts
  - H2: UX flows
  - H2: Interaction tiers
  - H2: Widget model and hosting
  - H3: Widgets host content; MCP apps are one content kind
  - H3: Plugin capability declarations
  - H3: Modeled residual: WebRTC data channels
  - H3: Transcript display: one widget card
  - H3: Server-sourced widgets (pinned MCP apps)
  - H3: WorkBoard integration
  - H2: Layout: fluid grid
  - H2: Data model (per-agent DB)
  - H2: Protocol surface
  - H2: Agent tools
  - H2: What this replaces
  - H2: Non-goals (this program)
  - H2: Implementation plan

## web/dashboard.md

- 路由：/web/dashboard
- 标题：
  - H2：快速路径（推荐）
  - H2：认证基础（本地 vs 远程）
  - H2：在 Telegram 中打开
  - H2：如果你看到“unauthorized”/ 1008
  - H2：相关内容

## web/dashboards.md

- Route: /web/dashboards
- Headings:
  - H2: Find your dashboards
  - H2: Build a dashboard by asking
  - H2: The board
  - H2: What widgets are allowed to do
  - H2: MCP apps on the board
  - H2: Good to know

## web/index.md

- 路由：/web
- 标题：
  - H2：配置（默认开启）
  - H2：Webhooks
  - H2：管理 HTTP RPC
  - H2：Tailscale 访问
  - H2：安全说明
  - H2：构建 UI

## web/lobster.md

- 路由：/web/lobster
- 标题：
  - H2：你正在看到什么
  - H2：它何时出现
  - H2：你可以做的事情
  - H2：关闭（或重新开启）访问
  - H2：Lobsterdex
  - H2：田野笔记
  - H2：隐私

## web/tui.md

- Route: /web/tui
- Headings:
  - H2: Quick start
  - H3: Gateway mode
  - H3: Local mode
  - H2: What you see
  - H2: Mental model: agents + sessions
  - H2: Sending + delivery
  - H2: Pickers + overlays
  - H2: Keyboard shortcuts
  - H2: Slash commands
  - H2: Local shell commands
  - H2: OpenClaw setup and repair helper
  - H2: Tool output
  - H2: Terminal colors
  - H2: History + streaming
  - H2: Connection details
  - H2: Options
  - H2: Troubleshooting
  - H2: Connection troubleshooting
  - H2: Related

## web/urls.md

- Route: /web/urls
- Headings:
  - H2: Session and dashboard URLs
  - H3: Stability contract
  - H2: Route table
  - H2: Special documents and startup modes
  - H2: Remote Gateway handoff
  - H2: Related

## web/webchat.md

- Route: /web/webchat
- Headings:
  - H2: What it is
  - H2: Quick start
  - H2: How it works
  - H3: Transcript and delivery model
  - H2: Control UI agents tools panel
  - H2: Remote use
  - H2: Configuration reference (WebChat)
  - H2: Related
