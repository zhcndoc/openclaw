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

providers: opencode; contracts: mediaUnderstandingProviders

<!-- openclaw-plugin-reference:manual-start -->

## 原生会话

OpenClaw 会自动检测 Gateway 和已配对节点上的 `opencode` CLI。已存储的
会话随后会出现在 **OpenCode** 会话侧边栏分组中，并可通过官方
`opencode --pure db ... --format json`
和 `opencode --pure export` 命令进行只读的会话记录浏览。受限环境和 `--pure`
模式可防止目录浏览加载项目插件或继承无关的
Gateway 凭据。

在 **Config > Plugins > OpenCode** 下关闭 **OpenCode Session Catalog**，
即可禁用发现功能。默认情况下它是启用的。

<!-- openclaw-plugin-reference:manual-end -->

## 相关文档

- [opencode](/providers/opencode)
