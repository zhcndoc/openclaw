---
summary: "套接字模式、HTTP 请求 URL 和中继模式比较"
read_when:
  - "在套接字模式、HTTP 请求 URL 和中继模式之间进行选择"
  - "在负载均衡器后面运行多个网关副本"
  - "调整套接字模式重新连接行为"
title: "Slack 运输"
sidebarTitle: "交通"
---

哪种 Slack 传输适合您的部署形状，以及套接字模式在运行时的行为方式。

## <a id="choosing-a-transport"></a> 选择传输方式

Socket Mode 和 HTTP Request URLs 在消息、斜杠命令、App Home 和交互性方面功能齐全。请选择部署形态，而不是按功能选择。

| 关注点                      | Socket Mode（默认）                                                                                                                                  | HTTP 请求 URL                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 公共网关 URL           | 不需要                                                                                                                                           | 需要（DNS、TLS、反向代理或隧道）                                                                   |
| 出站网络             | 必须能够访问至 `wss-primary.slack.com` 的出站 WSS                                                                                              | 无出站 WS；仅入站 HTTPS                                                                             |
| 所需令牌                | 机器人身份：机器人令牌 + 具有 `connections:write` 权限的应用级令牌；用户身份：用户令牌 + 应用级令牌                                        | 机器人身份：机器人令牌 + 签名密钥；用户身份：用户令牌 + 签名密钥                           |
| 开发笔记本 / 防火墙后方 | 开箱即用                                                                                                                                            | 需要公共隧道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或预发布网关                          |
| 水平扩展           | 每台主机上的每个应用使用一个 Socket Mode 会话；多个网关需要使用不同的 Slack 应用                                                                   | 无状态 POST 处理程序；多个网关副本可以在负载均衡器后共享一个应用                     |
| 单个网关上的多账户 | 支持；每个账户都会建立自己的 WS 连接                                                                                                               | 支持；每个账户都需要唯一的 `webhookPath`（默认为 `/slack/events`），以避免注册冲突 |
| 斜杠命令传输      | 通过 WS 连接交付； `slash_commands[].url` 被忽略                                                                                    | Slack 发布到 `slash_commands[].url`；命令调度需要该字段                           |
| 请求签名              | 不使用（身份验证依赖应用级令牌）                                                                                                                 | Slack 会对每个请求进行签名；OpenClaw 使用 `signingSecret` 进行验证                                              |
| 连接断开时恢复  | Slack SDK 自动重连使能； OpenClaw 还会以有限的退避重新启动失败的套接字模式会话。适用固定的 15 秒客户端 pong 超时。 | 无需断开持久连接；重试是针对来自 Slack 的每个请求                                           |

<Note>
  **选择 Socket Mode** 适用于单网关主机、开发笔记本，以及能够访问 `*.slack.com` 但不能接受入站 HTTPS 的本地/内网环境。

**选择 HTTP Request URLs** 适用于在负载均衡器后运行多个网关副本、出站 WSS 被阻止但允许入站 HTTPS，或者你已经在反向代理处终结 Slack webhook 的场景。
</Note>

<Warning>
  Slack 可以为一个应用程序维护多个套接字模式连接，并且可以将每个有效负载传递到任何连接。因此，共享 Slack 应用程序的单独 OpenClaw 网关需要等效的路由和授权配置。否则，请为每个网关使用单独的 Slack 应用程序、单个中继入口或负载均衡器后面的 HTTP 请求 URL。请参阅使用插座 Mode](https://docs.slack.dev/apis/events-api/using-socket-mode#using-multiple-connections) 的 [。
</Warning>

### <a id="relay-mode"></a> 中继模式

中继模式将 Slack 入口与 OpenClaw gateway 分离。受信任的路由器拥有唯一的 Slack Socket Mode 连接，选择目标 gateway，并通过已认证的 websocket 转发带类型的事件。gateway 仍然使用自己的 bot token 来执行外发的 Slack Web API 调用。

```json5
{
  channels: {
    slack: {
      mode: "relay",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      relay: {
        url: "wss://router.example.com/gateway/ws",
        authToken: { source: "env", provider: "default", id: "SLACK_RELAY_AUTH_TOKEN" },
        gatewayId: "team-gateway",
      },
    },
  },
}
```

中继 URL 必须使用 `wss://`，除非它以 localhost 为目标。将承载令牌和路由器路由表视为 Slack 授权边界的一部分：路由事件作为授权激活进入正常的 Slack 消息处理程序。 websocket `hello` 帧中路由器提供的 `slack_identity` 可以设置默认的出站用户名和图标；调用者提供的显式身份仍然获胜。中继连接以与套接字模式相同的有界退避时间重新连接，并在断开连接时清除路由器提供的身份。

中继 WebSocket 连接遵循网关主机的代理环境（`HTTPS_PROXY`、`HTTP_PROXY`、`ALL_PROXY`、小写变体和 `NO_PROXY`）。配置代理时，`wss://` 中继使用 HTTP `CONNECT` 隧道。匹配的 `NO_PROXY` 条目或本地主机 `ws://` URL 直接连接。报告代理错误，而不是默默地退回到直接中继连接。

## <a id="socket-mode-transport-tuning"></a> Socket Mode 传输调优

OpenClaw 将 Socket Mode 的 Slack SDK 客户端 pong 超时设置为 15 秒。这是固定的内部默认值，操作员无法配置。

注意：

- `channels.slack.socketMode` 对象（包括 `clientPingTimeout`、`serverPingTimeout` 和 `pingPongLoggingEnabled`）已弃用，运行时不再读取。`openclaw doctor` 会针对已弃用的布局调优配置项显示一般性提示，而不是显示逐项路径。`openclaw doctor --fix` 会移除这些字段在任何位置的配置，包括频道根目录和 `accounts.<accountId>` 下，并在 `socketMode` 对象为空后将其删除。你在其中添加的任何其他键都会保留，因此请手动删除。
- 应用消息和事件仍属于应用状态，而不是传输存活信号。
- Socket Mode 重启退避时间从约 2 秒开始，最大约为 30 秒。可恢复的启动、等待启动和断开连接失败会一直重试，直到频道停止。永久性的账户和凭据错误（例如身份验证无效、令牌被撤销或缺少权限范围）会快速失败，而不会无限重试。
