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

The bundled runtime auto-detects Pi's session store on the Gateway and paired
nodes. Stored sessions appear in the **Pi** sessions-sidebar group, with
transcript browsing from Pi's documented JSONL session format. Local rows also
offer **Continue**, which creates an OpenClaw session whose first turn resumes
the native Pi session through ACP. Pi retains the full model context from its
session file, and OpenClaw imports the recent native history into the adopted
session transcript. Very long transcripts import only their most recent 200
items using a 512 KiB serialized-item budget. Paired-node rows remain view-only.
Custom session
directories outside the store scanned by `pi-acp` remain browse-only because the
adapter cannot resume those files by id.

The catalog honors project and global `settings.json` session directories plus
`PI_CODING_AGENT_DIR` and `PI_CODING_AGENT_SESSION_DIR`. Relative paths resolve
from the directory containing their `settings.json` file.

在 **Config > Plugins > ACPX Runtime** 下关闭 **Pi Session Catalog** 可禁用发现功能。默认已启用。

<!-- openclaw-plugin-reference:manual-end -->

## 相关文档

- [acpx](/tools/acp-agents-setup)
