---
summary: "通过 imsg（经 stdio 传输的 JSON-RPC）提供原生 iMessage 支持，并带有用于回复、tapback、效果、附件和群组管理的私有 API 操作。对于主机要求符合条件的新 OpenClaw iMessage 配置，优先推荐使用。"
read_when:
  - 设置 iMessage 支持
  - 调试 iMessage 发送/接收
title: "iMessage"
---

<Note>
对于 OpenClaw iMessage 部署，请在已登录的 macOS Messages 主机上使用 `imsg`。如果你的 Gateway 运行在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 指向一个通过 SSH 在 Mac 上运行 `imsg` 的包装器。

**Gateway 停机后的补抓是可选功能。** 启用后（`channels.imessage.catchup.enabled: true`），网关会在下次启动时重放在其离线期间（崩溃、重启、Mac 睡眠）落入 `chat.db` 的入站消息。默认禁用——参见 [网关停机后的补抓](#catching-up-after-gateway-downtime)。关闭 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。
</Note>

<Warning>
BlueBubbles 支持已移除。请将 `channels.bluebubbles` 配置迁移到 `channels.imessage`；OpenClaw 仅通过 `imsg` 支持 iMessage。
</Warning>

状态：原生外部 CLI 集成。Gateway 会启动 `imsg rpc`，并通过 stdio 上的 JSON-RPC 通信（没有单独的守护进程/端口）。高级操作需要 `imsg launch` 以及成功的私有 API 探测。

<CardGroup cols={3}>
  <Card title="私有 API 操作" icon="wand-sparkles" href="#private-api-actions">
    回复、tapback、效果、附件和群组管理。
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
      // 可选：覆盖允许的附件根目录。
      // 默认包含 /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    如果未设置 `remoteHost`，OpenClaw 会尝试通过解析 SSH 包装脚本自动检测。
    `remoteHost` 必须是 `host` 或 `user@host`（不能有空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的 host key 检查，因此中继主机的 host key 必须已经存在于 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行验证。

  </Tab>
</Tabs>

## 要求和权限（macOS）

- Messages 必须在运行 `imsg` 的 Mac 上已登录。
- 运行 OpenClaw/`imsg` 的进程上下文需要完全磁盘访问权限（用于访问 Messages 数据库）。
- 通过 Messages.app 发送消息需要自动化权限。
- 对于高级操作（react / edit / unsend / threaded reply / effects / group ops），必须禁用系统完整性保护（SIP）——见下方 [启用 imsg 私有 API](#enabling-the-imsg-private-api)。基础文本和媒体收发在不禁用 SIP 的情况下也能工作。

<Tip>
权限是按进程上下文授予的。如果 gateway 以无头方式运行（LaunchAgent/SSH），请在相同上下文中运行一次交互式命令以触发权限提示：

```bash
imsg chats --limit 1
# 或
imsg send <handle> "test"
```

</Tip>

## 启用 imsg 私有 API

`imsg` 提供两种运行模式：

- **基础模式**（默认，不需要更改 SIP）：通过 `send` 发送外发文本和媒体、入站监控/历史、聊天列表。这就是在全新安装 `brew install steipete/tap/imsg` 并授予上面列出的标准 macOS 权限后可直接获得的能力。
- **私有 API 模式**：`imsg` 会将一个 helper dylib 注入 `Messages.app`，以调用内部 `IMCore` 函数。这会解锁 `react`、`edit`、`unsend`、`reply`（线程式）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及输入状态指示和已读回执。

要达到本页面所描述的这个通道的高级操作能力，你需要私有 API 模式。`imsg` 的 README 明确说明了这一点：

> 诸如 `read`、`typing`、`launch`、基于桥接的富发送、消息变更和聊天管理等高级功能都是可选的。它们需要禁用 SIP，并将一个 helper dylib 注入到 `Messages.app` 中。启用 SIP 时，`imsg launch` 会拒绝注入。

这种 helper 注入技术使用的是 `imsg` 自己的 dylib 来访问 Messages 的私有 API。在 OpenClaw 的 iMessage 路径中，没有第三方服务器或 BlueBubbles 运行时。

<Warning>
**禁用 SIP 是真实的安全权衡。** SIP 是 macOS 防止运行被修改系统代码的核心保护之一；在系统范围内关闭它会带来额外的攻击面和副作用。尤其是，**在 Apple Silicon Mac 上禁用 SIP 也会禁用在你的 Mac 上安装和运行 iOS App 的能力**。

请将其视为一个有意的运维决策，而不是默认设置。如果你的威胁模型不能接受关闭 SIP，那么内置 iMessage 仅限于基础模式——仅文本和媒体收发，不支持 reaction / edit / unsend / effects / group ops。
</Warning>

### 设置

1. **在运行 Messages.app 的 Mac 上安装（或升级）`imsg`**：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 的输出会报告 `bridge_version`、`rpc_methods` 以及每个方法的 `selectors`，这样你就能在开始之前看到当前构建支持哪些能力。

2. **禁用系统完整性保护。** 这与 macOS 版本相关，因为底层 Apple 要求取决于操作系统和硬件：
   - **macOS 10.13–10.15（Sierra–Catalina）：** 通过终端禁用 Library Validation，重启进入恢复模式，运行 `csrutil disable`，然后重启。
   - **macOS 11+（Big Sur 及更新版本），Intel：** 恢复模式（或互联网恢复），`csrutil disable`，重启。
   - **macOS 11+，Apple Silicon：** 通过电源按钮启动流程进入恢复模式；在较新的 macOS 版本上，点击 Continue 时按住 **左 Shift** 键，然后运行 `csrutil disable`。虚拟机环境遵循单独流程——先创建 VM 快照。
   - **macOS 26 / Tahoe：** library-validation 策略和 `imagent` 私有权限检查进一步收紧；`imsg` 可能需要更新构建才能跟上。如果在 macOS 大版本升级后，`imsg launch` 注入或某些特定 `selectors` 开始返回 false，请先查看 `imsg` 的发布说明，再假设 SIP 步骤已成功。

   在运行 `imsg launch` 之前，请按照 Apple 针对你的 Mac 的恢复模式流程禁用 SIP。

3. **注入 helper。** 在 SIP 已禁用且 Messages.app 已登录的情况下：

   ```bash
   imsg launch
   ```

   当 SIP 仍启用时，`imsg launch` 会拒绝注入，因此这也可作为第 2 步是否生效的确认。

4. **从 OpenClaw 验证桥接：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 条目应报告为 `works`，并且 `imsg status --json | jq '.selectors'` 应显示 `retractMessagePart: true`，以及你的 macOS 构建所暴露的编辑 / 输入状态 / 已读等选择器。OpenClaw 插件在 `actions.ts` 中按方法进行的能力门控，只会公开其底层 selector 为 `true` 的操作，因此你在代理工具列表中看到的动作范围，反映了该主机上的桥接实际能做什么。

如果 `openclaw channels status --probe` 将该通道报告为 `works`，但在分发时某些特定操作抛出 “iMessage `<action>` requires the imsg private API bridge”，请再次运行 `imsg launch`——helper 可能会脱落（Messages.app 重启、系统更新等），而缓存的 `available: true` 状态会继续宣告这些操作，直到下一次探测刷新它为止。

### 当你无法禁用 SIP 时

如果你的威胁模型不接受禁用 SIP：

- `imsg` 会回退到基础模式——仅文本 + 媒体 + 接收。
- OpenClaw 插件仍会公开文本/媒体发送和入站监控；只是会根据按方法的能力门控，在动作面上隐藏 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群组操作。
- 你可以在另一台非 Apple Silicon Mac（或一台专用 bot Mac）上关闭 SIP 来承担 iMessage 工作负载，同时在你的主设备上保持 SIP 启用。见下方 [专用 bot macOS 用户（独立 iMessage 身份）](#deployment-patterns)。

## 访问控制和路由

<Tabs>
  <Tab title="DM 策略">
    `channels.imessage.dmPolicy` 控制私信：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目可以是 handle 或聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。

  </Tab>

  <Tab title="群组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist`（配置时的默认值）
    - `open`
    - `disabled`

    群组发送者允许列表：`channels.imessage.groupAllowFrom`。

    运行时回退：如果未设置 `groupAllowFrom`，iMessage 群组发送者检查会在可用时回退到 `allowFrom`。
    运行时说明：如果 `channels.imessage` 完全缺失，运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy` 也是如此）。

    <Warning>
    群组路由有 **两个** 依次执行的允许列表门槛，而且两者都必须通过：

    1. **发送者 / 聊天目标允许列表**（`channels.imessage.groupAllowFrom`）——handle、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群组注册表**（`channels.imessage.groups`）——在 `groupPolicy: "allowlist"` 下，这个门槛要求要么有一个 `groups: { "*": { ... } }` 通配条目（设置 `allowAll = true`），要么在 `groups` 下有一个显式的按 `chat_id` 条目。

    如果第 2 个门槛为空，所有群组消息都会被丢弃。插件在默认日志级别下会发出两条 `warn` 级别信号：

    - 启动时每个账号一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 运行时每个 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私信仍然可以工作，因为它们走的是不同的代码路径。

    在 `groupPolicy: "allowlist"` 下保持群组消息正常流动的最小配置：

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

    如果网关日志中出现这些 `warn` 行，说明第 2 个门槛正在丢弃消息——请添加 `groups` 块。
    </Warning>

    群组提及门控：

    - iMessage 没有原生提及元数据
    - 提及检测使用正则模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 如果未配置任何模式，则无法执行提及门控

    来自已授权发送者的控制命令可以绕过群组中的提及门控。

    每组 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串。该值会在每次处理该组消息的回合中注入到代理的系统提示词里。其解析方式与 `channels.whatsapp.groups` 使用的按组提示词解析规则一致：

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

    每组提示词仅适用于群组消息——此通道中的直接消息不受影响。

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

传统 iMessage 聊天也可以绑定到 ACP 会话。

快速操作流程：

- 在该私信或允许的群聊中运行 `/acp spawn codex --bind here`。
- 之后同一 iMessage 会话中的消息会路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会就地重置同一个已绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

通过顶层 `bindings[]` 条目支持已配置的持久绑定，使用 `type: "acp"` 和 `match.channel: "imessage"`。

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
    4. 创建 SSH 包装脚本，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
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
</AccordionGroup>

## 媒体、分块和投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 入站附件摄取**默认关闭**——将 `channels.imessage.includeAttachments: true` 设为开启后，才会把照片、语音备忘录、视频及其他附件转发给代理。若保持关闭，仅包含附件的 iMessage 会在到达代理之前被丢弃，并且可能根本不会生成任何 `Inbound message` 日志行。
    - 当设置了 `remoteHost` 时，可通过 SCP 拉取远程附件路径
    - 附件路径必须匹配允许的根目录：
      - `channels.imessage.attachmentRoots`（本地）
      - `channels.imessage.remoteAttachmentRoots`（远程 SCP 模式）
      - 默认根路径模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用严格的主机密钥检查（`StrictHostKeyChecking=yes`）
    - 出站媒体大小使用 `channels.imessage.mediaMaxMb`（默认 16 MB）

  </Accordion>

  <Accordion title="出站分块">
    - 文本分块限制：`channels.imessage.textChunkLimit`（默认 4000）
    - 分块模式：`channels.imessage.chunkMode`
      - `length`（默认）
      - `newline`（优先按段落拆分）

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
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可用动作">
    - **react**：添加/移除 iMessage tapback（`messageId`、`emoji`、`remove`）。支持的 tapback 映射到 love、like、dislike、laugh、emphasize 和 question。
    - **reply**：对现有消息发送线程式回复（`messageId`、`text` 或 `message`，以及 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。
    - **sendWithEffect**：发送带有 iMessage 效果的文本（`text` 或 `message`、`effect` 或 `effectId`）。
    - **edit**：在支持的 macOS/私有 API 版本上编辑已发送消息（`messageId`、`text` 或 `newText`）。
    - **unsend**：在支持的 macOS/私有 API 版本上撤回已发送消息（`messageId`）。
    - **upload-file**：发送媒体/文件（`buffer` 为 base64，或已加载的 `media`/`path`/`filePath`，`filename`，可选 `asVoice`）。旧别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：当当前目标是群聊时，管理群聊。

  </Accordion>

  <Accordion title="消息 ID">
    入站 iMessage 上下文在可用时同时包含简短 `MessageSid` 值和完整消息 GUID。简短 ID 的作用域仅限于最近的内存回复缓存，并且在使用前会针对当前聊天进行检查。如果简短 ID 已过期或属于其他聊天，请改用完整的 `MessageSidFull` 重试。

  </Accordion>

  <Accordion title="能力检测">
    只有当缓存的探测状态显示桥接不可用时，OpenClaw 才会隐藏私有 API 动作。如果状态未知，动作仍会显示，并且探测会延迟触发，因此在 `imsg launch` 之后，首个动作无需单独手动刷新状态也可能成功。

  </Accordion>

  <Accordion title="已读回执和输入状态">
    当私有 API 桥接可用时，接受到的入站聊天会在分发前被标记为已读，并且在代理生成回复时会向发送者显示输入状态气泡。可通过以下方式禁用已读标记：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于按方法级别能力列表的旧版 `imsg` 构建会静默关闭输入状态/已读；OpenClaw 每次重启只会记录一次警告，因此缺失回执的原因可以追溯。

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

在大多数环境中，这两条记录会在约 0.8-2.0 秒内先后到达 OpenClaw。若不进行合并，代理会在第 1 轮只收到命令，随后回复（通常是“把 URL 发给我”），而直到第 2 轮才看到 URL——此时命令上下文已经丢失。这是 Apple 的发送流程导致的，不是 OpenClaw 或 `imsg` 引入的行为。

`channels.imessage.coalesceSameSenderDms` 可将一个 DM 配置为把同一发送者连续出现的记录合并为一次代理轮次。群聊仍按每条消息分发，从而保留多用户轮次结构。

<Tabs>
  <Tab title="何时启用">
    在以下情况下启用：

    - 你提供的技能期望 `command + payload` 出现在同一条消息中（dump、paste、save、queue 等）。
    - 用户会在命令旁粘贴 URL、图片或长内容。
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

    启用该标志且未显式设置 `messages.inbound.byChannel.imessage` 时，防抖窗口会扩大到 **2500 ms**（旧默认值为 0 ms——不进行防抖）。需要更大的窗口，因为 Apple 的拆分发送节奏 0.8-2.0 秒无法适应更紧的默认值。

    如需自行调整窗口：

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 ms 适用于大多数环境；如果你的 Mac
            // 比较慢或内存压力较大（观测到的间隔此时可能超过 2 秒），
            // 可提高到 4000 ms。
            imessage: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="权衡">
    - **DM 消息会增加延迟。** 启用该标志后，每条 DM（包括独立控制命令和单文本后续消息）在分发前都会最多等待防抖窗口时长，以便可能到来的负载行一并合并。群聊消息仍会立即分发。
    - **合并输出有上限。** 合并后的文本上限为 4000 个字符，并会显式标记 `…[truncated]`；附件上限为 20；来源条目上限为 10（超过后保留最早和最新的项）。每个来源 GUID 都会记录在 `coalescedMessageGuids` 中，用于下游遥测。
    - **仅限 DM。** 群聊会继续按每条消息分发，因此当多人同时发言时机器人仍然保持响应。
    - **按频道启用。** 其他频道（Telegram、WhatsApp、Slack、…）不受影响。将 `channels.bluebubbles.coalesceSameSenderDms` 设为启用的旧版 BlueBubbles 配置应把该值迁移到 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 场景以及代理看到的内容

| 用户输入内容                                                     | `chat.db` 产出          | 关闭标志（默认）                         | 开启标志 + 2500 ms 窗口                                             |
| ---------------------------------------------------------------- | ----------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `Dump https://example.com`（一次发送）                            | 约 1 秒间隔的 2 行       | 两次代理轮次：“Dump” 单独出现，然后是 URL | 一次轮次：合并后的文本 `Dump https://example.com`                  |
| `Save this 📎image.jpg caption`（附件 + 文本）                     | 2 行                     | 两次轮次（合并时附件被丢弃）              | 一次轮次：保留文本 + 图片                                            |
| `/status`（独立命令）                                            | 1 行                     | 立即分发                                 | **最多等待窗口时间，然后分发**                                      |
| 单独粘贴的 URL                                                     | 1 行                     | 立即分发                                 | 立即分发（桶中只有一条记录）                                        |
| 文本 + URL 作为两条有意分开发送的消息，间隔数分钟                | 窗口外的 2 行            | 两次轮次                                 | 两次轮次（窗口会在两次之间过期）                                     |
| 短时间内快速洪泛（窗口内 >10 条小 DM）                             | N 行                     | N 次轮次                                  | 一次轮次，输出受限（保留最早 + 最新，应用文本/附件上限）            |
| 群聊中两个人同时输入                                              | 来自 M 个发送者的 N 行    | M+ 次轮次（每个发送者桶一次）            | M+ 次轮次——群聊不会被合并                                           |

## 网关停机后的追赶

当网关离线时（崩溃、重启、Mac 休眠、机器关机），`imsg watch` 会在网关恢复后从当前 `chat.db` 状态继续运行——在这段空窗期间到达的内容，默认情况下都不会被看到。追赶机制会在下次启动时重放这些消息，这样代理就不会静默漏掉入站流量。

追赶功能默认**关闭**。按频道启用：

```ts
channels: {
  imessage: {
    catchup: {
      enabled: true,             // 总开关（默认：false）
      maxAgeMinutes: 120,        // 跳过早于现在 - 2 小时的行（默认：120，范围限制 1..720）
      perRunLimit: 50,           // 每次启动最多重放的行数（默认：50，范围限制 1..500）
      firstRunLookbackMinutes: 30, // 首次运行且没有游标：回看 30 分钟（默认：30）
      maxFailureRetries: 10,     // 对同一个卡住的 guid 失败 10 次后放弃（默认：10）
    },
  },
}
```

### 运行方式

每次 `monitorIMessageProvider` 启动只执行一轮，顺序为 `imsg launch` ready → `watch.subscribe` → `performIMessageCatchup` → live dispatch loop。追赶本身使用与 `imsg watch` 相同的 JSON-RPC 客户端，通过 `chats.list` + 按聊天的 `messages.history` 进行回放。追赶轮次中到达的内容会正常进入实时分发流程；现有的入站去重缓存会吸收与重放行的任何重叠。

每条重放的行都会经过实时分发路径（`evaluateIMessageInbound` + `dispatchInboundMessage`），因此允许列表、群组策略、去抖器、回显缓存和已读回执在重放消息与实时消息上表现一致。

### 游标与重试语义

追赶会为每个账号在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` 维护一个游标（OpenClaw 状态目录默认是 `~/.openclaw`，可通过 `OPENCLAW_STATE_DIR` 覆盖）：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 每次成功分发后游标都会前进；如果某一行分发时抛出错误，则游标会保持不动——下次启动会从该保留游标再次尝试同一行。
- 对同一个 `guid` 连续抛出达到 `maxFailureRetries` 次后，追赶会记录一条 `warn`，并强制将游标越过该卡住的消息，从而让后续启动能够继续推进。
- 已经放弃的 guid 在之后的运行中会在发现时直接跳过（不再尝试分发），并在运行摘要中计入 `skippedGivenUp`。

### 运维可见信号

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

出现 `WARN ... capped to perRunLimit` 表示一次启动并未清空全部积压。如果你的空窗期经常超过默认的 50 行处理量，请提高 `perRunLimit`（最大 500）。

### 何时关闭它

- 网关持续运行，并通过 watchdog 自动重启，且空窗通常少于几秒——默认关闭即可。
- DM 量很低，漏消息也不会改变代理行为——首次启用时 `firstRunLookbackMinutes` 的初始窗口可能会意外派发较旧的上下文。

当你开启 catchup 后，第一次没有游标的启动只会回看 `firstRunLookbackMinutes`（默认 30 分钟），而不会回看完整的 `maxAgeMinutes` 窗口——这样可以避免重放大量启用前的历史消息。

## 故障排查

<AccordionGroup>
  <Accordion title="未找到 imsg 或不支持 RPC">
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探测报告不支持 RPC，请更新 `imsg`。如果私有 API 操作不可用，请在已登录的 macOS 用户会话中运行 `imsg launch`，然后再次探测。如果 Gateway 没有在 macOS 上运行，请改用上面的通过 SSH 连接远程 Mac 的设置，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion title="Gateway 未在 macOS 上运行">
    默认的 `cliPath: "imsg"` 必须在登录到 Messages 的 Mac 上运行。在 Linux 或 Windows 上，将 `channels.imessage.cliPath` 设置为一个包装脚本，通过 SSH 连接到那台 Mac 并运行 `imsg "$@"`。

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

- [Configuration reference - iMessage](/gateway/config-channels#imessage)
- [Gateway configuration](/gateway/configuration)
- [Pairing](/channels/pairing)

## 相关内容

- [Channels Overview](/channels) — 所有受支持的渠道
- [Coming from BlueBubbles](/channels/imessage-from-bluebubbles) — 配置翻译表和逐步切换
- [Pairing](/channels/pairing) — DM 认证和配对流程
- [Groups](/channels/groups) — 群聊行为和提及门控
- [Channel Routing](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和加固
