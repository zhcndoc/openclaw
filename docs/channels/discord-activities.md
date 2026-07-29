---
summary: "在 Discord Activities 中启动独立的 OpenClaw HTML 小部件"
read_when:
  - 设置或排查 Discord Activity 小部件
title: "Discord Activities"
---

Discord Activities 允许代理向当前 Discord 频道发布一个交互式、独立的 HTML 小部件。消息包含一个 **Open widget** 按钮；点击后会在 Discord 内启动该小部件。

该功能默认关闭。只有在 `channels.discord.activities` 存在且客户端密钥可解析时，OpenClaw 才会注册 Activity HTTP 路由、`show_widget` 代理工具以及启动按钮处理程序。已弃用的 `discord_widget` 别名在一个版本周期内仍可用。

## 前提条件

- 一个已存在的 [OpenClaw Discord 机器人](/channels/discord)
- 一个可公开访问、能够连接到 OpenClaw 网关的 HTTPS 主机名
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

## 设置

<Steps>
  <Step title="通过 HTTPS 暴露网关">
    启动你的隧道或反向代理，并在添加 Activities 配置后验证 `https://openclaw.example.com/discord/activity/` 能够访问到网关。将示例主机名替换为你自己的。
  </Step>

  <Step title="在 Discord 中启用 Activities">
    在 [Discord 开发者门户](https://discord.com/developers/applications) 中打开现有的 bot 应用。打开 **Activities**，启用 Activities，并创建一个 URL 映射：

    - prefix: `ROOT` (`/`)
    - target: `openclaw.example.com/discord/activity`

    target 是公网主机名加上 `/discord/activity`，末尾没有斜杠。

  </Step>

  <Step title="复制 OAuth2 客户端密钥">
    在开发者门户中打开 **OAuth2**。Discord 至少要求一个重定向 URI，因此如果应用还没有，请添加一个本地占位符，例如 loopback 地址；Embedded App SDK 会处理 Activity 返回流程。复制或重置应用的客户端密钥。请将其视为凭证：不要把它粘贴到聊天、日志或已提交的配置文件中。
  </Step>

  <Step title="配置 OpenClaw">
    向应该提供 widgets 的 Discord 账号添加一个块：

    ```json5
    {
      channels: {
        discord: {
          token: "${DISCORD_BOT_TOKEN}",
          activities: {
            clientSecret: "${DISCORD_CLIENT_SECRET}",
            // 可选。默认使用启动时获取到的 bot 应用 ID。
            applicationId: "YOUR_DISCORD_APPLICATION_ID",
          },
        },
      },
    }
    ```

    当 `DISCORD_CLIENT_SECRET` 已设置时，你可以从该块中省略 `clientSecret`。但该块本身必须保留，以启用此功能。

    正常的 Discord 访问设置仍然是分开的。例如，`allowFrom` 仍然控制谁可以给 agent 发送私信；它不控制谁可以打开已经发布在频道中的 widget。

  </Step>

  <Step title="重启并测试">
    重启网关。在 Discord 对话中，让 agent 显示一个交互式 widget。agent 会调用 `show_widget`；点击已发布消息上的 **Open widget**。
  </Step>
</Steps>

## 安全模型

- 在返回小组件元数据之前，OAuth 会先识别 Discord 用户。
- Discord 的 Get Activity Instance API 必须确认 OAuth 用户当前存在于该 Activity 实例中。实例频道必须与发布小组件的频道一致。
- Discord 允许进入该频道的所有人都可以打开其小组件。要缩小受众范围，请使用 Discord 频道权限。OpenClaw 命令和 DM 白名单不会授予或移除对已发布频道内容的访问权限。
- OAuth 会话在 15 分钟后过期。小组件文档能力在 60 秒后过期，并且只能使用一次。
- 小组件在七天后过期，每个 Discord 插件实例最多保留 64 个。
- 小组件 HTML 由你的代理编写，应被视为受信任内容。不要嵌入你不希望有缺陷的小组件暴露的秘密信息。
- 小组件可以在其自身的嵌套框架内导航。`sandbox="allow-scripts"` 的 iframe 会阻止顶级导航、弹出窗口以及同源访问，而其内容安全策略会阻止网络连接和外部资源。这些控制属于纵深防御，不是针对编写该小组件的代理的安全边界。
- 当 Activities 被禁用时，`/discord/activity` 根本不会注册。

启用后，公开的 Activity 外壳和令牌交换路由会通过你的隧道变为可访问。它们不会在没有有效 OAuth 会话和一次性文档能力的情况下暴露小组件 HTML。

## 故障排除

### 活动显示“网关离线”

- 确认隧道正在运行，并且路由到了网关的实际绑定端口
- 确认 Developer Portal 目标包含 `/discord/activity`
- 在更改 Discord 或 OpenClaw 配置后重启网关
- 检查网关日志中是否有关于缺少 Activities client secret 的单行警告

### Discord 打开空白页面或报告 `blocked:csp`

- 验证 URL 映射使用了 `ROOT`，且没有额外添加第二个 `/discord/activity` 段
- 确认 shell、`shell.js` 和 SDK 模块都通过 Discord 代理返回
- 检查网关日志中 `/discord/activity/` 下的请求

Widget 网络请求会被故意阻止。请将 widget 所需的所有 CSS、JavaScript、图片和数据全部内联。

### “Widget 不可用”

请从代理发布它的频道中启动该按钮。OpenClaw 会在点击时在服务端跟踪启动，因此即使 Discord 省略或破坏了按钮的自定义 ID，一个新的启动记录也能解析到准确的 widget。当自定义 ID 和启动记录都无法解析时，OpenClaw 会在该频道中打开最近发布的在线 widget。较旧的 widget 仍可通过保留其自定义 ID 的按钮访问。

### “你无法在此频道中启动 Activities”

Discord 不会从论坛帖线程中启动 Activities。OpenClaw 可以在那里发布 widget 消息和按钮，但请改为从普通文本频道启动该 Activity。这个限制来自 Discord，而不是 OpenClaw。
