---
summary: "静默的 Feishu 机器人、丢失事件、QR 设置失败以及泄露的应用程序机密"
read_when:
  - "Feishu 机器人不在群组或 DM 中应答"
  - "会议邀请自动加入不起作用"
  - "轮换泄露的应用程序机密"
title: "Feishu 故障排除"
sidebarTitle: "故障排查"
---

对不响应、不接收事件或需要轮换其凭据的 Feishu 机器人进行诊断。

## <a id="troubleshooting"></a> 故障排查

### <a id="bot-does-not-respond-in-group-chats"></a> 机器人在群聊中没有响应

1. 检查机器人是否已添加到组中
2. @mention 机器人（默认需要）
3. 验证 `groupPolicy` 不是 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### <a id="bot-does-not-receive-messages"></a> 机器人收不到消息

1. 检查机器人是否已在Feishu开放平台/Lark开发者中发布并获得批准
2. 检查事件订阅是否包含`im.message.receive_v1`
3. 对于会议邀请自动加入，也要订阅 `vc.bot.meeting_invited_v1`
4. 选择**持久连接**（WebSocket）
5. 授予所有必需的权限范围
6. 检查网关是否正在运行：`openclaw gateway status`
7. 检查日志：`openclaw logs --follow`

订阅 `vc.bot.meeting_invited_v1` 只会投递该事件。自动加入默认是关闭的。 如需全局启用：

```json5
{
  channels: {
    feishu: {
      vcAutoJoin: true,
    },
  },
}
```

如需仅为一个账号启用，省略顶层开关，并设置账号覆盖：

```json5
{
  channels: {
    feishu: {
      accounts: {
        meetings: { vcAutoJoin: true },
      },
    },
  },
}
```

在代理收到加入轮次之前，邀请者仍会通过正常的 Feishu DM 策略、allowlist/pairing、会话和回复路由。加入还需要一个可用的 Feishu VC 加入工具，该工具配置为具有 `vc:meeting.bot.join:write` 范围的应用程序身份。例如，官方[`lark-cli` VC代理技能](https://github.com/larksuite/cli/tree/main/skills/lark-vc-agent)提供了`vc +meeting-join`。

<Warning>
官方 `lark-cli` VC agent skill 当前将会议机器人操作标记为受限 beta 版。如果工具返回 `ErrNotInGray` 或错误码 `20017`，说明该应用或租户尚未启用该 beta；在排查普通权限授予之前，请先使用链接技能中的早期访问指南。
</Warning>

### <a id="webhook-callbacks-rejected-with-401-invalid-signature"></a> Webhook 回调因 401 签名无效而被拒绝

1. 检查网关主机时钟：webhook 模式拒绝时间戳距服务器时钟超过一小时（之前或之后）的签名回调。验证 NTP 同步以及系统时间是否正确。
2. 确认配置的`encryptKey`与Feishu开放平台/Lark开发者中应用程序的加密密钥匹配。
3. 验证 Webhook URL 路径和端口是否与 `channels.feishu.webhook*` 配置匹配。
4. 检查日志：`openclaw logs --follow`是否有来自意外发件人的重复签名失败。

### <a id="qr-setup-does-not-react-in-the-feishu-mobile-app"></a> QR 设置在 Feishu 移动应用程序中没有反应

1. 重新运行设置：`openclaw channels login --channel feishu`
2. 选择手动设置
3. 在Feishu开放平台中，​​创建一个自建应用，并复制其App ID和App Secret
4. 将这些凭据粘贴到设置向导中

### <a id="app-secret-leaked"></a> App Secret 泄露

1. 在Feishu开放平台重置App Secret / Lark开发者
2. 更新配置中的值
3. 验证 [hot reload](/gateway/configuration/hot-reload) 是否应用了 `openclaw channels status --probe` 的新凭证。
