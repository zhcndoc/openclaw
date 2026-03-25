---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - 在 OpenClaw 中设置 Matrix
  - 配置 Matrix E2EE 和验证
title: "Matrix"
---

# Matrix（插件）

Matrix 是 OpenClaw 的 Matrix 频道插件。
它使用官方的 `matrix-js-sdk`，支持私信（DM）、房间、线程、媒体、反应、投票、位置和端到端加密（E2EE）。

## 需要插件

Matrix 是一个插件，未与 OpenClaw 核心捆绑。

从 npm 安装：

```bash
openclaw plugins install @openclaw/matrix
```

从本地 checkout 安装：

```bash
openclaw plugins install ./extensions/matrix
```

参见[插件](/tools/plugin)了解插件行为和安装规则。

## 设置步骤

1. 安装插件。
2. 在您的 homeserver 上创建 Matrix 账户。
3. 配置 `channels.matrix`，使用以下任一方式：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重启网关。
5. 与机器人开始私信或将其邀请到房间。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 向导实际询问的内容：

- homeserver URL
- 认证方法：访问令牌或密码
- 仅在选择密码认证时询问用户 ID
- 可选设备名称
- 是否启用 E2EE
- 是否立即配置 Matrix 房间访问

需要注意的向导行为：

- 如果所选账户已存在 Matrix 认证环境变量，且该账户配置中尚未保存认证信息，向导会提供环境变量快捷方式，并仅写入该账户的 `enabled: true`。
- 当以交互方式添加另一个 Matrix 账户时，输入的账户名称会被规范化为配置和环境中使用的账户 ID。例如，`Ops Bot` 变为 `ops-bot`。
- 私信允许列表提示可直接接受完整的 `@user:server` 值。仅当实时目录查找找到唯一匹配项时，显示名称才有效；否则向导会要求您使用完整的 Matrix ID 重试。
- 房间允许列表提示可直接接受房间 ID 和别名。它们也可以实时解析已加入房间的名称，但未解析的名称仅在设置期间按输入内容保留，随后会被运行时允许列表解析忽略。建议使用 `!room:server` 或 `#alias:server`。
- 运行时房间/会话身份使用稳定的 Matrix 房间 ID。房间声明的别名仅用作查找输入，而非长期会话密钥或稳定群组身份。
- 要在保存前解析房间名称，请使用 `openclaw channels resolve --channel matrix "Project Room"`。

基于令牌的最小化设置：

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
      password: "replace-me", // pragma: allowlist secret
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

Matrix 将缓存的凭据存储在 `~/.openclaw/credentials/matrix/` 中。
默认账户使用 `credentials.json`；命名账户使用 `credentials-<account>.json`。

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

- `MATRIX_OPS_BOT_HOMESERVER`
- `MATRIX_OPS_BOT_ACCESS_TOKEN`

仅当这些认证环境变量已存在且所选账户配置中尚未保存 Matrix 认证时，交互式向导才会提供环境变量快捷方式。

## 配置示例

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
    },
  },
}
```

## E2EE 设置

## 机器人对机器人房间

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

检查验证状态：

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

多账户支持：使用 `channels.matrix.accounts` 配合每账户凭据和可选的 `name`。有关共享模式，请参见[配置参考](/gateway/configuration-reference#multi-account-all-channels)。

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

详细设备验证详情：

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

详细恢复诊断：

```bash
openclaw matrix verify backup restore --verbose
```

删除当前服务器备份并创建全新的备份基线：

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

### "已验证"的含义

仅当此 Matrix 设备被您自己的交叉签名身份验证时，OpenClaw 才将其视为已验证。
实际上，`openclaw matrix verify status --verbose` 会公开三个信任信号：

- `Locally trusted`：此设备仅被当前客户端信任
- `Cross-signing verified`：SDK 报告该设备通过交叉签名验证
- `Signed by owner`：该设备被您自己的自签名密钥签名

仅当存在交叉签名验证或所有者签名时，`Verified by owner` 才会变为 `yes`。
仅凭本地信任不足以让 OpenClaw 将设备视为完全验证。

### bootstrap 的作用

`openclaw matrix verify bootstrap` 是加密 Matrix 账户的修复和设置命令。
它按顺序执行以下所有操作：

- 引导密钥存储，尽可能重用现有的恢复密钥
- 引导交叉签名并上传缺失的公共交叉签名密钥
- 尝试标记并交叉签名当前设备
- 如果尚不存在，则创建新的服务器端房间密钥备份

如果 homeserver 需要交互式认证才能上传交叉签名密钥，OpenClaw 会先尝试无认证上传，然后使用 `m.login.dummy`，当配置了 `channels.matrix.password` 时再使用 `m.login.password`。

仅当您有意丢弃当前交叉签名身份并创建新身份时，才使用 `--force-reset-cross-signing`。

如果您有意丢弃当前房间密钥备份并开始新的备份基线以用于未来的消息，请使用 `openclaw matrix verify backup reset --yes`。
仅当您接受不可恢复的旧加密历史将保持不可用时，才执行此操作。

### 全新备份基线

如果您希望保持未来加密消息正常工作并接受丢失不可恢复的旧历史，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

当您希望明确针对命名 Matrix 账户时，请在每个命令后添加 `--account <id>`。

### 启动行为

当 `encryption: true` 时，Matrix 默认将 `startupVerification` 设置为 `"if-unverified"`。
启动时，如果此设备仍未验证，Matrix 将在另一个 Matrix 客户端中请求自验证，
在已有请求待处理时跳过重复请求，并在重启后应用本地冷却期再重试。
默认情况下，失败的请求尝试比重试成功的请求创建更快。
设置 `startupVerification: "off"` 可禁用自动启动请求，或调整 `startupVerificationCooldownHours`
如果您想要更短或更长的重试窗口。

启动时还会自动执行保守的加密引导过程。
该过程首先尝试重用当前的密钥存储和交叉签名身份，并避免重置交叉签名，除非您运行显式的引导修复流程。

如果启动时发现损坏的引导状态且配置了 `channels.matrix.password`，OpenClaw 可以尝试更严格的修复路径。
如果当前设备已被所有者签名，OpenClaw 会保留该身份而不是自动重置它。

从之前的公共 Matrix 插件升级：

- OpenClaw 尽可能自动重用相同的 Matrix 账户、访问令牌和设备身份。
- 在任何可执行的 Matrix 迁移更改运行之前，OpenClaw 会在 `~/Backups/openclaw-migrations/` 下创建或重用恢复快照。
- 如果您使用多个 Matrix 账户，请在从旧的扁平存储布局升级之前设置 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪个账户应该接收该共享的遗留状态。
- 如果之前的插件在本地存储了 Matrix 房间密钥备份解密密钥，启动或 `openclaw doctor --fix` 会自动将其导入新的恢复密钥流程。
- 如果在迁移准备后 Matrix 访问令牌发生更改，启动现在会在放弃自动备份恢复之前，扫描待处理遗留恢复状态的同级令牌哈希存储根。
- 如果同一账户、homeserver 和用户的 Matrix 访问令牌稍后发生更改，OpenClaw 现在更喜欢重用最完整的现有令牌哈希存储根，而不是从空的 Matrix 状态目录开始。
- 在下次网关启动时，备份的房间密钥会自动恢复到新的加密存储中。
- 如果旧插件有从未备份的仅本地房间密钥，OpenClaw 会明确警告。这些密钥无法从之前的 Rust 加密存储自动导出，因此某些旧的加密历史可能保持不可用，直到手动恢复。
- 有关完整的升级流程、限制、恢复命令和常见迁移消息，请参见 [Matrix 迁移](/install/migrating-matrix)。

加密的运行时状态按账户、按用户令牌哈希根组织在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下。
该目录包含同步存储（`bot-storage.json`）、加密存储（`crypto/`）、
恢复密钥文件（`recovery-key.json`）、IndexedDB 快照（`crypto-idb-snapshot.json`）、
线程绑定（`thread-bindings.json`）和启动验证状态（`startup-verification.json`）
（当这些功能正在使用时）。
当令牌更改但账户身份保持不变时，OpenClaw 会重用该账户/homeserver/用户元组的最佳现有根，
以便先前的同步状态、加密状态、线程绑定和启动验证状态保持可见。

### Node 加密存储模型

此插件中的 Matrix E2EE 使用 Node 中官方的 `matrix-js-sdk` Rust 加密路径。
当您希望加密状态在重启后保留时，该路径期望基于 IndexedDB 的持久化。

OpenClaw 目前通过以下方式在 Node 中提供此功能：

- 使用 `fake-indexeddb` 作为 SDK 期望的 IndexedDB API shim
- 在 `initRustCrypto` 之前从 `crypto-idb-snapshot.json` 恢复 Rust crypto IndexedDB 内容
- 在初始化后和运行期间将更新的 IndexedDB 内容持久化回 `crypto-idb-snapshot.json`

这是兼容性/存储管道，而非自定义加密实现。
快照文件是敏感的运行时状态，具有限制性的文件权限存储。
在 OpenClaw 的安全模型下，网关主机和本地 OpenClaw 状态目录已在受信任的操作员边界内，因此这主要是操作耐久性问题，而非单独的远程信任边界。

计划改进：

- 为持久性 Matrix 密钥材料添加 SecretRef 支持，以便恢复密钥和相关存储加密密钥可以从 OpenClaw 密钥提供程序获取，而不仅限于本地文件

## 自动验证通知

Matrix 现在将验证生命周期通知作为 `m.notice` 消息直接发布到严格的私信验证房间中。
这包括：

- 验证请求通知
- 验证就绪通知（带有明确的“通过表情符号验证”指引）
- 验证开始和完成通知
- 可用的 SAS 详情（表情符号和十进制数字）

来自其他 Matrix 客户端的传入验证请求由 OpenClaw 跟踪并自动接受。
对于自验证流程，当表情符号验证可用时，OpenClaw 也会自动启动 SAS 流程并确认自己的一端。
对于来自其他 Matrix 用户/设备的验证请求，OpenClaw 会自动接受请求，然后等待 SAS 流程正常进行。
您仍然需要在 Matrix 客户端中比较表情符号或十进制 SAS，并在那里确认“它们匹配”以完成验证。

OpenClaw 不会盲目自动接受自行发起的重复流程。如果在自验证请求已挂起时启动，则会跳过创建新请求。

验证协议/系统通知不会转发到代理聊天管道，因此不会产生 `NO_REPLY`。

### 设备清理

旧的 OpenClaw 管理的 Matrix 设备可能会在账户上累积，并使加密房间的信任推理变得更加困难。
使用以下命令列出它们：

```bash
openclaw matrix devices list
```

使用以下命令移除陈旧的 OpenClaw 管理设备：

```bash
openclaw matrix devices prune-stale
```

### 私信房间修复

如果私信状态不同步，OpenClaw 可能会得到指向旧单独房间而非活跃私信的陈旧 `m.direct` 映射。
使用以下命令检查与某个对端的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下命令修复：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修复将 Matrix 特定的逻辑保留在插件内部：

- 它优先选择已在 `m.direct` 中映射的严格 1:1 私信
- 否则，它会回退到任何当前加入的与该用户的严格 1:1 私信
- 如果不存在健康的私信，它会创建一个新的直接房间并重写 `m.direct` 以指向它

修复流程不会自动删除旧房间。它只选择健康的私信并更新映射，以便新的 Matrix 发送、验证通知和其他私信流程再次指向正确的房间。

## 线程

Matrix 支持原生 Matrix 线程，用于自动回复和消息工具发送。

- `threadReplies: "off"` 保持回复为顶层级别。
- `threadReplies: "inbound"` 仅当传入消息已在该线程中时才在线程内回复。
- `threadReplies: "always"` 将房间回复保留在由触发消息锚定的线程中。
- 传入的线程消息包括线程根消息作为额外的代理上下文。
- 现在，当目标是相同房间或相同私信用户目标时，消息工具发送会自动继承当前 Matrix 线程，除非提供了明确的 `threadId`。
- Matrix 支持运行时线程绑定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和线程绑定的 `/acp spawn` 现在可在 Matrix 房间和私信中使用。
- 当 `threadBindings.spawnSubagentSessions=true` 时，顶层 Matrix 房间/私信 `/focus` 会创建一个新的 Matrix 线程并将其绑定到目标会话。
- 在现有 Matrix 线程中运行 `/focus` 或 `/acp spawn --thread here` 会改为绑定当前线程。

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

确认反应使用标准的 OpenClaw 解析顺序：

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

当前行为：

- `reactionNotifications: "own"` 在添加的 `m.reaction` 事件以机器人创作的 Matrix 消息为目标时转发这些事件。
- `reactionNotifications: "off"` 禁用反应系统事件。
- 反应移除仍然不会合成为系统事件，因为 Matrix 将它们显示为删除事件（redactions），而非独立的 `m.reaction` 移除。

## 私信和房间策略示例

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
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

有关提及门控和允许列表行为，请参阅 [Groups](/channels/groups)。

Matrix 私信配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 用户在批准前持续向您发送消息，OpenClaw 会重复使用相同的待处理配对代码，并可能在短暂冷却期后再次发送提醒回复，而不是生成新代码。

有关共享私信配对流程和存储布局，请参阅 [Pairing](/channels/pairing)。

## 多账户示例

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
          },
        },
      },
    },
  },
}
```

顶层 `channels.matrix` 值作为已命名账户的默认值，除非账户覆盖它们。
当您希望 OpenClaw 为隐式路由、探测和 CLI 操作首选某个已命名的 Matrix 账户时，请设置 `defaultAccount`。
如果您配置多个已命名账户，请设置 `defaultAccount` 或为依赖隐式账户选择的 CLI 命令传递 `--account <id>`。
当您希望为单个命令覆盖该隐式选择时，请为 `openclaw matrix verify ...` 和 `openclaw matrix devices ...` 传递 `--account <id>`。

## 私有/LAN homeserver

默认情况下，OpenClaw 为 SSRF 保护阻止私有/内部 Matrix homeserver，除非您
为每个账户明确选择加入。

如果您的 homeserver 在 localhost、LAN/Tailscale IP 或内部主机名上运行，请为该 Matrix 账户启用
`allowPrivateNetwork`：

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      allowPrivateNetwork: true,
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

- `enabled`：启用或禁用频道。
- `name`：账户的可选标签。
- `defaultAccount`：配置多个 Matrix 账户时首选的账户 ID。
- `homeserver`：homeserver URL，例如 `https://matrix.example.org`。
- `allowPrivateNetwork`：允许此 Matrix 账户连接到私有/内部 homeserver。当 homeserver 解析为 `localhost`、LAN/Tailscale IP 或内部主机（如 `matrix-synapse`）时启用此项。
- `userId`：完整的 Matrix 用户 ID，例如 `@bot:example.org`。
- `accessToken`：基于令牌的认证访问令牌。
- `password`：基于密码的登录密码。
- `deviceId`：明确的 Matrix 设备 ID。
- `deviceName`：密码登录的设备显示名称。
- `avatarUrl`：存储的自头像 URL，用于个人资料同步和 `set-profile` 更新。
- `initialSyncLimit`：启动同步事件限制。
- `encryption`：启用端到端加密（E2EE）。
- `allowlistOnly`：强制对私信和房间使用仅允许列表行为。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `groupAllowFrom`：房间流量的用户 ID 允许列表。
- `groupAllowFrom` 条目应为完整的 Matrix 用户 ID。未解析的名称在运行时被忽略。
- `replyToMode`：`off`、`first` 或 `all`。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：用于线程绑定会话路由和生命周期的每频道覆盖。
- `startupVerification`：启动时自动自验证请求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`：重试自动启动验证请求前的冷却时间。
- `textChunkLimit`：出站消息分块大小。
- `chunkMode`：`length` 或 `newline`。
- `responsePrefix`：出站回复的可选消息前缀。
- `ackReaction`：此频道/账户的可选确认反应覆盖。
- `ackReactionScope`：可选的确认反应范围覆盖（`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`）。
- `reactionNotifications`：入站反应通知模式（`own`、`off`）。
- `mediaMaxMb`：出站媒体大小上限（MB）。
- `autoJoin`：邀请自动加入策略（`always`、`allowlist`、`off`）。默认：`off`。
- `autoJoinAllowlist`：当 `autoJoin` 为 `allowlist` 时允许的房间/别名。别名条目在邀请处理期间解析为房间 ID；OpenClaw 不 trusting 被邀请房间声称的别名状态。
- `dm`：私信策略块（`enabled`、`policy`、`allowFrom`）。
- `dm.allowFrom` 条目应为完整的 Matrix 用户 ID，除非您已通过实时目录查找解析它们。
- `accounts`：命名的每账户覆盖。顶层 `channels.matrix` 值作为这些条目的默认值。
- `groups`：每房间策略映射。优先使用房间 ID 或别名；未解析的房间名称在运行时被忽略。会话/群组身份在解析后使用稳定的房间 ID，而人类可读的标签仍来自房间名称。
- `rooms`：`groups` 的遗留别名。
- `actions`：每操作工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
