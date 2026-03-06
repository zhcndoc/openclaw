---
summary: "通过 imsg（基于 stdio 的 JSON-RPC）提供 iMessage 旧版支持。新的部署应使用 BlueBubbles。"
read_when:
  - 设置 iMessage 支持
  - 调试 iMessage 发送/接收
title: "iMessage"
---

# iMessage（旧版：imsg）

<Warning>
新的 iMessage 部署请使用 <a href="/channels/bluebubbles">BlueBubbles</a>。

`imsg` 集成为旧版方案，未来版本可能会移除。
</Warning>

状态：旧版外部 CLI 集成。网关启动 `imsg rpc`，通过 stdio 以 JSON-RPC 通信（没有独立守护进程或端口）。

<CardGroup cols={3}>
  <Card title="BlueBubbles（推荐）" icon="message-circle" href="/channels/bluebubbles">
    新部署首选的 iMessage 路径。
  </Card>
  <Card title="配对" icon="link" href="/channels/pairing">
    iMessage 私信默认启用配对模式。
  </Card>
  <Card title="配置参考" icon="settings" href="/gateway/configuration-reference#imessage">
    iMessage 字段完整参考。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="本地 Mac（快速路径）">
    <Steps>
      <Step title="安装并验证 imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="配置 OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<你>/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>

      <Step title="批准首次私信配对（默认 dmPolicy）">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <代码>
```

        配对请求会在 1 小时后过期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="通过 SSH 远程 Mac">
    OpenClaw 只需要一个兼容 stdio 的 `cliPath`，所以你可以让 `cliPath` 指向一个通过 SSH 连接远程 Mac 并运行 `imsg` 的包装脚本。

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    启用附件时推荐配置：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // 用于 SCP 附件获取
      includeAttachments: true,
      // 可选：覆盖允许的附件根目录。
      // 默认包括 /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    如果未设置 `remoteHost`，OpenClaw 会尝试解析 SSH 包装脚本自动检测它。
    `remoteHost` 必须是 `host` 或 `user@host`（不支持空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的主机密钥检查，因此中继主机密钥必须事先存在于 `~/.ssh/known_hosts`。
    附件路径会校验是否符合允许根目录（`attachmentRoots` / `remoteAttachmentRoots`）。

  </Tab>
</Tabs>

## 要求和权限（macOS）

- 执行 `imsg` 的 Mac 必须已登录 Messages。
- 运行 OpenClaw/`imsg` 的进程上下文必须具有完整磁盘访问权限（以访问 Messages 数据库）。
- 发送消息需要 Messages.app 的自动化权限。

<Tip>
权限是基于进程上下文授予的。如果网关以无头方式运行（LaunchAgent/SSH），请在同一上下文中执行一次交互命令以触发权限提示：

```bash
imsg chats --limit 1
# 或者
imsg send <handle> "test"
```

</Tip>

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.imessage.dmPolicy` 控制私信类型：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许名单字段：`channels.imessage.allowFrom`。

    允许名单条目可以是句柄或聊天目标（`chat_id:*`，`chat_guid:*`，`chat_identifier:*`）。

  </Tab>

  <Tab title="群组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组消息处理：

    - `allowlist`（配置时默认）
    - `open`
    - `disabled`

    群组发送者允许名单字段：`channels.imessage.groupAllowFrom`。

    运行时回退：若未设置 `groupAllowFrom`，则 iMessage 群组发送者检查将回退使用 `allowFrom`（如果可用）。
    运行时注意：若完全缺少 `channels.imessage`，运行时会回退至 `groupPolicy="allowlist"`，且记录警告（即使 `channels.defaults.groupPolicy` 已设置）。

    群组提及门控：

    - iMessage 无原生提及元数据
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退为 `messages.groupChat.mentionPatterns`）
    - 若无配置的模式，无法强制执行提及门控

    授权发送者的控制命令可绕过群组的提及门控。

  </Tab>

  <Tab title="会话和确定性回复">
    - 私信使用直接路由；群组使用群组路由。
    - 默认 `session.dmScope=main` 时，iMessage 私信会合并到代理主会话。
    - 群组会话被隔离（`agent:<agentId>:imessage:group:<chat_id>`）。
    - 回复会根据起始通道和目标元数据路由回 iMessage。

    群组线程行为：

    部分多参与者的 iMessage 线程可能带有 `is_group=false`。
    若该 `chat_id` 在 `channels.imessage.groups` 中明确配置，OpenClaw 会将其视为群组消息（启用群组门控与会话隔离）。

  </Tab>
</Tabs>

## 部署模式

<AccordionGroup>
  <Accordion title="专用机器人 macOS 用户（独立 iMessage 身份）">
    使用专用 Apple ID 和 macOS 用户，使机器人消息流与个人 Messages 配置隔离。

    通常流程：

    1. 创建/登录专用 macOS 用户。
    2. 在该用户中使用机器人 Apple ID 登录 Messages。
    3. 在该用户中安装 `imsg`。
    4. 创建 SSH 包装脚本，使 OpenClaw 能在该用户上下文运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置。

    初次运行可能需要在该机器人用户会话中手动批准 GUI 权限（自动化与完整磁盘访问）。

  </Accordion>

  <Accordion title="通过 Tailscale 远程 Mac（示例）">
    常见拓扑：

    - 网关运行在 Linux/虚拟机上
    - iMessage + `imsg` 运行在 tailnet 中的 Mac 上
    - `cliPath` 包装脚本使用 SSH 运行 `imsg`
    - `remoteHost` 支持 SCP 附件获取

    示例：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
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

    请使用 SSH 密钥以实现 SSH 和 SCP 的无交互认证。
    确保可信任主机密钥（例如执行 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填充 `known_hosts`。

  </Accordion>

  <Accordion title="多账号模式">
    iMessage 支持在 `channels.imessage.accounts` 下进行多账号配置。

    每个账号可覆盖如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史设置及附件根目录允许名单等字段。

  </Accordion>
</AccordionGroup>

## 媒体、分块及投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 可选接收附件：`channels.imessage.includeAttachments`
    - 设置 `remoteHost` 时可通过 SCP 获取远程附件路径
    - 附件路径需符合允许根目录：
      - `channels.imessage.attachmentRoots`（本地）
      - `channels.imessage.remoteAttachmentRoots`（远程 SCP 模式）
      - 默认模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用严格的主机密钥检查（`StrictHostKeyChecking=yes`）
    - 发送媒体大小限制由 `channels.imessage.mediaMaxMb` 控制（默认 16 MB）
  </Accordion>

  <Accordion title="出站分块">
    - 文本分块限制：`channels.imessage.textChunkLimit`（默认 4000）
    - 分块模式：`channels.imessage.chunkMode`
      - `length`（默认）
      - `newline`（优先按段落分割）
  </Accordion>

  <Accordion title="地址格式">
    推荐的显式目标格式：

    - `chat_id:123`（推荐用于稳定路由）
    - `chat_guid:...`
    - `chat_identifier:...`

    也支持句柄目标：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许通道发起的配置写入（针对启用了 `commands.config: true` 的 `/config set|unset` 命令）。

禁用示例：

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

## 故障排查

<AccordionGroup>
  <Accordion title="找不到 imsg 或 RPC 不支持">
    验证二进制及 RPC 支持：

```bash
imsg rpc --help
openclaw channels status --probe
```

    若探测显示不支持 RPC，请更新 `imsg`。

  </Accordion>

  <Accordion title="私信被忽略">
    检查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配对批准（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion title="群组消息被忽略">
    检查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 允许名单规则
    - 提及模式配置（`agents.list[].groupChat.mentionPatterns`）

  </Accordion>

  <Accordion title="远程附件失败">
    检查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 网关主机的 SSH/SCP 密钥认证
    - 网关主机 `~/.ssh/known_hosts` 是否包含主机密钥
    - 运行 Messages 的 Mac 上远程路径的可读性

  </Accordion>

  <Accordion title="错过 macOS 权限提示">
    在相同用户/会话上下文的交互式 GUI 终端中重新运行并批准权限：

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    确认运行 OpenClaw/`imsg` 的进程上下文已授予完整磁盘访问和自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指引

- [配置参考 - iMessage](/gateway/configuration-reference#imessage)
- [网关配置](/gateway/configuration)
- [配对](/channels/pairing)
- [BlueBubbles](/channels/bluebubbles)
