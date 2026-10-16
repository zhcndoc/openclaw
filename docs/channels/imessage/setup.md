---
summary: "安装iMessage插件，在Messages Mac上设置imsg，并授予macOS权限"
read_when:
  - "首次设置iMessage通道"
  - "针对远程消息 Mac 运行网关"
  - "授予完整磁盘访问和自动化"
title: "iMessage 设置"
sidebarTitle: "设置"
---

安装插件，在已登录的 Messages Mac 上安装并验证 `imsg`，配置通道，并授予其所需的 macOS 权限。

## <a id="install-the-plugin"></a> 安装插件

在网关主机上安装官方iMessage插件：

```bash
openclaw plugins install @openclaw/imessage
```

在继续之前检查 [ 申请结果](/plugins/manage-plugins#apply-changes-and-inspect)。

<CardGroup cols={3}>
  <Card title="私人 API 操作" icon="wand-sparkles" href="/channels/imessage/rich-messages#private-api-actions">
    回复、轻点回应、效果、投票、附件和群组管理。
  </Card>
  <Card title="配对" icon="link" href="/channels/pairing">
    iMessage 私信默认使用配对模式。
  </Card>
  <Card title="远程Mac" icon="terminal" href="#remote-mac-over-ssh">
    当网关不在 Messages 所在的 Mac 上运行时，请使用 SSH 包装器。
  </Card>
  <Card title="配置参考" icon="settings" href="/gateway/config-channels#imessage">
    iMessage 字段完整参考。
  </Card>
</CardGroup>

## <a id="quick-setup"></a> 快速设置

<Tabs>
  <Tab id="local-mac-fast-path" title="本地 Mac（快速路径）">
    <Steps>
      <Step id="install-and-verify-imsg" title="安装并验证 imsg">

```bash
brew install steipete/tap/imsg
brew update && brew upgrade imsg
imsg rpc --help
imsg launch
openclaw channels status --probe
```

        当本地安装向导检测到缺少默认的 `imsg` 命令时，它可以提示通过 Homebrew 安装 `steipete/tap/imsg`。如果检测到 Homebrew- 管理的 `imsg`，它会提示重新安装或更新。自定义 `cliPath` 包装器未修改。

      </Step>

      <Step id="configure-openclaw" title="配置OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/user/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step id="start-gateway" title="启动网关">

```bash
openclaw gateway
```

      </Step>

      <Step id="approve-first-dm-pairing-default-dmpolicy" title="批准第一个 DM 配对（默认 dmPolicy）">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        配对请求在 1 小时后过期。
      </Step>
    </Steps>

  </Tab>

  <Tab id="remote-mac-over-ssh" title="通过 SSH 远程 Mac">
    大多数设置不需要 SSH。仅当网关无法在登录的 Messages Mac 上运行时才使用此拓扑。将 `cliPath` 指向 **Gateway 主机** 上的 stdio 兼容包装器，该主机通过 SSH 连接到消息 Mac 并运行 `imsg`。使用包装器的绝对路径，以便服务启动不依赖于 shell 主目录扩展。在该远程 Mac 上安装并更新 `imsg`，而不是在网关主机上：

```bash
ssh messages-mac 'brew install steipete/tap/imsg && brew update && brew upgrade imsg'
```

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    启用附件时推荐的配置：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/home/openclaw/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@messages-mac", // Mac that runs Messages.app and imsg
      // This path is interpreted on the Messages Mac, not on the Gateway host.
      dbPath: "/Users/user/Library/Messages/chat.db",
      includeAttachments: true,
      // Optional: extra allowed attachment roots (merged with the default
      // /Users/*/Library/Messages/Attachments).
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    `remoteHost` 用于标识 Messages Mac。OpenClaw 使用它获取入站附件，并暂存出站附件。对于出站文件，OpenClaw 会在该 Mac 上创建一个仅所有者可访问的临时路径，通过现有的严格 SSH/SCP 传输将文件复制过去，仅将远程路径传递给 `imsg`，并尝试在成功、失败或超时后删除该路径。清理操作的 SSH 调用失败时会发出警告，并可能在远程 Mac 上留下仅所有者可访问的临时目录。

    建议使用显式的 `remoteHost`，并且在设置时获胜。为了实现兼容性，OpenClaw 在每个进程中自动检测现有的透明 `exec ssh ... imsg "$@"` 包装器形状，并在监视、检查、发送和私有操作中重用该主机。自动检测仅涵盖简单记录的透明包装器；选项丰富的包装器（例如 ProxyJump/ProxyCommand）必须配置 `remoteHost`。 `remoteHost` 必须是 `host` 或 `user@host`（无空格或 SSH 选项）；不安全的值将被忽略。 OpenClaw 对 SSH/SCP 使用严格的主机密钥检查，因此消息 Mac 主机密钥必须已存在于网关主机上的 `~/.ssh/known_hosts` 中。根据允许的根 （`attachmentRoots` / `remoteAttachmentRoots`） 验证附件路径。

<Warning>
您放在 `imsg` MUST 前面的任何 `cliPath` 包装器或 SSH 代理的行为就像长寿命 JSON-RPC 的透明 stdio 管道。 OpenClaw 在通道的生命周期内通过包装器的 stdin/stdout 交换小型换行帧 JSON-RPC 消息：

- 一旦字节可用，就转发每个标准输入 chunk/line **** — 不要等待 EOF。
- 立即反向转发每个标准输出 chunk/line。
- 保留换行符。
- 避免固定大小的阻塞读取（`read(4096)`、`cat | buffer`、默认 shell `read`），它们可能会饿死小帧。
- 保持 stderr 与 JSON-RPC stdout 流分离。

缓冲标准输入直到大块填充的包装器将产生看起来像 iMessage 中断的症状 - `imsg rpc timeout (chats.list)` 或重复通道重新启动 - 即使 `imsg rpc` 本身是健康的。 `ssh -T host imsg "$@"`（上面）是安全的，因为它转发 OpenClaw 的 `cliPath` 参数，例如 `rpc` 和 `--db`。像 `ssh host imsg | grep -v '^DEBUG'` 这样的管道是 NOT - 行缓冲工具仍然可以容纳帧；如果必须过滤，请在每个阶段使用 `stdbuf -oL -eL`。
</Warning>

  </Tab>
</Tabs>

## <a id="requirements-and-permissions-(macos)"></a><a id="requirements-and-permissions-macos"></a> 要求与权限（macOS）

- Messages 必须在运行 `imsg` 的 Mac 上登录。
- 运行 OpenClaw/`imsg` 的进程上下文需要完全磁盘访问（消息 DB 访问）。
- 通过Messages.app.发送消息需要自动化权限
- 对于高级操作（反应/编辑/取消发送/线程回复/效果/投票/组操作），必须禁用系统完整性保护 - 请参阅 [启用 imsg 私有 API](/channels/imessage/private-api#enabling-the-imsg-private-api)。基本文本和媒体 send/receive 无需它即可工作。

<Tip>
权限是按进程上下文授予的。如果网关以无头方式运行（LaunchAgent/SSH），请在同一上下文中运行一次交互式命令以触发权限提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

<Accordion id="ssh-wrapper-sends-fail-with-appleevents-1743" title="SSH 包装器发送失败，并显示 AppleEvents -1743">
  远程 SSH 设置可以读取聊天、通过 `channels status --probe`，并处理入站消息，但外发发送仍会因 AppleEvents 授权错误而失败：

```text
Not authorized to send Apple events to Messages. (-1743)
```

检查已登录 Mac 用户的 TCC 数据库或“系统设置” > “隐私与安全性” > “自动化”。如果自动化条目记录在 `/usr/libexec/sshd-keygen-wrapper` 而不是 `imsg` 或本地 shell 进程上，macOS 可能不会为该 SSH 服务端客户端暴露可用的 Messages 开关：

```text
kTCCServiceAppleEvents | /usr/libexec/sshd-keygen-wrapper | auth_value=0 | com.apple.MobileSMS
```

在这种状态下，重复执行 `tccutil reset AppleEvents` 或通过同一个 SSH 包装器重新运行 `imsg send` 可能仍然会失败，因为需要 Messages 自动化权限的进程上下文是 SSH 包装器，而不是 UI 可以授予权限的某个应用。

请改用受支持的 `imsg` 进程上下文之一：

- 在已登录的 Messages 用户本地会话中运行 Gateway，或至少运行 `imsg` bridge。
- 在授予同一会话中的完全磁盘访问权限和自动化权限后，使用该用户的 LaunchAgent 启动 Gateway。
- 如果你保留双用户 SSH 拓扑，请在启用通道之前，验证一次真实的外发 `imsg send` 是否能通过确切的包装器成功。如果无法授予自动化权限，请改为单用户 `imsg` 设置，而不要依赖 SSH 包装器来发送消息。

</Accordion>
