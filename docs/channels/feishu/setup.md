---
summary: "Feishu/Lark 机器人设置向导，以及入站事件如何持久排队"
read_when:
  - "首次连接 Feishu 或 Lark 机器人"
  - "在 WebSocket 和 Webhook 事件传递之间进行选择"
title: "Feishu 设置"
sidebarTitle: "设置"
---

运行通道设置向导，然后了解 OpenClaw 如何持久接受入站 Feishu 事件。

## <a id="quick-start"></a> 快速开始

<Note>
需要 OpenClaw 2026.5.29 或更高版本。运行 `openclaw --version` 检查。使用 `openclaw update` 升级。
</Note>

<Steps>
  <Step id="run-the-channel-setup-wizard" title="运行通道设置向导">
  ```bash
  openclaw channels login --channel feishu
  ```
  如果缺少 `@openclaw/feishu` 插件，则会安装它，然后进入设置流程：

- **手动设置**：粘贴来自Feishu开放平台（`https://open.feishu.cn`）或Lark开发者（`https://open.larksuite.com`）的应用程序ID和应用程序密钥。
- **QR setup**：扫描Feishu应用程序中的QR代码以自动创建机器人。此流程将 DM 锁定到您自己的帐户（`dmPolicy: "allowlist"` 与您的 `open_id`）。

该向导还要求提供 API 域（Feishu 与 Lark）和组策略。如果国内 Feishu 移动应用程序对 QR 代码没有反应，请重新运行设置并选择手动设置。
</Step>

  <Step id="verify-the-channel-after-setup" title="设置后验证通道">
  <a id="after-setup-completes%2C-restart-the-gateway-to-apply-the-changes" />
  配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。检查 Feishu 是否准备就绪：
  ```bash
  openclaw channels status --probe
  ```
  如果网关离线，请启动网关。
  </Step>
</Steps>

## <a id="inbound-durability"></a> 入站持久性

在代理调度之前，OpenClaw 将经过身份验证的 `im.message.receive_v1` 和 `drive.notice.comment_add_v1` 信封持久排队。 webhook模式下，耐用的`200`携带`x-openclaw-delivery-accepted: durable`；验证挑战、非持久事件类型和错误响应省略了标记，因此反向代理可以要求它区分持久接受和通用 `200`。待处理或可重试的事件在网关重新启动后仍然存在，保持每个聊天或文档的序列化，并使用 Feishu 的事件 ID 来抑制重复的队列条目，同时存在活动或保留的完成记录。

如果 WebSocket 事件在有界重试后无法持久，则 OpenClaw 会关闭该套接字并强制建立新的经过身份验证的连接，而不是继续经过未提交的轮次。其他 Feishu 事件类型（包括反应和 VC 会议邀请）使用其正常事件路径，并且不会收到此持久队列保证。

当 Feishu 帐户停止时，OpenClaw 关闭消息、菜单、卡片、会议和反应处理程序的准入，并等待接受的处理程序和重放防护写入在释放帐户资源之前解决。每聊五分钟的队列限制释放了点餐槽位；它不会取消原始处理程序，也不会在该处理程序仍在运行时完成帐户清理。

## <a id="webhook-delivery-window"></a> Webhook 传递窗口

Feishu 在发送时对每个 Webhook 传递进行签名，因此捕获的签名回调将永远保持有效签名。因此，在解析正文之前，Webhook 模式会拒绝任何 `x-lark-request-timestamp` 早于或晚于网关主机时钟一小时以上的签名回调。这是一种重播防御：它与每条消息的重播防护（24 小时窗口）一起工作，因此重新传递的签名回调无法重新触发相同的操作。

实际后果：

- 保持网关主机时钟同步（NTP）。与 Feishu 服务器偏差超过一小时的主机时钟会拒绝新的交付。
- Feishu 交付在发送时进行签名，因此普通重新交付带有新的时间戳并且不受影响。
- WebSocket 模式不受此窗口的影响。
- 该窗口没有配置密钥；它是故意固定的。
