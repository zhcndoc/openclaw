---
summary: "Install the plugin， configure a homeserver account， 并控制邀请机器人接受"
read_when:
  - "首次在OpenClaw中设置Matrix"
  - "为 Matrix 帐户选择令牌或密码身份验证"
  - "限制机器人接受哪些 Matrix 邀请"
title: "Matrix 设置"
sidebarTitle: "设置"
---

安装 Matrix 插件，将其指向家庭服务器，然后选择如何处理邀请、许可名单和凭据。

## <a id="install"></a> 安装

```bash
openclaw plugins install @openclaw/matrix
```

`@openclaw/matrix` 首先从 npm 安装，然后仅当 npm 目标不可用时才回退到其声明的 ClawHub 软件包。使用 `npm:` 或 `clawhub:` 强制源。从本地结账：`openclaw plugins install ./path/to/local/matrix-plugin`。

`plugins install` 会注册并启用该插件；不需要单独执行 `enable` 步骤。该通道在下面配置之前仍不会执行任何操作。有关通用安装规则，请参阅 [插件](/tools/plugin)。

## <a id="setup"></a> 设置

1. 在你的 homeserver 上创建一个 Matrix 账户。
2. 配置`channels.matrix`和`homeserver` + `accessToken`， or `homeserver` + `userId` + `password`。在您的中创建访问令牌Matrix客户端或家庭服务器管理员UI；密码验证会在您第一次登录时为您铸造并缓存一个密码。
3. 检查`openclaw channels status --probe`；如果网关离线，则启动网关。配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。
4. 与机器人启动 DM，或邀请其进入房间。新邀请仅在 [`autoJoin`](#auto-join) 允许时才会登陆。

### <a id="interactive-setup"></a> 交互式设置

```bash
openclaw channels add
openclaw configure --section channels
```

向导要求家庭服务器URL、身份验证方法（令牌或密码）、用户ID（仅限密码验证），可选设备名称，是否启用E2EE，和房间access/auto-join.如果匹配`MATRIX_*`环境变量已经存在并且帐户没有保存的身份验证，向导提供了环境变量快捷方式。在保存许可名单之前解析房间名称`openclaw channels resolve --channel matrix "Project Room"`。启用E2EE在向导中运行相同的引导程序[`openclaw matrix encryption setup`](/channels/matrix/encryption#encryption-and-verification)。

### <a id="minimal-config"></a> 最小配置

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

令牌和密码 SecretRefs 遵循共享的 [ 源特定提供商别名规则 ](/gateway/secrets#provider-config)，包括命名帐户。显式匹配的 `env` 提供程序仍然强制执行其白名单；空的允许列表拒绝所有变量。

### <a id="auto-join"></a> 自动加入

`channels.matrix.autoJoin` 的默认值是 `"off"`：在你手动加入之前，机器人不会出现在新房间或通过新邀请创建的私信中。OpenClaw 无法在收到邀请时判断它是 DM 还是群组，因此所有邀请都会先经过 `autoJoin`；`dm.policy` 只会在机器人已经加入且房间被分类之后才生效。

<Warning>
将 `autoJoin: "allowlist"` 与 `autoJoinAllowlist` 结合使用可限制接受的邀请，或者使用 `autoJoin: "always"` 接受所有邀请。

`autoJoinAllowlist` 仅接受文字房间 ID（`!roomId:server` 或 [room 版本 12](https://spec.matrix.org/latest/rooms/v12/) 及更高版本使用的无后缀 `!roomId` 形式）、`#alias:server` 或 `*`。普通房间名称和 Matrix 用户 ID （`@user:server`） 不是房间目标：设置向导会拒绝它们，并且运行时会记录一条警告，命名任何此类已保存的条目，同时忽略它。请改为使用 `dm.allowFrom` 或 `groupAllowFrom` 授权发件人。别名是针对主服务器解析的，而不是针对受邀房间声明的状态。
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

当帐户停止或重新加载时，Matrix 在 30 秒没有任务进展的情况下停止等待后台任务。来自已退休监视器的延迟任务无法启动连接或通过仍在为另一个监视器提供服务的客户端发送。

### <a id="group-join-introductions"></a> 集团加盟介绍

当机器人加入允许的群组房间时，它会发布一条基于房间名称、主题和最多 100 条可读的最近房间消息的介绍。如果读取历史记录失败，则介绍仅使用可用的元数据，并且不会发明房间活动。

默认情况下启用介绍。设置 `channels.matrix.joinIntro: false` 以禁用它们，或使用 `channels.matrix.accounts.<accountId>.joinIntro` 覆盖一个帐户。直接房间从来不接受介绍。只有实际的加入转换才会触发以下情况：未接受的邀请、现有房间的启动快照或已加入的个人资料更新不会触发。这不会更改 [`autoJoin`](#auto-join)，默认为 `"off"`。

请参阅 [ 群组加入介绍 ](/channels#group-join-introductions) 了解房间准入、每个房间一次的行为以及将房间内容视为不可信的无工具转向。

### <a id="allowlist-target-formats"></a> Allowlist 目标格式

Matrix用户 ID 区分大小写。准确复制`@user:server`价值Matrix每个白名单、审批者和审批目标字段的报告。如果现有配置使用不同的大小写，请手动更新；OpenClaw无法安全地推断或重写预期帐户，因为区分大小写的 ID 可以识别不同的用户。

- DM（`dm.allowFrom`、`groupAllowFrom`、`groups.<room>.users`）：使用 `@user:server`。默认情况下会忽略显示名称（可变）；设置 `dangerouslyAllowNameMatching: true` 仅用于显式显示名称兼容性。
- 批准转发（`approvals.exec.targets[].to` 和 `channel: "matrix"`）：使用 `user:@user:server` 和精确的 Matrix 外壳。
- 房间白名单键（`groups`，旧别名 `rooms`）：使用 `!room:server`（或房间版本 12+ 上的无后缀 `!room` 形式）或 `#alias:server`。除非 `dangerouslyAllowNameMatching: true`，否则普通名称将被忽略。
- 邀请白名单 （`autoJoinAllowlist`）：使用 `!room:server`（或房间版本 12+ 上的无后缀 `!room`）、`#alias:server` 或 `*`。普通名称和用户 ID 无法匹配房间；运行时会发出警告并忽略它们，因此请使用 `dm.allowFrom` 进行发件人匹配。

### <a id="account-id-normalization"></a> 账户 ID 规范化

向导会将友好名称转换为规范化的账户 ID（`Ops Bot` -> `ops-bot`）。在作用域环境变量名中，标点符号会被进行十六进制转义，因此账户不会冲突：`-`（0x2D）会变为 `_X2D_`，所以 `ops-prod` 会映射到环境前缀 `MATRIX_OPS_X2D_PROD_`。

### <a id="cached-credentials"></a> 缓存的凭据

Matrix 在共享 `state/openclaw.sqlite` 插件状态中缓存帐户凭据。当缓存的凭据存在时，即使配置文件中没有 `accessToken`，OpenClaw 也会将 Matrix 视为已配置 - 这包括设置、`openclaw doctor` 和通道状态检查。升级通过 `openclaw doctor --fix` 导入已停用的 `~/.openclaw/credentials/matrix/credentials*.json` 文件，验证 SQLite 行，然后归档文件。

### <a id="environment-variables"></a> 环境变量

基于配置键的环境变量：当对应的配置键未设置时会使用它们。默认账户使用不带前缀的名称；命名账户会在后缀前插入账户令牌（见[规范化](#account-id-normalization)）。

| 默认账户       | 命名账户（`<ID>` = 账户令牌） |
| --------------------- | -------------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`               |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`             |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                  |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`                 |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`                |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`              |

对于账户 `ops`，名称会变为 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN` 等。`MATRIX_HOMESERVER`（以及任何 `*_HOMESERVER` 作用域变体）不能从 workspace `.env` 中设置；见[Workspace `.env` 文件](/gateway/security)。

<Note>
恢复密钥不是配置支持的环境变量：OpenClaw 永远不会从环境本身读取它。 CLI 指导文本建议通过名为 `MATRIX_RECOVERY_KEY` 的 shell 变量（对于默认帐户）或 `MATRIX_RECOVERY_KEY_<ID>`（普通大写帐户 ID，无十六进制转义）对于命名帐户进行管道传输 - 请参阅 [ 使用恢复密钥验证此设备 ](/channels/matrix/encryption#verify-this-device-with-a-recovery-key)。
</Note>

## <a id="configuration-example"></a> 配置示例

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
      streaming: { mode: "partial" },
    },
  },
}
```
