---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - 在 OpenClaw 中设置 Matrix
  - 配置 Matrix E2EE 和验证
title: "Matrix"
---

Matrix 是 OpenClaw 的一个可下载频道插件。
它使用官方的 `matrix-js-sdk`，并支持 DM、房间、线程、媒体、反应、投票、位置以及 E2EE。

## 安装

在配置频道之前先安装 Matrix：

```bash
openclaw plugins install @openclaw/matrix
```

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` 会注册并启用该插件，因此不需要单独执行 `openclaw plugins enable matrix`。在你配置下面的频道之前，该插件仍然不会做任何事。有关插件的一般行为和安装规则，请参见 [插件](/tools/plugin)。

## 设置

1. 在你的 homeserver 上创建一个 Matrix 账户。
2. 使用 `homeserver` + `accessToken`，或者 `homeserver` + `userId` + `password` 配置 `channels.matrix`。
3. 重启网关。
4. 与机器人发起一个 DM，或者邀请它加入房间（参见 [自动加入](#auto-join) - 只有新的邀请才会在 `autoJoin` 允许时进入）。

### 交互式设置

```bash
openclaw channels add
openclaw configure --section channels
```

向导会询问：homeserver URL、认证方式（访问令牌或密码）、用户 ID（仅密码认证）、可选的设备名称、是否启用 E2EE，以及是否配置房间访问和自动加入。

如果已存在匹配的 `MATRIX_*` 环境变量，并且所选账户没有已保存的认证信息，向导会提供一个环境变量快捷方式。要在保存允许列表之前解析房间名称，请运行 `openclaw channels resolve --channel matrix "Project Room"`。启用 E2EE 时，向导会写入配置并运行与 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的初始化流程。

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

基于密码（首次登录后令牌会被缓存）：

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

`channels.matrix.autoJoin` 的默认值是 `off`。在默认设置下，除非你手动加入，否则机器人不会出现在新房间或来自新邀请的私聊中。

OpenClaw 无法在邀请时判断一个被邀请的房间是 DM 还是群组，因此所有邀请——包括 DM 风格的邀请——都会先经过 `autoJoin`。`dm.policy` 只会在之后生效，即机器人加入并且房间已被分类之后。

<Warning>
将 `autoJoin: "allowlist"` 与 `autoJoinAllowlist` 配合使用，以限制机器人接受哪些邀请，或者使用 `autoJoin: "always"` 接受每个邀请。

`autoJoinAllowlist` 只接受稳定目标：`!roomId:server`、`#alias:server` 或 `*`。普通房间名称会被拒绝；别名条目是针对 homeserver 解析的，而不是针对被邀请房间声称的状态。
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

要接受每个邀请，请使用 `autoJoin: "always"`。

### 允许列表目标格式

DM 和房间的允许列表最好使用稳定 ID 来填充：

- DM（`dm.allowFrom`、`groupAllowFrom`、`groups.<room>.users`）：使用 `@user:server`。仅当 homeserver 目录返回恰好一个匹配项时，显示名称才会被解析。
- 房间（`groups`、`autoJoinAllowlist`）：使用 `!room:server` 或 `#alias:server`。名称会基于已加入的房间尽力解析；无法解析的条目在运行时会被忽略。

### 账户 ID 规范化

向导会将友好名称转换为规范化的账户 ID。例如，`Ops Bot` 会变成 `ops-bot`。作用域环境变量名中的标点会被转义，以避免两个账户冲突：`-` → `_X2D_`，因此 `ops-prod` 会映射为 `MATRIX_OPS_X2D_PROD_*`。

### 缓存的凭据

Matrix 将缓存的凭据存储在 `~/.openclaw/credentials/matrix/` 下：

- 默认账户：`credentials.json`
- 命名账户：`credentials-<account>.json`

当这里存在缓存凭据时，即使访问令牌不在配置文件中，OpenClaw 也会将 Matrix 视为已配置——这涵盖初始化、`openclaw doctor` 和频道状态探测。

### 环境变量

当等效的配置键未设置时使用。默认账户使用无前缀名称；命名账户使用插入到后缀之前的账户 ID。

| 默认账户            | 命名账户（`<ID>` 是规范化后的账户 ID）         |
| ------------------- | ---------------------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`                            |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`                          |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                               |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`                              |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`                             |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`                           |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`                          |

对于账户 `ops`，这些名称会变成 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN` 等。恢复密钥环境变量会被支持恢复的 CLI 流程读取（`verify backup restore`、`verify device`、`verify bootstrap`），当你通过 `--recovery-key-stdin` 管道输入密钥时。

`MATRIX_HOMESERVER` 不能从工作区 `.env` 中设置；请参见 [工作区 `.env` 文件](/gateway/security)。

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

Matrix 回复流式传输是可选功能。`streaming` 控制 OpenClaw 如何传递进行中的助手回复；`blockStreaming` 控制每个已完成的块是否作为独立的 Matrix 消息保留。

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

若想保留实时答案预览但隐藏中间的工具/进度行，请使用对象
形式：

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

| `streaming`       | 行为                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"off"`（默认）   | 等待完整回复，然后发送一次。`true` ↔ `"partial"`，`false` ↔ `"off"`。                                                                                        |
| `"partial"`       | 当模型写入当前块时，原地编辑一条普通文本消息。标准 Matrix 客户端可能会在首次预览时通知，而不是在最终编辑时通知。              |
| `"quiet"`         | 与 `"partial"` 相同，但消息是一个不触发通知的提示。只有当每用户推送规则匹配到最终化的编辑时，接收者才会收到通知（见下文）。 |

`blockStreaming` 与 `streaming` 相互独立：

| `streaming`             | `blockStreaming: true`                                              | `blockStreaming: false`（默认）                    |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `"partial"` / `"quiet"` | 当前块的实时草稿，已完成的块作为消息保留 | 当前块的实时草稿，就地最终化 |
| `"off"`                 | 每个已完成块发送一条会通知的 Matrix 消息                     | 整个回复发送一条会通知的 Matrix 消息      |

注意：

- 如果预览增长超过了 Matrix 的单事件大小限制，OpenClaw 会停止预览流式传输并退回到仅最终结果的传递。
- 媒体回复始终会正常发送附件。如果某个过时的预览不再能安全复用，OpenClaw 会在发送最终媒体回复前将其清除。
- 当 Matrix 预览流式传输处于启用状态时，工具进度预览更新默认启用。将 `streaming.preview.toolProgress: false` 设为仅对答案文本保留预览编辑，而让工具进度走正常传递路径。
- 预览编辑会额外消耗 Matrix API 调用。如果你希望采用最保守的限流策略，请保持 `streaming: "off"`。

## 审批元数据

Matrix 原生审批提示是普通的 `m.room.message` 事件，其中 OpenClaw 特定的自定义事件内容位于 `com.openclaw.approval` 下。Matrix 允许自定义事件内容键，因此标准客户端仍会渲染文本正文，而支持 OpenClaw 的客户端可以读取结构化的审批 id、类型、状态、可用决策以及 exec/plugin 详情。

当审批提示太长，无法放入一个 Matrix 事件时，OpenClaw 会将可见文本分块，并且只在第一块上附加 `com.openclaw.approval`。允许/拒绝决策的反应会绑定到第一个事件，因此长提示会保留与单事件提示相同的审批目标。

### 用于静默最终化预览的自托管推送规则

`streaming: "quiet"` 只会在某个块或轮次最终完成后通知接收者——每用户推送规则必须匹配最终化的预览标记。完整配方请参见 [Matrix 静默预览推送规则](/channels/matrix-push-rules)（接收者令牌、推送器检查、规则安装、各 homeserver 注意事项）。

## Bot-to-bot rooms

默认情况下，来自其他已配置 OpenClaw Matrix 账户的 Matrix 消息会被忽略。

当你有意想要进行代理间 Matrix 通信时，请使用 `allowBots`：

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

- `allowBots: true` 接受来自其他已配置 Matrix 机器人账户的消息，适用于允许的房间和 DM。
- `allowBots: "mentions"` 仅在这些消息在房间中明显提及了这个机器人时才接受。DM 仍然允许。
- `groups.<room>.allowBots` 会覆盖单个房间的账户级设置。
- OpenClaw 仍会忽略来自同一个 Matrix 用户 ID 的消息，以避免自我回复循环。
- Matrix 在这里不提供原生 bot 标志；OpenClaw 将“由 bot 发出”视为“由另一个在这个 OpenClaw 网关上配置的 Matrix 账户发送”。

在共享房间中启用 bot-to-bot 流量时，请使用严格的房间允许列表和提及要求。

## 加密与验证

在加密（E2EE）房间中，出站图片事件会使用 `thumbnail_file`，因此图片预览会与完整附件一起加密。未加密房间仍然使用普通的 `thumbnail_url`。无需任何配置——插件会自动检测 E2EE 状态。

所有 `openclaw matrix` 命令都接受 `--verbose`（完整诊断信息）、`--json`（机器可读输出）和 `--account <id>`（多账户设置）。默认情况下输出简洁，并关闭内部 SDK 的详细日志。下面的示例展示的是标准形式；按需添加这些标志。

### 启用加密

```bash
openclaw matrix encryption setup
```

初始化 secret 存储和交叉签名，必要时创建房间密钥备份，然后打印状态和后续步骤。实用标志：

- `--recovery-key <key>` 在初始化前应用恢复密钥（优先使用下面文档中描述的 stdin 形式）
- `--force-reset-cross-signing` 放弃当前交叉签名身份并创建新的身份（仅在有意时使用）

对于新账户，请在创建时启用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的别名。

手动配置等价写法：

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

只有当 `Cross-signing verified` 为 `yes` 时，`Verified by owner` 才会变成 `yes`。仅有本地信任或所有者签名都不够。

`--allow-degraded-local-state` 会在不先准备 Matrix 账户的情况下返回尽力而为的诊断信息；适用于离线或部分配置的探测。

### 使用恢复密钥验证此设备

恢复密钥非常敏感——请通过 stdin 传递，而不是在命令行中直接传入。设置 `MATRIX_RECOVERY_KEY`（或命名账户的 `MATRIX_<ID>_RECOVERY_KEY`）：

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

`verify self` 会等待 `Cross-signing verified: yes`，然后才会成功退出。使用 `--timeout-ms <ms>` 可调整等待时间。

也接受字面密钥形式 `openclaw matrix verify device "<recovery-key>"`，但该密钥会出现在你的 shell 历史记录中。

### 初始化或修复交叉签名

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` 是用于加密账户的修复与设置命令。按顺序，它会：

- 初始化 secret 存储，尽可能复用现有恢复密钥
- 初始化交叉签名并上传缺失的公钥
- 标记并对当前设备进行交叉签名
- 如果尚不存在服务器端房间密钥备份，则创建一个

如果 homeserver 在上传交叉签名密钥时要求 UIA，OpenClaw 会先尝试免认证，然后是 `m.login.dummy`，最后是 `m.login.password`（需要 `channels.matrix.password`）。

实用标志：

- `--recovery-key-stdin`（配合 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …` 使用）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 放弃当前交叉签名身份（仅在有意时使用）

### 房间密钥备份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 会显示是否存在服务器端备份，以及此设备是否可以解密它。`backup restore` 会将已备份的房间密钥导入本地 crypto 存储；如果恢复密钥已经在磁盘上，可以省略 `--recovery-key-stdin`。

若要用新的基线替换损坏的备份（接受丢失无法恢复的旧历史；如果当前备份 secret 无法加载，也可以重新创建 secret 存储）：

```bash
openclaw matrix verify backup reset --yes
```

只有在你有意让之前的恢复密钥无法解锁新的备份基线时，才添加 `--rotate-recovery-key`。

### 列出、请求和响应验证

```bash
openclaw matrix verify list
```

列出所选账户的待处理验证请求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

从这个 OpenClaw 账户发送验证请求。`--own-user` 请求自我验证（你会在同一用户的另一个 Matrix 客户端中接受提示）；`--user-id`/`--device-id`/`--room-id` 用于指定他人。`--own-user` 不能与其他目标标志组合使用。

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

如果不指定 `--account <id>`，Matrix CLI 命令会使用隐式默认账户。如果你有多个命名账户且未设置 `channels.matrix.defaultAccount`，它们会拒绝猜测并要求你选择。当 E2EE 对某个命名账户被禁用或不可用时，错误会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="启动行为">
    当 `encryption: true` 时，`startupVerification` 默认值为 `"if-unverified"`。启动时，未验证设备会在另一个 Matrix 客户端中请求自我验证，跳过重复项并应用冷却期（默认 24 小时）。可通过 `startupVerificationCooldownHours` 调整，或使用 `startupVerification: "off"` 禁用。

    启动时还会运行一次保守的 crypto 初始化流程，复用当前的 secret 存储和交叉签名身份。如果初始化状态损坏，即使没有 `channels.matrix.password`，OpenClaw 也会尝试受保护的修复；如果 homeserver 需要密码 UIA，启动会记录警告并保持非致命。已经被所有者签名的设备会被保留。

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

  </Accordion>
</AccordionGroup>

## 个人资料管理

更新所选账户的 Matrix 自我资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

你可以在一次调用中同时传入这两个选项。Matrix 可直接接受 `mxc://` 头像 URL；当你传入 `http://` 或 `https://` 时，OpenClaw 会先上传文件，并将解析后的 `mxc://` URL 存储到 `channels.matrix.avatarUrl`（或每个账户的覆盖配置）中。

## 线程

Matrix 原生支持 Matrix 线程，既适用于自动回复，也适用于消息工具发送。有两个独立开关控制其行为。

### 会话路由（`sessionScope`）

`dm.sessionScope` 决定 Matrix DM 房间如何映射到 OpenClaw 会话：

- `"per-user"`（默认）：所有指向同一对端的 DM 房间共享一个会话。
- `"per-room"`：每个 Matrix DM 房间都有自己的会话键，即使对端相同也一样。

显式会话绑定始终优先于 `sessionScope`，因此已绑定的房间和线程会保持它们选定的目标会话。

### 回复线程化（`threadReplies`）

`threadReplies` 决定机器人把回复发到哪里：

- `"off"`：回复为顶层消息。进入的线程消息仍保留在父会话上。
- `"inbound"`：只有当输入消息本身已经在某个线程中时，才在该线程内回复。
- `"always"`：在由触发消息根节点所根植的线程中回复；从第一次触发开始，该对话会通过一个匹配的、线程作用域的会话进行路由。

`dm.threadReplies` 仅对 DMs 覆盖此行为 - 例如，保持房间线程隔离，同时保持 DMs 为扁平结构。

### 线程继承与斜杠命令

- 入站的线程消息会将线程根消息作为额外的代理上下文包含进来。
- 当消息工具发送目标为同一房间（或同一 DM 用户目标）时，会自动继承当前 Matrix 线程，除非提供了显式的 `threadId`。
- 只有当当前会话元数据能够证明同一 Matrix 账户上的同一 DM 对端时，DM 用户目标复用才会生效；否则 OpenClaw 会回退到正常的按用户作用域路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`，以及绑定线程的 `/acp spawn` 都可在 Matrix 房间和 DM 中使用。
- 顶层 `/focus` 会创建一个新的 Matrix 线程，并在启用 `threadBindings.spawnSessions` 时将其绑定到目标会话。
- 在现有 Matrix 线程中运行 `/focus` 或 `/acp spawn --thread here` 会就地绑定该线程。

当 OpenClaw 检测到某个 Matrix DM 房间在同一个共享会话上与另一个 DM 房间冲突时，它会在该房间中发送一次性的 `m.notice`，指向 `/focus` 逃生通道，并建议更改 `dm.sessionScope`。该通知仅在启用了线程绑定时出现。

## ACP 会话绑定

Matrix 房间、DM 和现有 Matrix 线程都可以在不改变聊天表面的情况下，转换为持久的 ACP 工作区。

快速操作流程：

- 在你想继续使用的 Matrix DM、房间或现有线程中运行 `/acp spawn codex --bind here`。
- 在顶层 Matrix DM 或房间中，当前 DM/房间仍保持为聊天表面，未来消息会路由到新生成的 ACP 会话。
- 在现有 Matrix 线程中，`--bind here` 会就地绑定当前线程。
- `/new` 和 `/reset` 会就地重置同一个已绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

说明：

- `--bind here` 不会创建子 Matrix 线程。
- `threadBindings.spawnSessions` 控制 `/acp spawn --thread auto|here`，在这些情况下 OpenClaw 需要创建或绑定一个子 Matrix 线程。

### 线程绑定配置

Matrix 会从 `session.threadBindings` 继承全局默认值，同时也支持按通道覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

Matrix 线程绑定会话默认开启：

- 将 `threadBindings.spawnSessions` 设为 `false` 可阻止顶层 `/focus` 和 `/acp spawn --thread auto|here` 创建/绑定 Matrix 线程。
- 当原生子代理线程生成不应分叉父转录时，将 `threadBindings.defaultSpawnContext` 设为 `"isolated"`。

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
| `ackReaction`           | per-account → channel → `messages.ackReaction` → agent identity emoji fallback      |
| `ackReactionScope`      | per-account → channel → `messages.ackReactionScope` → default `"group-mentions"`    |
| `reactionNotifications` | per-account → channel → default `"own"`                                              |

`reactionNotifications: "own"` 会转发新增的 `m.reaction` 事件，当它们针对的是机器人撰写的 Matrix 消息时；`"off"` 会禁用反应系统事件。反应移除不会被合成为系统事件，因为 Matrix 将其表现为 redaction，而不是独立的 `m.reaction` 移除。

## 历史上下文

- `channels.matrix.historyLimit` 控制当某个 Matrix 房间消息触发代理时，会将多少最近的房间消息作为 `InboundHistory` 包含进来。若未设置，则回退到 `messages.groupChat.historyLimit`；如果两者都未设置，生效默认值为 `0`。设为 `0` 可禁用。
- Matrix 房间历史仅限于房间。DM 仍然使用正常的会话历史。
- Matrix 房间历史仅对待处理消息生效：OpenClaw 会缓存尚未触发回复的房间消息，然后在出现提及或其他触发条件时快照该窗口。
- 当前触发消息不包含在 `InboundHistory` 中；它会保留在该轮的主入站正文里。
- 对同一个 Matrix 事件的重试会复用原始历史快照，而不是随着后续房间消息继续前移。

## 上下文可见性

Matrix 支持共享的 `contextVisibility` 控制，用于附加的房间上下文，例如获取到的回复文本、线程根消息和待处理历史。

- `contextVisibility: "all"` 为默认值。附加上下文会按接收时的样子保留。
- `contextVisibility: "allowlist"` 会将附加上下文过滤为仅向当前房间/用户允许名单检查中被允许的发送者可见。
- `contextVisibility: "allowlist_quote"` 的行为类似 `allowlist`，但仍会保留一条明确引用的回复。

此设置影响的是附加上下文的可见性，而不是入站消息本身是否可以触发回复。
触发授权仍来自 `groupPolicy`、`groups`、`groupAllowFrom` 和 DM 策略设置。

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

如果某个未获批准的 Matrix 用户在批准前持续给你发消息，OpenClaw 会复用同一个待处理配对代码，并且可能在短暂冷却后发送提醒回复，而不是生成新的代码。

有关共享 DM 配对流程和存储布局，请参阅 [Pairing](/channels/pairing)。

## 直接房间修复

如果私信状态出现不同步，OpenClaw 可能会保留过时的 `m.direct` 映射，这些映射指向旧的单人房间，而不是当前活跃的 DM。检查某个对端的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

这两个命令都接受 `--account <id>`，用于多账户配置。修复流程：

- 优先选择一个已经在 `m.direct` 中映射的严格 1:1 DM
- 其次回退到当前已加入的、与该用户对应的任何严格 1:1 DM
- 如果不存在健康的 DM，则创建一个新的直接房间并重写 `m.direct`

它不会自动删除旧房间。它会选取健康的 DM 并更新映射，使未来的 Matrix 发送、验证通知和其他直接消息流程指向正确的房间。

## Exec 批准

Matrix 可以作为原生批准客户端使用。请在 `channels.matrix.execApprovals` 下配置（或者为每个账户在 `channels.matrix.accounts.<account>.execApprovals` 下覆盖）：

- `enabled`: 通过 Matrix 原生提示传递批准。当未设置或为 `"auto"` 时，只要至少能解析出一个批准者，Matrix 就会自动启用。显式设为 `false` 可禁用。
- `approvers`: 允许批准 exec 请求的 Matrix 用户 ID（`@owner:example.org`）。可选 - 回退到 `channels.matrix.dm.allowFrom`。
- `target`: 提示发送到哪里。`"dm"`（默认）发送到批准者的 DM；`"channel"` 发送到发起的 Matrix 房间或 DM；`"both"` 同时发送到两者。
- `agentFilter` / `sessionFilter`: 可选允许名单，用于指定哪些代理/会话会触发 Matrix 投递。

不同批准类型的授权略有差异：

- **Exec 批准** 使用 `execApprovals.approvers`，回退到 `dm.allowFrom`。
- **插件批准** 仅通过 `dm.allowFrom` 授权。

两种类型都共享 Matrix 反应快捷方式和消息更新。批准者会在主批准消息上看到反应快捷方式：

- `✅` 允许一次
- `❌` 拒绝
- `♾️` 始终允许（当有效的 exec 策略允许时）

备用斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析出的批准者才能批准或拒绝。用于 exec 批准的频道投递会包含命令文本 - 仅在受信任的房间中启用 `channel` 或 `both`。

相关：[Exec 批准](/tools/exec-approvals)。

## 斜杠命令

斜杠命令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）可以直接在私信中使用。在房间中，OpenClaw 也能识别以机器人自身的 Matrix 提及为前缀的命令，因此 `@bot:server /new` 会触发命令路径，而不需要自定义提及正则。这使机器人能够响应 Element 和类似客户端在用户先用 Tab 补全机器人再输入命令时发出的房间式 `@mention /command` 消息。

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

- 将 `defaultAccount` 设为首选的命名账户，以供隐式路由、探测和 CLI 命令使用。
- 如果你有多个账户，并且其中一个账户就叫 `default`，即使未设置 `defaultAccount`，OpenClaw 也会隐式使用它。
- 如果你有多个命名账户且未选择默认账户，CLI 命令会拒绝猜测 - 请设置 `defaultAccount` 或传入 `--account <id>`。
- 只有当顶层 `channels.matrix.*` 配置块的认证完整时（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`），它才会被视为隐式的 `default` 账户。只要缓存的凭据覆盖了认证，命名账户仍可通过 `homeserver` + `userId` 被发现。

**提升：**

- 当 OpenClaw 在修复或设置过程中将单账户配置提升为多账户配置时，如果已存在命名账户或 `defaultAccount` 已指向某个账户，它会保留现有的命名账户。只有 Matrix 认证/引导键会移动到提升后的账户；共享的投递策略键仍保留在顶层。

有关共享的多账户模式，请参见[配置参考](/gateway/config-channels#multi-account-all-channels)。

## 私有/LAN homeserver

默认情况下，OpenClaw 会阻止私有/内部 Matrix homeserver，以防止 SSRF，除非你
为每个账户显式选择允许。

如果你的 homeserver 运行在 localhost、LAN/Tailscale IP 或内部主机名上，请为该 Matrix 账户启用
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

此显式允许仅适用于受信任的私有/内部目标。像
`http://matrix.example.org:8008` 这样的公网明文 homeserver 仍然会被阻止。尽可能优先使用 `https://`。

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

命名账户可以通过 `channels.matrix.accounts.<id>.proxy` 覆盖顶层默认值。
OpenClaw 对运行时 Matrix 流量和账户状态探测使用相同的代理设置。

## 目标解析

当 OpenClaw 询问你房间或用户目标时，Matrix 在任何地方都接受以下目标形式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房间 ID 区分大小写。配置显式投递目标、cron 作业、绑定或白名单时，请使用来自 Matrix 的准确房间 ID 大小写。
OpenClaw 会将内部会话键规范化后再存储，因此这些小写键并不是 Matrix 投递 ID 的可靠来源。

实时目录查询使用已登录的 Matrix 账户：

- 用户查询会在该 homeserver 上查询 Matrix 用户目录。
- 房间查询会先直接接受显式房间 ID 和别名，然后回退到为该账户搜索已加入房间的名称。
- 已加入房间的名称查找是尽力而为。如果某个房间名称无法解析为 ID 或别名，则会在运行时白名单解析中被忽略。

## 配置参考

白名单样式字段（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`）接受完整的 Matrix 用户 ID（最安全）。精确目录匹配会在启动时以及监控器运行期间白名单发生变化时解析；无法解析的条目在运行时会被忽略。出于同样原因，房间白名单更倾向于使用房间 ID 或别名。

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

- `groupPolicy`：`"open"`、`"allowlist"` 或 `"disabled"`。默认值：`"allowlist"`。
- `groupAllowFrom`：房间流量的用户 ID 白名单。
- `dm.enabled`：当为 `false` 时，忽略所有私信。默认值：`true`。
- `dm.policy`：`"pairing"`（默认）、`"allowlist"`、`"open"` 或 `"disabled"`。在机器人加入并将房间分类为私信之后生效；不影响邀请处理。
- `dm.allowFrom`：私信流量的用户 ID 白名单。
- `dm.sessionScope`：`"per-user"`（默认）或 `"per-room"`。
- `dm.threadReplies`：仅限私信的回复线程覆盖（`"off"`、`"inbound"`、`"always"`）。
- `allowBots`：接受来自其他已配置 Matrix 机器人账户的消息（`true` 或 `"mentions"`）。
- `allowlistOnly`：当为 `true` 时，强制所有启用的私信策略（除 `"disabled"` 外）和 `"open"` 房间策略改为 `"allowlist"`。不会更改 `"disabled"` 策略。
- `autoJoin`：`"always"`、`"allowlist"` 或 `"off"`。默认值：`"off"`。适用于每个 Matrix 邀请，包括私信式邀请。
- `autoJoinAllowlist`：当 `autoJoin` 为 `"allowlist"` 时允许的房间/别名。别名条目会针对 homeserver 解析，而不是针对被邀请房间声明的状态。
- `contextVisibility`：补充上下文可见性（默认 `"all"`，也可为 `"allowlist"`、`"allowlist_quote"`）。

### 回复行为

- `replyToMode`：`"off"`、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`：`"off"`、`"inbound"` 或 `"always"`。
- `threadBindings`：用于线程绑定会话路由和生命周期的按通道覆盖。
- `streaming`：`"off"`（默认）、`"partial"`、`"quiet"`，或对象形式 `{ mode, preview: { toolProgress } }`。`true` ↔ `"partial"`，`false` ↔ `"off"`。
- `blockStreaming`：当为 `true` 时，完成的助手块会作为单独的进度消息保留。
- `markdown`：用于出站文本的可选 Markdown 渲染配置。
- `responsePrefix`：添加到出站回复前的可选字符串。
- `textChunkLimit`：当 `chunkMode: "length"` 时，出站分块的字符数上限。默认值：`4000`。
- `chunkMode`：`"length"`（默认，按字符数拆分）或 `"newline"`（按行边界拆分）。
- `historyLimit`：当房间消息触发代理时，作为 `InboundHistory` 包含的最近房间消息数量。回退到 `messages.groupChat.historyLimit`；有效默认值为 `0`（禁用）。
- `mediaMaxMb`：出站发送和入站处理的媒体大小上限，单位 MB。

### 反应设置

- `ackReaction`：此通道/账户的确认反应覆盖。
- `ackReactionScope`：范围覆盖（默认 `"group-mentions"`，以及 `"group-all"`、`"direct"`、`"all"`、`"none"`、`"off"`）。
- `reactionNotifications`：入站反应通知模式（默认 `"own"`，或 `"off"`）。

### 工具与按房间覆盖

- `actions`：按操作的工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：按房间的策略映射。会话身份在解析后使用稳定的房间 ID。（`rooms` 是旧别名。）
  - `groups.<room>.account`：将一个继承的房间条目限制到特定账户。
  - `groups.<room>.allowBots`：按房间覆盖通道级设置（`true` 或 `"mentions"`）。
  - `groups.<room>.users`：按房间的发送者白名单。
  - `groups.<room>.tools`：按房间的工具允许/拒绝覆盖。
  - `groups.<room>.autoReply`：按房间的提及门控覆盖。`true` 会为该房间禁用提及要求；`false` 会将其重新启用。
  - `groups.<room>.skills`：按房间的技能过滤器。
  - `groups.<room>.systemPrompt`：按房间的系统提示片段。

### Exec 审批设置

- `execApprovals.enabled`：通过 Matrix 原生提示传递 exec 审批。
- `execApprovals.approvers`：允许批准的 Matrix 用户 ID。回退到 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（默认）、`"channel"` 或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：用于投递的可选代理/会话白名单。

## 相关内容

- [Channels Overview](/channels) - 所有支持的通道
- [Pairing](/channels/pairing) - DM 认证与配对流程
- [Groups](/channels/groups) - 群聊行为与提及门控
- [Channel Routing](/channels/channel-routing) - 消息的会话路由
- [Security](/gateway/security) - 访问模型与加固
