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

Matrix 作为内置插件随当前的 OpenClaw 版本发布，因此正常的打包构建不需要单独安装。

如果您使用的是旧版本或排除了 Matrix 的自定义安装，请手动安装：

从 npm 安装：

```bash
openclaw plugins install @openclaw/matrix
```

从本地 checkout 安装：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

参见 [插件](/tools/plugin) 了解插件行为和安装规则。

## 设置步骤

1. 确保 Matrix 插件可用。
   - 当前打包的 OpenClaw 版本已捆绑它。
   - 旧版本/自定义安装可以使用上述命令手动添加。
2. 在您的 homeserver 上创建 Matrix 账户。
3. 配置 `channels.matrix`，使用：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重启网关。
5. 与机器人开始私信或邀请它加入房间。
   - 新的 Matrix 邀请仅在 `channels.matrix.autoJoin` 允许时生效。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 向导会询问：

- homeserver URL
- 认证方式：访问令牌或密码
- 用户 ID（仅密码认证）
- 可选的设备名称
- 是否启用 E2EE
- 是否配置房间访问和邀请自动加入

关键向导行为：

- 如果 Matrix 认证环境变量已存在且该账户尚未在配置中保存认证，向导会提供将认证保留在环境变量中的快捷方式。
- 账户名称会标准化为账户 ID。例如，`Ops Bot` 变为 `ops-bot`。
- DM 白名单条目直接接受 `@user:server`；显示名称仅在实时目录查找找到完全匹配时才有效。
- 房间白名单条目直接接受房间 ID 和别名。优先使用 `!room:server` 或 `#alias:server`；运行时白名单解析会忽略未解析的名称。
- 在邀请自动加入白名单模式下，仅使用稳定的邀请目标：`!roomId:server`、`#alias:server` 或 `*`。纯房间名称会被拒绝。
- 要在保存前解析房间名称，请使用 `openclaw channels resolve --channel matrix "Project Room"`。

<Warning>
`channels.matrix.autoJoin` 默认为 `off`。

如果您不设置它，机器人将不会加入被邀请的房间或新的私信式邀请，因此除非您先手动加入，否则它不会出现在新群组或被邀请的私信中。

将 `autoJoin: "allowlist"` 与 `autoJoinAllowlist` 一起设置以限制它接受的邀请，或者如果您希望它加入每个邀请，则设置 `autoJoin: "always"`。

在 `allowlist` 模式下，`autoJoinAllowlist` 仅接受 `!roomId:server`、`#alias:server` 或 `*`。
</Warning>

允许列表示例：

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

加入每个邀请：

```json5
{
  channels: {
    matrix: {
      autoJoin: "always",
    },
  },
}
```

最小化基于令牌的设置：

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

基于密码的设置（登录后缓存令牌）：

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

Matrix 会将缓存的凭据存储在 `~/.openclaw/credentials/matrix/` 中。
默认账户使用 `credentials.json`；命名账户使用 `credentials-<account>.json`。
当那里存在缓存的凭据时，即使当前配置中未直接设置认证信息，OpenClaw 也会将矩阵视为已配置，用于设置、诊断和通道状态发现。

环境变量对应项（当配置键未设置时使用）：

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

对于非默认账户，使用账户范围的环境变量：

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

账户 `ops` 的示例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

对于规范化后的账户 ID `ops-bot`，使用：

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix 会转义账户 ID 中的标点符号，以保持作用域环境变量无冲突。
例如，`-` 变为 `_X2D_`，所以 `ops-prod` 映射为 `MATRIX_OPS_X2D_PROD_*`。

仅当这些认证环境变量已存在且所选账户配置中尚未保存矩阵认证时，交互式向导才会提供环境变量快捷方式。

`MATRIX_HOMESERVER` 不能从工作区 `.env` 中设置；请参见 [Workspace `.env` files](/gateway/security)。

## Configuration example

这是一个包含私信配对、房间允许列表和启用 E2EE 的实用基线配置：

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
        "!roomid:example.org": {
          requireMention: true,
        },
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

`autoJoin` 适用于所有 Matrix 邀请，包括私信式邀请。OpenClaw 无法可靠地在邀请时分类受邀房间是私信还是群组，因此所有邀请都会先经过 `autoJoin`。`dm.policy` 在机器人加入并将房间分类为私信后应用。

## 流式预览

矩阵回复流式传输是可选的。

当您希望 OpenClaw 发送单个实时预览回复，在模型生成文本时原地编辑该预览，然后在回复完成后最终确定它时，将 `channels.matrix.streaming` 设置为 `"partial"`：

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` 是默认值。OpenClaw 等待最终回复并一次性发送。
- `streaming: "partial"` 为当前助手块创建一个可编辑的预览消息，使用正常矩阵文本消息。这保留了矩阵传统的预览优先通知行为，因此原生客户端可能会在第一个流式预览文本而不是完成的块上发出通知。
- `streaming: "quiet"` 为当前助手块创建一个可编辑的静默预览通知。仅当您还为最终确定的预览编辑配置了接收者推送规则时才使用此选项。
- `blockStreaming: true` 启用单独的矩阵进度消息。启用预览流式传输时，矩阵会保留当前块的实时草稿，并将完成的块保留为单独的消息。
- 当预览流式传输开启且 `blockStreaming` 关闭时，矩阵会原地编辑实时草稿，并在块或回合完成时最终确定该事件。
- 如果预览不再适合一个矩阵事件，OpenClaw 将停止预览流式传输并回退到正常最终交付。
- 媒体回复仍然正常发送附件。如果过时的预览无法再安全重用，OpenClaw 会在发送最终媒体回复之前将其移除。
- 预览编辑需要额外的矩阵 API 调用。如果您希望最保守的速率限制行为，请关闭流式传输。

`blockStreaming` 本身不会启用草稿预览。
使用 `streaming: "partial"` 或 `streaming: "quiet"` 进行预览编辑；仅当您还希望完成的助手块作为单独的进度消息保持可见时，才添加 `blockStreaming: true`。

如果您需要原生矩阵通知而不使用自定义推送规则，请使用 `streaming: "partial"` 以实现预览优先行为，或关闭 `streaming` 以仅进行最终交付。使用 `streaming: "off"` 时：

- `blockStreaming: true` 将每个完成的块作为正常的通知矩阵消息发送。
- `blockStreaming: false` 仅将最终完成的回复作为正常的通知矩阵消息发送。

### 用于静默最终预览的自托管推送规则

Quiet streaming (`streaming: "quiet"`) 仅在块或回合最终确定后通知接收者——每个用户的推送规则都必须匹配最终确定的预览标记。完整设置请参见 [Matrix push rules for quiet previews](/channels/matrix-push-rules)（接收者令牌、pusher 检查、规则安装、各 homeserver 注意事项）。

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

启用加密：

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

验证命令（所有命令都接受 `--verbose` 用于诊断，`--json` 用于机器可读输出）：

```bash
openclaw matrix verify status
```

详细状态（完整诊断）：

```bash
openclaw matrix verify status --verbose
```

在机器可读输出中包含存储的恢复密钥：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引导交叉签名和验证状态：

```bash
openclaw matrix verify bootstrap
```

详细引导诊断：

```bash
openclaw matrix verify bootstrap --verbose
```

在引导前强制重置交叉签名身份：

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

使用恢复密钥验证此设备：

```bash
openclaw matrix verify device "<your-recovery-key>"
```

此命令报告三个独立状态：

- `Recovery key accepted`：Matrix 已接受用于密钥存储或设备信任的恢复密钥。
- `Backup usable`：可以使用受信任的恢复材料加载房间密钥备份。
- `Device verified by owner`：当前 OpenClaw 设备具有完整的 Matrix 交叉签名身份信任。

详细或 JSON 输出中的 `Signed by owner` 仅用于诊断。OpenClaw 不会
仅凭这一点就将其视为足够，除非 `Cross-signing verified` 也是 `yes`。

即使恢复密钥可以解锁备份材料，只要完整的 Matrix 身份信任不完整，
该命令仍会以非零状态退出。在这种情况下，请从另一个 Matrix 客户端完成
自我验证：

```bash
openclaw matrix verify self
```

在另一个 Matrix 客户端中接受请求，比较 SAS 表情符号或数字，
并且仅在它们匹配时输入 `yes`。命令会等待 Matrix 报告
`Cross-signing verified: yes` 后再成功退出。

仅在您有意想要替换当前交叉签名身份时，才使用 `verify bootstrap --force-reset-cross-signing`。

详细设备验证信息：

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

检查房间密钥备份健康状况：

```bash
openclaw matrix verify backup status
```

详细备份健康诊断：

```bash
openclaw matrix verify backup status --verbose
```

从服务器备份恢复房间密钥：

```bash
openclaw matrix verify backup restore
```

交互式自我验证流程：

```bash
openclaw matrix verify self
```

对于更低级别或入站验证请求，请使用：

```bash
openclaw matrix verify accept <id>
openclaw matrix verify start <id>
openclaw matrix verify sas <id>
openclaw matrix verify confirm-sas <id>
```

使用 `openclaw matrix verify cancel <id>` 取消请求。

详细恢复诊断：

```bash
openclaw matrix verify backup restore --verbose
```

删除当前的服务器备份并创建一个新的备份基线。如果存储的备份密钥无法干净地加载，此重置还可以重新创建秘密存储，以便未来的冷启动可以加载新的备份密钥：

```bash
openclaw matrix verify backup reset --yes
```

默认情况下，所有 `verify` 命令都很简洁（包括安静的内部 SDK 日志记录），仅在使用 `--verbose` 时显示详细诊断。
在脚本编写时使用 `--json` 获取完整的机器可读输出。

在多账户设置中，除非您传递 `--account <id>`，否则 Matrix CLI 命令使用隐式的 Matrix 默认账户。
如果您配置了多个命名账户，请先设置 `channels.matrix.defaultAccount`，否则这些隐式 CLI 操作将停止并要求您明确选择一个账户。
当您希望验证或设备操作明确针对命名账户时，请使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

当加密被禁用或对命名账户不可用时，Matrix 警告和验证错误会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="What verified means">
    只有当您自己的交叉签名身份为其签名时，OpenClaw 才将设备视为已验证。`verify status --verbose` 会显示三个信任信号：

    - `Locally trusted`：仅由此客户端信任
    - `Cross-signing verified`：SDK 报告已通过交叉签名验证
    - `Signed by owner`：由您自己的自签名密钥签名

    只有在存在交叉签名验证时，`Verified by owner` 才会变为 `yes`。
    仅靠本地信任或所有者签名不足以让 OpenClaw 将
    该设备视为完全已验证。

  </Accordion>

  <Accordion title="What bootstrap does">
    `verify bootstrap` 是用于加密账户的修复和设置命令。其执行顺序为：

    - 引导秘密存储，尽可能重用现有恢复密钥
    - 引导交叉签名并上传缺失的公开交叉签名密钥
    - 标记并对当前设备进行交叉签名
    - 如果服务器端房间密钥备份不存在，则创建一个

    如果 homeserver 需要 UIA 才能上传交叉签名密钥，OpenClaw 会先尝试无认证，然后尝试 `m.login.dummy`，再尝试 `m.login.password`（需要 `channels.matrix.password`）。仅在有意放弃当前身份时使用 `--force-reset-cross-signing`。

  </Accordion>

  <Accordion title="Fresh backup baseline">
    如果您希望让未来的加密消息继续工作，并接受丢失无法恢复的旧历史：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

    添加 `--account <id>` 以针对命名账户。这也可以在当前备份密钥无法安全加载时重新创建秘密存储。

  </Accordion>

  <Accordion title="Startup behavior">
    在启用 `encryption: true` 时，`startupVerification` 的默认值为 `"if-unverified"`。启动时，未验证的设备会在另一个 Matrix 客户端中请求自我验证，跳过重复项并应用冷却时间。可通过 `startupVerificationCooldownHours` 调整，或使用 `startupVerification: "off"` 关闭。

    启动时还会运行一次保守的加密引导流程，它会重用当前的秘密存储和交叉签名身份。如果引导状态损坏，即使没有 `channels.matrix.password`，OpenClaw 也会尝试进行受保护的修复；如果 homeserver 需要密码 UIA，启动时会记录警告但不会致命退出。已经由所有者签名的设备会被保留。

    完整升级流程请参见 [Matrix migration](/install/migrating-matrix)。

  </Accordion>

  <Accordion title="Verification notices">
    Matrix 会将验证生命周期通知作为 `m.notice` 消息发布到严格的 DM 验证房间中：请求、就绪（带有“按表情符号验证”指导）、开始/完成，以及可用时的 SAS（表情符号/数字）详情。

    来自另一个 Matrix 客户端的传入请求会被跟踪并自动接受。对于自我验证，OpenClaw 会自动启动 SAS 流程，并在可用表情符号验证后确认自身这一侧——您仍需要在 Matrix 客户端中比较并确认 “They match”。

    验证系统通知不会转发到代理聊天管道。

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

使用以下命令更新所选账户的 Matrix 自我资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

当您想明确指定某个命名的 Matrix 账户时，请添加 `--account <id>`。

Matrix 直接接受 `mxc://` 头像 URL。 当您传入 `http://` 或 `https://` 头像 URL 时，OpenClaw 会先将其上传到 Matrix，并把解析后的 `mxc://` URL 存回 `channels.matrix.avatarUrl`（或所选账户覆盖项）中。

## 线程

矩阵支持原生矩阵线程，用于自动回复和消息工具发送。

- `dm.sessionScope: "per-user"`（默认）会让 Matrix 私信路由保持按发送者分组，因此多个私信房间在解析到同一个对端时可以共享一个会话。
- `dm.sessionScope: "per-room"` 会将每个 Matrix 私信房间隔离到各自的会话键中，同时仍然使用正常的私信认证和允许列表检查。
- 显式的 Matrix 对话绑定仍然优先于 `dm.sessionScope`，因此已绑定的房间和线程会保留它们选定的目标会话。
- `threadReplies: "off"` 会让回复保持为顶层，并让入站线程消息保留在父会话上。
- `threadReplies: "inbound"` 仅当入站消息已经位于该线程中时，才在该线程内回复。
- `threadReplies: "always"` 会让房间回复保持在以触发消息为根的线程中，并通过从第一个触发消息开始匹配的线程作用域会话来路由该对话。
- `dm.threadReplies` 会覆盖仅适用于私信的顶层设置。例如，您可以让房间线程保持隔离，同时让私信保持平铺。
- 入站线程消息会将线程根消息作为额外的代理上下文。
- 消息工具发送会自动继承当前 Matrix 线程，只要目标是同一个房间，或同一个私信用户目标，除非显式提供了 `threadId`。
- 只有当当前会话元数据证明同一 Matrix 账户上的同一私信对端时，才会启用相同会话的私信用户目标复用；否则 OpenClaw 会回退到正常的按用户路由。
- 当 OpenClaw 发现某个 Matrix 私信房间与同一共享 Matrix 私信会话上的另一个私信房间冲突时，如果已启用线程绑定并且提供了 `dm.sessionScope` 提示，它会在该房间中发布一次性的 `m.notice`，并提供 `/focus` 逃生口。
- Matrix 支持运行时线程绑定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和线程绑定的 `/acp spawn` 都可在 Matrix 房间和私信中使用。
- 在顶层 Matrix 房间/私信中使用 `/focus` 会创建一个新的 Matrix 线程，并在 `threadBindings.spawnSubagentSessions=true` 时将其绑定到目标会话。
- 在现有 Matrix 线程内部运行 `/focus` 或 `/acp spawn --thread here` 时，则会改为绑定当前线程。

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

Matrix 支持出站反应操作、入站反应通知和入站确认反应。

- 出站反应工具由 `channels["matrix"].actions.reactions` 控制。
- `react` 向特定 Matrix 事件添加反应。
- `reactions` 列出特定 Matrix 事件的当前反应摘要。
- `emoji=""` 移除机器人账户自己在该事件上的反应。
- `remove: true` 仅从机器人账户移除指定的表情符号反应。

确认反应用标准的 OpenClaw 解析顺序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退

确认反应范围按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反应通知模式按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 默认：`own`

行为：

- `reactionNotifications: "own"` 会转发添加的 `m.reaction` 事件，当它们针对机器人创建的 Matrix 消息时。
- `reactionNotifications: "off"` 会禁用反应系统事件。
- 反应移除不会被合成为系统事件，因为 Matrix 将其显示为 redaction，而不是独立的 `m.reaction` 移除。

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
        "!roomid:example.org": {
          requireMention: true,
        },
      },
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

如果未批准的 Matrix 用户在批准前持续向您发送消息，OpenClaw 会重复使用相同的待处理配对代码，并可能在短暂冷却期后再次发送提醒回复，而不是生成新代码。

有关共享私信配对流程和存储布局，请参阅 [配对](/channels/pairing)。

## 直接房间修复

如果私信状态不同步，OpenClaw 可能会产生过时的 `m.direct` 映射，指向旧的单人房间而非实时私信。使用以下命令检查与某用户的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下命令修复：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修复流程：

- 优先选择已在 `m.direct` 中映射的严格 1:1 私信
- 若无映射，则回退到与该用户当前加入的任何严格 1:1 私信
- 若无健康私信存在，则创建新的直接房间并重写 `m.direct`

修复流程不会自动删除旧房间。它只会选择健康的私信并更新映射，使新的 Matrix 发送、验证通知和其他私信流程重新定位到正确的房间。

## 执行审批

Matrix 可以作为 Matrix 账户的原生审批客户端。原生  
私信/频道路由控件仍位于执行审批配置下：

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers`（可选；回退到 `channels.matrix.dm.allowFrom`）
- `channels.matrix.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

审批人必须是 Matrix 用户 ID，例如 `@owner:example.org`。当 `enabled` 未设置或为 `"auto"` 且至少可以解析一个审批人时，Matrix 会自动启用原生审批。执行审批优先使用 `execApprovals.approvers`，并可以回退到 `channels.matrix.dm.allowFrom`。插件审批通过 `channels.matrix.dm.allowFrom` 授权。设置 `enabled: false` 以明确禁用 Matrix 作为原生审批客户端。否则，审批请求将回退到其他配置的审批路由或审批回退策略。

Matrix 原生路由支持两种审批类型：

- `channels.matrix.execApprovals.*` 控制 Matrix 审批提示的原生私信/频道扇出模式。
- 执行审批使用从 `execApprovals.approvers` 或 `channels.matrix.dm.allowFrom` 获取的执行审批人集合。
- 插件审批使用来自 `channels.matrix.dm.allowFrom` 的 Matrix 私信允许列表。
- Matrix 反应快捷方式和消息更新适用于执行和插件审批。

交付规则：

- `target: "dm"` 将审批提示发送给审批人私信
- `target: "channel"` 将提示发送回发起的 Matrix 房间或私信
- `target: "both"` 发送给审批人私信和发起的 Matrix 房间或私信

Matrix 审批提示在主审批消息上种子化反应快捷方式：

- `✅` = 允许一次
- `❌` = 拒绝
- `♾️` = 当有效执行策略允许该决定时始终允许

审批人可以在该消息上反应或使用回退斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always` 或 `/approve <id> deny`。

只有已解析的审批人才能批准或拒绝。对于执行审批，频道交付包括命令文本，因此仅在受信任的房间中启用 `channel` 或 `both`。

每账户覆盖：

- `channels.matrix.accounts.<account>.execApprovals`

相关文档：[执行审批](/tools/exec-approvals)

## Slash 命令

Matrix slash commands（例如 `/new`、`/reset`、`/model`）可直接在私信中使用。在房间中，OpenClaw 还会识别以机器人自身 Matrix 提及为前缀的 slash 命令，因此 `@bot:server /new` 会触发命令路径，而不需要自定义提及正则表达式。这使机器人能够响应 Element 和类似客户端在用户通过 Tab 补全机器人后输入命令时发出的房间风格 `@mention /command` 消息。

授权规则仍然适用：命令发送者必须满足私信或房间的允许列表/所有者策略，就像普通消息一样。

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

顶层 `channels.matrix` 的值会作为命名账户的默认值，除非某个账户进行了覆盖。  
您可以使用 `groups.<room>.account` 将继承的房间条目限定到一个 Matrix 账户。  
没有 `account` 的条目会在所有 Matrix 账户之间共享，而带有 `account: "default"` 的条目在默认账户直接配置在顶层 `channels.matrix.*` 时仍然有效。  
部分共享认证默认值本身不会创建单独的隐式默认账户。OpenClaw 只有在该默认项具备新的认证信息（`homeserver` 加 `accessToken`，或 `homeserver` 加 `userId` 和 `password`）时，才会合成顶层 `default` 账户；当缓存凭据稍后满足认证条件时，命名账户仍可通过 `homeserver` 加 `userId` 保持可发现。  
如果 Matrix 已经恰好有一个命名账户，或者 `defaultAccount` 指向一个已存在的命名账户键，那么单账户到多账户的修复/设置提升会保留该账户，而不是创建新的 `accounts.default` 条目。只有 Matrix 认证/启动键会移动到该提升后的账户中；共享投递策略键仍保留在顶层。  
当您希望 OpenClaw 在隐式路由、探测和 CLI 操作中优先使用某个命名的 Matrix 账户时，请设置 `defaultAccount`。  
如果配置了多个 Matrix 账户且其中一个账户 id 为 `default`，即使未设置 `defaultAccount`，OpenClaw 也会隐式使用该账户。  
如果您配置了多个命名账户，而需要依赖隐式账户选择的 CLI 命令，请设置 `defaultAccount` 或传入 `--account <id>`。  
当您希望为 `openclaw matrix verify ...` 和 `openclaw matrix devices ...` 覆盖该隐式选择时，请传入 `--account <id>`。

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

## 相关内容

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和加固
