---
summary: "在 Discord 活动中启动独立的 OpenClaw HTML 小部件"
read_when:
  - "设置或排查 Discord Activity 小部件"
title: "Discord 活动"
---

Discord 活动允许代理将交互式、独立的 HTML 小部件发布到当前 Discord 频道。该消息包含一个 **Open widget** 按钮；单击它会启动 Discord 内的小部件。

该功能默认关闭。 `show_widget` 仍然是一种核心拥有的工具。当 `channels.discord.activities` 存在并且客户端密钥解析时，Discord 活动路由、启动按钮处理程序和当前频道演示者在该工具后面变得可用。如果没有该块，对公共 Activity 前缀的请求与未注册的路由仍然无法区分。不存在 Discord- 特定的小部件工具或别名。

## <a id="prerequisites"></a> 先决条件

- 一个已存在的 [OpenClaw Discord 机器人](/channels/discord)
- a 到达 OpenClaw 网关的公共 HTTPS 主机名
- 有权限为该机器人的 Discord 应用配置 Activities 和 OAuth2

任何 HTTPS 反向代理或隧道都可以使用。带名称的 Cloudflare Tunnel 可以提供稳定的主机名，而无需直接暴露网关端口。

```yaml
# ~/.cloudflared/config.yml
tunnel: openclaw-discord
credentials-file: /home/you/.cloudflared/TUNNEL-ID.json
ingress:
  - hostname: openclaw.example.com
    service: http://127.0.0.1:18789
  - service: http_status:404
```

```bash
cloudflared tunnel login
cloudflared tunnel create openclaw-discord
cloudflared tunnel route dns openclaw-discord openclaw.example.com
cloudflared tunnel run openclaw-discord
```

保持常规网关身份验证启用。只有 Activity 前缀是公开的，而插件会自行验证 OAuth、Activity 实例成员资格、频道绑定、会话以及一次性文档权限。

## <a id="setup"></a> 设置

<Steps>
  <Step id="expose-the-gateway-over-https" title="通过 HTTPS 公开网关">
    启动你的隧道或反向代理，并在添加 Activities 配置后验证 `https://openclaw.example.com/discord/activity/` 能够访问到网关。将示例主机名替换为你自己的。
  </Step>

  <Step id="enable-activities-in-discord" title="启用 Discord 中的活动">
    在 [Discord Developer Portal](https://discord.com/developers/applications) 中打开现有的机器人应用程序。打开 **Activities**，启用“活动”，并创建 URL 映射：

    - 前缀：`ROOT` （`/`）
    - 目标：`openclaw.example.com/discord/activity`

    target 是公网主机名加上 `/discord/activity`，末尾没有斜杠。

  </Step>

  <Step id="copy-the-oauth2-client-secret" title="复制 OAuth2 客户端密钥">
    在开发者门户中打开 **OAuth2**。Discord 至少要求一个重定向 URI，因此如果应用还没有，请添加一个本地占位符，例如 loopback 地址；Embedded App SDK 会处理 Activity 返回流程。复制或重置应用的客户端密钥。请将其视为凭证：不要把它粘贴到聊天、日志或已提交的配置文件中。
  </Step>

  <Step id="configure-openclaw" title="配置OpenClaw">
    向应该提供 widgets 的 Discord 账号添加一个块：

    ```json5
    {
      channels: {
        discord: {
          token: "${DISCORD_BOT_TOKEN}",
          activities: {
            clientSecret: "${DISCORD_CLIENT_SECRET}",
            // Optional. Defaults to the bot application ID learned at startup.
            applicationId: "YOUR_DISCORD_APPLICATION_ID",
          },
        },
      },
    }
    ```

    当 `DISCORD_CLIENT_SECRET` 被设置时，您可以从块中省略 `clientSecret`。该块本身必须保持存在才能选择加入。

    正常的 Discord 访问设置保持独立。例如，`allowFrom` 仍然控制谁可以代理 DM；它不控制谁可以打开已发布在频道中的小部件。

  </Step>

  <Step id="verify-and-test" title="验证和测试">
    <a id="restart-and-test" />
    配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。如果您更改了网关的服务环境以提供客户端密钥，请重新启动网关。在 Discord 对话中，要求客服人员显示交互式小部件。代理拨打`show_widget`；单击已发布消息上的 **打开小部件**。
  </Step>
</Steps>

核心在将小部件文档交给 Discord 之前验证并包装它。演示者接受最多 48 个 KiB 的 HTML 源，存储最终组成的文档，并始终标记活动按钮 **Open widget**。标准 `show_widget` 引脚、名称、选项卡、尺寸、框架、排序和功能字段仍然可用，因为仪表板状态仍由核心拥有。当 Discord 是唯一可用的演示路径时，不提供已注册的非 HTML 小部件类型。

## <a id="security-model"></a> 安全模型

- 在返回小组件元数据之前，OAuth 会先识别 Discord 用户。
- Discord 的 Get Activity Instance API 必须确认 OAuth 用户当前存在于该 Activity 实例中。实例频道必须与发布小组件的频道一致。
- Discord 允许进入该频道的所有人都可以打开其小组件。要缩小受众范围，请使用 Discord 频道权限。OpenClaw 命令和 DM 白名单不会授予或移除对已发布频道内容的访问权限。
- OAuth 会话在 15 分钟后过期。小组件文档能力在 60 秒后过期，并且只能使用一次。
- 小组件在七天后过期，每个 Discord 插件实例最多保留 64 个。
- 小组件 HTML 由你的代理编写，应被视为受信任内容。不要嵌入你不希望有缺陷的小组件暴露的秘密信息。
- 小部件可以在其自己的嵌套框架内导航。 `sandbox="allow-scripts"` iframe 会阻止顶级导航、弹出窗口和同源访问。其内容安全策略允许共享 [widget CDN 脚本、样式表和字体](/tools/show-widget#libraries-and-fonts)，同时阻止 API 连接和其他外部资源。这些控件是深度防御，而不是针对编写小部件的代理的安全边界。
- 当活动被禁用或其所需的帐户凭据不可用时，路由仍会在内部注册，但 `/discord/activity` 下的公共请求不会得到处理并返回正常的 404。

启用后，可以通过隧道访问公共 Activity shell 和令牌交换路由。如果没有有效的 OAuth 会话和一次性文档功能，它们不会公开小部件 HTML。

## <a id="troubleshooting"></a> 故障排查

### <a id="the-activity-says-%E2%80%9Cgateway-offline%E2%80%9D"></a><a id="the-activity-says-“gateway-offline”"></a> 活动显示“网关离线”

- 确认隧道正在运行，并且路由到了网关的实际绑定端口
- 确认 Developer Portal 目标包含 `/discord/activity`
- 确认[热重载](/gateway/configuration/hot-reload)应用了OpenClaw配置；如果更改了网关的服务环境，请重新启动网关
- 确认 Discord 机器人令牌和活动客户端密钥均在运行网关中解析；不完整的凭据使 `/discord/activity` 在外部隐藏在正常的 404 后面

### <a id="discord-opens-a-blank-page-or-reports-blocked%3Acsp"></a><a id="discord-opens-a-blank-page-or-reports-blockedcsp"></a> Discord 打开空白页面或报告 `blocked:csp`

- 验证 URL 映射使用了 `ROOT`，且没有额外添加第二个 `/discord/activity` 段
- 确认 shell、`shell.js` 和 SDK 模块都通过 Discord 代理返回
- 检查网关日志中 `/discord/activity/` 下的请求

小部件 API 连接被阻止。嵌入小部件所需的数据和图像。脚本、样式表和字体可以使用共享小部件 CDN 白名单；当 CDN 资源未加载时，检查小部件的资源 URL 和 Discord 的代理行为。

### <a id="%E2%80%9Cwidget-unavailable%E2%80%9D"></a><a id="“widget-unavailable”"></a> “Widget 不可用”

请从代理发布它的频道中启动该按钮。OpenClaw 会在点击时在服务端跟踪启动，因此即使 Discord 省略或破坏了按钮的自定义 ID，一个新的启动记录也能解析到准确的 widget。当自定义 ID 和启动记录都无法解析时，OpenClaw 会在该频道中打开最近发布的在线 widget。较旧的 widget 仍可通过保留其自定义 ID 的按钮访问。

### <a id="%E2%80%9Cyou-cannot-launch-activities-in-this-channel%E2%80%9D"></a><a id="“you-cannot-launch-activities-in-this-channel”"></a> “你无法在此频道中启动 Activities”

Discord 不从论坛类渠道发起活动。 OpenClaw 拒绝在那里交付活动组件，而不是发布无法工作的按钮。请改为从常规文本渠道请求小部件。
