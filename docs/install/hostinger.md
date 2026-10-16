---
summary: "在 Hostinger 上托管 OpenClaw"
read_when:
  - "在 Hostinger 上设置 OpenClaw"
  - "正在寻找 OpenClaw 的托管 VPS"
  - "使用 Hostinger 1-Click OpenClaw"
title: "霍斯廷格"
---

在 [Hostinger](https://www.hostinger.com/openclaw) 上运行持久 OpenClaw 网关。选择 **1-Click** 托管部署，或您自行管理的 **VPS** 安装。

## <a id="prerequisites"></a> 先决条件

- Hostinger 账户 ([注册](https://www.hostinger.com/openclaw))
- 大约 5-10 分钟

## <a id="option-a%3A-1-click-openclaw"></a><a id="option-a-1-click-openclaw"></a> 选项 A：1-Click OpenClaw

Hostinger 负责基础设施、Docker 和自动更新。最快即可运行实例。

<Steps>
  <Step id="purchase-and-launch" title="购买并启动">
    1. 从 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw) 选择一个托管 OpenClaw 套餐并完成结账。

    <Note>
    结账时，您可以选择 **即用型 AI** 积分。这些积分是预先购买的并立即集成到 OpenClaw 中。您不需要来自其他提供商的外部帐户或 API 密钥。您可以立即开始聊天。或者，在设置过程中提供 Anthropic、OpenAI、Google、Gemini 或 xAI 中您自己的密钥。
    </Note>

  </Step>

  <Step id="select-a-messaging-channel" title="选择消息传递渠道">
    选择一个或多个要连接的通道：

    - **WhatsApp** - 扫描设置向导中显示的 QR 代码。
    - **Telegram** -- 粘贴来自 [BotFather](https://t.me/BotFather) 的机器人令牌。

  </Step>

  <Step id="complete-installation" title="完成安装">
    点击 **Finish** 部署实例。准备就绪后，可从 hPanel 中的 **OpenClaw Overview** 访问 OpenClaw 仪表盘。
  </Step>

</Steps>

## <a id="option-b%3A-openclaw-on-vps"></a><a id="option-b-openclaw-on-vps"></a> 选项 B：VPS 上的 OpenClaw

对服务器的更多控制。 Hostinger 通过 Docker 在您的 VPS 上部署 OpenClaw。您可以通过 hPanel 中的 **Docker Manager** 进行管理。

<Steps>
  <Step id="purchase-a-vps" title="购买 VPS">
    1. 从 [Hostinger OpenClaw 页面 ](https://www.hostinger.com/openclaw)，选择 VPS 计划上的 OpenClaw 并完成结帐。

    <Note>
    您可以在结帐时选择 **即用型 AI** 积分。这些积分是预先购买的并立即集成到 OpenClaw 中。您无需任何外部帐户或其他提供商的 API 密钥即可开始聊天。
    </Note>

  </Step>

  <Step id="configure-openclaw" title="配置OpenClaw">
    VPS 配置完成后，填写配置字段：

    - **网关令牌** -- 自动生成。保存以供以后使用。
    - **WhatsApp number** -- 带国家代码的你的号码（可选）。
    - **Telegram bot token** -- 来自 [BotFather](https://t.me/BotFather)（可选）。
    - **API keys** -- 仅在你未在结账时选择 Ready-to-Use AI 额度时需要。

  </Step>

  <Step id="start-openclaw" title="开始 OpenClaw">
    点击 **Deploy**。运行后，通过点击 **Open** 从 hPanel 打开 OpenClaw 仪表盘。
  </Step>

</Steps>

日志、重启和更新都通过 hPanel 中的 Docker Manager 界面运行。要更新，请在 Docker Manager 中点击 **Update** 以拉取最新镜像。

## <a id="verify-your-setup"></a> 验证你的设置

在你连接的频道上向你的助手发送“Hi”。OpenClaw 会回复你，并引导你完成初始偏好设置。

## <a id="troubleshooting"></a> 故障排查

**仪表板未加载** -- 等待几分钟，让容器完成配置。然后读取 hPanel 中的 Docker Manager 日志。

**Docker 容器不断重启** -- 打开 Docker Manager 日志并查找配置错误（缺少令牌、无效的 API 密钥）。

**Telegram 机器人未响应** - 需要 DM 配对时，未知发件人会收到简短的配对代码，而不是回复。从 OpenClaw 仪表板聊天中批准它。如果您有容器的 shell 访问权限，您还可以运行 `openclaw pairing approve telegram <CODE>`。请参阅 [ 配对 ](/channels/pairing)。

## <a id="next-steps"></a> 下一步

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [网关配置](/gateway/configuration) -- 所有配置选项

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [VPS 托管](/vps)
- [DigitalOcean](/install/digitalocean)
