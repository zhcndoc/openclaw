---
summary: "通过 signal-cli（JSON-RPC + SSE）支持 Signal，设置路径和号码模型"
read_when:
  - 设置 Signal 支持时
  - 调试 Signal 发送/接收时
title: "Signal"
---

# Signal（signal-cli）

状态：外部 CLI 集成。网关通过 HTTP JSON-RPC + SSE 与 `signal-cli` 通信。

## 前提条件

- 服务器上已安装 OpenClaw（以下 Linux 流程在 Ubuntu 24 上测试通过）。
- 网关运行的主机上有可用的 `signal-cli`。
- 一个能接收一次验证短信的电话号码（用于短信注册路径）。
- 注册时能访问浏览器进行 Signal 验证码操作（`signalcaptchas.org`）。

## 快速设置（初学者）

1. **为机器人使用单独的 Signal 号码**（推荐）。
2. 安装 `signal-cli`（如果使用 JVM 版本需安装 Java）。
3. 选择一种设置路径：
   - **路径 A（二维码链接）：** `signal-cli link -n "OpenClaw"`，用 Signal 扫描。
   - **路径 B（短信注册）：** 通过验证码 + 短信验证注册专用号码。
4. 配置 OpenClaw 并重启网关。
5. 发送第一条私信并批准配对（`openclaw pairing approve signal <CODE>`）。

最小配置示例：

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

字段说明：

| 字段       | 说明                                               |
| ----------- | ------------------------------------------------- |
| `account`   | 机器人电话号码，E.164 格式（如 `+15551234567`）   |
| `cliPath`   | `signal-cli` 路径（若在 `PATH` 中，直接写 `signal-cli`）  |
| `dmPolicy`  | 私信访问策略（推荐使用 `pairing`）                  |
| `allowFrom` | 允许发送私信的电话号码或 `uuid:<id>` 值列表         |

## 基本介绍

- 通过 `signal-cli` 实现 Signal 通道（非内嵌 libsignal）。
- 确定性路由：回复总是返回 Signal。
- 私信共享代理主会话；群组消息隔离（`agent:<agentId>:signal:group:<groupId>`）。

## 配置写入权限

默认情况下，Signal 允许通过 `/config set|unset` 触发的配置更新（需要启用 `commands.config: true`）。

可通过以下配置禁用：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 号码模型（重要）

- 网关连接一个 **Signal 设备**（即 `signal-cli` 帐号）。
- 如果你在自己的个人 Signal 账户上运行机器人，它会忽略你自己的消息（防止死循环）。
- “我给机器人发消息，它回复我”场景请使用 **单独的机器人号码**。

## 设置路径 A：链接现有 Signal 账户（二维码）

1. 安装 `signal-cli`（JVM 或原生版本）。
2. 链接机器人账户：
   - 执行 `signal-cli link -n "OpenClaw"`，然后用 Signal 扫描二维码。
3. 配置 Signal 并启动网关。

示例配置：

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

多账户支持：使用 `channels.signal.accounts` 进行每账户配置，并可选择设置 `name`。共享模式请参考 [`gateway/configuration`](/gateway/configuration-reference#multi-account-all-channels)。

## 设置路径 B：注册专用机器人号码（短信，Linux）

当你想使用专用机器人号码而非链接已有 Signal 应用账户时，请使用本路径。

1. 获取一手机号可接收短信（或座机可接听语音验证码）。
   - 使用专用机器人号码，以避免账户/会话冲突。
2. 在网关宿主机安装 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果使用 JVM 版本（`signal-cli-${VERSION}.tar.gz`），请先安装 JRE 25 以上。
保持 `signal-cli` 更新；上游说明旧版本可能因 Signal 服务器 API 变化而失效。

3. 注册并验证号码：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要验证码：

1. 打开 `https://signalcaptchas.org/registration/generate.html`。
2. 完成验证码，复制 “打开 Signal” 所给的 `signalcaptcha://...` 链接目标。
3. 尽量在与浏览器登录同一外网 IP 下运行。
4. 立刻重新执行注册（验证码令牌过期快）：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 配置 OpenClaw，重启网关，检查通道状态：

```bash
# 如果以用户 systemd 服务运行网关：
systemctl --user restart openclaw-gateway

# 然后确认状态：
openclaw doctor
openclaw channels status --probe
```

5. 配对你的私信发送者：
   - 向机器人号码发送任意消息。
   - 在服务器端批准配对码：`openclaw pairing approve signal <PAIRING_CODE>`。
   - 在手机上保存机器人号码为联系人，避免显示为“未知联系人”。

重要提示：使用 `signal-cli` 注册电话号码账户可能会让该号码的主 Signal 应用会话失效。建议优选专用机器人号码，或若需保留手机应用，请使用二维码链路模式。

上游参考：

- `signal-cli` README: `https://github.com/AsamK/signal-cli`
- 验证码流程: `https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 设备链接流程: `https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守护进程模式（httpUrl）

若想自行管理 `signal-cli`（启动 JVM 慢，容器初始化，或共享 CPU），可单独运行守护进程，并让 OpenClaw 指向它：

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

这会跳过 OpenClaw 内部的自动启动和启动等待。对于自动启动启动缓慢的情况，可设置 `channels.signal.startupTimeoutMs`。

## 访问控制（私信 + 群组）

私信：

- 默认：`channels.signal.dmPolicy = "pairing"`。
- 未知发信人会收到配对码，消息会被忽略直到批准（配对码有效期 1 小时）。
- 批准命令：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配对是 Signal 私信的默认令牌交换方式。详见：[配对](/channels/pairing)
- 使用 UUID 的私信发信人（来自 `sourceUuid`）以 `uuid:<id>` 格式存储于 `channels.signal.allowFrom`。

群组：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- `channels.signal.groupAllowFrom` 控制在 `allowlist` 模式下谁可以在群组中触发。
- `channels.signal.groups["<group-id>" | "*"]` 可针对群组覆盖行为，包括 `requireMention`、`tools` 和 `toolsBySender`。
- 多账户配置中可用 `channels.signal.accounts.<id>.groups` 进行每账户覆盖。
- 运行时注：如果完全缺少 `channels.signal`，运行时对群组检查会回退到 `groupPolicy="allowlist"`（即便设置了 `channels.defaults.groupPolicy`）。

## 工作原理（行为）

- `signal-cli` 作为守护进程运行；网关通过 SSE 读取事件。
- 收到的消息会规范成共享通道信封格式。
- 回复总是路由回同一个号码或群组。

## 媒体及限制

- 出站文本会拆分为 `channels.signal.textChunkLimit` 限制的块（默认 4000 字符）。
- 可选换行拆分：设置 `channels.signal.chunkMode="newline"`，先按空行（段落边界）拆分，再按长度拆分。
- 支持附件（从 `signal-cli` 以 base64 拉取）。
- 默认媒体大小上限由 `channels.signal.mediaMaxMb` 控制（默认 8 MB）。
- 使用 `channels.signal.ignoreAttachments` 跳过附件下载。
- 群组历史上下文使用 `channels.signal.historyLimit`（或每账户的 `channels.signal.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设置为 0 关闭（默认 50）。

## 输入状态与已读回执

- **输入指示器**：OpenClaw 利用 `signal-cli sendTyping` 发送输入信号，并在回复执行期间持续刷新。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为真时，代理会转发允许的私信已读回执。
- Signal-cli 不暴露群组消息的已读回执。

## 表情反应（消息工具）

- 使用 `message action=react` 发送 Signal 表情反应。
- 目标可用发送者 E.164 号码或 UUID（使用配对输出中的 `uuid:<id>`；裸 UUID 也可以)。
- `messageId` 是被反应消息的 Signal 时间戳。
- 群组反应需要指定 `targetAuthor` 或 `targetAuthorUuid`。

示例：

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置参数：

- `channels.signal.actions.reactions`: 启用/禁用反应操作（默认启用）。
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`。
  - `off`/`ack` 禁用代理反应（消息工具 `react` 将报错）。
  - `minimal`/`extensive` 启用代理反应并设定指导级别。
- 账户级覆盖：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 发送目标（CLI/定时任务）

- 私信：`signal:+15551234567`（或纯 E.164）。
- UUID 私信：`uuid:<id>`（或裸 UUID）。
- 群组：`signal:group:<groupId>`。
- 用户名：`username:<name>`（如果 Signal 账户支持）。

## 故障排查

先依次运行：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

必要时确认私信配对状态：

```bash
openclaw pairing list signal
```

常见失败原因：

- 守护进程可访问但无回复：确认账户/守护进程设置（`httpUrl`、`account`）及接收模式。
- 私信被忽略：发信者待配对批准。
- 群组消息被忽略：群组发信者/提及权限限制。
- 编辑后配置验证错误：运行 `openclaw doctor --fix`。
- 诊断中缺少 Signal：确认 `channels.signal.enabled: true`。

额外检查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

排查流程见：[/channels/troubleshooting](/channels/troubleshooting)。

## 安全提示

- `signal-cli` 本地存储账户密钥（通常在 `~/.local/share/signal-cli/data/`）。
- 迁移服务器或重建前备份 Signal 账户状态。
- 除非明确需要更广泛的私信访问，否则保持 `channels.signal.dmPolicy: "pairing"`。
- 短信验证仅注册或恢复时需要，号码/账户失控可能导致重新注册复杂。

## 配置参考（Signal）

完整配置见：[配置指南](/gateway/configuration)

提供方选项：

- `channels.signal.enabled`: 启用/禁用通道启动。
- `channels.signal.account`: 机器人账户的 E.164 号码。
- `channels.signal.cliPath`: `signal-cli` 路径。
- `channels.signal.httpUrl`: 全守护进程 URL（覆盖 host/port）。
- `channels.signal.httpHost`, `channels.signal.httpPort`: 守护进程绑定（默认 127.0.0.1:8080）。
- `channels.signal.autoStart`: 自动启动守护进程（未设置 `httpUrl` 时默认 true）。
- `channels.signal.startupTimeoutMs`: 启动等待超时（毫秒，最大 120000）。
- `channels.signal.receiveMode`: `on-start | manual`。
- `channels.signal.ignoreAttachments`: 跳过附件下载。
- `channels.signal.ignoreStories`: 忽略守护进程的 stories。
- `channels.signal.sendReadReceipts`: 转发已读回执。
- `channels.signal.dmPolicy`: `pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.signal.allowFrom`: 私信允许列表（E.164 或 `uuid:<id>`）。`open` 需用 `"*"`。Signal 无用户名；使用电话或 UUID ID。
- `channels.signal.groupPolicy`: `open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`: 群组发信者允许列表。
- `channels.signal.groups`: 针对 Signal 群组 ID（或 `"*"`）的覆盖，支持字段：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`: 多账户配置中每个账户的群组覆盖版本。
- `channels.signal.historyLimit`: 包含为上下文的最大群组消息数（0 关闭）。
- `channels.signal.dmHistoryLimit`: 私信历史上下文限制（用户轮数）。用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`: 出站拆分大小（字符数）。
- `channels.signal.chunkMode`: `length`（默认）或 `newline`，先按空行（段落边界）拆分再按长度拆分。
- `channels.signal.mediaMaxMb`: 媒体大小上限（MB，入站和出站）。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（Signal 不支持内建提及）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `messages.responsePrefix`。
