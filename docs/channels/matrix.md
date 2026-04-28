---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - 在 OpenClaw 中设置 Matrix
  - 配置 Matrix E2EE 和验证
title: "Matrix"
---

Matrix 是 OpenClaw 的一个内置频道插件。
它使用官方的 `matrix-js-sdk`，并支持 DM、房间、线程、媒体、反应、投票、位置以及 E2EE。

## 内置插件

当前打包的 OpenClaw 发行版已内置 Matrix 插件。你无需安装任何东西；配置 `channels.matrix.*`（参见 [设置](#setup)）即可启用它。

对于不包含 Matrix 的旧版本或自定义安装，请先手动安装：

```bash
openclaw plugins install @openclaw/matrix
# 或者，从本地检出安装
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` 会注册并启用该插件，因此不需要单独执行 `openclaw plugins enable matrix`。在你配置下面的频道之前，该插件仍然不会执行任何操作。有关通用插件行为和安装规则，请参见 [Plugins](/tools/plugin)。

## 设置步骤

1. 在你的 homeserver 上创建一个 Matrix 账号。
2. 使用 `homeserver` + `accessToken`，或 `homeserver` + `userId` + `password` 配置 `channels.matrix`。
3. 重启网关。
4. 与机器人发起 DM，或邀请它加入房间（参见 [自动加入](#auto-join)——只有在 `autoJoin` 允许时，新的邀请才会生效）。

### 交互式设置

```bash
openclaw channels add
openclaw configure --section channels
```

向导会询问：homeserver URL、认证方式（访问令牌或密码）、用户 ID（仅密码认证时需要）、可选的设备名称、是否启用 E2EE，以及是否配置房间访问和自动加入。

如果匹配的 `MATRIX_*` 环境变量已存在，并且所选账号没有已保存的认证信息，向导会提供一个环境变量快捷方式。要在保存允许列表之前解析房间名称，请运行 `openclaw channels resolve --channel matrix "Project Room"`。启用 E2EE 时，向导会写入配置并运行与 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的引导流程。

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

基于密码（首次登录后会缓存令牌）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      userId: "@bot:example.org",
      password: "replace-me", // 允许列表机密
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

### 自动加入

`channels.matrix.autoJoin` 的默认值为 `off`。在默认情况下，机器人不会出现在新房间中，也不会响应来自新邀请的 DM，直到你手动加入为止。

OpenClaw 无法在邀请时判断被邀请的房间是 DM 还是群组，因此所有邀请——包括 DM 风格的邀请——都会先经过 `autoJoin`。`dm.policy` 只会在机器人加入之后、房间被分类之后才生效。

<Warning>
将 `autoJoin: "allowlist"` 与 `autoJoinAllowlist` 结合使用，以限制机器人接受哪些邀请，或者使用 `autoJoin: "always"` 接受所有邀请。

`autoJoinAllowlist` 只接受稳定的目标：`!roomId:server`、`#alias:server` 或 `*`。普通房间名称会被拒绝；别名条目会针对 homeserver 进行解析，而不是针对被邀请房间声称的状态。
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

要接受所有邀请，请使用 `autoJoin: "always"`。

### 允许列表目标格式

DM 和房间允许列表最好使用稳定 ID 填充：

- DMs（`dm.allowFrom`、`groupAllowFrom`、`groups.<room>.users`）：使用 `@user:server`。仅当 homeserver 目录返回恰好一个匹配项时，显示名称才会被解析。
- 房间（`groups`、`autoJoinAllowlist`）：使用 `!room:server` 或 `#alias:server`。名称会尽力针对已加入的房间进行解析；未解析条目在运行时会被忽略。

### 账号 ID 规范化

向导会将友好名称转换为规范化的账号 ID。例如，`Ops Bot` 会变成 `ops-bot`。作用域环境变量名中的标点会被转义，以避免两个账号冲突：`-` → `_X2D_`，因此 `ops-prod` 会映射为 `MATRIX_OPS_X2D_PROD_*`。

### 缓存的凭据

Matrix 将缓存的凭据存储在 `~/.openclaw/credentials/matrix/` 下：

- 默认账号：`credentials.json`
- 命名账号：`credentials-<account>.json`

当这里存在缓存凭据时，即使配置文件中没有访问令牌，OpenClaw 也会将 Matrix 视为已配置——这适用于设置、`openclaw doctor` 和频道状态探测。

### 环境变量

当相应的配置键未设置时使用。默认账号使用无前缀名称；命名账号使用在后缀前插入账号 ID 的名称。

| 默认账号             | 命名账号（`<ID>` 是规范化后的账号 ID） |
| -------------------- | -------------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`               |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`             |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                  |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`                 |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`                |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`              |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`             |

对于账号 `ops`，名称会变成 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN`，等等。恢复密钥环境变量会被支持恢复的 CLI 流程（`verify backup restore`、`verify device`、`verify bootstrap`）读取，当你通过 `--recovery-key-stdin` 管道传入密钥时会使用它们。

`MATRIX_HOMESERVER` 不能从工作区 `.env` 中设置；请参见 [Workspace `.env` files](/gateway/security)。

## 配置示例

一个实用的基础配置，包含 DM 配对、房间允许列表和 E2EE：

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

Matrix 回复流式传输是可选启用的。`streaming` 控制 OpenClaw 如何发送进行中的助手回复；`blockStreaming` 控制每个已完成的块是否作为独立的 Matrix 消息保留。

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

如果你想保留实时答案预览，但隐藏中间的工具/进度行，请使用对象形式：

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

| `streaming`       | 行为                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"off"`（默认）   | 等待完整回复后一次性发送。`true` ↔ `"partial"`，`false` ↔ `"off"`。                                                                                               |
| `"partial"`       | 在模型写入当前块时，就地编辑一条普通文本消息。原生 Matrix 客户端可能会在首次预览时通知，而不会在最终编辑时通知。                                                  |
| `"quiet"`         | 与 `"partial"` 相同，但消息是不通知的提示。只有当某个按用户配置的推送规则匹配到最终编辑时，接收者才会收到通知（见下文）。                                         |

`blockStreaming` 与 `streaming` 相互独立：

| `streaming`             | `blockStreaming: true`                                              | `blockStreaming: false`（默认）                  |
| ----------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| `"partial"` / `"quiet"` | 当前块的实时草稿，已完成的块作为消息保留                                     | 当前块的实时草稿，最终就地完成                        |
| `"off"`                 | 每个完成的块发送一条会通知的 Matrix 消息                                       | 完整回复发送一条会通知的 Matrix 消息                   |

备注：

- 如果预览内容超过了 Matrix 单个事件的大小限制，OpenClaw 会停止预览流式传输并回退为仅最终发送。
- 媒体回复始终会正常发送附件。如果旧的预览无法再安全复用，OpenClaw 会在发送最终媒体回复前将其移除。
- 当 Matrix 预览流式传输处于活动状态时，工具进度预览更新默认启用。将 `streaming.preview.toolProgress: false` 可保留答案文本的预览编辑，但让工具进度走正常发送路径。
- 预览编辑会额外消耗 Matrix API 调用。如果你想要最保守的限流配置，请将 `streaming: "off"`。

## 审批元数据

Matrix 原生审批提示是普通的 `m.room.message` 事件，其中 OpenClaw 特定的自定义事件内容位于 `com.openclaw.approval` 下。Matrix 允许自定义事件内容键，因此原生客户端仍然会渲染正文文本，而支持 OpenClaw 的客户端则可以读取结构化的审批 id、类型、状态、可用决策以及执行/插件详情。

当审批提示过长而无法放入单个 Matrix 事件时，OpenClaw 会将可见文本分块，并仅将 `com.openclaw.approval` 附加到第一个块。允许/拒绝决策的反应会绑定到第一个事件，因此长提示会保留与单事件提示相同的审批目标。

### 用于静默最终预览的自托管推送规则

`streaming: "quiet"` 只会在一个块或一个轮次最终确定后通知接收者——每个用户的推送规则必须匹配最终预览标记。完整方案请参见 [Matrix push rules for quiet previews](/channels/matrix-push-rules)（接收者令牌、推送器检查、规则安装、各 homeserver 说明）。

## Bot-to-bot rooms

默认情况下，来自其他已配置 OpenClaw Matrix 账户的 Matrix 消息将被忽略。

当您有意想要机器人间的 Matrix 流量时，请使用 `allowBots`：

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

- `allowBots: true` 在允许的房间和私信中接受来自其他已配置 Matrix 机器人账户的消息。
- `allowBots: "mentions"` 仅在消息在房间中明确提及此机器人时接受这些消息。私信仍然允许。
- `groups.<room>.allowBots` 会覆盖账户级别的设置以针对特定房间。
- OpenClaw 仍会忽略来自同一 Matrix 用户 ID 的消息以避免自回复循环。
- Matrix 在此处没有公开原生的机器人标志；OpenClaw 将"机器人创作"定义为"由此 OpenClaw 网关上另一个已配置的 Matrix 账户发送"。

在共享房间中启用机器人对机器人流量时，请使用严格的房间允许列表和提及要求。

## 加密与验证

在启用端到端加密（E2EE）的聊天室中，外发图片事件使用 `thumbnail_file`，因此图片预览会与完整附件一起被加密。未加密的聊天室仍使用普通的 `thumbnail_url`。无需进行配置——插件会自动检测 E2EE 状态。

所有 `openclaw matrix` 命令都接受 `--verbose`（完整诊断）、`--json`（机器可读输出）和 `--account <id>`（多账户设置）。默认情况下输出简洁，并且内部 SDK 日志保持静默。下面的示例展示了标准形式；按需添加这些标志。

### 启用加密

```bash
openclaw matrix encryption setup
```

引导秘密存储和交叉签名，必要时创建房间密钥备份，然后打印状态和后续步骤。有用的标志：

- `--recovery-key <key>` 在引导前应用恢复密钥（优先使用下文记录的 stdin 形式）
- `--force-reset-cross-signing` 丢弃当前交叉签名身份并创建新的身份（仅在有意时使用）

对于新账户，请在创建时启用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的别名。

手动配置等效形式：

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

- `Locally trusted`: 仅由此客户端信任
- `Cross-signing verified`: SDK 报告通过交叉签名验证
- `Signed by owner`: 由您自己的自签名密钥签名（仅用于诊断）

只有当 `Cross-signing verified` 为 `yes` 时，`Verified by owner` 才会变为 `yes`。仅有本地信任或所有者签名都不够。

`--allow-degraded-local-state` 会在未先准备 Matrix 账户的情况下返回尽力而为的诊断；适用于离线或部分配置的探测。

### 使用恢复密钥验证此设备

恢复密钥很敏感——请通过 stdin 传递，而不是在命令行中提供。设置 `MATRIX_RECOVERY_KEY`（或命名账户使用 `MATRIX_<ID>_RECOVERY_KEY`）：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

该命令会报告三个状态：

- `Recovery key accepted`: Matrix 已接受该密钥用于秘密存储或设备信任。
- `Backup usable`: 可以使用受信任的恢复材料加载房间密钥备份。
- `Device verified by owner`: 此设备具有完整的 Matrix 交叉签名身份信任。

如果完整身份信任不完整，即使恢复密钥解锁了备份材料，它也会以非零状态退出。在这种情况下，请在另一台 Matrix 客户端中完成自我验证：

```bash
openclaw matrix verify self
```

`verify self` 会等待 `Cross-signing verified: yes` 后才会成功退出。使用 `--timeout-ms <ms>` 调整等待时间。

也接受字面量密钥形式 `openclaw matrix verify device "<recovery-key>"`，但该密钥会落入您的 shell 历史记录。

### 引导或修复交叉签名

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` 是用于加密账户的修复和设置命令。按顺序，它会：

- 引导秘密存储，尽可能复用现有恢复密钥
- 引导交叉签名并上传缺失的公钥
- 标记并对当前设备进行交叉签名
- 如果服务器端房间密钥备份不存在，则创建一个

如果 homeserver 需要 UIA 才能上传交叉签名密钥，OpenClaw 会先尝试无认证，再尝试 `m.login.dummy`，最后尝试 `m.login.password`（需要 `channels.matrix.password`）。

有用的标志：

- `--recovery-key-stdin`（配合 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …`）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 丢弃当前交叉签名身份（仅在有意时使用）

### 房间密钥备份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 会显示是否存在服务器端备份，以及此设备是否可以解密它。`backup restore` 会将已备份的房间密钥导入本地加密存储；如果恢复密钥已经在磁盘上，可以省略 `--recovery-key-stdin`。

要用新的基线替换损坏的备份（接受丢失无法恢复的旧历史；如果当前备份密钥无法加载，也可以重建秘密存储）：

```bash
openclaw matrix verify backup reset --yes
```

仅当您有意让之前的恢复密钥不再能解锁新的备份基线时，才添加 `--rotate-recovery-key`。

### 列出、请求和响应验证

```bash
openclaw matrix verify list
```

列出所选账户的待处理验证请求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

从此 OpenClaw 账户发送验证请求。`--own-user` 请求自我验证（您在同一用户的另一 Matrix 客户端中接受提示）；`--user-id`/`--device-id`/`--room-id` 用于指定其他人。`--own-user` 不能与其他目标标志组合使用。

对于更底层的生命周期处理——通常在从另一个客户端影子跟踪传入请求时——这些命令会针对特定请求 `<id>` 操作（由 `verify list` 和 `verify request` 打印）：

| 命令                                       | 目的                                                             |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `openclaw matrix verify accept <id>`       | 接受传入请求                                                     |
| `openclaw matrix verify start <id>`        | 开始 SAS 流程                                                    |
| `openclaw matrix verify sas <id>`          | 打印 SAS 表情符号或数字                                           |
| `openclaw matrix verify confirm-sas <id>`  | 确认 SAS 与另一客户端显示的内容一致                              |
| `openclaw matrix verify mismatch-sas <id>` | 当表情符号或数字不匹配时拒绝 SAS                                 |
| `openclaw matrix verify cancel <id>`       | 取消；可选接受 `--reason <text>` 和 `--code <matrix-code>`        |

当验证锚定到特定的直接消息房间时，`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 都接受 `--user-id` 和 `--room-id` 作为 DM 后续提示。

### 多账户说明

如果没有 `--account <id>`，Matrix CLI 命令会使用隐式默认账户。如果您有多个已命名账户且未设置 `channels.matrix.defaultAccount`，它们会拒绝猜测并要求您选择。当 E2EE 对某个命名账户被禁用或不可用时，错误会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="Startup behavior">
    使用 `encryption: true` 时，`startupVerification` 默认值为 `"if-unverified"`。启动时，未验证的设备会在另一台 Matrix 客户端中请求自我验证，跳过重复项并应用冷却期（默认 24 小时）。可通过 `startupVerificationCooldownHours` 调整，或使用 `startupVerification: "off"` 禁用。

    启动时还会运行一次保守的加密引导流程，它会重用当前的秘密存储和交叉签名身份。如果引导状态损坏，即使没有 `channels.matrix.password`，OpenClaw 也会尝试进行受保护的修复；如果 homeserver 需要密码 UIA，启动时会记录警告但不会致命退出。已经由所有者签名的设备会被保留。

    有关完整升级流程，请参见 [Matrix 迁移](/channels/matrix-migration)。

  </Accordion>

  <Accordion title="Verification notices">
    Matrix 会将验证生命周期通知作为 `m.notice` 消息发布到严格的 DM 验证房间中：请求、就绪（带有“按表情符号验证”指导）、开始/完成，以及可用时的 SAS（表情符号/数字）详情。

    来自另一个 Matrix 客户端的传入请求会被跟踪并自动接受。对于自我验证，OpenClaw 会自动启动 SAS 流程，并在可用表情符号验证后确认自身这一侧——您仍需要在 Matrix 客户端中比较并确认 “They match”。

    验证系统通知不会转发到 agent 聊天流水线。

  </Accordion>

  <Accordion title="Deleted or invalid Matrix device">
    如果 `verify status` 表示当前设备不再列在 homeserver 上，请创建一个新的 OpenClaw Matrix 设备。对于密码登录：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    对于令牌认证，请在您的 Matrix 客户端或管理界面中创建一个新的访问令牌，然后更新 OpenClaw：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    将 `assistant` 替换为失败命令中的账户 ID，或者在默认账户情况下省略 `--account`。

  </Accordion>

  <Accordion title="Device hygiene">
    旧的由 OpenClaw 管理的设备可能会累积。列出并清理：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="Crypto store">
    Matrix E2EE 使用官方 `matrix-js-sdk` 的 Rust 加密路径，并以 `fake-indexeddb` 作为 IndexedDB 的 shim。加密状态会持久化到 `crypto-idb-snapshot.json`（严格的文件权限）。

    加密运行时状态保存在 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下，包括同步存储、加密存储、恢复密钥、IDB 快照、线程绑定以及启动验证状态。当令牌更改但账户身份保持不变时，OpenClaw 会重用最佳现有根目录，以便之前的状态仍然可见。

  </Accordion>
</AccordionGroup>

## 资料管理

更新所选账户的 Matrix 自我简介：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

你可以在一次调用中同时传入这两个选项。Matrix 可直接接受 `mxc://` 头像 URL；当你传入 `http://` 或 `https://` 时，OpenClaw 会先上传文件，并将解析后的 `mxc://` URL 存储到 `channels.matrix.avatarUrl`（或每个账户的覆盖配置）中。

## 线程

Matrix 同时支持用于自动回复和 message-tool 发送的原生 Matrix 线程。两个彼此独立的开关控制其行为：

### 会话路由（`sessionScope`）

`dm.sessionScope` 决定 Matrix 私信房间如何映射到 OpenClaw 会话：

- `"per-user"`（默认）：所有具有相同路由对端的私信房间共享一个会话。
- `"per-room"`：每个 Matrix 私信房间都有自己的会话键，即使对端相同也是如此。

显式的对话绑定始终优先于 `sessionScope`，因此已绑定的房间和线程会保留它们选择的目标会话。

### 回复线程化（`threadReplies`）

`threadReplies` 决定机器人在哪个位置发布回复：

- `"off"`：回复为顶层消息。入站线程消息会保留在父会话中。
- `"inbound"`：仅当入站消息已经在某个线程中时，才在该线程内回复。
- `"always"`：在由触发消息根化的线程中回复；从第一次触发开始，该对话会通过匹配的线程作用域会话进行路由。

`dm.threadReplies` 仅对私信覆盖此设置——例如，可保持房间线程彼此隔离，同时让私信保持平面结构。

### 线程继承与斜杠命令

- 入站线程消息会将线程根消息作为额外的代理上下文包含进来。
- 当 message-tool 发送目标是同一房间（或同一私信用户目标）时，会自动继承当前 Matrix 线程，除非显式提供了 `threadId`。
- 只有当当前会话元数据证明在同一个 Matrix 账户上是同一个私信对端时，私信用户目标复用才会生效；否则 OpenClaw 会回退到常规的按用户作用域路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及基于线程的 `/acp spawn` 都可在 Matrix 房间和私信中使用。
- 顶层 `/focus` 会创建一个新的 Matrix 线程，并在 `threadBindings.spawnSubagentSessions: true` 时将其绑定到目标会话。
- 在现有 Matrix 线程中运行 `/focus` 或 `/acp spawn --thread here` 会就地绑定该线程。

当 OpenClaw 检测到某个 Matrix 私信房间与同一共享会话上的另一个私信房间发生冲突时，它会在该房间中发布一次性的 `m.notice`，提示使用 `/focus` 逃逸路径，并建议调整 `dm.sessionScope`。只有在启用线程绑定时才会显示该通知。

## ACP 对话绑定

Matrix 房间、私信和现有的 Matrix 线程可以转变为持久的 ACP 工作区，而无需更改聊天界面。

快速操作员流程：

- 在您想要继续使用的 Matrix 私信、房间或现有线程中运行 `/acp spawn codex --bind here`。
- 在顶层 Matrix 私信或房间中，当前的私信/房间保持为聊天界面，未来的消息将路由到生成的 ACP 会话。
- 在现有的 Matrix 线程内部，`--bind here` 会将该当前线程就地绑定。
- `/new` 和 `/reset` 就地重置同一个绑定的 ACP 会话。
- `/acp close` 关闭 ACP 会话并移除绑定。

注意：

- `--bind here` 不会创建子 Matrix 线程。
- `threadBindings.spawnAcpSessions` 仅用于 `/acp spawn --thread auto|here`，此时 OpenClaw 需要创建或绑定子 Matrix 线程。

### 线程绑定配置

Matrix 继承来自 `session.threadBindings` 的全局默认值，并支持每个频道的覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 线程绑定生成标志是可选的：

- 设置 `threadBindings.spawnSubagentSessions: true` 以允许顶层 `/focus` 创建并绑定新的 Matrix 线程。
- 设置 `threadBindings.spawnAcpSessions: true` 以允许 `/acp spawn --thread auto|here` 将 ACP 会话绑定到 Matrix 线程。

## 反应

Matrix 支持发出的反应、传入的反应通知以及 ack 反应。

发出反应的工具受 `channels.matrix.actions.reactions` 控制：

- `react` 为 Matrix 事件添加一个反应。
- `reactions` 列出某个 Matrix 事件当前的反应摘要。
- `emoji=""` 会移除机器人在该事件上的自有反应。
- `remove: true` 只移除机器人指定的表情反应。

**解析顺序**（先定义的值优先）：

| 设置                    | 顺序                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| `ackReaction`           | per-account → channel → `messages.ackReaction` → agent identity emoji fallback   |
| `ackReactionScope`      | per-account → channel → `messages.ackReactionScope` → default `"group-mentions"` |
| `reactionNotifications` | per-account → channel → default `"own"`                                          |

`reactionNotifications: "own"` 会转发添加的 `m.reaction` 事件，前提是它们针对的是机器人生成的 Matrix 消息；`"off"` 会禁用反应系统事件。反应移除不会被合成为系统事件，因为 Matrix 将其呈现为 redaction，而不是独立的 `m.reaction` 移除事件。

## 历史上下文

- `channels.matrix.historyLimit` 控制当 Matrix 房间消息触发代理时，包含在 `InboundHistory` 中的最近房间消息数量。如果未设置则回退到 `messages.groupChat.historyLimit`；若两者均未设置，则有效默认值为 `0`。设置为 `0` 可禁用此功能。
- Matrix 房间历史记录仅限房间内部使用。私信仍使用常规会话历史记录。
- Matrix 房间历史记录为待处理状态：OpenClaw 会暂存尚未触发回复的房间消息，然后在提及或其他触发器到达时对该窗口进行快照。
- 当前触发消息不会包含在 `InboundHistory` 中；它保留在该轮次的主入站正文中。
- 对同一 Matrix 事件的重复尝试会重用原始历史快照，而不会向前漂移至更新的房间消息。

## 上下文可见性

Matrix 支持共享的 `contextVisibility` 控制，用于补充房间上下文，例如获取的回复文本、线程根和待处理历史记录。

- `contextVisibility: "all"` 是默认值。补充上下文按接收原样保留。
- `contextVisibility: "allowlist"` 将补充上下文过滤为活动房间/用户允许列表检查允许的发送者。
- `contextVisibility: "allowlist_quote"` 行为类似于 `allowlist`，但仍保留一个显式的引用回复。

此设置影响补充上下文的可见性，不影响入站消息本身是否可以触发回复。  
触发授权仍然来自 `groupPolicy`、`groups`、`groupAllowFrom` 和私信策略设置。

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

若要完全静音私信，同时保留房间可用，请设置 `dm.enabled: false`：

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

有关提及门控和允许列表行为，请参阅 [群组](/channels/groups)。

Matrix 私信配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未获批准的 Matrix 用户在批准前持续向你发送消息，OpenClaw 会复用同一个待处理配对代码，并可能在短暂冷却后发送提醒回复，而不是生成新的代码。

有关共享私信配对流程和存储布局，请参阅 [配对](/channels/pairing)。

## 直接房间修复

如果私信状态与实际情况失去同步，OpenClaw 可能会保留指向旧的单人房间而非当前 DM 的过期 `m.direct` 映射。检查某个对端的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

这两个命令都接受 `--account <id>`，用于多账户配置。修复流程：

- 优先选择已在 `m.direct` 中映射的严格 1:1 私信
- 若无映射，则回退到与该用户当前加入的任何严格 1:1 私信
- 若无健康私信存在，则创建新的直接房间并重写 `m.direct`

它不会自动删除旧房间。它会选择健康的 DM 并更新映射，以便未来的 Matrix 发送、验证通知和其他直接消息流程指向正确的房间。

## 执行审批

Matrix 可以作为原生审批客户端运行。请在 `channels.matrix.execApprovals` 下进行配置（或在 `channels.matrix.accounts.<account>.execApprovals` 下进行每账户覆盖）：

- `enabled`：通过 Matrix 原生提示传递审批。未设置或为 `"auto"` 时，一旦至少有一个审批人可解析，Matrix 就会自动启用。显式设置 `false` 可禁用。
- `approvers`：允许批准执行请求的 Matrix 用户 ID（`@owner:example.org`）。可选——会回退到 `channels.matrix.dm.allowFrom`。
- `target`：提示发送到哪里。`"dm"`（默认）发送到审批人的私信；`"channel"` 发送到发起请求的 Matrix 房间或私信；`"both"` 同时发送到两者。
- `agentFilter` / `sessionFilter`：用于限定哪些代理/会话会触发 Matrix 传递的可选允许列表。

不同审批类型的授权略有差异：

- **执行审批** 使用 `execApprovals.approvers`，并回退到 `dm.allowFrom`。
- **插件审批** 仅通过 `dm.allowFrom` 授权。

两种类型都共享 Matrix 反应快捷方式和消息更新。审批人会在主审批消息上看到反应快捷方式：

- `✅` 允许一次
- `❌` 拒绝
- `♾️` 永久允许（当有效执行策略允许时）

备用斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析出的审批人才能批准或拒绝。执行审批的频道投递会包含命令文本——仅在受信任的房间中启用 `channel` 或 `both`。

相关内容：[执行审批](/tools/exec-approvals)。

## Slash 命令

Slash 命令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）可直接在私信中使用。在房间中，OpenClaw 也会识别以机器人自身的 Matrix 提及作为前缀的命令，因此 `@bot:server /new` 会触发命令路径，而无需自定义提及正则。这使机器人能够响应 Element 和类似客户端在用户通过 Tab 补全机器人后输入命令时发出的房间式 `@mention /command` 消息。

授权规则仍然适用：命令发送者必须满足与普通消息相同的 DM 或房间允许列表/所有者策略。

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
- 使用 `groups.<room>.account` 将继承的房间条目限定到特定账户。未设置 `account` 的条目会在各账户之间共享；当默认账户在顶层配置时，`account: "default"` 仍然可用。

**默认账户选择：**

- 设置 `defaultAccount` 可选择隐式路由、探测和 CLI 命令所偏好的命名账户。
- 如果你有多个账户，并且其中一个账户就叫 `default`，即使未设置 `defaultAccount`，OpenClaw 也会隐式使用它。
- 如果你有多个命名账户但未选择默认账户，CLI 命令不会猜测——请设置 `defaultAccount` 或传入 `--account <id>`。
- 仅当顶层 `channels.matrix.*` 区块的认证完整时（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`），它才会被视为隐式 `default` 账户。只要缓存凭据覆盖了认证，命名账户仍可通过 `homeserver` + `userId` 被发现。

**提升：**

- 当 OpenClaw 在修复或设置期间将单账户配置提升为多账户时，如果已存在命名账户，或者 `defaultAccount` 已经指向其中之一，它会保留现有的命名账户。只有 Matrix 认证/引导键会移入被提升的账户；共享投递策略键仍保留在顶层。

参见 [配置参考](/gateway/config-channels#multi-account-all-channels) 了解共享多账户模式。

## 私有/LAN homeserver

默认情况下，OpenClaw 出于 SSRF 保护会阻止私有/内部 Matrix homeserver，除非您
为每个账户明确选择加入。

如果您的 homeserver 运行在 localhost、LAN/Tailscale IP 或内部主机名上，请为该 Matrix 账户启用
`network.dangerouslyAllowPrivateNetwork`：

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

此选择加入仅允许受信任的私有/内部目标。公共纯文本 homeserver 如
`http://matrix.example.org:8008` 仍然被阻止。尽可能优先使用 `https://`。

## 代理 Matrix 流量

如果您的 Matrix 部署需要显式的出站 HTTP(S) 代理，请设置 `channels.matrix.proxy`：

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

命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖顶层默认值。
OpenClaw 对运行时 Matrix 流量和账户状态探测使用相同的代理设置。

## 目标解析

Matrix 接受以下目标形式，适用于 OpenClaw 要求您提供房间或用户目标的任何位置：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

实时目录查找使用已登录的 Matrix 账户：

- 用户查找查询该 homeserver 上的 Matrix 用户目录。
- 房间查找直接接受明确的房间 ID 和别名，然后回退到搜索该账户加入的房间名称。
- 加入房间名称查找是尽力而为的。如果房间名称无法解析为 ID 或别名，它将在运行时的允许列表解析中被忽略。

## 配置参考

- `enabled`: 启用或禁用该频道。
- `name`: 账户的可选标签。
- `defaultAccount`: 配置了多个 Matrix 账户时的首选账户 ID。
- `homeserver`: homeserver URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`: 允许此 Matrix 账户连接到私有/内部 homeserver。当 homeserver 解析到 `localhost`、LAN/Tailscale IP 或内部主机（例如 `matrix-synapse`）时请启用此项。
- `proxy`: Matrix 流量的可选 HTTP(S) 代理 URL。命名账户可以用各自的 `proxy` 覆盖顶层默认值。
- `userId`: 完整的 Matrix 用户 ID，例如 `@bot:example.org`。
- `accessToken`: 基于令牌的认证访问令牌。`channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 支持明文值和 SecretRef 值，适用于 env/file/exec 提供者。参见 [Secrets Management](/gateway/secrets)。
- `password`: 基于密码登录的密码。支持明文值和 SecretRef 值。
- `deviceId`: 显式的 Matrix 设备 ID。
- `deviceName`: 密码登录时的设备显示名称。
- `avatarUrl`: 用于资料同步和 `profile set` 更新的已存储自头像 URL。
- `initialSyncLimit`: 启动同步期间获取的最大事件数量。
- `encryption`: 启用 E2EE。
- `allowlistOnly`: 当为 `true` 时，将 `open` 房间策略升级为 `allowlist`，并强制所有活动的 DM 策略（除 `disabled` 外，包括 `pairing` 和 `open`）变为 `allowlist`。不影响 `disabled` 策略。
- `allowBots`: 允许来自其他已配置 OpenClaw Matrix 账户的消息（`true` 或 `"mentions"`）。
- `groupPolicy`: `open`、`allowlist` 或 `disabled`。
- `contextVisibility`: 补充性的房间上下文可见性模式（`all`、`allowlist`、`allowlist_quote`）。
- `groupAllowFrom`: 房间流量的用户 ID 允许列表。完整的 Matrix 用户 ID 最安全；精确目录匹配会在启动时以及允许列表在监控运行期间变更时解析。无法解析的名称会被忽略。
- `historyLimit`: 作为群聊历史上下文包含的最多房间消息数。回退到 `messages.groupChat.historyLimit`；如果两者都未设置，生效的默认值为 `0`。设为 `0` 可禁用。
- `replyToMode`: `off`、`first`、`all` 或 `batched`。
- `markdown`: 可选的出站 Matrix 文本 Markdown 渲染配置。
- `streaming`: `off`（默认）、`"partial"`、`"quiet"`、`true` 或 `false`。`"partial"` 和 `true` 启用先预览后草稿更新，并使用普通 Matrix 文本消息。`"quiet"` 使用不通知的预览通知，适用于自托管 push-rule 设置。`false` 等同于 `off`。
- `blockStreaming`: 当草稿预览流式传输处于活动状态时，`true` 会为已完成的 assistant block 启用单独的进度消息。
- `threadReplies`: `off`、`inbound` 或 `always`。
- `threadBindings`: 用于线程绑定会话路由和生命周期的按频道覆盖。
- `startupVerification`: 启动时自动自我验证请求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`: 重试自动启动验证请求前的冷却时间。
- `textChunkLimit`: 出站消息分块字符数上限（适用于 `chunkMode` 为 `length` 时）。
- `chunkMode`: `length` 按字符数拆分消息；`newline` 按换行边界拆分。
- `responsePrefix`: 可选字符串，添加到该频道所有出站回复前缀。
- `ackReaction`: 该频道/账户的可选确认表情覆盖。
- `ackReactionScope`: 可选确认表情作用域覆盖（`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`）。
- `reactionNotifications`: 入站表情通知模式（`own`、`off`）。
- `mediaMaxMb`: 出站发送和入站媒体处理的媒体大小上限（MB）。
- `autoJoin`: 邀请自动加入策略（`always`、`allowlist`、`off`）。默认：`off`。适用于所有 Matrix 邀请，包括 DM 风格邀请。
- `autoJoinAllowlist`: 当 `autoJoin` 为 `allowlist` 时允许的房间/别名。别名条目会在邀请处理期间解析为房间 ID；OpenClaw 不信任被邀请房间声称的别名状态。
- `dm`: DM 策略块（`enabled`、`policy`、`allowFrom`、`sessionScope`、`threadReplies`）。
- `dm.policy`: 在 OpenClaw 已加入房间并将其分类为 DM 后，控制 DM 访问权限。它不会改变邀请是否自动加入。
- `dm.allowFrom`: DM 流量的用户 ID 允许列表。完整的 Matrix 用户 ID 最安全；精确目录匹配会在启动时以及允许列表在监控运行期间变更时解析。无法解析的名称会被忽略。
- `dm.sessionScope`: `per-user`（默认）或 `per-room`。当您希望每个 Matrix DM 房间即使对端相同也保留独立上下文时，请使用 `per-room`。
- `dm.threadReplies`: 仅 DM 的线程策略覆盖（`off`、`inbound`、`always`）。它会覆盖顶层 `threadReplies` 设置，并同时影响 DM 中的回复位置和会话隔离。
- `execApprovals`: Matrix 原生的 exec 审批投递（`enabled`、`approvers`、`target`、`agentFilter`、`sessionFilter`）。
- `execApprovals.approvers`: 允许批准 exec 请求的 Matrix 用户 ID。当 `dm.allowFrom` 已经识别出审批人时此项可选。
- `execApprovals.target`: `dm | channel | both`（默认：`dm`）。
- `accounts`: 按账户命名的覆盖项。顶层 `channels.matrix` 值作为这些条目的默认值。
- `groups`: 按房间的策略映射。优先使用房间 ID 或别名；无法解析的房间名称在运行时会被忽略。会话/群组身份在解析后使用稳定的房间 ID。
- `groups.<room>.account`: 在多账户设置中，将一个继承的房间条目限制为特定的 Matrix 账户。
- `groups.<room>.allowBots`: 房间级的已配置机器人发送者覆盖（`true` 或 `"mentions"`）。
- `groups.<room>.users`: 每个房间的发送者允许列表。
- `groups.<room>.tools`: 每个房间的工具允许/拒绝覆盖。
- `groups.<room>.autoReply`: 房间级提及门控覆盖。`true` 会禁用该房间的提及要求；`false` 会将其重新强制开启。
- `groups.<room>.skills`: 可选的房间级技能过滤器。
- `groups.<room>.systemPrompt`: 可选的房间级系统提示片段。
- `rooms`: `groups` 的旧别名。
- `actions`: 按动作的工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。

Allowlist-style fields (`groupAllowFrom`, `dm.allowFrom`, `groups.<room>.users`) accept full Matrix user IDs (safest). Exact directory matches are resolved at startup and whenever the allowlist changes while the monitor is running; entries that cannot be resolved are ignored at runtime. Room allowlists prefer room IDs or aliases for the same reason.

### Account and connection

- `enabled`: enable or disable the channel.
- `name`: optional display label for the account.
- `defaultAccount`: preferred account ID when multiple Matrix accounts are configured.
- `accounts`: named per-account overrides. Top-level `channels.matrix` values are inherited as defaults.
- `homeserver`: homeserver URL, for example `https://matrix.example.org`.
- `network.dangerouslyAllowPrivateNetwork`: allow this account to connect to `localhost`, LAN/Tailscale IPs, or internal hostnames.
- `proxy`: optional HTTP(S) proxy URL for Matrix traffic. Per-account override supported.
- `userId`: full Matrix user ID (`@bot:example.org`).
- `accessToken`: access token for token-based auth. Plaintext and SecretRef values supported across env/file/exec providers ([Secrets Management](/gateway/secrets)).
- `password`: password for password-based login. Plaintext and SecretRef values supported.
- `deviceId`: explicit Matrix device ID.
- `deviceName`: device display name used at password-login time.
- `avatarUrl`: stored self-avatar URL for profile sync and `profile set` updates.
- `initialSyncLimit`: maximum number of events fetched during startup sync.

### Encryption

- `encryption`: enable E2EE. Default: `false`.
- `startupVerification`: `"if-unverified"` (default when E2EE is on) or `"off"`. Auto-requests self-verification on startup when this device is unverified.
- `startupVerificationCooldownHours`: cooldown before the next automatic startup request. Default: `24`.

### Access and policy

- `groupPolicy`: `"open"`, `"allowlist"`, or `"disabled"`. Default: `"allowlist"`.
- `groupAllowFrom`: allowlist of user IDs for room traffic.
- `dm.enabled`: when `false`, ignore all DMs. Default: `true`.
- `dm.policy`: `"pairing"` (default), `"allowlist"`, `"open"`, or `"disabled"`. Applies after the bot has joined and classified the room as a DM; it does not affect invite handling.
- `dm.allowFrom`: allowlist of user IDs for DM traffic.
- `dm.sessionScope`: `"per-user"` (default) or `"per-room"`.
- `dm.threadReplies`: DM-only override for reply threading (`"off"`, `"inbound"`, `"always"`).
- `allowBots`: accept messages from other configured Matrix bot accounts (`true` or `"mentions"`).
- `allowlistOnly`: when `true`, forces all active DM policies (except `"disabled"`) and `"open"` group policies to `"allowlist"`. Does not change `"disabled"` policies.
- `autoJoin`: `"always"`, `"allowlist"`, or `"off"`. Default: `"off"`. Applies to every Matrix invite, including DM-style invites.
- `autoJoinAllowlist`: rooms/aliases allowed when `autoJoin` is `"allowlist"`. Alias entries are resolved against the homeserver, not against state claimed by the invited room.
- `contextVisibility`: supplemental context visibility (`"all"` default, `"allowlist"`, `"allowlist_quote"`).

### Reply behavior

- `replyToMode`: `"off"`, `"first"`, `"all"`, or `"batched"`.
- `threadReplies`: `"off"`, `"inbound"`, or `"always"`.
- `threadBindings`: per-channel overrides for thread-bound session routing and lifecycle.
- `streaming`: `"off"` (default), `"partial"`, `"quiet"`, or object form `{ mode, preview: { toolProgress } }`. `true` ↔ `"partial"`, `false` ↔ `"off"`.
- `blockStreaming`: when `true`, completed assistant blocks are kept as separate progress messages.
- `markdown`: optional Markdown rendering config for outbound text.
- `responsePrefix`: optional string prepended to outbound replies.
- `textChunkLimit`: outbound chunk size in characters when `chunkMode: "length"`. Default: `4000`.
- `chunkMode`: `"length"` (default, splits by character count) or `"newline"` (splits at line boundaries).
- `historyLimit`: number of recent room messages included as `InboundHistory` when a room message triggers the agent. Falls back to `messages.groupChat.historyLimit`; effective default `0` (disabled).
- `mediaMaxMb`: media size cap in MB for outbound sends and inbound processing.

### Reaction settings

- `ackReaction`: ack reaction override for this channel/account.
- `ackReactionScope`: scope override (`"group-mentions"` default, `"group-all"`, `"direct"`, `"all"`, `"none"`, `"off"`).
- `reactionNotifications`: inbound reaction notification mode (`"own"` default, `"off"`).

### Tooling and per-room overrides

- `actions`: per-action tool gating (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).
- `groups`: per-room policy map. Session identity uses the stable room ID after resolution. (`rooms` is a legacy alias.)
  - `groups.<room>.account`: restrict one inherited room entry to a specific account.
  - `groups.<room>.allowBots`: per-room override of the channel-level setting (`true` or `"mentions"`).
  - `groups.<room>.users`: per-room sender allowlist.
  - `groups.<room>.tools`: per-room tool allow/deny overrides.
  - `groups.<room>.autoReply`: per-room mention-gating override. `true` disables mention requirements for that room; `false` forces them back on.
  - `groups.<room>.skills`: per-room skill filter.
  - `groups.<room>.systemPrompt`: per-room system prompt snippet.

### Exec approval settings

- `execApprovals.enabled`: deliver exec approvals through Matrix-native prompts.
- `execApprovals.approvers`: Matrix user IDs allowed to approve. Falls back to `dm.allowFrom`.
- `execApprovals.target`: `"dm"` (default), `"channel"`, or `"both"`.
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`: optional agent/session allowlists for delivery.

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和加固
