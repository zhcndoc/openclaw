---
summary: "OpenClaw ACP 运行时后端，支持由插件管理会话和传输。"
read_when:
  - 你正在安装、配置或审计 acpx 插件
title: "ACPx 插件"
---

# ACPx 插件

OpenClaw ACP 运行时后端，支持由插件管理会话和传输。

## 分发

- 包：`@openclaw/acpx`
- 安装途径：npm；ClawHub

## 范围

技能

<!-- openclaw-plugin-reference:manual-start -->

## Pi 原生会话

捆绑运行时会自动检测 Gateway 和配对节点上的 Pi 会话存储。已存储的会话会出现在 **Pi** 会话侧边栏分组中，并可通过 Pi 文档化的 JSONL 会话格式进行只读的记录浏览。该目录会遵循项目和全局 `settings.json` 中的会话目录，以及 `PI_CODING_AGENT_DIR` 和 `PI_CODING_AGENT_SESSION_DIR`。相对路径会从包含其 `settings.json` 文件的目录开始解析。

在 **Config > Plugins > ACPX Runtime** 下关闭 **Pi Session Catalog** 可禁用发现功能。默认已启用。

<!-- openclaw-plugin-reference:manual-end -->

## 相关文档

- [acpx](/tools/acp-agents-setup)
