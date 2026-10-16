---
summary: "通过 signal-cli 提供的 Signal 支持（原生守护进程或 bbernhard 容器）、设置路径以及号码模型"
read_when:
  - "设置 Signal 支持"
  - "调试 Signal send/receive"
title: "Signal"
---

Signal 是一个可下载的频道插件（`@openclaw/signal`）。网关通过 HTTP 与 `signal-cli` 通信：要么使用原生守护进程（JSON-RPC + SSE），要么使用 [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) 容器（REST + WebSocket）。OpenClaw 不包含 libsignal。

## <a id="the-number-model-(read-this-first)"></a><a id="the-number-model-read-this-first"></a> 号码模型（请先阅读）

- 网关连接到一个 **Signal 设备**：`signal-cli` 账户。
- 在 **你的个人 Signal 账户** 上运行机器人会使其忽略你自己的消息（循环保护）。
- 如果想实现“我给机器人发短信，它会回复我”，请使用一个**单独的机器人号码**。

## <a id="install"></a> 安装

```bash
openclaw plugins install @openclaw/signal
```

`@openclaw/signal` 首先从 npm 安装，然后仅当 npm 目标不可用时才回退到其声明的 ClawHub 软件包。使用 `npm:` 或 `clawhub:` 强制源。 `plugins install` 注册并启用插件；不需要单独的 `enable` 步骤。有关一般安装规则，请参阅 [Plugins](/tools/plugin)。

## <a id="quick-setup"></a> 快速设置

<Steps>
  <Step id="pick-a-number" title="选择一个号码">
    为机器人使用一个**单独的 Signal 号码**（推荐）。
  </Step>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/signal
    ```
  </Step>
  <Step id="run-the-guided-setup" title="运行引导设置">
    ```bash
    openclaw channels add
    ```
    该向导会检测 `signal-cli` 是否位于 `PATH` 上，如果缺失，则会提供安装：下载 Linux x86-64 上的官方本机 GraalVM 版本，或通过 Homebrew 在 macOS 和其他架构上安装。然后，它会提示输入机器人编号和 `signal-cli` 路径。

    对于非交互式设置，`openclaw channels add --channel signal` 也接受 `--signal-number <e164>` 作为机器人电话号码，以及 `--http-host <host>` 和 `--http-port <port>` 作为 Signal 守护进程端点（默认 `127.0.0.1:8080`）。

  </Step>
  <Step id="link-or-register-the-account" title="链接或注册帐户">
    - **QR 码关联（最快）：** `signal-cli link -n "OpenClaw"`，然后用 Signal 扫描。参见 [路径 A](#setup-path-a-link-existing-signal-account-qr)。
    - **SMS 注册：** 使用专用号码，通过验证码 + SMS 验证。参见 [路径 B](#setup-path-b-register-dedicated-bot-number-sms-linux)。

  </Step>
  <Step id="verify-and-pair" title="验证并配对">
    ```bash
    openclaw channels status --probe
    ```
    发送第一个 DM 并批准配对：`openclaw pairing approve signal <CODE>`。
  </Step>
</Steps>

最小配置：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      transport: {
        kind: "managed-native",
        cliPath: "signal-cli",
      },
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

| 字段       | 描述                                       |
| ----------- | ------------------------------------------------- |
| `account`   | 机器人电话号码，采用 E.164 格式（`+15551234567`） |
| `transport` | 账号拥有的 Signal 连接与进程模式  |
| `dmPolicy`  | DM 访问策略（推荐`pairing`）          |
| `allowFrom` | 允许 DM 的电话号码或 `uuid:<id>` 值 |

多账户支持：使用带有每个账户配置的 `channels.signal.accounts` 和可选的 `name`。每个指定账户都拥有其 `transport`；它不继承顶级传输。顶级传输仅属于隐式 `default` 帐户。共享模式请参见[多账户通道](/gateway/config-channels#multi-account-all-channels)。

帐户密钥使用按状态显示的规范化 ID。例如，具有自己的 `account` 编号的 `Work Phone` 作为 `work-phone` 运行，并使用其创作的设置而不运行 Doctor。如果多个密钥归一化为相同的 ID，则确切的密钥获胜并且 Doctor 报告冲突。如果另一个存储的密钥选择不同的身份，则删除将拒绝删除该帐户；该错误命名了两个键，因此您可以先解决冲突。没有自己的编号的旧别名将保留其现有的继承行为。 Doctor 可以清理明确的密钥，但拒绝重命名别名，因为这会激活以前忽略的设置。

省略账户`dmPolicy`和`groupPolicy`继承通道根；明确的账户政策获胜。如果两个范围均未设置它们，则 DM 使用 `pairing`，组使用 `allowlist`。

## <a id="what-it-is"></a> 它是什么

- 回复始终返回到 Signal。
- DM 共享代理的主会话；默认为 `session.groupScope: "per-group"`，组是隔离的 （`agent:<agentId>:signal:group:<groupId>`）。
- 默认情况下，Signal可以写入由`/config set|unset`触发的配置更新（需要`commands.config: true`）。使用 `channels.signal.configWrites: false` 禁用。

## <a id="setup-path-a%3A-link-existing-signal-account-(qr)"></a><a id="setup-path-a-link-existing-signal-account-qr"></a> 设置路径A：链接现有Signal账户（QR）

1. 安装 `signal-cli`（JVM 或 native build 版本），或者让 `openclaw channels add` 为你安装它。
2. 链接机器人账户：`signal-cli link -n "OpenClaw"`，然后扫描Signal中的QR。
3. 配置 Signal 并启动网关。

## <a id="setup-path-b%3A-register-dedicated-bot-number-(sms%2C-linux)"></a><a id="setup-path-b-register-dedicated-bot-number-sms-linux"></a> 设置路径 B：注册专用机器人号码（SMS，Linux）

如果你要使用专用机器人号码，而不是绑定现有的 Signal 应用账户，请使用此方式。下面的流程已在 Ubuntu 24 上测试。

1. 获取可以接收SMS的号码（或固定电话的语音验证）。专用机器人编号可避免 account/session 冲突。
2. 在网关主机上安装 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果您使用 JVM 版本 （`signal-cli-${VERSION}.tar.gz`），请先安装 JRE。保持`signal-cli`更新；上游指出，随着 Signal 服务器 API 的更改，旧版本可能会中断。

3. 注册并验证该号码：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

仍在步骤 3 中，如果需要验证码（需要浏览器访问才能完成此步骤）：

- 打开`https://signalcaptchas.org/registration/generate.html`。
- 完成验证码，复制“打开Signal”中的`signalcaptcha://...`链接目标。
- 尽可能从与浏览器会话相同的外部 IP 运行（验证码令牌很快就会过期）。
- 立即注册并验证：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 配置OpenClaw并验证通道。配置更改遵循[hot reload](/gateway/configuration/hot-reload)；如果网关离线，则启动网关。如果您更改了服务的 `PATH` 以找到 `signal-cli`，请重新启动它。

```bash
openclaw doctor
openclaw channels status --probe
```

5. 绑定你的 DM 发送者：
   - 向机器人号码发送任意消息。
   - 在服务器上批准：`openclaw pairing approve signal <PAIRING_CODE>`。
   - 将机器人号码保存为手机中的联系人，以避免显示为“未知联系人”。

<Warning>
使用 `signal-cli` 注册电话号码账户可能会使该号码在主 Signal 应用中的会话失去认证。建议使用专用机器人号码，或者使用 QR 绑定模式以保留你现有的手机应用设置。
</Warning>

上游参考：

- `signal-cli` README: `https://github.com/AsamK/signal-cli`
- 验证码流程：`https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 绑定流程：`https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## <a id="external-native-daemon-mode"></a> 外部原生守护进程模式

要自己管理 `signal-cli`（缓慢的 JVM 冷启动、容器初始化、共享 CPU），请单独运行守护进程并将 OpenClaw 指向它：

对于非交互式设置，在需要时请显式选择端点类型：

```bash
openclaw channels add --channel signal --signal-number +15551234567 \
  --http-url http://127.0.0.1:8080 --signal-transport external-native
```

```json5
{
  channels: {
    signal: {
      transport: {
        kind: "external-native",
        url: "http://127.0.0.1:8080",
      },
    },
  },
}
```

这会跳过自动启动和 OpenClaw 的启动等待。对于启动较慢的受管守护进程，请设置 `channels.signal.transport.startupTimeoutMs`。

## <a id="container-mode-(bbernhard%2Fsignal-cli-rest-api)"></a><a id="container-mode-bbernhard/signal-cli-rest-api"></a> 容器模式（bbernhard/signal-cli-rest-api）

不要原生运行 `signal-cli`，而是使用 [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) Docker 容器，它通过 REST + WebSocket 接口对 `signal-cli` 进行封装。

```bash
openclaw channels add --channel signal --signal-number +15551234567 \
  --http-url http://signal-cli:8080 --signal-transport container
```

要求：

- 容器 **必须** 以 `MODE=json-rpc` 运行，才能实时接收消息。
- 在连接 OpenClaw 之前，在容器内注册或链接您的 Signal 帐户。

示例 `docker-compose.yml` 服务：

```yaml
signal-cli:
  image: bbernhard/signal-cli-rest-api:latest
  environment:
    MODE: json-rpc
  ports:
    - "8080:8080"
  volumes:
    - signal-cli-data:/home/.local/share/signal-cli
```

OpenClaw 配置：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      transport: {
        kind: "container",
        url: "http://signal-cli:8080",
      },
    },
  },
}
```

`transport.kind` 控制 OpenClaw 使用的协议和进程生命周期：

| 值               | 行为                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"managed-native"`  | 启动原生 signal-cli，并在 `/api/v1/rpc` 使用 JSON-RPC、在 `/api/v1/events` 使用 SSE；`url` 可选择与守护进程绑定地址不同的连接端点 |
| `"external-native"` | 连接到已经在运行的原生 signal-cli 守护进程                                                                                                       |
| `"container"`       | 连接 bbernhard REST 的 `/v2/send` 和 WebSocket 的 `/v1/receive/{account}`                                                                             |

设置和 `openclaw doctor --fix` 可以检查现有端点一次以识别其具体类型。运行时操作不会自动检测或切换协议。

容器模式支持与本机模式相同的 Signal 操作，其中容器公开匹配的 API：发送、接收、附件、键入指示器、read/viewed 收据、反应、组和样式文本。 OpenClaw 将本机 Signal RPC 调用转换为容器的 REST 有效负载，包括 `group.{base64(internal_id)}` 组 ID 和用于格式化文本的 `text_mode: "styled"`。

操作注意事项：

- 使用 `MODE=json-rpc` 进行接收。 `MODE=normal` 可以使 `/v1/about` 看起来健康，但 `/v1/receive/{account}` 不会 WebSocket- 升级，因此容器接收流将无法通过检查。
- 为 bbernhard REST API 设置 `kind: "container"`，为本机 `signal-cli` JSON-RPC/SSE 设置 `kind: "external-native"`。
- 容器附件下载在媒体字节限制方面与原生模式保持一致。如果服务器发送了 `Content-Length`，则在完全缓冲之前会拒绝超出大小的响应；否则在流式传输过程中拒绝。
- Health 和丢失附件结果不会等待未使用的响应正文取消完成。

## <a id="opt-in-private-unix-socket"></a> 选择专用 UNIX 套接字

在 POSIX 系统上，托管本机守护程序可以使用 UNIX 套接字而不是 HTTP 侦听器。这在其他 OS 用户不得控制 Signal 守护程序的共享主机上非常有用。配置 `transport.socketPath` 绝对路径（最多 103 个 UTF-8 字节，不含 `.` 或 `..` 路径段）：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15555550123",
      transport: {
        kind: "managed-native",
        socketPath: "/home/user/.local/state/signal-private/daemon.sock",
      },
    },
  },
}
```

套接字的直接目录必须属于网关 OS 用户并具有模式 `0700`（无组或其他访问权限）。 OpenClaw 如果该目录丢失且其父目录已存在，则创建该目录；它不会修复现有目录的权限。符号链接路径被拒绝。在 macOS 上，OpenClaw 还会检查超出 BSD 模式位的 ACL，并拒绝非所有者的访问授予 ACL 条目，包括可继承条目。 Linux、POSIX不检查ACL；操作员应选择没有授予访问权限的 ACL 的父层次结构。为每个帐户使用不同的套接字路径。此选择不支持 Windows。

`socketPath` 仅与 `kind: "managed-native"` 一起有效，不能与 `url`、`httpHost` 或 `httpPort` 组合使用。省略`receiveMode`或设置为`"manual"`； OpenClaw 管理通过套接字的接收订阅。套接字连接或权限失败会停止此传输；没有 HTTP 后备。

现有托管 HTTP 默认值、外部本机守护程序和容器设置保持不变。 **选择退出会使现有的 HTTP 暴露保持不变：** 环回绑定不会阻止另一个本地 OS 用户访问未经身份验证的守护程序。私有目录分隔 OS 用户，而不是作为同一用户或管理员运行的进程。 `signal-cli` 不授权连接对等体的 UID，因此这种隔离保证取决于文件系统授权。 Signal 发件人配对和白名单仍然是单独的消息访问控制。

## <a id="access-control-(dms-%2B-groups)"></a><a id="access-control-dms-+-groups"></a> 访问控制（DM + 群组）

直接消息：

- 默认：`channels.signal.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；在批准之前，消息会被忽略（配对码 1 小时后过期）。
- 通过 `openclaw pairing list signal` 和 `openclaw pairing approve signal <CODE>` 进行批准。
- 配对是 Signal 直接消息的默认令牌交换方式。详情：[配对](/channels/pairing)
- UUID- 仅发件人（来自 `sourceUuid`）在 `channels.signal.allowFrom` 中存储为 `uuid:<id>`。

群组：

- `channels.signal.groupPolicy = open | allowlist | disabled`.
- `channels.signal.groupAllowFrom` 控制当设置 `allowlist` 时哪些群组或发送者可以触发群组回复；条目可以是 Signal 组 ID（原始、`group:<id>` 或 `signal:group:<id>`）、发件人电话号码、`uuid:<id>` 值或 `*`。
- `channels.signal.groups["<group-id>" | "*"]` 可通过 `requireMention`、`tools` 和 `toolsBySender` 覆盖群组行为。
- 在多账户设置中，使用 `channels.signal.accounts.<id>.groups` 进行按账户覆盖。
- 通过 `groupAllowFrom` 将 Signal 群组添加到允许列表，并不会自动禁用提及门控。专门配置的 `channels.signal.groups["<group-id>"]` 条目将处理该群组的每条消息，除非设置了 `requireMention=true`。
- 对于 `requireMention=true`，Signal 本机 @mentions 会根据结构化提及元数据与机器人帐户电话或 `accountUuid` 进行匹配。明文匹配使用`agents.entries.*.groupChat.mentionPatterns`，然后是`messages.groupChat.mentionPatterns`；当两者均未设置时，它将从路由代理的 `identity.name` 和 `identity.emoji` 中派生模式。选定级别的显式 `mentionPatterns: []` 会禁用此文本回退，而不禁用本机 @mentions.
- 运行时说明：如果 `channels.signal` 完全缺失，运行时会对群组检查回退到 `groupPolicy="allowlist"`（即使已设置 `channels.defaults.groupPolicy`）。

带有限制上下文的提及门控群组：

```json5
{
  channels: {
    signal: {
      account: "+15551234567",
      accountUuid: "bot-signal-uuid",
      groupPolicy: "allowlist",
      groupAllowFrom: ["group:<signal-group-id>"],
      historyLimit: 8,
      groups: {
        "<signal-group-id>": { requireMention: true },
      },
    },
  },
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b"],
    },
  },
}
```

未提及机器人的允许组消息保持沉默，并且仅保留在有界的待处理历史记录窗口中。当稍后的本机 @mention 或后备文本提及触发机器人时，OpenClaw 会包含最近的上下文并回复同一组。跳过的附件主体不会被下载；它们可能仅作为待处理上下文中的紧凑媒体占位符出现。

## <a id="how-it-works-(behavior)"></a><a id="how-it-works-behavior"></a> 工作原理（行为）

- 原生模式：`signal-cli` 作为守护进程运行；网关通过 SSE 读取事件。
- 容器模式：网关通过 REST API 发送，并通过 WebSocket 接收。
- 入站消息会被规范化为共享的频道信封。
- 回复始终路由回同一个号码或群组。
- 对入站消息的回复会在后端接受入站时间戳和作者时包含原生 Signal 引用元数据；如果引用元数据缺失或被拒绝，OpenClaw 会将回复作为普通消息发送。
- 取消原始传送会停止后续发送尝试，包括仍在准备的附件和本机引用回退。允许已经提交给Signal的请求完成，并保留其接受的结果；取消不会召回该消息。
- 使用 `channels.signal.replyToMode = off | first | all | batched` 配置原生引用使用，或使用 `channels.signal.replyToModeByChatType.direct/group` 进行按聊天类型覆盖。`channels.signal.accounts.<id>` 下的账号级别值优先。

## <a id="media-%2B-limits"></a><a id="media-+-limits"></a> 媒体 + 限制

- 出站文本会按 `channels.signal.textChunkLimit` 分块（默认 4000）。
- 可选的换行分块：将 `channels.signal.streaming.chunkMode="newline"` 设置为按空行（段落边界）拆分，然后再进行长度分块。
- 支持附件（从 `signal-cli` 获取 base64）。
- 当 `contentType` 丢失时， 语音笔记附件使用 `signal-cli` 文件名作为 MIME 后备，因此音频转录仍然可以对 AAC 语音备忘录进行分类。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 可跳过为任何传输下载媒体。
- 群组历史上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），并回退到 `messages.groupChat.historyLimit`。设为 `0` 可禁用（默认 50）。

## <a id="typing-%2B-read-receipts"></a><a id="typing-+-read-receipts"></a> 显示正在输入 + 已读回执

- **输入中指示**：OpenClaw 通过 `signal-cli sendTyping` 发送正在输入信号，并在回复生成期间持续刷新。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为 true 时，OpenClaw 会转发允许的私信的已读回执。
- `signal-cli` 不会为群组公开已读回执。

## <a id="lifecycle-status-reactions"></a> 生命周期状态反应

设置 `messages.statusReactions.enabled: true` 以让 Signal 在传入消息轮次中显示共享的 queued/thinking/tool/compaction/done/error 反应生命周期。Signal 使用传入消息的时间戳作为反应目标；群组反应会使用 Signal 群组 ID 加上原始发送者作为目标作者发送。

状态反应还需要一个 ack 反应以及匹配的 `messages.ackReactionScope`（`direct`、`group-all`、`group-mentions` 或 `all`）。设置 `channels.signal.reactionLevel: "off"` 可禁用 Signal 状态反应。

Signal 在最终的 done/error 状态后会恢复初始的 ack 反应。

## <a id="reactions-(message-tool)"></a><a id="reactions-message-tool"></a> Reactions（消息工具）

将 `message action=react` 与 `channel=signal` 一起使用。

- Targets: sender E.164 或 UUID（使用 pairing 输出中的 `uuid:<id>`；直接使用裸 UUID 也可以）。
- `messageId` 是你要进行反应的消息的 Signal 时间戳。
- 群组反应需要 `targetAuthor` 或 `targetAuthorUuid`。

```text
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置：

- `channels.signal.actions.reactions`：enable/disable 反应动作（默认 true）。
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`（默认 `minimal`）。
  - `off`/`ack` 禁用 agent reactions（message tool `react` 会报错）。
  - `minimal`/`extensive` 启用 agent reactions 并设置指导级别。
- 按账户覆盖：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## <a id="approval-reactions"></a> 批准反应

Signal 执行和插件批准提示使用顶层的 `approvals.exec` 和 `approvals.plugin` 路由块。Signal 没有 `channels.signal.execApprovals` 块。

- `👍` 批准一次。
- `👎` 拒绝。
- 当请求持久批准时，使用 `/approve <id> allow-always`。

批准反应解析需要来自 `channels.signal.allowFrom`、`channels.signal.defaultTo` 或匹配账户级字段的明确 Signal 批准者。直接的同聊天执行批准提示即使没有明确的批准者，也仍然可以抑制重复的本地 `/approve` 回退；没有批准者的群组批准将保持本地回退可见。

## <a id="question-reactions"></a> 问题反应

对于包含一个非秘密单选问题和一到四个选项的 `ask_user` 提示，Signal 在选项标签旁边显示 `1️⃣` 到 `4️⃣`。使用匹配的号码对发送的提示作出反应以回答它。 OpenClaw 验证反应目标是机器人编写的消息，然后通过网关将数字映射到存储的选项。过时或重复的点击将被忽略。多问题、多选择和自由文本提示仍然仅限文本回复；正常 Signal DM/group 准入规则授权发送方。

## <a id="delivery-targets-(cli%2Fcron)"></a><a id="delivery-targets-cli/cron"></a> 投递目标（CLI/cron）

- 私信：`signal:+15551234567`（或直接使用 E.164）。
- UUID 私信：`uuid:<id>`（或裸 UUID）。
- 群组：`signal:group:<groupId>`。
- 用户名：`username:<name>`（如果你的 Signal 账户支持）。

## <a id="aliases"></a> 别名

在重复出现的 Signal 目标上配置稳定名称的别名。别名仅是 OpenClaw-side 配置；他们不会创建或编辑 Signal 联系人。

```json5
{
  channels: {
    signal: {
      aliases: {
        me: "+15557654321",
        jane: "uuid:123e4567-e89b-12d3-a456-426614174000",
        ops: "group:<groupId>",
      },
      defaultTo: "signal:me",
    },
  },
}
```

在任何接受 Signal 投递目标的地方都可以使用别名：

```bash
openclaw message send --channel signal --target signal:ops --message "Deployment is complete"
```

按账户配置的别名会继承顶层别名，并且可以添加或覆盖名称：

```json5
{
  channels: {
    signal: {
      aliases: {
        me: "+15557654321",
      },
      accounts: {
        work: {
          aliases: {
            ops: "group:<workGroupId>",
          },
        },
      },
    },
  },
}
```

`openclaw directory peers list --channel signal` 和 `openclaw directory groups list --channel signal` 会列出已配置的别名。Signal 目录由配置驱动；它不会实时查询 Signal 联系人，也不会修改 Signal 账户。

## <a id="troubleshooting"></a> 故障排查

先运行这组检查：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后根据需要确认 DM 配对状态：

```bash
openclaw pairing list signal
```

常见故障：

- Daemon 可达但没有回复：请检查 `account`、`transport.kind`、传输 URL，以及接收模式。
- 私信被忽略：发送方处于待配对审批状态。
- 组消息被忽略：组 sender/mention 门控阻止传送。
- 编辑后出现配置校验错误：运行 `openclaw doctor --fix`。
- 诊断中缺少 Signal：确认 `channels.signal.enabled: true`。

其他检查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
openclaw logs --plain --limit 500 | grep -i "signal" | tail -20
```

排查流程请参见：[Channels Troubleshooting](/channels/troubleshooting)。

## <a id="security-notes"></a> 安全说明

- `signal-cli` 会将账户密钥存储在本地（通常位于 `~/.local/share/signal-cli/data/`）。
- 在服务器迁移或重建之前，请先备份 Signal 账户状态。
- 保持 `channels.signal.dmPolicy: "pairing"`，除非你明确希望更广泛的 DM 访问。
- 仅注册或恢复流程需要 SMS 验证，但失去对 number/account 的控制可能会使重新注册变得复杂。

## <a id="configuration-reference-(signal)"></a><a id="configuration-reference-signal"></a> 配置参考（Signal）

完整配置：[配置](/gateway/configuration)

提供商选项：

- `channels.signal.enabled`：enable/disable 通道启动。
- `channels.signal.account`: 机器人账户的 E.164。
- `channels.signal.accountUuid`: 可选的机器人账户 UUID，用于原生 @mention 检测和循环保护。
- `channels.signal.transport`: 账户自有传输。对于托管原生默认值可省略。
- `channels.signal.transport.kind`: `managed-native | external-native | container`.
- `channels.signal.transport.url`: `external-native` 和 `container` 必填；当 `managed-native` 的连接端点不同于守护进程绑定时可选。
- `channels.signal.transport.cliPath`: `signal-cli` 的托管原生路径。
- `channels.signal.transport.configPath`: 可选的托管原生 `signal-cli --config` 目录。
- `channels.signal.transport.httpHost`, `channels.signal.transport.httpPort`: 托管原生守护进程绑定（默认 `127.0.0.1:8080`）。
- `channels.signal.transport.startupTimeoutMs`: 托管原生启动等待时间，单位为毫秒（最小 1000，最大 120000；默认 30000）。
- `channels.signal.transport.receiveMode`: 托管原生 `on-start | manual`。
- `channels.signal.ignoreAttachments`: 跳过此账户的入站附件下载。
- `channels.signal.transport.ignoreStories`: 托管原生故事开关。
- `channels.signal.sendReadReceipts`: 转发已读回执。
- `channels.signal.dmPolicy`: `pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.signal.allowFrom`：DM 白名单（E.164 或 `uuid:<id>`）。 `open` 需要 `"*"`。 Signal没有用户名；使用 phone/UUID ID。
- `channels.signal.aliases`：DM 或组传送目标的 OpenClaw- 旁别名。
- `channels.signal.groupPolicy`: `open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`：组白名单；接受 Signal 组 ID（原始、`group:<id>` 或 `signal:group:<id>`）、发件人 E.164 号码或 `uuid:<id>` 值。
- `channels.signal.groups`: 以 Signal 群组 ID（或 `"*"`）为键的每个群组覆盖项。支持字段：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`: `channels.signal.groups` 的按账户版本，用于多账户设置。
- `channels.signal.accounts.<id>.aliases`: 按账户别名，与顶层别名合并。
- `channels.signal.replyToMode`: 原生回复引用模式，`off | first | all | batched`（默认：`all`）。
- `channels.signal.replyToModeByChatType.direct`, `channels.signal.replyToModeByChatType.group`: 按聊天类型的原生回复引用覆盖项。
- `channels.signal.accounts.<id>.replyToMode`, `channels.signal.accounts.<id>.replyToModeByChatType.direct`, `channels.signal.accounts.<id>.replyToModeByChatType.group`: 按账户回复引用覆盖项。
- `channels.signal.historyLimit`: 作为上下文包含的群组消息最大数量（0 表示禁用）。
- `channels.signal.dmHistoryLimit`: 用户轮次中的 DM 历史限制。按用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`: 出站分块大小，单位字符（默认 4000）。
- `channels.signal.markdown.tables`：Markdown表格渲染模式，`off | bullets | code`（默认`bullets`）； `block` 回退到 `code`（Signal 没有本机块表）。
- `channels.signal.streaming.chunkMode`: `length`（默认）或 `newline`，用于在按长度分块之前按空行（段落边界）拆分。
- `channels.signal.mediaMaxMb`：MB 中的 inbound/outbound 介质上限（默认 8）。
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`（默认 `minimal`）。请参见[反应](#reactions-message-tool)。
- `channels.signal.reactionNotifications`: `off | own | all | allowlist`（默认 `own`）- 当代理收到来自他人的入站反应时的通知方式。
- `channels.signal.reactionAllowlist`: 当 `reactionNotifications: "allowlist"` 时，会通知代理的反应发送者。
- `channels.signal.streaming.block.enabled`, `channels.signal.streaming.block.coalesce`: 跨频道共享的块模式流式控制。请参见[流式传输](/concepts/streaming)。

相关全局选项：

- `agents.entries.*.groupChat.mentionPatterns`（纯文本回退；当配置了机器人账户身份时，Signal 原生 @mentions 会从结构化元数据中检测）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `channels.signal.responsePrefix` 或账户级别的 `responsePrefix`。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [通道路由](/channels/channel-routing) - 消息的会话路由
- [Reactions](/tools/reactions) - `message` 工具的表情符号反应语义
- [RPC 适配器](/reference/rpc) - 此通道后面的 signal-cli JSON-RPC-over-HTTP 守护进程模式
- [Security](/gateway/security) - 访问模型和强化
