---
summary: "Anthropic 模型、Claude CLI 和原生 Claude 会话目录。"
read_when:
  - 你正在安装、配置或审计 anthropic 插件
title: "Anthropic 插件"
---

# Anthropic 插件

Anthropic 模型、Claude CLI 和原生 Claude 会话目录。

## 分发

- 包：`@openclaw/anthropic-provider`
- 安装路径：已包含在 OpenClaw 中

## 接口

providers: anthropic; contracts: mediaUnderstandingProviders, usageProviders

<!-- openclaw-plugin-reference:manual-start -->

node commands: anthropic.claude.sessions.list.v1,
anthropic.claude.sessions.read.v1; contracts: mediaUnderstandingProviders,
usageProviders

<!-- openclaw-plugin-reference:manual-end -->

## 相关文档

- [anthropic](/providers/anthropic)
