---
summary: "社区维护的 OpenClaw 插件：浏览、安装并提交你自己的插件"
read_when:
  - 你想查找第三方 OpenClaw 插件
  - 你想发布或列出你自己的插件
title: "社区插件"
---

社区插件是第三方包，用于通过新的
频道、工具、提供者或其他能力扩展 OpenClaw。它们由社区构建和维护，
发布在 [ClawHub](/tools/clawhub) 或 npm 上，并且
只需一条命令即可安装。

ClawHub 是社区插件的权威发现入口。不要仅仅为了提高可发现性而
提交仅包含文档的 PR 来把你的插件添加到这里；请改为将其发布到
ClawHub。

```bash
openclaw plugins install <package-name>
```

OpenClaw 会先检查 ClawHub，并自动回退到 npm。

## 已列插件

### Apify

通过 20,000+ 个现成的爬虫从任意网站抓取数据。让你的代理
提取 Instagram、Facebook、TikTok、YouTube、Google Maps、Google
Search、电商网站等的数据——只需发出请求。

- **npm:** `@apify/apify-openclaw-plugin`
- **repo:** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

面向 Codex App Server 对话的独立 OpenClaw 桥接器。将聊天绑定到
一个 Codex 线程，用纯文本与其对话，并通过聊天原生命令进行控制，
支持恢复、规划、审阅、模型选择、压缩等操作。

- **npm:** `openclaw-codex-app-server`
- **repo:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### 钉钉

使用 Stream 模式的企业机器人集成。通过任意钉钉客户端支持文本、
图片和文件消息。

- **npm:** `@largezhou/ddingtalk`
- **repo:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### 无损 Claw（LCM）

OpenClaw 的无损上下文管理插件。基于 DAG 的对话
摘要与增量压缩——在减少 token 用量的同时保持完整的上下文
保真度。

- **npm:** `@martian-engineering/lossless-claw`
- **repo:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

将代理轨迹导出到 Opik 的官方插件。监控代理行为、
成本、token、错误等。

- **npm:** `@opik/opik-openclaw`
- **repo:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

为你的 OpenClaw 代理提供一个支持实时口型同步、情绪
表情和文本转语音的 Live2D 头像。包含用于 AI 资源生成的创作者工具
以及一键部署到 Prometheus Marketplace 的功能。目前处于 alpha 版。

- **npm:** `@prometheusavatar/openclaw-plugin`
- **repo:** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

通过 QQ Bot API 将 OpenClaw 连接到 QQ。支持私聊、群
@提及、频道消息以及包括语音、图片、视频和文件在内的富媒体。

- **npm:** `@tencent-connect/openclaw-qqbot`
- **repo:** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

由腾讯企业微信团队提供的 OpenClaw 企业微信频道插件。基于
企业微信 Bot WebSocket 持久连接，支持私信和群
聊、流式回复、主动消息、图片/文件处理、Markdown
格式化、内置访问控制，以及文档/会议/消息技能。

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repo:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

### Yuanbao

Yuanbao 是腾讯元宝团队为 OpenClaw 提供的频道插件。基于
WebSocket 持久连接，它支持私信和群聊、
流式回复、主动消息、图片/文件/音频/视频处理、
Markdown 格式化、内置访问控制以及斜杠菜单。

- **npm:** `openclaw-plugin-yuanbao`
- **repo:** [github.com/yb-claw/openclaw-plugin-yuanbao](https://github.com/yb-claw/openclaw-plugin-yuanbao)

```bash
openclaw plugins install openclaw-plugin-yuanbao
```

## 提交你的插件

我们欢迎有用、有文档且运行安全的社区插件。

<Steps>
  <Step title="发布到 ClawHub 或 npm">
    你的插件必须可通过 `openclaw plugins install \<package-name\>` 安装。
    发布到 [ClawHub](/tools/clawhub)（优先）或 npm。
    完整指南请参阅 [构建插件](/plugins/building-plugins)。

  </Step>

  <Step title="托管在 GitHub 上">
    源代码必须位于一个公开仓库中，并附带设置文档和 issue
    跟踪器。

  </Step>

  <Step title="仅将文档 PR 用于源文档变更">
    你不需要为了让插件可被发现而提交 docs PR。请改为将其发布到
    ClawHub。

    只有当 OpenClaw 的源文档需要实际内容变更时，才打开 docs PR，
    例如修正安装指南或添加应归入主文档集的跨仓库
    文档。

  </Step>
</Steps>

## 质量标准

| 要求                     | 原因                                           |
| ------------------------ | ---------------------------------------------- |
| 发布到 ClawHub 或 npm     | 用户需要 `openclaw plugins install` 能正常工作 |
| 公开的 GitHub 仓库        | 源码审查、问题跟踪、透明度                       |
| 设置和使用文档            | 用户需要知道如何配置它                           |
| 持续维护                  | 最近有更新或对 issue 的响应及时                  |

低质量封装、所有权不明确或无人维护的包可能会被拒绝。

## 相关内容

- [安装和配置插件](/tools/plugin) — 如何安装任意插件
- [构建插件](/plugins/building-plugins) — 创建你自己的插件
- [插件清单](/plugins/manifest) — 清单模式
