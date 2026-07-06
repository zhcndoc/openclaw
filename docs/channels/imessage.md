---
summary: "通过 imsg 提供原生 iMessage 支持（通过 stdio 传输的 JSON-RPC），并提供用于回复、tapback、效果、投票、附件和群组管理的私有 API 操作。对于符合主机要求的新 OpenClaw iMessage 设置，优先使用此方式。"
read_when:
  - 设置 iMessage 支持
  - 调试 iMessage 发送/接收
title: "iMessage"
---

<Note>
对于 OpenClaw iMessage 部署，请在已登录的 macOS Messages 主机上使用 `imsg`。如果你的 Gateway 运行在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 指向一个通过 SSH 在 Mac 上运行 `imsg` 的包装器。

**入站恢复是自动的。** 在桥接或网关重启后，iMessage 会重放停机期间遗漏的消息，并抑制 Apple 在 Push 恢复后可能刷出的过时“积压炸弹”，通过去重确保不会重复分发任何内容。无需启用任何配置——请参见[桥接或网关重启后的入站恢复](#inbound-recovery-after-a-bridge-or-gateway-restart)。
</Note>

<Warning>
BlueBubbles 支持已被移除。请将 `channels.bluebubbles` 配置迁移到 `channels.imessage`；OpenClaw 仅通过 `imsg` 支持 iMessage。从 [BlueBubbles 移除与 imsg iMessage 路径](/announcements/bluebubbles-imessage) 查看简短公告，或从 [来自 BlueBubbles](/channels/imessage-from-bluebubbles) 查看完整迁移表。
</Warning>

状态：原生外部 CLI 集成。Gateway 会启动 `imsg rpc` 并通过 stdio 进行 JSON-RPC 通信——无需单独的守护进程或端口。高级操作需要 `imsg launch` 以及成功的私有 API 探测。

<CardGroup cols={3}>
  <Card title="Private API actions" icon="wand-sparkles" href="#private-api-actions">
    回复、tapback、效果、投票、附件和群组管理。
  </Card>
  <Card title="配对" icon="link" href="/channels/pairing">
    iMessage 私信默认使用配对模式。
  </Card>
  <Card title="远程 Mac" icon="terminal" href="#over-ssh-连接远程-mac">
    当 Gateway 不在 Messages 所在的 Mac 上运行时，请使用 SSH 包装器。
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
imsg rpc --help
imsg launch
openclaw channels status --probe
```

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
    OpenClaw 只需要一个兼容 stdio 的 `cliPath`，因此你可以把 `cliPath` 指向一个包装脚本，由该脚本通过 SSH 连接到远程 Mac 并运行 `imsg`。

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    启用附件时推荐的配置：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // 用于通过 SCP 拉取附件
      includeAttachments: true,
      // 可选：额外允许的附件根目录（与默认的
      // /Users/*/Library/Messages/Attachments 合并）。
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    如果未设置 `remoteHost`，OpenClaw 会尝试通过解析 SSH 包装脚本自动检测它。
    `remoteHost` 必须是 `host` 或 `user@host`（不能有空格或 SSH 选项）；不安全的值会被忽略。
    OpenClaw 对 SCP 使用严格的主机密钥检查，因此中继主机密钥必须已存在于 `~/.ssh/known_hosts` 中。
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

## Requirements and permissions (macOS)

- Messages must be signed in on the Mac running `imsg`.
- Full Disk Access is required for the process context running OpenClaw/`imsg` (Messages DB access).
- Automation permission is required to send messages through Messages.app.
- For advanced actions (react / edit / unsend / threaded reply / effects / polls / group ops), System Integrity Protection must be disabled — see [Enabling the imsg private API](#enabling-the-imsg-private-api). Basic text and media send/receive work without it.

<Tip>
Permissions are granted per process context. If the gateway runs headless (LaunchAgent/SSH), run a one-time interactive command in that same context to trigger prompts:

```bash
imsg chats --limit 1
# 或
imsg send <handle> "test"
```

</Tip>

<Accordion title="SSH wrapper sends fail with AppleEvents -1743">
  远程 SSH 设置可以读取聊天、通过 `channels status --probe`，并处理入站消息，但外发发送仍会因 AppleEvents 授权错误而失败：

```text
Not authorized to send Apple events to Messages. (-1743)
```

检查已登录 Mac 用户的 TCC 数据库或“系统设置” > “隐私与安全性” > “自动化”。如果自动化条目记录在 `/usr/libexec/sshd-keygen-wrapper` 而不是 `imsg` 或本地 shell 进程上，macOS 可能不会为该 SSH 服务端客户端暴露可用的 Messages 开关：

```text
kTCCServiceAppleEvents | /usr/libexec/sshd-keygen-wrapper | auth_value=0 | com.apple.MobileSMS
```

在这种状态下，重复执行 `tccutil reset AppleEvents` 或通过同一个 SSH 包装器重新运行 `imsg send` 可能仍然会失败，因为需要 Messages Automation 的进程上下文是 SSH 包装器，而不是 UI 可以授予权限的某个应用。

请改用受支持的 `imsg` 进程上下文之一：

- 在已登录的 Messages 用户本地会话中运行 Gateway，或至少运行 `imsg` bridge。
- 在授予同一会话中的完全磁盘访问权限和自动化权限后，使用该用户的 LaunchAgent 启动 Gateway。
- 如果你保留双用户 SSH 拓扑，请在启用通道之前，验证一次真实的外发 `imsg send` 是否能通过确切的包装器成功。如果无法授予 Automation，请改为单用户 `imsg` 设置，而不要依赖 SSH 包装器来发送消息。

</Accordion>

## 启用 imsg 私有 API

`imsg` 提供两种运行模式：

- **基本模式**（默认，无需更改 SIP）：通过 `send` 发送文本和媒体、入站监控/历史记录、聊天列表。这就是你在全新安装 `brew install steipete/tap/imsg` 再加上上面的标准 macOS 权限后开箱即用所获得的能力。
- **私有 API 模式**：`imsg` 会向 `Messages.app` 注入一个 helper dylib，以调用内部 `IMCore` 函数。这将解锁 `react`、`edit`、`unsend`、`reply`（线程式）、`sendWithEffect`、`poll` 和 `poll-vote`（原生 Messages 投票）、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及输入指示和已读回执。

本页的高级操作接口需要私有 API 模式。`imsg` README 也明确说明了这一要求：

> 诸如 `read`、`typing`、`launch`、基于桥接的富发送、消息变更和聊天管理等高级功能都是可选的。它们需要禁用 SIP，并将一个 helper dylib 注入到 `Messages.app` 中。启用 SIP 时，`imsg launch` 会拒绝注入。

这种 helper 注入技术使用的是 `imsg` 自己的 dylib 来访问 Messages 的私有 API。在 OpenClaw 的 iMessage 路径中，没有第三方服务器或 BlueBubbles 运行时。

<Warning>
**禁用 SIP 是真实的安全权衡。** SIP 是 macOS 防止运行被修改系统代码的核心保护之一；在系统范围内关闭它会带来额外的攻击面和副作用。尤其是，**在 Apple Silicon Mac 上禁用 SIP 也会禁用在你的 Mac 上安装和运行 iOS App 的能力**。

请把这视为一个有意的运维选择，而不是默认配置。如果你的威胁模型无法接受关闭 SIP，那么捆绑的 iMessage 只能停留在基本模式——仅支持文本和媒体的发送/接收，不支持反应、编辑、撤回、效果或群组操作。
</Warning>

### 设置

1. **在运行 Messages.app 的 Mac 上安装（或升级）`imsg`**：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 的输出会报告 `bridge_version`、`rpc_methods` 以及每个方法的 `selectors`，这样你就能在开始之前看到当前构建支持哪些能力。

2. **禁用系统完整性保护，并且（在现代 macOS 上）禁用 Library Validation。** 将非 Apple 的 helper dylib 注入到 Apple 签名的 `Messages.app` 需要关闭 SIP **并且**放宽 library validation。Recovery 模式下的 SIP 步骤取决于 macOS 版本：
   - **macOS 10.13-10.15（Sierra-Catalina）：** 通过 Terminal 禁用 Library Validation，重启进入 Recovery Mode，运行 `csrutil disable`，然后重启。
   - **macOS 11+（Big Sur 及更高版本），Intel：** 进入 Recovery Mode（或 Internet Recovery），运行 `csrutil disable`，然后重启。
   - **macOS 11+，Apple Silicon：** 使用电源键启动流程进入 Recovery；在较新的 macOS 版本上，点击 Continue 时按住 **Left Shift** 键，然后运行 `csrutil disable`。虚拟机环境遵循单独流程，因此请先拍摄 VM 快照。

   **在 macOS 11 及更高版本上，单独执行 `csrutil disable` 通常还不够。** Apple 仍然会将 `Messages.app` 作为平台二进制文件执行 library validation，因此即使关闭 SIP，adhoc 签名的 helper 也会被拒绝（`Library Validation failed: ... platform binary, but mapped file is not`）。在禁用 SIP 之后，还要禁用 library validation 并重启：

   ```bash
   sudo defaults write /Library/Preferences/com.apple.security.libraryvalidation.plist DisableLibraryValidation -bool true
   ```

   **macOS 26 (Tahoe), verified on 26.5.1:** 关闭 SIP **再加上**上面的 `DisableLibraryValidation` 命令，就足以在 26.0 到 26.5.x 之间注入 helper。**不需要 boot-args。** 该 plist 是决定性因素，也是 Tahoe 上注入失败时最常遗漏的一步：
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

    - `pairing` (default)
    - `allowlist` (requires at least one `allowFrom` entry)
    - `open` (requires `allowFrom` to include `"*"`)
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    Allowlist 条目必须标识发送者：handle 或静态发送者访问组（`accessGroup:<name>`）。针对诸如 `chat_id:*`、`chat_guid:*` 或 `chat_identifier:*` 之类的聊天目标，请使用 `channels.imessage.groupAllowFrom`；针对数字 `chat_id` 注册表键，请使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="群组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist` (default)
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
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退为 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法执行提及门控
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

- 规范化的 DM handle，例如 `+15555550123` 或 `user@example.com`
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

有关共享 ACP 绑定行为，请参见 [ACP Agents](/tools/acp-agents)。

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

    - gateway 运行在 Linux/VM 上
    - iMessage + `imsg` 运行在你 tailnet 中的一台 Mac 上
    - `cliPath` 包装脚本使用 SSH 运行 `imsg`
    - `remoteHost` 启用通过 SCP 拉取附件

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

    使用 SSH 密钥，以便 SSH 和 SCP 都是非交互式的。
    先确保主机密钥是受信任的（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填充 `known_hosts`。

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
    - 默认情况下，入站附件摄取是**关闭**的——设置 `channels.imessage.includeAttachments: true` 可将照片、语音备忘录、视频和其他附件转发给代理。若保持禁用，仅包含附件的 iMessage 会在到达代理之前被丢弃，甚至可能完全不会产生任何 `Inbound message` 日志行。
    - 当设置了 `remoteHost` 时，可通过 SCP 获取远程附件路径
    - 附件路径必须匹配允许的根目录：
      - `channels.imessage.attachmentRoots`（本地）
      - `channels.imessage.remoteAttachmentRoots`（远程 SCP 模式）
      - 配置的根目录会扩展默认根路径模式 `/Users/*/Library/Messages/Attachments`（是合并，不是替换）
    - SCP 使用严格的主机密钥检查（`StrictHostKeyChecking=yes`）
    - 出站媒体大小使用 `channels.imessage.mediaMaxMb`（默认 16 MB）

  </Accordion>

  <Accordion title="出站文本和分块">
    - 文本块限制：`channels.imessage.textChunkLimit`（默认 4000）
    - 分块模式：`channels.imessage.chunkMode`
      - `length`（默认）
      - `newline`（优先按段落拆分）
    - 出站 markdown 中的粗体/斜体/下划线/删除线会转换为原生样式文本（macOS 15+ 的接收方会显示这些样式；较旧的接收方会看到不带标记的纯文本）；markdown 表格会根据通道的 markdown 表格模式进行转换
    - `channels.imessage.sendTransport`（默认 `auto`，可选 `bridge`、`applescript`）用于选择 `imsg` 的发送方式

  </Accordion>

  <Accordion title="寻址格式">
    推荐的显式目标：

    - `chat_id:123`（推荐用于稳定路由）
    - `chat_guid:...`
    - `chat_identifier:...`

    也支持 handle 目标：

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
  <Accordion title="Available actions">
    - **react**: 添加/移除 iMessage tapback（`messageId`、`emoji`、`remove`）。支持的 tapback 映射到 love、like、dislike、laugh、emphasize 和 question。不带 emoji 进行移除会清除已设置的任意 tapback。
    - **reply**: 向现有消息发送线程回复（`messageId`、`text` 或 `message`，以及 `chatGuid`、`chatId`、`chatIdentifier` 或 `to` 之一）。带附件的回复还需要一个 `imsg` 构建版本，其 `send-rich` 支持 `--file`。
    - **sendWithEffect**: 发送带 iMessage 效果的文本（`text` 或 `message`，`effect` 或 `effectId`）。短名称：slam、loud、gentle、invisibleink、confetti、lasers、fireworks、balloon、heart、echo、happybirthday、shootingstar、sparkles、spotlight。
    - **edit**: 在受支持的 macOS/private API 版本上编辑已发送消息（`messageId`、`text` 或 `newText`）。只能编辑网关自身发送的消息。
    - **unsend**: 在受支持的 macOS/private API 版本上撤回已发送消息（`messageId`）。只能撤回网关自身发送的消息。
    - **upload-file**: 发送媒体/文件（`buffer` 以 base64 形式，或已 hydrated 的 `media`/`path`/`filePath`，`filename`，可选 `asVoice`）。旧别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**: 当当前目标是群聊时管理群聊。这些操作会修改主机的 Messages 身份，因此需要 owner sender 或 `operator.admin` Gateway 客户端。
    - **poll**: 创建原生 Apple Messages 投票（`pollQuestion`、`pollOption` 重复 2 到 12 次，以及 `chatGuid`、`chatId`、`chatIdentifier` 或 `to` 之一）。iOS/iPadOS/macOS 26+ 上的接收者会原生查看并投票；较旧的 OS 版本会收到“Sent a poll”文本回退。需要 `selectors.pollPayloadMessage`。
    - **poll-vote**: 对现有投票进行投票（`pollId` 或 `messageId`，以及 `pollOptionIndex`、`pollOptionId` 或 `pollOptionText` 中恰好一个）。需要 `selectors.pollVoteMessage` 和 `poll.vote` RPC 方法。

    被接受的入站投票会向代理呈现问题、带编号的选项标签、票数，以及 `poll-vote` 所需的投票消息 ID。

  </Accordion>

  <Accordion title="Message IDs">
    入站 iMessage 上下文在可用时同时包含简短的 `MessageSid` 值和完整的消息 GUID（`MessageSidFull`）。简短 ID 仅作用于最近的、基于 SQLite 的回复缓存，并且在使用前会先与当前聊天进行校验。如果简短 ID 已过期或属于其他聊天，请改用完整的 `MessageSidFull` 重试。

  </Accordion>

  <Accordion title="能力检测">
    只有当缓存的探测状态显示桥接不可用时，OpenClaw 才会隐藏私有 API 动作。如果状态未知，动作仍会显示，并且探测会延迟触发，因此在 `imsg launch` 之后，首个动作无需单独手动刷新状态也可能成功。

  </Accordion>

  <Accordion title="Read receipts and typing">
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

  <Accordion title="入站 tapback">
    OpenClaw 会订阅 iMessage tapback，并将收到的反应作为系统事件路由，而不是普通消息文本，因此用户的 tapback 不会触发普通回复循环。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"`（默认）：仅在用户对机器人生成的消息作出反应时通知。
    - `"all"`：对所有来自授权发送者的入站 tapback 通知。
    - `"off"`：忽略入站 tapback。

    按账号覆盖使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>

  <Accordion title="审批反应（👍 / 👎）">
    当 `approvals.exec.enabled` 或 `approvals.plugin.enabled` 为 true 且请求路由到 iMessage 时，网关会原生投递批准请求并接受 tapback 来解决它：

    - `👍`（Like tapback）→ `allow-once`
    - `👎`（Dislike tapback）→ `deny`
    - `allow-always` 仍然是手动回退方式：作为普通回复发送 `/approve <id> allow-always`。

    反应处理要求作出反应的用户句柄必须是显式批准者。批准者列表从 `channels.imessage.allowFrom`（或 `channels.imessage.accounts.<id>.allowFrom`）读取；将用户的 E.164 格式电话号码或其 Apple ID 邮箱加入其中即可（如 `chat_id:*` 这样的聊天目标不是有效的批准者条目）。通配条目 `"*"` 会被接受，但会允许任何发送者批准；空批准者列表会完全禁用该反应快捷方式。该反应快捷方式刻意绕过 `reactionNotifications`、`dmPolicy` 和 `groupAllowFrom`，因为显式批准者白名单才是审批解析真正需要的唯一门槛。

    `/approve` 文本命令的授权遵循相同列表：当 `channels.imessage.allowFrom` 非空时，`/approve <id> <decision>` 会依据该批准者列表进行授权（而不是更宽泛的 DM 白名单），而只在 DM 白名单中获准、但不在 `allowFrom` 中的发送者会收到明确拒绝。当 `allowFrom` 为空时，仍保持同聊天回退机制，`/approve` 会授权 DM 白名单允许的任何人。请把所有应当批准的操作员——无论是通过 `/approve` 还是通过反应——都加入 `allowFrom`。

    操作员说明：
    - 反应绑定同时存储在内存和网关的持久化键值存储中（TTL 与审批过期时间一致），网关还会轮询待处理提示是否有 tapback，因此在网关重启后不久到达的 tapback 仍可解析为审批结果。
    - 操作员自身的 `is_from_me=true` tapback（例如来自已配对的 Apple 设备）在该句柄是显式批准者时会解析该审批。
    - 只有在配置了显式批准者时，审批提示才会路由到群聊；否则群组中的任何成员都可能批准。
    - 旧式文本风格 tapback（来自非常旧的 Apple 客户端的纯文本 `Liked "…"`）无法解析审批，因为它们不携带消息 GUID；反应解析需要当前 macOS / iOS 客户端输出的结构化 tapback 元数据。

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

当用户把命令和 URL 一起输入时——例如 `Dump https://example.com/article`——Apple 的 Messages 应用会把发送拆分成**两条独立的 `chat.db` 记录**：

1. 一条文本消息（`"Dump"`）。
2. 一条 URL 预览气泡（`"https://..."`），并附带 OG 预览图片作为附件。

在大多数配置中，这两行会在约 0.8-2.0 秒的间隔内到达 OpenClaw。如果不进行合并，代理在第 1 轮只会收到命令本身（而且通常会回复“请把 URL 发给我”），然后 URL 会在第 2 轮才到达。这是 Apple 的发送流程导致的，不是 OpenClaw 或 `imsg` 引入的。

`channels.imessage.coalesceSameSenderDms` 会将 DM 纳入对同一发送者连续行的缓冲。当 `imsg` 在某条源记录上暴露结构化的 URL 预览标记 `balloon_bundle_id: "com.apple.messages.URLBalloonProvider"` 时，OpenClaw 只合并那次真实的拆分发送，并保持其他缓冲记录作为独立轮次。在较旧、完全不输出 balloon 元数据的 `imsg` 版本上，OpenClaw 无法区分拆分发送和独立发送，因此会回退为合并整个缓冲桶。这样可以保留元数据引入前的行为，而不是把 `Dump <url>` 的拆分发送退化成两轮。群聊仍按每条消息分发，以保留多用户轮次结构。

<Tabs>
  <Tab title="何时启用">
    在以下情况下启用：

    - 你提供的技能期望在同一条消息里同时包含 `command + payload`（dump、paste、save、queue 等）。
    - 你的用户会把 URL 和命令一起粘贴。
    - 你可以接受额外的 DM 轮次延迟（见下文）。

    在以下情况下保持关闭：

    - 你需要单词 DM 触发器的最低命令延迟。
    - 所有流程都是不带后续负载的单次命令。

  </Tab>
  <Tab title="启用方式">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // 启用（默认：false）
        },
      },
    }
    ```

    打开该标志且未显式设置 `messages.inbound.byChannel.imessage` 或全局 `messages.inbound.debounceMs` 时，防抖窗口会扩大到 **7000 ms**（旧默认值为 0 ms —— 不防抖）。之所以需要更大的窗口，是因为 Apple 的 URL 预览拆分发送节奏在 Messages.app 输出预览行时可能会持续数秒。

    如需自行调整窗口：

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 7000 毫秒可覆盖已观察到的 Messages.app URL 预览延迟。
            imessage: 7000,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="权衡">
    - **精确合并需要当前 `imsg` 载荷元数据。** 当存在 `balloon_bundle_id` 时，只有真实的拆分发送才会被合并；上文所述的不含元数据的回退合并只是临时的向后兼容方案，待 `imsg` 在上游合并拆分发送后将被移除。
    - **DM 消息会增加延迟。** 开启该标志后，每条 DM（包括独立的控制命令和单条文本后续消息）都会在分发前最多等待一个防抖窗口，以防后续会到达 URL 预览行。群聊消息仍保持即时分发。
    - **合并输出有上限。** 合并后的文本最多 4000 个字符，并带有明确的 `…[truncated]` 标记；附件最多 20 个；源条目最多 10 条（超过后保留第一条和最新条）。每个源 GUID 都会在 `coalescedMessageGuids` 中跟踪，用于下游遥测。
    - **仅限 DM。** 群聊会继续按单条消息分发，因此当多人同时发言时，机器人仍然保持响应。
    - **按通道启用。** 其他通道（Discord、Slack、Telegram、WhatsApp，等等）不受影响。将旧的 BlueBubbles 配置中设置的 `channels.bluebubbles.coalesceSameSenderDms` 迁移到 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 场景以及代理看到的内容

“启用标志”列显示的是在会输出 `balloon_bundle_id` 的 `imsg` 构建版本上的行为。在更旧、完全不输出 balloon 元数据的 `imsg` 构建上，下方标记为“两轮”/“N 轮”的行会回退为旧式合并（1 轮）：OpenClaw 无法从结构上区分拆分发送和独立发送，因此会保留元数据引入前的合并行为。只有当构建版本开始输出 balloon 元数据后，精确分离才会启用。

| 用户输入内容                                                     | `chat.db` 产生的结果               | 关闭标志（默认）                        | 打开标志 + 窗口（imsg 输出 balloon 元数据）                                                          |
| ------------------------------------------------------------------ | ----------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Dump https://example.com`（一次发送）                             | 约 1 秒间隔的 2 行                  | 两轮代理轮次：“Dump” 单独一轮，然后是 URL | 一轮：合并后的文本 `Dump https://example.com`                                                       |
| `Save this 📎image.jpg caption`（附件 + 文本）                     | 没有 URL balloon 元数据的 2 行       | 两轮                                   | 在观察到元数据后为两轮；在旧的/预闩锁的、无元数据会话中为一轮合并                                     |
| `/status`（独立命令）                                              | 1 行                                | 立即分发                                | **最多等待一个窗口，然后分发**                                                                      |
| 单独粘贴的 URL                                                     | 1 行                                | 立即分发                                | 最多等待一个窗口，然后分发                                                                         |
| 文本 + URL 作为两条刻意分开的消息发送，且间隔数分钟               | 窗口外的 2 行                         | 两轮                                   | 两轮（窗口在它们之间过期）                                                                          |
| 短时间内快速洪泛（窗口内超过 10 条小 DM）                         | 没有 URL balloon 元数据的 N 行       | N 轮                                   | 在观察到元数据后为 N 轮；在旧的/预闩锁的、无元数据会话中为一个有上限的合并轮次                       |
| 群聊中两个人同时发言                                              | 来自 M 个发送者的 N 行               | M+ 轮（每个发送者桶一轮）               | M+ 轮——群聊不会被合并                                                                               |

## 桥接器或网关重启后的入站恢复

iMessage 会恢复网关停机期间遗漏的消息，同时抑制 Apple 在 Push 恢复后可能一次性刷出的陈旧“积压爆发”。默认行为始终开启，建立在入站去重之上。

- **重放去重。** 每条已分发的入站消息都会通过其 Apple GUID 记录到持久化插件状态（`imessage.inbound-dedupe`）中，在接收时被认领，并在处理完成后提交（若发生瞬时失败则释放，以便重试）。任何已经处理过的内容都会被丢弃，而不会被重复分发。正因为如此，恢复重放才能激进进行，而无需逐条消息记账。
- **停机恢复。** 在启动时，监视器会记住最后一次分发的 `chat.db` 行号（每个账户持久化的游标），并将其作为 `since_rowid` 传递给 `imsg watch.subscribe`，因此 imsg 会重放网关停机期间落入的行，然后切换为实时尾随。重放范围限制为最近 500 行以及约 2 小时内的消息，而去重机制会丢弃任何已处理过的内容。
- **陈旧积压年龄防线。** 启动边界之上的行是真正的实时消息；其中发送时间比到达时间早超过约 15 分钟的，则属于 Push 刷新后的积压，会被抑制。被重放的行（位于边界处或低于边界）则改用更宽松的恢复窗口，因此最近遗漏的消息会被投递，而古老历史不会。

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
    - 提及模式配置（`agents.list[].groupChat.mentionPatterns`）

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
