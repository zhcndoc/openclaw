---
summary: "专用机器人 macOS 用户、通过 Tailscale 的远程 Mac、多帐户和 DM 历史模式"
read_when:
  - "选择在何处运行网关和 imsg"
  - "将机器人流量与个人 iMessage 身份隔离"
  - "运行多个 iMessage 账户"
title: "iMessage 部署模式"
sidebarTitle: "部署模式"
---

在登录的消息帐户旁边运行 `imsg` 的拓扑，以及每个帐户所需的配置。

## <a id="deployment-patterns"></a> 部署模式

<AccordionGroup>
  <Accordion id="dedicated-bot-macos-user-separate-imessage-identity" title="专用机器人 macOS 用户（单独的 iMessage 身份）">
    使用专用 Apple ID 和 macOS 用户，这样 bot 流量就会与个人 Messages 配置文件隔离开来。

    典型流程：

    1. Create/sign 位于专用 macOS 用户中。
    2. 在该用户中使用 bot Apple ID 登录 Messages。
    3. 在该用户中安装 `imsg`。
    4. 创建一个 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行时，可能需要在该 bot 用户会话中进行 GUI 授权（Automation + Full Disk Access）。

  </Accordion>

  <Accordion id="remote-mac-over-tailscale-example" title="通过 Tailscale 远程 Mac（示例）">
    常见拓扑：

    - 网关运行在 Linux/VM 上
    - iMessage + `imsg` 运行在 tailnet 中的一台 Mac 上
    - `cliPath` 包装器使用 SSH 运行 `imsg`
    - `remoteHost` 通过 SSH/SCP 启用入站获取以及仅限所有者的出站暂存

    示例：

    ```json5
    {
      channels: {
        imessage: {
          enabled: true,
          cliPath: "/home/openclaw/.openclaw/scripts/imsg-ssh",
          remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
          includeAttachments: true,
          dbPath: "/Users/bot/Library/Messages/chat.db",
        },
      },
    }
    ```

    ```bash
    #!/usr/bin/env bash
    exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
    ```

    `cliPath` 是网关本地的绝对包装器路径。`remoteHost` 和 `dbPath` 指向 Messages Mac；不要使用网关用户的主目录重写远程数据库路径。

    使用 SSH 键，因此 SSH 和 SCP 都是非交互式的。首先信任主机密钥（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填充 `known_hosts`。

  </Accordion>

  <Accordion id="multi-account-pattern" title="多账户模式">
    iMessage 支持在 `channels.imessage.accounts` 下为每个账号进行配置。

    每个帐户都可以覆盖 `cliPath`、`dbPath`、`allowFrom`、`dmPolicy`、`groupPolicy`、`mediaMaxMb`、历史记录设置和附件根白名单等字段。省略的账户策略继承频道根；明确的账户政策获胜。如果两个范围均未设置它们，则 DM 使用 `pairing`，组使用 `allowlist`。

  </Accordion>

  <Accordion id="direct-message-history" title="私信历史记录">
    将 `channels.imessage.dmHistoryLimit` 设为一个值，可使用该会话最近解码过的 `imsg` 历史为新的直接消息会话播种。使用 `channels.imessage.dms["<sender>"].historyLimit` 可按发送者覆盖，包括设置为 `0` 以禁用该发送者的历史。

    iMessage DM 历史会按需从 `imsg` 获取。保持未设置 `dmHistoryLimit` 会禁用全局 DM 历史播种，但为某个发送者设置正值的 `channels.imessage.dms["<sender>"].historyLimit` 仍会为该发送者启用播种。

  </Accordion>
</AccordionGroup>
