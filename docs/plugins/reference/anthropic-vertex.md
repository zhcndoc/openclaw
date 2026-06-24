---
summary: "用于 Google Vertex AI 上 Claude 模型的 OpenClaw Anthropic Vertex 提供方插件。"
read_when:
  - 你正在安装、配置或审计 anthropic-vertex 插件
title: "Anthropic Vertex 插件"
---

# Anthropic Vertex 插件

用于 Google Vertex AI 上 Claude 模型的 OpenClaw Anthropic Vertex 提供方插件。

## 分发

- Package: `@openclaw/anthropic-vertex-provider`
- Install route: npm; ClawHub

## 接口

providers: anthropic-vertex

## Claude Fable 5

在你的 Google Cloud 区域中可用时，请使用 `anthropic-vertex/claude-fable-5`。
Fable 5 始终使用自适应思考，并默认设置为 `high` effort。`/think off` 和
`/think minimal` 使用 `low` effort，因为该模型不支持关闭思考。
