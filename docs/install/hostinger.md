---
summary: "在 Hostinger 上托管 OpenClaw"
read_when:
  - 在 Hostinger 上设置 OpenClaw
  - 寻找用于 OpenClaw 的托管 VPS
  - 使用 Hostinger 一键 OpenClaw
title: "Hostinger"
---

在 [Hostinger](https://www.hostinger.com/openclaw) 上运行一个持久的 OpenClaw Gateway，可作为由我们管理的 **一键** 部署，或者作为由您自行管理的 **VPS** 安装。

## 前提条件

- Hostinger 账户 ([注册](https://www.hostinger.com/openclaw))
- 大约 5-10 分钟

## 选项 A：一键 OpenClaw

Hostinger 负责基础设施、Docker 和自动更新。最快即可运行实例。

<Steps>
  <Step title="购买并启动">
    1. 从 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw) 选择一个托管 OpenClaw 套餐并完成结账。

    <Note>
    结账期间你可以选择 **Ready-to-Use AI** 额度，这些额度已预先购买，并会即时集成到 OpenClaw 中——无需来自其他提供商的外部账户或 API 密钥。你可以立即开始聊天。或者，在设置过程中提供你自己的 Anthropic、OpenAI、Google Gemini 或 xAI 密钥。
    </Note>

  </Step>

  <Step title="选择消息通道">
    选择一个或多个要连接的通道：

    - **WhatsApp** -- 扫描设置向导中显示的二维码。
    - **Telegram** -- 粘贴来自 [BotFather](https://t.me/BotFather) 的机器人令牌。

  </Step>

  <Step title="完成安装">
    点击 **Finish** 部署实例。准备就绪后，可从 hPanel 中的 **OpenClaw Overview** 访问 OpenClaw 仪表盘。
  </Step>

</Steps>

## 选项 B：在 VPS 上安装 OpenClaw

对服务器有更多控制权。Hostinger 会通过 Docker 在你的 VPS 上部署 OpenClaw；你可以通过 hPanel 中的 **Docker Manager** 对其进行管理。

<Steps>
  <Step title="购买 VPS">
    1. 从 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw) 选择一个 VPS 上的 OpenClaw 套餐并完成结账。

    <Note>
    你可以在结账时选择 **Ready-to-Use AI** 额度——这些额度已预先购买，并会即时集成到 OpenClaw 中，因此你无需来自其他提供商的外部账户或 API 密钥，就可以开始聊天。
    </Note>

  </Step>

  <Step title="配置 OpenClaw">
    VPS 配置完成后，填写配置字段：

    - **Gateway token** -- 自动生成；请保存以备后用。
    - **WhatsApp number** -- 带国家代码的你的号码（可选）。
    - **Telegram bot token** -- 来自 [BotFather](https://t.me/BotFather)（可选）。
    - **API keys** -- 仅在你未在结账时选择 Ready-to-Use AI 额度时需要。

  </Step>

  <Step title="启动 OpenClaw">
    点击 **Deploy**。运行后，通过点击 **Open** 从 hPanel 打开 OpenClaw 仪表盘。
  </Step>

</Steps>

日志、重启和更新都通过 hPanel 中的 Docker Manager 界面运行。要更新，请在 Docker Manager 中点击 **Update** 以拉取最新镜像。

## 验证你的设置

在你连接的频道上向你的助手发送“Hi”。OpenClaw 会回复你，并引导你完成初始偏好设置。

## 故障排除

**仪表盘未加载** -- 等待几分钟，让容器完成初始化，然后在 hPanel 中检查 Docker Manager 日志。

**Docker 容器不断重启** -- 打开 Docker Manager 日志并查找配置错误（缺少令牌、无效的 API 密钥）。

**Telegram 机器人没有响应** -- 如果需要 DM 配对，未知发送者会收到一段简短的配对码，而不是回复。请在 OpenClaw 仪表盘聊天中批准它，或者如果你可以访问容器的 shell，则使用 `openclaw pairing approve telegram <CODE>`。参见 [配对](/channels/pairing)。

## 后续步骤

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等更多渠道
- [Gateway configuration](/gateway/configuration) -- 所有配置选项

## 相关内容

- [安装概述](/install)
- [VPS 托管](/vps)
- [DigitalOcean](/install/digitalocean)
