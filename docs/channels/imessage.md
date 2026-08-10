---
summary: "通过 imsg 提供原生 iMessage 支持（通过 stdio 传输的 JSON-RPC），并提供用于回复、tapback、效果、投票、附件和群组管理的私有 API 操作。对于符合主机要求的新 OpenClaw iMessage 设置，优先使用此方式。"
read_when:
  - 设置 iMessage 支持
  - 调试 iMessage 发送/接收
title: "iMessage"
---

<Note>
对于常见的 OpenClaw iMessage 部署，请在同一台已登录的 macOS Messages 主机上运行 Gateway 和 `imsg`。如果你的 Gateway 运行在其他位置，请将 `channels.imessage.cliPath` 指向一个透明的 SSH 包装器，由其在 Mac 上运行 `imsg`。

**入站恢复是自动的。** 在桥接或网关重启后，iMessage 会重放停机期间遗漏的消息，并抑制 Apple 在 Push 恢复后可能刷出的过时“积压炸弹”，通过去重确保不会重复分发任何内容。无需启用任何配置——请参见[桥接或网关重启后的入站恢复](#inbound-recovery-after-a-bridge-or-gateway-restart)。
</Note>

<Warning>
BlueBubbles 支持已被移除。请将 `channels.bluebubbles` 配置迁移到 `channels.imessage`；OpenClaw 仅通过 `imsg` 支持 iMessage。从 [BlueBubbles 移除与 imsg iMessage 路径](/announcements/bluebubbles-imessage) 查看简短公告，或从 [来自 BlueBubbles](/channels/imessage-from-bluebubbles) 查看完整迁移表。
</Warning>

状态：原生外部 CLI 集成。Gateway 会启动 `imsg rpc`，并通过 stdio 使用 JSON-RPC 通信——不需要单独的守护进程或端口。强烈建议使用私有 API 模式以获得完整的 iMessage 通道；回复、tapback、效果、投票、附件回复和群组操作都需要 `imsg launch` 以及成功通过私有 API 探测。

对于常见的本地设置，OpenClaw 配置可以在已登录 Messages 的 Mac 上为 `imsg` 提供经用户确认的 Homebrew 安装或更新。手动设置和 SSH 包装器拓扑仍由操作者管理：请在将要运行 Gateway 或包装器的相同用户上下文中安装或更新 `imsg`。

## 安装插件

在网关主机上安装官方 iMessage 插件，然后重启网关：

```bash
openclaw plugins install @openclaw/imessage
```

<CardGroup cols={3}>
  <Card title="私有 API 操作" icon="wand-sparkles" href="#private-api-actions">
    回复、轻点回应、效果、投票、附件和群组管理。
  </Card>
  <Card title="配对" icon="link" href="/channels/pairing">
    iMessage 私信默认使用配对模式。
  </Card>
  <Card title="远程 Mac" icon="terminal" href="#over-ssh-连接远程-mac">
    当网关不在 Messages 所在的 Mac 上运行时，请使用 SSH 包装器。
  </Card>
  <Card title="配置参考" icon="settings" href="/gateway/config-channels#imessage">
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
brew update && brew upgrade imsg
imsg rpc --help
imsg launch
openclaw channels status --probe
```

        当本地设置向导检测到缺失的默认 `imsg` 命令时，它可以提示通过 Homebrew 安装 `steipete/tap/imsg`。如果检测到由 Homebrew 管理的 `imsg`，它可以提示重新安装或更新它。自定义的 `cliPath` 包装器不会被修改。

      </Step>

      <Step title="配置 OpenClaw">

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

      <Step title="启动 gateway">

```bash
openclaw gateway
```

      </Step>

      <Step title="批准首次私信配对（默认 dmPolicy）">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        配对请求在 1 小时后过期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="通过 SSH 连接远程 Mac">
    大多数设置不需要 SSH。仅当 Gateway 无法在已登录 Messages 的 Mac 上运行时，才使用此拓扑。将 `cliPath` 指向 **Gateway 主机**上的一个兼容 stdio 的包装器，该包装器通过 SSH 连接到 Messages Mac 并运行 `imsg`。使用包装器的绝对路径，这样服务启动就不依赖 shell 的主目录展开。
    在远程 Mac 上安装和更新 `imsg`，而不是在 Gateway 主机上：

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
      remoteHost: "user@messages-mac", // 运行 Messages.app 和 imsg 的 Mac
      // 此路径在 Messages Mac 上解析，而不是在 Gateway 主机上解析。
      dbPath: "/Users/user/Library/Messages/chat.db",
      includeAttachments: true,
      // 可选：额外允许的附件根目录（与默认的
      // /Users/*/Library/Messages/Attachments 合并）。
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    `remoteHost` 用于标识 Messages Mac。OpenClaw 使用它获取入站附件，并暂存出站附件。对于出站文件，OpenClaw 会在该 Mac 上创建一个仅所有者可访问的临时路径，通过现有的严格 SSH/SCP 传输将文件复制过去，仅将远程路径传递给 `imsg`，并尝试在成功、失败或超时后删除该路径。清理操作的 SSH 调用失败时会发出警告，并可能在远程 Mac 上留下仅所有者可访问的临时目录。

    建议显式设置 `remoteHost`，设置后它具有优先权。为兼容现有配置，OpenClaw 会在每个进程中自动检测一次透明的 `exec ssh ... imsg "$@"` 包装器形式，并在监控、探测、发送和私有操作之间复用该主机。自动检测仅涵盖文档中简单的透明包装器；使用 ProxyJump/ProxyCommand 等包含丰富选项的包装器时，必须配置 `remoteHost`。
    `remoteHost` 必须是 `host` 或 `user@host`（不含空格或 SSH 选项）；不安全的值会被忽略。
    OpenClaw 对 SSH/SCP 使用严格的主机密钥检查，因此 Messages Mac 的主机密钥必须已存在于 Gateway 主机上的 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行验证。

<Warning>
任何放在 `imsg` 前面的 `cliPath` 包装器或 SSH 代理都必须在长生命周期 JSON-RPC 场景下表现得像透明的 stdio 管道。OpenClaw 会在通道的整个生命周期内，通过包装器的 stdin/stdout 交换以换行分帧的小型 JSON-RPC 消息：

- 一旦字节可用就立即转发每个 stdin 块/行——不要等到 EOF。
- 及时将每个 stdout 块/行按相反方向转发。
- 保留换行符。
- 避免固定大小的阻塞读取（`read(4096)`、`cat | buffer`、默认 shell `read`），它们可能会饿死小帧。
- 保持 stderr 与 JSON-RPC stdout 流分离。

一个会把 stdin 缓冲到大块填满才输出的包装器，会产生看起来像 iMessage 故障的症状——`imsg rpc timeout (chats.list)` 或通道反复重启——尽管 `imsg rpc` 本身是健康的。`ssh -T host imsg "$@"`（上方）是安全的，因为它会转发 OpenClaw 的 `cliPath` 参数，例如 `rpc` 和 `--db`。像 `ssh host imsg | grep -v '^DEBUG'` 这样的管道则不行——行缓冲工具仍可能扣住帧；如果必须过滤，请在每一环节上使用 `stdbuf -oL -eL`。
</Warning>

  </Tab>
</Tabs>

## 要求与权限（macOS）

- Messages 必须在运行 `imsg` 的 Mac 上登录。
- 运行 OpenClaw/`imsg` 的进程上下文需要“完全磁盘访问权限”（用于访问 Messages 数据库）。
- 通过 Messages.app 发送消息需要“自动化”权限。
- 对于高级操作（回应 / 编辑 / 撤回 / 线程回复 / 特效 / 投票 / 群组操作），必须禁用系统完整性保护（System Integrity Protection）——请参见 [启用 imsg 私有 API](#enabling-the-imsg-private-api)。基础文本和媒体的收发不需要它。

<提示>
权限是按进程上下文授予的。如果网关以无头方式运行（LaunchAgent/SSH），请在同一上下文中运行一次交互式命令以触发权限提示：

```bash
imsg chats --limit 1
# 或
imsg send <handle> "test"
```

</提示>

<折叠面板 title="SSH 包装器发送失败并出现 AppleEvents -1743">
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

</折叠面板>

## 启用 imsg 私有 API

`imsg` 有两种运行模式。对于 OpenClaw，推荐使用私有 API 模式，因为它能为该通道提供用户期望的原生 iMessage 操作。基础模式仍然适用于低风险安装、初始验证，或无法禁用 SIP 的主机。

- **基本模式**（默认，无需更改 SIP）：通过 `send` 发送文本和媒体、入站监控/历史记录、聊天列表。这就是你在全新安装 `brew install steipete/tap/imsg` 再加上上面的标准 macOS 权限后开箱即用所获得的能力。
- **私有 API 模式**：`imsg` 会向 `Messages.app` 注入一个 helper dylib，以调用内部 `IMCore` 函数。这将解锁 `react`、`edit`、`unsend`、`reply`（线程式）、`sendWithEffect`、`poll` 和 `poll-vote`（原生 Messages 投票）、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及输入指示和已读回执。

本页推荐的操作面需要私有 API 模式。`imsg` README 对此要求写得很明确：

> 诸如 `read`、`typing`、`launch`、基于桥接的富发送、消息变更和聊天管理等高级功能都是可选的。它们需要禁用 SIP，并将一个 helper dylib 注入到 `Messages.app` 中。启用 SIP 时，`imsg launch` 会拒绝注入。

这种 helper 注入技术使用的是 `imsg` 自己的 dylib 来访问 Messages 的私有 API。在 OpenClaw 的 iMessage 路径中，没有第三方服务器或 BlueBubbles 运行时。

<Warning>
**禁用 SIP 是真实的安全权衡。** SIP 是 macOS 防止运行被修改系统代码的核心保护之一；在系统范围内关闭它会带来额外的攻击面和副作用。尤其是，**在 Apple Silicon Mac 上禁用 SIP 也会禁用在你的 Mac 上安装和运行 iOS App 的能力**。

将其视为一项经过深思熟虑的运维选择，尤其是在主要个人 Mac 上。对于生产级的 OpenClaw iMessage，建议使用专用 Mac，或使用一个专用的 bot macOS 用户，以便在你认为合适的情况下启用桥接。如果你的威胁模型无法容忍任何设备关闭 SIP，那么 iMessage 插件将仅限于基本模式——只能收发文本和媒体，不支持反应、编辑、撤回、效果或群组操作。
</Warning>

### 设置

1. **在运行 Messages.app 的 Mac 上安装（或升级）`imsg`**：

   ```bash
   brew install steipete/tap/imsg
   brew update && brew upgrade imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 的输出会报告 `bridge_version`、`rpc_methods` 以及每个方法的 `selectors`，这样你就能在开始之前看到当前构建支持哪些能力。

2. **禁用系统完整性保护，并且（在现代 macOS 上）禁用 Library Validation。** 将非 Apple 的 helper dylib 注入到 Apple 签名的 `Messages.app` 需要关闭 SIP **并且**放宽 library validation。Recovery 模式下的 SIP 步骤取决于 macOS 版本：
   - **macOS 10.13-10.15（Sierra-Catalina）：** 通过 Terminal 禁用 Library Validation，重启进入恢复模式，运行 `csrutil disable`，然后重启。
   - **macOS 11+（Big Sur 及更高版本），Intel：** 进入恢复模式（或 Internet Recovery），运行 `csrutil disable`，然后重启。
   - **macOS 11+，Apple Silicon：** 使用电源键启动流程进入恢复模式；在较新的 macOS 版本上，点击 Continue 时按住 **Left Shift** 键，然后运行 `csrutil disable`。虚拟机环境遵循单独流程，因此请先拍摄 VM 快照。

   **在 macOS 11 及更高版本上，单独执行 `csrutil disable` 通常还不够。** Apple 仍然会将 `Messages.app` 作为平台二进制文件执行 library validation，因此即使关闭 SIP，adhoc 签名的 helper 也会被拒绝（`Library Validation failed: ... platform binary, but mapped file is not`）。在禁用 SIP 之后，还要禁用 library validation 并重启：

   ```bash
   sudo defaults write /Library/Preferences/com.apple.security.libraryvalidation.plist DisableLibraryValidation -bool true
   ```

   **macOS 26 (Tahoe)，已在 26.5.1 上验证：** 关闭 SIP **再加上**上面的 `DisableLibraryValidation` 命令，就足以在 26.0 到 26.5.x 之间注入 helper。**不需要 boot-args。** 该 plist 是决定性因素，也是 Tahoe 上注入失败时最常遗漏的一步：
   - **有 plist：** `imsg launch` 会完成注入，并且 `imsg status` 会报告 `advanced_features: true`。
   - **没有 plist（即使 SIP 已关闭）：** `imsg launch` 会失败，并报出 `Failed to launch: Timeout waiting for Messages.app to initialize`。AMFI 在加载时拒绝了 adhoc helper，因此 bridge 永远无法就绪，启动最终超时。这个超时是大多数人在 Tahoe 上遇到的症状；修复方法就是上面的 plist，而不是采取更激进的手段。

   如果在 macOS 升级后，`imsg launch` 注入失败，或者某些特定 `selectors` 开始返回 false，通常就是这个门槛导致的。在假设 SIP 步骤本身失败之前，请先检查你的 SIP 和 library-validation 状态。如果这些设置都正确，但 bridge 仍然无法注入，请收集 `imsg status --json` 和 `imsg launch` 的输出并反馈给 `imsg` 项目，而不是进一步削弱系统级安全控制。

3. **注入 helper。** 在禁用 SIP 且已登录 Messages.app 的情况下：

   ```bash
   imsg launch
   ```

   当 SIP 仍然启用时，`imsg launch` 会拒绝注入，因此这也可作为第 2 步是否生效的确认。

4. **从 OpenClaw 验证桥接：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 条目应报告为 `works`，并且 `imsg status --json | jq '{rpc_methods, selectors}'` 应显示你的 macOS 构建所暴露的能力。创建投票需要 `selectors.pollPayloadMessage`；投票需要 `selectors.pollVoteMessage` 和 `poll.vote` RPC method。OpenClaw 插件只会公开缓存探测所支持的操作，而空缓存则保持乐观，并在首次分发时进行探测。

如果 `openclaw channels status --probe` 将该通道报告为 `works`，但在分发时某些特定操作抛出 “iMessage `<action>` requires the imsg private API bridge”，请再次运行 `imsg launch`——helper 可能会脱落（Messages.app 重启、系统更新等），而缓存的 `available: true` 状态会继续宣告这些操作，直到下一次探测刷新它为止。

### 当 SIP 保持启用时

如果根据你的威胁模型不能关闭 SIP：

- `imsg` 会回退到基本模式——仅支持文本 + 媒体 + 接收。
- OpenClaw 插件仍会展示文本/媒体发送和入站监控；它会根据按方法能力门控隐藏 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群组操作。
- 你可以使用一台独立的非 Apple Silicon Mac（或专用 bot Mac）在关闭 SIP 的情况下承担 iMessage 工作负载，同时在主设备上保持 SIP 启用。请参见下面的 [专用 bot macOS 用户（独立 iMessage 身份）](#deployment-patterns)。

## 访问控制和路由

<Tabs>
  <Tab title="DM 策略">
    `channels.imessage.dmPolicy` 控制私信：

    - `pairing` (默认)
    - `allowlist`（至少需要一个 `allowFrom` 条目）
    - `open`（要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目必须标识发送者：handle 或静态发送者访问组（`accessGroup:<name>`）。针对诸如 `chat_id:*`、`chat_guid:*` 或 `chat_identifier:*` 之类的聊天目标，请使用 `channels.imessage.groupAllowFrom`；针对数字 `chat_id` 注册表键，请使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="群组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist` (默认)
    - `open`
    - `disabled`

    群组发送者允许列表：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 条目也可以引用静态发送者访问组（`accessGroup:<name>`）。

    运行时回退：如果未设置 `groupAllowFrom`，iMessage 群组发送者检查会使用 `allowFrom`；当 DM 和群组准入需要不同设置时，请设置 `groupAllowFrom`。显式空的 `groupAllowFrom: []` 不会回退——它会在 `allowlist` 下阻止所有群组发送者。
    运行时说明：如果 `channels.imessage` 完全缺失，运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    <Warning>
    `groupPolicy: "allowlist"` 下的群组路由会连续运行 **两个** 门控：

    1. **发送者允许列表**（`channels.imessage.groupAllowFrom`）——handle、`accessGroup:<name>`、`chat_guid`、`chat_identifier` 或 `chat_id`。空的有效列表（既没有 `groupAllowFrom` 也没有 `allowFrom` 回退）会阻止每个群组发送者。
    2. **群组注册表**（`channels.imessage.groups`）——当映射中有条目时才强制执行：聊天必须匹配明确的按 `chat_id` 配置项，或匹配 `groups: { "*": { ... } }` 通配项。当 `groups` 为空或缺失时，仅由发送者允许列表决定是否准入。

    如果未配置有效的群组发送者允许列表，则每条群组消息都会在注册表门控之前被丢弃。每个门控在默认日志级别下都有各自的 `warn` 级信号，并且各自对应不同的修复方式：

    - 启动时每个账户只记录一次：当有效的群组发送者允许列表为空时，`imessage: groupPolicy="allowlist" for account "<id>" but no group sender allowlist is configured ...` —— 通过设置 `channels.imessage.groupAllowFrom`（或 `allowFrom`）来修复；仅添加 `groups` 条目会让门控 1 继续阻止所有发送者。
    - 运行时每个 `chat_id` 只记录一次：当发送者通过了门控 1，但该聊天在已填充的 `groups` 注册表中缺失时，`imessage: dropping group message from chat_id=<id> ...` —— 通过在 `channels.imessage.groups` 下添加该 `chat_id`（或 `"*"`）来修复。

    私信不受影响——它们走的是不同的代码路径。

    在 `groupPolicy: "allowlist"` 下推荐的群组流配置：

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: { "*": { "requireMention": true } },
        },
      },
    }
    ```

    仅 `groupAllowFrom` 就能允许这些发送者进入任何群组；再添加 `groups` 块即可限定允许哪些聊天（并设置诸如 `requireMention` 之类的每聊天选项）。
    </Warning>

    群组提及门控：

    - iMessage 没有原生提及元数据
    - 提及检测使用正则表达式模式（`agents.entries.*.groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 如果未配置模式，则无法强制执行提及门控
    - 来自授权发送者的控制命令会绕过提及门控

    每组 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串，该字符串会在每一轮处理该群组消息时注入到代理的系统提示词中。解析方式与 `channels.whatsapp.groups` 一致：

    1. **组特定系统提示词**（`groups["<chat_id>"].systemPrompt`）：当映射中存在该特定组条目并且其 `systemPrompt` 键已定义时使用。如果 `systemPrompt` 为空字符串（`""`），则会抑制通配符，并且不会将系统提示词应用于该组。
    2. **组通配系统提示词**（`groups["*"].systemPrompt`）：当特定组条目在映射中完全不存在，或者它存在但未定义 `systemPrompt` 键时使用。

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: {
            "*": { "systemPrompt": "请使用英式拼写。" },
            "8421": {
              requireMention: true,
              systemPrompt: "这是值班轮班聊天。回复请控制在 3 句以内。",
            },
            "9907": {
              // 显式抑制：通配符 "请使用英式拼写。" 不适用于此处
              systemPrompt: "",
            },
          },
        },
      },
    }
    ```

    每组提示词仅适用于群组消息——私信不受影响。

  </Tab>

  <Tab title="会话和确定性回复">
    - 私信使用直接路由；群组使用群组路由。
    - 在默认 `session.dmScope=main` 下，iMessage 私信会合并到代理主会话中。
    - 群组会话相互隔离（`agent:<agentId>:imessage:group:<chat_id>`）。
    - 回复会使用来源频道/目标元数据路由回 iMessage。

    类群组线程行为：

    某些多参与者 iMessage 线程可能会带着 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups` 中被显式配置，OpenClaw 会将其视为群组流量（群组门控 + 群组会话隔离）。

  </Tab>
</Tabs>

## ACP 会话绑定

iMessage 聊天可以绑定到 ACP 会话。

快速操作流程：

- 在该私信或允许的群聊中运行 `/acp spawn codex --bind here`。
- 之后同一 iMessage 会话中的消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会就地重置同一个已绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

已配置的持久绑定使用顶层 `bindings[]` 条目，其中 `type: "acp"` 且 `match.channel: "imessage"`。

`match.peer.id` 可以使用：

- 规范化的私信 handle，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`（推荐用于稳定的群组绑定）
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "imessage",
        accountId: "default",
        peer: { kind: "group", id: "chat_id:123" },
      },
      acp: { label: "codex-group" },
    },
  ],
}
```

有关共享 ACP 绑定行为，请参见 [ACP 代理](/tools/acp-agents)。

## 部署模式

<AccordionGroup>
  <Accordion title="专用 bot macOS 用户（独立 iMessage 身份）">
    使用专用 Apple ID 和 macOS 用户，这样 bot 流量就会与个人 Messages 配置文件隔离开来。

    典型流程：

    1. 创建/登录一个专用的 macOS 用户。
    2. 在该用户中使用 bot Apple ID 登录 Messages。
    3. 在该用户中安装 `imsg`。
    4. 创建一个 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行时，可能需要在该 bot 用户会话中进行 GUI 授权（Automation + Full Disk Access）。

  </Accordion>

  <Accordion title="通过 Tailscale 连接远程 Mac（示例）">
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

    使用 SSH 密钥，以确保 SSH 和 SCP 均可非交互式运行。
    先确保主机密钥已受信任（例如执行 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填充 `known_hosts`。

  </Accordion>

  <Accordion title="多账号模式">
    iMessage 支持在 `channels.imessage.accounts` 下为每个账号进行配置。

    每个账号都可以覆盖诸如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史设置以及附件根目录允许列表等字段。

  </Accordion>

  <Accordion title="直接消息历史">
    将 `channels.imessage.dmHistoryLimit` 设为一个值，可使用该会话最近解码过的 `imsg` 历史为新的直接消息会话播种。使用 `channels.imessage.dms["<sender>"].historyLimit` 可按发送者覆盖，包括设置为 `0` 以禁用该发送者的历史。

    iMessage DM 历史会按需从 `imsg` 获取。保持未设置 `dmHistoryLimit` 会禁用全局 DM 历史播种，但为某个发送者设置正值的 `channels.imessage.dms["<sender>"].historyLimit` 仍会为该发送者启用播种。

  </Accordion>
</AccordionGroup>

## 媒体、分块和投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 入站附件接收**默认关闭** — 设置 `channels.imessage.includeAttachments: true` 可将照片、语音备忘录、视频和其他附件转发给代理。禁用后，仅包含附件的 iMessage 会在到达代理之前被丢弃，甚至可能完全不会产生 `Inbound message` 日志行。
    - 设置 `remoteHost` 后，可通过 SCP 获取远程入站附件路径
    - 出站文件会暂存到已配置或自动检测到的 Messages Mac 上一个仅所有者可访问的临时路径中，通过该远程路径传递给 `imsg`，并在成功、失败或超时后尽力清理；清理失败会发出警告，并可能留下仅所有者可访问的残留文件
    - 附件路径必须匹配允许的根路径：
      - `channels.imessage.attachmentRoots`（本地）
      - `channels.imessage.remoteAttachmentRoots`（远程 SCP 模式）
      - 已配置的根路径会扩展默认根路径模式 `/Users/*/Library/Messages/Attachments`（合并而非替换）
    - SCP 使用严格的主机密钥检查（`StrictHostKeyChecking=yes`）
    - 出站媒体大小使用 `channels.imessage.mediaMaxMb`（默认 16 MB）

  </Accordion>

  <Accordion title="出站文本和分块">
    - 文本分块限制：`channels.imessage.textChunkLimit`（默认 4000）
    - 分块模式：`channels.imessage.streaming.chunkMode`
      - `length`（默认）
      - `newline`（优先按段落拆分）
    - 出站 markdown 的粗体/斜体/下划线/删除线会转换为原生样式文本（macOS 15+ 接收者可渲染这些样式；较旧的接收者会看到不带标记的纯文本）；markdown 表格会根据通道的 markdown 表格模式进行转换
    - `channels.imessage.sendTransport`（默认 `auto`，可选 `bridge`、`applescript`）用于选择 `imsg` 的发送投递方式

  </Accordion>

  <Accordion title="寻址格式">
    推荐的显式目标：

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

## 私有 API 动作

当 `imsg launch` 正在运行，并且 `openclaw channels status --probe` 报告 `privateApi.available: true` 时，消息工具除了正常文本发送之外，还可以使用 iMessage 原生动作。

所有动作默认启用；使用 `channels.imessage.actions` 可以关闭单个动作：

```json5
{
  channels: {
    imessage: {
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
        renameGroup: true,
        setGroupIcon: true,
        addParticipant: true,
        removeParticipant: true,
        leaveGroup: true,
        polls: true,
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可用动作">
    - **react**：添加或移除 iMessage 点按回应（`messageId`、`emoji`、`remove`）。支持的点按回应分别对应喜爱、赞、不喜欢、大笑、强调和疑问。移除时不提供 emoji 会清除已设置的点按回应。
    - **reply**：向现有消息发送线程回复（`messageId`、`text` 或 `message`，以及 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。本地的带附件回复还需要 `imsg` 构建版本的 `send-rich` 支持 `--file`。使用远程 `imsg` v0.13.4 时，附件回复使用 JSON-RPC，并支持整条消息或第 `0` 部分；RPC 方法不支持非零附件部分索引。
    - **sendWithEffect**：发送带有 iMessage 效果的文本（`text` 或 `message`、`effect` 或 `effectId`）。短名称：slam、loud、gentle、invisibleink、confetti、lasers、fireworks、balloon、heart、echo、happybirthday、shootingstar、sparkles、spotlight。
    - **edit**：在受支持的 macOS / 私有 API 版本上编辑已发送的消息（`messageId`、`text` 或 `newText`）。只能编辑由网关自身发送的消息。
    - **unsend**：在受支持的 macOS / 私有 API 版本上撤回已发送的消息（`messageId`）。只能撤回由网关自身发送的消息。
    - **upload-file**：发送媒体/文件（`buffer` 以 base64 表示，或使用已解析的 `media`/`path`/`filePath`、`filename`，以及可选的 `asVoice`）。旧版别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：当当前目标是群组会话时管理群聊。这些动作会修改主机的 Messages 身份，因此要求发送者为所有者，或 Gateway 客户端具有 `operator.admin` 权限。
    - **poll**：创建原生 Apple Messages 投票（`pollQuestion`、重复 2 至 12 次的 `pollOption`，以及 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。使用 iOS/iPadOS/macOS 26 及更高版本的收件人可以原生查看并投票；较旧的操作系统版本会收到“已发送投票”文本回退。需要 `selectors.pollPayloadMessage`。
    - **poll-vote**：对现有投票进行投票（`pollId` 或 `messageId`，以及 `pollOptionIndex`、`pollOptionId` 或 `pollOptionText` 三者之一且只能选择一个）。需要 `selectors.pollVoteMessage` 和 `poll.vote` RPC 方法。远程 `imsg` v0.13.4 RPC 仅接受选项 ID，因此远程设置必须使用 `pollOptionId`；索引和文本选择器仍可用于本地设置。

    已接受的入站投票会以问题、选项标签、投票数以及 `poll-vote` 所需的投票消息 ID 呈现给代理。远程账号还会包含每个稳定的选项 ID，并指示代理使用 `pollOptionId`。

  </Accordion>

  <Accordion title="消息 ID">
    入站 iMessage 上下文在可用时同时包含简短的 `MessageSid` 值和完整消息 GUID（`MessageSidFull`）。简短 ID 仅适用于最近的基于 SQLite 的回复缓存，并会在使用前与当前聊天进行检查。如果简短 ID 过期，请在定位到提供该 ID 的对话后改用其 `MessageSidFull` 重试。完整 ID 不能绕过对话或账号绑定，因此如果 ID 来自其他聊天，请用当前目标聊天中的 ID 替换它。当当前对话证据不可用时，远程委派调用可能会拒绝过期的完整 ID。

  </Accordion>

  <Accordion title="能力检测">
    只有当缓存的探测状态显示桥接不可用时，OpenClaw 才会隐藏私有 API 动作。如果状态未知，动作仍会显示，并且探测会延迟触发，因此在 `imsg launch` 之后，首个动作无需单独手动刷新状态也可能成功。

  </Accordion>

  <Accordion title="已读回执和正在输入">
    当私有 API 桥接可用时，已接受的入站聊天会被标记为已读，而直接聊天会在回合被接受时立刻显示正在输入气泡，同时代理准备上下文并生成回复。可通过以下方式禁用已读标记：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于按方法能力列表门控的旧版 `imsg` 构建会静默关闭 typing/read；OpenClaw 会在每次重启后记录一次警告，以便将缺失的回执归因。

  </Accordion>

  <Accordion title="入站点按回应">
    OpenClaw 会订阅 iMessage 点按回应，并将收到的反应作为系统事件路由，而不是普通消息文本，因此用户的点按回应不会触发普通回复循环。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"`（默认）：仅在用户对机器人生成的消息作出反应时通知。
    - `"all"`：对所有来自授权发送者的入站点按回应通知。
    - `"off"`：忽略入站点按回应。

    按账号覆盖使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>

  <Accordion title="批准投票和反应">
    当 `approvals.exec.enabled` 或 `approvals.plugin.enabled` 为 true 且请求原生路由到 iMessage 时，网关会提供带原生控件的批准提示：

    - 在经过探测、且支持投票和隐藏说明的私有 API 桥接上，提示会包含一个 Messages 投票，每个允许的决策各占一项。缺少 `poll send --no-comment` 的旧版 `imsg` 仍会使用文本控件。
    - 如果通过 `channels.imessage.actions.polls: false` 禁用了投票、桥接不支持投票、发送投票失败，或者可用决策少于两个，则提示会保留文本和点按回应控件。
    - 文本回退会将 `👍`（赞）映射为 `allow-once`，将 `👎`（不喜欢）映射为 `deny`。它还包含 `/approve <id> <decision>` 命令，在请求允许时也包括 `allow-always`。

    投票和反应要求执行操作的用户句柄必须是显式批准者。批准者列表从 `channels.imessage.allowFrom`（或 `channels.imessage.accounts.<id>.allowFrom`）读取；请添加用户的 E.164 格式电话号码或其 Apple ID 邮箱（如 `chat_id:*` 这类聊天目标不是有效的批准者条目）。通配符条目 `"*"` 会被接受，但会允许任何发送者批准；空的批准者列表会完全禁用投票和反应快捷方式。这些快捷方式会有意绕过 `reactionNotifications`、`dmPolicy` 和 `groupAllowFrom`，因为显式批准者白名单才是批准解析时真正重要的唯一门槛。

    目前，原生投票控件仅限于来源 iMessage 会话中的通道原生投递，或 iMessage 批准者 DM。由 `approvals.exec.mode: "targets"` 选定的显式转发目标（以及 `"both"` 的目标部分）仍然会使用现有的转发批准消息，而不是 iMessage 投票。

    `/approve` 文本命令的授权遵循相同列表：当 `channels.imessage.allowFrom` 非空时，`/approve <id> <decision>` 会依据该批准者列表进行授权（而不是更宽泛的 DM 白名单），而只在 DM 白名单中获准、但不在 `allowFrom` 中的发送者会收到明确拒绝。当 `allowFrom` 为空时，仍保持同聊天回退机制，`/approve` 会授权 DM 白名单允许的任何人。请把所有应当批准的操作员——无论是通过 `/approve` 还是通过反应——都加入 `allowFrom`。

    操作员注意：
    - 投票和反应绑定同时存储在内存中和网关的持久键值存储中（TTL 与批准到期时间一致），网关还会轮询待处理提示以查找点按回应。网关重启后，对旧控件的点击会被识别并吞掉，而不会进入代理聊天，但重启会终止进行中的命令；应请求新的批准，而不要指望旧控件恢复它。
    - 当该句柄是显式批准者时，操作员自己的 `is_from_me=true` 点按回应（例如来自配对的 Apple 设备）会解析批准。
    - 只有在配置了显式批准者时，批准提示才会路由到群组对话；否则群组中的任何成员都可能批准。
    - 旧式文本样式点按回应（来自非常旧 Apple 客户端的纯文本 `Liked "…"`）无法解析批准，因为它们不携带消息 GUID；反应解析需要当前 macOS / iOS 客户端发出的结构化点按回应元数据。

  </Accordion>

  <Accordion title="问题反应（1️⃣ / 2️⃣ / 3️⃣ / 4️⃣）">
    对于一个包含一个非秘密、单选问题以及一到四个选项的 `ask_user` 提示，OpenClaw 会添加带编号的 emoji 选项。对送达的提示使用匹配的数字作出反应即可回答。该反应必须携带机器人所发消息的稳定 GUID；随后 OpenClaw 会通过网关将该数字映射为规范选项。过期或重复的点击会被忽略。

    多问题、多选和自由文本提示仍然只支持文本回复。问题反应遵循正常的 iMessage DM/群组准入规则。即使通用的 `reactionNotifications` 为 `"off"`，它们仍会被识别，但不会把无关反应变成代理事件。

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许由频道发起的配置写入（用于 `/config set|unset`，当 `commands.config: true` 时）。

禁用：

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合并拆分发送的 DM（命令 + URL 在同一条输入中）

Apple 可以将一个命令及其 URL 预览存储为两条独立的物理 `chat.db` 记录。`imsg` 0.13.1 及更新版本会在 watch、history 或 search 返回消息之前将这些记录合并，因此 OpenClaw 会收到一条逻辑上的入站消息，而不会增加特定于频道的 DM 延迟。

不需要 iMessage 合并设置。已废弃的 `channels.imessage.coalesceSameSenderDms` 键会被 `openclaw doctor --fix` 删除。当你有意想跨频道批量处理快速文本消息时，仍可使用通用的 `messages.inbound` 去抖动（debounce）设置。

如果命令加 URL 的发送以分开的 agent turn 到达，请在 Messages Mac 上更新 `imsg`：

```bash
brew update && brew upgrade imsg
```

## 桥接器或网关重启后的入站恢复

iMessage 会恢复网关宕机期间遗漏的消息，同时抑制 Apple 在 Push 恢复后可能冲刷出来的过时“积压弹”。默认行为始终开启，基于持久化入站记录和年龄防线实现。

- **持久化重放保护。** 在推进恢复游标之前，OpenClaw 会将共享 SQLite 入站队列中的每一条原始行以其 Apple GUID 作为事件 ID 写入日志。完成的行会保留一份约 4 小时的墓碑记录，最多 10,000 条，因此即使重启后，具有相同 GUID 的重放也会被丢弃。待处理的行会一直可恢复，直到调度器接管它为止。
- **宕机恢复。** 启动时，监视器会记住最后一个持久化接纳的 `chat.db` 行号（按账号持久化的游标），并将其作为 `since_rowid` 传递给 `imsg watch.subscribe`，因此 imsg 会重放那些尚未写入日志的行，然后继续跟踪实时新增内容。崩溃前已写入日志的行会从 SQLite 中恢复。重放范围限制为最近 500 行，并且仅限于约 2 小时以内的消息，GUID 墓碑会丢弃任何已经处理过的内容。
- **过时积压年龄防线。** 启动边界之上的行是真正的实时消息；其中发送时间比到达时间早超过约 15 分钟的，属于 Push 冲刷形成的积压，会被抑制。被重放的行（位于边界处或边界之下）则使用更宽的恢复窗口，因此最近遗漏的消息会被投递，而更久远的历史不会。

恢复机制同时适用于本地和远程 `cliPath`，因为 `since_rowid` 重放通过同一个 `imsg` RPC 连接运行。区别在于窗口：当网关能够读取 `chat.db`（本地）时，它会锚定启动时的行号边界，限制重放跨度，并投递最多几小时前遗漏的消息；通过远程 SSH `cliPath` 时则无法读取数据库，因此重放不设上限，所有行都使用实时年龄防线——它仍会恢复最近遗漏的消息，也仍会抑制旧积压，只是使用更窄的实时窗口。要获得更宽的恢复窗口，请在 Messages 所在的 Mac 上运行网关。

### 运维可见信号

被抑制的积压会按默认级别记录日志，不会静默丢弃（`recovery` 标志会显示当前使用了哪个窗口）：

```text
imessage: suppressed stale inbound backlog account=<id> sent=<iso> recovery=<bool> (<N> suppressed since start)
```

### 迁移

`channels.imessage.catchup.*` 已弃用——停机恢复是自动的，新配置无需任何设置。现有配置中 `catchup.enabled: true` 仍会作为兼容性配置保留，用于恢复重放窗口。已禁用的 catchup 块（`enabled: false` 或未设置 `enabled: true`）已退役；`openclaw doctor --fix` 会将其移除。

## 故障排查

<AccordionGroup>
  <Accordion title="未找到 imsg 或不支持 RPC">
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探测报告不支持 RPC，请更新 `imsg`。如果私有 API 操作不可用，请在已登录的 macOS 用户会话中运行 `imsg launch`，然后再次进行探测。如果 Gateway 没有在 macOS 上运行，请改用上面的通过 SSH 远程连接 Mac 的方案，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion title="Messages 发送了消息，但入站 iMessage 没有到达">
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

  <Accordion title="网关没有在 macOS 上运行">
    默认的 `cliPath: "imsg"` 必须运行在登录 Messages 的 Mac 上。在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 设置为一个包装脚本，让它通过 SSH 连接到那台 Mac 并运行 `imsg "$@"`。

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    然后运行：

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion title="DM 被忽略">
    检查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配对批准（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion title="群消息被忽略">
    检查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 白名单行为
    - 提及模式配置（`agents.entries.*.groupChat.mentionPatterns`）

  </Accordion>

  <Accordion title="远程附件失败">
    检查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 网关主机上的 SSH/SCP 密钥认证
    - 网关主机的 `~/.ssh/known_hosts` 中是否存在主机密钥
    - 运行 Messages 的 Mac 上远程路径是否可读

  </Accordion>

  <Accordion title="macOS 权限提示被错过">
    在相同用户/会话上下文中的交互式 GUI 终端里重新运行并批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    确认运行 OpenClaw/`imsg` 的进程上下文已授予完全磁盘访问和自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指针

- [iMessage 配置参考](/gateway/config-channels#imessage)
- [网关配置](/gateway/configuration)
- [配对](/channels/pairing)

## 相关内容

- [通道概览](/channels) — 所有受支持的通道
- [BlueBubbles 移除与 imsg iMessage 路径](/announcements/bluebubbles-imessage) — 公告与迁移摘要
- [从 BlueBubbles 迁移过来](/channels/imessage-from-bluebubbles) — 配置转换表与逐步切换
- [配对](/channels/pairing) — DM 认证与配对流程
- [群组](/channels/groups) — 群聊行为与提及门控
- [通道路由](/channels/channel-routing) — 消息会话路由
- [安全性](/gateway/security) — 访问模型与加固
