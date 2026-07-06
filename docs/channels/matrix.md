---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - 在 OpenClaw 中设置 Matrix
  - 配置 Matrix E2EE 和验证
title: "Matrix"
---

Matrix 是一个可下载的频道插件（`@openclaw/matrix`），基于官方的 `matrix-js-sdk` 构建。它支持私信、房间、线程、媒体、反应、投票、位置和 E2EE。

## 安装

```bash
openclaw plugins install @openclaw/matrix
```

裸插件规格会先尝试 ClawHub，然后回退到 npm。你也可以用 `openclaw plugins install clawhub:@openclaw/matrix` 或 `npm:@openclaw/matrix` 强制指定来源。若来自本地检出目录：`openclaw plugins install ./path/to/local/matrix-plugin`。

`plugins install` 会注册并启用该插件；不需要单独执行 `enable` 步骤。该通道在下面配置之前仍不会执行任何操作。有关通用安装规则，请参阅 [插件](/tools/plugin)。

## 设置

1. 在你的 homeserver 上创建一个 Matrix 账户。
2. 使用 `homeserver` + `accessToken`，或者 `homeserver` + `userId` + `password` 配置 `channels.matrix`。
3. 重启网关。
4. 与机器人发起私信，或将其邀请到某个房间。只有在 [`autoJoin`](#auto-join) 允许时，新邀请才会被加入。

### 交互式设置

```bash
openclaw channels add
openclaw configure --section channels
```

该向导会询问 homeserver URL、认证方式（token 或 password）、user ID（仅限密码认证）、可选的设备名称、是否启用 E2EE，以及房间访问/自动加入设置。如果匹配的 `MATRIX_*` 环境变量已经存在且该账户没有保存的认证信息，向导会提供一个使用环境变量的快捷方式。使用 `openclaw channels resolve --channel matrix "Project Room"` 在保存 allowlist 之前解析房间名称。启用向导中的 E2EE 会执行与 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的初始化流程。

### 最小配置

基于令牌：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      dm: { policy: "pairing" },
    },
  },
}
```

基于密码（首次登录后会缓存 token）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      userId: "@bot:example.org",
      password: "replace-me", // pragma: allowlist secret
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

### 自动加入

`channels.matrix.autoJoin` 的默认值是 `"off"`：在你手动加入之前，机器人不会出现在新房间或通过新邀请创建的私信中。OpenClaw 无法在收到邀请时判断它是 DM 还是群组，因此所有邀请都会先经过 `autoJoin`；`dm.policy` 只会在机器人已经加入且房间被分类之后才生效。

<Warning>
将 `autoJoin: "allowlist"` 与 `autoJoinAllowlist` 结合使用可限制接受的邀请，或者使用 `autoJoin: "always"` 接受所有邀请。

`autoJoinAllowlist` 只接受 `!roomId:server`、`#alias:server` 或 `*`。普通房间名会被拒绝；别名是向 homeserver 解析，而不是依据被邀请房间声称的状态。
</Warning>

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": { requireMention: true },
      },
    },
  },
}
```

### Allowlist 目标格式

- DM（`dm.allowFrom`、`groupAllowFrom`、`groups.<room>.users`）：使用 `@user:server`。默认会忽略显示名称（可变）；只有在需要明确兼容显示名称时才设置 `dangerouslyAllowNameMatching: true`。
- 房间 allowlist 键（`groups`、旧别名 `rooms`）：使用 `!room:server` 或 `#alias:server`。除非设置了 `dangerouslyAllowNameMatching: true`，否则普通名称会被忽略。
- 邀请 allowlist（`autoJoinAllowlist`）：使用 `!room:server`、`#alias:server` 或 `*`。普通名称始终会被拒绝。

### 账户 ID 规范化

向导会将友好名称转换为规范化的账户 ID（`Ops Bot` -> `ops-bot`）。在作用域环境变量名中，标点符号会被进行十六进制转义，因此账户不会冲突：`-`（0x2D）会变为 `_X2D_`，所以 `ops-prod` 会映射到环境前缀 `MATRIX_OPS_X2D_PROD_`。

### 缓存的凭据

Matrix 会将凭据缓存到 `~/.openclaw/credentials/matrix/` 下：默认账户使用 `credentials.json`，命名账户使用 `credentials-<account>.json`。当缓存的凭据存在时，即使配置文件中没有 `accessToken`，OpenClaw 也会将 Matrix 视为已配置——这适用于设置流程、`openclaw doctor` 以及渠道状态探测。

### 环境变量

基于配置键的环境变量：当对应的配置键未设置时会使用它们。默认账户使用不带前缀的名称；命名账户会在后缀前插入账户令牌（见[规范化](#account-id-normalization)）。

| 默认账户             | 命名账户（`<ID>` = 账户令牌）        |
| -------------------- | ----------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`            |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`          |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`               |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`              |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`             |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`           |

对于账户 `ops`，名称会变为 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN` 等。`MATRIX_HOMESERVER`（以及任何 `*_HOMESERVER` 作用域变体）不能从 workspace `.env` 中设置；见[Workspace `.env` files](/gateway/security)。

<Note>
恢复密钥不是基于配置键的环境变量：OpenClaw 本身不会从环境中读取它。CLI 指引文本建议将其通过名为 `MATRIX_RECOVERY_KEY` 的 shell 变量传递给默认账户，或者对命名账户使用 `MATRIX_RECOVERY_KEY_<ID>`（仅大写账户 ID，不进行十六进制转义）——见[使用恢复密钥验证此设备](#verify-this-device-with-a-recovery-key)。
</Note>

## 配置示例

一个实用的基线配置，包含 DM 配对、房间允许列表和 E2EE：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,

      dm: {
        policy: "pairing",
        sessionScope: "per-room",
        threadReplies: "off",
      },

      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },

      autoJoin: "allowlist",
      autoJoinAllowlist: ["!roomid:example.org"],
      threadReplies: "inbound",
      replyToMode: "off",
      streaming: "partial",
    },
  },
}
```

## 流式预览

Matrix 回复流式传输是可选开启的。`streaming` 控制 OpenClaw 如何传递进行中的助手回复；`blockStreaming` 控制每个已完成的块是否作为独立的 Matrix 消息保留。

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

如果要保留实时答案预览，但隐藏中间的工具/进度行，请使用对象形式：

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "partial",
        preview: {
          toolProgress: false,
        },
      },
    },
  },
}
```

完整对象形式接受 `{ mode, preview, progress }`：

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto", // 从已配置或内置标签中选择（false 表示隐藏）
          labels: ["Thinking", "Writing", "Searching"], // 当 label 为 "auto" 时的候选标签
          maxLines: 8, // 保留的最大滚动进度行数（默认：8）
          maxLineChars: 120, // 每行在截断前的最大字符数（默认：120）
          toolProgress: true, // 显示工具/进度活动（默认：true）
        },
      },
    },
  },
}
```

- `progress.label`：自定义标签，`"auto"`/未设置时从已配置或内置标签中选择，或设为 `false` 以隐藏。
- `progress.labels`：仅当 `label` 为 `"auto"` 或未设置时使用的候选项。
- `progress.maxLines`：草稿中保留的最大滚动进度行数；更早的行会被裁剪。
- `progress.maxLineChars`：每条紧凑进度行在截断前的最大字符数。
- `progress.toolProgress`：当为 `true`（默认）时，实时工具/进度活动会显示在草稿中。

| `streaming`       | 行为                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"off"`（默认） | 等待完整回复后一次性发送。`true` = `"partial"`，`false` = `"off"`。                                                                         |
| `"partial"`       | 模型写入当前块时，原地编辑一条普通文本消息。原生客户端可能会在第一次预览时通知，而不是在最终编辑时通知。          |
| `"quiet"`         | 与 `"partial"` 相同，但消息是不通知的提示。收件人会在每用户推送规则匹配最终编辑时收到通知（见下文）。 |
| `"progress"`      | 使用进度草稿发送单独的紧凑进度行。                                                                                          |

`blockStreaming`（默认 `false`）与 `streaming` 相互独立：

| `streaming`             | `blockStreaming: true`                                              | `blockStreaming: false`（默认）                    |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `"partial"` / `"quiet"` | 当前块的实时草稿，已完成的块作为消息保留 | 当前块的实时草稿，就地最终化 |
| `"off"`                 | 每个已完成块发送一条会通知的 Matrix 消息                     | 整个回复发送一条会通知的 Matrix 消息      |

注意：

- 如果预览内容增长超过 Matrix 的单事件大小限制，OpenClaw 会停止预览流式传输并回退为仅最终发送。
- 媒体回复始终会正常发送附件；如果旧预览无法安全复用，OpenClaw 会在发送最终媒体回复前将其撤回。
- 在启用预览流式传输时，工具进度预览更新默认开启。将 `streaming.preview.toolProgress: false` 设置为在答案文本上保留预览编辑，但让工具进度走正常传递路径。
- 预览编辑会额外消耗 Matrix API 调用。若想要最保守的速率限制配置，请保持 `streaming: "off"`。

## 语音消息

传入的 Matrix 语音消息会在房间提及门控之前进行转写，因此，在 `requireMention: true` 的房间中，一条提到机器人名称的语音消息可以触发代理，而代理接收到的是转写文本，而不是仅仅一个音频附件占位符。

Matrix 使用位于 `tools.media.audio` 下的共享音频媒体提供商，例如 OpenAI `gpt-4o-mini-transcribe`。有关提供商设置和限制，请参见[媒体工具概览](/tools/media-overview)。

- `m.audio` 事件和带有 `audio/*` MIME 类型的 `m.file` 事件都符合条件。
- 在加密房间中，OpenClaw 会在转写之前通过现有的 Matrix 媒体路径解密附件。
- 转写文本会在代理提示中被标记为机器生成且不可信。
- 该附件会被标记为已转写，因此下游媒体工具不会再次对其进行转写。
- 将 `tools.media.audio.enabled: false` 设为禁用全局音频转写。

## 审批元数据

Matrix 原生审批提示是普通的 `m.room.message` 事件，其下的 OpenClaw 专用内容位于 `com.openclaw.approval` 键中。原生客户端仍会渲染文本正文；支持 OpenClaw 的客户端可以读取结构化的审批 id、类型、状态、决策，以及执行/插件详情。

当提示内容对于单个 Matrix 事件来说过长时，OpenClaw 会将可见文本分块，并且只将 `com.openclaw.approval` 附加到第一块。允许/拒绝反应会绑定到该第一条事件，因此长提示会保持与单事件提示相同的审批目标。

### 用于静默最终化预览的自托管推送规则

`streaming: "quiet"` 只有在一个块或回合最终确定后才通知接收者——每个用户的推送规则必须匹配已最终化的预览标记。完整方案请参见 [Matrix push rules for quiet previews](/channels/matrix-push-rules)。

## 机器人到机器人房间

默认情况下，来自其他已配置的 OpenClaw Matrix 账号的 Matrix 消息会被忽略。使用 `allowBots` 来有意允许代理间流量：

```json5
{
  channels: {
    matrix: {
      allowBots: "mentions", // true | "mentions"
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

- `allowBots: true` 会在允许的房间和 DM 中接受来自其他已配置 Matrix 机器人账号的消息。
- `allowBots: "mentions"` 仅在这些消息在房间中明显提及了该机器人时才接受；DM 仍然始终允许。
- `groups.<room>.allowBots` 会覆盖单个房间的账号级设置。
- 被接受的已配置机器人消息会使用共享的 [bot loop protection](/channels/bot-loop-protection)。先配置 `channels.defaults.botLoopProtection`，然后通过 `channels.matrix.botLoopProtection` 按账号覆盖，或通过 `channels.matrix.groups.<room>.botLoopProtection` 按房间覆盖。
- OpenClaw 仍会忽略来自同一个 Matrix 用户 ID 的消息，以避免自我回复循环。
- Matrix 没有原生的机器人标志；OpenClaw 将“由机器人发送”视为“由此 OpenClaw 网关上的另一个已配置 Matrix 账号发送”。

在共享房间中启用 bot-to-bot 流量时，请使用严格的房间允许列表和提及要求。

## 加密与验证

在加密（E2EE）房间中，外发图片事件使用 `thumbnail_file`，因此图片预览会与完整附件一起加密；未加密房间则使用普通的 `thumbnail_url`。无需任何配置——插件会自动检测 E2EE 状态。

所有 `openclaw matrix` 命令都支持 `--verbose`（完整诊断信息）、`--json`（机器可读输出）以及 `--account <id>`（多账户场景）。默认输出较为简洁。

### 启用加密

```bash
openclaw matrix encryption setup
```

初始化 secret 存储和交叉签名，必要时创建房间密钥备份，然后打印状态和后续步骤。实用标志：

- `--recovery-key <key>` 在引导前应用恢复密钥（优先使用下面的 stdin 形式）
- `--force-reset-cross-signing` 丢弃当前交叉签名身份并创建新的身份（仅限有意使用）

对于新账户，请在创建时启用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的别名。手动配置等价写法：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

### 状态与信任信号

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

`verify status` 会报告三个独立的信任信号（`--verbose` 会显示全部）：

- `Locally trusted`：仅被此客户端信任
- `Cross-signing verified`：SDK 报告已通过交叉签名验证
- `Signed by owner`：由你自己的自签名密钥签名（仅用于诊断）

只有当 `Cross-signing verified` 为 `yes` 时，`Verified by owner` 才会是 `yes`；仅有本地信任或所有者签名都不够。

`--allow-degraded-local-state` 会在不先准备 Matrix 账户的情况下返回尽力而为的诊断信息；适用于离线或部分配置的探测。

### 使用恢复密钥验证此设备

通过 stdin 传递恢复密钥，而不是在命令行中直接传入：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

该命令会报告三种状态：

- `Recovery key accepted`：Matrix 已接受该密钥用于 secret 存储或设备信任。
- `Backup usable`：可使用受信任的恢复材料加载房间密钥备份。
- `Device verified by owner`：此设备拥有完整的 Matrix 交叉签名身份信任。

即使恢复密钥已解锁备份材料，只要完整身份信任不完整，它仍会以非零状态退出。在这种情况下，请在另一个 Matrix 客户端中完成自我验证：

```bash
openclaw matrix verify self
```

`verify self` 会等待 `Cross-signing verified: yes` 后才成功退出。可使用 `--timeout-ms <ms>` 调整等待时间。

字面量密钥形式 `openclaw matrix verify device "<recovery-key>"` 也可以使用，但密钥会进入 shell 历史记录。

### 初始化或修复交叉签名

```bash
openclaw matrix verify bootstrap
```

这是加密账户的修复/初始化命令。按顺序会执行：

- 初始化 secret 存储，尽可能复用现有恢复密钥
- 初始化交叉签名并上传缺失的公钥
- 标记并对当前设备进行交叉签名
- 如果服务器端尚不存在房间密钥备份，则创建一个

如果 homeserver 在上传交叉签名密钥时要求 UIA，OpenClaw 会先尝试免认证，然后是 `m.login.dummy`，最后是 `m.login.password`（需要 `channels.matrix.password`）。

实用标志：

- `--recovery-key-stdin`（配合 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | ...`）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 丢弃当前交叉签名身份（仅限有意使用；需要已存储或通过 `--recovery-key-stdin` 提供当前恢复密钥）

### 房间密钥备份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 会显示是否存在服务器端备份，以及此设备是否可以解密它。`backup restore` 会将备份的房间密钥导入本地 crypto 存储；如果恢复密钥已在磁盘上，则可省略 `--recovery-key-stdin`。

若要用新的基线替换损坏的备份（接受丢失无法恢复的旧历史；如果当前备份 secret 无法加载，也可以重新创建 secret 存储）：

```bash
openclaw matrix verify backup reset --yes
```

仅当希望旧恢复密钥有意停止解锁新的备份基线时，才添加 `--rotate-recovery-key`。

### 列出、请求和响应验证

```bash
openclaw matrix verify list
```

列出所选账户的待处理验证请求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

发送来自此账户的验证请求。`--own-user` 请求自我验证（在同一用户的另一个 Matrix 客户端中接受提示）；`--user-id`/`--device-id`/`--room-id` 用于指定其他目标。`--own-user` 不能与其他目标标志同时使用。

对于更低层级的生命周期处理——通常是在从另一个客户端影子跟踪传入请求时——这些命令会作用于某个特定请求 `<id>`（由 `verify list` 和 `verify request` 打印）：

| 命令                                    | 目的                                                                |
| --------------------------------------- | ------------------------------------------------------------------- |
| `openclaw matrix verify accept <id>`       | 接受传入请求                                                        |
| `openclaw matrix verify start <id>`        | 开始 SAS 流程                                                       |
| `openclaw matrix verify sas <id>`          | 打印 SAS 表情符号或数字                                               |
| `openclaw matrix verify confirm-sas <id>`  | 确认 SAS 与另一个客户端显示的内容一致                                  |
| `openclaw matrix verify mismatch-sas <id>` | 当表情符号或数字不一致时拒绝 SAS                                      |
| `openclaw matrix verify cancel <id>`       | 取消；可选接受 `--reason <text>` 和 `--code <matrix-code>` |

当验证锚定到某个特定的直消息房间时，`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 都接受 `--user-id` 和 `--room-id` 作为 DM 后续提示。

### 多账户说明

如果没有 `--account <id>`，Matrix CLI 命令会使用隐式默认账户。对于多个命名账户且未设置 `channels.matrix.defaultAccount` 的情况，命令不会自行猜测，而是要求你选择。对于已命名账户，如果 E2EE 被禁用或不可用，错误信息会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="启动行为">
    当 `encryption: true` 时，`startupVerification` 默认值为 `"if-unverified"`。启动时，未验证设备会在另一个 Matrix 客户端中请求自我验证，跳过重复项并应用冷却期（默认 24 小时）。可通过 `startupVerificationCooldownHours` 调整，或使用 `startupVerification: "off"` 禁用。

    启动还会执行一次保守的 crypto 引导流程，复用当前 secret 存储和交叉签名身份。如果引导状态损坏，即使没有 `channels.matrix.password`，OpenClaw 也会尝试受保护的修复；如果 homeserver 要求密码 UIA，启动会记录警告但不会致命退出。已由所有者签名的设备会被保留。

    完整升级流程请参见 [Matrix 迁移](/channels/matrix-migration)。

  </Accordion>

  <Accordion title="验证通知">
    Matrix 会将验证生命周期通知以 `m.notice` 消息发布到严格的 DM 验证房间中：请求、就绪（带有“通过表情符号验证”的提示）、开始/完成，以及可用时的 SAS（表情符号/数字）详情。

    来自另一个 Matrix 客户端的传入请求会被跟踪并自动接受。对于自我验证，OpenClaw 会自动开始 SAS 流程，并在表情符号验证可用后自动确认自己这一侧——你仍然需要在你的 Matrix 客户端中比较并确认“两者一致”。

    验证系统通知不会转发到代理聊天管道。

  </Accordion>

  <Accordion title="已删除或无效的 Matrix 设备">
    如果 `verify status` 表示当前设备已不再列在 homeserver 上，请创建一个新的 OpenClaw Matrix 设备。对于密码登录：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    对于令牌认证，请在你的 Matrix 客户端或管理界面中创建一个新的访问令牌，然后更新 OpenClaw：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    将 `assistant` 替换为失败命令中的账户 ID，或者在默认账户情况下省略 `--account`。

  </Accordion>

  <Accordion title="设备卫生管理">
    旧的由 OpenClaw 管理的设备可能会不断累积。可列出并清理：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="Crypto 存储">
    Matrix E2EE 使用官方 `matrix-js-sdk` 的 Rust crypto 路径，并以 `fake-indexeddb` 作为 IndexedDB shim。Crypto 状态会持久化到 `crypto-idb-snapshot.json`（文件权限较严格）。

    加密运行时状态存储在 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下，包含同步存储、crypto 存储、恢复密钥、IDB 快照、线程绑定和启动验证状态。当令牌变化但账户身份保持不变时，OpenClaw 会复用最合适的现有根目录，以便之前的状态仍然可见。

    单个较旧的 token-hash 根目录可能是正常的令牌轮换连续性路径。如果 OpenClaw 记录了 `matrix: multiple populated token-hash storage roots detected`，请检查账户目录，并且只在确认所选的活动根目录健康后，再将过时的同级根目录归档。优先将过时根目录移入 `_archive/` 目录，而不是立即删除。

  </Accordion>
</AccordionGroup>

## 个人资料管理

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

在一次调用中传入这两个选项。Matrix 可直接接受 `mxc://` 头像 URL；传入 `http://`/`https://` 时会先上传文件，并将解析后的 `mxc://` URL 存储到 `channels.matrix.avatarUrl`（或按账号覆盖项）中。

## 线程

Matrix 同时支持用于自动回复和消息工具发送的原生线程。有两个独立的开关控制其行为：

### 会话路由（`sessionScope`）

`dm.sessionScope` 决定 Matrix DM 房间如何映射到 OpenClaw 会话：

- `"per-user"`（默认）：具有相同路由对端的所有 DM 房间共享一个会话。
- `"per-room"`：每个 Matrix DM 房间都有自己的会话键，即使对端相同也是如此。

显式会话绑定始终优先于 `sessionScope`；已绑定的房间和线程会保留其选定的目标会话。

### 回复线程化（`threadReplies`）

`dm.threadReplies` 决定机器人把回复发到哪里：

- `"off"`：回复为顶层消息。传入的线程消息会停留在父会话中。
- `"inbound"`：仅当传入消息本身已经位于该线程中时，才在该线程内回复。
- `"always"`：在由触发消息为根的线程中回复；从第一次触发开始，该对话会通过匹配的线程作用域会话进行路由。

`dm.threadReplies` 仅对 DMs 覆盖此行为 - 例如，保持房间线程隔离，同时保持 DMs 为扁平结构。

### 线程继承与斜杠命令

- 传入的线程消息会将线程根消息作为额外的代理上下文包含进来。
- 当目标是同一房间（或同一 DM 用户目标）时，消息工具发送会自动继承当前的 Matrix 线程，除非显式提供了 `threadId`。
- 仅当当前会话元数据证明是在同一个 Matrix 账号上的同一个 DM 对端时，DM 用户目标复用才会生效；否则 OpenClaw 会回退到正常的按用户作用域路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及线程绑定的 `/acp spawn` 都可在 Matrix 房间和 DMs 中使用。
- 顶层 `/focus` 会创建一个新的 Matrix 线程，并在启用 `threadBindings.spawnSessions` 时将其绑定到目标会话。
- 在现有 Matrix 线程中运行 `/focus` 或 `/acp spawn --thread here` 会就地绑定该线程。

当 OpenClaw 检测到某个 Matrix DM 房间与同一共享会话上的另一个 DM 房间发生冲突时，它会发送一条一次性的 `m.notice`，指向 `/focus` 逃逸通道，并建议更改 `dm.sessionScope`。只有在启用线程绑定时才会显示该通知。

## ACP 会话绑定

Matrix 房间、DM 和现有 Matrix 线程可以在不改变聊天界面的情况下，成为持久化的 ACP 工作区。

快速操作流程：

- 在 Matrix DM、房间或现有线程中运行 `/acp spawn codex --bind here`，以继续使用。
- 在顶层 DM 或房间中，当前 DM/房间保持为聊天界面，未来消息会路由到新生成的 ACP 会话。
- 在现有线程中，`--bind here` 会就地绑定当前线程。
- `/new` 和 `/reset` 会就地重置同一个已绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

`--bind here` 不会创建子 Matrix 线程。`threadBindings.spawnSessions` 会限制 `/acp spawn --thread auto|here`，其中 OpenClaw 需要创建或绑定一个子线程。

### 线程绑定配置

Matrix 会继承来自 `session.threadBindings` 的全局默认值，并支持按通道覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`：同时限制子代理和 ACP 线程的创建。
- `threadBindings.spawnSubagentSessions` / `threadBindings.spawnAcpSessions`：更细粒度的覆盖，仅用于子代理或仅用于 ACP 的创建。
- `threadBindings.defaultSpawnContext`

Matrix 中线程绑定会话的创建默认开启。将 `threadBindings.spawnSessions: false` 设为关闭，可阻止顶层 `/focus` 和 `/acp spawn --thread auto|here` 创建/绑定 Matrix 线程。当原生子代理线程创建不应分叉父级转录内容时，将 `threadBindings.defaultSpawnContext: "isolated"`。

## 反应

Matrix 支持外发反应、入站反应通知和确认反应。

外发反应工具受 `channels.matrix.actions.reactions` 控制：

- `react` 向某个 Matrix 事件添加反应。
- `reactions` 列出某个 Matrix 事件当前的反应摘要。
- `emoji=""` 移除机器人在该事件上的自身反应。
- `remove: true` 仅移除机器人指定的表情反应。

**解析顺序**（先定义的值优先）：

| 设置                    | 顺序                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `ackReaction`           | per-account -> channel -> `messages.ackReaction` -> agent identity emoji fallback     |
| `ackReactionScope`      | per-account -> channel -> `messages.ackReactionScope` -> default `"group-mentions"` |
| `reactionNotifications` | per-account -> channel -> default `"own"`                                           |

`reactionNotifications: "own"` 会在反应指向机器人发出的 Matrix 消息时，转发新增的 `m.reaction` 事件；`"off"` 会禁用反应系统事件。反应移除不会被合成为系统事件——Matrix 会将其表现为 redactions，而不是作为独立的 `m.reaction` 移除事件。

## 历史上下文

- `channels.matrix.historyLimit` 控制当房间消息触发代理时，最近多少条房间消息会作为 `InboundHistory` 包含进去。若未设置，则回退到 `messages.groupChat.historyLimit`；如果两者都未设置，最终默认值为 `0`（禁用）。
- Matrix 房间历史仅限房间内使用；DM 仍然使用普通会话历史。
- 房间历史仅针对待处理消息：OpenClaw 会缓冲尚未触发回复的房间消息，然后在出现提及或其他触发时对该窗口进行快照。
- 当前触发消息不包含在 `InboundHistory` 中；它会保留在该轮的主入站正文里。
- 同一个 Matrix 事件的重试会复用最初的历史快照，而不会随着新的房间消息继续向前漂移。

## 上下文可见性

Matrix 支持共享的 `contextVisibility` 控制，用于附加的房间上下文，例如获取到的回复文本、线程根消息和待处理历史。

- `contextVisibility: "all"` 为默认值。附加上下文会按接收时的样子保留。
- `contextVisibility: "allowlist"` 会将附加上下文过滤为仅向当前房间/用户允许名单检查中被允许的发送者可见。
- `contextVisibility: "allowlist_quote"` 的行为类似 `allowlist`，但仍会保留一条明确引用的回复。

这仅影响补充上下文的可见性，而不影响传入消息本身是否可以触发回复。触发授权仍然来自 `groupPolicy`、`groups`、`groupAllowFrom` 和 DM 策略设置。

## DM 和房间策略

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
        threadReplies: "off",
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },
    },
  },
}
```

若要完全静音 DM，同时保持房间正常工作，请设置 `dm.enabled: false`：

```json5
{
  channels: {
    matrix: {
      dm: { enabled: false },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
    },
  },
}
```

有关提及门控和允许名单行为，请参阅 [Groups](/channels/groups)。

Matrix DM 的配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未获批准的 Matrix 用户在批准前持续发消息，OpenClaw 会复用相同的待处理配对代码，并且在较短的冷却时间后可能发送一条提醒回复，而不是生成新的代码。

有关共享 DM 配对流程和存储布局，请参阅 [Pairing](/channels/pairing)。

## 直接房间修复

如果直接消息状态发生漂移，OpenClaw 可能会最终保留指向旧单人房间而不是当前 DM 的过时 `m.direct` 映射。检查某个对端的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

这两个命令都接受 `--account <id>`，用于多账户配置。修复流程：

- 优先使用已在 `m.direct` 中映射的严格 1:1 DM
- 其次回退到当前已加入的、与该用户对应的任意严格 1:1 DM
- 如果不存在健康的 DM，则创建一个新的直接房间并重写 `m.direct`

它不会自动删除旧房间。它会选取健康的 DM 并更新映射，使未来的 Matrix 发送、验证通知和其他直接消息流程指向正确的房间。

## Exec 批准

Matrix 可以作为原生批准客户端使用。请在 `channels.matrix.execApprovals` 下配置（或者为每个账户在 `channels.matrix.accounts.<account>.execApprovals` 下覆盖）：

- `enabled`: 通过 Matrix 原生提示传递批准。未设置或设为 `"auto"` 时，一旦至少能解析出一个批准者就会自动启用；设为 `false` 可显式禁用。
- `approvers`: 允许批准 exec 请求的 Matrix 用户 ID（`@owner:example.org`）。回退到 `channels.matrix.dm.allowFrom`。
- `target`: 提示发送到哪里。`"dm"`（默认）发送到批准者的私信；`"channel"` 发送到发起的房间或私信；`"both"` 同时发送到两者。
- `agentFilter` / `sessionFilter`: 可选的允许列表，用于指定哪些 agent/session 触发 Matrix 投递。

不同批准类型的授权略有差异：

- **Exec 批准** 使用 `execApprovals.approvers`，回退到 `dm.allowFrom`。
- **插件批准** 仅通过 `dm.allowFrom` 授权。

两种类型都共享 Matrix 反应快捷方式和消息更新。批准者会在主批准消息上看到反应快捷方式：

- ✅ 仅允许一次
- ❌ 拒绝
- ♾️ 始终允许（当有效 exec 策略允许时）

备用斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析出的批准者才能批准或拒绝。用于 exec 批准的频道投递会包含命令文本 - 仅在受信任的房间中启用 `channel` 或 `both`。

相关：[Exec 批准](/tools/exec-approvals)。

## 斜杠命令

斜杠命令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）可直接在私信中使用。在房间中，OpenClaw 也会识别以前缀为机器人自身 Matrix 提及的命令，因此 `@bot:server /new` 会触发命令路径，而无需自定义提及正则表达式——这使机器人能够对房间风格的 `@mention /command` 消息保持响应；当用户在输入命令前通过 Tab 补全机器人时，Element 及类似客户端会发出这类消息。

授权规则仍然适用：命令发送者必须满足与普通消息相同的私信或房间白名单/所有者策略。

## 多账户

```json5
{
  channels: {
    matrix: {
      enabled: true,
      defaultAccount: "assistant",
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_xxx",
          encryption: true,
        },
        alerts: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_xxx",
          dm: {
            policy: "allowlist",
            allowFrom: ["@ops:example.org"],
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

**继承：**

- 顶层 `channels.matrix` 的值会作为命名账户的默认值，除非某个账户覆盖它们。
- 使用 `groups.<room>.account` 将继承的房间条目限定到特定账户。未设置 `account` 的条目在各账户之间共享；当默认账户配置在顶层时，`account: "default"` 仍然有效。

**默认账户选择：**

- 将 `defaultAccount` 设置为你希望隐式路由、探测和 CLI 命令优先使用的命名账户。
- 如果你有多个账户，并且其中一个确实名为 `default`，即使未设置 `defaultAccount`，OpenClaw 也会隐式使用它。
- 如果存在多个命名账户但未选择默认账户，CLI 命令将拒绝猜测——请设置 `defaultAccount` 或传入 `--account <id>`。
- 只有当顶层 `channels.matrix.*` 块的认证信息完整时（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`），它才会被视为隐式的 `default` 账户。只要缓存的凭据覆盖了认证，命名账户仍可通过 `homeserver` + `userId` 被发现。

**提升：**

- 当 OpenClaw 在修复或设置过程中将单账户配置提升为多账户配置时，如果已存在命名账户或 `defaultAccount` 已指向某个账户，它会保留现有的命名账户。只有 Matrix 认证/引导键会移动到提升后的账户；共享的投递策略键仍保留在顶层。

有关共享的多账户模式，请参见[配置参考](/gateway/config-channels#multi-account-all-channels)。

## 私有/LAN homeserver

默认情况下，OpenClaw 会为了防止 SSRF 攻击而阻止私有/内部 Matrix homeserver，除非你按账号单独启用。

如果你的 homeserver 运行在 localhost、LAN/Tailscale IP，或内部主机名上，请为该账号启用 `network.dangerouslyAllowPrivateNetwork`：

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      network: {
        dangerouslyAllowPrivateNetwork: true,
      },
      accessToken: "syt_internal_xxx",
    },
  },
}
```

CLI 设置示例：

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

此选项仅允许受信任的私有/内部目标。像 `http://matrix.example.org:8008` 这样的公开明文 homeserver 仍然会被阻止。尽可能优先使用 `https://`。

## 代理 Matrix 流量

如果你的 Matrix 部署需要显式的出站 HTTP(S) 代理，请设置 `channels.matrix.proxy`：

```json5
{
  channels: {
    matrix: {
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
    },
  },
}
```

命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖顶层默认值。OpenClaw 对运行时 Matrix 流量和账户状态探测使用相同的代理设置。

## 目标解析

Matrix 在 OpenClaw 需要房间或用户目标的任何地方都接受以下目标形式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房间 ID 区分大小写。配置显式投递目标、cron 作业、绑定或允许名单时，请使用来自 Matrix 的精确房间 ID 大小写。OpenClaw 会将内部会话键规范化以便存储，因此这些小写键并不是可靠的 Matrix 投递 ID 来源。

实时目录查询使用已登录的 Matrix 账户：

- 用户查找会查询该 homeserver 上的 Matrix 用户目录。
- 房间查找直接接受显式房间 ID 和别名。已加入房间的名称查找尽力而为，并且仅在设置了 `dangerouslyAllowNameMatching: true` 时适用于运行时房间允许名单。
- 如果房间名称无法解析为 ID 或别名，则会在运行时允许名单解析中忽略它。

## 配置参考

允许名单风格的用户字段（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`）接受完整的 Matrix 用户 ID（最安全）。非 ID 条目默认会被忽略。如果设置了 `dangerouslyAllowNameMatching: true`，则会在启动时以及监视器运行期间允许列表变更时解析 Matrix 目录中的精确显示名称匹配；无法解析的条目会在运行时被忽略。

房间允许名单键（`groups`、旧版 `rooms`）应为房间 ID 或别名。纯房间名键默认会被忽略；`dangerouslyAllowNameMatching: true` 可恢复对已加入房间名称的尽力而为查询。

### 账户与连接

- `enabled`：启用或禁用该通道。
- `name`：账户的可选显示标签。
- `defaultAccount`：当配置了多个 Matrix 账户时首选的账户 ID。
- `accounts`：按账户名覆盖的配置。顶层 `channels.matrix` 的值会作为默认值继承。
- `homeserver`：homeserver URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允许此账户连接到 `localhost`、LAN/Tailscale IP 或内部主机名。
- `proxy`：Matrix 流量可选的 HTTP(S) 代理 URL。支持按账户覆盖。
- `userId`：完整的 Matrix 用户 ID（`@bot:example.org`）。
- `accessToken`：基于 token 的认证所用访问令牌。环境/文件/exec 提供器支持明文和 SecretRef 值（[Secrets Management](/gateway/secrets)）。
- `password`：基于密码登录所用密码。支持明文和 SecretRef 值。
- `deviceId`：显式 Matrix 设备 ID。
- `deviceName`：密码登录时使用的设备显示名称。
- `avatarUrl`：用于配置同步和 `profile set` 更新的已存储自头像 URL。
- `initialSyncLimit`：启动同步期间获取的最大事件数。

### 加密

- `encryption`：启用 E2EE。默认值：`false`。
- `startupVerification`：`"if-unverified"`（启用 E2EE 时的默认值）或 `"off"`。当此设备未验证时，在启动时自动请求自验证。
- `startupVerificationCooldownHours`：下一次自动启动请求前的冷却时间。默认值：`24`。

### 访问与策略

- `groupPolicy`: `"open"`, `"allowlist"`, 或 `"disabled"`。默认值：`"allowlist"`。
- `groupAllowFrom`：房间流量的用户 ID 允许名单。
- `mentionPatterns`：用于房间提及的作用域正则表达式模式。对象格式为 `{ mode: "allow"|"deny", allowIn: [roomId, ...], denyIn: [roomId, ...] }`。控制已配置的 `agents.list[].groupChat.mentionPatterns` 是否按房间生效。
- `dm.enabled`：当为 `false` 时，忽略所有 DM。默认值：`true`。
- `dm.policy`：`"pairing"`（默认）、`"allowlist"`、`"open"` 或 `"disabled"`。在机器人已加入并将房间分类为 DM 之后生效；不影响邀请处理。
- `dm.allowFrom`：DM 流量的用户 ID 允许名单。
- `dm.sessionScope`：`"per-user"`（默认）或 `"per-room"`。
- `dm.threadReplies`：仅限 DM 的回复线程覆盖（`"off"`、`"inbound"`、`"always"`）。
- `allowBots`：接受来自其他已配置 Matrix 机器人账户的消息（`true` 或 `"mentions"`）。
- `allowlistOnly`：当为 `true` 时，强制所有启用中的 DM 策略（除 `"disabled"` 外）以及 `"open"` 组策略改为 `"allowlist"`。不会更改 `"disabled"` 策略。
- `dangerouslyAllowNameMatching`：当为 `true` 时，允许对用户允许名单条目进行 Matrix 显示名称目录查询，并对房间允许名单键进行已加入房间名称查询。优先使用完整的 `@user:server` ID 以及房间 ID 或别名。
- `autoJoin`：`"always"`、`"allowlist"` 或 `"off"`。默认值：`"off"`。适用于所有 Matrix 邀请，包括类似 DM 的邀请。
- `autoJoinAllowlist`：当 `autoJoin` 为 `"allowlist"` 时允许加入的房间/别名。别名条目按 homeserver 解析，而不是按被邀请房间声明的状态解析。
- `contextVisibility`：补充上下文可见性（默认 `"all"`，也可为 `"allowlist"`、`"allowlist_quote"`）。

### 回复行为

- `replyToMode`：`"off"`（默认）、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`：`"off"`（顶层默认值解析为 `"inbound"`，除非显式设置）、`"inbound"` 或 `"always"`。
- `threadBindings`：用于线程绑定会话路由和生命周期的按通道覆盖。
- `streaming`：`"off"`（默认）、`"partial"`、`"quiet"`、`"progress"`，或对象形式 `{ mode, preview: { toolProgress }, progress: { label, labels, maxLines, maxLineChars, toolProgress } }`。`true` `"partial"`，`false` `"off"`。
- `blockStreaming`：当为 `true` 时，已完成的助手块会作为单独的进度消息保留。默认值：`false`。
- `markdown`：用于外发文本的可选 Markdown 渲染配置。
- `responsePrefix`：添加到外发回复前的可选字符串。
- `textChunkLimit`：当 `chunkMode: "length"` 时，外发分块的字符数上限。默认值：`4000`。
- `chunkMode`：`"length"`（默认，按字符数拆分）或 `"newline"`（按行边界拆分）。
- `historyLimit`：当房间消息触发代理时，作为 `InboundHistory` 包含的最近房间消息数量。回退到 `messages.groupChat.historyLimit`；有效默认值为 `0`（禁用）。
- `mediaMaxMb`：外发发送和入站处理的媒体大小上限，单位 MB。默认值：`20`。

### 反应设置

- `ackReaction`：此通道/账户的确认反应覆盖。
- `ackReactionScope`：范围覆盖（默认 `"group-mentions"`，以及 `"group-all"`、`"direct"`、`"all"`、`"none"`、`"off"`）。
- `reactionNotifications`：入站反应通知模式（默认 `"own"`，或 `"off"`）。

### 工具与按房间覆盖

- `actions`：按动作的工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：按房间的策略映射。会话身份在解析后使用稳定的房间 ID。（`rooms` 是旧版别名。）
  - `groups.<room>.account`：将继承的单个房间条目限制到特定账户。
  - `groups.<room>.enabled`：按房间开关。为 `false` 时，该房间会被忽略，仿佛不在映射中。
  - `groups.<room>.requireMention`：按房间覆盖通道级提及要求。
  - `groups.<room>.allowBots`：按房间覆盖通道级设置（`true` 或 `"mentions"`）。
  - `groups.<room>.botLoopProtection`：按房间覆盖机器人间循环保护预算。
  - `groups.<room>.users`：按房间发送者允许名单。
  - `groups.<room>.tools`：按房间工具允许/拒绝覆盖。
  - `groups.<room>.autoReply`：按房间提及门控覆盖。`true` 会禁用该房间的提及要求；`false` 会强制重新启用。
  - `groups.<room>.skills`：按房间技能过滤器。
  - `groups.<room>.systemPrompt`：按房间系统提示片段。

### Exec 审批设置

- `execApprovals.enabled`：通过 Matrix 原生提示传递 exec 审批。
- `execApprovals.approvers`：允许批准的 Matrix 用户 ID。回退到 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（默认）、`"channel"` 或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：用于投递的可选代理/会话白名单。

## 相关内容

- [通道概览](/channels) - 所有支持的通道
- [配对](/channels/pairing) - DM 认证与配对流程
- [群组](/channels/groups) - 群聊行为与提及门控
- [通道路由](/channels/channel-routing) - 消息的会话路由
- [安全性](/gateway/security) - 访问模型与加固
