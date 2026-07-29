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
    向导会检测 `signal-cli` 是否在 `PATH` 中；如果缺失，它会提供安装方式：在 Linux x86-64 上下载官方原生 GraalVM 构建版本，或在 macOS 和其他架构上通过 Homebrew 安装。随后会提示输入机器人号码和 `signal-cli` 路径。

    对于非交互式设置，`openclaw channels add --channel signal` 也接受 `--signal-number <e164>` 作为机器人电话号码，以及 `--http-host <host>` 和 `--http-port <port>` 作为 Signal 守护进程端点（默认 `127.0.0.1:8080`）。

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

| 字段        | 描述                                          |
| ----------- | --------------------------------------------- |
| `account`   | 机器人电话号码，采用 E.164 格式（`+15551234567`） |
| `transport` | 账号拥有的 Signal 连接与进程模式             |
| `dmPolicy`  | 私信访问策略（推荐 `pairing`）                |
| `allowFrom` | 允许发送私信的电话号码或 `uuid:<id>` 值      |

多账号支持：使用带有每个账号配置和可选 `name` 的 `channels.signal.accounts`。每个命名账号都拥有自己的 `transport`；它不会继承顶层的 transport。顶层 transport 仅属于隐式的 `default` 账号。有关共享模式，请参见 [多账号通道](/gateway/config-channels#multi-account-all-channels)。

## 它是什么

- 确定性路由：回复始终返回 Signal。
- 私信共享代理的主会话；群组彼此隔离（`agent:<agentId>:signal:group:<groupId>`）。
- 默认情况下，Signal 可能会写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。可通过将 `channels.signal.configWrites` 设置为 `false` 来禁用。

## 设置路径 A：链接现有的 Signal 账户（二维码）

1. 安装 `signal-cli`（JVM 或 native build 版本），或者让 `openclaw channels add` 为你安装它。
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

## 外部原生守护进程模式

要自行管理 `signal-cli`（JVM 冷启动慢、容器初始化、共享 CPU 等场景），请将守护进程单独运行，并让 OpenClaw 指向它：

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

## 容器模式（bbernhard/signal-cli-rest-api）

不要原生运行 `signal-cli`，而是使用 [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) Docker 容器，它通过 REST + WebSocket 接口对 `signal-cli` 进行封装。

```bash
openclaw channels add --channel signal --signal-number +15551234567 \
  --http-url http://signal-cli:8080 --signal-transport container
```

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
      transport: {
        kind: "container",
        url: "http://signal-cli:8080",
      },
    },
  },
}
```

`transport.kind` 控制 OpenClaw 使用的协议和进程生命周期：

| 值                  | 行为                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"managed-native"`  | 启动原生 signal-cli，并在 `/api/v1/rpc` 使用 JSON-RPC、在 `/api/v1/events` 使用 SSE；`url` 可选择与守护进程绑定地址不同的连接端点 |
| `"external-native"` | 连接到已经在运行的原生 signal-cli 守护进程                                                                                                               |
| `"container"`       | 连接 bbernhard REST 的 `/v2/send` 和 WebSocket 的 `/v1/receive/{account}`                                                                             |

`setup` 和 `openclaw doctor --fix` 可能会探测一次现有端点以识别其具体类型。运行时操作不会自动检测或切换协议。

只要容器暴露了相应的匹配 API，容器模式就支持与原生模式相同的 Signal 操作：发送、接收、附件、正在输入指示、已读/已查看回执、反应、群组以及富文本。OpenClaw 会将原生 Signal RPC 调用转换为容器的 REST 负载，包括 `group.{base64(internal_id)}` 群组 ID 以及用于格式化文本的 `text_mode: "styled"`。

运行说明：

- 使用 `MODE=json-rpc` 以接收消息。`MODE=normal` 可能会让 `/v1/about` 看起来正常，但 `/v1/receive/{account}` 不会进行 WebSocket 升级，因此容器接收流会在探测时失败。
- 对 bbernhard REST API 使用 `kind: "container"`，对原生 `signal-cli` JSON-RPC/SSE 使用 `kind: "external-native"`。
- 容器附件下载在媒体字节限制方面与原生模式保持一致。如果服务器发送了 `Content-Length`，则在完全缓冲之前会拒绝超出大小的响应；否则在流式传输过程中拒绝。

## 访问控制（DM + 群组）

直接消息：

- 默认：`channels.signal.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；在批准之前，消息会被忽略（配对码 1 小时后过期）。
- 通过 `openclaw pairing list signal` 和 `openclaw pairing approve signal <CODE>` 进行批准。
- 配对是 Signal 直接消息的默认令牌交换方式。详情：[配对](/channels/pairing)
- 仅 UUID 的发送者（来自 `sourceUuid`）会以 `uuid:<id>` 的形式存储在 `channels.signal.allowFrom` 中。

群组：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- 当设置为 `allowlist` 时，`channels.signal.groupAllowFrom` 控制哪些群组或发送者可以触发群组回复；条目可以是 Signal 群组 ID（原始形式、`group:<id>` 或 `signal:group:<id>`）、发送者电话号码、`uuid:<id>` 值，或 `*`。
- `channels.signal.groups["<group-id>" | "*"]` 可通过 `requireMention`、`tools` 和 `toolsBySender` 覆盖群组行为。
- 在多账户设置中，使用 `channels.signal.accounts.<id>.groups` 进行按账户覆盖。
- 通过 `groupAllowFrom` 将 Signal 群组添加到允许列表，并不会自动禁用提及门控。专门配置的 `channels.signal.groups["<group-id>"]` 条目将处理该群组的每条消息，除非设置了 `requireMention=true`。
- 当 `requireMention=true` 时，Signal 原生 @提及会通过结构化提及元数据，匹配机器人账户电话号码或 `accountUuid`。已配置的 `mentionPatterns` 仍作为纯文本回退方案。
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

已允许的、未提及机器人的群组消息将保持静默，并仅保留在有限的待处理历史窗口中。当后续的原生 @提及或回退文本提及触发机器人时，OpenClaw 将包含这些最近上下文并回复到同一群组。被跳过的附件正文不会被下载；它们可能只会作为紧凑的媒体占位符出现在待处理上下文中。

## 工作原理（行为）

- 原生模式：`signal-cli` 作为守护进程运行；网关通过 SSE 读取事件。
- 容器模式：网关通过 REST API 发送，并通过 WebSocket 接收。
- 入站消息会被规范化为共享的频道信封。
- 回复始终路由回同一个号码或群组。
- 对入站消息的回复会在后端接受入站时间戳和作者时包含原生 Signal 引用元数据；如果引用元数据缺失或被拒绝，OpenClaw 会将回复作为普通消息发送。
- 使用 `channels.signal.replyToMode = off | first | all | batched` 配置原生引用使用，或使用 `channels.signal.replyToModeByChatType.direct/group` 进行按聊天类型覆盖。`channels.signal.accounts.<id>` 下的账号级别值优先。

## 媒体 + 限制

- 出站文本会按 `channels.signal.textChunkLimit` 分块（默认 4000）。
- 可选的换行分块：将 `channels.signal.streaming.chunkMode="newline"` 设置为按空行（段落边界）拆分，然后再进行长度分块。
- 支持附件（从 `signal-cli` 获取 base64）。
- 当语音备忘录附件缺少 `contentType` 时，会使用 `signal-cli` 的文件名作为 MIME 回退值，因此语音转写仍然可以对 AAC 语音备忘录进行分类。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 可跳过为任何传输下载媒体。
- 群组历史上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），并回退到 `messages.groupChat.historyLimit`。设为 `0` 可禁用（默认 50）。

## 显示正在输入 + 已读回执

- **输入中指示**：OpenClaw 通过 `signal-cli sendTyping` 发送正在输入信号，并在回复生成期间持续刷新。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为 true 时，OpenClaw 会转发允许的私信的已读回执。
- `signal-cli` 不会为群组公开已读回执。

## 生命周期状态反应

设置 `messages.statusReactions.enabled: true` 以让 Signal 在传入消息轮次中显示共享的 queued/thinking/tool/compaction/done/error 反应生命周期。Signal 使用传入消息的时间戳作为反应目标；群组反应会使用 Signal 群组 ID 加上原始发送者作为目标作者发送。

状态反应还需要一个 ack 反应以及匹配的 `messages.ackReactionScope`（`direct`、`group-all`、`group-mentions` 或 `all`）。设置 `channels.signal.reactionLevel: "off"` 可禁用 Signal 状态反应。

Signal 在最终的 done/error 状态后会恢复初始的 ack 反应。

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

Signal 执行和插件批准提示使用顶层的 `approvals.exec` 和 `approvals.plugin` 路由块。Signal 没有 `channels.signal.execApprovals` 块。

- `👍` 批准一次。
- `👎` 拒绝。
- 当请求持久批准时，使用 `/approve <id> allow-always`。

批准反应解析需要来自 `channels.signal.allowFrom`、`channels.signal.defaultTo` 或匹配账户级字段的明确 Signal 批准者。直接的同聊天执行批准提示即使没有明确的批准者，也仍然可以抑制重复的本地 `/approve` 回退；没有批准者的群组批准将保持本地回退可见。

## 问题反应

对于一个包含一个非机密、单选问题以及一到四个选项的 `ask_user` 提示，Signal 会在选项标签旁显示 `1️⃣` 到 `4️⃣`。使用对应的数字对已发送的提示作出反应即可回答。OpenClaw 会验证该反应是否针对机器人生成的消息，然后通过 Gateway 将该数字映射为规范选项。过期或重复的点击会被忽略。多问题、多选项以及自由文本提示仍然只能通过文本回复；正常的 Signal DM/群组准入规则会授权发送者。

## 投递目标（CLI/cron）

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

- Daemon 可达但没有回复：请检查 `account`、`transport.kind`、传输 URL，以及接收模式。
- 私信被忽略：发送方处于待配对审批状态。
- 群消息被忽略：群发送方/提及门控阻止了投递。
- 编辑后出现配置校验错误：运行 `openclaw doctor --fix`。
- 诊断中缺少 Signal：确认 `channels.signal.enabled: true`。

其他检查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
openclaw logs --plain --limit 500 | grep -i "signal" | tail -20
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

- `channels.signal.enabled`: 启用/禁用频道启动。
- `channels.signal.account`: 机器人账户的 E.164。
- `channels.signal.accountUuid`: 可选的机器人账户 UUID，用于原生 @mention 检测和循环保护。
- `channels.signal.transport`: 账户自有传输。对于托管原生默认值可省略。
- `channels.signal.transport.kind`: `managed-native | external-native | container`。
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
- `channels.signal.allowFrom`: DM 允许列表（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 没有用户名；请使用电话/UUID ID。
- `channels.signal.aliases`: OpenClaw 侧用于 DM 或群组投递目标的别名。
- `channels.signal.groupPolicy`: `open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`: 群组允许列表；接受 Signal 群组 ID（原始形式、`group:<id>` 或 `signal:group:<id>`）、发送者 E.164 号码或 `uuid:<id>` 值。
- `channels.signal.groups`: 以 Signal 群组 ID（或 `"*"`）为键的每个群组覆盖项。支持字段：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`: `channels.signal.groups` 的按账户版本，用于多账户设置。
- `channels.signal.accounts.<id>.aliases`: 按账户别名，与顶层别名合并。
- `channels.signal.replyToMode`: 原生回复引用模式，`off | first | all | batched`（默认：`all`）。
- `channels.signal.replyToModeByChatType.direct`, `channels.signal.replyToModeByChatType.group`: 按聊天类型的原生回复引用覆盖项。
- `channels.signal.accounts.<id>.replyToMode`, `channels.signal.accounts.<id>.replyToModeByChatType.direct`, `channels.signal.accounts.<id>.replyToModeByChatType.group`: 按账户回复引用覆盖项。
- `channels.signal.historyLimit`: 作为上下文包含的群组消息最大数量（0 表示禁用）。
- `channels.signal.dmHistoryLimit`: 用户轮次中的 DM 历史限制。按用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`: 出站分块大小，单位字符（默认 4000）。
- `channels.signal.streaming.chunkMode`: `length`（默认）或 `newline`，用于在按长度分块之前按空行（段落边界）拆分。
- `channels.signal.mediaMaxMb`: 入站/出站媒体上限，单位 MB（默认 8）。
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`（默认 `minimal`）。请参见[反应](#reactions-message-tool)。
- `channels.signal.reactionNotifications`: `off | own | all | allowlist`（默认 `own`）- 当代理收到来自他人的入站反应时的通知方式。
- `channels.signal.reactionAllowlist`: 当 `reactionNotifications: "allowlist"` 时，会通知代理的反应发送者。
- `channels.signal.streaming.block.enabled`, `channels.signal.streaming.block.coalesce`: 跨频道共享的块模式流式控制。请参见[流式传输](/concepts/streaming)。

相关全局选项：

- `agents.entries.*.groupChat.mentionPatterns`（纯文本回退；当配置了机器人账户身份时，Signal 原生 @mentions 会从结构化元数据中检测）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `channels.signal.responsePrefix` 或账户级别的 `responsePrefix`。

## 相关内容

- [频道概览](/channels) - 所有支持的频道
- [配对](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [频道路由](/channels/channel-routing) - 消息的会话路由
- [安全性](/gateway/security) - 访问模型和加固
