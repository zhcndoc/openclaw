---
summary: "社区维护的 OpenClaw 插件：浏览、安装并提交你自己的插件"
read_when:
  - 你想查找第三方 OpenClaw 插件
  - 你想发布或列出你自己的插件
title: "社区插件"
---

社区插件是第三方包，它们通过新增频道、工具、提供者或其他能力来扩展 OpenClaw。它们由社区构建和维护，通常发布在 [ClawHub](/tools/clawhub) 上，并且可通过一条命令安装。在 ClawHub 包安装逐步推出期间，裸包规格仍默认使用 Npm 作为启动默认值。

ClawHub 是社区插件的权威发现入口。不要仅仅为了可发现性而打开
只改文档的 PR 来把你的插件加到这里；请改为将其发布到
ClawHub。

```bash
openclaw plugins install clawhub:<package-name>
```

对于托管在 npm 上的包，请使用 `openclaw plugins install <package-name>`。

## 列出的插件

### Apify

使用 20,000+ 个现成抓取器从任何网站抓取数据。让你的代理
只需通过提问即可从 Instagram、Facebook、TikTok、YouTube、Google 地图、Google
搜索、电商网站等平台提取数据。

- **npm:** `@apify/apify-openclaw-plugin`
- **repo:** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

用于 Codex App Server 对话的独立 OpenClaw 桥接器。将聊天绑定到
一个 Codex 线程，用纯文本与其交谈，并通过聊天原生命令
控制它，用于恢复、规划、审阅、模型选择、压缩等操作。

- **npm:** `openclaw-codex-app-server`
- **repo:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

使用 Stream 模式的企业机器人集成。支持通过任意钉钉客户端发送文本、图片和
文件消息。

- **npm:** `@largezhou/ddingtalk`
- **repo:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

OpenClaw 的无损上下文管理插件。基于 DAG 的对话
摘要与增量压缩——在减少 token 使用的同时保留完整的上下文一致性。

- **npm:** `@martian-engineering/lossless-claw`
- **repo:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

用于将代理轨迹导出到 Opik 的官方插件。监控代理行为、
成本、token、错误等更多内容。

- **npm:** `@opik/opik-openclaw`
- **repo:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

为你的 OpenClaw 代理提供带有实时口型同步、情感
表情和文本转语音的 Live2D 头像。包含用于 AI 资产生成的创作者工具，
以及一键部署到 Prometheus Marketplace。目前处于 alpha 阶段。

- **npm:** `@prometheusavatar/openclaw-plugin`
- **repo:** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

通过 QQ Bot API 将 OpenClaw 连接到 QQ。支持私聊、群
提及、频道消息，以及包括语音、图片、视频和
文件在内的富媒体。

当前的 OpenClaw 版本已内置 QQ Bot。正常安装请使用
[QQ Bot](/channels/qqbot) 中的内置方案；只有当你明确想使用腾讯维护的独立包时，
才安装这个外部插件。

- **npm:** `@tencent-connect/openclaw-qqbot`
- **repo:** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

由腾讯 WeCom 团队提供的 OpenClaw 企业微信频道插件。基于
WeCom Bot WebSocket 持久连接，它支持直接消息和群
聊、流式回复、主动消息、图片/文件处理、Markdown
格式化、内置访问控制，以及文档/会议/消息技能。

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repo:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

### Yuanbao

由腾讯元宝团队提供的 OpenClaw 元宝频道插件。基于
WebSocket 持久连接，它支持直接消息和群聊、
流式回复、主动消息、图片/文件/音频/视频处理、
Markdown 格式化、内置访问控制，以及斜杠命令菜单。

- **npm:** `openclaw-plugin-yuanbao`
- **repo:** [github.com/YuanbaoTeam/yuanbao-openclaw-plugin](https://github.com/YuanbaoTeam/yuanbao-openclaw-plugin)

```bash
openclaw plugins install openclaw-plugin-yuanbao
```

## 提交你的插件

我们欢迎有用、文档完善且可安全运行的社区插件。

<Steps>
  <Step title="发布到 ClawHub 或 npm">
    你的插件必须能通过 `openclaw plugins install \<package-name\>` 安装。
    除非你明确需要仅通过 npm 分发，
    否则请发布到 [ClawHub](/tools/clawhub)。
    完整指南请参见 [构建插件](/plugins/building-plugins)。

  </Step>

  <Step title="托管在 GitHub 上">
    源代码必须位于一个公开仓库中，并且包含设置文档和问题
    跟踪器。

  </Step>

  <Step title="仅在源文档变更时使用 docs PR">
    你不需要仅为了让插件可被发现而提交 docs PR。请改为将其发布到
    ClawHub。

    只有当 OpenClaw 的源文档需要实际内容
    变更时，才应提交 docs PR，例如更正安装说明或添加属于主文档集的跨仓库
    文档。

  </Step>
</Steps>

## 质量标准

| 要求                        | 原因                                   |
| --------------------------- | -------------------------------------- |
| 发布在 ClawHub 或 npm 上     | 用户需要 `openclaw plugins install` 能正常工作 |
| 公开的 GitHub 仓库          | 便于源码审查、问题跟踪和透明度        |
| 设置与使用文档              | 用户需要知道如何配置它                |
| 持续维护                    | 最近有更新或能及时响应问题处理        |

低质量封装、权属不清或无人维护的包可能会被拒绝。

## 相关内容

- [安装和配置插件](/tools/plugin) — 如何安装任何插件
- [构建插件](/plugins/building-plugins) — 创建你自己的插件
- [插件清单](/plugins/manifest) — 清单模式
