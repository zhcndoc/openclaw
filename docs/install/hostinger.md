---
summary: "在 Hostinger 上部署 OpenClaw"
read_when:
  - 在 Hostinger 上设置 OpenClaw
  - 寻找用于 OpenClaw 的托管 VPS
  - 使用 Hostinger 的一键式 OpenClaw
title: "Hostinger"
---

在 [Hostinger](https://www.hostinger.com/openclaw) 上通过 **一键式** 托管部署或 **VPS** 安装运行一个持久的 OpenClaw Gateway。

## 先决条件

- Hostinger 账户（[注册](https://www.hostinger.com/openclaw)）
- 约 5-10 分钟

## 选项 A：一键式 OpenClaw

最快的起步方式。Hostinger 负责基础设施、Docker 和自动更新。

<Steps>
  <Step title="购买并启动">
    1. 访问 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw)，选择托管 OpenClaw 计划并完成结账。

    <Note>
    在结账时，您可以选择 **即用型 AI** 积分，这些积分已预先购买并即时集成到 OpenClaw 中——无需其他提供商的外部账户或 API 密钥。您可以立即开始聊天。或者，您也可以在设置期间提供自己的 Anthropic、OpenAI、Google Gemini 或 xAI 密钥。
    </Note>

  </Step>

  <Step title="选择消息渠道">
    选择一个或多个要连接的渠道：

    - **WhatsApp** — 扫描设置向导中显示的二维码。
    - **Telegram** — 从 [BotFather](https://t.me/BotFather) 粘贴机器人令牌。

  </Step>

  <Step title="完成安装">
    点击 **完成** 以部署实例。准备就绪后，从 hPanel 的 **OpenClaw 概览** 访问 OpenClaw 仪表板。
  </Step>

</Steps>

## 选项 B：VPS 上的 OpenClaw

对服务器拥有更多控制权。Hostinger 通过 Docker 在您的 VPS 上部署 OpenClaw，您可以通过 hPanel 中的 **Docker Manager** 来管理它。

<Steps>
  <Step title="购买 VPS">
    1. 访问 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw)，选择 OpenClaw on VPS 计划并完成结账。

    <Note>
    您可以在结账时选择 **即用型 AI** 积分——这些积分已预先购买并即时集成到 OpenClaw 中，因此您无需其他外部账户或 API 密钥即可开始聊天。
    </Note>

  </Step>

  <Step title="配置 OpenClaw">
    VPS 配置完成后，填写配置字段：

    - **网关令牌** — 自动生成，请保存以备后用。
    - **WhatsApp 号码** — 带有国家码的号码（可选）。
    - **Telegram 机器人令牌** — 来自 [BotFather](https://t.me/BotFather)（可选）。
    - **API 密钥** — 仅在结账时未选择即用型 AI 积分时需要。

  </Step>

  <Step title="启动 OpenClaw">
    点击 **部署**。运行后，通过点击 hPanel 中的 **打开** 来访问 OpenClaw 仪表板。
  </Step>

</Steps>

日志、重启和更新均可直接从 hPanel 中的 Docker Manager 界面进行管理。如需更新，请在 Docker Manager 中点击 **更新**，即可拉取最新镜像。

## 验证您的设置

向您已连接的渠道中的助手发送“Hi”。OpenClaw 将回复并引导您完成初始偏好设置。

## 故障排除

**仪表板未加载** — 等待几分钟让容器完成配置。在 hPanel 中检查 Docker Manager 日志。

**Docker 容器持续重启** — 打开 Docker Manager 日志，查找配置错误（缺失令牌、无效 API 密钥）。

**Telegram 机器人无响应** — 直接在 Telegram 中发送配对代码消息，以完成连接。

## 后续步骤

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway configuration](/gateway/configuration) -- 所有配置选项

## Related

- [Install overview](/install)
- [VPS hosting](/vps)
- [DigitalOcean](/install/digitalocean)
