---
summary: "Matrix 支持状态、功能和配置"
read_when:
  - 在开发 Matrix 频道功能时
title: "Matrix"
---

# Matrix（插件）

Matrix 是一个开放的、去中心化的消息协议。OpenClaw 作为任何 homeserver 上的 Matrix **用户** 接入，所以你需要为机器人创建一个 Matrix 账号。一旦登录成功，你可以直接私信机器人，或邀请它加入房间（Matrix 的“群组”）。Beeper 也是一个有效的客户端选项，但它需要开启端到端加密（E2EE）。

状态：通过插件（@vector-im/matrix-bot-sdk）支持。支持私信、房间、线程、多媒体、反应、投票（发送 + 以文本启动投票）、位置和端到端加密（带加密支持）。

## 需要插件

Matrix 作为插件提供，不包含在核心安装中。

通过 CLI 安装（npm 注册表）：

```bash
openclaw plugins install @openclaw/matrix
```

本地代码库安装（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/matrix
```

If you choose Matrix during setup and a git checkout is detected,
OpenClaw will offer the local install path automatically.

详情见：[插件](/tools/plugin)

## 设置步骤

1. 安装 Matrix 插件：
   - 从 npm: `openclaw plugins install @openclaw/matrix`
   - 从本地代码库: `openclaw plugins install ./extensions/matrix`
2. 在 homeserver 上创建一个 Matrix 账号：
   - 查看托管选项：[https://matrix.org/ecosystem/hosting/](https://matrix.org/ecosystem/hosting/)
   - 或自行托管。
3. 获取机器人账号的访问令牌：
   - 使用 Matrix 登录 API 和 `curl` 向你的 homeserver 发起请求：

   ```bash
   curl --request POST \
     --url https://matrix.example.org/_matrix/client/v3/login \
     --header 'Content-Type: application/json' \
     --data '{
     "type": "m.login.password",
     "identifier": {
       "type": "m.id.user",
       "user": "your-user-name"
     },
     "password": "your-password"
   }'
   ```

   - 将 `matrix.example.org` 替换成你的 homeserver 地址。
   - 或设置 `channels.matrix.userId` + `channels.matrix.password`：OpenClaw 会调用相同的登录端点，访问令牌存储在 `~/.openclaw/credentials/matrix/credentials.json`，并在下次启动时复用。

4. 配置凭据：
   - 环境变量：`MATRIX_HOMESERVER`，`MATRIX_ACCESS_TOKEN`（或 `MATRIX_USER_ID` + `MATRIX_PASSWORD`）
   - 或配置文件中的：`channels.matrix.*`
   - 两者同时设置时，配置文件优先。
   - 使用访问令牌时，用户 ID 会通过 `/whoami` 自动获取。
   - 设置时，`channels.matrix.userId` 应为完整的 Matrix ID（例如：`@bot:example.org`）。
5. 重启网关（或完成设置）。
6. 使用任何 Matrix 客户端（Element、Beeper 等，参见 [https://matrix.org/ecosystem/clients/](https://matrix.org/ecosystem/clients/)）开始与机器人私信或邀请机器人加入房间。
   Beeper 需要 E2EE，需设置 `channels.matrix.encryption: true` 并验证设备。

最小配置（访问令牌，自动获取用户 ID）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      dm: { policy: "pairing" },
    },
  },
}
```

启用端到端加密配置：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

## 加密（E2EE）

端到端加密通过 Rust 加密 SDK **支持**。

启用方式：`channels.matrix.encryption: true`

- 如果能够加载加密模块，自动解密加密房间消息。
- 发送至加密房间的多媒体内容会自动加密。
- 首次连接时，OpenClaw 会请求你其它会话设备进行验证。
- 在另一个 Matrix 客户端（如 Element）验证设备以启用密钥共享。
- 如果加密模块加载失败则禁用 E2EE，加密房间无法解密；OpenClaw 会记录警告。
- 遇到缺少加密模块错误（例如 `@matrix-org/matrix-sdk-crypto-nodejs-*`），请允许 `@matrix-org/matrix-sdk-crypto-nodejs` 的构建脚本运行，并执行 `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` 或运行 `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js` 以下载二进制文件。

加密状态存储在

`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/crypto/`

（SQLite 数据库）内。同步状态存储于同目录下的 `bot-storage.json`。

如果访问令牌（设备）更改，会创建新存储，机器人必须重新验证才能访问加密房间内容。

**设备验证：**  
启用 E2EE 后，机器人启动时会请求其它会话验证。请打开 Element（或其他客户端），批准验证请求，建立信任关系。验证成功后，机器人可以在加密房间内解密消息。

## 多账号支持

多账号支持：使用 `channels.matrix.accounts`，为每个账号配置凭据和可选的 `name`。参考 [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 了解共享模式。

每个账号作为独立的 Matrix 用户运行于任意 homeserver。每个账号配置继承自顶级 `channels.matrix` 设置，且可覆盖任何选项（私信策略、群组、加密等）。

```json5
{
  channels: {
    matrix: {
      enabled: true,
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          name: "Main assistant",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_***",
          encryption: true,
        },
        alerts: {
          name: "Alerts bot",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_***",
          dm: { policy: "allowlist", allowFrom: ["@admin:example.org"] },
        },
      },
    },
  },
}
```

注意：

- 账号启动依次执行，避免并发模块导入时的竞态条件。
- 环境变量（例如 `MATRIX_HOMESERVER`，`MATRIX_ACCESS_TOKEN`）仅对**默认**账号生效。
- 基础频道设置（私信策略、群组策略、提及限制等）适用于所有账号，除非单独覆盖。
- 使用 `bindings[].match.accountId` 将不同账号路由到不同代理。
- 加密状态按账号 + 访问令牌分别存储（每个账号独立的密钥存储）。

## 路由模型

- 回复总是回到 Matrix。
- 私信共享代理主会话；房间对应群组会话。

## 访问控制（私信）

- 默认：`channels.matrix.dm.policy = "pairing"`。未知发送者获得配对码。
- 批准方式：
  - `openclaw pairing list matrix`
  - `openclaw pairing approve matrix <CODE>`
- 公开私信：`channels.matrix.dm.policy="open"` 并设置 `channels.matrix.dm.allowFrom=["*"]`。
- `channels.matrix.dm.allowFrom` 接受完整的 Matrix 用户 ID（例如：`@user:server`）。配置向导在目录搜索精确匹配单一结果时，会将显示名解析为用户 ID。
- 不要使用显示名或本地部分（例如 `"Alice"` 或 `"alice"`）。它们有歧义，允许列表匹配时会被忽略。请使用完整的 `@user:server` ID。

## 房间（群组）

- 默认：`channels.matrix.groupPolicy = "allowlist"`（提及限制）。通过 `channels.defaults.groupPolicy` 可以覆盖未设置时的默认值。
- 运行时注意：如果完全没有配置 `channels.matrix`，运行时房间检查会回退到 `groupPolicy="allowlist"`（即便设置了 `channels.defaults.groupPolicy`）。
- 允许列表房间通过 `channels.matrix.groups` 指定（房间 ID 或别名；配置向导仅在目录搜索精确匹配唯一结果时解析名称为 ID）：

```json5
{
  channels: {
    matrix: {
      groupPolicy: "allowlist",
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
      groupAllowFrom: ["@owner:example.org"],
    },
  },
}
```

- `requireMention: false` 启用该房间的自动回复功能。
- `groups."*"` 用于设定房间范围内的默认提及限制。
- `groupAllowFrom` 限制哪些发送者可在群组消息中触发机器人（完整 Matrix 用户 ID）。
- 每个房间的 `users` 允许列表可进一步限制该房间内可发送消息的发送者（使用完整 Matrix 用户 ID）。
- 配置向导会提示填写房间允许列表（支持房间 ID、别名或名称），名称仅在唯一且精确匹配时解析。
- 启动时，OpenClaw 会解析允许列表的房间名和用户名为 ID，并记录映射；无法解析的条目不纳入允许列表匹配。
- 默认自动加入邀请；可通过 `channels.matrix.autoJoin` 和 `channels.matrix.autoJoinAllowlist` 控制。
- 如果想**不允许任何房间**，设置 `channels.matrix.groupPolicy: "disabled"`（或保持允许列表为空）。
- 旧键：`channels.matrix.rooms`（格式与 `groups` 相同）。

## 线程支持

- 支持回复的线程功能。
- `channels.matrix.threadReplies` 控制回复是否停留在线程内：
  - `off`，`inbound`（默认），`always`
- `channels.matrix.replyToMode` 控制非线程回复的回复目标元数据：
  - `off`（默认），`first`，`all`

## 功能功能列表

| 功能           | 状态                                    |
| -------------- | --------------------------------------- |
| 私信           | ✅ 支持                                |
| 房间           | ✅ 支持                                |
| 线程           | ✅ 支持                                |
| 多媒体         | ✅ 支持                                |
| E2EE           | ✅ 支持（需要加密模块）                 |
| 反应           | ✅ 支持（通过工具发送/读取）           |
| 投票           | ✅ 支持发送；入站投票启动转换为文本（响应/结束忽略） |
| 位置           | ✅ 支持（Geo URI，高度被忽略）         |
| 原生命令       | ✅ 支持                                |

## 故障排查

建议先执行以下命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

如有需要，再确认私信配对状态：

```bash
openclaw pairing list matrix
```

常见问题：

- 已登录但房间消息被忽略：房间被 `groupPolicy` 或允许列表阻止。
- 私信被忽略：发送者处于待审批状态，且 `channels.matrix.dm.policy="pairing"`。
- 加密房间失败：加密支持不足或加密设置不匹配。

排查流程请见：[/channels/troubleshooting](/channels/troubleshooting)。

## 配置参考（Matrix）

完整配置：[配置文档](/gateway/configuration)

提供者选项：

- `channels.matrix.enabled`：启用/禁用频道启动。
- `channels.matrix.homeserver`：homeserver URL。
- `channels.matrix.userId`：Matrix 用户 ID（有访问令牌时可选）。
- `channels.matrix.accessToken`：访问令牌。
- `channels.matrix.password`：登录密码（会存储令牌）。
- `channels.matrix.deviceName`：设备显示名称。
- `channels.matrix.encryption`：启用端到端加密（默认：false）。
- `channels.matrix.initialSyncLimit`：初始同步限制。
- `channels.matrix.threadReplies`：`off | inbound | always`（默认：inbound）。
- `channels.matrix.textChunkLimit`：发送文本分块大小（字符数）。
- `channels.matrix.chunkMode`：`length`（默认）或 `newline`，先按空行（段落边界）分割，再按长度分块。
- `channels.matrix.dm.policy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.matrix.dm.allowFrom`：私信允许列表（完整 Matrix 用户 ID）。`open` 需使用 `"*"`。向导会在可能时解析名字为 ID。
- `channels.matrix.groupPolicy`：`allowlist | open | disabled`（默认：allowlist）。
- `channels.matrix.groupAllowFrom`：群组消息发送者白名单（完整 Matrix 用户 ID）。
- `channels.matrix.allowlistOnly`：强制使用允许列表规则限制私信 + 房间。
- `channels.matrix.groups`：群组允许列表及每个房间设置映射。
- `channels.matrix.rooms`：旧版群组允许列表/配置。
- `channels.matrix.replyToMode`：线程/标签的回复元数据模式。
- `channels.matrix.mediaMaxMb`：入站/出站媒体大小限制（MB）。
- `channels.matrix.autoJoin`：邀请处理方式（`always | allowlist | off`，默认：always）。
- `channels.matrix.autoJoinAllowlist`：自动加入的允许房间 ID 或别名。
- `channels.matrix.accounts`：多账号配置，通过账号 ID 键控（每个账号继承顶层配置）。
- `channels.matrix.actions`：每个操作的工具权限控制（反应/消息/置顶/成员信息/频道信息）。
