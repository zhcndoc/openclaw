---
summary: "社区插件：质量标准、托管要求和提交 PR 的路径"
read_when:
  - 你想发布第三方 OpenClaw 插件
  - 你想提议在文档中列出一个插件
title: "社区插件"
---

# 社区插件

本页追踪高质量的 **社区维护插件**，用于 OpenClaw。

当满足质量标准时，我们接受添加社区插件的 PR。

## 列表要求

- 插件包已发布在 npmjs（可通过 `openclaw plugins install <npm-spec>` 安装）。
- 源代码托管在 GitHub（公开仓库）。
- 仓库包含使用/安装文档和问题跟踪。
- 插件有明确的维护信号（活跃维护者、近期更新或积极响应问题）。

## 如何提交

提交一个 PR，将你的插件添加到本页，内容包括：

- 插件名称
- npm 包名
- GitHub 仓库 URL
- 一行描述
- 安装命令

## 评审标准

我们偏好有用的、文档完善且安全的插件。
低投入包装、归属不明或无人维护的包可能被拒绝。

## 示例格式

添加条目时使用此格式：

- **插件名称** — 简短描述  
  npm: `@scope/package`  
  repo: `https://github.com/org/repo`  
  install: `openclaw plugins install @scope/package`

## 已列插件

- **WeChat** — 通过 WeChatPadPro（iPad 协议）将 OpenClaw 连接至微信个人号。支持文字、图片和文件交换，及关键词触发的对话。  
  npm: `@icesword760/openclaw-wechat`  
  repo: `https://github.com/icesword0760/openclaw-wechat`  
  install: `openclaw plugins install @icesword760/openclaw-wechat`
