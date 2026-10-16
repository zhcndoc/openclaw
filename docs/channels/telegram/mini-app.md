---
summary: "使用 /controlui 将 OpenClaw Control UI 作为 Telegram WebApp 打开"
read_when:
  - "从 Telegram 内部打开 OpenClaw Control UI"
  - "通过 Tailscale 服务器或漏斗发布网关"
title: "Telegram Control UI 迷你应用程序"
sidebarTitle: "Control UI 小程序"
---

在 Telegram 中运行 Control UI 作为迷你应用程序。

<a id="dashboard-mini-app" />

## <a id="control-ui-mini-app"></a> Control UI 迷你应用程序

Control UI 迷你应用程序将完整的 [OpenClaw Control UI](/web/control-ui) 打开为 Telegram WebApp。使用机器人在 DM 中运行 `/controlui`，然后点击 **打开 Control UI**。当 Telegram 插件处于活动状态时，该命令会自动注册；没有单独的小应用程序标志。

`/dashboard` 在 Telegram 上创建或更新会话仪表板，就像在其他通道上一样。使用`/controlui`打开OpenClaw的Control UI。

要求：

- `gateway.tailscale.mode: "serve"` 或 `"funnel"`，用于发布 HTTPS 迷你应用 URL。
- 您的数字 Telegram 用户 ID 必须位于所选账户的有效 `allowFrom` 中，或位于 `commands.ownerAllowFrom` 中。通配符和用户名不会授予迷你应用所有者访问权限。
- 使用 DM。在组中，`/controlui` 回复 `open this in a DM with the bot` 且不发送任何按钮。
- Docker安装：Serve/Funnel模式要求网关在`tailscaled`旁边绑定环回，而使用已发布端口的桥接网络无法满足。使用 `network_mode: host` 运行网关容器，并将主机 `tailscaled` 套接字 （`/var/run/tailscale`） 以及 `tailscale` CLI 挂载到容器中。

如果 `/controlui` 回复 `Restricted to the bot owner`，请要求您的 OpenClaw 管理员将回复中显示的数字 Telegram 用户 ID 添加到所选机器人帐户的 `allowFrom`（例如，`channels.telegram.accounts.ops.allowFrom`）或`commands.ownerAllowFrom` 使用 `telegram:<userId>` 条目。保留现有的允许列表条目，并在配置更改生效后重试 `/controlui`。管理员还可以将数字 ID 添加到该所有者列表已引用的访问组的 Telegram 成员中。

<a id="upgrading-from-dashboard" />

## <a id="upgrading-from-%2Fdashboard"></a><a id="upgrading-from-/dashboard"></a> 从`/dashboard`升级

早期版本（包括 OpenClaw、2026.8.x 和 2026.9.1）使用 `/dashboard` 打开 Telegram 迷你应用程序。升级后使用`/controlui`，并更新保存的引用小应用程序的说明、快捷方式和自定义机器人菜单描述。 `/dashboard` 现在创建或更新会话仪表板；它不会重定向到 `/controlui`。

当 Telegram 帐户启动时，网关会在机器人菜单中注册新命令。小程序URL和Tailscale配置保持不变。请求新的 `/controlui` 按钮；以前的启动链接是短暂的。

升级后，仅通配符访问组不再授予 Control UI 启动或小应用程序身份验证。添加显式数字所有者 ID 以恢复访问权限；用户名和通配符仍然不够。

## <a id="publish-the-mini-app"></a> 发布小程序

配置以下受支持的 Tailscale 发布模式之一：

```json5
{
  gateway: {
    tailscale: {
      mode: "serve", // or "funnel"
    },
  },
}
```

在构建 Control UI 和 WebSocket URL 时，OpenClaw 自动遵循 `gateway.controlUi.basePath`。

当小程序打开时，Telegram 会提供签名的 WebApp `initData`。 OpenClaw 使用所选机器人帐户的令牌验证其签名，拒绝丢失、无效、过期或重播的数据，提取数字 Telegram 用户 ID，并在移交给 Control UI 之前再次检查所有者访问权限。

如果 `/controlui` 无法解析已发布的 HTTPS URL，则会回复：

```text
Mini App needs an HTTPS gateway URL. Set `gateway.tailscale.mode: serve` or `funnel`, then retry /controlui.
```

设置上述模式之一，确保 Tailscale 正在网关主机上运行，然后重试该命令。

小程序是 Tailscale-only v1 路径，不支持 Telegram Web iframe。
