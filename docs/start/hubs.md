---
summary: "链接到所有 OpenClaw 文档的中心枢纽"
read_when:
  - 您想要获取文档的完整地图时
title: "文档中心枢纽"
---

# 文档中心枢纽

<Note>
如果您是 OpenClaw 新手，请从 [入门指南](/start/getting-started) 开始。
</Note>

使用这些枢纽来发现每一个页面，包括左侧导航栏中未显示的深入讲解和参考文档。

## 从这里开始

- [Index](/)
- [Getting Started](/start/getting-started)
- [Onboarding](/start/onboarding)
- [Onboarding (CLI)](/start/wizard)
- [Setup](/start/setup)
- [Dashboard (local Gateway)](http://127.0.0.1:18789/)
- [Help](/help)
- [Docs directory](/start/docs-directory)
- [Configuration](/gateway/configuration)
- [Configuration examples](/gateway/configuration-examples)
- [OpenClaw assistant](/start/openclaw)
- [Showcase](/start/showcase)
- [Lore](/start/lore)

## 安装 + 更新

- [Docker](/install/docker)
- [Nix](/install/nix)
- [更新 / 回滚](/install/updating)
- [Bun 工作流（实验性）](/install/bun)

## 核心概念

- [架构](/concepts/architecture)
- [特性](/concepts/features)
- [网络中心](/network)
- [Agent 运行时](/concepts/agent)
- [Agent 工作区](/concepts/agent-workspace)
- [内存](/concepts/memory)
- [Agent 循环](/concepts/agent-loop)
- [流式传输 + 分块](/concepts/streaming)
- [多 Agent 路由](/concepts/multi-agent)
- [压缩](/concepts/compaction)
- [会话](/concepts/session)
- [会话修剪](/concepts/session-pruning)
- [会话工具](/concepts/session-tool)
- [队列](/concepts/queue)
- [斜杠命令](/tools/slash-commands)
- [RPC 适配器](/reference/rpc)
- [TypeBox 模式](/concepts/typebox)
- [时区处理](/concepts/timezone)
- [存在](/concepts/presence)
- [发现 + 传输](/gateway/discovery)
- [Bonjour](/gateway/bonjour)
- [频道路由](/channels/channel-routing)
- [群组](/channels/groups)
- [群组消息](/channels/group-messages)
- [模型故障切换](/concepts/model-failover)
- [OAuth](/concepts/oauth)

## 提供者 + 入口

- [聊天频道中心](/channels)
- [模型提供者中心](/providers/models)
- [WhatsApp](/channels/whatsapp)
- [Telegram](/channels/telegram)
- [Slack](/channels/slack)
- [Discord](/channels/discord)
- [Mattermost](/channels/mattermost)（插件）
- [Signal](/channels/signal)
- [BlueBubbles（iMessage）](/channels/bluebubbles)
- [iMessage（旧版）](/channels/imessage)
- [位置解析](/channels/location)
- [WebChat](/web/webchat)
- [Webhook](/automation/webhook)
- [Gmail 发布/订阅](/automation/gmail-pubsub)

## 网关 + 运营

- [网关运行手册](/gateway)
- [网络模型](/gateway/network-model)
- [网关配对](/gateway/pairing)
- [网关锁](/gateway/gateway-lock)
- [后台进程](/gateway/background-process)
- [健康状态](/gateway/health)
- [心跳](/gateway/heartbeat)
- [诊断工具](/gateway/doctor)
- [日志](/gateway/logging)
- [沙箱环境](/gateway/sandboxing)
- [仪表盘](/web/dashboard)
- [控制界面](/web/control-ui)
- [远程访问](/gateway/remote)
- [远程网关说明](/gateway/remote-gateway-readme)
- [Tailscale](/gateway/tailscale)
- [安全](/gateway/security)
- [故障排除](/gateway/troubleshooting)

## 工具 + 自动化

- [工具总览](/tools)
- [OpenProse](/prose)
- [CLI 参考](/cli)
- [Exec 工具](/tools/exec)
- [PDF 工具](/tools/pdf)
- [提升模式](/tools/elevated)
- [定时任务](/automation/cron-jobs)
- [定时任务与心跳对比](/automation/cron-vs-heartbeat)
- [思考 + 详细](/tools/thinking)
- [模型](/concepts/models)
- [子代理](/tools/subagents)
- [Agent 发送 CLI](/tools/agent-send)
- [终端界面](/web/tui)
- [浏览器控制](/tools/browser)
- [浏览器（Linux 故障排除）](/tools/browser-linux-troubleshooting)
- [投票](/automation/poll)

## 节点、多媒体、语音

- [节点总览](/nodes)
- [摄像头](/nodes/camera)
- [图片](/nodes/images)
- [音频](/nodes/audio)
- [位置命令](/nodes/location-command)
- [语音唤醒](/nodes/voicewake)
- [对话模式](/nodes/talk)

## 平台

- [平台总览](/platforms)
- [macOS](/platforms/macos)
- [iOS](/platforms/ios)
- [Android](/platforms/android)
- [Windows（WSL2）](/platforms/windows)
- [Linux](/platforms/linux)
- [网页界面](/web)

## macOS 伴侣应用（高级）

- [macOS 开发环境搭建](/platforms/mac/dev-setup)
- [macOS 菜单栏](/platforms/mac/menu-bar)
- [macOS 语音唤醒](/platforms/mac/voicewake)
- [macOS 语音覆盖](/platforms/mac/voice-overlay)
- [macOS WebChat](/platforms/mac/webchat)
- [macOS Canvas](/platforms/mac/canvas)
- [macOS child process](/platforms/mac/child-process)
- [macOS health](/platforms/mac/health)
- [macOS icon](/platforms/mac/icon)
- [macOS logging](/platforms/mac/logging)
- [macOS permissions](/platforms/mac/permissions)
- [macOS remote](/platforms/mac/remote)
- [macOS signing](/platforms/mac/signing)
- [macOS gateway (launchd)](/platforms/mac/bundled-gateway)
- [macOS XPC](/platforms/mac/xpc)
- [macOS 技能](/platforms/mac/skills)
- [macOS 捉迷藏](/platforms/mac/peekaboo)

## Extensions + plugins

- [Plugins overview](/tools/plugin)
- [Building plugins](/plugins/building-plugins)
- [Plugin manifest](/plugins/manifest)
- [Agent tools](/plugins/building-plugins#registering-agent-tools)
- [Plugin bundles](/plugins/bundles)
- [Community plugins](/plugins/community)
- [Capability cookbook](/tools/capability-cookbook)
- [Voice call plugin](/plugins/voice-call)
- [Zalo user plugin](/plugins/zalouser)

## Workspace + templates

- [技能](/tools/skills)
- [ClawHub](/tools/clawhub)
- [技能配置](/tools/skills-config)
- [默认 AGENTS](/reference/AGENTS.default)
- [模板：AGENTS](/reference/templates/AGENTS)
- [模板：BOOTSTRAP](/reference/templates/BOOTSTRAP)
- [模板：HEARTBEAT](/reference/templates/HEARTBEAT)
- [模板：IDENTITY](/reference/templates/IDENTITY)
- [模板：SOUL](/reference/templates/SOUL)
- [模板：TOOLS](/reference/templates/TOOLS)
- [模板：USER](/reference/templates/USER)

## Project

- [鸣谢](/reference/credits)

## 测试 + 发布

- [测试](/reference/test)
- [发布政策](/reference/RELEASING)
- [设备模型](/reference/device-models)
