---
summary: "用于 Google Vertex AI 上 Claude 模型的 OpenClaw Anthropic Vertex 提供方插件。"
read_when:
  - You are installing, configuring, or auditing the anthropic-vertex plugin
title: "Anthropic Vertex plugin reference"
---

<!-- Generated file. Do not edit by hand.
Run `pnpm plugins:inventory:gen` to rebuild it. Hand-written text survives only
between the openclaw-plugin-reference:manual-start and
openclaw-plugin-reference:manual-end comment markers. -->

用于 Google Vertex AI 上 Claude 模型的 OpenClaw Anthropic Vertex 提供方插件。

## 分发

- Package: `@openclaw/anthropic-vertex-provider`
- Install route: npm or ClawHub: `clawhub:@openclaw/anthropic-vertex-provider`

## 接口

- Providers: `anthropic-vertex`

## Claude Fable 5

Use `anthropic-vertex/claude-fable-5` where the model is available in your Google Cloud region.
Fable 5 always uses adaptive thinking; OpenClaw defaults to `medium` effort. Stored `off`
and `minimal` settings map to `low` because the model does not support disabling thinking.

## Claude Sonnet 5

使用 `anthropic-vertex/claude-sonnet-5` 搭配 Vertex 的 `global`、`us` 或 `eu`
端点。Sonnet 5 默认使用 `high` effort 的自适应思考，并支持
`/think off` 或原生的 `/think xhigh|max` 级别。OpenClaw 会自动发布其
1,000,000 token 上下文窗口和 128,000 token 输出上限。

Catalog pricing follows [Google's current Vertex pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing#anthropics-claude-models):
`$2/$10` per million input/output tokens for `global`, or `$2.20/$11` for
the `us` and `eu` multi-region endpoints. Cache hits and 5-minute cache writes
cost `$0.20/$2.50` globally or `$0.22/$2.75` in either multi-region endpoint,
per million tokens. These USD rates apply at both 200K input tokens or less
and above 200K input tokens.

<!-- openclaw-plugin-reference:manual-end -->
