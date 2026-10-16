---
summary: "为 OpenClaw 添加 OpenCode 模型提供方支持。"
read_when:
  - You are installing, configuring, or auditing the opencode plugin
title: "OpenCode plugin reference"
---

<!-- Generated file. Do not edit by hand.
Run `pnpm plugins:inventory:gen` to rebuild it. Hand-written text survives only
between the openclaw-plugin-reference:manual-start and
openclaw-plugin-reference:manual-end comment markers. -->

为 OpenClaw 添加 OpenCode 模型提供方支持。

## 分发

- Package: `@openclaw/opencode-provider`
- Install route: npm or ClawHub: `clawhub:@openclaw/opencode-provider`

## 接口

- Providers: `opencode`
- Contracts: `mediaUnderstandingProviders`

<!-- openclaw-plugin-reference:manual-start -->

## 原生会话

OpenClaw auto-detects the `opencode` CLI on the Gateway and paired nodes. Stored
sessions then appear in the **OpenCode** sessions-sidebar group, with transcript
browsing through the official CLI. OpenCode v1 uses `--pure db` and `--pure export`;
v2 uses `api session.list` and `session export` with a private standalone server.
Local rows also offer **Continue**, which
creates an OpenClaw session whose first turn resumes the native OpenCode session
through ACP. OpenCode retains the full server-side model context, and the catalog
viewer continues to show that history. OpenClaw also imports the recent native
history into the adopted session transcript. Very long transcripts import only
their most recent 200 items using a 512 KiB serialized-item budget. Paired-node
rows remain view-only.

The restricted environment prevents catalog browsing from inheriting unrelated
Gateway credentials. OpenCode v1 uses `--pure`; v2 uses an empty temporary config
directory with project configuration disabled to avoid loading user plugins.
Failed CLI calls produce an `opencode/session-catalog` warning in Gateway logs.

在 **配置 > 插件 > OpenCode** 下关闭 **OpenCode Session Catalog**，即可禁用发现功能。默认情况下它是启用的。

<!-- openclaw-plugin-reference:manual-end -->

## 相关文档

- [opencode](/providers/opencode)
