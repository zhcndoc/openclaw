---
summary: "修复了丢失的 imsg 二进制文件、静默入站、忽略的 DM 和组以及失败的远程附件"
read_when:
  - "调试iMessage发送或接收"
  - "恢复停止传递消息的网桥"
title: "iMessage 故障排除"
sidebarTitle: "故障排查"
---

针对 iMessage 通道的症状优先修复，以及配置参考链接。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="imsg-not-found-or-rpc-unsupported" title="未找到 imsg 或 RPC 不受支持">
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果检查报告 RPC 不受支持，请更新 `imsg`。如果私有 API 操作不可用，请在登录的 macOS 用户会话中运行 `imsg launch` 并再次检查。如果网关未在 macOS 上运行，请使用 SSH](/channels/imessage/setup#remote-mac-over-ssh) 设置上的 [Remote Mac，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion id="messages-send-but-inbound-imessages-do-not-arrive" title="消息已发送，但入站 iMessage 未到达">
    首先确认消息是否到达了本地 Mac。如果 `chat.db` 没有变化，即使 `imsg status --json` 报告桥接器健康，OpenClaw 也无法收到该消息。

```bash
imsg chats --limit 10 --json
imsg watch --chat-id <chat-id> --json
sqlite3 ~/Library/Messages/chat.db \
  "select datetime(max(date)/1000000000 + 978307200, 'unixepoch', 'localtime'), max(ROWID) from message;"
```

    如果手机发送的消息没有创建新的行，请先修复 macOS Messages 和 Apple Push 层，再修改 OpenClaw 配置。一次性的服务刷新通常就足够了：

```bash
launchctl kickstart -k system/com.apple.apsd
launchctl kickstart -k gui/$(id -u)/com.apple.CommCenter
launchctl kickstart -k gui/$(id -u)/com.apple.identityservicesd
launchctl kickstart -k gui/$(id -u)/com.apple.imagent
imsg launch
openclaw gateway restart
```

    从手机发送一条新的 iMessage，并在调试 OpenClaw 会话之前确认出现了新的 `chat.db` 行或 `imsg watch` 事件。不要把这当作周期性的桥接器重启循环来运行；在工作进行中反复执行 `imsg launch` 加上网关重启，可能会中断投递并让正在运行中的通道会话悬空。

  </Accordion>

  <Accordion id="gateway-is-not-running-on-macos" title="网关未在 macOS 上运行">
    默认 `cliPath: "imsg"` 必须在登录消息的 Mac 上运行。在 Linux 或 Windows 上，将 `channels.imessage.cliPath` 设置为通过 SSH 连接到该 Mac 并运行 `imsg "$@"` 的包装器脚本。

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    然后运行：

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion id="dms-are-ignored" title="DM 被忽略">
    检查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配对批准（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion id="group-messages-are-ignored" title="群组消息被忽略">
    检查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 白名单行为
    - 提及门控：显式模式或路由代理的身份 name/emoji；在有效根或帐户 `groups` 映射中为聊天设置 `requireMention: false`，以处理来自允许发件人的所有消息

  </Accordion>

  <Accordion id="remote-attachments-fail" title="远程附件失败">
    检查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 网关主机上的 SSH/SCP 密钥认证
    - 网关主机的 `~/.ssh/known_hosts` 中是否存在主机密钥
    - 运行 Messages 的 Mac 上远程路径是否可读

  </Accordion>

  <Accordion id="macos-permission-prompts-were-missed" title="macOS 权限提示被错过">
    在同一 user/session 上下文中的交互式 GUI 终端中重新运行并批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    确认为运行 OpenClaw/`imsg`. 的进程上下文授予完全磁盘访问 + 自动化

  </Accordion>
</AccordionGroup>

## <a id="configuration-reference-pointers"></a> 配置参考指针

- [配置参考-iMessage](/gateway/config-channels#imessage)
- [网关配置](/gateway/configuration)
- [配对](/channels/pairing)

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) — 所有支持的通道
- [BlueBubbles 移除与 imsg iMessage 路径](/announcements/bluebubbles-imessage) — 公告与迁移摘要
- [来自BlueBubbles](/channels/imessage-from-bluebubbles) — 配置转换表和逐步切换
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [Groups](/channels/groups) — 群聊行为和提及门控
- [通道路由](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和强化
