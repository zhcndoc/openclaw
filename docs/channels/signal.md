---
summary: "通过 signal-cli 的 Signal 支持（JSON-RPC + SSE）、设置路径和号码模型"
read_when:
  - 设置 Signal 支持
  - 排查 Signal 发送/接收问题
title: "Signal"
---

状态：外部 CLI 集成。网关通过 HTTP JSON-RPC + SSE 与 `signal-cli` 通信。

## 前置条件

- 服务器上已安装 OpenClaw（下面的 Linux 流程已在 Ubuntu 24 上测试）。
- 网关运行所在主机可用 `signal-cli`。
- 一个可以接收一条验证码短信的手机号码（用于短信注册路径）。
- 注册期间可通过浏览器访问 Signal 验证码页面（`signalcaptchas.org`）。

## 快速设置（入门）

1. 为机器人使用一个**单独的 Signal 号码**（推荐）。
2. 安装 `signal-cli`（如果使用 JVM 构建版本，则需要 Java）。
3. 选择一种设置路径：
   - **路径 A（QR 连接）：**`signal-cli link -n "OpenClaw"`，然后用 Signal 扫描。
   - **路径 B（短信注册）：**使用验证码 + 短信验证注册一个专用号码。
4. 配置 OpenClaw 并重启网关。
5. 发送第一条私信并批准配对（`openclaw pairing approve signal <CODE>`）。

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

字段参考：

| 字段         | 描述                                              |
| ------------ | ------------------------------------------------- |
| `account`    | 机器人电话号码，E.164 格式（`+15551234567`）      |
| `cliPath`    | `signal-cli` 的路径（如果在 `PATH` 中则为 `signal-cli`） |
| `dmPolicy`   | 私信访问策略（推荐 `pairing`）                    |
| `allowFrom`  | 允许私信的电话号码或 `uuid:<id>` 值              |

## 它是什么

- 通过 `signal-cli` 提供的 Signal 通道（不是内嵌 libsignal）。
- 确定性路由：回复始终回到 Signal。
- 私信共享代理的主会话；群组彼此隔离（`agent:<agentId>:signal:group:<groupId>`）。

## 配置写入

默认情况下，Signal 允许通过 `/config set|unset` 触发的配置更新写入（需要 `commands.config: true`）。

可通过以下方式禁用：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 号码模型（重要）

- 网关连接到一个 **Signal 设备**（即 `signal-cli` 账户）。
- 如果你在 **个人 Signal 账户** 上运行机器人，它会忽略你自己的消息（防止循环）。
- 如果想实现“我给机器人发消息，它回复我”，请使用一个**独立的机器人号码**。

## 设置路径 A：链接已有 Signal 账户（QR）

1. 安装 `signal-cli`（JVM 或原生构建版本）。
2. 绑定一个机器人账户：
   - `signal-cli link -n "OpenClaw"`，然后在 Signal 中扫描二维码。
3. 配置 Signal 并启动网关。

示例：

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

多账户支持：使用 `channels.signal.accounts`，为每个账户单独配置，并可选 `name`。共享模式请参见 [`gateway/configuration`](/gateway/config-channels#multi-account-all-channels)。

## 设置路径 B：注册专用机器人号码（短信，Linux）

当你想要一个专用机器人号码，而不是链接现有的 Signal 应用账户时，请使用此路径。

1. 获取一个可以接收短信的号码（座机可用语音验证）。
   - 使用专用机器人号码，避免账户/会话冲突。
2. 在网关主机上安装 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果你使用 JVM 构建版本（`signal-cli-${VERSION}.tar.gz`），请先安装 JRE 25+。
保持 `signal-cli` 更新；上游说明旧版本可能会因 Signal 服务器 API 变更而失效。

3. 注册并验证该号码：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要验证码：

1. 打开 `https://signalcaptchas.org/registration/generate.html`。
2. 完成验证码，复制 “Open Signal” 中的 `signalcaptcha://...` 链接目标。
3. 尽可能从与浏览器会话相同的外部 IP 运行。
4. 立即再次执行注册（验证码令牌很快过期）：

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

5. 将你的私信发送者完成配对：
   - 向机器人号码发送任意消息。
   - 在服务器上批准代码：`openclaw pairing approve signal <PAIRING_CODE>`。
   - 将机器人号码保存为手机联系人，以避免显示“未知联系人”。

<Warning>
使用 `signal-cli` 注册电话号码账户可能会使该号码在主 Signal 应用中的会话失去认证。优先使用专用机器人号码；如果你需要保留现有手机应用配置，请使用 QR 链接模式。
</Warning>

上游参考：

- `signal-cli` README：`https://github.com/AsamK/signal-cli`
- 验证码流程：`https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 绑定流程：`https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守护进程模式（httpUrl）

如果你希望自己管理 `signal-cli`（JVM 冷启动慢、容器初始化，或共享 CPU），可以单独运行守护进程，并让 OpenClaw 指向它：

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

这样会跳过自动拉起以及 OpenClaw 内部的启动等待。对于自动拉起时启动较慢的情况，可设置 `channels.signal.startupTimeoutMs`。

## 访问控制（私信 + 群组）

私信：

- 默认值：`channels.signal.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；在批准之前消息会被忽略（配对码 1 小时后过期）。
- 可通过以下方式批准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 对于 Signal 私信，配对是默认的令牌交换方式。详情： [Pairing](/channels/pairing)
- 仅 UUID 的发送者（来自 `sourceUuid`）会作为 `uuid:<id>` 存储在 `channels.signal.allowFrom` 中。

群组：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- 当设置为 `allowlist` 时，`channels.signal.groupAllowFrom` 控制哪些人可以在群组中触发。
- `channels.signal.groups["<group-id>" | "*"]` 可以通过 `requireMention`、`tools` 和 `toolsBySender` 覆盖群组行为。
- 在多账户设置中，使用 `channels.signal.accounts.<id>.groups` 进行每个账户的覆盖。
- 运行时说明：如果 `channels.signal` 完全缺失，运行时在群组检查中会回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy`）。

## 工作原理（行为）

- `signal-cli` 作为守护进程运行；网关通过 SSE 读取事件。
- 入站消息会被规范化为共享通道封装。
- 回复始终路由回同一个号码或群组。

## 媒体 + 限制

- 出站文本会按 `channels.signal.textChunkLimit` 分块（默认 4000）。
- 可选的换行分块：设置 `channels.signal.chunkMode="newline"`，会先按空行（段落边界）再按长度分块。
- 支持附件（从 `signal-cli` 以 base64 获取）。
- 语音备忘录附件在缺少 `contentType` 时，会使用 `signal-cli` 文件名作为 MIME 回退值，因此音频转写仍可识别 AAC 语音备忘录。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 可跳过媒体下载。
- 群组历史上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），并回退到 `messages.groupChat.historyLimit`。设为 `0` 可禁用（默认 50）。

## 输入中显示 + 已读回执

- **输入中指示**：OpenClaw 通过 `signal-cli sendTyping` 发送输入中信号，并在回复运行期间持续刷新。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为 true 时，OpenClaw 会转发允许的私信已读回执。
- Signal-cli 不为群组暴露已读回执。

## 反应（消息工具）

- 使用 `message action=react` 并设置 `channel=signal`。
- 目标：发送者的 E.164 或 UUID（使用配对输出中的 `uuid:<id>`；裸 UUID 也可以）。
- `messageId` 是你要回应的那条消息的 Signal 时间戳。
- 群组反应需要 `targetAuthor` 或 `targetAuthorUuid`。

示例：

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置：

- `channels.signal.actions.reactions`：启用/禁用反应动作（默认 true）。
- `channels.signal.reactionLevel`：`off | ack | minimal | extensive`。
  - `off`/`ack` 会禁用代理反应（消息工具 `react` 会报错）。
  - `minimal`/`extensive` 会启用代理反应并设置指导级别。
- 每账户覆盖：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 投递目标（CLI/cron）

- 私信：`signal:+15551234567`（或直接使用 E.164）。
- UUID 私信：`uuid:<id>`（或裸 UUID）。
- 群组：`signal:group:<groupId>`。
- 用户名：`username:<name>`（如果你的 Signal 账户支持）。

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

排查流程请见：[/channels/troubleshooting](/channels/troubleshooting)。

## 安全说明

- `signal-cli` 会将账户密钥存储在本地（通常位于 `~/.local/share/signal-cli/data/`）。
- 在服务器迁移或重建之前，请先备份 Signal 账户状态。
- 保持 `channels.signal.dmPolicy: "pairing"`，除非你明确希望更广泛的 DM 访问。
- SMS 验证仅在注册或恢复流程中需要，但如果失去对号码/账户的控制，可能会使重新注册变得复杂。

## 配置参考（Signal）

完整配置：[Configuration](/gateway/configuration)

提供程序选项：

- `channels.signal.enabled`：启用/禁用频道启动。
- `channels.signal.account`：机器人账户的 E.164 格式。
- `channels.signal.cliPath`：`signal-cli` 的路径。
- `channels.signal.httpUrl`：完整的守护进程 URL（会覆盖主机/端口）。
- `channels.signal.httpHost`、`channels.signal.httpPort`：守护进程绑定地址（默认 127.0.0.1:8080）。
- `channels.signal.autoStart`：自动启动守护进程（当 `httpUrl` 未设置时默认 true）。
- `channels.signal.startupTimeoutMs`：启动等待超时时间，单位 ms（上限 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳过附件下载。
- `channels.signal.ignoreStories`：忽略来自守护进程的动态。
- `channels.signal.sendReadReceipts`：转发已读回执。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.signal.allowFrom`：DM 允许列表（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 不支持用户名；请使用手机号/UUID 标识。
- `channels.signal.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`：群组发送者允许列表。
- `channels.signal.groups`：按 Signal 群组 ID（或 `"*"`）键控的每个群组覆盖配置。支持字段：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`：多账户设置中 `channels.signal.groups` 的按账户版本。
- `channels.signal.historyLimit`：作为上下文包含的群消息最大数量（0 表示禁用）。
- `channels.signal.dmHistoryLimit`：DM 历史记录限制，按用户回合计。每用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：出站分块大小（字符数）。
- `channels.signal.chunkMode`：`length`（默认）或 `newline`，在按长度分块前先按空行（段落边界）拆分。
- `channels.signal.mediaMaxMb`：入站/出站媒体上限（MB）。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（Signal 不支持原生提及）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `messages.responsePrefix`。

## 相关内容

- [Channels Overview](/channels) — 所有受支持的频道
- [Pairing](/channels/pairing) — DM 身份验证和配对流程
- [Groups](/channels/groups) — 群聊行为和提及门控
- [Channel Routing](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和加固
