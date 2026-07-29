---
summary: "为 OpenClaw 添加 OpenCode 模型提供方支持。"
read_when:
  - 你正在安装、配置或审计 opencode 插件
title: "OpenCode 插件"
---

# OpenCode 插件

为 OpenClaw 添加 OpenCode 模型提供方支持。

## 分发

- 包：`@openclaw/opencode-provider`
- 安装方式：包含在 OpenClaw 中

## 接口

providers: `opencode`; contracts: `mediaUnderstandingProviders`

<!-- openclaw-plugin-reference:manual-start -->

## 原生会话

OpenClaw auto-detects the `opencode` CLI on the Gateway and paired nodes. Stored
sessions then appear in the **OpenCode** sessions-sidebar group, with transcript
browsing through the official `opencode --pure db ... --format json` and
`opencode --pure export` commands. Local rows also offer **Continue**, which
creates an OpenClaw session whose first turn resumes the native OpenCode session
through ACP. OpenCode retains the full server-side model context, and the catalog
viewer continues to show that history. OpenClaw also imports the recent native
history into the adopted session transcript. Very long transcripts import only
their most recent 200 items using a 512 KiB serialized-item budget. Paired-node
rows remain view-only.

The restricted environment and `--pure` mode prevent catalog browsing from
loading project plugins or inheriting unrelated Gateway credentials.

在 **Config > Plugins > OpenCode** 下关闭 **OpenCode Session Catalog**，
即可禁用发现功能。默认情况下它是启用的。

<!-- openclaw-plugin-reference:manual-end -->

## 相关文档

- [opencode](/providers/opencode)
