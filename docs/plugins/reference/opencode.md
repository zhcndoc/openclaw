---
summary: "为 OpenClaw 添加 OpenCode 模型提供方支持。"
read_when:
  - 你正在安装、配置或审计 opencode 插件
title: "OpenCode 插件"
---

# OpenCode 插件

为 OpenClaw 添加 OpenCode 模型提供方支持。

## 分发

- 软件包：`@openclaw/opencode-provider`
- 安装方式：npm；ClawHub：`clawhub:@openclaw/opencode-provider`

## 接口

提供商: `opencode`; 契约: `mediaUnderstandingProviders`

<!-- openclaw-plugin-reference:manual-start -->

## 原生会话

OpenClaw 会自动检测 Gateway 和已配对节点上的 `opencode` CLI。存储的会话随后会显示在 **OpenCode** 会话侧边栏分组中，并可通过官方的 `opencode --pure db ... --format json` 和 `opencode --pure export` 命令浏览会话记录。本地会话行还会提供 **继续**选项，用于创建一个 OpenClaw 会话，其第一轮交互会通过 ACP 恢复原生 OpenCode 会话。OpenCode 会保留完整的服务器端模型上下文，目录查看器也会继续显示该历史记录。OpenClaw 还会将最近的原生历史记录导入所采用的会话记录中。超长会话记录只会导入最近的 200 个项目，序列化项目大小上限为 512 KiB。已配对节点上的会话行仍为只读。

受限环境和 `--pure` 模式可防止目录浏览加载项目插件，或继承无关的 Gateway 凭据。

在 **配置 > 插件 > OpenCode** 下关闭 **OpenCode Session Catalog**，即可禁用发现功能。默认情况下它是启用的。

<!-- openclaw-plugin-reference:manual-end -->

## 相关文档

- [opencode](/providers/opencode)
