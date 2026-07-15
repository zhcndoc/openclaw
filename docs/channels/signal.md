---
summary: "通过 signal-cli 提供的 Signal 支持（原生守护进程或 bbernhard 容器）、设置路径以及号码模型"
read_when:
  - 设置 Signal 支持
  - 排查 Signal 发送/接收问题
title: "Signal"
---

Signal 是一个可下载的频道插件（`@openclaw/signal`）。网关通过 HTTP 与 `signal-cli` 通信：要么使用原生守护进程（JSON-RPC + SSE），要么使用 [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) 容器（REST + WebSocket）。OpenClaw 不包含 libsignal。

## 号码模型（请先阅读）

- 网关连接到一个 **Signal 设备**：`signal-cli` 账户。
- 在 **你的个人 Signal 账户** 上运行机器人会使其忽略你自己的消息（循环保护）。
- 如果想实现“我给机器人发短信，它会回复我”，请使用一个**单独的机器人号码**。

## 安装

```bash
openclaw plugins install @openclaw/signal
```

裸插件规范会先尝试 ClawHub，然后回退到 npm。可以使用 `openclaw plugins install clawhub:@openclaw/signal` 或 `npm:@openclaw/signal` 强制指定来源。`plugins install` 会注册并启用插件；无需单独执行 `enable` 步骤。有关通用安装规则，请参见 [插件](/tools/plugin)。

## 快速设置

<Steps>
  <Step title="选择一个号码">
    为机器人使用一个**单独的 Signal 号码**（推荐）。
  </Step>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/signal
    ```
  </Step>
  <Step title="运行引导式设置">
    ```bash
    openclaw channels add
    ```
    向导会检测 `signal-cli` 是否在 `PATH` 中；如果没有，它会提供安装选项：在 Linux x86-64 上下载官方原生 GraalVM 构建版本，或在 macOS 和其他架构上通过 Homebrew 安装。随后它会提示输入机器人号码和 `signal-cli` 路径。
  </Step>
  <Step title="关联或注册账户">
    - **QR 码关联（最快）：** `signal-cli link -n "OpenClaw"`，然后用 Signal 扫描。参见 [路径 A](#setup-path-a-link-existing-signal-account-qr)。
    - **SMS 注册：** 使用专用号码，通过验证码 + SMS 验证。参见 [路径 B](#setup-path-b-register-dedicated-bot-number-sms-linux)。

  </Step>
  <Step title="验证并配对">
    ```bash
    openclaw gateway call channels.status --params '{"probe":true}'
    ```
    发送第一条私信并批准配对：`openclaw pairing approve signal <CODE>`。
  </Step>
</Steps>

最小配置：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

| Field        | Description                                       |
| ------------ | ------------------------------------------------- |
| `account`    | 机器人的 E.164 格式电话号码（`+15551234567`） |
| `cliPath`    | `signal-cli` 的路径（如果在 `PATH` 中则为 `signal-cli`）  |
| `configPath` | 通过 `--config` 传递给 `signal-cli` 的配置目录        |
| `dmPolicy`   | 私信访问策略（推荐使用 `pairing`）          |
| `allowFrom`  | 允许私信的电话号码或 `uuid:<id>` 值 |

多账户支持：使用 `channels.signal.accounts`，为每个账户分别配置，并可选提供 `name`。共享模式请参见 [多账户渠道](/gateway/config-channels#multi-account-all-channels)。

## 它是什么

- 确定性路由：回复始终返回 Signal。
- 私信共享代理的主会话；群组彼此隔离（`agent:<agentId>:signal:group:<groupId>`）。
- 默认情况下，Signal 可能会写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。可通过将 `channels.signal.configWrites` 设置为 `false` 来禁用。

## 设置路径 A：链接已有 Signal 账户（QR）

1. 安装 `signal-cli`（JVM 或原生构建版本），或者让 `openclaw channels add` 为你安装它。
2. 链接一个机器人账户：`signal-cli link -n "OpenClaw"`，然后在 Signal 中扫描二维码。
3. 配置 Signal 并启动网关。

## 设置路径 B：注册专用机器人号码（SMS，Linux）

如果你要使用专用机器人号码，而不是绑定现有的 Signal 应用账户，请使用此方式。下面的流程已在 Ubuntu 24 上测试。

1. 获取一个可以接收 SMS（或者对于座机可接收语音验证）的号码。专用机器人号码可以避免账户/会话冲突。
2. 在网关主机上安装 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果你使用 JVM 构建（`signal-cli-${VERSION}.tar.gz`），请先安装 JRE。请保持 `signal-cli` 为最新版本；上游说明旧版本可能会因 Signal 服务器 API 变更而失效。

3. 注册并验证该号码：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要验证码（完成此步骤需要浏览器访问）：

1. 打开 `https://signalcaptchas.org/registration/generate.html`。
2. 完成验证码，从 “Open Signal” 中复制 `signalcaptcha://...` 链接目标。
3. 尽可能使用与浏览器会话相同的外部 IP 运行（验证码令牌会很快过期）。
4. 立即注册并验证：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 配置 OpenClaw，重启网关，验证通道：

```bash
# 如果你将网关作为用户级 systemd 服务运行：
systemctl --user restart openclaw-gateway.service

# 然后验证：
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

- `signal-cli` README：`https://github.com/AsamK/signal-cli`
- 验证码流程：`https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 绑定流程：`https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守护进程模式（httpUrl）

要自行管理 `signal-cli`（JVM 冷启动慢、容器初始化、共享 CPU 等场景），请将守护进程单独运行，并让 OpenClaw 指向它：

```json5
{
  channels: {
    signal: {
      httpUrl: "http://127.0.0.1:8080",
      autoStart: false,
    },
  },
}
```

这会跳过自动拉起以及 OpenClaw 的启动等待。对于启动缓慢的自动拉起场景，请设置 `channels.signal.startupTimeoutMs`。

## 容器模式（bbernhard/signal-cli-rest-api）

不要原生运行 `signal-cli`，而是使用 [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) Docker 容器，它通过 REST + WebSocket 接口对 `signal-cli` 进行封装。

要求：

- 容器 **必须** 以 `MODE=json-rpc` 运行，才能实时接收消息。
- 在连接 OpenClaw 之前，先在容器内注册或绑定你的 Signal 账户。

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
      httpUrl: "http://signal-cli:8080",
      autoStart: false,
      apiMode: "container", // 或使用 "auto" 自动检测
    },
  },
}
```

`apiMode` 控制 OpenClaw 使用哪种协议：

| 值            | 行为                                                                                 |
| ------------- | ------------------------------------------------------------------------------------ |
| `"auto"`      | （默认）探测两种传输；流式模式会验证容器 WebSocket 接收                        |
| `"native"`    | 强制使用原生 signal-cli（`/api/v1/rpc` 上的 JSON-RPC，`/api/v1/events` 上的 SSE） |
| `"container"` | 强制使用 bbernhard 容器（`/v2/send` 上的 REST，`/v1/receive/{account}` 上的 WebSocket） |

当 `apiMode` 为 `"auto"` 时，OpenClaw 会按每个守护进程 URL 缓存已检测到的模式 30 秒，以避免重复探测（当两种传输都可用时，native 优先）。容器接收仅在 `/v1/receive/{account}` 升级为 WebSocket 后才会被流式模式选中，这需要 `MODE=json-rpc`。

只要容器暴露了相应的匹配 API，容器模式就支持与原生模式相同的 Signal 操作：发送、接收、附件、正在输入指示、已读/已查看回执、反应、群组以及富文本。OpenClaw 会将原生 Signal RPC 调用转换为容器的 REST 负载，包括 `group.{base64(internal_id)}` 群组 ID 以及用于格式化文本的 `text_mode: "styled"`。

运行说明：

- 在容器模式下使用 `autoStart: false`；当选择 `apiMode: "container"` 时，OpenClaw 不应启动原生守护进程。
- 接收消息时使用 `MODE=json-rpc`。`MODE=normal` 可能会让 `/v1/about` 看起来正常，但 `/v1/receive/{account}` 不会升级为 WebSocket，因此 OpenClaw 在 `auto` 模式下不会选择容器接收流。
- 当 `httpUrl` 指向 bbernhard REST API 时，设置 `apiMode: "container"`；当它指向原生 `signal-cli` JSON-RPC/SSE 时，设置 `"native"`；当部署可能变化时，设置 `"auto"`。
- 容器附件下载遵循与原生模式相同的媒体字节限制。如果服务器发送了 `Content-Length`，则在完整缓冲前会拒绝超出大小的响应；否则会在流式传输过程中拒绝。

## 访问控制（私信 + 群组）

私信：

- 默认：`channels.signal.dmPolicy = "pairing"`。
- 未知发送者会获得一个配对码；在获得批准之前，消息会被忽略（配对码 1 小时后过期）。
- 通过 `openclaw pairing list signal` 和 `openclaw pairing approve signal <CODE>` 进行批准。
- 配对是 Signal 私信的默认令牌交换方式。详情： [配对](/channels/pairing)
- 仅 UUID 的发送者（来自 `sourceUuid`）会以 `uuid:<id>` 的形式存储在 `channels.signal.allowFrom` 中。

群组：

- `channels.signal.groupPolicy = open | allowlist | disabled`.
- `channels.signal.groupAllowFrom` 控制在设置为 `allowlist` 时哪些群组或发送者可以触发群组回复；条目可以是 Signal 群组 ID（原始形式、`group:<id>` 或 `signal:group:<id>`）、发送者手机号、`uuid:<id>` 值或 `*`。
- `channels.signal.groups["<group-id>" | "*"]` 可以通过 `requireMention`、`tools` 和 `toolsBySender` 覆盖群组行为。
- 在多账号设置中，使用 `channels.signal.accounts.<id>.groups` 进行按账号覆盖。
- 通过 `groupAllowFrom` 将某个 Signal 群组加入允许列表，并不会自动禁用提及门控。一个专门配置的 `channels.signal.groups["<group-id>"]` 条目会处理每条群消息，除非设置了 `requireMention=true`。
- 当 `requireMention=true` 时，会根据结构化提及元数据将 Signal 原生 @mentions 与机器人账号手机号或 `accountUuid` 进行匹配。配置的 `mentionPatterns` 仍然是纯文本回退方案。
- 运行时说明：如果 `channels.signal` 完全缺失，运行时会在群组检查中回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy`）。

带有受限上下文的提及门控群组：

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

未提及机器人的允许群消息会保持静默，并且只会保留在有限的待处理历史窗口中。当后续的原生 @mention 或回退文本提及触发机器人时，OpenClaw 会包含那段最近的上下文，并回复到同一个群组。被跳过的附件正文不会被下载；它们可能只会以紧凑的媒体占位符形式出现在待处理上下文中。

## 工作原理（行为）

- 原生模式：`signal-cli` 作为守护进程运行；网关通过 SSE 读取事件。
- 容器模式：网关通过 REST API 发送，并通过 WebSocket 接收。
- 入站消息会被规范化为共享的频道信封。
- 回复始终路由回同一个号码或群组。
- 对入站消息的回复会在后端接受入站时间戳和作者时包含原生 Signal 引用元数据；如果引用元数据缺失或被拒绝，OpenClaw 会将回复作为普通消息发送。
- 使用 `channels.signal.replyToMode = off | first | all | batched` 配置原生引用使用，或使用 `channels.signal.replyToModeByChatType.direct/group` 进行按聊天类型覆盖。`channels.signal.accounts.<id>` 下的账号级别值优先。

## 媒体 + 限制

- 外发文本会按 `channels.signal.textChunkLimit` 分块（默认 4000）。
- 可选换行分块：将 `channels.signal.streaming.chunkMode` 设置为 `"newline"`，以便先按空行（段落边界）拆分，再按长度分块。
- 支持附件（通过 `signal-cli` 以 base64 获取）。
- 当 `contentType` 缺失时，语音备忘录附件会使用 `signal-cli` 的文件名作为 MIME 回退值，因此音频转录仍可对 AAC 语音备忘录进行分类。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 可跳过媒体下载。
- 群组历史上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），若未设置则回退到 `messages.groupChat.historyLimit`。设为 `0` 可禁用（默认 50）。

## 显示正在输入 + 已读回执

- **输入中指示**：OpenClaw 通过 `signal-cli sendTyping` 发送正在输入信号，并在回复生成期间持续刷新。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为 true 时，OpenClaw 会转发允许的私信的已读回执。
- `signal-cli` 不会为群组公开已读回执。

## 生命周期状态反应

设置 `messages.statusReactions.enabled: true` 以让 Signal 在传入消息轮次中显示共享的 queued/thinking/tool/compaction/done/error 反应生命周期。Signal 使用传入消息的时间戳作为反应目标；群组反应会使用 Signal 群组 ID 加上原始发送者作为目标作者发送。

状态反应还需要一个 ack 反应以及匹配的 `messages.ackReactionScope`（`direct`、`group-all`、`group-mentions` 或 `all`）。设置 `channels.signal.reactionLevel: "off"` 可禁用 Signal 状态反应。

`messages.removeAckAfterReply: true` 会在配置的保持时间后清除最终状态反应。否则，Signal 会在最终的 done/error 状态后恢复初始的 ack 反应。

## Reactions（消息工具）

使用 `channel=signal` 的 `message action=react`。

- Targets: sender E.164 或 UUID（使用 pairing 输出中的 `uuid:<id>`；直接使用裸 UUID 也可以）。
- `messageId` 是你要进行反应的消息的 Signal 时间戳。
- 群组反应需要 `targetAuthor` 或 `targetAuthorUuid`。

```text
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置：

- `channels.signal.actions.reactions`: 启用/禁用 reaction actions（默认 true）。
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`（默认 `minimal`）。
  - `off`/`ack` 禁用 agent reactions（message tool `react` 会报错）。
  - `minimal`/`extensive` 启用 agent reactions 并设置指导级别。
- 按账户覆盖：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 批准反应

Signal exec 和 plugin 批准提示使用顶层的 `approvals.exec` 和 `approvals.plugin` 路由块。Signal 没有 `channels.signal.execApprovals` 块。

- `👍` 批准一次。
- `👎` 拒绝。
- 当请求提供持久批准时，使用 `/approve <id> allow-always`。

批准反应的解析需要来自 `channels.signal.allowFrom`、`channels.signal.defaultTo` 或匹配的账户级字段的显式 Signal 批准者。直接的同聊 exec 批准提示即使没有显式批准者，也仍然可以抑制重复的本地 `/approve` 回退；没有批准者的群组批准会保留本地回退可见。

## 传递目标（CLI/cron）

- 私信：`signal:+15551234567`（或直接使用 E.164）。
- UUID 私信：`uuid:<id>`（或裸 UUID）。
- 群组：`signal:group:<groupId>`。
- 用户名：`username:<name>`（如果你的 Signal 账户支持）。

## 别名

为可重复使用的 Signal 目标配置稳定名称。别名仅用于 OpenClaw 侧配置；它们不会创建或编辑 Signal 联系人。

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
openclaw message send --channel signal --target signal:ops --message "部署已完成"
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

## 故障排查

先运行这组检查：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

如果需要，再确认私信配对状态：

```bash
openclaw pairing list signal
```

常见故障：

- 守护进程可达但没有回复：验证账户/守护进程设置（`httpUrl`、`account`）和接收模式。
- 私信被忽略：发送者正在等待配对批准。
- 群组消息被忽略：群组发送者/提及门控阻止了投递。
- 编辑后出现配置校验错误：运行 `openclaw doctor --fix`。
- 诊断中缺少 Signal：确认 `channels.signal.enabled: true`。

其他检查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

排查流程请参见：[Channels Troubleshooting](/channels/troubleshooting)。

## 安全说明

- `signal-cli` 会将账户密钥存储在本地（通常位于 `~/.local/share/signal-cli/data/`）。
- 在服务器迁移或重建之前，请先备份 Signal 账户状态。
- 保持 `channels.signal.dmPolicy: "pairing"`，除非你明确希望更广泛的 DM 访问。
- SMS 验证仅在注册或恢复流程中需要，但如果失去对号码/账户的控制，可能会使重新注册变得复杂。

## 配置参考（Signal）

完整配置：[配置](/gateway/configuration)

提供程序选项：

- `channels.signal.enabled`: 启用/禁用通道启动。
- `channels.signal.apiMode`: `auto | native | container`（默认：auto）。请参见 [容器模式](#container-mode-bbernhardsignal-cli-rest-api)。
- `channels.signal.account`: 机器人账号的 E.164。
- `channels.signal.accountUuid`: 可选的机器人账号 UUID，用于原生 @ 提及检测和循环保护。
- `channels.signal.cliPath`: `signal-cli` 的路径。
- `channels.signal.configPath`: 可选的 `signal-cli --config` 目录。
- `channels.signal.httpUrl`: 完整的守护进程 URL（覆盖 host/port）。
- `channels.signal.httpHost`, `channels.signal.httpPort`: 守护进程绑定地址（默认 `127.0.0.1:8080`）。
- `channels.signal.autoStart`: 自动启动守护进程（如果未设置 `httpUrl`，默认 true）。
- `channels.signal.startupTimeoutMs`: 启动等待超时时间，单位为 ms（最小 1000，最大 120000；默认 30000）。
- `channels.signal.receiveMode`: `on-start | manual`。
- `channels.signal.ignoreAttachments`: 跳过附件下载。
- `channels.signal.ignoreStories`: 忽略来自守护进程的动态。
- `channels.signal.sendReadReceipts`: 转发已读回执。
- `channels.signal.dmPolicy`: `pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.signal.allowFrom`: DM 白名单（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 没有用户名；请使用电话/UUID ID。
- `channels.signal.aliases`: OpenClaw 侧用于 DM 或群组投递目标的别名。
- `channels.signal.groupPolicy`: `open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`: 群组白名单；接受 Signal 群组 ID（原始格式、`group:<id>` 或 `signal:group:<id>`）、发送者 E.164 号码，或 `uuid:<id>` 值。
- `channels.signal.groups`: 按 Signal 群组 ID（或 `"*"`）键控的每个群组覆盖项。支持字段：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`: 多账号设置中，`channels.signal.groups` 的按账号版本。
- `channels.signal.accounts.<id>.aliases`: 按账号别名，与顶层 aliases 合并。
- `channels.signal.replyToMode`: 原生回复引用模式，`off | first | all | batched`（默认：`all`）。
- `channels.signal.replyToModeByChatType.direct`, `channels.signal.replyToModeByChatType.group`: 按聊天类型的原生回复引用覆盖项。
- `channels.signal.accounts.<id>.replyToMode`, `channels.signal.accounts.<id>.replyToModeByChatType.direct`, `channels.signal.accounts.<id>.replyToModeByChatType.group`: 按账号的回复引用覆盖项。
- `channels.signal.historyLimit`: 作为上下文包含的最大群消息数（0 表示禁用）。
- `channels.signal.dmHistoryLimit`: DM 历史记录限制，以用户轮次计。按用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`: 出站分块字符数（默认 4000）。
- `channels.signal.streaming.chunkMode`: `length`（默认）或 `newline`，在按长度分块之前按空行（段落边界）拆分。
- `channels.signal.mediaMaxMb`: 入站/出站媒体上限，单位 MB（默认 8）。
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`（默认 `minimal`）。参见 [反应](#reactions-message-tool)。
- `channels.signal.reactionNotifications`: `off | own | all | allowlist`（默认 `own`）- 当代理收到他人发来的反应时进行通知。
- `channels.signal.reactionAllowlist`: 当 `reactionNotifications: "allowlist"` 时，其反应会通知代理的发送者。
- `channels.signal.streaming.block.enabled`, `channels.signal.streaming.block.coalesce`: 跨通道共享的块模式流式控制。参见 [流式传输](/concepts/streaming)。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（纯文本回退；当配置了机器人账号身份时，Signal 原生 @ 提及会从结构化元数据中检测到）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `messages.responsePrefix`。

## 相关内容

- [频道概览](/channels) - 所有支持的频道
- [配对](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [频道路由](/channels/channel-routing) - 消息的会话路由
- [安全性](/gateway/security) - 访问模型和加固
