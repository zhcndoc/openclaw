---
summary: "从 OpenClaw 监督 Codex app-server 会话。"
read_when:
  - 你正在安装、配置或审计 codex-supervisor 插件
title: "Codex Supervisor 插件"
---

# Codex Supervisor 插件

从 OpenClaw 监督 Codex app-server 会话。

## 分发

- 包：`@openclaw/codex-supervisor`
- 安装方式：随 OpenClaw 一并包含

## 接口

contracts: tools

## 会话列表

`codex_sessions_list` 默认仅列出已加载的 Codex 会话。设置 `include_stored` 可包含已存储的历史记录；该插件使用 Codex app-server 仅限 state-DB 的列表路径，并且默认将已存储结果上限限制为 200。传入 `max_stored_sessions` 可降低或提高该上限，最高为 1000。
