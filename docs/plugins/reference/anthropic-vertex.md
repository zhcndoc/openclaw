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
- 安装方式：npm；ClawHub

## 接口

providers: `anthropic-vertex`

## Claude Fable 5

在你的 Google Cloud 区域中可用时，请使用 `anthropic-vertex/claude-fable-5`。
Fable 5 始终使用自适应思考，并默认采用 `high` effort。`/think off` 和
`/think minimal` 会使用 `low` effort，因为该模型不支持关闭思考。

## Claude Sonnet 5

使用 `anthropic-vertex/claude-sonnet-5` 搭配 Vertex 的 `global`、`us` 或 `eu`
端点。Sonnet 5 默认使用 `high` effort 的自适应思考，并支持
`/think off` 或原生的 `/think xhigh|max` 级别。OpenClaw 会自动发布其
1,000,000 token 上下文窗口和 128,000 token 输出上限。

目录定价遵循 Vertex 的介绍性全球费率：截至 2026 年 8 月 31 日，每百万输入/输出 token 分别为 `$2/$10`，随后从
9 月 1 日起变为 `$3/$15`。`us` 和 `eu` 多区域端点使用 Vertex 文档中所述的 10% 溢价。

<!-- openclaw-plugin-reference:manual-end -->
